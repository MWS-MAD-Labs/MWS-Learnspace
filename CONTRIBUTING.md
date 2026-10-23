# Contributing to Learnspace

## Prerequisites

- Bun `1.3` or newer
- Docker with the Compose plugin for database, integration, and E2E workflows

Install the committed workspace dependencies:

```bash
bun install --frozen-lockfile
```

Use `bun install --frozen-lockfile` for reproducible installs. Start the web application with `bun run dev` and open <http://localhost:3000>.

The API development script loads the repository root `.env`, so either `bun run dev:api` from the repository root or `bun run dev` from `apps/api` starts the same local configuration.

The migration to Bun and Hono intentionally does not replace the test or data layers. Vitest remains the unit, component, and API test runner; Playwright remains the browser E2E runner; and Prisma 6 remains the ORM and migration tool. Prisma 7 and TanStack Query are separate future work and must not be bundled into unrelated contributions.

## Branches and changes

1. Create a focused branch from `main`.
2. Keep changes scoped and avoid including real student data or secrets.
3. Add or update tests and documentation for behavior or configuration changes.
4. Use Conventional Commit-style commit messages described in [`docs/VERSIONING.md`](docs/VERSIONING.md).

## Required validation

Run all checks before opening a pull request:

```bash
bun run format:check
bun run lint
bun run lint:anti-slop
bun run typecheck
bun run test
bun run build
```

`bun run lint` runs Oxlint's correctness checks with its native React and Vitest plugins. `bun run lint:anti-slop` is a separate repository-specific policy pass. Oxlint is not the type gate: `bun run typecheck` must pass the TypeScript 7 `tsc` checks for the root and workspaces.

Use `bun run format` to apply repository formatting.

## Pull requests

Complete the pull-request template, including the security, data migration, test, documentation, and environment-impact checks. Explain remaining risks and provide migration and rollback steps when stored data or schemas change.

Security vulnerabilities must not be reported in public issues. Follow [`SECURITY.md`](SECURITY.md).
