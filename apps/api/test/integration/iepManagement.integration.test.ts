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
const csrf = 'iep-management-csrf';
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
let academicYearId: string;
let semesterId: string;
let assignedStudentId: string;
let unassignedStudentId: string;
let coordinatorId: string;
let teacherId: string;
let coordinatorCookie: string;
let teacherCookie: string;

async function cookie(userId: string) {
  const sessions = new SessionService(
    prisma,
    config.sessionSecret,
    config.sessionTtlHours,
  );
  const session = await sessions.create(userId);
  return `learnspace_session=${session.token}`;
}

function command(studentId = assignedStudentId) {
  return {
    studentId,
    academicYearId,
    semesterId,
    consideration: 'The student requires an individualized education plan.',
    primaryClassification: 'Learning support',
    currentPlacement: 'Inclusive classroom',
    homePartnershipSupport: null,
    homePartnershipRecommendations: null,
    progressMeasurementMethods: ['Weekly work samples'],
    parentCommunicationMethods: ['Monthly conference'],
    parentApproved: true,
    parentName: 'Parent One',
    parentApprovalDate: '2026-08-15',
    startsOn: '2026-08-01',
    endsOn: '2026-12-31',
    teamMembers: [
      {
        role: 'Parent',
        name: 'Parent One',
        initials: 'PO',
        confirmed: true,
        position: 0,
      },
    ],
    performanceAreas: [
      {
        name: 'Literacy',
        category: 'Academic',
        strengths: 'Engages with stories.',
        needs: 'Needs decoding support.',
        impactOfNeed: null,
        informationSource: null,
        assessmentProcess: null,
        assessmentDate: '2026-08-10',
        summaryOfResults: null,
        position: 0,
      },
    ],
    accommodations: [
      {
        category: 'ACADEMIC',
        subject: 'English',
        code: 'A-1',
        description: 'Extended time.',
        position: 0,
      },
    ],
    goals: [
      {
        code: 'G-1',
        performanceArea: 'Literacy',
        longTermGoal: null,
        shortTermGoal: null,
        measurableGoal: 'Read a passage with 90% accuracy.',
        strategyActivity: null,
        learningExpectation: null,
        learningStrategy: null,
        evaluationMethod: 'Curriculum-based measurement',
        schedule: 'Weekly',
        targetDate: '2026-12-15',
        position: 0,
      },
    ],
    services: [
      {
        serviceName: 'Specialized literacy instruction',
        type: 'INDIVIDUAL',
        duration: '30 minutes',
        frequency: 'Three times weekly',
        location: 'Learning support room',
        days: 'Monday, Wednesday, Friday',
        position: 0,
      },
    ],
  };
}

function postIep(body: unknown, sessionCookie: string) {
  return request(app)
    .post(`/api/v1/organizations/${organizationId}/ieps`)
    .set('cookie', `${sessionCookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body);
}

function putIep(iepId: string, body: unknown, sessionCookie: string) {
  return request(app)
    .put(`/api/v1/organizations/${organizationId}/ieps/${iepId}`)
    .set('cookie', `${sessionCookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body);
}

integration('IEP aggregate management', () => {
  beforeAll(async () => {
    execFileSync(
      'npx',
      ['prisma', 'migrate', 'deploy', '--schema', '../../prisma/schema.prisma'],
      { cwd: process.cwd(), env: process.env, stdio: 'inherit' },
    );
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const suffix = randomUUID();
    const organization = await prisma.organization.create({
      data: { slug: `iep-management-${suffix}`, name: 'IEP School' },
    });
    organizationId = organization.id;
    const [coordinator, teacher] = await Promise.all([
      prisma.user.create({
        data: {
          email: `iep-coordinator-${suffix}@example.test`,
          displayName: 'IEP Coordinator',
        },
      }),
      prisma.user.create({
        data: {
          email: `iep-teacher-${suffix}@example.test`,
          displayName: 'IEP Teacher',
        },
      }),
    ]);
    coordinatorId = coordinator.id;
    teacherId = teacher.id;
    const [coordinatorMembership, teacherMembership] = await Promise.all([
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
          userId: teacherId,
          role: 'SPECIAL_ED_TEACHER',
        },
      }),
    ]);
    const year = await prisma.academicYear.create({
      data: {
        organizationId,
        name: `2026-${suffix}`,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
        endsOn: new Date('2027-06-30T00:00:00.000Z'),
      },
    });
    academicYearId = year.id;
    const semester = await prisma.semester.create({
      data: {
        organizationId,
        academicYearId,
        name: 'Semester 1',
        position: 1,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
        endsOn: new Date('2026-12-31T00:00:00.000Z'),
      },
    });
    semesterId = semester.id;
    const [assignedStudent, unassignedStudent] = await Promise.all([
      prisma.student.create({
        data: {
          organizationId,
          studentNumber: `A-${suffix}`,
          fullName: 'Assigned Student',
          dateOfBirth: new Date('2018-01-01T00:00:00.000Z'),
          specialNeedsFlag: true,
        },
      }),
      prisma.student.create({
        data: {
          organizationId,
          studentNumber: `U-${suffix}`,
          fullName: 'Unassigned Student',
          dateOfBirth: new Date('2018-02-01T00:00:00.000Z'),
          specialNeedsFlag: true,
        },
      }),
    ]);
    assignedStudentId = assignedStudent.id;
    unassignedStudentId = unassignedStudent.id;
    await prisma.staffStudentAssignment.create({
      data: {
        organizationId,
        membershipId: teacherMembership.id,
        studentId: assignedStudentId,
        roleContext: 'GPK',
        startsOn: new Date('2026-08-01T00:00:00.000Z'),
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
    [coordinatorCookie, teacherCookie] = await Promise.all([
      cookie(coordinatorId),
      cookie(teacherId),
    ]);
    expect(coordinatorMembership.id).toBeTruthy();
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('transactionally creates and replaces a full draft with session actors and audits', async () => {
    const created = await postIep(command(), teacherCookie);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      student: { id: assignedStudentId },
      state: 'DRAFT',
      version: 1,
      createdBy: { id: teacherId },
      updatedBy: { id: teacherId },
      goals: [{ code: 'G-1' }],
    });
    expect(created.body.data.goals[0]).not.toHaveProperty('active');
    const iepId = created.body.data.id as string;
    expect(
      await prisma.auditEvent.count({
        where: { targetType: 'IEP', targetId: iepId, action: 'iep.create' },
      }),
    ).toBe(1);

    const updatedCommand = command();
    updatedCommand.consideration = 'Updated consideration.';
    updatedCommand.goals[0].measurableGoal =
      'Read a passage with 95% accuracy.';
    const updated = await putIep(
      iepId,
      { expectedVersion: 1, ...updatedCommand },
      teacherCookie,
    );
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      version: 2,
      consideration: 'Updated consideration.',
      goals: [{ measurableGoal: 'Read a passage with 95% accuracy.' }],
    });
    expect(
      await prisma.auditEvent.count({
        where: { targetType: 'IEP', targetId: iepId, action: 'iep.update' },
      }),
    ).toBe(1);
  });

  it('filters teacher reads and writes to active permanent student assignments', async () => {
    const unassigned = await postIep(
      command(unassignedStudentId),
      coordinatorCookie,
    );
    expect(unassigned.status).toBe(201);
    const deniedCreate = await postIep(
      command(unassignedStudentId),
      teacherCookie,
    );
    expect(deniedCreate.status).toBe(403);
    expect(deniedCreate.body.error.code).toBe('AUTHORIZATION_DENIED');

    const list = await request(app)
      .get(`/api/v1/organizations/${organizationId}/ieps`)
      .set('cookie', teacherCookie);
    expect(list.status).toBe(200);
    expect(
      list.body.data.every(
        (iep: { student: { id: string } }) =>
          iep.student.id === assignedStudentId,
      ),
    ).toBe(true);
    const deniedDetail = await request(app)
      .get(
        `/api/v1/organizations/${organizationId}/ieps/${unassigned.body.data.id}`,
      )
      .set('cookie', teacherCookie);
    expect(deniedDetail.status).toBe(403);
    expect(deniedDetail.body.error.code).toBe('AUTHORIZATION_DENIED');
  });

  it('rejects non-draft API updates and PostgreSQL root/child mutation', async () => {
    const created = await postIep(command(), coordinatorCookie);
    expect(created.status).toBe(201);
    const iepId = created.body.data.id as string;
    await prisma.iEP.update({
      where: { id: iepId },
      data: { state: 'APPROVED' },
    });

    const apiUpdate = await putIep(
      iepId,
      { expectedVersion: 1, ...command() },
      coordinatorCookie,
    );
    expect(apiUpdate.status).toBe(403);
    expect(apiUpdate.body.error.code).toBe('AUTHORIZATION_DENIED');

    await expect(
      prisma.iEP.update({
        where: { id: iepId },
        data: { consideration: 'Forbidden historical mutation.' },
      }),
    ).rejects.toThrow(/historical IEP content is immutable/);
    await expect(
      prisma.iEPGoal.deleteMany({ where: { iepId } }),
    ).rejects.toThrow(/historical IEP child content is immutable/);
  });
});
