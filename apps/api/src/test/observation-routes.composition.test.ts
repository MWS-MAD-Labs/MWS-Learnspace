import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import { describe, expect, it } from 'vitest';
import { createObservationRouter } from '../routes/observations-router.js';
import type { SessionService } from '../service/session-service.js';

type RouterLayer = {
  handle?: { stack?: RouterLayer[] };
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: unknown[];
  };
};

const expectedRoutes = [
  ['get', '/organizations/:organizationId/observation-definitions'],
  ['post', '/organizations/:organizationId/observation-definitions'],
  [
    'post',
    '/organizations/:organizationId/observation-definitions/:definitionId/versions',
  ],
  ['get', '/organizations/:organizationId/observation-assignments'],
  ['post', '/organizations/:organizationId/observation-assignments'],
  [
    'patch',
    '/organizations/:organizationId/observation-assignments/:assignmentId',
  ],
  [
    'post',
    '/organizations/:organizationId/observation-assignments/:assignmentId/cancel',
  ],
  [
    'post',
    '/organizations/:organizationId/observation-assignments/:assignmentId/fedc-observation',
  ],
  [
    'put',
    '/organizations/:organizationId/observation-assignments/:assignmentId/fedc-observation',
  ],
  [
    'post',
    '/organizations/:organizationId/observation-assignments/:assignmentId/fedc-observation/complete',
  ],
  [
    'get',
    '/organizations/:organizationId/observation-assignments/:assignmentId/fedc-observation',
  ],
  [
    'get',
    '/organizations/:organizationId/students/:studentId/fedc-observations',
  ],
  [
    'get',
    '/organizations/:organizationId/students/:studentId/fedc-observations/reference',
  ],
  [
    'post',
    '/organizations/:organizationId/observation-assignments/:assignmentId/sensory-profile-observation',
  ],
  [
    'put',
    '/organizations/:organizationId/observation-assignments/:assignmentId/sensory-profile-observation',
  ],
  [
    'post',
    '/organizations/:organizationId/observation-assignments/:assignmentId/sensory-profile-observation/complete',
  ],
  [
    'get',
    '/organizations/:organizationId/observation-assignments/:assignmentId/sensory-profile-observation',
  ],
  [
    'get',
    '/organizations/:organizationId/students/:studentId/sensory-profile-observations',
  ],
  [
    'get',
    '/organizations/:organizationId/students/:studentId/sensory-profile-observations/reference',
  ],
  [
    'post',
    '/organizations/:organizationId/observation-assignments/:assignmentId/sfa-observation',
  ],
  [
    'put',
    '/organizations/:organizationId/observation-assignments/:assignmentId/sfa-observation',
  ],
  [
    'post',
    '/organizations/:organizationId/observation-assignments/:assignmentId/sfa-observation/complete',
  ],
  [
    'get',
    '/organizations/:organizationId/observation-assignments/:assignmentId/sfa-observation',
  ],
  [
    'get',
    '/organizations/:organizationId/students/:studentId/sfa-observations',
  ],
  [
    'get',
    '/organizations/:organizationId/students/:studentId/sfa-observations/reference',
  ],
  [
    'delete',
    '/organizations/:organizationId/observation-assignments/:assignmentId',
  ],
] as const;

function layers(router: Router): RouterLayer[] {
  return (router as Router & { stack: RouterLayer[] }).stack;
}

function routes(stack: RouterLayer[]): RouterLayer[] {
  return stack.flatMap((layer) =>
    layer.route
      ? [layer]
      : layer.handle?.stack
        ? routes(layer.handle.stack)
        : [],
  );
}

describe('observation router composition', () => {
  it('preserves the exact authenticated route stack', () => {
    const router = createObservationRouter(
      {} as PrismaClient,
      {} as SessionService,
    );
    const stack = layers(router);
    const routeLayers = routes(stack);

    expect(stack).toHaveLength(7);
    expect(stack[0]?.route).toBeUndefined();
    expect(stack.slice(1).every((layer) => layer.handle?.stack)).toBe(true);
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
