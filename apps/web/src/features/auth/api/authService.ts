import {
  authBootstrapResponseSchema,
  currentSessionResponseSchema,
  type AuthBootstrapResponse,
  type CurrentSessionResponse,
} from '@learnspace/contracts';
import { apiClient, ApiClientError } from '../../../services/apiClient';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

function currentRoute(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function sharedRestoreUrl(
  returnTo: string,
  origin = apiBaseUrl || window.location.origin,
): URL {
  const url = new URL('/api/v1/auth/sso', origin);
  url.searchParams.set('returnTo', returnTo);
  return url;
}

export const authService = {
  getBootstrap(signal?: AbortSignal): Promise<AuthBootstrapResponse> {
    return apiClient.request('/api/v1/auth/bootstrap', {
      schema: authBootstrapResponseSchema,
      signal,
    });
  },

  async getSession(
    signal?: AbortSignal,
  ): Promise<CurrentSessionResponse | undefined> {
    try {
      return await apiClient.request('/api/v1/auth/session', {
        schema: currentSessionResponseSchema,
        signal,
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401)
        return undefined;
      throw error;
    }
  },

  login(returnTo = '/') {
    const url = new URL(
      `${apiBaseUrl}/api/v1/auth/login`,
      window.location.origin,
    );
    url.searchParams.set('returnTo', returnTo);
    window.location.assign(url);
  },

  restoreShared(returnTo = currentRoute()) {
    window.location.assign(sharedRestoreUrl(returnTo));
  },

  async checkSession(signal?: AbortSignal): Promise<boolean> {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/session`, {
      credentials: 'include',
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal,
    });
    if (response.status === 401 || response.status === 403) return false;
    if (response.status >= 500) return true;
    return response.ok;
  },

  async logout(signal?: AbortSignal): Promise<void> {
    try {
      await apiClient.request('/api/v1/auth/logout', {
        method: 'POST',
        signal,
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) return;
      throw error;
    }
  },
};
