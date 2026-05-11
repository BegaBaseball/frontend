# 광주 K7/원정응원석 운영자 좌표 승격 Runbook

## 목적

광주 active 111개 블럭은 공식 PNG 기준 trace가 완료되어 있다. 2026-05-11 운영자 입력으로 `K7석`은 `107~111`, `118~122`, `원정응원석`은 `107~110` 번호 블럭 범위로 확정했다. 이 범위는 기존 공식 PNG 번호 블럭 polygon을 재사용하므로 active block 수는 111개를 유지하고, 별도 중첩 hit-area를 만들지 않는다.

독립 K7/원정응원석 aggregate polygon이 필요해지는 경우에는 아래 좌표 입력 자동화 경로를 다시 사용한다. 그 전까지 `home-k7-seats`, `away-cheering-seats` operator polygon requirement는 후속 입력 대기 상태로 남긴다.

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
3. `officialBlocks`는 번호 블럭 단위로 유지한다. `K7석`, `원정응원석` aggregate official block을 새로 만들지 않는다.
4. UI 필터는 category와 fanRole을 함께 본다.
   - `내야석`: K7 `107~111`, `118~122` 전체를 포함한다.
   - `K7석`: K7 `107~111`, `118~122`만 포함하고 기존 번호 블럭 hit-area를 재사용한다.
   - `응원석`: `fanRole: HOME/AWAY`인 K7 `107~110`, `118~122`만 포함하고 neutral `111`은 제외한다.
   - `홈 응원석`: K7 `118~122`만 포함한다.
   - `원정응원석`: K7 `107~110`만 포함한다.
5. 선택된 파생 필터는 `displayBlocks` 요약을 표시한다.
   - `K7석`: `107~111`, `118~122`
   - `홈 응원석`: `118~122`
   - `원정응원석`: `107~110`
6. 좌표 승격 전에는 active 113개 기준 테스트를 실행하지 않는다.
7. 최종 릴리즈 검증은 `npm run qa:stadium:gwangju:release-gate`로 실행한다.
8. 개별 확인이 필요하면 `npm run test:stadium:seatmaps`, `npm run qa:stadium:gwangju:trace-review`, `npm run stadium:gwangju:release-package`, `npm run build` 순서로 실행한다.

### 후속 독립 polygon 입력 경로

1. `npm run stadium:gwangju:operator-handoff`를 실행해 trace review, template, validation, apply-plan, handoff 산출물을 갱신한다. 이때 기존 template의 `operatorInput`은 section id 기준으로 보존된다.
2. `reports/stadium/gwangju-seatmap-operator-template.json`에서 `K7석`, `원정응원석`의 `operatorInput`을 채운다.
3. `operatorInput.points`는 공식 PNG 좌표 `[x, y]` 배열로 입력하고, `labelX`, `labelY`는 polygon 내부 label anchor로 입력한다.
4. `officialBlocks`, `level`, `side`, `fanRole`, `shortLabel`, `reviewer`, `reviewedAt`을 함께 채운다.
5. `npm run stadium:gwangju:operator-template:validate:strict`를 실행한다.
6. `npm run stadium:gwangju:operator-template:apply-plan:require-ready`를 실행한다.
7. `npm run stadium:gwangju:operator-status`를 실행해 `ready`인지 확인한다.
8. `npm run stadium:gwangju:operator-apply`를 실행해 dry-run apply 보고서가 두 구역을 승격 후보로 계산하는지 확인한다. 이 명령은 data file을 수정하지 않는다.
9. `npm run stadium:gwangju:operator-write-smoke`를 실행해 synthetic 입력이 isolated report directory에서 ready 경로를 통과하고, 실제 apply write path가 임시 data file에서만 동작하며, production data/template을 바꾸지 않는지 확인한다.
10. `npm run stadium:gwangju:operator-write-guard:require-ready`를 실행한다.
11. guard가 통과하면 `npm run stadium:gwangju:operator-apply:write`로 `validForDataDiff=true`인 두 구역만 `gwangjuSeatData.ts`에 승격한다.
12. 승격 후 `npm run stadium:gwangju:operator-postwrite-gate`를 실행한다.

## 상태 해석

- `blocked`: 필수 리포트 누락, trace 기준 실패, validation 실패, apply-plan blocker, handoff blocker가 있다.
- `pending`: trace는 안전하지만 독립 K7/원정응원석 polygon 입력, strict validation, ready apply-plan, valid data diff 중 하나가 아직 남아 있다.
- `ready`: 두 운영자 polygon 구역 모두 strict validation과 apply-plan ready 조건을 통과해 data diff 후보가 있다.
- block-range 반영 상태의 trace 기준은 active 111개이다. 독립 polygon 승격을 별도로 수행하는 경우에만 active 113개 기준으로 전환한다.
- 113개 기준 검증은 `operator-apply:write`와 `operator-postwrite-gate`가 실제 좌표 승격을 끝낸 뒤에만 활성화한다.

## 승격 전 Guard

- `npm run stadium:gwangju:operator-write-smoke`는 synthetic K7/AWAY 입력을 `reports/stadium/gwangju-seatmap-operator-write-smoke/` 안에서만 사용한다.
- smoke 입력 좌표는 production 야구 데이터가 아니며 실제 좌표로 복사하거나 승격하면 안 된다.
- smoke는 production `gwangjuSeatData.ts`와 production operator template이 변경되지 않았음을 해시로 확인한다.
- smoke는 임시 `gwangjuSeatData.smoke.ts` 복사본에만 `scripts/gwangju-seatmap-operator-apply.mjs --write --require-ready --allow-synthetic-smoke`를 실행해 write path를 검증한다.
- `npm run stadium:gwangju:operator-write-guard`는 현재 상태 보고서와 smoke 결과를 읽어 `blocked` 또는 `ok` 보고서를 만든다.
- `npm run stadium:gwangju:operator-write-guard:require-ready`는 blocked 상태면 실패해야 한다. 독립 K7/AWAY polygon 입력이 비어 있으면 실패하는 것이 정상이다.
- `npm run stadium:gwangju:operator-prewrite-gate`는 좌표 입력 완료 후 data diff 직전에 실행하는 묶음 명령이다.
- `npm run stadium:gwangju:operator-apply:write`는 `operator-prewrite-gate` 통과 뒤에만 production write를 수행한다.
- `npm run stadium:gwangju:operator-postwrite-gate`는 승격 후 handoff/status, seatmap test, 광주 trace QA, build를 다시 실행한다.
- `npm run stadium:gwangju:release-package`는 현재 산출물과 browser QA summary를 묶어 `ready/blocked`를 판단하며 data file을 수정하지 않는다.
- `npm run qa:stadium:gwangju:release-gate`는 `operator-status -> seatmap tests -> trace-review QA -> release-package -> build`를 순서대로 실행하고 `reports/stadium/gwangju-seatmap-release-gate.json/.md`를 남긴다.
- `docs/gwangju-seatmap-release-handoff.md`는 현재 release-ready 상태, K7/AWAY no hit-area 계약, 후속 113개 승격 금지선을 운영 인계용으로 고정한다.

## 산출물

- `docs/gwangju-seatmap-release-handoff.md`
- `reports/stadium/gwangju-seatmap-operator-template.json`
- `reports/stadium/gwangju-seatmap-operator-template-validation.json`
- `reports/stadium/gwangju-seatmap-operator-template-apply-plan.json`
- `reports/stadium/gwangju-seatmap-operator-handoff.json`
- `reports/stadium/gwangju-seatmap-operator-status.json`
- `reports/stadium/gwangju-seatmap-release-package.json`
- `reports/stadium/gwangju-seatmap-release-gate.json`
- `reports/stadium/gwangju-seatmap-operator-apply.json`
- `reports/stadium/gwangju-seatmap-operator-write-smoke/gwangju-seatmap-operator-write-smoke.json`
- `reports/stadium/gwangju-seatmap-operator-write-guard.json`
