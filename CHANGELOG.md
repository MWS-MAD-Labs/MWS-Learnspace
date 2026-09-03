# Changelog

All notable changes to Learnspace will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows the versioning policy in [`docs/VERSIONING.md`](docs/VERSIONING.md).

## [Unreleased]

### Added

- Reproducible Node.js and npm toolchain metadata with a committed dependency lockfile.
- Independent Prettier formatting, ESLint, TypeScript checking, Vitest smoke testing, and production-build commands.
- GitHub Actions validation for formatting, linting, root/workspace type checking, tests, application builds, and API runtime/migration Docker targets.
- Contributor guidance, private vulnerability-reporting policy, and a pull-request checklist.
- Production-oriented project README with current-state and target-architecture documentation.
- Versioning, release, API, configuration, and Prisma migration policy.
- Phased roadmap for Docker self-hosting, PostgreSQL/Prisma persistence, Google OAuth, server-side authorization, testing, migration, and operational hardening.
- npm workspace layout with `apps/web`, `apps/api`, and `packages/contracts` at version `0.1.0-alpha.1`.
- Shared Zod contracts for API health, version, and error responses.
- Express API foundation with liveness, PostgreSQL readiness, version reporting, structured request logging, request IDs, runtime configuration validation, safe error envelopes, and graceful shutdown.
- PostgreSQL 16, API, and web services in Docker Compose, plus an optional development override for host database access.
- Multi-stage, non-root API and web images with container health checks, SPA fallback, cache policy, and same-origin API proxying.
- Canonical domain-model documentation for organization ownership, enums, JSON boundaries, and Learning Journey, IEP, and Weekly Report transitions.
- Prisma schema, generated initial migration, one-shot Compose migration job, schema-compatible readiness checks, PostgreSQL integration tests, and guarded idempotent development seed data.
- Organization-scoped authentication, academic, student, attendance, Learning Journey, observation, IEP, weekly report, workflow, goal-achievement, and immutable audit models.
- Compose PostgreSQL backup/guarded restore scripts, operational runbook, and a recorded synthetic-data restore drill.
- Google OpenID Connect authorization-code flow with state, nonce, PKCE, signed ID-token verification, one-time callback transactions, explicit admission modes, and OAuth identity linking.
- Opaque PostgreSQL-backed sessions with hashed tokens, expiration, last-seen tracking, revocation, cleanup, secure cookie policy, logout, current-session endpoint, and double-submit CSRF protection.
- Canonical server permission matrix, organization-scoped repository helpers, audited deny-by-default authorization guards, and a distinct Special Education Coordinator role.
- Authenticated web loading, login, denied, disabled, active-session, and logout states; production builds no longer expose prototype impersonation controls.
- Documented `/api/v1` resource, date, response, error, command, idempotency, and concurrency conventions with a generated and drift-validated OpenAPI 3.1 specification.
- Shared academic, minimal student, and canonical attendance runtime contracts plus a typed browser API client with credentials, CSRF, cancellation, request IDs, runtime parsing, and categorized errors.
- Membership-scoped organization, academic year, unit, grade, class, subject, student list/detail, and class/date attendance endpoints with non-enumerating cross-scope denials.
- Atomic class/date attendance bulk upserts with server-derived recorder identity, same-transaction audit events, strict enrollment validation, and serializable optimistic concurrency.
- Disposable Compose-backed Playwright attendance testing with deterministic test-only real sessions, PostgreSQL fixtures, validation, persistence, forbidden-scope, and logout coverage.
- Strict shared contracts and generated OpenAPI operations for organization staff directories, rich authorized student reads, privileged student creation/updates, and GPK assignment lifecycle commands.
- Transactional GPK assignment capacity enforcement with PostgreSQL row locking, atomic reassignment/end behavior, session-derived actors, audit events, and concurrency integration tests.
- Director-only organization account APIs and a People & access workspace for transactional, audited user/membership creation and updates, role-aware unit/grade/subject scopes, self-lockout protection, and safe multi-organization identity handling.
- Dedicated Compose-backed P5 administration E2E coverage for account creation, editing, refresh persistence, and server-enforced principal denial.
- API-backed web student/staff loading with initial loading and retry states, non-blocking refresh failure feedback, and contract-validated GPK assignment mutations.
- Versioned and bounded `learnspace-export` v1 contracts with duplicate and cross-record reference validation.
- Explicitly gated development-only browser exporter that validates raw legacy storage and downloads sensitive migration artifacts without transmitting them.
- Fail-closed administrative import CLI with approved target manifests, serializable dry-run/apply transactions, deterministic legacy ID mapping, idempotent source-key ledger, safe aggregate auditing, and a documented local Docker backup/import/rollback rehearsal.
- API-backed Learning Journey collection/detail reads and draft creation/updates with strict nested contracts, organization and role scopes, active membership owners, transactional projects/goals/connections, audit events, integer optimistic concurrency, stale-version UI recovery, canonical server filters, and dedicated Compose Playwright coverage.
- Explicit versioned Learning Journey submit, Principal review/return, and Director approval/return commands with session-derived actors, creator/owner submission authorization, conditional state/version updates, immutable workflow history and return feedback, same-transaction audit events, stale/simultaneous-command protection, and PostgreSQL transition-table coverage.
- Dedicated persistent local PostgreSQL integration-test Compose service and `npm run test:integration:local` migration/test command.
- Assignment-bound Sensory Profile APIs and web workflows with strict pinned-definition contracts, server-validated `0`–`5` ratings, trusted section/total scoring, transactional completion and audits, API-backed history/reference/reporting, and dedicated PostgreSQL and Compose-backed browser coverage.
- Strict IEP aggregate contracts and organization-scoped list/detail/create/update APIs for team members, performance areas, accommodations, goals, services, parent approval metadata, and plan dates, with session-derived actors, transactional audits, draft-only mutation, integer optimistic concurrency, assigned-student scope, PostgreSQL historical-content immutability, generated OpenAPI operations, and dedicated contract, integration, component, service, and Compose-backed authoring coverage.
- Production-hardening HTTP controls with restrictive browser/API security headers, exact-origin credentialed CORS, explicit trusted proxies, configurable API/authentication rate limits, and query-string-safe request logging.
- First-party-only application assets with local system fonts, accessible initials avatars, safe first-party avatar paths, and removal of Google/Unsplash profile-image requests.
- Dedicated secret, dependency, CodeQL, and container scanning workflows plus Dependabot configuration and documented time-bounded scanner exceptions.
- Release-candidate image workflow for immutable GHCR digests, vulnerability scans, SPDX SBOMs, provenance attestations, keyless Cosign signatures, verification, and checksummed evidence.
- Privacy-safe Prometheus telemetry for HTTP latency/status, login failures, authorization/CSRF/CORS denials, authentication cleanup, readiness, and PostgreSQL connection utilization, with trace correlation and recursive log redaction.
- Alert catalogs and incident runbooks, encrypted backup/restore-verification wrappers, authorization/privacy threat and risk documentation, accessibility automation/review templates, performance budgets, and release-candidate validation tooling.

### Changed

- Migrated the Learning Journey calendar, tracker, editor, dashboard, curriculum-report reads, and submit/review/approval workflow away from browser persistence; returned-review comments and reviewer attribution now remain visible after refresh.
- Formatted the existing prototype source and fixed conditional React Hook execution in the observation workspace.
- Documented the retained Google AI Studio metadata and active Express API tooling.
- Updated project documentation for the implemented Milestone 1 workspace, commands, endpoints, environment contract, Compose workflow, required production secrets, and remaining prototype/data-security limitations.
- Runtime-validated the complete Compose stack: healthy web/API/PostgreSQL services, same-origin API proxying, liveness and readiness responses, cache headers, SPA fallback, non-root application users, persistent PostgreSQL storage, database-dependent unhealthy/recovery behavior, and graceful API shutdown.
- Hardened API failure behavior with safe `413 PAYLOAD_TOO_LARGE` responses and two-second PostgreSQL connection, query, and statement timeouts for bounded readiness checks.
- Replaced the direct `pg` readiness pool with a singleton Prisma client that verifies the required committed migration before reporting ready and enforces PostgreSQL-side readiness query/lock timeouts.
- Required SHA-256 sidecars for every database restore, failing before Docker access when integrity metadata is absent; backup archives and checksums are now published as a failure-safe pair only after verification and checksum generation succeed, with distinct infrastructure and missing-database errors.
- Hardened tenant integrity with database triggers covering organization-owned relations and immutable tenant ownership; tenant actor references now require an active user and active organization membership when assigned, while unchanged historical attribution remains update-safe after an actor leaves. Membership user identity and audit actor attribution are immutable; audit actor deletion is restricted. Added composite IEP lineage for goal-achievement events, strict audit metadata schemas, and database immutability for completed observations and used definitions.
- Replaced browser-selected startup identity with the API current-session response; the prototype role switcher has now been removed entirely.
- Migrated the attendance workspace from browser seed/storage data to authorized API class rosters and PostgreSQL records, including loading, empty, retry, validation, read-only, conflict, and save-success states.
- Migrated user identity, membership, student directory, and GPK assignment administration away from browser storage and removed the obsolete development fake-data path.
- Migrated Sensory Profile authoring, completion, history, detailed reporting, and reference data away from browser persistence; completed records now retain their exact server-pinned definition and authoritative scores.
- Migrated IEP plan authoring and plan-backed dashboard, analytics, status, and weekly-report reads away from browser persistence; leadership readers are read-only, assigned special-education authors are server-scoped, and explicit workflow transitions remain deferred to P5-009.
- Replaced weekly-report-to-IEP mutation with transactionally recalculated goal projections from weekly progress and append-only achievement events, including correction-safe provenance, per-goal concurrency locking, historical-plan targeting, migration backfill, timestamp-preserving importer parity, explicit client-side IEP selection, bounded list summaries, and detail-only addressed/achievement history hydration.
- Restricted broad student responses from exposing addresses or guardian contacts, and limited sensitive student detail to documented leadership and Special Education Coordinator scope.
- Updated the application and workspace package version to `0.2.0`, the first end-to-end feature migration release.

### Fixed

- Attendance saves now promote newly persisted draft rows into the local server snapshot immediately, clearing stale unsaved counts and draft-default labels while safely defaulting any missing draft entry.
- Student enrollment updates now reject conflicting same-day class starts instead of leaving ambiguous simultaneous active enrollments.
- GPK assignment routes now validate UUID path parameters before Prisma or raw PostgreSQL queries.
- Organization account save failures now render as accessible error feedback, scope-only membership updates advance `updatedAt`, account audit metadata records only submitted fields, and cross-organization users cannot have global identity fields changed by a single-organization administrator.
- Remediated critical container scan findings by upgrading the nginx runtime to Alpine 3.24, removing bundled npm/npx from API and migration images, invoking Prisma directly with Node, and excluding unnecessary Vite/esbuild tooling from API-oriented final stages.

### Removed

- Unused direct Google GenAI, dotenv, and esbuild dependencies from the prototype manifest.
- Attendance keys, methods, seed initialization, legacy browser attendance types, and all production attendance `localStorage` paths.
- The final Learning Journey `storageService.updateWorkflowStage()` browser-persistence path.
- Production IEP plan `localStorage` initialization, CRUD, workflow mutation, and weekly-report-to-plan synchronization methods.
- The final browser-backed `storageService`, sensitive web seed fixtures, automatic startup seeding, fake-data role switcher, reset-data control, seed-backed observation repository, and obsolete browser-only domain types.

## [0.0.0] - Prototype

### Added

- React/Vite educator portal prototype.
- Attendance workflows.
- Learning Journey calendar, editing, review, and approval experiences.
- FEDC, Sensory Profile, and SFA observation experiences.
- IEP planning and weekly goal-progress reporting.
- Seeded demonstration users, students, plans, observations, and reports.
- Browser-local persistence and development role simulation.

[Unreleased]: https://github.com/faisalnh/MWS-Learnspace/compare/main...HEAD
[0.0.0]: https://github.com/faisalnh/MWS-Learnspace/commits/main
