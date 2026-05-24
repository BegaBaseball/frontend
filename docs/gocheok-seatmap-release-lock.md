# 고척 스카이돔 좌석도 release lock

검수 고정일: 2026-05-24 KST

## 기준

- 공식 asset: `src/assets/stadiums/kiwoom/gocheok-kiwoom-seatmap-official-2026.webp`
- 공식 이미지 좌표계: `653x960`
- 기준 데이터: `GOCHEOK_IMAGE_GEOMETRY_DRAFTS`, `GOCHEOK_BLOCKS`, `GOCHEOK_TRACE_REVIEWED_BLOCK_IDS`
- trace method: `OFFICIAL_IMAGE_PIXEL_TRACE`
- browser QA source: `scripts/stadium-ux-audit.mjs`

## 고정 상태

- `totalBlocks=159`
- `traceReviewedBlockIds=159`
- `manualTodoBlocks=0`
- `omittedOfficialBlocks=1`
- `topHitMismatches=0`
- `overlapWarnings=0`
- `representativeProbeMismatches=0`

## 기준 산출물

- Trace manifest: `reports/stadium/gocheok-seatmap-trace-review.json`
- Trace summary: `reports/stadium/gocheok-seatmap-trace-review.md`

## 운영 규칙

- 이 문서 기준 상태에서는 고척 스카이돔 좌석 polygon 전수 재트레이싱을 진행하지 않는다.
- 사람이 명확한 시각 불일치나 클릭 충돌을 발견하면 해당 block만 `MANUAL_REVIEW_REQUIRED`로 분류한다.
- 외부 야구 데이터 수집, 웹 검색, 제3자 좌석도 복사는 사용하지 않는다.
- 좌표 변경이 발생하면 trace manifest와 isolated browser QA를 다시 생성한다.

## 릴리즈 게이트

```bash
npm run qa:stadium:gocheok:release-lock
npm run stadium:gocheok:trace-manifest
npm run qa:stadium:gocheok:mobile
```

릴리즈 차단 조건:

- `totalBlocks`가 `159`이 아니다.
- `traceReviewedBlockIds`가 `159`이 아니다.
- `manualTodoBlocks`가 `0`이 아니다.
- `topHitMismatches`, `overlapWarnings`, `representativeProbeMismatches` 중 하나라도 `0`이 아니다.

## 최종 검증 결과

검증 실행일: 2026-05-24 KST

- `npm run qa:stadium:gocheok:release-lock`: PASS
  - `totalBlocks=159`
  - `traceReviewedBlockIds=159`
  - `manualTodoBlocks=0`
  - `omittedOfficialBlocks=1`
- `npm run stadium:gocheok:trace-manifest`: PASS
  - `total=159 reviewed=159 pending=0`
- `npm run qa:stadium:gocheok:mobile`: PASS
