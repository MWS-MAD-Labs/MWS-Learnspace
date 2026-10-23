import type { DatabaseClient } from '../lib/database.js';
import { createRouter, type Router } from '../type/http.js';
import {
  createCsrfProtection,
  createRequiredAuthentication,
} from '../routes/auth-router.js';
import { organizationSchoolDate } from '../utils/organization-time.js';
import type { SessionService } from '../service/session-service.js';
import type { ShadowSessionObserver } from '../service/shared-session-shadow-service.js';
import type { RequestAuthenticationService } from '../service/request-authentication-service.js';
import { createIepController } from '../controller/ieps-controller.js';
import { createIepService } from '../service/ieps-service.js';

export function createIepRouter(
  prisma: DatabaseClient,
  sessions: SessionService | RequestAuthenticationService,
  shadowObserver?: ShadowSessionObserver,
): Router {
  const router = createRouter();
  const service = createIepService(prisma, async (organizationId) => {
    return (await organizationSchoolDate(prisma, organizationId)).schoolDate;
  });
  const controller = createIepController(service);
  const collectionPath = '/organizations/:organizationId/ieps';
  const iepPath = `${collectionPath}/:iepId`;

  router.use(createRequiredAuthentication(sessions, shadowObserver));
  router.get(collectionPath, controller.list);
  router.get(iepPath, controller.get);
  router.post(collectionPath, createCsrfProtection(), controller.create);
  router.post(`${iepPath}/submit`, createCsrfProtection(), controller.submit);
  router.post(
    `${iepPath}/coordinator-review`,
    createCsrfProtection(),
    controller.coordinatorReview,
  );
  router.post(
    `${iepPath}/director-review`,
    createCsrfProtection(),
    controller.directorReview,
  );
  router.post(
    `${iepPath}/activate`,
    createCsrfProtection(),
    controller.activate,
  );
  router.post(`${iepPath}/archive`, createCsrfProtection(), controller.archive);
  router.put(iepPath, createCsrfProtection(), controller.update);

  return router;
}
