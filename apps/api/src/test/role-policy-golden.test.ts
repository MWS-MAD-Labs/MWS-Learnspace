import { MembershipRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  membershipHasPermission,
  permissionsForRole,
  roleDerivedPermissions,
  type MembershipScope,
  type Permission,
} from '../utils/authorization.js';
import {
  aggregateActiveAssignedStudentIds,
  aggregateDatedObservationScope,
  aggregateJourneyScopeWhere,
  aggregateStudentScopeWhere,
  canReportObservationAggregates,
  observationAssignmentWhere,
  specialEducationStudentWhere,
} from '../utils/aggregates.queries.js';
import { requireAttendanceClassScope } from '../utils/attendance.policy.js';
import {
  activeAssignedStudentIds,
  assertIepStudentScope,
  canRoleRunIepWorkflowCommand,
  iepWorkflowPermissions,
  requireIepPermission,
  requireIepRole,
  type IepWorkflowCommandName,
} from '../utils/ieps.policy.js';
import {
  assertLearningJourneyWriteScope,
  learningJourneyScopeWhere,
  requireLearningJourneyPermission,
} from '../utils/learning-journeys.policy.js';
import {
  canReadObservationStudent,
  requireObservationPermission,
} from '../utils/observations.policy.js';
import {
  isLeadership,
  requireAcademicCollectionAccess,
  requireResourcePermission,
  scopedClassWhere,
  studentScopeWhere,
} from '../utils/resource-access.js';
import {
  assertWeeklyReportStudentScope,
  requireWeeklyReportEditor,
  requireWeeklyReportPermission,
  requireWeeklyReportTeacher,
  requireWeeklyReportTransitionActor,
  weeklyReportAssignedStudentIds,
  type WeeklyReportTransitionKind,
} from '../utils/weekly-reports.policy.js';

// The decisions the seven built-in roles get today, from every function that branches on the role name. They are the
// baseline for moving access to permissions that Central owns: whatever replaces a role check has to give each role
// the same answer here. When a decision changes on purpose, the snapshot changes in the same commit and says why.
const ORGANIZATION = 'organization-a';
const DAY = new Date('2026-03-10T00:00:00.000Z');
const ROLES = Object.values(MembershipRole);
// The permissions that existed when the snapshot was taken. Newer keys are checked in their own test.
const LEGACY_PERMISSIONS: readonly Permission[] = [
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
];

function membership(
  role: MembershipRole,
  over: Partial<MembershipScope> = {},
): MembershipScope {
  return {
    organizationId: ORGANIZATION,
    role,
    unitIds: ['unit-a'],
    gradeIds: ['grade-a'],
    subjectIds: ['subject-a'],
    assignedStudentIds: ['student-a'],
    observationAssignedStudentIds: ['student-b'],
    assignedStudentScopes: [
      {
        organizationId: ORGANIZATION,
        studentId: 'student-a',
        startsOn: new Date('2026-01-01T00:00:00.000Z'),
        endsOn: null,
      },
    ],
    ...over,
  };
}

const bare = (role: MembershipRole) =>
  membership(role, {
    unitIds: [],
    gradeIds: [],
    subjectIds: [],
    assignedStudentIds: [],
    observationAssignedStudentIds: [],
    assignedStudentScopes: [],
  });

// What a call gave: the value it returned, or that it was denied. A thrown error other than a denial stays an error.
function outcome(call: () => unknown): unknown {
  try {
    const value = call();
    return value === undefined ? 'ALLOW' : { value };
  } catch (error) {
    if ((error as { status?: number }).status === 403) return 'DENY';
    if ((error as Error).name === 'AuthorizationDeniedError') return 'DENY';
    throw error;
  }
}

const COMMANDS = Object.keys(
  iepWorkflowPermissions,
) as IepWorkflowCommandName[];
const TRANSITIONS: WeeklyReportTransitionKind[] = [
  'submit',
  'coordinator',
  'director',
];
const RESOURCES = [
  'academicYears',
  'semesters',
  'units',
  'grades',
  'classes',
  'subjects',
] as const;
const SPECIAL_ED = [
  'special-ed:read',
  'special-ed:write',
  'special-ed:review',
] as const;

function decisionsFor(role: MembershipRole) {
  const scoped = membership(role);
  const empty = bare(role);
  return {
    permissions: permissionsForRole(role),
    permissionChecks: Object.fromEntries(
      LEGACY_PERMISSIONS.map((key) => [
        key,
        membershipHasPermission(scoped, key),
      ]),
    ),
    leadership: isLeadership(scoped),
    attendance: {
      read: outcome(() =>
        requireAttendanceClassScope(scoped, 'attendance:read'),
      ),
      write: outcome(() =>
        requireAttendanceClassScope(scoped, 'attendance:write'),
      ),
      readWithoutScope: outcome(() =>
        requireAttendanceClassScope(empty, 'attendance:read'),
      ),
    },
    academicCollections: Object.fromEntries(
      RESOURCES.map((resource) => [
        resource,
        outcome(() => requireAcademicCollectionAccess(scoped, resource)),
      ]),
    ),
    resourcePermissions: Object.fromEntries(
      (
        [
          'student:admin',
          'student:sensitive-read',
          'staff-directory:read',
          'staff-assignment:admin',
          'organization:admin',
        ] as const
      ).map((key) => [
        key,
        outcome(() => requireResourcePermission(scoped, key)),
      ]),
    ),
    classScope: {
      scoped: scopedClassWhere(scoped) ?? 'NONE',
      empty: scopedClassWhere(empty) ?? 'NONE',
    },
    studentScope: {
      scoped: studentScopeWhere(scoped, DAY) ?? 'NONE',
      empty: studentScopeWhere(empty, DAY) ?? 'NONE',
    },
    journeys: {
      permissions: Object.fromEntries(
        (
          [
            'journey:read',
            'journey:write',
            'journey:review',
            'journey:approve',
          ] as const
        ).map((key) => [
          key,
          outcome(() => requireLearningJourneyPermission(scoped, key)),
        ]),
      ),
      scope: learningJourneyScopeWhere(scoped) ?? 'NONE',
      scopeEmpty: learningJourneyScopeWhere(empty) ?? 'NONE',
      writeInUnit: outcome(() =>
        assertLearningJourneyWriteScope(scoped, {
          unitId: 'unit-a',
          gradeId: 'other',
          subjectId: 'other',
        }),
      ),
      writeInGrade: outcome(() =>
        assertLearningJourneyWriteScope(scoped, {
          unitId: 'other',
          gradeId: 'grade-a',
          subjectId: 'other',
        }),
      ),
      writeInSubject: outcome(() =>
        assertLearningJourneyWriteScope(scoped, {
          unitId: 'other',
          gradeId: 'other',
          subjectId: 'subject-a',
        }),
      ),
      writeElsewhere: outcome(() =>
        assertLearningJourneyWriteScope(scoped, {
          unitId: 'other',
          gradeId: 'other',
          subjectId: 'other',
        }),
      ),
    },
    weeklyReports: {
      permissions: Object.fromEntries(
        SPECIAL_ED.map((key) => [
          key,
          outcome(() => requireWeeklyReportPermission(scoped, key)),
        ]),
      ),
      assignedStudents: weeklyReportAssignedStudentIds(scoped, DAY) ?? 'ALL',
      assignedStudentIn: outcome(() =>
        assertWeeklyReportStudentScope(scoped, 'student-a', DAY),
      ),
      assignedStudentOut: outcome(() =>
        assertWeeklyReportStudentScope(scoped, 'student-z', DAY),
      ),
      teacher: outcome(() => requireWeeklyReportTeacher(scoped)),
      editorOwn: outcome(() => requireWeeklyReportEditor(scoped, 'me', 'me')),
      editorOther: outcome(() =>
        requireWeeklyReportEditor(scoped, 'other', 'me'),
      ),
      transitions: Object.fromEntries(
        TRANSITIONS.map((kind) => [
          kind,
          {
            own: outcome(() =>
              requireWeeklyReportTransitionActor(scoped, 'me', 'me', kind),
            ),
            other: outcome(() =>
              requireWeeklyReportTransitionActor(scoped, 'other', 'me', kind),
            ),
          },
        ]),
      ),
    },
    ieps: {
      permissions: Object.fromEntries(
        SPECIAL_ED.map((key) => [
          key,
          outcome(() => requireIepPermission(scoped, key)),
        ]),
      ),
      assignedStudents: activeAssignedStudentIds(scoped, DAY) ?? 'ALL',
      assignedStudentsEmpty: activeAssignedStudentIds(empty, DAY) ?? 'ALL',
      studentIn: outcome(() => assertIepStudentScope(scoped, 'student-a', DAY)),
      studentOut: outcome(() =>
        assertIepStudentScope(scoped, 'student-z', DAY),
      ),
      commands: Object.fromEntries(
        COMMANDS.map((command) => [
          command,
          {
            can: canRoleRunIepWorkflowCommand(role, command),
            require: outcome(() => requireIepRole(scoped, command)),
          },
        ]),
      ),
    },
    observations: {
      permissions: Object.fromEntries(
        (
          ['special-ed:read', 'special-ed:write', 'observation:manage'] as const
        ).map((key) => [
          key,
          outcome(() => requireObservationPermission(scoped, key)),
        ]),
      ),
      readAssigned: canReadObservationStudent(scoped, 'student-a', DAY),
      readOther: canReadObservationStudent(scoped, 'student-z', DAY),
    },
    aggregates: {
      assignedStudents: aggregateActiveAssignedStudentIds(scoped, DAY) ?? 'ALL',
      studentScope: aggregateStudentScopeWhere(scoped, DAY) ?? 'NONE',
      studentScopeEmpty: aggregateStudentScopeWhere(empty, DAY) ?? 'NONE',
      journeyScope: aggregateJourneyScopeWhere(scoped) ?? 'NONE',
      journeyScopeEmpty: aggregateJourneyScopeWhere(empty) ?? 'NONE',
      specialEducationStudents:
        specialEducationStudentWhere(scoped, DAY) ?? 'NONE',
      specialEducationStudentsEmpty:
        specialEducationStudentWhere(empty, DAY) ?? 'NONE',
      observationAssignment:
        observationAssignmentWhere(scoped, ORGANIZATION, 'user-a') ?? 'NONE',
      reportsObservations: canReportObservationAggregates(scoped),
      datedObservationScope: aggregateDatedObservationScope(
        scoped,
        'user-a',
        'observationDate',
      ),
    },
  };
}

describe('what each built-in role is allowed today', () => {
  it('covers all seven roles', () => {
    expect(ROLES).toHaveLength(7);
  });

  for (const role of ROLES) {
    it(`gives ${role} the same decisions as before`, () => {
      expect(JSON.parse(JSON.stringify(decisionsFor(role)))).toMatchSnapshot();
    });
  }
});

describe('what the role name gives as permissions', () => {
  it('matches the table of ADR 0002', () => {
    expect(roleDerivedPermissions).toEqual({
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
      SPECIAL_ED_TEACHER: [
        'scope.assigned',
        'iep:submit',
        'weekly-report:teach',
      ],
      SPECIALIST: ['scope.assigned', 'iep:submit', 'weekly-report:teach'],
    });
  });

  it('never adds a key the role did not have before to the old permissions', () => {
    for (const role of ROLES) {
      const before = new Set(permissionsForRole(role));
      for (const key of LEGACY_PERMISSIONS) {
        expect(membershipHasPermission(membership(role), key)).toBe(
          before.has(key),
        );
      }
    }
  });

  it('gives a Central permission list its own keys and still the ones the role implies', () => {
    const fromCentral = membership('GRADE_TEACHER', {
      permissions: ['attendance:read', 'scope.organization'],
    });
    expect(membershipHasPermission(fromCentral, 'scope.organization')).toBe(
      true,
    );
    expect(membershipHasPermission(fromCentral, 'scope.grade')).toBe(true);
    expect(membershipHasPermission(fromCentral, 'attendance:write')).toBe(
      false,
    );
  });
});
