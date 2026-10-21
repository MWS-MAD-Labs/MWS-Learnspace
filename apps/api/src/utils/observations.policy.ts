import type { Request } from 'express';
import {
  AuthorizationDeniedError,
  requireOrganizationScope,
  requirePermission,
  type MembershipScope,
} from '../utils/authorization.js';
import type { AuthenticatedRequest } from '../type/http.js';
import { HttpError } from '../middleware/http-errors.js';

export function requireAuth(request: Request) {
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

export function deny(): never {
  throw new HttpError(403, 'AUTHORIZATION_DENIED', 'The request was denied.');
}

export function membershipFor(request: Request, organizationId: string) {
  try {
    return requireOrganizationScope(
      requireAuth(request).memberships,
      organizationId,
    );
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) deny();
    throw error;
  }
}

export function requireObservationPermission(
  membership: MembershipScope,
  permission: 'special-ed:read' | 'special-ed:write' | 'observation:manage',
) {
  try {
    requirePermission(membership, permission);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) deny();
    throw error;
  }
}

export function canReadObservationStudent(
  membership: MembershipScope,
  studentId: string,
  observationDate: Date,
): boolean {
  if (membership.role === 'SPECIAL_ED_COORDINATOR') return true;
  return (membership.assignedStudentScopes ?? []).some(
    (scope) =>
      scope.organizationId === membership.organizationId &&
      scope.studentId === studentId &&
      scope.startsOn <= observationDate &&
      (scope.endsOn === null || scope.endsOn >= observationDate),
  );
}
