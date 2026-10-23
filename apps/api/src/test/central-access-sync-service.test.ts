import { CentralApiError } from 'mws-central-auth/data-client';
import { describe, expect, it, vi } from 'vitest';
import {
  synchronizeCentralAccess,
  type CentralAccessSyncLock,
} from '../service/central-access-sync-service.js';
import { permissionsForRole } from '../utils/authorization.js';

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

function setup(
  input: {
    mode?: 'dry-run' | 'apply';
    userStatus?: 'ACTIVE' | 'DISABLED';
    membership?: Record<string, unknown> | null;
    entitlement?: unknown;
    centralError?: Error;
    lockAcquired?: boolean;
  } = {},
) {
  const database = {
    externalPrincipal: {
      findMany: vi.fn(async () => [
        {
          subject: 'person-1',
          userId: 'user-1',
          user: { status: input.userStatus ?? 'ACTIVE' },
        },
      ]),
    },
    membership: {
      findUnique: vi.fn(async () =>
        input.membership === null
          ? null
          : {
              id: 'membership-1',
              role: 'PRINCIPAL',
              status: 'ACTIVE',
              ...input.membership,
            },
      ),
      update: vi.fn(async () => ({})),
    },
  };
  const lock: CentralAccessSyncLock = {
    runExclusive: vi.fn(async (operation) =>
      input.lockAcquired === false ? undefined : operation(database as never),
    ),
  };
  const central = {
    lookupApplicationEntitlement: input.centralError
      ? vi.fn(async () => Promise.reject(input.centralError))
      : vi.fn(async () =>
          Object.hasOwn(input, 'entitlement')
            ? input.entitlement
            : entitlement(),
        ),
  };
  return {
    database,
    central,
    run: () =>
      synchronizeCentralAccess({
        lock,
        central: central as never,
        issuer: 'mws-hub',
        applicationId: 'learnspace',
        centralOrganizationId: 'central-org-1',
        localOrganizationId: 'local-org-1',
        mode: input.mode ?? 'apply',
      }),
  };
}

describe('Central access synchronization', () => {
  it('updates only an active membership with an exact known permission set', async () => {
    const context = setup();
    const report = await context.run();
    expect(report.counts.rolesUpdated).toBe(1);
    expect(context.database.membership.update).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: { role: 'DIRECTOR' },
    });
    expect(context.database.externalPrincipal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { issuer: 'mws-hub', verified: true } }),
    );
  });

  it('does not write in dry-run or when permissions do not exactly match', async () => {
    const dryRun = setup({ mode: 'dry-run' });
    expect((await dryRun.run()).counts.rolesUpdated).toBe(1);
    expect(dryRun.database.membership.update).not.toHaveBeenCalled();

    const mismatch = setup({
      entitlement: entitlement({ permissions: ['attendance:read'] }),
    });
    expect((await mismatch.run()).counts.invalidEntitlements).toBe(1);
    expect(mismatch.database.membership.update).not.toHaveBeenCalled();
  });

  it.each([
    [null, undefined],
    [entitlement({ is_active: false }), undefined],
    [undefined, new CentralApiError(404, 'not found')],
  ])(
    'disables access for missing or inactive entitlement',
    async (value, error) => {
      const context = setup({ entitlement: value, centralError: error });
      const report = await context.run();
      expect(report.counts.membershipsDisabled).toBe(1);
      expect(context.database.membership.update).toHaveBeenCalledWith({
        where: { id: 'membership-1' },
        data: { status: 'DISABLED' },
      });
    },
  );

  it('preserves disabled memberships and disables access for disabled users', async () => {
    const locallyDisabled = setup({ membership: { status: 'DISABLED' } });
    expect(
      (await locallyDisabled.run()).counts.locallyDisabledMemberships,
    ).toBe(1);
    expect(locallyDisabled.database.membership.update).not.toHaveBeenCalled();

    const disabledUser = setup({ userStatus: 'DISABLED' });
    expect((await disabledUser.run()).counts.membershipsDisabled).toBe(1);
    expect(disabledUser.database.membership.update).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: { status: 'DISABLED' },
    });
  });

  it('does not create missing memberships or expose identifiers in its report', async () => {
    const context = setup({ membership: null });
    const report = await context.run();
    expect(report.counts.membershipsMissing).toBe(1);
    expect(context.central.lookupApplicationEntitlement).toHaveBeenCalledOnce();
    expect(JSON.stringify(report)).not.toMatch(/person-1|user-1|membership-1/);
  });

  it('skips safely when another instance owns the lock', async () => {
    const context = setup({ lockAcquired: false });
    await expect(context.run()).resolves.toMatchObject({
      lockAcquired: false,
      counts: { principalsScanned: 0 },
    });
    expect(context.database.externalPrincipal.findMany).not.toHaveBeenCalled();
  });

  it('keeps access unchanged on transient Central failures', async () => {
    const context = setup({ centralError: new Error('unavailable') });
    expect((await context.run()).counts.lookupFailures).toBe(1);
    expect(context.database.membership.update).not.toHaveBeenCalled();
  });
});
