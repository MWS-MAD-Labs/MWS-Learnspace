import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import type { AppConfig } from '../../src/config.js';
import { projectIepGoals } from '../../src/iepGoalProjection.js';
import { schoolDateInTimezone } from '../../src/organizationTime.js';
import { SessionService } from '../../src/sessionService.js';

const databaseUrl = process.env.DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const csrf = 'weekly-report-csrf';
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
let studentId: string;
let unassignedStudentId: string;
let iepId: string;
let otherIepId: string;
let goalId: string;
let otherGoalId: string;
let teacherId: string;
let coordinatorId: string;
let directorId: string;
let teacherCookie: string;
let coordinatorCookie: string;
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

function command(overrides: Record<string, unknown> = {}) {
  return {
    studentId,
    iepId,
    year: 2026,
    weekNumber: 35,
    weekStart: '2026-08-24',
    weekEnd: '2026-08-28',
    descriptiveObservation:
      'The student sustained attention during structured literacy activities.',
    homeConnection: 'Please review the reading routine at home this weekend.',
    goalProgress: [
      {
        goalId,
        addressedThisWeek: true,
        rating: 4,
        notes: 'Read the target passage with increasing independence.',
        markedAchievedThisWeek: false,
      },
    ],
    ...overrides,
  };
}

function postReport(
  body: object,
  sessionCookie: string,
  orgId = organizationId,
) {
  return request(app)
    .post(`/api/v1/organizations/${orgId}/weekly-reports`)
    .set('cookie', `${sessionCookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body);
}

function putReport(reportId: string, body: object, sessionCookie: string) {
  return request(app)
    .put(`/api/v1/organizations/${organizationId}/weekly-reports/${reportId}`)
    .set('cookie', `${sessionCookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body);
}

function workflow(
  reportId: string,
  action: 'submit' | 'coordinator-decision' | 'director-decision',
  body: object,
  sessionCookie: string,
  orgId = organizationId,
) {
  return request(app)
    .post(`/api/v1/organizations/${orgId}/weekly-reports/${reportId}/${action}`)
    .set('cookie', `${sessionCookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body);
}

integration('Weekly report management', () => {
  beforeAll(async () => {
    execFileSync(
      'npx',
      ['prisma', 'migrate', 'deploy', '--schema', '../../prisma/schema.prisma'],
      { cwd: process.cwd(), env: process.env, stdio: 'inherit' },
    );
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const suffix = randomUUID();
    const organization = await prisma.organization.create({
      data: { slug: `weekly-report-${suffix}`, name: 'Weekly Report School' },
    });
    organizationId = organization.id;
    const [teacher, coordinator, director] = await Promise.all([
      prisma.user.create({
        data: {
          email: `weekly-teacher-${suffix}@example.test`,
          displayName: 'Teacher',
        },
      }),
      prisma.user.create({
        data: {
          email: `weekly-coordinator-${suffix}@example.test`,
          displayName: 'Coordinator',
        },
      }),
      prisma.user.create({
        data: {
          email: `weekly-director-${suffix}@example.test`,
          displayName: 'Director',
        },
      }),
    ]);
    teacherId = teacher.id;
    coordinatorId = coordinator.id;
    directorId = director.id;
    const teacherMembership = await prisma.membership.create({
      data: { organizationId, userId: teacherId, role: 'SPECIAL_ED_TEACHER' },
    });
    await Promise.all([
      prisma.membership.create({
        data: {
          organizationId,
          userId: coordinatorId,
          role: 'SPECIAL_ED_COORDINATOR',
        },
      }),
      prisma.membership.create({
        data: { organizationId, userId: directorId, role: 'DIRECTOR' },
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
    const semester = await prisma.semester.create({
      data: {
        organizationId,
        academicYearId: year.id,
        name: 'Semester 1',
        position: 1,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
        endsOn: new Date('2026-12-31T00:00:00.000Z'),
      },
    });
    const [student, unassignedStudent] = await Promise.all([
      prisma.student.create({
        data: {
          organizationId,
          studentNumber: `WR-${suffix}`,
          fullName: 'Assigned Student',
          dateOfBirth: new Date('2018-01-01T00:00:00.000Z'),
          specialNeedsFlag: true,
        },
      }),
      prisma.student.create({
        data: {
          organizationId,
          studentNumber: `WU-${suffix}`,
          fullName: 'Unassigned Student',
          dateOfBirth: new Date('2018-02-01T00:00:00.000Z'),
          specialNeedsFlag: true,
        },
      }),
    ]);
    studentId = student.id;
    unassignedStudentId = unassignedStudent.id;
    await prisma.staffStudentAssignment.create({
      data: {
        organizationId,
        membershipId: teacherMembership.id,
        studentId,
        roleContext: 'GPK',
        startsOn: new Date('2026-08-01T00:00:00.000Z'),
      },
    });
    const iepData = {
      organizationId,
      studentId,
      academicYearId: year.id,
      semesterId: semester.id,
      consideration: 'Requires individualized literacy support.',
      primaryClassification: 'Learning support',
      currentPlacement: 'Inclusive classroom',
      progressMeasurementMethods: ['Weekly work samples'],
      parentCommunicationMethods: ['Conference'],
      startsOn: new Date('2026-08-01T00:00:00.000Z'),
      endsOn: new Date('2026-12-31T00:00:00.000Z'),
      createdById: teacherId,
      updatedById: teacherId,
    };
    const [iep, otherIep] = await Promise.all([
      prisma.iEP.create({
        data: {
          ...iepData,
          goals: {
            create: {
              code: 'READ',
              performanceArea: 'Literacy',
              measurableGoal: 'Read a passage with 90 percent accuracy.',
              evaluationMethod: 'Work samples',
              schedule: 'Weekly',
            },
          },
        },
        include: { goals: true },
      }),
      prisma.iEP.create({
        data: {
          ...iepData,
          goals: {
            create: {
              code: 'WRITE',
              performanceArea: 'Writing',
              measurableGoal: 'Write a complete paragraph independently.',
              evaluationMethod: 'Writing samples',
              schedule: 'Weekly',
            },
          },
        },
        include: { goals: true },
      }),
    ]);
    iepId = iep.id;
    otherIepId = otherIep.id;
    goalId = iep.goals[0]!.id;
    otherGoalId = otherIep.goals[0]!.id;
    app = createApp({
      config,
      database: {
        client: prisma,
        check: async () => undefined,
        close: async () => undefined,
      },
      logger,
      auth: {
        sessions: new SessionService(
          prisma,
          config.sessionSecret,
          config.sessionTtlHours,
        ),
        oauth: {} as never,
      },
    });
    [teacherCookie, coordinatorCookie, directorCookie] = await Promise.all([
      cookie(teacherId),
      cookie(coordinatorId),
      cookie(directorId),
    ]);
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('rejects nonexistent ISO week 53 list queries', async () => {
    const response = await request(app)
      .get(
        `/api/v1/organizations/${organizationId}/weekly-reports?year=2021&weekNumber=53`,
      )
      .set('cookie', teacherCookie);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates a report with the session teacher and rejects spoofed actor fields', async () => {
    const spoofed = await postReport(
      command({ teacherId: directorId }),
      teacherCookie,
    );
    expect(spoofed.status).toBe(400);
    expect(spoofed.body.error.code).toBe('VALIDATION_ERROR');

    const created = await postReport(command(), teacherCookie);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      teacher: { id: teacherId },
      state: 'DRAFT',
      version: 1,
      goalProgress: [{ goalId }],
    });
  });

  it('uses the organization school date for assignment authorization across report operations', async () => {
    const now = new Date();
    const utcDate = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
    const candidateTimezones = ['Pacific/Kiritimati', 'Pacific/Pago_Pago'];
    const timezone = candidateTimezones.find(
      (candidate) =>
        schoolDateInTimezone(candidate, now).getTime() !== utcDate.getTime(),
    );
    if (!timezone) throw new Error('Expected a timezone with a non-UTC date.');
    const schoolDate = schoolDateInTimezone(timezone, now);
    const assignment = await prisma.staffStudentAssignment.findFirstOrThrow({
      where: { organizationId, studentId },
      select: { id: true, startsOn: true, endsOn: true },
    });
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { timezone: true },
    });

    await prisma.$transaction([
      prisma.organization.update({
        where: { id: organizationId },
        data: { timezone },
      }),
      prisma.staffStudentAssignment.update({
        where: { id: assignment.id },
        data: { startsOn: schoolDate, endsOn: schoolDate },
      }),
    ]);

    try {
      const created = await postReport(
        command({
          year: 2026,
          weekNumber: 34,
          weekStart: '2026-08-17',
          weekEnd: '2026-08-21',
        }),
        teacherCookie,
      );
      expect(created.status).toBe(201);
      const reportId = created.body.data.id as string;

      const list = await request(app)
        .get(
          `/api/v1/organizations/${organizationId}/weekly-reports?studentId=${studentId}`,
        )
        .set('cookie', teacherCookie);
      expect(list.status).toBe(200);
      expect(
        list.body.data.map((report: { id: string }) => report.id),
      ).toContain(reportId);

      const detail = await request(app)
        .get(
          `/api/v1/organizations/${organizationId}/weekly-reports/${reportId}`,
        )
        .set('cookie', teacherCookie);
      expect(detail.status).toBe(200);

      const updated = await putReport(
        reportId,
        {
          expectedVersion: 1,
          ...command({
            year: 2026,
            weekNumber: 34,
            weekStart: '2026-08-17',
            weekEnd: '2026-08-21',
            descriptiveObservation:
              'The organization-local school date authorizes this update.',
          }),
        },
        teacherCookie,
      );
      expect(updated.status).toBe(200);

      const submitted = await workflow(
        reportId,
        'submit',
        { expectedVersion: 2 },
        teacherCookie,
      );
      expect(submitted.status).toBe(200);
    } finally {
      await prisma.$transaction([
        prisma.organization.update({
          where: { id: organizationId },
          data: { timezone: organization.timezone },
        }),
        prisma.staffStudentAssignment.update({
          where: { id: assignment.id },
          data: {
            startsOn: assignment.startsOn,
            endsOn: assignment.endsOn,
          },
        }),
      ]);
    }
  });

  it('rejects goals from a different IEP and duplicate student weeks', async () => {
    const mismatch = await postReport(
      command({
        weekNumber: 36,
        weekStart: '2026-08-31',
        weekEnd: '2026-09-04',
        goalProgress: [{ ...command().goalProgress[0], goalId: otherGoalId }],
      }),
      teacherCookie,
    );
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error.code).toBe('WEEKLY_REPORT_GOAL_IEP_MISMATCH');
    expect(otherIepId).toBeTruthy();

    const duplicate = await postReport(command(), teacherCookie);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('WEEKLY_REPORT_DUPLICATE_WEEK');
  });

  it('denies unassigned teachers, non-teacher creation, and cross-tenant requests', async () => {
    const unassigned = await postReport(
      command({
        studentId: unassignedStudentId,
        weekNumber: 37,
        weekStart: '2026-09-07',
        weekEnd: '2026-09-11',
      }),
      teacherCookie,
    );
    expect(unassigned.status).toBe(403);
    expect(unassigned.body.error.code).toBe('AUTHORIZATION_DENIED');

    const wrongRole = await postReport(
      command({
        weekNumber: 38,
        weekStart: '2026-09-14',
        weekEnd: '2026-09-18',
      }),
      coordinatorCookie,
    );
    expect(wrongRole.status).toBe(403);

    const otherOrganization = await prisma.organization.create({
      data: { slug: `weekly-other-${randomUUID()}`, name: 'Other School' },
    });
    const crossTenant = await postReport(
      command({
        weekNumber: 39,
        weekStart: '2026-09-21',
        weekEnd: '2026-09-25',
      }),
      teacherCookie,
      otherOrganization.id,
    );
    expect(crossTenant.status).toBe(403);
    expect(crossTenant.body.error.code).toBe('AUTHORIZATION_DENIED');
  });

  it('enforces optimistic draft updates and permits only one concurrent submission', async () => {
    const created = await postReport(
      command({
        weekNumber: 40,
        weekStart: '2026-09-28',
        weekEnd: '2026-10-02',
      }),
      teacherCookie,
    );
    const reportId = created.body.data.id as string;
    const updated = await putReport(
      reportId,
      {
        expectedVersion: 1,
        ...command({
          weekNumber: 40,
          weekStart: '2026-09-28',
          weekEnd: '2026-10-02',
          descriptiveObservation:
            'The student independently completed the literacy routine today.',
        }),
      },
      teacherCookie,
    );
    expect(updated.status).toBe(200);
    expect(updated.body.data.version).toBe(2);

    const stale = await putReport(
      reportId,
      {
        expectedVersion: 1,
        ...command({
          weekNumber: 40,
          weekStart: '2026-09-28',
          weekEnd: '2026-10-02',
        }),
      },
      teacherCookie,
    );
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('WEEKLY_REPORT_VERSION_CONFLICT');

    const [first, second] = await Promise.all([
      workflow(reportId, 'submit', { expectedVersion: 2 }, teacherCookie),
      workflow(reportId, 'submit', { expectedVersion: 2 }, teacherCookie),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    expect(
      await prisma.workflowEvent.count({
        where: { aggregateType: 'WEEKLY_REPORT', aggregateId: reportId },
      }),
    ).toBe(1);
  });

  it('rolls back manually grouped report state, workflow, and audit writes', async () => {
    const created = await postReport(
      command({
        weekNumber: 42,
        weekStart: '2026-10-12',
        weekEnd: '2026-10-16',
      }),
      teacherCookie,
    );
    const reportId = created.body.data.id as string;

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.weeklyReport.updateMany({
          where: { id: reportId, state: 'DRAFT' },
          data: { state: 'COORDINATOR_REVIEW' },
        });
        await tx.workflowEvent.create({
          data: {
            organizationId,
            aggregateType: 'WEEKLY_REPORT',
            aggregateId: reportId,
            fromState: 'DRAFT',
            toState: 'COORDINATOR_REVIEW',
            action: 'SUBMITTED',
            actorId: teacherId,
          },
        });
        await tx.auditEvent.create({
          data: {
            organizationId,
            actorId: teacherId,
            action: 'weekly-report.submit',
            targetType: 'WEEKLY_REPORT',
            targetId: reportId,
            requestId: 'forced-rollback',
            result: 'SUCCEEDED',
          },
        });
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    expect(
      await prisma.weeklyReport.findUnique({ where: { id: reportId } }),
    ).toMatchObject({
      state: 'DRAFT',
    });
    expect(
      await prisma.workflowEvent.count({
        where: { aggregateType: 'WEEKLY_REPORT', aggregateId: reportId },
      }),
    ).toBe(0);
    expect(
      await prisma.auditEvent.count({
        where: {
          targetType: 'WEEKLY_REPORT',
          targetId: reportId,
          action: 'weekly-report.submit',
        },
      }),
    ).toBe(0);
  });

  it('recalculates goal projections idempotently without duplicating achievement events', async () => {
    const created = await postReport(
      command({
        weekNumber: 43,
        weekStart: '2026-10-19',
        weekEnd: '2026-10-23',
        goalProgress: [
          {
            goalId,
            addressedThisWeek: true,
            rating: 5,
            notes: 'Mastery demonstrated independently.',
            markedAchievedThisWeek: true,
            achievedDate: '2026-10-23',
            achievedNote: 'Met the stated mastery criterion.',
          },
        ],
      }),
      teacherCookie,
    );
    expect(created.status).toBe(201);
    const reportId = created.body.data.id as string;
    const before = await prisma.iEPGoal.findUniqueOrThrow({
      where: { id: goalId },
      select: {
        achieved: true,
        achievedDate: true,
        achievedNote: true,
        achievedInReportId: true,
        achievedEventId: true,
        lastAddressedDate: true,
        lastAddressedWeek: true,
        lastAddressedRating: true,
        timesAddressed: true,
      },
    });

    await prisma.$transaction((tx) => projectIepGoals(tx, iepId, [goalId]));
    await prisma.$transaction((tx) => projectIepGoals(tx, iepId, [goalId]));

    expect(
      await prisma.iEPGoal.findUniqueOrThrow({
        where: { id: goalId },
        select: {
          achieved: true,
          achievedDate: true,
          achievedNote: true,
          achievedInReportId: true,
          achievedEventId: true,
          lastAddressedDate: true,
          lastAddressedWeek: true,
          lastAddressedRating: true,
          timesAddressed: true,
        },
      }),
    ).toEqual(before);
    expect(before).toMatchObject({
      achieved: true,
      achievedNote: 'Met the stated mastery criterion.',
      achievedInReportId: reportId,
      lastAddressedWeek: 43,
      lastAddressedRating: 5,
    });
    expect(
      await prisma.goalAchievementEvent.count({
        where: { weeklyReportId: reportId, goalId },
      }),
    ).toBe(1);
  });

  it('corrects and retries report projections without double counting while preserving provenance', async () => {
    const baseline = await prisma.iEPGoal.findUniqueOrThrow({
      where: { id: goalId },
      select: { timesAddressed: true },
    });
    const created = await postReport(
      command({
        weekNumber: 44,
        weekStart: '2026-10-26',
        weekEnd: '2026-10-30',
        goalProgress: [
          {
            goalId,
            addressedThisWeek: true,
            rating: 3,
            notes: 'Initial entry.',
            markedAchievedThisWeek: true,
            achievedDate: '2026-10-30',
            achievedNote: 'Entered prematurely.',
          },
        ],
      }),
      teacherCookie,
    );
    const reportId = created.body.data.id as string;
    const firstEvent = await prisma.goalAchievementEvent.findFirstOrThrow({
      where: { weeklyReportId: reportId, goalId, sourceReportVersion: 1 },
    });

    const corrected = await putReport(
      reportId,
      {
        expectedVersion: 1,
        ...command({
          weekNumber: 44,
          weekStart: '2026-10-26',
          weekEnd: '2026-10-30',
          goalProgress: [
            {
              goalId,
              addressedThisWeek: false,
              rating: null,
              notes: 'Correction: this goal was not addressed.',
              markedAchievedThisWeek: false,
            },
          ],
        }),
      },
      teacherCookie,
    );
    expect(corrected.status).toBe(200);
    const retry = await putReport(
      reportId,
      {
        expectedVersion: 1,
        ...command({
          weekNumber: 44,
          weekStart: '2026-10-26',
          weekEnd: '2026-10-30',
        }),
      },
      teacherCookie,
    );
    expect(retry.status).toBe(409);

    const events = await prisma.goalAchievementEvent.findMany({
      where: { weeklyReportId: reportId, goalId },
      orderBy: { sourceReportVersion: 'asc' },
    });
    expect(
      events.map((event) => [event.sourceReportVersion, event.achieved]),
    ).toEqual([
      [1, true],
      [2, false],
    ]);
    expect(events[0]!.id).toBe(firstEvent.id);
    expect(
      await prisma.weeklyGoalProgress.count({
        where: { weeklyReportId: reportId, goalId },
      }),
    ).toBe(1);
    expect(
      await prisma.iEPGoal.findUniqueOrThrow({
        where: { id: goalId },
        select: { timesAddressed: true },
      }),
    ).toEqual(baseline);
    await expect(
      prisma.goalAchievementEvent.update({
        where: { id: firstEvent.id },
        data: { note: 'Rewritten provenance' },
      }),
    ).rejects.toThrow(/append-only/);
  });

  it('serializes concurrent projection runs and retains the committed report correction', async () => {
    const created = await postReport(
      command({
        weekNumber: 45,
        weekStart: '2026-11-02',
        weekEnd: '2026-11-06',
      }),
      teacherCookie,
    );
    const reportId = created.body.data.id as string;
    const [update, projection] = await Promise.all([
      putReport(
        reportId,
        {
          expectedVersion: 1,
          ...command({
            weekNumber: 45,
            weekStart: '2026-11-02',
            weekEnd: '2026-11-06',
            goalProgress: [
              {
                goalId,
                addressedThisWeek: true,
                rating: 2,
                notes: 'Concurrent corrected rating.',
                markedAchievedThisWeek: false,
              },
            ],
          }),
        },
        teacherCookie,
      ),
      prisma.$transaction((tx) => projectIepGoals(tx, iepId, [goalId])),
    ]);
    expect(update.status).toBe(200);
    await prisma.$transaction((tx) => projectIepGoals(tx, iepId, [goalId]));
    expect(
      await prisma.iEPGoal.findUniqueOrThrow({ where: { id: goalId } }),
    ).toMatchObject({ lastAddressedWeek: 45, lastAddressedRating: 2 });
    expect(projection).toBeUndefined();
  });

  it('projects the explicitly selected historical IEP instead of the first IEP for the student', async () => {
    await prisma.iEP.update({
      where: { id: otherIepId },
      data: { state: 'ACTIVE' },
    });
    const firstBefore = await prisma.iEPGoal.findUniqueOrThrow({
      where: { id: goalId },
      select: { timesAddressed: true, lastAddressedWeek: true },
    });
    const created = await postReport(
      command({
        iepId: otherIepId,
        weekNumber: 46,
        weekStart: '2026-11-09',
        weekEnd: '2026-11-13',
        goalProgress: [
          {
            goalId: otherGoalId,
            addressedThisWeek: true,
            rating: 4,
            notes: 'Progress belongs to the explicitly selected plan.',
            markedAchievedThisWeek: false,
          },
        ],
      }),
      teacherCookie,
    );
    expect(created.status).toBe(201);
    expect(
      await prisma.iEPGoal.findUniqueOrThrow({ where: { id: otherGoalId } }),
    ).toMatchObject({ lastAddressedWeek: 46, lastAddressedRating: 4 });
    expect(
      await prisma.iEPGoal.findUniqueOrThrow({
        where: { id: goalId },
        select: { timesAddressed: true, lastAddressedWeek: true },
      }),
    ).toEqual(firstBefore);
  });

  it('returns achievement provenance from the IEP projection', async () => {
    const response = await request(app)
      .get(`/api/v1/organizations/${organizationId}/ieps/${iepId}`)
      .set('cookie', teacherCookie);
    expect(response.status).toBe(200);
    const goal = response.body.data.goals.find(
      (item: { id: string }) => item.id === goalId,
    );
    expect(goal.achievementEvents.length).toBeGreaterThan(0);
    expect(goal.achievementEvents[0]).toMatchObject({
      weeklyReportId: expect.any(String),
      sourceReportVersion: expect.any(Number),
      actor: { id: teacherId, displayName: 'Teacher' },
    });
    expect(goal.achievedEventId).toEqual(expect.any(String));
    expect(goal.addressedHistory.length).toBe(goal.timesAddressed);
  });

  it('derives workflow actors and enforces immutable historical report, workflow, and audit records', async () => {
    const created = await postReport(
      command({
        weekNumber: 41,
        weekStart: '2026-10-05',
        weekEnd: '2026-10-09',
      }),
      teacherCookie,
    );
    const reportId = created.body.data.id as string;
    const submitted = await workflow(
      reportId,
      'submit',
      { expectedVersion: 1 },
      teacherCookie,
    );
    expect(submitted.status).toBe(200);
    const coordinatorApproved = await workflow(
      reportId,
      'coordinator-decision',
      { expectedVersion: 2, decision: 'APPROVE' },
      coordinatorCookie,
    );
    expect(coordinatorApproved.status).toBe(200);
    const directorApproved = await workflow(
      reportId,
      'director-decision',
      { expectedVersion: 3, decision: 'APPROVE' },
      directorCookie,
    );
    expect(directorApproved.status).toBe(200);
    expect(directorApproved.body.data).toMatchObject({
      state: 'APPROVED',
      version: 4,
    });

    const events = await prisma.workflowEvent.findMany({
      where: { aggregateType: 'WEEKLY_REPORT', aggregateId: reportId },
      orderBy: { occurredAt: 'asc' },
    });
    expect(events.map((event) => event.actorId)).toEqual([
      teacherId,
      coordinatorId,
      directorId,
    ]);

    await expect(
      prisma.weeklyReport.update({
        where: { id: reportId },
        data: { descriptiveObservation: 'Forbidden historical rewrite.' },
      }),
    ).rejects.toThrow(/Historical weekly report content is immutable/);
    await expect(
      prisma.workflowEvent.update({
        where: { id: events[0]!.id },
        data: { comment: 'rewritten' },
      }),
    ).rejects.toThrow(/WorkflowEvent is append-only/);
    const audit = await prisma.auditEvent.findFirstOrThrow({
      where: { targetType: 'WEEKLY_REPORT', targetId: reportId },
    });
    await expect(
      prisma.auditEvent.update({
        where: { id: audit.id },
        data: { action: 'rewritten' },
      }),
    ).rejects.toThrow(/AuditEvent is append-only/);
  });
});
