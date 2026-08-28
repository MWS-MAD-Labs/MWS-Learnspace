import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import type { MembershipScope } from '../../src/authorization.js';
import type { AppConfig } from '../../src/config.js';
import { transitionIep } from '../../src/iepRoutes.js';
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
let directorId: string;
let coordinatorCookie: string;
let teacherCookie: string;
let directorCookie: string;

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

function postIep(body: object, sessionCookie: string) {
  return request(app)
    .post(`/api/v1/organizations/${organizationId}/ieps`)
    .set('cookie', `${sessionCookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body);
}

function putIep(iepId: string, body: object, sessionCookie: string) {
  return request(app)
    .put(`/api/v1/organizations/${organizationId}/ieps/${iepId}`)
    .set('cookie', `${sessionCookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body);
}

function workflow(
  iepId: string,
  commandName: string,
  body: object,
  sessionCookie: string,
  targetOrganizationId = organizationId,
) {
  return request(app)
    .post(
      `/api/v1/organizations/${targetOrganizationId}/ieps/${iepId}/${commandName}`,
    )
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
    const [coordinator, teacher, director] = await Promise.all([
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
      prisma.user.create({
        data: {
          email: `iep-director-${suffix}@example.test`,
          displayName: 'IEP Director',
        },
      }),
    ]);
    coordinatorId = coordinator.id;
    teacherId = teacher.id;
    directorId = director.id;
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
      prisma.membership.create({
        data: {
          organizationId,
          userId: directorId,
          role: 'DIRECTOR',
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
    [coordinatorCookie, teacherCookie, directorCookie] = await Promise.all([
      cookie(coordinatorId),
      cookie(teacherId),
      cookie(directorId),
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
    expect(
      list.body.data.every((iep: { goals: Array<Record<string, unknown>> }) =>
        iep.goals.every(
          (goal) =>
            !('addressedHistory' in goal) && !('achievementEvents' in goal),
        ),
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

  it('persists submission, return, re-review, approval, activation, and archival with session actors', async () => {
    const created = await postIep(command(), teacherCookie);
    const iepId = created.body.data.id as string;

    const submitted = await workflow(
      iepId,
      'submit',
      { expectedVersion: 1 },
      teacherCookie,
    );
    expect(submitted.status).toBe(200);
    expect(submitted.body.data).toMatchObject({
      state: 'COORDINATOR_REVIEW',
      version: 2,
      workflowEvents: [
        expect.objectContaining({
          action: 'SUBMITTED',
          actor: expect.objectContaining({ id: teacherId }),
        }),
      ],
    });

    const returned = await workflow(
      iepId,
      'coordinator-review',
      {
        expectedVersion: 2,
        decision: 'RETURN',
        comment: 'Add a clearer service frequency.',
      },
      coordinatorCookie,
    );
    expect(returned.body.data).toMatchObject({ state: 'DRAFT', version: 3 });

    const resubmitted = await workflow(
      iepId,
      'submit',
      { expectedVersion: 3 },
      teacherCookie,
    );
    expect(resubmitted.body.data).toMatchObject({
      state: 'COORDINATOR_REVIEW',
      version: 4,
    });

    const coordinatorApproved = await workflow(
      iepId,
      'coordinator-review',
      { expectedVersion: 4, decision: 'APPROVE' },
      coordinatorCookie,
    );
    expect(coordinatorApproved.body.data).toMatchObject({
      state: 'DIRECTOR_APPROVAL',
      version: 5,
    });

    const directorReturned = await workflow(
      iepId,
      'director-review',
      {
        expectedVersion: 5,
        decision: 'RETURN',
        comment: 'Confirm the parent approval date.',
      },
      directorCookie,
    );
    expect(directorReturned.body.data).toMatchObject({
      state: 'COORDINATOR_REVIEW',
      version: 6,
    });

    const coordinatorReapproved = await workflow(
      iepId,
      'coordinator-review',
      { expectedVersion: 6, decision: 'APPROVE' },
      coordinatorCookie,
    );
    expect(coordinatorReapproved.body.data.version).toBe(7);

    const directorApproved = await workflow(
      iepId,
      'director-review',
      { expectedVersion: 7, decision: 'APPROVE' },
      directorCookie,
    );
    expect(directorApproved.body.data).toMatchObject({
      state: 'APPROVED',
      version: 8,
    });

    const activated = await workflow(
      iepId,
      'activate',
      { expectedVersion: 8 },
      directorCookie,
    );
    expect(activated.body.data).toMatchObject({ state: 'ACTIVE', version: 9 });

    const archived = await workflow(
      iepId,
      'archive',
      { expectedVersion: 9 },
      directorCookie,
    );
    expect(archived.body.data).toMatchObject({
      state: 'ARCHIVED',
      version: 10,
    });

    const events = await prisma.workflowEvent.findMany({
      where: { aggregateType: 'IEP', aggregateId: iepId },
      orderBy: { occurredAt: 'asc' },
    });
    expect(events).toHaveLength(9);
    expect(events.map((event) => event.actorId)).toEqual([
      teacherId,
      coordinatorId,
      teacherId,
      coordinatorId,
      directorId,
      coordinatorId,
      directorId,
      directorId,
      directorId,
    ]);
    expect(
      await prisma.auditEvent.count({
        where: { targetType: 'IEP', targetId: iepId },
      }),
    ).toBe(10);
  });

  it('rejects spoofing, wrong roles, cross-tenant paths, and unassigned-student workflow commands', async () => {
    const assigned = await postIep(command(), teacherCookie);
    const assignedIepId = assigned.body.data.id as string;
    const spoofed = await workflow(
      assignedIepId,
      'submit',
      {
        expectedVersion: 1,
        actorId: directorId,
        organizationId,
        fromState: 'APPROVED',
        toState: 'ACTIVE',
      },
      teacherCookie,
    );
    expect(spoofed.status).toBe(400);
    expect(spoofed.body.error.code).toBe('VALIDATION_ERROR');

    const wrongRole = await workflow(
      assignedIepId,
      'coordinator-review',
      { expectedVersion: 1, decision: 'APPROVE' },
      teacherCookie,
    );
    expect(wrongRole.status).toBe(403);

    const otherOrganization = await prisma.organization.create({
      data: { slug: `iep-other-${randomUUID()}`, name: 'Other IEP School' },
    });
    const crossTenant = await workflow(
      assignedIepId,
      'submit',
      { expectedVersion: 1 },
      teacherCookie,
      otherOrganization.id,
    );
    expect(crossTenant.status).toBe(403);

    const unassigned = await postIep(
      command(unassignedStudentId),
      coordinatorCookie,
    );
    const denied = await workflow(
      unassigned.body.data.id,
      'submit',
      { expectedVersion: 1 },
      teacherCookie,
    );
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('AUTHORIZATION_DENIED');
  });

  it('rejects stale and simultaneous submissions with one event and one winner', async () => {
    const created = await postIep(command(), teacherCookie);
    const iepId = created.body.data.id as string;
    const [first, second] = await Promise.all([
      workflow(iepId, 'submit', { expectedVersion: 1 }, teacherCookie),
      workflow(iepId, 'submit', { expectedVersion: 1 }, teacherCookie),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);

    const stale = await workflow(
      iepId,
      'submit',
      { expectedVersion: 1 },
      teacherCookie,
    );
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('IEP_VERSION_CONFLICT');
    expect(
      await prisma.workflowEvent.count({
        where: { aggregateType: 'IEP', aggregateId: iepId },
      }),
    ).toBe(1);
  });

  it('rolls back state, workflow event, and audit together and keeps events append-only', async () => {
    const created = await postIep(command(), teacherCookie);
    const iepId = created.body.data.id as string;
    const membership: MembershipScope = {
      organizationId,
      role: 'SPECIAL_ED_TEACHER',
      unitIds: [],
      gradeIds: [],
      subjectIds: [],
      assignedStudentIds: [assignedStudentId],
      assignedStudentScopes: [
        {
          organizationId,
          studentId: assignedStudentId,
          startsOn: new Date('2026-08-01T00:00:00.000Z'),
          endsOn: null,
        },
      ],
    };

    await expect(
      prisma.$transaction(async (transaction) => {
        await transitionIep({
          transaction,
          organizationId,
          iepId,
          expectedVersion: 1,
          actorId: teacherId,
          membership,
          onDate: new Date('2026-08-28T00:00:00.000Z'),
          requestId: 'rollback-request',
          transition: {
            fromState: 'DRAFT',
            toState: 'COORDINATOR_REVIEW',
            action: 'SUBMITTED',
            auditAction: 'iep.submit',
          },
        });
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    expect(await prisma.iEP.findUnique({ where: { id: iepId } })).toMatchObject(
      {
        state: 'DRAFT',
        version: 1,
      },
    );
    expect(
      await prisma.workflowEvent.count({
        where: { aggregateType: 'IEP', aggregateId: iepId },
      }),
    ).toBe(0);
    expect(
      await prisma.auditEvent.count({
        where: { targetType: 'IEP', targetId: iepId, action: 'iep.submit' },
      }),
    ).toBe(0);

    const submitted = await workflow(
      iepId,
      'submit',
      { expectedVersion: 1 },
      teacherCookie,
    );
    const eventId = submitted.body.data.workflowEvents[0].id as string;
    await expect(
      prisma.workflowEvent.update({
        where: { id: eventId },
        data: { comment: 'rewritten' },
      }),
    ).rejects.toThrow(/WorkflowEvent is append-only/);
    await expect(
      prisma.workflowEvent.delete({ where: { id: eventId } }),
    ).rejects.toThrow(/WorkflowEvent is append-only/);
  });

  it('archives the prior active plan transactionally and prevents overlapping active plans', async () => {
    const prior = await postIep(command(), coordinatorCookie);
    const replacement = await postIep(command(), coordinatorCookie);
    const priorId = prior.body.data.id as string;
    const replacementId = replacement.body.data.id as string;
    await prisma.iEP.update({
      where: { id: priorId },
      data: { state: 'ACTIVE' },
    });
    await prisma.workflowEvent.create({
      data: {
        organizationId,
        aggregateType: 'IEP',
        aggregateId: priorId,
        fromState: 'APPROVED',
        toState: 'ACTIVE',
        action: 'ACTIVATED',
        actorId: directorId,
        comment: 'Original activation history.',
      },
    });
    await prisma.iEP.update({
      where: { id: replacementId },
      data: { state: 'APPROVED' },
    });

    const activated = await workflow(
      replacementId,
      'activate',
      { expectedVersion: 1 },
      directorCookie,
    );
    expect(activated.status).toBe(200);
    expect(activated.body.data.state).toBe('ACTIVE');
    expect(
      await prisma.iEP.findUnique({ where: { id: priorId } }),
    ).toMatchObject({
      state: 'ARCHIVED',
      version: 2,
    });
    const priorEvents = await prisma.workflowEvent.findMany({
      where: { aggregateType: 'IEP', aggregateId: priorId },
      orderBy: { occurredAt: 'asc' },
    });
    expect(priorEvents).toHaveLength(2);
    expect(priorEvents[0].comment).toBe('Original activation history.');
    expect(priorEvents[1]).toMatchObject({
      fromState: 'ACTIVE',
      toState: 'ARCHIVED',
      action: 'ARCHIVED',
      actorId: directorId,
    });

    const another = await postIep(command(), coordinatorCookie);
    await expect(
      prisma.iEP.update({
        where: { id: another.body.data.id },
        data: { state: 'ACTIVE' },
      }),
    ).rejects.toThrow();
    expect(
      await prisma.iEP.count({
        where: {
          organizationId,
          studentId: assignedStudentId,
          state: 'ACTIVE',
        },
      }),
    ).toBe(1);
  });
});
