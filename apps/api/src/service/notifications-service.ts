import type { PrismaClient } from '@prisma/client';
import type { MembershipScope } from '../utils/authorization.js';
import { organizationSchoolDate } from '../utils/organization-time.js';
import { aggregateNotifications } from '../utils/aggregates.queries.js';

export function createNotificationsQueryService(prisma: PrismaClient) {
  return {
    async list(
      organizationId: string,
      membership: MembershipScope,
      userId: string,
    ) {
      const { schoolDate } = await organizationSchoolDate(
        prisma,
        organizationId,
      );
      return aggregateNotifications(
        prisma,
        organizationId,
        membership,
        userId,
        schoolDate,
      );
    },
  };
}

export type NotificationsQueryService = ReturnType<
  typeof createNotificationsQueryService
>;
