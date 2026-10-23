import type { DatabaseClient } from '../lib/database.js';
import { createRouter, type Router } from '../type/http.js';
import { createCsrfProtection } from '../routes/auth-router.js';
import { createAttendanceController } from '../controller/attendance-controller.js';
import { createAttendanceService } from '../service/attendance-service.js';

export function createAttendanceRouter(prisma: DatabaseClient): Router {
  const router = createRouter();
  const service = createAttendanceService(prisma);
  const controller = createAttendanceController(service);
  const path = '/organizations/:organizationId/classes/:classId/attendance';

  router.get(path, controller.getRoster);
  router.put(path, createCsrfProtection(), controller.saveRoster);

  return router;
}
