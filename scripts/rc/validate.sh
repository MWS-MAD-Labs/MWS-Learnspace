#!/bin/sh
set -eu

run() {
  printf '\n==> %s\n' "$*"
  "$@"
}

if [ "${RC_CLEAN_INSTALL:-0}" = "1" ]; then
  if [ "${RC_ALLOW_DIRTY_CLEAN_INSTALL:-0}" != "1" ] &&
    [ -n "$(git status --porcelain)" ]; then
    echo "Refusing npm ci in a dirty worktree. Use a clean checkout or explicitly set RC_ALLOW_DIRTY_CLEAN_INSTALL=1." >&2
    exit 2
  fi
  run npm ci
fi

run npm run format:check
run npm run lint
run npm run typecheck
run npm test
run env DATABASE_URL="${DATABASE_URL:-postgresql://learnspace:validation-only@127.0.0.1:5432/learnspace}" npm run prisma:validate
run npm run openapi:check
run npm run build
run node scripts/performance/check-bundle-budget.mjs

if [ "${RC_INTEGRATION:-0}" = "1" ]; then
  run npm run test:integration:local
else
  echo "Skipping local integration tests (set RC_INTEGRATION=1 to run)."
fi

if [ "${RC_E2E:-0}" = "1" ]; then
  run sh scripts/rc/e2e.sh
else
  echo "Skipping browser E2E matrix (set RC_E2E=1 to run)."
fi

echo "Automated commands completed. This is not an RC approval or manual-review result."
