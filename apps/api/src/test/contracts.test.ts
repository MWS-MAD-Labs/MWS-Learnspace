import { describe, expect, it } from 'vitest';
import {
  attendanceBulkSaveCommandSchema,
  attendanceStatusSchema,
  gpkAssignmentEndCommandSchema,
  gpkAssignmentUpsertCommandSchema,
  organizationAccountCreateCommandSchema,
  organizationAccountUpdateCommandSchema,
  organizationSettingsUpdateCommandSchema,
  learningJourneyCreateCommandSchema,
  learningJourneyDirectorReviewCommandSchema,
  learningJourneyListQuerySchema,
  learningJourneyPrincipalReviewCommandSchema,
  learningJourneySubmitCommandSchema,
  learningJourneyUpdateCommandSchema,
  schoolDateSchema,
  studentCreateCommandSchema,
  studentListItemSchema,
  studentUpdateCommandSchema,
  weeklyReportCreateCommandSchema,
  weeklyReportDateRange,
  weeklyReportListQuerySchema,
  weeklyReportUpdateCommandSchema,
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

  it('validates organization IANA timezone updates', () => {
    expect(
      organizationSettingsUpdateCommandSchema.safeParse({
        timezone: 'America/Los_Angeles',
      }).success,
    ).toBe(true);
    expect(
      organizationSettingsUpdateCommandSchema.safeParse({
        timezone: 'Not/A_Timezone',
      }).success,
    ).toBe(false);
  });

  it('enforces ISO weekly-report keys and Monday-Friday ranges', () => {
    const dates = weeklyReportDateRange(2020, 53);
    const base = {
      studentId,
      iepId: '22222222-2222-4222-8222-222222222222',
      year: 2026,
      weekNumber: 34,
      weekStart: '2026-08-17',
      weekEnd: '2026-08-21',
      descriptiveObservation: 'Observation',
      homeConnection: 'Home connection',
      goalProgress: [],
    };
    expect(dates).toMatchObject({
      start: '2020-12-28',
      end: '2021-01-01',
    });
    expect(weeklyReportCreateCommandSchema.safeParse(base).success).toBe(true);
    expect(
      weeklyReportUpdateCommandSchema.safeParse({
        expectedVersion: 1,
        ...base,
      }).success,
    ).toBe(true);

    for (const invalid of [
      { ...base, year: 2025 },
      { ...base, weekNumber: 33 },
      { ...base, weekStart: '2026-08-18' },
      { ...base, weekEnd: '2026-08-22' },
    ]) {
      expect(weeklyReportCreateCommandSchema.safeParse(invalid).success).toBe(
        false,
      );
    }

    const yearBoundary = {
      ...base,
      year: 2020,
      weekNumber: 53,
      weekStart: '2020-12-28',
      weekEnd: '2021-01-01',
    };
    expect(
      weeklyReportCreateCommandSchema.safeParse(yearBoundary).success,
    ).toBe(true);
    expect(() => weeklyReportDateRange(2021, 53)).toThrow(
      'between 1 and 52 for ISO year 2021',
    );
    expect(
      weeklyReportListQuerySchema.safeParse({ year: 2021, weekNumber: 53 })
        .success,
    ).toBe(false);
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

  it('defines strict organization account commands with explicit role scopes', () => {
    expect(
      organizationAccountCreateCommandSchema.safeParse({
        email: 'teacher@example.test',
        displayName: 'Teacher One',
        role: 'GRADE_TEACHER',
        unitIds: ['22222222-2222-4222-8222-222222222222'],
        gradeIds: [],
        subjectIds: [],
      }).success,
    ).toBe(true);
    expect(organizationAccountUpdateCommandSchema.safeParse({}).success).toBe(
      false,
    );
    expect(
      organizationAccountUpdateCommandSchema.safeParse({
        role: 'PRINCIPAL',
        actorId: studentId,
      }).success,
    ).toBe(false);
  });

  it('defines strict learning journey filters and mutation commands', () => {
    const command = {
      title: 'Inquiry Journey',
      academicYearId: studentId,
      semesterId: '22222222-2222-4222-8222-222222222222',
      unitId: '33333333-3333-4333-8333-333333333333',
      gradeId: '44444444-4444-4444-8444-444444444444',
      subjectId: '55555555-5555-4555-8555-555555555555',
      ownerMembershipIds: ['66666666-6666-4666-8666-666666666666'],
      projects: [
        {
          title: 'Project One',
          description: 'Explore a question.',
          startsOn: '2026-08-01',
          endsOn: '2026-08-31',
          position: 0,
          goals: [{ description: 'Learn one thing.', position: 0 }],
          connections: [
            {
              subject: 'Science',
              description: 'Observe patterns.',
              position: 0,
            },
          ],
        },
      ],
    };
    expect(learningJourneyCreateCommandSchema.safeParse(command).success).toBe(
      true,
    );
    expect(
      learningJourneyUpdateCommandSchema.safeParse({
        ...command,
        expectedVersion: 3,
      }).success,
    ).toBe(true);
    for (const forbiddenField of [
      'organizationId',
      'createdById',
      'updatedById',
      'actorId',
      'state',
    ]) {
      expect(
        learningJourneyCreateCommandSchema.safeParse({
          ...command,
          [forbiddenField]: studentId,
        }).success,
      ).toBe(false);
    }
    expect(
      learningJourneyUpdateCommandSchema.safeParse({ ...command }).success,
    ).toBe(false);
    expect(
      learningJourneyCreateCommandSchema.safeParse({
        ...command,
        projects: [
          command.projects[0],
          { ...command.projects[0], title: 'Duplicate position' },
        ],
      }).success,
    ).toBe(false);
    expect(
      learningJourneyListQuerySchema.safeParse({
        projectStartsOnOrAfter: '2026-09-01',
        projectEndsOnOrBefore: '2026-08-01',
      }).success,
    ).toBe(false);
  });

  it('defines strict versioned learning journey workflow commands', () => {
    expect(
      learningJourneySubmitCommandSchema.safeParse({ expectedVersion: 4 })
        .success,
    ).toBe(true);
    expect(learningJourneySubmitCommandSchema.safeParse({}).success).toBe(
      false,
    );
    expect(
      learningJourneyPrincipalReviewCommandSchema.safeParse({
        expectedVersion: 4,
        decision: 'APPROVE',
      }).success,
    ).toBe(true);
    expect(
      learningJourneyDirectorReviewCommandSchema.safeParse({
        expectedVersion: 5,
        decision: 'RETURN',
        comment: 'Please revise the assessment milestones.',
      }).success,
    ).toBe(true);
    expect(
      learningJourneyPrincipalReviewCommandSchema.safeParse({
        expectedVersion: 4,
        decision: 'RETURN',
      }).success,
    ).toBe(false);

    for (const schema of [
      learningJourneySubmitCommandSchema,
      learningJourneyPrincipalReviewCommandSchema,
      learningJourneyDirectorReviewCommandSchema,
    ]) {
      const valid =
        schema === learningJourneySubmitCommandSchema
          ? { expectedVersion: 4 }
          : { expectedVersion: 4, decision: 'APPROVE' };
      for (const forbiddenField of [
        'actorId',
        'organizationId',
        'currentState',
        'sourceState',
        'state',
        'targetState',
      ]) {
        expect(
          schema.safeParse({ ...valid, [forbiddenField]: studentId }).success,
        ).toBe(false);
      }
    }
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
