# Runbook: database unavailable

- **Severity:** Critical.
- **Primary owner:** `TBD: database on-call`
- **Escalation:** `TBD: incident commander`, `TBD: hosting/storage owner`, and `TBD: application owner`.

## Symptoms

- `/health/ready` reports the database dependency down.
- PostgreSQL healthcheck fails or the `db` service is stopped/restarting.
- Connections, queries, or transactions fail broadly or time out.

## Diagnose

1. Declare/record the incident and freeze deployments, migrations, imports, and manual database changes.
2. Check `docker compose ps`, PostgreSQL health and restart history, host/volume free space, memory pressure, and recent platform events.
3. Check connection exhaustion, long-running transactions, blocking locks, and storage errors using approved read-only diagnostics.
4. Preserve sanitized logs. Do not expose connection strings, passwords, query parameters containing protected data, or database dumps.
5. Determine whether data storage is intact before restarting anything. Never use `docker compose down --volumes`.
6. If a migration immediately preceded the outage, also follow [migration failure](migration-failure.md).

## Mitigate

- Stop writers or place the application in the approved maintenance mode (`TBD`) when continued writes risk corruption or inconsistent recovery.
- Restore service through a reviewed restart, capacity correction, provider recovery, failover, or restore plan appropriate to the established cause.
- For recovery from backup, restore into a new database, verify it, and switch application configuration only after approval. Preserve the old database through the rollback window.
- Do not run destructive SQL or drop/recreate the primary database during diagnosis.

## Verify and close

- PostgreSQL is healthy and stable, `/health/ready` returns ready, and a representative read/write transaction succeeds.
- Migration status is complete and expected; authorization checks remain enforced.
- Measure actual outage and recovery times. Compare data loss and recovery time with the approved RPO/RTO once owners define them; current values are unresolved.
- Record evidence and follow-up owners. A tabletop plan exists at `../tabletop-exercises/database-outage.md`; it is not an executed exercise.
