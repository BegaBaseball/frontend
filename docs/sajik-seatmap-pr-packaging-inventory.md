# 사직 좌석도 v2 PR 패키징 인벤토리

작성일: 2026-05-12 KST

## 목적

사직구장 폴리곤 v2 정밀화와 픽셀 정합 검증을 PR 가능한 단위로 분리하기 위한 변경 범위 인벤토리다.
현재 워크트리에는 여러 구장 작업, 공통 seatmap shell, 예측/SEO/build 변경이 함께 섞여 있으므로 그대로 한 PR에 올리면 리뷰 범위가 과도해진다.

## 현재 사직 기준

- 공식 asset: `src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png`
- 좌표계: `960x640`
- trace source: `OFFICIAL_PNG_MANUAL_POLYGON`
- trace version: `manual-polygon-v2`
- alignment result: `87 LOCKED_VERIFIED`, `2 OFFICIAL_PNG_BLOCK_NOT_VISIBLE`, `0 RETRACE_REQUIRED`, `0 officialFailures`
- 공식 PNG 미표시 예외: `011`, `903`
- 브라우저 label-coordinate QA는 전체 89개 렌더링을 확인하고, 클릭 정합은 `PIXEL_ALIGNED` 87개만 검증한다.
- 외부 야구 데이터 수집, 웹 검색, 크롤링 기반 좌표 보정은 사용하지 않는다.

## 현재 worktree 주의

- 사직 PR용 clean worktree: `/Users/mac/project/KBO_platform/bega_frontend_sajik_pr`
- branch: `sajik-seatmap-v2-pr`
- 메인 dirty worktree의 공통 seatmap shell, isolated QA runner, Incheon guide, prediction, SEO/build 변경은 포함하지 않는다.
- 이 clean worktree에서는 `scripts/run-stadium-isolated-qa.mjs`를 포함하지 않고, 사직 QA가 `scripts/stadium-ux-audit.mjs`를 직접 실행한다.
- `reports/*`, `dist/*`, `output/playwright/*`, `node_modules`는 재생성 산출물이므로 PR 범위에서 제외한다.

## 추천 PR 구성

### PR: Sajik polygon v2 release lock

사직 v2 release lock은 아래 파일을 중심으로 구성한다.

| 경로 | 포함 판단 | 이유 |
| --- | --- | --- |
| `src/data/sajikSeatData.ts` | 포함 | 89개 block polygon, `011/903` 예외, trace metadata, guide/search helper 계약 |
| `src/data/sajikSeatData.test.ts` | 포함 | alignment thresholds, 예외 목록, reference lock, label top-hit, self-intersection gate |
| `scripts/sajik-seatmap-pixel-components.mjs` | 포함 | 로컬 공식 PNG 기반 색상 component 후보 생성 |
| `scripts/sajik-seatmap-alignment-audit.mjs` | 포함 | strict alignment audit와 `OFFICIAL_PNG_BLOCK_NOT_VISIBLE` 분류 |
| `scripts/sajik-seatmap-review-manifest.mjs` | 포함 | P0/P1/P2 trace manifest와 release 수치 생성 |
| `scripts/sajik-seatmap-evidence-crops.mjs` | 포함 | P0/P1/P2 및 확대 crop evidence 생성 |
| `scripts/sajik-seatmap-advisory-playwright-review.mjs` | 포함 | `011/903` advisory Playwright review 산출 |
| `docs/sajik-seatmap-release-lock.md` | 포함 | release lock 수치, 예외 블럭, 산출물, 차단 조건 고정 |
| `src/components/StadiumGuideRuntimeSeatMaps.test.ts` | 부분 포함 | 사직 release lock 문서/스크립트 계약만 선별 |
| `scripts/stadium-ux-audit.mjs` | 포함 | clean base의 외부 `../output/playwright/stadium-ux-audit.mjs` 의존을 제거하고 사직 label-coordinate QA에서 `PIXEL_ALIGNED` 87개 클릭 검증 |
| `package.json` | 부분 포함 | `stadium:sajik:*`, `qa:stadium:sajik:*`, 필요 시 `test:stadium:seatmaps` concurrency만 선별 |

주의: `package.json`, `scripts/stadium-ux-audit.mjs`, `src/components/StadiumGuideRuntimeSeatMaps.test.ts`는 다른 구장/공통 infra 변경과 섞인 파일이다. 사직 PR만 만들려면 `git add -p` 또는 별도 작업트리에서 선택 staging이 필요하다.

## 분리 권장 변경

아래 변경은 사직 polygon release lock과 직접 묶지 않는 것이 좋다.

| 범위 | 대표 파일 | 권장 처리 |
| --- | --- | --- |
| 사직 처음 방문 가이드 UX | `src/components/sajik/SajikSeatMap.tsx`, `src/components/sajik/SajikSeatMap.test.ts` | 사직 UX PR로 분리하거나, 이번 PR에 포함한다면 설명에 별도 섹션으로 명시 |
| 공통 seatmap shell migration | `src/components/stadiumSeatMap/*`, `src/components/stadiumSeatMapRegistry.tsx`, 삭제된 `src/components/ui/stadiumSeatMap*` | 별도 infra PR |
| Changwon/Daegu/Daejeon/Gwangju operator workflow | `scripts/*seatmap-*`, `docs/*seatmap-*`, 각 구장 data/component | 구장별 별도 PR |
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

- `reports/stadium/sajik-seatmap-evidence-p0-retraced-3b-upper.png`
- `reports/stadium/sajik-seatmap-evidence-p0-central-lower-011-review.png`
- `reports/stadium/sajik-seatmap-evidence-p1-retraced-everytime.png`

## 선택 staging 메모

사직 PR에 필요한 package script:

```json
"stadium:sajik:pixel-components": "node --import tsx scripts/sajik-seatmap-pixel-components.mjs",
"stadium:sajik:alignment-audit": "npm run stadium:sajik:pixel-components && node --import tsx scripts/sajik-seatmap-alignment-audit.mjs",
"stadium:sajik:trace-manifest": "node --import tsx scripts/sajik-seatmap-review-manifest.mjs",
"stadium:sajik:evidence": "npm run stadium:sajik:pixel-components && node --import tsx scripts/sajik-seatmap-alignment-audit.mjs --allow-failures && npm run stadium:sajik:trace-manifest && node --import tsx scripts/sajik-seatmap-evidence-crops.mjs",
"stadium:sajik:advisory-playwright": "npm run stadium:sajik:pixel-components && node --import tsx scripts/sajik-seatmap-alignment-audit.mjs --allow-failures && node --import tsx scripts/sajik-seatmap-advisory-playwright-review.mjs",
"qa:stadium:sajik:trace-review": "npm run stadium:sajik:evidence && node --import tsx scripts/sajik-seatmap-advisory-playwright-review.mjs && npm run qa:stadium:sajik:mobile && npm run stadium:sajik:alignment-audit",
"qa:stadium:sajik:mobile": "STADIUM_UX_FORCE_START_DEV_SERVER=1 STADIUM_UX_MANAGED_DEV_SERVER_PORT=5177 STADIUM_UX_VIEWPORTS=mobile-390,desktop-1440 STADIUM_UX_REVIEW_STADIUMS=SAJIK STADIUM_UX_SAJIK_DEEP_CHECK=1 VITE_SITE_URL=http://127.0.0.1:5177 VITE_API_BASE_URL=/api node scripts/stadium-ux-audit.mjs"
```

`scripts/run-stadium-isolated-qa.mjs`는 이번 clean 사직 PR 구성에 포함하지 않는다.

## 최신 검증 상태

- `npm run stadium:sajik:alignment-audit`: PASS, `locked=87 notVisible=2 retrace=0 officialFailures=0`
- `npm run qa:stadium:sajik:trace-review`: PASS, mobile 390 + desktop 1440 Playwright QA 통과, `status:passed`
- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts src/components/StadiumGuideRuntimeSeatMaps.test.ts`: PASS, `23/23`
- `npm run test:stadium:seatmaps`: BLOCKED by unrelated clean HEAD Suwon baseline mismatch, `SUWON_HIT_GEOMETRY_EXCEPTION_NOTES` export 누락. 사직 항목은 해당 run 안에서 모두 PASS.
- `npm run build`: PASS
- `git diff --check`: PASS

기존 Vite warning:

- `src/utils/clientErrorReporter.ts`가 dynamic import와 static import 양쪽에서 참조된다는 warning은 남아 있다.
- 현재 사직 release lock 기준에서는 exit code 0이면 차단 조건으로 보지 않는다.

## PR 설명 초안

### Summary

- 사직 좌석도 89개 hit-area를 공식 2026 PNG 기준 `manual-polygon-v2`로 고정했습니다.
- 공식 PNG 색상 블럭이 확인되는 87개는 `LOCKED_VERIFIED`로 잠그고, 공식 PNG에서 독립 블럭이 보이지 않는 `011`, `903`은 `OFFICIAL_PNG_BLOCK_NOT_VISIBLE` 운영 호환 예외로 분리했습니다.
- Playwright label-coordinate QA는 전체 89개 SVG 렌더링을 확인하되, 실제 클릭 정합은 `PIXEL_ALIGNED` 87개만 검증합니다.

### Key Changes

- `SAJIK_BLOCKS` polygon/reference/label anchor를 v2 기준으로 고정했습니다.
- `SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS = ['011', '903']` 계약을 추가했습니다.
- 사직 전용 pixel component, alignment audit, trace manifest, evidence crop, advisory Playwright review 스크립트를 추가했습니다.
- release lock 문서에 `87 locked / 2 notVisible / 0 retrace / 0 officialFailures` 기준과 차단 조건을 고정했습니다.

### Verification

- `npm run stadium:sajik:alignment-audit`
- `npm run qa:stadium:sajik:trace-review`
- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts src/components/StadiumGuideRuntimeSeatMaps.test.ts`
- `npm run build`
- `git diff --check`

### Notes

- `011`, `903`은 새 공식 PNG 또는 운영자 승인 좌표가 제공될 때만 `89 LOCKED_VERIFIED` 목표로 재트레이싱합니다.
- 외부 검색/크롤링/추정 좌표로 보정하지 않았습니다.
- `npm run test:stadium:seatmaps` 전체 gate는 사직 외 수원 baseline export 누락 때문에 현재 clean HEAD에서 차단됩니다. 사직 PR에는 수원 보정을 섞지 않고 별도 baseline fix로 분리합니다.
