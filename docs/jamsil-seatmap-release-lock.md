# 잠실 야구장 좌석도 release lock

검수 고정일: 2026-05-24 KST
매점 후보 packet 승인일: 2026-05-31 KST
매점 후보 source 수동 반영일: 2026-05-31 KST
화장실 후보 packet 승인일: 2026-06-01 KST
화장실 후보 source 수동 반영일: 2026-06-01 KST
현장 수집 UNKNOWN 확정일: 2026-06-01 KST

## 기준

- 공식 asset: `src/assets/stadiums/lg/jamsil-lg-seatmap-default-2026.webp`
- 기준 데이터: `JAMSIL_BLOCKS` (109개: 104 numbered + 5 special)
- 좌표계: 이미지 픽셀 좌표 (imageGeometry.d, labelX, labelY)
- traceStatus 시스템 없음
- 운영자 직관 안내 source: `src/data/jamsilOperatorVisitGuide.ts`
- 공식 확인 가능 seed source: `src/data/jamsilOfficialSeedData.ts`
- 운영자 직관 안내 policy: `docs/stadium/operator-visit-guide-policy.md`
- 운영자 packet input: `reports/stadium/jamsil-operator-visit-guide-input.csv`
- 운영자 packet handoff: `reports/stadium/jamsil-operator-visit-guide-handoff.md`
- 운영자 packet approval: `reports/stadium/jamsil-operator-visit-guide-approval.json`
- 매점 후보 검수 리포트: `reports/stadium/jamsil-food-candidate-review-validation.json`
- 매점 후보 운영자 검수 workset: `reports/stadium/jamsil-food-candidate-review-workset.json`
- 매점 후보 intake 변환 CSV: `reports/stadium/jamsil-food-candidate-intake-transfer.csv`
- 매점 후보 수동 적용 fragment: `reports/stadium/jamsil-food-candidate-apply-plan.ts-fragment`
- 화장실 후보 검수 CSV: `docs/stadium/jamsil-restroom-candidate-review.csv`
- 화장실 후보 검수 리포트: `reports/stadium/jamsil-restroom-candidate-review-validation.json`
- 화장실 후보 운영자 검수 workset: `reports/stadium/jamsil-restroom-candidate-review-workset.json`
- 화장실 후보 intake 변환 CSV: `reports/stadium/jamsil-restroom-candidate-intake-transfer.csv`
- 화장실 후보 수동 적용 fragment: `reports/stadium/jamsil-restroom-candidate-apply-plan.ts-fragment`
- 현장 수집 입력 CSV: `docs/stadium/jamsil-field-survey-review.csv`
- 현장 수집 validation: `reports/stadium/jamsil-field-survey-validation.json`
- 현장 수집 workset: `reports/stadium/jamsil-field-survey-workset.json`
- Playwright 운영자 런타임 검증: `output/playwright/stadium-ux-jamsil-*/jamsil-operator-runtime-check.json`
- 현재 좌석 상세 패널은 공식 공개자료 기반 출입구 후보와 매표소/접근성 지원 시설을 유지하면서, 2026-05-31 사용자 제공 운영자 자료로 승인된 매점 후보 57개와 2026-06-01 사용자 승인 운영자 자료로 확정된 화장실 후보 14개를 현장 수집 109개 row의 가까운 시설로 수동 반영했다. Playwright mobile/full 운영자 런타임 리포트는 대표 numbered 4개와 special 5개 target이 모두 `OPERATOR_PROVIDED`로 승인 화장실을 표시하는지 검증한다. 현장 수집 도보시간/혼잡도 row는 모두 UNKNOWN 확정 완료 상태지만, 실측 도보시간/혼잡도/오늘의 운영 동선은 `MANUAL_BASEBALL_DATA_REQUIRED`를 유지한다.

## 고정 상태

- `totalBlocks=109`
- `officialAssetSha256=e0d7aa65372ebf6b206ce519f8ed4e73e64232377ec9ace2b871be7a57e8537b`
- `releaseFixtureFingerprint=4ed2c6ba5a647d0ca68e8540e801164031c09153ab3d1af3e1bd15da920d272e`

## 운영 규칙

- 이 문서 기준 상태에서는 잠실 야구장 좌석 polygon 전수 재작업을 진행하지 않는다.
- 사람이 명확한 시각 불일치나 클릭 충돌을 발견하면 해당 block의 imageGeometry만 수정한다.
- 좌표나 asset 변경이 발생하면 `jamsil-seatmap-ops.mjs`의 SHA256 상수를 갱신하고 release gate를 재실행한다.
- 외부 야구 데이터 수집, 웹 검색, 제3자 좌석도 복사는 사용하지 않는다.
- 권장 출입구, 가까운 편의시설, 날짜별 운영 동선 공지는 검수된 정적 데이터만 사용한다.
- 공식 좌석도 위치 기반 출입구 후보는 `INFERRED_FROM_OFFICIAL_MAP` 상태를 UI 문구에 함께 표시한다.
- 공식 교통 안내에서 확인되는 지하철 접근 정보는 동선 후보로만 사용하고, 실측 이동시간과 혼잡도는 `FIELD_VALIDATION_REQUIRED` 상태를 유지한다.
- 2차 지도/현장 정리 기반 매점 후보는 `SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION` 메타데이터로 보관한다. `OPERATOR_CONFIRMED` row는 `jamsil-food-candidate-apply-plan.ts-fragment`를 사람이 리뷰한 뒤 수동 적용할 때만 런타임 facility point로 승격한다.
- 송파구 공중화장실 공식 후보와 2차 현장/지도 기반 내부 화장실 후보 14개는 `jamsil-restroom-candidate-review.csv`에서 `OPERATOR_CONFIRMED`로 확정하고, `jamsil-restroom-candidate-apply-plan.ts-fragment` 수동 검토 후 런타임 RESTROOM facility로 승격했다. 2011년 과거 대기시간 수치와 종합운동장 5번 출구 외부 혼잡도는 현재 좌석 상세 런타임 데이터로 사용하지 않는다.
- 현장 수집 109개 row는 대표 RESTROOM facility와 `UNKNOWN` 도보시간/혼잡도 값을 운영자 검수 완료 상태로 고정했다. 승인된 대표 화장실은 수동 적용 경로로 런타임 가까운 시설에 반영하며, `UNKNOWN`은 실측값이 아니라 미제공 확인값이므로 도보시간/혼잡도와 `JAMSIL_OPERATION_NOTICES`를 자동 수정하지 않는다.
- 운영자 자료가 없거나 불명확한 항목은 좌석 위치/지도 이미지로 추정하지 않고 `MANUAL_BASEBALL_DATA_REQUIRED` 상태를 유지한다.

## 공개 명령

- `npm run qa:stadium:jamsil:mobile`
- `npm run qa:stadium:jamsil:full`
- `npm run qa:stadium:jamsil:release-lock`
- `npm run stadium:jamsil:status`
- `npm run stadium:jamsil:field-survey-validate`
- `npm run stadium:jamsil:field-survey-workset`
- `npm run stadium:jamsil:food-candidate-validate`
- `npm run stadium:jamsil:food-candidate-review-workset`
- `npm run stadium:jamsil:food-candidate-transfer`
- `npm run stadium:jamsil:food-candidate-apply-plan`
- `npm run stadium:jamsil:restroom-candidate-validate`
- `npm run stadium:jamsil:restroom-candidate-review-workset`
- `npm run stadium:jamsil:restroom-candidate-transfer`
- `npm run stadium:jamsil:restroom-candidate-apply-plan`
- `npm run stadium:jamsil:operator-intake`
- `npm run stadium:jamsil:operator-validate`
- `npm run stadium:jamsil:operator-apply-plan`
- `npm run stadium:jamsil:operator-handoff`
- `npm run stadium:jamsil:operator-approval`
- `npm run stadium:jamsil:operator-approval:status`
- `npm run stadium:jamsil:operator-approval:approve`
- `npm run stadium:jamsil:operator-approval:verify`

## 내부 dispatcher task

- `node scripts/stadium-seatmap-ops.mjs jamsil responsive`

## 릴리즈 게이트

```bash
npm run qa:stadium:jamsil:release-lock
node --import tsx --test --test-concurrency=1 src/data/jamsilOperatorVisitGuideSeatData.test.ts
node --import tsx --test --test-concurrency=1 scripts/jamsil-operator-visit-guide-gate.test.mjs
npm run qa:stadium:jamsil:mobile
npm run qa:stadium:jamsil:full
```

릴리즈 차단 조건:

- `totalBlocks`가 `109`이 아니다.
- `officialAssetSha256`이 고정값과 다르다.
- `releaseFixtureFingerprint`가 고정값과 다르다.
- `qa:stadium:jamsil:responsive` package alias가 다시 공개된다.
- `src/data/jamsilOperatorVisitGuide.ts`가 운영자 제공 배열 외의 외부 URL, crawling, scraping, web search, 원본 파일 runtime parsing 계약을 포함한다.
- 좌석 상세 패널의 직관 안내 영역이 `PARTIAL_OFFICIAL_SEED`, 운영자 제공 값, `MANUAL_BASEBALL_DATA_REQUIRED`가 아닌 출처 불명 값을 표시한다.
- `jamsil-operator-entrance`, `jamsil-operator-facilities`, `jamsil-operator-updated-at`이 `PARTIAL_OFFICIAL_SEED` 또는 운영자 제공 값을 잃는다.
- `jamsil-operator-runtime-check` Playwright 리포트가 대표 numbered 4개와 special 5개 target의 `OPERATOR_PROVIDED` 매점/화장실 표시, special target 승인 화장실 표시, 운영 공지 `MANUAL_BASEBALL_DATA_REQUIRED`, `data-operator-field-source` 계약을 검증하지 않는다.
- `JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES`의 매점 후보명이 운영자 검수와 approval 없이 `JAMSIL_OPERATOR_FACILITY_POINTS`에 섞인다.
- 현장 수집 패킷이 `JAMSIL_BLOCKS` 109개 전체를 블록별 1행으로 제공하지 않는다.
- 현장 수집 패킷이 `src/data/jamsilOperatorVisitGuide.ts`, `JAMSIL_OPERATION_NOTICES`, 런타임 화장실/도보시간/혼잡도 데이터를 직접 수정한다.
- 화장실 후보 검수 패킷이 14개 후보를 제공하지 않거나, 검수/approval 없이 `JAMSIL_OPERATOR_FACILITY_POINTS`에 RESTROOM facility를 자동 승격한다.
- 확정된 화장실 후보를 intake CSV나 수동 적용 fragment로 만들 때 `operatorNearSectionIds`가 아닌 후보 위치 필드(`candidateNearSectionIds`, `candidateNearGateIds`, `candidateMapPosition`)로 block을 추정 연결한다.
- 확정된 화장실 후보를 intake CSV로 변환할 때 `jamsil-operator-YYYYMMDD-*` source id와 `YYYY-MM-DD` 갱신일 없이 승격 경로가 열린다.
- 2011년 화장실 대기시간 또는 종합운동장 5번 출구 외부 혼잡도를 현재 내부 화장실 대기시간/혼잡도로 표시한다.
- 확정된 매점 후보를 intake CSV로 변환할 때 `jamsil-operator-YYYYMMDD-*` source id와 `YYYY-MM-DD` 갱신일 없이 승격 경로가 열린다.
- 확정된 매점 후보를 수동 적용 fragment로 만들 때 `operatorNearSectionIds` 밖의 block을 추정 연결한다.
- 운영자 승인 파일이 `PENDING_OPERATOR_APPROVAL`, `APPROVED`, `STALE_APPROVAL`, `WAITING_FOR_OPERATOR` 외의 상태를 사용한다.
- 승인 후 handoff/food/restroom/field-survey packet 산출물이 바뀌었는데 `operator-approval:verify`가 통과한다.
- 화장실/도보시간/오늘의 운영 동선 자료가 없는 상태에서 `jamsil-operator-notice`가 `MANUAL_BASEBALL_DATA_REQUIRED` fallback을 잃는다.

## 최종 검증 결과

검증 실행일: 2026-06-03 KST

- `npm run qa:stadium:jamsil:release-lock`: PASS
  - `totalBlocks=109`
  - `officialAssetSha256=e0d7aa65372ebf6b206ce519f8ed4e73e64232377ec9ace2b871be7a57e8537b`
  - `releaseFixtureFingerprint=4ed2c6ba5a647d0ca68e8540e801164031c09153ab3d1af3e1bd15da920d272e`
- `npm run stadium:jamsil:field-survey-validate`: PASS, `ready_for_future_apply_plan`, `completedRows=109`, `blockerCount=0`
- `npm run stadium:jamsil:field-survey-workset`: PASS, `readyRows=109`, `waitingRows=0`, `blockedRows=0`
- `npm run stadium:jamsil:operator-handoff`: PASS, `ready_for_manual_apply`, field-survey workset hash 대상 포함
- `npm run stadium:jamsil:operator-approval:approve -- --approved-by "operator-name" --notes "잠실 현장수집 109개 UNKNOWN 검수 포함"`: PASS, `APPROVED`
- `npm run stadium:jamsil:operator-approval:verify`: PASS, `APPROVED`
- `node --check scripts/jamsil-seatmap-ops.mjs`: PASS
- `node --check scripts/stadium-seatmap-ops.mjs`: PASS
- `node --check scripts/stadium-ux-audit.mjs`: PASS
- `node --import tsx --test --test-concurrency=1 scripts/jamsil-operator-visit-guide-gate.test.mjs`: PASS, `29/29`
- `node --import tsx --test --test-concurrency=1 src/data/jamsilOperatorVisitGuideSeatData.test.ts`: PASS, `14/14`
- `node --import tsx --test --test-concurrency=1 src/components/StadiumGuideRuntimeSeatMaps.test.ts`: PASS, `42/42`
- `npm run qa:stadium:jamsil:mobile`: PASS, `jamsil-operator-runtime-check.json` PASS (`mobile-390`, `desktop-1440`, `18/18` rows, `numberedTargets=8`, `specialTargets=10`, all `OPERATOR_PROVIDED`)
- `npm run qa:stadium:jamsil:full`: PASS, `jamsil-operator-runtime-check.json` PASS (`desktop-1440`, `9/9` rows, `numberedTargets=4`, `specialTargets=5`, all `OPERATOR_PROVIDED`)
- `CYPRESS_CACHE_FOLDER=$PWD/.cypress-cache npx cypress install --force`: PASS after network-enabled Cypress `15.13.0` reinstall
- `node scripts/cypress-doctor.mjs --repair`: PASS when run outside sandbox; Cypress binary smoke test and verify pass
- `npm run cy:doctor`: PASS, local Cypress `15.13.0` verify passed
- `npm run cy:stadium:jamsil`: PASS, `6/6`, executed outside sandbox against a local Vite server on `127.0.0.1:5176`
