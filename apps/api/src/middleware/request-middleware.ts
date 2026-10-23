import { randomUUID } from 'node:crypto';
import type { Logger } from '../lib/logger.js';
import type { RequestHandler } from '../type/http.js';

export function createRequestMiddleware(logger: Logger): RequestHandler {
  return (request, response, next) => {
    const suppliedRequestId = request.header('x-request-id')?.trim();
    const requestId =
      suppliedRequestId && suppliedRequestId.length <= 128
        ? suppliedRequestId
        : randomUUID();
    response.locals.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    const startedAt = process.hrtime.bigint();
    return next().finally(() => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info(
        {
          requestId,
          method: request.method,
          path: request.originalUrl,
          status: response.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
        },
        'request completed',
      );
    });
  };
}
