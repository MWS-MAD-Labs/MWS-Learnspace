import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const validEnvironment = {
  NODE_ENV: 'production',
  PORT: '4000',
  DATABASE_URL: 'postgresql://learnspace:password@db:5432/learnspace',
  APP_URL: 'https://learnspace.example.org',
  SESSION_SECRET: 'a-secure-session-secret-with-32-characters',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  GOOGLE_ALLOWED_DOMAINS: 'example.org, school.example.org',
  GOOGLE_REDIRECT_URI: 'https://api.example.org/api/v1/auth/callback',
  AUTH_ADMISSION_MODE: 'INVITE_ONLY',

  SESSION_TTL_HOURS: '24',
  LOG_LEVEL: 'info',
};

describe('loadConfig', () => {
  it('parses valid configuration', () => {
    expect(loadConfig(validEnvironment)).toMatchObject({
      port: 4000,
      googleAllowedDomains: ['example.org', 'school.example.org'],
      googleRedirectUri: 'https://api.example.org/api/v1/auth/callback',
      authAdmissionMode: 'INVITE_ONLY',
      sessionTtlHours: 24,
    });
  });

  it('rejects missing configuration without printing values', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it('rejects malformed configuration', () => {
    expect(() =>
      loadConfig({ ...validEnvironment, APP_URL: 'not-a-url' }),
    ).toThrow(/APP_URL/);
  });

  it('rejects weak or documented placeholder secrets', () => {
    expect(() =>
      loadConfig({ ...validEnvironment, SESSION_SECRET: 'short' }),
    ).toThrow(/SESSION_SECRET/);
    expect(() =>
      loadConfig({
        ...validEnvironment,
        SESSION_SECRET: 'replace-with-at-least-32-random-bytes',
      }),
    ).toThrow(/SESSION_SECRET/);
  });

  it('allows OAuth placeholders only when explicitly enabled in development or in test', () => {
    const developmentEnvironment = {
      ...validEnvironment,
      NODE_ENV: 'development',
      GOOGLE_CLIENT_ID: 'development-placeholder',
      GOOGLE_CLIENT_SECRET: 'development-placeholder',
      ALLOW_DEVELOPMENT_AUTH_PLACEHOLDERS: 'true',
    };

    expect(loadConfig(developmentEnvironment).nodeEnv).toBe('development');
    expect(() =>
      loadConfig({ ...developmentEnvironment, NODE_ENV: 'production' }),
    ).toThrow(/OAuth credentials/);
    expect(
      loadConfig({
        ...developmentEnvironment,
        NODE_ENV: 'test',
        ALLOW_DEVELOPMENT_AUTH_PLACEHOLDERS: 'false',
      }).nodeEnv,
    ).toBe('test');
  });

  it('allows paired E2E authentication configuration only in test', () => {
    const e2eEnvironment = {
      ...validEnvironment,
      NODE_ENV: 'test',
      E2E_AUTH_SECRET: 'e2e-only-secret-with-at-least-32-characters',
      E2E_AUTH_USER_EMAIL: 'Attendance.Teacher@example.test',
    };

    expect(loadConfig(e2eEnvironment)).toMatchObject({
      e2eAuthSecret: e2eEnvironment.E2E_AUTH_SECRET,
      e2eAuthUserEmail: 'attendance.teacher@example.test',
    });
    expect(() =>
      loadConfig({ ...e2eEnvironment, NODE_ENV: 'production' }),
    ).toThrow(/E2E authentication/);
    expect(() =>
      loadConfig({ ...e2eEnvironment, E2E_AUTH_USER_EMAIL: undefined }),
    ).toThrow(/E2E authentication/);
  });
});
