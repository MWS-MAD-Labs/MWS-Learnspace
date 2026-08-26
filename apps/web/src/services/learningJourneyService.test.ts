import { describe, expect, it } from 'vitest';
import type { LearningJourneyDetailResponse } from '@learnspace/contracts';
import type { LearningJourney } from '../types';
import {
  journeyCommand,
  mapJourneyToLegacy,
  monthBoundary,
} from './learningJourneyService';

const id = {
  academicYear: '11111111-1111-4111-8111-111111111111',
  semester: '22222222-2222-4222-8222-222222222222',
  unit: '33333333-3333-4333-8333-333333333333',
  grade: '44444444-4444-4444-8444-444444444444',
  subject: '55555555-5555-4555-8555-555555555555',
  membership: '66666666-6666-4666-8666-666666666666',
};

function journey(): LearningJourney {
  return {
    id: '',
    title: 'Portable dates',
    academicYearId: id.academicYear,
    semesterId: id.semester,
    unitId: id.unit,
    gradeId: id.grade,
    subjectId: id.subject,
    ownerMembershipIds: [id.membership],
    academicYear: '2026-2027',
    semester: 'Semester 1',
    unit: 'Elementary',
    grade: 'Grade 1',
    subject: 'General Studies',
    ownerIds: [],
    authorName: 'Teacher',
    draftStatus: 'On Progress',
    principalReviewStatus: 'Not Started',
    directorApprovalStatus: 'Not Started',
    workflowHistory: [],
    projects: [
      {
        id: 'new-project',
        title: 'New Project',
        description: 'Project description',
        startMonth: 'September 2026',
        endMonth: 'October 2026',
        order: 1,
        learningGoals: [{ id: 'goal', description: 'Learning goal', order: 1 }],
        crossCurricularConnections: [],
      },
    ],
    createdBy: 'teacher',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedBy: 'teacher',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

function detail(
  workflowEvent?: LearningJourneyDetailResponse['data']['workflowEvents'][number],
): LearningJourneyDetailResponse['data'] {
  return {
    id: '77777777-7777-4777-8777-777777777777',
    organizationId: '88888888-8888-4888-8888-888888888888',
    title: 'Returned journey',
    academicYear: {
      id: id.academicYear,
      organizationId: '88888888-8888-4888-8888-888888888888',
      name: '2026-2027',
      startsOn: '2026-07-01',
      endsOn: '2027-06-30',
    },
    semester: {
      id: id.semester,
      organizationId: '88888888-8888-4888-8888-888888888888',
      academicYearId: id.academicYear,
      name: 'Semester 1',
      position: 1,
      startsOn: '2026-07-01',
      endsOn: '2026-12-31',
    },
    unit: {
      id: id.unit,
      organizationId: '88888888-8888-4888-8888-888888888888',
      code: 'EL',
      name: 'Elementary',
    },
    grade: {
      id: id.grade,
      organizationId: '88888888-8888-4888-8888-888888888888',
      unitId: id.unit,
      code: 'G1',
      name: 'Grade 1',
      position: 1,
    },
    subject: {
      id: id.subject,
      organizationId: '88888888-8888-4888-8888-888888888888',
      code: 'SCI',
      name: 'Science',
    },
    state: 'DRAFT',
    version: 3,
    owners: [
      {
        membershipId: id.membership,
        userId: '99999999-9999-4999-8999-999999999999',
        displayName: 'Teacher',
        role: 'GRADE_TEACHER',
        roleTitle: null,
      },
    ],
    workflowEvents: workflowEvent ? [workflowEvent] : [],
    projects: [],
    createdBy: {
      id: '99999999-9999-4999-8999-999999999999',
      displayName: 'Teacher',
    },
    updatedBy: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      displayName: 'Reviewer',
    },
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
  };
}

describe('learning journey date serialization', () => {
  it('parses month labels explicitly at UTC boundaries', () => {
    expect(monthBoundary('February 2027', false)).toBe('2027-02-01');
    expect(monthBoundary('February 2027', true)).toBe('2027-02-28');
    expect(() => monthBoundary('not-a-month', false)).toThrow(
      'Invalid month label',
    );
  });

  it('derives missing project dates from the selected month labels', () => {
    const command = journeyCommand(journey());
    expect(command.projects[0]).toMatchObject({
      startsOn: '2026-09-01',
      endsOn: '2026-10-31',
    });
  });
});

describe('learning journey workflow mapping', () => {
  it('maps a principal return into revision status and visible feedback', () => {
    const mapped = mapJourneyToLegacy(
      detail({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        fromState: 'PRINCIPAL_REVIEW',
        toState: 'DRAFT',
        action: 'RETURNED',
        comment: 'Add differentiated outcomes.',
        occurredAt: '2026-08-02T10:00:00.000Z',
        actor: {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          displayName: 'Principal Reviewer',
          role: 'PRINCIPAL',
          roleTitle: null,
        },
      }),
    );

    expect(mapped.principalReviewStatus).toBe('Returned');
    expect(mapped.directorApprovalStatus).toBe('Not Started');
    expect(mapped.workflowHistory[0]).toMatchObject({
      stage: 'Principal Review',
      action: 'Returned',
      userName: 'Principal Reviewer',
      userRole: 'Principal',
      comment: 'Add differentiated outcomes.',
    });
  });

  it('maps a director return while preserving completed principal review', () => {
    const mapped = mapJourneyToLegacy(
      detail({
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        fromState: 'DIRECTOR_APPROVAL',
        toState: 'DRAFT',
        action: 'RETURNED',
        comment: 'Clarify assessment evidence.',
        occurredAt: '2026-08-03T10:00:00.000Z',
        actor: {
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          displayName: 'Director Reviewer',
          role: 'DIRECTOR',
          roleTitle: 'Director of Academics',
        },
      }),
    );

    expect(mapped.principalReviewStatus).toBe('Done');
    expect(mapped.directorApprovalStatus).toBe('Returned');
    expect(mapped.workflowHistory[0]).toMatchObject({
      stage: 'Director Approval',
      action: 'Returned',
      userRole: 'Director of Academics',
      comment: 'Clarify assessment evidence.',
    });
  });
});
