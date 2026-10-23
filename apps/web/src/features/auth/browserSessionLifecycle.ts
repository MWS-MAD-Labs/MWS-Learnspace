import type { CurrentSessionResponse } from '@learnspace/contracts';
import { keepFresh, watchSession } from 'mws-central-auth/client';
import { authService } from './api/authService';

export interface BrowserSessionLifecycle {
  start: (
    session: CurrentSessionResponse,
    onSessionEnded: () => void,
  ) => void | (() => void);
}

export const noOpBrowserSessionLifecycle: BrowserSessionLifecycle = {
  start: () => undefined,
};

export const sharedBrowserSessionLifecycle: BrowserSessionLifecycle = {
  start: (session, onSessionEnded) => {
    if (
      session.authMode !== 'shared' ||
      !session.hub?.refreshUrl ||
      !session.hub.homeUrl
    ) {
      return undefined;
    }

    const stopFresh = keepFresh({
      refreshUrl: session.hub.refreshUrl,
      initialExpiresIn: session.expiresIn,
      onEnded: onSessionEnded,
    });
    const stopWatch = watchSession({
      check: () => authService.checkSession(),
      onRevoked: onSessionEnded,
    });

    return () => {
      stopFresh();
      stopWatch();
    };
  },
};

export function fullCurrentRoute(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function goToHub(homeUrl: string): void {
  window.location.assign(homeUrl);
}
