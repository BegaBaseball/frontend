# 수원 운영자 직관 안내 데이터 입력 포맷

상태: ready for operator-provided data

이 문서는 `/stadium` 수원 KT 위즈파크 좌석 상세 패널의 권장 출입구, 가까운 매점/편의시설, 날짜별 운영 동선 공지를 입력할 때 사용하는 정적 데이터 계약이다. 런타임은 검수된 `src/data/suwonOperatorVisitGuide.ts` 데이터만 읽고, 운영자 원본 PDF/CSV/이미지를 직접 파싱하지 않는다.

## 데이터 정책

- 허용 소스: 구단/구장 운영자가 제공하고 내부 검수자가 승인한 자료.
- 금지 소스: 외부 야구 데이터 crawling, scraping, web search, 추정 게이트명, 추정 매점명, 추정 동선.
- 운영자 자료가 없거나 불명확한 필드는 `MANUAL_BASEBALL_DATA_REQUIRED` 상태를 유지한다.
- 실제 출입구/매점/동선 문구는 운영자 자료가 들어오기 전까지 작성하지 않는다.
- 런타임 데이터에는 외부 URL을 넣지 않는다. 원본 식별은 `sourceDocumentId`만 사용한다.

## 입력 파일

- `src/data/suwonOperatorVisitGuide.ts`
- 공통 intake 템플릿: `docs/stadium/operator-visit-guide-intake-template.csv`
- 공통 데이터 정책: `docs/stadium/operator-visit-guide-policy.md`

운영자 자료는 아래 세 배열에만 반영한다.

- `SUWON_OPERATOR_FACILITY_POINTS`: 출입구/매점/화장실/엘리베이터/주차/대중교통 지점.
- `SUWON_BLOCK_VISIT_GUIDANCE`: 좌석 블록별 권장 출입구와 가까운 편의시설 참조.
- `SUWON_OPERATION_NOTICES`: KST 날짜 기준 운영 동선 공지.

## 공통 규칙

- `sourceDocumentId`: 운영자 제공 원본의 내부 식별자. 예: `suwon-operator-20260528-visit-guide-v1`
- `lastUpdatedAt`: `YYYY-MM-DD` 형식의 KST 기준 검수일.
- 문자열 값은 빈 문자열이면 안 된다.
- 지점 ID와 공지 ID는 중복될 수 없다.
- `blockId`는 실제 `SUWON_BLOCKS`에 존재해야 한다.

## Facility Point

```ts
{
  id: 'suwon-facility-entrance-operator-id',
  kind: 'ENTRANCE',
  label: '운영자 제공 지점명',
  dataStatus: 'OPERATOR_PROVIDED',
  sourceDocumentId: 'suwon-operator-20260528-visit-guide-v1',
  lastUpdatedAt: '2026-05-28'
}
```

허용 `kind` 값은 `ENTRANCE`, `CONCESSION`, `RESTROOM`, `ELEVATOR`, `PARKING`, `TRANSIT`이다.

## Block Visit Guidance

```ts
{
  blockId: 'suwon-117',
  recommendedEntrancePointIds: ['suwon-facility-entrance-operator-id'],
  nearbyFacilityPointIds: ['suwon-facility-concession-operator-id'],
  cautionNotes: ['운영자 제공 주의 문구'],
  sourceDocumentId: 'suwon-operator-20260528-visit-guide-v1',
  lastUpdatedAt: '2026-05-28'
}
```

규칙:

- `recommendedEntrancePointIds`는 `ENTRANCE` 지점만 참조한다.
- `nearbyFacilityPointIds`는 `CONCESSION`, `RESTROOM`, `ELEVATOR`, `PARKING`, `TRANSIT` 지점을 참조할 수 있다.
- 참조할 운영자 지점이 없으면 배열을 비워 두고 UI fallback을 유지한다.

## Operation Notice

```ts
{
  id: 'suwon-operation-notice-20260528-main',
  validFrom: '2026-05-28',
  validTo: '2026-05-28',
  priority: 100,
  affectedBlockIds: ['suwon-117'],
  message: '운영자 제공 날짜별 운영 안내 문구',
  lastUpdatedAt: '2026-05-28',
  sourceDocumentId: 'suwon-operator-20260528-operation-notice-v1'
}
```

규칙:

- `validFrom <= today <= validTo`인 공지만 기본 화면에 노출한다.
- 같은 날짜에 여러 공지가 있으면 `priority`가 높은 순서로 표시한다.
- `affectedBlockIds`가 비어 있으면 전체 블록 공지로 처리한다.
- `affectedBlockIds`가 비어 있지 않으면 실제 `SUWON_BLOCKS`의 `id`만 넣는다.
- 만료 공지는 기본 화면에 노출하지 않는다.

## 현재 상태

현재 저장소에는 운영자 제공 출입구/매점/동선 자료가 들어오지 않았다. 따라서 수원 운영자 안내 데이터 배열은 비어 있고, UI는 `운영자 제공 자료 필요 · MANUAL_BASEBALL_DATA_REQUIRED`를 표시해야 한다.
