import { Prisma, type MembershipRole, type PrismaClient } from '@prisma/client';
import {
  createHubSession,
  type HubSession,
  type HubSessionClaims,
} from 'mws-central-auth/server';
import type { AppConfig } from '../lib/config.js';
import type { Logger } from '../lib/logger.js';
import type { AuthenticatedRequest, HttpRequest } from '../type/http.js';
import {
  PERMISSIONS,
  permissionsByRole,
  type Permission,
} from '../utils/authorization.js';
import {
  centralOrganizationMappingErrorCodes,
  createCentralOrganizationService,
  type CentralOrganizationMappingErrorCode,
} from './central-organization-service.js';
import {
  createCentralDataClient,
  isValidCentralEntitlement,
} from './shared-session-shadow-service.js';
import type {
  CentralEntitlement,
  CentralEntitlementClient,
} from './shared-session-shadow-service.js';
import type {
  AuthenticationResult,
  RequestAuthenticationService,
} from './request-authentication-service.js';
import { projectCentralPrincipal } from './central-principal-projection-service.js';

const knownPermissions = new Set<string>(PERMISSIONS);
const knownRoles = new Set<string>(Object.keys(permissionsByRole));

export type SharedDependencyLabel = 'hub' | 'central';
export type SharedDependencyStates = Record<
  SharedDependencyLabel,
  'up' | 'down'
>;

export class SharedDependencyStateTracker {
  private readonly failedAt: Partial<Record<SharedDependencyLabel, number>> =
    {};

  constructor(
    private readonly recoveryMs = 10_000,
    private readonly now: () => number = Date.now,
  ) {}

  success(dependency: SharedDependencyLabel): void {
    delete this.failedAt[dependency];
  }

  failure(dependency: SharedDependencyLabel): void {
    this.failedAt[dependency] = this.now();
  }

  states(): SharedDependencyStates {
    const isDown = (dependency: SharedDependencyLabel) => {
      const failedAt = this.failedAt[dependency];
      return failedAt !== undefined && this.now() - failedAt < this.recoveryMs;
    };
    return {
      hub: isDown('hub') ? 'down' : 'up',
      central: isDown('central') ? 'down' : 'up',
    };
  }
}

const membershipSelect = {
  id: true,
  organizationId: true,
  status: true,
  roleTitle: true,
  organization: { select: { name: true, status: true } },
  unitScopes: { select: { unitId: true } },
  gradeScopes: { select: { gradeId: true } },
  subjectScopes: { select: { subjectId: true } },
  staffAssignments: {
    select: {
      organizationId: true,
      studentId: true,
      startsOn: true,
      endsOn: true,
    },
  },
  observationAssignments: {
    where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
    select: { studentId: true },
  },
} satisfies Prisma.MembershipSelect;

type SharedMembership = Prisma.MembershipGetPayload<{
  select: typeof membershipSelect;
}>;

export type SharedSessionContext = {
  claims: HubSessionClaims;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    status: 'ACTIVE';
  };
  membership: SharedMembership;
  role: MembershipRole;
  permissions: Permission[];
};

export class SharedSessionAuthenticationService implements RequestAuthenticationService {
  private readonly entitlementCache = new Map<
    string,
    { expiresAt: number; value: CentralEntitlement }
  >();

  constructor(
    private readonly prisma: Pick<
      PrismaClient,
      | 'externalPrincipal'
      | 'membership'
      | 'organization'
      | 'user'
      | '$transaction'
    >,
    private readonly hub: Pick<
      HubSession,
      | 'fromCookieHeader'
      | 'readCookie'
      | 'homeUrl'
      | 'refreshUrl'
      | 'restoreUrl'
      | 'step'
    >,
    private readonly central: Pick<
      CentralEntitlementClient,
      'lookupApplicationEntitlement'
    > & {
      lookupEmployee(input: { person_id: string }): Promise<{
        person_id: string;
        email: string;
        full_name: string;
        photo_url: string | null;
        status: string;
      }>;
    },
    private readonly issuer: string,
    private readonly applicationId: string,
    private readonly centralOrganizationId: string,
    private readonly localOrganizationId: string,
    private readonly cacheMs: number,
    private readonly dependencyState = new SharedDependencyStateTracker(),
  ) {}

  async authenticate(
    request: AuthenticatedRequest,
  ): Promise<AuthenticationResult> {
    let claims: HubSessionClaims | null;
    try {
      claims = await this.hub.fromCookieHeader(request.get('cookie'));
    } catch {
      return this.failure(
        503,
        'SHARED_SESSION_UNAVAILABLE',
        'Authentication is temporarily unavailable.',
      );
    }
    if (!claims) {
      if (this.dependencyState.states().hub === 'down') {
        return this.failure(
          503,
          'SHARED_SESSION_UNAVAILABLE',
          'Authentication is temporarily unavailable.',
        );
      }
      return this.failure(
        401,
        'AUTHENTICATION_REQUIRED',
        'Authentication is required.',
      );
    }
    if (claims.source !== 'employee') {
      return this.failure(
        403,
        'SHARED_SESSION_ACCESS_DENIED',
        'Access is denied.',
      );
    }

    const now = new Date();
    let projectedEntitlement: CentralEntitlement | undefined;
    let principal;
    try {
      principal = await this.prisma.externalPrincipal.findUnique({
        where: {
          issuer_subject: { issuer: this.issuer, subject: claims.sub },
        },
        select: {
          verified: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              avatarUrl: true,
              status: true,
            },
          },
        },
      });
    } catch {
      return this.failure(
        503,
        'SHARED_SESSION_UNAVAILABLE',
        'Authentication is temporarily unavailable.',
      );
    }
    if (!principal?.verified) {
      const projection = await projectCentralPrincipal({
        prisma: this.prisma as PrismaClient,
        central: this.central,
        claims,
        issuer: this.issuer,
        applicationId: this.applicationId,
        centralOrganizationId: this.centralOrganizationId,
        localOrganizationId: this.localOrganizationId,
      });
      if (!projection.ok) {
        return projection.kind === 'unavailable'
          ? this.failure(
              503,
              'SHARED_SESSION_UNAVAILABLE',
              'Authentication is temporarily unavailable.',
            )
          : this.failure(
              403,
              'SHARED_SESSION_ACCESS_DENIED',
              'Access is denied.',
            );
      }
      projectedEntitlement = projection.entitlement;
      try {
        principal = await this.prisma.externalPrincipal.findUnique({
          where: {
            issuer_subject: { issuer: this.issuer, subject: claims.sub },
          },
          select: {
            verified: true,
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                status: true,
              },
            },
          },
        });
      } catch {
        return this.failure(
          503,
          'SHARED_SESSION_UNAVAILABLE',
          'Authentication is temporarily unavailable.',
        );
      }
    }
    if (!principal?.verified || principal.user.status !== 'ACTIVE') {
      return this.failure(
        403,
        'SHARED_SESSION_ACCESS_DENIED',
        'Access is denied.',
      );
    }

    let entitlement;
    try {
      entitlement =
        projectedEntitlement ?? (await this.entitlement(claims.sub));
    } catch {
      return this.failure(
        503,
        'SHARED_SESSION_UNAVAILABLE',
        'Authentication is temporarily unavailable.',
      );
    }
    if (
      !entitlement ||
      !entitlement.is_active ||
      entitlement.person_id !== claims.sub ||
      entitlement.application_id !== this.applicationId ||
      entitlement.organization_id !== this.centralOrganizationId ||
      !knownRoles.has(entitlement.role) ||
      entitlement.permissions.some(
        (permission: string) => !knownPermissions.has(permission),
      ) ||
      entitlement.permissions.length !==
        permissionsByRole[entitlement.role as MembershipRole].length ||
      new Set(entitlement.permissions).size !==
        entitlement.permissions.length ||
      !permissionsByRole[entitlement.role as MembershipRole].every(
        (permission) => entitlement.permissions.includes(permission),
      )
    ) {
      return this.failure(
        403,
        'SHARED_SESSION_ACCESS_DENIED',
        'Access is denied.',
      );
    }

    let membership;
    try {
      membership = await this.prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: this.localOrganizationId,
            userId: principal.user.id,
          },
        },
        select: membershipSelect,
      });
    } catch {
      return this.failure(
        503,
        'SHARED_SESSION_UNAVAILABLE',
        'Authentication is temporarily unavailable.',
      );
    }
    if (
      !membership ||
      membership.status !== 'ACTIVE' ||
      membership.organization.status !== 'ACTIVE'
    ) {
      return this.failure(
        403,
        'SHARED_SESSION_ACCESS_DENIED',
        'Access is denied.',
      );
    }

    const role = entitlement.role as MembershipRole;
    const permissions = entitlement.permissions as Permission[];
    const activeAssignments = membership.staffAssignments.filter(
      (assignment) =>
        assignment.startsOn <= now &&
        (!assignment.endsOn || assignment.endsOn >= now),
    );
    request.auth = {
      sessionId: claims.sid,
      userId: principal.user.id,
      membershipId: membership.id,
      memberships: [
        {
          organizationId: membership.organizationId,
          role,
          permissions,
          unitIds: membership.unitScopes.map(({ unitId }) => unitId),
          gradeIds: membership.gradeScopes.map(({ gradeId }) => gradeId),
          subjectIds: membership.subjectScopes.map(
            ({ subjectId }) => subjectId,
          ),
          assignedStudentIds: activeAssignments.map(
            ({ studentId }) => studentId,
          ),
          observationAssignedStudentIds: membership.observationAssignments.map(
            ({ studentId }) => studentId,
          ),
          assignedStudentScopes: activeAssignments,
        },
      ],
    };
    const context: SharedSessionContext = {
      claims,
      user: { ...principal.user, status: 'ACTIVE' },
      membership: { ...membership, staffAssignments: activeAssignments },
      role,
      permissions,
    };
    return { ok: true, session: context };
  }

  homeUrl(): string {
    return this.hub.homeUrl();
  }

  refreshUrl(): string {
    return this.hub.refreshUrl();
  }

  async ssoStep(request: HttpRequest): Promise<{
    step: 'ok' | 'restore' | 'hub';
    claims: HubSessionClaims | null;
  }> {
    const claims = await this.hub.fromCookieHeader(request.get('cookie'));
    return {
      claims,
      step: this.hub.step({
        claims,
        restored: request.query.restored === '1',
      }),
    };
  }

  restoreUrl(returnUrl: string): string {
    return this.hub.restoreUrl(returnUrl);
  }

  readinessDependencies(): SharedDependencyStates {
    return this.dependencyState.states();
  }

  private failure(
    status: 401 | 403 | 503,
    code: string,
    message: string,
  ): AuthenticationResult {
    return { ok: false, failure: { status, code, message } };
  }

  private lookupEntitlement(subject: string) {
    return this.central.lookupApplicationEntitlement({
      person_id: subject,
      application_id: this.applicationId,
    });
  }

  private async entitlement(subject: string) {
    const cached = this.entitlementCache.get(subject);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const value = await this.lookupEntitlement(subject);
    if (
      this.cacheMs > 0 &&
      isValidCentralEntitlement(value, {
        subject,
        applicationId: this.applicationId,
        centralOrganizationId: this.centralOrganizationId,
      })
    ) {
      this.entitlementCache.set(subject, {
        expiresAt: Date.now() + this.cacheMs,
        value,
      });
    }
    return value;
  }
}

export async function createSharedSessionAuthentication(
  config: AppConfig,
  prisma: PrismaClient,
  logger: Logger,
): Promise<SharedSessionAuthenticationService | undefined> {
  if (config.sharedSessionMode !== 'shared') return undefined;
  const issuer = config.hubSessionIssuer ?? 'mws-hub';
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
        authMode: 'shared',
        applicationId: config.applicationId ?? 'learnspace',
        mappingCode,
      },
      'shared session organization mapping failed',
    );
    throw new Error(
      `Shared session organization mapping failed: ${mappingCode}`,
    );
  }
  const dependencyState = new SharedDependencyStateTracker();
  const trackedFetch: typeof fetch = async (input, init) => {
    try {
      const response = await fetch(input, init);
      if (response.ok) dependencyState.success('hub');
      else dependencyState.failure('hub');
      return response;
    } catch (error) {
      dependencyState.failure('hub');
      throw error;
    }
  };
  const hub = createHubSession({
    hubBaseUrl: config.hubBaseUrl!,
    cookieName: config.hubAccessCookieName,
    issuer,
    audience: config.hubSessionAudience ?? 'mws-apps',
    fetchImpl: trackedFetch,
  });
  await hub.ready();
  logger.info(
    {
      event: 'shared_session_ready',
      authMode: 'shared',
      applicationId: config.applicationId ?? 'learnspace',
      hubCookieName: hub.cookieName,
      hubCookieNameSource: hub.nameSource(),
    },
    'shared session initialized',
  );
  const central = createCentralDataClient(config);
  const trackedCentral: Pick<
    CentralEntitlementClient,
    'lookupApplicationEntitlement'
  > & {
    lookupEmployee: ReturnType<
      typeof createCentralDataClient
    >['lookupEmployee'];
  } = {
    lookupApplicationEntitlement: async (input) => {
      try {
        const entitlement = await central.lookupApplicationEntitlement(input);
        dependencyState.success('central');
        return entitlement;
      } catch (error) {
        dependencyState.failure('central');
        throw error;
      }
    },
    lookupEmployee: async (input) => {
      try {
        const employee = await central.lookupEmployee(input);
        dependencyState.success('central');
        return employee;
      } catch (error) {
        dependencyState.failure('central');
        throw error;
      }
    },
  };
  return new SharedSessionAuthenticationService(
    prisma,
    hub,
    trackedCentral,
    issuer,
    config.applicationId ?? 'learnspace',
    config.centralOrganizationId!,
    localOrganizationId,
    (config.sharedSessionEntitlementCacheSeconds ?? 30) * 1_000,
    dependencyState,
  );
}
