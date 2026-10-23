import { afterEach, describe, expect, it, vi } from 'vitest';
import { sharedBrowserSessionLifecycle } from '@/src/features/auth/browserSessionLifecycle';
import { authService } from '@/src/features/auth/api/authService';

const keepFresh = vi.hoisted(() => vi.fn());
const watchSession = vi.hoisted(() => vi.fn());

vi.mock('mws-central-auth/client', () => ({ keepFresh, watchSession }));

const session = {
  authMode: 'shared' as const,
  hub: {
    homeUrl: 'https://hub.example.test/',
    refreshUrl: 'https://hub.example.test/auth/refresh',
  },
  expiresIn: 180,
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'principal@example.test',
    name: 'Demo Principal',
    avatarUrl: null,
    status: 'ACTIVE' as const,
  },
  memberships: [],
  expiresAt: '2026-08-21T00:00:00.000Z',
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  keepFresh.mockReset();
  watchSession.mockReset();
});

describe('shared browser session lifecycle', () => {
  it('starts refresh and revocation watchers and cleans both up', () => {
    const stopFresh = vi.fn();
    const stopWatch = vi.fn();
    const onEnded = vi.fn();
    keepFresh.mockReturnValue(stopFresh);
    watchSession.mockReturnValue(stopWatch);

    const stop = sharedBrowserSessionLifecycle.start(session, onEnded);

    expect(keepFresh).toHaveBeenCalledWith({
      refreshUrl: session.hub.refreshUrl,
      initialExpiresIn: 180,
      onEnded,
    });
    expect(watchSession).toHaveBeenCalledWith({
      check: expect.any(Function),
      onRevoked: onEnded,
    });
    expect(typeof stop).toBe('function');
    if (typeof stop === 'function') stop();
    expect(stopFresh).toHaveBeenCalledOnce();
    expect(stopWatch).toHaveBeenCalledOnce();
  });

  it('passes refresh 401 termination through to AuthProvider', () => {
    const onEnded = vi.fn();
    keepFresh.mockImplementation((options) => {
      options.onEnded();
      return vi.fn();
    });
    watchSession.mockReturnValue(vi.fn());

    sharedBrowserSessionLifecycle.start(session, onEnded);
    expect(onEnded).toHaveBeenCalledOnce();
  });

  it('does nothing for off and shadow sessions', () => {
    expect(
      sharedBrowserSessionLifecycle.start(
        { ...session, authMode: 'off' },
        vi.fn(),
      ),
    ).toBeUndefined();
    expect(
      sharedBrowserSessionLifecycle.start(
        { ...session, authMode: 'shadow' },
        vi.fn(),
      ),
    ).toBeUndefined();
    expect(keepFresh).not.toHaveBeenCalled();
    expect(watchSession).not.toHaveBeenCalled();
  });

  it.each([
    [403, false],
    [503, true],
  ])('treats session status %s as valid=%s', async (status, valid) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status })),
    );
    await expect(authService.checkSession()).resolves.toBe(valid);
  });
});
