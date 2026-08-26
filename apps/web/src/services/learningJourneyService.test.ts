import { describe, expect, it } from 'vitest';
import type { LearningJourney } from '../types';
import { journeyCommand, monthBoundary } from './learningJourneyService';

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
