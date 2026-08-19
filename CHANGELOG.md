# Changelog

All notable changes to Learnspace will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows the versioning policy in [`docs/VERSIONING.md`](docs/VERSIONING.md).

## [Unreleased]

### Added

- Reproducible Node.js and npm toolchain metadata with a committed dependency lockfile.
- Independent Prettier formatting, ESLint, TypeScript checking, Vitest smoke testing, and production-build commands.
- GitHub Actions validation for formatting, linting, type checking, tests, and builds.
- Contributor guidance, private vulnerability-reporting policy, and a pull-request checklist.
- Production-oriented project README with current-state and target-architecture documentation.
- Versioning, release, API, configuration, and Prisma migration policy.
- Phased roadmap for Docker self-hosting, PostgreSQL/Prisma persistence, Google OAuth, server-side authorization, testing, migration, and operational hardening.
- npm workspace layout with `apps/web`, `apps/api`, and `packages/contracts` at version `0.1.0-alpha.1`.
- Shared Zod contracts for API health, version, and error responses.
- Express API foundation with liveness, PostgreSQL readiness, version reporting, structured request logging, request IDs, runtime configuration validation, safe error envelopes, and graceful shutdown.
- PostgreSQL 16, API, and web services in Docker Compose, plus an optional development override for host database access.
- Multi-stage, non-root API and web images with container health checks, SPA fallback, cache policy, and same-origin API proxying.

### Changed

- Formatted the existing prototype source and fixed conditional React Hook execution in the observation workspace.
- Documented the retained Google AI Studio metadata and active Express API tooling.
- Updated project documentation for the implemented Milestone 1 workspace, commands, endpoints, environment contract, Compose workflow, required production secrets, and remaining prototype/data-security limitations.
- Runtime-validated the complete Compose stack: healthy web/API/PostgreSQL services, same-origin API proxying, liveness and readiness responses, cache headers, SPA fallback, non-root application users, persistent PostgreSQL storage, database-dependent unhealthy/recovery behavior, and graceful API shutdown.
- Hardened API failure behavior with safe `413 PAYLOAD_TOO_LARGE` responses and two-second PostgreSQL connection, query, and statement timeouts for bounded readiness checks.

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
