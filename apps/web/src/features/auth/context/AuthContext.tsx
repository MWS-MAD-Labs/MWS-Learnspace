import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  AuthBootstrapResponse,
  CurrentSessionResponse,
} from '@learnspace/contracts';
import type { User, UserRole } from '../../../types';
import { ApiClientError, onApiUnauthorized } from '../../../services/apiClient';
import { authService } from '../api/authService';
import { flagsFromPermissions } from '../permissionFlags';
import {
  fullCurrentRoute,
  goToHub,
  sharedBrowserSessionLifecycle,
  type BrowserSessionLifecycle,
} from '../browserSessionLifecycle';

export type AuthStatus =
  'loading' | 'authenticated' | 'anonymous' | 'denied' | 'disabled' | 'error';

type AuthContextValue = {
  status: AuthStatus;
  session?: CurrentSessionResponse;
  currentUser?: User;
  isSharedSession: boolean;
  login: () => void;
  logout: () => Promise<void>;
  backToHub: () => void;
  retry: () => Promise<void>;
};

type SharedHubConfig = {
  homeUrl: string;
  refreshUrl?: string;
};

export {
  noOpBrowserSessionLifecycle,
  sharedBrowserSessionLifecycle,
  type BrowserSessionLifecycle,
} from '../browserSessionLifecycle';

type AuthProviderProps = {
  children: React.ReactNode;
  browserSessionLifecycle?: BrowserSessionLifecycle;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapSessionToUser(session: CurrentSessionResponse): User | undefined {
  // Milestone 3 presents the first active membership; organization switching is a later product capability.
  const membership = session.memberships[0];
  if (!membership) return undefined;
  return {
    id: session.user.id,
    membershipId: membership.id,
    name: session.user.name,
    email: session.user.email,
    role: membership.role as UserRole,
    roleTitle: membership.roleTitle ?? membership.role.replaceAll('_', ' '),
    avatarUrl: session.user.avatarUrl ?? undefined,
    unitIds: membership.unitIds,
    gradeIds: membership.gradeIds,
    subjectIds: membership.subjectIds,
    assignedStudentIds: membership.assignedStudentIds,
    assignedSpecialNeedsStudentIds: membership.assignedStudentIds,
    ...flagsFromPermissions(membership.permissions),
    permissions: membership.permissions,
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  browserSessionLifecycle = sharedBrowserSessionLifecycle,
}) => {
  const queryState = new URLSearchParams(window.location.search).get('auth');
  const [status, setStatus] = useState<AuthStatus>(
    queryState === 'denied'
      ? 'denied'
      : queryState === 'disabled'
        ? 'disabled'
        : 'loading',
  );
  const [session, setSession] = useState<CurrentSessionResponse>();
  const [sharedHub, setSharedHub] = useState<SharedHubConfig>();
  const [authMode, setAuthMode] = useState<AuthBootstrapResponse['authMode']>();
  const restoreAttempted = useRef(false);

  const retry = useCallback(async () => {
    setStatus('loading');
    try {
      const bootstrap = await authService.getBootstrap();
      setAuthMode(bootstrap.authMode);
      setSharedHub(bootstrap.authMode === 'shared' ? bootstrap.hub : undefined);
      const loadedSession = await authService.getSession();
      setSession(loadedSession);
      if (loadedSession?.authMode === 'shared' && loadedSession.hub) {
        setSharedHub(loadedSession.hub);
      }
      if (!loadedSession) {
        if (bootstrap.authMode === 'shared' && !restoreAttempted.current) {
          restoreAttempted.current = true;
          authService.restoreShared(fullCurrentRoute());
          return;
        }
        setStatus('anonymous');
      } else if (loadedSession.memberships.length === 0) {
        setStatus('denied');
      } else {
        setStatus('authenticated');
      }
    } catch (error) {
      setStatus(
        error instanceof ApiClientError && error.status === 403
          ? 'denied'
          : 'error',
      );
    }
  }, []);

  useEffect(() => {
    if (queryState !== 'denied' && queryState !== 'disabled') {
      void retry();
      return;
    }
    if (queryState === 'denied') {
      void authService
        .getBootstrap()
        .then((bootstrap) => {
          setAuthMode(bootstrap.authMode);
          setSharedHub(
            bootstrap.authMode === 'shared' ? bootstrap.hub : undefined,
          );
        })
        .catch(() => undefined);
    }
  }, [queryState, retry]);

  useEffect(() => {
    if (status !== 'authenticated' || !session) return;

    let active = true;
    let stop: void | (() => void);
    try {
      stop = browserSessionLifecycle.start(session, () => {
        if (!active) return;
        setSession(undefined);
        setStatus('anonymous');
        if (session.authMode === 'shared' && sharedHub?.homeUrl) {
          goToHub(sharedHub.homeUrl);
        }
      });
    } catch {
      return;
    }

    return () => {
      active = false;
      try {
        if (typeof stop === 'function') stop();
      } catch {
        // Lifecycle adapters must not change local authentication behavior.
      }
    };
  }, [browserSessionLifecycle, session, sharedHub, status]);

  useEffect(() => {
    if (status !== 'authenticated' || session?.authMode !== 'shared') return;
    return onApiUnauthorized(() => {
      setSession(undefined);
      setStatus('anonymous');
    });
  }, [session?.authMode, status]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      currentUser: session ? mapSessionToUser(session) : undefined,
      isSharedSession: authMode === 'shared',
      login: () => {
        const returnTo = fullCurrentRoute();
        if (authMode === 'shared') {
          authService.restoreShared(returnTo);
        } else {
          authService.login(returnTo);
        }
      },
      logout: async () => {
        await authService.logout();
        setSession(undefined);
        setStatus('anonymous');
      },
      backToHub: () => {
        if (sharedHub) {
          goToHub(sharedHub.homeUrl);
        }
      },
      retry,
    }),
    [authMode, retry, session, sharedHub, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
