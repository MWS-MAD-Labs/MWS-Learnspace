import { Prisma, type PrismaClient } from '@prisma/client';
import { CentralDataClient } from 'mws-central-auth/data-client';
import {
  createHubSession,
  type HubSession,
  type HubSessionClaims,
} from 'mws-central-auth/server';
import type { AppConfig } from '../lib/config.js';
import type { Logger } from '../lib/logger.js';
import type { HttpRequest } from '../type/http.js';
import {
  PERMISSIONS,
  centralEntitlementAccess,
  permissionsOfMembership,
  type Permission,
  type MembershipRole,
} from '../utils/authorization.js';
import {
  centralOrganizationMappingErrorCodes,
  createCentralOrganizationService,
  type CentralOrganizationMappingErrorCode,
} from './central-organization-service.js';

const mismatchLogLimit = 100;
const logArrayLimit = 100;
const permissionKeyLogLimit = 128;
const knownPermissions = new Set<string>(PERMISSIONS);

function isKnownPermission(value: string): value is Permission {
  return knownPermissions.has(value);
}

function loggedPermissionKeys(values: readonly string[]): string[] {
  return values
    .slice(0, logArrayLimit)
    .map((value) => value.slice(0, permissionKeyLogLimit));
}

export type VerifiedIdentity = {
  issuer: string;
  subject: string;
  source: string;
};

export interface IdentityVerifier {
  verify(request: HttpRequest): Promise<VerifiedIdentity | null>;
}

export class HubIdentityVerifier implements IdentityVerifier {
  constructor(
    private readonly hub: Pick<HubSession, 'fromCookieHeader'>,
    private readonly issuer: string,
  ) {}

  async verify(request: HttpRequest): Promise<VerifiedIdentity | null> {
    const claims = await this.hub.fromCookieHeader(request.get('cookie'));
    return claims
      ? {
          issuer: this.issuer,
          subject: claims.sub,
          source: claims.source,
        }
      : null;
  }
}

export type LocalSessionPrincipal = {
  userId: string;
  sessionId: string;
};

export class LocalSessionAdapter {
  fromRequest(request: HttpRequest): LocalSessionPrincipal | null {
    const auth = request.auth;
    return auth ? { userId: auth.userId, sessionId: auth.sessionId } : null;
  }
}

export type CentralEntitlement = Awaited<
  ReturnType<CentralDataClient['lookupApplicationEntitlement']>
>;

export interface CentralEntitlementClient {
  lookupApplicationEntitlement(input: {
    person_id: string;
    application_id: string;
  }): Promise<CentralEntitlement>;
  lookupEmployee(
    input: Parameters<CentralDataClient['lookupEmployee']>[0],
  ): Promise<{
    person_id: string;
    email: string;
  }>;
}

export function isValidCentralEntitlement(
  entitlement: CentralEntitlement,
  input: {
    subject: string;
    applicationId: string;
    centralOrganizationId: string;
  },
): entitlement is NonNullable<CentralEntitlement> {
  if (
    !entitlement?.is_active ||
    entitlement.person_id !== input.subject ||
    entitlement.application_id !== input.applicationId ||
    entitlement.organization_id !== input.centralOrganizationId
  ) {
    return false;
  }
  return centralEntitlementAccess(entitlement) !== undefined;
}

export function normalizeCentralApiBaseUrl(value: string): string {
  const url = new URL(value);
  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !['/', '/api/internal', '/api/internal/'].includes(url.pathname)
  ) {
    throw new Error('Invalid Central API base URL.');
  }
  url.pathname = '/';
  return url.toString().replace(/\/$/, '');
}

export function createCentralDataClient(config: AppConfig): CentralDataClient {
  if (!config.centralApiBaseUrl || !config.centralApiToken) {
    throw new Error('Central API is not configured.');
  }
  return new CentralDataClient({
    baseUrl: normalizeCentralApiBaseUrl(config.centralApiBaseUrl),
    token: config.centralApiToken,
    timeoutMs: config.centralApiTimeoutMs ?? 5_000,
  });
}

const localMembershipSelect = {
  id: true,
  organizationId: true,
  role: true,
  permissions: true,
  status: true,
  organization: { select: { status: true } },
  unitScopes: { select: { unitId: true } },
  gradeScopes: { select: { gradeId: true } },
  subjectScopes: { select: { subjectId: true } },
  staffAssignments: {
    select: { studentId: true, startsOn: true, endsOn: true },
  },
  observationAssignments: {
    where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
    select: { studentId: true },
  },
} satisfies Prisma.MembershipSelect;

type LocalMembership = Prisma.MembershipGetPayload<{
  select: typeof localMembershipSelect;
}>;

type LocalAuthorization = {
  membershipId: string;
  organizationId: string;
  role: MembershipRole;
  permissions: readonly Permission[];
  scopes: {
    unitIds: string[];
    gradeIds: string[];
    subjectIds: string[];
    assignedStudentIds: string[];
    observationAssignedStudentIds: string[];
  };
};

export type CentralAuthorizationComparison = Pick<
  PrincipalContext,
  | 'status'
  | 'unknownCentralPermissions'
  | 'missingCentralPermissions'
  | 'extraCentralPermissions'
>;

export function compareCentralAuthorization(input: {
  subject: string;
  entitlement: CentralEntitlement;
  applicationId: string;
  centralOrganizationId: string;
  localRole: MembershipRole;
  localPermissions: readonly Permission[];
}): CentralAuthorizationComparison {
  const { entitlement } = input;
  if (
    !entitlement ||
    !entitlement.is_active ||
    entitlement.person_id !== input.subject
  ) {
    return { status: 'entitlement_missing_or_inactive' };
  }
  if (entitlement.application_id !== input.applicationId) {
    return { status: 'entitlement_app_mismatch' };
  }
  if (entitlement.organization_id !== input.centralOrganizationId) {
    return { status: 'entitlement_central_org_mismatch' };
  }
  const centralPermissions = new Set(entitlement.permissions);
  const unknownCentralPermissions = [...centralPermissions]
    .filter((permission) => !isKnownPermission(permission))
    .sort();
  if (unknownCentralPermissions.length > 0) {
    return {
      status: 'unknown_central_permissions',
      unknownCentralPermissions,
    };
  }
  if (entitlement.role !== input.localRole) {
    return { status: 'role_mismatch' };
  }
  const typedCentralPermissions =
    entitlement.permissions.filter(isKnownPermission);
  const expectedPermissions = new Set(input.localPermissions);
  const missingCentralPermissions = input.localPermissions.filter(
    (permission) => !centralPermissions.has(permission),
  );
  const extraCentralPermissions = typedCentralPermissions.filter(
    (permission) => !expectedPermissions.has(permission),
  );
  if (
    missingCentralPermissions.length > 0 ||
    extraCentralPermissions.length > 0
  ) {
    return {
      status: 'permission_mismatch',
      missingCentralPermissions,
      extraCentralPermissions,
    };
  }
  return { status: 'match' };
}

export type PrincipalContext = {
  identity: VerifiedIdentity;
  local: LocalSessionPrincipal;
  linkedUserId?: string;
  entitlement: NonNullable<CentralEntitlement> | null;
  localAuthorization?: LocalAuthorization;
  unknownCentralPermissions?: string[];
  missingCentralPermissions?: Permission[];
  extraCentralPermissions?: Permission[];
  status:
    | 'match'
    | 'unlinked'
    | 'local_user_mismatch'
    | 'entitlement_missing_or_inactive'
    | 'entitlement_app_mismatch'
    | 'entitlement_central_org_mismatch'
    | 'local_membership_missing'
    | 'unknown_central_permissions'
    | 'role_mismatch'
    | 'permission_mismatch'
    | 'central_unavailable';
};

export class PrincipalContextLoader {
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: CentralEntitlement }
  >();

  constructor(
    private readonly prisma: Pick<
      PrismaClient,
      'externalPrincipal' | 'membership'
    >,
    private readonly central: CentralEntitlementClient,
    private readonly applicationId: string,
    private readonly centralOrganizationId: string,
    private readonly localOrganizationId: string,
    private readonly cacheMs = 30_000,
  ) {}

  async load(
    identity: VerifiedIdentity,
    local: LocalSessionPrincipal,
  ): Promise<PrincipalContext> {
    const now = new Date();
    const [principal, entitlementResult] = await Promise.all([
      this.prisma.externalPrincipal.findUnique({
        where: {
          issuer_subject: {
            issuer: identity.issuer,
            subject: identity.subject,
          },
        },
        select: { userId: true },
      }),
      this.entitlement(identity.subject).then(
        (value) => ({ available: true as const, value }),
        () => ({ available: false as const }),
      ),
    ]);

    const entitlement = entitlementResult.available
      ? entitlementResult.value
      : null;

    if (!principal) {
      return { identity, local, entitlement, status: 'unlinked' };
    }
    if (principal.userId !== local.userId) {
      return {
        identity,
        local,
        linkedUserId: principal.userId,
        entitlement,
        status: 'local_user_mismatch',
      };
    }
    const membership = await this.prisma.membership
      .findUnique({
        where: {
          organizationId_userId: {
            organizationId: this.localOrganizationId,
            userId: principal.userId,
          },
        },
        select: localMembershipSelect,
      })
      .then((value) =>
        value
          ? {
              ...value,
              staffAssignments: value.staffAssignments.filter(
                (assignment) =>
                  assignment.startsOn <= now &&
                  (!assignment.endsOn || assignment.endsOn >= now),
              ),
            }
          : null,
      );
    if (!membership) {
      return {
        identity,
        local,
        linkedUserId: principal.userId,
        entitlement,
        status: 'local_membership_missing',
      };
    }
    if (
      membership.status !== 'ACTIVE' ||
      membership.organization.status !== 'ACTIVE'
    ) {
      return {
        identity,
        local,
        linkedUserId: principal.userId,
        entitlement,
        localAuthorization: this.localAuthorization(membership),
        status: 'local_membership_missing',
      };
    }
    const localAuthorization = this.localAuthorization(membership);
    if (!entitlementResult.available) {
      return {
        identity,
        local,
        linkedUserId: principal.userId,
        entitlement,
        localAuthorization,
        status: 'central_unavailable',
      };
    }
    const comparison = compareCentralAuthorization({
      subject: identity.subject,
      entitlement,
      applicationId: this.applicationId,
      centralOrganizationId: this.centralOrganizationId,
      localRole: localAuthorization.role,
      localPermissions: localAuthorization.permissions,
    });
    return {
      identity,
      local,
      linkedUserId: principal.userId,
      entitlement,
      localAuthorization,
      ...comparison,
    };
  }

  private localAuthorization(membership: LocalMembership): LocalAuthorization {
    return {
      membershipId: membership.id,
      organizationId: membership.organizationId,
      role: membership.role,
      permissions: permissionsOfMembership(
        membership.role,
        membership.permissions,
      ),
      scopes: {
        unitIds: membership.unitScopes.map(({ unitId }) => unitId).sort(),
        gradeIds: membership.gradeScopes.map(({ gradeId }) => gradeId).sort(),
        subjectIds: membership.subjectScopes
          .map(({ subjectId }) => subjectId)
          .sort(),
        assignedStudentIds: membership.staffAssignments
          .map(({ studentId }) => studentId)
          .sort(),
        observationAssignedStudentIds: membership.observationAssignments
          .map(({ studentId }) => studentId)
          .sort(),
      },
    };
  }

  private async entitlement(subject: string): Promise<CentralEntitlement> {
    const cached = this.cache.get(subject);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const value = await this.central.lookupApplicationEntitlement({
      person_id: subject,
      application_id: this.applicationId,
    });
    if (
      this.cacheMs > 0 &&
      isValidCentralEntitlement(value, {
        subject,
        applicationId: this.applicationId,
        centralOrganizationId: this.centralOrganizationId,
      })
    ) {
      this.cache.set(subject, {
        expiresAt: Date.now() + this.cacheMs,
        value,
      });
    }
    return value;
  }
}

export interface ShadowSessionObserver {
  observe(request: HttpRequest): void;
}

export class FireAndForgetShadowObserver implements ShadowSessionObserver {
  private mismatchLogs = 0;
  private failureLogs = 0;
  private matchLogs = 0;

  constructor(
    private readonly verifier: IdentityVerifier,
    private readonly localSessions: LocalSessionAdapter,
    private readonly contexts: PrincipalContextLoader,
    private readonly logger: Logger,
    private readonly logMatches = false,
  ) {}

  observe(request: HttpRequest): void {
    void this.compare(request).catch(() => {
      if (this.failureLogs >= mismatchLogLimit) return;
      this.failureLogs += 1;
      this.logger.warn(
        {
          event: 'shared_session_shadow_failure',
          code: 'SHADOW_DEPENDENCY_FAILURE',
          requestId: request.res?.locals.requestId,
        },
        'shared session shadow observation failed',
      );
    });
  }

  private async compare(request: HttpRequest): Promise<void> {
    const local = this.localSessions.fromRequest(request);
    if (!local) return;
    const identity = await this.verifier.verify(request);
    if (!identity) {
      this.logMissingIdentity(request);
      return;
    }
    const context = await this.contexts.load(identity, local);
    if (context.status !== 'match') {
      this.logMismatch(request, context);
    } else if (this.logMatches) {
      this.logMatch(request, context);
    }
  }

  private logMissingIdentity(request: HttpRequest): void {
    if (this.mismatchLogs >= mismatchLogLimit) return;
    this.mismatchLogs += 1;
    this.logger.warn(
      {
        event: 'shared_session_shadow_mismatch',
        code: 'HUB_IDENTITY_MISSING',
        requestId: request.res?.locals.requestId,
      },
      'shared session shadow mismatch',
    );
  }

  private safeContext(context: PrincipalContext): Record<string, unknown> {
    return {
      localUserId: context.local.userId,
      membershipId: context.localAuthorization?.membershipId,
      localOrganizationId: context.localAuthorization?.organizationId,
      localPermissions: context.localAuthorization
        ? loggedPermissionKeys(context.localAuthorization.permissions)
        : undefined,
      entitlementId: context.entitlement?.id,
      entitlementVersion: context.entitlement?.version,
      centralPermissions: context.entitlement
        ? loggedPermissionKeys(
            context.entitlement.permissions.filter(isKnownPermission),
          )
        : undefined,
      unknownCentralPermissions: context.unknownCentralPermissions
        ? loggedPermissionKeys(context.unknownCentralPermissions)
        : undefined,
      missingCentralPermissions: context.missingCentralPermissions
        ? loggedPermissionKeys(context.missingCentralPermissions)
        : undefined,
      extraCentralPermissions: context.extraCentralPermissions
        ? loggedPermissionKeys(context.extraCentralPermissions)
        : undefined,
    };
  }

  private logMismatch(request: HttpRequest, context: PrincipalContext): void {
    if (this.mismatchLogs >= mismatchLogLimit) return;
    this.mismatchLogs += 1;
    this.logger.warn(
      {
        event: 'shared_session_shadow_mismatch',
        code: context.status.toUpperCase(),
        requestId: request.res?.locals.requestId,
        ...this.safeContext(context),
      },
      'shared session shadow mismatch',
    );
  }

  private logMatch(request: HttpRequest, context: PrincipalContext): void {
    if (this.matchLogs >= mismatchLogLimit) return;
    this.matchLogs += 1;
    this.logger.info(
      {
        event: 'shared_session_shadow_match',
        code: 'MATCH',
        requestId: request.res?.locals.requestId,
        ...this.safeContext(context),
      },
      'shared session shadow match',
    );
  }
}

export async function createSharedSessionShadow(
  config: AppConfig,
  prisma: PrismaClient,
  logger: Logger,
): Promise<ShadowSessionObserver | undefined> {
  if (config.sharedSessionMode !== 'shadow') return undefined;

  const issuer = config.hubSessionIssuer ?? 'mws-hub';
  const audience = config.hubSessionAudience ?? 'mws-apps';
  let localOrganizationId: string;
  try {
    const resolved = await createCentralOrganizationService(prisma).resolve({
      centralOrganizationId: config.centralOrganizationId!,
      localOrganizationIdHint: config.sharedSessionLocalOrganizationId,
    });
    localOrganizationId = resolved.localOrganizationId;
  } catch (error) {
    const candidateCode = (error as { code?: unknown })?.code;
    const mappingCode: CentralOrganizationMappingErrorCode | 'MAPPING_FAILED' =
      typeof candidateCode === 'string' &&
      centralOrganizationMappingErrorCodes.includes(
        candidateCode as CentralOrganizationMappingErrorCode,
      )
        ? (candidateCode as CentralOrganizationMappingErrorCode)
        : 'MAPPING_FAILED';
    logger.error(
      {
        event: 'shared_session_mapping_failed',
        authMode: 'shadow',
        applicationId: config.applicationId ?? 'learnspace',
        mappingCode,
      },
      'shared session organization mapping failed',
    );
    throw new Error(
      `Shared session organization mapping failed: ${mappingCode}`,
    );
  }

  const hub = createHubSession({
    hubBaseUrl: config.hubBaseUrl!,
    cookieName: config.hubAccessCookieName,
    issuer,
    audience,
  });
  await hub.ready();
  logger.info(
    {
      event: 'shared_session_shadow_ready',
      authMode: 'shadow',
      applicationId: config.applicationId ?? 'learnspace',
      hubCookieName: hub.cookieName,
      hubCookieNameSource: hub.nameSource(),
    },
    'shared session shadow initialized',
  );
  const central = createCentralDataClient(config);
  return new FireAndForgetShadowObserver(
    new HubIdentityVerifier(hub, issuer),
    new LocalSessionAdapter(),
    new PrincipalContextLoader(
      prisma,
      central,
      config.applicationId ?? 'learnspace',
      config.centralOrganizationId!,
      localOrganizationId,
      (config.sharedSessionEntitlementCacheSeconds ?? 30) * 1_000,
    ),
    logger,
    config.sharedSessionLogMatches ?? false,
  );
}

export type BackfillIdentity = Pick<HubSessionClaims, 'sub' | 'source'>;
