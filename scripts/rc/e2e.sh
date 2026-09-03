#!/bin/sh
set -eu

compose_file=compose.e2e.yaml
compose_project=learnspace-attendance-e2e
artifact_dir=test-results/rc-compose

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    mkdir -p "$artifact_dir"
    docker compose -p "$compose_project" -f "$compose_file" ps -a > "$artifact_dir/ps.txt" 2>&1 || true
    docker compose -p "$compose_project" -f "$compose_file" logs --no-color > "$artifact_dir/compose.log" 2>&1 || true
  fi
  npm run e2e:attendance:stop >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT INT TERM

rm -rf test-results/playwright playwright-report "$artifact_dir"
npm run e2e:attendance:stop >/dev/null 2>&1 || true
npm run e2e:attendance:start

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

echo "Browser automation completed. Manual RC matrix and approval remain outstanding."
