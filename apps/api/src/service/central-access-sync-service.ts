import { Prisma, type PrismaClient } from '@prisma/client';
import { CentralApiError } from 'mws-central-auth/data-client';
import {
  permissionsByRole,
  type MembershipRole,
  permissionsForRole,
  grantedPermissions,
} from '../utils/authorization.js';
import type {
  CentralEntitlement,
  CentralEntitlementClient,
} from './shared-session-shadow-service.js';

export type CentralAccessSyncMode = 'dry-run' | 'apply';

type SyncDatabase = Pick<PrismaClient, 'externalPrincipal' | 'membership'>;

export interface CentralAccessSyncLock {
  runExclusive<T>(
    operation: (database: SyncDatabase) => Promise<T>,
  ): Promise<T | undefined>;
}

export type CentralAccessSyncReport = {
  mode: CentralAccessSyncMode;
  lockAcquired: boolean;
  counts: {
    principalsScanned: number;
    activeEntitlements: number;
    missingOrInactiveEntitlements: number;
    invalidEntitlements: number;
    lookupFailures: number;
    membershipsMissing: number;
    membershipsDisabled: number;
    rolesUpdated: number;
    locallyDisabledMemberships: number;
    unchanged: number;
  };
};

function emptyReport(mode: CentralAccessSyncMode): CentralAccessSyncReport {
  return {
    mode,
    lockAcquired: false,
    counts: {
      principalsScanned: 0,
      activeEntitlements: 0,
      missingOrInactiveEntitlements: 0,
      invalidEntitlements: 0,
      lookupFailures: 0,
      membershipsMissing: 0,
      membershipsDisabled: 0,
      rolesUpdated: 0,
      locallyDisabledMemberships: 0,
      unchanged: 0,
    },
  };
}

function entitlementRole(
  entitlement: NonNullable<CentralEntitlement>,
): MembershipRole | undefined {
  if (!Object.hasOwn(permissionsByRole, entitlement.role)) return undefined;
  const role = entitlement.role as MembershipRole;
  const expected = new Set<string>(permissionsForRole(role));
  const actual = new Set<string>(entitlement.permissions);
  if (expected.size !== actual.size) return undefined;
  for (const permission of expected) {
    if (!actual.has(permission)) return undefined;
  }
  return role;
}

export async function synchronizeCentralAccess(input: {
  lock: CentralAccessSyncLock;
  central: Pick<CentralEntitlementClient, 'lookupApplicationEntitlement'>;
  issuer: string;
  applicationId: string;
  centralOrganizationId: string;
  localOrganizationId: string;
  mode: CentralAccessSyncMode;
}): Promise<CentralAccessSyncReport> {
  const report = emptyReport(input.mode);
  const result = await input.lock.runExclusive(async (database) => {
    report.lockAcquired = true;
    const principals = await database.externalPrincipal.findMany({
      where: { issuer: input.issuer, verified: true },
      orderBy: { id: 'asc' },
      select: {
        subject: true,
        userId: true,
        user: { select: { status: true } },
      },
    });

    for (const principal of principals) {
      report.counts.principalsScanned += 1;
      let entitlement: CentralEntitlement;
      try {
        entitlement = await input.central.lookupApplicationEntitlement({
          person_id: principal.subject,
          application_id: input.applicationId,
        });
      } catch (error) {
        if (error instanceof CentralApiError && error.status === 404) {
          entitlement = null;
        } else {
          report.counts.lookupFailures += 1;
          continue;
        }
      }

      const membership = await database.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.localOrganizationId,
            userId: principal.userId,
          },
        },
        select: { id: true, role: true, status: true },
      });
      if (!membership) {
        report.counts.membershipsMissing += 1;
        continue;
      }

      if (!entitlement || !entitlement.is_active) {
        report.counts.missingOrInactiveEntitlements += 1;
        if (membership.status !== 'ACTIVE') {
          report.counts.unchanged += 1;
          continue;
        }
        report.counts.membershipsDisabled += 1;
        if (input.mode === 'apply') {
          await database.membership.update({
            where: { id: membership.id },
            data: { status: 'DISABLED' },
          });
        }
        continue;
      }

      const role = entitlementRole(entitlement);
      if (
        entitlement.person_id !== principal.subject ||
        entitlement.application_id !== input.applicationId ||
        entitlement.organization_id !== input.centralOrganizationId ||
        !role
      ) {
        report.counts.invalidEntitlements += 1;
        continue;
      }
      report.counts.activeEntitlements += 1;

      if (principal.user.status !== 'ACTIVE') {
        if (membership.status === 'ACTIVE') {
          report.counts.membershipsDisabled += 1;
          if (input.mode === 'apply') {
            await database.membership.update({
              where: { id: membership.id },
              data: { status: 'DISABLED' },
            });
          }
        } else {
          report.counts.unchanged += 1;
        }
        continue;
      }
      if (membership.status !== 'ACTIVE') {
        report.counts.locallyDisabledMemberships += 1;
        continue;
      }
      if (membership.role === role) {
        report.counts.unchanged += 1;
        continue;
      }

      report.counts.rolesUpdated += 1;
      if (input.mode === 'apply') {
        await database.membership.update({
          where: { id: membership.id },
          data: { role, permissions: grantedPermissions(role) },
        });
      }
    }
    return report;
  });
  return result ?? report;
}

export function createPostgresCentralAccessSyncLock(
  prisma: PrismaClient,
): CentralAccessSyncLock {
  return {
    runExclusive: <T>(operation: (database: SyncDatabase) => Promise<T>) =>
      prisma.$transaction(
        async (transaction) => {
          const rows = await transaction.$queryRaw<Array<{ locked: boolean }>>(
            Prisma.sql`SELECT pg_try_advisory_xact_lock(hashtext('learnspace'), hashtext('central-access-sync')) AS locked`,
          );
          if (rows[0]?.locked !== true) return undefined;
          return operation(transaction);
        },
        { maxWait: 5_000, timeout: 30 * 60_000 },
      ),
  };
}
