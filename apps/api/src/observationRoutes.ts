import { Prisma, type PrismaClient } from '@prisma/client';
import type { Request, Router } from 'express';
import { Router as createRouter } from 'express';
import { z } from 'zod';
import {
  fedcObservationCompleteCommandSchema,
  fedcObservationCreateDraftCommandSchema,
  fedcObservationHistoryResponseSchema,
  fedcObservationReferenceResponseSchema,
  fedcObservationResponseSchema,
  fedcObservationSaveDraftCommandSchema,
  observationAssignmentCancelCommandSchema,
  observationAssignmentCreateCommandSchema,
  observationAssignmentMutationResponseSchema,
  observationAssignmentsResponseSchema,
  observationAssignmentUpdateCommandSchema,
  observationDefinitionCreateCommandSchema,
  observationDefinitionMutationResponseSchema,
  observationDefinitionsResponseSchema,
  observationDefinitionVersionCreateCommandSchema,
  sensoryProfileObservationCompleteCommandSchema,
  sensoryProfileObservationCreateDraftCommandSchema,
  sensoryProfileObservationHistoryResponseSchema,
  sensoryProfileObservationReferenceResponseSchema,
  sensoryProfileObservationResponseSchema,
  sensoryProfileObservationSaveDraftCommandSchema,
  sfaObservationCompleteCommandSchema,
  sfaObservationCreateDraftCommandSchema,
  sfaObservationHistoryResponseSchema,
  sfaObservationReferenceResponseSchema,
  sfaObservationResponseSchema,
  sfaObservationSaveDraftCommandSchema,
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
import { FedcScoringError, scoreFedcResponses } from './fedcScoring.js';
import { HttpError, parseRequest } from './httpErrors.js';
import {
  scoreSensoryProfileResponses,
  SensoryProfileScoringError,
} from './sensoryProfileScoring.js';
import { scoreSfaResponses, SfaScoringError } from './sfaScoring.js';
import type { SessionService } from './sessionService.js';

const eligibleAssigneeRoles = [
  'SPECIAL_ED_COORDINATOR',
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
] as const;
const serializableConflictCodes = new Set(['P2002', 'P2034']);

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

function deny(): never {
  throw new HttpError(403, 'AUTHORIZATION_DENIED', 'The request was denied.');
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

function requireObservationPermission(
  membership: MembershipScope,
  permission: 'special-ed:read' | 'special-ed:write' | 'observation:manage',
) {
  try {
    requirePermission(membership, permission);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) deny();
    throw error;
  }
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function prismaErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

const definitionSelect = {
  id: true,
  organizationId: true,
  definitionKey: true,
  version: true,
  type: true,
  title: true,
  framework: true,
  description: true,
  targetAges: true,
  defaultFrequency: true,
  body: true,
  isActive: true,
  publishedAt: true,
  createdAt: true,
} satisfies Prisma.ObservationDefinitionSelect;

type DefinitionRow = Prisma.ObservationDefinitionGetPayload<{
  select: typeof definitionSelect;
}>;

function mapDefinition(row: DefinitionRow) {
  if (!row.publishedAt) {
    throw new HttpError(
      500,
      'OBSERVATION_DEFINITION_INVALID',
      'The observation definition is not published.',
    );
  }
  return {
    ...row,
    publishedAt: row.publishedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

const assignmentSelect = {
  id: true,
  organizationId: true,
  status: true,
  academicYear: true,
  dueDate: true,
  priority: true,
  notes: true,
  assignedAt: true,
  completedAt: true,
  cancelledAt: true,
  cancellationReason: true,
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
  definition: {
    select: {
      id: true,
      definitionKey: true,
      version: true,
      type: true,
      title: true,
      body: true,
      isActive: true,
      publishedAt: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      userId: true,
      role: true,
      roleTitle: true,
      user: { select: { displayName: true } },
    },
  },
  assignedBy: { select: { id: true, displayName: true } },
  cancelledBy: { select: { id: true, displayName: true } },
  fedcObservation: { select: { id: true } },
  sensoryObservation: { select: { id: true } },
  sfaObservation: { select: { id: true } },
} satisfies Prisma.ObservationAssignmentSelect;

type AssignmentRow = Prisma.ObservationAssignmentGetPayload<{
  select: typeof assignmentSelect;
}>;

function hasObservationRecord(row: AssignmentRow): boolean {
  return Boolean(
    row.fedcObservation || row.sensoryObservation || row.sfaObservation,
  );
}

function mapAssignment(row: AssignmentRow) {
  if (!row.definition.publishedAt) {
    throw new HttpError(
      500,
      'OBSERVATION_DEFINITION_INVALID',
      'The assigned observation definition is not published.',
    );
  }
  return {
    id: row.id,
    organizationId: row.organizationId,
    status: row.status,
    academicYear: row.academicYear,
    dueDate: isoDate(row.dueDate),
    priority: row.priority,
    notes: row.notes,
    assignedAt: row.assignedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancellationReason: row.cancellationReason,
    student: row.student,
    definition: {
      ...row.definition,
      publishedAt: row.definition.publishedAt.toISOString(),
    },
    assignedTo: {
      membershipId: row.assignedTo.id,
      userId: row.assignedTo.userId,
      displayName: row.assignedTo.user.displayName,
      role: row.assignedTo.role,
      roleTitle: row.assignedTo.roleTitle,
    },
    assignedBy: row.assignedBy,
    cancelledBy: row.cancelledBy,
    hasObservationRecord: hasObservationRecord(row),
  };
}

async function validateAssignmentReferences(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  command: {
    definitionId: string;
    assignedToMembershipId: string;
    studentId: string;
    academicYear: string;
  },
) {
  const [definition, assignee, student, academicYear] = await Promise.all([
    transaction.observationDefinition.findFirst({
      where: {
        id: command.definitionId,
        organizationId,
        isActive: true,
        publishedAt: { not: null },
      },
      select: { id: true },
    }),
    transaction.membership.findFirst({
      where: {
        id: command.assignedToMembershipId,
        organizationId,
        status: 'ACTIVE',
        role: { in: [...eligibleAssigneeRoles] },
        user: { status: 'ACTIVE' },
      },
      select: { id: true },
    }),
    transaction.student.findFirst({
      where: { id: command.studentId, organizationId, status: 'ACTIVE' },
      select: { id: true },
    }),
    transaction.academicYear.findFirst({
      where: { organizationId, name: command.academicYear },
      select: { id: true },
    }),
  ]);
  if (!definition || !assignee || !student || !academicYear) {
    throw new HttpError(
      400,
      'OBSERVATION_ASSIGNMENT_REFERENCE_INVALID',
      'The assignment references are invalid or inactive.',
    );
  }
}

function definitionConflict() {
  return new HttpError(
    409,
    'OBSERVATION_DEFINITION_VERSION_CONFLICT',
    'The observation definition version could not be published concurrently.',
  );
}

function lifecycleConflict(message: string) {
  return new HttpError(409, 'OBSERVATION_ASSIGNMENT_INVALID_STATE', message);
}

function fedcLifecycleConflict(message: string) {
  return new HttpError(409, 'FEDC_OBSERVATION_INVALID_STATE', message);
}

function translateFedcScoringError(error: unknown): unknown {
  if (!(error instanceof FedcScoringError)) return error;
  return new HttpError(
    error.code === 'FEDC_DEFINITION_UNSCORABLE' ? 409 : 400,
    error.code,
    error.message,
    error.details,
  );
}

function sensoryProfileLifecycleConflict(message: string) {
  return new HttpError(
    409,
    'SENSORY_PROFILE_OBSERVATION_INVALID_STATE',
    message,
  );
}

function translateSensoryProfileScoringError(error: unknown): unknown {
  if (!(error instanceof SensoryProfileScoringError)) return error;
  return new HttpError(
    error.code === 'SENSORY_PROFILE_DEFINITION_UNSCORABLE' ? 409 : 400,
    error.code,
    error.message,
    error.details,
  );
}

function sfaLifecycleConflict(message: string) {
  return new HttpError(409, 'SFA_OBSERVATION_INVALID_STATE', message);
}

function translateSfaScoringError(error: unknown): unknown {
  if (!(error instanceof SfaScoringError)) return error;
  return new HttpError(
    error.code === 'SFA_DEFINITION_UNSCORABLE' ? 409 : 400,
    error.code,
    error.message,
    error.details,
  );
}

function canReadObservationStudent(
  membership: MembershipScope,
  studentId: string,
  observationDate: Date,
): boolean {
  if (membership.role === 'SPECIAL_ED_COORDINATOR') return true;
  return (membership.assignedStudentScopes ?? []).some(
    (scope) =>
      scope.studentId === studentId &&
      scope.startsOn <= observationDate &&
      (scope.endsOn === null || scope.endsOn >= observationDate),
  );
}

const fedcObservationSelect = {
  id: true,
  organizationId: true,
  assignmentId: true,
  studentId: true,
  definitionId: true,
  observerId: true,
  observationDate: true,
  status: true,
  responses: true,
  milestoneScores: true,
  totalScore: true,
  maxPossibleScore: true,
  notes: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
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
  observer: { select: { id: true, displayName: true } },
  definition: { select: definitionSelect },
  assignment: {
    select: {
      status: true,
      assignedTo: {
        select: { userId: true, organizationId: true, status: true },
      },
    },
  },
} satisfies Prisma.FEDCObservationSelect;

type FedcObservationRow = Prisma.FEDCObservationGetPayload<{
  select: typeof fedcObservationSelect;
}>;

function mapFedcObservation(row: FedcObservationRow) {
  const definition = mapDefinition(row.definition);
  return {
    id: row.id,
    organizationId: row.organizationId,
    assignmentId: row.assignmentId,
    studentId: row.studentId,
    definitionId: row.definitionId,
    observerId: row.observerId,
    observationDate: isoDate(row.observationDate),
    status: row.status,
    responses: row.responses,
    milestoneScores: row.milestoneScores,
    totalScore: row.totalScore,
    maxPossibleScore: row.maxPossibleScore,
    notes: row.notes,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    student: row.student,
    observer: row.observer,
    definition,
  };
}

function requireFedcRead(
  row: FedcObservationRow,
  membership: MembershipScope,
  userId: string,
) {
  if (
    row.assignment.assignedTo.userId !== userId &&
    !canReadObservationStudent(membership, row.studentId, row.observationDate)
  ) {
    deny();
  }
}

const sensoryProfileObservationSelect = {
  id: true,
  organizationId: true,
  assignmentId: true,
  studentId: true,
  definitionId: true,
  observerId: true,
  observationDate: true,
  status: true,
  teacherContactFrequency: true,
  teacherContactLength: true,
  responses: true,
  sectionScores: true,
  totalRawScore: true,
  notes: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
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
  observer: { select: { id: true, displayName: true } },
  definition: { select: definitionSelect },
  assignment: {
    select: {
      status: true,
      assignedTo: {
        select: { userId: true, organizationId: true, status: true },
      },
    },
  },
} satisfies Prisma.SensoryProfileObservationSelect;

type SensoryProfileObservationRow = Prisma.SensoryProfileObservationGetPayload<{
  select: typeof sensoryProfileObservationSelect;
}>;

function mapSensoryProfileObservation(row: SensoryProfileObservationRow) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    assignmentId: row.assignmentId,
    studentId: row.studentId,
    definitionId: row.definitionId,
    observerId: row.observerId,
    observationDate: isoDate(row.observationDate),
    status: row.status,
    teacherContactFrequency: row.teacherContactFrequency,
    teacherContactLength: row.teacherContactLength,
    responses: row.responses,
    sectionScores: row.sectionScores,
    totalRawScore: row.totalRawScore,
    notes: row.notes,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    student: row.student,
    observer: row.observer,
    definition: mapDefinition(row.definition),
  };
}

function requireSensoryProfileRead(
  row: SensoryProfileObservationRow,
  membership: MembershipScope,
  userId: string,
) {
  if (
    row.assignment.assignedTo.userId !== userId &&
    !canReadObservationStudent(membership, row.studentId, row.observationDate)
  ) {
    deny();
  }
}

const sfaObservationSelect = {
  id: true,
  organizationId: true,
  assignmentId: true,
  studentId: true,
  definitionId: true,
  observerId: true,
  assessmentDate: true,
  observationDate: true,
  status: true,
  programRecommendation: true,
  primaryLanguage: true,
  writingMethod: true,
  mobilityMethod: true,
  conditionsAffectingPerformance: true,
  respondents: true,
  participationScores: true,
  settings: true,
  taskSupports: true,
  activityPerformance: true,
  adaptations: true,
  participationAverage: true,
  totalParticipationRawScore: true,
  notes: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
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
  observer: { select: { id: true, displayName: true } },
  definition: { select: definitionSelect },
  assignment: {
    select: {
      status: true,
      assignedTo: {
        select: { userId: true, organizationId: true, status: true },
      },
    },
  },
} satisfies Prisma.SFAObservationSelect;

type SfaObservationRow = Prisma.SFAObservationGetPayload<{
  select: typeof sfaObservationSelect;
}>;

function mapSfaObservation(row: SfaObservationRow) {
  const participationScores =
    row.participationScores &&
    typeof row.participationScores === 'object' &&
    !Array.isArray(row.participationScores)
      ? (row.participationScores as Record<string, unknown>)
      : {};
  const derivedParticipationTotal = Object.values(participationScores).reduce(
    (total: number, rating) =>
      total +
      (typeof rating === 'number' && Number.isInteger(rating) ? rating : 0),
    0,
  );
  return {
    id: row.id,
    organizationId: row.organizationId,
    assignmentId: row.assignmentId,
    studentId: row.studentId,
    definitionId: row.definitionId,
    observerId: row.observerId,
    assessmentDate: isoDate(row.assessmentDate),
    observationDate: row.observationDate ? isoDate(row.observationDate) : null,
    status: row.status,
    programRecommendation: row.programRecommendation,
    primaryLanguage: row.primaryLanguage,
    writingMethod: row.writingMethod,
    mobilityMethod: row.mobilityMethod,
    conditionsAffectingPerformance: row.conditionsAffectingPerformance,
    respondents: row.respondents,
    participationScores,
    taskSupports: row.taskSupports,
    activityPerformance: row.activityPerformance,
    adaptations: row.adaptations,
    participationAverage: row.participationAverage.toNumber(),
    totalParticipationRawScore:
      row.totalParticipationRawScore ?? derivedParticipationTotal,
    notes: row.notes,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    student: row.student,
    observer: row.observer,
    definition: mapDefinition(row.definition),
  };
}

function requireSfaRead(
  row: SfaObservationRow,
  membership: MembershipScope,
  userId: string,
) {
  if (
    row.assignment.assignedTo.userId !== userId &&
    !canReadObservationStudent(membership, row.studentId, row.assessmentDate)
  ) {
    deny();
  }
}

export function createObservationRouter(
  prisma: PrismaClient,
  sessions: SessionService,
): Router {
  const router = createRouter();
  router.use(createRequiredAuthentication(sessions));

  router.get(
    '/organizations/:organizationId/observation-definitions',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema }).strict(),
          request.params,
        );
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:read');
        const rows = await prisma.observationDefinition.findMany({
          where: {
            organizationId: path.organizationId,
            publishedAt: { not: null },
          },
          orderBy: [
            { definitionKey: 'asc' },
            { version: 'desc' },
            { id: 'asc' },
          ],
          select: definitionSelect,
        });
        const data = rows.map(mapDefinition);
        response.json(
          observationDefinitionsResponseSchema.parse({
            data,
            meta: { count: data.length },
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/organizations/:organizationId/observation-definitions',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema }).strict(),
          request.params,
        );
        const command = parseRequest(
          observationDefinitionCreateCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'observation:manage');
        const row = await prisma.$transaction(async (transaction) => {
          const created = await transaction.observationDefinition.create({
            data: {
              organizationId: path.organizationId,
              definitionKey: command.definitionKey,
              version: 1,
              type: command.type,
              title: command.title,
              framework: command.framework ?? null,
              description: command.description ?? null,
              targetAges: command.targetAges ?? null,
              defaultFrequency: command.defaultFrequency ?? null,
              body: command.body as Prisma.InputJsonValue,
              isActive: command.isActive ?? true,
              publishedAt: new Date(),
            },
            select: definitionSelect,
          });
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'observation_definition.create',
            targetType: 'ObservationDefinition',
            targetId: created.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(command) },
          });
          return created;
        });
        response.status(201).json(
          observationDefinitionMutationResponseSchema.parse({
            data: mapDefinition(row),
          }),
        );
      } catch (error) {
        next(
          prismaErrorCode(error) === 'P2002'
            ? new HttpError(
                409,
                'OBSERVATION_DEFINITION_EXISTS',
                'The initial observation definition already exists.',
              )
            : error,
        );
      }
    },
  );

  router.post(
    '/organizations/:organizationId/observation-definitions/:definitionId/versions',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, definitionId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          observationDefinitionVersionCreateCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'observation:manage');
        const row = await prisma.$transaction(
          async (transaction) => {
            const source = await transaction.observationDefinition.findFirst({
              where: {
                id: path.definitionId,
                organizationId: path.organizationId,
                publishedAt: { not: null },
              },
              select: { definitionKey: true, type: true },
            });
            if (!source) deny();
            const latest = await transaction.observationDefinition.findFirst({
              where: {
                organizationId: path.organizationId,
                definitionKey: source.definitionKey,
              },
              orderBy: [{ version: 'desc' }, { id: 'desc' }],
              select: { id: true, version: true },
            });
            if (!latest || latest.id !== path.definitionId) {
              throw new HttpError(
                409,
                'OBSERVATION_DEFINITION_BASE_VERSION_CONFLICT',
                'A new version can only be published from the latest definition version.',
              );
            }
            const created = await transaction.observationDefinition.create({
              data: {
                organizationId: path.organizationId,
                definitionKey: source.definitionKey,
                version: latest.version + 1,
                type: source.type,
                title: command.title,
                framework: command.framework ?? null,
                description: command.description ?? null,
                targetAges: command.targetAges ?? null,
                defaultFrequency: command.defaultFrequency ?? null,
                body: command.body as Prisma.InputJsonValue,
                isActive: command.isActive ?? true,
                publishedAt: new Date(),
              },
              select: definitionSelect,
            });
            await createAuditRepository(transaction as PrismaClient).append({
              organizationId: path.organizationId,
              actorId: auth.userId,
              action: 'observation_definition.publish_version',
              targetType: 'ObservationDefinition',
              targetId: created.id,
              requestId: String(response.locals.requestId),
              result: 'SUCCEEDED',
              metadata: { changedFields: Object.keys(command) },
            });
            return created;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        response.status(201).json(
          observationDefinitionMutationResponseSchema.parse({
            data: mapDefinition(row),
          }),
        );
      } catch (error) {
        next(
          serializableConflictCodes.has(prismaErrorCode(error) ?? '')
            ? definitionConflict()
            : error,
        );
      }
    },
  );

  router.get(
    '/organizations/:organizationId/observation-assignments',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema }).strict(),
          request.params,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:read');
        const rows = await prisma.observationAssignment.findMany({
          where: {
            organizationId: path.organizationId,
            ...(membership.role === 'SPECIAL_ED_COORDINATOR'
              ? {}
              : {
                  assignedTo: {
                    organizationId: path.organizationId,
                    userId: auth.userId,
                    status: 'ACTIVE',
                  },
                }),
          },
          orderBy: [{ dueDate: 'asc' }, { assignedAt: 'desc' }, { id: 'asc' }],
          select: assignmentSelect,
        });
        const data = rows.map(mapAssignment);
        response.json(
          observationAssignmentsResponseSchema.parse({
            data,
            meta: { count: data.length },
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/organizations/:organizationId/observation-assignments',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema }).strict(),
          request.params,
        );
        const command = parseRequest(
          observationAssignmentCreateCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'observation:manage');
        const row = await prisma.$transaction(async (transaction) => {
          await validateAssignmentReferences(
            transaction,
            path.organizationId,
            command,
          );
          const created = await transaction.observationAssignment.create({
            data: {
              organizationId: path.organizationId,
              studentId: command.studentId,
              definitionId: command.definitionId,
              assignedToId: command.assignedToMembershipId,
              assignedById: auth.userId,
              academicYear: command.academicYear,
              dueDate: new Date(`${command.dueDate}T00:00:00.000Z`),
              priority: command.priority ?? null,
              notes: command.notes ?? null,
            },
            select: assignmentSelect,
          });
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'observation_assignment.create',
            targetType: 'ObservationAssignment',
            targetId: created.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(command) },
          });
          return created;
        });
        response.status(201).json(
          observationAssignmentMutationResponseSchema.parse({
            data: mapAssignment(row),
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/organizations/:organizationId/observation-assignments/:assignmentId',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          observationAssignmentUpdateCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'observation:manage');
        const row = await prisma.$transaction(async (transaction) => {
          const existing = await transaction.observationAssignment.findFirst({
            where: {
              id: path.assignmentId,
              organizationId: path.organizationId,
            },
            select: assignmentSelect,
          });
          if (!existing) deny();
          if (existing.status !== 'PENDING') {
            throw lifecycleConflict('Only pending assignments can be updated.');
          }
          const references = {
            definitionId: command.definitionId ?? existing.definition.id,
            assignedToMembershipId:
              command.assignedToMembershipId ?? existing.assignedTo.id,
            studentId: command.studentId ?? existing.student.id,
            academicYear: command.academicYear ?? existing.academicYear,
          };
          await validateAssignmentReferences(
            transaction,
            path.organizationId,
            references,
          );
          const updatedCount =
            await transaction.observationAssignment.updateMany({
              where: {
                id: existing.id,
                organizationId: path.organizationId,
                status: 'PENDING',
              },
              data: {
                ...(command.definitionId === undefined
                  ? {}
                  : { definitionId: command.definitionId }),
                ...(command.assignedToMembershipId === undefined
                  ? {}
                  : { assignedToId: command.assignedToMembershipId }),
                ...(command.studentId === undefined
                  ? {}
                  : { studentId: command.studentId }),
                ...(command.academicYear === undefined
                  ? {}
                  : { academicYear: command.academicYear }),
                ...(command.dueDate === undefined
                  ? {}
                  : {
                      dueDate: new Date(`${command.dueDate}T00:00:00.000Z`),
                    }),
                ...(command.priority === undefined
                  ? {}
                  : { priority: command.priority }),
                ...(command.notes === undefined
                  ? {}
                  : { notes: command.notes }),
              },
            });
          if (updatedCount.count !== 1) {
            throw lifecycleConflict('Only pending assignments can be updated.');
          }
          const updated =
            await transaction.observationAssignment.findFirstOrThrow({
              where: { id: existing.id, organizationId: path.organizationId },
              select: assignmentSelect,
            });
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'observation_assignment.update',
            targetType: 'ObservationAssignment',
            targetId: updated.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(command) },
          });
          return updated;
        });
        response.json(
          observationAssignmentMutationResponseSchema.parse({
            data: mapAssignment(row),
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/organizations/:organizationId/observation-assignments/:assignmentId/cancel',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          observationAssignmentCancelCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'observation:manage');
        const row = await prisma.$transaction(async (transaction) => {
          const existing = await transaction.observationAssignment.findFirst({
            where: {
              id: path.assignmentId,
              organizationId: path.organizationId,
            },
            select: { id: true, status: true },
          });
          if (!existing) deny();
          if (!['PENDING', 'IN_PROGRESS'].includes(existing.status)) {
            throw lifecycleConflict(
              'Only pending or in-progress assignments can be cancelled.',
            );
          }
          const updatedCount =
            await transaction.observationAssignment.updateMany({
              where: {
                id: existing.id,
                organizationId: path.organizationId,
                status: { in: ['PENDING', 'IN_PROGRESS'] },
              },
              data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelledById: auth.userId,
                cancellationReason: command.reason,
              },
            });
          if (updatedCount.count !== 1) {
            throw lifecycleConflict(
              'Only pending or in-progress assignments can be cancelled.',
            );
          }
          const updated =
            await transaction.observationAssignment.findFirstOrThrow({
              where: { id: existing.id, organizationId: path.organizationId },
              select: assignmentSelect,
            });
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'observation_assignment.cancel',
            targetType: 'ObservationAssignment',
            targetId: updated.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: {
              changedFields: [
                'status',
                'cancelledAt',
                'cancelledById',
                'cancellationReason',
              ],
            },
          });
          return updated;
        });
        response.json(
          observationAssignmentMutationResponseSchema.parse({
            data: mapAssignment(row),
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/organizations/:organizationId/observation-assignments/:assignmentId/fedc-observation',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          fedcObservationCreateDraftCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:write');
        const row = await prisma.$transaction(
          async (transaction) => {
            const assignment =
              await transaction.observationAssignment.findFirst({
                where: {
                  id: path.assignmentId,
                  organizationId: path.organizationId,
                },
                select: {
                  id: true,
                  studentId: true,
                  definitionId: true,
                  status: true,
                  assignedTo: {
                    select: {
                      userId: true,
                      status: true,
                      organizationId: true,
                    },
                  },
                  definition: {
                    select: { type: true, body: true, publishedAt: true },
                  },
                  fedcObservation: { select: { id: true } },
                },
              });
            if (!assignment) deny();
            if (
              assignment.assignedTo.userId !== auth.userId ||
              assignment.assignedTo.organizationId !== path.organizationId ||
              assignment.assignedTo.status !== 'ACTIVE'
            ) {
              deny();
            }
            if (
              assignment.definition.type !== 'FEDC' ||
              !assignment.definition.publishedAt
            ) {
              throw new HttpError(
                409,
                'FEDC_DEFINITION_UNSCORABLE',
                'The assignment does not reference a published FEDC definition.',
              );
            }
            if (assignment.status !== 'PENDING' || assignment.fedcObservation) {
              throw fedcLifecycleConflict(
                'A FEDC draft can only be created once for a pending assignment.',
              );
            }
            const scored = scoreFedcResponses({
              definitionBody: assignment.definition.body,
              responses: command.responses ?? {},
              requireComplete: false,
            });
            const created = await transaction.fEDCObservation.create({
              data: {
                organizationId: path.organizationId,
                assignmentId: assignment.id,
                studentId: assignment.studentId,
                definitionId: assignment.definitionId,
                observerId: auth.userId,
                observationDate: new Date(
                  `${command.observationDate}T00:00:00.000Z`,
                ),
                status: 'IN_PROGRESS',
                responses: scored.responses as Prisma.InputJsonValue,
                milestoneScores:
                  scored.milestoneScores as Prisma.InputJsonValue,
                totalScore: scored.totalScore,
                maxPossibleScore: scored.maxPossibleScore,
                notes: command.notes ?? null,
              },
              select: fedcObservationSelect,
            });
            const assignmentUpdate =
              await transaction.observationAssignment.updateMany({
                where: {
                  id: assignment.id,
                  organizationId: path.organizationId,
                  status: 'PENDING',
                },
                data: { status: 'IN_PROGRESS' },
              });
            if (assignmentUpdate.count !== 1) {
              throw fedcLifecycleConflict(
                'The assignment is no longer pending.',
              );
            }
            await createAuditRepository(transaction as PrismaClient).append({
              organizationId: path.organizationId,
              actorId: auth.userId,
              action: 'fedc_observation.create_draft',
              targetType: 'FEDCObservation',
              targetId: created.id,
              requestId: String(response.locals.requestId),
              result: 'SUCCEEDED',
              metadata: {
                changedFields: [
                  'observationDate',
                  'responses',
                  'notes',
                  'status',
                ],
              },
            });
            return created;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        response.status(201).json(
          fedcObservationResponseSchema.parse({
            data: mapFedcObservation(row),
          }),
        );
      } catch (error) {
        const translated = translateFedcScoringError(error);
        next(
          serializableConflictCodes.has(prismaErrorCode(translated) ?? '')
            ? fedcLifecycleConflict(
                'The FEDC draft could not be created concurrently.',
              )
            : translated,
        );
      }
    },
  );

  router.put(
    '/organizations/:organizationId/observation-assignments/:assignmentId/fedc-observation',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          fedcObservationSaveDraftCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:write');
        const row = await prisma.$transaction(async (transaction) => {
          const existing = await transaction.fEDCObservation.findFirst({
            where: {
              assignmentId: path.assignmentId,
              organizationId: path.organizationId,
            },
            select: fedcObservationSelect,
          });
          if (!existing) deny();
          if (
            existing.assignment.assignedTo.userId !== auth.userId ||
            existing.assignment.assignedTo.status !== 'ACTIVE'
          ) {
            deny();
          }
          if (
            existing.status !== 'IN_PROGRESS' ||
            existing.assignment.status !== 'IN_PROGRESS'
          ) {
            throw fedcLifecycleConflict(
              'Only an in-progress FEDC observation with an in-progress assignment can be saved.',
            );
          }
          const scored = scoreFedcResponses({
            definitionBody: existing.definition.body,
            responses: command.responses,
            requireComplete: false,
          });
          const updated = await transaction.fEDCObservation.updateMany({
            where: {
              id: existing.id,
              organizationId: path.organizationId,
              status: 'IN_PROGRESS',
            },
            data: {
              observationDate: new Date(
                `${command.observationDate}T00:00:00.000Z`,
              ),
              responses: scored.responses as Prisma.InputJsonValue,
              milestoneScores: scored.milestoneScores as Prisma.InputJsonValue,
              totalScore: scored.totalScore,
              maxPossibleScore: scored.maxPossibleScore,
              notes: command.notes ?? null,
            },
          });
          if (updated.count !== 1) {
            throw fedcLifecycleConflict(
              'Only an in-progress FEDC observation can be saved.',
            );
          }
          const saved = await transaction.fEDCObservation.findFirstOrThrow({
            where: { id: existing.id, organizationId: path.organizationId },
            select: fedcObservationSelect,
          });
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'fedc_observation.save_draft',
            targetType: 'FEDCObservation',
            targetId: saved.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: {
              changedFields: ['observationDate', 'responses', 'notes'],
            },
          });
          return saved;
        });
        response.json(
          fedcObservationResponseSchema.parse({
            data: mapFedcObservation(row),
          }),
        );
      } catch (error) {
        next(translateFedcScoringError(error));
      }
    },
  );

  router.post(
    '/organizations/:organizationId/observation-assignments/:assignmentId/fedc-observation/complete',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          fedcObservationCompleteCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:write');
        const row = await prisma.$transaction(async (transaction) => {
          const existing = await transaction.fEDCObservation.findFirst({
            where: {
              assignmentId: path.assignmentId,
              organizationId: path.organizationId,
            },
            select: fedcObservationSelect,
          });
          if (!existing) deny();
          if (
            existing.assignment.assignedTo.userId !== auth.userId ||
            existing.assignment.assignedTo.status !== 'ACTIVE'
          ) {
            deny();
          }
          if (
            existing.status !== 'IN_PROGRESS' ||
            existing.assignment.status !== 'IN_PROGRESS'
          ) {
            throw fedcLifecycleConflict(
              'Only an in-progress FEDC observation with an in-progress assignment can be completed.',
            );
          }
          const scored = scoreFedcResponses({
            definitionBody: existing.definition.body,
            responses: command.responses,
            requireComplete: true,
          });
          const completedAt = new Date();
          const updated = await transaction.fEDCObservation.updateMany({
            where: {
              id: existing.id,
              organizationId: path.organizationId,
              status: 'IN_PROGRESS',
            },
            data: {
              observationDate: new Date(
                `${command.observationDate}T00:00:00.000Z`,
              ),
              status: 'COMPLETED',
              responses: scored.responses as Prisma.InputJsonValue,
              milestoneScores: scored.milestoneScores as Prisma.InputJsonValue,
              totalScore: scored.totalScore,
              maxPossibleScore: scored.maxPossibleScore,
              notes: command.notes ?? null,
              completedAt,
            },
          });
          if (updated.count !== 1) {
            throw fedcLifecycleConflict(
              'Only an in-progress FEDC observation can be completed.',
            );
          }
          const assignmentUpdate =
            await transaction.observationAssignment.updateMany({
              where: {
                id: path.assignmentId,
                organizationId: path.organizationId,
                status: 'IN_PROGRESS',
              },
              data: { status: 'COMPLETED', completedAt },
            });
          if (assignmentUpdate.count !== 1) {
            throw fedcLifecycleConflict(
              'The assignment is no longer in progress.',
            );
          }
          const completed = await transaction.fEDCObservation.findFirstOrThrow({
            where: { id: existing.id, organizationId: path.organizationId },
            select: fedcObservationSelect,
          });
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'fedc_observation.complete',
            targetType: 'FEDCObservation',
            targetId: completed.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: {
              changedFields: [
                'observationDate',
                'responses',
                'notes',
                'status',
                'completedAt',
              ],
            },
          });
          return completed;
        });
        response.json(
          fedcObservationResponseSchema.parse({
            data: mapFedcObservation(row),
          }),
        );
      } catch (error) {
        next(translateFedcScoringError(error));
      }
    },
  );

  router.get(
    '/organizations/:organizationId/observation-assignments/:assignmentId/fedc-observation',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:read');
        const row = await prisma.fEDCObservation.findFirst({
          where: {
            assignmentId: path.assignmentId,
            organizationId: path.organizationId,
          },
          select: fedcObservationSelect,
        });
        if (!row) deny();
        requireFedcRead(row, membership, auth.userId);
        response.json(
          fedcObservationResponseSchema.parse({
            data: mapFedcObservation(row),
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/students/:studentId/fedc-observations',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, studentId: uuidSchema })
            .strict(),
          request.params,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:read');
        const rows = await prisma.fEDCObservation.findMany({
          where: {
            organizationId: path.organizationId,
            studentId: path.studentId,
          },
          orderBy: [
            { observationDate: 'desc' },
            { completedAt: 'desc' },
            { createdAt: 'desc' },
            { id: 'asc' },
          ],
          select: fedcObservationSelect,
        });
        const canReadEmptyStudent =
          membership.role === 'SPECIAL_ED_COORDINATOR' ||
          (membership.assignedStudentScopes ?? []).some(
            (scope) => scope.studentId === path.studentId,
          ) ||
          (membership.observationAssignedStudentIds ?? []).includes(
            path.studentId,
          );
        const visibleRows = rows.filter(
          (row) =>
            row.assignment.assignedTo.userId === auth.userId ||
            canReadObservationStudent(
              membership,
              row.studentId,
              row.observationDate,
            ),
        );
        if (!canReadEmptyStudent && visibleRows.length === 0) deny();
        const data = visibleRows.map(mapFedcObservation);
        response.json(
          fedcObservationHistoryResponseSchema.parse({
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
    '/organizations/:organizationId/students/:studentId/fedc-observations/reference',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, studentId: uuidSchema })
            .strict(),
          request.params,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:read');
        const rows = await prisma.fEDCObservation.findMany({
          where: {
            organizationId: path.organizationId,
            studentId: path.studentId,
            status: 'COMPLETED',
          },
          orderBy: [
            { observationDate: 'desc' },
            { completedAt: 'desc' },
            { createdAt: 'desc' },
            { id: 'asc' },
          ],
          select: fedcObservationSelect,
        });
        const row = rows.find(
          (candidate) =>
            candidate.assignment.assignedTo.userId === auth.userId ||
            canReadObservationStudent(
              membership,
              candidate.studentId,
              candidate.observationDate,
            ),
        );
        const canReadEmptyStudent =
          membership.role === 'SPECIAL_ED_COORDINATOR' ||
          (membership.assignedStudentScopes ?? []).some(
            (scope) => scope.studentId === path.studentId,
          ) ||
          (membership.observationAssignedStudentIds ?? []).includes(
            path.studentId,
          );
        if (!row && !canReadEmptyStudent) deny();
        response.json(
          fedcObservationReferenceResponseSchema.parse({
            data: row ? mapFedcObservation(row) : null,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/organizations/:organizationId/observation-assignments/:assignmentId/sensory-profile-observation',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          sensoryProfileObservationCreateDraftCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:write');
        const row = await prisma.$transaction(
          async (transaction) => {
            const assignment =
              await transaction.observationAssignment.findFirst({
                where: {
                  id: path.assignmentId,
                  organizationId: path.organizationId,
                },
                select: {
                  id: true,
                  studentId: true,
                  definitionId: true,
                  status: true,
                  assignedTo: {
                    select: {
                      userId: true,
                      status: true,
                      organizationId: true,
                    },
                  },
                  definition: {
                    select: { type: true, body: true, publishedAt: true },
                  },
                  sensoryObservation: { select: { id: true } },
                },
              });
            if (!assignment) deny();
            if (
              assignment.assignedTo.userId !== auth.userId ||
              assignment.assignedTo.organizationId !== path.organizationId ||
              assignment.assignedTo.status !== 'ACTIVE'
            ) {
              deny();
            }
            if (
              assignment.definition.type !== 'SENSORY_PROFILE' ||
              !assignment.definition.publishedAt
            ) {
              throw new HttpError(
                409,
                'SENSORY_PROFILE_DEFINITION_UNSCORABLE',
                'The assignment does not reference a published Sensory Profile definition.',
              );
            }
            if (
              assignment.status !== 'PENDING' ||
              assignment.sensoryObservation
            ) {
              throw sensoryProfileLifecycleConflict(
                'A Sensory Profile draft can only be created once for a pending assignment.',
              );
            }
            const scored = scoreSensoryProfileResponses({
              definitionBody: assignment.definition.body,
              responses: command.responses ?? {},
              requireComplete: false,
            });
            const created = await transaction.sensoryProfileObservation.create({
              data: {
                organizationId: path.organizationId,
                assignmentId: assignment.id,
                studentId: assignment.studentId,
                definitionId: assignment.definitionId,
                observerId: auth.userId,
                observationDate: new Date(
                  `${command.observationDate}T00:00:00.000Z`,
                ),
                status: 'IN_PROGRESS',
                teacherContactFrequency:
                  command.teacherContactFrequency ?? null,
                teacherContactLength: command.teacherContactLength ?? null,
                responses: scored.responses as Prisma.InputJsonValue,
                sectionScores: scored.sectionScores as Prisma.InputJsonValue,
                totalRawScore: scored.totalRawScore,
                notes: command.notes ?? null,
              },
              select: sensoryProfileObservationSelect,
            });
            const assignmentUpdate =
              await transaction.observationAssignment.updateMany({
                where: {
                  id: assignment.id,
                  organizationId: path.organizationId,
                  status: 'PENDING',
                },
                data: { status: 'IN_PROGRESS' },
              });
            if (assignmentUpdate.count !== 1) {
              throw sensoryProfileLifecycleConflict(
                'The assignment is no longer pending.',
              );
            }
            await createAuditRepository(transaction as PrismaClient).append({
              organizationId: path.organizationId,
              actorId: auth.userId,
              action: 'sensory_profile_observation.create_draft',
              targetType: 'SensoryProfileObservation',
              targetId: created.id,
              requestId: String(response.locals.requestId),
              result: 'SUCCEEDED',
              metadata: {
                changedFields: [
                  'observationDate',
                  'teacherContactFrequency',
                  'teacherContactLength',
                  'responses',
                  'notes',
                  'status',
                ],
              },
            });
            return created;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        response.status(201).json(
          sensoryProfileObservationResponseSchema.parse({
            data: mapSensoryProfileObservation(row),
          }),
        );
      } catch (error) {
        const translated = translateSensoryProfileScoringError(error);
        next(
          serializableConflictCodes.has(prismaErrorCode(translated) ?? '')
            ? sensoryProfileLifecycleConflict(
                'The Sensory Profile draft could not be created concurrently.',
              )
            : translated,
        );
      }
    },
  );

  router.put(
    '/organizations/:organizationId/observation-assignments/:assignmentId/sensory-profile-observation',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          sensoryProfileObservationSaveDraftCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:write');
        const row = await prisma.$transaction(async (transaction) => {
          const existing =
            await transaction.sensoryProfileObservation.findFirst({
              where: {
                assignmentId: path.assignmentId,
                organizationId: path.organizationId,
              },
              select: sensoryProfileObservationSelect,
            });
          if (!existing) deny();
          if (
            existing.assignment.assignedTo.userId !== auth.userId ||
            existing.assignment.assignedTo.status !== 'ACTIVE'
          ) {
            deny();
          }
          if (
            existing.status !== 'IN_PROGRESS' ||
            existing.assignment.status !== 'IN_PROGRESS'
          ) {
            throw sensoryProfileLifecycleConflict(
              'Only an in-progress Sensory Profile observation with an in-progress assignment can be saved.',
            );
          }
          const scored = scoreSensoryProfileResponses({
            definitionBody: existing.definition.body,
            responses: command.responses,
            requireComplete: false,
          });
          const updated =
            await transaction.sensoryProfileObservation.updateMany({
              where: {
                id: existing.id,
                organizationId: path.organizationId,
                status: 'IN_PROGRESS',
              },
              data: {
                observationDate: new Date(
                  `${command.observationDate}T00:00:00.000Z`,
                ),
                teacherContactFrequency:
                  command.teacherContactFrequency ?? null,
                teacherContactLength: command.teacherContactLength ?? null,
                responses: scored.responses as Prisma.InputJsonValue,
                sectionScores: scored.sectionScores as Prisma.InputJsonValue,
                totalRawScore: scored.totalRawScore,
                notes: command.notes ?? null,
              },
            });
          if (updated.count !== 1) {
            throw sensoryProfileLifecycleConflict(
              'Only an in-progress Sensory Profile observation can be saved.',
            );
          }
          const saved =
            await transaction.sensoryProfileObservation.findFirstOrThrow({
              where: { id: existing.id, organizationId: path.organizationId },
              select: sensoryProfileObservationSelect,
            });
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'sensory_profile_observation.save_draft',
            targetType: 'SensoryProfileObservation',
            targetId: saved.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: {
              changedFields: [
                'observationDate',
                'teacherContactFrequency',
                'teacherContactLength',
                'responses',
                'notes',
              ],
            },
          });
          return saved;
        });
        response.json(
          sensoryProfileObservationResponseSchema.parse({
            data: mapSensoryProfileObservation(row),
          }),
        );
      } catch (error) {
        next(translateSensoryProfileScoringError(error));
      }
    },
  );

  router.post(
    '/organizations/:organizationId/observation-assignments/:assignmentId/sensory-profile-observation/complete',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          sensoryProfileObservationCompleteCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:write');
        const row = await prisma.$transaction(async (transaction) => {
          const existing =
            await transaction.sensoryProfileObservation.findFirst({
              where: {
                assignmentId: path.assignmentId,
                organizationId: path.organizationId,
              },
              select: sensoryProfileObservationSelect,
            });
          if (!existing) deny();
          if (
            existing.assignment.assignedTo.userId !== auth.userId ||
            existing.assignment.assignedTo.status !== 'ACTIVE'
          ) {
            deny();
          }
          if (
            existing.status !== 'IN_PROGRESS' ||
            existing.assignment.status !== 'IN_PROGRESS'
          ) {
            throw sensoryProfileLifecycleConflict(
              'Only an in-progress Sensory Profile observation with an in-progress assignment can be completed.',
            );
          }
          const scored = scoreSensoryProfileResponses({
            definitionBody: existing.definition.body,
            responses: command.responses,
            requireComplete: true,
          });
          const completedAt = new Date();
          const updated =
            await transaction.sensoryProfileObservation.updateMany({
              where: {
                id: existing.id,
                organizationId: path.organizationId,
                status: 'IN_PROGRESS',
              },
              data: {
                observationDate: new Date(
                  `${command.observationDate}T00:00:00.000Z`,
                ),
                status: 'COMPLETED',
                teacherContactFrequency:
                  command.teacherContactFrequency ?? null,
                teacherContactLength: command.teacherContactLength ?? null,
                responses: scored.responses as Prisma.InputJsonValue,
                sectionScores: scored.sectionScores as Prisma.InputJsonValue,
                totalRawScore: scored.totalRawScore,
                notes: command.notes ?? null,
                completedAt,
              },
            });
          if (updated.count !== 1) {
            throw sensoryProfileLifecycleConflict(
              'Only an in-progress Sensory Profile observation can be completed.',
            );
          }
          const assignmentUpdate =
            await transaction.observationAssignment.updateMany({
              where: {
                id: path.assignmentId,
                organizationId: path.organizationId,
                status: 'IN_PROGRESS',
              },
              data: { status: 'COMPLETED', completedAt },
            });
          if (assignmentUpdate.count !== 1) {
            throw sensoryProfileLifecycleConflict(
              'The assignment is no longer in progress.',
            );
          }
          const completed =
            await transaction.sensoryProfileObservation.findFirstOrThrow({
              where: { id: existing.id, organizationId: path.organizationId },
              select: sensoryProfileObservationSelect,
            });
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'sensory_profile_observation.complete',
            targetType: 'SensoryProfileObservation',
            targetId: completed.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: {
              changedFields: [
                'observationDate',
                'teacherContactFrequency',
                'teacherContactLength',
                'responses',
                'notes',
                'status',
                'completedAt',
              ],
            },
          });
          return completed;
        });
        response.json(
          sensoryProfileObservationResponseSchema.parse({
            data: mapSensoryProfileObservation(row),
          }),
        );
      } catch (error) {
        next(translateSensoryProfileScoringError(error));
      }
    },
  );

  router.get(
    '/organizations/:organizationId/observation-assignments/:assignmentId/sensory-profile-observation',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:read');
        const row = await prisma.sensoryProfileObservation.findFirst({
          where: {
            assignmentId: path.assignmentId,
            organizationId: path.organizationId,
          },
          select: sensoryProfileObservationSelect,
        });
        if (!row) deny();
        requireSensoryProfileRead(row, membership, auth.userId);
        response.json(
          sensoryProfileObservationResponseSchema.parse({
            data: mapSensoryProfileObservation(row),
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/students/:studentId/sensory-profile-observations',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, studentId: uuidSchema })
            .strict(),
          request.params,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:read');
        const rows = await prisma.sensoryProfileObservation.findMany({
          where: {
            organizationId: path.organizationId,
            studentId: path.studentId,
          },
          orderBy: [
            { observationDate: 'desc' },
            { completedAt: 'desc' },
            { createdAt: 'desc' },
            { id: 'asc' },
          ],
          select: sensoryProfileObservationSelect,
        });
        const canReadEmptyStudent =
          membership.role === 'SPECIAL_ED_COORDINATOR' ||
          (membership.assignedStudentScopes ?? []).some(
            (scope) => scope.studentId === path.studentId,
          ) ||
          (membership.observationAssignedStudentIds ?? []).includes(
            path.studentId,
          );
        const visibleRows = rows.filter(
          (row) =>
            row.assignment.assignedTo.userId === auth.userId ||
            canReadObservationStudent(
              membership,
              row.studentId,
              row.observationDate,
            ),
        );
        if (!canReadEmptyStudent && visibleRows.length === 0) deny();
        const data = visibleRows.map(mapSensoryProfileObservation);
        response.json(
          sensoryProfileObservationHistoryResponseSchema.parse({
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
    '/organizations/:organizationId/students/:studentId/sensory-profile-observations/reference',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, studentId: uuidSchema })
            .strict(),
          request.params,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:read');
        const rows = await prisma.sensoryProfileObservation.findMany({
          where: {
            organizationId: path.organizationId,
            studentId: path.studentId,
            status: 'COMPLETED',
          },
          orderBy: [
            { observationDate: 'desc' },
            { completedAt: 'desc' },
            { createdAt: 'desc' },
            { id: 'asc' },
          ],
          select: sensoryProfileObservationSelect,
        });
        const row = rows.find(
          (candidate) =>
            candidate.assignment.assignedTo.userId === auth.userId ||
            canReadObservationStudent(
              membership,
              candidate.studentId,
              candidate.observationDate,
            ),
        );
        const canReadEmptyStudent =
          membership.role === 'SPECIAL_ED_COORDINATOR' ||
          (membership.assignedStudentScopes ?? []).some(
            (scope) => scope.studentId === path.studentId,
          ) ||
          (membership.observationAssignedStudentIds ?? []).includes(
            path.studentId,
          );
        if (!row && !canReadEmptyStudent) deny();
        response.json(
          sensoryProfileObservationReferenceResponseSchema.parse({
            data: row ? mapSensoryProfileObservation(row) : null,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/organizations/:organizationId/observation-assignments/:assignmentId/sfa-observation',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          sfaObservationCreateDraftCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:write');
        const row = await prisma.$transaction(
          async (transaction) => {
            const assignment =
              await transaction.observationAssignment.findFirst({
                where: {
                  id: path.assignmentId,
                  organizationId: path.organizationId,
                },
                select: {
                  id: true,
                  studentId: true,
                  definitionId: true,
                  status: true,
                  assignedTo: {
                    select: {
                      userId: true,
                      status: true,
                      organizationId: true,
                    },
                  },
                  definition: {
                    select: { type: true, body: true, publishedAt: true },
                  },
                  sfaObservation: { select: { id: true } },
                },
              });
            if (!assignment) deny();
            if (
              assignment.assignedTo.userId !== auth.userId ||
              assignment.assignedTo.organizationId !== path.organizationId ||
              assignment.assignedTo.status !== 'ACTIVE'
            ) {
              deny();
            }
            if (
              assignment.definition.type !== 'SFA' ||
              !assignment.definition.publishedAt
            ) {
              throw new HttpError(
                409,
                'SFA_DEFINITION_UNSCORABLE',
                'The assignment does not reference a published SFA definition.',
              );
            }
            if (assignment.status !== 'PENDING' || assignment.sfaObservation) {
              throw sfaLifecycleConflict(
                'An SFA draft can only be created once for a pending assignment.',
              );
            }
            const scored = scoreSfaResponses({
              definitionBody: assignment.definition.body,
              participationScores: command.participationScores ?? {},
              taskSupports: command.taskSupports ?? {},
              activityPerformance: command.activityPerformance ?? {},
              adaptations: command.adaptations ?? [],
              respondents: command.respondents ?? [],
              programRecommendation: command.programRecommendation,
              assessmentDate: command.assessmentDate,
              requireComplete: false,
            });
            const created = await transaction.sFAObservation.create({
              data: {
                organizationId: path.organizationId,
                assignmentId: assignment.id,
                studentId: assignment.studentId,
                definitionId: assignment.definitionId,
                observerId: auth.userId,
                assessmentDate: new Date(
                  `${command.assessmentDate}T00:00:00.000Z`,
                ),
                observationDate: command.observationDate
                  ? new Date(`${command.observationDate}T00:00:00.000Z`)
                  : null,
                status: 'IN_PROGRESS',
                programRecommendation: command.programRecommendation,
                primaryLanguage: command.primaryLanguage ?? null,
                writingMethod: command.writingMethod ?? null,
                mobilityMethod: command.mobilityMethod ?? null,
                conditionsAffectingPerformance:
                  command.conditionsAffectingPerformance ?? null,
                respondents: scored.respondents as Prisma.InputJsonValue,
                participationScores:
                  scored.participationScores as Prisma.InputJsonValue,
                settings: Prisma.JsonNull,
                taskSupports: scored.taskSupports as Prisma.InputJsonValue,
                activityPerformance:
                  scored.activityPerformance as Prisma.InputJsonValue,
                adaptations: scored.adaptations as Prisma.InputJsonValue,
                participationAverage: new Prisma.Decimal(
                  scored.participationAverage,
                ),
                totalParticipationRawScore: scored.totalParticipationRawScore,
                notes: command.notes ?? null,
              },
              select: sfaObservationSelect,
            });
            const assignmentUpdate =
              await transaction.observationAssignment.updateMany({
                where: {
                  id: assignment.id,
                  organizationId: path.organizationId,
                  status: 'PENDING',
                },
                data: { status: 'IN_PROGRESS' },
              });
            if (assignmentUpdate.count !== 1) {
              throw sfaLifecycleConflict(
                'The assignment is no longer pending.',
              );
            }
            await createAuditRepository(transaction as PrismaClient).append({
              organizationId: path.organizationId,
              actorId: auth.userId,
              action: 'sfa_observation.create_draft',
              targetType: 'SFAObservation',
              targetId: created.id,
              requestId: String(response.locals.requestId),
              result: 'SUCCEEDED',
              metadata: {
                changedFields: [
                  'assessmentDate',
                  'observationDate',
                  'programRecommendation',
                  'primaryLanguage',
                  'writingMethod',
                  'mobilityMethod',
                  'conditionsAffectingPerformance',
                  'respondents',
                  'participationScores',
                  'settings',
                  'taskSupports',
                  'activityPerformance',
                  'adaptations',
                  'notes',
                  'status',
                ],
              },
            });
            return created;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        response.status(201).json(
          sfaObservationResponseSchema.parse({
            data: mapSfaObservation(row),
          }),
        );
      } catch (error) {
        const translated = translateSfaScoringError(error);
        next(
          serializableConflictCodes.has(prismaErrorCode(translated) ?? '')
            ? sfaLifecycleConflict(
                'The SFA draft could not be created concurrently.',
              )
            : translated,
        );
      }
    },
  );

  router.put(
    '/organizations/:organizationId/observation-assignments/:assignmentId/sfa-observation',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          sfaObservationSaveDraftCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:write');
        const row = await prisma.$transaction(async (transaction) => {
          const lockedAssignments = await transaction.$queryRaw<
            Array<{ status: string }>
          >(Prisma.sql`
            SELECT status::text AS status
            FROM "ObservationAssignment"
            WHERE id = ${path.assignmentId}::uuid
              AND "organizationId" = ${path.organizationId}::uuid
            FOR UPDATE
          `);
          if (lockedAssignments[0]?.status !== 'IN_PROGRESS') {
            throw sfaLifecycleConflict(
              'Only an in-progress SFA observation with an in-progress assignment can be saved.',
            );
          }
          const existing = await transaction.sFAObservation.findFirst({
            where: {
              assignmentId: path.assignmentId,
              organizationId: path.organizationId,
            },
            select: sfaObservationSelect,
          });
          if (!existing) deny();
          if (
            existing.assignment.assignedTo.userId !== auth.userId ||
            existing.assignment.assignedTo.organizationId !==
              path.organizationId ||
            existing.assignment.assignedTo.status !== 'ACTIVE'
          ) {
            deny();
          }
          if (
            existing.status !== 'IN_PROGRESS' ||
            existing.assignment.status !== 'IN_PROGRESS'
          ) {
            throw sfaLifecycleConflict(
              'Only an in-progress SFA observation with an in-progress assignment can be saved.',
            );
          }
          const scored = scoreSfaResponses({
            definitionBody: existing.definition.body,
            participationScores: command.participationScores,
            taskSupports: command.taskSupports,
            activityPerformance: command.activityPerformance,
            adaptations: command.adaptations,
            respondents: command.respondents,
            programRecommendation: command.programRecommendation,
            assessmentDate: command.assessmentDate,
            requireComplete: false,
          });
          const updated = await transaction.sFAObservation.updateMany({
            where: {
              id: existing.id,
              organizationId: path.organizationId,
              status: 'IN_PROGRESS',
            },
            data: {
              assessmentDate: new Date(
                `${command.assessmentDate}T00:00:00.000Z`,
              ),
              observationDate: command.observationDate
                ? new Date(`${command.observationDate}T00:00:00.000Z`)
                : null,
              programRecommendation: command.programRecommendation,
              primaryLanguage: command.primaryLanguage ?? null,
              writingMethod: command.writingMethod ?? null,
              mobilityMethod: command.mobilityMethod ?? null,
              conditionsAffectingPerformance:
                command.conditionsAffectingPerformance ?? null,
              respondents: scored.respondents as Prisma.InputJsonValue,
              participationScores:
                scored.participationScores as Prisma.InputJsonValue,
              taskSupports: scored.taskSupports as Prisma.InputJsonValue,
              activityPerformance:
                scored.activityPerformance as Prisma.InputJsonValue,
              adaptations: scored.adaptations as Prisma.InputJsonValue,
              participationAverage: new Prisma.Decimal(
                scored.participationAverage,
              ),
              totalParticipationRawScore: scored.totalParticipationRawScore,
              notes: command.notes ?? null,
            },
          });
          if (updated.count !== 1) {
            throw sfaLifecycleConflict(
              'Only an in-progress SFA observation can be saved.',
            );
          }
          const saved = await transaction.sFAObservation.findFirstOrThrow({
            where: { id: existing.id, organizationId: path.organizationId },
            select: sfaObservationSelect,
          });
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'sfa_observation.save_draft',
            targetType: 'SFAObservation',
            targetId: saved.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: {
              changedFields: [
                'assessmentDate',
                'observationDate',
                'programRecommendation',
                'primaryLanguage',
                'writingMethod',
                'mobilityMethod',
                'conditionsAffectingPerformance',
                'respondents',
                'participationScores',
                'taskSupports',
                'activityPerformance',
                'adaptations',
                'notes',
              ],
            },
          });
          return saved;
        });
        response.json(
          sfaObservationResponseSchema.parse({ data: mapSfaObservation(row) }),
        );
      } catch (error) {
        next(translateSfaScoringError(error));
      }
    },
  );

  router.post(
    '/organizations/:organizationId/observation-assignments/:assignmentId/sfa-observation/complete',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          sfaObservationCompleteCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:write');
        const row = await prisma.$transaction(async (transaction) => {
          const existing = await transaction.sFAObservation.findFirst({
            where: {
              assignmentId: path.assignmentId,
              organizationId: path.organizationId,
            },
            select: sfaObservationSelect,
          });
          if (!existing) deny();
          if (
            existing.assignment.assignedTo.userId !== auth.userId ||
            existing.assignment.assignedTo.organizationId !==
              path.organizationId ||
            existing.assignment.assignedTo.status !== 'ACTIVE'
          ) {
            deny();
          }
          if (
            existing.status !== 'IN_PROGRESS' ||
            existing.assignment.status !== 'IN_PROGRESS'
          ) {
            throw sfaLifecycleConflict(
              'Only an in-progress SFA observation with an in-progress assignment can be completed.',
            );
          }
          const scored = scoreSfaResponses({
            definitionBody: existing.definition.body,
            participationScores: command.participationScores,
            taskSupports: command.taskSupports,
            activityPerformance: command.activityPerformance,
            adaptations: command.adaptations,
            respondents: command.respondents,
            programRecommendation: command.programRecommendation,
            assessmentDate: command.assessmentDate,
            requireComplete: true,
          });
          const completedAt = new Date();
          const updated = await transaction.sFAObservation.updateMany({
            where: {
              id: existing.id,
              organizationId: path.organizationId,
              status: 'IN_PROGRESS',
            },
            data: {
              assessmentDate: new Date(
                `${command.assessmentDate}T00:00:00.000Z`,
              ),
              observationDate: command.observationDate
                ? new Date(`${command.observationDate}T00:00:00.000Z`)
                : null,
              status: 'COMPLETED',
              programRecommendation: command.programRecommendation,
              primaryLanguage: command.primaryLanguage ?? null,
              writingMethod: command.writingMethod ?? null,
              mobilityMethod: command.mobilityMethod ?? null,
              conditionsAffectingPerformance:
                command.conditionsAffectingPerformance ?? null,
              respondents: scored.respondents as Prisma.InputJsonValue,
              participationScores:
                scored.participationScores as Prisma.InputJsonValue,
              taskSupports: scored.taskSupports as Prisma.InputJsonValue,
              activityPerformance:
                scored.activityPerformance as Prisma.InputJsonValue,
              adaptations: scored.adaptations as Prisma.InputJsonValue,
              participationAverage: new Prisma.Decimal(
                scored.participationAverage,
              ),
              totalParticipationRawScore: scored.totalParticipationRawScore,
              notes: command.notes ?? null,
              completedAt,
            },
          });
          if (updated.count !== 1) {
            throw sfaLifecycleConflict(
              'Only an in-progress SFA observation can be completed.',
            );
          }
          const assignmentUpdate =
            await transaction.observationAssignment.updateMany({
              where: {
                id: path.assignmentId,
                organizationId: path.organizationId,
                status: 'IN_PROGRESS',
              },
              data: { status: 'COMPLETED', completedAt },
            });
          if (assignmentUpdate.count !== 1) {
            throw sfaLifecycleConflict(
              'The assignment is no longer in progress.',
            );
          }
          const completed = await transaction.sFAObservation.findFirstOrThrow({
            where: { id: existing.id, organizationId: path.organizationId },
            select: sfaObservationSelect,
          });
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'sfa_observation.complete',
            targetType: 'SFAObservation',
            targetId: completed.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: {
              changedFields: [
                'assessmentDate',
                'observationDate',
                'programRecommendation',
                'primaryLanguage',
                'writingMethod',
                'mobilityMethod',
                'conditionsAffectingPerformance',
                'respondents',
                'participationScores',
                'taskSupports',
                'activityPerformance',
                'adaptations',
                'notes',
                'status',
                'completedAt',
              ],
            },
          });
          return completed;
        });
        response.json(
          sfaObservationResponseSchema.parse({ data: mapSfaObservation(row) }),
        );
      } catch (error) {
        next(translateSfaScoringError(error));
      }
    },
  );

  router.get(
    '/organizations/:organizationId/observation-assignments/:assignmentId/sfa-observation',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:read');
        const row = await prisma.sFAObservation.findFirst({
          where: {
            assignmentId: path.assignmentId,
            organizationId: path.organizationId,
          },
          select: sfaObservationSelect,
        });
        if (!row) deny();
        requireSfaRead(row, membership, auth.userId);
        response.json(
          sfaObservationResponseSchema.parse({ data: mapSfaObservation(row) }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/students/:studentId/sfa-observations',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, studentId: uuidSchema })
            .strict(),
          request.params,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:read');
        const rows = await prisma.sFAObservation.findMany({
          where: {
            organizationId: path.organizationId,
            studentId: path.studentId,
          },
          orderBy: [
            { assessmentDate: 'desc' },
            { completedAt: 'desc' },
            { createdAt: 'desc' },
            { id: 'asc' },
          ],
          select: sfaObservationSelect,
        });
        const canReadEmptyStudent =
          membership.role === 'SPECIAL_ED_COORDINATOR' ||
          (membership.assignedStudentScopes ?? []).some(
            (scope) => scope.studentId === path.studentId,
          ) ||
          (membership.observationAssignedStudentIds ?? []).includes(
            path.studentId,
          );
        const visibleRows = rows.filter(
          (row) =>
            row.assignment.assignedTo.userId === auth.userId ||
            canReadObservationStudent(
              membership,
              row.studentId,
              row.assessmentDate,
            ),
        );
        if (!canReadEmptyStudent && visibleRows.length === 0) deny();
        const data = visibleRows.map(mapSfaObservation);
        response.json(
          sfaObservationHistoryResponseSchema.parse({
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
    '/organizations/:organizationId/students/:studentId/sfa-observations/reference',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, studentId: uuidSchema })
            .strict(),
          request.params,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'special-ed:read');
        const rows = await prisma.sFAObservation.findMany({
          where: {
            organizationId: path.organizationId,
            studentId: path.studentId,
            status: 'COMPLETED',
          },
          orderBy: [
            { assessmentDate: 'desc' },
            { completedAt: 'desc' },
            { createdAt: 'desc' },
            { id: 'asc' },
          ],
          select: sfaObservationSelect,
        });
        const row = rows.find(
          (candidate) =>
            candidate.assignment.assignedTo.userId === auth.userId ||
            canReadObservationStudent(
              membership,
              candidate.studentId,
              candidate.assessmentDate,
            ),
        );
        const canReadEmptyStudent =
          membership.role === 'SPECIAL_ED_COORDINATOR' ||
          (membership.assignedStudentScopes ?? []).some(
            (scope) => scope.studentId === path.studentId,
          ) ||
          (membership.observationAssignedStudentIds ?? []).includes(
            path.studentId,
          );
        if (!row && !canReadEmptyStudent) deny();
        response.json(
          sfaObservationReferenceResponseSchema.parse({
            data: row ? mapSfaObservation(row) : null,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/organizations/:organizationId/observation-assignments/:assignmentId',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        requireObservationPermission(membership, 'observation:manage');
        await prisma.$transaction(async (transaction) => {
          const existing = await transaction.observationAssignment.findFirst({
            where: {
              id: path.assignmentId,
              organizationId: path.organizationId,
            },
            select: assignmentSelect,
          });
          if (!existing) deny();
          if (existing.status !== 'PENDING' || hasObservationRecord(existing)) {
            throw lifecycleConflict(
              'Only pending assignments without an observation record can be deleted.',
            );
          }
          const deleted = await transaction.observationAssignment.deleteMany({
            where: {
              id: existing.id,
              organizationId: path.organizationId,
              status: 'PENDING',
              fedcObservation: null,
              sensoryObservation: null,
              sfaObservation: null,
            },
          });
          if (deleted.count !== 1) {
            throw lifecycleConflict(
              'Only pending assignments without an observation record can be deleted.',
            );
          }
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'observation_assignment.delete',
            targetType: 'ObservationAssignment',
            targetId: existing.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: ['deleted'] },
          });
        });
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
