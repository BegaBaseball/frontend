# Stadium seatmap report summary 2026-05-15

This document preserves the durable decisions from local seatmap QA reports.
The source `reports/` and `output/` artifacts are local/generated outputs and are not committed.

## Gocheok closeout

- Trace review result: approved.
- Official image: `gocheok-kiwoom-seatmap-official-2026.webp`.
- Reviewed blocks: 159 of 159.
- Pending blocks: 0.
- Manual TODO blocks: 0.
- Block `335` remains intentionally omitted because the official PNG does not show an independent block boundary or label clearly enough to create a synthetic hit-area.
- Mobile/Desktop smoke QA: passed.
- Full click QA: passed.

## Daegu P1 boundary-first packet

- Current state: ready for operator.
- Boundary-first rows: 5.
- Target blocks: `T3-2`, `V1`, `V2`, `V3`, `T1-1`.
- Approved valid rows: 0.
- Production write allowed: false.
- Required next step: operator-approved corrected paths and label points before production seat data updates.

## Repository policy

- Do not commit generated `reports/` or `output/` artifacts.
- Keep `.env.production` out of Git tracking; production values should come from deployment environment variables.
- If a local report contains a durable decision, summarize the decision in `docs/` instead of committing the generated report.
- Seatmap report artifacts can be regenerated from the relevant QA commands when needed.
