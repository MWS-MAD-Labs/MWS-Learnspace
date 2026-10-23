import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../application/app.js';
import { createRequiredAuthentication } from '../middleware/auth-middleware.js';
import { createAuthRouter } from '../routes/auth-router.js';
import {
  SharedDependencyStateTracker,
  SharedSessionAuthenticationService,
} from '../service/shared-session-service.js';
import { permissionsForRole } from '../utils/authorization.js';
import type { AppConfig } from '../lib/config.js';
import { createRouter, type AuthenticatedRequest } from '../type/http.js';
import { httpTestClient } from './http-test-client.js';

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
  sharedSessionMode: 'shared',
  sessionTtlHours: 24,
  logLevel: 'info',
};

const claims = {
  iss: 'mws-hub',
  aud: 'mws-apps',
  sub: 'person-1',
  email: 'person@example.test',
  source: 'employee' as const,
  tags: [],
  sid: 'hub-session-1',
  jti: 'jti-1',
  iat: 1_800_000_000,
  exp: 1_900_000_000,
};

function entitlement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entitlement-1',
    person_id: 'person-1',
    application_id: 'learnspace',
    organization_id: 'central-org-1',
    role: 'DIRECTOR',
    permissions: [...permissionsForRole('DIRECTOR')],
    version: 1,
    is_active: true,
    granted_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

function localMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: '10000000-0000-4000-8000-000000000010',
    organizationId: '10000000-0000-4000-8000-000000000001',
    status: 'ACTIVE',
    roleTitle: 'Local title',
    organization: { name: 'Learnspace School', status: 'ACTIVE' },
    unitScopes: [{ unitId: '10000000-0000-4000-8000-000000000020' }],
    gradeScopes: [{ gradeId: '10000000-0000-4000-8000-000000000030' }],
    subjectScopes: [{ subjectId: '10000000-0000-4000-8000-000000000040' }],
    staffAssignments: [
      {
        organizationId: '10000000-0000-4000-8000-000000000001',
        studentId: '10000000-0000-4000-8000-000000000050',
        startsOn: new Date('2020-01-01'),
        endsOn: null,
      },
    ],
    observationAssignments: [
      { studentId: '10000000-0000-4000-8000-000000000060' },
    ],
    ...overrides,
  };
}

function shared(
  input: {
    claims?: typeof claims | null;
    hubError?: Error;
    principal?: unknown;
    membership?: unknown;
    entitlement?: unknown;
    centralError?: Error;
    hubDependencyFailed?: boolean;
    dependencyState?: SharedDependencyStateTracker;
  } = {},
) {
  const hub = {
    fromCookieHeader: input.hubError
      ? vi.fn(async () => Promise.reject(input.hubError))
      : vi.fn(async () =>
          Object.hasOwn(input, 'claims') ? input.claims! : claims,
        ),
    readCookie: vi.fn(),
    homeUrl: vi.fn(() => 'https://hub.example.test/'),
    refreshUrl: vi.fn(() => 'https://hub.example.test/auth/refresh'),
    restoreUrl: vi.fn(
      (url: string) =>
        `https://hub.example.test/auth/restore?return=${encodeURIComponent(url)}`,
    ),
    step: vi.fn(({ claims: value, restored }) =>
      value ? 'ok' : restored ? 'hub' : 'restore',
    ),
  };
  const prisma = {
    externalPrincipal: {
      findUnique: vi.fn(async () =>
        Object.hasOwn(input, 'principal')
          ? input.principal
          : {
              verified: true,
              user: {
                id: '10000000-0000-4000-8000-000000000002',
                email: 'local@example.test',
                displayName: 'Local Person',
                avatarUrl: null,
                status: 'ACTIVE',
              },
            },
      ),
    },
    membership: {
      findUnique: vi.fn(async () =>
        Object.hasOwn(input, 'membership')
          ? input.membership
          : localMembership(),
      ),
    },
  };
  const central = {
    lookupApplicationEntitlement: input.centralError
      ? vi.fn(async () => Promise.reject(input.centralError))
      : vi.fn(async () =>
          Object.hasOwn(input, 'entitlement')
            ? input.entitlement
            : entitlement(),
        ),
    lookupEmployee: vi.fn(async () => ({
      person_id: claims.sub,
      email: claims.email,
      full_name: 'Central Person',
      photo_url: null,
      status: 'ACTIVE',
    })),
  };
  const dependencyState =
    input.dependencyState ?? new SharedDependencyStateTracker();
  if (input.hubDependencyFailed) dependencyState.failure('hub');
  return {
    hub,
    prisma,
    central,
    service: new SharedSessionAuthenticationService(
      prisma as never,
      hub as never,
      central as never,
      'mws-hub',
      'learnspace',
      'central-org-1',
      '10000000-0000-4000-8000-000000000001',
      60_000,
      dependencyState,
    ),
  };
}

function protectedApp(service: SharedSessionAuthenticationService) {
  const app = createRouter();
  app.use((_request, response, next) => {
    response.locals.requestId = 'request-shared';
    next();
  });
  app.use(createRequiredAuthentication(service));
  app.get('/', (request: AuthenticatedRequest, response) => {
    response.json(request.auth);
  });
  return app;
}

describe('authoritative shared session', () => {
  it('returns 401 for missing or invalid Hub identity without local session lookup', async () => {
    const value = shared({ claims: null });
    const response = await request(
      httpTestClient(protectedApp(value.service)),
    ).get('/');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(value.prisma.externalPrincipal.findUnique).not.toHaveBeenCalled();
  });

  it('returns 503 when Hub or Central is unavailable', async () => {
    const hubResponse = await request(
      httpTestClient(
        protectedApp(shared({ hubError: new Error('secret') }).service),
      ),
    ).get('/');
    expect(hubResponse.status).toBe(503);
    expect(hubResponse.body.error.code).toBe('SHARED_SESSION_UNAVAILABLE');

    const jwksResponse = await request(
      httpTestClient(
        protectedApp(
          shared({ claims: null, hubDependencyFailed: true }).service,
        ),
      ),
    ).get('/');
    expect(jwksResponse.status).toBe(503);

    const centralResponse = await request(
      httpTestClient(
        protectedApp(shared({ centralError: new Error('secret') }).service),
      ),
    ).get('/');
    expect(centralResponse.status).toBe(503);
  });

  it.each([
    { value: null, description: 'missing' },
    { value: entitlement({ is_active: false }), description: 'inactive' },
    {
      value: entitlement({ application_id: 'other' }),
      description: 'invalid',
    },
  ])('does not cache $description entitlements', async ({ value }) => {
    const sharedSession = shared({ entitlement: value });
    await request(httpTestClient(protectedApp(sharedSession.service))).get('/');
    await request(httpTestClient(protectedApp(sharedSession.service))).get('/');
    expect(
      sharedSession.central.lookupApplicationEntitlement,
    ).toHaveBeenCalledTimes(2);
  });

  it('caches valid active entitlements', async () => {
    const sharedSession = shared();
    await request(httpTestClient(protectedApp(sharedSession.service))).get('/');
    await request(httpTestClient(protectedApp(sharedSession.service))).get('/');
    expect(
      sharedSession.central.lookupApplicationEntitlement,
    ).toHaveBeenCalledOnce();
  });

  it('tracks dependency failure grace and recovery without probing', () => {
    let now = 1_000;
    const state = new SharedDependencyStateTracker(10_000, () => now);
    expect(state.states()).toEqual({ hub: 'up', central: 'up' });
    state.failure('central');
    expect(state.states().central).toBe('down');
    now += 10_000;
    expect(state.states().central).toBe('up');
    state.failure('hub');
    state.success('hub');
    expect(state.states().hub).toBe('up');
  });

  it.each([
    [{ entitlement: null }, 'missing entitlement'],
    [
      { entitlement: entitlement({ is_active: false }) },
      'inactive entitlement',
    ],
    [
      { entitlement: entitlement({ application_id: 'other' }) },
      'wrong application',
    ],
    [
      { entitlement: entitlement({ organization_id: 'other' }) },
      'wrong Central organization',
    ],
    [{ entitlement: entitlement({ role: 'UNKNOWN' }) }, 'unknown role'],
    [
      { entitlement: entitlement({ permissions: ['future:permission'] }) },
      'unknown permission',
    ],
    [{ membership: null }, 'missing local membership'],
    [
      { membership: localMembership({ status: 'DISABLED' }) },
      'inactive local membership',
    ],
  ])('returns 403 for denied shared context', async (input, _description) => {
    const response = await request(
      httpTestClient(protectedApp(shared(input).service)),
    ).get('/');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('SHARED_SESSION_ACCESS_DENIED');
  });

  it('projects Central role and permissions with local UUID principal and scopes', async () => {
    const value = shared({
      entitlement: entitlement({
        role: 'PRINCIPAL',
        permissions: [...permissionsForRole('PRINCIPAL')],
      }),
    });
    const response = await request(
      httpTestClient(protectedApp(value.service)),
    ).get('/');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      sessionId: 'hub-session-1',
      userId: '10000000-0000-4000-8000-000000000002',
      membershipId: '10000000-0000-4000-8000-000000000010',
      memberships: [
        {
          role: 'PRINCIPAL',
          permissions: [...permissionsForRole('PRINCIPAL')],
          unitIds: ['10000000-0000-4000-8000-000000000020'],
          assignedStudentIds: ['10000000-0000-4000-8000-000000000050'],
        },
      ],
    });
  });

  it('builds the compatible session response and keeps a valid host-only CSRF cookie stable', async () => {
    const value = shared();
    const sessions = { lookup: vi.fn(), revoke: vi.fn(), create: vi.fn() };
    const app = createRouter();
    app.use((_request, response, next) => {
      response.locals.requestId = 'request-shared';
      next();
    });
    app.use(
      '/api/v1/auth',
      createAuthRouter(
        config,
        sessions as never,
        {} as never,
        { warn: vi.fn() } as never,
        undefined,
        value.service,
      ),
    );
    const client = request.agent(httpTestClient(app));
    const response = await client.get('/api/v1/auth/session');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      authMode: 'shared',
      hub: {
        homeUrl: 'https://hub.example.test/',
        refreshUrl: 'https://hub.example.test/auth/refresh',
      },
      user: { id: '10000000-0000-4000-8000-000000000002' },
      memberships: [
        {
          id: '10000000-0000-4000-8000-000000000010',
          role: 'DIRECTOR',
        },
      ],
    });
    expect(response.headers['set-cookie'][0]).toContain('learnspace_csrf=');
    expect(response.headers['set-cookie'][0]).not.toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).not.toContain('Domain=');

    const repeated = await client.get('/api/v1/auth/session');
    expect(repeated.status).toBe(200);
    expect(repeated.headers['set-cookie']).toBeUndefined();
    expect(sessions.lookup).not.toHaveBeenCalled();
  });

  it('replaces a malformed shared-mode CSRF cookie', async () => {
    const value = shared();
    const app = createRouter();
    app.use((_request, response, next) => {
      response.locals.requestId = 'request-shared';
      next();
    });
    app.use(
      '/api/v1/auth',
      createAuthRouter(
        config,
        { lookup: vi.fn(), revoke: vi.fn(), create: vi.fn() } as never,
        {} as never,
        { warn: vi.fn() } as never,
        undefined,
        value.service,
      ),
    );

    const response = await request(httpTestClient(app))
      .get('/api/v1/auth/session')
      .set('cookie', 'learnspace_csrf=malformed');

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie'][0]).toMatch(
      /^learnspace_csrf=[A-Za-z0-9_-]{43};/,
    );
  });

  it('publishes shared bootstrap mode and Hub home without session identity', async () => {
    const value = shared();
    const app = createRouter();
    app.use(
      '/api/v1/auth',
      createAuthRouter(
        config,
        {} as never,
        {} as never,
        { warn: vi.fn() } as never,
        undefined,
        value.service,
      ),
    );

    const response = await request(httpTestClient(app)).get(
      '/api/v1/auth/bootstrap',
    );

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({
      authMode: 'shared',
      hub: { homeUrl: 'https://hub.example.test/' },
    });
  });

  it('redirects shared login to SSO and local logout only clears local cookies', async () => {
    const value = shared();
    const sessions = { lookup: vi.fn(), revoke: vi.fn(), create: vi.fn() };
    const app = createRouter();
    app.use((_request, response, next) => {
      response.locals.requestId = 'request-shared';
      next();
    });
    app.use(
      '/api/v1/auth',
      createAuthRouter(
        config,
        sessions as never,
        {} as never,
        { warn: vi.fn() } as never,
        undefined,
        value.service,
      ),
    );
    const login = await request(httpTestClient(app)).get(
      '/api/v1/auth/login?returnTo=/reports',
    );
    expect(login.status).toBe(302);
    expect(login.headers.location).toBe(
      'http://localhost:3000/api/v1/auth/sso?returnTo=%2Freports',
    );
    const logout = await request(httpTestClient(app))
      .post('/api/v1/auth/logout')
      .set('cookie', 'learnspace_csrf=token')
      .set('x-csrf-token', 'token');
    expect(logout.status).toBe(204);
    expect(sessions.revoke).not.toHaveBeenCalled();
  });

  it('uses one restore attempt, rejects external return URLs, then returns to Hub', async () => {
    const value = shared({ claims: null });
    const app = createApp({
      config,
      database: { client: {} as never, check: vi.fn(), close: vi.fn() },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      auth: {
        sessions: {} as never,
        oauth: {} as never,
        shared: value.service,
      },
    });
    const first = await request(httpTestClient(app)).get(
      '/api/v1/auth/sso?returnTo=https://attacker.example/path',
    );
    expect(first.status).toBe(302);
    expect(first.headers.location).toContain(
      'https://hub.example.test/auth/restore?return=',
    );
    expect(decodeURIComponent(first.headers.location)).not.toContain(
      'attacker.example',
    );

    const restored = await request(httpTestClient(app)).get(
      '/api/v1/auth/sso?restored=1',
    );
    expect(restored.status).toBe(302);
    expect(restored.headers.location).toBe('https://hub.example.test/');
  });
});
