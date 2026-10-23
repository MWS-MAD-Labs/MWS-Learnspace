import type { MembershipRole } from './authorization.js';

import {
  AuthorizationDeniedError,
  membershipHasPermission,
  requireOrganizationScope,
  requirePermission,
  roleDerivedPermissions,
  type MembershipScope,
  type Permission,
  isBuiltInRole,
} from '../utils/authorization.js';
import { HttpError } from '../middleware/http-errors.js';

export type IepWorkflowCommandName =
  | 'SUBMIT'
  | 'COORDINATOR_APPROVE'
  | 'COORDINATOR_RETURN'
  | 'DIRECTOR_APPROVE'
  | 'DIRECTOR_RETURN'
  | 'ACTIVATE'
  | 'ARCHIVE';

// The permission that lets a person take each step of the IEP workflow.
export const iepWorkflowPermissions: Record<
  IepWorkflowCommandName,
  Permission
> = {
  SUBMIT: 'iep:submit',
  COORDINATOR_APPROVE: 'iep:coordinator-approve',
  COORDINATOR_RETURN: 'iep:coordinator-return',
  DIRECTOR_APPROVE: 'iep:director-approve',
  DIRECTOR_RETURN: 'iep:director-return',
  ACTIVATE: 'iep:activate',
  ARCHIVE: 'iep:archive',
};

export function denyIepAccess(): never {
  throw new HttpError(403, 'AUTHORIZATION_DENIED', 'The request was denied.');
}

export function iepMembershipFor(
  memberships: readonly MembershipScope[],
  organizationId: string,
): MembershipScope {
  try {
    return requireOrganizationScope(memberships, organizationId);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) denyIepAccess();
    throw error;
  }
}

export function requireIepPermission(
  membership: MembershipScope,
  permission: 'special-ed:read' | 'special-ed:write' | 'special-ed:review',
) {
  try {
    requirePermission(membership, permission);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) denyIepAccess();
    throw error;
  }
}

export function activeAssignedStudentIds(
  membership: MembershipScope,
  onDate = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`),
): string[] | undefined {
  if (
    membershipHasPermission(membership, 'scope.organization') ||
    membershipHasPermission(membership, 'scope.special-ed')
  )
    return undefined;
  if (!membershipHasPermission(membership, 'scope.assigned')) return [];
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

export function assertIepStudentScope(
  membership: MembershipScope,
  studentId: string,
  onDate: Date,
) {
  const scopedStudentIds = activeAssignedStudentIds(membership, onDate);
  if (scopedStudentIds === undefined || scopedStudentIds.includes(studentId)) {
    return;
  }
  denyIepAccess();
}

export function canRoleRunIepWorkflowCommand(
  role: MembershipRole,
  command: IepWorkflowCommandName,
): boolean {
  return (
    isBuiltInRole(role) &&
    roleDerivedPermissions[role].includes(iepWorkflowPermissions[command])
  );
}

export function requireIepRole(
  membership: MembershipScope,
  command: IepWorkflowCommandName,
) {
  if (!membershipHasPermission(membership, iepWorkflowPermissions[command]))
    denyIepAccess();
}
