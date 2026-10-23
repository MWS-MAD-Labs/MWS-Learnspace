import type { DatabaseClient } from '../lib/database.js';
import { createRouter, type Router } from '../type/http.js';
import {
  createCsrfProtection,
  createRequiredAuthentication,
} from '../routes/auth-router.js';
import type { SessionService } from '../service/session-service.js';
import { createLearningJourneyController } from '../controller/learning-journeys-controller.js';
import { createLearningJourneyService } from '../service/learning-journeys-service.js';
import type { ShadowSessionObserver } from '../service/shared-session-shadow-service.js';
import type { RequestAuthenticationService } from '../service/request-authentication-service.js';

export function createLearningJourneyRouter(
  prisma: DatabaseClient,
  sessions: SessionService | RequestAuthenticationService,
  shadowObserver?: ShadowSessionObserver,
): Router {
  const router = createRouter();
  const service = createLearningJourneyService(prisma);
  const controller = createLearningJourneyController(service);
  const collectionPath = '/organizations/:organizationId/learning-journeys';
  const journeyPath = `${collectionPath}/:journeyId`;

  router.use(createRequiredAuthentication(sessions, shadowObserver));
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
