import { describe, expect, it, vi } from 'vitest';
import { projectCentralPrincipal } from '../service/central-principal-projection-service.js';
import { permissionsForRole } from '../utils/authorization.js';

const claims = {
  iss: 'mws-hub',
  aud: 'mws-apps',
  sub: 'person-1',
  email: ' Person@Example.Test ',
  source: 'employee' as const,
  tags: [],
  sid: 'session-1',
  jti: 'jti-1',
  iat: 1,
  exp: 2,
};

function entitlement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entitlement-1',
    person_id: 'person-1',
    application_id: 'learnspace',
    organization_id: 'central-org-1',
    role: 'GRADE_TEACHER',
    permissions: [...permissionsForRole('GRADE_TEACHER')],
    version: 1,
    is_active: true,
    granted_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

function setup(
  input: {
    users?: Array<{ id: string; status: 'ACTIVE' | 'DISABLED' }>;
    principal?: { userId: string; verified: boolean } | null;
    principalForUser?: { subject: string; verified: boolean } | null;
    membership?: {
      id: string;
      status: 'ACTIVE' | 'DISABLED';
      role: 'DIRECTOR' | 'GRADE_TEACHER';
    } | null;
    transactionErrors?: string[];
    entitlement?: ReturnType<typeof entitlement>;
  } = {},
) {
  const userCreate = vi.fn(async () => ({ id: 'user-new', status: 'ACTIVE' }));
  const principalCreate = vi.fn(async () => ({}));
  const membershipCreate = vi.fn(async () => ({}));
  const membershipUpdate = vi.fn(async () => ({}));
  const transaction = {
    organization: {
      findUnique: vi.fn(async () => ({ status: 'ACTIVE' })),
    },
    user: {
      findMany: vi.fn(async () => input.users ?? []),
      create: userCreate,
    },
    externalPrincipal: {
      findUnique: vi
        .fn()
        .mockResolvedValueOnce(input.principal ?? null)
        .mockResolvedValueOnce(input.principalForUser ?? null),
      create: principalCreate,
    },
    membership: {
      findUnique: vi.fn(async () => input.membership ?? null),
      create: membershipCreate,
      update: membershipUpdate,
    },
  };
  const errors = [...(input.transactionErrors ?? [])];
  const transactionOptions: unknown[] = [];
  const prisma = {
    $transaction: vi.fn(
      async (
        callback: (client: typeof transaction) => unknown,
        options: unknown,
      ) => {
        transactionOptions.push(options);
        const code = errors.shift();
        if (code) throw { code };
        return callback(transaction);
      },
    ),
  };
  const central = {
    lookupEmployee: vi.fn(async () => ({
      person_id: 'person-1',
      email: 'person@example.test',
      full_name: 'Central Person',
      photo_url: null,
      status: 'ACTIVE',
    })),
    lookupApplicationEntitlement: vi.fn(async () =>
      input.entitlement === undefined ? entitlement() : input.entitlement,
    ),
  };
  return {
    central,
    prisma,
    transaction,
    transactionOptions,
    userCreate,
    principalCreate,
    membershipCreate,
    membershipUpdate,
  };
}

async function project(
  value: ReturnType<typeof setup>,
  source: 'employee' | 'intern' | 'student' = claims.source,
) {
  return projectCentralPrincipal({
    prisma: value.prisma as never,
    central: value.central,
    claims: { ...claims, source },
    issuer: 'mws-hub',
    applicationId: 'learnspace',
    centralOrganizationId: 'central-org-1',
    localOrganizationId: 'local-org-1',
  });
}

describe('Central first-login principal projection', () => {
  it.each(['student', 'intern'] as const)(
    'denies unsupported %s identities without network or database work',
    async (source) => {
      const value = setup();
      await expect(project(value, source)).resolves.toEqual({
        ok: false,
        kind: 'denied',
        code: 'SOURCE_NOT_SUPPORTED',
      });
      expect(value.central.lookupEmployee).not.toHaveBeenCalled();
      expect(value.prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('validates Central first, then creates normalized user, principal, and one empty-scope membership', async () => {
    const value = setup();
    await expect(project(value)).resolves.toEqual({
      ok: true,
      userId: 'user-new',
      entitlement: entitlement(),
    });
    expect(value.central.lookupEmployee).toHaveBeenCalledWith({
      person_id: 'person-1',
    });
    expect(value.central.lookupApplicationEntitlement).toHaveBeenCalledWith({
      person_id: 'person-1',
      application_id: 'learnspace',
    });
    expect(value.userCreate).toHaveBeenCalledWith({
      data: {
        email: 'person@example.test',
        displayName: 'Central Person',
        avatarUrl: null,
      },
      select: { id: true, status: true },
    });
    expect(value.principalCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-new',
        linkSource: 'first_login_central_projection',
        verified: true,
      }),
    });
    expect(value.membershipCreate).toHaveBeenCalledWith({
      data: {
        organizationId: 'local-org-1',
        userId: 'user-new',
        role: 'GRADE_TEACHER',
      },
    });
  });

  it('requires exact role permissions before opening a transaction', async () => {
    const value = setup({
      entitlement: entitlement({ permissions: ['attendance:read'] }),
    });
    await expect(project(value)).resolves.toEqual({
      ok: false,
      kind: 'denied',
      code: 'ENTITLEMENT_INVALID',
    });
    expect(value.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('never reactivates a disabled user or membership', async () => {
    const disabledUser = setup({
      users: [{ id: 'user-1', status: 'DISABLED' }],
    });
    await expect(project(disabledUser)).resolves.toMatchObject({
      ok: false,
      code: 'USER_DISABLED',
    });
    expect(disabledUser.userCreate).not.toHaveBeenCalled();

    const disabledMembership = setup({
      users: [{ id: 'user-1', status: 'ACTIVE' }],
      membership: {
        id: 'membership-1',
        status: 'DISABLED',
        role: 'DIRECTOR',
      },
    });
    await expect(project(disabledMembership)).resolves.toMatchObject({
      ok: false,
      code: 'MEMBERSHIP_DISABLED',
    });
    expect(disabledMembership.membershipUpdate).not.toHaveBeenCalled();
  });

  it('retries bounded serializable write conflicts', async () => {
    const value = setup({ transactionErrors: ['P2034', 'P2002'] });
    await expect(project(value)).resolves.toEqual({
      ok: true,
      userId: 'user-new',
      entitlement: entitlement(),
    });
    expect(value.prisma.$transaction).toHaveBeenCalledTimes(3);
    expect(value.transactionOptions[0]).toEqual({
      isolationLevel: 'Serializable',
    });
  });
});
