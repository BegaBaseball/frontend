# NC파크 release-lock PR A patch preview

작성일: 2026-05-12 KST

## 목적

이 문서는 현재 mixed worktree에서 PR A만 분리할 때 적용할 target patch preview다.
현재 index에는 PR A가 아닌 공통 seatmap shell/Incheon 변경이 이미 staged 되어 있으므로, 현재 staged diff를 그대로 PR A로 사용하지 않는다.

## 현재 상태 요약

- staged: 14 files, 1380 insertions, 2033 deletions
- unstaged tracked: 79 files, 18584 insertions, 3984 deletions
- untracked: Changwon 문서/스크립트 외에도 Daegu/Daejeon/Gwangju/Sajik/operator/prediction 파일 다수
- PR A 후보 tracked diff stat:

```text
package.json                                    |  114 +-
scripts/run-stadium-isolated-qa.mjs             |   62 +-
src/components/changwon/ChangwonBottomSheet.tsx |   25 +-
src/components/changwon/ChangwonSeatMap.tsx     |  372 +++-
src/components/changwon/ChangwonSeatMapSvg.tsx  |   56 +-
src/data/changwonSeatData.test.ts               |  607 +++++-
src/data/changwonSeatData.ts                    | 2355 ++++++++++++++++++++---
```

주의: 위 stat은 현재 worktree 기준이다. `package.json`에는 다른 구장 script가 섞여 있으므로 전체 포함하지 않는다.

## PR A whole-file include

아래 파일은 현재 파일 전체를 PR A에 포함하는 것이 맞다.

```text
docs/changwon-seatmap-release-lock.md
docs/changwon-seatmap-release-candidate.md
docs/changwon-seatmap-pr-packaging-inventory.md
docs/changwon-seatmap-pr-a-scope.md
docs/changwon-seatmap-pr-a-patch-preview.md
scripts/changwon-seatmap-ops.mjs trace-manifest
scripts/changwon-seatmap-ops.mjs ux-readiness
scripts/stadium-ux-audit.mjs
scripts/run-stadium-isolated-qa.mjs
src/components/changwon/ChangwonBottomSheet.tsx
src/components/changwon/ChangwonSeatMap.tsx
src/components/changwon/ChangwonSeatMapSvg.tsx
src/data/changwonSeatData.ts
src/data/changwonSeatData.test.ts
```

`scripts/run-stadium-isolated-qa.mjs`는 generic runner지만 PR A에 포함한다. 이유는 `CHANGWON` 기본 포함, `5199`, `STADIUM_UX_CHANGWON_DEEP_CHECK=1`, repo 내부 `scripts/stadium-ux-audit.mjs` 실행, stale summary 정리와 retry 동작이 Changwon QA 재현성의 일부이기 때문이다.

## `package.json` PR A target

PR A에서 `package.json`은 아래 변경만 포함한다.

```json
"qa:stadium:mobile": "node scripts/run-stadium-isolated-qa.mjs ALL",
"qa:stadium:mobile:smoke": "node scripts/run-stadium-isolated-qa.mjs JAMSIL:SMOKE",
"test:stadium:seatmaps": "node --import tsx --test --test-concurrency=1 src/components/StadiumGuideRuntimeSeatMaps.test.ts src/data/*SeatData.test.ts src/components/ui/stadiumSeatMapModel.test.ts",
"qa:stadium:changwon:mobile": "node scripts/qa-presets.mjs stadium changwon mobile",
"stadium:changwon:trace-manifest": "node scripts/stadium-seatmap-ops.mjs changwon trace-manifest",
"qa:stadium:mobile:attached": "AUDIT_BASE_URL=${AUDIT_BASE_URL:-http://127.0.0.1:5177} STADIUM_UX_AUTO_START_DEV_SERVER=0 node scripts/stadium-ux-audit.mjs",
"qa:stadium:mobile:smoke:attached": "AUDIT_BASE_URL=${AUDIT_BASE_URL:-http://127.0.0.1:5177} STADIUM_UX_VIEWPORTS=mobile-390 STADIUM_UX_AUTO_START_DEV_SERVER=0 node scripts/stadium-ux-audit.mjs"
```

`test:stadium:seatmaps`는 PR A에서 `src/components/ui/stadiumSeatMapModel.test.ts`를 유지한다.
현재 worktree의 script는 공통 shell 삭제와 함께 이 경로를 제거했지만, PR A는 공통 shell 삭제를 포함하지 않기 때문이다.

PR A에서 제외할 `package.json` 변경:

- `stadium:gwangju:*` operator/release-package script
- `stadium:daejeon:*` release/operator/anchor/block crop script
- `stadium:daegu:*` operator/corrections/retrace script
- `stadium:sajik:*` pixel/alignment/advisory script
- Jamsil responsive QA package alias cleanup
- `qa:stadium:suwon:full`, `node scripts/stadium-seatmap-ops.mjs suwon responsive`
- 다른 구장 trace-review flow 변경

## `StadiumGuideRuntimeSeatMaps.test.ts` PR A target

PR A는 이 파일을 현재 worktree 전체로 가져가면 안 된다. 현재 파일에는 registry/common shell, Incheon, Jamsil, Suwon, Sajik, Daejeon, Gwangju, Daegu 계약이 같이 섞여 있다.

PR A target은 HEAD의 기존 구조를 유지한다.

- import는 `./ui/stadiumSeatMapModel`의 `resolveStadiumSeatMapPresetMeta`를 유지한다.
- `STADIUM_SEATMAP_CONTRACTS`의 Changwon 항목은 기존 그대로 유지한다.
- 기존 lazy-load/runtime contract 테스트는 registry migration 형태로 바꾸지 않는다.

PR A에 추가할 테스트 계약:

- repo 내부 `scripts/stadium-ux-audit.mjs` 존재 확인
- `scripts/run-stadium-isolated-qa.mjs`가 `path.join(frontendRoot, 'scripts/stadium-ux-audit.mjs')`를 실행하는지 확인
- `package.json` attached QA script가 `node scripts/stadium-ux-audit.mjs`를 사용하는지 확인
- runner가 `clearSummaryFiles(outputDir)`, `stadium-mobile-smoke-summary.json`, next-port retry를 포함하는지 확인
- `창원 trace review 스크립트는 117개 숫자 블록과 특수 선택 구역 검수 산출물을 고정한다`
- `창원 좌석도 release lock 문서는 최종 검수 계약을 고정한다`
- `창원 좌석도 release candidate 문서는 UX+QA 고정 상태와 targeted adjustment 절차를 설명한다`

PR A에서 제외할 테스트 계약:

- `resolveStadiumSeatMapEntry`, `STADIUM_SEAT_MAP_ENTRIES` registry import
- `좌석도 registry는 ...` 계열 테스트
- `StadiumGuideRuntime은 registry, 중립 스켈레톤...` 계열 테스트
- `공통 SVG 좌석도 모델 파일은 제거되어야 한다`
- Incheon PNG/WebP 좌표계 테스트
- Jamsil full/responsive QA 테스트
- Suwon fixture/full/responsive QA 테스트
- Daejeon release/operator/approval 테스트
- Gwangju operator/release 테스트
- Daegu operator/corrections/retrace 테스트
- Sajik release/advisory 테스트

## 현재 staged에서 PR A 제외가 필요한 항목

아래 staged 항목은 PR A patch preview에서 제외한다.

```text
src/components/StadiumGuidePlacesRuntime.tsx
src/components/StadiumGuideRuntime.tsx
src/components/StadiumSeatMapStates.tsx
src/components/stadiumSeatMap/SeatMapRuntimeShell.tsx
src/components/stadiumSeatMap/SeatMapTemplateShell.tsx
src/components/stadiumSeatMap/useSeatMapTemplateShellState.ts
src/components/stadiumSeatMapRegistry.tsx
src/components/ui/StadiumSeatMap.tsx
src/components/ui/stadiumSeatMapModel.ts
src/components/ui/stadiumSeatMapModel.test.ts
src/data/incheonVisitGuide.ts
```

`src/components/StadiumGuideRuntimeSeatMaps.test.ts`와 `package.json`은 staged/unstaged 양쪽에 변경이 있으므로 전체 stage 대상이 아니다.

## 적용 방식 preview

선호 방식은 clean worktree에서 PR A-only patch를 재구성하는 것이다.

1. HEAD 기준 clean worktree를 준비한다.
2. whole-file include 목록을 현재 worktree에서 복사한다.
3. `package.json`은 위 PR A target script만 수동 적용한다.
4. `StadiumGuideRuntimeSeatMaps.test.ts`는 HEAD 구조에 Changwon/runner 계약 테스트만 추가한다.
5. `npm run test:stadium:seatmaps`가 기존 `src/components/ui/stadiumSeatMapModel.test.ts`까지 포함해서 통과하는지 확인한다.

현재 worktree에서 바로 진행해야 한다면:

1. index를 PR A 전용으로 정리하기 전 기존 staged 목록을 반드시 기록한다.
2. pure Changwon 파일만 전체 stage한다.
3. `package.json`과 `StadiumGuideRuntimeSeatMaps.test.ts`는 `git add -p`로 위 target hunk만 stage한다.
4. 공통 shell 삭제/registry migration hunk는 stage하지 않는다.

## PR A validation

PR A-only 상태에서 다시 실행할 명령:

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

## 결론

PR A는 "현재 staged diff"가 아니라 "NC release-lock + Changwon QA infra + repo-internal audit source"로 재구성해야 한다.
특히 `test:stadium:seatmaps`에서 `src/components/ui/stadiumSeatMapModel.test.ts`를 제거하는 변경과 `StadiumGuideRuntimeSeatMaps.test.ts`의 registry migration 테스트는 PR A 범위 밖이다.
