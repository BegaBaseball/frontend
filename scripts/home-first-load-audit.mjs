#!/usr/bin/env node
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');

const mode = process.env.HOME_FIRST_LOAD_MODE || 'mock';
const selectedDate = process.env.HOME_FIRST_LOAD_DATE || formatLocalDate(new Date());
const iterationCount = parsePositiveInt(process.env.HOME_FIRST_LOAD_ITERATIONS, 5);
const p95BudgetMs = parsePositiveInt(process.env.HOME_FIRST_LOAD_P95_BUDGET_MS, 1500);
const bootstrapP95BudgetMs = parsePositiveInt(process.env.HOME_FIRST_LOAD_BOOTSTRAP_P95_BUDGET_MS, 1000);
const apiBaseUrl = process.env.HOME_FIRST_LOAD_API_BASE_URL || 'http://localhost:8080/api';
const outputRoot = process.env.HOME_FIRST_LOAD_OUTPUT_ROOT
  ? path.resolve(process.env.HOME_FIRST_LOAD_OUTPUT_ROOT)
  : path.join(repoRoot, 'output', 'playwright', 'home-first-load');
const auditBaseUrl = process.env.AUDIT_BASE_URL || '';

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

if (!['mock', 'real'].includes(mode)) {
  throw new Error(`HOME_FIRST_LOAD_MODE must be mock or real. Actual: ${mode}`);
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parsePositiveInt(rawValue, fallback) {
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

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

const fetchWithTimeout = async (url, timeoutMs = 1500) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual',
    });
    return {
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
};

const waitForReachableBaseUrl = async (url, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await fetchWithTimeout(url);
    if (result.ok || result.status === 404) {
      return true;
    }
    await sleep(250);
  }

  return false;
};

const withTimeout = async (promise, timeoutMs, errorMessage) => {
  let timerId;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timerId = setTimeout(() => {
          reject(new Error(errorMessage));
        }, timeoutMs);
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

const localDevServerUrlPattern = /Local:\s+(http:\/\/127\.0\.0\.1:\d+)/;

const apiProxyTarget = () => {
  const parsed = new URL(apiBaseUrl);
  return `${parsed.protocol}//${parsed.host}`;
};

const checkRealBackend = async () => {
  if (mode !== 'real') {
    return;
  }

  const endpoint = new URL('home/bootstrap', apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`);
  endpoint.searchParams.set('date', selectedDate);
  const result = await fetchWithTimeout(endpoint.toString(), 5000);
  if (!result.status || result.status >= 500) {
    throw new Error(
      `Real mode requires a running backend at ${apiBaseUrl}. `
      + `Preflight ${endpoint} returned ${result.status ?? result.error ?? 'unreachable'}.`,
    );
  }
};

const startLocalDevServer = (port) => {
  const localSiteUrl = `http://127.0.0.1:${port}`;
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', `${port}`, '--strictPort'], {
    cwd: frontendRoot,
    env: {
      ...process.env,
      VITE_SITE_URL: process.env.VITE_SITE_URL || localSiteUrl,
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '/api',
      VITE_PROXY_TARGET: process.env.VITE_PROXY_TARGET || apiProxyTarget(),
      VITE_SUPPRESS_CYPRESS_PROXY_ERRORS: 'true',
    },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let logBuffer = '';
  let didResolveLocalUrl = false;
  let resolveLocalUrl;
  let rejectLocalUrl;
  const localUrlPromise = new Promise((resolve, reject) => {
    resolveLocalUrl = resolve;
    rejectLocalUrl = reject;
  });

  const handleOutput = (text, writer) => {
    writer(text);
    logBuffer = `${logBuffer}${text}`.slice(-4000);
    if (didResolveLocalUrl) {
      return;
    }

    const match = logBuffer.match(localDevServerUrlPattern);
    if (match) {
      didResolveLocalUrl = true;
      resolveLocalUrl(match[1]);
    }
  };

  child.stdout.on('data', (chunk) => {
    handleOutput(chunk.toString(), (text) => {
      process.stdout.write(`[vite] ${text}`);
    });
  });

  child.stderr.on('data', (chunk) => {
    handleOutput(chunk.toString(), (text) => {
      process.stderr.write(`[vite] ${text}`);
    });
  });

  child.once('error', (error) => {
    if (!didResolveLocalUrl) {
      rejectLocalUrl(error);
    }
  });

  child.once('close', (code) => {
    if (!didResolveLocalUrl) {
      rejectLocalUrl(new Error(`Local frontend dev server exited before reporting its URL (code ${code ?? 'unknown'}).`));
    }
  });

  return {
    child,
    localUrlPromise,
  };
};

const stopLocalDevServer = async (child) => {
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
  }), 8000, 'Local frontend dev server did not stop within 8 seconds.').catch(() => undefined);
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
  const {
    child: devServerProcess,
    localUrlPromise,
  } = startLocalDevServer(port);

  let startedBaseUrl;
  try {
    startedBaseUrl = await withTimeout(
      localUrlPromise,
      90000,
      'Local frontend dev server did not become ready within 90 seconds.',
    );
  } catch (error) {
    await stopLocalDevServer(devServerProcess);
    throw error;
  }

  if (!await waitForReachableBaseUrl(new URL('/home', startedBaseUrl).toString(), 30000)) {
    await stopLocalDevServer(devServerProcess);
    throw new Error(`Local frontend dev server reported ${startedBaseUrl} but did not accept /home connections.`);
  }

  return {
    baseUrl: startedBaseUrl,
    serverMode: `started:${port}`,
    devServerProcess,
  };
};

const jsonResponse = (body) => JSON.stringify(body);

const buildMockGame = (date) => ({
  gameId: `home-first-load-${date}`,
  time: '18:30',
  stadium: '잠실야구장',
  gameStatus: 'SCHEDULED',
  gameStatusKr: '경기 예정',
  gameInfo: '홈 첫 로딩 성능 검증 경기',
  leagueType: 'REGULAR',
  homeTeam: 'LG',
  homeTeamFull: 'LG 트윈스',
  awayTeam: 'HH',
  awayTeamFull: '한화 이글스',
  gameDate: date,
  sourceDate: date,
});

const buildMockBootstrapResponse = (date) => ({
  selectedDate: date,
  leagueStartDates: {
    regularSeasonStart: '2026-03-22',
    postseasonStart: '2026-10-06',
    koreanSeriesStart: '2026-10-26',
  },
  navigation: {
    hasPrev: true,
    hasNext: true,
    prevGameDate: '2026-06-05',
    nextGameDate: '2026-06-07',
  },
  games: [buildMockGame(date)],
  scheduledGamesWindow: [
    {
      ...buildMockGame(date),
      gameId: `home-first-load-scheduled-${date}`,
      sourceDate: date,
    },
  ],
});

const buildMockWidgetsResponse = () => ({
  hotCheerPosts: [],
  featuredMates: [],
  rankingSnapshot: {
    rankingSeasonYear: 2026,
    rankingSourceMessage: 'mock home first-load ranking snapshot',
    isOffSeason: false,
    rankings: [],
  },
});

const fulfillJson = async (route, body, status = 200) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: jsonResponse(body),
  });
};

const installMockRoutes = async (page) => {
  await page.route('**/api/auth/mypage*', (route) => fulfillJson(route, {
    success: false,
    message: 'Unauthorized',
  }, 401));
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
  await page.route('**/api/home/bootstrap*', (route) => {
    const url = new URL(route.request().url());
    const date = url.searchParams.get('date') || selectedDate;
    return fulfillJson(route, buildMockBootstrapResponse(date));
  });
  await page.route('**/api/home/widgets*', (route) => fulfillJson(route, buildMockWidgetsResponse()));
  await page.route('**/api/home/navigation*', (route) => fulfillJson(route, {
    resolvedDate: selectedDate,
    hasPrev: true,
    hasNext: true,
    prevGameDate: '2026-06-05',
    nextGameDate: '2026-06-07',
  }));
};

const installMetricsInitScript = async (context) => {
  await context.addInitScript(() => {
    window.__homeFirstLoadMetrics = {
      firstGameCardAt: null,
      homeLoadAt: null,
      homeLoadEvents: [],
      longTasks: [],
      lcpAt: null,
    };

    try {
      window.localStorage.setItem('bega_has_visited', 'true');
      window.localStorage.setItem('bega_dont_show_guide', 'true');
      window.localStorage.removeItem('auth-bootstrap-hint');
      window.localStorage.removeItem('auth-bootstrap-meta');
      window.sessionStorage.setItem('cypress:skip-public-auth-bootstrap', '1');
    } catch (_error) {
      // Ignore storage failures in browser automation setup.
    }

    const isVisibleHomeGameCard = () => {
      const card = document.querySelector('[data-testid="home-game-card"]');
      if (!card) {
        return false;
      }
      const rect = card.getBoundingClientRect();
      const style = window.getComputedStyle(card);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };

    const recordFirstGameCard = () => {
      if (window.__homeFirstLoadMetrics.firstGameCardAt !== null) {
        return;
      }
      if (isVisibleHomeGameCard()) {
        window.__homeFirstLoadMetrics.firstGameCardAt = performance.now();
      }
    };

    const startCardObserver = () => {
      recordFirstGameCard();
      const observer = new MutationObserver(recordFirstGameCard);
      observer.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
      });
      requestAnimationFrame(recordFirstGameCard);
    };

    if (document.body) {
      startCardObserver();
    } else {
      document.addEventListener('DOMContentLoaded', startCardObserver, { once: true });
    }

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const latestEntry = list.getEntries().at(-1);
        if (latestEntry) {
          window.__homeFirstLoadMetrics.lcpAt = latestEntry.startTime;
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_error) {
      // LCP observer support may vary by browser channel.
    }

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__homeFirstLoadMetrics.longTasks.push({
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
          });
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch (_error) {
      // Long task observer support may vary by browser channel.
    }

    const originalInfo = console.info.bind(console);
    console.info = (...args) => {
      try {
        if (args[0] === '[HomeLoad]' && args[1]?.event === 'home_load_completed') {
          window.__homeFirstLoadMetrics.homeLoadAt = performance.now();
          window.__homeFirstLoadMetrics.homeLoadEvents.push({
            at: performance.now(),
            payload: args[1],
          });
        }
      } catch (_error) {
        // Keep the app console path untouched if audit capture fails.
      }
      originalInfo(...args);
    };
  });
};

const createNetworkTracker = (page) => {
  const requestStarts = new Map();
  const pendingReads = [];
  const result = {
    bootstrapRequestCount: 0,
    navigationRequestCount: 0,
    bootstrapResponses: [],
    failedRequests: [],
  };

  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/home/bootstrap')) {
      result.bootstrapRequestCount += 1;
      requestStarts.set(request, Date.now());
    } else if (url.includes('/api/home/navigation')) {
      result.navigationRequestCount += 1;
      requestStarts.set(request, Date.now());
    }
  });

  page.on('response', (response) => {
    const request = response.request();
    const url = response.url();
    if (!url.includes('/api/home/bootstrap')) {
      return;
    }

    const startedAt = requestStarts.get(request);
    const durationMs = startedAt ? Date.now() - startedAt : null;
    const readPromise = response.json()
      .then((body) => {
        result.bootstrapResponses.push({
          status: response.status(),
          durationMs,
          gameCount: Array.isArray(body?.games) ? body.games.length : null,
          scheduledGameCount: Array.isArray(body?.scheduledGamesWindow) ? body.scheduledGamesWindow.length : null,
        });
      })
      .catch(() => {
        result.bootstrapResponses.push({
          status: response.status(),
          durationMs,
          gameCount: null,
          scheduledGameCount: null,
        });
      });
    pendingReads.push(readPromise);
  });

  page.on('requestfailed', (request) => {
    const url = request.url();
    if (url.includes('/api/home/bootstrap') || url.includes('/api/home/navigation')) {
      result.failedRequests.push({
        url,
        failure: request.failure()?.errorText ?? 'unknown',
      });
    }
  });

  return {
    result,
    flush: async () => {
      await Promise.allSettled(pendingReads);
      return result;
    },
  };
};

const readPageMetrics = async (page) => page.evaluate(() => {
  const metrics = window.__homeFirstLoadMetrics || {};
  const paintEntries = performance.getEntriesByType('paint');
  const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
  const round = (value) => (
    typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10) / 10 : null
  );
  const toResourcePath = (name) => {
    try {
      const url = new URL(name);
      return `${url.pathname}${url.search}`;
    } catch (_error) {
      return name;
    }
  };
  const resources = performance.getEntriesByType('resource')
    .map((entry) => ({
      name: toResourcePath(entry.name),
      initiatorType: entry.initiatorType,
      startTime: round(entry.startTime),
      responseEnd: round(entry.responseEnd),
      duration: round(entry.duration),
      transferSize: entry.transferSize || 0,
      encodedBodySize: entry.encodedBodySize || 0,
    }));
  const firstGameCardAt = typeof metrics.firstGameCardAt === 'number' ? metrics.firstGameCardAt : null;
  const withCardTiming = (entry) => {
    if (
      typeof firstGameCardAt !== 'number'
      || typeof entry.responseEnd !== 'number'
    ) {
      return {
        ...entry,
        cardTiming: null,
        firstCardDeltaMs: null,
      };
    }

    const firstCardDeltaMs = round(entry.responseEnd - firstGameCardAt);
    return {
      ...entry,
      cardTiming: entry.responseEnd <= firstGameCardAt ? 'pre-card' : 'post-card',
      firstCardDeltaMs,
    };
  };
  const resourcesWithCardTiming = resources.map(withCardTiming);
  const scriptResources = resourcesWithCardTiming.filter((entry) => (
    entry.initiatorType === 'script' || /\.js(?:$|\?)/.test(entry.name)
  ));
  const homeDeferredResourcePattern = /\/assets\/(?:AdSlot-|AuthenticatedLayoutChrome-|ChatBot-|ChatBotRuntime-|HomeAuthBridge-|HomeQueryProvider-|HomeSecondaryPanels-|HomeSecondaryPanelsContainer-|PublicNavbar-|PublicNavbarDmUnreadBadge-|liveGame-|realtimeAuth-|sonner-|stomp-)/;
  const preCardScriptResources = firstGameCardAt === null
    ? []
    : scriptResources.filter((entry) => (
      typeof entry.responseEnd === 'number' && entry.responseEnd <= firstGameCardAt
    ));
  const deferredBeforeFirstCardResources = firstGameCardAt === null
    ? []
    : resourcesWithCardTiming
      .filter((entry) => (
        homeDeferredResourcePattern.test(entry.name)
        && typeof entry.responseEnd === 'number'
        && entry.responseEnd <= firstGameCardAt
      ))
      .sort((a, b) => (b.responseEnd || 0) - (a.responseEnd || 0));
  const criticalResources = resourcesWithCardTiming.filter((entry) => (
    /\/assets\/(?:Home-|HomeMatchPanel-|vendor-react-core-|index-.*\.(?:js|css))/.test(entry.name)
    || entry.name.includes('/api/home/bootstrap')
  ));
  const slowestResources = resourcesWithCardTiming
    .filter((entry) => typeof entry.duration === 'number')
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 8);
  const latestScriptResponseEndMs = scriptResources.reduce((latest, entry) => (
    typeof entry.responseEnd === 'number' ? Math.max(latest, entry.responseEnd) : latest
  ), 0);
  const latestPreCardScriptResponseEndMs = preCardScriptResources.reduce((latest, entry) => (
    typeof entry.responseEnd === 'number' ? Math.max(latest, entry.responseEnd) : latest
  ), 0);
  const longTasks = Array.isArray(metrics.longTasks) ? metrics.longTasks : [];
  const roundedLongTasks = longTasks
    .map((entry) => ({
      name: entry.name,
      startTime: round(entry.startTime),
      duration: round(entry.duration),
    }))
    .filter((entry) => typeof entry.duration === 'number');
  const longTaskTotalMs = roundedLongTasks.reduce((total, entry) => total + entry.duration, 0);
  const longestLongTaskMs = roundedLongTasks.reduce((longest, entry) => Math.max(longest, entry.duration), 0);
  const visibleGameCardCount = Array.from(document.querySelectorAll('[data-testid="home-game-card"]'))
    .filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }).length;

  return {
    firstGameCardMs: firstGameCardAt,
    homeLoadCompletedMs: metrics.homeLoadAt,
    homeLoadEvents: metrics.homeLoadEvents || [],
    fcpMs: fcp?.startTime ?? null,
    lcpMs: metrics.lcpAt ?? null,
    longTaskCount: roundedLongTasks.length,
    longTaskTotalMs,
    longestLongTaskMs,
    longTasks: roundedLongTasks
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 8),
    scriptResourceCount: scriptResources.length,
    preCardScriptResourceCount: preCardScriptResources.length,
    latestScriptResponseEndMs,
    latestPreCardScriptResponseEndMs,
    deferredBeforeFirstCardCount: deferredBeforeFirstCardResources.length,
    deferredBeforeFirstCardResources: deferredBeforeFirstCardResources.slice(0, 12),
    criticalResources,
    slowestResources,
    gameCardCount: document.querySelectorAll('[data-testid="home-game-card"]').length,
    visibleGameCardCount,
    emptyStateVisible: document.body.textContent?.includes('경기가 없는 날입니다.') ?? false,
  };
});

const runIteration = async ({
  context,
  baseUrl,
  viewportKey,
  index,
  prewarm,
}) => {
  const page = await context.newPage();
  const networkTracker = createNetworkTracker(page);
  if (mode === 'mock') {
    await installMockRoutes(page);
  }

  const entry = {
    viewport: viewportKey,
    index,
    prewarm,
    status: 'unknown',
    firstGameCardMs: null,
    bootstrapResponseMs: null,
    homeLoadCompletedMs: null,
    fallbackHit: false,
    bootstrapRequestCount: 0,
    navigationRequestCount: 0,
    fcpMs: null,
    lcpMs: null,
    longTaskCount: 0,
    longTaskTotalMs: null,
    longestLongTaskMs: null,
    longTasks: [],
    scriptResourceCount: 0,
    preCardScriptResourceCount: 0,
    latestScriptResponseEndMs: null,
    latestPreCardScriptResponseEndMs: null,
    deferredBeforeFirstCardCount: 0,
    deferredBeforeFirstCardResources: [],
    criticalResources: [],
    slowestResources: [],
    gameCardCount: 0,
    visibleGameCardCount: 0,
    bootstrapGameCount: null,
    bootstrapScheduledGameCount: null,
    reason: null,
    failedRequests: [],
  };

  try {
    const url = new URL('/home', baseUrl);
    url.searchParams.set('date', selectedDate);
    url.searchParams.set('tab', 'regular');
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.waitForFunction(
      () => window.__homeFirstLoadMetrics?.firstGameCardAt !== null,
      null,
      { timeout: 8000 },
    ).catch(() => undefined);
    await page.waitForFunction(
      () => window.__homeFirstLoadMetrics?.homeLoadAt !== null,
      null,
      { timeout: 3000 },
    ).catch(() => undefined);
    await sleep(200);

    const pageMetrics = await readPageMetrics(page);
    const network = await networkTracker.flush();
    const latestBootstrap = network.bootstrapResponses.at(-1) || null;
    const homeLoadEvents = Array.isArray(pageMetrics.homeLoadEvents) ? pageMetrics.homeLoadEvents : [];
    const fallbackHit = homeLoadEvents.some((event) => {
      const payload = event?.payload || {};
      return payload.source === 'legacy-fallback' || payload.timedOut === true || payload.isFallback === true;
    });

    entry.firstGameCardMs = roundMetric(pageMetrics.firstGameCardMs);
    entry.homeLoadCompletedMs = roundMetric(pageMetrics.homeLoadCompletedMs);
    entry.bootstrapResponseMs = roundMetric(latestBootstrap?.durationMs);
    entry.fallbackHit = fallbackHit;
    entry.bootstrapRequestCount = network.bootstrapRequestCount;
    entry.navigationRequestCount = network.navigationRequestCount;
    entry.fcpMs = roundMetric(pageMetrics.fcpMs);
    entry.lcpMs = roundMetric(pageMetrics.lcpMs);
    entry.longTaskCount = pageMetrics.longTaskCount;
    entry.longTaskTotalMs = roundMetric(pageMetrics.longTaskTotalMs);
    entry.longestLongTaskMs = roundMetric(pageMetrics.longestLongTaskMs);
    entry.longTasks = pageMetrics.longTasks;
    entry.scriptResourceCount = pageMetrics.scriptResourceCount;
    entry.preCardScriptResourceCount = pageMetrics.preCardScriptResourceCount;
    entry.latestScriptResponseEndMs = roundMetric(pageMetrics.latestScriptResponseEndMs);
    entry.latestPreCardScriptResponseEndMs = roundMetric(pageMetrics.latestPreCardScriptResponseEndMs);
    entry.deferredBeforeFirstCardCount = pageMetrics.deferredBeforeFirstCardCount;
    entry.deferredBeforeFirstCardResources = pageMetrics.deferredBeforeFirstCardResources;
    entry.criticalResources = pageMetrics.criticalResources;
    entry.slowestResources = pageMetrics.slowestResources;
    entry.gameCardCount = pageMetrics.gameCardCount;
    entry.visibleGameCardCount = pageMetrics.visibleGameCardCount;
    entry.bootstrapGameCount = latestBootstrap?.gameCount ?? null;
    entry.bootstrapScheduledGameCount = latestBootstrap?.scheduledGameCount ?? null;
    entry.failedRequests = network.failedRequests;

    if (
      mode === 'real'
      && entry.firstGameCardMs === null
      && entry.bootstrapGameCount === 0
      && entry.bootstrapScheduledGameCount === 0
      && pageMetrics.emptyStateVisible
    ) {
      entry.status = 'needs-date';
      entry.reason = 'NO_GAME_CARDS_FOR_DATE';
    } else if (entry.firstGameCardMs === null) {
      entry.status = 'failed';
      entry.reason = 'FIRST_GAME_CARD_NOT_VISIBLE';
    } else if (entry.fallbackHit) {
      entry.status = 'failed';
      entry.reason = 'LEGACY_FALLBACK_HIT';
    } else if (entry.bootstrapRequestCount !== 1) {
      entry.status = 'failed';
      entry.reason = 'UNEXPECTED_BOOTSTRAP_REQUEST_COUNT';
    } else if (entry.navigationRequestCount !== 0) {
      entry.status = 'failed';
      entry.reason = 'UNEXPECTED_HOME_NAVIGATION_REQUEST';
    } else {
      entry.status = 'passed';
    }
  } catch (error) {
    entry.status = 'failed';
    entry.reason = error instanceof Error ? error.message : String(error);
  } finally {
    await page.close().catch(() => undefined);
  }

  return entry;
};

const roundMetric = (value) => (
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10) / 10 : null
);

const percentile = (values, percentileValue) => {
  const sorted = values.filter((value) => typeof value === 'number').sort((a, b) => a - b);
  if (sorted.length === 0) {
    return null;
  }
  const index = Math.max(0, Math.ceil(sorted.length * percentileValue) - 1);
  return sorted[index];
};

const summarizeViewport = (viewport, entries) => {
  const measuredEntries = entries.filter((entry) => !entry.prewarm);
  const firstGameCardP95 = percentile(measuredEntries.map((entry) => entry.firstGameCardMs), 0.95);
  const bootstrapResponseP95 = percentile(measuredEntries.map((entry) => entry.bootstrapResponseMs), 0.95);
  const fallbackHit = measuredEntries.some((entry) => entry.fallbackHit);
  const failedEntries = measuredEntries.filter((entry) => entry.status === 'failed');
  const needsDateEntries = measuredEntries.filter((entry) => entry.status === 'needs-date');
  const budgetFailures = [];

  if (firstGameCardP95 !== null && firstGameCardP95 >= p95BudgetMs) {
    budgetFailures.push('FIRST_GAME_CARD_P95_BUDGET_EXCEEDED');
  }
  if (mode === 'real' && bootstrapResponseP95 !== null && bootstrapResponseP95 >= bootstrapP95BudgetMs) {
    budgetFailures.push('BOOTSTRAP_RESPONSE_P95_BUDGET_EXCEEDED');
  }

  let status = 'passed';
  let reason = null;
  if (failedEntries.length > 0 || budgetFailures.length > 0 || fallbackHit) {
    status = 'failed';
    reason = [
      ...new Set([
        ...failedEntries.map((entry) => entry.reason).filter(Boolean),
        ...budgetFailures,
        fallbackHit ? 'LEGACY_FALLBACK_HIT' : null,
      ].filter(Boolean)),
    ].join(', ');
  } else if (needsDateEntries.length > 0) {
    status = 'needs-date';
    reason = 'NO_GAME_CARDS_FOR_DATE';
  }

  return {
    viewport: viewport.key,
    label: viewport.label,
    status,
    reason,
    firstGameCardP95,
    bootstrapResponseP95,
    homeLoadCompletedP95: percentile(measuredEntries.map((entry) => entry.homeLoadCompletedMs), 0.95),
    fcpP95: percentile(measuredEntries.map((entry) => entry.fcpMs), 0.95),
    lcpP95: percentile(measuredEntries.map((entry) => entry.lcpMs), 0.95),
    fallbackHit,
    maxBootstrapRequestCount: Math.max(...measuredEntries.map((entry) => entry.bootstrapRequestCount), 0),
    maxNavigationRequestCount: Math.max(...measuredEntries.map((entry) => entry.navigationRequestCount), 0),
    entries,
  };
};

const buildMarkdown = (report) => {
  const lines = [
    '# Home First-Load Audit',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Report key: ${report.reportKey}`,
    `- Mode: ${report.mode}`,
    `- Selected date: ${report.selectedDate}`,
    `- Status: ${report.status}`,
    `- Base URL: ${report.baseUrl}`,
    `- Server mode: ${report.serverMode}`,
    `- Warm iterations per viewport: ${report.iterations}`,
    `- First card p95 budget: ${report.budgets.firstGameCardP95Ms}ms`,
    `- Bootstrap p95 budget: ${report.budgets.bootstrapResponseP95Ms}ms`,
    '',
    '| Viewport | Status | First card p95 | Bootstrap p95 | HomeLoad p95 | FCP p95 | LCP p95 | Fallback | Bootstrap req max | Navigation req max | Reason |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | --- |',
    ...report.viewports.map((viewport) => [
      viewport.label,
      viewport.status,
      formatMetric(viewport.firstGameCardP95),
      formatMetric(viewport.bootstrapResponseP95),
      formatMetric(viewport.homeLoadCompletedP95),
      formatMetric(viewport.fcpP95),
      formatMetric(viewport.lcpP95),
      viewport.fallbackHit ? 'yes' : 'no',
      viewport.maxBootstrapRequestCount,
      viewport.maxNavigationRequestCount,
      viewport.reason || '',
    ].join(' | ')).map((row) => `| ${row} |`),
    '',
  ];

  lines.push(
    '## Diagnostics',
    '',
    '| Viewport | Slowest measured entry | First card | Long task total | Longest long task | Pre-card scripts | Latest pre-card script end | Deferred before card | Critical resources | Slowest resource |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |',
    ...report.viewports.map((viewport) => {
      const measuredEntries = viewport.entries.filter((entry) => !entry.prewarm);
      const slowestEntry = measuredEntries
        .filter((entry) => typeof entry.firstGameCardMs === 'number')
        .sort((a, b) => b.firstGameCardMs - a.firstGameCardMs)[0];

      return [
        viewport.label,
        slowestEntry?.index ?? '',
        formatMetric(slowestEntry?.firstGameCardMs),
        formatMetric(slowestEntry?.longTaskTotalMs),
        formatMetric(slowestEntry?.longestLongTaskMs),
        slowestEntry?.preCardScriptResourceCount ?? '',
        formatMetric(slowestEntry?.latestPreCardScriptResponseEndMs),
        formatDeferredResourceSummary(slowestEntry),
        formatCriticalResourceSummary(slowestEntry),
        formatResourceSummary(slowestEntry),
      ].join(' | ');
    }).map((row) => `| ${row} |`),
    '',
  );

  if (report.status === 'needs-date') {
    lines.push(
      'Real mode found no game cards for the selected date. Re-run with HOME_FIRST_LOAD_DATE set to a known game date.',
      '',
    );
  }

  return `${lines.join('\n')}\n`;
};

const formatMetric = (value) => (
  typeof value === 'number' ? `${value}ms` : 'n/a'
);

const sanitizeMarkdownCell = (value) => String(value ?? '').replaceAll('|', '\\|');

const formatResourceSummary = (entry) => {
  const resource = entry?.slowestResources?.[0];
  if (!resource) {
    return '';
  }

  return sanitizeMarkdownCell([
    resource.name,
    formatMetric(resource.duration),
    `@ ${formatMetric(resource.responseEnd)}`,
    formatResourceCardTiming(entry, resource),
  ].filter(Boolean).join(' '));
};

const formatResourceCardTiming = (entry, resource) => {
  if (
    (resource?.cardTiming === 'pre-card' || resource?.cardTiming === 'post-card')
    && typeof resource.firstCardDeltaMs === 'number'
  ) {
    return `${resource.cardTiming} ${formatMetric(Math.abs(resource.firstCardDeltaMs))}`;
  }

  if (
    typeof entry?.firstGameCardMs !== 'number'
    || typeof resource?.responseEnd !== 'number'
  ) {
    return '';
  }

  const timing = resource.responseEnd <= entry.firstGameCardMs ? 'pre-card' : 'post-card';
  const deltaMs = Math.abs(resource.responseEnd - entry.firstGameCardMs);
  return `${timing} ${formatMetric(Math.round(deltaMs * 10) / 10)}`;
};

const formatCriticalResourceSummary = (entry) => {
  const resources = entry?.criticalResources || [];
  if (resources.length === 0) {
    return '';
  }

  const summary = resources
    .slice(0, 4)
    .map((resource) => [
      resource.name,
      formatMetric(resource.duration),
      `@ ${formatMetric(resource.responseEnd)}`,
      formatResourceCardTiming(entry, resource),
    ].filter(Boolean).join(' '))
    .join('<br>');
  const suffix = resources.length > 4 ? `<br>+${resources.length - 4} more` : '';
  return sanitizeMarkdownCell(`${summary}${suffix}`);
};

const formatDeferredResourceSummary = (entry) => {
  const resources = entry?.deferredBeforeFirstCardResources || [];
  if (resources.length === 0) {
    return '';
  }

  const summary = resources
    .slice(0, 4)
    .map((resource) => `${resource.name} @ ${formatMetric(resource.responseEnd)}`)
    .join('<br>');
  const suffix = resources.length > 4 ? `<br>+${resources.length - 4} more` : '';
  return sanitizeMarkdownCell(`${summary}${suffix}`);
};

const buildReportPaths = (reportKey) => ({
  latestJsonPath: path.join(outputRoot, 'home-first-load-summary.json'),
  latestMarkdownPath: path.join(outputRoot, 'home-first-load-summary.md'),
  variantJsonPath: path.join(outputRoot, `home-first-load-${reportKey}-summary.json`),
  variantMarkdownPath: path.join(outputRoot, `home-first-load-${reportKey}-summary.md`),
});

const run = async () => {
  await ensureDir(outputRoot);
  await checkRealBackend();

  const { chromium } = await loadPlaywright();
  const {
    baseUrl,
    serverMode,
    devServerProcess,
  } = await resolveBaseUrl();

  const browser = await launchChromium(chromium);
  const viewportSummaries = [];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: viewport.viewport,
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
        deviceScaleFactor: viewport.deviceScaleFactor,
      });
      await installMetricsInitScript(context);

      const entries = [];
      entries.push(await runIteration({
        context,
        baseUrl,
        viewportKey: viewport.key,
        index: 0,
        prewarm: true,
      }));

      for (let index = 1; index <= iterationCount; index += 1) {
        entries.push(await runIteration({
          context,
          baseUrl,
          viewportKey: viewport.key,
          index,
          prewarm: false,
        }));
      }

      viewportSummaries.push(summarizeViewport(viewport, entries));
      await context.close();
    }
  } finally {
    await browser.close().catch(() => undefined);
    await stopLocalDevServer(devServerProcess);
  }

  const status = viewportSummaries.some((summary) => summary.status === 'failed')
    ? 'failed'
    : viewportSummaries.some((summary) => summary.status === 'needs-date')
      ? 'needs-date'
      : 'passed';
  const report = {
    generatedAt: new Date().toISOString(),
    reportKey: mode,
    mode,
    selectedDate,
    status,
    baseUrl,
    serverMode,
    iterations: iterationCount,
    budgets: {
      firstGameCardP95Ms: p95BudgetMs,
      bootstrapResponseP95Ms: bootstrapP95BudgetMs,
    },
    viewports: viewportSummaries,
  };

  const {
    latestJsonPath,
    latestMarkdownPath,
    variantJsonPath,
    variantMarkdownPath,
  } = buildReportPaths(report.reportKey);
  const jsonPayload = `${JSON.stringify(report, null, 2)}\n`;
  const markdownPayload = buildMarkdown(report);
  await fs.writeFile(latestJsonPath, jsonPayload, 'utf8');
  await fs.writeFile(latestMarkdownPath, markdownPayload, 'utf8');
  await fs.writeFile(variantJsonPath, jsonPayload, 'utf8');
  await fs.writeFile(variantMarkdownPath, markdownPayload, 'utf8');

  console.log(`[home-first-load] status=${status} mode=${mode} date=${selectedDate}`);
  console.log(`[home-first-load] report=${latestMarkdownPath}`);
  console.log(`[home-first-load] ${report.reportKey}Report=${variantMarkdownPath}`);

  if (status === 'failed') {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error('[home-first-load] failed', error);
  process.exitCode = 1;
});
