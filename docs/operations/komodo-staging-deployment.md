# Komodo staging deployment

This runbook documents the current staging deployment for Learnspace. It intentionally excludes secret values, private infrastructure addresses, and unrestricted operational logs.

## Deployment topology

```text
Internet
  → Cloudflare HTTPS and tunnel
  → Learnspace web host port
  → web container port 8080
  → /api/* and /health/ready
  → api container port 4000
  → PostgreSQL on the internal backend network
```

Current public origin:

```text
https://learnspace-stg.mws.web.id
```

PostgreSQL must not publish a host port. The API host port is bound to loopback for local operational access; public API requests use the web service's same-origin proxy.

## Komodo Stack configuration

Configure a repository-backed Stack with:

| Setting              | Value                                |
| -------------------- | ------------------------------------ |
| Stack name           | `learnspace-staging`                 |
| Repository           | `MWS-MAD-Labs/MWS-Learnspace`        |
| Branch               | `staging`                            |
| Compose file         | `compose.yaml`                       |
| Auto pull            | Enabled                              |
| Run build            | Enabled                              |
| Webhook              | Enabled, GitHub authentication style |
| Webhook force deploy | Enabled                              |

The repository is public, so source checkout does not require private-repository credentials. Keep GitHub authentication configured for the signed deployment webhook and any operations that require write access.

`Run build` is required because the Compose services use local `build` definitions. Without it, Komodo can pull a new commit while continuing to run images built from an older checkout.

Store only `KEY=value` lines in the Stack Environment field. Do not paste a complete TOML `[[stack]]` resource definition into that field.

## Required environment

Store secret values in Komodo's variable or secret management and interpolate them into the Stack environment.

```env
POSTGRES_DB=learnspace_staging
POSTGRES_USER=learnspace
POSTGRES_PASSWORD=[[learnspace_postgres_secret]]
DATABASE_URL=postgresql://learnspace:[[learnspace_postgres_url_encoded_secret]]@db:5432/learnspace_staging

APP_URL=https://learnspace-stg.mws.web.id
GOOGLE_REDIRECT_URI=https://learnspace-stg.mws.web.id/api/v1/auth/callback

SESSION_SECRET=[[learnspace_staging_session_secret]]
GOOGLE_CLIENT_ID=[[learnspace_staging_google_client_id]]
GOOGLE_CLIENT_SECRET=[[learnspace_staging_google_client_secret]]
AUTH_ADMISSION_MODE=INVITE_ONLY
GOOGLE_ALLOWED_DOMAINS=

SESSION_TTL_HOURS=24
LOG_LEVEL=info
API_PORT=4000
WEB_PORT=3080
```

If the PostgreSQL password is not URL-safe, keep the original password and URL-encoded password in separate protected Komodo values. They must represent the same password.

Keep these variables unset:

```env
VITE_API_BASE_URL
VITE_ENABLE_LEGACY_EXPORT_TOOL
E2E_AUTH_SECRET
E2E_AUTH_USER_EMAIL
ALLOW_DEVELOPMENT_AUTH_PLACEHOLDERS
ALLOW_DATABASE_SEED
```

## GitHub Actions deployment gate

Pushes to `staging` run the following gates before deployment:

1. Prisma validation, generation, and migration deployment against PostgreSQL 16.
2. Formatting, linting, type checking, unit tests, integration tests, and OpenAPI drift checks.
3. Production build, Compose validation, and API/migration/web image builds.
4. Compose-backed attendance E2E tests.
5. Compose-backed administration, Learning Journey, observation, IEP, and weekly-report E2E tests.
6. HMAC-signed Komodo Stack deployment webhook.
7. Public liveness and database-readiness checks.
8. Verification that the development legacy exporter is absent.

Deployment runs only for a push to `staging`, only after all test jobs succeed, and only when the tested commit is still the remote branch tip.

GitHub repository secrets:

```text
KOMODO_WEBHOOK_URL
KOMODO_WEBHOOK_SECRET
```

The webhook URL must be copied from the Komodo Stack's webhook configuration and should target the Stack `deploy` execution.

## Expected deployment order

```text
db healthy
  → migrate exits 0
  → api healthy
  → web healthy
```

The migration service is a successful one-shot container and is expected to remain exited after deployment. A normal healthy Stack therefore has three running services (`db`, `api`, and `web`) plus an exited migration container with exit status `0`.

## Verification

Public checks:

```bash
curl --fail https://learnspace-stg.mws.web.id/health
curl --fail https://learnspace-stg.mws.web.id/health/ready
```

Expected response shapes:

```json
{"status":"live"}
{"status":"ready","dependencies":{"database":"up"}}
```

The standard public API path is same-origin under `/api/`. The unauthenticated deployment readiness probe is `/health/ready`; protected API endpoints may correctly return `401` without a session and must not be used as deployment health checks.

Verify the legacy exporter is absent:

```bash
if curl --fail --silent https://learnspace-stg.mws.web.id/__dev/legacy-export \
  | grep -F 'Legacy browser data export'; then
  echo 'Legacy exporter is incorrectly enabled.' >&2
  exit 1
fi
```

Also verify in Komodo or Docker that:

- the repository checkout matches the expected full commit SHA;
- `db`, `api`, and `web` are running;
- all configured healthchecks report `healthy`;
- `migrate` exited with status `0`;
- restart counts are not increasing;
- web publishes the configured staging host port to container port `8080`;
- API host publication remains loopback-only;
- PostgreSQL has no host port;
- recent logs contain no repeated fatal or migration errors.

## Persistent data and rollback

The named PostgreSQL volume must survive routine deployments. Never use `docker compose down --volumes` for rollback.

Before migration or import rehearsals:

1. freeze writers using the approved staging procedure;
2. create and verify a protected database backup;
3. retain its SHA-256 checksum;
4. restore into a new rollback database during drills or rollback;
5. switch `DATABASE_URL` only after the restored database is verified;
6. preserve the original and failed-import databases until the rollback window closes.

See [`backup-and-restore.md`](backup-and-restore.md) and [`prototype-import-rollout.md`](prototype-import-rollout.md).

## Artifact identity limitation

Komodo currently builds the Compose images on the deployment host. Record the deployed commit and Docker image IDs as evidence, but do not treat local image IDs as registry digests.

Promotion without rebuilding requires a future pipeline that builds once, publishes immutable images to an approved registry, records commit-to-digest provenance, and deploys staging and release environments by digest.
