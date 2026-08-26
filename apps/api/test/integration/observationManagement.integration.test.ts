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
const csrf = 'observation-management-csrf';
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

let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;
let organizationId: string;
let coordinatorId: string;
let specialistId: string;
let teacherId: string;
let specialistMembershipId: string;
let studentId: string;
let academicYear: string;
let coordinatorCookie: string;
let specialistCookie: string;
let teacherCookie: string;

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
  method: 'post' | 'patch' | 'delete',
  path: string,
  cookie: string,
  body?: unknown,
) {
  const client = request(app);
  const call =
    method === 'post'
      ? client.post(path)
      : method === 'patch'
        ? client.patch(path)
        : client.delete(path);
  call
    .set('cookie', `${cookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf);
  return body === undefined ? call : call.send(body as object);
}

integration('observation definition and assignment management', () => {
  beforeAll(async () => {
    execFileSync(
      'npx',
      ['prisma', 'migrate', 'deploy', '--schema', '../../prisma/schema.prisma'],
      { cwd: process.cwd(), env: process.env, stdio: 'inherit' },
    );
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const suffix = randomUUID();
    const organization = await prisma.organization.create({
      data: { slug: `observations-${suffix}`, name: 'Observation School' },
    });
    organizationId = organization.id;
    const [coordinator, specialist, teacher] = await Promise.all([
      prisma.user.create({
        data: {
          email: `observation-coordinator-${suffix}@example.test`,
          displayName: 'Observation Coordinator',
        },
      }),
      prisma.user.create({
        data: {
          email: `observation-specialist-${suffix}@example.test`,
          displayName: 'Observation Specialist',
        },
      }),
      prisma.user.create({
        data: {
          email: `observation-teacher-${suffix}@example.test`,
          displayName: 'Observation Teacher',
        },
      }),
    ]);
    coordinatorId = coordinator.id;
    specialistId = specialist.id;
    teacherId = teacher.id;

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
    ]);
    specialistMembershipId = specialistMembership.id;
    const student = await prisma.student.create({
      data: {
        organizationId,
        studentNumber: `OBS-${suffix}`,
        fullName: 'Observed Student',
        dateOfBirth: new Date('2018-01-01T00:00:00.000Z'),
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
    [coordinatorCookie, specialistCookie, teacherCookie] = await Promise.all([
      authenticatedCookie(coordinatorId),
      authenticatedCookie(specialistId),
      authenticatedCookie(teacherId),
    ]);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('allows only coordinators to mutate and retains an exact completed definition version', async () => {
    const definitionsPath = `/api/v1/organizations/${organizationId}/observation-definitions`;
    const denied = await mutate('post', definitionsPath, teacherCookie, {
      definitionKey: 'fedc-api-test',
      type: 'FEDC',
      title: 'FEDC v1',
      body: { items: [{ id: 'v1-item' }] },
    });
    expect(denied.status).toBe(403);

    const createdDefinition = await mutate(
      'post',
      definitionsPath,
      coordinatorCookie,
      {
        definitionKey: 'fedc-api-test',
        type: 'FEDC',
        title: 'FEDC v1',
        body: { items: [{ id: 'v1-item' }] },
      },
    );
    expect(createdDefinition.status).toBe(201);
    const definitionV1Id = createdDefinition.body.data.id as string;
    expect(createdDefinition.body.data.version).toBe(1);

    const assignmentsPath = `/api/v1/organizations/${organizationId}/observation-assignments`;
    const createdAssignment = await mutate(
      'post',
      assignmentsPath,
      coordinatorCookie,
      {
        definitionId: definitionV1Id,
        assignedToMembershipId: specialistMembershipId,
        studentId,
        academicYear,
        dueDate: '2026-09-01',
        priority: 'HIGH',
      },
    );
    expect(createdAssignment.status).toBe(201);
    const assignmentId = createdAssignment.body.data.id as string;
    expect(createdAssignment.body.data.assignedBy.id).toBe(coordinatorId);

    const specialistList = await request(app)
      .get(assignmentsPath)
      .set('cookie', specialistCookie);
    expect(specialistList.status).toBe(200);
    expect(
      specialistList.body.data.map((item: { id: string }) => item.id),
    ).toContain(assignmentId);

    const specialistStudents = await request(app)
      .get(
        `/api/v1/organizations/${organizationId}/students?schoolDate=2026-08-26`,
      )
      .set('cookie', specialistCookie);
    expect(specialistStudents.status).toBe(200);
    expect(
      specialistStudents.body.data.map((item: { id: string }) => item.id),
    ).toContain(studentId);

    await prisma.fEDCObservation.create({
      data: {
        organizationId,
        assignmentId,
        studentId,
        definitionId: definitionV1Id,
        observerId: specialistId,
        observationDate: new Date('2026-08-26T00:00:00.000Z'),
        status: 'COMPLETED',
        responses: {},
        milestoneScores: {},
        totalScore: 0,
        maxPossibleScore: 1,
        completedAt: new Date('2026-08-26T00:00:00.000Z'),
      },
    });
    await prisma.observationAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date('2026-08-26T00:00:00.000Z'),
      },
    });

    const studentsAfterCompletion = await request(app)
      .get(
        `/api/v1/organizations/${organizationId}/students?schoolDate=2026-08-26`,
      )
      .set('cookie', specialistCookie);
    expect(studentsAfterCompletion.status).toBe(403);

    const published = await mutate(
      'post',
      `${definitionsPath}/${definitionV1Id}/versions`,
      coordinatorCookie,
      {
        title: 'FEDC v2',
        body: { items: [{ id: 'v2-item' }] },
      },
    );
    expect(published.status).toBe(201);
    expect(published.body.data.version).toBe(2);
    expect(published.body.data.id).not.toBe(definitionV1Id);

    const staleBase = await mutate(
      'post',
      `${definitionsPath}/${definitionV1Id}/versions`,
      coordinatorCookie,
      {
        title: 'FEDC invalid v3 from v1',
        body: { items: [{ id: 'stale-base-item' }] },
      },
    );
    expect(staleBase.status).toBe(409);
    expect(staleBase.body.error.code).toBe(
      'OBSERVATION_DEFINITION_BASE_VERSION_CONFLICT',
    );

    const completedAssignment = await request(app)
      .get(assignmentsPath)
      .set('cookie', specialistCookie);
    const retained = completedAssignment.body.data.find(
      (item: { id: string }) => item.id === assignmentId,
    );
    expect(retained.status).toBe('COMPLETED');
    expect(retained.definition).toMatchObject({
      id: definitionV1Id,
      version: 1,
      title: 'FEDC v1',
    });
    const completedRecord = await prisma.fEDCObservation.findUniqueOrThrow({
      where: { assignmentId },
      select: { definitionId: true },
    });
    expect(completedRecord.definitionId).toBe(definitionV1Id);

    const forbiddenUpdate = await mutate(
      'patch',
      `${assignmentsPath}/${assignmentId}`,
      coordinatorCookie,
      { notes: 'Must not change.' },
    );
    expect(forbiddenUpdate.status).toBe(409);
    const forbiddenCancel = await mutate(
      'post',
      `${assignmentsPath}/${assignmentId}/cancel`,
      coordinatorCookie,
      { reason: 'Must not cancel.' },
    );
    expect(forbiddenCancel.status).toBe(409);
  });

  it('supports cancelling and hard-deleting eligible pending assignments', async () => {
    const definitionsPath = `/api/v1/organizations/${organizationId}/observation-definitions`;
    const assignmentsPath = `/api/v1/organizations/${organizationId}/observation-assignments`;
    const definitions = await request(app)
      .get(definitionsPath)
      .set('cookie', coordinatorCookie);
    const definitionId = definitions.body.data[0].id as string;
    const command = {
      definitionId,
      assignedToMembershipId: specialistMembershipId,
      studentId,
      academicYear,
      dueDate: '2026-10-01',
    };

    const cancellable = await mutate(
      'post',
      assignmentsPath,
      coordinatorCookie,
      command,
    );
    const cancelled = await mutate(
      'post',
      `${assignmentsPath}/${cancellable.body.data.id}/cancel`,
      coordinatorCookie,
      { reason: 'Assessment plan changed.' },
    );
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data).toMatchObject({
      status: 'CANCELLED',
      cancellationReason: 'Assessment plan changed.',
      cancelledBy: { id: coordinatorId },
    });
    expect(cancelled.body.data.cancelledAt).toEqual(expect.any(String));

    const deletable = await mutate('post', assignmentsPath, coordinatorCookie, {
      ...command,
      dueDate: '2026-10-02',
    });
    const deleted = await mutate(
      'delete',
      `${assignmentsPath}/${deletable.body.data.id}`,
      coordinatorCookie,
    );
    expect(deleted.status).toBe(204);
    expect(
      await prisma.observationAssignment.findUnique({
        where: { id: deletable.body.data.id },
      }),
    ).toBeNull();

    const audits = await prisma.auditEvent.findMany({
      where: {
        organizationId,
        action: {
          in: [
            'observation_assignment.cancel',
            'observation_assignment.delete',
          ],
        },
      },
      select: { actorId: true, result: true },
    });
    expect(audits).toEqual(
      expect.arrayContaining([
        { actorId: coordinatorId, result: 'SUCCEEDED' },
        { actorId: coordinatorId, result: 'SUCCEEDED' },
      ]),
    );
  });
});
