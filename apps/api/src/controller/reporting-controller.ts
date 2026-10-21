import { reportingAggregateResponseSchema } from '@learnspace/contracts';
import type { RequestHandler } from 'express';
import { aggregateRequestContext } from '../controller/aggregates-controller.js';
import type { ReportingQueryService } from '../service/reporting-service.js';

export function createReportingController(service: ReportingQueryService) {
  const get: RequestHandler = async (request, response, next) => {
    try {
      const { organizationId, membership, auth } = aggregateRequestContext(
        request,
        true,
      );
      const data = await service.get(organizationId, membership, auth!.userId);
      response.json(reportingAggregateResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };
  return { get };
}
