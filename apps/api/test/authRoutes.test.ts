import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createAuthRouter, createCsrfProtection } from '../src/authRoutes.js';
import type { AppConfig } from '../src/config.js';
import { appendCookie } from '../src/httpCookies.js';

function csrfApp() {
  const app = express();
  app.use((_, response, next) => {
    response.locals.requestId = 'request-auth';
    next();
  });
  app.post('/protected', createCsrfProtection(), (_request, response) => {
    response.status(204).end();
  });
  return app;
}

const config: AppConfig = {
  nodeEnv: 'test',
  port: 4000,
  databaseUrl: 'postgresql://localhost/learnspace',
  appUrl: 'http://localhost:3000',
  sessionSecret: 'a-secure-session-secret-with-32-characters',
  googleClientId: 'client',
  googleClientSecret: 'secret',
  googleAllowedDomains: [],
  googleRedirectUri: 'http://localhost:3000/api/v1/auth/callback',
  authAdmissionMode: 'DENY_UNKNOWN',

  sessionTtlHours: 24,
  logLevel: 'info',
};

describe('authentication HTTP protections', () => {
  it('sets bounded production session cookie attributes', () => {
    const response = {
      getHeader: () => undefined,
      setHeader: vi.fn(),
    };
    appendCookie(response as never, 'learnspace_session', 'opaque-value', {
      httpOnly: true,
      maxAgeSeconds: 3600,
      sameSite: 'Strict',
      secure: true,
    });
    expect(response.setHeader).toHaveBeenCalledWith('set-cookie', [
      expect.stringContaining('HttpOnly'),
    ]);
    const cookie = response.setHeader.mock.calls[0][1][0];
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=3600');
  });

  it('revokes any pre-login session before creating the authenticated session', async () => {
    const sessions = {
      revoke: vi.fn(async () => undefined),
      create: vi.fn(async () => ({
        token: 'new-session-token',
        expiresAt: new Date('2026-08-21T00:00:00.000Z'),
      })),
    };
    const oauth = {
      callback: vi.fn(async () => ({
        user: { id: '11111111-1111-4111-8111-111111111111' },
        redirectPath: '/',
      })),
    };
    const logger = { warn: vi.fn() };
    const app = express();
    app.use((_, response, next) => {
      response.locals.requestId = 'request-auth';
      next();
    });
    app.use(
      '/api/v1/auth',
      createAuthRouter(
        config,
        sessions as never,
        oauth as never,
        logger as never,
      ),
    );

    const response = await request(app)
      .get('/api/v1/auth/callback?code=code&state=state')
      .set(
        'cookie',
        'learnspace_oauth=sealed-context; learnspace_session=attacker-session',
      );

    expect(response.status).toBe(302);
    expect(sessions.revoke).toHaveBeenCalledWith('attacker-session');
    expect(sessions.revoke.mock.invocationCallOrder[0]).toBeLessThan(
      sessions.create.mock.invocationCallOrder[0],
    );
  });

  it('treats malformed cookie encoding as invalid input instead of throwing', async () => {
    const response = await request(csrfApp())
      .post('/protected')
      .set('cookie', 'learnspace_csrf=%')
      .set('x-csrf-token', 'different');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_VALIDATION_FAILED');
  });

  it('rejects missing and mismatched CSRF tokens', async () => {
    const missing = await request(csrfApp()).post('/protected');
    expect(missing.status).toBe(403);
    expect(missing.body.error.code).toBe('CSRF_VALIDATION_FAILED');

    const mismatched = await request(csrfApp())
      .post('/protected')
      .set('cookie', 'learnspace_csrf=cookie-token')
      .set('x-csrf-token', 'header-token');
    expect(mismatched.status).toBe(403);
  });

  it('accepts the double-submit token only when both values match', async () => {
    const response = await request(csrfApp())
      .post('/protected')
      .set('cookie', 'learnspace_csrf=matching-token')
      .set('x-csrf-token', 'matching-token');
    expect(response.status).toBe(204);
  });
});
