import { Prisma } from '@prisma/client';

export const organizationAccountSelect = {
  id: true,
  organizationId: true,
  role: true,
  roleTitle: true,
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
    membershipStatus: account.status,
    unitIds: account.unitScopes.map((scope) => scope.unitId),
    gradeIds: account.gradeScopes.map((scope) => scope.gradeId),
    subjectIds: account.subjectScopes.map((scope) => scope.subjectId),
    updatedAt: new Date(
      Math.max(account.updatedAt.getTime(), account.user.updatedAt.getTime()),
    ).toISOString(),
  };
}
