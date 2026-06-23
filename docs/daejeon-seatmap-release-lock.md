# 대전 한화생명볼파크 좌석도 release lock

검수 고정일: 2026-05-10 KST

## 기준

- 공식 asset: `src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.webp`
- 공식 이미지 좌표계: `920x1060`
- 기준 데이터: `DAEJEON_SEATMAP_IMAGE`, `DAEJEON_BLOCKS`, `DAEJEON_P2_DEDUPLICATED_ALIASES`
- trace source: `PATH_TRACED_FROM_OFFICIAL_IMAGE`
- source confidence: `OFFICIAL`
- 선택 가능 기준: `isDaejeonSelectableSeatBlock(block) === true`

## 고정 상태

- `DAEJEON_BLOCKS.length === 139`
- `totalBlocks=139`
- `officialImageTraced=139`
- `needsOperatorReview=0`
- `DAEJEON_TRACE_REVIEW_QUEUE.length === 0`
- `labelTopHitFailures=0`
- `sourceConfidence='OFFICIAL'`
- `traceMethod='PATH_TRACED_FROM_OFFICIAL_IMAGE'`
- `traceStatus='OFFICIAL_IMAGE_TRACED'`
- coverage report: `LOCKED=139`, `LABEL_ONLY=0`, `PARTIAL=0`
- coverage missing counts: `missingLabelTopHit=0`, `missingAnchorWithoutException=0`, `missingOwnerPointRequired=0`
- coordinate impact contract: `DAEJEON_COORDINATE_CHANGE_IMPACT_V1`
- coordinate impact missing count: `missingImpact=0`
- anchor visual baseline contract: `DAEJEON_ANCHOR_VISUAL_BASELINE_V1`
- anchor crop count: `28`
- anchor visual baseline: `expectedCropCount=28`
- anchor visual diff: `baselineCropCount=28`, `currentCropCount=28`, `changedCropCount=0`, `metadataMismatchCount=0`
- geometry baseline contract: `DAEJEON_GEOMETRY_BASELINE_V1`
- geometry diff: `changedBlockCount=0`, `missingBlockCount=0`, `extraBlockCount=0`

## 기준 anchor

- 홈 뒤쪽: `100A`, `100B`, `100C`
- 1루 내야 drift: `104`, `105`, `108`, `109`, `110`, `111`, `112`
- 3루 내야 split/drift: `121`, `124`
- CASS 응원석: `200`
- 4층 탁자석: `301`, `302`, `401`, `404`, `409`, `413`, `414`, `423`, `326`, `330`
- 특수석: `400`, `425`, `426`
- 휠체어석: `central-accessible__center`, `first-infield-accessible__first-infield`, `third-infield-accessible__third-infield`, `outfield-accessible-third__left-outfield`, `outfield-accessible-first__right-outfield`
- 외야 상단: `500`, `501`, `508`, `509`
- 스카이박스: `S01-S31`은 `skybox-s01-s12-sequence`, `skybox-s13-s25-sequence`, `skybox-s26-s31-sequence` anchor crop과 label top-hit 전수 검증으로 잠근다.

`425/426`은 `special-425-426-third-accessible` crop 기준 좌표를 유지한다.

## retired P2 alias

아래 11개 retired alias는 운영 geometry로 복구하지 않는다. 검색/finder/SVG hit path에는 canonical 4층 탁자석 owner만 노출한다.

| retired block | canonical owner |
| --- | --- |
| `outfield-reserved-first-301-404__301` | `first-table-4f-301-413__301` |
| `outfield-reserved-first-301-404__302` | `first-table-4f-301-413__302` |
| `outfield-reserved-first-301-404__401` | `first-table-4f-301-413__401` |
| `outfield-reserved-first-301-404__402` | `first-table-4f-301-413__402` |
| `outfield-reserved-first-301-404__403` | `first-table-4f-301-413__403` |
| `outfield-reserved-first-301-404__404` | `first-table-4f-301-413__404` |
| `outfield-reserved-third-423-330__327` | `third-table-4f-414-330__327` |
| `outfield-reserved-third-423-330__328` | `third-table-4f-414-330__328` |
| `outfield-reserved-third-423-330__329` | `third-table-4f-414-330__329` |
| `outfield-reserved-third-423-330__330` | `third-table-4f-414-330__330` |
| `outfield-reserved-third-423-330__423` | `third-table-4f-414-330__423` |

## 기준 산출물

- Trace manifest: `reports/stadium/daejeon-seatmap-trace-review.json`
- Trace summary: `reports/stadium/daejeon-seatmap-trace-review.md`
- Coverage report: `reports/stadium/daejeon-seatmap-coverage-report.json`
- Coverage summary: `reports/stadium/daejeon-seatmap-coverage-report.md`
- P2 evidence: `reports/stadium/daejeon-seatmap-p2-evidence-crops.md`
- Anchor crop index: `../output/playwright/daejeon-anchor-review/daejeon-anchor-review-crops.md`
- Anchor visual baseline: `src/data/daejeonAnchorVisualBaseline.json`
- Anchor visual diff: `reports/stadium/daejeon-seatmap-visual-diff.md`
- Geometry baseline: `src/data/daejeonGeometryBaseline.json`
- Geometry diff: `reports/stadium/daejeon-seatmap-geometry-diff.md`
- Block evidence crops: `reports/stadium/daejeon-seatmap-block-evidence-crops.md`
- Browser QA summary: `../output/playwright/stadium-ux-daejeon-validate/stadium-mobile-smoke-summary.md`
- Release gate report: `reports/stadium/daejeon-seatmap-release-gate.md`
- Debug screenshots:
  - `../output/playwright/stadium-ux-daejeon-validate/mobile-390.png`
  - `../output/playwright/stadium-ux-daejeon-validate/desktop-1440.png`

## 운영 규칙

- 공식 이미지 natural size는 `920x1060`이어야 한다.
- SVG `viewBox`는 `0 0 920 1060`이어야 한다.
- 배경 이미지는 같은 SVG 내부의 `<image>`로 렌더링한다.
- 표시용 highlight/stroke는 `imageGeometry.d`만 사용한다.
- 클릭/터치 hit path는 `hitAreaD ?? imageGeometry.d`만 사용한다.
- `hitAreaD`가 커져도 visible highlight가 커지면 실패다.
- 좌표를 추측하거나 자동 rect/interpolation을 운영 geometry로 승격하지 않는다.
- 공식 이미지에서 직접 측정되지 않은 path는 `OFFICIAL_IMAGE_TRACED`로 표시하지 않는다.
- 외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사는 사용하지 않는다.
- 좌표 변경이 발생하면 trace manifest, P2 evidence, anchor crops, isolated browser QA를 다시 생성한다.
- 좌표 변경이 발생하면 `coordinateChangeImpactSummary`의 `anchorCropIds`, `regressionTestIds`, `reviewPriority`, `reviewMode`, `riskTags` 기준으로 재검수 crop/test를 확인한다.
- anchor visual baseline은 `src/data/daejeonAnchorVisualBaseline.json`이 source of truth다.
- anchor visual baseline은 `expectedCropCount=28`이며, `first-104-106-detail`, `third-116-121-detail`, `skybox-s01-s12-sequence`, `skybox-s13-s25-sequence`, `skybox-s26-s31-sequence`를 자동 owner-point 회귀 crop으로 포함한다.
- anchor crop hash 또는 metadata가 baseline과 다르면 `reports/stadium/daejeon-seatmap-visual-diff.md`에 변경 crop이 표시되고 release-lock은 실패한다.
- baseline 갱신은 운영자 육안 검수 후 `node scripts/stadium-seatmap-ops.mjs daejeon visual-baseline`로만 수행한다.
- geometry baseline은 `src/data/daejeonGeometryBaseline.json`이 source of truth다.
- geometry fingerprint가 baseline과 다르면 `reports/stadium/daejeon-seatmap-geometry-diff.md`에 변경 block, changed field, anchor crop, regression test가 표시되고 release-lock은 실패한다.
- geometry baseline 갱신은 운영자 육안 검수 후 `node scripts/stadium-seatmap-ops.mjs daejeon geometry-baseline`로만 수행한다.
- 블록 단위 좌표 수정 전후 검수는 `node scripts/stadium-seatmap-ops.mjs daejeon block-crops -- --codes 104,105` 또는 `--blocks exact-id`로 생성한 block evidence crop을 먼저 확인한다.
- block evidence crop에서 파란 overlay는 visible `imageGeometry.d`, 빨간 dashed overlay는 click-only `hitAreaD`이며, 빨간 영역이 넓어도 visible highlight가 커지면 안 된다.

## 릴리즈 게이트

```bash
npm run qa:stadium:daejeon:release-lock
```

단일 gate는 내부에서 데이터 테스트, evidence 생성, anchor visual diff, geometry diff, coverage report, 브라우저 trace-review QA, production build를 순서대로 실행하고 산출물 숫자를 다시 검증한다. coverage report 생성과 PARTIAL/missing count 검증도 같은 gate에서 수행한다.

빠른 변경 감지:

```bash
node scripts/stadium-seatmap-ops.mjs daejeon change-guard
```

change guard는 대전 좌석 데이터, 대전 전용 컴포넌트, 공식 이미지, `scripts/daejeon-*`, release lock 문서가 마지막 release gate 이후 변경됐는지 mtime으로 확인한다. stale 상태이면 전체 gate를 다시 실행해야 한다.

블록 단위 좌표 검수:

```bash
node scripts/stadium-seatmap-ops.mjs daejeon block-crops
node scripts/stadium-seatmap-ops.mjs daejeon block-crops -- --codes 100A,100B,100C,104,105,106,107,108,109
node scripts/stadium-seatmap-ops.mjs daejeon block-crops -- --blocks first-infield-b-101-108__104
```

기본 실행은 최근 drift/split 이슈가 있었던 `100A/100B/100C`, `104-109`, `121-124`를 생성한다. 산출물은 `reports/stadium/daejeon-seatmap-block-evidence-crops.md`와 `../output/playwright/daejeon-block-review/*.png`에 기록된다.

운영자 handoff:

```bash
npm run stadium:daejeon:operator-handoff
```

operator handoff는 change guard를 먼저 통과한 뒤 `reports/stadium/daejeon-seatmap-operator-handoff.md`와 `reports/stadium/daejeon-seatmap-operator-handoff.json`을 생성한다. 운영자는 trace manifest, P2 evidence, anchor crops, anchor visual diff, geometry diff, 브라우저 QA summary를 한 문서에서 확인하고 승인/반려 체크리스트를 처리한다. 추가로 coverage report에서 PARTIAL=0, missing count 0, coordinate impact missingImpact=0, visual diff changedCropCount=0, geometry diff changedBlockCount=0 상태를 확인한다.
운영자는 trace manifest, P2 evidence, anchor crops, 브라우저 QA summary를 한 문서에서 확인하고 승인/반려 체크리스트를 처리한다.

운영자 승인 상태:

```bash
npm run stadium:daejeon:operator-approval
npm run stadium:daejeon:operator-approval:status
npm run stadium:daejeon:operator-approval:approve -- --approved-by "seatmap-ops-reviewer" --notes "검수 완료"
```

operator approval은 handoff를 최신화한 뒤 `reports/stadium/daejeon-seatmap-operator-approval.json`을 생성하거나 검증한다. 기본 상태는 `PENDING_OPERATOR_APPROVAL`이며, 운영자는 JSON을 직접 편집하지 않고 `npm run stadium:daejeon:operator-approval:approve -- --approved-by ...`로 `APPROVED`, `approvedBy`, `approvedAt`, `notes`를 기록한다. 승인된 handoff/release gate hash가 현재 산출물과 다르면 `STALE_APPROVAL`로 실패하고 운영 릴리즈를 차단한다.

승인 명령의 `--approved-by`는 필수이며, `operator-name`, `<operator name>`, `TODO` 같은 placeholder 값은 차단한다. `--notes`는 운영 검수 메모를 남길 때 사용한다.

배포 승인 확인:

```bash
node --test scripts/daejeon-seatmap-operator-approval.test.mjs
npm run stadium:daejeon:operator-approval:verify
npm run qa:stadium:daejeon:release-approved
```

`node --test scripts/daejeon-seatmap-operator-approval.test.mjs`는 임시 디렉터리 fixture에서 approval 생성/status/approve/verify/stale 동작을 검증하며 운영 approval JSON을 수정하지 않는다. `npm run stadium:daejeon:operator-approval:verify`는 `--require-approved` 모드로 실행되며 `PENDING_OPERATOR_APPROVAL`을 배포 승인으로 인정하지 않는다. `qa:stadium:daejeon:release-approved`는 먼저 `change-guard`로 마지막 release gate 이후 watched 파일 변경 여부를 확인하고, 그 다음 `operator-approval --require-approved`로 현재 handoff/release gate hash와 승인 파일 hash, `APPROVED` 상태, non-placeholder `approvedBy`, 유효한 `approvedAt`을 검증한다.

release gate 리포트의 `operatorApproval` 섹션은 approval 파일 경로, 현재 상태, 승인자, 승인시각을 요약해 보여준다. release-lock does not require operator approval; 최종 hash 검증과 승인 완료 강제는 `npm run qa:stadium:daejeon:release-approved`에서만 수행한다.

운영 순서:

1. `npm run qa:stadium:daejeon:release-lock`
2. `npm run stadium:daejeon:operator-approval`
3. `npm run stadium:daejeon:operator-approval:status`
4. 운영자가 handoff/evidence/browser QA summary를 검토한다.
5. `npm run stadium:daejeon:operator-approval:approve -- --approved-by "seatmap-ops-reviewer" --notes "검수 완료"`
6. `npm run qa:stadium:daejeon:release-approved`
7. 위 명령이 통과한 산출물만 배포 승인 상태로 본다.

릴리즈 차단 조건:

- `DAEJEON_BLOCKS.length`가 `139`가 아니다.
- `officialImageTraced`가 `139`가 아니다.
- `needsOperatorReview`가 `0`이 아니다.
- `DAEJEON_TRACE_REVIEW_QUEUE.length`가 `0`이 아니다.
- `labelTopHitFailures`가 `0`이 아니다.
- coordinate impact `missingImpact`가 `0`이 아니다.
- anchor visual diff `changedCropCount` 또는 `metadataMismatchCount`가 `0`이 아니다.
- geometry diff `changedBlockCount`, `missingBlockCount`, `extraBlockCount` 중 하나라도 `0`이 아니다.
- retired P2 alias 11개 중 하나라도 `DAEJEON_BLOCKS` 또는 SVG hit path로 복구된다.
- `425/426` 좌표가 `special-425-426-third-accessible` crop 기준에서 이탈한다.
- visible highlight가 `hitAreaD`를 사용한다.
- 브라우저 QA에서 모바일 390 또는 데스크톱 1440 overflow가 발생한다.
- `reports/stadium/daejeon-seatmap-operator-approval.json`이 없거나 `APPROVED` 상태가 아니다.
- 승인된 handoff/release gate hash가 현재 산출물과 다르다.
