# 창원 NC파크 좌석도 release candidate

릴리즈 후보 고정일: 2026-05-11 KST

## 범위

- 대상: 창원 NC파크 좌석도 123개 선택 영역
- 기준 asset: `src/assets/stadiums/nc/changwon-nc-seatmap-official-2026.png`
- 기준 데이터: `CHANGWON_IMAGE_GEOMETRY`, `CHANGWON_OFFICIAL_TRACE_REFERENCE`, `CHANGWON_BLOCKS`
- 좌표 fingerprint: `1b3e4d22d446ba5eede5102aa746f992851d2a5083671db3c541b06c0e96ee3b`
- trace source: `OFFICIAL_PNG_MANUAL_POLYGON`
- trace version: `manual-polygon-v2`

이번 릴리즈 후보는 좌표 재트레이싱이 아니라 UX+QA 고도화 결과를 고정한다. 좌표 변경이 필요하면 이 문서 상태에서 분리해 targeted polygon adjustment로 처리한다.

## 고정 수치

| 항목 | 값 |
| --- | --- |
| `totalBlocks` | `123` |
| `expectedVisibleBlocks` | `117` |
| `specialSelectableAreas` | `6` |
| `searchableSelectableAreas` | `123` |
| `filterGroups` | `7` |
| `missingFilterCounts` | `0` |
| `generatedScaledTrace` | `0` |
| `manualReviewed` | `123` |
| `topHitMismatches` | `0` |
| `expandedHitAreaInterceptWarnings` | `0` |
| `representativeProbeMismatches` | `0` |
| `foreignLabelAnchors` | `0` |
| `overlapWarnings` | `0` |
| `needsTraceAdjustment` | `0` |
| `lowCoverageApprovedExceptions` | `8` |
| `confirmedHumanSignoff` | `11` |
| `pendingHumanSignoff` | `0` |
| `traceAdjustmentCandidates` | `[]` |
| `releaseClassification` | `PASS_WITH_APPROVED_EXCEPTION` |

## UX 검수 항목

검색은 숫자 블록, 특수 구역명, 좌석 타입, 별칭, `seatViewSections`, 접근성 note를 대상으로 한다.

| Probe | 기대 상태 |
| --- | --- |
| `125` | exact numeric 검색으로 `125 3루 내야석` 즉시 선택 |
| `바베큐` | 결과 목록에 `1루 바베큐석`, `126`, `127` 포함 |
| `응원석` | 응원석/원정 응원석 블록 검색 가능 |
| `휠체어` | 접근성 note가 있는 25개 블록 검색 가능 |
| `외야 가족` | `외야 가족석` 특수 구역 검색 가능 |
| 존재하지 않는 검색어 | 기존 선택을 지우지 않고 `검색 결과 없음` 표시 |

필터는 다음 count를 기준으로 고정한다.

| 필터 | 선택 영역 수 |
| --- | --- |
| 전체 | `123` |
| 1층 | `40` |
| 2층 | `25` |
| 3·4층 | `58` |
| 응원석 | `8` |
| 외야·특수 | `26` |
| 휠체어 | `25` |

## 기준 산출물

- `reports/stadium/changwon-seatmap-trace-review.json`
- `reports/stadium/changwon-seatmap-trace-review.md`
- `reports/stadium/changwon-seatmap-visual-approval.json`
- `reports/stadium/changwon-seatmap-visual-approval.md`
- `reports/stadium/changwon-seatmap-ux-readiness.json`
- `reports/stadium/changwon-seatmap-ux-readiness.md`
- `output/playwright/stadium-ux-changwon-validate/stadium-mobile-smoke-summary.md`

## 릴리즈 게이트

```bash
npm run stadium:changwon:trace-manifest
npm run stadium:changwon:ux-readiness
node --import tsx --test src/data/changwonSeatData.test.ts src/components/StadiumGuideRuntimeSeatMaps.test.ts
npm run qa:stadium:changwon:trace-review
npm run test:stadium:seatmaps
npm run build
```

## 운영 규칙

- `CHANGWON_IMAGE_GEOMETRY`, `CHANGWON_OFFICIAL_TRACE_REFERENCE`, polygon `d`, label anchor, `hitStrokeWidth`는 이 릴리즈 후보의 좌표 fingerprint를 기준으로 보호한다.
- UX 문구, 검색 결과, 필터 표시 수정은 가능하지만 좌표 fingerprint 변경을 동반하면 별도 좌표 변경 PR로 분리한다.
- 사람이 시각 불일치나 클릭 충돌을 발견하면 해당 block 또는 stack만 `NEEDS_TRACE_ADJUSTMENT`로 분류한다.
- targeted polygon adjustment는 문제 block/stack, overlay artifact, 변경 사유, QA 재실행 결과를 함께 남긴다.
- 외부 야구 데이터 수집, 웹 검색, 제3자 좌석도 복사는 사용하지 않는다.
