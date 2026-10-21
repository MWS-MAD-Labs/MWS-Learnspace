import { Prisma, type PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { z } from 'zod';
import {
  sensoryProfileObservationCompleteCommandSchema,
  sensoryProfileObservationCreateDraftCommandSchema,
  sensoryProfileObservationHistoryResponseSchema,
  sensoryProfileObservationReferenceResponseSchema,
  sensoryProfileObservationResponseSchema,
  sensoryProfileObservationSaveDraftCommandSchema,
  uuidSchema,
} from '@learnspace/contracts';
import { createAuditService } from '../service/audit-service.js';
import { createCsrfProtection } from '../middleware/auth-middleware.js';
import { HttpError, parseRequest } from '../middleware/http-errors.js';
import { scoreSensoryProfileResponses } from '../utils/sensory-profile-scoring.js';
import {
  sensoryProfileObservationSelect,
  mapSensoryProfileObservation,
  requireSensoryProfileRead,
} from '../model/sensory-profile-observations-model.js';
import {
  sensoryProfileLifecycleConflict,
  translateSensoryProfileScoringError,
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

export function createSensoryProfileObservationsService(
  prisma: PrismaClient,
): Router {
  const router = createRouter();
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
            await createAuditService(transaction as PrismaClient).append({
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
          await createAuditService(transaction as PrismaClient).append({
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
          await createAuditService(transaction as PrismaClient).append({
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
            (scope) =>
              scope.organizationId === membership.organizationId &&
              scope.studentId === path.studentId,
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
  return router;
}
