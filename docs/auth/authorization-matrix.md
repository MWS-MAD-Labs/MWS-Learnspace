# Authorization matrix

Server authorization is deny-by-default. Browser fields such as `role`, `permissions`, `isGPK`, `isSpecialEdCoordinator`, organization IDs, or actor IDs are never accepted as identity. Local mode loads the active membership from the PostgreSQL session. Shared mode takes the role and coarse permissions from a verified Central entitlement, requires exact parity with the canonical role mapping below, and loads record scopes from the local PostgreSQL membership.

## Canonical roles

| Product role                    | `MembershipRole`         |
| ------------------------------- | ------------------------ |
| Director                        | `DIRECTOR`               |
| Principal                       | `PRINCIPAL`              |
| Grade Teacher                   | `GRADE_TEACHER`          |
| Subject Teacher                 | `SUBJECT_TEACHER`        |
| Special Education Coordinator   | `SPECIAL_ED_COORDINATOR` |
| GPK / Special Education Teacher | `SPECIAL_ED_TEACHER`     |
| Specialist                      | `SPECIALIST`             |

`roleTitle` is display-only and must not grant permissions. GPK and coordinator behavior formerly represented by `isGPK` and `isSpecialEdCoordinator` is mapped to canonical server roles above.

Shared login currently supports Hub identities whose verified source is `employee`. `intern` and `student` identities are denied before projection or authorization.

## Permission matrix

Legend: **O** organization scope, **U** assigned unit, **G** assigned grade, **C** assigned class through grade/unit or an explicit future class assignment, **S** assigned subject, **A** assigned student, **—** denied.

| Capability                                   | Director | Principal | Grade Teacher | Subject Teacher | SE Coordinator         | SE Teacher / GPK | Specialist |
| -------------------------------------------- | -------- | --------- | ------------- | --------------- | ---------------------- | ---------------- | ---------- |
| List available organizations                 | O        | O         | O             | O               | O                      | O                | O          |
| Read academic years                          | O        | O         | O             | O               | —                      | —                | —          |
| Read units and grades                        | O        | O         | U/G           | O               | —                      | —                | —          |
| Read classes                                 | O        | O         | U/G/C         | —               | —                      | —                | —          |
| Read subjects                                | O        | O         | O             | S               | —                      | —                | —          |
| Read authorized student lists                | O        | O         | U/G/C         | —               | O (special needs only) | A                | A          |
| Read student address/guardian contacts       | O        | O         | —             | —               | O (special needs only) | —                | —          |
| Create/update student records                | O        | —         | —             | —               | —                      | —                | —          |
| Read organization staff directory            | O        | O         | —             | —               | O                      | —                | —          |
| Manage GPK student assignments               | O        | —         | —             | —               | O                      | —                | —          |
| Read attendance                              | O        | O         | G/C           | —               | A                      | A                | —          |
| Write attendance                             | —        | —         | G/C           | —               | —                      | —                | —          |
| Read Learning Journeys                       | O        | O         | U/G           | S               | —                      | —                | —          |
| Create/update Learning Journey drafts        | —        | —         | U/G + owner   | S + owner       | —                      | —                | —          |
| Submit Learning Journeys                     | —        | —         | U/G + owner   | S + owner       | —                      | —                | —          |
| Review Learning Journeys                     | —        | O         | —             | —               | —                      | —                | —          |
| Approve Learning Journeys                    | O        | —         | —             | —               | —                      | —                | —          |
| Read observations/IEPs/reports               | O        | O         | —             | —               | O/A                    | A                | A          |
| Write special-education records              | —        | —         | —             | —               | O/A                    | A                | A          |
| Submit IEP drafts                            | —        | —         | —             | —               | O/A                    | A                | A          |
| Coordinator IEP review/return                | —        | —         | —             | —               | O                      | —                | —          |
| Director IEP approval/return                 | O        | —         | —             | —               | —                      | —                | —          |
| Activate/archive IEPs                        | O        | —         | —             | —               | —                      | —                | —          |
| Review other special-education workflows     | O        | O         | —             | —               | O                      | —                | —          |
| Approve final special-education workflow     | O        | —         | —             | —               | —                      | —                | —          |
| Export reports                               | O        | O         | —             | —               | O                      | —                | —          |
| Manage organization membership/configuration | O        | —         | —             | —               | —                      | —                | —          |

The initial authorization primitives expose these coarse permissions:

- `attendance:read`, `attendance:write`
- `journey:read`, `journey:write`, `journey:review`, `journey:approve`
- `special-ed:read`, `special-ed:write`, `special-ed:review`
- `report:export`
- `student:admin`, `student:sensitive-read`
- `staff-directory:read`, `staff-assignment:admin`
- `organization:admin`
- `observation:manage`

`apps/api/src/utils/authorization.ts` is the runtime source of truth for these keys, their role assignments, and the typed Central permission manifest. The committed root `permissions.json` mirrors that manifest for Central setup tooling, and the API test suite fails if the JSON or role assignments drift from the runtime constants.

## Central permission deployment

Permission registration is a deployment step, not an API startup task. Configure `CENTRAL_API_BASE_URL` with either the Central origin or its `/api/internal` URL, `CENTRAL_API_TOKEN` with the API-client token for this application, and canonical `HUB_SSO_APP_ID` (default `learnspace`). `CENTRAL_APPLICATION_ID` is a legacy alias; startup and CLIs fail if both variables are set to different values. Never commit or print the token.

Run the read-only comparison in CI before deployment:

```bash
bun run permissions:check
```

Run synchronization after Central is deployed and before the Learnspace release goes live:

```bash
bun run permissions:sync -- --retries 5 --wait 20
```

`--retries` counts additional attempts and `--wait` is seconds between retries. Only connection failures, HTTP `429`, and HTTP `5xx` responses are retried. Authentication, authorization, validation, and other Central rejections fail immediately.

Use `--confirm-removals` only during an explicitly reviewed removal deployment. Use `permissions:check -- --allow-removals` when a check may accept registered permissions that the code intentionally dropped, provided no active Central role still carries an unknown key. `permissions:sync -- --check` is an equivalent read-only check. `--soft` reports failures but exits successfully and is intended only for optional local development workflows, never deployment gates.

Permission removal should span two releases: first move Central roles away from the old key, then remove the key from Learnspace and synchronize. The sync output identifies deprecated keys and active affected roles. Deployment automation must provide environment-specific Central credentials and must not run these commands against another environment's Central instance.

A permission alone is insufficient. Every tenant-owned repository query must also include `organizationId`, and scoped roles must pass the applicable unit, grade, subject, class, or assigned-student check.

Central entitlements must contain exactly the permission set for their role: no missing key, no extra or unknown key, and no duplicate key. The seven role rows in the permission table are the required parity contract. Local membership scopes are independent of Central permissions. A scoped role may be projected with empty unit, grade, subject, or assigned-student scopes; this does not widen access, and endpoints requiring those scopes continue to deny or return no records.

Central access reconciliation is manual, not a request-time background mutation:

```bash
bun run central-access:sync -- --dry-run
bun run central-access:sync -- --apply
```

The command updates local membership roles to valid active Central entitlements and can disable active local memberships whose entitlements are missing or inactive. It never re-enables a locally disabled membership. Run and review it under an operational change process.

Organization account administration distinguishes global user identity from tenant-local membership configuration. A Director may update the role, role title, membership status, and unit/grade/subject scopes for a membership in their organization. Email, display name, avatar URL, and user status belong to the shared `User` row; the API rejects changes to those fields with `SHARED_USER_IDENTITY_CONFLICT` when the user has a membership in another organization. This prevents one organization administrator from renaming, disabling, or changing the login email of a user across tenants.

Academic collection and authorized student-list reads use explicit endpoint policies in addition to the coarse permission set. They do not add browser-controlled permissions: leadership is organization-wide; Grade Teachers receive assigned unit/grade/class context plus subject metadata needed for journey authoring; Subject Teachers receive organization academic-year, semester, unit, and grade context but only assigned subjects and subject-scoped journeys; assigned-student roles can read only active dated student assignments. Learning Journey draft writes and submission additionally require `journey:write`, an authorized unit/grade or subject scope, `DRAFT` state, and creator or active-owner membership. Principal decisions require `journey:review`; Director decisions require `journey:approve`. IEP submission requires a coordinator or a date-effective assigned Special Education Teacher/Specialist; coordinator approval/return requires `SPECIAL_ED_COORDINATOR`; director approval/return, activation, and archival require `DIRECTOR`. Every IEP command accepts only its decision/comment and `expectedVersion`; organization, actor, approver, source state, and target state are session/server derived. Activating a replacement transactionally archives the prior active IEP, appends events for both aggregates, and retains all prior history. All workflow actors come from the session, and review commands conditionally enforce their required source state and `expectedVersion`. Special-education roles have no journey permission until a safely representable assigned-student journey policy exists. Student address and guardian contacts additionally require `student:sensitive-read`; broad lists never include those fields. GPK assignment commands require `staff-assignment:admin`, derive the actor from the session, and enforce the server caseload limit transactionally. Finer capabilities — subject/class-scoped attendance reads for Subject Teachers, team-scoped special-education reads for Grade and Subject Teachers, and separating observation writes from IEP and weekly-report writes — remain denied until those permissions are introduced.

## Scope rules

1. **Organization:** a request can act only within an active membership's `organizationId`. A client-provided organization ID is compared to the session membership; it never selects another identity.
2. **Unit and grade:** grade teachers can access records attached to their `MembershipUnit` or `MembershipGrade` assignments as required by the endpoint.
3. **Class:** until a direct membership-to-class relation exists, class access must be derived from an authorized grade/unit and the current enrollment. Never authorize by a class name supplied by the browser.
4. **Subject:** subject teachers require a matching `MembershipSubject` and any endpoint-specific class/grade relationship.
5. **Assigned student:** special-education teachers and specialists require an active `StaffStudentAssignment` for the student and appropriate `roleContext`. Dates must include the action date.
6. **Leadership:** Director and Principal organization-wide read/review powers do not imply write or approval powers not listed above.
7. **No policy:** when an endpoint or record type has no explicit rule, deny it.

## Mapping current prototype checks

| Prototype check                              | Server mapping                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `currentUser.role === 'DIRECTOR'`            | Active `DIRECTOR` membership plus the endpoint permission and organization scope.                                     |
| `currentUser.role === 'PRINCIPAL'`           | Active `PRINCIPAL` membership plus the endpoint permission and organization scope.                                    |
| `currentUser.role === 'GRADE_TEACHER'`       | `GRADE_TEACHER` membership plus grade/unit/class scope.                                                               |
| `currentUser.role === 'SUBJECT_TEACHER'`     | `SUBJECT_TEACHER` membership plus subject and class/grade scope.                                                      |
| `currentUser.isSpecialEdCoordinator`         | Replace with `SPECIAL_ED_COORDINATOR`; the boolean is presentation compatibility only.                                |
| `currentUser.isGPK`                          | Replace with `SPECIAL_ED_TEACHER` plus active assigned-student scope; the boolean is presentation compatibility only. |
| `currentUser.permissions`                    | Display hints only. The API computes permissions from `MembershipRole`; browser permission arrays are ignored.        |
| Prototype role switcher/localStorage user ID | Development-only fake-data tool. It is unavailable in production and cannot change API identity.                      |

## Guard order

For protected operations, apply checks in this order:

1. load and validate the server-side session;
2. reject disabled users, organizations, or memberships;
3. resolve the active organization membership;
4. require the named permission;
5. apply record scope in the repository query itself;
6. perform the operation;
7. append a safe audit event for privileged success or denial.

Authorization failures should return a consistent `403` without revealing whether a record exists in another organization. Unauthenticated requests return `401`. Logs and audit metadata must omit cookies, tokens, email addresses, request payloads, and sensitive student data.
