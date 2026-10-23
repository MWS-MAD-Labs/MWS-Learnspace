import { describe, expect, it, vi } from 'vitest';
import {
  CentralOrganizationMappingError,
  centralOrganizationMappingErrorCodes,
  createCentralOrganizationService,
} from '../service/central-organization-service.js';

const localId = '10000000-0000-4000-8000-000000000001';
const otherLocalId = '10000000-0000-4000-8000-000000000002';
const centralId = 'central-organization-1';

type Organization = {
  id: string;
  centralOrganizationId: string | null;
  status: 'ACTIVE' | 'DISABLED';
};

type ClaimInput = {
  where: {
    id: string;
    status: 'ACTIVE';
    centralOrganizationId: null;
  };
  data: { centralOrganizationId: string };
};

function setup(input: {
  organizations?: Organization[];
  update?: () => Promise<{ count: number }>;
}) {
  const organizations = input.organizations ?? [];
  const organization = {
    findUnique: vi.fn(async ({ where }: { where: Record<string, string> }) => {
      if (where.centralOrganizationId) {
        return (
          organizations.find(
            (value) =>
              value.centralOrganizationId === where.centralOrganizationId,
          ) ?? null
        );
      }
      return organizations.find((value) => value.id === where.id) ?? null;
    }),
    findMany: vi.fn(async () =>
      organizations
        .filter(
          (value) =>
            value.status === 'ACTIVE' && value.centralOrganizationId === null,
        )
        .slice(0, 2)
        .map(({ id }) => ({ id })),
    ),
    updateMany: vi.fn(
      input.update ??
        (async ({ where, data }: ClaimInput) => {
          const candidate = organizations.find(
            (value) =>
              value.id === where.id &&
              value.status === 'ACTIVE' &&
              value.centralOrganizationId === null,
          );
          if (!candidate) return { count: 0 };
          candidate.centralOrganizationId = data.centralOrganizationId;
          return { count: 1 };
        }),
    ),
  };
  return {
    organization,
    service: createCentralOrganizationService({ organization } as never),
  };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({
    name: 'CentralOrganizationMappingError',
    code,
  });
}

describe('Central organization mapping', () => {
  it('exposes a finite typed error taxonomy', () => {
    expect(new Set(centralOrganizationMappingErrorCodes).size).toBe(6);
    expect(
      new CentralOrganizationMappingError(
        'CENTRAL_ORGANIZATION_MAPPING_CONFLICT',
      ).message,
    ).not.toContain(centralId);
  });

  it('returns an existing matching mapping without writing', async () => {
    const value = setup({
      organizations: [
        { id: localId, centralOrganizationId: centralId, status: 'DISABLED' },
      ],
    });
    await expect(
      value.service.resolve({ centralOrganizationId: centralId }),
    ).resolves.toEqual({
      centralOrganizationId: centralId,
      localOrganizationId: localId,
    });
    expect(value.organization.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a hint that conflicts with the persisted mapping', async () => {
    const value = setup({
      organizations: [
        { id: localId, centralOrganizationId: centralId, status: 'ACTIVE' },
      ],
    });
    await expect(
      value.service.resolve({
        centralOrganizationId: centralId,
        localOrganizationIdHint: otherLocalId,
      }),
    ).rejects.toMatchObject({
      code: 'CENTRAL_ORGANIZATION_MAPPING_CONFLICT',
    });
  });

  it('claims the exact active organization supplied as a migration hint', async () => {
    const value = setup({
      organizations: [
        { id: localId, centralOrganizationId: null, status: 'ACTIVE' },
        { id: otherLocalId, centralOrganizationId: null, status: 'ACTIVE' },
      ],
    });
    await expect(
      value.service.resolve({
        centralOrganizationId: centralId,
        localOrganizationIdHint: localId,
      }),
    ).resolves.toEqual({
      centralOrganizationId: centralId,
      localOrganizationId: localId,
    });
    expect(value.organization.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: localId }),
      }),
    );
  });

  it.each([
    [[], 'LOCAL_ORGANIZATION_NOT_FOUND'],
    [
      [{ id: localId, centralOrganizationId: null, status: 'DISABLED' }],
      'LOCAL_ORGANIZATION_INACTIVE',
    ],
    [
      [
        {
          id: localId,
          centralOrganizationId: 'another-central-organization',
          status: 'ACTIVE',
        },
      ],
      'CENTRAL_ORGANIZATION_MAPPING_CONFLICT',
    ],
  ] as const)(
    'fails safely for an unusable migration hint',
    async (rows, code) => {
      const value = setup({ organizations: [...rows] });
      await expectCode(
        value.service.resolve({
          centralOrganizationId: centralId,
          localOrganizationIdHint: localId,
        }),
        code,
      );
      expect(value.organization.updateMany).not.toHaveBeenCalled();
    },
  );

  it('claims the sole active unmapped organization without a hint', async () => {
    const value = setup({
      organizations: [
        { id: localId, centralOrganizationId: null, status: 'ACTIVE' },
        {
          id: otherLocalId,
          centralOrganizationId: null,
          status: 'DISABLED',
        },
      ],
    });
    await expect(
      value.service.resolve({ centralOrganizationId: centralId }),
    ).resolves.toMatchObject({ localOrganizationId: localId });
  });

  it.each([
    [[], 'NO_ACTIVE_UNMAPPED_LOCAL_ORGANIZATION'],
    [
      [
        { id: localId, centralOrganizationId: null, status: 'ACTIVE' },
        { id: otherLocalId, centralOrganizationId: null, status: 'ACTIVE' },
      ],
      'MULTIPLE_ACTIVE_UNMAPPED_LOCAL_ORGANIZATIONS',
    ],
  ] as const)(
    'does not create or guess when candidates are unsafe',
    async (rows, code) => {
      const value = setup({ organizations: [...rows] });
      await expectCode(
        value.service.resolve({ centralOrganizationId: centralId }),
        code,
      );
      expect(value.organization.updateMany).not.toHaveBeenCalled();
    },
  );

  it('converges on the persisted winner after a concurrent unique conflict', async () => {
    const organizations: Organization[] = [
      { id: localId, centralOrganizationId: null, status: 'ACTIVE' },
    ];
    const value = setup({
      organizations,
      update: async () => {
        organizations[0]!.centralOrganizationId = centralId;
        throw { code: 'P2002' };
      },
    });
    await expect(
      value.service.resolve({ centralOrganizationId: centralId }),
    ).resolves.toEqual({
      centralOrganizationId: centralId,
      localOrganizationId: localId,
    });
  });

  it('rejects a different hinted winner after a concurrent unique conflict', async () => {
    const organizations: Organization[] = [
      { id: localId, centralOrganizationId: null, status: 'ACTIVE' },
      { id: otherLocalId, centralOrganizationId: null, status: 'ACTIVE' },
    ];
    const value = setup({
      organizations,
      update: async () => {
        organizations[1]!.centralOrganizationId = centralId;
        throw { code: 'P2002' };
      },
    });
    await expect(
      value.service.resolve({
        centralOrganizationId: centralId,
        localOrganizationIdHint: localId,
      }),
    ).rejects.toMatchObject({
      code: 'CENTRAL_ORGANIZATION_MAPPING_CONFLICT',
    });
  });
});
