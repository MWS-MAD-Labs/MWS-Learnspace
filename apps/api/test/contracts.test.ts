import { describe, expect, it } from 'vitest';
import {
  attendanceBulkSaveCommandSchema,
  attendanceStatusSchema,
  gpkAssignmentEndCommandSchema,
  gpkAssignmentUpsertCommandSchema,
  schoolDateSchema,
  studentCreateCommandSchema,
  studentListItemSchema,
  studentUpdateCommandSchema,
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

  it('defines strict student mutation commands without actor fields', () => {
    const create = {
      studentNumber: 'S-001',
      fullName: 'Student One',
      gender: 'FEMALE',
      dateOfBirth: '2019-01-01',
      specialNeedsFlag: true,
    };
    expect(studentCreateCommandSchema.safeParse(create).success).toBe(true);
    expect(
      studentCreateCommandSchema.safeParse({ ...create, actorId: studentId })
        .success,
    ).toBe(false);
    expect(studentUpdateCommandSchema.safeParse({}).success).toBe(false);
    expect(
      studentUpdateCommandSchema.safeParse({
        fullName: 'Updated',
        actorId: studentId,
      }).success,
    ).toBe(false);
  });

  it('validates GPK assignment date ranges and rejects actor spoofing', () => {
    const command = {
      membershipId: '22222222-2222-4222-8222-222222222222',
      startsOn: '2026-08-24',
      endsOn: '2026-08-31',
    };
    expect(gpkAssignmentUpsertCommandSchema.safeParse(command).success).toBe(
      true,
    );
    expect(
      gpkAssignmentUpsertCommandSchema.safeParse({
        ...command,
        endsOn: '2026-08-23',
      }).success,
    ).toBe(false);
    expect(
      gpkAssignmentUpsertCommandSchema.safeParse({
        ...command,
        actorId: studentId,
      }).success,
    ).toBe(false);
    expect(
      gpkAssignmentEndCommandSchema.safeParse({ endsOn: '2026-02-30' }).success,
    ).toBe(false);
  });

  it('never permits guardian contact fields in broad student list items', () => {
    const broadItem = {
      id: studentId,
      organizationId: '22222222-2222-4222-8222-222222222222',
      studentNumber: 'S-001',
      fullName: 'Student One',
      nickname: null,
      avatarUrl: null,
      gender: 'UNSPECIFIED',
      dateOfBirth: '2019-01-01',
      specialNeedsFlag: false,
      status: 'ACTIVE',
      primaryClassification: null,
      currentPlacement: null,
      enrollments: [],
      activeEnrollment: null,
      activeGpkAssignment: null,
    };
    expect(studentListItemSchema.safeParse(broadItem).success).toBe(true);
    expect(
      studentListItemSchema.safeParse({
        ...broadItem,
        guardians: [],
        guardianPhone: 'not-allowed',
        address: 'not-allowed',
      }).success,
    ).toBe(false);
  });
});
