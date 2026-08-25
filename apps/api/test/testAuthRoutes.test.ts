import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../src/config.js';
import {
  createTestAuthRouter,
  e2eAuthHeaderName,
  e2eAuthUserHeaderName,
} from '../src/testAuthRoutes.js';

const testConfig: AppConfig = {
  nodeEnv: 'test',
  port: 4000,
  databaseUrl: 'postgresql://localhost/learnspace',
  appUrl: 'http://localhost:3000',
  sessionSecret: 'a-secure-session-secret-with-32-characters',
  googleClientId: 'development-placeholder',
  googleClientSecret: 'development-placeholder',
  googleAllowedDomains: [],
  googleRedirectUri: 'http://localhost:3000/api/v1/auth/callback',
  authAdmissionMode: 'DENY_UNKNOWN',
  sessionTtlHours: 24,
  logLevel: 'info',
  e2eAuthSecret: 'e2e-only-secret-with-at-least-32-characters',
  e2eAuthUserEmail: 'attendance.teacher@example.test',
};

function testApp(config: AppConfig = testConfig) {
  const prisma = {
    user: {
      findFirst: vi.fn(async () => ({
        id: '11111111-1111-4111-8111-111111111111',
      })),
    },
  };
  const sessions = {
    revoke: vi.fn(async () => undefined),
    create: vi.fn(async () => ({
      token: 'real-session-token',
      expiresAt: new Date('2026-08-25T00:00:00.000Z'),
    })),
  };
  const app = express();
  app.use((_, response, next) => {
    response.locals.requestId = 'test-auth-request';
    next();
  });
  app.use(
    '/api/v1/test-auth',
    createTestAuthRouter(config, prisma as never, sessions as never),
  );
  return { app, prisma, sessions };
}

describe('test-only authentication router', () => {
  it('rejects creation outside the test environment', () => {
    expect(() => testApp({ ...testConfig, nodeEnv: 'production' })).toThrow(
      'Test authentication is not enabled.',
    );
  });

  it('returns a non-enumerating 404 for a missing or wrong secret', async () => {
    const { app, sessions } = testApp();

    const missing = await request(app).post('/api/v1/test-auth/session');
    const wrong = await request(app)
      .post('/api/v1/test-auth/session')
      .set(e2eAuthHeaderName, 'wrong-secret-with-at-least-32-characters');

    expect(missing.status).toBe(404);
    expect(wrong.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('creates a real session and non-secure local CSRF cookies for the configured fixture user', async () => {
    const { app, prisma, sessions } = testApp();

    const response = await request(app)
      .post('/api/v1/test-auth/session')
      .set(e2eAuthHeaderName, testConfig.e2eAuthSecret!);

    expect(response.status).toBe(204);
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ email: testConfig.e2eAuthUserEmail }),
      }),
    );
    expect(sessions.create).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
    );
    const setCookies = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie']
      : [response.headers['set-cookie']];
    expect(setCookies).toEqual([
      expect.stringContaining('learnspace_session=real-session-token'),
      expect.stringContaining('learnspace_csrf='),
    ]);
    expect(setCookies.join(';')).not.toContain('Secure');
    expect(setCookies[0]).toContain('HttpOnly');
    expect(setCookies[1]).not.toContain('HttpOnly');
  });

  it('allows the secret-gated test harness to select another seeded fixture user', async () => {
    const { app, prisma } = testApp();

    const response = await request(app)
      .post('/api/v1/test-auth/session')
      .set(e2eAuthHeaderName, testConfig.e2eAuthSecret!)
      .set(e2eAuthUserHeaderName, 'director@example.test');

    expect(response.status).toBe(204);
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ email: 'director@example.test' }),
      }),
    );
  });
});
