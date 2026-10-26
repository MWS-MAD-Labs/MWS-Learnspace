import type { RequestHandler } from '../type/http.js';
import type { AppConfig } from '../lib/config.js';
import type { Logger } from '../lib/logger.js';
import { permissionsOfMembership } from '../utils/authorization.js';
import { OAuthDeniedError, OAuthService } from '../service/oauth-service.js';
import {
  appendCookie,
  clearCookie,
  csrfCookieName,
  isValidCsrfToken,
  oauthContextCookieName,
  parseCookies,
  sessionCookieName,
} from '../utils/http-cookies.js';
import { randomToken } from '../utils/auth-crypto.js';
import { SessionService } from '../service/session-service.js';
import type {
  SharedSessionAuthenticationService,
  SharedSessionContext,
} from '../service/shared-session-service.js';

const oauthCookieLifetimeSeconds = 10 * 60;

function secureCookies(config: AppConfig) {
  return config.nodeEnv === 'production';
}

function sessionPayload(
  session: NonNullable<Awaited<ReturnType<SessionService['lookup']>>>,
) {
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.displayName,
      avatarUrl: session.user.avatarUrl,
      status: session.user.status,
    },
    memberships: session.user.memberships.map((membership) => ({
      id: membership.id,
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      role: membership.role,
      roleTitle: membership.roleTitle,
      unitIds: membership.unitScopes.map((scope) => scope.unitId),
      gradeIds: membership.gradeScopes.map((scope) => scope.gradeId),
      subjectIds: membership.subjectScopes.map((scope) => scope.subjectId),
      assignedStudentIds: [
        ...new Set([
          ...membership.staffAssignments.map(
            (assignment) => assignment.studentId,
          ),
          ...membership.observationAssignments.map(
            (assignment) => assignment.studentId,
          ),
        ]),
      ],
      permissions: permissionsOfMembership(
        membership.role,
        membership.permissions,
      ),
    })),
    expiresAt: session.expiresAt.toISOString(),
  };
}

function sharedSessionPayload(
  context: SharedSessionContext,
  shared: SharedSessionAuthenticationService,
) {
  const assignedStudentIds = [
    ...new Set([
      ...context.membership.staffAssignments.map(({ studentId }) => studentId),
      ...context.membership.observationAssignments.map(
        ({ studentId }) => studentId,
      ),
    ]),
  ];
  return {
    authMode: 'shared' as const,
    hub: {
      homeUrl: shared.homeUrl(),
      refreshUrl: shared.refreshUrl(),
    },
    expiresIn: Math.max(1, context.claims.exp - Math.floor(Date.now() / 1_000)),
    user: {
      id: context.user.id,
      email: context.user.email,
      name: context.user.displayName,
      avatarUrl: context.user.avatarUrl,
      status: context.user.status,
    },
    memberships: [
      {
        id: context.membership.id,
        organizationId: context.membership.organizationId,
        organizationName: context.membership.organization.name,
        role: context.role,
        roleTitle: context.membership.roleTitle,
        unitIds: context.membership.unitScopes.map(({ unitId }) => unitId),
        gradeIds: context.membership.gradeScopes.map(({ gradeId }) => gradeId),
        subjectIds: context.membership.subjectScopes.map(
          ({ subjectId }) => subjectId,
        ),
        assignedStudentIds,
        permissions: context.permissions,
      },
    ],
    expiresAt: new Date(context.claims.exp * 1_000).toISOString(),
  };
}

export function createAuthController(
  config: AppConfig,
  sessions: SessionService,
  oauth: OAuthService,
  logger: Logger,
  shared?: SharedSessionAuthenticationService,
): Record<
  'bootstrap' | 'login' | 'sso' | 'callback' | 'session' | 'logout',
  RequestHandler
> {
  const secure = secureCookies(config);

  const bootstrap: RequestHandler = (_request, response) => {
    response.setHeader('cache-control', 'no-store');
    const authMode = config.sharedSessionMode ?? 'off';
    if (authMode === 'off') {
      response.json({ authMode });
      return;
    }
    response.json({
      authMode,
      hub: {
        homeUrl: shared?.homeUrl() ?? new URL(config.hubBaseUrl!).toString(),
      },
    });
  };

  const login: RequestHandler = async (request, response, next) => {
    try {
      const redirectPath =
        typeof request.query.returnTo === 'string'
          ? request.query.returnTo
          : '/';
      if (shared) {
        const entry = new URL('/api/v1/auth/sso', config.appUrl);
        entry.searchParams.set('returnTo', redirectPath);
        response.redirect(302, entry.toString());
        return;
      }
      const login = await oauth.begin(redirectPath);
      appendCookie(response, oauthContextCookieName, login.sealedContext, {
        httpOnly: true,
        maxAgeSeconds: oauthCookieLifetimeSeconds,
        sameSite: 'Lax',
        secure,
      });
      response.redirect(302, login.authorizationUrl);
    } catch (error) {
      next(error);
    }
  };

  const sso: RequestHandler = async (request, response, next) => {
    if (!shared) {
      response.status(404).end();
      return;
    }
    try {
      const app = new URL(config.appUrl);
      const requestedReturn =
        typeof request.query.returnTo === 'string'
          ? request.query.returnTo
          : '/';
      const target = new URL(requestedReturn, app);
      const returnTo =
        target.origin === app.origin ? target.toString() : app.toString();
      const result = await shared.ssoStep(request);
      if (result.step === 'ok') {
        response.redirect(302, returnTo);
      } else if (result.step === 'restore') {
        const callback = new URL('/api/v1/auth/sso', app);
        callback.searchParams.set('returnTo', returnTo);
        response.redirect(302, shared.restoreUrl(callback.toString()));
      } else {
        response.redirect(302, shared.homeUrl());
      }
    } catch (error) {
      next(error);
    }
  };

  const callback: RequestHandler = async (request, response) => {
    const code =
      typeof request.query.code === 'string' ? request.query.code : '';
    const state =
      typeof request.query.state === 'string' ? request.query.state : '';
    const sealedContext = parseCookies(request)[oauthContextCookieName];
    clearCookie(response, oauthContextCookieName, secure);

    try {
      if (!code || !state) throw new OAuthDeniedError('INVALID_CALLBACK');
      const result = await oauth.callback(code, state, sealedContext);
      const existingSessionToken = parseCookies(request)[sessionCookieName];
      await sessions.revoke(existingSessionToken);
      const session = await sessions.create(result.user.id);
      const csrfToken = randomToken();
      appendCookie(response, sessionCookieName, session.token, {
        httpOnly: true,
        maxAgeSeconds: config.sessionTtlHours * 60 * 60,
        sameSite: 'Strict',
        secure,
      });
      appendCookie(response, csrfCookieName, csrfToken, {
        httpOnly: false,
        maxAgeSeconds: config.sessionTtlHours * 60 * 60,
        sameSite: 'Strict',
        secure,
      });
      response.redirect(
        302,
        new URL(result.redirectPath, config.appUrl).toString(),
      );
    } catch (error) {
      const outcome =
        error instanceof OAuthDeniedError && error.code === 'ACCOUNT_DISABLED'
          ? 'disabled'
          : 'denied';
      logger.warn(
        {
          requestId: response.locals.requestId,
          reason:
            error instanceof OAuthDeniedError
              ? error.code
              : 'AUTH_CALLBACK_FAILED',
        },
        'authentication callback denied',
      );
      response.redirect(
        302,
        new URL(`/?auth=${outcome}`, config.appUrl).toString(),
      );
    }
  };

  const session: RequestHandler = (request, response) => {
    response.setHeader('cache-control', 'no-store');
    if (shared) {
      const csrfToken = parseCookies(request)[csrfCookieName];
      if (!isValidCsrfToken(csrfToken)) {
        appendCookie(response, csrfCookieName, randomToken(), {
          httpOnly: false,
          maxAgeSeconds: Math.max(
            1,
            (response.locals.session as SharedSessionContext).claims.exp -
              Math.floor(Date.now() / 1_000),
          ),
          sameSite: 'Strict',
          secure,
        });
      }
      response.json(
        sharedSessionPayload(
          response.locals.session as SharedSessionContext,
          shared,
        ),
      );
      return;
    }
    response.json(sessionPayload(response.locals.session));
  };

  const logout: RequestHandler = async (request, response, next) => {
    try {
      if (shared) {
        clearCookie(response, sessionCookieName, secure);
        clearCookie(response, csrfCookieName, secure);
        response.status(204).end();
        return;
      }
      const token = parseCookies(request)[sessionCookieName];
      await sessions.revoke(token);
      clearCookie(response, sessionCookieName, secure);
      clearCookie(response, csrfCookieName, secure);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  return { bootstrap, login, sso, callback, session, logout };
}
