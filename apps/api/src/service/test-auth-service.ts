import type { DatabaseClient } from '../lib/database.js';

export function createTestAuthService(prisma: DatabaseClient) {
  return {
    findActiveUser(email: string) {
      return prisma.user.findFirst({
        where: {
          email,
          status: 'ACTIVE',
          memberships: {
            some: { status: 'ACTIVE', organization: { status: 'ACTIVE' } },
          },
        },
        select: { id: true },
      });
    },
  };
}

export type TestAuthService = ReturnType<typeof createTestAuthService>;
