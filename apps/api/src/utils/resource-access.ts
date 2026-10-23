import { Prisma, type MembershipRole } from '@prisma/client';
import {
  AuthorizationDeniedError,
  requireOrganizationScope,
  requirePermission,
  type MembershipScope,
} from '../utils/authorization.js';
import type { AuthenticatedRequest, HttpRequest } from '../type/http.js';
import { HttpError } from '../middleware/http-errors.js';

const leadershipRoles: readonly MembershipRole[] = ['DIRECTOR', 'PRINCIPAL'];
const assignedStudentRoles: readonly MembershipRole[] = [
  'SPECIAL_ED_COORDINATOR',
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
];

export function requireResourceAuth(
  request: HttpRequest,
): NonNullable<AuthenticatedRequest['auth']> {
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

export function resourceMembershipFor(
  request: HttpRequest,
  organizationId: string,
): MembershipScope {
  try {
    return requireOrganizationScope(
      requireResourceAuth(request).memberships,
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

export function requireResourcePermission(
  membership: MembershipScope,
  permission:
    | 'student:admin'
    | 'student:sensitive-read'
    | 'staff-directory:read'
    | 'staff-assignment:admin'
    | 'organization:admin',
): void {
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

export function isLeadership(membership: MembershipScope): boolean {
  return leadershipRoles.includes(membership.role);
}

export function requireAcademicCollectionAccess(
  membership: MembershipScope,
  resource:
    'academicYears' | 'semesters' | 'units' | 'grades' | 'classes' | 'subjects',
): void {
  if (isLeadership(membership) || membership.role === 'GRADE_TEACHER') return;
  if (membership.role === 'SUBJECT_TEACHER' && resource !== 'classes') {
    return;
  }
  throw new HttpError(403, 'AUTHORIZATION_DENIED', 'The request was denied.');
}

export function scopedClassWhere(
  membership: MembershipScope,
): Prisma.SchoolClassWhereInput | undefined {
  if (isLeadership(membership)) return {};
  if (membership.role === 'GRADE_TEACHER') {
    const scopes: Prisma.SchoolClassWhereInput[] = [];
    if (membership.unitIds.length) {
      scopes.push({ unitId: { in: membership.unitIds } });
    }
    if (membership.gradeIds.length) {
      scopes.push({ gradeId: { in: membership.gradeIds } });
    }
    return scopes.length ? { OR: scopes } : undefined;
  }
  return undefined;
}

export function activeEnrollmentWhere(
  schoolDate: Date,
): Prisma.EnrollmentWhereInput {
  return {
    startsOn: { lte: schoolDate },
    OR: [{ endsOn: null }, { endsOn: { gte: schoolDate } }],
  };
}

export function studentScopeWhere(
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
              scope.organizationId === membership.organizationId &&
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
