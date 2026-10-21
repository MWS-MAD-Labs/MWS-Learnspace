import type { MembershipRole } from '@prisma/client';
import {
  AuthorizationDeniedError,
  requireOrganizationScope,
  requirePermission,
  type MembershipScope,
} from '../utils/authorization.js';
import { HttpError } from '../middleware/http-errors.js';
import { activeAssignedStudentIds } from '../utils/ieps.policy.js';

const teacherRoles = new Set<MembershipRole>([
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
]);

export type WeeklyReportTransitionKind = 'submit' | 'coordinator' | 'director';

export function denyWeeklyReportAccess(): never {
  throw new HttpError(403, 'AUTHORIZATION_DENIED', 'The request was denied.');
}

export function weeklyReportMembershipFor(
  memberships: readonly MembershipScope[],
  organizationId: string,
): MembershipScope {
  try {
    return requireOrganizationScope(memberships, organizationId);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) denyWeeklyReportAccess();
    throw error;
  }
}

export function requireWeeklyReportPermission(
  membership: MembershipScope,
  permission: 'special-ed:read' | 'special-ed:write' | 'special-ed:review',
) {
  try {
    requirePermission(membership, permission);
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) denyWeeklyReportAccess();
    throw error;
  }
}

export function weeklyReportAssignedStudentIds(
  membership: MembershipScope,
  onDate: Date,
) {
  return activeAssignedStudentIds(membership, onDate);
}

export function assertWeeklyReportStudentScope(
  membership: MembershipScope,
  studentId: string,
  onDate: Date,
) {
  const studentIds = weeklyReportAssignedStudentIds(membership, onDate);
  if (studentIds !== undefined && !studentIds.includes(studentId)) {
    denyWeeklyReportAccess();
  }
}

export function requireWeeklyReportTeacher(membership: MembershipScope) {
  if (!teacherRoles.has(membership.role)) denyWeeklyReportAccess();
}

export function requireWeeklyReportEditor(
  membership: MembershipScope,
  teacherId: string,
  actorId: string,
) {
  if (!teacherRoles.has(membership.role) || teacherId !== actorId) {
    denyWeeklyReportAccess();
  }
}

export function requireWeeklyReportTransitionActor(
  membership: MembershipScope,
  teacherId: string,
  actorId: string,
  kind: WeeklyReportTransitionKind,
) {
  const teacher =
    kind === 'submit' &&
    teacherRoles.has(membership.role) &&
    teacherId === actorId;
  const coordinator =
    kind === 'coordinator' && membership.role === 'SPECIAL_ED_COORDINATOR';
  const director = kind === 'director' && membership.role === 'DIRECTOR';
  if (!teacher && !coordinator && !director) denyWeeklyReportAccess();
}
