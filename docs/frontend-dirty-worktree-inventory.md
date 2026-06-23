# Frontend Dirty Worktree Inventory

Date: 2026-06-22
Branch: `feature` (`origin/feature` 대비 `ahead 11`)

## Summary

This inventory records the remaining frontend dirty worktree after packaging the
low-risk API/bundle guard, prediction hook, and prediction card text fixes. It
does not revert, delete, format, or refactor any source file.

Current source commands:

- `git status -sb`
- `git status --short -uall`
- `git status --short -uall | wc -l`
- `git status --short -uall | awk '{counts[$1]+=1} END {for (status in counts) print status, counts[status]}' | sort`

Current snapshot:

- `475` dirty entries
- `402` modified
- `3` deleted
- `70` untracked

## Packaged In This Pass

These changes are already isolated in separate commits:

| Commit | Package | Verification |
| --- | --- | --- |
| `e6a02da6` | Bundle guard optional budget baseline | `node --test scripts/bundle-budget-policy.test.mjs`; clean temp `npm run build` |
| `997e72a6` | `usePredictionGameData` deferred live polling and prime helpers | `node --import tsx --test src/hooks/usePredictionGameDataDeferredPolling.test.ts src/utils/predictionDeferredWork.test.ts src/utils/liveGame.test.ts` |
| `03ba9fc9` | `AdvancedMatchCard` dark mode text readability | clean temp `node --import tsx --test src/components/prediction/AdvancedMatchCardStatusBadgeContract.test.ts` |

The repository still has unrelated dirty files. The commands above were either
run against the exact staged file set or against a clean temporary archive with
only the selected patch applied.

## Explicitly Excluded Prediction Residuals

Keep these out of follow-up commits unless there is a dedicated contract update:

- `src/components/prediction/AdvancedMatchCard.tsx`
  - Remaining dirty line removes `statusCode` from `contentRuntimeProps`.
  - Excluded because `AdvancedMatchCardStatusBadgeContract.test.ts` protects
    the runtime `statusCode` forwarding contract.
- `src/components/prediction/AdvancedMatchCardContentRuntime.tsx`
  - Dirty change removes the `statusCode` prop/import.
  - Excluded for the same contract reason.
- `src/components/prediction/AdvancedMatchCardContentRuntime.test.ts`
  - Dirty change removes or weakens manual-data/live warning assertions.
  - Excluded because it reduces coverage around `MANUAL_BASEBALL_DATA_REQUIRED`
    and scoreboard/live relay warning metadata.

## Remaining Package Buckets

| Package | Representative paths | Recommended next gate |
| --- | --- | --- |
| Mate | `src/components/Mate*`, `src/hooks/mate*`, `src/api/mate*`, mate Cypress specs, deleted `MatePartyDetailDrawer.tsx` | Unit/query tests first, then focused mate Cypress route/regression |
| MyPage/diary/profile | `src/components/MyPage*`, `src/components/mypage/**`, `src/hooks/useMyPage.ts`, diary/profile types | MyPage/diary unit tests, then build budget review |
| Stadium docs/scripts/data | `docs/*seatmap*`, `docs/stadium/**`, stadium ops scripts, `src/components/*SeatMap*`, `src/data/*SeatData*` | Runner/status checks, then staged mobile/full QA gates |
| Cypress regression | `cypress/e2e/**`, `cypress/support/**`, deleted `mate-detail-drawer.cy.ts` | Split by owning package; do not commit broad Cypress changes alone |
| Cheer | `src/components/Cheer*`, `src/hooks/cheer*`, `src/api/cheerApi.ts` | Cheer unit/API checks, then focused feed/detail Cypress |
| Home/landing/auth shell | `src/App.tsx`, `src/components/App*`, `src/components/Landing*`, `src/components/Auth*`, public shell files | Build plus focused home/auth/landing specs |
| Shared infra/config | `src/lib/**`, `src/store/**`, `src/utils/**`, `vite.config.ts`, `tailwind.config.js`, `tsconfig.json` | Review after domain packages because blast radius is wider |
| Admin/chatbot/offseason/notice | `src/components/admin/**`, `src/components/chatbot/**`, `src/components/offseason/**`, notice components | Package later unless a domain test requires it |

## Deletion Hotspots

Deleted entries in the current frontend status:

- `cypress/e2e/mate-detail-drawer.cy.ts`
- `src/components/MatePartyDetailDrawer.tsx`
- `scripts/__pycache__/coach-analysis-smoke.cpython-310.pyc`

Do not restore or permanently delete these from this inventory task. Review them
inside the owning package.

## Recommended Order

1. Mate package
   - Highest immediate deletion risk because it includes the drawer component
     and drawer Cypress spec removal.
2. MyPage package
   - Bundle guard now treats several MyPage chunks as optional when absent, so
     MyPage source changes should get their own build/budget check.
3. Stadium docs/scripts/data package
   - Keep visual/mobile/full QA staged; do not combine with Mate or MyPage.
4. Cypress package split
   - Move each Cypress change into the owning package after its source package
     is stable.
5. Shared infra and remaining domains
   - Handle only after high-volume domain packages have passed focused gates.

## Guardrails

- Do not combine Mate, Stadium, MyPage, and prediction residuals into one commit.
- Do not use this inventory to justify deleting tracked files.
- Do not weaken `AdvancedMatchCardContentRuntime` manual-data/live warning tests
  without a dedicated behavior change plan.
- Do not rerun formatters over the whole frontend.
- Do not change backend or AI service files from this frontend inventory task.

## Verification For This Inventory

Run after editing this document:

- `git -C /Users/mac/project/KBO_platform/bega_frontend diff --check -- docs/frontend-dirty-worktree-inventory.md`
- `git -C /Users/mac/project/KBO_platform/bega_frontend status --short -uall -- docs/frontend-dirty-worktree-inventory.md`
