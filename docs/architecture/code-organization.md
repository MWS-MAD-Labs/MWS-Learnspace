# Code Organization

Learnspace uses horizontal backend layers aligned with MWS Data Center's
route/controller/service/model convention. Learnspace retains dependency
injection and shared runtime contracts rather than using global infrastructure
singletons or duplicating API schemas.

## Backend layout

```text
apps/api/src/
  application/  application composition and executable entry points
  routes/       Express paths, methods, and middleware registration
  controller/   HTTP request and response adapters
  service/      use cases, Prisma operations, transactions, and audits
  model/        Prisma projections, internal DTOs, and response mappers
  validation/   server-internal Zod schemas and request helpers
  utils/        policies and pure reusable helpers
  middleware/   authentication, CSRF, request, and error middleware
  lib/          database, runtime configuration, and logging infrastructure
  type/         cross-layer server-only TypeScript types
  test/         API unit, composition, script, and integration tests
```

Backend requests flow in one direction:

```text
application -> routes -> middleware -> controller -> service -> Prisma
                                           |            |
                                           v            v
                                      validation    model / utils
                                           |
                                           v
                                  @learnspace/contracts
```

## Application

`apps/api/src/application/` owns application assembly and executable entry
points:

- create the Express application;
- construct and inject routers, services, the database, and the logger;
- mount global middleware and API routers;
- start and stop the HTTP process;
- run OpenAPI generation and administrative import commands.

Application modules may import all runtime layers for composition. Other layers
must not import application modules.

## Routes

Files in `apps/api/src/routes/` use the `*-router.ts` suffix. Routes own HTTP
topology only:

- methods and paths;
- authentication and CSRF middleware registration;
- controller registration;
- router composition and ordering.

Routes must not:

- import Prisma;
- query or mutate the database;
- open transactions;
- parse command bodies inline;
- implement authorization policy;
- map database records into responses.

## Controllers

Files in `apps/api/src/controller/` use the `*-controller.ts` suffix.
Controllers adapt HTTP requests to service calls:

- parse path, query, and body values;
- use schemas exported by `@learnspace/contracts` for public wire data;
- read the authenticated request context;
- call a service operation;
- validate public response values with contract schemas;
- select HTTP status codes and response bodies;
- pass failures to the central error middleware.

Controllers must not import Prisma or own transactions and business rules.

## Services

Files in `apps/api/src/service/` use the `*-service.ts` suffix. Services receive
an injected `PrismaClient` and access Prisma directly, following the Data Center
service model without introducing a global client.

Services own:

- business invariants;
- database queries and mutations;
- transaction boundaries;
- workflow transitions;
- record-level authorization orchestration;
- optimistic concurrency;
- audit-event writes;
- translation of persistence conflicts into application errors.

Only infrastructure entry points may create a `PrismaClient`. Services,
controllers, routes, models, utilities, and middleware must receive dependencies
through factories or function arguments.

There is no repository layer. Files named `*repository*`, `*.database.ts`, or
`*-prisma-service.ts` are prohibited. Reusable transaction-local functions may
remain private inside the owning service.

## Models

Files in `apps/api/src/model/` use the `*-model.ts` suffix. A model is an
application/DTO model, not a Prisma schema wrapper.

Models own:

- Prisma `select` and `include` projections;
- `Prisma.*GetPayload` result types;
- internal DTOs and projection types;
- pure database-row-to-contract mapping;
- pure audit snapshot mapping;
- pure request-to-persistence data builders.

Models must not query the database, import Express, or call services.

Database entities remain defined in `prisma/schema.prisma`. Public request and
response types remain in `packages/contracts`.

## Validation

Files in `apps/api/src/validation/` use the `*-validation.ts` suffix. This layer
owns server-internal validation such as:

- runtime configuration;
- import manifests;
- seed guards;
- path, header, and cookie schemas;
- stored JSON validation;
- reusable request parsing helpers.

Public API body, query, and response schemas remain authoritative in
`@learnspace/contracts`. API validation modules may compose those schemas but
must not fork them.

## Utilities

`apps/api/src/utils/` contains pure helpers and explicitly named policies:

- authorization and record-scope calculations;
- workflow transition rules;
- date-only conversion;
- Prisma error-code inspection;
- scoring calculations;
- cryptographic and cookie helpers;
- organization-time calculations.

Utilities must not perform database operations or mutate Express responses.

## Middleware

`apps/api/src/middleware/` contains Express pipeline concerns:

- required authentication;
- CSRF protection;
- request IDs and request logging;
- not-found handling;
- centralized error responses.

Middleware may use injected services, but it must not create a Prisma client.

## Infrastructure and types

`apps/api/src/lib/` owns configured infrastructure and lifecycle concerns:

- database construction, readiness, and shutdown;
- runtime configuration loading;
- structured logging.

`apps/api/src/type/` contains only cross-layer server types such as authenticated
request state, membership scope, and import report types. Domain DTOs belong in
`model/`; public wire types belong in `packages/contracts`.

## Frontend layout

Frontend production code remains feature-oriented:

```text
apps/web/src/
  app/       application state and composition
  features/  domain APIs, hooks, components, and pages
  components/ compatibility exports and shared layout components
  services/  shared clients and temporary compatibility exports
```

Feature requests flow through:

```text
page -> hook/component -> feature API -> shared API client
```

### URL routing

The web application uses React Router with browser-history URLs. The router is
the source of truth for the active page and exact record target; `AppContext`
exposes compatibility navigation helpers that derive their values from the
current location rather than maintaining an independent tab state machine.

Primary routes include:

```text
/dashboard
/attendance?classId=...&studentId=...
/people
/reports
/journeys/calendar
/journeys/tracker
/journeys/new
/journeys/:journeyId
/journeys/:journeyId/edit
/observations/assignments/:assignmentId
/observations/students/:studentId/results
/observations/manage/:manageTab/:studentId?
/students/:studentId/ieps/:iepId?
/weekly-reports/tracker
/students/:studentId/weekly-reports/:reportId
```

Collection filters and stable workspace selections use URL search parameters.
Unsaved form fields, mutation progress, validation errors, and toast state remain
local React state. Authentication preserves the full pathname, query string, and
hash as the OAuth return target.

`AppShell` is a protected layout route and renders child pages through an
`Outlet`. Sidebar links use route-aware navigation, so refresh, deep links, and
browser Back/Forward restore the selected workspace and record.

## Contracts

Shared API schemas live in `packages/contracts` and are organized by domain.
Both API controllers and browser API clients consume the same schemas. Contracts
must not import Prisma or application implementation modules.

## Tests

Tests are centralized rather than colocated with production implementations:

```text
apps/api/src/test/
  integration/  real PostgreSQL and HTTP integration suites
  support/      shared backend test helpers
  *.test.ts     unit, composition, policy, contract, and script tests

apps/web/test/
  setup.ts
  components/
  context/
  features/
  services/

e2e/
  *.spec.ts     Compose-backed Playwright workflows
```

API production builds exclude `apps/api/src/test`. Integration tests run with a
single worker because they share one PostgreSQL database.

Test naming communicates execution requirements:

- fast unit/component tests: `*.test.ts` or `*.test.tsx`;
- real PostgreSQL tests: `*.integration.test.ts`;
- browser E2E tests: `*.spec.ts`.

Production code must never import from a test directory.

## Architecture enforcement

`apps/api/src/test/architecture.test.ts` enforces the principal backend rules:

- no feature-first backend directory;
- no repository or Prisma-adapter layer;
- Data Center filename conventions;
- no Prisma imports, queries, or transactions in routes and controllers;
- services may not delegate persistence to hidden Prisma adapter services.

Every structural change must preserve endpoint paths, contracts, status codes,
authorization, transaction behavior, audit behavior, OpenAPI output, and the
full unit/integration/E2E regression suite.
