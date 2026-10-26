import { Prisma, type PrismaClient } from '@prisma/client';
import { permissionsOfMembership } from '../utils/authorization.js';

// What Central says about the classes of the school and who teaches them. The ids are newer than the first Central that
// answered this, so every one of them can be missing.
export type CentralClassRow = {
  class_id: string;
  class_name: string;
  grade_id?: string;
  grade_name: string;
  additional_grade_ids?: string[];
  additional_grade_names: string[];
  unit_id?: string | null;
  unit_name: string | null;
  academic_year_id: string;
  academic_year: string;
  academic_year_start_date: string;
  academic_year_end_date: string | null;
};

export type CentralAssignmentRow = CentralClassRow & {
  role: 'HOMEROOM' | 'SUPPORTING_HOMEROOM' | 'SUBJECT_TEACHER';
  subject: string | null;
  workforce_member: { email: string };
};

export interface AcademicCentralClient {
  listAllClasses(): Promise<CentralClassRow[]>;
  listAllClassTeacherAssignments(): Promise<CentralAssignmentRow[]>;
}

export type CentralAcademicSyncMode = 'dry-run' | 'apply';

type SyncDatabase = Pick<
  PrismaClient,
  | 'academicYear'
  | 'unit'
  | 'grade'
  | 'schoolClass'
  | 'subject'
  | 'membership'
  | 'membershipUnit'
  | 'membershipGrade'
  | 'membershipSubject'
>;

export interface CentralAcademicSyncLock {
  runExclusive<T>(
    operation: (database: SyncDatabase) => Promise<T>,
  ): Promise<T | undefined>;
}

export type CentralAcademicSyncReport = {
  mode: CentralAcademicSyncMode;
  lockAcquired: boolean;
  counts: {
    classesSeen: number;
    rowsWithoutIds: number;
    created: number;
    renamed: number;
    adopted: number;
    // A row here has the same name and no Central id. It is linked only with --adopt, so it is left alone.
    conflicts: number;
    scopesUpdated: number;
    withoutAssignments: number;
    unchanged: number;
  };
};

function emptyReport(mode: CentralAcademicSyncMode): CentralAcademicSyncReport {
  return {
    mode,
    lockAcquired: false,
    counts: {
      classesSeen: 0,
      rowsWithoutIds: 0,
      created: 0,
      renamed: 0,
      adopted: 0,
      conflicts: 0,
      scopesUpdated: 0,
      withoutAssignments: 0,
      unchanged: 0,
    },
  };
}

export function subjectKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function tidy(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function slugCode(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || 'item';
}

// A code nobody uses yet in the organization: the name as a slug, then -2, -3 and so on.
export function freeCode(base: string, used: Set<string>): string {
  let code = base;
  for (let n = 2; used.has(code); n += 1) code = `${base}-${n}`;
  used.add(code);
  return code;
}

// Grades of a unit are ordered by a number only one grade can have. The number in the name when it is free, else the next.
export function freePosition(name: string, used: Set<number>): number {
  const digits = name.match(/\d+/);
  let position = digits ? Number(digits[0]) : Math.max(0, ...used) + 1;
  while (used.has(position)) position += 1;
  used.add(position);
  return position;
}

// A year Central has not ended yet still needs an end here: one year after it started.
function yearAfter(date: string): string {
  const end = new Date(date);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}

export type AcademicPlan = {
  years: {
    centralId: string;
    name: string;
    startsOn: string;
    endsOn: string;
  }[];
  units: { centralId: string; name: string }[];
  grades: { centralId: string; name: string; unitCentralId: string }[];
  classes: {
    centralId: string;
    name: string;
    unitCentralId: string;
    gradeCentralId: string;
    yearCentralId: string;
  }[];
  subjects: { centralKey: string; name: string }[];
  rowsWithoutIds: number;
};

// The structure the classes and assignments of Central describe. A row with no ids cannot be matched later, so it is
// left out and counted.
export function planAcademicStructure(
  classes: readonly CentralClassRow[],
  assignments: readonly CentralAssignmentRow[],
): AcademicPlan {
  const plan: AcademicPlan = {
    years: [],
    units: [],
    grades: [],
    classes: [],
    subjects: [],
    rowsWithoutIds: 0,
  };
  const years = new Map<string, AcademicPlan['years'][number]>();
  const units = new Map<string, AcademicPlan['units'][number]>();
  const grades = new Map<string, AcademicPlan['grades'][number]>();
  const classMap = new Map<string, AcademicPlan['classes'][number]>();
  const subjects = new Map<string, AcademicPlan['subjects'][number]>();
  const seen = new Set<string>();

  for (const row of [...classes, ...assignments]) {
    if (!row.unit_id || !row.unit_name || !row.grade_id) {
      if (!seen.has(`missing:${row.class_id}`)) plan.rowsWithoutIds += 1;
      seen.add(`missing:${row.class_id}`);
      continue;
    }
    years.set(row.academic_year_id, {
      centralId: row.academic_year_id,
      name: tidy(row.academic_year),
      startsOn: row.academic_year_start_date,
      endsOn:
        row.academic_year_end_date ?? yearAfter(row.academic_year_start_date),
    });
    units.set(row.unit_id, {
      centralId: row.unit_id,
      name: tidy(row.unit_name),
    });
    grades.set(row.grade_id, {
      centralId: row.grade_id,
      name: tidy(row.grade_name),
      unitCentralId: row.unit_id,
    });
    (row.additional_grade_ids ?? []).forEach((id, index) => {
      const name = row.additional_grade_names[index];
      if (name) {
        grades.set(id, {
          centralId: id,
          name: tidy(name),
          unitCentralId: row.unit_id as string,
        });
      }
    });
    classMap.set(row.class_id, {
      centralId: row.class_id,
      name: tidy(row.class_name),
      unitCentralId: row.unit_id,
      gradeCentralId: row.grade_id,
      yearCentralId: row.academic_year_id,
    });
  }
  for (const row of assignments) {
    if (
      row.role === 'SUBJECT_TEACHER' &&
      row.subject?.trim() &&
      !subjects.has(subjectKey(row.subject))
    ) {
      subjects.set(subjectKey(row.subject), {
        centralKey: subjectKey(row.subject),
        name: tidy(row.subject),
      });
    }
  }
  plan.years = [...years.values()];
  plan.units = [...units.values()];
  plan.grades = [...grades.values()];
  plan.classes = [...classMap.values()];
  plan.subjects = [...subjects.values()];
  return plan;
}

export type DerivedScopes = {
  unitIds: Set<string>;
  gradeIds: Set<string>;
  subjectKeys: Set<string>;
};

// Who teaches what, by email: a homeroom or supporting homeroom teacher reaches the unit and grades of the class, a
// subject teacher reaches the subject. The ids are the ones of Central.
export function deriveScopes(
  assignments: readonly CentralAssignmentRow[],
): Map<string, DerivedScopes> {
  const byEmail = new Map<string, DerivedScopes>();
  for (const row of assignments) {
    const email = row.workforce_member.email.trim().toLowerCase();
    if (!email) continue;
    const scopes = byEmail.get(email) ?? {
      unitIds: new Set<string>(),
      gradeIds: new Set<string>(),
      subjectKeys: new Set<string>(),
    };
    byEmail.set(email, scopes);
    if (row.role === 'SUBJECT_TEACHER') {
      if (row.subject?.trim()) scopes.subjectKeys.add(subjectKey(row.subject));
    } else if (row.unit_id && row.grade_id) {
      scopes.unitIds.add(row.unit_id);
      scopes.gradeIds.add(row.grade_id);
      (row.additional_grade_ids ?? []).forEach((id) => scopes.gradeIds.add(id));
    }
  }
  return byEmail;
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((value) => b.has(value));
}

export async function synchronizeCentralAcademics(input: {
  lock: CentralAcademicSyncLock;
  central: AcademicCentralClient;
  localOrganizationId: string;
  mode: CentralAcademicSyncMode;
  adopt?: boolean;
}): Promise<CentralAcademicSyncReport> {
  const report = emptyReport(input.mode);
  const apply = input.mode === 'apply';
  const organizationId = input.localOrganizationId;
  const result = await input.lock.runExclusive(async (database) => {
    report.lockAcquired = true;
    const [classes, assignments] = await Promise.all([
      input.central.listAllClasses(),
      input.central.listAllClassTeacherAssignments(),
    ]);
    report.counts.classesSeen = classes.length;
    const plan = planAcademicStructure(classes, assignments);
    report.counts.rowsWithoutIds = plan.rowsWithoutIds;

    // Central id to the id of the row here. A planned row of a dry run gets a stand-in.
    const unitIds = new Map<string, string>();
    const gradeIds = new Map<string, string>();
    const subjectIds = new Map<string, string>();

    const created = () => {
      report.counts.created += 1;
    };

    // Academic years.
    const years = await database.academicYear.findMany({
      where: { organizationId },
      select: { id: true, name: true, centralId: true },
    });
    for (const row of plan.years) {
      const own = years.find((year) => year.centralId === row.centralId);
      if (own) {
        if (own.name !== row.name) {
          report.counts.renamed += 1;
          if (apply) {
            await database.academicYear.update({
              where: { id: own.id },
              data: { name: row.name },
            });
          }
        }
        continue;
      }
      const same = input.adopt
        ? years.find((year) => !year.centralId && year.name === row.name)
        : undefined;
      if (same) {
        report.counts.adopted += 1;
        if (apply) {
          await database.academicYear.update({
            where: { id: same.id },
            data: { centralId: row.centralId },
          });
        }
        continue;
      }
      if (years.some((year) => year.name === row.name)) {
        report.counts.conflicts += 1;
        continue;
      }
      created();
      if (apply) {
        await database.academicYear.create({
          data: {
            organizationId,
            centralId: row.centralId,
            name: row.name,
            startsOn: new Date(row.startsOn),
            endsOn: new Date(row.endsOn),
          },
        });
      }
    }

    // Units.
    const units = await database.unit.findMany({
      where: { organizationId },
      select: { id: true, name: true, code: true, centralId: true },
    });
    const unitCodes = new Set(units.map((unit) => unit.code));
    for (const row of plan.units) {
      const own = units.find((unit) => unit.centralId === row.centralId);
      const same =
        !own && input.adopt
          ? units.find(
              (unit) =>
                !unit.centralId &&
                unit.name.toLowerCase() === row.name.toLowerCase(),
            )
          : undefined;
      if (own || same) {
        const target = (own ?? same)!;
        if (same) report.counts.adopted += 1;
        if (own && own.name !== row.name) report.counts.renamed += 1;
        if (apply && (same || own?.name !== row.name)) {
          await database.unit.update({
            where: { id: target.id },
            data: {
              ...(same ? { centralId: row.centralId } : {}),
              ...(own ? { name: row.name } : {}),
            },
          });
        }
        unitIds.set(row.centralId, target.id);
        continue;
      }
      if (
        units.some((unit) => unit.name.toLowerCase() === row.name.toLowerCase())
      ) {
        report.counts.conflicts += 1;
        continue;
      }
      created();
      if (apply) {
        const made = await database.unit.create({
          data: {
            organizationId,
            centralId: row.centralId,
            name: row.name,
            code: freeCode(slugCode(row.name), unitCodes),
          },
        });
        unitIds.set(row.centralId, made.id);
      } else {
        unitIds.set(row.centralId, `new:${row.centralId}`);
      }
    }

    // Grades.
    const grades = await database.grade.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        code: true,
        unitId: true,
        position: true,
        centralId: true,
      },
    });
    const gradeCodes = new Set(grades.map((grade) => grade.code));
    const positions = new Map<string, Set<number>>();
    for (const grade of grades) {
      const set = positions.get(grade.unitId) ?? new Set<number>();
      set.add(grade.position);
      positions.set(grade.unitId, set);
    }
    for (const row of plan.grades) {
      const unitId = unitIds.get(row.unitCentralId);
      if (!unitId) continue;
      const own = grades.find((grade) => grade.centralId === row.centralId);
      const same =
        !own && input.adopt
          ? grades.find(
              (grade) =>
                !grade.centralId &&
                grade.unitId === unitId &&
                grade.name.toLowerCase() === row.name.toLowerCase(),
            )
          : undefined;
      if (own || same) {
        const target = (own ?? same)!;
        if (same) report.counts.adopted += 1;
        if (own && own.name !== row.name) report.counts.renamed += 1;
        if (apply && (same || own?.name !== row.name)) {
          await database.grade.update({
            where: { id: target.id },
            data: {
              ...(same ? { centralId: row.centralId } : {}),
              ...(own ? { name: row.name } : {}),
            },
          });
        }
        gradeIds.set(row.centralId, target.id);
        continue;
      }
      created();
      if (apply) {
        const used = positions.get(unitId) ?? new Set<number>();
        positions.set(unitId, used);
        const made = await database.grade.create({
          data: {
            organizationId,
            unitId,
            centralId: row.centralId,
            name: row.name,
            code: freeCode(slugCode(row.name), gradeCodes),
            position: freePosition(row.name, used),
          },
        });
        gradeIds.set(row.centralId, made.id);
      } else {
        gradeIds.set(row.centralId, `new:${row.centralId}`);
      }
    }

    // Classes.
    const classRows = await database.schoolClass.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        code: true,
        gradeId: true,
        centralId: true,
      },
    });
    const classCodes = new Set(classRows.map((row) => row.code));
    for (const row of plan.classes) {
      const unitId = unitIds.get(row.unitCentralId);
      const gradeId = gradeIds.get(row.gradeCentralId);
      if (!unitId || !gradeId) continue;
      const own = classRows.find((item) => item.centralId === row.centralId);
      const same =
        !own && input.adopt
          ? classRows.find(
              (item) =>
                !item.centralId &&
                item.gradeId === gradeId &&
                item.name.toLowerCase() === row.name.toLowerCase(),
            )
          : undefined;
      if (own || same) {
        if (same) report.counts.adopted += 1;
        if (own && own.name !== row.name) report.counts.renamed += 1;
        if (apply && (same || own?.name !== row.name)) {
          await database.schoolClass.update({
            where: { id: (own ?? same)!.id },
            data: {
              ...(same ? { centralId: row.centralId } : {}),
              ...(own ? { name: row.name } : {}),
            },
          });
        }
        continue;
      }
      if (
        classRows.some(
          (item) =>
            item.gradeId === gradeId &&
            item.name.toLowerCase() === row.name.toLowerCase(),
        )
      ) {
        report.counts.conflicts += 1;
        continue;
      }
      created();
      if (apply) {
        await database.schoolClass.create({
          data: {
            organizationId,
            unitId,
            gradeId,
            centralId: row.centralId,
            name: row.name,
            code: freeCode(slugCode(row.name), classCodes),
          },
        });
      }
    }

    // Subjects.
    const subjects = await database.subject.findMany({
      where: { organizationId },
      select: { id: true, name: true, code: true, centralKey: true },
    });
    const subjectCodes = new Set(subjects.map((subject) => subject.code));
    for (const row of plan.subjects) {
      const own = subjects.find(
        (subject) => subject.centralKey === row.centralKey,
      );
      const same =
        !own && input.adopt
          ? subjects.find(
              (subject) =>
                !subject.centralKey &&
                subjectKey(subject.name) === row.centralKey,
            )
          : undefined;
      if (own || same) {
        if (same) {
          report.counts.adopted += 1;
          if (apply) {
            await database.subject.update({
              where: { id: same.id },
              data: { centralKey: row.centralKey },
            });
          }
        }
        subjectIds.set(row.centralKey, (own ?? same)!.id);
        continue;
      }
      if (
        subjects.some((subject) => subjectKey(subject.name) === row.centralKey)
      ) {
        report.counts.conflicts += 1;
        continue;
      }
      created();
      if (apply) {
        const made = await database.subject.create({
          data: {
            organizationId,
            centralKey: row.centralKey,
            name: row.name,
            code: freeCode(slugCode(row.name), subjectCodes),
          },
        });
        subjectIds.set(row.centralKey, made.id);
      } else {
        subjectIds.set(row.centralKey, `new:${row.centralKey}`);
      }
    }

    // Scopes of the people who reach rows by grade or by subject.
    const derived = deriveScopes(assignments);
    const memberships = await database.membership.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        user: { status: 'ACTIVE' },
      },
      select: {
        id: true,
        role: true,
        permissions: true,
        user: { select: { email: true } },
        unitScopes: { select: { unitId: true } },
        gradeScopes: { select: { gradeId: true } },
        subjectScopes: { select: { subjectId: true } },
      },
    });
    for (const membership of memberships) {
      const permissions = permissionsOfMembership(
        membership.role,
        membership.permissions,
      );
      const byGrade = permissions.includes('scope.grade');
      const bySubject = permissions.includes('scope.subject');
      if (!byGrade && !bySubject) continue;
      const mine = derived.get(membership.user.email.trim().toLowerCase());
      const wantUnits = new Set<string>();
      const wantGrades = new Set<string>();
      const wantSubjects = new Set<string>();
      if (byGrade) {
        for (const id of mine?.unitIds ?? []) {
          const local = unitIds.get(id);
          if (local) wantUnits.add(local);
        }
        for (const id of mine?.gradeIds ?? []) {
          const local = gradeIds.get(id);
          if (local) wantGrades.add(local);
        }
      }
      if (bySubject) {
        for (const key of mine?.subjectKeys ?? []) {
          const local = subjectIds.get(key);
          if (local) wantSubjects.add(local);
        }
      }
      if (wantUnits.size + wantGrades.size + wantSubjects.size === 0) {
        report.counts.withoutAssignments += 1;
      }
      const haveUnits = new Set(membership.unitScopes.map((s) => s.unitId));
      const haveGrades = new Set(membership.gradeScopes.map((s) => s.gradeId));
      const haveSubjects = new Set(
        membership.subjectScopes.map((s) => s.subjectId),
      );
      if (
        sameSet(haveUnits, wantUnits) &&
        sameSet(haveGrades, wantGrades) &&
        sameSet(haveSubjects, wantSubjects)
      ) {
        report.counts.unchanged += 1;
        continue;
      }
      report.counts.scopesUpdated += 1;
      if (!apply) continue;
      await database.membershipUnit.deleteMany({
        where: { membershipId: membership.id },
      });
      await database.membershipGrade.deleteMany({
        where: { membershipId: membership.id },
      });
      await database.membershipSubject.deleteMany({
        where: { membershipId: membership.id },
      });
      if (wantUnits.size) {
        await database.membershipUnit.createMany({
          data: [...wantUnits].map((unitId) => ({
            membershipId: membership.id,
            unitId,
          })),
        });
      }
      if (wantGrades.size) {
        await database.membershipGrade.createMany({
          data: [...wantGrades].map((gradeId) => ({
            membershipId: membership.id,
            gradeId,
          })),
        });
      }
      if (wantSubjects.size) {
        await database.membershipSubject.createMany({
          data: [...wantSubjects].map((subjectId) => ({
            membershipId: membership.id,
            subjectId,
          })),
        });
      }
    }
    return report;
  });
  return result ?? report;
}

export function createPostgresCentralAcademicSyncLock(
  prisma: PrismaClient,
): CentralAcademicSyncLock {
  return {
    runExclusive: <T>(operation: (database: SyncDatabase) => Promise<T>) =>
      prisma.$transaction(
        async (transaction) => {
          const rows = await transaction.$queryRaw<Array<{ locked: boolean }>>(
            Prisma.sql`SELECT pg_try_advisory_xact_lock(hashtext('learnspace'), hashtext('central-academic-sync')) AS locked`,
          );
          if (rows[0]?.locked !== true) return undefined;
          return operation(transaction);
        },
        { maxWait: 5_000, timeout: 30 * 60_000 },
      ),
  };
}
