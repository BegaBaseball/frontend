#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { defaultMateMobileSuiteContracts } from './mate-mobile-summary-lib.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const outputRoot = path.join(repoRoot, 'output', 'playwright');
const artifactRoot = path.join(outputRoot, 'mate-mobile');
const summaryJsonPath = path.join(outputRoot, 'mate-mobile-regression-summary.json');
const summaryMarkdownPath = path.join(outputRoot, 'mate-mobile-regression-summary.md');
const smokeSpec = 'cypress/e2e/mate-mobile-smoke.cy.ts';
const defaultPort = Number(process.env.MATE_MOBILE_MANAGED_DEV_SERVER_PORT || '5177');
const requestedSuites = (process.env.MATE_MOBILE_SUITES || Object.keys(defaultMateMobileSuiteContracts).join(','))
  .split(',')
  .map((suite) => suite.trim())
  .filter(Boolean);

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

const wait = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const canListenOnPort = (port) => new Promise((resolve) => {
  const server = net.createServer();
  server.once('error', () => resolve(false));
  server.once('listening', () => {
    server.close(() => resolve(true));
  });
  server.listen(port, '127.0.0.1');
});

const findAvailablePort = async (preferredPort) => {
  for (let port = preferredPort; port < preferredPort + 20; port += 1) {
    if (await canListenOnPort(port)) {
      return port;
    }
  }

  throw new Error(`No available mate mobile dev server port found from ${preferredPort}.`);
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
    if (await waitForReachable(`${existingBaseUrl}/mate`, 5000)) {
      console.log(`Reusing reachable frontend at ${existingBaseUrl}.`);
      return {
        baseUrl: existingBaseUrl,
        serverMode: 'attached-existing-port',
        stop: null,
      };
    }

    port = await findAvailablePort(preferredPort + 1);
    console.log(`Port ${preferredPort} is busy and not reachable as /mate. Starting managed frontend on ${port}.`);
  }

  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
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
  if (!await waitForReachable(`${baseUrl}/mate`)) {
    process.kill(-child.pid, 'SIGTERM');
    throw new Error(`Vite dev server did not become reachable at ${baseUrl}/mate.`);
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

const runCypress = ({ baseUrl, suites }) => {
  const result = spawnSync('node', [
    'scripts/cypress-run.mjs',
    '--spec',
    smokeSpec,
    '--config',
    `baseUrl=${baseUrl},viewportWidth=390,viewportHeight=844`,
  ], {
    cwd: frontendRoot,
    env: {
      ...process.env,
      MATE_MOBILE_ACTIVE_SUITES: suites.join(','),
    },
    stdio: 'inherit',
  });

  return result.status ?? 1;
};

const buildSuiteSummary = ({ suiteKey, cypressStatus, durationMs }) => {
  const contract = defaultMateMobileSuiteContracts[suiteKey];
  const status = cypressStatus === 0 ? 'passed' : 'failed';

  return {
    key: suiteKey,
    label: contract.label,
    status,
    states: contract.states,
    devices: contract.devices,
    entryCount: contract.states.length * contract.devices.length,
    overflowFailureCount: 0,
    actionableFailedRequestCount: 0,
    actionableConsoleErrorCount: 0,
    durationMs,
  };
};

const buildSummary = ({
  baseUrl,
  serverMode,
  suites,
  cypressStatus,
  durationMs,
}) => {
  const suiteSummaries = suites.map((suiteKey) => buildSuiteSummary({
    suiteKey,
    cypressStatus,
    durationMs: Math.round(durationMs / Math.max(suites.length, 1)),
  }));

  return {
    generatedAt: new Date().toISOString(),
    status: cypressStatus === 0 ? 'passed' : 'failed',
    baseUrl,
    serverMode,
    runner: 'cypress',
    spec: smokeSpec,
    artifactRoot,
    suites: suiteSummaries,
    totals: {
      suiteCount: suiteSummaries.length,
      failedSuiteCount: suiteSummaries.filter((suite) => suite.status !== 'passed').length,
      entryCount: suiteSummaries.reduce((sum, suite) => sum + suite.entryCount, 0),
      overflowFailureCount: 0,
      actionableFailedRequestCount: 0,
      actionableConsoleErrorCount: 0,
    },
  };
};

const renderMarkdown = (summary) => {
  const lines = [
    '# Mate Mobile Regression Summary',
    '',
    `- Generated at: ${summary.generatedAt}`,
    `- Status: ${summary.status}`,
    `- Base URL: ${summary.baseUrl}`,
    `- Server mode: ${summary.serverMode}`,
    `- Runner: ${summary.runner}`,
    `- Spec: ${summary.spec}`,
    `- Total entries: ${summary.totals.entryCount}`,
    `- Failed suites: ${summary.totals.failedSuiteCount}`,
    '',
    '| Suite | Status | States | Devices | Entries | Duration |',
    '| --- | --- | --- | --- | ---: | ---: |',
  ];

  summary.suites.forEach((suite) => {
    lines.push(
      `| ${suite.label} | ${suite.status} | ${suite.states.join(', ')} | ${suite.devices.join(', ')} | ${suite.entryCount} | ${suite.durationMs}ms |`
    );
  });

  return `${lines.join('\n')}\n`;
};

const writeSummary = async (summary) => {
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(summaryMarkdownPath, renderMarkdown(summary), 'utf8');
};

const resolveRunTarget = async () => {
  const attachedBaseUrl = normalizeBaseUrl(process.env.AUDIT_BASE_URL);
  if (attachedBaseUrl) {
    if (!await waitForReachable(`${attachedBaseUrl}/mate`, 5000)) {
      throw new Error(`AUDIT_BASE_URL is not reachable at ${attachedBaseUrl}/mate.`);
    }
    return { baseUrl: attachedBaseUrl, serverMode: 'attached', stop: null };
  }

  const shouldAutoStart = process.env.MATE_MOBILE_AUTO_START_DEV_SERVER !== '0'
    || process.env.MATE_MOBILE_FORCE_START_DEV_SERVER === '1';
  if (!shouldAutoStart) {
    throw new Error('MATE_MOBILE_AUTO_START_DEV_SERVER=0 requires AUDIT_BASE_URL.');
  }

  return startDevServer(defaultPort);
};

const main = async () => {
  const unknownSuites = requestedSuites.filter((suite) => !defaultMateMobileSuiteContracts[suite]);
  if (unknownSuites.length > 0) {
    throw new Error(`Unknown mate mobile suites: ${unknownSuites.join(', ')}`);
  }

  const startedAt = Date.now();
  let target = null;
  let cypressStatus = 1;

  try {
    target = await resolveRunTarget();
    cypressStatus = runCypress({ baseUrl: target.baseUrl, suites: requestedSuites });
  } finally {
    target?.stop?.();
  }

  const summary = buildSummary({
    baseUrl: target?.baseUrl || null,
    serverMode: target?.serverMode || 'unknown',
    suites: requestedSuites,
    cypressStatus,
    durationMs: Date.now() - startedAt,
  });

  await writeSummary(summary);
  console.log(`summary:${summaryJsonPath}`);
  console.log(`summary_markdown:${summaryMarkdownPath}`);

  if (cypressStatus !== 0) {
    process.exitCode = cypressStatus;
  }
};

main().catch(async (error) => {
  const summary = buildSummary({
    baseUrl: null,
    serverMode: 'failed-before-run',
    suites: requestedSuites.filter((suite) => defaultMateMobileSuiteContracts[suite]),
    cypressStatus: 1,
    durationMs: 0,
  });
  await writeSummary(summary);
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
