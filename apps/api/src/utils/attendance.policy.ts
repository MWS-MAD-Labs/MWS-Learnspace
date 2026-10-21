import { Prisma, type MembershipRole } from '@prisma/client';
import {
  AuthorizationDeniedError,
  requireOrganizationScope,
  requirePermission,
  type MembershipScope,
} from '../utils/authorization.js';
import { HttpError } from '../middleware/http-errors.js';

const leadershipRoles: readonly MembershipRole[] = ['DIRECTOR', 'PRINCIPAL'];

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

  if (leadershipRoles.includes(membership.role)) return {};
  if (membership.role !== 'GRADE_TEACHER') deny();

  const scopes: Prisma.SchoolClassWhereInput[] = [];
  if (membership.unitIds.length)
    scopes.push({ unitId: { in: membership.unitIds } });
  if (membership.gradeIds.length)
    scopes.push({ gradeId: { in: membership.gradeIds } });
  if (!scopes.length) deny();
  return { OR: scopes };
}
