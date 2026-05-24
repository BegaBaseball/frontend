# 광주 K7/원정응원석 운영자 좌표 승격 Runbook

## 목적

광주 기본 111개 블럭은 공식 PNG 기준 `manual-polygon-v96` / `FULL_ACTIVE_111_RETRACE` 세대로 구역별 재검수되어 있다. 2026-05-11 운영자 입력으로 `K7석`은 `107~111`, `118~122`, `원정응원석`은 `107~110` 번호 블럭 범위로 확정했다. 현재 production data는 이 공식 번호 블럭 polygon을 multi-subpath aggregate로 묶어 `home-k7-seats`, `away-cheering-seats` filter 전용 hit-area를 제공하므로 active block 수는 `113`이다.

trace manifest는 `previousTraceVersion=manual-polygon-v95`, `baseTracedBlocks=111`, `activeBlocks=113`, `fullRetracedBlocks=113`, `blocksChangedFromPreviousTrace=113`, bbox/anchor/coverage delta, zone precision workset, zone crop, O/P component recall/IoU gate 결과를 남긴다. 101~109 하단 내야 구간은 trace manifest 전 `gwangju-seatmap-image-alignment-audit`로 `officialBlockMaskRecall`, `componentIoU`, `outsideBleedRatio`를 확인한다. 101~127 번호 내야 구간은 `official-numbered-component-mask`, `official-numbered-boundary-mask`, `official-numbered-independent-visual-reference`로 전수 검수한다. v77에서는 `gwangju-seatmap-lower-infield-independent-audit`를 추가해 1루 `101~108/H/I/J`와 3루 `H/I/J` visible polygon을 공식 PNG crop 독립 reference로 다시 확인하고, H/J/I처럼 맞닿는 구역은 browser visual polygon과 non-overlap hit-area를 분리한다. v78에서는 3루 `126`을 공식 PNG `121~127` crop에서 125와의 shared edge 기준으로 다시 찍었고, v79/v80에서는 `127`의 오른쪽/하단 과대 hit-area를 단계적으로 줄여 `G/J/H/S-335/533~535` sampled overlap 0을 유지하는 reference로 고정했다. v84에서는 3루 `S-333~335`, `121~125`의 기존 polygon을 폐기하고 공식 PNG crop에서 다시 트레이싱한 뒤 독립 visual reference로 검수했고, v85에서는 `126/127` hit-area를 같은 공식 crop의 불규칙 coral 경계 기준으로 다시 배치했으며, v86에서는 `126/127`도 공식 표시 경계 `visualD`와 non-overlap hit-area를 분리해 `official-png-crop-121-127-shared-boundary-v86`으로 고정한다. v96에서는 121~127 전체를 같은 원칙으로 재분리해 브라우저 visual은 공식 PNG 독립 reference를 따르고 click hit-area는 G/H/I/J/S-335/533~535와 겹치지 않는 비간섭 polygon으로 고정한다. v70 이후 3루 `123~127`은 `NUMBERED_INFIELD_MANUAL_MASK_REFERENCES`에서 분리해 독립 visual reference로 검수하고, G/H/I/J/S-335/533~535 forbidden adjacency overlap을 1px sample 기준 `0`으로 차단한다. J/I/H 하단 특수석은 101~108 polygon 배치 후 좌표 복사 mask가 아니라 공식 PNG 색상에서 추출한 `official-alphabet-section-mask`로 독립 mask recall/IoU/outside bleed를 확인한다. 같은 audit는 `lower-infield-special-split` evidence로 공식 PNG crop, 101~108 번호 블럭 only overlay, J/I/H 특수석 only overlay, 전체 overlay, numbered-vs-special overlap heatmap을 남기며 두 layer의 sampled overlap이 1개라도 있으면 release를 차단한다.

v71에서는 3루 `I`를 기존 하단 작은 polygon 복사 mask에서 상단 공식 PNG 색상 component `[[0,2]]` row-envelope와 하단 marker subpath의 multi-subpath로 재산출해 bbox `438,204,607,362`, subpath `2`로 고정한다. v72에서는 3루 `J`를 아이콘 둘레가 아니라 공식 PNG에서 보이는 J 띠 영역으로 재트레이싱해 bbox `430,353,489,398`로 고정한다. v73에서는 3루 `H`를 공식 빨간 component row-envelope 3px 간격으로 재산출해 bbox `569,158,692,305`로 고정한다. 이 단계는 123~127, H, J, 533~535 exclusion ring을 먼저 적용한 뒤 남는 공식 PNG I 색상 component만 사용한다.

브라우저 실제 렌더링은 `qa:stadium:gwangju:trace-review`/`qa:stadium:gwangju:mobile` 실행 시 `output/playwright/stadium-ux-gwangju-validate/gwangju-browser-coordinate-audit-<viewport>.json`과 `gwangju-browser-101-108-h-i-j-browser-coordinate-crop-*.png`로 별도 확인한다. 이 JSON은 SVG `viewBox`, 공식 PNG `<image>` bbox/preserveAspectRatio, 101~108/H/I/J path local bbox와 screen rect를 함께 남겨서 “테스트 통과 = 브라우저 렌더링 일치”가 깨지는 경우를 분리한다.

3루 하단 보정은 공식 PNG crop에서 `third-family-seats`가 `569,158,692,305` bbox 안의 빨간 row-envelope임을 기준으로 한다. `third-family-seats` mask는 `k5-126`, `k5-127`을 제외한 공식 색상 row-envelope이고, `k5-126`은 `[[535,298],[570,296],[626,309],[683,319],[674,356],[506,326],[526,318]]`, `k5-127`은 `[[678,239],[692,235],[690,257],[685,301],[679,313],[663,304],[661,280],[669,247]]` 번호 mask를 사용해 H 영역과 533/534 상단 방향을 침범하지 않도록 잠근다. 이 보정은 기본 111개 좌표와 K7/AWAY aggregate filter 계약을 바꾸지 않는다.

후속 3루 `I/J` 보정은 공식 PNG crop에서 보이는 marker/strip 외곽을 기준으로 한다. v71에서 `third-wheelchair-seats`는 공식 PNG 색상 component `[[0,2]]` row-envelope와 하단 marker subpath bbox `438,204,607,362`로 잠그고, v72에서 `party-seats-third`는 `[[430,389],[438,374],[452,363],[470,353],[482,356],[489,365],[489,371],[467,398],[446,394]]`로 잠그며, 두 label center가 서로의 hit-area에 들어가면 release를 차단한다.

현재 `home-k7-seats`, `away-cheering-seats`는 새 좌표를 추정한 독립 polygon이 아니라 공식 PNG 기준 기존 번호 블럭 polygon을 합성한 `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE` 상태다. 별도의 non-overlap 운영자 polygon이 필요해지는 경우에만 아래 좌표 입력 자동화 경로를 다시 사용한다.

## 좌표 입력 원칙

- 허용 좌표계: `gwangju-kia-seatmap-official-2026.png` 원본 `2200x1159`.
- 허용 소스: operator-provided official PNG coordinates only.
- 금지 소스: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images.
- 야구 운영 데이터가 비어 있거나 불명확하면 `MANUAL_BASEBALL_DATA_REQUIRED`로 남기고 추정하지 않는다.

## 작업 순서

### 현재 확정된 block-range 경로

1. 운영자가 제공한 범위만 반영한다.
   - `K7석`: `107`, `108`, `109`, `110`, `111`, `118`, `119`, `120`, `121`, `122`
   - `원정응원석`: `107`, `108`, `109`, `110`
   - `홈 응원석`: `118`, `119`, `120`, `121`, `122`
2. 기존 번호 블럭 polygon id를 `K7` 카테고리로 연결하고, `107~110`은 `fanRole: AWAY`, `118~122`는 `fanRole: HOME`, `111`은 `fanRole: NEUTRAL`로 둔다.
3. `officialBlocks`는 번호 블럭과 aggregate official block을 함께 유지한다. `K7석`, `원정응원석` aggregate는 기존 번호 블럭 subpath를 합성한 filter 전용 hit-area다.
4. UI 필터는 category와 fanRole을 함께 본다.
   - `내야석`: K7 `107~111`, `118~122` 전체를 포함한다.
   - `K7석`: `home-k7-seats` aggregate hit-area를 노출하고 source 번호 블럭 hit-area는 해당 필터에서 숨긴다.
   - `응원석`: `fanRole: HOME/AWAY`인 K7 `107~110`, `118~122`만 포함하고 neutral `111`은 제외한다.
   - `홈 응원석`: K7 `118~122`만 포함한다.
   - `원정응원석`: `away-cheering-seats` aggregate hit-area를 노출하고 source `107~110` 번호 블럭 hit-area는 해당 필터에서 숨긴다.
5. 선택된 파생 필터는 `displayBlocks` 요약을 표시한다.
   - `K7석`: `107~111`, `118~122`
   - `홈 응원석`: `118~122`
   - `원정응원석`: `107~110`
6. 현재 최종 trace 기준은 기본 111개 + 공식 derived aggregate 2개, 총 active 113개이다.
7. 현재 최종 릴리즈 검증은 pre-operator 기준 `npm run qa:stadium:gwangju:release-verify` 또는 명시 alias `npm run qa:stadium:gwangju:release-verify:preoperator`로 실행한다.
8. 개별 확인이 필요하면 `npm run qa:stadium:gwangju:release-gate`, `npm run stadium:gwangju:release-audit` 순서로 실행한다.
9. 운영자 좌표 입력 준비 자료는 `npm run stadium:gwangju:operator-input-aid`로 생성한다. 현재 production data에서는 `status=ready_for_operator_input`이고, `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON` 정책을 유지해야 한다.
10. 좌표 입력자가 보는 단일 패킷은 `npm run stadium:gwangju:operator-input-packet`으로 생성한다. 현재 production data에서는 `status=ready_for_operator_input`, `inputPresentSections=0`, `readyForPrewrite=false`가 정상이다.
11. 전체 intake 묶음은 `npm run stadium:gwangju:operator-intake`이며 `operator-handoff -> operator-input-aid -> operator-input-packet` 순서로 실행한다.
12. post-operator 독립 polygon skeleton은 별도 non-overlap 운영자 target을 추가할 때만 사용한다. 현재 K7/AWAY는 공식 번호 블럭 aggregate READY 상태로 관리한다.

### 후속 독립 polygon 입력 경로

1. `npm run stadium:gwangju:operator-handoff`를 실행해 trace review, template, validation, apply-plan, handoff 산출물을 갱신한다. 이때 기존 template의 `operatorInput`은 section id 기준으로 보존된다.
2. `npm run stadium:gwangju:operator-input-aid`를 실행해 K7/AWAY reference block, anchor, bbox, clean crop 경로를 확인한다.
3. `npm run stadium:gwangju:operator-input-packet`을 실행해 trace/template/input-aid/status/apply-plan을 한 파일에서 확인한다.
4. input-aid와 input-packet의 bbox는 `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON` 참고값이다. 이 bbox를 aggregate polygon으로 복사하지 않는다.
5. `reports/stadium/gwangju-seatmap-operator-template.json`에서 `K7석`, `원정응원석`의 `operatorInput`을 채운다.
6. `operatorInput.points`는 공식 PNG 좌표 `[x, y]` 배열로 입력하고, `labelX`, `labelY`는 polygon 내부 label anchor로 입력한다.
7. `officialBlocks`, `level`, `side`, `fanRole`, `shortLabel`, `reviewer`, `reviewedAt`을 함께 채운다.
8. `home-k7-seats`와 `away-cheering-seats`의 `officialBlocks`는 서로 겹치면 안 된다. 현재 K7석 derived range(`107~111`, `118~122`)와 원정응원석 derived range(`107~110`)는 중첩 필터 모델이므로, 그대로 독립 polygon 두 개로 승격하는 입력은 `OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP`으로 차단된다.
9. 독립 polygon 승격이 필요하면 K7 전체는 계속 derived-only로 두고, 실제 hit-area가 필요한 non-overlap 구역만 별도 operator target으로 분리한 뒤 진행한다.
10. 입력 후 `npm run stadium:gwangju:operator-input-packet`을 다시 실행하면 write 전 상태는 `operator_input_present`가 된다.
11. `npm run stadium:gwangju:operator-template:validate:strict`를 실행한다.
12. `npm run stadium:gwangju:operator-template:apply-plan:require-ready`를 실행한다.
13. `npm run stadium:gwangju:operator-status`를 실행해 `ready`인지 확인한다.
14. strict/apply-plan/status가 모두 ready이면 input-packet은 `ready_for_prewrite`가 되어야 한다.
15. `npm run stadium:gwangju:operator-apply`를 실행해 dry-run apply 보고서가 두 구역을 승격 후보로 계산하는지 확인한다. 이 명령은 data file을 수정하지 않는다.
16. `npm run stadium:gwangju:operator-write-smoke`를 실행해 synthetic 입력이 isolated report directory에서 ready 경로를 통과하고, 실제 apply write path가 임시 data file에서만 동작하며, production data/template을 바꾸지 않는지 확인한다.
17. `npm run stadium:gwangju:operator-write-guard:require-ready`를 실행한다.
18. guard가 통과하면 `npm run stadium:gwangju:operator-apply:write`로 `validForDataDiff=true`인 두 구역만 `gwangjuSeatData.ts`에 승격한다.
19. 승격 후 `npm run stadium:gwangju:operator-postwrite-gate`를 실행한다.
20. postwrite gate 통과 후 `npm run qa:stadium:gwangju:release-verify:postoperator`를 실행해 `POST_OPERATOR_POLYGON_APPLIED_RELEASE` 기준을 확인한다.

## 상태 해석

- `blocked`: 필수 리포트 누락, trace 기준 실패, validation 실패, apply-plan blocker, handoff blocker가 있다.
- `pending`: trace는 안전하지만 독립 K7/원정응원석 polygon 입력, strict validation, ready apply-plan, valid data diff 중 하나가 아직 남아 있다.
- `ready`: 두 운영자 polygon 구역 모두 strict validation과 apply-plan ready 조건을 통과해 data diff 후보가 있다.
- block-range 반영 상태의 trace 기준은 active 113개이다.
- K7/AWAY aggregate 기준은 active 113개, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`, 기존 111개 traced block 무수정 상태이다.
- 별도 non-overlap operator target을 새로 추가하는 경우에만 `operator-apply:write`와 `operator-postwrite-gate` 경로를 사용한다.

## 승격 전 Guard

- `npm run stadium:gwangju:operator-write-smoke`는 synthetic K7/AWAY 입력을 `reports/stadium/gwangju-seatmap-operator-write-smoke/` 안에서만 사용한다.
- smoke 입력 좌표는 production 야구 데이터가 아니며 실제 좌표로 복사하거나 승격하면 안 된다.
- smoke는 production `gwangjuSeatData.ts`와 production operator template이 변경되지 않았음을 해시로 확인한다.
- smoke는 임시 `gwangjuSeatData.smoke.ts` 복사본에만 `scripts/gwangju-seatmap-operator-intake-write-ops.mjs operator-apply --write --require-ready --allow-synthetic-smoke`를 실행해 write path를 검증한다.
- `npm run stadium:gwangju:operator-write-guard`는 현재 상태 보고서와 smoke 결과를 읽어 `blocked` 또는 `ok` 보고서를 만든다.
- `npm run stadium:gwangju:operator-write-guard:require-ready`는 blocked 상태면 실패해야 한다. 독립 K7/AWAY polygon 입력이 비어 있으면 실패하는 것이 정상이다.
- `npm run stadium:gwangju:operator-prewrite-gate`는 좌표 입력 완료 후 data diff 직전에 실행하는 묶음 명령이다.
- `npm run stadium:gwangju:operator-apply:write`는 `operator-prewrite-gate` 통과 뒤에만 production write를 수행한다.
- `npm run stadium:gwangju:operator-postwrite-gate`는 승격 후 handoff/status, seatmap test, 광주 trace QA, build를 다시 실행한다.
- `npm run stadium:gwangju:operator-input-aid`는 `gwangju-seatmap-operator-input-aid.json/.csv/.md`를 생성하며 data file을 수정하지 않는다.
- input-aid의 reference block bbox, anchor, clean crop은 operator 입력 보조 자료이고, aggregate K7/AWAY polygon 좌표가 아니다.
- `npm run stadium:gwangju:operator-input-packet`은 trace review, operator template, input-aid, status, validation, apply-plan을 묶어 `gwangju-seatmap-operator-input-packet.json/.md`를 생성하며 data file을 수정하지 않는다.
- input-packet 상태값은 `blocked`, `ready_for_operator_input`, `operator_input_present`, `ready_for_prewrite`만 허용한다.
- `npm run stadium:gwangju:operator-intake`는 운영자 입력 전 갱신용 묶음이며 `operator-handoff -> operator-input-aid -> operator-input-packet` 순서이다.
- `npm run stadium:gwangju:release-package`는 현재 산출물과 browser QA summary를 묶어 `ready/blocked`를 판단하며 data file을 수정하지 않는다.
- `npm run stadium:gwangju:release-audit`는 release gate/package/status/trace/browser QA/handoff JSON과 문서 계약만 빠르게 검사하며 data file을 수정하지 않는다.
- `npm run qa:stadium:gwangju:release-gate`는 `operator-status -> gwangju seatmap tests -> trace-review artifact validation -> release-package -> build`를 순서대로 실행하고 `reports/stadium/gwangju-seatmap-release-gate.json/.md`를 남긴다.
- `npm run qa:stadium:gwangju:release-verify`는 호환용 최종 명령이며 현재는 `release-verify:preoperator`를 실행한다.
- `npm run qa:stadium:gwangju:release-verify:preoperator`는 `trace-manifest -> runtime-layer -> release-gate -> release-audit` 순서로 active 113, operator ready, 공식 derived aggregate, stale=0 기준을 검증한다. 브라우저 모바일 QA는 `qa:stadium:gwangju:trace-review`의 기존 passed artifact를 release gate에서 검증한다.
- `npm run qa:stadium:gwangju:release-verify:postoperator`는 별도 non-overlap operator target 추가 작업에서만 사용한다.
- `docs/gwangju-seatmap-release-handoff.md`는 현재 release-ready 상태와 K7/AWAY 공식 derived aggregate filter 계약을 운영 인계용으로 고정한다.

## 산출물

- `docs/gwangju-seatmap-release-handoff.md`
- `reports/stadium/gwangju-seatmap-operator-template.json`
- `reports/stadium/gwangju-seatmap-operator-input-aid.json`
- `reports/stadium/gwangju-seatmap-operator-input-aid.csv`
- `reports/stadium/gwangju-seatmap-operator-input-aid.md`
- `reports/stadium/gwangju-seatmap-operator-input-packet.json`
- `reports/stadium/gwangju-seatmap-operator-input-packet.md`
- `reports/stadium/gwangju-seatmap-operator-template-validation.json`
- `reports/stadium/gwangju-seatmap-operator-template-apply-plan.json`
- `reports/stadium/gwangju-seatmap-operator-handoff.json`
- `reports/stadium/gwangju-seatmap-operator-status.json`
- `reports/stadium/gwangju-seatmap-release-package.json`
- `reports/stadium/gwangju-seatmap-release-gate.json`
- `reports/stadium/gwangju-seatmap-release-audit.json`
- `reports/stadium/gwangju-seatmap-postoperator-audit.json`
- `reports/stadium/gwangju-seatmap-postoperator-audit.md`
- `reports/stadium/gwangju-seatmap-operator-apply.json`
- `reports/stadium/gwangju-seatmap-operator-write-smoke/gwangju-seatmap-operator-write-smoke.json`
- `reports/stadium/gwangju-seatmap-operator-write-guard.json`
