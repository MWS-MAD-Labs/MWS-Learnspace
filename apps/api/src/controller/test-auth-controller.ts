import type { RequestHandler } from 'express';
import type { AppConfig } from '../lib/config.js';
import { randomToken, safeEqual } from '../utils/auth-crypto.js';
import {
  appendCookie,
  csrfCookieName,
  parseCookies,
  sessionCookieName,
} from '../utils/http-cookies.js';
import type { SessionService } from '../service/session-service.js';
import type { TestAuthService } from '../service/test-auth-service.js';

export const e2eAuthHeaderName = 'x-learnspace-e2e-secret';
export const e2eAuthUserHeaderName = 'x-learnspace-e2e-user-email';

export function createTestAuthController(
  config: AppConfig,
  testAuth: TestAuthService,
  sessions: SessionService,
): { createSession: RequestHandler } {
  if (
    config.nodeEnv !== 'test' ||
    !config.e2eAuthSecret ||
    !config.e2eAuthUserEmail
  ) {
    throw new Error('Test authentication is not enabled.');
  }

  const createSession: RequestHandler = async (request, response, next) => {
    try {
      const suppliedSecret = request.header(e2eAuthHeaderName);
      if (
        !suppliedSecret ||
        !safeEqual(suppliedSecret, config.e2eAuthSecret!)
      ) {
        response.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'The requested resource was not found.',
            requestId: String(response.locals.requestId),
          },
        });
        return;
      }

      const requestedEmail =
        request.header(e2eAuthUserHeaderName) ?? config.e2eAuthUserEmail!;
      const user = await testAuth.findActiveUser(requestedEmail);
      if (!user) {
        response.status(503).json({
          error: {
            code: 'E2E_FIXTURE_UNAVAILABLE',
            message: 'The E2E authentication fixture is unavailable.',
            requestId: String(response.locals.requestId),
          },
        });
        return;
      }

      await sessions.revoke(parseCookies(request)[sessionCookieName]);
      const session = await sessions.create(user.id);
      const csrfToken = randomToken();
      appendCookie(response, sessionCookieName, session.token, {
        httpOnly: true,
        maxAgeSeconds: config.sessionTtlHours * 60 * 60,
        sameSite: 'Strict',
        secure: false,
      });
      appendCookie(response, csrfCookieName, csrfToken, {
        httpOnly: false,
        maxAgeSeconds: config.sessionTtlHours * 60 * 60,
        sameSite: 'Strict',
        secure: false,
      });
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  return { createSession };
}
