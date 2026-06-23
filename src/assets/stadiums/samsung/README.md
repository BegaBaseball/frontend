# Samsung Lions Seat Map Assets

The Daegu seat map component uses the official Samsung Lions ticket guide image cropped to the `좌석안내도` section:

`daegu-samsung-seatmap-official-2026.webp`

Official source page:

`https://www.samsunglions.com/score/score_4_2_1.asp`

Official image URL used for the crop:

`https://www.samsunglions.com/img/intro/2026ticket_v1.png?v=20260430`

Hit-area coordinates in `src/data/daeguSeatData.ts` are authored in the official seat-map coordinate space `1707 x 2048`. The React component renders this WebP inside the SVG with `<image width="1707" height="2048">`, then places transparent SVG hit-area paths in the same coordinate system.

During coordinate review, `DAEGU_SEATMAP_VIEWPORT` intentionally remains the full image bounds `{ x: 0, y: 0, width: 1707, height: 2048 }`. Apply a cropped viewport only after every block path has been directly measured from the official image and verified against the debug overlay.

Do not author hit-area coordinates from browser CSS pixels, screenshots, or resized display dimensions. If the precise official outline for a block has not been measured, leave it flagged for manual verification instead of inventing a temporary rectangle.

Trace review workflow:

1. Run `npm run stadium:daegu:operator-handoff` and `npm run stadium:daegu:handoff-evidence`.
2. Review `reports/stadium/daegu-seatmap-operator-handoff.json`, `reports/stadium/daegu-seatmap-handoff-evidence.md`, and the canonical retrace batch reports.
3. Treat `candidateOuterBoundaryPath`, `candidateBoundaryPath`, and `candidateHullPath` as pixel-derived review candidates only; do not auto-promote them to `imageGeometry.d`.
4. Promote a block to official confidence only after its path has been manually checked against the official image in `?daeguDebug=1`.

If the official ticket guide changes, regenerate this crop from the official source image and update `src/data/daeguSeatData.ts` with the image dimensions, `assetStatus`, and verified block-level `DAEGU_BLOCKS` geometry.

## Uploaded operator reference tracing

The uploaded reference image is stored as:

`daegu-operator-reference-rapak-2025-enhanced-transparent.webp`

Image contract:

- source id: `OPERATOR_REFERENCE_RAPAK_2025`
- dimensions: `4096x4096`
- viewBox: `0 0 4096 4096`
- SHA-256: `98e9545d2c9b1c9e7058a7da4723eecc97e28cc315fcc20d279eef89037c4d56`
- status: `OPERATOR_REFERENCE`
- polygon status: `REFERENCE_TRACE_DRAFT_READY`

Generate draft polygons from this image with:

```bash
npm run stadium:daegu:canonical-retrace-batch -- SKY_UPPER_01_10
```

The script writes under `reports/stadium/daegu-seatmap-canonical-*-retrace-batch/`. These polygons are 4096x4096 reference-image drafts. They are not written into `DAEGU_BLOCKS` and do not replace the release lock.

Generate the operator mapping review packet with:

```bash
npm run stadium:daegu:canonical-retrace-gate -- SKY_UPPER_01_10
```

The gate validates the matching operator-input file under the batch report directory. Operators must fill decision, corrected path, reviewer, and timestamp fields before any draft polygon can be promoted.

Generate automatic mapping candidates with:

```bash
npm run stadium:daegu:canonical-official-only-retrace-workset
```

The workset step writes `reports/stadium/daegu-seatmap-canonical-official-only-retrace-workset/`. These rows are suggestions only; even exact matches require operator approval before production use.

## MySeatCheck reference intake

`src/data/daeguSeatData.ts` also registers `MYSEATCHECK_REFERENCE_2026` as a pending external reference source for the user-provided page:

`https://myseatcheck.com/%EB%8C%80%EA%B5%AC-%EC%82%BC%EC%84%B1-%EB%9D%BC%EC%9D%B4%EC%98%A8%EC%A6%88%ED%8C%8C%ED%81%AC/`

This source is intentionally not the production canonical source. The page image could not be imported automatically because the site returns an image-save prevention/Cloudflare challenge response to direct fetches, and the page asks for source attribution when its photos are used.

Expected operator-provided asset path, if permission is confirmed:

`daegu-myseatcheck-reference-2026.webp`

Keep the reference source in `EXTERNAL_REFERENCE_PENDING_ASSET` and `REFERENCE_ONLY_PENDING_ASSET` until an authorized local file is supplied, its natural dimensions and SHA-256 are recorded, and operator-approved polygon rows are provided. Do not copy coordinates from this external reference into `DAEGU_BLOCKS`; the existing official image remains the source of truth for selectable production polygons.
