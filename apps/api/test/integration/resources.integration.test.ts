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
const csrf = 'integration-csrf-token';
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
let unitId: string;
let gradeId: string;
let classId: string;
let otherClassId: string;
let subjectId: string;
let gradeTeacherId: string;
let gradeTeacherCookie: string;
let subjectTeacherCookie: string;
let specialistCookie: string;
let rosterStudentIds: string[];
let outOfClassStudentId: string;

async function authenticatedCookie(userId: string): Promise<string> {
  const sessions = new SessionService(
    prisma,
    config.sessionSecret,
    config.sessionTtlHours,
  );
  const session = await sessions.create(userId);
  return `learnspace_session=${session.token}`;
}

function get(path: string, cookie = gradeTeacherCookie) {
  return request(app).get(path).set('cookie', cookie);
}

function put(path: string, body: object) {
  return request(app)
    .put(path)
    .set('cookie', `${gradeTeacherCookie}; learnspace_csrf=${csrf}`)
    .set('x-csrf-token', csrf)
    .send(body);
}

integration('academic, student, and attendance routes', () => {
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
        data: { slug: `resources-${suffix}`, name: 'Resource School' },
      }),
      prisma.organization.create({
        data: { slug: `resources-other-${suffix}`, name: 'Other School' },
      }),
    ]);
    organizationId = organization.id;
    otherOrganizationId = otherOrganization.id;

    const [gradeTeacher, subjectTeacher, specialist] = await Promise.all([
      prisma.user.create({
        data: {
          email: `grade-${suffix}@example.test`,
          displayName: 'Grade Teacher',
        },
      }),
      prisma.user.create({
        data: {
          email: `subject-${suffix}@example.test`,
          displayName: 'Subject Teacher',
        },
      }),
      prisma.user.create({
        data: {
          email: `specialist-${suffix}@example.test`,
          displayName: 'Specialist',
        },
      }),
    ]);
    gradeTeacherId = gradeTeacher.id;
    const [gradeMembership, subjectMembership, specialistMembership] =
      await Promise.all([
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
            userId: subjectTeacher.id,
            role: 'SUBJECT_TEACHER',
          },
        }),
        prisma.membership.create({
          data: { organizationId, userId: specialist.id, role: 'SPECIALIST' },
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
    const otherYear = await prisma.academicYear.create({
      data: {
        organizationId: otherOrganizationId,
        name: `2026-${suffix}`,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
        endsOn: new Date('2027-06-30T00:00:00.000Z'),
      },
    });
    const [unit, unscopedUnit, otherUnit] = await Promise.all([
      prisma.unit.create({
        data: { organizationId, code: `U-${suffix}`, name: 'Scoped Unit' },
      }),
      prisma.unit.create({
        data: { organizationId, code: `UX-${suffix}`, name: 'Unscoped Unit' },
      }),
      prisma.unit.create({
        data: {
          organizationId: otherOrganizationId,
          code: `OU-${suffix}`,
          name: 'Other Unit',
        },
      }),
    ]);
    unitId = unit.id;
    const [grade, unscopedGrade, otherGrade] = await Promise.all([
      prisma.grade.create({
        data: {
          organizationId,
          unitId,
          code: `G-${suffix}`,
          name: 'Scoped Grade',
          position: 1,
        },
      }),
      prisma.grade.create({
        data: {
          organizationId,
          unitId: unscopedUnit.id,
          code: `GX-${suffix}`,
          name: 'Unscoped Grade',
          position: 2,
        },
      }),
      prisma.grade.create({
        data: {
          organizationId: otherOrganizationId,
          unitId: otherUnit.id,
          code: `OG-${suffix}`,
          name: 'Other Grade',
          position: 1,
        },
      }),
    ]);
    gradeId = grade.id;
    const [schoolClass, unscopedClass, otherClass] = await Promise.all([
      prisma.schoolClass.create({
        data: {
          organizationId,
          unitId,
          gradeId,
          code: `C-${suffix}`,
          name: 'Scoped Class',
        },
      }),
      prisma.schoolClass.create({
        data: {
          organizationId,
          unitId: unscopedUnit.id,
          gradeId: unscopedGrade.id,
          code: `CX-${suffix}`,
          name: 'Unscoped Class',
        },
      }),
      prisma.schoolClass.create({
        data: {
          organizationId: otherOrganizationId,
          unitId: otherUnit.id,
          gradeId: otherGrade.id,
          code: `OC-${suffix}`,
          name: 'Other Class',
        },
      }),
    ]);
    classId = schoolClass.id;
    otherClassId = otherClass.id;
    const [subject, otherSubject] = await Promise.all([
      prisma.subject.create({
        data: { organizationId, code: `S-${suffix}`, name: 'Scoped Subject' },
      }),
      prisma.subject.create({
        data: {
          organizationId,
          code: `SX-${suffix}`,
          name: 'Unscoped Subject',
        },
      }),
    ]);
    subjectId = subject.id;
    await Promise.all([
      prisma.membershipUnit.create({
        data: { membershipId: gradeMembership.id, unitId },
      }),
      prisma.membershipGrade.create({
        data: { membershipId: gradeMembership.id, gradeId },
      }),
      prisma.membershipSubject.create({
        data: { membershipId: subjectMembership.id, subjectId },
      }),
    ]);

    rosterStudentIds = [];
    for (let index = 0; index < 2; index += 1) {
      const student = await prisma.student.create({
        data: {
          organizationId,
          studentNumber: `R-${index}-${suffix}`,
          fullName: `Roster Student ${index + 1}`,
          dateOfBirth: new Date('2019-01-01T00:00:00.000Z'),
          address: 'Must not be exposed',
          specialNeedsFlag: true,
          primaryClassification: 'Learning support',
        },
      });
      rosterStudentIds.push(student.id);
      await prisma.enrollment.create({
        data: {
          organizationId,
          studentId: student.id,
          academicYearId: year.id,
          classId,
          startsOn: new Date('2026-07-01T00:00:00.000Z'),
        },
      });
    }
    const outOfClassStudent = await prisma.student.create({
      data: {
        organizationId,
        studentNumber: `OUT-${suffix}`,
        fullName: 'Out Of Class Student',
        dateOfBirth: new Date('2019-01-01T00:00:00.000Z'),
      },
    });
    outOfClassStudentId = outOfClassStudent.id;
    await prisma.enrollment.create({
      data: {
        organizationId,
        studentId: outOfClassStudent.id,
        academicYearId: year.id,
        classId: unscopedClass.id,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
      },
    });
    await prisma.staffStudentAssignment.create({
      data: {
        organizationId,
        membershipId: specialistMembership.id,
        studentId: rosterStudentIds[0],
        roleContext: 'CASELOAD',
        startsOn: new Date('2026-08-01T00:00:00.000Z'),
        endsOn: new Date('2026-08-31T00:00:00.000Z'),
      },
    });

    const otherStudent = await prisma.student.create({
      data: {
        organizationId: otherOrganizationId,
        studentNumber: `OTHER-${suffix}`,
        fullName: 'Other Tenant Student',
        dateOfBirth: new Date('2019-01-01T00:00:00.000Z'),
      },
    });
    await prisma.enrollment.create({
      data: {
        organizationId: otherOrganizationId,
        studentId: otherStudent.id,
        academicYearId: otherYear.id,
        classId: otherClassId,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
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
    [gradeTeacherCookie, subjectTeacherCookie, specialistCookie] =
      await Promise.all([
        authenticatedCookie(gradeTeacher.id),
        authenticatedCookie(subjectTeacher.id),
        authenticatedCookie(specialist.id),
      ]);
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('lists only organizations and academic records available through session scopes', async () => {
    const organizations = await get('/api/v1/organizations');
    expect(organizations.status).toBe(200);
    expect(
      organizations.body.data.map((item: { id: string }) => item.id),
    ).toEqual([organizationId]);

    const classes = await get(
      `/api/v1/organizations/${organizationId}/classes`,
    );
    expect(classes.status).toBe(200);
    expect(classes.body.data).toHaveLength(1);
    expect(classes.body.data[0].id).toBe(classId);

    const crossOrganization = await get(
      `/api/v1/organizations/${otherOrganizationId}/classes`,
    );
    expect(crossOrganization.status).toBe(403);
    expect(crossOrganization.body.error.code).toBe('AUTHORIZATION_DENIED');
  });

  it('limits subject teachers to their subjects and denies unsupported collections', async () => {
    const subjects = await get(
      `/api/v1/organizations/${organizationId}/subjects`,
      subjectTeacherCookie,
    );
    expect(subjects.status).toBe(200);
    expect(subjects.body.data.map((item: { id: string }) => item.id)).toEqual([
      subjectId,
    ]);
    const classes = await get(
      `/api/v1/organizations/${organizationId}/classes`,
      subjectTeacherCookie,
    );
    expect(classes.status).toBe(403);
  });

  it('returns authorized rich student fields without private contacts and enforces grade and dated assigned-student scope', async () => {
    const students = await get(
      `/api/v1/organizations/${organizationId}/students?schoolDate=2026-08-24`,
    );
    expect(students.status).toBe(200);
    expect(students.body.data).toHaveLength(2);
    expect(students.body.data[0]).toEqual(
      expect.objectContaining({
        gender: 'UNSPECIFIED',
        dateOfBirth: '2019-01-01',
        specialNeedsFlag: true,
        primaryClassification: 'Learning support',
        activeEnrollment: expect.objectContaining({ classId }),
        activeGpkAssignment: null,
      }),
    );
    expect(JSON.stringify(students.body)).not.toContain('address');
    expect(JSON.stringify(students.body)).not.toContain('guardians');
    expect(JSON.stringify(students.body)).not.toContain('phone');
    expect(JSON.stringify(students.body)).not.toContain('email');

    const detail = await get(
      `/api/v1/organizations/${organizationId}/students/${rosterStudentIds[0]}?schoolDate=2026-08-24`,
    );
    expect(detail.status).toBe(403);
    expect(detail.body.error.code).toBe('AUTHORIZATION_DENIED');

    const assigned = await get(
      `/api/v1/organizations/${organizationId}/students?schoolDate=2026-08-24`,
      specialistCookie,
    );
    expect(assigned.status).toBe(200);
    expect(assigned.body.data.map((item: { id: string }) => item.id)).toEqual([
      rosterStudentIds[0],
    ]);
    const expired = await get(
      `/api/v1/organizations/${organizationId}/students?schoolDate=2026-09-01`,
      specialistCookie,
    );
    expect(expired.status).toBe(403);
  });

  it('scopes dashboard attendance to authorized classes and deduplicates students', async () => {
    const [year, unscopedClass, scopedEnrollment] = await Promise.all([
      prisma.academicYear.findFirstOrThrow({ where: { organizationId } }),
      prisma.schoolClass.findFirstOrThrow({
        where: { organizationId, name: 'Unscoped Class' },
      }),
      prisma.enrollment.findFirstOrThrow({
        where: { organizationId, studentId: rosterStudentIds[0], classId },
      }),
    ]);
    const unscopedEnrollment = await prisma.enrollment.create({
      data: {
        organizationId,
        studentId: rosterStudentIds[0],
        academicYearId: year.id,
        classId: unscopedClass.id,
        startsOn: new Date('2026-07-01T00:00:00.000Z'),
      },
    });
    const expiredEnrollment = await prisma.enrollment.create({
      data: {
        organizationId,
        studentId: rosterStudentIds[1],
        academicYearId: year.id,
        classId,
        startsOn: new Date('2025-01-01T00:00:00.000Z'),
        endsOn: new Date('2025-12-31T00:00:00.000Z'),
      },
    });
    const schoolDate = new Date().toISOString().slice(0, 10);
    await Promise.all([
      prisma.attendanceRecord.create({
        data: {
          organizationId,
          studentId: rosterStudentIds[0],
          enrollmentId: scopedEnrollment.id,
          classId,
          schoolDate: new Date(`${schoolDate}T00:00:00.000Z`),
          status: 'PRESENT',
          recordedById: gradeTeacherId,
        },
      }),
      prisma.attendanceRecord.create({
        data: {
          organizationId,
          studentId: rosterStudentIds[0],
          enrollmentId: unscopedEnrollment.id,
          classId: unscopedClass.id,
          schoolDate: new Date(`${schoolDate}T00:00:00.000Z`),
          status: 'UNEXCUSED_ABSENCE',
          recordedById: gradeTeacherId,
        },
      }),
      prisma.attendanceRecord.create({
        data: {
          organizationId,
          studentId: rosterStudentIds[1],
          enrollmentId: expiredEnrollment.id,
          classId,
          schoolDate: new Date(`${schoolDate}T00:00:00.000Z`),
          status: 'LATE',
          minutesLate: 5,
          recordedById: gradeTeacherId,
        },
      }),
    ]);

    const search = await get(
      `/api/v1/organizations/${organizationId}/search?q=Roster%20Student%201`,
    );
    expect(search.status).toBe(200);
    expect(search.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: rosterStudentIds[0],
          classId,
        }),
      ]),
    );

    const response = await get(
      `/api/v1/organizations/${organizationId}/dashboard-summary`,
    );
    expect(response.status).toBe(200);
    expect(response.body.data.attendance).toMatchObject({
      totalStudents: 2,
      recorded: 1,
      present: 1,
      late: 0,
      absent: 0,
    });
  });

  it('validates attendance dates and returns active roster plus existing attendance', async () => {
    const missing = await get(
      `/api/v1/organizations/${organizationId}/classes/${classId}/attendance`,
    );
    expect(missing.status).toBe(400);
    const invalid = await get(
      `/api/v1/organizations/${organizationId}/classes/${classId}/attendance?schoolDate=2026-02-30`,
    );
    expect(invalid.status).toBe(400);

    await prisma.attendanceRecord.create({
      data: {
        organizationId,
        studentId: rosterStudentIds[0],
        enrollmentId: (
          await prisma.enrollment.findFirstOrThrow({
            where: { studentId: rosterStudentIds[0], classId },
          })
        ).id,
        classId,
        schoolDate: new Date('2026-08-24T00:00:00.000Z'),
        status: 'SICK',
        recordedById: gradeTeacherId,
      },
    });
    const response = await get(
      `/api/v1/organizations/${organizationId}/classes/${classId}/attendance?schoolDate=2026-08-24`,
    );
    expect(response.status).toBe(200);
    expect(response.body.data.roster).toHaveLength(2);
    expect(response.body.data.roster[0]).toHaveProperty('attendance');
    expect(response.body.data.version).toMatch(/^1:/);

    const crossOrganization = await get(
      `/api/v1/organizations/${organizationId}/classes/${otherClassId}/attendance?schoolDate=2026-08-24`,
    );
    expect(crossOrganization.status).toBe(403);
  });

  it('rejects duplicates, actor spoofing, and out-of-class students without partial writes', async () => {
    const path = `/api/v1/organizations/${organizationId}/classes/${classId}/attendance`;
    const duplicate = await put(path, {
      schoolDate: '2026-08-25',
      expectedVersion: '0:none',
      records: [
        { studentId: rosterStudentIds[0], status: 'PRESENT' },
        { studentId: rosterStudentIds[0], status: 'SICK' },
      ],
    });
    expect(duplicate.status).toBe(400);

    const spoofed = await put(path, {
      schoolDate: '2026-08-25',
      expectedVersion: '0:none',
      actorId: rosterStudentIds[0],
      records: [{ studentId: rosterStudentIds[0], status: 'PRESENT' }],
    });
    expect(spoofed.status).toBe(400);

    const outOfClass = await put(path, {
      schoolDate: '2026-08-25',
      expectedVersion: '0:none',
      records: [
        { studentId: rosterStudentIds[0], status: 'PRESENT' },
        { studentId: outOfClassStudentId, status: 'SICK' },
      ],
    });
    expect(outOfClass.status).toBe(400);
    expect(outOfClass.body.error.code).toBe('STUDENT_NOT_IN_CLASS');
    expect(
      await prisma.attendanceRecord.count({
        where: {
          organizationId,
          classId,
          schoolDate: new Date('2026-08-25T00:00:00.000Z'),
        },
      }),
    ).toBe(0);
  });

  it('uses the session actor, writes the audit atomically, and rejects stale versions', async () => {
    const path = `/api/v1/organizations/${organizationId}/classes/${classId}/attendance`;
    const first = await put(path, {
      schoolDate: '2026-08-26',
      expectedVersion: '0:none',
      records: [
        {
          studentId: rosterStudentIds[0],
          status: 'LATE',
          minutesLate: 7,
          notes: 'Bus delay',
        },
      ],
    });
    expect(first.status).toBe(200);
    const saved = await prisma.attendanceRecord.findFirstOrThrow({
      where: {
        organizationId,
        classId,
        studentId: rosterStudentIds[0],
        schoolDate: new Date('2026-08-26T00:00:00.000Z'),
      },
    });
    expect(saved.recordedById).toBe(gradeTeacherId);
    expect(
      await prisma.auditEvent.count({
        where: {
          organizationId,
          action: 'attendance.bulk_upsert',
          targetId: classId,
          actorId: gradeTeacherId,
        },
      }),
    ).toBeGreaterThan(0);

    const stale = await put(path, {
      schoolDate: '2026-08-26',
      expectedVersion: '0:none',
      records: [{ studentId: rosterStudentIds[0], status: 'PRESENT' }],
    });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('ATTENDANCE_VERSION_CONFLICT');
  });

  it('allows at most one concurrent writer for the same expected version', async () => {
    const path = `/api/v1/organizations/${organizationId}/classes/${classId}/attendance`;
    const command = (status: 'PRESENT' | 'SICK') => ({
      schoolDate: '2026-08-27',
      expectedVersion: '0:none',
      records: [{ studentId: rosterStudentIds[1], status }],
    });
    const responses = await Promise.all([
      put(path, command('PRESENT')),
      put(path, command('SICK')),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(
      await prisma.attendanceRecord.count({
        where: {
          organizationId,
          classId,
          studentId: rosterStudentIds[1],
          schoolDate: new Date('2026-08-27T00:00:00.000Z'),
        },
      }),
    ).toBe(1);
  });
});
