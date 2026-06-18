# Stadium Seatmap Asset Deletion Review

Date: 2026-06-18
Rechecked: 2026-06-19 KST
Owner decision: APPROVED on 2026-06-19 KST

## Summary

This review isolates the tracked Stadium asset and Sajik document deletions from
the broader Stadium package. It records owner approval for permanent deletion
and does not restore files.

Current status:

- `20` tracked PNG files under `src/assets/stadiums/**` are deleted.
- `docs/sajik-seatmap-canonical-staging-rehearsal.md` is deleted.
- Every deleted file in this review has `ownerDecision=APPROVED`.
- Current live source inspection did not find direct imports of the deleted PNG
  filenames when checked with exact `.png` filename matching.
- The Sajik packaging inventory treats the deleted rehearsal doc as
  approved deleted and excluded from the package.

2026-06-19 recheck:

- `git ls-files -d src/assets/stadiums docs/sajik-seatmap-canonical-staging-rehearsal.md`
  still reports the same `20` deleted tracked PNG files and the deleted Sajik
  rehearsal document.
- Exact `.png` filename matching under `src` still reports no live source
  references to the deleted PNG filenames.
- `ownerDecision=APPROVED` is now recorded for every file in this review.

## Approved Deleted Files

| Path | ownerDecision | Current classification | Review note |
| --- | --- | --- | --- |
| `docs/sajik-seatmap-canonical-staging-rehearsal.md` | `APPROVED` | Approved deleted document | Previously listed as included in the Sajik PR packaging inventory. It is now excluded from the package and deletion remains in this review package. |
| `src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/kia/gwangju-kia-seatmap-official-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/kiwoom/gocheok-kiwoom-seatmap-official-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/kt/suwon-kt-seatmap-official-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/lg/jamsil-lg-seatmap-bg-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/lg/jamsil-lg-seatmap-blue-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/lg/jamsil-lg-seatmap-default-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/lg/jamsil-lg-seatmap-exciting-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/lg/jamsil-lg-seatmap-green-cheer-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/lg/jamsil-lg-seatmap-green-outfield-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/lg/jamsil-lg-seatmap-navy-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/lg/jamsil-lg-seatmap-orange-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/lg/jamsil-lg-seatmap-premium-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/lg/jamsil-lg-seatmap-red-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/lg/jamsil-lg-seatmap-table-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/nc/changwon-nc-seatmap-official-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |
| `src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.png` | `APPROVED` | Approved deleted PNG | No live source import found for this exact `.png` filename during this review. |

## Post-Approval Rules

- Missing live imports were verified separately before owner approval.
- If a later owner review reverses a decision, restore only the specific file
  from Git history in a separate asset cleanup task.
- Keep the deletion and update the relevant release lock or asset README in the
  same review package.
- Do not replace missing official baseball assets with external crawling,
  scraping, or web-search data.

## Evidence Commands

Use these commands when reviewing the deletion decision:

```bash
git -C /Users/mac/project/KBO_platform/bega_frontend ls-files -d src/assets/stadiums docs/sajik-seatmap-canonical-staging-rehearsal.md
rg "sajik-seatmap-canonical-staging-rehearsal.md" /Users/mac/project/KBO_platform/bega_frontend/docs
rg "daejeon-hanwha-life-eagles-park-seatmap-official-2026\\.png|gwangju-kia-seatmap-official-2026\\.png|gocheok-kiwoom-seatmap-official-2026\\.png|suwon-kt-seatmap-official-2026\\.png|jamsil-lg-seatmap-(bg|blue|default|exciting|green-cheer|green-outfield|navy|orange|premium|red|table)-2026\\.png|sajik-lotte-seatmap-official-2026\\.png|sajik-seatmap-operator-reference-2026\\.png|changwon-nc-seatmap-official-2026\\.png|daegu-samsung-seatmap-official-2026\\.png|incheon-ssg-seatmap-official-2026\\.png" /Users/mac/project/KBO_platform/bega_frontend/src
```
