import { randomUUID } from 'node:crypto';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import express from 'express';
import {
  apiErrorSchema,
  healthResponseSchema,
  versionResponseSchema,
} from '@learnspace/contracts';
import type { AppConfig } from './config.js';
import type { Database } from './database.js';
import type { Logger } from './logger.js';
import { createAuthRouter } from './authRoutes.js';
import { OAuthService } from './oauthService.js';
import { SessionService } from './sessionService.js';
import { HttpError } from './httpErrors.js';
import { createLearningJourneyRouter } from './learningJourneyRoutes.js';
import { createResourceRouter } from './resourceRoutes.js';
import { createObservationRouter } from './observationRoutes.js';
import { createIepRouter } from './iepRoutes.js';
import { createWeeklyReportRouter } from './weeklyReportRoutes.js';
import { createAggregateRouter } from './aggregateRoutes.js';
import { createTestAuthRouter } from './testAuthRoutes.js';
import {
  configureTrustedProxies,
  createExactOriginCors,
  createFixedWindowRateLimit,
  createSecurityHeaders,
} from './httpSecurity.js';
import {
  createObservability,
  createTraceContext,
  normalizeRoutePath,
  type Observability,
} from './observability.js';

export type AppDependencies = {
  config: AppConfig;
  database: Database;
  logger: Logger;
  version?: string;
  auth?: {
    sessions: SessionService;
    oauth: OAuthService;
  };
  observability?: Observability;
};

export function createApp({
  config,
  database,
  logger,
  version = '0.2.0',
  auth,
  observability = createObservability(),
}: AppDependencies) {
  const app = express();
  app.disable('x-powered-by');
  configureTrustedProxies(app, config);
  app.use(createSecurityHeaders());

  app.use((request, response, next) => {
    const suppliedRequestId = request.header('x-request-id')?.trim();
    const requestId =
      suppliedRequestId && suppliedRequestId.length <= 128
        ? suppliedRequestId
        : randomUUID();
    const trace = createTraceContext(request.header('traceparent'));
    response.locals.requestId = requestId;
    response.locals.traceId = trace.traceId;
    response.setHeader('x-request-id', requestId);
    response.setHeader('traceparent', trace.traceparent);
    response.setHeader('x-trace-id', trace.traceId);

    const originalJson = response.json.bind(response);
    response.json = ((body: unknown) => {
      const errorCode =
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof body.error === 'object' &&
        body.error !== null &&
        'code' in body.error
          ? body.error.code
          : undefined;
      if (typeof errorCode === 'string') response.locals.errorCode = errorCode;
      return originalJson(body);
    }) as typeof response.json;

    const startedAt = process.hrtime.bigint();
    response.on('finish', () => {
      const durationSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      observability.observeHttpRequest(
        request.method,
        request.originalUrl,
        response.statusCode,
        durationSeconds,
      );
      if (response.statusCode === 403) {
        observability.observeForbidden(response.locals.errorCode);
      }
      logger.info(
        {
          requestId,
          traceId: trace.traceId,
          method: request.method,
          path: normalizeRoutePath(request.originalUrl),
          route: normalizeRoutePath(request.originalUrl),
          status: response.statusCode,
          durationMs: Number((durationSeconds * 1000).toFixed(2)),
        },
        'request completed',
      );
    });

    next();
  });

  app.use(
    '/api/v1/auth',
    createFixedWindowRateLimit({
      limit: config.authRateLimitRequests ?? 30,
      windowMs: (config.authRateLimitWindowSeconds ?? 60) * 1000,
    }),
  );
  app.use(
    '/api/v1',
    createFixedWindowRateLimit({
      limit: config.apiRateLimitRequests ?? 600,
      windowMs: (config.apiRateLimitWindowSeconds ?? 60) * 1000,
    }),
  );
  app.use(createExactOriginCors(config.appUrl));
  app.use(express.json({ limit: '100kb' }));

  app.get('/metrics', async (_request, response) => {
    await observability.collectDatabaseConnectionUtilization(database.client);
    response.setHeader(
      'content-type',
      'text/plain; version=0.0.4; charset=utf-8',
    );
    response.setHeader('cache-control', 'no-store');
    response.send(observability.renderPrometheus());
  });

  app.get('/health/live', (_request, response) => {
    response.json(healthResponseSchema.parse({ status: 'live' }));
  });

  app.get('/health/ready', async (_request, response, next) => {
    try {
      await database.check();
      observability.setDatabaseUp(true);
      response.json(
        healthResponseSchema.parse({
          status: 'ready',
          dependencies: { database: 'up' },
        }),
      );
    } catch (error) {
      observability.setDatabaseUp(false);
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

  app.get('/api/v1/version', (_request, response) => {
    response.json(
      versionResponseSchema.parse({ name: 'learnspace-api', version }),
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
    app.use(
      '/api/v1/auth',
      createAuthRouter(
        config,
        authServices.sessions,
        authServices.oauth,
        logger,
        observability.observeLoginFailure,
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

  if (config.nodeEnv === 'test') {
    app.get('/__test/error', () => {
      throw new Error('test failure');
    });
    app.get('/__test/authorization-denied', () => {
      throw new HttpError(
        403,
        'AUTHORIZATION_DENIED',
        'The request was denied.',
      );
    });
  }

  const notFound: RequestHandler = (_request, response) => {
    response.status(404).json(
      apiErrorSchema.parse({
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found.',
          requestId: response.locals.requestId,
        },
      }),
    );
  };

  const errorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next,
  ) => {
    const requestId = String(response.locals.requestId ?? randomUUID());
    const httpError = error as {
      body?: unknown;
      status?: number;
      statusCode?: number;
      type?: string;
    };
    const isPayloadTooLarge =
      httpError.status === 413 ||
      httpError.statusCode === 413 ||
      httpError.type === 'entity.too.large';
    const isInvalidJson = error instanceof SyntaxError && 'body' in httpError;
    const status =
      error instanceof HttpError
        ? error.status
        : isPayloadTooLarge
          ? 413
          : isInvalidJson
            ? 400
            : 500;
    const code =
      error instanceof HttpError
        ? error.code
        : isPayloadTooLarge
          ? 'PAYLOAD_TOO_LARGE'
          : isInvalidJson
            ? 'INVALID_JSON'
            : 'INTERNAL_SERVER_ERROR';
    const message =
      error instanceof HttpError
        ? error.message
        : isPayloadTooLarge
          ? 'The request body exceeds the allowed size.'
          : isInvalidJson
            ? 'The request body is not valid JSON.'
            : 'An unexpected error occurred.';

    logger.error(
      {
        requestId,
        traceId: response.locals.traceId,
        error: error instanceof Error ? error.message : 'unknown error',
        ...(config.nodeEnv === 'production'
          ? {}
          : { stack: error instanceof Error ? error.stack : undefined }),
      },
      'request failed',
    );

    response.status(status).json(
      apiErrorSchema.parse({
        error: {
          code,
          message,
          requestId,
          ...(error instanceof HttpError && error.details !== undefined
            ? { details: error.details }
            : {}),
        },
      }),
    );
  };

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
