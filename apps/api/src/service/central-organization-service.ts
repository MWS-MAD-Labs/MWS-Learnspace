import type { PrismaClient } from '@prisma/client';

export const centralOrganizationMappingErrorCodes = [
  'LOCAL_ORGANIZATION_NOT_FOUND',
  'LOCAL_ORGANIZATION_INACTIVE',
  'NO_ACTIVE_UNMAPPED_LOCAL_ORGANIZATION',
  'MULTIPLE_ACTIVE_UNMAPPED_LOCAL_ORGANIZATIONS',
  'CENTRAL_ORGANIZATION_MAPPING_CONFLICT',
  'CENTRAL_ORGANIZATION_MAPPING_WRITE_CONFLICT',
] as const;

export type CentralOrganizationMappingErrorCode =
  (typeof centralOrganizationMappingErrorCodes)[number];

const errorMessages: Record<CentralOrganizationMappingErrorCode, string> = {
  LOCAL_ORGANIZATION_NOT_FOUND:
    'The configured local organization does not exist.',
  LOCAL_ORGANIZATION_INACTIVE:
    'The configured local organization is not active.',
  NO_ACTIVE_UNMAPPED_LOCAL_ORGANIZATION:
    'No active unmapped local organization is available.',
  MULTIPLE_ACTIVE_UNMAPPED_LOCAL_ORGANIZATIONS:
    'Multiple active unmapped local organizations are available.',
  CENTRAL_ORGANIZATION_MAPPING_CONFLICT:
    'The Central organization mapping conflicts with an existing mapping.',
  CENTRAL_ORGANIZATION_MAPPING_WRITE_CONFLICT:
    'The Central organization mapping could not be claimed safely.',
};

export class CentralOrganizationMappingError extends Error {
  constructor(public readonly code: CentralOrganizationMappingErrorCode) {
    super(errorMessages[code]);
    this.name = 'CentralOrganizationMappingError';
  }
}

export type CentralOrganizationMapping = {
  centralOrganizationId: string;
  localOrganizationId: string;
};

export type ResolveCentralOrganizationInput = {
  centralOrganizationId: string;
  localOrganizationIdHint?: string;
};

type OrganizationClient = Pick<PrismaClient, 'organization'>;

const mappingSelect = {
  id: true,
  centralOrganizationId: true,
  status: true,
} as const;

function mapping(
  localOrganizationId: string,
  centralOrganizationId: string,
): CentralOrganizationMapping {
  return { localOrganizationId, centralOrganizationId };
}

function mappingError(
  code: CentralOrganizationMappingErrorCode,
): CentralOrganizationMappingError {
  return new CentralOrganizationMappingError(code);
}

function isUniqueConflict(error: unknown): boolean {
  return (error as { code?: unknown })?.code === 'P2002';
}

export function createCentralOrganizationService(prisma: OrganizationClient) {
  async function persistedMapping(input: ResolveCentralOrganizationInput) {
    const existing = await prisma.organization.findUnique({
      where: { centralOrganizationId: input.centralOrganizationId },
      select: mappingSelect,
    });
    if (!existing) return undefined;
    if (
      input.localOrganizationIdHint &&
      existing.id !== input.localOrganizationIdHint
    ) {
      throw mappingError('CENTRAL_ORGANIZATION_MAPPING_CONFLICT');
    }
    return mapping(existing.id, input.centralOrganizationId);
  }

  async function reconcileClaim(
    input: ResolveCentralOrganizationInput,
    candidateId: string,
  ): Promise<CentralOrganizationMapping> {
    const existing = await persistedMapping(input);
    if (existing) return existing;

    const candidate = await prisma.organization.findUnique({
      where: { id: candidateId },
      select: mappingSelect,
    });
    if (candidate?.centralOrganizationId === input.centralOrganizationId) {
      return mapping(candidate.id, input.centralOrganizationId);
    }
    if (candidate?.centralOrganizationId) {
      throw mappingError('CENTRAL_ORGANIZATION_MAPPING_CONFLICT');
    }
    if (input.localOrganizationIdHint && !candidate) {
      throw mappingError('LOCAL_ORGANIZATION_NOT_FOUND');
    }
    if (input.localOrganizationIdHint && candidate?.status !== 'ACTIVE') {
      throw mappingError('LOCAL_ORGANIZATION_INACTIVE');
    }
    throw mappingError('CENTRAL_ORGANIZATION_MAPPING_WRITE_CONFLICT');
  }

  async function candidateId(
    input: ResolveCentralOrganizationInput,
  ): Promise<string> {
    if (input.localOrganizationIdHint) {
      const hinted = await prisma.organization.findUnique({
        where: { id: input.localOrganizationIdHint },
        select: mappingSelect,
      });
      if (!hinted) throw mappingError('LOCAL_ORGANIZATION_NOT_FOUND');
      if (hinted.status !== 'ACTIVE') {
        throw mappingError('LOCAL_ORGANIZATION_INACTIVE');
      }
      if (hinted.centralOrganizationId) {
        throw mappingError('CENTRAL_ORGANIZATION_MAPPING_CONFLICT');
      }
      return hinted.id;
    }

    const candidates = await prisma.organization.findMany({
      where: { status: 'ACTIVE', centralOrganizationId: null },
      orderBy: { id: 'asc' },
      take: 2,
      select: { id: true },
    });
    if (candidates.length === 0) {
      throw mappingError('NO_ACTIVE_UNMAPPED_LOCAL_ORGANIZATION');
    }
    if (candidates.length > 1) {
      throw mappingError('MULTIPLE_ACTIVE_UNMAPPED_LOCAL_ORGANIZATIONS');
    }
    return candidates[0]!.id;
  }

  return {
    async resolve(
      input: ResolveCentralOrganizationInput,
    ): Promise<CentralOrganizationMapping> {
      const existing = await persistedMapping(input);
      if (existing) return existing;

      const localOrganizationId = await candidateId(input);
      try {
        const claimed = await prisma.organization.updateMany({
          where: {
            id: localOrganizationId,
            status: 'ACTIVE',
            centralOrganizationId: null,
          },
          data: { centralOrganizationId: input.centralOrganizationId },
        });
        if (claimed.count === 1) {
          return mapping(localOrganizationId, input.centralOrganizationId);
        }
      } catch (error) {
        if (!isUniqueConflict(error)) throw error;
      }
      return reconcileClaim(input, localOrganizationId);
    },
  };
}

export type CentralOrganizationService = ReturnType<
  typeof createCentralOrganizationService
>;
