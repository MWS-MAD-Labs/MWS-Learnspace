import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import { describe, expect, it } from 'vitest';
import { createIepRouter } from '../routes/ieps-router.js';
import type { SessionService } from '../service/session-service.js';

type RouterLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: unknown[];
  };
};

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

function layers(router: Router): RouterLayer[] {
  return (router as Router & { stack: RouterLayer[] }).stack;
}

describe('IEP router composition', () => {
  it('preserves the exact authenticated route stack', () => {
    const router = createIepRouter({} as PrismaClient, {} as SessionService);
    const stack = layers(router);
    const routeLayers = stack.filter((layer) => layer.route);

    expect(stack).toHaveLength(expectedRoutes.length + 1);
    expect(stack[0]?.route).toBeUndefined();
    expect(routeLayers).toHaveLength(expectedRoutes.length);
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
