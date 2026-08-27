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
const csrf = 'sfa-observation-csrf';
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
  participationItems: [
    { id: 'regularClassroom', label: 'Regular Classroom' },
    { id: 'specialEdClassroom', label: 'Special Education Resource Room' },
    { id: 'playgroundRecess', label: 'Playground and Recess' },
    { id: 'transportation', label: 'Transportation and Hallway' },
    { id: 'bathroomToilet', label: 'Bathroom and Hygiene' },
    { id: 'transitions', label: 'Transitions and Movement' },
    { id: 'mealSnackTime', label: 'Mealtime and Cafeteria' },
  ],
  taskSupportItems: [
    { id: 'physicalAssistance', label: 'Physical Assistance' },
    { id: 'physicalAdaptation', label: 'Physical Adaptation' },
    { id: 'cognitiveAssistance', label: 'Cognitive Assistance' },
    { id: 'cognitiveAdaptation', label: 'Cognitive Adaptation' },
  ],
  activityPerformanceItems: [
    { id: 'travel', label: 'Travel' },
    { id: 'maintaining_posture', label: 'Maintaining Posture' },
    { id: 'manipulation', label: 'Manipulation' },
    { id: 'eating_drinking', label: 'Eating and Drinking' },
    { id: 'hygiene', label: 'Hygiene' },
    { id: 'clothing_management', label: 'Clothing Management' },
    { id: 'functional_communication', label: 'Functional Communication' },
    { id: 'memory_understanding', label: 'Memory and Understanding' },
    {
      id: 'following_social_conventions',
      label: 'Following Social Conventions',
    },
    { id: 'task_behavior_completion', label: 'Task Behavior and Completion' },
  ],
  adaptationOptions: [
    { id: 'slant-board', label: 'Slant board for paper positioning' },
    { id: 'pencil-grips', label: 'Chunky ergonomic pencil grips' },
    { id: 'visual-schedule', label: 'Visual daily schedule strip at desk' },
    { id: 'sensory-corner', label: 'Quiet sensory corner retreat access' },
    { id: 'headphones', label: 'Noise-reduction headphones' },
    { id: 'weighted-vest', label: 'Weighted sensory vest' },
    { id: 'first-then-card', label: 'Visual first-then transition card' },
    { id: 'raised-line', label: 'Raised-line handwriting worksheets' },
  ],
};

const completeResponses = {
  respondents: [{ name: 'Sam Specialist', role: 'OT', initials: 'SS' }],
  participationScores: {
    regularClassroom: 4,
    specialEdClassroom: 6,
    playgroundRecess: 4,
    transportation: 5,
    bathroomToilet: 5,
    transitions: 4,
    mealSnackTime: 4,
  },
  taskSupports: {
    physicalAssistance: 3,
    physicalAdaptation: 4,
    cognitiveAssistance: 3,
    cognitiveAdaptation: 3,
  },
  activityPerformance: {
    travel: 3,
    maintaining_posture: 3,
    manipulation: 3,
    eating_drinking: 4,
    hygiene: 4,
    clothing_management: 3,
    functional_communication: 3,
    memory_understanding: 3,
    following_social_conventions: 3,
    task_behavior_completion: 3,
  },
  adaptations: ['slant-board', 'visual-schedule'],
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

function command(overrides: Record<string, unknown> = {}) {
  return {
    assessmentDate: '2026-08-26',
    observationDate: '2026-08-25',
    programRecommendation: 'Regular',
    primaryLanguage: 'English',
    writingMethod: 'Adaptive grip',
    mobilityMethod: 'Independent ambulation',
    conditionsAffectingPerformance: 'Transitions',
    ...overrides,
  };
}

integration('assignment-bound SFA observations', () => {
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
        data: { slug: `sfa-${suffix}`, name: 'SFA School' },
      }),
      prisma.organization.create({
        data: { slug: `sfa-other-${suffix}`, name: 'Other SFA School' },
      }),
    ]);
    organizationId = organization.id;
    otherOrganizationId = otherOrganization.id;

    const [coordinator, specialist, teacher, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `sfa-coordinator-${suffix}@example.test`,
          displayName: 'SFA Coordinator',
        },
      }),
      prisma.user.create({
        data: {
          email: `sfa-specialist-${suffix}@example.test`,
          displayName: 'Sam Specialist',
        },
      }),
      prisma.user.create({
        data: {
          email: `sfa-teacher-${suffix}@example.test`,
          displayName: 'Unassigned SFA Teacher',
        },
      }),
      prisma.user.create({
        data: {
          email: `sfa-other-${suffix}@example.test`,
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
        data: { organizationId, userId: specialist.id, role: 'SPECIALIST' },
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
        studentNumber: `SFA-${suffix}`,
        fullName: 'SFA Student',
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
        definitionKey: `sfa-trusted-${suffix}`,
        version: 1,
        type: 'SFA',
        title: 'Trusted SFA v1',
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
        type: 'SFA',
        title: 'Trusted SFA v2',
        body: {
          ...definitionBody,
          participationItems: [
            ...definitionBody.participationItems,
            { id: 'v2-only', label: 'Only in v2' },
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

  it('rejects client totals, invalid ratings, and unknown definition items', async () => {
    const assignment = await createAssignment();
    const path = `/api/v1/organizations/${organizationId}/observation-assignments/${assignment.id}/sfa-observation`;

    expect(
      (
        await mutate(
          'post',
          path,
          specialistCookie,
          command({ participationAverage: 6, totalParticipationRawScore: 42 }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await mutate(
          'post',
          path,
          specialistCookie,
          command({ participationScores: { regularClassroom: 7 } }),
        )
      ).status,
    ).toBe(400);
    const unknown = await mutate(
      'post',
      path,
      specialistCookie,
      command({ participationScores: { unknown: 3 } }),
    );
    expect(unknown.status).toBe(400);
    expect(unknown.body).toMatchObject({
      error: { code: 'SFA_RESPONSES_INVALID' },
    });
    expect(
      await prisma.sFAObservation.count({
        where: { assignmentId: assignment.id },
      }),
    ).toBe(0);
  });

  it('allows only the active assignee to create and save a server-scored draft', async () => {
    const assignment = await createAssignment();
    const path = `/api/v1/organizations/${organizationId}/observation-assignments/${assignment.id}/sfa-observation`;
    const payload = command({
      respondents: completeResponses.respondents,
      participationScores: { regularClassroom: 4, specialEdClassroom: 6 },
      taskSupports: { physicalAssistance: 3 },
      activityPerformance: { travel: 3 },
      adaptations: ['slant-board'],
      notes: 'Draft note',
    });

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
      participationScores: { regularClassroom: 4, specialEdClassroom: 6 },
      totalParticipationRawScore: 10,
      participationAverage: 5,
      definition: { id: definitionV1Id, version: 1, body: definitionBody },
    });
    expect(created.body.data).not.toHaveProperty('settings');

    const saved = await mutate(
      'put',
      path,
      specialistCookie,
      command({
        ...completeResponses,
        assessmentDate: '2026-08-27',
        participationScores: {
          ...completeResponses.participationScores,
          regularClassroom: 1,
        },
        notes: 'Updated draft',
      }),
    );
    expect(saved.status).toBe(200);
    expect(saved.body.data).toMatchObject({
      assessmentDate: '2026-08-27',
      totalParticipationRawScore: 29,
      participationAverage: 4.14,
      notes: 'Updated draft',
    });

    await prisma.sFAObservation.update({
      where: { assignmentId: assignment.id },
      data: { totalParticipationRawScore: null },
    });
    const legacyCompatibleDetail = await request(app)
      .get(path)
      .set('cookie', specialistCookie);
    expect(legacyCompatibleDetail.status).toBe(200);
    expect(legacyCompatibleDetail.body.data.totalParticipationRawScore).toBe(
      29,
    );

    await prisma.sFAObservation.update({
      where: { assignmentId: assignment.id },
      data: {
        participationScores: 'malformed legacy value',
        totalParticipationRawScore: null,
      },
    });
    const malformedLegacyDetail = await request(app)
      .get(path)
      .set('cookie', specialistCookie);
    expect(malformedLegacyDetail.status).toBe(200);
    expect(malformedLegacyDetail.body.data.participationScores).toEqual({});
    expect(malformedLegacyDetail.body.data.totalParticipationRawScore).toBe(0);

    await prisma.membership.update({
      where: { id: specialistMembershipId },
      data: { status: 'DISABLED' },
    });
    expect(
      (
        await mutate(
          'put',
          path,
          specialistCookie,
          command({ ...completeResponses }),
        )
      ).status,
    ).toBe(403);
    await prisma.membership.update({
      where: { id: specialistMembershipId },
      data: { status: 'ACTIVE' },
    });
  });

  it('rejects draft saves after the assignment is cancelled', async () => {
    const assignment = await createAssignment();
    const path = `/api/v1/organizations/${organizationId}/observation-assignments/${assignment.id}/sfa-observation`;
    await mutate(
      'post',
      path,
      specialistCookie,
      command({
        participationScores: { regularClassroom: 3 },
        taskSupports: {},
        activityPerformance: {},
        adaptations: [],
        respondents: [],
        notes: 'Before cancellation',
      }),
    );
    await prisma.observationAssignment.update({
      where: { id: assignment.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: coordinatorId,
        cancellationReason: 'No longer required',
      },
    });

    const denied = await mutate(
      'put',
      path,
      specialistCookie,
      command({
        ...completeResponses,
        notes: 'Must not persist after cancellation',
      }),
    );
    expect(denied.status).toBe(409);
    expect(denied.body).toMatchObject({
      error: { code: 'SFA_OBSERVATION_INVALID_STATE' },
    });
    expect(
      await prisma.sFAObservation.findUniqueOrThrow({
        where: { assignmentId: assignment.id },
        select: { notes: true },
      }),
    ).toEqual({ notes: 'Before cancellation' });
  });

  it('requires every pinned item and atomically completes record and assignment', async () => {
    const assignment = await createAssignment();
    const path = `/api/v1/organizations/${organizationId}/observation-assignments/${assignment.id}/sfa-observation`;
    await mutate(
      'post',
      path,
      specialistCookie,
      command({ participationScores: { regularClassroom: 3 } }),
    );

    const incomplete = await mutate(
      'post',
      `${path}/complete`,
      specialistCookie,
      command({
        respondents: completeResponses.respondents,
        participationScores: { regularClassroom: 3 },
        taskSupports: {},
        activityPerformance: {},
        adaptations: [],
      }),
    );
    expect(incomplete.status).toBe(400);
    expect(incomplete.body).toMatchObject({
      error: { code: 'SFA_RESPONSES_INCOMPLETE' },
    });

    const completed = await mutate(
      'post',
      `${path}/complete`,
      specialistCookie,
      command({
        ...completeResponses,
        assessmentDate: '2026-08-28',
        notes: 'Completed from validated responses.',
      }),
    );
    expect(completed.status).toBe(200);
    expect(completed.body.data).toMatchObject({
      status: 'COMPLETED',
      totalParticipationRawScore: 32,
      participationAverage: 4.57,
      definition: { id: definitionV1Id, version: 1 },
    });

    const [record, assignmentRow, audits] = await Promise.all([
      prisma.sFAObservation.findUniqueOrThrow({
        where: { assignmentId: assignment.id },
      }),
      prisma.observationAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
      }),
      prisma.auditEvent.findMany({
        where: {
          organizationId,
          targetType: 'SFAObservation',
          targetId: completed.body.data.id,
        },
        orderBy: { occurredAt: 'asc' },
      }),
    ]);
    expect(record.totalParticipationRawScore).toBe(32);
    expect(record.participationAverage.toNumber()).toBe(4.57);
    expect(assignmentRow.status).toBe('COMPLETED');
    expect(assignmentRow.completedAt?.toISOString()).toBe(
      record.completedAt?.toISOString(),
    );
    expect(audits.map((audit) => audit.action)).toEqual([
      'sfa_observation.create_draft',
      'sfa_observation.complete',
    ]);
    expect(audits.every((audit) => audit.actorId === specialistId)).toBe(true);
    expect(JSON.stringify(audits.map((audit) => audit.metadata))).not.toContain(
      'Completed from validated responses.',
    );
    expect(
      (
        await mutate(
          'put',
          path,
          specialistCookie,
          command({ ...completeResponses }),
        )
      ).status,
    ).toBe(409);
  });

  it('returns pinned detail/history/reference only to authorized readers', async () => {
    const assignment = await createAssignment();
    const path = `/api/v1/organizations/${organizationId}/observation-assignments/${assignment.id}/sfa-observation`;
    await mutate('post', path, specialistCookie, command({}));
    await mutate(
      'post',
      `${path}/complete`,
      specialistCookie,
      command({ ...completeResponses, assessmentDate: '2026-08-20' }),
    );

    const detail = await request(app).get(path).set('cookie', specialistCookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({
      definitionId: definitionV1Id,
      definition: { id: definitionV1Id, version: 1 },
    });

    const historyPath = `/api/v1/organizations/${organizationId}/students/${studentId}/sfa-observations`;
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
      definition: { type: 'SFA' },
    });
    expect(
      (await request(app).get(historyPath).set('cookie', teacherCookie)).status,
    ).toBe(403);
    expect(
      (await request(app).get(historyPath).set('cookie', otherCookie)).status,
    ).toBe(403);
  });
});
