# Prototype export, import, and controlled rollout

This runbook governs migration of approved browser-prototype data using the versioned `learnspace-export` format. Export files contain highly sensitive educational, guardian, disability, accommodation, observation, IEP, and staff data.

## Safety rules

- Never attach an export to tickets, chat, email, CI logs, or source control.
- Store exports and backups only in an approved encrypted location with restricted access.
- Use a dedicated staging organization and database before any production rollout.
- Freeze writers before backup and keep them frozen through reconciliation or rollback.
- Invalid exports must not be edited by hand to bypass validation. Correct the source or use a reviewed deterministic transformation.
- Never claim a rehearsal passed without timestamped evidence and named approval.

## Create a browser export

The browser exporter is deliberately absent from normal and production UI. Run the web application in development with the explicit opt-in flag:

```bash
VITE_ENABLE_LEGACY_EXPORT_TOOL=true npm run dev
```

Open <http://localhost:3000/__dev/legacy-export> in the browser profile containing the legacy data. The page reads the exact legacy `localStorage` keys directly, validates the version 1 document, and downloads it locally without network transmission.

The generated filename includes `SENSITIVE`. Move it immediately to approved encrypted storage.

## Administrative importer

The importer requires an operator-approved manifest containing existing target user/membership IDs and academic reference mappings. The manifest and export are sensitive operational artifacts and must not be committed.

Dry run:

```bash
npm run db:import -- \
  --file /approved/protected/learnspace-export-v1-SENSITIVE.json \
  --manifest /approved/protected/import-manifest-SENSITIVE.json \
  --dry-run
```

Apply requires explicit organization confirmation:

```bash
npm run db:import -- \
  --file /approved/protected/learnspace-export-v1-SENSITIVE.json \
  --manifest /approved/protected/import-manifest-SENSITIVE.json \
  --apply \
  --confirm-organization TARGET_ORGANIZATION_UUID
```

The manifest shape is:

```json
{
  "targetOrganizationId": "UUID",
  "sourceKey": "legacy-browser-v2",
  "operatorUserId": "UUID",
  "enrollmentAcademicYear": "2026-2027",
  "users": {
    "source-user-id": {
      "targetUserId": "UUID",
      "targetMembershipId": "UUID"
    }
  },
  "academicYears": { "2026-2027": "UUID" },
  "semesters": { "2026-2027::Semester 1": "UUID" },
  "units": { "Elementary": "UUID" },
  "grades": { "Grade 1": "UUID" },
  "classes": { "1-A Sequoia": "UUID" },
  "subjects": { "Physical Education": "UUID" }
}
```

Dry run executes the exact database persistence plan inside a serializable transaction and deliberately rolls it back. Apply repeats target validation, writes all imported records and the import ledger atomically, and appends a safe aggregate audit event. An exact repeated export is skipped; a changed export using an already applied source key is rejected rather than overwriting migrated data.

The importer is strictly fail-closed: malformed, unmapped, conflicting, or otherwise invalid input throws an actionable error and the complete transaction is rolled back. Before either dry-run or apply opens a database transaction, it normalizes each weekly report from `weekStart` to an ISO year/week and Monday–Friday range, then rejects any source reports for the same student that collapse to the same normalized key. The error names the conflicting source report IDs so operators can resolve or merge them at the source. Successful reports therefore have `rejected: 0`; the field is reserved for a future reviewed partial-import policy. Operators must treat any nonzero CLI exit as a rejected import and must not proceed to apply.

## Local Docker rehearsal

The local override uses the disposable E2E PostgreSQL service and a Docker-managed artifact volume. Run commands from the repository root:

```bash
COMPOSE_PROJECT_NAME=learnspace-import-local \
  docker compose -f compose.e2e.yaml -f compose.import-local.yaml \
  up -d --wait db

COMPOSE_PROJECT_NAME=learnspace-import-local \
  docker compose -f compose.e2e.yaml -f compose.import-local.yaml \
  run --rm --build migrate

COMPOSE_PROJECT_NAME=learnspace-import-local \
  docker compose -f compose.e2e.yaml -f compose.import-local.yaml \
  run --rm --build --no-deps fixture \
  npm run db:import:prepare-local -- /import-artifacts/rehearsal
```

The preparation command generates a random target organization UUID unless `IMPORT_REHEARSAL_ORGANIZATION_ID` is explicitly supplied. It writes fake-seed export and manifest artifacts only to `/import-artifacts/rehearsal` inside the disposable Docker volume.

Run the generated export through the CLI in the same Compose project:

```bash
COMPOSE_PROJECT_NAME=learnspace-import-local \
  docker compose -f compose.e2e.yaml -f compose.import-local.yaml \
  run --rm --no-deps fixture \
  npm run db:import -- \
  --file /import-artifacts/rehearsal/learnspace-export-v1-SENSITIVE.json \
  --manifest /import-artifacts/rehearsal/import-manifest-SENSITIVE.json \
  --dry-run
```

Read `/import-artifacts/rehearsal/organization-id.txt` inside the fixture container and use that UUID with `--apply --confirm-organization UUID`. Verify the selected Compose project before using `docker compose down --volumes`; that command permanently removes the disposable database and artifact volume.

## Rehearsal procedure

### 1. Record metadata and success criteria

Copy `docs/operations/prototype-import-rehearsal-template.md` to a dated sanitized report. Record:

- application version and commit;
- PostgreSQL version and target environment;
- operators, approver, freeze window, and rollback deadline;
- expected collection and database counts;
- representative workflows and rollback invariants.

### 2. Freeze and baseline

1. Enable the environment-specific maintenance/writer freeze.
2. Confirm no background writer remains active.
3. Record `docker compose ps`, migration status, readiness, database counts, and representative workflow results.
4. Obtain the named go/no-go approval.

The repository does not provide a universal maintenance-mode switch; deployment owners must document the environment-specific mechanism in the rehearsal report.

### 3. Back up

Follow `docs/operations/backup-and-restore.md`:

```bash
mkdir -p backups
chmod 700 backups
npm run db:backup -- \
  --database learnspace \
  --output ./backups/learnspace-pre-import-YYYYMMDDTHHMMSSZ.dump
```

Record the archive path or protected identifier, adjacent SHA-256 value, catalog-validation result, and timestamp. Do not put credentials or unrestricted storage locations in the sanitized report.

### 4. Validate and dry run

The approved administrative importer must validate file bytes before parsing, parse `learnspace-export` version 1, resolve organization and user mappings, and report accepted, transformed, skipped, and rejected counts without writing.

The current importer is fail-closed, so an invalid record aborts the command instead of producing a partial report. Do not proceed when the command exits nonzero, a mapping is ambiguous, or the target organization differs from the approved destination.

### 5. Apply

Run apply only after dry-run output is attached and approved. The apply operation must repeat database-dependent checks and commit all writes and audit metadata atomically. Record the command, timestamps, summary, and exit status without copying sensitive record bodies into the report.

### 6. Reconcile

Compare export, pre-import, and post-import counts by entity. Verify at minimum:

- no duplicate natural keys or source mappings;
- all imported records belong to the approved organization;
- all staff/user references resolve to active target memberships;
- observation assignments and results reconcile;
- IEP goals and weekly progress references reconcile;
- `/health/ready` succeeds;
- representative authorized UI/API workflows succeed;
- the import audit entry contains only safe aggregate metadata.

### 7. Roll back

If any acceptance criterion fails:

1. Keep writers frozen.
2. Restore the pre-import archive into a new database using `npm run db:restore`.
3. Verify checksum, migrations, baseline counts, and representative workflows.
4. Switch the application `DATABASE_URL` to the restored database using the environment-specific deployment procedure.
5. Restart and verify readiness.
6. Preserve the failed-import database until investigation and the rollback window close.

Never use `docker compose down --volumes` as a rollback mechanism.

### 8. Close the rehearsal

Record pass/fail, deviations, follow-up owners and dates, artifact retention, sanitization review, and approver sign-off. Keep raw command output in the approved protected evidence location; include only sanitized summaries in Git.

## Weekly-report ISO week normalization

Before applying `20260827040000_authorized_aggregates` (the timezone and weekly-report normalization migration) to a database containing weekly reports:

1. Audit weekly reports grouped by organization, student, and the ISO Monday derived from `weekStart`. Resolve any groups with more than one report; the migration intentionally aborts rather than merge ambiguous reports.
2. Back up the database. The migration treats the existing `weekStart` as the source of truth, normalizes it to that ISO week's Monday, sets `weekEnd` to Friday, and derives `year` and `weekNumber` using PostgreSQL `ISOYEAR`/`WEEK` semantics. It does not preserve legacy academic or locale-specific week numbers.
3. Verify representative historical reports after migration, especially ISO weeks crossing calendar-year boundaries. API create/update contracts require the submitted ISO year/week to match `weekStart` and require the exact Monday–Friday range. The import service performs the same normalization for prototype exports and preflights normalized-key collisions before database work.
4. Keep the pre-migration backup until workflow and goal-projection verification passes.

## Organization timezone backfill

The `20260827040000_authorized_aggregates` migration adds `Organization.timezone` with a safe `UTC` default. The following `20260827050000_aggregate_search_indexes` migration adds `pg_trgm` and the aggregate/search indexes. Operators must set each existing school's actual IANA timezone before enabling dashboards, attendance summaries, search, or action-item queries in staging or production.

1. Inventory every organization and obtain an approved IANA identifier such as `America/Los_Angeles`, `Asia/Jakarta`, or `Pacific/Auckland`.
2. As an organization administrator, update the timezone through `PATCH /api/v1/organizations/{organizationId}/settings` or the **People & access → School timezone** control. The API rejects invalid timezone identifiers.
3. Verify the dashboard `attendance.schoolDate` around local midnight and confirm date-effective enrollments and staff assignments use the expected school date.
4. Record the configured timezone and verification evidence in the rollout log. Do not leave a non-UTC school on the migration's `UTC` default.

## Current implementation status

The repository includes the version 1 export contract, development-only browser exporter, database-mutating administrative importer, import ledger, and a sanitized local Docker rehearsal report at `docs/operations/prototype-import-rehearsal-2026-08-24-local.md`.

P5-013 is complete: sensitive browser persistence, automatic domain seed initialization, production reset controls, and obsolete browser-only domain paths have been removed. The verified Komodo staging deployment and CI/CD path are documented in `docs/operations/komodo-staging-deployment.md`, with sanitized deployment evidence in `docs/operations/staging-deployment-evidence-2026-08-29.md`.

The staging environment is ready for the controlled import rehearsal once the approved sensitive export, manifest, writer-freeze window, protected backup location, mapped target records, and named operators are available. Production rollout still requires a completed staging import and rollback rehearsal, reconciled results, retained evidence, and approver sign-off.
