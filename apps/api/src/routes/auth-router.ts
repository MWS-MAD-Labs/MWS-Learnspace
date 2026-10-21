import type { Router } from 'express';
import { Router as createRouter } from 'express';
import type { AppConfig } from '../lib/config.js';
import type { Logger } from '../lib/logger.js';
import { createAuthController } from '../controller/auth-controller.js';
import {
  createCsrfProtection,
  createRequiredAuthentication,
} from '../middleware/auth-middleware.js';
import type { OAuthService } from '../service/oauth-service.js';
import type { SessionService } from '../service/session-service.js';

export {
  createCsrfProtection,
  createRequiredAuthentication,
} from '../middleware/auth-middleware.js';
export type { AuthenticatedRequest } from '../type/http.js';

export function createAuthRouter(
  config: AppConfig,
  sessions: SessionService,
  oauth: OAuthService,
  logger: Logger,
): Router {
  const router = createRouter();
  const controller = createAuthController(config, sessions, oauth, logger);
  const authentication = createRequiredAuthentication(sessions);
  router.get('/login', controller.login);
  router.get('/callback', controller.callback);
  router.get('/session', authentication, controller.session);
  router.post(
    '/logout',
    authentication,
    createCsrfProtection(),
    controller.logout,
  );
  return router;
}
