import { Prisma } from '@prisma/client';
import { isoDate } from '../utils/resource-date.js';

export const DEFAULT_GPK_MAX_CASELOAD = 2;
export const GPK_ROLE_CONTEXT = 'GPK';

export const gpkAssignmentSelect = {
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
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  },
} satisfies Prisma.StaffStudentAssignmentSelect;

export type SelectedGpkAssignment = Prisma.StaffStudentAssignmentGetPayload<{
  select: typeof gpkAssignmentSelect;
}>;

export function activeGpkAssignmentSelect(schoolDate: Date) {
  return {
    where: {
      roleContext: GPK_ROLE_CONTEXT,
      startsOn: { lte: schoolDate },
      OR: [{ endsOn: null }, { endsOn: { gte: schoolDate } }],
      membership: {
        status: 'ACTIVE' as const,
        role: 'SPECIAL_ED_TEACHER' as const,
      },
    },
    orderBy: [{ startsOn: 'desc' as const }, { id: 'asc' as const }],
    take: 1,
    select: gpkAssignmentSelect,
  };
}

export function mapGpkAssignment(assignment: SelectedGpkAssignment) {
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
