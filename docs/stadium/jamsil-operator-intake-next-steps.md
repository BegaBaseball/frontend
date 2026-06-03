# 잠실 운영자 데이터 순차 입력 계획

상태: official seed applied, food/restroom candidate packets approved, 109-row field-survey restroom guidance manually reflected

## 현재 반영된 기준 데이터

공식 공개자료에서 확인 가능한 값은 `src/data/jamsilOfficialSeedData.ts`에 분리했다.

- 구장 기본 정보: `JAMSIL_OFFICIAL_STADIUM_PROFILE`
- 좌석 구역 기준: `JAMSIL_OFFICIAL_SEAT_SECTION_BASELINE`, `JAMSIL_OFFICIAL_SEAT_GRADE_RANGES`
- 휠체어석 기준: `JAMSIL_OFFICIAL_WHEELCHAIR_SEAT_LOCATIONS`
- 출입구 master: `JAMSIL_OFFICIAL_GATE_MASTER`
- 공식 좌석도 기반 출입구 후보: `JAMSIL_OFFICIAL_MAP_INFERRED_GATE_CANDIDATES`
- 매표소/접근성 지원 master: `JAMSIL_OFFICIAL_FACILITY_MASTER`
- 아직 운영자 자료가 필요한 gap: `JAMSIL_MANUAL_OPERATOR_DATA_GAPS`
- 현장 검증 대상 대중교통 동선 후보: `JAMSIL_FIELD_VALIDATION_ROUTE_CANDIDATES`
- 매점/먹거리 수집 schema: `JAMSIL_FOOD_FACILITY_COLLECTION_SCHEMA`
- 2차 지도/현장 정리 기반 매점 후보: `JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES`
- 서비스 준비도: `JAMSIL_PRODUCTION_DATA_READINESS`

`JAMSIL_OFFICIAL_MAP_INFERRED_GATE_CANDIDATES`는 `src/data/jamsilOperatorVisitGuide.ts`에 `INFERRED_FROM_OFFICIAL_MAP` 상태로 반영되어 있다. 좌석 상세 패널은 이를 `PARTIAL_OFFICIAL_SEED`로 표시하며, 공식 추천처럼 보이지 않도록 라벨과 주의 문구에 추정 상태를 함께 노출한다.

종합운동장역 접근 동선은 공식 교통 안내에서 확인되는 5,6번 출구 정보를 기반으로 caution note에 후보 문구만 표시한다. 권역별 실측 이동시간, 혼잡 우회 동선, 휠체어/유모차 접근 여부는 `FIELD_VALIDATION_REQUIRED` 상태로 남긴다.

첨부 자료의 매점 브랜드/권역은 `SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION` 후보로 보관한다. 2026-05-31 기준 57개 후보 row는 사용자 제공 운영자 자료로 `OPERATOR_CONFIRMED` 처리했고, 승인된 source id는 `jamsil-operator-20260531-user-confirmed-food-review`이다. 승인된 TS fragment는 `JAMSIL_OPERATOR_FACILITY_POINTS`와 좌석 상세의 `nearbyFacilityPointIds`에 수동 적용되었다.

2026-06-01 기준 화장실 후보 14개는 사용자 승인 운영자 자료로 `OPERATOR_CONFIRMED` 처리했고, 승인된 source id는 `jamsil-operator-20260601-user-confirmed-restroom-review`이다. 현장 수집 109개 row는 대표 화장실 시설을 좌석 상세 `nearbyFacilityPointIds`에 수동 반영했으며, numbered 104개와 special 5개 모두 승인 화장실 runtime guidance를 가진다.

## 남은 운영자 제공 backlog

아래 항목은 아직 운영자 자료가 없으므로 런타임과 QA에서 계속 `MANUAL_BASEBALL_DATA_REQUIRED` 계약을 유지한다.

- 실측 도보시간: gate-to-section, section-to-restroom, section-to-food 단위의 측정값.
- queue/congestion levels: 내부 화장실/매점/출입구 혼잡도와 우회 안내. 2011년 과거 대기시간이나 종합운동장 외부 혼잡도는 현재 내부 혼잡도로 사용하지 않는다.
- 경기일 운영 공지: `JAMSIL_OPERATION_NOTICES`에 넣을 KST 날짜 범위, 홈팀 컨텍스트, 영향 블록, 우선순위, 공지 문구.

이 backlog는 web search, crawling, 좌석 위치 추정, 과거 수치 재사용으로 보강하지 않는다. 운영자 제공 row가 들어오기 전까지 도보시간/혼잡도/운영 공지는 런타임 fallback과 release-lock blocker에서 수기 필요 상태로 남긴다.

검수 작업표는 `docs/stadium/jamsil-food-candidate-review.csv`와 `docs/stadium/jamsil-food-candidate-review.md`에 분리했다. 이 작업표에서 `operatorVerificationStatus=OPERATOR_CONFIRMED`가 된 row만 공통 intake 템플릿의 `facility` row로 옮긴다.

```bash
npm run stadium:jamsil:food-candidate-validate
npm run stadium:jamsil:food-candidate-review-workset
```

위 명령은 검수 CSV에 확정 row가 없으면 `waiting_for_operator`, 확정 row가 있고 필수 필드가 채워졌으면 `ready_for_operator_intake_transfer`, 필수 필드가 누락되면 `blocked`를 반환한다. 현재 기본 검수 CSV는 확정 row 57개, blocker 0개 상태다.

`food-candidate-review-workset`은 전체 57개 후보를 zone별로 묶은 운영자 검수용 CSV/JSON/MD packet만 생성한다. 이 산출물은 런타임 source가 아니며 `src/data/jamsilOperatorVisitGuide.ts`를 수정하지 않는다.

확정 row가 생기면 바로 런타임 source에 쓰지 않고, 먼저 공통 운영자 입력 스키마의 `facility` row로 변환한다.

```bash
npm run stadium:jamsil:food-candidate-transfer -- --source-document-id jamsil-operator-20260531-user-confirmed-food-review --last-updated-at 2026-05-31
```

위 명령은 `reports/stadium/jamsil-food-candidate-intake-transfer.csv`를 만든다. 확정 row가 없으면 header-only CSV와 `waiting_for_operator` 리포트만 생성한다. 확정 row가 있는데 운영자 source id/date가 없으면 `blocked`로 차단한다.

좌석 상세 패널에 수동 적용할 fragment는 별도 apply plan으로 만든다.

```bash
npm run stadium:jamsil:food-candidate-apply-plan -- --source-document-id jamsil-operator-20260531-user-confirmed-food-review --last-updated-at 2026-05-31
```

이 명령은 `operatorNearSectionIds`에 적힌 block의 `nearbyFacilityPointIds` 앞쪽에 확정 매점 id를 추가한 fragment만 생성한다. 기존 매표소/접근성/굿즈샵 참조는 유지하고, `JAMSIL_OPERATION_NOTICES`는 변경하지 않는다.

수동 적용 전에 전체 handoff와 매점 packet hash를 운영자 승인 파일로 고정한다.

```bash
npm run stadium:jamsil:operator-approval
npm run stadium:jamsil:operator-approval:status
npm run stadium:jamsil:operator-approval:approve -- --approved-by "operator-name" --notes "검수 완료"
npm run stadium:jamsil:operator-approval:verify
```

확정 row가 없으면 approval은 `WAITING_FOR_OPERATOR`이고 승인/verify는 실패한다. 현재 57개 확정 row packet은 approval까지 통과한 상태이며, 승인 후 handoff 또는 매점 packet 산출물이 바뀌면 `STALE_APPROVAL`로 전환된다.

## 운영자 packet 산출물

아래 명령은 운영자에게 전달할 입력 CSV와 개발자 handoff 리포트를 `reports/stadium/` 아래에 생성한다. `reports/`는 git ignored 산출물이며, 실제 운영자 CSV가 도착하면 같은 파일에 placeholder row를 실제 row로 교체한 뒤 검증 명령을 다시 실행한다.

```bash
npm run stadium:jamsil:operator-intake
```

생성/갱신되는 packet:

- `reports/stadium/jamsil-operator-visit-guide-input.csv`
- `reports/stadium/jamsil-operator-visit-guide-template.json`
- `reports/stadium/jamsil-operator-visit-guide-template.md`
- `reports/stadium/jamsil-operator-visit-guide-validation.json`
- `reports/stadium/jamsil-operator-visit-guide-validation.csv`
- `reports/stadium/jamsil-operator-visit-guide-validation.md`
- `reports/stadium/jamsil-food-candidate-review-validation.json`
- `reports/stadium/jamsil-food-candidate-review-validation.csv`
- `reports/stadium/jamsil-food-candidate-review-validation.md`
- `reports/stadium/jamsil-food-candidate-review-workset.json`
- `reports/stadium/jamsil-food-candidate-review-workset.csv`
- `reports/stadium/jamsil-food-candidate-review-workset.md`
- `reports/stadium/jamsil-food-candidate-intake-transfer.json`
- `reports/stadium/jamsil-food-candidate-intake-transfer.csv`
- `reports/stadium/jamsil-food-candidate-intake-transfer.md`
- `reports/stadium/jamsil-food-candidate-apply-plan.json`
- `reports/stadium/jamsil-food-candidate-apply-plan.md`
- `reports/stadium/jamsil-food-candidate-apply-plan.ts-fragment`
- `reports/stadium/jamsil-operator-visit-guide-apply-plan.json`
- `reports/stadium/jamsil-operator-visit-guide-apply-plan.md`
- `reports/stadium/jamsil-operator-visit-guide-apply-plan.ts-fragment`
- `reports/stadium/jamsil-operator-visit-guide-handoff.json`
- `reports/stadium/jamsil-operator-visit-guide-handoff.md`
- `reports/stadium/jamsil-operator-visit-guide-approval.json`
- `reports/stadium/jamsil-operator-visit-guide-approval.md`

초기 placeholder packet의 정상 상태는 `waiting_for_operator`이다. 현재 매점 후보 packet은 `operator-validate`와 `operator-apply-plan`이 `ready_for_manual_apply`가 된 뒤 approval까지 통과했고, TS fragment의 `JAMSIL_OPERATOR_FACILITY_POINTS`와 `JAMSIL_BLOCK_VISIT_GUIDANCE`가 수동 적용되었다. `JAMSIL_OPERATION_NOTICES`는 이번 매점 작업에서 변경하지 않았다.

## 1단계: 출입구 검수

운영자가 확인해야 하는 항목:

- 좌석 범위별 실제 권장 출입구가 공식 좌석도 기반 후보와 같은지
- 중앙문이 일반 관람객에게 노출되면 안 되는지
- 휠체어석/유모차/동행약자 기준 권장 출입구가 별도인지
- 경기일, 홈팀, 행사에 따라 출입구 운영이 바뀌는지

운영자 확인 후 입력 대상:

- `JAMSIL_OPERATOR_FACILITY_POINTS`: `ENTRANCE` point
- `JAMSIL_BLOCK_VISIT_GUIDANCE`: block별 `recommendedEntrancePointIds`

입력 파일 초안은 아래 명령으로 생성한다.

```bash
npm run stadium:jamsil:operator-intake
```

## 2단계: 매점/편의시설 검수

운영자가 확인해야 하는 항목:

- 매점, 화장실, 편의점, 수유실, 엘리베이터, 굿즈샵의 실제 위치
- 각 시설의 운영 상태와 경기일 운영 시간
- 좌석 블록별 가까운 시설 순서
- 휠체어 접근 가능 여부
- 운영 중단, 위치 변경, 임시 매장 여부
- 매점 row는 `JAMSIL_FOOD_FACILITY_COLLECTION_SCHEMA`의 `facilityName`, `floor`, `side`, `nearSectionIds`, `locationText`, `openStatus`, `verificationStatus`를 모두 채운다.
- `accessible`, `walkingMinutes`가 미확정이면 `UNKNOWN`으로 남기고, 실측 없이 임의 값을 넣지 않는다.
- 후보 검수 작업표의 확정 row만 공통 intake 템플릿으로 옮긴다.
- `nearSectionIds`와 기타 ID 목록은 세미콜론으로 구분한다. 예: `block-109;block-110`
- 확정 매점 row는 `operatorVerificationStatus=OPERATOR_CONFIRMED`로 검수표를 통과한 뒤 입력 CSV의 `facility` row로 옮긴다.

운영자 확인 후 입력 대상:

- `JAMSIL_OPERATOR_FACILITY_POINTS`: `CONCESSION`, `RESTROOM`, `ELEVATOR`, `TRANSIT`, `PARKING` point
- `JAMSIL_BLOCK_VISIT_GUIDANCE`: block별 `nearbyFacilityPointIds`

## 3단계: 경기일 운영 동선 공지

운영자가 확인해야 하는 항목:

- 적용 경기일 또는 기간
- 홈팀 기준 적용 여부: `COMMON`, `LG`, `DOOSAN`
- 영향받는 블록 또는 전체 블록 여부
- 임시 폐쇄 출입구, 우회 동선, 대체 시설
- 공지 우선순위

운영자 확인 후 입력 대상:

- `JAMSIL_OPERATION_NOTICES`

## 필수 메타데이터

모든 운영자 row에는 아래 값이 필요하다.

- `sourceDocumentId`: 예: `jamsil-operator-20260531-visit-guide-v1`
- `lastUpdatedAt`: KST 기준 `YYYY-MM-DD`
- 내부 검수자 확인: 원본 문서와 입력 row의 출입구/시설/블록 범위 일치 여부

## 반영 기준

- 공식 master 데이터는 확인 가능한 시설 안내만 해소한다.
- 공식 좌석도 위치 기반 추정값은 `INFERRED_FROM_OFFICIAL_MAP` 상태와 caution note를 유지한다.
- 2차 매점 후보는 `SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION`과 `DISABLED_UNTIL_OPERATOR_CONFIRMED` 상태를 유지한다.
- 좌석 상세의 매점/화장실/도보시간, 오늘의 운영 동선 공지는 운영자 검수 row만 사용한다.
- 운영자 row가 일부만 들어오면 나머지 항목은 계속 `MANUAL_BASEBALL_DATA_REQUIRED`를 표시한다.

검수 후에는 아래 순서로 blocker가 없는지 확인한다.

```bash
npm run stadium:jamsil:food-candidate-validate
npm run stadium:jamsil:operator-validate
npm run stadium:jamsil:operator-apply-plan
npm run stadium:jamsil:operator-handoff
```
