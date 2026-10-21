import type {
  LearningJourneyCreateCommand,
  LearningJourneyDirectorReviewCommand,
  LearningJourneyListQuery,
  LearningJourneyPrincipalReviewCommand,
  LearningJourneySubmitCommand,
  LearningJourneyUpdateCommand,
} from '@learnspace/contracts';
import { Prisma, type PrismaClient, type WorkflowState } from '@prisma/client';
import type { MembershipScope } from '../utils/authorization.js';
import { HttpError } from '../middleware/http-errors.js';
import {
  mapLearningJourney,
  learningJourneyDate,
  learningJourneySelect,
  nestedLearningJourneyProjects,
  type LearningJourneyRow,
  type LearningJourneyWorkflowEvent,
} from '../model/learning-journeys-model.js';
import {
  assertLearningJourneyWriteScope,
  denyLearningJourneyAccess,
  learningJourneyScopeWhere,
  requireLearningJourneyPermission,
} from '../utils/learning-journeys.policy.js';
import { createAuditService } from './audit-service.js';

type LearningJourneyPrisma = PrismaClient | Prisma.TransactionClient;

export type JourneyTransition = {
  fromState: WorkflowState;
  toState: WorkflowState;
  action: 'SUBMITTED' | 'APPROVED' | 'RETURNED';
  auditAction: string;
  comment?: string;
};

function versionConflict(): HttpError {
  return new HttpError(
    409,
    'LEARNING_JOURNEY_VERSION_CONFLICT',
    'The learning journey was changed by another request.',
  );
}

function invalidTransition(): HttpError {
  return new HttpError(
    409,
    'LEARNING_JOURNEY_INVALID_TRANSITION',
    'The learning journey is not in a valid state for this action.',
  );
}

function duplicateJourneyError(): HttpError {
  return new HttpError(
    409,
    'LEARNING_JOURNEY_DUPLICATE',
    'A learning journey with the same scope and title already exists.',
  );
}

function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String((error as { code?: unknown }).code) === 'P2002'
  );
}

async function actorMembershipId(
  database: LearningJourneyPrisma,
  organizationId: string,
  userId: string,
): Promise<string> {
  const membership = await database.membership.findFirst({
    where: { organizationId, userId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!membership) denyLearningJourneyAccess();
  return membership.id;
}

async function validateReferences(
  database: LearningJourneyPrisma,
  organizationId: string,
  command: LearningJourneyCreateCommand,
) {
  const [academicYear, semester, unit, grade, subject, owners] =
    await Promise.all([
      database.academicYear.findFirst({
        where: { id: command.academicYearId, organizationId },
      }),
      database.semester.findFirst({
        where: {
          id: command.semesterId,
          organizationId,
          academicYearId: command.academicYearId,
        },
      }),
      database.unit.findFirst({
        where: { id: command.unitId, organizationId },
      }),
      database.grade.findFirst({
        where: { id: command.gradeId, organizationId, unitId: command.unitId },
      }),
      database.subject.findFirst({
        where: { id: command.subjectId, organizationId },
      }),
      database.membership.findMany({
        where: {
          id: { in: command.ownerMembershipIds },
          organizationId,
          status: 'ACTIVE',
          user: { status: 'ACTIVE' },
        },
        select: { id: true },
      }),
    ]);
  const references = { academicYear, semester, unit, grade, subject, owners };
  if (
    !references.academicYear ||
    !references.semester ||
    !references.unit ||
    !references.grade ||
    !references.subject
  ) {
    throw new HttpError(
      400,
      'LEARNING_JOURNEY_INVALID_REFERENCE',
      'One or more academic references are invalid.',
    );
  }
  if (references.owners.length !== command.ownerMembershipIds.length) {
    throw new HttpError(
      400,
      'LEARNING_JOURNEY_INVALID_OWNER',
      'One or more owners are invalid.',
    );
  }
  for (const project of command.projects) {
    const startsOn = new Date(`${project.startsOn}T00:00:00.000Z`);
    const endsOn = new Date(`${project.endsOn}T00:00:00.000Z`);
    if (
      startsOn < references.semester.startsOn ||
      endsOn > references.semester.endsOn
    ) {
      throw new HttpError(
        400,
        'LEARNING_JOURNEY_PROJECT_DATE_OUT_OF_RANGE',
        'Project dates must fall within the selected semester.',
      );
    }
  }
}

async function mapWithEvents(
  database: LearningJourneyPrisma,
  row: LearningJourneyRow,
) {
  const events = await findWorkflowEvents(database, row.organizationId, [
    row.id,
  ]);
  return mapLearningJourney(row, events);
}

function findWorkflowEvents(
  database: LearningJourneyPrisma,
  organizationId: string,
  journeyIds: readonly string[],
) {
  if (!journeyIds.length) return Promise.resolve([]);
  return database.workflowEvent.findMany({
    where: {
      organizationId,
      aggregateType: 'LEARNING_JOURNEY',
      aggregateId: { in: [...journeyIds] },
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

async function transitionJourneyWithPrisma(input: {
  database: LearningJourneyPrisma;
  organizationId: string;
  journeyId: string;
  expectedVersion: number;
  actorId: string;
  actorMembershipId: string;
  membership: MembershipScope;
  requestId: string;
  transition: JourneyTransition;
  requireOwner: boolean;
}): Promise<LearningJourneyRow> {
  const scope = learningJourneyScopeWhere(input.membership);
  if (!scope) denyLearningJourneyAccess();
  const existing = await input.database.learningJourney.findFirst({
    where: {
      id: input.journeyId,
      organizationId: input.organizationId,
      AND: [scope],
      ...(input.requireOwner
        ? {
            OR: [
              { createdById: input.actorId },
              { owners: { some: { membershipId: input.actorMembershipId } } },
            ],
          }
        : {}),
    },
    select: { state: true, version: true },
  });
  if (!existing) denyLearningJourneyAccess();
  if (existing.version !== input.expectedVersion) throw versionConflict();
  if (existing.state !== input.transition.fromState) throw invalidTransition();

  const updated = await input.database.learningJourney.updateMany({
    where: {
      id: input.journeyId,
      organizationId: input.organizationId,
      state: input.transition.fromState,
      version: input.expectedVersion,
    },
    data: {
      state: input.transition.toState,
      updatedById: input.actorId,
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) throw versionConflict();

  await input.database.workflowEvent.create({
    data: {
      organizationId: input.organizationId,
      aggregateType: 'LEARNING_JOURNEY',
      aggregateId: input.journeyId,
      fromState: input.transition.fromState,
      toState: input.transition.toState,
      action: input.transition.action,
      actorId: input.actorId,
      comment: input.transition.comment ?? null,
    },
  });
  await createAuditService(input.database).append({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: input.transition.auditAction,
    targetType: 'LearningJourney',
    targetId: input.journeyId,
    requestId: input.requestId,
    result: 'SUCCEEDED',
    metadata: { changedFields: ['state', 'version', 'updatedById'] },
  });
  return input.database.learningJourney.findFirstOrThrow({
    where: { id: input.journeyId, organizationId: input.organizationId },
    select: learningJourneySelect,
  });
}

export async function transitionJourney(input: {
  transaction: Prisma.TransactionClient;
  organizationId: string;
  journeyId: string;
  expectedVersion: number;
  actorId: string;
  actorMembershipId: string;
  membership: MembershipScope;
  requestId: string;
  transition: JourneyTransition;
  requireOwner: boolean;
}): Promise<LearningJourneyRow> {
  return transitionJourneyWithPrisma({
    ...input,
    database: input.transaction,
  });
}

export function createLearningJourneyService(prisma: PrismaClient) {
  return {
    async list(input: {
      organizationId: string;
      query: LearningJourneyListQuery;
      membership: MembershipScope;
    }) {
      requireLearningJourneyPermission(input.membership, 'journey:read');
      const scope = learningJourneyScopeWhere(input.membership);
      if (!scope) denyLearningJourneyAccess();
      const where: Prisma.LearningJourneyWhereInput = {};
      if (input.query.academicYearId)
        where.academicYearId = input.query.academicYearId;
      if (input.query.semesterId) where.semesterId = input.query.semesterId;
      if (input.query.unitId) where.unitId = input.query.unitId;
      if (input.query.gradeId) where.gradeId = input.query.gradeId;
      if (input.query.subjectId) where.subjectId = input.query.subjectId;
      if (input.query.state) where.state = input.query.state;
      if (input.query.ownerMembershipId)
        where.owners = {
          some: { membershipId: input.query.ownerMembershipId },
        };
      if (
        input.query.projectStartsOnOrAfter ||
        input.query.projectEndsOnOrBefore
      ) {
        where.projects = {
          some: {
            ...(input.query.projectStartsOnOrAfter
              ? {
                  endsOn: {
                    gte: learningJourneyDate(
                      input.query.projectStartsOnOrAfter,
                    ),
                  },
                }
              : {}),
            ...(input.query.projectEndsOnOrBefore
              ? {
                  startsOn: {
                    lte: learningJourneyDate(input.query.projectEndsOnOrBefore),
                  },
                }
              : {}),
          },
        };
      }
      if (input.query.search) {
        where.OR = [
          { title: { contains: input.query.search, mode: 'insensitive' } },
          {
            subject: {
              name: { contains: input.query.search, mode: 'insensitive' },
            },
          },
          {
            owners: {
              some: {
                membership: {
                  user: {
                    displayName: {
                      contains: input.query.search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
          },
          {
            projects: {
              some: {
                OR: [
                  {
                    title: {
                      contains: input.query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    description: {
                      contains: input.query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    goals: {
                      some: {
                        description: {
                          contains: input.query.search,
                          mode: 'insensitive',
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        ];
      }
      const rows = await prisma.learningJourney.findMany({
        where: { organizationId: input.organizationId, AND: [scope, where] },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        select: learningJourneySelect,
      });
      const events = await findWorkflowEvents(
        prisma,
        input.organizationId,
        rows.map((row) => row.id),
      );
      const eventsByJourney = new Map<string, LearningJourneyWorkflowEvent[]>();
      for (const event of events) {
        const aggregateEvents = eventsByJourney.get(event.aggregateId) ?? [];
        aggregateEvents.push(event);
        eventsByJourney.set(event.aggregateId, aggregateEvents);
      }
      return rows.map((row) =>
        mapLearningJourney(row, eventsByJourney.get(row.id) ?? []),
      );
    },

    async get(input: {
      organizationId: string;
      journeyId: string;
      membership: MembershipScope;
    }) {
      requireLearningJourneyPermission(input.membership, 'journey:read');
      const scope = learningJourneyScopeWhere(input.membership);
      if (!scope) denyLearningJourneyAccess();
      const row = await prisma.learningJourney.findFirst({
        where: {
          id: input.journeyId,
          organizationId: input.organizationId,
          AND: [scope],
        },
        select: learningJourneySelect,
      });
      if (!row) denyLearningJourneyAccess();
      return mapWithEvents(prisma, row);
    },

    async create(input: {
      organizationId: string;
      command: LearningJourneyCreateCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      requireLearningJourneyPermission(input.membership, 'journey:write');
      assertLearningJourneyWriteScope(input.membership, input.command);
      try {
        const row = await prisma.$transaction(async (transaction) => {
          await validateReferences(
            transaction,
            input.organizationId,
            input.command,
          );
          const ownerId = await actorMembershipId(
            transaction,
            input.organizationId,
            input.actorId,
          );
          if (!input.command.ownerMembershipIds.includes(ownerId))
            denyLearningJourneyAccess();
          const journey = await transaction.learningJourney.create({
            data: {
              organizationId: input.organizationId,
              title: input.command.title,
              academicYearId: input.command.academicYearId,
              semesterId: input.command.semesterId,
              unitId: input.command.unitId,
              gradeId: input.command.gradeId,
              subjectId: input.command.subjectId,
              state: 'DRAFT',
              createdById: input.actorId,
              updatedById: input.actorId,
              owners: {
                create: input.command.ownerMembershipIds.map(
                  (membershipId) => ({ membershipId }),
                ),
              },
              projects: {
                create: nestedLearningJourneyProjects(input.command),
              },
            },
            select: { id: true },
          });
          await createAuditService(transaction).append({
            organizationId: input.organizationId,
            actorId: input.actorId,
            action: 'learning-journey.create',
            targetType: 'LearningJourney',
            targetId: journey.id,
            requestId: input.requestId,
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(input.command) },
          });
          return transaction.learningJourney.findFirstOrThrow({
            where: { id: journey.id, organizationId: input.organizationId },
            select: learningJourneySelect,
          });
        });
        return mapWithEvents(prisma, row);
      } catch (error) {
        throw isUniqueConflict(error) ? duplicateJourneyError() : error;
      }
    },

    async submit(input: {
      organizationId: string;
      journeyId: string;
      command: LearningJourneySubmitCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      requireLearningJourneyPermission(input.membership, 'journey:write');
      const row = await prisma.$transaction(async (transaction) => {
        const membershipId = await actorMembershipId(
          transaction,
          input.organizationId,
          input.actorId,
        );
        return transitionJourneyWithPrisma({
          database: transaction,
          organizationId: input.organizationId,
          journeyId: input.journeyId,
          expectedVersion: input.command.expectedVersion,
          actorId: input.actorId,
          actorMembershipId: membershipId,
          membership: input.membership,
          requestId: input.requestId,
          requireOwner: true,
          transition: {
            fromState: 'DRAFT',
            toState: 'PRINCIPAL_REVIEW',
            action: 'SUBMITTED',
            auditAction: 'learning-journey.submit',
          },
        });
      });
      return mapWithEvents(prisma, row);
    },

    async principalReview(input: {
      organizationId: string;
      journeyId: string;
      command: LearningJourneyPrincipalReviewCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      requireLearningJourneyPermission(input.membership, 'journey:review');
      const row = await prisma.$transaction(async (transaction) => {
        const membershipId = await actorMembershipId(
          transaction,
          input.organizationId,
          input.actorId,
        );
        const approved = input.command.decision === 'APPROVE';
        return transitionJourneyWithPrisma({
          database: transaction,
          organizationId: input.organizationId,
          journeyId: input.journeyId,
          expectedVersion: input.command.expectedVersion,
          actorId: input.actorId,
          actorMembershipId: membershipId,
          membership: input.membership,
          requestId: input.requestId,
          requireOwner: false,
          transition: {
            fromState: 'PRINCIPAL_REVIEW',
            toState: approved ? 'DIRECTOR_APPROVAL' : 'DRAFT',
            action: approved ? 'APPROVED' : 'RETURNED',
            auditAction: approved
              ? 'learning-journey.principal-approve'
              : 'learning-journey.principal-return',
            comment: input.command.comment,
          },
        });
      });
      return mapWithEvents(prisma, row);
    },

    async directorReview(input: {
      organizationId: string;
      journeyId: string;
      command: LearningJourneyDirectorReviewCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      requireLearningJourneyPermission(input.membership, 'journey:approve');
      const row = await prisma.$transaction(async (transaction) => {
        const membershipId = await actorMembershipId(
          transaction,
          input.organizationId,
          input.actorId,
        );
        const approved = input.command.decision === 'APPROVE';
        return transitionJourneyWithPrisma({
          database: transaction,
          organizationId: input.organizationId,
          journeyId: input.journeyId,
          expectedVersion: input.command.expectedVersion,
          actorId: input.actorId,
          actorMembershipId: membershipId,
          membership: input.membership,
          requestId: input.requestId,
          requireOwner: false,
          transition: {
            fromState: 'DIRECTOR_APPROVAL',
            toState: approved ? 'APPROVED' : 'DRAFT',
            action: approved ? 'APPROVED' : 'RETURNED',
            auditAction: approved
              ? 'learning-journey.director-approve'
              : 'learning-journey.director-return',
            comment: input.command.comment,
          },
        });
      });
      return mapWithEvents(prisma, row);
    },

    async update(input: {
      organizationId: string;
      journeyId: string;
      command: LearningJourneyUpdateCommand;
      membership: MembershipScope;
      actorId: string;
      requestId: string;
    }) {
      requireLearningJourneyPermission(input.membership, 'journey:write');
      assertLearningJourneyWriteScope(input.membership, input.command);
      try {
        const row = await prisma.$transaction(async (transaction) => {
          const scope = learningJourneyScopeWhere(input.membership);
          if (!scope) denyLearningJourneyAccess();
          const ownerId = await actorMembershipId(
            transaction,
            input.organizationId,
            input.actorId,
          );
          const existing = await transaction.learningJourney.findFirst({
            where: {
              id: input.journeyId,
              organizationId: input.organizationId,
              state: 'DRAFT',
              AND: [scope],
              OR: [
                { createdById: input.actorId },
                { owners: { some: { membershipId: ownerId } } },
              ],
            },
            select: { id: true, version: true },
          });
          if (!existing) denyLearningJourneyAccess();
          if (existing.version !== input.command.expectedVersion)
            throw versionConflict();
          await validateReferences(
            transaction,
            input.organizationId,
            input.command,
          );
          if (!input.command.ownerMembershipIds.includes(ownerId))
            denyLearningJourneyAccess();
          const updated = await transaction.learningJourney.updateMany({
            where: {
              id: input.journeyId,
              organizationId: input.organizationId,
              version: input.command.expectedVersion,
              state: 'DRAFT',
            },
            data: {
              title: input.command.title,
              academicYearId: input.command.academicYearId,
              semesterId: input.command.semesterId,
              unitId: input.command.unitId,
              gradeId: input.command.gradeId,
              subjectId: input.command.subjectId,
              updatedById: input.actorId,
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) throw versionConflict();
          await transaction.learningJourneyOwner.deleteMany({
            where: { learningJourneyId: input.journeyId },
          });
          await transaction.learningJourneyProject.deleteMany({
            where: { learningJourneyId: input.journeyId },
          });
          await transaction.learningJourneyOwner.createMany({
            data: input.command.ownerMembershipIds.map((membershipId) => ({
              learningJourneyId: input.journeyId,
              membershipId,
            })),
          });
          for (const project of nestedLearningJourneyProjects(input.command)) {
            await transaction.learningJourneyProject.create({
              data: { learningJourneyId: input.journeyId, ...project },
            });
          }
          await createAuditService(transaction).append({
            organizationId: input.organizationId,
            actorId: input.actorId,
            action: 'learning-journey.update',
            targetType: 'LearningJourney',
            targetId: input.journeyId,
            requestId: input.requestId,
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(input.command) },
          });
          return transaction.learningJourney.findFirstOrThrow({
            where: {
              id: input.journeyId,
              organizationId: input.organizationId,
            },
            select: learningJourneySelect,
          });
        });
        return mapWithEvents(prisma, row);
      } catch (error) {
        throw isUniqueConflict(error) ? duplicateJourneyError() : error;
      }
    },
  };
}

export type LearningJourneyService = ReturnType<
  typeof createLearningJourneyService
>;
