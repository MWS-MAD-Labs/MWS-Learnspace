import type { MembershipRole, PrismaClient } from '@prisma/client';
import type { PermissionManifestEntry } from 'mws-central-auth/data-client';
import type { CreateAuditEventInput } from '../service/audit-service.js';

export const PERMISSIONS = [
  'attendance:read',
  'attendance:write',
  'journey:read',
  'journey:write',
  'journey:review',
  'journey:approve',
  'special-ed:read',
  'special-ed:write',
  'special-ed:review',
  'report:export',
  'student:admin',
  'student:sensitive-read',
  'staff-directory:read',
  'staff-assignment:admin',
  'organization:admin',
  'observation:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

type LearnspacePermissionManifestEntry = PermissionManifestEntry & {
  key: Permission;
  requires?: Permission[];
};

export const PERMISSION_MANIFEST = [
  {
    key: 'attendance:read',
    description: 'Read attendance records within the authorized scope.',
  },
  {
    key: 'attendance:write',
    description:
      'Create and update attendance records within the authorized scope.',
    requires: ['attendance:read'],
  },
  {
    key: 'journey:read',
    description: 'Read Learning Journeys within the authorized scope.',
  },
  {
    key: 'journey:write',
    description: 'Create, update, and submit owned Learning Journey drafts.',
    requires: ['journey:read'],
  },
  {
    key: 'journey:review',
    description: 'Review and return submitted Learning Journeys.',
    requires: ['journey:read'],
  },
  {
    key: 'journey:approve',
    description: 'Approve and return reviewed Learning Journeys.',
    requires: ['journey:read'],
  },
  {
    key: 'special-ed:read',
    description: 'Read authorized special-education records and workflows.',
  },
  {
    key: 'special-ed:write',
    description: 'Create and update authorized special-education records.',
    requires: ['special-ed:read'],
  },
  {
    key: 'special-ed:review',
    description: 'Review special-education records and workflow decisions.',
    requires: ['special-ed:read'],
  },
  {
    key: 'report:export',
    description: 'Export authorized reports.',
  },
  {
    key: 'student:admin',
    description: 'Create and update student records.',
  },
  {
    key: 'student:sensitive-read',
    description: 'Read sensitive student address and guardian contact fields.',
  },
  {
    key: 'staff-directory:read',
    description: 'Read the organization staff directory.',
  },
  {
    key: 'staff-assignment:admin',
    description: 'Manage special-education staff-to-student assignments.',
    requires: ['staff-directory:read'],
  },
  {
    key: 'organization:admin',
    description: 'Manage organization memberships and configuration.',
  },
  {
    key: 'observation:manage',
    description: 'Manage observation definitions and student assignments.',
    requires: ['special-ed:read'],
  },
] satisfies LearnspacePermissionManifestEntry[];

export const permissionsByRole: Record<MembershipRole, readonly Permission[]> =
  {
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
  permissions?: readonly Permission[];
  unitIds: string[];
  gradeIds: string[];
  subjectIds: string[];
  assignedStudentIds: string[];
  observationAssignedStudentIds?: string[];
  assignedStudentScopes?: Array<{
    organizationId: string;
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
  if (!membershipHasPermission(membership, permission)) {
    throw new AuthorizationDeniedError();
  }
}

export function membershipHasPermission(
  membership: MembershipScope,
  permission: Permission,
): boolean {
  return membership.permissions
    ? membership.permissions.includes(permission)
    : hasPermission(membership.role, permission);
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

export function createScopedService(prisma: PrismaClient) {
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
