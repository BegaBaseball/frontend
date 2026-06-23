# Mate Search And History Release Gate Report

Date: 2026-06-22

## Scope

This gate is limited to the frontend Mate package currently being reviewed:

- Mate search term normalization, recent search store, and popular search integration.
- Mate list query/cache contract and pagination reset behavior.
- Mate history API/query contract using `/parties/my/history`.
- MyPage Mate history cards as Mate-owned entry points into `/mate/:id`.
- Mate route/detail/check-in Cypress coverage that guards the controller/runtime split.

Excluded from this gate:

- Backend endpoint implementation and database schema changes.
- Generated OpenAPI type refresh.
- General MyPage, Stadium, Cheer, Prediction, and shared-shell changes.
- Full Mate regression beyond the smoke gates unless selected as a follow-up.

## Contract Notes

- Public route names are unchanged: `/mate`, `/mate/:id`, `/mate/:id/apply`, `/mate/:id/manage`, `/mate/:id/checkin`, and `/mate/:id/chat`.
- Legacy `/mate?party=<id>` input is accepted and normalized to `/mate/:id`.
- Invalid `party` query values are removed without issuing a detail request.
- Mate history uses paginated `/parties/my/history` data and seeds the detail cache before navigating to `/mate/:id`.
- The removed drawer spec is not a public route removal; it reflects the current full-page detail route contract.

## Required Gates

Passed:

- `npm run test:mate:smoke` (`64 passing`)
- `node --import tsx --test src/components/MateResultsRuntime.test.tsx src/utils/mateDateLabels.test.ts src/store/mateRecentSearchStore.test.ts` (`10 passing`)
- `CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run qa:mate:mobile:smoke` (`5 passing`)
- `CYPRESS_ALLOW_GLOBAL_FALLBACK=1 npm run test:e2e:mate:smoke` (`23 passing`)

The Mate E2E smoke was rerun after narrowing stale Cypress expectations for the new controller/runtime shape. The final rerun passed both included specs:

- `mate-detail-states.cy.ts`: `14 passing`
- `mate-execution-flow.cy.ts`: `9 passing`

## Mobile Smoke Note

- Project-local `.cypress-cache` verification may fail in this workspace.
- The allowed global Cypress fallback was used from `/Users/mac/Library/Caches/Cypress`.
- Cypress version observed in the run: `15.13.0`.
- The run generated evidence under `/Users/mac/project/KBO_platform/output/playwright/`; generated output was not added to this review package.

## Release Decision

The focused frontend Mate search/history and route smoke gates are green for this package. OpenAPI generated type sync and the broader full Mate regression remain separate follow-up gates.
