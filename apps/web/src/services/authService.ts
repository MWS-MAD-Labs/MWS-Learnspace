import type { CurrentSessionResponse } from '@learnspace/contracts';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

function readCookie(name: string): string | undefined {
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export const authService = {
  async getSession(): Promise<CurrentSessionResponse | undefined> {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/session`, {
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
    if (response.status === 401) return undefined;
    if (!response.ok) throw new Error('Unable to load the current session.');
    return (await response.json()) as CurrentSessionResponse;
  },

  login(returnTo = '/') {
    const url = new URL(
      `${apiBaseUrl}/api/v1/auth/login`,
      window.location.origin,
    );
    url.searchParams.set('returnTo', returnTo);
    window.location.assign(url);
  },

  async logout(): Promise<void> {
    const csrfToken = readCookie('learnspace_csrf');
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken
        ? { 'x-csrf-token': decodeURIComponent(csrfToken) }
        : {},
    });
    if (!response.ok && response.status !== 401) {
      throw new Error('Unable to sign out.');
    }
  },
};
