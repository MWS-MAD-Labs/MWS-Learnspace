#!/bin/sh
set -eu

INTEGRATION_DB_PORT="${INTEGRATION_DB_PORT:-55433}"
DEFAULT_DATABASE_URL="postgresql://learnspace:test-password@127.0.0.1:${INTEGRATION_DB_PORT}/learnspace_test"
DATABASE_URL="${DATABASE_URL:-$DEFAULT_DATABASE_URL}"
export DATABASE_URL INTEGRATION_DB_PORT

if [ "$DATABASE_URL" = "$DEFAULT_DATABASE_URL" ]; then
  docker compose -f compose.integration.yaml up -d --wait db
fi

printf '%s\n' 'Running database migrations for the local integration database.'
npm run db:migrate:deploy
npm run test:integration -w @learnspace/api
