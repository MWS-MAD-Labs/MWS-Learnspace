import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { createObservationRouter } from '../routes/observations-router.js';
import type { SessionService } from '../service/session-service.js';

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

describe('observation router composition', () => {
  it('preserves the exact authenticated route stack', () => {
    const router = createObservationRouter(
      {} as PrismaClient,
      {} as SessionService,
    );
    const registeredRoutes = router.app.routes.map(
      (route) => [route.method.toLowerCase(), route.path] as const,
    );
    const routes = [
      ...new Map(
        registeredRoutes.map((route) => [route.join(' '), route]),
      ).values(),
    ];

    expect(routes).toHaveLength(expectedRoutes.length + 1);
    expect(routes[0]).toEqual(['all', '/*']);
    expect(routes.slice(1)).toEqual(expectedRoutes);
  });
});
