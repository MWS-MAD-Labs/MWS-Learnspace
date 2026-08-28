import { Prisma, type MembershipRole, type PrismaClient } from '@prisma/client';
import { Router, type Request } from 'express';
import { z } from 'zod';
import {
  aggregateNotificationsResponseSchema,
  aggregateSearchQuerySchema,
  aggregateSearchResponseSchema,
  dashboardSummaryResponseSchema,
  reportingAggregateResponseSchema,
  uuidSchema,
  type AggregateNotification,
  type AggregateSearchItem,
} from '@learnspace/contracts';
import {
  AuthorizationDeniedError,
  hasPermission,
  requireOrganizationScope,
  type MembershipScope,
} from './authorization.js';
import {
  createRequiredAuthentication,
  type AuthenticatedRequest,
} from './authRoutes.js';
import { HttpError, parseRequest } from './httpErrors.js';
import type { SessionService } from './sessionService.js';
import {
  organizationSchoolDate,
  schoolDateInTimezone,
} from './organizationTime.js';

const leadershipRoles = new Set<MembershipRole>(['DIRECTOR', 'PRINCIPAL']);
const assignedStudentRoles = new Set<MembershipRole>([
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
]);
const activeIepStates = ['ACTIVE'] as const;
const openObservationStates = ['PENDING', 'IN_PROGRESS'] as const;

function requireAuth(request: Request) {
  const auth = (request as AuthenticatedRequest).auth;
  if (!auth) {
    throw new HttpError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required.',
    );
  }
  return auth;
}

function membershipFor(request: Request, organizationId: string) {
  try {
    return requireOrganizationScope(
      requireAuth(request).memberships,
      organizationId,
    );
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) {
      throw new HttpError(
        403,
        'AUTHORIZATION_DENIED',
        'The request was denied.',
      );
    }
    throw error;
  }
}

export { schoolDateInTimezone };

export function aggregateActiveAssignedStudentIds(
  membership: MembershipScope,
  onDate: Date,
): string[] | undefined {
  if (
    membership.role === 'DIRECTOR' ||
    membership.role === 'PRINCIPAL' ||
    membership.role === 'SPECIAL_ED_COORDINATOR'
  ) {
    return undefined;
  }
  if (!assignedStudentRoles.has(membership.role)) return [];
  return [
    ...new Set(
      (membership.assignedStudentScopes ?? [])
        .filter(
          (scope) =>
            scope.organizationId === membership.organizationId &&
            scope.startsOn <= onDate &&
            (scope.endsOn === null || scope.endsOn >= onDate),
        )
        .map((scope) => scope.studentId),
    ),
  ];
}

export function aggregateStudentScopeWhere(
  membership: MembershipScope,
  schoolDate: Date,
): Prisma.StudentWhereInput | undefined {
  if (leadershipRoles.has(membership.role)) return {};
  if (membership.role === 'SPECIAL_ED_COORDINATOR') {
    return { specialNeedsFlag: true };
  }
  if (membership.role === 'GRADE_TEACHER') {
    const classScopes: Prisma.SchoolClassWhereInput[] = [];
    if (membership.unitIds.length) {
      classScopes.push({ unitId: { in: membership.unitIds } });
    }
    if (membership.gradeIds.length) {
      classScopes.push({ gradeId: { in: membership.gradeIds } });
    }
    if (!classScopes.length) return undefined;
    return {
      enrollments: {
        some: {
          startsOn: { lte: schoolDate },
          OR: [{ endsOn: null }, { endsOn: { gte: schoolDate } }],
          schoolClass: { OR: classScopes },
        },
      },
    };
  }
  if (assignedStudentRoles.has(membership.role)) {
    const ids = [
      ...new Set([
        ...(aggregateActiveAssignedStudentIds(membership, schoolDate) ?? []),
        ...(membership.observationAssignedStudentIds ?? []),
      ]),
    ];
    return ids.length ? { id: { in: ids } } : undefined;
  }
  return undefined;
}

export function aggregateJourneyScopeWhere(
  membership: MembershipScope,
): Prisma.LearningJourneyWhereInput | undefined {
  if (leadershipRoles.has(membership.role)) return {};
  if (membership.role === 'GRADE_TEACHER') {
    const scopes: Prisma.LearningJourneyWhereInput[] = [];
    if (membership.unitIds.length)
      scopes.push({ unitId: { in: membership.unitIds } });
    if (membership.gradeIds.length)
      scopes.push({ gradeId: { in: membership.gradeIds } });
    return scopes.length ? { OR: scopes } : undefined;
  }
  if (membership.role === 'SUBJECT_TEACHER') {
    return membership.subjectIds.length
      ? { subjectId: { in: membership.subjectIds } }
      : undefined;
  }
  return undefined;
}

function specialEducationStudentWhere(
  membership: MembershipScope,
  schoolDate: Date,
): Prisma.StudentWhereInput | undefined {
  const ids = aggregateActiveAssignedStudentIds(membership, schoolDate);
  if (ids === undefined) return {};
  return ids.length ? { id: { in: ids } } : undefined;
}

function observationAssignmentWhere(
  membership: MembershipScope,
  organizationId: string,
  userId: string,
): Prisma.ObservationAssignmentWhereInput | undefined {
  if (membership.role === 'SPECIAL_ED_COORDINATOR') {
    return { organizationId };
  }
  if (!assignedStudentRoles.has(membership.role)) return undefined;
  return {
    organizationId,
    assignedTo: { userId, organizationId, status: 'ACTIVE' },
  };
}

export function canReportObservationAggregates(membership: MembershipScope) {
  return (
    membership.role === 'SPECIAL_ED_COORDINATOR' ||
    assignedStudentRoles.has(membership.role)
  );
}

export function aggregateDatedObservationScope(
  membership: MembershipScope,
  userId: string,
  dateField: 'observationDate' | 'assessmentDate',
) {
  if (membership.role === 'SPECIAL_ED_COORDINATOR') return {};
  const scopes: Array<Record<string, unknown>> = [
    { assignment: { assignedTo: { userId } } },
  ];
  for (const assignment of membership.assignedStudentScopes ?? []) {
    if (assignment.organizationId !== membership.organizationId) continue;
    scopes.push({
      studentId: assignment.studentId,
      [dateField]: {
        gte: assignment.startsOn,
        ...(assignment.endsOn ? { lte: assignment.endsOn } : {}),
      },
    });
  }
  return { OR: scopes };
}

async function journeySummary(
  prisma: PrismaClient,
  organizationId: string,
  membership: MembershipScope,
) {
  if (!hasPermission(membership.role, 'journey:read')) return undefined;
  const scope = aggregateJourneyScopeWhere(membership);
  if (!scope) return { total: 0, approved: 0, inReview: 0, draft: 0 };
  const groups = await prisma.learningJourney.groupBy({
    by: ['state'],
    where: { organizationId, ...scope },
    _count: { _all: true },
  });
  const counts = new Map(
    groups.map((group) => [group.state, group._count._all]),
  );
  return {
    total: groups.reduce((sum, group) => sum + group._count._all, 0),
    approved: (counts.get('APPROVED') ?? 0) + (counts.get('ACTIVE') ?? 0),
    inReview:
      (counts.get('PRINCIPAL_REVIEW') ?? 0) +
      (counts.get('DIRECTOR_APPROVAL') ?? 0),
    draft: counts.get('DRAFT') ?? 0,
  };
}

async function specialEducationSummary(
  prisma: PrismaClient,
  organizationId: string,
  membership: MembershipScope,
  schoolDate: Date,
) {
  if (!hasPermission(membership.role, 'special-ed:read')) return undefined;
  const studentWhere = specialEducationStudentWhere(membership, schoolDate);
  if (!studentWhere) {
    return {
      activeIeps: 0,
      activeGoals: 0,
      achievedGoals: 0,
      weeklyReportsDue: 0,
    };
  }
  const iepWhere: Prisma.IEPWhereInput = {
    organizationId,
    state: { in: [...activeIepStates] },
    student: studentWhere,
  };
  const reportStudentIds = aggregateActiveAssignedStudentIds(
    membership,
    schoolDate,
  );
  const [activeIeps, activeGoals, achievedGoals, weeklyReportsDue] =
    await Promise.all([
      prisma.iEP.count({ where: iepWhere }),
      prisma.iEPGoal.count({ where: { active: true, iep: iepWhere } }),
      prisma.iEPGoal.count({
        where: { active: true, achieved: true, iep: iepWhere },
      }),
      prisma.weeklyReport.count({
        where: {
          organizationId,
          state: 'DRAFT',
          ...(reportStudentIds ? { studentId: { in: reportStudentIds } } : {}),
        },
      }),
    ]);
  return { activeIeps, activeGoals, achievedGoals, weeklyReportsDue };
}

const attendanceSeverity = {
  PRESENT: 0,
  LATE: 1,
  SICK: 2,
  EXCUSED_ABSENCE: 2,
  UNEXCUSED_ABSENCE: 3,
} as const;

export async function aggregateAttendanceSummary(
  prisma: PrismaClient,
  organizationId: string,
  membership: MembershipScope,
  schoolDate: Date,
) {
  if (!hasPermission(membership.role, 'attendance:read')) return undefined;
  const studentWhere = aggregateStudentScopeWhere(membership, schoolDate);
  if (!studentWhere) {
    return {
      schoolDate: schoolDate.toISOString().slice(0, 10),
      totalStudents: 0,
      recorded: 0,
      present: 0,
      late: 0,
      absent: 0,
    };
  }
  const classScope =
    membership.role === 'GRADE_TEACHER'
      ? (() => {
          const scopes: Prisma.SchoolClassWhereInput[] = [];
          if (membership.unitIds.length) {
            scopes.push({ unitId: { in: membership.unitIds } });
          }
          if (membership.gradeIds.length) {
            scopes.push({ gradeId: { in: membership.gradeIds } });
          }
          return scopes.length ? { OR: scopes } : undefined;
        })()
      : {};
  if (classScope === undefined) {
    return {
      schoolDate: schoolDate.toISOString().slice(0, 10),
      totalStudents: 0,
      recorded: 0,
      present: 0,
      late: 0,
      absent: 0,
    };
  }
  const [totalStudents, records] = await Promise.all([
    prisma.student.count({
      where: { organizationId, status: 'ACTIVE', ...studentWhere },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        schoolDate,
        student: { status: 'ACTIVE', ...studentWhere },
        schoolClass: classScope,
        enrollment: {
          startsOn: { lte: schoolDate },
          OR: [{ endsOn: null }, { endsOn: { gte: schoolDate } }],
          schoolClass: classScope,
        },
      },
      select: { studentId: true, status: true },
    }),
  ]);
  const statusByStudent = new Map<string, (typeof records)[number]['status']>();
  for (const record of records) {
    const current = statusByStudent.get(record.studentId);
    if (
      !current ||
      attendanceSeverity[record.status] > attendanceSeverity[current]
    ) {
      statusByStudent.set(record.studentId, record.status);
    }
  }
  const statuses = [...statusByStudent.values()];
  const recorded = statuses.length;
  const present = statuses.filter((status) => status === 'PRESENT').length;
  const late = statuses.filter((status) => status === 'LATE').length;
  const absent = statuses.filter(
    (status) =>
      status === 'SICK' ||
      status === 'EXCUSED_ABSENCE' ||
      status === 'UNEXCUSED_ABSENCE',
  ).length;
  return {
    schoolDate: schoolDate.toISOString().slice(0, 10),
    totalStudents,
    recorded,
    present,
    late,
    absent,
  };
}

async function studentSummary(
  prisma: PrismaClient,
  organizationId: string,
  membership: MembershipScope,
  schoolDate: Date,
) {
  const scope = aggregateStudentScopeWhere(membership, schoolDate);
  if (!scope) return { total: 0, specialSupport: 0 };
  const [total, specialSupport] = await Promise.all([
    prisma.student.count({
      where: { organizationId, status: 'ACTIVE', ...scope },
    }),
    prisma.student.count({
      where: {
        organizationId,
        status: 'ACTIVE',
        specialNeedsFlag: true,
        ...scope,
      },
    }),
  ]);
  return { total, specialSupport };
}

async function recentJourneys(
  prisma: PrismaClient,
  organizationId: string,
  membership: MembershipScope,
) {
  if (!hasPermission(membership.role, 'journey:read')) return [];
  const scope = aggregateJourneyScopeWhere(membership);
  if (!scope) return [];
  const rows = await prisma.learningJourney.findMany({
    where: { organizationId, ...scope },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    take: 3,
    select: {
      id: true,
      title: true,
      state: true,
      updatedAt: true,
      grade: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    grade: row.grade.name,
    subject: row.subject.name,
    state: row.state,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

function searchSubtitle(kind: AggregateSearchItem['kind'], detail: string) {
  switch (kind) {
    case 'STUDENT':
      return `Student · ${detail}`;
    case 'LEARNING_JOURNEY':
      return `Learning Journey · ${detail}`;
    case 'IEP':
      return `IEP · ${detail}`;
    case 'IEP_GOAL':
      return `IEP Goal · ${detail}`;
    case 'WEEKLY_REPORT':
      return `Weekly Report · ${detail}`;
  }
}

export async function aggregateSearchItems(
  prisma: PrismaClient,
  organizationId: string,
  membership: MembershipScope,
  query: string,
  windowSize: number,
  schoolDate: Date,
) {
  const studentWhere = aggregateStudentScopeWhere(membership, schoolDate);
  const studentClassScope: Prisma.SchoolClassWhereInput =
    membership.role === 'GRADE_TEACHER'
      ? {
          OR: [
            ...(membership.unitIds.length
              ? [{ unitId: { in: membership.unitIds } }]
              : []),
            ...(membership.gradeIds.length
              ? [{ gradeId: { in: membership.gradeIds } }]
              : []),
          ],
        }
      : {};
  const journeyWhere = aggregateJourneyScopeWhere(membership);
  const specialStudentWhere = specialEducationStudentWhere(
    membership,
    schoolDate,
  );
  const reportStudentIds = aggregateActiveAssignedStudentIds(
    membership,
    schoolDate,
  );
  const canSearchJourneys =
    hasPermission(membership.role, 'journey:read') && journeyWhere;
  const canSearchSpecialEducation =
    hasPermission(membership.role, 'special-ed:read') && specialStudentWhere;

  const [students, journeys, ieps, goals, reports] = await Promise.all([
    studentWhere
      ? prisma.student.findMany({
          where: {
            organizationId,
            status: 'ACTIVE',
            ...studentWhere,
            OR: [
              { fullName: { contains: query, mode: 'insensitive' } },
              { nickname: { contains: query, mode: 'insensitive' } },
              { studentNumber: { contains: query, mode: 'insensitive' } },
            ],
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          take: windowSize,
          select: {
            id: true,
            fullName: true,
            studentNumber: true,
            updatedAt: true,
            enrollments: {
              where: {
                startsOn: { lte: schoolDate },
                OR: [{ endsOn: null }, { endsOn: { gte: schoolDate } }],
                schoolClass: studentClassScope,
              },
              orderBy: [{ startsOn: 'desc' }, { id: 'asc' }],
              take: 1,
              select: { classId: true },
            },
          },
        })
      : Promise.resolve([]),
    canSearchJourneys
      ? prisma.learningJourney.findMany({
          where: {
            organizationId,
            AND: [
              journeyWhere,
              {
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  { grade: { name: { contains: query, mode: 'insensitive' } } },
                  {
                    subject: { name: { contains: query, mode: 'insensitive' } },
                  },
                  { unit: { name: { contains: query, mode: 'insensitive' } } },
                ],
              },
            ],
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          take: windowSize,
          select: {
            id: true,
            title: true,
            state: true,
            updatedAt: true,
            grade: { select: { name: true } },
            subject: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    canSearchSpecialEducation
      ? prisma.iEP.findMany({
          where: {
            organizationId,
            student: { status: 'ACTIVE', ...specialStudentWhere },
            OR: [
              {
                student: { fullName: { contains: query, mode: 'insensitive' } },
              },
              {
                primaryClassification: { contains: query, mode: 'insensitive' },
              },
              { currentPlacement: { contains: query, mode: 'insensitive' } },
            ],
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          take: windowSize,
          select: {
            id: true,
            studentId: true,
            state: true,
            updatedAt: true,
            student: { select: { fullName: true } },
          },
        })
      : Promise.resolve([]),
    canSearchSpecialEducation
      ? prisma.iEPGoal.findMany({
          where: {
            iep: {
              organizationId,
              student: { status: 'ACTIVE', ...specialStudentWhere },
            },
            OR: [
              { code: { contains: query, mode: 'insensitive' } },
              { measurableGoal: { contains: query, mode: 'insensitive' } },
              { performanceArea: { contains: query, mode: 'insensitive' } },
            ],
          },
          orderBy: [{ iep: { updatedAt: 'desc' } }, { id: 'asc' }],
          take: windowSize,
          select: {
            id: true,
            code: true,
            measurableGoal: true,
            iepId: true,
            iep: {
              select: {
                studentId: true,
                updatedAt: true,
                student: { select: { fullName: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    hasPermission(membership.role, 'special-ed:read') &&
    (reportStudentIds === undefined || reportStudentIds.length)
      ? prisma.weeklyReport.findMany({
          where: {
            organizationId,
            ...(reportStudentIds
              ? { studentId: { in: reportStudentIds } }
              : {}),
            student: { status: 'ACTIVE' },
            OR: [
              {
                student: { fullName: { contains: query, mode: 'insensitive' } },
              },
              {
                descriptiveObservation: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              { homeConnection: { contains: query, mode: 'insensitive' } },
            ],
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          take: windowSize,
          select: {
            id: true,
            studentId: true,
            iepId: true,
            state: true,
            weekNumber: true,
            year: true,
            updatedAt: true,
            student: { select: { fullName: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const items: AggregateSearchItem[] = [
    ...students.map((row) => ({
      id: row.id,
      kind: 'STUDENT' as const,
      title: row.fullName,
      subtitle: searchSubtitle('STUDENT', row.studentNumber),
      studentId: row.id,
      classId: row.enrollments[0]?.classId,
      updatedAt: row.updatedAt.toISOString(),
    })),
    ...journeys.map((row) => ({
      id: row.id,
      kind: 'LEARNING_JOURNEY' as const,
      title: row.title,
      subtitle: searchSubtitle(
        'LEARNING_JOURNEY',
        `${row.grade.name} · ${row.subject.name}`,
      ),
      state: row.state,
      updatedAt: row.updatedAt.toISOString(),
    })),
    ...ieps.map((row) => ({
      id: row.id,
      kind: 'IEP' as const,
      title: `${row.student.fullName} IEP`,
      subtitle: searchSubtitle('IEP', row.state.replaceAll('_', ' ')),
      studentId: row.studentId,
      state: row.state,
      updatedAt: row.updatedAt.toISOString(),
    })),
    ...goals.map((row) => ({
      id: row.id,
      kind: 'IEP_GOAL' as const,
      title: `${row.code}: ${row.measurableGoal}`,
      subtitle: searchSubtitle('IEP_GOAL', row.iep.student.fullName),
      studentId: row.iep.studentId,
      parentId: row.iepId,
      updatedAt: row.iep.updatedAt.toISOString(),
    })),
    ...reports.map((row) => ({
      id: row.id,
      kind: 'WEEKLY_REPORT' as const,
      title: `${row.student.fullName} · Week ${row.weekNumber}`,
      subtitle: searchSubtitle('WEEKLY_REPORT', String(row.year)),
      studentId: row.studentId,
      parentId: row.iepId,
      state: row.state,
      updatedAt: row.updatedAt.toISOString(),
    })),
  ];
  return items.sort((left, right) => {
    const dateOrder = right.updatedAt.localeCompare(left.updatedAt);
    return (
      dateOrder ||
      left.kind.localeCompare(right.kind) ||
      left.id.localeCompare(right.id)
    );
  });
}

export function sortAggregateNotifications(items: AggregateNotification[]) {
  return items.sort((left, right) => {
    if (left.dueAt && right.dueAt) {
      return (
        left.dueAt.localeCompare(right.dueAt) || left.id.localeCompare(right.id)
      );
    }
    if (left.dueAt) return -1;
    if (right.dueAt) return 1;
    return (
      right.occurredAt.localeCompare(left.occurredAt) ||
      left.id.localeCompare(right.id)
    );
  });
}

export async function aggregateNotifications(
  prisma: PrismaClient,
  organizationId: string,
  membership: MembershipScope,
  userId: string,
  schoolDate: Date,
) {
  const items: AggregateNotification[] = [];
  const addJourneyReviews =
    membership.role === 'PRINCIPAL' || membership.role === 'DIRECTOR';
  const journeyState =
    membership.role === 'PRINCIPAL' ? 'PRINCIPAL_REVIEW' : 'DIRECTOR_APPROVAL';
  const specialIds = aggregateActiveAssignedStudentIds(membership, schoolDate);
  const activeDraftStudentIds = assignedStudentRoles.has(membership.role)
    ? (specialIds ?? [])
    : undefined;
  const observationWhere = observationAssignmentWhere(
    membership,
    organizationId,
    userId,
  );

  const [journeys, ieps, reports, observations, drafts] = await Promise.all([
    addJourneyReviews
      ? prisma.learningJourney.findMany({
          where: { organizationId, state: journeyState },
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          take: 10,
          select: { id: true, title: true, updatedAt: true },
        })
      : Promise.resolve([]),
    membership.role === 'SPECIAL_ED_COORDINATOR' ||
    membership.role === 'DIRECTOR'
      ? prisma.iEP.findMany({
          where: {
            organizationId,
            state:
              membership.role === 'SPECIAL_ED_COORDINATOR'
                ? 'COORDINATOR_REVIEW'
                : 'DIRECTOR_APPROVAL',
            ...(specialIds ? { studentId: { in: specialIds } } : {}),
            student: { status: 'ACTIVE' },
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          take: 10,
          select: {
            id: true,
            studentId: true,
            updatedAt: true,
            student: { select: { fullName: true } },
          },
        })
      : Promise.resolve([]),
    membership.role === 'SPECIAL_ED_COORDINATOR' ||
    membership.role === 'DIRECTOR'
      ? prisma.weeklyReport.findMany({
          where: {
            organizationId,
            state:
              membership.role === 'SPECIAL_ED_COORDINATOR'
                ? 'COORDINATOR_REVIEW'
                : 'DIRECTOR_APPROVAL',
            ...(specialIds ? { studentId: { in: specialIds } } : {}),
            student: { status: 'ACTIVE' },
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          take: 10,
          select: {
            id: true,
            studentId: true,
            weekNumber: true,
            updatedAt: true,
            student: { select: { fullName: true } },
          },
        })
      : Promise.resolve([]),
    observationWhere
      ? prisma.observationAssignment.findMany({
          where: {
            ...observationWhere,
            status: { in: [...openObservationStates] },
          },
          orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
          take: 10,
          select: {
            id: true,
            studentId: true,
            dueDate: true,
            assignedAt: true,
            definition: { select: { title: true, type: true } },
            student: { select: { fullName: true } },
          },
        })
      : Promise.resolve([]),
    assignedStudentRoles.has(membership.role) && activeDraftStudentIds?.length
      ? prisma.weeklyReport.findMany({
          where: {
            organizationId,
            teacherId: userId,
            state: 'DRAFT',
            studentId: { in: activeDraftStudentIds },
            student: { status: 'ACTIVE' },
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          take: 10,
          select: {
            id: true,
            studentId: true,
            weekNumber: true,
            updatedAt: true,
            student: { select: { fullName: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  for (const row of journeys) {
    items.push({
      id: `journey-review:${row.id}`,
      kind: 'JOURNEY_REVIEW',
      title: 'Learning Journey Review Required',
      message: `${row.title} is awaiting your review.`,
      occurredAt: row.updatedAt.toISOString(),
      target: { tab: 'LEARNING_JOURNEY_EDITOR', recordId: row.id },
    });
  }
  for (const row of ieps) {
    items.push({
      id: `iep-review:${row.id}`,
      kind: 'IEP_REVIEW',
      title: 'IEP Review Required',
      message: `${row.student.fullName}'s IEP is awaiting your review.`,
      occurredAt: row.updatedAt.toISOString(),
      target: {
        tab: 'SPECIAL_ED_IEP',
        recordId: row.id,
        studentId: row.studentId,
      },
    });
  }
  for (const row of reports) {
    items.push({
      id: `weekly-review:${row.id}`,
      kind: 'WEEKLY_REPORT_REVIEW',
      title: 'Weekly IEP Report Review Required',
      message: `${row.student.fullName}'s week ${row.weekNumber} report is awaiting review.`,
      occurredAt: row.updatedAt.toISOString(),
      target: {
        tab: 'SPECIAL_ED_WEEKLY_REPORT',
        recordId: row.id,
        studentId: row.studentId,
      },
    });
  }
  for (const row of observations) {
    items.push({
      id: `observation-due:${row.id}`,
      kind: 'OBSERVATION_DUE',
      title: 'Observation Action Required',
      message: `${row.definition.title} for ${row.student.fullName} is due ${row.dueDate.toISOString().slice(0, 10)}.`,
      occurredAt: row.assignedAt.toISOString(),
      dueAt: row.dueDate.toISOString(),
      target: {
        tab: 'SPECIAL_ED_OBSERVATION',
        recordId: row.id,
        studentId: row.studentId,
        observationType: row.definition.type,
      },
    });
  }
  for (const row of drafts) {
    items.push({
      id: `weekly-draft:${row.id}`,
      kind: 'WEEKLY_REPORT_DRAFT',
      title: 'Weekly IEP Report Draft',
      message: `${row.student.fullName}'s week ${row.weekNumber} report is ready to finish.`,
      occurredAt: row.updatedAt.toISOString(),
      target: {
        tab: 'SPECIAL_ED_WEEKLY_REPORT',
        recordId: row.id,
        studentId: row.studentId,
      },
    });
  }
  return sortAggregateNotifications(items).slice(0, 10);
}

export function createAggregateRouter(
  prisma: PrismaClient,
  sessions: SessionService,
) {
  const router = Router();
  router.use(createRequiredAuthentication(sessions));

  router.get(
    '/organizations/:organizationId/dashboard-summary',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema }).strict(),
          request.params,
        );
        const membership = membershipFor(request, path.organizationId);
        const { schoolDate } = await organizationSchoolDate(
          prisma,
          path.organizationId,
        );
        const [students, attendance, journeys, specialEducation, recent] =
          await Promise.all([
            studentSummary(prisma, path.organizationId, membership, schoolDate),
            aggregateAttendanceSummary(
              prisma,
              path.organizationId,
              membership,
              schoolDate,
            ),
            journeySummary(prisma, path.organizationId, membership),
            specialEducationSummary(
              prisma,
              path.organizationId,
              membership,
              schoolDate,
            ),
            recentJourneys(prisma, path.organizationId, membership),
          ]);
        response.json(
          dashboardSummaryResponseSchema.parse({
            data: {
              generatedAt: new Date().toISOString(),
              role: membership.role,
              students,
              attendance,
              journeys,
              specialEducation,
              recentJourneys: recent,
            },
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/search',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema }).strict(),
          request.params,
        );
        const query = parseRequest(aggregateSearchQuerySchema, request.query);
        const membership = membershipFor(request, path.organizationId);
        const limit = query.limit ?? 10;
        const offset = query.offset ?? 0;
        const windowSize = offset + limit + 1;
        const { schoolDate } = await organizationSchoolDate(
          prisma,
          path.organizationId,
        );
        const allItems = await aggregateSearchItems(
          prisma,
          path.organizationId,
          membership,
          query.q,
          windowSize,
          schoolDate,
        );
        const page = allItems.slice(offset, offset + limit);
        response.json(
          aggregateSearchResponseSchema.parse({
            data: page,
            meta: {
              count: page.length,
              limit,
              offset,
              hasMore: allItems.length > offset + limit,
            },
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/notifications',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema }).strict(),
          request.params,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        const { schoolDate } = await organizationSchoolDate(
          prisma,
          path.organizationId,
        );
        const data = await aggregateNotifications(
          prisma,
          path.organizationId,
          membership,
          auth.userId,
          schoolDate,
        );
        response.json(
          aggregateNotificationsResponseSchema.parse({
            data,
            meta: { count: data.length },
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/reporting-aggregate',
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z.object({ organizationId: uuidSchema }).strict(),
          request.params,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(request, path.organizationId);
        const { schoolDate } = await organizationSchoolDate(
          prisma,
          path.organizationId,
        );
        const canReportObservations =
          canReportObservationAggregates(membership);
        const observationWhere = canReportObservations
          ? observationAssignmentWhere(
              membership,
              path.organizationId,
              auth.userId,
            )
          : undefined;
        const [
          students,
          attendance,
          journeys,
          specialEducation,
          observationGroups,
          completedFedc,
          completedSensory,
          completedSfa,
        ] = await Promise.all([
          studentSummary(prisma, path.organizationId, membership, schoolDate),
          aggregateAttendanceSummary(
            prisma,
            path.organizationId,
            membership,
            schoolDate,
          ),
          journeySummary(prisma, path.organizationId, membership),
          specialEducationSummary(
            prisma,
            path.organizationId,
            membership,
            schoolDate,
          ),
          observationWhere
            ? prisma.observationAssignment.groupBy({
                by: ['status'],
                where: observationWhere,
                _count: { _all: true },
              })
            : Promise.resolve([]),
          canReportObservations
            ? prisma.fEDCObservation.count({
                where: {
                  organizationId: path.organizationId,
                  status: 'COMPLETED',
                  ...aggregateDatedObservationScope(
                    membership,
                    auth.userId,
                    'observationDate',
                  ),
                } as Prisma.FEDCObservationWhereInput,
              })
            : Promise.resolve(0),
          canReportObservations
            ? prisma.sensoryProfileObservation.count({
                where: {
                  organizationId: path.organizationId,
                  status: 'COMPLETED',
                  ...aggregateDatedObservationScope(
                    membership,
                    auth.userId,
                    'observationDate',
                  ),
                } as Prisma.SensoryProfileObservationWhereInput,
              })
            : Promise.resolve(0),
          canReportObservations
            ? prisma.sFAObservation.count({
                where: {
                  organizationId: path.organizationId,
                  status: 'COMPLETED',
                  ...aggregateDatedObservationScope(
                    membership,
                    auth.userId,
                    'assessmentDate',
                  ),
                } as Prisma.SFAObservationWhereInput,
              })
            : Promise.resolve(0),
        ]);
        let observations:
          | {
              pending: number;
              inProgress: number;
              completed: number;
              completedByType: {
                FEDC: number;
                SENSORY_PROFILE: number;
                SFA: number;
              };
            }
          | undefined;
        if (canReportObservations) {
          const statusCounts = new Map(
            observationGroups.map((group) => [group.status, group._count._all]),
          );
          observations = {
            pending: statusCounts.get('PENDING') ?? 0,
            inProgress: statusCounts.get('IN_PROGRESS') ?? 0,
            completed: completedFedc + completedSensory + completedSfa,
            completedByType: {
              FEDC: completedFedc,
              SENSORY_PROFILE: completedSensory,
              SFA: completedSfa,
            },
          };
        }
        response.json(
          reportingAggregateResponseSchema.parse({
            data: {
              generatedAt: new Date().toISOString(),
              students,
              attendance,
              journeys,
              specialEducation,
              observations,
            },
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
