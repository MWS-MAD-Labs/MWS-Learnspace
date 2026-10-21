import type { RequestHandler, Response } from 'express';
import { safeEqual } from '../utils/auth-crypto.js';
import {
  csrfCookieName,
  parseCookies,
  sessionCookieName,
} from '../utils/http-cookies.js';
import type { SessionService } from '../service/session-service.js';
import type { AuthenticatedRequest } from '../type/http.js';

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
          observationAssignedStudentIds: membership.observationAssignments.map(
            (assignment) => assignment.studentId,
          ),
          assignedStudentScopes: membership.staffAssignments.map(
            (assignment) => ({
              organizationId: assignment.organizationId,
              studentId: assignment.studentId,
              startsOn: assignment.startsOn,
              endsOn: assignment.endsOn,
            }),
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
