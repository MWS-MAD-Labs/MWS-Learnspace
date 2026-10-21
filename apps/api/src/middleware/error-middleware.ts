import { randomUUID } from 'node:crypto';
import { apiErrorSchema } from '@learnspace/contracts';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { AppConfig } from '../lib/config.js';
import type { Logger } from '../lib/logger.js';
import { HttpError } from './http-errors.js';

export const notFoundMiddleware: RequestHandler = (_request, response) => {
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

export function createErrorMiddleware(
  config: AppConfig,
  logger: Logger,
): ErrorRequestHandler {
  return (error, _request, response, _next) => {
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
}
