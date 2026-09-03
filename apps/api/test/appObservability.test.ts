import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AppConfig } from '../src/config.js';
import type { Logger } from '../src/logger.js';
import { OAuthDeniedError } from '../src/oauthService.js';
import { createObservability } from '../src/observability.js';

const config: AppConfig = {
  nodeEnv: 'test',
  port: 4000,
  databaseUrl: 'postgresql://localhost/learnspace',
  appUrl: 'https://learnspace.example.org',
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

function dependencies() {
  const observability = createObservability();
  const sessions = {
    lookup: vi.fn(async () => ({
      id: 'private-session',
      userId: 'private-user',
      user: { memberships: [] },
    })),
    revoke: vi.fn(async () => undefined),
  };
  const oauth = {
    callback: vi.fn(async () => {
      throw new OAuthDeniedError('ACCOUNT_DISABLED');
    }),
  };
  const app = createApp({
    config,
    database: {
      check: async () => undefined,
      close: async () => undefined,
    },
    logger,
    auth: { sessions, oauth } as never,
    observability,
  });
  return { app, oauth, observability };
}

describe('API observability middleware', () => {
  it('propagates valid W3C trace context and logs only a normalized route', async () => {
    const { app } = dependencies();
    const traceparent =
      '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const response = await request(app)
      .get('/api/v1/version?email=private@example.org')
      .set('traceparent', traceparent);

    expect(response.headers.traceparent).toBe(traceparent);
    expect(response.headers['x-trace-id']).toBe(
      '4bf92f3577b34da6a3ce929d0e0e4736',
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        route: '/api/v1/version',
      }),
      'request completed',
    );
    expect(JSON.stringify(vi.mocked(logger.info).mock.calls)).not.toContain(
      'private@example.org',
    );
  });

  it('exports safe login, CSRF, and CORS metrics from the internal endpoint', async () => {
    const { app, oauth } = dependencies();

    await request(app)
      .get('/api/v1/auth/callback?code=code&state=state')
      .set('cookie', 'learnspace_oauth=sealed-context');
    const csrf = await request(app).post('/api/v1/auth/logout');
    expect(csrf.status).toBe(403);
    const cors = await request(app)
      .get('/api/v1/version')
      .set('origin', 'https://attacker.example.org');
    expect(cors.status).toBe(403);
    const authorization = await request(app).get(
      '/__test/authorization-denied',
    );
    expect(authorization.status).toBe(403);

    const metrics = await request(app).get('/metrics');
    expect(metrics.status).toBe(200);
    expect(metrics.headers['content-type']).toContain('text/plain');
    expect(metrics.headers['cache-control']).toBe('no-store');
    expect(oauth.callback).toHaveBeenCalled();
    expect(metrics.text).toContain(
      'learnspace_login_failures_total{reason="ACCOUNT_DISABLED"} 1',
    );
    expect(metrics.text).toContain(
      'learnspace_http_forbidden_total{reason="authorization"} 1',
    );
    expect(metrics.text).toContain(
      'learnspace_http_forbidden_total{reason="csrf"} 1',
    );
    expect(metrics.text).toContain(
      'learnspace_http_forbidden_total{reason="cors"} 1',
    );
    expect(metrics.text).not.toContain('sealed-context');
    expect(metrics.text).not.toContain('attacker.example.org');
  });
});
