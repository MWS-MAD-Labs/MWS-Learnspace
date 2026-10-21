import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import { describe, expect, it } from 'vitest';
import { createWeeklyReportRouter } from '../routes/weekly-reports-router.js';
import type { SessionService } from '../service/session-service.js';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: unknown[];
  };
};

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

function layers(router: Router): RouterLayer[] {
  return (router as Router & { stack: RouterLayer[] }).stack;
}

describe('Weekly report router composition', () => {
  it('preserves the exact authenticated route stack', () => {
    const router = createWeeklyReportRouter(
      {} as PrismaClient,
      {} as SessionService,
    );
    const stack = layers(router);
    const routeLayers = stack.filter((layer) => layer.route);

    expect(stack).toHaveLength(expectedRoutes.length + 1);
    expect(stack[0]?.route).toBeUndefined();
    expect(
      routeLayers.map((layer) => {
        const route = layer.route!;
        return [Object.keys(route.methods)[0], route.path];
      }),
    ).toEqual(expectedRoutes);
    for (const layer of routeLayers) {
      const route = layer.route!;
      const method = Object.keys(route.methods)[0];
      expect(route.stack).toHaveLength(method === 'get' ? 1 : 2);
    }
  });
});
