# Cheer Internal API Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only internal API smoke test for the Cheer page's feed, search, hot-feed, schedule, and conditional live-snapshot contracts.

**Architecture:** A dependency-injectable Node ESM runner performs only GET requests and returns a structured report. A thin CLI resolves arguments/environment, writes JSON evidence, and exits non-zero for transport or payload contract failures while preserving `MANUAL_BASEBALL_DATA_REQUIRED` as an explicit guarded state.

**Tech Stack:** Node.js ESM, built-in `fetch`, `node:test`, npm scripts, Spring Boot internal APIs.

## Global Constraints

- Do not add external baseball APIs, crawling, scraping, web-search repair, or synthesized baseball facts.
- Do not create or modify application data.
- Do not add pixel-baseline comparison.
- Accept `MANUAL_BASEBALL_DATA_REQUIRED` only as an explicit guarded state and record it in the report.

---

### Task 1: Define the Cheer smoke contract with failing tests

**Files:**
- Create: `scripts/cheer-internal-api-smoke.test.mjs`
- Create after RED: `scripts/cheer-internal-api-smoke.mjs`

**Interfaces:**
- Consumes: injected `fetchImpl(url, options)` compatible with the Fetch API.
- Produces: `runCheerInternalApiSmoke({ apiBase, date, timeoutMs, fetchImpl })` returning a report object.

- [x] **Step 1: Write the failing tests**

Cover a successful live flow, an explicit manual-data schedule response, and a malformed page response. Assert exact requested paths and report outcomes.

- [x] **Step 2: Run the tests to verify RED**

Run: `node --test scripts/cheer-internal-api-smoke.test.mjs`

Expected: FAIL because `scripts/cheer-internal-api-smoke.mjs` does not exist.

- [x] **Step 3: Implement the minimal runner and CLI**

Implement argument/API-base/date normalization, GET-only JSON requests, page/schedule/live validators, guarded manual-data handling, JSON report output, and CLI exit status.

- [x] **Step 4: Run the tests to verify GREEN**

Run: `node --test scripts/cheer-internal-api-smoke.test.mjs`

Expected: all Cheer smoke contract tests pass.

### Task 2: Expose a stable package command

**Files:**
- Modify: `package.json`
- Modify: `scripts/cheer-internal-api-smoke.test.mjs`

**Interfaces:**
- Produces: `npm run smoke:cheer:internal -- --api-base-url http://127.0.0.1:8080`.

- [x] **Step 1: Add a failing package-script assertion**

Assert that `package.json` exposes `smoke:cheer:internal` with the exact Node script entry.

- [x] **Step 2: Run the focused test to verify RED**

Run: `node --test scripts/cheer-internal-api-smoke.test.mjs`

Expected: FAIL because the package script is missing.

- [x] **Step 3: Add the npm script**

Set `smoke:cheer:internal` to `node scripts/cheer-internal-api-smoke.mjs --report reports/cheer-internal-api-smoke.json`.

- [x] **Step 4: Run the focused test to verify GREEN**

Run: `node --test scripts/cheer-internal-api-smoke.test.mjs`

Expected: all tests pass.

### Task 3: Verify against the internal backend and release gates

**Files:**
- Generated: `reports/cheer-internal-api-smoke.json`

**Interfaces:**
- Consumes: a reachable local internal backend at the canonical backend port.
- Produces: JSON smoke evidence with no application-data writes.

- [x] **Step 1: Probe backend readiness**

Run: `curl -sS http://127.0.0.1:8080/actuator/health/readiness`

Expected: JSON readiness response with `status=UP`; if unavailable, start the existing local backend path and retry.

- [x] **Step 2: Run the real Cheer smoke**

Run: `npm run smoke:cheer:internal -- --api-base-url http://127.0.0.1:8080`

Expected: exit 0 with feed/search/hot/schedule checks passed and live either passed, skipped for no live game, or guarded by `MANUAL_BASEBALL_DATA_REQUIRED`.

- [x] **Step 3: Run focused and baseline verification**

Run:

```bash
node --test scripts/cheer-internal-api-smoke.test.mjs
npx tsc --noEmit
npm run build:base
python3 ../scripts/validate_baseball_data_policy.py
git diff --check
```

Expected: all commands exit 0.

- [x] **Step 4: Audit the final diff**

Confirm the change contains only the read-only smoke runner, its tests, package command, design/plan documents, and generated report updates. Confirm there are no POST/PUT/PATCH/DELETE requests and no external baseball domains.
