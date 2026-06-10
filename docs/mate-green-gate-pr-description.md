# PR Description Draft: Mate Green Gate Scope

## Summary

Stabilizes the Mate green gate and restores the OpenAPI/Flyway validation path. This PR packages the Cypress auth/bootstrap fixes, backend/frontend OpenAPI contract files, Prediction wire-time mapper guardrails, and canonical PostgreSQL Flyway migrations required by the current dev schema history.

## Why

The branch was green only after several gate blockers were resolved:

- Mate Cypress specs could fail late through inconsistent auth bootstrap or detached DOM interactions.
- OpenAPI generated TypeScript types drifted from the backend `/v3/api-docs` schema.
- Prediction wire responses could expose Java `LocalTime` object shapes where the frontend expected strings.
- Backend startup was blocked by Flyway V150 when existing `game_lineups` data violated the target unique index contract.
- Scoped backend startup also requires the PostgreSQL migration files already recorded in dev schema history, including V144.5, V146.5, V148, and V149.

## Key Changes

- Centralized Cypress auth seeding for Mate specs and kept 401 diagnostics so unmocked API calls surface immediately.
- Stabilized Mate Cypress interactions that were vulnerable to detached DOM or stale element references.
- Added `openapi-typescript` generation/check scripts and included the generated `src/api/generated/openapi.ts` contract.
- Added the OpenAPI type helper used at the API boundary.
- Typed the Mate API boundary against generated OpenAPI wire types while keeping UI domain models normalized separately.
- Removed a stale Mate route hook option so the scoped API boundary compiles without the broader Mate hook refactor.
- Added the concrete backend OpenAPI response DTOs, schema annotations, and bootstrap endpoint contract required by the generated frontend types.
- Preserved the legacy Prediction my-votes `votes` map while adding typed `entries` for generated OpenAPI consumers.
- Added Prediction wire mappers and tests for `LocalTime` object/string/null/invalid handling across range and bootstrap fetch paths.
- Added canonical PostgreSQL Flyway files for V99.5, V144.5, V146.5, V148, V149, and V150.
- Made V150 deterministic before creating the `game_lineups(game_id, team_code, batting_order)` unique index by normalizing duplicate lineup slots inside the migration.

## Validation

- Revalidated on 2026-06-09.
- `./gradlew compileJava --rerun-tasks`
- `./gradlew bootRun --args='--server.port=18080'`
  - Started successfully on port 18080.
  - Stopped after OpenAPI/DB checks; Gradle exit 143 came from that cleanup termination.
- Read-only DB verification:
  - V150 success: true
  - duplicate lineup slots: 0
  - conflict index count: 1
- `OPENAPI_SCHEMA_URL=http://127.0.0.1:18080/v3/api-docs npm run api:types:check`
- `./node_modules/.bin/tsc --noEmit`
- `node --import tsx --test src/api/predictionMappers.test.ts src/api/predictionRange.test.ts src/api/prediction.test.ts`
- `npm run test:mate:smoke`
- `VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build`
- `npm run test:e2e:mate:full`
  - route: 31/31
  - create: 6/6
  - extended: 14/14

## Risk And Rollback Notes

- V150 has already been applied to the dev DB, so the canonical V150 migration file must ship with this PR.
- The migration does not use `flyway repair`, does not edit schema history manually, and does not enable auto-repair.
- The V150 duplicate cleanup is deterministic and preserves one row per `(game_id, team_code, batting_order)` using starter/manual/latest/stable ordering.
- No external baseball crawling or scraping was added.
- If rollback is required before merge, revert this PR as a source-code change and validate Flyway state against the target environment before attempting backend startup.

## Scope Notes

- Do not include report noise unless bundle budget policy actually changed.
- Do not include `scripts/bundle-guard.mjs`; the current Mate runtime budget bump belongs in a separate budget/UI PR.
- Do not broad-stage from the dirty worktrees; unrelated Prediction/backend changes were found during packaging and must remain outside this Green Gate scope.
- Do not include `scripts/prediction-performance-audit*`, `qa:prediction:perf*` package scripts, Prediction warm-up/cache/performance files, or large Prediction UI/runtime rollout files.
- Do not include Prediction user-vote runtime cache invalidation hooks; that cache behavior belongs in a separate runtime PR.
- Do not include stadium/home/diary/coach or large Prediction UI changes in this PR.
- Broader Mate REST/frontend refactors should be staged only if this PR is intentionally expanded beyond green-gate packaging.
