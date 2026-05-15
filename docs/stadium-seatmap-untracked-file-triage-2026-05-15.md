# Stadium seatmap untracked file triage 2026-05-15

This triage classifies untracked files after generated `reports/`, `output/`, and `.env.production` were moved out of the working tree.
No files in this list are approved for deletion by default.

## Recommended keep candidates

These files look like reusable source, UI, or QA infrastructure and should be reviewed for commit rather than deleted.

- `src/components/stadiumSeatMap/SeatMapAttribution.tsx`
- `src/components/stadiumSeatMap/SeatMapBottomSheet.tsx`
- `src/components/stadiumSeatMap/SeatMapDetailPanel.tsx`
- `src/components/stadiumSeatMap/SeatMapFilterBar.tsx`
- `src/components/stadiumSeatMap/SeatMapLegend.tsx`
- `src/components/stadiumSeatMap/seatMapCommonTypes.ts`
- `src/components/stadiumSeatMap/useSeatMapSelectionState.ts`
- `src/components/sajik/SajikSeatMapEditor.tsx`
- `src/data/sajikSeatMapDataset.ts`
- `src/hooks/useScrollStage.ts`
- `src/utils/seatMapPolygonValidator.ts`
- `src/components/DaejeonStadiumUxAuditContract.test.ts`

## Review before commit

These files appear to be operator, release, or QA automation scripts. Keep only if the corresponding `package.json` command or runbook depends on them.

- `scripts/daegu-seatmap-p1-boundary-first-*.mjs`
- `scripts/daegu-seatmap-p1-boundary-input-aid.mjs`
- `scripts/daegu-seatmap-p1-next-action-packet.mjs`
- `scripts/daegu-seatmap-p1-paired-boundary-review.mjs`
- `scripts/daegu-seatmap-p1-precision-workset.mjs`
- `scripts/daegu-seatmap-p1-stage-order-regression.mjs`
- `scripts/daegu-seatmap-p2*.mjs`
- `scripts/daegu-seatmap-precision-audit.mjs`
- `scripts/daegu-seatmap-render-safety-audit.mjs`
- `scripts/daegu-seatmap-zone-precision-worksets.mjs`
- `scripts/gwangju-seatmap-low-margin-candidates.mjs`
- `scripts/gwangju-seatmap-zone-precision-worksets.mjs`
- `scripts/sajik-seatmap-*.mjs`
- `scripts/stadium-seatmap-standard-shell-pr-scope-guard.mjs`
- `scripts/suwon-seatmap-*.mjs`

## Documentation candidates

These docs may be worth committing if they describe durable operator or release decisions. Otherwise they can be folded into existing runbooks.

- `docs/sajik-seatmap-editor-v17-operator-guide.md`
- `docs/sajik-seatmap-editor-v18-roadmap.md`
- `docs/sajik-seatmap-hitpath-candidate-review.md`
- `docs/sajik-seatmap-marker-only-transition.md`
- `docs/sajik-seatmap-stage01-handoff.md`
- `docs/stadium-seatmap-standard-shell-pr-scope.md`
- `docs/suwon-seatmap-release-lock.md`

## Do not delete yet

- Do not delete untracked `scripts/`, `src/`, or `docs/` files until their references from `package.json`, runbooks, and tests have been checked.
- Do not use broad cleanup commands such as `git clean -fd`.
- Generated artifacts should continue to live under ignored `reports/` or `output/` only.
