import { Prisma } from '@prisma/client';
import {
  AuthorizationDeniedError,
  membershipHasPermission,
  requireOrganizationScope,
  requirePermission,
  type MembershipScope,
} from '../utils/authorization.js';
import type { AuthenticatedRequest, HttpRequest } from '../type/http.js';
import { HttpError } from '../middleware/http-errors.js';

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
  return membershipHasPermission(membership, 'scope.organization');
}

export function requireAcademicCollectionAccess(
  membership: MembershipScope,
  resource:
    'academicYears' | 'semesters' | 'units' | 'grades' | 'classes' | 'subjects',
): void {
  if (
    isLeadership(membership) ||
    membershipHasPermission(membership, 'scope.grade')
  )
    return;
  if (
    membershipHasPermission(membership, 'scope.subject') &&
    resource !== 'classes'
  ) {
    return;
  }
  throw new HttpError(403, 'AUTHORIZATION_DENIED', 'The request was denied.');
}

export function scopedClassWhere(
  membership: MembershipScope,
): Prisma.SchoolClassWhereInput | undefined {
  if (isLeadership(membership)) return {};
  if (membershipHasPermission(membership, 'scope.grade')) {
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
  if (membershipHasPermission(membership, 'scope.special-ed')) {
    return { specialNeedsFlag: true };
  }
  if (membershipHasPermission(membership, 'scope.grade')) {
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
  if (
    membershipHasPermission(membership, 'scope.special-ed') ||
    membershipHasPermission(membership, 'scope.assigned')
  ) {
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
