import { Prisma, type PrismaClient } from '@prisma/client';
import { GPK_ROLE_CONTEXT } from '../model/gpk-model.js';
import { permissionsOfMembership } from '../utils/authorization.js';
import type { CentralClassRow } from './central-academic-sync-service.js';

// What Central says about the students: the profile (with the ids of the class), the roster export for what the profile
// leaves out (birth date, address, parents), and who is assigned to support whom.
export type CentralStudentRow = {
  id: string;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  nick_name: string;
  email: string;
  gender: string;
  status: string;
  current_grade_id?: string;
  current_class_id?: string | null;
};

export type CentralRosterRow = {
  email: string;
  photo_url: string | null;
  birth_date: string;
  address: string | null;
  father_name: string | null;
  father_phone: string | null;
  father_email: string | null;
  mother_name: string | null;
  mother_phone: string | null;
  mother_email: string | null;
};

export type CentralSupportRow = {
  workforce_member: { email: string };
  student_id: string;
  role: string;
};

export interface StudentCentralClient {
  listAllStudents(params: { status: string }): Promise<CentralStudentRow[]>;
  listStudentRoster(params: { status: string }): Promise<CentralRosterRow[]>;
  listAllStudentSupportAssignments(): Promise<CentralSupportRow[]>;
  listAllClasses(): Promise<CentralClassRow[]>;
}

export type CentralStudentSyncMode = 'dry-run' | 'apply';

type SyncDatabase = Pick<
  PrismaClient,
  | 'student'
  | 'enrollment'
  | 'guardianContact'
  | 'schoolClass'
  | 'academicYear'
  | 'membership'
  | 'staffStudentAssignment'
>;

export interface CentralStudentSyncLock {
  runExclusive<T>(
    operation: (database: SyncDatabase) => Promise<T>,
  ): Promise<T | undefined>;
}

export type CentralStudentSyncReport = {
  mode: CentralStudentSyncMode;
  lockAcquired: boolean;
  counts: {
    studentsSeen: number;
    created: number;
    updated: number;
    adopted: number;
    // A student here has the same number and no Central id. It is linked only with --adopt.
    conflicts: number;
    // No roster row, so no birth date: the student cannot be made.
    withoutRosterRow: number;
    disabled: number;
    withoutClass: number;
    enrollmentsOpened: number;
    enrollmentsClosed: number;
    guardiansChanged: number;
    assignmentsOpened: number;
    assignmentsEnded: number;
  };
};

function emptyReport(mode: CentralStudentSyncMode): CentralStudentSyncReport {
  return {
    mode,
    lockAcquired: false,
    counts: {
      studentsSeen: 0,
      created: 0,
      updated: 0,
      adopted: 0,
      conflicts: 0,
      withoutRosterRow: 0,
      disabled: 0,
      withoutClass: 0,
      enrollmentsOpened: 0,
      enrollmentsClosed: 0,
      guardiansChanged: 0,
      assignmentsOpened: 0,
      assignmentsEnded: 0,
    },
  };
}

export function studentNumberOf(row: CentralStudentRow): string {
  return row.nis?.trim() || row.nisn?.trim() || `central-${row.id}`;
}

export function genderOf(value: string): 'MALE' | 'FEMALE' | 'UNSPECIFIED' {
  const gender = value.trim().toUpperCase();
  return gender === 'MALE' || gender === 'FEMALE' ? gender : 'UNSPECIFIED';
}

// The date of an ISO date and time, as the calendar day Central stored.
export function dayOf(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function today(): Date {
  return dayOf(new Date().toISOString());
}

const clean = (value: string | null | undefined) => value?.trim() || null;

export type GuardianPlan = {
  relationship: 'Father' | 'Mother';
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isPrimary: boolean;
};

// The parents of the roster row as contacts. The father is the primary contact, and the mother when there is no father.
export function guardiansOf(row: CentralRosterRow): GuardianPlan[] {
  const father = clean(row.father_name);
  const mother = clean(row.mother_name);
  const plans: GuardianPlan[] = [];
  if (father) {
    plans.push({
      relationship: 'Father',
      name: father,
      phone: clean(row.father_phone),
      email: clean(row.father_email),
      address: clean(row.address),
      isPrimary: true,
    });
  }
  if (mother) {
    plans.push({
      relationship: 'Mother',
      name: mother,
      phone: clean(row.mother_phone),
      email: clean(row.mother_email),
      address: father ? null : clean(row.address),
      isPrimary: !father,
    });
  }
  return plans;
}

export async function synchronizeCentralStudents(input: {
  lock: CentralStudentSyncLock;
  central: StudentCentralClient;
  localOrganizationId: string;
  mode: CentralStudentSyncMode;
  adopt?: boolean;
}): Promise<CentralStudentSyncReport> {
  const report = emptyReport(input.mode);
  const apply = input.mode === 'apply';
  const organizationId = input.localOrganizationId;
  const counts = report.counts;
  const result = await input.lock.runExclusive(async (database) => {
    report.lockAcquired = true;
    const [students, roster, support, classes] = await Promise.all([
      input.central.listAllStudents({ status: 'ACTIVE' }),
      input.central.listStudentRoster({ status: 'ACTIVE' }),
      input.central.listAllStudentSupportAssignments(),
      input.central.listAllClasses(),
    ]);
    counts.studentsSeen = students.length;
    const rosterByEmail = new Map(
      roster.map((row) => [row.email.trim().toLowerCase(), row]),
    );
    const specialEd = support.filter(
      (row) => row.role === 'SPECIAL_ED' && row.workforce_member.email.trim(),
    );
    const supported = new Set(specialEd.map((row) => row.student_id));
    const yearOfClass = new Map(
      classes.map((row) => [row.class_id, row.academic_year_id]),
    );

    const localClasses = new Map(
      (
        await database.schoolClass.findMany({
          where: { organizationId, centralId: { not: null } },
          select: { id: true, centralId: true },
        })
      ).map((row) => [row.centralId as string, row.id]),
    );
    const years = await database.academicYear.findMany({
      where: { organizationId, centralId: { not: null } },
      select: { id: true, centralId: true, startsOn: true },
    });
    const localYears = new Map(
      years.map((row) => [row.centralId as string, row]),
    );

    const existing = await database.student.findMany({
      where: { organizationId },
      select: {
        id: true,
        studentNumber: true,
        centralId: true,
        fullName: true,
        nickname: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        avatarUrl: true,
        specialNeedsFlag: true,
        status: true,
      },
    });
    const byCentral = new Map(
      existing
        .filter((row) => row.centralId)
        .map((row) => [row.centralId as string, row]),
    );
    const numbers = new Map(existing.map((row) => [row.studentNumber, row]));

    // Central id to the id of the student here. A planned student of a dry run has none.
    const localStudents = new Map<string, string>();
    const seen = new Set<string>();

    for (const row of students) {
      const rosterRow = rosterByEmail.get(row.email.trim().toLowerCase());
      if (!rosterRow) {
        counts.withoutRosterRow += 1;
        continue;
      }
      seen.add(row.id);
      const number = studentNumberOf(row);
      const data = {
        fullName: row.full_name.trim(),
        nickname: clean(row.nick_name),
        gender: genderOf(row.gender),
        dateOfBirth: dayOf(rosterRow.birth_date),
        address: clean(rosterRow.address),
        avatarUrl: clean(rosterRow.photo_url),
        specialNeedsFlag: supported.has(row.id),
        status: 'ACTIVE' as const,
      };
      let own = byCentral.get(row.id);
      if (!own) {
        const same = numbers.get(number);
        if (same && !same.centralId) {
          if (!input.adopt) {
            counts.conflicts += 1;
            continue;
          }
          counts.adopted += 1;
          if (apply) {
            await database.student.update({
              where: { id: same.id },
              data: { centralId: row.id },
            });
          }
          own = { ...same, centralId: row.id };
        }
      }
      let studentId: string | undefined = own?.id;
      if (own) {
        const changed =
          own.fullName !== data.fullName ||
          own.nickname !== data.nickname ||
          own.gender !== data.gender ||
          own.dateOfBirth.getTime() !== data.dateOfBirth.getTime() ||
          own.address !== data.address ||
          own.avatarUrl !== data.avatarUrl ||
          own.specialNeedsFlag !== data.specialNeedsFlag ||
          own.status !== data.status;
        if (changed) {
          counts.updated += 1;
          if (apply) {
            await database.student.update({ where: { id: own.id }, data });
          }
        }
      } else {
        counts.created += 1;
        if (apply) {
          const made = await database.student.create({
            data: {
              organizationId,
              centralId: row.id,
              studentNumber: number,
              ...data,
            },
          });
          studentId = made.id;
        }
      }
      if (studentId) localStudents.set(row.id, studentId);

      // Enrollment: the open one follows the current class of Central.
      const classCentralId = row.current_class_id ?? undefined;
      const classId = classCentralId
        ? localClasses.get(classCentralId)
        : undefined;
      const year = classCentralId
        ? localYears.get(yearOfClass.get(classCentralId) ?? '')
        : undefined;
      if (!classId || !year) counts.withoutClass += 1;
      const open = studentId
        ? await database.enrollment.findMany({
            where: { studentId, endsOn: null },
            select: { id: true, classId: true },
          })
        : [];
      const keep = classId
        ? open.find((item) => item.classId === classId)
        : undefined;
      for (const item of open) {
        if (item === keep) continue;
        counts.enrollmentsClosed += 1;
        if (apply) {
          await database.enrollment.update({
            where: { id: item.id },
            data: { endsOn: today() },
          });
        }
      }
      if (classId && year && !keep) {
        counts.enrollmentsOpened += 1;
        if (apply && studentId) {
          await database.enrollment.create({
            data: {
              organizationId,
              studentId,
              academicYearId: year.id,
              classId,
              startsOn: open.length ? today() : year.startsOn,
            },
          });
        }
      }

      // Parents as contacts: father and mother are Central's, other contacts stay as they are.
      if (studentId) {
        for (const plan of guardiansOf(rosterRow)) {
          const found = await database.guardianContact.findFirst({
            where: { studentId, relationship: plan.relationship },
          });
          const same =
            found &&
            found.name === plan.name &&
            found.phone === plan.phone &&
            found.email === plan.email &&
            found.address === plan.address &&
            found.isPrimary === plan.isPrimary;
          if (same) continue;
          counts.guardiansChanged += 1;
          if (!apply) continue;
          if (found) {
            await database.guardianContact.update({
              where: { id: found.id },
              data: {
                name: plan.name,
                phone: plan.phone,
                email: plan.email,
                address: plan.address,
                isPrimary: plan.isPrimary,
              },
            });
          } else {
            await database.guardianContact.create({
              data: { organizationId, studentId, ...plan },
            });
          }
        }
      }
    }

    // A student Central no longer lists as active is switched off here, with the open enrollment closed. Nothing is deleted.
    for (const row of existing) {
      if (!row.centralId || seen.has(row.centralId)) continue;
      if (row.status === 'DISABLED') continue;
      counts.disabled += 1;
      if (!apply) continue;
      await database.student.update({
        where: { id: row.id },
        data: { status: 'DISABLED' },
      });
      await database.enrollment.updateMany({
        where: { studentId: row.id, endsOn: null },
        data: { endsOn: today() },
      });
    }

    // Who supports whom: people whose role reaches only assigned students.
    const memberships = await database.membership.findMany({
      where: { organizationId, status: 'ACTIVE', user: { status: 'ACTIVE' } },
      select: {
        id: true,
        role: true,
        permissions: true,
        user: { select: { email: true } },
      },
    });
    const byEmail = new Map<string, string>();
    for (const membership of memberships) {
      const permissions = permissionsOfMembership(
        membership.role,
        membership.permissions,
      );
      if (permissions.includes('scope.assigned')) {
        byEmail.set(membership.user.email.trim().toLowerCase(), membership.id);
      }
    }
    const desired = new Set<string>();
    for (const row of specialEd) {
      const membershipId = byEmail.get(
        row.workforce_member.email.trim().toLowerCase(),
      );
      const studentId = localStudents.get(row.student_id);
      if (membershipId && studentId)
        desired.add(`${membershipId}|${studentId}`);
    }
    const now = today();
    const current = await database.staffStudentAssignment.findMany({
      where: {
        organizationId,
        roleContext: GPK_ROLE_CONTEXT,
        // Only students that come from Central: an assignment for a student made here is left alone.
        student: { centralId: { not: null } },
        membershipId: { in: [...byEmail.values()] },
        OR: [{ endsOn: null }, { endsOn: { gt: now } }],
      },
      select: { id: true, membershipId: true, studentId: true },
    });
    const have = new Set(
      current.map((row) => `${row.membershipId}|${row.studentId}`),
    );
    for (const row of current) {
      if (desired.has(`${row.membershipId}|${row.studentId}`)) continue;
      counts.assignmentsEnded += 1;
      if (apply) {
        await database.staffStudentAssignment.update({
          where: { id: row.id },
          data: { endsOn: now },
        });
      }
    }
    for (const key of desired) {
      if (have.has(key)) continue;
      const [membershipId, studentId] = key.split('|');
      counts.assignmentsOpened += 1;
      if (apply) {
        await database.staffStudentAssignment.create({
          data: {
            organizationId,
            membershipId,
            studentId,
            roleContext: GPK_ROLE_CONTEXT,
            startsOn: now,
          },
        });
      }
    }
    return report;
  });
  return result ?? report;
}

export function createPostgresCentralStudentSyncLock(
  prisma: PrismaClient,
): CentralStudentSyncLock {
  return {
    runExclusive: <T>(operation: (database: SyncDatabase) => Promise<T>) =>
      prisma.$transaction(
        async (transaction) => {
          const rows = await transaction.$queryRaw<Array<{ locked: boolean }>>(
            Prisma.sql`SELECT pg_try_advisory_xact_lock(hashtext('learnspace'), hashtext('central-student-sync')) AS locked`,
          );
          if (rows[0]?.locked !== true) return undefined;
          return operation(transaction);
        },
        { maxWait: 5_000, timeout: 30 * 60_000 },
      ),
  };
}
