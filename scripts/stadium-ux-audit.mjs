import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const outputRoot = path.resolve(process.argv[2] || path.join(repoRoot, 'output/playwright/stadium-ux'));
const AUDIT_BASE_URL = process.env.AUDIT_BASE_URL || '';
const shouldAutoStartDevServer = process.env.STADIUM_UX_AUTO_START_DEV_SERVER !== '0';
const shouldForceStartDevServer = process.env.STADIUM_UX_FORCE_START_DEV_SERVER === '1';
const managedDevServerPort = Number(process.env.STADIUM_UX_MANAGED_DEV_SERVER_PORT || '5177');
const requestedViewports = new Set(
  (process.env.STADIUM_UX_VIEWPORTS || 'mobile-390,desktop-1440')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);
const requestedSeatMapStadiumIds = new Set(
  (process.env.STADIUM_UX_REVIEW_STADIUMS || '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
);
const shouldRunJamsilDeepCheck = process.env.STADIUM_UX_JAMSIL_DEEP_CHECK === '1';
const shouldRunJamsilFullClickCheck = process.env.STADIUM_UX_JAMSIL_FULL_CLICK_CHECK === '1';
const shouldRunIncheonDeepCheck = process.env.STADIUM_UX_INCHEON_DEEP_CHECK === '1';
const shouldRunIncheonFullClickCheck = process.env.STADIUM_UX_INCHEON_FULL_CLICK_CHECK === '1';
const shouldRunGocheokDeepCheck = process.env.STADIUM_UX_GOCHEOK_DEEP_CHECK === '1';
const shouldRunGocheokFullClickCheck = process.env.STADIUM_UX_GOCHEOK_FULL_CLICK_CHECK === '1';
const shouldCaptureGocheokDebugOverlay = process.env.STADIUM_UX_GOCHEOK_DEBUG_CAPTURE === '1';
const shouldRunGwangjuDeepCheck = process.env.STADIUM_UX_GWANGJU_DEEP_CHECK === '1';
const shouldCaptureGwangjuDebugOverlay = process.env.STADIUM_UX_GWANGJU_DEBUG_CAPTURE === '1';
const shouldRunChangwonDeepCheck = process.env.STADIUM_UX_CHANGWON_DEEP_CHECK === '1';
const shouldRunDaejeonDeepCheck = process.env.STADIUM_UX_DAEJEON_DEEP_CHECK === '1';
const shouldCaptureDaejeonDebugOverlay = process.env.STADIUM_UX_DAEJEON_DEBUG_CAPTURE === '1';
const shouldRunDaeguDeepCheck = process.env.STADIUM_UX_DAEGU_DEEP_CHECK === '1';
const shouldRunDaeguFullClickCheck = process.env.STADIUM_UX_DAEGU_FULL_CLICK_CHECK === '1';
const shouldRunSuwonDeepCheck = process.env.STADIUM_UX_SUWON_DEEP_CHECK === '1';
const shouldRunSuwonFullClickCheck = process.env.STADIUM_UX_SUWON_FULL_CLICK_CHECK === '1';
const shouldRunSajikDeepCheck = process.env.STADIUM_UX_SAJIK_DEEP_CHECK === '1';
const DAEJEON_EXPECTS_MANUAL_SEATMAP = false;
const shouldRunInitialJamsilProbe = requestedSeatMapStadiumIds.size === 0
  || requestedSeatMapStadiumIds.has('JAMSIL')
  || shouldRunJamsilDeepCheck
  || shouldRunJamsilFullClickCheck;
const localDevServerUrlPattern = /Local:\s+(http:\/\/127\.0\.0\.1:\d+)/;
const baseUrlCandidates = [5176, 5177]
  .map((port) => `http://127.0.0.1:${port}`);

const seatMapReviewStadiums = [
  {
    stadiumId: 'JAMSIL',
    stadiumName: '잠실야구장',
    team: 'LG/두산',
    lat: 37.5122,
    lng: 127.0719,
    address: '서울특별시 송파구 올림픽로 25',
    phone: null,
    expectedSeatMapLabel: '잠실 블록 단위 안내도',
    expectedHomeSide: null,
  },
  {
    stadiumId: 'INCHEON',
    stadiumName: '인천SSG랜더스필드',
    team: 'SSG',
    lat: 37.4369,
    lng: 126.6933,
    address: '인천광역시 미추홀구 매소홀로 618',
    phone: null,
    expectedSeatMapLabel: '인천 SSG 공식 좌석도',
    expectedHomeSide: null,
  },
  {
    stadiumId: 'GWANGJU',
    stadiumName: '광주기아챔피언스필드',
    team: 'KIA',
    lat: 35.1682,
    lng: 126.8891,
    address: '광주광역시 북구 서림로 10',
    phone: null,
    expectedSeatMapLabel: '광주 KIA 공식 좌석도',
    expectedHomeSide: null,
  },
  {
    stadiumId: 'DAEJEON',
    stadiumName: '대전한화생명이글스파크',
    team: '한화',
    lat: 36.3183,
    lng: 127.4285,
    address: '대전광역시 중구 대종로 373',
    phone: null,
    expectedSeatMapLabel: '대전 한화 공식 좌석도',
    expectedHomeSide: null,
  },
  {
    stadiumId: 'DAEGU',
    stadiumName: '대구삼성라이온즈파크',
    team: '삼성',
    lat: 35.841,
    lng: 128.6815,
    address: '대구광역시 수성구 야구전설로 1',
    phone: null,
    expectedSeatMapLabel: '대구 삼성 공식 좌석도',
    expectedHomeSide: null,
  },
  {
    stadiumId: 'SUWON',
    stadiumName: '수원KT위즈파크',
    team: 'KT',
    lat: 37.2998,
    lng: 127.0097,
    address: '경기도 수원시 장안구 경수대로 893',
    phone: null,
    expectedSeatMapLabel: '수원 kt 위즈 파크 공식 좌석도',
    expectedHomeSide: null,
  },
  {
    stadiumId: 'SAJIK',
    stadiumName: '사직야구장',
    team: '롯데',
    lat: 35.194,
    lng: 129.0615,
    address: '부산광역시 동래구 사직로 45',
    phone: null,
    expectedSeatMapLabel: '사직 롯데 공식 좌석도',
    expectedHomeSide: null,
  },
  {
    stadiumId: 'CHANGWON',
    stadiumName: '창원NC파크',
    team: 'NC',
    lat: 35.2225,
    lng: 128.5822,
    address: '경상남도 창원시 마산회원구 삼호로 63',
    phone: null,
    expectedSeatMapLabel: '창원 NC 공식 좌석도',
    expectedHomeSide: null,
  },
  {
    stadiumId: 'GOCHEOK',
    stadiumName: '고척 스카이돔',
    team: '키움',
    lat: 37.4981,
    lng: 126.8671,
    address: '서울특별시 구로구 경인로 430',
    phone: null,
    expectedSeatMapLabel: '고척 키움 공식 좌석도',
    expectedHomeSide: null,
  },
];

const stadiums = seatMapReviewStadiums.map(({
  expectedSeatMapLabel: _expectedSeatMapLabel,
  expectedHomeSide: _expectedHomeSide,
  ...stadium
}) => stadium);

const selectedSeatMapReviewStadiums = requestedSeatMapStadiumIds.size > 0
  ? seatMapReviewStadiums.filter((stadium) => requestedSeatMapStadiumIds.has(stadium.stadiumId))
  : seatMapReviewStadiums;

if (selectedSeatMapReviewStadiums.length === 0) {
  throw new Error('No matching stadiums selected. Use STADIUM_UX_REVIEW_STADIUMS=JAMSIL,GOCHEOK etc.');
}

const foodPlaces = [
  {
    id: 101,
    stadiumName: '잠실야구장',
    category: 'food',
    name: '통밥',
    description: '잠실야구장 내 2층 3루 내야 / 추천메뉴: 삼겹살 도시락',
    lat: 37.5124,
    lng: 127.0721,
    address: '서울 송파구 올림픽로 25',
    phone: null,
    rating: 4.8,
    openTime: null,
    closeTime: null,
  },
];

const scenarios = [
  {
    key: 'mobile-360',
    label: 'Mobile 360',
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  {
    key: 'mobile-390',
    label: 'Mobile 390',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  {
    key: 'mobile-430',
    label: 'Mobile 430',
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  {
    key: 'tablet-768',
    label: 'Tablet 768',
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
  {
    key: 'desktop-1038',
    label: 'Desktop 1038',
    viewport: { width: 1038, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  {
    key: 'desktop-1440',
    label: 'Desktop 1440',
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
];

const selectedScenarios = scenarios.filter((scenario) => requestedViewports.has(scenario.key));

if (selectedScenarios.length === 0) {
  throw new Error('No matching Stadium UX scenarios selected. Use STADIUM_UX_VIEWPORTS=mobile-360,mobile-390,mobile-430,tablet-768,desktop-1038,desktop-1440.');
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

const fetchWithTimeout = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual',
    });
    return response.ok || response.status === 404;
  } catch (_error) {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const findReachableBaseUrl = async (candidates) => {
  for (const candidate of candidates) {
    if (await fetchWithTimeout(candidate)) {
      return candidate;
    }
  }

  return null;
};

const waitForReachableBaseUrl = async (url, timeoutMs = 15000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await fetchWithTimeout(url)) {
      return true;
    }
    await sleep(250);
  }

  return false;
};

const waitForStartedDevServer = async (baseUrl) => {
  if (!await waitForReachableBaseUrl(baseUrl, 30000)) {
    return false;
  }

  return waitForReachableBaseUrl(new URL('/stadium', baseUrl).toString(), 30000);
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

const startLocalDevServer = (port) => {
  const localSiteUrl = `http://127.0.0.1:${port}`;
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', `${port}`, '--strictPort'], {
    cwd: frontendRoot,
    env: {
      ...process.env,
      VITE_DISABLE_SERVER_ERROR_MODAL: process.env.VITE_DISABLE_SERVER_ERROR_MODAL || 'false',
      VITE_SITE_URL: process.env.VITE_SITE_URL || localSiteUrl,
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '/api',
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
  if (AUDIT_BASE_URL && !shouldForceStartDevServer) {
    return {
      baseUrl: AUDIT_BASE_URL,
      serverMode: 'explicit',
      devServerProcess: null,
    };
  }

  if (!shouldForceStartDevServer) {
    const existingBaseUrl = await findReachableBaseUrl(baseUrlCandidates);
    if (existingBaseUrl) {
      return {
        baseUrl: existingBaseUrl,
        serverMode: 'existing',
        devServerProcess: null,
      };
    }
  }

  if (!shouldAutoStartDevServer) {
    throw new Error('No local frontend dev server responded. Start Vite and retry, or set AUDIT_BASE_URL explicitly.');
  }

  const devServerPort = shouldForceStartDevServer ? managedDevServerPort : 5177;
  const {
    child: devServerProcess,
    localUrlPromise,
  } = startLocalDevServer(devServerPort);

  let startedBaseUrl;
  try {
    startedBaseUrl = await withTimeout(
      localUrlPromise,
      90000,
      'Local frontend dev server did not become ready within 90 seconds.'
    );
  } catch (error) {
    await stopLocalDevServer(devServerProcess);
    throw error;
  }

  if (!await waitForStartedDevServer(startedBaseUrl)) {
    await stopLocalDevServer(devServerProcess);
    throw new Error(`Local frontend dev server reported ${startedBaseUrl} but did not accept /stadium connections.`);
  }

  return {
    baseUrl: startedBaseUrl,
    serverMode: shouldForceStartDevServer ? 'forced-started' : 'started',
    devServerProcess,
  };
};

const json = (body) => JSON.stringify(body);

const routeJson = async (page, pattern, body, status = 200) => {
  await page.route(pattern, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: typeof body === 'string' ? body : json(body),
    });
  });
};

const installRoutes = async (page) => {
  await routeJson(page, '**/api/auth/mypage*', {
    success: false,
    message: 'Unauthorized',
  }, 401);
  await routeJson(page, '**/api/auth/reissue*', {
    success: false,
    message: 'Unauthorized',
  }, 400);
  await routeJson(page, '**/api/chat/my/unread-counts*', {
    success: true,
    data: 0,
  });
  await routeJson(page, '**/api/notifications/my/unread-count*', 0);
  await routeJson(page, '**/api/notifications/my*', []);
  await routeJson(page, /\/api\/stadiums\/?(\?.*)?$/, stadiums);
  await page.route('**/api/stadiums/*/places?category=*', async (route) => {
    const url = new URL(route.request().url());
    const category = url.searchParams.get('category');
    const stadiumId = url.pathname.split('/').at(-2);
    const selectedStadium = stadiums.find((stadium) => stadium.stadiumId === stadiumId);
    const places = category === 'food'
      ? foodPlaces.map((place) => ({
        ...place,
        stadiumName: selectedStadium?.stadiumName ?? place.stadiumName,
      }))
      : [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: json(places),
    });
  });
  await routeJson(page, '**/api/diary/seat-views*', []);
  await page.route('https://dapi.kakao.com/**', async (route) => {
    await route.abort('failed');
  });
  await page.route('https://cdn.jsdelivr.net/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  });
  await page.route('https://fonts.googleapis.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  });
  await page.route('https://fonts.gstatic.com/**', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
};

const addInitState = async (page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('bega_has_visited', 'true');
    window.localStorage.setItem('bega_dont_show_guide', 'true');
    window.localStorage.setItem('kbo-theme', 'light');
  });
};

const isIgnoredConsoleText = (text) => (
  text.includes('React DevTools')
  || text.includes('Failed to load resource:')
  || text.includes('카카오맵 스크립트 로드 실패')
  || text.includes('[auth-bootstrap] session bootstrap failed')
  || text.includes('/api/auth/mypage')
  || text.includes('/api/auth/reissue')
);

const isIgnoredFailedRequest = (request) => {
  const url = typeof request === 'string' ? request : request.url;
  const failure = typeof request === 'string' ? '' : request.failure;

  return (
    url.includes('dapi.kakao.com')
    || url.includes('/api/auth/mypage')
    || url.includes('/api/auth/reissue')
    || (failure === 'net::ERR_ABORTED' && url.includes('/src/assets/'))
    || (failure === 'net::ERR_ABORTED' && url.includes('/src/'))
    || (failure === 'net::ERR_ABORTED' && url.includes('/node_modules/.vite/deps/'))
  );
};

const rectOf = async (locator) => locator.evaluate((node) => {
  const rect = node.getBoundingClientRect();
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
  };
});

const visibleSeatMapLocator = (page) => page.locator('[data-testid="stadium-seat-map"]:visible').first();
const seatViewTitleLocator = (page) => page.getByText('실제 시야 사진', { exact: true }).first();
const visibleTextLocator = (page, text) => page.locator(':visible', { hasText: text }).first();
const waitForVisibleSeatMapText = async (page, text, timeout = 10000) => {
  await page.waitForFunction((expectedText) => Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
    .some((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (node.textContent ?? '').includes(expectedText);
    }), text, { timeout });
};
const visibleStadiumSelectLocator = (page) => page.locator('select#stadium-guide-select:visible').first();
const stadiumSelectValueAliases = {
  INCHEON: 'SSGLANDERS',
  SUWON: 'KTWIZ',
  DAEJEON: 'EAGLES',
  CHANGWON: 'NCPARK',
  DAEGU: 'LIONS',
  GWANGJU: 'CHAMPIONS',
};
const selectStadiumGuideOption = async (page, stadiumId) => {
  const select = visibleStadiumSelectLocator(page);
  const candidateValues = Array.from(new Set([stadiumId, stadiumSelectValueAliases[stadiumId]].filter(Boolean)));
  let lastError = null;

  await select.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction((values) => {
    const element = document.querySelector('select#stadium-guide-select');
    if (!(element instanceof HTMLSelectElement) || element.disabled || element.options.length < 2) {
      return false;
    }
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.some((value) => optionValues.includes(value));
  }, candidateValues, { timeout: 10000 });

  for (const selectValue of candidateValues) {
    try {
      await select.selectOption(selectValue);
      await page.waitForFunction((value) => {
        const element = document.querySelector('select#stadium-guide-select');
        return element instanceof HTMLSelectElement && element.value === value;
      }, selectValue, { timeout: 5000 });
      await sleep(150);
      const currentValue = await select.inputValue().catch(() => '');
      if (currentValue === selectValue) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
  }

  const options = await select
    .evaluate((element) => Array.from(element.options).map((option) => option.value))
    .catch(() => []);
  throw new Error(`Unable to select stadium ${stadiumId}. Tried: ${candidateValues.join(', ')}. Available options: ${options.join(', ')}`, { cause: lastError });
};
const visibleSeatMapHitAreaByLabel = (page, label) =>
  page.locator(`[data-testid="stadium-seat-map"]:visible svg [role="button"][aria-label=${JSON.stringify(label)}]`).first();
const visibleSeatMapHitAreaByPartialLabel = (page, label) =>
  page.locator(`[data-testid="stadium-seat-map"]:visible svg [role="button"][aria-label*=${JSON.stringify(label)}]`).first();
const visibleIncheonSeatMapTestId = (page, testId) =>
  page.locator(`[data-testid="stadium-seat-map"]:visible [data-testid="${testId}"]`).first();
const visibleJamsilSeatMapTestId = (page, testId) =>
  page.locator(`[data-testid="stadium-seat-map"]:visible [data-testid="${testId}"]`).first();
const visibleSeatMapFilterButton = (page, testId) =>
  page.locator(`[data-testid="${testId}"]:visible`).first();

const clickVisibleSeatMapFilter = async (page, testId) => {
  const button = visibleSeatMapFilterButton(page, testId);
  await button.waitFor({ state: 'visible', timeout: 5000 });
  await button.click({ timeout: 5000 });
  await page.waitForFunction((targetTestId) => {
    const button = Array.from(document.querySelectorAll(`[data-testid="${targetTestId}"]`))
      .find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    return button?.getAttribute('aria-pressed') === 'true';
  }, testId, { timeout: 5000 });
};

const scrollVisibleSeatMapIntoView = async (page) => {
  await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
    .some((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }), null, { timeout: 10000 });
  await page.evaluate(() => {
    const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
      .find((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    seatMap?.scrollIntoView({ block: 'center', inline: 'nearest' });
  });
  await sleep(100);
};

const clickSeatMapSection = async (section) => {
  await section.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const targetY = window.innerHeight * 0.42;
    window.scrollBy(0, rect.top + rect.height / 2 - targetY);
  });
  await sleep(100);
  await section.click({ timeout: 5000, force: true });
};

const dispatchSeatMapSectionClick = async (section) => {
  await section.evaluate((node) => {
    node.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    }));
  });
};

const readIncheonZoomState = async (page) => visibleIncheonSeatMapTestId(page, 'incheon-seatmap-transform-layer').evaluate((node) => ({
  zoom: Number(node.getAttribute('data-zoom') ?? '1'),
  panX: Number(node.getAttribute('data-pan-x') ?? '0'),
  panY: Number(node.getAttribute('data-pan-y') ?? '0'),
  transform: window.getComputedStyle(node).transform,
}));
const readJamsilZoomState = async (page) => visibleJamsilSeatMapTestId(page, 'jamsil-seatmap-transform-layer').evaluate((node) => ({
  zoom: Number(node.getAttribute('data-zoom') ?? '1'),
  panX: Number(node.getAttribute('data-pan-x') ?? '0'),
  panY: Number(node.getAttribute('data-pan-y') ?? '0'),
  transform: window.getComputedStyle(node).transform,
}));
const visibleSuwonSeatMapTestId = (page, testId) =>
  page.locator(`[data-testid="stadium-seat-map"]:visible [data-testid="${testId}"]`).first();
const readSuwonZoomState = async (page) => visibleSuwonSeatMapTestId(page, 'suwon-seatmap-transform-layer').evaluate((node) => ({
  zoom: Number(node.getAttribute('data-zoom') ?? '1'),
  panX: Number(node.getAttribute('data-pan-x') ?? '0'),
  panY: Number(node.getAttribute('data-pan-y') ?? '0'),
  transform: window.getComputedStyle(node).transform,
}));

const collectMetrics = async (page) => page.evaluate(() => {
  const doc = document.documentElement;
  const hero = document.querySelector('.stadium-hero-container');
  const stadiumSelect = document.querySelector('#stadium-guide-select');
  const findVisibleSeatMap = () => Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
    .find((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  const findVisibleText = (selector, text) => Array.from(document.querySelectorAll(selector))
    .find((node) => {
      if (!node.textContent?.includes(text)) {
        return false;
      }
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  const seatMap = findVisibleSeatMap();
  const fallbackCard = document.querySelector('.stadium-guide-map-frame');
  const locationHeading = findVisibleText('h3', '구장 위치 & 단축 경로');
  const categoryHeading = findVisibleText('h3', '주변 정보 카테고리');
  const firstFoodTitle = findVisibleText('h4', '통밥');
  const openKakaoButton = Array.from(document.querySelectorAll('button'))
    .find((button) => button.textContent?.includes('카카오맵에서 열기'));
  const retryButton = Array.from(document.querySelectorAll('button'))
    .find((button) => button.textContent?.includes('지도 다시 시도'));
  const routeButton = Array.from(document.querySelectorAll('button'))
    .find((button) => button.textContent?.includes('카카오맵 길찾기'));
  const categoryButton = Array.from(document.querySelectorAll('button'))
    .find((button) => {
      if (!button.textContent?.includes('구장 먹거리')) return false;
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  const tooltip = document.querySelector('[data-testid="stadium-seat-tooltip"]');

  const serializeRect = (node) => {
    if (!node) {
      return null;
    }
    const rect = node.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    };
  };

  return {
    innerWidth: window.innerWidth,
    clientWidth: doc.clientWidth,
    scrollWidth: doc.scrollWidth,
    overflowX: doc.scrollWidth > doc.clientWidth,
    hero: serializeRect(hero),
    stadiumSelect: serializeRect(stadiumSelect),
    locationHeading: serializeRect(locationHeading),
    categoryHeading: serializeRect(categoryHeading),
    firstFoodTitle: serializeRect(firstFoodTitle),
    seatMap: serializeRect(seatMap),
    fallbackCard: serializeRect(fallbackCard),
    openKakaoButton: serializeRect(openKakaoButton),
    retryButton: serializeRect(retryButton),
    routeButton: serializeRect(routeButton),
    categoryButton: serializeRect(categoryButton),
    tooltip: serializeRect(tooltip),
  };
});

const collectSeatMapReview = async (page, stadium) => {
  await selectStadiumGuideOption(page, stadium.stadiumId);
  await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  await visibleTextLocator(page, stadium.expectedSeatMapLabel).waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('[data-testid="stadium-seat-map"]:visible', { hasText: stadium.expectedSeatMapLabel })
    .first()
    .waitFor({ state: 'visible', timeout: 10000 });
  await sleep(150);

  return page.evaluate((input) => {
    const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
      .find((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    const homeButton = seatMap?.querySelector('[aria-label*="홈 응원"]');
    const awayButton = seatMap?.querySelector('[aria-label*="원정 응원"]');

    const serializeRect = (node) => {
      if (!node) {
        return null;
      }
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const seatMapRect = serializeRect(seatMap);
    const homeRect = serializeRect(homeButton);
    const awayRect = serializeRect(awayButton);
    const seatMapCenterX = seatMapRect ? seatMapRect.left + seatMapRect.width / 2 : null;
    const homeCenterX = homeRect ? homeRect.left + homeRect.width / 2 : null;
    const awayCenterX = awayRect ? awayRect.left + awayRect.width / 2 : null;
    const homeSide = seatMapCenterX !== null && homeCenterX !== null
      ? homeCenterX < seatMapCenterX ? 'left' : 'right'
      : 'unknown';
    const awaySide = seatMapCenterX !== null && awayCenterX !== null
      ? awayCenterX < seatMapCenterX ? 'left' : 'right'
      : 'unknown';

    return {
      stadiumId: input.stadiumId,
      stadiumName: input.stadiumName,
      expectedSeatMapLabel: input.expectedSeatMapLabel,
      expectedHomeSide: input.expectedHomeSide,
      seatMapText: seatMap?.textContent ?? '',
      seatMapRect,
      homeRect,
      awayRect,
      homeSide,
      awaySide,
    };
  }, stadium);
};

const verifyJamsilOverlayClicks = async (page) => {
  await selectStadiumGuideOption(page, 'JAMSIL');
  await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  await visibleTextLocator(page, '잠실 블록 단위 안내도').waitFor({ state: 'visible', timeout: 5000 });

  const closeDetailPanel = async () => {
    const closeButton = page.locator('button[aria-label="닫기"]:visible').first();
    if (await closeButton.count()) {
      await closeButton.click({ timeout: 3000 }).catch(() => undefined);
      await sleep(60);
    }
  };
  const clickSeatMapSection = async (section) => {
    await section.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const targetY = window.innerHeight * 0.42;
      window.scrollBy(0, rect.top + rect.height / 2 - targetY);
    });
    await sleep(100);
    await section.click({ timeout: 5000, force: true });
  };

  await closeDetailPanel();

  const doosanReferenceTab = page.getByRole('button', { name: '두산 공식 구장 안내' }).first();
  if (await doosanReferenceTab.count()) {
    await doosanReferenceTab.click({ timeout: 5000 });
    await page.getByText('두산 공식 잠실야구장 안내').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByText('총 좌석수').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByText('25,000석').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByText('좌석수 안내').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: '층별 안내' }).first().click({ timeout: 5000 });
    await page.getByText('1층 안내').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: '1층 안내 확대 보기' }).first().click({ timeout: 5000 });
    await page.getByTestId('doosan-floor-image-dialog').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: '층별 안내 이미지 확대' }).first().click({ timeout: 5000 });
    await page.getByText('125%').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: '확대 보기 닫기' }).first().click({ timeout: 5000 });
    await page.getByTestId('doosan-floor-image-dialog').waitFor({ state: 'hidden', timeout: 5000 });
    await page.getByRole('button', { name: '출입구' }).first().click({ timeout: 5000 });
    await page.getByText('출입문 10개').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: '교통/주차' }).first().click({ timeout: 5000 });
    await page.getByText('종합운동장역').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByText('블록 선택은 LG 공식 좌석도 기준으로 제공합니다.').first().waitFor({ state: 'visible', timeout: 5000 });
    if (await page.getByText('실제 시야 사진', { exact: true }).count()) {
      throw new Error('Doosan official stadium guide tab should not open seat-view details.');
    }
    await page.getByRole('button', { name: 'LG 공식 좌석도' }).first().click({ timeout: 5000 });
  }

  if (await page.getByTestId('jamsil-official-seatmap-required').count()) {
    await page.getByText('MANUAL_BASEBALL_DATA_REQUIRED').first().waitFor({ state: 'visible', timeout: 5000 });
    return;
  }

  const verifyJamsilZoomInteraction = async () => {
    const zoomIn = visibleJamsilSeatMapTestId(page, 'jamsil-seatmap-zoom-in');
    const zoomReset = visibleJamsilSeatMapTestId(page, 'jamsil-seatmap-zoom-reset');
    const viewport = visibleJamsilSeatMapTestId(page, 'jamsil-seatmap-viewport');
    const transformLayer = visibleJamsilSeatMapTestId(page, 'jamsil-seatmap-transform-layer');

    await transformLayer.waitFor({ state: 'visible', timeout: 5000 });
    await scrollVisibleSeatMapIntoView(page);
    await zoomIn.click({ timeout: 5000 });
    await zoomIn.click({ timeout: 5000 });
    await page.waitForFunction(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="jamsil-seatmap-transform-layer"]');
      return Number(layer?.getAttribute('data-zoom') ?? '1') >= 1.5;
    }, null, { timeout: 5000 });

    const beforeDrag = await readJamsilZoomState(page);
    await viewport.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const focusY = rect.top + Math.min(rect.height * 0.35, window.innerHeight * 0.45);
      window.scrollBy(0, focusY - window.innerHeight * 0.48);
    });
    await sleep(150);
    const box = await viewport.boundingBox();
    if (!box) {
      throw new Error('Jamsil zoom viewport bounding box was not available.');
    }

    const pageViewport = page.viewportSize() ?? { width: 390, height: 844 };
    const visibleLeft = Math.max(box.x, 24);
    const visibleRight = Math.min(box.x + box.width, pageViewport.width - 24);
    const visibleTop = Math.max(box.y, 96);
    const visibleBottom = Math.min(box.y + box.height, pageViewport.height - 96);
    if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
      throw new Error(`Jamsil zoom viewport was not sufficiently visible for drag: ${JSON.stringify({ box, pageViewport })}`);
    }

    const startX = (visibleLeft + visibleRight) / 2;
    const startY = (visibleTop + visibleBottom) / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 64, startY + 38, { steps: 6 });
    await page.mouse.up();
    await page.waitForFunction(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="jamsil-seatmap-transform-layer"]');
      const panX = Number(layer?.getAttribute('data-pan-x') ?? '0');
      const panY = Number(layer?.getAttribute('data-pan-y') ?? '0');
      return Math.abs(panX) > 1 || Math.abs(panY) > 1;
    }, null, { timeout: 5000 });

    const afterDrag = await readJamsilZoomState(page);
    if (afterDrag.zoom < 1.5 || (afterDrag.panX === beforeDrag.panX && afterDrag.panY === beforeDrag.panY)) {
      throw new Error(`Jamsil zoom drag did not update transform state: ${JSON.stringify({ beforeDrag, afterDrag })}`);
    }

    await sleep(220);
    const zoomedSection = visibleSeatMapHitAreaByLabel(page, '110 블록 1루 테이블석 110');
    await dispatchSeatMapSectionClick(zoomedSection);
    await seatViewTitleLocator(page).waitFor({ state: 'visible', timeout: 5000 });
    await page.getByText('아직 등록된 시야가 없어요').waitFor({ state: 'visible', timeout: 5000 });
    await closeDetailPanel();

    await zoomReset.evaluate((node) => {
      node.click();
    });
    await page.waitForFunction(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="jamsil-seatmap-transform-layer"]');
      const zoom = Number(layer?.getAttribute('data-zoom') ?? '1');
      const panX = Number(layer?.getAttribute('data-pan-x') ?? '0');
      const panY = Number(layer?.getAttribute('data-pan-y') ?? '0');
      return zoom === 1 && panX === 0 && panY === 0;
    }, null, { timeout: 5000 });

    await viewport.evaluate((node) => {
      node.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
    await sleep(150);
    const doubleClickBox = await viewport.boundingBox();
    if (!doubleClickBox) {
      throw new Error('Jamsil zoom viewport bounding box was not available for double click.');
    }
    const doubleClickX = Math.min(Math.max(doubleClickBox.x + doubleClickBox.width * 0.5, 80), pageViewport.width - 80);
    const doubleClickY = Math.min(Math.max(doubleClickBox.y + doubleClickBox.height * 0.32, 120), pageViewport.height - 120);
    await page.mouse.dblclick(doubleClickX, doubleClickY);
    await page.waitForFunction(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="jamsil-seatmap-transform-layer"]');
      return Number(layer?.getAttribute('data-zoom') ?? '1') >= 1.7;
    }, null, { timeout: 5000 });

    await zoomReset.click({ timeout: 5000 });
    await page.waitForFunction(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="jamsil-seatmap-transform-layer"]');
      return Number(layer?.getAttribute('data-zoom') ?? '1') === 1;
    }, null, { timeout: 5000 });

    await visibleJamsilSeatMapTestId(page, 'jamsil-seatmap-fullscreen-open').click({ timeout: 5000 });
    const fullscreen = page.getByTestId('jamsil-seatmap-fullscreen');
    await fullscreen.waitFor({ state: 'visible', timeout: 5000 });
    await fullscreen.getByTestId('jamsil-seatmap-zoom-in').first().click({ timeout: 5000 });
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[data-testid="jamsil-seatmap-fullscreen"]');
      const layer = dialog?.querySelector('[data-testid="jamsil-seatmap-transform-layer"]');
      return Number(layer?.getAttribute('data-zoom') ?? '1') > 1;
    }, null, { timeout: 5000 });
    await fullscreen.getByTestId('jamsil-seatmap-fullscreen-close').click({ timeout: 5000 });
    await fullscreen.waitFor({ state: 'hidden', timeout: 5000 });
    await zoomReset.click({ timeout: 5000 });
    await closeDetailPanel();
    await sleep(320);
  };

  await verifyJamsilZoomInteraction();

  const representativeSections = [
    '중앙 프리미엄석',
    '1루 테이블석',
    '그린응원석',
  ];

  for (const sectionName of representativeSections) {
    await closeDetailPanel();
    await scrollVisibleSeatMapIntoView(page);
    const section = visibleSeatMapHitAreaByPartialLabel(page, sectionName);
    await section.click({ timeout: 5000, force: true });
    await seatViewTitleLocator(page).waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
      await dispatchSeatMapSectionClick(section);
      await seatViewTitleLocator(page).waitFor({ state: 'visible', timeout: 5000 });
    });
    await visibleTextLocator(page, '아직 등록된 시야가 없어요').waitFor({ state: 'visible', timeout: 7000 });
  }

  await closeDetailPanel();
};

const JAMSIL_FULL_CLICK_TARGETS = [
  { label: '101', ariaLabel: '101 블록 1루 레드석 101', detail: '101 블록 1루 레드석' },
  { label: '205', ariaLabel: '205 블록 1루 오렌지석 205', detail: '205 블록 1루 오렌지석' },
  { label: '312', ariaLabel: '312 블록 중앙 네이비석 312', detail: '312 블록 중앙 네이비석' },
  { label: '405', ariaLabel: '405 블록 외야 그린응원석 405', detail: '405 블록 외야 그린응원석' },
  { label: '422', ariaLabel: '422 블록 외야 그린석 422', detail: '422 블록 외야 그린석' },
  { label: '중앙 프리미엄석', ariaLabel: '중앙 프리미엄석 테라존', detail: '중앙 프리미엄석' },
  { label: '1루 익사이팅존', ariaLabel: '1루 익사이팅존 1루 익사이팅존', detail: '1루 익사이팅존' },
  { label: '3루 익사이팅존', ariaLabel: '3루 익사이팅존 3루 익사이팅존', detail: '3루 익사이팅존' },
  { label: '1루 휠체어석', ariaLabel: '1루 휠체어석 101B / 102B / 109B', detail: '1루 휠체어석' },
  { label: '3루 휠체어석', ariaLabel: '3루 휠체어석 114B / 121B / 122B', detail: '3루 휠체어석' },
];

const verifyJamsilFullOverlayClicks = async (page) => {
  await selectStadiumGuideOption(page, 'JAMSIL');
  await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  await visibleTextLocator(page, '잠실 블록 단위 안내도').waitFor({ state: 'visible', timeout: 5000 });

  if (await page.getByTestId('jamsil-official-seatmap-required').count()) {
    await page.getByText('MANUAL_BASEBALL_DATA_REQUIRED').first().waitFor({ state: 'visible', timeout: 5000 });
    return;
  }

  const closeDetailPanel = async () => {
    const closeButton = page.locator('button[aria-label="닫기"]:visible').first();
    if (await closeButton.count()) {
      await closeButton.click({ timeout: 3000 }).catch(() => undefined);
      await sleep(120);
    }
  };
  const waitForSeatViewGalleryState = async (targetLabel) => {
    await seatViewTitleLocator(page).waitFor({ state: 'visible', timeout: 5000 });
    const hasEmptyState = await page.getByText('아직 등록된 시야가 없어요').first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (hasEmptyState) {
      return;
    }

    const hasPhoto = await page.locator('img[alt*="시야"]:visible').first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (!hasPhoto) {
      throw new Error(`Jamsil seat-view gallery did not show empty state or photos for ${targetLabel}.`);
    }
  };

  const lgSeatmapTab = page.getByRole('button', { name: 'LG 공식 좌석도' }).first();
  if (await lgSeatmapTab.count()) {
    await lgSeatmapTab.click({ timeout: 5000 }).catch(() => undefined);
    await sleep(120);
  }

  const verifyJamsilFilterInteractions = async () => {
    const filterTargets = [
      { filterTestId: 'jamsil-filter-infield', ariaLabel: '101 블록 1루 레드석 101', detail: '101 블록 1루 레드석' },
      { filterTestId: 'jamsil-filter-premium', ariaLabel: '중앙 프리미엄석 테라존', detail: '중앙 프리미엄석' },
      { filterTestId: 'jamsil-filter-outfield', ariaLabel: '422 블록 외야 그린석 422', detail: '422 블록 외야 그린석' },
      { filterTestId: 'jamsil-filter-accessible', ariaLabel: '1루 휠체어석 101B / 102B / 109B', detail: '1루 휠체어석' },
    ];

    for (const target of filterTargets) {
      await closeDetailPanel();
      await clickVisibleSeatMapFilter(page, target.filterTestId);
      await scrollVisibleSeatMapIntoView(page);
      const section = visibleSeatMapHitAreaByLabel(page, target.ariaLabel);
      await clickSeatMapSection(section);
      await visibleTextLocator(page, target.detail).waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
        await dispatchSeatMapSectionClick(section);
        await visibleTextLocator(page, target.detail).waitFor({ state: 'visible', timeout: 5000 });
      });
    }

    await closeDetailPanel();
    await clickVisibleSeatMapFilter(page, 'jamsil-filter-all');
  };

  await verifyJamsilFilterInteractions();

  for (const target of JAMSIL_FULL_CLICK_TARGETS) {
    try {
      await closeDetailPanel();
      await scrollVisibleSeatMapIntoView(page);
      const section = visibleSeatMapHitAreaByLabel(page, target.ariaLabel);
      await clickSeatMapSection(section);
      await visibleTextLocator(page, target.detail).waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
        await dispatchSeatMapSectionClick(section);
        await visibleTextLocator(page, target.detail).waitFor({ state: 'visible', timeout: 5000 });
      });
      await waitForSeatViewGalleryState(target.label);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Jamsil official seatmap full click failed for ${target.label}: ${message}`);
    }
  }

  await closeDetailPanel();
};

const verifyIncheonOverlayClicks = async (page) => {
  await selectStadiumGuideOption(page, 'INCHEON');
  await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  await visibleTextLocator(page, '인천 SSG 공식 좌석도').waitFor({ state: 'visible', timeout: 5000 });

  const closeDetailPanel = async () => {
    const closedCount = await page.evaluate(() => {
      const activeSeatBlocks = Array.from(document.querySelectorAll('svg[aria-label="대전 한화생명볼파크 좌석도 구역 선택"] [data-testid^="daejeon-seat-block-"][aria-pressed="true"]'));
      activeSeatBlocks.forEach((block) => {
        block.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        }));
      });

      const closeButtons = Array.from(document.querySelectorAll('button[aria-label="닫기"]'))
        .filter((button) => {
          const rect = button.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      closeButtons.forEach((button) => {
        if (button instanceof HTMLButtonElement) {
          button.click();
        }
      });
      return activeSeatBlocks.length + closeButtons.length;
    }).catch(() => 0);
    if (closedCount > 0) {
      await sleep(200);
    }
  };

  const verifyZoomInteraction = async () => {
    const zoomIn = visibleIncheonSeatMapTestId(page, 'incheon-seatmap-zoom-in');
    const zoomReset = visibleIncheonSeatMapTestId(page, 'incheon-seatmap-zoom-reset');
    const viewport = visibleIncheonSeatMapTestId(page, 'incheon-seatmap-viewport');
    const transformLayer = visibleIncheonSeatMapTestId(page, 'incheon-seatmap-transform-layer');

    await transformLayer.waitFor({ state: 'visible', timeout: 5000 });
    await scrollVisibleSeatMapIntoView(page);
    await zoomIn.click({ timeout: 5000 });
    await zoomIn.click({ timeout: 5000 });
    await page.waitForFunction(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="incheon-seatmap-transform-layer"]');
      return Number(layer?.getAttribute('data-zoom') ?? '1') >= 1.5;
    }, null, { timeout: 5000 });

    const beforeDrag = await readIncheonZoomState(page);
    await viewport.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const focusY = rect.top + Math.min(rect.height * 0.25, window.innerHeight * 0.45);
      window.scrollBy(0, focusY - window.innerHeight * 0.48);
    });
    await sleep(150);
    const box = await viewport.boundingBox();
    if (!box) {
      throw new Error('Incheon zoom viewport bounding box was not available.');
    }

    const pageViewport = page.viewportSize() ?? { width: 390, height: 844 };
    const visibleLeft = Math.max(box.x, 24);
    const visibleRight = Math.min(box.x + box.width, pageViewport.width - 24);
    const visibleTop = Math.max(box.y, 96);
    const visibleBottom = Math.min(box.y + box.height, pageViewport.height - 96);
    if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
      throw new Error(`Incheon zoom viewport was not sufficiently visible for drag: ${JSON.stringify({ box, pageViewport })}`);
    }

    const startX = (visibleLeft + visibleRight) / 2;
    const startY = (visibleTop + visibleBottom) / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 70, startY + 40, { steps: 6 });
    await page.mouse.up();
    await page.waitForFunction(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="incheon-seatmap-transform-layer"]');
      const panX = Number(layer?.getAttribute('data-pan-x') ?? '0');
      const panY = Number(layer?.getAttribute('data-pan-y') ?? '0');
      return Math.abs(panX) > 1 || Math.abs(panY) > 1;
    }, null, { timeout: 5000 });

    const afterDrag = await readIncheonZoomState(page);
    if (afterDrag.zoom < 1.5 || (afterDrag.panX === beforeDrag.panX && afterDrag.panY === beforeDrag.panY)) {
      throw new Error(`Incheon zoom drag did not update transform state: ${JSON.stringify({ beforeDrag, afterDrag })}`);
    }

    await sleep(220);
    const zoomedSection = visibleSeatMapHitAreaByLabel(page, '101B 내야 필드석 101B');
    await clickSeatMapSection(zoomedSection);
    await seatViewTitleLocator(page).waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
      await dispatchSeatMapSectionClick(zoomedSection);
      await seatViewTitleLocator(page).waitFor({ state: 'visible', timeout: 5000 });
    });
    await page.getByText('아직 등록된 시야가 없어요').waitFor({ state: 'visible', timeout: 5000 });
    await closeDetailPanel();

    await zoomReset.click({ timeout: 5000 });
    await page.waitForFunction(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="incheon-seatmap-transform-layer"]');
      const zoom = Number(layer?.getAttribute('data-zoom') ?? '1');
      const panX = Number(layer?.getAttribute('data-pan-x') ?? '0');
      const panY = Number(layer?.getAttribute('data-pan-y') ?? '0');
      return zoom === 1 && panX === 0 && panY === 0;
    }, null, { timeout: 5000 });

    await viewport.evaluate((node) => {
      node.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
    await sleep(150);
    const doubleClickBox = await viewport.boundingBox();
    if (!doubleClickBox) {
      throw new Error('Incheon zoom viewport bounding box was not available for double click.');
    }
    const doubleClickX = Math.min(Math.max(doubleClickBox.x + doubleClickBox.width * 0.45, 80), pageViewport.width - 80);
    const doubleClickY = Math.min(Math.max(doubleClickBox.y + doubleClickBox.height * 0.25, 120), pageViewport.height - 120);
    await page.mouse.dblclick(doubleClickX, doubleClickY);
    await page.waitForFunction(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="incheon-seatmap-transform-layer"]');
      return Number(layer?.getAttribute('data-zoom') ?? '1') >= 1.7;
    }, null, { timeout: 5000 });

    await zoomReset.click({ timeout: 5000 });
    await page.waitForFunction(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="incheon-seatmap-transform-layer"]');
      return Number(layer?.getAttribute('data-zoom') ?? '1') === 1;
    }, null, { timeout: 5000 });
    await closeDetailPanel();
    await sleep(320);

    await zoomIn.click({ timeout: 5000 });
    await zoomIn.click({ timeout: 5000 });
    await page.waitForFunction(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="incheon-seatmap-transform-layer"]');
      return Number(layer?.getAttribute('data-zoom') ?? '1') >= 1.5;
    }, null, { timeout: 5000 });
    const beforeCenter = await readIncheonZoomState(page);
    const farSection = visibleSeatMapHitAreaByLabel(page, '410B 4층 SKY뷰석 410B');
    await dispatchSeatMapSectionClick(farSection);
    await seatViewTitleLocator(page).waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction((previous) => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="incheon-seatmap-transform-layer"]');
      const panX = Number(layer?.getAttribute('data-pan-x') ?? '0');
      const panY = Number(layer?.getAttribute('data-pan-y') ?? '0');
      return Math.abs(panX - previous.panX) > 1 || Math.abs(panY - previous.panY) > 1;
    }, beforeCenter, { timeout: 5000 });
    await closeDetailPanel();
    await zoomReset.click({ timeout: 5000 });

    await viewport.evaluate((node) => {
      node.scrollIntoView({ block: 'center', inline: 'nearest' });
      const rect = node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + Math.min(rect.height * 0.28, window.innerHeight * 0.42);
      const fire = (type, pointerId, clientX, clientY, buttons) => {
        node.dispatchEvent(new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId,
          pointerType: 'touch',
          isPrimary: pointerId === 11,
          button: 0,
          buttons,
          clientX,
          clientY,
        }));
      };
      fire('pointerdown', 11, centerX - 45, centerY, 1);
      fire('pointerdown', 12, centerX + 45, centerY, 1);
      fire('pointermove', 11, centerX - 95, centerY - 4, 1);
      fire('pointermove', 12, centerX + 95, centerY + 4, 1);
      fire('pointerup', 11, centerX - 95, centerY - 4, 0);
      fire('pointerup', 12, centerX + 95, centerY + 4, 0);
    });
    await page.waitForFunction(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="incheon-seatmap-transform-layer"]');
      return Number(layer?.getAttribute('data-zoom') ?? '1') > 1.2;
    }, null, { timeout: 5000 });
    await zoomReset.click({ timeout: 5000 });
    await page.waitForFunction(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="incheon-seatmap-transform-layer"]');
      const zoom = Number(layer?.getAttribute('data-zoom') ?? '1');
      const panX = Number(layer?.getAttribute('data-pan-x') ?? '0');
      const panY = Number(layer?.getAttribute('data-pan-y') ?? '0');
      return zoom === 1 && panX === 0 && panY === 0;
    }, null, { timeout: 5000 });

    await visibleIncheonSeatMapTestId(page, 'incheon-seatmap-fullscreen-open').click({ timeout: 5000 });
    const fullscreen = page.getByTestId('incheon-seatmap-fullscreen');
    await fullscreen.waitFor({ state: 'visible', timeout: 5000 });
    const fullscreenZoomIn = fullscreen.getByTestId('incheon-seatmap-zoom-in').first();
    const fullscreenLayer = fullscreen.getByTestId('incheon-seatmap-transform-layer').first();
    await fullscreenZoomIn.click({ timeout: 5000 });
    await fullscreenLayer.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[data-testid="incheon-seatmap-fullscreen"]');
      const layer = dialog?.querySelector('[data-testid="incheon-seatmap-transform-layer"]');
      return Number(layer?.getAttribute('data-zoom') ?? '1') > 1;
    }, null, { timeout: 5000 });
    await fullscreen.getByTestId('incheon-seatmap-fullscreen-close').click({ timeout: 5000 });
    await fullscreen.waitFor({ state: 'hidden', timeout: 5000 });
    await zoomReset.click({ timeout: 5000 });
    await page.waitForFunction(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = seatMap?.querySelector('[data-testid="incheon-seatmap-transform-layer"]');
      const zoom = Number(layer?.getAttribute('data-zoom') ?? '1');
      const panX = Number(layer?.getAttribute('data-pan-x') ?? '0');
      const panY = Number(layer?.getAttribute('data-pan-y') ?? '0');
      return zoom === 1 && panX === 0 && panY === 0;
    }, null, { timeout: 5000 });
    await closeDetailPanel();
    await sleep(180);
  };

  await verifyZoomInteraction();

  const representativeSections = [
    { label: '101B', ariaLabel: '101B 내야 필드석 101B' },
    { label: 'N3', ariaLabel: 'N3 으쓱이존 N3' },
    { label: '28B', ariaLabel: '28B 원정응원석 28B' },
    { label: '8B', ariaLabel: '8B 요기요 내야패밀리존 8B' },
    { label: '25B', ariaLabel: '25B 덕아웃 상단석 25B' },
    { label: '410B', ariaLabel: '410B 4층 SKY뷰석 410B' },
    { label: '휠체어석 25B', ariaLabel: '휠체어석 25B', partial: true },
    { label: '휠체어석 23B', ariaLabel: '휠체어석 23B', partial: true },
    { label: '휠체어석 9B', ariaLabel: '휠체어석 9B', partial: true },
    { label: '휠체어석 8B', ariaLabel: '휠체어석 8B', partial: true },
  ];

  for (const sectionItem of representativeSections) {
    try {
      await closeDetailPanel();
      await scrollVisibleSeatMapIntoView(page);
      const section = sectionItem.partial
        ? visibleSeatMapHitAreaByPartialLabel(page, sectionItem.ariaLabel)
        : visibleSeatMapHitAreaByLabel(page, sectionItem.ariaLabel);
      await clickSeatMapSection(section);
      await seatViewTitleLocator(page).waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
        await dispatchSeatMapSectionClick(section);
        await seatViewTitleLocator(page).waitFor({ state: 'visible', timeout: 5000 });
      });
      await page.getByText('아직 등록된 시야가 없어요').waitFor({ state: 'visible', timeout: 5000 });
    } catch (error) {
      throw new Error(`Incheon official seatmap click failed for ${sectionItem.label}: ${error.message}`);
    }
  }

  await closeDetailPanel();
};

const verifyIncheonFullOverlayClicks = async (page) => {
  await selectStadiumGuideOption(page, 'INCHEON');
  await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  await visibleTextLocator(page, '인천 SSG 공식 좌석도').waitFor({ state: 'visible', timeout: 5000 });

  const closeDetailPanel = async () => {
    const closeButton = page.locator('button[aria-label="닫기"]:visible').first();
    if (await closeButton.count()) {
      await closeButton.click({ timeout: 3000 }).catch(() => undefined);
      await sleep(120);
    }
  };
  const hitAreas = page.locator('[data-testid="stadium-seat-map"]:visible svg [role="button"]');
  await page.waitForFunction(() => {
    const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
      .find((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    return (seatMap?.querySelectorAll('svg [role="button"]').length ?? 0) >= 150;
  }, null, { timeout: 10000 });
  const hitAreaCount = await hitAreas.count();
  if (hitAreaCount < 150) {
    throw new Error(`Incheon official seatmap full click check expected at least 150 hit areas, got ${hitAreaCount}.`);
  }

  const verifyIncheonFilterInteractions = async () => {
    const filterTargets = [
      { filterTestId: 'incheon-filter-field', ariaLabel: '101B 내야 필드석 101B', detail: '101B' },
      { filterTestId: 'incheon-filter-table', ariaLabel: '8B 요기요 내야패밀리존 8B', detail: '8B' },
      { filterTestId: 'incheon-filter-cheer', ariaLabel: 'N3 으쓱이존 N3', detail: 'N3' },
      { filterTestId: 'incheon-filter-accessible', ariaLabel: '휠체어석 25B', detail: '휠체어석 25B', partial: true },
    ];

    for (const target of filterTargets) {
      await closeDetailPanel();
      await clickVisibleSeatMapFilter(page, target.filterTestId);
      await scrollVisibleSeatMapIntoView(page);
      const section = target.partial
        ? visibleSeatMapHitAreaByPartialLabel(page, target.ariaLabel)
        : visibleSeatMapHitAreaByLabel(page, target.ariaLabel);
      await clickSeatMapSection(section);
      await page.waitForFunction(({ label, partial }) => {
        const buttons = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"] svg [role="button"]'));
        return buttons.some((button) => {
          const ariaLabel = button.getAttribute('aria-label') ?? '';
          return (partial ? ariaLabel.includes(label) : ariaLabel === label)
            && button.getAttribute('aria-pressed') === 'true';
        });
      }, { label: target.ariaLabel, partial: Boolean(target.partial) }, { timeout: 5000 }).catch(async () => {
        await dispatchSeatMapSectionClick(section);
        await page.waitForFunction(({ label, partial }) => {
          const buttons = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"] svg [role="button"]'));
          return buttons.some((button) => {
            const ariaLabel = button.getAttribute('aria-label') ?? '';
            return (partial ? ariaLabel.includes(label) : ariaLabel === label)
              && button.getAttribute('aria-pressed') === 'true';
          });
        }, { label: target.ariaLabel, partial: Boolean(target.partial) }, { timeout: 5000 });
      });
      await seatViewTitleLocator(page).waitFor({ state: 'visible', timeout: 5000 });
    }

    await closeDetailPanel();
    await clickVisibleSeatMapFilter(page, 'incheon-filter-all');
  };

  await verifyIncheonFilterInteractions();

  try {
    await closeDetailPanel();
    await hitAreas.evaluateAll((nodes) => {
      nodes.forEach((node) => {
        node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      });
    });
    await seatViewTitleLocator(page).waitFor({ state: 'visible', timeout: 5000 });
    await page.getByText('아직 등록된 시야가 없어요').waitFor({ state: 'visible', timeout: 5000 });
  } catch (error) {
    throw new Error(`Incheon official seatmap full click failed across ${hitAreaCount} hit areas: ${error.message}`);
  }

  await closeDetailPanel();
};

const verifyGocheokOverlayClicks = async (page) => {
  await selectStadiumGuideOption(page, 'GOCHEOK');
  await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  await waitForVisibleSeatMapText(page, '고척 키움 공식 좌석도', 10000);

  if (await page.getByTestId('gocheok-official-seatmap-required').count()) {
    await page.getByText('MANUAL_BASEBALL_DATA_REQUIRED').first().waitFor({ state: 'visible', timeout: 5000 });
    return;
  }

  const captureGocheokDebugOverlayScreenshots = async () => {
    const viewport = page.viewportSize();
    const suffix = `${viewport?.width ?? 'unknown'}x${viewport?.height ?? 'unknown'}`;
    await page.screenshot({
      path: path.join(outputRoot, `gocheok-debug-overlay-full-${suffix}.png`),
      fullPage: true,
      animations: 'disabled',
    }).catch(() => undefined);

    await scrollVisibleSeatMapIntoView(page);
    const seatMap = visibleSeatMapLocator(page).first();
    await seatMap.screenshot({
      path: path.join(outputRoot, `gocheok-debug-overlay-seatmap-${suffix}.png`),
      animations: 'disabled',
    }).catch(() => undefined);
  };

  if (shouldCaptureGocheokDebugOverlay) {
    await captureGocheokDebugOverlayScreenshots();
  }

  const closeDetailPanel = async () => {
    const closeButton = page.getByRole('button', { name: '닫기' }).first();
    if (await closeButton.count()) {
      await closeButton.click({ timeout: 3000 }).catch(() => undefined);
      await sleep(150);
    }
  };

  const verifyGocheokViewportControls = async () => {
    await closeDetailPanel();
    await scrollVisibleSeatMapIntoView(page);
    const visibleGocheokTestId = (testId) => page.locator(`[data-testid="${testId}"]:visible`).first();
    const viewport = visibleGocheokTestId('gocheok-seatmap-viewport');
    await viewport.waitFor({ state: 'visible', timeout: 5000 });
    const transformLayer = visibleGocheokTestId('gocheok-seatmap-transform-layer');
    await transformLayer.waitFor({ state: 'visible', timeout: 5000 });

    const fullscreenButton = visibleGocheokTestId('gocheok-seatmap-fullscreen-open');
    if (await fullscreenButton.count()) {
      await fullscreenButton.click({ timeout: 5000 });
      await visibleGocheokTestId('gocheok-seatmap-fullscreen').waitFor({ state: 'visible', timeout: 5000 });
      await visibleGocheokTestId('gocheok-seatmap-fullscreen-close').click({ timeout: 5000 });
      await page.getByTestId('gocheok-seatmap-fullscreen').first().waitFor({ state: 'hidden', timeout: 5000 });
      await scrollVisibleSeatMapIntoView(page);
    }

    await visibleGocheokTestId('gocheok-seatmap-zoom-in').click({ timeout: 5000 });
    await page.waitForFunction(() => (
      Array.from(document.querySelectorAll('[data-testid="gocheok-seatmap-transform-layer"]')).some((element) => (
        element.getClientRects().length > 0 && element.getAttribute('data-zoom') === '1.25'
      ))
    ), null, { timeout: 5000 });
    await visibleGocheokTestId('gocheok-seatmap-zoom-reset').click({ timeout: 5000 });
    await page.waitForFunction(() => (
      Array.from(document.querySelectorAll('[data-testid="gocheok-seatmap-transform-layer"]')).some((element) => (
        element.getClientRects().length > 0 && element.getAttribute('data-zoom') === '1.00'
      ))
    ), null, { timeout: 5000 });
  };

  await verifyGocheokViewportControls();

  const representativeSections = [
    /D04 다이아몬드석|D04/,
    /T07 테이블석|T07/,
    /T06 테이블석|T06/,
    /T04 테이블석|T04/,
    /T01 테이블석|T01/,
    /T11 테이블석|T11/,
    /T15 테이블석|T15/,
    /T13 테이블석|T13/,
    /101 버건디석|101/,
    /114 버건디석|114/,
    /401 골드 내야석|401/,
    /424 골드 내야석|424/,
    /430 외야 지정석|430/,
    /431 외야 지정석|431/,
    /425 외야 지정석|425/,
  ];

  for (const sectionName of representativeSections) {
    await closeDetailPanel();
    await scrollVisibleSeatMapIntoView(page);
    const seatMapOverlay = page.locator('[data-testid="gocheok-seatmap-svg"]:visible').first();
    const section = seatMapOverlay.getByRole('button', { name: sectionName }).first();
    const waitForSelectedBlock = async (timeout = 5000) => page.waitForFunction((patternSource) => {
      const pattern = new RegExp(patternSource);
      const buttons = Array.from(document.querySelectorAll('[data-testid="gocheok-seatmap-svg"] [role="button"]'));
      return buttons.some((button) => (
        pattern.test(button.getAttribute('aria-label') ?? '')
        && button.getAttribute('aria-pressed') === 'true'
      ));
    }, sectionName.source, { timeout });

    await section.click({ timeout: 5000, force: true });
    const clickSelected = await waitForSelectedBlock(1200)
      .then(() => true)
      .catch(() => false);
    if (!clickSelected) {
      await section.focus({ timeout: 5000 });
      await page.keyboard.press('Enter');
    }
    await waitForSelectedBlock(5000);
    const seatViewTitle = page.getByText('실제 시야 사진', { exact: true }).first();
    await seatViewTitle.waitFor({ state: 'attached', timeout: 5000 });
    await seatViewTitle.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => undefined);
    await page.evaluate(() => {
      const sheets = Array.from(document.querySelectorAll('.fixed.bottom-0'));
      const sheet = sheets.find((element) => element.textContent?.includes('실제 시야 사진'));
      const scroller = sheet?.querySelector('.overflow-y-auto');
      if (scroller) {
        scroller.scrollTop = scroller.scrollHeight;
      }
    });
    const emptyGalleryText = page.getByText('아직 등록된 시야가 없어요', { exact: true }).first();
    await emptyGalleryText.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => undefined);
    await emptyGalleryText.waitFor({ state: 'attached', timeout: 10000 });
    await page.getByRole('button', { name: /시야 사진 올리기|다이어리에서 시야 사진 공유하기/ }).first()
      .waitFor({ state: 'visible', timeout: 5000 });
  }

  const verifyGocheokFullClickCheck = async () => {
    await closeDetailPanel();
    await scrollVisibleSeatMapIntoView(page);
    const seatMapOverlay = page.locator('[data-testid="gocheok-seatmap-svg"]:visible').first();
    const hitAreas = seatMapOverlay.locator('[data-testid="gocheok-seatmap-hit-area"]');
    const hitAreaCount = await hitAreas.count();
    if (hitAreaCount < 150) {
      throw new Error(`Gocheok official seatmap full click check expected at least 150 hit areas, got ${hitAreaCount}.`);
    }

    const verifyGocheokFilterInteractions = async () => {
      const filterTargets = [
        { filterTestId: 'gocheok-filter-infield', pattern: /101 버건디석|101/ },
        { filterTestId: 'gocheok-filter-premium', pattern: /T07 테이블석|T07/ },
        { filterTestId: 'gocheok-filter-outfield', pattern: /430 외야 지정석|430/ },
        { filterTestId: 'gocheok-filter-accessible', pattern: /휠체어석/ },
      ];

      for (const target of filterTargets) {
        await closeDetailPanel();
        await clickVisibleSeatMapFilter(page, target.filterTestId);
        await scrollVisibleSeatMapIntoView(page);
        const section = seatMapOverlay.getByRole('button', { name: target.pattern }).first();
        await section.click({ timeout: 5000, force: true });
        await page.waitForFunction((patternSource) => {
          const pattern = new RegExp(patternSource);
          const buttons = Array.from(document.querySelectorAll('[data-testid="gocheok-seatmap-svg"] [role="button"]'));
          return buttons.some((button) => (
            pattern.test(button.getAttribute('aria-label') ?? '')
            && button.getAttribute('aria-pressed') === 'true'
          ));
        }, target.pattern.source, { timeout: 5000 });
      }

      await closeDetailPanel();
      await clickVisibleSeatMapFilter(page, 'gocheok-filter-all');
    };

    await verifyGocheokFilterInteractions();

    const blockIds = await hitAreas.evaluateAll((nodes) => nodes
      .map((node) => node.getAttribute('data-block-id'))
      .filter(Boolean));

    for (const blockId of blockIds) {
      await page.evaluate((id) => {
        const button = document.querySelector(`[data-testid="gocheok-seatmap-hit-area"][data-block-id="${id}"]`);
        if (!button) return false;
        button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        return true;
      }, blockId);
      await page.waitForFunction((id) => {
        const button = document.querySelector(`[data-testid="gocheok-seatmap-hit-area"][data-block-id="${id}"]`);
        return button?.getAttribute('aria-pressed') === 'true';
      }, blockId, { timeout: 5000 });
    }

    await page.getByText('실제 시야 사진', { exact: true }).first().waitFor({ state: 'attached', timeout: 5000 });
    await closeDetailPanel();
  };

  if (shouldRunGocheokFullClickCheck) {
    await verifyGocheokFullClickCheck();
  }

  await closeDetailPanel();
  await page.getByRole('button', { name: '시설현황' }).first().click({ timeout: 5000 });
  await visibleTextLocator(page, '서울시설공단 공식 시설현황').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText(/관람석\s+16,601석/).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText(/주차면수\s+484면/).first().waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('link', { name: '공식 출처' }).first().waitFor({ state: 'visible', timeout: 5000 });

  const missingFacilityAsset = page.getByTestId('gocheok-facility-asset-required').first();
  if (await missingFacilityAsset.count()) {
    await missingFacilityAsset.waitFor({ state: 'visible', timeout: 5000 });
    await page.getByText('MANUAL_BASEBALL_DATA_REQUIRED').first().waitFor({ state: 'visible', timeout: 5000 });
  } else {
    await page.getByRole('button', { name: /확대 보기/ }).first().waitFor({ state: 'visible', timeout: 5000 });
  }

  await page.getByRole('button', { name: '공식 좌석도' }).first().click({ timeout: 5000 });
  await waitForVisibleSeatMapText(page, '고척 키움 공식 좌석도', 10000);
};

const verifyGwangjuOverlayClicks = async (page) => {
  await selectStadiumGuideOption(page, 'GWANGJU');
  await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  await visibleTextLocator(page, '광주 KIA 공식 좌석도').waitFor({ state: 'visible', timeout: 5000 });
  await visibleTextLocator(page, '광주-KIA 챔피언스필드').waitFor({ state: 'visible', timeout: 5000 });

  if (await page.getByTestId('gwangju-official-seatmap-required').count()) {
    await visibleTextLocator(page, 'MANUAL_BASEBALL_DATA_REQUIRED').waitFor({ state: 'visible', timeout: 5000 });
    return;
  }

  const hasCoordinateNotice = await page.getByTestId('gwangju-seatmap-coordinate-pending').count();
  if (hasCoordinateNotice) {
    const coordinateNotice = page.locator(':visible', { hasText: /좌표 보정 중/ }).first();
    await coordinateNotice.waitFor({ state: 'visible', timeout: 5000 });
  }
  const partialPendingNoticeCount = await page.locator(':visible', { hasText: '일부 좌석 선택 준비 중' }).count();
  if (partialPendingNoticeCount > 0) {
    throw new Error('Gwangju normal seatmap should not show partial pending notice.');
  }

  const captureGwangjuTraceReviewScreenshots = async () => {
    const viewport = page.viewportSize();
    const suffix = `${viewport?.width ?? 'unknown'}x${viewport?.height ?? 'unknown'}`;
    await page.screenshot({
      path: path.join(outputRoot, `gwangju-trace-review-full-${suffix}.png`),
      fullPage: true,
      animations: 'disabled',
    }).catch(() => undefined);

    await scrollVisibleSeatMapIntoView(page);
    await visibleSeatMapLocator(page).screenshot({
      path: path.join(outputRoot, `gwangju-trace-review-seatmap-${suffix}.png`),
      animations: 'disabled',
    }).catch(() => undefined);
    const clip = await page.evaluate(() => {
      const svg = Array.from(document.querySelectorAll('svg[aria-label="광주-KIA 챔피언스필드 좌석도 구역 선택"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const frame = svg?.parentElement?.parentElement;
      if (!(frame instanceof HTMLElement)) return null;
      const rect = frame.getBoundingClientRect();
      const padding = 12;
      const x = Math.max(0, rect.left - padding);
      const y = Math.max(0, rect.top - padding);
      return {
        x,
        y,
        width: Math.min(window.innerWidth - x, rect.width + padding * 2),
        height: Math.min(window.innerHeight - y, rect.height + padding * 2),
      };
    });

    if (clip) {
      await page.screenshot({
        path: path.join(outputRoot, `gwangju-trace-review-seatmap-crop-${suffix}.png`),
        clip,
        animations: 'disabled',
      }).catch(() => undefined);
    }
  };

  if (shouldCaptureGwangjuDebugOverlay) {
    await captureGwangjuTraceReviewScreenshots();
  }

  const closeDetailPanel = async () => {
    const closeButton = page.locator('button[aria-label="닫기"]:visible').first();
    if (await closeButton.count()) {
      await closeButton.click({ timeout: 3000 }).catch(() => undefined);
      await sleep(150);
    }
  };

  const seatMapOverlay = page.locator('svg[aria-label="광주-KIA 챔피언스필드 좌석도 구역 선택"]:visible').first();
  const seatMapCard = visibleSeatMapLocator(page);
  const clickableSections = await seatMapOverlay.getByRole('button').count();
  if (clickableSections === 0) {
    if (hasCoordinateNotice) {
      return;
    }
    throw new Error('Gwangju seat map has no clickable sections');
  }
  const cheerTargetTraceFailures = await page.evaluate(() => Array.from(
    document.querySelectorAll('svg[aria-label="광주-KIA 챔피언스필드 좌석도 구역 선택"] [role="button"]'),
  )
    .filter((element) => /K7석|홈 응원석|원정응원석|원정/.test(element.getAttribute('aria-label') ?? ''))
    .map((element) => ({
      ariaLabel: element.getAttribute('aria-label') ?? '',
      traceStatus: element.getAttribute('data-trace-status') ?? '',
      pixelAlignmentStatus: element.getAttribute('data-pixel-alignment-status') ?? '',
    }))
    .filter((target) => (
      target.traceStatus !== 'OFFICIAL_IMAGE_TRACED'
      || target.pixelAlignmentStatus !== 'PIXEL_ALIGNED'
    )));
  if (cheerTargetTraceFailures.length > 0) {
    throw new Error(`Gwangju K7/AWAY sections must be official-traced before becoming clickable: ${JSON.stringify(cheerTargetTraceFailures)}`);
  }
  const markerOnlyTargets = await seatMapOverlay.getByRole('button', { name: /EV석|1루 EV석|3루 EV석/ }).count();
  if (markerOnlyTargets > 0) {
    throw new Error('Gwangju legend marker sections such as EV/M should not be clickable hit areas.');
  }
  const markerClickPoints = [
    { label: 'M/EV marker near 527/528', x: 329, y: 489 },
    { label: 'M/EV marker near 518/519', x: 331, y: 872 },
    { label: 'M/EV marker near 508/509', x: 704, y: 1051 },
    { label: 'N/5F table marker near 535', x: 528, y: 231 },
    { label: 'N/5F table marker near 524', x: 330, y: 674 },
    { label: 'N/5F table marker near 512/513', x: 565, y: 1026 },
    { label: 'N/5F table marker near 501/502', x: 1073, y: 945 },
  ];

  for (const point of markerClickPoints) {
    await closeDetailPanel();
    await scrollVisibleSeatMapIntoView(page);
    const clientPoint = await seatMapOverlay.evaluate((svg, markerPoint) => {
      const rect = svg.getBoundingClientRect();
      const viewBox = svg.viewBox.baseVal;
      return {
        x: rect.left + ((markerPoint.x - viewBox.x) / viewBox.width) * rect.width,
        y: rect.top + ((markerPoint.y - viewBox.y) / viewBox.height) * rect.height,
      };
    }, point);
    await page.mouse.click(clientPoint.x, clientPoint.y);
    await sleep(150);

    const selectedAfterMarkerClick = await page.evaluate(() => Array.from(
      document.querySelectorAll('svg[aria-label="광주-KIA 챔피언스필드 좌석도 구역 선택"] [role="button"]'),
    ).filter((button) => button.getAttribute('aria-pressed') === 'true').length);
    if (selectedAfterMarkerClick > 0) {
      throw new Error(`Gwangju marker-only point should not select a seat block: ${point.label}`);
    }

    const detailPanelAfterMarkerClick = await page.locator('button[aria-label="닫기"]:visible').count();
    if (detailPanelAfterMarkerClick > 0) {
      throw new Error(`Gwangju marker-only point should not open seat details: ${point.label}`);
    }
  }

  const clickGwangjuFilter = async (label) => {
    const clicked = await page.evaluate((filterLabel) => {
      const isVisible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      };
      const buttons = Array.from(document.querySelectorAll('[data-testid^="gwangju-filter-"]'))
        .filter((candidate) => candidate.textContent?.trim() === filterLabel && isVisible(candidate));
      buttons.forEach((button) => button.click());
      return buttons.length;
    }, label);
    if (clicked === 0) {
      throw new Error(`Gwangju filter button not found in visible seat map panel: ${label}`);
    }
    await page.waitForFunction((filterLabel) => {
      const svg = Array.from(document.querySelectorAll('svg[aria-label="광주-KIA 챔피언스필드 좌석도 구역 선택"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      if (!svg) return false;
      return Array.from(document.querySelectorAll('[data-testid^="gwangju-filter-"]'))
        .some((button) => button.textContent?.trim() === filterLabel && button.getAttribute('aria-pressed') === 'true');
    }, label, { timeout: 5000 });
    await sleep(250);
  };
  const countGwangjuInteractiveSeatBlock = async (blockId) => page.evaluate((targetBlockId) => {
    const svg = Array.from(document.querySelectorAll('svg[aria-label="광주-KIA 챔피언스필드 좌석도 구역 선택"]'))
      .find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    if (!svg) return 0;
    return svg.querySelectorAll(`[data-testid="gwangju-seat-block-${targetBlockId}"][role="button"]`).length;
  }, blockId);
  const readGwangjuDerivedRangeSummary = async () => page.evaluate(() => Array.from(
    document.querySelectorAll('[data-testid="gwangju-derived-range-summary"]'),
  )
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    })
    .map((element) => ({
      id: element.getAttribute('data-derived-range-id'),
      text: element.textContent ?? '',
    })));
  const assertGwangjuDerivedRangeSummary = async (expectedId, expectedText, message) => {
    const summaries = await readGwangjuDerivedRangeSummary();
    if (!summaries.some((summary) => summary.id === expectedId && summary.text.includes(expectedText))) {
      throw new Error(message);
    }
  };
  const clickGwangjuSeatBlockById = async (blockId) => {
    const clicked = await page.evaluate((targetBlockId) => {
      const isVisible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };
      const block = Array.from(document.querySelectorAll(`[data-testid="gwangju-seat-block-${targetBlockId}"]`))
        .find((candidate) => isVisible(candidate));
      if (!block) return false;
      block.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return true;
    }, blockId);
    if (!clicked) {
      throw new Error(`Gwangju seat block not found for derived range badge QA: ${blockId}`);
    }
    await sleep(250);
  };
  const readGwangjuVisibleDerivedRangeBadges = async () => page.evaluate(() => {
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    return Array.from(document.querySelectorAll(
      '[data-testid^="gwangju-section-derived-range-"], [data-testid^="gwangju-bottom-sheet-derived-range-"]',
    ))
      .filter((element) => isVisible(element))
      .map((element) => ({
        id: element.getAttribute('data-derived-range-id'),
        blocks: element.getAttribute('data-derived-blocks'),
        text: element.textContent ?? '',
      }));
  });
  const assertGwangjuDerivedRangeBadges = async (blockId, expectedRanges, forbiddenRangeIds, message) => {
    await closeDetailPanel();
    await scrollVisibleSeatMapIntoView(page);
    await clickGwangjuSeatBlockById(blockId);
    const badges = await readGwangjuVisibleDerivedRangeBadges();
    const missing = expectedRanges.filter((expected) => !badges.some((badge) => (
      badge.id === expected.id && badge.blocks === expected.blocks && badge.text.includes(expected.label)
    )));
    const unexpected = badges.filter((badge) => forbiddenRangeIds.includes(badge.id ?? '')).map((badge) => badge.id);

    if (missing.length > 0 || unexpected.length > 0) {
      throw new Error(`${message} missing=${JSON.stringify(missing)} unexpected=${JSON.stringify(unexpected)} badges=${JSON.stringify(badges)}`);
    }
  };

  await closeDetailPanel();
  await scrollVisibleSeatMapIntoView(page);
  const zoomIn = seatMapCard.getByRole('button', { name: '확대' }).first();
  const zoomReset = seatMapCard.getByRole('button', { name: '원래 크기' }).first();
  await zoomIn.click({ timeout: 5000 });
  await seatMapCard.getByText('1.3x', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  await zoomReset.click({ timeout: 5000 });
  await seatMapCard.getByText('1.0x', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });

  await clickGwangjuFilter('내야석');
  if (await countGwangjuInteractiveSeatBlock('k5-101') === 0) {
    throw new Error('Gwangju infield filter should keep infield seat blocks interactive.');
  }
  if (await countGwangjuInteractiveSeatBlock('sky-picnic-s-303') > 0) {
    throw new Error('Gwangju infield filter should hide sky picnic seat hit-areas.');
  }

  await clickGwangjuFilter('K7석');
  await assertGwangjuDerivedRangeSummary(
    'derived-k7-seats',
    '107~111, 118~122',
    'Gwangju K7 derived range summary should display 107~111, 118~122.',
  );
  await assertGwangjuDerivedRangeSummary(
    'derived-k7-seats',
    '111 중립',
    'Gwangju K7 derived range summary should mark neutral block 111.',
  );
  if (await countGwangjuInteractiveSeatBlock('k7-107') === 0) {
    throw new Error('Gwangju K7 filter should keep away K7 block-range interactive.');
  }
  if (await countGwangjuInteractiveSeatBlock('k7-118') === 0) {
    throw new Error('Gwangju K7 filter should keep home K7 block-range interactive.');
  }
  if (await countGwangjuInteractiveSeatBlock('k7-111') === 0) {
    throw new Error('Gwangju K7 filter should keep neutral K7 block 111 interactive.');
  }
  if (await countGwangjuInteractiveSeatBlock('k5-101') > 0) {
    throw new Error('Gwangju K7 filter should hide non-K7 infield seat hit-areas.');
  }

  await clickGwangjuFilter('응원석');
  if (await countGwangjuInteractiveSeatBlock('k7-107') === 0) {
    throw new Error('Gwangju cheering filter should keep away cheering K7 blocks interactive.');
  }
  if (await countGwangjuInteractiveSeatBlock('k7-118') === 0) {
    throw new Error('Gwangju cheering filter should keep home cheering K7 blocks interactive.');
  }
  if (await countGwangjuInteractiveSeatBlock('k7-111') > 0) {
    throw new Error('Gwangju cheering filter should hide neutral K7 block 111.');
  }

  await clickGwangjuFilter('홈 응원석');
  await assertGwangjuDerivedRangeSummary(
    'derived-home-cheering-seats',
    '118~122',
    'Gwangju home cheering derived range summary should display 118~122.',
  );
  if (await countGwangjuInteractiveSeatBlock('k7-118') === 0) {
    throw new Error('Gwangju home cheering filter should keep 118-122 K7 blocks interactive.');
  }
  if (await countGwangjuInteractiveSeatBlock('k7-107') > 0) {
    throw new Error('Gwangju home cheering filter should hide away cheering K7 blocks.');
  }
  if (await countGwangjuInteractiveSeatBlock('k7-111') > 0) {
    throw new Error('Gwangju home cheering filter should hide neutral K7 block 111.');
  }

  await clickGwangjuFilter('원정응원석');
  await assertGwangjuDerivedRangeSummary(
    'derived-away-cheering-seats',
    '107~110',
    'Gwangju away cheering derived range summary should display 107~110.',
  );
  if (await countGwangjuInteractiveSeatBlock('k7-107') === 0) {
    throw new Error('Gwangju away cheering filter should keep 107-110 K7 blocks interactive.');
  }
  if (await countGwangjuInteractiveSeatBlock('k7-118') > 0) {
    throw new Error('Gwangju away cheering filter should hide home cheering K7 blocks.');
  }
  if (await countGwangjuInteractiveSeatBlock('k7-111') > 0) {
    throw new Error('Gwangju away cheering filter should hide neutral K7 block 111.');
  }

  await clickGwangjuFilter('외야/테이블');
  if (await countGwangjuInteractiveSeatBlock('five-table-501') === 0) {
    throw new Error('Gwangju outfield/table filter should keep five-table seat blocks interactive.');
  }
  if (await countGwangjuInteractiveSeatBlock('k5-101') > 0) {
    throw new Error('Gwangju outfield/table filter should hide infield seat hit-areas.');
  }

  await clickGwangjuFilter('전체');
  await assertGwangjuDerivedRangeBadges(
    'k7-107',
    [
      { id: 'derived-k7-seats', label: 'K7석', blocks: '107~111, 118~122' },
      { id: 'derived-away-cheering-seats', label: '원정응원석', blocks: '107~110' },
    ],
    ['derived-home-cheering-seats'],
    'Gwangju K7 107 detail should show K7 and away derived badges.',
  );
  await assertGwangjuDerivedRangeBadges(
    'k7-111',
    [
      { id: 'derived-k7-seats', label: 'K7석', blocks: '107~111, 118~122' },
    ],
    ['derived-away-cheering-seats', 'derived-home-cheering-seats'],
    'Gwangju K7 111 detail should show only K7 derived badge.',
  );
  await assertGwangjuDerivedRangeBadges(
    'k7-118',
    [
      { id: 'derived-k7-seats', label: 'K7석', blocks: '107~111, 118~122' },
      { id: 'derived-home-cheering-seats', label: '홈 응원석', blocks: '118~122' },
    ],
    ['derived-away-cheering-seats'],
    'Gwangju K7 118 detail should show K7 and home cheering derived badges.',
  );

  const clickAllGwangjuLabelCoordinates = async () => {
    await closeDetailPanel();
    await scrollVisibleSeatMapIntoView(page);

    const labelClickTargets = await page.evaluate(() => {
      const svg = Array.from(document.querySelectorAll('svg[aria-label="광주-KIA 챔피언스필드 좌석도 구역 선택"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });

      if (!(svg instanceof SVGSVGElement)) return [];

      return Array.from(svg.querySelectorAll('[data-testid^="gwangju-seat-block-"]'))
        .map((element) => {
          const testId = element.getAttribute('data-testid') ?? '';
          const id = testId.replace('gwangju-seat-block-', '');
          const labelX = Number(element.getAttribute('data-label-x'));
          const labelY = Number(element.getAttribute('data-label-y'));
          const ariaLabel = element.getAttribute('aria-label') ?? '';
          const traceStatus = element.getAttribute('data-trace-status') ?? '';
          const pixelAlignmentStatus = element.getAttribute('data-pixel-alignment-status') ?? '';
          const mapInteractionStatus = element.getAttribute('data-map-interaction-status') ?? '';
          const rect = element.getBoundingClientRect();
          return {
            testId,
            id,
            labelX,
            labelY,
            ariaLabel,
            traceStatus,
            pixelAlignmentStatus,
            mapInteractionStatus,
            visible: rect.width > 0 && rect.height > 0,
          };
        })
        .filter((target) => (
          target.testId
          && target.visible
          && target.traceStatus === 'OFFICIAL_IMAGE_TRACED'
          && target.pixelAlignmentStatus === 'PIXEL_ALIGNED'
          && Number.isFinite(target.labelX)
          && Number.isFinite(target.labelY)
        ));
    });

    const hasOperatorConfirmedTargets = labelClickTargets.some((target) => (
      target.id === 'home-k7-seats' || target.id === 'away-cheering-seats'
    ));
    const expectedLabelTargetCount = hasOperatorConfirmedTargets ? 113 : 111;
    if (labelClickTargets.length !== expectedLabelTargetCount) {
      throw new Error(`Gwangju official-traced label coordinate click target count should be ${expectedLabelTargetCount}. Actual: ${labelClickTargets.length}`);
    }

    const labelHitFailures = await page.evaluate((targets) => {
      const svg = Array.from(document.querySelectorAll('svg[aria-label="광주-KIA 챔피언스필드 좌석도 구역 선택"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      if (!(svg instanceof SVGSVGElement)) {
        return [{ error: 'visible SVG missing' }];
      }

      return targets
        .map((target) => {
          const svgPoint = svg.createSVGPoint();
          svgPoint.x = target.labelX;
          svgPoint.y = target.labelY;
          const hits = Array.from(svg.querySelectorAll('[data-testid^="gwangju-seat-block-"]'))
            .filter((element) => (
              element instanceof SVGGeometryElement
              && element.getAttribute('pointer-events') !== 'none'
              && element.isPointInFill(svgPoint)
            ))
            .map((element) => element.getAttribute('data-testid'));
          const topHit = hits.at(-1) ?? null;
          return topHit === target.testId ? null : {
            id: target.id,
            ariaLabel: target.ariaLabel,
            expectedTestId: target.testId,
            topHit,
            hits: hits.slice(-8),
          };
        })
        .filter(Boolean);
    }, labelClickTargets);

    if (labelHitFailures.length > 0) {
      throw new Error(`Gwangju label coordinate top-hit failures: ${JSON.stringify(labelHitFailures)}`);
    }
  };

  await clickAllGwangjuLabelCoordinates();

  const representativeSections = [
    { name: /101 K5석|101/, expectedText: '101 K5석' },
    { name: /113 K9석|113/, expectedText: '113 K9석' },
    { name: /118 K7석|118/, expectedText: '118 K7석' },
    { name: /127 K5석|127/, expectedText: '127 K5석' },
    { name: /S-303 스카이피크닉석|S-303/, expectedText: 'S-303 스카이피크닉석' },
    { name: /S-335 스카이피크닉석|S-335/, expectedText: 'S-335 스카이피크닉석' },
    { name: /501 5층 테이블석|501/, expectedText: '501 5층 테이블석' },
    { name: /535 5층 테이블석|535/, expectedText: '535 5층 테이블석' },
    { name: /챔피언석/, expectedText: '챔피언석' },
    { name: /중앙 테이블석|중앙테이블석/, expectedText: '중앙 테이블석' },
    { name: /1루 휠체어석|휠체어석/, expectedText: '1루 휠체어석' },
    { name: /외야석|외야/, expectedText: '좌측 외야석' },
    { name: /외야테이블석/, expectedText: '좌측 외야테이블석' },
  ];

  for (const section of representativeSections) {
    await closeDetailPanel();
    await scrollVisibleSeatMapIntoView(page);
    const sectionButton = seatMapOverlay.getByRole('button', { name: section.name }).first();
    const sectionAriaLabel = await sectionButton.getAttribute('aria-label');
    const waitForSelectedSection = async (timeout = 5000) => page.waitForFunction((ariaLabel) => {
      const buttons = Array.from(document.querySelectorAll('svg[aria-label="광주-KIA 챔피언스필드 좌석도 구역 선택"] [role="button"]'));
      return buttons.some((button) => (
        button.getAttribute('aria-label') === ariaLabel
        && button.getAttribute('aria-pressed') === 'true'
      ));
    }, sectionAriaLabel, { timeout });
    await sectionButton.click({ timeout: 5000, force: true });
    const clickSelected = await waitForSelectedSection(1200)
      .then(() => true)
      .catch(() => false);
    if (!clickSelected) {
      await sectionButton.focus({ timeout: 5000 });
      await page.keyboard.press('Enter');
    }
    await waitForSelectedSection(5000).catch((error) => {
      throw new Error(`Gwangju section did not become selected: ${section.expectedText}. ${error instanceof Error ? error.message : String(error)}`);
    });
    await visibleTextLocator(page, section.expectedText).waitFor({ state: 'visible', timeout: 5000 });
  }

  await closeDetailPanel();
};

const verifyChangwonOverlayClicks = async (page) => {
  await selectStadiumGuideOption(page, 'CHANGWON');
  await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  await visibleTextLocator(page, '창원 NC 공식 좌석도').waitFor({ state: 'visible', timeout: 5000 });

  const requiredAssetNotice = page.locator('[data-testid="changwon-official-seatmap-required"]:visible').first();
  if (await requiredAssetNotice.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
    await requiredAssetNotice.getByText('MANUAL_BASEBALL_DATA_REQUIRED').waitFor({ state: 'visible', timeout: 5000 });
    return;
  }

  const closeDetailPanel = async () => {
    const closeButton = page.locator('button[aria-label="닫기"]:visible').first();
    if (await closeButton.count()) {
      await closeButton.click({ timeout: 3000 }).catch(() => undefined);
      await sleep(150);
    }
  };

  const waitForSelectedBlock = async (block, timeout = 5000) => page.waitForFunction((targetBlock) => {
    const buttons = Array.from(document.querySelectorAll('svg[aria-label="창원 NC파크 좌석도 구역 선택"] [role="button"]'));
    return buttons.some((button) => (
      (button.getAttribute('aria-label') === targetBlock || button.getAttribute('aria-label')?.startsWith(`${targetBlock} `))
      && button.getAttribute('aria-pressed') === 'true'
    ));
  }, block, { timeout });

  const clickChangwonFilter = async (label) => {
    const clicked = await page.evaluate((targetLabel) => {
      const button = Array.from(document.querySelectorAll('button'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0
            && rect.height > 0
            && candidate.textContent?.trim() === targetLabel
            && candidate.className.includes('rounded-full')
            && candidate.className.includes('px-3');
        });
      if (!button) return false;
      button.click();
      return true;
    }, label);
    if (!clicked) {
      throw new Error(`Changwon filter button not found: ${label}`);
    }
    await sleep(150);
  };

  const getChangwonAnchorBlocks = async () => page.evaluate(() => Array.from(
    Array.from(document.querySelectorAll('svg[aria-label="창원 NC파크 좌석도 구역 선택"]'))
      .find((svg) => {
        const rect = svg.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      ?.querySelectorAll('[data-changwon-anchor]') ?? [],
  )
    .map((node) => node.getAttribute('data-changwon-anchor'))
    .filter(Boolean)
    .sort((left, right) => {
      const leftNumber = Number(left);
      const rightNumber = Number(right);
      if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber;
      if (Number.isFinite(leftNumber)) return -1;
      if (Number.isFinite(rightNumber)) return 1;
      return left.localeCompare(right, 'ko');
    }));

  const officialAnchorClickPoint = async (block) => page.evaluate((targetBlock) => {
    const svg = Array.from(document.querySelectorAll('svg[aria-label="창원 NC파크 좌석도 구역 선택"]'))
      .find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    const anchor = svg?.querySelector(`[data-changwon-anchor="${targetBlock}"]`);
    if (!(svg instanceof SVGSVGElement) || !(anchor instanceof SVGCircleElement)) {
      return null;
    }

    const frame = svg.parentElement?.parentElement;
    if (!(frame instanceof HTMLElement)) {
      return null;
    }

    const rect = frame.getBoundingClientRect();
    const anchorX = Number(anchor.getAttribute('cx'));
    const anchorY = Number(anchor.getAttribute('cy'));
    return {
      x: rect.left + ((anchorX / 1960) * rect.width),
      y: rect.top + (((anchorY - 220) / 1720) * rect.height),
    };
  }, block);

  const scrollChangwonAnchorIntoView = async (block) => {
    await scrollVisibleSeatMapIntoView(page);
    const didScrollToAnchor = await page.evaluate((targetBlock) => {
      const svg = Array.from(document.querySelectorAll('svg[aria-label="창원 NC파크 좌석도 구역 선택"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const anchor = svg?.querySelector(`[data-changwon-anchor="${targetBlock}"]`);
      if (!(svg instanceof SVGSVGElement) || !(anchor instanceof SVGCircleElement)) {
        return false;
      }
      const frame = svg.parentElement?.parentElement;
      if (!(frame instanceof HTMLElement)) {
        return false;
      }
      const rect = frame.getBoundingClientRect();
      const anchorY = Number(anchor.getAttribute('cy'));
      const anchorPageY = window.scrollY
        + rect.top
        + (((anchorY - 220) / 1720) * rect.height);
      window.scrollTo({
        top: Math.max(0, anchorPageY - (window.innerHeight / 2)),
        behavior: 'instant',
      });
      return true;
    }, block);
    if (!didScrollToAnchor) {
      throw new Error(`Changwon official anchor is missing for block ${block}`);
    }
    await sleep(80);
  };

  const assertChangwonTopHitTargets = async (blocks) => {
    for (const block of blocks) {
      await closeDetailPanel();
      await scrollChangwonAnchorIntoView(block);
      const point = await officialAnchorClickPoint(block);
      if (!point) {
        throw new Error(`Changwon official anchor is missing for block ${block}`);
      }

      const topHit = await page.evaluate(({ targetBlock, screenPoint }) => {
        const elements = document.elementsFromPoint(screenPoint.x, screenPoint.y);
        const topButton = elements.find((element) => element.getAttribute('role') === 'button');
        const topLabel = topButton?.getAttribute('aria-label') ?? null;
        const expected = topLabel === targetBlock || topLabel?.startsWith(`${targetBlock} `);

        if (expected) {
          topButton.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: screenPoint.x,
            clientY: screenPoint.y,
          }));
        }

        return {
          ok: Boolean(expected),
          topLabel,
          hitStack: elements
            .map((element) => element.getAttribute('aria-label') || element.getAttribute('data-changwon-anchor') || element.tagName)
            .filter(Boolean)
            .slice(0, 8),
        };
      }, { targetBlock: block, screenPoint: point });

      if (!topHit.ok) {
        throw new Error(`Changwon top-hit mismatch for ${block}. Top: ${topHit.topLabel ?? '-'} Hit stack: ${topHit.hitStack.join(' > ')}`);
      }

      await waitForSelectedBlock(block, 5000).catch((error) => {
        throw new Error(`Changwon top-hit click failed for ${block}. ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  };

  const assertChangwonRepresentativeHitTargets = async (blocks) => {
    for (const block of blocks) {
      await closeDetailPanel();
      await scrollChangwonAnchorIntoView(block);
      const probes = await page.evaluate((targetBlock) => {
        const svg = Array.from(document.querySelectorAll('svg[aria-label="창원 NC파크 좌석도 구역 선택"]'))
          .find((candidate) => {
            const rect = candidate.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        if (!(svg instanceof SVGSVGElement)) return [];

        const button = Array.from(svg.querySelectorAll('[role="button"]'))
          .find((element) => {
            const label = element.getAttribute('aria-label') ?? '';
            return label === targetBlock || label.startsWith(`${targetBlock} `);
          });
        if (!(button instanceof SVGPathElement)) return [];

        const parseSubpaths = (pathData) => (
          pathData
            .trim()
            .split(/(?=M\s)/)
            .filter(Boolean)
            .map((subpath) => {
              const numbers = subpath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
              return Array.from({ length: numbers.length / 2 }, (_, index) => ({
                x: numbers[index * 2],
                y: numbers[(index * 2) + 1],
              }));
            })
        );
        const isPointOnSegment = (point, start, end) => {
          const cross = ((point.y - start.y) * (end.x - start.x)) - ((point.x - start.x) * (end.y - start.y));
          if (Math.abs(cross) > 0.001) return false;
          const dot = ((point.x - start.x) * (end.x - start.x)) + ((point.y - start.y) * (end.y - start.y));
          if (dot < -0.001) return false;
          const squaredLength = ((end.x - start.x) ** 2) + ((end.y - start.y) ** 2);
          return dot <= squaredLength + 0.001;
        };
        const isPointInPolygon = (point, polygon) => {
          let inside = false;
          for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
            const start = polygon[previous];
            const end = polygon[current];
            if (isPointOnSegment(point, start, end)) return true;
            const intersects = ((start.y > point.y) !== (end.y > point.y))
              && (point.x < (((end.x - start.x) * (point.y - start.y)) / (end.y - start.y)) + start.x);
            if (intersects) inside = !inside;
          }
          return inside;
        };
        const distanceToSegment = (point, start, end) => {
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
          const progress = Math.max(0, Math.min(1, (((point.x - start.x) * dx) + ((point.y - start.y) * dy)) / ((dx ** 2) + (dy ** 2))));
          return Math.hypot(point.x - (start.x + (progress * dx)), point.y - (start.y + (progress * dy)));
        };
        const distanceToPolygonStroke = (point, polygon) => Math.min(
          ...polygon.map((start, index) => distanceToSegment(point, start, polygon[(index + 1) % polygon.length])),
        );
        const polygonCentroid = (polygon) => {
          let signedArea = 0;
          let centroidX = 0;
          let centroidY = 0;
          for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
            const cross = (polygon[previous].x * polygon[current].y) - (polygon[current].x * polygon[previous].y);
            signedArea += cross;
            centroidX += (polygon[previous].x + polygon[current].x) * cross;
            centroidY += (polygon[previous].y + polygon[current].y) * cross;
          }
          if (Math.abs(signedArea) < 0.001) return polygon[0];
          return {
            x: centroidX / (3 * signedArea),
            y: centroidY / (3 * signedArea),
          };
        };
        const representativePointForPolygon = (polygon) => {
          const centroid = polygonCentroid(polygon);
          if (isPointInPolygon(centroid, polygon)) return centroid;
          const xs = polygon.map((point) => point.x);
          const ys = polygon.map((point) => point.y);
          const bounds = {
            minX: Math.min(...xs),
            minY: Math.min(...ys),
            maxX: Math.max(...xs),
            maxY: Math.max(...ys),
          };
          let bestPoint = null;
          let bestDistance = -1;
          const steps = 8;
          for (let xIndex = 1; xIndex < steps; xIndex += 1) {
            for (let yIndex = 1; yIndex < steps; yIndex += 1) {
              const candidate = {
                x: bounds.minX + (((bounds.maxX - bounds.minX) * xIndex) / steps),
                y: bounds.minY + (((bounds.maxY - bounds.minY) * yIndex) / steps),
              };
              if (!isPointInPolygon(candidate, polygon)) continue;
              const distance = distanceToPolygonStroke(candidate, polygon);
              if (distance > bestDistance) {
                bestPoint = candidate;
                bestDistance = distance;
              }
            }
          }
          return bestPoint ?? polygon[0];
        };
        return parseSubpaths(button.getAttribute('d') ?? '')
          .map((subpath, index) => {
            const point = representativePointForPolygon(subpath);
            return {
              kind: `SUBPATH_REPRESENTATIVE_${index}`,
              point: {
                x: Number(point.x.toFixed(1)),
                y: Number(point.y.toFixed(1)),
              },
            };
          })
          .filter(Boolean);
      }, block);

      if (probes.length === 0) {
        throw new Error(`Changwon representative hit probe missing for ${block}`);
      }

      for (const probe of probes) {
        await closeDetailPanel();
        await scrollChangwonAnchorIntoView(block);
        const screenPoint = await page.evaluate((point) => {
          const svg = Array.from(document.querySelectorAll('svg[aria-label="창원 NC파크 좌석도 구역 선택"]'))
            .find((candidate) => {
              const rect = candidate.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            });
          if (!(svg instanceof SVGSVGElement)) return null;

          const svgPoint = svg.createSVGPoint();
          svgPoint.x = point.x;
          svgPoint.y = point.y;
          const matrix = svg.getScreenCTM();
          if (!matrix) return null;
          const transformed = svgPoint.matrixTransform(matrix);
          return { x: transformed.x, y: transformed.y };
        }, probe.point);

        if (!screenPoint) {
          throw new Error(`Changwon representative hit screen point missing for ${block} ${probe.kind} ${probe.point.x},${probe.point.y}`);
        }

        const topHit = await page.evaluate(({ targetBlock, screenPoint }) => {
          const elements = document.elementsFromPoint(screenPoint.x, screenPoint.y);
          const topButton = elements.find((element) => element.getAttribute('role') === 'button');
          const topLabel = topButton?.getAttribute('aria-label') ?? null;
          const expected = topLabel === targetBlock || topLabel?.startsWith(`${targetBlock} `);

          if (expected) {
            topButton.dispatchEvent(new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: screenPoint.x,
              clientY: screenPoint.y,
            }));
          }

          return {
            ok: Boolean(expected),
            topLabel,
            hitStack: elements
              .map((element) => element.getAttribute('aria-label') || element.getAttribute('data-changwon-anchor') || element.tagName)
              .filter(Boolean)
              .slice(0, 8),
          };
        }, { targetBlock: block, screenPoint });

        if (!topHit.ok) {
          throw new Error(`Changwon representative hit mismatch for ${block} ${probe.kind} ${probe.point.x},${probe.point.y}. Top: ${topHit.topLabel ?? '-'} Hit stack: ${topHit.hitStack.join(' > ')}`);
        }

        await waitForSelectedBlock(block, 5000).catch((error) => {
          throw new Error(`Changwon representative hit click failed for ${block} ${probe.kind}. ${error instanceof Error ? error.message : String(error)}`);
        });
      }
    }
  };

  const clickOfficialAnchor = async (block) => {
    await scrollChangwonAnchorIntoView(block);
    const point = await officialAnchorClickPoint(block);
    if (!point) {
      throw new Error(`Changwon official anchor is missing for block ${block}`);
    }

    const anchorTarget = await page.evaluate(({ targetBlock, screenPoint }) => {
      const elements = document.elementsFromPoint(screenPoint.x, screenPoint.y);
      const target = elements.find((element) => (
        element.getAttribute('role') === 'button'
        && (
          element.getAttribute('aria-label') === targetBlock
          || element.getAttribute('aria-label')?.startsWith(`${targetBlock} `)
        )
      ));

      if (!target) {
        return {
          ok: false,
          labels: elements
            .map((element) => element.getAttribute('aria-label') || element.getAttribute('data-changwon-anchor') || element.tagName)
            .filter(Boolean)
            .slice(0, 8),
        };
      }

      target.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: screenPoint.x,
        clientY: screenPoint.y,
      }));
      return { ok: true, labels: [] };
    }, { targetBlock: block, screenPoint: point });

    if (!anchorTarget.ok) {
      throw new Error(`Changwon official anchor ${block} did not resolve to its SVG path. Hit stack: ${anchorTarget.labels.join(' > ')}`);
    }

    await waitForSelectedBlock(block, 5000).catch((error) => {
      throw new Error(`Changwon official anchor click failed for block ${block}. ${error instanceof Error ? error.message : String(error)}`);
    });
  };

  const captureChangwonTraceReviewScreenshots = async () => {
    const viewport = page.viewportSize();
    const suffix = `${viewport?.width ?? 'unknown'}x${viewport?.height ?? 'unknown'}`;
    await page.screenshot({
      path: path.join(outputRoot, `changwon-trace-review-full-${suffix}.png`),
      fullPage: true,
    }).catch(() => undefined);

    const cropRegions = [
      ['outfield', { minX: 430, minY: 260, maxX: 1520, maxY: 760 }],
      ['first-base', { minX: 1000, minY: 760, maxX: 1660, maxY: 1570 }],
      ['center', { minX: 760, minY: 1120, maxX: 1220, maxY: 1565 }],
      ['third-base', { minX: 360, minY: 760, maxX: 960, maxY: 1570 }],
      ['p0-121-128', { minX: 420, minY: 500, maxX: 745, maxY: 1045 }],
      ['lower-34', { minX: 360, minY: 1320, maxX: 1600, maxY: 1715 }],
      ['special-first-base', { minX: 1120, minY: 930, maxX: 1605, maxY: 1425 }],
      ['special-third-base', { minX: 490, minY: 1040, maxX: 690, maxY: 1310 }],
      ['special-outfield', { minX: 1080, minY: 280, maxX: 1420, maxY: 545 }],
    ];

    for (const [name, region] of cropRegions) {
      await scrollVisibleSeatMapIntoView(page);
      await page.evaluate((input) => {
        const svg = Array.from(document.querySelectorAll('svg[aria-label="창원 NC파크 좌석도 구역 선택"]'))
          .find((candidate) => {
            const rect = candidate.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        if (!(svg instanceof SVGSVGElement)) return;
        const frame = svg.parentElement?.parentElement;
        if (!(frame instanceof HTMLElement)) return;
        const rect = frame.getBoundingClientRect();
        const regionCenterY = (input.minY + input.maxY) / 2;
        const regionCenterOnPage = window.scrollY
          + rect.top
          + (((regionCenterY - 220) / 1720) * rect.height);
        window.scrollTo({
          top: Math.max(0, regionCenterOnPage - (window.innerHeight / 2)),
          behavior: 'instant',
        });
      }, region);
      await sleep(80);

      const clip = await page.evaluate((input) => {
        const svg = Array.from(document.querySelectorAll('svg[aria-label="창원 NC파크 좌석도 구역 선택"]'))
          .find((candidate) => {
            const rect = candidate.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        if (!(svg instanceof SVGSVGElement)) return null;
        const frame = svg.parentElement?.parentElement;
        if (!(frame instanceof HTMLElement)) return null;
        const rect = frame.getBoundingClientRect();

        const toScreenPoint = (x, y) => {
          return {
            x: rect.left + ((x / 1960) * rect.width),
            y: rect.top + (((y - 220) / 1720) * rect.height),
          };
        };

        const topLeft = toScreenPoint(input.minX, input.minY);
        const bottomRight = toScreenPoint(input.maxX, input.maxY);
        const padding = 12;
        const x = Math.max(0, Math.min(topLeft.x, bottomRight.x) - padding);
        const y = Math.max(0, Math.min(topLeft.y, bottomRight.y) - padding);
        const width = Math.min(window.innerWidth - x, Math.abs(bottomRight.x - topLeft.x) + padding * 2);
        const height = Math.min(window.innerHeight - y, Math.abs(bottomRight.y - topLeft.y) + padding * 2);

        if (width < 40 || height < 40) return null;
        return { x, y, width, height };
      }, region);

      const cropPath = path.join(outputRoot, `changwon-trace-review-${name}-${suffix}.png`);
      let didSaveCrop = false;
      if (clip) {
        await page.screenshot({
          path: cropPath,
          clip,
        })
          .then(() => {
            didSaveCrop = true;
          })
          .catch(() => undefined);
      }

      if (!didSaveCrop) {
        await visibleSeatMapLocator(page).screenshot({ path: cropPath }).catch(() => undefined);
      }
    }
  };

  await scrollVisibleSeatMapIntoView(page);
  const seatMapCard = visibleSeatMapLocator(page);
  const zoomLayer = page.locator('[data-testid="changwon-seatmap-transform-layer"]:visible').first();
  const visibleChangwonTestId = (testId) => page.locator(`[data-testid="${testId}"]:visible`).first();
  const expectChangwonZoom = async (expectedZoom) => {
    await page.waitForFunction((expected) => {
      const layer = Array.from(document.querySelectorAll('[data-testid="changwon-seatmap-transform-layer"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      return layer?.getAttribute('data-zoom') === expected;
    }, expectedZoom, { timeout: 5000 });
  };
  const clickChangwonZoomControl = async (testId, expectedZoom) => {
    const button = visibleChangwonTestId(testId);
    await button.waitFor({ state: 'visible', timeout: 5000 });
    await button.click({ timeout: 5000, force: true });
    await expectChangwonZoom(expectedZoom).catch(async (error) => {
      await button.evaluate((node) => node.click()).catch(() => undefined);
      await expectChangwonZoom(expectedZoom).catch((retryError) => {
        throw new Error(`Changwon zoom control ${testId} did not reach ${expectedZoom}. First attempt: ${error instanceof Error ? error.message : String(error)}. Retry: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
      });
    });
  };
  await zoomLayer.waitFor({ state: 'visible', timeout: 5000 });
  await clickChangwonZoomControl('changwon-seatmap-zoom-in', '1.10');
  await sleep(150);
  const resetZoomButton = visibleChangwonTestId('changwon-seatmap-zoom-reset');
  const resetZoomEnabled = await resetZoomButton.evaluate((button) => !button.hasAttribute('disabled')).catch(() => false);
  if (resetZoomEnabled) {
    await clickChangwonZoomControl('changwon-seatmap-zoom-reset', '1.00');
  }
  await clickChangwonZoomControl('changwon-seatmap-zoom-out', '0.90');
  await clickChangwonZoomControl('changwon-seatmap-zoom-reset', '1.00');

  await seatMapCard.getByTestId('changwon-seatmap-fullscreen-open').click({ timeout: 5000, force: true });
  await page.getByTestId('changwon-seatmap-fullscreen').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('changwon-seatmap-fullscreen-close').click({ timeout: 5000, force: true });
  await page.getByTestId('changwon-seatmap-fullscreen').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);

  const searchInput = page.locator('[data-testid="changwon-block-search"]:visible').first();
  const assertChangwonNumericSearchSelects = async (term, block, detail) => {
    await closeDetailPanel();
    await searchInput.fill(term);
    await waitForSelectedBlock(block, 5000).catch((error) => {
      throw new Error(`Changwon numeric search "${term}" did not select ${block}. ${error instanceof Error ? error.message : String(error)}`);
    });
    await visibleTextLocator(page, detail).waitFor({ state: 'visible', timeout: 5000 });
  };

  const assertChangwonTextSearchResultSelects = async (term, resultTestId, block, detail) => {
    await closeDetailPanel();
    await searchInput.fill(term);
    await visibleChangwonTestId('changwon-search-results').waitFor({ state: 'visible', timeout: 5000 });
    await visibleChangwonTestId('changwon-search-result-count').waitFor({ state: 'visible', timeout: 5000 });
    await visibleChangwonTestId(resultTestId).click({ timeout: 5000, force: true });
    await waitForSelectedBlock(block, 5000).catch((error) => {
      throw new Error(`Changwon search result "${term}" did not select ${block}. ${error instanceof Error ? error.message : String(error)}`);
    });
    await visibleTextLocator(page, detail).waitFor({ state: 'visible', timeout: 5000 });
  };

  const assertChangwonEmptySearchKeepsSelection = async (term, selectedBlock) => {
    await searchInput.fill(term);
    await visibleChangwonTestId('changwon-search-empty').waitFor({ state: 'visible', timeout: 5000 });
    await waitForSelectedBlock(selectedBlock, 1500).catch((error) => {
      throw new Error(`Changwon empty search "${term}" should keep current selection ${selectedBlock}. ${error instanceof Error ? error.message : String(error)}`);
    });
  };

  const assertChangwonFilterState = async (label, activeBlocks, inactiveBlocks = []) => {
    await closeDetailPanel();
    await searchInput.fill('');
    await clickChangwonFilter(label);
    const states = await page.evaluate(({ activeBlocks: expectedActiveBlocks, inactiveBlocks: expectedInactiveBlocks }) => {
      const svg = Array.from(document.querySelectorAll('svg[aria-label="창원 NC파크 좌석도 구역 선택"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const buttons = Array.from(svg?.querySelectorAll('[role="button"]') ?? []);
      const stateFor = (block, shouldBeActive) => {
        const button = buttons.find((candidate) => {
          const ariaLabel = candidate.getAttribute('aria-label');
          return ariaLabel === block || ariaLabel?.startsWith(`${block} `);
        });
        return {
          block,
          shouldBeActive,
          exists: Boolean(button),
          isActive: button ? button.tabIndex !== -1 : false,
          ariaLabel: button?.getAttribute('aria-label') ?? null,
        };
      };

      return [
        ...expectedActiveBlocks.map((block) => stateFor(block, true)),
        ...expectedInactiveBlocks.map((block) => stateFor(block, false)),
      ];
    }, { activeBlocks, inactiveBlocks });
    const invalidStates = states.filter((state) => !state.exists || state.isActive !== state.shouldBeActive);
    if (invalidStates.length > 0) {
      throw new Error(`Changwon filter "${label}" state mismatch: ${JSON.stringify(invalidStates.slice(0, 8))}`);
    }
  };

  await assertChangwonNumericSearchSelects('125', '125', '125 3루 내야석');
  await visibleTextLocator(page, '아직 등록된 시야가 없어요').waitFor({ state: 'visible', timeout: 10000 });
  await assertChangwonTextSearchResultSelects('바베큐', 'changwon-search-result-changwon-special-first-bbq', '1루 바베큐석', '1루 바베큐석');
  await assertChangwonEmptySearchKeepsSelection('없는검색어', '1루 바베큐석');
  if ((page.viewportSize()?.width ?? 0) <= 430) {
    await page.getByTestId('changwon-bottom-sheet').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByTestId('changwon-selected-status-mobile').first().waitFor({ state: 'visible', timeout: 5000 });
    await closeDetailPanel();
  }
  await assertChangwonTextSearchResultSelects('라운드', 'changwon-search-result-changwon-special-third-round-table', '3루 라운드 테이블석', '3루 라운드 테이블석');
  await assertChangwonTextSearchResultSelects('1루 테이블', 'changwon-search-result-changwon-special-first-table', '1루 테이블석', '1루 테이블석');
  await assertChangwonTextSearchResultSelects('카운터', 'changwon-search-result-changwon-special-outfield-counter', '외야 카운터석', '외야 카운터석');
  await assertChangwonTextSearchResultSelects('가족', 'changwon-search-result-changwon-special-outfield-family', '외야 가족석', '외야 가족석');

  await closeDetailPanel();
  await searchInput.fill('');
  await clickChangwonFilter('3·4층');
  const is433StillSelected = await waitForSelectedBlock('433', 1500)
    .then(() => true)
    .catch(() => false);
  if (!is433StillSelected) {
    const block433 = page.locator('[data-testid="stadium-seat-map"]:visible svg[aria-label="창원 NC파크 좌석도 구역 선택"] [role="button"][aria-label^="433 "]').first();
    await block433.click({ timeout: 5000, force: true });
    await waitForSelectedBlock('433');
  }
  await assertChangwonFilterState('응원석', ['105', '121'], ['101', '301']);
  await assertChangwonFilterState('외야·특수', ['129', '1루 바베큐석', '3루 라운드 테이블석', '1루 라운드 테이블석', '1루 테이블석', '외야 카운터석', '외야 가족석'], ['101', '420']);
  await assertChangwonFilterState('휠체어', ['105', '325'], ['101', '301']);
  await assertChangwonFilterState('2층', ['1루 바베큐석', '3루 라운드 테이블석'], ['1루 라운드 테이블석', '1루 테이블석', '외야 카운터석', '외야 가족석']);
  await assertChangwonFilterState('3·4층', ['1루 라운드 테이블석', '1루 테이블석'], ['1루 바베큐석', '3루 라운드 테이블석', '외야 카운터석', '외야 가족석']);
  await clickChangwonFilter('전체');
  await closeDetailPanel();

  const specialTopHitBlocks = [
    '1루 바베큐석',
    '3루 라운드 테이블석',
    '1루 라운드 테이블석',
    '1루 테이블석',
    '외야 카운터석',
    '외야 가족석',
  ];
  await assertChangwonTopHitTargets(specialTopHitBlocks);
  await assertChangwonTopHitTargets([
    '101', '102', '103', '104', '105', '106', '107', '108',
    '121', '122', '123', '124', '125', '126', '127', '128',
    '129', '130', '131', '132', '133', '134', '135', '136', '137', '138',
    '201', '202', '203', '204', '205', '206', '207', '208', '209', '210',
    '301', '302', '303', '304', '305', '306', '307', '308',
    '309', '310', '311', '312', '313', '314', '315',
    '401', '402', '403', '404', '405', '406', '407', '408',
    '420', '422', '423', '424', '425', '426', '427', '428', '429',
    '431', '432', '433',
  ]);
  await assertChangwonRepresentativeHitTargets([
    ...specialTopHitBlocks,
    '113', '125', '129', '137', '326', '412', '426', '428',
  ]);

  const representativeSections = [
    { button: /101 1루 프리미엄석/, block: '101', detail: '101 1루 프리미엄석' },
    { button: /105 홈 응원석/, block: '105', detail: '105 홈 응원석' },
    { button: /112 중앙 프리미엄석/, block: '112', detail: '112 중앙 프리미엄석' },
    { button: /121 원정 응원석/, block: '121', detail: '121 원정 응원석' },
    { button: /122 원정 응원석/, block: '122', detail: '122 원정 응원석' },
    { button: /123 원정 응원석/, block: '123', detail: '123 원정 응원석' },
    { button: /124 원정 응원석/, block: '124', detail: '124 원정 응원석' },
    { button: /125 3루 내야석/, block: '125', detail: '125 3루 내야석' },
    { button: /126 바베큐석/, block: '126', detail: '126 바베큐석' },
    { button: /127 바베큐석/, block: '127', detail: '127 바베큐석' },
    { button: /128 불펜 가족석/, block: '128', detail: '128 불펜 가족석' },
    { button: /129 외야 잔디석/, block: '129', detail: '129 외야 잔디석' },
    { button: /130 외야 지정석/, block: '130', detail: '130 외야 지정석' },
    { button: /131 외야 지정석/, block: '131', detail: '131 외야 지정석' },
    { button: /132 외야 지정석/, block: '132', detail: '132 외야 지정석' },
    { button: /133 외야 지정석/, block: '133', detail: '133 외야 지정석' },
    { button: /138 외야 지정석/, block: '138', detail: '138 외야 지정석' },
    { button: /201 2층 1루 내야석/, block: '201', detail: '201 2층 1루 내야석', viaKeyboard: true },
    { button: /309 3층 1루 내야석/, block: '309', detail: '309 3층 1루 내야석' },
    { button: /315 3층 스카이박스/, block: '315', detail: '315 3층 스카이박스' },
    { button: /433 4층 내야석/, block: '433', detail: '433 4층 내야석' },
    { block: '1루 바베큐석', detail: '1루 바베큐석', viaAnchor: true },
    { block: '3루 라운드 테이블석', detail: '3루 라운드 테이블석', viaAnchor: true },
    { block: '1루 라운드 테이블석', detail: '1루 라운드 테이블석', viaAnchor: true },
    { block: '1루 테이블석', detail: '1루 테이블석', viaAnchor: true },
    { block: '외야 카운터석', detail: '외야 카운터석', viaAnchor: true },
    { block: '외야 가족석', detail: '외야 가족석', viaAnchor: true },
  ];

  for (const sectionName of representativeSections) {
    await closeDetailPanel();
    await scrollVisibleSeatMapIntoView(page);
    const section = page.locator(`[data-testid="stadium-seat-map"]:visible svg[aria-label="창원 NC파크 좌석도 구역 선택"] [role="button"][aria-label^="${sectionName.block} "]`).first();

    if (sectionName.viaAnchor) {
      await clickOfficialAnchor(sectionName.block);
    } else if (sectionName.viaKeyboard) {
      await section.focus({ timeout: 5000 });
      await page.keyboard.press('Enter');
    } else {
      await section.click({ timeout: 5000, force: true });
      const clickSelected = await waitForSelectedBlock(sectionName.block, 1200)
        .then(() => true)
        .catch(() => false);
      if (!clickSelected) {
        await section.focus({ timeout: 5000 });
        await page.keyboard.press('Enter');
      }
    }
    await waitForSelectedBlock(sectionName.block, 5000).catch((error) => {
      throw new Error(`Changwon section did not become selected: ${sectionName.block}. ${error instanceof Error ? error.message : String(error)}`);
    });
    await visibleTextLocator(page, sectionName.detail).waitFor({ state: 'visible', timeout: 5000 });
  }

  await closeDetailPanel();
  await searchInput.fill('');
  await clickChangwonFilter('전체');
  const anchorBlocks = await getChangwonAnchorBlocks();
  if (anchorBlocks.length !== 123) {
    throw new Error(`Changwon debug anchor count should be 123. Actual: ${anchorBlocks.length}`);
  }

  const fixedAnchorSamples = ['101', '105', '112', '125', '128', '129', '130', '131', '132', '133', '138', '201', '309', '315', '433', '1루 바베큐석', '3루 라운드 테이블석', '1루 라운드 테이블석', '1루 테이블석', '외야 카운터석', '외야 가족석'];
  const orderedAnchorBlocks = [...new Set([...fixedAnchorSamples, ...anchorBlocks])];
  await scrollVisibleSeatMapIntoView(page);
  const anchorClickFailures = await page.evaluate(async (blocks) => {
    const svg = Array.from(document.querySelectorAll('svg[aria-label="창원 NC파크 좌석도 구역 선택"]'))
      .find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    if (!(svg instanceof SVGSVGElement)) {
      return [{ block: 'ALL', reason: 'visible SVG is missing', hitStack: [] }];
    }

    const failures = [];
    for (const block of blocks) {
      const anchor = svg.querySelector(`[data-changwon-anchor="${block}"]`);
      if (!(anchor instanceof SVGCircleElement)) {
        failures.push({ block, reason: 'anchor is missing', hitStack: [] });
        continue;
      }

      const point = svg.createSVGPoint();
      point.x = Number(anchor.getAttribute('cx'));
      point.y = Number(anchor.getAttribute('cy'));
      const hitPaths = Array.from(svg.querySelectorAll('[role="button"]'))
        .filter((element) => (
          element instanceof SVGGeometryElement
          && (element.isPointInFill(point) || element.isPointInStroke(point))
        ));
      const target = hitPaths.find((element) => {
        const ariaLabel = element.getAttribute('aria-label');
        return ariaLabel === block || ariaLabel?.startsWith(`${block} `);
      });

      if (!target) {
        failures.push({
          block,
          reason: 'anchor is outside its SVG path',
          hitStack: hitPaths
            .map((element) => element.getAttribute('aria-label') || element.tagName)
            .filter(Boolean)
            .slice(0, 8),
        });
        continue;
      }

      target.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      }));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      if (target.getAttribute('aria-pressed') !== 'true') {
        failures.push({ block, reason: 'clicked path did not become selected', hitStack: [target.getAttribute('aria-label') ?? target.tagName] });
      }
    }

    return failures;
  }, orderedAnchorBlocks);

  if (anchorClickFailures.length > 0) {
    const summary = anchorClickFailures
      .slice(0, 8)
      .map((failure) => `${failure.block}: ${failure.reason}${failure.hitStack.length ? ` (${failure.hitStack.join(' > ')})` : ''}`)
      .join('; ');
    throw new Error(`Changwon official anchor click check failed. ${summary}`);
  }

  await closeDetailPanel();
  await scrollVisibleSeatMapIntoView(page);
  await captureChangwonTraceReviewScreenshots();
  const viewport = page.viewportSize();
  await page.screenshot({
    path: path.join(outputRoot, `changwon-debug-overlay-${viewport?.width ?? 'unknown'}x${viewport?.height ?? 'unknown'}.png`),
    fullPage: true,
  }).catch(() => undefined);

  await closeDetailPanel();
};

const verifyDaejeonOverlayClicks = async (page) => {
  if (shouldCaptureDaejeonDebugOverlay) {
    const debugUrl = new URL(page.url());
    debugUrl.searchParams.set('daejeonDebug', '1');
    if (debugUrl.toString() !== page.url()) {
      await page.goto(debugUrl.toString(), { waitUntil: 'domcontentloaded' });
    }
  }

  await selectStadiumGuideOption(page, 'DAEJEON');
  await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  await waitForVisibleSeatMapText(page, '대전 한화 공식 좌석도');

  const manualStateVisible = await page.getByTestId('daejeon-official-seatmap-required').first()
    .waitFor({ state: 'visible', timeout: 2500 })
    .then(() => true)
    .catch(() => false);
  const manualTextVisible = await page.getByText('MANUAL_BASEBALL_DATA_REQUIRED').first()
    .waitFor({ state: 'visible', timeout: 2500 })
    .then(() => true)
    .catch(() => false);

  if (manualStateVisible || manualTextVisible) {
    return;
  }

  if (DAEJEON_EXPECTS_MANUAL_SEATMAP) {
    return;
  }

  const closeDetailPanel = async () => {
    const closeButton = page.locator('button[aria-label="닫기"]:visible').first();
    if (await closeButton.count()) {
      await closeButton.click({ timeout: 3000 }).catch(() => undefined);
      await sleep(150);
    }
  };

  const scrollDaejeonSeatMapIntoView = async () => {
    await page.evaluate(() => {
      const seatMap = Array.from(document.querySelectorAll('[data-testid="stadium-seat-map"]'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      seatMap?.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
    await sleep(100);
  };

  const hideDaejeonFixedSheetsForCoordinateClick = async () => {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('div.fixed.bottom-0.left-0.right-0.z-50'))
        .forEach((element) => {
          if (element instanceof HTMLElement) {
            element.style.pointerEvents = 'none';
            element.style.visibility = 'hidden';
          }
        });
    }).catch(() => undefined);
  };

  const restoreDaejeonFixedSheetsAfterCoordinateClick = async () => {
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('div.fixed.bottom-0.left-0.right-0.z-50'))
        .forEach((element) => {
          if (element instanceof HTMLElement) {
            element.style.pointerEvents = '';
            element.style.visibility = '';
          }
        });
    }).catch(() => undefined);
  };

  const captureDaejeonDebugOverlay = async () => {
    if (!shouldCaptureDaejeonDebugOverlay) return;

    await scrollDaejeonSeatMapIntoView();
    await visibleTextLocator(page, 'Daejeon trace debug').waitFor({ state: 'visible', timeout: 5000 });
    await visibleTextLocator(page, 'blocks 145').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(() => {
      const debugText = Array.from(document.querySelectorAll('div'))
        .find((element) => element.textContent?.includes('Daejeon trace debug'))?.textContent ?? '';
      return /traced\s+\d+/.test(debugText) && /review\s+\d+/.test(debugText);
    }, null, { timeout: 5000 });
    await visibleTextLocator(page, 'viewBox 0 0 920 1060').waitFor({ state: 'visible', timeout: 5000 });
    await visibleTextLocator(page, 'image 920x1060').waitFor({ state: 'visible', timeout: 5000 });

    const debugStructure = await page.evaluate(() => {
      const svg = Array.from(document.querySelectorAll('svg[aria-label="대전 한화생명볼파크 좌석도 구역 선택"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const layer = document.querySelector('[data-testid="daejeon-seatmap-transform-layer"]');
      if (!(svg instanceof SVGSVGElement)) {
        return null;
      }

      return {
        imageCount: svg.querySelectorAll('image').length,
        displayPathCount: svg.querySelectorAll('[data-testid^="daejeon-seat-display-"]').length,
        hitPathCount: svg.querySelectorAll('[data-testid^="daejeon-seat-block-"]').length,
        siblingImageCount: layer ? Array.from(layer.children).filter((child) => child.tagName.toLowerCase() === 'img').length : -1,
      };
    });
    if (!debugStructure || debugStructure.imageCount !== 1 || debugStructure.displayPathCount !== 145 || debugStructure.hitPathCount !== 145 || debugStructure.siblingImageCount !== 0) {
      throw new Error(`Daejeon debug SVG structure is invalid: ${JSON.stringify(debugStructure)}`);
    }

    const bottomRightClientPoint = await page.evaluate(() => {
      const svg = Array.from(document.querySelectorAll('svg[aria-label="대전 한화생명볼파크 좌석도 구역 선택"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      if (!(svg instanceof SVGSVGElement)) {
        return null;
      }

      const box = svg.getBoundingClientRect();
      return {
        x: box.left + (box.width * 0.997),
        y: box.top + (box.height * 0.997),
        box: { left: box.left, top: box.top, width: box.width, height: box.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
      };
    });
    if (!bottomRightClientPoint) {
      throw new Error('Daejeon debug SVG is missing for bottom-right coordinate check.');
    }

    const bottomRightSvgPoint = await page.evaluate(({ x, y }) => {
      const svg = Array.from(document.querySelectorAll('svg[aria-label="대전 한화생명볼파크 좌석도 구역 선택"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      if (!(svg instanceof SVGSVGElement)) {
        return null;
      }

      const matrix = svg.getScreenCTM()?.inverse();
      if (!matrix) {
        return null;
      }
      const point = svg.createSVGPoint();
      point.x = x;
      point.y = y;
      const svgPoint = point.matrixTransform(matrix);
      return { x: Math.round(svgPoint.x), y: Math.round(svgPoint.y) };
    }, bottomRightClientPoint);
    if (!bottomRightSvgPoint || bottomRightSvgPoint.x < 910 || bottomRightSvgPoint.y < 1050) {
      throw new Error(`Daejeon debug bottom-right coordinate is not near 920,1060: ${JSON.stringify(bottomRightSvgPoint)}`);
    }

    if (
      bottomRightClientPoint.x >= 0
      && bottomRightClientPoint.x <= bottomRightClientPoint.viewport.width
      && bottomRightClientPoint.y >= 0
      && bottomRightClientPoint.y <= bottomRightClientPoint.viewport.height
    ) {
      await page.mouse.move(bottomRightClientPoint.x, bottomRightClientPoint.y);
    } else {
      await page.evaluate(({ x, y }) => {
        const svg = Array.from(document.querySelectorAll('svg[aria-label="대전 한화생명볼파크 좌석도 구역 선택"]'))
          .find((candidate) => {
            const rect = candidate.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        svg?.dispatchEvent(new MouseEvent('mousemove', {
          bubbles: true,
          clientX: x,
          clientY: y,
          view: window,
        }));
      }, bottomRightClientPoint);
    }
    await page.waitForFunction(() => {
      const debugText = Array.from(document.querySelectorAll('div'))
        .find((element) => element.textContent?.includes('Daejeon trace debug'))?.textContent ?? '';
      const match = debugText.match(/cursor\s+(-?\d+),(-?\d+)/);
      if (!match) return false;
      return Number(match[1]) >= 910 && Number(match[2]) >= 1050;
    }, null, { timeout: 2500 }).catch(() => undefined);

    const viewport = page.viewportSize();
    const suffix = `${viewport?.width ?? 'unknown'}x${viewport?.height ?? 'unknown'}`;
    await page.screenshot({
      path: path.join(outputRoot, `daejeon-trace-debug-${suffix}.png`),
      fullPage: true,
      animations: 'disabled',
    });

    const normalUrl = new URL(page.url());
    normalUrl.searchParams.delete('daejeonDebug');
    if (normalUrl.toString() !== page.url()) {
      await page.goto(normalUrl.toString(), { waitUntil: 'domcontentloaded' });
      await selectStadiumGuideOption(page, 'DAEJEON');
      await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
      await waitForVisibleSeatMapText(page, '대전 한화 공식 좌석도');
    }
  };

  await captureDaejeonDebugOverlay();

  const sectionFinder = page.locator('[data-testid="daejeon-section-finder"]:visible').first();
  await sectionFinder.waitFor({ state: 'visible', timeout: 5000 });
  const searchInput = sectionFinder.getByLabel('대전 구역 검색').first();
  const visibleDaejeonFinderContainsText = async (text) => {
    await page.waitForFunction((expectedText) => {
      const finder = Array.from(document.querySelectorAll('[data-testid="daejeon-section-finder"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });

      return Boolean(finder?.textContent?.includes(expectedText));
    }, text, { timeout: 5000 });
  };
  const clickDaejeonFinderButton = async (tokens, viaKeyboard = false) => {
    const found = await page.evaluate(({ expectedTokens, shouldClick }) => {
      const finder = Array.from(document.querySelectorAll('[data-testid="daejeon-section-finder"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      if (!finder) return false;

      const target = Array.from(finder.querySelectorAll('button'))
        .find((button) => {
          const text = `${button.textContent ?? ''} ${button.getAttribute('aria-label') ?? ''}`;
          return expectedTokens.every((token) => text.includes(token));
        });
      if (!target) return false;

      target.scrollIntoView({ block: 'center', inline: 'nearest' });
      target.focus();
      if (shouldClick) {
        target.click();
      }
      return true;
    }, { expectedTokens: tokens, shouldClick: !viaKeyboard });

    if (!found) {
      throw new Error(`Daejeon finder button not found for tokens: ${tokens.join(', ')}`);
    }

    if (viaKeyboard) {
      await page.keyboard.press('Enter');
    }
    await sleep(150);
  };
  const clickVisibleByTestId = async (testId) => {
    const clicked = await page.evaluate((controlTestId) => {
      const target = Array.from(document.querySelectorAll(`[data-testid="${controlTestId}"]`))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      if (!target) {
        return false;
      }
      target.click();
      return true;
    }, testId);
    if (!clicked) {
      throw new Error(`Visible test id not found: ${testId}`);
    }
    await sleep(120);
  };
  await searchInput.fill('카스');
  await visibleDaejeonFinderContainsText('카스존(응원단석)');
  await clickVisibleByTestId('daejeon-filter-cheer');
  await visibleDaejeonFinderContainsText('카스존(응원단석)');
  await searchInput.fill('');
  await clickVisibleByTestId('daejeon-filter-all');

  const exactBlockSearches = [
    { term: '100C', text: '100C' },
    { term: '104', text: '104' },
    { term: '121', text: '121' },
    { term: '225', text: '225' },
    { term: 'S37', text: 'S37' },
    { term: '400', text: '400' },
    { term: '413', text: '413' },
    { term: '425', text: '425' },
    { term: '426', text: '426' },
    { term: '500', text: '500' },
    { term: '509', text: '509' },
    { term: '330', text: '330' },
    { term: '휠체어', text: '휠체어' },
  ];

  for (const searchCase of exactBlockSearches) {
    await searchInput.fill(searchCase.term);
    await visibleDaejeonFinderContainsText(searchCase.text);
  }

  await searchInput.fill('105');
  await visibleDaejeonFinderContainsText('105');
  await clickDaejeonFinderButton(['내야 지정석B', '105']);
  await visibleTextLocator(page, '정확 블록').waitFor({ state: 'visible', timeout: 5000 });
  await visibleTextLocator(page, '105').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => {
    const layer = Array.from(document.querySelectorAll('[data-testid="daejeon-seatmap-transform-layer"]'))
      .find((candidate) => {
        const rect = candidate.closest('[data-testid="stadium-seat-map"]')?.getBoundingClientRect();
        return Boolean(rect && rect.width > 0 && rect.height > 0);
      });
    if (!(layer instanceof Element)) return false;

    const zoom = Number(layer.getAttribute('data-zoom') ?? '1');
    const panX = Number(layer.getAttribute('data-pan-x') ?? '0');
    const panY = Number(layer.getAttribute('data-pan-y') ?? '0');
    return zoom >= 1.19 && (Math.abs(panX) > 1 || Math.abs(panY) > 1);
  }, null, { timeout: 5000 });

  await searchInput.fill('');

  const clickDaejeonZoomControl = async (testId) => {
    await scrollDaejeonSeatMapIntoView();
    const clicked = await page.evaluate((controlTestId) => {
      const button = Array.from(document.querySelectorAll(`[data-testid="${controlTestId}"]`))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0
            && rect.height > 0;
        });
      if (!button) {
        return false;
      }
      if (!button.disabled) {
        button.click();
      }
      return true;
    }, testId);
    if (!clicked) {
      console.warn(`Daejeon zoom control not found: ${testId}`);
      return false;
    }
    await sleep(120);
    return true;
  };

  const readDaejeonTransformLayerContract = async () => page.evaluate(() => {
    const layer = Array.from(document.querySelectorAll('[data-testid="daejeon-seatmap-transform-layer"]'))
      .find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    const svg = layer?.querySelector('svg[aria-label="대전 한화생명볼파크 좌석도 구역 선택"]');

    return {
      zoom: Number(layer?.getAttribute('data-zoom') ?? '0'),
      panX: Number(layer?.getAttribute('data-pan-x') ?? '0'),
      panY: Number(layer?.getAttribute('data-pan-y') ?? '0'),
      hasSingleSvgImage: svg?.querySelectorAll('image').length === 1,
      hitPathCount: svg?.querySelectorAll('[data-testid^="daejeon-seat-block-"]').length ?? 0,
      displayPathCount: svg?.querySelectorAll('[data-testid^="daejeon-seat-display-"]').length ?? 0,
      siblingImageCount: layer ? Array.from(layer.children).filter((child) => child.tagName.toLowerCase() === 'img').length : -1,
      transform: layer instanceof HTMLElement ? layer.style.transform : '',
    };
  });

  const assertDaejeonTransformLayerContract = async (minimumZoom, label) => {
    const contract = await readDaejeonTransformLayerContract();
    if (
      contract.zoom < minimumZoom
      || !contract.hasSingleSvgImage
      || contract.hitPathCount !== 145
      || contract.displayPathCount !== 145
      || contract.siblingImageCount !== 0
      || !contract.transform.includes('translate(')
      || !contract.transform.includes('scale(')
    ) {
      throw new Error(`Daejeon image/path transform layer contract failed at ${label}: ${JSON.stringify(contract)}`);
    }
  };

  await assertDaejeonTransformLayerContract(1.19, 'finder-focus-1.2');
  const didZoomIn = await clickDaejeonZoomControl('daejeon-seatmap-zoom-in');
  if (didZoomIn) {
    await clickDaejeonZoomControl('daejeon-seatmap-zoom-in');
    await assertDaejeonTransformLayerContract(1.34, 'manual-zoom-1.35');
    const daejeonSeatMapSvg = page.locator('svg[aria-label="대전 한화생명볼파크 좌석도 구역 선택"]:visible').first();
    const daejeonSeatMapBox = await daejeonSeatMapSvg.boundingBox();
    if (daejeonSeatMapBox) {
      const startX = daejeonSeatMapBox.x + daejeonSeatMapBox.width * 0.55;
      const startY = daejeonSeatMapBox.y + daejeonSeatMapBox.height * 0.55;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 32, startY + 24, { steps: 4 });
      await page.mouse.up();
    }
    await clickDaejeonZoomControl('daejeon-seatmap-zoom-reset');
    await assertDaejeonTransformLayerContract(1, 'reset-1.0');
    await clickDaejeonZoomControl('daejeon-seatmap-zoom-out');
    await clickDaejeonZoomControl('daejeon-seatmap-zoom-reset');
    await assertDaejeonTransformLayerContract(1, 'reset-after-zoom-out');
  }

  await closeDetailPanel();
  await scrollDaejeonSeatMapIntoView();
  const directSeatBlock = page.locator('[data-testid="daejeon-seat-block-central-table-100__100c"]:visible').first();
  await directSeatBlock.click({ timeout: 5000, force: true });
  await visibleTextLocator(page, '중앙 탁자석').waitFor({ state: 'visible', timeout: 5000 });
  await visibleTextLocator(page, '100C').waitFor({ state: 'visible', timeout: 5000 });
  const directSeatBlockPathContract = await directSeatBlock.evaluate((element) => ({
    d: element.getAttribute('d'),
    hitAreaD: element.getAttribute('data-hit-area-d'),
  }));
  if (directSeatBlockPathContract.d !== directSeatBlockPathContract.hitAreaD) {
    throw new Error(`Daejeon selected state changed interactive hit-area path: ${JSON.stringify(directSeatBlockPathContract)}`);
  }

  const resolveDaejeonSvgClientPoint = async ({ x, y }) => {
    await hideDaejeonFixedSheetsForCoordinateClick();
    await scrollDaejeonSeatMapIntoView();
    const daejeonSeatMapSvg = page.locator('svg[aria-label="대전 한화생명볼파크 좌석도 구역 선택"]:visible').first();
    let box = await daejeonSeatMapSvg.boundingBox();
    if (!box) {
      throw new Error('Daejeon seatmap SVG box is missing.');
    }

    let point = {
      x: box.x + ((x / 920) * box.width),
      y: box.y + ((y / 1060) * box.height),
    };
    const viewport = page.viewportSize();
    for (let attempt = 0; attempt < 3 && viewport; attempt += 1) {
      if (
        point.x >= 24
        && point.x <= viewport.width - 24
        && point.y >= 24
        && point.y <= viewport.height - 24
      ) {
        break;
      }

      await page.evaluate(({ clientX, clientY, viewportWidth, viewportHeight }) => {
        window.scrollTo(
          window.scrollX + clientX - (viewportWidth / 2),
          window.scrollY + clientY - (viewportHeight / 2),
        );
      }, {
        clientX: point.x,
        clientY: point.y,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
      });
      await sleep(120);
      box = await daejeonSeatMapSvg.boundingBox();
      if (!box) {
        throw new Error('Daejeon seatmap SVG box is missing after scroll adjustment.');
      }
      point = {
        x: box.x + ((x / 920) * box.width),
        y: box.y + ((y / 1060) * box.height),
      };
    }

    return point;
  };

  const clickDaejeonSvgPoint = async ({ x, y }, options = {}) => {
    try {
      const clickedTestId = await page.evaluate(({ svgX, svgY }) => {
        const svg = Array.from(document.querySelectorAll('svg[aria-label="대전 한화생명볼파크 좌석도 구역 선택"]'))
          .find((candidate) => {
            const rect = candidate.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        if (!(svg instanceof SVGSVGElement)) {
          return null;
        }

        const svgPoint = svg.createSVGPoint();
        svgPoint.x = svgX;
        svgPoint.y = svgY;
        const target = Array.from(svg.querySelectorAll('[data-testid^="daejeon-seat-block-"]'))
          .filter((element) => (
            element instanceof SVGGeometryElement
            && element.getAttribute('pointer-events') !== 'none'
            && element.isPointInFill(svgPoint)
          ))
          .at(-1);
        if (!target) {
          return null;
        }

        target.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        }));
        return target.getAttribute('data-testid');
      }, { svgX: x, svgY: y });
      if (!clickedTestId && !options.allowMiss) {
        throw new Error(`Daejeon SVG point ${x},${y} did not resolve to a clickable hit-area.`);
      }
    } finally {
      await restoreDaejeonFixedSheetsAfterCoordinateClick();
    }
    await sleep(180);
  };

  const isDaejeonSeatBlockPressed = async (blockId) => (
    await page.locator(`[data-testid="daejeon-seat-block-${blockId}"][aria-pressed="true"]:visible`).count()
  ) > 0;

  const verifyDaejeonHitAreaContract = async (blockId) => {
    await closeDetailPanel();
    await searchInput.fill('');
    await clickVisibleByTestId('daejeon-filter-all');
    await clickDaejeonZoomControl('daejeon-seatmap-zoom-reset');
    await page.waitForFunction(() => {
      const layer = Array.from(document.querySelectorAll('[data-testid="daejeon-seatmap-transform-layer"]'))
        .find((candidate) => {
          const rect = candidate.closest('[data-testid="stadium-seat-map"]')?.getBoundingClientRect();
          return Boolean(rect && rect.width > 0 && rect.height > 0);
        });
      if (!(layer instanceof Element)) return false;

      return Number(layer.getAttribute('data-zoom') ?? '1') <= 1.01;
    }, null, { timeout: 5000 });
    await scrollDaejeonSeatMapIntoView();
    const locator = page.locator(`[data-testid="daejeon-seat-block-${blockId}"]:visible`).first();
    await locator.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction((testId) => {
      const target = document.querySelector(`[data-testid="${testId}"]`);
      return target?.getAttribute('pointer-events') === 'fill'
        && target?.getAttribute('tabindex') === '0';
    }, `daejeon-seat-block-${blockId}`, { timeout: 5000 });

    const before = await locator.evaluate((element) => ({
      d: element.getAttribute('d'),
      displayD: element.getAttribute('data-display-d'),
      hitAreaD: element.getAttribute('data-hit-area-d'),
      labelX: Number(element.getAttribute('data-label-x')),
      labelY: Number(element.getAttribute('data-label-y')),
    }));
    const visiblePathD = await page.locator(`[data-testid="daejeon-seat-display-${blockId}"]:visible`).first()
      .evaluate((element) => element.getAttribute('d'));
    if (!before.d || !before.displayD || !before.hitAreaD) {
      throw new Error(`Daejeon hit-area contract missing path data for ${blockId}: ${JSON.stringify(before)}`);
    }
    if (!Number.isFinite(before.labelX) || !Number.isFinite(before.labelY)) {
      throw new Error(`Daejeon hit-area contract missing label point for ${blockId}: ${JSON.stringify(before)}`);
    }
    if (visiblePathD !== before.displayD) {
      throw new Error(`Daejeon visible highlight path should use imageGeometry.d for ${blockId}`);
    }
    if (before.d !== before.hitAreaD) {
      throw new Error(`Daejeon interactive path should use hitAreaD for ${blockId}`);
    }

    await locator.hover({ timeout: 5000, force: true });
    const afterHover = await locator.evaluate((element) => element.getAttribute('d'));
    if (afterHover !== before.hitAreaD) {
      throw new Error(`Daejeon hover changed interactive hit-area path for ${blockId}`);
    }
  };

  const daejeonHoverSelectedContractBlockIds = [
    'central-table-100__100a',
    'central-table-100__100b',
    'central-table-100__100c',
    'first-infield-b-101-108__104',
    'first-infield-b-101-108__105',
    'first-infield-b-101-108__106',
    'first-infield-b-101-108__107',
    'first-infield-b-101-108__108',
    'first-infield-a-109-112-201-212__109',
    'first-infield-a-109-112-201-212__110',
    'third-infield-a-113-120-213-225__116',
    'third-infield-a-113-120-213-225__117',
    'third-infield-a-113-120-213-225__118',
    'third-infield-a-113-120-213-225__119',
    'third-infield-a-113-120-213-225__120',
    'third-infield-b-121-124__121',
    'third-infield-b-121-124__122',
    'outfield-reserved-509__509',
    'splash-jacuzzi-425__425',
    'splash-caravan-426__426',
  ];

  for (const blockId of daejeonHoverSelectedContractBlockIds) {
    await verifyDaejeonHitAreaContract(blockId);
  }

  const verifyDaejeonRetiredP2BlocksRemoved = async () => {
    const retiredP2Blocks = [
      { id: 'outfield-reserved-first-301-404__301', code: '301', canonicalName: '내야 탁자석(4층)' },
      { id: 'outfield-reserved-first-301-404__302', code: '302', canonicalName: '내야 탁자석(4층)' },
      { id: 'outfield-reserved-first-301-404__401', code: '401', canonicalName: '내야 탁자석(4층)' },
      { id: 'outfield-reserved-first-301-404__402', code: '402', canonicalName: '내야 탁자석(4층)' },
      { id: 'outfield-reserved-first-301-404__403', code: '403', canonicalName: '내야 탁자석(4층)' },
      { id: 'outfield-reserved-first-301-404__404', code: '404', canonicalName: '내야 탁자석(4층)' },
      { id: 'outfield-reserved-third-423-330__327', code: '327', canonicalName: '내야 탁자석(4층)' },
      { id: 'outfield-reserved-third-423-330__328', code: '328', canonicalName: '내야 탁자석(4층)' },
      { id: 'outfield-reserved-third-423-330__329', code: '329', canonicalName: '내야 탁자석(4층)' },
      { id: 'outfield-reserved-third-423-330__330', code: '330', canonicalName: '내야 탁자석(4층)' },
      { id: 'outfield-reserved-third-423-330__423', code: '423', canonicalName: '내야 탁자석(4층)' },
    ];

    await closeDetailPanel();
    await searchInput.fill('');
    await clickVisibleByTestId('daejeon-filter-all');
    await scrollDaejeonSeatMapIntoView();

    const svgProblems = await page.evaluate((blocks) => blocks
      .map((block) => {
        const element = document.querySelector(`[data-testid="daejeon-seat-block-${block.id}"]`);
        if (!element) {
          return null;
        }

        return { id: block.id, reason: 'retired-svg-hit-path-present' };
      })
      .filter(Boolean), retiredP2Blocks);

    if (svgProblems.length > 0) {
      throw new Error(`Retired P2 blocks should not render SVG hit paths: ${JSON.stringify(svgProblems)}`);
    }

    for (const block of retiredP2Blocks) {
      await searchInput.fill(block.code);
      await visibleDaejeonFinderContainsText(block.canonicalName);

      const retiredFinderCount = await page.locator(`button[aria-label="구역 선택 외야지정석 ${block.code}"]:visible`).count();
      if (retiredFinderCount > 0) {
        throw new Error(`Retired P2 finder item should not be shown for ${block.id}`);
      }

      const canonicalButton = page.locator(`button[aria-label="구역 선택 ${block.canonicalName} ${block.code}"]:visible`).first();
      const canonicalCount = await canonicalButton.count();
      if (canonicalCount === 0) {
        throw new Error(`Canonical Daejeon block should be shown for retired P2 code ${block.code}`);
      }
    }

    await searchInput.fill('');
  };

  await verifyDaejeonRetiredP2BlocksRemoved();

  const clickAllDaejeonLabelCoordinates = async () => {
    await closeDetailPanel();
    await scrollDaejeonSeatMapIntoView();

    const labelClickTargets = await page.evaluate(() => {
      const svg = Array.from(document.querySelectorAll('svg[aria-label="대전 한화생명볼파크 좌석도 구역 선택"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });

      if (!(svg instanceof SVGSVGElement)) return [];

      return Array.from(svg.querySelectorAll('[data-testid^="daejeon-seat-block-"]'))
        .map((element) => {
          const testId = element.getAttribute('data-testid') ?? '';
          const id = testId.replace('daejeon-seat-block-', '');
          const labelX = Number(element.getAttribute('data-label-x'));
          const labelY = Number(element.getAttribute('data-label-y'));
          const ariaLabel = element.getAttribute('aria-label') ?? '';
          const traceStatus = element.getAttribute('data-trace-status') ?? '';
          const rect = element.getBoundingClientRect();
          return { testId, id, labelX, labelY, ariaLabel, traceStatus, visible: rect.width > 0 && rect.height > 0 };
        })
        .filter((target) => target.testId && target.visible && target.traceStatus === 'OFFICIAL_IMAGE_TRACED' && Number.isFinite(target.labelX) && Number.isFinite(target.labelY));
    });

    if (labelClickTargets.length !== 145) {
      throw new Error(`Daejeon official-traced label coordinate click target count should be 145. Actual: ${labelClickTargets.length}`);
    }

  const requiredBoundaryIds = [
    'central-reserved-100__100a',
    'central-reserved-100__100b',
    'central-reserved-100__100c',
      'catcher-back-100__100a',
      'catcher-back-100__100b',
      'catcher-back-100__100c',
    'central-table-100__100a',
    'central-table-100__100b',
    'central-table-100__100c',
    'central-accessible__center',
    'first-infield-b-101-108__104',
    'first-infield-b-101-108__105',
    'first-infield-b-101-108__106',
    'first-infield-b-101-108__107',
    'first-infield-b-101-108__108',
    'first-infield-a-109-112-201-212__109',
    'first-infield-a-109-112-201-212__110',
    'first-infield-a-109-112-201-212__111',
    'first-infield-a-109-112-201-212__112',
      'first-infield-a-109-112-201-212__201',
      'first-infield-a-109-112-201-212__204',
      'first-infield-a-109-112-201-212__205',
      'first-infield-a-109-112-201-212__206',
      'first-infield-a-109-112-201-212__212',
      'third-infield-a-113-120-213-225__113',
      'third-infield-a-113-120-213-225__114',
      'third-infield-a-113-120-213-225__115',
      'third-infield-a-113-120-213-225__116',
      'third-infield-a-113-120-213-225__117',
      'third-infield-a-113-120-213-225__118',
      'third-infield-a-113-120-213-225__119',
      'third-infield-a-113-120-213-225__120',
      'third-infield-a-113-120-213-225__213',
      'third-infield-a-113-120-213-225__219',
      'third-infield-a-113-120-213-225__220',
      'third-infield-a-113-120-213-225__221',
      'third-infield-a-113-120-213-225__225',
      'third-infield-b-121-124__121',
      'third-infield-b-121-124__122',
      'third-infield-b-121-124__124',
      'cass-cheering-200__200',
      'first-infield-accessible__first-infield',
      'third-infield-accessible__third-infield',
      'innings-vip-400__400',
      'outfield-lawn-500__500',
      'outfield-accessible-third__left-outfield',
      'outfield-accessible-first__right-outfield',
      'outfield-table-third-501-503__501',
      'outfield-table-first-504-508__508',
      'outfield-reserved-509__509',
      'outfield-reserved-third-423-330__424',
      'splash-jacuzzi-425__425',
      'splash-caravan-426__426',
    ];

    const targetById = new Map(labelClickTargets.map((target) => [target.id, target]));
    const missingBoundaryIds = requiredBoundaryIds.filter((id) => !targetById.has(id));
    if (missingBoundaryIds.length > 0) {
      throw new Error(`Daejeon boundary label click targets are missing: ${missingBoundaryIds.join(', ')}`);
    }

    const orderedTargets = [
      ...requiredBoundaryIds.map((id) => targetById.get(id)).filter(Boolean),
      ...labelClickTargets.filter((target) => !requiredBoundaryIds.includes(target.id)),
    ];

    const labelHitFailures = await page.evaluate((targets) => {
      const svg = Array.from(document.querySelectorAll('svg[aria-label="대전 한화생명볼파크 좌석도 구역 선택"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      if (!(svg instanceof SVGSVGElement)) {
        return [{ error: 'visible SVG missing' }];
      }

      return targets
        .map((target) => {
          const svgPoint = svg.createSVGPoint();
          svgPoint.x = target.labelX;
          svgPoint.y = target.labelY;
          const hits = Array.from(svg.querySelectorAll('[data-testid^="daejeon-seat-block-"]'))
            .filter((element) => (
              element instanceof SVGGeometryElement
              && element.getAttribute('pointer-events') !== 'none'
              && element.isPointInFill(svgPoint)
            ))
            .map((element) => element.getAttribute('data-testid'));
          const topHit = hits.at(-1) ?? null;
          return topHit === target.testId ? null : {
            id: target.id,
            expectedTestId: target.testId,
            topHit,
            hits: hits.slice(-8),
          };
        })
        .filter(Boolean);
    }, orderedTargets);

    if (labelHitFailures.length > 0) {
      throw new Error(`Daejeon label coordinate top-hit failures: ${JSON.stringify(labelHitFailures)}`);
    }

    await restoreDaejeonFixedSheetsAfterCoordinateClick();
  };

  const labelSweepViewport = page.viewportSize();
  if ((labelSweepViewport?.width ?? 0) >= 1000) {
    await clickAllDaejeonLabelCoordinates();
  }

  const representativeCoordinateBlockChecks = [
    { blockId: 'central-table-100__100a', code: '100A' },
    { blockId: 'central-table-100__100b', code: '100B' },
    { blockId: 'central-table-100__100c', code: '100C' },
    { blockId: 'first-infield-b-101-108__104', code: '104' },
    { blockId: 'first-infield-b-101-108__105', code: '105' },
    { blockId: 'first-infield-b-101-108__106', code: '106' },
    { blockId: 'first-infield-b-101-108__107', code: '107' },
    { blockId: 'first-infield-b-101-108__108', code: '108' },
    { blockId: 'first-infield-a-109-112-201-212__109', code: '109' },
    { blockId: 'first-infield-a-109-112-201-212__110', code: '110' },
    { blockId: 'third-infield-a-113-120-213-225__115', code: '115' },
    { blockId: 'third-infield-a-113-120-213-225__116', code: '116' },
    { blockId: 'third-infield-a-113-120-213-225__117', code: '117' },
    { blockId: 'third-infield-a-113-120-213-225__118', code: '118' },
    { blockId: 'third-infield-a-113-120-213-225__119', code: '119' },
    { blockId: 'third-infield-a-113-120-213-225__120', code: '120' },
    { blockId: 'third-infield-b-121-124__121', code: '121' },
    { blockId: 'third-infield-b-121-124__122', code: '122' },
    { blockId: 'third-infield-b-121-124__124', code: '124' },
    { blockId: 'cass-cheering-200__200', code: '200' },
    { blockId: 'innings-vip-400__400', code: '400' },
    { blockId: 'outfield-lawn-500__500', code: '500' },
    { blockId: 'outfield-table-third-501-503__501', code: '501' },
    { blockId: 'outfield-table-first-504-508__508', code: '508' },
    { blockId: 'outfield-reserved-509__509', code: '509' },
    { blockId: 'outfield-reserved-third-423-330__424', code: '424' },
    { blockId: 'splash-jacuzzi-425__425', code: '425' },
    { blockId: 'splash-caravan-426__426', code: '426' },
    { blockId: 'central-accessible__center', code: '중앙 휠체어' },
    { blockId: 'first-infield-accessible__first-infield', code: '1루 휠체어' },
    { blockId: 'third-infield-accessible__third-infield', code: '3루 휠체어' },
    { blockId: 'outfield-accessible-third__left-outfield', code: '좌측 외야 휠체어' },
    { blockId: 'outfield-accessible-first__right-outfield', code: '우측 외야 휠체어' },
  ];

  for (const check of representativeCoordinateBlockChecks) {
    await closeDetailPanel();
    const target = await page.evaluate((blockId) => {
      const element = document.querySelector(`[data-testid="daejeon-seat-block-${blockId}"]`);
      if (!(element instanceof SVGPathElement)) return null;
      return {
        labelX: Number(element.getAttribute('data-label-x')),
        labelY: Number(element.getAttribute('data-label-y')),
        ariaLabel: element.getAttribute('aria-label') ?? '',
        hitAreaD: element.getAttribute('data-hit-area-d') ?? '',
        d: element.getAttribute('d') ?? '',
      };
    }, check.blockId);
    if (!target || !Number.isFinite(target.labelX) || !Number.isFinite(target.labelY)) {
      throw new Error(`Daejeon representative coordinate target is missing: ${check.blockId}`);
    }
    if (target.d !== target.hitAreaD) {
      throw new Error(`Daejeon representative coordinate target does not use hitAreaD: ${check.blockId}`);
    }

    await clickDaejeonSvgPoint({ x: target.labelX, y: target.labelY });
    if (!(await isDaejeonSeatBlockPressed(check.blockId))) {
      throw new Error(`Daejeon representative coordinate click did not select ${check.blockId} (${check.code})`);
    }
  }

  const specialHitAreaChecks = [
    {
      blockId: 'splash-jacuzzi-425__425',
      detail: '스플래쉬 자쿠지(인피니티 풀)',
      block: '425',
      selectPoint: { x: 143, y: 663 },
      excludedPoints: [{ x: 118, y: 657 }, { x: 129, y: 697 }, { x: 160, y: 660 }],
    },
    {
      blockId: 'splash-caravan-426__426',
      detail: '스플래쉬 카라반(인피니티 풀)',
      block: '426',
      selectPoint: { x: 109, y: 589 },
      excludedPoints: [{ x: 82, y: 590 }, { x: 99, y: 620 }, { x: 135, y: 588 }],
    },
  ];

  if ((page.viewportSize()?.width ?? 0) >= 1000) {
    for (const check of specialHitAreaChecks) {
      await closeDetailPanel();
      await clickDaejeonSvgPoint(check.selectPoint);
      if (!(await isDaejeonSeatBlockPressed(check.blockId))) {
        throw new Error(`Daejeon special hit-area did not select expected block: ${check.blockId}`);
      }
      await visibleTextLocator(page, check.detail).waitFor({ state: 'visible', timeout: 5000 });
      await visibleTextLocator(page, check.block).waitFor({ state: 'visible', timeout: 5000 });

      for (const excludedPoint of check.excludedPoints) {
        await closeDetailPanel();
        await clickDaejeonSvgPoint(excludedPoint, { allowMiss: true });
        if (await isDaejeonSeatBlockPressed(check.blockId)) {
          throw new Error(`Daejeon special hit-area ${check.blockId} still includes adjacent point ${excludedPoint.x},${excludedPoint.y}`);
        }
      }
    }
  }

  const representativeSections = [
    { tokens: ['포수 후면석', '100A'], detail: '포수 후면석', block: '100A', viaKeyboard: true },
    { tokens: ['카스존(응원단석)', '200'], detail: '카스존(응원단석)', block: '200' },
    { tokens: ['외야지정석', '509'], detail: '외야지정석', block: '509' },
    { tokens: ['밤켈존(잔디석)', '500'], detail: '밤켈존(잔디석)', block: '500' },
    { tokens: ['이닝스 VIP 바 & 룸/테라스', '400'], detail: '이닝스 VIP 바 & 룸/테라스', block: '400' },
    { tokens: ['스플래쉬 자쿠지(인피니티 풀)', '425'], detail: '스플래쉬 자쿠지(인피니티 풀)', block: '425' },
    { tokens: ['스플래쉬 카라반(인피니티 풀)', '426'], detail: '스플래쉬 카라반(인피니티 풀)', block: '426' },
    { tokens: ['중앙 휠체어석', '중앙'], detail: '중앙 휠체어석', block: '중앙' },
    { tokens: ['내야 휠체어석', '1루 내야'], detail: '내야 휠체어석', block: '1루 내야' },
    { tokens: ['외야 휠체어석', '우측 외야'], detail: '외야 휠체어석', block: '우측 외야' },
  ];

  for (const sectionName of representativeSections) {
    await closeDetailPanel();
    await sectionFinder.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
    await clickDaejeonFinderButton(sectionName.tokens, sectionName.viaKeyboard);
    await visibleTextLocator(page, sectionName.detail).waitFor({ state: 'visible', timeout: 5000 });
    await visibleTextLocator(page, '정확 블록').waitFor({ state: 'visible', timeout: 5000 });
    await visibleTextLocator(page, sectionName.block).waitFor({ state: 'visible', timeout: 5000 });
    const seatViewTitle = visibleTextLocator(page, '실제 시야 사진');
    await seatViewTitle.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => undefined);
    await seatViewTitle.waitFor({ state: 'visible', timeout: 5000 });
    const emptyGalleryText = visibleTextLocator(page, '아직 등록된 시야가 없어요');
    await emptyGalleryText.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => undefined);
    await emptyGalleryText.waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('button:visible', { hasText: '다이어리에서 시야 사진 공유하기' }).first()
      .waitFor({ state: 'visible', timeout: 5000 });
  }

  await page.locator('button:visible', { hasText: '다이어리에서 시야 사진 공유하기' }).first()
    .click({ timeout: 5000, force: true });
  await page.waitForFunction(() => {
    const rawDraft = window.sessionStorage.getItem('diary-draft-storage');
    if (!rawDraft) return false;

    try {
      const parsedDraft = JSON.parse(rawDraft);
      const pendingDraft = parsedDraft?.state?.pendingDraft;
      return pendingDraft?.stadium === 'DAEJEON'
        && pendingDraft?.team === '한화'
        && Boolean(pendingDraft?.section)
        && Boolean(pendingDraft?.block)
        && pendingDraft?.seatRow === ''
        && pendingDraft?.seatNumber === '';
    } catch {
      return false;
    }
  }, null, { timeout: 5000 });

  const stadiumUrl = new URL('/stadium', page.url()).toString();
  const stadiumBaseUrl = new URL('/', stadiumUrl).toString();
  let didReturnToStadium = false;
  let returnToStadiumError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await waitForReachableBaseUrl(stadiumBaseUrl, 5000);
    try {
      await page.goto(stadiumUrl, { waitUntil: 'domcontentloaded' });
      didReturnToStadium = true;
      break;
    } catch (error) {
      returnToStadiumError = error;
      await sleep(500);
    }
  }

  if (!didReturnToStadium) {
    throw returnToStadiumError;
  }
  await page.getByText('구장 가이드').first().waitFor({ state: 'visible', timeout: 15000 });
};

const verifyDaeguOverlayClicks = async (page) => {
  await selectStadiumGuideOption(page, 'DAEGU');
  await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  await visibleTextLocator(page, '대구 삼성 공식 좌석도').waitFor({ state: 'visible', timeout: 5000 });

  const manualStateVisible = await page.locator('[data-testid="daegu-official-seatmap-required"]:visible').first()
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  if (manualStateVisible) {
    await page.locator(':visible', { hasText: 'MANUAL_BASEBALL_DATA_REQUIRED' }).first().waitFor({ state: 'visible', timeout: 5000 });
    return;
  }

  const closeDetailPanel = async () => {
    const closeButton = page.locator('button[aria-label="닫기"]:visible').first();
    if (await closeButton.count()) {
      await closeButton.click({ timeout: 3000 }).catch(() => undefined);
      await sleep(150);
    }
  };

  const waitForSelectedSection = async (ariaLabel, timeout = 5000) => page.waitForFunction((label) => {
    const buttons = Array.from(document.querySelectorAll('[data-testid="daegu-seatmap-svg"] [role="button"]'));
    return buttons.some((button) => (
      button.getAttribute('aria-label') === label
      && button.getAttribute('aria-pressed') === 'true'
    ));
  }, ariaLabel, { timeout });

  const representativeSections = [
    { ariaLabel: '블루존 3-1 3-1' },
    { ariaLabel: '원정 응원석 1-1 1-1' },
    { ariaLabel: 'VIP석 M-1 M-1' },
    { ariaLabel: '1루 테이블석 T1-1 T1-1' },
    { ariaLabel: 'SKY 하단 지정석 S22 S22' },
    { ariaLabel: '외야 지정석 LF-1 LF-1' },
    { ariaLabel: '휠체어 장애인석 U22 U22 휠체어' },
  ];

  for (const sectionName of representativeSections) {
    await closeDetailPanel();
    await scrollVisibleSeatMapIntoView(page);
    const section = visibleSeatMapHitAreaByLabel(page, sectionName.ariaLabel);
    await section.click({ timeout: 5000, force: true });
    const clickSelected = await waitForSelectedSection(sectionName.ariaLabel, 1200)
      .then(() => true)
      .catch(() => false);
    if (!clickSelected) {
      await dispatchSeatMapSectionClick(section);
    }
    await waitForSelectedSection(sectionName.ariaLabel, 5000).catch((error) => {
      throw new Error(`Daegu section did not become selected: ${sectionName.ariaLabel}. ${error instanceof Error ? error.message : String(error)}`);
    });
    const seatViewTitle = visibleTextLocator(page, '실제 시야 사진');
    await seatViewTitle.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => undefined);
    await seatViewTitle.waitFor({ state: 'visible', timeout: 5000 });
    const emptyGalleryText = visibleTextLocator(page, '아직 등록된 시야가 없어요');
    await emptyGalleryText.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => undefined);
    await emptyGalleryText.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
  }

  await closeDetailPanel();
};

const verifyDaeguFullOverlayClicks = async (page) => {
  const debugUrl = new URL(page.url());
  debugUrl.searchParams.set('daeguDebug', '1');
  if (debugUrl.toString() !== page.url()) {
    await page.goto(debugUrl.toString(), { waitUntil: 'domcontentloaded' });
  }

  await selectStadiumGuideOption(page, 'DAEGU');
  await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  await visibleTextLocator(page, '대구 삼성 공식 좌석도').waitFor({ state: 'visible', timeout: 5000 });

  const manualStateVisible = await page.locator('[data-testid="daegu-official-seatmap-required"]:visible').first()
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  if (manualStateVisible) {
    await page.locator(':visible', { hasText: 'MANUAL_BASEBALL_DATA_REQUIRED' }).first().waitFor({ state: 'visible', timeout: 5000 });
    return {
      type: 'daegu-full-click',
      stadiumId: 'DAEGU',
      status: 'manual-required',
      hitAreaCount: 0,
      clickedCount: 0,
      debugScreenshotPath: null,
      lastSelectedLabel: null,
    };
  }

  const closeDetailPanel = async () => {
    const closeButton = page.locator('button[aria-label="닫기"]:visible').first();
    if (await closeButton.count()) {
      await closeButton.click({ timeout: 3000 }).catch(() => undefined);
      await sleep(120);
    }
  };

  const seatMapSvg = page.locator('[data-testid="daegu-seatmap-svg"]:visible').first();
  await seatMapSvg.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => (
    Array.from(document.querySelectorAll('[data-testid="daegu-seatmap-svg"]'))
      .some((svg) => {
        const rect = svg.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && svg.querySelectorAll('[role="button"]').length >= 150;
      })
  ), null, { timeout: 10000 });

  const hitAreas = seatMapSvg.locator('[role="button"]');
  const hitAreaCount = await hitAreas.count();
  if (hitAreaCount < 150) {
    throw new Error(`Daegu official seatmap full click check expected at least 150 hit areas, got ${hitAreaCount}.`);
  }

  const verifyDaeguFilterInteractions = async () => {
    const filterTargets = [
      { filterTestId: 'daegu-filter-cheer', ariaLabel: '블루존 3-1 3-1' },
      { filterTestId: 'daegu-filter-table', ariaLabel: '1루 테이블석 T1-1 T1-1' },
      { filterTestId: 'daegu-filter-outfield', ariaLabel: '외야 지정석 LF-1 LF-1' },
      { filterTestId: 'daegu-filter-accessible', ariaLabel: '휠체어 장애인석 U22 U22 휠체어' },
    ];

    for (const target of filterTargets) {
      await closeDetailPanel();
      await clickVisibleSeatMapFilter(page, target.filterTestId);
      await scrollVisibleSeatMapIntoView(page);
      const section = visibleSeatMapHitAreaByLabel(page, target.ariaLabel);
      await dispatchSeatMapSectionClick(section);
      await page.waitForFunction((label) => {
        const seatMapSvg = Array.from(document.querySelectorAll('[data-testid="daegu-seatmap-svg"]'))
          .find((svg) => {
            const rect = svg.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        return Array.from(seatMapSvg?.querySelectorAll('[role="button"]') ?? [])
          .some((button) => button.getAttribute('aria-label') === label && button.getAttribute('aria-pressed') === 'true');
      }, target.ariaLabel, { timeout: 5000 });
    }

    await closeDetailPanel();
    await clickVisibleSeatMapFilter(page, 'daegu-filter-all');
  };

  await verifyDaeguFilterInteractions();

  await scrollVisibleSeatMapIntoView(page);
  const viewport = page.viewportSize();
  const debugScreenshotPath = path.join(outputRoot, `daegu-debug-overlay-${viewport?.width ?? 'unknown'}x${viewport?.height ?? 'unknown'}.png`);
  await page.screenshot({
    path: debugScreenshotPath,
    fullPage: true,
    animations: 'disabled',
  });

  const waitForPressedHitArea = async (index, ariaLabel, timeout = 3000) => page.waitForFunction(({ targetIndex, targetLabel }) => {
    const seatMapSvg = Array.from(document.querySelectorAll('[data-testid="daegu-seatmap-svg"]'))
      .find((svg) => {
        const rect = svg.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    const buttons = Array.from(seatMapSvg?.querySelectorAll('[role="button"]') ?? []);
    const button = buttons[targetIndex];
    return Boolean(
      button
      && button.getAttribute('aria-label') === targetLabel
      && button.getAttribute('aria-pressed') === 'true'
    );
  }, { targetIndex: index, targetLabel: ariaLabel }, { timeout });

  let clickedCount = 0;
  let lastSelectedLabel = null;

  try {
    await closeDetailPanel();
    for (let index = 0; index < hitAreaCount; index += 1) {
      const section = hitAreas.nth(index);
      const ariaLabel = await section.getAttribute('aria-label') || `hit-area-${index + 1}`;
      await dispatchSeatMapSectionClick(section);
      await waitForPressedHitArea(index, ariaLabel);
      clickedCount += 1;
      lastSelectedLabel = ariaLabel;
    }
    await seatViewTitleLocator(page).waitFor({ state: 'visible', timeout: 5000 });
    await visibleTextLocator(page, '아직 등록된 시야가 없어요').waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
  } catch (error) {
    throw new Error(`Daegu official seatmap full click failed after ${clickedCount}/${hitAreaCount} hit areas. Last selected=${lastSelectedLabel ?? 'none'}. ${error.message}`);
  }

  await closeDetailPanel();
  return {
    type: 'daegu-full-click',
    stadiumId: 'DAEGU',
    status: 'passed',
    hitAreaCount,
    clickedCount,
    debugScreenshotPath,
    lastSelectedLabel,
  };
};

const verifySuwonOverlayClicks = async (page) => {
  const debugUrl = new URL(page.url());
  debugUrl.searchParams.set('suwonDebug', '1');
  await page.goto(debugUrl.toString(), { waitUntil: 'domcontentloaded' });
  await selectStadiumGuideOption(page, 'SUWON');
  await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  await visibleTextLocator(page, '수원 kt 위즈 파크 공식 좌석도').waitFor({ state: 'visible', timeout: 5000 });

  if (await page.getByTestId('suwon-official-seatmap-required').count()) {
    await visibleTextLocator(page, 'MANUAL_BASEBALL_DATA_REQUIRED').waitFor({ state: 'visible', timeout: 5000 });
    return;
  }

  const closeDetailPanel = async () => {
    const closeButton = page.getByRole('button', { name: '닫기' }).first();
    if (await closeButton.count()) {
      await closeButton.click({ timeout: 3000 }).catch(() => undefined);
      await sleep(150);
    }
  };

  const resolveImageCoordinateClientPoint = async (x, y) => {
    const svgCandidates = page.getByTestId('suwon-seatmap-svg');
    await svgCandidates.first().waitFor({ state: 'attached', timeout: 10000 });
    const candidateBoxes = await svgCandidates.evaluateAll((elements) => elements.map((element, index) => {
      const rect = element.getBoundingClientRect();
      return { index, width: rect.width, height: rect.height };
    }));
    const targetCandidate = candidateBoxes.find((box) => box.width > 0 && box.height > 0);
    if (!targetCandidate) {
      throw new Error(`Unable to resolve visible Suwon seat map SVG candidate: ${JSON.stringify(candidateBoxes)}`);
    }
    const svg = svgCandidates.nth(targetCandidate.index);
    await svg.evaluate((element, coord) => {
      const rect = element.getBoundingClientRect();
      const viewBox = element.viewBox?.baseVal;
      const viewBoxY = viewBox?.y || 0;
      const viewBoxHeight = viewBox?.height || 1000;
      const targetDocumentY = window.scrollY + rect.top + ((coord.y - viewBoxY) / viewBoxHeight) * rect.height;
      window.scrollTo({
        top: Math.max(0, targetDocumentY - window.innerHeight / 2),
        behavior: 'instant',
      });
    }, { x, y });
    await sleep(80);
    const box = await svg.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const viewBox = element.viewBox?.baseVal;
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        viewBoxX: viewBox?.x || 0,
        viewBoxY: viewBox?.y || 0,
        viewBoxWidth: viewBox?.width || 1000,
        viewBoxHeight: viewBox?.height || 1000,
      };
    });
    if (!box.width || !box.height) {
      throw new Error('Unable to resolve Suwon seat map SVG bounds for coordinate click');
    }
    return {
      x: box.x + ((x - box.viewBoxX) / box.viewBoxWidth) * box.width,
      y: box.y + ((y - box.viewBoxY) / box.viewBoxHeight) * box.height,
    };
  };

  const hoverImageCoordinate = async (x, y, expectedBlockId) => {
    const point = await resolveImageCoordinateClientPoint(x, y);
    await page.mouse.move(point.x, point.y);
    await sleep(80);
    const hoveredBlockId = await page.evaluate(({ clientX, clientY }) => {
      const element = document.elementFromPoint(clientX, clientY);
      return element?.closest('[data-block-id]')?.getAttribute('data-block-id') ?? null;
    }, { clientX: point.x, clientY: point.y });
    if (hoveredBlockId !== expectedBlockId) {
      throw new Error(`Suwon hover at ${x},${y} expected ${expectedBlockId}, got ${hoveredBlockId ?? 'none'}`);
    }
  };

  const clickImageCoordinate = async (x, y) => {
    const point = await resolveImageCoordinateClientPoint(x, y);
    await page.mouse.click(point.x, point.y);
  };

  const representativeSections = [
    { id: 'suwon-101', button: /101 내야지정석|101/, detail: '101 내야지정석', point: [3045, 2510] },
    { id: 'suwon-102', button: /102 내야지정석|102/, detail: '102 내야지정석', point: [2997, 2596] },
    { id: 'suwon-103', button: /103 내야지정석|103/, detail: '103 내야지정석', point: [2949, 2682] },
    { id: 'suwon-104', button: /104 내야지정석|104/, detail: '104 내야지정석', point: [2901, 2769] },
    { id: 'suwon-105', button: /105 내야지정석|105/, detail: '105 내야지정석', point: [2853, 2855] },
    { id: 'suwon-106', button: /106 내야지정석|106/, detail: '106 내야지정석', point: [2806, 2941] },
    { id: 'suwon-107', button: /107 1루 응원지정석|107/, detail: '107 1루 응원지정석', point: [2757, 3028] },
    { id: 'suwon-108', button: /108 1루 응원지정석|108/, detail: '108 1루 응원지정석', point: [2709, 3115] },
    { id: 'suwon-109', button: /109 1루 응원지정석|109/, detail: '109 1루 응원지정석', point: [2661, 3201] },
    { id: 'suwon-110', button: /110 1루 응원지정석|110/, detail: '110 1루 응원지정석', point: [2613, 3276] },
    { id: 'suwon-111', button: /111 내야지정석|111/, detail: '111 내야지정석', point: [2546, 3367] },
    { id: 'suwon-112', button: /112 내야지정석|112/, detail: '112 내야지정석', point: [2504, 3454] },
    { id: 'suwon-113', button: /113 내야지정석|113/, detail: '113 내야지정석', point: [2456, 3541] },
    { id: 'suwon-114', button: /114 중앙지정석|114/, detail: '114 중앙지정석', point: [2407, 3628] },
    { id: 'suwon-115', button: /115 중앙지정석|115/, detail: '115 중앙지정석', point: [2365, 3709] },
    { id: 'suwon-116', button: /116 중앙지정석|116/, detail: '116 중앙지정석', point: [2230, 3700] },
    { id: 'suwon-117', button: /117 중앙지정석|117/, detail: '117 중앙지정석', point: [2058, 3766] },
    { id: 'suwon-118', button: /118 중앙지정석|118/, detail: '118 중앙지정석', point: [1885, 3700] },
    { id: 'suwon-119', button: /119 중앙지정석|119/, detail: '119 중앙지정석', point: [1750, 3706] },
    { id: 'suwon-120', button: /120 중앙지정석|120/, detail: '120 중앙지정석', point: [1708, 3627] },
    { id: 'suwon-121', button: /121 중앙지정석|121/, detail: '121 중앙지정석', point: [1660, 3540] },
    { id: 'suwon-122', button: /122 중앙지정석|122/, detail: '122 중앙지정석', point: [1612, 3453] },
    { id: 'suwon-123', button: /123 중앙지정석|123/, detail: '123 중앙지정석', point: [1564, 3365] },
    { id: 'suwon-124', button: /124 내야지정석|124/, detail: '124 내야지정석', point: [1516, 3279] },
    { id: 'suwon-125', button: /125 내야지정석|125/, detail: '125 내야지정석', point: [1467, 3192] },
    { id: 'suwon-126', button: /126 내야지정석|126/, detail: '126 내야지정석', point: [1422, 3105] },
    { id: 'suwon-127', button: /127 3루 응원지정석|127/, detail: '127 3루 응원지정석', point: [1359, 3023] },
    { id: 'suwon-128', button: /128 3루 응원지정석|128/, detail: '128 3루 응원지정석', point: [1309, 2941] },
    { id: 'suwon-129', button: /129 3루 응원지정석|129/, detail: '129 3루 응원지정석', point: [1261, 2854] },
    { id: 'suwon-130', button: /130 3루 응원지정석|130/, detail: '130 3루 응원지정석', point: [1213, 2768] },
    { id: 'suwon-131', button: /131 내야지정석|131/, detail: '131 내야지정석', point: [1166, 2682] },
    { id: 'suwon-132', button: /132 내야지정석|132/, detail: '132 내야지정석', point: [1118, 2596] },
    { id: 'suwon-133', button: /133 내야지정석|133/, detail: '133 내야지정석', point: [1070, 2510] },
    { id: 'suwon-201', button: /201 내야지정석|201/, detail: '201 내야지정석', point: [3210, 2618] },
    { id: 'suwon-202', button: /202 내야지정석|202/, detail: '202 내야지정석', point: [3173, 2710] },
    { id: 'suwon-203', button: /203 내야지정석|203/, detail: '203 내야지정석', point: [3133, 2802] },
    { id: 'suwon-204', button: /204 내야지정석|204/, detail: '204 내야지정석', point: [3031, 2851] },
    { id: 'suwon-205', button: /205 내야지정석|205/, detail: '205 내야지정석', point: [2987, 2938] },
    { id: 'suwon-206', button: /206 내야지정석|206/, detail: '206 내야지정석', point: [2922, 3015] },
    { id: 'suwon-207', button: /207 내야지정석|207/, detail: '207 내야지정석', point: [2872, 3104] },
    { id: 'suwon-208', button: /208 내야지정석|208/, detail: '208 내야지정석', point: [2832, 3187] },
    { id: 'suwon-209', button: /209 내야지정석|209/, detail: '209 내야지정석', point: [2777, 3279] },
    { id: 'suwon-210', button: /210 내야지정석|210/, detail: '210 내야지정석', point: [2738, 3368] },
    { id: 'suwon-211', button: /211 내야지정석|211/, detail: '211 내야지정석', point: [2691, 3460] },
    { id: 'suwon-212', button: /212 내야지정석|212/, detail: '212 내야지정석', point: [2641, 3548] },
    { id: 'suwon-213', button: /213 내야지정석|213/, detail: '213 내야지정석', point: [2597, 3637] },
    { id: 'suwon-214', button: /214 내야지정석|214/, detail: '214 내야지정석', point: [2544, 3721] },
    { id: 'suwon-215', button: /215 내야지정석|215/, detail: '215 내야지정석', point: [2492, 3813] },
    { id: 'suwon-216', button: /216 중앙지정석|216/, detail: '216 중앙지정석', point: [2325, 3887] },
    { id: 'suwon-217', button: /217 중앙지정석|217/, detail: '217 중앙지정석', point: [2058, 3954] },
    { id: 'suwon-218', button: /218 중앙지정석|218/, detail: '218 중앙지정석', point: [1790, 3888] },
    { id: 'suwon-301', button: /301 내야일반석|301/, detail: '301 내야일반석', point: [3157, 2931] },
    { id: 'suwon-302', button: /302 내야일반석|302/, detail: '302 내야일반석', point: [3115, 3018] },
    { id: 'suwon-303', button: /303 내야일반석|303/, detail: '303 내야일반석', point: [3080, 3118] },
    { id: 'suwon-304', button: /304 내야일반석|304/, detail: '304 내야일반석', point: [3031, 3206] },
    { id: 'suwon-305', button: /305 내야일반석|305/, detail: '305 내야일반석', point: [2976, 3295] },
    { id: 'suwon-306', button: /306 내야일반석|306/, detail: '306 내야일반석', point: [2933, 3382] },
    { id: 'suwon-307', button: /307 내야일반석|307/, detail: '307 내야일반석', point: [2880, 3465] },
    { id: 'suwon-308', button: /308 내야일반석|308/, detail: '308 내야일반석', point: [2827, 3556] },
    { id: 'suwon-309', button: /309 내야일반석|309/, detail: '309 내야일반석', point: [2779, 3644] },
    { id: 'suwon-310', button: /310 내야일반석|310/, detail: '310 내야일반석', point: [2730, 3728] },
    { id: 'suwon-311', button: /311 내야일반석|311/, detail: '311 내야일반석', point: [2680, 3821] },
    { id: 'suwon-312', button: /312 내야일반석|312/, detail: '312 내야일반석', point: [2621, 3919] },
    { id: 'suwon-313', button: /313 내야일반석|313/, detail: '313 내야일반석', point: [2454, 4068] },
    { id: 'suwon-314', button: /314 중앙지정석|314/, detail: '314 중앙지정석', point: [2201, 4167] },
    { id: 'suwon-315', button: /315 중앙지정석|315/, detail: '315 중앙지정석', point: [1917, 4164] },
    { id: 'suwon-316', button: /316 중앙지정석|316/, detail: '316 중앙지정석', point: [1655, 4074] },
    { id: 'suwon-317', button: /317 중앙지정석|317/, detail: '317 중앙지정석', point: [1498, 3923] },
    { id: 'suwon-318', button: /318 중앙지정석|318/, detail: '318 중앙지정석', point: [1438, 3821] },
    { id: 'suwon-319', button: /319 중앙지정석|319/, detail: '319 중앙지정석', point: [1388, 3732] },
    { id: 'suwon-320', button: /320 내야일반석|320/, detail: '320 내야일반석', point: [1334, 3642] },
    { id: 'suwon-321', button: /321 내야일반석|321/, detail: '321 내야일반석', point: [1287, 3554] },
    { id: 'suwon-322', button: /322 내야일반석|322/, detail: '322 내야일반석', point: [1239, 3468] },
    { id: 'suwon-323', button: /323 내야일반석|323/, detail: '323 내야일반석', point: [1180, 3384] },
    { id: 'suwon-324', button: /324 내야일반석|324/, detail: '324 내야일반석', point: [1131, 3297] },
    { id: 'suwon-325', button: /325 내야일반석|325/, detail: '325 내야일반석', point: [1083, 3208] },
    { id: 'suwon-326', button: /326 내야일반석|326/, detail: '326 내야일반석', point: [1042, 3116] },
    { id: 'suwon-327', button: /327 내야일반석|327/, detail: '327 내야일반석', point: [1004, 3023] },
    { id: 'suwon-328', button: /328 내야일반석|328/, detail: '328 내야일반석', point: [960, 2930] },
    { id: 'suwon-401', button: /401 스카이존|401/, detail: '401 스카이존', point: [3359, 3555] },
    { id: 'suwon-402', button: /402 스카이존|402/, detail: '402 스카이존', point: [3290, 3697] },
    { id: 'suwon-403', button: /403 스카이존|403/, detail: '403 스카이존', point: [3219, 3833] },
    { id: 'suwon-404', button: /404 스카이존|404/, detail: '404 스카이존', point: [3152, 3966] },
    { id: 'suwon-405', button: /405 스카이존|405/, detail: '405 스카이존', point: [3084, 4099] },
    { id: 'suwon-406', button: /406 스카이존|406/, detail: '406 스카이존', point: [3007, 4238] },
    { id: 'suwon-407', button: /407 스카이존|407/, detail: '407 스카이존', point: [2921, 4370] },
    { id: 'suwon-408', button: /408 스카이존|408/, detail: '408 스카이존', point: [2816, 4495] },
    { id: 'suwon-409', button: /409 스카이존|409/, detail: '409 스카이존', point: [2675, 4603] },
    { id: 'suwon-410', button: /410 스카이존|410/, detail: '410 스카이존', point: [2516, 4686] },
    { id: 'suwon-411', button: /411 스카이존|411/, detail: '411 스카이존', point: [2347, 4740] },
    { id: 'suwon-412', button: /412 스카이존|412/, detail: '412 스카이존', point: [2155, 4777] },
    { id: 'suwon-413', button: /413 스카이존|413/, detail: '413 스카이존', point: [1984, 4782] },
    { id: 'suwon-414', button: /414 스카이존|414/, detail: '414 스카이존', point: [1835, 4765] },
    { id: 'suwon-415', button: /415 스카이존|415/, detail: '415 스카이존', point: [1692, 4725] },
    { id: 'suwon-416', button: /416 스카이존|416/, detail: '416 스카이존', point: [1554, 4666] },
    { id: 'suwon-417', button: /417 스카이존|417/, detail: '417 스카이존', point: [1424, 4588] },
    { id: 'suwon-418', button: /418 스카이존|418/, detail: '418 스카이존', point: [1324, 4490] },
    { id: 'suwon-419', button: /419 스카이존|419/, detail: '419 스카이존', point: [1232, 4351] },
    { id: 'suwon-420', button: /420 스카이존|420/, detail: '420 스카이존', point: [1148, 4264] },
    { id: 'suwon-421', button: /421 스카이존|421/, detail: '421 스카이존', point: [1104, 4175] },
    { id: 'suwon-422', button: /422 스카이존|422/, detail: '422 스카이존', point: [1055, 4085] },
    { id: 'suwon-423', button: /423 스카이존|423/, detail: '423 스카이존', point: [1003, 3994] },
    { id: 'suwon-424', button: /424 스카이존|424/, detail: '424 스카이존', point: [956, 3902] },
    { id: 'suwon-425', button: /425 스카이존|425/, detail: '425 스카이존', point: [905, 3811] },
    { id: 'suwon-426', button: /426 스카이존|426/, detail: '426 스카이존', point: [856, 3715] },
    { id: 'suwon-427', button: /427 스카이존|427/, detail: '427 스카이존', point: [805, 3620] },
    { id: 'suwon-428', button: /428 스카이존|428/, detail: '428 스카이존', point: [752, 3526] },
    { id: 'suwon-429', button: /429 스카이존|429/, detail: '429 스카이존', point: [701, 3426] },
    { id: 'suwon-430', button: /430 스카이존|430/, detail: '430 스카이존', point: [648, 3328] },
    { id: 'suwon-431', button: /431 스카이존|431/, detail: '431 스카이존', point: [595, 3229] },
    { id: 'suwon-432', button: /432 스카이존|432/, detail: '432 스카이존', point: [543, 3132] },
    { id: 'suwon-sb1', button: /01 스카이박스|SB1/, detail: '01 스카이박스', point: [3483, 2643] },
    { id: 'suwon-sb2', button: /02 스카이박스|SB2/, detail: '02 스카이박스', point: [3455, 2744] },
    { id: 'suwon-sb3', button: /03 스카이박스|SB3/, detail: '03 스카이박스', point: [3426, 2847] },
    { id: 'suwon-sb4', button: /04 스카이박스|SB4/, detail: '04 스카이박스', point: [3397, 2954] },
    { id: 'suwon-sb5', button: /05 스카이박스|SB5/, detail: '05 스카이박스', point: [3358, 3051] },
    { id: 'suwon-sb6', button: /06 스카이박스|SB6/, detail: '06 스카이박스', point: [3311, 3139] },
    { id: 'suwon-sb7', button: /07 스카이박스|SB7/, detail: '07 스카이박스', point: [3263, 3227] },
    { id: 'suwon-sb8', button: /08 스카이박스|SB8/, detail: '08 스카이박스', point: [3216, 3316] },
    { id: 'suwon-sb9', button: /09 스카이박스|SB9/, detail: '09 스카이박스', point: [3172, 3411] },
    { id: 'suwon-sb10', button: /10 스카이박스|SB10/, detail: '10 스카이박스', point: [3118, 3492] },
    { id: 'suwon-sb11', button: /11 스카이박스|SB11/, detail: '11 스카이박스', point: [3070, 3580] },
    { id: 'suwon-sb12', button: /12 스카이박스|SB12/, detail: '12 스카이박스', point: [3022, 3668] },
    { id: 'suwon-sb13', button: /13 스카이박스|SB13/, detail: '13 스카이박스', point: [2973, 3758] },
    { id: 'suwon-sb14', button: /14 스카이박스|SB14/, detail: '14 스카이박스', point: [2924, 3846] },
    { id: 'suwon-sb15', button: /15 스카이박스|SB15/, detail: '15 스카이박스', point: [2874, 3938] },
    { id: 'suwon-sb16', button: /16 스카이박스|SB16/, detail: '16 스카이박스', point: [2824, 4028] },
    { id: 'suwon-sb17', button: /17 스카이박스|SB17/, detail: '17 스카이박스', point: [2748, 4111] },
    { id: 'suwon-sb18', button: /18 스카이박스|SB18/, detail: '18 스카이박스', point: [2682, 4237] },
    { id: 'suwon-sb19', button: /19 스카이박스|SB19/, detail: '19 스카이박스', point: [2619, 4322] },
    { id: 'suwon-sb20', button: /20 스카이박스|SB20/, detail: '20 스카이박스', point: [2523, 4392] },
    { id: 'suwon-sb21', button: /21 스카이박스|SB21/, detail: '21 스카이박스', point: [2417, 4443] },
    { id: 'suwon-sb22', button: /22 스카이박스|SB22/, detail: '22 스카이박스', point: [2302, 4478] },
    { id: 'suwon-sb23', button: /23 스카이박스|SB23/, detail: '23 스카이박스', point: [1780, 4464] },
    { id: 'suwon-sb24', button: /24 스카이박스|SB24/, detail: '24 스카이박스', point: [1650, 4409] },
    { id: 'suwon-sb25', button: /25 스카이박스|SB25/, detail: '25 스카이박스', point: [1531, 4334] },
    { id: 'suwon-sb26', button: /26 스카이박스|SB26/, detail: '26 스카이박스', point: [1429, 4242] },
    { id: 'suwon-sb27', button: /27 스카이박스|SB27/, detail: '27 스카이박스', point: [1349, 4134] },
    { id: 'suwon-sb28', button: /28 스카이박스|SB28/, detail: '28 스카이박스', point: [1293, 4029] },
    { id: 'suwon-sb29', button: /29 스카이박스|SB29/, detail: '29 스카이박스', point: [1243, 3938] },
    { id: 'suwon-sb30', button: /30 스카이박스|SB30/, detail: '30 스카이박스', point: [1193, 3847] },
    { id: 'suwon-sb31', button: /31 스카이박스|SB31/, detail: '31 스카이박스', point: [1144, 3755] },
    { id: 'suwon-sb32', button: /32 스카이박스|SB32/, detail: '32 스카이박스', point: [1094, 3664] },
    { id: 'suwon-sb33', button: /33 스카이박스|SB33/, detail: '33 스카이박스', point: [1044, 3572] },
    { id: 'suwon-sb34', button: /34 스카이박스|SB34/, detail: '34 스카이박스', point: [994, 3481] },
    { id: 'suwon-sb35', button: /35 스카이박스|SB35/, detail: '35 스카이박스', point: [945, 3391] },
    { id: 'suwon-genie', button: /지니존\/BC카드존|지니존/, detail: '지니존/BC카드존', point: [2005, 3830] },
    { id: 'suwon-3b-highfive', button: /3루 하이파이브존|3B-HIGHFIVE/, detail: '3루 하이파이브존', point: [1518, 3060] },
    { id: 'suwon-1b-highfive', button: /1루 하이파이브존|1B-HIGHFIVE/, detail: '1루 하이파이브존', point: [2600, 3060] },
    { id: 'suwon-lf-grass', button: /3루 외야 잔디 자유석|LF-GRASS/, detail: '3루 외야 잔디 자유석', point: [1458, 2083] },
    { id: 'suwon-rf-grass', button: /1루 외야 잔디 자유석|RF-GRASS/, detail: '1루 외야 잔디 자유석', point: [2644, 2083] },
    { id: 'suwon-501-508', button: /외야테이블석|501-508/, detail: '외야테이블석', point: [3091, 1770] },
    { id: 'suwon-7pub', button: /7 PUB/, detail: '7 PUB', point: [2030, 1930] },
    { id: 'suwon-green', button: /그린존/, detail: '그린존', point: [2940, 2228] },
    { id: 'suwon-k-live', button: /K-라이브존|K-LIVE/, detail: 'K-라이브존', point: [2827, 1871] },
    { id: 'suwon-hite-pub', button: /하이트펍존/, detail: '하이트펍존', point: [3323, 2290] },
    { id: 'suwon-wheel-center', button: /중앙 휠체어석/, detail: '중앙 휠체어석', point: [2340, 4215] },
    { id: 'suwon-wheel-1b', button: /1루 휠체어석/, detail: '1루 휠체어석', point: [2828, 4124] },
    { id: 'suwon-wheel-3b', button: /3루 휠체어석/, detail: '3루 휠체어석', point: [1804, 4215] },
    { id: 'suwon-kids-camp', button: /키즈랜드 캠핑존/, detail: '키즈랜드 캠핑존', point: [3476, 2280] },
    { id: 'suwon-wiz-garden', button: /위즈가든/, detail: '위즈가든', point: [3629, 2852] },
  ];

  for (const sectionName of representativeSections) {
    await closeDetailPanel();
    await scrollVisibleSeatMapIntoView(page);
    const section = page.getByRole('button', { name: sectionName.button }).first();
    await section.waitFor({ state: 'attached', timeout: 10000 });
    await hoverImageCoordinate(sectionName.point[0], sectionName.point[1], sectionName.id);
    await clickImageCoordinate(sectionName.point[0], sectionName.point[1]);
    await page.waitForFunction((testId) => Array.from(document.querySelectorAll(`[data-testid="${testId}"]`))
      .some((candidate) => candidate.getAttribute('aria-pressed') === 'true'), `suwon-seat-hit-${sectionName.id}`, { timeout: 5000 });
  }

  const viewport = page.viewportSize();
  await page.screenshot({
    path: path.join(outputRoot, `suwon-debug-overlay-${viewport?.width ?? 'unknown'}x${viewport?.height ?? 'unknown'}.png`),
    fullPage: true,
  }).catch(() => undefined);
  await closeDetailPanel();
  await page.addStyleTag({
    content: [
      'body[data-stadium-seatmap-screenshot="suwon"] header',
      'body[data-stadium-seatmap-screenshot="suwon"] nav',
      'body[data-stadium-seatmap-screenshot="suwon"] .fixed',
      'body[data-stadium-seatmap-screenshot="suwon"] .sticky',
      '{ visibility: hidden !important; }',
    ].join(', ').replace(', {', ' {'),
  }).catch(() => undefined);
  await scrollVisibleSeatMapIntoView(page);
  await page.evaluate(() => {
    document.body.setAttribute('data-stadium-seatmap-screenshot', 'suwon');
  }).catch(() => undefined);
  try {
    await visibleSeatMapLocator(page).first().screenshot({
      path: path.join(outputRoot, `suwon-debug-overlay-seatmap-${viewport?.width ?? 'unknown'}x${viewport?.height ?? 'unknown'}.png`),
      animations: 'disabled',
    }).catch(() => undefined);
  } finally {
    await page.evaluate(() => {
      document.body.removeAttribute('data-stadium-seatmap-screenshot');
    }).catch(() => undefined);
  }
};

const SUWON_FULL_CLICK_TARGETS = [
  { id: 'suwon-117', detail: '117 중앙지정석' },
  { id: 'suwon-312', detail: '312 내야일반석' },
  { id: 'suwon-genie', detail: '지니존/BC카드존' },
  { id: 'suwon-wheel-1b', detail: '1루 휠체어석' },
  { id: 'suwon-wheel-3b', detail: '3루 휠체어석' },
  { id: 'suwon-109', detail: '109 1루 응원지정석' },
  { id: 'suwon-432', detail: '432 스카이존' },
];

const verifySuwonFullOverlayClicks = async (page) => {
  const cleanUrl = new URL(page.url());
  cleanUrl.searchParams.delete('suwonDebug');
  await page.goto(cleanUrl.toString(), { waitUntil: 'domcontentloaded' });
  await selectStadiumGuideOption(page, 'SUWON');
  await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  await visibleTextLocator(page, '수원 kt 위즈 파크 공식 좌석도').waitFor({ state: 'visible', timeout: 5000 });

  if (await page.getByTestId('suwon-official-seatmap-required').count()) {
    await visibleTextLocator(page, 'MANUAL_BASEBALL_DATA_REQUIRED').waitFor({ state: 'visible', timeout: 5000 });
    return;
  }

  const waitForSeatViewGalleryState = async (targetId) => {
    const hasEmptyState = await page.getByText('아직 등록된 시야가 없어요').first()
      .waitFor({ state: 'visible', timeout: 7000 })
      .then(() => true)
      .catch(() => false);
    if (hasEmptyState) {
      return;
    }

    const hasPhoto = await visibleSeatMapLocator(page).locator('img[alt*="시야"]:visible').first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (!hasPhoto) {
      throw new Error(`Suwon seat-view gallery did not show empty state or photos for ${targetId}.`);
    }
  };

  const clickSuwonFilter = async (label) => {
    const filterButton = page.getByRole('button', { name: label, exact: true }).first();
    await filterButton.click({ timeout: 5000 });
    await page.waitForFunction((filterLabel) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some((element) => (
        element.textContent?.trim() === filterLabel
        && element.getAttribute('aria-pressed') === 'true'
      ));
    }, label, { timeout: 5000 });
  };

  const verifySuwonFilteredClick = async ({ filterLabel, targetId, detail }) => {
    await clickSuwonFilter(filterLabel);
    await scrollVisibleSeatMapIntoView(page);
    const section = visibleSuwonSeatMapTestId(page, `suwon-seat-hit-${targetId}`);
    await section.waitFor({ state: 'attached', timeout: 10000 });
    const hitState = await section.evaluate((node) => ({
      ariaPressed: node.getAttribute('aria-pressed'),
      pointerEvents: window.getComputedStyle(node).pointerEvents,
      tabIndex: node.getAttribute('tabindex'),
    }));

    if (hitState.pointerEvents === 'none' || hitState.tabIndex === '-1') {
      throw new Error(`Suwon ${filterLabel} filter should keep ${targetId} interactive.`);
    }

    if (hitState.ariaPressed !== 'true') {
      await dispatchSeatMapSectionClick(section);
    }
    await visibleTextLocator(page, detail).waitFor({ state: 'visible', timeout: 5000 });
    await waitForSeatViewGalleryState(targetId);
  };

  const verifySuwonFilterInteractions = async () => {
    await verifySuwonFilteredClick({ filterLabel: '전체', targetId: 'suwon-117', detail: '117 중앙지정석' });
    await verifySuwonFilteredClick({ filterLabel: '내야석', targetId: 'suwon-genie', detail: '지니존/BC카드존' });
    await verifySuwonFilteredClick({ filterLabel: '내야석', targetId: 'suwon-312', detail: '312 내야일반석' });
    await verifySuwonFilteredClick({ filterLabel: '휠체어석', targetId: 'suwon-wheel-1b', detail: '1루 휠체어석' });
    await verifySuwonFilteredClick({ filterLabel: '휠체어석', targetId: 'suwon-wheel-3b', detail: '3루 휠체어석' });
    await verifySuwonFilteredClick({ filterLabel: '전체', targetId: 'suwon-312', detail: '312 내야일반석' });
  };

  const verifyZoomInteraction = async () => {
    const seatMapRoot = page.locator('[data-testid="stadium-seat-map"]:visible')
      .filter({ has: page.locator('[data-testid="suwon-seatmap-transform-layer"]') })
      .first();
    const zoomIn = seatMapRoot.getByTestId('suwon-seatmap-zoom-in').first();
    const zoomReset = seatMapRoot.getByTestId('suwon-seatmap-zoom-reset').first();
    const viewport = seatMapRoot.getByTestId('suwon-seatmap-viewport').first();
    const transformLayer = seatMapRoot.getByTestId('suwon-seatmap-transform-layer').first();
    const readZoomState = async () => transformLayer.evaluate((node) => ({
      zoom: Number(node.getAttribute('data-zoom') ?? '1'),
      panX: Number(node.getAttribute('data-pan-x') ?? '0'),
      panY: Number(node.getAttribute('data-pan-y') ?? '0'),
      transform: window.getComputedStyle(node).transform,
    }));
    const clickZoomIn = async () => zoomIn.evaluate((node) => {
      node.click();
    });
    const waitForZoomAtLeast = async (minimumZoom) => {
      const passed = await transformLayer.evaluate((node, minimum) => {
        const startedAt = Date.now();
        return new Promise((resolve) => {
          const check = () => {
            if (Number(node.getAttribute('data-zoom') ?? '1') >= minimum) {
              resolve(true);
              return;
            }
            if (Date.now() - startedAt > 5000) {
              resolve(false);
              return;
            }
            window.setTimeout(check, 50);
          };
          check();
        });
      }, minimumZoom);
      if (!passed) {
        throw new Error(`Suwon zoom did not reach ${minimumZoom}: ${JSON.stringify(await readZoomState())}`);
      }
    };

    const waitForReset = async () => {
      const passed = await transformLayer.evaluate((node) => {
        const startedAt = Date.now();
        return new Promise((resolve) => {
          const check = () => {
            const zoom = Number(node.getAttribute('data-zoom') ?? '1');
            const panX = Number(node.getAttribute('data-pan-x') ?? '0');
            const panY = Number(node.getAttribute('data-pan-y') ?? '0');
            if (zoom === 1 && panX === 0 && panY === 0) {
              resolve(true);
              return;
            }
            if (Date.now() - startedAt > 5000) {
              resolve(false);
              return;
            }
            window.setTimeout(check, 50);
          };
          check();
        });
      });
      if (!passed) {
        throw new Error(`Suwon zoom reset did not return to 1.0x: ${JSON.stringify(await readZoomState())}`);
      }
    };

    await transformLayer.waitFor({ state: 'visible', timeout: 5000 });
    await scrollVisibleSeatMapIntoView(page);
    await clickZoomIn();
    await waitForZoomAtLeast(1.25);
    await clickZoomIn();
    await waitForZoomAtLeast(1.5);

    const beforeDrag = await readZoomState();
    await viewport.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const focusY = rect.top + Math.min(rect.height * 0.35, window.innerHeight * 0.45);
      window.scrollBy(0, focusY - window.innerHeight * 0.48);
    });
    await sleep(150);
    const box = await viewport.boundingBox();
    if (!box) {
      throw new Error('Suwon zoom viewport bounding box was not available.');
    }
    const pageViewport = page.viewportSize() ?? { width: 390, height: 844 };
    const visibleLeft = Math.max(box.x, 24);
    const visibleRight = Math.min(box.x + box.width, pageViewport.width - 24);
    const visibleTop = Math.max(box.y, 96);
    const visibleBottom = Math.min(box.y + box.height, pageViewport.height - 96);
    if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
      throw new Error(`Suwon zoom viewport was not sufficiently visible for drag: ${JSON.stringify({ box, pageViewport })}`);
    }

    const startX = (visibleLeft + visibleRight) / 2;
    const startY = (visibleTop + visibleBottom) / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 72, startY + 42, { steps: 6 });
    await page.mouse.up();
    const didPanMove = await transformLayer.evaluate((node) => {
      const startedAt = Date.now();
      return new Promise((resolve) => {
        const check = () => {
          const panX = Number(node.getAttribute('data-pan-x') ?? '0');
          const panY = Number(node.getAttribute('data-pan-y') ?? '0');
          if (Math.abs(panX) > 1 || Math.abs(panY) > 1) {
            resolve(true);
            return;
          }
          if (Date.now() - startedAt > 5000) {
            resolve(false);
            return;
          }
          window.setTimeout(check, 50);
        };
        check();
      });
    });
    if (!didPanMove) {
      throw new Error(`Suwon zoom drag did not move pan: ${JSON.stringify({ beforeDrag, afterDrag: await readZoomState() })}`);
    }

    const afterDrag = await readZoomState();
    if (afterDrag.zoom < 1.5 || (afterDrag.panX === beforeDrag.panX && afterDrag.panY === beforeDrag.panY)) {
      throw new Error(`Suwon zoom drag did not update transform state: ${JSON.stringify({ beforeDrag, afterDrag })}`);
    }

    const zoomedSection = visibleSuwonSeatMapTestId(page, 'suwon-seat-hit-suwon-117');
    await sleep(260);
    await dispatchSeatMapSectionClick(zoomedSection);
    await visibleTextLocator(page, '117 중앙지정석').waitFor({ state: 'visible', timeout: 5000 });
    await waitForSeatViewGalleryState('suwon-117');

    await zoomReset.evaluate((node) => {
      node.click();
    });
    await waitForReset();

    await visibleSuwonSeatMapTestId(page, 'suwon-seatmap-fullscreen-open').evaluate((node) => {
      node.click();
    });
    const fullscreen = page.getByTestId('suwon-seatmap-fullscreen');
    await fullscreen.waitFor({ state: 'visible', timeout: 5000 });
    await fullscreen.getByTestId('suwon-seatmap-zoom-in').first().evaluate((node) => {
      node.click();
    });
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[data-testid="suwon-seatmap-fullscreen"]');
      const layer = dialog?.querySelector('[data-testid="suwon-seatmap-transform-layer"]');
      return Number(layer?.getAttribute('data-zoom') ?? '1') > 1;
    }, null, { timeout: 5000 });
    await fullscreen.getByTestId('suwon-seatmap-fullscreen-close').click({ timeout: 5000 });
    await fullscreen.waitFor({ state: 'hidden', timeout: 5000 });
    await zoomReset.click({ timeout: 5000 }).catch(() => undefined);
  };

  await verifyZoomInteraction();
  await verifySuwonFilterInteractions();

  for (const target of SUWON_FULL_CLICK_TARGETS) {
    try {
      await scrollVisibleSeatMapIntoView(page);
      const section = visibleSuwonSeatMapTestId(page, `suwon-seat-hit-${target.id}`);
      await section.waitFor({ state: 'attached', timeout: 10000 });
      const isAlreadySelected = await section.getAttribute('aria-pressed') === 'true';
      if (!isAlreadySelected) {
        await dispatchSeatMapSectionClick(section);
      }
      await visibleTextLocator(page, target.detail).waitFor({ state: 'visible', timeout: 5000 });
      await waitForSeatViewGalleryState(target.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Suwon official seatmap full click failed for ${target.id}: ${message}`);
    }
  }
};

const verifySajikOverlayClicks = async (page) => {
  await selectStadiumGuideOption(page, 'SAJIK');
  await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  await visibleTextLocator(page, '사직 롯데 공식 좌석도').waitFor({ state: 'visible', timeout: 5000 });

  const manualStateVisible = await page.locator('[data-testid="sajik-official-seatmap-required"]:visible').first()
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  if (manualStateVisible) {
    throw new Error('Sajik seat map rendered MANUAL_BASEBALL_DATA_REQUIRED instead of official overlay.');
  }

  const closeDetailPanel = async () => {
    const closeButton = page.locator('button[aria-label="닫기"]:visible').first();
    if (await closeButton.count()) {
      await closeButton.click({ timeout: 3000 }).catch(() => undefined);
      await sleep(150);
    }
  };

  const sajikSeatMapSvg = page.locator('svg[aria-label="부산 사직야구장 좌석도 구역 선택"]').first();
  const scrollSajikSeatMapIntoView = async () => {
    await sajikSeatMapSvg.waitFor({ state: 'attached', timeout: 10000 });
    await visibleSeatMapLocator(page).scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
    await page.waitForFunction(() => {
      const svg = Array.from(document.querySelectorAll('svg[aria-label="부산 사직야구장 좌석도 구역 선택"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      return Boolean(svg);
    }, { timeout: 10000 });
    await sleep(120);
  };

  const clickAllSajikLabelCoordinates = async () => {
    await closeDetailPanel();
    await scrollSajikSeatMapIntoView();

    const labelClickTargetReport = await page.evaluate(() => {
      const svg = Array.from(document.querySelectorAll('svg[aria-label="부산 사직야구장 좌석도 구역 선택"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });

      if (!(svg instanceof SVGSVGElement)) {
        return { allTargets: [], clickableTargets: [] };
      }

      const allTargets = Array.from(svg.querySelectorAll('[data-testid^="sajik-seat-block-"]'))
        .map((element) => {
          const testId = element.getAttribute('data-testid') ?? '';
          const id = testId.replace('sajik-seat-block-', '');
          const labelX = Number(element.getAttribute('data-label-x'));
          const labelY = Number(element.getAttribute('data-label-y'));
          const ariaLabel = element.getAttribute('aria-label') ?? '';
          const traceStatus = element.getAttribute('data-trace-status') ?? '';
          const pixelAlignmentStatus = element.getAttribute('data-pixel-alignment-status') ?? '';
          const rect = element.getBoundingClientRect();
          return {
            testId,
            id,
            labelX,
            labelY,
            ariaLabel,
            traceStatus,
            pixelAlignmentStatus,
            visible: rect.width > 0 && rect.height > 0,
          };
        })
        .filter((target) => target.testId && target.visible && Number.isFinite(target.labelX) && Number.isFinite(target.labelY));

      return {
        allTargets,
        clickableTargets: allTargets.filter((target) => (
          target.pixelAlignmentStatus === 'PIXEL_ALIGNED'
          && target.mapInteractionStatus === 'MAP_SELECTABLE'
        )),
      };
    });

    const { allTargets, clickableTargets: labelClickTargets } = labelClickTargetReport;
    if (allTargets.length !== 87) {
      throw new Error(`Sajik rendered map-selectable label coordinate target count should be 87. Actual: ${allTargets.length}`);
    }
    if (labelClickTargets.length !== 87) {
      const skippedTargets = allTargets
        .filter((target) => target.pixelAlignmentStatus !== 'PIXEL_ALIGNED' || target.mapInteractionStatus !== 'MAP_SELECTABLE')
        .map((target) => `${target.id}:${target.pixelAlignmentStatus || 'UNKNOWN'}:${target.mapInteractionStatus || 'UNKNOWN'}`)
        .join(', ');
      throw new Error(`Sajik map-selectable label coordinate click target count should be 87. Actual: ${labelClickTargets.length}. Skipped: ${skippedTargets}`);
    }

    for (const target of labelClickTargets) {
      await scrollSajikSeatMapIntoView();
      const box = await page.evaluate(() => {
        const svg = Array.from(document.querySelectorAll('svg[aria-label="부산 사직야구장 좌석도 구역 선택"]'))
          .find((candidate) => {
            const rect = candidate.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
      });
      if (!box) {
        throw new Error('Sajik seatmap SVG box is missing before label coordinate click.');
      }

      const point = {
        x: box.x + ((target.labelX / 960) * box.width),
        y: box.y + ((target.labelY / 640) * box.height),
      };
      await page.mouse.click(point.x, point.y);

      let isPressed = false;
      for (let attempt = 0; attempt < 15; attempt += 1) {
        const pressedIds = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^="sajik-seat-block-"]'))
          .filter((candidate) => candidate.getAttribute('aria-pressed') === 'true')
          .map((candidate) => candidate.getAttribute('data-testid')));
        isPressed = pressedIds.includes(target.testId);
        if (isPressed) break;
        await sleep(100);
      }
      if (!isPressed) {
        const hitDebug = await page.evaluate((point) => {
          const element = document.elementFromPoint(point.x, point.y);
          const pressed = Array.from(document.querySelectorAll('[data-testid^="sajik-seat-block-"]'))
            .filter((candidate) => candidate.getAttribute('aria-pressed') === 'true')
            .map((candidate) => ({
              testId: candidate.getAttribute('data-testid'),
              ariaLabel: candidate.getAttribute('aria-label'),
            }));
          return {
            hitTag: element?.tagName ?? null,
            hitTestId: element?.getAttribute('data-testid') ?? null,
            hitAriaLabel: element?.getAttribute('aria-label') ?? null,
            pressed,
          };
        }, point);
        throw new Error(`Sajik label coordinate click did not select ${target.id} (${target.ariaLabel}) at ${target.labelX},${target.labelY}. Hit debug: ${JSON.stringify(hitDebug)}`);
      }
    }

    const viewport = page.viewportSize();
    await page.screenshot({
      path: path.join(outputRoot, `sajik-debug-overlay-${viewport?.width ?? 'unknown'}x${viewport?.height ?? 'unknown'}.png`),
      fullPage: true,
    }).catch(() => undefined);

    await closeDetailPanel();
  };

  const verifyAliasOnlyCoordinatesDoNotSelect = async () => {
    await closeDetailPanel();
    await scrollSajikSeatMapIntoView();

    const aliasOnlyRendered = await page.locator('[data-testid="sajik-seat-block-sajik-avenuel-011"]').count();
    if (aliasOnlyRendered > 0) {
      throw new Error('Sajik alias-only 011 block should not render as a map hit-area.');
    }

    const box = await page.evaluate(() => {
      const svg = Array.from(document.querySelectorAll('svg[aria-label="부산 사직야구장 좌석도 구역 선택"]'))
        .find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    });
    if (!box) {
      throw new Error('Sajik seatmap SVG box is missing before alias-only coordinate click.');
    }

    await page.mouse.click(box.x + ((653 / 960) * box.width), box.y + ((420 / 640) * box.height));
    await sleep(150);
    const selected011 = await visibleTextLocator(page, '에비뉴엘석 011블록').count();
    if (selected011 > 0) {
      throw new Error('Sajik alias-only 011 coordinate should not open the 011 detail panel.');
    }
  };

  const representativeSections = [
    { button: /3루 내야필드석A 313블록/, detail: /3루 내야필드석A/ },
    { button: /1루 내야필드석 111블록/, detail: /1루 내야필드석/ },
    { button: /3루 외야석 723블록/, detail: /3루 외야석/ },
    { button: /휠체어석 1루/, detail: /휠체어석/ },
    { button: /중앙탁자석 021블록/, detail: /중앙탁자석/ },
  ];

  const viewport = page.viewportSize();
  if ((viewport?.width ?? 0) >= 1000) {
    await clickAllSajikLabelCoordinates();
    await verifyAliasOnlyCoordinatesDoNotSelect();
    return;
  }

  await verifyAliasOnlyCoordinatesDoNotSelect();

  for (const sectionName of representativeSections) {
    await closeDetailPanel();
    await scrollSajikSeatMapIntoView();
    const section = page.getByRole('button', { name: sectionName.button }).first();
    await section.click({ timeout: 5000, force: true });
    await visibleTextLocator(page, sectionName.detail).waitFor({ state: 'visible', timeout: 5000 });
    const seatViewTitle = visibleTextLocator(page, '실제 시야 사진');
    await seatViewTitle.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => undefined);
    await seatViewTitle.waitFor({ state: 'visible', timeout: 5000 });
  }

  await closeDetailPanel();
};

const addIssue = (issues, condition, message, details = {}) => {
  if (condition) {
    issues.push({ message, details });
  }
};

const evaluateMetrics = (scenario, metrics, consoleErrors, failedRequests) => {
  const issues = [];
  const isMobile = scenario.isMobile;
  const minTouchSize = 44;

  addIssue(issues, metrics.overflowX, 'Page has horizontal overflow.', {
    scrollWidth: metrics.scrollWidth,
    clientWidth: metrics.clientWidth,
  });
  addIssue(issues, !metrics.hero, 'Hero container was not found.');
  addIssue(issues, metrics.hero && isMobile && metrics.hero.height > 330, 'Mobile hero is too tall for the first viewport.', {
    height: metrics.hero?.height,
  });
  addIssue(issues, !metrics.fallbackCard, 'Map fallback card was not found while Kakao map script is blocked.');
  addIssue(issues, !metrics.openKakaoButton, 'Map fallback does not expose the external Kakao map escape action.');
  addIssue(issues, !metrics.retryButton, 'Map fallback does not expose retry action.');
  addIssue(issues, isMobile && metrics.stadiumSelect && metrics.locationHeading && metrics.locationHeading.top <= metrics.stadiumSelect.bottom, 'Mobile stadium location block should appear directly after stadium selection.', {
    stadiumSelect: metrics.stadiumSelect,
    locationHeading: metrics.locationHeading,
  });
  addIssue(issues, isMobile && metrics.locationHeading && metrics.categoryHeading && metrics.categoryHeading.top <= metrics.locationHeading.bottom, 'Mobile category block should appear after the stadium location block.', {
    locationHeading: metrics.locationHeading,
    categoryHeading: metrics.categoryHeading,
  });
  addIssue(issues, isMobile && metrics.categoryButton && metrics.firstFoodTitle && metrics.firstFoodTitle.top <= metrics.categoryButton.bottom, 'Mobile food list should appear after the category selector.', {
    categoryButton: metrics.categoryButton,
    firstFoodTitle: metrics.firstFoodTitle,
  });
  addIssue(issues, isMobile && metrics.firstFoodTitle && metrics.seatMap && metrics.seatMap.top <= metrics.firstFoodTitle.bottom, 'Mobile seat map should appear after the food list.', {
    firstFoodTitle: metrics.firstFoodTitle,
    seatMap: metrics.seatMap,
  });
  addIssue(issues, !metrics.seatMap, 'Stadium seat map was not found.');
  addIssue(issues, metrics.seatMap && metrics.seatMap.width > metrics.clientWidth, 'Seat map is wider than the viewport.', {
    seatMapWidth: metrics.seatMap?.width,
    clientWidth: metrics.clientWidth,
  });
  addIssue(issues, metrics.seatMap && isMobile && metrics.seatMap.height < 300, 'Mobile seat map is too short to preserve the stadium shape.', {
    seatMapHeight: metrics.seatMap?.height,
  });
  addIssue(issues, metrics.routeButton && isMobile && metrics.routeButton.height < minTouchSize, 'Route CTA touch target is too short.', {
    height: metrics.routeButton?.height,
  });
  addIssue(issues, metrics.categoryButton && isMobile && metrics.categoryButton.height < minTouchSize, 'Category button touch target is too short.', {
    height: metrics.categoryButton?.height,
  });
  addIssue(issues, metrics.tooltip && metrics.tooltip.left < 0, 'Seat tooltip overflows the left viewport edge.', {
    left: metrics.tooltip?.left,
  });
  addIssue(issues, metrics.tooltip && metrics.tooltip.right > metrics.clientWidth, 'Seat tooltip overflows the right viewport edge.', {
    right: metrics.tooltip?.right,
    clientWidth: metrics.clientWidth,
  });

  const actionableConsoleErrors = consoleErrors.filter((entry) => !isIgnoredConsoleText(entry.text));
  const actionableFailedRequests = failedRequests.filter((request) => !isIgnoredFailedRequest(request));

  addIssue(issues, actionableConsoleErrors.length > 0, 'Unexpected console errors were emitted.', {
    consoleErrors: actionableConsoleErrors,
  });
  addIssue(issues, actionableFailedRequests.length > 0, 'Unexpected network request failures were observed.', {
    failedRequests: actionableFailedRequests,
  });

  return {
    issues,
    actionableConsoleErrors,
    actionableFailedRequests,
  };
};

const evaluateSeatMapReviews = (reviews) => {
  const issues = [];

  reviews.forEach((review) => {
    addIssue(issues, !review.seatMapRect, 'Seat map was not rendered for selected stadium.', {
      stadiumId: review.stadiumId,
      stadiumName: review.stadiumName,
    });
    addIssue(issues, !review.seatMapText.includes(review.expectedSeatMapLabel), 'Seat map preset label did not match the selected stadium.', {
      stadiumId: review.stadiumId,
      stadiumName: review.stadiumName,
      expectedSeatMapLabel: review.expectedSeatMapLabel,
      seatMapText: review.seatMapText,
    });
    if (review.expectedHomeSide) {
      addIssue(issues, review.homeSide !== review.expectedHomeSide, 'Home cheering section is on the wrong side for the selected stadium.', {
        stadiumId: review.stadiumId,
        stadiumName: review.stadiumName,
        expectedHomeSide: review.expectedHomeSide,
        actualHomeSide: review.homeSide,
        homeRect: review.homeRect,
      });
      addIssue(issues, review.awaySide === review.homeSide, 'Away cheering section should be opposite the home cheering section.', {
        stadiumId: review.stadiumId,
        stadiumName: review.stadiumName,
        homeSide: review.homeSide,
        awaySide: review.awaySide,
        homeRect: review.homeRect,
        awayRect: review.awayRect,
      });
    }
  });

  return issues;
};

const buildMarkdown = (report) => {
  const lines = [
    '# Stadium UX Mobile Smoke Summary',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Base URL: ${report.baseUrl}`,
    `- Server mode: ${report.serverMode}`,
    `- Scenarios: ${report.entryCount}`,
    `- Overflow failures: ${report.overflowFailureCount}`,
    `- Actionable failed requests: ${report.actionableFailedRequestCount}`,
    `- Actionable console errors: ${report.actionableConsoleErrorCount}`,
    '',
    '| Scenario | Status | Overflow | Issues | Screenshot |',
    '| --- | --- | --- | ---: | --- |',
  ];

  report.scenarios.forEach((scenario) => {
    lines.push(
      `| ${scenario.label} | ${scenario.status} | ${scenario.metrics.overflowX ? 'yes' : 'no'} | ${scenario.issues.length} | ${scenario.screenshotPath} |`
    );
  });

  const qaChecks = report.scenarios.flatMap((scenario) => (
    (scenario.qaChecks ?? []).map((check) => ({
      scenario: scenario.label,
      ...check,
    }))
  ));

  if (qaChecks.length > 0) {
    lines.push(
      '',
      '## QA Checks',
      '',
      '| Scenario | Check | Status | Hit areas | Clicked | Artifact |',
      '| --- | --- | --- | ---: | ---: | --- |'
    );
    qaChecks.forEach((check) => {
      lines.push(
        `| ${check.scenario} | ${check.type} | ${check.status} | ${check.hitAreaCount ?? 0} | ${check.clickedCount ?? 0} | ${check.debugScreenshotPath ?? ''} |`
      );
    });
  }

  return `${lines.join('\n')}\n`;
};

const runScenario = async ({ browser, scenario, baseUrl }) => {
  const context = await browser.newContext({
    viewport: scenario.viewport,
    deviceScaleFactor: scenario.deviceScaleFactor,
    isMobile: scenario.isMobile,
    hasTouch: scenario.hasTouch,
    colorScheme: 'light',
    locale: 'ko-KR',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const pageLifecycleEvents = [];

  page.on('close', () => {
    pageLifecycleEvents.push('page.close');
  });

  page.on('crash', () => {
    pageLifecycleEvents.push('page.crash');
  });

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleErrors.push({
        type: message.type(),
        text: message.text(),
      });
    }
  });

  page.on('requestfailed', (request) => {
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || 'unknown',
    });
  });

  try {
    await addInitState(page);
    await installRoutes(page);

    const stadiumUrl = new URL('/stadium', baseUrl);
    if (shouldCaptureGwangjuDebugOverlay) {
      stadiumUrl.searchParams.set('gwangjuDebug', 'hit');
    }
    if (shouldCaptureGocheokDebugOverlay) {
      stadiumUrl.searchParams.set('gocheokDebug', '1');
    }
    if (shouldRunChangwonDeepCheck) {
      stadiumUrl.searchParams.set('changwonDebug', '1');
    }
    await page.goto(stadiumUrl.toString(), { waitUntil: 'domcontentloaded' });
    await page.getByText('구장 가이드').waitFor({ state: 'visible', timeout: 15000 }).catch((error) => {
      throw new Error(`Initial stadium page heading did not become visible. lifecycle=${pageLifecycleEvents.join(',') || 'none'}. ${error instanceof Error ? error.message : String(error)}`);
    });
    await page.locator('h4:visible', { hasText: '통밥' }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('지도 표시 불가').waitFor({ state: 'visible', timeout: 15000 });

    if (shouldRunInitialJamsilProbe) {
      await visibleSeatMapLocator(page).waitFor({ state: 'visible', timeout: 15000 });
      await scrollVisibleSeatMapIntoView(page);
      await sleep(150);

      if (await page.getByTestId('jamsil-official-seatmap-required').count()) {
        await page.getByText('MANUAL_BASEBALL_DATA_REQUIRED').first().waitFor({ state: 'visible', timeout: 5000 });
      } else {
        const jamsilTableSeat = visibleSeatMapHitAreaByLabel(page, '110 블록 1루 테이블석 110');
        await dispatchSeatMapSectionClick(jamsilTableSeat);
        await seatViewTitleLocator(page).waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
          await jamsilTableSeat.click({ timeout: 5000, force: true });
          await seatViewTitleLocator(page).waitFor({ state: 'visible', timeout: 5000 });
        });
        await page.getByText('아직 등록된 시야가 없어요').waitFor({ state: 'visible', timeout: 5000 });
      }
    }

    if (shouldRunJamsilDeepCheck) {
      await verifyJamsilOverlayClicks(page);
    }

    if (shouldRunJamsilFullClickCheck) {
      await verifyJamsilFullOverlayClicks(page);
    }

    if (shouldRunIncheonDeepCheck) {
      await verifyIncheonOverlayClicks(page);
    }

    if (shouldRunIncheonFullClickCheck) {
      await verifyIncheonFullOverlayClicks(page);
    }

    if (shouldRunGocheokDeepCheck) {
      await verifyGocheokOverlayClicks(page);
    }

    if (shouldRunGwangjuDeepCheck) {
      await verifyGwangjuOverlayClicks(page);
    }

    if (shouldRunChangwonDeepCheck) {
      await verifyChangwonOverlayClicks(page);
    }

    if (shouldRunDaejeonDeepCheck) {
      await verifyDaejeonOverlayClicks(page);
    }

    if (shouldRunDaeguDeepCheck) {
      await verifyDaeguOverlayClicks(page);
    }

    const qaChecks = [];
    if (shouldRunDaeguFullClickCheck) {
      qaChecks.push(await verifyDaeguFullOverlayClicks(page));
    }

    if (shouldRunSuwonDeepCheck) {
      await verifySuwonOverlayClicks(page);
    }

    if (shouldRunSuwonFullClickCheck) {
      await verifySuwonFullOverlayClicks(page);
    }

    if (shouldRunSajikDeepCheck) {
      await verifySajikOverlayClicks(page);
    }

    const seatMapReviews = [];
    for (const stadium of selectedSeatMapReviewStadiums) {
      seatMapReviews.push(await collectSeatMapReview(page, stadium));
    }

    await sleep(250);

    const metrics = await collectMetrics(page);
    const screenshotPath = path.join(outputRoot, `${scenario.key}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      animations: 'disabled',
    });

    const evaluation = evaluateMetrics(scenario, metrics, consoleErrors, failedRequests);
    const seatMapReviewIssues = evaluateSeatMapReviews(seatMapReviews);
    const issues = [...evaluation.issues, ...seatMapReviewIssues];
    return {
      key: scenario.key,
      label: scenario.label,
      status: issues.length > 0 ? 'failed' : 'passed',
      screenshotPath,
      metrics,
      issues,
      seatMapReviews,
      qaChecks,
      actionableConsoleErrorCount: evaluation.actionableConsoleErrors.length,
      actionableFailedRequestCount: evaluation.actionableFailedRequests.length,
    };
  } finally {
    await closeContextQuietly(context);
  }
};

const isTransientBrowserCloseError = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  return /Target page, context or browser has been closed|Target closed|Browser has been closed/i.test(message);
};

const closeContextQuietly = async (context) => {
  await withTimeout(context.close(), 5000, 'Playwright context close timed out.').catch(() => undefined);
};

const closeBrowserQuietly = async (browser) => {
  await withTimeout(browser.close(), 5000, 'Playwright browser close timed out.').catch(() => undefined);
};

const run = async () => {
  await ensureDir(outputRoot);
  const { chromium } = await loadPlaywright();
  const {
    baseUrl,
    serverMode,
    devServerProcess,
  } = await resolveBaseUrl();
  const startedAt = Date.now();
  let browser = await launchChromium(chromium);
  const scenarioResults = [];

  try {
    for (const scenario of selectedScenarios) {
      try {
        scenarioResults.push(await runScenario({
          browser,
          scenario,
          baseUrl,
        }));
      } catch (error) {
        if (!isTransientBrowserCloseError(error)) {
          throw error;
        }

        console.warn(`[stadium-ux] ${scenario.label} closed its Playwright browser context; relaunching once and retrying.`);
        await closeBrowserQuietly(browser);
        browser = await launchChromium(chromium);
        scenarioResults.push(await runScenario({
          browser,
          scenario,
          baseUrl,
        }));
      }
    }
  } finally {
    await closeBrowserQuietly(browser);
    await stopLocalDevServer(devServerProcess);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    status: scenarioResults.every((scenario) => scenario.status === 'passed') ? 'passed' : 'failed',
    baseUrl,
    serverMode,
    entryCount: scenarioResults.length,
    overflowFailureCount: scenarioResults.filter((scenario) => scenario.metrics.overflowX).length,
    actionableFailedRequestCount: scenarioResults.reduce((sum, scenario) => sum + scenario.actionableFailedRequestCount, 0),
    actionableConsoleErrorCount: scenarioResults.reduce((sum, scenario) => sum + scenario.actionableConsoleErrorCount, 0),
    durationMs: Date.now() - startedAt,
    scenarios: scenarioResults,
  };
  const reportPath = path.join(outputRoot, 'report.json');
  const summaryJsonPath = path.join(outputRoot, 'stadium-mobile-smoke-summary.json');
  const summaryMarkdownPath = path.join(outputRoot, 'stadium-mobile-smoke-summary.md');

  await fs.writeFile(reportPath, `${JSON.stringify(scenarioResults, null, 2)}\n`, 'utf8');
  await fs.writeFile(summaryJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(summaryMarkdownPath, buildMarkdown(report), 'utf8');

  console.log(`summary:${summaryJsonPath}`);
  console.log(`summary_markdown:${summaryMarkdownPath}`);
  console.log(`status:${report.status}`);

  if (report.status !== 'passed') {
    return 1;
  }

  return 0;
};

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : true;

if (isMainModule) {
  run().then((exitCode) => {
    process.exit(exitCode);
  }).catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
