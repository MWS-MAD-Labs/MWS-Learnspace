import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import type { AppConfig } from '../../src/config.js';
import { SessionService } from '../../src/sessionService.js';

const databaseUrl = process.env.DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const csrf = 'fedc-observation-csrf';
const config: AppConfig = {
  nodeEnv: 'test',
  port: 4000,
  databaseUrl: databaseUrl ?? 'postgresql://localhost/learnspace',
  appUrl: 'http://localhost:3000',
  sessionSecret: 'a-secure-session-secret-with-32-characters',
  googleClientId: 'client',
  googleClientSecret: 'secret',
  googleAllowedDomains: [],
  googleRedirectUri: 'http://localhost:4000/api/v1/auth/callback',
  authAdmissionMode: 'DENY_UNKNOWN',
  sessionTtlHours: 24,
  logLevel: 'info',
};
const logger = {
  fatal() {},
  error() {},
  warn() {},
  info() {},
  debug() {},
  trace() {},
};

const definitionBody = {
  milestones: [
    {
      id: 1,
      title: 'Regulation',
      maxScore: 6,
      items: [
        {
          id: 'fedc-1-1',
          number: '1.1',
          text: 'Maintains regulation.',
          milestoneId: 1,
        },
        {
          id: 'fedc-1-2',
          number: '1.2',
          text: 'Shares attention.',
          milestoneId: 1,
        },
      ],
    },
    {
      id: 2,
      title: 'Engagement',
      maxScore: 3,
      items: [
        {
          id: 'fedc-2-1',
          number: '2.1',
          text: 'Engages reciprocally.',
          milestoneId: 2,
        },
      ],
    },
  ],
};

let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;
let organizationId: string;
let otherOrganizationId: string;
let coordinatorId: string;
let specialistId: string;
let teacherId: string;
let otherUserId: string;
let specialistMembershipId: string;
let studentId: string;
let definitionV1Id: string;
let definitionV2Id: string;
let academicYear: string;
let coordinatorCookie: string;
let specialistCookie: string;
let teacherCookie: string;
let otherCookie: string;

async function authenticatedCookie(userId: string): Promise<string> {
  const sessions = new SessionService(
    prisma,
    config.sessionSecret,
    config.sessionTtlHours,
  );
  const session = await sessions.create(userId);
  return `learnspace_session=${session.token}`;
}

function mutate(
  method: 'post' | 'put' | 'patch',
  path: string,
  cookie: string,
  body: unknown,
) {
  const client = request(app);
  const call =
    method === 'post'
      ? client.post(path)
      : method === 'put'
        ? client.put(path)
        : client.patch(path);
  return call
    .set('cookie', `${cookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body as object);
}

async function createAssignment() {
  return prisma.observationAssignment.create({
    data: {
      organizationId,
      studentId,
      definitionId: definitionV1Id,
      assignedToId: specialistMembershipId,
      assignedById: coordinatorId,
      academicYear,
      dueDate: new Date('2026-09-15T00:00:00.000Z'),
    },
  });
}

integration('assignment-bound FEDC observations', () => {
  beforeAll(async () => {
    execFileSync(
      'npx',
      ['prisma', 'migrate', 'deploy', '--schema', '../../prisma/schema.prisma'],
      { cwd: process.cwd(), env: process.env, stdio: 'inherit' },
    );
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const suffix = randomUUID();
    const [organization, otherOrganization] = await Promise.all([
      prisma.organization.create({
        data: { slug: `fedc-${suffix}`, name: 'FEDC School' },
      }),
      prisma.organization.create({
        data: { slug: `fedc-other-${suffix}`, name: 'Other FEDC School' },
      }),
    ]);
    organizationId = organization.id;
    otherOrganizationId = otherOrganization.id;

    const [coordinator, specialist, teacher, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `fedc-coordinator-${suffix}@example.test`,
          displayName: 'FEDC Coordinator',
        },
      }),
      prisma.user.create({
        data: {
          email: `fedc-specialist-${suffix}@example.test`,
          displayName: 'FEDC Specialist',
        },
      }),
      prisma.user.create({
        data: {
          email: `fedc-teacher-${suffix}@example.test`,
          displayName: 'Unassigned FEDC Teacher',
        },
      }),
      prisma.user.create({
        data: {
          email: `fedc-other-${suffix}@example.test`,
          displayName: 'Other Organization User',
        },
      }),
    ]);
    coordinatorId = coordinator.id;
    specialistId = specialist.id;
    teacherId = teacher.id;
    otherUserId = otherUser.id;

    const [, specialistMembership] = await Promise.all([
      prisma.membership.create({
        data: {
          organizationId,
          userId: coordinatorId,
          role: 'SPECIAL_ED_COORDINATOR',
        },
      }),
      prisma.membership.create({
        data: {
          organizationId,
          userId: specialistId,
          role: 'SPECIALIST',
        },
      }),
      prisma.membership.create({
        data: {
          organizationId,
          userId: teacherId,
          role: 'SPECIAL_ED_TEACHER',
        },
      }),
      prisma.membership.create({
        data: {
          organizationId: otherOrganizationId,
          userId: otherUserId,
          role: 'SPECIALIST',
        },
      }),
    ]);
    specialistMembershipId = specialistMembership.id;

    const student = await prisma.student.create({
      data: {
        organizationId,
        studentNumber: `FEDC-${suffix}`,
        fullName: 'FEDC Student',
        dateOfBirth: new Date('2018-01-01T00:00:00.000Z'),
        specialNeedsFlag: true,
        status: 'ACTIVE',
      },
    });
    studentId = student.id;
    academicYear = `2026-${suffix}`;
    await prisma.academicYear.create({
      data: {
        organizationId,
        name: academicYear,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
        endsOn: new Date('2027-06-30T00:00:00.000Z'),
      },
    });
    const definitionV1 = await prisma.observationDefinition.create({
      data: {
        organizationId,
        definitionKey: `fedc-trusted-${suffix}`,
        version: 1,
        type: 'FEDC',
        title: 'Trusted FEDC v1',
        body: definitionBody,
        isActive: true,
        publishedAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    });
    definitionV1Id = definitionV1.id;
    const definitionV2 = await prisma.observationDefinition.create({
      data: {
        organizationId,
        definitionKey: definitionV1.definitionKey,
        version: 2,
        type: 'FEDC',
        title: 'Trusted FEDC v2',
        body: {
          milestones: [
            ...definitionBody.milestones,
            {
              id: 3,
              title: 'New v2 milestone',
              maxScore: 3,
              items: [
                {
                  id: 'fedc-3-1',
                  number: '3.1',
                  text: 'Only exists in v2.',
                  milestoneId: 3,
                },
              ],
            },
          ],
        },
        isActive: true,
        publishedAt: new Date('2026-08-02T00:00:00.000Z'),
      },
    });
    definitionV2Id = definitionV2.id;

    const sessions = new SessionService(
      prisma,
      config.sessionSecret,
      config.sessionTtlHours,
    );
    app = createApp({
      config,
      database: {
        client: prisma,
        check: async () => undefined,
        close: async () => undefined,
      },
      logger,
      auth: { sessions, oauth: {} as never },
    });
    [coordinatorCookie, specialistCookie, teacherCookie, otherCookie] =
      await Promise.all([
        authenticatedCookie(coordinatorId),
        authenticatedCookie(specialistId),
        authenticatedCookie(teacherId),
        authenticatedCookie(otherUserId),
      ]);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('rejects spoofed totals and malformed responses before persistence', async () => {
    const assignment = await createAssignment();
    const path = `/api/v1/organizations/${organizationId}/observation-assignments/${assignment.id}/fedc-observation`;

    const spoofed = await mutate('post', path, specialistCookie, {
      observationDate: '2026-08-26',
      responses: {},
      totalScore: 999,
      maxPossibleScore: 999,
      milestoneScores: { 1: 999 },
    });
    expect(spoofed.status).toBe(400);
    expect(
      await prisma.fEDCObservation.count({
        where: { assignmentId: assignment.id },
      }),
    ).toBe(0);

    const malformed = await mutate('post', path, specialistCookie, {
      observationDate: '2026-08-26',
      responses: {
        unknown: { itemId: 'unknown', rating: 'S' },
      },
    });
    expect(malformed.status).toBe(400);
    expect(malformed.body).toMatchObject({
      error: { code: 'FEDC_RESPONSES_INVALID' },
    });
    expect(
      await prisma.fEDCObservation.count({
        where: { assignmentId: assignment.id },
      }),
    ).toBe(0);
  });

  it('allows only the exact assignee to create and save a server-scored draft', async () => {
    const assignment = await createAssignment();
    const path = `/api/v1/organizations/${organizationId}/observation-assignments/${assignment.id}/fedc-observation`;
    const payload = {
      observationDate: '2026-08-26',
      responses: {
        'fedc-1-1': {
          itemId: 'fedc-1-1',
          rating: 'S',
          masteredAge: '4 years',
        },
      },
      notes: 'Draft note',
    };

    expect((await mutate('post', path, teacherCookie, payload)).status).toBe(
      403,
    );
    expect((await mutate('post', path, otherCookie, payload)).status).toBe(403);

    const created = await mutate('post', path, specialistCookie, payload);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      assignmentId: assignment.id,
      studentId,
      definitionId: definitionV1Id,
      observerId: specialistId,
      status: 'IN_PROGRESS',
      responses: {
        'fedc-1-1': {
          itemId: 'fedc-1-1',
          rating: 'S',
          score: 3,
          masteredAge: '4 years',
        },
      },
      milestoneScores: { '1': 3, '2': 0 },
      totalScore: 3,
      maxPossibleScore: 9,
      definition: { id: definitionV1Id, version: 1, body: definitionBody },
    });

    const persistedAssignment =
      await prisma.observationAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
      });
    expect(persistedAssignment.status).toBe('IN_PROGRESS');

    const saved = await mutate('put', path, specialistCookie, {
      observationDate: '2026-08-27',
      responses: {
        'fedc-1-1': { itemId: 'fedc-1-1', rating: 'T' },
        'fedc-1-2': { itemId: 'fedc-1-2', rating: 'K' },
      },
      notes: 'Updated draft note',
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data).toMatchObject({
      observationDate: '2026-08-27',
      milestoneScores: { '1': 3, '2': 0 },
      totalScore: 3,
      maxPossibleScore: 9,
      notes: 'Updated draft note',
    });
  });

  it('validates completeness and atomically completes the record and assignment', async () => {
    const assignment = await createAssignment();
    const path = `/api/v1/organizations/${organizationId}/observation-assignments/${assignment.id}/fedc-observation`;
    await mutate('post', path, specialistCookie, {
      observationDate: '2026-08-26',
      responses: {
        'fedc-1-1': { itemId: 'fedc-1-1', rating: 'S' },
      },
    });

    const incomplete = await mutate(
      'post',
      `${path}/complete`,
      specialistCookie,
      {
        observationDate: '2026-08-26',
        responses: {
          'fedc-1-1': { itemId: 'fedc-1-1', rating: 'S' },
        },
      },
    );
    expect(incomplete.status).toBe(400);
    expect(incomplete.body).toMatchObject({
      error: { code: 'FEDC_RESPONSES_INCOMPLETE' },
    });
    expect(
      (
        await prisma.observationAssignment.findUniqueOrThrow({
          where: { id: assignment.id },
        })
      ).status,
    ).toBe('IN_PROGRESS');

    const completed = await mutate(
      'post',
      `${path}/complete`,
      specialistCookie,
      {
        observationDate: '2026-08-28',
        responses: {
          'fedc-1-1': { itemId: 'fedc-1-1', rating: 'S' },
          'fedc-1-2': { itemId: 'fedc-1-2', rating: 'K' },
          'fedc-2-1': { itemId: 'fedc-2-1', rating: 'H' },
        },
        notes: 'Completed from validated responses.',
      },
    );
    expect(completed.status).toBe(200);
    expect(completed.body.data).toMatchObject({
      status: 'COMPLETED',
      milestoneScores: { '1': 5, '2': 0 },
      totalScore: 5,
      maxPossibleScore: 9,
      definition: { id: definitionV1Id, version: 1 },
    });
    expect(completed.body.data.completedAt).toEqual(expect.any(String));

    const [persistedRecord, persistedAssignment, audits] = await Promise.all([
      prisma.fEDCObservation.findUniqueOrThrow({
        where: { assignmentId: assignment.id },
      }),
      prisma.observationAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
      }),
      prisma.auditEvent.findMany({
        where: {
          organizationId,
          targetType: 'FEDCObservation',
          targetId: completed.body.data.id,
        },
        orderBy: { occurredAt: 'asc' },
      }),
    ]);
    expect(persistedRecord.status).toBe('COMPLETED');
    expect(persistedRecord.totalScore).toBe(5);
    expect(persistedAssignment.status).toBe('COMPLETED');
    expect(persistedAssignment.completedAt?.toISOString()).toBe(
      persistedRecord.completedAt?.toISOString(),
    );
    expect(audits.map((audit) => audit.action)).toEqual([
      'fedc_observation.create_draft',
      'fedc_observation.complete',
    ]);
    expect(audits.every((audit) => audit.actorId === specialistId)).toBe(true);
    expect(JSON.stringify(audits.map((audit) => audit.metadata))).not.toContain(
      'Completed from validated responses.',
    );

    expect(
      (
        await mutate('put', path, specialistCookie, {
          observationDate: '2026-08-29',
          responses: {
            'fedc-1-1': { itemId: 'fedc-1-1', rating: 'H' },
            'fedc-1-2': { itemId: 'fedc-1-2', rating: 'H' },
            'fedc-2-1': { itemId: 'fedc-2-1', rating: 'H' },
          },
        })
      ).status,
    ).toBe(409);
  });

  it('returns pinned-version history/reference data only to authorized observers and coordinators', async () => {
    const assignment = await createAssignment();
    const path = `/api/v1/organizations/${organizationId}/observation-assignments/${assignment.id}/fedc-observation`;
    await mutate('post', path, specialistCookie, {
      observationDate: '2026-08-20',
      responses: {},
    });
    await mutate('post', `${path}/complete`, specialistCookie, {
      observationDate: '2026-08-20',
      responses: {
        'fedc-1-1': { itemId: 'fedc-1-1', rating: 'T' },
        'fedc-1-2': { itemId: 'fedc-1-2', rating: 'K' },
        'fedc-2-1': { itemId: 'fedc-2-1', rating: 'S' },
      },
    });

    const historyPath = `/api/v1/organizations/${organizationId}/students/${studentId}/fedc-observations`;
    const observerHistory = await request(app)
      .get(historyPath)
      .set('cookie', specialistCookie);
    expect(observerHistory.status).toBe(200);
    const currentRecord = observerHistory.body.data.find(
      (record: { assignmentId: string }) =>
        record.assignmentId === assignment.id,
    );
    expect(currentRecord).toMatchObject({
      definitionId: definitionV1Id,
      definition: { id: definitionV1Id, version: 1 },
    });
    expect(currentRecord.definition.id).not.toBe(definitionV2Id);

    const coordinatorHistory = await request(app)
      .get(historyPath)
      .set('cookie', coordinatorCookie);
    expect(coordinatorHistory.status).toBe(200);
    expect(coordinatorHistory.body.meta.count).toBeGreaterThan(0);

    const reference = await request(app)
      .get(`${historyPath}/reference`)
      .set('cookie', coordinatorCookie);
    expect(reference.status).toBe(200);
    expect(reference.body.data).toMatchObject({
      status: 'COMPLETED',
      studentId,
      definition: { type: 'FEDC' },
    });

    expect(
      (await request(app).get(historyPath).set('cookie', teacherCookie)).status,
    ).toBe(403);
    expect(
      (await request(app).get(historyPath).set('cookie', otherCookie)).status,
    ).toBe(403);
  });
});
