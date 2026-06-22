# Sajik Seatmap Stage 01 Handoff

상태: historical operator workflow

Stage 01 npm aliases와 관련 스크립트는 canonical/runtime release 표면에서 제거되었다. 이 문서는 과거 operator 승인 입력 계약과 산출물 해석을 보존하는 archive이며, 재실행이 필요하면 Git history에서 해당 시점의 스크립트와 입력 파일을 복구한 별도 branch에서 검토한다.

## Scope

Stage 01은 사직 좌석도 `P0-A/P0-B/P0-C` 16개 구역의 operator-approved `hitPath` 후보를 production data에 반영하기 전 단계다. 이 문서는 승인 입력, operator input aid, next-action packet, target review packet, target entry preflight, target approval gate, all-target approval input guide, operator input intake gate, target apply precheck, `131` apply path status, completion gate, completion gate smoke, staged scope audit smoke, prewrite, apply-ready, post-apply audit, operator status board, manual patch plan, real approval readiness, 수동 patch 적용, Stage 02 진입 조건을 고정한다.

- mapVersion: `BUSAN_SAJIK_2026_MANUAL_POLYGON_V2`
- coordinate system: `SVG viewBox 0 0 960 640`
- target rows: `021/022/031/032/121/122/123/124/125/131/132/133/134/135/142/143`
- source input: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json`
- operator input aid: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-aid.md`
- review board: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.md`
- next-action packet: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-next-action-packet.md`
- target review packet: `reports/stadium/sajik-stage01-operator/targets/131-review-packet.md`
- target review overlay: `reports/stadium/sajik-stage01-operator/targets/131-review-packet.svg`
- target official PNG crop: `reports/stadium/sajik-stage01-operator/targets/131-official-crop.png`
- target official PNG overlay crop: `reports/stadium/sajik-stage01-operator/targets/131-official-overlay-crop.png`
- target official PNG edge crop: `reports/stadium/sajik-stage01-operator/targets/131-official-edge-crop.png`
- target entry template: `reports/stadium/sajik-stage01-operator/targets/131-entry-template.json`
- target entry preflight: `reports/stadium/sajik-stage01-operator/targets/131-entry-preflight.md`
- target entry preflight smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-entry-preflight-smoke.md`
- target approval gate: `reports/stadium/sajik-stage01-operator/targets/131-approval-gate.md`
- target approval gate smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-approval-gate-smoke.md`
- target apply precheck: `reports/stadium/sajik-stage01-operator/targets/131-apply-precheck.md`
- 131 apply path status: `reports/stadium/sajik-stage01-operator/targets/131-apply-path-status.md`
- all-target approval readiness: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-all-target-approval-readiness.md`
- all-target approval readiness smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-all-target-approval-readiness-smoke.md`
- all-target approval input guide: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-all-target-approval-input-guide.md`
- all-target approval input guide smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-all-target-approval-input-guide-smoke.md`
- operator input intake gate: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-intake-gate.md`
- operator input intake gate smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-intake-gate-smoke.md`
- official PNG pixel analysis: `reports/stadium/sajik-seatmap-pixel-components.json`
- entry sheet: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-entry-sheet.csv`
- review overlay: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.svg`
- patch preview: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite.patch-preview.ts`
- apply-ready report: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-apply-ready.md`
- post-apply audit: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-post-apply-audit.md`
- operator status board: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-status.md`
- manual patch plan: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-manual-patch-plan.md`
- real approval readiness: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-real-approval-readiness.md`
- approved dry-run: `reports/stadium/sajik-stage01-operator/dry-run/sajik-seatmap-stage01-approved-dry-run.md`
- applied dry-run: `reports/stadium/sajik-stage01-operator/applied-dry-run/sajik-seatmap-stage01-applied-dry-run.md`
- 131 lifecycle smoke: `reports/stadium/sajik-stage01-operator/target-lifecycle-smoke/sajik-seatmap-stage01-131-lifecycle-smoke.md`
- readiness summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-readiness-summary.md`
- readiness summary smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-readiness-summary-smoke.md`
- completion gate: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-completion-gate.md`
- completion gate smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-completion-gate-smoke.md`
- staged scope audit smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-staged-scope-audit-smoke.md`

## Current State

- current status: `waiting-for-operator`
- approved rows: `0`
- patch preview rows: `0`
- production data changed: `false`
- production write allowed: `false`
- source data write performed: `false`
- operator input aid: `waiting-for-operator`, `pending=16`
- review board: `waiting-for-operator`, `pending=16`, `ready=0`, `invalid=0`
- next-action packet: `waiting-for-operator`, `nextOperatorSectionId=131`, `pending=16`, `ready=0`, `invalid=0`
- target review packet: `waiting-for-operator`, `targetSectionId=131`, `matchesNextOperatorSection=true`, `sourceDataWritePerformed=false`
- target image-analysis smoke status: `passed`, `target=131`, `crop=615 433 140 110`, `pngSize=560x440`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- all-target official PNG review packets: `waiting-for-operator`, `targets=16/16`, `officialPngOnly=true`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- all-target image-analysis smoke status: `passed`, `mode=all-stage01-targets`, `targets=16/16`, `artifacts=48`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- target entry template readiness smoke status: `passed`, `target=131`, `decision=PENDING`, `editableFieldsBlank=true`, `approvedRequiredFields=7`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- target entry preflight status: `waiting-for-operator`, `target=131`, `source=none`, `decision=PENDING`, `readyForApprovalGate=false`, `blockers=0`, `sourceDataWritePerformed=false`
- target entry preflight smoke status: `passed`, `cases=12/12`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- target approval gate: `waiting-for-operator`, `targetSectionId=131`, `selectedSource=none`, `targetEntryPreflight=waiting-for-operator:PENDING`, `sourceDataWritePerformed=false`
- target approval gate smoke status: `passed`, `cases=20/20`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- all-target approval readiness status: `waiting-for-operator`, `targets=16/16`, `readyForApprovalGate=0`, `readyForPrewrite=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- all-target approval readiness smoke status: `passed`, `targets=16/16`, `readyForApprovalGate=0`, `readyForPrewrite=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- all-target approval input guide status: `waiting-for-operator`, `targets=16/16`, `pending=16`, `approved=0`, `readyForApprovalGate=0`, `readyForPrewrite=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- all-target approval input guide smoke status: `passed`, `targets=16/16`, `pending=16`, `approved=0`, `readyForApprovalGate=0`, `readyForPrewrite=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- operator input intake gate status: `waiting-for-operator`, `targets=16/16`, `approved=0`, `readyForPrewrite=0`, `waiting=16`, `blocked=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- operator input intake gate smoke status: `passed`, `targets=16/16`, `pending=16`, `approved=0`, `readyForPrewrite=0`, `blocked=0`, `fixtureValid=ready-for-prewrite`, placeholder fixtures blocked, `KEEP_CURRENT` fixture no-patch, `fixtureInvalid=blocked`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- target apply precheck status: `waiting-for-operator`, `target=131`, `decision=PENDING`, `readyForPrewrite=false`, `manualPatchRequired=false`, `targetApplied=false`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- 131 apply path status: `waiting-for-operator`, `target=131`, `decision=PENDING`, `editableFieldsBlank=true`, `readyForPrewrite=false`, `manualPatchRequired=false`, `lifecycleFixtureReady=true`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- official PNG image analysis priority: `131/032/133/143/135/134/122/123` high-risk rows first, then remaining Stage 01 rows by generated risk order
- operator package image priority order: `131/032/133/143/135/134/122/123/132/031/022/142/121/124/125/021`
- operator package image risk counts: `HIGH=8`, `MEDIUM=4`, `LOW=4`
- post-apply audit status: `waiting-for-operator`
- operator status board: `waiting-for-operator`, `pending=16`
- manual patch plan: `waiting-for-operator`, `manualPatchRows=0`
- real approval readiness status: `waiting-for-operator`, `approved=0`, `manualPatchRows=0`, `sourceDataWritePerformed=false`
- smoke status: `passed`, `cases=26/26`
- approved dry-run status: `passed`, `target=021`, `manualPatchRows=1`, `readinessRow=APPROVED_NOT_APPLIED`, `sourceDataWritePerformed=false`
- applied dry-run status: `passed`, `target=021`, `postApply=applied`, `operatorStatusRow=APPLIED`, `manualPatchRows=0`, `readinessRow=APPROVED_APPLIED`, `sourceDataWritePerformed=false`
- 131 lifecycle smoke status: `passed`, `preflight=ready-for-approval-gate`, `approval=ready-for-prewrite`, `prewrite=ready-for-data-patch`, `applyReady=ready-for-manual-apply`, `postApply=not-applied`, `operatorStatusRow=NOT_APPLIED`, `manualPatchAction=MANUAL_PATCH_REQUIRED`, `readinessRow=APPROVED_NOT_APPLIED`, `sourceDataWritePerformed=false`
- readiness summary status: `passed`, `operatorInputRows=16`, `operatorInputApproved=0`, `packageImageHighRisk=8`, `reviewBoardImageHighRisk=8`, `packageReviewBoardImagePriorityMatched=true`, `realApprovalReadiness=waiting-for-operator`, `prewriteSmoke=passed`, `approvedDryRun=APPROVED_NOT_APPLIED`, `appliedDryRun=APPROVED_APPLIED`, `targetEntryPreflight=waiting-for-operator:PENDING`, `targetEntryPreflightReady=false`, `targetEntryPreflightSmoke=passed:12/12`, `targetApprovalGate=waiting-for-operator:PENDING`, `targetApprovalReady=false`, `freshReports=true`
- readiness summary smoke status: `passed`, `cases=27/27`
- completion gate status: `waiting-for-operator`, `pending=16`, `approvedApplied=0`, `manualPatchRows=0`, `next=131`, `readyForStage01Close=false`, `sourceDataWritePerformed=false`
- completion gate smoke status: `passed`, `cases=9/9`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- staged scope audit smoke status: `passed`, `cases=7/7`, `expectedStage01PartialTargetFileCount=40`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- readiness QA status: `passed`, partial-worktree-safe, excludes full release `pr-scope-guard` and build
- operator package preservation: `passed`

## Current 131 Operator Target

- targetSectionId: `131`
- sectionName: `네이버 클립존 (응원탁자석) 131블록`
- zoneId: `ZONE_FIRST_BASE_THIN_131_143`
- image risk: `HIGH`, reasons `SMALL_OFFICIAL_PIXEL_COMPONENT`, `LOW_PATH_COLOR_COVERAGE`
- targetViewport: `615 433 140 110`
- currentHitPath: `M 666 484 L 694 483 L 703 484 L 704 491 L 700 493 L 674 493 L 666 491 Z`
- currentLabelPoint: `683,489`
- currentHitPathPointCount: `7`, currentHitPathArea: `345`
- pixelComponentArea: `14`, pixelPathColorCoverageRatio: `0.841`
- pixelBbox: `682,485,684,490`, pixelSeedPoint: `683,489`
- operator input status: `PENDING`, selectedSource: `none`, readyForPrewrite: `false`

`APPROVED`로 전환하려면 operator가 공식 2026 사직 PNG를 직접 보고 `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`, `operatorNote`를 입력해야 한다. Pixel candidate path, AI 좌표 예측, browser CSS pixel, resized screenshot, web search, crawling, third-party seatmap image는 좌표 source로 사용할 수 없다.
`131-review-packet.json`의 `operatorInputChecklist`는 primary input source, alternate input source, source conflict rule, target entry template, review overlay SVG, official PNG crop, overlay crop, edge crop, review board SVG, entry sheet CSV, official PNG evidence version, image hash, mapVersion, source field policy, approved entry example, required human actions, required review assertions, forbidden coordinate sources, ready-for-prewrite criteria를 함께 노출한다.

Primary input source is `reports/stadium/sajik-stage01-operator/targets/131-entry-template.json`. Alternate input source is `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json`. If both files contain editable values for `131`, they must match exactly or `TARGET_APPROVAL_SOURCE_CONFLICT` blocks approval.

Before running the approval gate, `npm run stadium:sajik:stage01-target-entry-preflight` validates the target entry template and operator input row without writing either file. It blocks partial correctedPath/label input, source conflicts, evidence hash or mapVersion drift, locked source fields, invalid `reviewedAt`, malformed correctedPath values, and direct source patch fields. It returns `ready-for-approval-gate` only when a meaningful selected input is internally valid; otherwise it remains `waiting-for-operator` or `blocked`.

## 131 Official PNG Analysis Artifacts

`npm run stadium:sajik:stage01-target-review-packet` also writes official PNG analysis artifacts for `131`:

- `reports/stadium/sajik-stage01-operator/targets/131-official-crop.png`
- `reports/stadium/sajik-stage01-operator/targets/131-official-overlay-crop.png`
- `reports/stadium/sajik-stage01-operator/targets/131-official-edge-crop.png`

These files are generated from `src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.webp` after checking the locked `960x640` size and `e9cb51ccf57a754ddf066a95c6c789d65edf8dff167f432fd35fe809e9dc80aa` hash. They are reference-only operator review aids. The official crop is the primary visual aid for manual tracing, the overlay crop shows red current hitPath, blue reference-only pixel component, label point, and grid coordinates, and the edge crop is only for inspecting boundaries and seams. None of these artifacts may be copied as a correctedPath source without human tracing against the official PNG.

## 131 Operator Input Ready

The ready input file for section `131` is `reports/stadium/sajik-stage01-operator/targets/131-entry-template.json`. Operator entry must use the official 2026 Sajik PNG at the locked `960x640` viewBox and may use the generated official crop, overlay crop, and edge crop only as reference aids. It must not infer coordinates from browser CSS pixels, resized screenshots, AI coordinate prediction, web search, crawling, or third-party seatmap images.

Before operator input, the expected read-only state is:

- `npm run stadium:sajik:stage01-target-review-packet` reports `target=131`, `risk=HIGH`, and `sourceDataWritePerformed=false`.
- `npm run stadium:sajik:stage01-target-approval-gate` refreshes preflight first and reports `source=none`, `decision=PENDING`, `readyForPrewrite=false`, `targetEntryPreflight=waiting-for-operator:PENDING`, and `sourceDataWritePerformed=false`.
- `src/data/sajikSeatData.ts` remains unchanged.

To approve `131`, the operator must fill all fields below in the target entry template or in the matching `131` operator-input row:

- `operatorDecision=APPROVED`
- `correctedPath`
- `correctedLabelX`
- `correctedLabelY`
- `reviewer`
- `reviewedAt`
- `operatorNote`

`operatorNote` must document that the corrected path came from official PNG manual review. It must not say that the operator copied or pasted the pixel candidate overlay path; that wording blocks or warns in the downstream gates and requires human review.

After operator input, run:

1. `npm run stadium:sajik:stage01-target-approval-gate`
2. `npm run stadium:sajik:stage01-operator-input-aid`
3. `npm run stadium:sajik:stage01-prewrite`
4. `npm run stadium:sajik:stage01-apply-ready`
5. `npm run stadium:sajik:stage01-manual-patch-plan`
6. `npm run stadium:sajik:stage01-target-apply-precheck`
7. `npm run stadium:sajik:stage01-131-apply-path-status`

Prewrite may produce a production patch preview only after the approval gate reports `ready-for-prewrite`. Manual source patch remains forbidden until the manual patch plan reports `MANUAL_PATCH_REQUIRED`; even then only `imageGeometry.hitPath`, `imageGeometry.labelPoint`, `imageGeometry.labelX`, and `imageGeometry.labelY` may be edited.

Example `131` approved entry with placeholders only:

```json
{
  "sectionId": "131",
  "operatorDecision": "APPROVED",
  "correctedPath": "<operator traced official PNG path>",
  "correctedLabelX": "<label x inside correctedPath>",
  "correctedLabelY": "<label y inside correctedPath>",
  "reviewer": "<operator name>",
  "reviewedAt": "<ISO timestamp>",
  "operatorNote": "official PNG manual trace"
}
```

## Approval Input Contract

An approved row must include all of the following fields.

- `operatorDecision=APPROVED`
- `correctedPath`
- `correctedLabelX`
- `correctedLabelY`
- `reviewer`
- `reviewedAt`
- `operatorNote`

The package generator must preserve filled editable fields from an existing operator input file. The smoke fixture `operator-input-preservation` verifies that a regenerated package keeps `operatorDecision`, `correctedPath`, `correctedLabelX/Y`, `reviewer`, `reviewedAt`, and `operatorNote`.
The package report must expose `preservationStatus`, `existingEditableRows`, `preservedEditableRows`, and `ignoredExistingEditableRows`. If a filled editable row would be dropped, duplicated, or written outside the 16 Stage 01 section ids, package generation is blocked.

`npm run stadium:sajik:stage01-target-entry-template-readiness-smoke` verifies the real `targets/131-entry-template.json` before any operator approval is entered. It requires `operatorDecision=PENDING`, blank editable approval fields, `approvedRequiredFields=7`, official PNG review metadata, image-analysis artifact version `SAJIK_STAGE01_TARGET_IMAGE_ANALYSIS_V1`, crop viewBox `615 433 140 110`, PNG artifact size `560x440`, writable/locked source field policy, and no direct locked source fields. It writes only `sajik-seatmap-stage01-target-entry-template-readiness-smoke.{json,md}`.
`npm run stadium:sajik:stage01-target-entry-preflight-smoke` runs isolated target entry fixtures for pending input, valid approved target entry, partial path/label input, operator-input vs target-entry conflicts, invalid reviewedAt, locked target-entry fields, evidence hash drift, pixel-candidate-copy note warning, self-intersection, and locked operator-input fields. It must report `cases=12/12` and keep `sourceDataWritePerformed=false`, `writesOperatorInput=false`, and `writesProductionData=false`.
`npm run stadium:sajik:stage01-target-approval-gate` is a read-only `131` approval gate. The npm command refreshes `stage01-target-entry-preflight` first, then runs the approval gate so direct operator use does not depend on a stale preflight report. The gate reads the generated target review packet, `targets/131-entry-preflight.json`, and operator-provided `131` input from `sajik-seatmap-stage01-operator-input.json` or the target entry template, blocks conflicting sources, and returns `ready-for-prewrite` only when the preflight is fresh, selected input matches the preflight source/decision, `operatorDecision=APPROVED`, and corrected path/label/reviewer/reviewedAt validation pass. Its report must expose `preflightContract`, `sourceComparison`, per-source `approvalFingerprint`, `exactMatchRequiredWhenMultipleSourcesHaveEditableValues`, `sourceFingerprintFields`, `reviewEvidenceContract`, `imageCoordinateValidation`, and the downstream `prewriteContract`. It must keep `productionWriteAllowed=false`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, and `writesProductionData=false`.
`npm run stadium:sajik:stage01-target-approval-gate-smoke` runs isolated target approval gate fixtures for pending, valid approved, invalid geometry, source conflict, pixel-candidate-copy note, placeholder reviewer/timestamp drift, no-patch-preview decisions, target review write-flag drift, target review evidence contract drift, missing/stale target entry preflight, preflight target mismatch, preflight write-flag drift, production write drift, and approved input without valid preflight. It must report `cases=20/20` and keep `sourceDataWritePerformed=false`, `writesOperatorInput=false`, and `writesProductionData=false`. The `approved-valid-131` fixture also builds an isolated 16-row Stage 01 input and runs prewrite, expecting `ready-for-data-patch`, `patchPreviewRows=1`, `validForPatchPreview=true`, `visualPathLocked=true`, `patchAllowedFieldsOnly=true`, `targetSourceFile=src/data/sajikSeatData.ts`, writable fields `imageGeometry.hitPath/imageGeometry.labelPoint/imageGeometry.labelX/imageGeometry.labelY`, and `productionDataChanged=false`. The `KEEP_CURRENT` fixture must stay `waiting-for-operator`, produce `patchPreviewRows=0`, and keep coordinate fields blank.
`npm run stadium:sajik:stage01-target-apply-precheck` is a read-only `131` apply precheck. The npm command refreshes real approval readiness first, then reads target entry preflight, target approval gate, prewrite, apply-ready, post-apply audit, operator status, manual patch plan, and real approval readiness. Before operator approval it must report `waiting-for-operator` with `decision=PENDING`, `readyForPrewrite=false`, `manualPatchRequired=false`, `targetApplied=false`, and no source writes. After valid approval it can report `ready-for-manual-apply` only when `targetApprovalGate.readyForPrewrite=true`, manual patch action is `MANUAL_PATCH_REQUIRED`, operator status is `NOT_APPLIED`, readiness is `APPROVED_NOT_APPLIED`, and the writable fragment contains only `hitPath`, `labelPoint`, `labelX`, and `labelY`. It must block any locked source token in the writable fragment or any visualPath mutation.
`npm run stadium:sajik:stage01-131-apply-path-status` is a read-only status aggregator for the real `131` apply path. It refreshes target apply precheck and the isolated `131` lifecycle smoke, then emits `targets/131-apply-path-status.{json,md}`. Before operator approval it must report `waiting-for-operator`, `decision=PENDING`, `editableFieldsBlank=true`, `readyForPrewrite=false`, `manualPatchRequired=false`, `lifecycleFixtureReady=true`, `officialPngEvidenceReady=true`, `approvalInputChecklistReady=true`, and no source/operator-input/production writes. The report must also expose `coordinatePatchReadiness` with `productionPatchAllowedNow=false` and `blockerReason=OPERATOR_APPROVED_COORDINATES_MISSING`, plus `operatorDecisionPacket.decisionPacketVersion=SAJIK_STAGE01_131_DECISION_PACKET_V1`, `operatorDecisionPacket.allowedDecisionPaths`, `currentGeometryApprovalDraft`, `keepCurrentDecisionDraft`, the official PNG evidence brief, official PNG visual review brief, `131-official-crop.png`, `131-official-overlay-crop.png`, `131-official-edge-crop.png`, required review assertions, forbidden coordinate sources, and ready-for-prewrite criteria so the operator approval path can be checked without guessing coordinates. `currentGeometryApprovalDraft` may copy the current production `hitPath`/`labelPoint` into an `APPROVED` entry shape, but it is not auto-approved and should produce a no-delta review warning unless the operator replaces it with a new trace. Draft placeholders such as `<operator name>` and `<ISO timestamp>` must be replaced before intake; otherwise the row blocks with `OPERATOR_PLACEHOLDER_NOT_REPLACED:*`.
Allowed decisions are `PENDING`, `APPROVED`, `REJECTED`, `NEEDS_RETRACE`, and `KEEP_CURRENT`. Only `APPROVED` can enter patch preview; all other decisions are decision rows with no production patch preview.
The review board and entry sheet must expose `operatorDecisionOptions`, `approvedRequiredFields`, `keepCurrentRule`, and `patchPreviewEligible` so an operator can complete input without opening source code. `KEEP_CURRENT` requires `reviewer`, `reviewedAt`, and `operatorNote`, while `correctedPath`, `correctedLabelX`, and `correctedLabelY` must stay blank.
The operator package and review board both read the local official PNG pixel-component report and expose image-analysis risk, seed, bbox, coverage, outside-distance, and priority order as review evidence only. The package regenerates `imagePriorityRank`, `imageRiskLevel`, `imageRiskReasons`, `imageComponentArea`, `imagePathColorCoverageRatio`, `imageBbox`, and `imageSeedPoint` every time; these are not editable operator fields. Pixel candidate paths must not be copied into `correctedPath` without explicit operator approval.
Geometry quality review must expose `areaRatioVsCurrentHit`, `boundsMaxAbsDelta`, `labelBoundaryDistance`, and prewrite `centroidDelta`. Reusing the current hit/visual path or placing a label within 1px of the boundary is a warning; excessive point count, area expansion, or bounds drift blocks the row before patch preview.
If an approved row's `operatorNote` says the operator copied or pasted a pixel candidate path, input aid and prewrite must warn with `OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW`. This remains warning-only because the note can be ambiguous, but it requires human review before manual patching.
Prewrite must emit `sourcePatchContract` and `sourcePatchContractRows` for every approved patch preview. A row can continue only when `patchAllowedFieldsOnly=true`, `changedSourceFields` is limited to `imageGeometry.hitPath`, `imageGeometry.labelPoint`, `imageGeometry.labelX`, and `imageGeometry.labelY`, and `unexpectedChangedSourceFields` is empty. Any locked-field write must block with `PATCH_PREVIEW_WRITES_LOCKED_FIELD`.
For section `131`, prewrite must also require a matching ready `targets/131-approval-gate.json`; missing, blocked, stale, or selected-entry-mismatched approval gate reports must block with `APPROVED_ROW_INVALID:131` before any patch preview is generated.
Manual patch rows must expose `beforeFingerprint`, `approvedFingerprint`, `lockedFieldFingerprint`, `sourceBaseline`, and `writableTsFragment`. Before editing `src/data/sajikSeatData.ts`, verify the current source still matches the before fingerprint, then edit only `hitPath`, `labelPoint`, `labelX`, and `labelY`.
Post-apply audit must block partial or stale application states: `PARTIAL_APPLY_HITPATH_ONLY`, `PARTIAL_APPLY_LABEL_ONLY`, `LEGACY_LABEL_DRIFT`, `STALE_BEFORE_SNAPSHOT_HIT_PATH`, `STALE_BEFORE_SNAPSHOT_LABEL_POINT`, and `LOCKED_FIELD_MUTATED:*`.

For `131` after valid operator approval, run commands in this order:

1. `npm run stadium:sajik:stage01-target-entry-preflight`
2. `npm run stadium:sajik:stage01-target-approval-gate`
3. `npm run stadium:sajik:stage01-operator-input-aid`
4. `npm run stadium:sajik:stage01-prewrite`
5. `npm run stadium:sajik:stage01-apply-ready`
6. `npm run stadium:sajik:stage01-manual-patch-plan`
7. `npm run stadium:sajik:stage01-target-apply-precheck`
8. `npm run stadium:sajik:stage01-131-apply-path-status`

Compact command chain: `stage01-target-entry-preflight -> stage01-target-approval-gate -> stage01-operator-input-aid -> stage01-prewrite -> stage01-apply-ready -> stage01-manual-patch-plan -> stage01-target-apply-precheck -> stage01-131-apply-path-status`.

Manual source patch is allowed only after the manual patch plan reports `MANUAL_PATCH_REQUIRED`. Writable source fields are `imageGeometry.hitPath`, `imageGeometry.labelPoint`, `imageGeometry.labelX`, and `imageGeometry.labelY`. Locked source fields are `imageGeometry.visualPath`, `imageGeometry.geometryVersion`, `sectionKind`, `markerType`, `mapInteractionStatus`, `traceSource`, `traceMethod`, and `traceVersion`.

## Operator Input Template Readiness

The operator input template is ready only when the generated `sajik-seatmap-stage01-operator-input.json` satisfies all conditions below.

| Field | Expected value |
| --- | --- |
| `packageVersion` | `SAJIK_STAGE01_OPERATOR_PACKAGE_V1` |
| `targetStage` | `Stage 01 P0` |
| row count | `16` |
| section ids | `021/022/031/032/121/122/123/124/125/131/132/133/134/135/142/143` |
| row order | `imagePriorityRank`: `131/032/133/143/135/134/122/123/132/031/022/142/121/124/125/021` |
| initial decisions | all `PENDING` unless an operator has intentionally filled a row |
| editable fields | `operatorDecision`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`, `operatorNote` |
| image-analysis metadata | regenerated from `reports/stadium/sajik-seatmap-pixel-components.json`; reference only |
| generated outputs | operator input, input aid, review board, entry sheet, review overlay |

Do not edit generated metadata fields such as `sectionId`, `sectionName`, `batchId`, `zoneId`, `imagePriorityRank`, `imageRiskLevel`, `imageRiskReasons`, `imageComponentArea`, `imagePathColorCoverageRatio`, `imageBbox`, `currentHitPath`, `currentVisualPath`, `currentLabelX`, or `currentLabelY`. If a section id is missing, duplicated, outside Stage 01, or the image-analysis priority order changes unexpectedly, regenerate the package and fix the generator/report blocker instead of hand-editing row identity.

## Decision Downstream Matrix

| operatorDecision | Required operator fields | Input aid rowStatus | Prewrite result | Manual patch result | Readiness result |
| --- | --- | --- | --- | --- | --- |
| `PENDING` | none | `PENDING` | no patch preview | no manual patch row | `waiting-for-operator` |
| `APPROVED` | `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`, `operatorNote`; no placeholders | `READY_FOR_PREWRITE` or `INVALID` | valid rows become patch preview candidates | valid not-applied rows become `MANUAL_PATCH_REQUIRED` | `APPROVED_NOT_APPLIED`, `APPROVED_APPLIED`, or `APPROVED_BLOCKED` |
| `REJECTED` | `operatorNote` recommended | `REJECTED` | no patch preview | no manual patch row | no approved readiness row |
| `NEEDS_RETRACE` | `operatorNote` recommended | `NEEDS_RETRACE` | no patch preview | no manual patch row | no approved readiness row |
| `KEEP_CURRENT` | `reviewer`, `reviewedAt`, `operatorNote`; coordinate fields blank; no placeholders | `KEEP_CURRENT` or `INVALID` | no patch preview | no manual patch row | no approved readiness row |

Only `APPROVED` rows can produce a source patch candidate. `REJECTED`, `NEEDS_RETRACE`, and `KEEP_CURRENT` are explicit operator decisions and must not be converted into geometry writes.

Example approved row:

```json
{
  "sectionId": "021",
  "operatorDecision": "APPROVED",
  "correctedPath": "M ... Z",
  "correctedLabelX": 480,
  "correctedLabelY": 312,
  "reviewer": "operator-name",
  "reviewedAt": "2026-05-15T00:00:00.000Z",
  "operatorNote": "Approved hitPath after official PNG trace review."
}
```

Example rejected row:

```json
{
  "sectionId": "022",
  "operatorDecision": "REJECTED",
  "operatorNote": "Candidate does not match the official PNG boundary."
}
```

Example retrace request row:

```json
{
  "sectionId": "031",
  "operatorDecision": "NEEDS_RETRACE",
  "operatorNote": "Boundary must be retraced before approval."
}
```

Example keep-current row:

```json
{
  "sectionId": "032",
  "operatorDecision": "KEEP_CURRENT",
  "operatorNote": "Current production hitPath is acceptable for this Stage 01 pass."
}
```

## Prewrite And Apply-Ready Flow

1. Run `npm run stadium:sajik:stage01-operator-input-aid`.
2. Run `npm run stadium:sajik:stage01-review-board`.
3. Use the `imagePriorityRank`/`imageRiskLevel` columns in `sajik-seatmap-stage01-operator-input.csv`, the `Official PNG Image Analysis` section in `sajik-seatmap-stage01-review-board.md`, `sajik-seatmap-stage01-entry-sheet.csv`, and `sajik-seatmap-stage01-review-board.svg` to decide which rows need operator entry.
4. Fix any `INVALID` operator rows before prewrite.
5. Run `npm run stadium:sajik:stage01-prewrite`.
6. Review `sajik-seatmap-stage01-prewrite.md` and `sajik-seatmap-stage01-prewrite.patch-preview.ts`.
7. Run `npm run stadium:sajik:stage01-apply-ready`.
8. Run `npm run stadium:sajik:stage01-post-apply-audit`.
9. Run `npm run stadium:sajik:stage01-operator-status`.
10. Run `npm run stadium:sajik:stage01-manual-patch-plan`.
11. Run `npm run stadium:sajik:stage01-real-approval-readiness`.
12. Proceed to manual patch review only when apply-ready status is `ready-for-manual-apply`, operator status is `ready-for-manual-apply`, manual patch plan has `manualPatchRows > 0`, and real approval readiness reports `APPROVED_NOT_APPLIED` or `APPROVED_READY` rows without blockers.
13. Before manual patching, post-apply status may be `not-applied`; operator status rows should show `NOT_APPLIED`, manual patch plan rows should show `MANUAL_PATCH_REQUIRED`, and real approval readiness should show `APPROVED_NOT_APPLIED`.
14. After manual patching, post-apply status must become `applied`; operator status rows should show `APPLIED`, manual patch plan should have `manualPatchRows=0`, and real approval readiness should show `APPROVED_APPLIED`.
15. If status is `waiting-for-operator`, do not modify `src/data/sajikSeatData.ts`.
16. If status is `blocked`, fix the operator input instead of applying a partial patch.

`operator input aid` is read-only and reports rowStatus `PENDING/READY_FOR_PREWRITE/REJECTED/NEEDS_RETRACE/KEEP_CURRENT/INVALID` before prewrite. It also emits row-level `action` and `nextAction`: `FILL_OR_DECIDE`, `RUN_PREWRITE`, `FIX_OPERATOR_INPUT`, or `NO_PATCH_PREVIEW`.
`review board` is read-only and turns the package/input-aid state into a board, entry sheet, and overlay SVG for operator entry. It does not infer coordinates or write source data.
`next-action packet` is read-only and turns the input aid/review board state into an operator queue ordered by official PNG image-analysis priority. It writes only `sajik-seatmap-stage01-next-action-packet.{json,csv,md}` and does not infer coordinates, modify operator input, or write source data.
`target review packet` is read-only and turns the next operator target into a focused operator packet. For the current queue it writes only `targets/131-review-packet.{json,md,svg}` plus `targets/131-entry-template.{json,csv}`, verifies `targetSectionId=131` matches `nextOperatorSectionId=131`, includes `SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1` with official image hash/mapVersion/viewport/current trace/pixel-component reference/required review assertions/source field policy, and does not infer coordinates, modify operator input, or write source data.
`prewrite` is read-only and must include `Patch Preview Review` rows with `visualPathLocked`, hitPath point/area/bounds delta, and labelPoint delta for every patch preview candidate.
`ready-for-manual-apply` means the patch preview is a valid review candidate. It does not mean the script has modified production data.
`post-apply audit` is read-only and compares Stage 01 patch payloads with the current production dataset. It never writes source data.
`operator status board` is read-only and merges the operator input, prewrite, apply-ready, and post-apply reports into rowStatus `PENDING/REJECTED/NEEDS_RETRACE/KEEP_CURRENT/INVALID/APPLIED/NOT_APPLIED`.
`manual patch plan` is read-only and turns `NOT_APPLIED` rows into section-level `MANUAL_PATCH_REQUIRED` fragments for `src/data/sajikSeatData.ts`.
`real approval readiness` is read-only and turns actual approved rows into `APPROVED_READY`, `APPROVED_NOT_APPLIED`, `APPROVED_APPLIED`, or `APPROVED_BLOCKED` readiness rows. It verifies source write flags, writable source fields, locked source fields, `targetSourceFile`, and `src/data/sajikSeatData.ts` without patching source data.

## Real Approval Readiness Contract

`npm run stadium:sajik:stage01-real-approval-readiness` reads the real Stage 01 operator input and all generated Stage 01 reports. It does not use the synthetic dry-run input.

Readiness statuses:

- `APPROVED_READY`: approved row is valid and ready for manual review, with no required source patch yet.
- `APPROVED_NOT_APPLIED`: approved row is valid, ready for manual patch, and not yet reflected in production data.
- `APPROVED_APPLIED`: approved row is already reflected in production data and no manual patch row remains.
- `APPROVED_BLOCKED`: approved row violates source write, geometry, target source, locked field, label, validation, or stage contract.

The readiness gate must keep `sourceDataWritePerformed=false`, `productionWriteAllowed=false`, and `productionDataChanged=false`. It may only accept Stage 01 `SEAT_SECTION` rows, may only treat `imageGeometry.hitPath`, `imageGeometry.labelPoint`, `imageGeometry.labelX`, and `imageGeometry.labelY` as writable source fields, and must keep `imageGeometry.visualPath`, `imageGeometry.geometryVersion`, `sectionKind`, `markerType`, `mapInteractionStatus`, `traceSource`, `traceMethod`, and `traceVersion` locked.
The smoke fixture `approved-applied-after-manual-patch` simulates the post-manual-patch reports and verifies the `APPLIED -> manualPatchRows=0 -> APPROVED_APPLIED -> VERIFY_APPLIED` branch without editing `src/data/sajikSeatData.ts`.

## Approved Dry-Run Contract

`npm run stadium:sajik:stage01-approved-dry-run` creates a synthetic approved `021` row inside `reports/stadium/sajik-stage01-operator/dry-run` and runs input-aid, prewrite, apply-ready, post-apply audit, operator-status, manual-patch-plan, and real approval readiness against that isolated input.

Expected state transition:

```text
ready-for-data-patch
 -> ready-for-manual-apply
 -> not-applied
 -> MANUAL_PATCH_REQUIRED
 -> APPROVED_NOT_APPLIED
```

The dry-run must keep `sourceDataWritePerformed=false`, `productionWriteAllowed=false`, and `productionDataChanged=false`. It must report `readinessRow=APPROVED_NOT_APPLIED` and `approvedBlockedRows=0`. It is a release gate for the handoff workflow, not a source patch.

## Applied Dry-Run Contract

`npm run stadium:sajik:stage01-applied-dry-run` creates a synthetic approved no-delta `021` row inside `reports/stadium/sajik-stage01-operator/applied-dry-run` and runs input-aid, prewrite, apply-ready, post-apply audit, operator-status, manual-patch-plan, and real approval readiness against that isolated input.

Expected state transition:

```text
ready-for-data-patch
 -> ready-for-manual-apply
 -> applied
 -> APPLIED
 -> APPROVED_APPLIED
 -> VERIFY_APPLIED
```

The applied dry-run must keep `sourceDataWritePerformed=false`, `productionWriteAllowed=false`, and `productionDataChanged=false`. It must report `operatorStatusRow=APPLIED`, `manualPatchRows=0`, `readinessRow=APPROVED_APPLIED`, and `approvedBlockedRows=0`. It proves the already-applied branch stays valid without editing `src/data/sajikSeatData.ts`.

## 131 Lifecycle Smoke Contract

`npm run stadium:sajik:stage01-131-lifecycle-smoke` creates an isolated approved `131` fixture inside `reports/stadium/sajik-stage01-operator/target-lifecycle-smoke`, runs target entry preflight, target approval gate, input-aid, prewrite, apply-ready, post-apply audit, operator-status, manual-patch-plan, and real approval readiness, and never edits `src/data/sajikSeatData.ts`.

Expected state transition:

```text
ready-for-prewrite
 -> ready-for-data-patch
 -> ready-for-manual-apply
 -> not-applied
 -> NOT_APPLIED
 -> MANUAL_PATCH_REQUIRED
 -> APPROVED_NOT_APPLIED
```

The lifecycle smoke must keep `sourceDataWritePerformed=false`, `productionWriteAllowed=false`, and `productionDataChanged=false`. It must also prove `patchAllowedFieldsOnly=true`, `writableFragmentLockedTokensAbsent=true`, and the generated `writableTsFragment` contains only writable geometry assignments: `hitPath`, `labelPoint`, `labelX`, and `labelY`.

## Readiness Summary Contract

`npm run stadium:sajik:stage01-readiness-summary` reads the real operator package, operator input, review board, real approval readiness, prewrite smoke, approved dry-run, applied dry-run, target entry preflight, target entry preflight smoke, and target approval gate JSON reports and verifies the Stage 01 handoff contract in one place.

Expected summary:

```text
realApprovalReadiness=waiting-for-operator
operatorInputRows=16
operatorInputApproved=0
prewriteSmoke=passed
approvedDryRun=APPROVED_NOT_APPLIED
appliedDryRun=APPROVED_APPLIED
targetEntryPreflight=waiting-for-operator:PENDING
targetEntryPreflightReady=false
targetEntryPreflightSmoke=passed:12/12
targetApprovalGate=waiting-for-operator:PENDING
targetApprovalReady=false
sourceDataWritePerformed=false
freshReports=true
packageImageHighRisk=8
reviewBoardImageHighRisk=8
packageImagePriority=131>032>133>143>135>134>122>123>132>031>022>142>121>124>125>021
reviewBoardImagePriority=131>032>133>143>135>134>122>123>132>031>022>142>121>124>125>021
packageReviewBoardImagePriorityMatched=true
```

The summary fails if any required report is missing, stale, changes one of the fixed branch contracts, drifts from the Stage 01 operator input template, changes the official PNG image-analysis contract from the operator package or review board, lets package/input/review-board image priority drift apart, or lets target entry preflight/preflight smoke drift. It writes only `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-readiness-summary.{json,md}` and does not edit production data.

Operator package image-analysis invariants:

- `imageAnalysisMetadataRegenerated=true`
- `imageCandidateReferenceOnly=true`
- `HIGH=8`, `MEDIUM=4`, `LOW=4`
- `pixelComponents=reports/stadium/sajik-seatmap-pixel-components.json`
- `imageAnalysisPriorityOrder=131/032/133/143/135/134/122/123/132/031/022/142/121/124/125/021`
- package priority order must match operator input `imagePriorityRank` order and review board `priorityOrder`

Review board image-analysis invariants:

- `candidateReferenceOnly=true`
- `officialPngOnly=true`
- `stage01RowsWithPixelCandidate=16`
- `highRiskRows=6`, `mediumRiskRows=5`, `lowRiskRows=5`
- `source=reports/stadium/sajik-seatmap-pixel-components.json`
- `priorityOrder=131/032/133/143/135/134/122/123/132/031/022/142/121/124/125/021`

## Readiness Summary Smoke Contract

`npm run stadium:sajik:stage01-readiness-summary-smoke` builds isolated fixtures under `reports/stadium/sajik-stage01-operator/summary-smoke` and runs the summary script with `--stage-dir` and `--max-age-seconds`.

Expected cases:

```text
valid-summary
missing-report -> REPORT_MISSING
review-board-missing -> REPORT_MISSING
stale-report -> REPORT_NOT_FRESH
approved-readiness-drift -> APPROVED_DRY_RUN_READINESS_ROW_CHANGED
applied-readiness-drift -> APPLIED_DRY_RUN_READINESS_ROW_CHANGED
image-analysis-priority-drift -> REVIEW_BOARD_IMAGE_PRIORITY_CHANGED
image-analysis-risk-count-drift -> REVIEW_BOARD_IMAGE_RISK_COUNTS_CHANGED
candidate-reference-drift -> REVIEW_BOARD_IMAGE_REFERENCE_ONLY_DISABLED
pixel-component-source-drift -> REVIEW_BOARD_PIXEL_COMPONENT_SOURCE_CHANGED
package-image-priority-drift -> OPERATOR_PACKAGE_IMAGE_PRIORITY_CHANGED + PACKAGE_REVIEW_BOARD_IMAGE_PRIORITY_MISMATCH
package-image-risk-count-drift -> OPERATOR_PACKAGE_IMAGE_RISK_COUNTS_CHANGED + PACKAGE_REVIEW_BOARD_IMAGE_RISK_COUNTS_MISMATCH
package-candidate-reference-drift -> OPERATOR_PACKAGE_IMAGE_REFERENCE_ONLY_DISABLED
package-pixel-component-source-drift -> OPERATOR_PACKAGE_PIXEL_COMPONENT_SOURCE_CHANGED
operator-input-image-priority-drift -> OPERATOR_INPUT_IMAGE_PRIORITY_CHANGED + OPERATOR_INPUT_FIRST_IMAGE_PRIORITY_ROW_CHANGED + PACKAGE_OPERATOR_INPUT_IMAGE_PRIORITY_MISMATCH
package-review-board-image-mismatch -> PACKAGE_REVIEW_BOARD_IMAGE_PRIORITY_MISMATCH
target-entry-preflight-missing -> REPORT_MISSING
target-entry-preflight-stale -> REPORT_NOT_FRESH
target-entry-preflight-source-write-drift -> TARGET_ENTRY_PREFLIGHT_SOURCE_DATA_WRITE_PERFORMED
target-entry-preflight-status-drift -> TARGET_ENTRY_PREFLIGHT_STATUS_CHANGED
target-entry-preflight-smoke-failed -> TARGET_ENTRY_PREFLIGHT_SMOKE_STATUS_CHANGED + TARGET_ENTRY_PREFLIGHT_SMOKE_CASE_COUNT_CHANGED
target-entry-preflight-target-mismatch -> TARGET_ENTRY_PREFLIGHT_SECTION_CHANGED
target-approval-gate-missing -> REPORT_MISSING
target-approval-source-write-drift -> TARGET_APPROVAL_GATE_SOURCE_DATA_WRITE_PERFORMED
target-approval-status-drift -> TARGET_APPROVAL_GATE_STATUS_CHANGED
source-write-drift -> SOURCE_DATA_WRITE_PERFORMED
operator-input-drift -> OPERATOR_INPUT_ROW_COUNT_CHANGED
```

The smoke writes only `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-readiness-summary-smoke.{json,md}` plus isolated fixture reports. It must not edit `src/data/sajikSeatData.ts`.

## Manual Patch Checklist

For each approved section fragment:

- verify `beforeFingerprint` still matches the current source baseline before editing
- apply `imageGeometry.hitPath` from the approved `correctedPath`
- apply `imageGeometry.labelPoint` from `[correctedLabelX, correctedLabelY]`
- update legacy-compatible `labelX` and `labelY` to match `labelPoint`
- keep `imageGeometry.visualPath` unchanged unless a separate visual retrace approval exists
- keep `imageGeometry.geometryVersion='manual-polygon-v2'`
- keep `sectionKind`, `markerType`, `mapInteractionStatus`, `traceSource`, `traceMethod`, and `traceVersion` unchanged
- do not apply alias-only `011/903`
- do not apply accessibility marker rows through Stage 01 seat-section patching

## Manual Source Patch Procedure

Use this procedure only after `manual patch plan` reports `ready-for-manual-apply` and at least one `MANUAL_PATCH_REQUIRED` row.

1. Open `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-manual-patch-plan.md`.
2. For each row, compare the row `beforeFingerprint` and `sourceBaseline` with the current `src/data/sajikSeatData.ts` block.
3. If the baseline does not match, stop and rerun Stage 01 reports. Do not apply a stale fragment.
4. Apply only `imageGeometry.hitPath`, `imageGeometry.labelPoint`, `imageGeometry.labelX`, and `imageGeometry.labelY`.
5. Keep all locked fields unchanged: `visualPath`, `geometryVersion`, `sectionKind`, `markerType`, `mapInteractionStatus`, `traceSource`, `traceMethod`, and `traceVersion`.
6. Run `npm run stadium:sajik:stage01-post-apply-audit -- --require-applied`.
7. Confirm the target row becomes `APPLIED`, manual patch plan returns `manualPatchRows=0`, and real approval readiness returns `APPROVED_APPLIED`.

If post-apply audit reports `PARTIAL_APPLY_HITPATH_ONLY`, `PARTIAL_APPLY_LABEL_ONLY`, `LEGACY_LABEL_DRIFT`, `STALE_BEFORE_SNAPSHOT_HIT_PATH`, `STALE_BEFORE_SNAPSHOT_LABEL_POINT`, or `LOCKED_FIELD_MUTATED:*`, revert only the faulty manual patch hunk and regenerate the reports before attempting another source edit.

## Source Edit Contract

- writable source fields: `imageGeometry.hitPath`, `imageGeometry.labelPoint`, `imageGeometry.labelX`, `imageGeometry.labelY`
- locked source fields: `imageGeometry.visualPath`, `imageGeometry.geometryVersion`, `sectionKind`, `markerType`, `mapInteractionStatus`, `traceSource`, `traceMethod`, `traceVersion`
- `manual patch plan` must expose `sourceEditChecklist`, `writableSourceFields`, and `lockedSourceFields` for each `MANUAL_PATCH_REQUIRED` row.
- `manual patch plan` must expose `writableTsFragment`; this fragment intentionally omits locked `visualPath` and metadata fields. A full context preview may be shown for review, but it is not the edit fragment.
- If a row needs any field outside the writable list, it is not a Stage 01 hitPath patch and must be handled by a separate plan.

## Required Verification After Manual Patch

Run these commands after applying any Stage 01 data patch.

```bash
npm run stadium:sajik:stage01-operator-input-aid
npm run stadium:sajik:stage01-review-board
npm run stadium:sajik:stage01-next-action-packet
npm run stadium:sajik:stage01-target-review-packet
npm run stadium:sajik:stage01-target-entry-template-readiness-smoke
npm run stadium:sajik:stage01-target-entry-preflight
npm run stadium:sajik:stage01-target-entry-preflight-smoke
npm run stadium:sajik:stage01-target-approval-gate
npm run stadium:sajik:stage01-target-approval-gate-smoke
npm run stadium:sajik:stage01-prewrite
npm run stadium:sajik:stage01-apply-ready
npm run stadium:sajik:stage01-post-apply-audit -- --require-applied
npm run stadium:sajik:stage01-operator-status
npm run stadium:sajik:stage01-manual-patch-plan
npm run stadium:sajik:stage01-real-approval-readiness
npm run stadium:sajik:stage01-prewrite-smoke
npm run stadium:sajik:stage01-approved-dry-run
npm run stadium:sajik:stage01-applied-dry-run
npm run stadium:sajik:stage01-next-action-packet
npm run stadium:sajik:stage01-target-review-packet
npm run stadium:sajik:stage01-target-entry-template-readiness-smoke
npm run stadium:sajik:stage01-target-entry-preflight
npm run stadium:sajik:stage01-target-entry-preflight-smoke
npm run stadium:sajik:stage01-target-approval-gate
npm run stadium:sajik:stage01-target-approval-gate-smoke
npm run stadium:sajik:stage01-all-target-approval-input-guide
npm run stadium:sajik:stage01-all-target-approval-input-guide-smoke
npm run stadium:sajik:stage01-operator-input-intake-gate
npm run stadium:sajik:stage01-operator-input-intake-gate-smoke
npm run stadium:sajik:stage01-131-apply-path-status
npm run stadium:sajik:stage01-readiness-summary
npm run stadium:sajik:stage01-readiness-summary-smoke
npm run stadium:sajik:stage01-completion-gate
npm run stadium:sajik:stage01-completion-gate-smoke
npm run stadium:sajik:stage01-staged-scope-audit-smoke
npm run qa:stadium:sajik:stage01-readiness
npm run stadium:sajik:stage01-pr-scope-guard
npm run stadium:sajik:pr-scope-guard-smoke
node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts
node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts
npm run qa:stadium:sajik:polygon-v2
```

The final gate must keep `productionDataChanged=false` for the Stage 01 helper scripts. Data changes are manual review patches, not script writes.

## Partial PR Staging Candidate

Current Stage 01 partial scope is `passed` with `included=<runtime>`, `separate=<runtime>`, `unexpected=0`, `partialBlockers=0`, and `stage01PartialStagingVerdict=ready-for-partial-stage01-staging`. `included` and `separate` are advisory dirty-worktree counts and may drift as unrelated workstreams change; the Stage 01 partial pass criteria are `unexpected=0`, `partialBlockers=0`, and `absent-from-worktree=0`.

Stage only the Sajik Stage 01 hunks/files below for the partial PR candidate. Do not use bulk `git add .`; shared files such as `package.json`, `scripts/stadium-ux-audit.mjs`, and `src/components/StadiumGuideRuntimeSeatMaps.test.ts` require hunk review.

```text
docs/sajik-seatmap-pr-packaging-inventory.md
docs/sajik-seatmap-release-lock.md
docs/sajik-seatmap-stage01-handoff.md
package.json
scripts/sajik-seatmap-editor-scope.mjs
scripts/sajik-seatmap-editor-scope.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/sajik-seatmap-stage01.mjs
scripts/stadium-ux-audit.mjs
src/components/StadiumGuideRuntimeSeatMaps.test.ts
```

The current full release guard remains blocked by 22 clean full-release payload files. That is expected for a partial Stage 01 worktree and must not be treated as a Stage 01 readiness failure. Separate workstream files, including shared home ranking/toast UI changes, must remain outside this partial PR.

After hunk staging, run `npm run stadium:sajik:stage01-staged-scope-audit:complete`. It inspects only `git diff --cached`, writes `reports/stadium/sajik-seatmap-stage01-staged-scope-audit.{json,csv,md}`, blocks staged files outside the 40-file Stage 01 target list, and keeps `safeToRunBulkGitAdd=false`. The report includes a `stagingRemediation` section with `stagedFilesToKeep`, `stagedFilesToUnstage`, `stagedFilesToUnstageWithReasons`, `stagedManualHunkReviewFiles`, and `nextActions`; this is an operator checklist only and does not run git commands. Unstage reasons are explicit (`OUTSIDE_STAGE01_TARGET`, `SEPARATE_DIRTY_WORK`, `UNEXPECTED_DIRTY_FILE`, `DELETED_STAGE01_TARGET`) so mixed staged work can be cleaned up without guessing why each file was blocked.

## Stage 02 Entry Conditions

Stage 02 can start only when all conditions below are true.

- Stage 01 approved rows have been either manually applied or explicitly left pending with an operator decision.
- `npm run qa:stadium:sajik:polygon-v2` passes.
- `npm run stadium:sajik:stage01-operator-input-aid` reports no `INVALID` rows.
- `npm run stadium:sajik:stage01-review-board` reports no `INVALID` rows and `blockers=0`.
- `npm run stadium:sajik:stage01-next-action-packet` passes and reports `nextOperatorSectionId=131` while all rows remain pending.
- `npm run stadium:sajik:stage01-target-review-packet` passes and reports `target=131`, `next=131`, `risk=HIGH`, `sourceDataWritePerformed=false`.
- `npm run stadium:sajik:stage01-target-entry-template-readiness-smoke` passes and reports `target=131`, `decision=PENDING`, `editableFieldsBlank=true`, `approvedRequiredFields=7`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, and `writesProductionData=false`.
- `npm run stadium:sajik:stage01-target-entry-preflight` passes and reports `target=131`, `status=waiting-for-operator` before real operator input or `ready-for-approval-gate` after valid input, with `sourceDataWritePerformed=false`.
- `npm run stadium:sajik:stage01-target-entry-preflight-smoke` passes and reports `cases=12/12`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, and `writesProductionData=false`.
- `npm run stadium:sajik:stage01-target-approval-gate` passes and reports `target=131`, `status=waiting-for-operator` before real operator input or `ready-for-prewrite` after valid `APPROVED` input, with `targetEntryPreflight=waiting-for-operator:PENDING` or `ready-for-approval-gate:APPROVED` and `sourceDataWritePerformed=false`.
- `npm run stadium:sajik:stage01-target-approval-gate-smoke` passes and reports `cases=20/20`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, and `writesProductionData=false`.
- `npm run stadium:sajik:stage01-operator-input-intake-gate` passes and reports `status=waiting-for-operator` before real operator input or `ready-for-prewrite` after valid `APPROVED` rows, with `sourceDataWritePerformed=false`, `writesOperatorInput=false`, and `writesProductionData=false`.
- `npm run stadium:sajik:stage01-operator-input-intake-gate-smoke` passes and reports default pending 16 rows, an isolated valid approval fixture, placeholder-blocked approval/keep-current fixtures, an isolated keep-current no-patch fixture, and an isolated invalid self-intersection fixture without writing operator input or production data.
- `npm run stadium:sajik:stage01-target-apply-precheck` passes and reports `target=131`, `status=waiting-for-operator` before real operator input or `ready-for-manual-apply` after valid unapplied approval, with `sourceDataWritePerformed=false`, `writesOperatorInput=false`, and `writesProductionData=false`.
- `npm run stadium:sajik:stage01-131-apply-path-status` passes and reports `target=131`, `status=waiting-for-operator`, `decision=PENDING`, `editableFieldsBlank=true`, `readyForPrewrite=false`, `manualPatchRequired=false`, `lifecycleFixtureReady=true`, `officialPngEvidenceReady=true`, `approvalInputChecklistReady=true`, `coordinatePatchReadiness.productionPatchAllowedNow=false`, `coordinatePatchReadiness.blockerReason=OPERATOR_APPROVED_COORDINATES_MISSING`, `operatorDecisionPacket.decisionPacketVersion=SAJIK_STAGE01_131_DECISION_PACKET_V1`, `operatorDecisionPacket.allowedDecisionPaths`, `currentGeometryApprovalDraft.notAutoApproved=true`, `keepCurrentDecisionDraft.notAutoApproved=true`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, and `writesProductionData=false` before real operator input.
- `npm run stadium:sajik:stage01-apply-ready` has `blockers=0`.
- `npm run stadium:sajik:stage01-post-apply-audit -- --require-applied` passes for applied Stage 01 rows.
- `npm run stadium:sajik:stage01-operator-status` reports no `INVALID` or `NOT_APPLIED` rows for applied Stage 01 rows.
- `npm run stadium:sajik:stage01-manual-patch-plan` reports `manualPatchRows=0` after applied Stage 01 rows.
- `npm run stadium:sajik:stage01-real-approval-readiness` reports no `APPROVED_BLOCKED` rows and keeps `sourceDataWritePerformed=false`.
- `npm run stadium:sajik:stage01-approved-dry-run` passes and still reports `sourceDataWritePerformed=false`.
- `npm run stadium:sajik:stage01-applied-dry-run` passes and reports `manualPatchRows=0`, `operatorStatusRow=APPLIED`, `readinessRow=APPROVED_APPLIED`, and `sourceDataWritePerformed=false`.
- `npm run stadium:sajik:stage01-readiness-summary` passes and reports `freshReports=true`, `approvedDryRun=APPROVED_NOT_APPLIED`, and `appliedDryRun=APPROVED_APPLIED`.
- `npm run stadium:sajik:stage01-readiness-summary-smoke` passes and reports `cases=27/27`.
- `npm run stadium:sajik:stage01-completion-gate` passes and reports `status=waiting-for-operator` until all 16 Stage 01 rows are terminal, then `stage01-complete`; it must keep `sourceDataWritePerformed=false`, `writesOperatorInput=false`, and `writesProductionData=false`.
- `npm run stadium:sajik:stage01-completion-gate-smoke` passes and reports `cases=9/9`, covering pending, require-complete, complete, manual-apply, needs-retrace, source-write tamper, target-ready-without-manual-patch, and version drift branches.
- `npm run stadium:sajik:stage01-staged-scope-audit-smoke` passes and reports `cases=7/7`, covering partial target subset, complete target set, missing complete target, outside file, separate workstream, deleted target, and source count drift branches.
- `npm run qa:stadium:sajik:stage01-readiness` passes before running the full release gate in a complete Sajik PR payload worktree.
- `npm run stadium:sajik:stage01-pr-scope-guard` passes in a partial worktree and reports `executionMode=stage01-partial`, `stage01PartialScope=passed`, `stage01PartialStagingVerdict=ready-for-partial-stage01-staging`, `partialBlockers=0`, and `commandExit=0`, even when `fullRelease=blocked`.
- `npm run stadium:sajik:stage01-staged-scope-audit:complete` passes after the 40 Stage 01 partial target files are staged and reports `stagedScopeAudit.status=passed`, `acceptsOnlyStage01TargetFiles=true`, `blocksSeparateDirtyWork=true`, and `safeToRunBulkGitAdd=false`.
- `npm run stadium:sajik:pr-scope-guard-smoke` passes and keeps `stage01ReadinessAvailable=true`, `stage01PartialScope=passed`, `stage01PartialExit=0`, `partialVerificationAfterStaging`, and `fullReleaseVerificationAfterStaging`, with `fullReleaseRun` and `partialRun` snapshots written to `reports/stadium/sajik-seatmap-pr-scope-guard-smoke.{json,md}`.
- `P0-A/P0-B/P0-C` rows have no unresolved invalid approvals.
- Any unapplied Stage 01 rows are documented as `PENDING`, `REJECTED`, `NEEDS_RETRACE`, or `KEEP_CURRENT`.
- PR scope guard remains `unexpected=0`, `safeToRunBulkGitAdd=false`, `stage01ReadinessAvailable=true`, and `stage01PartialStagingVerdict=ready-for-partial-stage01-staging` while still blocking incomplete full release payloads. In a partial Stage 01 worktree, missing expected files must be reported through `missingExpectedIncludedFileDetails` as `clean-full-release-payload` when they exist on disk but are not dirty, and `stage01PartialScopeStatus` must stay `passed`.

## Non-Goals

- No automatic write to `src/data/sajikSeatData.ts`.
- No external crawling, web search, or third-party coordinate source.
- No `visualPath` rewrite from Stage 01 hitPath approval alone.
- No marker-only data model conversion in this stage.
