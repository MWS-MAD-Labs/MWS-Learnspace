import type { PrismaClient } from '@prisma/client';
import { createRouter, type Router } from '../type/http.js';
import { z } from 'zod';
import {
  observationAssignmentCancelCommandSchema,
  observationAssignmentCreateCommandSchema,
  observationAssignmentMutationResponseSchema,
  observationAssignmentsResponseSchema,
  observationAssignmentUpdateCommandSchema,
  uuidSchema,
} from '@learnspace/contracts';
import { createAuditService } from '../service/audit-service.js';
import { membershipHasPermission } from '../utils/authorization.js';
import { createCsrfProtection } from '../middleware/auth-middleware.js';
import { parseRequest } from '../middleware/http-errors.js';
import {
  assignmentSelect,
  mapAssignment,
  validateAssignmentReferences,
} from '../model/observation-assignments-model.js';
import { lifecycleConflict } from '../utils/observations.errors.js';
import {
  deny,
  membershipFor,
  requireAuth,
  requireObservationPermission,
} from '../utils/observations.policy.js';

export function createObservationAssignmentsService(
  prisma: PrismaClient,
): Router {
  const router = createRouter();
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
            ...(membershipHasPermission(membership, 'scope.special-ed')
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
          await createAuditService(transaction as PrismaClient).append({
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
          await createAuditService(transaction as PrismaClient).append({
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
          await createAuditService(transaction as PrismaClient).append({
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
  return router;
}
