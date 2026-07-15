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

The required frontend audit-only reviewer was invoked in review-only mode but did not return a result within the final verification window. It was interrupted after the fresh completion gate rather than delaying the task indefinitely. The root agent will run the independent Task 4 review.

## Commit

Planned message:

```text
feat: complete landing feature stories
```

## Concerns

No Task 4 blocker or failing verification remains. The independent root review is still pending. Full landing dark-theme completion, final closing sections, scripted multi-viewport QA, and final screenshot inspection remain intentionally reserved for Tasks 5–6.
