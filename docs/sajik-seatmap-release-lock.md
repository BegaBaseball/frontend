# 사직 롯데 좌석도 release lock

검수 고정일: 2026-05-12 KST

## 기준

- 공식 asset: `src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png`
- 공식 이미지 좌표계: `960x640`
- 기준 데이터: `SAJIK_SEATMAP_IMAGE`, `SAJIK_BLOCKS`, `SAJIK_OFFICIAL_TRACE_REFERENCE`, `SAJIK_TRACE_REVIEW_SUMMARY`
- trace source: `OFFICIAL_PNG_MANUAL_POLYGON`
- trace version: `manual-polygon-v2`
- trace method: `PATH_TRACED_FROM_OFFICIAL_IMAGE`
- pixel alignment: 공식 PNG 색상 블럭이 확인되는 블럭은 `PIXEL_ALIGNED`, 공식 PNG 독립 색상 블럭이 보이지 않는 운영 호환 블럭은 `OFFICIAL_PNG_BLOCK_NOT_VISIBLE`

## 고정 상태

- `SAJIK_BLOCKS.length === 89`
- `totalBlocks=89`
- `p0Blocks=39`
- `p1Blocks=16`
- `p2Blocks=34`
- `officialImageTraced=89`
- `needsOperatorReview=0`
- `directOfficialTrace=89`
- `officialPngManualPolygon=89`
- `manualPolygonV2=89`
- `manualReviewed=89`
- `unreviewedBlocks=0`
- `pixelAligned=87`
- `manualReviewRequired=2`
- `officialPngBlockNotVisible=2`
- `alignmentLockedVerified=87`
- `alignmentFailures=0`
- `refinedPolygons=83`
- `labelTopHitFailures=0`
- `selfIntersections=0`
- `singleClosedPathViolations=0`
- `mobileZoomControlInterceptFailures=0`

## 기준 anchor

- P0 대표 anchor: `111`, `313`, `723`, `021`
- 접근성 anchor: `휠체어석-3루`, `휠체어석-중앙`, `휠체어석-1루`
- 중앙/테이블 anchor: `011`, `012`, `013`, `021`, `022`, `023`, `024`, `031`, `032`, `033`, `034`, `044`
- 겹침 민감 anchor pair: `311/321`, `112/121`, `132/142`, `914/922`
- 모바일 obstruction anchor: `723`

`723`은 모바일 390 viewport에서 zoom control 배경이 path 중심 클릭을 가로채지 않아야 한다. zoom 버튼 자체는 클릭 가능해야 하며, control wrapper만 `pointer-events-none`, 버튼은 `pointer-events-auto` 상태를 유지한다.

## 공식 PNG 미표시 예외

- 예외 블럭: `011`, `903`
- 두 블럭은 기존 운영 데이터 호환용 hit-area로 유지한다.
- 공식 PNG에서 독립 좌석 색상 블럭이 확인되지 않으므로 `PIXEL_ALIGNED`를 부여하지 않는다.
- `SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS`와 `SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS`는 `011`, `903`만 포함해야 한다.
- 브라우저 label-coordinate QA는 전체 89개 렌더링을 확인하고, 실제 클릭 정합 검증은 `PIXEL_ALIGNED` 87개만 대상으로 한다.
- 새 공식 PNG 또는 운영자 승인 좌표가 제공되면 두 블럭을 재트레이싱하고 `89 LOCKED_VERIFIED` 목표로 release lock을 갱신한다.

## 기준 산출물

- Alignment audit JSON: `reports/stadium/sajik-seatmap-alignment-audit.json`
- Alignment audit CSV: `reports/stadium/sajik-seatmap-alignment-audit.csv`
- Alignment audit summary: `reports/stadium/sajik-seatmap-alignment-audit.md`
- Alignment audit SVG: `reports/stadium/sajik-seatmap-alignment-audit.svg`
- Trace manifest JSON: `reports/stadium/sajik-seatmap-trace-review.json`
- Trace manifest CSV: `reports/stadium/sajik-seatmap-trace-review.csv`
- Trace summary: `reports/stadium/sajik-seatmap-trace-review.md`
- Evidence report JSON: `reports/stadium/sajik-seatmap-evidence-crops.json`
- Evidence summary: `reports/stadium/sajik-seatmap-evidence-crops.md`
- Evidence contact sheet: `reports/stadium/sajik-seatmap-evidence-contact-sheet.png`
- P0 evidence: `reports/stadium/sajik-seatmap-evidence-p0.png`
- P1 evidence: `reports/stadium/sajik-seatmap-evidence-p1.png`
- P2 evidence: `reports/stadium/sajik-seatmap-evidence-p2.png`
- P0 thin-first-base evidence: `reports/stadium/sajik-seatmap-evidence-p0-thin-first-base.png`
- P0 central lower 011 review evidence: `reports/stadium/sajik-seatmap-evidence-p0-central-lower-011-review.png`
- P1 everytime review evidence: `reports/stadium/sajik-seatmap-evidence-p1-retraced-everytime.png`
- Advisory Playwright summary: `reports/stadium/sajik-seatmap-advisory-playwright-review.md`
- Advisory Playwright full screenshot: `../output/playwright/sajik-seatmap-advisory-review/sajik-advisory-playwright-full.png`
- Browser QA summary: `../output/playwright/stadium-ux-sajik-validate/stadium-mobile-smoke-summary.md`
- Browser QA screenshots:
  - `../output/playwright/stadium-ux-sajik-validate/mobile-390.png`
  - `../output/playwright/stadium-ux-sajik-validate/desktop-1440.png`
  - `../output/playwright/stadium-ux-sajik-validate/sajik-debug-overlay-1440x1000.png`

## 운영 규칙

- 공식 PNG natural size는 `960x640`이어야 한다.
- 모든 운영 polygon은 `M/L/Z` 단일 폐합 path여야 한다.
- 좌표는 공식 PNG 좌표계 기준이며, 새 좌표는 소수 1자리 px 정밀도 안에서 관리한다.
- self-intersection은 허용하지 않는다.
- `labelX/labelY`는 자기 polygon 내부 또는 경계 1px 이내에 있어야 한다.
- `PIXEL_ALIGNED` 블럭의 label 좌표 클릭은 렌더 순서상 자기 block을 최상위 hit-area로 가져야 한다.
- `OFFICIAL_PNG_BLOCK_NOT_VISIBLE` 예외 블럭은 클릭 정합 release gate에서 제외하되, 전체 SVG 렌더링과 운영 호환 alias는 유지해야 한다.
- UI 렌더링, hover, click, zoom/pan은 기존 `SajikSeatMapSvg` path 기반 동작을 유지한다.
- 백엔드 API 계약은 변경하지 않는다.
- 블록 id, category, search alias, 접근성 휠체어석 3개 항목은 유지한다.
- 외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사는 사용하지 않는다.
- 공식 asset이 바뀌었거나 승인된 기준 파일이 없으면 `MANUAL_BASEBALL_DATA_REQUIRED` 계약으로 전환하고 operator 제공 파일을 요청한다.
- 좌표 변경이 발생하면 trace manifest, evidence contact sheet, isolated browser QA를 다시 생성한다.

## 릴리즈 게이트

```bash
npm run stadium:sajik:alignment-audit
npm run stadium:sajik:evidence
npm run test:stadium:seatmaps
npm run qa:stadium:sajik:trace-review
npm run build
```

릴리즈 차단 조건:

- `SAJIK_BLOCKS.length`가 `89`가 아니다.
- `p0Blocks=39`, `p1Blocks=16`, `p2Blocks=34`가 유지되지 않는다.
- `officialImageTraced`, `directOfficialTrace`, `officialPngManualPolygon`, `manualPolygonV2`, `manualReviewed` 중 하나라도 `89`가 아니다.
- `pixelAligned=87`, `manualReviewRequired=2`, `officialPngBlockNotVisible=2`, `alignmentLockedVerified=87`, `alignmentFailures=0`이 유지되지 않는다.
- `SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS` 또는 `SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS`가 `011`, `903` 외 블럭을 포함한다.
- `needsOperatorReview`, `unreviewedBlocks` 중 하나라도 `0`이 아니다.
- `refinedPolygons=83`이 유지되지 않는다.
- `SAJIK_OFFICIAL_TRACE_REFERENCE`의 `expectedPointCount` 또는 `expectedArea`가 현재 path와 다르다.
- 단일 폐합 path가 아니거나 self-intersection이 있다.
- `PIXEL_ALIGNED` 블럭의 label 좌표가 자기 polygon 밖으로 벗어나거나, 다른 나중 렌더링 polygon에 가로채인다.
- `011`, `903` 외 블럭이 `OFFICIAL_PNG_BLOCK_NOT_VISIBLE` 또는 `MANUAL_REVIEW_REQUIRED`로 내려간다.
- `311/321`, `112/121`, `132/142`, `914/922` 중 하나라도 label top-hit 회귀가 발생한다.
- 모바일 390에서 `723` path 중심 클릭이 zoom control 배경에 가로채인다.
- 브라우저 QA에서 모바일 390 또는 데스크톱 1440 overflow가 발생한다.
