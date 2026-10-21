import type { PrismaClient } from '@prisma/client';
import type { OrganizationSettingsUpdateCommand } from '@learnspace/contracts';
import { createAuditService } from '../service/audit-service.js';
import { organizationSchoolDate } from '../utils/organization-time.js';

export function createOrganizationsService(prisma: PrismaClient) {
  return {
    list(organizationIds: string[]) {
      return prisma.organization.findMany({
        where: { id: { in: organizationIds }, status: 'ACTIVE' },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: { id: true, slug: true, name: true },
      });
    },
    schoolDate(organizationId: string) {
      return organizationSchoolDate(prisma, organizationId);
    },
    settings(organizationId: string) {
      return prisma.organization.findFirstOrThrow({
        where: { id: organizationId, status: 'ACTIVE' },
        select: { id: true, name: true, timezone: true },
      });
    },
    updateSettings(input: {
      organizationId: string;
      command: OrganizationSettingsUpdateCommand;
      actorId: string;
      requestId: string;
    }) {
      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.organization.findUniqueOrThrow({
          where: { id: input.organizationId },
          select: { id: true, name: true, timezone: true },
        });
        if (existing.timezone === input.command.timezone) return existing;
        const updated = await transaction.organization.update({
          where: { id: input.organizationId },
          data: { timezone: input.command.timezone },
          select: { id: true, name: true, timezone: true },
        });
        await createAuditService(transaction as PrismaClient).append({
          organizationId: input.organizationId,
          actorId: input.actorId,
          action: 'organization.settings.update',
          targetType: 'Organization',
          targetId: input.organizationId,
          requestId: input.requestId,
          result: 'SUCCEEDED',
          metadata: { changedFields: ['timezone'] },
        });
        return updated;
      });
    },
  };
}

export type OrganizationsService = ReturnType<
  typeof createOrganizationsService
>;
