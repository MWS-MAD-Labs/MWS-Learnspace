import type { DatabaseClient } from '../lib/database.js';
import { createRouter, type Router } from '../type/http.js';
import { createCsrfProtection } from '../routes/auth-router.js';
import { createGpkController } from '../controller/gpk-controller.js';
import { refuseWhenManaged } from '../middleware/managed-by-central.js';
import { createGpkService } from '../service/gpk-service.js';

export function createGpkRouter(
  prisma: DatabaseClient,
  options: { managedByCentral?: boolean } = {},
): Router {
  const managed = options.managedByCentral === true;
  const router = createRouter();
  const controller = createGpkController(createGpkService(prisma));
  const root = '/organizations/:organizationId';
  router.get(`${root}/gpk-assignments`, controller.list);
  router.put(
    `${root}/students/:studentId/gpk-assignment`,
    createCsrfProtection(),
    refuseWhenManaged(managed),
    controller.upsert,
  );
  router.post(
    `${root}/gpk-assignments/:assignmentId/end`,
    createCsrfProtection(),
    refuseWhenManaged(managed),
    controller.end,
  );
  return router;
}
