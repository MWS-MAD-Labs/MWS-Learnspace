import type { DatabaseClient } from '../lib/database.js';
import { createRouter, type Router } from '../type/http.js';
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
