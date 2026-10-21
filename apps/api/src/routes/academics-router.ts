import type { DatabaseClient } from '../lib/database.js';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { createAcademicsController } from '../controller/academics-controller.js';
import { createAcademicsService } from '../service/academics-service.js';

export function createAcademicsRouter(prisma: DatabaseClient): Router {
  const router = createRouter();
  const controller = createAcademicsController(createAcademicsService(prisma));
  const root = '/organizations/:organizationId';
  router.get(`${root}/academic-years`, controller.listAcademicYears);
  router.get(`${root}/semesters`, controller.listSemesters);
  router.get(`${root}/units`, controller.listUnits);
  router.get(`${root}/grades`, controller.listGrades);
  router.get(`${root}/classes`, controller.listClasses);
  router.get(`${root}/subjects`, controller.listSubjects);
  return router;
}
