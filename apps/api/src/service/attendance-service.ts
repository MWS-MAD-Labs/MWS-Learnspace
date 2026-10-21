import type {
  AttendanceBulkSaveCommand,
  AttendanceBulkSaveResponse,
  AttendanceRosterResponse,
} from '@learnspace/contracts';
import type { AttendanceStatus, PrismaClient } from '@prisma/client';
import type { MembershipScope } from '../utils/authorization.js';
import { HttpError } from '../middleware/http-errors.js';
import {
  attendanceVersion,
  attendanceClassSelect,
  attendanceRosterSelect,
  mapAttendanceRoster,
} from '../model/attendance-model.js';
import { requireAttendanceClassScope } from '../utils/attendance.policy.js';
import { createAuditService } from './audit-service.js';

function dateAtUtcMidnight(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function prismaErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

export function createAttendanceService(prisma: PrismaClient) {
  return {
    async getRoster(input: {
      organizationId: string;
      classId: string;
      schoolDate: string;
      membership: MembershipScope;
    }): Promise<AttendanceRosterResponse['data']> {
      const classScope = requireAttendanceClassScope(
        input.membership,
        'attendance:read',
      );
      const schoolDate = dateAtUtcMidnight(input.schoolDate);
      const schoolClass = await prisma.schoolClass.findFirst({
        where: {
          id: input.classId,
          organizationId: input.organizationId,
          ...classScope,
        },
        select: attendanceClassSelect,
      });
      if (!schoolClass) {
        throw new HttpError(
          403,
          'AUTHORIZATION_DENIED',
          'The request was denied.',
        );
      }
      const roster = await prisma.enrollment.findMany({
        where: {
          organizationId: input.organizationId,
          classId: input.classId,
          startsOn: { lte: schoolDate },
          OR: [{ endsOn: null }, { endsOn: { gte: schoolDate } }],
          student: { status: 'ACTIVE' },
        },
        orderBy: [{ student: { fullName: 'asc' } }, { id: 'asc' }],
        select: attendanceRosterSelect,
      });
      const attendance = await prisma.attendanceRecord.findMany({
        where: {
          organizationId: input.organizationId,
          classId: input.classId,
          schoolDate,
        },
        orderBy: { id: 'asc' },
      });
      return mapAttendanceRoster({
        organizationId: input.organizationId,
        schoolDate: input.schoolDate,
        schoolClass,
        roster,
        attendance,
      });
    },

    async saveRoster(input: {
      organizationId: string;
      classId: string;
      command: AttendanceBulkSaveCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }): Promise<AttendanceBulkSaveResponse['data']> {
      const classScope = requireAttendanceClassScope(
        input.membership,
        'attendance:write',
      );
      const schoolDate = dateAtUtcMidnight(input.command.schoolDate);
      try {
        return await prisma.$transaction(
          async (transaction) => {
            const schoolClass = await transaction.schoolClass.findFirst({
              where: {
                id: input.classId,
                organizationId: input.organizationId,
                ...classScope,
              },
              select: { id: true },
            });
            if (!schoolClass) {
              throw new HttpError(
                403,
                'AUTHORIZATION_DENIED',
                'The request was denied.',
              );
            }
            const existing = await transaction.attendanceRecord.findMany({
              where: {
                organizationId: input.organizationId,
                classId: input.classId,
                schoolDate,
              },
              select: { updatedAt: true },
            });
            if (attendanceVersion(existing) !== input.command.expectedVersion) {
              throw new HttpError(
                409,
                'ATTENDANCE_VERSION_CONFLICT',
                'Attendance was changed by another request.',
              );
            }
            const enrollments = await transaction.enrollment.findMany({
              where: {
                organizationId: input.organizationId,
                classId: input.classId,
                studentId: {
                  in: input.command.records.map((record) => record.studentId),
                },
                startsOn: { lte: schoolDate },
                OR: [{ endsOn: null }, { endsOn: { gte: schoolDate } }],
                student: { status: 'ACTIVE' },
              },
              select: { id: true, studentId: true },
            });
            const enrollmentByStudent = new Map(
              enrollments.map((enrollment) => [
                enrollment.studentId,
                enrollment.id,
              ]),
            );
            if (enrollmentByStudent.size !== input.command.records.length) {
              throw new HttpError(
                400,
                'STUDENT_NOT_IN_CLASS',
                'Every student must be actively enrolled in the class on schoolDate.',
              );
            }
            for (const record of input.command.records) {
              const values = {
                enrollmentId: enrollmentByStudent.get(record.studentId)!,
                status: record.status as AttendanceStatus,
                minutesLate:
                  record.status === 'LATE'
                    ? (record.minutesLate ?? null)
                    : null,
                notes: record.notes ?? null,
                recordedById: input.actorId,
              };
              await transaction.attendanceRecord.upsert({
                where: {
                  organizationId_studentId_classId_schoolDate: {
                    organizationId: input.organizationId,
                    studentId: record.studentId,
                    classId: input.classId,
                    schoolDate,
                  },
                },
                update: values,
                create: {
                  organizationId: input.organizationId,
                  studentId: record.studentId,
                  classId: input.classId,
                  schoolDate,
                  ...values,
                },
              });
            }
            await createAuditService(transaction).append({
              organizationId: input.organizationId,
              actorId: input.actorId,
              action: 'attendance.bulk_upsert',
              targetType: 'SchoolClassAttendance',
              targetId: input.classId,
              requestId: input.requestId,
              result: 'SUCCEEDED',
              metadata: { changedFields: ['status', 'minutesLate', 'notes'] },
            });
            const saved = await transaction.attendanceRecord.findMany({
              where: {
                organizationId: input.organizationId,
                classId: input.classId,
                schoolDate,
              },
              select: { updatedAt: true },
            });
            return {
              schoolDate: input.command.schoolDate,
              version: attendanceVersion(saved),
              savedCount: input.command.records.length,
            };
          },
          { isolationLevel: 'Serializable' },
        );
      } catch (error) {
        if (prismaErrorCode(error) === 'P2034') {
          throw new HttpError(
            409,
            'ATTENDANCE_VERSION_CONFLICT',
            'Attendance was changed by another request.',
          );
        }
        throw error;
      }
    },
  };
}

export type AttendanceService = ReturnType<typeof createAttendanceService>;
