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

### Changed

- Formatted the existing prototype source and fixed conditional React Hook execution in the observation workspace.
- Documented the retained Google AI Studio metadata and active Express API tooling.
- Updated project documentation for the implemented Milestone 1 workspace, commands, endpoints, environment contract, Compose workflow, required production secrets, and remaining prototype/data-security limitations.
- Runtime-validated the complete Compose stack: healthy web/API/PostgreSQL services, same-origin API proxying, liveness and readiness responses, cache headers, SPA fallback, non-root application users, persistent PostgreSQL storage, database-dependent unhealthy/recovery behavior, and graceful API shutdown.
- Hardened API failure behavior with safe `413 PAYLOAD_TOO_LARGE` responses and two-second PostgreSQL connection, query, and statement timeouts for bounded readiness checks.
- Replaced the direct `pg` readiness pool with a singleton Prisma client that verifies the required committed migration before reporting ready and enforces PostgreSQL-side readiness query/lock timeouts.
- Required SHA-256 sidecars for every database restore, failing before Docker access when integrity metadata is absent; backup archives and checksums are now published as a failure-safe pair only after verification and checksum generation succeed, with distinct infrastructure and missing-database errors.
- Hardened tenant integrity with database triggers covering organization-owned relations and immutable tenant ownership; tenant actor references now require an active user and active organization membership when assigned, while unchanged historical attribution remains update-safe after an actor leaves. Membership user identity and audit actor attribution are immutable; audit actor deletion is restricted. Added composite IEP lineage for goal-achievement events, strict audit metadata schemas, and database immutability for completed observations and used definitions.
- Replaced browser-selected startup identity with the API current-session response. The fake-data role switcher now requires both explicit development-only build flags and cannot change server identity.

### Removed

- Unused direct Google GenAI, dotenv, and esbuild dependencies from the prototype manifest.

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
