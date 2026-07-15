# Task 6 Report: Landing QA and Release Evidence

## Status

DONE

Task 6 rewrites the landing QA around the approved CTA-free redesign, updates only the obsolete landing bundle and first-load assumptions proven stale by RED runs, and records fresh responsive, motion, theme, performance, build, Cypress, and baseball-data-policy evidence. No landing production file required a fix.

## What Changed

- Replaced the deleted header/CTA/grid/accordion/laptop selectors with the nine required current landing section selectors.
- Captured mobile, tablet, desktop, feature, and closing PNGs through Chrome DevTools full-page or element capture with `captureBeyondViewport: true`.
- Added exact overflow, hero-size, phone-width, six-feature, and zero-CTA/link metrics for 375x812, 768x1024, and 1280x900.
- Replaced the old `navigation` and `interaction` report contracts with `structure`, `theme`, and `reducedMotion`.
- Added exact section order, feature IDs `01`–`06`, nine stadium chips, ten diary result tiles, no CTA/link, no footer, fixed-palette dark mappings, and reduced-motion assertions for the ticker, live dot, rolling score, like heart, mascot, and all 22 reveal nodes.
- Removed only the two bundle guards whose expected `ThemeToggleButton` and `LandingFeaturesRuntime` chunks no longer exist. The current Landing guard now explicitly forbids those deleted chunks and `landing-showcase-*` from returning.
- Replaced the deleted screenshot-priority static contract with the current CTA-free, repository-local asset, lazy mascot, and redesigned manifest contracts.
- Replaced the first-load audit's deleted screenshot assets, feature runtime, and CTA click with current manifest assets plus a strict lazy-closing-media contract: the mascot image request must be absent before scroll and present after scrolling to the closing section.
- Kept every baseball example on the existing operator-provided static path. No crawler, scraper, web search, external baseball API, repair fallback, or synthesized baseball data was added.

## Files

- `.superpowers/sdd/task-6-report.md`
- `scripts/bundle-guard.mjs`
- `scripts/landing-first-load-audit.mjs`
- `scripts/landing-qa.mjs`
- `scripts/vite-manual-chunks.test.ts`

Generated `reports/bundle-guard-report.json` and `reports/dist-assets-report.json` were intentionally not staged.

## RED Evidence

### Production build

The unqualified build first stopped at the expected environment precheck because `VITE_SITE_URL` and `VITE_API_BASE_URL` were absent. With explicit local values, the build reached the bundle guard and failed only on deleted landing chunk assumptions:

```text
expected chunk missing: ThemeToggleButton manifest avoids heavy icon runtime
expected chunk missing: LandingFeaturesRuntime manifest imports
```

### Static source contract

```bash
node --import tsx --test scripts/vite-manual-chunks.test.ts
```

Initial result: 47 passing, 2 failing.

- In scope: the obsolete `keeps hidden landing screenshots below the primary LCP image priority` contract could not find the deleted screenshot markup.
- Unrelated and unchanged: `reserves /cheer feed and sidebar space to prevent CLS` expected an older exact class string in `CheerSidebarPanels.tsx`.

The new focused first-load contract was added before its audit implementation and failed because the audit contained none of the current landing asset identifiers. After the audit change, the focused landing result became 3/3 passing.

### Landing QA

The first redesigned QA run precisely reported that the old `.ds-hero-title`, header login/CTA, hero CTA, capability showcase/grid, and CTA-button selectors were absent. After the selector rewrite, the first structural run exposed a QA-only ordering bug: the sticky ticker and smooth scroll made numeric viewport positions unsuitable for DOM-order comparison. The check was corrected to use `compareDocumentPosition`.

Screenshot inspection then exposed two more QA-capture defects, not product defects: the baseline inherited system dark mode, and smooth reveal scrolling left later feature screenshots unrevealed. The script now forces the light baseline and completes/validates the reveal sweep before capture.

### First-load audit

The first focused runtime audit had healthy page metrics but failed on stale Task 6 assumptions:

- Missing deleted `landing-showcase-home-*`, `landing-showcase-prediction-*`, `landing-showcase-mate-*`, and `bega-logo-192` assets.
- Missing deleted `LandingFeaturesRuntime` and `PublicShellIcons` entries.
- Timeout clicking deleted `[data-testid="landing-hero-cta-secondary"]`.

This justified the scoped first-load audit update. No product change was made.

## GREEN Evidence

### Responsive landing QA

```bash
npm run qa:landing
```

Fresh result: exit 0, `output/landing-qa/landing-report.json` has `pass: true`, zero failures.

| Viewport | Scroll width | Hero size | Phone width | Features | CTAs/links |
| --- | ---: | ---: | ---: | ---: | ---: |
| 375x812 | 375px | 44px | 347px | 6 | 0 |
| 768x1024 | 768px | 57.6px | 372px | 6 | 0 |
| 1280x900 | 1280px | 80px | 372px | 6 | 0 |

Structure passed with the exact nine-section sequence, feature IDs `01`–`06`, nine stadium chips, ten diary results, zero CTA/link elements, and zero footer elements. Dark-theme checks passed with offseason `rgb(16, 18, 21)`, app preview `rgb(23, 59, 52)`, phone `rgb(242, 242, 247)`, and retro card `rgb(10, 10, 10)`. Reduced motion reported `animationName: none` for all five animated targets and opacity `1` for all 22 reveal nodes.

### Visual inspection

| Artifact | Dimensions |
| --- | ---: |
| `landing-desktop.png` | 1280x7035 |
| `landing-tablet.png` | 768x6242 |
| `landing-mobile.png` | 375x8082 |
| `landing-feature.png` | 1280x552 |
| `landing-closing.png` | 1280x692 |

All five images were opened and inspected against the approved handoff. The final light baseline has the correct section order; desktop/tablet alternate text and visual columns; mobile stacks copy before visuals; deep-mint app and closing surfaces and the fixed-light phone proportions match; all nine stadium chips and ten diary result tiles are visible; the focused feature and closing crops are coherent; and there is no clipped/overflowing content, CTA, or footer.

### Cypress

The worktree-local Cypress cache was unavailable, and the sandboxed global-cache attempt failed with `EPERM`. The repository's existing global-cache fallback was then run with the required permission:

```bash
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
```

Fresh result: Cypress 15.18.0, Electron 138, 15 passing, 0 failing, 8 seconds.

No new Cypress assertion or production fix was required because the redesigned QA found no genuine layout, motion, theme, accessibility, or runtime defect.

### Build and bundle guards

```bash
env VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build
```

Fresh result: exit 0, 1171 client modules transformed, bundle guard checked 153 budgets, 9 indexable and 2 performance routes prerendered, sitemap generated.

### First-load audit

```bash
npm run qa:landing:first-load
```

Fresh post-build result: exit 0, zero failures and zero warnings.

| Viewport | FCP | LCP | CLS | Lazy closing requests before/after scroll |
| --- | ---: | ---: | ---: | ---: |
| Desktop 1440 | 160ms | 476ms | 0 | 0 / 1 |
| Mobile 390 | 132ms | 384ms | 0 | 0 / 1 |

The current 12 critical landing assets total 386,101 bytes under the 524,288-byte landing budget. The 436,130-byte closing mascot remains separately classified, is not requested on initial load, and is requested after scroll. Strict viewport visibility records the closing as absent before scroll and visible after scroll.

### Static, type, design, and policy checks

```text
node --import tsx --test --test-name-pattern='landing' scripts/vite-manual-chunks.test.ts
3 passing, 0 failing

npx tsc --noEmit --pretty false
exit 0, no diagnostics

node --import tsx --test src/components/design-slop-guard.test.ts
15 passing, 0 failing

python3 scripts/validate_baseball_data_policy.py
External baseball data policy OK

git diff --check
exit 0, no output
```

The fresh full `scripts/vite-manual-chunks.test.ts` run is 49/50: both Task 6 landing contracts and all other contracts pass; only the previously recorded, unrelated `/cheer` exact-class assertion remains failing. Per task scope, it was not changed or weakened.

## Self-Review

- Confirmed no deleted CTA, screenshot grid, feature accordion, capability grid, or laptop selector remains in the landing QA.
- Confirmed screenshots use full-page Chrome capture beyond the viewport and element crops after scrolling.
- Confirmed the QA baseline is deterministic light mode, while dark and reduced-motion checks each reload into explicit emulated state.
- Confirmed all 22 reveal nodes are forced visible and self-verified before final capture.
- Confirmed only obsolete landing chunk expectations were removed; all unrelated bundle budgets and guards remain.
- Confirmed the first-load manifest walk includes asset files emitted through the Landing entry's direct import wrappers.
- Confirmed the first-load audit treats only the mascot image, not its tiny static URL wrapper, as deferred media.
- Confirmed no landing production or Cypress file changed because no regression test proved a product defect.
- Confirmed generated report JSON churn is not part of the commit.

## Commit

```text
test: verify redesigned landing experience
```

## Concerns

No landing-specific blocker remains. The full static suite retains one known, unchanged, out-of-scope cheer assertion; the focused landing contracts, production build, responsive QA, first-load audit, Cypress spec, type check, design-slop guard, and baseball-data policy all pass.

---

## Review Fix: Strict Metrics, Visibility, Requests, and Screenshot Re-entry Guards

### Findings addressed

- A missing or non-finite phone width could bypass the previous `>` comparison because JavaScript comparisons with `undefined` or `NaN` are false.
- First-load visibility checked vertical intersection but not horizontal intersection or computed opacity.
- The lazy mascot audit counted request-start records and accepted any positive after-scroll count instead of unique successful completions with an exact `0 -> 1` contract.
- The Landing bundle guard checked only direct manifest imports, so a screenshot-era asset could return through a nested static import wrapper.
- The static source contract scanned only `Landing.tsx`, not the recursively nested `src/components/landing` tree.

### Review RED

The executable helper and recursive source contracts were added before script changes.

```bash
node --import tsx --test --test-name-pattern='landing|first-load|Landing' \
  scripts/landing-audit-contracts.test.mjs scripts/vite-manual-chunks.test.ts
```

Valid RED result:

```text
10 tests
5 passing
5 failing
```

Each new contract failed at its intended missing-helper boundary (`actual: undefined`, `expected: function`):

1. Missing/non-finite phone width rejection and explicit failure text.
2. Two-axis viewport intersection plus positive computed opacity.
3. Unique successful deferred completions plus exact `0 -> 1` and pre/post visibility assertions.
4. Transitive Landing manifest closure inspection of emitted files/assets while allowing current local logo/team/stadium/mascot assets.
5. Recursive landing component-tree scanning that detects a nested screenshot-era identifier without banning a normal PNG import.

The five pre-existing focused landing/static cases remained green during RED.

### Review implementation

- Added `scripts/lib/landing-audit-contracts.mjs` with pure, executable helpers for phone metrics, viewport visibility, successful request completion collection, closing audit failures, static manifest closure traversal, emitted-reference violations, and source-reference violations.
- Added `scripts/landing-audit-contracts.test.mjs` with behavior-level fixtures for each finding.
- Wired `landing-qa.mjs` to reject `undefined`, `null`, `NaN`, and infinite phone widths before calculating the maximum, with `missing phone width metric` in the failure.
- Wired all first-load visibility decisions to the shared predicate requiring positive size, vertical and horizontal viewport overlap, visible display/visibility, and computed opacity greater than zero.
- Marked request failure/completion timestamps, de-duplicated successful deferred requests by request ID, required status `200`–`399`, and asserted the closing section and mascot are both invisible before scroll and visible after scroll.
- Required exactly zero successful mascot completions before scroll and exactly one after scroll.
- Reused the existing bundle guard's static-closure algorithm through the shared helper and added a Landing-only emitted file/asset guard for `landing-showcase-`. It traverses `imports` recursively and leaves the approved current local assets unrestricted.
- Expanded the source contract to `Landing.tsx` plus every recursive `.ts`/`.tsx` file under `src/components/landing`, with precise screenshot-era identifiers rather than a generic `.png` ban.
- Kept the new Landing closure guard skipped for Module Federation-only builds, matching the unrelated client-guard behavior.

### Review GREEN

Fresh focused result:

```text
10 tests
10 passing
0 failing
```

Fresh runtime evidence:

```text
npm run qa:landing
exit 0; landing-report.json pass=true

env VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build
exit 0; 1171 client modules; 153 bundle budgets

npm run qa:landing:first-load
exit 0; zero failures; zero warnings
```

The new bundle result traversed eight Landing static-closure entries with no missing entrypoint/import and no forbidden emitted reference. Both desktop and mobile first-load entries recorded:

- closing section and mascot invisible before scroll;
- zero successful deferred mascot completions before scroll;
- closing section and mascot visible after scroll;
- one unique completed HTTP `200` mascot request after scroll.

Additional fresh verification:

```text
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
15 passing, 0 failing, 8 seconds

npx tsc --noEmit --pretty false
exit 0, no diagnostics

node --import tsx --test src/components/design-slop-guard.test.ts
15 passing, 0 failing

python3 scripts/validate_baseball_data_policy.py
External baseball data policy OK
```

The fresh full static run remains 49/50 with the same unchanged, unrelated `/cheer` exact-class assertion and no new failure.

### Review-fix scope

- No production React/CSS, Cypress, authentication, or baseball-data file changed.
- No external baseball source, crawler, scraper, web search, API request, or repair fallback was added.
- All unrelated bundle budgets and guards remain intact.
- Generated bundle/dist report JSON remains excluded from the commit.

### Review-fix commit

Planned message:

```text
test: harden landing audit contracts
```
