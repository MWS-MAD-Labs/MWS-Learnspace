# Encrypted backups and restore verification

## Scope and current status

The new scripts are fail-closed wrappers around the existing `scripts/db-backup.sh` and `scripts/db-restore.sh`. They add `age` encryption and disposable restore verification; they do not implement a scheduler, remote storage client, retention deletion, key management, or production cutover.

Required owner decisions remain unresolved:

| Input                                              | Status |
| -------------------------------------------------- | ------ |
| Backup operational owner/on-call                   | `TBD`  |
| Source database per environment                    | `TBD`  |
| Schedule and scheduler platform                    | `TBD`  |
| Target RPO                                         | `TBD`  |
| Target RTO                                         | `TBD`  |
| Protected backup location and access owner         | `TBD`  |
| Retention/legal-hold policy                        | `TBD`  |
| `age` identity/key custodian and recovery deputies | `TBD`  |
| Restore-drill frequency and approver               | `TBD`  |
| Alert/status destination                           | `TBD`  |

Until these are approved and a timed fake-data drill measures them, P7-007 acceptance is not demonstrated.

## Safety properties

- The existing scripts retain database-name, checksum, archive-catalog, new-target, protected-database, and transactional restore guards.
- `AGE_RECIPIENT` and `AGE_IDENTITY_FILE` are operator-configured literal environment values. The wrappers quote them and never evaluate them as shell code.
- A successful backup publishes two mandatory ciphertext files: `<name>.dump.age` and `<name>.dump.age.sha256.age`.
- The plaintext archive and checksum exist only in a private `mktemp` directory with `umask 077` and are removed on success, error, or handled signal.
- Ciphertext is built under a private directory on the destination filesystem and rolled back if the pair cannot be published.
- Restore requires both ciphertext files and a readable identity file. There is no checksum-less or unencrypted override.
- Restore verification requires a new database name containing `restore_verify_` and drops it on success or failure.
- Scripts emit one-line JSON success/failure status where practical, while detailed diagnostics remain on stderr. These lines can feed a scheduler/alert adapter.

Encrypted backups still contain highly sensitive student, family, educational, disability, identity, and audit information. Encryption does not replace access control, retention, monitoring, or tested key recovery.

## Prerequisites

1. Run from the repository root with the Compose `db` service healthy.
2. Install a reviewed `age` CLI version on the operator/scheduler host.
3. Create a protected destination (`0700`) on an approved encrypted filesystem.
4. Inject the recipient or identity path through the operator's secret/configuration system. Do not commit them, place them in command history, or print them in job logs.

## Create an encrypted backup

```bash
AGE_RECIPIENT='age1...operator-configured-recipient' \
  sh scripts/db-backup-encrypted.sh \
  --database learnspace \
  --output ./backups/learnspace-20260902T120000Z.dump.age
```

Expected final pair:

```text
learnspace-20260902T120000Z.dump.age
learnspace-20260902T120000Z.dump.age.sha256.age
```

Do not rename or separate the pair. The command refuses overwrite; use a unique timestamped path for each run. Success ends with:

```json
{ "status": "ok", "operation": "encrypted_backup" }
```

## Restore to a new database

```bash
AGE_IDENTITY_FILE='/operator-managed/path/learnspace-age-identity.txt' \
  sh scripts/db-restore-encrypted.sh \
  --archive ./backups/learnspace-20260902T120000Z.dump.age \
  --database learnspace_restore_drill_20260902
```

The identity path must be readable only by the intended operator/service account. The wrapper decrypts into private temporary storage, delegates checksum/catalog/restore checks to the existing restore script, and removes plaintext before exit. The restored database remains for operator verification and must be removed through the existing restore instructions.

## Automated disposable restore verification

```bash
AGE_IDENTITY_FILE='/operator-managed/path/learnspace-age-identity.txt' \
RESTORE_VERIFY_SQL='SELECT count(*) FROM "Organization"' \
RESTORE_VERIFY_EXPECTED='1' \
  sh scripts/db-restore-verify.sh \
  --archive ./backups/learnspace-20260902T120000Z.dump.age \
  --database learnspace_restore_verify_20260902
```

The built-in checks require the Prisma migration table, at least one successful non-rolled-back migration, no incomplete migration, and at least one application table. `RESTORE_VERIFY_SQL` and `RESTORE_VERIFY_EXPECTED` are optional but must be set together. They are literal operator configuration passed to `psql`; therefore the operator must use reviewed read-only SQL with no secrets in its text or result. The disposable database is dropped even when verification fails.

Success includes elapsed wall-clock seconds:

```json
{ "status": "ok", "operation": "restore_verify", "elapsed_seconds": 42 }
```

A scheduled verifier should treat any non-zero exit, missing success line, timeout, or cleanup failure as an alert. It must not log environment values or decrypted content.

## Scheduling, transfer, and retention

Use the deployment platform's scheduler with:

- a dedicated least-privileged service account;
- literal environment injection and protected logs;
- non-overlapping execution/locking supplied by the scheduler;
- timeout and missed-run detection;
- upload of both ciphertext files to the approved protected location;
- integrity/size evidence after transfer;
- retention deletion only after owner approval, successful recent restore verification, and legal-hold checks; and
- alert routing per [`alerts.md`](alerts.md) and [`runbooks/backup-failure.md`](runbooks/backup-failure.md).

The repository scripts deliberately do not guess a schedule, retention count, cloud destination, or deletion rule.

## Timed restore drill

Use [`restore-drills/template.md`](restore-drills/template.md) with fake data. Measure:

- recovery point: timestamp of the newest committed fake-data transaction absent/present in the selected backup;
- recovery time: incident/drill start through verified application-ready restored service, not merely `pg_restore` duration;
- decryption/restore verification elapsed time and cleanup result; and
- whether key custodians and backups were actually reachable.

Do not mark RPO/RTO met until targets are owner-approved and a dated drill supplies evidence.
