import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import {
  buildLegacyExport,
  LEGACY_STORAGE_KEYS,
} from '../apps/web/src/dev/legacy-export/legacyStorageReader.js';
import {
  REHEARSAL_FEDC_OBSERVATIONS,
  REHEARSAL_IEPS,
  REHEARSAL_LEARNING_JOURNEYS,
  REHEARSAL_OBSERVATION_ASSIGNMENTS,
  REHEARSAL_OBSERVATION_DEFINITIONS,
  REHEARSAL_SENSORY_PROFILE_OBSERVATIONS,
  REHEARSAL_SFA_OBSERVATIONS,
  REHEARSAL_STUDENTS,
  REHEARSAL_USERS,
  REHEARSAL_WEEKLY_REPORTS,
} from './fixtures/localImportRehearsalData.js';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const code = (prefix: string, value: string) =>
  `${prefix}_${value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')}`.slice(0, 80);
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  const outputDirectory = process.argv[2] ?? 'test-results/import-rehearsal';
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const organizationId =
      process.env.IMPORT_REHEARSAL_ORGANIZATION_ID ?? randomUUID();
    const organization = await prisma.organization.create({
      data: {
        id: organizationId,
        slug: `local-import-${organizationId.slice(-6)}`,
        name: 'Local Prototype Import Rehearsal',
      },
    });

    const userMappings: Record<
      string,
      { targetUserId: string; targetMembershipId: string }
    > = {};
    for (const source of REHEARSAL_USERS) {
      const user = await prisma.user.create({
        data: {
          email: `local.${source.id}.${organization.id}@example.test`,
          displayName: source.name,
        },
      });
      const membership = await prisma.membership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: source.role,
          roleTitle: source.roleTitle,
        },
      });
      userMappings[source.id] = {
        targetUserId: user.id,
        targetMembershipId: membership.id,
      };
    }

    const academicYearNames = [
      ...new Set([
        ...REHEARSAL_LEARNING_JOURNEYS.map(({ academicYear }) => academicYear),
        ...REHEARSAL_IEPS.map(({ academicYear }) => academicYear),
      ]),
    ];
    const academicYears: Record<string, string> = {};
    const semesters: Record<string, string> = {};
    for (const name of academicYearNames) {
      const [startYear, endYear] = name.split('-').map(Number);
      const academicYear = await prisma.academicYear.create({
        data: {
          organizationId: organization.id,
          name,
          startsOn: date(`${startYear}-07-01`),
          endsOn: date(`${endYear}-06-30`),
        },
      });
      academicYears[name] = academicYear.id;
      for (const [position, semesterName, startsOn, endsOn] of [
        [1, 'Semester 1', `${startYear}-07-01`, `${startYear}-12-31`],
        [2, 'Semester 2', `${endYear}-01-01`, `${endYear}-06-30`],
      ] as const) {
        const semester = await prisma.semester.create({
          data: {
            organizationId: organization.id,
            academicYearId: academicYear.id,
            name: semesterName,
            position,
            startsOn: date(startsOn),
            endsOn: date(endsOn),
          },
        });
        semesters[`${name}::${semesterName}`] = semester.id;
      }
    }

    const units: Record<string, string> = {};
    for (const name of [
      ...new Set([
        ...REHEARSAL_STUDENTS.map(({ unit }) => unit),
        ...REHEARSAL_LEARNING_JOURNEYS.map(({ unit }) => unit),
        ...REHEARSAL_IEPS.map(({ unit }) => unit),
      ]),
    ]) {
      const unit = await prisma.unit.create({
        data: {
          organizationId: organization.id,
          code: code('UNIT', name),
          name,
        },
      });
      units[name] = unit.id;
    }

    const gradeUnit = new Map<string, string>();
    for (const student of REHEARSAL_STUDENTS)
      gradeUnit.set(student.grade, student.unit);
    for (const journey of REHEARSAL_LEARNING_JOURNEYS)
      gradeUnit.set(journey.grade, journey.unit);
    const grades: Record<string, string> = {};
    let position = 1;
    for (const [name, unitName] of gradeUnit) {
      const grade = await prisma.grade.create({
        data: {
          organizationId: organization.id,
          unitId: units[unitName],
          code: code('GRADE', name),
          name,
          position: position++,
        },
      });
      grades[name] = grade.id;
    }

    const classes: Record<string, string> = {};
    for (const student of REHEARSAL_STUDENTS) {
      if (classes[student.className]) continue;
      const schoolClass = await prisma.schoolClass.create({
        data: {
          organizationId: organization.id,
          unitId: units[student.unit],
          gradeId: grades[student.grade],
          code: code('CLASS', student.className),
          name: student.className,
        },
      });
      classes[student.className] = schoolClass.id;
    }

    const subjects: Record<string, string> = {};
    for (const name of [
      ...new Set(REHEARSAL_LEARNING_JOURNEYS.map(({ subject }) => subject)),
    ]) {
      const subject = await prisma.subject.create({
        data: {
          organizationId: organization.id,
          code: code('SUBJECT', name),
          name,
        },
      });
      subjects[name] = subject.id;
    }

    const storage = new MemoryStorage();
    const values = {
      users: REHEARSAL_USERS,
      students: REHEARSAL_STUDENTS,
      learningJourneys: REHEARSAL_LEARNING_JOURNEYS,
      fedcObservations: REHEARSAL_FEDC_OBSERVATIONS,
      sensoryProfileObservations: REHEARSAL_SENSORY_PROFILE_OBSERVATIONS,
      sfaObservations: REHEARSAL_SFA_OBSERVATIONS,
      ieps: REHEARSAL_IEPS,
      weeklyReports: REHEARSAL_WEEKLY_REPORTS,
      observationAssignments: REHEARSAL_OBSERVATION_ASSIGNMENTS,
      observationDefinitions: REHEARSAL_OBSERVATION_DEFINITIONS,
    };
    for (const [name, value] of Object.entries(values)) {
      storage.setItem(
        LEGACY_STORAGE_KEYS[name as keyof typeof values],
        JSON.stringify(value),
      );
    }
    storage.setItem(LEGACY_STORAGE_KEYS.currentUserId, REHEARSAL_USERS[0].id);
    const exportDocument = buildLegacyExport(storage, {
      applicationVersion: '0.2.0-local-rehearsal',
      targetOrganizationId: organization.id,
    });
    const manifest = {
      targetOrganizationId: organization.id,
      sourceKey: exportDocument.organization.sourceKey,
      operatorUserId: userMappings[REHEARSAL_USERS[0].id].targetUserId,
      enrollmentAcademicYear: academicYearNames[0],
      users: userMappings,
      academicYears,
      semesters,
      units,
      grades,
      classes,
      subjects,
    };

    await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
    await Promise.all([
      writeFile(
        `${outputDirectory}/learnspace-export-v1-SENSITIVE.json`,
        `${JSON.stringify(exportDocument, null, 2)}\n`,
        { mode: 0o600 },
      ),
      writeFile(
        `${outputDirectory}/import-manifest-SENSITIVE.json`,
        `${JSON.stringify(manifest, null, 2)}\n`,
        { mode: 0o600 },
      ),
      writeFile(
        `${outputDirectory}/organization-id.txt`,
        `${organization.id}\n`,
        { mode: 0o600 },
      ),
    ]);
    console.log(
      JSON.stringify(
        { outputDirectory, organizationId: organization.id },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Preparation failed.');
  process.exitCode = 1;
});
