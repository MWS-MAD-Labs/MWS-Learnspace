import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createResourceRouter } from '../routes/resources-router.js';
import { createRouter } from '../type/http.js';
import { httpTestClient } from './http-test-client.js';

const organizationId = '11111111-1111-4111-8111-111111111111';

function authenticatedSession() {
  return {
    id: 'session-id',
    userId: '22222222-2222-4222-8222-222222222222',
    user: {
      memberships: [
        {
          organizationId,
          role: 'DIRECTOR',
          unitScopes: [],
          gradeScopes: [],
          subjectScopes: [],
          staffAssignments: [],
          observationAssignments: [],
        },
      ],
    },
  };
}

function resourceApp(prisma: object, sessions: object) {
  const app = createRouter();
  app.use((_request, response, next) => {
    response.locals.requestId = 'resource-router-test';
    next();
  });
  app.use('/api/v1', createResourceRouter(prisma as never, sessions as never));
  return app;
}

describe('resource router composition', () => {
  it('rejects unauthenticated requests at the facade before feature services run', async () => {
    const findMany = vi.fn();
    const sessions = { lookup: vi.fn(async () => null) };
    const response = await request(
      httpTestClient(resourceApp({ organization: { findMany } }, sessions)),
    ).get('/api/v1/organizations');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(sessions.lookup).toHaveBeenCalledOnce();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('keeps every academics endpoint mounted behind shared authentication', async () => {
    const sessions = { lookup: vi.fn(async () => authenticatedSession()) };
    const prisma = {
      academicYear: { findMany: vi.fn(async () => []) },
      semester: { findMany: vi.fn(async () => []) },
      unit: { findMany: vi.fn(async () => []) },
      grade: { findMany: vi.fn(async () => []) },
      schoolClass: { findMany: vi.fn(async () => []) },
      subject: { findMany: vi.fn(async () => []) },
    };
    const app = resourceApp(prisma, sessions);
    const paths = [
      'academic-years',
      'semesters',
      'units',
      'grades',
      'classes',
      'subjects',
    ];

    for (const path of paths) {
      const response = await request(httpTestClient(app))
        .get(`/api/v1/organizations/${organizationId}/${path}`)
        .set('cookie', 'learnspace_session=session-token');
      expect(response.status, path).toBe(200);
      expect(response.body).toEqual({ data: [], meta: { count: 0 } });
    }

    expect(sessions.lookup).toHaveBeenCalledTimes(paths.length);
    expect(prisma.academicYear.findMany).toHaveBeenCalledOnce();
    expect(prisma.semester.findMany).toHaveBeenCalledOnce();
    expect(prisma.unit.findMany).toHaveBeenCalledOnce();
    expect(prisma.grade.findMany).toHaveBeenCalledOnce();
    expect(prisma.schoolClass.findMany).toHaveBeenCalledOnce();
    expect(prisma.subject.findMany).toHaveBeenCalledOnce();
  });
});
