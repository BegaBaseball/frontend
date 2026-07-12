# Frontend Worktree Consolidation Inventory

Captured before consolidation on 2026-07-12.

## Primary Branch

- Repository: `/Users/mac/project/KBO_platform/bega_frontend`
- Branch: `codex/frontend-cwv-integration-20260712`
- HEAD: `6942206036c775f374d0ac90c63e9a421a79ad03`
- Divergence from local `feature`: `feature-only=8`, `codex-only=20`
- Merge direction: `origin/feature` into `codex/frontend-cwv-integration-20260712`

Uncommitted source and workflow groups:

- Seven `.github/workflows/*.yml` CI workflow files
- `scripts/frontend-ui-impact.mjs`
- `scripts/frontend-ui-impact.test.ts`
- `src/api/sse.ts`
- `src/api/sse.test.ts`

Generated report dirt:

- `reports/bundle-guard-report.json`
- `reports/dist-assets-report.json`

Planned preservation branches:

- Source remains on `codex/frontend-cwv-integration-20260712`
- Reports: `rescue/cwv-reports-20260712`

## Linked and Detached Worktrees

### Landing scan

- Path: `/private/tmp/kbo_frontend_daily_scan_20260708_fd37`
- State: detached
- HEAD: `fd37b74fbff7aabb8c10d25bbfb14a7049be636b`
- Source: `src/components/Landing.tsx`
- Reports: `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`
- Source branch: `rescue/landing-layout-20260708`
- Report branch: `rescue/landing-layout-reports-20260708`

### Parent scan

- Path: `/private/tmp/kbo_frontend_daily_scan_20260708_parent`
- State: detached
- HEAD: `4d79e04c7c0926168e64b41ccb1bf823dec315d0`
- Source: none
- Reports: `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`
- Report branch: `rescue/daily-scan-parent-reports-20260708`

### Performance worktree

- Path: `/Users/mac/project/KBO_platform/.frontend-performance-worktree`
- Branch: `codex/frontend-performance-p1-20260711`
- HEAD: `12a170e2c2e484eeefa69944ed3ae0430dd878a6`
- Source: none; branch is already an ancestor of `feature`
- Reports: `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`
- Report branch: `rescue/performance-reports-20260711`

### Prerequisites worktree

- Path: `/Users/mac/project/KBO_platform/.frontend-prerequisites-worktree`
- Branch: `codex/frontend-prerequisites-20260711`
- HEAD: `66ad02fb128e38c1248d120a1140949ee5fa9287`
- Status: clean; branch is already an ancestor of `feature`

### OAuth worktree

- Path: `/Users/mac/project/KBO_platform/bega_frontend_oauth_fix`
- State: detached
- HEAD: `4d79e04c7c0926168e64b41ccb1bf823dec315d0`
- Source: `scripts/oauth-provider-link-preflight.mjs`, `src/api/authPublic.ts`, `src/api/authPublic.test.ts`
- Reports: `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`
- Source branch: `rescue/oauth-origin-fix-20260708`
- Report branch: `rescue/oauth-origin-fix-reports-20260708`

### SEO worktree

- Path: `/Users/mac/project/KBO_platform/bega_frontend_seo_redirect_fix`
- State: detached
- HEAD: `4d79e04c7c0926168e64b41ccb1bf823dec315d0`
- Source/config: `package.json`, `scripts/seo-postdeploy-smoke.mjs`, `scripts/seo-postdeploy-smoke.test.mjs`, `worker/index.test.ts`, `wrangler.jsonc`
- Reports: `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`
- Source branch: `rescue/seo-canonical-redirect-20260708`
- Report branch: `rescue/seo-canonical-redirect-reports-20260708`

## Preservation and Cleanup Gates

- No source worktree may be removed before its source branch is committed and merged.
- No dirty report worktree may be removed before its report rescue branch is committed.
- No worktree may be removed with filesystem deletion; use `git worktree remove` only.
- Report rescue branches are not merged and are retained until explicit deletion approval.
- Remote push, PR merge, remote branch deletion, and cleanup happen only after the local integration gate passes.
