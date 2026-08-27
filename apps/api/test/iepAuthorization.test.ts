import { describe, expect, it } from 'vitest';
import {
  activeAssignedStudentIds,
  canRoleRunIepWorkflowCommand,
  type IepWorkflowCommandName,
} from '../src/iepRoutes.js';
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

const roles = [
  'DIRECTOR',
  'PRINCIPAL',
  'GRADE_TEACHER',
  'SUBJECT_TEACHER',
  'SPECIAL_ED_COORDINATOR',
  'SPECIAL_ED_TEACHER',
  'SPECIALIST',
] as const;

const workflowRoleTable: Array<
  [IepWorkflowCommandName, readonly (typeof roles)[number][]]
> = [
  ['SUBMIT', ['SPECIAL_ED_COORDINATOR', 'SPECIAL_ED_TEACHER', 'SPECIALIST']],
  ['COORDINATOR_APPROVE', ['SPECIAL_ED_COORDINATOR']],
  ['COORDINATOR_RETURN', ['SPECIAL_ED_COORDINATOR']],
  ['DIRECTOR_APPROVE', ['DIRECTOR']],
  ['DIRECTOR_RETURN', ['DIRECTOR']],
  ['ACTIVATE', ['DIRECTOR']],
  ['ARCHIVE', ['DIRECTOR']],
];

describe('IEP workflow role table', () => {
  it.each(workflowRoleTable)(
    'enforces every role for %s',
    (command, allowedRoles) => {
      for (const role of roles) {
        expect(canRoleRunIepWorkflowCommand(role, command)).toBe(
          allowedRoles.includes(role),
        );
      }
    },
  );
});

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
