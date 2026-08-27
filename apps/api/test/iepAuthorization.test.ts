import { describe, expect, it } from 'vitest';
import { activeAssignedStudentIds } from '../src/iepRoutes.js';
import type { MembershipScope } from '../src/authorization.js';

const onDate = new Date('2026-08-27T00:00:00.000Z');
const base = {
  organizationId: 'organization-a',
  unitIds: [],
  gradeIds: [],
  subjectIds: [],
  assignedStudentIds: [],
  observationAssignedStudentIds: ['observation-only'],
};

describe('IEP student scope', () => {
  it.each(['DIRECTOR', 'PRINCIPAL', 'SPECIAL_ED_COORDINATOR'] as const)(
    'grants %s broad organization scope',
    (role) => {
      expect(
        activeAssignedStudentIds({ ...base, role }, onDate),
      ).toBeUndefined();
    },
  );

  it.each(['SPECIAL_ED_TEACHER', 'SPECIALIST'] as const)(
    'limits %s to active permanent staff assignments',
    (role) => {
      const membership: MembershipScope = {
        ...base,
        role,
        assignedStudentScopes: [
          {
            studentId: 'active',
            startsOn: new Date('2026-08-01T00:00:00.000Z'),
            endsOn: null,
          },
          {
            studentId: 'future',
            startsOn: new Date('2026-09-01T00:00:00.000Z'),
            endsOn: null,
          },
          {
            studentId: 'ended',
            startsOn: new Date('2026-01-01T00:00:00.000Z'),
            endsOn: new Date('2026-08-26T00:00:00.000Z'),
          },
        ],
      };
      expect(activeAssignedStudentIds(membership, onDate)).toEqual(['active']);
      expect(activeAssignedStudentIds(membership, onDate)).not.toContain(
        'observation-only',
      );
    },
  );

  it('denies every unrelated role uniformly', () => {
    const membership: MembershipScope = { ...base, role: 'GRADE_TEACHER' };
    expect(activeAssignedStudentIds(membership, onDate)).toEqual([]);
  });
});
