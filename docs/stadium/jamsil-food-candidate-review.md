# 잠실 매점 후보 검수 작업표

상태: operator confirmed packet approved, manual source apply completed

이 문서는 `JAMSIL_SECONDARY_FOOD_ZONE_CANDIDATES`를 운영자 검수용 작업표로 풀어낸 것이다. 2026-05-31 기준 57개 후보 row는 사용자 제공 운영자 자료로 `OPERATOR_CONFIRMED` 처리되었다. 승인된 `reports/stadium/jamsil-food-candidate-apply-plan.ts-fragment`는 `src/data/jamsilOperatorVisitGuide.ts`의 `JAMSIL_OPERATOR_FACILITY_POINTS`와 `JAMSIL_BLOCK_VISIT_GUIDANCE`에 수동 적용되었다. `JAMSIL_OPERATION_NOTICES`는 변경하지 않는다.

## 작업 파일

- 후보 검수 CSV: `docs/stadium/jamsil-food-candidate-review.csv`
- 확정 입력 템플릿: `docs/stadium/operator-visit-guide-intake-template.csv`
- 런타임 입력 파일: `src/data/jamsilOperatorVisitGuide.ts`
- 검수 리포트: `reports/stadium/jamsil-food-candidate-review-validation.json`
- 운영자 검수 workset: `reports/stadium/jamsil-food-candidate-review-workset.json`
- intake 변환 CSV: `reports/stadium/jamsil-food-candidate-intake-transfer.csv`
- 수동 적용 계획: `reports/stadium/jamsil-food-candidate-apply-plan.json`
- 수동 적용 fragment: `reports/stadium/jamsil-food-candidate-apply-plan.ts-fragment`
- 운영자 승인 파일: `reports/stadium/jamsil-operator-visit-guide-approval.json`

## 검수 게이트

```bash
npm run stadium:jamsil:food-candidate-validate
npm run stadium:jamsil:food-candidate-review-workset
```

확정 row를 공통 운영자 intake 포맷으로 변환할 때는 운영자 자료 식별자를 함께 넘긴다. 현재 승인 packet의 source id/date는 아래 값을 사용한다.

```bash
npm run stadium:jamsil:food-candidate-transfer -- --source-document-id jamsil-operator-20260531-user-confirmed-food-review --last-updated-at 2026-05-31
```

좌석 상세 패널 반영용 수동 적용 fragment는 아래 명령으로 생성한다.

```bash
npm run stadium:jamsil:food-candidate-apply-plan -- --source-document-id jamsil-operator-20260531-user-confirmed-food-review --last-updated-at 2026-05-31
```

수동 적용 전 운영자 승인은 전체 handoff와 매점 packet hash를 묶어 확인한다.

```bash
npm run stadium:jamsil:operator-approval
npm run stadium:jamsil:operator-approval:status
npm run stadium:jamsil:operator-approval:approve -- --approved-by "operator-name" --notes "검수 완료"
npm run stadium:jamsil:operator-approval:verify
```

상태값:

- `waiting_for_operator`: 후보 row만 있고 운영자 확정 row가 아직 없는 상태.
- `ready_for_operator_intake_transfer`: `OPERATOR_CONFIRMED` row를 운영자 입력 CSV의 `facility` row로 옮길 수 있는 상태.
- `blocked`: 후보 row 누락/중복, 잘못된 status, 외부 URL/크롤링/검색 문구, 확정 row 필수값 누락이 있는 상태.

transfer 상태값:

- `waiting_for_operator`: 확정 row가 없어 header-only CSV만 생성된 상태.
- `ready_for_operator_validate`: 확정 row가 `facility` row로 변환되어 `operator-validate` 입력으로 사용할 수 있는 상태.
- `blocked`: 확정 row는 있으나 운영자 source id/date가 없거나 검수표가 blocked인 상태.

apply plan 상태값:

- `waiting_for_operator`: 확정 row가 없어 빈 fragment만 생성된 상태.
- `ready_for_manual_apply`: 확정 매점이 `JAMSIL_OPERATOR_FACILITY_POINTS`와 `JAMSIL_BLOCK_VISIT_GUIDANCE` fragment로 변환된 상태.
- `blocked`: 확정 row는 있으나 운영자 source id/date가 없거나 검수표가 blocked인 상태.

approval 상태값:

- `WAITING_FOR_OPERATOR`: 확정 row가 없어 승인 대상이 아직 없는 상태.
- `PENDING_OPERATOR_APPROVAL`: handoff와 매점 packet이 준비되어 운영자 승인을 기다리는 상태.
- `APPROVED`: 운영자가 현재 handoff와 매점 packet hash를 승인한 상태.
- `STALE_APPROVAL`: 승인 후 handoff 또는 매점 packet 산출물이 바뀐 상태.

## 검수 방식

현재 작업표는 전체 57개 row가 `OPERATOR_CONFIRMED` 상태다. `operatorFacilityId`는 CSV row 번호 기반 `jamsil-facility-concession-food-###` 형식을 사용하고, `operatorNearSectionIds`는 사용자 승인 zone별 넓은 block mapping만 사용한다. 운영 상태, 접근성, 도보시간은 확정 자료가 없으므로 `UNKNOWN`으로 유지한다.

1. `jamsil-food-candidate-review.csv`에서 후보 매점별로 실제 존재 여부를 확인한다.
2. 확인된 row만 `operatorFacilityId`, `operatorNearSectionIds`, `operatorLocationText`, `operatorOpenStatus`, `operatorAccessible`, `operatorWalkingMinutes`, `operatorVerificationStatus`를 채운다.
3. `operatorVerificationStatus`가 `OPERATOR_CONFIRMED`인 row만 `operator-visit-guide-intake-template.csv`의 `facility` row로 옮긴다.
4. 좌석 블록별 가까운 매점 순서가 확인된 경우에만 `block` row의 `nearbyFacilityPointIds`에 연결한다.
5. 검수되지 않은 후보는 `SECONDARY_MAP_DERIVED_NEEDS_CONFIRMATION` 상태로 남긴다.

## 검증 명령

```bash
npm run stadium:jamsil:food-candidate-validate
```

확정 row가 없으면 `waiting_for_operator`가 정상이다. 현재 CSV처럼 `OPERATOR_CONFIRMED` row가 있으면 `operatorFacilityId`, `operatorNearSectionIds`, `operatorLocationText`, `operatorOpenStatus`, `operatorAccessible`, `operatorWalkingMinutes`가 모두 검증되며 57개 확정 row 기준 정상 상태는 `ready_for_operator_intake_transfer`다.

운영자에게 전달할 검수 패킷은 `food-candidate-review-workset` 명령으로 생성한다. 이 명령은 후보 57개를 zone별로 묶고 각 row를 `WAITING_FOR_OPERATOR`, `OPERATOR_CONFIRMED`, `REJECTED`, `NEEDS_RECHECK`, `BLOCKED` 상태로 표시한다. 생성되는 CSV에는 기존 후보 컬럼에 `reviewBatchId`, `rowState`, `missingOperatorFields`, `nextAction`이 추가된다.

변환 명령은 확정 row가 있을 때 `--source-document-id`가 `jamsil-operator-YYYYMMDD-*` 형식을 따르고 `--last-updated-at`이 `YYYY-MM-DD`인지 추가 확인한다. 이 값이 없으면 런타임 반영 경로를 열지 않는다.

수동 적용 계획은 `operatorNearSectionIds`에 적힌 block만 수정한다. 확정 매점 id는 해당 block의 `nearbyFacilityPointIds` 앞쪽에 추가하고, 기존 매표소/접근성/굿즈샵 참조는 유지한다. `JAMSIL_OPERATION_NOTICES`는 이 작업에서 변경하지 않는다.

승인 게이트는 `jamsil-operator-visit-guide-handoff`, 운영자 validate/apply-plan, 매점 validate/transfer/apply-plan 산출물의 hash를 저장한다. approval 파일은 검수 상태만 기록하며 `src/data/jamsilOperatorVisitGuide.ts`를 수정하지 않는다.

## 필수 확인값

- `operatorFacilityId`: `jamsil-facility-concession-*` 형식
- `operatorNearSectionIds`: 예: `block-109;block-110`
- `operatorLocationText`: 사용자에게 노출 가능한 위치 문구
- `operatorOpenStatus`: `OPEN`, `CLOSED`, `GAME_DAY_ONLY`, `UNKNOWN` 중 검수자가 확정한 값
- `operatorAccessible`: `YES`, `NO`, `UNKNOWN`
- `operatorWalkingMinutes`: 실측 전이면 `UNKNOWN`
- `operatorVerificationStatus`: 확정 시 `OPERATOR_CONFIRMED`
- `REJECTED` 또는 `NEEDS_RECHECK` row는 `reviewerNote`를 채운다.

## 금지

- 후보 매점명을 운영자 확인 없이 런타임에 노출하지 않는다.
- 블록별 가까운 매점 순서를 좌석 위치만 보고 추정하지 않는다.
- 실측 없는 도보 분 단위 값을 만들지 않는다.
- 외부 URL이나 원본 파일 경로를 런타임 데이터에 넣지 않는다.
