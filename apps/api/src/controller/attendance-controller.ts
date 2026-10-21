import {
  attendanceBulkSaveCommandSchema,
  attendanceBulkSaveResponseSchema,
  attendanceQuerySchema,
  attendanceRosterResponseSchema,
} from '@learnspace/contracts';
import type { RequestHandler } from 'express';
import type { AuthenticatedRequest } from '../type/http.js';
import { HttpError, parseRequest } from '../middleware/http-errors.js';
import { attendanceMembershipFor } from '../utils/attendance.policy.js';
import type { AttendanceService } from '../service/attendance-service.js';

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

export function createAttendanceController(service: AttendanceService) {
  const getRoster: RequestHandler = async (request, response, next) => {
    try {
      const query = parseRequest(attendanceQuerySchema, request.query);
      const auth = requireAuth(request);
      const membership = attendanceMembershipFor(
        auth.memberships,
        request.params.organizationId,
      );
      const data = await service.getRoster({
        organizationId: request.params.organizationId,
        classId: request.params.classId,
        schoolDate: query.schoolDate,
        membership,
      });
      response.json(attendanceRosterResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  const saveRoster: RequestHandler = async (request, response, next) => {
    try {
      const command = parseRequest(
        attendanceBulkSaveCommandSchema,
        request.body,
      );
      const auth = requireAuth(request);
      const membership = attendanceMembershipFor(
        auth.memberships,
        request.params.organizationId,
      );
      const data = await service.saveRoster({
        organizationId: request.params.organizationId,
        classId: request.params.classId,
        command,
        membership,
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(attendanceBulkSaveResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };

  return { getRoster, saveRoster };
}
