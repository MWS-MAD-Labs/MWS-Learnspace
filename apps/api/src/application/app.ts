import express from 'express';
import {
  healthResponseSchema,
  versionResponseSchema,
} from '@learnspace/contracts';
import type { AppConfig } from '../lib/config.js';
import type { Database } from '../lib/database.js';
import type { Logger } from '../lib/logger.js';
import {
  createErrorMiddleware,
  notFoundMiddleware,
} from '../middleware/error-middleware.js';
import { createRequestMiddleware } from '../middleware/request-middleware.js';
import { createAggregateRouter } from '../routes/aggregates-router.js';
import { createAuthRouter } from '../routes/auth-router.js';
import { createIepRouter } from '../routes/ieps-router.js';
import { createLearningJourneyRouter } from '../routes/learning-journeys-router.js';
import { createObservationRouter } from '../routes/observations-router.js';
import { createResourceRouter } from '../routes/resources-router.js';
import { createTestAuthRouter } from '../routes/test-auth-router.js';
import { createWeeklyReportRouter } from '../routes/weekly-reports-router.js';
import { OAuthService } from '../service/oauth-service.js';
import { SessionService } from '../service/session-service.js';

export type AppDependencies = {
  config: AppConfig;
  database: Database;
  logger: Logger;
  version?: string;
  auth?: {
    sessions: SessionService;
    oauth: OAuthService;
  };
};

export function createApp({
  config,
  database,
  logger,
  version = '0.2.0',
  auth,
}: AppDependencies) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.use(createRequestMiddleware(logger));

  app.get('/health/live', (_request, response) => {
    response.json(healthResponseSchema.parse({ status: 'live' }));
  });

  app.get('/health/ready', async (_request, response, next) => {
    try {
      await database.check();
      response.json(
        healthResponseSchema.parse({
          status: 'ready',
          dependencies: { database: 'up' },
        }),
      );
    } catch (error) {
      logger.warn(
        { error: error instanceof Error ? error.message : 'unknown' },
        'readiness check failed',
      );
      response.status(503).json(
        healthResponseSchema.parse({
          status: 'unavailable',
          dependencies: { database: 'down' },
        }),
      );
    }
  });

  const authServices =
    auth ??
    (database.client
      ? {
          sessions: new SessionService(
            database.client,
            config.sessionSecret,
            config.sessionTtlHours,
          ),
          oauth: new OAuthService(database.client, config),
        }
      : undefined);
  if (authServices) {
    app.use(
      '/api/v1/auth',
      createAuthRouter(
        config,
        authServices.sessions,
        authServices.oauth,
        logger,
      ),
    );
    if (database.client) {
      if (
        config.nodeEnv === 'test' &&
        config.e2eAuthSecret &&
        config.e2eAuthUserEmail
      ) {
        app.use(
          '/api/v1/test-auth',
          createTestAuthRouter(config, database.client, authServices.sessions),
        );
      }
      app.use(
        '/api/v1',
        createLearningJourneyRouter(database.client, authServices.sessions),
      );
      app.use(
        '/api/v1',
        createResourceRouter(database.client, authServices.sessions),
      );
      app.use(
        '/api/v1',
        createObservationRouter(database.client, authServices.sessions),
      );
      app.use(
        '/api/v1',
        createIepRouter(database.client, authServices.sessions),
      );
      app.use(
        '/api/v1',
        createWeeklyReportRouter(database.client, authServices.sessions),
      );
      app.use(
        '/api/v1',
        createAggregateRouter(database.client, authServices.sessions),
      );
    }
  }

  app.get('/api/v1/version', (_request, response) => {
    response.json(
      versionResponseSchema.parse({ name: 'learnspace-api', version }),
    );
  });

  if (config.nodeEnv === 'test') {
    app.get('/__test/error', () => {
      throw new Error('test failure');
    });
  }

  app.use(notFoundMiddleware);
  app.use(createErrorMiddleware(config, logger));

  return app;
}
