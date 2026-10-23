# Central shared-session migration

This runbook covers the Exima-style Learnspace integration with `mws-central-auth` `0.10.0`. Authoritative shared login is implemented behind `SHARED_SESSION_MODE=shared`, but it is not yet evidenced for staging or production. Local Google OAuth and PostgreSQL sessions remain in the codebase and environment contract as rollback infrastructure until the cutover evidence and rollback window are complete.

The package is pinned to tag `v0.10.0`; the lockfile currently resolves commit `ecde97da31492bf4bc0ecba196a688af4ba466ef`. All Learnspace workspaces use Zod 4.

## Current state

Implemented foundations:

- `HUB_SSO_APP_ID` is the canonical application ID. `CENTRAL_APPLICATION_ID` is a legacy alias, and configuration fails when both are set to different values.
- `Organization.centralOrganizationId` persists a unique one-Central-organization-to-one-local-organization mapping. `SHARED_SESSION_LOCAL_ORGANIZATION_ID` is an optional migration hint used only while claiming that mapping.
- `ExternalPrincipal` maps a local `User` to immutable Central `(issuer, subject)` identity. On the first valid employee login, Learnspace can automatically create or reuse the local user, create a verified principal, and create or update the local membership.
- Only Hub `employee` identities are currently supported. `intern` and `student` identities are denied before projection.
- Shared authentication requires an active entitlement with exact role-permission parity: no missing, extra, unknown, or duplicate permission keys.
- Central supplies role and coarse permissions; PostgreSQL remains authoritative for local organization and record scopes. Scoped roles may have empty local scope arrays, which grant no broader record access.
- The backfill CLI supports dry-run and apply with explicit conflict counts. Central access reconciliation is a separate manual dry-run/apply command.
- `HubIdentityVerifier`, `LocalSessionAdapter`, and `PrincipalContextLoader` support comparison mode, while `SharedSessionAuthenticationService` is the authoritative shared path.
- `SHARED_SESSION_MODE=shadow` observes after local authentication and cannot authorize, deny, or delay the request.
- `permissions:check` and `permissions:sync` compare and publish the typed permission manifest.
- `shared-session:readiness` performs a read-only aggregate cutover diagnostic.
- `/api/v1/auth/bootstrap` is public and returns only the auth mode and Hub home URL. The browser performs one automatic shared restore attempt, uses `keepFresh` and `watchSession` after authentication, and preserves the exact return route.
- Shared auth returns `401` for an absent/ended identity, `403` for a valid identity without acceptable application access, and `503` when Hub/Central is required but unavailable. The web maps these to restore/Hub navigation, access-denied, and retry UX respectively.
- Shared navigation exposes Back to MWS Hub only; it does not present an app-owned shared sign-out action.
- The host-only readable CSRF cookie is created only when absent or malformed and remains stable across repeated session reads.
- Shared dependency readiness is passive: recent observed Hub/Central failures affect readiness without active dependency probes. The tracker returns to optimistic `up` after its bounded failure window or an observed success.
- Valid active entitlements are cached for 30 seconds by default. Missing, inactive, malformed, mismatched, failed, or denied lookups are never cached.
- Local migration deployment and permission-manifest synchronization have been completed and evidenced locally.

Not implemented or not evidenced:

- real browser login against the deployed Hub and Central services;
- Central staging application registration and the seven approved role assignments;
- Central API-token rotation evidence;
- a rate-limited operational principal backfill run;
- explicit organization switching and Central-owned invitation administration;
- shared-session Compose/Playwright E2E fixtures and runs; no shared-session E2E coverage is claimed;
- staging and production cutover, outage, readiness, and rollback evidence;
- removal of local Google OAuth, local session cookies, and PostgreSQL sessions;
- closure of the rollback window and approval for local-auth removal.

Local `.env` can currently select `SHARED_SESSION_MODE=shared` for development while retaining all Google OAuth and local session variables. This is intentional rollback safety, not evidence that shared login is production-ready.

## Ownership matrix

| Activity                                    | Accountable owner         | Implementer/operator             | Evidence or decision                                          |
| ------------------------------------------- | ------------------------- | -------------------------------- | ------------------------------------------------------------- |
| Central application registration            | Central platform owner    | Central administrator            | Application ID, non-secret URLs, sign-in way, organization ID |
| API client credential creation and rotation | Central platform owner    | Secret-store administrator       | Secret reference and rotation date, never the token value     |
| Hub parent-domain and cookie policy         | Identity platform owner   | Hub administrator                | Staging domain topology and cookie discovery result           |
| Permission manifest review                  | Learnspace security owner | Learnspace maintainer            | Clean drift check and reviewed sync output                    |
| Central role design and assignment          | Product/security owner    | Central administrator            | Role-to-permission matrix and representative assignments      |
| Principal backfill approval                 | Data owner                | Learnspace database operator     | Dry-run counts, conflict disposition, apply counts            |
| Shadow activation and mismatch review       | Learnspace service owner  | Staging operator                 | Start/end time, request volume, bounded mismatch counts       |
| Authority cutover                           | Learnspace service owner  | Learnspace and Central operators | Approved change record and validation report                  |
| Rollback decision                           | Incident/change owner     | Learnspace operator              | Rollback trigger, duration, and recovery checks               |
| Local OAuth/session removal                 | Learnspace security owner | Learnspace maintainer            | Closed rollback window and migration approval                 |

Do not assign all accountability to an unnamed "team." Record named people or on-call roles in the staging change record.

## Environment variables

| Variable                                                          | Current purpose                                                                          | Required when                                                                                          |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `SHARED_SESSION_MODE`                                             | `off`, non-authoritative `shadow`, or authoritative `shared`                             | Always; local development may use `shared`, while staging/production require approved cutover evidence |
| `HUB_BASE_URL`                                                    | Hub origin used by `createHubSession` and cookie discovery                               | Shadow and shared mode                                                                                 |
| `HUB_ACCESS_COOKIE_NAME`                                          | Optional explicit parent-domain access-cookie name                                       | Only when discovery is unavailable or an operator deliberately pins it                                 |
| `HUB_SESSION_ISSUER`                                              | Expected Hub issuer, default `mws-hub`                                                   | Shadow and shared mode                                                                                 |
| `HUB_SESSION_AUDIENCE`                                            | Expected shared-session audience, default `mws-apps`                                     | Shadow and shared mode                                                                                 |
| `CENTRAL_API_BASE_URL`                                            | Central origin or `/api/internal` URL; Learnspace normalizes either form                 | Permission deployment, backfill, shadow, and authoritative mode                                        |
| `CENTRAL_API_TOKEN`                                               | Server-only Central API-client credential                                                | Permission deployment, backfill, shadow, and authoritative mode                                        |
| `CENTRAL_ORGANIZATION_ID`                                         | Expected entitlement organization                                                        | Shadow and authoritative mode                                                                          |
| `HUB_SSO_APP_ID`                                                  | Canonical application ID, default `learnspace`                                           | Permission deployment, shadow, and authoritative mode                                                  |
| `CENTRAL_APPLICATION_ID`                                          | Deprecated alias for `HUB_SSO_APP_ID`; both must match when set                          | Backward compatibility only                                                                            |
| `SHARED_SESSION_LOCAL_ORGANIZATION_ID`                            | Optional local organization hint used to claim the persisted Central mapping             | Migration/bootstrap only; UUID when set                                                                |
| `CENTRAL_API_TIMEOUT_MS`                                          | Central entitlement lookup timeout, default `5000` ms                                    | Shadow and authoritative mode                                                                          |
| `SHARED_SESSION_ENTITLEMENT_CACHE_SECONDS`                        | Positive valid entitlement cache lifetime, default `30`; denials/failures are not cached | Authoritative mode                                                                                     |
| `SHARED_SESSION_LOG_MATCHES`                                      | Enables bounded safe `MATCH` information logs, default `false`                           | Optional during reviewed shadow runs                                                                   |
| `DATABASE_URL`                                                    | Local data, sidecar principal links, and current local sessions                          | All current modes; still required after auth cutover for application data                              |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Current local OAuth authority                                                            | Until P6.5-011 only                                                                                    |
| `SESSION_SECRET`, `SESSION_TTL_HOURS`                             | Current local session hashing/lifetime                                                   | Until P6.5-011 only                                                                                    |

Environment files may contain placeholders only for local development. Staging and production values belong in the deployment secret store. Do not paste secret values into issues, pull requests, terminal transcripts, screenshots, rehearsal reports, or chat.

## Cookie discovery

`mws-central-auth` `0.10.0` chooses the Hub access-cookie name in this order:

1. the `cookieName` option, supplied by Learnspace from `HUB_ACCESS_COOKIE_NAME`;
2. the package's `HUB_ACCESS_COOKIE_NAME` environment fallback;
3. Hub `/.well-known/hub-config` discovery;
4. `hub_at` as the final default.

Learnspace awaits `hub.ready()` when shadow mode starts and logs only the resolved cookie name and its source. It must never log the cookie value or the complete `Cookie` header. Discovery refreshes in the package background; pinning the name transfers rotation responsibility to the operator.

Before staging activation:

1. confirm Hub and Learnspace use the same parent domain and HTTPS;
2. leave `HUB_ACCESS_COOKIE_NAME` unset when discovery is approved;
3. start with `SHARED_SESSION_MODE=shadow`;
4. verify the `shared_session_shadow_ready` event reports the expected name/source;
5. inspect browser storage only for cookie metadata, never capture or publish the value.

## Central registration procedure

The exact Central UI or API may change; register these semantics and record only non-secret results:

1. Create or update application ID `learnspace` in Central staging.
2. Select **Shared Hub Session** as the sign-in way. Do not select the relay/code flow for a same-parent-domain deployment.
3. Set the staging entry URL to the HTTPS Learnspace root used by operators.
4. Set the logout/return URL required by the approved Hub flow. Do not point it at the legacy Google callback.
5. Associate the staging Central organization and confirm its ID matches `CENTRAL_ORGANIZATION_ID`.
6. Create a least-privilege API client for entitlement lookup and permission publication. Store its token directly in the staging secret store.
7. Record the application owner, Central owner, Learnspace owner, and rollback approver.
8. Run permission synchronization, create the approved roles, and assign representative staging users.
9. Verify entitlement lookup returns `person_id`, `application_id=learnspace`, the expected `organization_id`, role, permissions, version, and `is_active=true`.

Do not commit exported Central configuration if it contains tokens, personal data, internal secrets, or session material.

## Permission roles

`apps/api/src/utils/authorization.ts` remains the source of truth for permission keys and current local role assignments. `permissions.json` is the deployment mirror. Shared authentication accepts a Central entitlement only when its permission set exactly equals the source-of-truth set for its role:

| Central role                    | Permission keys                                                                                                                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Director                        | `attendance:read`, `journey:read`, `journey:approve`, `special-ed:read`, `special-ed:review`, `report:export`, `student:admin`, `student:sensitive-read`, `staff-directory:read`, `staff-assignment:admin`, `organization:admin` |
| Principal                       | `attendance:read`, `journey:read`, `journey:review`, `special-ed:read`, `special-ed:review`, `report:export`, `student:sensitive-read`, `staff-directory:read`                                                                   |
| Grade Teacher                   | `attendance:read`, `attendance:write`, `journey:read`, `journey:write`                                                                                                                                                           |
| Subject Teacher                 | `journey:read`, `journey:write`                                                                                                                                                                                                  |
| Special Education Coordinator   | `attendance:read`, `special-ed:read`, `special-ed:write`, `special-ed:review`, `report:export`, `student:sensitive-read`, `staff-directory:read`, `staff-assignment:admin`, `observation:manage`                                 |
| Special Education Teacher / GPK | `attendance:read`, `special-ed:read`, `special-ed:write`                                                                                                                                                                         |
| Specialist                      | `special-ed:read`, `special-ed:write`                                                                                                                                                                                            |

Central permissions are coarse capabilities, not sufficient authorization. Learnspace continues enforcing organization, unit, grade, subject, class, assigned-student, record state, ownership, and optimistic-concurrency rules against PostgreSQL. A newly projected scoped role may legitimately have no local scope rows; the role exists, but scope-dependent access remains empty or denied until scopes are assigned locally.

Deployment sequence:

```bash
bun run permissions:check
bun run permissions:sync -- --retries 5 --wait 20
bun run permissions:check
```

Never use `--soft` as a deployment gate. Use `--confirm-removals` only after active Central roles no longer carry the removed key and the removal has been reviewed as a separate change.

## Principal backfill

Backfill links the existing local user to Central's stable `Person.id`. Email is only the initial lookup and must be unique locally and equal after normalization.

```bash
bun run db:migrate:deploy
bun run db:backfill-central-principals -- --dry-run
bun run db:backfill-central-principals -- --apply
bun run db:backfill-central-principals -- --dry-run
```

The dry-run exits nonzero when it finds conflicts. Resolve each count before apply:

- `LOCAL_EMAIL_NOT_UNIQUE`: correct or explicitly merge duplicate local identities;
- `CENTRAL_NOT_FOUND`: provision or correct the person in Central;
- `CENTRAL_EMAIL_MISMATCH`: investigate the authoritative record; do not force-link;
- `SUBJECT_ALREADY_LINKED`: one Central subject is already attached to another local user;
- `USER_ALREADY_LINKED`: the local user already has another subject for this issuer;
- `WRITE_CONFLICT`: another writer changed the mapping during apply.

Do not edit sidecar rows manually as a routine conflict-resolution mechanism. Use a reviewed data correction with audit evidence.

The bulk backfill implementation is bounded and conflict-safe, but a rate-limited operational run against real Central data remains outstanding. Automatic first-login projection handles one verified employee at a time and is not a substitute for a reviewed bulk migration.

## Manual Central access synchronization

Role and entitlement reconciliation is intentionally operator-triggered:

```bash
bun run central-access:sync -- --dry-run
bun run central-access:sync -- --apply
```

The command uses the persisted organization mapping, scans verified principals, requires exact permission parity, updates changed roles, and disables active local memberships when the Central entitlement is missing or inactive. It does not create missing memberships and never re-enables a locally disabled membership. It is not an automatic request-time or startup job.

## Shadow activation

Shadow mode is fail-open relative to the current local authority: it observes only after a local session succeeds. It is not evidence that Central can serve as authority until staging results are reviewed.

Activation:

1. complete Central registration, permission sync, and principal dry-run;
2. deploy required environment values with `SHARED_SESSION_MODE=off`;
3. verify normal local authentication and readiness;
4. change only `SHARED_SESSION_MODE=shadow` and restart the API;
5. verify `shared_session_shadow_ready`;
6. exercise representative users for all roles and organizations;
7. aggregate `shared_session_shadow_mismatch` codes and `shared_session_shadow_failure` counts without adding identity data to logs;
8. run through at least one Hub access expiry/refresh cycle;
9. review results with the service, Central, security, and data owners.

Comparison codes are finite: `UNLINKED`, `LOCAL_USER_MISMATCH`, `ENTITLEMENT_MISSING_OR_INACTIVE`, `ENTITLEMENT_APP_MISMATCH`, `ENTITLEMENT_CENTRAL_ORG_MISMATCH`, `LOCAL_MEMBERSHIP_MISSING`, `ROLE_MISMATCH`, `PERMISSION_MISMATCH`, `UNKNOWN_CENTRAL_PERMISSIONS`, `CENTRAL_UNAVAILABLE`, and `MATCH`. A missing Hub identity is reported as `HUB_IDENTITY_MISSING`; an unexpected observer dependency failure is reported as `SHADOW_DEPENDENCY_FAILURE`. Logs contain only request ID, code, local user/membership/organization IDs, entitlement ID/version, and bounded permission keys or diffs. They never contain email, Hub subject, cookies, tokens, local session IDs, or record-scope IDs. Logs are intentionally bounded and are not a complete metrics system.

## Cutover readiness diagnostic

The readiness command is read-only and does not enable or enforce shared authentication:

```bash
bun run shared-session:readiness
bun run shared-session:readiness -- --local-only
bun run shared-session:readiness -- --strict
```

The diagnostic still requires an explicit `SHARED_SESSION_LOCAL_ORGANIZATION_ID` to define the population being audited, even after runtime startup has persisted `Organization.centralOrganizationId`. It scans distinct active local users that have a membership row for that organization, including inactive target memberships or organizations so they remain visible as blockers. Active users unrelated to the target organization are ignored. `ExternalPrincipal` mapping, verification, and duplicate/conflict checks are scoped to that same target-organization population. When all Central client settings are present, the command also checks entitlement, application, organization, role, and permission parity. If Central configuration is absent, or `--local-only` is supplied, it completes in local-only mode. Individual Central lookup failures are counted as `CENTRAL_UNAVAILABLE`; no lookup failure details are printed.

`activeLocalPrincipals` is the number of distinct active users with any membership row in the target organization. `activeMemberships` requires the user, target membership, and target organization all to be active. Target membership or organization inactivity increments `inactiveMemberships` and `LOCAL_MEMBERSHIP_OR_ORGANIZATION_INACTIVE`.

Output is one JSON object containing aggregate counts and finite reason codes only. It never includes email, display name, subject, local or Central IDs, tokens, raw claims, entitlement payloads, or permission keys. The default command exits successfully after a completed diagnostic even when blockers exist. `--strict` exits `1` unless the blocker count is zero; configuration or diagnostic failure exits `2` with a finite error code.

Staging go/no-go criteria:

1. Run with the exact staging `SHARED_SESSION_LOCAL_ORGANIZATION_ID`, Central application, and Central organization configuration intended for cutover.
2. Require `mode=central`, `strict=true`, `go=true`, and `blockers=0` from `bun run shared-session:readiness -- --strict`.
3. Require `activeLocalPrincipals=mapped=verified=activeMemberships=entitlementActive=ready`.
4. Require zero unmapped, unverified, duplicate/conflict impossible states, inactive memberships or organizations, missing/unavailable/mismatched entitlements, role mismatches, permission mismatches, and unknown permissions.
5. Treat local-only output as useful mapping and membership evidence, but not as Central cutover approval.
6. Record only the sanitized JSON output and command metadata in the staging change record.

## Authority cutover runbook

Do not perform this runbook until the real-browser, Central-role, token-rotation, rate-limited-backfill, shared-E2E-fixture, and staging evidence gaps above are closed and the staging change is approved.

1. Announce the change window and freeze identity, role, and permission changes.
2. Take and verify a database backup.
3. Record current image digests, schema migration, local-auth mode, and non-secret Central IDs.
4. Run a clean permission check and principal dry-run; require zero unresolved conflicts.
5. Reconcile representative active entitlements for every role and organization.
6. Confirm browser restore, refresh/session-end, Back to Hub, and organization switching tests pass.
7. Enable Central authority without deleting local OAuth/session data.
8. Validate login/restore, protected reads/writes, workflow approvals, Hub return/session end, entitlement disablement, organization isolation, and all documented status classes.
9. Observe errors and latency for the approved soak period.
10. Obtain sign-off before ending the freeze.
11. Keep local OAuth/session removal as a later irreversible cleanup after the rollback window.

## Rollback

Shadow rollback is immediate: set `SHARED_SESSION_MODE=off` and restart. It changes no identity or application data.

Authority-cutover rollback must remain available until P6.5-011:

1. declare rollback using the approved trigger and stop further identity/role changes;
2. restore local authentication authority using the release's documented mode switch or previous image;
3. do not delete `ExternalPrincipal` rows or reverse successful application-data writes;
4. verify local login, current-session, CSRF-protected writes, logout, and representative workflows;
5. compare database/schema compatibility before rolling an image backward;
6. record duration, user impact, mismatch/error counts, and the reason for rollback;
7. return shadow mode to `off` unless the incident owner explicitly approves continued observation.

Never roll back by restoring the whole database merely to change authentication authority unless application data is also corrupt and the data owner approves the loss window.

## Status behavior

| Status | Meaning after cutover                                                                                                                                            | Client/operator action                                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `401`  | Hub identity is absent, ended, or not restorable                                                                                                                 | Public bootstrap identifies shared mode; the browser performs one automatic restore attempt, then shows the Hub continuation path without looping |
| `403`  | Identity is valid but source, principal, entitlement, exact role/permission parity, organization, local membership/scope, workflow, or CSRF policy denies access | Show a non-enumerating access-denied state with Back to MWS Hub; do not offer another app-owned identity path or redirect loop                    |
| `503`  | Hub/Central dependency required to establish authoritative context is unavailable                                                                                | Show retry UX, preserve the request ID, and never fall back silently to local authority or cache a failed/denied lookup                           |

Shadow dependency failures do not produce `503` because shadow is not authoritative. In shared mode, readiness includes passive Hub/Central states based on observed traffic; the readiness endpoint does not probe either service. The exact staging/production alerting and availability policy still requires evidence and approval.

## Security notes

- Trust Central `Person.id` from verified `sub`; never key runtime identity by editable email.
- Verify issuer, audience, signature, expiry, and the package's session semantics. Do not decode and trust JWT payloads directly.
- Treat Hub and Central inputs as authentication context only after verification; browser role, permission, organization, actor, or subject fields remain untrusted.
- Keep record-level authorization in Learnspace even when Central supplies role and permissions.
- Never log raw tokens, cookies, authorization headers, API tokens, session secrets, full entitlement payloads, email addresses, or sensitive student data.
- Keep Central API tokens server-only. They must never use a `VITE_` prefix or enter the browser bundle.
- Use HTTPS and the approved parent-domain cookie policy in staging and production.
- Bound caches and ensure entitlement disablement is reflected within the approved revocation interval.
- Preserve non-enumerating `401`/`403` responses and safe request IDs.
- Review horizontal-scaling implications before relying on any in-memory replay or refresh coordination mechanism.

## No-secret evidence guidance

Sanitized reports may contain timestamps, application/organization IDs approved as non-secret, aggregate counts, mismatch/error codes, package versions, image digests, command names, durations, and named accountable roles.

Sanitized reports must not contain:

- `CENTRAL_API_TOKEN`, Google client secrets, `SESSION_SECRET`, Hub internal secrets, or secret-store values;
- cookie values, complete cookie headers, access/refresh/relay tokens, launch codes, OAuth codes, PKCE values, state, nonce, or CSRF tokens;
- database URLs with credentials;
- personal email addresses, Central person IDs unless explicitly approved, student data, or full entitlement/profile payloads;
- screenshots showing browser storage, network authorization headers, environment panels, or secret-manager values.

When command output might contain sensitive data, capture only a hand-written aggregate result. Redact first and have a second operator review the report before committing it.
