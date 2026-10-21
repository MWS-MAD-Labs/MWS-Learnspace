import type { DatabaseClient } from '../lib/database.js';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { createCsrfProtection } from '../routes/auth-router.js';
import { createStudentsController } from '../controller/students-controller.js';
import { createStudentsService } from '../service/students-service.js';

export function createStudentsRouter(prisma: DatabaseClient): Router {
  const router = createRouter();
  const controller = createStudentsController(createStudentsService(prisma));
  const root = '/organizations/:organizationId/students';
  router.get(root, controller.list);
  router.get(`${root}/:studentId`, controller.detail);
  router.post(root, createCsrfProtection(), controller.create);
  router.patch(`${root}/:studentId`, createCsrfProtection(), controller.update);
  return router;
}
