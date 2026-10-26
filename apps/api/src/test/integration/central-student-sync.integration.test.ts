import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createPostgresCentralAcademicSyncLock,
  synchronizeCentralAcademics,
  type CentralClassRow,
} from '../../service/central-academic-sync-service.js';
import {
  createPostgresCentralStudentSyncLock,
  synchronizeCentralStudents,
  type CentralRosterRow,
  type CentralStudentRow,
  type CentralSupportRow,
} from '../../service/central-student-sync-service.js';

const databaseUrl = process.env.DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

const classRow = (
  id: string,
  name: string,
  gradeId: string,
): CentralClassRow => ({
  class_id: id,
  class_name: name,
  grade_id: gradeId,
  grade_name: `Grade ${name}`,
  additional_grade_ids: [],
  additional_grade_names: [],
  unit_id: 'unt-1',
  unit_name: 'Elementary',
  academic_year_id: 'yr-1',
  academic_year: '2026/2027',
  academic_year_start_date: '2026-07-13',
  academic_year_end_date: '2027-06-30',
});

let prisma: PrismaClient;
let organizationId: string;
let suffix: string;
let classes: CentralClassRow[];
const mail = (name: string) =>
  `${name}-${randomUUID().slice(0, 8)}@example.test`;
let ayu: string;
let gpk: string;
let plainTeacher: string;

const student = (
  extra: Partial<CentralStudentRow> = {},
): CentralStudentRow => ({
  id: 'stu-ayu',
  nis: `N${suffix.slice(0, 6)}`,
  nisn: null,
  full_name: 'Ayu',
  nick_name: 'Ayu',
  email: ayu,
  gender: 'FEMALE',
  status: 'ACTIVE',
  current_grade_id: 'grd-1',
  current_class_id: 'cls-1',
  ...extra,
});
const rosterOf = (
  row: CentralStudentRow,
  extra: Partial<CentralRosterRow> = {},
): CentralRosterRow => ({
  email: row.email,
  photo_url: null,
  birth_date: '2015-03-04T00:00:00.000Z',
  address: 'Jl. Mawar 1',
  father_name: 'Budi',
  father_phone: '0811',
  father_email: null,
  mother_name: null,
  mother_phone: null,
  mother_email: null,
  ...extra,
});

function central(
  students: CentralStudentRow[],
  rosters: CentralRosterRow[],
  support: CentralSupportRow[],
) {
  return {
    listAllStudents: async () => students,
    listStudentRoster: async () => rosters,
    listAllStudentSupportAssignments: async () => support,
    listAllClasses: async () => classes,
  };
}

function run(
  students: CentralStudentRow[],
  rosters: CentralRosterRow[],
  support: CentralSupportRow[],
  extra: { mode?: 'dry-run' | 'apply'; adopt?: boolean } = {},
) {
  return synchronizeCentralStudents({
    lock: createPostgresCentralStudentSyncLock(prisma),
    central: central(students, rosters, support),
    localOrganizationId: organizationId,
    mode: extra.mode ?? 'apply',
    adopt: extra.adopt,
  });
}

integration('Central student synchronization', () => {
  beforeAll(async () => {
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    suffix = randomUUID();
    ayu = mail('ayu');
    gpk = mail('gpk');
    plainTeacher = mail('teacher');
    organizationId = (
      await prisma.organization.create({
        data: { slug: `student-sync-${suffix}`, name: 'Student Sync School' },
      })
    ).id;
    const make = async (email: string, role: string, permissions: string[]) => {
      const user = await prisma.user.create({
        data: { email, displayName: email },
      });
      await prisma.membership.create({
        data: { organizationId, userId: user.id, role, permissions },
      });
    };
    await make(gpk, 'Support Teacher', ['scope.assigned']);
    await make(plainTeacher, 'Class Lead', ['scope.grade']);
    classes = [
      classRow('cls-1', '1A', 'grd-1'),
      classRow('cls-2', '2A', 'grd-2'),
    ];
    await synchronizeCentralAcademics({
      lock: createPostgresCentralAcademicSyncLock(prisma),
      central: {
        listAllClasses: async () => classes,
        listAllClassTeacherAssignments: async () => [],
      },
      localOrganizationId: organizationId,
      mode: 'apply',
    });
  });

  afterAll(async () => {
    await prisma.organization.delete({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  const find = (centralId: string) =>
    prisma.student.findFirstOrThrow({
      where: { organizationId, centralId },
      include: {
        enrollments: {
          orderBy: { startsOn: 'asc' },
          include: { schoolClass: true },
        },
        guardians: true,
        staffAssignments: true,
      },
    });

  it('makes the student with the birth date, enrollment, parent and special needs from the support assignment', async () => {
    const row = student();
    const support: CentralSupportRow[] = [
      {
        workforce_member: { email: gpk.toUpperCase() },
        student_id: 'stu-ayu',
        role: 'SPECIAL_ED',
      },
      // A person whose role does not reach assigned students gets no assignment.
      {
        workforce_member: { email: plainTeacher },
        student_id: 'stu-ayu',
        role: 'SPECIAL_ED',
      },
    ];
    const dry = await run([row], [rosterOf(row)], support, { mode: 'dry-run' });
    expect(dry.counts).toMatchObject({ created: 1, enrollmentsOpened: 1 });
    expect(await prisma.student.count({ where: { organizationId } })).toBe(0);

    const report = await run([row], [rosterOf(row)], support);
    expect(report.counts).toMatchObject({
      created: 1,
      enrollmentsOpened: 1,
      guardiansChanged: 1,
      assignmentsOpened: 1,
      withoutRosterRow: 0,
    });
    const saved = await find('stu-ayu');
    expect(saved).toMatchObject({
      fullName: 'Ayu',
      gender: 'FEMALE',
      specialNeedsFlag: true,
      status: 'ACTIVE',
      address: 'Jl. Mawar 1',
    });
    expect(saved.dateOfBirth.toISOString().slice(0, 10)).toBe('2015-03-04');
    expect(saved.enrollments).toHaveLength(1);
    expect(saved.enrollments[0].schoolClass.name).toBe('1A');
    expect(saved.enrollments[0].startsOn.toISOString().slice(0, 10)).toBe(
      '2026-07-13',
    );
    expect(saved.guardians).toMatchObject([
      { relationship: 'Father', name: 'Budi', isPrimary: true },
    ]);
    expect(saved.staffAssignments).toHaveLength(1);
    expect(saved.staffAssignments[0]).toMatchObject({
      roleContext: 'GPK',
      endsOn: null,
    });

    const again = await run([row], [rosterOf(row)], support);
    expect(again.counts).toMatchObject({
      created: 0,
      updated: 0,
      enrollmentsOpened: 0,
      enrollmentsClosed: 0,
      guardiansChanged: 0,
      assignmentsOpened: 0,
      assignmentsEnded: 0,
    });
  });

  it('follows a class change, a lost support assignment, and a student that leaves, and deletes nothing', async () => {
    const moved = student({
      current_class_id: 'cls-2',
      current_grade_id: 'grd-2',
    });
    const report = await run([moved], [rosterOf(moved)], []);
    expect(report.counts).toMatchObject({
      enrollmentsClosed: 1,
      enrollmentsOpened: 1,
      assignmentsEnded: 1,
    });
    const saved = await find('stu-ayu');
    expect(saved.specialNeedsFlag).toBe(false);
    expect(saved.enrollments).toHaveLength(2);
    expect(
      saved.enrollments.filter((item) => item.endsOn === null),
    ).toHaveLength(1);
    expect(
      saved.enrollments.find((item) => item.endsOn === null)?.schoolClass.name,
    ).toBe('2A');
    expect(saved.staffAssignments[0].endsOn).not.toBeNull();

    const left = await run([], [], []);
    expect(left.counts.disabled).toBe(1);
    const gone = await find('stu-ayu');
    expect(gone.status).toBe('DISABLED');
    expect(gone.enrollments.every((item) => item.endsOn !== null)).toBe(true);
  });

  it('skips a student with no roster row, and leaves a student of the same number alone unless asked to adopt', async () => {
    const lone = student({
      id: 'stu-lone',
      email: mail('lone'),
      nis: 'LONE-1',
    });
    const none = await run([lone], [], []);
    expect(none.counts).toMatchObject({ withoutRosterRow: 1, created: 0 });

    const local = await prisma.student.create({
      data: {
        organizationId,
        studentNumber: 'LONE-1',
        fullName: 'Local Lone',
        dateOfBirth: new Date('2014-01-01'),
      },
    });
    const conflict = await run([lone], [rosterOf(lone)], []);
    expect(conflict.counts).toMatchObject({
      conflicts: 1,
      created: 0,
      adopted: 0,
    });
    expect(
      (await prisma.student.findUniqueOrThrow({ where: { id: local.id } }))
        .centralId,
    ).toBeNull();

    const adopted = await run([lone], [rosterOf(lone)], [], { adopt: true });
    expect(adopted.counts.adopted).toBe(1);
    const linked = await prisma.student.findUniqueOrThrow({
      where: { id: local.id },
    });
    expect(linked).toMatchObject({
      centralId: 'stu-lone',
      fullName: lone.full_name,
    });
  });

  it('leaves an assignment for a student made here alone', async () => {
    const local = await prisma.student.create({
      data: {
        organizationId,
        studentNumber: `LOCAL-${suffix.slice(0, 6)}`,
        fullName: 'Made Here',
        dateOfBirth: new Date('2014-02-02'),
      },
    });
    const membership = await prisma.membership.findFirstOrThrow({
      where: { organizationId, user: { email: gpk } },
    });
    await prisma.staffStudentAssignment.create({
      data: {
        organizationId,
        membershipId: membership.id,
        studentId: local.id,
        roleContext: 'GPK',
        startsOn: new Date('2026-07-13'),
      },
    });
    await run([], [], []);
    const kept = await prisma.staffStudentAssignment.findFirstOrThrow({
      where: { studentId: local.id },
    });
    expect(kept.endsOn).toBeNull();
  });
});
