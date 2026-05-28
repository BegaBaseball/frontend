# 인천 SSG 랜더스필드 좌석도 release handoff

Handoff date: 2026-05-28 KST

## Release State

- release scope: frontend decision UX upgrade only
- official asset: `src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.webp`
- coordinate/data source: `INCHEON_BLOCKS`
- total blocks: `156`
- official blocks: `156`
- official asset SHA256: `e1b0a20680f6b9ce8832a4af92d19c09a5abec987f5b8378d619f6746487b8d5`
- release fixture fingerprint: `8e4d9f91d81b4f0dd6ae8c4940c70cba403ab196bae0aedcc66256f17fdfe19b`
- backend API, DB schema, food/place seed: unchanged

## Change Scope

Included in this handoff:

- `src/data/incheonSeatData.ts` adds the Incheon guide helper contract:
  `IncheonGuideIntent`, `IncheonGuideMatch`, `getIncheonGuideMatches`, and `getIncheonDecisionTags`.
- Guide intents are fixed to `전체`, `홈 응원`, `원정/3루`, `중앙/테이블`, `외야/가족`, and `접근성`.
- Search ranking prioritizes exact block names and official aliases, then category/location/fan-role matches.
- `src/components/incheon/IncheonSeatMap.tsx` exposes the first-visit guide and the common `SeatMapSectionFinder` in the `SeatMapTemplateShell` secondary panel on mobile and desktop.
- Guide result selection resets to all blocks, focuses the selected block, and keeps zoom at least `1.45`.
- Finder result selection focuses the selected block inside the current filter and keeps zoom at least `1.5`.
- The old Incheon upload demo flow is removed. Seat view sharing now hands off to diary draft storage with `stadium='INCHEON'`, `team='SSG'`, selected section/block, and the current date.
- The share CTA copy is unified as `다이어리에서 시야 사진 공유하기`.

Explicitly excluded:

- No coordinate or official asset retrace.
- No backend API, DB schema, food/place seed, crawling, web search, or third-party seatmap copy.
- No synthetic gate numbers, actual sightline quality, operating hours, or entry route claims. Missing operator data remains `MANUAL_BASEBALL_DATA_REQUIRED`.

## Verification

Latest targeted checks run during this handoff:

- `node --import tsx --test --test-name-pattern "인천|Incheon" src/components/StadiumGuideRuntimeSeatMaps.test.ts src/data/incheonSeatData.test.ts src/components/incheon/IncheonSeatMap.test.tsx`: PASS
- `npm run cy:run -- --spec "cypress/e2e/stadium-seatmap.cy.ts"`: Incheon suite PASS; full spec still has unrelated Jamsil section-finder, Daegu SVG label, and Sajik source-tab failures.
- `npm run test:stadium:seatmaps`: PASS
- `npm run qa:stadium:incheon:release-lock`: PASS
- `npm run qa:stadium:incheon:mobile`: PASS
- `npm run qa:stadium:incheon:full`: PASS
- `VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build`: PASS

Release rerun checklist:

```bash
npm run test:stadium:seatmaps
npm run qa:stadium:incheon:release-lock
npm run qa:stadium:incheon:mobile
npm run qa:stadium:incheon:full
VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build
```
