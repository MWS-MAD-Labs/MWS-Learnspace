import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthProvider,
  noOpBrowserSessionLifecycle,
  type BrowserSessionLifecycle,
  useAuth,
} from '@/src/features/auth/context/AuthContext';
import { authService } from '@/src/features/auth/api/authService';
import { ApiClientError, apiClient } from '@/src/services/apiClient';

vi.mock('@/src/features/auth/api/authService', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/src/features/auth/api/authService')
    >();
  return {
    authService: {
      ...actual.authService,
      getBootstrap: vi.fn(),
      getSession: vi.fn(),
      login: vi.fn(),
      restoreShared: vi.fn(),
    },
  };
});

const session = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'principal@example.test',
    name: 'Demo Principal',
    avatarUrl: null,
    status: 'ACTIVE' as const,
  },
  memberships: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      organizationId: '33333333-3333-4333-8333-333333333333',
      organizationName: 'Learnspace Demonstration School',
      role: 'PRINCIPAL' as const,
      roleTitle: 'Principal',
      unitIds: [],
      gradeIds: [],
      subjectIds: [],
      assignedStudentIds: [],
      permissions: [],
    },
  ],
  expiresAt: '2026-08-21T00:00:00.000Z',
};

function StatusHarness() {
  const auth = useAuth();
  return (
    <>
      <span>{auth.status}</span>
      <button type="button" onClick={auth.login}>
        Login
      </button>
    </>
  );
}

describe('AuthProvider browser session lifecycle', () => {
  beforeEach(() => {
    vi.mocked(authService.getBootstrap).mockReset();
    vi.mocked(authService.getBootstrap).mockResolvedValue({ authMode: 'off' });
    vi.mocked(authService.getSession).mockReset();
    vi.mocked(authService.login).mockReset();
    vi.mocked(authService.restoreShared).mockReset();
    window.history.replaceState({}, '', '/');
  });

  it('supports the no-op lifecycle used by local and shadow modes', async () => {
    const start = vi.spyOn(noOpBrowserSessionLifecycle, 'start');
    vi.mocked(authService.getSession).mockResolvedValue(session);

    render(
      <AuthProvider browserSessionLifecycle={noOpBrowserSessionLifecycle}>
        <StatusHarness />
      </AuthProvider>,
    );

    expect(await screen.findByText('authenticated')).toBeVisible();
    await waitFor(() => expect(start).toHaveBeenCalledOnce());
    start.mockRestore();
  });

  it('starts an injected lifecycle when authenticated and stops it on cleanup', async () => {
    const stop = vi.fn();
    const lifecycle: BrowserSessionLifecycle = {
      start: vi.fn((_session, _callback) => stop),
    };
    vi.mocked(authService.getSession).mockResolvedValue(session);

    const view = render(
      <AuthProvider browserSessionLifecycle={lifecycle}>
        <StatusHarness />
      </AuthProvider>,
    );

    await waitFor(() => expect(lifecycle.start).toHaveBeenCalledOnce());
    view.unmount();

    expect(stop).toHaveBeenCalledOnce();
  });

  it('rechecks the current session when the lifecycle reports it ended', async () => {
    let onSessionEnded: (() => void) | undefined;
    const lifecycle: BrowserSessionLifecycle = {
      start: vi.fn((_session, callback) => {
        onSessionEnded = callback;
      }),
    };
    vi.mocked(authService.getSession)
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce(undefined);

    render(
      <AuthProvider browserSessionLifecycle={lifecycle}>
        <StatusHarness />
      </AuthProvider>,
    );

    await waitFor(() => expect(lifecycle.start).toHaveBeenCalledOnce());
    await act(async () => onSessionEnded?.());

    expect(authService.getSession).toHaveBeenCalledOnce();
    expect(await screen.findByText('anonymous')).toBeVisible();
  });

  it.each([
    ['anonymous', undefined],
    ['denied', { ...session, memberships: [] }],
  ])('does not start the lifecycle for %s sessions', async (status, result) => {
    const lifecycle: BrowserSessionLifecycle = { start: vi.fn() };
    vi.mocked(authService.getSession).mockResolvedValue(result);

    render(
      <AuthProvider browserSessionLifecycle={lifecycle}>
        <StatusHarness />
      </AuthProvider>,
    );

    expect(await screen.findByText(status)).toBeVisible();
    expect(lifecycle.start).not.toHaveBeenCalled();
  });

  it('preserves the full route when restoring an ended shared session', async () => {
    const sharedSession = {
      ...session,
      authMode: 'shared' as const,
      hub: {
        homeUrl: 'https://hub.example.test/',
        refreshUrl: 'https://hub.example.test/auth/refresh',
      },
      expiresIn: 180,
    };
    const lifecycle: BrowserSessionLifecycle = {
      start: vi.fn(),
    };
    vi.mocked(authService.getSession).mockResolvedValue(sharedSession);
    vi.mocked(authService.getBootstrap).mockResolvedValue({
      authMode: 'shared',
      hub: { homeUrl: 'https://hub.example.test/' },
    });
    window.history.replaceState({}, '', '/reports?scope=mine#latest');

    render(
      <AuthProvider browserSessionLifecycle={lifecycle}>
        <StatusHarness />
      </AuthProvider>,
    );
    await screen.findByText('authenticated');
    screen.getByRole('button', { name: 'Login' }).click();

    expect(authService.restoreShared).toHaveBeenCalledWith(
      '/reports?scope=mine#latest',
    );
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('automatically starts one shared restore on an initial 401', async () => {
    vi.mocked(authService.getBootstrap).mockResolvedValue({
      authMode: 'shared',
      hub: { homeUrl: 'https://hub.example.test/' },
    });
    vi.mocked(authService.getSession).mockResolvedValue(undefined);
    window.history.replaceState({}, '', '/reports?scope=mine#latest');

    render(
      <AuthProvider browserSessionLifecycle={noOpBrowserSessionLifecycle}>
        <StatusHarness />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(authService.restoreShared).toHaveBeenCalledWith(
        '/reports?scope=mine#latest',
      ),
    );
    expect(authService.restoreShared).toHaveBeenCalledOnce();
    expect(screen.getByText('loading')).toBeVisible();
  });

  it('maps an initial 403 to denied without attempting restore', async () => {
    vi.mocked(authService.getBootstrap).mockResolvedValue({
      authMode: 'shared',
      hub: { homeUrl: 'https://hub.example.test/' },
    });
    vi.mocked(authService.getSession).mockRejectedValue(
      new ApiClientError('authz', 'FORBIDDEN', 'Denied', 403),
    );

    render(
      <AuthProvider browserSessionLifecycle={noOpBrowserSessionLifecycle}>
        <StatusHarness />
      </AuthProvider>,
    );

    expect(await screen.findByText('denied')).toBeVisible();
    expect(authService.restoreShared).not.toHaveBeenCalled();
  });

  it('loads shared bootstrap wording for a denied callback without checking a session', async () => {
    window.history.replaceState({}, '', '/?auth=denied');
    vi.mocked(authService.getBootstrap).mockResolvedValue({
      authMode: 'shared',
      hub: { homeUrl: 'https://hub.example.test/' },
    });

    render(
      <AuthProvider browserSessionLifecycle={noOpBrowserSessionLifecycle}>
        <StatusHarness />
      </AuthProvider>,
    );

    expect(screen.getByText('denied')).toBeVisible();
    await waitFor(() =>
      expect(authService.getBootstrap).toHaveBeenCalledOnce(),
    );
    expect(authService.getSession).not.toHaveBeenCalled();
  });

  it.each([
    new ApiClientError('server', 'UNAVAILABLE', 'Unavailable', 503),
    new ApiClientError('network', 'NETWORK_ERROR', 'Offline'),
  ])('maps retryable startup failures to error', async (failure) => {
    vi.mocked(authService.getSession).mockRejectedValue(failure);

    render(
      <AuthProvider browserSessionLifecycle={noOpBrowserSessionLifecycle}>
        <StatusHarness />
      </AuthProvider>,
    );

    expect(await screen.findByText('error')).toBeVisible();
  });

  it('clears shared protected state after a global API 401', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({
      ...session,
      authMode: 'shared',
      hub: {
        homeUrl: 'https://hub.example.test/',
        refreshUrl: 'https://hub.example.test/auth/refresh',
      },
      expiresIn: 180,
    });
    vi.mocked(authService.getBootstrap).mockResolvedValue({
      authMode: 'shared',
      hub: { homeUrl: 'https://hub.example.test/' },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: 'UNAUTHENTICATED',
                message: 'Session ended.',
                requestId: 'request-401',
              },
            }),
            { status: 401 },
          ),
      ),
    );
    render(
      <AuthProvider browserSessionLifecycle={noOpBrowserSessionLifecycle}>
        <StatusHarness />
      </AuthProvider>,
    );
    await screen.findByText('authenticated');

    await act(async () => {
      await apiClient.request('/protected').catch(() => undefined);
    });

    expect(screen.getByText('anonymous')).toBeVisible();
  });

  it('does not clear local state after an API 401', async () => {
    vi.mocked(authService.getSession).mockResolvedValue(session);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: 'UNAUTHENTICATED',
                message: 'Request rejected.',
                requestId: 'request-401',
              },
            }),
            { status: 401 },
          ),
      ),
    );
    render(
      <AuthProvider browserSessionLifecycle={noOpBrowserSessionLifecycle}>
        <StatusHarness />
      </AuthProvider>,
    );
    await screen.findByText('authenticated');

    await act(async () => {
      await apiClient.request('/protected').catch(() => undefined);
    });

    expect(screen.getByText('authenticated')).toBeVisible();
  });
});
