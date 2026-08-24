# Prototype import rehearsal — 2026-08-24 (local Docker)

> Sanitized report. This was the requested disposable local Docker rehearsal using repository fake seed data. It completes the current P6-004 rehearsal gate for local validation; a real deployment must repeat it in staging before production rollout.

## Metadata

- Environment: disposable Docker Compose project `learnspace-import-local`
- Database: PostgreSQL 16 Alpine, database `learnspace_e2e`
- Application version: repository working tree on 2026-08-24
- Applied migrations:
  - `20260819000000_initial`
  - `20260820000000_google_oauth_authorization`
  - `20260824000000_prototype_import_runs`
- Export format/version: `learnspace-export` version 1
- Sanitized export SHA-256: `a6c6608f85d0f37e441286e6b03b8e3d2258637aa1463c580d275d784b7b48ab`
- Target organization: deterministic local test UUID ending `6002`
- Data classification: repository fake seed data only
- Operator/approver: automated local engineering rehearsal; no staging operator approval

## Pre-flight and backup

- Database container health: passed.
- Migrations applied with `prisma migrate deploy`: passed.
- A pre-import PostgreSQL custom-format archive and checksum were created.
- Sanitized archive SHA-256: `16f66ab66c6a9fa1782046dafdb3e59e386829e82429692281b5d4169132c64b`.
- The archive catalog was validated by the backup script.

The target organization and approved user/academic mappings were created before the backup. No prototype domain records or import run existed for the target at backup time.

## Dry run

Dry run executed the complete persistence plan inside a serializable transaction and deliberately rolled it back.

| Outcome     | Count |
| ----------- | ----: |
| Accepted    |   153 |
| Transformed |    36 |
| Skipped     |     8 |
| Rejected    |     0 |

Mapped users were counted as skipped because the importer requires existing active target users and memberships rather than creating authentication identities.

## Apply

Apply completed in one serializable transaction.

| Outcome     | Count |
| ----------- | ----: |
| Accepted    |   153 |
| Transformed |    36 |
| Skipped     |     8 |
| Rejected    |     0 |

The transaction created one `ImportRun` and one safe aggregate audit event. Audit metadata contained only:

```json
{ "source": "learnspace-export-v1" }
```

## Reconciliation

Target-organization database counts:

| Entity                                                                | Expected | Actual |
| --------------------------------------------------------------------- | -------: | -----: |
| Students                                                              |        7 |      7 |
| Learning journeys                                                     |        4 |      4 |
| Observation assignments, including synthesized historical assignments |        9 |      9 |
| IEPs                                                                  |        3 |      3 |
| Weekly reports                                                        |        3 |      3 |
| Import runs                                                           |        1 |      1 |

Additional checks:

- Import ledger totals matched CLI totals.
- Weekly goal progress IEP/report/goal mismatches: `0`.
- The applied export digest matched the dry-run digest.
- A second identical apply created no new rows and reported `40` top-level source records skipped.
- A changed export with the same source key was rejected before any writes.
- Two different exports with the same source key were applied concurrently against PostgreSQL: one committed, one was rejected, and reconciliation found exactly one import run, seven students, and three IEPs.

## Rollback drill

The pre-import archive was restored into new disposable database `learnspace_import_rollback_20260824`.

Verification:

- All three committed migrations were present and successful.
- Target organization remained present because reference mappings were intentionally part of the pre-import baseline.
- Target import runs after restore: `0`.
- Target students after restore: `0`.

This demonstrates restoration of the recorded pre-apply state without modifying the primary rehearsal database.

## Outcome

- Local Docker rehearsal result: **pass**.
- Dry run, apply, repeated apply, changed-export rejection, reconciliation, backup, restore, and rollback-state verification passed.
- P6-003 implementation is supported by this evidence.
- P6-004 is complete for the requested local Docker scope.
- Before production rollout, repeat the process in staging with an environment-specific writer freeze, application/API workflow verification, database cutover test, named operators, and approver sign-off.
