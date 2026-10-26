import {
  PERMISSION_MANIFEST,
  grantedPermissions,
  type BuiltInRole,
} from './authorization.js';

// The roles Learnspace has always had, as roles to create in Central. Central keeps one role per set of permissions, and
// the GPK teacher and the specialist hold the same set, so they are one preset. Highest first: Central ranks roles in the
// order they are created.
const presetRoles: ReadonlyArray<{ key: BuiltInRole; label: string }> = [
  { key: 'DIRECTOR', label: 'Director' },
  { key: 'PRINCIPAL', label: 'Principal' },
  { key: 'SPECIAL_ED_COORDINATOR', label: 'Special Education Coordinator' },
  { key: 'GRADE_TEACHER', label: 'Grade Teacher' },
  { key: 'SUBJECT_TEACHER', label: 'Subject Teacher' },
  { key: 'SPECIAL_ED_TEACHER', label: 'Special Education Teacher' },
];

export function buildRolePresets() {
  const order = new Map(
    PERMISSION_MANIFEST.map(({ key }, index) => [key, index]),
  );
  return {
    application_id: 'learnspace',
    roles: presetRoles.map(({ key, label }) => ({
      key,
      label,
      permissions: [...grantedPermissions(key)].sort(
        (left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0),
      ),
      allows_employees: true,
      allows_students: false,
      allows_interns: false,
    })),
  };
}
