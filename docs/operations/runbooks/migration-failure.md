# Runbook: migration failure

- **Severity:** High; Critical if production availability or data integrity is affected.
- **Primary owner:** `TBD: release owner`
- **Escalation:** migration author/reviewer, `TBD: database owner`, and `TBD: incident commander` for production impact.

## Symptoms

- The one-shot `migrate` service exits non-zero.
- Deployment does not progress to a ready API.
- Prisma reports a failed or incomplete migration.

## Diagnose

1. Stop the deployment and record commit, migration name, timestamps, exit status, and sanitized error output.
2. Keep application code that requires the new schema out of service.
3. Check Prisma migration status and PostgreSQL logs; determine whether the migration was transactional and whether any statements committed.
4. Review locks, timeouts, disk capacity, incompatible data, and version assumptions.
5. Do not edit an already applied migration or mark it successful without proving the database state.

## Mitigate

- Prefer a reviewed roll-forward migration when state is understood and safely repairable.
- If recovery is required, freeze writers and use a verified pre-change backup to restore into a new database; do not destructively overwrite the primary by default.
- Roll back application artifacts/configuration only when they remain compatible with the actual schema.
- Require database-owner approval for Prisma migration resolution commands in a deployed environment.

## Verify and close

- All committed migrations expected for the deployed application are complete with no unresolved failed entry.
- `/health/ready`, representative workflows, and authorization negative tests pass.
- Record the migration failure mode, data-state proof, recovery decision, timing, and preventive test/change.
