# 잠실 운영자 직관 안내 데이터 입력 포맷

상태: partial official seed applied, food candidate packet approved, restroom candidate packet approved, restroom manual source apply completed, field survey 109 UNKNOWN confirmation completed

이 문서는 `/stadium` 서울잠실야구장 좌석 상세 패널의 권장 출입구, 가까운 매점/편의시설, 날짜별 운영 동선 공지를 입력할 때 사용하는 정적 데이터 계약이다. 런타임은 검수된 `src/data/jamsilOperatorVisitGuide.ts` 데이터만 읽고, 운영자 원본 PDF/CSV/이미지를 직접 파싱하지 않는다.

## 데이터 정책

- 허용 소스: 구단/구장 운영자가 제공하고 내부 검수자가 승인한 자료, 공식 공개자료에서 확인된 master 데이터.
- 금지 소스: 외부 야구 데이터 crawling, scraping, web search, 추정 게이트명, 추정 매점명, 추정 동선.
- 운영자 자료가 없거나 불명확한 필드는 `MANUAL_BASEBALL_DATA_REQUIRED` 상태를 유지한다.
- 공식 좌석도 위치 기반 출입구 후보는 `INFERRED_FROM_OFFICIAL_MAP`임을 문구와 caution note에 명시한다.
- 공식 교통 안내에서 확인되는 지하철 접근 정보는 `FIELD_VALIDATION_REQUIRED` 동선 후보로만 취급하고, 실측 이동시간/혼잡도는 운영자 또는 현장 검수 전까지 노출하지 않는다.
- 2차 지도/현장 정리 자료에서 온 매점 목록은 `SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION` 후보로 보관한다. 2026-05-31 기준 57개 후보는 사용자 제공 운영자 자료로 approval까지 완료했고, 생성된 TS fragment를 수동 적용해 런타임 facility point로 승격했다.
- 2026-06-01 기준 화장실 후보 14개는 사용자 승인 운영자 자료로 approval까지 완료했고, 생성된 TS fragment를 수동 적용해 런타임 RESTROOM facility point로 승격했다. 매점과 화장실의 실측 도보시간은 확정 자료가 없으므로 `UNKNOWN`을 유지하고, 날짜별 동선 문구는 운영자 자료 전까지 `MANUAL_BASEBALL_DATA_REQUIRED`를 유지한다.
- 2026-06-01 기준 현장 수집 109개 블록 row는 화장실 대표 시설, 도보시간, 혼잡도 카테고리 모두 운영자 검수 완료 상태다. 단, 도보시간과 혼잡도 값은 모두 `UNKNOWN` 확정이며 실측 수치나 실제 혼잡도 레벨을 의미하지 않는다.
- 런타임 데이터에는 외부 URL을 넣지 않는다. 원본 식별은 `sourceDocumentId`만 사용한다.

## 입력 파일

- `src/data/jamsilOperatorVisitGuide.ts`
- 공식 확인 가능 seed 기준: `src/data/jamsilOfficialSeedData.ts`
- 매점 후보 검수 작업표: `docs/stadium/jamsil-food-candidate-review.csv`
- 매점 후보 검수 절차: `docs/stadium/jamsil-food-candidate-review.md`
- 화장실 후보 검수 작업표: `docs/stadium/jamsil-restroom-candidate-review.csv`
- 현장 수집 작업표: `docs/stadium/jamsil-field-survey-review.csv`
- 공통 intake 템플릿: `docs/stadium/operator-visit-guide-intake-template.csv`
- 공통 데이터 정책: `docs/stadium/operator-visit-guide-policy.md`
- 운영자 입력 CSV: `reports/stadium/jamsil-operator-visit-guide-input.csv`
- 검증 리포트: `reports/stadium/jamsil-operator-visit-guide-validation.json`
- 매점 후보 검수 리포트: `reports/stadium/jamsil-food-candidate-review-validation.json`
- 매점 후보 운영자 검수 workset: `reports/stadium/jamsil-food-candidate-review-workset.json`
- 매점 후보 intake 변환 CSV: `reports/stadium/jamsil-food-candidate-intake-transfer.csv`
- 매점 후보 수동 적용 fragment: `reports/stadium/jamsil-food-candidate-apply-plan.ts-fragment`
- 화장실 후보 검수 리포트: `reports/stadium/jamsil-restroom-candidate-review-validation.json`
- 화장실 후보 운영자 검수 workset: `reports/stadium/jamsil-restroom-candidate-review-workset.json`
- 화장실 후보 intake 변환 CSV: `reports/stadium/jamsil-restroom-candidate-intake-transfer.csv`
- 화장실 후보 수동 적용 fragment: `reports/stadium/jamsil-restroom-candidate-apply-plan.ts-fragment`
- 현장 수집 검증 리포트: `reports/stadium/jamsil-field-survey-validation.json`
- 현장 수집 workset: `reports/stadium/jamsil-field-survey-workset.json`
- 수동 적용 계획: `reports/stadium/jamsil-operator-visit-guide-apply-plan.json`
- 운영자/개발자 handoff: `reports/stadium/jamsil-operator-visit-guide-handoff.md`
- 운영자 승인 파일: `reports/stadium/jamsil-operator-visit-guide-approval.json`

## 입력 게이트 명령

```bash
npm run stadium:jamsil:field-survey-validate
npm run stadium:jamsil:field-survey-workset
npm run stadium:jamsil:food-candidate-validate
npm run stadium:jamsil:food-candidate-review-workset
npm run stadium:jamsil:food-candidate-transfer -- --source-document-id jamsil-operator-YYYYMMDD-food-review --last-updated-at YYYY-MM-DD
npm run stadium:jamsil:food-candidate-apply-plan -- --source-document-id jamsil-operator-YYYYMMDD-food-review --last-updated-at YYYY-MM-DD
npm run stadium:jamsil:restroom-candidate-validate
npm run stadium:jamsil:restroom-candidate-review-workset
npm run stadium:jamsil:restroom-candidate-transfer -- --source-document-id jamsil-operator-YYYYMMDD-restroom-review --last-updated-at YYYY-MM-DD
npm run stadium:jamsil:restroom-candidate-apply-plan -- --source-document-id jamsil-operator-YYYYMMDD-restroom-review --last-updated-at YYYY-MM-DD
npm run stadium:jamsil:operator-intake
npm run stadium:jamsil:operator-validate
npm run stadium:jamsil:operator-apply-plan
npm run stadium:jamsil:operator-handoff
npm run stadium:jamsil:operator-approval
npm run stadium:jamsil:operator-approval:status
npm run stadium:jamsil:operator-approval:approve -- --approved-by "operator-name" --notes "검수 완료"
npm run stadium:jamsil:operator-approval:verify
```

`operator-intake`는 입력 CSV, 검증 리포트, 매점/화장실 후보 검수 리포트, 현장 수집 workset, 수동 적용용 TS fragment, handoff 문서를 한 번에 생성한다. 모든 명령은 리포트만 생성하고 `src/data/jamsilOperatorVisitGuide.ts`를 직접 수정하지 않는다.

상태값:

- `waiting_for_operator`: placeholder-only 또는 운영자 제공 row가 아직 없는 상태. data/status/test metadata는 `MANUAL_BASEBALL_DATA_REQUIRED` fallback 또는 `PARTIAL_OFFICIAL_SEED` 제한 표시를 유지하고, 사용자 visible label은 contract code 없이 안내 문구만 표시한다.
- `blocked`: 컬럼 누락, placeholder/실제 row 혼입, 잘못된 ID/날짜/참조, 외부 URL/크롤링/검색 문구, 매점 후보 검수 오류가 있는 상태.
- `ready_for_manual_apply`: 운영자 CSV가 검증을 통과했고 `reports/stadium/jamsil-operator-visit-guide-apply-plan.ts-fragment`를 수동 검토할 수 있는 상태.
- `ready_for_operator_intake_transfer`: 매점 후보 검수표에서 `OPERATOR_CONFIRMED` row가 확인되어 운영자 입력 CSV의 `facility` row로 옮길 수 있는 상태.
- `ready_for_operator_validate`: 매점 또는 화장실 후보 확정 row가 공통 운영자 입력 CSV 스키마로 변환되어 `operator-validate` 입력으로 사용할 수 있는 상태.
- `partial_operator_review`: 현장 수집 항목 중 일부 화장실/이동시간/혼잡도 카테고리만 운영자 검수된 상태.
- `ready_for_future_apply_plan`: 현장 수집 109개 블록의 화장실/이동시간/혼잡도 카테고리가 모두 운영자 검수된 상태. 현재 단계에서는 런타임 자동 반영을 하지 않는다.

매점 후보 수동 적용 계획은 `operatorNearSectionIds`에 적힌 block만 수정한다. 확정 매점 id는 해당 block의 `nearbyFacilityPointIds` 앞쪽에 추가하고, 기존 매표소/접근성/굿즈샵 참조와 `JAMSIL_OPERATION_NOTICES`는 유지한다.

현장 수집 workset은 `JAMSIL_BLOCKS` 109개를 블록별 1행으로 제공한다. 2026-06-01 UNKNOWN 확정 이후 workset은 `ready_for_future_apply_plan` 상태지만, 도보시간과 혼잡도는 모두 `UNKNOWN`이므로 런타임 실측 이동시간/혼잡도 값은 계속 `MANUAL_BASEBALL_DATA_REQUIRED`를 유지한다. workset 생성 명령은 source file을 직접 수정하지 않는다.

화장실 후보 workset은 송파구 공중화장실 공식 후보 3개와 2차 현장/지도 기반 내부 화장실 후보 11개를 검수용 row로 제공한다. 후보 row는 `OFFICIAL_PARTIAL`, `OFFICIAL_AVAILABLE`, `FIELD_COLLECTED_NEEDS_CONFIRMATION` 상태로만 보관하며, `OPERATOR_CONFIRMED` row만 `RESTROOM` facility 수동 적용 fragment로 변환한다. `candidateNearSectionIds`, `candidateNearGateIds`, `candidateMapPosition`은 참고 후보일 뿐이고, 런타임 block 연결은 검수자가 채운 `operatorNearSectionIds`만 사용한다. 2011년 과거 대기시간 수치와 종합운동장 5번 출구 외부 혼잡도는 현재 내부 화장실 대기시간/혼잡도 데이터가 아니므로 입력 대상에서 제외한다.

승인 상태값:

- `WAITING_FOR_OPERATOR`: 확정 매점 row가 없어 승인 대상이 없는 상태.
- `PENDING_OPERATOR_APPROVAL`: handoff와 매점/화장실 packet, 현장 수집 workset이 준비되어 운영자 승인을 기다리는 상태.
- `APPROVED`: 현재 산출물 hash가 운영자 승인 파일에 저장된 상태.
- `STALE_APPROVAL`: 승인 이후 handoff, 매점/화장실 packet, 현장 수집 workset 산출물이 변경된 상태.

운영자 자료는 아래 세 배열에만 반영한다.

- `JAMSIL_OPERATOR_FACILITY_POINTS`: 출입구/매점/화장실/엘리베이터/주차/대중교통 지점.
- `JAMSIL_BLOCK_VISIT_GUIDANCE`: 좌석 블록별 권장 출입구와 가까운 편의시설 참조.
- `JAMSIL_OPERATION_NOTICES`: KST 날짜 기준 운영 동선 공지.

`src/data/jamsilOfficialSeedData.ts`는 공식 공개자료에서 확인 가능한 구장 기본 정보, 좌석 등급 범위, 출입구 master, 매표소/접근성 지원 master, 공식 좌석도 기반 추정 후보, 현장 검증 후보, 매점 수집 schema, 2차 매점 후보, 서비스 준비도를 보관한다. `INFERRED_FROM_OFFICIAL_MAP` 출입구 후보는 좌석 상세에 표시할 수 있지만, 공식 추천처럼 보이지 않도록 라벨과 주의 문구에 추정 상태를 함께 노출한다.

## 공통 규칙

- `sourceDocumentId`: 운영자 제공 원본의 내부 식별자. 예: `jamsil-operator-20260529-visit-guide-v1`
- `lastUpdatedAt`: `YYYY-MM-DD` 형식의 KST 기준 검수일.
- 문자열 값은 빈 문자열이면 안 된다.
- 지점 ID와 공지 ID는 중복될 수 없다.
- `blockId`는 실제 `JAMSIL_BLOCKS`에 존재해야 한다.
- `teamContext`는 `COMMON`, `LG`, `DOOSAN` 중 하나만 사용한다.
- 매점/화장실/편의시설 row는 `floor`, `side`, `nearSectionIds`, `locationText`, `openStatus`, `verificationStatus`를 채워야 한다.
- `nearSectionIds`, `recommendedEntrancePointIds`, `nearbyFacilityPointIds`, `affectedBlockIds`는 세미콜론 구분자를 사용한다. 예: `block-109;block-110`
- `openStatus`는 `OPEN`, `CLOSED`, `GAME_DAY_ONLY`, `24_HOURS`, `UNKNOWN` 중 하나를 사용한다.
- `accessible`는 `YES`, `NO`, `UNKNOWN` 중 하나를 사용한다.
- `walkingMinutes`는 실측 전에는 `UNKNOWN`으로 남길 수 있지만, 추정 분 단위 값을 만들지 않는다.
- `verificationStatus`는 확정 운영자 row에만 `OPERATOR_CONFIRMED`를 사용한다.

## Facility Point

```ts
{
  id: 'jamsil-facility-entrance-operator-id',
  kind: 'ENTRANCE',
  label: '운영자 제공 지점명',
  dataStatus: 'OPERATOR_PROVIDED',
  sourceDocumentId: 'jamsil-operator-20260529-visit-guide-v1',
  lastUpdatedAt: '2026-05-29'
}
```

허용 `kind` 값은 `ENTRANCE`, `CONCESSION`, `RESTROOM`, `ELEVATOR`, `PARKING`, `TRANSIT`, `TICKET_OFFICE`, `SHOP`, `ACCESSIBILITY`, `RENTAL`이다.

## Block Visit Guidance

```ts
{
  blockId: 'block-101',
  recommendedEntrancePointIds: ['jamsil-facility-entrance-operator-id'],
  nearbyFacilityPointIds: ['jamsil-facility-concession-operator-id'],
  cautionNotes: ['운영자 제공 주의 문구'],
  sourceDocumentId: 'jamsil-operator-20260529-visit-guide-v1',
  lastUpdatedAt: '2026-05-29'
}
```

규칙:

- `recommendedEntrancePointIds`는 `ENTRANCE` 지점만 참조한다.
- `nearbyFacilityPointIds`는 `CONCESSION`, `RESTROOM`, `ELEVATOR`, `PARKING`, `TRANSIT`, `TICKET_OFFICE`, `SHOP`, `ACCESSIBILITY`, `RENTAL` 지점을 참조할 수 있다.
- 참조할 운영자 지점이 없으면 배열을 비워 두고 UI fallback을 유지한다.

## Operation Notice

```ts
{
  id: 'jamsil-operation-notice-20260529-main',
  validFrom: '2026-05-29',
  validTo: '2026-05-29',
  priority: 100,
  teamContext: 'COMMON',
  affectedBlockIds: ['block-101'],
  message: '운영자 제공 날짜별 운영 안내 문구',
  lastUpdatedAt: '2026-05-29',
  sourceDocumentId: 'jamsil-operator-20260529-operation-notice-v1'
}
```

규칙:

- `validFrom <= today <= validTo`인 공지만 기본 화면에 노출한다.
- 같은 날짜에 여러 공지가 있으면 `priority`가 높은 순서로 표시한다.
- `teamContext`가 `COMMON`이면 LG/두산 공통 공지로 처리한다.
- `affectedBlockIds`가 비어 있으면 전체 블록 공지로 처리한다.
- `affectedBlockIds`가 비어 있지 않으면 실제 `JAMSIL_BLOCKS`의 `id`만 넣는다.
- 만료 공지는 기본 화면에 노출하지 않는다.

## 현재 상태

현재 저장소에는 공식 공개자료 기반 출입구 후보와 매표소/접근성 지원 시설 seed, 승인된 매점 57개, 승인된 화장실 14개가 들어 있다. numbered block 좌석 상세 패널은 승인 매점과 화장실을 `OPERATOR_PROVIDED`로 표시하고, 대중교통 접근 동선은 caution note의 후보 문구로만 표시한다. field-survey 109개 row는 모두 검수 완료됐지만 도보시간과 혼잡도 값이 `UNKNOWN`이므로, 실측 도보시간/혼잡도/오늘의 운영 동선 공지는 data/status/test metadata에서 `MANUAL_BASEBALL_DATA_REQUIRED`를 유지한다. 사용자 visible label에는 contract code 없이 `운영자 제공 자료 필요` 안내 문구만 노출한다.

`JAMSIL_FIELD_VALIDATION_ROUTE_CANDIDATES`, `JAMSIL_FOOD_FACILITY_COLLECTION_SCHEMA`, `JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES`, `JAMSIL_PRODUCTION_DATA_READINESS`는 운영자/현장 수집 계획을 고정하기 위한 메타데이터다. 이 값은 그 자체로 매점명, 화장실 위치, 도보시간, 혼잡도 확정 데이터가 아니며, 운영자 검수 row가 들어오기 전에는 `JAMSIL_OPERATOR_FACILITY_POINTS`나 `JAMSIL_BLOCK_VISIT_GUIDANCE`의 확정 시설 참조로 승격하지 않는다.
