# 사직 좌석도 v2 PR 패키징 인벤토리

작성일: 2026-05-12 KST
v2+ 갱신일: 2026-05-14 KST
canonical cleanup 갱신일: 2026-05-28 KST

주의: 이 문서의 Stage 01/operator-reference command transcript는 historical archive다. 현재 working tree에서는 `stage01-*`, `operator-reference-*`, `hitpath-review`, `zone-precision-worksets`, `polygon-v2`, `trace-review` public alias와 관련 historical scripts를 제거했으며, 재실행은 Git history에서 해당 시점 파일을 복구한 별도 branch에서만 다룬다.

## 목적

사직구장 폴리곤 v2 정밀화와 픽셀 정합 검증을 PR 가능한 단위로 분리하기 위한 변경 범위 인벤토리다.
현재 워크트리에는 여러 구장 작업, 공통 seatmap shell, 예측/SEO/build 변경이 함께 섞여 있으므로 그대로 한 PR에 올리면 리뷰 범위가 과도해진다.

## 현재 사직 기준

- 공식 asset: `src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.webp`
- 좌표계: `960x640`
- stadium id: `BUSAN_SAJIK`
- map version: `BUSAN_SAJIK_2026_MANUAL_POLYGON_V2`
- SVG viewBox: `0 0 960 640`
- 공식 이미지 SHA-256: `e9cb51ccf57a754ddf066a95c6c789d65edf8dff167f432fd35fe809e9dc80aa`
- trace source: `OFFICIAL_PNG_MANUAL_POLYGON`
- trace version: `manual-polygon-v2`
- alignment result: `87 LOCKED_VERIFIED`, `2 OFFICIAL_PNG_BLOCK_NOT_VISIBLE`, `0 RETRACE_REQUIRED`, `0 officialFailures`, `0 thinOutsideFailures`
- 공식 PNG 미표시 예외: `011`, `903`
- 표준 geometry 필드: 기존 `imageGeometry.d`, `labelX`, `labelY` 호환은 유지하고 `visualPath`, `hitPath`, `labelPoint`, `geometryVersion`을 추가한다.
- hit-area 확장 후보: 홈플레이트/얇은 1루 블럭 중심의 `SAJIK_HITPATH_EXPANSION_CANDIDATE_SECTION_IDS`를 dataset에 표시한다. 현재 기준에서는 `032`만 공식 PNG/근접 터치 분석 기반의 승인된 별도 `hitPath`를 가지며, 나머지 후보는 `hitPath === visualPath`를 유지한다.
- runtime layer: 일반 seat path 84개, accessibility marker 3개, alias-only rendered 0개를 고정한다.
- 휠체어석 3개는 기존 selectable block 상세/검색 호환성을 유지하되 일반 seat path layer가 아니라 accessibility marker layer에서 렌더링한다.
- 브라우저 label-coordinate QA는 `84 seat paths + 3 accessibility markers = 87` target 렌더링과 클릭 정합을 검증하고, `011/903`은 alias-only 데이터로만 유지한다.
- 외부 야구 데이터 수집, 웹 검색, 크롤링 기반 좌표 보정은 사용하지 않는다.

## 2026-05-17 green handoff

현재 seatmap 회귀는 green 상태다.

- 사직 단위 테스트: `node --import tsx --test src/data/sajikSeatData.test.ts` 통과, `21/21`
- 전체 seatmap 회귀: `npm run test:stadium:seatmaps` 통과, `262/262`
- 수원 release lock: `npm run qa:stadium:suwon:release-lock` 통과
- diff whitespace check: `git diff --check` 통과
- build 재확인이 필요한 환경에서는 `env VITE_SITE_URL=https://example.com VITE_API_BASE_URL=https://api.example.com npm run build`를 사용한다.

PR 범위 분리:

- 수원 targeted polygon patch: `src/data/suwonSeatData.ts`, `src/data/suwonSeatData.test.ts`, `scripts/suwon-seatmap-ops.mjs`, `docs/suwon-seatmap-release-lock.md`
- 사직 회귀 closeout: `src/data/sajikSeatData.ts`, `src/data/sajikSeatData.test.ts`, `docs/sajik-seatmap-release-lock.md`
- 사직 Stage 01 packaging/handoff: historical archive로만 보존한다. 관련 `scripts/sajik-seatmap-stage01-*.mjs`와 public alias는 현재 working tree에서 제거되었고 Git history 복구 대상이다.
- 별도 workstream: 광주/대구 구장 작업, 공통 UI/홈/랭킹/토스트/예측/Mate/navigation/style 변경, `reports/*`, `dist/*`, `output/playwright/*`

현재 worktree는 여러 workstream이 섞인 상태이므로 bulk staging을 금지한다. PR을 만들 때는 위 범위별로 hunk staging하고, 수원과 사직을 같은 PR에 묶는 경우에도 설명에서 수원 targeted patch와 사직 alias-only 계약 복구를 별도 섹션으로 분리한다.

## 2026-05-25 canonical single-source packaging

이번 canonical 통합은 사용자 runtime에서 공식 PNG/operator-reference source 경쟁을 제거하고 `SAJIK_CANONICAL_2026` 한 벌만 렌더링하는 작업이다. 기존 공식 PNG v2, stage01, operator-reference 산출물은 historical evidence로만 보존하고, historical 재생성 스크립트는 working tree에서 제거한다.

- canonical source id: `SAJIK_CANONICAL_2026`
- canonical dataset: `src/data/sajikCanonicalSeatMap.ts`
- canonical image: `src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp`
- runtime blocks: `78` active selectable seat sections
- promoted operator-only blocks: `322`, `323`, `921`
- legacy official-only alias blocks: `935`, `013`, `012`, `011`, `914`, `913`, `912`, `911`, `903`, `902`, `901`
- wheelchair official pseudo-blocks are marker aliases only: `휠체어석-3루`, `휠체어석-중앙`, `휠체어석-1루`
- operator markers: `14`, linked selectable markers `8`
- source tab UI is removed from user runtime; legacy source inspection remains historical/debug-only.
- guard command: `npm run stadium:sajik:block-source-duplication-audit`
- full visual command: `npm run qa:stadium:sajik:full`

포함 후보:

| 경로 | 포함 판단 | 이유 |
| --- | --- | --- |
| `src/data/sajikCanonicalSeatMap.ts` | 포함 | canonical source id, image, block/marker/legacy alias model |
| `src/data/sajikSeatData.ts` | 부분 포함 | 기존 공식 PNG 데이터와 historical aliases 보존 |
| `src/data/sajikOperatorReferenceSeatMapDataset.ts` | 포함 | canonical builder의 operator-reference section/marker 입력 |
| `src/components/sajik/SajikSeatMap.tsx` | 포함 | source tab state 제거, canonical block/detail 연결 |
| `src/components/sajik/SajikSeatMapSvg.tsx` | 포함 | canonical image/block/marker 단일 renderer |
| `src/components/sajik/SajikSeatMap.test.ts` | 포함 | source tab 제거, canonical section/marker 렌더 계약 |
| `src/data/sajikSeatData.test.ts` | 포함 | canonical duplicate/source/topology validator |
| `scripts/sajik-seatmap-block-source-duplication-audit.mjs` | 포함 | active polygon source per block guard |
| `scripts/stadium-seatmap-ops.mjs` | 부분 포함 | `sajik block-source-duplication-audit`와 `sajik full` task |
| `scripts/stadium-ux-audit.mjs` | 부분 포함 | 사직 canonical smoke expectation |
| `package.json` | 부분 포함 | `stadium:sajik:block-source-duplication-audit`, `qa:stadium:sajik:full`, `qa:stadium:sajik:polygon-v2` guard prefix |
| `docs/sajik-seatmap-release-lock.md` | 포함 | canonical single-source lock |
| `docs/sajik-seatmap-pr-packaging-inventory.md` | 포함 | 이 packaging 범위 |
| `docs/sajik-seatmap-canonical-pr-notes.md` | 포함 | PR 설명과 rollout notes |
| `docs/sajik-seatmap-canonical-staging-rehearsal.md` | 승인된 삭제 제외 | Sajik owner 삭제 승인 완료. 현재 tracked 삭제 상태를 유지하고 PR 패키징 구성에서는 완전히 제외한다. |

검증 결과:

- `npm run stadium:sajik:block-source-duplication-audit`: PASS, `active_polygon_source_per_block=1`
- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts`: PASS, `37/37`
- `node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts`: PASS
- `npm run qa:stadium:sajik:full`: PASS
- `env VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build`: PASS, `bundle-guard ok`, `seo:prerender` 9 routes, sitemap generated.

QA Evidence Summary:

- generated QA report files stay out of the PR payload: `reports/stadium/sajik-seatmap-*.{json,csv,md,png}`, `reports/stadium/sajik-stage01-operator/*`, `dist/*`, `output/playwright/*`
- block source duplication report: `reports/stadium/sajik-seatmap-block-source-duplication-audit.{json,csv,md}`; latest summary `active_canonical_blocks=78`, `active_polygon_source_per_block=1`, `legacy_alias_only=11`
- scope guard report: `reports/stadium/sajik-seatmap-pr-scope-guard.{json,md}`; latest summary `included=17`, `unexpected=0`, `blockers=0`
- scope guard smoke report: `reports/stadium/sajik-seatmap-pr-scope-guard-smoke.{json,md}`; full/partial guard snapshots pass
- full visual QA summary: `output/playwright/stadium-ux-sajik-full/stadium-mobile-smoke-summary.md`
- build reports `reports/bundle-guard-report.json` and `reports/dist-assets-report.json` are regenerated evidence and stay unstaged
- generated report 원문은 복사하지 않는다

## 2026-05-20 operator reference primary source packaging

사직 operator reference 작업은 기존 공식 `960x640` source를 제거하지 않고, `1151x1367` reference 좌표계를 primary source로 승격한 별도 packaging 단위다.

- primary source: `OPERATOR_REFERENCE_2026`
- secondary source: `LOTTE_OFFICIAL_2026`
- asset: `src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp`
- 좌표계: `1151x1367`, `viewBox=0 0 1151 1367`
- map version: `BUSAN_SAJIK_2026_OPERATOR_REFERENCE_POLYGON_V1`
- SHA-256: `794d957510240c786f4fce821814afbf01cc1f93fe7ec3ecca23846a8d753f6f`
- source of truth: `src/data/sajikOperatorReferenceSeatMapDataset.ts`
- default source lock: `SAJIK_DEFAULT_SEATMAP_SOURCE_ID === 'OPERATOR_REFERENCE_2026'`
- dataset contract: `sections=78`, `markers=14`, `hitExpandedSections=78`, `linkedSelectableMarkers=8`, `displayOnlyMarkers=6`, `referenceOnlySections=3`
- trace coverage closeout: `PASS_TRACE_COVERAGE_CLOSEOUT`, `coveredSectionCount=78`, `reviewReportCount=12`, missing/duplicate/unexpected/issue `0`
- decision count lock: `LOCK_CURRENT_TRACE=71`, `LOCK_SIMPLIFIED_TRACE=3`, `LOCK_CONTINUOUS_MARKER_SPLIT_TRACE=4`
- promotion readiness: `PASS_PRIMARY_SOURCE_READINESS`, `productionPromotionDecision=PRIMARY_SOURCE_ACTIVE`, `autoPromotionAllowed=false`

포함 후보:

| 경로 | 포함 판단 | 이유 |
| --- | --- | --- |
| `src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp` | 포함 | operator reference primary source 이미지 |
| `src/data/sajikSeatData.ts` | 부분 포함 | source references, default source, official/source metadata 전환 hunk |
| `src/data/sajikOperatorReferenceSeatMapDataset.ts` | 포함 | 1151x1367 operator reference polygon dataset source of truth |
| `src/data/sajikSeatData.test.ts` | 포함 | operator reference source/default/dataset/closeout/promotion 계약 |
| `src/components/sajik/SajikSeatMap.tsx` | 포함 | source tab/default source/runtime selection state |
| `src/components/sajik/SajikSeatMapSvg.tsx` | 포함 | operator reference interactive preview, marker/reference-only layer 계약 |
| `src/components/sajik/SajikSeatMap.test.ts` | 포함 | primary source 렌더링, secondary official source, preview/debug layer 계약 |
| `scripts/sajik-seatmap-operator-reference.mjs` | 포함 | approved dataset summary와 hit expansion draft summary |
| `scripts/sajik-seatmap-operator-reference.mjs` | 포함 | summary에서 `sajikOperatorReferenceSeatMapDataset.ts`를 생성/검증 |
| `scripts/sajik-seatmap-operator-reference.mjs` | 포함 | 이미지 기준 visible section 78개 누락 방지 |
| `scripts/sajik-seatmap-operator-reference.mjs` | 포함 | bounds/self-intersection/label/geometry 기본 검증 |
| `scripts/sajik-seatmap-operator-reference.mjs` | 포함 | hit expansion, overlap, label ownership, marker coverage 검증 |
| `scripts/sajik-seatmap-operator-reference.mjs` | 포함 | marker display/selectable policy 고정 |
| `scripts/sajik-seatmap-operator-reference.mjs` | 포함 | display-only marker boundary evidence와 operator decision board |
| `scripts/sajik-seatmap-operator-reference.mjs` | 포함 | stage별 이미지 분석 trace review 결정을 report로 고정 |
| `scripts/sajik-seatmap-operator-reference.mjs` | 포함 | 12개 trace review report를 78/78 closeout으로 집계 |
| `scripts/sajik-seatmap-operator-reference.mjs` | 포함 | topology와 trace coverage closeout을 함께 읽는 primary source promotion gate |
| `scripts/sajik-seatmap-operator-reference.mjs` | 포함 | mixed worktree에서 operator-reference 포함 파일, 부분 hunk, generated report, 별도 작업을 분리 |
| `package.json` | 부분 포함 | `stadium:sajik:operator-reference-*`, `qa:stadium:sajik:operator-reference-approved`, `qa:stadium:sajik:operator-reference-release` script hunk |
| `docs/sajik-seatmap-release-lock.md` | 포함 | operator reference primary source handoff와 gate lock |
| `docs/sajik-seatmap-pr-packaging-inventory.md` | 포함 | 이 packaging 범위와 partial staging 기준 |

기본 검증:

- `npm run stadium:sajik:operator-reference-scope-audit`
- `npm run stadium:sajik:operator-reference-dataset-export -- --check`
- `npm run stadium:sajik:operator-reference-trace-coverage-closeout`
- `npm run stadium:sajik:operator-reference-promotion-readiness`
- `node --import tsx --test src/data/sajikSeatData.test.ts`
- `node --import tsx --test src/components/sajik/SajikSeatMap.test.ts`
- `npm run qa:stadium:sajik:operator-reference-approved`
- `npm run qa:stadium:sajik:operator-reference-release`

주의:

- `reports/stadium/sajik-operator-reference-trace/*`는 재생성 evidence/report로 PR 설명에는 결과만 기록하고 기본 staging 대상에서 제외한다.
- `operator-reference-scope-audit`는 `git add`를 실행하지 않으며 `package.json`, `scripts/stadium-ux-audit.mjs`, `src/components/StadiumGuideRuntimeSeatMaps.test.ts`는 hunk 단위로만 staging한다.
- `git add .`, `git add package.json`, `git add reports dist output`는 이 payload에서는 금지한다.
- production build가 다른 dirty workstream의 bundle budget으로 실패하면 operator reference packaging blocker로 분류하지 않는다. 해당 build blocker는 별도 PR 또는 별도 정리 작업에서 해결한다.

검증 결과:

- `npm run stadium:sajik:operator-reference-scope-audit`: PASS, `PASS_OPERATOR_REFERENCE_SCOPE_AUDIT`, `unexpected=0`, `safeToRunBulkGitAdd=false`
- `node --import tsx --test src/data/sajikSeatData.test.ts`: PASS, `31/31`
- `node --import tsx --test src/components/sajik/SajikSeatMap.test.ts`: PASS, `7/7`
- `npm run qa:stadium:sajik:operator-reference-release`: PASS, `mobile-390`/`desktop-1440`, hit areas `78`, overflow failures `0`

## v2+ PR 포함 후보

이번 v2+ 고도화 PR은 아래 사직 변경만 포함한다.

| 경로 | 포함 판단 | 이유 |
| --- | --- | --- |
| `src/data/sajikSeatData.ts` | 포함 | image version/hash/viewBox, normalized geometry fields, wheelchair/alias section metadata |
| `src/data/sajikSeatData.test.ts` | 포함 | image hash lock, `visualPath`/`hitPath`/`labelPoint` validator, marker metadata 검증 |
| `src/components/sajik/SajikSeatMapSvg.tsx` | 포함 | 공식 PNG를 같은 SVG `viewBox` 안의 `<image>`로 렌더링하고, 일반 좌석 84개 path와 접근성 marker 3개 layer를 분리 |
| `src/components/sajik/SajikSeatMapEditor.tsx` | 포함 | dev-only polygon editor v1.7, dirty draft tracking, vertex/labelPoint drag/nudge, vertex add/delete, copy/export lock, JSON/TS patch export preview |
| `src/components/sajik/SajikSeatMap.test.ts` | 포함 | SVG `<image>`, geometry metadata, marker metadata, editor shell markup 계약 |
| `src/components/AppRoutes.tsx` | 부분 포함 | `/internal/sajik-seatmap-editor` dev-only route hunk만 포함 |
| `src/utils/seatMapPolygonValidator.ts` | 포함 | 공통 polygon parser/validator 유틸과 구조화 issue API |
| `src/data/sajikSeatMapDataset.ts` | 포함 | `SAJIK_BLOCKS`에서 JSON/export/editor용 dataset 모델과 section patch payload 생성 |
| `scripts/sajik-seatmap-export-dataset.mjs` | 포함 | dataset JSON export CLI, `--check`/`--stdout` 지원 |
| `scripts/sajik-seatmap-editor-scope.mjs` | 포함 | editor v1.7 브라우저 회귀 검증, add/delete/drag/fail-lock/marker/alias 계약 확인 |
| `scripts/sajik-seatmap-hitpath-candidate-review.mjs` | 포함 | P0/P1/P2 hitPath 확장 후보, alias-only 예외, `visualPath === hitPath` 유지 상태를 report로 고정 |
| `scripts/sajik-seatmap-zone-precision-worksets.mjs` | 포함 | P0-A/P0-B/P0-C/P1-A/P1-B/P2-A 구역별 정밀화 순서와 `723/914/922` regression guard를 report로 고정 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | Stage 01 `P0-A/P0-B/P0-C` 16개 operator input/checklist 패키지를 생성하고 로컬 official PNG pixel-component 기반 `imagePriorityRank`/risk metadata를 reference-only로 노출 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | Stage 01 operator 입력의 누락 필드/decision 상태를 prewrite 전에 read-only로 정리하고 image-analysis metadata를 row report에 전달 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | Stage 01 review board, entry sheet, overlay SVG를 read-only로 생성하고 공식 PNG pixel-component 지표, `operatorDecisionOptions`, `patchPreviewEligible` 입력 안내를 고정 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | Stage 01 input-aid/review-board 상태를 공식 PNG image priority 순서의 operator next-action queue로 정리 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | next-action target `131` 검수 패킷과 Stage 01 전체 16개 official PNG crop/overlay/edge crop 검수 패킷을 read-only로 생성 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | target `131` 및 Stage 01 전체 16개 official crop/overlay crop/edge crop 산출물의 version, viewBox, PNG/read-only flags를 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | target `131` entry template의 PENDING/blank editable fields/official PNG evidence/locked source field policy를 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | 기본 target `131` 및 `--target` Stage 01 P0 대상의 entry template/operator input을 approval gate 전에 read-only로 검증하고 partial input/source conflict/evidence drift/locked field를 차단 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | target entry preflight의 pending/approved/partial/conflict/evidence/locked-field fixture를 isolated run으로 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | 기본 target `131` 및 `--target` Stage 01 P0 대상의 target entry preflight와 operator-approved corrected path/label 입력을 read-only로 검증하고 source conflict 및 invalid polygon을 차단 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | target approval gate의 pending/approved/invalid/placeholder/source conflict/no-patch-preview/preflight drift/write-flag drift fixture를 isolated run으로 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | Stage 01 P0 전체 16개 target의 entry preflight/approval gate readiness를 `--target` 기반 read-only 집계로 생성 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | all-target approval readiness report의 16-target coverage, blocker 없음, `allowAnyStage01Target`, write 금지 계약을 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | all-target review packet, operator input, approval readiness를 합쳐 16개 target별 operator 승인 입력 안내판을 생성 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | approval input guide의 pending 16개, official PNG evidence, required field, write 금지 계약을 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | operator input과 target entry template을 읽어 `APPROVED` row만 geometry 검증 후 prewrite 후보로 분류 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | pending 16개, valid approved fixture, placeholder 차단 fixture, keep-current no-patch fixture, invalid self-intersection fixture를 read-only로 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | Stage 01 승인 row만 patch preview로 검증하고 before/after geometry delta review와 production data write 차단을 고정 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | Stage 01 prewrite 산출물을 다시 검증해 수동 data patch 후보만 review-ready로 분리 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | Stage 01 patch preview가 현재 production dataset에 실제 반영됐는지 read-only로 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | Stage 01 operator input/prewrite/apply-ready/post-apply 결과를 row-level 상태판과 manual patch checklist로 통합 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | Stage 01 `NOT_APPLIED` row를 수동 source patch 계획, writable/locked source field, TS fragment로 정리 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | 실제 Stage 01 operator input의 승인 row를 읽어 `APPROVED_READY/NOT_APPLIED/APPLIED/BLOCKED` readiness와 source edit 안전 조건을 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | 기본 target `131` 및 `--target` Stage 01 P0 대상의 approval/manual-patch/readiness 산출물을 묶어 수동 적용 직전 writable-only 계약을 read-only로 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | 실제 `131` 승인 대기 상태, coordinate patch readiness, operator decision packet, current/keep-current decision draft, official PNG visual/evidence brief, approval input checklist, isolated lifecycle fixture를 묶어 현재 적용 경로를 read-only로 요약 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | no-delta/delta 승인, invalid, alias-marker, decision row, pixel-candidate copy/paste warning, 131 target approval gate, readiness tamper, operator input 보존 fixture로 Stage 01 branch를 검증하는 smoke gate |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | `021` approved row 1건을 dry-run 입력으로 만들어 prewrite/apply-ready/post-apply/operator-status/manual-patch-plan/readiness 상태 전이를 end-to-end 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | `021` approved no-delta row 1건을 isolated input으로 만들어 post-apply/operator-status/manual-patch-plan/readiness의 applied branch를 end-to-end 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | `131` approved fixture를 target entry preflight부터 real approval readiness까지 흘려보내 `MANUAL_PATCH_REQUIRED` 직전 상태와 writable fragment lock을 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | Stage 01 readiness/smoke/approved dry-run/applied dry-run 산출물의 최신성과 핵심 계약을 한 번에 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | readiness summary의 missing/stale/branch drift/image-analysis drift/source-write negative fixture를 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | Stage 01 close criteria를 pending/manual patch/terminal row 기준으로 read-only 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | completion gate의 pending, require-complete, complete, manual-apply, needs-retrace, source-write tamper, target-ready-without-manual-patch, version drift fixture를 검증 |
| `scripts/sajik-seatmap-editor-scope.mjs` | 포함 | 휠체어석 layer split, marker/section 호환 상태와 `markerOnlyApplied=false` 정책을 report로 고정 |
| `scripts/sajik-seatmap-editor-scope.mjs` | 포함 | mixed worktree에서 사직 PR 포함/제외 파일, 부분 staging 필요 파일, Stage 01 partial readiness/scope gate 안내를 report로 고정 |
| `scripts/sajik-seatmap-editor-scope.mjs` | 포함 | scope guard report가 blocked/pass 어느 상태에서도 Stage 01 partial readiness/scope metadata와 release payload count를 유지하는지 구조 검증 |
| `scripts/sajik-seatmap-stage01.mjs` | 포함 | staged scope audit의 partial/complete/blocked index fixture를 실제 git index와 분리해 검증 |
| `scripts/sajik-seatmap-core-qa.mjs` | 포함 | 사직 alignment audit가 공통 polygon 유틸과 `visualPath`/`hitPath`를 사용 |
| `scripts/sajik-seatmap-core-qa.mjs` | 포함 | manifest가 normalized geometry와 section metadata를 기록 |
| `docs/sajik-seatmap-editor-v17-operator-guide.md` | 포함 | editor v1.7 사용 절차, FAIL fixture, copy/export 수동 적용 절차 |
| `docs/sajik-seatmap-editor-v18-roadmap.md` | 포함 | editor v1.8 후속 범위와 이번 PR 제외 조건을 문서화 |
| `docs/sajik-seatmap-hitpath-candidate-review.md` | 포함 | `hitPathExpansionCandidate` 후보 우선순위와 후속 확장 승인 기준 |
| `docs/sajik-seatmap-marker-only-transition.md` | 포함 | 휠체어석 marker-only 전환 설계와 후속 QA 항목 |
| `docs/sajik-seatmap-release-lock.md` | 포함 | v2+ 기준값, validator 운영 규칙, 최신 검증 결과 |
| `docs/sajik-seatmap-stage01-handoff.md` | 포함 | Stage 01 승인 입력, 수동 patch checklist, Stage 02 진입 조건 |
| `package.json` | 부분 포함 | `stadium:sajik:dataset-export`, `stadium:sajik:editor-regression`, `stadium:sajik:hitpath-review`, `stadium:sajik:zone-precision-worksets`, `stadium:sajik:stage01-operator-package`, `stadium:sajik:stage01-operator-input-aid`, `stadium:sajik:stage01-review-board`, `stadium:sajik:stage01-next-action-packet`, `stadium:sajik:stage01-target-review-packet`, `stadium:sajik:stage01-target-image-analysis-smoke`, `stadium:sajik:stage01-all-target-review-packets`, `stadium:sajik:stage01-all-target-image-analysis-smoke`, `stadium:sajik:stage01-target-entry-template-readiness-smoke`, `stadium:sajik:stage01-target-entry-preflight`, `stadium:sajik:stage01-target-entry-preflight-smoke`, `stadium:sajik:stage01-target-approval-gate`, `stadium:sajik:stage01-target-approval-gate-smoke`, `stadium:sajik:stage01-all-target-approval-readiness`, `stadium:sajik:stage01-all-target-approval-readiness-smoke`, `stadium:sajik:stage01-all-target-approval-input-guide`, `stadium:sajik:stage01-all-target-approval-input-guide-smoke`, `stadium:sajik:stage01-prewrite`, `stadium:sajik:stage01-apply-ready`, `stadium:sajik:stage01-post-apply-audit`, `stadium:sajik:stage01-operator-status`, `stadium:sajik:stage01-manual-patch-plan`, `stadium:sajik:stage01-real-approval-readiness`, `stadium:sajik:stage01-target-apply-precheck`, `stadium:sajik:stage01-131-apply-path-status`, `stadium:sajik:stage01-prewrite-smoke`, `stadium:sajik:stage01-approved-dry-run`, `stadium:sajik:stage01-applied-dry-run`, `stadium:sajik:stage01-131-lifecycle-smoke`, `stadium:sajik:stage01-readiness-summary`, `stadium:sajik:stage01-readiness-summary-smoke`, `stadium:sajik:stage01-completion-gate`, `stadium:sajik:stage01-completion-gate:complete`, `stadium:sajik:stage01-completion-gate-smoke`, `qa:stadium:sajik:stage01-readiness`, `stadium:sajik:marker-transition-review`, `stadium:sajik:pr-scope-guard`, `stadium:sajik:stage01-pr-scope-guard`, `stadium:sajik:pr-scope-guard-smoke`, `qa:stadium:sajik:polygon-v2` script hunk만 포함 |
| `scripts/stadium-ux-audit.mjs` | 부분 포함 | 사직 label-coordinate QA에서 `data-map-interaction-status`를 읽는 hunk만 포함 |

주의: `scripts/stadium-ux-audit.mjs`에는 현재 수원 QA 확장 hunk가 함께 존재한다. 사직 PR에서는 해당 수원 hunk를 stage하지 말고, `verifySajikOverlayClicks` 내부의 `mapInteractionStatus` 읽기/반환 hunk만 선택한다. `package.json`도 광주/대구 hunk가 함께 존재하므로 사직 dataset export script hunk만 선택한다.

`scripts/sajik-seatmap-editor-scope.mjs`는 공통 seatmap shell migration, 비사직 구장 UI, home/game card UI, prediction, Mate, shared navigation/style, local assistant config를 `separateDirtyWork`로 분류한다. 사직 canonical single-source release-lock PR의 변경 payload는 17개로 고정하고, clean historical/operator-reference evidence 17개는 `historicalReferenceFiles`로만 추적한다.

이번 v2+ PR에는 포함하지 않는다.

| 경로/범위 | 제외 이유 |
| --- | --- |
| `src/components/StadiumGuideRuntimeSeatMaps.test.ts`의 비사직 hunk | 공통 shell, 대전, 광주, 대구 static contract 변경은 별도 작업 |
| `reports/*`, `dist/*`, `output/playwright/*` | 재생성 산출물. PR 설명에는 경로와 통과 결과만 기록 |
| 광주/대구/대전/수원 data, docs, scripts | 현재 워크트리의 별도 구장 작업으로 분리 |

## 현재 worktree 주의

- 현재 메인 worktree에는 사직 PR 범위와 별도 구장 작업이 함께 섞여 있다.
- `package.json`은 staged 광주 hunk와 unstaged 대구/사직 hunk가 함께 있는 mixed 상태다.
- `src/components/StadiumGuideRuntimeSeatMaps.test.ts`는 사직 release lock hunk와 공통 shell/대전/광주/대구 hunk가 함께 있는 mixed 상태다.
- bulk `git add .` 또는 `git add package.json src/components/StadiumGuideRuntimeSeatMaps.test.ts`는 금지한다.
- clean worktree를 쓰는 경우에도 사직 포함 파일과 부분 hunk만 적용하고, `scripts/run-stadium-isolated-qa.mjs`는 이번 사직 PR에 포함하지 않는다.
- `reports/*`, `dist/*`, `output/playwright/*`, `node_modules`는 재생성 산출물이므로 PR 범위에서 제외한다.
- `.gitignore` 변경은 공유 repo config 작업으로 분류하고 이번 사직 PR에 포함하지 않는다.
- `.env.production`과 비사직 `reports/*` 변경은 환경/재생성 산출물로 분류하고 이번 사직 PR에 포함하지 않는다.

## 부분 staging 기준

| 파일 | 포함 hunk | 제외 hunk |
| --- | --- | --- |
| `package.json` | `stadium:sajik:dataset-export`, `stadium:sajik:editor-regression`, `stadium:sajik:hitpath-review`, `stadium:sajik:zone-precision-worksets`, `stadium:sajik:stage01-operator-package`, `stadium:sajik:stage01-operator-input-aid`, `stadium:sajik:stage01-review-board`, `stadium:sajik:stage01-next-action-packet`, `stadium:sajik:stage01-target-review-packet`, `stadium:sajik:stage01-target-image-analysis-smoke`, `stadium:sajik:stage01-all-target-review-packets`, `stadium:sajik:stage01-all-target-image-analysis-smoke`, `stadium:sajik:stage01-target-entry-template-readiness-smoke`, `stadium:sajik:stage01-target-entry-preflight`, `stadium:sajik:stage01-target-entry-preflight-smoke`, `stadium:sajik:stage01-target-approval-gate`, `stadium:sajik:stage01-target-approval-gate-smoke`, `stadium:sajik:stage01-all-target-approval-readiness`, `stadium:sajik:stage01-all-target-approval-readiness-smoke`, `stadium:sajik:stage01-all-target-approval-input-guide`, `stadium:sajik:stage01-all-target-approval-input-guide-smoke`, `stadium:sajik:stage01-prewrite`, `stadium:sajik:stage01-apply-ready`, `stadium:sajik:stage01-post-apply-audit`, `stadium:sajik:stage01-operator-status`, `stadium:sajik:stage01-manual-patch-plan`, `stadium:sajik:stage01-real-approval-readiness`, `stadium:sajik:stage01-target-apply-precheck`, `stadium:sajik:stage01-131-apply-path-status`, `stadium:sajik:stage01-prewrite-smoke`, `stadium:sajik:stage01-approved-dry-run`, `stadium:sajik:stage01-applied-dry-run`, `stadium:sajik:stage01-readiness-summary`, `stadium:sajik:stage01-readiness-summary-smoke`, `stadium:sajik:stage01-completion-gate`, `stadium:sajik:stage01-completion-gate:complete`, `stadium:sajik:stage01-completion-gate-smoke`, `qa:stadium:sajik:stage01-readiness`, `stadium:sajik:marker-transition-review`, `stadium:sajik:pr-scope-guard`, `stadium:sajik:stage01-pr-scope-guard`, `stadium:sajik:pr-scope-guard-smoke`, `qa:stadium:sajik:polygon-v2` | `stadium:gwangju:*`, `qa:stadium:gwangju:*`, `stadium:daegu:*`, `qa:stadium:daegu:*` |
| `src/components/StadiumGuideRuntimeSeatMaps.test.ts` | 사직 release lock test의 package script/release lock/editor v1.8 exclusion assertions | 공통 seatmap shell, 대전 anchor crop, 광주 release/operator, 대구 operator/precision assertions |
| `scripts/stadium-ux-audit.mjs` | 사직 label-coordinate QA의 `mapInteractionStatus` 읽기/반환 및 alias-only hit-area 제외 검증 | 수원 등 비사직 QA flow 확장 |
| `src/components/AppRoutes.tsx` | `SajikSeatMapEditor` import와 `import.meta.env.DEV`로 제한된 `/internal/sajik-seatmap-editor` route | production navigation 노출, 비사직 route 변경 |

## PR staging manifest

`node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard`는 `reports/stadium/sajik-seatmap-pr-scope-guard.{json,md}`에 `stagingManifest`를 생성한다.

- `releasePayloadFileCount=17`
- `historicalReferenceFileCount=17`
- `doesNotRunGitAdd=true`
- `safeToRunBulkGitAdd=false`
- `requiresManualHunkReview=true`
- `executionMode=full-release|stage01-partial`
- `commandExitSummary.fullReleaseCommandExit=0` and `commandExitSummary.stage01PartialCommandExit=0` indicate the canonical payload is complete, while `patchSeparationReadiness=review-required` still requires manual staging.
- `stage01ReadinessAvailable=true`
- `stage01PartialScopeStatus=passed` must coexist with `fullReleaseStatus=passed` for the canonical payload.
- `stage01PartialReadinessGate.command=npm run qa:stadium:sajik:stage01-readiness`
- `stage01PartialScopeGate.command=npm run stadium:sajik:stage01-pr-scope-guard`
- whole-file review 대상은 `expectedIncludedFiles` 중 partial staging 대상 4개를 제외한 사직 전용 파일이다.
- partial hunk review 대상은 `package.json`, `scripts/stadium-seatmap-ops.mjs`, `src/components/StadiumGuideRuntimeSeatMaps.test.ts`, `scripts/stadium-ux-audit.mjs`다.
- `stadium:sajik:stage01-pr-scope-guard`는 같은 guard를 `--stage01-partial` mode로 실행하며 canonical payload 누락, unexpected file, absent reference가 없으면 exit 0으로 통과한다.
- `stadium:sajik:pr-scope-guard-smoke`는 `expectedIncludedFiles` 17개와 `historicalReferenceFiles` 17개가 실제 디스크에 존재하고, Stage 01 next-action/target-review/target-image-analysis-smoke/target-entry-template-readiness-smoke/target-entry-preflight/target-entry-preflight-smoke/target-approval/target-approval-smoke/all-target approval input guide/operator input intake gate/target-apply-precheck/131 apply path status/readiness summary/completion gate/completion gate smoke/staged scope audit smoke/stage01-pr-scope package script가 `scripts/stadium-seatmap-ops.mjs sajik <task>` dispatcher를 정확히 가리키는지 검증한다.
- untracked included file은 예상 밖 파일이 아니라 expected payload에 포함된 수동 review 대상이어야 하며, smoke는 이를 `UNTRACKED_INCLUDED_FILE:<path>` review-required reason으로 고정한다.
- scope guard markdown은 `Untracked Included Files` 섹션을 별도로 출력하고, 각 row에 `expected payload=true`, `manual review required=true`, `unexpected file=false`, `manual whole-file review` staging action을 표시해야 한다.
- `unexpectedFileCount=0`은 사직 PR inventory의 기본 조건이다. 새 사직 파일이 필요하면 먼저 `expectedIncludedFiles`와 이 inventory를 갱신한다.
- excluded artifacts는 `reports/stadium/sajik-seatmap-*`, `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`, `dist/*`, `output/playwright/*`, `../output/playwright/*`다.
- forbidden staging commands는 `git add .`, `git add package.json src/components/StadiumGuideRuntimeSeatMaps.test.ts`, `git add reports dist output`이다.

partial Stage 01 작업 트리에서는 `npm run qa:stadium:sajik:stage01-readiness`와 `npm run stadium:sajik:stage01-pr-scope-guard`로 readiness/scope를 먼저 검증한다. staging 이후에는 `node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard`, 사직 focused node tests, `git diff --check`, 필요 시 `npm run qa:stadium:sajik:polygon-v2`를 다시 실행한다.

현재 partial Stage 01 staging verdict는 `ready-for-partial-stage01-staging`이다. Partial staging 후 검증은 `npm run qa:stadium:sajik:stage01-readiness`, `npm run stadium:sajik:stage01-pr-scope-guard`, `node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts`, `git diff --check`로 제한한다. Full release staging 후 검증은 `node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard`, 사직 data/component node tests, 사직 focused static test, `node scripts/stadium-seatmap-ops.mjs sajik editor-regression`, `node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard-smoke`, `npm run qa:stadium:sajik:polygon-v2`, `npm run build`, `git diff --check`를 별도로 실행한다. Partial 검증은 full release gate를 대체하지 않는다.

`npm run stadium:sajik:stage01-staged-scope-audit:complete`는 Stage 01 partial package를 조립할 때 staged index complete verification으로 유지한다.

현재 partial worktree에서 untracked included whole-file review 대상은 아래 파일들이다. 이들은 expected payload에 포함되어 있으므로 `unexpected`가 아니지만, bulk staging 대상도 아니다.

| 파일 | 역할 | 검증 경로 |
| --- | --- | --- |
| `scripts/sajik-seatmap-editor-scope.mjs` | scope guard report 구조, Stage 01 partial readiness/scope metadata, full/partial run snapshot, expected file existence, untracked included review row 검증 | `node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard-smoke` |
| `scripts/sajik-seatmap-stage01.mjs` | Stage 01 pending row를 공식 PNG image priority 기준 operator queue로 정리 | `npm run stadium:sajik:stage01-next-action-packet` |
| `scripts/sajik-seatmap-stage01.mjs` | next target `131`의 packet뿐 아니라 `--all-stage01-targets`로 Stage 01 16개 전체 official PNG crop/overlay/edge crop, current path/label, pixel evidence, blank entry template 생성 | `npm run stadium:sajik:stage01-target-review-packet`, `npm run stadium:sajik:stage01-all-target-review-packets` |
| `scripts/sajik-seatmap-stage01.mjs` | `131` official PNG crop 3종과 `--all-stage01-targets` 16-target/48-PNG artifact 계약을 검사하고 source/operator/production write 금지를 확인 | `npm run stadium:sajik:stage01-target-image-analysis-smoke`, `npm run stadium:sajik:stage01-all-target-image-analysis-smoke` |
| `scripts/sajik-seatmap-stage01.mjs` | `131` entry template의 PENDING 상태, blank editable fields, official PNG evidence, locked source field policy를 검사 | `npm run stadium:sajik:stage01-target-entry-template-readiness-smoke` |
| `scripts/sajik-seatmap-stage01.mjs` | 기본 target `131` 및 `--target` Stage 01 P0 대상의 entry template/operator input partial input, source conflict, evidence drift, locked field를 approval gate 전에 read-only로 검증 | `npm run stadium:sajik:stage01-target-entry-preflight` |
| `scripts/sajik-seatmap-stage01.mjs` | target entry preflight isolated fixture 12개를 검증하고 source/operator/production write 금지를 확인 | `npm run stadium:sajik:stage01-target-entry-preflight-smoke` |
| `scripts/sajik-seatmap-stage01.mjs` | 기본 target `131` 및 `--target` Stage 01 P0 대상의 preflight freshness, operator-approved 입력 source conflict, path bounds, self-intersection, label 위치를 read-only로 검증 | `npm run stadium:sajik:stage01-target-approval-gate` |
| `scripts/sajik-seatmap-stage01.mjs` | target approval gate의 isolated fixture 20개를 검증하고 source/operator/production write 금지를 확인 | `npm run stadium:sajik:stage01-target-approval-gate-smoke` |
| `scripts/sajik-seatmap-stage01.mjs` | Stage 01 P0 전체 16개 target의 entry preflight/approval gate readiness를 집계하고 operator 승인 전에는 waiting-for-operator를 유지 | `npm run stadium:sajik:stage01-all-target-approval-readiness` |
| `scripts/sajik-seatmap-stage01.mjs` | all-target approval readiness의 16-target coverage, blocker 없음, `allowAnyStage01Target`, write 금지 계약을 검증 | `npm run stadium:sajik:stage01-all-target-approval-readiness-smoke` |
| `scripts/sajik-seatmap-stage01.mjs` | all-target review packet, operator input, approval readiness를 합쳐 official PNG 기반 operator 승인 입력 안내판을 생성 | `npm run stadium:sajik:stage01-all-target-approval-input-guide` |
| `scripts/sajik-seatmap-stage01.mjs` | approval input guide의 16-target coverage, pending 상태, official PNG evidence, write 금지 계약을 검증 | `npm run stadium:sajik:stage01-all-target-approval-input-guide-smoke` |
| `scripts/sajik-seatmap-stage01.mjs` | operator input 승인 row를 geometry 검증 후 prewrite 후보로 분류하고 pending row는 waiting 상태로 유지 | `npm run stadium:sajik:stage01-operator-input-intake-gate` |
| `scripts/sajik-seatmap-stage01.mjs` | default pending, valid approved, placeholder-blocked approval/keep-current, keep-current no-patch, invalid self-intersection fixture를 검증 | `npm run stadium:sajik:stage01-operator-input-intake-gate-smoke` |
| `scripts/sajik-seatmap-stage01.mjs` | 기본 target `131` 및 `--target` Stage 01 P0 대상의 approval gate, manual patch plan, operator status, readiness를 묶어 수동 적용 직전 writable-only 계약을 read-only로 검증 | `npm run stadium:sajik:stage01-target-apply-precheck` |
| `scripts/sajik-seatmap-stage01.mjs` | 실제 `131` approval gate/precheck와 isolated lifecycle fixture를 묶고 coordinate patch readiness, operator decision packet, current/keep-current decision draft, official PNG visual/evidence brief, crop artifacts, required assertions, forbidden sources, ready-for-prewrite criteria를 read-only로 요약 | `npm run stadium:sajik:stage01-131-apply-path-status` |
| `scripts/sajik-seatmap-stage01.mjs` | Stage 01 approved no-delta/applied branch를 isolated input으로 검증 | `npm run stadium:sajik:stage01-applied-dry-run` |
| `scripts/sajik-seatmap-stage01.mjs` | real operator input과 Stage 01 reports 최신성/계약을 요약 검증 | `npm run stadium:sajik:stage01-readiness-summary` |
| `scripts/sajik-seatmap-stage01.mjs` | readiness summary의 missing/stale/branch drift/source write/operator input drift fixture 검증 | `npm run stadium:sajik:stage01-readiness-summary-smoke` |
| `scripts/sajik-seatmap-stage01.mjs` | completion gate의 terminal/blocked/require-complete fixture 9개를 검증 | `npm run stadium:sajik:stage01-completion-gate-smoke` |
| `scripts/sajik-seatmap-stage01.mjs` | staged scope audit fixture 7개를 검증하고 bulk staging 차단 계약을 고정 | `npm run stadium:sajik:stage01-staged-scope-audit-smoke` |

## 최종 PR staging 요약

사직 canonical single-source PR의 source of truth는 `scripts/sajik-seatmap-editor-scope.mjs`의 `expectedIncludedFiles` 17개다. clean historical/operator-reference 파일 17개는 `historicalReferenceFiles`로만 추적하며 production source로 승격하지 않는다. 같은 파일에 다른 구장 hunk가 섞인 경우에는 아래 기준으로만 선택한다.

| 범위 | 포함 판단 | 이유 |
| --- | --- | --- |
| 사직 v2+ docs | 포함 | release lock, editor v1.7 guide, editor v1.8 roadmap, hitPath candidate review, marker-only transition, PR inventory |
| 사직 v2+ scripts | 포함 | alignment/manifest normalized geometry, dataset export, editor regression, hitPath review, marker transition review, scope guard |
| 사직 v2+ data | 포함 | `SAJIK_SEATMAP_IMAGE` lock, `visualPath`/`hitPath`/`labelPoint`, marker/alias metadata, dataset builder |
| 사직 SVG/editor/test | 포함 | SVG `<image>` overlay, `hitPath` rendering, dev-only editor v1.7, Sajik component test |
| `src/utils/seatMapPolygonValidator.ts` | 포함 | 사직 데이터/스크립트가 공유하는 polygon validator API |
| `package.json` | 부분 포함 | 사직 v2+ script hunk만 선택 |
| `src/components/StadiumGuideRuntimeSeatMaps.test.ts` | 부분 포함 | 사직 release lock 정적 계약 hunk만 선택 |
| `scripts/stadium-ux-audit.mjs` | 부분 포함 | 사직 label-coordinate QA hunk만 선택 |
| `src/components/AppRoutes.tsx` | 부분 포함 | dev-only editor route hunk만 선택 |

주의: `scripts/sajik-seatmap-core-qa.mjs`, `scripts/sajik-seatmap-core-qa.mjs`, `scripts/sajik-seatmap-core-qa.mjs`는 release gate에서 계속 사용하지만 현재 v2+ dirty payload에는 포함되지 않는다. 해당 파일에 새 diff가 생기면 scope guard의 expected list를 먼저 갱신해야 한다.

## 분리 권장 변경

아래 변경은 사직 polygon release lock과 직접 묶지 않는 것이 좋다.

| 범위 | 대표 파일 | 권장 처리 |
| --- | --- | --- |
| 사직 처음 방문 가이드 UX | `src/components/sajik/SajikSeatMap.tsx`, `src/components/sajik/SajikSeatMap.test.ts` | 사직 UX PR로 분리하거나, 이번 PR에 포함한다면 설명에 별도 섹션으로 명시 |
| editor v1.8 구현 | `src/components/sajik/SajikSeatMapEditor.tsx`, editor regression 확장 | 이번 PR은 roadmap만 포함하고 구현은 별도 editor PR로 분리 |
| 실제 hitPath 좌표 확장 | `src/data/sajikSeatData.ts`, editor patch payload | 후보/검증 report만 포함하고 승인 좌표 적용은 별도 좌표 PR로 분리 |
| 완전 marker-only 데이터 모델 전환 | `src/data/sajikSeatData.ts`, dataset marker-only migration, marker adjacent click QA | 이번 PR은 layer 분리와 selectable 호환 유지까지만 포함하고, 기존 selectable block 제거는 별도 접근성 PR로 분리 |
| 공통 seatmap shell migration | `src/components/stadiumSeatMap/*`, `src/components/stadiumSeatMapRegistry.tsx`, 삭제된 `src/components/ui/stadiumSeatMap*` | 별도 infra PR |
| Home/game card UI | `src/components/GameCard.tsx`, `src/components/home/GameCardSkeleton.tsx`, `src/components/home/HomeMatchPanel.tsx` | 별도 home UI PR |
| Shared navigation/auth controls | `src/components/Navbar.tsx`, `src/components/PublicNavbar.tsx`, `src/components/PublicNavbarDesktopAuthControls.tsx` | 별도 navigation PR |
| 타 구장 UI 및 operator workflow | `src/components/{changwon,daejeon,gocheok,incheon,jamsil,suwon}/*`, `scripts/*seatmap-*`, `docs/*seatmap-*`, 각 구장 data/component | 구장별 또는 공통 shell PR로 분리 |
| Prediction/schedule changes | `src/components/prediction/*`, `src/hooks/usePredictionGameData.ts`, `src/hooks/usePredictionSchedule.ts`, `src/api/prediction*` | 별도 feature PR |
| Mate feature changes | `src/components/MatePartyCard.tsx`, `src/components/mypage/MateHistoryCard.tsx`, `src/utils/mate.ts` | 별도 Mate PR |
| Shared styles/local assistant config | `src/index.css`, `.claude/*` | 별도 style/config PR 또는 local-only 제외 |
| SEO/favicon/build guard changes | `index.html`, `public/favicon.png`, `src/seo/SeoHead.tsx`, `scripts/bundle-guard.mjs` | 별도 SEO/build PR |

## 산출물 포함 기준

| 산출물 | 권장 |
| --- | --- |
| `reports/stadium/sajik-seatmap-*.json` | 재생성 가능한 산출물이다. repo 정책상 evidence를 커밋하는 경우에만 포함 |
| `reports/stadium/sajik-seatmap-*.md` | PR 설명 근거로 유용하지만 기본은 재생성 가능한 산출물로 취급 |
| `reports/stadium/sajik-seatmap-*.png` | 이미지 evidence가 필요할 때만 포함. 이전 이름의 stale failure crop은 제외 |
| `reports/bundle-guard-report.json` | build report PR에 포함. 사직 polygon PR에서는 보통 제외 |
| `reports/dist-assets-report.json` | build report PR에 포함. 사직 polygon PR에서는 보통 제외 |
| `output/playwright/*` | repo 밖 검증 산출물. PR에는 포함하지 않고 결과 경로만 PR 설명에 기록 |
| `dist/*` | build output. PR 포함 대상 아님 |

stale evidence 이름:

- `reports/stadium/sajik-seatmap-evidence-p0-alignment-failures-3b-upper.png`
- `reports/stadium/sajik-seatmap-evidence-p0-alignment-failures-central-lower.png`
- `reports/stadium/sajik-seatmap-evidence-p1-alignment-failure-everytime.png`

현재 release lock은 새 이름의 crop을 기준으로 한다:

- `reports/stadium/sajik-seatmap-evidence-p0-143-boundary-lock.png`
- `reports/stadium/sajik-seatmap-evidence-p0-132-142-143-seams.png`
- `reports/stadium/sajik-seatmap-evidence-p0-123-133-143-seams.png`
- `reports/stadium/sajik-seatmap-evidence-p0-retraced-3b-upper.png`
- `reports/stadium/sajik-seatmap-evidence-p0-central-lower-011-review.png`
- `reports/stadium/sajik-seatmap-evidence-p0-011-alias-only-no-hit-area.png`
- `reports/stadium/sajik-seatmap-evidence-p1-retraced-everytime.png`

## 선택 staging 메모

사직 PR에 필요한 package script:

```json
"stadium:sajik:pixel-components": "node scripts/stadium-seatmap-ops.mjs sajik pixel-components",
"stadium:sajik:alignment-audit": "node scripts/stadium-seatmap-ops.mjs sajik alignment-audit",
"stadium:sajik:trace-manifest": "node scripts/stadium-seatmap-ops.mjs sajik trace-manifest",
"stadium:sajik:evidence": "node scripts/stadium-seatmap-ops.mjs sajik evidence",
"stadium:sajik:advisory-playwright": "node scripts/stadium-seatmap-ops.mjs sajik advisory-playwright",
"stadium:sajik:dataset-export": "node --import tsx scripts/sajik-seatmap-export-dataset.mjs",
"stadium:sajik:editor-regression": "node scripts/stadium-seatmap-ops.mjs sajik editor-regression",
"stadium:sajik:hitpath-review": "node --import tsx scripts/sajik-seatmap-hitpath-candidate-review.mjs",
"stadium:sajik:zone-precision-worksets": "npm run stadium:sajik:hitpath-review && node --import tsx scripts/sajik-seatmap-zone-precision-worksets.mjs",
"stadium:sajik:stage01-operator-package": "npm run stadium:sajik:pixel-components && npm run stadium:sajik:zone-precision-worksets && npm run stadium:sajik:stage01-operator-package",
"stadium:sajik:stage01-operator-input-aid": "npm run stadium:sajik:stage01-operator-package && npm run stadium:sajik:stage01-operator-input-aid",
"stadium:sajik:stage01-review-board": "npm run stadium:sajik:pixel-components && npm run stadium:sajik:stage01-operator-input-aid && npm run stadium:sajik:stage01-review-board",
"stadium:sajik:stage01-next-action-packet": "npm run stadium:sajik:stage01-review-board && npm run stadium:sajik:stage01-next-action-packet",
"stadium:sajik:stage01-target-review-packet": "npm run stadium:sajik:stage01-next-action-packet && npm run stadium:sajik:stage01-target-review-packet",
"stadium:sajik:stage01-target-image-analysis-smoke": "npm run stadium:sajik:stage01-target-review-packet && npm run stadium:sajik:stage01-target-image-analysis-smoke",
"stadium:sajik:stage01-all-target-review-packets": "npm run stadium:sajik:stage01-next-action-packet && npm run stadium:sajik:stage01-target-review-packet --all-stage01-targets",
"stadium:sajik:stage01-all-target-image-analysis-smoke": "npm run stadium:sajik:stage01-all-target-review-packets && npm run stadium:sajik:stage01-target-image-analysis-smoke --all-stage01-targets",
"stadium:sajik:stage01-target-entry-template-readiness-smoke": "npm run stadium:sajik:stage01-target-review-packet && npm run stadium:sajik:stage01-target-entry-template-readiness-smoke",
"stadium:sajik:stage01-target-entry-preflight": "npm run stadium:sajik:stage01-target-review-packet && npm run stadium:sajik:stage01-target-entry-preflight",
"stadium:sajik:stage01-target-entry-preflight-smoke": "npm run stadium:sajik:stage01-target-entry-preflight-smoke",
"stadium:sajik:stage01-target-approval-gate": "npm run stadium:sajik:stage01-target-entry-preflight && npm run stadium:sajik:stage01-target-approval-gate",
"stadium:sajik:stage01-target-approval-gate-smoke": "npm run stadium:sajik:stage01-target-approval-gate-smoke",
"stadium:sajik:stage01-all-target-approval-readiness": "npm run stadium:sajik:stage01-all-target-review-packets && npm run stadium:sajik:stage01-all-target-approval-readiness",
"stadium:sajik:stage01-all-target-approval-readiness-smoke": "npm run stadium:sajik:stage01-all-target-approval-readiness && npm run stadium:sajik:stage01-all-target-approval-readiness-smoke",
"stadium:sajik:stage01-all-target-approval-input-guide": "npm run stadium:sajik:stage01-all-target-approval-readiness && npm run stadium:sajik:stage01-all-target-approval-input-guide",
"stadium:sajik:stage01-all-target-approval-input-guide-smoke": "npm run stadium:sajik:stage01-all-target-approval-input-guide && npm run stadium:sajik:stage01-all-target-approval-input-guide-smoke",
"stadium:sajik:stage01-operator-input-intake-gate": "npm run stadium:sajik:stage01-operator-input-intake-gate",
"stadium:sajik:stage01-operator-input-intake-gate-smoke": "npm run stadium:sajik:stage01-operator-input-intake-gate && npm run stadium:sajik:stage01-operator-input-intake-gate-smoke",
"stadium:sajik:stage01-prewrite": "npm run stadium:sajik:stage01-operator-package && npm run stadium:sajik:stage01-prewrite",
"stadium:sajik:stage01-apply-ready": "npm run stadium:sajik:stage01-prewrite && npm run stadium:sajik:stage01-apply-ready",
"stadium:sajik:stage01-post-apply-audit": "npm run stadium:sajik:stage01-apply-ready && npm run stadium:sajik:stage01-post-apply-audit",
"stadium:sajik:stage01-operator-status": "npm run stadium:sajik:stage01-post-apply-audit && npm run stadium:sajik:stage01-operator-status",
"stadium:sajik:stage01-manual-patch-plan": "npm run stadium:sajik:stage01-operator-status && npm run stadium:sajik:stage01-manual-patch-plan",
"stadium:sajik:stage01-real-approval-readiness": "npm run stadium:sajik:stage01-operator-input-aid && npm run stadium:sajik:stage01-manual-patch-plan && npm run stadium:sajik:stage01-real-approval-readiness",
"stadium:sajik:stage01-target-apply-precheck": "npm run stadium:sajik:stage01-real-approval-readiness && npm run stadium:sajik:stage01-target-apply-precheck",
"stadium:sajik:stage01-131-apply-path-status": "npm run stadium:sajik:stage01-target-apply-precheck && npm run stadium:sajik:stage01-131-lifecycle-smoke && npm run stadium:sajik:stage01-131-apply-path-status",
"stadium:sajik:stage01-prewrite-smoke": "npm run stadium:sajik:stage01-operator-package && npm run stadium:sajik:stage01-prewrite-smoke",
"stadium:sajik:stage01-approved-dry-run": "npm run stadium:sajik:stage01-operator-package && npm run stadium:sajik:stage01-approved-dry-run",
"stadium:sajik:stage01-applied-dry-run": "npm run stadium:sajik:stage01-operator-package && npm run stadium:sajik:stage01-applied-dry-run",
"stadium:sajik:stage01-readiness-summary": "npm run stadium:sajik:stage01-readiness-summary",
"stadium:sajik:stage01-readiness-summary-smoke": "npm run stadium:sajik:stage01-readiness-summary-smoke",
"stadium:sajik:stage01-completion-gate": "npm run stadium:sajik:stage01-next-action-packet && npm run stadium:sajik:stage01-target-apply-precheck && npm run stadium:sajik:stage01-readiness-summary && npm run stadium:sajik:stage01-completion-gate",
"stadium:sajik:stage01-completion-gate:complete": "npm run stadium:sajik:stage01-next-action-packet && npm run stadium:sajik:stage01-target-apply-precheck && npm run stadium:sajik:stage01-readiness-summary && npm run stadium:sajik:stage01-completion-gate --require-complete",
"stadium:sajik:stage01-completion-gate-smoke": "npm run stadium:sajik:stage01-completion-gate-smoke",
"qa:stadium:sajik:stage01-readiness": "npm run stadium:sajik:stage01-real-approval-readiness && npm run stadium:sajik:stage01-target-apply-precheck && npm run stadium:sajik:stage01-prewrite-smoke && npm run stadium:sajik:stage01-approved-dry-run && npm run stadium:sajik:stage01-applied-dry-run && npm run stadium:sajik:stage01-131-lifecycle-smoke && npm run stadium:sajik:stage01-131-apply-path-status && node --import tsx --test --test-name-pattern \"사직|Sajik\" src/components/StadiumGuideRuntimeSeatMaps.test.ts && npm run stadium:sajik:stage01-review-board && npm run stadium:sajik:stage01-next-action-packet && npm run stadium:sajik:stage01-target-review-packet && npm run stadium:sajik:stage01-target-image-analysis-smoke && npm run stadium:sajik:stage01-all-target-review-packets && npm run stadium:sajik:stage01-all-target-image-analysis-smoke && npm run stadium:sajik:stage01-target-entry-template-readiness-smoke && npm run stadium:sajik:stage01-target-entry-preflight && npm run stadium:sajik:stage01-target-entry-preflight-smoke && npm run stadium:sajik:stage01-target-approval-gate && npm run stadium:sajik:stage01-target-approval-gate-smoke && npm run stadium:sajik:stage01-all-target-approval-readiness && npm run stadium:sajik:stage01-all-target-approval-readiness-smoke && npm run stadium:sajik:stage01-all-target-approval-input-guide && npm run stadium:sajik:stage01-all-target-approval-input-guide-smoke && npm run stadium:sajik:stage01-operator-input-intake-gate && npm run stadium:sajik:stage01-operator-input-intake-gate-smoke && npm run stadium:sajik:stage01-target-apply-precheck && npm run stadium:sajik:stage01-131-apply-path-status && npm run stadium:sajik:stage01-readiness-summary && npm run stadium:sajik:stage01-readiness-summary-smoke && npm run stadium:sajik:stage01-completion-gate && npm run stadium:sajik:stage01-completion-gate-smoke && npm run stadium:sajik:stage01-staged-scope-audit-smoke",
"stadium:sajik:marker-transition-review": "node scripts/stadium-seatmap-ops.mjs sajik marker-transition-review",
"stadium:sajik:pr-scope-guard": "node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard",
"stadium:sajik:stage01-pr-scope-guard": "node scripts/stadium-seatmap-ops.mjs sajik stage01-pr-scope-guard",
"stadium:sajik:pr-scope-guard-smoke": "node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard-smoke",
"qa:stadium:sajik:trace-review": "npm run stadium:sajik:evidence && npm run stadium:sajik:advisory-playwright && npm run qa:stadium:sajik:mobile && npm run stadium:sajik:alignment-audit",
"qa:stadium:sajik:mobile": "STADIUM_UX_FORCE_START_DEV_SERVER=1 STADIUM_UX_MANAGED_DEV_SERVER_PORT=5177 STADIUM_UX_VIEWPORTS=mobile-390,desktop-1440 STADIUM_UX_REVIEW_STADIUMS=SAJIK STADIUM_UX_SAJIK_DEEP_CHECK=1 VITE_SITE_URL=http://127.0.0.1:5177 VITE_API_BASE_URL=/api node scripts/stadium-ux-audit.mjs",
"qa:stadium:sajik:polygon-v2": "node scripts/stadium-seatmap-ops.mjs sajik dataset-export --check && npm run stadium:sajik:alignment-audit && npm run stadium:sajik:evidence && npm run stadium:sajik:hitpath-review && npm run stadium:sajik:zone-precision-worksets && npm run stadium:sajik:stage01-operator-input-aid && npm run stadium:sajik:stage01-review-board && npm run stadium:sajik:stage01-next-action-packet && npm run stadium:sajik:stage01-target-review-packet && npm run stadium:sajik:stage01-target-image-analysis-smoke && npm run stadium:sajik:stage01-all-target-review-packets && npm run stadium:sajik:stage01-all-target-image-analysis-smoke && npm run stadium:sajik:stage01-target-entry-template-readiness-smoke && npm run stadium:sajik:stage01-target-entry-preflight && npm run stadium:sajik:stage01-target-entry-preflight-smoke && npm run stadium:sajik:stage01-target-approval-gate && npm run stadium:sajik:stage01-target-approval-gate-smoke && npm run stadium:sajik:stage01-all-target-approval-readiness && npm run stadium:sajik:stage01-all-target-approval-readiness-smoke && npm run stadium:sajik:stage01-all-target-approval-input-guide && npm run stadium:sajik:stage01-all-target-approval-input-guide-smoke && npm run stadium:sajik:stage01-operator-input-intake-gate && npm run stadium:sajik:stage01-operator-input-intake-gate-smoke && npm run stadium:sajik:stage01-prewrite && npm run stadium:sajik:stage01-apply-ready && npm run stadium:sajik:stage01-post-apply-audit && npm run stadium:sajik:stage01-operator-status && npm run stadium:sajik:stage01-manual-patch-plan && npm run stadium:sajik:stage01-real-approval-readiness && npm run stadium:sajik:stage01-target-apply-precheck && npm run stadium:sajik:stage01-prewrite-smoke && npm run stadium:sajik:stage01-approved-dry-run && npm run stadium:sajik:stage01-applied-dry-run && npm run stadium:sajik:stage01-131-lifecycle-smoke && npm run stadium:sajik:stage01-131-apply-path-status && npm run stadium:sajik:stage01-readiness-summary && npm run stadium:sajik:stage01-readiness-summary-smoke && npm run stadium:sajik:stage01-completion-gate && npm run stadium:sajik:stage01-completion-gate-smoke && npm run stadium:sajik:stage01-staged-scope-audit-smoke && node scripts/stadium-seatmap-ops.mjs sajik marker-transition-review && node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts && node --import tsx --test --test-name-pattern \"사직|Sajik\" src/components/StadiumGuideRuntimeSeatMaps.test.ts && node scripts/stadium-seatmap-ops.mjs sajik editor-regression && node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard && node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard-smoke && npm run build"
```

`scripts/run-stadium-isolated-qa.mjs`는 이번 clean 사직 PR 구성에 포함하지 않는다.

## 최신 검증 상태

- `npm run stadium:sajik:alignment-audit`: PASS, `mapSelectable=87 aliasOnlyNotVisible=2 locked=87 notVisible=2 retrace=0 officialFailures=0 thinOutsideFailures=0`
- `npm run stadium:sajik:evidence`: PASS, P0 `143` boundary-lock, `132/142/143`, `123/133/143`, `011` alias-only no-hit-area focus crop 생성 확인
- `npm run qa:stadium:sajik:trace-review`: PASS, isolated Sajik browser QA 통과, `status:passed`
- `node scripts/stadium-seatmap-ops.mjs sajik dataset-export --check`: PASS, `sections=89 enabled=87 aliasOnly=2 markers=3`
- `npm run stadium:sajik:hitpath-review`: PASS, `candidates=22 p0=16 p1=5 p2=1 aliasOnly=2 visualEqualsHit=21 expanded=1 approvedHitPathExpansionSectionIds=032 blockers=0`
- `npm run stadium:sajik:zone-precision-worksets`: PASS, `status=waiting-for-operator candidates=22 p0=16 p1=5 p2=1 guards=3 expanded=1 approvedHitPathExpansionSectionIds=032 blockers=0`
- `npm run stadium:sajik:stage01-operator-package`: PASS, `status=waiting-for-operator rows=16 approved=0 preserved=0 preservation=no-existing-input blockers=0`
- `npm run stadium:sajik:stage01-operator-input-aid`: PASS, `status=waiting-for-operator ready=0 approved=0 pending=16 rejected=0 needsRetrace=0 keepCurrent=0 invalid=0 blockers=0`, pending `nextAction=FILL_OR_DECIDE`
- `npm run stadium:sajik:stage01-review-board`: PASS, `status=waiting-for-operator rows=16 pending=16 ready=0 invalid=0 blockers=0 sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-next-action-packet`: PASS, `status=waiting-for-operator rows=16 pending=16 ready=0 invalid=0 next=131 sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-target-review-packet`: PASS, `status=waiting-for-operator target=131 next=131 risk=HIGH sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-target-entry-template-readiness-smoke`: PASS, `target=131`, `decision=PENDING`, `editableFieldsBlank=true`, `approvedRequiredFields=7`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-target-entry-preflight`: PASS, `status=waiting-for-operator target=131 source=none decision=PENDING readyForApprovalGate=false blockers=0 sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-target-entry-preflight-smoke`: PASS, `cases=12/12`, `sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`
- `npm run stadium:sajik:stage01-target-approval-gate`: PASS, `status=waiting-for-operator target=131 source=none decision=PENDING readyForPrewrite=false targetEntryPreflight=waiting-for-operator:PENDING sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-target-approval-gate-smoke`: PASS, 20 target-approval fixture cases passed, including placeholder reviewer/timestamp blockers and keep-current no-patch prewrite linkage, `sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`
- `npm run stadium:sajik:stage01-all-target-approval-readiness`: PASS, `status=waiting-for-operator targets=16/16 readyForApprovalGate=0 readyForPrewrite=0 sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`
- `npm run stadium:sajik:stage01-all-target-approval-readiness-smoke`: PASS, `targets=16/16`, `readyForApprovalGate=0`, `readyForPrewrite=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-all-target-approval-input-guide`: PASS, `status=waiting-for-operator`, `targets=16/16`, `pending=16`, `approved=0`, `readyForApprovalGate=0`, `readyForPrewrite=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-all-target-approval-input-guide-smoke`: PASS, `targets=16/16`, `pending=16`, `approved=0`, `readyForApprovalGate=0`, `readyForPrewrite=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-prewrite`: PASS, `status=waiting-for-operator rows=16 approved=0 valid=0 patchPreview=0 blockers=0`
- `npm run stadium:sajik:stage01-apply-ready`: PASS, `status=waiting-for-operator approved=0 patchPreview=0 productionDataChanged=false`
- `npm run stadium:sajik:stage01-post-apply-audit`: PASS, `status=waiting-for-operator approvedPatchPayloads=0 applied=0 unapplied=0 readOnly=true`
- `npm run stadium:sajik:stage01-operator-status`: PASS, `status=waiting-for-operator approved=0 applied=0 notApplied=0 pending=16 invalid=0 blockers=0`
- `npm run stadium:sajik:stage01-manual-patch-plan`: PASS, `status=waiting-for-operator manualPatchRows=0 approved=0 applied=0 notApplied=0 blockers=0`
- `npm run stadium:sajik:stage01-completion-gate-smoke`: PASS, `cases=9/9`, `sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`
- `npm run stadium:sajik:stage01-real-approval-readiness`: PASS, `status=waiting-for-operator approved=0 ready=0 notApplied=0 applied=0 blocked=0 manualPatchRows=0 blockers=0 sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-target-apply-precheck`: PASS, `status=waiting-for-operator target=131 decision=PENDING readyForPrewrite=false manualPatchRequired=false targetApplied=false sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`
- `npm run stadium:sajik:stage01-131-apply-path-status`: PASS, `status=waiting-for-operator target=131 decision=PENDING editableFieldsBlank=true readyForPrewrite=false manualPatchRequired=false lifecycleFixtureReady=true officialPngEvidenceReady=true approvalInputChecklistReady=true sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`
- `npm run stadium:sajik:stage01-prewrite-smoke`: PASS, `cases=26/26 operatorPackagePreservationPassed=true preservationStatus=preserved productionDataChanged=false`, `approved-with-delta` fixture rowStatus `NOT_APPLIED`, readiness `APPROVED_NOT_APPLIED`, `approved-applied-after-manual-patch` fixture rowStatus `APPLIED`, readiness `APPROVED_APPLIED`, `approved-no-delta` readiness `APPROVED_APPLIED`, input aid action `RUN_PREWRITE`, manual patch plan action `MANUAL_PATCH_REQUIRED`, decision row fixture `REJECTED/NEEDS_RETRACE/KEEP_CURRENT`, invalid path/label/unknown section fixtures blocked, geometry quality fixtures block `CORRECTED_GEOMETRY_AREA_DELTA_TOO_LARGE` and `CORRECTED_POINT_COUNT_TOO_HIGH`, near-boundary label fixture warns `CORRECTED_LABEL_NEAR_BOUNDARY`, `approved-pixel-candidate-copy-note-row` fixture warns `OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW`, `approved-131-without-approval-gate`/`approved-131-with-blocked-approval-gate`/`approved-131-with-mismatched-approval-gate` block invalid `131` approval provenance, `approved-131-with-ready-approval-gate` reaches manual patch preview, partial/stale/locked-field fixtures block `PARTIAL_APPLY_HITPATH_ONLY`, `PARTIAL_APPLY_LABEL_ONLY`, `LEGACY_LABEL_DRIFT`, `STALE_BEFORE_SNAPSHOT_HIT_PATH`, `LOCKED_FIELD_MUTATED:visualPath`, tampered readiness fixtures block `VISUAL_PATH_CHANGED_WITHOUT_APPROVAL` and `TARGET_SOURCE_FILE_MISMATCH`
- `npm run stadium:sajik:stage01-approved-dry-run`: PASS, `target=021`, `prewrite=ready-for-data-patch`, `applyReady=ready-for-manual-apply`, `postApply=not-applied`, `readiness=ready-for-manual-apply`, `readinessRow=APPROVED_NOT_APPLIED`, `manualPatchRows=1`, `sourceDataWritePerformed=false`, `productionWriteAllowed=false`
- `npm run stadium:sajik:stage01-applied-dry-run`: PASS, `target=021`, `postApply=applied`, `operatorStatus=applied`, `operatorStatusRow=APPLIED`, `manualPatchRows=0`, `readiness=applied`, `readinessRow=APPROVED_APPLIED`, `sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-131-lifecycle-smoke`: PASS, `target=131`, `preflight=ready-for-approval-gate`, `approval=ready-for-prewrite`, `prewrite=ready-for-data-patch`, `applyReady=ready-for-manual-apply`, `postApply=not-applied`, `operatorStatusRow=NOT_APPLIED`, `manualPatchAction=MANUAL_PATCH_REQUIRED`, `readinessRow=APPROVED_NOT_APPLIED`, `sourceDataWritePerformed=false`, `patchAllowedFieldsOnly=true`, `writableFragmentLockedTokensAbsent=true`
- `npm run stadium:sajik:stage01-target-image-analysis-smoke`: PASS, `target=131`, `crop=615 433 140 110`, `pngSize=560x440`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-all-target-review-packets`: PASS, `status=waiting-for-operator`, `targets=16/16`, `officialPngOnly=true`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-all-target-image-analysis-smoke`: PASS, `mode=all-stage01-targets`, `targets=16/16`, `artifacts=48`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-readiness-summary`: PASS, `operatorInputRows=16`, `operatorInputApproved=0`, `reviewBoardImageHighRisk=8`, `reviewBoardImagePriority=131>032>133>143>135>134>122>123>132>031>022>142>121>124>125>021`, `realApprovalReadiness=waiting-for-operator`, `prewriteSmoke=passed`, `approvedDryRun=APPROVED_NOT_APPLIED`, `appliedDryRun=APPROVED_APPLIED`, `targetEntryPreflight=waiting-for-operator:PENDING`, `targetEntryPreflightReady=false`, `targetEntryPreflightSmoke=passed:12/12`, `targetApprovalGate=waiting-for-operator:PENDING`, `targetApprovalReady=false`, `sourceDataWritePerformed=false`, `freshReports=true`
- `npm run stadium:sajik:stage01-readiness-summary-smoke`: PASS, `cases=27/27`, fixtures `valid-summary`, `missing-report`, `review-board-missing`, `stale-report`, `approved-readiness-drift`, `applied-readiness-drift`, `image-analysis-priority-drift`, `image-analysis-risk-count-drift`, `candidate-reference-drift`, `pixel-component-source-drift`, `package-image-priority-drift`, `package-image-risk-count-drift`, `package-candidate-reference-drift`, `package-pixel-component-source-drift`, `operator-input-image-priority-drift`, `package-review-board-image-mismatch`, `target-entry-preflight-missing`, `target-entry-preflight-stale`, `target-entry-preflight-source-write-drift`, `target-entry-preflight-status-drift`, `target-entry-preflight-smoke-failed`, `target-entry-preflight-target-mismatch`, `target-approval-gate-missing`, `target-approval-source-write-drift`, `target-approval-status-drift`, `source-write-drift`, `operator-input-drift`
- `npm run qa:stadium:sajik:stage01-readiness`: PASS, partial-worktree-safe Stage 01 gate. It intentionally excludes `stadium:sajik:pr-scope-guard`, editor regression, and build, but includes review board, next-action packet, target review packet, target image-analysis smoke, all-target official PNG review packets, all-target image-analysis smoke, target entry template readiness smoke, target entry preflight, target entry preflight smoke, target approval gate, target approval smoke, all-target approval readiness, all-target approval readiness smoke, all-target approval input guide, all-target approval input guide smoke, operator input intake gate, intake gate smoke, target apply precheck, 131 lifecycle smoke, 131 apply path status, readiness summary, completion gate smoke, and staged scope audit smoke; use `qa:stadium:sajik:polygon-v2` for the full release payload gate.
- `npm run stadium:sajik:stage01-operator-input-intake-gate`: PASS, `status=waiting-for-operator`, `targets=16/16`, `approved=0`, `readyForPrewrite=0`, `waiting=16`, `blocked=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-operator-input-intake-gate-smoke`: PASS, `targets=16/16`, `pending=16`, `approved=0`, `readyForPrewrite=0`, `blocked=0`, fixture `approved-valid=ready-for-prewrite`, placeholder fixtures `approved-placeholder=blocked` and `keep-current-placeholder=blocked`, fixture `keep-current-valid=waiting-for-operator`, fixture `approved-invalid=blocked`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `npm run stadium:sajik:stage01-staged-scope-audit-smoke`: PASS, `cases=7/7`, `expectedStage01PartialTargetFileCount=40`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`
- `node scripts/stadium-seatmap-ops.mjs sajik marker-transition-review`: PASS, `markers=3 sections=3 seatPaths=84 markerLayer=3 aliasRendered=0 positionLocks=3 selectableCompat=3 markerOnlyApplied=false blockers=0`
- `node scripts/stadium-seatmap-ops.mjs sajik editor-regression`: PASS, editor v1.7 browser regression `status:passed checks=11`
- `node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard`: PASS in current mixed worktree, `status=passed`, `fullRelease=passed`, `stage01PartialScope=passed`, `stage01PartialStagingVerdict=ready-for-partial-stage01-staging`, `mode=full-release`, `commandExit=0`, `included=<runtime>`, `separate=<runtime>`, `unexpected=0`, `blockers=0`, `partialBlockers=0`, patch separation `review-required`, `stage01ReadinessAvailable=true`; clean official PNG/operator-reference/stage01 evidence is tracked in `historicalReferenceFiles` with `productionSource=false`, not as missing release payload. `included` and `separate` are advisory dirty-worktree counts and may drift as unrelated workstreams change; pass criteria are `unexpected=0`, `blockers=0`, and missing canonical payload files `0`. Shared home ranking and toast UI files, including `TeamRankRow`, `sonner`, and `shims/sonner`, are classified as separate workstreams rather than unexpected Sajik PR payload.
- `npm run stadium:sajik:stage01-pr-scope-guard`: PASS in current mixed worktree, `status=passed`, `fullRelease=passed`, `stage01PartialScope=passed`, `partialBlockers=0`, `mode=stage01-partial`, `commandExit=0`.
- `node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard-smoke`: PASS, structural smoke over generated scope guard reports and writes `reports/stadium/sajik-seatmap-pr-scope-guard-smoke.{json,md}`. Snapshot summary: `fullReleaseRun.exitCode=0`, `fullReleaseRun.executionMode=full-release`, `partialRun.exitCode=0`, `partialRun.executionMode=stage01-partial`, `stage01PartialScope=passed`, `stage01PartialExit=0`, `releasePayloadFileCount=17`, `historicalReferenceFileCount=17`, `stage01ReadinessAvailable=true`.
- `npm run qa:stadium:sajik:polygon-v2`: BLOCKED at `stadium:sajik:pr-scope-guard` in current partial worktree after dataset/export/alignment/evidence/hitPath review/Stage 01 operator-input-aid/review-board/next-action packet/target review packet/target image-analysis smoke/all-target official PNG review packets/all-target image-analysis smoke/target entry template readiness smoke/target entry preflight/target entry preflight smoke/target approval gate/target approval smoke/all-target approval readiness/all-target approval readiness smoke/all-target approval input guide/all-target approval input guide smoke/operator input intake gate/intake gate smoke/prewrite/apply-ready/post-apply/operator-status/manual-patch-plan/readiness/target apply precheck/smoke/approved dry-run/applied dry-run/131 lifecycle smoke/131 apply path status/readiness summary/readiness summary smoke/marker transition review/Sajik-focused node tests/editor regression passed.
- `VITE_SITE_URL=http://127.0.0.1:5176 VITE_API_BASE_URL=/api npm run build`: PASS
- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts`: PASS, `24/24`
- `node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts`: PASS, focused StadiumGuide Sajik contract
- `node --import tsx --test src/components/StadiumGuideRuntimeSeatMaps.test.ts`: BLOCKED by unrelated Gwangju release lock dirty mismatch, `included=<runtime>`. 사직 focused contract는 별도 command로 PASS.
- `npm run test:stadium:seatmaps`: BLOCKED by unrelated clean HEAD Suwon baseline mismatch, `SUWON_HIT_GEOMETRY_EXCEPTION_NOTES` export 누락. 사직 항목은 해당 run 안에서 모두 PASS.
- `npm run build`: PASS
- `git diff --check`: PASS

기존 Vite warning:

- `src/utils/clientErrorReporter.ts`가 dynamic import와 static import 양쪽에서 참조된다는 warning은 남아 있다.
- 현재 사직 release lock 기준에서는 exit code 0이면 차단 조건으로 보지 않는다.

## PR 설명 초안

### Summary

- 사직 좌석도 89개 hit-area를 공식 2026 PNG 기준 `manual-polygon-v2`/`BUSAN_SAJIK_2026_MANUAL_POLYGON_V2`로 고정했습니다.
- 기준 이미지 `960x640`, `viewBox=0 0 960 640`, SHA-256 `e9cb51ccf57a754ddf066a95c6c789d65edf8dff167f432fd35fe809e9dc80aa`를 데이터와 테스트로 잠갔습니다.
- 기존 `imageGeometry.d` 호환을 유지하면서 `visualPath`, `hitPath`, `labelPoint`, `geometryVersion`을 표준 geometry 필드로 추가했습니다.
- 공식 이미지는 같은 SVG `viewBox` 안의 `<image>`로 렌더링하고, 일반 좌석 84개 path와 접근성 marker 3개 layer를 분리했습니다.
- 공식 PNG 색상 블럭이 확인되는 87개는 `LOCKED_VERIFIED`/`MAP_SELECTABLE`로 잠그고, 공식 PNG에서 독립 블럭이 보이지 않는 `011`, `903`은 `ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE`로 분리했습니다.
- 휠체어석 3개는 현재 선택 동작을 유지하면서 `markerType=WHEELCHAIR`, `sectionKind=ACCESSIBILITY_MARKER` 메타데이터를 부여하고 accessibility marker layer에서 렌더링합니다.
- marker transition review를 추가해 runtime seat path `84`, marker layer `3`, alias rendered `0`, marker position/labelPoint lock `3`, selectable compatibility `3`, `markerOnlyApplied=false`를 자동 검증합니다.
- 공통 polygon validator를 추가해 bounds, 단일 폐합 path, 면적, self-intersection, label 위치를 재사용 검증할 수 있게 했습니다.
- `SAJIK_BLOCKS` 기반 JSON dataset builder와 export CLI를 추가해 향후 내부 polygon editor/export 흐름의 입력 모델을 마련했습니다.
- dev-only `/internal/sajik-seatmap-editor` route와 editor v1.7을 추가해 공식 이미지, overlay, section 검색/선택, vertex/labelPoint draft, vertex add/delete/drag, dirty state, validator PASS, JSON/TS patch copy/export preview를 한 화면에서 확인할 수 있게 했습니다.
- 선택 section 기준 `SAJIK_SECTION_GEOMETRY_PATCH_PREVIEW` payload를 추가했습니다. 초기 상태는 `after === before`이고, editor에서 vertex drag/nudge/add/delete가 발생하면 `after`가 draft geometry로 갱신됩니다. 파일 자동수정은 하지 않습니다.
- 작은 구역과 얇은 블럭의 `hitPath` 확장 후보를 dataset에 표시하고, 확장 좌표가 `visualPath` 면적의 75% 미만으로 축소되면 validator가 차단하도록 했습니다.
- `scripts/sajik-seatmap-hitpath-candidate-review.mjs`를 추가해 P0/P1/P2 후보 batch, alias-only 예외, 승인 확장 좌표 0건 상태를 report로 고정했습니다.
- editor regression script를 추가해 draft dirty/reset, vertex add/delete, vertex drag, validation FAIL export lock, labelPoint edit mode, hit-candidate 표시, marker/alias export 계약을 브라우저에서 검증합니다.
- PR scope guard를 추가해 mixed worktree에서 사직 포함 파일, 별도 구장 작업, 부분 staging 필요 파일을 report로 고정합니다.
- Playwright label-coordinate QA는 `84 seat paths + 3 accessibility markers = 87` target만 렌더링/클릭 검증하고, 이전 `011` 좌표 클릭이 `011` 팝업을 열지 않음을 확인합니다.
- P0 focus evidence로 `143` boundary lock, `132/142/143`, `123/133/143` seam, `011` no-hit-area 상태를 별도 확대 crop으로 고정했습니다.

### Key Changes

- `SAJIK_BLOCKS` polygon/reference/label anchor를 v2 기준으로 고정했습니다.
- `SAJIK_SEATMAP_IMAGE`에 `stadiumId`, `mapVersion`, `viewBox`, `imageSha256`를 추가했습니다.
- `imageGeometry`에 `visualPath`, `hitPath`, `labelPoint`, `geometryVersion`을 추가하고 현재 v2 기준에서는 `hitPath === visualPath === d`를 유지합니다.
- `SajikSeatMapSvg`에서 공식 PNG를 SVG 내부 `<image>`로 렌더링하도록 바꾸고, 좌표 계산과 label은 `labelPoint` 기준으로 읽습니다.
- `src/utils/seatMapPolygonValidator.ts`를 추가하고 사직 데이터 테스트와 사직 audit/manifest 스크립트에서 사용합니다.
- `src/data/sajikSeatMapDataset.ts`와 `scripts/sajik-seatmap-export-dataset.mjs`를 추가해 `sections`/`markers` JSON export를 제공합니다.
- `src/components/sajik/SajikSeatMapEditor.tsx`와 dev-only route를 추가해 production navigation 노출 없이 editor v1.7을 사용할 수 있게 했습니다.
- editor v1.7은 선택 section의 `visualPath`/`hitPath`/`labelPoint` draft를 분리 편집하고, vertex add/delete/drag, dirty section summary, before/after status, validation failure export lock, JSON/TS copy 버튼을 제공합니다.
- editor v1.8은 `docs/sajik-seatmap-editor-v18-roadmap.md`에 후속 범위로만 고정하고, 이번 PR에는 구현하지 않습니다.
- `scripts/sajik-seatmap-editor-scope.mjs`는 git staging을 수행하지 않고 `reports/stadium/sajik-seatmap-pr-scope-guard.{json,md}`만 생성합니다. Report 상단은 `executionMode`, `fullReleaseStatus`, `stage01PartialScopeStatus`, `stage01PartialStagingVerdict`, `commandExitCode`, `commandExitSummary`를 표시합니다. Partial worktree에서는 `stage01PartialReadinessGate`로 `qa:stadium:sajik:stage01-readiness`를 안내하고, full release 검증은 `qa:stadium:sajik:polygon-v2`로 유지합니다.
- `scripts/sajik-seatmap-stage01.mjs`는 readiness summary가 missing/stale/drift/source write fixture를 차단하는지 검증합니다.
- `scripts/sajik-seatmap-stage01.mjs`는 real `131-entry-template`이 `operatorDecision=PENDING`, blank editable fields, official PNG review evidence, locked source field policy를 유지하는지 검증합니다.
- `scripts/sajik-seatmap-stage01.mjs`는 `131-entry-template`과 operator input row를 approval gate 전에 read-only로 검사해 partial input, source conflict, evidence drift, locked field, invalid reviewedAt, malformed correctedPath를 차단합니다.
- `scripts/sajik-seatmap-stage01.mjs`는 preflight의 pending/approved/partial/conflict/evidence/locked-field fixture 12개를 검증합니다.
- `scripts/sajik-seatmap-editor-scope.mjs`는 scope guard exit `0/1`을 모두 구조 검증 대상으로 허용하되, report에서 `executionMode`, `commandExitCode`, `commandExitSummary`, `stage01PartialStagingVerdict`, `stage01PartialReadinessGate`, `stage01PartialScopeGate`, `stage01ReadinessAvailable=true`, `releasePayloadFileCount=17`, `historicalReferenceFileCount=17`, `safeToRunBulkGitAdd=false`가 빠지면 실패합니다. Full run과 partial run 결과는 `reports/stadium/sajik-seatmap-pr-scope-guard-smoke.{json,md}`의 `fullReleaseRun`과 `partialRun` snapshot에 따로 보관하고, `partialVerificationAfterStaging`과 `fullReleaseVerificationAfterStaging`을 분리해 partial staging 후 검증이 full release gate를 대체하지 않도록 합니다.
- `scripts/sajik-seatmap-stage01.mjs`는 staged index가 차단될 때 `stagingRemediation` 섹션으로 `stagedFilesToKeep`, `stagedFilesToUnstage`, `stagedFilesToUnstageWithReasons`, `stagedManualHunkReviewFiles`, `missingTargetFilesForCompleteMode`, `nextActions`를 출력합니다. `stagedFilesToUnstageWithReasons`는 `OUTSIDE_STAGE01_TARGET`, `SEPARATE_DIRTY_WORK`, `UNEXPECTED_DIRTY_FILE`, `DELETED_STAGE01_TARGET`처럼 cleanup 이유를 함께 기록합니다. 이 섹션은 operator manual index cleanup 안내만 제공하며 git command를 실행하지 않습니다.
- `qa:stadium:sajik:polygon-v2` 스크립트는 dataset export check, alignment audit, evidence, hitPath review, Stage 01 operator-input-aid/review-board/next-action packet/target review packet/target image-analysis smoke/all-target official PNG review packets/all-target image-analysis smoke/target entry template readiness smoke/target entry preflight/target entry preflight smoke/target approval gate/target approval smoke/all-target approval readiness/all-target approval readiness smoke/all-target approval input guide/all-target approval input guide smoke/operator input intake gate/intake gate smoke/prewrite/apply-ready/post-apply/operator-status/manual-patch-plan/readiness/target apply precheck/smoke/approved dry-run/applied dry-run/131 lifecycle smoke/131 apply path status/readiness summary/readiness summary smoke, marker transition review, 사직 focused node tests, editor regression, scope guard, build를 묶은 사직 polygon v2+ 게이트입니다.
- `143`을 공식 PNG 파란 블럭 경계에 맞춰 재트레이싱하고, 얇은 1루 블럭군에 outside leakage 기준을 추가했습니다.
- `143` 전용 boundary-lock evidence와 `132/142/143`, `123/133/143` seam evidence를 추가해 인접 polygon 침범 여부를 별도 검수하도록 했습니다.
- `011`은 alias-only no-hit-area evidence로 SVG hit-area 제외 상태를 고정했습니다.
- `src/data/sajikSeatData.test.ts`에 `143` 주변 seam의 vertex intrusion, edge crossing, edge overlap 방지 테스트를 추가했습니다.
- `SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS = ['011', '903']`와 `SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS = ['011', '903']` 계약을 추가했습니다.
- 사직 전용 pixel component, alignment audit, trace manifest, evidence crop, advisory Playwright review 스크립트를 추가했습니다.
- release lock 문서에 `87 locked / 2 aliasOnlyNotVisible / 0 retrace / 0 officialFailures / 0 thinOutsideFailures` 기준과 차단 조건을 고정했습니다.

### Verification

- `npm run stadium:sajik:alignment-audit`
- `npm run stadium:sajik:evidence`
- `npm run qa:stadium:sajik:trace-review`
- `node scripts/stadium-seatmap-ops.mjs sajik dataset-export --check`
- `npm run stadium:sajik:hitpath-review`
- `npm run stadium:sajik:stage01-operator-input-aid`
- `npm run stadium:sajik:stage01-review-board`
- `npm run stadium:sajik:stage01-next-action-packet`
- `npm run stadium:sajik:stage01-target-review-packet`
- `npm run stadium:sajik:stage01-target-entry-preflight`
- `npm run stadium:sajik:stage01-target-entry-preflight-smoke`
- `npm run stadium:sajik:stage01-target-approval-gate`
- `npm run stadium:sajik:stage01-target-approval-gate-smoke`
- `npm run stadium:sajik:stage01-all-target-approval-readiness`
- `npm run stadium:sajik:stage01-all-target-approval-readiness-smoke`
- `npm run stadium:sajik:stage01-all-target-approval-input-guide`
- `npm run stadium:sajik:stage01-all-target-approval-input-guide-smoke`
- `npm run stadium:sajik:stage01-post-apply-audit`
- `npm run stadium:sajik:stage01-operator-status`
- `npm run stadium:sajik:stage01-manual-patch-plan`
- `npm run stadium:sajik:stage01-real-approval-readiness`
- `npm run stadium:sajik:stage01-approved-dry-run`
- `npm run stadium:sajik:stage01-applied-dry-run`
- `npm run stadium:sajik:stage01-131-apply-path-status`
- `npm run stadium:sajik:stage01-readiness-summary`
- `npm run stadium:sajik:stage01-readiness-summary-smoke`
- `npm run qa:stadium:sajik:stage01-readiness`
- `node scripts/stadium-seatmap-ops.mjs sajik marker-transition-review`
- `node scripts/stadium-seatmap-ops.mjs sajik editor-regression`
- `node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard`
- `node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard-smoke`
- `npm run qa:stadium:sajik:polygon-v2`
- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts` (`24/24`)
- `node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts`
- `npm run build`
- `git diff --check`

### Notes

- `011`, `903`은 검색/alias 호환만 유지하며 지도 hit-area로 렌더링하지 않습니다. 새 공식 PNG 또는 운영자 승인 좌표가 제공될 때만 `89 LOCKED_VERIFIED` 목표로 재트레이싱합니다.
- 외부 검색/크롤링/추정 좌표로 보정하지 않았습니다.
- `npm run test:stadium:seatmaps` 전체 gate는 사직 외 수원 baseline export 누락 때문에 현재 clean HEAD에서 차단됩니다. 사직 PR에는 수원 보정을 섞지 않고 별도 baseline fix로 분리합니다.
