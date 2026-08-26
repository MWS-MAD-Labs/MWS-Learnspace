import { Prisma, type PrismaClient } from '@prisma/client';
import type { Request, Router } from 'express';
import { Router as createRouter } from 'express';
import { z } from 'zod';
import {
  observationAssignmentCancelCommandSchema,
  observationAssignmentCreateCommandSchema,
  observationAssignmentMutationResponseSchema,
  observationAssignmentsResponseSchema,
  observationAssignmentUpdateCommandSchema,
  observationDefinitionCreateCommandSchema,
  observationDefinitionMutationResponseSchema,
  observationDefinitionsResponseSchema,
  observationDefinitionVersionCreateCommandSchema,
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
  permission: 'special-ed:read' | 'observation:manage',
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
