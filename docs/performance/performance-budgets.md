# Learnspace performance budgets

These are initial regression budgets for P7-010, not evidence that representative production load has passed. Record dated measurements and query plans before making that claim.

The machine-readable source is `docs/performance/budgets.json`.

## Web production bundle

| Metric                         |          Budget |
| ------------------------------ | --------------: |
| Total JavaScript, raw          | 1,050,000 bytes |
| Total JavaScript, gzip         |   300,000 bytes |
| Largest JavaScript chunk, raw  |   330,000 bytes |
| Largest JavaScript chunk, gzip |    95,000 bytes |
| Total CSS, raw                 |    80,000 bytes |
| Total CSS, gzip                |    15,000 bytes |

The thresholds provide modest regression headroom over the production build measured while introducing this artifact. They are guardrails, not ideal targets. A change near a limit should explain user impact and consider lazy loading, dependency reduction, or chunking rather than simply raising the number.

Run:

```bash
npm run build -w @learnspace/web
node scripts/performance/check-bundle-budget.mjs
```

The checker uses only Node built-ins, scans the configured build directory recursively, calculates level-9 gzip sizes, prints every threshold, and exits non-zero on a violation. Generated filenames are not fixed in the configuration.

## API latency smoke/load budget

For a controlled local or staging environment with representative data:

| Read-only endpoint    | Expected status | p95 budget |
| --------------------- | --------------: | ---------: |
| `GET /health/live`    |             200 |     150 ms |
| `GET /health/ready`   |             200 |     300 ms |
| `GET /api/v1/version` |             200 |     200 ms |

Defaults are 50 requests per endpoint, concurrency 5, and a 5-second individual timeout. These endpoints are deliberately read-only and unauthenticated; they validate deployment overhead and database readiness, not core authenticated workflow performance.

```bash
node scripts/performance/api-smoke-load.mjs \
  --base-url http://127.0.0.1:3001
```

Remote targets are refused unless `--allow-remote` is supplied. Obtain operator authorization first. The script caps requests at 1,000 and concurrency at 20, sends no credentials, follows no redirects, and performs no writes. Do not use it as a stress test or against an environment whose capacity/monitoring is unknown.

For authenticated core APIs, use a separately approved test harness with synthetic accounts and representative data. Do not put session cookies, tokens, student records, or response bodies in committed reports.

## Database and large-list targets

Initial design/review targets:

| Metric                                 |         Target |
| -------------------------------------- | -------------: |
| SQL statements per core list request   |     at most 12 |
| SQL statements per core detail request |     at most 10 |
| Maximum API list page size             |    100 records |
| Representative student population      | 1,000 students |
| Representative concurrent users        |       25 users |

Core list/detail flows include attendance, Learning Journeys, observations, IEPs, weekly reports, dashboard aggregates, search, notifications, and administration where authorized.

These query-count numbers require instrumentation or database-log evidence; the repository does not currently enforce them automatically. A count under budget can still hide repeated per-row SQL. Review query fingerprints and plans using `query-plan-review-template.md`.

## Budget change policy

A budget change must include:

1. before/after measurements from the same controlled environment;
2. representative data volume and concurrency;
3. the regression or intentional tradeoff;
4. mitigation considered;
5. an owner and follow-up date when accepting degradation.

Never raise a threshold only to make a failing check pass. Measurements from developer laptops should identify hardware and are not interchangeable with production SLOs.
