import type { RequestHandler } from '../type/http.js';
import { HttpError } from './http-errors.js';

export function managedByCentralError() {
  return new HttpError(
    409,
    'MANAGED_BY_CENTRAL',
    'This is managed in Central.',
  );
}

// Refuses the request outright when Central manages the data.
export function refuseWhenManaged(managed: boolean): RequestHandler {
  return (_request, _response, next) => {
    next(managed ? managedByCentralError() : undefined);
  };
}

// Refuses a request that sets one of the fields Central owns, and lets the others through.
export function refuseFieldsWhenManaged(
  managed: boolean,
  fields: readonly string[],
): RequestHandler {
  return (request, _response, next) => {
    const body = request.body;
    const sets =
      managed &&
      body !== null &&
      typeof body === 'object' &&
      fields.some((field) => field in body);
    next(sets ? managedByCentralError() : undefined);
  };
}
