# Stadium seatmap standard shell PR scope

## Summary

이 문서는 Stadium 좌석도 standard shell PR의 포함 범위와 제외 범위를 고정한다.
목표는 잠실 기준 UX를 전체 구장 좌석도에 맞추는 UI/interaction PR을 분리하는 것이다.
좌표 정밀화, operator workflow, release-lock 산출물은 이 PR에서 다루지 않는다.

## Include

다음 변경은 standard shell PR에 포함한다.

- `StadiumGuideRuntime` hero 설명 폭 수정: 상단 구장 가이드 설명이 데스크톱에서 반폭으로 제한되지 않게 `w-full max-w-none`을 사용한다.
- `stadiumSeatMapRegistry`의 `shellTemplate`은 모든 구장에서 `standard`로 고정한다.
- `usesCoordinateGeometry`, `isNonCoordinateMap`은 QA/audit metadata로 유지한다.
- 공통 좌석도 UI 컴포넌트를 사용한다:
  - `SeatMapAttribution`
  - `SeatMapBottomSheet`
  - `SeatMapDetailPanel`
  - `SeatMapFilterBar`
  - `SeatMapLegend`
  - `SeatMapRuntimeShell`
  - `SeatMapTemplateShell`
  - `seatMapCommonTypes`
  - `useSeatMapSelectionState`
- 잠실, 인천, 대구, 대전, 고척, 광주, 창원, 사직, 수원 좌석도 컴포넌트는 공통 shell/detail/bottom sheet/filter/legend/attribution 계약을 사용한다.
- 인천 전용 `처음 인천 동선`, `처음 인천 가이드`, guide highlight/search/helper 계약은 제거한다.
- 구장별 전용 `*BottomSheet` 파일과 `JamsilSidePanelV2`는 공통 컴포넌트로 대체한다.
- 사직 first-visit guide, 고척 facility mode, 대구/대전 finder, 광주 derived range summary는 standard shell 위의 secondary panel slot으로만 유지한다.

## Whole-File Candidates

Scope guard가 whole-file staging 후보로 분류하는 파일은 다음 범주다.

- `docs/stadium-seatmap-standard-shell-pr-scope.md`
- `scripts/stadium-seatmap-standard-shell-pr-scope-guard.mjs`
- `src/components/StadiumGuideRuntime.tsx`
- `src/components/stadiumSeatMap/*`
- `src/components/stadiumSeatMapRegistry.tsx`
- 각 구장 `*SeatMap.tsx` 중 whole-file로 분리 가능한 파일
- 인천 guide 제거 관련 파일
- 삭제된 구장별 legacy bottom sheet 파일
- `src/data/jamsilSeatData.test.ts`

정확한 현재 목록은 아래 명령의 report를 기준으로 한다.

```bash
npm run stadium:seatmap:standard-shell-pr-scope-guard
```

이 명령은 `/reports/stadium/stadium-seatmap-standard-shell-pr-scope-guard.md`에 whole-file `git add -- ...` 후보 명령과 partial `git add -p -- ...` 검토 명령을 함께 생성한다. report는 `/reports` ignore 규칙에 따라 PR에 포함하지 않는다.

## Partial Review Files

다음 파일은 mixed worktree에서 다른 PR 변경과 섞여 있으므로 hunk 단위 검토가 필요하다.

| File | Include only | Exclude |
| --- | --- | --- |
| `package.json` | `stadium:seatmap:standard-shell-pr-scope-guard` script | Gwangju, Daegu, Sajik, Suwon release/operator scripts |
| `src/components/StadiumGuideRuntimeSeatMaps.test.ts` | standard shell guard, legacy naming guard, shared bottom sheet guard, Incheon guide removal guard, hero full-width guard | Gwangju/Daejeon/Daegu/Sajik/Suwon release-lock or operator assertions |
| `src/components/daegu/DaeguSeatMap.tsx` | shared filter/legend/attribution/detail/bottom sheet wiring, finder secondary panel slot | review-only/marker-only precision behavior tied to Daegu operator data |
| `src/components/gwangju/GwangjuSeatMap.tsx` | shared shell wiring and existing derived range panel through slots | Gwangju release/operator data contract changes |
| `src/components/sajik/SajikSeatMap.tsx` | shared shell wiring and first-visit guide through secondary panel slots | polygon v2 editor, dataset, marker-only transition work |

## Partial Hunk Guide

`git add -p`에서 아래 기준으로 hunk를 고른다. 한 hunk 안에 include/exclude가 섞이면 `s`로 split하고, 그래도 분리되지 않으면 해당 hunk는 보류한다.

### `package.json`

- Include: `stadium:seatmap:standard-shell-pr-scope-guard` script 한 줄.
- Exclude: Gwangju, Daegu, Sajik, Suwon release/operator/QA script additions.

### `src/components/StadiumGuideRuntimeSeatMaps.test.ts`

- Include: standard `shellTemplate` guard, legacy naming absence guard, shared `SeatMapBottomSheet` guard, Incheon guide removal guard, secondary panel allowlist, hero description full-width guard, common UI contract tests.
- Exclude: `release-lock`, `operator`, `precision`, `polygon-v2`, `stage01`, `DaejeonStadiumUxAuditContract`, `stadium-ux-audit` 관련 assertions.

### `src/components/daegu/DaeguSeatMap.tsx`

- Include: `SeatMapAttribution`, `SeatMapBottomSheet`, `SeatMapDetailPanel`, `SeatMapFilterBar`, `SeatMapLegend`, `SeatMapSectionAdapter`, `useSeatMapSelectionState` wiring.
- Include: 기존 Daegu finder를 `mobileSecondaryPanel` / `desktopSecondaryPanel` slot으로 넘기는 shell wiring.
- Exclude: `isDaeguNormalSelectableSeat`, `selectableDaeguBlocks`, `selectableDaeguBlockIds`, review-only/marker-only 선택 제한, operator precision data에 의존하는 filter/count 변경.

### `src/components/gwangju/GwangjuSeatMap.tsx`

- Include: shared filter/legend/attribution/detail/bottom sheet wiring and `isAuxiliaryGuideActive` rename.
- Include: 기존 derived range summary를 standard shell slot 안에서 보존하는 연결부.
- Exclude: Gwangju release/operator data contract, precision workset, low-margin 후보 산출물과 직접 연결되는 변경.

### `src/components/sajik/SajikSeatMap.tsx`

- Include: shared filter/legend/attribution/detail/bottom sheet wiring and `sajikSectionAdapter`.
- Include: 기존 first-visit guide를 `mobileSecondaryPanel` / `desktopSecondaryPanel` slot으로 유지하는 변경.
- Exclude: Sajik polygon v2 editor, dataset, marker-only transition, route/release-lock 관련 변경.

## Exclude

다음 범위는 standard shell PR에서 제외한다.

- Daegu precision/operator/release-lock scripts, docs, data, SVG precision changes
- Daejeon release anchor, geometry baseline, release gate changes
- Gwangju release/operator/precision scripts, docs, data
- Sajik polygon v2 editor, dataset, marker transition, route, release-lock docs/scripts/tests
- Suwon release-lock, visual review, geometry QA docs/scripts/data
- `scripts/stadium-ux-audit.mjs`의 Daegu/Sajik/Suwon precision QA 변경
- `scripts/run-stadium-isolated-qa.mjs`의 generic failure diagnostics
- `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`는 branch isolation 후 재생성한다.

## Staging Protocol

- `git add .`와 `git add -A`는 사용하지 않는다.
- whole-file candidates는 scope guard report의 `Whole-File Add Commands`를 확인한 뒤 staging한다.
- partial review files는 scope guard report의 `Partial Review Commands` 또는 동등한 hunk review로만 staging한다.
- staging 후 scope guard report의 `Post-Stage Review Commands`를 실행한다.
- ignored `/reports/stadium/stadium-seatmap-standard-shell-pr-scope-guard.*`는 PR에 포함하지 않는다.
- branch를 분리한 뒤 build reports를 다시 생성할지 결정한다.

## Verification

Standard shell PR에서 우선 실행할 검증은 다음 순서다.

```bash
npm run stadium:seatmap:standard-shell-pr-scope-guard
node --import tsx --test --test-concurrency=1 --test-name-pattern "StadiumGuideRuntime|좌석도 registry|인천 전용 guide|구장별 전용 모바일|구장별 secondary|좌석도 공통 UI" src/components/StadiumGuideRuntimeSeatMaps.test.ts
npm run qa:stadium:mobile:smoke
npm run build
```

`npm run test:stadium:seatmaps` 전체 실패가 Sajik polygon-v2 package script 계약에서만 발생하면, 그 실패는 standard shell PR blocker로 보지 않고 Sajik polygon-v2 PR에서 처리한다.

## Next PRs

Standard shell PR 이후 분리 순서는 다음과 같다.

1. Sajik polygon-v2 계약 불일치 및 editor/release-lock package
2. Gwangju release/operator package
3. Daegu precision/operator package
4. Daejeon release anchor package
5. Suwon release-lock package
