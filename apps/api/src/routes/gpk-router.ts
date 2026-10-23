import type { DatabaseClient } from '../lib/database.js';
import { createRouter, type Router } from '../type/http.js';
import { createCsrfProtection } from '../routes/auth-router.js';
import { createGpkController } from '../controller/gpk-controller.js';
import { createGpkService } from '../service/gpk-service.js';

export function createGpkRouter(prisma: DatabaseClient): Router {
  const router = createRouter();
  const controller = createGpkController(createGpkService(prisma));
  const root = '/organizations/:organizationId';
  router.get(`${root}/gpk-assignments`, controller.list);
  router.put(
    `${root}/students/:studentId/gpk-assignment`,
    createCsrfProtection(),
    controller.upsert,
  );
  router.post(
    `${root}/gpk-assignments/:assignmentId/end`,
    createCsrfProtection(),
    controller.end,
  );
  return router;
}
