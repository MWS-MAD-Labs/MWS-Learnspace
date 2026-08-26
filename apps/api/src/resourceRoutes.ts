import {
  Prisma,
  type AttendanceStatus,
  type MembershipRole,
  type PrismaClient,
} from '@prisma/client';
import type { Request, Router } from 'express';
import { Router as createRouter } from 'express';
import { z } from 'zod';
import {
  academicYearsResponseSchema,
  attendanceBulkSaveCommandSchema,
  attendanceBulkSaveResponseSchema,
  attendanceQuerySchema,
  attendanceRosterResponseSchema,
  classesResponseSchema,
  gpkAssignmentEndCommandSchema,
  gpkAssignmentMutationResponseSchema,
  gpkAssignmentQuerySchema,
  gpkAssignmentsResponseSchema,
  gpkAssignmentUpsertCommandSchema,
  gradesResponseSchema,
  organizationAccountCreateCommandSchema,
  organizationAccountMutationResponseSchema,
  organizationAccountsResponseSchema,
  organizationAccountUpdateCommandSchema,
  organizationsResponseSchema,
  semestersResponseSchema,
  staffDirectoryResponseSchema,
  studentCreateCommandSchema,
  studentDetailResponseSchema,
  studentListQuerySchema,
  studentMutationResponseSchema,
  studentsResponseSchema,
  studentUpdateCommandSchema,
  subjectsResponseSchema,
  unitsResponseSchema,
  uuidSchema,
} from '@learnspace/contracts';
import { createAuditRepository } from './audit.js';
import {
  AuthorizationDeniedError,
  requireOrganizationScope,
  requirePermission,
  type MembershipScope,
} from './authorization.js';
import {
  createCsrfProtection,
  createRequiredAuthentication,
  type AuthenticatedRequest,
} from './authRoutes.js';
import { HttpError, parseRequest } from './httpErrors.js';
import type { SessionService } from './sessionService.js';

const leadershipRoles: readonly MembershipRole[] = ['DIRECTOR', 'PRINCIPAL'];
const assignedStudentRoles: readonly MembershipRole[] = [
  'SPECIAL_ED_COORDINATOR',
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
];
const serializableConflictCodes = new Set(['P2034']);
const assignmentConflictCodes = new Set(['P2002', 'P2034']);
const GPK_ROLE_CONTEXT = 'GPK';
// P5-001 backend default. Every GPK assignment persists this value.
export const DEFAULT_GPK_MAX_CASELOAD = 2;

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateAtUtcMidnight(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function isLeadership(membership: MembershipScope): boolean {
  return leadershipRoles.includes(membership.role);
}

function scopedClassWhere(
  membership: MembershipScope,
): Prisma.SchoolClassWhereInput | undefined {
  if (isLeadership(membership)) return {};
  if (membership.role === 'GRADE_TEACHER') {
    const scopes: Prisma.SchoolClassWhereInput[] = [];
    if (membership.unitIds.length)
      scopes.push({ unitId: { in: membership.unitIds } });
    if (membership.gradeIds.length)
      scopes.push({ gradeId: { in: membership.gradeIds } });
    return scopes.length ? { OR: scopes } : undefined;
  }
  return undefined;
}

function activeEnrollmentWhere(schoolDate: Date): Prisma.EnrollmentWhereInput {
  return {
    startsOn: { lte: schoolDate },
    OR: [{ endsOn: null }, { endsOn: { gte: schoolDate } }],
  };
}

function attendanceVersion(records: readonly { updatedAt: Date }[]): string {
  const latest = records.reduce(
    (maximum, record) => Math.max(maximum, record.updatedAt.getTime()),
    0,
  );
  return `${records.length}:${latest ? new Date(latest).toISOString() : 'none'}`;
}

function asPrismaErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

function requireAuth(
  request: Request,
): NonNullable<AuthenticatedRequest['auth']> {
  const auth = (request as AuthenticatedRequest).auth;
  if (!auth)
    throw new HttpError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required.',
    );
  return auth;
}

function membershipFor(
  request: Request,
  organizationId: string,
): MembershipScope {
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

function requireResourcePermission(
  membership: MembershipScope,
  permission:
    | 'attendance:read'
    | 'attendance:write'
    | 'student:admin'
    | 'student:sensitive-read'
    | 'staff-directory:read'
    | 'staff-assignment:admin'
    | 'organization:admin',
) {
  try {
    requirePermission(membership, permission);
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

function requireAttendancePermission(
  membership: MembershipScope,
  permission: 'attendance:read' | 'attendance:write',
) {
  requireResourcePermission(membership, permission);
}

function requireAcademicCollectionAccess(
  membership: MembershipScope,
  resource:
    'academicYears' | 'semesters' | 'units' | 'grades' | 'classes' | 'subjects',
) {
  if (isLeadership(membership)) return;
  if (membership.role === 'GRADE_TEACHER') return;
  if (
    membership.role === 'SUBJECT_TEACHER' &&
    (resource === 'academicYears' ||
      resource === 'semesters' ||
      resource === 'units' ||
      resource === 'grades' ||
      resource === 'subjects')
  )
    return;
  throw new HttpError(403, 'AUTHORIZATION_DENIED', 'The request was denied.');
}

function studentScopeWhere(
  membership: MembershipScope,
  schoolDate: Date,
  enrollmentFilter: Prisma.EnrollmentWhereInput = {},
): Prisma.StudentWhereInput | undefined {
  if (isLeadership(membership)) return {};
  if (membership.role === 'SPECIAL_ED_COORDINATOR') {
    return { specialNeedsFlag: true };
  }
  if (membership.role === 'GRADE_TEACHER') {
    const classScope = scopedClassWhere(membership);
    if (!classScope) return undefined;
    return {
      enrollments: {
        some: {
          ...activeEnrollmentWhere(schoolDate),
          ...enrollmentFilter,
          schoolClass: {
            ...classScope,
            ...((enrollmentFilter.schoolClass as
              Prisma.SchoolClassWhereInput | undefined) ?? {}),
          },
        },
      },
    };
  }
  if (assignedStudentRoles.includes(membership.role)) {
    const datedStudentIds = membership.assignedStudentScopes
      ? membership.assignedStudentScopes
          .filter(
            (scope) =>
              scope.startsOn <= schoolDate &&
              (scope.endsOn === null || scope.endsOn >= schoolDate),
          )
          .map((scope) => scope.studentId)
      : membership.assignedStudentIds;
    const activeStudentIds = [
      ...new Set([
        ...datedStudentIds,
        ...(membership.observationAssignedStudentIds ?? []),
      ]),
    ];
    return activeStudentIds.length
      ? { id: { in: activeStudentIds } }
      : undefined;
  }
  return undefined;
}

function enrollmentSelect(
  schoolDate: Date,
  enrollmentFilter: Prisma.EnrollmentWhereInput = {},
) {
  return {
    where: { ...activeEnrollmentWhere(schoolDate), ...enrollmentFilter },
    orderBy: [{ startsOn: 'desc' as const }, { id: 'asc' as const }],
    select: {
      id: true,
      academicYearId: true,
      classId: true,
      startsOn: true,
      endsOn: true,
      schoolClass: {
        select: {
          name: true,
          unit: { select: { id: true, name: true } },
          grade: { select: { id: true, name: true } },
        },
      },
    },
  };
}

function activeGpkAssignmentSelect(schoolDate: Date) {
  const where: Prisma.StaffStudentAssignmentWhereInput = {
    roleContext: GPK_ROLE_CONTEXT,
    startsOn: { lte: schoolDate },
    OR: [{ endsOn: null }, { endsOn: { gte: schoolDate } }],
    membership: { status: 'ACTIVE', role: 'SPECIAL_ED_TEACHER' },
  };
  return {
    where,
    orderBy: [{ startsOn: 'desc' as const }, { id: 'asc' as const }],
    take: 1,
    select: {
      id: true,
      organizationId: true,
      studentId: true,
      roleContext: true,
      startsOn: true,
      endsOn: true,
      maxCaseload: true,
      membership: {
        select: {
          id: true,
          roleTitle: true,
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  };
}

type SelectedEnrollment = {
  id: string;
  academicYearId: string;
  classId: string;
  startsOn: Date;
  endsOn: Date | null;
  schoolClass: {
    name: string;
    unit: { id: string; name: string };
    grade: { id: string; name: string };
  };
};

type SelectedGpkAssignment = {
  id: string;
  organizationId: string;
  studentId: string;
  roleContext: string;
  startsOn: Date;
  endsOn: Date | null;
  maxCaseload: number | null;
  membership: {
    id: string;
    roleTitle: string | null;
    user: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
    };
  };
};

type SelectedStudent = {
  id: string;
  organizationId: string;
  studentNumber: string;
  fullName: string;
  nickname: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  dateOfBirth: Date;
  specialNeedsFlag: boolean;
  status: 'ACTIVE' | 'DISABLED';
  avatarUrl: string | null;
  primaryClassification: string | null;
  currentPlacement: string | null;
  enrollments: SelectedEnrollment[];
  staffAssignments: SelectedGpkAssignment[];
};

function mapEnrollment(enrollment: SelectedEnrollment) {
  return {
    id: enrollment.id,
    academicYearId: enrollment.academicYearId,
    classId: enrollment.classId,
    className: enrollment.schoolClass.name,
    unitId: enrollment.schoolClass.unit.id,
    unitName: enrollment.schoolClass.unit.name,
    gradeId: enrollment.schoolClass.grade.id,
    gradeName: enrollment.schoolClass.grade.name,
    startsOn: isoDate(enrollment.startsOn),
    endsOn: enrollment.endsOn ? isoDate(enrollment.endsOn) : null,
  };
}

function mapGpkAssignment(assignment: SelectedGpkAssignment) {
  return {
    id: assignment.id,
    organizationId: assignment.organizationId,
    studentId: assignment.studentId,
    roleContext: GPK_ROLE_CONTEXT,
    startsOn: isoDate(assignment.startsOn),
    endsOn: assignment.endsOn ? isoDate(assignment.endsOn) : null,
    maxCaseload: assignment.maxCaseload ?? DEFAULT_GPK_MAX_CASELOAD,
    staff: {
      membershipId: assignment.membership.id,
      userId: assignment.membership.user.id,
      displayName: assignment.membership.user.displayName,
      avatarUrl: assignment.membership.user.avatarUrl,
      roleTitle: assignment.membership.roleTitle,
    },
  } as const;
}

function mapStudent(student: SelectedStudent) {
  const enrollments = student.enrollments.map(mapEnrollment);
  return {
    id: student.id,
    organizationId: student.organizationId,
    studentNumber: student.studentNumber,
    fullName: student.fullName,
    nickname: student.nickname,
    gender: student.gender,
    dateOfBirth: isoDate(student.dateOfBirth),
    specialNeedsFlag: student.specialNeedsFlag,
    status: student.status,
    avatarUrl: student.avatarUrl,
    primaryClassification: student.primaryClassification,
    currentPlacement: student.currentPlacement,
    enrollments,
    activeEnrollment: enrollments[0] ?? null,
    activeGpkAssignment: student.staffAssignments[0]
      ? mapGpkAssignment(student.staffAssignments[0])
      : null,
  };
}

function studentSelect(
  schoolDate: Date,
  enrollmentFilter: Prisma.EnrollmentWhereInput = {},
) {
  return {
    id: true,
    organizationId: true,
    studentNumber: true,
    fullName: true,
    nickname: true,
    gender: true,
    dateOfBirth: true,
    specialNeedsFlag: true,
    status: true,
    avatarUrl: true,
    primaryClassification: true,
    currentPlacement: true,
    enrollments: enrollmentSelect(schoolDate, enrollmentFilter),
    staffAssignments: activeGpkAssignmentSelect(schoolDate),
  };
}

function mapStudentDetail(
  student: SelectedStudent & {
    address: string | null;
    guardians: Array<{
      id: string;
      name: string;
      relationship: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      isPrimary: boolean;
    }>;
  },
) {
  return {
    ...mapStudent(student),
    address: student.address,
    guardians: student.guardians,
  };
}

function studentMutationSelect(schoolDate: Date) {
  return {
    ...studentSelect(schoolDate),
    address: true,
    guardians: {
      orderBy: [{ isPrimary: 'desc' as const }, { name: 'asc' as const }],
      select: {
        id: true,
        name: true,
        relationship: true,
        phone: true,
        email: true,
        address: true,
        isPrimary: true,
      },
    },
  };
}

async function validateEnrollmentCommand(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  command: {
    academicYearId: string;
    classId: string;
    startsOn: string;
    endsOn?: string | null;
  },
) {
  const [academicYear, schoolClass] = await Promise.all([
    transaction.academicYear.findFirst({
      where: { id: command.academicYearId, organizationId },
      select: { id: true, startsOn: true, endsOn: true },
    }),
    transaction.schoolClass.findFirst({
      where: { id: command.classId, organizationId },
      select: { id: true },
    }),
  ]);
  if (!academicYear || !schoolClass) {
    throw new HttpError(
      400,
      'INVALID_ENROLLMENT_REFERENCE',
      'The academic year and class must belong to the organization.',
    );
  }
  const startsOn = dateAtUtcMidnight(command.startsOn);
  const endsOn = command.endsOn ? dateAtUtcMidnight(command.endsOn) : null;
  if (
    startsOn < academicYear.startsOn ||
    startsOn > academicYear.endsOn ||
    (endsOn && (endsOn < academicYear.startsOn || endsOn > academicYear.endsOn))
  ) {
    throw new HttpError(
      400,
      'INVALID_ENROLLMENT_DATES',
      'Enrollment dates must be within the academic year.',
    );
  }
  return { startsOn, endsOn };
}

async function loadAssignmentForResponse(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  assignmentId: string,
) {
  const assignment = await transaction.staffStudentAssignment.findFirstOrThrow({
    where: { id: assignmentId, organizationId, roleContext: GPK_ROLE_CONTEXT },
    select: {
      id: true,
      organizationId: true,
      studentId: true,
      roleContext: true,
      startsOn: true,
      endsOn: true,
      maxCaseload: true,
      membership: {
        select: {
          id: true,
          roleTitle: true,
          user: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      },
      student: {
        select: {
          id: true,
          organizationId: true,
          studentNumber: true,
          fullName: true,
          nickname: true,
          avatarUrl: true,
        },
      },
    },
  });
  return {
    ...mapGpkAssignment(assignment),
    student: assignment.student,
  };
}

function assignmentOverlapWhere(startsOn: Date, endsOn: Date | null) {
  return {
    startsOn: { lte: endsOn ?? new Date('9999-12-31T00:00:00.000Z') },
    OR: [{ endsOn: null }, { endsOn: { gte: startsOn } }],
  } satisfies Prisma.StaffStudentAssignmentWhereInput;
}

const organizationAccountSelect = {
  id: true,
  organizationId: true,
  role: true,
  roleTitle: true,
  status: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      status: true,
      updatedAt: true,
    },
  },
  unitScopes: { select: { unitId: true }, orderBy: { unitId: 'asc' as const } },
  gradeScopes: {
    select: { gradeId: true },
    orderBy: { gradeId: 'asc' as const },
  },
  subjectScopes: {
    select: { subjectId: true },
    orderBy: { subjectId: 'asc' as const },
  },
} satisfies Prisma.MembershipSelect;

type SelectedOrganizationAccount = Prisma.MembershipGetPayload<{
  select: typeof organizationAccountSelect;
}>;

function mapOrganizationAccount(account: SelectedOrganizationAccount) {
  return {
    membershipId: account.id,
    organizationId: account.organizationId,
    userId: account.user.id,
    email: account.user.email,
    displayName: account.user.displayName,
    avatarUrl: account.user.avatarUrl,
    userStatus: account.user.status,
    role: account.role,
    roleTitle: account.roleTitle,
    membershipStatus: account.status,
    unitIds: account.unitScopes.map((scope) => scope.unitId),
    gradeIds: account.gradeScopes.map((scope) => scope.gradeId),
    subjectIds: account.subjectScopes.map((scope) => scope.subjectId),
    updatedAt: new Date(
      Math.max(account.updatedAt.getTime(), account.user.updatedAt.getTime()),
    ).toISOString(),
  };
}

function validateRoleScopes(input: {
  role: MembershipRole;
  unitIds: readonly string[];
  gradeIds: readonly string[];
  subjectIds: readonly string[];
}) {
  if (
    input.role === 'GRADE_TEACHER' &&
    input.subjectIds.length === 0 &&
    (input.unitIds.length > 0 || input.gradeIds.length > 0)
  )
    return;
  if (
    input.role === 'SUBJECT_TEACHER' &&
    input.unitIds.length === 0 &&
    input.gradeIds.length === 0 &&
    input.subjectIds.length > 0
  )
    return;
  if (
    input.role !== 'GRADE_TEACHER' &&
    input.role !== 'SUBJECT_TEACHER' &&
    input.unitIds.length === 0 &&
    input.gradeIds.length === 0 &&
    input.subjectIds.length === 0
  )
    return;
  throw new HttpError(
    400,
    'INVALID_MEMBERSHIP_SCOPES',
    'Membership scopes are not valid for the selected role.',
  );
}

async function validateOrganizationScopeIds(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  scopes: {
    unitIds: readonly string[];
    gradeIds: readonly string[];
    subjectIds: readonly string[];
  },
) {
  const unitIds = [...new Set(scopes.unitIds)];
  const gradeIds = [...new Set(scopes.gradeIds)];
  const subjectIds = [...new Set(scopes.subjectIds)];
  const [unitCount, gradeCount, subjectCount] = await Promise.all([
    transaction.unit.count({ where: { organizationId, id: { in: unitIds } } }),
    transaction.grade.count({
      where: { organizationId, id: { in: gradeIds } },
    }),
    transaction.subject.count({
      where: { organizationId, id: { in: subjectIds } },
    }),
  ]);
  if (
    unitCount !== unitIds.length ||
    gradeCount !== gradeIds.length ||
    subjectCount !== subjectIds.length
  ) {
    throw new HttpError(
      400,
      'INVALID_MEMBERSHIP_SCOPE_REFERENCE',
      'Every membership scope must belong to the organization.',
    );
  }
  return { unitIds, gradeIds, subjectIds };
}

async function replaceMembershipScopes(
  transaction: Prisma.TransactionClient,
  membershipId: string,
  scopes: {
    unitIds: readonly string[];
    gradeIds: readonly string[];
    subjectIds: readonly string[];
  },
) {
  await Promise.all([
    transaction.membershipUnit.deleteMany({ where: { membershipId } }),
    transaction.membershipGrade.deleteMany({ where: { membershipId } }),
    transaction.membershipSubject.deleteMany({ where: { membershipId } }),
  ]);
  await Promise.all([
    scopes.unitIds.length
      ? transaction.membershipUnit.createMany({
          data: scopes.unitIds.map((unitId) => ({ membershipId, unitId })),
        })
      : Promise.resolve(),
    scopes.gradeIds.length
      ? transaction.membershipGrade.createMany({
          data: scopes.gradeIds.map((gradeId) => ({ membershipId, gradeId })),
        })
      : Promise.resolve(),
    scopes.subjectIds.length
      ? transaction.membershipSubject.createMany({
          data: scopes.subjectIds.map((subjectId) => ({
            membershipId,
            subjectId,
          })),
        })
      : Promise.resolve(),
  ]);
}

export function createResourceRouter(
  prisma: PrismaClient,
  sessions: SessionService,
): Router {
  const router = createRouter();
  router.use(createRequiredAuthentication(sessions));

  router.get('/organizations', async (request, response, next) => {
    try {
      const organizationIds = requireAuth(request).memberships.map(
        (membership) => membership.organizationId,
      );
      const data = await prisma.organization.findMany({
        where: { id: { in: organizationIds }, status: 'ACTIVE' },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: { id: true, slug: true, name: true },
      });
      response.json(
        organizationsResponseSchema.parse({
          data,
          meta: { count: data.length },
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get(
    '/organizations/:organizationId/academic-years',
    async (request, response, next) => {
      try {
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAcademicCollectionAccess(membership, 'academicYears');
        const rows = await prisma.academicYear.findMany({
          where: { organizationId: request.params.organizationId },
          orderBy: [{ startsOn: 'desc' }, { id: 'asc' }],
        });
        const data = rows.map((row) => ({
          ...row,
          startsOn: isoDate(row.startsOn),
          endsOn: isoDate(row.endsOn),
        }));
        response.json(
          academicYearsResponseSchema.parse({
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
    '/organizations/:organizationId/semesters',
    async (request, response, next) => {
      try {
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAcademicCollectionAccess(membership, 'semesters');
        const rows = await prisma.semester.findMany({
          where: { organizationId: request.params.organizationId },
          orderBy: [
            { academicYear: { startsOn: 'desc' } },
            { position: 'asc' },
            { id: 'asc' },
          ],
        });
        const data = rows.map((row) => ({
          ...row,
          startsOn: isoDate(row.startsOn),
          endsOn: isoDate(row.endsOn),
        }));
        response.json(
          semestersResponseSchema.parse({
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
    '/organizations/:organizationId/units',
    async (request, response, next) => {
      try {
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAcademicCollectionAccess(membership, 'units');
        const where: Prisma.UnitWhereInput = {
          organizationId: request.params.organizationId,
        };
        if (!isLeadership(membership)) {
          if (membership.role === 'SUBJECT_TEACHER') {
            const data = await prisma.unit.findMany({
              where,
              orderBy: [{ name: 'asc' }, { id: 'asc' }],
            });
            response.json(
              unitsResponseSchema.parse({ data, meta: { count: data.length } }),
            );
            return;
          }
          const unitIds = new Set(membership.unitIds);
          if (membership.gradeIds.length) {
            const gradeUnits = await prisma.grade.findMany({
              where: {
                organizationId: request.params.organizationId,
                id: { in: membership.gradeIds },
              },
              select: { unitId: true },
            });
            gradeUnits.forEach((grade) => unitIds.add(grade.unitId));
          }
          if (!unitIds.size)
            throw new HttpError(
              403,
              'AUTHORIZATION_DENIED',
              'The request was denied.',
            );
          where.id = { in: [...unitIds] };
        }
        const data = await prisma.unit.findMany({
          where,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        });
        response.json(
          unitsResponseSchema.parse({ data, meta: { count: data.length } }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/grades',
    async (request, response, next) => {
      try {
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAcademicCollectionAccess(membership, 'grades');
        const where: Prisma.GradeWhereInput = {
          organizationId: request.params.organizationId,
        };
        if (!isLeadership(membership)) {
          if (membership.role === 'SUBJECT_TEACHER') {
            const data = await prisma.grade.findMany({
              where,
              orderBy: [{ position: 'asc' }, { id: 'asc' }],
            });
            response.json(
              gradesResponseSchema.parse({
                data,
                meta: { count: data.length },
              }),
            );
            return;
          }
          const scopes: Prisma.GradeWhereInput[] = [];
          if (membership.gradeIds.length)
            scopes.push({ id: { in: membership.gradeIds } });
          if (membership.unitIds.length)
            scopes.push({ unitId: { in: membership.unitIds } });
          if (!scopes.length)
            throw new HttpError(
              403,
              'AUTHORIZATION_DENIED',
              'The request was denied.',
            );
          where.OR = scopes;
        }
        const data = await prisma.grade.findMany({
          where,
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
        });
        response.json(
          gradesResponseSchema.parse({ data, meta: { count: data.length } }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/classes',
    async (request, response, next) => {
      try {
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAcademicCollectionAccess(membership, 'classes');
        const classScope = scopedClassWhere(membership);
        if (!classScope)
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        const data = await prisma.schoolClass.findMany({
          where: {
            organizationId: request.params.organizationId,
            ...classScope,
          },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        });
        response.json(
          classesResponseSchema.parse({ data, meta: { count: data.length } }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/subjects',
    async (request, response, next) => {
      try {
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAcademicCollectionAccess(membership, 'subjects');
        const where: Prisma.SubjectWhereInput = {
          organizationId: request.params.organizationId,
        };
        if (
          !isLeadership(membership) &&
          membership.role === 'SUBJECT_TEACHER'
        ) {
          if (!membership.subjectIds.length)
            throw new HttpError(
              403,
              'AUTHORIZATION_DENIED',
              'The request was denied.',
            );
          where.id = { in: membership.subjectIds };
        }
        const data = await prisma.subject.findMany({
          where,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        });
        response.json(
          subjectsResponseSchema.parse({ data, meta: { count: data.length } }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/accounts',
    async (request, response, next) => {
      try {
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireResourcePermission(membership, 'organization:admin');
        const rows = await prisma.membership.findMany({
          where: { organizationId: request.params.organizationId },
          orderBy: [{ user: { displayName: 'asc' } }, { id: 'asc' }],
          select: organizationAccountSelect,
        });
        const data = rows.map(mapOrganizationAccount);
        response.json(
          organizationAccountsResponseSchema.parse({
            data,
            meta: { count: data.length },
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/organizations/:organizationId/accounts',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const command = parseRequest(
          organizationAccountCreateCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireResourcePermission(membership, 'organization:admin');
        const result = await prisma.$transaction(async (transaction) => {
          const scopes = await validateOrganizationScopeIds(
            transaction,
            request.params.organizationId,
            {
              unitIds: command.unitIds ?? [],
              gradeIds: command.gradeIds ?? [],
              subjectIds: command.subjectIds ?? [],
            },
          );
          validateRoleScopes({ role: command.role, ...scopes });
          const email = command.email.toLowerCase();
          let user = await transaction.user.findUnique({
            where: { email },
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              status: true,
            },
          });
          if (user) {
            const existingMembership = await transaction.membership.findUnique({
              where: {
                organizationId_userId: {
                  organizationId: request.params.organizationId,
                  userId: user.id,
                },
              },
              select: { id: true },
            });
            if (existingMembership) {
              throw new HttpError(
                409,
                'MEMBERSHIP_ALREADY_EXISTS',
                'This user already has a membership in the organization.',
              );
            }
            if (user.status !== 'ACTIVE') {
              throw new HttpError(
                409,
                'USER_DISABLED',
                'A disabled user must be reactivated before adding a membership.',
              );
            }
          } else {
            user = await transaction.user.create({
              data: {
                email,
                displayName: command.displayName,
                avatarUrl: command.avatarUrl ?? null,
              },
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                status: true,
              },
            });
          }
          const created = await transaction.membership.create({
            data: {
              organizationId: request.params.organizationId,
              userId: user.id,
              role: command.role,
              roleTitle: command.roleTitle ?? null,
            },
            select: { id: true },
          });
          await replaceMembershipScopes(transaction, created.id, scopes);
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: request.params.organizationId,
            actorId: auth.userId,
            action: 'organization_account.create',
            targetType: 'Membership',
            targetId: created.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(command) },
          });
          return transaction.membership.findFirstOrThrow({
            where: {
              id: created.id,
              organizationId: request.params.organizationId,
            },
            select: organizationAccountSelect,
          });
        });
        response.status(201).json(
          organizationAccountMutationResponseSchema.parse({
            data: mapOrganizationAccount(result),
          }),
        );
      } catch (error) {
        if (asPrismaErrorCode(error) === 'P2002') {
          next(
            new HttpError(
              409,
              'ACCOUNT_CONFLICT',
              'The email or membership is already in use.',
            ),
          );
          return;
        }
        next(error);
      }
    },
  );

  router.patch(
    '/organizations/:organizationId/accounts/:membershipId',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, membershipId: uuidSchema })
            .strict(),
          request.params,
        );
        const command = parseRequest(
          organizationAccountUpdateCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const actorMembership = membershipFor(request, path.organizationId);
        requireResourcePermission(actorMembership, 'organization:admin');
        const result = await prisma.$transaction(async (transaction) => {
          const existing = await transaction.membership.findFirst({
            where: {
              id: path.membershipId,
              organizationId: path.organizationId,
            },
            select: organizationAccountSelect,
          });
          if (!existing) {
            throw new HttpError(
              404,
              'MEMBERSHIP_NOT_FOUND',
              'Membership not found.',
            );
          }
          if (
            existing.user.id === auth.userId &&
            (command.userStatus === 'DISABLED' ||
              command.membershipStatus === 'DISABLED' ||
              (command.role !== undefined && command.role !== 'DIRECTOR'))
          ) {
            throw new HttpError(
              409,
              'SELF_ADMIN_LOCKOUT',
              'You cannot disable or remove your own organization administration access.',
            );
          }
          const scopesRequested =
            command.unitIds !== undefined ||
            command.gradeIds !== undefined ||
            command.subjectIds !== undefined ||
            command.role !== undefined;
          const scopes = scopesRequested
            ? await validateOrganizationScopeIds(
                transaction,
                path.organizationId,
                {
                  unitIds:
                    command.unitIds ??
                    existing.unitScopes.map((scope) => scope.unitId),
                  gradeIds:
                    command.gradeIds ??
                    existing.gradeScopes.map((scope) => scope.gradeId),
                  subjectIds:
                    command.subjectIds ??
                    existing.subjectScopes.map((scope) => scope.subjectId),
                },
              )
            : undefined;
          if (scopes) {
            validateRoleScopes({
              role: command.role ?? existing.role,
              ...scopes,
            });
          }
          const normalizedEmail = command.email?.toLowerCase();
          const userData = {
            ...(normalizedEmail !== undefined &&
            normalizedEmail !== existing.user.email
              ? { email: normalizedEmail }
              : {}),
            ...(command.displayName !== undefined &&
            command.displayName !== existing.user.displayName
              ? { displayName: command.displayName }
              : {}),
            ...(command.avatarUrl !== undefined &&
            command.avatarUrl !== existing.user.avatarUrl
              ? { avatarUrl: command.avatarUrl }
              : {}),
            ...(command.userStatus !== undefined &&
            command.userStatus !== existing.user.status
              ? { status: command.userStatus }
              : {}),
          };
          if (Object.keys(userData).length) {
            const otherOrganizationMemberships =
              await transaction.membership.count({
                where: {
                  userId: existing.user.id,
                  organizationId: { not: path.organizationId },
                },
              });
            if (otherOrganizationMemberships > 0) {
              throw new HttpError(
                409,
                'SHARED_USER_IDENTITY_CONFLICT',
                'Global identity fields cannot be changed from one organization while the user belongs to another organization.',
              );
            }
            await transaction.user.update({
              where: { id: existing.user.id },
              data: userData,
            });
          }
          const membershipData = {
            ...(command.role !== undefined ? { role: command.role } : {}),
            ...(command.roleTitle !== undefined
              ? { roleTitle: command.roleTitle }
              : {}),
            ...(command.membershipStatus !== undefined
              ? { status: command.membershipStatus }
              : {}),
          };
          if (Object.keys(membershipData).length || scopes) {
            // Same-value role write ensures @updatedAt reflects scope-only changes.
            await transaction.membership.update({
              where: { id: existing.id },
              data: Object.keys(membershipData).length
                ? membershipData
                : { role: existing.role },
            });
          }
          if (scopes) {
            await replaceMembershipScopes(transaction, existing.id, scopes);
          }
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'organization_account.update',
            targetType: 'Membership',
            targetId: existing.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(command) },
          });
          return transaction.membership.findFirstOrThrow({
            where: { id: existing.id, organizationId: path.organizationId },
            select: organizationAccountSelect,
          });
        });
        response.json(
          organizationAccountMutationResponseSchema.parse({
            data: mapOrganizationAccount(result),
          }),
        );
      } catch (error) {
        if (asPrismaErrorCode(error) === 'P2002') {
          next(
            new HttpError(
              409,
              'ACCOUNT_CONFLICT',
              'The email or membership is already in use.',
            ),
          );
          return;
        }
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/staff',
    async (request, response, next) => {
      try {
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireResourcePermission(membership, 'staff-directory:read');
        const rows = await prisma.membership.findMany({
          where: {
            organizationId: request.params.organizationId,
            status: 'ACTIVE',
            user: { status: 'ACTIVE' },
          },
          orderBy: [{ user: { displayName: 'asc' } }, { id: 'asc' }],
          select: {
            id: true,
            organizationId: true,
            role: true,
            roleTitle: true,
            status: true,
            user: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
          },
        });
        const data = rows.map((row) => ({
          membershipId: row.id,
          userId: row.user.id,
          organizationId: row.organizationId,
          displayName: row.user.displayName,
          avatarUrl: row.user.avatarUrl,
          role: row.role,
          roleTitle: row.roleTitle,
          status: row.status,
        }));
        response.json(
          staffDirectoryResponseSchema.parse({
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
    '/organizations/:organizationId/students',
    async (request, response, next) => {
      try {
        const query = parseRequest(studentListQuerySchema, request.query);
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        const schoolDate = dateAtUtcMidnight(
          query.schoolDate ?? new Date().toISOString().slice(0, 10),
        );
        const enrollmentFilter: Prisma.EnrollmentWhereInput = {
          ...activeEnrollmentWhere(schoolDate),
          ...(query.classId ? { classId: query.classId } : {}),
          ...(query.unitId || query.gradeId
            ? {
                schoolClass: {
                  ...(query.unitId ? { unitId: query.unitId } : {}),
                  ...(query.gradeId ? { gradeId: query.gradeId } : {}),
                },
              }
            : {}),
        };
        const scope = studentScopeWhere(
          membership,
          schoolDate,
          enrollmentFilter,
        );
        if (!scope)
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        const authorizedClassScope =
          membership.role === 'GRADE_TEACHER'
            ? (scopedClassWhere(membership) ?? {})
            : {};
        const selectedEnrollmentFilter: Prisma.EnrollmentWhereInput = {
          ...(query.classId ? { classId: query.classId } : {}),
          ...(Object.keys(authorizedClassScope).length ||
          query.unitId ||
          query.gradeId
            ? {
                schoolClass: {
                  ...authorizedClassScope,
                  ...(query.unitId ? { unitId: query.unitId } : {}),
                  ...(query.gradeId ? { gradeId: query.gradeId } : {}),
                },
              }
            : {}),
        };
        const rows = await prisma.student.findMany({
          where: {
            organizationId: request.params.organizationId,
            status: 'ACTIVE',
            ...scope,
            ...(membership.role === 'GRADE_TEACHER' ||
            !(query.classId || query.unitId || query.gradeId)
              ? {}
              : { enrollments: { some: enrollmentFilter } }),
          },
          orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
          select: studentSelect(schoolDate, selectedEnrollmentFilter),
        });
        const data = rows.map(mapStudent);
        response.json(
          studentsResponseSchema.parse({ data, meta: { count: data.length } }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/students/:studentId',
    async (request, response, next) => {
      try {
        const query = parseRequest(
          studentListQuerySchema.pick({ schoolDate: true }),
          request.query,
        );
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        const schoolDate = dateAtUtcMidnight(
          query.schoolDate ?? new Date().toISOString().slice(0, 10),
        );
        const scope = studentScopeWhere(membership, schoolDate);
        if (!scope)
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        const authorizedClassScope =
          membership.role === 'GRADE_TEACHER'
            ? (scopedClassWhere(membership) ?? {})
            : {};
        requireResourcePermission(membership, 'student:sensitive-read');
        const row = await prisma.student.findFirst({
          where: {
            id: request.params.studentId,
            organizationId: request.params.organizationId,
            status: 'ACTIVE',
            ...scope,
          },
          select: {
            ...studentSelect(
              schoolDate,
              Object.keys(authorizedClassScope).length
                ? { schoolClass: authorizedClassScope }
                : {},
            ),
            address: true,
            guardians: {
              orderBy: [
                { isPrimary: 'desc' as const },
                { name: 'asc' as const },
              ],
              select: {
                id: true,
                name: true,
                relationship: true,
                phone: true,
                email: true,
                address: true,
                isPrimary: true,
              },
            },
          },
        });
        if (!row)
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        response.json(
          studentDetailResponseSchema.parse({ data: mapStudentDetail(row) }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/organizations/:organizationId/students',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const command = parseRequest(studentCreateCommandSchema, request.body);
        const auth = requireAuth(request);
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireResourcePermission(membership, 'student:admin');
        const responseDate = command.activeEnrollment?.startsOn
          ? dateAtUtcMidnight(command.activeEnrollment.startsOn)
          : new Date();
        const result = await prisma.$transaction(async (transaction) => {
          const enrollmentDates = command.activeEnrollment
            ? await validateEnrollmentCommand(
                transaction,
                request.params.organizationId,
                command.activeEnrollment,
              )
            : undefined;
          const student = await transaction.student.create({
            data: {
              organizationId: request.params.organizationId,
              studentNumber: command.studentNumber,
              fullName: command.fullName,
              nickname: command.nickname ?? null,
              gender: command.gender,
              dateOfBirth: dateAtUtcMidnight(command.dateOfBirth),
              address: command.address ?? null,
              specialNeedsFlag: command.specialNeedsFlag ?? false,
              status: command.status ?? 'ACTIVE',
              avatarUrl: command.avatarUrl ?? null,
              primaryClassification: command.primaryClassification ?? null,
              currentPlacement: command.currentPlacement ?? null,
            },
            select: { id: true },
          });
          if (command.activeEnrollment && enrollmentDates) {
            await transaction.enrollment.create({
              data: {
                organizationId: request.params.organizationId,
                studentId: student.id,
                academicYearId: command.activeEnrollment.academicYearId,
                classId: command.activeEnrollment.classId,
                startsOn: enrollmentDates.startsOn,
                endsOn: enrollmentDates.endsOn,
              },
            });
          }
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: request.params.organizationId,
            actorId: auth.userId,
            action: 'student.create',
            targetType: 'Student',
            targetId: student.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(command) },
          });
          return transaction.student.findFirstOrThrow({
            where: {
              id: student.id,
              organizationId: request.params.organizationId,
            },
            select: studentMutationSelect(responseDate),
          });
        });
        response.status(201).json(
          studentMutationResponseSchema.parse({
            data: mapStudentDetail(result),
          }),
        );
      } catch (error) {
        if (asPrismaErrorCode(error) === 'P2002') {
          next(
            new HttpError(
              409,
              'STUDENT_NUMBER_CONFLICT',
              'The student number is already in use.',
            ),
          );
          return;
        }
        next(error);
      }
    },
  );

  router.patch(
    '/organizations/:organizationId/students/:studentId',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const command = parseRequest(studentUpdateCommandSchema, request.body);
        const auth = requireAuth(request);
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireResourcePermission(membership, 'student:admin');
        const responseDate = command.activeEnrollment?.startsOn
          ? dateAtUtcMidnight(command.activeEnrollment.startsOn)
          : new Date();
        const result = await prisma.$transaction(async (transaction) => {
          const existing = await transaction.student.findFirst({
            where: {
              id: request.params.studentId,
              organizationId: request.params.organizationId,
            },
            select: { id: true },
          });
          if (!existing) {
            throw new HttpError(404, 'STUDENT_NOT_FOUND', 'Student not found.');
          }
          const enrollmentDates = command.activeEnrollment
            ? await validateEnrollmentCommand(
                transaction,
                request.params.organizationId,
                command.activeEnrollment,
              )
            : undefined;
          const { activeEnrollment, ...studentFields } = command;
          await transaction.student.update({
            where: { id: existing.id },
            data: {
              ...studentFields,
              ...(studentFields.dateOfBirth
                ? { dateOfBirth: dateAtUtcMidnight(studentFields.dateOfBirth) }
                : {}),
            },
          });
          if (activeEnrollment && enrollmentDates) {
            const sameEnrollment = await transaction.enrollment.findFirst({
              where: {
                organizationId: request.params.organizationId,
                studentId: existing.id,
                academicYearId: activeEnrollment.academicYearId,
                classId: activeEnrollment.classId,
                startsOn: enrollmentDates.startsOn,
              },
              select: { id: true },
            });
            const sameDayConflict = await transaction.enrollment.findFirst({
              where: {
                organizationId: request.params.organizationId,
                studentId: existing.id,
                startsOn: enrollmentDates.startsOn,
                ...(sameEnrollment ? { id: { not: sameEnrollment.id } } : {}),
              },
              select: { id: true },
            });
            if (sameDayConflict) {
              throw new HttpError(
                409,
                'ENROLLMENT_START_CONFLICT',
                'A different enrollment already starts on that date.',
              );
            }
            const previousDay = new Date(
              enrollmentDates.startsOn.getTime() - 24 * 60 * 60 * 1000,
            );
            await transaction.enrollment.updateMany({
              where: {
                organizationId: request.params.organizationId,
                studentId: existing.id,
                ...(sameEnrollment ? { id: { not: sameEnrollment.id } } : {}),
                startsOn: { lt: enrollmentDates.startsOn },
                OR: [
                  { endsOn: null },
                  { endsOn: { gte: enrollmentDates.startsOn } },
                ],
              },
              data: { endsOn: previousDay },
            });
            if (sameEnrollment) {
              await transaction.enrollment.update({
                where: { id: sameEnrollment.id },
                data: { endsOn: enrollmentDates.endsOn },
              });
            } else {
              await transaction.enrollment.create({
                data: {
                  organizationId: request.params.organizationId,
                  studentId: existing.id,
                  academicYearId: activeEnrollment.academicYearId,
                  classId: activeEnrollment.classId,
                  startsOn: enrollmentDates.startsOn,
                  endsOn: enrollmentDates.endsOn,
                },
              });
            }
          }
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: request.params.organizationId,
            actorId: auth.userId,
            action: 'student.update',
            targetType: 'Student',
            targetId: existing.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(command) },
          });
          return transaction.student.findFirstOrThrow({
            where: {
              id: existing.id,
              organizationId: request.params.organizationId,
            },
            select: studentMutationSelect(responseDate),
          });
        });
        response.json(
          studentMutationResponseSchema.parse({
            data: mapStudentDetail(result),
          }),
        );
      } catch (error) {
        if (asPrismaErrorCode(error) === 'P2002') {
          next(
            new HttpError(
              409,
              'STUDENT_NUMBER_CONFLICT',
              'The student number is already in use.',
            ),
          );
          return;
        }
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/gpk-assignments',
    async (request, response, next) => {
      try {
        const query = parseRequest(gpkAssignmentQuerySchema, request.query);
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireResourcePermission(membership, 'staff-assignment:admin');
        const schoolDate = dateAtUtcMidnight(
          query.schoolDate ?? new Date().toISOString().slice(0, 10),
        );
        const rows = await prisma.staffStudentAssignment.findMany({
          where: {
            organizationId: request.params.organizationId,
            roleContext: GPK_ROLE_CONTEXT,
            startsOn: { lte: schoolDate },
            OR: [{ endsOn: null }, { endsOn: { gte: schoolDate } }],
            ...(query.studentId ? { studentId: query.studentId } : {}),
            ...(query.membershipId ? { membershipId: query.membershipId } : {}),
            membership: { status: 'ACTIVE', role: 'SPECIAL_ED_TEACHER' },
            student: { status: 'ACTIVE' },
          },
          orderBy: [
            { student: { fullName: 'asc' } },
            { startsOn: 'desc' },
            { id: 'asc' },
          ],
          select: {
            id: true,
            organizationId: true,
            studentId: true,
            roleContext: true,
            startsOn: true,
            endsOn: true,
            maxCaseload: true,
            membership: {
              select: {
                id: true,
                roleTitle: true,
                user: {
                  select: { id: true, displayName: true, avatarUrl: true },
                },
              },
            },
            student: {
              select: {
                id: true,
                organizationId: true,
                studentNumber: true,
                fullName: true,
                nickname: true,
                avatarUrl: true,
              },
            },
          },
        });
        const data = rows.map((row) => ({
          ...mapGpkAssignment(row),
          student: row.student,
        }));
        response.json(
          gpkAssignmentsResponseSchema.parse({
            data,
            meta: { count: data.length },
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.put(
    '/organizations/:organizationId/students/:studentId/gpk-assignment',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const command = parseRequest(
          gpkAssignmentUpsertCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, studentId: uuidSchema })
            .strict(),
          request.params,
        );
        const membership = membershipFor(request, path.organizationId);
        requireResourcePermission(membership, 'staff-assignment:admin');
        const startsOn = dateAtUtcMidnight(command.startsOn);
        const endsOn = command.endsOn
          ? dateAtUtcMidnight(command.endsOn)
          : null;
        const result = await prisma.$transaction(
          async (transaction) => {
            const lockedStudents = await transaction.$queryRaw<
              Array<{ id: string; specialNeedsFlag: boolean }>
            >(Prisma.sql`
              SELECT id, "specialNeedsFlag"
              FROM "Student"
              WHERE id = ${path.studentId}::uuid
                AND "organizationId" = ${path.organizationId}::uuid
                AND status = 'ACTIVE'
              FOR UPDATE
            `);
            const student = lockedStudents[0];
            if (!student) {
              throw new HttpError(
                404,
                'STUDENT_NOT_FOUND',
                'Student not found.',
              );
            }
            if (!student.specialNeedsFlag) {
              throw new HttpError(
                400,
                'GPK_STUDENT_NOT_ELIGIBLE',
                'GPK assignments require specialNeedsFlag.',
              );
            }
            const lockedMemberships = await transaction.$queryRaw<
              Array<{ id: string }>
            >(Prisma.sql`
              SELECT id
              FROM "Membership"
              WHERE id = ${command.membershipId}::uuid
                AND "organizationId" = ${request.params.organizationId}::uuid
                AND status = 'ACTIVE'
                AND role = 'SPECIAL_ED_TEACHER'
              FOR UPDATE
            `);
            if (!lockedMemberships.length) {
              throw new HttpError(
                400,
                'INVALID_GPK_MEMBERSHIP',
                'The target must be an active special education teacher membership in the organization.',
              );
            }

            const overlaps = await transaction.staffStudentAssignment.findMany({
              where: {
                organizationId: request.params.organizationId,
                studentId: student.id,
                roleContext: GPK_ROLE_CONTEXT,
                ...assignmentOverlapWhere(startsOn, endsOn),
              },
              orderBy: [{ startsOn: 'desc' }, { id: 'asc' }],
              select: {
                id: true,
                membershipId: true,
                startsOn: true,
                endsOn: true,
              },
            });
            const exact = overlaps.find(
              (assignment) =>
                assignment.startsOn.getTime() === startsOn.getTime(),
            );
            const futureOverlap = overlaps.find(
              (assignment) => assignment.startsOn > startsOn,
            );
            if (futureOverlap) {
              throw new HttpError(
                409,
                'GPK_ASSIGNMENT_OVERLAP',
                'The requested assignment overlaps a future GPK assignment.',
              );
            }

            // This default is currently the authoritative configured GPK limit;
            // persisted maxCaseload mirrors the same enforcement value.
            const capacityRows =
              await transaction.staffStudentAssignment.findMany({
                where: {
                  organizationId: request.params.organizationId,
                  membershipId: command.membershipId,
                  roleContext: GPK_ROLE_CONTEXT,
                  studentId: { not: student.id },
                  ...assignmentOverlapWhere(startsOn, endsOn),
                },
                distinct: ['studentId'],
                select: { studentId: true },
              });
            if (capacityRows.length >= DEFAULT_GPK_MAX_CASELOAD) {
              throw new HttpError(
                409,
                'GPK_CASELOAD_CAPACITY',
                'The GPK teacher has reached the configured caseload limit.',
              );
            }

            const previousDay = new Date(
              startsOn.getTime() - 24 * 60 * 60 * 1000,
            );
            await transaction.staffStudentAssignment.updateMany({
              where: {
                id: {
                  in: overlaps
                    .filter((row) => row.id !== exact?.id)
                    .map((row) => row.id),
                },
                startsOn: { lt: startsOn },
              },
              data: { endsOn: previousDay },
            });

            const saved = exact
              ? await transaction.staffStudentAssignment.update({
                  where: { id: exact.id },
                  data: {
                    membershipId: command.membershipId,
                    endsOn,
                    maxCaseload: DEFAULT_GPK_MAX_CASELOAD,
                  },
                  select: { id: true },
                })
              : await transaction.staffStudentAssignment.create({
                  data: {
                    organizationId: request.params.organizationId,
                    membershipId: command.membershipId,
                    studentId: student.id,
                    roleContext: GPK_ROLE_CONTEXT,
                    startsOn,
                    endsOn,
                    maxCaseload: DEFAULT_GPK_MAX_CASELOAD,
                  },
                  select: { id: true },
                });
            await createAuditRepository(transaction as PrismaClient).append({
              organizationId: request.params.organizationId,
              actorId: auth.userId,
              action: 'gpk_assignment.upsert',
              targetType: 'StaffStudentAssignment',
              targetId: saved.id,
              requestId: String(response.locals.requestId),
              result: 'SUCCEEDED',
              metadata: {
                changedFields: [
                  'membershipId',
                  'startsOn',
                  'endsOn',
                  'maxCaseload',
                ],
              },
            });
            return loadAssignmentForResponse(
              transaction,
              request.params.organizationId,
              saved.id,
            );
          },
          { isolationLevel: 'Serializable' },
        );
        response.json(
          gpkAssignmentMutationResponseSchema.parse({ data: result }),
        );
      } catch (error) {
        if (assignmentConflictCodes.has(asPrismaErrorCode(error) ?? '')) {
          next(
            new HttpError(
              409,
              'GPK_ASSIGNMENT_CONFLICT',
              'The GPK assignment conflicted with another request.',
            ),
          );
          return;
        }
        next(error);
      }
    },
  );

  router.post(
    '/organizations/:organizationId/gpk-assignments/:assignmentId/end',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const command = parseRequest(
          gpkAssignmentEndCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const path = parseRequest(
          z
            .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
            .strict(),
          request.params,
        );
        const membership = membershipFor(request, path.organizationId);
        requireResourcePermission(membership, 'staff-assignment:admin');
        const endsOn = dateAtUtcMidnight(command.endsOn);
        const result = await prisma.$transaction(async (transaction) => {
          const assignment = await transaction.staffStudentAssignment.findFirst(
            {
              where: {
                id: path.assignmentId,
                organizationId: path.organizationId,
                roleContext: GPK_ROLE_CONTEXT,
              },
              select: { id: true, startsOn: true, endsOn: true },
            },
          );
          if (!assignment) {
            throw new HttpError(
              404,
              'GPK_ASSIGNMENT_NOT_FOUND',
              'GPK assignment not found.',
            );
          }
          if (endsOn < assignment.startsOn) {
            throw new HttpError(
              400,
              'INVALID_GPK_ASSIGNMENT_DATES',
              'endsOn must be on or after startsOn.',
            );
          }
          if (assignment.endsOn && endsOn > assignment.endsOn) {
            throw new HttpError(
              409,
              'GPK_ASSIGNMENT_ALREADY_ENDED',
              'An ended GPK assignment cannot be extended by the end command.',
            );
          }
          await transaction.staffStudentAssignment.update({
            where: { id: assignment.id },
            data: { endsOn },
          });
          await createAuditRepository(transaction as PrismaClient).append({
            organizationId: path.organizationId,
            actorId: auth.userId,
            action: 'gpk_assignment.end',
            targetType: 'StaffStudentAssignment',
            targetId: assignment.id,
            requestId: String(response.locals.requestId),
            result: 'SUCCEEDED',
            metadata: { changedFields: ['endsOn'] },
          });
          return loadAssignmentForResponse(
            transaction,
            path.organizationId,
            assignment.id,
          );
        });
        response.json(
          gpkAssignmentMutationResponseSchema.parse({ data: result }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/organizations/:organizationId/classes/:classId/attendance',
    async (request, response, next) => {
      try {
        const query = parseRequest(attendanceQuerySchema, request.query);
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAttendancePermission(membership, 'attendance:read');
        const classScope = scopedClassWhere(membership);
        if (!classScope)
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        const schoolDate = dateAtUtcMidnight(query.schoolDate);
        const schoolClass = await prisma.schoolClass.findFirst({
          where: {
            id: request.params.classId,
            organizationId: request.params.organizationId,
            ...classScope,
          },
        });
        if (!schoolClass)
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        const roster = await prisma.enrollment.findMany({
          where: {
            organizationId: request.params.organizationId,
            classId: request.params.classId,
            ...activeEnrollmentWhere(schoolDate),
            student: { status: 'ACTIVE' },
          },
          orderBy: [{ student: { fullName: 'asc' } }, { id: 'asc' }],
          select: {
            id: true,
            student: {
              select: {
                id: true,
                organizationId: true,
                studentNumber: true,
                fullName: true,
                nickname: true,
                avatarUrl: true,
              },
            },
          },
        });
        const attendance = await prisma.attendanceRecord.findMany({
          where: {
            organizationId: request.params.organizationId,
            classId: request.params.classId,
            schoolDate,
          },
          orderBy: { id: 'asc' },
        });
        const byStudent = new Map(
          attendance.map((record) => [record.studentId, record]),
        );
        response.json(
          attendanceRosterResponseSchema.parse({
            data: {
              organizationId: request.params.organizationId,
              class: schoolClass,
              schoolDate: query.schoolDate,
              version: attendanceVersion(attendance),
              roster: roster.map((enrollment) => {
                const record = byStudent.get(enrollment.student.id);
                return {
                  student: enrollment.student,
                  enrollmentId: enrollment.id,
                  attendance: record
                    ? {
                        id: record.id,
                        status: record.status,
                        minutesLate: record.minutesLate,
                        notes: record.notes,
                        updatedAt: record.updatedAt.toISOString(),
                      }
                    : null,
                };
              }),
            },
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.put(
    '/organizations/:organizationId/classes/:classId/attendance',
    createCsrfProtection(),
    async (request, response, next) => {
      try {
        const command = parseRequest(
          attendanceBulkSaveCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const membership = membershipFor(
          request,
          request.params.organizationId,
        );
        requireAttendancePermission(membership, 'attendance:write');
        const classScope = scopedClassWhere(membership);
        if (!classScope)
          throw new HttpError(
            403,
            'AUTHORIZATION_DENIED',
            'The request was denied.',
          );
        const schoolDate = dateAtUtcMidnight(command.schoolDate);
        const result = await prisma.$transaction(
          async (transaction) => {
            const schoolClass = await transaction.schoolClass.findFirst({
              where: {
                id: request.params.classId,
                organizationId: request.params.organizationId,
                ...classScope,
              },
              select: { id: true },
            });
            if (!schoolClass)
              throw new HttpError(
                403,
                'AUTHORIZATION_DENIED',
                'The request was denied.',
              );
            const existing = await transaction.attendanceRecord.findMany({
              where: {
                organizationId: request.params.organizationId,
                classId: request.params.classId,
                schoolDate,
              },
              select: { updatedAt: true },
            });
            if (attendanceVersion(existing) !== command.expectedVersion) {
              throw new HttpError(
                409,
                'ATTENDANCE_VERSION_CONFLICT',
                'Attendance was changed by another request.',
              );
            }
            const enrollments = await transaction.enrollment.findMany({
              where: {
                organizationId: request.params.organizationId,
                classId: request.params.classId,
                studentId: {
                  in: command.records.map((record) => record.studentId),
                },
                ...activeEnrollmentWhere(schoolDate),
                student: { status: 'ACTIVE' },
              },
              select: { id: true, studentId: true },
            });
            const enrollmentByStudent = new Map(
              enrollments.map((enrollment) => [
                enrollment.studentId,
                enrollment.id,
              ]),
            );
            if (enrollmentByStudent.size !== command.records.length) {
              throw new HttpError(
                400,
                'STUDENT_NOT_IN_CLASS',
                'Every student must be actively enrolled in the class on schoolDate.',
              );
            }
            for (const record of command.records) {
              await transaction.attendanceRecord.upsert({
                where: {
                  organizationId_studentId_classId_schoolDate: {
                    organizationId: request.params.organizationId,
                    studentId: record.studentId,
                    classId: request.params.classId,
                    schoolDate,
                  },
                },
                update: {
                  enrollmentId: enrollmentByStudent.get(record.studentId)!,
                  status: record.status as AttendanceStatus,
                  minutesLate:
                    record.status === 'LATE' ? record.minutesLate : null,
                  notes: record.notes ?? null,
                  recordedById: auth.userId,
                },
                create: {
                  organizationId: request.params.organizationId,
                  studentId: record.studentId,
                  enrollmentId: enrollmentByStudent.get(record.studentId)!,
                  classId: request.params.classId,
                  schoolDate,
                  status: record.status as AttendanceStatus,
                  minutesLate:
                    record.status === 'LATE' ? record.minutesLate : null,
                  notes: record.notes ?? null,
                  recordedById: auth.userId,
                },
              });
            }
            await createAuditRepository(transaction as PrismaClient).append({
              organizationId: request.params.organizationId,
              actorId: auth.userId,
              action: 'attendance.bulk_upsert',
              targetType: 'SchoolClassAttendance',
              targetId: request.params.classId,
              requestId: String(response.locals.requestId),
              result: 'SUCCEEDED',
              metadata: { changedFields: ['status', 'minutesLate', 'notes'] },
            });
            const saved = await transaction.attendanceRecord.findMany({
              where: {
                organizationId: request.params.organizationId,
                classId: request.params.classId,
                schoolDate,
              },
              select: { updatedAt: true },
            });
            return {
              schoolDate: command.schoolDate,
              version: attendanceVersion(saved),
              savedCount: command.records.length,
            };
          },
          { isolationLevel: 'Serializable' },
        );
        response.json(attendanceBulkSaveResponseSchema.parse({ data: result }));
      } catch (error) {
        if (serializableConflictCodes.has(asPrismaErrorCode(error) ?? '')) {
          next(
            new HttpError(
              409,
              'ATTENDANCE_VERSION_CONFLICT',
              'Attendance was changed by another request.',
            ),
          );
          return;
        }
        next(error);
      }
    },
  );

  return router;
}
