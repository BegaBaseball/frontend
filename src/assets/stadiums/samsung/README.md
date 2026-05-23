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

## Uploaded operator reference tracing

The uploaded reference image is stored as:

`daegu-operator-reference-rapak-2025-enhanced-transparent.png`

Image contract:

- source id: `OPERATOR_REFERENCE_RAPAK_2025`
- dimensions: `4096x4096`
- viewBox: `0 0 4096 4096`
- SHA-256: `a5d2f812cddf8c2481e5ab07f6138500537e8ee56a74092b1237cd99a43c879e`
- status: `OPERATOR_REFERENCE`
- polygon status: `REFERENCE_TRACE_DRAFT_READY`

Generate draft polygons from this image with:

```bash
npm run stadium:daegu:operator-reference-trace
```

The script writes `reports/stadium/daegu-operator-reference-trace/daegu-operator-reference-trace.{json,csv,md,svg}`. These polygons are 4096x4096 reference-image drafts. They are not written into `DAEGU_BLOCKS` and do not replace the official PNG release lock.

Generate the operator mapping review packet with:

```bash
npm run stadium:daegu:operator-reference-review-packet
```

The review packet writes contact sheets plus `daegu-operator-reference-mapping-template.{csv,json}` under `reports/stadium/daegu-operator-reference-review/`. Operators must fill block mapping and approval fields before any draft polygon can be promoted.

Generate automatic mapping candidates with:

```bash
npm run stadium:daegu:operator-reference-auto-map
```

The auto-map step writes `reports/stadium/daegu-operator-reference-auto-map/daegu-operator-reference-auto-map.{csv,json}` and an existing block alias index. These rows are suggestions only; even exact matches require operator approval before production use.

## MySeatCheck reference intake

`src/data/daeguSeatData.ts` also registers `MYSEATCHECK_REFERENCE_2026` as a pending external reference source for the user-provided page:

`https://myseatcheck.com/%EB%8C%80%EA%B5%AC-%EC%82%BC%EC%84%B1-%EB%9D%BC%EC%9D%B4%EC%98%A8%EC%A6%88%ED%8C%8C%ED%81%AC/`

This source is intentionally not the production canonical source. The page image could not be imported automatically because the site returns an image-save prevention/Cloudflare challenge response to direct fetches, and the page asks for source attribution when its photos are used.

Expected operator-provided asset path, if permission is confirmed:

`daegu-myseatcheck-reference-2026.webp`

Keep the reference source in `EXTERNAL_REFERENCE_PENDING_ASSET` and `REFERENCE_ONLY_PENDING_ASSET` until an authorized local file is supplied, its natural dimensions and SHA-256 are recorded, and operator-approved polygon rows are provided. Do not copy coordinates from this external reference into `DAEGU_BLOCKS`; the existing official PNG remains the source of truth for selectable production polygons.
