# KIA Gwangju Seat Map Assets

This directory contains the operator-provided official Gwangju-KIA Champions Field seat map asset.

Expected file:

- `gwangju-kia-seatmap-official-2026.png`

The provided MySeatCheck Gwangju page is a manual reference for operator review only. Do not hotlink, crawl, or copy third-party images into this directory.

The 2026-05-11 operator block-range review maps K7 to numbered blocks `107~111` and `118~122`, and away cheering to `107~110`. These ranges reuse the existing official PNG numbered block polygons; do not add a duplicated aggregate K7 or away cheering hit area unless an operator later provides separate verified polygon coordinates in the official image coordinate system.

## Operator Intake Checklist

1. Confirm the K7 and away cheering blocks against an approved source.
2. Reuse existing numbered block polygons when the operator input is a block range.
3. Provide each separate aggregate polygon as points in the `2200x1159` official PNG coordinate system only when a new aggregate hit area is required.
4. Include `officialBlocks`, `side`, `fanRole`, `labelX`, `labelY`, and `shortLabel`.
4. Add the verified data to `src/data/gwangjuSeatData.ts`.
5. Run `node --import tsx --test src/data/gwangjuSeatData.test.ts src/components/StadiumGuideRuntimeSeatMaps.test.ts`.
6. Run `npm run qa:stadium:gwangju:mobile` and verify both mobile 390 and desktop 1440 pass.
