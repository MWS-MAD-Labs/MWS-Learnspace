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
- Next: disable the local account and invitation commands, then the web and docs follow-up.

## Consequences

- Central can add a role or change a role's permissions without a Learnspace release.
- `MembershipRole` and `UserInvitation.role` become text, and a membership stores its permissions (a Prisma migration with a backfill from the table above).
- Local invitations are disabled in favor of Central; this needs its own change.
- A role with no scope permission reaches no rows, which is the safe default.
