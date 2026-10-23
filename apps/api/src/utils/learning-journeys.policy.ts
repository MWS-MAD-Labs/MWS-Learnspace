import { Prisma } from '@prisma/client';
import {
  AuthorizationDeniedError,
  membershipHasPermission,
  requireOrganizationScope,
  requirePermission,
  type MembershipScope,
} from '../utils/authorization.js';
import { HttpError } from '../middleware/http-errors.js';

export function denyLearningJourneyAccess(): never {
  throw new HttpError(403, 'AUTHORIZATION_DENIED', 'The request was denied.');
}

export function learningJourneyMembershipFor(
  memberships: readonly MembershipScope[],
  organizationId: string,
): MembershipScope {
  try {
    return requireOrganizationScope(memberships, organizationId);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) denyLearningJourneyAccess();
    throw error;
  }
}

export function requireLearningJourneyPermission(
  membership: MembershipScope,
  permission:
    'journey:read' | 'journey:write' | 'journey:review' | 'journey:approve',
) {
  try {
    requirePermission(membership, permission);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) denyLearningJourneyAccess();
    throw error;
  }
}

export function learningJourneyScopeWhere(
  membership: MembershipScope,
): Prisma.LearningJourneyWhereInput | undefined {
  if (membershipHasPermission(membership, 'scope.organization')) return {};
  if (membershipHasPermission(membership, 'scope.grade')) {
    const scopes: Prisma.LearningJourneyWhereInput[] = [];
    if (membership.unitIds.length)
      scopes.push({ unitId: { in: membership.unitIds } });
    if (membership.gradeIds.length)
      scopes.push({ gradeId: { in: membership.gradeIds } });
    return scopes.length ? { OR: scopes } : undefined;
  }
  if (membershipHasPermission(membership, 'scope.subject')) {
    return membership.subjectIds.length
      ? { subjectId: { in: membership.subjectIds } }
      : undefined;
  }
  return undefined;
}

export function assertLearningJourneyWriteScope(
  membership: MembershipScope,
  value: { unitId: string; gradeId: string; subjectId: string },
) {
  if (membershipHasPermission(membership, 'scope.grade')) {
    if (
      membership.unitIds.includes(value.unitId) ||
      membership.gradeIds.includes(value.gradeId)
    )
      return;
    denyLearningJourneyAccess();
  }
  if (
    membershipHasPermission(membership, 'scope.subject') &&
    membership.subjectIds.includes(value.subjectId)
  )
    return;
  denyLearningJourneyAccess();
}
