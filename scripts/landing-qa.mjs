#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const projectRoot = process.cwd();
const viewportCases = [
  { label: 'mobile', width: 375, height: 812, heroFontSize: '40px', visiblePanels: 1, mockupVisible: false },
  { label: 'tablet', width: 768, height: 1024, heroFontSize: '48px', visiblePanels: 1, mockupVisible: false },
  { label: 'desktop', width: 1280, height: 900, heroFontSize: '56px', visiblePanels: 2, mockupVisible: true },
];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {
    host: '127.0.0.1',
    port: '5177',
    noServer: false,
    outDir: resolve(projectRoot, 'output/landing-qa'),
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

const log = (message) => console.log(`[landing-qa] ${message}`);

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
  mobile: join(directory, 'landing-mobile.png'),
  tablet: join(directory, 'landing-tablet.png'),
  desktop: join(directory, 'landing-desktop.png'),
  capabilities: join(directory, 'landing-capabilities.png'),
  features: join(directory, 'landing-features.png'),
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
  const useProcessGroup = process.platform !== 'win32';
  const child = spawn('npm', ['run', 'dev', '--', '--host', host, '--port', String(port)], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    detached: useProcessGroup,
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

  const signalChild = (signal) => {
    if (process.platform !== 'win32' && typeof child.pid === 'number') {
      try {
        process.kill(-child.pid, signal);
        return;
      } catch {
        // Fall back to signaling the direct child when it is not a process-group leader.
      }
    }

    try {
      child.kill(signal);
    } catch {
      // Ignore cleanup failures after the main QA result has been determined.
    }
  };

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

  signalChild('SIGINT');
  await waitForExit(2500);

  if (child.exitCode === null) {
    signalChild('SIGKILL');
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

const assertLandingMetrics = (metrics) => {
  const failures = [];

  for (const testCase of viewportCases) {
    const value = metrics[testCase.label];
    if (!value) {
      failures.push(`Missing metrics for ${testCase.label}.`);
      continue;
    }

    if (value.scrollWidth !== testCase.width) {
      failures.push(`${testCase.label}: expected scrollWidth ${testCase.width}, received ${value.scrollWidth}.`);
    }

    if (value.heroFontSize !== testCase.heroFontSize) {
      failures.push(`${testCase.label}: expected hero font ${testCase.heroFontSize}, received ${value.heroFontSize}.`);
    }

    if (value.visibleFeaturePanels !== testCase.visiblePanels) {
      failures.push(`${testCase.label}: expected ${testCase.visiblePanels} visible feature panels, received ${value.visibleFeaturePanels}.`);
    }

    if (value.mockupVisible !== testCase.mockupVisible) {
      failures.push(`${testCase.label}: expected mockupVisible=${testCase.mockupVisible}, received ${value.mockupVisible}.`);
    }

    for (const [key, metric] of Object.entries(value.buttonHeights)) {
      const height = typeof metric === 'number' ? metric : metric?.height ?? 0;
      const visible = typeof metric === 'number' ? height > 0 : metric?.visible !== false;
      if (visible && height < 44) {
        failures.push(`${testCase.label}: button ${key} height ${height}px is below 44px.`);
      }
    }
  }

  return failures;
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
    '### Landing QA',
    `- Result: ${report.pass ? 'PASS' : 'FAIL'}`,
    `- Base URL: ${report.baseUrl}`,
  ];

  const metricEntries = Object.entries(report.metrics || {});
  if (metricEntries.length > 0) {
    lines.push(
      '',
      '| Viewport | Width | Hero | Panels | Mockup |',
      '| --- | ---: | --- | ---: | --- |',
    );

    for (const [label, metric] of metricEntries) {
      lines.push(`| ${label} | ${metric.viewport.width}px | ${metric.heroFontSize} | ${metric.visibleFeaturePanels} | ${metric.mockupVisible ? 'shown' : 'hidden'} |`);
    }
  } else {
    lines.push('', '- No metric snapshots were captured.');
  }

  if (report.navigation) {
    lines.push(
      '',
      '**Navigation**',
      `- Header login: ${report.navigation.loginPath}`,
      `- Header start: ${report.navigation.headerCtaPath}`,
      `- Hero start: ${report.navigation.heroPrimaryPath}`,
      `- Secondary CTA scrollY: ${report.navigation.secondaryScroll.scrollY}, featuresTop: ${report.navigation.secondaryScroll.featuresTop}`,
    );
  }

  if (report.interaction) {
    lines.push(
      '',
      '**Interaction**',
      `- First feature after click: ${report.interaction.firstAfterClick}`,
      `- Fourth feature after click: ${report.interaction.fourthAfterClick}`,
      `- First feature after fourth click: ${report.interaction.firstAfterFourth}`,
      `- Mockup image: ${report.interaction.mockupImageBefore} -> ${report.interaction.mockupImageAfter}`,
    );
  }

  if (report.reducedMotion) {
    lines.push(
      '',
      '**Reduced Motion**',
      `- Mockup transition: ${report.reducedMotion.mockupTransition}`,
      `- Feature card transition: ${report.reducedMotion.featureCardTransition}`,
      `- Hero button transition: ${report.reducedMotion.heroButtonTransition}`,
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
  writeFileSync(join(args.outDir, 'landing-report.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(args.outDir, 'landing-summary.md'), buildSummaryMarkdown(report));
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
  const userDataDir = mkdtempSync(join(tmpdir(), 'bega-landing-qa-'));
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
    args.baseUrl,
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

    await client.send('Page.navigate', { url: args.baseUrl });
    await delay(4000);
    const landingInitialSelectors = [
      '[data-testid="landing-page"]',
      '.ds-hero-title',
      '[data-testid="landing-header-login"]',
      '[data-testid="landing-header-cta"]',
      '[data-testid="landing-hero-cta-primary"]',
      '[data-testid="landing-hero-cta-secondary"]',
      '[data-testid="landing-capability-showcase"]',
      '[data-testid="landing-capability-grid"]',
      '[data-testid="landing-cta-button"]',
    ];
    const landingFeatureSelectors = [
      ...landingInitialSelectors,
      '[data-testid="landing-feature-layout"]',
    ];
    const landingCapabilitySelectors = [
      ...landingInitialSelectors,
      '[data-testid="landing-capability-grid"] img',
    ];
    const loadDeferredFeatures = async (description) => {
      await client.send('Runtime.evaluate', {
        expression: `document.getElementById('features')?.scrollIntoView({ block: 'start' }); 'ok';`,
        returnByValue: true,
      });
      await delay(700);
      await ensureReady(landingFeatureSelectors, description, 10000);
    };

    await ensureReady(landingInitialSelectors, 'landing initial page');
    await loadDeferredFeatures('landing deferred features bootstrap');
    await client.send('Runtime.evaluate', {
      expression: `window.scrollTo({ top: 0, behavior: 'auto' }); 'ok';`,
      returnByValue: true,
    });
    await delay(200);

    const metrics = {};

    for (const testCase of viewportCases) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: testCase.width,
        height: testCase.height,
        deviceScaleFactor: 1,
        mobile: testCase.label === 'mobile',
      });
      await delay(400);
      await ensureReady(landingFeatureSelectors, `${testCase.label} landing viewport`);

      metrics[testCase.label] = await evaluateJson(client, `
        JSON.stringify({
          viewport: { width: window.innerWidth, height: window.innerHeight },
          scrollWidth: document.documentElement.scrollWidth,
          heroFontSize: getComputedStyle(document.querySelector('.ds-hero-title')).fontSize,
          visibleFeaturePanels: Array.from(document.querySelector('[data-testid="landing-feature-layout"]').children)
            .filter((element) => getComputedStyle(element).display !== 'none').length,
          mockupVisible: (() => {
            const mockup = document.querySelector('[data-testid="landing-laptop-mockup"]');
            return mockup ? getComputedStyle(mockup.parentElement).display !== 'none' : false;
          })(),
          buttonHeights: (() => {
            const buttonMetric = (selector) => {
              const element = document.querySelector(selector);
              if (!element) {
                return { height: 0, visible: false };
              }

              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return {
                height: rect.height,
                visible: style.display !== 'none'
                  && style.visibility !== 'hidden'
                  && rect.width > 0
                  && rect.height > 0,
              };
            };

            return {
              headerLogin: buttonMetric('[data-testid="landing-header-login"]'),
              headerCta: buttonMetric('[data-testid="landing-header-cta"]'),
              heroPrimary: buttonMetric('[data-testid="landing-hero-cta-primary"]'),
              heroSecondary: buttonMetric('[data-testid="landing-hero-cta-secondary"]'),
              cta: buttonMetric('[data-testid="landing-cta-button"]'),
            };
          })(),
        })
      `);

      await captureScreenshot(client, artifacts[testCase.label]);
    }

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await delay(400);
    await ensureReady(landingFeatureSelectors, 'landing desktop interaction');

    await client.send('Runtime.evaluate', {
      expression: `document.querySelector('[data-testid="landing-capability-showcase"]')?.scrollIntoView({ block: 'start' }); 'ok';`,
      returnByValue: true,
    });
    await delay(700);
    await ensureReady(landingCapabilitySelectors, 'landing capability capture');
    await captureScreenshot(client, artifacts.capabilities);

    const interaction = await evaluateJson(client, `
      new Promise((resolve) => {
        const first = document.querySelector('[data-testid="landing-feature-card-0"]');
        const fourth = document.querySelector('[data-testid="landing-feature-card-3"]');
        const mockup = document.querySelector('[data-testid="landing-laptop-mockup"]');
        const before = mockup?.querySelector('img')?.getAttribute('alt') || '';

        first?.click();
        setTimeout(() => {
          const firstAfterClick = first?.getAttribute('aria-expanded') || null;
          fourth?.click();
          setTimeout(() => {
            const fourthAfterClick = fourth?.getAttribute('aria-expanded') || null;
            const firstAfterFourth = first?.getAttribute('aria-expanded') || null;
            setTimeout(() => {
              resolve(JSON.stringify({
                firstAfterClick,
                fourthAfterClick,
                firstAfterFourth,
                mockupImageBefore: before,
                mockupImageAfter: mockup?.querySelector('img')?.getAttribute('alt') || '',
                scrollY: window.scrollY,
                guideVisible: !!Array.from(document.querySelectorAll('h4')).find((node) => node.textContent?.includes('사용 가이드')),
              }));
            }, 500);
          }, 250);
        }, 250);
      })
    `, true);

    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('features')?.scrollIntoView({ block: 'start' }); 'ok';`,
      returnByValue: true,
    });
    await delay(400);
    await ensureReady(landingFeatureSelectors, 'landing features capture');
    await captureScreenshot(client, join(args.outDir, 'landing-features.png'));

    await client.send('Page.navigate', { url: args.baseUrl });
    await delay(4000);
    await ensureReady(landingInitialSelectors, 'landing secondary navigation');
    const secondaryScroll = await evaluateJson(client, `
      new Promise((resolve) => {
        const features = document.getElementById('features');
        window.scrollTo({ top: 0, behavior: 'auto' });
        document.querySelector('[data-testid="landing-hero-cta-secondary"]')?.click();
        setTimeout(() => {
          resolve(JSON.stringify({
            path: location.pathname,
            scrollY: window.scrollY,
            featuresTop: features?.getBoundingClientRect().top ?? null,
          }));
        }, 1000);
      })
    `, true);

    await client.send('Page.navigate', { url: args.baseUrl });
    await delay(4000);
    await ensureReady(landingInitialSelectors, 'landing login navigation');
    const loginNavigation = await evaluateJson(client, `
      new Promise((resolve) => {
        document.querySelector('[data-testid="landing-header-login"]')?.click();
        setTimeout(() => {
          resolve(JSON.stringify({
            path: location.pathname,
          }));
        }, 300);
      })
    `, true);

    await client.send('Page.navigate', { url: args.baseUrl });
    await delay(4000);
    await ensureReady(landingInitialSelectors, 'landing header CTA navigation');
    const headerCtaNavigation = await evaluateJson(client, `
      new Promise((resolve) => {
        document.querySelector('[data-testid="landing-header-cta"]')?.click();
        setTimeout(() => {
          resolve(JSON.stringify({
            path: location.pathname,
          }));
        }, 300);
      })
    `, true);

    await client.send('Page.navigate', { url: args.baseUrl });
    await delay(4000);
    await ensureReady(landingInitialSelectors, 'landing hero CTA navigation');
    const heroPrimaryNavigation = await evaluateJson(client, `
      new Promise((resolve) => {
        document.querySelector('[data-testid="landing-hero-cta-primary"]')?.click();
        setTimeout(() => {
          resolve(JSON.stringify({
            path: location.pathname,
          }));
        }, 300);
      })
    `, true);

    await client.send('Page.navigate', { url: args.baseUrl });
    await delay(4000);
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await delay(400);

    await client.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ],
    });
    await client.send('Page.reload');
    await delay(4000);
    await ensureReady(landingInitialSelectors, 'landing reduced motion reload');
    await loadDeferredFeatures('landing reduced motion deferred features');

    const reducedMotion = await evaluateJson(client, `
      (() => {
        const mockup = document.querySelector('[data-testid="landing-laptop-mockup"]');
        const featureCard = document.querySelector('[data-testid="landing-feature-card-0"]');
        const heroButton = document.querySelector('[data-testid="landing-hero-cta-primary"]');

        return JSON.stringify({
          mockupTransition: mockup ? getComputedStyle(mockup).transitionDuration : null,
          featureCardTransition: featureCard ? getComputedStyle(featureCard).transitionDuration : null,
          heroButtonTransition: heroButton ? getComputedStyle(heroButton).transitionDuration : null,
        });
      })()
    `);

    const failures = [
      ...assertLandingMetrics(metrics),
    ];

    if (interaction.firstAfterClick !== 'true') {
      failures.push(`Interaction: first feature should expand, received ${interaction.firstAfterClick}.`);
    }

    if (interaction.fourthAfterClick !== 'true') {
      failures.push(`Interaction: fourth feature should expand, received ${interaction.fourthAfterClick}.`);
    }

    if (interaction.firstAfterFourth !== 'false') {
      failures.push(`Interaction: first feature should collapse after fourth expands, received ${interaction.firstAfterFourth}.`);
    }

    if (!interaction.guideVisible) {
      failures.push('Interaction: feature guide did not render after expansion.');
    }

    if (interaction.mockupImageBefore === interaction.mockupImageAfter || interaction.mockupImageAfter !== '전력분석실') {
      failures.push(`Interaction: laptop mockup image did not change. before=${interaction.mockupImageBefore} after=${interaction.mockupImageAfter}`);
    }

    if (secondaryScroll.path !== '/') {
      failures.push(`Navigation: secondary CTA should stay on landing, received ${secondaryScroll.path}.`);
    }

    if ((secondaryScroll.scrollY ?? 0) <= 0) {
      failures.push(`Navigation: secondary CTA should scroll the page, received scrollY=${secondaryScroll.scrollY}.`);
    }

    if (secondaryScroll.featuresTop === null || Math.abs(secondaryScroll.featuresTop) > 120) {
      failures.push(`Navigation: secondary CTA should align the features section near the viewport top, received featuresTop=${secondaryScroll.featuresTop}.`);
    }

    if (loginNavigation.path !== '/login') {
      failures.push(`Navigation: header login should navigate to /login, received ${loginNavigation.path}.`);
    }

    if (headerCtaNavigation.path !== '/home') {
      failures.push(`Navigation: header start should navigate to /home, received ${headerCtaNavigation.path}.`);
    }

    if (heroPrimaryNavigation.path !== '/home') {
      failures.push(`Navigation: hero start should navigate to /home, received ${heroPrimaryNavigation.path}.`);
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
      metrics,
      navigation: {
        secondaryScroll,
        loginPath: loginNavigation.path,
        headerCtaPath: headerCtaNavigation.path,
        heroPrimaryPath: heroPrimaryNavigation.path,
      },
      interaction,
      reducedMotion,
      pass: failures.length === 0,
      failures,
      ...(failures.length > 0 ? { errorMessage: failures.join('\n') } : {}),
    };

    writeCurrentReport();

    if (failures.length > 0) {
      throw new Error(failures.join('\n'));
    }

    log(`QA passed. Report: ${join(args.outDir, 'landing-report.json')}`);
  } catch (error) {
    mainError = error;
    const errorMessage = getErrorMessage(error);

    if (!report) {
      report = {
        generatedAt: new Date().toISOString(),
        baseUrl: args.baseUrl,
        artifacts: getArtifactPaths(args.outDir),
        metrics: {},
        pass: false,
        failures: [errorMessage],
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
      await runCleanupStep('chrome log write', () => writeFileSync(join(args.outDir, 'landing-chrome.log'), chromeLogs.join('')), cleanupWarnings);
    }

    if (cleanupWarnings.length > 0) {
      console.warn(`[landing-qa] cleanup warnings:\n${cleanupWarnings.join('\n')}`);
    }

    writeCurrentReport();
  }

  if (mainError) {
    console.error(`[landing-qa] ${getErrorMessage(mainError)}`);
    throw mainError;
  }
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    const reportPath = join(args.outDir, 'landing-report.json');
    if (!existsSync(reportPath)) {
      const errorMessage = getErrorMessage(error);
      writeReportArtifacts({
        generatedAt: new Date().toISOString(),
        baseUrl: args.baseUrl,
        artifacts: getArtifactPaths(args.outDir),
        metrics: {},
        pass: false,
        failures: [errorMessage],
        errorMessage,
      });
    }

    process.exit(1);
  });
