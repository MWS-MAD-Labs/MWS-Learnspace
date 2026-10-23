# Learnspace

Learnspace is an educator portal for academic planning, attendance, special-education observations, Individualized Education Programs (IEPs), and weekly progress reporting.

The repository is currently at **`0.2.0`**. Milestone 4 delivered the first fully migrated product vertical, and Milestone 5 now includes API-backed organization account and membership administration, authorized student directories, privileged student administration, transactional GPK staff assignments, and Learning Journey authoring and approval workflows in addition to PostgreSQL attendance.

> [!IMPORTANT]
> Learnspace remains **pre-production**. Authentication, authorization, academic/student lookup and administration, GPK staff assignments, attendance, Learning Journeys, observation workflows, IEP plans, weekly reports, dashboards, reporting, search, notifications, and controlled prototype import tooling are server-backed. Sensitive domain records are no longer persisted in browser storage, but staging rehearsal and the remaining production-hardening controls must still be completed before handling real student, family, educational, or disability-related information.

## Current capabilities

- Educator dashboard and reporting overview
- Multi-user PostgreSQL-backed student attendance entry with class/date authorization, audit events, and concurrent-edit detection
- Authorized student directories and privileged student detail administration with guardian-contact gating
- Director-only People & access administration for authoritative user identities, organization memberships, roles, statuses, and unit/grade/subject scopes
- Transactional GPK assignment, reassignment, ending, server-enforced caseload capacity, and audited session-derived actors
- PostgreSQL-backed Learning Journey calendar, tracker, and draft editor with server filters, scoped ownership, nested projects/goals/connections, transactional submit/review/approval transitions, immutable workflow events, audit events, and optimistic concurrency
- Special-education observation tools:
  - Functional Emotional Developmental Capacities (FEDC)
  - Sensory Profile
  - School Function Assessment (SFA)
- PostgreSQL-backed annual IEP draft plans, goals, accommodations, services, parent approval metadata, scoped authoring, and immutable historical content; approval transitions remain scheduled for P5-009
- Weekly IEP progress reports with goal synchronization
- Role-oriented views for teachers, coordinators, principals, and directors
- Guarded development/test PostgreSQL seed records for evaluating workflows
- Hono API foundation on Bun with liveness, PostgreSQL readiness, version, structured logging, request IDs, and safe error responses
- Exima-style Hub shared login behind `SHARED_SESSION_MODE=shared`, with verified employee projection, exact Central role/permission parity, public auth bootstrap, one-attempt browser restore, and rollback-safe retention of local OAuth/session code
- Docker Compose services for the web application, API, PostgreSQL, and a one-shot Prisma migration job
- Normalized Prisma models for tenant ownership, academics, attendance, planning, observations, IEPs, weekly reports, workflows, sessions, audit events, and prototype import runs
- Versioned legacy-browser export, fail-closed administrative import CLI, and documented local Docker backup/import/rollback rehearsal

## Current architecture

```mermaid
flowchart TB
    Browser[Browser] --> Web[React/Vite web application]
    Browser -->|Hub parent-domain session| Hub[MWS Hub]
    Web -->|typed account, academic, student, attendance, journey, observation, IEP, report, and aggregate requests| Proxy
    Browser -->|same-origin /api traffic in Compose| Proxy[Non-root nginx web container]
    Proxy --> API[Hono TypeScript API on Bun]
    API --> DB[(PostgreSQL 16)]
    API -->|employee and entitlement lookup| Central[MWS Central]
    Web -. shared wire schemas .-> Contracts[Zod contracts package]
    API -. shared wire schemas .-> Contracts
```

The workspace and service boundary are implemented:

- `apps/web` contains the React/Vite application. All sensitive domain screens use typed API services and PostgreSQL-backed data; production application paths do not read or write `localStorage` or `sessionStorage`.
- `apps/api` is an active Hono/TypeScript service running on Bun with local Google OAuth/server sessions retained for rollback and an authoritative Hub/Central shared-login mode. Shared mode accepts verified employee identities only, persists a one-to-one Central organization mapping, projects a verified local principal and membership on first login, requires exact role-permission parity, and continues to enforce local record scopes. Intern and student Hub identities are currently denied.
- Hono is exposed through an internal HTTP compatibility boundary in `apps/api/src/type/http.ts`. Existing controllers and middleware use repository-owned request, response, router, and next-function types rather than importing Express. This keeps the framework migration localized while preserving route and service behavior; new code should use that boundary or native Hono APIs instead of adding Express dependencies.
- `packages/contracts` provides shared runtime Zod schemas and inferred TypeScript types for authentication, API errors, organization accounts, academic resources, students, staff directories, GPK assignments, attendance, Learning Journeys, observation definitions and assignments, FEDC, Sensory Profile, SFA, and IEP records and commands.
- `compose.yaml` defines production-oriented `web`, `api`, `migrate`, and `db` services. The database is internal by default, while the web and API ports are available on the host for local operation. API startup waits for the one-shot migration job.
- `compose.dev.yaml` is an optional override that publishes PostgreSQL on host port `5432` for database tools or a host-run API.
- Hub/Central is authoritative for identity, role, and coarse permissions in shared mode; PostgreSQL remains authoritative for projected local users, memberships, record scopes, application data, workflows, and audits. Local mode continues to use Google OAuth and PostgreSQL sessions during the rollback window.

Shared login is implemented but remains pre-production. Local migration deployment and permission-manifest synchronization evidence are complete. Real browser login against Hub/Central, Central role assignments, API-token rotation, rate-limited principal backfill, shared-session E2E fixtures, and staging/production cutover evidence are still required. Do not remove local OAuth/session support until the rollback window closes. See [`docs/auth/shared-session-migration.md`](docs/auth/shared-session-migration.md).

Frontend role checks are presentation behavior only and are not authorization. The API is the intended security boundary for protected operations as those operations are implemented.

## Repository layout

```text
.
├── apps/
│   ├── web/                       # React 19, TypeScript, Vite, Tailwind prototype
│   │   ├── Dockerfile             # Multi-stage build and non-root nginx runtime
│   │   └── src/
│   └── api/                       # Hono TypeScript API on Bun
│       ├── Dockerfile             # Multi-stage, non-root Bun runtime
│       ├── src/
│       └── test/
├── packages/
│   └── contracts/                 # Shared Zod wire schemas and types
├── prisma/                        # Schema, committed migrations, guarded seed
├── e2e/                           # Compose-backed Playwright attendance and P5 administration tests
├── scripts/                       # Database operations and E2E lifecycle tools
├── docker/
│   └── web/nginx.conf             # SPA fallback, caching, health, and /api proxy
├── docs/
│   ├── adr/0001-application-architecture.md
│   ├── api/conventions.md          # Versioned API conventions
│   ├── api/openapi.json            # Generated OpenAPI 3.1 specification
│   ├── operations/backup-and-restore.md
│   ├── operations/prototype-import-rollout.md
│   ├── domain-model.md
│   ├── ROADMAP.md
│   └── VERSIONING.md
├── compose.yaml                   # Web, API, and internal PostgreSQL stack
├── compose.dev.yaml               # Optional host PostgreSQL port override
├── compose.e2e.yaml               # Disposable attendance and P5 administration E2E stack
├── compose.integration.yaml       # Persistent local PostgreSQL integration-test service
├── .env.example                   # Safe environment template
├── bun.lock                       # Committed Bun dependency lockfile
└── package.json                   # Bun workspace orchestration
```

`metadata.json` remains as provenance and compatibility metadata for the prototype's Google AI Studio origin. The application does not load it at runtime.

## Requirements

- Bun `1.3` or newer
- Docker with the Compose plugin for container workflows

Node.js and npm are no longer the supported repository runtime and package-manager workflow. Some third-party tools retain Node-compatible APIs internally, but contributors and operators should use the Bun commands documented here.

## Install dependencies

```bash
bun install --frozen-lockfile
```

## Local Bun development

### Run the web prototype

```bash
bun run dev
```

Open <http://localhost:3000>. This starts only `@learnspace/web`; API-backed workflows require the API and PostgreSQL to be running separately or through Compose.

Equivalent workspace command:

```bash
bun run --filter @learnspace/web dev
```

### Run the API locally

The API development command loads the repository root `.env` explicitly, including when it is started directly from `apps/api`. Start PostgreSQL, prepare the local environment, apply migrations, and run the API:

```bash
cp .env.example .env
# Edit .env for local development.
docker compose -f compose.yaml -f compose.dev.yaml up -d db
bun run db:migrate:deploy
bun run dev:api
```

For a host-run API, set `DATABASE_URL` to a host address such as `postgresql://learnspace:change-me@localhost:5432/learnspace`. The Compose-internal hostname `db` is only resolvable from containers. If port `5432` is already occupied, set `POSTGRES_PORT` and use the same port in `DATABASE_URL`, for example `POSTGRES_PORT=5440` and `postgresql://learnspace:change-me@localhost:5440/learnspace`.

Equivalent workspace command:

```bash
cd apps/api
bun run dev
```

Both commands load `MWS-Learnspace/.env`. The API listens on <http://localhost:4000> by default; change `PORT` and set `VITE_API_PROXY_TARGET` to the same API origin when port 4000 is occupied.

### Run database integration tests locally

The reusable local integration command starts the dedicated PostgreSQL service in `compose.integration.yaml` at `127.0.0.1:55433`, waits for it to become healthy, and applies committed migrations before running the API integration suite:

```bash
bun run test:integration:local
```

To use a different running PostgreSQL container, override the URL for that invocation:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:PORT/DATABASE bun run test:integration:local
```

Use a disposable test database. Integration tests create tenant fixtures and do not clean all records after completion.

### Root commands

```bash
bun run dev           # Start the web workspace on 0.0.0.0:3000
bun run dev:api       # Start the API workspace in watch mode
bun run build         # Build all workspaces that provide a build script
bun run format        # Format supported repository files
bun run format:check  # Check formatting without modifying files
bun run lint          # Run Oxlint correctness, React, and Vitest checks
bun run lint:anti-slop # Run the separate repository anti-slop policy checks
bun run typecheck     # Run the required root and workspace TypeScript 7 tsc gate
bun run test          # Run Vitest workspace tests once
bun run test:integration:local # Migrate and test against local Docker PostgreSQL
bun run clean         # Remove generated workspace output and coverage
bun run prisma:validate
bun run prisma:generate
bun run db:migrate:deploy
bun run db:migrate:status
bun run db:seed        # Requires explicit non-production seed opt-in
bun run openapi:generate
bun run openapi:check
bun run permissions:check # Read-only Central permission drift check
bun run permissions:sync -- --retries 5 --wait 20 # Deployment-time manifest sync
bun run central-access:sync -- --dry-run # Manual Central entitlement-to-local-role reconciliation
bun run shared-session:readiness -- --strict # Sanitized shared cutover diagnostic
bun run e2e:attendance # Disposable Compose-backed attendance Playwright run
bun run e2e:p5         # Disposable Compose-backed P5 administration Playwright run
bun run db:backup -- --database SOURCE --output FILE
bun run db:restore -- --archive FILE --database NEW_TARGET
bun run db:import:prepare-local -- OUTPUT_DIRECTORY
bun run db:import -- --file EXPORT --manifest MANIFEST --dry-run
bun run db:import -- --file EXPORT --manifest MANIFEST --apply --confirm-organization UUID
```

### Development-only legacy browser export

To extract approved prototype data from a browser profile, explicitly enable the local-only exporter:

```bash
VITE_ENABLE_LEGACY_EXPORT_TOOL=true bun run dev
```

Open <http://localhost:3000/__dev/legacy-export>. The route is unavailable without the development flag and is excluded from normal production UI. Its downloaded JSON is clearly marked sensitive; follow [`docs/operations/prototype-import-rollout.md`](docs/operations/prototype-import-rollout.md) for the target mapping manifest, dry-run, apply, reconciliation, and rollback process.

### Workspace-local commands

```bash
bun run --filter @learnspace/contracts build
bun run --filter @learnspace/contracts typecheck

bun run --filter @learnspace/api build
bun run --filter @learnspace/api typecheck
bun run --filter @learnspace/api test -- --run
bun run --filter @learnspace/api test:integration # Requires DATABASE_URL
bun run test:integration:local     # Starts Docker PostgreSQL on 127.0.0.1:55433
bun run --filter @learnspace/api start # Run the previously built API

bun run --filter @learnspace/web build
bun run --filter @learnspace/web typecheck
bun run --filter @learnspace/web test -- --run
bun run --filter @learnspace/web preview
```

Vitest and Playwright remain intentional parts of the test architecture after the Bun migration. Prisma remains pinned to major version 6 for schema generation, migrations, and database access. A Prisma 7 upgrade and adoption of TanStack Query are separate future projects with their own compatibility and migration work; neither is implied by Bun or Hono.

Oxlint provides the repository's syntax and semantic lint gate, including correctness, React, and Vitest rules. Type-aware correctness remains the responsibility of the required TypeScript 7 `tsc` typecheck command; the repository does not use ESLint or typescript-eslint.

## API endpoints

| Method | Endpoint          | Purpose                                    | Database required |
| ------ | ----------------- | ------------------------------------------ | ----------------- |
| `GET`  | `/health/live`    | Process liveness (`{"status":"live"}`)     | No                |
| `GET`  | `/health/ready`   | PostgreSQL readiness and dependency status | Yes               |
| `GET`  | `/api/v1/version` | API name and current application version   | No                |

Protected `/api/v1/organizations/...` resources provide membership-scoped organizations, academic years, units, grades, classes, subjects, minimal student list/detail responses, and class/date attendance reads and bulk writes. See [`docs/api/conventions.md`](docs/api/conventions.md) and the generated [`docs/api/openapi.json`](docs/api/openapi.json).

The API also:

- propagates a valid incoming `X-Request-ID` or generates one;
- returns the request ID in response headers and error envelopes;
- limits JSON request bodies to `100kb` and returns a safe `413 PAYLOAD_TOO_LARGE` envelope when exceeded;
- bounds the Prisma readiness operation to two seconds and requires migration `20260824000000_prototype_import_runs`;
- does not emit an Express `X-Powered-By` header;
- returns structured `404`, invalid-JSON, payload-too-large, and internal-error responses without production stack traces.

When using the Compose web endpoint, `/api/v1/version` is available through the nginx same-origin proxy at <http://localhost:3000/api/v1/version>. API health endpoints are available directly on the published API port, for example <http://localhost:4000/health/ready>. The web container has its own health endpoint at <http://localhost:3000/health>.

## Environment setup

Copy the safe template before local or Compose operation:

```bash
cp .env.example .env
```

Never commit `.env` or real credentials. The API validates the following contract before listening:

| Variable                              | Requirement                                                       |
| ------------------------------------- | ----------------------------------------------------------------- |
| `NODE_ENV`                            | `development`, `test`, or `production`; defaults to `development` |
| `PORT`                                | Integer from `1` to `65535`; defaults to `4000`                   |
| `DATABASE_URL`                        | Valid `postgresql://` or `postgres://` URL                        |
| `APP_URL`                             | Valid absolute application URL                                    |
| `SESSION_SECRET`                      | At least 32 characters                                            |
| `GOOGLE_CLIENT_ID`                    | Non-empty; placeholder values are normally rejected               |
| `GOOGLE_CLIENT_SECRET`                | Non-empty; placeholder values are normally rejected               |
| `GOOGLE_ALLOWED_DOMAINS`              | Optional comma-separated domain list                              |
| `GOOGLE_REDIRECT_URI`                 | Exact Google callback URL registered for this environment         |
| `AUTH_ADMISSION_MODE`                 | `DENY_UNKNOWN`, `INVITE_ONLY`, or `ALLOWED_DOMAIN`                |
| `SESSION_TTL_HOURS`                   | Session lifetime from 1 to 168 hours                              |
| `ALLOW_DEVELOPMENT_AUTH_PLACEHOLDERS` | `true` only for explicit development placeholder credentials      |
| `LOG_LEVEL`                           | `fatal`, `error`, `warn`, `info`, `debug`, or `trace`             |

Compose additionally accepts `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`, and `API_PORT`. Defaults are suitable only for isolated development. `POSTGRES_PORT` is used by the development override when PostgreSQL must be reached from the host.

### Production-required secrets and settings

Before any production-oriented Compose deployment:

- set a unique `SESSION_SECRET` of at least 32 characters;
- set real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` values—development placeholders are rejected because the Compose API runs with `NODE_ENV=production`;
- replace the default PostgreSQL password and ensure `DATABASE_URL` uses the matching database, user, password, host, and database name;
- set `APP_URL` to the externally reachable HTTPS origin and `GOOGLE_REDIRECT_URI` to the exact registered API callback;
- choose `AUTH_ADMISSION_MODE`; configure `GOOGLE_ALLOWED_DOMAINS` only for domain admission;
- keep all secrets outside the repository and arrange TLS, secret rotation, backups, and restore testing.

See `docs/auth/google-oauth.md` for Google Cloud clients, exact development/staging/production URLs, admission policy, and rotation procedures.

## Docker Compose

### Full stack

```bash
cp .env.example .env
# Replace required values, especially SESSION_SECRET and Google credentials.
docker compose up -d --build
docker compose ps
```

Services and default host endpoints:

- web: <http://localhost:3000>
- API: <http://localhost:4000>
- PostgreSQL: internal Compose network only

The `web` image builds the Vite bundle and serves it with an unprivileged nginx runtime, SPA fallback, immutable asset caching, no-store HTML responses, `/health`, and same-origin `/api/` proxying. The API Dockerfile provides a one-shot Prisma migration target and a pruned non-root runtime image. PostgreSQL uses a named `postgres-data` volume and is isolated on the internal backend network.

Stop the stack without deleting database data:

```bash
docker compose down
```

To also delete the named database volume:

```bash
docker compose down --volumes
```

### Optional host database access

Use the development override only when a host-run API or database tool needs PostgreSQL on `localhost:5432`:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d db
```

Do not use this override for a production-oriented deployment; `compose.yaml` intentionally leaves the database port unpublished.

### Docker validation status

On 2026-08-19, the complete Compose stack was built and runtime-validated with the required environment values supplied. Web, API, and PostgreSQL reached healthy status; direct and proxied endpoints, SPA fallback, cache headers, non-root users, PostgreSQL volume persistence, database-dependent readiness failure and recovery, and graceful API `SIGTERM` shutdown all passed. The stack was then stopped with `docker compose down` while preserving the named database volume.

## Data and security caveats

Production application paths do not persist student, attendance, observation, IEP, workflow, report, or user identity records in `localStorage` or `sessionStorage`. The browser role switcher, automatic web seed initialization, reset-data control, browser-backed repositories, and sensitive web seed fixtures have been removed. A separately gated development-only legacy export route may read pre-existing version 2 browser data solely to create a local migration artifact; it does not initialize, mutate, or transmit that data.

Google OAuth, opaque server-side sessions, Prisma persistence, audit events, and server-enforced role/record authorization are implemented for the migrated domains. Learnspace handles categories of data that can be highly sensitive. Deployment owners must assess applicable privacy, education, accessibility, retention, breach-response, and data-residency obligations with qualified advisers. This repository does not itself guarantee compliance with FERPA, GDPR/UK GDPR, COPPA, Indonesia's Personal Data Protection Law, or any local education policy.

## Project documentation

- [`docs/ROADMAP.md`](docs/ROADMAP.md) — implementation backlog and milestone status
- [`docs/domain-model.md`](docs/domain-model.md) — canonical entities, enums, ownership, workflow transitions, and JSON boundaries
- [`docs/operations/backup-and-restore.md`](docs/operations/backup-and-restore.md) — guarded Compose PostgreSQL backup and restore procedure
- [`docs/adr/0001-application-architecture.md`](docs/adr/0001-application-architecture.md) — accepted architecture decisions
- [`docs/VERSIONING.md`](docs/VERSIONING.md) — release and migration policy
- [`CHANGELOG.md`](CHANGELOG.md) — release history
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contribution and validation workflow
- [`SECURITY.md`](SECURITY.md) — private vulnerability reporting

## License

No license file is currently present. Unless the repository owner adds one, copyright law reserves reuse and redistribution rights. Add an explicit license before inviting external distribution or contributions.
