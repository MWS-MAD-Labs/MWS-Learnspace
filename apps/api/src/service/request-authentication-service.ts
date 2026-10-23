import type { SessionService } from './session-service.js';
import type { ShadowSessionObserver } from './shared-session-shadow-service.js';
import type { AuthenticatedRequest } from '../type/http.js';
import { parseCookies, sessionCookieName } from '../utils/http-cookies.js';

export type AuthenticationFailure = {
  status: 401 | 403 | 503;
  code: string;
  message: string;
};

export type AuthenticationResult =
  | { ok: true; session?: unknown }
  | { ok: false; failure: AuthenticationFailure };

export interface RequestAuthenticationService {
  authenticate(request: AuthenticatedRequest): Promise<AuthenticationResult>;
}

export class LocalRequestAuthenticationService implements RequestAuthenticationService {
  constructor(
    private readonly sessions: SessionService,
    private readonly shadowObserver?: ShadowSessionObserver,
  ) {}

  async authenticate(
    request: AuthenticatedRequest,
  ): Promise<AuthenticationResult> {
    const session = await this.sessions.lookup(
      parseCookies(request)[sessionCookieName],
    );
    if (!session) {
      return {
        ok: false,
        failure: {
          status: 401,
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.',
        },
      };
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
    try {
      this.shadowObserver?.observe(request);
    } catch {
      // Shadow observation must never affect the locally authenticated request.
    }
    return { ok: true, session };
  }
}
