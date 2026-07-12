# Frontend Worktree Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not dispatch subagents unless the user explicitly authorizes delegation.

**Goal:** Preserve every dirty frontend source change, integrate all merge-worthy work onto `feature`, verify the consolidated application, and safely remove stale worktrees.

**Architecture:** Convert each detached dirty worktree into separate source and report rescue branches, then use `codex/frontend-cwv-integration-20260712` as the integration branch. Merge the latest `origin/feature` into that branch, merge source rescue branches with explicit checkpoints, regenerate reports once, and update `feature` only through a green PR.

**Tech Stack:** Git worktrees and branches, npm/Node test runner, Vite, Cypress, GitHub Actions workflows.

## Global Constraints

- Preserve all uncommitted source changes before merging or removing a worktree.
- Preserve generated report dirt on report-only rescue branches; do not merge stale reports.
- Do not use `git reset --hard`, broad `git checkout --`, filesystem deletion, or repository-global stashes.
- Do not rewrite published history or force-push.
- Do not add external baseball crawling, scraping, search repair, or external baseball APIs.
- Do not modify `feature` until the integration branch passes the full gate.
- Ask separately before network push, PR merge, remote branch deletion, or destructive cleanup.

---

### Task 1: Freeze and document the pre-consolidation state

**Files:**
- Create: `docs/superpowers/plans/2026-07-12-frontend-worktree-consolidation-inventory.md`
- Existing design: `docs/superpowers/specs/2026-07-12-frontend-worktree-consolidation-design.md`

**Interfaces:**
- Consumes: current branch refs, worktree paths, HEAD SHAs, and porcelain status.
- Produces: a human-readable inventory used for every preservation and cleanup gate.

- [ ] **Step 1: Capture repository and worktree topology**

Run from `/Users/mac/project/KBO_platform/bega_frontend`:

```bash
git branch --show-current
git rev-parse HEAD
git worktree list --porcelain
git branch -vv --no-abbrev
```

Expected: primary branch `codex/frontend-cwv-integration-20260712`, seven worktrees, and no command that changes repository state.

- [ ] **Step 2: Capture status for every worktree**

Run `git status --short --branch` separately in each path listed in the design document. Record the exact branch/detached state, HEAD SHA, modified source files, generated reports, and untracked files in the inventory document.

- [ ] **Step 3: Record divergence and already-merged branches**

```bash
git rev-list --left-right --count feature...codex/frontend-cwv-integration-20260712
git merge-base --is-ancestor codex/frontend-prerequisites-20260711 feature
git merge-base --is-ancestor codex/frontend-performance-p1-20260711 feature
```

Expected: `feature` and the CWV branch both have unique commits; both older feature branches return exit code 0 as ancestors of `feature`.

- [ ] **Step 4: Commit the runbook documents separately**

```bash
git add docs/superpowers/specs/2026-07-12-frontend-worktree-consolidation-design.md \
  docs/superpowers/plans/2026-07-12-frontend-worktree-consolidation.md \
  docs/superpowers/plans/2026-07-12-frontend-worktree-consolidation-inventory.md
git commit -m "docs(frontend): add worktree consolidation runbook"
```

Expected: only the three consolidation documents are included in the commit.

### Task 2: Preserve and commit the primary CI workflow work

**Files:**
- Modify: `.github/workflows/_frontend-mate-ci.yml`
- Modify: `.github/workflows/_frontend-node-suite.yml`
- Modify: `.github/workflows/ci-workflow-policy.yml`
- Modify: `.github/workflows/frontend-cypress-runner.yml`
- Modify: `.github/workflows/frontend-mate.yml`
- Modify: `.github/workflows/frontend-site-audits.yml`
- Modify: `.github/workflows/frontend-ui-qa.yml`
- Create: `scripts/frontend-ui-impact.mjs`
- Create: `scripts/frontend-ui-impact.test.ts`
- Modify: `src/api/sse.ts`
- Create: `src/api/sse.test.ts`
- Report snapshots: `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`

**Interfaces:**
- Produces: `detectFrontendUiImpact(changedPaths, suiteInput, eventName)`, tested workflow inputs, an SSE completion fix, and `rescue/cwv-reports-20260712`.

- [ ] **Step 1: Run the focused CI-impact tests**

```bash
node --import tsx --test scripts/frontend-ui-impact.test.ts scripts/ci-workflow-policy.test.ts
node scripts/ci-workflow-policy.mjs
```

Expected: all tests and the workflow policy command pass before committing.

- [ ] **Step 2: Review the exact staged scope**

```bash
git add .github/workflows/_frontend-mate-ci.yml \
  .github/workflows/_frontend-node-suite.yml \
  .github/workflows/ci-workflow-policy.yml \
  .github/workflows/frontend-cypress-runner.yml \
  .github/workflows/frontend-mate.yml \
  .github/workflows/frontend-site-audits.yml \
  .github/workflows/frontend-ui-qa.yml \
  scripts/frontend-ui-impact.mjs \
  scripts/frontend-ui-impact.test.ts
git diff --cached --check
git diff --cached --name-status
```

Expected: exactly seven workflow files and two UI-impact script files are staged.

- [ ] **Step 3: Commit the CI workflow work**

```bash
git commit -m "ci(frontend): consolidate UI impact routing"
```

Expected: CI workflow files are committed while SSE and report changes remain unstaged.

- [ ] **Step 4: Verify and commit the SSE completion change separately**

```bash
node --import tsx --test src/api/sse.test.ts
git add src/api/sse.ts src/api/sse.test.ts
git diff --cached --check
git commit -m "fix(sse): stop reading after done event"
```

Expected: the SSE test passes and the commit contains only `src/api/sse.ts` and `src/api/sse.test.ts`.

- [ ] **Step 5: Preserve current report dirt on a report-only branch**

```bash
git switch -c rescue/cwv-reports-20260712
git add reports/bundle-guard-report.json reports/dist-assets-report.json
git commit -m "chore(reports): preserve CWV integration evidence"
git switch codex/frontend-cwv-integration-20260712
```

Expected: `rescue/cwv-reports-20260712` retains the reports, while the primary worktree returns clean to the Codex integration branch.

### Task 3: Preserve the detached Landing worktree

**Files:**
- Source: `src/components/Landing.tsx`
- Report snapshots: `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`

**Interfaces:**
- Produces: `rescue/landing-layout-20260708` and `rescue/landing-layout-reports-20260708`.

- [ ] **Step 1: Create the Landing source branch and commit only source**

Run in `/private/tmp/kbo_frontend_daily_scan_20260708_fd37`:

```bash
git switch -c rescue/landing-layout-20260708
git add src/components/Landing.tsx
git diff --cached --check
git commit -m "fix(landing): align fallback and CTA spacing"
```

Expected: the source rescue branch tip contains only `Landing.tsx`; report files remain modified.

- [ ] **Step 2: Validate the Landing source commit**

```bash
npm run build:base
```

Expected: Vite build and bundle guard pass. Any newly regenerated report changes remain report-only.

- [ ] **Step 3: Preserve report dirt on a separate branch**

```bash
git switch -c rescue/landing-layout-reports-20260708
git add reports/bundle-guard-report.json reports/dist-assets-report.json
git commit -m "chore(reports): preserve Landing scan evidence"
```

Expected: the worktree is clean and the source branch still points to the merge-worthy source commit.

### Task 4: Preserve the detached OAuth worktree

**Files:**
- Source: `scripts/oauth-provider-link-preflight.mjs`
- Source: `src/api/authPublic.ts`
- Test: `src/api/authPublic.test.ts`
- Report snapshots: `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`

**Interfaces:**
- Produces: `rescue/oauth-origin-fix-20260708` and `rescue/oauth-origin-fix-reports-20260708`.

- [ ] **Step 1: Create and verify the OAuth source branch**

Run in `/Users/mac/project/KBO_platform/bega_frontend_oauth_fix`:

```bash
git switch -c rescue/oauth-origin-fix-20260708
node --import tsx --test src/api/authPublic.test.ts
node --check scripts/oauth-provider-link-preflight.mjs
```

Expected: auth API tests and script syntax pass.

- [ ] **Step 2: Commit only OAuth source and tests**

```bash
git add scripts/oauth-provider-link-preflight.mjs src/api/authPublic.ts src/api/authPublic.test.ts
git diff --cached --check
git commit -m "fix(auth): resolve production OAuth backend origin"
```

Expected: reports remain modified but the OAuth source branch is durable.

- [ ] **Step 3: Preserve OAuth report dirt separately**

```bash
git switch -c rescue/oauth-origin-fix-reports-20260708
git add reports/bundle-guard-report.json reports/dist-assets-report.json
git commit -m "chore(reports): preserve OAuth fix evidence"
```

Expected: OAuth worktree status is clean.

### Task 5: Preserve the detached SEO worktree

**Files:**
- Modify: `package.json`
- Modify: `scripts/seo-postdeploy-smoke.mjs`
- Modify: `scripts/seo-postdeploy-smoke.test.mjs`
- Modify: `worker/index.test.ts`
- Modify: `wrangler.jsonc`
- Report snapshots: `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`

**Interfaces:**
- Produces: `rescue/seo-canonical-redirect-20260708` and `rescue/seo-canonical-redirect-reports-20260708`.

- [ ] **Step 1: Create and verify the SEO source branch**

Run in `/Users/mac/project/KBO_platform/bega_frontend_seo_redirect_fix`:

```bash
git switch -c rescue/seo-canonical-redirect-20260708
npm run test:seo
```

Expected: SEO smoke and worker tests pass with the modified `test:seo` script.

- [ ] **Step 2: Commit only SEO source, tests, and config**

```bash
git add package.json scripts/seo-postdeploy-smoke.mjs \
  scripts/seo-postdeploy-smoke.test.mjs worker/index.test.ts wrangler.jsonc
git diff --cached --check
git commit -m "fix(seo): preserve canonical redirect contracts"
```

Expected: reports remain modified; no report file enters the source commit.

- [ ] **Step 3: Preserve SEO report dirt separately**

```bash
git switch -c rescue/seo-canonical-redirect-reports-20260708
git add reports/bundle-guard-report.json reports/dist-assets-report.json
git commit -m "chore(reports): preserve SEO redirect evidence"
```

Expected: SEO worktree is clean.

### Task 6: Preserve report-only worktrees without merging them

**Files:**
- Report snapshots only.

**Interfaces:**
- Produces: `rescue/daily-scan-parent-reports-20260708` and `rescue/performance-reports-20260711`.

- [ ] **Step 1: Preserve detached parent reports**

Run in `/private/tmp/kbo_frontend_daily_scan_20260708_parent`:

```bash
git switch -c rescue/daily-scan-parent-reports-20260708
git add reports/bundle-guard-report.json reports/dist-assets-report.json
git commit -m "chore(reports): preserve parent scan evidence"
```

Expected: the detached parent worktree becomes clean.

- [ ] **Step 2: Preserve performance worktree reports**

Run in `/Users/mac/project/KBO_platform/.frontend-performance-worktree`:

```bash
git switch -c rescue/performance-reports-20260711
git add reports/bundle-guard-report.json reports/dist-assets-report.json
git commit -m "chore(reports): preserve performance evidence"
```

Expected: the performance worktree becomes clean. Do not merge either report branch.

### Task 7: Prepare the current Codex branch as the integration branch

**Files:**
- Primary worktree: `/Users/mac/project/KBO_platform/bega_frontend`
- Branch: `codex/frontend-cwv-integration-20260712`

**Interfaces:**
- Consumes: clean source branches from Tasks 2–5.
- Produces: a clean current branch ready to combine the divergent histories.

- [ ] **Step 1: Reconfirm all source worktrees are clean**

Run `git status --short --branch` in the primary, Landing, OAuth, SEO, parent-scan, performance, and prerequisites worktrees.

Expected: no modified or untracked files in any worktree.

- [ ] **Step 2: Refresh remote references with approval**

```bash
git fetch origin feature
```

Expected: `origin/feature` is current. This network operation requires separate approval at execution time.

- [ ] **Step 3: Reconfirm the current branch and clean state**

```bash
git branch --show-current
git status --short --branch
```

Expected: current branch is `codex/frontend-cwv-integration-20260712` and the primary worktree is clean.

- [ ] **Step 4: Verify the clean base**

Run in the primary worktree:

```bash
npm run build:base
```

Expected: the current Codex branch builds before receiving `feature`.

### Task 8: Merge `feature` into the current Codex branch

**Files:**
- Potential conflicts: `package.json`, `package-lock.json`, Cheer components/tests, Vite config, workflow files, generated reports.

**Interfaces:**
- Consumes: `origin/feature`.
- Produces: current Codex branch history containing the latest `feature` commits and the existing CWV/Cheer/CI commits.

- [ ] **Step 1: Start the merge**

```bash
git merge --no-ff --no-commit origin/feature
```

Expected: either a clean merge or explicit conflict list. Do not continue while any unmerged path remains.

- [ ] **Step 2: Resolve conflicts by contract**

Use:

```bash
git status --short
git diff --cc
```

Preserve semantic unions for package files, both Cheer UI and performance behaviors, and tested workflow contracts. For generated reports, keep the integration-base version temporarily; regenerate them in Task 11. If a source conflict cannot be justified file by file, run `git merge --abort` and stop for review.

- [ ] **Step 3: Run the CWV/Cheer focused gate**

```bash
node --import tsx --test \
  scripts/frontend-ui-impact.test.ts \
  scripts/ci-workflow-policy.test.ts \
  scripts/cheer-internal-api-smoke.test.mjs \
  src/components/CheerLivePanel.test.tsx \
  src/components/CheerRuntime.test.ts \
  src/components/cheer/CheerPresentation.test.ts \
  src/utils/cheerCommunityPulse.test.ts \
  src/utils/cheerSearchTerms.test.ts
npx tsc --noEmit
npm run build:base
git diff --check
```

Expected: all tests, TypeScript, build, bundle guard, and diff hygiene pass.

- [ ] **Step 4: Complete the merge commit**

```bash
git commit
```

Expected commit subject: `Merge origin/feature into codex/frontend-cwv-integration-20260712`.

### Task 9: Merge the Landing and OAuth source branches

**Files:**
- Landing source and OAuth source/tests from their rescue branches.

**Interfaces:**
- Consumes: `rescue/landing-layout-20260708`, `rescue/oauth-origin-fix-20260708`.
- Produces: integrated Landing spacing and production OAuth origin behavior.

- [ ] **Step 1: Merge and verify Landing**

```bash
git merge --no-ff --no-commit rescue/landing-layout-20260708
npm run build:base
git diff --check
git commit -m "merge(frontend): integrate Landing layout rescue"
```

Expected: Landing merge commit succeeds and the build remains green.

- [ ] **Step 2: Merge and verify OAuth**

```bash
git merge --no-ff --no-commit rescue/oauth-origin-fix-20260708
node --import tsx --test src/api/authPublic.test.ts
node --check scripts/oauth-provider-link-preflight.mjs
npx tsc --noEmit
git diff --check
git commit -m "merge(frontend): integrate OAuth origin rescue"
```

Expected: OAuth tests, syntax, and TypeScript pass.

### Task 10: Merge the SEO source branch last

**Files:**
- SEO smoke, worker tests, `wrangler.jsonc`, and `package.json`.

**Interfaces:**
- Consumes: `rescue/seo-canonical-redirect-20260708`.
- Produces: final canonical redirect and Cloudflare assets behavior.

- [ ] **Step 1: Merge SEO and resolve package scripts semantically**

```bash
git merge --no-ff --no-commit rescue/seo-canonical-redirect-20260708
```

Expected: the final `package.json` retains CWV, module-federation, Cheer, and SEO scripts. If the lockfile changes are required, run `npm install --package-lock-only --ignore-scripts --offline` first; request network approval only if offline resolution fails.

- [ ] **Step 2: Run SEO and worker gates**

```bash
npm run test:seo
npx tsc --noEmit
git diff --check
git commit -m "merge(frontend): integrate SEO canonical rescue"
```

Expected: SEO, worker, TypeScript, and diff checks pass.

### Task 11: Regenerate evidence and run the final frontend gate

**Files:**
- Regenerate: `reports/bundle-guard-report.json`
- Regenerate: `reports/dist-assets-report.json`

**Interfaces:**
- Produces: a single set of reports derived from the consolidated source tree.

- [ ] **Step 1: Regenerate reports once**

```bash
npm run build:base
git add reports/bundle-guard-report.json reports/dist-assets-report.json
git commit -m "chore(reports): regenerate consolidated frontend evidence"
```

Expected: bundle guard passes and the report commit contains only generated evidence.

- [ ] **Step 2: Run the complete static and unit gate**

```bash
npx tsc --noEmit
npm run test:unit
npm run test:build-env
npm run test:seo
node scripts/ci-workflow-policy.mjs
python3 ../scripts/validate_baseball_data_policy.py
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 3: Run the Cheer browser gate**

```bash
npm run qa:cheer:visual
```

Then run both Cheer specs against the produced preview using the existing Cypress runner:

```bash
npx start-server-and-test preview:static:docker http://127.0.0.1:5180 \
  "CYPRESS_FRONTEND_BASE_URL=http://127.0.0.1:5180 npm run test:e2e -- --no-server --spec cypress/e2e/cheer-visual-audit.cy.ts,cypress/e2e/cheer-mobile-nav.cy.ts"
```

Expected: visual audit 8/8 and mobile navigation 4/4 pass.

- [ ] **Step 4: Run the prod-like smoke gate**

```bash
npm run test:e2e:smoke:prodlike:docker
```

Expected: prod-like frontend smoke passes. If the environment cannot provide Docker/Cypress, record the exact unavailable dependency and do not claim full merge readiness.

### Task 12: Deliver the current Codex branch to `feature`

**Files:**
- No new source files; Git history and CI state only.

**Interfaces:**
- Produces: a reviewed PR from `codex/frontend-cwv-integration-20260712` to `feature`.

- [ ] **Step 1: Verify integration history and clean state**

```bash
git status --short --branch
git log --graph --decorate --oneline -30
git merge-base --is-ancestor origin/feature HEAD
git merge-base --is-ancestor rescue/landing-layout-20260708 HEAD
git merge-base --is-ancestor rescue/oauth-origin-fix-20260708 HEAD
git merge-base --is-ancestor rescue/seo-canonical-redirect-20260708 HEAD
```

Expected: clean branch and exit code 0 for all source-branch reachability checks.

- [ ] **Step 2: Push and open the PR with separate approval**

```bash
git push -u origin codex/frontend-cwv-integration-20260712
gh pr create --base feature --head codex/frontend-cwv-integration-20260712
```

Expected: PR targets `feature`. Do not merge until required CI is green.

- [ ] **Step 3: Merge only after CI approval**

Use the repository's normal PR merge policy. After merge, refresh locally and verify that `origin/feature` contains the integration merge commit.

### Task 13: Clean worktrees and merged local branches safely

**Files:**
- Worktree registrations and local branch refs only.

**Interfaces:**
- Consumes: merged `feature`, clean worktrees, preserved report rescue branches.
- Produces: primary checkout on clean `feature` with obsolete worktrees removed.

- [ ] **Step 1: Verify every worktree is clean before removal**

Run `git status --short --branch` in all seven original worktrees.

Expected: every worktree is clean. Stop if any modified or untracked path remains.

- [ ] **Step 2: Remove linked worktrees through Git**

From `/Users/mac/project/KBO_platform/bega_frontend`, remove only the clean paths recorded in the inventory:

```bash
git worktree remove /private/tmp/kbo_frontend_daily_scan_20260708_fd37
git worktree remove /private/tmp/kbo_frontend_daily_scan_20260708_parent
git worktree remove /Users/mac/project/KBO_platform/.frontend-performance-worktree
git worktree remove /Users/mac/project/KBO_platform/.frontend-prerequisites-worktree
git worktree remove /Users/mac/project/KBO_platform/bega_frontend_oauth_fix
git worktree remove /Users/mac/project/KBO_platform/bega_frontend_seo_redirect_fix
git worktree prune
```

Expected: only the primary frontend checkout remains registered.

- [ ] **Step 3: Switch the primary checkout to updated `feature`**

```bash
git switch feature
git pull --ff-only origin feature
git status --short --branch
```

Expected: clean `feature` tracking `origin/feature`.

- [ ] **Step 4: Delete only proven merged local source branches**

For each source branch, first run `git merge-base --is-ancestor <branch> feature`. Delete it with `git branch -d <branch>` only when that command returns exit code 0.

Eligible source branches after verification:

```text
codex/frontend-cwv-integration-20260712
codex/frontend-performance-p1-20260711
codex/frontend-prerequisites-20260711
rescue/landing-layout-20260708
rescue/oauth-origin-fix-20260708
rescue/seo-canonical-redirect-20260708
```

Keep `rescue/cwv-reports-20260712` and all `*-reports-*` rescue branches until the user explicitly approves their deletion. Do not delete remote branches in this task.
