# Versioning and release policy

This document defines how Learnspace versions application releases, APIs, database migrations, and deployable images.

## Current maturity

Learnspace is currently a frontend prototype with package version `0.0.0`. Until authentication, server-side authorization, database persistence, tests, and deployment controls are complete, releases should be considered pre-production.

Recommended first milestones:

| Version         | Meaning                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `0.1.0`         | Production foundation: API skeleton, Prisma schema, PostgreSQL, Google OAuth, and local Docker Compose  |
| `0.2.0`         | First end-to-end feature migrated from `localStorage` to the API                                        |
| `0.3.0`–`0.9.x` | Incremental feature migrations, operational hardening, and release candidates                           |
| `1.0.0`         | Stable self-hosted release with supported upgrade/backup procedures and no required browser persistence |

## Semantic Versioning

Learnspace follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **MAJOR:** incompatible public API, configuration, deployment, or persisted-data behavior requiring operator action beyond the documented normal upgrade flow.
- **MINOR:** backward-compatible functionality, schema additions, new modules, or opt-in configuration.
- **PATCH:** backward-compatible bug, security, documentation, or operational fixes.

During `0.x`, breaking changes may occur in minor releases, but they must still be documented with migration steps. Patch releases must remain backward-compatible within their minor line.

## Release identifiers

Pre-releases use SemVer suffixes:

```text
0.3.0-alpha.1
0.3.0-beta.1
1.0.0-rc.1
```

- `alpha`: incomplete and intended for development environments.
- `beta`: feature-complete for the milestone but still under validation.
- `rc`: release candidate; only release-blocking fixes are expected.

## Single source of truth

Before the first automated release pipeline, `package.json` is the version source of truth. A release automation step should later:

1. determine the next version;
2. update `package.json` and any lockfile;
3. update `CHANGELOG.md`;
4. create an annotated Git tag;
5. build and publish immutable container images;
6. attach checksums and release notes.

Do not maintain independent hand-edited versions in multiple application files.

## Git tags and container tags

Release tags use a `v` prefix:

```text
v0.1.0
v1.0.0
```

Container images should be immutable and published with:

- exact version: `learnspace-api:1.2.3`;
- minor channel: `learnspace-api:1.2`;
- major channel: `learnspace-api:1`;
- commit SHA: `learnspace-api:sha-<git-sha>`.

A mutable `latest` tag may point to the newest stable release, but production Compose files should pin an exact version or image digest.

Web and API images should normally share the same application release version so a deployed stack can be reproduced unambiguously.

## Branch policy

Recommended policy:

- `main` is protected and must remain releasable.
- Work is performed in short-lived feature/fix branches.
- Releases are cut from `main` after required checks pass.
- Critical supported-version fixes may use a temporary `release/<major>.<minor>` branch.
- Direct pushes and force pushes to protected branches should be disabled.

## Commit convention

Use Conventional Commits:

```text
feat(auth): add Google OAuth callback
fix(iep): prevent duplicate weekly goal events
refactor(storage): introduce student repository
chore(deps): update Prisma
security(auth): rotate session signing strategy
docs(self-hosting): document reverse proxy setup
```

Common types:

- `feat`: user-visible functionality;
- `fix`: bug fix;
- `security`: security hardening or vulnerability fix;
- `perf`: performance improvement;
- `refactor`: behavior-preserving code restructuring;
- `test`: tests only;
- `docs`: documentation only;
- `build`: packaging/build changes;
- `ci`: continuous integration changes;
- `chore`: maintenance.

Use `!` and a `BREAKING CHANGE:` footer when relevant:

```text
feat(api)!: require organization scope on student endpoints

BREAKING CHANGE: API clients must include the organization context selected at login.
```

## Changelog policy

`CHANGELOG.md` follows Keep a Changelog categories:

- Added
- Changed
- Deprecated
- Removed
- Fixed
- Security

Every release must state:

- required environment changes;
- database migration behavior;
- known compatibility constraints;
- security impact;
- backup or rollback requirements.

## API versioning

The initial HTTP API should use `/api/v1`.

Within a major API version:

- additive response fields are allowed;
- new optional request fields are allowed;
- existing field meaning must not change silently;
- fields must be deprecated before removal;
- clients must tolerate unknown response fields;
- validation tightening that rejects previously valid input is potentially breaking.

A `/api/v2` is required when compatibility cannot reasonably be preserved. API versioning does not replace application release versioning.

## Database migration policy

Prisma migrations are immutable after they have been merged or deployed. Never edit or delete an applied migration to repair a shared environment; add a new migration.

Every production release must use:

```bash
prisma migrate deploy
```

Do not use `prisma db push` against production databases.

### Expand-and-contract changes

Use phased migrations for changes that cannot be completed atomically:

1. **Expand:** add nullable/new columns, tables, or indexes while preserving old behavior.
2. **Migrate:** backfill data in an observable, restartable job.
3. **Switch:** deploy application code that reads/writes the new representation.
4. **Contract:** remove old fields only in a later release after verification.

Large indexes and backfills should be designed to avoid long write locks.

### Release compatibility

Each release note should declare:

- minimum supported database schema/migration;
- whether the preceding application version can run after migration;
- whether rollback requires database restoration;
- expected migration duration and lock risk.

The API should fail fast with an actionable error if the database schema is incompatible.

## Configuration versioning

Environment variables form part of the operator-facing interface.

- New required variables are breaking during stable releases unless a safe default exists.
- Renamed variables should support a deprecation window where practical.
- `.env.example` must contain names and safe explanations, never secrets.
- Startup validation must report missing or invalid variables before serving traffic.
- Release notes must explicitly list configuration additions, changes, and removals.

## Data import/export versioning

Future localStorage export, administrative import, and backup interchange formats must include a schema marker:

```json
{
  "format": "learnspace-export",
  "version": 1,
  "exportedAt": "2026-08-18T00:00:00.000Z",
  "data": {}
}
```

Importers must validate the complete payload, support a dry run, reject unsupported versions clearly, and never partially apply an invalid import without a documented recovery path.

## Supported release policy

Before `1.0.0`, only the latest pre-release line is supported.

At `1.0.0`, define and publish a concrete support window. A reasonable starting point for a small project is:

- latest minor release: full bug and security fixes;
- previous minor release: critical security fixes for 90 days;
- older releases: upgrade required.

Do not promise long-term support until maintainers and patch capacity are assigned.

## Release checklist

1. Confirm the intended SemVer impact.
2. Ensure the working tree and dependency lockfile are clean.
3. Run formatting, linting, type checks, unit tests, integration tests, and production builds.
4. Run Prisma migration tests against a copy or disposable database.
5. Scan dependencies and container images.
6. Verify backup and restore instructions when persistence changes.
7. Update `CHANGELOG.md`, environment documentation, and upgrade notes.
8. Build images once and promote the same digest between environments.
9. Run smoke tests with Google OAuth and least-privilege roles.
10. Create the annotated Git tag and publish release artifacts.
11. Monitor error rates, authentication failures, migration status, and health checks.
