import type {
  IepCreateCommand,
  IepReviewCommand,
  IepUpdateCommand,
  IepWorkflowCommand,
} from '@learnspace/contracts';
import { iepListQuerySchema } from '@learnspace/contracts';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { z } from 'zod';
import type { MembershipScope } from '../utils/authorization.js';
import { HttpError } from '../middleware/http-errors.js';
import {
  iepListSelect,
  iepSelect,
  mapIep,
  mapIepList,
  nestedIepData,
  rootIepData,
  type IepWorkflowEvent,
} from '../model/ieps-model.js';
import {
  activeAssignedStudentIds,
  assertIepStudentScope,
  denyIepAccess,
  requireIepPermission,
  requireIepRole,
} from '../utils/ieps.policy.js';
import { transitionIep, type IepTransition } from '../utils/ieps.workflow.js';
import { createAuditService } from './audit-service.js';

type IepPrisma = PrismaClient | Prisma.TransactionClient;

type IepListQuery = z.infer<typeof iepListQuerySchema>;

function versionConflict() {
  return new HttpError(
    409,
    'IEP_VERSION_CONFLICT',
    'The IEP was changed by another request.',
  );
}

function contentConflict() {
  return new HttpError(
    409,
    'IEP_CONTENT_CONFLICT',
    'IEP content conflicts with an existing record.',
  );
}

function activePlanConflict() {
  return new HttpError(
    409,
    'IEP_ACTIVE_PLAN_CONFLICT',
    'The student already has another active IEP.',
  );
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

async function validateReferences(
  database: IepPrisma,
  organizationId: string,
  command: IepCreateCommand,
) {
  const [student, academicYear, semester] = await Promise.all([
    database.student.findFirst({
      where: {
        id: command.studentId,
        organizationId,
        status: 'ACTIVE',
        specialNeedsFlag: true,
      },
      select: { id: true },
    }),
    database.academicYear.findFirst({
      where: { id: command.academicYearId, organizationId },
    }),
    command.semesterId
      ? database.semester.findFirst({
          where: {
            id: command.semesterId,
            organizationId,
            academicYearId: command.academicYearId,
          },
        })
      : Promise.resolve(null),
  ]);
  if (!student || !academicYear || (command.semesterId && !semester)) {
    throw new HttpError(
      400,
      'IEP_INVALID_REFERENCE',
      'One or more student or academic references are invalid.',
    );
  }
  const startsOn = new Date(`${command.startsOn}T00:00:00.000Z`);
  const endsOn = new Date(`${command.endsOn}T00:00:00.000Z`);
  if (startsOn < academicYear.startsOn || endsOn > academicYear.endsOn) {
    throw new HttpError(
      400,
      'IEP_DATE_OUT_OF_RANGE',
      'IEP dates must fall within the selected academic year.',
    );
  }
  if (semester && (startsOn < semester.startsOn || endsOn > semester.endsOn)) {
    throw new HttpError(
      400,
      'IEP_DATE_OUT_OF_RANGE',
      'IEP dates must fall within the selected semester.',
    );
  }
}

async function mapWithEvents(
  database: IepPrisma,
  row: Parameters<typeof mapIep>[0],
) {
  const events = await findWorkflowEvents(database, row.organizationId, [
    row.id,
  ]);
  return mapIep(row, events);
}

function findWorkflowEvents(
  database: IepPrisma,
  organizationId: string,
  iepIds: readonly string[],
) {
  if (!iepIds.length) return Promise.resolve([]);
  return database.workflowEvent.findMany({
    where: {
      organizationId,
      aggregateType: 'IEP',
      aggregateId: { in: [...iepIds] },
    },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      aggregateId: true,
      fromState: true,
      toState: true,
      action: true,
      comment: true,
      occurredAt: true,
      actor: {
        select: {
          id: true,
          displayName: true,
          memberships: {
            where: { organizationId },
            take: 1,
            select: { role: true, roleTitle: true },
          },
        },
      },
    },
  });
}

async function appendAudit(
  database: IepPrisma,
  input: {
    organizationId: string;
    actorId: string;
    action: string;
    iepId: string;
    requestId: string;
    changedFields: string[];
  },
) {
  await createAuditService(database).append({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: input.action,
    targetType: 'IEP',
    targetId: input.iepId,
    requestId: input.requestId,
    result: 'SUCCEEDED',
    metadata: { changedFields: input.changedFields },
  });
}

export function createIepService(
  prisma: PrismaClient,
  schoolDate: (organizationId: string) => Promise<Date>,
) {
  async function workflow(input: {
    organizationId: string;
    iepId: string;
    command: IepWorkflowCommand;
    membership: MembershipScope;
    actorId: string;
    requestId: string;
    transition: IepTransition;
  }) {
    const onDate = await schoolDate(input.organizationId);
    const row = await prisma.$transaction((transaction) =>
      transitionIep({
        transaction,
        organizationId: input.organizationId,
        iepId: input.iepId,
        expectedVersion: input.command.expectedVersion,
        actorId: input.actorId,
        membership: input.membership,
        requestId: input.requestId,
        transition: input.transition,
        onDate,
      }),
    );
    return mapWithEvents(prisma, row);
  }

  return {
    async list(input: {
      organizationId: string;
      query: IepListQuery;
      membership: MembershipScope;
    }) {
      requireIepPermission(input.membership, 'special-ed:read');
      const scopedStudentIds = activeAssignedStudentIds(
        input.membership,
        await schoolDate(input.organizationId),
      );
      if (scopedStudentIds?.length === 0) return [];
      const rows = await prisma.iEP.findMany({
        where: {
          organizationId: input.organizationId,
          ...(scopedStudentIds
            ? { studentId: { in: [...scopedStudentIds] } }
            : {}),
          ...(input.query.studentId
            ? { studentId: input.query.studentId }
            : {}),
          ...(input.query.academicYearId
            ? { academicYearId: input.query.academicYearId }
            : {}),
          ...(input.query.semesterId
            ? { semesterId: input.query.semesterId }
            : {}),
          ...(input.query.state ? { state: input.query.state } : {}),
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        select: iepListSelect,
      });
      const events = await findWorkflowEvents(
        prisma,
        input.organizationId,
        rows.map((row) => row.id),
      );
      const eventsByIep = new Map<string, IepWorkflowEvent[]>();
      for (const event of events) {
        const aggregateEvents = eventsByIep.get(event.aggregateId) ?? [];
        aggregateEvents.push(event);
        eventsByIep.set(event.aggregateId, aggregateEvents);
      }
      return rows.map((row) => mapIepList(row, eventsByIep.get(row.id) ?? []));
    },
    async get(input: {
      organizationId: string;
      iepId: string;
      membership: MembershipScope;
    }) {
      requireIepPermission(input.membership, 'special-ed:read');
      const scopedStudentIds = activeAssignedStudentIds(
        input.membership,
        await schoolDate(input.organizationId),
      );
      const row = await prisma.iEP.findFirst({
        where: {
          id: input.iepId,
          organizationId: input.organizationId,
          ...(scopedStudentIds
            ? { studentId: { in: [...scopedStudentIds] } }
            : {}),
        },
        select: iepSelect,
      });
      if (!row) denyIepAccess();
      return mapWithEvents(prisma, row);
    },
    async create(input: {
      organizationId: string;
      command: IepCreateCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      requireIepPermission(input.membership, 'special-ed:write');
      assertIepStudentScope(
        input.membership,
        input.command.studentId,
        await schoolDate(input.organizationId),
      );
      try {
        const row = await prisma.$transaction(async (transaction) => {
          await validateReferences(
            transaction,
            input.organizationId,
            input.command,
          );
          const iep = await transaction.iEP.create({
            data: {
              organizationId: input.organizationId,
              ...rootIepData(input.command),
              state: 'DRAFT',
              createdById: input.actorId,
              updatedById: input.actorId,
              ...nestedIepData(input.command),
            },
            select: { id: true },
          });
          await appendAudit(transaction, {
            organizationId: input.organizationId,
            actorId: input.actorId,
            action: 'iep.create',
            iepId: iep.id,
            requestId: input.requestId,
            changedFields: Object.keys(input.command),
          });
          return transaction.iEP.findFirstOrThrow({
            where: { id: iep.id, organizationId: input.organizationId },
            select: iepSelect,
          });
        });
        return mapWithEvents(prisma, row);
      } catch (error) {
        throw isUniqueConflict(error) ? contentConflict() : error;
      }
    },
    submit(input: {
      organizationId: string;
      iepId: string;
      command: IepWorkflowCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      requireIepPermission(input.membership, 'special-ed:write');
      requireIepRole(input.membership, 'SUBMIT');
      return workflow({
        ...input,
        transition: {
          fromState: 'DRAFT',
          toState: 'COORDINATOR_REVIEW',
          action: 'SUBMITTED',
          auditAction: 'iep.submit',
        },
      });
    },
    coordinatorReview(input: {
      organizationId: string;
      iepId: string;
      command: IepReviewCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      requireIepPermission(input.membership, 'special-ed:review');
      const approved = input.command.decision === 'APPROVE';
      requireIepRole(
        input.membership,
        approved ? 'COORDINATOR_APPROVE' : 'COORDINATOR_RETURN',
      );
      return workflow({
        ...input,
        transition: {
          fromState: 'COORDINATOR_REVIEW',
          toState: approved ? 'DIRECTOR_APPROVAL' : 'DRAFT',
          action: approved ? 'APPROVED' : 'RETURNED',
          auditAction: approved
            ? 'iep.coordinator-approve'
            : 'iep.coordinator-return',
          comment: input.command.comment,
        },
      });
    },
    directorReview(input: {
      organizationId: string;
      iepId: string;
      command: IepReviewCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      requireIepPermission(input.membership, 'special-ed:review');
      const approved = input.command.decision === 'APPROVE';
      requireIepRole(
        input.membership,
        approved ? 'DIRECTOR_APPROVE' : 'DIRECTOR_RETURN',
      );
      return workflow({
        ...input,
        transition: {
          fromState: 'DIRECTOR_APPROVAL',
          toState: approved ? 'APPROVED' : 'COORDINATOR_REVIEW',
          action: approved ? 'APPROVED' : 'RETURNED',
          auditAction: approved
            ? 'iep.director-approve'
            : 'iep.director-return',
          comment: input.command.comment,
        },
      });
    },
    async activate(input: {
      organizationId: string;
      iepId: string;
      command: IepWorkflowCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      requireIepPermission(input.membership, 'special-ed:review');
      requireIepRole(input.membership, 'ACTIVATE');
      try {
        return await workflow({
          ...input,
          transition: {
            fromState: 'APPROVED',
            toState: 'ACTIVE',
            action: 'ACTIVATED',
            auditAction: 'iep.activate',
            archivePriorActive: true,
          },
        });
      } catch (error) {
        throw isUniqueConflict(error) ? activePlanConflict() : error;
      }
    },
    archive(input: {
      organizationId: string;
      iepId: string;
      command: IepWorkflowCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      requireIepPermission(input.membership, 'special-ed:review');
      requireIepRole(input.membership, 'ARCHIVE');
      return workflow({
        ...input,
        transition: {
          fromState: 'ACTIVE',
          toState: 'ARCHIVED',
          action: 'ARCHIVED',
          auditAction: 'iep.archive',
        },
      });
    },
    async update(input: {
      organizationId: string;
      iepId: string;
      command: IepUpdateCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      requireIepPermission(input.membership, 'special-ed:write');
      const onDate = await schoolDate(input.organizationId);
      assertIepStudentScope(input.membership, input.command.studentId, onDate);
      try {
        const row = await prisma.$transaction(async (transaction) => {
          const existing = await transaction.iEP.findFirst({
            where: {
              id: input.iepId,
              organizationId: input.organizationId,
              state: 'DRAFT',
            },
            select: { id: true, studentId: true, version: true },
          });
          if (!existing) denyIepAccess();
          assertIepStudentScope(input.membership, existing.studentId, onDate);
          if (existing.version !== input.command.expectedVersion)
            throw versionConflict();
          await validateReferences(
            transaction,
            input.organizationId,
            input.command,
          );
          const updated = await transaction.iEP.updateMany({
            where: {
              id: input.iepId,
              organizationId: input.organizationId,
              state: 'DRAFT',
              version: input.command.expectedVersion,
            },
            data: {
              ...rootIepData(input.command),
              updatedById: input.actorId,
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) throw versionConflict();
          await Promise.all([
            transaction.iEPTeamMember.deleteMany({
              where: { iepId: input.iepId },
            }),
            transaction.iEPPerformanceArea.deleteMany({
              where: { iepId: input.iepId },
            }),
            transaction.iEPAccommodation.deleteMany({
              where: { iepId: input.iepId },
            }),
            transaction.iEPGoal.deleteMany({ where: { iepId: input.iepId } }),
            transaction.iEPServiceSchedule.deleteMany({
              where: { iepId: input.iepId },
            }),
          ]);
          const nested = nestedIepData(input.command);
          for (const item of nested.teamMembers.create) {
            await transaction.iEPTeamMember.create({
              data: { iepId: input.iepId, ...item },
            });
          }
          for (const item of nested.performanceAreas.create) {
            await transaction.iEPPerformanceArea.create({
              data: { iepId: input.iepId, ...item },
            });
          }
          for (const item of nested.accommodations.create) {
            await transaction.iEPAccommodation.create({
              data: { iepId: input.iepId, ...item },
            });
          }
          for (const item of nested.goals.create) {
            await transaction.iEPGoal.create({
              data: { iepId: input.iepId, ...item },
            });
          }
          for (const item of nested.services.create) {
            await transaction.iEPServiceSchedule.create({
              data: { iepId: input.iepId, ...item },
            });
          }
          await appendAudit(transaction, {
            organizationId: input.organizationId,
            actorId: input.actorId,
            action: 'iep.update',
            iepId: input.iepId,
            requestId: input.requestId,
            changedFields: Object.keys(input.command),
          });
          return transaction.iEP.findFirstOrThrow({
            where: { id: input.iepId, organizationId: input.organizationId },
            select: iepSelect,
          });
        });
        return mapWithEvents(prisma, row);
      } catch (error) {
        throw isUniqueConflict(error) ? contentConflict() : error;
      }
    },
  };
}

export type IepService = ReturnType<typeof createIepService>;
