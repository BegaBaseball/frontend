# NC파크 release-lock PR A 범위 고정

작성일: 2026-05-12 KST

## 목적

이 문서는 NC파크 좌석도 release-lock 변경을 첫 번째 PR로 분리하기 위한 실행 기준이다.
현재 워크트리에는 NC파크, 다른 구장, 공통 seatmap shell, 예측/SEO 변경이 함께 섞여 있으므로 현재 index 상태를 그대로 PR A로 사용하면 안 된다.

## 현재 분리 판단

- 기존 staged 변경에는 공통 seatmap shell, Incheon visit guide, runtime registry 삭제/이관이 포함되어 있어 PR A 전용 상태가 아니다.
- unstaged 변경에는 NC파크 release-lock과 함께 Daegu/Daejeon/Gwangju/Sajik, prediction, SEO/build guard 변경이 섞여 있다.
- 이번 단계에서는 index를 수정하지 않고, PR A에 포함할 파일과 선택 staging 기준만 고정한다.

## PR A에 포함할 전체 파일

아래 파일은 NC release-lock 또는 NC QA 재현성에 직접 필요하므로 PR A에 포함한다.

| 경로 | 포함 방식 | 비고 |
| --- | --- | --- |
| `docs/changwon-seatmap-release-lock.md` | 전체 | 최종 release-lock 계약 문서 |
| `docs/changwon-seatmap-release-candidate.md` | 전체 | release-lock 근거 문서 |
| `docs/changwon-seatmap-pr-packaging-inventory.md` | 전체 | 전체 변경 분리 인벤토리 |
| `docs/changwon-seatmap-pr-a-scope.md` | 전체 | PR A 실행 범위 고정 문서 |
| `scripts/changwon-seatmap-ops.mjs trace-manifest` | 전체 | trace manifest, visual approval 생성 |
| `scripts/changwon-seatmap-ops.mjs ux-readiness` | 전체 | NC UX readiness 생성 |
| `scripts/stadium-ux-audit.mjs` | 전체 | repo 내부 브라우저 QA 원본 |
| `scripts/run-stadium-isolated-qa.mjs` | 전체 | isolated QA runner와 `CHANGWON` 기본 포함 |
| `src/components/changwon/ChangwonSeatMap.tsx` | 전체 | 검색/필터/선택 UX |
| `src/components/changwon/ChangwonBottomSheet.tsx` | 전체 | 모바일 선택 상태 노출 |
| `src/components/changwon/ChangwonSeatMapSvg.tsx` | 전체 | hit-area/render 계약 |
| `src/data/changwonSeatData.ts` | 전체 | release-lock 좌표/검색/필터 데이터 |
| `src/data/changwonSeatData.test.ts` | 전체 | NC 데이터 계약 |

## PR A에서 선택 포함할 혼합 파일

### `package.json`

포함할 변경:

- `test:stadium:seatmaps`에 `--test-concurrency=1` 추가
- `qa:stadium:mobile`, `qa:stadium:mobile:smoke`를 `scripts/run-stadium-isolated-qa.mjs` 기반으로 전환
- `qa:stadium:changwon:mobile`
- `stadium:changwon:trace-manifest`
- `qa:stadium:mobile:attached`, `qa:stadium:mobile:smoke:attached`의 `scripts/stadium-ux-audit.mjs` 경로 전환

dispatcher 내부 task로만 유지:

- `node scripts/stadium-seatmap-ops.mjs changwon ux-readiness`
- `node scripts/stadium-seatmap-ops.mjs changwon trace-review`

제외할 변경:

- Gwangju operator script 묶음
- Daejeon release/operator script 묶음
- Daegu operator/corrections/retrace script 묶음
- Sajik trace/advisory script 묶음
- Jamsil/Suwon full/responsive script 추가가 PR A 설명 범위를 넘는 경우

비고: `scripts/run-stadium-isolated-qa.mjs`가 전체 구장 runner이므로 generic/mobile/smoke script 일부는 PR A에 들어갈 수 있다. 다만 구장별 operator workflow script는 NC release-lock과 분리한다.

### `src/components/StadiumGuideRuntimeSeatMaps.test.ts`

포함할 테스트 계약:

- repo 내부 `scripts/stadium-ux-audit.mjs` 존재와 runner 경로 계약
- `scripts/run-stadium-isolated-qa.mjs`의 stale summary 정리, retry, summary 경로 계약
- `창원 trace review 스크립트는 117개 숫자 블록과 특수 선택 구역 검수 산출물을 고정한다`
- `창원 좌석도 release lock 문서는 최종 검수 계약을 고정한다`
- `창원 좌석도 release candidate 문서는 UX+QA 고정 상태와 targeted adjustment 절차를 설명한다`
- Changwon preset contract 항목 자체

제외할 테스트 계약:

- Incheon PNG/WebP 좌표계 계약
- Suwon fixture fingerprint, full/responsive QA 계약
- Jamsil full/responsive QA 계약
- Daejeon release/operator 계약
- Gwangju operator 계약
- Daegu operator/corrections 계약
- Sajik release/advisory 계약
- 공통 seatmap shell migration 계약

비고: 이 파일은 diff가 매우 크므로 `git add -p` 기준으로 선택 staging한다. line number만으로 자동 staging하지 않는다.

### `src/data/suwonSeatData.test.ts`

포함 후보:

- `scripts/stadium-ux-audit.mjs` 경로 전환처럼 repo 내부 QA script 승격과 직접 맞물린 계약만 포함한다.

제외 후보:

- Suwon geometry/probe/full QA 확장 계약은 PR A에서 제외한다.

## PR A에서 제외할 이미 staged 변경

현재 staged 목록 중 아래는 PR A에 그대로 포함하면 범위가 커진다.

- `src/components/StadiumGuidePlacesRuntime.tsx`
- `src/components/StadiumGuideRuntime.tsx`
- `src/components/StadiumSeatMapStates.tsx`
- `src/components/stadiumSeatMap/SeatMapRuntimeShell.tsx`
- `src/components/stadiumSeatMap/SeatMapTemplateShell.tsx`
- `src/components/stadiumSeatMap/useSeatMapTemplateShellState.ts`
- `src/components/stadiumSeatMapRegistry.tsx`
- `src/components/ui/StadiumSeatMap.tsx`
- `src/components/ui/stadiumSeatMapModel.ts`
- `src/components/ui/stadiumSeatMapModel.test.ts`
- `src/data/incheonVisitGuide.ts`

이 변경들은 공통 shell/registry/Incheon 작업으로 별도 infra 또는 feature PR이 맞다.

## 산출물 정책

- `reports/stadium/changwon-seatmap-trace-review.*`, `changwon-seatmap-visual-approval.*`, `changwon-seatmap-ux-readiness.*`는 재생성 가능한 release evidence다.
- PR에 산출물을 포함해야 한다면 Changwon report만 별도 force-add 대상으로 판단한다.
- `output/playwright/*`는 repo 밖 검증 산출물이므로 PR에 포함하지 않는다.
- `dist/*`, bundle/dist report는 NC PR 기본 범위에서 제외한다.

## PR A 검증 명령

PR A 범위만 분리한 뒤 아래 순서로 다시 확인한다.

```bash
node --check scripts/stadium-ux-audit.mjs
node --check scripts/run-stadium-isolated-qa.mjs
npm run stadium:changwon:trace-manifest
node scripts/stadium-seatmap-ops.mjs changwon ux-readiness
node --import tsx --test src/data/changwonSeatData.test.ts src/components/StadiumGuideRuntimeSeatMaps.test.ts
node scripts/stadium-seatmap-ops.mjs changwon trace-review
npm run test:stadium:seatmaps
npm run build
```

## PR 설명에 고정할 내용

- 좌표/polygon 추가 수정 없음
- 기준 asset: `changwon-nc-seatmap-official-2026.png`
- 기준 데이터: `CHANGWON_IMAGE_GEOMETRY`, `CHANGWON_OFFICIAL_TRACE_REFERENCE`, `CHANGWON_BLOCKS`
- `totalBlocks=123`
- `searchableSelectableAreas=123`
- `topHitMismatches=0`
- `expandedHitAreaInterceptWarnings=0`
- `representativeProbeMismatches=0`
- `foreignLabelAnchors=0`
- `overlapWarnings=0`
- `confirmedHumanSignoff=11`
- `pendingHumanSignoff=0`
- `traceAdjustmentCandidates=[]`
- `scripts/stadium-ux-audit.mjs`를 repo 내부 QA source로 고정
- 이후 불일치 발견 시 전수 재트레이싱이 아니라 targeted polygon adjustment로 처리
