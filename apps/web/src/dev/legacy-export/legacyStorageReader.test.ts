import { describe, expect, it } from 'vitest';
import {
  LEGACY_STORAGE_KEYS,
  LegacyExportError,
  buildLegacyExport,
} from './legacyStorageReader';

const user = {
  id: 'user-1',
  name: 'Legacy Coordinator',
  email: 'coordinator@example.test',
  role: 'SPECIAL_ED_COORDINATOR',
  unitIds: ['Elementary'],
  gradeIds: ['Grade 1'],
  subjectIds: [],
  permissions: ['VIEW_ALL'],
};
const student = {
  id: 'student-1',
  studentNumber: 'LEGACY-001',
  fullName: 'Legacy Student',
  gender: 'Unspecified',
  dateOfBirth: '2018-01-01',
  grade: 'Grade 1',
  className: '1-A',
  unit: 'Elementary',
  specialNeedsFlag: true,
  active: true,
  assignedGPKTeacherId: user.id,
};

const seedStorage = () => {
  const values = {
    users: [user],
    students: [student],
    learningJourneys: [],
    fedcObservations: [],
    sensoryProfileObservations: [],
    sfaObservations: [],
    ieps: [],
    weeklyReports: [],
    observationAssignments: [],
    observationDefinitions: [],
  };
  for (const [name, value] of Object.entries(values)) {
    localStorage.setItem(
      LEGACY_STORAGE_KEYS[name as keyof typeof values],
      JSON.stringify(value),
    );
  }
  localStorage.setItem(LEGACY_STORAGE_KEYS.currentUserId, user.id);
};

describe('buildLegacyExport', () => {
  it('creates a validated version 1 export from legacy browser storage', () => {
    seedStorage();

    const result = buildLegacyExport(localStorage, {
      applicationVersion: '0.2.0',
      exportedAt: '2026-08-24T12:00:00.000Z',
    });

    expect(result.format).toBe('learnspace-export');
    expect(result.version).toBe(1);
    expect(result.records.students).toHaveLength(1);
    expect(result.organization.units).toContain('Elementary');
    expect(result.organization.targetOrganizationId).toBeNull();
  });

  it('does not hide malformed JSON behind seed fallbacks', () => {
    seedStorage();
    localStorage.setItem(LEGACY_STORAGE_KEYS.ieps, '{broken');

    expect(() =>
      buildLegacyExport(localStorage, { applicationVersion: '0.2.0' }),
    ).toThrowError(
      new LegacyExportError(
        `Legacy storage key "${LEGACY_STORAGE_KEYS.ieps}" contains malformed JSON.`,
      ),
    );
  });

  it('rejects dangling source references', () => {
    seedStorage();
    localStorage.setItem(
      LEGACY_STORAGE_KEYS.students,
      JSON.stringify([{ ...student, assignedGPKTeacherId: 'missing-user' }]),
    );

    expect(() =>
      buildLegacyExport(localStorage, { applicationVersion: '0.2.0' }),
    ).toThrowError(/validation errors/);
  });
});
