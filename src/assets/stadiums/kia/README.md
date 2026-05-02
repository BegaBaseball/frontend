# KIA Gwangju Seat Map Assets

This directory contains the operator-provided official Gwangju-KIA Champions Field seat map asset.

Expected file:

- `gwangju-kia-seatmap-official-2026.png`

The provided MySeatCheck Gwangju page is a manual reference for operator review only. Do not hotlink, crawl, or copy third-party images into this directory.

Keep K7 and away cheering hit areas out of the selectable overlay until the operator provides verified polygon coordinates in the official image coordinate system.

## Operator Intake Checklist

1. Confirm the K7 and away cheering blocks against an approved source.
2. Provide each polygon as points in the `2200x1159` official PNG coordinate system.
3. Include `officialBlocks`, `side`, `fanRole`, `labelX`, `labelY`, and `shortLabel`.
4. Add the verified data to `src/data/gwangjuSeatData.ts`.
5. Run `node --import tsx --test src/data/gwangjuSeatData.test.ts src/components/ui/stadiumSeatMapModel.test.ts`.
6. Run `npm run qa:stadium:gwangju:mobile` and verify both mobile 390 and desktop 1440 pass.
