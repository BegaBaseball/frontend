# 광주 KIA 챔피언스필드 좌석도 release lock

검수 고정일: 2026-05-18 KST

## 기준

- 공식 asset: `src/assets/stadiums/kia/gwangju-kia-seatmap-official-2026.png`
- 공식 이미지 좌표계: `2200x1159`
- 기준 데이터: `GWANGJU_SEATMAP_IMAGE`, `GWANGJU_IMAGE_GEOMETRY_DRAFTS`, `GWANGJU_OFFICIAL_TRACE_REFERENCE`, `GWANGJU_BLOCKS`
- trace method: `OFFICIAL_IMAGE_PIXEL_TRACE`
- trace status: `OFFICIAL_IMAGE_TRACED`
- pixel alignment: `PIXEL_ALIGNED`
- 선택 가능 기준: `GWANGJU_SELECTABLE_BLOCKS_READY === true`

## 고정 상태

- release phase: `OFFICIAL_DERIVED_AGGREGATE_READY`
- trace version: `manual-polygon-v86`
- previous trace version: `manual-polygon-v85`
- trace generation: `FULL_ACTIVE_111_RETRACE`
- `activeBlocks=113`
- `GWANGJU_BASE_TRACE_BLOCK_COUNT === 111`
- `GWANGJU_EXPECTED_TRACE_BLOCK_COUNT === 113`
- `officialImageTracedBlocks=113`
- `directOfficialTraceBlocks=113`
- `manualReviewedBlocks=113`
- `pixelAlignedBlocks=113`
- `fullRetracedBlocks=113`
- `blocksChangedFromPreviousTrace=113`
- `totalRetracePointDelta=7184`
- `overlapWarnings=0`
- `minimumPixelCoverageRatio=1.0000`
- `componentCoverageWarnings=0`
- `minimumOfficialComponentRecall=1.0000`
- `minimumComponentIoU=0.9255`
- `zonePrecisionWorksets=5`
- `zonePrecisionStatus=passed`
- `zonePrecisionWarnings=0`
- `zonePrecisionActiveBlockCoverage=113`
- `GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE === true`
- `GWANGJU_SEATMAP_COORDINATES_READY === true`
- `operatorRequiredSections=-`

## K7/원정응원석 block-range 계약

2026-05-11 운영자 block-range 검수 기준은 새 좌표 추정이 아니라 기존 공식 PNG 번호 블럭 polygon을 multi-subpath aggregate로 합성하는 방식이다.

- `K7석`: `107`, `108`, `109`, `110`, `111`, `118`, `119`, `120`, `121`, `122`
- `원정응원석`: `107`, `108`, `109`, `110`
- `홈 응원석`: `118`, `119`, `120`, `121`, `122`
- `111`: `K7` 카테고리지만 `fanRole: NEUTRAL`이므로 `응원석`, `홈 응원석`, `원정응원석` 필터에서 제외한다.

필터 계약:

- `내야석`: K7 `107~111`, `118~122` 전체를 포함한다.
- `K7석`: `home-k7-seats` aggregate hit-area를 노출하고 source 번호 블럭 hit-area는 해당 필터에서 숨긴다.
- `응원석`: `fanRole: HOME/AWAY`인 K7 `107~110`, `118~122`만 포함한다.
- `홈 응원석`: K7 `118~122`만 포함한다.
- `원정응원석`: `away-cheering-seats` aggregate hit-area를 노출하고 source `107~110` 번호 블럭 hit-area는 해당 필터에서 숨긴다.

Derived range 상수 계약:

- `GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES`
- `derived-k7-seats`: `filterGroupId=k7`, `displayBlocks=107~111, 118~122`, `aggregateHitArea=OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`
- `derived-away-cheering-seats`: `filterGroupId=away-cheering`, `displayBlocks=107~110`, `fanRoles=AWAY`, `aggregateHitArea=OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`
- `derived-home-cheering-seats`: `filterGroupId=home-cheering`, `displayBlocks=118~122`, `fanRoles=HOME`, `aggregateHitArea=REUSES_EXISTING_TRACE_ONLY`
- 모든 derived range의 `operatorPolygonStatus`는 `OFFICIAL_DERIVED_READY`이며, 참조 block id는 기존 `OFFICIAL_IMAGE_TRACED` active block에 연결한다.
- K7/AWAY derived range는 UX 표시/필터 계약과 filter 전용 aggregate hit-area를 함께 제공한다.
- 현재 release 기준은 active 113개이다.

## 후속 operator polygon 상태

- `home-k7-seats`: `READY`, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`
- `away-cheering-seats`: `READY`, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`
- K7/AWAY aggregate hit-area는 공식 PNG `2200x1159` 기준 기존 번호 블럭 subpath만 합성한다.
- active block 기준은 `111`에서 `113`으로 전환되어 있다.
- `SPECIAL_BLOCKS`에는 K7/AWAY aggregate block definition이 포함된다.

## O/P 외야 component coverage 계약

O/P 외야 계열은 기존 `pixelCoverageRatio`만으로는 작은 polygon이 공식 색상 영역 내부에 있을 때 통과할 수 있으므로, 공식 PNG component recall/IoU gate를 별도로 적용한다.

- 대상: `outfield-left-seats`, `outfield-right-seats`, `bleachers-table-left`, `bleachers-table-right`
- 기준 component: `outfield-1`, `outfield-3`, `bleachers-table-1~4`
- 최소 공식 component recall: `0.78`
- 최소 component IoU: `0.62`
- `outfield-right-seats`는 공식 PNG component `outfield-3` bounds `1184,341,1333,838` 기준으로 하단까지 포함해야 한다.
- O/P component coverage가 실패하면 일반 좌석 layer에 legacy polygon이 남은 것으로 보고 trace manifest와 release gate를 실패시킨다.

## 101~127 image alignment audit 계약

101~127 하단/3루 내야 구간은 기존 reference와 현재 polygon이 서로 잠기는 false pass를 막기 위해 `gwangju-seatmap-image-alignment-audit`를 release trace manifest 앞단에서 실행한다.

- 산출물: `reports/stadium/gwangju-seatmap-image-alignment-audit.json`, `reports/stadium/gwangju-seatmap-image-alignment-audit.csv`, `reports/stadium/gwangju-seatmap-image-alignment-audit.md`
- overlay: `reports/stadium/gwangju-seatmap-image-alignment-audit-overlay.png`
- crop: `reports/stadium/gwangju-seatmap-image-alignment-audit-crops/`
- P0 기준: `officialBlockMaskRecall >= 0.90`, `componentIoU >= 0.75`, `outsideBleedRatio <= 0.08`
- 101~127 전수조사: `official-numbered-component-mask`, `official-numbered-boundary-mask`, `official-numbered-independent-visual-reference`로 번호 내야 block의 공식 PNG mask recall, IoU, outside bleed, label top-hit를 별도 고정한다. 특히 3루 `121~127`은 production polygon 복사 mask가 아니라 `official-png-crop-121-127-shared-boundary-v86` 기준 visual reference와 forbidden adjacency overlap gate를 함께 사용한다.
- S-* 전수조사: `S-301~S-335`는 `official-sky-picnic-color-scan`으로 공식 PNG sky-picnic pink 색상 coverage와 outside bleed를 별도 보고한다.
- 5층 테이블 전수조사: `501~535`는 `official-five-table-color-scan`으로 공식 PNG 회색/청회색 fill coverage와 outside bleed를 별도 보고한다.
- 기본 실행은 S-* 및 5층 테이블 mismatch를 `review-required`로 보고하고, trace manifest는 `--require-sky-picnic --require-alphabet-sections --require-five-table` release gate로 같은 결과를 차단한다.
- S-* evidence crop: `gwangju-seatmap-image-alignment-audit-sky-picnic-s-301-315.png`, `gwangju-seatmap-image-alignment-audit-sky-picnic-s-316-335.png`
- v45에서는 `S-301~S-304`를 공식 PNG 확대 crop의 분홍색 visible block 외곽 기준으로 axis-aligned rectangle에서 기울어진 polygon으로 보정해 `J` 하단 boundary와의 여백을 줄인다.
- 5층 테이블 evidence crop: `gwangju-seatmap-image-alignment-audit-five-table-501-518.png`, `gwangju-seatmap-image-alignment-audit-five-table-519-535.png`
- 알파벳 표시 좌석 전수조사: 선택 가능한 `A/B/C/G/H/I/J/K` 좌석은 `official-alphabet-section-color-scan`으로 공식 PNG 구역 색상 coverage와 outside bleed를 별도 보고한다. `J/I/H` 하단 내야 특수석은 101~108 polygon 배치 후 좌표 복사 mask가 아니라 공식 PNG 색상 mask에서 추출한 `official-alphabet-section-mask` recall/IoU/outside bleed gate로 별도 차단한다.
- 1루 `H/I/J`는 번호 블럭과 같은 살구색이 섞이는 구간을 분리한다. `H`는 공식 PNG 빨간 row-envelope를 visual outline으로 유지하고, hit-area는 `101~108`, `I`, `J`와 sampled overlap을 만들지 않도록 하단 shared boundary를 non-overlap clip해 bbox `1007,812,1185,904`로 고정한다. `I`는 공식 PNG crop에서 보이는 H와 J 사이의 긴 strip 색상 component를 production polygon 복사본이 아닌 `largest-component-row-envelope`로 다시 추출해 bbox `958,893,1112,944`로 고정하고, `J`는 공식 PNG 색상 `row-envelope`에서 다시 추출한 뒤 105 하단 shared boundary를 침범하지 않도록 좌상단을 non-overlap clip해 bbox `867,930,959,966`으로 고정한다. 이 polygon들은 `101~108`, `H/I/J`, `S-301~S-304` label center를 서로 삼키면 안 된다.
- 3루 `H`/`126` 공유 경계는 공식 PNG 색상 mask를 별도로 고정한다. `third-family-seats`는 `560,150,700,315` search bounds 안에서 빨간 구역 row-envelope를 추출하되 `k5-126`, `k5-127` polygon을 mask에서 제외하고, `k5-126`은 공식 번호 mask `[[535,298],[570,296],[626,309],[683,319],[674,356],[506,326],[526,318]]` 기준으로 상단 침범을 차단한다. v78에서는 공식 PNG grid crop에서 `126`의 125 공유 경계를 `506,326`까지 다시 재고정했고, v79에서는 `127` 오른쪽 과대 hit-area를 줄였으며, v80에서는 `127`을 `[[678,239],[692,235],[690,257],[685,301],[679,313],[663,304],[661,280],[669,247]]`로 한 번 더 조여 `H/126/533~535` sampled overlap 0을 유지하는 non-overlap reference로 교체했다.
- 3루 `H` reference bbox는 `569,158,692,305`, `123` reference bbox는 `455,400,628,454`, `124` reference bbox는 `467,371,646,430`, `125` reference bbox는 `489,326,674,397`, `126` reference bbox는 `515,294,683,362`, `127` reference bbox는 `657,232,692,313`으로 고정한다. 이 값이 바뀌면 image alignment audit, trace manifest, clean crop, browser QA를 다시 생성해야 한다.
- 3루 `I/J`는 단순 색상 coverage가 아니라 `official-alphabet-section-mask`로 고정한다. v71에서 `third-wheelchair-seats`는 상단 strip을 공식 PNG 색상 component `[[0,2]]` row-envelope로 재산출하고 하단 marker subpath를 보조 ring으로 묶어 bbox `438,204,607,362`, subpath `2`로 고정한다. v72에서 `party-seats-third`는 아이콘 둘레만 잡던 작은 polygon을 폐기하고 공식 PNG에서 보이는 J 띠 영역을 124/I/S-335 non-overlap 경계 안의 bbox `430,353,489,398`로 재트레이싱했다. v73에서 `third-family-seats`는 공식 빨간 H component row-envelope를 3px 간격으로 재산출해 좌하단/상단 곡선 경계를 더 촘촘한 다점 polygon으로 잠갔다. 두 polygon은 서로 label center를 삼키면 안 된다.
- 기본 실행은 알파벳 좌석 mismatch를 `review-required`로 보고하고, trace manifest는 `--require-sky-picnic --require-alphabet-sections --require-five-table` release gate로 같은 결과를 차단한다.
- 알파벳 evidence crop: `gwangju-seatmap-image-alignment-audit-special-seats.png`, `gwangju-seatmap-image-alignment-audit-alphabet-special-seats-upper.png`
- 하단 내야 split evidence: `lower-infield-special-split/` 아래 공식 PNG crop, `101~108` 번호 블럭 only overlay, `J/I/H` 특수석 only overlay, 전체 overlay, numbered-vs-special overlap heatmap을 생성한다. 두 layer의 sampled overlap이 1개라도 있으면 번호 블럭과 특수석이 각각 mask gate를 통과해도 release를 실패시킨다.
- audit는 공식 PNG `2200x1159` 기준 독립 mask만 사용하며 browser CSS pixel, resized screenshot, external crawling, web-search-based baseball data, third-party copied seatmap images를 사용하지 않는다.

## P4 반복 블럭 coverage 계약

`SKY_PICNIC` 35개와 `FIVE_TABLE` 35개는 P4 반복 블럭으로 묶어 관리한다. 두 반복 계열 모두 image alignment audit의 공식 PNG 색상 전수조사 결과를 함께 확인한다.

- 대상 workset: `p4-repeated-numbered-blocks`
- 대상 수: `70`개 (`SKY_PICNIC` 35개, `FIVE_TABLE` 35개)
- 최소 공식 좌석 색상 overlap: `0.98`
- S-* 또는 `FIVE_TABLE` `review-required` row가 있으면 v13 release trace manifest를 실패시킨다.
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
- 현재 production data에서는 K7/AWAY 공식 derived aggregate가 이미 active 113개 기준으로 적용되어 있다.
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
- Runtime layer audit: `reports/stadium/gwangju-seatmap-runtime-layer-audit.md`
- Runtime layer audit JSON: `reports/stadium/gwangju-seatmap-runtime-layer-audit.json`
- Release scope guard: `reports/stadium/gwangju-seatmap-release-scope-guard.md`
- Release scope guard JSON: `reports/stadium/gwangju-seatmap-release-scope-guard.json`
- PR packaging manifest: `reports/stadium/gwangju-seatmap-release-scope-guard.md`
- PR staging review: `reports/stadium/gwangju-seatmap-pr-staging-review.md`
- PR staging review JSON: `reports/stadium/gwangju-seatmap-pr-staging-review.json`
- Targeted staging report: `reports/stadium/gwangju-seatmap-targeted-staging.md`
- Targeted staging report JSON: `reports/stadium/gwangju-seatmap-targeted-staging.json`
- Staged scope audit: `reports/stadium/gwangju-seatmap-staged-scope-audit.md`
- Staged scope audit JSON: `reports/stadium/gwangju-seatmap-staged-scope-audit.json`
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
- active 113개 block은 모두 `OFFICIAL_IMAGE_TRACED`, `manualReviewed: true`, `PIXEL_ALIGNED` 상태여야 한다.
- 기본 111개 active block은 `manual-polygon-v86` / `FULL_ACTIVE_111_RETRACE` 세대로 고정하고, K7/AWAY 2개 aggregate는 기존 공식 traced 번호 블럭 subpath로만 구성한다.
- `manual-polygon-v85` 대비 재생성 결과는 trace manifest의 `previousTraceVersion`, `blocksChangedFromPreviousTrace`, `totalRetracePointDelta`, bbox/anchor/coverage delta, zone overlay crop 필드로 확인한다.
- `GWANGJU_ZONE_PRECISION_WORKSETS`는 P1 O/P 외야, P2 하단 내야 저마진 K7/K9, P3 특수석, P4 SKY_PICNIC/FIVE_TABLE 반복 블럭, P5 전체 113개 reference 재고정 순서를 고정한다.
- 일반 좌석 layer는 `GWANGJU_BLOCKS[].imageGeometry.d`만 hit-area로 렌더링하며 `GWANGJU_IMAGE_GEOMETRY_DRAFTS`, `GWANGJU_OFFICIAL_TRACE_REFERENCE`, operator template, marker-only zone은 런타임 hit-area source가 아니다. K7/AWAY aggregate는 `GWANGJU_BLOCKS`에 들어간 release-ready geometry만 filter 전용으로 렌더링한다.
- 런타임 SVG는 `GWANGJU_BLOCKS.map`과 `d={block.imageGeometry.d}`만 일반 좌석 `<path>` source로 사용한다.
- debug/active overlay는 hit-area polygon을 과장하지 않도록 stroke width `1~1.5px`만 사용하고, `101~108`, `116~127`, `A/B/C/G/H/I/J/K` 및 `S-*` 같은 작은 블럭은 selected 상태에서 `0.75px` stroke와 no-glow로 고정한다. debug mode에서는 공식 PNG 라벨과 중복되는 block text를 전부 렌더링하지 않는다.
- browser selected paint audit는 `J`, `I`, `H`를 각각 클릭한 뒤 `strokeInflationToScreenHeightRatio <= 0.22`, `strokeWidth <= 1`, no glow filter, label point top-hit 자기 블럭 조건을 검사하고 crop evidence를 남긴다.
- lower infield selected sweep은 `101~108`, `J`, `I`, `H` label point를 순서대로 실제 클릭하고, 각 클릭 후 selected id, label top-hit, selected stroke ratio, 주변 lower-infield label 침범 여부를 `gwangju-lower-infield-selected-sweep-*.json/.md`와 per-target crop으로 남긴다.
- third-base selected sweep은 `116~127`, `A`, `B`, `C`, `G`, `H`, `I`, `J`, `K` label point를 순서대로 실제 클릭하고, 각 클릭 후 selected id, label top-hit, selected stroke ratio, 주변 third-base lower-infield label 침범 여부를 `gwangju-thirdbase-selected-sweep-*.json/.md`와 per-target crop으로 남긴다.
- runtime layer audit은 브라우저에 렌더링된 113개 `gwangju-seat-block-*` path의 `d` 값을 trace manifest `blocks[].path`와 비교하며 `pathMismatchCount=0`, `forbiddenRenderedIds=0`, `labelTopHitFailureCount=0` 상태를 요구한다.
- `GWANGJU_NON_SELECTABLE_MARKER_ZONES`는 좌석 `<path>`가 아니라 차단용 marker layer이며 block detail 선택 대상이 아니다.
- K7/AWAY block-range는 기존 번호 블럭 polygon과 공식 derived aggregate polygon에 연결한다.
- K7/AWAY aggregate polygon 좌표를 추정하거나 색상만 보고 생성하지 않고, 기존 공식 traced 번호 블럭 subpath만 합성한다.
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
npm run stadium:gwangju:targeted-staging
npm run stadium:gwangju:staged-scope-audit
npm run stadium:gwangju:release-audit
```

Commit readiness after explicit targeted staging:

```bash
npm run stadium:gwangju:commit-readiness
```

`commit-readiness`는 `targeted-staging -> staged-scope-audit --require-complete -> release-audit` 순서이다. 수동 `git add -- <40 target files>` 전에는 `STAGED_TARGET_FILE_MISSING`으로 실패하는 것이 정상이고, 40개 target file이 모두 staged 된 뒤에만 통과해야 한다.

최종 판정은 preoperator 통과 + official derived aggregate release + scope guard 통과 상태를 함께 확인한다.

Release gate 내부 실행 순서:

```bash
npm run stadium:gwangju:operator-status
npm run test:stadium:seatmaps
npm run qa:stadium:gwangju:trace-review
npm run stadium:gwangju:release-package
npm run build
```

릴리즈 차단 조건:

- `activeBlocks`가 `113`이 아니다.
- `officialImageTracedBlocks`, `directOfficialTraceBlocks`, `manualReviewedBlocks`, `pixelAlignedBlocks` 중 하나라도 `113`이 아니다.
- `overlapWarnings`가 `0`이 아니다.
- `componentCoverageWarnings`가 `0`이 아니다.
- O/P 외야 계열의 official component recall이 `0.78` 미만이거나 component IoU가 `0.62` 미만이다.
- `GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE`가 `true`가 아니다.
- K7 block-range가 `107~111`, `118~122`와 다르다.
- `K7석` 필터가 `home-k7-seats` aggregate hit-area를 노출하지 않거나 source K7 번호 블럭을 숨기지 않는다.
- 원정응원석 block-range가 `107~110`과 다르다.
- 홈 응원석 block-range가 `118~122`와 다르다.
- `111`이 `fanRole: NEUTRAL`이 아니거나 응원석 필터에 포함된다.
- `home-k7-seats`, `away-cheering-seats`가 기존 공식 traced 번호 블럭 subpath 외 좌표를 사용한다.
- 브라우저 QA에서 K7/AWAY filter top-hit 계약이 깨진다.
- release package가 `ready`가 아니거나 `activeBlocks=113`, `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`, `status=ready`, `browser QA passed` 중 하나를 잃는다.
- release gate가 `passed`가 아니거나 `operator-status -> seatmap tests -> trace-review QA -> release-package -> build` 순서를 잃는다.
- runtime layer audit이 `passed`가 아니거나 렌더링 path와 trace manifest path가 달라진다.
- release audit가 `passed`가 아니거나 release gate/package/status/trace/browser QA/handoff 산출물 stale 상태를 감지한다.
- release verify가 `release-gate -> targeted-staging -> staged-scope-audit -> release-audit` 순서를 잃는다.
- release scope guard가 광주 release package와 Daegu/Daejeon/Sajik/Suwon 분리 범위를 구분하지 못하거나 알 수 없는 dirty file을 감지한다.
- PR packaging manifest가 광주 release 후보 40개, separate dirty work baseline 95개, runtime classified separate dirty work, unexpected 0, blockers 0 기준을 한 문서로 고정하지 못한다.
- release scope guard의 release candidate inventory가 `expectedIncludedFileCount=40`, `actualIncludedFileCount=40`, `missingExpectedIncludedFiles=[]`, `extraIncludedFiles=[]` 상태를 잃는다.
- release scope guard의 separate work inventory가 `expectedSeparateDirtyWorkCount baseline=95`, `classifiedSeparateDirtyWorkExpansionAllowed=true` 상태를 잃거나 classified separate dirty work를 blocker로 처리한다.
- release scope guard의 `prPackagingManifest.releasePayloadFileCount=40`, `separateDirtyWorkFileCount=<runtime>`, `unexpectedDirtyFileCount=0`, `inventoryDriftCount=0` 상태를 잃는다.
- release scope guard의 `patchSeparationReadiness.status=ready-or-review-required` 상태를 잃거나 clean release payload files are not packaging blockers 계약을 숨긴다.
- patch separation readiness가 release payload files have unreviewed mixed or untracked diffs 상태에서만 review-required가 됨을 문서화하지 않는다.
- PR staging plan이 `stagingPlan.status=ready-or-review-required`, `stagingPlan.doesNotRunGitAdd=true`, `stagingPlan.safeToRunBulkGitAdd=false`, `stagingPlan.releasePayloadFileCount=40`, `stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true` 계약을 잃는다.
- PR staging review가 `stagingReview.status=ready-or-review-required`, `stagingReview.doesNotRunGitAdd=true`, `stagingReview.safeToRunBulkGitAdd=false`, `stagingReview.releasePayloadFileCount=40`, `stagingReview.recommendsOnlyIncludedFiles=true`, `stagingReview.doesNotRecommendSeparateDirtyWork=true` 계약을 잃는다.
- targeted staging report가 `targetedStaging.status=ready`, `targetedStaging.doesNotRunGitAdd=true`, `targetedStaging.safeToRunBulkGitAdd=false`, `targetedStaging.targetFileCount=40`, `targetedStaging.reviewedUntrackedSatisfiedFileCount=2` 계약을 잃는다.
- targeted staging report가 separate dirty work를 staging 대상으로 추천하거나 `git add .`, `git add -A`, `git commit -am`을 허용한다.
- staged scope audit가 `stagedScopeAudit.status=ready`, `stagedScopeAudit.doesNotRunGitAdd=true`, `stagedScopeAudit.safeToRunBulkGitAdd=false`, `stagedScopeAudit.expectedTargetFileCount=40`, `stagedScopeAudit.stagedOutsideTargetFileCount=0`, `stagedScopeAudit.stagedSeparateDirtyWorkFileCount=0` 계약을 잃는다.
- staged scope audit가 targeted staging 파일 외 staged 파일이나 separate dirty work staged 파일을 허용한다.
- commit-readiness가 `--require-complete` strict mode를 잃거나, 명시적 40-file staging 전 `STAGED_TARGET_FILE_MISSING`으로 실패하지 않는다.
- commit-readiness가 모든 targeted file staged 이후 `stagedScopeAudit.requireComplete=true`, `stagedScopeAudit.missingStagedTargetFileCount=0`, `readyForCommit=true` 계약을 고정하지 못한다.
- release verify가 `activeBlocks=113`, `operatorStatus=ready`, `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE` 중 하나를 잃는다.
- post-operator independent polygon acceptance는 별도 non-overlap operator target이 추가된 경우에만 실행한다.
- operator input aid가 `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON` 정책을 잃거나 reference bbox를 K7/AWAY aggregate polygon으로 취급한다.
- operator input packet이 `blocked`, `ready_for_operator_input`, `operator_input_present`, `ready_for_prewrite` 외 상태를 쓰거나 reference bbox를 K7/AWAY aggregate polygon으로 취급한다.
- 외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사가 사용된다.

## 최종 검증 결과

검증 실행일: 2026-05-15 KST

- `npm run stadium:gwangju:operator-status`: PASS
  - `status=ready`
  - `pending=0`
  - `validDataDiff=2`
  - `blockers=0`
- `npm run test:stadium:seatmaps`: 광주 계약 PASS
  - 광주 K7/원정응원석 block-range, fanRole 필터, 공식 derived aggregate 계약 포함
- `npm run qa:stadium:gwangju:trace-review`: PASS
  - `activeBlocks=113`
  - `traceVersion=manual-polygon-v86`
  - `traceGeneration=FULL_ACTIVE_111_RETRACE`
  - `fullRetracedBlocks=113`
  - `blocksChangedFromPreviousTrace=113`
  - `totalRetracePointDelta=7184`
  - `officialImageTracedBlocks=113`
  - `manualReviewedBlocks=113`
  - `pixelAlignedBlocks=113`
  - `overlapWarnings=0`
  - `componentCoverageWarnings=0`
  - `minimumPixelCoverageRatio=1.0000`
  - `minimumOfficialComponentRecall=1.0000`
  - `minimumComponentIoU=0.9255`
  - `repeatedNumberedBlockMinimumPixelCoverageRatio=1.0000`
  - mobile 390, desktop 1440 isolated QA passed
- `npm run stadium:gwangju:release-package`: PASS
  - `status=ready`
  - `blockers=0`
  - `activeBlocks=113`
  - `derivedRanges=3`
- `npm run qa:stadium:gwangju:release-gate`: PASS
  - `status=passed`
  - `blockers=0`
  - `steps=5/5`
  - `releasePackageStatus=ready`
  - `operatorStatus=ready`
  - `browserQaStatus=passed`
  - `runtimeLayerAuditStatus=passed`
  - `activeTraceBlocks=113`
- `npm run qa:stadium:gwangju:runtime-layer`: PASS
  - `status=passed`
  - `renderedPathCount=113`
  - `pathMismatchCount=0`
  - `forbiddenRenderedIds=0`
  - `labelTopHitFailureCount=0`
- `npm run stadium:gwangju:release-audit`: PASS
  - `status=passed`
  - `blockers=0`
  - `stale=0`
  - `scopeGuardStatus=passed`
  - `scopeGuardIncludedFiles=40`
  - `scopeGuardSeparateDirtyWorkFiles=<runtime>`
  - `scopeGuardSeparateDirtyWorkBaselineFiles=95`
  - `classifiedSeparateDirtyWorkExpansionAllowed=true`
  - `scopeGuardUnexpectedFiles=0`
  - `scopeGuardBlockers=0`
- `npm run stadium:gwangju:release-scope-guard`: PASS
  - `status=passed`
  - `included=40`
  - `separate=<runtime>`
  - `unexpected=0`
  - `inventoryDrift=0`
  - `prPackagingManifest.releasePayloadFileCount=40`
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
  - `stagingPlan.releasePayloadFileCount=40`
  - `stagingPlan.separateDirtyWorkFileCount=<runtime>`
  - `stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true`
- `npm run stadium:gwangju:pr-staging-review`: PASS
  - `stagingReview.status=ready-or-review-required`
  - `stagingReview.doesNotRunGitAdd=true`
  - `stagingReview.safeToRunBulkGitAdd=false`
  - `stagingReview.releasePayloadFileCount=40`
  - `stagingReview.recommendsOnlyIncludedFiles=true`
  - `stagingReview.doesNotRecommendSeparateDirtyWork=true`
  - current status: `ready`
  - `blockers=0`
  - `reviewClassCounts.ready-to-stage=<runtime>`
  - `reviewClassCounts.untracked-review-required=0`
  - reviewed expected untracked release files: `scripts/gwangju-seatmap-core-qa.mjs`, `scripts/gwangju-seatmap-evidence-workset-ops.mjs`, `scripts/gwangju-seatmap-operator-template-ops.mjs`, `scripts/gwangju-seatmap-operator-intake-write-ops.mjs`, `scripts/gwangju-seatmap-release-staging-ops.mjs`
- `npm run stadium:gwangju:targeted-staging`: PASS
  - `targetedStaging.status=ready`
  - `targetedStaging.doesNotRunGitAdd=true`
  - `targetedStaging.safeToRunBulkGitAdd=false`
  - `targetedStaging.targetFileCount=40`
  - `targetedStaging.reviewedUntrackedSatisfiedFileCount=2`
  - targeted staging excludes separate dirty work and recommends only explicit included release files.
- `npm run stadium:gwangju:staged-scope-audit`: PASS
  - `stagedScopeAudit.status=ready`
  - `stagedScopeAudit.requireComplete=false`
  - `stagedScopeAudit.doesNotRunGitAdd=true`
  - `stagedScopeAudit.safeToRunBulkGitAdd=false`
  - `stagedScopeAudit.expectedTargetFileCount=40`
  - `stagedScopeAudit.missingStagedTargetFileCount=<dirty-target-count>` before explicit staging
  - `stagedScopeAudit.stagedOutsideTargetFileCount=0`
  - `stagedScopeAudit.stagedSeparateDirtyWorkFileCount=0`
  - staged scope audit blocks staged files outside targeted staging and separate dirty work.
- `npm run stadium:gwangju:commit-readiness`: BLOCKED EXPECTED before explicit staging, PASS only after all dirty target files are staged.
  - strict mode: `--require-complete`
  - pre-staging blocker: `STAGED_TARGET_FILE_MISSING`
  - commit-ready state: `stagedScopeAudit.requireComplete=true`
  - commit-ready state: `stagedScopeAudit.missingStagedTargetFileCount=0`
  - commit-ready state: `readyForCommit=true`
- `npm run qa:stadium:gwangju:release-verify:postoperator`: 별도 non-overlap operator target 추가 시 사용
  - current K7/AWAY aggregate release is already active at `activeBlocks=113`
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
  - `trace-manifest -> runtime-layer -> release-gate -> targeted-staging -> staged-scope-audit -> release-audit`
  - `status=passed`
  - `blockers=0`
  - `stale=0`
- `npm run qa:stadium:gwangju:release-verify:preoperator`: PASS
  - `activeBlocks=113`
  - `operatorStatus=ready`
  - `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`
- `npm run qa:stadium:gwangju:release-verify:postoperator`: 별도 non-overlap operator target 추가 시 사용
- `npm run build`: PASS
  - 기존 `clientErrorReporter.ts` dynamic/static import warning은 exit code 0이면 release lock 차단 조건으로 보지 않는다.

## 남은 작업

- `home-k7-seats`와 `away-cheering-seats`는 공식 PNG `2200x1159` 기준 기존 번호 블럭 subpath를 합성한 READY 상태다.
- 현재 정상 상태는 `activeBlocks=113`, `operatorStatus=ready`, `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`이다.
- 현재 K7석 derived range와 원정응원석 derived range는 `107~110`을 공유하는 중첩 필터 모델이다. 이 중첩은 공식 derived aggregate filter에서만 허용되며, 별도 non-overlap operator target을 추가할 때는 중첩을 다시 검토한다.
- 향후 같은 `officialBlocks`를 공유하는 독립 polygon 승격 입력은 `OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP`으로 차단한다.
- 추가 독립 polygon이 필요하면 실제 클릭 대상이 필요한 non-overlap operator target으로 모델을 먼저 분리한다.

## PR 포함 범위

- 포함: 이 문서, `docs/gwangju-seatmap-release-handoff.md`, 광주 K7/AWAY block-range 테스트 계약, trace/status 산출물.
- 제외: K7/AWAY 외 신규 operator target 생성, 외부 야구 데이터 보강.
- 추가 독립 polygon 승격은 operator template에 공식 PNG 기준 좌표가 입력되고 strict validation, apply-plan, write-smoke, write-guard, postwrite gate가 모두 통과한 뒤 별도 작업으로 처리한다.
