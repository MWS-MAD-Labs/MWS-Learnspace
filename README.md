# Learnspace

Learnspace is an educator portal for academic planning, attendance, special-education observations, Individualized Education Programs (IEPs), and weekly progress reporting.

This is the public, organization-owned repository at <https://github.com/MWS-MAD-Labs/MWS-Learnspace>. Public visibility allows anyone to inspect and fork the source, but it does not make the application production-ready or grant reuse rights beyond an explicit license.

The repository is currently at **`0.2.0`**. Milestone 4 delivered the first fully migrated product vertical, and Milestone 5 now includes API-backed organization account and membership administration, authorized student directories, privileged student administration, transactional GPK staff assignments, and Learning Journey authoring and approval workflows in addition to PostgreSQL attendance.

> [!IMPORTANT]
> Learnspace remains **pre-production**. Authentication, authorization, academic/student lookup and administration, GPK staff assignments, attendance, Learning Journeys, observation workflows, IEP plans, weekly reports, dashboards, reporting, search, notifications, and controlled prototype import tooling are server-backed. Sensitive domain records are no longer persisted in browser storage. By owner decision, the remaining image-publication, monitoring, operational-drill, accountable review, manual accessibility, authenticated performance, and full release-validation gates are scheduled for the stable `1.0.0` qualification window. They remain mandatory before publishing `1.0.0` or handling real student, family, educational, or disability-related information.

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
- Express API foundation with liveness, PostgreSQL readiness, version, structured logging with query-string redaction, request IDs, safe error responses, exact-origin CORS, restrictive response headers, trusted-proxy controls, and fixed-window rate limits
- Docker Compose services for the web application, API, PostgreSQL, and a one-shot Prisma migration job
- Normalized Prisma models for tenant ownership, academics, attendance, planning, observations, IEPs, weekly reports, workflows, sessions, audit events, and prototype import runs
- Versioned legacy-browser export, fail-closed administrative import CLI, and documented local Docker backup/import/rollback rehearsal

## Current architecture

```mermaid
flowchart TB
    Browser[Browser] --> Web[React/Vite web application]
    Web -->|typed account, academic, student, attendance, journey, observation, IEP, report, and aggregate requests| Proxy
    Browser -->|same-origin /api traffic in Compose| Proxy[Non-root nginx web container]
    Proxy --> API[Express TypeScript API]
    API --> DB[(PostgreSQL 16)]
    Web -. shared wire schemas .-> Contracts[Zod contracts package]
    API -. shared wire schemas .-> Contracts
```

The workspace and service boundary are implemented:

- `apps/web` contains the React/Vite application. All sensitive domain screens use typed API services and PostgreSQL-backed data; production application paths do not read or write `localStorage` or `sessionStorage`.
- `apps/api` is an active Express/TypeScript service with Google authentication, server sessions, authorization, organization account administration, academic/student resources, privileged student mutations, transactional GPK assignment and attendance endpoints, scoped Learning Journey workflows, assignment-bound FEDC, Sensory Profile, and SFA observation lifecycles, and role/student-scoped transactional IEP plan authoring with optimistic concurrency and historical immutability, plus runtime configuration validation, exact-origin CORS, trusted-proxy controls, fixed-window request limits, restrictive response headers, query-string-redacted structured logging, readiness checks, and graceful shutdown.
- `packages/contracts` provides shared runtime Zod schemas and inferred TypeScript types for authentication, API errors, organization accounts, academic resources, students, staff directories, GPK assignments, attendance, Learning Journeys, observation definitions and assignments, FEDC, Sensory Profile, SFA, and IEP records and commands.
- `compose.yaml` defines source-build `web`, `api`, `migrate`, and `db` services for development/staging. `compose.release.yaml` is the supported digest-pinned operator stack for candidate and stable images.
- `compose.dev.yaml` is an optional override that publishes PostgreSQL on host port `5432` for database tools or a host-run API.
- PostgreSQL is authoritative for authentication, user identity and membership administration, authorization scope, academic/student lookup and administration, GPK assignments, attendance, Learning Journey workflows, observation definitions and assignments, FEDC, Sensory Profile, SFA, IEP plans and transitions, weekly reports, dashboards, reports, search, and notifications.

Frontend role checks are presentation behavior only and are not authorization. The API is the intended security boundary for protected operations as those operations are implemented.

## Repository layout

```text
.
├── apps/
│   ├── web/                       # React 19, TypeScript, Vite, Tailwind prototype
│   │   ├── Dockerfile             # Multi-stage build and non-root nginx runtime
│   │   └── src/
│   └── api/                       # Express TypeScript API
│       ├── Dockerfile             # Multi-stage, non-root Node runtime
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
├── compose.yaml                   # Source-build web, API, migration, and PostgreSQL stack
├── compose.release.yaml           # Digest-pinned self-hosted release stack
├── compose.dev.yaml               # Optional host PostgreSQL port override
├── compose.e2e.yaml               # Disposable attendance and P5 administration E2E stack
├── compose.integration.yaml       # Persistent local PostgreSQL integration-test service
├── .env.example                   # Safe environment template
└── package.json                   # npm workspace orchestration
```

`metadata.json` remains as provenance and compatibility metadata for the prototype's Google AI Studio origin. The application does not load it at runtime.

## Requirements

- Node.js `20.20.2` (pinned in [`.nvmrc`](.nvmrc)); newer compatible LTS releases are accepted by the package engine range
- npm `10.8.2` or newer
- Docker with the Compose plugin for container workflows

The repository sets `engine-strict=true`, so unsupported Node.js or npm versions fail installation with an engine error.

## Install dependencies

```bash
nvm use
npm ci
```

## Local npm development

### Run the web prototype

```bash
npm run dev
```

Open <http://localhost:3000>. This starts only `@learnspace/web`; its prototype records remain browser-local.

Equivalent workspace command:

```bash
npm run dev -w @learnspace/web
```

### Run the API locally

The API requires its environment variables to be present in the process environment; it does not automatically load `.env` files. Start PostgreSQL, load a development environment, and then run the API:

```bash
cp .env.example .env
# Edit .env for local development.
docker compose -f compose.yaml -f compose.dev.yaml up -d db
set -a
. ./.env
set +a
npm run db:migrate:deploy
npm run dev:api
```

For a host-run API, set `DATABASE_URL` to a host address such as `postgresql://learnspace:change-me@localhost:5432/learnspace`. The Compose-internal hostname `db` is only resolvable from containers.

Equivalent workspace command:

```bash
npm run dev -w @learnspace/api
```

The API listens on <http://localhost:4000> by default.

### Run database integration tests locally

The reusable local integration command starts the dedicated PostgreSQL service in `compose.integration.yaml` at `127.0.0.1:55433`, waits for it to become healthy, and applies committed migrations before running the API integration suite. If that port is occupied, set `INTEGRATION_DB_PORT` to another free local port:

```bash
npm run test:integration:local
INTEGRATION_DB_PORT=55434 npm run test:integration:local
```

To use a different running PostgreSQL container, override the URL for that invocation:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:PORT/DATABASE npm run test:integration:local
```

Use a disposable test database. Integration tests create tenant fixtures and do not clean all records after completion.

### Root commands

```bash
npm run dev           # Start the web workspace on 0.0.0.0:3000
npm run dev:api       # Start the API workspace in watch mode
npm run build         # Build all workspaces that provide a build script
npm run format        # Format supported repository files
npm run format:check  # Check formatting without modifying files
npm run lint          # Lint the complete workspace
npm run typecheck     # Type-check all workspaces that provide the script
npm test              # Run workspace tests once
npm run test:integration:local # Migrate and test against local Docker PostgreSQL
npm run clean         # Remove generated workspace output and coverage
npm run prisma:validate
npm run prisma:generate
npm run db:migrate:deploy
npm run db:migrate:status
npm run db:seed        # Requires explicit non-production seed opt-in
npm run openapi:generate
npm run openapi:check
npm run e2e:attendance # Disposable Compose-backed attendance Playwright run
npm run e2e:p5         # Disposable Compose-backed P5 administration Playwright run
npm run e2e:accessibility # Cross-browser accessibility baseline against a running E2E stack
npm run performance:bundle # Enforce production web bundle budgets
npm run performance:api -- --base-url URL # Bounded read-only API latency smoke
npm run rc:validate     # Local RC static/unit/build gate; integration/E2E are opt-in
npm run release:qualify-images # Candidate digest clean-install/upgrade/restart gate
npm run release:e2e-images # Full browser matrix against candidate image digests
npm run db:backup -- --database SOURCE --output FILE
npm run db:restore -- --archive FILE --database NEW_TARGET
npm run db:backup:encrypted -- --database SOURCE --output FILE.dump.age
npm run db:restore:encrypted -- --archive FILE.dump.age --database NEW_TARGET
npm run db:restore:verify -- --archive FILE.dump.age --database NAME_restore_verify_SUFFIX
npm run db:import:prepare-local -- OUTPUT_DIRECTORY
npm run db:import -- --file EXPORT --manifest MANIFEST --dry-run
npm run db:import -- --file EXPORT --manifest MANIFEST --apply --confirm-organization UUID
```

### Development-only legacy browser export

To extract approved prototype data from a browser profile, explicitly enable the local-only exporter:

```bash
VITE_ENABLE_LEGACY_EXPORT_TOOL=true npm run dev
```

Open <http://localhost:3000/__dev/legacy-export>. The route is unavailable without the development flag and is excluded from normal production UI. Its downloaded JSON is clearly marked sensitive; follow [`docs/operations/prototype-import-rollout.md`](docs/operations/prototype-import-rollout.md) for the target mapping manifest, dry-run, apply, reconciliation, and rollback process.

### Workspace-local commands

```bash
npm run build -w @learnspace/contracts
npm run typecheck -w @learnspace/contracts

npm run build -w @learnspace/api
npm run typecheck -w @learnspace/api
npm test -w @learnspace/api -- --run
npm run test:integration -w @learnspace/api # Requires DATABASE_URL
npm run test:integration:local     # Starts Docker PostgreSQL on 127.0.0.1:55433
npm run start -w @learnspace/api   # Run the previously built API

npm run build -w @learnspace/web
npm run typecheck -w @learnspace/web
npm test -w @learnspace/web -- --run
npm run preview -w @learnspace/web
```

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
- logs request paths without query strings, preventing OAuth `code` and `state` values from entering request-completion logs;
- permits credentialed browser CORS only from the exact origin derived from `APP_URL`; same-origin proxy requests require no CORS headers;
- trusts forwarded client addresses only from the explicitly configured `TRUSTED_PROXIES` ranges;
- applies an in-memory fixed-window API limit and a separate tighter authentication limit, returning `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After` with the standard API error envelope;
- returns restrictive CSP, frame, content-type, referrer, opener, and permissions-policy headers;
- limits JSON request bodies to `100kb` and returns a safe `413 PAYLOAD_TOO_LARGE` envelope when exceeded;
- bounds the Prisma readiness operation to two seconds and requires migration `20260824000000_prototype_import_runs`;
- disables Express's `X-Powered-By` header;
- returns structured `404`, invalid-JSON, payload-too-large, and internal-error responses without production stack traces.

The in-memory rate-limit counters are per API process and reset on restart. Multi-replica deployments should replace them with a shared limiter before relying on aggregate limits across replicas.

When using the Compose web endpoint, `/api/v1/version` is available through the nginx same-origin proxy at <http://localhost:3000/api/v1/version>. The API host port is bound to loopback only for local operational access, for example <http://localhost:4000/health/ready>; remote clients must use the web proxy. The web container exposes liveness at <http://localhost:3000/health> and proxies API readiness at <http://localhost:3000/health/ready>.

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
| `TRUSTED_PROXIES`                     | Optional comma-separated named private ranges, IPs, or CIDRs      |
| `API_RATE_LIMIT_REQUESTS`             | API requests per fixed window; defaults to `600`                  |
| `API_RATE_LIMIT_WINDOW_SECONDS`       | API fixed-window duration from 1 to 3600 seconds                  |
| `AUTH_RATE_LIMIT_REQUESTS`            | Authentication requests per fixed window; defaults to `30`        |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS`      | Authentication fixed-window duration from 1 to 3600 seconds       |
| `ALLOW_DEVELOPMENT_AUTH_PLACEHOLDERS` | `true` only for explicit development placeholder credentials      |
| `LOG_LEVEL`                           | `fatal`, `error`, `warn`, `info`, `debug`, or `trace`             |

Compose additionally accepts `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `API_PORT`, and `WEB_PORT`. Defaults are suitable only for isolated development.

### Production-required secrets and settings

Before any production-oriented Compose deployment:

- set a unique `SESSION_SECRET` of at least 32 characters;
- set real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` values—development placeholders are rejected because the Compose API runs with `NODE_ENV=production`;
- replace the default PostgreSQL password and ensure `DATABASE_URL` uses the matching database, user, password, host, and database name;
- set `APP_URL` to the externally reachable HTTPS origin and `GOOGLE_REDIRECT_URI` to the exact registered API callback; `APP_URL` is also the sole credentialed CORS origin;
- choose `AUTH_ADMISSION_MODE`; configure `GOOGLE_ALLOWED_DOMAINS` only for domain admission;
- set `TRUSTED_PROXIES` only to the actual reverse-proxy ranges between clients and the API; never use a universal trust value;
- size the API and authentication rate limits for the deployment, remembering that the built-in counters are process-local;
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
- API: <http://localhost:4000> (loopback only; public requests use the web `/api/` proxy)
- PostgreSQL: internal Compose network only

The `web` image builds the Vite bundle and serves it with an unprivileged nginx runtime, restrictive browser security headers, SPA fallback, immutable asset caching, no-store HTML responses, `/health`, proxied `/health/ready`, and same-origin `/api/` proxying. The CSP has no broad source wildcards and permits only first-party images through `img-src 'self'`; external Google Fonts, Unsplash fallbacks, and Google profile-image dependencies have been removed. Legacy stored remote avatar values render as initials without making external requests. nginx replaces inbound forwarding headers rather than appending untrusted client-supplied proxy chains. The API Dockerfile provides a one-shot Prisma migration target and a pruned non-root runtime image. PostgreSQL uses a named `postgres-data` volume and is isolated on the internal backend network. `compose.release.yaml` consumes separately verified API, web, and migration image digests without rebuilding. See [`docs/operations/self-hosting.md`](docs/operations/self-hosting.md) for the release operator path and [`docs/operations/komodo-staging-deployment.md`](docs/operations/komodo-staging-deployment.md) for the existing source-build staging topology.

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
- [`docs/operations/self-hosting.md`](docs/operations/self-hosting.md) — clean installation, configuration, TLS, OAuth, upgrade, rollback, monitoring, and troubleshooting
- [`docs/operations/backup-and-restore.md`](docs/operations/backup-and-restore.md) — guarded Compose PostgreSQL backup and restore procedure
- [`docs/adr/0001-application-architecture.md`](docs/adr/0001-application-architecture.md) — accepted architecture decisions
- [`docs/VERSIONING.md`](docs/VERSIONING.md) — release and migration policy
- [`CHANGELOG.md`](CHANGELOG.md) — release history
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contribution and validation workflow
- [`SECURITY.md`](SECURITY.md) — private vulnerability reporting

## Contributing

Public contributions are welcome through forks and pull requests. Review [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup, validation, and submission requirements. Report suspected vulnerabilities privately as described in [`SECURITY.md`](SECURITY.md), not through public issues or pull requests.

## License

No license file is currently present. Unless the repository owner adds one, copyright law reserves reuse and redistribution rights. Add an explicit license before inviting external distribution or contributions.
