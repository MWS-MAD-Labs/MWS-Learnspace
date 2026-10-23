# Learnspace Roadmap Gap Analysis

**Audit date:** 2026-10-23

**Source of truth reviewed:** [`ROADMAP.md`](ROADMAP.md)

**Purpose:** identify remaining implementation, operational, owner-decision, and documentation work without prematurely marking roadmap acceptance criteria complete.

## Status Categories

This document uses four classifications:

- **Not implemented:** the requested capability or evidence is absent.
- **Partially implemented:** useful foundations exist, but the roadmap acceptance criteria are not complete.
- **Implemented, roadmap stale:** current code substantially satisfies the item, but roadmap text or status has not caught up.
- **Owner or external action required:** completion depends on organizational decisions, credentials, infrastructure, staging, or accountable approval.

## Executive Summary

| Area                        | Current status                                                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Milestones 0-5              | Product and platform foundations are implemented and validated.                                                                                                                         |
| Milestone 6                 | Export/import tooling and local rehearsal are implemented; staging rehearsal and approval remain outstanding.                                                                           |
| Milestone 6.5               | Shared authority and browser foundations are implemented locally; external Central configuration, real-browser/shared-E2E, staging/production, and removal evidence remain outstanding. |
| Milestone 7                 | No task is fully complete; four have partial foundations.                                                                                                                               |
| Milestone 8                 | Release engineering and production approval remain incomplete.                                                                                                                          |
| Post-1.0 product backlog    | Mostly unimplemented; configurable observation instruments are substantially complete and the backlog entry is stale.                                                                   |
| Production-ready definition | Several technical controls are implemented, but operational hardening, release controls, accessibility, backup automation, and accountable approval remain incomplete.                  |

The next migration task requiring external action is **P6.5-001: register Learnspace in Central staging and assign the approved roles**. The authoritative code path already exists, but operational cutover remains blocked on real-browser login, token rotation, rate-limited backfill, shared E2E fixtures, and staging evidence. P7-001 still follows the local-auth removal gate.

The current application/tooling baseline is Bun plus Hono. Oxlint provides syntax and semantic linting through its correctness, React, and Vitest rules, while TypeScript 7 `tsc` remains the required type gate; ESLint and typescript-eslint are not part of the baseline. Vitest, Playwright, and Prisma 6 are intentionally retained. Hono is isolated behind the internal HTTP compatibility boundary used by existing controllers and middleware. Prisma 7 and TanStack Query are independent future migrations and are not gaps in the Bun/Hono work.

## Immediate Roadmap Corrections

These documentation corrections should be made before or alongside new feature work.

### Milestone 6 Blocker Is Stale

`ROADMAP.md` still says Milestone 6 is blocked by P5-013. P5-013 is now complete. The remaining release blocker is:

- repeat the import and rollback rehearsal in staging;
- assign named operators;
- collect staging reconciliation evidence;
- obtain staging sign-off.

P6-004 is checked even though the evidence is explicitly a local Docker rehearsal. The task should either be split into local and staging rehearsals or marked externally incomplete until staging is performed.

### Repository Terminology Is Stale

Several completed tasks still refer to repositories or repository query helpers. The current architecture is documented in [`architecture/code-organization.md`](architecture/code-organization.md):

```text
route -> controller -> service -> injected Prisma
```

The backend deliberately has no repository layer. Historical task descriptions should use terms such as service-layer Prisma operations, scoped query helpers, policies, models, and mappers.

### Current Baseline Wording Is Stale

The roadmap introduction says educator workflows remain a prototype. Feature migration is complete: sensitive product domains are API/PostgreSQL-backed, server-authorized, and regression-tested. The project is better described as **feature-complete for the current scope but not production-hardened**.

### Related Documentation Is Stale

The following documents should be synchronized with current implementation:

- `README.md`
- `docs/VERSIONING.md`
- `CHANGELOG.md`
- `SECURITY.md`
- `docs/domain-model.md`
- `docs/operations/prototype-import-rollout.md`

Known inconsistencies include:

- references to unfinished domain migrations that are now complete;
- references to browser-local production records;
- an outdated P5-009 IEP workflow deferral;
- a `pre-alpha` description that no longer matches project progression;
- a hard-coded sidebar version that does not match package version `0.2.0`.

## Milestone 6.5: Central Shared-Session Migration

### Implemented Foundations

- `mws-central-auth` is pinned to `v0.10.0`, with the reviewed commit recorded in the lockfile.
- API, web, and contracts use Zod 4.
- `ExternalPrincipal` provides immutable issuer/subject sidecar links and a guarded dry-run/apply backfill.
- `Organization.centralOrganizationId` persists the unique Central-to-local organization mapping.
- Verified employee first-login projection creates or reuses the local user, verified principal, and one membership; intern and student identities are denied.
- Hub identity verification, Central entitlement loading, exact role-permission parity, authoritative shared requests, and bounded fail-open shadow comparison are implemented and tested.
- The permission manifest, committed JSON mirror, drift checks, synchronization, retry behavior, token redaction, and local role mappings are implemented.
- Scoped roles may have empty local scopes without receiving broad access.
- Public auth bootstrap, one-attempt restore, `keepFresh`, `watchSession`, stable CSRF handling, `401`/`403`/`503` UX, and Back to MWS Hub-only navigation are implemented and tested at unit/component level.
- Shared readiness is passive, the default entitlement cache is positive-only for 30 seconds, and Central access synchronization is manual.
- Local migration deployment and permission synchronization evidence are complete.

### Incomplete Cutover Work

- register Learnspace and its staging/production organizations in Central;
- create and assign the approved Central roles;
- evidence real browser login against Hub/Central;
- rotate the Central API token and record the non-secret evidence;
- run a rate-limited principal backfill and approve conflicts;
- implement organization switching and decide invitation ownership;
- add dedicated shared-session Hub/Central E2E fixtures and runs; no shared-session E2E currently exists;
- rehearse `401`, `403`, `503`, dependency outage, cutover, and rollback behavior in staging and production;
- remove local Google OAuth and PostgreSQL sessions only after the rollback window.

The detailed procedure and ownership matrix are in [`auth/shared-session-migration.md`](auth/shared-session-migration.md).

## Deferred Product Work Without Dedicated Roadmap Tasks

### Learning Journey Draft Deletion

**Status:** Not implemented.

There is no Learning Journey delete endpoint. Before implementation, define:

- whether only draft journeys may be deleted;
- which roles may delete;
- hard-delete versus soft-delete behavior;
- audit requirements;
- child-record behavior;
- whether a journey that was previously submitted may ever be deleted.

This should receive a dedicated task ID instead of remaining only in a historical completion note.

### Organization Switching

**Status:** Not implemented.

The authenticated session can expose multiple memberships, but the web application still uses the first active membership. Remaining work includes:

- an organization switcher;
- active organization state;
- cache and selected-record reset when switching;
- URL/navigation behavior;
- cross-organization tests;
- optional non-sensitive preference persistence.

### Reviewed Partial Import Policy

**Status:** Intentionally deferred.

The importer is fail-closed and transactional. A future partial-import policy would require explicit review rules, accepted/rejected record handling, operator confirmation, reconciliation reporting, and rollback semantics.

## Milestone 7: Production Hardening

### P7-001: Security Headers, CORS, and Rate Limits

**Status:** Partially implemented.  
**Priority:** First.

Existing foundations:

- `X-Powered-By` is disabled;
- JSON request bodies are bounded;
- secure session cookies are tested;
- CSRF protection exists;
- normal Compose browser traffic uses a same-origin nginx proxy.

Remaining work:

- restrictive Content Security Policy;
- frame protection or `frame-ancestors`;
- `X-Content-Type-Options`;
- referrer policy;
- HSTS guidance for HTTPS deployments;
- explicit production CORS behavior;
- authentication/login rate limits;
- general API request limits;
- header, CORS, rate-limit, and browser smoke tests.

### P7-002: Remove Third-Party Asset Privacy Leaks

**Status:** Not implemented.  
**Depends on:** P7-001.

Remaining privacy leaks include:

- Google Fonts loaded from Google domains;
- Unsplash fallback avatars;
- direct rendering of API-provided external avatar URLs.

Required work:

- self-host required fonts;
- replace external fallback images with local assets or initials;
- decide whether external avatar hosts are supported;
- enforce any approved host allowlist through policy and CSP;
- add a browser network test and inspect CSP reports.

### P7-003: Secret, Dependency, Source, and Container Scanning

**Status:** Not implemented.  
**Priority:** High.

CI currently runs validation, tests, builds, and Docker builds, but does not include:

- secret scanning;
- dependency review;
- a `bun audit` failure policy or an explicitly selected equivalent dependency scanner;
- CodeQL or equivalent SAST;
- container scanning;
- documented scanner exception handling.

Recent clean Docker builds reported production dependency advisories, including high and critical findings. These must be triaged under this task rather than silently ignored.

### P7-004: SBOMs, Provenance, and Image Signing

**Status:** Not implemented.  
**Depends on:** P7-003.

Remaining work:

- generate SPDX or CycloneDX SBOMs;
- generate build provenance;
- sign release images;
- document signature, digest, provenance, and SBOM verification;
- validate one candidate image end to end.

### P7-005: Observability

**Status:** Partially implemented.

Existing foundations:

- request IDs;
- structured JSON logging;
- method, path, status, and duration logging;
- response request-ID propagation.

Remaining work:

- HTTP latency histograms and status counters;
- database pool metrics;
- login-failure metrics;
- authorization-denial metrics;
- background-job metrics when workers exist;
- OpenTelemetry traces and context propagation;
- standardized dashboards;
- telemetry redaction and integration tests.

### P7-006: Alerting and Operational Runbooks

**Status:** Not implemented.  
**Depends on:** P7-005.

Required runbooks:

- API unavailable;
- database unavailable;
- migration failure;
- elevated login failures;
- disk pressure;
- backup failure;
- OAuth outage.

Each alert/runbook must define an owner, severity, symptoms, diagnosis, mitigation, recovery validation, and escalation. A tabletop exercise is required for database and OAuth outages.

### P7-007: Automated Encrypted Backups and Restore Verification

**Status:** Partially implemented and owner-blocked.

Existing foundations:

- guarded backup and restore scripts;
- checksums;
- a backup/restore runbook;
- a local synthetic restore drill.

Remaining work:

- scheduled backups;
- automated encryption;
- remote backup storage;
- retention enforcement;
- failure reporting;
- periodic automated restore verification;
- measured RPO and RTO;
- optional PITR design if required.

Owner decisions required:

- RPO;
- RTO;
- backup location;
- retention period;
- encryption-key ownership;
- operational owner.

### P7-008: Authorization and Privacy Threat Model

**Status:** Not implemented.

The permission matrix, OAuth documentation, authorization tests, CSRF controls, session controls, and tenant checks provide input, but no formal threat model exists.

The threat model must cover:

- OAuth and sessions;
- organization isolation;
- student and IEP access;
- workflow approvals;
- exports and imports;
- administrator functions;
- logs and metrics;
- backups;
- residual risks, owners, and acceptance.

### P7-009: Accessibility Review

**Status:** Not implemented.

Remaining work:

- automated accessibility tooling such as Axe;
- keyboard-navigation review;
- focus-management review;
- labels and error association;
- contrast review;
- dialogs, tables, and responsive behavior;
- documented manual review for login, attendance, Learning Journeys, observations, IEPs, and weekly reports;
- WCAG 2.2 AA blocker report.

### P7-010: Performance and Database Query Budgets

**Status:** Partially implemented.

Existing foundations:

- aggregate/search indexes;
- bounded global search;
- selected query-plan measurements;
- production bundle output.

Remaining work:

- bundle-size budgets;
- API latency targets;
- query-count budgets;
- automated N+1 regression detection;
- load-test tooling;
- pagination and large-list policy across domains;
- representative-volume performance report;
- CI budget enforcement.

### P7-011: Full Release-Candidate Test Matrix

**Status:** Blocked by incomplete P7 dependencies and requires external execution.

The final matrix must cover:

- clean installation;
- upgrade from a supported previous release;
- migrations;
- backup and restore;
- real OAuth configuration;
- every role;
- all critical E2E workflows;
- container restart behavior;
- rollback constraints;
- a sanitized report in `docs/releases/`.

## Milestone 8: Stable Self-Hosted Release

### P8-001: Operator Documentation

**Status:** Partially implemented.

Existing documentation covers local setup, Compose, OAuth, migration policy, and manual backup/restore. Missing documentation includes:

- production installation;
- complete configuration reference;
- reverse proxy and TLS;
- monitoring and alerts;
- troubleshooting;
- previous-release upgrade;
- release-specific rollback;
- versioned image deployment;
- clean-host rehearsal evidence.

### P8-002: Automated Versioned Image Publishing

**Status:** Not implemented.

Required work:

- registry authentication;
- build-and-push workflow;
- exact SemVer, major/minor, and Git SHA tags;
- immutable digest capture;
- signatures;
- SBOM and provenance attachment;
- staging-to-production promotion by digest.

### P8-003: Clean-Install and Upgrade CI

**Status:** Not implemented.

Current CI migrates an empty database but does not test:

- published release images;
- restoration of a previous-version backup;
- upgrade to the candidate version;
- image/schema compatibility;
- rollback constraints.

### P8-004: Release Metadata

**Status:** Partially implemented.

Existing foundations include SemVer policy, package versioning, a changelog, and a release checklist. Missing deliverables include:

- version `1.0.0`;
- final known issues;
- compatibility matrix;
- support window;
- checksums and image digests;
- migration notes;
- rollback constraints;
- security-impact notes.

### P8-005: Production-Readiness Approval

**Status:** Owner and organizational approval required.

Approval is required for:

- accepted security findings;
- privacy and data governance;
- backup objectives and ownership;
- incident response;
- support ownership;
- deployment jurisdiction and applicable legal requirements.

## Post-1.0 Product Backlog

| Item                                           | Status                     | Remaining scope                                                                                                                                                                 |
| ---------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FUT-PROD-001 configurable school setup         | Partial                    | CRUD/configuration UI for calendars, grades, classes, holidays, and terminology.                                                                                                |
| FUT-PROD-002 invitations/delegated admin       | Partial                    | Invitation create/list/revoke/resend APIs and UI; delegated administration policy.                                                                                              |
| FUT-PROD-003 SIS synchronization               | Not implemented            | Connector, scheduled sync, reconciliation, conflicts, audit UI.                                                                                                                 |
| FUT-PROD-004 guardian portal                   | Not implemented            | Guardian identity, authentication, permission model, portal, threat model.                                                                                                      |
| FUT-PROD-005 attachments                       | Not implemented            | Object storage, signed URLs, scanning, retention, access logs.                                                                                                                  |
| FUT-PROD-006 PDF exports                       | Not implemented            | Authorized generation, watermarking, auditing, retention.                                                                                                                       |
| FUT-PROD-007 notification preferences/digests  | Partial                    | Persistence, read state, preferences, email, scheduler/worker.                                                                                                                  |
| FUT-PROD-008 localization                      | Not implemented            | i18n framework, English/Bahasa Indonesia catalogs, language preference.                                                                                                         |
| FUT-PROD-009 configurable instruments          | Implemented, roadmap stale | Immutable configurable definitions, versions, management UI, and pinned assignments already exist. Redefine only if a visual form builder or custom scoring engine is intended. |
| FUT-PROD-010 longitudinal/anonymized analytics | Partial                    | Cohorts, time series, anonymization, small-cell suppression, privacy review.                                                                                                    |

## Post-1.0 Platform Backlog

| Item                                   | Status             | Notes                                                                                                      |
| -------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| FUT-PLAT-001 PostgreSQL RLS evaluation | Not implemented    | Requires an ADR/evaluation; current protection is application scope plus DB constraints/triggers.          |
| FUT-PLAT-002 background worker         | Partial foundation | Periodic auth cleanup runs in the API process; no queue, worker service, retries, or dead-letter handling. |
| FUT-PLAT-003 S3-compatible storage     | Not implemented    | Required for approved attachment workflows.                                                                |
| FUT-PLAT-004 Redis                     | Demand-gated       | Do not implement until measured queue, cache, session, or distributed rate-limit needs exist.              |
| FUT-PLAT-005 OpenTelemetry             | Partial foundation | Request correlation exists; SDK, spans, exporters, and dashboards do not.                                  |
| FUT-PLAT-006 Kubernetes/Helm           | Demand-gated       | No implementation until operator demand justifies the complexity.                                          |

## Optional Responsible-AI Backlog

No active AI integration exists. All AI tasks remain conditional on an approved product initiative.

Before adding an AI dependency:

1. create an AI data-flow/privacy ADR;
2. define administrator opt-in and user disclosure;
3. preserve a complete non-AI path;
4. document vendor retention and training behavior;
5. minimize and redact student data;
6. require human review and provenance;
7. prohibit AI approval and educational/clinical decision-making;
8. add prompt/output security tests, rate limits, cost budgets, and audit events.

## Production-Ready Definition Audit

### Apparently Implemented

- Google OAuth/OIDC identity with revocable server-side sessions.
- Server-side role, organization, and record authorization.
- PostgreSQL-authoritative production records and tested Prisma migrations.
- No sensitive browser persistence.
- Transactional, actor-attributed, audited workflows.
- Unit, integration, authorization, component, and E2E coverage for critical workflows.
- Startup validation for required configuration and weak secrets.
- Test-only authentication paths guarded by test environment configuration.

### Not Yet Complete

- immutable published release images with signatures and provenance;
- encrypted, monitored, retained backups with recurring restore drills;
- metrics, traces, alerts, and complete operational runbooks;
- upgrade and rollback testing from a previous supported release;
- documented and validated accessibility/browser targets;
- accountable security, privacy, retention, incident-response, and support ownership.

The project must continue to be described as **pre-production** until the incomplete controls are evidenced and approved.

## Recommended Execution Order

1. Assign the Central platform owner, Learnspace service owner, data owner, secret-store owner, and rollback approver.
2. Complete P6.5-001 Central staging registration and create the approved roles without placing credentials in the repository.
3. Run P6.5-006 permission sync/check and P6.5-003 principal dry-run; resolve every conflict before apply.
4. Activate P6.5-005 shadow mode in staging, exercise every role, and review mismatch/dependency-failure evidence.
5. Validate the implemented P6.5-007/P6.5-008 path with real browser login, token rotation, and rate-limited backfill evidence.
6. Implement P6.5-009 explicit organization switching and decide Central versus Learnspace ownership for invitations/delegated administration.
7. Add shared Hub/Central E2E fixtures, then complete P6.5-010 and the P6.5-012 staging/production cutover and rollback evidence.
8. Close the rollback window, then execute P6.5-011 local OAuth/session removal.
9. Implement P7-001 security headers, CORS policy, and rate limits against the final Central auth flow.
10. Implement P7-002 asset privacy fixes.
11. Implement P7-003 CI security scanning and dependency policy.
12. Implement P7-005 metrics and tracing, including Central dependency and auth outcome telemetry.
13. Implement P7-007 backup automation after owner decisions.
14. Implement P7-009 accessibility review.
15. Implement P7-010 performance budgets.
16. Complete P7-008 threat model and risk acceptance.
17. Implement P7-004 SBOMs, provenance, and signing.
18. Implement P7-006 alerts and runbooks.
19. Execute P7-011 release-candidate matrix.
20. Complete Milestone 8 release engineering and approvals.

## Owner Decisions Required

- license choice;
- private security contact;
- backup RPO and RTO;
- backup location and retention;
- encryption-key ownership;
- production operations owner;
- security and privacy risk approvers;
- incident-response and support ownership;
- deployment jurisdiction and legal/compliance requirements;
- whether Learning Journey draft deletion remains desired;
- whether configurable observation instruments need scope beyond the implemented immutable definition/version system.
- Central platform owner and Central staging administrator;
- Learnspace staging URL and confirmation that Hub and Learnspace share the required parent domain;
- Central application owner, organization ID, API-client scope, credential rotation owner, and secret-store location;
- approved Central role-to-permission assignments and role-change approver;
- principal-backfill data owner and conflict-resolution authority;
- shadow observation duration and acceptable mismatch/error thresholds;
- Central outage policy, authoritative-context cache/revocation interval, and `503` readiness/alerting policy;
- authority-cutover operator, rollback approver, rollback window, and local-auth removal approval;
- whether invitations and delegated administration are owned by Central or Learnspace;
- organization-switching UX, active-organization persistence policy, and URL behavior.
