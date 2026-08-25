#!/bin/sh
set -eu

cleanup() {
  npm run e2e:p5:stop
}

trap cleanup EXIT INT TERM
npm run e2e:p5:start
npm run e2e:p5:test
