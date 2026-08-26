import {
  Prisma,
  type MembershipRole,
  type PrismaClient,
  type WorkflowState,
} from '@prisma/client';
import type { Request, Router } from 'express';
import { Router as createRouter } from 'express';
import { z } from 'zod';
import {
  learningJourneyCreateCommandSchema,
  learningJourneyDetailResponseSchema,
  learningJourneyDirectorReviewCommandSchema,
  learningJourneyListQuerySchema,
  learningJourneyMutationResponseSchema,
  learningJourneyPrincipalReviewCommandSchema,
  learningJourneySubmitCommandSchema,
  learningJourneyUpdateCommandSchema,
  learningJourneysResponseSchema,
  uuidSchema,
} from '@learnspace/contracts';
import { createAuditRepository } from './audit.js';
import {
  AuthorizationDeniedError,
  requireOrganizationScope,
  requirePermission,
  type MembershipScope,
} from './authorization.js';
import {
  createCsrfProtection,
  createRequiredAuthentication,
  type AuthenticatedRequest,
} from './authRoutes.js';
import { HttpError, parseRequest } from './httpErrors.js';
import type { SessionService } from './sessionService.js';

const leadershipRoles: readonly MembershipRole[] = ['DIRECTOR', 'PRINCIPAL'];

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateAtUtcMidnight(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function requireAuth(request: Request) {
  const auth = (request as AuthenticatedRequest).auth;
  if (!auth) {
    throw new HttpError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required.',
    );
  }
  return auth;
}

function membershipFor(request: Request, organizationId: string) {
  try {
    return requireOrganizationScope(
      requireAuth(request).memberships,
      organizationId,
    );
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) deny();
    throw error;
  }
}

function requireJourneyPermission(
  membership: MembershipScope,
  permission:
    'journey:read' | 'journey:write' | 'journey:review' | 'journey:approve',
) {
  try {
    requirePermission(membership, permission);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) deny();
    throw error;
  }
}

function deny(): never {
  throw new HttpError(403, 'AUTHORIZATION_DENIED', 'The request was denied.');
}

function journeyScopeWhere(
  membership: MembershipScope,
): Prisma.LearningJourneyWhereInput | undefined {
  if (leadershipRoles.includes(membership.role)) return {};
  if (membership.role === 'GRADE_TEACHER') {
    // P5-002 policy explicitly grants journeys in an assigned unit or grade.
    const scopes: Prisma.LearningJourneyWhereInput[] = [];
    if (membership.unitIds.length)
      scopes.push({ unitId: { in: membership.unitIds } });
    if (membership.gradeIds.length)
      scopes.push({ gradeId: { in: membership.gradeIds } });
    return scopes.length ? { OR: scopes } : undefined;
  }
  if (membership.role === 'SUBJECT_TEACHER') {
    return membership.subjectIds.length
      ? { subjectId: { in: membership.subjectIds } }
      : undefined;
  }
  return undefined;
}

function assertWriteScope(
  membership: MembershipScope,
  value: { unitId: string; gradeId: string; subjectId: string },
) {
  if (membership.role === 'GRADE_TEACHER') {
    // Writes use the same assigned-unit-or-grade scope as reads.
    if (
      membership.unitIds.includes(value.unitId) ||
      membership.gradeIds.includes(value.gradeId)
    )
      return;
    deny();
  }
  if (
    membership.role === 'SUBJECT_TEACHER' &&
    membership.subjectIds.includes(value.subjectId)
  )
    return;
  deny();
}

const journeySelect = {
  id: true,
  organizationId: true,
  title: true,
  state: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  academicYear: true,
  semester: true,
  unit: true,
  grade: true,
  subject: true,
  createdBy: { select: { id: true, displayName: true } },
  updatedBy: { select: { id: true, displayName: true } },
  owners: {
    orderBy: { membershipId: 'asc' as const },
    select: {
      membership: {
        select: {
          id: true,
          userId: true,
          role: true,
          roleTitle: true,
          user: { select: { displayName: true } },
        },
      },
    },
  },

  projects: {
    orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
    select: {
      id: true,
      title: true,
      description: true,
      startsOn: true,
      endsOn: true,
      color: true,
      position: true,
      goals: {
        orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
      },
      connections: {
        orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
      },
    },
  },
} satisfies Prisma.LearningJourneySelect;

type JourneyRow = Prisma.LearningJourneyGetPayload<{
  select: typeof journeySelect;
}>;

type JourneyWorkflowEvent = {
  id: string;
  aggregateId: string;
  fromState: WorkflowState;
  toState: WorkflowState;
  action:
    | 'SUBMITTED'
    | 'APPROVED'
    | 'RETURNED'
    | 'UPDATED'
    | 'ACTIVATED'
    | 'ARCHIVED';
  comment: string | null;
  occurredAt: Date;
  actor: {
    id: string;
    displayName: string;
    memberships: Array<{ role: MembershipRole; roleTitle: string | null }>;
  };
};

function mapJourney(
  row: JourneyRow,
  workflowEvents: readonly JourneyWorkflowEvent[] = [],
) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    title: row.title,
    academicYear: {
      ...row.academicYear,
      startsOn: isoDate(row.academicYear.startsOn),
      endsOn: isoDate(row.academicYear.endsOn),
    },
    semester: {
      ...row.semester,
      startsOn: isoDate(row.semester.startsOn),
      endsOn: isoDate(row.semester.endsOn),
    },
    unit: row.unit,
    grade: row.grade,
    subject: row.subject,
    state: row.state,
    version: row.version,
    owners: row.owners.map(({ membership }) => ({
      membershipId: membership.id,
      userId: membership.userId,
      displayName: membership.user.displayName,
      role: membership.role,
      roleTitle: membership.roleTitle,
    })),
    workflowEvents: workflowEvents.map((event) => ({
      id: event.id,
      fromState: event.fromState,
      toState: event.toState,
      action: event.action,
      comment: event.comment,
      occurredAt: event.occurredAt.toISOString(),
      actor: {
        id: event.actor.id,
        displayName: event.actor.displayName,
        role: event.actor.memberships[0]?.role ?? null,
        roleTitle: event.actor.memberships[0]?.roleTitle ?? null,
      },
    })),
    projects: row.projects.map((project) => ({
      ...project,
      startsOn: isoDate(project.startsOn),
      endsOn: isoDate(project.endsOn),
    })),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function journeyWorkflowEvents(
  prisma: Prisma.TransactionClient | PrismaClient,
  organizationId: string,
  journeyIds: readonly string[],
): Promise<JourneyWorkflowEvent[]> {
  if (!journeyIds.length) return [];
  return prisma.workflowEvent.findMany({
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

async function mappedJourney(
  prisma: Prisma.TransactionClient | PrismaClient,
  row: JourneyRow,
) {
  const events = await journeyWorkflowEvents(prisma, row.organizationId, [
    row.id,
  ]);
  return mapJourney(row, events);
}

async function actorMembershipId(
  prisma: Prisma.TransactionClient,
  organizationId: string,
  userId: string,
): Promise<string> {
  const membership = await prisma.membership.findFirst({
    where: { organizationId, userId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!membership) deny();
  return membership.id;
}

async function validateReferences(
  prisma: Prisma.TransactionClient,
  organizationId: string,
  command: z.infer<typeof learningJourneyCreateCommandSchema>,
) {
  const [academicYear, semester, unit, grade, subject, owners] =
    await Promise.all([
      prisma.academicYear.findFirst({
        where: { id: command.academicYearId, organizationId },
      }),
      prisma.semester.findFirst({
        where: {
          id: command.semesterId,
          organizationId,
          academicYearId: command.academicYearId,
        },
      }),
      prisma.unit.findFirst({ where: { id: command.unitId, organizationId } }),
      prisma.grade.findFirst({
        where: {
          id: command.gradeId,
          organizationId,
          unitId: command.unitId,
        },
      }),
      prisma.subject.findFirst({
        where: { id: command.subjectId, organizationId },
      }),
      prisma.membership.findMany({
        where: {
          id: { in: command.ownerMembershipIds },
          organizationId,
          status: 'ACTIVE',
          user: { status: 'ACTIVE' },
        },
        select: { id: true },
      }),
    ]);
  if (!academicYear || !semester || !unit || !grade || !subject) {
    throw new HttpError(
      400,
      'LEARNING_JOURNEY_INVALID_REFERENCE',
      'One or more academic references are invalid.',
    );
  }
  if (owners.length !== command.ownerMembershipIds.length) {
    throw new HttpError(
      400,
      'LEARNING_JOURNEY_INVALID_OWNER',
      'One or more owners are invalid.',
    );
  }
  for (const project of command.projects) {
    const startsOn = dateAtUtcMidnight(project.startsOn);
    const endsOn = dateAtUtcMidnight(project.endsOn);
    if (startsOn < semester.startsOn || endsOn > semester.endsOn) {
      throw new HttpError(
        400,
        'LEARNING_JOURNEY_PROJECT_DATE_OUT_OF_RANGE',
        'Project dates must fall within the selected semester.',
      );
    }
  }
}

function nestedProjects(
  command: z.infer<typeof learningJourneyCreateCommandSchema>,
) {
  return command.projects.map((project) => ({
    title: project.title,
    description: project.description,
    startsOn: dateAtUtcMidnight(project.startsOn),
    endsOn: dateAtUtcMidnight(project.endsOn),
    color: project.color ?? null,
    position: project.position,
    goals: {
      create: project.goals.map((goal) => ({
        description: goal.description,
        position: goal.position,
      })),
    },
    connections: {
      create: project.connections.map((connection) => ({
        subject: connection.subject,
        description: connection.description,
        position: connection.position,
      })),
    },
  }));
}

function queryWhere(query: z.infer<typeof learningJourneyListQuerySchema>) {
  const where: Prisma.LearningJourneyWhereInput = {};
  if (query.academicYearId) where.academicYearId = query.academicYearId;
  if (query.semesterId) where.semesterId = query.semesterId;
  if (query.unitId) where.unitId = query.unitId;
  if (query.gradeId) where.gradeId = query.gradeId;
  if (query.subjectId) where.subjectId = query.subjectId;
  if (query.state) where.state = query.state as WorkflowState;
  if (query.ownerMembershipId)
    where.owners = { some: { membershipId: query.ownerMembershipId } };
  if (query.projectStartsOnOrAfter || query.projectEndsOnOrBefore) {
    where.projects = {
      some: {
        ...(query.projectStartsOnOrAfter
          ? { endsOn: { gte: dateAtUtcMidnight(query.projectStartsOnOrAfter) } }
          : {}),
        ...(query.projectEndsOnOrBefore
          ? {
              startsOn: { lte: dateAtUtcMidnight(query.projectEndsOnOrBefore) },
            }
          : {}),
      },
    };
  }
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { subject: { name: { contains: query.search, mode: 'insensitive' } } },
      {
        owners: {
          some: {
            membership: {
              user: {
                displayName: { contains: query.search, mode: 'insensitive' },
              },
            },
          },
        },
      },
      {
        projects: {
          some: {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              {
                goals: {
                  some: {
                    description: {
                      contains: query.search,
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
  return where;
}

function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String((error as { code?: unknown }).code) === 'P2002'
  );
}

function duplicateJourneyError(): HttpError {
  return new HttpError(
    409,
    'LEARNING_JOURNEY_DUPLICATE',
    'A learning journey with the same scope and title already exists.',
  );
}

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

export type JourneyTransition = {
  fromState: WorkflowState;
  toState: WorkflowState;
  action: 'SUBMITTED' | 'APPROVED' | 'RETURNED';
  auditAction: string;
  comment?: string;
};

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
}): Promise<JourneyRow> {
  const scope = journeyScopeWhere(input.membership);
  if (!scope) deny();
  const existing = await input.transaction.learningJourney.findFirst({
    where: {
      id: input.journeyId,
      organizationId: input.organizationId,
      AND: [scope],
      ...(input.requireOwner
        ? {
            OR: [
              { createdById: input.actorId },
              {
                owners: {
                  some: { membershipId: input.actorMembershipId },
                },
              },
            ],
          }
        : {}),
    },
    select: { state: true, version: true },
  });
  if (!existing) deny();
  if (existing.version !== input.expectedVersion) throw versionConflict();
  if (existing.state !== input.transition.fromState) throw invalidTransition();

  const updated = await input.transaction.learningJourney.updateMany({
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

  await input.transaction.workflowEvent.create({
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
  await createAuditRepository(input.transaction as PrismaClient).append({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: input.transition.auditAction,
    targetType: 'LearningJourney',
    targetId: input.journeyId,
    requestId: input.requestId,
    result: 'SUCCEEDED',
    metadata: { changedFields: ['state', 'version', 'updatedById'] },
  });
  return input.transaction.learningJourney.findFirstOrThrow({
    where: { id: input.journeyId, organizationId: input.organizationId },
    select: journeySelect,
  });
}

export function createLearningJourneyRouter(
  prisma: PrismaClient,
  sessions: SessionService,
): Router {
  const router = createRouter();
  router.use(createRequiredAuthentication(sessions));

  router.get(
    '/organizations/:organizationId/learning-journeys',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema }).strict(),
          request.params,
        );
        const query = parseRequest(
          learningJourneyListQuerySchema,
          request.query,
        );
        const membership = membershipFor(request, path.organizationId);
        requireJourneyPermission(membership, 'journey:read');
        const scope = journeyScopeWhere(membership);
        if (!scope) deny();
        const rows = await prisma.learningJourney.findMany({
          where: {
            organizationId: path.organizationId,
            AND: [scope, queryWhere(query)],
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          select: journeySelect,
        });
        const events = await journeyWorkflowEvents(
          prisma,
          path.organizationId,
          rows.map((row) => row.id),
        );
        const eventsByJourney = new Map<string, JourneyWorkflowEvent[]>();
        for (const event of events) {
          const aggregateEvents = eventsByJourney.get(event.aggregateId) ?? [];
          aggregateEvents.push(event);
          eventsByJourney.set(event.aggregateId, aggregateEvents);
        }
        const data = rows.map((row) =>
          mapJourney(row, eventsByJourney.get(row.id) ?? []),
        );
        response.json(
          learningJourneysResponseSchema.parse({
            data,
            meta: { count: data.length },
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/learning-journeys/:journeyId',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, journeyId: uuidSchema })
            .strict(),
          request.params,
        );
        const membership = membershipFor(request, path.organizationId);
        requireJourneyPermission(membership, 'journey:read');
        const scope = journeyScopeWhere(membership);
        if (!scope) deny();
        const row = await prisma.learningJourney.findFirst({
          where: {
            id: path.journeyId,
            organizationId: path.organizationId,
            AND: [scope],
          },
          select: journeySelect,
        });
        if (!row) deny();
        const data = await mappedJourney(prisma, row);
        response.json(learningJourneyDetailResponseSchema.parse({ data }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/organizations/:organizationId/learning-journeys',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema }).strict(),
          request.params,
        );
        const command = parseRequest(
          learningJourneyCreateCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireJourneyPermission(membership, 'journey:write');
        assertWriteScope(membership, command);
        const row = await prisma.$transaction(async (transaction) => {
          await validateReferences(transaction, path.organizationId, command);
          const actorOwnerId = await actorMembershipId(
            transaction,
            path.organizationId,
            auth.userId,
          );
          if (!command.ownerMembershipIds.includes(actorOwnerId)) deny();
          const journey = await transaction.learningJourney.create({
            data: {
              organizationId: path.organizationId,
              title: command.title,
              academicYearId: command.academicYearId,
              semesterId: command.semesterId,
              unitId: command.unitId,
              gradeId: command.gradeId,
              subjectId: command.subjectId,
              state: 'DRAFT',
              createdById: auth.userId,
              updatedById: auth.userId,
              owners: {
                create: command.ownerMembershipIds.map((membershipId) => ({
                  membershipId,
                })),
              },
              projects: { create: nestedProjects(command) },
            },
            select: { id: true },
          });
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'learning-journey.create',
            targetType: 'LearningJourney',
            targetId: journey.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(command) },
          });
          return transaction.learningJourney.findFirstOrThrow({
            where: { id: journey.id, organizationId: path.organizationId },
            select: journeySelect,
          });
        });
        const data = await mappedJourney(prisma, row);
        response
          .status(201)
          .json(learningJourneyMutationResponseSchema.parse({ data }));
      } catch (error) {
        next(isUniqueConflict(error) ? duplicateJourneyError() : error);
      }
    },
  );

  router.post(
    '/organizations/:organizationId/learning-journeys/:journeyId/submit',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, journeyId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          learningJourneySubmitCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireJourneyPermission(membership, 'journey:write');
        const row = await prisma.$transaction(async (transaction) => {
          const membershipId = await actorMembershipId(
            transaction,
            path.organizationId,
            auth.userId,
          );
          return transitionJourney({
            transaction,
            organizationId: path.organizationId,
            journeyId: path.journeyId,
            expectedVersion: command.expectedVersion,
            actorId: auth.userId,
            actorMembershipId: membershipId,
            membership,
            requestId: String(response.locals.requestId),
            requireOwner: true,
            transition: {
              fromState: 'DRAFT',
              toState: 'PRINCIPAL_REVIEW',
              action: 'SUBMITTED',
              auditAction: 'learning-journey.submit',
            },
          });
        });
        const data = await mappedJourney(prisma, row);
        response.json(learningJourneyMutationResponseSchema.parse({ data }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/organizations/:organizationId/learning-journeys/:journeyId/principal-review',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, journeyId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          learningJourneyPrincipalReviewCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireJourneyPermission(membership, 'journey:review');
        const row = await prisma.$transaction(async (transaction) => {
          const membershipId = await actorMembershipId(
            transaction,
            path.organizationId,
            auth.userId,
          );
          const approved = command.decision === 'APPROVE';
          return transitionJourney({
            transaction,
            organizationId: path.organizationId,
            journeyId: path.journeyId,
            expectedVersion: command.expectedVersion,
            actorId: auth.userId,
            actorMembershipId: membershipId,
            membership,
            requestId: String(response.locals.requestId),
            requireOwner: false,
            transition: {
              fromState: 'PRINCIPAL_REVIEW',
              toState: approved ? 'DIRECTOR_APPROVAL' : 'DRAFT',
              action: approved ? 'APPROVED' : 'RETURNED',
              auditAction: approved
                ? 'learning-journey.principal-approve'
                : 'learning-journey.principal-return',
              comment: command.comment,
            },
          });
        });
        const data = await mappedJourney(prisma, row);
        response.json(learningJourneyMutationResponseSchema.parse({ data }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/organizations/:organizationId/learning-journeys/:journeyId/director-review',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, journeyId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          learningJourneyDirectorReviewCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireJourneyPermission(membership, 'journey:approve');
        const row = await prisma.$transaction(async (transaction) => {
          const membershipId = await actorMembershipId(
            transaction,
            path.organizationId,
            auth.userId,
          );
          const approved = command.decision === 'APPROVE';
          return transitionJourney({
            transaction,
            organizationId: path.organizationId,
            journeyId: path.journeyId,
            expectedVersion: command.expectedVersion,
            actorId: auth.userId,
            actorMembershipId: membershipId,
            membership,
            requestId: String(response.locals.requestId),
            requireOwner: false,
            transition: {
              fromState: 'DIRECTOR_APPROVAL',
              toState: approved ? 'APPROVED' : 'DRAFT',
              action: approved ? 'APPROVED' : 'RETURNED',
              auditAction: approved
                ? 'learning-journey.director-approve'
                : 'learning-journey.director-return',
              comment: command.comment,
            },
          });
        });
        const data = await mappedJourney(prisma, row);
        response.json(learningJourneyMutationResponseSchema.parse({ data }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.put(
    '/organizations/:organizationId/learning-journeys/:journeyId',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, journeyId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          learningJourneyUpdateCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireJourneyPermission(membership, 'journey:write');
        assertWriteScope(membership, command);
        const row = await prisma.$transaction(async (transaction) => {
          const scope = journeyScopeWhere(membership);
          if (!scope) deny();
          const actorOwnerId = await actorMembershipId(
            transaction,
            path.organizationId,
            auth.userId,
          );
          const existing = await transaction.learningJourney.findFirst({
            where: {
              id: path.journeyId,
              organizationId: path.organizationId,
              state: 'DRAFT',
              AND: [scope],
              OR: [
                { createdById: auth.userId },
                { owners: { some: { membershipId: actorOwnerId } } },
              ],
            },
            select: { id: true, version: true },
          });
          if (!existing) deny();
          if (existing.version !== command.expectedVersion) {
            throw versionConflict();
          }
          await validateReferences(transaction, path.organizationId, command);
          if (!command.ownerMembershipIds.includes(actorOwnerId)) deny();
          const updated = await transaction.learningJourney.updateMany({
            where: {
              id: path.journeyId,
              organizationId: path.organizationId,
              version: command.expectedVersion,
              state: 'DRAFT',
            },
            data: {
              title: command.title,
              academicYearId: command.academicYearId,
              semesterId: command.semesterId,
              unitId: command.unitId,
              gradeId: command.gradeId,
              subjectId: command.subjectId,
              updatedById: auth.userId,
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) throw versionConflict();
          await transaction.learningJourneyOwner.deleteMany({
            where: { learningJourneyId: path.journeyId },
          });
          await transaction.learningJourneyProject.deleteMany({
            where: { learningJourneyId: path.journeyId },
          });
          await transaction.learningJourneyOwner.createMany({
            data: command.ownerMembershipIds.map((membershipId) => ({
              learningJourneyId: path.journeyId,
              membershipId,
            })),
          });
          for (const project of nestedProjects(command)) {
            await transaction.learningJourneyProject.create({
              data: { learningJourneyId: path.journeyId, ...project },
            });
          }
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'learning-journey.update',
            targetType: 'LearningJourney',
            targetId: path.journeyId,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(command) },
          });
          return transaction.learningJourney.findFirstOrThrow({
            where: { id: path.journeyId, organizationId: path.organizationId },
            select: journeySelect,
          });
        });
        const data = await mappedJourney(prisma, row);
        response.json(learningJourneyMutationResponseSchema.parse({ data }));
      } catch (error) {
        next(isUniqueConflict(error) ? duplicateJourneyError() : error);
      }
    },
  );

  return router;
}
