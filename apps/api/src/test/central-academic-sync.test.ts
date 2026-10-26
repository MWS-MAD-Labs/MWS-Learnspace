import { describe, expect, it, vi } from 'vitest';
import {
  deriveScopes,
  freeCode,
  freePosition,
  planAcademicStructure,
  slugCode,
  subjectKey,
  type CentralAssignmentRow,
  type CentralClassRow,
} from '../service/central-academic-sync-service.js';
import { scheduleCentralSync } from '../service/central-sync-schedule-service.js';

const klass = (extra: Partial<CentralClassRow> = {}): CentralClassRow => ({
  class_id: 'c1',
  class_name: '1A',
  grade_id: 'g1',
  grade_name: 'Grade 1',
  additional_grade_ids: [],
  additional_grade_names: [],
  unit_id: 'u1',
  unit_name: 'Elementary',
  academic_year_id: 'y1',
  academic_year: '2026/2027',
  academic_year_start_date: '2026-07-13',
  academic_year_end_date: null,
  ...extra,
});

const assignment = (
  extra: Partial<CentralAssignmentRow> = {},
): CentralAssignmentRow => ({
  ...klass(),
  role: 'HOMEROOM',
  subject: null,
  workforce_member: { email: 'Teacher@Example.test' },
  ...extra,
});

describe('structure from Central', () => {
  it('collects years, units, grades, classes and subjects once, with an end for an open year', () => {
    const plan = planAcademicStructure(
      [
        klass(),
        klass({
          class_id: 'c2',
          class_name: '4-5',
          grade_id: 'g4',
          grade_name: 'Grade 4',
          additional_grade_ids: ['g5'],
          additional_grade_names: ['Grade 5'],
        }),
      ],
      [
        assignment({ role: 'SUBJECT_TEACHER', subject: '  Math ' }),
        assignment({ role: 'SUBJECT_TEACHER', subject: 'math' }),
      ],
    );
    expect(plan.years).toEqual([
      {
        centralId: 'y1',
        name: '2026/2027',
        startsOn: '2026-07-13',
        endsOn: '2027-07-12',
      },
    ]);
    expect(plan.units).toEqual([{ centralId: 'u1', name: 'Elementary' }]);
    expect(plan.grades.map((grade) => grade.centralId).sort()).toEqual([
      'g1',
      'g4',
      'g5',
    ]);
    expect(plan.classes.map((row) => row.centralId)).toEqual(['c1', 'c2']);
    expect(plan.subjects).toEqual([{ centralKey: 'math', name: 'Math' }]);
    expect(plan.rowsWithoutIds).toBe(0);
  });

  it('leaves out and counts a class from a Central that has no ids yet', () => {
    const old = klass({
      class_id: 'old',
      unit_id: undefined,
      grade_id: undefined,
    });
    const plan = planAcademicStructure([old, old], [assignment({ ...old })]);
    expect(plan.classes).toEqual([]);
    expect(plan.rowsWithoutIds).toBe(1);
  });

  it('makes codes and positions nobody has yet', () => {
    expect(slugCode('Grade 1 / Kelas Ä')).toBe('grade-1-kelas-a');
    expect(slugCode('???')).toBe('item');
    const used = new Set(['grade-1']);
    expect(freeCode('grade-1', used)).toBe('grade-1-2');
    expect(freeCode('grade-1', used)).toBe('grade-1-3');
    const positions = new Set([1, 2]);
    expect(freePosition('Grade 2', positions)).toBe(3);
    expect(freePosition('Kindergarten', positions)).toBe(4);
    expect(subjectKey('  Bahasa   Indonesia ')).toBe('bahasa indonesia');
  });
});

describe('scopes from the assignments', () => {
  it('gives a homeroom teacher the unit and grades of the class, a subject teacher the subject, by email', () => {
    const scopes = deriveScopes([
      assignment({
        additional_grade_ids: ['g2'],
        additional_grade_names: ['Grade 2'],
      }),
      assignment({
        role: 'SUPPORTING_HOMEROOM',
        class_id: 'c9',
        grade_id: 'g9',
        workforce_member: { email: 'teacher@example.test' },
      }),
      assignment({
        role: 'SUBJECT_TEACHER',
        subject: 'Science',
        workforce_member: { email: 'other@example.test' },
      }),
      assignment({ workforce_member: { email: ' ' } }),
    ]);
    const teacher = scopes.get('teacher@example.test')!;
    expect([...teacher.unitIds]).toEqual(['u1']);
    expect([...teacher.gradeIds].sort()).toEqual(['g1', 'g2', 'g9']);
    expect([...teacher.subjectKeys]).toEqual([]);
    expect([...scopes.get('other@example.test')!.subjectKeys]).toEqual([
      'science',
    ]);
    expect(scopes.size).toBe(2);
  });
});

describe('the schedule', () => {
  const logger = {
    fatal: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  };
  const config = (extra: object) =>
    ({
      sharedSessionMode: 'shared',
      centralSyncIntervalMinutes: 15,
      centralApiBaseUrl: 'http://central.test',
      centralApiToken: 'token',
      ...extra,
    }) as never;

  it('stays off unless the shared session is on and an interval is set', () => {
    expect(
      scheduleCentralSync(
        {} as never,
        config({ centralSyncIntervalMinutes: 0 }),
        logger,
      ),
    ).toBeUndefined();
    expect(
      scheduleCentralSync(
        {} as never,
        config({ sharedSessionMode: 'shadow' }),
        logger,
      ),
    ).toBeUndefined();
    expect(
      scheduleCentralSync(
        {} as never,
        config({ centralSyncIntervalMinutes: undefined }),
        logger,
      ),
    ).toBeUndefined();
  });

  it('runs once soon after start and then every interval, and a failure does not stop it', async () => {
    vi.useFakeTimers();
    try {
      const run = vi
        .fn()
        .mockRejectedValueOnce(new Error('Central down'))
        .mockResolvedValue({
          access: { counts: {} },
          academics: { counts: {} },
        });
      const handle = scheduleCentralSync({} as never, config({}), logger, run);
      expect(handle).toBeDefined();
      await vi.advanceTimersByTimeAsync(30_000);
      expect(run).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(15 * 60_000);
      expect(run).toHaveBeenCalledTimes(2);
      handle!.stop();
      await vi.advanceTimersByTimeAsync(60 * 60_000);
      expect(run).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
