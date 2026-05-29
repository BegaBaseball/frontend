# 인천 SSG 랜더스필드 좌석도 release handoff

Handoff date: 2026-05-29 KST

## Release State

- release scope: frontend decision UX upgrade only
- official asset: `src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.webp`
- coordinate/data source: `INCHEON_BLOCKS`
- total blocks: `156`
- official blocks: `156`
- official asset SHA256: `e1b0a20680f6b9ce8832a4af92d19c09a5abec987f5b8378d619f6746487b8d5`
- release fixture fingerprint: `ff1421f842dba83886df3a06eb800ed6b155391045705a3db29156d67e171852`
- backend API, DB schema, food/place seed: unchanged

## Change Scope

Included in this handoff:

- `src/data/incheonSeatData.ts` adds the Incheon guide helper contract:
  `IncheonGuideIntent`, `IncheonGuideMatch`, `getIncheonGuideMatches`, and `getIncheonDecisionTags`.
- Guide intents are fixed to `전체`, `홈 응원`, `원정/3루`, `중앙/테이블`, `외야/가족`, and `접근성`.
- Search ranking prioritizes exact block names and official aliases, then category/location/fan-role matches.
- `src/components/incheon/IncheonSeatMap.tsx` exposes the first-visit guide and the common `SeatMapSectionFinder` in the `SeatMapTemplateShell` secondary panel on mobile and desktop.
- Mobile now presents the guide and block finder as `가이드` / `블록 검색` tabs so the map, search tools, selected bottom sheet, and diary CTA do not compete for vertical space.
- Guide result selection resets to all blocks, focuses the selected block, and keeps zoom at least `1.45`.
- Finder result selection focuses the selected block inside the current filter and keeps zoom at least `1.5`.
- Mobile map gestures keep one-finger pan behind zoom `> 1`, preserve midpoint zoom behavior for pinch, toggle the viewport between `1` and `1.75` on double tap, and expose the internal `data-gesture-mode="idle|drag|pinch"` QA attribute.
- The isolated Incheon mobile QA gate now exercises the mobile guide tab, finder tab, `101B` guide/finder selection, selected bottom sheet CTA, removed demo copy guard, zoom thresholds, and gesture-mode idle checks.
- Keyboard QA now covers the Incheon finder result and SVG block path: focused finder result selection, SVG `role="button"`, active `aria-pressed`, focusable `tabIndex`, and `Enter` / space key activation.
- Block comparison now supports up to 3 session-only candidates, 5 recent selections, desktop/mobile compare trays, and selected block focus from comparison cards without persisting user data.
- Compared blocks are highlighted on the SVG with `data-compared="true"` while preserving the official hit-area geometry and keyboard selection behavior.
- The isolated Incheon mobile/full QA gates now include the comparison flow: add `101B` and `102B`, verify compare cards, focus `101B` from the tray at zoom `>= 1.5`, assert SVG `data-compared="true"`, clear the tray, and keep the removed demo upload copy absent.
- The old Incheon upload demo flow is removed. Seat view sharing now hands off to diary draft storage with `stadium='INCHEON'`, `team='SSG'`, selected section/block, and the current date.
- The share CTA copy is unified as `다이어리에서 시야 사진 공유하기`.
- Cypress now verifies both guest and logged-in Incheon CTA handoff: guests keep `/mypage` as the pending login redirect with an exact local-date draft, and logged-in users land on `/mypage` with the Incheon block prefilled in the diary form.

Explicitly excluded:

- No coordinate or official asset retrace.
- No backend API, DB schema, food/place seed, crawling, web search, or third-party seatmap copy.
- No synthetic gate numbers, actual sightline quality, operating hours, or entry route claims. Missing operator data remains `MANUAL_BASEBALL_DATA_REQUIRED`.

## Dirty Worktree Scope Note

- Incheon release scope files are the Incheon component/SVG/tests/docs/operator guide files plus shared stadium QA gates that explicitly assert Incheon behavior.
- Current non-Incheon dirty worktree entries include mate Cypress specs, non-Incheon stadium docs/scripts/components, Sajik script deletions, prediction UI changes, and generated `reports/*` files. They are intentionally out of this Incheon handoff and were not reverted.
- The shared `cypress/e2e/stadium-seatmap.cy.ts` and `src/components/StadiumGuideRuntimeSeatMaps.test.ts` files contain mixed-stadium changes in the worktree; this handoff only relies on their Incheon-specific assertions, the Incheon split Cypress spec, and the isolated Incheon QA commands below.

## Verification

Latest targeted checks run during this handoff:

- `node --check scripts/stadium-ux-audit.mjs`: PASS
- `node --import tsx --test --test-name-pattern "인천|Incheon|검수 중인 전용 좌석도" src/components/StadiumGuideRuntimeSeatMaps.test.ts src/data/incheonSeatData.test.ts src/components/incheon/IncheonSeatMap.test.tsx`: PASS (`20/20`)
- `npm run cy:run -- --spec cypress/e2e/stadium-seatmap-incheon.cy.ts --auto-docker`: PASS (`10/10`; dev server on `5176`)
- `npm run cy:run -- --spec "cypress/e2e/stadium-seatmap.cy.ts"`: PASS (`51/51`)
- `npm run test:stadium:seatmaps`: PASS (`323/323`)
- `npm run stadium:incheon:status`: PASS
- `npm run qa:stadium:incheon:release-lock`: PASS
- `npm run qa:stadium:incheon:mobile`: PASS (`39s`; summary: `output/playwright/stadium-ux-incheon-validate/stadium-mobile-smoke-summary.md`)
- `npm run qa:stadium:incheon:full`: PASS (`15s`; summary: `output/playwright/stadium-ux-incheon-full/stadium-mobile-smoke-summary.md`)
- `VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build`: PASS

Release rerun checklist:

```bash
npm run test:stadium:seatmaps
# with Vite dev server on 5176
npm run cy:run -- --spec cypress/e2e/stadium-seatmap-incheon.cy.ts --auto-docker
npm run stadium:incheon:status
npm run qa:stadium:incheon:release-lock
npm run qa:stadium:incheon:mobile
npm run qa:stadium:incheon:full
VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build
```
