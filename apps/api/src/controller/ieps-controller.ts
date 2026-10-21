import {
  iepCreateCommandSchema,
  iepDetailResponseSchema,
  iepListQuerySchema,
  iepMutationResponseSchema,
  iepReviewCommandSchema,
  iepUpdateCommandSchema,
  iepWorkflowCommandSchema,
  iepsResponseSchema,
  uuidSchema,
} from '@learnspace/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../type/http.js';
import { HttpError, parseRequest } from '../middleware/http-errors.js';
import { iepMembershipFor } from '../utils/ieps.policy.js';
import type { IepService } from '../service/ieps-service.js';

const organizationPathSchema = z
  .object({ organizationId: uuidSchema })
  .strict();
const iepPathSchema = z
  .object({ organizationId: uuidSchema, iepId: uuidSchema })
  .strict();

function requireAuth(request: Parameters<RequestHandler>[0]) {
  const auth = (request as AuthenticatedRequest).auth;
  if (!auth) {
    throw new HttpError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required.',
    );
  }
  return auth;
}

export function createIepController(service: IepService) {
  const list: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(organizationPathSchema, request.params);
      const query = parseRequest(iepListQuerySchema, request.query);
      const auth = requireAuth(request);
      const data = await service.list({
        organizationId: path.organizationId,
        query,
        membership: iepMembershipFor(auth.memberships, path.organizationId),
      });
      response.json(
        iepsResponseSchema.parse({ data, meta: { count: data.length } }),
      );
    } catch (error) {
      next(error);
    }
  };

  const get: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(iepPathSchema, request.params);
      const auth = requireAuth(request);
      const data = await service.get({
        organizationId: path.organizationId,
        iepId: path.iepId,
        membership: iepMembershipFor(auth.memberships, path.organizationId),
      });
      response.json(iepDetailResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const create: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(organizationPathSchema, request.params);
      const command = parseRequest(iepCreateCommandSchema, request.body);
      const auth = requireAuth(request);
      const data = await service.create({
        organizationId: path.organizationId,
        command,
        membership: iepMembershipFor(auth.memberships, path.organizationId),
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.status(201).json(iepMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const submit: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(iepPathSchema, request.params);
      const command = parseRequest(iepWorkflowCommandSchema, request.body);
      const auth = requireAuth(request);
      const data = await service.submit({
        organizationId: path.organizationId,
        iepId: path.iepId,
        command,
        membership: iepMembershipFor(auth.memberships, path.organizationId),
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(iepMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const coordinatorReview: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(iepPathSchema, request.params);
      const command = parseRequest(iepReviewCommandSchema, request.body);
      const auth = requireAuth(request);
      const data = await service.coordinatorReview({
        organizationId: path.organizationId,
        iepId: path.iepId,
        command,
        membership: iepMembershipFor(auth.memberships, path.organizationId),
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(iepMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const directorReview: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(iepPathSchema, request.params);
      const command = parseRequest(iepReviewCommandSchema, request.body);
      const auth = requireAuth(request);
      const data = await service.directorReview({
        organizationId: path.organizationId,
        iepId: path.iepId,
        command,
        membership: iepMembershipFor(auth.memberships, path.organizationId),
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(iepMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const activate: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(iepPathSchema, request.params);
      const command = parseRequest(iepWorkflowCommandSchema, request.body);
      const auth = requireAuth(request);
      const data = await service.activate({
        organizationId: path.organizationId,
        iepId: path.iepId,
        command,
        membership: iepMembershipFor(auth.memberships, path.organizationId),
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(iepMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const archive: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(iepPathSchema, request.params);
      const command = parseRequest(iepWorkflowCommandSchema, request.body);
      const auth = requireAuth(request);
      const data = await service.archive({
        organizationId: path.organizationId,
        iepId: path.iepId,
        command,
        membership: iepMembershipFor(auth.memberships, path.organizationId),
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(iepMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(iepPathSchema, request.params);
      const command = parseRequest(iepUpdateCommandSchema, request.body);
      const auth = requireAuth(request);
      const data = await service.update({
        organizationId: path.organizationId,
        iepId: path.iepId,
        command,
        membership: iepMembershipFor(auth.memberships, path.organizationId),
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(iepMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  return {
    list,
    get,
    create,
    submit,
    coordinatorReview,
    directorReview,
    activate,
    archive,
    update,
  };
}
