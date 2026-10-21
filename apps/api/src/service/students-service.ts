import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  StudentCreateCommand,
  StudentListQuery,
  StudentUpdateCommand,
} from '@learnspace/contracts';
import type { MembershipScope } from '../utils/authorization.js';
import { createAuditService } from '../service/audit-service.js';
import { HttpError } from '../middleware/http-errors.js';
import {
  activeEnrollmentWhere,
  scopedClassWhere,
  studentScopeWhere,
} from '../utils/resource-access.js';
import { dateAtUtcMidnight } from '../utils/resource-date.js';
import { prismaErrorCode } from '../utils/resource-errors.js';
import {
  mapStudent,
  mapStudentDetail,
  studentMutationSelect,
  studentSelect,
} from '../model/students-model.js';

async function validateEnrollmentCommand(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  command: NonNullable<StudentCreateCommand['activeEnrollment']>,
) {
  const [academicYear, schoolClass] = await Promise.all([
    transaction.academicYear.findFirst({
      where: { id: command.academicYearId, organizationId },
      select: { id: true, startsOn: true, endsOn: true },
    }),
    transaction.schoolClass.findFirst({
      where: { id: command.classId, organizationId },
      select: { id: true },
    }),
  ]);
  if (!academicYear || !schoolClass) {
    throw new HttpError(
      400,
      'INVALID_ENROLLMENT_REFERENCE',
      'The academic year and class must belong to the organization.',
    );
  }
  const startsOn = dateAtUtcMidnight(command.startsOn);
  const endsOn = command.endsOn ? dateAtUtcMidnight(command.endsOn) : null;
  if (
    startsOn < academicYear.startsOn ||
    startsOn > academicYear.endsOn ||
    (endsOn && (endsOn < academicYear.startsOn || endsOn > academicYear.endsOn))
  ) {
    throw new HttpError(
      400,
      'INVALID_ENROLLMENT_DATES',
      'Enrollment dates must be within the academic year.',
    );
  }
  return { startsOn, endsOn };
}

export function createStudentsService(prisma: PrismaClient) {
  return {
    async list(input: {
      organizationId: string;
      query: StudentListQuery;
      membership: MembershipScope;
    }) {
      const schoolDate = dateAtUtcMidnight(
        input.query.schoolDate ?? new Date().toISOString().slice(0, 10),
      );
      const enrollmentFilter: Prisma.EnrollmentWhereInput = {
        ...activeEnrollmentWhere(schoolDate),
        ...(input.query.classId ? { classId: input.query.classId } : {}),
        ...(input.query.unitId || input.query.gradeId
          ? {
              schoolClass: {
                ...(input.query.unitId ? { unitId: input.query.unitId } : {}),
                ...(input.query.gradeId
                  ? { gradeId: input.query.gradeId }
                  : {}),
              },
            }
          : {}),
      };
      const scope = studentScopeWhere(
        input.membership,
        schoolDate,
        enrollmentFilter,
      );
      if (!scope) {
        throw new HttpError(
          403,
          'AUTHORIZATION_DENIED',
          'The request was denied.',
        );
      }
      const classScope =
        input.membership.role === 'GRADE_TEACHER'
          ? (scopedClassWhere(input.membership) ?? {})
          : {};
      const selectedEnrollmentFilter: Prisma.EnrollmentWhereInput = {
        ...(input.query.classId ? { classId: input.query.classId } : {}),
        ...(Object.keys(classScope).length ||
        input.query.unitId ||
        input.query.gradeId
          ? {
              schoolClass: {
                ...classScope,
                ...(input.query.unitId ? { unitId: input.query.unitId } : {}),
                ...(input.query.gradeId
                  ? { gradeId: input.query.gradeId }
                  : {}),
              },
            }
          : {}),
      };
      const rows = await prisma.student.findMany({
        where: {
          organizationId: input.organizationId,
          status: 'ACTIVE',
          ...scope,
          ...(input.membership.role === 'GRADE_TEACHER' ||
          !(input.query.classId || input.query.unitId || input.query.gradeId)
            ? {}
            : { enrollments: { some: enrollmentFilter } }),
        },
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
        select: studentSelect(schoolDate, selectedEnrollmentFilter),
      });
      return rows.map(mapStudent);
    },

    async detail(input: {
      organizationId: string;
      studentId: string;
      schoolDate?: string;
      membership: MembershipScope;
    }) {
      const schoolDate = dateAtUtcMidnight(
        input.schoolDate ?? new Date().toISOString().slice(0, 10),
      );
      const scope = studentScopeWhere(input.membership, schoolDate);
      if (!scope) {
        throw new HttpError(
          403,
          'AUTHORIZATION_DENIED',
          'The request was denied.',
        );
      }
      const classScope =
        input.membership.role === 'GRADE_TEACHER'
          ? (scopedClassWhere(input.membership) ?? {})
          : {};
      const row = await prisma.student.findFirst({
        where: {
          id: input.studentId,
          organizationId: input.organizationId,
          status: 'ACTIVE',
          ...scope,
        },
        select: {
          ...studentSelect(
            schoolDate,
            Object.keys(classScope).length ? { schoolClass: classScope } : {},
          ),
          address: true,
          guardians: studentMutationSelect(schoolDate).guardians,
        },
      });
      if (!row) {
        throw new HttpError(
          403,
          'AUTHORIZATION_DENIED',
          'The request was denied.',
        );
      }
      return mapStudentDetail(row);
    },

    async create(input: {
      organizationId: string;
      command: StudentCreateCommand;
      actorId: string;
      requestId: string;
    }) {
      const responseDate = input.command.activeEnrollment?.startsOn
        ? dateAtUtcMidnight(input.command.activeEnrollment.startsOn)
        : new Date();
      try {
        const result = await prisma.$transaction(async (transaction) => {
          const enrollmentDates = input.command.activeEnrollment
            ? await validateEnrollmentCommand(
                transaction,
                input.organizationId,
                input.command.activeEnrollment,
              )
            : undefined;
          const student = await transaction.student.create({
            data: {
              organizationId: input.organizationId,
              studentNumber: input.command.studentNumber,
              fullName: input.command.fullName,
              nickname: input.command.nickname ?? null,
              gender: input.command.gender,
              dateOfBirth: dateAtUtcMidnight(input.command.dateOfBirth),
              address: input.command.address ?? null,
              specialNeedsFlag: input.command.specialNeedsFlag ?? false,
              status: input.command.status ?? 'ACTIVE',
              avatarUrl: input.command.avatarUrl ?? null,
              primaryClassification:
                input.command.primaryClassification ?? null,
              currentPlacement: input.command.currentPlacement ?? null,
            },
            select: { id: true },
          });
          if (input.command.activeEnrollment && enrollmentDates) {
            await transaction.enrollment.create({
              data: {
                organizationId: input.organizationId,
                studentId: student.id,
                academicYearId: input.command.activeEnrollment.academicYearId,
                classId: input.command.activeEnrollment.classId,
                ...enrollmentDates,
              },
            });
          }
          await createAuditService(transaction as PrismaClient).append({
            organizationId: input.organizationId,
            actorId: input.actorId,
            action: 'student.create',
            targetType: 'Student',
            targetId: student.id,
            requestId: input.requestId,
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(input.command) },
          });
          return transaction.student.findFirstOrThrow({
            where: { id: student.id, organizationId: input.organizationId },
            select: studentMutationSelect(responseDate),
          });
        });
        return mapStudentDetail(result);
      } catch (error) {
        if (prismaErrorCode(error) === 'P2002') {
          throw new HttpError(
            409,
            'STUDENT_NUMBER_CONFLICT',
            'The student number is already in use.',
          );
        }
        throw error;
      }
    },

    async update(input: {
      organizationId: string;
      studentId: string;
      command: StudentUpdateCommand;
      actorId: string;
      requestId: string;
    }) {
      const responseDate = input.command.activeEnrollment?.startsOn
        ? dateAtUtcMidnight(input.command.activeEnrollment.startsOn)
        : new Date();
      try {
        const result = await prisma.$transaction(async (transaction) => {
          const existing = await transaction.student.findFirst({
            where: {
              id: input.studentId,
              organizationId: input.organizationId,
            },
            select: { id: true },
          });
          if (!existing) {
            throw new HttpError(404, 'STUDENT_NOT_FOUND', 'Student not found.');
          }
          const enrollmentDates = input.command.activeEnrollment
            ? await validateEnrollmentCommand(
                transaction,
                input.organizationId,
                input.command.activeEnrollment,
              )
            : undefined;
          const { activeEnrollment, ...studentFields } = input.command;
          await transaction.student.update({
            where: { id: existing.id },
            data: {
              ...studentFields,
              ...(studentFields.dateOfBirth
                ? { dateOfBirth: dateAtUtcMidnight(studentFields.dateOfBirth) }
                : {}),
            },
          });
          if (activeEnrollment && enrollmentDates) {
            const sameEnrollment = await transaction.enrollment.findFirst({
              where: {
                organizationId: input.organizationId,
                studentId: existing.id,
                academicYearId: activeEnrollment.academicYearId,
                classId: activeEnrollment.classId,
                startsOn: enrollmentDates.startsOn,
              },
              select: { id: true },
            });
            const sameDayConflict = await transaction.enrollment.findFirst({
              where: {
                organizationId: input.organizationId,
                studentId: existing.id,
                startsOn: enrollmentDates.startsOn,
                ...(sameEnrollment ? { id: { not: sameEnrollment.id } } : {}),
              },
              select: { id: true },
            });
            if (sameDayConflict) {
              throw new HttpError(
                409,
                'ENROLLMENT_START_CONFLICT',
                'A different enrollment already starts on that date.',
              );
            }
            const previousDay = new Date(
              enrollmentDates.startsOn.getTime() - 24 * 60 * 60 * 1000,
            );
            await transaction.enrollment.updateMany({
              where: {
                organizationId: input.organizationId,
                studentId: existing.id,
                ...(sameEnrollment ? { id: { not: sameEnrollment.id } } : {}),
                startsOn: { lt: enrollmentDates.startsOn },
                OR: [
                  { endsOn: null },
                  { endsOn: { gte: enrollmentDates.startsOn } },
                ],
              },
              data: { endsOn: previousDay },
            });
            if (sameEnrollment) {
              await transaction.enrollment.update({
                where: { id: sameEnrollment.id },
                data: { endsOn: enrollmentDates.endsOn },
              });
            } else {
              await transaction.enrollment.create({
                data: {
                  organizationId: input.organizationId,
                  studentId: existing.id,
                  academicYearId: activeEnrollment.academicYearId,
                  classId: activeEnrollment.classId,
                  ...enrollmentDates,
                },
              });
            }
          }
          await createAuditService(transaction as PrismaClient).append({
            organizationId: input.organizationId,
            actorId: input.actorId,
            action: 'student.update',
            targetType: 'Student',
            targetId: existing.id,
            requestId: input.requestId,
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(input.command) },
          });
          return transaction.student.findFirstOrThrow({
            where: { id: existing.id, organizationId: input.organizationId },
            select: studentMutationSelect(responseDate),
          });
        });
        return mapStudentDetail(result);
      } catch (error) {
        if (prismaErrorCode(error) === 'P2002') {
          throw new HttpError(
            409,
            'STUDENT_NUMBER_CONFLICT',
            'The student number is already in use.',
          );
        }
        throw error;
      }
    },
  };
}

export type StudentsService = ReturnType<typeof createStudentsService>;
