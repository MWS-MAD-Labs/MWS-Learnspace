import { describe, expect, it } from 'vitest';
import {
  AuthorizationDeniedError,
  authorizeWithAudit,
  hasPermission,
  requireOrganizationScope,
  requirePermission,
  type MembershipScope,
} from '../src/authorization.js';

const teacher: MembershipScope = {
  organizationId: 'organization-a',
  role: 'GRADE_TEACHER',
  unitIds: ['unit-a'],
  gradeIds: ['grade-a'],
  subjectIds: [],
  assignedStudentIds: [],
};

describe('authorization primitives', () => {
  it('maps roles to explicit permissions and denies unlisted actions', () => {
    expect(hasPermission('GRADE_TEACHER', 'attendance:write')).toBe(true);
    expect(hasPermission('GRADE_TEACHER', 'organization:admin')).toBe(false);
    expect(hasPermission('DIRECTOR', 'journey:approve')).toBe(true);
    expect(hasPermission('DIRECTOR', 'student:admin')).toBe(true);
    expect(hasPermission('DIRECTOR', 'student:sensitive-read')).toBe(true);
    expect(hasPermission('DIRECTOR', 'staff-assignment:admin')).toBe(true);
    expect(
      hasPermission('SPECIAL_ED_COORDINATOR', 'staff-assignment:admin'),
    ).toBe(true);
    expect(
      hasPermission('SPECIAL_ED_COORDINATOR', 'staff-directory:read'),
    ).toBe(true);
    expect(hasPermission('PRINCIPAL', 'staff-directory:read')).toBe(true);
    expect(hasPermission('PRINCIPAL', 'student:sensitive-read')).toBe(true);
    expect(hasPermission('PRINCIPAL', 'staff-assignment:admin')).toBe(false);
    expect(hasPermission('GRADE_TEACHER', 'student:admin')).toBe(false);
    expect(hasPermission('GRADE_TEACHER', 'student:sensitive-read')).toBe(
      false,
    );
    expect(hasPermission('SPECIAL_ED_COORDINATOR', 'journey:read')).toBe(false);
    expect(hasPermission('SPECIAL_ED_TEACHER', 'journey:read')).toBe(false);
    expect(hasPermission('SPECIALIST', 'staff-directory:read')).toBe(false);
    expect(hasPermission('SPECIALIST', 'report:export')).toBe(false);
  });

  it('requires the server-loaded organization membership', () => {
    expect(requireOrganizationScope([teacher], 'organization-a')).toBe(teacher);
    expect(() => requireOrganizationScope([teacher], 'organization-b')).toThrow(
      AuthorizationDeniedError,
    );
  });

  it('denies by default when a membership has no matching permission', () => {
    expect(() => requirePermission(teacher, 'organization:admin')).toThrow(
      AuthorizationDeniedError,
    );
  });

  it('records a safe denial audit event', async () => {
    const events: unknown[] = [];
    await expect(
      authorizeWithAudit({
        audit: { append: async (event) => events.push(event) },
        memberships: [teacher],
        organizationId: 'organization-a',
        actorId: 'actor-a',
        permission: 'organization:admin',
        action: 'organization.update',
        targetType: 'Organization',
        targetId: 'organization-a',
        requestId: 'request-a',
        route: '/api/v1/organizations/:id',
        method: 'PATCH',
      }),
    ).rejects.toThrow(AuthorizationDeniedError);
    expect(events).toEqual([
      expect.objectContaining({
        result: 'DENIED',
        metadata: {
          route: '/api/v1/organizations/:id',
          method: 'PATCH',
        },
      }),
    ]);
  });
});
