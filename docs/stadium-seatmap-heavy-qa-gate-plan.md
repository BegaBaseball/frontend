# Stadium Seatmap Heavy QA Gate Plan

Date: 2026-06-18

## Summary

Heavy Stadium QA remains a staged follow-up gate. This document records the
execution order and failure handling rules; it does not run or approve the
mobile/full visual QA by itself.

## Gate Order

### Stage 1: Dispatcher and Status Gate

Run lightweight command and runner checks before visual QA:

```bash
node --test scripts/stadium-task-runner.test.mjs
node --check scripts/lib/stadium-task-runner.mjs
node --check scripts/stadium-seatmap-ops.mjs
node --check scripts/daegu-seatmap-ops.mjs
node --check scripts/incheon-seatmap-ops.mjs
node scripts/qa-presets.mjs --print stadium daegu status
node scripts/stadium-seatmap-ops.mjs daegu status
node scripts/daegu-seatmap-ops.mjs status
node scripts/stadium-seatmap-ops.mjs incheon status
node scripts/incheon-seatmap-ops.mjs status
```

If this stage fails, fix only runner, wrapper, or task-dispatch contracts.

### Stage 1 Result Snapshot

Executed on 2026-06-18 KST in the current dirty frontend worktree. No mobile or
full visual QA was run in this stage, and no generated report artifact is part
of this package.

| Command | Result | Notes |
| --- | --- | --- |
| `node --test scripts/stadium-task-runner.test.mjs` | PASS | `7/7` tests passed. |
| `node --check scripts/lib/stadium-task-runner.mjs` | PASS | Syntax check only. |
| `node --check scripts/stadium-seatmap-ops.mjs` | PASS | Syntax check only. |
| `node --check scripts/daegu-seatmap-ops.mjs` | PASS | Syntax check only. |
| `node --check scripts/incheon-seatmap-ops.mjs` | PASS | Syntax check only. |
| `node scripts/qa-presets.mjs --print stadium daegu status` | PASS | Printed central dispatcher command for `daegu status`. |
| `node scripts/stadium-seatmap-ops.mjs daegu status` | PASS | Reported `status=integrated-entrypoint`. |
| `node scripts/daegu-seatmap-ops.mjs status` | PASS | Reported `status=canonical-runtime-release-entrypoint`. |
| `node scripts/stadium-seatmap-ops.mjs incheon status` | PASS | Reported `status=integrated-entrypoint`. |
| `node scripts/incheon-seatmap-ops.mjs status` | PASS | Matched central Incheon dispatcher status output. |

### Stage 2: Mobile Smoke Gate

Run mobile smoke after Stage 1 passes and after deletion/display policy review
is settled:

```bash
npm run qa:stadium:mobile:smoke
npm run qa:stadium:daegu:mobile
npm run qa:stadium:suwon:mobile
npm run qa:stadium:jamsil:mobile
npm run qa:stadium:daejeon:mobile
npm run qa:stadium:gocheok:mobile
npm run qa:stadium:gwangju:mobile
npm run qa:stadium:incheon:mobile
npm run qa:stadium:changwon:mobile
npm run qa:stadium:sajik:mobile
```

#### Stage 2A Result Snapshot: Jamsil Mobile Smoke Only

Executed on 2026-06-18 KST in the current dirty frontend worktree. This result
covers only the `JAMSIL:smoke` target at the `mobile-390` viewport; it does not
mark the full Stage 2 mobile gate as complete. Generated Playwright artifacts
remain execution evidence only and are not part of the tracked package.

| Field | Result |
| --- | --- |
| Command | `npm run qa:stadium:mobile:smoke` |
| Final exit code | `0` |
| Target | `JAMSIL:smoke` |
| Viewport | `mobile-390` |
| Server mode | `forced-started` |
| Base URL | `http://127.0.0.1:5198` |
| Output directory | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-jamsil-smoke` |
| Summary artifact | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-jamsil-smoke/stadium-mobile-smoke-summary.md` |
| Generated at | `2026-06-18T14:33:04.849Z` |
| Duration | `40057ms` |
| Overflow failures | `0` |
| Actionable failed requests | `0` |
| Actionable console errors | `0` |
| Jamsil operator runtime | PASS, `9/9` hit areas clicked |

The first Stage 2A attempt exposed stale audit expectations: the Jamsil smoke
audit still expected visible `MANUAL_BASEBALL_DATA_REQUIRED` text even though
the current runtime policy keeps that value in metadata/status/test contracts
only. The audit contract was narrowed to require the user-facing operator-needed
copy and to reject visible `MANUAL_BASEBALL_DATA_REQUIRED` labels. A follow-up
run also showed a non-actionable `net::ERR_ABORTED` on the QA fixture
`/api/stadiums` list request after the page flow completed, so the browser
failure filter now ignores only that exact aborted fixture request.

#### Stage 2B Result Snapshot: Stadium Mobile Commands

Executed on 2026-06-18 KST in the current dirty frontend worktree, after Stage
2A passed. The current stadium-specific `mobile` wrappers produced two scenarios
per command, `mobile-390` and `desktop-1440`; both scenarios passed for every
stadium below. Generated Playwright artifacts remain execution evidence only
and are not part of the tracked package.

| Command | Result | Generated at | Duration | Scenarios | Output summary |
| --- | --- | --- | ---: | --- | --- |
| `npm run qa:stadium:daegu:mobile` | PASS | `2026-06-18T14:37:37.782Z` | `34215ms` | `mobile-390`, `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-daegu-validate/stadium-mobile-smoke-summary.md` |
| `npm run qa:stadium:suwon:mobile` | PASS | `2026-06-18T14:42:30.608Z` | `286784ms` | `mobile-390`, `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-suwon-validate/stadium-mobile-smoke-summary.md` |
| `npm run qa:stadium:jamsil:mobile` | PASS | `2026-06-18T14:43:31.836Z` | `52002ms` | `mobile-390`, `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-jamsil-validate/stadium-mobile-smoke-summary.md` |
| `npm run qa:stadium:daejeon:mobile` | PASS | `2026-06-18T14:46:26.506Z` | `168352ms` | `mobile-390`, `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-daejeon-validate/stadium-mobile-smoke-summary.md` |
| `npm run qa:stadium:gocheok:mobile` | PASS | `2026-06-18T14:47:10.166Z` | `37876ms` | `mobile-390`, `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-gocheok-validate/stadium-mobile-smoke-summary.md` |
| `npm run qa:stadium:gwangju:mobile` | PASS | `2026-06-18T14:48:04.280Z` | `45812ms` | `mobile-390`, `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-gwangju-validate/stadium-mobile-smoke-summary.md` |
| `npm run qa:stadium:incheon:mobile` | PASS | `2026-06-18T14:48:53.470Z` | `43100ms` | `mobile-390`, `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-incheon-validate/stadium-mobile-smoke-summary.md` |
| `npm run qa:stadium:changwon:mobile` | PASS | `2026-06-18T14:52:59.809Z` | `240533ms` | `mobile-390`, `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-changwon-validate/stadium-mobile-smoke-summary.md` |
| `npm run qa:stadium:sajik:mobile` | PASS | `2026-06-18T14:53:46.920Z` | `37040ms` | `mobile-390`, `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-sajik-validate/stadium-mobile-smoke-summary.md` |

All Stage 2B summaries reported `0` overflow failures, `0` actionable failed
requests, and `0` actionable console errors. Jamsil operator runtime checks
passed `9/9` hit areas in both scenarios. Gwangju runtime-layer checks passed
in both scenarios.

If this stage fails, fix only Stadium component/data/layout contracts tied to
the failing stadium. Do not restore or delete tracked assets unless the failure
proves a missing import and the asset owner decision is explicit.

### Stage 3: Full Visual Gate

Run full visual QA only after the mobile smoke gate passes:

```bash
npm run qa:stadium:daegu:full
npm run qa:stadium:suwon:full
npm run qa:stadium:jamsil:full
npm run qa:stadium:gocheok:full
npm run qa:stadium:gwangju:full
npm run qa:stadium:incheon:full
```

Add Daejeon, Changwon, or Sajik full commands only when their package scripts
are present and the owning review package asks for them.

### Stage 3 Result Snapshot: Full Visual Gate

Started on 2026-06-18 KST after Stage 2B passed and completed on 2026-06-19
KST, in the current dirty frontend worktree. Generated Playwright artifacts
remain execution evidence only and are not part of the tracked package.

| Command | Result | Generated at | Duration | Scenario | Output summary |
| --- | --- | --- | ---: | --- | --- |
| `npm run qa:stadium:daegu:full` | PASS | `2026-06-18T14:55:13.717Z` | `25296ms` | `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-daegu-full/stadium-mobile-smoke-summary.md` |
| `npm run qa:stadium:suwon:full` | PASS | `2026-06-18T14:57:37.604Z` | `138178ms` | `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-suwon-full/stadium-mobile-smoke-summary.md` |
| `npm run qa:stadium:jamsil:full` | PASS | `2026-06-18T15:01:31.472Z` | `53422ms` | `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-jamsil-full/stadium-mobile-smoke-summary.md` |
| `npm run qa:stadium:gocheok:full` | PASS | `2026-06-18T15:01:41.759Z` | `3614ms` | `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-gocheok-full/stadium-mobile-smoke-summary.md` |
| `npm run qa:stadium:gwangju:full` | PASS | `2026-06-18T15:08:28.744Z` | `25777ms` | `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-gwangju-full/stadium-mobile-smoke-summary.md` |
| `npm run qa:stadium:incheon:full` | PASS | `2026-06-18T15:08:55.324Z` | `18123ms` | `desktop-1440` | `/Users/mac/project/KBO_platform/output/playwright/stadium-ux-incheon-full/stadium-mobile-smoke-summary.md` |

Gwangju full was initially blocked because the package and dispatcher did not
expose a `full` task. The public alias `qa:stadium:gwangju:full` now delegates
through `node scripts/qa-presets.mjs stadium gwangju full`, and the dispatcher
routes the task to `node scripts/run-stadium-isolated-qa.mjs GWANGJU:FULL`.
The first local run in the sandbox failed before QA with `EPERM` while binding
`127.0.0.1:5192`; the same command passed when rerun with local port binding
permission.

The Jamsil full gate initially failed twice while the audit waited for the
shared seat-view gallery after a section click. Root cause was an audit contract
gap: the full-click loop checked general visible text instead of confirming that
the Jamsil detail panel or bottom sheet had actually selected the target
section. The audit was narrowed to use the existing `waitForJamsilDetailTitle`
helper before requiring gallery state, then `npm run qa:stadium:jamsil:full`
passed on rerun.

All Stage 3 summaries reported `0` overflow failures, `0` actionable failed
requests, and `0` actionable console errors. Daegu full click checks passed
`130/130`; Jamsil operator runtime passed `9/9`; Gwangju runtime-layer checks
passed with `113` hit areas and `111` clicked targets.

## Failure Policy

- Preserve HTTP API, route, DB, and npm script names.
- Do not rewrite large stadium-specific QA bodies in this gate.
- Do not use external baseball crawling, scraping, or web-search data.
- Keep missing or unclear baseball operating data under the
  `MANUAL_BASEBALL_DATA_REQUIRED` contract and request operator-provided data.
- Record final command output in the relevant release lock or package review
  document before approving release.
