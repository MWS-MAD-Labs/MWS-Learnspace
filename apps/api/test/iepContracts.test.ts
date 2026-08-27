import { describe, expect, it } from 'vitest';
import {
  iepCreateCommandSchema,
  iepReviewCommandSchema,
  iepUpdateCommandSchema,
  iepWorkflowCommandSchema,
} from '@learnspace/contracts';

const ids = {
  student: '11111111-1111-4111-8111-111111111111',
  year: '22222222-2222-4222-8222-222222222222',
  semester: '33333333-3333-4333-8333-333333333333',
  actor: '44444444-4444-4444-8444-444444444444',
};

function command() {
  return {
    studentId: ids.student,
    academicYearId: ids.year,
    semesterId: ids.semester,
    consideration: 'The student requires an individualized plan.',
    primaryClassification: 'Learning support',
    currentPlacement: 'Inclusive classroom',
    homePartnershipSupport: null,
    homePartnershipRecommendations: null,
    progressMeasurementMethods: ['Weekly work samples'],
    parentCommunicationMethods: ['Monthly conference'],
    parentApproved: true,
    parentName: 'Parent One',
    parentApprovalDate: '2026-08-15',
    startsOn: '2026-08-01',
    endsOn: '2026-12-31',
    teamMembers: [
      {
        role: 'Parent',
        name: 'Parent One',
        initials: 'PO',
        confirmed: true,
        position: 0,
      },
    ],
    performanceAreas: [
      {
        name: 'Literacy',
        category: 'Academic',
        strengths: 'Engages with stories.',
        needs: 'Needs decoding support.',
        assessmentDate: '2026-08-10',
        position: 0,
      },
    ],
    accommodations: [
      {
        category: 'ACADEMIC' as const,
        subject: 'English',
        code: 'A-1',
        description: 'Extended time.',
        position: 0,
      },
    ],
    goals: [
      {
        code: 'G-1',
        performanceArea: 'Literacy',
        measurableGoal: 'Read a grade-level passage with 90% accuracy.',
        evaluationMethod: 'Curriculum-based measurement',
        schedule: 'Weekly',
        targetDate: '2026-12-15',
        position: 0,
      },
    ],
    services: [
      {
        serviceName: 'Specialized literacy instruction',
        type: 'INDIVIDUAL' as const,
        duration: '30 minutes',
        frequency: 'Three times weekly',
        location: 'Learning support room',
        days: 'Monday, Wednesday, Friday',
        position: 0,
      },
    ],
  };
}

describe('IEP contracts', () => {
  it('accepts the full authored nested aggregate and versioned replacement', () => {
    expect(iepCreateCommandSchema.safeParse(command()).success).toBe(true);
    expect(
      iepUpdateCommandSchema.safeParse({ expectedVersion: 1, ...command() })
        .success,
    ).toBe(true);
  });

  it.each([
    ['state', 'DRAFT'],
    ['version', 1],
    ['organizationId', ids.year],
    ['actorId', ids.actor],
    ['createdById', ids.actor],
    ['updatedById', ids.actor],
    ['createdAt', '2026-08-01T00:00:00.000Z'],
    ['updatedAt', '2026-08-01T00:00:00.000Z'],
  ])('rejects server-owned root field %s', (field, value) => {
    expect(
      iepCreateCommandSchema.safeParse({ ...command(), [field]: value })
        .success,
    ).toBe(false);
  });

  it.each(['id', 'active', 'createdAt', 'updatedAt'])(
    'rejects server-owned or derived goal field %s',
    (field) => {
      const value = command();
      value.goals = [
        { ...value.goals[0], [field]: field === 'active' ? true : ids.actor },
      ];
      expect(iepCreateCommandSchema.safeParse(value).success).toBe(false);
    },
  );

  it('accepts only server-safe workflow command fields', () => {
    expect(
      iepWorkflowCommandSchema.safeParse({ expectedVersion: 1 }).success,
    ).toBe(true);
    expect(
      iepReviewCommandSchema.safeParse({
        expectedVersion: 2,
        decision: 'RETURN',
        comment: 'Revise the plan.',
      }).success,
    ).toBe(true);
    expect(
      iepReviewCommandSchema.safeParse({
        expectedVersion: 2,
        decision: 'RETURN',
      }).success,
    ).toBe(false);
  });

  it.each([
    ['actorId', ids.actor],
    ['organizationId', ids.year],
    ['studentId', ids.student],
    ['fromState', 'DRAFT'],
    ['state', 'ACTIVE'],
    ['toState', 'APPROVED'],
    ['updatedById', ids.actor],
    ['approvedById', ids.actor],
  ])('rejects spoofed workflow field %s', (field, value) => {
    expect(
      iepWorkflowCommandSchema.safeParse({ expectedVersion: 1, [field]: value })
        .success,
    ).toBe(false);
    expect(
      iepReviewCommandSchema.safeParse({
        expectedVersion: 1,
        decision: 'APPROVE',
        [field]: value,
      }).success,
    ).toBe(false);
  });

  it('reports duplicate accommodation positions at the original array index', () => {
    const value = command();
    value.accommodations = [
      value.accommodations[0],
      {
        category: 'INSTRUCTIONAL',
        description: 'First instructional support.',
        position: 0,
      },
      {
        category: 'ACADEMIC',
        subject: 'Mathematics',
        code: 'A-2',
        description: 'Calculator access.',
        position: 0,
      },
    ];

    const result = iepCreateCommandSchema.safeParse(value);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: ['accommodations', 2, 'position'] }),
      );
    }
  });

  it('rejects invalid dates, inconsistent parent approval, duplicate codes, and duplicate positions', () => {
    expect(
      iepCreateCommandSchema.safeParse({ ...command(), endsOn: '2026-07-31' })
        .success,
    ).toBe(false);
    expect(
      iepCreateCommandSchema.safeParse({
        ...command(),
        parentApproved: false,
      }).success,
    ).toBe(false);
    expect(
      iepCreateCommandSchema.safeParse({
        ...command(),
        goals: [command().goals[0], command().goals[0]],
      }).success,
    ).toBe(false);
    expect(
      iepCreateCommandSchema.safeParse({
        ...command(),
        services: [
          command().services[0],
          { ...command().services[0], serviceName: 'Other' },
        ],
      }).success,
    ).toBe(false);
  });
});
