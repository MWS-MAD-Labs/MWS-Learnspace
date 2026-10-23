import type { PrismaClient } from '@prisma/client';
import {
  compareCentralAuthorization,
  type CentralEntitlementClient,
} from './shared-session-shadow-service.js';
import {
  permissionsForRole,
  type MembershipRole,
} from '../utils/authorization.js';

export const sharedSessionReadinessReasonCodes = [
  'UNMAPPED',
  'UNVERIFIED_MAPPING',
  'DUPLICATE_OR_CONFLICT_STATE',
  'LOCAL_MEMBERSHIP_OR_ORGANIZATION_INACTIVE',
  'CENTRAL_NOT_CONFIGURED',
  'CENTRAL_UNAVAILABLE',
  'ENTITLEMENT_MISSING_OR_INACTIVE',
  'ENTITLEMENT_APP_MISMATCH',
  'ENTITLEMENT_CENTRAL_ORG_MISMATCH',
  'ROLE_MISMATCH',
  'PERMISSION_MISMATCH',
  'UNKNOWN_CENTRAL_PERMISSIONS',
] as const;

export type SharedSessionReadinessReasonCode =
  (typeof sharedSessionReadinessReasonCodes)[number];

export type SharedSessionReadinessCounts = {
  activeLocalPrincipals: number;
  mapped: number;
  verified: number;
  unverified: number;
  unmapped: number;
  duplicateConflictImpossibleStates: number;
  activeMemberships: number;
  inactiveMemberships: number;
  entitlementActive: number;
  entitlementMissing: number;
  entitlementUnavailable: number;
  entitlementAppMismatch: number;
  entitlementOrganizationMismatch: number;
  roleMismatch: number;
  permissionMismatch: number;
  unknownPermissions: number;
  ready: number;
};

export type SharedSessionReadinessReport = {
  mode: 'central' | 'local-only';
  strict: boolean;
  counts: SharedSessionReadinessCounts;
  reasons: Partial<Record<SharedSessionReadinessReasonCode, number>>;
  blockers: number;
  go: boolean;
};

type ReadinessPrisma = Pick<PrismaClient, 'user' | 'externalPrincipal'>;

function increment(
  report: SharedSessionReadinessReport,
  code: SharedSessionReadinessReasonCode,
  amount = 1,
): void {
  report.reasons[code] = (report.reasons[code] ?? 0) + amount;
}

export async function inspectSharedSessionReadiness(input: {
  prisma: ReadinessPrisma;
  issuer: string;
  localOrganizationId: string;
  applicationId: string;
  centralOrganizationId?: string;
  central?: Pick<CentralEntitlementClient, 'lookupApplicationEntitlement'>;
  strict?: boolean;
}): Promise<SharedSessionReadinessReport> {
  const centralEnabled = Boolean(input.central && input.centralOrganizationId);
  const report: SharedSessionReadinessReport = {
    mode: centralEnabled ? 'central' : 'local-only',
    strict: input.strict ?? false,
    counts: {
      activeLocalPrincipals: 0,
      mapped: 0,
      verified: 0,
      unverified: 0,
      unmapped: 0,
      duplicateConflictImpossibleStates: 0,
      activeMemberships: 0,
      inactiveMemberships: 0,
      entitlementActive: 0,
      entitlementMissing: 0,
      entitlementUnavailable: 0,
      entitlementAppMismatch: 0,
      entitlementOrganizationMismatch: 0,
      roleMismatch: 0,
      permissionMismatch: 0,
      unknownPermissions: 0,
      ready: 0,
    },
    reasons: {},
    blockers: 0,
    go: true,
  };

  const users = await input.prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      memberships: { some: { organizationId: input.localOrganizationId } },
    },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      memberships: {
        where: { organizationId: input.localOrganizationId },
        select: {
          role: true,
          status: true,
          organization: { select: { status: true } },
        },
      },
    },
  });
  const relevantUserIds = users.map(({ id }) => id);
  const principals = await input.prisma.externalPrincipal.findMany({
    where: {
      issuer: input.issuer,
      userId: { in: relevantUserIds },
    },
    orderBy: { id: 'asc' },
    select: { userId: true, subject: true, verified: true },
  });

  report.counts.activeLocalPrincipals = users.length;
  const byUser = new Map<string, typeof principals>();
  const subjectCounts = new Map<string, number>();
  for (const principal of principals) {
    const values = byUser.get(principal.userId) ?? [];
    values.push(principal);
    byUser.set(principal.userId, values);
    subjectCounts.set(
      principal.subject,
      (subjectCounts.get(principal.subject) ?? 0) + 1,
    );
  }
  const conflictUsers = new Set<string>();
  for (const [userId, values] of byUser) {
    if (values.length > 1) conflictUsers.add(userId);
  }
  for (const principal of principals) {
    if ((subjectCounts.get(principal.subject) ?? 0) > 1) {
      conflictUsers.add(principal.userId);
    }
  }
  for (const user of users) {
    if (user.memberships.length > 1) conflictUsers.add(user.id);
  }
  report.counts.duplicateConflictImpossibleStates = conflictUsers.size;
  if (conflictUsers.size > 0) {
    increment(report, 'DUPLICATE_OR_CONFLICT_STATE', conflictUsers.size);
  }

  for (const user of users) {
    const mappings = byUser.get(user.id) ?? [];
    const mapping = mappings.length === 1 ? mappings[0] : undefined;
    const membership = user.memberships[0];
    const activeMembership =
      user.memberships.length === 1 &&
      membership?.status === 'ACTIVE' &&
      membership.organization.status === 'ACTIVE';

    if (activeMembership) report.counts.activeMemberships += 1;
    else {
      report.counts.inactiveMemberships += 1;
      increment(report, 'LOCAL_MEMBERSHIP_OR_ORGANIZATION_INACTIVE');
    }

    if (mappings.length === 0) {
      report.counts.unmapped += 1;
      increment(report, 'UNMAPPED');
      continue;
    }
    report.counts.mapped += 1;
    if (!mappings.every(({ verified }) => verified)) {
      report.counts.unverified += 1;
      increment(report, 'UNVERIFIED_MAPPING');
      continue;
    }
    report.counts.verified += 1;
    if (!mapping || !activeMembership || conflictUsers.has(user.id)) continue;

    if (!centralEnabled) {
      report.counts.entitlementUnavailable += 1;
      increment(report, 'CENTRAL_NOT_CONFIGURED');
      report.counts.ready += 1;
      continue;
    }

    let entitlement;
    try {
      entitlement = await input.central!.lookupApplicationEntitlement({
        person_id: mapping.subject,
        application_id: input.applicationId,
      });
    } catch {
      report.counts.entitlementUnavailable += 1;
      increment(report, 'CENTRAL_UNAVAILABLE');
      continue;
    }
    const comparison = compareCentralAuthorization({
      subject: mapping.subject,
      entitlement,
      applicationId: input.applicationId,
      centralOrganizationId: input.centralOrganizationId!,
      localRole: membership.role as MembershipRole,
      localPermissions: permissionsForRole(membership.role),
    });
    if (entitlement?.is_active && entitlement.person_id === mapping.subject) {
      report.counts.entitlementActive += 1;
    }
    switch (comparison.status) {
      case 'match':
        report.counts.ready += 1;
        break;
      case 'entitlement_missing_or_inactive':
        report.counts.entitlementMissing += 1;
        increment(report, 'ENTITLEMENT_MISSING_OR_INACTIVE');
        break;
      case 'entitlement_app_mismatch':
        report.counts.entitlementAppMismatch += 1;
        increment(report, 'ENTITLEMENT_APP_MISMATCH');
        break;
      case 'entitlement_central_org_mismatch':
        report.counts.entitlementOrganizationMismatch += 1;
        increment(report, 'ENTITLEMENT_CENTRAL_ORG_MISMATCH');
        break;
      case 'role_mismatch':
        report.counts.roleMismatch += 1;
        increment(report, 'ROLE_MISMATCH');
        break;
      case 'permission_mismatch':
        report.counts.permissionMismatch += 1;
        increment(report, 'PERMISSION_MISMATCH');
        break;
      case 'unknown_central_permissions':
        report.counts.unknownPermissions += 1;
        increment(report, 'UNKNOWN_CENTRAL_PERMISSIONS');
        break;
      default:
        break;
    }
  }

  report.blockers = Object.values(report.reasons).reduce(
    (total, count) => total + (count ?? 0),
    0,
  );
  report.go = !report.strict || report.blockers === 0;
  return report;
}
