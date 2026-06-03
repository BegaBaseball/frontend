# 대구 좌석도 V2 백로그

작성일: 2026-05-05

## 범위 원칙

- V2도 외부 크롤링, 웹 검색 기반 좌석/장소 데이터 보강은 금지한다.
- 좌표, 블록명, 공식 시야/장소 정보는 공식 자료 또는 운영자 검수 자료가 들어온 경우에만 반영한다.
- `NEEDS_OPERATOR_REVIEW` 블록은 검수 전까지 선택 가능 상태를 유지하되, 정확 좌표로 확정하거나 `OFFICIAL_IMAGE_TRACED`로 승격하지 않는다.

## 우선순위

1. 운영자 검수 패키지 확정
   - 입력: `npm run stadium:daegu:operator-handoff`, `npm run stadium:daegu:handoff-evidence`, `npm run stadium:daegu:canonical-retrace-batch -- <batchKey>` 산출물. 삭제된 historical 단계별 스크립트는 Git history로만 복구한다.
   - 출력: 블록별 승인/반려, 보정 path, 검수자, 검수일.
   - 완료 기준: 승인된 블록만 `imageGeometry.d`, `sourceConfidence`, `traceStatus`, `reviewNote` 갱신.

2. 모바일 제스처 고도화
   - pinch zoom, 두 손가락 pan, double tap reset을 추가한다.
   - 완료 기준: 390px, 430px, 태블릿 폭에서 horizontal overflow 0, 지도 조작 중 bottom sheet가 오작동하지 않음.

3. 검색 결과 정렬 고도화
   - 정확 블록 코드, 공식 블록명, 구역명, alias 순으로 랭킹한다.
   - 완료 기준: `1-1`, `블루존`, `원정응원석`, `VIP`가 의도한 우선순위로 정렬되고 선택/지도/상세 패널이 동기화됨.

4. 운영자 검수 UI
   - debug overlay, evidence crop, candidate path를 한 화면에서 비교하는 내부 운영 화면을 검토한다.
   - 완료 기준: 운영자가 승인 결과를 남길 수 있지만, 자동 반영은 하지 않고 별도 PR로 데이터 diff를 검토함.

5. 공식 시야 사진 연동
   - 다이어리 공유 시야 사진 중 승인된 사진만 좌석 상세에 노출한다.
   - 완료 기준: 사진 출처, 작성일, 블록/구역 alias 매칭 기준이 사용자에게 명확히 표시됨.

6. 장소/먹거리 보강
   - 구장 내부 매장, 게이트, 편의시설은 공식/운영자 제공 자료 기반으로만 추가한다.
   - 완료 기준: 자료 출처와 검수일이 남고, 좌석도 UX와 별도 PR로 배포 가능함.

## V1에서 확인된 차단 항목

- 현재 워크스페이스에는 152개 `NEEDS_OPERATOR_REVIEW` 블록을 확정할 운영자 승인 자료가 없다.
- `src/data/daeguSeatData.ts`에는 일부 블록을 `OFFICIAL_IMAGE_TRACED`로 승격한 기존 diff가 보이지만, V1 범위와 충돌하므로 별도 검수/승인 없이 포함하면 안 된다.

## 2026-05-05 실행 기록

- evidence 재생성 기준: 총 177개, `OFFICIAL_IMAGE_TRACED` 29개, `NEEDS_OPERATOR_REVIEW` 148개.
- 첫 반영 배치: `1-1`, `1-2`, `3-2`, `3-4`.
- `1-1`, `1-2`는 원정응원석 검색/선택 수용 기준과 연결되어 우선 보정했다.
- `3-2`, `3-4`는 블루존 검색/선택 수용 기준과 연결되어 우선 보정했다.
- 접근성석 P0(`09 휠체어`, `TC 휠체어`, `U22 휠체어`)은 crop상 경계가 모호하거나 후보가 중복되어 이번 배치에서는 승격하지 않았다.
- `VIP` 검색 축의 남은 `M-9`는 `NO_SEED_COLOR` 상태라 공식/운영자 확정 근거 없이 승격하지 않는다.
- 두 번째 반영 배치: `S1`, `S2`, `S3`, `S4`, `S5`.
- `S1`~`S5`는 공식 PNG에서 독립 직사각형 경계가 명확하고 pixel candidate가 현재 path와 일치해 정수 원본 좌표로 보정 후 `OFFICIAL_IMAGE_TRACED`로 승격했다.
- 두 번째 evidence 재생성 기준: 총 177개, `OFFICIAL_IMAGE_TRACED` 34개, `NEEDS_OPERATOR_REVIEW` 143개.
- 남은 P1(`1-4`, `1-5`, `T1-*`, `V*`, `TC-*`, `3-6`, `T3-*`, `U21`~`U24`, `M-9`)은 중복 후보, 라벨/영역 불일치, 내부 구획 미표기, 색상 후보 부재 중 하나에 해당해 운영자 보정 path 없이는 승격하지 않는다.
- 세 번째 반영 배치: `S8`~`S21`.
- `S8`~`S21`은 공식 PNG에서 하단 SKY 지정석의 연속 독립 블록으로 흰 구분선과 라벨이 명확하고, 중복 없는 pixel candidate가 실제 색상 영역과 일치해 정수 원본 좌표로 보정 후 `OFFICIAL_IMAGE_TRACED`로 승격했다.
- 세 번째 evidence 재생성 기준: 총 177개, `OFFICIAL_IMAGE_TRACED` 48개, `NEEDS_OPERATOR_REVIEW` 129개.

## 권장 검증

- `npm run test:stadium:seatmaps`
- `npm run qa:stadium:daegu:mobile`
- `npm run qa:stadium:daegu:full`
- `npm run qa:stadium:daegu:release-lock`
- `npm run cy:run -- --spec cypress/e2e/stadium.cy.ts`
- `npm run build`
