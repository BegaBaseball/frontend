#!/usr/bin/env node
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import {
  buildPredictionPerformanceMarkdown,
  buildTimingSummary,
  classifyPredictionApiRequest,
  evaluatePredictionRuntimeBudget,
  evaluatePredictionPerformanceReport,
  extractPredictionFailedScenarioIds,
  parsePredictionPerformanceScenarioSelection,
  predictionApiEndpointKeys,
  predictionPerformanceDefaultScenarioIds,
  roundMetric,
  percentile,
} from './prediction-performance-audit-lib.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const backendRoot = path.join(repoRoot, 'bega_backend', 'BEGA_PROJECT');

const mode = process.env.PREDICTION_PERF_MODE || 'mock';
const selectedDate = process.env.PREDICTION_PERF_DATE || '2026-06-07';
const selectedGameId = process.env.PREDICTION_PERF_GAME_ID || '20260607HHLT0';
const iterationCount = parsePositiveInt(process.env.PREDICTION_PERF_ITERATIONS, 5);
const apiBaseUrl = normalizeApiBaseUrl(process.env.PREDICTION_PERF_API_BASE_URL || 'http://localhost:8080/api');
const auditBaseUrl = process.env.AUDIT_BASE_URL || '';
const strictCold = process.env.PREDICTION_PERF_STRICT_COLD === '1';
const startBackend = process.env.PREDICTION_PERF_START_BACKEND === '1';
const captureFailureArtifacts = process.env.PREDICTION_PERF_CAPTURE_FAILURE_ARTIFACTS !== '0';
const scenarioSelection = mode === 'mock'
  ? parsePredictionPerformanceScenarioSelection({
    rawScenarioIds: process.env.PREDICTION_PERF_SCENARIOS,
    rawTier: process.env.PREDICTION_PERF_SCENARIO_TIER,
    availableIds: predictionPerformanceDefaultScenarioIds,
  })
  : {
    scenarioTier: null,
    scenarioSelectionSource: 'real-mode',
    selectedScenarioIds: [],
    skippedScenarioIds: [],
  };
const selectedScenarioIds = scenarioSelection.selectedScenarioIds;
const outputRoot = process.env.PREDICTION_PERF_OUTPUT_ROOT
  ? path.resolve(process.env.PREDICTION_PERF_OUTPUT_ROOT)
  : path.join(repoRoot, 'output', 'playwright', 'prediction-performance');
const failureArtifactsRoot = path.join(outputRoot, 'failure-artifacts');
const runtimeBudgetMs = parsePositiveInt(process.env.PREDICTION_PERF_RUNTIME_BUDGET_MS, 300000);

const budgets = {
  previewP95Ms: parsePositiveInt(process.env.PREDICTION_PERF_PREVIEW_P95_BUDGET_MS, 1000),
  detailP95Ms: parsePositiveInt(process.env.PREDICTION_PERF_DETAIL_P95_BUDGET_MS, 1500),
  reentryP95Ms: parsePositiveInt(process.env.PREDICTION_PERF_REENTRY_P95_BUDGET_MS, 200),
  apiWarmP95Ms: parsePositiveInt(process.env.PREDICTION_PERF_API_WARM_P95_BUDGET_MS, 200),
  apiColdP95Ms: parsePositiveInt(process.env.PREDICTION_PERF_API_COLD_BUDGET_MS, 500),
};

const viewport = {
  key: 'desktop-1440',
  label: 'Desktop 1440',
  viewport: { width: 1440, height: 900 },
  isMobile: false,
  hasTouch: false,
  deviceScaleFactor: 1,
};

if (!['mock', 'real'].includes(mode)) {
  throw new Error(`PREDICTION_PERF_MODE must be mock or real. Actual: ${mode}`);
}

function parsePositiveInt(rawValue, fallback) {
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeApiBaseUrl(rawValue) {
  const candidate = rawValue.endsWith('/') ? rawValue : `${rawValue}/`;
  return candidate;
}

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const removeDir = async (dirPath) => {
  await fs.rm(dirPath, { recursive: true, force: true }).catch(() => undefined);
};

const artifactPath = (filePath) => path.relative(repoRoot, filePath).split(path.sep).join('/');

const sleep = async (timeMs) => {
  await new Promise((resolve) => {
    setTimeout(resolve, timeMs);
  });
};

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

const withTimeout = async (promise, timeoutMs, errorMessage) => {
  let timerId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timerId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timerId);
  }
};

const isPortAvailable = async (port) => new Promise((resolve) => {
  const server = net.createServer();
  server.once('error', () => resolve(false));
  server.once('listening', () => {
    server.close(() => resolve(true));
  });
  server.listen({ port, host: '127.0.0.1' });
});

const findOpenPort = async (startPort) => {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.once('listening', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close(() => {
        if (port) {
          resolve(port);
        } else {
          reject(new Error(`Unable to find an open local Vite port starting at ${startPort}.`));
        }
      });
    });
    server.listen({ port: 0, host: '127.0.0.1' });
  });
};

const parseManualBaseballDataContract = (bodyText) => {
  if (typeof bodyText !== 'string' || bodyText.trim() === '') {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }

  if (parsed?.code !== 'MANUAL_BASEBALL_DATA_REQUIRED') {
    return null;
  }

  const data = parsed.data ?? {};
  return {
    code: parsed.code,
    message: parsed.message ?? null,
    scope: data.scope ?? null,
    missingItems: Array.isArray(data.missingItems) ? data.missingItems : [],
    operatorMessage: data.operatorMessage ?? null,
    blocking: data.blocking ?? null,
  };
};

const fetchWithTimeout = async (url, timeoutMs = 2000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual',
    });
    const bodyText = await response.text().catch(() => '');
    const manualDataContract = parseManualBaseballDataContract(bodyText);
    return {
      ok: response.ok,
      status: response.status,
      durationMs: roundMetric(performance.now() - startedAt),
      manualDataRequired: Boolean(manualDataContract),
      manualDataContract,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      durationMs: roundMetric(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
};

const waitForReachableBaseUrl = async (url, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await fetchWithTimeout(url, 1500);
    if (result.ok || result.status === 404) {
      return true;
    }
    await sleep(250);
  }
  return false;
};

const apiProxyTarget = () => {
  const parsed = new URL(apiBaseUrl);
  return `${parsed.protocol}//${parsed.host}`;
};

const startProcessGroup = (command, args, options) => spawn(command, args, {
  ...options,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

const stopProcessGroup = async (child, label) => {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  const signalProcessGroup = (signal) => {
    try {
      process.kill(-child.pid, signal);
    } catch (_error) {
      child.kill(signal);
    }
  };

  await withTimeout(new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (child.exitCode === null && !child.killed) {
        signalProcessGroup('SIGKILL');
      }
    }, 5000);

    child.once('close', () => {
      clearTimeout(timeout);
      resolve();
    });

    signalProcessGroup('SIGINT');
  }), 8000, `${label} did not stop within 8 seconds.`).catch(() => undefined);
};

const startBackendProcess = () => {
  const child = startProcessGroup('./gradlew', ['bootRun'], {
    cwd: backendRoot,
    env: {
      ...process.env,
      BEGA_BOOTRUN_XMX: process.env.BEGA_BOOTRUN_XMX || '2048m',
    },
  });
  child.stdout.on('data', (chunk) => process.stdout.write(`[bootRun] ${chunk.toString()}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[bootRun] ${chunk.toString()}`));
  return child;
};

const startLocalDevServer = (port) => {
  const localSiteUrl = `http://127.0.0.1:${port}`;
  const child = startProcessGroup('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', `${port}`, '--strictPort'], {
    cwd: frontendRoot,
    env: {
      ...process.env,
      VITE_SITE_URL: process.env.VITE_SITE_URL || localSiteUrl,
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '/api',
      VITE_PROXY_TARGET: process.env.VITE_PROXY_TARGET || apiProxyTarget(),
      VITE_SUPPRESS_CYPRESS_PROXY_ERRORS: 'true',
    },
  });
  child.stdout.on('data', (chunk) => process.stdout.write(`[vite] ${chunk.toString()}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk.toString()}`));
  return {
    child,
    baseUrl: localSiteUrl,
  };
};

const resolveBaseUrl = async () => {
  if (auditBaseUrl) {
    return {
      baseUrl: auditBaseUrl,
      serverMode: 'attached',
      devServerProcess: null,
    };
  }

  const port = await findOpenPort(5177);
  const { child, baseUrl } = startLocalDevServer(port);
  if (!await waitForReachableBaseUrl(new URL('/prediction', baseUrl).toString(), 90000)) {
    await stopProcessGroup(child, 'Local frontend dev server');
    throw new Error(`Local frontend dev server did not accept /prediction connections at ${baseUrl}.`);
  }
  return {
    baseUrl,
    serverMode: `started:${port}`,
    devServerProcess: child,
  };
};

const endpointUrl = (relativePath) => new URL(relativePath.replace(/^\//, ''), apiBaseUrl).toString();

const realEndpointDefinitions = () => ([
  {
    key: predictionApiEndpointKeys.MATCHES_DAY,
    url: endpointUrl(`matches/day?date=${encodeURIComponent(selectedDate)}`),
  },
  {
    key: predictionApiEndpointKeys.BOOTSTRAP,
    url: endpointUrl(`predictions/bootstrap?date=${encodeURIComponent(selectedDate)}&gameId=${encodeURIComponent(selectedGameId)}`),
  },
  {
    key: predictionApiEndpointKeys.RANKING_SNAPSHOT,
    url: endpointUrl(`kbo/rankings/snapshot?date=${encodeURIComponent(selectedDate)}`),
  },
]);

const buildGuidance = ({ status, backendCheck = null } = {}) => {
  if (status === 'needs-backend') {
    const attemptedUrl = backendCheck?.endpoint?.url ?? realEndpointDefinitions()[0].url;
    return [
      `Backend was not reachable at ${attemptedUrl}.`,
      'Start a backend locally, set PREDICTION_PERF_API_BASE_URL to a reachable /api URL, or use workflow_dispatch apiBaseUrl.',
      'GitHub Actions real mode does not start backend automatically.',
    ];
  }

  if (status === 'manual-data-required') {
    return [
      'Real mode reached the backend, but an internal baseball data contract returned MANUAL_BASEBALL_DATA_REQUIRED.',
      'Provide operator-managed internal baseball data for the listed missing items, then rerun npm run qa:prediction:perf:real.',
    ];
  }

  if (mode === 'real') {
    return [
      strictCold
        ? 'Cold API timings are included in failure evaluation because strict cold mode is enabled.'
        : 'Cold API timings are report-only by default; set PREDICTION_PERF_STRICT_COLD=1 to fail on cold budget.',
    ];
  }

  return [];
};

const checkBackendReachable = async () => {
  if (mode !== 'real') {
    return {
      reachable: null,
      endpoint: null,
      result: null,
    };
  }
  const endpoint = realEndpointDefinitions()[0];
  const result = await fetchWithTimeout(endpoint.url, 5000);
  return {
    reachable: Boolean(result.status && result.status < 500),
    endpoint,
    result,
  };
};

const measureRealApiTimings = async () => {
  if (mode !== 'real') {
    return {
      endpoints: {},
    };
  }

  const endpoints = {};
  for (const endpoint of realEndpointDefinitions()) {
    const cold = await fetchWithTimeout(endpoint.url, 10000);
    const warmDurations = [];
    let failedRequestCount = cold.status && cold.status < 500 ? 0 : 1;
    let manualDataContract = cold.manualDataContract ?? null;

    for (let index = 0; index < iterationCount; index += 1) {
      const result = await fetchWithTimeout(endpoint.url, 10000);
      if (!result.status || result.status >= 500) {
        failedRequestCount += 1;
      }
      if (!manualDataContract && result.manualDataContract) {
        manualDataContract = result.manualDataContract;
      }
      warmDurations.push(result.durationMs);
      await sleep(50);
    }

    endpoints[endpoint.key] = {
      url: endpoint.url,
      coldMs: cold.durationMs,
      coldStatus: cold.status,
      coldError: cold.error ?? null,
      warm: buildTimingSummary(warmDurations),
      warmBudgetMs: budgets.apiWarmP95Ms,
      coldBudgetMs: budgets.apiColdP95Ms,
      failedRequestCount,
      manualDataRequired: Boolean(manualDataContract),
      manualDataContract,
    };
  }

  const manualDataRequirements = Object.entries(endpoints)
    .filter(([, endpoint]) => endpoint.manualDataRequired)
    .map(([endpointKey, endpoint]) => ({
      endpointKey,
      url: endpoint.url,
      status: endpoint.coldStatus,
      ...(endpoint.manualDataContract ?? {}),
    }));

  return {
    endpoints,
    manualDataRequirements,
  };
};

const createScenarioGame = ({
  gameId,
  date,
  homeTeam = 'HH',
  awayTeam = 'LT',
  gameStatus = 'SCHEDULED',
  homeScore = null,
  awayScore = null,
}) => ({
  gameId,
  gameDate: date,
  homeTeam,
  awayTeam,
  stadium: '대전',
  startTime: '18:30:00',
  homeScore,
  awayScore,
  winner: null,
  gameStatus,
});

const createScenarioDetail = (game, gameStatusKr = '경기 예정') => ({
  ...game,
  gameStatusKr,
  homePitcher: '문동주',
  awayPitcher: '박세웅',
  inningScores: [],
  summary: [],
});

const createMockScenarioDefinitions = () => {
  const restDate = '2026-06-08';
  const pastDate = '2026-06-06';
  const scheduledGame = createScenarioGame({
    gameId: selectedGameId,
    date: selectedDate,
  });
  const pastGame = createScenarioGame({
    gameId: '20260606HHLT0',
    date: pastDate,
    gameStatus: 'COMPLETED',
    homeScore: 4,
    awayScore: 2,
  });
  const liveGame = createScenarioGame({
    gameId: '20260607HHSS0',
    date: selectedDate,
    awayTeam: 'SS',
    gameStatus: 'LIVE',
    homeScore: 1,
    awayScore: 0,
  });
  const manualGame = createScenarioGame({
    gameId: '20260607SSHH0',
    date: selectedDate,
    awayTeam: 'SS',
    gameStatus: 'LIVE',
    homeScore: 1,
    awayScore: 0,
  });

  return [
    {
      id: 'scheduled-game',
      label: 'Scheduled game',
      kind: 'detail',
      date: selectedDate,
      gameId: scheduledGame.gameId,
      mockToday: selectedDate,
      games: [scheduledGame],
      detail: createScenarioDetail(scheduledGame),
      voteStatus: {
        gameId: scheduledGame.gameId,
        homeVotes: 0,
        awayVotes: 0,
        totalVotes: 0,
        homePercentage: 0,
        awayPercentage: 0,
      },
      livePolicy: null,
      requiresDetail: true,
      expectsVoteButton: true,
      enforcePreviewBudget: true,
      enforceDetailBudget: true,
      enforceReentryBudget: true,
    },
    {
      id: 'ranking-tab',
      label: 'Ranking tab',
      kind: 'ranking-tab',
      date: selectedDate,
      gameId: scheduledGame.gameId,
      mockToday: selectedDate,
      games: [scheduledGame],
      detail: createScenarioDetail(scheduledGame),
      voteStatus: {
        gameId: scheduledGame.gameId,
        homeVotes: 0,
        awayVotes: 0,
        totalVotes: 0,
        homePercentage: 0,
        awayPercentage: 0,
      },
      authenticated: true,
      livePolicy: null,
      requiresDetail: false,
      expectsVoteButton: false,
      enforcePreviewBudget: true,
      enforceDetailBudget: false,
      enforceReentryBudget: false,
    },
    {
      id: 'rest-day',
      label: 'Rest day',
      kind: 'preview-only',
      date: restDate,
      gameId: null,
      mockToday: restDate,
      games: [],
      prevDate: selectedDate,
      nextDate: null,
      livePolicy: null,
      requiresDetail: false,
      expectsVoteButton: false,
      enforcePreviewBudget: true,
      enforceDetailBudget: false,
      enforceReentryBudget: false,
    },
    {
      id: 'past-completed',
      label: 'Past completed',
      kind: 'detail',
      date: pastDate,
      gameId: pastGame.gameId,
      mockToday: selectedDate,
      games: [pastGame],
      detail: createScenarioDetail(pastGame, '경기 종료'),
      voteStatus: {
        gameId: pastGame.gameId,
        homeVotes: 12,
        awayVotes: 7,
        totalVotes: 19,
        homePercentage: 63,
        awayPercentage: 37,
      },
      livePolicy: 'none-after-idle',
      requiresDetail: true,
      expectsVoteButton: false,
      enforcePreviewBudget: false,
      enforceDetailBudget: false,
      enforceReentryBudget: false,
    },
    {
      id: 'today-live',
      label: 'Today live',
      kind: 'detail',
      date: selectedDate,
      gameId: liveGame.gameId,
      mockToday: selectedDate,
      games: [liveGame],
      detail: createScenarioDetail(liveGame, '경기 중'),
      voteStatus: {
        gameId: liveGame.gameId,
        homeVotes: 0,
        awayVotes: 0,
        totalVotes: 0,
        homePercentage: 0,
        awayPercentage: 0,
      },
      livePolicy: 'requires-after-idle',
      requiresDetail: true,
      expectsVoteButton: false,
      enforcePreviewBudget: false,
      enforceDetailBudget: false,
      enforceReentryBudget: false,
    },
    {
      id: 'manual-data-required',
      label: 'Manual data required',
      kind: 'detail',
      date: selectedDate,
      gameId: manualGame.gameId,
      mockToday: selectedDate,
      games: [manualGame],
      detail: createScenarioDetail(manualGame, '경기 중'),
      voteStatus: {
        gameId: manualGame.gameId,
        homeVotes: 0,
        awayVotes: 0,
        totalVotes: 0,
        homePercentage: 0,
        awayPercentage: 0,
      },
      livePolicy: 'manual-suppressed',
      requiresDetail: true,
      expectsVoteButton: false,
      enforcePreviewBudget: false,
      enforceDetailBudget: false,
      enforceReentryBudget: false,
    },
  ];
};

const allMockScenarios = createMockScenarioDefinitions();

const selectedMockScenarios = mode === 'mock'
  ? selectedScenarioIds.map((scenarioId) => {
    const scenario = allMockScenarios.find((candidate) => candidate.id === scenarioId);
    if (!scenario) {
      throw new Error(`Prediction performance scenario is not configured: ${scenarioId}`);
    }
    return scenario;
  })
  : [];

const matchDayResponse = (scenario) => ({
  date: scenario.date,
  games: scenario.games,
  prevDate: scenario.prevDate ?? null,
  nextDate: scenario.nextDate ?? null,
  hasPrev: Boolean(scenario.prevDate),
  hasNext: Boolean(scenario.nextDate),
});

const fulfillJson = async (route, body, status = 200) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
};

const installMockRoutes = async (page, scenario) => {
  await page.route('**/api/auth/mypage*', (route) => fulfillJson(route, {
    success: true,
    data: {
      id: 123,
      email: 'prediction-perf@example.com',
      name: 'PredictionPerf',
      handle: 'predictionperf',
      favoriteTeam: 'HH',
      role: 'ROLE_USER',
      hasPassword: true,
      profileImageUrl: null,
      cheerPoints: 100,
    },
  }, scenario.authenticated ? 200 : 401));
  await page.route('**/api/auth/reissue*', (route) => fulfillJson(route, {
    success: false,
    message: 'Unauthorized',
  }, 400));
  await page.route('**/api/chat/my/unread-counts*', (route) => fulfillJson(route, {
    success: true,
    data: 0,
  }));
  await page.route('**/api/notifications/my/unread-count*', (route) => fulfillJson(route, 0));
  await page.route('**/api/notifications/my*', (route) => fulfillJson(route, []));
  await page.route('**/api/matches/bounds*', (route) => fulfillJson(route, {
    hasData: true,
    earliestGameDate: scenario.prevDate ?? scenario.date,
    latestGameDate: scenario.nextDate ?? scenario.date,
  }));
  await page.route('**/api/matches/day*', (route) => fulfillJson(route, matchDayResponse(scenario)));
  await page.route('**/api/predictions/bootstrap*', (route) => fulfillJson(route, {
    schedule: matchDayResponse(scenario),
    selectedGameId: scenario.gameId,
    selectedGameFound: Boolean(scenario.gameId && scenario.detail),
    detail: scenario.detail
      ? {
        ok: true,
        data: scenario.detail,
        error: null,
      }
      : null,
    voteStatus: scenario.voteStatus
      ? {
        ok: true,
        data: scenario.voteStatus,
        error: null,
      }
      : null,
  }));
  await page.route('**/api/predictions/my-votes*', (route) => fulfillJson(route, { votes: {} }));
  await page.route('**/api/predictions/my-vote/*', (route) => fulfillJson(route, { message: 'legacy endpoint removed' }, 410));
  await page.route('**/api/predictions/status/*', (route) => fulfillJson(route, scenario.voteStatus ?? {
    gameId: scenario.gameId,
    homeVotes: 0,
    awayVotes: 0,
    totalVotes: 0,
    homePercentage: 0,
    awayPercentage: 0,
  }));
  await page.route('**/api/kbo/rankings/snapshot*', (route) => fulfillJson(route, [
    { teamId: 'HH', teamName: '한화 이글스', rank: 1, wins: 40, losses: 20, draws: 0, winRate: '0.667', games: 60, gamesBehind: 0 },
    { teamId: 'LT', teamName: '롯데 자이언츠', rank: 2, wins: 38, losses: 22, draws: 0, winRate: '0.633', games: 60, gamesBehind: 2 },
  ]));
  await page.route('**/api/prediction/stats/me*', (route) => fulfillJson(route, {
    success: true,
    data: {
      accuracy: 61.5,
      totalPredictions: 13,
      correctPredictions: 8,
      streak: 2,
    },
  }));
  await page.route('**/api/predictions/ranking/init*', (route) => fulfillJson(route, {
    seasonYear: Number((scenario.date || selectedDate).slice(0, 4)),
    saved: null,
  }));
  await page.route('**/api/predictions/ranking/current-season*', (route) => fulfillJson(route, {
    seasonYear: Number((scenario.date || selectedDate).slice(0, 4)),
  }));
  await page.route(/\/api\/predictions\/ranking(?:\?.*)?$/, (route) => fulfillJson(route, {
    message: 'No saved ranking prediction',
  }, 404));
  await page.route(/\/api\/matches\/[^/?]+\/live-relay(?:\?.*)?$/, (route) => {
    if (scenario.livePolicy === 'manual-suppressed') {
      return fulfillJson(route, {
        code: 'MANUAL_BASEBALL_DATA_REQUIRED',
        message: '문자중계 데이터 준비가 필요합니다.',
      }, 409);
    }
    return fulfillJson(route, {
      gameId: scenario.gameId,
      events: [],
      lastRelayId: null,
      lastUpdatedAt: null,
    });
  });
  await page.route(/\/api\/matches\/[^/?]+\/live(?:\?.*)?$/, (route) => fulfillJson(route, {
    gameId: scenario.gameId,
    gameStatus: scenario.detail?.gameStatus ?? scenario.games[0]?.gameStatus ?? 'SCHEDULED',
    homeScore: scenario.detail?.homeScore ?? scenario.games[0]?.homeScore ?? null,
    awayScore: scenario.detail?.awayScore ?? scenario.games[0]?.awayScore ?? null,
    events: [],
    lastEventSeq: null,
    lastUpdatedAt: null,
  }));
  await page.route(/\/api\/matches\/(?!day(?:[/?]|$)|bounds(?:[/?]|$)|range(?:[/?]|$)|live(?:[/?]|$))[^/?]+(?:\?.*)?$/, (route) => fulfillJson(route, scenario.detail ?? {
    message: 'detail not found',
  }, scenario.detail ? 200 : 404));
  await page.route('**/ai/coach/analyze*', (route) => route.fulfill({
    status: 200,
    contentType: 'text/event-stream',
    body: 'event: done\ndata: [DONE]\n\n',
  }));
};

const installMetricsInitScript = async (context, mockDate = null) => {
  await context.addInitScript((mockDate) => {
    if (mockDate) {
      const RealDate = Date;
      const fixedNow = new RealDate(`${mockDate}T12:00:00+09:00`);
      class MockDate extends RealDate {
        constructor(...args) {
          if (args.length === 0) {
            super(fixedNow.getTime());
          } else {
            super(...args);
          }
        }
        static now() {
          return fixedNow.getTime();
        }
      }
      MockDate.UTC = RealDate.UTC;
      MockDate.parse = RealDate.parse;
      // @ts-expect-error Browser Date override for deterministic mock audit.
      Date = MockDate;

      const idleTimers = new Map();
      const idleCallbacks = new Map();
      let nextIdleTimerId = 1;
      const runIdleCallback = (id) => {
        const queued = idleCallbacks.get(id);
        if (!queued) {
          return;
        }
        const timer = idleTimers.get(id);
        if (timer) {
          window.clearTimeout(timer);
          idleTimers.delete(id);
        }
        idleCallbacks.delete(id);
        queued({
          didTimeout: false,
          timeRemaining: () => 50,
        });
      };
      window.requestIdleCallback = (callback) => {
        const id = nextIdleTimerId;
        nextIdleTimerId += 1;
        idleCallbacks.set(id, callback);
        const timer = window.setTimeout(() => runIdleCallback(id), 1000);
        idleTimers.set(id, timer);
        return id;
      };
      window.cancelIdleCallback = (id) => {
        const timer = idleTimers.get(id);
        if (timer) {
          window.clearTimeout(timer);
          idleTimers.delete(id);
        }
        idleCallbacks.delete(id);
      };
      window.__flushPredictionDeferredIdle = () => {
        Array.from(idleCallbacks.keys()).forEach((id) => runIdleCallback(id));
      };
    }

    try {
      window.localStorage.setItem('bega_has_visited', 'true');
      window.localStorage.setItem('bega_dont_show_guide', 'true');
      window.localStorage.removeItem('auth-bootstrap-hint');
      window.localStorage.removeItem('auth-bootstrap-meta');
      window.sessionStorage.setItem('cypress:skip-public-auth-bootstrap', '1');
    } catch (_error) {
      // Ignore storage setup failures in audit mode.
    }
  }, mode === 'mock' ? mockDate : null);
};

const isVisibleSelector = (selector) => {
  const node = document.querySelector(selector);
  if (!node) {
    return false;
  }
  const rect = node.getBoundingClientRect();
  const style = window.getComputedStyle(node);
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
};

const waitForVisibleAny = async (page, selectors, timeout = 8000) => {
  await page.waitForFunction(
    (candidateSelectors) => candidateSelectors.some((selector) => {
      const node = document.querySelector(selector);
      if (!node) {
        const bodyText = document.body?.textContent || '';
        return bodyText.includes('오늘은 예정된 경기가 없습니다.')
          || bodyText.includes('예정된 경기 일정이 없습니다.');
      }
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }),
    selectors,
    { timeout },
  );
};

const waitForVisible = async (page, selector, timeout = 8000) => {
  await page.waitForFunction(isVisibleSelector, selector, { timeout });
};

const createPredictionNetworkTracker = (page, startedAt) => {
  const requestEntries = new Map();
  const entries = [];

  page.on('request', (request) => {
    const endpoint = classifyPredictionApiRequest(request.url());
    if (endpoint === predictionApiEndpointKeys.OTHER) {
      return;
    }
    const entry = {
      endpoint,
      url: request.url(),
      method: request.method(),
      timeMs: Date.now() - startedAt,
      status: null,
      durationMs: null,
      failed: false,
      failure: null,
    };
    requestEntries.set(request, {
      entry,
      startedAt: Date.now(),
    });
    entries.push(entry);
  });

  page.on('response', (response) => {
    const tracked = requestEntries.get(response.request());
    if (!tracked) {
      return;
    }
    tracked.entry.status = response.status();
    tracked.entry.durationMs = Date.now() - tracked.startedAt;
  });

  page.on('requestfailed', (request) => {
    const tracked = requestEntries.get(request);
    if (!tracked) {
      return;
    }
    tracked.entry.failed = true;
    tracked.entry.failure = request.failure()?.errorText ?? 'unknown';
  });

  return {
    entries,
    snapshot: () => entries.map((entry) => ({ ...entry })),
  };
};

const countEndpoint = (entries, endpoint) => entries.filter((entry) => entry.endpoint === endpoint).length;

const countEndpointDelta = (beforeEntries, afterEntries, endpoint) => (
  countEndpoint(afterEntries, endpoint) - countEndpoint(beforeEntries, endpoint)
);

const rankingRequestEndpointKeys = new Set([
  predictionApiEndpointKeys.RANKING_SNAPSHOT,
  predictionApiEndpointKeys.RANKING_PREDICTION,
  predictionApiEndpointKeys.PREDICTION_STATS,
]);

const countRankingRequests = (entries) => entries.filter((entry) => (
  rankingRequestEndpointKeys.has(entry.endpoint)
)).length;

const endpointEntriesAfter = (entries, endpoint, cutoffMs) => entries.filter((entry) => (
  entry.endpoint === endpoint
  && entry.timeMs > cutoffMs
));

const lastEndpointResponseAt = (entries, endpoint) => {
  const responseTimes = entries
    .filter((entry) => entry.endpoint === endpoint)
    .map((entry) => (
      typeof entry.durationMs === 'number'
        ? entry.timeMs + entry.durationMs
        : entry.timeMs
    ))
    .filter((value) => typeof value === 'number' && Number.isFinite(value));
  return responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
};

const renderMetricAfterData = (elapsedMs, dataReadyAtMs) => (
  mode === 'mock'
    ? roundMetric(Math.max(0, elapsedMs - dataReadyAtMs))
    : roundMetric(elapsedMs)
);

const countDeferredBefore = (entries, cutoffMs) => entries.filter((entry) => (
  entry.timeMs <= cutoffMs
  && [
    predictionApiEndpointKeys.RANKING_SNAPSHOT,
    predictionApiEndpointKeys.LIVE,
    predictionApiEndpointKeys.LIVE_RELAY,
  ].includes(entry.endpoint)
)).length;

const flushPredictionIdle = async (page, times = 2) => {
  for (let index = 0; index < times; index += 1) {
    await page.evaluate(() => {
      window.__flushPredictionDeferredIdle?.();
    }).catch(() => undefined);
    await sleep(700);
  }
};

const runBrowserIteration = async ({ context, baseUrl, scenario, index, prewarm, artifactDir = null }) => {
  const entry = {
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    scenarioKind: scenario.kind,
    index,
    prewarm,
    status: 'unknown',
    reason: null,
    previewMs: null,
    bootstrapReadyMs: null,
    detailRootVisibleMs: null,
    detailMs: null,
    voteButtonMs: null,
    reentryMs: null,
    deepLinkBootstrapRequests: 0,
    deepLinkMatchesDayRequests: 0,
    deepLinkGameDetailRequests: 0,
    deepLinkVoteStatusRequests: 0,
    preDetailDeferredRequests: 0,
    postIdleLiveRequests: 0,
    postIdleLiveRelayRequests: 0,
    postIdleLiveStatuses: [],
    postIdleLiveRelayStatuses: [],
    afterFocusLiveRequests: 0,
    afterFocusLiveRelayRequests: 0,
    afterFocusLiveStatuses: [],
    afterFocusLiveRelayStatuses: [],
    rankingRequestsBeforeTabEntry: 0,
    rankingRequestsAfterTabEntry: 0,
    rankingChunkLoadsAfterTabEntry: 0,
    rankingTabEntryMs: null,
    failedRequests: [],
    screenshotPath: null,
    screenshotArtifactPath: null,
  };
  const screenshotPath = artifactDir ? path.join(artifactDir, 'screenshot.png') : null;
  let screenshotCaptured = false;
  const captureDiagnosticScreenshot = async (page) => {
    if (!screenshotPath || screenshotCaptured) {
      return;
    }
    await ensureDir(artifactDir);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshotCaptured = true;
    entry.screenshotPath = screenshotPath;
    entry.screenshotArtifactPath = artifactPath(screenshotPath);
  };

  const previewPage = await context.newPage();
  try {
    if (mode === 'mock') {
      await installMockRoutes(previewPage, scenario);
    }
    const previewStartedAt = Date.now();
    const previewTracker = createPredictionNetworkTracker(previewPage, previewStartedAt);
    const previewUrl = new URL('/prediction', baseUrl);
    previewUrl.searchParams.set('date', scenario.date);
    await previewPage.goto(previewUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForVisibleAny(previewPage, [
      '[data-testid="prediction-match-preview-root"]',
      '[data-testid="prediction-schedule-match-row"]',
      '[data-testid="prediction-date-game-item"]',
      '[data-testid="prediction-empty-nearest-date-btn"]',
    ]);
    const previewVisibleAtMs = Date.now() - previewStartedAt;
    const previewEntries = previewTracker.snapshot();
    entry.previewMs = renderMetricAfterData(
      previewVisibleAtMs,
      lastEndpointResponseAt(previewEntries, predictionApiEndpointKeys.MATCHES_DAY),
    );
    if (scenario.kind === 'ranking-tab') {
      const rankingChunkCount = async () => previewPage.evaluate(() => (
        performance.getEntriesByType('resource')
          .filter((entry) => (
            entry.name.includes('PredictionRankingTab')
            || entry.name.includes('RankingPrediction')
            || entry.name.includes('PredictionStatsPanel')
          ))
          .length
      ));
      const rankingChunksBeforeTab = await rankingChunkCount();
      entry.rankingRequestsBeforeTabEntry = countRankingRequests(previewEntries);

      const rankingStartedAt = Date.now();
      await previewPage.getByTestId('prediction-tab-ranking').click({ timeout: 8000 });
      await previewPage.waitForFunction(() => {
        const bodyText = document.body?.textContent || '';
        return bodyText.includes('나만의 드림팀 순위를 완성하고 친구들과 공유해보세요!')
          || Boolean(document.querySelector('[data-testid="ranking-root"]'));
      }, null, { timeout: 10000 });
      entry.rankingTabEntryMs = roundMetric(Date.now() - rankingStartedAt);
      await previewPage.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
      await sleep(150);

      const rankingChunksAfterTab = await rankingChunkCount();
      const rankingEntriesAfterTab = previewTracker.snapshot();
      entry.rankingChunkLoadsAfterTabEntry = Math.max(0, rankingChunksAfterTab - rankingChunksBeforeTab);
      entry.rankingRequestsAfterTabEntry = Math.max(
        0,
        countRankingRequests(rankingEntriesAfterTab) - entry.rankingRequestsBeforeTabEntry,
      );
    }
    if (!scenario.requiresDetail || !scenario.gameId) {
      await captureDiagnosticScreenshot(previewPage).catch(() => undefined);
    }
  } catch (error) {
    entry.status = 'failed';
    const bodyText = await previewPage.textContent('body').catch(() => '');
    const bodyExcerpt = bodyText ? bodyText.replace(/\s+/g, ' ').trim().slice(0, 240) : '';
    entry.reason = `PREVIEW_RENDER_FAILED:${error instanceof Error ? error.message : String(error)}${bodyExcerpt ? ` BODY:${bodyExcerpt}` : ''}`;
    await captureDiagnosticScreenshot(previewPage).catch(() => undefined);
  } finally {
    await previewPage.close().catch(() => undefined);
  }

  if (!scenario.requiresDetail || !scenario.gameId) {
    if (entry.status !== 'failed') {
      entry.status = 'passed';
    }
    return entry;
  }

  const detailPage = await context.newPage();
  try {
    if (mode === 'mock') {
      await installMockRoutes(detailPage, scenario);
    }
    const detailUrl = new URL('/prediction', baseUrl);
    detailUrl.searchParams.set('date', scenario.date);
    detailUrl.searchParams.set('gameId', scenario.gameId);
    const detailStartedAt = Date.now();
    const tracker = createPredictionNetworkTracker(detailPage, detailStartedAt);
    await detailPage.goto(detailUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForVisible(detailPage, '[data-testid="prediction-match-detail-root"]');
    const detailRootNetworkMs = Date.now() - detailStartedAt;
    let voteButtonNetworkMs = null;
    await waitForVisible(detailPage, '[data-testid="vote-home-btn"]', 1500)
      .then(() => {
        voteButtonNetworkMs = Date.now() - detailStartedAt;
      })
      .catch(() => undefined);

    await sleep(150);
    const initialDeepLinkEntries = tracker.snapshot();
    const bootstrapReadyAtMs = lastEndpointResponseAt(initialDeepLinkEntries, predictionApiEndpointKeys.BOOTSTRAP);
    entry.bootstrapReadyMs = roundMetric(bootstrapReadyAtMs);
    entry.detailRootVisibleMs = roundMetric(detailRootNetworkMs);
    entry.voteButtonMs = voteButtonNetworkMs === null ? null : renderMetricAfterData(voteButtonNetworkMs, bootstrapReadyAtMs);
    entry.detailMs = renderMetricAfterData(detailRootNetworkMs, bootstrapReadyAtMs);
    entry.deepLinkBootstrapRequests = countEndpoint(initialDeepLinkEntries, predictionApiEndpointKeys.BOOTSTRAP);
    entry.deepLinkMatchesDayRequests = countEndpoint(initialDeepLinkEntries, predictionApiEndpointKeys.MATCHES_DAY);
    entry.deepLinkGameDetailRequests = countEndpoint(initialDeepLinkEntries, predictionApiEndpointKeys.GAME_DETAIL);
    entry.deepLinkVoteStatusRequests = countEndpoint(initialDeepLinkEntries, predictionApiEndpointKeys.VOTE_STATUS);
    entry.preDetailDeferredRequests = countDeferredBefore(initialDeepLinkEntries, detailRootNetworkMs);
    entry.failedRequests = initialDeepLinkEntries.filter((request) => request.failed || (request.status && request.status >= 500));

    if (scenario.livePolicy) {
      await flushPredictionIdle(detailPage, 2);
      await detailPage.evaluate(() => {
        window.dispatchEvent(new Event('focus'));
      });
      await flushPredictionIdle(detailPage, 2);
      const afterIdleEntries = tracker.snapshot();
      entry.postIdleLiveRequests = endpointEntriesAfter(afterIdleEntries, predictionApiEndpointKeys.LIVE, detailRootNetworkMs).length;
      entry.postIdleLiveRelayRequests = endpointEntriesAfter(afterIdleEntries, predictionApiEndpointKeys.LIVE_RELAY, detailRootNetworkMs).length;
      entry.postIdleLiveStatuses = endpointEntriesAfter(afterIdleEntries, predictionApiEndpointKeys.LIVE, detailRootNetworkMs)
        .map((request) => request.status);
      entry.postIdleLiveRelayStatuses = endpointEntriesAfter(afterIdleEntries, predictionApiEndpointKeys.LIVE_RELAY, detailRootNetworkMs)
        .map((request) => request.status);

      if (scenario.livePolicy === 'manual-suppressed') {
        await sleep(1200);
        const beforeFocusEntries = tracker.snapshot();
        await detailPage.evaluate(() => {
          window.dispatchEvent(new Event('focus'));
        });
        await sleep(700);
        const afterFocusEntries = tracker.snapshot();
        entry.afterFocusLiveRequests = countEndpointDelta(beforeFocusEntries, afterFocusEntries, predictionApiEndpointKeys.LIVE);
        entry.afterFocusLiveRelayRequests = countEndpointDelta(beforeFocusEntries, afterFocusEntries, predictionApiEndpointKeys.LIVE_RELAY);
        entry.afterFocusLiveStatuses = afterFocusEntries
          .slice(beforeFocusEntries.length)
          .filter((request) => request.endpoint === predictionApiEndpointKeys.LIVE)
          .map((request) => request.status);
        entry.afterFocusLiveRelayStatuses = afterFocusEntries
          .slice(beforeFocusEntries.length)
          .filter((request) => request.endpoint === predictionApiEndpointKeys.LIVE_RELAY)
          .map((request) => request.status);
      }
    }

    const previewUrl = new URL('/prediction', baseUrl);
    previewUrl.searchParams.set('date', scenario.date);
    await detailPage.evaluate((url) => {
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, previewUrl.toString());
    await waitForVisibleAny(detailPage, [
      '[data-testid="prediction-match-preview-root"]',
      '[data-testid="prediction-schedule-match-row"]',
      '[data-testid="prediction-date-game-item"]',
      '[data-testid="prediction-empty-nearest-date-btn"]',
    ]);

    const reentryStartedAt = Date.now();
    await detailPage.evaluate((url) => {
      window.__predictionPerfReentryStart = performance.now();
      window.__predictionPerfReentryAt = null;
      let observer = null;
      const isDetailVisible = () => {
        const node = document.querySelector('[data-testid="prediction-match-detail-root"]');
        if (!node) {
          return false;
        }
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      };
      const recordDetailVisible = () => {
        if (window.__predictionPerfReentryAt !== null) {
          return;
        }
        if (isDetailVisible()) {
          window.__predictionPerfReentryAt = performance.now();
          observer?.disconnect();
        }
      };
      observer = new MutationObserver(recordDetailVisible);
      observer.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
      });
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
      requestAnimationFrame(recordDetailVisible);
      setTimeout(recordDetailVisible, 0);
    }, detailUrl.toString());
    await detailPage.waitForFunction(
      () => window.__predictionPerfReentryAt !== null,
      null,
      { timeout: 8000 },
    );
    entry.reentryMs = await detailPage.evaluate(() => {
      const startedAt = window.__predictionPerfReentryStart;
      const visibleAt = window.__predictionPerfReentryAt;
      return typeof startedAt === 'number' && typeof visibleAt === 'number'
        ? visibleAt - startedAt
        : null;
    }).then(roundMetric);
    if (entry.reentryMs === null) {
      entry.reentryMs = Date.now() - reentryStartedAt;
    }

    if (entry.status !== 'failed') {
      entry.status = 'passed';
    }
  } catch (error) {
    entry.status = 'failed';
    entry.reason = `DETAIL_RENDER_FAILED:${error instanceof Error ? error.message : String(error)}`;
  } finally {
    await captureDiagnosticScreenshot(detailPage).catch(() => undefined);
    await detailPage.close().catch(() => undefined);
  }

  if (entry.status !== 'failed' && scenario.expectsVoteButton && entry.voteButtonMs === null) {
    entry.status = 'failed';
    entry.reason = 'VOTE_BUTTON_NOT_VISIBLE';
  }

  return entry;
};

const minMeasured = (values) => {
  const measured = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  return measured.length > 0 ? Math.min(...measured) : 0;
};

const resolveScenarioContractStatus = (summary) => {
  if ((summary.failedEntryCount ?? 0) > 0) {
    return 'failed';
  }
  if (summary.requiresDetail !== false) {
    if (summary.expectsVoteButton !== false && (summary.missingVoteButtonCount ?? 0) > 0) {
      return 'failed';
    }
    if ((summary.maxDeepLinkBootstrapRequests ?? 0) !== 1) {
      return 'failed';
    }
    if (
      (summary.maxDeepLinkMatchesDayRequests ?? 0) !== 0
      || (summary.maxDeepLinkGameDetailRequests ?? 0) !== 0
      || (summary.maxDeepLinkVoteStatusRequests ?? 0) !== 0
      || (summary.maxPreDetailDeferredRequests ?? 0) !== 0
    ) {
      return 'failed';
    }
  }
  if (
    summary.livePolicy === 'none-after-idle'
    && ((summary.maxPostIdleLiveRequests ?? 0) !== 0 || (summary.maxPostIdleLiveRelayRequests ?? 0) !== 0)
  ) {
    return 'failed';
  }
  if (
    summary.livePolicy === 'requires-after-idle'
    && ((summary.minPostIdleLiveRequests ?? 0) < 1 || (summary.minPostIdleLiveRelayRequests ?? 0) < 1)
  ) {
    return 'failed';
  }
  if (
    summary.livePolicy === 'manual-suppressed'
    && (
      (summary.minPostIdleLiveRequests ?? 0) < 1
      || (summary.minPostIdleLiveRelayRequests ?? 0) < 1
      || (summary.maxPostIdleLiveRequests ?? 0) > 1
      || (summary.maxPostIdleLiveRelayRequests ?? 0) > 1
      || (summary.maxAfterFocusLiveRequests ?? 0) !== 0
      || (summary.maxAfterFocusLiveRelayRequests ?? 0) !== 0
    )
  ) {
    return 'failed';
  }
  if (summary.id === 'ranking-tab') {
    if (
      (summary.maxRankingRequestsBeforeTabEntry ?? 0) > 0
      || (summary.minRankingChunkLoadsAfterTabEntry ?? 0) < 1
    ) {
      return 'failed';
    }
  }
  return 'passed';
};

const summarizeBrowserEntries = (entries, scenario = null, options = {}) => {
  const measuredEntries = entries.filter((entry) => !entry.prewarm);
  const prewarmEntries = entries.filter((entry) => entry.prewarm);
  const summary = {
    id: scenario?.id,
    label: scenario?.label,
    kind: scenario?.kind,
    date: scenario?.date,
    gameId: scenario?.gameId ?? null,
    requiresDetail: scenario?.requiresDetail !== false,
    expectsVoteButton: scenario?.expectsVoteButton !== false,
    enforcePreviewBudget: scenario?.enforcePreviewBudget !== false,
    enforceDetailBudget: scenario?.enforceDetailBudget !== false,
    enforceReentryBudget: scenario?.enforceReentryBudget !== false,
    livePolicy: scenario?.livePolicy ?? null,
    durationMs: roundMetric(options.durationMs),
    entryCount: entries.length,
    measuredEntryCount: measuredEntries.length,
    prewarmEntryCount: prewarmEntries.length,
    previewP95Ms: roundMetric(percentile(measuredEntries.map((entry) => entry.previewMs), 0.95)),
    bootstrapReadyP95Ms: roundMetric(percentile(measuredEntries.map((entry) => entry.bootstrapReadyMs), 0.95)),
    detailRootVisibleP95Ms: roundMetric(percentile(measuredEntries.map((entry) => entry.detailRootVisibleMs), 0.95)),
    detailP95Ms: roundMetric(percentile(measuredEntries.map((entry) => entry.detailMs), 0.95)),
    voteButtonP95Ms: roundMetric(percentile(measuredEntries.map((entry) => entry.voteButtonMs), 0.95)),
    reentryP95Ms: roundMetric(percentile(measuredEntries.map((entry) => entry.reentryMs), 0.95)),
    maxDeepLinkBootstrapRequests: Math.max(...measuredEntries.map((entry) => entry.deepLinkBootstrapRequests), 0),
    maxDeepLinkMatchesDayRequests: Math.max(...measuredEntries.map((entry) => entry.deepLinkMatchesDayRequests), 0),
    maxDeepLinkGameDetailRequests: Math.max(...measuredEntries.map((entry) => entry.deepLinkGameDetailRequests), 0),
    maxDeepLinkVoteStatusRequests: Math.max(...measuredEntries.map((entry) => entry.deepLinkVoteStatusRequests), 0),
    maxPreDetailDeferredRequests: Math.max(...measuredEntries.map((entry) => entry.preDetailDeferredRequests), 0),
    maxPostIdleLiveRequests: Math.max(...measuredEntries.map((entry) => entry.postIdleLiveRequests), 0),
    maxPostIdleLiveRelayRequests: Math.max(...measuredEntries.map((entry) => entry.postIdleLiveRelayRequests), 0),
    minPostIdleLiveRequests: minMeasured(measuredEntries.map((entry) => entry.postIdleLiveRequests)),
    minPostIdleLiveRelayRequests: minMeasured(measuredEntries.map((entry) => entry.postIdleLiveRelayRequests)),
    maxAfterFocusLiveRequests: Math.max(...measuredEntries.map((entry) => entry.afterFocusLiveRequests), 0),
    maxAfterFocusLiveRelayRequests: Math.max(...measuredEntries.map((entry) => entry.afterFocusLiveRelayRequests), 0),
    maxRankingRequestsBeforeTabEntry: Math.max(...measuredEntries.map((entry) => entry.rankingRequestsBeforeTabEntry), 0),
    maxRankingRequestsAfterTabEntry: Math.max(...measuredEntries.map((entry) => entry.rankingRequestsAfterTabEntry), 0),
    minRankingChunkLoadsAfterTabEntry: minMeasured(measuredEntries.map((entry) => entry.rankingChunkLoadsAfterTabEntry)),
    rankingTabEntryP95Ms: roundMetric(percentile(measuredEntries.map((entry) => entry.rankingTabEntryMs), 0.95)),
    failedEntryCount: measuredEntries.filter((entry) => entry.status === 'failed').length,
    missingVoteButtonCount: measuredEntries.filter((entry) => entry.voteButtonMs === null).length,
    contractStatus: 'pending',
  };
  return {
    ...summary,
    contractStatus: resolveScenarioContractStatus(summary),
  };
};

const runBrowserAudit = async ({ baseUrl }) => {
  const { chromium } = await loadPlaywright();
  const browser = await launchChromium(chromium);
  const entries = [];
  const scenarioSummary = [];
  const scenarios = mode === 'mock'
    ? selectedMockScenarios
    : [{
      id: 'real-baseline',
      label: 'Real baseline',
      kind: 'detail',
      date: selectedDate,
      gameId: selectedGameId,
      mockToday: null,
      requiresDetail: true,
      expectsVoteButton: mode === 'mock',
      livePolicy: null,
    }];

  try {
    for (const scenario of scenarios) {
      const scenarioStartedAt = performance.now();
      const scenarioEntries = [];
      const context = await browser.newContext({
        viewport: viewport.viewport,
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
        deviceScaleFactor: viewport.deviceScaleFactor,
      });
      await installMetricsInitScript(context, scenario.mockToday ?? scenario.date ?? selectedDate);

      const prewarmEntry = await runBrowserIteration({
        context,
        baseUrl,
        scenario,
        index: 0,
        prewarm: true,
      });
      entries.push(prewarmEntry);
      scenarioEntries.push(prewarmEntry);

      for (let index = 1; index <= iterationCount; index += 1) {
        const entry = await runBrowserIteration({
          context,
          baseUrl,
          scenario,
          index,
          prewarm: false,
        });
        entries.push(entry);
        scenarioEntries.push(entry);
      }

      await context.close().catch(() => undefined);
      scenarioSummary.push(summarizeBrowserEntries(
        scenarioEntries,
        scenario,
        {
          durationMs: performance.now() - scenarioStartedAt,
        },
      ));
    }
  } finally {
    await browser.close().catch(() => undefined);
  }

  const defaultSummary = scenarioSummary.find((summary) => summary.id === 'scheduled-game')
    ?? scenarioSummary[0]
    ?? summarizeBrowserEntries(entries);

  return {
    viewport,
    summary: defaultSummary,
    scenarioSummary,
    entries,
  };
};

const createEmptyFailureArtifacts = () => ({
  enabled: mode === 'mock' && captureFailureArtifacts,
  rootPath: failureArtifactsRoot,
  rootArtifactPath: artifactPath(failureArtifactsRoot),
  manifestPath: null,
  manifestArtifactPath: null,
  items: [],
});

const capturePredictionFailureArtifacts = async ({ baseUrl, scenarioIds }) => {
  const manifest = createEmptyFailureArtifacts();
  if (mode !== 'mock' || !captureFailureArtifacts || scenarioIds.length === 0) {
    return manifest;
  }

  await ensureDir(failureArtifactsRoot);
  const { chromium } = await loadPlaywright();
  const browser = await launchChromium(chromium);

  try {
    for (const scenarioId of scenarioIds) {
      const scenario = selectedMockScenarios.find((candidate) => candidate.id === scenarioId);
      const scenarioDir = path.join(failureArtifactsRoot, scenarioId);
      await ensureDir(scenarioDir);

      const tracePath = path.join(scenarioDir, 'trace.zip');
      const iterationPath = path.join(scenarioDir, 'iteration.json');
      const item = {
        scenarioId,
        scenarioLabel: scenario?.label ?? null,
        status: 'pending',
        tracePath,
        traceArtifactPath: artifactPath(tracePath),
        iterationPath,
        iterationArtifactPath: artifactPath(iterationPath),
        screenshotPath: null,
        screenshotArtifactPath: null,
        iterationStatus: null,
        iterationReason: null,
        error: null,
      };

      if (!scenario) {
        item.status = 'missing-scenario';
        item.error = `Scenario was not selected or configured: ${scenarioId}`;
        manifest.items.push(item);
        continue;
      }

      let context = null;
      let traceStarted = false;
      try {
        context = await browser.newContext({
          viewport: viewport.viewport,
          isMobile: viewport.isMobile,
          hasTouch: viewport.hasTouch,
          deviceScaleFactor: viewport.deviceScaleFactor,
        });
        await installMetricsInitScript(context, scenario.mockToday ?? scenario.date ?? selectedDate);
        await context.tracing.start({
          screenshots: true,
          snapshots: true,
          sources: true,
        });
        traceStarted = true;

        const entry = await runBrowserIteration({
          context,
          baseUrl,
          scenario,
          index: 1,
          prewarm: false,
          artifactDir: scenarioDir,
        });

        item.iterationStatus = entry.status;
        item.iterationReason = entry.reason;
        item.screenshotPath = entry.screenshotPath;
        item.screenshotArtifactPath = entry.screenshotArtifactPath;
        item.status = 'captured';
        await fs.writeFile(iterationPath, `${JSON.stringify(entry, null, 2)}\n`, 'utf8');
      } catch (error) {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : String(error);
      } finally {
        if (context) {
          if (traceStarted) {
            await context.tracing.stop({ path: tracePath }).catch((error) => {
              item.traceError = error instanceof Error ? error.message : String(error);
            });
          }
          await context.close().catch(() => undefined);
        }
      }

      manifest.items.push(item);
    }
  } finally {
    await browser.close().catch(() => undefined);
  }

  const manifestPath = path.join(failureArtifactsRoot, 'manifest.json');
  manifest.manifestPath = manifestPath;
  manifest.manifestArtifactPath = artifactPath(manifestPath);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
};

const withRuntimeFields = (report, startedAt) => ({
  ...report,
  ...evaluatePredictionRuntimeBudget({
    totalDurationMs: performance.now() - startedAt,
    runtimeBudgetMs,
  }),
});

const run = async () => {
  const runStartedAt = performance.now();
  await ensureDir(outputRoot);
  await removeDir(failureArtifactsRoot);
  let backendProcess = null;
  let backendReachable = mode === 'real' ? true : null;
  let backendCheck = {
    reachable: mode === 'real' ? true : null,
    endpoint: null,
    result: null,
  };
  let devServerProcess = null;
  let baseUrl = auditBaseUrl;
  let serverMode = auditBaseUrl ? 'attached' : null;

  try {
    if (mode === 'real' && startBackend) {
      backendProcess = startBackendProcess();
      await sleep(5000);
    }

    backendCheck = await checkBackendReachable();
    backendReachable = backendCheck.reachable;
    if (mode === 'real' && !backendReachable) {
      const report = {
        generatedAt: new Date().toISOString(),
        mode,
        selectedDate,
        selectedGameId,
        status: 'needs-backend',
        baseUrl: baseUrl || null,
        serverMode: serverMode || 'not-started',
        iterations: iterationCount,
        budgets,
        apiBaseUrl,
        backendReachable,
        backendCheck,
        strictCold,
        guidance: buildGuidance({ status: 'needs-backend', backendCheck }),
        api: {
          endpoints: {},
          attemptedEndpoints: realEndpointDefinitions(),
        },
        scenarios: [],
        scenarioSummary: [],
        scenarioFailures: [],
        defaultScenario: null,
        scenarioTier: scenarioSelection.scenarioTier,
        scenarioSelectionSource: scenarioSelection.scenarioSelectionSource,
        selectedScenarioIds: scenarioSelection.selectedScenarioIds,
        skippedScenarioIds: scenarioSelection.skippedScenarioIds,
        failureArtifacts: createEmptyFailureArtifacts(),
        browser: { summary: {}, entries: [] },
        failures: ['BACKEND_UNREACHABLE'],
      };
      await writeReport(withRuntimeFields(report, runStartedAt));
      process.exitCode = 1;
      return;
    }

    const api = await measureRealApiTimings();
    const apiPreflightEvaluation = mode === 'real'
      ? evaluatePredictionPerformanceReport({
        mode,
        browserSummary: {},
        scenarioSummary: [],
        apiSummary: api,
        budgets,
        strictCold,
        backendReachable,
        needsDate: false,
      })
      : null;

    if (apiPreflightEvaluation?.status === 'manual-data-required') {
      const report = {
        generatedAt: new Date().toISOString(),
        mode,
        selectedDate,
        selectedGameId,
        status: apiPreflightEvaluation.status,
        baseUrl: baseUrl || null,
        serverMode: serverMode || 'not-started',
        iterations: iterationCount,
        budgets,
        apiBaseUrl,
        backendReachable,
        backendCheck,
        strictCold,
        guidance: buildGuidance({ status: apiPreflightEvaluation.status, backendCheck }),
        scenarios: [],
        scenarioSummary: [],
        scenarioFailures: apiPreflightEvaluation.scenarioFailures ?? [],
        defaultScenario: null,
        scenarioTier: scenarioSelection.scenarioTier,
        scenarioSelectionSource: scenarioSelection.scenarioSelectionSource,
        selectedScenarioIds: scenarioSelection.selectedScenarioIds,
        skippedScenarioIds: scenarioSelection.skippedScenarioIds,
        failureArtifacts: createEmptyFailureArtifacts(),
        api,
        browser: { summary: {}, entries: [] },
        failures: apiPreflightEvaluation.failures,
      };
      await writeReport(withRuntimeFields(report, runStartedAt));
      process.exitCode = 1;
      return;
    }

    const resolvedBaseUrl = await resolveBaseUrl();
    baseUrl = resolvedBaseUrl.baseUrl;
    serverMode = resolvedBaseUrl.serverMode;
    devServerProcess = resolvedBaseUrl.devServerProcess;

    const browser = await runBrowserAudit({ baseUrl });
    const evaluation = evaluatePredictionPerformanceReport({
      mode,
      browserSummary: browser.summary,
      scenarioSummary: browser.scenarioSummary,
      apiSummary: api,
      budgets,
      strictCold,
      backendReachable,
      needsDate: false,
    });
    const failedScenarioIds = extractPredictionFailedScenarioIds(evaluation.scenarioFailures ?? []);
    const failureArtifacts = await capturePredictionFailureArtifacts({
      baseUrl,
      scenarioIds: evaluation.status === 'failed' ? failedScenarioIds : [],
    });
    const report = {
      generatedAt: new Date().toISOString(),
      mode,
      selectedDate,
      selectedGameId,
      status: evaluation.status,
      baseUrl,
      serverMode,
      iterations: iterationCount,
      budgets,
      apiBaseUrl,
      backendReachable,
      backendCheck,
      strictCold,
      guidance: buildGuidance({ status: evaluation.status, backendCheck }),
      scenarios: mode === 'mock'
        ? selectedMockScenarios.map((scenario) => ({
          id: scenario.id,
          label: scenario.label,
          kind: scenario.kind,
          date: scenario.date,
          gameId: scenario.gameId,
          livePolicy: scenario.livePolicy,
        }))
        : [],
      scenarioSummary: mode === 'mock' ? browser.scenarioSummary : [],
      scenarioFailures: evaluation.scenarioFailures ?? [],
      defaultScenario: mode === 'mock' ? browser.summary?.id ?? null : null,
      scenarioTier: scenarioSelection.scenarioTier,
      scenarioSelectionSource: scenarioSelection.scenarioSelectionSource,
      selectedScenarioIds: scenarioSelection.selectedScenarioIds,
      skippedScenarioIds: scenarioSelection.skippedScenarioIds,
      failureArtifacts,
      api,
      browser,
      failures: evaluation.failures,
    };

    await writeReport(withRuntimeFields(report, runStartedAt));
    if (evaluation.status !== 'passed') {
      process.exitCode = 1;
    }
  } finally {
    await stopProcessGroup(devServerProcess, 'Local frontend dev server');
    await stopProcessGroup(backendProcess, 'Backend bootRun');
  }
};

const writeReport = async (report) => {
  const jsonPath = path.join(outputRoot, 'prediction-performance-summary.json');
  const markdownPath = path.join(outputRoot, 'prediction-performance-summary.md');
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, buildPredictionPerformanceMarkdown(report), 'utf8');
  console.log(`[prediction-performance] status=${report.status} mode=${report.mode} date=${report.selectedDate} gameId=${report.selectedGameId}`);
  console.log(`[prediction-performance] report=${markdownPath}`);
};

run().catch((error) => {
  console.error('[prediction-performance] failed', error);
  process.exitCode = 1;
});
