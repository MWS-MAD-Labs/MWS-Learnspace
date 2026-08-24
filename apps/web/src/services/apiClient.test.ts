import { z } from 'zod';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = 'learnspace_csrf=; Max-Age=0; path=/';
});

describe('apiClient', () => {
  it('includes credentials, request ID, CSRF, JSON, and parses the runtime schema', async () => {
    document.cookie = 'learnspace_csrf=csrf%20token; path=/';
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        expect(init?.credentials).toBe('include');
        expect(init?.method).toBe('PUT');
        expect(headers.get('x-request-id')).toBeTruthy();
        expect(headers.get('x-csrf-token')).toBe('csrf token');
        expect(headers.get('content-type')).toBe('application/json');
        expect(init?.body).toBe(JSON.stringify({ value: 1 }));
        return new Response(JSON.stringify({ data: { ok: true } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiClient.request('/example', {
      method: 'PUT',
      body: { value: 1 },
      schema: z.object({ data: z.object({ ok: z.literal(true) }) }),
    });

    expect(result.data.ok).toBe(true);
  });

  it.each([
    [401, 'auth'],
    [403, 'authz'],
    [400, 'validation'],
    [409, 'conflict'],
    [500, 'server'],
  ] as const)(
    'categorizes HTTP %s and preserves API error fields',
    async (status, category) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(
              JSON.stringify({
                error: {
                  code: 'EXAMPLE_CODE',
                  message: 'Example message.',
                  requestId: 'request-123',
                  details: { field: 'value' },
                },
              }),
              { status, headers: { 'content-type': 'application/json' } },
            ),
        ),
      );

      await expect(apiClient.request('/example')).rejects.toMatchObject({
        category,
        code: 'EXAMPLE_CODE',
        message: 'Example message.',
        requestId: 'request-123',
        details: { field: 'value' },
        status,
      });
    },
  );

  it('reports a successful response that violates its schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ wrong: true }), { status: 200 }),
      ),
    );

    await expect(
      apiClient.request('/example', {
        schema: z.object({ value: z.string() }),
      }),
    ).rejects.toMatchObject({
      category: 'invalid-response',
      code: 'INVALID_RESPONSE',
    });
  });

  it('categorizes fetch failures and cancellation as network errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('offline');
      }),
    );
    await expect(apiClient.request('/example')).rejects.toMatchObject({
      category: 'network',
      code: 'NETWORK_ERROR',
    });

    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('aborted', 'AbortError');
      }),
    );
    await expect(
      apiClient.request('/example', { signal: controller.signal }),
    ).rejects.toMatchObject({
      category: 'network',
      code: 'REQUEST_ABORTED',
    });
  });
});
