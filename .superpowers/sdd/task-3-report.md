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
