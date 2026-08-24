#!/bin/sh
set -eu

compose_file=compose.e2e.yaml
compose_project=learnspace-attendance-e2e
artifact_dir=test-results/compose

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    mkdir -p "$artifact_dir"
    docker compose -p "$compose_project" -f "$compose_file" ps -a > "$artifact_dir/ps.txt" 2>&1 || true
    docker compose -p "$compose_project" -f "$compose_file" logs --no-color > "$artifact_dir/compose.log" 2>&1 || true
  fi
  docker compose -p "$compose_project" -f "$compose_file" down --volumes --remove-orphans >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT INT TERM

rm -rf test-results playwright-report
docker compose -p "$compose_project" -f "$compose_file" down --volumes --remove-orphans >/dev/null 2>&1 || true
docker compose -p "$compose_project" -f "$compose_file" up --build --wait --wait-timeout 240
npm run e2e:attendance:test
