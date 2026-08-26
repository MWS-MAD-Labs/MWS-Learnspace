import { describe, expect, it } from 'vitest';
import {
  scoreSensoryProfileResponses,
  SensoryProfileScoringError,
} from '../src/sensoryProfileScoring.js';

const definitionBody = {
  items: [
    {
      id: 'sp-1',
      number: 1,
      section: 'Auditory',
      text: 'Auditory item',
      quadrant: 'SN',
    },
    {
      id: 'sp-2',
      number: 2,
      section: 'Auditory',
      text: 'Second auditory item',
    },
    {
      id: 'sp-3',
      number: 3,
      section: 'Behavioral',
      text: 'Behavioral item',
    },
  ],
};

describe('Sensory Profile scoring', () => {
  it('accepts partial drafts and derives section maximums from the pinned definition', () => {
    expect(
      scoreSensoryProfileResponses({
        definitionBody,
        responses: { 'sp-1': 5, 'sp-3': 0 },
        requireComplete: false,
      }),
    ).toMatchObject({
      responses: { 'sp-1': 5, 'sp-3': 0 },
      sectionScores: {
        auditory: { raw: 5, max: 10 },
        visual: { raw: 0, max: 0 },
        touch: { raw: 0, max: 0 },
        movement: { raw: 0, max: 0 },
        behavioral: { raw: 0, max: 5 },
      },
      totalRawScore: 5,
    });
  });

  it.each([-1, 1.5, 6])(
    'rejects out-of-range or non-integer rating %s',
    (rating) => {
      expect(() =>
        scoreSensoryProfileResponses({
          definitionBody,
          responses: { 'sp-1': rating },
          requireComplete: false,
        }),
      ).toThrowError(
        expect.objectContaining({ code: 'SENSORY_PROFILE_RESPONSES_INVALID' }),
      );
    },
  );

  it('rejects unknown items and incomplete completion responses', () => {
    expect(() =>
      scoreSensoryProfileResponses({
        definitionBody,
        responses: { unknown: 3 },
        requireComplete: false,
      }),
    ).toThrowError(
      expect.objectContaining({ code: 'SENSORY_PROFILE_RESPONSES_INVALID' }),
    );

    try {
      scoreSensoryProfileResponses({
        definitionBody,
        responses: { 'sp-1': 3 },
        requireComplete: true,
      });
      throw new Error('Expected scoring to reject incomplete responses.');
    } catch (error) {
      expect(error).toBeInstanceOf(SensoryProfileScoringError);
      expect(error).toMatchObject({
        code: 'SENSORY_PROFILE_RESPONSES_INCOMPLETE',
        details: { missingItemIds: ['sp-2', 'sp-3'] },
      });
    }
  });

  it('rejects malformed or duplicate-item definitions', () => {
    expect(() =>
      scoreSensoryProfileResponses({
        definitionBody: {
          items: [definitionBody.items[0], definitionBody.items[0]],
        },
        responses: {},
        requireComplete: false,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'SENSORY_PROFILE_DEFINITION_UNSCORABLE',
      }),
    );
  });
});
