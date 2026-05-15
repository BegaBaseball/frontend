# Sajik Seatmap Stage 01 Handoff

## Scope

Stage 01은 사직 좌석도 `P0-A/P0-B/P0-C` 16개 구역의 operator-approved `hitPath` 후보를 production data에 반영하기 전 단계다. 이 문서는 승인 입력, operator input aid, prewrite, apply-ready, post-apply audit, operator status board, manual patch plan, real approval readiness, 수동 patch 적용, Stage 02 진입 조건을 고정한다.

- mapVersion: `BUSAN_SAJIK_2026_MANUAL_POLYGON_V2`
- coordinate system: `SVG viewBox 0 0 960 640`
- target rows: `021/022/031/032/121/122/123/124/125/131/132/133/134/135/142/143`
- source input: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json`
- operator input aid: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-aid.md`
- review board: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.md`
- entry sheet: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-entry-sheet.csv`
- review overlay: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.svg`
- patch preview: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite.patch-preview.ts`
- apply-ready report: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-apply-ready.md`
- post-apply audit: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-post-apply-audit.md`
- operator status board: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-status.md`
- manual patch plan: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-manual-patch-plan.md`
- real approval readiness: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-real-approval-readiness.md`
- approved dry-run: `reports/stadium/sajik-stage01-operator/dry-run/sajik-seatmap-stage01-approved-dry-run.md`

## Current State

- current status: `waiting-for-operator`
- approved rows: `0`
- patch preview rows: `0`
- production data changed: `false`
- production write allowed: `false`
- source data write performed: `false`
- operator input aid: `waiting-for-operator`, `pending=16`
- review board: `waiting-for-operator`, `pending=16`, `ready=0`, `invalid=0`
- post-apply audit status: `waiting-for-operator`
- operator status board: `waiting-for-operator`, `pending=16`
- manual patch plan: `waiting-for-operator`, `manualPatchRows=0`
- real approval readiness status: `waiting-for-operator`, `approved=0`, `manualPatchRows=0`, `sourceDataWritePerformed=false`
- smoke status: `passed`, `cases=13/13`
- approved dry-run status: `passed`, `target=021`, `manualPatchRows=1`, `readinessRow=APPROVED_NOT_APPLIED`, `sourceDataWritePerformed=false`
- operator package preservation: `passed`

## Approval Input Contract

An approved row must include all of the following fields.

- `operatorDecision=APPROVED`
- `correctedPath`
- `correctedLabelX`
- `correctedLabelY`
- `reviewer`
- `reviewedAt`

The package generator must preserve filled editable fields from an existing operator input file. The smoke fixture `operator-input-preservation` verifies that a regenerated package keeps `operatorDecision`, `correctedPath`, `correctedLabelX/Y`, `reviewer`, `reviewedAt`, and `operatorNote`.
The package report must expose `preservationStatus`, `existingEditableRows`, `preservedEditableRows`, and `ignoredExistingEditableRows`. If a filled editable row would be dropped, duplicated, or written outside the 16 Stage 01 section ids, package generation is blocked.
Allowed decisions are `PENDING`, `APPROVED`, `REJECTED`, `NEEDS_RETRACE`, and `KEEP_CURRENT`. Only `APPROVED` can enter patch preview; all other decisions are decision rows with no production patch preview.
The review board and entry sheet must expose `operatorDecisionOptions`, `approvedRequiredFields`, `keepCurrentRule`, and `patchPreviewEligible` so an operator can complete input without opening source code.

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
3. Use `sajik-seatmap-stage01-review-board.md`, `sajik-seatmap-stage01-entry-sheet.csv`, and `sajik-seatmap-stage01-review-board.svg` to decide which rows need operator entry.
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

## Manual Patch Checklist

For each approved section fragment:

- apply `imageGeometry.hitPath` from the approved `correctedPath`
- apply `imageGeometry.labelPoint` from `[correctedLabelX, correctedLabelY]`
- update legacy-compatible `labelX` and `labelY` to match `labelPoint`
- keep `imageGeometry.visualPath` unchanged unless a separate visual retrace approval exists
- keep `imageGeometry.geometryVersion='manual-polygon-v2'`
- keep `sectionKind`, `markerType`, `mapInteractionStatus`, `traceSource`, `traceMethod`, and `traceVersion` unchanged
- do not apply alias-only `011/903`
- do not apply accessibility marker rows through Stage 01 seat-section patching

## Source Edit Contract

- writable source fields: `imageGeometry.hitPath`, `imageGeometry.labelPoint`, `imageGeometry.labelX`, `imageGeometry.labelY`
- locked source fields: `imageGeometry.visualPath`, `imageGeometry.geometryVersion`, `sectionKind`, `markerType`, `mapInteractionStatus`, `traceSource`, `traceMethod`, `traceVersion`
- `manual patch plan` must expose `sourceEditChecklist`, `writableSourceFields`, and `lockedSourceFields` for each `MANUAL_PATCH_REQUIRED` row.
- If a row needs any field outside the writable list, it is not a Stage 01 hitPath patch and must be handled by a separate plan.

## Required Verification After Manual Patch

Run these commands after applying any Stage 01 data patch.

```bash
npm run stadium:sajik:stage01-operator-input-aid
npm run stadium:sajik:stage01-review-board
npm run stadium:sajik:stage01-prewrite
npm run stadium:sajik:stage01-apply-ready
npm run stadium:sajik:stage01-post-apply-audit -- --require-applied
npm run stadium:sajik:stage01-operator-status
npm run stadium:sajik:stage01-manual-patch-plan
npm run stadium:sajik:stage01-real-approval-readiness
npm run stadium:sajik:stage01-prewrite-smoke
npm run stadium:sajik:stage01-approved-dry-run
node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts
node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts
npm run qa:stadium:sajik:polygon-v2
```

The final gate must keep `productionDataChanged=false` for the Stage 01 helper scripts. Data changes are manual review patches, not script writes.

## Stage 02 Entry Conditions

Stage 02 can start only when all conditions below are true.

- Stage 01 approved rows have been either manually applied or explicitly left pending with an operator decision.
- `npm run qa:stadium:sajik:polygon-v2` passes.
- `npm run stadium:sajik:stage01-operator-input-aid` reports no `INVALID` rows.
- `npm run stadium:sajik:stage01-review-board` reports no `INVALID` rows and `blockers=0`.
- `npm run stadium:sajik:stage01-apply-ready` has `blockers=0`.
- `npm run stadium:sajik:stage01-post-apply-audit -- --require-applied` passes for applied Stage 01 rows.
- `npm run stadium:sajik:stage01-operator-status` reports no `INVALID` or `NOT_APPLIED` rows for applied Stage 01 rows.
- `npm run stadium:sajik:stage01-manual-patch-plan` reports `manualPatchRows=0` after applied Stage 01 rows.
- `npm run stadium:sajik:stage01-real-approval-readiness` reports no `APPROVED_BLOCKED` rows and keeps `sourceDataWritePerformed=false`.
- `npm run stadium:sajik:stage01-approved-dry-run` passes and still reports `sourceDataWritePerformed=false`.
- `P0-A/P0-B/P0-C` rows have no unresolved invalid approvals.
- Any unapplied Stage 01 rows are documented as `PENDING`, `REJECTED`, `NEEDS_RETRACE`, or `KEEP_CURRENT`.
- PR scope guard remains `unexpected=0` and `safeToRunBulkGitAdd=false`.

## Non-Goals

- No automatic write to `src/data/sajikSeatData.ts`.
- No external crawling, web search, or third-party coordinate source.
- No `visualPath` rewrite from Stage 01 hitPath approval alone.
- No marker-only data model conversion in this stage.
