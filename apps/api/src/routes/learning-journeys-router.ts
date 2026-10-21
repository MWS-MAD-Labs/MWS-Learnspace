import type { DatabaseClient } from '../lib/database.js';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import {
  createCsrfProtection,
  createRequiredAuthentication,
} from '../routes/auth-router.js';
import type { SessionService } from '../service/session-service.js';
import { createLearningJourneyController } from '../controller/learning-journeys-controller.js';
import { createLearningJourneyService } from '../service/learning-journeys-service.js';

export function createLearningJourneyRouter(
  prisma: DatabaseClient,
  sessions: SessionService,
): Router {
  const router = createRouter();
  const service = createLearningJourneyService(prisma);
  const controller = createLearningJourneyController(service);
  const collectionPath = '/organizations/:organizationId/learning-journeys';
  const journeyPath = `${collectionPath}/:journeyId`;

  router.use(createRequiredAuthentication(sessions));
  router.get(collectionPath, controller.list);
  router.get(journeyPath, controller.get);
  router.post(collectionPath, createCsrfProtection(), controller.create);
  router.post(
    `${journeyPath}/submit`,
    createCsrfProtection(),
    controller.submit,
  );
  router.post(
    `${journeyPath}/principal-review`,
    createCsrfProtection(),
    controller.principalReview,
  );
  router.post(
    `${journeyPath}/director-review`,
    createCsrfProtection(),
    controller.directorReview,
  );
  router.put(journeyPath, createCsrfProtection(), controller.update);

  return router;
}
