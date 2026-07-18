# Cheer Internal API Smoke Design

## Purpose

Add a read-only smoke test that verifies the Cheer page's real frontend/backend contracts without creating users, posts, reactions, uploads, or other persistent data.

## Scope

The smoke test requests only internal project endpoints:

- `GET /api/cheer/posts`
- `GET /api/cheer/posts/hot`
- `GET /api/cheer/posts/search`
- `GET /api/kbo/schedule`
- `GET /api/matches/{gameId}/live` when the schedule contains a live game
- backend readiness health before contract checks

The test does not use browser automation, external baseball APIs, crawling, scraping, search-based repair, pixel comparison, or production data writes.

## Architecture

Create one dependency-injectable Node ESM script under `scripts/`. Its exported runner accepts an API base URL, date, timeout, and fetch implementation, then returns a structured report. The CLI wrapper resolves configuration from arguments or existing smoke environment variables, writes the report, and sets a non-zero exit code only for actual contract or transport failures.

Add focused Node tests that inject deterministic responses. This keeps payload validation and request sequencing testable without requiring a backend for every unit run, while the CLI remains runnable against the local internal backend.

## Contract Rules

- Feed, hot, and search responses must be Spring-style page objects with `content` plus valid pagination metadata. Both the legacy flat metadata and Spring Boot 3.5 nested `page` metadata are accepted, matching the frontend's `normalizePageResponseMeta` behavior.
- Schedule responses must be arrays when data is available.
- A schedule response carrying `MANUAL_BASEBALL_DATA_REQUIRED` is an accepted guarded state and is recorded as a warning, not replaced with synthesized baseball data.
- A live snapshot is requested only when a schedule row has a valid `gameId` and a live status (`PLAYING`, `LIVE`, `IN_PROGRESS`, or `INPROGRESS`).
- Live snapshot responses must be objects with a matching `gameId` when the field is present and an `events` array when the field is present.
- Empty feed, search, hot, and schedule results are valid.

## Reporting

The JSON report contains:

- overall `ok` state
- `readOnly: true`
- `dataSourcePolicy: internal-api-only`
- API base, KST date, and timestamps
- per-endpoint status and summary
- warnings, including manual baseball data requirements
- failures with endpoint-specific messages

## Error Handling

Configuration, timeout, network, HTTP, non-JSON, and payload-shape failures are recorded explicitly. The script never attempts fallback data repair. A missing live game produces a skipped live-snapshot check rather than a failure.

## Verification

- Node tests cover successful responses, empty/guarded schedule behavior, conditional live requests, and malformed payload failure.
- The package command is checked by a static test.
- The script is run against an available local internal backend.
- TypeScript, frontend build, diff hygiene, and baseball data policy checks run before completion.
