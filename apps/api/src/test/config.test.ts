import { describe, expect, it } from 'vitest';
import { loadConfig } from '../lib/config.js';

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
      sharedSessionMode: 'off',
      sharedSessionEntitlementCacheSeconds: 30,
    });
  });

  it('preserves existing configuration when shared session mode is off', () => {
    const config = loadConfig({
      ...validEnvironment,
      HUB_BASE_URL: '',
      HUB_ACCESS_COOKIE_NAME: '',
      CENTRAL_API_BASE_URL: '',
      CENTRAL_API_TOKEN: '',
      CENTRAL_ORGANIZATION_ID: '',
      SHARED_SESSION_LOCAL_ORGANIZATION_ID: '',
    });
    expect(config.sharedSessionMode).toBe('off');
    expect(config.hubBaseUrl).toBeUndefined();
    expect(config.centralApiBaseUrl).toBeUndefined();
  });

  it('validates all Hub and Central settings in shadow mode', () => {
    expect(() =>
      loadConfig({ ...validEnvironment, SHARED_SESSION_MODE: 'shadow' }),
    ).toThrow(/shared session Hub\/Central configuration/);

    expect(
      loadConfig({
        ...validEnvironment,
        SHARED_SESSION_MODE: 'shadow',
        HUB_BASE_URL: 'https://app.mws.web.id/',
        HUB_ACCESS_COOKIE_NAME: 'hub_at_stg',
        CENTRAL_API_BASE_URL: 'https://db.mws.web.id/api/internal/',
        CENTRAL_API_TOKEN: 'central-token',
        CENTRAL_ORGANIZATION_ID: 'org-learnspace',
        SHARED_SESSION_LOCAL_ORGANIZATION_ID:
          '10000000-0000-4000-8000-000000000001',
        CENTRAL_API_TIMEOUT_MS: '2500',
        SHARED_SESSION_ENTITLEMENT_CACHE_SECONDS: '30',
        SHARED_SESSION_LOG_MATCHES: 'true',
      }),
    ).toMatchObject({
      sharedSessionMode: 'shadow',
      hubBaseUrl: 'https://app.mws.web.id',
      hubAccessCookieName: 'hub_at_stg',
      centralApiBaseUrl: 'https://db.mws.web.id/api/internal',
      applicationId: 'learnspace',
      centralApiTimeoutMs: 2500,
      sharedSessionLocalOrganizationId: '10000000-0000-4000-8000-000000000001',
      sharedSessionEntitlementCacheSeconds: 30,
      sharedSessionLogMatches: true,
    });
  });

  it('resolves the canonical Hub SSO application ID and legacy alias', () => {
    expect(
      loadConfig({ ...validEnvironment, HUB_SSO_APP_ID: 'canonical-app' })
        .applicationId,
    ).toBe('canonical-app');
    expect(
      loadConfig({
        ...validEnvironment,
        CENTRAL_APPLICATION_ID: 'legacy-app',
      }).applicationId,
    ).toBe('legacy-app');
    expect(
      loadConfig({
        ...validEnvironment,
        HUB_SSO_APP_ID: 'same-app',
        CENTRAL_APPLICATION_ID: 'same-app',
      }).applicationId,
    ).toBe('same-app');
  });

  it('defaults the application ID and rejects conflicting aliases', () => {
    expect(loadConfig(validEnvironment).applicationId).toBe('learnspace');
    expect(() =>
      loadConfig({
        ...validEnvironment,
        HUB_SSO_APP_ID: 'canonical-app',
        CENTRAL_APPLICATION_ID: 'legacy-app',
      }),
    ).toThrow(/HUB_SSO_APP_ID and CENTRAL_APPLICATION_ID must match/);
  });

  it('requires the same complete configuration in shared mode', () => {
    expect(() =>
      loadConfig({ ...validEnvironment, SHARED_SESSION_MODE: 'shared' }),
    ).toThrow(/shared session Hub\/Central configuration/);
    expect(
      loadConfig({
        ...validEnvironment,
        SHARED_SESSION_MODE: 'shared',
        HUB_BASE_URL: 'https://app.mws.web.id',
        CENTRAL_API_BASE_URL: 'https://db.mws.web.id',
        CENTRAL_API_TOKEN: 'central-token',
        CENTRAL_ORGANIZATION_ID: 'central-organization',
      }).sharedSessionMode,
    ).toBe('shared');
  });

  it('treats the local organization as an optional migration hint', () => {
    for (const mode of ['shadow', 'shared'] as const) {
      expect(
        loadConfig({
          ...validEnvironment,
          SHARED_SESSION_MODE: mode,
          HUB_BASE_URL: 'https://app.mws.web.id',
          CENTRAL_API_BASE_URL: 'https://db.mws.web.id',
          CENTRAL_API_TOKEN: 'central-token',
          CENTRAL_ORGANIZATION_ID: 'central-organization',
        }).sharedSessionLocalOrganizationId,
      ).toBeUndefined();
    }
  });

  it('requires a UUID local organization in shadow mode', () => {
    expect(() =>
      loadConfig({
        ...validEnvironment,
        SHARED_SESSION_MODE: 'shadow',
        HUB_BASE_URL: 'https://app.mws.web.id',
        CENTRAL_API_BASE_URL: 'https://db.mws.web.id',
        CENTRAL_API_TOKEN: 'central-token',
        CENTRAL_ORGANIZATION_ID: 'central-organization',
        SHARED_SESSION_LOCAL_ORGANIZATION_ID: 'not-a-uuid',
      }),
    ).toThrow(/SHARED_SESSION_LOCAL_ORGANIZATION_ID/);
  });

  it('rejects unsafe Central URLs and HTTP shadow dependencies in production', () => {
    const shadowEnvironment = {
      ...validEnvironment,
      SHARED_SESSION_MODE: 'shadow',
      HUB_BASE_URL: 'https://app.mws.web.id',
      CENTRAL_API_TOKEN: 'central-token',
      CENTRAL_ORGANIZATION_ID: 'central-organization',
      SHARED_SESSION_LOCAL_ORGANIZATION_ID:
        '10000000-0000-4000-8000-000000000001',
    };
    expect(() =>
      loadConfig({
        ...shadowEnvironment,
        CENTRAL_API_BASE_URL: 'https://db.mws.web.id/other',
      }),
    ).toThrow(/CENTRAL_API_BASE_URL/);
    expect(() =>
      loadConfig({
        ...shadowEnvironment,
        CENTRAL_API_BASE_URL: 'https://db.mws.web.id//',
      }),
    ).toThrow(/CENTRAL_API_BASE_URL/);
    expect(() =>
      loadConfig({
        ...shadowEnvironment,
        CENTRAL_API_BASE_URL: 'https://db.mws.web.id/api/internal?debug=true',
      }),
    ).toThrow(/CENTRAL_API_BASE_URL/);
    expect(() =>
      loadConfig({
        ...shadowEnvironment,
        CENTRAL_API_BASE_URL: 'http://db.mws.web.id',
      }),
    ).toThrow(/must use HTTPS/);
    expect(() =>
      loadConfig({
        ...shadowEnvironment,
        HUB_BASE_URL: 'http://app.mws.web.id',
        CENTRAL_API_BASE_URL: 'https://db.mws.web.id',
      }),
    ).toThrow(/must use HTTPS/);
    expect(() =>
      loadConfig({
        ...validEnvironment,
        HUB_BASE_URL: 'http://app.mws.web.id',
      }),
    ).toThrow(/must use HTTPS/);
    expect(() =>
      loadConfig({
        ...validEnvironment,
        CENTRAL_API_BASE_URL: 'http://db.mws.web.id',
      }),
    ).toThrow(/must use HTTPS/);
  });

  it('validates timeout, cache, and match logging settings', () => {
    expect(() =>
      loadConfig({ ...validEnvironment, CENTRAL_API_TIMEOUT_MS: '99' }),
    ).toThrow(/CENTRAL_API_TIMEOUT_MS/);
    expect(() =>
      loadConfig({
        ...validEnvironment,
        SHARED_SESSION_ENTITLEMENT_CACHE_SECONDS: '3601',
      }),
    ).toThrow(/SHARED_SESSION_ENTITLEMENT_CACHE_SECONDS/);
    expect(() =>
      loadConfig({ ...validEnvironment, SHARED_SESSION_LOG_MATCHES: 'yes' }),
    ).toThrow(/SHARED_SESSION_LOG_MATCHES/);
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
