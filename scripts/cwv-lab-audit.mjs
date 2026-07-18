#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');

const args = process.argv.slice(2);
const argMap = new Map();
for (let index = 0; index < args.length; index += 1) {
  const key = args[index];
  if (!key.startsWith('--')) {
    continue;
  }
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    argMap.set(key, 'true');
    continue;
  }
  argMap.set(key, value);
  index += 1;
}

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');
const normalizeRoute = (value) => {
  if (!value || value === '/') {
    return '/';
  }
  return `/${String(value).replace(/^\/+/, '').replace(/\/+$/, '')}`;
};
const parsePositiveInt = (rawValue, fallback) => {
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const parseBooleanFlag = (argName, envName) => {
  const rawValue = argMap.get(argName) ?? process.env[envName];
  if (rawValue === undefined) {
    return false;
  }

  return /^(1|true|yes|y)$/i.test(String(rawValue).trim());
};
const roundMetric = (value, digits = 1) => (
  typeof value === 'number' && Number.isFinite(value)
    ? Number(value.toFixed(digits))
    : null
);

const baseUrl = normalizeBaseUrl(
  argMap.get('--base-url')
  || process.env.CWV_LAB_BASE_URL
  || process.env.AUDIT_BASE_URL
  || 'http://127.0.0.1:5180',
);
const routes = String(argMap.get('--routes') || process.env.CWV_LAB_ROUTES || '/,/home,/prediction,/cheer,/mate')
  .split(',')
  .map((routePath) => normalizeRoute(routePath.trim()))
  .filter(Boolean);
const iterations = parsePositiveInt(argMap.get('--iterations') || process.env.CWV_LAB_ITERATIONS, 3);
const timeoutMs = parsePositiveInt(argMap.get('--timeout-ms') || process.env.CWV_LAB_TIMEOUT_MS, 30000);
const settleMs = parsePositiveInt(argMap.get('--settle-ms') || process.env.CWV_LAB_SETTLE_MS, 2500);
const jsonPath = path.resolve(process.cwd(), argMap.get('--json') || 'reports/cwv-lab-audit.json');
const markdownPath = path.resolve(process.cwd(), argMap.get('--markdown') || 'reports/cwv-lab-audit.md');
const failOnReview = parseBooleanFlag('--fail-on-review', 'CWV_LAB_FAIL_ON_REVIEW');

const CWV_TARGETS = {
  lcp: {
    officialGood: 2500,
    strictGood: 1800,
  },
  inp: {
    officialGood: 200,
    strictGood: 100,
  },
  cls: {
    officialGood: 0.1,
    strictGood: 0.05,
  },
};

const viewports = [
  {
    key: 'desktop-1440',
    label: 'Desktop 1440',
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  },
  {
    key: 'mobile-390',
    label: 'Mobile 390',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
];

const interactionTargets = {
  '/': [
    { label: 'landing feature flow CTA', selector: '[data-testid="landing-hero-cta-secondary"]' },
    { label: 'landing login CTA', selector: '[data-testid="landing-header-login"]' },
  ],
  '/home': [
    { label: 'home scheduled tab', role: 'tab', name: '예정경기' },
    { label: 'home regular tab', role: 'tab', name: '정규시즌' },
    { label: 'home next date', selector: '[data-testid="home-date-next"]' },
    { label: 'home previous date', selector: '[data-testid="home-date-prev"]' },
  ],
  '/cheer': [
    { label: 'cheer popular tab', role: 'button', name: '인기' },
    { label: 'cheer all tab', role: 'button', name: '전체' },
  ],
  '/prediction': [
    { label: 'prediction ranking tab', selector: '[data-testid="prediction-tab-ranking"]' },
    { label: 'prediction match tab', selector: '[data-testid="prediction-tab-match"]' },
    { label: 'prediction other games link', selector: '[data-testid="prediction-other-games-link"]' },
  ],
  '/mate': [
    { label: 'mate logged-out entry', selector: '[data-testid="mate-logged-out-entry"]' },
    { label: 'mate login CTA', selector: '[data-testid="mate-login-cta"]' },
    { label: 'mate empty create CTA', selector: '[data-testid="mate-empty-create-cta"]' },
    { label: 'mate recruiting tab', role: 'button', name: '모집 중' },
  ],
};

const sleep = async (timeMs) => {
  await new Promise((resolve) => {
    setTimeout(resolve, timeMs);
  });
};

const percentile = (values, percentileValue) => {
  const sortedValues = values
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
    .sort((left, right) => left - right);
  if (sortedValues.length === 0) {
    return null;
  }
  if (sortedValues.length === 1) {
    return sortedValues[0];
  }
  const rank = (sortedValues.length - 1) * percentileValue;
  const lower = Math.floor(rank);
  const upper = Math.min(lower + 1, sortedValues.length - 1);
  const weight = rank - lower;
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * weight;
};

const formatMs = (value) => (
  typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}ms` : '-'
);
const formatCls = (value) => (
  typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '.0')
    : '-'
);

const loadPlaywright = async () => {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE_URL,
    'playwright',
    'file:///Users/mac/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs',
  ].filter(Boolean);
  const failures = [];

  for (const candidate of candidates) {
    try {
      return await import(candidate);
    } catch (error) {
      failures.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`Unable to load Playwright. Set PLAYWRIGHT_MODULE_URL or install playwright. Attempts: ${failures.join(' | ')}`);
};

const launchChromium = async (chromium) => {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch (error) {
    console.warn(`[playwright] Chrome channel launch failed; retrying bundled Chromium. ${error instanceof Error ? error.message : String(error)}`);
    return chromium.launch({ headless: true });
  }
};

const installMetricObservers = async (page) => {
  await page.addInitScript(() => {
    const describeElement = (element) => {
      if (!element) {
        return null;
      }
      const parts = [element.tagName?.toLowerCase()].filter(Boolean);
      if (element.id) {
        parts.push(`#${element.id}`);
      }
      const testId = element.getAttribute?.('data-testid');
      if (testId) {
        parts.push(`[data-testid="${testId}"]`);
      }
      const className = typeof element.className === 'string'
        ? element.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.')
        : '';
      if (className) {
        parts.push(`.${className}`);
      }
      return parts.join('');
    };

    window.__cwvLabMetrics = {
      lcp: null,
      cls: 0,
      layoutShifts: [],
      longTasks: [],
      eventTimings: [],
      syntheticActions: [],
    };

    try {
      new PerformanceObserver((list) => {
        const latestEntry = list.getEntries().at(-1);
        if (!latestEntry) {
          return;
        }
        window.__cwvLabMetrics.lcp = {
          startTime: Number(latestEntry.startTime.toFixed(2)),
          size: typeof latestEntry.size === 'number' ? latestEntry.size : null,
          url: latestEntry.url || null,
          element: describeElement(latestEntry.element),
        };
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_error) {
      // Observer support varies by browser channel.
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) {
            continue;
          }
          const value = entry.value || 0;
          window.__cwvLabMetrics.cls += value;
          window.__cwvLabMetrics.layoutShifts.push({
            startTime: Number(entry.startTime.toFixed(2)),
            value: Number(value.toFixed(4)),
            sources: Array.from(entry.sources || []).slice(0, 3).map((source) => ({
              node: describeElement(source.node),
            })),
          });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_error) {
      // Observer support varies by browser channel.
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__cwvLabMetrics.longTasks.push({
            name: entry.name,
            startTime: Number(entry.startTime.toFixed(2)),
            duration: Number(entry.duration.toFixed(2)),
          });
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch (_error) {
      // Observer support varies by browser channel.
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__cwvLabMetrics.eventTimings.push({
            name: entry.name,
            startTime: Number(entry.startTime.toFixed(2)),
            duration: Number(entry.duration.toFixed(2)),
            interactionId: entry.interactionId || null,
          });
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
    } catch (_error) {
      // Event Timing support varies and synthetic runs are not field INP proof.
    }
  });
};

const readMetrics = async (page) => page.evaluate(() => {
  const navigationEntry = performance.getEntriesByType('navigation')[0];
  const paintEntries = performance.getEntriesByType('paint');
  const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
  const metrics = window.__cwvLabMetrics || {};
  const longTasks = Array.isArray(metrics.longTasks) ? metrics.longTasks : [];
  const eventTimings = Array.isArray(metrics.eventTimings) ? metrics.eventTimings : [];
  const syntheticActions = Array.isArray(metrics.syntheticActions) ? metrics.syntheticActions : [];
  const interactionDurations = eventTimings
    .filter((entry) => entry.interactionId)
    .map((entry) => entry.duration)
    .filter((value) => typeof value === 'number' && Number.isFinite(value));
  const syntheticActionDurations = syntheticActions
    .map((entry) => entry.duration)
    .filter((value) => typeof value === 'number' && Number.isFinite(value));

  return {
    finalUrl: window.location.href,
    title: document.title,
    navigation: navigationEntry
      ? {
          requestStart: navigationEntry.requestStart,
          responseStart: navigationEntry.responseStart,
          domContentLoaded: navigationEntry.domContentLoadedEventEnd,
          loadEventEnd: navigationEntry.loadEventEnd,
          duration: navigationEntry.duration,
        }
      : null,
    fcp: fcp ? fcp.startTime : null,
    lcp: metrics.lcp || null,
    cls: typeof metrics.cls === 'number' ? metrics.cls : null,
    layoutShifts: Array.isArray(metrics.layoutShifts) ? metrics.layoutShifts : [],
    layoutShiftCount: Array.isArray(metrics.layoutShifts) ? metrics.layoutShifts.length : 0,
    longTaskCount: longTasks.length,
    longTaskTotal: longTasks.reduce((sum, entry) => sum + (entry.duration || 0), 0),
    longestLongTask: longTasks.reduce((max, entry) => Math.max(max, entry.duration || 0), 0),
    syntheticInteractionMax: interactionDurations.length
      ? Math.max(...interactionDurations)
      : syntheticActionDurations.length
        ? Math.max(...syntheticActionDurations)
        : null,
    syntheticActions,
    lcpElement: metrics.lcp?.element || null,
    lcpUrl: metrics.lcp?.url || null,
  };
});

const buildRouteUrl = (routePath) => (
  routePath === '/' ? `${baseUrl}/` : `${baseUrl}${routePath}`
);

const waitForNextPaint = async (page) => {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  }));
};

const resolveInteractionLocator = (page, target) => {
  if (target.role) {
    return page.getByRole(target.role, { name: target.name });
  }
  return page.locator(target.selector);
};

const runSyntheticInteraction = async (page, routePath) => {
  const targets = interactionTargets[routePath] || [];

  for (const target of targets) {
    const locator = resolveInteractionLocator(page, target).first();
    try {
      if (await locator.count() === 0) {
        continue;
      }
      if (!(await locator.isVisible({ timeout: 1000 }))) {
        continue;
      }
      if (!(await locator.isEnabled({ timeout: 1000 }))) {
        continue;
      }

      await locator.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => undefined);
      const duration = await page.evaluate(async (label) => {
        const startTime = performance.now();
        window.__cwvLabPendingAction = { label, startTime };
        return startTime;
      }, target.label);
      await locator.click({ timeout: 3000 });
      await waitForNextPaint(page);
      await page.evaluate((startedAt) => {
        const pendingAction = window.__cwvLabPendingAction;
        const startTime = typeof pendingAction?.startTime === 'number' ? pendingAction.startTime : startedAt;
        const label = pendingAction?.label || 'synthetic interaction';
        window.__cwvLabMetrics.syntheticActions.push({
          label,
          startTime: Number(startTime.toFixed(2)),
          duration: Number((performance.now() - startTime).toFixed(2)),
        });
        delete window.__cwvLabPendingAction;
      }, duration);
      return target.label;
    } catch (_error) {
      // Try the next route-safe interaction candidate.
    }
  }

  return null;
};

const runIteration = async ({ browser, routePath, viewportConfig, iteration }) => {
  const context = await browser.newContext({
    viewport: viewportConfig.viewport,
    isMobile: viewportConfig.isMobile,
    hasTouch: viewportConfig.hasTouch,
    deviceScaleFactor: viewportConfig.deviceScaleFactor,
  });
  const page = await context.newPage();
  await installMetricObservers(page);
  const url = buildRouteUrl(routePath);
  let status = null;
  let error = null;

  try {
    const response = await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
    status = response?.status() ?? null;
    await sleep(settleMs);
    const syntheticInteractionLabel = await runSyntheticInteraction(page, routePath);
    await sleep(100);
    const metrics = await readMetrics(page);
    const navigation = metrics.navigation;
    const ttfb = navigation
      && typeof navigation.responseStart === 'number'
      && typeof navigation.requestStart === 'number'
      ? navigation.responseStart - navigation.requestStart
      : null;

    return {
      route: routePath,
      viewport: viewportConfig.key,
      iteration,
      status,
      error,
      finalUrl: metrics.finalUrl,
      title: metrics.title,
      ttfb: roundMetric(ttfb),
      fcp: roundMetric(metrics.fcp),
      lcp: roundMetric(metrics.lcp?.startTime),
      cls: roundMetric(metrics.cls, 4),
      layoutShifts: metrics.layoutShifts,
      layoutShiftCount: metrics.layoutShiftCount,
      longTaskCount: metrics.longTaskCount,
      longTaskTotal: roundMetric(metrics.longTaskTotal),
      longestLongTask: roundMetric(metrics.longestLongTask),
      syntheticInteractionMax: roundMetric(metrics.syntheticInteractionMax),
      syntheticInteractionLabel,
      syntheticActions: metrics.syntheticActions,
      lcpElement: metrics.lcpElement,
      lcpUrl: metrics.lcpUrl,
    };
  } catch (runError) {
    error = runError instanceof Error ? runError.message : String(runError);
    return {
      route: routePath,
      viewport: viewportConfig.key,
      iteration,
      status,
      error,
      finalUrl: null,
      title: null,
      ttfb: null,
      fcp: null,
      lcp: null,
      cls: null,
      layoutShifts: [],
      layoutShiftCount: 0,
      longTaskCount: 0,
      longTaskTotal: null,
      longestLongTask: null,
      syntheticInteractionMax: null,
      syntheticInteractionLabel: null,
      syntheticActions: [],
      lcpElement: null,
      lcpUrl: null,
    };
  } finally {
    await context.close();
  }
};

const summarizeGroup = (routePath, viewportConfig, samples) => {
  const byMetric = (metricName) => samples.map((sample) => sample[metricName]);
  const lcpP75 = roundMetric(percentile(byMetric('lcp'), 0.75));
  const clsP75 = roundMetric(percentile(byMetric('cls'), 0.75), 4);
  const fcpP75 = roundMetric(percentile(byMetric('fcp'), 0.75));
  const ttfbP75 = roundMetric(percentile(byMetric('ttfb'), 0.75));
  const longTaskTotalP75 = roundMetric(percentile(byMetric('longTaskTotal'), 0.75));
  const longestLongTaskP75 = roundMetric(percentile(byMetric('longestLongTask'), 0.75));
  const syntheticInteractionMaxP75 = roundMetric(percentile(byMetric('syntheticInteractionMax'), 0.75));
  const lcpOfficialPass = typeof lcpP75 === 'number' ? lcpP75 <= CWV_TARGETS.lcp.officialGood : null;
  const lcpStrictPass = typeof lcpP75 === 'number' ? lcpP75 <= CWV_TARGETS.lcp.strictGood : null;
  const clsOfficialPass = typeof clsP75 === 'number' ? clsP75 <= CWV_TARGETS.cls.officialGood : null;
  const clsStrictPass = typeof clsP75 === 'number' ? clsP75 <= CWV_TARGETS.cls.strictGood : null;
  const syntheticInteractionOfficialPass = typeof syntheticInteractionMaxP75 === 'number'
    ? syntheticInteractionMaxP75 <= CWV_TARGETS.inp.officialGood
    : null;
  const syntheticInteractionStrictPass = typeof syntheticInteractionMaxP75 === 'number'
    ? syntheticInteractionMaxP75 <= CWV_TARGETS.inp.strictGood
    : null;
  const labOfficialPass = lcpOfficialPass === true
    && clsOfficialPass === true
    && syntheticInteractionOfficialPass === true;
  const labStrictPass = lcpStrictPass === true
    && clsStrictPass === true
    && syntheticInteractionStrictPass === true;
  const errors = samples.filter((sample) => sample.error).map((sample) => sample.error);
  const layoutShiftSources = samples
    .flatMap((sample) => (
      Array.isArray(sample.layoutShifts)
        ? sample.layoutShifts.map((shift) => ({
            iteration: sample.iteration,
            startTime: shift.startTime,
            value: shift.value,
            sources: Array.isArray(shift.sources)
              ? shift.sources.map((source) => source.node).filter(Boolean)
              : [],
          }))
        : []
    ))
    .sort((left, right) => (right.value || 0) - (left.value || 0))
    .slice(0, 5);

  return {
    route: routePath,
    viewport: viewportConfig.key,
    label: viewportConfig.label,
    sampleCount: samples.length,
    status: errors.length ? 'warning' : 'ok',
    lcpP75,
    clsP75,
    fcpP75,
    ttfbP75,
    longTaskTotalP75,
    longestLongTaskP75,
    syntheticInteractionMaxP75,
    syntheticInteractionOfficialPass,
    syntheticInteractionStrictPass,
    officialLabAssessment: labOfficialPass ? 'pass' : 'review',
    strictLabAssessment: labStrictPass ? 'pass' : 'review',
    lcpElement: samples.find((sample) => sample.lcpElement)?.lcpElement || null,
    lcpUrl: samples.find((sample) => sample.lcpUrl)?.lcpUrl || null,
    layoutShiftSources,
    errors,
  };
};

const writeReports = async (report) => {
  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const lines = [
    '# CWV Lab Audit',
    '',
    `- Result: ${report.ok ? 'PASS' : 'REVIEW'}`,
    `- Checked At: ${report.checkedAt}`,
    `- Base URL: ${report.baseUrl}`,
    `- Routes: ${report.routes.join(', ')}`,
    `- Iterations: ${report.iterations}`,
    `- Settle: ${report.settleMs}ms`,
    `- Mode: ${report.failOnReview ? 'gate (review fails)' : 'audit-only'}`,
    '- Note: Synthetic lab audit. INP is field-only here; use PageSpeed/CrUX/Search Console for final INP proof.',
    `- Official Good: LCP <= ${formatMs(CWV_TARGETS.lcp.officialGood)}, INP <= ${formatMs(CWV_TARGETS.inp.officialGood)}, CLS <= ${formatCls(CWV_TARGETS.cls.officialGood)}`,
    `- Internal SLO: LCP <= ${formatMs(CWV_TARGETS.lcp.strictGood)}, INP <= ${formatMs(CWV_TARGETS.inp.strictGood)}, CLS <= ${formatCls(CWV_TARGETS.cls.strictGood)}`,
    '',
    '| Route | Viewport | LCP p75 | CLS p75 | FCP p75 | TTFB p75 | Long Tasks p75 | Longest Task p75 | Synthetic Interaction | Official Lab | Strict Lab | Status |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |',
  ];

  for (const summary of report.summaries) {
    lines.push(
      `| ${summary.route} | ${summary.label} | ${formatMs(summary.lcpP75)} | ${formatCls(summary.clsP75)} | ${formatMs(summary.fcpP75)} | ${formatMs(summary.ttfbP75)} | ${formatMs(summary.longTaskTotalP75)} | ${formatMs(summary.longestLongTaskP75)} | ${formatMs(summary.syntheticInteractionMaxP75)} | ${summary.officialLabAssessment} | ${summary.strictLabAssessment} | ${summary.status} |`,
    );
  }

  const warnings = report.summaries.flatMap((summary) => (
    summary.errors.map((error) => `[${summary.route} | ${summary.label}] ${error}`)
  ));
  if (warnings.length > 0) {
    lines.push('', '## Warnings');
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
  }

  const reviewSummaries = report.summaries.filter((summary) => (
    summary.officialLabAssessment !== 'pass' || summary.strictLabAssessment !== 'pass'
  ));
  if (reviewSummaries.length > 0) {
    lines.push('', '## Review Items');
    for (const summary of reviewSummaries) {
      lines.push(
        `- [${summary.route} | ${summary.label}] official=${summary.officialLabAssessment}, strict=${summary.strictLabAssessment}, LCP=${formatMs(summary.lcpP75)}, CLS=${formatCls(summary.clsP75)}, synthetic=${formatMs(summary.syntheticInteractionMaxP75)}`,
      );
      for (const shift of summary.layoutShiftSources) {
        const sourceText = shift.sources.length ? shift.sources.join(', ') : 'unknown source';
        lines.push(`  - shift ${formatCls(shift.value)} at ${formatMs(shift.startTime)}: ${sourceText}`);
      }
    }
  }

  await fs.mkdir(path.dirname(markdownPath), { recursive: true });
  await fs.writeFile(markdownPath, `${lines.join('\n')}\n`, 'utf8');
};

const run = async () => {
  const { chromium } = await loadPlaywright();
  const browser = await launchChromium(chromium);
  const samples = [];

  try {
    for (const routePath of routes) {
      for (const viewportConfig of viewports) {
        for (let iteration = 1; iteration <= iterations; iteration += 1) {
          samples.push(await runIteration({
            browser,
            routePath,
            viewportConfig,
            iteration,
          }));
        }
      }
    }
  } finally {
    await browser.close();
  }

  const summaries = [];
  for (const routePath of routes) {
    for (const viewportConfig of viewports) {
      const groupSamples = samples.filter((sample) => (
        sample.route === routePath && sample.viewport === viewportConfig.key
      ));
      summaries.push(summarizeGroup(routePath, viewportConfig, groupSamples));
    }
  }

  const report = {
    ok: summaries.every((summary) => (
      summary.status === 'ok' && summary.strictLabAssessment === 'pass'
    )),
    checkedAt: new Date().toISOString(),
    baseUrl,
    routes,
    iterations,
    timeoutMs,
    settleMs,
    failOnReview,
    targets: CWV_TARGETS,
    summaries,
    samples,
  };

  await writeReports(report);
  console.log(`[cwv:lab] status=${report.ok ? 'passed' : 'review'}`);
  console.log(`[cwv:lab] json=${path.relative(frontendRoot, jsonPath)}`);
  console.log(`[cwv:lab] markdown=${path.relative(frontendRoot, markdownPath)}`);

  if (failOnReview && !report.ok) {
    console.error('[cwv:lab] gate failed: report requires review');
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('[cwv:lab] failed', error);
  process.exit(1);
});
