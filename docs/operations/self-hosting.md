# Self-hosting Learnspace

This is the primary operator guide for a versioned Learnspace deployment. It covers installation, configuration, TLS/reverse proxying, Google OAuth, upgrades, rollback, migrations, backup/restore, monitoring, and first-response troubleshooting.

Learnspace handles sensitive educational and disability-related information. Do not use real data until the production-readiness checklist has accountable approval. Candidate images are qualification artifacts, not stable releases.

## Supported deployment model

The supported `1.0.0` deployment shape is:

```text
browser -> HTTPS reverse proxy -> web:8080 -> api:4000 -> PostgreSQL 16
```

- Deploy `api`, `web`, and `migration` images from the same candidate/release and pin each by `@sha256:` digest.
- Run exactly one migration job before starting the matching API image.
- Keep PostgreSQL and API metrics on private networks. Do not expose PostgreSQL publicly.
- Terminate TLS at a trusted reverse proxy. The public origin must be one stable HTTPS URL.
- Preserve the PostgreSQL volume during routine deploys and rollbacks.

## Host prerequisites

Use a clean Linux host or VM with:

- Docker Engine and the Compose plugin;
- outbound HTTPS access to GHCR, GitHub/Sigstore verification services, and Google OAuth;
- an operator account permitted to read the Learnspace GHCR packages;
- DNS for the public hostname;
- a TLS-capable reverse proxy or ingress;
- protected secret storage;
- protected backup storage and the approved `age` key material for encrypted backups.

Cosign 3.x and GitHub CLI with attestation support are required on a verification workstation or the deployment host.

## Obtain release files and immutable images

Use the repository files from the approved release commit:

- `compose.release.yaml`;
- `docs/operations/self-hosting.md`;
- `docs/operations/image-verification.md`;
- database scripts under `scripts/` when running repository-provided backup operations.

For each component, obtain the exact digest from the candidate/release evidence:

```env
API_IMAGE=ghcr.io/OWNER/learnspace-api@sha256:...
WEB_IMAGE=ghcr.io/OWNER/learnspace-web@sha256:...
MIGRATION_IMAGE=ghcr.io/OWNER/learnspace-migration@sha256:...
```

Verify checksums, signatures, provenance, source commit, SBOM, and package inventory by following [`image-verification.md`](image-verification.md). Stop if any digest or identity differs. Never replace a digest with `latest`, a branch tag, or an unrecorded local build.

## Configuration reference

Create an operator-owned environment file outside the repository where practical. Restrict it to the service account, for example mode `0600`.

```env
POSTGRES_DB=learnspace
POSTGRES_USER=learnspace
POSTGRES_PASSWORD=REPLACE_WITH_SECRET
DATABASE_URL=postgresql://learnspace:URL_ENCODED_PASSWORD@db:5432/learnspace

API_IMAGE=ghcr.io/OWNER/learnspace-api@sha256:...
WEB_IMAGE=ghcr.io/OWNER/learnspace-web@sha256:...
MIGRATION_IMAGE=ghcr.io/OWNER/learnspace-migration@sha256:...

APP_URL=https://learnspace.example.org
GOOGLE_REDIRECT_URI=https://learnspace.example.org/api/v1/auth/callback
SESSION_SECRET=REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS
GOOGLE_CLIENT_ID=REPLACE_WITH_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=REPLACE_WITH_GOOGLE_CLIENT_SECRET
AUTH_ADMISSION_MODE=INVITE_ONLY
GOOGLE_ALLOWED_DOMAINS=

SESSION_TTL_HOURS=24
TRUSTED_PROXIES=linklocal,uniquelocal
API_RATE_LIMIT_REQUESTS=600
API_RATE_LIMIT_WINDOW_SECONDS=60
AUTH_RATE_LIMIT_REQUESTS=30
AUTH_RATE_LIMIT_WINDOW_SECONDS=60
LOG_LEVEL=info
API_PORT=4000
WEB_PORT=3000
```

Required behavior:

- `DATABASE_URL` must match the database name/user/password and use the Compose hostname `db`.
- URL-encode the password only inside `DATABASE_URL`; `POSTGRES_PASSWORD` retains the literal value.
- `APP_URL` is the only permitted credentialed browser origin and must equal the public HTTPS origin.
- `GOOGLE_REDIRECT_URI` must equal the Google Cloud console redirect URI exactly.
- Generate `SESSION_SECRET` from a cryptographically secure source and keep it independent per environment.
- Choose `DENY_UNKNOWN`, `INVITE_ONLY`, or `ALLOWED_DOMAIN` deliberately. For `ALLOWED_DOMAIN`, set the reviewed comma-separated domain allowlist.
- Set `TRUSTED_PROXIES` only to the immediate proxy ranges. Never use universal proxy trust.
- Do not set `ALLOW_DEVELOPMENT_AUTH_PLACEHOLDERS`, `ALLOW_DATABASE_SEED`, `E2E_AUTH_SECRET`, `E2E_AUTH_USER_EMAIL`, `VITE_API_BASE_URL`, or `VITE_ENABLE_LEGACY_EXPORT_TOOL` in production.

Startup validation names missing/invalid fields without printing their values. Treat validation failure as a deployment failure; do not weaken the schema or insert placeholder secrets.

## Reverse proxy and TLS

Expose only the web service to the reverse proxy. Route the complete public origin to web port `8080` (or the configured host `WEB_PORT`). The web container serves the SPA, `/health`, and same-origin `/api/*` proxying. Do not create a separate public API origin.

Minimum proxy requirements:

- HTTPS only, with HTTP redirected to HTTPS;
- a currently trusted certificate and automated renewal;
- preserve `Host` and normal forwarding headers;
- forward the original scheme as HTTPS;
- do not proxy public requests to API `/metrics`;
- set upload/body limits consistent with the application `100kb` JSON limit;
- do not rewrite or log OAuth query values such as `code` and `state`;
- restrict administrative dashboards and container ports at the firewall.

After proxy changes, verify the restrictive application security headers and Google OAuth initiation/callback behavior. Broad CSP or CORS wildcards are not supported.

## Google OAuth

Follow [`../auth/google-oauth.md`](../auth/google-oauth.md) for client creation, admission modes, redirect URIs, and rotation. Use a separate Google OAuth client per environment.

Before opening access:

1. register the exact HTTPS callback URI;
2. store the client secret only in the deployment secret manager;
3. test a known admitted synthetic account;
4. test unknown and disabled account denial;
5. confirm logout and session revocation;
6. confirm OAuth codes, state, cookies, emails, and tokens are absent from retained logs.

Do not create an authentication bypass for provider outages.

## Clean installation

From a directory containing `compose.release.yaml` and the protected environment file:

```bash
docker compose --env-file /protected/path/learnspace.env \
  -f compose.release.yaml config --quiet

docker compose --env-file /protected/path/learnspace.env \
  -f compose.release.yaml pull
docker compose --env-file /protected/path/learnspace.env \
  -f compose.release.yaml up -d --wait --wait-timeout 240
```

Expected order:

```text
db healthy -> migration exits 0 -> api healthy -> web healthy
```

Verify:

```bash
curl --fail https://learnspace.example.org/health
curl --fail https://learnspace.example.org/health/ready
curl --fail https://learnspace.example.org/api/v1/version
docker compose --env-file /protected/path/learnspace.env \
  -f compose.release.yaml ps -a
```

A healthy deployment has `db`, `api`, and `web` running and healthy, plus `migrate` exited with status `0`. Confirm the resolved images exactly match the approved digests:

```bash
docker compose --env-file /protected/path/learnspace.env \
  -f compose.release.yaml config --images
```

Record the source commit, all three digests, migration result, health responses, verifier, deployment time, and environment identifier in sanitized deployment evidence.

## Upgrade procedure

Do not upgrade until the release qualification report declares the source version supported and states rollback constraints.

1. Announce/freeze writes using the approved operational procedure.
2. Verify current health, disk capacity, database version, application version, and current image digests.
3. Create an encrypted backup and verify its checksum/catalog.
4. When required by policy, restore the backup into a disposable database before proceeding.
5. Prepare a new environment file containing all three new image digests and any documented configuration changes.
6. Pull and verify the new digests without removing current containers or volumes.
7. Stop application writers while preserving PostgreSQL.
8. Run the new migration image once.
9. Start the matching API and web images.
10. Verify readiness, login, least-privilege role behavior, core workflows, metrics, logs, and alerts.
11. Keep the previous image digests and pre-upgrade backup protected until the rollback window closes.

Example deployment commands after the backup and change approval:

```bash
docker compose --env-file /protected/path/learnspace.env \
  -f compose.release.yaml pull
docker compose --env-file /protected/path/learnspace.env \
  -f compose.release.yaml up -d --wait --wait-timeout 240
```

Prisma migrations are immutable and use `migrate deploy`; never use `prisma db push` in a shared environment.

## Rollback and database recovery

Application rollback is safe only when the release notes explicitly say the preceding application can run on the migrated schema. Otherwise, rollback requires database restoration.

Preferred recovery model:

1. stop writers;
2. preserve the failed database and its logs;
3. restore the verified pre-upgrade backup into a new database;
4. run integrity/migration/application readiness checks against the restored database;
5. point the previous digest-pinned stack to the restored database;
6. reopen traffic only after accountable approval.

Never run `docker compose down --volumes` during rollback. Do not edit or delete an applied Prisma migration. Use the migration-failure runbook for partial/failed deployment analysis.

## Backup and restore

Follow [`backup-and-restore.md`](backup-and-restore.md) and [`encrypted-backups.md`](encrypted-backups.md). Production policy must define:

- numeric RPO and RTO;
- schedule and non-overlap behavior;
- protected destination and transfer method;
- retention, deletion, and legal-hold rules;
- encryption key owner, deputies, recovery, rotation, and revocation;
- missed-run/failure alerting;
- timed restore-drill frequency.

Repository scripts fail closed on missing checksums and unsafe restore targets. A backup is not qualified until it has been restored into a disposable database and application readiness/data checks have passed.

## Monitoring and alerts

Scrape API `/metrics` only over a private network as documented in [`observability.md`](observability.md). Configure dashboards and alerts from [`alerts.md`](alerts.md), replacing every `TBD` with reachable named owners, thresholds, and escalation routes.

At minimum monitor:

- public liveness and database readiness;
- HTTP status classes and latency;
- login failures and authorization denials;
- database connection utilization and scrape success;
- migration job result;
- PostgreSQL/container/storage health;
- backup completion, age, and restore-drill status;
- container restarts and resource pressure.

Safely trigger each alert in staging and capture a sanitized test notification before production approval.

## Troubleshooting

| Symptom                  | First checks                                                                                         | Runbook                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Public site unavailable  | Reverse proxy/TLS, web health, web-to-API proxy, recent deployment                                   | [`runbooks/api-unavailable.md`](runbooks/api-unavailable.md)                                                                         |
| `/health/ready` is `503` | PostgreSQL health/storage/connections, migration state, API logs by request ID                       | [`runbooks/database-unavailable.md`](runbooks/database-unavailable.md)                                                               |
| Migration exits non-zero | Preserve output, stop rollout, inspect `_prisma_migrations`, choose reviewed roll-forward or restore | [`runbooks/migration-failure.md`](runbooks/migration-failure.md)                                                                     |
| Login failures rise      | Google status, exact redirect URI, client/secret rotation, clock, admission state                    | [`runbooks/elevated-login-failures.md`](runbooks/elevated-login-failures.md), [`runbooks/oauth-outage.md`](runbooks/oauth-outage.md) |
| Backup missing/failed    | Scheduler result, database availability, destination capacity, `age` recipient, alert route          | [`runbooks/backup-failure.md`](runbooks/backup-failure.md)                                                                           |
| Disk pressure            | Attribute database/log/image/backup growth; preserve PostgreSQL volume                               | [`runbooks/disk-pressure.md`](runbooks/disk-pressure.md)                                                                             |

When collecting evidence, never include cookies, OAuth codes, tokens, secrets, real student data, private database dumps, or unredacted logs.

## Clean-host rehearsal checklist

A new operator must complete this on a disposable clean host before `1.0.0` approval:

- [ ] install prerequisites using only published documentation;
- [ ] verify all image signatures, provenance, checksums, SBOMs, and digests;
- [ ] create configuration without undocumented variables;
- [ ] deploy a fresh database and digest-pinned stack;
- [ ] verify migration, health, version, security headers, and OAuth;
- [ ] restart API, web, database, and the full stack without deleting volumes;
- [ ] perform the supported-version upgrade using a verified backup;
- [ ] execute and time an encrypted restore drill;
- [ ] verify private metrics, dashboards, test alerts, and redaction;
- [ ] record blockers, corrections to documentation, operator, environment, and timestamps.

Completion is evidence for P8-001/P8-003; it does not itself approve P7-005 through P7-010 or production readiness.
