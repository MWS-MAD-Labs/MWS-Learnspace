import type { Request } from 'express';
import type { MembershipScope } from '../utils/authorization.js';

export type AuthenticatedRequest = Request & {
  auth?: {
    sessionId: string;
    userId: string;
    memberships: MembershipScope[];
  };
};
