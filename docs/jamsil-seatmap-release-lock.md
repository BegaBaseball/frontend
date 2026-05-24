# 잠실 야구장 좌석도 release lock

검수 고정일: 2026-05-24 KST

## 기준

- 공식 asset: `src/assets/stadiums/lg/jamsil-lg-seatmap-default-2026.webp`
- 기준 데이터: `JAMSIL_BLOCKS` (109개: 104 numbered + 5 special)
- 좌표계: 이미지 픽셀 좌표 (imageGeometry.d, labelX, labelY)
- traceStatus 시스템 없음

## 고정 상태

- `totalBlocks=109`
- `officialAssetSha256=e0d7aa65372ebf6b206ce519f8ed4e73e64232377ec9ace2b871be7a57e8537b`
- `releaseFixtureFingerprint=4ed2c6ba5a647d0ca68e8540e801164031c09153ab3d1af3e1bd15da920d272e`

## 운영 규칙

- 이 문서 기준 상태에서는 잠실 야구장 좌석 polygon 전수 재작업을 진행하지 않는다.
- 사람이 명확한 시각 불일치나 클릭 충돌을 발견하면 해당 block의 imageGeometry만 수정한다.
- 좌표나 asset 변경이 발생하면 `jamsil-seatmap-ops.mjs`의 SHA256 상수를 갱신하고 release gate를 재실행한다.
- 외부 야구 데이터 수집, 웹 검색, 제3자 좌석도 복사는 사용하지 않는다.

## 릴리즈 게이트

```bash
npm run qa:stadium:jamsil:release-lock
npm run qa:stadium:jamsil:mobile
```

릴리즈 차단 조건:

- `totalBlocks`가 `109`이 아니다.
- `officialAssetSha256`이 고정값과 다르다.
- `releaseFixtureFingerprint`가 고정값과 다르다.

## 최종 검증 결과

검증 실행일: 2026-05-24 KST

- `npm run qa:stadium:jamsil:release-lock`: PASS
  - `totalBlocks=109`
  - `officialAssetSha256=e0d7aa65372ebf6b206ce519f8ed4e73e64232377ec9ace2b871be7a57e8537b`
  - `releaseFixtureFingerprint=4ed2c6ba5a647d0ca68e8540e801164031c09153ab3d1af3e1bd15da920d272e`
