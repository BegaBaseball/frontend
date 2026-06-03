# 수원 kt 위즈 파크 좌석도 release lock

검수 고정일: 2026-05-28 KST

## 기준

- 공식 asset: `src/assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.webp`
- 공식 이미지 좌표계: `4290x9679`
- viewport crop: `cropY=1000`, `cropHeight=4550`
- stadium id: `SUWON`
- 기준 데이터: `SUWON_SEATMAP_IMAGE`, `SUWON_SEATMAP_VIEWPORT`, `SUWON_BLOCKS`, `SUWON_IMAGE_GEOMETRY_DRAFTS`, `SUWON_TRACE_REVIEW_SUMMARY`
- browser QA source: `SUWON_BROWSER_QA_PROBES`, `scripts/stadium-ux-audit.mjs`
- QA runner stability: 브라우저 hover 검증은 transient `elementFromPoint` miss를 같은 이미지 좌표 재계산/재시도로 흡수하고, 재시도 소진 시에만 좌표 실패로 보고한다.
- trace source: `OFFICIAL_IMAGE_TRACED`
- geometry fields: 표시용 visual은 `imageGeometry.d`, 클릭/터치 hit target은 `hitGeometry.d`를 사용한다.
- overlay UX: 기본 화면에서는 image-geometry-overlays polygon 면적을 상시 노출하지 않는다.
- debug UX: `?suwonDebug=1`에서만 전체 visual/hit polygon을 노출한다.
- hit exception rule: 스카이박스 SB1-SB35는 visual polygon 전체를 hit polygon으로 사용한다.
- data policy: 외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사는 사용하지 않는다.
- operator visit-guide source: `src/data/suwonOperatorVisitGuide.ts`
- operator visit-guide policy: `docs/stadium/operator-visit-guide-policy.md`
- current operator visit-guide state: 운영자 제공 출입구/매점/동선 자료는 비어 있으며, 좌석 상세 패널은 항목 단위로 `MANUAL_BASEBALL_DATA_REQUIRED`만 표시한다.
- public npm command는 runtime QA, release lock, status만 노출한다.
- responsive QA, visual review, precision workset 재생성은 dispatcher 내부 task로 유지한다.

## Public commands

- `npm run qa:stadium:suwon:mobile`
- `npm run qa:stadium:suwon:full`
- `npm run qa:stadium:suwon:release-lock`
- `npm run stadium:suwon:status`

## Internal dispatcher tasks

- `node scripts/stadium-seatmap-ops.mjs suwon responsive`
- `node scripts/stadium-seatmap-ops.mjs suwon visual-review`
- `node scripts/stadium-seatmap-ops.mjs suwon precision-workset`

## 고정 상태

- `SUWON_BLOCKS.length === 176`
- `totalBlocks=176`
- `numericBlocks=126`
- `skyboxBlocks=35`
- `skyzoneBlocks=32`
- `specialSelectableAreas=15`
- `officialImageTraced=176`
- `draftApproximate=0`
- `pendingBlockIds=[]`
- `browserQaProbes=179`
- `alignmentProbes=429`
- `hitTestProbes=608`
- `visualHitMismatchBlocks=0`
- `approvedVisualHitSplitBlocks=0`
- `unresolvedVisualHitMismatchBlocks=0`
- `hitGeometryExceptions=0`
- `unusedHitGeometryExceptionNotes=0`
- `releaseFixtureFingerprint=c69ad1aa260bf48c23634d0f07bcb9d13491c45c70acc0bd0edd7fc079485e5a`
- `officialAssetSha256=30ebfe637f42e674d7761af7739e61aa0751813e0f72bd9cde4f8135b91a3523`

## 범위별 lock

- 숫자 블록 `101-133`, `201-233`, `301-328`, `401-432`는 production visual geometry에서 generated row/cell fallback을 사용하지 않는다.
- `401-432` 스카이존은 전체 browser QA 대표 좌표와 edge probe 계약을 가진다.
- `SB1-SB35` 스카이박스는 명시 visual polygon 전체를 hit polygon으로 사용한다.
- `1루/3루 하이파이브존`, `외야 잔디 자유석`, `7 PUB`, `그린존`, `K-LIVE`, `외야테이블석`, `하이트펍`, `키즈랜드`, `위즈가든`은 특수석 QA probe 계약에 포함된다.
- `216-218`, `313-316`, 지니존, 휠체어석은 visual polygon과 hit polygon을 동일하게 유지하고 경계 probe로 중첩 회귀를 고정한다.
- 외야 잔디 자유석은 `suwon-lf-grass`, `suwon-rf-grass` 두 block definition만 허용한다.
- `suwon-lf-grass`는 공식 이미지의 3루 외야 잔디 자유석 connected green component 전체를 단일 선택 구역으로 유지하므로 large visual area를 승인한다.
- `suwon-lf-grass` 승인 bounds 기준은 공식 픽셀 검수 `1032,1825-1850,2379`이며, 7 PUB/위즈테라스와 상단 통로 exclusion probe 계약을 함께 유지한다.

## targeted patch closeout

2026-05-28 KST 스카이박스 hit-area follow-up은 `SB1-SB35`의 compact hit polygon override를 제거하고, 표시되는 visual polygon 전체를 hover/click hit polygon으로 사용하도록 고정했다. 스카이박스 hover 우선순위는 `120`으로 유지하고 `SUWON_HIT_GEOMETRY_EXCEPTION_NOTES`의 스카이박스 예외는 제거했다. 1루/중앙/3루 대표 off-center 브라우저 QA 좌표로 `suwon-sb4`, `suwon-sb22`, `suwon-sb35`를 추가했으며, targeted 검증은 `node --import tsx --test --test-concurrency=1 src/data/suwonSeatData.test.ts`, `npm run qa:stadium:suwon:release-lock`, `npm run qa:stadium:suwon:full` 통과 상태다.

2026-05-17 KST 패치는 전체 좌표 재작성 없이 공식 이미지 픽셀 근거가 명확한 4개 블록만 열었다.

| id | final bounds | area | points | hit policy | 근거 |
| --- | --- | ---: | ---: | --- | --- |
| `suwon-rf-grass` | `2187,1867-2874,2307` | `164521` | `440` | `imageGeometry === hitGeometry` | 우측/하단 same-color green continuation을 포함하되 `K-LIVE`, 외야테이블석, 그린존 exclusion probe는 유지한다. |
| `suwon-231` | `962,2714-1100,2846` | `11586` | `134` | `imageGeometry === hitGeometry` | 좌측/lower grey fill undercoverage를 공식 구분선 안쪽으로 보정했다. |
| `suwon-232` | `927,2628-1054,2758` | `10274` | `131` | `imageGeometry === hitGeometry` | 좌측 grey fill undercoverage를 공식 구분선 안쪽으로 보정했다. |
| `suwon-233` | `852,2534-996,2662` | `12418` | `130` | `imageGeometry === hitGeometry` | 좌측/lower grey fill undercoverage를 공식 구분선 안쪽으로 보정했다. |

`suwon-green`은 bounded green component가 인접 `suwon-rf-grass` 픽셀을 함께 포함해 생긴 false positive라서 패치 대상에서 제외한다. `suwon-419`는 E/V 아이콘 픽셀을 좌석 polygon에서 제외할지에 대한 운영자 결정이 필요하므로 decision-gated hold 상태로 둔다. 패치 근거 crop과 후보표는 `reports/stadium/suwon-polygon-patch-evidence/`에 있으며, reports 산출물은 release payload가 아니라 검수 handoff 자료다.

2026-05-18 KST follow-up은 hover가 가까운 확대 상태에서만 잡히던 `suwon-sb17`과 1루 휠체어석을 targeted adjustment로 열었다. `suwon-sb17`은 공식 이미지의 파란 SB17 component bounds `2686,4049-2806,4163`에 맞춰 23점 polygon으로 조밀화했고, `suwon-wheel-1b`는 상단 일부만 잡던 기존 영역을 보라색 휠체어/E/V marker 전체 bounds `2772,4078-2872,4256`의 51점 polygon으로 확장했다. 두 블록 모두 `imageGeometry === hitGeometry` 계약을 유지하며, `suwon-wheel-1b`는 하단 marker 내부 probe를 추가하고 하단 통로/우측 블루 블록 exclusion probe를 유지한다.

2026-05-18 KST 추가 follow-up은 `303-307` 3층 1루 내야일반석을 공식 이미지의 회색 좌석 픽셀 scanline 기준으로 다시 조밀화했다. `suwon-303`, `suwon-304`, `suwon-305`, `suwon-306`, `suwon-307`은 각각 63/59/46/60/76점 polygon으로 고정하며, 스카이박스/우측 시설 아이콘/통로 쪽 비좌석 픽셀을 덜 먹도록 bounds와 area 계약을 갱신했다.

2026-05-18 KST 2층 전수조사 1순위 follow-up은 이미지 확대 검수 기준으로 `suwon-209`, `suwon-227`, `suwon-228`을 먼저 열었다. `suwon-209`는 지니존 텍스트 통로 과대 포함을 줄여 bounds `2690,3232-2841,3356`, area `9551.5`, 83점 polygon으로 고정했다. `suwon-227`은 이닝교대존 텍스트/하단 수평 돌출을 제거해 bounds `1160,3053-1294,3181`, area `10031.5`, 136점 polygon으로 고정했다. `suwon-228`은 하단 검은 통로 수평 돌출을 제거해 bounds `1113,2964-1249,3083`, area `9012`, 128점 polygon으로 고정했다.

2026-05-18 KST 2층 전수조사 2순위 follow-up은 이미지 확대 검수 기준으로 `suwon-206`, `suwon-207`, `suwon-208`, `suwon-210`을 열었다. `suwon-206`은 우측/하단 통로 쪽 과대 포함을 줄여 bounds `2866,2958-2990,3078`, area `7848`, 90점 polygon으로 고정했다. `suwon-207`은 206/208 사이 검은 통로 경계를 따라 bounds `2804,3045-2916,3172`, area `7366.5`, 89점 polygon으로 고정했다. `suwon-208`은 좌측 안내 아이콘과 우측 지니존 텍스트 사이에서 보이는 회색 블럭을 기준으로 bounds `2718,3142-2876,3270`, area `10486.5`, 107점 polygon으로 고정했다. `suwon-210`은 좌측 휠체어 마커가 원본을 가리는 구간은 과대 확장하지 않고 bounds `2668,3308-2804,3443`, area `9886.5`, 103점 polygon으로 고정했다.

2026-05-18 KST 2층 전수조사 3순위 follow-up은 이미지 확대 검수 기준으로 `suwon-224`, `suwon-225`, `suwon-226`을 열었다. `suwon-224`는 우측 안내 아이콘과 좌측 통로 절단부를 따라 bounds `1293,3330-1421,3444`, area `9413`, 205점 polygon으로 고정했다. `suwon-225`는 상단 검은 통로를 제외하고 우측 회색 삼각 모서리를 포함해 bounds `1280,3238-1390,3346`, area `7136.5`, 142점 polygon으로 고정했다. `suwon-226`은 기존에 윗블럭/상단 통로를 같이 먹던 영역을 분리해 bounds `1220,3136-1323,3256`, area `7334`, 149점 polygon으로 고정했다.

2026-05-18 KST 2층 전수조사 4순위 follow-up은 이미지 확대 검수 기준으로 `suwon-229`, `suwon-230` 연결부를 확인했다. `suwon-230`은 현 좌표가 회색 블럭 외곽과 맞아 유지했다. `suwon-229`는 하단 좌측 회색 면 undercoverage를 보강하고 우측 흰색 안내 아이콘은 제외해 bounds `1064,2872-1176,3008`, area `8644`, 164점 polygon으로 고정했다.

2026-05-18 KST 2층 전수조사 5순위 follow-up은 이미지 확대 검수 기준으로 `suwon-219`, `suwon-220`, `suwon-221`, `suwon-222`, `suwon-223`을 확인했다. 5개 블럭 모두 좌측 검은 통로, 우측 보라색/인접 블럭 경계, 하단 사선 경계가 현 좌표와 맞아 geometry 변경 없이 유지했다. 좌표 변경이 없으므로 release fixture fingerprint는 `94f0ac1923b681f23cde6eb77dc6181ba52435cce46272c04bb7a56d1833bd42` 그대로 유지한다.

2026-05-18 KST 2층 전수조사 6순위 follow-up은 이미지 확대 검수 기준으로 `suwon-211`, `suwon-212`, `suwon-213`, `suwon-214`, `suwon-215`를 확인했다. `suwon-213` 좌측 안내 아이콘 주변은 현 polygon의 꺾임이 아이콘 경계와 맞고, 나머지 4개 블럭도 좌측 보라색/검은 통로와 우측 인접 블럭 경계를 과대 포함하지 않아 geometry 변경 없이 유지했다. 좌표 변경이 없으므로 release fixture fingerprint는 `94f0ac1923b681f23cde6eb77dc6181ba52435cce46272c04bb7a56d1833bd42` 그대로 유지한다.

2026-05-18 KST 2층 전수조사 7순위 follow-up은 이미지 확대 검수 기준으로 `suwon-201`, `suwon-202`, `suwon-203`, `suwon-204`, `suwon-205`를 확인했다. `suwon-201`부터 `suwon-203`까지는 긴 사선 블럭의 상단/하단 검은 통로와 우측 외곽선이 현 scanline polygon과 맞고, `suwon-204`, `suwon-205`도 인접 블럭 경계와 좌측 안내 아이콘 부근 외곽선이 현 좌표와 맞아 geometry 변경 없이 유지했다. 좌표 변경이 없으므로 release fixture fingerprint는 `94f0ac1923b681f23cde6eb77dc6181ba52435cce46272c04bb7a56d1833bd42` 그대로 유지한다.

2026-05-18 KST 2층 전수조사 8순위 follow-up은 이미지 확대 검수 기준으로 `suwon-216`, `suwon-217`, `suwon-218` 중앙 하단 연결부를 확인했다. 세 블럭 모두 지니존/비씨카드존 하단 경계, 좌우 검은 분리선, 하단 KT존 상단 곡선 및 안내 아이콘 부근 꺾임이 현 좌표와 맞아 geometry 변경 없이 유지했다. 좌표 변경이 없으므로 release fixture fingerprint는 `94f0ac1923b681f23cde6eb77dc6181ba52435cce46272c04bb7a56d1833bd42` 그대로 유지한다.

2026-05-18 KST 1층 전수조사 1순위 follow-up은 이미지 확대 검수 기준으로 `suwon-101`, `suwon-102`, `suwon-103`, `suwon-104`, `suwon-105`, `suwon-106`, `suwon-107`, `suwon-108`, `suwon-109`, `suwon-110`을 확인했다. `suwon-101`부터 `suwon-109`까지는 1루 측 사선 숫자 블럭의 상단/하단 검은 통로와 인접 2층 블럭 경계가 현 좌표와 맞고, `suwon-110`은 하단 보라색 아이콘을 과대 포함하지 않는 현재 절단선이 유지 기준에 맞아 geometry 변경 없이 유지했다. 좌표 변경이 없으므로 release fixture fingerprint는 `94f0ac1923b681f23cde6eb77dc6181ba52435cce46272c04bb7a56d1833bd42` 그대로 유지한다.

이전 targeted patch 검증 결과. 2층 image-only follow-up 이후에는 사용자 요청에 따라 자동 QA 스크립트를 돌리지 않았다:

- `node --import tsx --test src/data/suwonSeatData.test.ts`: 통과, `55/55`
- `node --import tsx --test --test-concurrency=1 src/data/suwonOperatorVisitGuideSeatData.test.ts`: PASS, operator guide fallback contract `11/11` (2026-05-29 KST)
- `node scripts/stadium-seatmap-ops.mjs suwon visual-review`: 통과, `reviewedBlocks=176`, `unresolvedVisualHitMismatchBlocks=0`
- `node scripts/stadium-seatmap-ops.mjs suwon precision-workset`: 통과, `candidateBlocks=0`, `lockedReviewBlocks=176`
- `npm run qa:stadium:suwon:release-lock`: 통과
- `npm run qa:stadium:suwon:full`: 통과, 첫 포트 SVG 대기 timeout 후 `5196` 재시도 통과
- `npm run test:stadium:seatmaps`: 수원 구간 `208-262` 통과
- `env VITE_SITE_URL=https://example.com VITE_API_BASE_URL=https://api.example.com npm run build`: 통과

## 시각 검수 산출물

- Visual review manifest: `reports/stadium/suwon-seatmap-visual-review.json`
- Visual review summary: `reports/stadium/suwon-seatmap-visual-review.md`
- Precision workset manifest: `reports/stadium/suwon-seatmap-precision-workset.json`
- Precision workset summary: `reports/stadium/suwon-seatmap-precision-workset.md`
- 1층 내야/응원/중앙 overlay: `reports/stadium/suwon-infield-1f-overlay.svg`
- 2층 내야 잔여 구역 overlay: `reports/stadium/suwon-infield-2f-overlay.svg`
- 3층 내야/중앙 overlay: `reports/stadium/suwon-infield-3f-overlay.svg`
- 지니존/휠체어석 overlay: `reports/stadium/suwon-center-accessible-overlay.svg`
- 외야 특수석/잔디석 overlay: `reports/stadium/suwon-outfield-special-overlay.svg`
- 하이파이브존 overlay: `reports/stadium/suwon-highfive-overlay.svg`
- 205-215 내야 경계 overlay: `reports/stadium/suwon-205-215-overlay.svg`
- 스카이박스/스카이존 overlay: `reports/stadium/suwon-skybox-skyzone-overlay.svg`

visual review 산출물은 production geometry를 수정하지 않는 재생성 가능한 검수 자료다. 공식 이미지 위에 `imageGeometry.d`, label anchor, browser/alignment probe를 얹어 visual mismatch 후보를 사람이 확인할 수 있게 한다.
현재 visual review 기준은 `reviewedBlocks=176`, `missingReviewBlocks=0`, `duplicateReviewBlocks=0`, `visualHitMismatchBlocks=0`, `approvedVisualHitSplitBlocks=0`, `unresolvedVisualHitMismatchBlocks=0`, `largeVisualAreaBlocks=0`, `approvedLargeVisualAreaBlocks=1`이다. 승인된 visual/hit split은 없다. 승인된 large area는 `suwon-lf-grass`만 허용한다.

precision workset 산출물은 다음 targeted polygon adjustment 순서를 고정하는 검수 큐다. 현재 기준은 `worksetBlocks=176`, `candidateBlocks=85`, `lockedReviewBlocks=91`, `p0Blocks=0`, `p1Blocks=12`, `p2Blocks=0`, `p3Blocks=73`, `missingWorksetBlocks=0`, `duplicateWorksetBlocks=0`, `requiredP0MissingBlocks=0`, `requiredP1MissingBlocks=0`, `requiredP2MissingBlocks=0`, `requiredP3MissingBlocks=0`이다. 후보는 release blocker가 아니라 dispatcher 내부 workset에서 재생성하는 후속 검토 큐다. 이후 작업은 사람이 발견한 mismatch만 targeted adjustment로 연다.

## 릴리즈 게이트

```bash
npm run qa:stadium:suwon:release-lock
node --import tsx --test src/data/suwonSeatData.test.ts
node --import tsx --test --test-concurrency=1 src/data/suwonOperatorVisitGuideSeatData.test.ts
npm run test:stadium:seatmaps
npm run qa:stadium:suwon:mobile
npm run qa:stadium:suwon:full
env VITE_SITE_URL=https://example.com VITE_API_BASE_URL=https://api.example.com npm run build
```

릴리즈 차단 조건:

- `draftApproximate`가 `0`이 아니다.
- `pendingBlockIds`가 비어 있지 않다.
- `SUWON_BLOCKS.length`가 `176`이 아니다.
- `SUWON_BROWSER_QA_PROBES.length`가 `179`가 아니다.
- `SUWON_HIT_TEST_PROBES.length`가 `608`가 아니다.
- 어떤 블록에서든 `imageGeometry.d !== hitGeometry.d`가 문서화된 예외 없이 발생한다.
- visual review manifest의 `unresolvedVisualHitMismatchBlocks`가 `0`이 아니다.
- `APPROVED_VISUAL_HIT_SPLIT`이 새로 붙거나 visual/hit split 사유가 `SUWON_HIT_GEOMETRY_EXCEPTION_NOTES`와 어긋난다.
- `officialRowCellGeometries`, `rowCellGeometry`, `skyboxGeometry(`, `Array.from({ length: 35 }` 기반 production geometry가 다시 들어온다.
- 일반 `/stadium` 화면에서 전체 polygon overlay 면적이 상시 노출된다.
- `?suwonDebug=1`에서 visual/hit polygon 검수 overlay가 보이지 않는다.
- `scripts/stadium-ux-audit.mjs`가 hover 좌표 검증에서 transient `elementFromPoint` miss 재시도 계약을 잃는다.
- visual review 스크립트가 1층/2층/3층/중앙 접근석/외야 특수석/하이파이브존/205-215/스카이박스-스카이존 overlay 산출물 계약을 잃는다.
- visual review manifest의 `reviewedBlocks`가 `176`이 아니거나 `missingReviewBlocks` 또는 `duplicateReviewBlocks`가 `0`이 아니다.
- precision workset manifest의 `worksetBlocks`가 `176`이 아니거나 `missingWorksetBlocks`, `duplicateWorksetBlocks`, `requiredP0MissingBlocks`, `requiredP1MissingBlocks`, `requiredP2MissingBlocks`, `requiredP3MissingBlocks`가 `0`이 아니다.
- 승인되지 않은 `LARGE_VISUAL_AREA`가 visual review manifest에 남는다.
- `APPROVED_LARGE_VISUAL_AREA`가 `suwon-lf-grass` 외 블록에 붙는다.
- `src/data/suwonOperatorVisitGuide.ts`가 운영자 제공 배열 외의 외부 URL, crawling, scraping, web search, 원본 파일 runtime parsing 계약을 포함한다.
- 좌석 상세 패널의 직관 안내 영역이 운영자 제공 값 또는 `MANUAL_BASEBALL_DATA_REQUIRED`가 아닌 추정 출입구/매점/동선 값을 표시한다.
- 운영자 자료가 없는 상태에서 `suwon-operator-entrance`, `suwon-operator-facilities`, `suwon-operator-notice`, `suwon-operator-updated-at` 중 하나라도 `MANUAL_BASEBALL_DATA_REQUIRED` fallback을 잃는다.

수원 release 판단에서 분리된 사직 후속 작업은 2026-05-17 KST에 해결됐다:

- 사직 release lock 문서는 `stagingManifest`, `stage01PartialReadinessGate`, `releasePayloadFileCount=62` 계약으로 통과한다.
- 사직 trace review는 `totalBlocks=89`, `mapSelectable=87`, `aliasOnlyOfficialPngBlockNotVisible=2`, `manualReviewRequired=2`로 복구됐다.
- `011/903`은 alias-only 운영 호환 블록으로 유지하고 `MANUAL_REVIEW_REQUIRED` 상태를 부여한다.
- `sajik-avenuel-011` trace reference는 현재 5점 polygon 기준 bounds `620,466-666,492`, area `1079.5`로 동기화했다.
- `node --import tsx --test src/data/sajikSeatData.test.ts`는 `21/21`, `npm run test:stadium:seatmaps`는 `262/262`로 통과한다.

## 운영 규칙

- 이 문서 기준 상태에서는 수원 좌석도 전체 polygon 재작성 범위를 열지 않는다.
- 사람이 명확한 시각 불일치나 클릭 충돌을 발견하면 해당 block 또는 인접 경계만 targeted polygon adjustment로 처리한다.
- 좌표 변경이 발생하면 `releaseFixtureFingerprint`를 의도적으로 갱신하고 정적/브라우저 QA를 모두 다시 실행한다.
- QA runner flake는 좌표를 완화하지 않고 hover 재시도/렌더 안정화 계약으로만 처리한다.
- 권장 출입구, 가까운 매점/편의시설, 날짜별 운영 동선 공지는 운영자 제공 정적 데이터만 사용한다.
- 운영자 자료가 없거나 불명확한 항목은 좌석 위치/지도 이미지로 추정하지 않고 `MANUAL_BASEBALL_DATA_REQUIRED` 상태를 유지한다.
- release gate 결과는 `reports/stadium/suwon-seatmap-release-gate.json`과 `reports/stadium/suwon-seatmap-release-gate.md`에 기록한다.
- visual review 결과는 `reports/stadium/suwon-seatmap-visual-review.json`과 `reports/stadium/suwon-seatmap-visual-review.md`에 기록한다.
- precision workset 결과는 `reports/stadium/suwon-seatmap-precision-workset.json`과 `reports/stadium/suwon-seatmap-precision-workset.md`에 기록한다.
