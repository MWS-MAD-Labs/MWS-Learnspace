import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authService,
  sharedRestoreUrl,
} from '@/src/features/auth/api/authService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authService shared-session entry', () => {
  it('uses the same-origin API proxy for Hub restore entry', () => {
    expect(
      sharedRestoreUrl(
        '/journeys/calendar?semesterId=semester-1',
        'https://learnspace.example.test',
      ),
    ).toEqual(
      new URL(
        'https://learnspace.example.test/api/v1/auth/sso?returnTo=%2Fjourneys%2Fcalendar%3FsemesterId%3Dsemester-1',
      ),
    );
  });

  it('loads public bootstrap configuration without identity data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          authMode: 'shared',
          hub: { homeUrl: 'https://hub.example.test/' },
        }),
      ),
    );

    await expect(authService.getBootstrap()).resolves.toEqual({
      authMode: 'shared',
      hub: { homeUrl: 'https://hub.example.test/' },
    });
  });
});
