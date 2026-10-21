import type { DatabaseClient } from '../lib/database.js';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import type { AppConfig } from '../lib/config.js';
import {
  createTestAuthController,
  e2eAuthHeaderName,
  e2eAuthUserHeaderName,
} from '../controller/test-auth-controller.js';
import type { SessionService } from '../service/session-service.js';
import { createTestAuthService } from '../service/test-auth-service.js';

export { e2eAuthHeaderName, e2eAuthUserHeaderName };

export function createTestAuthRouter(
  config: AppConfig,
  prisma: DatabaseClient,
  sessions: SessionService,
): Router {
  const router = createRouter();
  const controller = createTestAuthController(
    config,
    createTestAuthService(prisma),
    sessions,
  );
  router.post('/session', controller.createSession);
  return router;
}
