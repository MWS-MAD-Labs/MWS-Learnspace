import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { createIepRouter } from '../routes/ieps-router.js';
import type { SessionService } from '../service/session-service.js';

const expectedRoutes = [
  ['get', '/organizations/:organizationId/ieps'],
  ['get', '/organizations/:organizationId/ieps/:iepId'],
  ['post', '/organizations/:organizationId/ieps'],
  ['post', '/organizations/:organizationId/ieps/:iepId/submit'],
  ['post', '/organizations/:organizationId/ieps/:iepId/coordinator-review'],
  ['post', '/organizations/:organizationId/ieps/:iepId/director-review'],
  ['post', '/organizations/:organizationId/ieps/:iepId/activate'],
  ['post', '/organizations/:organizationId/ieps/:iepId/archive'],
  ['put', '/organizations/:organizationId/ieps/:iepId'],
] as const;

describe('IEP router composition', () => {
  it('preserves the exact authenticated route stack', () => {
    const router = createIepRouter({} as PrismaClient, {} as SessionService);
    const routes = router.app.routes;

    expect(routes).toHaveLength(
      1 +
        expectedRoutes.filter(([method]) => method === 'get').length +
        expectedRoutes.filter(([method]) => method !== 'get').length * 2,
    );
    expect(routes[0]).toMatchObject({ method: 'ALL', path: '/*' });
    expect(
      routes
        .slice(1)
        .filter(
          (route, index, all) =>
            all.findIndex(
              (candidate) =>
                candidate.method === route.method &&
                candidate.path === route.path,
            ) === index,
        )
        .map((route) => [route.method.toLowerCase(), route.path]),
    ).toEqual(expectedRoutes);

    for (const [method, path] of expectedRoutes) {
      expect(
        routes.filter(
          (route) =>
            route.method === method.toUpperCase() && route.path === path,
        ),
      ).toHaveLength(method === 'get' ? 1 : 2);
    }
  });
});
