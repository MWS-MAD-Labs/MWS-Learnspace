import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createFixedWindowRateLimit } from '../src/httpSecurity.js';
import type { AppConfig } from '../src/config.js';
import type { Database } from '../src/database.js';
import type { Logger } from '../src/logger.js';

const baseConfig: AppConfig = {
  nodeEnv: 'test',
  port: 4000,
  databaseUrl: 'postgresql://localhost/learnspace',
  appUrl: 'https://learnspace.example.org/app',
  sessionSecret: 'a-secure-session-secret-with-32-characters',
  googleClientId: 'client',
  googleClientSecret: 'secret',
  googleAllowedDomains: [],
  googleRedirectUri: 'https://learnspace.example.org/api/v1/auth/callback',
  authAdmissionMode: 'DENY_UNKNOWN',
  sessionTtlHours: 24,
  logLevel: 'info',
};

const logger: Logger = {
  fatal: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

const database: Database = {
  check: async () => undefined,
  close: async () => undefined,
};

function app(config: AppConfig = baseConfig) {
  return createApp({ config, database, logger });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HTTP security', () => {
  it('sets restrictive API response headers', async () => {
    const response = await request(app()).get('/health/live');

    expect(response.headers).toMatchObject({
      'content-security-policy':
        "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
      'permissions-policy': 'camera=(), geolocation=(), microphone=()',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
    });
  });

  it('allows only the exact APP_URL origin with credentials', async () => {
    const allowed = await request(app())
      .get('/api/v1/version')
      .set('origin', 'https://learnspace.example.org');
    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'https://learnspace.example.org',
    );
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    expect(allowed.headers.vary).toContain('Origin');

    const denied = await request(app())
      .get('/api/v1/version')
      .set('origin', 'https://attacker.example.org');
    expect(denied.status).toBe(403);
    expect(denied.body.error).toMatchObject({ code: 'CORS_ORIGIN_DENIED' });
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rate-limits repeated disallowed-origin requests', async () => {
    const limitedApp = app({
      ...baseConfig,
      apiRateLimitRequests: 1,
      authRateLimitRequests: 10,
    });

    const denied = await request(limitedApp)
      .get('/api/v1/version')
      .set('origin', 'https://attacker.example.org');
    expect(denied.status).toBe(403);
    expect(denied.headers['ratelimit-limit']).toBe('1');

    const blocked = await request(limitedApp)
      .get('/api/v1/version')
      .set('origin', 'https://attacker.example.org');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
    });
  });

  it('answers allowed preflight requests without broad wildcards', async () => {
    const response = await request(app())
      .options('/api/v1/version')
      .set('origin', 'https://learnspace.example.org')
      .set('access-control-request-method', 'PATCH')
      .set('access-control-request-headers', 'x-csrf-token, content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://learnspace.example.org',
    );
    expect(response.headers['access-control-allow-methods']).toContain('PATCH');
    expect(response.headers['access-control-allow-headers']).toContain(
      'X-CSRF-Token',
    );
    expect(response.headers['access-control-allow-origin']).not.toBe('*');
    expect(response.headers['access-control-allow-headers']).not.toBe('*');
  });

  it('rejects preflights that request unsupported methods or headers', async () => {
    const unsupportedMethod = await request(app())
      .options('/api/v1/version')
      .set('origin', 'https://learnspace.example.org')
      .set('access-control-request-method', 'TRACE');
    expect(unsupportedMethod.status).toBe(403);
    expect(unsupportedMethod.body.error).toMatchObject({
      code: 'CORS_PREFLIGHT_DENIED',
    });

    const unsupportedHeader = await request(app())
      .options('/api/v1/version')
      .set('origin', 'https://learnspace.example.org')
      .set('access-control-request-method', 'GET')
      .set('access-control-request-headers', 'authorization');
    expect(unsupportedHeader.status).toBe(403);
    expect(unsupportedHeader.body.error).toMatchObject({
      code: 'CORS_PREFLIGHT_DENIED',
    });
    expect(
      unsupportedHeader.headers['access-control-allow-headers'],
    ).toBeUndefined();
  });

  it('rate-limits API requests with standard headers and the API envelope', async () => {
    const limitedApp = app({
      ...baseConfig,
      apiRateLimitRequests: 1,
      apiRateLimitWindowSeconds: 60,
      authRateLimitRequests: 10,
    });

    const first = await request(limitedApp).get('/api/v1/version');
    expect(first.status).toBe(200);
    expect(first.headers['ratelimit-limit']).toBe('1');
    expect(first.headers['ratelimit-remaining']).toBe('0');
    expect(Number(first.headers['ratelimit-reset'])).toBeGreaterThan(0);

    const blocked = await request(limitedApp).get('/api/v1/version');
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeTruthy();
    expect(blocked.body.error).toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    });
    expect(blocked.body.error.requestId).toBeTruthy();
  });

  it('excludes health checks from API rate limits', async () => {
    const limitedApp = app({
      ...baseConfig,
      apiRateLimitRequests: 1,
      authRateLimitRequests: 1,
    });

    expect((await request(limitedApp).get('/health/live')).status).toBe(200);
    expect((await request(limitedApp).get('/health/live')).status).toBe(200);
    expect((await request(limitedApp).get('/health/ready')).status).toBe(200);
  });

  it('starts a new fixed window after the configured duration', async () => {
    let currentTime = 1_000;
    const fixedWindowApp = express();
    fixedWindowApp.use((_, response, next) => {
      response.locals.requestId = 'fixed-window-request';
      next();
    });
    fixedWindowApp.use(
      createFixedWindowRateLimit(
        { limit: 1, windowMs: 1_000 },
        () => currentTime,
      ),
    );
    fixedWindowApp.get('/', (_request, response) => response.sendStatus(204));

    expect((await request(fixedWindowApp).get('/')).status).toBe(204);
    expect((await request(fixedWindowApp).get('/')).status).toBe(429);
    currentTime = 2_000;
    const reset = await request(fixedWindowApp).get('/');
    expect(reset.status).toBe(204);
    expect(reset.headers['ratelimit-remaining']).toBe('0');
  });

  it('applies a tighter independent limit to authentication routes', async () => {
    const limitedApp = app({
      ...baseConfig,
      apiRateLimitRequests: 10,
      authRateLimitRequests: 1,
      authRateLimitWindowSeconds: 60,
    });

    const first = await request(limitedApp).get('/api/v1/auth/unknown');
    expect(first.status).toBe(404);
    expect(first.headers['ratelimit-limit']).toBe('1');
    const blocked = await request(limitedApp).get('/api/v1/auth/unknown');
    expect(blocked.status).toBe(429);
    expect(blocked.headers['ratelimit-limit']).toBe('1');
  });

  it('disables proxy trust by default and accepts only configured proxies', async () => {
    const untrustedApp = app({ ...baseConfig, apiRateLimitRequests: 1 });
    expect(untrustedApp.get('trust proxy')).toBe(false);
    expect(
      app({ ...baseConfig, trustedProxies: ['loopback', '10.0.0.0/8'] }).get(
        'trust proxy',
      ),
    ).toEqual(['loopback', '10.0.0.0/8']);

    expect(
      (
        await request(untrustedApp)
          .get('/api/v1/version')
          .set('x-forwarded-for', '198.51.100.10')
      ).status,
    ).toBe(200);
    expect(
      (
        await request(untrustedApp)
          .get('/api/v1/version')
          .set('x-forwarded-for', '198.51.100.11')
      ).status,
    ).toBe(429);

    const trustedApp = app({
      ...baseConfig,
      trustedProxies: ['loopback'],
      apiRateLimitRequests: 1,
    });
    expect(
      (
        await request(trustedApp)
          .get('/api/v1/version')
          .set('x-forwarded-for', '198.51.100.10')
      ).status,
    ).toBe(200);
    expect(
      (
        await request(trustedApp)
          .get('/api/v1/version')
          .set('x-forwarded-for', '198.51.100.11')
      ).status,
    ).toBe(200);
  });

  it('logs only the path and strips OAuth code and state query values', async () => {
    await request(app()).get(
      '/api/v1/auth/callback?code=secret-code&state=secret-state',
    );

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/v1/auth/callback' }),
      'request completed',
    );
    const loggedFields = vi.mocked(logger.info).mock.calls.at(-1)?.[0];
    expect(JSON.stringify(loggedFields)).not.toContain('secret-code');
    expect(JSON.stringify(loggedFields)).not.toContain('secret-state');
  });
});
