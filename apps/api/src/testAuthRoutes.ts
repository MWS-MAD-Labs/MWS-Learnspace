import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import type { AppConfig } from './config.js';
import { randomToken, safeEqual } from './authCrypto.js';
import {
  appendCookie,
  csrfCookieName,
  parseCookies,
  sessionCookieName,
} from './httpCookies.js';
import type { SessionService } from './sessionService.js';

export const e2eAuthHeaderName = 'x-learnspace-e2e-secret';

export function createTestAuthRouter(
  config: AppConfig,
  prisma: PrismaClient,
  sessions: SessionService,
): Router {
  if (
    config.nodeEnv !== 'test' ||
    !config.e2eAuthSecret ||
    !config.e2eAuthUserEmail
  ) {
    throw new Error('Test authentication is not enabled.');
  }

  const router = createRouter();

  router.post('/session', async (request, response, next) => {
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

      const user = await prisma.user.findFirst({
        where: {
          email: config.e2eAuthUserEmail,
          status: 'ACTIVE',
          memberships: {
            some: { status: 'ACTIVE', organization: { status: 'ACTIVE' } },
          },
        },
        select: { id: true },
      });
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
  });

  return router;
}
