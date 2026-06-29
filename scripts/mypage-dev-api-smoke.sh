#!/usr/bin/env bash
set -euo pipefail

ORIGIN="${MYPAGE_DEV_SMOKE_ORIGIN:-http://localhost:8080}"
REPORT_PATH="${MYPAGE_DEV_SMOKE_REPORT:-reports/mypage-dev-api-smoke.json}"
TIMEOUT_SECONDS="${MYPAGE_DEV_SMOKE_TIMEOUT_SECONDS:-10}"
PROVIDED_EMAIL="${MYPAGE_DEV_SMOKE_EMAIL:-}"
PROVIDED_PASSWORD="${MYPAGE_DEV_SMOKE_PASSWORD:-}"
PROVIDED_HANDLE="${MYPAGE_DEV_SMOKE_HANDLE:-}"
SKIP_SIGNUP="${MYPAGE_DEV_SMOKE_SKIP_SIGNUP:-false}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --origin)
      ORIGIN="${2:?--origin requires a value}"
      shift 2
      ;;
    --origin=*)
      ORIGIN="${1#--origin=}"
      shift
      ;;
    --report)
      REPORT_PATH="${2:?--report requires a value}"
      shift 2
      ;;
    --report=*)
      REPORT_PATH="${1#--report=}"
      shift
      ;;
    --timeout-seconds)
      TIMEOUT_SECONDS="${2:?--timeout-seconds requires a value}"
      shift 2
      ;;
    --timeout-seconds=*)
      TIMEOUT_SECONDS="${1#--timeout-seconds=}"
      shift
      ;;
    --email)
      PROVIDED_EMAIL="${2:?--email requires a value}"
      shift 2
      ;;
    --email=*)
      PROVIDED_EMAIL="${1#--email=}"
      shift
      ;;
    --password)
      PROVIDED_PASSWORD="${2:?--password requires a value}"
      shift 2
      ;;
    --password=*)
      PROVIDED_PASSWORD="${1#--password=}"
      shift
      ;;
    --handle)
      PROVIDED_HANDLE="${2:?--handle requires a value}"
      shift 2
      ;;
    --handle=*)
      PROVIDED_HANDLE="${1#--handle=}"
      shift
      ;;
    --skip-signup)
      SKIP_SIGNUP="true"
      shift
      ;;
    --skip-signup=*)
      SKIP_SIGNUP="${1#--skip-signup=}"
      shift
      ;;
    --help|-h)
      cat <<'HELP'
MyPage dev API smoke

Creates a temporary local-dev user, logs in with cookies, and checks the
MyPage backend endpoints used by badges, alerts, connected accounts, account
security, and public profile routing.

Usage:
  npm run smoke:mypage:dev-api
  bash scripts/mypage-dev-api-smoke.sh --origin http://127.0.0.1:5176
  bash scripts/mypage-dev-api-smoke.sh --email user@example.com --password '...' --handle @user

Environment:
  MYPAGE_DEV_SMOKE_ORIGIN           Backend or Vite dev origin. Default: http://localhost:8080
  MYPAGE_DEV_SMOKE_REPORT           Report path. Default: reports/mypage-dev-api-smoke.json
  MYPAGE_DEV_SMOKE_TIMEOUT_SECONDS  curl timeout. Default: 10
  MYPAGE_DEV_SMOKE_EMAIL            Existing smoke account email. Skips signup when set with password.
  MYPAGE_DEV_SMOKE_PASSWORD         Existing smoke account password. Skips signup when set with email.
  MYPAGE_DEV_SMOKE_HANDLE           Existing smoke account handle. Optional; derived from login when omitted.
  MYPAGE_DEV_SMOKE_SKIP_SIGNUP      Set true to skip signup and reuse an existing account.
HELP
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

ORIGIN="${ORIGIN%/}"
TMP_DIR="$(mktemp -d /private/tmp/mypage-api-smoke.XXXXXX)"
COOKIE_JAR="$TMP_DIR/cookies.txt"
POLICIES_BODY="$TMP_DIR/policies.json"
SIGNUP_BODY="$TMP_DIR/signup.json"
LOGIN_BODY="$TMP_DIR/login.json"
BODY_FILE="$TMP_DIR/body.json"
CHECKS_JSONL="$TMP_DIR/checks.jsonl"
FAILURES_JSONL="$TMP_DIR/failures.jsonl"
STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
SUFFIX="$(date +%s)$RANDOM"
EMAIL="${PROVIDED_EMAIL:-mypage_smoke_${SUFFIX}@example.com}"
HANDLE="${PROVIDED_HANDLE:-@mp${SUFFIX: -10}}"
PASSWORD="${PROVIDED_PASSWORD:-Test1234!Smoke}"
NORMALIZED_HANDLE=""
ACCOUNT_MODE="created"

cleanup() {
  rm -rf "$TMP_DIR"
}

finish() {
  local exit_code="$?"
  trap - EXIT
  if [ "$exit_code" -eq 0 ]; then
    finalize_report true
  else
    finalize_report false
  fi
  cleanup
  exit "$exit_code"
}
trap finish EXIT

request() {
  local method="$1"
  local path="$2"
  local output="$3"
  local data_file="${4:-}"
  local status

  local curl_exit=0
  if [ -n "$data_file" ]; then
    status="$(curl -sS --max-time "$TIMEOUT_SECONDS" \
      -b "$COOKIE_JAR" \
      -c "$COOKIE_JAR" \
      -o "$output" \
      -w "%{http_code}" \
      -X "$method" \
      -H "Accept: application/json" \
      -H "Content-Type: application/json" \
      --data-binary "@$data_file" \
      "$ORIGIN$path")" || curl_exit=$?
  else
    status="$(curl -sS --max-time "$TIMEOUT_SECONDS" \
      -b "$COOKIE_JAR" \
      -c "$COOKIE_JAR" \
      -o "$output" \
      -w "%{http_code}" \
      -X "$method" \
      -H "Accept: application/json" \
      "$ORIGIN$path")" || curl_exit=$?
  fi

  if [ "$curl_exit" -ne 0 ]; then
    printf "000"
    return 0
  fi

  printf "%s" "$status"
}

json_escape() {
  node --input-type=module -e 'console.log(JSON.stringify(process.argv[1]).slice(1, -1))' "$1"
}

record_check() {
  local name="$1"
  local status="$2"
  local detail="$3"
  printf '{"name":"%s","status":"%s","detail":"%s"}\n' \
    "$(json_escape "$name")" \
    "$(json_escape "$status")" \
    "$(json_escape "$detail")" >> "$CHECKS_JSONL"
}

record_failure() {
  local name="$1"
  local detail="$2"
  printf '{"name":"%s","detail":"%s"}\n' \
    "$(json_escape "$name")" \
    "$(json_escape "$detail")" >> "$FAILURES_JSONL"
}

require_status() {
  local name="$1"
  local actual="$2"
  local expected="$3"
  if [ "$actual" != "$expected" ]; then
    local detail
    detail="$(head -c 240 "$BODY_FILE" 2>/dev/null || true)"
    record_check "$name" "failed" "status=$actual expected=$expected $detail"
    record_failure "$name" "status=$actual expected=$expected $detail"
    echo "[FAIL] $name status=$actual expected=$expected" >&2
    return 1
  fi
  record_check "$name" "passed" "status=$actual"
  echo "[OK] $name"
}

validate_json() {
  local name="$1"
  local file="$2"
  local expression="$3"
  node --input-type=module - "$file" "$expression" <<'NODE'
import fs from 'node:fs';
const [file, expression] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const ok = Function('data', `return (${expression});`)(data);
if (!ok) {
  throw new Error(`validation failed: ${expression}`);
}
NODE
  record_check "$name" "passed" "json validation passed"
  echo "[OK] $name"
}

write_signup_body() {
  node --input-type=module - "$POLICIES_BODY" "$SIGNUP_BODY" "$EMAIL" "$HANDLE" "$PASSWORD" <<'NODE'
import fs from 'node:fs';
const [policiesFile, outputFile, email, handle, password] = process.argv.slice(2);
const policiesPayload = JSON.parse(fs.readFileSync(policiesFile, 'utf8'));
const policyConsents = (policiesPayload.data?.policies ?? [])
  .filter((policy) => policy.required === true)
  .map((policy) => ({
    policyType: policy.policyType,
    version: policy.version,
    agreed: true,
  }));
if (policyConsents.length === 0) {
  throw new Error('required policies were empty');
}
fs.writeFileSync(outputFile, JSON.stringify({
  name: `mypage_smoke_${email.match(/(\d+)/)?.[1]?.slice(-6) ?? 'user'}`,
  handle,
  email,
  password,
  confirmPassword: password,
  favoriteTeam: 'LG',
  policyConsents,
}));
NODE
}

write_login_body() {
  node --input-type=module - "$LOGIN_BODY" "$EMAIL" "$PASSWORD" <<'NODE'
import fs from 'node:fs';
const [outputFile, email, password] = process.argv.slice(2);
fs.writeFileSync(outputFile, JSON.stringify({ email, password }));
NODE
}

urlencode() {
  node --input-type=module -e 'console.log(encodeURIComponent(process.argv[1]))' "$1"
}

normalize_handle() {
  node --input-type=module -e '
const raw = process.argv[1] ?? "";
const trimmed = raw.trim();
if (!trimmed) {
  process.exit(0);
}
console.log((trimmed.startsWith("@") ? trimmed : `@${trimmed}`).toLowerCase());
' "$1"
}

resolve_handle_from_response() {
  local file="$1"
  node --input-type=module - "$file" <<'NODE'
import fs from 'node:fs';
const [file] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const handle = data.data?.handle ?? data.data?.user?.handle ?? data.handle ?? '';
if (!handle) {
  process.exit(1);
}
const trimmed = String(handle).trim();
console.log((trimmed.startsWith('@') ? trimmed : `@${trimmed}`).toLowerCase());
NODE
}

is_truthy() {
  case "$(printf "%s" "$1" | tr '[:upper:]' '[:lower:]')" in
    true|1|yes|y)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

finalize_report() {
  local ok="$1"
  local report_dir
  report_dir="$(dirname "$REPORT_PATH")"
  mkdir -p "$report_dir"
  node --input-type=module - "$REPORT_PATH" "$CHECKS_JSONL" "$FAILURES_JSONL" "$ORIGIN" "$STARTED_AT" "$ok" "$EMAIL" "$NORMALIZED_HANDLE" "$ACCOUNT_MODE" <<'NODE'
import fs from 'node:fs';
const [reportPath, checksPath, failuresPath, origin, startedAt, okValue, email, handle, accountMode] = process.argv.slice(2);
const readJsonl = (path) => fs.existsSync(path)
  ? fs.readFileSync(path, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line))
  : [];
fs.writeFileSync(reportPath, `${JSON.stringify({
  ok: okValue === 'true',
  origin,
  runStartedAt: startedAt,
  runFinishedAt: new Date().toISOString(),
  account: { email, handle, mode: accountMode },
  checks: readJsonl(checksPath),
  failures: readJsonl(failuresPath),
}, null, 2)}\n`);
NODE
  echo "[mypage-dev-api-smoke] report: $REPORT_PATH"
}

main() {
  if [ -n "$PROVIDED_EMAIL$PROVIDED_PASSWORD$PROVIDED_HANDLE" ]; then
    SKIP_SIGNUP="true"
  fi

  if is_truthy "$SKIP_SIGNUP"; then
    ACCOUNT_MODE="existing"
    if [ -z "$PROVIDED_EMAIL" ] || [ -z "$PROVIDED_PASSWORD" ]; then
      echo "[FAIL] existing account mode requires --email and --password" >&2
      record_failure "account-input" "existing account mode requires email and password"
      return 1
    fi
    if [ -z "$PROVIDED_HANDLE" ]; then
      HANDLE=""
    fi
  fi

  NORMALIZED_HANDLE="$(normalize_handle "$HANDLE")"

  echo "[mypage-dev-api-smoke] origin: $ORIGIN"
  echo "[mypage-dev-api-smoke] account mode: $ACCOUNT_MODE"
  echo "[mypage-dev-api-smoke] account email: $EMAIL"

  local status

  status="$(request GET /api/auth/policies/required "$POLICIES_BODY")"
  cp "$POLICIES_BODY" "$BODY_FILE" 2>/dev/null || :
  require_status "required-policies" "$status" "200"
  validate_json "required-policies-json" "$POLICIES_BODY" "data.success === true && Array.isArray(data.data?.policies)"

  if is_truthy "$SKIP_SIGNUP"; then
    record_check "signup" "skipped" "existing account mode"
    echo "[SKIP] signup existing account mode"
  else
    write_signup_body
    status="$(request POST /api/auth/signup "$BODY_FILE" "$SIGNUP_BODY")"
    if [ "$status" = "429" ]; then
      local detail
      detail="$(head -c 240 "$BODY_FILE" 2>/dev/null || true)"
      record_check "signup" "failed" "status=429 rate limited $detail"
      record_failure "signup" "status=429 rate limited. Re-run with --email, --password, and optional --handle to reuse an existing smoke account."
      echo "[FAIL] signup rate limited. Re-run with --email, --password, and optional --handle to reuse an existing smoke account." >&2
      return 1
    fi
    require_status "signup" "$status" "201"
    validate_json "signup-json" "$BODY_FILE" "data.success === true"
  fi

  write_login_body
  status="$(request POST /api/auth/login "$BODY_FILE" "$LOGIN_BODY")"
  require_status "login" "$status" "200"
  validate_json "login-json" "$BODY_FILE" "data.success === true && data.data?.handle"
  if [ -z "$NORMALIZED_HANDLE" ]; then
    NORMALIZED_HANDLE="$(resolve_handle_from_response "$BODY_FILE")"
  fi

  status="$(request GET /api/auth/mypage "$BODY_FILE")"
  require_status "auth-mypage-profile" "$status" "200"
  validate_json "auth-mypage-profile-json" "$BODY_FILE" "data.success === true && String(data.data?.email).toLowerCase() === '$EMAIL'"

  status="$(request GET /api/auth/providers "$BODY_FILE")"
  require_status "connected-providers" "$status" "200"
  validate_json "connected-providers-json" "$BODY_FILE" "data.success === true && Array.isArray(data.data)"

  status="$(request GET /api/auth/sessions "$BODY_FILE")"
  require_status "account-sessions" "$status" "200"
  validate_json "account-sessions-json" "$BODY_FILE" "data.success === true && Array.isArray(data.data)"

  status="$(request GET /api/auth/security-events "$BODY_FILE")"
  require_status "security-events" "$status" "200"
  validate_json "security-events-json" "$BODY_FILE" "data.success === true && Array.isArray(data.data)"

  status="$(request GET /api/notifications/my "$BODY_FILE")"
  require_status "notifications" "$status" "200"
  validate_json "notifications-json" "$BODY_FILE" "Array.isArray(data)"

  status="$(request GET /api/diary/statistics "$BODY_FILE")"
  require_status "diary-statistics" "$status" "200"
  validate_json "diary-statistics-json" "$BODY_FILE" "typeof data.totalCount === 'number'"

  local encoded_handle
  encoded_handle="$(urlencode "$NORMALIZED_HANDLE")"
  status="$(request GET "/api/users/profile/$encoded_handle" "$BODY_FILE")"
  require_status "public-profile-api" "$status" "200"
  validate_json "public-profile-api-json" "$BODY_FILE" "data.success === true && String(data.data?.handle).toLowerCase() === '$NORMALIZED_HANDLE'"

}

main
