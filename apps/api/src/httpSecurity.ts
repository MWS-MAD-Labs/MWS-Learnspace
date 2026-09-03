import type { Request, RequestHandler, Response } from 'express';
import { apiErrorSchema } from '@learnspace/contracts';
import type { AppConfig } from './config.js';

const corsAllowedHeaders = [
  'Accept',
  'Content-Type',
  'If-Match',
  'X-CSRF-Token',
  'X-Request-ID',
].join(', ');
const corsExposedHeaders = [
  'RateLimit-Limit',
  'RateLimit-Remaining',
  'RateLimit-Reset',
  'X-Request-ID',
].join(', ');
const corsAllowedMethods = [
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
] as const;
const corsAllowedMethodSet = new Set<string>(corsAllowedMethods);
const corsAllowedHeaderSet = new Set(
  corsAllowedHeaders.split(', ').map((header) => header.toLowerCase()),
);
const httpToken = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

export const apiContentSecurityPolicy = [
  "default-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
].join('; ');

export type FixedWindowRateLimit = {
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

function requestIdentity(request: Request): string {
  return request.ip || request.socket.remoteAddress || 'unknown';
}

function sendSecurityError(
  response: Response,
  status: number,
  code: string,
  message: string,
) {
  response.status(status).json(
    apiErrorSchema.parse({
      error: {
        code,
        message,
        requestId: String(response.locals.requestId),
      },
    }),
  );
}

export function createSecurityHeaders(): RequestHandler {
  return (_request, response, next) => {
    response.setHeader('Content-Security-Policy', apiContentSecurityPolicy);
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), geolocation=(), microphone=()',
    );
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    next();
  };
}

export function createExactOriginCors(appUrl: string): RequestHandler {
  const allowedOrigin = new URL(appUrl).origin;

  return (request, response, next) => {
    const origin = request.header('origin');
    if (!origin) {
      next();
      return;
    }

    response.vary('Origin');
    if (origin !== allowedOrigin) {
      sendSecurityError(
        response,
        403,
        'CORS_ORIGIN_DENIED',
        'The request origin is not allowed.',
      );
      return;
    }

    response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Expose-Headers', corsExposedHeaders);

    if (request.method === 'OPTIONS') {
      const requestedMethod = request
        .header('access-control-request-method')
        ?.trim()
        .toUpperCase();
      if (!requestedMethod) {
        next();
        return;
      }

      response.vary('Access-Control-Request-Method');
      response.vary('Access-Control-Request-Headers');
      const requestedHeaders = (
        request.header('access-control-request-headers') ?? ''
      )
        .split(',')
        .map((header) => header.trim().toLowerCase())
        .filter(Boolean);
      const validRequestedHeaders = requestedHeaders.every(
        (header) => httpToken.test(header) && corsAllowedHeaderSet.has(header),
      );
      if (
        !corsAllowedMethodSet.has(requestedMethod) ||
        !validRequestedHeaders
      ) {
        sendSecurityError(
          response,
          403,
          'CORS_PREFLIGHT_DENIED',
          'The CORS preflight request is not allowed.',
        );
        return;
      }

      response.setHeader('Access-Control-Allow-Headers', corsAllowedHeaders);
      response.setHeader(
        'Access-Control-Allow-Methods',
        corsAllowedMethods.join(', '),
      );
      response.setHeader('Access-Control-Max-Age', '600');
      response.status(204).end();
      return;
    }

    next();
  };
}

export function createFixedWindowRateLimit(
  options: FixedWindowRateLimit,
  now: () => number = Date.now,
): RequestHandler {
  const entries = new Map<string, RateLimitEntry>();
  let requestsUntilCleanup = 256;

  return (request, response, next) => {
    const currentTime = now();
    const key = requestIdentity(request);
    const existing = entries.get(key);
    const entry =
      existing && existing.resetAt > currentTime
        ? existing
        : { count: 0, resetAt: currentTime + options.windowMs };
    entry.count += 1;
    entries.set(key, entry);

    requestsUntilCleanup -= 1;
    if (requestsUntilCleanup === 0) {
      for (const [entryKey, candidate] of entries) {
        if (candidate.resetAt <= currentTime) entries.delete(entryKey);
      }
      requestsUntilCleanup = 256;
    }

    const remaining = Math.max(0, options.limit - entry.count);
    const resetSeconds = Math.max(
      0,
      Math.ceil((entry.resetAt - currentTime) / 1000),
    );
    if (!response.hasHeader('RateLimit-Limit')) {
      response.setHeader('RateLimit-Limit', String(options.limit));
      response.setHeader('RateLimit-Remaining', String(remaining));
      response.setHeader('RateLimit-Reset', String(resetSeconds));
    }

    if (entry.count > options.limit) {
      response.setHeader('Retry-After', String(resetSeconds));
      sendSecurityError(
        response,
        429,
        'RATE_LIMIT_EXCEEDED',
        'Too many requests. Please try again later.',
      );
      return;
    }

    next();
  };
}

export function configureTrustedProxies(
  app: { set: (setting: string, value: string | string[] | boolean) => void },
  config: Pick<AppConfig, 'trustedProxies'>,
) {
  const trustedProxies = config.trustedProxies ?? [];
  app.set('trust proxy', trustedProxies.length > 0 ? trustedProxies : false);
}
