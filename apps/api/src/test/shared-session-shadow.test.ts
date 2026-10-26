import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createRequiredAuthentication } from '../middleware/auth-middleware.js';
import {
  createSharedSessionShadow,
  FireAndForgetShadowObserver,
  HubIdentityVerifier,
  LocalSessionAdapter,
  normalizeCentralApiBaseUrl,
  PrincipalContextLoader,
} from '../service/shared-session-shadow-service.js';
import { grantedPermissions } from '../utils/authorization.js';
import { createRouter } from '../type/http.js';
import { httpTestClient } from './http-test-client.js';

const identity = {
  issuer: 'mws-hub',
  subject: 'person-1',
  source: 'employee',
};
const local = { userId: 'user-1', sessionId: 'session-1' };

function entitlement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entitlement-1',
    person_id: 'person-1',
    application_id: 'learnspace',
    organization_id: 'central-org-1',
    role: 'DIRECTOR',
    permissions: [...grantedPermissions('DIRECTOR')],
    version: 1,
    is_active: true,
    granted_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

function membership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membership-1',
    organizationId: '10000000-0000-4000-8000-000000000001',
    role: 'DIRECTOR',
    status: 'ACTIVE',
    organization: { status: 'ACTIVE' },
    unitScopes: [{ unitId: 'unit-1' }],
    gradeScopes: [{ gradeId: 'grade-1' }],
    subjectScopes: [{ subjectId: 'subject-1' }],
    staffAssignments: [
      {
        studentId: 'student-1',
        startsOn: new Date('2020-01-01'),
        endsOn: null,
      },
    ],
    observationAssignments: [{ studentId: 'student-2' }],
    ...overrides,
  };
}

function loader(
  input: {
    entitlement?: unknown;
    membership?: unknown;
    principal?: { userId: string } | null;
    centralError?: Error;
    cacheMs?: number;
  } = {},
) {
  const central = {
    lookupApplicationEntitlement: input.centralError
      ? vi.fn(async () => Promise.reject(input.centralError))
      : vi.fn(async () =>
          Object.hasOwn(input, 'entitlement')
            ? input.entitlement
            : entitlement(),
        ),
  };
  const prisma = {
    externalPrincipal: {
      findUnique: vi.fn(async () =>
        Object.hasOwn(input, 'principal')
          ? input.principal
          : { userId: 'user-1' },
      ),
    },
    membership: {
      findUnique: vi.fn(async () =>
        input.membership === undefined ? membership() : input.membership,
      ),
    },
  };
  return {
    central,
    prisma,
    loader: new PrincipalContextLoader(
      prisma as never,
      central as never,
      'learnspace',
      'central-org-1',
      '10000000-0000-4000-8000-000000000001',
      input.cacheMs,
    ),
  };
}

describe('shared session shadow mode', () => {
  it('normalizes Central origins without duplicating /api/internal', () => {
    expect(
      normalizeCentralApiBaseUrl('https://central.test/api/internal/'),
    ).toBe('https://central.test');
    expect(normalizeCentralApiBaseUrl('https://central.test/')).toBe(
      'https://central.test',
    );
    expect(() =>
      normalizeCentralApiBaseUrl('https://central.test/unexpected'),
    ).toThrow(/Invalid Central API base URL/);
    expect(() => normalizeCentralApiBaseUrl('https://central.test//')).toThrow(
      /Invalid Central API base URL/,
    );
    expect(() =>
      normalizeCentralApiBaseUrl('https://central.test/api/internal?token=x'),
    ).toThrow(/Invalid Central API base URL/);
    expect(() =>
      normalizeCentralApiBaseUrl('https://central.test/api/internal#fragment'),
    ).toThrow(/Invalid Central API base URL/);
    expect(() => normalizeCentralApiBaseUrl('file:///central')).toThrow(
      /Invalid Central API base URL/,
    );
  });

  it('creates no clients or network activity while off', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(
      createSharedSessionShadow(
        { sharedSessionMode: 'off' } as never,
        {} as never,
        {} as never,
      ),
    ).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('adapts verified Hub claims without retaining email or raw token data', async () => {
    const verifier = new HubIdentityVerifier(
      {
        fromCookieHeader: vi.fn(async () => ({
          sub: 'person-1',
          source: 'employee',
          email: 'private@example.test',
        })),
      } as never,
      'mws-hub',
    );
    await expect(
      verifier.verify({ get: vi.fn(() => 'hub_at=token') } as never),
    ).resolves.toEqual({
      issuer: 'mws-hub',
      subject: 'person-1',
      source: 'employee',
    });
  });

  it('loads local role and record scopes and caches successful entitlements', async () => {
    const contextLoader = loader();
    await expect(
      contextLoader.loader.load(identity, local),
    ).resolves.toMatchObject({
      status: 'match',
      localAuthorization: {
        membershipId: 'membership-1',
        role: 'DIRECTOR',
        scopes: {
          unitIds: ['unit-1'],
          gradeIds: ['grade-1'],
          subjectIds: ['subject-1'],
          assignedStudentIds: ['student-1'],
          observationAssignedStudentIds: ['student-2'],
        },
      },
    });
    await contextLoader.loader.load(identity, local);
    expect(
      contextLoader.central.lookupApplicationEntitlement,
    ).toHaveBeenCalledOnce();
    expect(contextLoader.prisma.membership.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_userId: {
            organizationId: '10000000-0000-4000-8000-000000000001',
            userId: 'user-1',
          },
        },
      }),
    );
  });

  it('detects unlinked and mismatched local users before loading membership', async () => {
    const unlinked = loader({ principal: null });
    await expect(unlinked.loader.load(identity, local)).resolves.toMatchObject({
      status: 'unlinked',
    });
    expect(unlinked.prisma.membership.findUnique).not.toHaveBeenCalled();

    const mismatch = loader({ principal: { userId: 'user-2' } });
    await expect(mismatch.loader.load(identity, local)).resolves.toMatchObject({
      status: 'local_user_mismatch',
    });
    expect(mismatch.prisma.membership.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    [null, 'local_membership_missing'],
    [membership({ status: 'DISABLED' }), 'local_membership_missing'],
    [
      membership({ organization: { status: 'DISABLED' } }),
      'local_membership_missing',
    ],
  ])('detects unavailable local membership state', async (value, status) => {
    await expect(
      loader({ membership: value }).loader.load(identity, local),
    ).resolves.toMatchObject({ status });
  });

  it('detects role, known permission, and unknown permission drift distinctly', async () => {
    await expect(
      loader({
        entitlement: entitlement({ role: 'PRINCIPAL' }),
      }).loader.load(identity, local),
    ).resolves.toMatchObject({ status: 'role_mismatch' });

    await expect(
      loader({
        entitlement: entitlement({ role: 'CENTRAL_ONLY_ROLE' }),
      }).loader.load(identity, local),
    ).resolves.toMatchObject({ status: 'role_mismatch' });

    await expect(
      loader({
        entitlement: entitlement({ permissions: ['attendance:read'] }),
      }).loader.load(identity, local),
    ).resolves.toMatchObject({
      status: 'permission_mismatch',
      missingCentralPermissions: expect.arrayContaining(['journey:read']),
    });

    await expect(
      loader({
        entitlement: entitlement({
          permissions: [...grantedPermissions('DIRECTOR'), 'future:permission'],
        }),
      }).loader.load(identity, local),
    ).resolves.toMatchObject({
      status: 'unknown_central_permissions',
      unknownCentralPermissions: ['future:permission'],
    });
  });

  it.each([
    [null, 'entitlement_missing_or_inactive'],
    [entitlement({ is_active: false }), 'entitlement_missing_or_inactive'],
    [
      entitlement({ person_id: 'unexpected-person' }),
      'entitlement_missing_or_inactive',
    ],
    [entitlement({ application_id: 'other-app' }), 'entitlement_app_mismatch'],
    [
      entitlement({ organization_id: 'wrong-central-org' }),
      'entitlement_central_org_mismatch',
    ],
  ])('detects missing and invalid entitlements', async (value, status) => {
    await expect(
      loader({ entitlement: value }).loader.load(identity, local),
    ).resolves.toMatchObject({ status });
  });

  it('distinguishes Central unavailability and never caches failures as no access', async () => {
    const contextLoader = loader({ centralError: new Error('unavailable') });
    await expect(
      contextLoader.loader.load(identity, local),
    ).resolves.toMatchObject({ status: 'central_unavailable' });
    await contextLoader.loader.load(identity, local);
    expect(
      contextLoader.central.lookupApplicationEntitlement,
    ).toHaveBeenCalledTimes(2);
  });

  it('can disable the entitlement cache', async () => {
    const contextLoader = loader({ cacheMs: 0 });
    await contextLoader.loader.load(identity, local);
    await contextLoader.loader.load(identity, local);
    expect(
      contextLoader.central.lookupApplicationEntitlement,
    ).toHaveBeenCalledTimes(2);
  });

  it('never caches missing entitlements', async () => {
    const contextLoader = loader({ entitlement: null });
    await contextLoader.loader.load(identity, local);
    await contextLoader.loader.load(identity, local);
    expect(
      contextLoader.central.lookupApplicationEntitlement,
    ).toHaveBeenCalledTimes(2);
  });

  it('never caches inactive or invalid entitlements', async () => {
    for (const value of [
      entitlement({ is_active: false }),
      entitlement({ application_id: 'other' }),
      entitlement({ permissions: ['future:permission'] }),
    ]) {
      const contextLoader = loader({ entitlement: value });
      await contextLoader.loader.load(identity, local);
      await contextLoader.loader.load(identity, local);
      expect(
        contextLoader.central.lookupApplicationEntitlement,
      ).toHaveBeenCalledTimes(2);
    }
  });

  it('never delays or changes locally authenticated responses', async () => {
    let release: (() => void) | undefined;
    const observer = {
      observe: vi.fn(() => {
        void new Promise<void>((resolve) => {
          release = resolve;
        });
      }),
    };
    const sessions = {
      lookup: vi.fn(async () => ({
        id: 'session-1',
        userId: 'user-1',
        user: { memberships: [] },
      })),
    };
    const app = createRouter();
    app.use(createRequiredAuthentication(sessions as never, observer));
    app.get('/', (_request, response) => {
      response.status(204).end();
    });
    const response = await request(httpTestClient(app))
      .get('/')
      .set('cookie', 'learnspace_session=local');
    expect(response.status).toBe(204);
    expect(observer.observe).toHaveBeenCalledOnce();
    release?.();
  });

  it('does not pass synchronous observer failures to the HTTP stack', async () => {
    const sessions = {
      lookup: vi.fn(async () => ({
        id: 'session-1',
        userId: 'user-1',
        user: { memberships: [] },
      })),
    };
    const app = createRouter();
    app.use(
      createRequiredAuthentication(sessions as never, {
        observe: () => {
          throw new Error('observer failed');
        },
      }),
    );
    app.get('/', (_request, response) => {
      response.status(204).end();
    });

    const response = await request(httpTestClient(app))
      .get('/')
      .set('cookie', 'learnspace_session=local');
    expect(response.status).toBe(204);
  });

  it('contains observer failures and logs only finite safe codes', async () => {
    const logger = { warn: vi.fn() };
    const observer = new FireAndForgetShadowObserver(
      { verify: vi.fn(async () => Promise.reject(new Error('secret token'))) },
      new LocalSessionAdapter(),
      {} as never,
      logger as never,
    );
    observer.observe({
      auth: { userId: 'user-1', sessionId: 'session-1' },
      res: { locals: { requestId: 'request-1' } },
    } as never);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SHADOW_DEPENDENCY_FAILURE',
        requestId: 'request-1',
      }),
      'shared session shadow observation failed',
    );
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(
      'secret token',
    );
  });

  it('logs safe comparison fields and logs matches only when enabled', async () => {
    const logger = { warn: vi.fn(), info: vi.fn() };
    const context = await loader().loader.load(identity, local);
    const observer = new FireAndForgetShadowObserver(
      { verify: vi.fn(async () => identity) },
      new LocalSessionAdapter(),
      { load: vi.fn(async () => context) } as never,
      logger as never,
      true,
    );
    observer.observe({
      auth: local,
      res: { locals: { requestId: 'request-1' } },
      get: vi.fn(),
    } as never);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'MATCH',
        localUserId: 'user-1',
        membershipId: 'membership-1',
        entitlementId: 'entitlement-1',
        entitlementVersion: 1,
        centralPermissions: grantedPermissions('DIRECTOR'),
      }),
      'shared session shadow match',
    );
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain('person-1');
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain('session-1');
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain('unit-1');
  });

  it('does not log successful comparisons by default', async () => {
    const logger = { warn: vi.fn(), info: vi.fn() };
    const context = await loader().loader.load(identity, local);
    const observer = new FireAndForgetShadowObserver(
      { verify: vi.fn(async () => identity) },
      new LocalSessionAdapter(),
      { load: vi.fn(async () => context) } as never,
      logger as never,
    );
    observer.observe({ auth: local, get: vi.fn() } as never);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
