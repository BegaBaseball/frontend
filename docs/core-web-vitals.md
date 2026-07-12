# Core Web Vitals Runbook

This runbook documents the frontend Core Web Vitals gates for the production
site and the local lab checks used before release.

## Targets

Use the stricter internal 2026 SLOs for release decisions:

| Metric | Internal SLO | Google Good threshold |
| --- | ---: | ---: |
| LCP | <= 1.8 s | <= 2.5 s |
| INP | <= 100 ms | <= 200 ms |
| CLS | <= 0.05 | <= 0.1 |

The internal SLO is the gate. The Google threshold is reported for context.

## Required Commands

Run the lab gate after frontend performance-sensitive changes:

```bash
npm run gate:cwv:lab
```

By default, both the lab gate and field baseline gate check `/`, `/home`,
`/prediction`, `/cheer`, and `/mate` on desktop and mobile viewports.

## Frontend Contracts

- `/home` preloads the public layout, home route shell, and first match panel
  before nested lazy route rendering.
- `/cheer` and `/cheer/write` preload the public layout, query provider, cheer
  route shell, composer runtime, feed runtime, and main cheer runtime before
  nested lazy route rendering.
- Pretendard loads after critical content through the official variable dynamic
  subset stylesheet. Do not restore the full variable font stylesheet: its
  single WOFF2 payload is about 2 MB and can become a late LCP candidate after
  the font swap on throttled mobile connections.
- Keep these contracts covered by `scripts/vite-manual-chunks.test.ts` before
  changing route-level lazy loading.

Run the field baseline gate when the Google API key is available:

```bash
PAGESPEED_API_KEY=... npm run gate:cwv:baseline
```

`PSI_API_KEY` is also accepted for local runs. To use an operator-managed env
file without exporting the key into the shell, pass it explicitly:

```bash
npm run gate:cwv:baseline -- --env-file ../.env.prod
```

`CWV_BASELINE_ENV_FILE=../.env.prod npm run gate:cwv:baseline` is equivalent.
The report records whether the key came from process env or an env file, but it
does not write the key value to JSON, Markdown, or CI summaries. Do not commit
API keys to the repository or to env example files.

`PAGESPEED_API_KEY` must be enabled for both the PageSpeed Insights API and the
Chrome UX Report API. When `CRUX_API_KEY` is omitted, the baseline reuses the
PageSpeed key for direct CrUX requests. Set `CRUX_API_KEY` only when CrUX uses a
separate key; the explicit CrUX key takes precedence. The baseline selects
metrics in this order: CrUX URL, CrUX origin, legacy PSI URL/origin field data,
then Lighthouse lab. The direct CrUX source is preferred because Google plans
to discontinue CrUX field data in the PageSpeed Insights API.

For focused field rechecks, override the route list with a comma-separated
set:

```bash
npm run gate:cwv:baseline -- --routes /prediction,/mate --env-file ../.env.prod
```

`CWV_BASELINE_ROUTES="/prediction,/mate" npm run gate:cwv:baseline` is
equivalent.

## CI Configuration

The scheduled/manual CWV job lives in
`.github/workflows/frontend-site-audits.yml`.

Required repository settings:

| Name | Type | Required | Purpose |
| --- | --- | --- | --- |
| `PAGESPEED_API_KEY` | Secret | Yes | PageSpeed Insights Lighthouse diagnostics and transitional field fallback |
| `CRUX_API_KEY` | Secret | No | Optional dedicated CrUX key; otherwise `PAGESPEED_API_KEY` is reused |
| `VITE_SITE_URL` | Variable | Yes | Production URL, expected `https://www.begabaseball.xyz` |
| `VITE_GA4_MEASUREMENT_ID` | Variable | For RUM | Enables GA4 event transport in production |

The CI gate is split by data source:

- Pull requests that touch CWV-sensitive routes, route loading, telemetry,
  build, or audit scripts run the lab gate only. This avoids requiring
  PageSpeed secrets on PRs while still checking the production bundle.
- Scheduled and manual `cwv` / `all` runs execute both the lab gate and the
  PageSpeed/CrUX field baseline gate.

```bash
npm run gate:cwv:baseline
npm run gate:cwv:lab
```

Reports are uploaded as `frontend-cwv-lab-artifacts` and
`frontend-cwv-baseline-artifacts`.

## Reports

| Report | Source | Use |
| --- | --- | --- |
| `reports/cwv-baseline.md` | PageSpeed/CrUX | Field proof for production |
| `reports/cwv-baseline.json` | PageSpeed/CrUX | Machine-readable gate result |
| `reports/cwv-lab-audit.md` | Local Playwright lab | Synthetic route audit |
| `reports/cwv-lab-audit.json` | Local Playwright lab | Machine-readable lab result |

Field data is authoritative for INP. The lab audit records synthetic
interaction latency as an early warning, but it cannot prove field INP.

## Latest Local Verification

The 2026-07-11 production-bundle lab gate passed all internal SLOs with three
iterations per route and viewport:

| Route | Desktop LCP p75 | Mobile LCP p75 | Desktop synthetic interaction p75 | Mobile synthetic interaction p75 | Max CLS p75 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 172ms | 168ms | 20ms | 20ms | 0 |
| `/home` | 664ms | 630ms | 24ms | 24ms | 0 |
| `/prediction` | 254ms | 254ms | 28ms | 28ms | 0.001 |
| `/cheer` | 1350ms | 1338ms | 72ms | 80ms | 0.003 |
| `/mate` | 346ms | 328ms | 33ms | 34ms | 0.001 |

Verification command:

```bash
npm run gate:cwv:lab
```

The generated report timestamp is `2026-07-11T14:09:51.506Z`. This is local
synthetic evidence only; production readiness still requires the PageSpeed/CrUX
field gate when its API key and field data are available.

## RUM Events

Production builds lazy-load `src/utils/coreWebVitalsTelemetry.ts`, which uses
the official `web-vitals` package. When GA4 is available, it emits:

| Event | Metric |
| --- | --- |
| `cwv_lcp` | Largest Contentful Paint |
| `cwv_cls` | Cumulative Layout Shift |
| `cwv_inp` | Interaction to Next Paint |

The telemetry normalizes paths before publishing. Numeric route segments,
UUIDs, and long hashes are replaced with stable placeholders so analytics do
not leak high-cardinality identifiers. The normalized `page_path` is captured
when telemetry starts, so a later SPA route change does not attribute the
initial LCP/CLS/INP sample to the wrong page.

CLS RUM uses the official `web-vitals` session-window calculation rather than
summing every layout shift over the full page lifetime. Shifts with recent user
input are excluded from the reported CLS value.

If a metric is finalized before `SeoHead` initializes the GA4 command queue,
telemetry retains up to three pending CWV metric instances. `SeoHead` publishes
the `bega:ga4-ready` browser event immediately after queue initialization, and
the pending metrics are flushed with their original route snapshot and metric
IDs. This prevents early LCP or CLS samples from being dropped without moving
the GA4 network script back onto the initial render path.

Every CWV event includes both the Google threshold rating and the internal SLO
status:

| Parameter | Meaning |
| --- | --- |
| `metric_rating` | Google Good / needs-improvement / poor rating |
| `metric_id` | Official metric instance ID for deduplication and bfcache restores |
| `metric_delta` | Change since the previous report for the same metric instance |
| `metric_slo_target` | Internal release target for the metric |
| `metric_slo_status` | `pass` or `fail` against the internal SLO |
| `metric_interaction_count` | Browser interaction count when the native API is available |

## Failure Handling

- Missing `PAGESPEED_API_KEY` or `PSI_API_KEY`: configure the CI secret or
  local environment and rerun `npm run gate:cwv:baseline`.
- Missing `CRUX_API_KEY`: no action is required when `PAGESPEED_API_KEY` already
  allows the Chrome UX Report API. Configure this secret only for a separate
  CrUX key.
- CrUX `401` / `403`: verify that the Chrome UX Report API is enabled in the
  key's Google Cloud project and included in the key's API restrictions. The
  report keeps the first Google error status/message and suppresses duplicate
  CrUX requests for the rest of that run.
- CrUX `404 NOT_FOUND`: the API key and service are working, but neither the
  requested URL nor its origin currently has an eligible CrUX record. Enabling
  the API does not create field data. The site must be publicly indexable and
  have enough eligible Chrome user samples; inclusion cannot be requested
  manually. The baseline records this as `not-found-url-origin`.
- Missing field data: keep the lab report, but do not treat the release as
  field-proven. Check PageSpeed Insights, CrUX, or Google Search Console after
  enough production traffic is available.
- LCP failure: inspect TTFB, critical CSS/JS, and the route LCP element first.
- INP failure: inspect long tasks, route hydration cost, expensive event
  handlers, and third-party scripts.
- CLS failure: reserve image, ad, font, and skeleton space before content
  loads.
- Lab-only failure: reproduce locally with `npm run gate:cwv:lab`, then inspect
  `reports/cwv-lab-audit.md` for the route and viewport that crossed the SLO.
