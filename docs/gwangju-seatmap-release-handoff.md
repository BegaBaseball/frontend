# 광주 KIA 챔피언스필드 좌석도 release handoff

Handoff date: 2026-05-12 KST

## Release State

- release mode: `DERIVED_RANGE_FILTER_AND_BADGE_ONLY`
- release gate: `npm run qa:stadium:gwangju:release-gate`
- official PNG: `gwangju-kia-seatmap-official-2026.png`
- coordinate system: `2200x1159`
- active block count: `111`
- expected trace block count: `111`
- aggregate hit-area mode: `REUSES_EXISTING_TRACE_ONLY`
- independent K7/AWAY active block target `113` is not enabled before operator polygon write.

## Current Acceptance

- release gate status: `passed`
- release gate blockers: `0`
- release gate steps: `5/5`
- release package status: `ready`
- operator status: `pending`
- browser QA status: `passed`
- active trace blocks: `111`
- missing baseball data contract: `MANUAL_BASEBALL_DATA_REQUIRED`

Acceptance shorthand:

- `status=passed`
- `blockers=0`
- `steps=5/5`
- `releasePackageStatus=ready`
- `operatorStatus=pending`
- `browserQaStatus=passed`
- `activeTraceBlocks=111`

The release gate writes:

- `reports/stadium/gwangju-seatmap-release-gate.json`
- `reports/stadium/gwangju-seatmap-release-gate.md`

The release package writes:

- `reports/stadium/gwangju-seatmap-release-package.json`
- `reports/stadium/gwangju-seatmap-release-package.md`

## K7/AWAY Contract

The current release does not create independent aggregate polygons for `K7석` or `원정응원석`. It connects operator-provided block ranges to the already traced official numbered blocks.

- `K7석`: `107~111`, `118~122`
- `원정응원석`: `107~110`
- `홈 응원석`: `118~122`
- `111`: `K7` category, `fanRole: NEUTRAL`

Filter behavior:

- `K7석` shows K7 numbered blocks `107~111`, `118~122`.
- `응원석` shows only K7 blocks with `fanRole: HOME` or `fanRole: AWAY`.
- `홈 응원석` shows `118~122`.
- `원정응원석` shows `107~110`.
- `111` remains selectable in `K7석` and `내야석`, but is hidden from cheering filters.

## Operator Polygon Status

- `home-k7-seats`: `PENDING_OPERATOR_INPUT`
- `away-cheering-seats`: `PENDING_OPERATOR_INPUT`
- `K7석`, `원정응원석` independent aggregate hit-areas remain `OPERATOR_REQUIRED` until official PNG operator coordinates are supplied.
- `SPECIAL_BLOCKS` must not receive K7/AWAY aggregate block definitions before guarded write.
- `GWANGJU_IMAGE_GEOMETRY_DRAFTS` must not receive `home-k7-seats` or `away-cheering-seats` geometry before guarded write.

## Source Policy

- Allowed coordinate source: operator-provided official PNG coordinates only.
- Allowed coordinate system: original official PNG `2200x1159`.
- Disallowed: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images.
- If baseball operating data is missing or unclear, keep `MANUAL_BASEBALL_DATA_REQUIRED` and request operator-provided data.

## Handoff Commands

Current release validation:

```bash
npm run qa:stadium:gwangju:release-gate
```

Equivalent expanded order:

```bash
npm run stadium:gwangju:operator-status
npm run test:stadium:seatmaps
npm run qa:stadium:gwangju:trace-review
npm run stadium:gwangju:release-package
npm run build
```

Future independent polygon write path:

```bash
npm run stadium:gwangju:operator-template:validate:strict
npm run stadium:gwangju:operator-template:apply-plan:require-ready
npm run stadium:gwangju:operator-prewrite-gate
npm run stadium:gwangju:operator-apply:write
npm run stadium:gwangju:operator-postwrite-gate
```

Do not run the `113` active block acceptance path unless `operator-apply:write` has completed from valid official PNG operator coordinates and `operator-postwrite-gate` has passed.
