# 수원 kt 위즈 파크 좌석도 release lock

검수 고정일: 2026-05-14 KST

## 기준

- 공식 asset: `src/assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.jpg`
- 공식 이미지 좌표계: `4290x9679`
- viewport crop: `cropY=1000`, `cropHeight=4550`
- stadium id: `SUWON`
- 기준 데이터: `SUWON_SEATMAP_IMAGE`, `SUWON_SEATMAP_VIEWPORT`, `SUWON_BLOCKS`, `SUWON_IMAGE_GEOMETRY_DRAFTS`, `SUWON_TRACE_REVIEW_SUMMARY`
- browser QA source: `SUWON_BROWSER_QA_PROBES`, `scripts/stadium-ux-audit.mjs`
- trace source: `OFFICIAL_IMAGE_TRACED`
- geometry fields: 표시용 visual은 `imageGeometry.d`, 클릭/터치 hit target은 `hitGeometry.d`를 사용한다.
- overlay UX: 기본 화면에서는 image-geometry-overlays polygon 면적을 상시 노출하지 않는다.
- debug UX: `?suwonDebug=1`에서만 전체 visual/hit polygon을 노출한다.
- hit exception rule: 스카이박스 SB1-SB35만 visual polygon과 별도 compact hit polygon을 가진다.
- data policy: 외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사는 사용하지 않는다.

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
- `browserQaProbes=176`
- `alignmentProbes=556`
- `hitTestProbes=732`
- `visualHitMismatchBlocks=35`
- `approvedVisualHitSplitBlocks=35`
- `unresolvedVisualHitMismatchBlocks=0`
- `hitGeometryExceptions=35`
- `unusedHitGeometryExceptionNotes=0`
- `releaseFixtureFingerprint=0039bb9b41b25718eeed261f9441666d47a033b352a908f95623a37d9d78ab88`
- `officialAssetSha256=a66c73dcf2a228015b51bd3627ed2288340410369bbaeebedb236c5630877627`

## 범위별 lock

- 숫자 블록 `101-133`, `201-233`, `301-328`, `401-432`는 production visual geometry에서 generated row/cell fallback을 사용하지 않는다.
- `401-432` 스카이존은 전체 browser QA 대표 좌표와 edge probe 계약을 가진다.
- `SB1-SB35` 스카이박스는 명시 visual polygon과 명시 compact hit polygon을 가진다.
- `1루/3루 하이파이브존`, `외야 잔디 자유석`, `7 PUB`, `그린존`, `K-LIVE`, `외야테이블석`, `하이트펍`, `키즈랜드`, `위즈가든`은 특수석 QA probe 계약에 포함된다.
- `216-218`, `313-316`, 지니존, 휠체어석은 visual polygon과 hit polygon을 동일하게 유지하고 경계 probe로 중첩 회귀를 고정한다.
- 외야 잔디 자유석은 `suwon-lf-grass`, `suwon-rf-grass` 두 block definition만 허용한다.
- `suwon-lf-grass`는 공식 이미지의 3루 외야 잔디 자유석 connected green component 전체를 단일 선택 구역으로 유지하므로 large visual area를 승인한다.
- `suwon-lf-grass` 승인 bounds 기준은 공식 픽셀 검수 `1032,1825-1850,2379`이며, 7 PUB/위즈테라스와 상단 통로 exclusion probe 계약을 함께 유지한다.

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
현재 visual review 기준은 `reviewedBlocks=176`, `missingReviewBlocks=0`, `duplicateReviewBlocks=0`, `visualHitMismatchBlocks=35`, `approvedVisualHitSplitBlocks=35`, `unresolvedVisualHitMismatchBlocks=0`, `largeVisualAreaBlocks=0`, `approvedLargeVisualAreaBlocks=1`이다. 승인된 visual/hit split은 `SB1-SB35` compact hit-area만 허용하고, 승인된 large area는 `suwon-lf-grass`만 허용한다.

precision workset 산출물은 다음 targeted polygon adjustment 순서를 고정하는 검수 큐다. 현재 기준은 `worksetBlocks=176`, `candidateBlocks=109`, `lockedReviewBlocks=67`, `p0Blocks=9`, `p1Blocks=13`, `p2Blocks=11`, `p3Blocks=76`, `missingWorksetBlocks=0`, `duplicateWorksetBlocks=0`, `requiredP0MissingBlocks=0`, `requiredP1MissingBlocks=0`이다. P0은 외야 특수석/잔디석 9개, P1은 하이파이브존 2개와 `205-215` 11개이며, 이 후보가 빠지면 다음 재추적 작업을 시작하지 않는다.

## 릴리즈 게이트

```bash
node --import tsx scripts/suwon-seatmap-visual-review.mjs
npm run stadium:suwon:visual-review
npm run stadium:suwon:precision-workset
npm run qa:stadium:suwon:visual-review
node --import tsx scripts/suwon-seatmap-release-gate.mjs
npm run qa:stadium:suwon:release-lock
node --import tsx --test src/data/suwonSeatData.test.ts
npm run test:stadium:seatmaps
npm run qa:stadium:suwon:mobile
npm run qa:stadium:suwon:full
npm run build
lsof -nP -iTCP:5195 -sTCP:LISTEN
```

릴리즈 차단 조건:

- `draftApproximate`가 `0`이 아니다.
- `pendingBlockIds`가 비어 있지 않다.
- `SUWON_BLOCKS.length`가 `176`이 아니다.
- `SUWON_BROWSER_QA_PROBES.length`가 `176`이 아니다.
- `SUWON_HIT_TEST_PROBES.length`가 `732`가 아니다.
- 스카이박스가 아닌 블록에서 `imageGeometry.d !== hitGeometry.d`가 발생한다.
- visual review manifest의 `unresolvedVisualHitMismatchBlocks`가 `0`이 아니다.
- `APPROVED_VISUAL_HIT_SPLIT`이 `SB1-SB35` 외 블록에 붙거나 SB visual/hit split 사유가 `SUWON_HIT_GEOMETRY_EXCEPTION_NOTES`와 어긋난다.
- `officialRowCellGeometries`, `rowCellGeometry`, `skyboxGeometry(`, `Array.from({ length: 35 }` 기반 production geometry가 다시 들어온다.
- 일반 `/stadium` 화면에서 전체 polygon overlay 면적이 상시 노출된다.
- `?suwonDebug=1`에서 visual/hit polygon 검수 overlay가 보이지 않는다.
- visual review 스크립트가 1층/2층/3층/중앙 접근석/외야 특수석/하이파이브존/205-215/스카이박스-스카이존 overlay 산출물 계약을 잃는다.
- visual review manifest의 `reviewedBlocks`가 `176`이 아니거나 `missingReviewBlocks` 또는 `duplicateReviewBlocks`가 `0`이 아니다.
- precision workset manifest의 `worksetBlocks`가 `176`이 아니거나 `missingWorksetBlocks`, `duplicateWorksetBlocks`, `requiredP0MissingBlocks`, `requiredP1MissingBlocks`가 `0`이 아니다.
- 승인되지 않은 `LARGE_VISUAL_AREA`가 visual review manifest에 남는다.
- `APPROVED_LARGE_VISUAL_AREA`가 `suwon-lf-grass` 외 블록에 붙는다.

## 운영 규칙

- 이 문서 기준 상태에서는 수원 좌석도 전체 polygon 재작성 범위를 열지 않는다.
- 사람이 명확한 시각 불일치나 클릭 충돌을 발견하면 해당 block 또는 인접 경계만 targeted polygon adjustment로 처리한다.
- 좌표 변경이 발생하면 `releaseFixtureFingerprint`를 의도적으로 갱신하고 정적/브라우저 QA를 모두 다시 실행한다.
- release gate 결과는 `reports/stadium/suwon-seatmap-release-gate.json`과 `reports/stadium/suwon-seatmap-release-gate.md`에 기록한다.
- visual review 결과는 `reports/stadium/suwon-seatmap-visual-review.json`과 `reports/stadium/suwon-seatmap-visual-review.md`에 기록한다.
- precision workset 결과는 `reports/stadium/suwon-seatmap-precision-workset.json`과 `reports/stadium/suwon-seatmap-precision-workset.md`에 기록한다.
