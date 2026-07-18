# Final Landing Review Fix Report

## Status

DONE

The final whole-branch review findings are closed in the isolated `codex/landing-redesign` worktree. The implementation preserves the approved CTA-free landing, routes/auth contracts, fixed light/dark palettes, repository-local assets, and every operator-provided static baseball example. No crawler, scraper, external baseball API, web-search repair, data synthesis, or fallback repair was added.

## Changes

- Extended live Cypress contrast measurement to the light prediction `36%` and `VS` foregrounds, all ten diary result foregrounds, and every diary quote foreground against its effective composited background.
- Darkened only the failing light-theme foregrounds and added explicit dark-theme preservation rules.
- Made every numbered feature render copy before visual in document order while retaining the existing desktop alternating grid areas and mobile copy-first layout.
- Partitioned unique successful lazy mascot requests by request start time (`at`), including the crossing case where a request starts before scroll and completes after it, while retaining the exact successful `0 -> 1` contract.
- Made the landing interactive audit enumerate anchors, buttons, form controls, contenteditable nodes, button/link roles, and nonnegative tabindex nodes. The only accepted element is the labelled `landing-ticker-toggle` button, and QA failures include descriptors for every unexpected element.
- Centralized all phone preview operator baseball examples in typed `LANDING_PHONE_PREVIEW` data and consumed it without copy or behavior changes.
- Subscribed `useLandingMotion` to runtime `prefers-reduced-motion` changes, finalized visible/count/bar content when reduction becomes active, stopped active observers/frames/parallax, and removed the media listener during cleanup.
- Narrowed SDD ignores to transient progress, generated briefs, and review diff packages. Task reports remain trackable and `final-fix-report.md` is allowed.

## TDD Evidence

### RED

The executable helper/source contracts were added before implementation:

```bash
node --import tsx --test \
  --test-name-pattern='phone preview|partitions successful mascot|landing interactive contract' \
  scripts/landing-audit-contracts.test.mjs scripts/vite-manual-chunks.test.ts
```

Result: 0 passing, 3 failing for the intended missing contracts:

- `partitionSuccessfulDeferredRequestsByStart` was undefined for a request starting at `90` and completing at `120` across a scroll boundary at `100`.
- `getLandingInteractiveSetFailures` was undefined for the exact ticker control plus rogue anchor/tabindex fixture.
- Typed `LANDING_PHONE_PREVIEW` was absent and phone baseball examples still lived in the component.

The production-facing Cypress tests were also added before implementation:

```bash
env CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run cy:run -- \
  --spec cypress/e2e/landing-visual.cy.ts
```

Result: 15 passing, 3 failing for the intended regressions:

- Feature `02` visual preceded copy in document order.
- A runtime CDP change to reduced motion left feature `02` unrevealed.
- Light contrast failures were measured live as:
  - prediction `36%`: `2.56:1`
  - prediction `VS`: `2.56:1`
  - diary win: `3.02:1`
  - diary draw: `2.74:1`
  - diary loss: `4.23:1`
  - diary quote result: `3.15:1`

### GREEN

```text
Focused helper/source contracts: 3/3 passing
All landing audit helper contracts: 7/7 passing
Focused landing/static contracts: 6/6 passing
Cypress landing visual/runtime spec: 18/18 passing
```

The live light contrast checks now measure approximately:

| Foreground | Ratio |
| --- | ---: |
| Prediction `36%` | `4.76:1` |
| Prediction `VS` | `4.76:1` |
| Diary win | `4.60:1` |
| Diary draw | `4.59:1` |
| Diary loss | `5.66:1` |
| Diary quote text | `5.86:1` |
| Diary quote result | `4.80:1` |

The existing composited dark diary regression also passes.

## Second Final Review Cycle: Red Status Contrast

The computed-contrast Cypress test was extended first to all four remaining visible light status foregrounds. The valid RED run produced 17 passing tests and one failing contrast test with four expected failures:

| Foreground | RED ratio |
| --- | ---: |
| Phone `LIVE` | `3.60:1` |
| Phone game status | `3.76:1` |
| Feature game status | `3.76:1` |
| Cheer `좋아요 128` | `3.76:1` |

Only those four fixed-light/light foreground declarations changed from `#ef4444` to `#b91c1c`. Red dot backgrounds and other red surfaces were preserved. An explicit dark-theme rule retains the previous `#ef4444` feature game status in dark mode; the existing cheer dark override remains unchanged.

The GREEN Cypress run passes 18/18 tests. The live computed foreground/background pairs now produce:

| Foreground | GREEN ratio |
| --- | ---: |
| Phone `LIVE` on `#f9fafb` | `6.19:1` |
| Phone game status on white | `6.47:1` |
| Feature game status on white | `6.47:1` |
| Cheer `좋아요 128` on white | `6.47:1` |

The refreshed responsive landing audit, production build, and post-build first-load audit also pass. Mobile and feature screenshots were opened after the foreground change and remain visually coherent.

## Verification

### Responsive QA and visual smoke

```bash
npm run qa:landing
```

Result: PASS, zero failures. The first sandbox run could not bind localhost (`EPERM`); the required out-of-sandbox retry passed.

| Viewport | Scroll width | Phone width | Features | CTA/links |
| --- | ---: | ---: | ---: | ---: |
| 375x812 | 375px | 347px | 6 | 0 |
| 768x1024 | 768px | 372px | 6 | 0 |
| 1280x900 | 1280px | 372px | 6 | 0 |

The structure audit reports exactly one interactive element:

```text
button[data-testid="landing-ticker-toggle"] "티커 일시정지"
```

Desktop, mobile, and focused feature screenshots were opened and inspected after the CSS changes. Copy/visual alternation, mobile copy-first stacking, phone layout, prediction/diary tones, and closing content remain coherent without horizontal overflow or CTA reintroduction.

### Production build

```bash
env VITE_SITE_URL=http://localhost:5176 \
  VITE_API_BASE_URL=http://localhost:8080 \
  npm run build
```

Result: PASS. Vite transformed 1171 client modules, the bundle guard checked 153 budgets, nine indexable and two performance routes were prerendered, and the sitemap was generated. Generated bundle/dist report changes were restored and excluded from the commit.

### Post-build first load

```bash
npm run qa:landing:first-load
```

Result: PASS, zero warnings and zero failures. The first sandbox run could not bind localhost (`EPERM`); the required out-of-sandbox retry passed.

| Viewport | FCP | LCP | CLS | Successful mascot requests before/after scroll |
| --- | ---: | ---: | ---: | ---: |
| Desktop 1440 | 124ms | 372ms | 0 | 0 / 1 |
| Mobile 390 | 124ms | 364ms | 0 | 0 / 1 |

Both viewport entries record the deferred mascot request `at` and `completedAt`, with the exact request-start partition and unique successful completion contract.

### Static, type, design, and policy gates

```text
node --import tsx --test scripts/landing-audit-contracts.test.mjs
7 passing, 0 failing

node --import tsx --test --test-name-pattern='landing|first-load|Landing|phone preview' scripts/vite-manual-chunks.test.ts
6 passing, 0 failing

npx tsc --noEmit --pretty false
exit 0, no diagnostics

node --import tsx --test src/components/design-slop-guard.test.ts
15 passing, 0 failing

python3 scripts/validate_baseball_data_policy.py  # monorepo root
External baseball data policy OK

git diff --check
exit 0, no output
```

The fresh full `scripts/vite-manual-chunks.test.ts` result is 50/51. Every landing contract passes. Its sole failure is the unchanged, pre-existing `/cheer` exact-class assertion for `CheerSidebarPanels.tsx`; the previous branch report recorded the same baseline as 49/50 before this change added one passing landing test.

## Self-review

- Confirmed every changed behavior/contract had valid RED evidence before implementation.
- Confirmed feature sections always render copy then visual; `data-visual-first` only controls CSS placement.
- Confirmed the request helper de-duplicates only successful `200`-`399` completed requests before partitioning by `at`.
- Confirmed the interactive selector covers the complete required set and explicitly lists unexpected descriptors.
- Confirmed runtime reduced motion finalizes bars/counts/reveals, cancels active motion work, and unregisters its listener on unmount.
- Confirmed phone examples are typed static operator data with unchanged rendered values.
- Confirmed no route, auth, CTA, asset-source, external-baseball-data, or fixed-theme contract changed.
- Confirmed generated reports and screenshots are not staged.

## Remaining concern

The only known failing gate is the unchanged out-of-scope `/cheer` static exact-class baseline described above. No landing-specific concern remains.
