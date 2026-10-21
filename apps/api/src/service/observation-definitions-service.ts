import { Prisma, type PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { z } from 'zod';
import {
  observationDefinitionCreateCommandSchema,
  observationDefinitionMutationResponseSchema,
  observationDefinitionsResponseSchema,
  observationDefinitionVersionCreateCommandSchema,
  uuidSchema,
} from '@learnspace/contracts';
import { createAuditService } from '../service/audit-service.js';
import { createCsrfProtection } from '../middleware/auth-middleware.js';
import { HttpError, parseRequest } from '../middleware/http-errors.js';
import {
  definitionSelect,
  mapDefinition,
} from '../model/observation-definitions-model.js';
import { definitionConflict } from '../utils/observations.errors.js';
import {
  deny,
  membershipFor,
  requireAuth,
  requireObservationPermission,
} from '../utils/observations.policy.js';
import {
  prismaErrorCode,
  serializableConflictCodes,
} from '../utils/observations.shared.js';

export function createObservationDefinitionsService(
  prisma: PrismaClient,
): Router {
  const router = createRouter();
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
          await createAuditService(transaction as PrismaClient).append({
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
            await createAuditService(transaction as PrismaClient).append({
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
  return router;
}
