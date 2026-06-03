# 구장 운영자 직관 안내 데이터 정책

상태: active

이 정책은 `/stadium` 좌석 상세 패널에 표시하는 권장 출입구, 가까운 매점/편의시설, 날짜별 운영 동선 공지 데이터에 적용한다. 현재 적용 대상은 고척 스카이돔, 인천 SSG 랜더스필드, 수원 KT 위즈파크, 서울잠실야구장이며, 이후 다른 구장으로 확장할 때도 같은 정책을 따른다.

## 허용 데이터

- 구단 또는 구장 운영자가 제공한 자료.
- 내부 검수자가 `sourceDocumentId`와 `lastUpdatedAt`을 부여한 자료.
- `docs/stadium/operator-visit-guide-intake-template.csv` 형식으로 정리된 자료.
- 검수 후 정적 TS 데이터 파일에 반영된 자료.

## 금지 데이터

- 외부 야구 데이터 crawling.
- scraping 기반 장소/동선 보강.
- web search 기반 출입구, 매점, 운영 동선 보강.
- 좌석 위치만 보고 추정한 게이트명, 매점명, 이동 동선.
- 런타임에서 운영자 원본 PDF, CSV, 이미지 파일을 직접 파싱하는 구현.
- 런타임 데이터에 외부 URL을 저장하는 방식.

## 결측 처리

- 운영자 자료가 없으면 항목 단위로 `MANUAL_BASEBALL_DATA_REQUIRED`를 표시한다.
- 일부 필드만 불명확하면 해당 필드만 `MANUAL_BASEBALL_DATA_REQUIRED` 상태로 유지한다.
- 불명확한 값을 근접 블록, 좌석 방향, 지도 이미지로 추정해 채우지 않는다.

## 입력 게이트

- 운영자 원본은 런타임에서 직접 읽지 않고, 먼저 구장별 operator intake 명령으로 CSV 입력, 검증 리포트, 수동 적용 계획, handoff 문서를 생성한다.
- `operator-validate`는 unknown block, missing facility reference, invalid date range, invalid priority, invalid ID pattern, placeholder 혼입, 운영자 facility 필수 상세값 누락, 외부 URL, crawling/scraping/web search 문구를 blocker로 처리한다.
- `operator-apply-plan`은 검증 통과 데이터만 정규화해 수동 적용용 fragment를 생성한다.
- 구장별 후보 검수표가 있는 경우 후보 검수 게이트는 확정 row 필수값과 런타임 미승격 상태를 함께 확인한다.
- 입력 게이트 명령은 구장별 정적 source file을 자동으로 수정하지 않는다. source write는 내부 검수 후 별도 코드 변경으로만 처리한다.
- 게이트 상태가 `waiting_for_operator` 또는 `blocked`이면 UI는 기존 `MANUAL_BASEBALL_DATA_REQUIRED` fallback을 유지한다.

## 런타임 계약

- 백엔드 API, DB schema, stadium registry 공개 계약은 변경하지 않는다.
- 런타임은 검수된 정적 TS/JSON 데이터만 읽는다.
- 날짜별 운영 공지는 KST `YYYY-MM-DD` 기준으로 `validFrom <= today <= validTo`인 항목만 기본 노출한다.
- 같은 날짜에 여러 공지가 있으면 `priority`가 높은 순서로 표시한다.

## 반영 순서

1. 운영자 원본을 내부 문서 ID로 등록한다.
2. 구장별 `operator-intake` 명령으로 입력 CSV와 handoff 리포트를 생성한다.
3. `operator-visit-guide-intake-template.csv` 컬럼에 맞춰 point, block, notice row를 작성한다.
4. `operator-validate`와 `operator-apply-plan` 결과가 `ready_for_manual_apply`인지 확인한다.
5. 원본 담당자와 내부 검수자가 `sourceDocumentId`, `lastUpdatedAt`, ID 규칙, 날짜 범위, TS fragment를 확인한다.
6. 검수된 row만 별도 코드 변경으로 구장별 정적 데이터 파일에 옮긴다.
7. 구장별 operator guide 테스트와 `npm run test:stadium:seatmaps`를 실행한다.
