# Learnspace API conventions

The public backend surface is rooted at `/api/v1`. Runtime requests and successful responses are validated with schemas from `@learnspace/contracts`; `docs/api/openapi.json` is generated from those same Zod schemas.

## Resources and paths

- Use plural, lower-case resource names and kebab-case multi-word names: `/organizations/{organizationId}/academic-years`.
- Tenant-owned resources are nested under `/organizations/{organizationId}`. The server still resolves the active membership from the session; a path ID never selects an identity or grants scope.
- IDs are opaque UUID strings. Clients must not infer tenant, role, or ordering information from them.
- Collection reads use `GET`; replacement or bulk-upsert commands use `PUT` when retrying the same desired state is safe.

## Dates and times

- School and academic calendar dates use strict ISO 8601 calendar dates: `YYYY-MM-DD`.
- Date-time values use UTC RFC 3339 strings, for example `2026-08-24T12:34:56.000Z`.
- Invalid calendar values such as `2026-02-30`, missing required dates, or date-time strings where a school date is required return `400 VALIDATION_ERROR`.

## Successful responses

- Single-resource responses use `{ "data": ... }`.
- Collection responses use `{ "data": [...], "meta": { "count": number } }`.
- Collection ordering is deterministic and defined by each endpoint.
- Responses are strict. Fields not present in the shared contract are not part of the API. General student endpoints intentionally omit guardian, address, classification, placement, and special-education fields.

## Pagination and filtering

The initial academic, student, and attendance collections are bounded school-administration datasets and are returned without cursor pagination. `meta.count` is always included. When pagination is introduced, it will use an opaque cursor and bounded `limit`; offset pagination is not assumed.

Filters are explicit query parameters. Unknown query parameters are rejected. Filters narrow an already authorized record scope and never expand it.

## Errors and request IDs

All `/api/v1` errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "requestId": "opaque-request-id",
    "details": {}
  }
}
```

`details` is optional and must not contain secrets or sensitive student data. The API accepts a bounded `x-request-id` or generates one, returns it in both the response header and error envelope, and logs it.

Common status/code pairs:

- `400 VALIDATION_ERROR`, `INVALID_JSON`, or a command-specific validation code.
- `401 AUTHENTICATION_REQUIRED`.
- `403 AUTHORIZATION_DENIED` or `CSRF_VALIDATION_FAILED`. Record-scope and cross-organization denials are non-enumerating.
- `404 NOT_FOUND` for unmatched routes, not for protected cross-tenant records.
- `409 ATTENDANCE_VERSION_CONFLICT` for stale attendance state or a serializable write race.
- `413 PAYLOAD_TOO_LARGE`.
- `500 INTERNAL_SERVER_ERROR`.

## Authentication, authorization, and CSRF

- Identity, actor ID, memberships, roles, and record scopes come only from the active server-side session.
- Browser-supplied actor, role, permission, or organization claims are rejected or ignored only where explicitly documented. Attendance commands are strict and reject actor fields.
- Tenant queries include `organizationId` and the applicable unit, grade, subject, class, enrollment, or assigned-student scope.
- State-changing cookie-authenticated requests require the double-submit CSRF cookie/header pair.
- Authorization is deny-by-default.

## Commands, atomicity, and idempotency

Attendance bulk save is a command for exactly one class and one `schoolDate`. It validates the entire command before writing, then upserts attendance rows and appends the success audit event in the same database transaction. A failure rolls back all rows and the audit event.

The command is idempotent for the submitted class/date/student desired state, subject to optimistic concurrency. Recorder identity always becomes the authenticated user, including updates.

## Attendance optimistic concurrency

Attendance does not require an additional version table. A roster response includes a deterministic version derived from all attendance rows for the class/date:

`<record-count>:<maximum-updatedAt>`

An empty set uses `0:none`. The client sends this as `expectedVersion`. The server recomputes and compares it inside a PostgreSQL `Serializable` transaction before writing. A stale value or Prisma serialization/write conflict returns `409 ATTENDANCE_VERSION_CONFLICT`; clients should reload the roster and explicitly retry their intended changes.

This design is intentionally migration-free. It relies on PostgreSQL serializable isolation to prevent two transactions that read the same version from both committing. If future workloads require a simpler lock target or version history independent of attendance rows, introduce a class/date attendance-sheet aggregate with a revision column in a dedicated migration.

## OpenAPI generation

Run:

```sh
npm run openapi:generate
npm run openapi:check
```

`openapi:generate` writes `docs/api/openapi.json` from the runtime/shared Zod schemas and operation registry. `openapi:check` regenerates the document in memory, verifies the committed file is byte-identical, and parses representative payloads with the same runtime schemas.
