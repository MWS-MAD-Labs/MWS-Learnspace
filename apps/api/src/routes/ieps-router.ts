import type { DatabaseClient } from '../lib/database.js';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import {
  createCsrfProtection,
  createRequiredAuthentication,
} from '../routes/auth-router.js';
import { organizationSchoolDate } from '../utils/organization-time.js';
import type { SessionService } from '../service/session-service.js';
import { createIepController } from '../controller/ieps-controller.js';
import { createIepService } from '../service/ieps-service.js';

export function createIepRouter(
  prisma: DatabaseClient,
  sessions: SessionService,
): Router {
  const router = createRouter();
  const service = createIepService(prisma, async (organizationId) => {
    return (await organizationSchoolDate(prisma, organizationId)).schoolDate;
  });
  const controller = createIepController(service);
  const collectionPath = '/organizations/:organizationId/ieps';
  const iepPath = `${collectionPath}/:iepId`;

  router.use(createRequiredAuthentication(sessions));
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
