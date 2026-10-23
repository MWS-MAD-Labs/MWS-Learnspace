import { safeEqual } from '../utils/auth-crypto.js';
import { csrfCookieName, parseCookies } from '../utils/http-cookies.js';
import type { SessionService } from '../service/session-service.js';
import type {
  AuthenticatedRequest,
  HttpResponse,
  RequestHandler,
} from '../type/http.js';
import type { ShadowSessionObserver } from '../service/shared-session-shadow-service.js';
import {
  LocalRequestAuthenticationService,
  type RequestAuthenticationService,
} from '../service/request-authentication-service.js';

function safeError(
  response: HttpResponse,
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
  service: SessionService | RequestAuthenticationService,
  shadowObserver?: ShadowSessionObserver,
): RequestHandler {
  const authentication =
    'authenticate' in service
      ? service
      : new LocalRequestAuthenticationService(service, shadowObserver);
  return async (request: AuthenticatedRequest, response, next) => {
    try {
      const result = await authentication.authenticate(request);
      if (!result.ok) {
        safeError(
          response,
          result.failure.status,
          result.failure.code,
          result.failure.message,
        );
        return;
      }
      response.locals.session = result.session;
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
