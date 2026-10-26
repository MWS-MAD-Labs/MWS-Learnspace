import {
  healthResponseSchema,
  versionResponseSchema,
} from '@learnspace/contracts';
import { Hono } from 'hono';
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
import type { ShadowSessionObserver } from '../service/shared-session-shadow-service.js';
import type { SharedSessionAuthenticationService } from '../service/shared-session-service.js';
import {
  adaptHandler,
  httpAdapters,
  mountRouter,
  setRequestBody,
  type Router,
} from '../type/http.js';
import { HttpError } from '../middleware/http-errors.js';

const maximumJsonBodyBytes = 100 * 1024;

export type AppDependencies = {
  config: AppConfig;
  database: Database;
  logger: Logger;
  version?: string;
  auth?: {
    sessions: SessionService;
    oauth: OAuthService;
    shadowObserver?: ShadowSessionObserver;
    shared?: SharedSessionAuthenticationService;
  };
};

async function parseJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type')?.toLowerCase();
  if (
    !contentType ||
    (!contentType.includes('application/json') &&
      !contentType.includes('+json'))
  ) {
    return undefined;
  }
  const declaredLength = Number(request.headers.get('content-length'));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maximumJsonBodyBytes
  ) {
    throw new HttpError(
      413,
      'PAYLOAD_TOO_LARGE',
      'The request body exceeds the allowed size.',
    );
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  if (request.body) {
    const reader = request.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumJsonBodyBytes) {
        await reader.cancel();
        throw new HttpError(
          413,
          'PAYLOAD_TOO_LARGE',
          'The request body exceeds the allowed size.',
        );
      }
      chunks.push(value);
    }
  }
  if (length === 0) return {};
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    const error = new SyntaxError('Invalid JSON') as SyntaxError & {
      body: true;
    };
    error.body = true;
    throw error;
  }
}

function route(app: Hono, path: string, router: Router): void {
  mountRouter(app, path, router);
}

export function createApp({
  config,
  database,
  logger,
  version = '0.2.0',
  auth,
}: AppDependencies) {
  const app = new Hono();
  app.use('*', adaptHandler(createRequestMiddleware(logger)));
  app.use('*', async (context, next) => {
    setRequestBody(context, await parseJsonBody(context.req.raw));
    await next();
  });

  app.get('/health/live', (context) =>
    context.json(healthResponseSchema.parse({ status: 'live' })),
  );

  app.get('/health/ready', async (context) => {
    const dependencies: Record<string, 'up' | 'down'> = { database: 'up' };
    try {
      await database.check();
    } catch (error) {
      dependencies.database = 'down';
      logger.warn(
        { error: error instanceof Error ? error.message : 'unknown' },
        'readiness check failed',
      );
    }
    if (config.sharedSessionMode === 'shared' && auth?.shared) {
      Object.assign(dependencies, auth.shared.readinessDependencies());
    }
    const unavailable = Object.values(dependencies).includes('down');
    if (unavailable) {
      return context.json(
        healthResponseSchema.parse({
          status: 'unavailable',
          dependencies,
        }),
        503,
      );
    }
    return context.json(
      healthResponseSchema.parse({ status: 'ready', dependencies }),
    );
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
    route(
      app,
      '/api/v1/auth',
      createAuthRouter(
        config,
        authServices.sessions,
        authServices.oauth,
        logger,
        authServices.shadowObserver,
        authServices.shared,
      ),
    );
    if (database.client) {
      if (
        config.nodeEnv === 'test' &&
        config.e2eAuthSecret &&
        config.e2eAuthUserEmail
      ) {
        route(
          app,
          '/api/v1/test-auth',
          createTestAuthRouter(config, database.client, authServices.sessions),
        );
      }
      route(
        app,
        '/api/v1',
        createLearningJourneyRouter(
          database.client,
          authServices.shared ?? authServices.sessions,
          authServices.shadowObserver,
        ),
      );
      route(
        app,
        '/api/v1',
        createResourceRouter(
          database.client,
          authServices.shared ?? authServices.sessions,
          authServices.shadowObserver,
          {
            accountsManagedByCentral: config.sharedSessionMode === 'shared',
            scopesManagedByCentral:
              config.sharedSessionMode === 'shared' &&
              (config.centralSyncIntervalMinutes ?? 0) > 0,
          },
        ),
      );
      route(
        app,
        '/api/v1',
        createObservationRouter(
          database.client,
          authServices.shared ?? authServices.sessions,
          authServices.shadowObserver,
        ),
      );
      route(
        app,
        '/api/v1',
        createIepRouter(
          database.client,
          authServices.shared ?? authServices.sessions,
          authServices.shadowObserver,
        ),
      );
      route(
        app,
        '/api/v1',
        createWeeklyReportRouter(
          database.client,
          authServices.shared ?? authServices.sessions,
          authServices.shadowObserver,
        ),
      );
      route(
        app,
        '/api/v1',
        createAggregateRouter(
          database.client,
          authServices.shared ?? authServices.sessions,
          authServices.shadowObserver,
        ),
      );
    }
  }

  app.get('/api/v1/version', (context) =>
    context.json(
      versionResponseSchema.parse({ name: 'learnspace-api', version }),
    ),
  );

  if (config.nodeEnv === 'test') {
    app.get('/__test/error', () => {
      throw new Error('test failure');
    });
  }

  app.notFound(async (context) => {
    await adaptHandler(notFoundMiddleware)(context, async () => undefined);
    return context.res;
  });
  const errorMiddleware = createErrorMiddleware(config, logger);
  app.onError(async (error, context) => {
    const { request, response } = httpAdapters(context);
    await errorMiddleware(error, request, response, async (nextError) => {
      if (nextError !== undefined) throw nextError;
    });
    return context.res;
  });

  return app;
}
