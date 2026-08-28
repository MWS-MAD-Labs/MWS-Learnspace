import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import type { AppConfig } from '../../src/config.js';
import { schoolDateInTimezone } from '../../src/aggregateRoutes.js';
import { SessionService } from '../../src/sessionService.js';

const databaseUrl = process.env.DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
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

integration('Authorized aggregate endpoints', () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof createApp>;
  let organizationId: string;
  let otherOrganizationId: string;
  let cookie: string;
  let teacherCookie: string;
  let scopedStudentId: string;
  let activeAssignedStudentId: string;
  const organizationTimezone = 'America/Los_Angeles';

  beforeAll(async () => {
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const suffix = randomUUID();
    const [organization, otherOrganization, user, teacher] = await Promise.all([
      prisma.organization.create({
        data: {
          slug: `aggregate-${suffix}`,
          name: 'Aggregate School',
          timezone: organizationTimezone,
        },
      }),
      prisma.organization.create({
        data: { slug: `aggregate-other-${suffix}`, name: 'Other School' },
      }),
      prisma.user.create({
        data: {
          email: `aggregate-${suffix}@example.test`,
          displayName: 'Aggregate Principal',
        },
      }),
      prisma.user.create({
        data: {
          email: `aggregate-teacher-${suffix}@example.test`,
          displayName: 'Aggregate Special Education Teacher',
        },
      }),
    ]);
    organizationId = organization.id;
    otherOrganizationId = otherOrganization.id;
    const [, teacherMembership] = await Promise.all([
      prisma.membership.create({
        data: { organizationId, userId: user.id, role: 'PRINCIPAL' },
      }),
      prisma.membership.create({
        data: {
          organizationId,
          userId: teacher.id,
          role: 'SPECIAL_ED_TEACHER',
        },
      }),
    ]);
    const [
      scopedStudent,
      _otherTenantStudent,
      activeAssignedStudent,
      endedAssignedStudent,
    ] = await Promise.all([
      prisma.student.create({
        data: {
          organizationId,
          studentNumber: `AGG-${suffix}`,
          fullName: 'Authorized Search Student',
          dateOfBirth: new Date('2015-01-01T00:00:00.000Z'),
        },
      }),
      prisma.student.create({
        data: {
          organizationId: otherOrganizationId,
          studentNumber: `OTHER-${suffix}`,
          fullName: 'Other Tenant Secret Student',
          dateOfBirth: new Date('2015-01-01T00:00:00.000Z'),
        },
      }),
      prisma.student.create({
        data: {
          organizationId,
          studentNumber: `ACTIVE-${suffix}`,
          fullName: 'Assignment Scope Active Student',
          dateOfBirth: new Date('2015-01-01T00:00:00.000Z'),
          specialNeedsFlag: true,
        },
      }),
      prisma.student.create({
        data: {
          organizationId,
          studentNumber: `ENDED-${suffix}`,
          fullName: 'Assignment Scope Ended Student',
          dateOfBirth: new Date('2015-01-01T00:00:00.000Z'),
          specialNeedsFlag: true,
        },
      }),
    ]);
    scopedStudentId = scopedStudent.id;
    activeAssignedStudentId = activeAssignedStudent.id;
    await Promise.all([
      prisma.staffStudentAssignment.create({
        data: {
          organizationId,
          membershipId: teacherMembership.id,
          studentId: activeAssignedStudent.id,
          roleContext: 'SPECIAL_ED',
          startsOn: new Date('2026-01-01T00:00:00.000Z'),
        },
      }),
      prisma.staffStudentAssignment.create({
        data: {
          organizationId,
          membershipId: teacherMembership.id,
          studentId: endedAssignedStudent.id,
          roleContext: 'SPECIAL_ED',
          startsOn: new Date('2025-01-01T00:00:00.000Z'),
          endsOn: new Date('2025-12-31T00:00:00.000Z'),
        },
      }),
    ]);
    const sessions = new SessionService(
      prisma,
      config.sessionSecret,
      config.sessionTtlHours,
    );
    const [session, teacherSession] = await Promise.all([
      sessions.create(user.id),
      sessions.create(teacher.id),
    ]);
    cookie = `learnspace_session=${session.token}`;
    teacherCookie = `learnspace_session=${teacherSession.token}`;
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
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({
      where: { id: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.$disconnect();
  });

  it('returns only records from the authorized organization', async () => {
    const response = await request(app)
      .get(`/api/v1/organizations/${organizationId}/search?q=student&limit=20`)
      .set('cookie', cookie);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: scopedStudentId,
          title: 'Authorized Search Student',
        }),
      ]),
    );
    expect(response.body.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Other Tenant Secret Student' }),
      ]),
    );
  });

  it('filters search by date-effective student assignment', async () => {
    const response = await request(app)
      .get(
        `/api/v1/organizations/${organizationId}/search?q=assignment%20scope&limit=20`,
      )
      .set('cookie', teacherCookie);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: activeAssignedStudentId }),
      ]),
    );
    expect(response.body.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Assignment Scope Ended Student' }),
      ]),
    );
  });

  it('uses the organization timezone for the dashboard school date', async () => {
    const response = await request(app)
      .get(`/api/v1/organizations/${organizationId}/dashboard-summary`)
      .set('cookie', cookie);
    expect(response.status).toBe(200);
    expect(response.body.data.attendance.schoolDate).toBe(
      schoolDateInTimezone(organizationTimezone).toISOString().slice(0, 10),
    );
  });

  it('omits observation reporting for leadership without an observation aggregate policy', async () => {
    const response = await request(app)
      .get(`/api/v1/organizations/${organizationId}/reporting-aggregate`)
      .set('cookie', cookie);
    expect(response.status).toBe(200);
    expect(response.body.data).not.toHaveProperty('observations');
  });

  it('keeps aggregate and trigram indexes aligned with the Prisma schema', async () => {
    const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'ObservationAssignment_organizationId_status_dueDate_id_idx',
          'Student_fullName_trgm_idx',
          'Student_nickname_trgm_idx',
          'Student_studentNumber_trgm_idx',
          'LearningJourney_title_trgm_idx',
          'IEP_primaryClassification_trgm_idx',
          'IEP_currentPlacement_trgm_idx',
          'IEPGoal_code_trgm_idx',
          'IEPGoal_measurableGoal_trgm_idx',
          'IEPGoal_performanceArea_trgm_idx',
          'WeeklyReport_descriptiveObservation_trgm_idx',
          'WeeklyReport_homeConnection_trgm_idx'
        )
      ORDER BY indexname
    `;
    expect(rows.map((row) => row.indexname)).toHaveLength(12);
  });

  it('denies aggregate access to an organization outside the session', async () => {
    const response = await request(app)
      .get(`/api/v1/organizations/${otherOrganizationId}/dashboard-summary`)
      .set('cookie', cookie);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTHORIZATION_DENIED');
  });
});
