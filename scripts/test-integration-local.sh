#!/bin/sh
set -eu

DEFAULT_DATABASE_URL='postgresql://learnspace:test-password@127.0.0.1:55433/learnspace_test'
DATABASE_URL="${DATABASE_URL:-$DEFAULT_DATABASE_URL}"
export DATABASE_URL

if [ "$DATABASE_URL" = "$DEFAULT_DATABASE_URL" ]; then
  docker compose -f compose.integration.yaml up -d --wait db
fi

printf '%s\n' 'Running database migrations for the local integration database.'
npm run db:migrate:deploy
npm run test:integration -w @learnspace/api
