import { Prisma, type PrismaClient } from '@prisma/client';
import type { HubSessionClaims } from 'mws-central-auth/server';
import {
  permissionsByRole,
  permissionsForRole,
  type MembershipRole,
  grantedPermissions,
} from '../utils/authorization.js';
import type { CentralEntitlement } from './shared-session-shadow-service.js';

const projectionConflictCodes = new Set(['P2002', 'P2034']);
const knownRoles = new Set<string>(Object.keys(permissionsByRole));

export const centralProjectionDenialCodes = [
  'SOURCE_NOT_SUPPORTED',
  'EMPLOYEE_PROFILE_INVALID',
  'EMPLOYEE_INACTIVE',
  'EMAIL_MISMATCH',
  'ENTITLEMENT_INVALID',
  'USER_EMAIL_NOT_UNIQUE',
  'USER_DISABLED',
  'PRINCIPAL_CONFLICT',
  'MEMBERSHIP_DISABLED',
  'ORGANIZATION_INACTIVE',
  'WRITE_CONFLICT',
] as const;

export type CentralProjectionDenialCode =
  (typeof centralProjectionDenialCodes)[number];

export type CentralProjectionResult =
  | {
      ok: true;
      userId: string;
      entitlement: NonNullable<CentralEntitlement>;
    }
  | { ok: false; kind: 'denied'; code: CentralProjectionDenialCode }
  | { ok: false; kind: 'unavailable' };

type ProjectionCentralClient = {
  lookupApplicationEntitlement(input: {
    person_id: string;
    application_id: string;
  }): Promise<CentralEntitlement>;
  lookupEmployee(input: { person_id: string }): Promise<{
    person_id: string;
    email: string;
    full_name: string;
    photo_url: string | null;
    status: string;
  }>;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function exactPermissions(
  entitlement: NonNullable<CentralEntitlement>,
  role: MembershipRole,
): boolean {
  const actual = entitlement.permissions;
  const expected = permissionsForRole(role);
  return (
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    expected.every((permission) => actual.includes(permission))
  );
}

function prismaCode(error: unknown): string | undefined {
  return (error as { code?: string }).code;
}

class ProjectionDenied extends Error {
  constructor(readonly code: CentralProjectionDenialCode) {
    super(code);
  }
}

export async function projectCentralPrincipal(input: {
  prisma: PrismaClient;
  central: ProjectionCentralClient;
  claims: HubSessionClaims;
  issuer: string;
  applicationId: string;
  centralOrganizationId: string;
  localOrganizationId: string;
  maxAttempts?: number;
}): Promise<CentralProjectionResult> {
  if (input.claims.source !== 'employee') {
    return { ok: false, kind: 'denied', code: 'SOURCE_NOT_SUPPORTED' };
  }

  let employee: Awaited<ReturnType<ProjectionCentralClient['lookupEmployee']>>;
  let entitlement: CentralEntitlement;
  try {
    [employee, entitlement] = await Promise.all([
      input.central.lookupEmployee({ person_id: input.claims.sub }),
      input.central.lookupApplicationEntitlement({
        person_id: input.claims.sub,
        application_id: input.applicationId,
      }),
    ]);
  } catch {
    return { ok: false, kind: 'unavailable' };
  }

  if (!employee || employee.person_id !== input.claims.sub) {
    return { ok: false, kind: 'denied', code: 'EMPLOYEE_PROFILE_INVALID' };
  }
  if (employee.status.trim().toUpperCase() !== 'ACTIVE') {
    return { ok: false, kind: 'denied', code: 'EMPLOYEE_INACTIVE' };
  }
  const email = normalizeEmail(employee.email);
  if (!email || email !== normalizeEmail(input.claims.email)) {
    return { ok: false, kind: 'denied', code: 'EMAIL_MISMATCH' };
  }
  if (
    !entitlement ||
    !entitlement.is_active ||
    entitlement.person_id !== input.claims.sub ||
    entitlement.application_id !== input.applicationId ||
    entitlement.organization_id !== input.centralOrganizationId ||
    !knownRoles.has(entitlement.role) ||
    !exactPermissions(entitlement, entitlement.role as MembershipRole)
  ) {
    return { ok: false, kind: 'denied', code: 'ENTITLEMENT_INVALID' };
  }

  const role = entitlement.role as MembershipRole;
  const attempts = input.maxAttempts ?? 3;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await input.prisma.$transaction(
        async (transaction: Prisma.TransactionClient) => {
          const organization = await transaction.organization.findUnique({
            where: { id: input.localOrganizationId },
            select: { status: true },
          });
          if (organization?.status !== 'ACTIVE') {
            throw new ProjectionDenied('ORGANIZATION_INACTIVE');
          }

          const users = await transaction.user.findMany({
            where: { email: { equals: email, mode: 'insensitive' } },
            take: 2,
            select: { id: true, status: true },
          });
          if (users.length > 1) {
            throw new ProjectionDenied('USER_EMAIL_NOT_UNIQUE');
          }
          let user = users[0];
          if (!user) {
            user = await transaction.user.create({
              data: {
                email,
                displayName: employee.full_name.trim() || email,
                avatarUrl: employee.photo_url,
              },
              select: { id: true, status: true },
            });
          }
          if (user.status !== 'ACTIVE') {
            throw new ProjectionDenied('USER_DISABLED');
          }

          const [bySubject, byUser] = await Promise.all([
            transaction.externalPrincipal.findUnique({
              where: {
                issuer_subject: {
                  issuer: input.issuer,
                  subject: input.claims.sub,
                },
              },
              select: { userId: true, verified: true },
            }),
            transaction.externalPrincipal.findUnique({
              where: {
                userId_issuer: { userId: user.id, issuer: input.issuer },
              },
              select: { subject: true, verified: true },
            }),
          ]);
          if (bySubject || byUser) {
            if (
              bySubject?.userId !== user.id ||
              byUser?.subject !== input.claims.sub ||
              !bySubject.verified ||
              !byUser.verified
            ) {
              throw new ProjectionDenied('PRINCIPAL_CONFLICT');
            }
          } else {
            await transaction.externalPrincipal.create({
              data: {
                userId: user.id,
                issuer: input.issuer,
                subject: input.claims.sub,
                source: input.claims.source,
                linkSource: 'first_login_central_projection',
                verified: true,
                verifiedAt: new Date(),
              },
            });
          }

          const membership = await transaction.membership.findUnique({
            where: {
              organizationId_userId: {
                organizationId: input.localOrganizationId,
                userId: user.id,
              },
            },
            select: { id: true, status: true, role: true },
          });
          if (membership?.status === 'DISABLED') {
            throw new ProjectionDenied('MEMBERSHIP_DISABLED');
          }
          if (!membership) {
            await transaction.membership.create({
              data: {
                organizationId: input.localOrganizationId,
                userId: user.id,
                role,
                permissions: grantedPermissions(role),
              },
            });
          } else if (membership.role !== role) {
            await transaction.membership.update({
              where: { id: membership.id },
              data: { role, permissions: grantedPermissions(role) },
            });
          }
          return { ok: true, userId: user.id, entitlement } as const;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof ProjectionDenied) {
        return { ok: false, kind: 'denied', code: error.code };
      }
      if (!projectionConflictCodes.has(prismaCode(error) ?? '')) {
        return { ok: false, kind: 'unavailable' };
      }
      if (attempt === attempts) {
        return { ok: false, kind: 'denied', code: 'WRITE_CONFLICT' };
      }
    }
  }
  return { ok: false, kind: 'denied', code: 'WRITE_CONFLICT' };
}
