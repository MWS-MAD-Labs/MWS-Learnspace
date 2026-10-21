import type { PrismaClient } from '@prisma/client';
import type { MembershipScope } from '../utils/authorization.js';
import { organizationSchoolDate } from '../utils/organization-time.js';
import { aggregateSearchItems } from '../utils/aggregates.queries.js';

export function createAggregateSearchQueryService(prisma: PrismaClient) {
  return {
    async search(
      organizationId: string,
      membership: MembershipScope,
      query: { q: string; limit?: number; offset?: number },
    ) {
      const limit = query.limit ?? 10;
      const offset = query.offset ?? 0;
      const windowSize = offset + limit + 1;
      const { schoolDate } = await organizationSchoolDate(
        prisma,
        organizationId,
      );
      const allItems = await aggregateSearchItems(
        prisma,
        organizationId,
        membership,
        query.q,
        windowSize,
        schoolDate,
      );
      const data = allItems.slice(offset, offset + limit);
      return {
        data,
        meta: {
          count: data.length,
          limit,
          offset,
          hasMore: allItems.length > offset + limit,
        },
      };
    },
  };
}

export type AggregateSearchQueryService = ReturnType<
  typeof createAggregateSearchQueryService
>;
