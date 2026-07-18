# Task 1: Pure Mate List URL State Contract

## Implementation summary

- Added a pure URL-state parser, serializer, canonicalizer, local-date validator, and mate return-path builder.
- Kept the URL contract canonical: omitted defaults, removed invalid known values, preserved unknown/legacy parameters, and translated URL page numbers from one-based to zero-based query pages.
- Moved `MateStatusTabKey` to the pure URL-state module while re-exporting it from `MateStatusTabs` so existing callers retain their import contract.

## Files changed

- `src/utils/mateListUrlState.ts` (new)
- `src/utils/mateListUrlState.test.ts` (new)
- `src/components/MateStatusTabs.tsx` (modified)

## RED evidence

Command:

```bash
/opt/homebrew/opt/node@22/bin/node --import tsx --test src/utils/mateListUrlState.test.ts
```

Output: failed as expected with `ERR_MODULE_NOT_FOUND`, reporting that `src/utils/mateListUrlState.test.ts` could not import `./mateListUrlState`.

Why expected: the contract test was written before the implementation module existed, so the failure demonstrates the test exercised the requested public module boundary.

## GREEN evidence

Commands:

```bash
/opt/homebrew/opt/node@22/bin/node --import tsx --test src/utils/mateListUrlState.test.ts
npm run build
```

Output:

- URL contract test: 6 tests passed, 0 failed.
- Production build: exited 0. The strict log audit, SEO environment check, Vite builds, asset guard, prerender, and sitemap generation all completed successfully.

## Self-review

- Confirmed `git diff --check` reports no whitespace errors.
- Confirmed canonicalization deletes only known Mate keys and retains `campaign`, `party`, and other legacy/unknown parameters in their original order.
- Confirmed date validation constructs local calendar dates and rejects invalid or non-zero-padded dates without UTC conversion.
- Confirmed the status-tab module retains its public type export for current callers.

## Commit

`2f77526f feat(mate): add list URL state contract`

## Concerns

- `npm run build` updated existing generated reports: `reports/bundle-guard-report.json` and `reports/dist-assets-report.json`. They are deliberately excluded from this task's scoped commit.
