# Stadium Seatmap Package Review

Date: 2026-06-18
QA closeout update: 2026-06-19 KST
Deletion approval update: 2026-06-19 KST

## Summary

This package verifies the current Stadium seatmap/scripts/assets dirty worktree
slice. Heavy QA Stage 2A, Stage 2B, and Stage 3 are recorded green in
`docs/stadium-seatmap-heavy-qa-gate-plan.md`. This package records owner
approval for the tracked Stadium PNG and Sajik rehearsal document deletions. It
does not redesign Stadium UI or merge large QA script bodies.

The filename-keyword Stadium slice currently reports `135` dirty entries with:

- Stadium docs, release locks, and operator runbooks.
- Stadium ops scripts, the shared task runner, and wrapper entrypoints.
- Stadium data, components, hooks, and asset references.
- Deleted tracked PNG assets under `src/assets/stadiums/**`.

The previous frontend dirty inventory listed `136` Stadium entries because it
classified cross-cutting QA dispatcher files such as `scripts/qa-presets.mjs`
with the Stadium package. This review keeps `qa-presets` in scope only as the
Stadium command dispatcher surface, not as a full frontend QA infra package.

## Scope

Included:

- Stadium docs under `docs/*seatmap*` and Stadium release/operator docs.
- Stadium scripts and wrappers, including `scripts/lib/stadium-task-runner.mjs`.
- Stadium components, data, hooks, and `src/api/stadiumGuidePublic.ts`.
- Stadium asset directory status under `src/assets/stadiums`.

Excluded:

- Mate, prediction, home/landing/auth, cheer, mypage/diary/ranking, backend, and
  AI changes.
- New large Stadium QA body refactors or reruns beyond the recorded Stage 2A,
  Stage 2B, and Stage 3 gate results.
- Further consolidation of large stadium-specific core QA script bodies.
- Remote merge execution until the target branch or PR is unambiguous.

## Changes Made During Verification

Initial `npm run test:stadium:seatmaps` failed with 8 tests in the operator visit
guide data contract. All failures had the same root cause: fallback labels
showed only "operator-provided data required" text and omitted the required
`MANUAL_BASEBALL_DATA_REQUIRED` code.

The initial fix was limited to Stadium data contract strings:

- Gocheok visit guidance fallback labels and static visit hint manual-data label.
- Incheon, Jamsil, and Suwon operator visit guidance fallback labels.
- Operator pending labels now keep the manual data contract code where tests
  require machine-readable missing-data state.

A later display-policy pass keeps `MANUAL_BASEBALL_DATA_REQUIRED` in
machine-readable status, metadata, and test contracts while using user-facing
operator-needed wording for visible labels. No asset restore/delete, UI
redesign, or runner restructuring was performed.

## Approved Deletions

These deleted tracked files are approved for deletion in this package:

- `docs/sajik-seatmap-canonical-staging-rehearsal.md`
- `src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.png`
- `src/assets/stadiums/kia/gwangju-kia-seatmap-official-2026.png`
- `src/assets/stadiums/kiwoom/gocheok-kiwoom-seatmap-official-2026.png`
- `src/assets/stadiums/kt/suwon-kt-seatmap-official-2026.png`
- `src/assets/stadiums/lg/jamsil-lg-seatmap-*.png`
- `src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png`
- `src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.png`
- `src/assets/stadiums/nc/changwon-nc-seatmap-official-2026.png`
- `src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png`
- `src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.png`

The matching asset README and release-lock references use the retained WebP or
`@2x` source assets. The exact deleted `.png` filenames are not referenced by
live source code.

## Verification Results

Source/package sanity:

- PASS: `git -C /Users/mac/project/KBO_platform/bega_frontend diff --check -- docs scripts src/assets/stadiums src/components src/data src/hooks src/api/stadiumGuidePublic.ts`
- PASS: `git -C /Users/mac/project/KBO_platform/bega_frontend status --short -uall | rg -i "seatmap|stadium|daegu|gwangju|sajik|suwon|jamsil|changwon|daejeon|gocheok|incheon"`

Runner syntax and unit checks:

- PASS: `node --check scripts/lib/stadium-task-runner.mjs`
- PASS: `node --check scripts/stadium-seatmap-ops.mjs`
- PASS: `node --check scripts/daegu-seatmap-ops.mjs`
- PASS: `node --check scripts/incheon-seatmap-ops.mjs`
- PASS: `node --test scripts/stadium-task-runner.test.mjs` (`7` passing)

CLI compatibility checks:

- PASS: `node scripts/qa-presets.mjs --print stadium daegu status`
- PASS: `node scripts/stadium-seatmap-ops.mjs daegu status`
- PASS: `node scripts/daegu-seatmap-ops.mjs status`
- PASS: `node scripts/stadium-seatmap-ops.mjs incheon status`
- PASS: `node scripts/incheon-seatmap-ops.mjs status`

Seatmap component/data checks:

- PASS after contract fix: `node --import tsx --test src/data/gocheokOperatorVisitGuideSeatData.test.ts src/data/gocheokSeatData.test.ts src/data/incheonOperatorVisitGuideSeatData.test.ts src/data/jamsilOperatorVisitGuideSeatData.test.ts src/data/suwonOperatorVisitGuideSeatData.test.ts` (`61` passing)
- PASS after contract fix: `npm run test:stadium:seatmaps` (`345` passing)
- PASS: `node --import tsx --test src/components/StadiumSeatMapStates.test.tsx src/components/stadiumSeatMap/SeatMapAttribution.test.tsx src/hooks/stadiumGuideQueryOptions.test.ts` (`4` passing)

Heavy QA closeout:

- PASS: Stage 2A `npm run qa:stadium:mobile:smoke` for `JAMSIL:smoke` at
  `mobile-390`.
- PASS: Stage 2B mobile commands for Daegu, Suwon, Jamsil, Daejeon, Gocheok,
  Gwangju, Incheon, Changwon, and Sajik. Each command covered `mobile-390` and
  `desktop-1440` scenarios.
- PASS: Stage 3 full commands for Daegu, Suwon, Jamsil, Gocheok, Gwangju, and
  Incheon.
- PASS: `node --import tsx --test --test-concurrency=1 src/components/StadiumGuideRuntimeSeatMaps.test.ts`
  after adding the Gwangju full alias and dispatcher task.
- Generated Playwright outputs remain execution evidence only under
  `/Users/mac/project/KBO_platform/output/playwright/**` and are not part of the
  tracked package.

Accepted warnings:

- npm optional dependency config warning.
- Node `DEP0205` warning from the `tsx` test loader.

## Review Decision

The Stadium package verification gate is green for the recorded runner,
component/data, mobile, and full visual checks. Deleted tracked Stadium PNG
assets and the Sajik rehearsal document are approved for deletion in this review
package. Final remote merge still requires an unambiguous target branch or PR.
