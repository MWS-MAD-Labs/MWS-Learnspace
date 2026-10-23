import { Prisma, type PrismaClient } from '@prisma/client';
import { createRouter, type Router } from '../type/http.js';
import { z } from 'zod';
import {
  fedcObservationCompleteCommandSchema,
  fedcObservationCreateDraftCommandSchema,
  fedcObservationHistoryResponseSchema,
  fedcObservationReferenceResponseSchema,
  fedcObservationResponseSchema,
  fedcObservationSaveDraftCommandSchema,
  uuidSchema,
} from '@learnspace/contracts';
import { createAuditService } from '../service/audit-service.js';
import { membershipHasPermission } from '../utils/authorization.js';
import { createCsrfProtection } from '../middleware/auth-middleware.js';
import { scoreFedcResponses } from '../utils/fedc-scoring.js';
import { HttpError, parseRequest } from '../middleware/http-errors.js';
import {
  fedcObservationSelect,
  mapFedcObservation,
  requireFedcRead,
} from '../model/fedc-observations-model.js';
import {
  fedcLifecycleConflict,
  translateFedcScoringError,
} from '../utils/observations.errors.js';
import {
  canReadObservationStudent,
  deny,
  membershipFor,
  requireAuth,
  requireObservationPermission,
} from '../utils/observations.policy.js';
import {
  prismaErrorCode,
  serializableConflictCodes,
} from '../utils/observations.shared.js';

export function createFedcObservationsService(prisma: PrismaClient): Router {
  const router = createRouter();
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
            await createAuditService(transaction as PrismaClient).append({
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
          await createAuditService(transaction as PrismaClient).append({
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
          await createAuditService(transaction as PrismaClient).append({
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
          membershipHasPermission(membership, 'scope.special-ed') ||
          (membership.assignedStudentScopes ?? []).some(
            (scope) =>
              scope.organizationId === membership.organizationId &&
              scope.studentId === path.studentId,
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
          membershipHasPermission(membership, 'scope.special-ed') ||
          (membership.assignedStudentScopes ?? []).some(
            (scope) =>
              scope.organizationId === membership.organizationId &&
              scope.studentId === path.studentId,
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
  return router;
}
