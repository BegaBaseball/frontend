# 고척 운영자 직관 안내 데이터 입력 포맷

상태: ready for operator-provided data

이 문서는 `/stadium` 고척 스카이돔 좌석 상세 패널의 권장 출입구, 가까운 매점/편의시설, 날짜별 운영 동선 공지를 입력할 때 사용하는 정적 데이터 계약이다. 런타임은 검수된 `src/data/gocheokOperatorVisitGuide.ts` 데이터만 읽고, 운영자 원본 PDF/CSV/이미지를 직접 파싱하지 않는다.

## 데이터 정책

- 허용 소스: 구단/구장 운영자가 제공하고 내부 검수자가 승인한 자료.
- 금지 소스: 외부 야구 데이터 crawling, scraping, web search, 추정 게이트명, 추정 매점명, 추정 동선.
- 운영자 자료가 없거나 불명확한 필드는 `MANUAL_BASEBALL_DATA_REQUIRED` 상태를 유지한다.
- 실제 출입구/매점/동선 문구는 운영자 자료가 들어오기 전까지 작성하지 않는다.
- 런타임 데이터에는 외부 URL을 넣지 않는다. 원본 식별은 `sourceDocumentId`만 사용한다.

## 입력 파일

- `src/data/gocheokOperatorVisitGuide.ts`
- 공통 intake 템플릿: `docs/stadium/operator-visit-guide-intake-template.csv`
- 공통 데이터 정책: `docs/stadium/operator-visit-guide-policy.md`
- 운영자 입력 CSV: `reports/stadium/gocheok-operator-visit-guide-input.csv`
- 검증 리포트: `reports/stadium/gocheok-operator-visit-guide-validation.json`
- 수동 적용 계획: `reports/stadium/gocheok-operator-visit-guide-apply-plan.json`
- 운영자/개발자 handoff: `reports/stadium/gocheok-operator-visit-guide-handoff.md`

## 입력 게이트

고척 운영자 자료는 source file에 바로 쓰지 않는다. 먼저 입력 CSV를 만들고 검증 리포트와 수동 적용 계획을 확인한다.

```bash
npm run stadium:gocheok:operator-intake
npm run stadium:gocheok:operator-validate
npm run stadium:gocheok:operator-apply-plan
npm run stadium:gocheok:operator-handoff
```

게이트 상태:

- `waiting_for_operator`: placeholder-only 또는 운영자 제공 row가 아직 없는 상태. UI는 `MANUAL_BASEBALL_DATA_REQUIRED`를 유지한다.
- `blocked`: ID, 날짜, 참조, 금지어, placeholder 혼입 등 blocker가 있는 상태. source file에 반영하지 않는다.
- `ready_for_manual_apply`: 검증을 통과해 `reports/stadium/gocheok-operator-visit-guide-apply-plan.ts-fragment`를 수동 검토할 수 있는 상태.

no-source-write 계약:

- `operator-template`, `operator-validate`, `operator-apply-plan`, `operator-handoff`, `operator-intake`는 `src/data/gocheokOperatorVisitGuide.ts`를 수정하지 않는다.
- `operator-apply-plan`은 수동 검토용 TS fragment만 생성한다.
- 실제 반영은 내부 검수자가 fragment와 원본 문서 ID를 확인한 뒤 별도 코드 변경으로 처리한다.

운영자 자료는 아래 세 배열에만 반영한다.

- `GOCHEOK_OPERATOR_FACILITY_POINTS`: 출입구/매점/화장실/엘리베이터/주차/대중교통 지점.
- `GOCHEOK_BLOCK_VISIT_GUIDANCE`: 좌석 블록별 권장 출입구와 가까운 편의시설 참조.
- `GOCHEOK_OPERATION_NOTICES`: KST 날짜 기준 운영 동선 공지.

## 공통 필드

- `sourceDocumentId`: 운영자 제공 원본의 내부 식별자. 예: `gocheok-operator-20260528-visit-guide-v1`
- `lastUpdatedAt`: `YYYY-MM-DD` 형식의 KST 기준 검수일.
- 문자열 값은 빈 문자열이면 안 된다.
- 지점 ID와 공지 ID는 중복될 수 없다.

## Facility Point

`GocheokFacilityPoint`는 좌석 블록 안내에서 참조할 수 있는 운영자 제공 지점이다.

```ts
{
  id: 'gocheok-facility-entrance-operator-id',
  kind: 'ENTRANCE',
  label: '운영자 제공 지점명',
  dataStatus: 'OPERATOR_PROVIDED',
  sourceDocumentId: 'gocheok-operator-20260528-visit-guide-v1',
  lastUpdatedAt: '2026-05-28',
  note: '필요 시 운영자 제공 주의 문구'
}
```

허용 `kind` 값:

- `ENTRANCE`
- `CONCESSION`
- `RESTROOM`
- `ELEVATOR`
- `PARKING`
- `TRANSIT`

## Block Visit Guidance

`GocheokBlockVisitGuidance`는 `GOCHEOK_BLOCKS`의 `id`를 기준으로 작성한다. 지점명은 직접 쓰지 않고 `GOCHEOK_OPERATOR_FACILITY_POINTS`의 `id`만 참조한다.

```ts
{
  blockId: 'gocheok-block-d04',
  recommendedEntrancePointIds: ['gocheok-facility-entrance-operator-id'],
  nearbyFacilityPointIds: ['gocheok-facility-concession-operator-id'],
  cautionNotes: ['운영자 제공 주의 문구'],
  sourceDocumentId: 'gocheok-operator-20260528-visit-guide-v1',
  lastUpdatedAt: '2026-05-28'
}
```

규칙:

- `blockId`는 실제 `GOCHEOK_BLOCKS`에 존재해야 한다.
- `recommendedEntrancePointIds`는 `ENTRANCE` 지점만 참조한다.
- `nearbyFacilityPointIds`는 `CONCESSION`, `RESTROOM`, `ELEVATOR`, `PARKING`, `TRANSIT` 지점을 참조할 수 있다.
- 참조할 운영자 지점이 없으면 배열을 비워 두고 UI fallback을 유지한다.

## Operation Notice

`GocheokOperationNotice`는 KST `YYYY-MM-DD` 날짜 범위로 유효성을 판단한다.

```ts
{
  id: 'gocheok-operation-notice-20260528-main',
  validFrom: '2026-05-28',
  validTo: '2026-05-28',
  priority: 100,
  affectedBlockIds: ['gocheok-block-d04'],
  message: '운영자 제공 날짜별 운영 안내 문구',
  lastUpdatedAt: '2026-05-28',
  sourceDocumentId: 'gocheok-operator-20260528-operation-notice-v1'
}
```

규칙:

- `validFrom <= today <= validTo`인 공지만 기본 화면에 노출한다.
- 같은 날짜에 여러 공지가 있으면 `priority`가 높은 순서로 표시한다.
- `affectedBlockIds`가 비어 있으면 전체 블록 공지로 처리한다.
- `affectedBlockIds`가 비어 있지 않으면 실제 `GOCHEOK_BLOCKS`의 `id`만 넣는다.
- 만료 공지는 기본 화면에 노출하지 않는다.

## 반영 순서

1. 운영자 원본을 내부 문서 ID로 등록한다.
2. `npm run stadium:gocheok:operator-intake`로 기본 입력 CSV와 handoff 리포트를 생성한다.
3. 운영자 제공 row를 `reports/stadium/gocheok-operator-visit-guide-input.csv`에 작성한다.
4. `npm run stadium:gocheok:operator-validate`로 blocker가 없는지 확인한다.
5. `npm run stadium:gocheok:operator-apply-plan`로 `ready_for_manual_apply` 상태와 TS fragment를 확인한다.
6. 내부 검수 후 fragment를 참고해 `GOCHEOK_OPERATOR_FACILITY_POINTS`, `GOCHEOK_BLOCK_VISIT_GUIDANCE`, `GOCHEOK_OPERATION_NOTICES`를 수동 반영한다.
7. `npm run test:stadium:seatmaps`로 정적 데이터 계약을 검증한다.
8. 고척 Cypress QA로 좌석 선택, 직관 체크카드, 운영 안내 탭 전환을 확인한다.

## 현재 상태

현재 저장소에는 운영자 제공 출입구/매점/동선 자료가 들어오지 않았다. 따라서 고척 운영자 안내 데이터 배열은 비어 있고, UI는 `운영자 제공 자료 필요 · MANUAL_BASEBALL_DATA_REQUIRED`를 표시해야 한다.
