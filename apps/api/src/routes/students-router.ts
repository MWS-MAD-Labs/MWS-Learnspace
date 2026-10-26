import type { DatabaseClient } from '../lib/database.js';
import { createRouter, type Router } from '../type/http.js';
import { createCsrfProtection } from '../routes/auth-router.js';
import { createStudentsController } from '../controller/students-controller.js';
import {
  refuseFieldsWhenManaged,
  refuseWhenManaged,
} from '../middleware/managed-by-central.js';
import { createStudentsService } from '../service/students-service.js';

// What a student is and where the student is placed comes from Central when it manages the school data.
const centralStudentFields = [
  'studentNumber',
  'fullName',
  'nickname',
  'gender',
  'dateOfBirth',
  'address',
  'specialNeedsFlag',
  'status',
  'avatarUrl',
  'activeEnrollment',
] as const;

export function createStudentsRouter(
  prisma: DatabaseClient,
  options: { managedByCentral?: boolean } = {},
): Router {
  const managed = options.managedByCentral === true;
  const router = createRouter();
  const controller = createStudentsController(createStudentsService(prisma));
  const root = '/organizations/:organizationId/students';
  router.get(root, controller.list);
  router.get(`${root}/:studentId`, controller.detail);
  router.post(
    root,
    createCsrfProtection(),
    refuseWhenManaged(managed),
    controller.create,
  );
  router.patch(
    `${root}/:studentId`,
    createCsrfProtection(),
    refuseFieldsWhenManaged(managed, centralStudentFields),
    controller.update,
  );
  return router;
}
