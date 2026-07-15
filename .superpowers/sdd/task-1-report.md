# Task 1 Report: CTA-Free Hero and Ticker Contract

## Status

DONE_WITH_CONCERNS

The Task 1 behavior contract is implemented, committed, and green. The only concern is an existing bundle-guard expectation that still requires chunks intentionally removed from the landing entry by this redesign slice.

## What Changed

- Replaced the obsolete screenshot/CTA/accordion Cypress coverage with the focused CTA-free hero and ticker foundation contract.
- Added typed repository asset exports for the BEGA logo, mascot, stadium artwork, and all ten team logos.
- Added the exact operator-provided static ticker examples, typed team order, and display labels.
- Added an accessible sticky score ticker with two identical groups; the duplicate group is hidden from assistive technology.
- Added the approved hero lockup, exact headline and subcopy, `10 / 720 / 9` statistics, ten team marks, decorative `720`, and `SCROLL` indicator.
- Reduced `Landing.tsx` to the load-trace-preserving route orchestrator required by Task 1.
- Replaced the old landing CSS with the approved base page, 26-second ticker, 1120px hero content width, responsive hero type, dark surfaces, and reduced-motion ticker handling.
- Added no API request, crawler, scraper, web search, external baseball client, fallback synthesis, product screenshot, CTA, navigation header, or footer.

## Files

- `cypress/e2e/landing-visual.cy.ts`
- `src/components/Landing.tsx`
- `src/components/Landing.css`
- `src/components/landing/landingAssets.ts`
- `src/components/landing/landingShowcaseData.ts`
- `src/components/landing/LandingTicker.tsx`
- `src/components/landing/LandingHero.tsx`

## RED

Command:

```bash
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
```

The first sandboxed attempt stopped before the test because Cypress could not unlink its global-cache `binary_state.json` (`EPERM`), so that run was not counted as RED. The same command was rerun with approved access to the existing global Cypress cache.

Observed valid RED output:

```text
Landing hero and ticker foundation
  1) renders the CTA-free season hero and score ticker
  2) omits navigation and calls to action

0 passing (23s)
2 failing

AssertionError: Expected to find content: '10개 구단' but never did.
```

Reason: the existing landing still rendered the old headline and had not implemented the new hero/ticker contract. This was the expected product failure, not a test setup or syntax error.

## GREEN

Final focused command after implementation and semantic self-review cleanup:

```bash
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
```

Output:

```text
Landing hero and ticker foundation
  ✓ renders the CTA-free season hero and score ticker
  ✓ omits navigation and calls to action

2 passing (1s)
All specs passed!
```

Additional verification:

```text
node --import tsx --test src/components/design-slop-guard.test.ts
15 tests, 15 pass, 0 fail

python3 scripts/validate_baseball_data_policy.py
External baseball data policy OK

git diff --check
exit 0, no output
```

Production build evidence:

```bash
env VITE_SITE_URL=http://127.0.0.1:5176 VITE_API_BASE_URL=/api npm run build
```

Vite transformed 1158 client modules and completed the client build (`✓ built in 31.52s`). The following existing `bundle-guard` stage exited 1 because its manifest guards still expect the now-unreferenced `ThemeToggleButton` and `LandingFeaturesRuntime` chunks. The generated tracked reports were restored exactly and were not committed.

## Self-Review

- Confirmed the staged and committed file list contains exactly the seven Task 1 files.
- Confirmed the exact `TeamKey`, `TEAM_ORDER`, and five `TICKER_ITEMS` values match the approved brief.
- Confirmed `TEAM_ASSETS` is `Record<TeamKey, string>` and maps to the existing hashed team assets.
- Confirmed logo, mascot, and stadium exports use the exact repository assets named by the global constraints.
- Confirmed the first ticker group is exposed once and the duplicate group has `aria-hidden="true"`; ticker logo images use empty alt text because adjacent text already names both teams.
- Corrected the hero definition-list DOM order during review (`dt` before `dd`) while preserving the approved number-first visual order with CSS.
- Confirmed the route retains only the `Landing mount`/`Landing unmount` request-load trace effect and does not change root/auth routing.
- Confirmed no new HTTP/API/baseball data collection code, external domains, screenshot imports, inline SVG, CTA hooks, header hooks, or footer markup were added.
- Confirmed the final worktree was clean immediately after the scoped commit.

## Commit

`7714f2327d1b591eb0d0a49bc42d39304d6ea54c` — `feat: rebuild landing hero and ticker`

## Concerns

- `npm run build` currently fails only at the post-build bundle guard because `scripts/bundle-guard.mjs` still requires manifest chunks for the old landing `ThemeToggleButton` and `LandingFeaturesRuntime`. Updating that guard is outside the Task 1 file list and should be handled by the later landing QA/release slice. The focused Task 1 Cypress contract, Vite compilation/bundling, design-slop guard, and baseball-data policy guard all pass.

---

## Reviewer Fix: Accessible Ticker Playback Control and Loop Seam

The approved plan/spec resolution in `cc3bb7d4` classifies the ticker playback button as an accessibility control, not a CTA.

### What Changed

- Added a visible native button with stable hook `landing-ticker-toggle`.
- Added initial `aria-pressed="false"` with the exact label `티커 일시정지`.
- Added paused `aria-pressed="true"` with the exact label `티커 재생`.
- Added `data-paused="true"` to the motion track while paused and CSS `animation-play-state: paused` control.
- Added visible focus treatment for keyboard users.
- Corrected the duplicated ticker loop endpoint from `translateX(-50%)` to `translateX(calc(-50% - 22px))`, accounting for half of the 44px inter-group gap.
- Added focused Cypress coverage for pause, resume, both labels, both `aria-pressed` values, both computed playback states, and the browser-resolved final animation keyframe.

### Files

- `cypress/e2e/landing-visual.cy.ts`
- `src/components/landing/LandingTicker.tsx`
- `src/components/Landing.css`

### RED

Command:

```bash
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
```

Valid RED output:

```text
Landing hero and ticker foundation
  ✓ renders the CTA-free season hero and score ticker
  1) lets visitors pause and resume the score ticker
  2) aligns the duplicated ticker groups at the loop endpoint
  ✓ omits navigation and calls to action

2 passing (23s)
2 failing

Expected to find element: [data-testid=landing-ticker-toggle], but never found it.
expected 'translateX(-50%)' to equal 'translateX(calc(-50% - 22px))'
```

The failures were the intended missing-control and old-loop-endpoint product failures.

### GREEN

Command:

```bash
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
```

Output:

```text
Landing hero and ticker foundation
  ✓ renders the CTA-free season hero and score ticker
  ✓ lets visitors pause and resume the score ticker
  ✓ aligns the duplicated ticker groups at the loop endpoint
  ✓ omits navigation and calls to action

4 passing (6s)
All specs passed!
```

Additional fresh verification:

```text
node --import tsx --test src/components/design-slop-guard.test.ts
15 tests, 15 pass, 0 fail

python3 scripts/validate_baseball_data_policy.py
External baseball data policy OK

git diff --check
exit 0, no output
```

### Self-Review

- Confirmed the fix commit contains only the three approved Task 1 files listed above.
- Confirmed the button is semantic, keyboard-focusable, text-labelled, and does not navigate or submit.
- Confirmed the control resumes as well as pauses and restores its initial accessible state.
- Confirmed the loop endpoint test reads the browser's actual animation keyframes rather than duplicating source text inspection.
- Confirmed the original ticker examples, duplicated accessible content contract, auth tracing, CTA absence, and hero behavior remain unchanged.
- Confirmed no API request, external baseball source, crawler, scraper, screenshot, inline SVG, route, or data-contract change was introduced.

### Fix Commit

`8f629cfea1011626d2d3aa7031ca3494eec45daf` — `fix: make landing ticker pausable`

### Fix Concerns

- No new concern from this reviewer fix. The earlier post-build bundle-guard concern remains unchanged and is documented above.
