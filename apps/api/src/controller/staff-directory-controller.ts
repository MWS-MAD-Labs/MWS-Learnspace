import { staffDirectoryResponseSchema } from '@learnspace/contracts';
import {
  requireResourcePermission,
  resourceMembershipFor,
} from '../utils/resource-access.js';
import type { StaffDirectoryService } from '../service/staff-directory-service.js';
import type { RequestHandler } from '../type/http.js';

export function createStaffDirectoryController(service: StaffDirectoryService) {
  const list: RequestHandler = async (request, response, next) => {
    try {
      const organizationId = request.params.organizationId;
      const membership = resourceMembershipFor(request, organizationId);
      requireResourcePermission(membership, 'staff-directory:read');
      const data = await service.list(organizationId);
      response.json(
        staffDirectoryResponseSchema.parse({
          data,
          meta: { count: data.length },
        }),
      );
    } catch (error) {
      next(error);
    }
  };
  return { list };
}
