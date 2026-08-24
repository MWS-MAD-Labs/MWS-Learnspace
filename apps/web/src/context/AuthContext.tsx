import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CurrentSessionResponse } from '@learnspace/contracts';
import { authService } from '../services/authService';
import type { User, UserRole } from '../types';

export type AuthStatus =
  'loading' | 'authenticated' | 'anonymous' | 'denied' | 'disabled' | 'error';

type AuthContextValue = {
  status: AuthStatus;
  session?: CurrentSessionResponse;
  currentUser?: User;
  login: () => void;
  logout: () => Promise<void>;
  retry: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapSessionToUser(session: CurrentSessionResponse): User | undefined {
  // Milestone 3 presents the first active membership; organization switching is a later product capability.
  const membership = session.memberships[0];
  if (!membership) return undefined;
  return {
    id: session.user.id,
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
    isGPK: membership.role === 'SPECIAL_ED_TEACHER',
    isSpecialEdCoordinator: membership.role === 'SPECIAL_ED_COORDINATOR',
    permissions: membership.permissions,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
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

  const retry = useCallback(async () => {
    setStatus('loading');
    try {
      const loadedSession = await authService.getSession();
      setSession(loadedSession);
      if (!loadedSession) {
        setStatus('anonymous');
      } else if (loadedSession.memberships.length === 0) {
        setStatus('denied');
      } else {
        setStatus('authenticated');
      }
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (queryState !== 'denied' && queryState !== 'disabled') void retry();
  }, [queryState, retry]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      currentUser: session ? mapSessionToUser(session) : undefined,
      login: () => authService.login(window.location.pathname),
      logout: async () => {
        await authService.logout();
        setSession(undefined);
        setStatus('anonymous');
      },
      retry,
    }),
    [retry, session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
