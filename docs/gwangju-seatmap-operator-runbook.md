# 광주 K7/원정응원석 운영자 좌표 승격 Runbook

## 목적

광주 기본 111개 블럭은 공식 PNG 기준 `gwangju-precision-v1` / `GWANGJU_PRECISION_V1` 세대로 구역별 재검수되어 있다. 121~127 번호 블럭과 3루 `I/J/L` 블럭은 공식 PNG crop을 새로 분석한 `gwangju-seatmap-official-third-infield-trace` 경로로 production data와 QA 실행 경로에 복구했다. 2026-05-11 운영자 입력에서 유지되는 범위는 `K7석` `107~111`, `118~122`, `원정응원석` `107~110`이다. 현재 production data는 이 공식 번호 블럭 polygon을 multi-subpath aggregate로 묶어 `home-k7-seats`, `away-cheering-seats` filter 전용 hit-area를 제공하므로 active block 수는 `113`이다.

trace manifest는 `previousTraceVersion=manual-polygon-v113`, `baseTracedBlocks=111`, `activeBlocks=113`, `fullRetracedBlocks=113`, `blocksChangedFromPreviousTrace=113`, bbox/anchor/coverage delta, zone precision workset, zone crop, O/P component recall/IoU gate 결과를 남긴다. 101~127 번호 내야 구간은 `gwangju-seatmap-image-alignment-audit`의 `official-numbered-component-mask`와 `official-numbered-boundary-mask`로 검수한다. 과거 lower-infield independent audit는 Git history 복구 대상으로 내리고, 현재 릴리스 판단 owner는 core image-alignment audit 하나로 고정한다.

v106에서는 3루 `I/J`와 121~127을 archived candidate 좌표 없이 공식 PNG crop 기준으로 다시 트레이싱한다. 과거 3루 `I/J` candidate polygon은 production/QA/release evidence에서 제거했으며, 재사용하지 않는다.

브라우저 실제 렌더링은 `node scripts/stadium-seatmap-ops.mjs gwangju trace-review`/`npm run qa:stadium:gwangju:mobile` 실행 시 `output/playwright/stadium-ux-gwangju-validate/gwangju-browser-coordinate-audit-<viewport>.json`과 `gwangju-browser-101-108-h-i-j-browser-coordinate-crop-*.png`로 별도 확인한다. 이 JSON은 SVG `viewBox`, 공식 PNG `<image>` bbox/preserveAspectRatio, 101~108/H/I/J path local bbox와 screen rect를 함께 남겨서 “테스트 통과 = 브라우저 렌더링 일치”가 깨지는 경우를 분리한다.

3루 하단 보정은 공식 PNG crop에서 `third-family-seats`가 `569,158,692,307` bbox 안의 빨간 row-envelope임을 기준으로 한다. 복구된 121~127/I/J는 `gwangju-seatmap-official-third-infield-trace` 산출물과 selected-sweep 검증 경로에 포함한다.

후속 3루 보정이 필요하면 공식 PNG crop에서 보이는 marker/strip 외곽을 처음부터 다시 트레이싱한 뒤 별도 release로 승격한다. 과거 candidate/reference polygon을 복사해 production 또는 QA 근거로 사용하지 않는다.

현재 `home-k7-seats`, `away-cheering-seats`는 새 좌표를 추정한 독립 polygon이 아니라 공식 PNG 검수 번호 블럭 polygon을 합성한 `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE` 상태다. 별도의 non-overlap 운영자 polygon이 필요해지는 경우에만 아래 좌표 입력 자동화 경로를 다시 사용한다.

Precision v1 수동 보정은 `/internal/gwangju-seatmap-editor`에서 진행한다. editor는 공식 PNG natural 좌표계 `2200x1159`만 사용하고 repo 파일을 직접 쓰지 않으며, patch payload 검증은 `node scripts/stadium-seatmap-ops.mjs gwangju precision-editor-patch:validate`, 변경 계획 검토는 `node scripts/stadium-seatmap-ops.mjs gwangju precision-editor-patch:apply-plan`, 적용 후 계약 검증은 `node scripts/stadium-seatmap-ops.mjs gwangju precision-editor-patch:postwrite-gate`로 수행한다.

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
2. 공식 PNG 검수 번호 블럭 polygon id를 `K7` 카테고리로 연결하고, `107~110`은 `fanRole: AWAY`, `118~122`은 `fanRole: HOME`, `111`은 `fanRole: NEUTRAL`로 둔다.
3. `officialBlocks`는 번호 블럭과 aggregate official block을 함께 유지한다. `K7석`, `원정응원석` aggregate는 검수 완료 번호 블럭 subpath를 합성한 filter 전용 hit-area다.
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
7. 현재 최종 릴리즈 검증은 pre-operator 기준 `npm run qa:stadium:gwangju:release-verify` 또는 dispatcher 명령 `node scripts/stadium-seatmap-ops.mjs gwangju release-verify:preoperator`로 실행한다.
8. 개별 확인이 필요하면 `npm run qa:stadium:gwangju:release-gate`, `node scripts/stadium-seatmap-ops.mjs gwangju release-audit` 순서로 실행한다.
9. 운영자 좌표 입력 준비 자료는 `node scripts/stadium-seatmap-ops.mjs gwangju operator-input-aid`로 생성한다. 현재 production data에서는 `status=ready_for_operator_input`이고, `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON` 정책을 유지해야 한다.
10. 좌표 입력자가 보는 단일 패킷은 `node scripts/stadium-seatmap-ops.mjs gwangju operator-input-packet`으로 생성한다. 현재 production data에서는 `status=ready_for_operator_input`, `inputPresentSections=0`, `readyForPrewrite=false`가 정상이다.
11. 전체 intake 묶음은 `node scripts/stadium-seatmap-ops.mjs gwangju operator-intake`이며 `operator-handoff -> operator-input-aid -> operator-input-packet` 순서로 실행한다.
12. post-operator 독립 polygon skeleton은 별도 non-overlap 운영자 target을 추가할 때만 사용한다. 현재 K7/AWAY는 공식 번호 블럭 aggregate READY 상태로 관리한다.

### 후속 독립 polygon 입력 경로

1. `npm run stadium:gwangju:operator-handoff`를 실행해 trace review, template, validation, apply-plan, handoff 산출물을 갱신한다. 이때 기존 template의 `operatorInput`은 section id 기준으로 보존된다.
2. `node scripts/stadium-seatmap-ops.mjs gwangju operator-input-aid`를 실행해 K7/AWAY reference block, anchor, bbox, clean crop 경로를 확인한다.
3. `node scripts/stadium-seatmap-ops.mjs gwangju operator-input-packet`을 실행해 trace/template/input-aid/status/apply-plan을 한 파일에서 확인한다.
4. input-aid와 input-packet의 bbox는 `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON` 참고값이다. 이 bbox를 aggregate polygon으로 복사하지 않는다.
5. `reports/stadium/gwangju-seatmap-operator-template.json`에서 `K7석`, `원정응원석`의 `operatorInput`을 채운다.
6. `operatorInput.points`는 공식 PNG 좌표 `[x, y]` 배열로 입력하고, `labelX`, `labelY`는 polygon 내부 label anchor로 입력한다.
7. `officialBlocks`, `level`, `side`, `fanRole`, `shortLabel`, `reviewer`, `reviewedAt`을 함께 채운다.
8. `home-k7-seats`와 `away-cheering-seats`의 `officialBlocks`는 서로 겹치면 안 된다. 현재 K7석 derived range(`107~111`, `118~122`)와 원정응원석 derived range(`107~110`)는 중첩 필터 모델이므로, 그대로 독립 polygon 두 개로 승격하는 입력은 `OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP`으로 차단된다.
9. 독립 polygon 승격이 필요하면 K7 전체는 계속 derived-only로 두고, 실제 hit-area가 필요한 non-overlap 구역만 별도 operator target으로 분리한 뒤 진행한다.
10. 입력 후 `node scripts/stadium-seatmap-ops.mjs gwangju operator-input-packet`을 다시 실행하면 write 전 상태는 `operator_input_present`가 된다.
11. `node scripts/stadium-seatmap-ops.mjs gwangju operator-template:validate:strict`를 실행한다.
12. `node scripts/stadium-seatmap-ops.mjs gwangju operator-template:apply-plan:require-ready`를 실행한다.
13. `npm run stadium:gwangju:operator-status`를 실행해 `ready`인지 확인한다.
14. strict/apply-plan/status가 모두 ready이면 input-packet은 `ready_for_prewrite`가 되어야 한다.
15. `node scripts/stadium-seatmap-ops.mjs gwangju operator-apply`를 실행해 dry-run apply 보고서가 두 구역을 승격 후보로 계산하는지 확인한다. 이 명령은 data file을 수정하지 않는다.
16. `node scripts/stadium-seatmap-ops.mjs gwangju operator-write-smoke`를 실행해 synthetic 입력이 isolated report directory에서 ready 경로를 통과하고, 실제 apply write path가 임시 data file에서만 동작하며, production data/template을 바꾸지 않는지 확인한다.
17. `node scripts/stadium-seatmap-ops.mjs gwangju operator-write-guard:require-ready`를 실행한다.
18. guard가 통과하면 `node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write`로 `validForDataDiff=true`인 두 구역만 `gwangjuSeatData.ts`에 승격한다.
19. 승격 후 `node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate`를 실행한다.
20. postwrite gate 통과 후 `node scripts/stadium-seatmap-ops.mjs gwangju release-verify:postoperator`를 실행해 `POST_OPERATOR_POLYGON_APPLIED_RELEASE` 기준을 확인한다.

## 상태 해석

- `blocked`: 필수 리포트 누락, trace 기준 실패, validation 실패, apply-plan blocker, handoff blocker가 있다.
- `pending`: trace는 안전하지만 독립 K7/원정응원석 polygon 입력, strict validation, ready apply-plan, valid data diff 중 하나가 아직 남아 있다.
- `ready`: 두 운영자 polygon 구역 모두 strict validation과 apply-plan ready 조건을 통과해 data diff 후보가 있다.
- block-range 반영 상태의 trace 기준은 active 113개이다.
- K7/AWAY aggregate 기준은 active 113개, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`, 기본 111개 traced block 유지 상태이다.
- 별도 non-overlap operator target을 새로 추가하는 경우에만 `operator-apply:write`와 `operator-postwrite-gate` 경로를 사용한다.

## 승격 전 Guard

- `node scripts/stadium-seatmap-ops.mjs gwangju operator-write-smoke`는 synthetic K7/AWAY 입력을 `reports/stadium/gwangju-seatmap-operator-write-smoke/` 안에서만 사용한다.
- smoke 입력 좌표는 production 야구 데이터가 아니며 실제 좌표로 복사하거나 승격하면 안 된다.
- smoke는 production `gwangjuSeatData.ts`와 production operator template이 변경되지 않았음을 해시로 확인한다.
- smoke는 임시 `gwangjuSeatData.smoke.ts` 복사본에만 `scripts/gwangju-seatmap-operator-intake-write-ops.mjs operator-apply --write --require-ready --allow-synthetic-smoke`를 실행해 write path를 검증한다.
- `node scripts/stadium-seatmap-ops.mjs gwangju operator-write-guard`는 현재 상태 보고서와 smoke 결과를 읽어 `blocked` 또는 `ok` 보고서를 만든다.
- `node scripts/stadium-seatmap-ops.mjs gwangju operator-write-guard:require-ready`는 blocked 상태면 실패해야 한다. 독립 K7/AWAY polygon 입력이 비어 있으면 실패하는 것이 정상이다.
- `node scripts/stadium-seatmap-ops.mjs gwangju operator-prewrite-gate`는 좌표 입력 완료 후 data diff 직전에 실행하는 묶음 명령이다.
- `node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write`는 `operator-prewrite-gate` 통과 뒤에만 production write를 수행한다.
- `node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate`는 승격 후 handoff/status, seatmap test, 광주 trace QA, build를 다시 실행한다.
- `node scripts/stadium-seatmap-ops.mjs gwangju operator-input-aid`는 `gwangju-seatmap-operator-input-aid.json/.csv/.md`를 생성하며 data file을 수정하지 않는다.
- input-aid의 reference block bbox, anchor, clean crop은 operator 입력 보조 자료이고, aggregate K7/AWAY polygon 좌표가 아니다.
- `node scripts/stadium-seatmap-ops.mjs gwangju operator-input-packet`은 trace review, operator template, input-aid, status, validation, apply-plan을 묶어 `gwangju-seatmap-operator-input-packet.json/.md`를 생성하며 data file을 수정하지 않는다.
- input-packet 상태값은 `blocked`, `ready_for_operator_input`, `operator_input_present`, `ready_for_prewrite`만 허용한다.
- `node scripts/stadium-seatmap-ops.mjs gwangju operator-intake`는 운영자 입력 전 갱신용 묶음이며 `operator-handoff -> operator-input-aid -> operator-input-packet` 순서이다.
- `node scripts/stadium-seatmap-ops.mjs gwangju release-package`는 현재 산출물과 browser QA summary를 묶어 `ready/blocked`를 판단하며 data file을 수정하지 않는다.
- `node scripts/stadium-seatmap-ops.mjs gwangju release-audit`는 release gate/package/status/trace/browser QA/handoff JSON과 문서 계약만 빠르게 검사하며 data file을 수정하지 않는다.
- `npm run qa:stadium:gwangju:release-gate`는 `operator-status -> gwangju seatmap tests -> trace-review artifact validation -> release-package -> build`를 순서대로 실행하고 `reports/stadium/gwangju-seatmap-release-gate.json/.md`를 남긴다.
- `npm run qa:stadium:gwangju:release-verify`는 호환용 최종 명령이며 현재는 `release-verify:preoperator`를 실행한다.
- `node scripts/stadium-seatmap-ops.mjs gwangju release-verify:preoperator`는 `trace-manifest -> runtime-layer -> release-gate -> release-audit` 순서로 active 113, operator ready, 공식 derived aggregate, stale=0 기준을 검증한다. 브라우저 모바일 QA는 `node scripts/stadium-seatmap-ops.mjs gwangju trace-review`의 기존 passed artifact를 release gate에서 검증한다.
- `node scripts/stadium-seatmap-ops.mjs gwangju release-verify:postoperator`는 별도 non-overlap operator target 추가 작업에서만 사용한다.
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
