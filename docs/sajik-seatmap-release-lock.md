# 사직 롯데 좌석도 release lock

검수 고정일: 2026-05-12 KST

## 기준

- 공식 asset: `src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png`
- 공식 이미지 좌표계: `960x640`
- stadium id: `BUSAN_SAJIK`
- map version: `BUSAN_SAJIK_2026_MANUAL_POLYGON_V2`
- SVG viewBox: `0 0 960 640`
- 공식 이미지 SHA-256: `e9cb51ccf57a754ddf066a95c6c789d65edf8dff167f432fd35fe809e9dc80aa`
- 기준 데이터: `SAJIK_SEATMAP_IMAGE`, `SAJIK_BLOCKS`, `SAJIK_OFFICIAL_TRACE_REFERENCE`, `SAJIK_TRACE_REVIEW_SUMMARY`
- trace source: `OFFICIAL_PNG_MANUAL_POLYGON`
- trace version: `manual-polygon-v2`
- trace method: `PATH_TRACED_FROM_OFFICIAL_IMAGE`
- geometry fields: `imageGeometry.d`는 기존 호환 필드로 유지하고, `visualPath`, `hitPath`, `labelPoint`, `geometryVersion`을 표준 필드로 함께 고정한다.
- pixel alignment: 공식 PNG 색상 블럭이 확인되는 블럭은 `PIXEL_ALIGNED`, 공식 PNG 독립 색상 블럭이 보이지 않는 운영 호환 블럭은 `OFFICIAL_PNG_BLOCK_NOT_VISIBLE`
- map interaction: 공식 PNG 색상 블럭이 확인되는 87개만 `MAP_SELECTABLE`, `011/903`은 `ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE`
- runtime render layers: 일반 seat path 84개, accessibility marker 3개, alias-only rendered 0개를 고정한다.
- runtime renderer는 `imageGeometry.d` fallback을 사용하지 않는다. `imageGeometry.d`는 compatibility/reference 필드로만 유지하고 `<path d>`는 명시 `hitPath`가 있는 일반 좌석에만 사용한다.
- JSON dataset export: `SAJIK_BLOCKS`를 source of truth로 유지하고 `src/data/sajikSeatMapDataset.ts`/`scripts/sajik-seatmap-export-dataset.mjs`에서 editor/export용 `sections`와 `markers`를 생성한다.
- editor v1.7: `/internal/sajik-seatmap-editor`는 `import.meta.env.DEV`로 제한된 내부 route이며 production navigation에 노출하지 않는다. 선택 section의 in-memory vertex/labelPoint draft, drag, step nudge, vertex add/delete, dirty tracking, current/all reset을 지원한다.
- patch export v1.7: editor는 선택 section의 `SAJIK_SECTION_GEOMETRY_PATCH_PREVIEW` payload를 보여준다. 초기 상태에서는 `after === before`이고, vertex/labelPoint draft나 topology edit이 생기면 `after`가 draft geometry로 갱신된다. `sectionKind`/`markerType` 메타데이터를 포함하며 파일 자동수정은 하지 않는다. validation이 FAIL이면 JSON/TS copy/export 버튼은 비활성화해야 한다.
- editor v1.8 roadmap: `docs/sajik-seatmap-editor-v18-roadmap.md`는 후속 구현 범위만 정의한다. 이번 release lock은 editor v1.8 구현, 파일 write, production route 노출을 포함하지 않는다.
- hitPath expansion candidates: `012/013/021/022/023/031/032/033/041/044/121/122/123/124/125/131/132/133/134/135/142/143`은 모바일 터치 편의를 위한 후속 확장 후보로 표시한다. 이번 release lock에서는 승인된 별도 확장 좌표가 없으므로 `hitPath === visualPath`를 유지한다.

## 고정 상태

- `SAJIK_BLOCKS.length === 89`
- `totalBlocks=89`
- `p0Blocks=39`
- `p1Blocks=16`
- `p2Blocks=34`
- `officialImageTraced=89`
- `needsOperatorReview=0`
- `directOfficialTrace=89`
- `officialPngManualPolygon=89`
- `manualPolygonV2=89`
- `manualReviewed=89`
- `unreviewedBlocks=0`
- `pixelAligned=87`
- `manualReviewRequired=2`
- `mapSelectable=87`
- `seatSectionRenderedPaths=84`
- `accessibilityMarkersRendered=3`
- `aliasOnlyRendered=0`
- `aliasOnlyOfficialPngBlockNotVisible=2`
- `officialPngBlockNotVisible=2`
- `alignmentLockedVerified=87`
- `alignmentFailures=0`
- `thinOutsideFailures=0`
- `refinedPolygons=83`
- `labelTopHitFailures=0`
- `selfIntersections=0`
- `singleClosedPathViolations=0`
- `mobileZoomControlInterceptFailures=0`

## 기준 anchor

- P0 대표 anchor: `111`, `313`, `723`, `021`
- 접근성 anchor: `휠체어석-3루`, `휠체어석-중앙`, `휠체어석-1루`
- 중앙/테이블 anchor: `011`, `012`, `013`, `021`, `022`, `023`, `024`, `031`, `032`, `033`, `034`, `044`
- 겹침 민감 anchor pair: `311/321`, `112/121`, `132/142`, `914/922`
- 모바일 obstruction anchor: `723`

`723`은 모바일 390 viewport에서 zoom control 배경이 path 중심 클릭을 가로채지 않아야 한다. zoom 버튼 자체는 클릭 가능해야 하며, control wrapper만 `pointer-events-none`, 버튼은 `pointer-events-auto` 상태를 유지한다.

## 공식 PNG 미표시 예외

- 예외 블럭: `011`, `903`
- 두 블럭은 기존 운영 데이터 호환용 block/search/alias 데이터로 유지한다.
- 공식 PNG에서 독립 좌석 색상 블럭이 확인되지 않으므로 `PIXEL_ALIGNED`를 부여하지 않는다.
- `SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS`와 `SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS`는 `011`, `903`만 포함해야 한다.
- `SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS`는 `011`, `903`만 포함해야 한다.
- `011`, `903`은 SVG hit-area로 렌더링하지 않으며 지도 클릭/hover/popup 대상에서 제외한다.
- 브라우저 label-coordinate QA는 `84 seat paths + 3 accessibility markers = 87` selectable target을 검증하고, 이전 `011` 좌표 클릭이 `011` 상세 패널을 열지 않아야 한다.
- 새 공식 PNG 또는 운영자 승인 좌표가 제공되면 두 블럭을 재트레이싱하고 `89 LOCKED_VERIFIED` 목표로 release lock을 갱신한다.

## 기준 산출물

- Alignment audit JSON: `reports/stadium/sajik-seatmap-alignment-audit.json`
- Alignment audit CSV: `reports/stadium/sajik-seatmap-alignment-audit.csv`
- Alignment audit summary: `reports/stadium/sajik-seatmap-alignment-audit.md`
- Alignment audit SVG: `reports/stadium/sajik-seatmap-alignment-audit.svg`
- Trace manifest JSON: `reports/stadium/sajik-seatmap-trace-review.json`
- Trace manifest CSV: `reports/stadium/sajik-seatmap-trace-review.csv`
- Trace summary: `reports/stadium/sajik-seatmap-trace-review.md`
- Dataset export JSON: `reports/stadium/sajik-seatmap-dataset.json`
- hitPath candidate review JSON: `reports/stadium/sajik-seatmap-hitpath-candidate-review.json`
- hitPath candidate review summary: `reports/stadium/sajik-seatmap-hitpath-candidate-review.md`
- Zone precision workset JSON: `reports/stadium/sajik-seatmap-zone-precision-worksets.json`
- Zone precision workset summary: `reports/stadium/sajik-seatmap-zone-precision-worksets.md`
- Zone precision workset SVG: `reports/stadium/sajik-seatmap-zone-precision-worksets.svg`
- Stage 01 operator input JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json`
- Stage 01 operator package summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-package.md`
- Stage 01 operator checklist: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-checklist.md`
- Stage 01 operator input aid JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-aid.json`
- Stage 01 operator input aid CSV: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-aid.csv`
- Stage 01 operator input aid summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-aid.md`
- Stage 01 review board JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.json`
- Stage 01 review board CSV: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.csv`
- Stage 01 review board summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.md`
- Stage 01 entry sheet CSV: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-entry-sheet.csv`
- Stage 01 entry sheet summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-entry-sheet.md`
- Stage 01 review board overlay: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.svg`
- Stage 01 prewrite gate: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite.md`
- Stage 01 patch preview: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite.patch-preview.ts`
- Stage 01 apply-ready JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-apply-ready.json`
- Stage 01 apply-ready summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-apply-ready.md`
- Stage 01 post-apply audit JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-post-apply-audit.json`
- Stage 01 post-apply audit summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-post-apply-audit.md`
- Stage 01 operator status JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-status.json`
- Stage 01 operator status CSV: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-status.csv`
- Stage 01 operator status summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-status.md`
- Stage 01 manual patch plan JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-manual-patch-plan.json`
- Stage 01 manual patch plan CSV: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-manual-patch-plan.csv`
- Stage 01 manual patch plan summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-manual-patch-plan.md`
- Stage 01 real approval readiness JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-real-approval-readiness.json`
- Stage 01 real approval readiness CSV: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-real-approval-readiness.csv`
- Stage 01 real approval readiness summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-real-approval-readiness.md`
- Stage 01 prewrite smoke JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite-smoke.json`
- Stage 01 prewrite smoke summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite-smoke.md`
- Stage 01 approved dry-run JSON: `reports/stadium/sajik-stage01-operator/dry-run/sajik-seatmap-stage01-approved-dry-run.json`
- Stage 01 approved dry-run summary: `reports/stadium/sajik-stage01-operator/dry-run/sajik-seatmap-stage01-approved-dry-run.md`
- Stage 01 handoff: `docs/sajik-seatmap-stage01-handoff.md`
- marker transition review JSON: `reports/stadium/sajik-seatmap-marker-transition-review.json`
- marker transition review summary: `reports/stadium/sajik-seatmap-marker-transition-review.md`
- Editor regression JSON: `reports/stadium/sajik-seatmap-editor-regression.json`
- Editor regression summary: `reports/stadium/sajik-seatmap-editor-regression.md`
- PR scope guard JSON: `reports/stadium/sajik-seatmap-pr-scope-guard.json`
- PR scope guard summary: `reports/stadium/sajik-seatmap-pr-scope-guard.md`
- Evidence report JSON: `reports/stadium/sajik-seatmap-evidence-crops.json`
- Evidence summary: `reports/stadium/sajik-seatmap-evidence-crops.md`
- Evidence contact sheet: `reports/stadium/sajik-seatmap-evidence-contact-sheet.png`
- P0 evidence: `reports/stadium/sajik-seatmap-evidence-p0.png`
- P1 evidence: `reports/stadium/sajik-seatmap-evidence-p1.png`
- P2 evidence: `reports/stadium/sajik-seatmap-evidence-p2.png`
- P0 thin-first-base evidence: `reports/stadium/sajik-seatmap-evidence-p0-thin-first-base.png`
- P0 143 boundary lock evidence: `reports/stadium/sajik-seatmap-evidence-p0-143-boundary-lock.png`
- P0 132/142/143 seam evidence: `reports/stadium/sajik-seatmap-evidence-p0-132-142-143-seams.png`
- P0 123/133/143 seam evidence: `reports/stadium/sajik-seatmap-evidence-p0-123-133-143-seams.png`
- P0 retraced 3b upper evidence: `reports/stadium/sajik-seatmap-evidence-p0-retraced-3b-upper.png`
- P0 central lower 011 review evidence: `reports/stadium/sajik-seatmap-evidence-p0-central-lower-011-review.png`
- P0 011 alias-only no-hit-area evidence: `reports/stadium/sajik-seatmap-evidence-p0-011-alias-only-no-hit-area.png`
- P1 everytime review evidence: `reports/stadium/sajik-seatmap-evidence-p1-retraced-everytime.png`
- Advisory Playwright summary: `reports/stadium/sajik-seatmap-advisory-playwright-review.md`
- Advisory Playwright full screenshot: `../output/playwright/sajik-seatmap-advisory-review/sajik-advisory-playwright-full.png`
- Browser QA summary: `../output/playwright/stadium-ux-sajik-validate/stadium-mobile-smoke-summary.md`
- Browser QA screenshots:
  - `../output/playwright/stadium-ux-sajik-validate/mobile-390.png`
  - `../output/playwright/stadium-ux-sajik-validate/desktop-1440.png`
  - `../output/playwright/stadium-ux-sajik-validate/sajik-debug-overlay-1440x1000.png`

## 최신 검증 실행

검증 시각: 2026-05-15 22:22:18 KST

- `npm run qa:stadium:sajik:trace-review`: PASS
  - evidence 재생성 PASS
  - advisory Playwright review PASS, `advisory=2`, `panels=2`
  - isolated Sajik browser QA PASS, `status:passed`
  - 최종 alignment audit PASS, `total=89 mapSelectable=87 aliasOnlyNotVisible=2 locked=87 notVisible=2 retrace=0 officialFailures=0 thinOutsideFailures=0`
- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts`: PASS, `24/24`
- `node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts`: PASS, focused StadiumGuide Sajik contract
- `npm run stadium:sajik:dataset-export -- --check`: PASS, `sections=89 enabled=87 aliasOnly=2 markers=3`
- `npm run stadium:sajik:hitpath-review`: PASS, `candidates=22`, `p0=16`, `p1=5`, `p2=1`, `aliasOnly=2`, `visualEqualsHit=22`, `expanded=0`, `blockers=0`
- `npm run stadium:sajik:zone-precision-worksets`: PASS, `status=waiting-for-operator`, `candidates=22`, `p0=16`, `p1=5`, `p2=1`, `guards=3`, `expanded=0`, `blockers=0`
- `npm run stadium:sajik:stage01-operator-package`: PASS, `status=waiting-for-operator`, `rows=16`, `approved=0`, `preserved=0`, `preservation=no-existing-input`, `blockers=0`
- `npm run stadium:sajik:stage01-operator-input-aid`: PASS, `status=waiting-for-operator`, `ready=0`, `approved=0`, `pending=16`, `rejected=0`, `needsRetrace=0`, `keepCurrent=0`, `invalid=0`, `blockers=0`, pending `nextAction=FILL_OR_DECIDE`
- `npm run stadium:sajik:stage01-review-board`: PASS, `status=waiting-for-operator`, `rows=16`, `pending=16`, `ready=0`, `invalid=0`, `blockers=0`, `sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-prewrite`: PASS, `status=waiting-for-operator`, `rows=16`, `approved=0`, `valid=0`, `patchPreview=0`, `blockers=0`
- `npm run stadium:sajik:stage01-apply-ready`: PASS, `status=waiting-for-operator`, `approved=0`, `patchPreview=0`, `productionDataChanged=false`
- `npm run stadium:sajik:stage01-post-apply-audit`: PASS, `status=waiting-for-operator`, `approvedPatchPayloads=0`, `applied=0`, `unapplied=0`, `readOnly=true`
- `npm run stadium:sajik:stage01-operator-status`: PASS, `status=waiting-for-operator`, `approved=0`, `applied=0`, `notApplied=0`, `pending=16`, `invalid=0`, `blockers=0`
- `npm run stadium:sajik:stage01-manual-patch-plan`: PASS, `status=waiting-for-operator`, `manualPatchRows=0`, `approved=0`, `applied=0`, `notApplied=0`, `blockers=0`
- `npm run stadium:sajik:stage01-real-approval-readiness`: PASS, `status=waiting-for-operator`, `approved=0`, `ready=0`, `notApplied=0`, `applied=0`, `blocked=0`, `manualPatchRows=0`, `sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-prewrite-smoke`: PASS, `cases=12/12`, `operatorPackagePreservationPassed=true`, `preservationStatus=preserved`, `productionDataChanged=false`, `approved-with-delta` fixture rowStatus `NOT_APPLIED`, readiness `APPROVED_NOT_APPLIED`, `approved-no-delta` readiness `APPROVED_APPLIED`, input aid action `RUN_PREWRITE`, manual patch plan action `MANUAL_PATCH_REQUIRED`, decision row fixture `REJECTED/NEEDS_RETRACE/KEEP_CURRENT`, invalid path/label/unknown section fixtures blocked, tampered readiness fixtures block `VISUAL_PATH_CHANGED_WITHOUT_APPROVAL` and `TARGET_SOURCE_FILE_MISMATCH`
- `npm run stadium:sajik:stage01-approved-dry-run`: PASS, `target=021`, `prewrite=ready-for-data-patch`, `applyReady=ready-for-manual-apply`, `postApply=not-applied`, `readiness=ready-for-manual-apply`, `readinessRow=APPROVED_NOT_APPLIED`, `manualPatchRows=1`, `sourceDataWritePerformed=false`, `productionWriteAllowed=false`
- `npm run stadium:sajik:marker-transition-review`: PASS, `markers=3`, `sections=3`, `seatPaths=84`, `markerLayer=3`, `aliasRendered=0`, `positionLocks=3`, `selectableCompat=3`, `markerOnlyApplied=false`, `blockers=0`
- `npm run stadium:sajik:editor-regression`: PASS, editor v1.7 browser regression `status:passed checks=11`
- `npm run stadium:sajik:pr-scope-guard`: PASS, `status:passed`, `included=37`, `separate=143`, `unexpected=0`, `blockers=0`, patch separation `review-required`, `safeToRunBulkGitAdd=false`
- `npm run qa:stadium:sajik:polygon-v2`: PASS, local build env `VITE_SITE_URL=http://127.0.0.1:5176`, `VITE_API_BASE_URL=/api`, dataset/export/alignment/evidence/hitPath review/Stage 01 operator-input-aid/review-board/prewrite/apply-ready/post-apply/operator-status/manual-patch-plan/readiness/smoke/approved dry-run/marker transition review/Sajik-focused node tests/editor regression/scope guard/build 통합 게이트
- `npm run build`: PASS
- `git diff --check`: PASS
- `SAJIK_SEATMAP_IMAGE`의 `mapVersion`, `viewBox`, `imageSha256` 고정값과 현재 공식 PNG SHA-256 일치 확인.
- `visualPath`, `hitPath`, `labelPoint`, `geometryVersion`, `markerType`, `sectionKind` 표준 필드 검증 PASS.
- SVG 렌더링은 공식 PNG를 같은 `viewBox` 안의 `<image>`로 렌더링하고, hit-area는 `hitPath`를 사용한다.
- JSON dataset export check는 `sections=89`, `enabled=87`, `aliasOnly=2`, `markers=3`을 유지한다.
- hitPath candidate review는 후보 `22`개를 `P0=16`, `P1=5`, `P2=1`로 분리하고, 현재 기준에서 승인된 확장 좌표가 없으므로 `expanded=0`, `visualEqualsHit=22`를 유지한다.
- zone precision workset은 `P0-A/P0-B/P0-C/P1-A/P1-B/P2-A` 순서로 후보 22개와 regression guard `723/914/922` 3개를 고정하고 `productionWriteAllowed=false`를 유지한다.
- Stage 01 operator package는 `P0-A/P0-B/P0-C` 16개만 operator input으로 내보내며, 기존 입력이 있으면 editable field를 보존한다. 보존 실패, duplicate editable row, Stage 01 밖 editable row는 `OPERATOR_INPUT_PRESERVATION_FAILED`, `DUPLICATE_EXISTING_OPERATOR_INPUT`, `OPERATOR_INPUT_OUTSIDE_STAGE01`로 차단한다.
- Stage 01 operator input aid는 `APPROVED` row의 필수 editable field, 날짜, 좌표/path 기본 오류를 prewrite 전에 read-only로 표시해야 한다. 각 row는 `action`과 `nextAction`을 가져야 하며 `READY_FOR_PREWRITE` row만 `RUN_PREWRITE`로 prewrite patch preview에 진입한다. `KEEP_CURRENT`는 현재 production geometry를 유지하는 decision row이며 patch preview를 만들지 않는다.
- Stage 01 review board는 operator package와 input aid를 합쳐 review board, entry sheet, overlay SVG를 생성해야 한다. 이 산출물은 입력 보조 전용이며 좌표 추정, hitPath 확장, source data write를 수행하지 않는다. Entry sheet는 `operatorDecisionOptions`, `approvedRequiredFields`, `keepCurrentRule`, `patchPreviewEligible`를 노출해야 한다.
- Stage 01 prewrite gate는 승인 row가 없으면 `waiting-for-operator`로 통과하고, 승인 row가 있으면 `correctedPath`를 `hitPath` patch preview로만 검증한다. production data write는 수행하지 않는다. Prewrite markdown/report는 `Patch Preview Review`, `visualPathLocked`, `pointCountDelta`, `areaDelta`, `boundsDelta`, `labelPointDelta`를 포함해야 한다.
- Stage 01 apply-ready gate는 prewrite 산출물과 patch preview를 다시 읽어 수동 data patch 후보만 검증한다. `ready-for-manual-apply`는 파일 write가 아니라 review-ready 상태이며 `sourceDataWritePerformed=false`를 유지한다.
- Stage 01 post-apply audit는 prewrite patch payload와 현재 production dataset을 비교하는 read-only 검증이다. 승인 좌표가 아직 수동 반영되지 않았으면 `not-applied`, 승인 row가 없으면 `waiting-for-operator`, 수동 반영이 끝나면 `applied`여야 한다.
- Stage 01 operator status board는 operator input, prewrite, apply-ready, post-apply audit를 합쳐 rowStatus `PENDING/REJECTED/NEEDS_RETRACE/KEEP_CURRENT/INVALID/APPLIED/NOT_APPLIED`와 manual patch checklist를 생성해야 한다.
- Stage 01 manual patch plan은 operator status의 `NOT_APPLIED` row만 `MANUAL_PATCH_REQUIRED` 대상으로 정리하고, `src/data/sajikSeatData.ts`에 반영할 current/approved geometry diff와 TS fragment를 read-only 산출물로 생성해야 한다. `writableSourceFields`는 `imageGeometry.hitPath`, `imageGeometry.labelPoint`, `imageGeometry.labelX`, `imageGeometry.labelY`로 제한하고, `lockedSourceFields`에는 `imageGeometry.visualPath`, `sectionKind`, `markerType`, `mapInteractionStatus`, trace metadata를 포함해야 한다.
- Stage 01 real approval readiness gate는 실제 operator input 승인 row만 대상으로 `APPROVED_READY`, `APPROVED_NOT_APPLIED`, `APPROVED_APPLIED`, `APPROVED_BLOCKED` 상태를 산출해야 한다. 이 gate는 `sourceDataWritePerformed=false`, `productionWriteAllowed=false`, `productionDataChanged=false`를 유지하고 `visualPath`, `sectionKind`, `markerType`, `mapInteractionStatus`, trace metadata 변경을 차단해야 한다.
- Stage 01 prewrite smoke는 pending-only, 승인 no-delta, 승인 with-delta, invalid approval 차단, invalid path/label 차단, unknown section 차단, alias/marker write 차단, rejected/needs-retrace/keep-current decision row, mixed approved/decision/pending row, visualPath tamper, target source tamper, operator input editable field 보존을 fixture로 검증하며 production data write는 수행하지 않는다.
- Stage 01 approved dry-run은 `021` 1개 approved fixture로 `ready-for-data-patch -> ready-for-manual-apply -> not-applied -> MANUAL_PATCH_REQUIRED -> APPROVED_NOT_APPLIED` 상태 전이를 검증하며 source data write를 수행하지 않는다.
- marker transition review는 휠체어석 marker/section `3/3`, marker position/labelPoint lock `3`, selectable compatibility `3`, `markerOnlyApplied=false`를 유지한다.
- Runtime layer split은 일반 seat path 84개, accessibility marker 3개, alias-only rendered 0개를 유지한다.
- 일반 seat path layer는 `sectionKind=SEAT_SECTION` 84개만 `<path>`로 렌더링한다.
- 접근성 marker layer는 `sectionKind=ACCESSIBILITY_MARKER` 3개를 실제 polygon `<path>` hit-area로 렌더링한다.
- runtime renderer는 `imageGeometry.d` fallback을 사용하지 않는다.
- Editor v1.7 SSR 계약은 공식 이미지, `viewBox=0 0 960 640`, section overlay, marker overlay, vertex handles, labelPoint handle mode, vertex add/delete controls, dirty summary, validator PASS, JSON/TS copy preview를 렌더링한다.
- Editor v1.7 patch preview는 `mapVersion`, `sectionId`, `sectionKind`, `markerType`, `before`, `after`, `validation.status=PASS`를 포함한다.
- Editor v1.7 browser regression은 대표 section nudge/reset, vertex add/delete, vertex drag, validation FAIL export lock, labelPoint edit mode, hit-candidate filter, wheelchair marker export, alias-only export 계약을 검증한다.
- PR scope guard는 mixed worktree에서 사직 PR 포함 파일, 별도 작업 파일, 부분 staging 필요 파일을 report로 고정하며 git staging을 수행하지 않는다.
- PR scope guard report는 `stagingManifest`를 포함해야 하며 `releasePayloadFileCount=37`, `doesNotRunGitAdd=true`, `safeToRunBulkGitAdd=false`, `requiresManualHunkReview=true`를 고정해야 한다.
- `qa:stadium:sajik:polygon-v2`는 dataset export check, alignment audit, evidence, hitPath review, Stage 01 operator-input-aid/review-board/prewrite/apply-ready/post-apply/operator-status/manual-patch-plan/readiness/smoke/approved dry-run, marker transition review, 사직 focused node tests, editor regression, scope guard, build를 한 번에 실행하는 release gate다.
- P0 `143` boundary-lock evidence에서 `143` overlay는 공식 파란 블럭 후보 경계 안에 잠기며 흰 여백/어두운 배경으로 내려가지 않는다.
- P0 seam evidence는 `132/142/143`, `123/133/143` 인접 polygon의 vertex intrusion 및 edge crossing/overlap이 없음을 고정한다.
- P0 `011` alias-only no-hit-area evidence에서 `011`은 alias-only dashed 영역으로만 기록되며 SVG hit-area와 지도 popup 대상에서 제외된다.

## 운영 규칙

- 공식 PNG natural size는 `960x640`이어야 한다.
- 모든 운영 polygon은 `M/L/Z` 단일 폐합 path여야 한다.
- 모든 운영 polygon은 `src/utils/seatMapPolygonValidator.ts`의 공통 validator로 최소 점 개수, 좌표 범위, 면적, self-intersection, label 위치를 검증해야 한다.
- 모든 `hitPath`는 같은 section의 `visualPath` 면적 대비 75% 이상이어야 한다. 더 작은 hit-area는 `HIT_POLYGON_TOO_SMALL`로 차단한다.
- hitPath 확장 후보는 `reports/stadium/sajik-seatmap-hitpath-candidate-review.{json,md}`와 `SAJIK_HITPATH_EXPANSION_CANDIDATE_SECTION_IDS`가 일치해야 한다.
- 구역별 정밀화 workset은 `reports/stadium/sajik-seatmap-zone-precision-worksets.{json,md,svg}`를 생성해야 하며, 후보 22개와 guard 3개를 source-of-truth가 아닌 운영자 검수용으로만 기록해야 한다.
- Stage 01 operator package는 `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.{json,csv}`와 checklist를 생성해야 하며, `P0-A/P0-B/P0-C` 16개 외 section은 포함하지 않아야 한다.
- Stage 01 operator input aid는 `READY_FOR_PREWRITE`, `REJECTED`, `NEEDS_RETRACE`, `KEEP_CURRENT`, `INVALID`, `PENDING` rowStatus와 누락 필드/경고를 생성해야 하며 source data를 쓰지 않는다.
- Stage 01 review board는 `sajik-seatmap-stage01-review-board.{json,csv,md,svg}`와 `sajik-seatmap-stage01-entry-sheet.{csv,md}`를 생성해야 하며 source data를 쓰지 않는다. Review board는 `Status Counts`, `Invalid Rows First`, `patchPreviewEligible`을 표시해야 한다.
- Stage 01 prewrite gate는 `operatorDecision=APPROVED` row만 patch preview 대상으로 삼고, alias-only/marker row, invalid path, label outside, self-intersection, top-hit 회귀를 차단해야 한다. Patch preview review는 before/after hitPath point count, area, bounds, labelPoint delta와 `visualPathLocked=true` 여부를 보여줘야 한다.
- Stage 01 apply-ready gate는 prewrite가 `ready-for-data-patch`일 때만 `ready-for-manual-apply`가 될 수 있고, 모든 patch payload가 `SEAT_SECTION`, validation `PASS`, `visualPath` locked, current dataset before snapshot 일치 조건을 통과해야 한다.
- Stage 01 apply-ready report는 `pointCountBefore/After`, `areaBefore/After`, `boundsBefore/After`, `labelPointDelta`를 포함하는 diff summary를 생성해야 한다.
- Stage 01 post-apply audit는 `hitPath`, `labelPoint`, legacy `labelX/labelY`, `visualPath` lock, `sectionKind`, `markerType`, `mapInteractionStatus`를 read-only로 비교해야 한다.
- Stage 01 operator status board는 `APPROVED` row가 valid지만 production data에 아직 반영되지 않았을 때 summary `ready-for-manual-apply`와 rowStatus `NOT_APPLIED`를 보고해야 한다.
- Stage 01 manual patch plan은 `Source Edit Contract`, `sourceEditChecklist`, `writableSourceFields`, `lockedSourceFields`를 포함해야 하며 Stage 01에서 수정 가능한 source field를 명확히 제한해야 한다.
- Stage 01 real approval readiness는 실제 승인 row를 기준으로 manual patch readiness를 검증해야 하며, source write 금지와 locked field 보존 계약을 위반하면 release gate를 실패시켜야 한다.
- Stage 01 prewrite smoke는 `pending-only`, `approved-no-delta`, `approved-with-delta`, `invalid-approved-row`, `invalid-path-row`, `invalid-label-row`, `unknown-section-row`, `forbidden-alias-marker-row`, `decision-rows`, `mixed-approved-decision-pending`, `tampered-visual-path-readiness`, `tampered-target-source-readiness`, `operator-input-preservation` fixture를 모두 통과해야 하며, `productionDataChanged=false`를 유지해야 한다.
- Stage 01 approved dry-run은 `sourceDataWritePerformed=false`, `productionWriteAllowed=false`, `productionDataChanged=false`, `manualPatchRows=1`, `readinessRow=APPROVED_NOT_APPLIED`를 유지해야 한다.
- Stage 01 handoff 문서는 approval input contract, manual patch checklist, Stage 02 entry conditions를 고정해야 한다.
- 좌표는 공식 PNG 좌표계 기준이며, 새 좌표는 소수 1자리 px 정밀도 안에서 관리한다.
- `visualPath`는 공식 이미지 경계 기준 polygon, `hitPath`는 클릭/터치 hit-area polygon이다. 현재 사직 v2+ 기준에서는 승인된 별도 확장 hit-area가 없으므로 모든 `hitPath`가 `visualPath`와 동일해야 한다.
- `labelPoint`는 기존 `labelX/labelY`와 같은 좌표를 유지해야 한다.
- 휠체어석 3개 항목은 기존 선택 동작을 유지하되 `markerType=WHEELCHAIR`, `sectionKind=ACCESSIBILITY_MARKER` 메타데이터를 가져야 한다.
- 일반 seat path layer는 `sectionKind=SEAT_SECTION` 84개만 `<path>`로 렌더링한다.
- 접근성 marker layer는 `sectionKind=ACCESSIBILITY_MARKER` 3개를 실제 polygon `<path>` hit-area로 렌더링하고 click/Enter/Space 선택은 기존 상세 패널 흐름을 유지한다.
- runtime renderer는 `imageGeometry.d` fallback을 사용하지 않는다.
- `011/903`은 `sectionKind=ALIAS_ONLY`이며 SVG hit-area로 렌더링하지 않는다.
- `buildSajikSeatMapDataset()`의 `sections`는 89개 block/alias를 모두 포함하고, `enabled=false`인 alias-only section은 `011/903` 두 개뿐이어야 한다.
- `buildSajikSeatMapDataset()`의 `markers`는 현재 `markerType=WHEELCHAIR` 3개를 `relatedSectionId`로 연결해야 하며, production UI marker-only 렌더링은 후속 PR에서 분리한다.
- marker transition review는 `reports/stadium/sajik-seatmap-marker-transition-review.{json,md}`를 생성해야 하며, marker `position`은 관련 section의 `labelPoint`와 같아야 한다.
- Editor v1.7은 파일 쓰기를 하지 않는 내부 도구로 유지한다. TS patch write, production 사용자 route 노출은 후속 PR 범위다.
- Editor v1.8 구현은 이번 release lock에 포함하지 않는다. before/after diff preview 강화, validator issue 상세 panel, hitPath batch navigation, marker transition view는 후속 PR 범위다.
- Editor v1.7 patch payload는 선택 section의 `visualPath`, `hitPath`, `labelPoint`, polygon points를 `before`/`after`에 모두 담는다. 사용자 조작 전에는 두 값이 같아야 하며, vertex/labelPoint drag, nudge, add/delete 이후에는 `after`만 draft geometry로 달라져야 한다.
- Editor v1.7 vertex delete는 3점 미만 polygon을 만들 수 없어야 하며, visualPath topology edit은 sync 설정이 켜져 있고 visual/hit point count가 같을 때 hitPath에도 반영된다.
- Editor v1.7 copy/export는 validation PASS 상태에서만 가능해야 하고, FAIL 상태에서는 export lock을 표시해야 한다.
- PR scope guard는 `doesNotRunGitAdd=true`, `safeToRunBulkGitAdd=false` 상태를 유지해야 하며, `package.json`, `src/components/StadiumGuideRuntimeSeatMaps.test.ts`, `scripts/stadium-ux-audit.mjs`, `src/components/AppRoutes.tsx`를 부분 staging review 대상으로 표시해야 한다.
- PR scope guard의 `stagingManifest`는 whole-file review 대상, partial hunk review 대상, excluded artifacts, forbidden staging commands, staging 후 verification commands를 Markdown/JSON report에 함께 기록해야 한다.
- PR scope guard는 공통 seatmap shell migration, 비사직 구장 UI, `src/components/sajik/SajikSeatMap.tsx` first-visit/runtime UX 변경을 사직 polygon v2 release-lock PR 외부 작업으로 분류해야 한다.
- PR scope guard는 `.gitignore` 변경을 공유 repo config 작업으로 분류하고 사직 polygon v2 release-lock PR 외부에 둬야 한다.
- PR scope guard는 `.env.production`과 비사직 `reports/*` 변경을 환경/재생성 산출물로 분류하고 사직 polygon v2 release-lock PR 외부에 둬야 한다.
- 검색 입력은 첫 번째 matching section을 선택해야 하며, section 리스트는 `enabled`, `alias-only`, `wheelchair` 상태를 표시해야 한다.
- self-intersection은 허용하지 않는다.
- `labelX/labelY`는 자기 polygon 내부 또는 경계 1px 이내에 있어야 한다.
- `MAP_SELECTABLE` 블럭의 label 좌표 클릭은 렌더 순서상 자기 block을 최상위 hit-area로 가져야 한다.
- `132/142/143`, `123/133/143` 주변 polygon은 서로 vertex intrusion, edge crossing, edge overlap을 만들면 안 된다.
- `OFFICIAL_PNG_BLOCK_NOT_VISIBLE` 예외 블럭은 클릭 정합 release gate와 SVG hit-area 렌더링에서 제외하되, 운영 호환 alias는 유지해야 한다.
- 1루 얇은 블럭군 `121/122/123/124/125/131/132/133/134/135/142/143`은 일반 inside/coverage 기준에 더해 dilated component outside leakage와 max outside distance 기준을 통과해야 한다.
- UI 렌더링, hover, click, zoom/pan은 기존 `SajikSeatMapSvg` 선택 동작을 유지하되, 일반 좌석 path layer와 accessibility marker layer를 분리한다.
- 백엔드 API 계약은 변경하지 않는다.
- 블록 id, category, search alias, 접근성 휠체어석 3개 항목은 유지한다.
- 외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사는 사용하지 않는다.
- 공식 asset이 바뀌었거나 승인된 기준 파일이 없으면 `MANUAL_BASEBALL_DATA_REQUIRED` 계약으로 전환하고 operator 제공 파일을 요청한다.
- 좌표 변경이 발생하면 trace manifest, evidence contact sheet, isolated browser QA를 다시 생성한다.

## 릴리즈 게이트

```bash
npm run stadium:sajik:alignment-audit
npm run stadium:sajik:evidence
npm run stadium:sajik:dataset-export -- --check
npm run stadium:sajik:hitpath-review
npm run stadium:sajik:zone-precision-worksets
npm run stadium:sajik:stage01-operator-input-aid
npm run stadium:sajik:stage01-review-board
npm run stadium:sajik:stage01-prewrite
npm run stadium:sajik:stage01-apply-ready
npm run stadium:sajik:stage01-post-apply-audit
npm run stadium:sajik:stage01-operator-status
npm run stadium:sajik:stage01-manual-patch-plan
npm run stadium:sajik:stage01-real-approval-readiness
npm run stadium:sajik:stage01-prewrite-smoke
npm run stadium:sajik:stage01-approved-dry-run
npm run stadium:sajik:marker-transition-review
node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts
node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts
npm run qa:stadium:sajik:trace-review
npm run stadium:sajik:editor-regression
npm run stadium:sajik:pr-scope-guard
npm run qa:stadium:sajik:polygon-v2
npm run build
```

릴리즈 차단 조건:

- `SAJIK_BLOCKS.length`가 `89`가 아니다.
- `SAJIK_SEATMAP_IMAGE.mapVersion`, `viewBox`, `imageSha256` 중 하나라도 release lock 기준과 다르다.
- `p0Blocks=39`, `p1Blocks=16`, `p2Blocks=34`가 유지되지 않는다.
- `officialImageTraced`, `directOfficialTrace`, `officialPngManualPolygon`, `manualPolygonV2`, `manualReviewed` 중 하나라도 `89`가 아니다.
- `visualPath`, `hitPath`, `labelPoint`, `geometryVersion` 표준 필드가 누락되거나 기존 `imageGeometry.d`, `labelX/labelY`, `manual-polygon-v2`와 불일치한다.
- `pixelAligned=87`, `manualReviewRequired=2`, `mapSelectable=87`, `aliasOnlyOfficialPngBlockNotVisible=2`, `officialPngBlockNotVisible=2`, `alignmentLockedVerified=87`, `alignmentFailures=0`, `thinOutsideFailures=0`이 유지되지 않는다.
- 일반 seat path layer가 `sectionKind=SEAT_SECTION` 84개 외 항목을 `<path>`로 렌더링한다.
- accessibility marker layer가 `sectionKind=ACCESSIBILITY_MARKER` 3개를 marker로 렌더링하지 않는다.
- alias-only rendered count가 `0`이 아니다.
- runtime renderer가 `imageGeometry.d`를 `visualPath` 또는 `hitPath` fallback으로 사용한다.
- `SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS` 또는 `SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS`가 `011`, `903` 외 블럭을 포함한다.
- `SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS`가 `011`, `903` 외 블럭을 포함하거나, `011/903`이 SVG hit-area로 렌더링된다.
- `ACCESSIBLE` 블럭의 `markerType=WHEELCHAIR` 또는 `sectionKind=ACCESSIBILITY_MARKER` 메타데이터가 누락된다.
- JSON dataset export의 section/marker summary가 `89/87/2/3`에서 벗어나거나 marker `relatedSectionId`가 끊어진다.
- hitPath candidate review summary가 `22/16/5/1`, `aliasOnly=2`, `visualEqualsHit=22`, `expanded=0`, `blockers=0`에서 벗어난다.
- marker transition review summary가 `markers=3`, `sections=3`, `positionLocks=3`, `selectableCompat=3`, `markerOnlyApplied=false`, `blockers=0`에서 벗어난다.
- `/internal/sajik-seatmap-editor`가 `import.meta.env.DEV` gate 없이 production route나 navigation에 노출된다.
- editor patch preview에서 사용자 조작 전 `after`가 `before`와 달라지거나, vertex draft 후 `validation.status`가 `PASS`가 아니다.
- editor validation FAIL 상태에서 JSON/TS copy/export가 가능하다.
- editor regression이 vertex add/delete, vertex drag, validation FAIL export lock을 검증하지 않는다.
- editor v1.8 구현 파일이 이번 사직 polygon v2 release-lock PR에 섞인다.
- PR scope guard가 git staging을 직접 수행하거나 부분 staging review 대상 파일을 숨긴다.
- PR scope guard report에서 `stagingManifest`, `safeToRunBulkGitAdd=false`, forbidden staging commands 중 하나가 누락된다.
- `HIT_POLYGON_TOO_SMALL` issue가 발생한다.
- `needsOperatorReview`, `unreviewedBlocks` 중 하나라도 `0`이 아니다.
- `refinedPolygons=83`이 유지되지 않는다.
- `SAJIK_OFFICIAL_TRACE_REFERENCE`의 `expectedPointCount` 또는 `expectedArea`가 현재 path와 다르다.
- 단일 폐합 path가 아니거나 self-intersection이 있다.
- `MAP_SELECTABLE` 블럭의 label 좌표가 자기 polygon 밖으로 벗어나거나, 다른 나중 렌더링 polygon에 가로채인다.
- `011`, `903` 외 블럭이 `OFFICIAL_PNG_BLOCK_NOT_VISIBLE` 또는 `MANUAL_REVIEW_REQUIRED`로 내려간다.
- 1루 얇은 블럭군에서 `THIN_COMPONENT_LEAKAGE_OUTSIDE_DILATED_PATH` 또는 `THIN_COMPONENT_MAX_DISTANCE_OUTSIDE_PATH`가 발생한다.
- `311/321`, `112/121`, `132/142`, `914/922` 중 하나라도 label top-hit 회귀가 발생한다.
- 모바일 390에서 `723` path 중심 클릭이 zoom control 배경에 가로채인다.
- 브라우저 QA에서 모바일 390 또는 데스크톱 1440 overflow가 발생한다.
