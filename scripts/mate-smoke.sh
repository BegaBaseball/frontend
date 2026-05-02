#!/usr/bin/env bash
set -euo pipefail

HOST="${MATE_SMOKE_HOST:-}"
PORT="${MATE_SMOKE_PORT:-}"
SPEC="${MATE_SMOKE_SPEC:-cypress/e2e/mate-detail-states.cy.ts,cypress/e2e/mate-execution-flow.cy.ts}"
ATTACH_EXISTING_SERVER="${MATE_SMOKE_ATTACH_EXISTING_SERVER:-0}"
DOCKER_ARGS=()

if [[ -z "${HOST}" && -z "${PORT}" && -n "${CYPRESS_FRONTEND_BASE_URL:-}" ]]; then
  resolved_target="$(
    node -e "const value = process.env.CYPRESS_FRONTEND_BASE_URL; try { const url = new URL(/^https?:\/\//i.test(value) ? value : 'http://' + value); process.stdout.write(url.hostname + ' ' + (url.port || (url.protocol === 'https:' ? '443' : '80'))); } catch { process.exit(1); }" || true
  )"
  if [[ -n "${resolved_target}" ]]; then
    read -r HOST PORT <<< "${resolved_target}"
  fi
fi

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-5193}"

if [[ "${MATE_SMOKE_USE_DOCKER:-0}" == "1" ]]; then
  DOCKER_ARGS+=(--docker)
fi

echo "Running mate smoke via test-e2e.mjs at http://${HOST}:${PORT}"

if [[ "${ATTACH_EXISTING_SERVER}" == "1" ]]; then
  exec env CYPRESS_ATTACH_EXISTING_SERVER=1 node scripts/test-e2e.mjs \
    --no-server \
    "${DOCKER_ARGS[@]}" \
    --host "${HOST}" \
    --port "${PORT}" \
    --spec "${SPEC}" \
    "$@"
fi

exec node scripts/test-e2e.mjs \
  "${DOCKER_ARGS[@]}" \
  --host "${HOST}" \
  --port "${PORT}" \
  --spec "${SPEC}" \
  "$@"
