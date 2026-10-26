# Central-owned roles on a development machine

Learnspace takes the role key and the permission list of the Central entitlement as they are (ADR 0002). The role name does not matter. Permissions decide what a person can do and which rows they reach.

## Switch a machine to this version

1. Check out `feat/central-owned-roles`, then run `bun install`.
2. Apply the migration `20261023000000_membership_role_text_and_permissions` with `bun run db:migrate:deploy`. It turns the role into text and gives each membership a stored permission list, filled from the built-in role for existing rows.
3. Generate the Prisma client with `bun run --filter @learnspace/api prisma:generate`. The migration only changes the database. Without this step the API still has the old client and every sign-in answers "Unable to verify session".
4. Build the contracts with `bun run --filter @learnspace/contracts build`. The API and the web app load the built package, and an old build still lists the seven roles as the only valid ones.
5. Restart the API and the web app.

## Publish the permissions to Central

1. `bun run permissions:check` compares `permissions.json` with Central.
2. `bun run permissions:sync` publishes it. Application Access, Learnspace, Permissions then lists all 31 keys.

## Create the built-in roles in Central

After `permissions:sync`, run in Central: `bun run seed:application-roles ../MWS-Learnspace/role-presets.json --as <super admin email> --dry-run`, then again without `--dry-run`. It makes Director, Principal, Special Education Coordinator, Grade Teacher, Subject Teacher and Special Education Teacher, and skips what exists. The specialist uses the Special Education Teacher role, because Central keeps one role per set of permissions.

## Classes and scopes from Central

Central's classes and class teacher assignments need the unit and grade ids (a Central with the ids, and `mws-central-auth` 0.11.0 for the types). Then:

1. `bun run db:migrate:deploy` adds the Central key columns.
2. `bun run central-academic:sync -- --dry-run` shows what would be made. Rows already here with the same name are reported as conflicts. Add `--adopt` to link them to their Central id instead of making a second one.
3. `bun run central-academic:sync -- --apply` writes it. It also sets the scopes of people whose role has `scope.grade` or `scope.subject`.
4. Set `CENTRAL_SYNC_INTERVAL_MINUTES` (for example 15) to run the access and academic sync from the API itself, once soon after start and then every interval.

## Students and support from Central

The connection of Learnspace needs the scopes for students (`students:read`), the roster export (`students:roster_export:read`, which carries the birth date and the parents) and the student support assignments. Run the class sync first, because an enrolment needs its class.

1. `bun run central-student:sync -- --dry-run` shows what would change. A student here with the same student number and no Central id is a conflict; `--adopt` links it.
2. `bun run central-student:sync -- --apply` writes it.
3. The scheduled round (`CENTRAL_SYNC_INTERVAL_MINUTES`) runs access, classes and students in that order.

With the sync on, the student form and the GPK assignment buttons answer "This is managed in Central." Change the data in Central.

## Give a role its permissions in Central

Application Access, Learnspace, Roles. Pick the role and tick its permissions. A person signs in with whatever the role holds.

A role with no `scope.*` permission signs in but reaches no rows. For a role that sees everything tick all 31 keys:

- Existing: `attendance:read`, `attendance:write`, `journey:read`, `journey:write`, `journey:review`, `journey:approve`, `special-ed:read`, `special-ed:write`, `special-ed:review`, `report:export`, `student:admin`, `student:sensitive-read`, `staff-directory:read`, `staff-assignment:admin`, `organization:admin`, `observation:manage`
- Reach: `scope.organization`, `scope.grade`, `scope.subject`, `scope.special-ed`, `scope.assigned`
- IEP steps: `iep:submit`, `iep:coordinator-approve`, `iep:coordinator-return`, `iep:director-approve`, `iep:director-return`, `iep:activate`, `iep:archive`
- Weekly report steps: `weekly-report:teach`, `weekly-report:coordinate`, `weekly-report:direct`

The permissions of the seven former roles are listed in `docs/adr/0002-central-owned-roles.md`.

## Addresses in Central

The sign-in address is `http://localhost:3002/api/v1/auth/sso` and the logout address `http://localhost:3002/api/v1/auth/logout`. They need custom paths in Edit Details. `APP_URL` must be the origin of the sign-in address.

## First sign-in

Nobody has to be created in Learnspace. The first sign-in makes the user, the Central link and the membership from the entitlement.
