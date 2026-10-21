import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import { describe, expect, it } from 'vitest';
import { createAggregateRouter } from '../routes/aggregates-router.js';
import type { SessionService } from '../service/session-service.js';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: unknown[];
  };
};

const expectedRoutes = [
  ['get', '/organizations/:organizationId/dashboard-summary'],
  ['get', '/organizations/:organizationId/search'],
  ['get', '/organizations/:organizationId/notifications'],
  ['get', '/organizations/:organizationId/reporting-aggregate'],
] as const;

function layers(router: Router): RouterLayer[] {
  return (router as Router & { stack: RouterLayer[] }).stack;
}

describe('aggregate router composition', () => {
  it('preserves the exact authenticated route stack', () => {
    const router = createAggregateRouter(
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
      expect(layer.route!.stack).toHaveLength(1);
    }
  });
});
