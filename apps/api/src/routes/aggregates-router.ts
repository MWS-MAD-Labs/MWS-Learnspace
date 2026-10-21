import type { DatabaseClient } from '../lib/database.js';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { createRequiredAuthentication } from '../routes/auth-router.js';
import type { SessionService } from '../service/session-service.js';
import { createDashboardController } from '../controller/dashboard-controller.js';
import { createDashboardQueryService } from '../service/dashboard-service.js';
import { createNotificationsController } from '../controller/notifications-controller.js';
import { createNotificationsQueryService } from '../service/notifications-service.js';
import { createReportingController } from '../controller/reporting-controller.js';
import { createReportingQueryService } from '../service/reporting-service.js';
import { createAggregateSearchController } from '../controller/search-controller.js';
import { createAggregateSearchQueryService } from '../service/search-service.js';

export function createAggregateRouter(
  prisma: DatabaseClient,
  sessions: SessionService,
): Router {
  const router = createRouter();
  const dashboard = createDashboardController(
    createDashboardQueryService(prisma),
  );
  const search = createAggregateSearchController(
    createAggregateSearchQueryService(prisma),
  );
  const notifications = createNotificationsController(
    createNotificationsQueryService(prisma),
  );
  const reporting = createReportingController(
    createReportingQueryService(prisma),
  );

  router.use(createRequiredAuthentication(sessions));
  router.get('/organizations/:organizationId/dashboard-summary', dashboard.get);
  router.get('/organizations/:organizationId/search', search.get);
  router.get('/organizations/:organizationId/notifications', notifications.get);
  router.get(
    '/organizations/:organizationId/reporting-aggregate',
    reporting.get,
  );

  return router;
}
