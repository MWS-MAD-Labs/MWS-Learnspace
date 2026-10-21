import {
  studentCreateCommandSchema,
  studentDetailResponseSchema,
  studentListQuerySchema,
  studentMutationResponseSchema,
  studentsResponseSchema,
  studentUpdateCommandSchema,
} from '@learnspace/contracts';
import type { RequestHandler } from 'express';
import { parseRequest } from '../middleware/http-errors.js';
import {
  requireResourceAuth,
  requireResourcePermission,
  resourceMembershipFor,
} from '../utils/resource-access.js';
import type { StudentsService } from '../service/students-service.js';

export function createStudentsController(service: StudentsService) {
  const list: RequestHandler = async (request, response, next) => {
    try {
      const query = parseRequest(studentListQuerySchema, request.query);
      const membership = resourceMembershipFor(
        request,
        request.params.organizationId,
      );
      const data = await service.list({
        organizationId: request.params.organizationId,
        query,
        membership,
      });
      response.json(
        studentsResponseSchema.parse({ data, meta: { count: data.length } }),
      );
    } catch (error) {
      next(error);
    }
  };
  const detail: RequestHandler = async (request, response, next) => {
    try {
      const query = parseRequest(
        studentListQuerySchema.pick({ schoolDate: true }),
        request.query,
      );
      const membership = resourceMembershipFor(
        request,
        request.params.organizationId,
      );
      requireResourcePermission(membership, 'student:sensitive-read');
      const data = await service.detail({
        organizationId: request.params.organizationId,
        studentId: request.params.studentId,
        schoolDate: query.schoolDate,
        membership,
      });
      response.json(studentDetailResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };
  const create: RequestHandler = async (request, response, next) => {
    try {
      const command = parseRequest(studentCreateCommandSchema, request.body);
      const auth = requireResourceAuth(request);
      const membership = resourceMembershipFor(
        request,
        request.params.organizationId,
      );
      requireResourcePermission(membership, 'student:admin');
      const data = await service.create({
        organizationId: request.params.organizationId,
        command,
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.status(201).json(studentMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };
  const update: RequestHandler = async (request, response, next) => {
    try {
      const command = parseRequest(studentUpdateCommandSchema, request.body);
      const auth = requireResourceAuth(request);
      const membership = resourceMembershipFor(
        request,
        request.params.organizationId,
      );
      requireResourcePermission(membership, 'student:admin');
      const data = await service.update({
        organizationId: request.params.organizationId,
        studentId: request.params.studentId,
        command,
        actorId: auth.userId,
        requestId: String(response.locals.requestId),
      });
      response.json(studentMutationResponseSchema.parse({ data }));
    } catch (error) {
      next(error);
    }
  };
  return { list, detail, create, update };
}
