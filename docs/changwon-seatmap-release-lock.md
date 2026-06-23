# 창원 NC파크 좌석도 release lock

검수 고정일: 2026-05-10 KST

최신 릴리즈 후보: `docs/changwon-seatmap-release-candidate.md` (2026-05-11 KST)

## 기준

- 공식 asset: `src/assets/stadiums/nc/changwon-nc-seatmap-official-2026.webp`
- 공식 이미지 좌표계: `1960x2546`
- 기준 데이터: `CHANGWON_IMAGE_GEOMETRY`, `CHANGWON_OFFICIAL_TRACE_REFERENCE`, `CHANGWON_BLOCKS`
- trace source: `OFFICIAL_PNG_MANUAL_POLYGON`
- trace version: `manual-polygon-v2`
- browser QA source: `scripts/stadium-ux-audit.mjs`

## 고정 상태

- `totalBlocks=123`
- `expectedVisibleBlocks=117`
- `specialSelectableAreas=6`
- `searchableSelectableAreas=123`
- `generatedScaledTrace=0`
- `manualReviewed=123`
- `topHitMismatches=0`
- `expandedHitAreaInterceptWarnings=0`
- `representativeProbeMismatches=0`
- `foreignLabelAnchors=0`
- `overlapWarnings=0`
- `needsTraceAdjustment=0`
- `confirmedHumanSignoff=11`
- `pendingHumanSignoff=0`
- `traceAdjustmentCandidates=[]`

## 기준 산출물

- Trace manifest: `reports/stadium/changwon-seatmap-trace-review.json`
- Trace summary: `reports/stadium/changwon-seatmap-trace-review.md`
- Visual approval: `reports/stadium/changwon-seatmap-visual-approval.json`
- Visual approval summary: `reports/stadium/changwon-seatmap-visual-approval.md`
- UX readiness: `reports/stadium/changwon-seatmap-ux-readiness.json`
- UX readiness summary: `reports/stadium/changwon-seatmap-ux-readiness.md`
- Stack overlays:
  - `reports/stadium/changwon-seatmap-trace-review-special-first-base-stack-clean-overlay.png`
  - `reports/stadium/changwon-seatmap-trace-review-special-third-base-stack-clean-overlay.png`
  - `reports/stadium/changwon-seatmap-trace-review-special-outfield-stack-clean-overlay.png`

## 운영 규칙

- 이 문서 기준 상태에서는 NC파크 좌석 polygon 전수 재트레이싱을 진행하지 않는다.
- 사람이 명확한 시각 불일치나 클릭 충돌을 발견하면 해당 block 또는 stack만 `NEEDS_TRACE_ADJUSTMENT`로 분류한다.
- `NEEDS_TRACE_ADJUSTMENT` 항목은 targeted polygon adjustment로 처리하고, 전체 좌표 재작성 범위로 확대하지 않는다.
- 외부 야구 데이터 수집, 웹 검색, 제3자 좌석도 복사는 사용하지 않는다.
- 좌표 변경이 발생하면 trace manifest, visual approval package, isolated browser QA를 다시 생성한다.
- public npm command는 mobile runtime QA, release lock, status, trace manifest만 노출한다.
- UX readiness와 trace-review bundle은 dispatcher 내부 task로 유지한다.

## Public commands

- `npm run qa:stadium:changwon:mobile`
- `npm run qa:stadium:changwon:release-lock`
- `npm run stadium:changwon:status`
- `npm run stadium:changwon:trace-manifest`

## Internal dispatcher tasks

- `node scripts/stadium-seatmap-ops.mjs changwon ux-readiness`
- `node scripts/stadium-seatmap-ops.mjs changwon trace-review`

## 릴리즈 게이트

```bash
npm run qa:stadium:changwon:release-lock
npm run stadium:changwon:trace-manifest
node --import tsx --test src/components/StadiumGuideRuntimeSeatMaps.test.ts
npm run test:stadium:seatmaps
env VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build
```

릴리즈 차단 조건:

- `totalBlocks`가 `123`이 아니다.
- `confirmedHumanSignoff`가 `11`이 아니다.
- `pendingHumanSignoff`가 `0`이 아니다.
- `traceAdjustmentCandidates`가 비어 있지 않다.
- `topHitMismatches`, `expandedHitAreaInterceptWarnings`, `representativeProbeMismatches`, `foreignLabelAnchors`, `overlapWarnings` 중 하나라도 `0`이 아니다.
- `generatedScaledTrace`가 `0`이 아니다.
- `searchableSelectableAreas`가 `123`이 아니다.

## 최종 검증 결과

검증 실행일: 2026-05-11 KST

- `npm run stadium:changwon:trace-manifest`: PASS
  - `releaseClassification=PASS_WITH_APPROVED_EXCEPTION`
  - `total=123`
  - `generatedScaled=0`
  - `topHitMismatches=0`
  - `expandedHitAreaInterceptWarnings=0`
  - `representativeProbeMismatches=0`
  - `foreignLabelAnchors=0`
  - `overlapWarnings=0`
  - `needsTraceAdjustment=0`
  - `visualApprovalConfirmedHumanSignoff=11`
  - `visualApprovalPendingHumanSignoff=0`
- `node scripts/stadium-seatmap-ops.mjs changwon ux-readiness`: PASS
  - `searchableSelectableAreas=123`
  - `specialSelectableAreas=6`
  - `filterGroups=7`
  - `lowCoverageApprovedExceptions=8`
  - `blockers=0`
- `node --import tsx --test src/data/changwonSeatData.test.ts src/components/StadiumGuideRuntimeSeatMaps.test.ts`: PASS, 55 tests
- `node scripts/stadium-seatmap-ops.mjs changwon trace-review`: PASS
  - `Scenarios=2`
  - `Overflow failures=0`
  - `Actionable failed requests=0`
  - `Actionable console errors=0`
  - output: `output/playwright/stadium-ux-changwon-validate/stadium-mobile-smoke-summary.md`
- `npm run test:stadium:seatmaps`: PASS, 219 tests
  - Changwon release-lock, UX readiness, coordinate fingerprint, and stadium-wide seatmap contracts all passed.
- `env VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build`: PASS
  - 기존 `clientErrorReporter.ts` dynamic/static import warning은 exit code 0이면 release lock 차단 조건으로 보지 않는다.

## PR 포함 범위

- 포함: 이 문서, Changwon release-lock 테스트 계약, Changwon trace/visual approval 산출물.
- 제외: NC파크 polygon 좌표 변경, 런타임 UI/API 변경, 외부 야구 데이터 보강.
- generated overlay PNG는 팀의 artifact 커밋 정책에 맞춰 포함 여부를 결정하되, JSON/MD manifest 수치는 이 문서의 고정 상태와 일치해야 한다.
