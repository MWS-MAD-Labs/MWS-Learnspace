import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createPostgresCentralAcademicSyncLock,
  synchronizeCentralAcademics,
  type CentralAssignmentRow,
  type CentralClassRow,
} from '../../service/central-academic-sync-service.js';

const databaseUrl = process.env.DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

const klass = (extra: Partial<CentralClassRow> = {}): CentralClassRow => ({
  class_id: 'cls-1',
  class_name: '1A',
  grade_id: 'grd-1',
  grade_name: 'Grade 1',
  additional_grade_ids: [],
  additional_grade_names: [],
  unit_id: 'unt-1',
  unit_name: 'Elementary',
  academic_year_id: 'yr-1',
  academic_year: '2026/2027',
  academic_year_start_date: '2026-07-13',
  academic_year_end_date: '2027-06-30',
  ...extra,
});
const assignment = (
  email: string,
  extra: Partial<CentralAssignmentRow> = {},
): CentralAssignmentRow => ({
  ...klass(),
  role: 'HOMEROOM',
  subject: null,
  workforce_member: { email },
  ...extra,
});

let prisma: PrismaClient;
let organizationId: string;
let suffix: string;
const emails = () => ({
  lead: `lead-${suffix}@example.test`,
  subject: `subject-${suffix}@example.test`,
  director: `director-${suffix}@example.test`,
  nobody: `nobody-${suffix}@example.test`,
});

function central(classes: CentralClassRow[], rows: CentralAssignmentRow[]) {
  return {
    listAllClasses: async () => classes,
    listAllClassTeacherAssignments: async () => rows,
  };
}

async function run(
  classes: CentralClassRow[],
  rows: CentralAssignmentRow[],
  extra: { mode?: 'dry-run' | 'apply'; adopt?: boolean } = {},
) {
  return synchronizeCentralAcademics({
    lock: createPostgresCentralAcademicSyncLock(prisma),
    central: central(classes, rows),
    localOrganizationId: organizationId,
    mode: extra.mode ?? 'apply',
    adopt: extra.adopt,
  });
}

integration('Central academic synchronization', () => {
  beforeAll(async () => {
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    suffix = randomUUID();
    organizationId = (
      await prisma.organization.create({
        data: { slug: `academic-sync-${suffix}`, name: 'Academic Sync School' },
      })
    ).id;
    const make = async (
      email: string,
      role: string,
      permissions: string[],
      name: string,
    ) => {
      const user = await prisma.user.create({
        data: { email, displayName: name },
      });
      await prisma.membership.create({
        data: { organizationId, userId: user.id, role, permissions },
      });
    };
    const e = emails();
    await make(e.lead, 'Class Lead', ['scope.grade'], 'Class Lead');
    await make(e.subject, 'Subject Lead', ['scope.subject'], 'Subject Lead');
    await make(e.director, 'Head', ['scope.organization'], 'Head');
    await make(e.nobody, 'Class Lead', ['scope.grade'], 'Nobody');
  });

  afterAll(async () => {
    await prisma.organization.delete({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  const scopesOf = async (email: string) => {
    const membership = await prisma.membership.findFirstOrThrow({
      where: { organizationId, user: { email } },
      include: {
        unitScopes: true,
        gradeScopes: true,
        subjectScopes: true,
      },
    });
    return membership;
  };

  it('writes nothing in a dry run, and says what it would do', async () => {
    const e = emails();
    const report = await run([klass()], [assignment(e.lead.toUpperCase())], {
      mode: 'dry-run',
    });
    expect(report.counts.created).toBeGreaterThan(0);
    expect(report.counts.scopesUpdated).toBe(1);
    expect(await prisma.unit.count({ where: { organizationId } })).toBe(0);
  });

  it('makes the structure and the scopes, leaves other roles alone, and repeats without change', async () => {
    const e = emails();
    const classes = [klass()];
    const rows = [
      assignment(e.lead),
      assignment(e.subject, { role: 'SUBJECT_TEACHER', subject: 'Math' }),
      // A role without scope.grade or scope.subject is not touched, whoever teaches.
      assignment(e.director),
    ];
    const first = await run(classes, rows);
    expect(first.counts).toMatchObject({
      created: 5,
      scopesUpdated: 2,
      withoutAssignments: 1,
      rowsWithoutIds: 0,
    });
    const unit = await prisma.unit.findFirstOrThrow({
      where: { organizationId, centralId: 'unt-1' },
    });
    const grade = await prisma.grade.findFirstOrThrow({
      where: { organizationId, centralId: 'grd-1' },
    });
    expect(unit).toMatchObject({ name: 'Elementary', code: 'elementary' });
    expect(grade).toMatchObject({ unitId: unit.id, position: 1 });
    expect(
      await prisma.schoolClass.count({
        where: { organizationId, centralId: 'cls-1', gradeId: grade.id },
      }),
    ).toBe(1);
    const year = await prisma.academicYear.findFirstOrThrow({
      where: { organizationId, centralId: 'yr-1' },
    });
    expect(year.name).toBe('2026/2027');

    const lead = await scopesOf(e.lead);
    expect(lead.unitScopes.map((s) => s.unitId)).toEqual([unit.id]);
    expect(lead.gradeScopes.map((s) => s.gradeId)).toEqual([grade.id]);
    expect(lead.subjectScopes).toEqual([]);
    const subject = await scopesOf(e.subject);
    expect(subject.subjectScopes).toHaveLength(1);
    expect(subject.unitScopes).toEqual([]);
    const director = await scopesOf(e.director);
    expect(director.unitScopes).toEqual([]);
    expect((await scopesOf(e.nobody)).gradeScopes).toEqual([]);

    const again = await run(classes, rows);
    expect(again.counts).toMatchObject({
      created: 0,
      renamed: 0,
      scopesUpdated: 0,
    });
  });

  it('follows a rename and a move, and never deletes what Central stops listing', async () => {
    const e = emails();
    const classes = [
      klass({ class_name: '1A Renamed', unit_name: 'Primary School' }),
      klass({
        class_id: 'cls-2',
        class_name: '2A',
        grade_id: 'grd-2',
        grade_name: 'Grade 2',
      }),
    ];
    const report = await run(classes, [
      assignment(e.lead, {
        class_id: 'cls-2',
        class_name: '2A',
        grade_id: 'grd-2',
        grade_name: 'Grade 2',
        unit_name: 'Primary School',
      }),
    ]);
    expect(report.counts.renamed).toBe(2);
    expect(report.counts.created).toBe(2);
    expect(
      (
        await prisma.unit.findFirstOrThrow({
          where: { organizationId, centralId: 'unt-1' },
        })
      ).name,
    ).toBe('Primary School');
    // The lead now teaches grade 2 only. The subject teacher has no assignment left and keeps nothing.
    const lead = await scopesOf(e.lead);
    expect(lead.gradeScopes).toHaveLength(1);
    expect(
      (
        await prisma.grade.findFirstOrThrow({
          where: { id: lead.gradeScopes[0].gradeId },
        })
      ).centralId,
    ).toBe('grd-2');
    expect((await scopesOf(e.subject)).subjectScopes).toEqual([]);
    // Nothing was removed although a first class vanished from the lists.
    await run([], []);
    expect(await prisma.schoolClass.count({ where: { organizationId } })).toBe(
      2,
    );
  });

  it('links an existing row by name only when asked to', async () => {
    const adoptedOrganization = await prisma.organization.create({
      data: { slug: `academic-adopt-${suffix}`, name: 'Adopt School' },
    });
    try {
      const unit = await prisma.unit.create({
        data: {
          organizationId: adoptedOrganization.id,
          code: 'primary',
          name: 'Elementary',
        },
      });
      const args = {
        lock: createPostgresCentralAcademicSyncLock(prisma),
        central: central([klass()], []),
        localOrganizationId: adoptedOrganization.id,
        mode: 'apply' as const,
      };
      // Without --adopt the row of the same name is a conflict: it is left alone, and nothing under it is made.
      const without = await synchronizeCentralAcademics(args);
      expect(without.counts).toMatchObject({ adopted: 0, conflicts: 1 });
      expect(
        await prisma.unit.count({
          where: { organizationId: adoptedOrganization.id },
        }),
      ).toBe(1);
      expect(
        await prisma.grade.count({
          where: { organizationId: adoptedOrganization.id },
        }),
      ).toBe(0);
      const adopted = await synchronizeCentralAcademics({
        ...args,
        adopt: true,
      });
      expect(adopted.counts.adopted).toBe(1);
      expect(
        (await prisma.unit.findUniqueOrThrow({ where: { id: unit.id } }))
          .centralId,
      ).toBe('unt-1');
    } finally {
      await prisma.organization.delete({
        where: { id: adoptedOrganization.id },
      });
    }
  });
});
