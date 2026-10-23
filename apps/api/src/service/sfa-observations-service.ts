import { Prisma, type PrismaClient } from '@prisma/client';
import { createRouter, type Router } from '../type/http.js';
import { z } from 'zod';
import {
  sfaObservationCompleteCommandSchema,
  sfaObservationCreateDraftCommandSchema,
  sfaObservationHistoryResponseSchema,
  sfaObservationReferenceResponseSchema,
  sfaObservationResponseSchema,
  sfaObservationSaveDraftCommandSchema,
  uuidSchema,
} from '@learnspace/contracts';
import { createAuditService } from '../service/audit-service.js';
import { createCsrfProtection } from '../middleware/auth-middleware.js';
import { HttpError, parseRequest } from '../middleware/http-errors.js';
import { scoreSfaResponses } from '../utils/sfa-scoring.js';
import {
  mapSfaObservation,
  requireSfaRead,
  sfaObservationSelect,
} from '../model/sfa-observations-model.js';
import {
  sfaLifecycleConflict,
  translateSfaScoringError,
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

export function createSfaObservationsService(prisma: PrismaClient): Router {
  const router = createRouter();
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
            await createAuditService(transaction as PrismaClient).append({
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
          await createAuditService(transaction as PrismaClient).append({
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
          await createAuditService(transaction as PrismaClient).append({
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
            (scope) =>
              scope.organizationId === membership.organizationId &&
              scope.studentId === path.studentId,
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
  return router;
}
