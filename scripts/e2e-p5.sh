#!/bin/sh
set -eu

cleanup() {
  bun run e2e:p5:stop
}

trap cleanup EXIT INT TERM
bun run e2e:p5:start
bun run e2e:p5:test
