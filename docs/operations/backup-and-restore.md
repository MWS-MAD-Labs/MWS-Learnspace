# PostgreSQL backup and restore

This runbook covers manual logical backups for the Compose PostgreSQL service. It does not provide scheduled backups, object-storage upload, physical backups, or point-in-time recovery.

## Safety guarantees

- Backup source and restore target are always explicit arguments.
- Credentials are read inside the existing `db` container and are never embedded in scripts or command-line URLs.
- Restore targets must be new disposable databases.
- Every restore requires an adjacent `.sha256` sidecar; checksum-less archives are rejected without an unsafe override.
- The restore script refuses the configured primary database and PostgreSQL system databases.
- Neither script removes Compose volumes or modifies the source database.
- Backup files are ignored by Git and created with restrictive permissions.

Backups can contain highly sensitive educational and contact data. Keep them encrypted at rest, restrict access, and never commit or casually copy them.

## Prerequisites

1. Run commands from the repository root.
2. Install Docker with the Compose plugin.
3. Start PostgreSQL and apply committed migrations:

   ```bash
   docker compose up -d db
   docker compose run --rm migrate
   ```

4. Create a protected destination directory:

   ```bash
   mkdir -p backups
   chmod 700 backups
   ```

## Create and verify a backup

```bash
npm run db:backup -- \
  --database learnspace \
  --output ./backups/learnspace-20260819T120000Z.dump
```

The command builds a PostgreSQL custom-format archive and adjacent SHA-256 checksum under temporary names, verifies that `pg_restore` can read the archive catalog, and publishes both only after checksum generation succeeds. Failures remove the temporary pair and roll back any partially published final file, including failure of the second rename, so an archive is never left published without its mandatory sidecar. It refuses to overwrite either final file. `pg_dump` takes a transactionally consistent logical snapshot without stopping PostgreSQL.

Archive inspection is necessary but is not a substitute for a restore drill.

## Restore to a disposable database

```bash
npm run db:restore -- \
  --archive ./backups/learnspace-20260819T120000Z.dump \
  --database learnspace_restore_drill_20260819
```

The target must not already exist. The adjacent `<archive>.sha256` sidecar is mandatory; the command fails before Docker or PostgreSQL access if it is missing. It then validates the whole-file checksum and archive catalog, creates a database from `template0`, restores in one transaction with ownership/privileges omitted, runs `ANALYZE`, and removes the new target automatically if restoration fails.

Verify at minimum:

```bash
docker compose exec -T db psql -U learnspace -d learnspace_restore_drill_20260819 \
  -c 'SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at;'
```

Also compare expected table and fake-record counts, inspect representative rows, and temporarily run API readiness against the restored database when practical. Remove the disposable target after verification; never use `docker compose down --volumes` as part of a drill.

## Encryption and retention

Before moving an archive off-host, encrypt it with an operator-managed tool such as `age`. Keep recipients, private keys, and passphrases outside this repository. Verify decryption before deleting the protected local plaintext.

Deployment owners must document backup frequency, retention duration, storage location, encryption-key owner, operational owner, and intended recovery point/time objectives. These scripts deliberately do not delete old backups.

## Production recovery

Do not restore destructively into a live database by default. Stop writers or enter maintenance mode, capture a final backup, restore into a new database, verify migrations and application readiness, then switch `DATABASE_URL`. Preserve the old database until the rollback window closes.

Per-database `pg_dump` archives do not include cluster roles/tablespaces and do not provide point-in-time recovery. Larger or stricter deployments require additional infrastructure.
