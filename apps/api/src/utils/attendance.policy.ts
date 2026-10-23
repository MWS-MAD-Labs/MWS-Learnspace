import { Prisma } from '@prisma/client';
import {
  AuthorizationDeniedError,
  membershipHasPermission,
  requireOrganizationScope,
  requirePermission,
  type MembershipScope,
} from '../utils/authorization.js';
import { HttpError } from '../middleware/http-errors.js';

function deny(): never {
  throw new HttpError(403, 'AUTHORIZATION_DENIED', 'The request was denied.');
}

export function attendanceMembershipFor(
  memberships: readonly MembershipScope[],
  organizationId: string,
): MembershipScope {
  try {
    return requireOrganizationScope(memberships, organizationId);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) deny();
    throw error;
  }
}

export function requireAttendanceClassScope(
  membership: MembershipScope,
  permission: 'attendance:read' | 'attendance:write',
): Prisma.SchoolClassWhereInput {
  try {
    requirePermission(membership, permission);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) deny();
    throw error;
  }

  if (membershipHasPermission(membership, 'scope.organization')) return {};
  if (!membershipHasPermission(membership, 'scope.grade')) deny();

  const scopes: Prisma.SchoolClassWhereInput[] = [];
  if (membership.unitIds.length)
    scopes.push({ unitId: { in: membership.unitIds } });
  if (membership.gradeIds.length)
    scopes.push({ gradeId: { in: membership.gradeIds } });
  if (!scopes.length) deny();
  return { OR: scopes };
}
