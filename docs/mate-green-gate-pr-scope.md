# Mate Green Gate PR Scope Manifest

Date: 2026-06-09

## Scope Lock

This manifest is for packaging the already-green Mate/OpenAPI/Flyway gate work into a PR. It does not add feature work and it does not clean or revert unrelated dirty worktree changes.

The PR should be assembled from the include candidates below. Existing unrelated dirty files should remain untouched and unstaged unless a separate PR explicitly owns them.

## Include Candidates

### PR Packaging Docs

These files document the exact PR scope and can be included with the packaging PR:

- `docs/mate-green-gate-pr-scope.md`
- `docs/mate-green-gate-pr-description.md`

### Mate E2E Stabilization

These files belong to the Cypress auth bootstrap, Mate route diagnostics, detached-DOM stabilization, and Mate smoke/full regression gate:

- `cypress/support/auth.ts`
- `cypress/support/commands.ts`
- `cypress/e2e/mate.cy.ts`
- `cypress/e2e/mate-detail-states.cy.ts`
- `cypress/e2e/mate-detail-drawer.cy.ts`
- `cypress/e2e/mate-selling-payment-success.cy.ts`
- `cypress/e2e/mate-visual.cy.ts`
- `scripts/mate-smoke.sh`

### OpenAPI Contract Boundary

These files lock the generated TypeScript wire contract and the script used by `api:types` and `api:types:check`:

- `package.json`
- `package-lock.json`
- `scripts/generate-openapi-types.mjs`
- `src/api/openapiTypes.ts`
- `src/api/generated/openapi.ts`
- `src/api/mate.ts`
- `src/hooks/useMatePartyFromRoute.ts`

`src/api/mate.ts` is included only for the OpenAPI generated-type boundary. Keep unrelated Mate UI/API refactors out of this green-gate PR unless the PR scope is intentionally expanded.

`src/hooks/useMatePartyFromRoute.ts` is included only for the tiny compile fix that removes a stale second argument to `getMatePartyQueryOptions` after the scoped Mate API option shape is restored.

### Prediction Wire Mapper

These files are included because the OpenAPI gate exposed the `LocalTime` wire mismatch and the mapper/test path now guards it:

- `src/api/predictionMappers.ts`
- `src/api/predictionMappers.test.ts`
- `src/api/prediction.ts`
- `src/api/predictionBootstrap.ts`
- `src/api/predictionRange.ts`
- `src/api/prediction.test.ts`
- `src/api/predictionRange.test.ts`

Do not include large Prediction UI changes in this PR.

### Backend OpenAPI Contract Boundary

These backend files are included because the generated frontend OpenAPI contract references the concrete response schemas they expose:

- `bega_backend/BEGA_PROJECT/src/main/java/com/example/auth/config/SecurityConfig.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/common/config/SwaggerConfig.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/PredictionController.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/PredictionBootstrapErrorDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/PredictionBootstrapResourceDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/PredictionBootstrapResponseDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/PredictionBootstrapService.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/PredictionMyVoteEntryDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/PredictionMyVotesResponseDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/PredictionStatsResponseDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/RankingPredictionCurrentSeasonDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/GameDetailDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/GameInningScoreDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/GameSummaryDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/MatchDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/MatchRangePageResponseDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/PredictionResponseDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/RankingPredictionController.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/RankingPredictionInitDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/RankingPredictionResponseDto.java`
- `bega_backend/BEGA_PROJECT/src/main/java/com/example/prediction/UserPredictionStatsDto.java`
- `bega_backend/BEGA_PROJECT/src/test/java/com/example/prediction/PredictionBootstrapServiceTest.java`
- `bega_backend/BEGA_PROJECT/src/test/java/com/example/prediction/PredictionControllerBoundsTest.java`
- `bega_backend/BEGA_PROJECT/src/test/java/com/example/prediction/PredictionControllerMyVotesTest.java`
- `bega_backend/BEGA_PROJECT/src/test/java/com/example/prediction/PredictionOpenApiContractTest.java`

`SecurityConfig.java` is included only for the `/api/predictions/bootstrap` public GET rule. Keep unrelated CORS comment-only changes unstaged.

### Flyway Canonical Migrations

These backend PostgreSQL files must be included because they are required by the current dev Flyway schema history:

- `bega_backend/BEGA_PROJECT/src/main/resources/db/migration_postgresql/V99_5__bootstrap_v100_index_prerequisites.sql`
- `bega_backend/BEGA_PROJECT/src/main/resources/db/migration_postgresql/V144_5__bootstrap_kbo_game_lookup_tables.sql`
- `bega_backend/BEGA_PROJECT/src/main/resources/db/migration_postgresql/V146_5__bootstrap_game_event_tables.sql`
- `bega_backend/BEGA_PROJECT/src/main/resources/db/migration_postgresql/V148__add_team_ranking_lookup_indexes.sql`
- `bega_backend/BEGA_PROJECT/src/main/resources/db/migration_postgresql/V149__add_mate_diary_performance_indexes.sql`
- `bega_backend/BEGA_PROJECT/src/main/resources/db/migration_postgresql/V150__create_operator_data_p0_tables.sql`

Warning: V150 has already been applied to the dev DB. If `V150__create_operator_data_p0_tables.sql` is omitted from the PR, future backend startup/migration validation can fail against the applied schema history.

Current dev DB validation also reports V144.5, V146.5, V148, and V149 as applied migrations, so omitting those PostgreSQL files blocks scoped `bootRun` before OpenAPI validation.

## Exclude Candidates

Keep these out of this PR unless a separate scope explicitly owns them:

- `reports/bundle-guard-report.json`
- `reports/dist-assets-report.json`
- `scripts/bundle-guard.mjs`
- Stadium/home/diary/coach UI changes
- Deleted stadium PNG assets
- Stadium release-lock/runbook/report document churn
- Separate performance audit scripts such as `scripts/prediction-performance-audit*.mjs`
- `package.json` `qa:prediction:perf*` script entries unless a separate performance PR owns them
- Large Prediction UI/runtime changes unrelated to the wire mapper
- Prediction user-vote runtime cache invalidation hooks unless a separate runtime PR owns them
- Backend diary/home/AI/cheer/media changes and Prediction warm-up/cache/performance expansion unrelated to the OpenAPI contract or Flyway V99.5/V150

## Dirty Worktree Notes

The worktree currently contains many unrelated modified and untracked files. Do not run broad `git add .` for this PR. Use an explicit path list from the include candidates.

Broader Mate REST/controller/frontend refactor files are also dirty in the workspace. They should be handled as a separate Mate domain standardization PR unless this PR's scope is deliberately expanded beyond green-gate packaging.

The generated `src/api/generated/openapi.ts` file should be produced from a backend containing only the scoped OpenAPI/Flyway changes, not from the broader dirty backend worktree.

Current 2026-06-09 exclusion note: `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`, and `scripts/bundle-guard.mjs` are dirty. The report files are generated artifact noise, and `scripts/bundle-guard.mjs` contains a Mate runtime budget bump. Do not stage these files for this green-gate PR.

Current 2026-06-09 inspection note: the dirty worktrees contain mixed-scope Prediction/backend changes that were previously easy to stage accidentally. Do not run `git add .`, `git add -u`, or broad directory staging. A clean Green Gate PR requires an explicit-path staging pass from the include candidates above.

## Validation Status

Revalidated on 2026-06-09.

Backend and OpenAPI:

- Passed: `./gradlew compileJava --rerun-tasks`
- Passed startup: `./gradlew bootRun --args='--server.port=18080'`
  - App reached started state on port 18080.
  - Process was terminated after OpenAPI/DB checks; Gradle reported exit 143 from that cleanup termination.
- Passed: read-only DB verification for V150
  - `v150_success = true`
  - `duplicate_slot_count = 0`
  - `conflict_index_count = 1`
- Passed: `OPENAPI_SCHEMA_URL=http://127.0.0.1:18080/v3/api-docs npm run api:types:check`

Frontend:

- Passed: `./node_modules/.bin/tsc --noEmit`
- Passed: `node --import tsx --test src/api/predictionMappers.test.ts src/api/predictionRange.test.ts src/api/prediction.test.ts`
- Passed: `npm run test:mate:smoke`
- Passed: `VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build`
- Passed: `npm run test:e2e:mate:full`
  - route: 31/31
  - create: 6/6
  - extended: 14/14

## Safety Notes

- No `flyway repair` was used.
- No DB schema history row was edited manually.
- No `app.flyway.auto-repair=true` path was used.
- No external baseball crawling, scraping, or web-search-based baseball data collection was added.
- Build report files and bundle budget changes should remain excluded from this green-gate PR unless a separate budget policy PR explicitly owns them.
- Mixed-scope dirty worktree changes were left unstaged as part of this scope lock.
