import {
  LEARNSPACE_EXPORT_LIMITS,
  learnspaceExportSchema,
  learnspaceExportV1Schema,
  type LearnspaceExportV1,
} from '@learnspace/contracts';
import { describe, expect, it } from 'vitest';

const validExport = (): LearnspaceExportV1 => ({
  format: 'learnspace-export' as const,
  version: 1 as const,
  exportedAt: '2026-08-24T12:00:00.000Z',
  source: {
    application: 'learnspace-web' as const,
    applicationVersion: '0.2.0',
    storageVersion: 2 as const,
  },
  organization: {
    sourceKey: 'test',
    targetOrganizationId: null,
    academicYears: [],
    semesters: [],
    units: [],
    grades: [],
    classes: [],
    subjects: [],
  },
  records: {
    users: [
      {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'SPECIALIST' as const,
        unitIds: [],
        gradeIds: [],
        subjectIds: [],
        permissions: [],
      },
    ],
    students: [
      {
        id: 'student-1',
        studentNumber: 'S001',
        fullName: 'Student One',
        gender: 'Unspecified' as const,
        dateOfBirth: '2015-01-01',
        grade: 'Grade 1',
        className: '1-A',
        unit: 'Elementary',
        specialNeedsFlag: false,
        active: true,
      },
    ],
    learningJourneys: [],
    observationDefinitions: [],
    observationAssignments: [],
    fedcObservations: [],
    sensoryProfileObservations: [],
    sfaObservations: [],
    ieps: [],
    weeklyReports: [],
  },
});

describe('learnspace export format', () => {
  it('accepts a valid version 1 document', () => {
    expect(learnspaceExportSchema.parse(validExport()).version).toBe(1);
  });

  it('returns an actionable unsupported-version error', () => {
    const result = learnspaceExportSchema.safeParse({
      ...validExport(),
      version: 2,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({ path: ['version'] });
      expect(result.error.issues[0].message).toContain('Supported versions: 1');
    }
  });

  it('rejects duplicate IDs and dangling references', () => {
    const input = validExport();
    input.records.students.push({
      ...input.records.students[0],
      fullName: 'Duplicate',
    });
    input.records.observationAssignments.push({
      id: 'assignment-1',
      studentId: 'missing-student',
      instrumentType: 'FEDC',
      assignedToUserId: 'missing-user',
      dueDate: '2026-09-01',
      status: 'PENDING',
    });

    const result = learnspaceExportV1Schema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(({ message }) => message)).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Duplicate students source ID'),
          expect.stringContaining('Unknown student source ID'),
          expect.stringContaining('Unknown user source ID'),
        ]),
      );
    }
  });

  it('rejects missing or invalid required observation totals with precise paths', () => {
    const input = validExport() as unknown as Record<string, unknown>;
    const records = (input.records as Record<string, unknown[]>) ?? {};
    records.fedcObservations = [
      {
        id: 'fedc-1',
        studentId: 'student-1',
        observerId: 'user-1',
        observationType: 'FEDC',
        observationDate: '2026-08-24',
        status: 'Completed',
        createdAt: '2026-08-24T10:00:00.000Z',
        updatedAt: '2026-08-24T11:00:00.000Z',
        maxPossibleScore: 100,
      },
    ];
    records.sensoryProfileObservations = [
      {
        id: 'sensory-1',
        studentId: 'student-1',
        observerId: 'user-1',
        observationType: 'SENSORY_PROFILE',
        observationDate: '2026-08-24',
        status: 'Completed',
        createdAt: '2026-08-24T10:00:00.000Z',
        updatedAt: '2026-08-24T11:00:00.000Z',
        totalRawScore: 1.5,
      },
    ];
    records.sfaObservations = [
      {
        id: 'sfa-1',
        studentId: 'student-1',
        observerId: 'user-1',
        observationType: 'SFA',
        assessmentDate: '2026-08-24',
        status: 'Completed',
        createdAt: '2026-08-24T10:00:00.000Z',
        updatedAt: '2026-08-24T11:00:00.000Z',
        participationAverage: Number.NaN,
      },
    ];

    const result = learnspaceExportV1Schema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(({ path }) => path)).toEqual(
        expect.arrayContaining([
          ['records', 'fedcObservations', 0, 'totalScore'],
          ['records', 'sensoryProfileObservations', 0, 'totalRawScore'],
          ['records', 'sfaObservations', 0, 'participationAverage'],
        ]),
      );
    }
  });

  it('rejects a non-numeric weekly report year with a precise path', () => {
    const input = validExport() as unknown as Record<string, unknown>;
    const records = input.records as Record<string, unknown[]>;
    records.ieps = [
      {
        id: 'iep-1',
        studentId: 'student-1',
        createdBy: 'user-1',
        updatedBy: 'user-1',
        createdAt: '2026-08-24T10:00:00.000Z',
        updatedAt: '2026-08-24T11:00:00.000Z',
        goals: [{ id: 'goal-1' }],
      },
    ];
    records.weeklyReports = [
      {
        id: 'report-1',
        studentId: 'student-1',
        iepId: 'iep-1',
        teacherId: 'user-1',
        year: 'FY25',
        weekNumber: 1,
        weekStart: '2026-08-24',
        weekEnd: '2026-08-28',
        createdAt: '2026-08-24T10:00:00.000Z',
        updatedAt: '2026-08-24T11:00:00.000Z',
        goalProgress: [{ goalId: 'goal-1', addressedThisWeek: true }],
      },
    ];

    const result = learnspaceExportV1Schema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['records', 'weeklyReports', 0, 'year'],
            message: 'Expected a four-digit year.',
          }),
        ]),
      );
    }
  });

  it('rejects oversized collections', () => {
    const input = validExport();
    input.records.users = Array.from(
      { length: LEARNSPACE_EXPORT_LIMITS.recordsPerCollection + 1 },
      (_, index) => ({ ...input.records.users[0], id: `user-${index}` }),
    );

    expect(learnspaceExportV1Schema.safeParse(input).success).toBe(false);
  });
});
