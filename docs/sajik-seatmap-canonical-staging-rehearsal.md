# 사직 canonical staging rehearsal

작성일: 2026-05-26 KST

## Purpose

이 문서는 `SAJIK_CANONICAL_2026` 사직 좌석도 통합 PR을 실제로 stage하기 전에 확인하는 dry-run manifest다. 이 단계는 `git add`를 실행하지 않는다. Mixed worktree에서 사직 canonical payload만 분리할 수 있는지 검토하고, generated artifacts와 다른 구장/기능 작업을 제외하는 기준을 고정한다.

## Guard Snapshot Contract

- scope guard command: `npm run stadium:sajik:pr-scope-guard`
- smoke command: `npm run stadium:sajik:pr-scope-guard-smoke`
- expected status: `fullRelease=passed`, `stage01PartialScope=passed`
- canonical payload file count: `17`
- historical reference file count: `17`
- unexpected dirty files: `0`
- blockers: `0`
- patch separation: `review-required`
- safe bulk staging: `false`
- git commands executed by guard: `0`

## Excluded Artifacts

Do not stage these by default:

- `reports/stadium/sajik-seatmap-*.json`
- `reports/stadium/sajik-seatmap-*.csv`
- `reports/stadium/sajik-seatmap-*.md`
- `reports/stadium/sajik-seatmap-*.png`
- `reports/stadium/sajik-stage01-operator/*`
- `reports/bundle-guard-report.json`
- `reports/dist-assets-report.json`
- `dist/*`
- `output/playwright/*`
- `../output/playwright/*`

Forbidden shortcuts:

- `git add .`
- `git add package.json src/components/StadiumGuideRuntimeSeatMaps.test.ts`
- `git add reports dist output`
- `git add reports/bundle-guard-report.json reports/dist-assets-report.json`

## Whole-File Review Candidates

These files can be staged whole-file after manual review because the dirty content is Sajik canonical scope.

| file | action |
| --- | --- |
| `docs/sajik-seatmap-canonical-pr-notes.md` | Include canonical PR summary, verification, and official-only alias policy. |
| `docs/sajik-seatmap-canonical-staging-rehearsal.md` | Include this dry-run manifest. |
| `docs/sajik-seatmap-marker-only-transition.md` | Include Sajik marker-only transition contract if the diff remains Sajik-only. |
| `docs/sajik-seatmap-pr-packaging-inventory.md` | Include canonical payload/historical reference staging rules. |
| `docs/sajik-seatmap-release-lock.md` | Include canonical runtime lock and guard contract updates. |
| `scripts/sajik-seatmap-block-source-duplication-audit.mjs` | Include active polygon source audit. |
| `scripts/sajik-seatmap-editor-scope.mjs` | Include canonical PR scope guard and smoke contract. |
| `src/components/sajik/SajikSeatMap.test.ts` | Include canonical renderer regression tests. |
| `src/components/sajik/SajikSeatMap.tsx` | Include source tab removal and canonical state wiring. |
| `src/components/sajik/SajikSeatMapSvg.tsx` | Include canonical operator-reference renderer. |
| `src/data/sajikCanonicalSeatMap.ts` | Include canonical dataset/builder. |
| `src/data/sajikSeatData.test.ts` | Include canonical data validation tests. |
| `src/data/sajikSeatData.ts` | Include metadata needed by canonical aliases and markers. |

Untracked whole-file candidates currently require explicit review before staging:

- `docs/sajik-seatmap-canonical-pr-notes.md`
- `docs/sajik-seatmap-canonical-staging-rehearsal.md`
- `scripts/sajik-seatmap-block-source-duplication-audit.mjs`
- `src/data/sajikCanonicalSeatMap.ts`

## Hunk-Only Review Candidates

These files are shared with other workstreams. Stage only Sajik canonical hunks.

| file | include only | exclude |
| --- | --- | --- |
| `package.json` | `stadium:sajik:block-source-duplication-audit`, `qa:stadium:sajik:full`, and Sajik canonical additions to `qa:stadium:sajik:polygon-v2` | Gwangju, Daegu, and unrelated package scripts |
| `scripts/stadium-seatmap-ops.mjs` | Sajik `full`, Sajik `block-source-duplication-audit`, Sajik pr-scope forwarding | Gwangju/Daegu task changes and global dispatcher behavior |
| `src/components/StadiumGuideRuntimeSeatMaps.test.ts` | Sajik release-lock, canonical PR notes, staging rehearsal, and scope guard assertions | Non-Sajik stadium assertions and shared shell migrations |
| `scripts/stadium-ux-audit.mjs` | Sajik canonical label-coordinate and alias-only hit-area checks | Gwangju/Suwon/non-Sajik QA flow changes |

## Review Results

Reviewed at: `2026-05-26 KST`

- actual git index changed: `false`
- git add executed: `false`

Whole-file review results:

| file | status | result |
| --- | --- | --- |
| `docs/sajik-seatmap-canonical-pr-notes.md` | `reviewed-ok` | Sajik canonical PR summary only; no generated artifact, source write, or git command. |
| `docs/sajik-seatmap-canonical-staging-rehearsal.md` | `reviewed-ok` | Dry-run staging manifest only; no generated artifact, source write, or git command. |
| `scripts/sajik-seatmap-block-source-duplication-audit.mjs` | `reviewed-ok` | Reads Sajik canonical/operator/reference data and writes reports only under `reports/stadium`; no runtime source mutation or git command. |
| `src/data/sajikCanonicalSeatMap.ts` | `reviewed-ok` | Builds `78` active selectable canonical seat sections, `11` legacy alias-only blocks, and accessibility marker aliases from existing Sajik sources. |

Hunk-only review results:

| file | status | staging instruction |
| --- | --- | --- |
| `package.json` | `hunk-only-required` | Include Sajik audit/full scripts only; exclude Gwangju/Daegu package scripts and unrelated package script changes. |
| `scripts/stadium-seatmap-ops.mjs` | `hunk-only-required` | Include Sajik `full` and `block-source-duplication-audit` task wiring only; exclude Gwangju/Daegu task changes and dispatcher behavior changes. |
| `src/components/StadiumGuideRuntimeSeatMaps.test.ts` | `hunk-only-required` | Include Sajik release-lock, canonical PR notes, staging rehearsal, scope guard, and canonical SVG assertions only; exclude non-Sajik stadium assertions and shared shell migrations. |
| `scripts/stadium-ux-audit.mjs` | `hunk-only-required` | include Sajik canonical overlay verification hunks only; exclude Gwangju selected-sweep, hit-area, and non-Sajik QA flow changes. |

## Post-Staging Status

Reviewed at: `2026-05-26 KST`

- staged payload files: `17`
- shared hunk files staged with Sajik-only hunks: `4`
- shared hunk files: `package.json`, `scripts/stadium-seatmap-ops.mjs`, `scripts/stadium-ux-audit.mjs`, `src/components/StadiumGuideRuntimeSeatMaps.test.ts`
- generated QA report files staged: `false`
- generated QA report files stay out of the PR payload
- remaining mixed-worktree hunks are separate Gwangju/Daegu/Mate/shared workstreams and are not Sajik canonical payload
- `git add .`, `git add reports`, and shared-file bulk staging remain forbidden after this rehearsal

## QA Evidence Summary

- `npm run stadium:sajik:block-source-duplication-audit`: PASS; report `reports/stadium/sajik-seatmap-block-source-duplication-audit.{json,csv,md}`; latest summary `active_canonical_blocks=78`, `active_polygon_source_per_block=1`, `legacy_alias_only=11`
- `npm run stadium:sajik:pr-scope-guard`: PASS; report `reports/stadium/sajik-seatmap-pr-scope-guard.{json,md}`; latest summary `included=17`, `unexpected=0`, `blockers=0`
- `npm run stadium:sajik:pr-scope-guard-smoke`: PASS; report `reports/stadium/sajik-seatmap-pr-scope-guard-smoke.{json,md}`; full/partial guard snapshots pass
- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts`: PASS, `37/37`
- `node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts`: PASS
- `npm run qa:stadium:sajik:full`: PASS; summary path `output/playwright/stadium-ux-sajik-full/stadium-mobile-smoke-summary.md`
- `env VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build`: PASS; build reports remain unstaged evidence
- generated report 원문은 복사하지 않는다

## Historical Reference Files

The 17 historical reference files stay available for audit evidence. They are not production source and should not be staged for this canonical PR unless a reviewed Sajik hunk exists.

- `docs/sajik-seatmap-editor-v17-operator-guide.md`
- `docs/sajik-seatmap-editor-v18-roadmap.md`
- `docs/sajik-seatmap-hitpath-candidate-review.md`
- `docs/sajik-seatmap-stage01-handoff.md`
- `scripts/sajik-seatmap-core-qa.mjs`
- `scripts/sajik-seatmap-export-dataset.mjs`
- `scripts/sajik-seatmap-hitpath-candidate-review.mjs`
- `scripts/sajik-seatmap-operator-reference.mjs`
- `scripts/sajik-seatmap-stage01.mjs`
- `scripts/sajik-seatmap-zone-precision-worksets.mjs`
- `src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.png`
- `src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp`
- `src/components/AppRoutes.tsx`
- `src/components/sajik/SajikSeatMapEditor.tsx`
- `src/data/sajikOperatorReferenceSeatMapDataset.ts`
- `src/data/sajikSeatMapDataset.ts`
- `src/utils/seatMapPolygonValidator.ts`

## Post-Rehearsal Verification

Run these after the dry-run manifest is updated:

- `npm run stadium:sajik:pr-scope-guard`
- `npm run stadium:sajik:pr-scope-guard-smoke`
- `npm run stadium:sajik:block-source-duplication-audit`
- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts`
- `node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts`
- `git diff --check`
