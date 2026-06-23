# Mate Package Review

Date: 2026-06-22

## Scope

This package covers the remaining Mate frontend changes only:

- Mate API/query/cache/store updates for list, detail, search terms, and my history.
- Mate list/detail/create/manage/check-in/chat controller and runtime split.
- Recent and popular Mate search behavior.
- MyPage Mate history entry points that are backed by `/parties/my/history`.
- Mate Cypress specs that protect route, detail, check-in, search, and history behavior.

Excluded from this package:

- General MyPage diary/profile/settings work outside Mate history.
- Stadium, Cheer, Prediction residual work, shared shell/config, backend, and AI changes.
- OpenAPI generated type sync. That remains a follow-up task.

## Deletion Hotspot

The old desktop drawer flow is removed from this package:

- `src/components/MatePartyDetailDrawer.tsx`
- `cypress/e2e/mate-detail-drawer.cy.ts`

Live source and Cypress references were checked with:

```bash
rg "MatePartyDetailDrawer|mate-detail-drawer" src cypress docs
```

The remaining matches are documentation/inventory references only. The current route contract is:

- `/mate` remains the list route.
- `/mate/:id` is the full detail route.
- `/mate?party=<id>` is normalized into `/mate/:id`.
- Invalid `party` query values are removed without opening a drawer.

## Verification

Passed:

- `npm run test:mate:smoke` (`64 passing`)
- `node --import tsx --test src/components/MateResultsRuntime.test.tsx src/utils/mateDateLabels.test.ts src/store/mateRecentSearchStore.test.ts` (`10 passing`)
- `CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run qa:mate:mobile:smoke` (`5 passing`)
- `CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run test:e2e:mate:smoke` (`23 passing`)

The E2E smoke initially exposed two stale Cypress contracts after the controller/runtime split:

- list-route test alias was tied to an old URL glob and now uses the exact `/api/parties` pathname matcher;
- Mate history card assertions now use the current `data-testid="mypage-mate-card"` and visible `상세보기` label.

Both fixes are test-only and stay inside Mate Cypress coverage.

## Caveats

- Cypress local cache verification may fail in this workspace; the allowed global fallback was used from `/Users/mac/Library/Caches/Cypress`.
- Vite emitted websocket proxy `ECONNREFUSED` warnings during Cypress runs; the specs passed and no HTTP API failure was observed.
- The previously noted full Mate regression selling-flow visibility issue remains outside this package unless the full regression gate is explicitly selected next.
- Generated OpenAPI types were not refreshed in this package.
- The frontend worktree still contains many unrelated dirty files. This package must be staged by explicit paths only.
