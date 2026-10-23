import { createRouter, type Router } from '../type/http.js';
import type { AppConfig } from '../lib/config.js';
import type { Logger } from '../lib/logger.js';
import { createAuthController } from '../controller/auth-controller.js';
import {
  createCsrfProtection,
  createRequiredAuthentication,
} from '../middleware/auth-middleware.js';
import type { OAuthService } from '../service/oauth-service.js';
import type { SessionService } from '../service/session-service.js';
import type { ShadowSessionObserver } from '../service/shared-session-shadow-service.js';
import type { SharedSessionAuthenticationService } from '../service/shared-session-service.js';

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
  shadowObserver?: ShadowSessionObserver,
  shared?: SharedSessionAuthenticationService,
): Router {
  const router = createRouter();
  const controller = createAuthController(
    config,
    sessions,
    oauth,
    logger,
    shared,
  );
  const authentication = createRequiredAuthentication(
    shared ?? sessions,
    shadowObserver,
  );
  router.get('/bootstrap', controller.bootstrap);
  router.get('/login', controller.login);
  if (shared) router.get('/sso', controller.sso);
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
