# Samsung Lions Seat Map Assets

The Daegu seat map component uses the official Samsung Lions ticket guide image cropped to the `좌석안내도` section:

`daegu-samsung-seatmap-official-2026.png`

Official source page:

`https://www.samsunglions.com/score/score_4_2_1.asp`

Official image URL used for the crop:

`https://www.samsunglions.com/img/intro/2026ticket_v1.png?v=20260430`

Hit-area coordinates in `src/data/daeguSeatData.ts` are authored in the official seat-map coordinate space `1707 x 2048`. The React component renders this PNG inside the SVG with `<image width="1707" height="2048">`, then places transparent SVG hit-area paths in the same coordinate system.

During coordinate review, `DAEGU_SEATMAP_VIEWPORT` intentionally remains the full image bounds `{ x: 0, y: 0, width: 1707, height: 2048 }`. Apply a cropped viewport only after every block path has been directly measured from the official image and verified against the debug overlay.

Do not author hit-area coordinates from browser CSS pixels, screenshots, or resized display dimensions. If the precise official outline for a block has not been measured, leave it flagged for manual verification instead of inventing a temporary rectangle.

Trace review workflow:

1. Run `npm run stadium:daegu:evidence`.
2. Review `reports/stadium/daegu-seatmap-trace-review.csv`, `reports/stadium/daegu-seatmap-evidence-crops.md`, and the debug overlay screenshot.
3. Treat `candidateOuterBoundaryPath`, `candidateBoundaryPath`, and `candidateHullPath` as pixel-derived review candidates only; do not auto-promote them to `imageGeometry.d`.
4. Promote a block to official confidence only after its path has been manually checked against the official PNG in `?daeguDebug=1`.

If the official ticket guide changes, regenerate this crop from the official source image and update `src/data/daeguSeatData.ts` with the image dimensions, `assetStatus`, and verified block-level `DAEGU_BLOCKS` geometry.
