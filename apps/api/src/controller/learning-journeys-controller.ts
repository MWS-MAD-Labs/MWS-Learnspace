import {
  learningJourneyCreateCommandSchema,
  learningJourneyDetailResponseSchema,
  learningJourneyDirectorReviewCommandSchema,
  learningJourneyListQuerySchema,
  learningJourneyMutationResponseSchema,
  learningJourneyPrincipalReviewCommandSchema,
  learningJourneySubmitCommandSchema,
  learningJourneyUpdateCommandSchema,
  learningJourneysResponseSchema,
  uuidSchema,
} from '@learnspace/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../type/http.js';
import { HttpError, parseRequest } from '../middleware/http-errors.js';
import { learningJourneyMembershipFor } from '../utils/learning-journeys.policy.js';
import type { LearningJourneyService } from '../service/learning-journeys-service.js';

const organizationPathSchema = z
  .object({ organizationId: uuidSchema })
  .strict();
const journeyPathSchema = z
  .object({ organizationId: uuidSchema, journeyId: uuidSchema })
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

export function createLearningJourneyController(
  service: LearningJourneyService,
) {
  const list: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(organizationPathSchema, request.params);
      const query = parseRequest(learningJourneyListQuerySchema, request.query);
      const auth = requireAuth(request);
      const membership = learningJourneyMembershipFor(
        auth.memberships,
        path.organizationId,
      );
      const data = await service.list({
        organizationId: path.organizationId,
        query,
        membership,
      });
      response.json(
        learningJourneysResponseSchema.parse({
          data,
          meta: { count: data.length },
        }),
      );
    } catch (error) {
      next(error);
    }
  };

  const get: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(journeyPathSchema, request.params);
      const auth = requireAuth(request);
      const membership = learningJourneyMembershipFor(
        auth.memberships,
        path.organizationId,
      );
      const data = await service.get({
        organizationId: path.organizationId,
        journeyId: path.journeyId,
        membership,
      });
      response.json(learningJourneyDetailResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const create: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(organizationPathSchema, request.params);
      const command = parseRequest(
        learningJourneyCreateCommandSchema,
        request.body,
      );
      const auth = requireAuth(request);
      const membership = learningJourneyMembershipFor(
        auth.memberships,
        path.organizationId,
      );
      const data = await service.create({
        organizationId: path.organizationId,
        command,
        membership,
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response
        .status(201)
        .json(learningJourneyMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const submit: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(journeyPathSchema, request.params);
      const command = parseRequest(
        learningJourneySubmitCommandSchema,
        request.body,
      );
      const auth = requireAuth(request);
      const membership = learningJourneyMembershipFor(
        auth.memberships,
        path.organizationId,
      );
      const data = await service.submit({
        organizationId: path.organizationId,
        journeyId: path.journeyId,
        command,
        membership,
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(learningJourneyMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const principalReview: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(journeyPathSchema, request.params);
      const command = parseRequest(
        learningJourneyPrincipalReviewCommandSchema,
        request.body,
      );
      const auth = requireAuth(request);
      const membership = learningJourneyMembershipFor(
        auth.memberships,
        path.organizationId,
      );
      const data = await service.principalReview({
        organizationId: path.organizationId,
        journeyId: path.journeyId,
        command,
        membership,
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(learningJourneyMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const directorReview: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(journeyPathSchema, request.params);
      const command = parseRequest(
        learningJourneyDirectorReviewCommandSchema,
        request.body,
      );
      const auth = requireAuth(request);
      const membership = learningJourneyMembershipFor(
        auth.memberships,
        path.organizationId,
      );
      const data = await service.directorReview({
        organizationId: path.organizationId,
        journeyId: path.journeyId,
        command,
        membership,
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(learningJourneyMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(journeyPathSchema, request.params);
      const command = parseRequest(
        learningJourneyUpdateCommandSchema,
        request.body,
      );
      const auth = requireAuth(request);
      const membership = learningJourneyMembershipFor(
        auth.memberships,
        path.organizationId,
      );
      const data = await service.update({
        organizationId: path.organizationId,
        journeyId: path.journeyId,
        command,
        membership,
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(learningJourneyMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  return { list, get, create, submit, principalReview, directorReview, update };
}
