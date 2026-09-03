# Encrypted restore drill — YYYY-MM-DD

> **Template only; no drill or sign-off is implied.** Use synthetic data. Keep this record sanitized: no student/staff names, emails, credentials, identity contents, unrestricted storage paths, raw SQL results, or backup contents.

## Approval and objectives

- Environment:
- Application commit/version:
- PostgreSQL version:
- Operators:
- Database owner:
- Key custodian:
- Approver:
- Approved target RPO: `UNRESOLVED until owner supplies value`
- Approved target RTO: `UNRESOLVED until owner supplies value`
- Backup schedule/retention policy reference:
- Drill start timestamp:
- Recovery-time measurement start event:

Blank owners or objectives are blockers to claiming P7-007 acceptance.

## Synthetic recovery-point probe

- Fake-data dataset description:
- Last transaction known included in backup (sanitized ID/time):
- First transaction known excluded from backup (sanitized ID/time):
- Backup creation start/end:
- Encrypted archive identifier (not unrestricted path):
- Encrypted pair present: yes / no
- Backup storage timestamp/provenance:
- Calculated achieved recovery point / data-loss interval:
- RPO result: met / missed / not assessable because target unresolved

## Restore procedure and timing

- Disposable database name (must contain `restore_verify_`):
- Identity access confirmed by authorized custodian at:
- Restore-verification command start:
- Decryption completed (if separately observable):
- PostgreSQL restore completed:
- Built-in verification completed:
- Optional fake-data assertion and expected value:
- Disposable database cleanup confirmed:
- Application cutover/readiness simulation completed:
- Recovery-time measurement end:
- Calculated achieved recovery time:
- RTO result: met / missed / not assessable because target unresolved

## Verification evidence

- Script exit status:
- Sanitized machine-readable status:
- Migration table present: pass / fail
- Successful migrations > 0: pass / fail
- Incomplete migrations = 0: pass / fail
- Application tables > 0: pass / fail
- Expected fake-data boundary: pass / fail
- Representative API readiness/workflow: pass / fail / not run
- Authorization negative check: pass / fail / not run
- Plaintext temporary artifacts absent after exit: pass / fail
- Disposable database absent after exit: pass / fail

## Deviations and risks

- Failures/deviations:
- Any plaintext exposure or unexpected retention (escalate as security incident):
- Key/storage availability gaps:
- Monitoring/alert gaps:
- Risk-register entries added/updated:

## Outcome

- Result: pass / fail / incomplete
- RPO conclusion:
- RTO conclusion:
- Follow-up action, owner, due date:
- Sanitization reviewer:
- Operator acknowledgement:
- Database owner acknowledgement:
- Approver acknowledgement:

Blank acknowledgements mean no sign-off. Store execution evidence separately in the approved protected system and link only a sanitized identifier here.
