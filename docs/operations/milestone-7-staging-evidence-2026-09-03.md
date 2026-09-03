# Milestone 7 staging evidence — 2026-09-03

## Scope

This sanitized record captures repository-side P7-001 through P7-003 staging validation. It contains no credentials, OAuth callback values, cookies, session material, private infrastructure addresses, or student data.

## Deployment identity

| Field                 | Value                                      |
| --------------------- | ------------------------------------------ |
| Branch                | `staging`                                  |
| Verified commit       | `43e0960ef0b7d03f2b41eec9947a7f4bfe29582c` |
| Functional CI run     | `33708908420` — success                    |
| Security workflow run | `33708908565` — success                    |
| Staging deployment    | Komodo deployment job succeeded            |

The functional workflow passed formatting, linting, type checking, unit tests, PostgreSQL integration tests, OpenAPI drift checking, production builds, Compose validation, API/migration/web image builds, attendance E2E, P5 E2E, deployment, public readiness, and legacy-export exclusion.

The security workflow passed full-history Gitleaks scanning, the critical npm audit threshold, CodeQL extended queries with local SARIF critical gating, and critical-only Trivy scans for the API, migration, and web images. Dependency review was correctly skipped because this was a branch push rather than a pull request.

## Scanner enforcement evidence

The preceding security run `33708269993` failed its API, migration, and web Trivy jobs on real critical findings. No exception was added. The remediation:

- updated the nginx runtime to Alpine 3.24;
- removed bundled npm/npx from final API and migration images;
- invoked Prisma directly through Node;
- removed unnecessary Vite/esbuild tooling from API-oriented final stages.

The replacement run `33708908565` passed all three image scans. This demonstrates that critical image findings block the workflow and require remediation.

## Public staging verification

The following checks passed against `https://learnspace-stg.mws.web.id` after deployment:

- `/health` returned live;
- `/health/ready` returned ready with the database up;
- `/api/v1/version` remained publicly available;
- OAuth login initiation returned a Google authorization redirect with PKCE;
- the application document returned enforced CSP, frame denial, content-type protection, referrer policy, opener/resource policy, and permissions policy headers;
- CSP restricted images to first-party sources;
- a request carrying an unapproved `Origin` returned the safe CORS denial envelope and rate-limit headers;
- `/metrics` returned the SPA document rather than internal Prometheus metrics.

Cloudflare attempted to inject its Browser Insights beacon, but browser evidence recorded the request as failed with the reason `csp`; no external response was received. This confirms the enforced policy prevented the injected third-party request from transmitting application-page telemetry.

## Browser baseline

The staging Playwright run completed 15 tests successfully:

- login document semantics and accessible names;
- keyboard focus and activation;
- 320 CSS-pixel reflow;
- reduced-motion behavior;
- health, readiness, and version smoke checks;
- first-party-only successful network traffic;
- non-public metrics behavior.

The accessibility baseline passed in Chromium, Firefox, and WebKit. This does not replace the authenticated core-workflow and manual WCAG 2.2 AA review required by P7-009.

## Performance smoke

The bounded read-only staging probe ran 50 requests per endpoint at concurrency 5:

| Endpoint          |      p95 | Budget | Result |
| ----------------- | -------: | -----: | ------ |
| `/health/live`    | 104.9 ms | 150 ms | Pass   |
| `/health/ready`   |  52.3 ms | 300 ms | Pass   |
| `/api/v1/version` |  67.6 ms | 200 ms | Pass   |

These results validate deployment overhead for public read-only endpoints. They do not complete P7-010, which still requires representative authenticated workloads, query-count evidence, and PostgreSQL plan review.

## Remaining limitations

This record does not complete:

- P7-004 candidate publication/signature verification;
- P7-005 deployed monitoring-provider/dashboard verification;
- P7-006 named alert ownership and tabletop execution;
- P7-007 owner-approved RPO/RTO and timed restore drill;
- P7-008 accountable threat/risk review;
- P7-009 authenticated and manual WCAG review;
- P7-010 representative authenticated performance/query review;
- P7-011 full release-candidate matrix.
