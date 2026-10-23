import { describe, expect, it, vi } from 'vitest';
import {
  inspectSharedSessionReadiness,
  sharedSessionReadinessReasonCodes,
} from '../service/shared-session-readiness-service.js';
import { permissionsForRole } from '../utils/authorization.js';

const localOrganizationId = '10000000-0000-4000-8000-000000000001';

function user(
  id: string,
  role = 'DIRECTOR',
  status = 'ACTIVE',
  organizationStatus = 'ACTIVE',
) {
  return {
    id,
    memberships: [
      {
        role,
        status,
        organization: { status: organizationStatus },
      },
    ],
  };
}

function principal(userId: string, subject: string, verified = true) {
  return { userId, subject, verified };
}

function entitlement(subject: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'private-entitlement-id',
    person_id: subject,
    application_id: 'learnspace',
    organization_id: 'central-org',
    role: 'DIRECTOR',
    permissions: [...permissionsForRole('DIRECTOR')],
    version: 1,
    is_active: true,
    granted_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

function prisma(
  users: unknown[],
  principals: Array<ReturnType<typeof principal>>,
) {
  return {
    user: { findMany: vi.fn(async () => users) },
    externalPrincipal: {
      findMany: vi.fn(
        async ({ where }: { where: { userId: { in: string[] } } }) =>
          principals.filter(({ userId }) => where.userId.in.includes(userId)),
      ),
    },
  };
}

describe('shared session readiness service', () => {
  it('reports only active users linked to the target organization', async () => {
    const database = prisma(
      [
        user('ready'),
        user('unverified'),
        user('inactive-membership', 'DIRECTOR', 'INACTIVE'),
        user('inactive-organization', 'DIRECTOR', 'ACTIVE', 'INACTIVE'),
        user('unmapped'),
        user('duplicate'),
      ],
      [
        principal('ready', 'person-ready'),
        principal('unverified', 'person-unverified', false),
        principal('duplicate', 'person-a'),
        principal('duplicate', 'person-b'),
        principal('unrelated-a', 'shared-unrelated-subject'),
        principal('unrelated-b', 'shared-unrelated-subject'),
      ],
    );
    const report = await inspectSharedSessionReadiness({
      prisma: database as never,
      issuer: 'mws-hub',
      localOrganizationId,
      applicationId: 'learnspace',
      strict: true,
    });

    expect(report).toMatchObject({
      mode: 'local-only',
      go: false,
      counts: {
        activeLocalPrincipals: 6,
        mapped: 3,
        verified: 2,
        unverified: 1,
        unmapped: 3,
        duplicateConflictImpossibleStates: 1,
        activeMemberships: 4,
        inactiveMemberships: 2,
        entitlementUnavailable: 1,
        ready: 1,
      },
      reasons: {
        UNMAPPED: 3,
        UNVERIFIED_MAPPING: 1,
        DUPLICATE_OR_CONFLICT_STATE: 1,
        LOCAL_MEMBERSHIP_OR_ORGANIZATION_INACTIVE: 2,
        CENTRAL_NOT_CONFIGURED: 1,
      },
    });
    expect(database.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'ACTIVE',
          memberships: { some: { organizationId: localOrganizationId } },
        },
      }),
    );
    expect(database.externalPrincipal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          issuer: 'mws-hub',
          userId: {
            in: [
              'ready',
              'unverified',
              'inactive-membership',
              'inactive-organization',
              'unmapped',
              'duplicate',
            ],
          },
        },
      }),
    );
  });

  it('uses the shared parity comparison and aggregates each Central outcome', async () => {
    const cases = [
      entitlement('match'),
      null,
      entitlement('app', { application_id: 'other' }),
      entitlement('org', { organization_id: 'other' }),
      entitlement('role', { role: 'PRINCIPAL' }),
      entitlement('permission', { permissions: ['attendance:read'] }),
      entitlement('unknown', {
        permissions: [...permissionsForRole('DIRECTOR'), 'future:permission'],
      }),
    ];
    const users = [
      'match',
      'missing',
      'app',
      'org',
      'role',
      'permission',
      'unknown',
      'unavailable',
    ].map((id) => user(id));
    const principals = users.map(({ id }) => principal(id, id));
    const central = {
      lookupApplicationEntitlement: vi
        .fn()
        .mockImplementation(async ({ person_id }) => {
          if (person_id === 'unavailable') throw new Error('secret failure');
          return cases[
            [
              'match',
              'missing',
              'app',
              'org',
              'role',
              'permission',
              'unknown',
            ].indexOf(person_id)
          ];
        }),
    };
    const report = await inspectSharedSessionReadiness({
      prisma: prisma(users, principals) as never,
      central: central as never,
      issuer: 'mws-hub',
      localOrganizationId,
      applicationId: 'learnspace',
      centralOrganizationId: 'central-org',
      strict: true,
    });

    expect(report.counts).toMatchObject({
      entitlementActive: 6,
      entitlementMissing: 1,
      entitlementUnavailable: 1,
      entitlementAppMismatch: 1,
      entitlementOrganizationMismatch: 1,
      roleMismatch: 1,
      permissionMismatch: 1,
      unknownPermissions: 1,
      ready: 1,
    });
    expect(report.reasons).toEqual({
      ENTITLEMENT_MISSING_OR_INACTIVE: 1,
      ENTITLEMENT_APP_MISMATCH: 1,
      ENTITLEMENT_CENTRAL_ORG_MISMATCH: 1,
      ROLE_MISMATCH: 1,
      PERMISSION_MISMATCH: 1,
      UNKNOWN_CENTRAL_PERMISSIONS: 1,
      CENTRAL_UNAVAILABLE: 1,
    });
    expect(
      Object.keys(report.reasons).every((code) =>
        sharedSessionReadinessReasonCodes.includes(code as never),
      ),
    ).toBe(true);
    expect(JSON.stringify(report)).not.toContain('private-entitlement-id');
    expect(JSON.stringify(report)).not.toContain('future:permission');
  });
});
