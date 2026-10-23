import {
  organizationSchoolDateResponseSchema,
  organizationSettingsResponseSchema,
  organizationSettingsUpdateCommandSchema,
  organizationsResponseSchema,
  uuidSchema,
} from '@learnspace/contracts';
import { z } from 'zod';
import { parseRequest } from '../middleware/http-errors.js';
import type { RequestHandler } from '../type/http.js';
import {
  requireResourceAuth,
  requireResourcePermission,
  resourceMembershipFor,
} from '../utils/resource-access.js';
import type { OrganizationsService } from '../service/organizations-service.js';

const organizationPath = z.object({ organizationId: uuidSchema }).strict();
const settingsResponse = (organization: {
  id: string;
  name: string;
  timezone: string;
}) =>
  organizationSettingsResponseSchema.parse({
    data: {
      organizationId: organization.id,
      name: organization.name,
      timezone: organization.timezone,
    },
  });

export function createOrganizationsController(service: OrganizationsService) {
  const list: RequestHandler = async (request, response, next) => {
    try {
      const organizationIds = requireResourceAuth(request).memberships.map(
        (membership) => membership.organizationId,
      );
      const data = await service.list(organizationIds);
      response.json(
        organizationsResponseSchema.parse({
          data,
          meta: { count: data.length },
        }),
      );
    } catch (error) {
      next(error);
    }
  };
  const schoolDate: RequestHandler = async (request, response, next) => {
    try {
      const { organizationId } = parseRequest(organizationPath, request.params);
      resourceMembershipFor(request, organizationId);
      const data = await service.schoolDate(organizationId);
      response.json(
        organizationSchoolDateResponseSchema.parse({
          data: {
            organizationId,
            timezone: data.timezone,
            schoolDate: data.schoolDate.toISOString().slice(0, 10),
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  };
  const getSettings: RequestHandler = async (request, response, next) => {
    try {
      const { organizationId } = parseRequest(organizationPath, request.params);
      const membership = resourceMembershipFor(request, organizationId);
      requireResourcePermission(membership, 'organization:admin');
      response.json(settingsResponse(await service.settings(organizationId)));
    } catch (error) {
      next(error);
    }
  };
  const updateSettings: RequestHandler = async (request, response, next) => {
    try {
      const { organizationId } = parseRequest(organizationPath, request.params);
      const command = parseRequest(
        organizationSettingsUpdateCommandSchema,
        request.body,
      );
      const auth = requireResourceAuth(request);
      const membership = resourceMembershipFor(request, organizationId);
      requireResourcePermission(membership, 'organization:admin');
      const organization = await service.updateSettings({
        organizationId,
        command,
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(settingsResponse(organization));
    } catch (error) {
      next(error);
    }
  };
  return { list, schoolDate, getSettings, updateSettings };
}
