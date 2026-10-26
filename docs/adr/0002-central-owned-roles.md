# ADR 0002: Central owns roles and permissions

- **Status:** Proposed
- **Date:** 2026-10-23
- **Decision owners:** Learnspace maintainers, Central platform owner
- **Scope:** How a person's access is decided once Learnspace signs people in through the Central shared session

## Context

Every other MWS application drops local roles: Central holds roles and groups, an application publishes its permission list with `permissions:sync`, and gates every route and menu with the permissions Central returns. Learnspace differs today:

- `utils/authorization.ts` holds a fixed role-to-permission table for seven roles, and `MembershipRole` is a database enum.
- `central-principal-projection-service` refuses an entitlement whose role is unknown or whose permissions are not exactly the local list for that role.
- The role name decides data scope in `attendance.policy`, `resource-access`, `learning-journeys.policy`, `weekly-reports.policy`, `ieps.policy`, `observations.policy` and `aggregates.queries`.

So Central cannot change what a role may do without a Learnspace release.

## Decision

1. A role is a label from Central. Learnspace stores the role key and the permission set of the last entitlement, and checks permissions only.
2. What the role name used to decide becomes permissions in the published manifest. Record scope (which rows a person reaches) stays in PostgreSQL: organization, unit, grade, subject and assigned students.
3. A login is accepted when every permission in the entitlement is a key of the manifest. Unknown keys are refused. There is no exact-match rule.
4. The seven built-in roles are created in Central with the permission sets below, so behavior does not change at cutover.

### Permissions that replace role checks

| Permission                 | Replaces                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `scope.organization`       | `DIRECTOR` and `PRINCIPAL` where code returns an unrestricted filter                   |
| `scope.grade`              | `GRADE_TEACHER` class, journey and student scope (unit or grade rows)                  |
| `scope.subject`            | `SUBJECT_TEACHER` journey scope (subject rows) and academic collections except classes |
| `scope.special-ed`         | `SPECIAL_ED_COORDINATOR` reach over special-needs students, observations and IEPs      |
| `scope.assigned`           | `SPECIAL_ED_TEACHER` and `SPECIALIST` reach over their dated student assignments only  |
| `iep:submit`               | `iepWorkflowRoles.SUBMIT`                                                              |
| `iep:coordinator-approve`  | `iepWorkflowRoles.COORDINATOR_APPROVE`                                                 |
| `iep:coordinator-return`   | `iepWorkflowRoles.COORDINATOR_RETURN`                                                  |
| `iep:director-approve`     | `iepWorkflowRoles.DIRECTOR_APPROVE`                                                    |
| `iep:director-return`      | `iepWorkflowRoles.DIRECTOR_RETURN`                                                     |
| `iep:activate`             | `iepWorkflowRoles.ACTIVATE`                                                            |
| `iep:archive`              | `iepWorkflowRoles.ARCHIVE`                                                             |
| `weekly-report:teach`      | `teacherRoles` in weekly reports (author, edit own, submit own)                        |
| `weekly-report:coordinate` | the coordinator transition                                                             |
| `weekly-report:direct`     | the director transition (only `DIRECTOR` today, not `PRINCIPAL`)                       |

The existing keys (`attendance:*`, `journey:*`, `special-ed:*`, `report:export`, `student:*`, `staff-*`, `organization:admin`, `observation:manage`) stay.

### Built-in roles in Central

Each role keeps today's permissions and adds:

| Role                          | Added permissions                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Director                      | `scope.organization`, `iep:director-approve`, `iep:director-return`, `iep:activate`, `iep:archive`, `weekly-report:direct` |
| Principal                     | `scope.organization`                                                                                                       |
| Grade Teacher                 | `scope.grade`                                                                                                              |
| Subject Teacher               | `scope.subject`                                                                                                            |
| Special Education Coordinator | `scope.special-ed`, `iep:submit`, `iep:coordinator-approve`, `iep:coordinator-return`, `weekly-report:coordinate`          |
| Special Education Teacher/GPK | `scope.assigned`, `iep:submit`, `weekly-report:teach`                                                                      |
| Specialist                    | `scope.assigned`, `iep:submit`, `weekly-report:teach`                                                                      |

## Safeguard

`apps/api/src/test/role-policy-golden.test.ts` pins every decision the seven roles get today from each function above, with a snapshot. Whatever replaces a role check must keep the snapshot unchanged. A decision may only change in a commit that says why.

## Status of the change

- Done: the new permissions are in the manifest and `permissions.json`; every access rule (attendance, resources, journeys, weekly reports, IEPs, observations, aggregates, and the services that scoped by role) asks for a permission. The role still supplies them through `roleDerivedPermissions`, so the snapshot is unchanged.
- Done (data): `Membership.role` and `UserInvitation.role` are text, `Membership.permissions` stores what the membership is allowed, and the migration `20261023000000_membership_role_text_and_permissions` fills it from the built-in role (checked on rows that existed before). The local session passes the stored permissions into the request; the account, projection and sync writers keep them in step with the role. The API answers any role key; only the account commands still list the built-in roles.
- Done (login): the Central login, the shadow check, the readiness report and the sync take the role key and the permission list of the entitlement as they are. Any non-empty role key is accepted; an unknown permission key or a duplicate refuses the entitlement. The stored list is the whole answer for a membership, even when empty. `roleDerivedPermissions` stays only as the default grant for built-in roles and for memberships with no stored list.
- Done (accounts): with `SHARED_SESSION_MODE=shared` the account list says `managedByCentral`, creating an account is refused (409 `MANAGED_BY_CENTRAL`), and so is changing the email, name, avatar or role of one. Scopes, role title and status stay here. A local invitation admits no one in that mode. Scopes are checked against the permissions of the role: grade scopes for `scope.grade`, subject scopes for `scope.subject`, none otherwise.
- Done (web): screens ask for permissions, not role names. `isGPK` is `weekly-report:teach`, `isSpecialEdCoordinator` is `iep:coordinator-approve`, and reaching the whole organization is `scope.organization`. The staff directory and the account list carry the permissions. People and access shows the role read-only when Central manages accounts.
- Done (roles in Central): `role-presets.json` lists the built-in roles with the permission sets of the table above, and a test keeps it in step with the code. Central keeps one role per set of permissions, and the GPK teacher and the specialist hold the same set, so there are six presets. A membership with role `SPECIALIST` keeps working, since its stored permissions are what count. Central's `bun run seed:application-roles role-presets.json --as <super admin>` creates them after `permissions:sync`.
- Done (classes from Central, stage 1): the units, grades, classes, subjects and academic years of the school come from Central's classes and class teacher assignments. Each row keeps the Central id (`centralId`, or `centralKey` for a subject, which Central stores as text). `synchronizeCentralAcademics` creates and renames, never deletes, and reports a row of the same name without a Central id as a conflict unless `--adopt` links it. The scopes of a person whose role has `scope.grade` or `scope.subject` are computed from their assignments: a homeroom or supporting homeroom teacher reaches the unit and grades of the class, a subject teacher the subject. Other roles are not touched. With `CENTRAL_SYNC_INTERVAL_MINUTES` set, the API runs the access sync and then this one on a schedule, under advisory locks; the CLI is `bun run central-academic:sync -- --dry-run|--apply [--adopt]`. Students, enrolments and support assignments are the next stages.
- Done (students and support, stages 2 and 3): students come from Central's active students, the roster export (birth date, address, photo, parents) matched by email, and the support assignments. A student keeps the Central id (`centralId`) and gets the NIS, then the NISN, as the student number. The open enrolment follows the current class of Central: a change closes it and opens the next, and nothing is deleted. A student Central no longer lists as active is switched off. Father and mother become contacts (the father is the primary one). A student has `specialNeedsFlag` when Central has a `SPECIAL_ED` support assignment for them, and each assignment becomes a `GPK` assignment for the person (matched by email) when the role has `scope.assigned`. An assignment for a student made here is left alone. The CLI is `bun run central-student:sync -- --dry-run|--apply [--adopt]` and the scheduled round runs it after the classes. With the sync on, creating a student, setting the fields Central owns and the local GPK assignment routes answer 409 `MANAGED_BY_CENTRAL`. The roster export needs the `students:roster_export:read` scope on the connection.
- Decision: `roleDerivedPermissions` stays. It fills a membership that has no stored permission list and it builds `role-presets.json`. Nothing else asks it who a person is. It can go once every environment has been moved to Central roles and the last memberships made before the migration have been signed in once; that is a clean-up, not a dependency.

## Consequences

- Central can add a role or change a role's permissions without a Learnspace release.
- `MembershipRole` and `UserInvitation.role` become text, and a membership stores its permissions (a Prisma migration with a backfill from the table above).
- Local invitations are disabled in favor of Central; this needs its own change.
- A role with no scope permission reaches no rows, which is the safe default.
