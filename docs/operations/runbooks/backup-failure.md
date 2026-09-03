# Runbook: backup failure

- **Severity:** High; Critical only when the approved RPO is exceeded or no recoverable backup remains.
- **Primary owner:** `TBD: backup operator`
- **Escalation:** `TBD: database owner`, `TBD: encryption-key custodian`, and `TBD: incident commander` when recovery objectives are at risk.

## Symptoms

- `db-backup-encrypted.sh` exits non-zero or emits `{"status":"failed","operation":"encrypted_backup"}`.
- A scheduled backup is late/missing or only one encrypted artifact is present.
- Destination, `age`, database, or storage validation fails.

## Diagnose

1. Record scheduler time, exit status, sanitized stderr, database name, and destination identifier. Never record secrets, identity contents, or database data.
2. Confirm the Compose database is healthy and the source database exists.
3. Confirm `age`, free space, destination permissions, and the literal `AGE_RECIPIENT` supplied by the secret/configuration system.
4. Verify no output collision occurred. The wrapper refuses overwrite and treats an archive plus `<archive>.sha256.age` as one required pair.
5. Check that the intended recipient still corresponds to a recoverable identity held by the designated custodian; do not print either value.

## Mitigate

- Correct the root cause and create a new encrypted backup under a new timestamped name.
- Do not move plaintext archives off-host, disable encryption, reuse partial output, or delete the latest known-good backup.
- If the approved RPO may be exceeded, escalate immediately and record the oldest safe recovery point.

## Verify and close

- Both encrypted artifacts exist in protected storage and the command emitted machine-readable success.
- Run scheduled restore verification according to policy and retain only sanitized timing/result evidence.
- Confirm retention did not delete the last known-good or legally held backup.
- Record missed recovery points and follow-up owners. RPO, schedule, retention, storage location, and key owner are currently unresolved inputs.
