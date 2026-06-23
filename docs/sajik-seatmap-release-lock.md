# 사직 롯데 좌석도 release lock

검수 고정일: 2026-05-12 KST

## 현재 runtime 기준 (2026-05-25 canonical 통합)

아래 기존 `960x640` 공식 이미지 v2와 `OPERATOR_REFERENCE_2026` 섹션은 historical 검수 근거로 보존한다. 사용자 runtime은 이제 source tab 없이 `SAJIK_CANONICAL_2026` 한 벌만 렌더링한다.

현재 public npm command는 canonical/runtime release 검수와 핵심 runtime guard만 노출한다. `dataset-export`, `source-audit`, `editor-regression`, `marker-transition-review`, `pr-scope-guard` 계열은 dispatcher 내부 task로만 유지한다. `stage01-*`, `operator-reference-*`, `polygon-v2`, `trace-review` alias와 관련 스크립트는 historical workflow로 내려갔고, 재실행이 필요하면 Git history에서 해당 시점의 스크립트와 입력 파일을 복구한 별도 branch에서만 검토한다.

Current public commands:

- `npm run qa:stadium:sajik:mobile`
- `npm run qa:stadium:sajik:full`
- `npm run qa:stadium:sajik:release-lock`
- `npm run stadium:sajik:status`
- `npm run stadium:sajik:pixel-components`
- `npm run stadium:sajik:trace-manifest`
- `npm run stadium:sajik:alignment-audit`
- `npm run stadium:sajik:block-source-duplication-audit`

- canonical source id: `SAJIK_CANONICAL_2026`
- canonical map version: `BUSAN_SAJIK_2026_CANONICAL_OPERATOR_REFERENCE_V1`
- canonical 배경 asset: `src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp`
- canonical 좌표계/viewBox: `1151x1367`, `0 0 1151 1367`
- canonical source of truth: `src/data/sajikCanonicalSeatMap.ts`
- runtime renderer: `SajikSeatMap.tsx`와 `SajikSeatMapSvg.tsx`는 `SAJIK_CANONICAL_BLOCKS`, `SAJIK_CANONICAL_ACCESSIBILITY_MARKERS`, `SAJIK_CANONICAL_SEATMAP_IMAGE`만 사용한다.
- source tab policy: 사용자 화면에서 `LOTTE_OFFICIAL_2026`/`OPERATOR_REFERENCE_2026` 전환 UI를 렌더링하지 않는다.
- active selectable blocks: `78`
- active seat sections: `78`
- operator-only promoted sections: `322`, `323`, `921`
- operator accessibility markers: `14`, linked selectable markers `8`
- legacy official-only alias blocks: `935`, `013`, `012`, `011`, `914`, `913`, `912`, `911`, `903`, `902`, `901`
- wheelchair pseudo-blocks: `휠체어석-3루`, `휠체어석-중앙`, `휠체어석-1루`은 seat polygon이 아니라 canonical accessibility marker alias이며 `runtimePolygon=false`로 유지한다.
- official-only 11개 블럭은 operator-reference trace가 생기기 전까지 `ALIAS_ONLY`이며, 공식 이미지 좌표를 runtime fallback polygon으로 복사하지 않는다.
- duplication guard: `npm run stadium:sajik:block-source-duplication-audit`
- guard pass criteria: `status=passed`, `active_canonical_blocks=78`, `active_polygon_source_per_block=1`, duplicate active section id `0`
- full visual QA: `npm run qa:stadium:sajik:full`
- production build: 사직 canonical gate와 별개로 Mate bundle budget 같은 다른 dirty workstream blocker는 별도 트랙으로 분리한다.

## 기준

- 공식 asset: `src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.webp`
- 공식 이미지 좌표계: `960x640`
- stadium id: `BUSAN_SAJIK`
- map version: `BUSAN_SAJIK_2026_MANUAL_POLYGON_V2`
- SVG viewBox: `0 0 960 640`
- 공식 이미지 SHA-256: `e9cb51ccf57a754ddf066a95c6c789d65edf8dff167f432fd35fe809e9dc80aa`
- 기준 데이터: `SAJIK_SEATMAP_IMAGE`, `SAJIK_BLOCKS`, `SAJIK_OFFICIAL_TRACE_REFERENCE`, `SAJIK_TRACE_REVIEW_SUMMARY`
- trace source: `OFFICIAL_PNG_MANUAL_POLYGON`
- trace version: `manual-polygon-v2`
- trace method: `PATH_TRACED_FROM_OFFICIAL_IMAGE`
- geometry fields: `imageGeometry.d`는 기존 호환 필드로 유지하고, `visualPath`, `hitPath`, `labelPoint`, `geometryVersion`을 표준 필드로 함께 고정한다.
- pixel alignment: 공식 이미지 색상 블럭이 확인되는 블럭은 `PIXEL_ALIGNED`, 공식 이미지 독립 색상 블럭이 보이지 않는 운영 호환 블럭은 `OFFICIAL_PNG_BLOCK_NOT_VISIBLE`
- map interaction: 공식 이미지 색상 블럭이 확인되는 87개만 `MAP_SELECTABLE`, `011/903`은 `ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE`
- runtime render layers: 일반 seat path 84개, accessibility marker 3개, alias-only rendered 0개를 고정한다.
- runtime renderer는 `imageGeometry.d` fallback을 사용하지 않는다. `imageGeometry.d`는 compatibility/reference 필드로만 유지하고 `<path d>`는 명시 `hitPath`가 있는 일반 좌석에만 사용한다.
- JSON dataset export: `SAJIK_BLOCKS`를 source of truth로 유지하고 `src/data/sajikSeatMapDataset.ts`/`scripts/sajik-seatmap-export-dataset.mjs`에서 editor/export용 `sections`와 `markers`를 생성한다.
- editor v1.7: `/internal/sajik-seatmap-editor`는 `import.meta.env.DEV`로 제한된 내부 route이며 production navigation에 노출하지 않는다. 선택 section의 in-memory vertex/labelPoint draft, drag, step nudge, vertex add/delete, dirty tracking, current/all reset을 지원한다.
- patch export v1.7: editor는 선택 section의 `SAJIK_SECTION_GEOMETRY_PATCH_PREVIEW` payload를 보여준다. 초기 상태에서는 `after === before`이고, vertex/labelPoint draft나 topology edit이 생기면 `after`가 draft geometry로 갱신된다. `sectionKind`/`markerType` 메타데이터를 포함하며 파일 자동수정은 하지 않는다. validation이 FAIL이면 JSON/TS copy/export 버튼은 비활성화해야 한다.
- editor v1.8 roadmap: `docs/sajik-seatmap-editor-v18-roadmap.md`는 후속 구현 범위만 정의한다. 이번 release lock은 editor v1.8 구현, 파일 write, production route 노출을 포함하지 않는다.
- hitPath expansion candidates: `012/013/021/022/023/031/032/033/041/044/121/122/123/124/125/131/132/133/134/135/142/143`은 모바일 터치 편의를 위한 후속 확장 후보로 표시한다. 현재 release lock에서는 `032`만 공식 이미지/근접 터치 분석 기반의 승인된 별도 `hitPath`를 가지며, 나머지 후보는 `hitPath === visualPath`를 유지한다.

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
- `mapSelectable=87`
- `seatSectionRenderedPaths=84`
- `accessibilityMarkersRendered=3`
- `aliasOnlyRendered=0`
- `aliasOnlyOfficialPngBlockNotVisible=2`
- `officialPngBlockNotVisible=2`
- `alignmentLockedVerified=87`
- `alignmentFailures=0`
- `thinOutsideFailures=0`
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

## 공식 이미지 미표시 예외

- 예외 블럭: `011`, `903`
- 두 블럭은 기존 운영 데이터 호환용 block/search/alias 데이터로 유지한다.
- 공식 이미지에서 독립 좌석 색상 블럭이 확인되지 않으므로 `PIXEL_ALIGNED`를 부여하지 않는다.
- `SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS`와 `SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS`는 `011`, `903`만 포함해야 한다.
- `SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS`는 `011`, `903`만 포함해야 한다.
- `011`, `903`은 SVG hit-area로 렌더링하지 않으며 지도 클릭/hover/popup 대상에서 제외한다.
- 브라우저 label-coordinate QA는 `84 seat paths + 3 accessibility markers = 87` selectable target을 검증하고, 이전 `011` 좌표 클릭이 `011` 상세 패널을 열지 않아야 한다.
- 새 공식 이미지 또는 운영자 승인 좌표가 제공되면 두 블럭을 재트레이싱하고 `89 LOCKED_VERIFIED` 목표로 release lock을 갱신한다.

## 2026-05-17 green handoff

- `011/903`은 계속 alias-only 운영 호환 블럭이며 `MANUAL_REVIEW_REQUIRED` 상태를 유지한다.
- `011`은 현재 5점 polygon 기준 reference로 고정한다: bounds `620,466-666,492`, area `1079.5`, label anchor `644,479`.
- `903`은 alias-only 상태를 유지하되 label anchor `899,267` reference와 `MANUAL_REVIEW_REQUIRED` 계약을 함께 유지한다.
- 사직 회귀는 수원 polygon 문제가 아니라 `011/903` alias-only 계약과 trace reference drift에서 발생한 데이터 계약 불일치였으며, 수원 release 판단과 분리해 해결했다.
- `releasePayloadFileCount=17`, `historicalReferenceFileCount=17`, `stagingManifest`, `stage01PartialReadinessGate` 문서 계약은 현재 `StadiumGuideRuntimeSeatMaps.test.ts`의 사직 release lock 테스트를 통과한다.

Green verification:

- `node --import tsx --test src/data/sajikSeatData.test.ts`: 통과, `21/21`
- `npm run test:stadium:seatmaps`: 통과, `262/262`
- `npm run qa:stadium:suwon:release-lock`: 통과
- `git diff --check`: 통과
- build 확인이 필요한 release/passoff 환경에서는 `env VITE_SITE_URL=https://example.com VITE_API_BASE_URL=https://api.example.com npm run build` 조건을 사용한다.

## 2026-05-20 operator reference primary source handoff

- primary source: `OPERATOR_REFERENCE_2026`
- secondary source: `LOTTE_OFFICIAL_2026`
- operator reference asset: `src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp`
- operator reference 좌표계: `1151x1367`
- operator reference viewBox: `0 0 1151 1367`
- operator reference map version: `BUSAN_SAJIK_2026_OPERATOR_REFERENCE_POLYGON_V1`
- operator reference SHA-256: `794d957510240c786f4fce821814afbf01cc1f93fe7ec3ecca23846a8d753f6f`
- `SAJIK_DEFAULT_SEATMAP_SOURCE_ID`는 `OPERATOR_REFERENCE_2026`으로 고정한다.
- 기존 공식 `960x640` `LOTTE_OFFICIAL_2026` source와 `BUSAN_SAJIK_2026_MANUAL_POLYGON_V2` dataset은 secondary production-interactive source로 유지한다.
- operator reference dataset은 `SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET`을 source of truth로 사용한다.
- operator reference runtime selection은 `runtimeSelectionEnabled=true`, `polygonStatus=PRODUCTION_INTERACTIVE`, `productionPromotionDecision=PRIMARY_SOURCE_ACTIVE`를 유지한다.
- operator reference section coverage는 `sections=78`, `hitExpandedSections=78`, `markers=14`, `linkedSelectableMarkers=8`, `displayOnlyMarkers=6`, `referenceOnlySections=3`을 고정한다.
- reference-only section id는 `322`, `323`, `921`만 허용한다.
- trace coverage closeout은 `PASS_TRACE_COVERAGE_CLOSEOUT`, `coveredSectionCount=78`, `reviewReportCount=12`, `missing=0`, `duplicate=0`, `unexpected=0`, `issues=0`을 유지해야 한다.
- trace coverage decision count는 `LOCK_CURRENT_TRACE=71`, `LOCK_SIMPLIFIED_TRACE=3`, `LOCK_CONTINUOUS_MARKER_SPLIT_TRACE=4`로 고정한다.
- promotion readiness gate는 topology report뿐 아니라 `operator-reference-trace-coverage-closeout.json`을 직접 읽어 위 coverage 계약을 검증해야 한다.
- promotion readiness는 `PASS_PRIMARY_SOURCE_READINESS`, `defaultSourceId=OPERATOR_REFERENCE_2026`, `autoPromotionAllowed=false`, `issues=[]` 상태일 때만 primary source active로 간주한다.
- QA chain은 `npm run qa:stadium:sajik:operator-reference-approved`로 검증하며, 이 체인은 trace review 12개 stage, coverage closeout, promotion readiness를 순서대로 실행한다.
- release chain은 `npm run qa:stadium:sajik:operator-reference-release`로 검증하며, 이 체인은 scope audit, approved QA chain, interactive preview QA를 순서대로 실행한다.
- scope audit은 `PASS_OPERATOR_REFERENCE_SCOPE_AUDIT`, `safeToRunBulkGitAdd=false`, `requiresManualHunkReview=true`, `unexpectedDirtyFiles=0`을 유지해야 한다.
- production build 검증은 사직 operator reference gate와 별개로 유지한다. 현재 작업 트리의 build blocker가 사직 좌석도가 아닌 다른 dirty bundle budget에서 발생하면 operator reference release lock 실패로 분류하지 않는다.

Operator reference verification:

- `npm run stadium:sajik:operator-reference-scope-audit`: PASS, `PASS_OPERATOR_REFERENCE_SCOPE_AUDIT`
- `npm run stadium:sajik:operator-reference-promotion-readiness`: PASS, `PASS_PRIMARY_SOURCE_READINESS`, `PRIMARY_SOURCE_ACTIVE`
- `node --import tsx --test src/data/sajikSeatData.test.ts`: PASS, `31/31`
- `node --import tsx --test src/components/sajik/SajikSeatMap.test.ts`: PASS, `7/7`
- `npm run qa:stadium:sajik:operator-reference-approved`: PASS, `PASS_TRACE_COVERAGE_CLOSEOUT`, `PASS_PRIMARY_SOURCE_READINESS`
- `npm run qa:stadium:sajik:operator-reference-release`: PASS, scope audit `unexpected=0`, interactive preview `mobile-390`/`desktop-1440`, hit areas `78`
- `env VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build`: PASS, `bundle-guard ok`, `CoachBriefing content runtime=1807/8000`

## 2026-05-25 canonical single-source verification

- `npm run stadium:sajik:block-source-duplication-audit`: PASS, `active_canonical_blocks=78`, `active_polygon_source_per_block=1`, `legacy_alias_only=11`
- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts`: PASS, `37/37`
- `node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts`: PASS
- `npm run qa:stadium:sajik:full`: PASS, output `output/playwright/stadium-ux-sajik-full/stadium-mobile-smoke-summary.md`
- `env VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build`: PASS, `bundle-guard ok`, `seo:prerender` 9 routes, sitemap generated.

## Canonical QA Evidence Summary

- generated QA report files stay out of the PR payload: `reports/stadium/sajik-seatmap-*.{json,csv,md,png}`, `reports/stadium/sajik-stage01-operator/*`, `dist/*`, `output/playwright/*`
- block source duplication report: `reports/stadium/sajik-seatmap-block-source-duplication-audit.{json,csv,md}`; latest summary `active_canonical_blocks=78`, `active_polygon_source_per_block=1`, `legacy_alias_only=11`
- scope guard report: `reports/stadium/sajik-seatmap-pr-scope-guard.{json,md}`; latest summary `included=17`, `unexpected=0`, `blockers=0`
- scope guard smoke report: `reports/stadium/sajik-seatmap-pr-scope-guard-smoke.{json,md}`; full/partial guard snapshots pass
- full visual QA summary: `output/playwright/stadium-ux-sajik-full/stadium-mobile-smoke-summary.md`; report path is evidence only and is not staged
- build reports `reports/bundle-guard-report.json` and `reports/dist-assets-report.json` are regenerated evidence and stay unstaged
- generated report 원문은 복사하지 않는다

## 기준 산출물

- Alignment audit JSON: `reports/stadium/sajik-seatmap-alignment-audit.json`
- Alignment audit CSV: `reports/stadium/sajik-seatmap-alignment-audit.csv`
- Alignment audit summary: `reports/stadium/sajik-seatmap-alignment-audit.md`
- Alignment audit SVG: `reports/stadium/sajik-seatmap-alignment-audit.svg`
- Block source duplication audit JSON: `reports/stadium/sajik-seatmap-block-source-duplication-audit.json`
- Block source duplication audit CSV: `reports/stadium/sajik-seatmap-block-source-duplication-audit.csv`
- Block source duplication audit summary: `reports/stadium/sajik-seatmap-block-source-duplication-audit.md`
- Trace manifest JSON: `reports/stadium/sajik-seatmap-trace-review.json`
- Trace manifest CSV: `reports/stadium/sajik-seatmap-trace-review.csv`
- Trace summary: `reports/stadium/sajik-seatmap-trace-review.md`
- Dataset export JSON: `reports/stadium/sajik-seatmap-dataset.json`
- hitPath candidate review JSON: `reports/stadium/sajik-seatmap-hitpath-candidate-review.json`
- hitPath candidate review summary: `reports/stadium/sajik-seatmap-hitpath-candidate-review.md`
- Zone precision workset JSON: `reports/stadium/sajik-seatmap-zone-precision-worksets.json`
- Zone precision workset summary: `reports/stadium/sajik-seatmap-zone-precision-worksets.md`
- Zone precision workset SVG: `reports/stadium/sajik-seatmap-zone-precision-worksets.svg`
- Stage 01 operator input JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json`
- Stage 01 operator package summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-package.md`
- Stage 01 operator checklist: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-checklist.md`
- Stage 01 operator input aid JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-aid.json`
- Stage 01 operator input aid CSV: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-aid.csv`
- Stage 01 operator input aid summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-aid.md`
- Stage 01 official image pixel analysis: `reports/stadium/sajik-seatmap-pixel-components.json`
- Stage 01 review board JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.json`
- Stage 01 review board CSV: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.csv`
- Stage 01 review board summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.md`
- Stage 01 entry sheet CSV: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-entry-sheet.csv`
- Stage 01 entry sheet summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-entry-sheet.md`
- Stage 01 review board overlay: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.svg`
- Stage 01 next-action packet: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-next-action-packet.md`
- Stage 01 target review packet: `reports/stadium/sajik-stage01-operator/targets/131-review-packet.md`
- Stage 01 target image-analysis smoke JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-image-analysis-smoke.json`
- Stage 01 target image-analysis smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-image-analysis-smoke.md`
- Stage 01 all-target review packets: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-all-target-review-packets.md`
- Stage 01 all-target image-analysis smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-all-target-image-analysis-smoke.md`
- Stage 01 target entry template readiness smoke JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-entry-template-readiness-smoke.json`
- Stage 01 target entry template readiness smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-entry-template-readiness-smoke.md`
- Stage 01 target review overlay: `reports/stadium/sajik-stage01-operator/targets/131-review-packet.svg`
- Stage 01 target entry template: `reports/stadium/sajik-stage01-operator/targets/131-entry-template.json`
- Stage 01 prewrite gate: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite.md`
- Stage 01 patch preview: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite.patch-preview.ts`
- Stage 01 apply-ready JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-apply-ready.json`
- Stage 01 apply-ready summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-apply-ready.md`
- Stage 01 post-apply audit JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-post-apply-audit.json`
- Stage 01 post-apply audit summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-post-apply-audit.md`
- Stage 01 operator status JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-status.json`
- Stage 01 operator status CSV: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-status.csv`
- Stage 01 operator status summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-status.md`
- Stage 01 manual patch plan JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-manual-patch-plan.json`
- Stage 01 manual patch plan CSV: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-manual-patch-plan.csv`
- Stage 01 manual patch plan summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-manual-patch-plan.md`
- Stage 01 real approval readiness JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-real-approval-readiness.json`
- Stage 01 real approval readiness CSV: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-real-approval-readiness.csv`
- Stage 01 real approval readiness summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-real-approval-readiness.md`
- Stage 01 target apply precheck JSON: `reports/stadium/sajik-stage01-operator/targets/131-apply-precheck.json`
- Stage 01 target apply precheck summary: `reports/stadium/sajik-stage01-operator/targets/131-apply-precheck.md`
- Stage 01 131 apply path status JSON: `reports/stadium/sajik-stage01-operator/targets/131-apply-path-status.json`
- Stage 01 131 apply path status summary: `reports/stadium/sajik-stage01-operator/targets/131-apply-path-status.md`
- Stage 01 prewrite smoke JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite-smoke.json`
- Stage 01 prewrite smoke summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite-smoke.md`
- Stage 01 approved dry-run JSON: `reports/stadium/sajik-stage01-operator/dry-run/sajik-seatmap-stage01-approved-dry-run.json`
- Stage 01 approved dry-run summary: `reports/stadium/sajik-stage01-operator/dry-run/sajik-seatmap-stage01-approved-dry-run.md`
- Stage 01 applied dry-run JSON: `reports/stadium/sajik-stage01-operator/applied-dry-run/sajik-seatmap-stage01-applied-dry-run.json`
- Stage 01 applied dry-run summary: `reports/stadium/sajik-stage01-operator/applied-dry-run/sajik-seatmap-stage01-applied-dry-run.md`
- Stage 01 131 lifecycle smoke JSON: `reports/stadium/sajik-stage01-operator/target-lifecycle-smoke/sajik-seatmap-stage01-131-lifecycle-smoke.json`
- Stage 01 131 lifecycle smoke summary: `reports/stadium/sajik-stage01-operator/target-lifecycle-smoke/sajik-seatmap-stage01-131-lifecycle-smoke.md`
- Stage 01 readiness summary JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-readiness-summary.json`
- Stage 01 readiness summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-readiness-summary.md`
- Stage 01 readiness summary smoke JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-readiness-summary-smoke.json`
- Stage 01 readiness summary smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-readiness-summary-smoke.md`
- Stage 01 operator input intake gate JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-intake-gate.json`
- Stage 01 operator input intake gate CSV: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-intake-gate.csv`
- Stage 01 operator input intake gate summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-intake-gate.md`
- Stage 01 operator input intake gate smoke JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-intake-gate-smoke.json`
- Stage 01 operator input intake gate smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-intake-gate-smoke.md`
- Stage 01 completion gate JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-completion-gate.json`
- Stage 01 completion gate: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-completion-gate.md`
- Stage 01 completion gate smoke JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-completion-gate-smoke.json`
- Stage 01 completion gate smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-completion-gate-smoke.md`
- Stage 01 target entry preflight JSON: `reports/stadium/sajik-stage01-operator/targets/131-entry-preflight.json`
- Stage 01 target entry preflight summary: `reports/stadium/sajik-stage01-operator/targets/131-entry-preflight.md`
- Stage 01 target entry preflight smoke JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-entry-preflight-smoke.json`
- Stage 01 target entry preflight smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-entry-preflight-smoke.md`
- Stage 01 target approval gate JSON: `reports/stadium/sajik-stage01-operator/targets/131-approval-gate.json`
- Stage 01 target approval gate summary: `reports/stadium/sajik-stage01-operator/targets/131-approval-gate.md`
- Stage 01 target approval gate smoke JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-approval-gate-smoke.json`
- Stage 01 target approval gate smoke: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-approval-gate-smoke.md`
- Stage 01 handoff: `docs/sajik-seatmap-stage01-handoff.md`
- marker transition review JSON: `reports/stadium/sajik-seatmap-marker-transition-review.json`
- marker transition review summary: `reports/stadium/sajik-seatmap-marker-transition-review.md`
- Editor regression JSON: `reports/stadium/sajik-seatmap-editor-regression.json`
- Editor regression summary: `reports/stadium/sajik-seatmap-editor-regression.md`
- PR scope guard JSON: `reports/stadium/sajik-seatmap-pr-scope-guard.json`
- PR scope guard summary: `reports/stadium/sajik-seatmap-pr-scope-guard.md`
- Stage 01 staged scope audit smoke JSON: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-staged-scope-audit-smoke.json`
- Stage 01 staged scope audit smoke summary: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-staged-scope-audit-smoke.md`
- Evidence report JSON: `reports/stadium/sajik-seatmap-evidence-crops.json`
- Evidence summary: `reports/stadium/sajik-seatmap-evidence-crops.md`
- Evidence contact sheet: `reports/stadium/sajik-seatmap-evidence-contact-sheet.png`
- P0 evidence: `reports/stadium/sajik-seatmap-evidence-p0.png`
- P1 evidence: `reports/stadium/sajik-seatmap-evidence-p1.png`
- P2 evidence: `reports/stadium/sajik-seatmap-evidence-p2.png`
- P0 thin-first-base evidence: `reports/stadium/sajik-seatmap-evidence-p0-thin-first-base.png`
- P0 143 boundary lock evidence: `reports/stadium/sajik-seatmap-evidence-p0-143-boundary-lock.png`
- P0 132/142/143 seam evidence: `reports/stadium/sajik-seatmap-evidence-p0-132-142-143-seams.png`
- P0 123/133/143 seam evidence: `reports/stadium/sajik-seatmap-evidence-p0-123-133-143-seams.png`
- P0 retraced 3b upper evidence: `reports/stadium/sajik-seatmap-evidence-p0-retraced-3b-upper.png`
- P0 central lower 011 review evidence: `reports/stadium/sajik-seatmap-evidence-p0-central-lower-011-review.png`
- P0 011 alias-only no-hit-area evidence: `reports/stadium/sajik-seatmap-evidence-p0-011-alias-only-no-hit-area.png`
- P1 everytime review evidence: `reports/stadium/sajik-seatmap-evidence-p1-retraced-everytime.png`
- Advisory Playwright summary: `reports/stadium/sajik-seatmap-advisory-playwright-review.md`
- Advisory Playwright full screenshot: `../output/playwright/sajik-seatmap-advisory-review/sajik-advisory-playwright-full.png`
- Browser QA summary: `../output/playwright/stadium-ux-sajik-validate/stadium-mobile-smoke-summary.md`
- Browser QA screenshots:
  - `../output/playwright/stadium-ux-sajik-validate/mobile-390.png`
  - `../output/playwright/stadium-ux-sajik-validate/desktop-1440.png`
  - `../output/playwright/stadium-ux-sajik-validate/sajik-debug-overlay-1440x1000.png`
- Operator reference dataset summary: `reports/stadium/sajik-operator-reference-trace/operator-reference-approved-dataset-summary.json`
- Operator reference dataset export: `src/data/sajikOperatorReferenceSeatMapDataset.ts`
- Operator reference visible section audit: `reports/stadium/sajik-operator-reference-trace/operator-reference-visible-section-audit.json`
- Operator reference geometry audit: `reports/stadium/sajik-operator-reference-trace/operator-reference-approved-geometry-audit.json`
- Operator reference topology audit: `reports/stadium/sajik-operator-reference-trace/operator-reference-approved-topology-audit.json`
- Operator reference marker policy audit: `reports/stadium/sajik-operator-reference-trace/operator-reference-marker-policy-audit.json`
- Operator reference marker boundary review: `reports/stadium/sajik-operator-reference-trace/operator-reference-marker-boundary-review.md`
- Operator reference trace coverage closeout JSON: `reports/stadium/sajik-operator-reference-trace/operator-reference-trace-coverage-closeout.json`
- Operator reference trace coverage closeout summary: `reports/stadium/sajik-operator-reference-trace/operator-reference-trace-coverage-closeout.md`
- Operator reference promotion readiness: `reports/stadium/sajik-operator-reference-trace/operator-reference-promotion-readiness.json`
- Operator reference scope audit JSON: `reports/stadium/sajik-operator-reference-trace/operator-reference-scope-audit.json`
- Operator reference scope audit summary: `reports/stadium/sajik-operator-reference-trace/operator-reference-scope-audit.md`

## 최신 검증 실행

검증 시각: 2026-05-15 22:30:17 KST

- `npm run qa:stadium:sajik:trace-review`: PASS
  - evidence 재생성 PASS
  - advisory Playwright review PASS, `advisory=2`, `panels=2`
  - isolated Sajik browser QA PASS, `status:passed`
  - 최종 alignment audit PASS, `total=89 mapSelectable=87 aliasOnlyNotVisible=2 locked=87 notVisible=2 retrace=0 officialFailures=0 thinOutsideFailures=0`
- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts`: PASS, `24/24`
- `node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts`: PASS, focused StadiumGuide Sajik contract
- `node scripts/stadium-seatmap-ops.mjs sajik dataset-export --check`: PASS, `sections=89 enabled=87 aliasOnly=2 markers=3`
- `npm run stadium:sajik:hitpath-review`: PASS, `candidates=22`, `p0=16`, `p1=5`, `p2=1`, `aliasOnly=2`, `visualEqualsHit=21`, `expanded=1`, `approvedHitPathExpansionSectionIds=032`, `blockers=0`
- `npm run stadium:sajik:zone-precision-worksets`: PASS, `status=waiting-for-operator`, `candidates=22`, `p0=16`, `p1=5`, `p2=1`, `guards=3`, `expanded=1`, `approvedHitPathExpansionSectionIds=032`, `blockers=0`
- `npm run stadium:sajik:stage01-operator-package`: PASS, `status=waiting-for-operator`, `rows=16`, `approved=0`, `preserved=0`, `preservation=no-existing-input`, `blockers=0`, `imageRiskCounts=HIGH=8/MEDIUM=4/LOW=4`, `imagePriority=131>032>133>143>135>134>122>123>132>031>022>142>121>124>125>021`
- `npm run stadium:sajik:stage01-operator-input-aid`: PASS, `status=waiting-for-operator`, `ready=0`, `approved=0`, `pending=16`, `rejected=0`, `needsRetrace=0`, `keepCurrent=0`, `invalid=0`, `blockers=0`, pending `nextAction=FILL_OR_DECIDE`
- `npm run stadium:sajik:stage01-review-board`: PASS, `status=waiting-for-operator`, `rows=16`, `pending=16`, `ready=0`, `invalid=0`, `blockers=0`, `sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-next-action-packet`: PASS, `status=waiting-for-operator`, `rows=16`, `pending=16`, `ready=0`, `invalid=0`, `next=131`, `sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-target-review-packet`: PASS, `status=waiting-for-operator`, `target=131`, `next=131`, `risk=HIGH`, `sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-target-image-analysis-smoke`: PASS, `target=131`, `crop=615 433 140 110`, `pngSize=560x440`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-all-target-review-packets`: PASS, `status=waiting-for-operator`, `targets=16/16`, `officialPngOnly=true`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-all-target-image-analysis-smoke`: PASS, `mode=all-stage01-targets`, `targets=16/16`, `artifacts=48`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-target-entry-template-readiness-smoke`: PASS, `target=131`, `decision=PENDING`, `editableFieldsBlank=true`, `approvedRequiredFields=7`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-target-entry-preflight`: PASS, `status=waiting-for-operator`, `target=131`, `source=none`, `decision=PENDING`, `readyForApprovalGate=false`, `blockers=0`, `sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-target-entry-preflight-smoke`: PASS, `cases=12/12`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-target-approval-gate`: PASS, `status=waiting-for-operator`, `target=131`, `source=none`, `decision=PENDING`, `readyForPrewrite=false`, `targetEntryPreflight=waiting-for-operator:PENDING`, `sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-target-approval-gate-smoke`: PASS, `cases=20/20`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-all-target-approval-readiness`: PASS, `status=waiting-for-operator`, `targets=16/16`, `readyForApprovalGate=0`, `readyForPrewrite=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-all-target-approval-readiness-smoke`: PASS, `targets=16/16`, `readyForApprovalGate=0`, `readyForPrewrite=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-all-target-approval-input-guide`: PASS, `status=waiting-for-operator`, `targets=16/16`, `pending=16`, `approved=0`, `readyForApprovalGate=0`, `readyForPrewrite=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-all-target-approval-input-guide-smoke`: PASS, `targets=16/16`, `pending=16`, `approved=0`, `readyForApprovalGate=0`, `readyForPrewrite=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-operator-input-intake-gate`: PASS, `status=waiting-for-operator`, `targets=16/16`, `approved=0`, `readyForPrewrite=0`, `waiting=16`, `blocked=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-operator-input-intake-gate-smoke`: PASS, `targets=16/16`, `pending=16`, `approved=0`, `readyForPrewrite=0`, `blocked=0`, fixture `approved-valid=ready-for-prewrite`, placeholder fixtures `approved-placeholder=blocked` and `keep-current-placeholder=blocked`, fixture `keep-current-valid=waiting-for-operator`, fixture `approved-invalid=blocked`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-prewrite`: PASS, `status=waiting-for-operator`, `rows=16`, `approved=0`, `valid=0`, `patchPreview=0`, `blockers=0`
- `npm run stadium:sajik:stage01-apply-ready`: PASS, `status=waiting-for-operator`, `approved=0`, `patchPreview=0`, `productionDataChanged=false`
- `npm run stadium:sajik:stage01-post-apply-audit`: PASS, `status=waiting-for-operator`, `approvedPatchPayloads=0`, `applied=0`, `unapplied=0`, `readOnly=true`
- `npm run stadium:sajik:stage01-operator-status`: PASS, `status=waiting-for-operator`, `approved=0`, `applied=0`, `notApplied=0`, `pending=16`, `invalid=0`, `blockers=0`
- `npm run stadium:sajik:stage01-manual-patch-plan`: PASS, `status=waiting-for-operator`, `manualPatchRows=0`, `approved=0`, `applied=0`, `notApplied=0`, `blockers=0`
- `npm run stadium:sajik:stage01-real-approval-readiness`: PASS, `status=waiting-for-operator`, `approved=0`, `ready=0`, `notApplied=0`, `applied=0`, `blocked=0`, `manualPatchRows=0`, `sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-target-apply-precheck`: PASS, `status=waiting-for-operator`, `target=131`, `decision=PENDING`, `readyForPrewrite=false`, `manualPatchRequired=false`, `targetApplied=false`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-131-apply-path-status`: PASS, `status=waiting-for-operator`, `target=131`, `decision=PENDING`, `editableFieldsBlank=true`, `readyForPrewrite=false`, `manualPatchRequired=false`, `lifecycleFixtureReady=true`, `officialPngEvidenceReady=true`, `approvalInputChecklistReady=true`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`. The report now carries `coordinatePatchReadiness.productionPatchAllowedNow=false`, `OPERATOR_APPROVED_COORDINATES_MISSING`, `operatorDecisionPacket.decisionPacketVersion=SAJIK_STAGE01_131_DECISION_PACKET_V1`, `operatorDecisionPacket.allowedDecisionPaths`, `currentGeometryApprovalDraft.notAutoApproved=true`, `keepCurrentDecisionDraft.notAutoApproved=true`, the official image evidence brief, official image visual review brief, crop artifacts, required review assertions, forbidden coordinate sources, and ready-for-prewrite criteria for the `131` approval input path. Draft placeholders such as `<operator name>` and `<ISO timestamp>` are review-only and must block if copied into operator input unchanged.
- `npm run stadium:sajik:stage01-prewrite-smoke`: PASS, `cases=26/26`, `operatorPackagePreservationPassed=true`, `preservationStatus=preserved`, `productionDataChanged=false`, `approved-with-delta` fixture rowStatus `NOT_APPLIED`, readiness `APPROVED_NOT_APPLIED`, `approved-applied-after-manual-patch` fixture rowStatus `APPLIED`, readiness `APPROVED_APPLIED`, `approved-no-delta` readiness `APPROVED_APPLIED`, input aid action `RUN_PREWRITE`, manual patch plan action `MANUAL_PATCH_REQUIRED`, decision row fixture `REJECTED/NEEDS_RETRACE/KEEP_CURRENT`, invalid path/label/unknown section fixtures blocked, geometry quality fixtures block `CORRECTED_GEOMETRY_AREA_DELTA_TOO_LARGE` and `CORRECTED_POINT_COUNT_TOO_HIGH`, near-boundary label fixture warns `CORRECTED_LABEL_NEAR_BOUNDARY`, pixel candidate copy/paste note fixture warns `OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW`, `131` target approval gate fixtures block missing/blocked/mismatched approval gate reports and allow a matching ready gate, partial/stale/locked-field fixtures block `PARTIAL_APPLY_HITPATH_ONLY`, `PARTIAL_APPLY_LABEL_ONLY`, `LEGACY_LABEL_DRIFT`, `STALE_BEFORE_SNAPSHOT_HIT_PATH`, `LOCKED_FIELD_MUTATED:visualPath`, tampered readiness fixtures block `VISUAL_PATH_CHANGED_WITHOUT_APPROVAL` and `TARGET_SOURCE_FILE_MISMATCH`
- `npm run stadium:sajik:stage01-approved-dry-run`: PASS, `target=021`, `prewrite=ready-for-data-patch`, `applyReady=ready-for-manual-apply`, `postApply=not-applied`, `readiness=ready-for-manual-apply`, `readinessRow=APPROVED_NOT_APPLIED`, `manualPatchRows=1`, `sourceDataWritePerformed=false`, `productionWriteAllowed=false`
- `npm run stadium:sajik:stage01-applied-dry-run`: PASS, `target=021`, `postApply=applied`, `operatorStatus=applied`, `operatorStatusRow=APPLIED`, `manualPatchRows=0`, `readiness=applied`, `readinessRow=APPROVED_APPLIED`, `sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-131-lifecycle-smoke`: PASS, `target=131`, `preflight=ready-for-approval-gate`, `approval=ready-for-prewrite`, `prewrite=ready-for-data-patch`, `applyReady=ready-for-manual-apply`, `postApply=not-applied`, `operatorStatusRow=NOT_APPLIED`, `manualPatchAction=MANUAL_PATCH_REQUIRED`, `readinessRow=APPROVED_NOT_APPLIED`, `sourceDataWritePerformed=false`, `patchAllowedFieldsOnly=true`, `writableFragmentLockedTokensAbsent=true`
- `npm run stadium:sajik:stage01-readiness-summary`: PASS, `operatorInputRows=16`, `operatorInputApproved=0`, `packageImageHighRisk=8`, `reviewBoardImageHighRisk=8`, `packageImagePriority=131>032>133>143>135>134>122>123>132>031>022>142>121>124>125>021`, `reviewBoardImagePriority=131>032>133>143>135>134>122>123>132>031>022>142>121>124>125>021`, `packageReviewBoardImagePriorityMatched=true`, `realApprovalReadiness=waiting-for-operator`, `prewriteSmoke=passed`, `approvedDryRun=APPROVED_NOT_APPLIED`, `appliedDryRun=APPROVED_APPLIED`, `targetEntryPreflight=waiting-for-operator:PENDING`, `targetEntryPreflightReady=false`, `targetEntryPreflightSmoke=passed:12/12`, `targetApprovalGate=waiting-for-operator:PENDING`, `targetApprovalReady=false`, `sourceDataWritePerformed=false`, `freshReports=true`
- `npm run stadium:sajik:stage01-readiness-summary-smoke`: PASS, `cases=27/27`, fixtures `valid-summary`, `missing-report`, `review-board-missing`, `stale-report`, `approved-readiness-drift`, `applied-readiness-drift`, `image-analysis-priority-drift`, `image-analysis-risk-count-drift`, `candidate-reference-drift`, `pixel-component-source-drift`, `package-image-priority-drift`, `package-image-risk-count-drift`, `package-candidate-reference-drift`, `package-pixel-component-source-drift`, `operator-input-image-priority-drift`, `package-review-board-image-mismatch`, `target-entry-preflight-missing`, `target-entry-preflight-stale`, `target-entry-preflight-source-write-drift`, `target-entry-preflight-status-drift`, `target-entry-preflight-smoke-failed`, `target-entry-preflight-target-mismatch`, `target-approval-gate-missing`, `target-approval-source-write-drift`, `target-approval-status-drift`, `source-write-drift`, `operator-input-drift`
- `npm run stadium:sajik:stage01-completion-gate`: PASS, `status=waiting-for-operator`, `pending=16`, `approvedApplied=0`, `manualPatchRows=0`, `next=131`, `readyForStage01Close=false`, `sourceDataWritePerformed=false`
- `npm run qa:stadium:sajik:stage01-readiness`: PASS, partial-worktree-safe Stage 01 gate. Runs real approval readiness, target apply precheck, prewrite smoke, approved/applied dry-runs, 131 lifecycle smoke, 131 apply path status, the Sajik-focused static contract test, review board, next-action packet, target review packet, target image-analysis smoke, all-target official image review packets, all-target image-analysis smoke, target entry template readiness smoke, target entry preflight, target entry preflight smoke, target approval gate, target approval smoke, all-target approval readiness, all-target approval readiness smoke, all-target approval input guide, all-target approval input guide smoke, operator input intake gate, intake gate smoke, readiness summary, readiness summary smoke, completion gate, completion gate smoke, and staged scope audit smoke without `pr-scope-guard` or build.
- `node scripts/stadium-seatmap-ops.mjs sajik marker-transition-review`: PASS, `markers=3`, `sections=3`, `seatPaths=84`, `markerLayer=3`, `aliasRendered=0`, `positionLocks=3`, `selectableCompat=3`, `markerOnlyApplied=false`, `blockers=0`
- `node scripts/stadium-seatmap-ops.mjs sajik editor-regression`: PASS, editor v1.7 browser regression `status:passed checks=11`
- `node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard`: PASS in current mixed worktree, `status=passed`, `fullRelease=passed`, `stage01PartialScope=passed`, `stage01PartialStagingVerdict=ready-for-partial-stage01-staging`, `mode=full-release`, `commandExit=0`, `included=<runtime>`, `separate=<runtime>`, `unexpected=0`, `blockers=0`, `partialBlockers=0`, patch separation `review-required`, `stage01ReadinessAvailable=true`; clean official image/operator-reference/stage01 evidence is tracked in `historicalReferenceFiles` with `productionSource=false`, not as missing release payload. `included` and `separate` are advisory dirty-worktree counts and may drift as unrelated workstreams change; pass criteria are `unexpected=0`, `blockers=0`, and missing canonical payload files `0`. Shared home ranking and toast UI files, including `TeamRankRow`, `sonner`, and `shims/sonner`, are classified as separate workstreams rather than unexpected Sajik PR payload. The report recommends manual hunk review for shared files and keeps `partialVerificationAfterStaging` and `fullReleaseVerificationAfterStaging` as separate release-lock contracts.
- `npm run stadium:sajik:stage01-pr-scope-guard`: PASS in current mixed worktree, `status=passed`, `fullRelease=passed`, `stage01PartialScope=passed`, `partialBlockers=0`, `mode=stage01-partial`, `commandExit=0`.
- `npm run stadium:sajik:stage01-staged-scope-audit-smoke`: PASS, fixture smoke over partial/complete/blocked staged-index branches, `cases=7/7`, `expectedStage01PartialTargetFileCount=40`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`.
- `npm run stadium:sajik:stage01-staged-scope-audit:complete`: retained as the post-staging complete index verification command when assembling a Stage 01 partial package.
- `node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard-smoke`: PASS, structural smoke over generated scope guard reports and writes `reports/stadium/sajik-seatmap-pr-scope-guard-smoke.{json,md}`. Snapshot summary: `fullReleaseRun.exitCode=0`, `fullReleaseRun.executionMode=full-release`, `partialRun.exitCode=0`, `partialRun.executionMode=stage01-partial`, `stage01PartialScope=passed`, `stage01PartialExit=0`, `releasePayloadFileCount=17`, `historicalReferenceFileCount=17`, `stage01ReadinessAvailable=true`.
- `npm run qa:stadium:sajik:polygon-v2`: BLOCKED at `stadium:sajik:pr-scope-guard` in current partial worktree after dataset/export/alignment/evidence/hitPath review/Stage 01 operator-input-aid/review-board/next-action packet/target review packet/target image-analysis smoke/all-target official image review packets/all-target image-analysis smoke/target entry template readiness smoke/target entry preflight/target entry preflight smoke/target approval gate/target approval smoke/all-target approval readiness/all-target approval readiness smoke/all-target approval input guide/input intake gate/prewrite/apply-ready/post-apply/operator-status/manual-patch-plan/readiness/target apply precheck/smoke/approved dry-run/applied dry-run/131 lifecycle smoke/131 apply path status/readiness summary/readiness summary smoke/completion gate/completion gate smoke/marker transition review/Sajik-focused node tests/editor regression passed.
- `VITE_SITE_URL=http://127.0.0.1:5176 VITE_API_BASE_URL=/api npm run build`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS
- `SAJIK_SEATMAP_IMAGE`의 `mapVersion`, `viewBox`, `imageSha256` 고정값과 현재 공식 이미지 SHA-256 일치 확인.
- `visualPath`, `hitPath`, `labelPoint`, `geometryVersion`, `markerType`, `sectionKind` 표준 필드 검증 PASS.
- SVG 렌더링은 공식 이미지를 같은 `viewBox` 안의 `<image>`로 렌더링하고, hit-area는 `hitPath`를 사용한다.
- JSON dataset export check는 `sections=89`, `enabled=87`, `aliasOnly=2`, `markers=3`을 유지한다.
- hitPath candidate review는 후보 `22`개를 `P0=16`, `P1=5`, `P2=1`로 분리하고, 현재 기준에서 `032`만 승인된 모바일 hit-area 확장 좌표로 관리하므로 `expanded=1`, `visualEqualsHit=21`, `approvedHitPathExpansionSectionIds=032`를 유지한다.
- zone precision workset은 `P0-A/P0-B/P0-C/P1-A/P1-B/P2-A` 순서로 후보 22개와 regression guard `723/914/922` 3개를 고정하고 `productionWriteAllowed=false`를 유지한다.
- Stage 01 operator package는 `P0-A/P0-B/P0-C` 16개만 operator input으로 내보내며, 기존 입력이 있으면 editable field를 보존한다. 보존 실패, duplicate editable row, Stage 01 밖 editable row는 `OPERATOR_INPUT_PRESERVATION_FAILED`, `DUPLICATE_EXISTING_OPERATOR_INPUT`, `OPERATOR_INPUT_OUTSIDE_STAGE01`로 차단한다. Operator package는 `reports/stadium/sajik-seatmap-pixel-components.json`에서 `imagePriorityRank`, `imageRiskLevel`, `imageRiskReasons`, `imageComponentArea`, `imagePathColorCoverageRatio`, `imageBbox`, `imageSeedPoint`를 매번 재생성해 operator input/checklist에 노출한다. 이 image-analysis metadata는 참고용이며 editable field가 아니고, pixel candidate path는 package에 포함하지 않으며 `correctedPath`로 복사하지 않는다.
- Stage 01 operator input aid는 `APPROVED` row의 필수 editable field, 날짜, 좌표/path 기본 오류와 geometry quality metrics를 prewrite 전에 read-only로 표시해야 한다. `CORRECTED_PATH_REUSES_CURRENT_HIT_PATH`, `CORRECTED_PATH_REUSES_CURRENT_VISUAL_PATH`, `CORRECTED_LABEL_NEAR_BOUNDARY`, `OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW`는 warning으로 남기고, `CORRECTED_POINT_COUNT_TOO_HIGH`, `CORRECTED_GEOMETRY_AREA_DELTA_TOO_LARGE`, `CORRECTED_GEOMETRY_BOUNDS_DELTA_TOO_LARGE`는 prewrite 진입 전 blocker로 취급한다. 각 row는 `action`과 `nextAction`을 가져야 하며 `READY_FOR_PREWRITE` row만 `RUN_PREWRITE`로 prewrite patch preview에 진입한다. `OPERATOR_PLACEHOLDER_NOT_REPLACED:*`는 `APPROVED`와 `KEEP_CURRENT` 모두에서 blocker다. `KEEP_CURRENT`는 현재 production geometry를 유지하는 decision row이며 patch preview를 만들지 않는다. `KEEP_CURRENT` row는 `reviewer`, `reviewedAt`, `operatorNote`를 실제 값으로 채우고 `correctedPath`, `correctedLabelX`, `correctedLabelY`를 비워야 한다.
- Stage 01 review board는 operator package, input aid, local official image pixel-component report를 합쳐 review board, entry sheet, overlay SVG를 생성해야 한다. 이 산출물은 입력 보조 전용이며 좌표 추정, hitPath 확장, source data write를 수행하지 않는다. Entry sheet는 `operatorDecisionOptions`, `approvedRequiredFields`, `keepCurrentRule`, `patchPreviewEligible`, image-analysis risk/coverage/bbox를 노출해야 한다. Pixel candidate path는 evidence-only이며 operator 승인 없이 `correctedPath`로 복사하면 안 된다.
- Stage 01 target review packet은 next-action packet의 `nextOperatorSectionId=131`을 기준으로 `targets/131-review-packet.{json,md,svg}`와 `targets/131-entry-template.{json,csv}`를 생성해야 한다. 이 packet은 `targetSectionId=131`, `matchesNextOperatorSection=true`, `allowedCoordinateSource=operator-provided official 2026 Sajik image coordinates only`, `writesOperatorInput=false`, `writesProductionData=false`를 유지하고 좌표를 추정하지 않는다. Packet은 `SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1`, `mapVersion=BUSAN_SAJIK_2026_MANUAL_POLYGON_V2`, 공식 이미지 SHA-256, target viewport, current trace, pixel-component reference, operator interpretation, required review assertions, cannot-auto-approve reasons, writable/locked source field policy를 함께 고정해야 한다.
- Stage 01 prewrite gate는 승인 row가 없으면 `waiting-for-operator`로 통과하고, 승인 row가 있으면 `correctedPath`를 `hitPath` patch preview로만 검증한다. production data write는 수행하지 않는다. Prewrite markdown/report는 `Patch Preview Review`, `visualPathLocked`, `pointCountDelta`, `areaDelta`, `boundsDelta`, `centroidDelta`, `labelPointDelta`, `areaRatioVsCurrentHit`, `boundsMaxAbsDelta`, `labelBoundaryDistance`를 포함해야 한다.
- Stage 01 apply-ready gate는 prewrite 산출물과 patch preview를 다시 읽어 수동 data patch 후보만 검증한다. `ready-for-manual-apply`는 파일 write가 아니라 review-ready 상태이며 `sourceDataWritePerformed=false`를 유지한다.
- Stage 01 post-apply audit는 prewrite patch payload와 현재 production dataset을 비교하는 read-only 검증이다. 승인 좌표가 아직 수동 반영되지 않았으면 `not-applied`, 승인 row가 없으면 `waiting-for-operator`, 수동 반영이 끝나면 `applied`여야 한다. `PARTIAL_APPLY_HITPATH_ONLY`, `PARTIAL_APPLY_LABEL_ONLY`, `LEGACY_LABEL_DRIFT`, `STALE_BEFORE_SNAPSHOT_HIT_PATH`, `STALE_BEFORE_SNAPSHOT_LABEL_POINT`, `LOCKED_FIELD_MUTATED:*`는 `blocked`로 분리해야 한다.
- Stage 01 operator status board는 operator input, prewrite, apply-ready, post-apply audit를 합쳐 rowStatus `PENDING/REJECTED/NEEDS_RETRACE/KEEP_CURRENT/INVALID/APPLIED/NOT_APPLIED`와 manual patch checklist를 생성해야 한다.
- Stage 01 manual patch plan은 operator status의 `NOT_APPLIED` row만 `MANUAL_PATCH_REQUIRED` 대상으로 정리하고, `src/data/sajikSeatData.ts`에 반영할 current/approved geometry diff와 TS fragment를 read-only 산출물로 생성해야 한다. 각 row는 `beforeFingerprint`, `approvedFingerprint`, `lockedFieldFingerprint`, `sourceBaseline`을 포함해야 한다. `writableSourceFields`는 `imageGeometry.hitPath`, `imageGeometry.labelPoint`, `imageGeometry.labelX`, `imageGeometry.labelY`로 제한하고, `lockedSourceFields`에는 `imageGeometry.visualPath`, `sectionKind`, `markerType`, `mapInteractionStatus`, trace metadata를 포함해야 한다.
- Stage 01 real approval readiness gate는 실제 operator input 승인 row만 대상으로 `APPROVED_READY`, `APPROVED_NOT_APPLIED`, `APPROVED_APPLIED`, `APPROVED_BLOCKED` 상태를 산출해야 한다. 이 gate는 `sourceDataWritePerformed=false`, `productionWriteAllowed=false`, `productionDataChanged=false`를 유지하고 `visualPath`, `sectionKind`, `markerType`, `mapInteractionStatus`, trace metadata 변경을 차단해야 한다.
- Stage 01 target apply precheck는 기본 target `131`을 대상으로 하며, `--target` 지정 시 Stage 01 P0 16개 중 해당 target의 approval gate, prewrite, apply-ready, post-apply audit, operator status, manual patch plan, real approval readiness를 연결해 수동 적용 직전 상태를 검증한다. 승인 전에는 `waiting-for-operator`와 `decision=PENDING`을 유지하고, 승인 후에는 `ready-for-manual-apply`가 되려면 `targetApprovalGate.readyForPrewrite=true`, `MANUAL_PATCH_REQUIRED`, `NOT_APPLIED`, `APPROVED_NOT_APPLIED`, writable-only fragment, `visualPath` unchanged 조건이 모두 맞아야 한다. 이 precheck도 `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`를 유지해야 한다.
- Stage 01 `131` apply path status는 현재 `131`의 operator approval state, intake row, target approval gate, target apply precheck, isolated lifecycle smoke 결과를 한 리포트로 묶는다. 승인 전에는 `waiting-for-operator`, `decision=PENDING`, `editableFieldsBlank=true`, `readyForPrewrite=false`, `manualPatchRequired=false`, `lifecycleFixtureReady=true`를 유지해야 하며 source/operator input/production data를 쓰지 않는다.
- Stage 01 prewrite smoke는 pending-only, 승인 no-delta, 승인 with-delta, manual patch 적용 완료 시뮬레이션, invalid approval 차단, invalid path/label 차단, unknown section 차단, alias/marker write 차단, rejected/needs-retrace/keep-current decision row, mixed approved/decision/pending row, pixel candidate copy/paste operator note warning, `131` target approval gate missing/blocked/mismatched/ready branches, visualPath tamper, target source tamper, operator input editable field 보존을 fixture로 검증하며 production data write는 수행하지 않는다.
- Stage 01 approved dry-run은 `021` 1개 approved fixture로 `ready-for-data-patch -> ready-for-manual-apply -> not-applied -> MANUAL_PATCH_REQUIRED -> APPROVED_NOT_APPLIED` 상태 전이를 검증하며 source data write를 수행하지 않는다.
- marker transition review는 휠체어석 marker/section `3/3`, marker position/labelPoint lock `3`, selectable compatibility `3`, `markerOnlyApplied=false`를 유지한다.
- Runtime layer split은 일반 seat path 84개, accessibility marker 3개, alias-only rendered 0개를 유지한다.
- 일반 seat path layer는 `sectionKind=SEAT_SECTION` 84개만 `<path>`로 렌더링한다.
- 접근성 marker layer는 `sectionKind=ACCESSIBILITY_MARKER` 3개를 실제 polygon `<path>` hit-area로 렌더링한다.
- runtime renderer는 `imageGeometry.d` fallback을 사용하지 않는다.
- Editor v1.7 SSR 계약은 공식 이미지, `viewBox=0 0 960 640`, section overlay, marker overlay, vertex handles, labelPoint handle mode, vertex add/delete controls, dirty summary, validator PASS, JSON/TS copy preview를 렌더링한다.
- Editor v1.7 patch preview는 `mapVersion`, `sectionId`, `sectionKind`, `markerType`, `before`, `after`, `validation.status=PASS`를 포함한다.
- Editor v1.7 browser regression은 대표 section nudge/reset, vertex add/delete, vertex drag, validation FAIL export lock, labelPoint edit mode, hit-candidate filter, wheelchair marker export, alias-only export 계약을 검증한다.
- PR scope guard는 mixed worktree에서 사직 PR 포함 파일, 별도 작업 파일, 부분 staging 필요 파일을 report로 고정하며 git staging을 수행하지 않는다.
- PR scope guard report는 `stagingManifest`와 `stage01PartialReadinessGate`를 포함해야 하며 `releasePayloadFileCount=17`, `historicalReferenceFileCount=17`, `doesNotRunGitAdd=true`, `safeToRunBulkGitAdd=false`, `requiresManualHunkReview=true`, `stage01ReadinessAvailable=true`를 고정해야 한다.
- PR scope guard report는 `Untracked Included Files` 섹션을 별도로 출력해야 한다. untracked included file은 `expectedPayload=true`, `manualReviewRequired=true`, `unexpectedFile=false`, `UNTRACKED_INCLUDED_FILE:<path>` review-required reason, `manual whole-file review` staging action을 가져야 한다.
- `qa:stadium:sajik:polygon-v2`는 dataset export check, alignment audit, evidence, hitPath review, Stage 01 operator-input-aid/review-board/next-action packet/target review packet/target image-analysis smoke/all-target official image review packets/all-target image-analysis smoke/target entry template readiness smoke/target entry preflight/target entry preflight smoke/target approval gate/target approval smoke/all-target approval readiness/all-target approval readiness smoke/all-target approval input guide/all-target approval input guide smoke/operator input intake gate/intake gate smoke/prewrite/apply-ready/post-apply/operator-status/manual-patch-plan/readiness/target apply precheck/smoke/approved dry-run/applied dry-run/131 lifecycle smoke/131 apply path status/readiness summary/readiness summary smoke/completion gate/completion gate smoke/staged scope audit smoke, marker transition review, 사직 focused node tests, editor regression, scope guard, scope guard smoke, build를 한 번에 실행하는 release gate다.
- P0 `143` boundary-lock evidence에서 `143` overlay는 공식 파란 블럭 후보 경계 안에 잠기며 흰 여백/어두운 배경으로 내려가지 않는다.
- P0 seam evidence는 `132/142/143`, `123/133/143` 인접 polygon의 vertex intrusion 및 edge crossing/overlap이 없음을 고정한다.
- P0 `011` alias-only no-hit-area evidence에서 `011`은 alias-only dashed 영역으로만 기록되며 SVG hit-area와 지도 popup 대상에서 제외된다.

## 운영 규칙

- 공식 이미지 natural size는 `960x640`이어야 한다.
- 모든 운영 polygon은 `M/L/Z` 단일 폐합 path여야 한다.
- 모든 운영 polygon은 `src/utils/seatMapPolygonValidator.ts`의 공통 validator로 최소 점 개수, 좌표 범위, 면적, self-intersection, label 위치를 검증해야 한다.
- 모든 `hitPath`는 같은 section의 `visualPath` 면적 대비 75% 이상이어야 한다. 더 작은 hit-area는 `HIT_POLYGON_TOO_SMALL`로 차단한다.
- hitPath 확장 후보는 `reports/stadium/sajik-seatmap-hitpath-candidate-review.{json,md}`와 `SAJIK_HITPATH_EXPANSION_CANDIDATE_SECTION_IDS`가 일치해야 한다.
- 구역별 정밀화 workset은 `reports/stadium/sajik-seatmap-zone-precision-worksets.{json,md,svg}`를 생성해야 하며, 후보 22개와 guard 3개를 source-of-truth가 아닌 운영자 검수용으로만 기록해야 한다.
- Stage 01 operator package는 `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.{json,csv}`와 checklist를 생성해야 하며, `P0-A/P0-B/P0-C` 16개 외 section은 포함하지 않아야 한다.
- Stage 01 operator input template은 `packageVersion=SAJIK_STAGE01_OPERATOR_PACKAGE_V1`, `targetStage=Stage 01 P0`, row count `16`, section ids `021/022/031/032/121/122/123/124/125/131/132/133/134/135/142/143`, editable fields `operatorDecision/correctedPath/correctedLabelX/correctedLabelY/reviewer/reviewedAt/operatorNote`를 유지해야 한다. Template row order는 image-analysis 우선순위 `131/032/133/143/135/134/122/123/132/031/022/142/121/124/125/021`이며, image-analysis field는 매번 로컬 공식 이미지 pixel-component report에서 재생성되어야 한다.
- Stage 01 decision downstream matrix는 `PENDING -> waiting-for-operator`, valid `APPROVED -> MANUAL_PATCH_REQUIRED -> APPROVED_NOT_APPLIED/APPLIED`, invalid `APPROVED -> APPROVED_BLOCKED`, `REJECTED/NEEDS_RETRACE/KEEP_CURRENT -> no patch preview` 계약을 유지해야 한다.
- Stage 01 operator input aid는 `READY_FOR_PREWRITE`, `REJECTED`, `NEEDS_RETRACE`, `KEEP_CURRENT`, `INVALID`, `PENDING` rowStatus와 누락 필드/경고를 생성해야 하며 source data를 쓰지 않는다.
- Stage 01 review board는 `sajik-seatmap-stage01-review-board.{json,csv,md,svg}`와 `sajik-seatmap-stage01-entry-sheet.{csv,md}`를 생성해야 하며 source data를 쓰지 않는다. Review board는 `Status Counts`, `Invalid Rows First`, `Official Image Analysis`, `patchPreviewEligible`을 표시해야 한다.
- Stage 01 next-action packet은 input-aid/review-board 상태를 `imagePriorityRank` 순서의 operator queue로 정리해야 하며 `sajik-seatmap-stage01-next-action-packet.{json,csv,md}`만 생성한다. 이 packet은 좌표를 추정하지 않고, `nextOperatorSectionId=131`과 pixel candidate reference-only guardrail을 표시해야 한다.
- Stage 01 target review packet은 next-action packet과 review board를 읽어 `131` 주변 official image crop viewBox, current hitPath, labelPoint, pixel-component bbox/overlay path, official image evidence review, operator entry template, `operatorInputChecklist`를 한 곳에 묶어야 한다. 이 packet은 `sajik-seatmap-stage01-operator-input.json`을 수정하지 않는다. Checklist는 primary input source, alternate input source, `TARGET_APPROVAL_SOURCE_CONFLICT` rule, official image hash/mapVersion, source field policy, approved entry example, required approval fields, required human actions, required review assertions, forbidden coordinate sources, ready-for-prewrite criteria를 노출해야 한다.
- `npm run stadium:sajik:stage01-target-image-analysis-smoke`는 `targets/131-review-packet.json`과 `131-official-crop.png`, `131-official-overlay-crop.png`, `131-official-edge-crop.png`를 검사해야 한다. 기대 계약은 `SAJIK_STAGE01_TARGET_IMAGE_ANALYSIS_V1`, `officialImageVerified=true`, crop viewBox `615 433 140 110`, PNG 3종 `560x440`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`다.
- `npm run stadium:sajik:stage01-all-target-review-packets`는 `SAJIK_STAGE01_ALL_TARGET_REVIEW_PACKETS_V1` report로 Stage 01 P0 전체 16개 `131/032/133/143/135/134/122/123/132/031/022/142/121/124/125/021`에 대해 official image crop, overlay crop, edge crop, blank entry template을 생성해야 한다. 이 명령은 `--allow-any-stage01-target` 내부 모드로 next target 제약을 검수 범위 확장에 한해 완화하지만, source/operator input/production data를 쓰지 않는다.
- `npm run stadium:sajik:stage01-all-target-image-analysis-smoke`는 all-target report와 48개 PNG artifact를 검사하고 `targets=16/16`, `allOfficialImagesVerified=true`, `allPixelCandidatesReferenceOnly=true`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`를 유지해야 한다.
- `npm run stadium:sajik:stage01-target-entry-template-readiness-smoke`는 `targets/131-entry-template.json`이 operator 입력 준비 상태인지 검사해야 한다. 기대 계약은 `SAJIK_STAGE01_TARGET_ENTRY_TEMPLATE_READINESS_SMOKE_V1`, `operatorDecision=PENDING`, editable approval fields blank, `approvedRequiredFields=7`, `officialPngReviewRequired=true`, image-analysis artifact version `SAJIK_STAGE01_TARGET_IMAGE_ANALYSIS_V1`, crop viewBox `615 433 140 110`, PNG 3종 `560x440`, locked source fields direct input 없음, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`다.
- Stage 01 target entry preflight는 기본 `targets/131-entry-template.json`과 `sajik-seatmap-stage01-operator-input.json`의 `131` 입력을 approval gate 전에 read-only로 검증하며, `--target` 지정 시 Stage 01 P0 target별 `targets/<sectionId>-entry-template.json`과 operator input row를 같은 계약으로 검증해야 한다. Partial correctedPath/label input, source conflict, evidence hash/mapVersion drift, locked fields, invalid `reviewedAt`, malformed correctedPath, pixel-candidate-copy note warning을 확인하되 source/operator input/production data는 쓰지 않는다. Smoke는 12개 isolated fixture를 통과해야 한다.
- Stage 01 target approval gate는 기본 `131` read-only 검증으로 `targets/131-entry-preflight.json`을 필수 입력으로 읽고, `--target` 지정 시 Stage 01 P0 target별 `targets/<sectionId>-entry-preflight.json`을 읽어 `sajik-seatmap-stage01-operator-input.json` 또는 `targets/<sectionId>-entry-template.json`의 operator-provided 좌표만 승인 후보로 삼아야 한다. 두 입력 소스가 서로 다른 값을 갖는 경우 `TARGET_APPROVAL_SOURCE_CONFLICT`로 차단하고, preflight가 fresh `ready-for-approval-gate`이며 selected source/decision이 일치하는 valid `APPROVED`만 `ready-for-prewrite`가 될 수 있다. 이 gate는 `targets/<sectionId>-approval-gate.{json,md}`만 생성하며 source/operator input을 수정하지 않는다. Report는 `preflightContract`, `sourceComparison`, per-source `approvalFingerprint`, `exactMatchRequiredWhenMultipleSourcesHaveEditableValues`, `sourceFingerprintFields`, `reviewEvidenceContract`, `imageCoordinateValidation`, `prewriteContract`, `targetSourceFile=src/data/sajikSeatData.ts`, `writableSourceFields`, `lockedSourceFields`, `manualPatchAllowedOnlyAfter=MANUAL_PATCH_REQUIRED`를 포함해야 한다.
- Stage 01 target approval gate smoke는 pending, valid approved, missing correctedPath, placeholder reviewer/timestamp, label outside, self-intersection, source conflict, pixel candidate copy note, rejected/needs-retrace/keep-current no-patch-preview, target review write flag drift, target review evidence contract drift, missing/stale target entry preflight, preflight target mismatch, preflight write-flag drift, production write drift, approved input without valid preflight fixture를 검증하고 `cases=20/20`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`를 유지해야 한다. `approved-valid-131` fixture는 isolated 16-row Stage 01 input으로 prewrite까지 연결해 `ready-for-data-patch`, `patchPreviewRows=1`, `visualPathLocked=true`, `patchAllowedFieldsOnly=true`, `targetSourceFile=src/data/sajikSeatData.ts`, writable source fields `imageGeometry.hitPath/imageGeometry.labelPoint/imageGeometry.labelX/imageGeometry.labelY`, `productionDataChanged=false`를 확인해야 한다. `keep-current-no-patch-preview` fixture는 prewrite까지 연결해 `waiting-for-operator`, `patchPreviewRows=0`, `productionDataChanged=false`를 확인해야 한다.
- Stage 01 all-target approval readiness는 Stage 01 P0 전체 16개 `131/032/133/143/135/134/122/123/132/031/022/142/121/124/125/021`에 대해 target entry preflight와 target approval gate를 `--target <sectionId> --allow-any-stage01-target`로 read-only 실행해 `sajik-seatmap-stage01-all-target-approval-readiness.{json,csv,md}`로 집계해야 한다. Report는 `targets=16/16`, `readyForApprovalGateCount`, `readyForPrewriteCount`, `officialPngOnly=true`, `operatorApprovedCoordinatesRequired=true`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`를 유지해야 하며, smoke는 all-target row의 blocker와 `allowAnyStage01Target` 계약을 검증해야 한다.
- Stage 01 all-target approval input guide는 all-target review packets, operator input, all-target approval readiness를 합쳐 `sajik-seatmap-stage01-all-target-approval-input-guide.{json,csv,md}`를 생성해야 한다. 각 row는 entry template, official/overlay/edge crop, required approval fields, next operator action, risk metadata, blocker를 보여주고 `operatorDecision=APPROVED` 좌표가 들어오기 전에는 `pending=16`, `approved=0`, `readyForApprovalGate=0`, `readyForPrewrite=0`을 유지해야 한다. 이 guide와 smoke는 operator input이나 production source를 쓰지 않고 `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`를 고정한다.
- Stage 01 operator input intake gate는 operator input과 per-target entry template을 읽어 `APPROVED` row만 geometry 검증 후 `READY_FOR_PREWRITE` 후보로 분류하고, 좌표가 없는 기본 상태는 `waiting-for-operator`로 통과시켜야 한다. Report는 `sajik-seatmap-stage01-operator-input-intake-gate.{json,csv,md}`를 쓰며 `approvedRowCount`, `readyForPrewriteRows`, `waitingForOperatorRows`, `blockedRows`, `sourceComparison`, `writableSourceFields`, `lockedSourceFields`, `operatorApprovedCoordinatesRequired=true`, `keepCurrentReviewRequiredFields`, `keepCurrentForbiddenFields`를 포함해야 한다. Smoke는 기본 pending 16개, isolated `approved-valid=ready-for-prewrite`, placeholder-blocked approval/keep-current fixtures, isolated `keep-current-valid=waiting-for-operator`, isolated `approved-invalid=blocked` self-intersection fixture를 검증하고 operator input/source data를 수정하지 않아야 한다.
- Stage 01 prewrite gate는 `operatorDecision=APPROVED` row만 patch preview 대상으로 삼고, alias-only/marker row, invalid path, label outside, self-intersection, top-hit 회귀를 차단해야 한다. Section `131` 승인 row는 matching ready `targets/131-approval-gate.json` 없이는 patch preview에 들어갈 수 없으며 missing/blocked/mismatched gate는 `APPROVED_ROW_INVALID:131`로 차단한다. Patch preview review는 before/after hitPath point count, area, bounds, labelPoint delta와 `visualPathLocked=true` 여부를 보여줘야 한다. Prewrite는 `sourcePatchContract`와 `sourcePatchContractRows`를 생성하고, `patchAllowedFieldsOnly=true`, `changedSourceFields`, `unexpectedChangedSourceFields`, `writableSourceFields`, `lockedSourceFields`를 검증해야 한다. Locked field 변경은 `PATCH_PREVIEW_WRITES_LOCKED_FIELD`로 차단한다.
- Stage 01 apply-ready gate는 prewrite가 `ready-for-data-patch`일 때만 `ready-for-manual-apply`가 될 수 있고, 모든 patch payload가 `SEAT_SECTION`, validation `PASS`, `visualPath` locked, current dataset before snapshot 일치 조건을 통과해야 한다.
- Stage 01 apply-ready report는 `pointCountBefore/After`, `areaBefore/After`, `boundsBefore/After`, `labelPointDelta`를 포함하는 diff summary를 생성해야 한다.
- Stage 01 post-apply audit는 `hitPath`, `labelPoint`, legacy `labelX/labelY`, `visualPath` lock, `sectionKind`, `markerType`, `mapInteractionStatus`를 read-only로 비교해야 한다.
- Stage 01 operator status board는 `APPROVED` row가 valid지만 production data에 아직 반영되지 않았을 때 summary `ready-for-manual-apply`와 rowStatus `NOT_APPLIED`를 보고해야 한다.
- Stage 01 manual patch plan은 `Source Edit Contract`, `sourceEditChecklist`, `writableSourceFields`, `lockedSourceFields`, `writableTsFragment`를 포함해야 하며 Stage 01에서 수정 가능한 source field를 명확히 제한해야 한다. `writableTsFragment`는 locked `visualPath`와 metadata fields를 의도적으로 제외하고, 전체 context preview는 검토용으로만 제공해야 한다.
- Stage 01 manual source patch procedure는 `beforeFingerprint` baseline 확인 후 `imageGeometry.hitPath`, `imageGeometry.labelPoint`, `imageGeometry.labelX`, `imageGeometry.labelY`만 수정하고, `visualPath`, `geometryVersion`, `sectionKind`, `markerType`, `mapInteractionStatus`, trace metadata 변경을 차단해야 한다.
- `131` 승인 후 수동 patch 명령 순서는 `stage01-target-entry-preflight -> stage01-target-approval-gate -> stage01-operator-input-aid -> stage01-prewrite -> stage01-apply-ready -> stage01-manual-patch-plan`이며, manual patch plan이 `MANUAL_PATCH_REQUIRED`를 보고하기 전에는 `src/data/sajikSeatData.ts`를 수정하지 않는다.
- Stage 01 real approval readiness는 실제 승인 row를 기준으로 manual patch readiness를 검증해야 하며, source write 금지와 locked field 보존 계약을 위반하면 release gate를 실패시켜야 한다.
- Stage 01 prewrite smoke는 `pending-only`, `approved-no-delta`, `approved-with-delta`, `partial-hitpath-only-applied`, `partial-label-only-applied`, `legacy-label-drift`, `stale-before-snapshot`, `locked-field-mutated`, `approved-large-area-row`, `approved-excessive-point-count-row`, `approved-label-near-boundary-row`, `approved-pixel-candidate-copy-note-row`, `approved-131-without-approval-gate`, `approved-131-with-blocked-approval-gate`, `approved-131-with-mismatched-approval-gate`, `approved-131-with-ready-approval-gate`, `invalid-approved-row`, `invalid-path-row`, `invalid-label-row`, `unknown-section-row`, `forbidden-alias-marker-row`, `decision-rows`, `mixed-approved-decision-pending`, `tampered-visual-path-readiness`, `tampered-target-source-readiness`, `approved-applied-after-manual-patch`, `operator-input-preservation` fixture를 모두 통과해야 하며, `productionDataChanged=false`를 유지해야 한다.
- Stage 01 approved dry-run은 `sourceDataWritePerformed=false`, `productionWriteAllowed=false`, `productionDataChanged=false`, `manualPatchRows=1`, `readinessRow=APPROVED_NOT_APPLIED`를 유지해야 한다.
- Stage 01 applied dry-run은 `sourceDataWritePerformed=false`, `productionWriteAllowed=false`, `productionDataChanged=false`, `manualPatchRows=0`, `operatorStatusRow=APPLIED`, `readinessRow=APPROVED_APPLIED`를 유지해야 한다.
- Stage 01 `131` lifecycle smoke는 target entry preflight부터 real approval readiness까지 isolated approved `131` fixture를 흘려보내야 한다. 기대 상태는 `targetEntryPreflight=ready-for-approval-gate`, `targetApprovalGate=ready-for-prewrite`, `prewrite=ready-for-data-patch`, `applyReady=ready-for-manual-apply`, `postApply=not-applied`, `operatorStatusRow=NOT_APPLIED`, `manualPatchAction=MANUAL_PATCH_REQUIRED`, `readinessRow=APPROVED_NOT_APPLIED`, `sourceDataWritePerformed=false`, `productionWriteAllowed=false`, `productionDataChanged=false`다. 이 smoke는 `writableTsFragment`가 `hitPath`, `labelPoint`, `labelX`, `labelY`만 포함하고 locked `visualPath`, `geometryVersion`, `sectionKind`, `markerType`, `mapInteractionStatus`, trace metadata token을 포함하지 않는지 검증해야 한다.
- Stage 01 readiness summary는 operator package, operator input, review board, real approval readiness, prewrite smoke, approved dry-run, applied dry-run, target entry preflight, target entry preflight smoke, target approval gate 산출물이 최근 생성됐고 `operatorInputRows=16`, `operatorInputApproved=0`, `packageImageHighRisk=8`, `reviewBoardImageHighRisk=8`, `packageImagePriority=131>032>133>143>135>134>122>123>132>031>022>142>121>124>125>021`, `reviewBoardImagePriority=131>032>133>143>135>134>122>123>132>031>022>142>121>124>125>021`, `packageReviewBoardImagePriorityMatched=true`, `waiting-for-operator`, `passed`, `APPROVED_NOT_APPLIED`, `APPROVED_APPLIED`, `targetEntryPreflight=waiting-for-operator:PENDING`, `targetEntryPreflightReady=false`, `targetEntryPreflightSmoke=passed:12/12`, `targetApprovalGate=waiting-for-operator:PENDING`, `targetApprovalReady=false`, `sourceDataWritePerformed=false` 계약을 유지하는지 검증해야 한다. Operator package image analysis는 `imageAnalysisMetadataRegenerated=true`, `imageCandidateReferenceOnly=true`, risk rows `8/4/4`, `source=reports/stadium/sajik-seatmap-pixel-components.json`을 유지해야 한다. Review board image analysis는 `candidateReferenceOnly=true`, `officialPngOnly=true`, `stage01RowsWithPixelCandidate=16`, risk rows `8/4/4`, `source=reports/stadium/sajik-seatmap-pixel-components.json`을 유지해야 한다.
- Stage 01 readiness summary smoke는 valid/missing/review-board-missing/stale/readiness drift/review-board image drift/package image drift/package-review-board mismatch/target entry preflight drift/target approval gate drift/source write drift/operator input drift fixture를 검증하고 `REPORT_MISSING`, `REPORT_NOT_FRESH`, `APPROVED_DRY_RUN_READINESS_ROW_CHANGED`, `APPLIED_DRY_RUN_READINESS_ROW_CHANGED`, `REVIEW_BOARD_IMAGE_PRIORITY_CHANGED`, `REVIEW_BOARD_IMAGE_RISK_COUNTS_CHANGED`, `REVIEW_BOARD_IMAGE_REFERENCE_ONLY_DISABLED`, `REVIEW_BOARD_PIXEL_COMPONENT_SOURCE_CHANGED`, `OPERATOR_PACKAGE_IMAGE_PRIORITY_CHANGED`, `OPERATOR_PACKAGE_IMAGE_RISK_COUNTS_CHANGED`, `OPERATOR_PACKAGE_IMAGE_REFERENCE_ONLY_DISABLED`, `OPERATOR_PACKAGE_PIXEL_COMPONENT_SOURCE_CHANGED`, `OPERATOR_INPUT_IMAGE_PRIORITY_CHANGED`, `OPERATOR_INPUT_FIRST_IMAGE_PRIORITY_ROW_CHANGED`, `PACKAGE_REVIEW_BOARD_IMAGE_PRIORITY_MISMATCH`, `PACKAGE_REVIEW_BOARD_IMAGE_RISK_COUNTS_MISMATCH`, `PACKAGE_OPERATOR_INPUT_IMAGE_PRIORITY_MISMATCH`, `TARGET_ENTRY_PREFLIGHT_SOURCE_DATA_WRITE_PERFORMED`, `TARGET_ENTRY_PREFLIGHT_STATUS_CHANGED`, `TARGET_ENTRY_PREFLIGHT_SECTION_CHANGED`, `TARGET_ENTRY_PREFLIGHT_SMOKE_STATUS_CHANGED`, `TARGET_ENTRY_PREFLIGHT_SMOKE_CASE_COUNT_CHANGED`, `TARGET_APPROVAL_GATE_SOURCE_DATA_WRITE_PERFORMED`, `TARGET_APPROVAL_GATE_STATUS_CHANGED`, `SOURCE_DATA_WRITE_PERFORMED`, `OPERATOR_INPUT_ROW_COUNT_CHANGED` 회귀를 차단해야 한다.
- `qa:stadium:sajik:stage01-readiness`는 부분 작업 트리에서 Stage 01 승인 readiness, smoke, approved/applied dry-run, `131` lifecycle smoke, `131` apply path status, 사직 focused static contract, review board, next-action packet, target review packet, target image-analysis smoke, all-target official image review packets, all-target image-analysis smoke, target entry template readiness smoke, target entry preflight, target entry preflight smoke, target approval gate, target approval smoke, all-target approval readiness, all-target approval readiness smoke, all-target approval input guide, all-target approval input guide smoke, operator input intake gate, intake gate smoke, readiness summary, readiness summary smoke, completion gate, completion gate smoke, staged scope audit smoke를 묶어 검증하는 전용 게이트다. 이 게이트는 `pr-scope-guard`, editor regression, build를 실행하지 않으며 전체 release gate인 `qa:stadium:sajik:polygon-v2`를 대체하지 않는다.
- PR scope guard report는 `executionMode`, `commandExitCode`, `commandExitSummary`, `fullReleaseStatus`, `stage01PartialScopeStatus`, `stage01PartialStagingVerdict`, `stage01PartialScopeGate`, `includedInventory.missingExpectedIncludedFileDetails`, `historicalReferenceFileDetails`, `partialVerificationAfterStaging`, `fullReleaseVerificationAfterStaging`, markdown `## Stage 01 Partial Scope Status`, `## Missing Expected Included Files`, `## Historical Reference Files`, `### Partial Verification After Staging`, `### Full Release Verification After Staging` 섹션을 유지해야 한다. Clean historical/operator-reference evidence는 `historicalReferenceFiles`로 추적하고 `productionSource=false`여야 한다.
- Stage 01 handoff 문서는 approval input contract, manual patch checklist, Stage 02 entry conditions를 고정해야 한다.
- 좌표는 공식 이미지 좌표계 기준이며, 새 좌표는 소수 1자리 px 정밀도 안에서 관리한다.
- `visualPath`는 공식 이미지 경계 기준 polygon, `hitPath`는 클릭/터치 hit-area polygon이다. 현재 사직 v2+ 기준에서는 승인된 별도 확장 hit-area가 없으므로 모든 `hitPath`가 `visualPath`와 동일해야 한다.
- `labelPoint`는 기존 `labelX/labelY`와 같은 좌표를 유지해야 한다.
- 휠체어석 3개 항목은 기존 선택 동작을 유지하되 `markerType=WHEELCHAIR`, `sectionKind=ACCESSIBILITY_MARKER` 메타데이터를 가져야 한다.
- 일반 seat path layer는 `sectionKind=SEAT_SECTION` 84개만 `<path>`로 렌더링한다.
- 접근성 marker layer는 `sectionKind=ACCESSIBILITY_MARKER` 3개를 실제 polygon `<path>` hit-area로 렌더링하고 click/Enter/Space 선택은 기존 상세 패널 흐름을 유지한다.
- runtime renderer는 `imageGeometry.d` fallback을 사용하지 않는다.
- `011/903`은 `sectionKind=ALIAS_ONLY`이며 SVG hit-area로 렌더링하지 않는다.
- `buildSajikSeatMapDataset()`의 `sections`는 89개 block/alias를 모두 포함하고, `enabled=false`인 alias-only section은 `011/903` 두 개뿐이어야 한다.
- `buildSajikSeatMapDataset()`의 `markers`는 현재 `markerType=WHEELCHAIR` 3개를 `relatedSectionId`로 연결해야 하며, production UI marker-only 렌더링은 후속 PR에서 분리한다.
- marker transition review는 `reports/stadium/sajik-seatmap-marker-transition-review.{json,md}`를 생성해야 하며, marker `position`은 관련 section의 `labelPoint`와 같아야 한다.
- Editor v1.7은 파일 쓰기를 하지 않는 내부 도구로 유지한다. TS patch write, production 사용자 route 노출은 후속 PR 범위다.
- Editor v1.8 구현은 이번 release lock에 포함하지 않는다. before/after diff preview 강화, validator issue 상세 panel, hitPath batch navigation, marker transition view는 후속 PR 범위다.
- Editor v1.7 patch payload는 선택 section의 `visualPath`, `hitPath`, `labelPoint`, polygon points를 `before`/`after`에 모두 담는다. 사용자 조작 전에는 두 값이 같아야 하며, vertex/labelPoint drag, nudge, add/delete 이후에는 `after`만 draft geometry로 달라져야 한다.
- Editor v1.7 vertex delete는 3점 미만 polygon을 만들 수 없어야 하며, visualPath topology edit은 sync 설정이 켜져 있고 visual/hit point count가 같을 때 hitPath에도 반영된다.
- Editor v1.7 copy/export는 validation PASS 상태에서만 가능해야 하고, FAIL 상태에서는 export lock을 표시해야 한다.
- PR scope guard는 `doesNotRunGitAdd=true`, `safeToRunBulkGitAdd=false` 상태를 유지해야 하며, `package.json`, `scripts/stadium-seatmap-ops.mjs`, `src/components/StadiumGuideRuntimeSeatMaps.test.ts`, `scripts/stadium-ux-audit.mjs`를 부분 staging review 대상으로 표시해야 한다.
- PR scope guard의 `stagingManifest`는 whole-file review 대상, partial hunk review 대상, excluded artifacts, forbidden staging commands, `stage01PartialStagingVerdict=ready-for-partial-stage01-staging`, partial staging 후 verification commands, full release staging 후 verification commands를 Markdown/JSON report에 함께 기록해야 한다.
- PR scope guard의 `stage01PartialReadinessGate`는 `npm run qa:stadium:sajik:stage01-readiness`가 `pr-scope-guard`, editor regression, build를 실행하지 않는 부분 작업 트리용 사전 검증이며, `qa:stadium:sajik:polygon-v2` 전체 release gate를 대체하지 않는다고 기록해야 한다.
- PR scope guard의 `stage01PartialScopeGate`는 `npm run stadium:sajik:stage01-pr-scope-guard`가 `--stage01-partial` mode로 실행될 때 `fullReleaseStatus=passed`와 `stage01PartialScopeStatus=passed`를 동시에 표현할 수 있어야 한다. Partial scope pass 조건은 `unexpectedFileCount=0`, `extraIncludedFileCount=0`, `missingExpectedFileCount=0`, `absentFromWorktreeCount=0`, `stage01ReadinessAvailable=true`, `safeToRunBulkGitAdd=false`다.
- PR scope guard smoke는 scope guard exit code `0/1`을 모두 구조 검증 대상으로 허용하되, `executionMode`, `commandExitCode`, `commandExitSummary`, `stage01PartialStagingVerdict`, `stage01PartialReadinessGate`, `stage01PartialScopeGate`, `stage01PartialScopeStatus`, `partialVerificationAfterStaging`, `fullReleaseVerificationAfterStaging`, `stage01ReadinessAvailable=true`, `releasePayloadFileCount=17`, `historicalReferenceFileCount=17`, `safeToRunBulkGitAdd=false`가 빠지면 실패해야 한다. `stage01PartialScopeStatus=passed`이면 `--stage01-partial` guard exit code는 `0`이어야 한다. Smoke report는 `reports/stadium/sajik-seatmap-pr-scope-guard-smoke.{json,md}`에 `fullReleaseRun`과 `partialRun` snapshot을 따로 기록해야 한다.
- Stage 01 staged scope audit report는 blocked staged index에서 `stagingRemediation`을 포함해야 하며, `stagedFilesToKeep`, `stagedFilesToUnstage`, `stagedFilesToUnstageWithReasons`, `stagedManualHunkReviewFiles`, `missingTargetFilesForCompleteMode`, `nextActions`, `doesNotRunGitCommands=true`, `actionMode=operator-manual-index-cleanup`을 유지해야 한다. `stagedFilesToUnstageWithReasons`는 `OUTSIDE_STAGE01_TARGET`, `SEPARATE_DIRTY_WORK`, `UNEXPECTED_DIRTY_FILE`, `DELETED_STAGE01_TARGET` cleanup reason을 보존해야 한다.
- PR scope guard는 공통 seatmap shell migration, 비사직 구장 UI, home/game card UI, prediction, Mate, shared navigation/style, local assistant config, `src/components/sajik/SajikSeatMap.tsx` first-visit/runtime UX 변경을 사직 polygon v2 release-lock PR 외부 작업으로 분류해야 한다.
- PR scope guard는 `.gitignore` 변경을 공유 repo config 작업으로 분류하고 사직 polygon v2 release-lock PR 외부에 둬야 한다.
- PR scope guard는 `.env.production`과 비사직 `reports/*` 변경을 환경/재생성 산출물로 분류하고 사직 polygon v2 release-lock PR 외부에 둬야 한다.
- 검색 입력은 첫 번째 matching section을 선택해야 하며, section 리스트는 `enabled`, `alias-only`, `wheelchair` 상태를 표시해야 한다.
- self-intersection은 허용하지 않는다.
- `labelX/labelY`는 자기 polygon 내부 또는 경계 1px 이내에 있어야 한다.
- `MAP_SELECTABLE` 블럭의 label 좌표 클릭은 렌더 순서상 자기 block을 최상위 hit-area로 가져야 한다.
- `132/142/143`, `123/133/143` 주변 polygon은 서로 vertex intrusion, edge crossing, edge overlap을 만들면 안 된다.
- `OFFICIAL_PNG_BLOCK_NOT_VISIBLE` 예외 블럭은 클릭 정합 release gate와 SVG hit-area 렌더링에서 제외하되, 운영 호환 alias는 유지해야 한다.
- 1루 얇은 블럭군 `121/122/123/124/125/131/132/133/134/135/142/143`은 일반 inside/coverage 기준에 더해 dilated component outside leakage와 max outside distance 기준을 통과해야 한다.
- UI 렌더링, hover, click, zoom/pan은 기존 `SajikSeatMapSvg` 선택 동작을 유지하되, 일반 좌석 path layer와 accessibility marker layer를 분리한다.
- 백엔드 API 계약은 변경하지 않는다.
- 블록 id, category, search alias, 접근성 휠체어석 3개 항목은 유지한다.
- 외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사는 사용하지 않는다.
- 공식 asset이 바뀌었거나 승인된 기준 파일이 없으면 `MANUAL_BASEBALL_DATA_REQUIRED` 계약으로 전환하고 operator 제공 파일을 요청한다.
- 좌표 변경이 발생하면 trace manifest, evidence contact sheet, isolated browser QA를 다시 생성한다.

## 릴리즈 게이트

```bash
npm run stadium:sajik:alignment-audit
npm run stadium:sajik:evidence
node scripts/stadium-seatmap-ops.mjs sajik dataset-export --check
npm run stadium:sajik:hitpath-review
npm run stadium:sajik:zone-precision-worksets
npm run stadium:sajik:stage01-operator-input-aid
npm run stadium:sajik:stage01-review-board
npm run stadium:sajik:stage01-next-action-packet
npm run stadium:sajik:stage01-prewrite
npm run stadium:sajik:stage01-apply-ready
npm run stadium:sajik:stage01-post-apply-audit
npm run stadium:sajik:stage01-operator-status
npm run stadium:sajik:stage01-manual-patch-plan
npm run stadium:sajik:stage01-real-approval-readiness
npm run stadium:sajik:stage01-prewrite-smoke
npm run stadium:sajik:stage01-approved-dry-run
npm run stadium:sajik:stage01-applied-dry-run
npm run stadium:sajik:stage01-target-review-packet
npm run stadium:sajik:stage01-target-entry-preflight
npm run stadium:sajik:stage01-target-entry-preflight-smoke
npm run stadium:sajik:stage01-target-approval-gate
npm run stadium:sajik:stage01-target-approval-gate-smoke
npm run stadium:sajik:stage01-all-target-approval-readiness
npm run stadium:sajik:stage01-all-target-approval-readiness-smoke
npm run stadium:sajik:stage01-all-target-approval-input-guide
npm run stadium:sajik:stage01-all-target-approval-input-guide-smoke
npm run stadium:sajik:stage01-operator-input-intake-gate
npm run stadium:sajik:stage01-operator-input-intake-gate-smoke
npm run stadium:sajik:stage01-131-apply-path-status
npm run stadium:sajik:stage01-readiness-summary
npm run stadium:sajik:stage01-readiness-summary-smoke
npm run stadium:sajik:stage01-completion-gate
npm run stadium:sajik:stage01-completion-gate-smoke
npm run stadium:sajik:stage01-staged-scope-audit-smoke
npm run qa:stadium:sajik:stage01-readiness
node scripts/stadium-seatmap-ops.mjs sajik marker-transition-review
node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts
node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts
npm run qa:stadium:sajik:trace-review
node scripts/stadium-seatmap-ops.mjs sajik editor-regression
node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard
npm run stadium:sajik:stage01-pr-scope-guard
node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard-smoke
npm run qa:stadium:sajik:polygon-v2
npm run build
```

릴리즈 차단 조건:

- `SAJIK_BLOCKS.length`가 `89`가 아니다.
- `SAJIK_SEATMAP_IMAGE.mapVersion`, `viewBox`, `imageSha256` 중 하나라도 release lock 기준과 다르다.
- `p0Blocks=39`, `p1Blocks=16`, `p2Blocks=34`가 유지되지 않는다.
- `officialImageTraced`, `directOfficialTrace`, `officialPngManualPolygon`, `manualPolygonV2`, `manualReviewed` 중 하나라도 `89`가 아니다.
- `visualPath`, `hitPath`, `labelPoint`, `geometryVersion` 표준 필드가 누락되거나 기존 `imageGeometry.d`, `labelX/labelY`, `manual-polygon-v2`와 불일치한다.
- `pixelAligned=87`, `manualReviewRequired=2`, `mapSelectable=87`, `aliasOnlyOfficialPngBlockNotVisible=2`, `officialPngBlockNotVisible=2`, `alignmentLockedVerified=87`, `alignmentFailures=0`, `thinOutsideFailures=0`이 유지되지 않는다.
- 일반 seat path layer가 `sectionKind=SEAT_SECTION` 84개 외 항목을 `<path>`로 렌더링한다.
- accessibility marker layer가 `sectionKind=ACCESSIBILITY_MARKER` 3개를 marker로 렌더링하지 않는다.
- alias-only rendered count가 `0`이 아니다.
- runtime renderer가 `imageGeometry.d`를 `visualPath` 또는 `hitPath` fallback으로 사용한다.
- `SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS` 또는 `SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS`가 `011`, `903` 외 블럭을 포함한다.
- `SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS`가 `011`, `903` 외 블럭을 포함하거나, `011/903`이 SVG hit-area로 렌더링된다.
- `ACCESSIBLE` 블럭의 `markerType=WHEELCHAIR` 또는 `sectionKind=ACCESSIBILITY_MARKER` 메타데이터가 누락된다.
- JSON dataset export의 section/marker summary가 `89/87/2/3`에서 벗어나거나 marker `relatedSectionId`가 끊어진다.
- hitPath candidate review summary가 `22/16/5/1`, `aliasOnly=2`, `visualEqualsHit=21`, `expanded=1`, `approvedHitPathExpansionSectionIds=032`, `blockers=0`에서 벗어난다.
- marker transition review summary가 `markers=3`, `sections=3`, `positionLocks=3`, `selectableCompat=3`, `markerOnlyApplied=false`, `blockers=0`에서 벗어난다.
- `/internal/sajik-seatmap-editor`가 `import.meta.env.DEV` gate 없이 production route나 navigation에 노출된다.
- editor patch preview에서 사용자 조작 전 `after`가 `before`와 달라지거나, vertex draft 후 `validation.status`가 `PASS`가 아니다.
- editor validation FAIL 상태에서 JSON/TS copy/export가 가능하다.
- editor regression이 vertex add/delete, vertex drag, validation FAIL export lock을 검증하지 않는다.
- editor v1.8 구현 파일이 이번 사직 polygon v2 release-lock PR에 섞인다.
- PR scope guard가 git staging을 직접 수행하거나 부분 staging review 대상 파일을 숨긴다.
- PR scope guard report 또는 smoke에서 `stagingManifest`, `stage01PartialReadinessGate`, `stage01ReadinessAvailable=true`, `releasePayloadFileCount=17`, `historicalReferenceFileCount=17`, `safeToRunBulkGitAdd=false`, forbidden staging commands 중 하나가 누락된다.
- `HIT_POLYGON_TOO_SMALL` issue가 발생한다.
- `needsOperatorReview`, `unreviewedBlocks` 중 하나라도 `0`이 아니다.
- `refinedPolygons=83`이 유지되지 않는다.
- `SAJIK_OFFICIAL_TRACE_REFERENCE`의 `expectedPointCount` 또는 `expectedArea`가 현재 path와 다르다.
- 단일 폐합 path가 아니거나 self-intersection이 있다.
- `MAP_SELECTABLE` 블럭의 label 좌표가 자기 polygon 밖으로 벗어나거나, 다른 나중 렌더링 polygon에 가로채인다.
- `011`, `903` 외 블럭이 `OFFICIAL_PNG_BLOCK_NOT_VISIBLE` 또는 `MANUAL_REVIEW_REQUIRED`로 내려간다.
- 1루 얇은 블럭군에서 `THIN_COMPONENT_LEAKAGE_OUTSIDE_DILATED_PATH` 또는 `THIN_COMPONENT_MAX_DISTANCE_OUTSIDE_PATH`가 발생한다.
- `311/321`, `112/121`, `132/142`, `914/922` 중 하나라도 label top-hit 회귀가 발생한다.
- 모바일 390에서 `723` path 중심 클릭이 zoom control 배경에 가로채인다.
- 브라우저 QA에서 모바일 390 또는 데스크톱 1440 overflow가 발생한다.
