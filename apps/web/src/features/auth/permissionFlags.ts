// What a person is, told by what they may do. Role names come from Central and can be anything.
export function flagsFromPermissions(permissions: readonly string[]) {
  return {
    // Writes the weekly report and submits IEPs for the students assigned to them.
    isGPK: permissions.includes('weekly-report:teach'),
    // Coordinates special education: approves IEP steps and weekly reports.
    isSpecialEdCoordinator: permissions.includes('iep:coordinator-approve'),
  };
}

// Reaches the whole organization, like a director or principal.
export function reachesOrganization(permissions: readonly string[]): boolean {
  return permissions.includes('scope.organization');
}
