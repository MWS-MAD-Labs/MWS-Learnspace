#!/bin/sh
set -eu

compose_file=${RELEASE_COMPOSE_FILE:-compose.release.yaml}
project=${RELEASE_PROJECT:-learnspace-release-qualification}
artifact_dir=${RELEASE_ARTIFACT_DIR:-test-results/release-qualification}
expected_migration=${EXPECTED_MIGRATION:-20260827050000_aggregate_search_indexes}

require() {
  name=$1
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    echo "Required environment variable $name is not set." >&2
    exit 2
  fi
}

require_digest() {
  name=$1
  eval "value=\${$name:-}"
  if ! printf '%s\n' "$value" | grep -Eq '@sha256:[0-9a-f]{64}$'; then
    echo "$name must be an immutable image reference ending in @sha256:<64 hex characters>." >&2
    exit 2
  fi
}

run() {
  printf '\n==> %s\n' "$*" >&2
  "$@"
}

compose() {
  docker compose -p "$project" -f "$compose_file" "$@"
}

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    mkdir -p "$artifact_dir"
    compose ps -a > "$artifact_dir/compose-ps.txt" 2>&1 || true
    compose logs --no-color > "$artifact_dir/compose.log" 2>&1 || true
  fi
  compose down --volumes --remove-orphans >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT INT TERM

require API_IMAGE
require WEB_IMAGE
require MIGRATION_IMAGE
require PREVIOUS_MIGRATION_IMAGE
require_digest API_IMAGE
require_digest WEB_IMAGE
require_digest MIGRATION_IMAGE

mkdir -p "$artifact_dir"
rm -f "$artifact_dir"/*.txt "$artifact_dir"/*.dump "$artifact_dir"/*.sha256

export POSTGRES_DB=${POSTGRES_DB:-learnspace_qualification}
export POSTGRES_USER=${POSTGRES_USER:-learnspace}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-qualification-database-password}
export DATABASE_URL=${DATABASE_URL:-postgresql://learnspace:qualification-database-password@db:5432/learnspace_qualification}
export APP_URL=${APP_URL:-http://127.0.0.1:33080}
export SESSION_SECRET=${SESSION_SECRET:-qualification-session-secret-at-least-32-characters}
export GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-qualification-client-id}
export GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-qualification-client-secret}
export GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI:-http://127.0.0.1:33080/api/v1/auth/callback}
export AUTH_ADMISSION_MODE=${AUTH_ADMISSION_MODE:-DENY_UNKNOWN}
export API_PORT=${API_PORT:-34000}
export WEB_PORT=${WEB_PORT:-33080}

run compose config --quiet
run compose pull

if [ -n "${CANDIDATE_COMMIT:-}" ]; then
  require CANDIDATE
  for image in "$API_IMAGE" "$WEB_IMAGE" "$MIGRATION_IMAGE"; do
    revision=$(docker image inspect "$image" --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}')
    version=$(docker image inspect "$image" --format '{{ index .Config.Labels "org.opencontainers.image.version" }}')
    if [ "$revision" != "$CANDIDATE_COMMIT" ] || [ "$version" != "$CANDIDATE" ]; then
      echo "Candidate label mismatch for $image: revision=$revision version=$version" >&2
      exit 1
    fi
  done
fi

compose config --images > "$artifact_dir/resolved-images.txt"
for expected in "$API_IMAGE" "$MIGRATION_IMAGE" "$WEB_IMAGE"; do
  if ! grep -Fqx "$expected" "$artifact_dir/resolved-images.txt"; then
    echo "Compose did not resolve expected image $expected." >&2
    cat "$artifact_dir/resolved-images.txt" >&2
    exit 1
  fi
done

printf '\n==> Clean-install scenario\n'
run compose down --volumes --remove-orphans
run compose up -d --wait --wait-timeout 240
run curl --fail --silent --show-error "$APP_URL/health"
run curl --fail --silent --show-error "$APP_URL/health/ready"
run curl --fail --silent --show-error "$APP_URL/api/v1/version"
run compose exec -T db psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT migration_name FROM \"_prisma_migrations\" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1;" > "$artifact_dir/clean-install-latest-migration.txt"
grep -Fqx "$expected_migration" "$artifact_dir/clean-install-latest-migration.txt"
run compose restart api web
run compose up -d --wait --wait-timeout 180
run curl --fail --silent --show-error "$APP_URL/health/ready"

printf '\n==> Missing-configuration scenario\n'
if env -u SESSION_SECRET docker compose -p "$project-config-check" -f "$compose_file" config --quiet > "$artifact_dir/missing-config.txt" 2>&1; then
  echo "Compose unexpectedly accepted a missing SESSION_SECRET." >&2
  exit 1
fi
grep -Fq 'SESSION_SECRET' "$artifact_dir/missing-config.txt"

printf '\n==> Upgrade scenario\n'
run compose down --volumes --remove-orphans
run compose up -d --wait --wait-timeout 120 db
run docker run --rm --network "${project}_backend" -e DATABASE_URL="$DATABASE_URL" "$PREVIOUS_MIGRATION_IMAGE"
run compose exec -T db psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE TABLE release_qualification_marker (id integer PRIMARY KEY, marker text NOT NULL); INSERT INTO release_qualification_marker VALUES (1, 'preserve-me');"
printf '\n==> Create and verify pre-upgrade backup\n'
compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$artifact_dir/pre-upgrade.dump"
if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$artifact_dir/pre-upgrade.dump" > "$artifact_dir/pre-upgrade.dump.sha256"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$artifact_dir/pre-upgrade.dump" > "$artifact_dir/pre-upgrade.dump.sha256"
else
  echo 'No SHA-256 utility found; pre-upgrade backup cannot be verified.' >&2
  exit 1
fi
compose exec -T db pg_restore -l < "$artifact_dir/pre-upgrade.dump" > "$artifact_dir/pre-upgrade-catalog.txt"
test -s "$artifact_dir/pre-upgrade-catalog.txt"
run compose run --rm migrate
run compose exec -T db psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT marker FROM release_qualification_marker WHERE id = 1;" > "$artifact_dir/upgrade-marker.txt"
grep -Fqx 'preserve-me' "$artifact_dir/upgrade-marker.txt"
run compose exec -T db psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT migration_name FROM \"_prisma_migrations\" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1;" > "$artifact_dir/upgrade-latest-migration.txt"
grep -Fqx "$expected_migration" "$artifact_dir/upgrade-latest-migration.txt"
run compose up -d api web
run compose up -d --wait --wait-timeout 240
run curl --fail --silent --show-error "$APP_URL/health/ready"
run compose restart db
run compose up -d --wait --wait-timeout 240
run curl --fail --silent --show-error "$APP_URL/health/ready"

compose ps -a > "$artifact_dir/compose-ps.txt"
compose logs --no-color > "$artifact_dir/compose.log"
echo "Candidate clean-install, upgrade, configuration, restart, and digest checks passed."
