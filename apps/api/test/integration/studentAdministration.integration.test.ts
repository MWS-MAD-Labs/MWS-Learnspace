import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import type { AppConfig } from '../../src/config.js';
import { DEFAULT_GPK_MAX_CASELOAD } from '../../src/resourceRoutes.js';
import { SessionService } from '../../src/sessionService.js';

const databaseUrl = process.env.DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const csrf = 'student-administration-csrf';
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
let otherOrganizationId: string;
let academicYearId: string;
let classId: string;
let directorId: string;
let coordinatorId: string;
let directorCookie: string;
let coordinatorCookie: string;
let principalCookie: string;
let gradeTeacherCookie: string;
let gpkMembershipId: string;
let otherGpkMembershipId: string;
let replacementGpkMembershipId: string;
let ineligibleStudentId: string;
let assignedStudentId: string;
let concurrentStudentIds: string[];

async function authenticatedCookie(userId: string): Promise<string> {
  const sessions = new SessionService(
    prisma,
    config.sessionSecret,
    config.sessionTtlHours,
  );
  const session = await sessions.create(userId);
  return `learnspace_session=${session.token}`;
}

function get(path: string, cookie: string) {
  return request(app).get(path).set('cookie', cookie);
}

function post(path: string, body: unknown, cookie: string) {
  return request(app)
    .post(path)
    .set('cookie', `${cookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body);
}

function patch(path: string, body: unknown, cookie: string) {
  return request(app)
    .patch(path)
    .set('cookie', `${cookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body);
}

function put(path: string, body: unknown, cookie: string) {
  return request(app)
    .put(path)
    .set('cookie', `${cookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body);
}

integration('student and GPK assignment administration', () => {
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
        data: { slug: `student-admin-${suffix}`, name: 'Student Admin School' },
      }),
      prisma.organization.create({
        data: {
          slug: `student-admin-other-${suffix}`,
          name: 'Other Student Admin School',
        },
      }),
    ]);
    organizationId = organization.id;
    otherOrganizationId = otherOrganization.id;

    const [
      director,
      coordinator,
      principal,
      gradeTeacher,
      gpk,
      replacementGpk,
      otherGpk,
    ] = await Promise.all([
      prisma.user.create({
        data: {
          email: `director-${suffix}@example.test`,
          displayName: 'Director Actor',
        },
      }),
      prisma.user.create({
        data: {
          email: `coordinator-${suffix}@example.test`,
          displayName: 'Coordinator Actor',
        },
      }),
      prisma.user.create({
        data: {
          email: `principal-${suffix}@example.test`,
          displayName: 'Principal Reader',
        },
      }),
      prisma.user.create({
        data: {
          email: `grade-${suffix}@example.test`,
          displayName: 'Grade Teacher Denied',
        },
      }),
      prisma.user.create({
        data: {
          email: `gpk-${suffix}@example.test`,
          displayName: 'GPK Teacher',
        },
      }),
      prisma.user.create({
        data: {
          email: `replacement-gpk-${suffix}@example.test`,
          displayName: 'Replacement GPK',
        },
      }),
      prisma.user.create({
        data: {
          email: `other-gpk-${suffix}@example.test`,
          displayName: 'Other Tenant GPK',
        },
      }),
    ]);
    directorId = director.id;
    coordinatorId = coordinator.id;
    const memberships = await Promise.all([
      prisma.membership.create({
        data: { organizationId, userId: director.id, role: 'DIRECTOR' },
      }),
      prisma.membership.create({
        data: {
          organizationId,
          userId: coordinator.id,
          role: 'SPECIAL_ED_COORDINATOR',
        },
      }),
      prisma.membership.create({
        data: { organizationId, userId: principal.id, role: 'PRINCIPAL' },
      }),
      prisma.membership.create({
        data: {
          organizationId,
          userId: gradeTeacher.id,
          role: 'GRADE_TEACHER',
        },
      }),
      prisma.membership.create({
        data: {
          organizationId,
          userId: gpk.id,
          role: 'SPECIAL_ED_TEACHER',
          roleTitle: 'GPK Teacher',
        },
      }),
      prisma.membership.create({
        data: {
          organizationId,
          userId: replacementGpk.id,
          role: 'SPECIAL_ED_TEACHER',
          roleTitle: 'Replacement GPK Teacher',
        },
      }),
      prisma.membership.create({
        data: {
          organizationId: otherOrganizationId,
          userId: otherGpk.id,
          role: 'SPECIAL_ED_TEACHER',
          roleTitle: 'Other GPK Teacher',
        },
      }),
    ]);
    gpkMembershipId = memberships[4].id;
    replacementGpkMembershipId = memberships[5].id;
    otherGpkMembershipId = memberships[6].id;

    const academicYear = await prisma.academicYear.create({
      data: {
        organizationId,
        name: `2026-${suffix}`,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
        endsOn: new Date('2027-06-30T00:00:00.000Z'),
      },
    });
    academicYearId = academicYear.id;
    const unit = await prisma.unit.create({
      data: { organizationId, code: `U-${suffix}`, name: 'Primary Unit' },
    });
    const grade = await prisma.grade.create({
      data: {
        organizationId,
        unitId: unit.id,
        code: `G-${suffix}`,
        name: 'Grade One',
        position: 1,
      },
    });
    const schoolClass = await prisma.schoolClass.create({
      data: {
        organizationId,
        unitId: unit.id,
        gradeId: grade.id,
        code: `C-${suffix}`,
        name: 'Class One',
      },
    });
    classId = schoolClass.id;

    const specialStudents = [];
    for (let index = 0; index < 4; index += 1) {
      const student = await prisma.student.create({
        data: {
          organizationId,
          studentNumber: `SP-${index}-${suffix}`,
          fullName: `Special Student ${index + 1}`,
          gender: index % 2 ? 'MALE' : 'FEMALE',
          dateOfBirth: new Date('2019-01-01T00:00:00.000Z'),
          address: `Private student address ${index}`,
          specialNeedsFlag: true,
          primaryClassification: 'Learning support',
          currentPlacement: 'Inclusive classroom',
        },
      });
      specialStudents.push(student);
      await prisma.enrollment.create({
        data: {
          organizationId,
          studentId: student.id,
          academicYearId,
          classId,
          startsOn: new Date('2026-07-01T00:00:00.000Z'),
        },
      });
    }
    assignedStudentId = specialStudents[0].id;
    concurrentStudentIds = [specialStudents[1].id, specialStudents[2].id];
    await prisma.guardianContact.create({
      data: {
        organizationId,
        studentId: assignedStudentId,
        name: 'Private Guardian',
        relationship: 'Parent',
        phone: '+62-private-phone',
        email: 'private-guardian@example.test',
        address: 'Private guardian address',
        isPrimary: true,
      },
    });
    await prisma.staffStudentAssignment.create({
      data: {
        organizationId,
        membershipId: gpkMembershipId,
        studentId: assignedStudentId,
        roleContext: 'GPK',
        startsOn: new Date('2026-08-01T00:00:00.000Z'),
        maxCaseload: DEFAULT_GPK_MAX_CASELOAD,
      },
    });

    const ineligible = await prisma.student.create({
      data: {
        organizationId,
        studentNumber: `REG-${suffix}`,
        fullName: 'Regular Student',
        dateOfBirth: new Date('2019-01-01T00:00:00.000Z'),
        specialNeedsFlag: false,
      },
    });
    ineligibleStudentId = ineligible.id;

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
    [directorCookie, coordinatorCookie, principalCookie, gradeTeacherCookie] =
      await Promise.all([
        authenticatedCookie(director.id),
        authenticatedCookie(coordinator.id),
        authenticatedCookie(principal.id),
        authenticatedCookie(gradeTeacher.id),
      ]);
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('enforces the staff directory and assignment administration role matrix and tenant scope', async () => {
    for (const cookie of [directorCookie, coordinatorCookie, principalCookie]) {
      const response = await get(
        `/api/v1/organizations/${organizationId}/staff`,
        cookie,
      );
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            membershipId: gpkMembershipId,
            role: 'SPECIAL_ED_TEACHER',
          }),
        ]),
      );
      expect(JSON.stringify(response.body)).not.toContain('@example.test');
    }

    expect(
      (
        await get(
          `/api/v1/organizations/${organizationId}/staff`,
          gradeTeacherCookie,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await get(
          `/api/v1/organizations/${otherOrganizationId}/staff`,
          directorCookie,
        )
      ).status,
    ).toBe(403);

    const assignmentListPath = `/api/v1/organizations/${organizationId}/gpk-assignments?schoolDate=2026-08-24`;
    expect((await get(assignmentListPath, directorCookie)).status).toBe(200);
    expect((await get(assignmentListPath, coordinatorCookie)).status).toBe(200);
    expect((await get(assignmentListPath, principalCookie)).status).toBe(403);
  });

  it('returns authorized rich student data but never guardian contacts in the broad list', async () => {
    const list = await get(
      `/api/v1/organizations/${organizationId}/students?schoolDate=2026-08-24`,
      coordinatorCookie,
    );
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(4);
    expect(list.body.data[0]).toEqual(
      expect.objectContaining({
        dateOfBirth: '2019-01-01',
        specialNeedsFlag: true,
        primaryClassification: 'Learning support',
        currentPlacement: 'Inclusive classroom',
        activeEnrollment: expect.objectContaining({
          classId,
          unitName: 'Primary Unit',
          gradeName: 'Grade One',
        }),
      }),
    );
    const serialized = JSON.stringify(list.body);
    expect(serialized).not.toContain('guardians');
    expect(serialized).not.toContain('Private Guardian');
    expect(serialized).not.toContain('+62-private-phone');
    expect(serialized).not.toContain('private-guardian@example.test');
    expect(serialized).not.toContain('Private guardian address');
    expect(serialized).not.toContain('Private student address');

    const detail = await get(
      `/api/v1/organizations/${organizationId}/students/${assignedStudentId}?schoolDate=2026-08-24`,
      directorCookie,
    );
    expect(detail.status).toBe(200);
    expect(detail.body.data.guardians[0]).toEqual(
      expect.objectContaining({
        name: 'Private Guardian',
        phone: '+62-private-phone',
        email: 'private-guardian@example.test',
      }),
    );
    expect(detail.body.data.activeGpkAssignment).toEqual(
      expect.objectContaining({
        maxCaseload: DEFAULT_GPK_MAX_CASELOAD,
        staff: expect.objectContaining({ membershipId: gpkMembershipId }),
      }),
    );
  });

  it('allows only directors to mutate students and audits the session actor', async () => {
    const createBody = {
      studentNumber: `CREATED-${randomUUID()}`,
      fullName: 'Created Student',
      gender: 'OTHER',
      dateOfBirth: '2019-03-04',
      specialNeedsFlag: true,
      activeEnrollment: {
        academicYearId,
        classId,
        startsOn: '2026-08-01',
      },
    };
    const denied = await post(
      `/api/v1/organizations/${organizationId}/students`,
      createBody,
      coordinatorCookie,
    );
    expect(denied.status).toBe(403);

    const spoofed = await post(
      `/api/v1/organizations/${organizationId}/students`,
      { ...createBody, actorId: coordinatorId },
      directorCookie,
    );
    expect(spoofed.status).toBe(400);

    const created = await post(
      `/api/v1/organizations/${organizationId}/students`,
      createBody,
      directorCookie,
    );
    expect(created.status).toBe(201);
    expect(created.body.data.activeEnrollment.classId).toBe(classId);
    expect(
      await prisma.auditEvent.count({
        where: {
          organizationId,
          action: 'student.create',
          targetId: created.body.data.id,
          actorId: directorId,
        },
      }),
    ).toBe(1);

    const updated = await patch(
      `/api/v1/organizations/${organizationId}/students/${created.body.data.id}`,
      { currentPlacement: 'Updated placement' },
      directorCookie,
    );
    expect(updated.status).toBe(200);
    expect(updated.body.data.currentPlacement).toBe('Updated placement');

    const existingClass = await prisma.schoolClass.findUniqueOrThrow({
      where: { id: classId },
    });
    const conflictingClass = await prisma.schoolClass.create({
      data: {
        organizationId,
        unitId: existingClass.unitId,
        gradeId: existingClass.gradeId,
        code: `CONFLICT-${randomUUID()}`,
        name: `Conflicting Class ${randomUUID()}`,
      },
    });
    const enrollmentConflict = await patch(
      `/api/v1/organizations/${organizationId}/students/${created.body.data.id}`,
      {
        activeEnrollment: {
          academicYearId,
          classId: conflictingClass.id,
          startsOn: '2026-08-01',
        },
      },
      directorCookie,
    );
    expect(enrollmentConflict.status).toBe(409);
    expect(enrollmentConflict.body.error.code).toBe(
      'ENROLLMENT_START_CONFLICT',
    );
    expect(
      await prisma.enrollment.count({
        where: {
          organizationId,
          studentId: created.body.data.id,
          startsOn: new Date('2026-08-01T00:00:00.000Z'),
        },
      }),
    ).toBe(1);
  });

  it('validates GPK target membership, student eligibility, path IDs, and audits the session actor', async () => {
    const invalidPath = await put(
      `/api/v1/organizations/${organizationId}/students/not-a-uuid/gpk-assignment`,
      { membershipId: gpkMembershipId, startsOn: '2026-08-24' },
      coordinatorCookie,
    );
    expect(invalidPath.status).toBe(400);
    expect(invalidPath.body.error.code).toBe('VALIDATION_ERROR');

    const path = `/api/v1/organizations/${organizationId}/students/${concurrentStudentIds[0]}/gpk-assignment`;
    const crossTenant = await put(
      path,
      { membershipId: otherGpkMembershipId, startsOn: '2026-08-24' },
      coordinatorCookie,
    );
    expect(crossTenant.status).toBe(400);
    expect(crossTenant.body.error.code).toBe('INVALID_GPK_MEMBERSHIP');

    const ineligible = await put(
      `/api/v1/organizations/${organizationId}/students/${ineligibleStudentId}/gpk-assignment`,
      { membershipId: gpkMembershipId, startsOn: '2026-08-24' },
      coordinatorCookie,
    );
    expect(ineligible.status).toBe(400);
    expect(ineligible.body.error.code).toBe('GPK_STUDENT_NOT_ELIGIBLE');

    const spoofed = await put(
      path,
      {
        membershipId: gpkMembershipId,
        startsOn: '2026-08-24',
        actorId: directorId,
      },
      coordinatorCookie,
    );
    expect(spoofed.status).toBe(400);
  });

  it('serializes capacity checks so one of two simultaneous assignments succeeds and one returns 409', async () => {
    const command = {
      membershipId: gpkMembershipId,
      startsOn: '2026-09-01',
    };
    const responses = await Promise.all(
      concurrentStudentIds.map((studentId) =>
        put(
          `/api/v1/organizations/${organizationId}/students/${studentId}/gpk-assignment`,
          command,
          coordinatorCookie,
        ),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    const success = responses.find((response) => response.status === 200)!;
    const conflict = responses.find((response) => response.status === 409)!;
    expect(['GPK_CASELOAD_CAPACITY', 'GPK_ASSIGNMENT_CONFLICT']).toContain(
      conflict.body.error.code,
    );

    expect(
      await prisma.staffStudentAssignment.count({
        where: {
          organizationId,
          membershipId: gpkMembershipId,
          roleContext: 'GPK',
          startsOn: { lte: new Date('2026-09-01T00:00:00.000Z') },
          OR: [
            { endsOn: null },
            { endsOn: { gte: new Date('2026-09-01T00:00:00.000Z') } },
          ],
        },
      }),
    ).toBe(DEFAULT_GPK_MAX_CASELOAD);
    expect(success.body.data.maxCaseload).toBe(DEFAULT_GPK_MAX_CASELOAD);
    expect(
      await prisma.auditEvent.count({
        where: {
          organizationId,
          action: 'gpk_assignment.upsert',
          targetId: success.body.data.id,
          actorId: coordinatorId,
        },
      }),
    ).toBe(1);
  });

  it('reassigns atomically, validates end-command IDs, and audits the explicit end command', async () => {
    const invalidEnd = await post(
      `/api/v1/organizations/${organizationId}/gpk-assignments/not-a-uuid/end`,
      { endsOn: '2026-10-15' },
      coordinatorCookie,
    );
    expect(invalidEnd.status).toBe(400);
    expect(invalidEnd.body.error.code).toBe('VALIDATION_ERROR');

    const reassigned = await put(
      `/api/v1/organizations/${organizationId}/students/${assignedStudentId}/gpk-assignment`,
      {
        membershipId: replacementGpkMembershipId,
        startsOn: '2026-10-01',
      },
      directorCookie,
    );
    expect(reassigned.status).toBe(200);
    expect(reassigned.body.data.staff.membershipId).toBe(
      replacementGpkMembershipId,
    );
    const previous = await prisma.staffStudentAssignment.findFirstOrThrow({
      where: {
        organizationId,
        studentId: assignedStudentId,
        membershipId: gpkMembershipId,
        roleContext: 'GPK',
      },
      orderBy: { startsOn: 'desc' },
    });
    expect(previous.endsOn?.toISOString().slice(0, 10)).toBe('2026-09-30');

    const ended = await post(
      `/api/v1/organizations/${organizationId}/gpk-assignments/${reassigned.body.data.id}/end`,
      { endsOn: '2026-10-15' },
      coordinatorCookie,
    );
    expect(ended.status).toBe(200);
    expect(ended.body.data.endsOn).toBe('2026-10-15');
    expect(
      await prisma.auditEvent.count({
        where: {
          organizationId,
          action: 'gpk_assignment.end',
          targetId: reassigned.body.data.id,
          actorId: coordinatorId,
        },
      }),
    ).toBe(1);
  });
});
