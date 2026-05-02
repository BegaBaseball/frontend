#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const projectRoot = process.cwd();
const viewportCases = [
  { label: 'mobile', width: 375, height: 812, stageColumns: 1 },
  { label: 'tablet', width: 768, height: 1024, stageColumns: 1 },
  { label: 'desktop', width: 1280, height: 900, stageColumns: 2 },
];

const routeCases = [
  { label: 'login', path: '/login', submitSelector: '[data-testid="login-submit"]' },
  { label: 'signup', path: '/signup', submitSelector: '[data-testid="signup-submit"]' },
  { label: 'password-reset', path: '/password/reset', submitSelector: '[data-testid="password-reset-submit"]' },
  { label: 'password-reset-confirm', path: '/password/reset/confirm', submitSelector: '[data-testid="password-reset-confirm-submit"]' },
  { label: 'account-recovery', path: '/account/deletion/recovery', submitSelector: '[data-testid="account-recovery-submit"]' },
];

const routeArtifactKeyMap = {
  login: 'loginDesktop',
  signup: 'signup',
  'password-reset': 'passwordReset',
  'password-reset-confirm': 'passwordResetConfirm',
  'account-recovery': 'accountRecovery',
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {
    host: '127.0.0.1',
    port: '5177',
    noServer: false,
    outDir: resolve(projectRoot, 'output/auth-qa'),
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--no-server') {
      result.noServer = true;
      continue;
    }

    if (arg === '--host' && args[i + 1]) {
      result.host = args[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--port' && args[i + 1]) {
      result.port = args[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--out-dir' && args[i + 1]) {
      result.outDir = resolve(projectRoot, args[i + 1]);
      i += 1;
      continue;
    }

    if (arg.startsWith('--host=')) {
      result.host = arg.slice('--host='.length);
      continue;
    }

    if (arg.startsWith('--port=')) {
      result.port = arg.slice('--port='.length);
      continue;
    }

    if (arg.startsWith('--out-dir=')) {
      result.outDir = resolve(projectRoot, arg.slice('--out-dir='.length));
    }
  }

  result.baseUrl = `http://${result.host}:${result.port}`;
  return result;
};

const args = parseArgs();

const log = (message) => console.log(`[auth-qa] ${message}`);

const summarizeText = (text) => String(text ?? '')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .slice(-12)
  .join('\n');

const ensureDir = (directory) => {
  mkdirSync(directory, { recursive: true });
};

const clearDirectory = (directory) => {
  ensureDir(directory);
  for (const entry of readdirSync(directory)) {
    rmSync(join(directory, entry), { recursive: true, force: true });
  }
};

const getArtifactPaths = (directory) => ({
  loginMobile: join(directory, 'auth-login-mobile.png'),
  loginTablet: join(directory, 'auth-login-tablet.png'),
  loginDesktop: join(directory, 'auth-login-desktop.png'),
  signup: join(directory, 'auth-signup-desktop.png'),
  passwordReset: join(directory, 'auth-password-reset-desktop.png'),
  passwordResetConfirm: join(directory, 'auth-password-reset-confirm-desktop.png'),
  accountRecovery: join(directory, 'auth-account-recovery-desktop.png'),
});

const isServerReady = async (url) => {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(1500),
    });
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
};

const waitForServer = async (url, timeoutMs = 30000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady(url)) {
      return true;
    }
    await delay(500);
  }
  return false;
};

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (!address || typeof address === 'string') {
      server.close(() => reject(new Error('Failed to resolve a free port.')));
      return;
    }

    const { port } = address;
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(port);
    });
  });
  server.on('error', reject);
});

const resolveChromeBinary = () => {
  const candidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const check = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if ((check.status ?? 1) === 0) {
      return candidate;
    }
  }

  for (const command of ['google-chrome', 'chromium', 'chromium-browser', 'chrome']) {
    const check = spawnSync('which', [command], { encoding: 'utf8' });
    if ((check.status ?? 1) === 0) {
      return check.stdout.trim();
    }
  }

  return null;
};

const startDevServer = (host, port) => {
  const stdout = [];
  const stderr = [];
  const child = spawn('npm', ['run', 'dev', '--', '--host', host, '--port', String(port)], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  child.stdout.on('data', (chunk) => {
    stdout.push(chunk.toString());
  });
  child.stderr.on('data', (chunk) => {
    stderr.push(chunk.toString());
  });

  return {
    child,
    getLogs: () => `${summarizeText(stdout.join(''))}\n${summarizeText(stderr.join(''))}`.trim(),
  };
};

const stopChild = async (child) => {
  if (!child || child.killed || child.exitCode !== null) {
    return;
  }

  const waitForExit = async (timeoutMs) => {
    if (child.exitCode !== null) {
      return;
    }

    try {
      await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        delay(timeoutMs),
      ]);
    } catch {
      // Ignore shutdown wait failures.
    }
  };

  try {
    child.kill('SIGINT');
  } catch {
    return;
  }

  await waitForExit(2500);

  if (child.exitCode === null) {
    try {
      child.kill('SIGKILL');
    } catch {
      // Ignore cleanup failures after the main QA result has been determined.
    }
    await waitForExit(1000);
  }
};

const runCleanupStep = async (label, action, warnings) => {
  try {
    await action();
  } catch (error) {
    warnings.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const getErrorMessage = (error) => (error instanceof Error ? error.message : String(error));

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.socket = null;
    this.nextId = 0;
    this.pending = new Map();
  }

  async connect() {
    if (typeof WebSocket !== 'function') {
      throw new Error('This Node runtime does not provide a WebSocket client.');
    }

    this.socket = new WebSocket(this.wsUrl);
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data.toString());
      const promise = this.pending.get(message.id);
      if (!promise) {
        return;
      }

      this.pending.delete(message.id);
      if (message.error) {
        promise.reject(new Error(message.error.message));
        return;
      }

      promise.resolve(message.result);
    });

    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
  }

  async send(method, params = {}) {
    this.nextId += 1;
    const id = this.nextId;
    const socket = this.socket;
    if (!socket) {
      throw new Error('CDP socket is not connected.');
    }

    const result = await new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

    return result;
  }

  async close() {
    if (!this.socket) {
      return;
    }

    const socket = this.socket;
    this.socket = null;

    if (socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED) {
      await Promise.race([
        new Promise((resolve) => socket.addEventListener('close', resolve, { once: true })),
        delay(1000),
      ]);
      return;
    }

    try {
      socket.close();
    } catch {
      return;
    }

    await Promise.race([
      new Promise((resolve) => {
        socket.addEventListener('close', resolve, { once: true });
        socket.addEventListener('error', resolve, { once: true });
      }),
      delay(1000),
    ]);
  }
}

const getPageWebSocketUrl = async (port, baseUrl) => {
  const startedAt = Date.now();
  let lastPageUrls = [];
  while (Date.now() - startedAt < 10000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
        signal: AbortSignal.timeout(1500),
      });
      const pages = await response.json();
      lastPageUrls = pages
        .filter((item) => item.type === 'page')
        .map((item) => item.url);

      const page = pages.find((item) => item.type === 'page' && item.url.startsWith(baseUrl));
      if (page?.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      // Retry until Chrome exposes its debugger target.
    }

    await delay(250);
  }

  const knownPages = lastPageUrls.length > 0 ? lastPageUrls.join(', ') : 'none';
  throw new Error(`Failed to resolve a Chrome DevTools target for ${baseUrl}. Visible pages: ${knownPages}`);
};

const captureScreenshot = async (client, filepath) => {
  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  writeFileSync(filepath, Buffer.from(screenshot.data, 'base64'));
};

const evaluateJson = async (client, expression, awaitPromise = false) => {
  const result = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise,
  });

  if (result?.exceptionDetails) {
    const description = result.result?.description || result.exceptionDetails.text || 'Unknown CDP evaluation error.';
    throw new Error(`CDP evaluation failed: ${description}\n${expression.slice(0, 180)}`);
  }

  const rawValue = result?.result?.value;
  if (typeof rawValue === 'string') {
    return JSON.parse(rawValue);
  }

  if (rawValue && typeof rawValue === 'object') {
    return rawValue;
  }

  throw new Error(`CDP evaluation did not return a serializable JSON value.\n${expression.slice(0, 180)}`);
};

const navigateAndWait = async (client, url, waitMs = 2500) => {
  await client.send('Page.navigate', { url });
  await delay(waitMs);
};

const waitForDocumentReady = async (client, timeoutMs = 8000) => evaluateJson(client, `
  new Promise((resolve) => {
    const deadline = Date.now() + ${timeoutMs};

    const check = () => {
      if (document.readyState === 'complete') {
        resolve(JSON.stringify({ ready: true }));
        return;
      }

      if (Date.now() >= deadline) {
        resolve(JSON.stringify({ ready: false, readyState: document.readyState }));
        return;
      }

      setTimeout(check, 50);
    };

    check();
  })
`, true).then((result) => result.ready === true);

const waitForSelectors = async (client, selectors, timeoutMs = 5000) => {
  const selectorList = selectors.filter(Boolean);
  if (selectorList.length === 0) {
    return true;
  }

  return evaluateJson(client, `
    new Promise((resolve) => {
      const selectors = ${JSON.stringify(selectorList)};
      const deadline = Date.now() + ${timeoutMs};

      const check = () => {
        const ready = selectors.every((selector) => !!document.querySelector(selector));
        if (ready) {
          resolve(JSON.stringify({ ready: true }));
          return;
        }

      if (Date.now() >= deadline) {
        resolve(JSON.stringify({ ready: false }));
        return;
      }

      setTimeout(check, 50);
    };

    check();
  })
  `, true).then((result) => result.ready === true);
};

const ensurePageReady = async (client, selectors, description, timeoutMs = 8000, diagnosticsCollector = null) => {
  const isReady = async () => {
    const documentReady = await waitForDocumentReady(client, timeoutMs);
    const selectorsReady = await waitForSelectors(client, selectors, timeoutMs);
    return documentReady && selectorsReady;
  };

  if (await isReady()) {
    return;
  }

  await client.send('Page.reload');
  await delay(1500);

  if (await isReady()) {
    return;
  }

  const diagnostics = await evaluateJson(client, `
    (() => {
      const selectors = ${JSON.stringify(selectors.filter(Boolean))};

      return JSON.stringify({
        description: ${JSON.stringify(description)},
        path: location.pathname + location.search,
        title: document.title,
        readyState: document.readyState,
        selectors: selectors.map((selector) => ({
          selector,
          found: !!document.querySelector(selector),
        })),
      });
    })()
  `);

  if (Array.isArray(diagnosticsCollector)) {
    diagnosticsCollector.push(diagnostics);
  }

  throw new Error(`${description}: required selectors did not become ready.`);
};

const pressTab = async (client) => {
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9,
    nativeVirtualKeyCode: 9,
  });
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9,
    nativeVirtualKeyCode: 9,
  });
};

const withOptionalReportDetails = (report, cleanupWarnings, readinessDiagnostics) => ({
  ...report,
  ...(cleanupWarnings.length > 0 ? { cleanupWarnings: [...cleanupWarnings] } : {}),
  ...(readinessDiagnostics.length > 0 ? { readinessDiagnostics: [...readinessDiagnostics] } : {}),
});

const buildReadinessDiagnosticLine = (diagnostic) => {
  const missingSelectors = (diagnostic.selectors || [])
    .filter((selector) => !selector.found)
    .map((selector) => selector.selector);
  const missingText = missingSelectors.length > 0 ? missingSelectors.join(', ') : 'none';

  return `- ${diagnostic.description}: ${diagnostic.path} (readyState=${diagnostic.readyState}, missing=${missingText})`;
};

const buildSummaryMarkdown = (report) => {
  const lines = [
    '### Auth QA',
    `- Result: ${report.pass ? 'PASS' : 'FAIL'}`,
    `- Base URL: ${report.baseUrl}`,
  ];

  const responsiveEntries = Object.entries(report.responsive || {});
  if (responsiveEntries.length > 0) {
    lines.push(
      '',
      '| Viewport | Width | Columns | Home CTA | Submit | Kakao | Google | Naver |',
      '| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: |',
    );

    for (const [label, metric] of responsiveEntries) {
      lines.push(`| ${label} | ${metric.viewport.width}px | ${metric.stageColumns} | ${metric.homeButtonVisible ? 'shown' : 'hidden'} | ${metric.loginSubmitHeight ?? '-'} | ${metric.kakaoHeight ?? '-'} | ${metric.googleHeight ?? '-'} | ${metric.naverHeight ?? '-'} |`);
    }
  } else {
    lines.push('', '- No responsive screenshots were captured.');
  }

  const routeEntries = Object.entries(report.routes || {});
  if (routeEntries.length > 0) {
    lines.push('', '| Route | Path | Header | Submit | Status |', '| --- | --- | --- | ---: | --- |');
    for (const [label, metric] of routeEntries) {
      lines.push(`| ${label} | ${metric.path} | ${metric.header ?? '-'} | ${metric.submitHeight ?? '-'} | ${metric.statusText ?? '-'} |`);
    }
  }

  if (report.navigation?.home) {
    lines.push(
      '',
      '**Navigation**',
      `- Home CTA: ${report.navigation.home.path}${report.navigation.home.search}`,
      `- Login -> Signup: ${report.navigation.signup.path}${report.navigation.signup.search}`,
      `- Login -> Reset: ${report.navigation.passwordReset.path}${report.navigation.passwordReset.search}`,
      `- Reset -> Login: ${report.navigation.resetBack.path}${report.navigation.resetBack.search}`,
      `- Recovery -> Login: ${report.navigation.recoveryBack.path}${report.navigation.recoveryBack.search}`,
    );
  }

  if (report.focus?.testId || report.reducedMotion?.submitTransition) {
    lines.push(
      '',
      '**Accessibility Smoke**',
      `- Focus target: ${report.focus?.testId ?? '-'}`,
      `- Focus style: outline ${report.focus?.outlineWidth ?? '-'} ${report.focus?.outlineStyle ?? '-'}, shadow ${report.focus?.boxShadow ?? '-'}`,
      `- Reduced motion submit: ${report.reducedMotion?.submitTransition ?? '-'}`,
      `- Reduced motion provider: ${report.reducedMotion?.providerTransition ?? '-'}`,
      `- Reduced motion back link: ${report.reducedMotion?.backLinkTransition ?? '-'}`,
    );
  }

  if (report.errorMessage) {
    lines.push('', '**Error**', `- ${report.errorMessage}`);
  }

  if (report.failures.length > 0) {
    lines.push('', '**Failures**');
    for (const failure of report.failures) {
      lines.push(`- ${failure}`);
    }
  }

  if (report.cleanupWarnings?.length > 0) {
    lines.push('', '**Cleanup Warnings**');
    for (const warning of report.cleanupWarnings) {
      lines.push(`- ${warning}`);
    }
  }

  if (report.readinessDiagnostics?.length > 0) {
    lines.push('', '**Readiness Diagnostics**');
    for (const diagnostic of report.readinessDiagnostics) {
      lines.push(buildReadinessDiagnosticLine(diagnostic));
    }
  }

  return `${lines.join('\n')}\n`;
};

const writeReportArtifacts = (report) => {
  writeFileSync(join(args.outDir, 'auth-report.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(args.outDir, 'auth-summary.md'), buildSummaryMarkdown(report));
};

const main = async () => {
  clearDirectory(args.outDir);
  const artifacts = getArtifactPaths(args.outDir);

  const chromeBinary = resolveChromeBinary();
  if (!chromeBinary) {
    throw new Error('Unable to locate Google Chrome or Chromium. Set CHROME_BIN to continue.');
  }

  let devServer = null;
  if (!args.noServer && !(await isServerReady(args.baseUrl))) {
    log(`starting Vite dev server at ${args.baseUrl}`);
    devServer = startDevServer(args.host, args.port);
    const ready = await waitForServer(args.baseUrl);
    if (!ready) {
      throw new Error(`Dev server did not become ready.\n${devServer.getLogs()}`);
    }
  } else {
    log(`using existing frontend at ${args.baseUrl}`);
  }

  const debugPort = await getFreePort();
  const userDataDir = mkdtempSync(join(tmpdir(), 'bega-auth-qa-'));
  const chromeProcess = spawn(chromeBinary, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,900',
    `${args.baseUrl}/login`,
  ], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  const chromeLogs = [];
  chromeProcess.stdout.on('data', (chunk) => {
    chromeLogs.push(chunk.toString());
  });
  chromeProcess.stderr.on('data', (chunk) => {
    chromeLogs.push(chunk.toString());
  });

  let client = null;
  const cleanupWarnings = [];
  const readinessDiagnostics = [];
  let report = null;
  let mainError = null;

  const writeCurrentReport = () => {
    if (!report) {
      return;
    }

    writeReportArtifacts(withOptionalReportDetails(report, cleanupWarnings, readinessDiagnostics));
  };

  try {
    const wsUrl = await getPageWebSocketUrl(debugPort, args.baseUrl);
    client = new CDPClient(wsUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    const ensureReady = (selectors, description, timeoutMs) => (
      ensurePageReady(client, selectors, description, timeoutMs, readinessDiagnostics)
    );

    const responsive = {};
    for (const testCase of viewportCases) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: testCase.width,
        height: testCase.height,
        deviceScaleFactor: 1,
        mobile: testCase.label === 'mobile',
      });

      await navigateAndWait(client, `${args.baseUrl}/login`);
      await ensureReady([
        '[data-testid="auth-shell"]',
        '.auth-stage-grid',
        '[data-testid="auth-hero-panel"]',
        '[data-testid="login-submit"]',
      ], `${testCase.label} login viewport`);
      responsive[testCase.label] = await evaluateJson(client, `
        (() => {
          const stageGrid = document.querySelector('.auth-stage-grid');
          const heroPanel = document.querySelector('[data-testid="auth-hero-panel"]');

          return JSON.stringify({
            viewport: { width: window.innerWidth, height: window.innerHeight },
            scrollWidth: document.documentElement.scrollWidth,
            hasStageGrid: !!stageGrid,
            hasHeroPanel: !!heroPanel,
            stageColumns: (() => {
              if (!stageGrid) {
                return 0;
              }

              const template = getComputedStyle(stageGrid).gridTemplateColumns.trim();
              return template ? template.split(' ').filter(Boolean).length : 0;
            })(),
            homeButtonVisible: !!document.querySelector('[data-testid="auth-home-button"]'),
            loginSubmitHeight: document.querySelector('[data-testid="login-submit"]')?.getBoundingClientRect().height ?? null,
            kakaoHeight: document.querySelector('[data-testid="login-social-kakao"]')?.getBoundingClientRect().height ?? null,
            googleHeight: document.querySelector('[data-testid="login-social-google"]')?.getBoundingClientRect().height ?? null,
            naverHeight: document.querySelector('[data-testid="login-social-naver"]')?.getBoundingClientRect().height ?? null,
            heroVisible: heroPanel ? getComputedStyle(heroPanel).display !== 'none' : false,
          });
        })()
      `);

      const artifactKey = `login${testCase.label[0].toUpperCase()}${testCase.label.slice(1)}`;
      await captureScreenshot(client, artifacts[artifactKey]);
    }

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const routes = {};
    for (const routeCase of routeCases) {
      await navigateAndWait(client, `${args.baseUrl}${routeCase.path}`);
      await ensureReady([
        '[data-testid="auth-shell"]',
        '[data-testid="auth-form-panel"]',
        '[data-slot="auth-header"]',
      ], `${routeCase.label} route`);
      routes[routeCase.label] = await evaluateJson(client, `
        JSON.stringify({
          path: location.pathname,
          scrollWidth: document.documentElement.scrollWidth,
          hasShell: !!document.querySelector('[data-testid="auth-shell"]'),
          hasHero: !!document.querySelector('[data-testid="auth-hero-panel"]'),
          hasForm: !!document.querySelector('[data-testid="auth-form-panel"]'),
          header: document.querySelector('[data-slot="auth-header"] h1')?.textContent ?? null,
          submitHeight: document.querySelector('${routeCase.submitSelector}')?.getBoundingClientRect().height ?? null,
          statusText: document.querySelector('[data-slot="auth-status-panel"]')?.textContent?.trim() ?? null,
        })
      `);

      await captureScreenshot(client, artifacts[routeArtifactKeyMap[routeCase.label]]);
    }

    await navigateAndWait(client, `${args.baseUrl}/login`);
    await ensureReady([
      '[data-testid="auth-shell"]',
      '[data-testid="auth-home-button"]',
    ], 'focus smoke');
    await pressTab(client);
    const focus = await evaluateJson(client, `
      (() => {
        const activeElement = document.activeElement instanceof Element ? document.activeElement : null;
        const computed = activeElement ? getComputedStyle(activeElement) : null;
        return JSON.stringify({
          testId: activeElement?.getAttribute('data-testid') ?? null,
          boxShadow: computed ? computed.boxShadow : null,
          outlineWidth: computed ? computed.outlineWidth : null,
          outlineStyle: computed ? computed.outlineStyle : null,
          outlineOffset: computed ? computed.outlineOffset : null,
          focusVisible: activeElement ? activeElement.matches(':focus-visible') : false,
        });
      })()
    `);

    await navigateAndWait(client, `${args.baseUrl}/login?redirect=%2Fprediction%3Fdate%3D2026-03-12`);
    await ensureReady(['[data-testid="auth-home-button"]'], 'home button navigation');
    const homeNavigation = await evaluateJson(client, `
      new Promise((resolve) => {
        document.querySelector('[data-testid="auth-home-button"]')?.click();
        setTimeout(() => {
          resolve(JSON.stringify({ path: location.pathname, search: location.search }));
        }, 300);
      })
    `, true);

    await navigateAndWait(client, `${args.baseUrl}/login?redirect=%2Fprediction%3Fdate%3D2026-03-12`);
    await ensureReady(['[data-testid="login-signup-link"]'], 'login to signup navigation');
    const signupNavigation = await evaluateJson(client, `
      new Promise((resolve) => {
        document.querySelector('[data-testid="login-signup-link"]')?.click();
        setTimeout(() => {
          resolve(JSON.stringify({ path: location.pathname, search: location.search }));
        }, 300);
      })
    `, true);

    await navigateAndWait(client, `${args.baseUrl}/login?redirect=%2Fprediction%3Fdate%3D2026-03-12`);
    await ensureReady(['[data-testid="login-password-reset-link"]'], 'login to password reset navigation');
    const passwordResetNavigation = await evaluateJson(client, `
      new Promise((resolve) => {
        document.querySelector('[data-testid="login-password-reset-link"]')?.click();
        setTimeout(() => {
          resolve(JSON.stringify({ path: location.pathname, search: location.search }));
        }, 300);
      })
    `, true);

    await navigateAndWait(client, `${args.baseUrl}/password/reset?redirect=%2Fmypage`);
    await ensureReady(['[data-testid="password-reset-back-link"]'], 'password reset back navigation');
    const resetBackNavigation = await evaluateJson(client, `
      new Promise((resolve) => {
        document.querySelector('[data-testid="password-reset-back-link"]')?.click();
        setTimeout(() => {
          resolve(JSON.stringify({ path: location.pathname, search: location.search }));
        }, 300);
      })
    `, true);

    await navigateAndWait(client, `${args.baseUrl}/account/deletion/recovery?redirect=%2Fmypage%3Fview%3DaccountSettings`);
    await ensureReady(['[data-testid="account-recovery-back-link"]'], 'account recovery back navigation');
    const recoveryBackNavigation = await evaluateJson(client, `
      new Promise((resolve) => {
        document.querySelector('[data-testid="account-recovery-back-link"]')?.click();
        setTimeout(() => {
          resolve(JSON.stringify({ path: location.pathname, search: location.search }));
        }, 300);
      })
    `, true);

    await navigateAndWait(client, `${args.baseUrl}/login`);
    await ensureReady([
      '[data-testid="auth-home-button"]',
      '[data-testid="login-submit"]',
      '[data-testid="login-social-google"]',
    ], 'reduced motion auth smoke');
    await client.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ],
    });
    await client.send('Page.reload');
    await delay(2500);
    await ensureReady([
      '[data-testid="auth-home-button"]',
      '[data-testid="login-submit"]',
      '[data-testid="login-social-google"]',
    ], 'reduced motion auth reload');

    const reducedMotion = await evaluateJson(client, `
      (() => {
        const submitButton = document.querySelector('[data-testid="login-submit"]');
        const providerButton = document.querySelector('[data-testid="login-social-google"]');
        const homeButton = document.querySelector('[data-testid="auth-home-button"]');

        return JSON.stringify({
          submitTransition: submitButton ? getComputedStyle(submitButton).transitionDuration : null,
          providerTransition: providerButton ? getComputedStyle(providerButton).transitionDuration : null,
          backLinkTransition: homeButton ? getComputedStyle(homeButton).transitionDuration : null,
        });
      })()
    `);

    const failures = [];
    for (const testCase of viewportCases) {
      const value = responsive[testCase.label];
      if (!value) {
        failures.push(`Missing responsive metrics for ${testCase.label}.`);
        continue;
      }

      if (value.scrollWidth !== testCase.width) {
        failures.push(`${testCase.label}: expected scrollWidth ${testCase.width}, received ${value.scrollWidth}.`);
      }

      if (value.stageColumns !== testCase.stageColumns) {
        failures.push(`${testCase.label}: expected ${testCase.stageColumns} auth columns, received ${value.stageColumns}.`);
      }

      if (!value.heroVisible) {
        failures.push(`${testCase.label}: auth hero panel is not visible.`);
      }

      for (const [key, height] of Object.entries({
        loginSubmit: value.loginSubmitHeight,
        kakao: value.kakaoHeight,
        google: value.googleHeight,
        naver: value.naverHeight,
      })) {
        if ((height ?? 0) < 44) {
          failures.push(`${testCase.label}: ${key} height ${(height ?? 0)}px is below 44px.`);
        }
      }
    }

    for (const routeCase of routeCases) {
      const value = routes[routeCase.label];
      if (!value) {
        failures.push(`Missing route smoke metrics for ${routeCase.label}.`);
        continue;
      }

      if (!value.hasShell || !value.hasHero || !value.hasForm) {
        failures.push(`${routeCase.label}: auth shell structure is incomplete.`);
      }

      if (value.scrollWidth !== 1280) {
        failures.push(`${routeCase.label}: expected desktop scrollWidth 1280, received ${value.scrollWidth}.`);
      }

      if (routeCase.label !== 'account-recovery' && (value.submitHeight ?? 0) < 44) {
        failures.push(`${routeCase.label}: submit button height ${(value.submitHeight ?? 0)}px is below 44px.`);
      }
    }

    if (routes['password-reset-confirm']?.statusText?.includes('유효하지 않은 링크') !== true) {
      failures.push('password-reset-confirm: expected missing token error state.');
    }

    if (routes['account-recovery']?.statusText?.includes('유효하지 않거나 만료된') !== true) {
      failures.push('account-recovery: expected invalid recovery link state.');
    }

    if (homeNavigation.path !== '/home') {
      failures.push(`Navigation: auth home button should navigate to /home, received ${homeNavigation.path}.`);
    }

    if (signupNavigation.path !== '/signup' || signupNavigation.search !== '?redirect=%2Fprediction%3Fdate%3D2026-03-12') {
      failures.push(`Navigation: login -> signup should preserve redirect, received ${signupNavigation.path}${signupNavigation.search}.`);
    }

    if (passwordResetNavigation.path !== '/password/reset' || passwordResetNavigation.search !== '?redirect=%2Fprediction%3Fdate%3D2026-03-12') {
      failures.push(`Navigation: login -> password reset should preserve redirect, received ${passwordResetNavigation.path}${passwordResetNavigation.search}.`);
    }

    if (resetBackNavigation.path !== '/login' || resetBackNavigation.search !== '?redirect=%2Fmypage') {
      failures.push(`Navigation: password reset -> login should preserve redirect, received ${resetBackNavigation.path}${resetBackNavigation.search}.`);
    }

    if (recoveryBackNavigation.path !== '/login' || recoveryBackNavigation.search !== '?redirect=%2Fmypage%3Fview%3DaccountSettings') {
      failures.push(`Navigation: account recovery -> login should preserve redirect, received ${recoveryBackNavigation.path}${recoveryBackNavigation.search}.`);
    }

    if (
      !focus.testId
      || focus.focusVisible !== true
      || focus.outlineStyle === 'none'
      || focus.outlineWidth === '0px'
    ) {
      failures.push(`Accessibility: expected visible keyboard focus, received ${focus.testId ?? 'none'} with outline ${focus.outlineWidth ?? 'null'} ${focus.outlineStyle ?? 'null'} and shadow ${focus.boxShadow ?? 'null'}.`);
    }

    for (const [key, value] of Object.entries(reducedMotion)) {
      if (value !== '0s') {
        failures.push(`Reduced motion: expected ${key} to be 0s, received ${value}.`);
      }
    }

    report = {
      generatedAt: new Date().toISOString(),
      baseUrl: args.baseUrl,
      artifacts,
      responsive,
      routes,
      navigation: {
        home: homeNavigation,
        signup: signupNavigation,
        passwordReset: passwordResetNavigation,
        resetBack: resetBackNavigation,
        recoveryBack: recoveryBackNavigation,
      },
      focus,
      reducedMotion,
      pass: failures.length === 0,
      failures,
      ...(failures.length > 0 ? { errorMessage: failures.join('\n') } : {}),
    };

    writeCurrentReport();

    if (failures.length > 0) {
      throw new Error(failures.join('\n'));
    }

    log(`QA passed. Report: ${join(args.outDir, 'auth-report.json')}`);
  } catch (error) {
    mainError = error;
    const errorMessage = getErrorMessage(error);

    if (!report) {
      report = {
        generatedAt: new Date().toISOString(),
        baseUrl: args.baseUrl,
        artifacts: getArtifactPaths(args.outDir),
        responsive: {},
        routes: {},
        pass: false,
        failures: [errorMessage],
        navigation: null,
        focus: null,
        reducedMotion: null,
        errorMessage,
      };
    } else if (!report.errorMessage) {
      report = {
        ...report,
        errorMessage,
      };
    }
  } finally {
    if (client) {
      await runCleanupStep('cdp close', () => client.close(), cleanupWarnings);
    }

    await runCleanupStep('chrome process shutdown', () => stopChild(chromeProcess), cleanupWarnings);
    await runCleanupStep('chrome profile cleanup', () => rmSync(userDataDir, { recursive: true, force: true }), cleanupWarnings);

    if (devServer) {
      await runCleanupStep('dev server shutdown', () => stopChild(devServer.child), cleanupWarnings);
    }

    if (chromeLogs.length > 0) {
      await runCleanupStep('chrome log write', () => writeFileSync(join(args.outDir, 'auth-chrome.log'), chromeLogs.join('')), cleanupWarnings);
    }

    if (cleanupWarnings.length > 0) {
      console.warn(`[auth-qa] cleanup warnings:\n${cleanupWarnings.join('\n')}`);
    }

    writeCurrentReport();
  }

  if (mainError) {
    console.error(`[auth-qa] ${getErrorMessage(mainError)}`);
    throw mainError;
  }
};

main()
  .catch((error) => {
    const reportPath = join(args.outDir, 'auth-report.json');
    if (!existsSync(reportPath)) {
      const errorMessage = getErrorMessage(error);
      writeReportArtifacts({
        generatedAt: new Date().toISOString(),
        baseUrl: args.baseUrl,
        artifacts: getArtifactPaths(args.outDir),
        responsive: {},
        routes: {},
        pass: false,
        failures: [errorMessage],
        navigation: null,
        focus: null,
        reducedMotion: null,
        errorMessage,
      });
    }

    process.exitCode = 1;
  });
