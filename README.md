# Learnspace

Learnspace is an educator portal for academic planning, attendance, special-education observations, Individualized Education Programs (IEPs), and weekly progress reporting.

The repository is currently at **`0.1.0-alpha.1`**. Milestone 1 provides an npm workspace, a typed Express API foundation, shared Zod contracts, PostgreSQL and Docker Compose orchestration, and production-oriented web/API images.

> [!IMPORTANT]
> The educator workflows are still a frontend prototype and are **not production-ready**. Application records are seeded in the browser and stored in each browser profile's `localStorage`; identity is simulated through a role switcher; and the UI has not yet migrated its records or authentication to the API. Do not use real student, family, educational, or disability-related information.

## Current capabilities

- Educator dashboard and reporting overview
- Student attendance entry
- Learning Journey calendar, editor, and approval workflow
- Special-education observation tools:
  - Functional Emotional Developmental Capacities (FEDC)
  - Sensory Profile
  - School Function Assessment (SFA)
- Annual IEP plans, goals, accommodations, and approval workflow
- Weekly IEP progress reports with goal synchronization
- Role-oriented views for teachers, coordinators, principals, and directors
- Seeded demo records for evaluating the workflows
- Express API foundation with liveness, PostgreSQL readiness, version, structured logging, request IDs, and safe error responses
- Docker Compose services for the web application, API, and PostgreSQL

## Current architecture

```mermaid
flowchart TB
    Browser[Browser] --> Web[React/Vite web application]
    Web --> LocalStorage[(Browser localStorage prototype data)]
    Browser -->|same-origin /api traffic in Compose| Proxy[Non-root nginx web container]
    Proxy --> API[Express TypeScript API]
    API --> DB[(PostgreSQL 16)]
    Web -. shared wire schemas .-> Contracts[Zod contracts package]
    API -. shared wire schemas .-> Contracts
```

The workspace and service boundary are implemented, but the migration is intentionally incremental:

- `apps/web` contains the existing React/Vite prototype. Its domain records still use `apps/web/src/services/storageService.ts` and `localStorage`.
- `apps/api` is an active Express/TypeScript service. It validates runtime configuration, emits structured JSON logs, assigns request IDs, checks PostgreSQL readiness, handles shutdown signals, and returns shared response schemas.
- `packages/contracts` provides shared Zod schemas and inferred TypeScript types for health, version, and API error responses.
- `compose.yaml` defines production-oriented `web`, `api`, and `db` services. The database is internal by default, while the web and API ports are available on the host for local operation.
- `compose.dev.yaml` is an optional override that publishes PostgreSQL on host port `5432` for database tools or a host-run API.
- PostgreSQL is connected to the API but is not yet the authoritative store for the educator workflows. Prisma, OAuth, server-side sessions, authorization, and domain APIs remain later milestones.

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
├── docker/
│   └── web/nginx.conf             # SPA fallback, caching, health, and /api proxy
├── docs/
│   ├── adr/0001-application-architecture.md
│   ├── ROADMAP.md
│   └── VERSIONING.md
├── compose.yaml                   # Web, API, and internal PostgreSQL stack
├── compose.dev.yaml               # Optional host PostgreSQL port override
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
npm run dev:api
```

For a host-run API, set `DATABASE_URL` to a host address such as `postgresql://learnspace:change-me@localhost:5432/learnspace`. The Compose-internal hostname `db` is only resolvable from containers.

Equivalent workspace command:

```bash
npm run dev -w @learnspace/api
```

The API listens on <http://localhost:4000> by default.

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
npm run clean         # Remove generated workspace output and coverage
```

### Workspace-local commands

```bash
npm run build -w @learnspace/contracts
npm run typecheck -w @learnspace/contracts

npm run build -w @learnspace/api
npm run typecheck -w @learnspace/api
npm test -w @learnspace/api -- --run
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
| `GET`  | `/api/v1/version` | API name and current alpha version         | No                |

The API also:

- propagates a valid incoming `X-Request-ID` or generates one;
- returns the request ID in response headers and error envelopes;
- limits JSON request bodies to `100kb` and returns a safe `413 PAYLOAD_TOO_LARGE` envelope when exceeded;
- bounds PostgreSQL readiness connection, query, and statement operations to two seconds;
- disables Express's `X-Powered-By` header;
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
| `ALLOW_DEVELOPMENT_AUTH_PLACEHOLDERS` | `true` only for explicit development placeholder credentials      |
| `LOG_LEVEL`                           | `fatal`, `error`, `warn`, `info`, `debug`, or `trace`             |

Compose additionally accepts `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `API_PORT`. Defaults are suitable only for isolated development.

### Production-required secrets and settings

Before any production-oriented Compose deployment:

- set a unique `SESSION_SECRET` of at least 32 characters;
- set real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` values—development placeholders are rejected because the Compose API runs with `NODE_ENV=production`;
- replace the default PostgreSQL password and ensure `DATABASE_URL` uses the matching database, user, password, host, and database name;
- set `APP_URL` to the externally reachable HTTPS origin;
- configure `GOOGLE_ALLOWED_DOMAINS` according to instance admission policy, if used;
- keep all secrets outside the repository and arrange TLS, secret rotation, backups, and restore testing.

OAuth routes and sessions are not implemented yet. Supplying credentials satisfies the current startup contract but does not enable Google sign-in.

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

The `web` image builds the Vite bundle and serves it with an unprivileged nginx runtime, SPA fallback, immutable asset caching, no-store HTML responses, `/health`, and same-origin `/api/` proxying. The `api` image builds TypeScript in a separate stage, prunes development dependencies, runs as the unprivileged Node user, and checks `/health/live`. PostgreSQL uses a named `postgres-data` volume and is isolated on the internal backend network.

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

## Prototype data and security caveats

On first load, `apps/web/src/services/storageService.ts` copies records from `apps/web/src/data/seedData.ts` into browser `localStorage`. Data therefore:

- exists only in one browser profile;
- is not synchronized between users or devices;
- can be read or modified by anyone with browser developer tools;
- has no transaction, concurrency, backup, audit, or server-side authorization guarantees;
- is not written to the current PostgreSQL service;
- must not be treated as a secure store for real student information.

The role switcher is a demonstration tool, not authentication. Google OAuth, opaque server-side sessions, Prisma models/migrations, domain persistence, audit events, and server-enforced role/record authorization remain roadmap work.

Learnspace handles categories of data that can be highly sensitive. Deployment owners must assess applicable privacy, education, accessibility, retention, breach-response, and data-residency obligations with qualified advisers. This repository does not itself guarantee compliance with FERPA, GDPR/UK GDPR, COPPA, Indonesia's Personal Data Protection Law, or any local education policy.

## Project documentation

- [`docs/ROADMAP.md`](docs/ROADMAP.md) — implementation backlog and milestone status
- [`docs/adr/0001-application-architecture.md`](docs/adr/0001-application-architecture.md) — accepted architecture decisions
- [`docs/VERSIONING.md`](docs/VERSIONING.md) — release and migration policy
- [`CHANGELOG.md`](CHANGELOG.md) — release history
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contribution and validation workflow
- [`SECURITY.md`](SECURITY.md) — private vulnerability reporting

## License

No license file is currently present. Unless the repository owner adds one, copyright law reserves reuse and redistribution rights. Add an explicit license before inviting external distribution or contributions.
