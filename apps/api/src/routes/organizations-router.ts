import type { DatabaseClient } from '../lib/database.js';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { createCsrfProtection } from '../routes/auth-router.js';
import { createOrganizationsController } from '../controller/organizations-controller.js';
import { createOrganizationsService } from '../service/organizations-service.js';

export function createOrganizationsRouter(prisma: DatabaseClient): Router {
  const router = createRouter();
  const controller = createOrganizationsController(
    createOrganizationsService(prisma),
  );
  const root = '/organizations/:organizationId';
  router.get('/organizations', controller.list);
  router.get(`${root}/school-date`, controller.schoolDate);
  router.get(`${root}/settings`, controller.getSettings);
  router.patch(
    `${root}/settings`,
    createCsrfProtection(),
    controller.updateSettings,
  );
  return router;
}
