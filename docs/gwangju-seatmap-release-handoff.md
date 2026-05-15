# 광주 KIA 챔피언스필드 좌석도 release handoff

Handoff date: 2026-05-14 KST

## Release State

- release mode: `DERIVED_RANGE_FILTER_AND_BADGE_ONLY`
- release verification: `npm run qa:stadium:gwangju:release-verify`
- pre-operator release verification: `npm run qa:stadium:gwangju:release-verify:preoperator`
- post-operator release verification: `npm run qa:stadium:gwangju:release-verify:postoperator`
- operator input aid: `npm run stadium:gwangju:operator-input-aid`
- operator input packet: `npm run stadium:gwangju:operator-input-packet`
- operator intake: `npm run stadium:gwangju:operator-intake`
- release gate: `npm run qa:stadium:gwangju:release-gate`
- release scope guard: `npm run stadium:gwangju:release-scope-guard`
- PR staging plan: `npm run stadium:gwangju:pr-staging-plan`
- official PNG: `gwangju-kia-seatmap-official-2026.png`
- coordinate system: `2200x1159`
- trace version: `manual-polygon-v5`
- previous trace version: `manual-polygon-v4`
- trace generation: `FULL_ACTIVE_111_RETRACE`
- active block count: `111`
- expected trace block count: `111`
- full retraced blocks: `111`
- blocks changed from previous trace: `111`
- total retrace point delta: `1182`
- O/P component coverage warnings: `0`
- minimum O/P official component recall: `0.9263`
- minimum O/P component IoU: `0.7692`
- zone precision worksets: `5`
- zone precision status: `passed`
- zone precision warnings: `0`
- operator release state: `PRE_OPERATOR_PENDING`
- aggregate hit-area mode: `REUSES_EXISTING_TRACE_ONLY`
- independent K7/AWAY active block target `113` is not enabled before operator polygon write.

## Current Acceptance

- release gate status: `passed`
- release gate blockers: `0`
- release gate steps: `5/5`
- release package status: `ready`
- release scope guard status: `passed`
- release scope guard included release files: `23`
- release scope guard separate dirty work files: runtime classified count
- release scope guard separate dirty work baseline files: `95`
- classified separate dirty work expansion allowed: `true`
- release scope guard unexpected files: `0`
- release scope guard blockers: `0`
- release scope guard inventory drift: `0`
- patch separation readiness: `ready` or `review-required`
- patch separation mixed status: `none` unless release payload files have mixed or untracked diffs
- PR staging plan status: `ready` or `review-required`
- PR staging plan does not run git add: `true`
- PR staging plan bulk git add allowed: `false`
- operator status: `pending`
- browser QA status: `passed`
- active trace blocks: `111`
- trace version: `manual-polygon-v5`
- trace generation: `FULL_ACTIVE_111_RETRACE`
- full retraced blocks: `111`
- blocks changed from previous trace: `111`
- release audit status: `passed`
- release audit stale checks: `0`
- pre-operator release verification status: `passed`
- post-operator release verification before guarded write: `blocked expected`
- post-operator blocked reason: `POST_OPERATOR_POLYGON_NOT_APPLIED`
- post-operator active blocks: `actualActiveBlocks=111`, `expectedActiveBlocks=113`
- missing baseball data contract: `MANUAL_BASEBALL_DATA_REQUIRED`

Acceptance shorthand:

- `status=passed`
- `blockers=0`
- `steps=5/5`
- `releasePackageStatus=ready`
- `releaseScopeGuardStatus=passed`
- `releaseScopeGuardIncludedFiles=23`
- `releaseScopeGuardSeparateDirtyWorkFiles=runtime`
- `releaseScopeGuardSeparateDirtyWorkBaselineFiles=95`
- `classifiedSeparateDirtyWorkExpansionAllowed=true`
- `releaseScopeGuardUnexpectedFiles=0`
- `releaseScopeGuardBlockers=0`
- `releaseScopeGuardInventoryDrift=0`
- `patchSeparationReadiness=ready-or-review-required`
- `patchSeparationPackageStatus=none-or-mixed`
- `stagingPlanStatus=ready-or-review-required`
- `stagingPlanDoesNotRunGitAdd=true`
- `stagingPlanSafeToRunBulkGitAdd=false`
- `operatorStatus=pending`
- `browserQaStatus=passed`
- `activeTraceBlocks=111`
- `fullRetracedBlocks=111`
- `stale=0`

The release gate writes:

- `reports/stadium/gwangju-seatmap-release-gate.json`
- `reports/stadium/gwangju-seatmap-release-gate.md`

The release package writes:

- `reports/stadium/gwangju-seatmap-release-package.json`
- `reports/stadium/gwangju-seatmap-release-package.md`

Fast report/document audit writes:

- `reports/stadium/gwangju-seatmap-release-audit.json`
- `reports/stadium/gwangju-seatmap-release-audit.md`

Post-operator audit writes:

- `reports/stadium/gwangju-seatmap-postoperator-audit.json`
- `reports/stadium/gwangju-seatmap-postoperator-audit.md`

Release scope guard writes:

- `reports/stadium/gwangju-seatmap-release-scope-guard.json`
- `reports/stadium/gwangju-seatmap-release-scope-guard.md`

PR staging plan writes:

- `reports/stadium/gwangju-seatmap-pr-staging-plan.json`
- `reports/stadium/gwangju-seatmap-pr-staging-plan.md`

PR staging review writes:

- `reports/stadium/gwangju-seatmap-pr-staging-review.json`
- `reports/stadium/gwangju-seatmap-pr-staging-review.md`

Operator input aid writes:

- `reports/stadium/gwangju-seatmap-operator-input-aid.json`
- `reports/stadium/gwangju-seatmap-operator-input-aid.md`

Operator input packet writes:

- `reports/stadium/gwangju-seatmap-operator-input-packet.json`
- `reports/stadium/gwangju-seatmap-operator-input-packet.md`

The current audit is a pre-operator audit. It expects active block count `111`, operator status `pending`, aggregate hit-area mode `REUSES_EXISTING_TRACE_ONLY`, and no independent K7/AWAY aggregate hit-area.

## Change Scope

Included in this handoff:

- Gwangju pre-operator release package: `manual-polygon-v5`, `FULL_ACTIVE_111_RETRACE`, active block count `111`, zone precision worksets, official PNG image-trace candidate report, low-margin candidate report, O/P component coverage gate, K7/AWAY derived-only filter badges, release gate/audit scripts, PR staging plan, operator input aid/packet, post-operator blocked audit.
- Shared static contract: `src/components/StadiumGuideRuntimeSeatMaps.test.ts` locks the Gwangju pre-operator release state.
- Generated verification reports: `output/playwright/gwangju-seatmap-image-trace-candidates.*`, `reports/stadium/gwangju-seatmap-low-margin-candidates.*`, `reports/stadium/gwangju-seatmap-release-gate.*`, `reports/stadium/gwangju-seatmap-release-audit.*`, `reports/stadium/gwangju-seatmap-release-scope-guard.*`, `reports/stadium/gwangju-seatmap-pr-staging-plan.*`, `reports/stadium/gwangju-seatmap-postoperator-audit.*`, plus build reports when regenerated by `npm run build`.

Separate dirty work that must not be judged by this handoff:

- Sajik files such as `docs/sajik-seatmap-release-lock.md`, `docs/sajik-seatmap-editor-v17-operator-guide.md`, `docs/sajik-seatmap-hitpath-candidate-review.md`, `docs/sajik-seatmap-marker-only-transition.md`, `scripts/sajik-seatmap-alignment-audit.mjs`, `scripts/sajik-seatmap-editor-regression.mjs`, `scripts/sajik-seatmap-pr-scope-guard.mjs`, `scripts/sajik-seatmap-review-manifest.mjs`, `src/components/sajik/*`, and `src/data/sajikSeatData*`.
- Suwon files such as `src/data/suwonSeatData.ts` and `src/data/suwonSeatData.test.ts`.
- Daegu files such as `docs/daegu-seatmap-operator-corrections-runbook.md`, `scripts/daegu-seatmap-p1-next-action-packet.mjs`, `scripts/daegu-seatmap-p1-operator-readiness.mjs`, `scripts/daegu-seatmap-p1-paired-boundary-review.mjs`, `scripts/daegu-seatmap-p1-precision-workset.mjs`, `scripts/daegu-seatmap-p2-next-action-packet.mjs`, `scripts/daegu-seatmap-precision-audit.mjs`, `src/components/daegu/DaeguSeatMapSvg.tsx`, `src/data/daeguSeatData.ts`, and `src/data/daeguSeatData.test.ts`.
- Daejeon files such as `docs/daejeon-seatmap-release-lock.md`, `scripts/daejeon-anchor-review-crops.mjs`, `scripts/daejeon-seatmap-release-gate.mjs`, `src/data/daejeonSeatData.ts`, and `src/data/daejeonAnchorVisualBaseline.json`.
- Cross-stadium/app shell utilities/tests such as `src/components/AppRoutes.tsx`, `src/components/DaejeonStadiumUxAuditContract.test.ts`, and `src/utils/seatMapPolygonValidator.ts`.

## PR Packaging Manifest

- PR packaging manifest source of truth: `reports/stadium/gwangju-seatmap-release-scope-guard.md`
- PR packaging manifest JSON: `reports/stadium/gwangju-seatmap-release-scope-guard.json`
- Release PR scope: Gwangju pre-operator release package and build verification reports.
- Excluded PR scope: Daegu work, Daejeon work, Sajik work, Suwon work, and cross-stadium utilities.
- Included release candidate files: `23`
- Separate dirty work files: runtime classified count
- Separate dirty work baseline files: `95`
- Classified separate dirty work expansion allowed: `true`
- Unexpected dirty files: `0`
- Inventory drift: `0`
- Release Candidate Inventory: `expectedIncludedFileCount=23`, `actualIncludedFileCount=23`, `missingExpectedIncludedFiles=[]`, `extraIncludedFiles=[]`
- The authoritative inventory is regenerated by `npm run stadium:gwangju:release-scope-guard`.
- The manifest keeps the full 23-file included list and the 95-file excluded baseline in one reviewer-facing document.
- `gwangju-seatmap-release-scope-guard.json` records `releaseCandidateInventory.expectedIncludedFileCount=23`, `actualIncludedFileCount=23`, `missingExpectedIncludedFiles=[]`, and `extraIncludedFiles=[]`.
- `gwangju-seatmap-release-scope-guard.json` records `separateWorkInventory.expectedSeparateDirtyWorkCount baseline=95`, `actualSeparateDirtyWorkCount=<runtime>`, `classifiedSeparateDirtyWorkExpansionAllowed=true`, and `separateWorkInventory.classifiedSeparateDirtyWorkExpansionAllowed=true`.
- `gwangju-seatmap-release-scope-guard.json` records `prPackagingManifest.releasePayloadFileCount=23`, `prPackagingManifest.separateDirtyWorkFileCount=<runtime>`, `prPackagingManifest.unexpectedDirtyFileCount=0`, and `prPackagingManifest.inventoryDriftCount=0`.
- Reviewers should treat any `RELEASE_CANDIDATE_FILE_MISSING`, `RELEASE_CANDIDATE_FILE_UNEXPECTED`, or `UNCLASSIFIED_DIRTY_FILE` blocker as a release packaging failure. `CLASSIFIED_SEPARATE_DIRTY_WORK_ADDED` is warning-only because the file is already covered by a separate workstream rule.

## Patch Separation Readiness

- patch separation readiness: `ready` or `review-required`
- `patchSeparationReadiness.status=ready-or-review-required`
- patchSeparationReadiness only becomes `review-required` when release payload files have mixed or untracked diffs.
- clean release payload files are not packaging blockers.
- Review focus files: `package.json`, `src/components/StadiumGuideRuntimeSeatMaps.test.ts`, `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`.

## PR Staging Plan

- PR staging plan: `npm run stadium:gwangju:pr-staging-plan`
- PR staging review: `npm run stadium:gwangju:pr-staging-review`
- PR staging plan JSON: `reports/stadium/gwangju-seatmap-pr-staging-plan.json`
- PR staging plan markdown: `reports/stadium/gwangju-seatmap-pr-staging-plan.md`
- PR staging review JSON: `reports/stadium/gwangju-seatmap-pr-staging-review.json`
- PR staging review markdown: `reports/stadium/gwangju-seatmap-pr-staging-review.md`
- stagingPlan.status=ready-or-review-required
- stagingPlan.doesNotRunGitAdd=true
- stagingPlan.safeToRunBulkGitAdd=false
- stagingPlan.releasePayloadFileCount=23
- stagingPlan.separateDirtyWorkFileCount=<runtime>
- stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true
- stagingReview.status=ready-or-review-required
- stagingReview.doesNotRunGitAdd=true
- stagingReview.safeToRunBulkGitAdd=false
- stagingReview.releasePayloadFileCount=23
- stagingReview.recommendsOnlyIncludedFiles=true
- stagingReview.doesNotRecommendSeparateDirtyWork=true
- The staging plan is report-only and must not run `git add`.
- Review mixed/untracked included files before staging the release PR when present.

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
- input-aid reference bbox/anchor/crop evidence is `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON` and must not be copied as aggregate polygon coordinates.
- input-packet reference bbox/anchor/crop evidence is also `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON` and must not be copied as aggregate polygon coordinates.

## Future Post-Operator Acceptance

This section is a planning contract only. It does not create K7/AWAY polygons and it must not change current production data.

- post-operator release mode: `OPERATOR_POLYGON_APPLIED`
- post-operator audit mode: `POST_OPERATOR_POLYGON_APPLIED_RELEASE`
- post-operator verification command: `npm run qa:stadium:gwangju:release-verify:postoperator`
- active block count: `113`
- operator status: `ready` before write and `applied` after guarded write
- `home-k7-seats`: `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`
- `away-cheering-seats`: `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`
- the existing 111 active traced blocks must not be modified during K7/AWAY promotion
- post-operator acceptance must run only after `operator-apply:write` and `operator-postwrite-gate` pass
- before guarded write, this command must remain blocked with `POST_OPERATOR_POLYGON_NOT_APPLIED`, `status=blocked`, and `actualActiveBlocks=111`

## Source Policy

- Allowed coordinate source: operator-provided official PNG coordinates only.
- Allowed coordinate system: original official PNG `2200x1159`.
- Disallowed: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images.
- If baseball operating data is missing or unclear, keep `MANUAL_BASEBALL_DATA_REQUIRED` and request operator-provided data.

## Handoff Commands

Final release verification:

```bash
npm run qa:stadium:gwangju:release-verify
```

`release-verify` runs `release-gate -> release-scope-guard -> pr-staging-plan -> release-audit`.

Explicit pre-operator verification:

```bash
npm run qa:stadium:gwangju:release-verify:preoperator
```

Post-operator verification skeleton:

```bash
npm run qa:stadium:gwangju:release-verify:postoperator
```

Current production data should return `status=blocked` for this command until K7/AWAY operator polygons are written through the guarded path.

Operator input aid:

```bash
npm run stadium:gwangju:operator-input-aid
```

Current production data should return `status=ready_for_operator_input` for this command and keep `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON`.

Operator input packet:

```bash
npm run stadium:gwangju:operator-input-packet
```

Current production data should return `status=ready_for_operator_input`, `inputPresentSections=0`, and `readyForPrewrite=false` for this command.

Operator intake bundle:

```bash
npm run stadium:gwangju:operator-intake
```

This runs `operator-handoff -> operator-input-aid -> operator-input-packet`.

## Remaining Work

- `home-k7-seats` and `away-cheering-seats` still need operator-provided official PNG `2200x1159` polygon coordinates.
- Current production data remains `operator-input-packet.status=ready_for_operator_input`, `inputPresentSections=0`, and `readyForPrewrite=false`.
- Current post-operator verification must remain `status=blocked`, `actualActiveBlocks=111`, `expectedActiveBlocks=113`, and `POST_OPERATOR_POLYGON_NOT_APPLIED`.
- Do not write K7/AWAY independent geometry into `gwangjuSeatData.ts` before valid operator input passes the strict guarded path.
- The current K7 and away cheering ranges are nested filter ranges sharing `107~110`. That overlap is valid only in the derived badge/filter model; independent operator polygon inputs that share `officialBlocks` are blocked by `OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP`.
- If independent hit-areas are needed later, split the operator model into non-overlapping click targets before running the 113-block promotion path.

Equivalent final order:

```bash
npm run qa:stadium:gwangju:release-gate
npm run stadium:gwangju:release-scope-guard
npm run stadium:gwangju:pr-staging-plan
npm run stadium:gwangju:release-audit
```

Release gate expanded order:

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
npm run stadium:gwangju:operator-input-aid
npm run stadium:gwangju:operator-input-packet
npm run stadium:gwangju:operator-template:apply-plan:require-ready
npm run stadium:gwangju:operator-prewrite-gate
npm run stadium:gwangju:operator-apply:write
npm run stadium:gwangju:operator-postwrite-gate
npm run qa:stadium:gwangju:release-verify:postoperator
```

Do not run the `113` active block acceptance path unless `operator-apply:write` has completed from valid official PNG operator coordinates and `operator-postwrite-gate` has passed.
