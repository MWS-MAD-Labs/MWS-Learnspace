import type { Response } from 'express';
import type { ZodError, ZodType } from 'zod';
import { apiErrorSchema } from '@learnspace/contracts';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function validationError(error: ZodError): HttpError {
  return new HttpError(400, 'VALIDATION_ERROR', 'The request is invalid.', {
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
}

export function parseRequest<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

export function sendSafeError(
  response: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  response.status(status).json(
    apiErrorSchema.parse({
      error: {
        code,
        message,
        requestId: String(response.locals.requestId),
        ...(details === undefined ? {} : { details }),
      },
    }),
  );
}
