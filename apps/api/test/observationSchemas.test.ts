import { describe, expect, it } from 'vitest';
import {
  fedcCompletePayloadSchema,
  fedcCreateDraftPayloadSchema,
  fedcSaveDraftPayloadSchema,
  sensoryProfilePayloadSchema,
  sfaPayloadSchema,
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

  it('rejects invalid sensory ratings', () => {
    expect(() =>
      sensoryProfilePayloadSchema.parse({
        status: 'IN_PROGRESS',
        responses: { item1: 6 },
        sectionScores: { auditory: { raw: 1, max: 5 } },
        totalRawScore: 1,
      }),
    ).toThrow();
  });

  it('validates bounded SFA scales', () => {
    expect(
      sfaPayloadSchema.parse({
        status: 'COMPLETED',
        respondents: [{ name: 'Demo', role: 'Teacher', initials: 'DT' }],
        participationScores: { classroom: 4 },
        taskSupports: { physicalAssistance: 2 },
        activityPerformance: { mobility: 3 },
        adaptations: ['Visual schedule'],
        participationAverage: 4,
      }).participationAverage,
    ).toBe(4);
  });
});
