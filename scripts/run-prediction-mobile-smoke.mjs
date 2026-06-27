#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const outputRoot = path.join(frontendRoot, 'output', 'playwright');
const artifactRoot = path.join(outputRoot, 'prediction-mobile-smoke');
const summaryJsonPath = path.join(outputRoot, 'prediction-mobile-regression-summary.json');
const summaryMarkdownPath = path.join(outputRoot, 'prediction-mobile-regression-summary.md');
const summaryVariantPrefix = 'prediction-mobile-smoke';
const summaryIndexJsonPath = path.join(outputRoot, `${summaryVariantPrefix}-index.json`);
const summaryIndexMarkdownPath = path.join(outputRoot, `${summaryVariantPrefix}-index.md`);
const smokeSpec = 'cypress/e2e/prediction-mobile-smoke.cy.ts';
const cypressSmokeScreenshotRoot = path.join(
  frontendRoot,
  'cypress',
  'screenshots',
  'prediction-mobile-smoke.cy.ts',
  'prediction-mobile-smoke',
);
const defaultPort = Number(process.env.PREDICTION_MOBILE_MANAGED_DEV_SERVER_PORT || '5177');

export const defaultPredictionMobileSmokeStates = [
  'match',
  'detail-loading',
  'detail-error',
  'top-notice',
];

export const rankingPredictionMobileSmokeStates = [
  'ranking',
  'ranking-ended',
  'ranking-init-error',
  'ranking-save-dialog',
  'ranking-saved',
];

export const allowedPredictionMobileSmokeStates = [
  ...defaultPredictionMobileSmokeStates,
  ...rankingPredictionMobileSmokeStates,
];

export const defaultPredictionMobileSmokeDevices = ['mobile-390'];

const predictionMobileSmokeReportVariants = [
  {
    reportKey: 'core',
    label: 'Core',
    states: defaultPredictionMobileSmokeStates,
  },
  {
    reportKey: 'ranking',
    label: 'Ranking',
    states: rankingPredictionMobileSmokeStates,
  },
];

const normalizeList = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const items = value.split(',').map((item) => item.trim()).filter(Boolean);
    return items.length > 0 ? items : [...fallback];
  }
  return [...fallback];
};

const requestedStates = normalizeList(
  process.env.PREDICTION_MOBILE_STATES,
  defaultPredictionMobileSmokeStates,
);

const sameStateSet = (left, right) => {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((state) => rightSet.has(state));
};

const slugifySummaryKey = (value) => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export const resolvePredictionMobileSmokeReportKey = (states) => {
  const normalizedStates = normalizeList(states, defaultPredictionMobileSmokeStates);

  if (sameStateSet(normalizedStates, defaultPredictionMobileSmokeStates)) {
    return 'core';
  }

  if (sameStateSet(normalizedStates, rankingPredictionMobileSmokeStates)) {
    return 'ranking';
  }

  return slugifySummaryKey(normalizedStates.join('-')) || 'custom';
};

export const resolvePredictionMobileSmokeSummaryPaths = (states) => {
  const reportKey = resolvePredictionMobileSmokeReportKey(states);
  const variantBaseName = `${summaryVariantPrefix}-${reportKey}-summary`;

  return {
    latestJsonPath: summaryJsonPath,
    latestMarkdownPath: summaryMarkdownPath,
    variantJsonPath: path.join(outputRoot, `${variantBaseName}.json`),
    variantMarkdownPath: path.join(outputRoot, `${variantBaseName}.md`),
    indexJsonPath: summaryIndexJsonPath,
    indexMarkdownPath: summaryIndexMarkdownPath,
  };
};

export const resolvePredictionMobileSmokeIndexPaths = () => ({
  indexJsonPath: summaryIndexJsonPath,
  indexMarkdownPath: summaryIndexMarkdownPath,
});

const wait = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const normalizeBaseUrl = (value) => {
  if (!value) {
    return null;
  }

  const trimmed = String(value).trim().replace(/\/+$/, '');
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
};

const canListenOnPort = (port) => new Promise((resolve) => {
  const server = net.createServer();
  server.once('error', () => resolve(false));
  server.once('listening', () => {
    server.close(() => resolve(true));
  });
  server.listen({ port, host: '0.0.0.0' });
});

const findAvailablePort = async (preferredPort) => {
  for (let port = preferredPort; port < preferredPort + 20; port += 1) {
    if (await canListenOnPort(port)) {
      return port;
    }
  }

  throw new Error(`No available prediction mobile dev server port found from ${preferredPort}.`);
};

const isReachable = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const waitForReachable = async (url, timeoutMs = 90000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isReachable(url)) {
      return true;
    }
    await wait(1000);
  }

  return false;
};

const startDevServer = async (preferredPort) => {
  let port = preferredPort;
  if (!await canListenOnPort(preferredPort)) {
    const existingBaseUrl = `http://127.0.0.1:${preferredPort}`;
    if (await waitForReachable(`${existingBaseUrl}/prediction`, 5000)) {
      console.log(`Reusing reachable frontend at ${existingBaseUrl}.`);
      return {
        baseUrl: existingBaseUrl,
        serverMode: 'attached-existing-port',
        stop: null,
      };
    }

    port = await findAvailablePort(preferredPort + 1);
    console.log(`Port ${preferredPort} is busy and not reachable as /prediction. Starting managed frontend on ${port}.`);
  }

  const child = spawn('npm', ['run', 'dev', '--', '--host', '0.0.0.0', '--port', String(port), '--strictPort'], {
    cwd: frontendRoot,
    env: {
      ...process.env,
      VITE_SITE_URL: process.env.VITE_SITE_URL || `http://127.0.0.1:${port}`,
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '/api',
      VITE_SUPPRESS_CYPRESS_PROXY_ERRORS: 'true',
    },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk.toString()}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk.toString()}`));

  const baseUrl = `http://127.0.0.1:${port}`;
  if (!await waitForReachable(`${baseUrl}/prediction`)) {
    process.kill(-child.pid, 'SIGTERM');
    throw new Error(`Vite dev server did not become reachable at ${baseUrl}/prediction.`);
  }

  return {
    baseUrl,
    serverMode: 'managed',
    stop: () => {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        child.kill('SIGTERM');
      }
    },
  };
};

const resolveRunTarget = async () => {
  const attachedBaseUrl = normalizeBaseUrl(process.env.AUDIT_BASE_URL);
  if (attachedBaseUrl) {
    if (!await waitForReachable(`${attachedBaseUrl}/prediction`, 5000)) {
      throw new Error(`AUDIT_BASE_URL is not reachable at ${attachedBaseUrl}/prediction.`);
    }
    return { baseUrl: attachedBaseUrl, serverMode: 'attached', stop: null };
  }

  const shouldAutoStart = process.env.PREDICTION_MOBILE_AUTO_START_DEV_SERVER !== '0'
    || process.env.PREDICTION_MOBILE_FORCE_START_DEV_SERVER === '1';
  if (!shouldAutoStart) {
    throw new Error('PREDICTION_MOBILE_AUTO_START_DEV_SERVER=0 requires AUDIT_BASE_URL.');
  }

  return startDevServer(defaultPort);
};

const runCypress = ({ baseUrl, states }) => {
  const result = spawnSync('node', [
    'scripts/cypress-run.mjs',
    '--auto-docker',
    '--spec',
    smokeSpec,
    '--config',
    `baseUrl=${baseUrl},viewportWidth=390,viewportHeight=844`,
    '--env',
    `PREDICTION_MOBILE_ACTIVE_STATES=${states.join(',')}`,
  ], {
    cwd: frontendRoot,
    env: {
      ...process.env,
      CYPRESS_VERIFY_TIMEOUT: process.env.CYPRESS_VERIFY_TIMEOUT || '120000',
      PREDICTION_MOBILE_ACTIVE_STATES: states.join(','),
      CYPRESS_PREDICTION_MOBILE_ACTIVE_STATES: states.join(','),
      PREDICTION_MOBILE_ACTIVE_DEVICES: defaultPredictionMobileSmokeDevices.join(','),
      PREDICTION_MOBILE_ARTIFACT_ROOT: artifactRoot,
    },
    stdio: 'inherit',
  });

  return result.status ?? 1;
};

export const buildPredictionMobileSmokeSummary = ({
  baseUrl,
  serverMode,
  states,
  devices,
  cypressStatus,
  durationMs,
}) => {
  const normalizedStates = normalizeList(states, defaultPredictionMobileSmokeStates);
  const normalizedDevices = normalizeList(devices, defaultPredictionMobileSmokeDevices);
  const status = cypressStatus === 0 ? 'passed' : 'failed';
  const reportKey = resolvePredictionMobileSmokeReportKey(normalizedStates);
  const entries = normalizedStates.flatMap((state) => normalizedDevices.map((device) => ({
    state,
    device,
    status,
    screenshotPath: path.join(artifactRoot, `${state}-${device}.png`),
  })));

  return {
    generatedAt: new Date().toISOString(),
    status,
    baseUrl,
    serverMode,
    runner: 'cypress',
    spec: smokeSpec,
    reportKey,
    artifactRoot,
    states: normalizedStates,
    requestedStates: normalizedStates,
    devices: normalizedDevices,
    entryCount: entries.length,
    overflowFailureCount: 0,
    actionableFailedRequestCount: 0,
    actionableConsoleErrorCount: 0,
    durationMs,
    entries,
  };
};

export const renderPredictionMobileSmokeMarkdown = (summary) => {
  const lines = [
    '# Prediction Mobile Smoke Summary',
    '',
    `- Generated at: ${summary.generatedAt}`,
    `- Status: ${summary.status}`,
    `- Base URL: ${summary.baseUrl || 'none'}`,
    `- Server mode: ${summary.serverMode}`,
    `- Runner: ${summary.runner}`,
    `- Spec: ${summary.spec}`,
    `- Report key: ${summary.reportKey || 'default'}`,
    `- States: ${summary.states.join(', ')}`,
    `- Devices: ${summary.devices.join(', ')}`,
    `- Entries: ${summary.entryCount}`,
    `- Overflow failures: ${summary.overflowFailureCount}`,
    `- Actionable failed requests: ${summary.actionableFailedRequestCount}`,
    `- Actionable console errors: ${summary.actionableConsoleErrorCount}`,
    `- Duration: ${summary.durationMs}ms`,
    '',
    '| State | Device | Status | Screenshot |',
    '| --- | --- | --- | --- |',
  ];

  summary.entries.forEach((entry) => {
    lines.push(`| ${entry.state} | ${entry.device} | ${entry.status} | ${entry.screenshotPath} |`);
  });

  return `${lines.join('\n')}\n`;
};

export const buildPredictionMobileSmokeReportIndex = ({
  summaries = [],
  generatedAt = new Date().toISOString(),
} = {}) => {
  const summariesByKey = new Map(
    summaries
      .filter((summary) => summary?.reportKey)
      .map((summary) => [summary.reportKey, summary])
  );

  const reports = predictionMobileSmokeReportVariants.map((variant) => {
    const summary = summariesByKey.get(variant.reportKey) || null;
    const paths = resolvePredictionMobileSmokeSummaryPaths(variant.states);

    return {
      reportKey: variant.reportKey,
      label: variant.label,
      status: summary?.status || 'missing',
      states: summary?.states || variant.states,
      entryCount: summary?.entryCount || 0,
      generatedAt: summary?.generatedAt || null,
      durationMs: summary?.durationMs || 0,
      overflowFailureCount: summary?.overflowFailureCount || 0,
      actionableFailedRequestCount: summary?.actionableFailedRequestCount || 0,
      actionableConsoleErrorCount: summary?.actionableConsoleErrorCount || 0,
      markdownPath: paths.variantMarkdownPath,
      jsonPath: paths.variantJsonPath,
    };
  });

  const availableReports = reports.filter((report) => report.status !== 'missing');
  const failedReports = reports.filter((report) => report.status === 'failed');
  const missingReports = reports.filter((report) => report.status === 'missing');
  const status = failedReports.length > 0
    ? 'failed'
    : missingReports.length > 0
      ? 'partial'
      : 'passed';

  return {
    generatedAt,
    status,
    latestSummaryJsonPath: summaryJsonPath,
    latestSummaryMarkdownPath: summaryMarkdownPath,
    reports,
    totals: {
      expectedReportCount: reports.length,
      availableReportCount: availableReports.length,
      failedReportCount: failedReports.length,
      missingReportCount: missingReports.length,
      overflowFailureCount: reports.reduce((total, report) => total + report.overflowFailureCount, 0),
      actionableFailedRequestCount: reports.reduce((total, report) => total + report.actionableFailedRequestCount, 0),
      actionableConsoleErrorCount: reports.reduce((total, report) => total + report.actionableConsoleErrorCount, 0),
    },
  };
};

export const renderPredictionMobileSmokeReportIndexMarkdown = (index) => {
  const lines = [
    '# Prediction Mobile Smoke Report Index',
    '',
    `- Generated at: ${index.generatedAt}`,
    `- Status: ${index.status}`,
    `- Reports: ${index.totals.availableReportCount}/${index.totals.expectedReportCount}`,
    `- Failed reports: ${index.totals.failedReportCount}`,
    `- Missing reports: ${index.totals.missingReportCount}`,
    `- Overflow failures: ${index.totals.overflowFailureCount}`,
    `- Actionable failed requests: ${index.totals.actionableFailedRequestCount}`,
    `- Actionable console errors: ${index.totals.actionableConsoleErrorCount}`,
    `- Latest summary: ${index.latestSummaryMarkdownPath}`,
    '',
    '| Report | Status | States | Entries | Overflow failures | Failed requests | Console errors | Markdown |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | --- |',
  ];

  index.reports.forEach((report) => {
    lines.push(
      `| ${report.label} | ${report.status} | ${report.states.join(', ')} | ${report.entryCount} | ${report.overflowFailureCount} | ${report.actionableFailedRequestCount} | ${report.actionableConsoleErrorCount} | ${report.markdownPath} |`
    );
  });

  return `${lines.join('\n')}\n`;
};

const readSummaryJson = async (jsonPath) => {
  try {
    const raw = await fs.readFile(jsonPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const writeReportIndex = async (currentSummary) => {
  const summaries = await Promise.all(
    predictionMobileSmokeReportVariants.map(async (variant) => {
      if (currentSummary?.reportKey === variant.reportKey) {
        return currentSummary;
      }

      const paths = resolvePredictionMobileSmokeSummaryPaths(variant.states);
      return readSummaryJson(paths.variantJsonPath);
    })
  );
  const index = buildPredictionMobileSmokeReportIndex({
    summaries: summaries.filter(Boolean),
  });

  await Promise.all([
    fs.writeFile(summaryIndexJsonPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8'),
    fs.writeFile(summaryIndexMarkdownPath, renderPredictionMobileSmokeReportIndexMarkdown(index), 'utf8'),
  ]);

  return resolvePredictionMobileSmokeIndexPaths();
};

const writeSummary = async (summary) => {
  const summaryPaths = resolvePredictionMobileSmokeSummaryPaths(summary.states);
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.mkdir(artifactRoot, { recursive: true });
  const json = `${JSON.stringify(summary, null, 2)}\n`;
  const markdown = renderPredictionMobileSmokeMarkdown(summary);

  await Promise.all([
    fs.writeFile(summaryPaths.latestJsonPath, json, 'utf8'),
    fs.writeFile(summaryPaths.latestMarkdownPath, markdown, 'utf8'),
    fs.writeFile(summaryPaths.variantJsonPath, json, 'utf8'),
    fs.writeFile(summaryPaths.variantMarkdownPath, markdown, 'utf8'),
  ]);

  const indexPaths = await writeReportIndex(summary);

  return {
    ...summaryPaths,
    ...indexPaths,
  };
};

const copyPredictionMobileSmokeScreenshots = async (states, devices) => {
  await fs.mkdir(artifactRoot, { recursive: true });
  await Promise.all(states.flatMap((state) => devices.map(async (device) => {
    const filename = `${state}-${device}.png`;
    const sourcePath = path.join(cypressSmokeScreenshotRoot, filename);
    const destinationPath = path.join(artifactRoot, filename);

    try {
      await fs.copyFile(sourcePath, destinationPath);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  })));
};

const validateRequestedStates = (states) => {
  const allowed = new Set(allowedPredictionMobileSmokeStates);
  const unknownStates = states.filter((state) => !allowed.has(state));
  if (unknownStates.length > 0) {
    throw new Error(`Unknown prediction mobile smoke states: ${unknownStates.join(', ')}`);
  }
};

const main = async () => {
  validateRequestedStates(requestedStates);

  const startedAt = Date.now();
  let target = null;
  let cypressStatus = 1;

  try {
    target = await resolveRunTarget();
    cypressStatus = runCypress({ baseUrl: target.baseUrl, states: requestedStates });
  } finally {
    target?.stop?.();
  }
  await copyPredictionMobileSmokeScreenshots(requestedStates, defaultPredictionMobileSmokeDevices);

  const summary = buildPredictionMobileSmokeSummary({
    baseUrl: target?.baseUrl || null,
    serverMode: target?.serverMode || 'unknown',
    states: requestedStates,
    devices: defaultPredictionMobileSmokeDevices,
    cypressStatus,
    durationMs: Date.now() - startedAt,
  });

  const summaryPaths = await writeSummary(summary);
  console.log(`summary:${summaryPaths.latestJsonPath}`);
  console.log(`summary_markdown:${summaryPaths.latestMarkdownPath}`);
  console.log(`summary_variant:${summaryPaths.variantJsonPath}`);
  console.log(`summary_variant_markdown:${summaryPaths.variantMarkdownPath}`);
  console.log(`summary_index:${summaryPaths.indexJsonPath}`);
  console.log(`summary_index_markdown:${summaryPaths.indexMarkdownPath}`);

  if (cypressStatus !== 0) {
    process.exitCode = cypressStatus;
  }
};

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMainModule) {
  main().catch(async (error) => {
    const knownStates = requestedStates.filter((state) => allowedPredictionMobileSmokeStates.includes(state));
    const summary = buildPredictionMobileSmokeSummary({
      baseUrl: null,
      serverMode: 'failed-before-run',
      states: knownStates.length > 0 ? knownStates : defaultPredictionMobileSmokeStates,
      devices: defaultPredictionMobileSmokeDevices,
      cypressStatus: 1,
      durationMs: 0,
    });
    await writeSummary(summary);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
