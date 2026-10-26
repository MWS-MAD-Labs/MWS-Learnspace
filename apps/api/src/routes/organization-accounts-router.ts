import type { DatabaseClient } from '../lib/database.js';
import { createRouter, type Router } from '../type/http.js';
import { createCsrfProtection } from '../routes/auth-router.js';
import { createOrganizationAccountsController } from '../controller/organization-accounts-controller.js';
import { createOrganizationAccountsService } from '../service/organization-accounts-service.js';

export function createOrganizationAccountsRouter(
  prisma: DatabaseClient,
  options: {
    managedByCentral?: boolean;
    scopesManagedByCentral?: boolean;
  } = {},
): Router {
  const router = createRouter();
  const controller = createOrganizationAccountsController(
    createOrganizationAccountsService(prisma),
    options,
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
