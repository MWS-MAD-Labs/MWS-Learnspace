# Prototype import rehearsal — YYYY-MM-DD

> Sanitized report only. Do not include student/staff names, emails, phone numbers, addresses, raw exports, credentials, tokens, or unrestricted backup locations.

## Metadata

- Environment:
- Application version / commit:
- PostgreSQL version:
- Export format / version:
- Sanitized export identifier / SHA-256:
- Operators:
- Approver:
- Writer-freeze window:
- Rollback deadline:
- Protected evidence location owner:

## Success criteria

| Entity / workflow                  | Baseline | Expected import | Expected final | Result |
| ---------------------------------- | -------: | --------------: | -------------: | ------ |
| Users mapped                       |          |                 |                |        |
| Students                           |          |                 |                |        |
| Learning journeys                  |          |                 |                |        |
| Observation assignments/results    |          |                 |                |        |
| IEPs/goals                         |          |                 |                |        |
| Weekly reports/progress            |          |                 |                |        |
| Representative authorized workflow |      n/a |            pass |           pass |        |
| Unauthorized access checks         |      n/a |          denied |         denied |        |

Rollback invariants:

- [ ] Migration list matches pre-import state.
- [ ] Baseline record counts are restored.
- [ ] Baseline representative workflows pass.
- [ ] Pre-import probe records and audit state are restored.

## Pre-flight and freeze

- Freeze mechanism and evidence:
- `docker compose ps` summary:
- Migration status:
- `/health/ready` result:
- Baseline count-query evidence:
- Baseline workflow evidence:
- Go/no-go decision, owner, and timestamp:

## Backup

- Command timestamp:
- Sanitized archive identifier:
- SHA-256:
- Archive catalog validation:
- Encryption/access controls:

## Export validation and dry run

- Validation command / tool version:
- Dry-run start/end:
- Organization mapping approval:
- User mapping approval:

| Outcome     | Count |
| ----------- | ----: |
| Accepted    |       |
| Transformed |       |
| Skipped     |       |
| Rejected    |       |

- Sanitized diagnostics:
- Approval to apply, owner, and timestamp:

## Apply

- Apply start/end:
- Exit status:
- Import audit identifier:

| Outcome     | Count |
| ----------- | ----: |
| Accepted    |       |
| Transformed |       |
| Skipped     |       |
| Rejected    |       |

- Sanitized errors/deviations:

## Reconciliation and application verification

- Before/export/after count comparison:
- Duplicate/reference checks:
- Organization ownership checks:
- User/membership mapping checks:
- Observation assignment/result checks:
- IEP/weekly goal checks:
- `/health/ready` result:
- Representative UI/API workflows:
- Authorization negative checks:
- Audit-event inspection:

## Rollback

- Rollback triggered: yes / no
- Decision owner and timestamp:
- Restore target database:
- Checksum/catalog result:
- Restored migration/count/workflow evidence:
- Application cutover/restart evidence:
- Proof pre-import state was restored:

## Outcome and sign-off

- Result: pass / fail
- Deviations:
- Follow-up actions, owners, due dates:
- Artifact retention/deletion decision:
- Sanitization review completed by:
- Operator sign-off:
- Approver sign-off:
