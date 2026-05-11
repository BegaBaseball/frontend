# 광주 KIA 챔피언스필드 좌석도 release lock

검수 고정일: 2026-05-11 KST

## 기준

- 공식 asset: `src/assets/stadiums/kia/gwangju-kia-seatmap-official-2026.png`
- 공식 이미지 좌표계: `2200x1159`
- 기준 데이터: `GWANGJU_SEATMAP_IMAGE`, `GWANGJU_IMAGE_GEOMETRY_DRAFTS`, `GWANGJU_OFFICIAL_TRACE_REFERENCE`, `GWANGJU_BLOCKS`
- trace method: `OFFICIAL_IMAGE_PIXEL_TRACE`
- trace status: `OFFICIAL_IMAGE_TRACED`
- pixel alignment: `PIXEL_ALIGNED`
- 선택 가능 기준: `GWANGJU_SELECTABLE_BLOCKS_READY === true`

## 고정 상태

- `activeBlocks=111`
- `GWANGJU_BASE_TRACE_BLOCK_COUNT === 111`
- `GWANGJU_EXPECTED_TRACE_BLOCK_COUNT === 111`
- `officialImageTracedBlocks=111`
- `directOfficialTraceBlocks=111`
- `manualReviewedBlocks=111`
- `pixelAlignedBlocks=111`
- `overlapWarnings=0`
- `minimumPixelCoverageRatio=0.8286`
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

## 기준 산출물

- Trace manifest JSON: `reports/stadium/gwangju-seatmap-trace-review.json`
- Trace manifest CSV: `reports/stadium/gwangju-seatmap-trace-review.csv`
- Trace summary: `reports/stadium/gwangju-seatmap-trace-review.md`
- Trace overlay PNG: `reports/stadium/gwangju-seatmap-trace-review-overlay.png`
- Clean overlay crops: `reports/stadium/gwangju-seatmap-trace-review-clean-crops/`
- Operator runbook: `docs/gwangju-seatmap-operator-runbook.md`
- Release handoff: `docs/gwangju-seatmap-release-handoff.md`
- Operator status: `reports/stadium/gwangju-seatmap-operator-status.md`
- Release package: `reports/stadium/gwangju-seatmap-release-package.md`
- Release gate: `reports/stadium/gwangju-seatmap-release-gate.md`
- Browser QA summary: `../output/playwright/stadium-ux-gwangju-validate/stadium-mobile-smoke-summary.md`

## 운영 규칙

- 공식 PNG natural size는 `2200x1159`이어야 한다.
- SVG overlay와 hit-area는 공식 PNG 원본 좌표계를 기준으로 유지한다.
- 기존 111개 active block은 모두 `OFFICIAL_IMAGE_TRACED`, `manualReviewed: true`, `PIXEL_ALIGNED` 상태여야 한다.
- K7/AWAY block-range는 기존 번호 블럭 polygon에만 연결한다.
- K7/AWAY 독립 aggregate polygon 좌표를 추정하거나 색상만 보고 생성하지 않는다.
- 허용 좌표 소스는 `operator-provided official PNG coordinates only`이다.
- browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images는 사용하지 않는다.
- 야구 운영 데이터가 비어 있거나 불명확하면 `MANUAL_BASEBALL_DATA_REQUIRED` 계약으로 유지하고 operator 제공 데이터를 요청한다.
- 좌표 변경이 발생하면 trace manifest, clean crops, isolated browser QA를 다시 생성한다.

## 릴리즈 게이트

```bash
npm run qa:stadium:gwangju:release-gate
```

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
- 외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사가 사용된다.

## 최종 검증 결과

검증 실행일: 2026-05-11 KST

- `npm run stadium:gwangju:operator-status`: PASS
  - `status=pending`
  - `pending=2`
  - `validDataDiff=0`
  - `blockers=0`
- `npm run test:stadium:seatmaps`: PASS
  - `221/221`
  - 광주 K7/원정응원석 block-range, fanRole 필터, operator pending 계약 포함
- `npm run qa:stadium:gwangju:trace-review`: PASS
  - `activeBlocks=111`
  - `officialImageTracedBlocks=111`
  - `manualReviewedBlocks=111`
  - `pixelAlignedBlocks=111`
  - `overlapWarnings=0`
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
- `npm run build`: PASS
  - 기존 `clientErrorReporter.ts` dynamic/static import warning은 exit code 0이면 release lock 차단 조건으로 보지 않는다.

## PR 포함 범위

- 포함: 이 문서, `docs/gwangju-seatmap-release-handoff.md`, 광주 K7/AWAY block-range 테스트 계약, trace/status 산출물.
- 제외: K7/AWAY 독립 aggregate polygon 신규 생성, production active block count 113 전환, 외부 야구 데이터 보강.
- 독립 polygon 승격은 operator template에 공식 PNG 기준 좌표가 입력되고 strict validation, apply-plan, write-smoke, write-guard, postwrite gate가 모두 통과한 뒤 별도 작업으로 처리한다.
