import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import type { MembershipScope } from '../src/authorization.js';
import {
  aggregateActiveAssignedStudentIds,
  aggregateAttendanceSummary,
  aggregateDatedObservationScope,
  aggregateJourneyScopeWhere,
  aggregateNotifications,
  aggregateSearchItems,
  aggregateStudentScopeWhere,
  canReportObservationAggregates,
  schoolDateInTimezone,
  sortAggregateNotifications,
} from '../src/aggregateRoutes.js';

const date = new Date('2026-08-27T00:00:00.000Z');

function membership(overrides: Partial<MembershipScope>): MembershipScope {
  return {
    organizationId: '11111111-1111-4111-8111-111111111111',
    role: 'GRADE_TEACHER',
    unitIds: [],
    gradeIds: [],
    subjectIds: [],
    assignedStudentIds: [],
    assignedStudentScopes: [],
    ...overrides,
  };
}

describe('authorized aggregate scopes', () => {
  it('derives the school date in the organization timezone', () => {
    const instant = new Date('2026-08-27T00:30:00.000Z');
    expect(schoolDateInTimezone('America/Los_Angeles', instant)).toEqual(
      new Date('2026-08-26T00:00:00.000Z'),
    );
    expect(schoolDateInTimezone('Pacific/Auckland', instant)).toEqual(
      new Date('2026-08-27T00:00:00.000Z'),
    );
  });

  it('exposes observation reporting only to roles with an effective policy', () => {
    expect(
      canReportObservationAggregates(membership({ role: 'PRINCIPAL' })),
    ).toBe(false);
    expect(
      canReportObservationAggregates(
        membership({ role: 'SPECIAL_ED_COORDINATOR' }),
      ),
    ).toBe(true);
    expect(
      canReportObservationAggregates(membership({ role: 'SPECIALIST' })),
    ).toBe(true);
  });
  it('filters grade-teacher students at the database layer by active enrollment and assigned unit or grade', () => {
    const scope = aggregateStudentScopeWhere(
      membership({ unitIds: ['unit-a'], gradeIds: ['grade-a'] }),
      date,
    );
    expect(scope).toEqual({
      enrollments: {
        some: {
          startsOn: { lte: date },
          OR: [{ endsOn: null }, { endsOn: { gte: date } }],
          schoolClass: {
            OR: [
              { unitId: { in: ['unit-a'] } },
              { gradeId: { in: ['grade-a'] } },
            ],
          },
        },
      },
    });
  });

  it('does not grant an unscoped teacher broad student or journey access', () => {
    const scope = membership({ unitIds: [], gradeIds: [] });
    expect(aggregateStudentScopeWhere(scope, date)).toBeUndefined();
    expect(aggregateJourneyScopeWhere(scope)).toBeUndefined();
  });

  it('uses only date-effective assigned students for special education aggregates', () => {
    const scope = membership({
      role: 'SPECIAL_ED_TEACHER',
      assignedStudentScopes: [
        {
          organizationId: '11111111-1111-4111-8111-111111111111',
          studentId: 'active',
          startsOn: new Date('2026-08-01'),
          endsOn: null,
        },
        {
          organizationId: '22222222-2222-4222-8222-222222222222',
          studentId: 'foreign-active',
          startsOn: new Date('2026-08-01'),
          endsOn: null,
        },
        {
          organizationId: '11111111-1111-4111-8111-111111111111',
          studentId: 'future',
          startsOn: new Date('2026-09-01'),
          endsOn: null,
        },
        {
          organizationId: '11111111-1111-4111-8111-111111111111',
          studentId: 'ended',
          startsOn: new Date('2026-07-01'),
          endsOn: new Date('2026-08-01'),
        },
      ],
    });
    expect(aggregateActiveAssignedStudentIds(scope, date)).toEqual(['active']);
    expect(aggregateActiveAssignedStudentIds(scope, date)).not.toContain(
      'foreign-active',
    );
  });

  it('scopes historical observation counts to the assignment effective on each record date', () => {
    const scope = membership({
      role: 'SPECIAL_ED_TEACHER',
      assignedStudentScopes: [
        {
          organizationId: '11111111-1111-4111-8111-111111111111',
          studentId: 'student-a',
          startsOn: new Date('2026-08-01'),
          endsOn: new Date('2026-08-31'),
        },
      ],
    });
    expect(
      aggregateDatedObservationScope(scope, 'user-a', 'observationDate'),
    ).toEqual({
      OR: [
        { assignment: { assignedTo: { userId: 'user-a' } } },
        {
          studentId: 'student-a',
          observationDate: {
            gte: new Date('2026-08-01'),
            lte: new Date('2026-08-31'),
          },
        },
      ],
    });
  });
});

describe('aggregate search query bounds', () => {
  it('prioritizes the earliest due observation before newer undated action items', () => {
    const sorted = sortAggregateNotifications([
      {
        id: 'new-review',
        kind: 'IEP_REVIEW',
        title: 'New review',
        message: 'Review',
        occurredAt: '2026-08-27T12:00:00.000Z',
        target: { tab: 'SPECIAL_ED_IEP' },
      },
      {
        id: 'later-due',
        kind: 'OBSERVATION_DUE',
        title: 'Later observation',
        message: 'Due later',
        occurredAt: '2026-08-20T12:00:00.000Z',
        dueAt: '2026-08-30T00:00:00.000Z',
        target: { tab: 'SPECIAL_ED_OBSERVATION' },
      },
      {
        id: 'earlier-due',
        kind: 'OBSERVATION_DUE',
        title: 'Earlier observation',
        message: 'Due first',
        occurredAt: '2026-08-19T12:00:00.000Z',
        dueAt: '2026-08-28T00:00:00.000Z',
        target: { tab: 'SPECIAL_ED_OBSERVATION' },
      },
    ]);
    expect(sorted.map((item) => item.id)).toEqual([
      'earlier-due',
      'later-due',
      'new-review',
    ]);
  });
  it('pushes organization and role scope into Prisma and bounds each domain query', async () => {
    const studentFindMany = vi.fn().mockResolvedValue([]);
    const journeyFindMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      student: { findMany: studentFindMany },
      learningJourney: { findMany: journeyFindMany },
      iEP: { findMany: vi.fn().mockResolvedValue([]) },
      iEPGoal: { findMany: vi.fn().mockResolvedValue([]) },
      weeklyReport: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;
    const organizationId = '11111111-1111-4111-8111-111111111111';
    const scope = membership({ unitIds: ['unit-a'] });

    await aggregateSearchItems(prisma, organizationId, scope, 'math', 11, date);

    expect(studentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId }),
        take: 11,
      }),
    );
    expect(journeyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          AND: expect.arrayContaining([
            { OR: [{ unitId: { in: ['unit-a'] } }] },
            expect.objectContaining({ OR: expect.any(Array) }),
          ]),
        }),
        take: 11,
      }),
    );
  });

  it('does not query special education domains for a role without special-ed read permission', async () => {
    const specialQueries = [vi.fn(), vi.fn(), vi.fn()];
    const prisma = {
      student: { findMany: vi.fn().mockResolvedValue([]) },
      learningJourney: { findMany: vi.fn().mockResolvedValue([]) },
      iEP: { findMany: specialQueries[0] },
      iEPGoal: { findMany: specialQueries[1] },
      weeklyReport: { findMany: specialQueries[2] },
    } as unknown as PrismaClient;

    await aggregateSearchItems(
      prisma,
      '11111111-1111-4111-8111-111111111111',
      membership({ unitIds: ['unit-a'] }),
      'goal',
      11,
      date,
    );

    for (const query of specialQueries) expect(query).not.toHaveBeenCalled();
  });

  it('filters inactive students from IEP, goal, and weekly-report search branches', async () => {
    const iepFindMany = vi.fn().mockResolvedValue([]);
    const goalFindMany = vi.fn().mockResolvedValue([]);
    const reportFindMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      student: { findMany: vi.fn().mockResolvedValue([]) },
      learningJourney: { findMany: vi.fn().mockResolvedValue([]) },
      iEP: { findMany: iepFindMany },
      iEPGoal: { findMany: goalFindMany },
      weeklyReport: { findMany: reportFindMany },
    } as unknown as PrismaClient;

    await aggregateSearchItems(
      prisma,
      '11111111-1111-4111-8111-111111111111',
      membership({ role: 'SPECIAL_ED_COORDINATOR' }),
      'student',
      11,
      date,
    );

    expect(iepFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          student: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      }),
    );
    expect(goalFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          iep: expect.objectContaining({
            student: expect.objectContaining({ status: 'ACTIVE' }),
          }),
        }),
      }),
    );
    expect(reportFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          student: { status: 'ACTIVE' },
        }),
      }),
    );
  });

  it('filters inactive students from weekly-report review notifications', async () => {
    const weeklyReportFindMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      learningJourney: { findMany: vi.fn().mockResolvedValue([]) },
      iEP: { findMany: vi.fn().mockResolvedValue([]) },
      weeklyReport: { findMany: weeklyReportFindMany },
      observationAssignment: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;

    await aggregateNotifications(
      prisma,
      '11111111-1111-4111-8111-111111111111',
      membership({ role: 'SPECIAL_ED_COORDINATOR' }),
      'user-a',
      date,
    );

    expect(weeklyReportFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          state: 'COORDINATOR_REVIEW',
          student: { status: 'ACTIVE' },
        }),
      }),
    );
  });

  it('does not return draft report notifications after the student assignment ends', async () => {
    const weeklyReportFindMany = vi.fn();
    const prisma = {
      learningJourney: { findMany: vi.fn().mockResolvedValue([]) },
      iEP: { findMany: vi.fn().mockResolvedValue([]) },
      weeklyReport: { findMany: weeklyReportFindMany },
      observationAssignment: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;
    const scope = membership({
      role: 'SPECIAL_ED_TEACHER',
      assignedStudentScopes: [
        {
          organizationId: '11111111-1111-4111-8111-111111111111',
          studentId: 'former-student',
          startsOn: new Date('2026-01-01'),
          endsOn: new Date('2026-02-01'),
        },
      ],
    });

    const result = await aggregateNotifications(
      prisma,
      '11111111-1111-4111-8111-111111111111',
      scope,
      'user-a',
      date,
    );

    expect(result).toEqual([]);
    expect(weeklyReportFindMany).not.toHaveBeenCalled();
  });

  it('counts attendance records only for active students in the authorized scope', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      student: { count: vi.fn().mockResolvedValue(0) },
      attendanceRecord: { findMany },
    } as unknown as PrismaClient;
    const scope = membership({ role: 'PRINCIPAL' });

    await aggregateAttendanceSummary(
      prisma,
      '11111111-1111-4111-8111-111111111111',
      scope,
      date,
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          student: expect.objectContaining({ status: 'ACTIVE' }),
          schoolClass: {},
          enrollment: {
            startsOn: { lte: date },
            OR: [{ endsOn: null }, { endsOn: { gte: date } }],
            schoolClass: {},
          },
        }),
      }),
    );
  });

  it('filters grade-teacher attendance records through authorized classes', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      student: { count: vi.fn().mockResolvedValue(0) },
      attendanceRecord: { findMany },
    } as unknown as PrismaClient;

    await aggregateAttendanceSummary(
      prisma,
      '11111111-1111-4111-8111-111111111111',
      membership({ role: 'GRADE_TEACHER', gradeIds: ['grade-a'] }),
      date,
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolClass: { OR: [{ gradeId: { in: ['grade-a'] } }] },
        }),
      }),
    );
  });

  it('deduplicates authorized class records to one status per student', async () => {
    const prisma = {
      student: { count: vi.fn().mockResolvedValue(1) },
      attendanceRecord: {
        findMany: vi.fn().mockResolvedValue([
          { studentId: 'student-a', status: 'PRESENT' },
          { studentId: 'student-a', status: 'UNEXCUSED_ABSENCE' },
        ]),
      },
    } as unknown as PrismaClient;

    const result = await aggregateAttendanceSummary(
      prisma,
      '11111111-1111-4111-8111-111111111111',
      membership({ role: 'PRINCIPAL' }),
      date,
    );

    expect(result).toMatchObject({
      totalStudents: 1,
      recorded: 1,
      present: 0,
      late: 0,
      absent: 1,
    });
  });

  it('limits open observation notifications to the exact active assignee', async () => {
    const observationFindMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      learningJourney: { findMany: vi.fn().mockResolvedValue([]) },
      iEP: { findMany: vi.fn().mockResolvedValue([]) },
      weeklyReport: { findMany: vi.fn().mockResolvedValue([]) },
      observationAssignment: { findMany: observationFindMany },
    } as unknown as PrismaClient;
    const scope = membership({
      role: 'SPECIAL_ED_TEACHER',
      observationAssignedStudentIds: ['student-a'],
      assignedStudentScopes: [
        {
          organizationId: '11111111-1111-4111-8111-111111111111',
          studentId: 'student-b',
          startsOn: date,
          endsOn: null,
        },
      ],
    });

    await aggregateNotifications(
      prisma,
      '11111111-1111-4111-8111-111111111111',
      scope,
      'user-a',
      date,
    );

    expect(observationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignedTo: {
            userId: 'user-a',
            organizationId: '11111111-1111-4111-8111-111111111111',
            status: 'ACTIVE',
          },
        }),
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      }),
    );
  });
});
