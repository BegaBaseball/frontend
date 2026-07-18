# Module Federation

BEGA frontend uses the official `@module-federation/vite` plugin behind an explicit opt-in flag. The current architecture decision is to keep the remote disabled and use local fallback aliases because there is no independently deployed `design_system` application. The default build stays on the existing Vite chunk graph and bundle guard budgets. Module Federation builds generate `remoteEntry.js`, `mf-manifest.json`, and `mf-stats.json` for readiness verification only.

## Commands

```bash
npm run gate:mf
npm run readiness:mf
npm run build:mf
npm run preview:mf
npm run smoke:mf:artifacts
npm run smoke:mf:remote -- --entry design_system@http://localhost:5001/mf-manifest.json
npm run smoke:mf:probe
VITE_MF_DESIGN_SYSTEM_ENTRY=design_system@http://localhost:5001/mf-manifest.json npm run smoke:mf:probe:remote
VITE_MF_DESIGN_SYSTEM_ENTRY=design_system@http://localhost:5001/mf-manifest.json npm run readiness:mf:remote
```

`preview:mf` serves the static Vite preview on `http://127.0.0.1:5181` so it can run beside the regular static preview on port `5180`.

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_ENABLE_MODULE_FEDERATION` | Optional | Set to `true` to enable the federation plugin without configuring a remote. |
| `VITE_MF_APP_NAME` | Optional | Host application name. Defaults to `bega_frontend`. |
| `VITE_MF_DESIGN_SYSTEM_ENTRY` | Optional | Enables the `design_system` remote when set. Prefer a manifest entry such as `design_system@http://localhost:5001/mf-manifest.json`; a URL-only `remoteEntry.js` or `mf-manifest.json` entry is also supported. |
| `VITE_MF_DESIGN_SYSTEM_NAME` | Optional | Remote container name. Defaults to `design_system`. |

## Choosing the Remote URL

The site origin alone is not a Module Federation entry. For example, `https://www.begabaseball.xyz` returns the application HTML and must not be used as `VITE_MF_DESIGN_SYSTEM_ENTRY`. The configured URL must return an artifact produced by a separately built `design_system` remote.

A same-origin deployment is valid and is the preferred production shape when the remote is hosted with the BEGA site:

```text
design_system@https://www.begabaseball.xyz/remotes/design-system/mf-manifest.json
```

The corresponding `remoteEntry.js` URL is also supported:

```text
design_system@https://www.begabaseball.xyz/remotes/design-system/remoteEntry.js
```

Those paths become valid only after a remote application exposing `./Button`, `./Modal`, and `./ThemeProvider` has been built and deployed there. The current BEGA frontend is the host and does not provide that `design_system` remote. Until an independently deployed remote exists, leave `VITE_MF_DESIGN_SYSTEM_ENTRY` unset and use the local fallback aliases. Do not introduce a remote solely to split code inside one deployment; regular Vite lazy chunks are simpler for that case.

Example local host build with a design system remote:

```bash
VITE_MF_DESIGN_SYSTEM_ENTRY=design_system@http://localhost:5001/mf-manifest.json npm run build:mf
```

Example production entry:

```bash
VITE_MF_DESIGN_SYSTEM_ENTRY=design_system@https://cdn.example.com/design-system/mf-manifest.json npm run build:mf
```

Use `remoteEntry.js` only when the remote cannot publish `mf-manifest.json`. The host strips the optional `name@` prefix into the remote `name` and `entry` fields before passing config to `@module-federation/vite`; URL-only entries are left intact, and `VITE_MF_DESIGN_SYSTEM_NAME` overrides the prefix name when both are set.

Before wiring a real remote into a screen, verify its manifest exposes the host contract:

```bash
npm run smoke:mf:remote -- --entry design_system@https://cdn.example.com/design-system/mf-manifest.json
```

The smoke command expects `./Button`, `./Modal`, and `./ThemeProvider` by default. Override that list only when the host declarations change:

```bash
npm run smoke:mf:remote -- --entry design_system@https://cdn.example.com/design-system/mf-manifest.json --expect Button,Modal,ThemeProvider
```

For `mf-manifest.json`, the smoke command verifies the expected expose names directly. For `remoteEntry.js`, it verifies the required ESM `get` and `init` container exports; run `npm run smoke:mf:probe:remote` afterward to prove that the host can load the expected exposed modules in a browser.

Run `npm run readiness:mf` to write `reports/module-federation-readiness.json` without exposing the remote entry value. Without `VITE_MF_DESIGN_SYSTEM_ENTRY`, the report should say `host-ready-fallback-active`; with `npm run readiness:mf:remote`, the same missing variable is treated as a rollout blocker for a future explicit Remote rollout.

`npm run gate:mf` runs this readiness check first, then builds and validates Module Federation artifacts.

## Latest Local Verification

The 2026-07-11 local gate passed the host readiness, MF build, and artifact
smoke stages:

```bash
npm run gate:mf
```

The readiness result is `host-ready-fallback-active`: the host contract is
ready, no files or package scripts are missing, and the build produced and
validated six required artifacts plus one client bootstrap asset. The remote
entry smoke was skipped because the selected production architecture leaves
`VITE_MF_DESIGN_SYSTEM_ENTRY` unset. This is the intended state for the current
single-frontend deployment. A future Remote rollout must be an explicit
architecture change followed by `npm run readiness:mf:remote`,
`npm run smoke:mf:remote`, and `npm run smoke:mf:probe:remote`.

## Host Contract

The host declares compile-time TypeScript contracts for:

- `design_system/Button`
- `design_system/Modal`
- `design_system/ThemeProvider`

Keep those declarations in `src/types/module-federation.d.ts` aligned with the remote app's exposed modules. If the remote changes prop names or required props, update the host declaration in the same change before importing the remote component.

The internal host probe route at `/internal/module-federation-design-system` lazy-imports `design_system/Button`, `design_system/Modal`, and `design_system/ThemeProvider`. In local dev and MF builds without a configured remote entry, `vite.config.ts` maps those imports to local design_system fallback aliases so the default build remains remote-free. When `VITE_MF_DESIGN_SYSTEM_ENTRY` is set, those aliases are removed and the official Module Federation runtime resolves the remote modules.

Run `npm run smoke:mf:probe` to start an isolated dev server and verify that the internal route renders the fallback contract and opens the fallback modal when no remote entry is configured. This command intentionally clears `VITE_MF_DESIGN_SYSTEM_ENTRY` before starting Vite so the fallback path remains deterministic. After setting a real `VITE_MF_DESIGN_SYSTEM_ENTRY`, run `npm run smoke:mf:probe:remote` for a browser-level remote loading check that requires the route to show a configured remote-entry status. The route never renders the entry value itself, which reduces accidental disclosure in diagnostic screenshots and logs. Like every `VITE_*` value, the entry is still public client configuration and must not contain credentials or secret tokens. The remote probe exits before starting Vite when `VITE_MF_DESIGN_SYSTEM_ENTRY` is missing.

`scripts/module-federation-config.test.ts` covers the host config contract: the default build stays remote-free, `VITE_MF_DESIGN_SYSTEM_ENTRY` enables the `design_system` module remote, manifest-style `name@mf-manifest.json` entries are parsed, and React shared dependencies stay singleton-pinned. `scripts/module-federation-remote-smoke.test.mjs` covers both manifest expose validation and JavaScript container validation. A manifest entry validates `./Button`, `./Modal`, and `./ThemeProvider` directly. A `remoteEntry.js` entry validates the required ESM `get` and `init` container exports; the browser probe then verifies that the expected exposed modules can actually be loaded. `scripts/module-federation-types.test.mjs` verifies that TypeScript can compile host imports from the declared remote modules. `scripts/module-federation-probe-smoke.test.mjs` keeps the fallback and remote probe command plans deterministic. `scripts/module-federation-readiness.test.mjs` keeps the operator readiness report and remote rollout blocker behavior aligned. `scripts/module-federation-host-usage.test.mjs` keeps the internal host probe, fallback aliases, Cypress probe smoke, and docs aligned. `scripts/module-federation-gate.test.mjs` keeps the combined gate command aligned with build/artifact/remote smoke expectations. Run `npm run test:build-env` after changing host federation config, type declarations, host usage, or remote contract tooling.

## Bundle Guard

Module Federation rewrites shared dependency imports and the plugin disables Vite `manualChunks` while it is active. Because the normal vendor chunk graph no longer applies, `scripts/bundle-guard.mjs` skips the standard chunk graph checks in MF mode and applies MF-specific artifact budgets instead.

The MF guard currently checks:

- client `mf-manifest.json`
- client `mf-stats.json`
- client `mf-entry-bootstrap-*.js`
- worker `remoteEntry.js`
- worker `mf-manifest.json`
- worker `mf-stats.json`

The React production artifact check remains active in both normal and MF builds.

After `npm run build:mf`, run `npm run smoke:mf:artifacts` to verify the generated client manifest, stats, bootstrap asset, worker remote entry, and worker MF metadata are present and parseable.

## CI

`Frontend Site Audits` runs a separate `module-federation-build` job for pull requests that touch Module Federation config, Vite build config, bundle guard scripts, the internal probe smoke, this document, or package metadata. The job runs:

```bash
npm run gate:mf
npm run smoke:mf:probe
```

When the repository variable `VITE_MF_DESIGN_SYSTEM_ENTRY` is set, the same job also runs:

```bash
npm run smoke:mf:probe:remote
```

`npm run gate:mf` already writes the readiness report and runs the appropriate remote entry smoke when `VITE_MF_DESIGN_SYSTEM_ENTRY` is configured. Set `VITE_MF_DESIGN_SYSTEM_NAME` only when the remote container name differs from `design_system`. The job uploads the MF manifest, stats, remote entry, bootstrap asset, bundle guard reports, readiness report, artifact smoke report, and optional remote smoke report as `frontend-module-federation-artifacts`. The CI summary reports whether a remote entry is configured, but does not print the entry value. Keep this CI job separate from the default `npm run build` path until a real remote is enabled in production.
