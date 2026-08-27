import { describe, expect, it } from 'vitest';
import {
  fedcCompletePayloadSchema,
  fedcCreateDraftPayloadSchema,
  fedcSaveDraftPayloadSchema,
  sensoryProfileCompletePayloadSchema,
  sensoryProfileCreateDraftPayloadSchema,
  sensoryProfileSaveDraftPayloadSchema,
  sfaCompletePayloadSchema,
  sfaCreateDraftPayloadSchema,
  sfaPayloadSchema,
  sfaSaveDraftPayloadSchema,
} from '../src/observationSchemas.js';

const studentId = '33333333-3333-4333-8333-333333333333';

describe('observation payload schemas', () => {
  it('accepts strict FEDC draft and completion inputs without trusted totals', () => {
    expect(
      fedcCreateDraftPayloadSchema.parse({
        observationDate: '2026-08-26',
      }).responses,
    ).toBeUndefined();
    expect(
      fedcSaveDraftPayloadSchema.parse({
        observationDate: '2026-08-26',
        responses: {
          item1: { itemId: 'item1', rating: 'T', masteredAge: '4 years' },
        },
        notes: null,
      }).responses.item1.rating,
    ).toBe('T');
    expect(
      fedcCompletePayloadSchema.safeParse({
        observationDate: '2026-08-26',
        responses: { item1: { itemId: 'item1', rating: 'S' } },
      }).success,
    ).toBe(true);
  });

  it.each([
    'status',
    'score',
    'milestoneScores',
    'totalScore',
    'maxPossibleScore',
    'observerId',
    'actorId',
    'organizationId',
    'studentId',
    'definitionId',
    'assignmentId',
  ])('rejects client-controlled FEDC field %s', (field) => {
    const base = {
      observationDate: '2026-08-26',
      responses: { item1: { itemId: 'item1', rating: 'T' } },
    };
    const command =
      field === 'score'
        ? {
            ...base,
            responses: {
              item1: { itemId: 'item1', rating: 'T', score: 1 },
            },
          }
        : { ...base, [field]: field.includes('Score') ? 1 : studentId };
    expect(fedcSaveDraftPayloadSchema.safeParse(command).success).toBe(false);
  });

  it('accepts strict Sensory Profile drafts and requires responses for save/complete', () => {
    expect(
      sensoryProfileCreateDraftPayloadSchema.safeParse({
        observationDate: '2026-08-26',
        teacherContactFrequency: 'Daily',
      }).success,
    ).toBe(true);
    expect(
      sensoryProfileSaveDraftPayloadSchema.safeParse({
        observationDate: '2026-08-26',
        responses: { 'sp-1': 0, 'sp-2': 5 },
      }).success,
    ).toBe(true);
    expect(
      sensoryProfileCompletePayloadSchema.safeParse({
        observationDate: '2026-08-26',
        responses: {},
      }).success,
    ).toBe(true);
    expect(
      sensoryProfileSaveDraftPayloadSchema.safeParse({
        observationDate: '2026-08-26',
      }).success,
    ).toBe(false);
  });

  it.each([
    'status',
    'sectionScores',
    'totalRawScore',
    'observerId',
    'actorId',
    'organizationId',
    'studentId',
    'definitionId',
    'assignmentId',
  ])('rejects client-controlled Sensory Profile field %s', (field) => {
    expect(
      sensoryProfileSaveDraftPayloadSchema.safeParse({
        observationDate: '2026-08-26',
        responses: { 'sp-1': 3 },
        [field]: field === 'sectionScores' ? {} : studentId,
      }).success,
    ).toBe(false);
  });

  it.each([-1, 1.5, 6])('rejects invalid sensory rating %s', (rating) => {
    expect(
      sensoryProfileSaveDraftPayloadSchema.safeParse({
        observationDate: '2026-08-26',
        responses: { 'sp-1': rating },
      }).success,
    ).toBe(false);
  });

  it('accepts strict SFA create drafts and partial save/completion maps', () => {
    expect(
      sfaCreateDraftPayloadSchema.safeParse({
        assessmentDate: '2026-08-26',
        programRecommendation: 'Continue the current program',
      }).success,
    ).toBe(true);
    expect(
      sfaSaveDraftPayloadSchema.safeParse({
        assessmentDate: '2026-08-26',
        programRecommendation: 'Continue the current program',
        respondents: [],
        participationScores: { classroom: 4 },
        taskSupports: {},
        activityPerformance: {},
        adaptations: [],
      }).success,
    ).toBe(true);
    expect(
      sfaCompletePayloadSchema.safeParse({
        assessmentDate: '2026-08-26',
        observationDate: '2026-08-25',
        programRecommendation: 'Continue the current program',
        respondents: [{ name: 'Demo', role: 'Teacher', initials: 'DT' }],
        participationScores: {},
        taskSupports: {},
        activityPerformance: {},
        adaptations: [],
      }).success,
    ).toBe(true);
    expect(
      sfaSaveDraftPayloadSchema.safeParse({
        assessmentDate: '2026-08-26',
        programRecommendation: 'Continue the current program',
        respondents: [],
      }).success,
    ).toBe(false);
    expect(sfaPayloadSchema).toBe(sfaSaveDraftPayloadSchema);
  });

  it.each([
    'id',
    'status',
    'settings',
    'participationAverage',
    'totalParticipationRawScore',
    'observerId',
    'actorId',
    'organizationId',
    'studentId',
    'definitionId',
    'assignmentId',
  ])('rejects client-controlled SFA field %s', (field) => {
    expect(
      sfaSaveDraftPayloadSchema.safeParse({
        assessmentDate: '2026-08-26',
        programRecommendation: 'Continue the current program',
        respondents: [],
        participationScores: {},
        taskSupports: {},
        activityPerformance: {},
        adaptations: [],
        [field]: field.includes('Score') ? 1 : studentId,
      }).success,
    ).toBe(false);
  });

  it.each([
    { participationScores: { classroom: 0 } },
    { participationScores: { classroom: 6.5 } },
    { taskSupports: { physical: 5 } },
    { activityPerformance: { mobility: 1.5 } },
  ])('rejects invalid SFA rating scales', (overrides) => {
    expect(
      sfaSaveDraftPayloadSchema.safeParse({
        assessmentDate: '2026-08-26',
        programRecommendation: 'Continue the current program',
        respondents: [],
        participationScores: {},
        taskSupports: {},
        activityPerformance: {},
        adaptations: [],
        ...overrides,
      }).success,
    ).toBe(false);
  });
});
