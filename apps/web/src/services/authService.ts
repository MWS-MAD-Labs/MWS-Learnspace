import {
  currentSessionResponseSchema,
  type CurrentSessionResponse,
} from '@learnspace/contracts';
import { apiClient, ApiClientError } from './apiClient';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export const authService = {
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
