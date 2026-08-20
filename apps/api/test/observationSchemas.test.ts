import { describe, expect, it } from 'vitest';
import {
  fedcPayloadSchema,
  sensoryProfilePayloadSchema,
  sfaPayloadSchema,
} from '../src/observationSchemas.js';

describe('observation payload schemas', () => {
  it('validates FEDC score payloads', () => {
    expect(
      fedcPayloadSchema.parse({
        status: 'COMPLETED',
        responses: { item1: { itemId: 'item1', rating: 'T', score: 1 } },
        milestoneScores: { 1: 1 },
        totalScore: 1,
        maxPossibleScore: 10,
      }).totalScore,
    ).toBe(1);
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
