import type { Request } from 'express';
import {
  AuthorizationDeniedError,
  requireOrganizationScope,
} from '../utils/authorization.js';
import type { AuthenticatedRequest } from '../type/http.js';
import { HttpError } from '../middleware/http-errors.js';

export function requireAggregateAuth(request: Request) {
  const auth = (request as AuthenticatedRequest).auth;
  if (!auth) {
    throw new HttpError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required.',
    );
  }
  return auth;
}

export function aggregateMembershipFor(
  request: Request,
  organizationId: string,
) {
  try {
    return requireOrganizationScope(
      requireAggregateAuth(request).memberships,
      organizationId,
    );
  } catch (error) {
    if (error instanceof AuthorizationDeniedError) {
      throw new HttpError(
        403,
        'AUTHORIZATION_DENIED',
        'The request was denied.',
      );
    }
    throw error;
  }
}
