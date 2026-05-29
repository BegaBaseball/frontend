# 인천 SSG 랜더스필드 좌석도 release lock

검수 고정일: 2026-05-24 KST

## 기준

- 공식 asset: `src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.webp`
- 기준 데이터: `INCHEON_BLOCKS` (156개, `sourceConfidence: "OFFICIAL"` 전수)
- 좌표계: 이미지 픽셀 좌표 (imageGeometry.d, labelX, labelY)
- traceStatus 시스템 없음 (모든 블록이 공식 출처)

## 고정 상태

- `totalBlocks=156`
- `officialBlocks=156` (전원 `sourceConfidence === 'OFFICIAL'`)
- `officialAssetSha256=e1b0a20680f6b9ce8832a4af92d19c09a5abec987f5b8378d619f6746487b8d5`
- `releaseFixtureFingerprint=ff1421f842dba83886df3a06eb800ed6b155391045705a3db29156d67e171852`

## 운영 규칙

- 이 문서 기준 상태에서는 인천 좌석 polygon 전수 재작업을 진행하지 않는다.
- 사람이 명확한 시각 불일치나 클릭 충돌을 발견하면 해당 block의 imageGeometry만 수정한다.
- 좌표나 asset 변경이 발생하면 `incheon-seatmap-ops.mjs`의 SHA256 상수를 갱신하고 release gate를 재실행한다.
- 외부 야구 데이터 수집, 웹 검색, 제3자 좌석도 복사는 사용하지 않는다.

## 공개 명령

- `npm run qa:stadium:incheon:mobile`
- `npm run qa:stadium:incheon:full`
- `npm run qa:stadium:incheon:release-lock`
- `npm run stadium:incheon:status`

## 릴리즈 게이트

```bash
npm run stadium:incheon:status
npm run qa:stadium:incheon:release-lock
npm run qa:stadium:incheon:mobile
npm run qa:stadium:incheon:full
```

릴리즈 차단 조건:

- `totalBlocks`가 `156`이 아니다.
- `officialBlocks`가 `156`이 아니다.
- `officialAssetSha256`이 고정값과 다르다.
- `releaseFixtureFingerprint`가 고정값과 다르다.
- `qa:stadium:incheon:responsive`, `qa:stadium:incheon:trace-review`, `stadium:incheon:pixel-components` package alias가 공개된다.

## 최종 검증 결과

검증 실행일: 2026-05-29 KST

- `npm run stadium:incheon:status`: PASS
- `npm run qa:stadium:incheon:release-lock`: PASS
  - `totalBlocks=156`
  - `officialBlocks=156`
  - `officialAssetSha256=e1b0a20680f6b9ce8832a4af92d19c09a5abec987f5b8378d619f6746487b8d5`
  - `releaseFixtureFingerprint=ff1421f842dba83886df3a06eb800ed6b155391045705a3db29156d67e171852`
- `npm run qa:stadium:incheon:mobile`: PASS
- `npm run qa:stadium:incheon:full`: PASS
