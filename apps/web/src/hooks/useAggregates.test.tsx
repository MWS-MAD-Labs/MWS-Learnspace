import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGlobalSearch } from './useAggregates';

const organizationId = '11111111-1111-4111-8111-111111111111';

function searchResponse(title: string) {
  return {
    data: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        kind: 'STUDENT',
        title,
        subtitle: 'Student · S-001',
        studentId: '22222222-2222-4222-8222-222222222222',
        updatedAt: '2026-08-27T12:00:00.000Z',
      },
    ],
    meta: { count: 1, limit: 10, offset: 0, hasMore: false },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useGlobalSearch', () => {
  it('clears previous results immediately when a new valid query starts', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse('Previous Student')), {
          status: 200,
        }),
      )
      .mockImplementation(() => new Promise(() => undefined));
    vi.stubGlobal('fetch', fetchMock);

    const { result, rerender } = renderHook(
      ({ query }) => useGlobalSearch(organizationId, query),
      { initialProps: { query: 'previous' } },
    );
    await waitFor(() => expect(result.current.data).toHaveLength(1), {
      timeout: 1500,
    });

    rerender({ query: 'next query' });

    expect(result.current.status).toBe('loading');
    expect(result.current.data).toEqual([]);
  });
});
