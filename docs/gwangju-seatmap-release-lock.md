# 광주 KIA 챔피언스필드 좌석도 release lock

검수 고정일: 2026-05-15 KST

## 기준

- 공식 asset: `src/assets/stadiums/kia/gwangju-kia-seatmap-official-2026.png`
- 공식 이미지 좌표계: `2200x1159`
- 기준 데이터: `GWANGJU_SEATMAP_IMAGE`, `GWANGJU_IMAGE_GEOMETRY_DRAFTS`, `GWANGJU_OFFICIAL_TRACE_REFERENCE`, `GWANGJU_BLOCKS`
- trace method: `OFFICIAL_IMAGE_PIXEL_TRACE`
- trace status: `OFFICIAL_IMAGE_TRACED`
- pixel alignment: `PIXEL_ALIGNED`
- 선택 가능 기준: `GWANGJU_SELECTABLE_BLOCKS_READY === true`

## 고정 상태

- release phase: `PRE_OPERATOR_PENDING`
- trace version: `manual-polygon-v5`
- previous trace version: `manual-polygon-v4`
- trace generation: `FULL_ACTIVE_111_RETRACE`
- `activeBlocks=111`
- `GWANGJU_BASE_TRACE_BLOCK_COUNT === 111`
- `GWANGJU_EXPECTED_TRACE_BLOCK_COUNT === 111`
- `officialImageTracedBlocks=111`
- `directOfficialTraceBlocks=111`
- `manualReviewedBlocks=111`
- `pixelAlignedBlocks=111`
- `fullRetracedBlocks=111`
- `blocksChangedFromPreviousTrace=111`
- `totalRetracePointDelta=1182`
- `overlapWarnings=0`
- `minimumPixelCoverageRatio=0.9677`
- `componentCoverageWarnings=0`
- `minimumOfficialComponentRecall=0.9263`
- `minimumComponentIoU=0.7692`
- `zonePrecisionWorksets=5`
- `zonePrecisionStatus=passed`
- `zonePrecisionWarnings=0`
- `zonePrecisionActiveBlockCoverage=111`
- `GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE === true`
- `GWANGJU_SEATMAP_COORDINATES_READY === false`
- `operatorRequiredSections=K7석, 원정응원석`

## K7/원정응원석 block-range 계약

2026-05-11 운영자 block-range 검수 기준은 독립 aggregate polygon이 아니라 기존 번호 블럭 polygon 재사용이다.

- `K7석`: `107`, `108`, `109`, `110`, `111`, `118`, `119`, `120`, `121`, `122`
- `원정응원석`: `107`, `108`, `109`, `110`
- `홈 응원석`: `118`, `119`, `120`, `121`, `122`
- `111`: `K7` 카테고리지만 `fanRole: NEUTRAL`이므로 `응원석`, `홈 응원석`, `원정응원석` 필터에서 제외한다.

필터 계약:

- `내야석`: K7 `107~111`, `118~122` 전체를 포함한다.
- `K7석`: K7 `107~111`, `118~122`만 포함하며 별도 aggregate polygon이 아니라 기존 번호 블럭 hit-area를 재사용한다.
- `응원석`: `fanRole: HOME/AWAY`인 K7 `107~110`, `118~122`만 포함한다.
- `홈 응원석`: K7 `118~122`만 포함한다.
- `원정응원석`: K7 `107~110`만 포함한다.

Derived range 상수 계약:

- `GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES`
- `derived-k7-seats`: `filterGroupId=k7`, `displayBlocks=107~111, 118~122`, `aggregateHitArea=REUSES_EXISTING_TRACE_ONLY`
- `derived-away-cheering-seats`: `filterGroupId=away-cheering`, `displayBlocks=107~110`, `fanRoles=AWAY`, `aggregateHitArea=REUSES_EXISTING_TRACE_ONLY`
- `derived-home-cheering-seats`: `filterGroupId=home-cheering`, `displayBlocks=118~122`, `fanRoles=HOME`, `aggregateHitArea=REUSES_EXISTING_TRACE_ONLY`
- 모든 derived range의 `operatorPolygonStatus`는 `PENDING_OPERATOR_INPUT`이며, 참조 block id는 기존 `OFFICIAL_IMAGE_TRACED` active block에만 연결한다.
- Derived range는 UX 표시/필터용 계약이며 active block/hit-area는 기존 111개 polygon만 사용한다.
- 좌표 승격 전에는 active 113개 기준 테스트를 실행하지 않는다.

## 후속 operator polygon 상태

- `home-k7-seats`: `PENDING_OPERATOR_INPUT`
- `away-cheering-seats`: `PENDING_OPERATOR_INPUT`
- 독립 K7/AWAY aggregate hit-area는 공식 PNG `2200x1159` 기준 운영자 polygon 좌표가 들어오기 전까지 생성하지 않는다.
- 독립 polygon 승격이 별도로 완료된 경우에만 active block 기준을 `111`에서 `113`으로 전환한다.
- prewrite/write gate가 완료되기 전에는 113개 active block 기대값이나 독립 aggregate hit-area 기준을 릴리즈 게이트에 섞지 않는다.
- 현재 release lock에서는 `SPECIAL_BLOCKS`에 K7/AWAY aggregate block을 추가하지 않는다.

## O/P 외야 component coverage 계약

O/P 외야 계열은 기존 `pixelCoverageRatio`만으로는 작은 polygon이 공식 색상 영역 내부에 있을 때 통과할 수 있으므로, 공식 PNG component recall/IoU gate를 별도로 적용한다.

- 대상: `outfield-left-seats`, `outfield-right-seats`, `bleachers-table-left`, `bleachers-table-right`
- 기준 component: `outfield-1`, `outfield-3`, `bleachers-table-1~4`
- 최소 공식 component recall: `0.78`
- 최소 component IoU: `0.62`
- `outfield-right-seats`는 공식 PNG component `outfield-3` bounds `1184,341,1333,838` 기준으로 하단까지 포함해야 한다.
- O/P component coverage가 실패하면 일반 좌석 layer에 legacy polygon이 남은 것으로 보고 trace manifest와 release gate를 실패시킨다.

## P4 반복 블럭 coverage 계약

`SKY_PICNIC` 35개와 `FIVE_TABLE` 35개는 현재 공식 PNG 기준 low-margin row가 없으므로 좌표를 추가 보정하지 않고 회귀 방지 기준을 잠근다.

- 대상 workset: `p4-repeated-numbered-blocks`
- 대상 수: `70`개 (`SKY_PICNIC` 35개, `FIVE_TABLE` 35개)
- 최소 공식 좌석 색상 overlap: `0.98`
- low-margin row는 `0`건이어야 한다.
- P4 반복 블럭에 다른 category가 섞이거나 `REPEATED_BLOCK_PIXEL_COVERAGE_BELOW_LOCK`이 발생하면 trace manifest와 zone precision gate를 실패시킨다.

## 후속 post-operator 기준

이 섹션은 향후 승격 기준을 문서화한 것이며, 현재 release lock이나 production data에 K7/AWAY polygon을 추가하지 않는다.

- post-operator release mode: `OPERATOR_POLYGON_APPLIED`
- post-operator audit mode: `POST_OPERATOR_POLYGON_APPLIED_RELEASE`
- post-operator verification command: `npm run qa:stadium:gwangju:release-verify:postoperator`
- active block 기준: `113`
- operator status 기준: write 전 `ready`, guarded write 후 `applied`
- `home-k7-seats`: `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`
- `away-cheering-seats`: `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`
- 기존 111개 active traced block은 K7/AWAY 승격 중 수정하지 않는다.
- post-operator acceptance는 `operator-apply:write`와 `operator-postwrite-gate`가 통과한 뒤에만 실행한다.
- 현재 production data에서는 `status=blocked`, `actualActiveBlocks=111`, `POST_OPERATOR_POLYGON_NOT_APPLIED`가 정상 결과이다.
- `expectedActiveBlocks=113`

## 기준 산출물

- Trace manifest JSON: `reports/stadium/gwangju-seatmap-trace-review.json`
- Trace manifest CSV: `reports/stadium/gwangju-seatmap-trace-review.csv`
- Trace summary: `reports/stadium/gwangju-seatmap-trace-review.md`
- Trace overlay PNG: `reports/stadium/gwangju-seatmap-trace-review-overlay.png`
- Clean overlay crops: `reports/stadium/gwangju-seatmap-trace-review-clean-crops/`
- Zone overlay crops: `reports/stadium/gwangju-seatmap-trace-review-zone-crops/`
- Zone precision worksets: `reports/stadium/gwangju-seatmap-zone-precision-worksets.md`
- Zone precision worksets JSON: `reports/stadium/gwangju-seatmap-zone-precision-worksets.json`
- Low-margin candidates: `reports/stadium/gwangju-seatmap-low-margin-candidates.md`
- Low-margin candidates JSON: `reports/stadium/gwangju-seatmap-low-margin-candidates.json`
- Operator runbook: `docs/gwangju-seatmap-operator-runbook.md`
- Release handoff: `docs/gwangju-seatmap-release-handoff.md`
- Operator status: `reports/stadium/gwangju-seatmap-operator-status.md`
- Release package: `reports/stadium/gwangju-seatmap-release-package.md`
- Release gate: `reports/stadium/gwangju-seatmap-release-gate.md`
- Release audit: `reports/stadium/gwangju-seatmap-release-audit.md`
- Release scope guard: `reports/stadium/gwangju-seatmap-release-scope-guard.md`
- Release scope guard JSON: `reports/stadium/gwangju-seatmap-release-scope-guard.json`
- PR packaging manifest: `reports/stadium/gwangju-seatmap-release-scope-guard.md`
- PR staging review: `reports/stadium/gwangju-seatmap-pr-staging-review.md`
- PR staging review JSON: `reports/stadium/gwangju-seatmap-pr-staging-review.json`
- Post-operator audit: `reports/stadium/gwangju-seatmap-postoperator-audit.md`
- Post-operator audit JSON: `reports/stadium/gwangju-seatmap-postoperator-audit.json`
- Operator input aid: `reports/stadium/gwangju-seatmap-operator-input-aid.md`
- Operator input aid JSON: `reports/stadium/gwangju-seatmap-operator-input-aid.json`
- Operator input packet: `reports/stadium/gwangju-seatmap-operator-input-packet.md`
- Operator input packet JSON: `reports/stadium/gwangju-seatmap-operator-input-packet.json`
- Browser QA summary: `../output/playwright/stadium-ux-gwangju-validate/stadium-mobile-smoke-summary.md`

## 운영 규칙

- 공식 PNG natural size는 `2200x1159`이어야 한다.
- SVG overlay와 hit-area는 공식 PNG 원본 좌표계를 기준으로 유지한다.
- 기존 111개 active block은 모두 `OFFICIAL_IMAGE_TRACED`, `manualReviewed: true`, `PIXEL_ALIGNED` 상태여야 한다.
- 기존 111개 active block은 `manual-polygon-v5` / `FULL_ACTIVE_111_RETRACE` 세대로 고정한다.
- `manual-polygon-v4` 대비 재생성 결과는 trace manifest의 `previousTraceVersion`, `blocksChangedFromPreviousTrace`, `totalRetracePointDelta`, bbox/anchor/coverage delta, zone overlay crop 필드로 확인한다.
- `GWANGJU_ZONE_PRECISION_WORKSETS`는 P1 O/P 외야, P2 하단 내야 저마진 K7/K9, P3 특수석, P4 SKY_PICNIC/FIVE_TABLE 반복 블럭, P5 전체 111개 reference 재고정 순서를 고정한다.
- 일반 좌석 layer는 `GWANGJU_BLOCKS[].imageGeometry.d`만 hit-area로 렌더링하며 `GWANGJU_IMAGE_GEOMETRY_DRAFTS`, `GWANGJU_OFFICIAL_TRACE_REFERENCE`, operator template, marker-only zone, K7/AWAY derived range는 런타임 hit-area source가 아니다.
- 런타임 SVG는 `GWANGJU_BLOCKS.map`과 `d={block.imageGeometry.d}`만 일반 좌석 `<path>` source로 사용한다.
- `GWANGJU_NON_SELECTABLE_MARKER_ZONES`는 좌석 `<path>`가 아니라 차단용 marker layer이며 block detail 선택 대상이 아니다.
- K7/AWAY block-range는 기존 번호 블럭 polygon에만 연결한다.
- K7/AWAY 독립 aggregate polygon 좌표를 추정하거나 색상만 보고 생성하지 않는다.
- operator input aid의 reference bbox/anchor/crop은 `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON` 참고 자료이며 aggregate polygon 좌표가 아니다.
- operator input packet의 reference bbox/anchor/crop도 `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON` 참고 자료이며 aggregate polygon 좌표가 아니다.
- 허용 좌표 소스는 `operator-provided official PNG coordinates only`이다.
- browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images는 사용하지 않는다.
- 야구 운영 데이터가 비어 있거나 불명확하면 `MANUAL_BASEBALL_DATA_REQUIRED` 계약으로 유지하고 operator 제공 데이터를 요청한다.
- 좌표 변경이 발생하면 trace manifest, clean crops, isolated browser QA를 다시 생성한다.

## 릴리즈 게이트

```bash
npm run qa:stadium:gwangju:release-verify
```

현재 `release-verify`는 pre-operator alias이며, 명시 명령은 다음과 같다.

```bash
npm run qa:stadium:gwangju:release-verify:preoperator
```

후속 post-operator 검증 skeleton:

```bash
npm run qa:stadium:gwangju:release-verify:postoperator
```

현재 production data에서는 위 명령이 `status=blocked`로 실패해야 한다. `operator-apply:write`와 `operator-postwrite-gate`가 끝나기 전에 통과하면 release lock 위반이다.

운영자 입력 보조 산출물:

```bash
npm run stadium:gwangju:operator-input-aid
npm run stadium:gwangju:operator-input-packet
```

현재 production data에서는 `status=ready_for_operator_input`, `inputPresentSections=0`, `readyForPrewrite=false`, `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON`이 정상이다.

운영자 입력 전 전체 intake:

```bash
npm run stadium:gwangju:operator-intake
```

`operator-intake`는 `operator-handoff -> operator-input-aid -> operator-input-packet` 순서이다.

`release-verify` 최종 실행 순서:

```bash
npm run qa:stadium:gwangju:release-gate
npm run stadium:gwangju:release-scope-guard
npm run stadium:gwangju:pr-staging-plan
npm run stadium:gwangju:release-audit
```

최종 판정은 preoperator 통과 + postoperator blocked + scope guard 통과 상태를 함께 확인한다.

Release gate 내부 실행 순서:

```bash
npm run stadium:gwangju:operator-status
npm run test:stadium:seatmaps
npm run qa:stadium:gwangju:trace-review
npm run stadium:gwangju:release-package
npm run build
```

릴리즈 차단 조건:

- `activeBlocks`가 `111`이 아니다.
- `officialImageTracedBlocks`, `directOfficialTraceBlocks`, `manualReviewedBlocks`, `pixelAlignedBlocks` 중 하나라도 `111`이 아니다.
- `overlapWarnings`가 `0`이 아니다.
- `componentCoverageWarnings`가 `0`이 아니다.
- O/P 외야 계열의 official component recall이 `0.78` 미만이거나 component IoU가 `0.62` 미만이다.
- `GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE`가 `true`가 아니다.
- K7 block-range가 `107~111`, `118~122`와 다르다.
- `K7석` 필터가 기존 K7 번호 블럭 `107~111`, `118~122`만 노출하지 않는다.
- 원정응원석 block-range가 `107~110`과 다르다.
- 홈 응원석 block-range가 `118~122`와 다르다.
- `111`이 `fanRole: NEUTRAL`이 아니거나 응원석 필터에 포함된다.
- `home-k7-seats`, `away-cheering-seats` 독립 polygon이 운영자 좌표 없이 active hit-area로 승격된다.
- 브라우저 QA에서 K7/AWAY filter top-hit 계약이 깨진다.
- release package가 `ready`가 아니거나 `activeBlocks=111`, `REUSES_EXISTING_TRACE_ONLY`, `status=pending`, `browser QA passed` 중 하나를 잃는다.
- release gate가 `passed`가 아니거나 `operator-status -> seatmap tests -> trace-review QA -> release-package -> build` 순서를 잃는다.
- release audit가 `passed`가 아니거나 release gate/package/status/trace/browser QA/handoff 산출물 stale 상태를 감지한다.
- release verify가 `release-gate -> release-scope-guard -> pr-staging-plan -> release-audit` 순서를 잃는다.
- release scope guard가 광주 release package와 Daegu/Daejeon/Sajik/Suwon 분리 범위를 구분하지 못하거나 알 수 없는 dirty file을 감지한다.
- PR packaging manifest가 광주 release 후보 23개, separate dirty work baseline 95개, runtime classified separate dirty work, unexpected 0, blockers 0 기준을 한 문서로 고정하지 못한다.
- release scope guard의 release candidate inventory가 `expectedIncludedFileCount=23`, `actualIncludedFileCount=23`, `missingExpectedIncludedFiles=[]`, `extraIncludedFiles=[]` 상태를 잃는다.
- release scope guard의 separate work inventory가 `expectedSeparateDirtyWorkCount baseline=95`, `classifiedSeparateDirtyWorkExpansionAllowed=true` 상태를 잃거나 classified separate dirty work를 blocker로 처리한다.
- release scope guard의 `prPackagingManifest.releasePayloadFileCount=23`, `separateDirtyWorkFileCount=<runtime>`, `unexpectedDirtyFileCount=0`, `inventoryDriftCount=0` 상태를 잃는다.
- release scope guard의 `patchSeparationReadiness.status=ready-or-review-required` 상태를 잃거나 clean release payload files are not packaging blockers 계약을 숨긴다.
- patch separation readiness가 release payload files have mixed or untracked diffs 상태에서만 review-required가 됨을 문서화하지 않는다.
- PR staging plan이 `stagingPlan.status=ready-or-review-required`, `stagingPlan.doesNotRunGitAdd=true`, `stagingPlan.safeToRunBulkGitAdd=false`, `stagingPlan.releasePayloadFileCount=23`, `stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true` 계약을 잃는다.
- PR staging review가 `stagingReview.status=ready-or-review-required`, `stagingReview.doesNotRunGitAdd=true`, `stagingReview.safeToRunBulkGitAdd=false`, `stagingReview.releasePayloadFileCount=23`, `stagingReview.recommendsOnlyIncludedFiles=true`, `stagingReview.doesNotRecommendSeparateDirtyWork=true` 계약을 잃는다.
- pre-operator release verify가 `activeBlocks=111`, `operatorStatus=pending`, `REUSES_EXISTING_TRACE_ONLY` 중 하나를 잃는다.
- post-operator acceptance가 실제 `operator-apply:write`와 `operator-postwrite-gate` 완료 전 실행된다.
- post-operator verify가 좌표 승격 전 `POST_OPERATOR_POLYGON_NOT_APPLIED`, `status=blocked`, `actualActiveBlocks=111` 상태를 잃고 통과한다.
- operator input aid가 `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON` 정책을 잃거나 reference bbox를 K7/AWAY aggregate polygon으로 취급한다.
- operator input packet이 `blocked`, `ready_for_operator_input`, `operator_input_present`, `ready_for_prewrite` 외 상태를 쓰거나 reference bbox를 K7/AWAY aggregate polygon으로 취급한다.
- 외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사가 사용된다.

## 최종 검증 결과

검증 실행일: 2026-05-15 KST

- `npm run stadium:gwangju:operator-status`: PASS
  - `status=pending`
  - `pending=2`
  - `validDataDiff=0`
  - `blockers=0`
- `npm run test:stadium:seatmaps`: PASS
  - `258/258`
  - 광주 K7/원정응원석 block-range, fanRole 필터, operator pending 계약 포함
- `npm run qa:stadium:gwangju:trace-review`: PASS
  - `activeBlocks=111`
  - `traceVersion=manual-polygon-v5`
  - `traceGeneration=FULL_ACTIVE_111_RETRACE`
  - `fullRetracedBlocks=111`
  - `blocksChangedFromPreviousTrace=111`
  - `totalRetracePointDelta=1182`
  - `officialImageTracedBlocks=111`
  - `manualReviewedBlocks=111`
  - `pixelAlignedBlocks=111`
  - `overlapWarnings=0`
  - `componentCoverageWarnings=0`
  - `minimumPixelCoverageRatio=0.9677`
  - `minimumOfficialComponentRecall=0.9263`
  - `minimumComponentIoU=0.7692`
  - `repeatedNumberedBlockMinimumPixelCoverageRatio=1.0000`
  - mobile 390, desktop 1440 isolated QA passed
- `npm run stadium:gwangju:release-package`: PASS
  - `status=ready`
  - `blockers=0`
  - `activeBlocks=111`
  - `derivedRanges=3`
- `npm run qa:stadium:gwangju:release-gate`: PASS
  - `status=passed`
  - `blockers=0`
  - `steps=5/5`
  - `releasePackageStatus=ready`
  - `operatorStatus=pending`
  - `browserQaStatus=passed`
  - `activeTraceBlocks=111`
- `npm run stadium:gwangju:release-audit`: PASS
  - `status=passed`
  - `blockers=0`
  - `stale=0`
  - `scopeGuardStatus=passed`
  - `scopeGuardIncludedFiles=23`
  - `scopeGuardSeparateDirtyWorkFiles=<runtime>`
  - `scopeGuardSeparateDirtyWorkBaselineFiles=95`
  - `classifiedSeparateDirtyWorkExpansionAllowed=true`
  - `scopeGuardUnexpectedFiles=0`
  - `scopeGuardBlockers=0`
- `npm run stadium:gwangju:release-scope-guard`: PASS
  - `status=passed`
  - `included=23`
  - `separate=<runtime>`
  - `unexpected=0`
  - `inventoryDrift=0`
  - `prPackagingManifest.releasePayloadFileCount=23`
  - `prPackagingManifest.separateDirtyWorkFileCount=<runtime>`
  - `prPackagingManifest.unexpectedDirtyFileCount=0`
  - `prPackagingManifest.inventoryDriftCount=0`
  - `patchSeparationReadiness.status=ready-or-review-required`
  - clean release payload files are not packaging blockers
  - 광주 release package, 별도 Daegu/Daejeon/Sajik/Suwon dirty work 분리
- `npm run stadium:gwangju:pr-staging-plan`: PASS
  - `stagingPlan.status=ready-or-review-required`
  - `stagingPlan.doesNotRunGitAdd=true`
  - `stagingPlan.safeToRunBulkGitAdd=false`
  - `stagingPlan.releasePayloadFileCount=23`
  - `stagingPlan.separateDirtyWorkFileCount=<runtime>`
  - `stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true`
- `npm run stadium:gwangju:pr-staging-review`: PASS
  - `stagingReview.status=ready-or-review-required`
  - `stagingReview.doesNotRunGitAdd=true`
  - `stagingReview.safeToRunBulkGitAdd=false`
  - `stagingReview.releasePayloadFileCount=23`
  - `stagingReview.recommendsOnlyIncludedFiles=true`
  - `stagingReview.doesNotRecommendSeparateDirtyWork=true`
- `npm run stadium:gwangju:operator-input-aid`: PASS
  - `status=ready_for_operator_input`
  - `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON`
  - `reports/stadium/gwangju-seatmap-operator-input-aid.json`
- `npm run stadium:gwangju:operator-input-packet`: PASS
  - `status=ready_for_operator_input`
  - `inputPresentSections=0`
  - `readyForPrewrite=false`
  - `reports/stadium/gwangju-seatmap-operator-input-packet.json`
- `npm run qa:stadium:gwangju:release-verify`: PASS
  - `release-gate -> release-scope-guard -> pr-staging-plan -> release-audit`
  - `status=passed`
  - `blockers=0`
  - `stale=0`
- `npm run qa:stadium:gwangju:release-verify:preoperator`: PASS
  - `activeBlocks=111`
  - `operatorStatus=pending`
  - `REUSES_EXISTING_TRACE_ONLY`
- `npm run qa:stadium:gwangju:release-verify:postoperator`: BLOCKED EXPECTED
  - `status=blocked`
  - `expectedActiveBlocks=113`
  - `actualActiveBlocks=111`
  - `POST_OPERATOR_POLYGON_NOT_APPLIED`
- `npm run build`: PASS
  - 기존 `clientErrorReporter.ts` dynamic/static import warning은 exit code 0이면 release lock 차단 조건으로 보지 않는다.

## 남은 작업

- `home-k7-seats`와 `away-cheering-seats`의 공식 PNG `2200x1159` 기준 operator polygon 입력이 아직 없다.
- 현재 정상 상태는 `operator-input-packet.status=ready_for_operator_input`, `inputPresentSections=0`, `readyForPrewrite=false`이다.
- 현재 postoperator 검증은 `status=blocked`, `actualActiveBlocks=111`, `expectedActiveBlocks=113`, `POST_OPERATOR_POLYGON_NOT_APPLIED`가 정상 결과이다.
- 좌표 입력 전에는 `gwangjuSeatData.ts`에 K7/AWAY 독립 geometry를 쓰지 않는다.
- 현재 K7석 derived range와 원정응원석 derived range는 `107~110`을 공유하는 중첩 필터 모델이다. 이 중첩은 기존 번호 블럭 재사용 필터/배지에서만 허용되며, 같은 `officialBlocks`를 공유하는 독립 polygon 승격 입력은 `OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP`으로 차단한다.
- 독립 polygon이 필요하면 K7 전체 aggregate를 active hit-area로 만들지 않고, 실제 클릭 대상이 필요한 non-overlap operator target으로 모델을 먼저 분리한다.
- 좌표 입력 후에만 strict validate, apply-plan require-ready, prewrite gate, guarded write, postwrite gate 순서로 `113` active block acceptance를 실행한다.

## PR 포함 범위

- 포함: 이 문서, `docs/gwangju-seatmap-release-handoff.md`, 광주 K7/AWAY block-range 테스트 계약, trace/status 산출물.
- 제외: K7/AWAY 독립 aggregate polygon 신규 생성, production active block count 113 전환, 외부 야구 데이터 보강.
- 독립 polygon 승격은 operator template에 공식 PNG 기준 좌표가 입력되고 strict validation, apply-plan, write-smoke, write-guard, postwrite gate가 모두 통과한 뒤 별도 작업으로 처리한다.
