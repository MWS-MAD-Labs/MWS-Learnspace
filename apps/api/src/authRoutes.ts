import type { Request, RequestHandler, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import type { AppConfig } from './config.js';
import type { Logger } from './logger.js';
import { OAuthDeniedError, OAuthService } from './oauthService.js';
import { permissionsForRole, type MembershipScope } from './authorization.js';
import {
  appendCookie,
  clearCookie,
  csrfCookieName,
  oauthContextCookieName,
  parseCookies,
  sessionCookieName,
} from './httpCookies.js';
import { randomToken, safeEqual } from './authCrypto.js';
import { SessionService } from './sessionService.js';

const oauthCookieLifetimeSeconds = 10 * 60;

export type AuthenticatedRequest = Request & {
  auth?: {
    sessionId: string;
    userId: string;
    memberships: MembershipScope[];
  };
};

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
      assignedStudentIds: membership.staffAssignments.map(
        (assignment) => assignment.studentId,
      ),
      permissions: permissionsForRole(membership.role),
    })),
    expiresAt: session.expiresAt.toISOString(),
  };
}

function safeError(
  response: Response,
  status: number,
  code: string,
  message: string,
) {
  response.status(status).json({
    error: {
      code,
      message,
      requestId: String(response.locals.requestId),
    },
  });
}

export function createRequiredAuthentication(
  sessions: SessionService,
): RequestHandler {
  return async (request: AuthenticatedRequest, response, next) => {
    try {
      const token = parseCookies(request)[sessionCookieName];
      const session = await sessions.lookup(token);
      if (!session) {
        safeError(
          response,
          401,
          'AUTHENTICATION_REQUIRED',
          'Authentication is required.',
        );
        return;
      }
      request.auth = {
        sessionId: session.id,
        userId: session.userId,
        memberships: session.user.memberships.map((membership) => ({
          organizationId: membership.organizationId,
          role: membership.role,
          unitIds: membership.unitScopes.map((scope) => scope.unitId),
          gradeIds: membership.gradeScopes.map((scope) => scope.gradeId),
          subjectIds: membership.subjectScopes.map((scope) => scope.subjectId),
          assignedStudentIds: membership.staffAssignments.map(
            (assignment) => assignment.studentId,
          ),
        })),
      };
      response.locals.session = session;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function createCsrfProtection(): RequestHandler {
  return (request, response, next) => {
    const cookieToken = parseCookies(request)[csrfCookieName];
    const headerToken = request.header('x-csrf-token');
    if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
      safeError(
        response,
        403,
        'CSRF_VALIDATION_FAILED',
        'The request was denied.',
      );
      return;
    }
    next();
  };
}

export function createAuthRouter(
  config: AppConfig,
  sessions: SessionService,
  oauth: OAuthService,
  logger: Logger,
): Router {
  const router = createRouter();
  const requireAuthentication = createRequiredAuthentication(sessions);
  const requireCsrf = createCsrfProtection();
  const secure = secureCookies(config);

  router.get('/login', async (request, response, next) => {
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
  });

  router.get('/callback', async (request, response) => {
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
  });

  router.get('/session', requireAuthentication, (_request, response) => {
    response.setHeader('cache-control', 'no-store');
    response.json(sessionPayload(response.locals.session));
  });

  router.post(
    '/logout',
    requireAuthentication,
    requireCsrf,
    async (request, response, next) => {
      try {
        const token = parseCookies(request)[sessionCookieName];
        await sessions.revoke(token);
        clearCookie(response, sessionCookieName, secure);
        clearCookie(response, csrfCookieName, secure);
        response.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
