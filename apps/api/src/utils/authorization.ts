import type { PrismaClient } from '@prisma/client';
import type { PermissionManifestEntry } from 'mws-central-auth/data-client';
import type { CreateAuditEventInput } from '../service/audit-service.js';

// A role is the key of a Central role: any text. These are the roles Learnspace shipped with and still knows the
// permissions of (see ADR 0002).
export const BUILT_IN_ROLES = [
  'PRINCIPAL',
  'DIRECTOR',
  'GRADE_TEACHER',
  'SUBJECT_TEACHER',
  'SPECIAL_ED_COORDINATOR',
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
] as const;
export type BuiltInRole = (typeof BUILT_IN_ROLES)[number];
export type MembershipRole = string;

export function isBuiltInRole(role: string): role is BuiltInRole {
  return (BUILT_IN_ROLES as readonly string[]).includes(role);
}

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
  // What the role name used to decide: how far a person reaches, and who may take each workflow step.
  'scope.organization',
  'scope.grade',
  'scope.subject',
  'scope.special-ed',
  'scope.assigned',
  'iep:submit',
  'iep:coordinator-approve',
  'iep:coordinator-return',
  'iep:director-approve',
  'iep:director-return',
  'iep:activate',
  'iep:archive',
  'weekly-report:teach',
  'weekly-report:coordinate',
  'weekly-report:direct',
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
  {
    key: 'scope.organization',
    description:
      'Reach every record of the organization, without a unit, grade, subject, or assignment limit.',
  },
  {
    key: 'scope.grade',
    description:
      'Reach the classes, students, and Learning Journeys of the units and grades assigned in Learnspace.',
  },
  {
    key: 'scope.subject',
    description:
      'Reach the Learning Journeys of the subjects assigned in Learnspace.',
  },
  {
    key: 'scope.special-ed',
    description:
      'Reach every special-needs student, observation, and IEP of the organization.',
  },
  {
    key: 'scope.assigned',
    description:
      'Reach only the students assigned in Learnspace, for the dates of the assignment.',
  },
  {
    key: 'iep:submit',
    description: 'Submit an IEP for review.',
    requires: ['special-ed:write'],
  },
  {
    key: 'iep:coordinator-approve',
    description: 'Approve an IEP as the special-education coordinator.',
    requires: ['special-ed:review'],
  },
  {
    key: 'iep:coordinator-return',
    description: 'Return an IEP as the special-education coordinator.',
    requires: ['special-ed:review'],
  },
  {
    key: 'iep:director-approve',
    description: 'Approve an IEP as the director.',
    requires: ['special-ed:review'],
  },
  {
    key: 'iep:director-return',
    description: 'Return an IEP as the director.',
    requires: ['special-ed:review'],
  },
  {
    key: 'iep:activate',
    description: 'Activate an approved IEP.',
    requires: ['special-ed:review'],
  },
  {
    key: 'iep:archive',
    description: 'Archive an IEP.',
    requires: ['special-ed:review'],
  },
  {
    key: 'weekly-report:teach',
    description: 'Write, edit, and submit own weekly reports.',
    requires: ['special-ed:write'],
  },
  {
    key: 'weekly-report:coordinate',
    description: 'Take the coordinator step of a weekly report.',
    requires: ['special-ed:review'],
  },
  {
    key: 'weekly-report:direct',
    description: 'Take the director step of a weekly report.',
    requires: ['special-ed:review'],
  },
] satisfies LearnspacePermissionManifestEntry[];

export const permissionsByRole: Record<BuiltInRole, readonly Permission[]> = {
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

// What the role name used to decide, as permissions. With the base list of a built-in role they are the default grant:
// what a Central role of the same name is created with, and what a membership follows while none are stored with it.
export const roleDerivedPermissions: Record<
  BuiltInRole,
  readonly Permission[]
> = {
  DIRECTOR: [
    'scope.organization',
    'iep:director-approve',
    'iep:director-return',
    'iep:activate',
    'iep:archive',
    'weekly-report:direct',
  ],
  PRINCIPAL: ['scope.organization'],
  GRADE_TEACHER: ['scope.grade'],
  SUBJECT_TEACHER: ['scope.subject'],
  SPECIAL_ED_COORDINATOR: [
    'scope.special-ed',
    'iep:submit',
    'iep:coordinator-approve',
    'iep:coordinator-return',
    'weekly-report:coordinate',
  ],
  SPECIAL_ED_TEACHER: ['scope.assigned', 'iep:submit', 'weekly-report:teach'],
  SPECIALIST: ['scope.assigned', 'iep:submit', 'weekly-report:teach'],
};

export function permissionsForRole(
  role: MembershipRole,
): readonly Permission[] {
  return isBuiltInRole(role) ? permissionsByRole[role] : [];
}

// Everything a built-in role gives: what it always had and what the role name used to decide. This is what a
// membership stores. Unknown roles give nothing.
export function grantedPermissions(role: MembershipRole): Permission[] {
  if (!isBuiltInRole(role)) return [];
  return [
    ...new Set([...permissionsByRole[role], ...roleDerivedPermissions[role]]),
  ];
}

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
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
  // The permissions given to the membership are the whole answer, Central's or the ones stored with it. Only a
  // membership that has none yet follows what its built-in role grants.
  const granted = membership.permissions ?? grantedPermissions(membership.role);
  return granted.includes(permission);
}

// What a membership may do: the permissions stored with it, or, while none are stored, what its built-in role grants.
export function permissionsOfMembership(
  role: MembershipRole,
  stored?: readonly string[] | null,
): Permission[] {
  const known = (stored ?? []).filter(isPermission);
  return known.length ? known : grantedPermissions(role);
}

export const MAX_ROLE_KEY_LENGTH = 128;

// What Central says a person may do in this application, once it is checked: the role is any key Central made, and
// every permission is one of the keys of the manifest, once. A key Learnspace does not know is refused, never ignored.
export function centralEntitlementAccess(entitlement: {
  role: string;
  permissions: readonly string[];
}): { role: string; permissions: Permission[] } | undefined {
  const role =
    typeof entitlement.role === 'string' ? entitlement.role.trim() : '';
  if (!role || role.length > MAX_ROLE_KEY_LENGTH) return undefined;
  if (!Array.isArray(entitlement.permissions)) return undefined;
  const permissions = entitlement.permissions;
  if (new Set(permissions).size !== permissions.length) return undefined;
  if (!permissions.every(isPermission)) return undefined;
  return { role, permissions: [...permissions] };
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
