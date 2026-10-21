import type { RequestHandler } from 'express';
import type { AppConfig } from '../lib/config.js';
import type { Logger } from '../lib/logger.js';
import { permissionsForRole } from '../utils/authorization.js';
import { OAuthDeniedError, OAuthService } from '../service/oauth-service.js';
import {
  appendCookie,
  clearCookie,
  csrfCookieName,
  oauthContextCookieName,
  parseCookies,
  sessionCookieName,
} from '../utils/http-cookies.js';
import { randomToken } from '../utils/auth-crypto.js';
import { SessionService } from '../service/session-service.js';

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
      permissions: permissionsForRole(membership.role),
    })),
    expiresAt: session.expiresAt.toISOString(),
  };
}

export function createAuthController(
  config: AppConfig,
  sessions: SessionService,
  oauth: OAuthService,
  logger: Logger,
): Record<'login' | 'callback' | 'session' | 'logout', RequestHandler> {
  const secure = secureCookies(config);

  const login: RequestHandler = async (request, response, next) => {
    try {
      const redirectPath =
        typeof request.query.returnTo === 'string'
          ? request.query.returnTo
          : '/';
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

  const session: RequestHandler = (_request, response) => {
    response.setHeader('cache-control', 'no-store');
    response.json(sessionPayload(response.locals.session));
  };

  const logout: RequestHandler = async (request, response, next) => {
    try {
      const token = parseCookies(request)[sessionCookieName];
      await sessions.revoke(token);
      clearCookie(response, sessionCookieName, secure);
      clearCookie(response, csrfCookieName, secure);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  return { login, callback, session, logout };
}
