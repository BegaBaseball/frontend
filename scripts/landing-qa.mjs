#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { getPhoneWidthFailure } from './lib/landing-audit-contracts.mjs';

const projectRoot = process.cwd();
const viewportCases = [
  { label: 'mobile', width: 375, height: 812 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'desktop', width: 1280, height: 900 },
];
const landingSelectors = [
  '[data-testid="landing-page"]',
  '[data-testid="landing-score-ticker"]',
  '[data-testid="landing-hero"]',
  '[data-testid="landing-app-preview"]',
  '[data-testid="landing-feature-01"]',
  '[data-testid="landing-feature-06"]',
  '[data-testid="landing-offseason"]',
  '[data-testid="landing-start-guide"]',
  '[data-testid="landing-closing"]',
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
  feature: join(directory, 'landing-feature.png'),
  closing: join(directory, 'landing-closing.png'),
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

const captureFullPageScreenshot = async (client, filepath) => {
  const layout = await client.send('Page.getLayoutMetrics');
  const contentSize = layout.cssContentSize || layout.contentSize;
  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
    clip: {
      x: 0,
      y: 0,
      width: Math.ceil(contentSize.width),
      height: Math.ceil(contentSize.height),
      scale: 1,
    },
  });
  writeFileSync(filepath, Buffer.from(screenshot.data, 'base64'));
};

const captureElementScreenshot = async (client, selector, filepath) => {
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: 'center', behavior: 'auto' }); 'ok';`,
    returnByValue: true,
  });
  await delay(800);

  const clip = await evaluateJson(client, `
    (() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) {
        return JSON.stringify({ found: false });
      }
      const rect = element.getBoundingClientRect();
      return JSON.stringify({
        found: true,
        x: Math.max(0, rect.left + window.scrollX),
        y: Math.max(0, rect.top + window.scrollY),
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
      });
    })()
  `);

  if (!clip.found) {
    throw new Error(`Screenshot selector not found: ${selector}`);
  }

  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
    clip: {
      x: clip.x,
      y: clip.y,
      width: clip.width,
      height: clip.height,
      scale: 1,
    },
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

    if (value.scrollWidth > value.viewport.width + 1) {
      failures.push(`${testCase.label}: scrollWidth ${value.scrollWidth}px exceeds viewport ${value.viewport.width}px.`);
    }

    if (value.featureCount !== 6) {
      failures.push(`${testCase.label}: expected 6 numbered features, received ${value.featureCount}.`);
    }

    if (value.ctaCount !== 0) {
      failures.push(`${testCase.label}: expected 0 CTA/link elements, received ${value.ctaCount}.`);
    }

    const phoneWidthFailure = getPhoneWidthFailure({
      label: testCase.label,
      phoneWidth: value.phoneWidth,
      viewportWidth: value.viewport.width,
    });
    if (phoneWidthFailure) {
      failures.push(phoneWidthFailure);
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
      '| Viewport | Width | Scroll width | Hero | Phone | Features | CTA/links |',
      '| --- | ---: | ---: | --- | ---: | ---: | ---: |',
    );

    for (const [label, metric] of metricEntries) {
      lines.push(`| ${label} | ${metric.viewport.width}px | ${metric.scrollWidth}px | ${metric.heroFontSize} | ${metric.phoneWidth}px | ${metric.featureCount} | ${metric.ctaCount} |`);
    }
  } else {
    lines.push('', '- No metric snapshots were captured.');
  }

  if (report.structure) {
    lines.push(
      '',
      '**Structure**',
      `- Required sections present: ${report.structure.allSelectorsPresent}`,
      `- Required section order: ${report.structure.inOrder}`,
      `- Numbered features: ${report.structure.featureCount}`,
      `- Stadium chips: ${report.structure.stadiumChipCount}`,
      `- Diary results: ${report.structure.diaryResultCount}`,
      `- CTA/links: ${report.structure.ctaCount}`,
      `- Footers: ${report.structure.footerCount}`,
    );
  }

  if (report.theme) {
    lines.push(
      '',
      '**Theme**',
      `- Dark class: ${report.theme.darkClass}`,
      `- Offseason surface: ${report.theme.offseasonBackground}`,
      `- App preview surface: ${report.theme.appPreviewBackground}`,
      `- Phone surface: ${report.theme.phoneBackground}`,
      `- Retro surface: ${report.theme.retroBackground}`,
    );
  }

  if (report.reducedMotion) {
    lines.push(
      '',
      '**Reduced Motion**',
      `- Ticker: ${report.reducedMotion.ticker}`,
      `- Live dot: ${report.reducedMotion.liveDot}`,
      `- Rolling score: ${report.reducedMotion.rollingScore}`,
      `- Like heart: ${report.reducedMotion.likeHeart}`,
      `- Mascot: ${report.reducedMotion.mascot}`,
      `- Reveal nodes visible: ${report.reducedMotion.revealsVisible}`,
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
    await ensureReady(landingSelectors, 'redesigned landing page', 10000);
    await client.send('Runtime.evaluate', {
      expression: `localStorage.setItem('kbo-theme', 'light'); 'ok';`,
      returnByValue: true,
    });
    await client.send('Page.reload');
    await delay(4000);
    await ensureReady(landingSelectors, 'redesigned landing light baseline', 10000);

    const revealLanding = async () => {
      const result = await evaluateJson(client, `
        new Promise((resolve) => {
          document.documentElement.style.scrollBehavior = 'auto';
          const nodes = Array.from(document.querySelectorAll('[data-reveal]'));
          let index = 0;
          const visitNext = () => {
            if (index >= nodes.length) {
              window.scrollTo({ top: 0, behavior: 'auto' });
              setTimeout(() => resolve(JSON.stringify({
                count: nodes.length,
                revealedCount: nodes.filter((node) => node.dataset.revealed === 'true').length,
                visibleCount: nodes.filter((node) => getComputedStyle(node).opacity === '1').length,
              })), 800);
              return;
            }
            nodes[index].scrollIntoView({ block: 'center', behavior: 'auto' });
            index += 1;
            setTimeout(visitNext, 140);
          };
          visitNext();
        })
      `, true);

      if (result.revealedCount !== result.count || result.visibleCount !== result.count) {
        throw new Error(`Reveal sweep incomplete: ${result.revealedCount}/${result.count} revealed, ${result.visibleCount}/${result.count} visible.`);
      }
    };

    const metrics = {};

    for (const testCase of viewportCases) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: testCase.width,
        height: testCase.height,
        deviceScaleFactor: 1,
        mobile: testCase.label === 'mobile',
      });
      await delay(400);
      await ensureReady(landingSelectors, `${testCase.label} redesigned landing viewport`);
      await revealLanding();

      metrics[testCase.label] = await evaluateJson(client, `
        (() => {
          const landing = document.querySelector('[data-testid="landing-page"]');
          const phone = document.querySelector('[data-testid="landing-phone"]');
          const heroHeading = document.querySelector('[data-testid="landing-hero"] h1');
          return JSON.stringify({
            viewport: { width: window.innerWidth, height: window.innerHeight },
            scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
            heroFontSize: heroHeading ? getComputedStyle(heroHeading).fontSize : null,
            phoneWidth: phone ? Number(phone.getBoundingClientRect().width.toFixed(2)) : null,
            featureCount: document.querySelectorAll('[data-testid^="landing-feature-0"]').length,
            ctaCount: landing ? landing.querySelectorAll('[data-testid*="cta"], a').length : null,
          });
        })()
      `);

      await captureFullPageScreenshot(client, artifacts[testCase.label]);
    }

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await delay(400);
    await ensureReady(landingSelectors, 'landing desktop detail captures');
    await revealLanding();

    const structure = await evaluateJson(client, `
      (() => {
        const selectors = ${JSON.stringify(landingSelectors)};
        const elements = selectors.map((selector) => document.querySelector(selector));
        const positions = elements.map((element) => (
          element ? element.getBoundingClientRect().top + window.scrollY : null
        ));
        const landing = document.querySelector('[data-testid="landing-page"]');
        return JSON.stringify({
          selectors,
          positions,
          allSelectorsPresent: positions.every((position) => position !== null),
          inOrder: elements.every((element, index) => (
            index === 0
            || !!(elements[index - 1]?.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)
          )),
          featureCount: document.querySelectorAll('[data-testid^="landing-feature-0"]').length,
          featureIds: Array.from(document.querySelectorAll('[data-testid^="landing-feature-0"]'))
            .map((element) => element.getAttribute('data-testid')),
          stadiumChipCount: document.querySelectorAll('[data-testid="landing-stadium-chip"]').length,
          diaryResultCount: document.querySelectorAll('[data-testid="landing-diary-result"]').length,
          ctaCount: landing ? landing.querySelectorAll('[data-testid*="cta"], a').length : null,
          footerCount: landing ? landing.querySelectorAll('footer').length : null,
        });
      })()
    `);

    await captureElementScreenshot(client, '[data-testid="landing-feature-01"]', artifacts.feature);
    await captureElementScreenshot(client, '[data-testid="landing-closing"]', artifacts.closing);

    await client.send('Runtime.evaluate', {
      expression: `localStorage.setItem('kbo-theme', 'dark'); 'ok';`,
      returnByValue: true,
    });
    await client.send('Page.reload');
    await delay(4000);
    await ensureReady(landingSelectors, 'landing dark theme reload');

    const theme = await evaluateJson(client, `
      (() => {
        const background = (selector) => {
          const element = document.querySelector(selector);
          return element ? getComputedStyle(element).backgroundColor : null;
        };
        return JSON.stringify({
          darkClass: document.documentElement.classList.contains('dark'),
          offseasonBackground: background('[data-testid="landing-offseason"]'),
          appPreviewBackground: background('[data-testid="landing-app-preview"]'),
          phoneBackground: background('[data-testid="landing-phone"]'),
          retroBackground: background('[data-testid="landing-retro-card"]'),
        });
      })()
    `);

    await client.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ],
    });
    await client.send('Page.reload');
    await delay(4000);
    await ensureReady(landingSelectors, 'landing reduced motion reload');

    const reducedMotion = await evaluateJson(client, `
      (() => {
        const animationName = (selector) => {
          const element = document.querySelector(selector);
          return element ? getComputedStyle(element).animationName : null;
        };
        const revealOpacities = Array.from(document.querySelectorAll('[data-reveal]'))
          .map((element) => getComputedStyle(element).opacity);

        return JSON.stringify({
          ticker: animationName('[data-testid="landing-score-ticker"] [data-motion-loop]'),
          liveDot: animationName('.landing-game-live [data-anim]'),
          rollingScore: animationName('.landing-game-score-roll'),
          likeHeart: animationName('.landing-cheer-liked [data-anim]'),
          mascot: animationName('[data-testid="landing-closing-mascot"]'),
          revealCount: revealOpacities.length,
          revealsVisible: revealOpacities.every((opacity) => opacity === '1'),
        });
      })()
    `);

    const failures = [
      ...assertLandingMetrics(metrics),
    ];

    if (!structure.allSelectorsPresent) {
      failures.push('Structure: one or more required landing sections are missing.');
    }

    if (!structure.inOrder) {
      failures.push(`Structure: required sections are out of order (${structure.positions.join(', ')}).`);
    }

    if (structure.featureCount !== 6) {
      failures.push(`Structure: expected 6 numbered features, received ${structure.featureCount}.`);
    }

    const expectedFeatureIds = Array.from({ length: 6 }, (_, index) => `landing-feature-0${index + 1}`);
    if (JSON.stringify(structure.featureIds) !== JSON.stringify(expectedFeatureIds)) {
      failures.push(`Structure: feature IDs are not the expected 01-06 sequence (${structure.featureIds.join(', ')}).`);
    }

    if (structure.stadiumChipCount !== 9) {
      failures.push(`Structure: expected 9 stadium chips, received ${structure.stadiumChipCount}.`);
    }

    if (structure.diaryResultCount !== 10) {
      failures.push(`Structure: expected 10 diary results, received ${structure.diaryResultCount}.`);
    }

    if (structure.ctaCount !== 0) {
      failures.push(`Structure: expected 0 CTA/link elements, received ${structure.ctaCount}.`);
    }

    if (structure.footerCount !== 0) {
      failures.push(`Structure: expected no footer, received ${structure.footerCount}.`);
    }

    if (!theme.darkClass) {
      failures.push('Theme: dark class was not applied.');
    }

    const expectedTheme = {
      offseasonBackground: 'rgb(16, 18, 21)',
      appPreviewBackground: 'rgb(23, 59, 52)',
      phoneBackground: 'rgb(242, 242, 247)',
      retroBackground: 'rgb(10, 10, 10)',
    };
    for (const [key, expected] of Object.entries(expectedTheme)) {
      if (theme[key] !== expected) {
        failures.push(`Theme: expected ${key}=${expected}, received ${theme[key]}.`);
      }
    }

    for (const key of ['ticker', 'liveDot', 'rollingScore', 'likeHeart', 'mascot']) {
      if (reducedMotion[key] !== 'none') {
        failures.push(`Reduced motion: expected ${key} animation name none, received ${reducedMotion[key]}.`);
      }
    }

    if (!reducedMotion.revealsVisible) {
      failures.push(`Reduced motion: not all ${reducedMotion.revealCount} reveal nodes have opacity 1.`);
    }

    report = {
      generatedAt: new Date().toISOString(),
      baseUrl: args.baseUrl,
      artifacts,
      metrics,
      structure,
      theme,
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
