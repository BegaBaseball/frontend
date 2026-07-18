# Task 4 Report: Numbered Features 04–06

## Status

DONE

Task 4 adds the final three numbered feature stories with the approved handoff copy, typed operator-provided static examples, repository assets, and code-rendered React/CSS vignettes. The focused landing specification is green with the Tasks 1–3 contracts preserved.

## What Changed

- Added feature `04` with the approved `LG vs 두산 · 잠실` matching card, date, party size, seat, `신청 → 승인 → 채팅` progression, and deposit copy.
- Added feature `05` with nine non-interactive stadium chips in handoff order, repository stadium art using the existing low-parallax lifecycle, the full Jamsil venue label, and `25,000 / 32 / 2호선` statistics.
- Added feature `06` with ten semantic result tiles in `승 승 패 승 무 승 승 패 승 승` order, the `10회 · 승률 0.700` summary, and the approved one-line quote.
- Centralized all new feature copy and static vignette values in the typed `landingShowcaseData.ts` module rather than duplicating baseball examples across components.
- Added `04 plain + visualFirst`, `05 muted`, and `06 plain + visualFirst` to the route orchestrator.
- Extended the exact numbered-section assertion from `01–03` to `01–06` and added the specified content, nine-chip, and ten-result checks.
- Added no CTA, navigation header, footer, screenshot, inline SVG, external request, crawler, scraper, web search, external baseball client, or baseball-data repair path.

## Files

- `.superpowers/sdd/task-4-report.md`
- `cypress/e2e/landing-visual.cy.ts`
- `src/components/Landing.tsx`
- `src/components/Landing.css`
- `src/components/landing/landingShowcaseData.ts`
- `src/components/landing/vignettes/LandingMateVignette.tsx`
- `src/components/landing/vignettes/LandingStadiumVignette.tsx`
- `src/components/landing/vignettes/LandingDiaryVignette.tsx`

`landingShowcaseData.ts` is an authorized scoped addition beyond the abbreviated Task 4 file list so the operator-provided examples remain centralized and typed.

## RED

The exact missing-section, six-section count/order, mate progression, stadium-chip count, diary summary, and diary-result count assertions were added before any production edit.

Command:

```bash
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
```

The first sandboxed attempt could not update the already-installed global Cypress cache's `binary_state.json` and was an environment failure, not the RED result. The command was rerun with approved access to the existing Cypress runtime.

Valid RED output:

```text
Landing hero and ticker foundation
  8 passing (14s)
  1 failing

1) renders all six numbered feature stories and their approved examples
   Expected to find element: [data-testid=landing-feature-04], but never found it.

Tests: 9
Passing: 8
Failing: 1
```

The failure was the expected product failure: the Task 3 baseline had no section `04` or later section.

## GREEN

Fresh focused command:

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
  ✓ renders all six numbered feature stories and their approved examples
  ✓ keeps score-card team logos decorative when visible text names each team
  ✓ keeps inactive fixed-light phone tabs at readable contrast
  ✓ shows the final state and disables looping motion for reduced-motion visitors

9 passing (6s)
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

- Confirmed the DOM has exactly six numbered features in `01` through `06` order.
- Confirmed feature `04` uses `plain + visualFirst`, feature `05` uses `muted`, and feature `06` uses `plain + visualFirst`.
- Confirmed the existing mobile grid-area rule keeps copy visually first below `768px`, every feature grid child retains `min-width: 0`, and the new fixed-size diary tiles and three-column stadium statistics fit inside the existing 375px content width.
- Confirmed all nine stadium chips are `<span>` elements, the mate progression is an informational ordered list, and the diary results are a semantic ordered list; none introduces a button, link, or false tab stop.
- Confirmed the stadium image reuses `STADIUM_ASSET`, declares dimensions and meaningful alt text, and consumes the existing `data-parallax="0.05"` motion lifecycle. Fresh reduced-motion visits bypass parallax and continue to expose all reveal content in its final state.
- Confirmed the mate LG mark is decorative because adjacent visible text already names LG, and the diary result remains readable as text without relying on color.
- Confirmed all requested handoff values and their order are present once in `landingShowcaseData.ts`, including the exact quote and stadium chip order.
- Confirmed source scanning found no new button, link, inline SVG, screenshot asset reference, HTTP URL, fetch, or Axios usage in the Task 4 components and route additions.
- Confirmed the existing anonymous no-auth-request assertion, CTA/header/footer absence, fixed-light phone contrast, screenshot absence, ticker behavior, and reduced-motion coverage remain green.
- Confirmed no auth route, root redirect, phone preview, Tasks 1–3 component, or external baseball-data path was changed.

## Review

The initial frontend audit-only child did not return within the final verification window and was interrupted after the fresh completion gate. The independent root review then identified two scoped improvements: exact content/order coverage for the new handoff examples and invalid `span > h3` nesting in the mate card. Both are addressed in the review-fix section below.

## Commit

Planned message:

```text
feat: complete landing feature stories
```

## Concerns

No Task 4 blocker or failing verification remains. Full landing dark-theme completion, final closing sections, scripted multi-viewport QA, and final screenshot inspection remain intentionally reserved for Tasks 5–6.

---

## Review Fix: Exact Handoff Contract and Valid Mate Heading Structure

### What Changed

- Strengthened the existing Task 4 Cypress case to assert the exact mate matchup, date, party size, seat, progression order, and deposit copy.
- Added exact handoff-order assertions for all nine stadium chip labels, the full venue label, and `25,000 / 32 / 2호선` statistic values.
- Added an exact DOM-order assertion for the ten diary results and an exact full-text assertion for the approved diary quote.
- Replaced the invalid inline `<span>` wrapper around the mate-card `<h3>` with a visually equivalent block `<div>` while retaining the same class, flex styling, text, and layout.

### TDD Rationale and Pre-Refactor Evidence

No new product RED was possible for these review fixes. The review explicitly identified missing assertion precision around already-correct rendered content, and the semantic wrapper change does not alter visible behavior. Manufacturing a failure would require corrupting an approved static value or the correct result order solely for the test.

The exact assertions were therefore added before the semantic production refactor and run against commit `ce39ef43`'s unchanged production output. They passed, demonstrating that this is test strengthening over the already-correct product contract. The original valid Task 4 missing-section RED above remains the behavior RED record.

Pre-refactor focused result:

```text
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
9 passing (7s)
All specs passed!
```

### Post-Refactor GREEN

Fresh focused result after the `span > h3` correction:

```text
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
9 passing (6s)
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

### Review-Fix Self-Check

- Confirmed each new array assertion fails for missing, extra, or reordered values rather than checking only element counts or substring presence.
- Confirmed exact string assertions cover every Task 4 static handoff value named by the independent review.
- Confirmed the mate-card heading remains an `<h3>` under its feature `<h2>` and now has valid block-level ancestry.
- Confirmed the semantic refactor changed no class name, CSS rule, baseball value, DOM text, interactive behavior, or visual placement.
- Confirmed no external source, request, crawler, scraper, web search, repair fallback, screenshot, inline SVG, CTA, link, or button was added.

### Review-Fix Commit

Planned message:

```text
fix: strengthen landing feature story contract
```

### Review-Fix Concerns

No review-fix blocker or failing verification remains.

---

# Mate Task 4 Report: Required Search Callbacks and Mobile Dialog Accessibility/Parity

## Status

DONE

## RED

Appended the focused dialog accessibility and mobile parity cases before production edits, then ran:

```bash
CYPRESS_ALLOW_GLOBAL_FALLBACK=1 CYPRESS_DISABLE_AUTO_DOCKER_FALLBACK=1 node scripts/test-e2e.mjs --host 127.0.0.1 --browser electron --spec cypress/e2e/mate-list-url-state.cy.ts
```

The sandboxed launch could not bind the local Vite port; the approved local-browser rerun reached the product test. It produced the expected close-control failure: the initially focused `PlainDialog` close button had no `aria-label`. The parity case also revealed an intermediate request from the old immediate mobile controls, with `searchQuery` absent on the first request after selection.

## GREEN

- Made `onTermClick` required in both search panels and removed `useMateStore` fallbacks.
- Made `onSearchTermSelect` required in the bottom sheet.
- Deleted only `src/store/mateStore.ts`; `mateRecentSearchStore.ts` remains.
- Named the shared `PlainDialog` close button exactly `닫기`.
- Kept mobile team/seat choices as bottom-sheet drafts and atomically applied both to canonical URL/API state with the `적용` action, avoiding an intermediate request.
- Added the two focused Cypress cases for close-control focus restoration and mobile URL/API parity.

Fresh focused result:

```text
mate-list-url-state.cy.ts: 9 passing, 0 failing
```

## Verification

```text
CYPRESS_ALLOW_GLOBAL_FALLBACK=1 CYPRESS_DISABLE_AUTO_DOCKER_FALLBACK=1 node scripts/test-e2e.mjs --host 127.0.0.1 --browser electron --spec cypress/e2e/mate-list-url-state.cy.ts
9 passing, 0 failing

npm run build
exit 0

rg -n "useMateStore|mateStore" src
no output (exit 1 expected for no matches)

git diff --check
no output
```

## Files

- `cypress/e2e/mate-list-url-state.cy.ts`
- `src/components/MateRecentSearchesPanel.tsx`
- `src/components/MatePopularSearchesPanel.tsx`
- `src/components/MateFilterBottomSheet.tsx`
- `src/components/MateListControlsRuntime.tsx`
- `src/components/ui/plain-dialog.tsx`
- `src/hooks/useMateListController.ts`
- deleted `src/store/mateStore.ts`

`MateListControlsRuntime` and `useMateListController` are the minimal integration additions needed to make the new parity test's Apply action perform a single canonical URL/API update.

## Self-Review

- Confirmed all existing desktop and mobile search-panel call sites provide `onTermClick`.
- Confirmed Escape closes the dialog and focus returns to the original filter trigger.
- Confirmed the mobile apply request includes `teamId=HH`, `searchQuery=응원석`, and `page=0`, while the URL retains `team=mine`, encodes the query, and clears page state.
- Confirmed no baseball-data, backend, or auth contract changed.
- Preserved concurrent task reports and generated build reports; none are staged for this checkpoint.

## Commit

```text
7ec9ff37 fix(mate): enforce accessible URL filter controls
```

## Concerns

The report file also contains pre-existing concurrent landing-task content. This Mate section was appended without overwriting it. The build regenerated already-dirty report artifacts; they are intentionally excluded from staging.
