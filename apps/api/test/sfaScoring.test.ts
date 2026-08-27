import { describe, expect, it } from 'vitest';
import { scoreSfaResponses, SfaScoringError } from '../src/sfaScoring.js';

const definitionBody = {
  participationItems: [
    { id: 'participation-classroom', label: 'Classroom participation' },
    { id: 'participation-lunch', label: 'Lunch participation' },
  ],
  taskSupportItems: [{ id: 'task-physical', label: 'Physical assistance' }],
  activityPerformanceItems: [{ id: 'activity-mobility', label: 'Mobility' }],
  adaptationOptions: [{ id: 'adaptation-visual', label: 'Visual schedule' }],
};

const completeInput = {
  definitionBody,
  participationScores: {
    'participation-classroom': 4,
    'participation-lunch': 5,
  },
  taskSupports: { 'task-physical': 2 },
  activityPerformance: { 'activity-mobility': 3 },
  adaptations: ['adaptation-visual'],
  respondents: [{ name: 'Demo', role: 'Teacher', initials: 'DT' }],
  programRecommendation: 'Continue the current program',
  assessmentDate: '2026-08-26',
  requireComplete: true,
} as const;

describe('SFA server scoring', () => {
  it('derives only the participation raw total and two-decimal average', () => {
    expect(scoreSfaResponses(completeInput)).toMatchObject({
      participationScores: completeInput.participationScores,
      taskSupports: completeInput.taskSupports,
      activityPerformance: completeInput.activityPerformance,
      adaptations: completeInput.adaptations,
      totalParticipationRawScore: 9,
      participationAverage: 4.5,
    });

    expect(() =>
      scoreSfaResponses({
        ...completeInput,
        participationScores: {
          'participation-classroom': 1,
          'participation-lunch': 2,
          extra: 3,
        },
        requireComplete: false,
      }),
    ).toThrowError(expect.objectContaining({ code: 'SFA_RESPONSES_INVALID' }));
  });

  it('allows empty partial drafts and scores their average as zero', () => {
    expect(
      scoreSfaResponses({
        definitionBody,
        participationScores: {},
        taskSupports: {},
        activityPerformance: {},
        adaptations: [],
        respondents: [],
        requireComplete: false,
      }),
    ).toMatchObject({
      totalParticipationRawScore: 0,
      participationAverage: 0,
    });
  });

  it.each([
    { participationScores: { 'participation-classroom': 1.5 } },
    { taskSupports: { 'task-physical': 5 } },
    { activityPerformance: { 'activity-mobility': 0 } },
  ])('rejects invalid integer rating scales', (overrides) => {
    expect(() =>
      scoreSfaResponses({
        ...completeInput,
        ...overrides,
        requireComplete: false,
      }),
    ).toThrowError(expect.objectContaining({ code: 'SFA_RESPONSES_INVALID' }));
  });

  it('rejects unknown score and adaptation IDs', () => {
    expect(() =>
      scoreSfaResponses({
        ...completeInput,
        taskSupports: { unknown: 2 },
        adaptations: ['unknown'],
        requireComplete: false,
      }),
    ).toThrowError(expect.objectContaining({ code: 'SFA_RESPONSES_INVALID' }));
  });

  it('requires every definition item and completion field when completing', () => {
    try {
      scoreSfaResponses({
        definitionBody,
        participationScores: { 'participation-classroom': 4 },
        taskSupports: {},
        activityPerformance: {},
        adaptations: [],
        respondents: [],
        programRecommendation: ' ',
        assessmentDate: undefined,
        requireComplete: true,
      });
      throw new Error('Expected scoring to reject incomplete SFA responses.');
    } catch (error) {
      expect(error).toBeInstanceOf(SfaScoringError);
      expect(error).toMatchObject({
        code: 'SFA_RESPONSES_INCOMPLETE',
        details: {
          missingParticipationItemIds: ['participation-lunch'],
          missingTaskSupportItemIds: ['task-physical'],
          missingActivityPerformanceItemIds: ['activity-mobility'],
          missingRespondent: true,
          missingProgramRecommendation: true,
          missingAssessmentDate: true,
        },
      });
    }
  });

  it('rejects malformed, empty-scoring, and duplicate-ID definitions', () => {
    for (const invalidDefinition of [
      { ...definitionBody, participationItems: [] },
      { ...definitionBody, taskSupportItems: [] },
      { ...definitionBody, activityPerformanceItems: [] },
      {
        ...definitionBody,
        taskSupportItems: [
          { id: 'participation-classroom', label: 'Duplicate' },
        ],
      },
    ]) {
      expect(() =>
        scoreSfaResponses({
          definitionBody: invalidDefinition,
          participationScores: {},
          requireComplete: false,
        }),
      ).toThrowError(
        expect.objectContaining({ code: 'SFA_DEFINITION_UNSCORABLE' }),
      );
    }
  });
});
