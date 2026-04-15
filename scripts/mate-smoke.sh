#!/usr/bin/env bash
set -euo pipefail

HOST="${MATE_SMOKE_HOST:-127.0.0.1}"
PORT="${MATE_SMOKE_PORT:-5193}"
SPEC="${MATE_SMOKE_SPEC:-cypress/e2e/mate-detail-states.cy.ts,cypress/e2e/mate-execution-flow.cy.ts}"
ATTACH_EXISTING_SERVER="${MATE_SMOKE_ATTACH_EXISTING_SERVER:-0}"

echo "Running mate smoke via test-e2e.mjs at http://${HOST}:${PORT}"

if [[ "${ATTACH_EXISTING_SERVER}" == "1" ]]; then
  exec env CYPRESS_ATTACH_EXISTING_SERVER=1 node scripts/test-e2e.mjs \
    --no-server \
    --host "${HOST}" \
    --port "${PORT}" \
    --spec "${SPEC}" \
    "$@"
fi

exec node scripts/test-e2e.mjs \
  --host "${HOST}" \
  --port "${PORT}" \
  --spec "${SPEC}" \
  "$@"
