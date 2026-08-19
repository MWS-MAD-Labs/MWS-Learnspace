# ADR 0001: Application architecture

- **Status:** Accepted
- **Date:** 2026-08-19
- **Decision owners:** Learnspace maintainers
- **Scope:** Target production architecture for the workspace, API boundary, persistence, sessions, containers, and prototype migration

## Context

Learnspace is currently a React/Vite prototype. Application records are seeded from `src/data/seedData.ts`, persisted in browser `localStorage` through `src/services/storageService.ts`, and protected only by presentation-level role conditionals. This is useful for demonstrating workflows but is not a secure or authoritative architecture for student, educational, or disability-related information.

The production foundation needs an explicit separation between browser code and trusted server code, one authoritative database, reproducible schema evolution, revocable authentication sessions, and a workspace layout that lets the web application and API share validated contracts without sharing security decisions.

## Decision

### Workspace layout and ownership

The repository will use npm workspaces with these target locations:

```text
.
├── apps/
│   ├── web/                       # React, TypeScript, Vite, and Tailwind browser application
│   └── api/                       # Express and TypeScript HTTP API
├── packages/
│   └── contracts/                 # Shared Zod wire schemas and inferred TypeScript types
├── prisma/
│   ├── schema.prisma              # Authoritative Prisma data model
│   ├── migrations/                # Ordered, committed database migrations
│   └── seed.ts                    # Explicit development/demo seed entry point
├── docker/                        # Container and reverse-proxy supporting files
├── docs/                          # Architecture, operations, and domain documentation
├── compose.yaml                   # Local/self-hosted service orchestration
└── package.json                   # Root workspace and orchestration scripts
```

Code and artifact ownership is resolved as follows:

- Browser UI code, browser-only state, and typed API clients belong in `apps/web`.
- Trusted application logic, authentication, authorization, validation at the HTTP boundary, persistence access, and audit-event creation belong in `apps/api`.
- Wire-format schemas intended for both browser and API use belong in `packages/contracts`. They define request and response shapes, not authorization policy or database entities.
- The authoritative database schema belongs in `prisma/schema.prisma`.
- Every production schema change belongs in a generated, reviewed, and committed directory under `prisma/migrations`.
- Development/demo seed behavior belongs in `prisma/seed.ts` and must be explicit and guarded against production execution.
- The current `src/types.ts`, `src/data/seedData.ts`, and `src/services/storageService.ts` remain prototype sources until their later roadmap migrations; they do not become production persistence contracts.

### Browser/API trust boundary

The browser is an untrusted client. It may render views, collect input, perform non-sensitive UI state management, and call versioned endpoints under `/api/v1`, but all browser-supplied identity, role, organization, ownership, workflow state, record identifiers, and payload data must be treated as untrusted input.

The API is the application security boundary. It must authenticate the session, validate each request at runtime, load authoritative user and record data, enforce role-based and record-level authorization, apply business and workflow rules, and emit audit events before reading or changing protected data.

Frontend role checks may hide, disable, or explain controls for usability, but **frontend role checks are not authorization**. A user can modify browser code and issue requests directly. Every protected API operation must independently enforce authorization; neither a hidden button nor a role value sent by the browser grants access.

The web and API should be exposed through the same trusted ingress where practical so browser API traffic can use same-origin routing without permissive production CORS. TLS terminates at the production ingress or reverse proxy, and forwarded-header trust must be explicitly configured.

### PostgreSQL ownership

PostgreSQL 16 or newer is the authoritative system of record for production application data, including users, OAuth identities, sessions, roles, permissions, organization ownership, domain records, workflow state, and audit events. The API is the only application component permitted to read or write PostgreSQL during normal operation.

The browser must not connect to PostgreSQL and must not treat `localStorage`, IndexedDB, bundled seed data, or cached API responses as authoritative. Browser storage may contain only non-sensitive presentation preferences and replaceable cache data. PostgreSQL access credentials are server-only configuration and must never be embedded in the frontend bundle.

Background workers may be added later when a concrete queue or asynchronous workload exists. Such workers are trusted server components and must use the same ownership, authorization-context, migration, and audit conventions as the API; their existence does not create a second source of truth.

### Server-side opaque cookie sessions

Authentication will use Google OAuth 2.0/OpenID Connect authorization-code flow with PKCE, handled by the API. After verifying the provider response and matching the identity to an internal user, the API creates an opaque, revocable session stored server-side in PostgreSQL.

The browser receives a cookie containing only a high-entropy session identifier. It must not contain roles, permissions, profile data, OAuth tokens, or other claims that the browser can use as authority. The cookie will be `HttpOnly`, `Secure` in production, appropriately `SameSite`, scoped as narrowly as practical, and protected by an explicit CSRF strategy. Session identifiers must be stored or derived in a form that limits damage if the session table is exposed, rotated when privilege or authentication state changes, expire according to policy, and be revocable on logout or administrative action.

For every protected request, the API resolves the session from PostgreSQL, loads current user status and authorization data, and rejects expired, revoked, disabled, or otherwise invalid sessions. Google establishes identity; Learnspace's PostgreSQL data determines access.

### Docker services

The target Compose stack contains three required services:

- `web`: builds the Vite application and serves static assets through a hardened, non-root-capable web server or reverse proxy. It contains no runtime secrets.
- `api`: runs the compiled Express service as an unprivileged user, receives server-only configuration, exposes liveness/readiness endpoints, and is the only application service connected to PostgreSQL.
- `db`: runs PostgreSQL 16+ with a named persistent volume, an internal network, and a health check. Its port is not published by default in the production-oriented configuration.

Compose will define health checks, dependency-aware startup, restart policies, and separate development overrides where host access or live development behavior is needed. Browser traffic should reach the API through same-origin ingress routing. Redis is not part of the initial architecture; it may be introduced only if a measured session, queue, cache, or rate-limiting requirement justifies another stateful service.

Database migration is an explicit command or one-shot deployment job using `prisma migrate deploy`; it is not an automatic side effect of every API replica starting. Migration execution must complete successfully before serving code that depends on the new schema.

### Schema and migration strategy

Prisma is the sole application schema-management mechanism. The schema in `prisma/schema.prisma` and the committed migration history in `prisma/migrations` are reviewed alongside application changes.

Development schema changes are created as named Prisma migrations. Deployed environments apply committed migrations with `prisma migrate deploy`; destructive reset or development-only synchronization commands are not production deployment mechanisms. Production databases are never seeded implicitly.

Migrations should be forward-compatible with rolling or ordered deployments. Breaking changes use an expand-and-contract sequence where practical:

1. add compatible tables, columns, indexes, or constraints;
2. deploy code that can work during the transition;
3. backfill and verify data with an explicit, resumable operation when needed;
4. switch reads/writes to the new representation;
5. remove obsolete structures in a later migration after rollback and compatibility windows close.

Each migration must account for data volume, locking, transaction behavior, rollback or roll-forward recovery, and backup/restore requirements. Applied migration files are immutable; corrections are made with a new migration.

### Prototype data migration

Migration from browser persistence will be incremental by feature, not a direct bulk copy of arbitrary `localStorage`. Each feature will first receive normalized PostgreSQL ownership and constraints, validated API endpoints, server-side authorization, audit behavior, and tests. The web application will then replace the corresponding `storageService` calls with typed API calls before browser persistence for that feature is retired.

If existing prototype records need preservation, a later task must define a one-time, versioned export/import format. Import will require runtime schema validation, organization and user ownership mapping, authorization, duplicate handling, a dry-run report, explicit operator confirmation, and auditability. Demo seed records remain separate from imported or production data, and no production migration assumes browser records are trustworthy merely because they were created by the prototype.

## Rejected alternatives

### Keep the single frontend package and add ad hoc server files

Rejected because it obscures the trust boundary, complicates independent build and test lifecycles, and encourages browser and server concerns to share modules accidentally. npm workspaces make ownership explicit while preserving one repository and one package manager.

### Continue using browser storage as the system of record

Rejected because browser storage is user-controlled, device-local, unaudited, difficult to back up, and incapable of enforcing concurrent, organization-scoped access. It cannot safely hold production student information.

### Let the browser access PostgreSQL or a generated database client directly

Rejected because database credentials and unrestricted data access cannot be safely delegated to an untrusted browser. It would bypass application authorization, workflow rules, validation, and audit controls.

### Treat frontend role conditionals as authorization

Rejected because browser code and requests can be modified by the user. UI checks remain useful for presentation only; the API must make every authorization decision using current server-side data.

### Use self-contained JWT access tokens as the primary browser session

Rejected for the initial architecture because roles, account status, and record access can change before a token expires, while sensitive deployments require immediate revocation and centralized session visibility. Opaque PostgreSQL-backed sessions provide straightforward revocation and avoid placing authorization claims or OAuth tokens in browser-readable storage.

### Store roles or identity claims in the session cookie

Rejected because cookies are client-held and stale claims could outlive server-side changes. The cookie contains only an opaque identifier; current identity and access data are resolved by the API.

### Run schema synchronization automatically on API startup

Rejected because multiple replicas can race, startup failures become harder to diagnose, and destructive or long-running changes can block serving processes. Deployments use one explicit migration command or job before dependent application code is activated.

### Use `prisma db push` or edit production databases manually

Rejected because these approaches do not provide a complete, reviewable, reproducible migration history. Production changes are represented by committed Prisma migrations and applied with `prisma migrate deploy`.

### Add Redis immediately for sessions

Rejected because PostgreSQL already provides durable, transactional session storage and avoids an unnecessary operational dependency. Redis can be reconsidered when measured scale or queue/rate-limit requirements justify it.

### Rewrite the frontend during workspace conversion

Rejected because redesigning while relocating code would increase migration risk and make regressions difficult to isolate. The existing React application will first move into `apps/web` with behavior preserved, then features will migrate incrementally to the API.

## Consequences

### Positive

- Security-sensitive decisions are centralized in the API rather than duplicated or trusted in the browser.
- PostgreSQL provides one authoritative, durable, auditable source of production data.
- Opaque server-side sessions support immediate revocation and current authorization checks.
- Workspace boundaries clarify where browser code, server code, shared wire contracts, schema, and migrations belong.
- Committed migrations and explicit deployment jobs make database evolution reviewable and reproducible.
- Incremental feature migration reduces the risk of replacing the working prototype in one large rewrite.
- Separate containers allow independent hardening, health checks, scaling, and deployment of web, API, and database components.

### Negative and operational costs

- The system gains API, database, migration, OAuth, CSRF, backup, monitoring, and container operational responsibilities.
- Protected requests require a session lookup and current authorization evaluation; indexes and connection management will be necessary as usage grows.
- Shared contracts reduce wire-format duplication but do not eliminate the need for separate persistence models and server-only policy code.
- Expand-and-contract migrations can require temporary duplicate fields, backfills, and multiple releases.
- Prototype browser data is not automatically trusted or preserved; importing it requires a deliberate, validated process.
- Local development becomes a multi-service workflow, although npm workspace commands and Docker Compose will provide consistent orchestration.

## Follow-up

This ADR authorizes the architecture described above but does not implement workspace relocation, API endpoints, Prisma, authentication, Docker images, Compose services, or prototype-data import. Those changes remain separate roadmap tasks beginning with P1-002.
