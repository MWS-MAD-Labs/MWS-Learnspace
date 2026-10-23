import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { createAggregateRouter } from '../routes/aggregates-router.js';
import type { SessionService } from '../service/session-service.js';

const expectedRoutes = [
  ['get', '/organizations/:organizationId/dashboard-summary'],
  ['get', '/organizations/:organizationId/search'],
  ['get', '/organizations/:organizationId/notifications'],
  ['get', '/organizations/:organizationId/reporting-aggregate'],
] as const;

describe('aggregate router composition', () => {
  it('preserves the exact authenticated route stack', () => {
    const router = createAggregateRouter(
      {} as PrismaClient,
      {} as SessionService,
    );
    const routes = router.app.routes;

    expect(routes).toHaveLength(expectedRoutes.length + 1);
    expect(routes[0]).toMatchObject({ method: 'ALL', path: '/*' });
    expect(
      routes.slice(1).map((route) => [route.method.toLowerCase(), route.path]),
    ).toEqual(expectedRoutes);
  });
});
