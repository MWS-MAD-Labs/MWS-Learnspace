import { describe, expect, it } from 'vitest';
import {
  attendanceBulkSaveCommandSchema,
  attendanceStatusSchema,
  schoolDateSchema,
} from '@learnspace/contracts';

const studentId = '11111111-1111-4111-8111-111111111111';

describe('resource contracts', () => {
  it('uses the canonical Prisma attendance statuses', () => {
    expect(attendanceStatusSchema.options).toEqual([
      'PRESENT',
      'LATE',
      'SICK',
      'EXCUSED_ABSENCE',
      'UNEXCUSED_ABSENCE',
    ]);
  });

  it('validates strict calendar dates', () => {
    expect(schoolDateSchema.safeParse('2026-08-24').success).toBe(true);
    expect(schoolDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(schoolDateSchema.safeParse('').success).toBe(false);
  });

  it('rejects duplicate students, invalid late minutes, and actor spoofing', () => {
    expect(
      attendanceBulkSaveCommandSchema.safeParse({
        schoolDate: '2026-08-24',
        expectedVersion: '0:none',
        records: [
          { studentId, status: 'PRESENT' },
          { studentId, status: 'SICK' },
        ],
      }).success,
    ).toBe(false);
    expect(
      attendanceBulkSaveCommandSchema.safeParse({
        schoolDate: '2026-08-24',
        expectedVersion: '0:none',
        records: [{ studentId, status: 'LATE', minutesLate: 0 }],
      }).success,
    ).toBe(false);
    expect(
      attendanceBulkSaveCommandSchema.safeParse({
        schoolDate: '2026-08-24',
        expectedVersion: '0:none',
        actorId: '22222222-2222-4222-8222-222222222222',
        records: [{ studentId, status: 'PRESENT' }],
      }).success,
    ).toBe(false);
  });
});
