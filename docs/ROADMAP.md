# AI-executable production backlog

This file is the implementation source of truth for turning Learnspace from a Google AI Studio frontend prototype into a production-ready, self-hosted application using Docker, PostgreSQL, Prisma, and Google OAuth.

The backlog is intentionally ordered. An AI coding agent should select the **first unchecked task whose dependencies are complete**, implement only that task, validate it, update this file, and stop for review unless explicitly asked to continue.

## Execution protocol

For every task, the implementing agent must:

1. Read the files named in the task and inspect adjacent code before editing.
2. Confirm all listed dependencies are complete.
3. Keep the change limited to the task's stated scope.
4. Add or update tests for behavior introduced by the task.
5. Run the task's validation commands.
6. Update documentation when commands, configuration, or behavior changes.
7. Mark the task complete only when every acceptance criterion passes.
8. Record any intentional deviation under the task as a dated note.
9. Do not commit, tag, publish, or deploy unless the user explicitly requests it.
10. Do not place real student data, OAuth credentials, or production secrets in the repository or test fixtures.

### Status legend

- `[ ]` Ready or waiting on dependencies
- `[x]` Complete and validated
- `[!]` Blocked; add the blocking reason below the task
- `[~]` In progress; use only while actively working on the task

### Required completion report

At the end of each task, report:

- files changed;
- behavior added or changed;
- validation commands and results;
- migrations or environment changes;
- remaining risks or follow-up tasks;
- the next unblocked task ID.

## Fixed implementation decisions

These decisions reduce ambiguity for implementation agents. Change them only through a documented architecture decision record (ADR).

| Area            | Decision                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Runtime         | Node.js 20 LTS or newer compatible LTS                                                                        |
| Package manager | npm with a committed `package-lock.json`                                                                      |
| Repository      | npm workspaces with `apps/web`, `apps/api`, and `packages/contracts`                                          |
| Web             | React, TypeScript, Vite, Tailwind CSS                                                                         |
| API             | Express and TypeScript                                                                                        |
| Validation      | Zod schemas shared through `packages/contracts` where appropriate                                             |
| Database        | PostgreSQL 16+                                                                                                |
| ORM             | Prisma with committed migrations                                                                              |
| Authentication  | Google OAuth 2.0/OpenID Connect authorization-code flow with PKCE                                             |
| Session model   | Opaque, revocable server-side sessions stored in PostgreSQL; secure cookie contains only a session identifier |
| API namespace   | `/api/v1`                                                                                                     |
| Testing         | Vitest, React Testing Library, API integration tests, and Playwright E2E tests                                |
| Containers      | Separate web and API images plus PostgreSQL in Docker Compose                                                 |
| Authorization   | API-enforced role-based and record-level authorization                                                        |
| Production data | PostgreSQL is authoritative; browser storage may hold only non-sensitive UI preferences                       |

## Current baseline

The current application has a useful React UI and domain inventory, but its educator workflows remain a prototype:

- the npm workspace contains `apps/web`, `apps/api`, and `packages/contracts`;
- non-attendance prototype domains are initialized from `apps/web/src/data/seedData.ts` and persisted by `apps/web/src/services/storageService.ts` in browser `localStorage`;
- authenticated identity, memberships, permissions, and record scopes come from Google OAuth and PostgreSQL-backed server sessions; the role switcher is isolated to explicit development fake-data builds;
- authorization is enforced by the API for implemented protected resources; remaining prototype domains still contain presentation-only frontend role checks until they migrate;
- the Express API, shared response contracts, PostgreSQL Compose service, Prisma lifecycle, production-oriented images, OAuth, sessions, and authorization foundation are implemented;
- PostgreSQL is authoritative for attendance, while Learning Journey, observations, IEPs, and weekly reports remain browser-backed until Milestone 5;
- `apps/web/src/types.ts` still contains overlapping status representations for remaining prototype domains that must be normalized;
- no active Gemini integration exists; Google AI Studio provenance remains only in `metadata.json`;
- Milestone 0 provides a dependency lockfile, CI pipeline, formatting and linting, type checking, and frontend smoke tests.

Existing documentation:

- [x] DOC-001 — Add production-oriented project overview in `README.md`.
- [x] DOC-002 — Add release and migration policy in `docs/VERSIONING.md`.
- [x] DOC-003 — Add release history baseline in `CHANGELOG.md`.

---

# Milestone 0 — Reproducible prototype baseline

**Target release:** preparation for `0.1.0`

**Milestone exit gate:** a clean clone installs deterministically and passes formatting, linting, type checking, tests, and production build in CI.

**Status:** Complete and locally validated on 2026-08-19. The committed CI workflow will enforce the same gates on pushes to `main` and pull requests.

## P0-001 — Pin Node and npm versions

- [x] **Dependencies:** none
- **Change:**
  - Add `engines.node` and `engines.npm` to the root `package.json`.
  - Add `.nvmrc` with the selected Node 20 LTS version.
  - Document the versions in `README.md`.
- **Acceptance:**
  - Unsupported Node versions produce an understandable installation warning/error.
  - Local setup documentation and package metadata agree.
- **Validate:**
  - `node --version`
  - `npm --version`
  - `npm pkg get engines`

## P0-002 — Create the dependency lockfile

- [x] **Dependencies:** P0-001
- **Change:**
  - Run `npm install` using the pinned toolchain.
  - Commit the generated `package-lock.json`.
  - Do not update dependency ranges unless installation requires a documented compatibility fix.
- **Acceptance:**
  - `npm ci` succeeds from a clean dependency directory.
  - `package-lock.json` is the only package-manager lockfile.
- **Validate:**
  - `npm ci`
  - `npm run build`

## P0-003 — Separate formatting, linting, and type checking

- [x] **Dependencies:** P0-002
- **Change:**
  - Add Prettier and ESLint with TypeScript/React support.
  - Add scripts: `format`, `format:check`, `lint`, and `typecheck`.
  - Change the current `lint` script so it no longer aliases `tsc --noEmit`.
  - Add focused ignore files for generated output.
- **Acceptance:**
  - Formatting, linting, and type checking are independent commands.
  - Existing source is formatted without behavior changes.
  - Lint configuration catches React Hooks errors and unused imports.
- **Validate:**
  - `npm run format:check`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`

## P0-004 — Add frontend smoke tests

- [x] **Dependencies:** P0-003
- **Change:**
  - Add Vitest, jsdom, and React Testing Library.
  - Add a shared test setup file.
  - Add smoke tests proving `App` renders and the default dashboard is visible.
  - Mock browser APIs only where required.
- **Acceptance:**
  - Tests run without opening a browser.
  - At least one test fails if the application root no longer renders.
- **Validate:**
  - `npm test -- --run`
  - `npm run build`

## P0-005 — Add continuous integration

- [x] **Dependencies:** P0-004
- **Change:**
  - Add a GitHub Actions workflow using `npm ci`.
  - Run formatting check, lint, type check, unit tests, and build.
  - Cache npm downloads without caching `node_modules`.
  - Set least-privilege workflow permissions.
- **Acceptance:**
  - The workflow runs on pull requests and pushes to `main`.
  - Every required command is visible as a separate failing/passing step.
- **Validate:**
  - Validate workflow syntax locally if tooling exists.
  - Confirm the workflow uses only committed scripts and the lockfile.

## P0-006 — Add repository governance documents

- [x] **Dependencies:** P0-005
- **Change:**
  - Add `CONTRIBUTING.md` with local setup, branch, test, and PR expectations.
  - Add `SECURITY.md` with a private vulnerability-reporting process and supported-version statement.
  - Add a pull-request template containing security, data migration, test, and documentation checks.
  - Add a license only after the repository owner explicitly selects it.
- **Acceptance:**
  - Contributors can discover setup and validation commands without reading source code.
  - Security reports are directed away from public issues.
- **Owner input required:** license choice and private security contact.
- **Note (2026-08-19):** No license was added because the owner has not selected one. Private reports use GitHub private vulnerability reporting when available; `SECURITY.md` records that a dedicated private contact is still owner-configured.
- **Validate:**
  - Check all internal documentation links.
  - `npm run format:check`

## P0-007 — Remove prototype dependency and encoding noise

- [x] **Dependencies:** P0-003
- **Change:**
  - Prove whether `@google/genai`, `express`, `dotenv`, `motion`, `tsx`, and `esbuild` are currently imported.
  - Remove only dependencies that are unused and not needed by the immediately following API workspace task.
  - Correct corrupted text encoding in comments such as the Vite HMR comment.
  - Document why `metadata.json` remains or remove it if Google AI Studio compatibility is no longer needed.
- **Acceptance:**
  - No dependency is removed based only on assumption.
  - Build and tests pass with the reduced dependency graph.
- **Note (2026-08-19):** Source inspection proved `motion` is imported. `express`, `tsx`, and Express types remain for the upcoming API scaffold. Unused direct dependencies `@google/genai`, `dotenv`, and `esbuild` were removed; Vite still installs esbuild transitively. `metadata.json` remains as prototype provenance and Google AI Studio compatibility metadata, as documented in `README.md`.
- **Validate:**
  - `npm ci`
  - `npm run lint`
  - `npm run typecheck`
  - `npm test -- --run`
  - `npm run build`

---

# Milestone 1 — Workspace, API, and local Docker stack

**Target release:** `0.1.0-alpha.1`

**Milestone exit gate:** web, API, PostgreSQL, dependency health checks, and non-root application images are implemented and runtime-validated in Compose.

**Status:** Complete on 2026-08-19. `docker compose up -d --build` built both application images and started healthy web, API, and PostgreSQL services. Endpoint, proxy, cache-header, SPA fallback, non-root user, graceful shutdown, database persistence, and dependency-failure checks passed.

## P1-001 — Record the target architecture

- [x] **Dependencies:** P0-007
- **Change:**
  - Add `docs/adr/0001-application-architecture.md`.
  - Document workspace layout, browser/API trust boundary, PostgreSQL ownership, session model, Docker services, and migration strategy.
  - Include rejected alternatives and consequences.
- **Acceptance:**
  - The ADR resolves where code, schemas, migrations, and shared contracts belong.
  - It explicitly states that frontend role checks are not authorization.
- **Note (2026-08-19):** Added ADR 0001 defining the target workspace, trust boundary, PostgreSQL and session ownership, Docker services, migration strategy, rejected alternatives, and consequences.
- **Validate:** documentation review and link check.

## P1-002 — Convert the repository to npm workspaces

- [x] **Dependencies:** P1-001
- **Change:**
  - Create `apps/web`, `apps/api`, and `packages/contracts`.
  - Move the existing Vite application into `apps/web` without redesigning it.
  - Configure root npm workspaces and root orchestration scripts.
  - Preserve Git history with file moves where practical.
- **Acceptance:**
  - Existing UI behavior remains unchanged.
  - Root commands can build and test all workspaces.
  - Web aliases and TypeScript paths resolve from the new location.
- **Note (2026-08-19):** Moved the prototype to `apps/web`, added `apps/api` and `packages/contracts`, configured root npm workspaces and orchestration scripts, and retained working web aliases and tests.
- **Validate:**
  - `npm ci`
  - `npm run lint --workspaces --if-present`
  - `npm run typecheck --workspaces --if-present`
  - `npm test --workspaces --if-present -- --run`
  - `npm run build --workspaces --if-present`

## P1-003 — Scaffold the shared contracts package

- [x] **Dependencies:** P1-002
- **Change:**
  - Configure `packages/contracts` as a TypeScript package.
  - Add Zod and define initial schemas for API error responses, health responses, and version responses.
  - Export inferred TypeScript types.
- **Acceptance:**
  - Web and API workspaces can import the package without copying types.
  - Package build and type checking succeed independently.
- **Note (2026-08-19):** Added `@learnspace/contracts` with Zod schemas and inferred types for API errors, health responses, and version responses, exported as a buildable TypeScript workspace package.
- **Validate:**
  - `npm run typecheck -w packages/contracts`
  - `npm run build -w packages/contracts`

## P1-004 — Scaffold the Express API

- [x] **Dependencies:** P1-003
- **Change:**
  - Create an Express TypeScript application in `apps/api`.
  - Add graceful startup and shutdown.
  - Add `/health/live` and `/api/v1/version` using shared response schemas.
  - Disable the default Express identification header.
- **Acceptance:**
  - API startup does not require the frontend.
  - `SIGTERM` stops accepting traffic and closes the server.
  - Endpoints return validated JSON and correct status codes.
- **Note (2026-08-19):** Added the Express/TypeScript API with graceful `SIGINT`/`SIGTERM` shutdown, `/health/live`, `/health/ready`, and `/api/v1/version` endpoints using shared schemas, plus disabled Express identification headers.
- **Validate:**
  - API unit/integration tests
  - `npm run typecheck -w apps/api`
  - `npm run build -w apps/api`

## P1-005 — Add runtime configuration validation

- [x] **Dependencies:** P1-004
- **Change:**
  - Add a Zod environment schema in the API.
  - Validate `NODE_ENV`, `PORT`, `DATABASE_URL`, `APP_URL`, `SESSION_SECRET`, Google OAuth values, and `LOG_LEVEL`.
  - Permit OAuth placeholders only in explicitly configured development mode before authentication is implemented.
  - Add safe `.env.example` documentation without real secrets.
- **Acceptance:**
  - Production startup fails before listening when required configuration is missing or weak.
  - Secret values are never printed in errors or logs.
- **Note (2026-08-19):** Added Zod validation for API runtime variables, minimum session-secret strength, safe field-only configuration errors, explicit development-only OAuth placeholders, and a non-secret `.env.example` contract.
- **Validate:**
  - Tests for valid, missing, malformed, and weak configuration
  - `npm run typecheck -w apps/api`

## P1-006 — Add API logging and error handling

- [x] **Dependencies:** P1-005
- **Change:**
  - Add structured JSON logging.
  - Generate or propagate a request ID.
  - Add not-found and centralized error middleware.
  - Return a consistent error envelope without stack traces in production.
  - Add request body size limits.
- **Acceptance:**
  - Every request log contains request ID, method, path, status, and duration.
  - Unexpected errors are logged once and return a safe response.
- **Note (2026-08-19):** Added structured JSON request logging, generated/propagated request IDs, a `100kb` JSON limit with a safe `413 PAYLOAD_TOO_LARGE` envelope, consistent not-found and error responses, and production-safe error handling covered by API integration tests.
- **Validate:** API integration tests for success, 404, validation error, and unexpected error.

## P1-007 — Add PostgreSQL to Docker Compose

- [x] **Dependencies:** P1-005
- **Change:**
  - Add `compose.yaml` with a PostgreSQL 16+ service.
  - Use a named volume, health check, internal network, and environment interpolation.
  - Do not publish the database port in the production-oriented configuration.
  - Add a development override if host database access is needed.
- **Acceptance:**
  - Database data survives container restart.
  - API receives `DATABASE_URL` through runtime configuration.
  - Database is not externally exposed by default.
- **Note (2026-08-19):** Added PostgreSQL 16 Alpine with a named volume, health check, internal backend network, interpolated credentials, API `DATABASE_URL`, optional `compose.dev.yaml` host port publishing, and two-second API connection/query/statement timeouts for bounded readiness checks. Compose configuration and runtime checks passed; a validation row survived a database container restart and was then removed.
- **Validate:**
  - `docker compose config`
  - `docker compose up -d db`
  - `docker compose ps`

## P1-008 — Containerize the API

- [x] **Dependencies:** P1-006, P1-007
- **Change:**
  - Add a multi-stage API Dockerfile.
  - Install dependencies reproducibly with `npm ci`.
  - Build TypeScript in the builder stage.
  - Run as an unprivileged user with a minimal runtime image.
  - Add a container health check against `/health/live`.
- **Acceptance:**
  - No compiler or development-only source is required at runtime.
  - Container runs as non-root and handles `SIGTERM`.
- **Note (2026-08-19):** Added and built a multi-stage Node Alpine API image using `npm ci`, compiled workspace output, pruned production dependencies, the unprivileged `node` user, and a `/health/live` image check. Runtime inspection confirmed UID/GID `1000`, healthy operation, and graceful `SIGTERM` shutdown with exit code `0`.
- **Validate:**
  - Build the API image.
  - Inspect configured user.
  - Start and stop the container through Compose.

## P1-009 — Containerize the web application

- [x] **Dependencies:** P1-002
- **Change:**
  - Add a multi-stage web Dockerfile.
  - Build the Vite bundle once and serve it from a hardened static server.
  - Add SPA fallback, static cache rules, and a health endpoint.
  - Ensure runtime secrets are not embedded in the frontend bundle.
- **Acceptance:**
  - Direct navigation to frontend routes does not return 404 when routing is introduced.
  - Static assets use immutable caching while `index.html` does not.
  - Container runs as non-root where supported by the selected server image.
- **Note (2026-08-19):** Added and built a multi-stage Vite image served by `nginx-unprivileged`, with SPA fallback, immutable static-asset caching, no-store HTML, `/health`, and same-origin `/api/` proxying. Runtime inspection confirmed the `nginx` UID/GID `101`, successful fallback navigation, and expected response headers.
- **Validate:** build image, run image, load `/`, and inspect response headers.

## P1-010 — Complete local Compose integration

- [x] **Dependencies:** P1-008, P1-009
- **Change:**
  - Add web and API services to `compose.yaml`.
  - Route browser API traffic without permissive production CORS.
  - Add service health checks, startup dependencies, and restart policies.
  - Add `docker compose` setup instructions to `README.md`.
- **Acceptance:**
  - One command starts the complete local stack.
  - Web can call the API version endpoint.
  - API readiness becomes unhealthy when PostgreSQL is unavailable.
- **Note (2026-08-19):** Integrated and runtime-validated `web`, `api`, and `db` with health-based dependencies, restart policies, isolated networks, published web/API ports, nginx same-origin API routing, PostgreSQL-backed API readiness, and README setup instructions. Web, liveness, readiness, version, and proxied version requests passed; stopping PostgreSQL produced readiness `503` and an unhealthy API health state, both of which recovered after PostgreSQL restarted.
- **Validate:**
  - `docker compose config`
  - `docker compose up -d --build`
  - request web, liveness, readiness, and version endpoints
  - `docker compose down`

---

# Milestone 2 — Prisma schema and database lifecycle

**Target release:** `0.1.0-alpha.2`

**Milestone exit gate:** a fresh database can be migrated and safely seeded; schema constraints cover organization scope and core domain ownership; backup restoration is rehearsed.

## P2-001 — Normalize domain terminology and workflow states

- [x] **Dependencies:** P1-010
- **Change:**
  - Add `docs/domain-model.md` mapping current `src/types.ts` concepts to database entities.
  - Define one canonical representation for roles, observation types, attendance statuses, and workflow states.
  - Document allowed Learning Journey, IEP, and Weekly Report transitions.
  - Identify JSON fields versus normalized relational fields.
- **Acceptance:**
  - Duplicate status forms such as title-case and uppercase variants have one target enum.
  - Every persisted entity has an organization owner and lifecycle rule.
- **Validate:** review mappings against all interfaces in the current domain type file.

## P2-002 — Initialize Prisma

- [x] **Dependencies:** P2-001
- **Change:**
  - Add Prisma to the API workspace.
  - Create `prisma/schema.prisma` and Prisma configuration.
  - Add scripts for generate, migration development, migration deployment, migration status, and seed.
  - Add a singleton Prisma client with explicit shutdown.
- **Acceptance:**
  - Prisma connects using validated `DATABASE_URL`.
  - API readiness checks database connectivity.
- **Validate:**
  - Prisma validation and generation
  - API integration test with PostgreSQL
  - readiness failure test when database is unavailable

## P2-003 — Model organizations and authentication records

- [x] **Dependencies:** P2-002
- **Change:**
  - Add Organization, User, Membership, OAuthAccount, and Session models.
  - Add canonical role enums and active/disabled state.
  - Add unique constraints for provider account identity and organization membership.
  - Store session token hashes, not raw tokens.
- **Acceptance:**
  - One Google account can map safely to an internal user.
  - A disabled user cannot have a valid active membership path.
  - Tenant-owned records can reference an organization from the beginning.
- **Validate:** schema tests for uniqueness, foreign keys, and session expiration queries.

## P2-004 — Model academic structure, students, and assignments

- [x] **Dependencies:** P2-003
- **Change:**
  - Add AcademicYear, Semester, Unit, Grade, Class, Subject, Student, Enrollment, GuardianContact, and StaffStudentAssignment models.
  - Separate sensitive guardian contact fields from basic student listing fields.
  - Add organization-scoped uniqueness for student numbers and academic structures.
- **Acceptance:**
  - Students can change class/year without overwriting history.
  - Staff assignments have start/end dates and role context.
  - Queries can scope students by organization, class, grade, and assigned staff.
- **Validate:** migration and integration tests for uniqueness and historical enrollment.

## P2-005 — Model attendance

- [x] **Dependencies:** P2-004
- **Change:**
  - Add AttendanceRecord with student, enrollment/class context, school date, status, minutes late, notes, recorder, and timestamps.
  - Add a uniqueness constraint preventing duplicate attendance for the same student and school context/date.
  - Add indexes for date/class and student history queries.
- **Acceptance:** duplicate records are rejected by PostgreSQL, not only application code.
- **Validate:** repository/integration tests for create, update, duplicate rejection, and indexed query shapes.

## P2-006 — Model Learning Journeys and workflow events

- [x] **Dependencies:** P2-004
- **Change:**
  - Add LearningJourney, ownership, Project, LearningGoal, CrossCurricularConnection, and append-only WorkflowEvent models.
  - Store canonical current state on the aggregate and actor-attributed transition history as events.
- **Acceptance:** project order and goal order are deterministic; invalid ownership references are impossible.
- **Validate:** migration and relation tests.

## P2-007 — Model observation definitions and records

- [x] **Dependencies:** P2-004
- **Change:**
  - Add versioned ObservationDefinition, ObservationAssignment, FEDCObservation, SensoryProfileObservation, and SFAObservation models.
  - Keep instrument response payloads as validated JSON initially where relational reporting is not required.
  - Relationally store student, definition version, observer, assignment, dates, status, scores, and ownership.
- **Acceptance:** completed observations retain the exact definition version used.
- **Validate:** migration tests and JSON schema validation tests for each instrument.

## P2-008 — Model IEPs and weekly reports

- [x] **Dependencies:** P2-004
- **Change:**
  - Add IEP, team member, performance area, accommodation, goal, service schedule, WeeklyReport, WeeklyGoalProgress, and workflow event models.
  - Separate goal achievement events from derived goal summary fields.
  - Enforce explicit association between a weekly report and one IEP.
- **Acceptance:** historical IEPs and reports remain addressable after a new IEP becomes active.
  - A weekly report cannot update a goal from another IEP.
- **Validate:** relation, uniqueness, and lifecycle integration tests.

## P2-009 — Add immutable audit events

- [x] **Dependencies:** P2-003, P2-004
- **Change:**
  - Add AuditEvent with organization, actor, action, target type/ID, timestamp, request ID, result, and safe metadata.
  - Define an allowlist for metadata fields and prohibit raw secrets or full sensitive payload snapshots.
- **Acceptance:** audit events are append-only through application repositories.
- **Validate:** tests for event creation and metadata redaction.

## P2-010 — Create and test the initial migration

- [x] **Dependencies:** P2-005, P2-006, P2-007, P2-008, P2-009
- **Change:**
  - Generate a reviewed initial Prisma migration.
  - Add a migration test that starts from an empty PostgreSQL database.
  - Add a schema compatibility check to API startup/readiness.
- **Acceptance:** fresh databases converge on the same schema and the API reports an actionable incompatible-schema error.
- **Validate:**
  - `prisma migrate deploy` on an empty database
  - full API integration suite

## P2-011 — Add guarded development seed data

- [x] **Dependencies:** P2-010
- **Change:**
  - Convert only necessary fake records from prototype seed data into a Prisma seed.
  - Require an explicit development/test environment flag.
  - Refuse to seed when `NODE_ENV=production`.
  - Make the seed idempotent.
- **Acceptance:** repeated development seeding does not duplicate records; production seeding fails safely.
- **Validate:** empty seed, repeated seed, and production-refusal tests.

## P2-012 — Add database backup and restore runbook

- [x] **Dependencies:** P2-010
- **Change:**
  - Add `docs/operations/backup-and-restore.md`.
  - Document consistent `pg_dump`, restore, encryption, retention, and verification procedures for Compose deployments.
  - Add scripts that require explicit source/target arguments and never embed credentials.
- **Acceptance:** a disposable database can be backed up, deleted, restored, and verified.
- **Validate:** perform and record one local restore drill using fake data.
- **Note (2026-08-19):** Completed Milestone 2 with canonical domain documentation, a root Prisma schema and reviewed initial migration, schema-aware API readiness, normalized organization/authentication/academic/attendance/Learning Journey/observation/IEP/report/audit models, JSON payload validation, database integration tests, guarded idempotent seed data, and a one-shot Compose migration job. A synthetic-data backup/delete/restore drill passed after correcting checksum sidecar portability; the result is recorded in `docs/operations/restore-drills/2026-08-19-local.md`.
- **Validated with:** Prisma format/validate/generate, root Prisma-config type checking, and zero-drift migration diff; `prisma migrate deploy` against an empty PostgreSQL 16 database; API unit and PostgreSQL integration suites including adversarial cross-tenant, actor-membership/state, historical-attribution and membership-identity immutability, cross-IEP, and observation-immutability cases; repeated seed and production-refusal tests; Compose configuration/build and CI Docker target builds; backup and restore scripts including mandatory-checksum refusal, infrastructure-error reporting, and rollback of partially published backup pairs; restored migration, probe-row, and seed-record queries. Final suites passed with 31 API unit tests, 8 PostgreSQL integration tests, and 1 web test.

---

# Milestone 3 — Google OAuth and server-side authorization

**Target release:** `0.1.0-beta.1`

**Milestone exit gate:** real Google identity creates a revocable server-side session, and automated tests prove users cannot access data by editing browser state or request payloads.

## P3-001 — Document Google OAuth setup

- [x] **Dependencies:** P2-003
- **Change:**
  - Add `docs/auth/google-oauth.md` with development, staging, and production client setup.
  - Document exact authorized origins and callback URLs.
  - Document secret rotation and separate clients per environment.
- **Acceptance:** an operator can configure OAuth without exposing credentials in source control.
- **Validate:** configuration names match API environment validation and `.env.example`.

## P3-002 — Implement session storage and cookie handling

- [x] **Dependencies:** P2-003, P1-005
- **Change:**
  - Implement cryptographically random opaque session tokens.
  - Store only token hashes in PostgreSQL.
  - Add expiration, last-used timestamp, revocation, and cleanup behavior.
  - Set `HttpOnly`, `Secure` in production, appropriate `SameSite`, path, and bounded lifetime.
- **Acceptance:** raw session tokens never appear in database rows or logs; logout invalidates the server-side session.
- **Validate:** session creation, lookup, expiry, rotation/revocation, and cookie attribute tests.

## P3-003 — Implement Google authorization and callback routes

- [x] **Dependencies:** P3-001, P3-002
- **Change:**
  - Add login and callback routes using authorization code, state, nonce, and PKCE.
  - Validate issuer, audience, redirect URI, state, nonce, and token timestamps.
  - Link verified provider identity through OAuthAccount.
- **Acceptance:** forged, replayed, expired, wrong-audience, and state-mismatched callbacks are rejected safely.
- **Validate:** unit tests around callback validation and an integration test with a mocked OIDC provider.

## P3-004 — Implement user admission policy

- [x] **Dependencies:** P3-003
- **Change:**
  - Add explicit policy modes: deny unknown users, invite-only provisioning, and optional allowed-domain admission.
  - Default to deny unknown users.
  - Ensure admitted users receive no privileged role automatically.
  - Add disabled-user handling.
- **Acceptance:** email domain alone never grants a role; unknown and disabled users receive safe denial responses.
- **Validate:** admission tests for invited, unknown, wrong-domain, disabled, and existing users.

## P3-005 — Add authentication middleware and session endpoints

- [x] **Dependencies:** P3-004
- **Change:**
  - Add current-session and logout endpoints.
  - Add required-authentication middleware that loads active user and memberships.
  - Add CSRF protection appropriate to the cookie/session design.
- **Acceptance:** protected endpoints return 401 without a valid session and do not reveal whether unrelated records exist.
- **Validate:** API integration tests for missing, expired, revoked, disabled, and valid sessions.

## P3-006 — Define the permission matrix

- [x] **Dependencies:** P2-001
- **Change:**
  - Add `docs/auth/authorization-matrix.md` covering Director, Principal, Grade Teacher, Subject Teacher, Special Education Coordinator, GPK/Special Education Teacher, and Specialist.
  - Define read/write/submit/review/approve/admin/export permissions.
  - Define organization, unit, grade, class, subject, and assigned-student scopes.
- **Acceptance:** every current UI role check maps to a documented server permission or is explicitly removed.
- **Validate:** review all uses of `currentUser.role`, `isGPK`, `isSpecialEdCoordinator`, and `permissions` in the web application.

## P3-007 — Implement authorization primitives

- [x] **Dependencies:** P3-005, P3-006
- **Change:**
  - Add permission guards and organization scope helpers.
  - Add repository query helpers that require organization and record scope.
  - Deny by default when no policy applies.
  - Add audit events for privileged actions and authorization denials without logging sensitive payloads.
- **Acceptance:** repositories cannot fetch tenant-owned records without organization scope.
- **Validate:** table-driven tests across roles and scopes.

## P3-008 — Add authenticated web application shell

- [x] **Dependencies:** P3-005
- **Change:**
  - Add login, callback loading, access denied, disabled account, and authenticated application states.
  - Load current user from the API instead of `storageService.getCurrentUser()`.
  - Add real logout behavior.
- **Acceptance:** application data UI is not rendered before authentication resolves.
- **Validate:** component tests and browser tests for logged-out, logged-in, denied, and logout flows.

## P3-009 — Isolate the prototype role switcher

- [x] **Dependencies:** P3-008
- **Change:**
  - Remove role switching from production builds.
  - If retained for demos, require an explicit development-only build flag and fake-data mode.
  - Ensure the API ignores any browser-provided role identity.
- **Acceptance:** production users cannot impersonate another user through UI, localStorage, cookies, or API payloads.
- **Validate:** production build inspection and API impersonation tests.

## P3-010 — Complete authentication security tests

- [x] **Dependencies:** P3-007, P3-009
- **Change:**
  - Add tests for login CSRF, session fixation, session replay after logout, callback replay, cross-organization access, and privilege escalation payloads.
- **Acceptance:** all listed attacks are denied and produce safe logs/audit events.
- **Validate:** full API and E2E authentication test suites.
- **Note (2026-08-20):** Completed Milestone 3 with documented per-environment Google OAuth configuration, authorization-code flow with state/nonce/PKCE and signed ID-token validation, one-time callback transactions, explicit deny/invite/domain admission modes, hashed and revocable PostgreSQL sessions, secure cookies and CSRF protection, server-derived memberships and permissions, organization-scoped repository helpers, safe authorization audit events, authenticated web states, real logout, and a development-only fake-data role switcher.
- **Validated with:** Prisma format/validate/generate and migration deployment against PostgreSQL; API type checking, unit/security suites for session lifecycle, state mismatch, callback replay, admission, CSRF, permissions and audit denial; web type checking and authenticated-shell tests; lint, formatting, production builds, Compose configuration, and production bundle inspection proving the role-switcher labels are absent.

---

# Milestone 4 — Versioned API and attendance vertical slice

**Target release:** `0.2.0`

**Milestone exit gate:** attendance is fully multi-user and PostgreSQL-backed; no production attendance path reads or writes `localStorage`.

**Status:** Complete on 2026-08-24. API conventions and generated OpenAPI, a typed web client, membership-scoped academic/student endpoints, transactional attendance reads/writes with optimistic concurrency and audit events, an API-backed attendance UI, Compose-backed Playwright coverage, and removal of browser attendance persistence were validated.

## P4-001 — Define API conventions and OpenAPI generation

- [x] **Dependencies:** P3-007
- **Change:**
  - Add `docs/api/conventions.md` for resource names, IDs, dates, pagination, filtering, errors, commands, and idempotency.
  - Generate OpenAPI from runtime schemas or verify schemas against the specification in CI.
- **Acceptance:** `/api/v1` errors and successful responses follow one documented convention.
- **Validate:** OpenAPI generation/validation test.

## P4-002 — Add the typed web API client

- [x] **Dependencies:** P4-001
- **Change:**
  - Add a web API client using shared contract types.
  - Centralize credentials, CSRF headers, JSON parsing, error mapping, cancellation, and request IDs.
  - Do not add ad hoc `fetch` calls in feature components.
- **Acceptance:** client distinguishes authentication, authorization, validation, conflict, and server errors.
- **Validate:** API client unit tests.

## P4-003 — Add authorized academic structure endpoints

- [x] **Dependencies:** P4-001, P3-007
- **Change:**
  - Add read endpoints for organizations available to the user, academic years, classes, grades, and subjects.
  - Scope every query through membership.
- **Acceptance:** users cannot enumerate another organization through IDs or filters.
- **Validate:** API integration and cross-organization denial tests.

## P4-004 — Add authorized student listing endpoints

- [x] **Dependencies:** P4-003
- **Change:**
  - Add student list/detail contracts and endpoints.
  - Return only fields required by the calling view.
  - Enforce class, grade, and assigned-student scope from the permission matrix.
- **Acceptance:** guardian/special-education fields are not included in general list responses unless required and authorized.
- **Validate:** field-shape and record-scope tests for each role.

## P4-005 — Add attendance read endpoint

- [x] **Dependencies:** P2-005, P4-004
- **Change:**
  - Add an endpoint for attendance by authorized class and school date.
  - Return students plus existing status in a form suitable for the current attendance UI.
  - Validate school date and class ownership.
- **Acceptance:** unauthorized class access returns a non-enumerating denial response.
- **Validate:** happy path, empty date, invalid date, unauthorized class, and cross-organization tests.

## P4-006 — Add transactional attendance write endpoint

- [x] **Dependencies:** P4-005
- **Change:**
  - Add a bulk upsert command for one class/date.
  - Set recorder identity from the session, never from the request body.
  - Validate that each student belongs to the class context.
  - Write audit events in the same transaction.
  - Define conflict behavior for concurrent edits.
- **Acceptance:** request either succeeds atomically or makes no changes; duplicate students and out-of-class students are rejected.
- **Validate:** transaction rollback, duplicate, authorization, actor spoofing, and concurrency tests.

## P4-007 — Migrate the attendance UI to the API

- [x] **Dependencies:** P4-002, P4-005, P4-006
- **Change:**
  - Replace attendance `storageService` reads/writes with API queries and mutations.
  - Add loading, empty, retry, validation, conflict, and save-success states.
  - Use the authenticated user returned by the session endpoint.
- **Acceptance:** attendance updates are visible in a second browser session after refresh.
- **Validate:** component tests plus manual two-session verification.

## P4-008 — Add attendance E2E tests

- [x] **Dependencies:** P4-007
- **Change:**
  - Add Playwright infrastructure.
  - Test authorized attendance entry, persistence, validation error, forbidden class, and logout.
- **Acceptance:** tests run against the Compose-backed API/database, not mocked `localStorage`.
- **Validate:** Playwright attendance project and full build.

## P4-009 — Remove attendance browser persistence

- [x] **Dependencies:** P4-008
- **Change:**
  - Delete attendance keys and methods from `storageService`.
  - Remove attendance seed initialization from browser startup.
  - Retain only server seed data for attendance demos/tests.
- **Acceptance:** searching the production web source finds no attendance `localStorage` path.
- **Validate:** grep, unit tests, E2E tests, type check, and production build.
- **Note (2026-08-24):** Completed Milestone 4 with documented `/api/v1` conventions and generated OpenAPI, shared runtime contracts, a typed web API client, membership-scoped academic and minimal student endpoints, canonical PostgreSQL attendance statuses, strict class/date roster reads, atomic audited bulk upserts, serializable optimistic concurrency, API-backed attendance loading/editing/conflict states, and removal of all production attendance browser persistence.
- **Validated with:** OpenAPI drift validation; formatting, linting, root/workspace type checking, unit tests, and production builds; PostgreSQL 16 migration deployment and all 15 API integration tests; attendance-specific production-source grep; and the Compose-backed Playwright attendance project covering validation, save, refresh and second-session persistence, forbidden class denial, and logout.

---

# Milestone 5 — Migrate remaining product domains

**Target releases:** `0.3.0` through `0.8.0`

Each task below is a vertical slice. For every slice, implement contracts, Prisma repositories, API routes, authorization, audit events, web loading/error behavior, integration tests, and E2E coverage before removing the corresponding `storageService` methods.

## P5-001 — Migrate users, students, and staff assignments

- [ ] **Dependencies:** P4-009
- **Change:** migrate user administration, student details, GPK assignment, and authorized student lists.
- **Special rules:** enforce the configured GPK assignment limit transactionally; do not expose guardian contacts broadly.
- **Acceptance:** all student and assignment mutations are server-authorized and audited.
- **Validate:** role/scope matrix tests and assignment concurrency tests.

## P5-002 — Migrate Learning Journey reads and editing

- [ ] **Dependencies:** P5-001, P2-006
- **Change:** migrate calendar, tracker, editor, projects, goals, ownership, and filters.
- **Acceptance:** authors can edit only permitted drafts; concurrent updates return an explicit conflict rather than silently overwriting.
- **Validate:** repository/API/component/E2E tests.

## P5-003 — Migrate Learning Journey workflow transitions

- [ ] **Dependencies:** P5-002
- **Change:** implement submit, principal review, return, director approval, and immutable workflow events as explicit API commands.
- **Acceptance:** invalid source-state transitions and actor spoofing are rejected transactionally.
- **Validate:** complete transition table tests for every role and source state.

## P5-004 — Migrate observation definitions and assignments

- [ ] **Dependencies:** P5-001, P2-007
- **Change:** migrate form definitions, definition versioning, coordinator assignment, due dates, priorities, and assignment deletion/cancellation policy.
- **Acceptance:** completed records retain their original definition version; only authorized coordinators manage assignments.
- **Validate:** authorization and version-retention tests.

## P5-005 — Migrate FEDC observations

- [ ] **Dependencies:** P5-004
- **Change:** migrate creation, draft saving, completion, scoring, history, and reference drawer data.
- **Acceptance:** server recalculates trusted scores from validated responses instead of accepting client totals.
- **Validate:** scoring fixtures, malformed response tests, authorization tests, and E2E flow.

## P5-006 — Migrate Sensory Profile observations

- [ ] **Dependencies:** P5-004
- **Change:** migrate responses, section scoring, completion, history, and reporting.
- **Acceptance:** server validates rating range and recalculates all totals.
- **Validate:** scoring boundary and authorization tests plus E2E flow.

## P5-007 — Migrate SFA observations

- [ ] **Dependencies:** P5-004
- **Change:** migrate respondents, participation, task supports, activity performance, adaptations, completion, and history.
- **Acceptance:** server validates all rating ranges and required completed-record fields.
- **Validate:** validation, authorization, and E2E tests.

## P5-008 — Migrate IEP plans

- [ ] **Dependencies:** P5-001, P2-008
- **Change:** migrate team members, performance areas, accommodations, goals, services, parent approval metadata, and IEP lifecycle.
- **Acceptance:** sensitive IEP access is limited to documented roles and assigned students; historical IEPs remain immutable or explicitly versioned according to policy.
- **Validate:** role/scope tests, lifecycle tests, and E2E authoring flow.

## P5-009 — Migrate IEP workflow transitions

- [ ] **Dependencies:** P5-008
- **Change:** implement draft submission, coordinator review/return, director approval/return, archival, and immutable events as API commands.
- **Acceptance:** the API is the only authority allowed to change workflow state or approver identity.
- **Validate:** transition table, actor spoofing, stale-version, and audit tests.

## P5-010 — Migrate weekly IEP reports

- [ ] **Dependencies:** P5-008
- **Change:** migrate weekly report creation, goal progress, observations, home connection, and report workflow.
- **Acceptance:** each progress item references a goal belonging to the report's IEP.
- **Validate:** referential integrity, duplicate week, role/scope, and E2E tests.

## P5-011 — Replace IEP goal synchronization with transactional projections

- [ ] **Dependencies:** P5-010
- **Change:**
  - Treat weekly goal progress and achievement records as source events.
  - Recalculate goal summary fields in an idempotent transaction.
  - Support corrections/reopened reports without double counting.
  - Never select the first IEP for a student implicitly.
- **Acceptance:** repeated projection runs produce identical results; changing a weekly report correctly updates derived summaries and preserves audit history.
- **Validate:** idempotency, correction, retry, concurrent update, historical IEP, and achievement provenance tests.

## P5-012 — Migrate dashboards, reports, search, and notifications

- [ ] **Dependencies:** P5-003, P5-005, P5-006, P5-007, P5-011
- **Change:** replace derived `storageService` reads and hard-coded notifications with authorized API queries.
- **Acceptance:** aggregate responses include only records the current user may access; no client-side filtering is used as a security boundary.
- **Validate:** aggregate authorization tests, query performance tests, and UI tests.

## P5-013 — Remove sensitive browser persistence

- [ ] **Dependencies:** P5-012
- **Change:**
  - Delete `storageService.ts` or reduce it to non-sensitive UI preferences.
  - Remove automatic seed initialization from web startup.
  - Remove the browser reset-data control from production.
  - Remove obsolete domain types replaced by shared API contracts.
- **Acceptance:** no student, attendance, observation, IEP, workflow, or user identity record is stored in `localStorage` or `sessionStorage`.
- **Validate:** source search, browser storage inspection, full tests, and production build.

---

# Milestone 6 — Prototype data import and controlled rollout

**Target release:** `0.9.0-beta.1`

**Milestone exit gate:** any approved prototype data can be imported through a validated, versioned, auditable, and rehearsed process with rollback.

## P6-001 — Define a versioned export format

- [ ] **Dependencies:** P5-013
- **Change:** add schemas for `learnspace-export` format version 1, including export timestamp, source version, organization mapping, and typed record collections.
- **Acceptance:** unsupported versions and invalid references fail with actionable errors.
- **Validate:** valid, malformed, oversized, and unsupported-version fixture tests.

## P6-002 — Add a development-only browser export tool

- [ ] **Dependencies:** P6-001
- **Change:** add a one-time tool that reads legacy storage keys and downloads a validated export without transmitting it.
- **Acceptance:** tool is excluded from normal production UI and clearly labels sensitive output.
- **Validate:** export fixtures from current seed data and malformed localStorage cases.

## P6-003 — Add an administrative import CLI

- [ ] **Dependencies:** P6-001
- **Change:** implement dry-run and apply modes; validate IDs, references, dates, enums, duplicates, organization ownership, and user mappings.
- **Acceptance:** invalid imports make no database changes; output reports accepted, transformed, skipped, and rejected counts.
- **Validate:** dry run, successful apply, repeated apply, partial-invalid, and rollback tests.

## P6-004 — Rehearse staging migration and rollback

- [ ] **Dependencies:** P6-002, P6-003, P2-012
- **Change:** document and execute freeze, backup, dry run, import, reconciliation, application verification, and rollback.
- **Acceptance:** record counts and representative workflows reconcile; rollback restores the pre-import state.
- **Validate:** attach a sanitized rehearsal report to `docs/operations/`.

---

# Milestone 7 — Production hardening

**Target release:** `1.0.0-rc.1`

**Milestone exit gate:** security review findings are resolved or accepted by accountable owners; monitoring and restore procedures meet documented objectives; critical workflows pass accessibility and E2E checks.

## P7-001 — Add security headers, CORS, and rate limits

- [ ] **Dependencies:** P5-013
- **Change:** add restrictive CSP, frame protection, content-type protection, referrer policy, production CORS rules, authentication rate limits, and API request limits.
- **Acceptance:** Google OAuth and the app work under the policy without broad wildcards.
- **Validate:** header tests, CORS tests, rate-limit tests, and browser smoke tests.

## P7-002 — Remove third-party asset privacy leaks

- [ ] **Dependencies:** P7-001
- **Change:** self-host required fonts and application images or document approved external providers; replace seeded remote avatar dependencies.
- **Acceptance:** normal application use does not disclose student/user page visits to unapproved asset hosts.
- **Validate:** browser network test and CSP report inspection.

## P7-003 — Add secret, dependency, source, and container scanning

- [ ] **Dependencies:** P0-005, P1-010
- **Change:** add CI jobs for secret scanning, dependency review/audit, SAST, and container image scanning.
- **Acceptance:** critical findings fail CI with documented exception handling.
- **Validate:** workflow execution and a safe synthetic failure test where practical.

## P7-004 — Generate SBOMs and sign release images

- [ ] **Dependencies:** P7-003
- **Change:** generate SBOM and provenance for web/API images; add image signing and verification documentation.
- **Acceptance:** an operator can verify image digest, signature, and included packages before deployment.
- **Validate:** local or CI verification of one candidate image.

## P7-005 — Add observability

- [ ] **Dependencies:** P5-012
- **Change:** add metrics for latency, status codes, DB pool usage, login failures, authorization denials, and background jobs; add trace/request correlation.
- **Acceptance:** logs and metrics redact secrets and sensitive record contents.
- **Validate:** telemetry integration tests and manual dashboard/query verification.

## P7-006 — Add alerting and operational runbooks

- [ ] **Dependencies:** P7-005
- **Change:** add runbooks for API unavailable, database unavailable, migration failure, elevated login failures, disk pressure, backup failure, and OAuth outage.
- **Acceptance:** every alert contains an owner, severity, symptoms, diagnosis, mitigation, and escalation path.
- **Validate:** tabletop exercise for at least database outage and OAuth outage.

## P7-007 — Automate encrypted backups and restore verification

- [ ] **Dependencies:** P2-012
- **Change:** add operator-configurable scheduled backups, retention, encryption, failure reporting, and periodic restore verification.
- **Acceptance:** documented RPO/RTO are measured in a restore drill.
- **Owner input required:** target RPO, RTO, backup location, retention, and encryption-key ownership.
- **Validate:** timed restore drill with fake data.

## P7-008 — Complete authorization and privacy threat model

- [ ] **Dependencies:** P5-013, P7-001
- **Change:** threat-model OAuth, sessions, organization isolation, student/IEP access, approvals, exports, admin functions, backups, and logs.
- **Acceptance:** each threat has mitigation, test, owner, or explicit risk acceptance.
- **Validate:** security review against implemented controls and automated tests.

## P7-009 — Complete accessibility review

- [ ] **Dependencies:** P5-012
- **Change:** add automated accessibility checks and manually review keyboard navigation, focus management, labels, contrast, errors, dialogs, tables, and responsive behavior.
- **Acceptance:** no known critical WCAG 2.2 AA blockers in core workflows.
- **Validate:** automated audit plus documented manual checks for login, attendance, Learning Journey, observation, IEP, and weekly report flows.

## P7-010 — Add performance and database query budgets

- [ ] **Dependencies:** P5-012
- **Change:** define bundle, API latency, query count, and large-list targets; add pagination and indexes where measurements require them.
- **Acceptance:** no known N+1 query in core list/detail flows; representative data volumes meet documented targets.
- **Validate:** production build analysis, API load test, and PostgreSQL query-plan review.

## P7-011 — Run full release-candidate test matrix

- [ ] **Dependencies:** P7-002, P7-004, P7-006, P7-007, P7-008, P7-009, P7-010
- **Change:** test clean install, upgrade from previous release, migration, backup/restore, OAuth, every role, core E2E workflows, and container restart behavior.
- **Acceptance:** no unresolved release-blocking failures; exceptions are documented with owners.
- **Validate:** publish a sanitized RC validation report in `docs/releases/`.

---

# Milestone 8 — Stable self-hosted release

**Target release:** `1.0.0`

## P8-001 — Finalize operator documentation

- [ ] **Dependencies:** P7-011
- **Change:** add installation, configuration reference, reverse proxy/TLS, OAuth, upgrade, rollback, migration, backup, restore, monitoring, and troubleshooting guides.
- **Acceptance:** a new operator can deploy from a clean host using only published documentation and versioned images.
- **Validate:** clean-host documentation rehearsal.

## P8-002 — Add automated versioned image publishing

- [ ] **Dependencies:** P7-004, P8-001
- **Change:** publish web/API images once per release with exact SemVer, major/minor channels, Git SHA, digest, signature, SBOM, and provenance.
- **Acceptance:** staging and production can promote the same immutable digest.
- **Validate:** pull and verify images on a clean host.

## P8-003 — Add clean-install and upgrade CI

- [ ] **Dependencies:** P8-002
- **Change:** test a new installation and an upgrade from the latest supported previous release using PostgreSQL backups and Prisma migrations.
- **Acceptance:** CI catches missing environment variables, migration incompatibility, and image mismatch.
- **Validate:** release pipeline execution.

## P8-004 — Complete release metadata

- [ ] **Dependencies:** P8-003
- **Change:** set version `1.0.0`, update `CHANGELOG.md`, publish known issues, compatibility matrix, support window, checksums/digests, and migration notes.
- **Acceptance:** release notes state configuration changes, database behavior, rollback constraints, and security impact.
- **Validate:** follow `docs/VERSIONING.md` release checklist.

## P8-005 — Production-readiness approval

- [ ] **Dependencies:** P8-004
- **Change:** obtain accountable owner approval for security findings, privacy/data governance, backup objectives, incident response, support ownership, and deployment jurisdiction requirements.
- **Acceptance:** all production-readiness criteria below are evidenced, not assumed.
- **Validate:** signed-off release checklist or equivalent organizational record.

---

# Post-1.0 prioritized backlog

These tasks are not prerequisites for `1.0.0`. Promote them into numbered milestones only after validating demand and assigning product/security owners.

## Product backlog

- [ ] **FUT-PROD-001:** configurable school terminology, calendars, grades, and classes.
- [ ] **FUT-PROD-002:** user invitations and delegated organization administration.
- [ ] **FUT-PROD-003:** SIS import/synchronization with reconciliation and audit logs.
- [ ] **FUT-PROD-004:** parent/guardian portal with a separately threat-modeled permission model.
- [ ] **FUT-PROD-005:** document attachments using object storage, malware scanning, signed URLs, retention, and access logs.
- [ ] **FUT-PROD-006:** PDF exports with authorization checks, watermarking, and export audit events.
- [ ] **FUT-PROD-007:** configurable in-app/email notifications and digest preferences.
- [ ] **FUT-PROD-008:** English and Bahasa Indonesia localization.
- [ ] **FUT-PROD-009:** configurable observation instruments with immutable definition versions.
- [ ] **FUT-PROD-010:** longitudinal and anonymized aggregate analytics with privacy review.

## Platform backlog

- [ ] **FUT-PLAT-001:** evaluate PostgreSQL row-level security as defense in depth.
- [ ] **FUT-PLAT-002:** add a background worker for exports, imports, reports, and notifications.
- [ ] **FUT-PLAT-003:** add S3-compatible object storage for approved file workflows.
- [ ] **FUT-PLAT-004:** add Redis only when measured session, queue, or rate-limit requirements justify it.
- [ ] **FUT-PLAT-005:** add OpenTelemetry-compatible traces and standardized dashboards.
- [ ] **FUT-PLAT-006:** add Kubernetes/Helm deployment only when operator demand justifies its complexity.

## Optional responsible AI backlog

No active Gemini integration currently exists. AI features must remain optional and server-side.

- [ ] **FUT-AI-001:** create an AI data-flow/privacy ADR before adding an AI dependency.
- [ ] **FUT-AI-002:** add administrator opt-in, user disclosure, and a fully functional non-AI path.
- [ ] **FUT-AI-003:** minimize/redact student data and document vendor retention/training behavior.
- [ ] **FUT-AI-004:** require human review and provenance for generated content.
- [ ] **FUT-AI-005:** prohibit AI from approving IEPs or making educational/clinical decisions.
- [ ] **FUT-AI-006:** add prompt/output security tests, rate limits, cost budgets, and audit events.

---

# Production-ready definition

Do not describe Learnspace as production-ready until every statement below is true:

- [ ] Identity is verified through Google OAuth/OIDC and sessions are revocable.
- [ ] Authorization is enforced server-side at role, organization, and record level.
- [ ] PostgreSQL is authoritative and all production schema changes use tested Prisma migrations.
- [ ] Sensitive records are not stored in browser persistence.
- [ ] Workflow transitions are transactional, actor-attributed, and audited.
- [ ] Critical workflows have unit, integration, authorization, and E2E tests.
- [ ] Docker deployment uses immutable, versioned, non-root images.
- [ ] Required configuration and weak secrets fail safely before startup.
- [ ] Backups are encrypted, monitored, retained, and successfully restored in drills.
- [ ] Logs, metrics, alerts, and runbooks support incident diagnosis without leaking sensitive data.
- [ ] Upgrade and rollback procedures are tested from the previous supported release.
- [ ] Accessibility and supported-browser targets are documented and validated.
- [ ] Security, privacy, retention, incident response, and support responsibilities have accountable owners.
- [ ] No demo or development mechanism can bypass production controls.
