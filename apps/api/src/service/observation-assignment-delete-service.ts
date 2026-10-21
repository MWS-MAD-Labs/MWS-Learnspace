import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { z } from 'zod';
import { uuidSchema } from '@learnspace/contracts';
import { createAuditService } from '../service/audit-service.js';
import { createCsrfProtection } from '../middleware/auth-middleware.js';
import { parseRequest } from '../middleware/http-errors.js';
import {
  assignmentSelect,
  hasObservationRecord,
} from '../model/observation-assignments-model.js';
import { lifecycleConflict } from '../utils/observations.errors.js';
import {
  deny,
  membershipFor,
  requireAuth,
  requireObservationPermission,
} from '../utils/observations.policy.js';

export function createObservationAssignmentDeleteService(
  prisma: PrismaClient,
): Router {
  const router = createRouter();
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
          await createAuditService(transaction as PrismaClient).append({
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
