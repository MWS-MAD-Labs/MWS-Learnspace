# Learnspace stable-release qualification report template

> **Status:** Template only. It is not a qualification pass, production approval, or release recommendation.

Create a sanitized copy such as `docs/releases/1.0.0-qualification.md`. Preserve failed, blocked, skipped, and not-applicable entries. Never commit secrets, OAuth codes, session cookies, real student data, database dumps, private hostnames, or raw production logs.

## Candidate identity

| Field                                | Value                                                     |
| ------------------------------------ | --------------------------------------------------------- |
| Version / image tags and digests     | TODO                                                      |
| Git commit and clean-tree evidence   | TODO                                                      |
| Previous version used for upgrade    | TODO                                                      |
| Validation environment               | TODO                                                      |
| Start/end time                       | TODO                                                      |
| Coordinators/reviewers               | TODO                                                      |
| Linked accessibility report          | TODO                                                      |
| Linked performance/query-plan report | TODO                                                      |
| Overall disposition                  | NOT STARTED / IN PROGRESS / BLOCKED / REJECTED / APPROVED |

Only an authorized release owner may set `APPROVED` after reviewing all blockers and exceptions. Stable `1.0.0` must not be published before this qualification and the required P7/P8 gates pass.

## Automated baseline

Record command, start/end time, result, and artifact/log location.

| Check                       | Command/evidence                                   | Result  | Notes |
| --------------------------- | -------------------------------------------------- | ------- | ----- |
| Deterministic clean install | `npm ci` in clean checkout                         | NOT RUN | TODO  |
| Formatting                  | `npm run format:check`                             | NOT RUN | TODO  |
| Lint                        | `npm run lint`                                     | NOT RUN | TODO  |
| Typecheck                   | `npm run typecheck`                                | NOT RUN | TODO  |
| Unit tests                  | `npm test`                                         | NOT RUN | TODO  |
| Prisma schema validation    | `npm run prisma:validate`                          | NOT RUN | TODO  |
| OpenAPI consistency         | `npm run openapi:check`                            | NOT RUN | TODO  |
| Production builds           | `npm run build`                                    | NOT RUN | TODO  |
| Bundle budget               | `node scripts/performance/check-bundle-budget.mjs` | NOT RUN | TODO  |
| Integration tests           | `npm run test:integration:local`                   | NOT RUN | TODO  |
| RC/browser smoke            | `sh scripts/rc/e2e.sh`                             | NOT RUN | TODO  |
| Read-only API latency smoke | See performance report                             | NOT RUN | TODO  |

## Installation, migration, upgrade, and rollback

| Scenario                                    | Procedure/evidence | Expected                                                   | Result     | Owner/issues |
| ------------------------------------------- | ------------------ | ---------------------------------------------------------- | ---------- | ------------ |
| Clean install from documented prerequisites | TODO               | Services ready; schema current; first login path available | NOT TESTED | TODO         |
| Fresh database migration                    | TODO               | All committed migrations apply once                        | NOT TESTED | TODO         |
| Upgrade from previous supported release     | TODO               | Data/config preserved; new version ready                   | NOT TESTED | TODO         |
| Restart during/after migration              | TODO               | Documented recovery; no partial silent success             | NOT TESTED | TODO         |
| Application rollback compatibility          | TODO               | Matches release-note declaration                           | NOT TESTED | TODO         |
| Database rollback/restore requirement       | TODO               | Matches release-note declaration                           | NOT TESTED | TODO         |

Record migration duration, locks, database size, schema version before/after, and sanitized failure recovery evidence.

## Backup and restore

Follow `docs/operations/backup-and-restore.md`; use synthetic data and a disposable restore database.

| Check                                                    | Result     | Evidence/issues |
| -------------------------------------------------------- | ---------- | --------------- |
| Backup produced with checksum and protected permissions  | NOT TESTED | TODO            |
| Archive catalog and checksum validated                   | NOT TESTED | TODO            |
| Restore into a new disposable database                   | NOT TESTED | TODO            |
| Migration history and representative record counts match | NOT TESTED | TODO            |
| API readiness against restored database                  | NOT TESTED | TODO            |
| Measured RPO/RTO meets approved target                   | NOT TESTED | TODO            |
| Restored sensitive artifact disposed/retained per policy | NOT TESTED | TODO            |

## Authentication and authorization matrix

Use synthetic identities. Test OAuth success plus denied, disabled, expired/revoked session, logout, and provider/error recovery. Do not capture tokens.

| Membership role/state           | Login      | Visible navigation | Authorized core actions | Direct API denial outside scope | Logout/session revocation | Result/issues |
| ------------------------------- | ---------- | ------------------ | ----------------------- | ------------------------------- | ------------------------- | ------------- |
| `DIRECTOR`                      | NOT TESTED | NOT TESTED         | NOT TESTED              | NOT TESTED                      | NOT TESTED                | TODO          |
| `PRINCIPAL`                     | NOT TESTED | NOT TESTED         | NOT TESTED              | NOT TESTED                      | NOT TESTED                | TODO          |
| `GRADE_TEACHER`                 | NOT TESTED | NOT TESTED         | NOT TESTED              | NOT TESTED                      | NOT TESTED                | TODO          |
| `SUBJECT_TEACHER`               | NOT TESTED | NOT TESTED         | NOT TESTED              | NOT TESTED                      | NOT TESTED                | TODO          |
| `SPECIAL_ED_COORDINATOR`        | NOT TESTED | NOT TESTED         | NOT TESTED              | NOT TESTED                      | NOT TESTED                | TODO          |
| `SPECIAL_ED_TEACHER` assigned   | NOT TESTED | NOT TESTED         | NOT TESTED              | NOT TESTED                      | NOT TESTED                | TODO          |
| `SPECIAL_ED_TEACHER` unassigned | NOT TESTED | NOT TESTED         | NOT TESTED              | NOT TESTED                      | NOT TESTED                | TODO          |
| `SPECIALIST` assigned           | NOT TESTED | NOT TESTED         | NOT TESTED              | NOT TESTED                      | NOT TESTED                | TODO          |
| Disabled/unknown account        | NOT TESTED | N/A                | N/A                     | NOT TESTED                      | NOT TESTED                | TODO          |

## Core workflow matrix

| Workflow                                 | Create/read/update/transition | Persistence after refresh/new session | Validation/conflict behavior | Authorization/isolation | Accessibility evidence | Result/issues |
| ---------------------------------------- | ----------------------------- | ------------------------------------- | ---------------------------- | ----------------------- | ---------------------- | ------------- |
| Attendance                               | NOT TESTED                    | NOT TESTED                            | NOT TESTED                   | NOT TESTED              | NOT TESTED             | TODO          |
| Learning Journeys                        | NOT TESTED                    | NOT TESTED                            | NOT TESTED                   | NOT TESTED              | NOT TESTED             | TODO          |
| Observations                             | NOT TESTED                    | NOT TESTED                            | NOT TESTED                   | NOT TESTED              | NOT TESTED             | TODO          |
| IEPs                                     | NOT TESTED                    | NOT TESTED                            | NOT TESTED                   | NOT TESTED              | NOT TESTED             | TODO          |
| Weekly reports                           | NOT TESTED                    | NOT TESTED                            | NOT TESTED                   | NOT TESTED              | NOT TESTED             | TODO          |
| Dashboard/search/notifications/reporting | NOT TESTED                    | NOT TESTED                            | NOT TESTED                   | NOT TESTED              | NOT TESTED             | TODO          |
| People and access administration         | NOT TESTED                    | NOT TESTED                            | NOT TESTED                   | NOT TESTED              | NOT TESTED             | TODO          |

## Container and operational behavior

| Scenario                                      | Expected                                                                  | Result     | Evidence/issues |
| --------------------------------------------- | ------------------------------------------------------------------------- | ---------- | --------------- |
| API process/container restart                 | Readiness recovers; persisted data/session behavior matches policy        | NOT TESTED | TODO            |
| Web process/container restart                 | UI recovers without stale incompatible assets                             | NOT TESTED | TODO            |
| Database restart                              | API becomes unready then recovers; no silent data loss                    | NOT TESTED | TODO            |
| Full stack stop/start without volume deletion | Data preserved; migrations idempotent                                     | NOT TESTED | TODO            |
| Dependency unavailable                        | Health/readiness and logs are actionable                                  | NOT TESTED | TODO            |
| Configuration validation                      | Missing/invalid required values fail fast without secret leakage          | NOT TESTED | TODO            |
| Logs/metrics                                  | Request IDs, status, duration, failures observable; no sensitive payloads | NOT TESTED | TODO            |

## Security, privacy, accessibility, and performance gates

| Gate                            | Required evidence                            | Result       | Exceptions |
| ------------------------------- | -------------------------------------------- | ------------ | ---------- |
| Threat model/control review     | P7-008 evidence and open-risk owners         | NOT REVIEWED | TODO       |
| WCAG 2.2 AA review              | Dated manual report plus automated artifacts | NOT REVIEWED | TODO       |
| Bundle/API/query budgets        | Dated build, load, and query-plan reports    | NOT REVIEWED | TODO       |
| Dependency/vulnerability review | Approved process/output                      | NOT REVIEWED | TODO       |
| Privacy/log/backup sanitation   | Reviewer evidence                            | NOT REVIEWED | TODO       |

## Defects and exceptions

| ID     | Severity | Area | Description/evidence | Release blocking? | Owner | Target/fix | Status |
| ------ | -------- | ---- | -------------------- | ----------------- | ----- | ---------- | ------ |
| RC-001 | TODO     | TODO | TODO                 | TODO              | TODO  | TODO       | OPEN   |

Every non-blocking exception needs an accountable owner, rationale, user/operator impact, mitigation, and target release/date.

## Final decision

- Release blockers open: TODO
- Failed checks: TODO
- Blocked/skipped checks: TODO
- Accepted exceptions: TODO
- Rollback decision owner: TODO
- Release owner decision: **NOT PROVIDED**
- Decision date: TODO
- Sign-off references: TODO
