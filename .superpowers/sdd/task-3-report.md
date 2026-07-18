# Task 3 Report: Numbered Features 01–03

## Status

DONE

Task 3 is implemented and the focused landing specification is green with all Task 1–2 behavior preserved. The three numbered stories use code-rendered React/CSS vignettes, repository team assets, and operator-provided static marketing examples centralized in `landingShowcaseData.ts`.

## What Changed

- Added the shared `LandingFeatureSection` interface and semantic section shell with decorative watermark, copy/visual areas, alternating desktop DOM placement, and copy-first mobile presentation.
- Added feature `01` with the live indicator, `3 → 4 → 5` score roll, final `5 : 2` display, nine inning segments, and `LG 0.618`, `KIA 0.577`, `한화 0.563` standings bars.
- Added feature `02` with `64%` versus `36%`, animated probability bar, `AI 코치`, and the three approved evidence chips.
- Added feature `03` with the two approved LG/KIA-style posts, non-interactive follow pill, explicit like/comment labels, and like-pop decoration.
- Added the exact section titles, descriptions, vignette examples, and typed feature labels to `landingShowcaseData.ts` so feature components do not invent or fetch baseball data.
- Added `01 muted`, `02 plain + visualFirst`, and `03 muted` to the route orchestrator.
- Added the approved `1120px` two-column layout, `clamp(32px, 5vw, 72px)` gap, `clamp(120px, 15vw, 190px)` watermark, `20px` cards, `#e5e7eb` borders, and narrow/mobile overflow protections.
- Added no header, CTA, footer, screenshot, inline SVG, API call, crawler, scraper, web search, external baseball client, or baseball-data repair path.

## Files

- `.superpowers/sdd/task-3-report.md`
- `cypress/e2e/landing-visual.cy.ts`
- `src/components/Landing.tsx`
- `src/components/Landing.css`
- `src/components/landing/landingShowcaseData.ts`
- `src/components/landing/LandingFeatureSection.tsx`
- `src/components/landing/vignettes/LandingGameDataVignette.tsx`
- `src/components/landing/vignettes/LandingPredictionVignette.tsx`
- `src/components/landing/vignettes/LandingCheerVignette.tsx`

`landingShowcaseData.ts` is a necessary scoped addition beyond the abbreviated Task 3 file list because the approved brief explicitly requires the new vignettes to consume static values from that module.

## RED

Added the specified feature-order/content assertions before editing production code.

Command:

```bash
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
```

The default worktree Cypress cache did not contain Cypress `15.18.0`, and the first fallback attempt could not update the global cache's `binary_state.json` inside the sandbox. Those were environment/setup failures and were not counted as RED. The same focused command was rerun with approved access to the already-installed global Cypress runtime.

Valid RED output:

```text
Landing hero and ticker foundation
  8 passing (14s)
  1 failing

1) renders the first three numbered feature stories and their approved examples
   Expected to find element: [data-testid=landing-feature-01], but never found it.

Tests: 9
Passing: 8
Failing: 1
```

The failure was the expected product failure: the Task 2 baseline had no numbered feature section.

## GREEN

The first post-implementation run found the new section but kept its offscreen reveal node at pre-reveal opacity because the assertions had not scrolled it into the `IntersectionObserver` threshold. The exact visibility assertions were preserved, and `scrollIntoView()` setup was added before each section, following the existing Task 2 app-preview pattern.

Final focused command:

```bash
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
```

Fresh final output:

```text
Landing hero and ticker foundation
  ✓ renders the CTA-free season hero and score ticker
  ✓ lets visitors pause and resume the score ticker
  ✓ aligns the duplicated ticker groups at the loop endpoint
  ✓ omits navigation and calls to action
  ✓ renders the app preview as a code-rendered phone
  ✓ renders the first three numbered feature stories and their approved examples
  ✓ keeps score-card team logos decorative when visible text names each team
  ✓ keeps inactive fixed-light phone tabs at readable contrast
  ✓ shows the final state and disables looping motion for reduced-motion visitors

9 passing (5s)
All specs passed!
```

## Additional Verification

```text
npx tsc --noEmit --pretty false
exit 0, no TypeScript diagnostics

node --import tsx --test src/components/design-slop-guard.test.ts
15 tests, 15 pass, 0 fail

python3 scripts/validate_baseball_data_policy.py
External baseball data policy OK

git diff --check
exit 0, no output
```

## Self-Review

- Confirmed the public `LandingFeatureSectionProps` shape matches the approved interface exactly.
- Confirmed `visualFirst` changes desktop DOM order while the `max-width: 767px` grid areas keep visible mobile reading order copy-first.
- Confirmed all grid children use `min-width: 0`, feature padding drops to `14px` at narrow widths, and cards reduce inner padding to protect 375px layouts.
- Confirmed feature `01` has exactly nine inning segments and uses the brief-authoritative `한화 0.563` third standings row rather than the older prototype example.
- Confirmed the score roll animates through `3`, `4`, and `5`; when motion is disabled by the existing hook, its non-animated first frame is the final `5`.
- Confirmed bars remain under the existing reveal lifecycle and reduced-motion transition contract.
- Confirmed the prediction team logos use meaningful alt text while game logos adjacent to named teams remain decorative.
- Confirmed cheer metadata is text-labelled, the follow pill is a non-interactive `span`, and the post metric container does not reintroduce a page `footer` element.
- Confirmed the existing ticker utility, anonymous no-auth-request assertions, CTA/header/footer absence, fixed-light phone, screenshot absence, reduced-motion behavior, and TypeScript baseline all remain green.
- Confirmed the new baseball examples are operator-provided static marketing data only and no external data flow was introduced.

## Commit

Planned message:

```text
feat: add primary landing feature stories
```

## Concerns

No Task 3 blocker or failing verification remains. Full landing dark-theme completion, features `04–06`, and end-to-end landing QA are intentionally reserved for their later approved plan tasks.

---

## Review Fix: Derived Inning Progress and Exact Feature Order

### What Changed

- Replaced the duplicated `9이닝 중 6이닝 진행` accessible label with a value derived from `LANDING_GAME_DATA.inningStates.length` and its completed-state count.
- Strengthened the feature test from count-only coverage to collect the rendered `data-testid` values and deep-equal the exact order `landing-feature-01`, `landing-feature-02`, `landing-feature-03`.
- Preserved all visible content, baseball examples, animation behavior, responsive layout, and accessibility output.

### TDD Rationale

No new behavior RED was possible for this review fix. The production change centralizes an existing accessible label without changing its rendered value, and the test change makes an already-correct feature order assertion more precise. A deliberately failing assertion would require corrupting the approved order or changing visible/accessibility behavior solely to manufacture a failure.

The strengthened order assertion was therefore added and run before the production refactor. It passed against the unchanged implementation, as expected for a test-quality improvement. The original valid Task 3 RED above remains the behavior RED record.

Pre-refactor focused command and result:

```text
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
9 passing (5s)
All specs passed!
```

### Post-Refactor GREEN

Fresh focused command and result:

```text
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
9 passing (5s)
All specs passed!
```

Additional fresh verification:

```text
npx tsc --noEmit --pretty false
exit 0, no TypeScript diagnostics

node --import tsx --test src/components/design-slop-guard.test.ts
15 tests, 15 pass, 0 fail

python3 scripts/validate_baseball_data_policy.py
External baseball data policy OK

git diff --check
exit 0, no output
```

### Review Self-Check

- Confirmed the derived label still resolves to the exact existing text `9이닝 중 6이닝 진행`.
- Confirmed changing the length or completed entries in `inningStates` now updates both the nine-segment rendering and its accessible progress label from the same operator-provided source.
- Confirmed the order assertion fails on missing, extra, or reordered numbered feature sections rather than checking only the count.
- Confirmed no external baseball source, request, repair, crawler, scraper, web search, or new static baseball value was added.

### Review Fix Commit

Planned message:

```text
fix: derive landing inning progress state
```

### Review Fix Concerns

No review-fix blocker or failing verification remains.

---

# Mate Task 3 Report: URL-Driven List Controller and Restoration E2E

## Status

DONE

The Mate list controller now derives committed search, date, team, status, sort, and page state from canonical URL parameters. All filter handlers update the URL atomically, high pages clamp after a successful response, and list-to-detail navigation carries the canonical filtered list path for both the detail `목록으로` action and browser Back restoration.

## Files

- `cypress/e2e/mate-list-url-state.cy.ts` (created)
- `src/hooks/useMateListController.ts` (modified)

The existing `src/store/mateStore.ts` remains intentionally untouched for Task 4 because `MateRecentSearchesPanel.tsx` and `MatePopularSearchesPanel.tsx` still consume it.

## RED

The Cypress spec was created before production edits and run with:

```bash
CYPRESS_ALLOW_GLOBAL_FALLBACK=1 CYPRESS_DISABLE_AUTO_DOCKER_FALLBACK=1 node scripts/test-e2e.mjs --host 127.0.0.1 --browser electron --spec cypress/e2e/mate-list-url-state.cy.ts
```

The sandbox attempt could not bind localhost (`listen EPERM 127.0.0.1:5176`), so the same command was rerun with approved local-process access. Valid behavior RED:

```text
Tests: 7
Passing: 1
Failing: 6

- deep link: searchQuery was null instead of `잠실 블루존`
- invalid known params remained in location.search
- debounced search request omitted `searchQuery`
- status change request omitted `MATCHED`
- detail `목록으로` lost the filtered query
- page 99 requested backend page 0 instead of 98
```

These were the expected failures from the pre-change local/store-backed controller.

## GREEN

Final focused command:

```bash
CYPRESS_ALLOW_GLOBAL_FALLBACK=1 CYPRESS_DISABLE_AUTO_DOCKER_FALLBACK=1 node scripts/test-e2e.mjs --host 127.0.0.1 --browser electron --spec cypress/e2e/mate-list-url-state.cy.ts
```

Fresh result:

```text
7 passing (11s)
Tests: 7, Passing: 7, Failing: 0
All specs passed!
```

The test fixture was minimally corrected after the first GREEN attempt: aliases now account only for unique `size=9` Mate list requests. The original broad `/api/parties` alias also captured the unrelated `MateTodayCountBadge` `size=1` request and React StrictMode duplicate requests, causing waits to assert against traffic outside the list-controller behavior. All intercepted requests are still replied to; only alias accounting was narrowed.

## Additional Verification

```bash
/opt/homebrew/opt/node@22/bin/node --import tsx --test src/utils/mateListUrlState.test.ts src/utils/mateRouteState.test.ts src/hooks/mateQueryOptions.test.ts
```

```text
12 tests, 12 pass, 0 fail
```

```bash
npm run build
```

```text
exit 0
[log-audit] No suspicious console logs found.
[seo:env:check] PASSED (strict=off)
vite client: 1173 modules transformed; built in 8.27s
[bundle-guard] ok. checked 153 budgets.
[seo:prerender] prerendered 9 indexable and 2 performance routes.
[seo:sitemap] generated dist/sitemap.xml
```

```bash
rg -n "useMateStore|mateStore" src
```

```text
src/store/mateStore.ts
src/components/MatePopularSearchesPanel.tsx
src/components/MateRecentSearchesPanel.tsx
```

`git diff --check` exits 0 with no output.

## Self-Review

- Confirmed every committed filter reads from parsed URL state and every filter/page action performs one `replace` URL write while preserving unknown parameters.
- Confirmed free typing stays local until the guarded debounce commits normalized text and page zero atomically; seat/recent/popular button actions commit immediately.
- Confirmed React Query retains the existing `getMatePartyListQueryOptions` call, query-key fields, and `AbortSignal` query function path.
- Confirmed successful responses clamp only out-of-range pages and rewrite the one-based URL page canonically.
- Confirmed invalid known parameters canonicalize away, unknown parameters survive, invalid legacy `party` is removed, and valid legacy `party` still redirects.
- Confirmed detail route state uses the canonical current list path and both return mechanisms restore the exact query.
- Confirmed no backend/auth/data contract, external baseball source, crawler, scraper, web search, or baseball-data fallback was added.
- Confirmed only the two authorized source/test files will be staged; existing reports and generated build reports remain unstaged.

## Commit

Message:

```text
feat(mate): synchronize list filters with URL
```

Commit: `f72087e8`

## Concerns

No implementation blocker remains. The dev-server run emitted non-fatal WebSocket proxy `ECONNREFUSED` messages because no backend was configured; Cypress API behavior was fully intercepted and all seven assertions passed. Store deletion and panel callback migration remain intentionally deferred to Task 4.

---

## Review Fix: Prove Obsolete Search Request Completion

### Finding Addressed

The obsolete-response test previously used elapsed waits and UI assertions but did not prove that the delayed `느림` request was ever issued. A debounce regression that suppressed that request could therefore leave the test green without exercising stale-response protection.

### Test Change

- Added separate `getSlowSearchParties` and `getFastSearchParties` aliases only for `size=9` Mate list requests, excluding the `size=1` today badge traffic.
- Incremented `slowRequestCount` synchronously when the delayed slow-request handler is entered.
- Replaced the fixed pre-fast delay with a retrying assertion that `slowRequestCount` is greater than zero before typing `빠름`.
- Waited for the fast alias, verified the latest result, then waited for the delayed slow alias to finish before asserting the fast result remains and the slow result is absent.

This is a test-proof strengthening with no production change. The pre-fix test was already green, so manufacturing a behavior RED would require breaking the production debounce or stale-query behavior solely for the test; the original Task 3 RED remains the implementation behavior record.

### Fresh Verification

Command:

```bash
CYPRESS_ALLOW_GLOBAL_FALLBACK=1 CYPRESS_DISABLE_AUTO_DOCKER_FALLBACK=1 node scripts/test-e2e.mjs --host 127.0.0.1 --browser electron --spec cypress/e2e/mate-list-url-state.cy.ts
```

Result:

```text
Mate list URL state
  7 passing (26s)

Tests: 7
Passing: 7
Failing: 0
Pending: 0
Skipped: 0
All specs passed!
```

`git diff --check` exits 0 with no output.

### Review Self-Check

- Confirmed a suppressed slow request now fails before fast input is entered.
- Confirmed both fast and slow list requests must be observed by Cypress aliases.
- Confirmed the delayed slow request completes after the fast response before the final stale-result assertions run.
- Confirmed badge requests cannot satisfy either search alias.
- Confirmed no production, backend, auth, data contract, store, or baseball-data behavior changed.

### Review Fix Commit

Message:

```text
test(mate): prove obsolete search response ordering
```

Commit: `86a557aa`

### Review Fix Concerns

No blocker remains. The focused run again emitted non-fatal WebSocket proxy `ECONNREFUSED` messages because no backend was configured; all relevant HTTP requests were intercepted and the full spec passed.
