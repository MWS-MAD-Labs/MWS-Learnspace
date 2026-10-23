import { dashboardSummaryResponseSchema } from '@learnspace/contracts';
import type { RequestHandler } from '../type/http.js';
import { aggregateRequestContext } from '../controller/aggregates-controller.js';
import type { DashboardQueryService } from '../service/dashboard-service.js';

export function createDashboardController(service: DashboardQueryService) {
  const get: RequestHandler = async (request, response, next) => {
    try {
      const { organizationId, membership } = aggregateRequestContext(request);
      const data = await service.get(organizationId, membership);
      response.json(dashboardSummaryResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };
  return { get };
}
