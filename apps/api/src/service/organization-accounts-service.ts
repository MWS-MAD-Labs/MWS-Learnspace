import { Prisma, type PrismaClient } from '@prisma/client';
import {
  grantedPermissions,
  permissionsOfMembership,
} from '../utils/authorization.js';
import type {
  OrganizationAccountCreateCommand,
  OrganizationAccountUpdateCommand,
} from '@learnspace/contracts';
import { createAuditService } from '../service/audit-service.js';
import { HttpError } from '../middleware/http-errors.js';
import { prismaErrorCode } from '../utils/resource-errors.js';
import {
  mapOrganizationAccount,
  organizationAccountSelect,
} from '../model/organization-accounts-model.js';

// Which rows a person reaches follows from what their role allows: grade scopes for `scope.grade`, subject scopes for
// `scope.subject`, and none for a role that reaches the organization or only assigned students.
function validateRoleScopes(input: {
  permissions: readonly string[];
  unitIds: readonly string[];
  gradeIds: readonly string[];
  subjectIds: readonly string[];
}) {
  const byGrade = input.permissions.includes('scope.grade');
  const bySubject = input.permissions.includes('scope.subject');
  const gradeScopes = input.unitIds.length + input.gradeIds.length;
  const subjectScopes = input.subjectIds.length;
  if (byGrade && !bySubject && subjectScopes === 0 && gradeScopes > 0) return;
  if (bySubject && !byGrade && gradeScopes === 0 && subjectScopes > 0) return;
  if (byGrade && bySubject && gradeScopes + subjectScopes > 0) return;
  if (!byGrade && !bySubject && gradeScopes + subjectScopes === 0) return;
  throw new HttpError(
    400,
    'INVALID_MEMBERSHIP_SCOPES',
    'Membership scopes are not valid for the selected role.',
  );
}

async function validateScopeIds(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  scopes: {
    unitIds: readonly string[];
    gradeIds: readonly string[];
    subjectIds: readonly string[];
  },
) {
  const unitIds = [...new Set(scopes.unitIds)];
  const gradeIds = [...new Set(scopes.gradeIds)];
  const subjectIds = [...new Set(scopes.subjectIds)];
  const [unitCount, gradeCount, subjectCount] = await Promise.all([
    transaction.unit.count({ where: { organizationId, id: { in: unitIds } } }),
    transaction.grade.count({
      where: { organizationId, id: { in: gradeIds } },
    }),
    transaction.subject.count({
      where: { organizationId, id: { in: subjectIds } },
    }),
  ]);
  if (
    unitCount !== unitIds.length ||
    gradeCount !== gradeIds.length ||
    subjectCount !== subjectIds.length
  ) {
    throw new HttpError(
      400,
      'INVALID_MEMBERSHIP_SCOPE_REFERENCE',
      'Every membership scope must belong to the organization.',
    );
  }
  return { unitIds, gradeIds, subjectIds };
}

async function replaceScopes(
  transaction: Prisma.TransactionClient,
  membershipId: string,
  scopes: {
    unitIds: readonly string[];
    gradeIds: readonly string[];
    subjectIds: readonly string[];
  },
) {
  await Promise.all([
    transaction.membershipUnit.deleteMany({ where: { membershipId } }),
    transaction.membershipGrade.deleteMany({ where: { membershipId } }),
    transaction.membershipSubject.deleteMany({ where: { membershipId } }),
  ]);
  await Promise.all([
    scopes.unitIds.length
      ? transaction.membershipUnit.createMany({
          data: scopes.unitIds.map((unitId) => ({ membershipId, unitId })),
        })
      : Promise.resolve(),
    scopes.gradeIds.length
      ? transaction.membershipGrade.createMany({
          data: scopes.gradeIds.map((gradeId) => ({ membershipId, gradeId })),
        })
      : Promise.resolve(),
    scopes.subjectIds.length
      ? transaction.membershipSubject.createMany({
          data: scopes.subjectIds.map((subjectId) => ({
            membershipId,
            subjectId,
          })),
        })
      : Promise.resolve(),
  ]);
}

export function createOrganizationAccountsService(prisma: PrismaClient) {
  return {
    async list(organizationId: string) {
      const rows = await prisma.membership.findMany({
        where: { organizationId },
        orderBy: [{ user: { displayName: 'asc' } }, { id: 'asc' }],
        select: organizationAccountSelect,
      });
      return rows.map(mapOrganizationAccount);
    },

    async create(input: {
      organizationId: string;
      command: OrganizationAccountCreateCommand;
      actorId: string;
      requestId: string;
    }) {
      try {
        const result = await prisma.$transaction(async (transaction) => {
          const scopes = await validateScopeIds(
            transaction,
            input.organizationId,
            {
              unitIds: input.command.unitIds ?? [],
              gradeIds: input.command.gradeIds ?? [],
              subjectIds: input.command.subjectIds ?? [],
            },
          );
          validateRoleScopes({
            permissions: grantedPermissions(input.command.role),
            ...scopes,
          });
          const email = input.command.email.toLowerCase();
          let user = await transaction.user.findUnique({
            where: { email },
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              status: true,
            },
          });
          if (user) {
            const existing = await transaction.membership.findUnique({
              where: {
                organizationId_userId: {
                  organizationId: input.organizationId,
                  userId: user.id,
                },
              },
              select: { id: true },
            });
            if (existing) {
              throw new HttpError(
                409,
                'MEMBERSHIP_ALREADY_EXISTS',
                'This user already has a membership in the organization.',
              );
            }
            if (user.status !== 'ACTIVE') {
              throw new HttpError(
                409,
                'USER_DISABLED',
                'A disabled user must be reactivated before adding a membership.',
              );
            }
          } else {
            user = await transaction.user.create({
              data: {
                email,
                displayName: input.command.displayName,
                avatarUrl: input.command.avatarUrl ?? null,
              },
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                status: true,
              },
            });
          }
          const created = await transaction.membership.create({
            data: {
              organizationId: input.organizationId,
              userId: user.id,
              role: input.command.role,
              permissions: grantedPermissions(input.command.role),
              roleTitle: input.command.roleTitle ?? null,
            },
            select: { id: true },
          });
          await replaceScopes(transaction, created.id, scopes);
          await createAuditService(transaction as PrismaClient).append({
            organizationId: input.organizationId,
            actorId: input.actorId,
            action: 'organization_account.create',
            targetType: 'Membership',
            targetId: created.id,
            requestId: input.requestId,
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(input.command) },
          });
          return transaction.membership.findFirstOrThrow({
            where: { id: created.id, organizationId: input.organizationId },
            select: organizationAccountSelect,
          });
        });
        return mapOrganizationAccount(result);
      } catch (error) {
        if (prismaErrorCode(error) === 'P2002') {
          throw new HttpError(
            409,
            'ACCOUNT_CONFLICT',
            'The email or membership is already in use.',
          );
        }
        throw error;
      }
    },

    async update(input: {
      organizationId: string;
      membershipId: string;
      command: OrganizationAccountUpdateCommand;
      actorId: string;
      requestId: string;
    }) {
      try {
        const result = await prisma.$transaction(async (transaction) => {
          const existing = await transaction.membership.findFirst({
            where: {
              id: input.membershipId,
              organizationId: input.organizationId,
            },
            select: organizationAccountSelect,
          });
          if (!existing) {
            throw new HttpError(
              404,
              'MEMBERSHIP_NOT_FOUND',
              'Membership not found.',
            );
          }
          if (
            existing.user.id === input.actorId &&
            (input.command.userStatus === 'DISABLED' ||
              input.command.membershipStatus === 'DISABLED' ||
              (input.command.role !== undefined &&
                input.command.role !== 'DIRECTOR'))
          ) {
            throw new HttpError(
              409,
              'SELF_ADMIN_LOCKOUT',
              'You cannot disable or remove your own organization administration access.',
            );
          }
          const scopesRequested =
            input.command.unitIds !== undefined ||
            input.command.gradeIds !== undefined ||
            input.command.subjectIds !== undefined ||
            input.command.role !== undefined;
          const scopes = scopesRequested
            ? await validateScopeIds(transaction, input.organizationId, {
                unitIds:
                  input.command.unitIds ??
                  existing.unitScopes.map((scope) => scope.unitId),
                gradeIds:
                  input.command.gradeIds ??
                  existing.gradeScopes.map((scope) => scope.gradeId),
                subjectIds:
                  input.command.subjectIds ??
                  existing.subjectScopes.map((scope) => scope.subjectId),
              })
            : undefined;
          if (scopes)
            validateRoleScopes({
              permissions: input.command.role
                ? grantedPermissions(input.command.role)
                : permissionsOfMembership(existing.role, existing.permissions),
              ...scopes,
            });
          const normalizedEmail = input.command.email?.toLowerCase();
          const userData = {
            ...(normalizedEmail !== undefined &&
            normalizedEmail !== existing.user.email
              ? { email: normalizedEmail }
              : {}),
            ...(input.command.displayName !== undefined &&
            input.command.displayName !== existing.user.displayName
              ? { displayName: input.command.displayName }
              : {}),
            ...(input.command.avatarUrl !== undefined &&
            input.command.avatarUrl !== existing.user.avatarUrl
              ? { avatarUrl: input.command.avatarUrl }
              : {}),
            ...(input.command.userStatus !== undefined &&
            input.command.userStatus !== existing.user.status
              ? { status: input.command.userStatus }
              : {}),
          };
          if (Object.keys(userData).length) {
            const otherMemberships = await transaction.membership.count({
              where: {
                userId: existing.user.id,
                organizationId: { not: input.organizationId },
              },
            });
            if (otherMemberships > 0) {
              throw new HttpError(
                409,
                'SHARED_USER_IDENTITY_CONFLICT',
                'Global identity fields cannot be changed from one organization while the user belongs to another organization.',
              );
            }
            await transaction.user.update({
              where: { id: existing.user.id },
              data: userData,
            });
          }
          const membershipData = {
            ...(input.command.role !== undefined
              ? {
                  role: input.command.role,
                  permissions: grantedPermissions(input.command.role),
                }
              : {}),
            ...(input.command.roleTitle !== undefined
              ? { roleTitle: input.command.roleTitle }
              : {}),
            ...(input.command.membershipStatus !== undefined
              ? { status: input.command.membershipStatus }
              : {}),
          };
          if (Object.keys(membershipData).length || scopes) {
            await transaction.membership.update({
              where: { id: existing.id },
              data: Object.keys(membershipData).length
                ? membershipData
                : { role: existing.role },
            });
          }
          if (scopes) await replaceScopes(transaction, existing.id, scopes);
          await createAuditService(transaction as PrismaClient).append({
            organizationId: input.organizationId,
            actorId: input.actorId,
            action: 'organization_account.update',
            targetType: 'Membership',
            targetId: existing.id,
            requestId: input.requestId,
            result: 'SUCCEEDED',
            metadata: { changedFields: Object.keys(input.command) },
          });
          return transaction.membership.findFirstOrThrow({
            where: { id: existing.id, organizationId: input.organizationId },
            select: organizationAccountSelect,
          });
        });
        return mapOrganizationAccount(result);
      } catch (error) {
        if (prismaErrorCode(error) === 'P2002') {
          throw new HttpError(
            409,
            'ACCOUNT_CONFLICT',
            'The email or membership is already in use.',
          );
        }
        throw error;
      }
    },
  };
}

export type OrganizationAccountsService = ReturnType<
  typeof createOrganizationAccountsService
>;
