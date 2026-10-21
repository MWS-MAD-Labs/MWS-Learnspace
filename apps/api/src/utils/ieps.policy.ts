import type { MembershipRole } from '@prisma/client';
import {
  AuthorizationDeniedError,
  requireOrganizationScope,
  requirePermission,
  type MembershipScope,
} from '../utils/authorization.js';
import { HttpError } from '../middleware/http-errors.js';

const broadRoles = new Set(['DIRECTOR', 'PRINCIPAL', 'SPECIAL_ED_COORDINATOR']);
const assignedRoles = new Set(['SPECIAL_ED_TEACHER', 'SPECIALIST']);

export type IepWorkflowCommandName =
  | 'SUBMIT'
  | 'COORDINATOR_APPROVE'
  | 'COORDINATOR_RETURN'
  | 'DIRECTOR_APPROVE'
  | 'DIRECTOR_RETURN'
  | 'ACTIVATE'
  | 'ARCHIVE';

export const iepWorkflowRoles: Record<
  IepWorkflowCommandName,
  readonly MembershipRole[]
> = {
  SUBMIT: ['SPECIAL_ED_COORDINATOR', 'SPECIAL_ED_TEACHER', 'SPECIALIST'],
  COORDINATOR_APPROVE: ['SPECIAL_ED_COORDINATOR'],
  COORDINATOR_RETURN: ['SPECIAL_ED_COORDINATOR'],
  DIRECTOR_APPROVE: ['DIRECTOR'],
  DIRECTOR_RETURN: ['DIRECTOR'],
  ACTIVATE: ['DIRECTOR'],
  ARCHIVE: ['DIRECTOR'],
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
  if (broadRoles.has(membership.role)) return undefined;
  if (!assignedRoles.has(membership.role)) return [];
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
  return iepWorkflowRoles[command].includes(role);
}

export function requireIepRole(
  membership: MembershipScope,
  command: IepWorkflowCommandName,
) {
  if (!canRoleRunIepWorkflowCommand(membership.role, command)) denyIepAccess();
}
