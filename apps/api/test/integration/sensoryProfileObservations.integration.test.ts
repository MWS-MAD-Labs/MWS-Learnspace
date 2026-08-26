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
const csrf = 'sensory-profile-observation-csrf';
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
  items: [
    {
      id: 'sp-1',
      number: 1,
      section: 'Auditory',
      text: 'Reacts strongly to unexpected sounds.',
      quadrant: 'SN',
      schoolFactor: 'School Factor 1',
      factorLabel: 'SENSORY SENSITIVE',
    },
    {
      id: 'sp-2',
      number: 2,
      section: 'Auditory',
      text: 'Appears not to hear in a busy classroom.',
      quadrant: 'RG',
    },
    {
      id: 'sp-3',
      number: 3,
      section: 'Behavioral',
      text: 'Needs support after sensory overload.',
    },
  ],
};

let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;
let organizationId: string;
let otherOrganizationId: string;
let coordinatorId: string;
let specialistId: string;
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
  method: 'post' | 'put',
  path: string,
  cookie: string,
  body: unknown,
) {
  const client = request(app);
  const call = method === 'post' ? client.post(path) : client.put(path);
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

integration('assignment-bound Sensory Profile observations', () => {
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
        data: { slug: `sensory-${suffix}`, name: 'Sensory School' },
      }),
      prisma.organization.create({
        data: {
          slug: `sensory-other-${suffix}`,
          name: 'Other Sensory School',
        },
      }),
    ]);
    organizationId = organization.id;
    otherOrganizationId = otherOrganization.id;

    const [coordinator, specialist, teacher, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `sensory-coordinator-${suffix}@example.test`,
          displayName: 'Sensory Coordinator',
        },
      }),
      prisma.user.create({
        data: {
          email: `sensory-specialist-${suffix}@example.test`,
          displayName: 'Sensory Specialist',
        },
      }),
      prisma.user.create({
        data: {
          email: `sensory-teacher-${suffix}@example.test`,
          displayName: 'Unassigned Sensory Teacher',
        },
      }),
      prisma.user.create({
        data: {
          email: `sensory-other-${suffix}@example.test`,
          displayName: 'Other Organization User',
        },
      }),
    ]);
    coordinatorId = coordinator.id;
    specialistId = specialist.id;

    const [, specialistMembership] = await Promise.all([
      prisma.membership.create({
        data: {
          organizationId,
          userId: coordinator.id,
          role: 'SPECIAL_ED_COORDINATOR',
        },
      }),
      prisma.membership.create({
        data: {
          organizationId,
          userId: specialist.id,
          role: 'SPECIALIST',
        },
      }),
      prisma.membership.create({
        data: {
          organizationId,
          userId: teacher.id,
          role: 'SPECIAL_ED_TEACHER',
        },
      }),
      prisma.membership.create({
        data: {
          organizationId: otherOrganizationId,
          userId: otherUser.id,
          role: 'SPECIALIST',
        },
      }),
    ]);
    specialistMembershipId = specialistMembership.id;

    const student = await prisma.student.create({
      data: {
        organizationId,
        studentNumber: `SENSORY-${suffix}`,
        fullName: 'Sensory Student',
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
        definitionKey: `sensory-trusted-${suffix}`,
        version: 1,
        type: 'SENSORY_PROFILE',
        title: 'Trusted Sensory Profile v1',
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
        type: 'SENSORY_PROFILE',
        title: 'Trusted Sensory Profile v2',
        body: {
          items: [
            ...definitionBody.items,
            {
              id: 'sp-4',
              number: 4,
              section: 'Movement',
              text: 'Only exists in v2.',
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
        authenticatedCookie(coordinator.id),
        authenticatedCookie(specialist.id),
        authenticatedCookie(teacher.id),
        authenticatedCookie(otherUser.id),
      ]);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('rejects client totals, invalid ratings, and unknown items before persistence', async () => {
    const assignment = await createAssignment();
    const path = `/api/v1/organizations/${organizationId}/observation-assignments/${assignment.id}/sensory-profile-observation`;

    expect(
      (
        await mutate('post', path, specialistCookie, {
          observationDate: '2026-08-26',
          responses: {},
          sectionScores: { auditory: { raw: 999, max: 999 } },
          totalRawScore: 999,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await mutate('post', path, specialistCookie, {
          observationDate: '2026-08-26',
          responses: { 'sp-1': 6 },
        })
      ).status,
    ).toBe(400);
    const unknown = await mutate('post', path, specialistCookie, {
      observationDate: '2026-08-26',
      responses: { unknown: 3 },
    });
    expect(unknown.status).toBe(400);
    expect(unknown.body).toMatchObject({
      error: { code: 'SENSORY_PROFILE_RESPONSES_INVALID' },
    });
    expect(
      await prisma.sensoryProfileObservation.count({
        where: { assignmentId: assignment.id },
      }),
    ).toBe(0);
  });

  it('allows only the assignee to create/save a server-scored partial draft', async () => {
    const assignment = await createAssignment();
    const path = `/api/v1/organizations/${organizationId}/observation-assignments/${assignment.id}/sensory-profile-observation`;
    const payload = {
      observationDate: '2026-08-26',
      teacherContactFrequency: 'Daily',
      teacherContactLength: 'Full school year',
      responses: { 'sp-1': 5, 'sp-3': 0 },
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
      responses: { 'sp-1': 5, 'sp-3': 0 },
      sectionScores: {
        auditory: { raw: 5, max: 10 },
        visual: { raw: 0, max: 0 },
        touch: { raw: 0, max: 0 },
        movement: { raw: 0, max: 0 },
        behavioral: { raw: 0, max: 5 },
      },
      totalRawScore: 5,
      definition: { id: definitionV1Id, version: 1, body: definitionBody },
    });

    const saved = await mutate('put', path, specialistCookie, {
      observationDate: '2026-08-27',
      responses: { 'sp-1': 0, 'sp-2': 5 },
      notes: 'Updated draft',
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data).toMatchObject({
      observationDate: '2026-08-27',
      sectionScores: {
        auditory: { raw: 5, max: 10 },
        behavioral: { raw: 0, max: 5 },
      },
      totalRawScore: 5,
      notes: 'Updated draft',
    });
  });

  it('requires every pinned item and atomically completes record and assignment', async () => {
    const assignment = await createAssignment();
    const path = `/api/v1/organizations/${organizationId}/observation-assignments/${assignment.id}/sensory-profile-observation`;
    await mutate('post', path, specialistCookie, {
      observationDate: '2026-08-26',
      responses: { 'sp-1': 3 },
    });

    const incomplete = await mutate(
      'post',
      `${path}/complete`,
      specialistCookie,
      { observationDate: '2026-08-26', responses: { 'sp-1': 3 } },
    );
    expect(incomplete.status).toBe(400);
    expect(incomplete.body).toMatchObject({
      error: { code: 'SENSORY_PROFILE_RESPONSES_INCOMPLETE' },
    });

    const completed = await mutate(
      'post',
      `${path}/complete`,
      specialistCookie,
      {
        observationDate: '2026-08-28',
        responses: { 'sp-1': 0, 'sp-2': 5, 'sp-3': 4 },
        notes: 'Completed from validated responses.',
      },
    );
    expect(completed.status).toBe(200);
    expect(completed.body.data).toMatchObject({
      status: 'COMPLETED',
      sectionScores: {
        auditory: { raw: 5, max: 10 },
        behavioral: { raw: 4, max: 5 },
      },
      totalRawScore: 9,
      definition: { id: definitionV1Id, version: 1 },
    });

    const [record, assignmentRow, audits] = await Promise.all([
      prisma.sensoryProfileObservation.findUniqueOrThrow({
        where: { assignmentId: assignment.id },
      }),
      prisma.observationAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
      }),
      prisma.auditEvent.findMany({
        where: {
          organizationId,
          targetType: 'SensoryProfileObservation',
          targetId: completed.body.data.id,
        },
        orderBy: { occurredAt: 'asc' },
      }),
    ]);
    expect(record.totalRawScore).toBe(9);
    expect(assignmentRow.status).toBe('COMPLETED');
    expect(assignmentRow.completedAt?.toISOString()).toBe(
      record.completedAt?.toISOString(),
    );
    expect(audits.map((audit) => audit.action)).toEqual([
      'sensory_profile_observation.create_draft',
      'sensory_profile_observation.complete',
    ]);
    expect(audits.every((audit) => audit.actorId === specialistId)).toBe(true);
    expect(JSON.stringify(audits.map((audit) => audit.metadata))).not.toContain(
      'Completed from validated responses.',
    );
    expect(
      (
        await mutate('put', path, specialistCookie, {
          observationDate: '2026-08-29',
          responses: { 'sp-1': 1, 'sp-2': 1, 'sp-3': 1 },
        })
      ).status,
    ).toBe(409);
  });

  it('returns pinned history/reference only to authorized readers', async () => {
    const assignment = await createAssignment();
    const path = `/api/v1/organizations/${organizationId}/observation-assignments/${assignment.id}/sensory-profile-observation`;
    await mutate('post', path, specialistCookie, {
      observationDate: '2026-08-20',
      responses: {},
    });
    await mutate('post', `${path}/complete`, specialistCookie, {
      observationDate: '2026-08-20',
      responses: { 'sp-1': 1, 'sp-2': 2, 'sp-3': 3 },
    });

    const historyPath = `/api/v1/organizations/${organizationId}/students/${studentId}/sensory-profile-observations`;
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

    const reference = await request(app)
      .get(`${historyPath}/reference`)
      .set('cookie', coordinatorCookie);
    expect(reference.status).toBe(200);
    expect(reference.body.data).toMatchObject({
      status: 'COMPLETED',
      studentId,
      definition: { type: 'SENSORY_PROFILE' },
    });
    expect(
      (await request(app).get(historyPath).set('cookie', teacherCookie)).status,
    ).toBe(403);
    expect(
      (await request(app).get(historyPath).set('cookie', otherCookie)).status,
    ).toBe(403);
  });
});
