import { Prisma } from '@prisma/client';
import { permissionsOfMembership } from '../utils/authorization.js';

export const organizationAccountSelect = {
  id: true,
  organizationId: true,
  role: true,
  roleTitle: true,
  permissions: true,
  status: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      status: true,
      updatedAt: true,
    },
  },
  unitScopes: { select: { unitId: true }, orderBy: { unitId: 'asc' as const } },
  gradeScopes: {
    select: { gradeId: true },
    orderBy: { gradeId: 'asc' as const },
  },
  subjectScopes: {
    select: { subjectId: true },
    orderBy: { subjectId: 'asc' as const },
  },
} satisfies Prisma.MembershipSelect;

type SelectedOrganizationAccount = Prisma.MembershipGetPayload<{
  select: typeof organizationAccountSelect;
}>;

function needsScope(account: SelectedOrganizationAccount): boolean {
  const permissions = permissionsOfMembership(
    account.role,
    account.permissions,
  );
  const reachesByRows =
    permissions.includes('scope.grade') ||
    permissions.includes('scope.subject');
  return (
    reachesByRows &&
    account.unitScopes.length +
      account.gradeScopes.length +
      account.subjectScopes.length ===
      0
  );
}

export function mapOrganizationAccount(account: SelectedOrganizationAccount) {
  return {
    membershipId: account.id,
    organizationId: account.organizationId,
    userId: account.user.id,
    email: account.user.email,
    displayName: account.user.displayName,
    avatarUrl: account.user.avatarUrl,
    userStatus: account.user.status,
    role: account.role,
    roleTitle: account.roleTitle,
    permissions: permissionsOfMembership(account.role, account.permissions),
    needsScope: needsScope(account),
    membershipStatus: account.status,
    unitIds: account.unitScopes.map((scope) => scope.unitId),
    gradeIds: account.gradeScopes.map((scope) => scope.gradeId),
    subjectIds: account.subjectScopes.map((scope) => scope.subjectId),
    updatedAt: new Date(
      Math.max(account.updatedAt.getTime(), account.user.updatedAt.getTime()),
    ).toISOString(),
  };
}
