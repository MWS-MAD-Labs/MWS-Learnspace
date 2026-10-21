import type { DatabaseClient } from '../lib/database.js';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { createCsrfProtection } from '../routes/auth-router.js';
import { createOrganizationAccountsController } from '../controller/organization-accounts-controller.js';
import { createOrganizationAccountsService } from '../service/organization-accounts-service.js';

export function createOrganizationAccountsRouter(
  prisma: DatabaseClient,
): Router {
  const router = createRouter();
  const controller = createOrganizationAccountsController(
    createOrganizationAccountsService(prisma),
  );
  const root = '/organizations/:organizationId/accounts';
  router.get(root, controller.list);
  router.post(root, createCsrfProtection(), controller.create);
  router.patch(
    `${root}/:membershipId`,
    createCsrfProtection(),
    controller.update,
  );
  return router;
}
