import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { createWeeklyReportRouter } from '../routes/weekly-reports-router.js';
import type { SessionService } from '../service/session-service.js';

const expectedRoutes = [
  ['get', '/organizations/:organizationId/weekly-reports'],
  ['get', '/organizations/:organizationId/weekly-reports/:reportId'],
  ['post', '/organizations/:organizationId/weekly-reports'],
  ['put', '/organizations/:organizationId/weekly-reports/:reportId'],
  ['post', '/organizations/:organizationId/weekly-reports/:reportId/submit'],
  [
    'post',
    '/organizations/:organizationId/weekly-reports/:reportId/coordinator-decision',
  ],
  [
    'post',
    '/organizations/:organizationId/weekly-reports/:reportId/director-decision',
  ],
] as const;

describe('Weekly report router composition', () => {
  it('preserves the exact authenticated route stack', () => {
    const router = createWeeklyReportRouter(
      {} as PrismaClient,
      {} as SessionService,
    );
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
