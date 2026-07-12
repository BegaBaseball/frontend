# Frontend Worktree Consolidation Design

## Decision

Preserve every uncommitted source change before any merge or worktree removal. Generated `reports/*.json` changes are not merged as source; they are snapshotted on rescue branches and regenerated once from the final integrated source tree.

The final base branch is `feature`. Direct merges into `feature` are forbidden until a dedicated integration branch passes the full frontend gate.

## Current Repository State

The frontend repository has seven worktrees:

| Worktree | State | Preservation action |
| --- | --- | --- |
| `bega_frontend` | `codex/frontend-cwv-integration-20260712`, committed CWV/UI work plus uncommitted CI workflow, SSE, and generated report changes | Commit CI and SSE separately; preserve reports on a report rescue branch |
| `.frontend-performance-worktree` | merged branch, report-only dirt | Preserve reports on a report rescue branch; do not merge them |
| `.frontend-prerequisites-worktree` | clean branch already contained in `feature` | Remove only after final reachability checks |
| `kbo_frontend_daily_scan_20260708_fd37` | detached HEAD, Landing source plus reports | Create a source rescue branch and a separate report rescue branch |
| `kbo_frontend_daily_scan_20260708_parent` | detached HEAD, report-only dirt | Create a report rescue branch |
| `bega_frontend_oauth_fix` | detached HEAD, OAuth source/tests plus reports | Create a source rescue branch and a separate report rescue branch |
| `bega_frontend_seo_redirect_fix` | detached HEAD, SEO/worker/config source plus reports | Create a source rescue branch and a separate report rescue branch |

`codex/frontend-prerequisites-20260711` and `codex/frontend-performance-p1-20260711` are already ancestors of `feature`. They must not be merged again.

`codex/frontend-cwv-integration-20260712` and `feature` have diverged. The current branch has five unique commits and `feature` has eight unique commits from their merge base, so consolidation requires a real three-way merge.

## Preservation Model

Each detached source worktree becomes two durable references:

1. A `rescue/*` source branch whose tip contains only merge-worthy source and tests.
2. A `rescue/*-reports` branch whose tip contains generated report snapshots and is never merged into the integration branch.

This split ensures that every byte remains recoverable without polluting the final source history with stale build evidence.

No stash is used. Stashes are repository-global and ambiguous across seven worktrees. No `reset --hard`, directory deletion, or broad checkout/restore operation is permitted.

## Integration Architecture

Use `codex/frontend-cwv-integration-20260712` itself as the integration branch. After its uncommitted CI work and runbook are committed, merge and apply changes in this order:

1. Merge the latest reviewed `origin/feature` into `codex/frontend-cwv-integration-20260712` with `--no-ff --no-commit`.
2. Merge the Landing source rescue branch.
3. Merge the OAuth source rescue branch.
4. Merge the SEO source rescue branch last because it touches `package.json`, worker behavior, and deployment configuration.
5. Regenerate reports once after all source merges.

The current CWV branch is not rebased because it contains broad committed UI, Cheer, performance, module-federation, and QA work. Merging `feature` into it preserves both histories without rewriting commits. Rescue branches are merged, not copied by hand, so their provenance remains inspectable.

## Conflict Policy

- Never resolve a whole merge with blanket `ours` or `theirs`.
- `package.json` and `package-lock.json` use a semantic union. Dependency and script additions from both sides must remain, followed by lockfile verification.
- Cheer files preserve both the completed Cheer UI behavior and the already-merged performance deferral behavior. Existing Cheer unit and Cypress tests are the acceptance contract.
- OAuth files preserve production backend-origin resolution and redirect URI validation without changing auth token semantics.
- SEO files preserve canonical no-trailing-slash behavior and existing worker API blocking behavior.
- Workflow files preserve reusable workflow contracts and move duplicated UI-impact logic into the tested Node script.
- Generated bundle and asset reports are resolved temporarily to the integration base, then regenerated from final source. They are never hand-merged.

If a conflict cannot be explained by these rules, abort that merge and review the two branch versions before continuing.

## Verification Strategy

Every source branch receives its focused test before integration. Every merge commit receives a focused gate before the next merge. The final integration branch receives TypeScript, unit, build, SEO, CI policy, Cheer UI, and baseball-data-policy checks.

The final PR is opened from `codex/frontend-cwv-integration-20260712` to `feature`. `feature` is not updated locally or remotely until the Codex branch is green. Remote push, PR merge, remote branch deletion, and destructive cleanup remain separate approval points.

## Cleanup Rules

A worktree can be removed only when:

- its status is clean;
- its source commit exists on a named branch;
- the source branch is present in the final integration history;
- report-only dirt is preserved on a named report rescue branch;
- the worktree path and branch are recorded in the consolidation inventory.

Use `git worktree remove`, never filesystem deletion. Run `git worktree prune` only after all intended worktree removals. Keep report rescue branches until the user explicitly approves their deletion.

## Completion Criteria

- All four source change groups are preserved and integrated.
- `feature` contains the reviewed `codex/frontend-cwv-integration-20260712` result.
- Full verification passes after the final merge.
- Primary checkout is clean and on `feature`.
- Stale linked and detached worktrees are removed safely.
- Merged local source branches are deleted only after reachability checks.
- Report rescue branches remain available until a later explicit cleanup approval.
