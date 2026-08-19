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

### Changed

- Formatted the existing prototype source and fixed conditional React Hook execution in the observation workspace.
- Documented the retained Google AI Studio metadata and upcoming Express API tooling.

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
