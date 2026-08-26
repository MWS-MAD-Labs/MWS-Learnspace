import type { MembershipRole, PrismaClient } from '@prisma/client';
import type { CreateAuditEventInput } from './audit.js';

export type Permission =
  | 'attendance:read'
  | 'attendance:write'
  | 'journey:read'
  | 'journey:write'
  | 'journey:review'
  | 'journey:approve'
  | 'special-ed:read'
  | 'special-ed:write'
  | 'special-ed:review'
  | 'report:export'
  | 'student:admin'
  | 'student:sensitive-read'
  | 'staff-directory:read'
  | 'staff-assignment:admin'
  | 'organization:admin'
  | 'observation:manage';

const permissionsByRole: Record<MembershipRole, readonly Permission[]> = {
  DIRECTOR: [
    'attendance:read',
    'journey:read',
    'journey:approve',
    'special-ed:read',
    'special-ed:review',
    'report:export',
    'student:admin',
    'student:sensitive-read',
    'staff-directory:read',
    'staff-assignment:admin',
    'organization:admin',
  ],
  PRINCIPAL: [
    'attendance:read',
    'journey:read',
    'journey:review',
    'special-ed:read',
    'special-ed:review',
    'report:export',
    'student:sensitive-read',
    'staff-directory:read',
  ],
  GRADE_TEACHER: [
    'attendance:read',
    'attendance:write',
    'journey:read',
    'journey:write',
  ],
  SUBJECT_TEACHER: ['journey:read', 'journey:write'],
  SPECIAL_ED_COORDINATOR: [
    'attendance:read',
    'special-ed:read',
    'special-ed:write',
    'special-ed:review',
    'report:export',
    'student:sensitive-read',
    'staff-directory:read',
    'staff-assignment:admin',
    'observation:manage',
  ],
  SPECIAL_ED_TEACHER: [
    'attendance:read',
    'special-ed:read',
    'special-ed:write',
  ],
  SPECIALIST: ['special-ed:read', 'special-ed:write'],
};

export function permissionsForRole(
  role: MembershipRole,
): readonly Permission[] {
  return permissionsByRole[role] ?? [];
}

export function hasPermission(
  role: MembershipRole,
  permission: Permission,
): boolean {
  return permissionsForRole(role).includes(permission);
}

export type MembershipScope = {
  organizationId: string;
  role: MembershipRole;
  unitIds: string[];
  gradeIds: string[];
  subjectIds: string[];
  assignedStudentIds: string[];
  observationAssignedStudentIds?: string[];
  assignedStudentScopes?: Array<{
    studentId: string;
    startsOn: Date;
    endsOn: Date | null;
  }>;
};

export function requireOrganizationScope(
  memberships: readonly MembershipScope[],
  organizationId: string,
): MembershipScope {
  const membership = memberships.find(
    (candidate) => candidate.organizationId === organizationId,
  );
  if (!membership) throw new AuthorizationDeniedError();
  return membership;
}

export function requirePermission(
  membership: MembershipScope,
  permission: Permission,
): void {
  if (!hasPermission(membership.role, permission)) {
    throw new AuthorizationDeniedError();
  }
}

type AuditAppender = {
  append(input: CreateAuditEventInput): Promise<unknown>;
};

export async function authorizeWithAudit(input: {
  audit: AuditAppender;
  memberships: readonly MembershipScope[];
  organizationId: string;
  actorId: string;
  permission: Permission;
  action: string;
  targetType: string;
  targetId: string;
  requestId: string;
  route: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}): Promise<MembershipScope> {
  try {
    const membership = requireOrganizationScope(
      input.memberships,
      input.organizationId,
    );
    requirePermission(membership, input.permission);
    await input.audit.append({
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      requestId: input.requestId,
      result: 'SUCCEEDED',
      metadata: { route: input.route, method: input.method },
    });
    return membership;
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) {
      await input.audit.append({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        requestId: input.requestId,
        result: 'DENIED',
        metadata: { route: input.route, method: input.method },
      });
    }
    throw error;
  }
}

export class AuthorizationDeniedError extends Error {
  constructor() {
    super('Authorization denied');
    this.name = 'AuthorizationDeniedError';
  }
}

export function createScopedRepository(prisma: PrismaClient) {
  return {
    student: {
      findUnique(organizationId: string, studentId: string) {
        return prisma.student.findFirst({
          where: { id: studentId, organizationId },
        });
      },
    },
    membership: {
      findUnique(organizationId: string, membershipId: string) {
        return prisma.membership.findFirst({
          where: { id: membershipId, organizationId },
        });
      },
    },
    learningJourney: {
      findUnique(organizationId: string, journeyId: string) {
        return prisma.learningJourney.findFirst({
          where: { id: journeyId, organizationId },
        });
      },
    },
  };
}
