# Stable-release qualification runner

The scripts retain their historical `scripts/rc/` paths but now support the planned `1.0.0` stable-release qualification window. By owner decision, no separately published `1.0.0-rc.1` is currently planned. The scripts produce console evidence only; a successful exit does not replace the manual matrix or authorize stable publication.

## Static/build baseline

```bash
sh scripts/rc/validate.sh
```

This runs formatting check, lint, typecheck, unit tests, Prisma validation, OpenAPI check, the production build, and the bundle budget.

Optional stages are explicit because they are slower or change local infrastructure:

```bash
RC_CLEAN_INSTALL=1 \
RC_INTEGRATION=1 \
RC_E2E=1 \
sh scripts/rc/validate.sh
```

- `RC_CLEAN_INSTALL=1` runs `npm ci` and replaces local `node_modules` from the lockfile.
- `RC_INTEGRATION=1` invokes the existing local integration command and its containers.
- `RC_E2E=1` invokes `scripts/rc/e2e.sh`.

Run clean-install validation in a clean checkout. The script refuses a dirty Git worktree before `npm ci` unless `RC_ALLOW_DIRTY_CLEAN_INSTALL=1` is deliberately set; that override protects no uncommitted dependency state.

## Browser/core E2E orchestration

```bash
sh scripts/rc/e2e.sh
```

The script uses the existing `compose.e2e.yaml` stack and existing start/stop commands, then runs:

- RC smoke in Chromium;
- accessibility checks in Chromium, Firefox, and WebKit;
- every existing attendance and P5 Playwright project.

It always attempts the existing stop command on exit. Failed runs capture Compose status/logs under `test-results/rc-compose/`. Install all configured Playwright browser binaries before running.

## Reporting

Copy `rc-validation-template.md` to a candidate-specific stable qualification report, such as `1.0.0-qualification.md`, and record exact commands, environment, timestamps, artifacts, failures, and skipped stages. Do not infer manual accessibility, performance, security, OAuth, upgrade, restore, role-matrix, restart, or RC approval from these scripts.
