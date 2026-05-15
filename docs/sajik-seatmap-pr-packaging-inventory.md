# 사직 좌석도 v2 PR 패키징 인벤토리

작성일: 2026-05-12 KST
v2+ 갱신일: 2026-05-14 KST

## 목적

사직구장 폴리곤 v2 정밀화와 픽셀 정합 검증을 PR 가능한 단위로 분리하기 위한 변경 범위 인벤토리다.
현재 워크트리에는 여러 구장 작업, 공통 seatmap shell, 예측/SEO/build 변경이 함께 섞여 있으므로 그대로 한 PR에 올리면 리뷰 범위가 과도해진다.

## 현재 사직 기준

- 공식 asset: `src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png`
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
- hit-area 확장 후보: 홈플레이트/얇은 1루 블럭 중심의 `SAJIK_HITPATH_EXPANSION_CANDIDATE_SECTION_IDS`를 dataset에 표시하되, 이번 기준에서는 승인된 별도 확장 좌표가 없어 `hitPath === visualPath`를 유지한다.
- runtime layer: 일반 seat path 84개, accessibility marker 3개, alias-only rendered 0개를 고정한다.
- 휠체어석 3개는 기존 selectable block 상세/검색 호환성을 유지하되 일반 seat path layer가 아니라 accessibility marker layer에서 렌더링한다.
- 브라우저 label-coordinate QA는 `84 seat paths + 3 accessibility markers = 87` target 렌더링과 클릭 정합을 검증하고, `011/903`은 alias-only 데이터로만 유지한다.
- 외부 야구 데이터 수집, 웹 검색, 크롤링 기반 좌표 보정은 사용하지 않는다.

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
| `scripts/sajik-seatmap-editor-regression.mjs` | 포함 | editor v1.7 브라우저 회귀 검증, add/delete/drag/fail-lock/marker/alias 계약 확인 |
| `scripts/sajik-seatmap-hitpath-candidate-review.mjs` | 포함 | P0/P1/P2 hitPath 확장 후보, alias-only 예외, `visualPath === hitPath` 유지 상태를 report로 고정 |
| `scripts/sajik-seatmap-zone-precision-worksets.mjs` | 포함 | P0-A/P0-B/P0-C/P1-A/P1-B/P2-A 구역별 정밀화 순서와 `723/914/922` regression guard를 report로 고정 |
| `scripts/sajik-seatmap-stage01-operator-package.mjs` | 포함 | Stage 01 `P0-A/P0-B/P0-C` 16개 operator input/checklist 패키지 생성 |
| `scripts/sajik-seatmap-stage01-operator-input-aid.mjs` | 포함 | Stage 01 operator 입력의 누락 필드/decision 상태를 prewrite 전에 read-only로 정리 |
| `scripts/sajik-seatmap-stage01-review-board.mjs` | 포함 | Stage 01 review board, entry sheet, overlay SVG를 read-only로 생성하고 `operatorDecisionOptions`/`patchPreviewEligible` 입력 안내를 고정 |
| `scripts/sajik-seatmap-stage01-prewrite.mjs` | 포함 | Stage 01 승인 row만 patch preview로 검증하고 before/after geometry delta review와 production data write 차단을 고정 |
| `scripts/sajik-seatmap-stage01-apply-ready.mjs` | 포함 | Stage 01 prewrite 산출물을 다시 검증해 수동 data patch 후보만 review-ready로 분리 |
| `scripts/sajik-seatmap-stage01-post-apply-audit.mjs` | 포함 | Stage 01 patch preview가 현재 production dataset에 실제 반영됐는지 read-only로 검증 |
| `scripts/sajik-seatmap-stage01-operator-status.mjs` | 포함 | Stage 01 operator input/prewrite/apply-ready/post-apply 결과를 row-level 상태판과 manual patch checklist로 통합 |
| `scripts/sajik-seatmap-stage01-manual-patch-plan.mjs` | 포함 | Stage 01 `NOT_APPLIED` row를 수동 source patch 계획, writable/locked source field, TS fragment로 정리 |
| `scripts/sajik-seatmap-stage01-real-approval-readiness.mjs` | 포함 | 실제 Stage 01 operator input의 승인 row를 읽어 `APPROVED_READY/NOT_APPLIED/APPLIED/BLOCKED` readiness와 source edit 안전 조건을 검증 |
| `scripts/sajik-seatmap-stage01-prewrite-smoke.mjs` | 포함 | no-delta/delta 승인, invalid, alias-marker, decision row, readiness tamper, operator input 보존 fixture로 Stage 01 branch를 검증하는 smoke gate |
| `scripts/sajik-seatmap-stage01-approved-dry-run.mjs` | 포함 | `021` approved row 1건을 dry-run 입력으로 만들어 prewrite/apply-ready/post-apply/operator-status/manual-patch-plan/readiness 상태 전이를 end-to-end 검증 |
| `scripts/sajik-seatmap-marker-transition-review.mjs` | 포함 | 휠체어석 layer split, marker/section 호환 상태와 `markerOnlyApplied=false` 정책을 report로 고정 |
| `scripts/sajik-seatmap-pr-scope-guard.mjs` | 포함 | mixed worktree에서 사직 PR 포함/제외 파일과 부분 staging 필요 파일을 report로 고정 |
| `scripts/sajik-seatmap-alignment-audit.mjs` | 포함 | 사직 alignment audit가 공통 polygon 유틸과 `visualPath`/`hitPath`를 사용 |
| `scripts/sajik-seatmap-review-manifest.mjs` | 포함 | manifest가 normalized geometry와 section metadata를 기록 |
| `docs/sajik-seatmap-editor-v17-operator-guide.md` | 포함 | editor v1.7 사용 절차, FAIL fixture, copy/export 수동 적용 절차 |
| `docs/sajik-seatmap-editor-v18-roadmap.md` | 포함 | editor v1.8 후속 범위와 이번 PR 제외 조건을 문서화 |
| `docs/sajik-seatmap-hitpath-candidate-review.md` | 포함 | `hitPathExpansionCandidate` 후보 우선순위와 후속 확장 승인 기준 |
| `docs/sajik-seatmap-marker-only-transition.md` | 포함 | 휠체어석 marker-only 전환 설계와 후속 QA 항목 |
| `docs/sajik-seatmap-release-lock.md` | 포함 | v2+ 기준값, validator 운영 규칙, 최신 검증 결과 |
| `docs/sajik-seatmap-stage01-handoff.md` | 포함 | Stage 01 승인 입력, 수동 patch checklist, Stage 02 진입 조건 |
| `package.json` | 부분 포함 | `stadium:sajik:dataset-export`, `stadium:sajik:editor-regression`, `stadium:sajik:hitpath-review`, `stadium:sajik:zone-precision-worksets`, `stadium:sajik:stage01-operator-package`, `stadium:sajik:stage01-operator-input-aid`, `stadium:sajik:stage01-review-board`, `stadium:sajik:stage01-prewrite`, `stadium:sajik:stage01-apply-ready`, `stadium:sajik:stage01-post-apply-audit`, `stadium:sajik:stage01-operator-status`, `stadium:sajik:stage01-manual-patch-plan`, `stadium:sajik:stage01-real-approval-readiness`, `stadium:sajik:stage01-prewrite-smoke`, `stadium:sajik:stage01-approved-dry-run`, `stadium:sajik:marker-transition-review`, `stadium:sajik:pr-scope-guard`, `qa:stadium:sajik:polygon-v2` script hunk만 포함 |
| `scripts/stadium-ux-audit.mjs` | 부분 포함 | 사직 label-coordinate QA에서 `data-map-interaction-status`를 읽는 hunk만 포함 |

주의: `scripts/stadium-ux-audit.mjs`에는 현재 수원 QA 확장 hunk가 함께 존재한다. 사직 PR에서는 해당 수원 hunk를 stage하지 말고, `verifySajikOverlayClicks` 내부의 `mapInteractionStatus` 읽기/반환 hunk만 선택한다. `package.json`도 광주/대구 hunk가 함께 존재하므로 사직 dataset export script hunk만 선택한다.

`scripts/sajik-seatmap-pr-scope-guard.mjs`는 공통 seatmap shell migration, 비사직 구장 UI, `src/components/sajik/SajikSeatMap.tsx` first-visit/runtime UX 변경을 `separateDirtyWork`로 분류한다. 사직 polygon v2 release-lock PR의 포함 파일 수는 37개로 고정한다.

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
| `package.json` | `stadium:sajik:dataset-export`, `stadium:sajik:editor-regression`, `stadium:sajik:hitpath-review`, `stadium:sajik:zone-precision-worksets`, `stadium:sajik:stage01-operator-package`, `stadium:sajik:stage01-operator-input-aid`, `stadium:sajik:stage01-review-board`, `stadium:sajik:stage01-prewrite`, `stadium:sajik:stage01-apply-ready`, `stadium:sajik:stage01-post-apply-audit`, `stadium:sajik:stage01-operator-status`, `stadium:sajik:stage01-manual-patch-plan`, `stadium:sajik:stage01-real-approval-readiness`, `stadium:sajik:stage01-prewrite-smoke`, `stadium:sajik:stage01-approved-dry-run`, `stadium:sajik:marker-transition-review`, `stadium:sajik:pr-scope-guard`, `qa:stadium:sajik:polygon-v2` | `stadium:gwangju:*`, `qa:stadium:gwangju:*`, `stadium:daegu:*`, `qa:stadium:daegu:*` |
| `src/components/StadiumGuideRuntimeSeatMaps.test.ts` | 사직 release lock test의 package script/release lock/editor v1.8 exclusion assertions | 공통 seatmap shell, 대전 anchor crop, 광주 release/operator, 대구 operator/precision assertions |
| `scripts/stadium-ux-audit.mjs` | 사직 label-coordinate QA의 `mapInteractionStatus` 읽기/반환 및 alias-only hit-area 제외 검증 | 수원 등 비사직 QA flow 확장 |
| `src/components/AppRoutes.tsx` | `SajikSeatMapEditor` import와 `import.meta.env.DEV`로 제한된 `/internal/sajik-seatmap-editor` route | production navigation 노출, 비사직 route 변경 |

## PR staging manifest

`npm run stadium:sajik:pr-scope-guard`는 `reports/stadium/sajik-seatmap-pr-scope-guard.{json,md}`에 `stagingManifest`를 생성한다.

- `releasePayloadFileCount=37`
- `doesNotRunGitAdd=true`
- `safeToRunBulkGitAdd=false`
- `requiresManualHunkReview=true`
- whole-file review 대상은 `expectedIncludedFiles` 중 partial staging 대상 4개를 제외한 사직 전용 파일이다.
- partial hunk review 대상은 `package.json`, `src/components/StadiumGuideRuntimeSeatMaps.test.ts`, `scripts/stadium-ux-audit.mjs`, `src/components/AppRoutes.tsx`다.
- excluded artifacts는 `reports/stadium/sajik-seatmap-*`, `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`, `dist/*`, `output/playwright/*`, `../output/playwright/*`다.
- forbidden staging commands는 `git add .`, `git add package.json src/components/StadiumGuideRuntimeSeatMaps.test.ts`, `git add reports dist output`이다.

staging 이후에는 `npm run stadium:sajik:pr-scope-guard`, 사직 focused node tests, `git diff --check`, 필요 시 `npm run qa:stadium:sajik:polygon-v2`를 다시 실행한다.

## 최종 PR staging 요약

사직 polygon v2+ PR의 source of truth는 `scripts/sajik-seatmap-pr-scope-guard.mjs`의 `expectedIncludedFiles` 37개다. 같은 파일에 다른 구장 hunk가 섞인 경우에는 아래 기준으로만 선택한다.

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

주의: `scripts/sajik-seatmap-pixel-components.mjs`, `scripts/sajik-seatmap-evidence-crops.mjs`, `scripts/sajik-seatmap-advisory-playwright-review.mjs`는 release gate에서 계속 사용하지만 현재 v2+ dirty payload에는 포함되지 않는다. 해당 파일에 새 diff가 생기면 scope guard의 expected list를 먼저 갱신해야 한다.

## 분리 권장 변경

아래 변경은 사직 polygon release lock과 직접 묶지 않는 것이 좋다.

| 범위 | 대표 파일 | 권장 처리 |
| --- | --- | --- |
| 사직 처음 방문 가이드 UX | `src/components/sajik/SajikSeatMap.tsx`, `src/components/sajik/SajikSeatMap.test.ts` | 사직 UX PR로 분리하거나, 이번 PR에 포함한다면 설명에 별도 섹션으로 명시 |
| editor v1.8 구현 | `src/components/sajik/SajikSeatMapEditor.tsx`, editor regression 확장 | 이번 PR은 roadmap만 포함하고 구현은 별도 editor PR로 분리 |
| 실제 hitPath 좌표 확장 | `src/data/sajikSeatData.ts`, editor patch payload | 후보/검증 report만 포함하고 승인 좌표 적용은 별도 좌표 PR로 분리 |
| 완전 marker-only 데이터 모델 전환 | `src/data/sajikSeatData.ts`, dataset marker-only migration, marker adjacent click QA | 이번 PR은 layer 분리와 selectable 호환 유지까지만 포함하고, 기존 selectable block 제거는 별도 접근성 PR로 분리 |
| 공통 seatmap shell migration | `src/components/stadiumSeatMap/*`, `src/components/stadiumSeatMapRegistry.tsx`, 삭제된 `src/components/ui/stadiumSeatMap*` | 별도 infra PR |
| 타 구장 UI 및 operator workflow | `src/components/{changwon,daejeon,gocheok,incheon,jamsil,suwon}/*`, `scripts/*seatmap-*`, `docs/*seatmap-*`, 각 구장 data/component | 구장별 또는 공통 shell PR로 분리 |
| Prediction/schedule changes | `src/components/prediction/*`, `src/hooks/usePredictionSchedule.ts`, `src/api/prediction*` | 별도 feature PR |
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
"stadium:sajik:pixel-components": "node --import tsx scripts/sajik-seatmap-pixel-components.mjs",
"stadium:sajik:alignment-audit": "npm run stadium:sajik:pixel-components && node --import tsx scripts/sajik-seatmap-alignment-audit.mjs",
"stadium:sajik:trace-manifest": "node --import tsx scripts/sajik-seatmap-review-manifest.mjs",
"stadium:sajik:evidence": "npm run stadium:sajik:pixel-components && node --import tsx scripts/sajik-seatmap-alignment-audit.mjs --allow-failures && npm run stadium:sajik:trace-manifest && node --import tsx scripts/sajik-seatmap-evidence-crops.mjs",
"stadium:sajik:advisory-playwright": "npm run stadium:sajik:pixel-components && node --import tsx scripts/sajik-seatmap-alignment-audit.mjs --allow-failures && node --import tsx scripts/sajik-seatmap-advisory-playwright-review.mjs",
"stadium:sajik:dataset-export": "node --import tsx scripts/sajik-seatmap-export-dataset.mjs",
"stadium:sajik:editor-regression": "node scripts/sajik-seatmap-editor-regression.mjs",
"stadium:sajik:hitpath-review": "node --import tsx scripts/sajik-seatmap-hitpath-candidate-review.mjs",
"stadium:sajik:zone-precision-worksets": "npm run stadium:sajik:hitpath-review && node --import tsx scripts/sajik-seatmap-zone-precision-worksets.mjs",
"stadium:sajik:stage01-operator-package": "npm run stadium:sajik:zone-precision-worksets && node --import tsx scripts/sajik-seatmap-stage01-operator-package.mjs",
"stadium:sajik:stage01-operator-input-aid": "npm run stadium:sajik:stage01-operator-package && node --import tsx scripts/sajik-seatmap-stage01-operator-input-aid.mjs",
"stadium:sajik:stage01-review-board": "npm run stadium:sajik:stage01-operator-input-aid && node --import tsx scripts/sajik-seatmap-stage01-review-board.mjs",
"stadium:sajik:stage01-prewrite": "npm run stadium:sajik:stage01-operator-package && node --import tsx scripts/sajik-seatmap-stage01-prewrite.mjs",
"stadium:sajik:stage01-apply-ready": "npm run stadium:sajik:stage01-prewrite && node --import tsx scripts/sajik-seatmap-stage01-apply-ready.mjs",
"stadium:sajik:stage01-post-apply-audit": "npm run stadium:sajik:stage01-apply-ready && node --import tsx scripts/sajik-seatmap-stage01-post-apply-audit.mjs",
"stadium:sajik:stage01-operator-status": "npm run stadium:sajik:stage01-post-apply-audit && node --import tsx scripts/sajik-seatmap-stage01-operator-status.mjs",
"stadium:sajik:stage01-manual-patch-plan": "npm run stadium:sajik:stage01-operator-status && node --import tsx scripts/sajik-seatmap-stage01-manual-patch-plan.mjs",
"stadium:sajik:stage01-real-approval-readiness": "npm run stadium:sajik:stage01-operator-input-aid && npm run stadium:sajik:stage01-manual-patch-plan && node --import tsx scripts/sajik-seatmap-stage01-real-approval-readiness.mjs",
"stadium:sajik:stage01-prewrite-smoke": "npm run stadium:sajik:stage01-operator-package && node --import tsx scripts/sajik-seatmap-stage01-prewrite-smoke.mjs",
"stadium:sajik:stage01-approved-dry-run": "npm run stadium:sajik:stage01-operator-package && node --import tsx scripts/sajik-seatmap-stage01-approved-dry-run.mjs",
"stadium:sajik:marker-transition-review": "node --import tsx scripts/sajik-seatmap-marker-transition-review.mjs",
"stadium:sajik:pr-scope-guard": "node scripts/sajik-seatmap-pr-scope-guard.mjs",
"qa:stadium:sajik:trace-review": "npm run stadium:sajik:evidence && node --import tsx scripts/sajik-seatmap-advisory-playwright-review.mjs && npm run qa:stadium:sajik:mobile && npm run stadium:sajik:alignment-audit",
"qa:stadium:sajik:mobile": "STADIUM_UX_FORCE_START_DEV_SERVER=1 STADIUM_UX_MANAGED_DEV_SERVER_PORT=5177 STADIUM_UX_VIEWPORTS=mobile-390,desktop-1440 STADIUM_UX_REVIEW_STADIUMS=SAJIK STADIUM_UX_SAJIK_DEEP_CHECK=1 VITE_SITE_URL=http://127.0.0.1:5177 VITE_API_BASE_URL=/api node scripts/stadium-ux-audit.mjs",
"qa:stadium:sajik:polygon-v2": "npm run stadium:sajik:dataset-export -- --check && npm run stadium:sajik:alignment-audit && npm run stadium:sajik:evidence && npm run stadium:sajik:hitpath-review && npm run stadium:sajik:zone-precision-worksets && npm run stadium:sajik:stage01-operator-input-aid && npm run stadium:sajik:stage01-review-board && npm run stadium:sajik:stage01-prewrite && npm run stadium:sajik:stage01-apply-ready && npm run stadium:sajik:stage01-post-apply-audit && npm run stadium:sajik:stage01-operator-status && npm run stadium:sajik:stage01-manual-patch-plan && npm run stadium:sajik:stage01-real-approval-readiness && npm run stadium:sajik:stage01-prewrite-smoke && npm run stadium:sajik:stage01-approved-dry-run && npm run stadium:sajik:marker-transition-review && node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts && node --import tsx --test --test-name-pattern \"사직|Sajik\" src/components/StadiumGuideRuntimeSeatMaps.test.ts && npm run stadium:sajik:editor-regression && npm run stadium:sajik:pr-scope-guard && npm run build"
```

`scripts/run-stadium-isolated-qa.mjs`는 이번 clean 사직 PR 구성에 포함하지 않는다.

## 최신 검증 상태

- `npm run stadium:sajik:alignment-audit`: PASS, `mapSelectable=87 aliasOnlyNotVisible=2 locked=87 notVisible=2 retrace=0 officialFailures=0 thinOutsideFailures=0`
- `npm run stadium:sajik:evidence`: PASS, P0 `143` boundary-lock, `132/142/143`, `123/133/143`, `011` alias-only no-hit-area focus crop 생성 확인
- `npm run qa:stadium:sajik:trace-review`: PASS, isolated Sajik browser QA 통과, `status:passed`
- `npm run stadium:sajik:dataset-export -- --check`: PASS, `sections=89 enabled=87 aliasOnly=2 markers=3`
- `npm run stadium:sajik:hitpath-review`: PASS, `candidates=22 p0=16 p1=5 p2=1 aliasOnly=2 visualEqualsHit=22 expanded=0 blockers=0`
- `npm run stadium:sajik:zone-precision-worksets`: PASS, `status=waiting-for-operator candidates=22 p0=16 p1=5 p2=1 guards=3 expanded=0 blockers=0`
- `npm run stadium:sajik:stage01-operator-package`: PASS, `status=waiting-for-operator rows=16 approved=0 preserved=0 preservation=no-existing-input blockers=0`
- `npm run stadium:sajik:stage01-operator-input-aid`: PASS, `status=waiting-for-operator ready=0 approved=0 pending=16 rejected=0 needsRetrace=0 keepCurrent=0 invalid=0 blockers=0`, pending `nextAction=FILL_OR_DECIDE`
- `npm run stadium:sajik:stage01-review-board`: PASS, `status=waiting-for-operator rows=16 pending=16 ready=0 invalid=0 blockers=0 sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-prewrite`: PASS, `status=waiting-for-operator rows=16 approved=0 valid=0 patchPreview=0 blockers=0`
- `npm run stadium:sajik:stage01-apply-ready`: PASS, `status=waiting-for-operator approved=0 patchPreview=0 productionDataChanged=false`
- `npm run stadium:sajik:stage01-post-apply-audit`: PASS, `status=waiting-for-operator approvedPatchPayloads=0 applied=0 unapplied=0 readOnly=true`
- `npm run stadium:sajik:stage01-operator-status`: PASS, `status=waiting-for-operator approved=0 applied=0 notApplied=0 pending=16 invalid=0 blockers=0`
- `npm run stadium:sajik:stage01-manual-patch-plan`: PASS, `status=waiting-for-operator manualPatchRows=0 approved=0 applied=0 notApplied=0 blockers=0`
- `npm run stadium:sajik:stage01-real-approval-readiness`: PASS, `status=waiting-for-operator approved=0 ready=0 notApplied=0 applied=0 blocked=0 manualPatchRows=0 blockers=0 sourceDataWritePerformed=false`
- `npm run stadium:sajik:stage01-prewrite-smoke`: PASS, `cases=13/13 operatorPackagePreservationPassed=true preservationStatus=preserved productionDataChanged=false`, `approved-with-delta` fixture rowStatus `NOT_APPLIED`, readiness `APPROVED_NOT_APPLIED`, `approved-applied-after-manual-patch` fixture rowStatus `APPLIED`, readiness `APPROVED_APPLIED`, `approved-no-delta` readiness `APPROVED_APPLIED`, input aid action `RUN_PREWRITE`, manual patch plan action `MANUAL_PATCH_REQUIRED`, decision row fixture `REJECTED/NEEDS_RETRACE/KEEP_CURRENT`, invalid path/label/unknown section fixtures blocked, tampered readiness fixtures block `VISUAL_PATH_CHANGED_WITHOUT_APPROVAL` and `TARGET_SOURCE_FILE_MISMATCH`
- `npm run stadium:sajik:stage01-approved-dry-run`: PASS, `target=021`, `prewrite=ready-for-data-patch`, `applyReady=ready-for-manual-apply`, `postApply=not-applied`, `readiness=ready-for-manual-apply`, `readinessRow=APPROVED_NOT_APPLIED`, `manualPatchRows=1`, `sourceDataWritePerformed=false`, `productionWriteAllowed=false`
- `npm run stadium:sajik:marker-transition-review`: PASS, `markers=3 sections=3 seatPaths=84 markerLayer=3 aliasRendered=0 positionLocks=3 selectableCompat=3 markerOnlyApplied=false blockers=0`
- `npm run stadium:sajik:editor-regression`: PASS, editor v1.7 browser regression `status:passed checks=11`
- `npm run stadium:sajik:pr-scope-guard`: BLOCKED in current partial worktree, `status=blocked`, `included=6`, `separate=42`, `unexpected=0`, `blockers=31`, patch separation `blocked`; blocker cause is missing full Sajik v2 release payload files, not Stage 01 readiness failure.
- `npm run qa:stadium:sajik:polygon-v2`: BLOCKED at `stadium:sajik:pr-scope-guard` in current partial worktree after dataset/export/alignment/evidence/hitPath review/Stage 01 operator-input-aid/review-board/prewrite/apply-ready/post-apply/operator-status/manual-patch-plan/readiness/smoke/approved dry-run/marker transition review/Sajik-focused node tests/editor regression passed.
- `VITE_SITE_URL=http://127.0.0.1:5176 VITE_API_BASE_URL=/api npm run build`: PASS
- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts`: PASS, `24/24`
- `node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts`: PASS, focused StadiumGuide Sajik contract
- `node --import tsx --test src/components/StadiumGuideRuntimeSeatMaps.test.ts`: BLOCKED by unrelated Gwangju release lock dirty mismatch, `included=37`. 사직 focused contract는 별도 command로 PASS.
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
- `scripts/sajik-seatmap-pr-scope-guard.mjs`는 git staging을 수행하지 않고 `reports/stadium/sajik-seatmap-pr-scope-guard.{json,md}`만 생성합니다.
- `qa:stadium:sajik:polygon-v2` 스크립트는 dataset export check, alignment audit, evidence, hitPath review, Stage 01 operator-input-aid/review-board/prewrite/apply-ready/post-apply/operator-status/manual-patch-plan/readiness/smoke/approved dry-run, marker transition review, 사직 focused node tests, editor regression, scope guard, build를 묶은 사직 polygon v2+ 게이트입니다.
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
- `npm run stadium:sajik:dataset-export -- --check`
- `npm run stadium:sajik:hitpath-review`
- `npm run stadium:sajik:stage01-operator-input-aid`
- `npm run stadium:sajik:stage01-review-board`
- `npm run stadium:sajik:stage01-post-apply-audit`
- `npm run stadium:sajik:stage01-operator-status`
- `npm run stadium:sajik:stage01-manual-patch-plan`
- `npm run stadium:sajik:stage01-real-approval-readiness`
- `npm run stadium:sajik:stage01-approved-dry-run`
- `npm run stadium:sajik:marker-transition-review`
- `npm run stadium:sajik:editor-regression`
- `npm run stadium:sajik:pr-scope-guard`
- `npm run qa:stadium:sajik:polygon-v2`
- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts` (`23/23`)
- `node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts`
- `npm run build`
- `git diff --check`

### Notes

- `011`, `903`은 검색/alias 호환만 유지하며 지도 hit-area로 렌더링하지 않습니다. 새 공식 PNG 또는 운영자 승인 좌표가 제공될 때만 `89 LOCKED_VERIFIED` 목표로 재트레이싱합니다.
- 외부 검색/크롤링/추정 좌표로 보정하지 않았습니다.
- `npm run test:stadium:seatmaps` 전체 gate는 사직 외 수원 baseline export 누락 때문에 현재 clean HEAD에서 차단됩니다. 사직 PR에는 수원 보정을 섞지 않고 별도 baseline fix로 분리합니다.
