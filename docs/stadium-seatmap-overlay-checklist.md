# Stadium Seat Map Overlay Checklist

Use this checklist when adding or refining a stadium seat map with the official image + transparent SVG hit-area pattern.

## Scope

- Use an operator-provided official or licensed static image asset.
- Do not hotlink, crawl, or synthesize baseball seat map data at runtime.
- Preserve the original image file as the coordinate source of truth.
- If a smaller runtime image is needed, generate an optimized WebP beside the original and keep the same dimensions.

## Data

- Add a stadium-specific data file under `src/data`.
- Keep image metadata in a `*_SEATMAP_IMAGE` export with source label, URL, native width, native height, and asset status.
- Keep viewport crop values in a named export when the UI crops the native image.
- Keep every clickable block or special zone as a record with:
  - `officialBlocks`
  - `category`
  - `side`
  - `level`
  - `fanRole` when applicable
  - `sourceConfidence`
  - `seatViewSections`
  - `imageGeometry`
- Use static native image coordinates for `imageGeometry.d`. Do not generate official-image overlays from ellipse or arc helper formulas.

## Rendering

- Render the official image inside the same SVG as the hit-area layer:
  - `<svg viewBox="0 0 {nativeWidth} {nativeHeight}">`
  - `<image href={seatMapImageUrl} x={0} y={0} width={nativeWidth} height={nativeHeight} preserveAspectRatio="none" pointerEvents="none" />`
- Do not render the official image as a separate `<img>` layer when block hit-areas depend on native image coordinates.
- Keep default hit-area fill almost transparent.
- Show stroke/fill only on hover, focus, selected, or debug mode.
- Provide a debug query flag for grid, cursor coordinates, and labels.
- Do not show a fake baseball field fallback when an official image is missing; show `MANUAL_BASEBALL_DATA_REQUIRED`.

## QA

- Add data tests for duplicate ids, duplicate official blocks, required fields, bounds checks, and representative coordinate snapshots.
- Add representative browser click QA for high-risk areas:
  - first-base infield
  - third-base infield
  - cheering sections
  - outfield
  - special zones
  - wheelchair sections
- Add a full hit-area QA mode that verifies every SVG hit-area has a working selection handler.
- Keep mobile and desktop smoke screenshots separate from any full-click output when debugging.

## Incheon SSG Current Status

- Source image: `src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.png`
- Runtime image: `src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.webp`
- Source URL: `https://www.ssglanders.com/game/ticket`
- Native coordinate system: `3360x5328`
- Clickable coverage: 155 official blocks and special zones
- Visual review: no large overlay drift found in the debug overlay as of 2026-04-30.
- Representative QA: `npm run qa:stadium:incheon:mobile`
- Full hit-area QA: `npm run qa:stadium:incheon:full`

## Gocheok Kiwoom Current Status

- Source image: `src/assets/stadiums/kiwoom/gocheok-kiwoom-seatmap-official-2026.png`
- Source URL: `https://www.sisul.or.kr/open_content/skydome/introduce/seat.jsp`
- Native coordinate system: `653x960`
- SVG viewBox: `0 0 653 960`
- Official image hash: `c3e44086682b21f23179cf438fab4f6bd9bcc9b92152bb572f0887b5f122f528`
- Rendering pattern: official PNG is rendered with SVG `<image>` and all hit-area paths share the same 653x960 coordinate system.
- Reviewed trace group: `D01-D07`, `T01-T07`, `T11-T17`, `S01-S17`, `101-114`, `201-210`, `301-321`, `401-424`, `115-132`, `211-222`, `323-334`, `425-435`
- Manual anchor blocks: `101`, `114`, `401`, `424`, `430`, `412`
- Manual TODO blocks: `-`
- Omitted official/synthetic blocks: `335` (official PNG boundary/label not visible in the right-top outfield crop)
- Manual TODO source: `GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS` in `src/data/gocheokSeatData.ts`
- Pixel candidate report: `npm run stadium:gocheok:pixel-components`
- Evidence crops: `npm run stadium:gocheok:evidence`
- Trace manifest: `npm run stadium:gocheok:trace-manifest`
- Representative QA: `npm run qa:stadium:gocheok:mobile`
- Full hit-area QA: `npm run qa:stadium:gocheok:full`
- Trace review bundle: `npm run qa:stadium:gocheok:trace-review` (manifest + evidence crops + debug overlay capture)
- PNG replacement policy: if the source PNG hash changes, verify native dimensions, re-run `?gocheokDebug=1`, and update `imageGeometry.d`, `labelX`, `labelY`, and `imageSha256` together.
