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
