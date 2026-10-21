import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  GpkAssignmentEndCommand,
  GpkAssignmentQuery,
  GpkAssignmentUpsertCommand,
} from '@learnspace/contracts';
import { createAuditService } from '../service/audit-service.js';
import { HttpError } from '../middleware/http-errors.js';
import { dateAtUtcMidnight } from '../utils/resource-date.js';
import { prismaErrorCode } from '../utils/resource-errors.js';
import {
  DEFAULT_GPK_MAX_CASELOAD,
  GPK_ROLE_CONTEXT,
  gpkAssignmentSelect,
  mapGpkAssignment,
} from '../model/gpk-model.js';

const assignmentConflictCodes = new Set(['P2002', 'P2034']);

function assignmentOverlapWhere(startsOn: Date, endsOn: Date | null) {
  return {
    startsOn: { lte: endsOn ?? new Date('9999-12-31T00:00:00.000Z') },
    OR: [{ endsOn: null }, { endsOn: { gte: startsOn } }],
  } satisfies Prisma.StaffStudentAssignmentWhereInput;
}

async function loadAssignment(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  assignmentId: string,
) {
  const assignment = await transaction.staffStudentAssignment.findFirstOrThrow({
    where: { id: assignmentId, organizationId, roleContext: GPK_ROLE_CONTEXT },
    select: {
      ...gpkAssignmentSelect,
      student: {
        select: {
          id: true,
          organizationId: true,
          studentNumber: true,
          fullName: true,
          nickname: true,
          avatarUrl: true,
        },
      },
    },
  });
  return { ...mapGpkAssignment(assignment), student: assignment.student };
}

export function createGpkService(prisma: PrismaClient) {
  return {
    async list(organizationId: string, query: GpkAssignmentQuery) {
      const schoolDate = dateAtUtcMidnight(
        query.schoolDate ?? new Date().toISOString().slice(0, 10),
      );
      const rows = await prisma.staffStudentAssignment.findMany({
        where: {
          organizationId,
          roleContext: GPK_ROLE_CONTEXT,
          startsOn: { lte: schoolDate },
          OR: [{ endsOn: null }, { endsOn: { gte: schoolDate } }],
          ...(query.studentId ? { studentId: query.studentId } : {}),
          ...(query.membershipId ? { membershipId: query.membershipId } : {}),
          membership: { status: 'ACTIVE', role: 'SPECIAL_ED_TEACHER' },
          student: { status: 'ACTIVE' },
        },
        orderBy: [
          { student: { fullName: 'asc' } },
          { startsOn: 'desc' },
          { id: 'asc' },
        ],
        select: {
          ...gpkAssignmentSelect,
          student: {
            select: {
              id: true,
              organizationId: true,
              studentNumber: true,
              fullName: true,
              nickname: true,
              avatarUrl: true,
            },
          },
        },
      });
      return rows.map((row) => ({
        ...mapGpkAssignment(row),
        student: row.student,
      }));
    },

    async upsert(input: {
      organizationId: string;
      studentId: string;
      command: GpkAssignmentUpsertCommand;
      actorId: string;
      requestId: string;
    }) {
      const startsOn = dateAtUtcMidnight(input.command.startsOn);
      const endsOn = input.command.endsOn
        ? dateAtUtcMidnight(input.command.endsOn)
        : null;
      try {
        return await prisma.$transaction(
          async (transaction) => {
            const lockedStudents = await transaction.$queryRaw<
              Array<{ id: string; specialNeedsFlag: boolean }>
            >(Prisma.sql`
              SELECT id, "specialNeedsFlag"
              FROM "Student"
              WHERE id = ${input.studentId}::uuid
                AND "organizationId" = ${input.organizationId}::uuid
                AND status = 'ACTIVE'
              FOR UPDATE
            `);
            const student = lockedStudents[0];
            if (!student) {
              throw new HttpError(
                404,
                'STUDENT_NOT_FOUND',
                'Student not found.',
              );
            }
            if (!student.specialNeedsFlag) {
              throw new HttpError(
                400,
                'GPK_STUDENT_NOT_ELIGIBLE',
                'GPK assignments require specialNeedsFlag.',
              );
            }
            const memberships = await transaction.$queryRaw<
              Array<{ id: string }>
            >(
              Prisma.sql`
                SELECT id
                FROM "Membership"
                WHERE id = ${input.command.membershipId}::uuid
                  AND "organizationId" = ${input.organizationId}::uuid
                  AND status = 'ACTIVE'
                  AND role = 'SPECIAL_ED_TEACHER'
                FOR UPDATE
              `,
            );
            if (!memberships.length) {
              throw new HttpError(
                400,
                'INVALID_GPK_MEMBERSHIP',
                'The target must be an active special education teacher membership in the organization.',
              );
            }
            const overlaps = await transaction.staffStudentAssignment.findMany({
              where: {
                organizationId: input.organizationId,
                studentId: student.id,
                roleContext: GPK_ROLE_CONTEXT,
                ...assignmentOverlapWhere(startsOn, endsOn),
              },
              orderBy: [{ startsOn: 'desc' }, { id: 'asc' }],
              select: {
                id: true,
                membershipId: true,
                startsOn: true,
                endsOn: true,
              },
            });
            const exact = overlaps.find(
              (assignment) =>
                assignment.startsOn.getTime() === startsOn.getTime(),
            );
            if (overlaps.some((assignment) => assignment.startsOn > startsOn)) {
              throw new HttpError(
                409,
                'GPK_ASSIGNMENT_OVERLAP',
                'The requested assignment overlaps a future GPK assignment.',
              );
            }
            const capacityRows =
              await transaction.staffStudentAssignment.findMany({
                where: {
                  organizationId: input.organizationId,
                  membershipId: input.command.membershipId,
                  roleContext: GPK_ROLE_CONTEXT,
                  studentId: { not: student.id },
                  ...assignmentOverlapWhere(startsOn, endsOn),
                },
                distinct: ['studentId'],
                select: { studentId: true },
              });
            if (capacityRows.length >= DEFAULT_GPK_MAX_CASELOAD) {
              throw new HttpError(
                409,
                'GPK_CASELOAD_CAPACITY',
                'The GPK teacher has reached the configured caseload limit.',
              );
            }
            const previousDay = new Date(
              startsOn.getTime() - 24 * 60 * 60 * 1000,
            );
            await transaction.staffStudentAssignment.updateMany({
              where: {
                id: {
                  in: overlaps
                    .filter((row) => row.id !== exact?.id)
                    .map((row) => row.id),
                },
                startsOn: { lt: startsOn },
              },
              data: { endsOn: previousDay },
            });
            const saved = exact
              ? await transaction.staffStudentAssignment.update({
                  where: { id: exact.id },
                  data: {
                    membershipId: input.command.membershipId,
                    endsOn,
                    maxCaseload: DEFAULT_GPK_MAX_CASELOAD,
                  },
                  select: { id: true },
                })
              : await transaction.staffStudentAssignment.create({
                  data: {
                    organizationId: input.organizationId,
                    membershipId: input.command.membershipId,
                    studentId: student.id,
                    roleContext: GPK_ROLE_CONTEXT,
                    startsOn,
                    endsOn,
                    maxCaseload: DEFAULT_GPK_MAX_CASELOAD,
                  },
                  select: { id: true },
                });
            await createAuditService(transaction as PrismaClient).append({
              organizationId: input.organizationId,
              actorId: input.actorId,
              action: 'gpk_assignment.upsert',
              targetType: 'StaffStudentAssignment',
              targetId: saved.id,
              requestId: input.requestId,
              result: 'SUCCEEDED',
              metadata: {
                changedFields: [
                  'membershipId',
                  'startsOn',
                  'endsOn',
                  'maxCaseload',
                ],
              },
            });
            return loadAssignment(transaction, input.organizationId, saved.id);
          },
          { isolationLevel: 'Serializable' },
        );
      } catch (error) {
        if (assignmentConflictCodes.has(prismaErrorCode(error) ?? '')) {
          throw new HttpError(
            409,
            'GPK_ASSIGNMENT_CONFLICT',
            'The GPK assignment conflicted with another request.',
          );
        }
        throw error;
      }
    },

    end(input: {
      organizationId: string;
      assignmentId: string;
      command: GpkAssignmentEndCommand;
      actorId: string;
      requestId: string;
    }) {
      const endsOn = dateAtUtcMidnight(input.command.endsOn);
      return prisma.$transaction(async (transaction) => {
        const assignment = await transaction.staffStudentAssignment.findFirst({
          where: {
            id: input.assignmentId,
            organizationId: input.organizationId,
            roleContext: GPK_ROLE_CONTEXT,
          },
          select: { id: true, startsOn: true, endsOn: true },
        });
        if (!assignment) {
          throw new HttpError(
            404,
            'GPK_ASSIGNMENT_NOT_FOUND',
            'GPK assignment not found.',
          );
        }
        if (endsOn < assignment.startsOn) {
          throw new HttpError(
            400,
            'INVALID_GPK_ASSIGNMENT_DATES',
            'endsOn must be on or after startsOn.',
          );
        }
        if (assignment.endsOn && endsOn > assignment.endsOn) {
          throw new HttpError(
            409,
            'GPK_ASSIGNMENT_ALREADY_ENDED',
            'An ended GPK assignment cannot be extended by the end command.',
          );
        }
        await transaction.staffStudentAssignment.update({
          where: { id: assignment.id },
          data: { endsOn },
        });
        await createAuditService(transaction as PrismaClient).append({
          organizationId: input.organizationId,
          actorId: input.actorId,
          action: 'gpk_assignment.end',
          targetType: 'StaffStudentAssignment',
          targetId: assignment.id,
          requestId: input.requestId,
          result: 'SUCCEEDED',
          metadata: { changedFields: ['endsOn'] },
        });
        return loadAssignment(transaction, input.organizationId, assignment.id);
      });
    },
  };
}

export type GpkService = ReturnType<typeof createGpkService>;
