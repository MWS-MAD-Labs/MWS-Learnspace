import type { DatabaseClient } from '../lib/database.js';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { createStaffDirectoryController } from '../controller/staff-directory-controller.js';
import { createStaffDirectoryService } from '../service/staff-directory-service.js';

export function createStaffDirectoryRouter(prisma: DatabaseClient): Router {
  const router = createRouter();
  const controller = createStaffDirectoryController(
    createStaffDirectoryService(prisma),
  );
  router.get('/organizations/:organizationId/staff', controller.list);
  return router;
}
