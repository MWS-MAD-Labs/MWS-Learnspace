# Staging deployment evidence — 2026-08-29

## Scope

This sanitized record captures the staging deployment evidence requested for commit `139f1e7b23e590816a286a131a3e664edc448ef5` (`Expose staging readiness through web proxy`). It does not contain credentials, webhook secrets, database contents, or unrestricted infrastructure details.

## Deployment identity

| Field                                  | Recorded value                                                                  | Provenance                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Repository                             | `faisalnh/MWS-Learnspace` (historical owner; now `MWS-MAD-Labs/MWS-Learnspace`) | GitHub Actions run metadata and subsequent repository transfer                                            |
| Branch                                 | `staging`                                                                       | GitHub Actions run metadata                                                                               |
| Commit                                 | `139f1e7b23e590816a286a131a3e664edc448ef5`                                      | Git and GitHub Actions run metadata                                                                       |
| Workflow                               | `CI`                                                                            | GitHub Actions                                                                                            |
| Run                                    | `33235742175`, attempt 2                                                        | GitHub Actions API                                                                                        |
| Workflow result                        | `success`                                                                       | GitHub Actions API                                                                                        |
| Deployment job                         | `Deploy staging through Komodo`                                                 | GitHub Actions API                                                                                        |
| Deployment job interval                | `2026-08-29T07:05:33Z`–`2026-08-29T07:05:41Z`                                   | GitHub Actions API                                                                                        |
| Signed webhook accepted                | HTTP `200` at `2026-08-29T07:05:37Z`                                            | GitHub Actions job log                                                                                    |
| Komodo webhook authentication evidence | `2026-08-29T05:34:45.327508Z` for stack `learnspace-staging`                    | Retained Komodo Core log; this is an earlier historical trigger and is not the attempt-2 GitHub timestamp |

The repository value above preserves the owner recorded at the time of the run. The repository was subsequently transferred to the `MWS-MAD-Labs` organization and made public; the commit and run metadata remain point-in-time evidence.

The GitHub deployment step completed successfully at `2026-08-29T07:05:41Z`. GitHub Actions reported staging ready at `2026-08-29T07:05:38Z`.

## Verified staging hardening snapshot — 2026-08-31

Before this documentation update was committed, the following later staging hardening deployment was verified:

| Field              | Verified value                                                                |
| ------------------ | ----------------------------------------------------------------------------- |
| Commit             | `b35533701599c29c292b0ac7c4ebc428bfaefd44` (`fix: restrict API host binding`) |
| GitHub Actions run | `33347567800`                                                                 |
| Workflow result    | `success`                                                                     |
| Komodo checkout    | Exact commit match                                                            |
| Web image ID       | `sha256:1d94e2ecbb04b1f86a6966aef1b273758274ad1cd50ca9994831c403fa10d994`     |
| API image ID       | `sha256:59d56fba32c35960b10229db359a408f42b281d2349448544164cbbed7d1f522`     |
| Migration image ID | `sha256:423e1b2c013c2129292fd4f0db06eb1504a0365607f388b7d28865de2a77ae53`     |
| Database image ID  | `sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685`     |

At snapshot time, `web`, `api`, and `db` were running with healthy Docker healthchecks and zero restarts. The `migrate` one-shot container had exited successfully. The API host publication was restricted to loopback, PostgreSQL had no host publication, and public traffic used the web service through the Cloudflare-managed HTTPS route. Later documentation-only pushes may advance the deployed commit and rebuild local image IDs; this table remains point-in-time evidence for `b355337`.

See [`komodo-staging-deployment.md`](komodo-staging-deployment.md) for the reusable configuration and verification runbook.

## Historical local image IDs

The following values were supplied by the operator as Docker **local image IDs** for the historical deployment. They are not registry digests:

| Image     | Historical local image ID |
| --------- | ------------------------- |
| Web       | `sha256:5e307a338d3e…`    |
| API       | `sha256:9c056de39778…`    |
| Migration | `sha256:15cb1f350ffe…`    |

These historical IDs are recorded exactly as supplied. They are no longer present in the Komodo host's current Docker image store because later deployments replaced the stack images, so their full IDs could not be independently expanded or re-inspected on 2026-08-31.

## Migration result

- Historical requested migration result: exit status `0`.
- The historical migration container has been replaced by a later deployment, so its original container state is no longer available for direct inspection.
- The current staging migration container also exits with status `0`, and the database currently reports all 11 committed migrations completed with none rolled back.

## Health checks

### Deployment workflow checks

Attempt 2 of GitHub Actions run `33235742175` recorded these steps as successful:

- `Wait for staging web and API readiness`
- `Verify legacy exporter is disabled`

The workflow checks required:

- `/health` to return a successful HTTP response;
- `/health/ready` to contain `"status":"ready"`;
- the development legacy-export route not to contain the `Legacy browser data export` marker.

### Post-deployment verification

Rechecked again after the current hardening deployment on `2026-08-31`:

| Check                                                | Result                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------- |
| `GET https://learnspace-stg.mws.web.id/health`       | HTTP `200`, `{"status":"live"}`                                   |
| `GET https://learnspace-stg.mws.web.id/health/ready` | HTTP `200`, `{"status":"ready","dependencies":{"database":"up"}}` |
| Legacy exporter marker                               | Absent                                                            |

These health results show that staging was operational at the recorded verification time. They do not establish that the historical local image IDs listed below remain active after later deployments.

## Operator approval

- Operator: Faisal, active staging `DIRECTOR` / `Staging Administrator`.
- Approval basis: the operator explicitly requested that this deployment evidence be recorded in the operations documentation.
- Approval recorded at: `2026-08-31T02:45:11Z`.
- Approval scope: record the supplied commit, historical local image ID prefixes, deployment timing, migration result, health-check evidence, and artifact-promotion limitation.

## Artifact promotion limitation

The recorded image identifiers are Docker local image IDs, not immutable registry digests. The current deployment process rebuilds images on the Komodo host. It therefore cannot guarantee promotion of the exact same image artifacts to a later release such as `0.9.0-beta.1`.

A future CI/CD improvement should:

1. build each image once in CI;
2. publish it to an approved registry under an immutable content digest;
3. record commit-to-digest provenance;
4. deploy staging and release environments by digest; and
5. promote the same verified digests without rebuilding.
