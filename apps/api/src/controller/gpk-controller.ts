import {
  gpkAssignmentEndCommandSchema,
  gpkAssignmentMutationResponseSchema,
  gpkAssignmentQuerySchema,
  gpkAssignmentsResponseSchema,
  gpkAssignmentUpsertCommandSchema,
  uuidSchema,
} from '@learnspace/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { parseRequest } from '../middleware/http-errors.js';
import {
  requireResourceAuth,
  requireResourcePermission,
  resourceMembershipFor,
} from '../utils/resource-access.js';
import type { GpkService } from '../service/gpk-service.js';

export function createGpkController(service: GpkService) {
  const list: RequestHandler = async (request, response, next) => {
    try {
      const query = parseRequest(gpkAssignmentQuerySchema, request.query);
      const membership = resourceMembershipFor(
        request,
        request.params.organizationId,
      );
      requireResourcePermission(membership, 'staff-assignment:admin');
      const data = await service.list(request.params.organizationId, query);
      response.json(
        gpkAssignmentsResponseSchema.parse({
          data,
          meta: { count: data.length },
        }),
      );
    } catch (error) {
      next(error);
    }
  };
  const upsert: RequestHandler = async (request, response, next) => {
    try {
      const command = parseRequest(
        gpkAssignmentUpsertCommandSchema,
        request.body,
      );
      const path = parseRequest(
        z
          .object({ organizationId: uuidSchema, studentId: uuidSchema })
          .strict(),
        request.params,
      );
      const auth = requireResourceAuth(request);
      const membership = resourceMembershipFor(request, path.organizationId);
      requireResourcePermission(membership, 'staff-assignment:admin');
      const data = await service.upsert({
        ...path,
        command,
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(gpkAssignmentMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };
  const end: RequestHandler = async (request, response, next) => {
    try {
      const command = parseRequest(gpkAssignmentEndCommandSchema, request.body);
      const path = parseRequest(
        z
          .object({ organizationId: uuidSchema, assignmentId: uuidSchema })
          .strict(),
        request.params,
      );
      const auth = requireResourceAuth(request);
      const membership = resourceMembershipFor(request, path.organizationId);
      requireResourcePermission(membership, 'staff-assignment:admin');
      const data = await service.end({
        ...path,
        command,
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(gpkAssignmentMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };
  return { list, upsert, end };
}
