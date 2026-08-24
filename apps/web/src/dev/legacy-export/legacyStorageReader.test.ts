import { describe, expect, it } from 'vitest';
import {
  SEED_ALL_FEDC_OBSERVATIONS,
  SEED_ALL_SENSORY_PROFILES,
  SEED_IEP_RECORDS,
  SEED_LEARNING_JOURNEYS,
  SEED_OBSERVATION_ASSIGNMENTS,
  SEED_OBSERVATION_FORMS,
  SEED_SFA_OBSERVATION,
  SEED_STUDENTS,
  SEED_USERS,
  SEED_WEEKLY_REPORTS,
} from '../../data/seedData';
import {
  LEGACY_STORAGE_KEYS,
  LegacyExportError,
  buildLegacyExport,
} from './legacyStorageReader';

const seedStorage = () => {
  const values = {
    users: SEED_USERS,
    students: SEED_STUDENTS,
    learningJourneys: SEED_LEARNING_JOURNEYS,
    fedcObservations: SEED_ALL_FEDC_OBSERVATIONS,
    sensoryProfileObservations: SEED_ALL_SENSORY_PROFILES,
    sfaObservations: [SEED_SFA_OBSERVATION],
    ieps: SEED_IEP_RECORDS,
    weeklyReports: SEED_WEEKLY_REPORTS,
    observationAssignments: SEED_OBSERVATION_ASSIGNMENTS,
    observationDefinitions: SEED_OBSERVATION_FORMS,
  };
  for (const [name, value] of Object.entries(values)) {
    localStorage.setItem(
      LEGACY_STORAGE_KEYS[name as keyof typeof values],
      JSON.stringify(value),
    );
  }
  localStorage.setItem(LEGACY_STORAGE_KEYS.currentUserId, SEED_USERS[0].id);
};

describe('buildLegacyExport', () => {
  it('creates a validated version 1 export from current seed storage', () => {
    seedStorage();

    const result = buildLegacyExport(localStorage, {
      applicationVersion: '0.2.0',
      exportedAt: '2026-08-24T12:00:00.000Z',
    });

    expect(result.format).toBe('learnspace-export');
    expect(result.version).toBe(1);
    expect(result.records.students).toHaveLength(SEED_STUDENTS.length);
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
      JSON.stringify([
        { ...SEED_STUDENTS[0], assignedGPKTeacherId: 'missing-user' },
      ]),
    );

    expect(() =>
      buildLegacyExport(localStorage, { applicationVersion: '0.2.0' }),
    ).toThrowError(/validation errors/);
  });
});
