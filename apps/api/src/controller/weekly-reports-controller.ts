import {
  weeklyReportCreateCommandSchema,
  weeklyReportDecisionCommandSchema,
  weeklyReportDetailResponseSchema,
  weeklyReportListQuerySchema,
  weeklyReportMutationResponseSchema,
  weeklyReportsResponseSchema,
  weeklyReportSubmitCommandSchema,
  weeklyReportUpdateCommandSchema,
  uuidSchema,
} from '@learnspace/contracts';
import { z } from 'zod';
import type { AuthenticatedRequest, RequestHandler } from '../type/http.js';
import { HttpError, parseRequest } from '../middleware/http-errors.js';
import { weeklyReportMembershipFor } from '../utils/weekly-reports.policy.js';
import type { WeeklyReportService } from '../service/weekly-reports-service.js';

const organizationPathSchema = z
  .object({ organizationId: uuidSchema })
  .strict();
const reportPathSchema = z
  .object({ organizationId: uuidSchema, reportId: uuidSchema })
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

export function createWeeklyReportController(service: WeeklyReportService) {
  const list: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(organizationPathSchema, request.params);
      const query = parseRequest(weeklyReportListQuerySchema, request.query);
      const auth = requireAuth(request);
      const data = await service.list({
        organizationId: path.organizationId,
        query,
        membership: weeklyReportMembershipFor(
          auth.memberships,
          path.organizationId,
        ),
      });
      response.json(
        weeklyReportsResponseSchema.parse({
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
      const path = parseRequest(reportPathSchema, request.params);
      const auth = requireAuth(request);
      const data = await service.get({
        organizationId: path.organizationId,
        reportId: path.reportId,
        membership: weeklyReportMembershipFor(
          auth.memberships,
          path.organizationId,
        ),
      });
      response.json(weeklyReportDetailResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const create: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(organizationPathSchema, request.params);
      const command = parseRequest(
        weeklyReportCreateCommandSchema,
        request.body,
      );
      const auth = requireAuth(request);
      const data = await service.create({
        organizationId: path.organizationId,
        command,
        membership: weeklyReportMembershipFor(
          auth.memberships,
          path.organizationId,
        ),
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response
        .status(201)
        .json(weeklyReportMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(reportPathSchema, request.params);
      const command = parseRequest(
        weeklyReportUpdateCommandSchema,
        request.body,
      );
      const auth = requireAuth(request);
      const data = await service.update({
        organizationId: path.organizationId,
        reportId: path.reportId,
        command,
        membership: weeklyReportMembershipFor(
          auth.memberships,
          path.organizationId,
        ),
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(weeklyReportMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const submit: RequestHandler = async (request, response, next) => {
    try {
      const path = parseRequest(reportPathSchema, request.params);
      const command = parseRequest(
        weeklyReportSubmitCommandSchema,
        request.body,
      );
      const auth = requireAuth(request);
      const data = await service.submit({
        organizationId: path.organizationId,
        reportId: path.reportId,
        expectedVersion: command.expectedVersion,
        membership: weeklyReportMembershipFor(
          auth.memberships,
          path.organizationId,
        ),
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(weeklyReportMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  function decision(kind: 'coordinatorDecision' | 'directorDecision') {
    const handler: RequestHandler = async (request, response, next) => {
      try {
        const path = parseRequest(reportPathSchema, request.params);
        const command = parseRequest(
          weeklyReportDecisionCommandSchema,
          request.body,
        );
        const auth = requireAuth(request);
        const data = await service[kind]({
          organizationId: path.organizationId,
          reportId: path.reportId,
          expectedVersion: command.expectedVersion,
          decision: command.decision,
          comment: command.comment,
          membership: weeklyReportMembershipFor(
            auth.memberships,
            path.organizationId,
          ),
          actorId: auth.userId,
          requestId: String(response.locals.requestId),
        });
        response.json(weeklyReportMutationResponseSchema.parse({ data }));
      } catch (error) {
        next(error);
      }
    };
    return handler;
  }

  return {
    list,
    get,
    create,
    update,
    submit,
    coordinatorDecision: decision('coordinatorDecision'),
    directorDecision: decision('directorDecision'),
  };
}
