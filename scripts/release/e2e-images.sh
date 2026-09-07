#!/bin/sh
set -eu

compose_project=${RELEASE_E2E_PROJECT:-learnspace-release-e2e}
compose_file=compose.release-e2e.yaml
artifact_dir=${RELEASE_E2E_ARTIFACT_DIR:-test-results/release-e2e}

require_digest() {
  name=$1
  eval "value=\${$name:-}"
  if ! printf '%s\n' "$value" | grep -Eq '@sha256:[0-9a-f]{64}$'; then
    echo "$name must be an immutable image reference ending in @sha256:<64 hex characters>." >&2
    exit 2
  fi
}

compose() {
  docker compose -p "$compose_project" -f "$compose_file" "$@"
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

require_digest API_IMAGE
require_digest WEB_IMAGE
require_digest MIGRATION_IMAGE

rm -rf test-results/playwright playwright-report "$artifact_dir"
mkdir -p "$artifact_dir"
compose down --volumes --remove-orphans >/dev/null 2>&1 || true

docker build --file apps/api/Dockerfile --target builder --tag learnspace-release-fixture:qualification .
compose config --images > "$artifact_dir/resolved-images.txt"
for expected in "$API_IMAGE" "$MIGRATION_IMAGE" "$WEB_IMAGE"; do
  grep -Fqx "$expected" "$artifact_dir/resolved-images.txt"
done

compose pull db migrate api web
compose up -d --wait --wait-timeout 240

npx playwright test \
  --project=rc-smoke-chromium \
  --project=accessibility-chromium \
  --project=accessibility-firefox \
  --project=accessibility-webkit \
  --project=attendance-chromium \
  --project=p5-administration-chromium \
  --project=p5-learning-journeys-chromium \
  --project=p5-observations-chromium \
  --project=p5-ieps-chromium \
  --project=p5-weekly-reports-chromium

compose ps -a > "$artifact_dir/compose-ps.txt"
compose logs --no-color > "$artifact_dir/compose.log"
echo "Candidate image browser matrix passed."
