import { apiErrorSchema } from '@learnspace/contracts';
import type { ZodType } from 'zod';

export type ApiErrorCategory =
  | 'auth'
  | 'authz'
  | 'validation'
  | 'conflict'
  | 'server'
  | 'network'
  | 'invalid-response';

export class ApiClientError extends Error {
  constructor(
    readonly category: ApiErrorCategory,
    readonly code: string,
    message: string,
    readonly status?: number,
    readonly requestId?: string,
    readonly details?: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ApiClientError';
  }
}

export type ApiRequestOptions<T> = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema?: ZodType<T>;
  signal?: AbortSignal;
  headers?: HeadersInit;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return value === undefined ? undefined : decodeURIComponent(value);
}

function requestId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `web-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function categoryForStatus(status: number): ApiErrorCategory {
  if (status === 401) return 'auth';
  if (status === 403) return 'authz';
  if (status === 400 || status === 422) return 'validation';
  if (status === 409) return 'conflict';
  return 'server';
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new ApiClientError(
      'invalid-response',
      'INVALID_JSON_RESPONSE',
      'The server returned invalid JSON.',
      response.status,
      response.headers.get('x-request-id') ?? undefined,
      undefined,
      { cause },
    );
  }
}

export async function apiRequest<T = undefined>(
  path: string,
  options: ApiRequestOptions<T> = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const headers = new Headers(options.headers);
  headers.set('accept', 'application/json');
  headers.set('x-request-id', requestId());

  if (options.body !== undefined)
    headers.set('content-type', 'application/json');
  if (method !== 'GET') {
    const csrfToken = readCookie('learnspace_csrf');
    if (csrfToken) headers.set('x-csrf-token', csrfToken);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      credentials: 'include',
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (cause) {
    const aborted =
      options.signal?.aborted ||
      (cause instanceof DOMException && cause.name === 'AbortError');
    throw new ApiClientError(
      'network',
      aborted ? 'REQUEST_ABORTED' : 'NETWORK_ERROR',
      aborted
        ? 'The request was cancelled.'
        : 'The server could not be reached.',
      undefined,
      undefined,
      undefined,
      { cause },
    );
  }

  if (!response.ok) {
    const payload = await parseJson(response);
    const parsed = apiErrorSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiClientError(
        'invalid-response',
        'INVALID_ERROR_RESPONSE',
        'The server returned an invalid error response.',
        response.status,
        response.headers.get('x-request-id') ?? undefined,
        payload,
      );
    }
    throw new ApiClientError(
      categoryForStatus(response.status),
      parsed.data.error.code,
      parsed.data.error.message,
      response.status,
      parsed.data.error.requestId,
      parsed.data.error.details,
    );
  }

  if (response.status === 204) return undefined as T;
  const payload = await parseJson(response);
  if (!options.schema) return payload as T;
  const parsed = options.schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiClientError(
      'invalid-response',
      'INVALID_RESPONSE',
      'The server response did not match the expected contract.',
      response.status,
      response.headers.get('x-request-id') ?? undefined,
      { issues: parsed.error.issues },
    );
  }
  return parsed.data;
}

export const apiClient = {
  request: apiRequest,
};

export function isRequestCancelled(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === 'REQUEST_ABORTED';
}
