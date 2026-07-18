# Task 2: Validated Detail-to-List Return Path

## Summary

Added a validated `returnTo` value to Mate route state. Detail-page list-return actions now use that validated value, preserving a canonical filtered-list path when it is supplied and safely falling back to `/mate` otherwise.

## Files changed

- `src/types/mate.ts`
  - Added optional `MateRouteLocationState.returnTo`.
- `src/utils/mate.ts`
  - Added `normalizeMateListReturnTo(value: unknown)`.
  - Extended `buildMateRouteLocationState(partySeed, returnTo?)` to normalize its return path.
- `src/utils/mateRouteState.test.ts`
  - Added route-state propagation and malicious/invalid return-path coverage.
- `src/hooks/useMateDetailController.ts`
  - Reads React Router location state and routes existing list-return actions through the validated path.

## RED evidence

Command:

```bash
/opt/homebrew/opt/node@22/bin/node --import tsx --test src/utils/mateRouteState.test.ts
```

Output:

```text
SyntaxError: The requested module './mate' does not provide an export named 'normalizeMateListReturnTo'
not ok 1 - src/utils/mateRouteState.test.ts
# fail 1
```

Expected reason: the new validator was not exported yet, and the route-state builder did not yet carry `returnTo`.

## GREEN evidence

Commands:

```bash
/opt/homebrew/opt/node@22/bin/node --import tsx --test src/utils/mateRouteState.test.ts
npm run build
```

Output:

```text
# tests 4
# pass 4
# fail 0

vite v7.3.6 building client environment for production...
✓ built in 5.17s
[bundle-guard] ok. checked 153 budgets.
[seo:prerender] prerendered 9 indexable and 2 performance route(s).
[seo:sitemap] generated .../bega_frontend/dist/sitemap.xml
```

## Self-review

- Confirmed only relative same-origin paths with the exact `/mate` pathname are retained; protocol-relative, absolute, nested-detail, non-string, and invalid values fall back to `/mate`.
- Confirmed `handleClose` continues to cover the existing close, missing-party redirect, and rejected-state browse-list flows.
- Ran `git diff --check` successfully before committing.
- Staged and committed only the four scoped Task 2 files.

## Commit

- `c2e3156e feat(mate): preserve filtered list return path`

## Concerns

- Existing unrelated working-tree changes remain unstaged: `.superpowers/sdd/task-1-report.md`, `cypress/e2e/landing-visual.cy.ts`, `reports/bundle-guard-report.json`, and `reports/dist-assets-report.json`. The build refreshed the two report files; they were intentionally excluded from the Task 2 commit.
