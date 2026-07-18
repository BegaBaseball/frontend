# Task 5 Report: Final Landing Flow, Theme, and Accessibility

## Status

DONE

Task 5 adds the approved offseason teaser, three-step start guide, mascot closing, complete landing dark mappings, mobile overflow protections, Press Start font ownership lifecycle, and final accessibility contracts without changing root auth routing or Tasks 1–4 behavior.

## What Changed

- Added the centered offseason introduction, fixed deep-mint insight card, two informational insight chips, fixed-black retro card, and semantic three-row pixel leaderboard.
- Added `HOW TO START`, the approved heading, and three semantic numbered `<article>` elements using operator-provided static copy.
- Added the fixed deep-mint closing with the repository mascot, approved copy, and a non-interactive BEGA logo `<div>` chip.
- Appended the three final sections after numbered feature `06` while retaining `Landing.tsx` as the route orchestrator.
- Centralized the final typed copy, guide steps, and retro leaderboard values in `landingShowcaseData.ts`.
- Reused the exact `RetroTheme.tsx` Press Start 2P link ID and URL. The landing deduplicates by ID and removes only the concrete link node that its own effect created; a pre-existing link is left untouched on unmount.
- Completed dark mappings for alternating landing sections, cards, borders, text, primary treatments, progress surfaces, chips, and diary result states. The app preview, fixed-light phone, deep-mint insight, retro card, and closing keep their fixed palettes.
- Added mobile single-column grids, `min-width: 0`, safe wrapping, reduced paddings, and a 375x812 no-overflow/phone-width contract.
- Added explicit reduced-motion checks for the closing mascot and final reveal state, plus visible/focusable ticker-control checks at desktop and 375px.
- Added no CTA, anchor, page navigation/header/footer, screenshot, inline SVG, external baseball request, crawler, scraper, web search, API client, or repair fallback.

## Files

- `.superpowers/sdd/task-5-report.md`
- `cypress/e2e/landing-visual.cy.ts`
- `src/components/Landing.tsx`
- `src/components/Landing.css`
- `src/components/landing/landingShowcaseData.ts`
- `src/components/landing/LandingOffseason.tsx`
- `src/components/landing/LandingStartGuide.tsx`
- `src/components/landing/LandingClosing.tsx`

`landingShowcaseData.ts` is the authorized scoped addition used to keep the operator-provided final copy and leaderboard values typed and centralized.

## RED

All Task 5 Cypress cases were added before the production edits.

The exact unqualified Cypress command first reported that the worktree-local cache did not contain Cypress 15.18.0. The valid RED was then run with the repository's documented existing global-cache fallback:

```bash
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
```

Valid RED result:

```text
13 tests
9 passing
4 failing

1. Expected [data-testid=landing-offseason], but it did not exist.
2. The dark-theme case expected [data-testid=landing-offseason], but it did not exist.
3. The 375x812 case expected [data-testid=landing-closing], but it did not exist.
4. Expected head link#retro-font-press-start, but it did not exist.
```

The existing Tasks 1–4 baseline remained 9/9 passing during RED.

## GREEN

Fresh focused command after the final test and implementation changes:

```bash
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
```

Output:

```text
13 passing (9s)
0 failing
All specs passed!
```

The first implementation run reached 12/13 with a Cypress Chai subject-chain error in the new non-interactive chip assertion. No production behavior failed. The assertion was changed to a callback that retains the DOM subject, then the full focused spec passed.

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

The first design-slop run correctly rejected the generic CSS term `eyebrow`. The section-label name was changed to the neutral `landing-final-label` contract, and the fresh final run passed 15/15.

## Self-Review

- Confirmed the final route order is offseason, start guide, and closing immediately after feature `06`; Tasks 1–4 components and their order are unchanged.
- Confirmed all three start steps are semantic `<article>` elements with the exact approved headings and copy.
- Confirmed the closing chip is a non-interactive `<div>` with no role, tab index, button, or anchor descendant.
- Confirmed the entire landing contains no anchor or CTA test ID, while the text-labelled ticker utility remains visible and focusable at desktop and 375px.
- Confirmed dark mode maps the muted offseason surface to `rgb(16, 18, 21)` while app preview remains `rgb(23, 59, 52)`, the phone remains fixed light, and the retro card remains `rgb(10, 10, 10)`.
- Confirmed all grid children have shrinkable tracks, final grids stack below 768px, long retro names can wrap, and the complete 375x812 document has no horizontal overflow. The phone width is at most 347px.
- Confirmed reduced motion removes mascot and other loop animations, removes reveal delay/offset, and exposes the final section content at opacity 1.
- Confirmed the font loader uses the existing `retro-font-press-start` ID and exact Google Fonts URL, creates no duplicate, removes its created node after SPA unmount, and preserves a pre-seeded link after unmount.
- Confirmed the repository logo and mascot assets are reused with declared dimensions and no new binary asset.
- Confirmed all scores, rates, records, team/venue references, and final copy remain static operator-provided examples with no runtime request or repair path.
- Confirmed source scanning found no screenshot reference, inline SVG, CTA, anchor, button, fetch, Axios use, baseball crawler, scraper, search call, or external baseball API in the Task 5 additions.
- Confirmed no auth route, anonymous bootstrap behavior, authenticated root redirect, bundle guard, or Task 6 QA script was modified.

## Commit

Planned message:

```text
feat: finish landing introduction flow
```

## Concerns

No Task 5 blocker or failing verification remains. Scripted multi-viewport landing QA, bundle-guard work, final screenshots, and release review remain intentionally reserved for Task 6.

---

## Review Fix: Dark Result Contrast, Image Hints, and Final Contract Precision

### What Changed

- Added Cypress color parsing, alpha compositing, effective ancestor-background resolution, relative-luminance, and contrast helpers so dark result contrast is calculated from live computed styles rather than hard-coded ratios.
- Added a focused WCAG AA contract for representative win, draw, and loss diary tiles after their translucent dark backgrounds are composited over the dark card.
- Changed only the dark win and loss foregrounds to lighter status colors; the already-compliant draw color remains unchanged.
- Added `loading="lazy"` and `decoding="async"` to the below-the-fold closing mascot.
- Replaced the generically labelled offseason insight-chip `<div>` with a labelled semantic `<ul>` containing `<li>` items, retaining the same visual chip spans.
- Added an accessible label to the existing semantic retro `<ol>` and retained its three `<li>` leaderboard rows.
- Strengthened the final Cypress contract for exact DOM order after feature `06`, exact approved section descriptions, three guide descriptions, leaderboard row values, closing copy, semantic leaderboard elements, representative dark text/card/border mappings, and fixed-theme markers.

### Review RED

The contrast and image-loading assertions were added before the production fixes.

Command:

```bash
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- --spec cypress/e2e/landing-visual.cy.ts
```

Aggregated valid RED:

```text
15 tests
13 passing
2 failing

closing mascot: expected loading="lazy", attribute was absent
composited contrast: win 4.27:1, draw 4.63:1, loss 3.20:1
failing tones: win, loss
```

The exact final order, approved copy, semantic retro `ol > li` rows, representative dark text/card/border mappings, fixed-theme attributes, and pre-existing Task 1–5 contracts all passed during RED. Those additions document already-correct output and therefore have no separate manufactured product RED.

### Review GREEN

Fresh focused result after the minimal production changes:

```text
15 passing (9s)
0 failing
All specs passed!
```

The passing contrast assertion continues to calculate all three ratios from computed foregrounds and recursively composited computed backgrounds, and fails with the tone names and measured ratios if any drops below `4.5:1`.

### Review Verification

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

- Confirmed only Task 5 Cypress, CSS, final-section components, and this Task 5 report changed.
- Confirmed light-mode result colors and the dark draw color are unchanged; only failing dark win/loss foregrounds were lightened.
- Confirmed the contrast helper includes translucent result backgrounds and their nearest opaque ancestor instead of comparing text against a detached constant.
- Confirmed the mascot retains its approved asset, dimensions, alt text, reduced-motion behavior, and visual placement while gaining browser loading/decoding hints.
- Confirmed the insight-chip list and retro leaderboard now expose named semantic list structures without adding interaction or changing displayed copy/order.
- Confirmed no CTA, anchor, page navigation/header/footer, screenshot, inline SVG, auth contract, external baseball access, Task 6 script, or bundle-guard file was added or changed.

### Review-Fix Commit

Planned message:

```text
fix: address landing final accessibility review
```

### Review-Fix Concerns

No review-fix blocker remains. Task 6 work remains untouched.
