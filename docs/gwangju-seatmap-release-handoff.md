# 광주 KIA 챔피언스필드 좌석도 release handoff

Handoff date: 2026-05-16 KST

## Release State

- release mode: `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`
- release verification: `npm run qa:stadium:gwangju:release-verify`
- pre-operator release verification: `node scripts/stadium-seatmap-ops.mjs gwangju release-verify:preoperator`
- post-operator release verification skeleton: `node scripts/stadium-seatmap-ops.mjs gwangju release-verify:postoperator`
- operator input/write subtasks are dispatcher-internal for future non-overlap polygon work.
- release gate: `npm run qa:stadium:gwangju:release-gate`
- runtime layer audit: `node scripts/stadium-seatmap-ops.mjs gwangju runtime-layer`
- release scope guard: `node scripts/stadium-seatmap-ops.mjs gwangju release-scope-guard`
- PR staging plan: `node scripts/stadium-seatmap-ops.mjs gwangju pr-staging-plan`
- targeted staging report: `node scripts/stadium-seatmap-ops.mjs gwangju targeted-staging`
- staged scope audit: `node scripts/stadium-seatmap-ops.mjs gwangju staged-scope-audit`
- pre-PR final gate: `node scripts/stadium-seatmap-ops.mjs gwangju pre-pr-final-gate`
- commit readiness gate: `node scripts/stadium-seatmap-ops.mjs gwangju commit-readiness`
- official image: `gwangju-kia-seatmap-official-2026.webp`
- coordinate system: `2200x1159`
- trace version: `gwangju-precision-v1`
- previous trace version: `manual-polygon-v113`
- trace generation: `GWANGJU_PRECISION_V1`
- active block count: `113`
- expected trace block count: `113`
- full retraced blocks: `113`
- blocks changed from previous trace: `113`
- total retrace point delta: `7222`
- precision editor: `/internal/gwangju-seatmap-editor`
- precision editor dataset: `node scripts/stadium-seatmap-ops.mjs gwangju precision-editor-dataset`
- precision editor patch validate: `node scripts/stadium-seatmap-ops.mjs gwangju precision-editor-patch:validate`
- precision editor patch apply-plan: `node scripts/stadium-seatmap-ops.mjs gwangju precision-editor-patch:apply-plan`
- O/P component coverage warnings: `0`
- minimum O/P official component recall: `1.0000`
- minimum O/P component IoU: `0.9255`
- 3루 H special boundary: `third-family-seats` official row-envelope bbox `569,158,692,307`.
- 3루 121~127/I/J restored trace: `gwangju-seatmap-official-third-infield-trace`; active production data, selected-sweep QA, trace manifest, and runtime layer all include the restored blocks.
- 과거 third-base retrace candidate/proposed 산출물은 release evidence로 유지하지 않는다.
- `gwangju artifact-scope-audit` keeps legacy/candidate/proposed Gwangju artifacts out of active release evidence. Archived files are tracked only under `reports/stadium/_archive/gwangju-legacy-candidates/archive-manifest.json`.
- `node scripts/stadium-seatmap-ops.mjs gwangju block-source-duplication-audit` uses core image-alignment as the canonical release QA owner; lower-infield independent audit is retired to Git history and no longer counts as active release evidence.
- Retired lower-infield/third-base independent audit script files are not release payload members; active release blocking is owned by the dispatcher-internal artifact-scope and block-source duplication audits.
- zone precision worksets: `5`
- zone precision status: `passed`
- zone precision warnings: `0`
- operator release state: `OFFICIAL_DERIVED_READY`
- aggregate hit-area mode: `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY`
- K7/AWAY aggregate hit-areas are enabled within the current `113` active block release through official numbered-block aggregate geometry.

## Current Acceptance

- release gate status: `passed`
- release gate blockers: `0`
- release gate steps: `5/5`
- release package status: `ready`
- release scope guard status: `passed`
- release scope guard included release files: `26`
- release scope guard dirty files: runtime classified count
- release scope guard dirty included release files: runtime classified count
- release scope guard separate dirty work files: runtime classified count
- release scope guard separate dirty work baseline files: `74`
- classified separate dirty work expansion allowed: `true`
- release scope guard unexpected files: `0`
- release scope guard blockers: `0`
- release scope guard inventory drift: `0`
- patch separation readiness: `ready` or `review-required`
- patch separation mixed status: `none` unless release payload files have unreviewed mixed or untracked diffs
- PR staging plan status: `ready` or `review-required`
- PR staging plan does not run git add: `true`
- PR staging plan bulk git add allowed: `false`
- PR staging review status: `ready`
- PR staging review blockers: `0`
- PR staging review class counts: `ready-to-stage=<runtime>`, `untracked-review-required=0`
- PR staging review reviewed expected untracked file set: `scripts/gwangju-seatmap-artifact-scope-audit.mjs`, `scripts/gwangju-seatmap-block-source-duplication-audit.mjs`, `src/components/gwangju/GwangjuSeatMapEditor.test.tsx`, `src/components/gwangju/GwangjuSeatMapEditor.tsx`, `src/data/gwangjuSeatMapEditorDataset.ts`
- targeted staging status: `ready`
- targeted staging target files: `26`
- targeted staging reviewed untracked satisfied files: `5`
- targeted staging runs git add: `false`
- staged scope audit status: `ready`
- staged scope audit require complete: `false`
- staged scope audit expected target files: `26`
- staged scope audit missing staged target files: `<dirty-target-count>` before explicit staging
- staged scope audit outside target files: `0`
- staged scope audit separate dirty work files: `0`
- staged scope audit runs git add: `false`
- commit readiness before explicit staging: `blocked expected`
- commit readiness after explicit 26-file staging: must pass with `stagedScopeAudit.requireComplete=true` and `stagedScopeAudit.missingStagedTargetFileCount=0`
- operator status: `ready`
- browser QA status: `passed`
- runtime layer audit status: `passed`
- active trace blocks: `113`
- trace version: `gwangju-precision-v1`
- trace generation: `GWANGJU_PRECISION_V1`
- full retraced blocks: `113`
- blocks changed from previous trace: `113`
- release audit status: `passed`
- release audit stale checks: `0`
- pre-operator release verification status: `passed`
- post-operator independent polygon verification: only for future non-overlap operator targets
- missing baseball data contract: `MANUAL_BASEBALL_DATA_REQUIRED`

Acceptance shorthand:

- `status=passed`
- `blockers=0`
- `steps=5/5`
- `releasePackageStatus=ready`
- `releaseScopeGuardStatus=passed`
- `releaseScopeGuardIncludedFiles=26`
- `releaseScopeGuardDirtyFiles=runtime`
- `releaseScopeGuardDirtyIncludedFiles=runtime`
- `releaseScopeGuardSeparateDirtyWorkFiles=runtime`
- `releaseScopeGuardSeparateDirtyWorkBaselineFiles=74`
- `classifiedSeparateDirtyWorkExpansionAllowed=true`
- `releaseScopeGuardUnexpectedFiles=0`
- `releaseScopeGuardBlockers=0`
- `releaseScopeGuardInventoryDrift=0`
- `patchSeparationReadiness=ready-or-review-required`
- `patchSeparationPackageStatus=none-or-mixed`
- `stagingPlanStatus=ready-or-review-required`
- `stagingPlanDoesNotRunGitAdd=true`
- `stagingPlanSafeToRunBulkGitAdd=false`
- `stagingReviewStatus=ready`
- `stagingReviewBlockers=0`
- `stagingReviewReadyToStage=<runtime>`
- `stagingReviewUntrackedReviewRequired=0`
- `targetedStagingStatus=ready`
- `targetedStagingTargetFiles=26`
- `targetedStagingDoesNotRunGitAdd=true`
- `stagedScopeAuditStatus=ready`
- `stagedScopeAuditRequireComplete=false`
- `stagedScopeAuditMissingTargetFiles=<dirty-target-count>-before-staging`
- `stagedScopeAuditOutsideTargets=0`
- `stagedScopeAuditSeparateDirtyWork=0`
- `operatorStatus=ready`
- `browserQaStatus=passed`
- `runtimeLayerAuditStatus=passed`
- `activeTraceBlocks=113`
- `fullRetracedBlocks=113`
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

Runtime layer audit writes:

- `reports/stadium/gwangju-seatmap-runtime-layer-audit.json`
- `reports/stadium/gwangju-seatmap-runtime-layer-audit.csv`
- `reports/stadium/gwangju-seatmap-runtime-layer-audit.md`

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

Targeted staging report writes:

- `reports/stadium/gwangju-seatmap-targeted-staging.json`
- `reports/stadium/gwangju-seatmap-targeted-staging.csv`
- `reports/stadium/gwangju-seatmap-targeted-staging.md`

Staged scope audit writes:

- `reports/stadium/gwangju-seatmap-staged-scope-audit.json`
- `reports/stadium/gwangju-seatmap-staged-scope-audit.csv`
- `reports/stadium/gwangju-seatmap-staged-scope-audit.md`

Operator input aid writes:

- `reports/stadium/gwangju-seatmap-operator-input-aid.json`
- `reports/stadium/gwangju-seatmap-operator-input-aid.md`

Operator input packet writes:

- `reports/stadium/gwangju-seatmap-operator-input-packet.json`
- `reports/stadium/gwangju-seatmap-operator-input-packet.md`

The current audit expects active block count `113`, operator status `ready`, aggregate hit-area mode `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY`, and K7/AWAY filter-only aggregate hit-areas built only from official numbered-block subpaths.

## Change Scope

Included in this handoff:

- Gwangju release package: `gwangju-precision-v1`, `GWANGJU_PRECISION_V1`, active block count `113`, official image alignment gates, runtime layer audit, K7/AWAY official derived aggregate filter hit-areas, release gate/audit scripts, PR staging plan, targeted staging report, staged scope audit, and dispatcher-internal operator input aid/packet artifacts.
- Shared static contract: `src/components/StadiumGuideRuntimeSeatMaps.test.ts` locks the Gwangju official derived aggregate release state.
- Build-budget support: `src/components/MateResultsRuntime.tsx`, `src/components/ChatBotRuntime.tsx`, and `src/components/ChatBotFloatingButton.tsx` keep the release build reproducible under the bundle guard while leaving Gwangju runtime geometry unchanged.
- Generated verification reports: `reports/stadium/gwangju-seatmap-runtime-layer-audit.*`, `reports/stadium/gwangju-seatmap-release-gate.*`, `reports/stadium/gwangju-seatmap-release-audit.*`, `reports/stadium/gwangju-seatmap-release-scope-guard.*`, `reports/stadium/gwangju-seatmap-pr-staging-plan.*`, `reports/stadium/gwangju-seatmap-targeted-staging.*`, `reports/stadium/gwangju-seatmap-staged-scope-audit.*`, dispatcher-internal `reports/stadium/gwangju-seatmap-postoperator-audit.*`, plus build reports when regenerated by `npm run build`.

Separate dirty work that must not be judged by this handoff:

- The isolated Gwangju release worktree must not carry Sajik, Daegu, Mate, or other stadium dirty files. If they appear, the scope guard classifies them outside the 26-file Gwangju targeted staging list.
- Sajik files such as `docs/sajik-seatmap-release-lock.md`, `docs/sajik-seatmap-editor-v17-operator-guide.md`, `docs/sajik-seatmap-hitpath-candidate-review.md`, `docs/sajik-seatmap-marker-only-transition.md`, `scripts/sajik-seatmap-core-qa.mjs`, `scripts/sajik-seatmap-editor-scope.mjs`, `scripts/sajik-seatmap-editor-scope.mjs`, `scripts/sajik-seatmap-core-qa.mjs`, `src/components/sajik/*`, and `src/data/sajikSeatData*`.
- Suwon files such as `src/data/suwonSeatData.ts` and `src/data/suwonSeatData.test.ts`.
- Daegu files such as `docs/daegu-seatmap-operator-corrections-runbook.md`, `scripts/daegu-seatmap-p1-next-action-packet.mjs`, `scripts/daegu-seatmap-p1-operator-boundary.mjs`, `scripts/daegu-seatmap-p1-paired-boundary-review.mjs`, `scripts/daegu-seatmap-p1-precision-workset.mjs`, `scripts/daegu-seatmap-p2-operators.mjs`, `scripts/daegu-seatmap-precision-audit.mjs`, `src/components/daegu/DaeguSeatMapSvg.tsx`, `src/data/daeguSeatData.ts`, and `src/data/daeguSeatData.test.ts`.
- Daejeon files such as `docs/daejeon-seatmap-release-lock.md`, `scripts/daejeon-seatmap-ops.mjs`, `scripts/daejeon-seatmap-ops.mjs`, `src/data/daejeonSeatData.ts`, and `src/data/daejeonAnchorVisualBaseline.json`.
- Cross-stadium/app shell utilities/tests such as `src/components/AppRoutes.tsx`, `src/components/AuthenticatedStadiumFavoriteToggle.tsx`, `src/hooks/useStadiumGuide.ts`, `src/utils/kakaoMap.ts`, `src/components/DaejeonStadiumUxAuditContract.test.ts`, and `src/utils/seatMapPolygonValidator.ts`.
- Non-stadium frontend runtime work such as ranking, navbar, home, chatbot, prediction, mypage, and mate card files remains outside this handoff unless explicitly listed as build-budget support.

## PR Packaging Manifest

- PR packaging manifest source of truth: `reports/stadium/gwangju-seatmap-release-scope-guard.md`
- PR packaging manifest JSON: `reports/stadium/gwangju-seatmap-release-scope-guard.json`
- Release PR scope: Gwangju official derived aggregate release package and build verification reports.
- Excluded PR scope: Daegu work, Daejeon work, Sajik work, Suwon work, and cross-stadium utilities.
- Included release candidate files: `26`
- Separate dirty work files: runtime classified count
- Separate dirty work baseline files: `74`
- Classified separate dirty work expansion allowed: `true`
- Unexpected dirty files: `0`
- Inventory drift: `0`
- Release Candidate Inventory: `expectedIncludedFileCount=26`, `actualIncludedFileCount=26`, `missingExpectedIncludedFiles=[]`, `extraIncludedFiles=[]`
- The authoritative inventory is regenerated by `node scripts/stadium-seatmap-ops.mjs gwangju release-scope-guard`.
- The manifest keeps the full 26-file included list, the 74-file excluded baseline, and the current runtime classified separate dirty work count in one reviewer-facing document.
- `gwangju-seatmap-release-scope-guard.json` records `releaseCandidateInventory.expectedIncludedFileCount=26`, `actualIncludedFileCount=26`, `missingExpectedIncludedFiles=[]`, and `extraIncludedFiles=[]`.
- `gwangju-seatmap-release-scope-guard.json` records `separateWorkInventory.expectedSeparateDirtyWorkCount baseline=74`, `actualSeparateDirtyWorkCount=<runtime>`, `classifiedSeparateDirtyWorkExpansionAllowed=true`, and `separateWorkInventory.classifiedSeparateDirtyWorkExpansionAllowed=true`.
- `gwangju-seatmap-release-scope-guard.json` records `prPackagingManifest.releasePayloadFileCount=26`, `prPackagingManifest.separateDirtyWorkFileCount=<runtime>`, `prPackagingManifest.unexpectedDirtyFileCount=0`, and `prPackagingManifest.inventoryDriftCount=0`.
- Reviewers should treat any `RELEASE_CANDIDATE_FILE_MISSING`, `RELEASE_CANDIDATE_FILE_UNEXPECTED`, or `UNCLASSIFIED_DIRTY_FILE` blocker as a release packaging failure. `CLASSIFIED_SEPARATE_DIRTY_WORK_ADDED` is warning-only because the file is already covered by a separate workstream rule.

## Patch Separation Readiness

- patch separation readiness: `ready` or `review-required`
- `patchSeparationReadiness.status=ready-or-review-required`
- patchSeparationReadiness only becomes `review-required` when release payload files have unreviewed mixed or untracked diffs.
- reviewed expected untracked release files are ready for targeted staging.
- clean release payload files are not packaging blockers.
- Review focus files: `package.json`, `src/components/StadiumGuideRuntimeSeatMaps.test.ts`, `src/components/ChatBotFloatingButton.tsx`, `src/components/ChatBotRuntime.tsx`, `src/components/MateResultsRuntime.tsx`, `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`.

## PR Staging Plan

- PR staging plan: `node scripts/stadium-seatmap-ops.mjs gwangju pr-staging-plan`
- PR staging review: `node scripts/stadium-seatmap-ops.mjs gwangju pr-staging-review`
- PR staging plan JSON: `reports/stadium/gwangju-seatmap-pr-staging-plan.json`
- PR staging plan markdown: `reports/stadium/gwangju-seatmap-pr-staging-plan.md`
- PR staging review JSON: `reports/stadium/gwangju-seatmap-pr-staging-review.json`
- PR staging review markdown: `reports/stadium/gwangju-seatmap-pr-staging-review.md`
- stagingPlan.status=ready-or-review-required
- stagingPlan.doesNotRunGitAdd=true
- stagingPlan.safeToRunBulkGitAdd=false
- stagingPlan.releasePayloadFileCount=26
- stagingPlan.separateDirtyWorkFileCount=<runtime>
- stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true
- stagingReview.status=ready-or-review-required
- stagingReview.doesNotRunGitAdd=true
- stagingReview.safeToRunBulkGitAdd=false
- stagingReview.releasePayloadFileCount=26
- stagingReview.recommendsOnlyIncludedFiles=true
- stagingReview.doesNotRecommendSeparateDirtyWork=true
- Current review class counts: `ready-to-stage=<runtime>`, `untracked-review-required=0`.
- The reviewed expected untracked release files are `scripts/gwangju-seatmap-artifact-scope-audit.mjs`, `scripts/gwangju-seatmap-block-source-duplication-audit.mjs`, `src/components/gwangju/GwangjuSeatMapEditor.test.tsx`, `src/components/gwangju/GwangjuSeatMapEditor.tsx`, and `src/data/gwangjuSeatMapEditorDataset.ts`.
- The staging plan is report-only and must not run `git add`.
- Review unreviewed mixed/untracked included files before staging the release PR when present.

## Targeted Staging Report

- targeted staging report: `node scripts/stadium-seatmap-ops.mjs gwangju targeted-staging`
- targeted staging JSON: `reports/stadium/gwangju-seatmap-targeted-staging.json`
- targeted staging CSV: `reports/stadium/gwangju-seatmap-targeted-staging.csv`
- targeted staging markdown: `reports/stadium/gwangju-seatmap-targeted-staging.md`
- targetedStaging.status=ready
- targetedStaging.doesNotRunGitAdd=true
- targetedStaging.safeToRunBulkGitAdd=false
- targetedStaging.recommendsOnlyIncludedFiles=true
- targetedStaging.doesNotRecommendSeparateDirtyWork=true
- targetedStaging.releasePayloadFileCount=26
- targetedStaging.targetFileCount=26
- targetedStaging.reviewedUntrackedSatisfiedFileCount=5
- targetedStaging command kind is `explicit-file-list-only`.
- targeted staging report only recommends the included release payload files and excludes separate dirty work.
- The report must not run `git add`; manual staging must use only the explicit target file list.
- Do not use `git add .`, `git add -A`, or `git commit -am`.

## Staged Scope Audit

- staged scope audit: `node scripts/stadium-seatmap-ops.mjs gwangju staged-scope-audit`
- staged scope audit JSON: `reports/stadium/gwangju-seatmap-staged-scope-audit.json`
- staged scope audit CSV: `reports/stadium/gwangju-seatmap-staged-scope-audit.csv`
- staged scope audit markdown: `reports/stadium/gwangju-seatmap-staged-scope-audit.md`
- stagedScopeAudit.status=ready
- stagedScopeAudit.requireComplete=false
- stagedScopeAudit.doesNotRunGitAdd=true
- stagedScopeAudit.safeToRunBulkGitAdd=false
- stagedScopeAudit.acceptsOnlyTargetedStagingFiles=true
- stagedScopeAudit.blocksSeparateDirtyWork=true
- stagedScopeAudit.expectedTargetFileCount=26
- stagedScopeAudit.missingStagedTargetFileCount=<dirty-target-count> before explicit staging
- stagedScopeAudit.stagedOutsideTargetFileCount=0
- stagedScopeAudit.stagedSeparateDirtyWorkFileCount=0
- staged scope audit only inspects `git diff --cached`; it does not run `git add`.
- staged files outside targeted staging or separate dirty work are blocking failures.
- strict commit-readiness mode: `node scripts/stadium-seatmap-ops.mjs gwangju commit-readiness`
- strict commit-readiness adds `--require-complete` and blocks with `STAGED_TARGET_FILE_MISSING` until all dirty targeted release files are staged.
- Run `node scripts/stadium-seatmap-ops.mjs gwangju pre-pr-final-gate` before staging. Run `node scripts/stadium-seatmap-ops.mjs gwangju commit-readiness` only after explicit `git add -- <26 target files>`.

## K7/AWAY Contract

The current release creates filter-only aggregate hit-areas for `K7석` and `원정응원석` by combining already traced official numbered-block subpaths. It does not estimate new coordinates from CSS pixels or screenshots.

- `K7석`: `107~111`, `118~122`
- `원정응원석`: `107~110`
- `홈 응원석`: `118~122`
- `111`: `K7` category, `fanRole: NEUTRAL`

Filter behavior:

- `K7석` shows `home-k7-seats` and hides the source K7 numbered hit-areas in that filter.
- `응원석` shows only K7 blocks with `fanRole: HOME` or `fanRole: AWAY`.
- `홈 응원석` shows `118~122`.
- `원정응원석` shows `away-cheering-seats` and hides the source `107~110` hit-areas in that filter.
- `111` remains selectable in `내야석`; in `K7석` it is represented by the aggregate hit-area and remains hidden from cheering filters.

## Operator Polygon Status

- `home-k7-seats`: `READY`, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`
- `away-cheering-seats`: `READY`, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`
- `K7석`, `원정응원석` aggregate hit-areas use `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`.
- `SPECIAL_BLOCKS` includes K7/AWAY aggregate block definitions.
- `GWANGJU_IMAGE_GEOMETRY_DRAFTS` includes `home-k7-seats` and `away-cheering-seats` geometry generated from official traced source blocks.
- input-aid reference bbox/anchor/crop evidence remains supporting evidence and must not be copied as unrelated new polygon coordinates.
- input-packet reference bbox/anchor/crop evidence remains supporting evidence and must not be copied as unrelated new polygon coordinates.

## Future Post-Operator Acceptance

This section is a planning contract only for future non-overlap operator targets outside the current official derived aggregate release.

- post-operator release mode: `OPERATOR_POLYGON_APPLIED`
- post-operator audit mode: `POST_OPERATOR_POLYGON_APPLIED_RELEASE`
- post-operator verification command: `node scripts/stadium-seatmap-ops.mjs gwangju release-verify:postoperator`
- active block count: `113`
- operator status: `ready` before write and `applied` after guarded write
- `home-k7-seats`: `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`
- `away-cheering-seats`: `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`
- the existing 113 active traced blocks must not be modified during K7/AWAY promotion
- post-operator acceptance must run only after `operator-apply:write` and `operator-postwrite-gate` pass
- future guarded writes must not modify the existing 113 source blocks unless a separate official image retrace task explicitly requires it

## Source Policy

- Allowed coordinate source: operator-provided official image coordinates only.
- Allowed coordinate system: original official image `2200x1159`.
- Disallowed: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images.
- If baseball operating data is missing or unclear, keep `MANUAL_BASEBALL_DATA_REQUIRED` and request operator-provided data.

## Handoff Commands

Final release verification:

```bash
npm run qa:stadium:gwangju:release-verify
```

`release-verify` runs `release-gate -> targeted-staging -> staged-scope-audit -> release-audit`.

Explicit pre-operator verification:

```bash
node scripts/stadium-seatmap-ops.mjs gwangju release-verify:preoperator
```

Post-operator verification skeleton:

```bash
node scripts/stadium-seatmap-ops.mjs gwangju release-verify:postoperator
```

Current production data should return `status=blocked` for this command until K7/AWAY operator polygons are written through the guarded path.

Operator input aid:

```bash
node scripts/stadium-seatmap-ops.mjs gwangju operator-input-aid
```

Current production data should return `status=ready_for_operator_input` for this command and keep `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON`.

Operator input packet:

```bash
node scripts/stadium-seatmap-ops.mjs gwangju operator-input-packet
```

Current production data should return `status=ready` for the official derived aggregate path. Future independent operator input packets remain separate planning artifacts.

Operator intake bundle:

```bash
node scripts/stadium-seatmap-ops.mjs gwangju operator-intake
```

This runs `operator-handoff -> operator-input-aid -> operator-input-packet`.

## Remaining Work

- `home-k7-seats` and `away-cheering-seats` are READY through official numbered-block aggregate geometry.
- Current production data remains `activeBlocks=113`, `operatorStatus=ready`, and `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`.
- Do not replace K7/AWAY aggregate geometry with screenshot/CSS-derived coordinates.
- The current K7 and away cheering ranges are nested filter ranges sharing `107~110`. That overlap is valid in the official derived aggregate filter model; future independent operator polygon inputs that share `officialBlocks` must be split into non-overlapping targets first.

Equivalent final order:

```bash
npm run qa:stadium:gwangju:release-gate
node scripts/stadium-seatmap-ops.mjs gwangju release-scope-guard
node scripts/stadium-seatmap-ops.mjs gwangju pr-staging-plan
node scripts/stadium-seatmap-ops.mjs gwangju release-audit
```

Release gate expanded order:

```bash
npm run stadium:gwangju:operator-status
npm run test:stadium:seatmaps
node scripts/stadium-seatmap-ops.mjs gwangju trace-review
node scripts/stadium-seatmap-ops.mjs gwangju release-package
npm run build
```

Future independent polygon write path:

```bash
node scripts/stadium-seatmap-ops.mjs gwangju operator-template:validate:strict
node scripts/stadium-seatmap-ops.mjs gwangju operator-input-aid
node scripts/stadium-seatmap-ops.mjs gwangju operator-input-packet
node scripts/stadium-seatmap-ops.mjs gwangju operator-template:apply-plan:require-ready
node scripts/stadium-seatmap-ops.mjs gwangju operator-prewrite-gate
node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write
node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate
node scripts/stadium-seatmap-ops.mjs gwangju release-verify:postoperator
```

Do not replace the current `113` active block aggregate release with new operator geometry unless dispatcher-internal `operator-apply:write` has completed from valid official image operator coordinates and `operator-postwrite-gate` has passed.
