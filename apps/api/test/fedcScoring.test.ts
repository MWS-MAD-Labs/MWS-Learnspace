import { describe, expect, it } from 'vitest';
import { scoreFedcResponses } from '../src/fedcScoring.js';

const definition = {
  milestones: [
    {
      id: 1,
      title: 'Regulation',
      maxScore: 6,
      items: [
        {
          id: 'fedc-1-1',
          number: '1.1',
          text: 'First item',
          milestoneId: 1,
        },
        {
          id: 'fedc-1-2',
          number: '1.2',
          text: 'Second item',
          milestoneId: 1,
        },
      ],
    },
    {
      id: 2,
      title: 'Engagement',
      maxScore: 3,
      items: [
        {
          id: 'fedc-2-1',
          number: '2.1',
          text: 'Third item',
          milestoneId: 2,
        },
      ],
    },
  ],
};

describe('FEDC server scoring', () => {
  it('derives all trusted scores from the exact definition and ratings', () => {
    const scored = scoreFedcResponses({
      definitionBody: definition,
      responses: {
        'fedc-1-1': {
          itemId: 'fedc-1-1',
          rating: 'S',
          masteredAge: '4 years',
        },
        'fedc-1-2': { itemId: 'fedc-1-2', rating: 'K' },
        'fedc-2-1': { itemId: 'fedc-2-1', rating: 'H' },
      },
      requireComplete: true,
    });

    expect(scored.responses).toEqual({
      'fedc-1-1': {
        itemId: 'fedc-1-1',
        rating: 'S',
        masteredAge: '4 years',
        score: 3,
      },
      'fedc-1-2': { itemId: 'fedc-1-2', rating: 'K', score: 2 },
      'fedc-2-1': { itemId: 'fedc-2-1', rating: 'H', score: 0 },
    });
    expect(scored.milestoneScores).toEqual({ '1': 5, '2': 0 });
    expect(scored.totalScore).toBe(5);
    expect(scored.maxPossibleScore).toBe(9);
  });

  it('allows partial drafts but requires every definition item on completion', () => {
    expect(
      scoreFedcResponses({
        definitionBody: definition,
        responses: {
          'fedc-1-1': { itemId: 'fedc-1-1', rating: 'T' },
        },
        requireComplete: false,
      }).totalScore,
    ).toBe(1);

    expect(() =>
      scoreFedcResponses({
        definitionBody: definition,
        responses: {
          'fedc-1-1': { itemId: 'fedc-1-1', rating: 'T' },
        },
        requireComplete: true,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'FEDC_RESPONSES_INCOMPLETE',
      }),
    );
  });

  it.each([
    {
      responses: { unknown: { itemId: 'unknown', rating: 'T' } },
      message: 'unknown item',
    },
    {
      responses: {
        'fedc-1-1': { itemId: 'fedc-1-2', rating: 'T' },
      },
      message: 'item/key mismatch',
    },
    {
      responses: {
        'fedc-1-1': { itemId: 'fedc-1-1', rating: 'INVALID' },
      },
      message: 'unknown rating',
    },
  ])('rejects $message', ({ responses }) => {
    expect(() =>
      scoreFedcResponses({
        definitionBody: definition,
        responses,
        requireComplete: false,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'FEDC_RESPONSES_INVALID',
      }),
    );
  });

  it('clearly rejects legacy/minimal definitions only when scoring is attempted', () => {
    expect(() =>
      scoreFedcResponses({
        definitionBody: { items: [{ id: 'legacy-item' }] },
        responses: {},
        requireComplete: false,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'FEDC_DEFINITION_UNSCORABLE',
      }),
    );
  });

  it('rejects inconsistent milestone maxima and item ownership', () => {
    expect(() =>
      scoreFedcResponses({
        definitionBody: {
          milestones: [
            {
              id: 1,
              title: 'Invalid',
              maxScore: 4,
              items: [
                {
                  id: 'item-1',
                  number: '1',
                  text: 'Invalid owner',
                  milestoneId: 2,
                },
              ],
            },
          ],
        },
        responses: {},
        requireComplete: false,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'FEDC_DEFINITION_UNSCORABLE',
      }),
    );
  });
});
