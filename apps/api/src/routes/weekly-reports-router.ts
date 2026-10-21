import type { DatabaseClient } from '../lib/database.js';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import {
  createCsrfProtection,
  createRequiredAuthentication,
} from '../routes/auth-router.js';
import { organizationSchoolDate } from '../utils/organization-time.js';
import type { SessionService } from '../service/session-service.js';
import { createWeeklyReportController } from '../controller/weekly-reports-controller.js';
import { createWeeklyReportService } from '../service/weekly-reports-service.js';

export function createWeeklyReportRouter(
  prisma: DatabaseClient,
  sessions: SessionService,
): Router {
  const router = createRouter();
  const service = createWeeklyReportService(prisma, async (organizationId) => {
    return (await organizationSchoolDate(prisma, organizationId)).schoolDate;
  });
  const controller = createWeeklyReportController(service);
  const collectionPath = '/organizations/:organizationId/weekly-reports';
  const reportPath = `${collectionPath}/:reportId`;

  router.use(createRequiredAuthentication(sessions));
  router.get(collectionPath, controller.list);
  router.get(reportPath, controller.get);
  router.post(collectionPath, createCsrfProtection(), controller.create);
  router.put(reportPath, createCsrfProtection(), controller.update);
  router.post(
    `${reportPath}/submit`,
    createCsrfProtection(),
    controller.submit,
  );
  router.post(
    `${reportPath}/coordinator-decision`,
    createCsrfProtection(),
    controller.coordinatorDecision,
  );
  router.post(
    `${reportPath}/director-decision`,
    createCsrfProtection(),
    controller.directorDecision,
  );

  return router;
}
