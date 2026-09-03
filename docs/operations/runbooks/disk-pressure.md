# Runbook: disk pressure

- **Severity:** High; Critical when PostgreSQL writes, backup publication, or host stability is at imminent risk.
- **Primary owner:** `TBD: infrastructure on-call`
- **Escalation:** `TBD: hosting/storage owner`, `TBD: database owner`, and `TBD: incident commander`.

## Symptoms

- Host or PostgreSQL volume free space crosses warning/critical thresholds (`TBD`).
- PostgreSQL, image builds, logs, or encrypted backups fail for lack of space.
- Disk use or inode use grows unexpectedly.

## Diagnose

1. Identify the affected filesystem/volume and rate of growth.
2. Attribute use to PostgreSQL data/WAL, container logs, images/build cache, application logs, or backup staging without opening protected backup contents.
3. Check for a database incident, runaway logging, failed cleanup, or repeated backup scheduler execution.
4. Preserve evidence before deleting anything.

## Mitigate

- Stop or throttle the confirmed producer and expand approved storage where possible.
- Remove only artifacts explicitly classified as disposable, such as verified obsolete image/build cache or expired encrypted backups under an approved retention policy.
- Never delete PostgreSQL files, WAL, the named database volume, active logs needed for incident response, encryption identities, or unverified sole backups.
- Treat any plaintext database archive discovered outside an active wrapper process as a security incident: restrict access, record it privately, and remove it after evidence/approval.

## Verify and close

- Free space and inode headroom exceed the approved recovery threshold and remain stable.
- PostgreSQL health, backups, and application readiness succeed.
- Record the source of growth, removed artifacts, retention authority, and capacity follow-up owner.
