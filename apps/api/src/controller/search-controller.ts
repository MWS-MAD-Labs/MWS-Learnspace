import {
  aggregateSearchQuerySchema,
  aggregateSearchResponseSchema,
} from '@learnspace/contracts';
import type { RequestHandler } from 'express';
import { parseRequest } from '../middleware/http-errors.js';
import { aggregateOrganizationId } from '../controller/aggregates-controller.js';
import { aggregateMembershipFor } from '../utils/aggregates.policy.js';
import type { AggregateSearchQueryService } from '../service/search-service.js';

export function createAggregateSearchController(
  service: AggregateSearchQueryService,
) {
  const get: RequestHandler = async (request, response, next) => {
    try {
      const organizationId = aggregateOrganizationId(request);
      const query = parseRequest(aggregateSearchQuerySchema, request.query);
      const membership = aggregateMembershipFor(request, organizationId);
      response.json(
        aggregateSearchResponseSchema.parse(
          await service.search(organizationId, membership, query),
        ),
      );
    } catch (error) {
      next(error);
    }
  };
  return { get };
}
