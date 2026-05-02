# Lotte Sajik Seat Map Assets

This directory contains the approved Lotte Giants official Sajik Baseball Stadium seat map asset used by the block overlay UI.

Runtime file:

- `sajik-lotte-seatmap-official-2026.png`

Source:

- Page: `https://www.giantsclub.com/html/?pcode=340`
- Original official image URL identified on 2026-05-01: `https://www.giantsclub.com/html/_Img/intro/sj_info_bg.jpg`
- Stored file: PNG conversion of the official 960 x 640 source image

Do not hotlink this asset from the runtime UI. The app bundles the local PNG and keeps Sajik seat map data static. Do not add runtime crawling, scraping, or web-search-based seat data collection.

## Maintenance Checklist

1. Keep `SAJIK_SEATMAP_IMAGE.assetStatus` in `src/data/sajikSeatData.ts` as `OFFICIAL` only while this file and verified hit-area coordinates are present.
2. Manually update `SAJIK_BLOCKS` if the official image changes.
3. Run `node --import tsx --test src/data/sajikSeatData.test.ts src/components/ui/stadiumSeatMapModel.test.ts`.
4. Run `npm run qa:stadium:sajik:mobile` and verify both mobile 390 and desktop 1440 pass.

If this official asset or the verified coordinates are removed, return the component to `MANUAL_BASEBALL_DATA_REQUIRED`.
