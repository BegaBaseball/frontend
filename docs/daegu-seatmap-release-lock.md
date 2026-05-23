# 대구 삼성라이온즈파크 좌석도 release lock

검수 고정일: 2026-05-23 KST

## 기준

- 공식 asset: `src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png`
- 공식 이미지 좌표계: `1707x2048`
- stadium id: `DAEGU_SAMSUNG_LIONS_PARK`
- map version: `DAEGU_SAMSUNG_LIONS_PARK_2026_MANUAL_POLYGON_V1`
- image sha256: `8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0`
- canonical data source: `src/data/daeguSeatData.ts`
- renderer: `src/components/daegu/DaeguSeatMapSvg.tsx`
- data policy: 외부 야구 crawling/search 없이 공식 PNG와 operator-approved 좌표만 사용한다.
- uploaded operator reference: `OPERATOR_REFERENCE_RAPAK_2025`는 업로드 이미지 기반 `4096x4096` polygon draft source이며, `npm run stadium:daegu:operator-reference-trace`, `npm run stadium:daegu:operator-reference-review-packet`, `npm run stadium:daegu:operator-reference-auto-map`으로 별도 산출물을 만든다. 이 source는 release lock의 canonical 좌표를 대체하지 않는다.
- MySeatCheck reference intake: `docs/daegu-seatmap-myseatcheck-reference-intake.md`에 `MYSEATCHECK_REFERENCE_2026`를 pending external reference로만 등록한다. 이 source는 release lock의 canonical 좌표를 대체하지 않는다.

## 고정 상태

- pass level: `PASS_RELEASE_177`
- total inventory rows: `177`
- `LOCKED_VERIFIED`: `174`
- `classifiedReleaseRows`: `3`
- `releaseInventoryLocked`: `177`
- unresolved selectable seat polygon rows: `0`
- `normalSelectableSeats`: `171`
- `reviewOnlySeats`: `0`
- `officialUnconfirmedSeats`: `2`
- `visualBlockerRows`: `0`
- `normalVisualReviewRows`: `0`
- `queueRows`: `0`
- `releaseReady`: `true`

`PASS_RELEASE_177`은 `MR-10`/`M-10`을 selectable seat로 확정했다는 뜻이 아니다. 대구 release lock은 official PNG에 정렬된 좌석 polygon 174개와 selectable seat layer에서 제외된 classified row 3개를 합산해 177개 inventory가 해결된 상태를 뜻한다.

## Classified row lock

| block | lock status | layer policy | 재진입 조건 |
| --- | --- | --- | --- |
| `MR-10` | `OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED` | not selectable, not review-only | 독립 official seat component가 확인되고 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX/Y`, `reviewer`, `reviewedAt`이 모두 채워진다. |
| `M-10` | `OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED` | not selectable, not review-only | 독립 official seat component가 확인되고 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX/Y`, `reviewer`, `reviewedAt`이 모두 채워진다. |
| `12` | `WAYFINDING_MARKER` | marker-only, not selectable | operator가 좌석 구역임을 별도 확인하고 official PNG 기준 polygon을 승인한다. |

## Layer contract

- normal seat layer는 `isDaeguNormalSelectableSeat`를 통과한 row만 렌더링하고 선택 가능해야 한다.
- debug review layer는 `isDaeguReviewOnlySeat`를 통과한 row만 orange overlay로 보여주며 pointer event는 꺼져 있어야 한다.
- `OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED` row는 normal/review seat layer 양쪽에 들어가면 안 된다.
- `WAYFINDING_MARKER`와 marker-only row는 seat polygon layer에 들어가면 안 된다.
- renderer 클릭 기준은 계속 `hitPath ?? visualPath ?? d`이지만, 이 기준은 normal selectable predicate 이후에만 적용한다.

## Evidence

- `reports/stadium/daegu-seatmap-precision-audit.md`
- `reports/stadium/daegu-seatmap-render-safety-audit.md`
- `reports/stadium/daegu-visual-match-audit/daegu-seatmap-visual-match-audit.md`
- `reports/stadium/daegu-visual-match-workset/daegu-seatmap-visual-match-workset.md`
- `output/playwright/stadium-ux-daegu-full/stadium-mobile-smoke-summary.md`

## 검증 명령

- `npm run qa:stadium:daegu:release-lock`: PASS, `PASS_RELEASE_177`
- `npm run stadium:daegu:visual-match-workset`: PASS, `queueRows=0`
- `npm run qa:stadium:daegu:full`: PASS
- `node --import tsx --test --test-concurrency=1 --test-name-pattern=대구 src/components/StadiumGuideRuntimeSeatMaps.test.ts src/data/daeguSeatData.test.ts`: PASS, 25/25
- `env VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build`: PASS
