import { aggregateNotificationsResponseSchema } from '@learnspace/contracts';
import type { RequestHandler } from '../type/http.js';
import { aggregateRequestContext } from '../controller/aggregates-controller.js';
import type { NotificationsQueryService } from '../service/notifications-service.js';

export function createNotificationsController(
  service: NotificationsQueryService,
) {
  const get: RequestHandler = async (request, response, next) => {
    try {
      const { organizationId, membership, auth } = aggregateRequestContext(
        request,
        true,
      );
      const data = await service.list(organizationId, membership, auth!.userId);
      response.json(
        aggregateNotificationsResponseSchema.parse({
          data,
          meta: { count: data.length },
        }),
      );
    } catch (error) {
      next(error);
    }
  };
  return { get };
}
