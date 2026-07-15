# Task 2 Report: Code-Rendered App Preview and Motion Lifecycle

## Status

DONE_WITH_CONCERNS

Task 2 is implemented and the full focused landing specification is green. The app preview uses only code, CSS, static operator-provided copy, and existing repository assets. The remaining concern is an inherited check outside the Task 2 file list: the production bundle guard still expects two legacy landing chunks removed by Task 1. The earlier `LandingHero` TypeScript diagnostic was cleared by the review fix documented below.

## What Changed

- Added `useLandingMotion()` with a single effect for once-only reveals, 1,200ms cubic ease-out counts, declared-width bars, and requestAnimationFrame-throttled passive-scroll parallax.
- Added reduced-motion and missing-`IntersectionObserver` final-state handling, plus complete observer/listener/frame cleanup.
- Added the approved deep-mint app-preview copy and responsive fixed-light `372 / 690` phone frame.
- Added a code-rendered BEGA phone home preview in the required order: BEGA/LIVE row, live score, `64%` prediction, `LG vs 두산` mate card, cheer post, two standings rows, and five-item tab bar.
- Added a notch, status row, and home indicator without inline SVG or screenshot assets.
- Extended the focused Cypress contract for the phone content, product-screenshot absence, and reduced-motion final state while preserving all four Task 1 behaviors.
- Added no CTA, navigation, footer, API request, crawler, scraper, external baseball client, web search, or fallback synthesis.

## Files

- `cypress/e2e/landing-visual.cy.ts`
- `src/components/Landing.tsx`
- `src/components/Landing.css`
- `src/components/landing/useLandingMotion.ts`
- `src/components/landing/LandingPhonePreview.tsx`
- `src/components/landing/LandingAppPreview.tsx`

## RED

Command:

```bash
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
```

The first sandboxed invocation stopped before testing because Cypress could not unlink the existing global-cache `binary_state.json` (`EPERM`), so it was not counted as RED. The exact command was rerun with approved access to the already-installed Cypress runtime.

Valid RED output:

```text
Landing hero and ticker foundation
  ✓ renders the CTA-free season hero and score ticker
  ✓ lets visitors pause and resume the score ticker
  ✓ aligns the duplicated ticker groups at the loop endpoint
  ✓ omits navigation and calls to action
  1) renders the app preview as a code-rendered phone
  2) shows the final state and disables looping motion for reduced-motion visitors

4 passing (23s)
2 failing

Expected to find element: [data-testid=landing-app-preview], but never found it.
expected 'landing-ticker' to equal 'none'
```

Reason: the Task 1 base had no app-preview/phone composition, no landing motion hook, and only the CSS reduced-motion ticker rule. These were the expected missing Task 2 product behaviors rather than a syntax, setup, or server failure.

## GREEN

Final focused command:

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
  ✓ renders the app preview as a code-rendered phone
  ✓ shows the final state and disables looping motion for reduced-motion visitors

6 passing (3s)
All specs passed!
```

The first implementation run correctly exposed two integration details before final GREEN: Cypress needed to scroll the offscreen reveal target into view, and JavaScript `matchMedia` stubbing does not activate the browser's CSS media engine. The test retained the required assertions while scrolling to the real viewport state, and the hook now also finalizes decorative animations for JavaScript-detected reduced motion.

## Additional Verification

```text
node --import tsx --test src/components/design-slop-guard.test.ts
15 tests, 15 pass, 0 fail

python3 /Users/mac/project/KBO_platform/scripts/validate_baseball_data_policy.py --verbose
External baseball data policy OK (runtime_files=2491, dependency_files=3)

git diff --check
exit 0, no output
```

Production build command:

```bash
env VITE_SITE_URL=http://127.0.0.1:5176 VITE_API_BASE_URL=/api npm run build
```

Vite transformed 1,161 client modules and completed the client bundle (`✓ built in 6.25s`). The subsequent existing `bundle-guard` stage exited 1 because it still requires manifest chunks for the removed `ThemeToggleButton` and `LandingFeaturesRuntime`. Generated tracked reports were restored and are not part of the Task 2 diff.

Additional type-check command:

```bash
npx tsc --noEmit --pretty false
```

This exits 2 on the unchanged Task 1 file `src/components/landing/LandingHero.tsx:43`, where the `as const` hero-stat union does not expose `accent` on every member. No Task 2 file appears in the TypeScript diagnostics.

## Self-Review

- Confirmed `Landing.tsx` remains a small orchestrator, retains only the existing load-trace effect, and does not alter `RootEntryRoute` or auth bootstrap behavior.
- Confirmed the focused spec still proves anonymous landing visits make no `/auth/mypage` request.
- Confirmed the preview uses the existing BEGA, LG, Doosan, and KIA repository assets and contains no `landing-showcase-*` product screenshot.
- Confirmed the phone frame uses `.landing-phone-scale { width: min(372px, 100%); }`, `aspect-ratio: 372 / 690`, fixed-light tokens, responsive padding, and no horizontal fixed-width child.
- Confirmed the phone DOM order and all exact required static copy values match the operator handoff.
- Confirmed reduced motion disables `[data-motion-loop]` and `[data-anim]`, reveals final content, finishes bars/counts, and skips parallax listener setup.
- Confirmed normal motion observes at threshold `0.18`, unobserves after reveal, uses the required cubic count expression over 1,200ms, and cancels observer/listener/animation-frame work on cleanup.
- Confirmed no HTTP/API usage, external baseball domain, crawler, scraper, web search, synthesized fallback, CTA, link, route mutation, footer, or inline SVG was added.
- Confirmed the final scoped file list is exactly the six Task 2 files above and `git diff --check` is clean.

## Commit

`7c9f91f8` — `feat: add landing app preview motion`

## Concerns

- `npm run build` completes Vite compilation/bundling but the inherited bundle guard still fails on obsolete `ThemeToggleButton` and `LandingFeaturesRuntime` manifest expectations documented in Task 1.

---

## Review Fix: Reduced Motion, Fixed-Light Contrast, Semantics, and Typing

### What Changed

- Disabled prediction-bar transitions in both the CSS `prefers-reduced-motion` contract and the hook's JavaScript-detected reduced-motion path, so the `64%` final width settles with zero delay or duration.
- Darkened inactive fixed-light bottom-tab labels from `#94a3b8` to `#475569`, retaining the white phone surface while meeting the 4.5:1 contrast contract.
- Changed the two live score-card team-logo alt values to empty strings because adjacent visible `LG` and `두산` text already names the teams.
- Added an explicit readonly `HeroStat` type so optional `accent` access is valid without changing rendered values or behavior.
- Split the focused accessibility regressions into independent Cypress cases so each failure and contract is observable.

### Files

- `cypress/e2e/landing-visual.cy.ts`
- `src/components/Landing.css`
- `src/components/landing/LandingHero.tsx`
- `src/components/landing/LandingPhonePreview.tsx`
- `src/components/landing/useLandingMotion.ts`
- `.superpowers/sdd/task-2-report.md`

### RED

Focused Cypress command:

```bash
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
```

Valid RED output after separating the review assertions:

```text
5 passing (13s)
3 failing

expected '<img>' to have attribute 'alt' with the value '', but the value was 'LG'
경기 contrast: expected 2.5640413904962034 to be at least 4.5
expected transitionDuration '1.2s' to equal '0s'
```

Each failure directly represented a review finding: duplicate accessible logo names, insufficient inactive-tab contrast on the fixed white surface, and a delayed reduced-motion prediction bar.

Typing RED command:

```bash
npx tsc --noEmit --pretty false
```

Output:

```text
src/components/landing/LandingHero.tsx(43,35): error TS2339: Property 'accent' does not exist on type ...
Property 'accent' does not exist on type '{ readonly value: 10; readonly label: "구단"; }'.
```

This was the sole full-project TypeScript diagnostic.

### GREEN

Focused Cypress command and result:

```text
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
8 passing (4s)
All specs passed!
```

The eight passing behaviors include all four Task 1 regressions, Task 2 composition/reduced-motion coverage, decorative score-logo semantics, and measured inactive-tab contrast of at least 4.5:1.

Typing command and result:

```text
npx tsc --noEmit --pretty false
exit 0, no diagnostics
```

Additional fresh verification:

```text
node --import tsx --test src/components/design-slop-guard.test.ts
15 tests, 15 pass, 0 fail

python3 /Users/mac/project/KBO_platform/scripts/validate_baseball_data_policy.py --verbose
External baseball data policy OK (runtime_files=2491, dependency_files=3)

git diff --check
exit 0, no output
```

### Self-Review

- Confirmed the real CSS media query and JavaScript `matchMedia` fallback both remove bar transition timing while preserving the final `64%` width.
- Confirmed the phone preview remains fixed-light and only the inactive tab token changed; the active mint treatment is unchanged.
- Confirmed the contrast test calculates relative luminance from computed browser color rather than asserting a duplicated source literal.
- Confirmed only duplicate score-card image announcements were removed; surrounding visible team names and other meaningful image alternatives remain intact.
- Confirmed `HERO_STATS` still contains the exact `10`, `720`, and `9` display values and only its TypeScript annotation changed.
- Confirmed no auth, route, API, baseball-data source, CTA, navigation, footer, screenshot, or inline-SVG behavior changed.

### Commit

`fix: address landing preview review findings` (hash reported in the final handoff)

### Concerns

- No remaining TypeScript or focused Task 2 review diagnostic. The previously documented inherited bundle-guard expectation remains outside this review-fix scope.
