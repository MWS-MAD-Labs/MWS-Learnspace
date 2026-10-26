import {
  organizationAccountCreateCommandSchema,
  organizationAccountMutationResponseSchema,
  organizationAccountsResponseSchema,
  organizationAccountUpdateCommandSchema,
  uuidSchema,
} from '@learnspace/contracts';
import { z } from 'zod';
import { HttpError, parseRequest } from '../middleware/http-errors.js';
import type { RequestHandler } from '../type/http.js';
import {
  requireResourceAuth,
  requireResourcePermission,
  resourceMembershipFor,
} from '../utils/resource-access.js';
import type { OrganizationAccountsService } from '../service/organization-accounts-service.js';

// Who a person is and what role they hold comes from Central when it manages accounts.
const centralFields = ['email', 'displayName', 'avatarUrl', 'role'] as const;

function managedByCentralError() {
  return new HttpError(
    409,
    'MANAGED_BY_CENTRAL',
    'Accounts and roles are managed in Central.',
  );
}

export function createOrganizationAccountsController(
  service: OrganizationAccountsService,
  options: {
    managedByCentral?: boolean;
    scopesManagedByCentral?: boolean;
  } = {},
) {
  const managedByCentral = options.managedByCentral === true;
  const scopesManagedByCentral = options.scopesManagedByCentral === true;
  const list: RequestHandler = async (request, response, next) => {
    try {
      const organizationId = request.params.organizationId;
      const membership = resourceMembershipFor(request, organizationId);
      requireResourcePermission(membership, 'organization:admin');
      const data = await service.list(organizationId);
      response.json(
        organizationAccountsResponseSchema.parse({
          data,
          meta: {
            count: data.length,
            managedByCentral,
            scopesManagedByCentral,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  };
  const create: RequestHandler = async (request, response, next) => {
    try {
      if (managedByCentral) throw managedByCentralError();
      const command = parseRequest(
        organizationAccountCreateCommandSchema,
        request.body,
      );
      const organizationId = request.params.organizationId;
      const auth = requireResourceAuth(request);
      const membership = resourceMembershipFor(request, organizationId);
      requireResourcePermission(membership, 'organization:admin');
      const data = await service.create({
        organizationId,
        command,
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response
        .status(201)
        .json(organizationAccountMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };
  const update: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(
        z
          .object({ organizationId: uuidSchema, membershipId: uuidSchema })
          .strict(),
        request.params,
      );
      const command = parseRequest(
        organizationAccountUpdateCommandSchema,
        request.body,
      );
      const auth = requireResourceAuth(request);
      const membership = resourceMembershipFor(request, path.organizationId);
      requireResourcePermission(membership, 'organization:admin');
      if (managedByCentral && centralFields.some((key) => key in command)) {
        throw managedByCentralError();
      }
      if (
        scopesManagedByCentral &&
        ['unitIds', 'gradeIds', 'subjectIds'].some((key) => key in command)
      ) {
        throw managedByCentralError();
      }
      const data = await service.update({
        ...path,
        command,
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(organizationAccountMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };
  return { list, create, update };
}
