# 잠실 야구장 좌석도 release lock

검수 고정일: 2026-05-24 KST

## 기준

- 공식 asset: `src/assets/stadiums/lg/jamsil-lg-seatmap-default-2026.webp`
- 기준 데이터: `JAMSIL_BLOCKS` (109개: 104 numbered + 5 special)
- 좌표계: 이미지 픽셀 좌표 (imageGeometry.d, labelX, labelY)
- traceStatus 시스템 없음
- 운영자 직관 안내 source: `src/data/jamsilOperatorVisitGuide.ts`
- 운영자 직관 안내 policy: `docs/stadium/operator-visit-guide-policy.md`
- 현재 운영자 제공 출입구/매점/동선 자료는 비어 있으며, 좌석 상세 패널은 항목 단위로 `MANUAL_BASEBALL_DATA_REQUIRED`만 표시한다.

## 고정 상태

- `totalBlocks=109`
- `officialAssetSha256=e0d7aa65372ebf6b206ce519f8ed4e73e64232377ec9ace2b871be7a57e8537b`
- `releaseFixtureFingerprint=4ed2c6ba5a647d0ca68e8540e801164031c09153ab3d1af3e1bd15da920d272e`

## 운영 규칙

- 이 문서 기준 상태에서는 잠실 야구장 좌석 polygon 전수 재작업을 진행하지 않는다.
- 사람이 명확한 시각 불일치나 클릭 충돌을 발견하면 해당 block의 imageGeometry만 수정한다.
- 좌표나 asset 변경이 발생하면 `jamsil-seatmap-ops.mjs`의 SHA256 상수를 갱신하고 release gate를 재실행한다.
- 외부 야구 데이터 수집, 웹 검색, 제3자 좌석도 복사는 사용하지 않는다.
- 권장 출입구, 가까운 매점/편의시설, 날짜별 운영 동선 공지는 운영자 제공 정적 데이터만 사용한다.
- 운영자 자료가 없거나 불명확한 항목은 좌석 위치/지도 이미지로 추정하지 않고 `MANUAL_BASEBALL_DATA_REQUIRED` 상태를 유지한다.

## 공개 명령

- `npm run qa:stadium:jamsil:mobile`
- `npm run qa:stadium:jamsil:full`
- `npm run qa:stadium:jamsil:release-lock`
- `npm run stadium:jamsil:status`

## 내부 dispatcher task

- `node scripts/stadium-seatmap-ops.mjs jamsil responsive`

## 릴리즈 게이트

```bash
npm run qa:stadium:jamsil:release-lock
node --import tsx --test --test-concurrency=1 src/data/jamsilOperatorVisitGuideSeatData.test.ts
npm run qa:stadium:jamsil:mobile
npm run qa:stadium:jamsil:full
```

릴리즈 차단 조건:

- `totalBlocks`가 `109`이 아니다.
- `officialAssetSha256`이 고정값과 다르다.
- `releaseFixtureFingerprint`가 고정값과 다르다.
- `qa:stadium:jamsil:responsive` package alias가 다시 공개된다.
- `src/data/jamsilOperatorVisitGuide.ts`가 운영자 제공 배열 외의 외부 URL, crawling, scraping, web search, 원본 파일 runtime parsing 계약을 포함한다.
- 좌석 상세 패널의 직관 안내 영역이 운영자 제공 값 또는 `MANUAL_BASEBALL_DATA_REQUIRED`가 아닌 추정 출입구/매점/동선 값을 표시한다.
- 운영자 자료가 없는 상태에서 `jamsil-operator-entrance`, `jamsil-operator-facilities`, `jamsil-operator-notice`, `jamsil-operator-updated-at` 중 하나라도 `MANUAL_BASEBALL_DATA_REQUIRED` fallback을 잃는다.

## 최종 검증 결과

검증 실행일: 2026-05-24 KST

- `npm run qa:stadium:jamsil:release-lock`: PASS
  - `totalBlocks=109`
  - `officialAssetSha256=e0d7aa65372ebf6b206ce519f8ed4e73e64232377ec9ace2b871be7a57e8537b`
  - `releaseFixtureFingerprint=4ed2c6ba5a647d0ca68e8540e801164031c09153ab3d1af3e1bd15da920d272e`
- `node scripts/stadium-seatmap-ops.mjs jamsil responsive`: PASS
- `node --import tsx --test --test-concurrency=1 src/data/jamsilOperatorVisitGuideSeatData.test.ts`: PASS, operator guide fallback contract `11/11` (2026-05-29 KST)
