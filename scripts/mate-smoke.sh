#!/usr/bin/env bash
set -euo pipefail

HOST="${MATE_SMOKE_HOST:-127.0.0.1}"
PORT_BASE="${MATE_SMOKE_PORT_BASE:-5200}"
if [[ -n "${MATE_SMOKE_PORT:-}" ]]; then
  PORT="${MATE_SMOKE_PORT}"
else
  PORT="$((PORT_BASE + ($$ % 200)))"
fi

BASE_URL="http://${HOST}:${PORT}"
SPEC="cypress/e2e/mate-detail-states.cy.ts,cypress/e2e/mate-execution-flow.cy.ts"
LOG_FILE="${TMPDIR:-/tmp}/bega-mate-smoke-${PORT}.log"

cleanup() {
  if [[ -n "${DEV_SERVER_PID:-}" ]]; then
    kill "${DEV_SERVER_PID}" >/dev/null 2>&1 || true
    wait "${DEV_SERVER_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

echo "Starting mate smoke dev server at ${BASE_URL}"
: > "${LOG_FILE}"
VITE_SUPPRESS_CYPRESS_PROXY_ERRORS=true npm run dev -- --host "${HOST}" --port "${PORT}" >"${LOG_FILE}" 2>&1 &
DEV_SERVER_PID=$!

READY=0
for _ in $(seq 1 60); do
  if curl -sf "${BASE_URL}" >/dev/null; then
    READY=1
    break
  fi
  sleep 1
done

if [[ "${READY}" -ne 1 ]]; then
  cat "${LOG_FILE}"
  exit 1
fi

npm run cy:run -- --spec "${SPEC}" --config "baseUrl=${BASE_URL}"
