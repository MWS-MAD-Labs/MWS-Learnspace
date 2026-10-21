import type { PrismaClient } from '@prisma/client';

export function createStaffDirectoryService(prisma: PrismaClient) {
  return {
    async list(organizationId: string) {
      const rows = await prisma.membership.findMany({
        where: {
          organizationId,
          status: 'ACTIVE',
          user: { status: 'ACTIVE' },
        },
        orderBy: [{ user: { displayName: 'asc' } }, { id: 'asc' }],
        select: {
          id: true,
          organizationId: true,
          role: true,
          roleTitle: true,
          status: true,
          user: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      });
      return rows.map((row) => ({
        membershipId: row.id,
        userId: row.user.id,
        organizationId: row.organizationId,
        displayName: row.user.displayName,
        avatarUrl: row.user.avatarUrl,
        role: row.role,
        roleTitle: row.roleTitle,
        status: row.status,
      }));
    },
  };
}

export type StaffDirectoryService = ReturnType<
  typeof createStaffDirectoryService
>;
