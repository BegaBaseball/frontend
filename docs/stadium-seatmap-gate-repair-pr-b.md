# Stadium Seatmap Gate Repair PR B

작성일: 2026-05-12 KST

## 목적

이 PR 후보는 NC파크 release-lock PR A에서 분리된 전체 seatmap test gate 복구 작업이다.

HEAD 기준 `npm run test:stadium:seatmaps`는 Suwon test가 `SUWON_HIT_GEOMETRY_EXCEPTION_NOTES`를 import하지만 `src/data/suwonSeatData.ts`가 해당 export를 제공하지 않아 실패한다. 이 worktree는 Suwon 데이터, Suwon 런타임, Playwright audit probe 계약, 공통 shell import 계약을 같은 버전으로 맞춘다.

## Worktree

```text
/Users/mac/project/KBO_platform/bega_frontend_pr_b_gate_repair
```

## 포함 파일

```text
docs/stadium-seatmap-gate-repair-pr-b.md
scripts/stadium-ux-audit.mjs
src/components/StadiumSeatMapStates.tsx
src/components/stadiumSeatMap/SeatMapRuntimeShell.tsx
src/components/stadiumSeatMap/SeatMapTemplateShell.tsx
src/components/stadiumSeatMap/useSeatMapTemplateShellState.ts
src/components/stadiumSeatMapRegistry.tsx
src/components/suwon/SuwonSeatMap.tsx
src/components/suwon/SuwonSeatMapSvg.tsx
src/data/suwonSeatData.ts
src/data/suwonSeatData.test.ts
```

## 제외 범위

- NC파크 release-lock 좌표/UX/manifest 변경
- Changwon report 산출물
- 다른 구장 operator/release 문서
- `dist/*`
- `reports/bundle-guard-report.json`
- `reports/dist-assets-report.json`

## 검증 결과

```text
node --check scripts/stadium-ux-audit.mjs: PASS
node --import tsx --test src/data/suwonSeatData.test.ts: PASS, 42 tests
npm run test:stadium:seatmaps: PASS, 146 tests
npm run build: PASS
```

## PR 순서

1. PR B를 먼저 병합하면 전체 `test:stadium:seatmaps` baseline이 복구된다.
2. 이후 PR A는 NC파크 release-lock 변경만 포함해도 전체 gate가 같은 baseline 위에서 통과 가능하다.
