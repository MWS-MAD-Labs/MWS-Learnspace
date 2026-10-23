import type { DatabaseClient } from '../lib/database.js';
import { createRouter, type Router } from '../type/http.js';
import { createRequiredAuthentication } from './auth-router.js';
import { createAcademicsRouter } from './academics-router.js';
import { createAttendanceRouter } from './attendance-router.js';
import { createGpkRouter } from './gpk-router.js';
import { createOrganizationAccountsRouter } from './organization-accounts-router.js';
import { createOrganizationsRouter } from './organizations-router.js';
import { createStaffDirectoryRouter } from './staff-directory-router.js';
import { createStudentsRouter } from './students-router.js';
import type { SessionService } from '../service/session-service.js';
import type { ShadowSessionObserver } from '../service/shared-session-shadow-service.js';
import type { RequestAuthenticationService } from '../service/request-authentication-service.js';

export { DEFAULT_GPK_MAX_CASELOAD } from '../model/gpk-model.js';

export function createResourceRouter(
  prisma: DatabaseClient,
  sessions: SessionService | RequestAuthenticationService,
  shadowObserver?: ShadowSessionObserver,
): Router {
  const router = createRouter();
  router.use(createRequiredAuthentication(sessions, shadowObserver));
  router.use(createOrganizationsRouter(prisma));
  router.use(createAcademicsRouter(prisma));
  router.use(createOrganizationAccountsRouter(prisma));
  router.use(createStaffDirectoryRouter(prisma));
  router.use(createStudentsRouter(prisma));
  router.use(createGpkRouter(prisma));
  router.use(createAttendanceRouter(prisma));
  return router;
}
