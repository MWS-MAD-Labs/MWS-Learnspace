import { uuidSchema } from '@learnspace/contracts';
import { z } from 'zod';
import type { RequestHandler } from '../type/http.js';
import { parseRequest } from '../middleware/http-errors.js';
import {
  aggregateMembershipFor,
  requireAggregateAuth,
} from '../utils/aggregates.policy.js';

const organizationPathSchema = z
  .object({ organizationId: uuidSchema })
  .strict();

export function aggregateOrganizationId(
  request: Parameters<RequestHandler>[0],
) {
  return parseRequest(organizationPathSchema, request.params).organizationId;
}

export function aggregateRequestContext(
  request: Parameters<RequestHandler>[0],
  requireUser = false,
) {
  const organizationId = aggregateOrganizationId(request);
  const auth = requireUser ? requireAggregateAuth(request) : undefined;
  const membership = aggregateMembershipFor(request, organizationId);
  return { organizationId, membership, auth };
}
