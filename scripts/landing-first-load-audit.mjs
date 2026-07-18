#!/usr/bin/env node
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  collectSuccessfulDeferredRequests,
  getClosingAuditFailures,
  isViewportIntersectionVisible,
  partitionSuccessfulDeferredRequestsByStart,
} from './lib/landing-audit-contracts.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const distDir = path.join(frontendRoot, 'dist');
const manifestPath = path.join(distDir, '.vite', 'client-manifest.json');

const iterationCount = parsePositiveInt(process.env.LANDING_FIRST_LOAD_ITERATIONS, 1);
const settleMs = parsePositiveInt(process.env.LANDING_FIRST_LOAD_SETTLE_MS, 3200);
const closingTimeoutMs = parsePositiveInt(process.env.LANDING_FIRST_LOAD_CLOSING_TIMEOUT_MS, 8000);
const jsonPath = path.resolve(
  frontendRoot,
  process.env.LANDING_FIRST_LOAD_JSON || 'reports/landing-first-load-audit.json',
);
const markdownPath = path.resolve(
  frontendRoot,
  process.env.LANDING_FIRST_LOAD_MARKDOWN || 'reports/landing-first-load-audit.md',
);
const criticalLandingAssetBudgetBytes = parsePositiveInt(
  process.env.LANDING_FIRST_LOAD_CRITICAL_ASSET_BUDGET_BYTES,
  512 * 1024,
);
const stylesheetBudgetBytes = parsePositiveInt(
  process.env.LANDING_FIRST_LOAD_STYLESHEET_BUDGET_BYTES,
  260 * 1024,
);
const criticalLandingAssetNames = [
  'd8ca714d95aedcc16fe63c80cbc299c6e3858c70',
  'stadium_bg',
  '202a55c2e2083b7f096b21380d22d1769e56d762',
  '560639a3d1481dca02309d52b06d0efe43f355f7',
  '5162bdc3599041e7b7b1da494d7d0dcc490e5893',
  '24a312517fb1be189f3fae2611b33f19a72d9401',
  'b414fb1229152a89657a33002953975be2a9217b',
  '9e7d58fab40f3e586f2a0aaf6ee3c59993bcf101',
  'bb63ace90c2b7b74e708cae2f562fbca654538ec',
  '51e88fde588eb7cf7d5390b0fce1bb07ff440d2e',
  'd94cd6cb1a915d591b57bbca900f8268281068e3',
  'd97539563d3c93f568cb7a4331c9e607cfafe914',
];
const deferredClosingAssetNames = [
  '27f7b8ac0aacea2470847e809062c7bbf0e4163f',
];
const stateAuthManifestReferencePatterns = [
  { label: 'authStore', pattern: /src\/store\/authStore|authStore-/i },
  { label: 'AuthBootstrap', pattern: /src\/components\/AuthBootstrap\.tsx|(^|\/)AuthBootstrap-/i },
  { label: 'RootEntryRouteAuthAware', pattern: /src\/components\/RootEntryRouteAuthAware\.tsx|RootEntryRouteAuthAware-/i },
  { label: 'vendor-zustand', pattern: /vendor-zustand/i },
];
const stateAuthScriptMarkers = [
  { label: 'authStore', marker: 'auth-storage' },
  { label: 'authStore bootstrap attempts', marker: '__begaPublicOptionalBootstrapAttemptByPath' },
  { label: 'zustand persist', marker: '[zustand persist middleware]' },
];

const viewports = [
  {
    key: 'desktop-1440',
    label: 'Desktop 1440',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  {
    key: 'mobile-390',
    label: 'Mobile 390',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
];

function parsePositiveInt(rawValue, fallback) {
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const roundMetric = (value) => (
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10) / 10 : null
);

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

const isPortAvailable = async (port) => new Promise((resolve) => {
  const server = net.createServer();
  server.once('error', () => resolve(false));
  server.once('listening', () => {
    server.close(() => resolve(true));
  });
  server.listen({ port, host: '127.0.0.1' });
});

const findOpenPort = async (startPort) => {
  for (let port = startPort; port < startPort + 40; port += 1) {
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
          return;
        }
        reject(new Error('Unable to allocate a local static server port.'));
      });
    });
    server.listen({ port: 0, host: '127.0.0.1' });
  });
};

const contentTypeFor = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
  };
  return types[ext] || 'application/octet-stream';
};

const fileExists = async (filePath) => {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
};

const distFileSize = async (filePath) => {
  const stat = await fileExists(path.join(distDir, filePath));
  return stat?.isFile() ? stat.size : null;
};

const isCriticalLandingAsset = (filePath) => (
  criticalLandingAssetNames.some((assetName) => filePath.includes(assetName))
);

const isDeferredClosingAsset = (filePath) => (
  deferredClosingAssetNames.some((assetName) => filePath.includes(assetName))
);

const collectCriticalLandingAssets = async (landingAssets = []) => {
  const criticalAssets = landingAssets.filter(isCriticalLandingAsset);
  const deferredAssets = landingAssets.filter(isDeferredClosingAsset);
  const unexpectedAssets = landingAssets.filter((asset) => (
    !isCriticalLandingAsset(asset) && !isDeferredClosingAsset(asset)
  ));
  const assets = await Promise.all(criticalAssets.map(async (file) => ({
    file,
    sizeBytes: await distFileSize(file),
  })));
  const closingAssets = await Promise.all(deferredAssets.map(async (file) => ({
    file,
    sizeBytes: await distFileSize(file),
  })));
  const missingNames = criticalLandingAssetNames.filter((assetName) => (
    !criticalAssets.some((file) => file.includes(assetName))
  ));
  const missingDeferredNames = deferredClosingAssetNames.filter((assetName) => (
    !deferredAssets.some((file) => file.includes(assetName))
  ));
  const totalBytes = assets.reduce((total, asset) => total + (asset.sizeBytes || 0), 0);

  return {
    assets,
    closingAssets,
    totalBytes,
    missingNames,
    missingDeferredNames,
    unexpectedAssets,
    budgetBytes: criticalLandingAssetBudgetBytes,
  };
};

const resolveStaticFile = async (pathname) => {
  const indexPath = path.join(distDir, 'index.html');
  const decoded = decodeURIComponent(pathname);
  const relativePath = decoded.replace(/^\/+/, '');
  const targetPath = path.resolve(distDir, relativePath);

  if (!targetPath.startsWith(distDir)) {
    return { filePath: null, status: 403 };
  }

  const stat = await fileExists(targetPath);
  if (stat?.isFile()) {
    return { filePath: targetPath, status: 200 };
  }

  if (stat?.isDirectory()) {
    const nestedIndex = path.join(targetPath, 'index.html');
    const nestedIndexStat = await fileExists(nestedIndex);
    if (nestedIndexStat?.isFile()) {
      return { filePath: nestedIndex, status: 200 };
    }
  }

  if (path.extname(targetPath)) {
    return { filePath: null, status: 404 };
  }

  return { filePath: indexPath, status: 200 };
};

const startStaticServer = async () => {
  const port = await findOpenPort(5178);
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = http.createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Method Not Allowed');
      return;
    }

    try {
      const url = new URL(request.url || '/', baseUrl);
      const { filePath, status } = await resolveStaticFile(url.pathname);
      if (!filePath) {
        response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
        response.end(status === 403 ? 'Forbidden' : 'Not Found');
        return;
      }

      const body = await fs.readFile(filePath);
      response.writeHead(200, {
        'cache-control': 'no-store',
        'content-length': body.length,
        'content-type': contentTypeFor(filePath),
      });
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      response.end(body);
    } catch (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  return {
    baseUrl,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
    },
  };
};

const readManifest = async () => {
  const raw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  const entries = Object.entries(manifest);
  const entryEntry = entries.find(([key, entry]) => key === 'index.html' || entry?.isEntry);
  const landingEntry = entries.find(([key, entry]) => (
    entry?.file?.endsWith('.js')
    && (key.includes('Landing') || entry.file.includes('Landing-'))
  ));

  const resolveImportFile = (manifestKey) => manifest[manifestKey]?.file || null;
  const landingImports = landingEntry?.[1]?.imports || [];
  const landingImportFiles = landingImports.map(resolveImportFile).filter(Boolean);
  const landingAssets = [...new Set([
    ...(landingEntry?.[1]?.assets || []),
    ...landingImports.flatMap((importKey) => manifest[importKey]?.assets || []),
  ])];
  const closingAssets = landingAssets.filter(isDeferredClosingAsset);
  const collectStaticGraph = (rootKeys) => {
    const seen = new Set();
    const queue = [...rootKeys.filter(Boolean)];
    const graph = [];

    while (queue.length > 0) {
      const key = queue.shift();
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);

      const entry = manifest[key];
      graph.push({
        key,
        file: entry?.file || null,
        imports: entry?.imports || [],
      });

      for (const importKey of entry?.imports || []) {
        if (!seen.has(importKey)) {
          queue.push(importKey);
        }
      }
    }

    return graph;
  };
  const initialGraph = collectStaticGraph([
    entryEntry?.[0],
    landingEntry?.[0],
  ]);

  return {
    entry: entryEntry
      ? {
          key: entryEntry[0],
          file: entryEntry[1].file,
          imports: entryEntry[1].imports || [],
        }
      : null,
    landing: landingEntry
      ? {
          key: landingEntry[0],
          file: landingEntry[1].file,
          imports: landingImports,
          importFiles: landingImportFiles,
          dynamicImports: landingEntry[1].dynamicImports || [],
          assets: landingAssets,
        }
      : null,
    initialGraph,
    deferredResources: {
      closingAssets,
      fragments: closingAssets,
    },
  };
};

const matchesAnyFragment = (url, fragments) => {
  const pathname = safeUrl(url)?.pathname || url;
  return fragments.some((fragment) => pathname.includes(fragment) || url.includes(fragment));
};

const safeUrl = (url) => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

const createNetworkRecorder = (page, fragments) => {
  const requestIds = new Map();
  const requests = [];
  const failedRequests = [];

  page.on('request', (request) => {
    const entry = {
      id: requests.length + 1,
      at: Date.now(),
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      status: null,
      contentLength: null,
      deferred: matchesAnyFragment(request.url(), fragments),
      completedAt: null,
      failed: false,
    };
    requestIds.set(request, entry.id);
    requests.push(entry);
  });

  page.on('response', (response) => {
    const request = response.request();
    const id = requestIds.get(request);
    const entry = requests.find((candidate) => candidate.id === id);
    if (!entry) {
      return;
    }

    const headers = response.headers();
    const contentLength = Number(headers['content-length']);
    entry.status = response.status();
    entry.contentLength = Number.isFinite(contentLength) ? contentLength : null;
    entry.fromServiceWorker = response.fromServiceWorker();
  });

  page.on('requestfailed', (request) => {
    const id = requestIds.get(request);
    const entry = requests.find((candidate) => candidate.id === id);
    if (entry) {
      entry.completedAt = Date.now();
      entry.failed = true;
    }
    failedRequests.push({
      at: Date.now(),
      url: request.url(),
      resourceType: request.resourceType(),
      errorText: request.failure()?.errorText || 'unknown',
      deferred: matchesAnyFragment(request.url(), fragments),
    });
  });

  page.on('requestfinished', (request) => {
    const id = requestIds.get(request);
    const entry = requests.find((candidate) => candidate.id === id);
    if (entry) {
      entry.completedAt = Date.now();
    }
  });

  return {
    requests,
    failedRequests,
    since: (startedAt) => requests.filter((request) => request.at >= startedAt),
    until: (endedAt) => requests.filter((request) => request.at <= endedAt),
  };
};

const createConsoleRecorder = (page) => {
  const messages = [];
  const pageErrors = [];

  page.on('console', (message) => {
    messages.push({
      type: message.type(),
      text: message.text(),
    });
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error instanceof Error ? error.message : String(error));
  });

  return {
    messages,
    pageErrors,
    errors: () => [
      ...messages.filter((message) => message.type === 'error').map((message) => message.text),
      ...pageErrors,
    ],
  };
};

const installMetricsInitScript = async (context) => {
  await context.addInitScript((visibilityPredicateSource) => {
    const visibilityPredicate = (0, eval)(`(${visibilityPredicateSource})`);
    const describeElement = (element) => {
      if (!element) {
        return null;
      }
      const tag = element.tagName ? element.tagName.toLowerCase() : 'unknown';
      const dataTestId = element.getAttribute?.('data-testid');
      const id = element.id ? `#${element.id}` : '';
      const className = typeof element.className === 'string'
        ? element.className.split(/\s+/).filter(Boolean).slice(0, 4).join('.')
        : '';
      const text = (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      return {
        tag,
        selector: `${tag}${id}${className ? `.${className}` : ''}`,
        dataTestId,
        text,
      };
    };

    window.__landingFirstLoadMetrics = {
      lcp: null,
      cls: 0,
      layoutShifts: [],
      longTasks: [],
      heroRenderedAt: null,
      closingRenderedAt: null,
    };

    try {
      window.localStorage.removeItem('auth-bootstrap-hint');
      window.localStorage.removeItem('auth-bootstrap-meta');
      window.localStorage.removeItem('auth-storage');
    } catch (_error) {
      // Storage access can fail in hardened browser contexts.
    }

    const isVisible = (selector) => {
      const node = document.querySelector(selector);
      if (!node) {
        return false;
      }
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return visibilityPredicate({
        rect,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
      });
    };

    const recordMilestones = () => {
      if (window.__landingFirstLoadMetrics.heroRenderedAt === null && isVisible('[data-testid="landing-hero"]')) {
        window.__landingFirstLoadMetrics.heroRenderedAt = performance.now();
      }
      if (window.__landingFirstLoadMetrics.closingRenderedAt === null && isVisible('[data-testid="landing-closing-mascot"]')) {
        window.__landingFirstLoadMetrics.closingRenderedAt = performance.now();
      }
    };

    const startMilestoneObserver = () => {
      recordMilestones();
      const observer = new MutationObserver(recordMilestones);
      observer.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
      });
      requestAnimationFrame(recordMilestones);
    };

    if (document.body) {
      startMilestoneObserver();
    } else {
      document.addEventListener('DOMContentLoaded', startMilestoneObserver, { once: true });
    }

    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const latestEntry = entries[entries.length - 1];
        if (!latestEntry) {
          return;
        }
        window.__landingFirstLoadMetrics.lcp = {
          startTime: Number(latestEntry.startTime.toFixed(2)),
          size: typeof latestEntry.size === 'number' ? latestEntry.size : null,
          url: latestEntry.url || null,
          element: describeElement(latestEntry.element),
        };
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_error) {
      // Browser support can vary.
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) {
            continue;
          }
          const value = entry.value || 0;
          window.__landingFirstLoadMetrics.cls += value;
          window.__landingFirstLoadMetrics.layoutShifts.push({
            startTime: Number(entry.startTime.toFixed(2)),
            value: Number(value.toFixed(4)),
            sources: Array.from(entry.sources || []).slice(0, 3).map((source) => ({
              node: describeElement(source.node),
            })),
          });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_error) {
      // Browser support can vary.
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__landingFirstLoadMetrics.longTasks.push({
            name: entry.name,
            startTime: Number(entry.startTime.toFixed(2)),
            duration: Number(entry.duration.toFixed(2)),
          });
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch (_error) {
      // Browser support can vary.
    }
  }, isViewportIntersectionVisible.toString());
};

const readPageSnapshot = async (page) => page.evaluate((visibilityPredicateSource) => {
  const visibilityPredicate = (0, eval)(`(${visibilityPredicateSource})`);
  if (typeof window.__dumpBegaRenderPerf === 'function') {
    window.__dumpBegaRenderPerf();
  }

  const navigationEntry = performance.getEntriesByType('navigation')[0];
  const paints = performance.getEntriesByType('paint').map((entry) => ({
    name: entry.name,
    startTime: Number(entry.startTime.toFixed(2)),
  }));
  const resources = performance.getEntriesByType('resource').map((entry) => ({
    name: entry.name,
    initiatorType: entry.initiatorType,
    startTime: Number(entry.startTime.toFixed(2)),
    duration: Number(entry.duration.toFixed(2)),
    transferSize: entry.transferSize,
    encodedBodySize: entry.encodedBodySize,
    decodedBodySize: entry.decodedBodySize,
  }));
  const visible = (selector) => {
    const node = document.querySelector(selector);
    if (!node) {
      return false;
    }
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return visibilityPredicate({
      rect,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
    });
  };
  const topOffset = (selector) => {
    const node = document.querySelector(selector);
    return node ? Number(node.getBoundingClientRect().top.toFixed(2)) : null;
  };
  const closingSectionTop = topOffset('[data-testid="landing-closing"]');

  return {
    url: window.location.href,
    viewportHeight: window.innerHeight,
    closingSectionTop,
    navigation: navigationEntry
      ? {
          domInteractive: Number(navigationEntry.domInteractive.toFixed(2)),
          domContentLoaded: Number(navigationEntry.domContentLoadedEventEnd.toFixed(2)),
          loadEventEnd: Number(navigationEntry.loadEventEnd.toFixed(2)),
          duration: Number(navigationEntry.duration.toFixed(2)),
          type: navigationEntry.type,
        }
      : null,
    paints,
    resources,
    landingMetrics: window.__landingFirstLoadMetrics || null,
    renderPerf: window.__begaRenderPerf || null,
    heroVisible: visible('[data-testid="landing-hero"]'),
    closingVisible: visible('[data-testid="landing-closing"]'),
    closingMascotVisible: visible('[data-testid="landing-closing-mascot"]'),
  };
}, isViewportIntersectionVisible.toString());

const waitForVisibleTestId = async (page, testId, timeoutMs = 8000) => {
  await page.waitForFunction(
    ({ id, visibilityPredicateSource }) => {
      const visibilityPredicate = (0, eval)(`(${visibilityPredicateSource})`);
      const node = document.querySelector(`[data-testid="${id}"]`);
      if (!node) {
        return false;
      }
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return visibilityPredicate({
        rect,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
      });
    },
    { id: testId, visibilityPredicateSource: isViewportIntersectionVisible.toString() },
    { timeout: timeoutMs },
  );
};

const classifyResource = (resource) => {
  const name = resource.name || '';
  const initiator = resource.initiatorType || 'other';
  if (/\.(woff2?|ttf|otf)($|\?)/i.test(name)) {
    return 'font';
  }
  if (initiator === 'script' || /\.m?js($|\?)/i.test(name)) {
    return 'script';
  }
  if (initiator === 'css' || initiator === 'link' || /\.css($|\?)/i.test(name)) {
    return 'stylesheet';
  }
  if (initiator === 'img' || /\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(name)) {
    return 'image';
  }
  return 'other';
};

const summarizeResources = (resources) => {
  const groups = {
    script: { count: 0, transferSize: 0, encodedBodySize: 0 },
    stylesheet: { count: 0, transferSize: 0, encodedBodySize: 0 },
    image: { count: 0, transferSize: 0, encodedBodySize: 0 },
    font: { count: 0, transferSize: 0, encodedBodySize: 0 },
    other: { count: 0, transferSize: 0, encodedBodySize: 0 },
  };

  for (const resource of resources) {
    const group = groups[classifyResource(resource)] || groups.other;
    group.count += 1;
    group.transferSize += resource.transferSize || 0;
    group.encodedBodySize += resource.encodedBodySize || 0;
  }

  return Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [
      key,
      {
        count: value.count,
        transferSize: value.transferSize,
        encodedBodySize: value.encodedBodySize,
      },
    ]),
  );
};

const topResources = (resources, limit = 10) => [...resources]
  .sort((left, right) => (
    (right.transferSize || right.encodedBodySize || 0)
    - (left.transferSize || left.encodedBodySize || 0)
  ))
  .slice(0, limit)
  .map((resource) => ({
    name: resource.name,
    type: classifyResource(resource),
    initiatorType: resource.initiatorType,
    transferSize: resource.transferSize || 0,
    encodedBodySize: resource.encodedBodySize || 0,
    duration: roundMetric(resource.duration),
  }));

const preferredTransferSize = (resource) => (
  resource?.transferSize || resource?.encodedBodySize || 0
);

const totalBlockingProxy = (longTasks) => roundMetric(
  longTasks.reduce((total, task) => total + Math.max(0, (task.duration || 0) - 50), 0),
);

const pickFcp = (snapshot) => roundMetric(
  snapshot.paints.find((paint) => paint.name === 'first-contentful-paint')?.startTime,
);

const pickLcp = (snapshot) => {
  const customLcp = snapshot.landingMetrics?.lcp;
  const renderPerfLcp = snapshot.renderPerf?.lcp;
  return {
    ms: roundMetric(customLcp?.startTime ?? renderPerfLcp?.startTime),
    size: customLcp?.size ?? renderPerfLcp?.size ?? null,
    url: customLcp?.url ?? renderPerfLcp?.url ?? null,
    element: customLcp?.element ?? renderPerfLcp?.element ?? null,
  };
};

const normalizeRequest = (request) => ({
  id: request.id,
  method: request.method,
  resourceType: request.resourceType,
  url: request.url,
  status: request.status,
  contentLength: request.contentLength,
  deferred: request.deferred,
  at: request.at,
  completedAt: request.completedAt,
});

const isPretendardRequest = (value) => (
  /cdn\.jsdelivr\.net\/gh\/orioncactus\/pretendard|pretendardvariable|PretendardVariable\.woff2/i.test(value || '')
);

const isOptimizedImageReference = (value) => /OptimizedImage/i.test(value || '');

const isStateAuthRuntimeReference = (value) => (
  /(^|\/)(vendor-zustand|AuthBootstrap|RootEntryRouteAuthAware|authStore)-[^/]+\.js($|\?)/i.test(value || '')
);

const collectStateAuthManifestReferences = (initialGraph) => initialGraph.flatMap((entry) => {
  const values = [entry.key, entry.file].filter(Boolean);
  return stateAuthManifestReferencePatterns.flatMap(({ label, pattern }) => (
    values
      .filter((value) => pattern.test(value))
      .map((value) => ({ label, value }))
  ));
});

const collectInitialGraphScriptMarkers = async (initialGraph) => {
  const findings = [];

  for (const entry of initialGraph) {
    if (!entry.file?.endsWith('.js')) {
      continue;
    }

    const source = await fs.readFile(path.join(distDir, entry.file), 'utf8').catch(() => '');
    for (const { label, marker } of stateAuthScriptMarkers) {
      if (source.includes(marker)) {
        findings.push({ label, marker, file: entry.file });
      }
    }
  }

  return findings;
};

const isFontRequestFailure = (failure) => (
  /cdn\.jsdelivr\.net|pretendard|\.woff2/i.test(failure.url)
);

const runIteration = async ({
  browser,
  baseUrl,
  viewport,
  index,
  deferredFragments,
}) => {
  const context = await browser.newContext({
    viewport: viewport.viewport,
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    locale: 'ko-KR',
    serviceWorkers: 'block',
  });
  await installMetricsInitScript(context);

  const page = await context.newPage();
  const network = createNetworkRecorder(page, deferredFragments);
  const consoleRecorder = createConsoleRecorder(page);
  const checks = [];
  const warnings = [];
  const failures = [];

  const entry = {
    viewport: viewport.key,
    index,
    status: 'unknown',
    metrics: null,
    initialDeferredRequests: [],
    initialPretendardRequests: [],
    initialOptimizedImageRequests: [],
    initialStateAuthRuntimeRequests: [],
    initialStylesheetRequests: [],
    afterClosingDeferredRequests: [],
    failedRequests: [],
    consoleErrors: [],
    checks,
    warnings,
    failures,
  };

  try {
    const targetUrl = new URL('/', baseUrl);
    targetUrl.searchParams.set('perf', 'render');
    await page.goto(targetUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForVisibleTestId(page, 'landing-hero', 10000)
      .then(() => checks.push('landing hero visible before scroll'))
      .catch((error) => {
        failures.push(`landing hero not visible: ${error instanceof Error ? error.message : String(error)}`);
      });
    await page.waitForLoadState('load', { timeout: 10000 }).catch(() => undefined);
    await sleep(settleMs);

    const initialEndedAt = Date.now();
    const initialSnapshot = await readPageSnapshot(page);
    const lcp = pickLcp(initialSnapshot);
    const longTasks = initialSnapshot.landingMetrics?.longTasks || initialSnapshot.renderPerf?.longTasks || [];
    const cls = roundMetric(initialSnapshot.landingMetrics?.cls ?? initialSnapshot.renderPerf?.cls ?? 0);
    const fcp = pickFcp(initialSnapshot);
    const initialResources = initialSnapshot.resources;
    const resourceSummary = summarizeResources(initialResources);
    const initialRequests = network.until(initialEndedAt);
    let initialDeferredRequests = collectSuccessfulDeferredRequests(network.requests, {
      to: initialEndedAt,
    }).map(normalizeRequest);
    const initialPretendardRequests = [
      ...initialRequests
        .filter((request) => isPretendardRequest(request.url))
        .map(normalizeRequest),
      ...initialResources
        .filter((resource) => isPretendardRequest(resource.name))
        .map((resource) => ({
          resourceType: classifyResource(resource),
          url: resource.name,
          transferSize: resource.transferSize || 0,
          encodedBodySize: resource.encodedBodySize || 0,
        })),
    ];
    const initialOptimizedImageRequests = [
      ...initialRequests
        .filter((request) => isOptimizedImageReference(request.url))
        .map(normalizeRequest),
      ...initialResources
        .filter((resource) => isOptimizedImageReference(resource.name))
        .map((resource) => ({
          resourceType: classifyResource(resource),
          url: resource.name,
          transferSize: resource.transferSize || 0,
          encodedBodySize: resource.encodedBodySize || 0,
        })),
    ];
    const initialStateAuthRuntimeRequests = [
      ...initialRequests
        .filter((request) => isStateAuthRuntimeReference(request.url))
        .map(normalizeRequest),
      ...initialResources
        .filter((resource) => isStateAuthRuntimeReference(resource.name))
        .map((resource) => ({
          resourceType: classifyResource(resource),
          url: resource.name,
          transferSize: resource.transferSize || 0,
          encodedBodySize: resource.encodedBodySize || 0,
        })),
    ];
    const initialStylesheetRequests = initialResources
      .filter((resource) => classifyResource(resource) === 'stylesheet')
      .map((resource) => ({
        resourceType: 'stylesheet',
        initiatorType: resource.initiatorType,
        url: resource.name,
        transferSize: resource.transferSize || 0,
        encodedBodySize: resource.encodedBodySize || 0,
        duration: roundMetric(resource.duration),
      }));
    const initialRequestTop = topResources(initialResources, 12);
    const renderPerf = initialSnapshot.renderPerf || null;

    const closingSectionTop = initialSnapshot.closingSectionTop;

    entry.metrics = {
      fcpMs: fcp,
      lcp,
      cls,
      longTaskCount: longTasks.length,
      totalBlockingTimeProxyMs: totalBlockingProxy(longTasks),
      navigation: initialSnapshot.navigation,
      resourceSummary,
      topRequests: initialRequestTop,
      renderPerf,
      heroRenderedAt: roundMetric(initialSnapshot.landingMetrics?.heroRenderedAt),
      closingRenderedAtBeforeScroll: roundMetric(initialSnapshot.landingMetrics?.closingRenderedAt),
      closingSectionTopAtScrollZero: roundMetric(closingSectionTop),
    };
    entry.initialDeferredRequests = initialDeferredRequests;
    entry.initialPretendardRequests = initialPretendardRequests;
    entry.initialOptimizedImageRequests = initialOptimizedImageRequests;
    entry.initialStateAuthRuntimeRequests = initialStateAuthRuntimeRequests;
    entry.initialStylesheetRequests = initialStylesheetRequests;

    if (!initialSnapshot.heroVisible) {
      failures.push('landing hero was not visible in initial snapshot');
    }
    if (lcp.ms === null) {
      failures.push('LCP was not collected');
    } else if (lcp.ms > 2500) {
      warnings.push(`LCP exceeds good threshold: ${lcp.ms}ms > 2500ms`);
    }
    if (cls !== null && cls > 0.1) {
      warnings.push(`CLS exceeds good threshold: ${cls} > 0.1`);
    }
    if (entry.metrics.totalBlockingTimeProxyMs !== null && entry.metrics.totalBlockingTimeProxyMs > 200) {
      warnings.push(`Long-task blocking proxy exceeds good TBT threshold: ${entry.metrics.totalBlockingTimeProxyMs}ms > 200ms`);
    }
    if (initialPretendardRequests.length > 0) {
      failures.push(`Pretendard font resources loaded before user scroll/click: ${initialPretendardRequests.map((request) => request.url).join(', ')}`);
    } else {
      checks.push('no Pretendard CDN font requested before scroll/click');
    }
    if (initialOptimizedImageRequests.length > 0) {
      failures.push(`OptimizedImage helper loaded on landing first-load: ${initialOptimizedImageRequests.map((request) => request.url).join(', ')}`);
    } else {
      checks.push('no OptimizedImage helper requested before scroll/click');
    }
    if (initialStateAuthRuntimeRequests.length > 0) {
      failures.push(`auth/Zustand runtime loaded on anonymous landing first-load: ${initialStateAuthRuntimeRequests.map((request) => request.url).join(', ')}`);
    } else {
      checks.push('no auth/Zustand runtime requested before scroll/click');
    }

    const closingScrollStartedAt = Date.now();
    await page.locator('[data-testid="landing-closing"]').scrollIntoViewIfNeeded({ timeout: closingTimeoutMs });
    await waitForVisibleTestId(page, 'landing-closing-mascot', closingTimeoutMs)
      .then(() => checks.push('landing closing mascot visible after scroll'))
      .catch((error) => {
        failures.push(`landing closing mascot not visible after scroll: ${error instanceof Error ? error.message : String(error)}`);
      });
    await page.waitForFunction(
      () => {
        const image = document.querySelector('[data-testid="landing-closing-mascot"]');
        return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
      },
      undefined,
      { timeout: closingTimeoutMs },
    ).catch((error) => {
      failures.push(`landing closing mascot did not finish loading after scroll: ${error instanceof Error ? error.message : String(error)}`);
    });
    await sleep(600);

    const afterSnapshot = await readPageSnapshot(page);
    const closingRequestPartition = partitionSuccessfulDeferredRequestsByStart(
      network.requests,
      closingScrollStartedAt,
    );
    initialDeferredRequests = closingRequestPartition.before.map(normalizeRequest);
    const afterClosingRequests = closingRequestPartition.after.map(normalizeRequest);
    entry.initialDeferredRequests = initialDeferredRequests;
    entry.afterClosingDeferredRequests = afterClosingRequests;
    entry.metrics.closingRenderedAtAfterScroll = roundMetric(afterSnapshot.landingMetrics?.closingRenderedAt);

    const closingAuditFailures = getClosingAuditFailures({
      initialSnapshot,
      afterSnapshot,
      initialSuccessfulRequestCount: initialDeferredRequests.length,
      afterSuccessfulRequestCount: afterClosingRequests.length,
    });
    failures.push(...closingAuditFailures);
    if (!initialSnapshot.closingVisible && !initialSnapshot.closingMascotVisible) {
      checks.push('landing closing section and mascot are invisible before scroll');
    }
    if (initialDeferredRequests.length === 0) {
      checks.push('exactly 0 successful lazy closing requests completed before scroll');
    }
    if (afterSnapshot.closingVisible && afterSnapshot.closingMascotVisible) {
      checks.push('landing closing section and mascot are visible after scroll');
    }
    if (afterClosingRequests.length === 1) {
      checks.push('exactly 1 successful lazy closing request completed after scroll');
    }

    const consoleErrors = consoleRecorder.errors();
    entry.consoleErrors = consoleErrors;
    if (consoleErrors.length > 0) {
      failures.push(`console errors: ${consoleErrors.join(' | ')}`);
    } else {
      checks.push('console error count is 0');
    }

    const failedRequests = network.failedRequests.map((failure) => ({ ...failure }));
    entry.failedRequests = failedRequests;
    const nonFontFailures = failedRequests.filter((failure) => !isFontRequestFailure(failure));
    if (failedRequests.length > nonFontFailures.length) {
      warnings.push('font/CDN request failed; audit continued');
    }
    if (nonFontFailures.some((failure) => failure.deferred)) {
      failures.push(`deferred request failed: ${nonFontFailures.filter((failure) => failure.deferred).map((failure) => failure.url).join(', ')}`);
    }

    entry.status = failures.length > 0 ? 'failed' : 'passed';
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
    entry.status = 'failed';
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
  }

  return entry;
};

const percentile = (values, percentileValue) => {
  const sorted = values.filter((value) => typeof value === 'number').sort((a, b) => a - b);
  if (sorted.length === 0) {
    return null;
  }
  const index = Math.max(0, Math.ceil(sorted.length * percentileValue) - 1);
  return sorted[index];
};

const summarizeViewport = (viewport, entries) => {
  const lcpValues = entries.map((entry) => entry.metrics?.lcp?.ms);
  const fcpValues = entries.map((entry) => entry.metrics?.fcpMs);
  const clsValues = entries.map((entry) => entry.metrics?.cls);
  const blockingValues = entries.map((entry) => entry.metrics?.totalBlockingTimeProxyMs);
  const status = entries.some((entry) => entry.status === 'failed') ? 'failed' : 'passed';

  return {
    key: viewport.key,
    label: viewport.label,
    status,
    summary: {
      fcpP95Ms: percentile(fcpValues, 0.95),
      lcpP95Ms: percentile(lcpValues, 0.95),
      maxCls: clsValues.filter((value) => typeof value === 'number').reduce((max, value) => Math.max(max, value), 0),
      totalBlockingTimeProxyP95Ms: percentile(blockingValues, 0.95),
      maxInitialScriptTransferBytes: Math.max(
        ...entries.map((entry) => entry.metrics?.resourceSummary?.script?.transferSize || 0),
        0,
      ),
      maxInitialStylesheetTransferBytes: Math.max(
        ...entries.map((entry) => preferredTransferSize(entry.metrics?.resourceSummary?.stylesheet)),
        0,
      ),
      maxInitialDeferredRequestCount: Math.max(...entries.map((entry) => entry.initialDeferredRequests.length), 0),
      maxInitialStateAuthRuntimeRequestCount: Math.max(...entries.map((entry) => entry.initialStateAuthRuntimeRequests.length), 0),
      maxAfterClosingDeferredRequestCount: Math.max(...entries.map((entry) => entry.afterClosingDeferredRequests.length), 0),
    },
    entries,
  };
};

const formatMs = (value) => (
  typeof value === 'number' ? `${value}ms` : 'n/a'
);

const formatBytes = (value) => {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${value} B`;
};

const compactUrl = (value) => {
  if (!value) {
    return 'n/a';
  }
  const url = safeUrl(value);
  if (!url) {
    return value;
  }
  return url.host ? `${url.host}${url.pathname}` : url.pathname;
};

const collectWarnings = (viewports) => viewports.flatMap((viewport) => (
  viewport.entries.flatMap((entry) => entry.warnings.map((warning) => `[${viewport.label} #${entry.index}] ${warning}`))
));

const collectChecks = (viewports) => viewports.flatMap((viewport) => (
  viewport.entries.flatMap((entry) => entry.checks.map((check) => `[${viewport.label} #${entry.index}] ${check}`))
));

const collectFailures = (viewports) => viewports.flatMap((viewport) => (
  viewport.entries.flatMap((entry) => entry.failures.map((failure) => `[${viewport.label} #${entry.index}] ${failure}`))
));

const collectInitialJsSummary = (viewports, manifestReferences, scriptMarkers) => {
  const scriptTransfers = viewports.flatMap((viewport) => (
    viewport.entries.map((entry) => entry.metrics?.resourceSummary?.script?.transferSize || 0)
  ));
  const stateAuthRuntimeRequestCounts = viewports.flatMap((viewport) => (
    viewport.entries.map((entry) => entry.initialStateAuthRuntimeRequests.length)
  ));

  return {
    maxScriptTransferBytes: Math.max(...scriptTransfers, 0),
    stateAuthRuntimeExcluded: manifestReferences.length === 0
      && scriptMarkers.length === 0
      && Math.max(...stateAuthRuntimeRequestCounts, 0) === 0,
    forbiddenManifestReferences: manifestReferences,
    forbiddenScriptMarkers: scriptMarkers,
    maxStateAuthRuntimeRequestCount: Math.max(...stateAuthRuntimeRequestCounts, 0),
  };
};

const collectInitialCssSummary = (viewports) => {
  const stylesheetTransfers = viewports.flatMap((viewport) => (
    viewport.entries.map((entry) => preferredTransferSize(entry.metrics?.resourceSummary?.stylesheet))
  ));
  const byRequest = new Map();

  for (const viewport of viewports) {
    for (const entry of viewport.entries) {
      for (const request of entry.initialStylesheetRequests || []) {
        const key = request.url;
        const existing = byRequest.get(key) || {
          url: request.url,
          type: 'stylesheet',
          initiatorType: request.initiatorType,
          transferSize: 0,
          encodedBodySize: 0,
          duration: 0,
          count: 0,
          viewports: new Set(),
        };
        if (preferredTransferSize(request) > preferredTransferSize(existing)) {
          existing.transferSize = request.transferSize || 0;
          existing.encodedBodySize = request.encodedBodySize || 0;
        }
        existing.duration = Math.max(existing.duration, request.duration || 0);
        existing.count += 1;
        existing.viewports.add(viewport.key);
        byRequest.set(key, existing);
      }
    }
  }

  return {
    budgetBytes: stylesheetBudgetBytes,
    maxStylesheetTransferBytes: Math.max(...stylesheetTransfers, 0),
    stylesheetRequests: [...byRequest.values()]
      .sort((left, right) => preferredTransferSize(right) - preferredTransferSize(left))
      .map((request) => ({
        ...request,
        duration: roundMetric(request.duration),
        viewports: [...request.viewports],
      })),
  };
};

const collectTopRequests = (viewports) => {
  const byRequest = new Map();

  for (const viewport of viewports) {
    for (const entry of viewport.entries) {
      for (const request of entry.metrics?.topRequests || []) {
        const key = `${request.type || classifyResource(request)}:${request.name}`;
        const existing = byRequest.get(key) || {
          name: request.name,
          type: request.type || classifyResource(request),
          initiatorType: request.initiatorType,
          transferSize: 0,
          encodedBodySize: 0,
          duration: 0,
          count: 0,
          viewports: new Set(),
        };
        existing.transferSize = Math.max(existing.transferSize, request.transferSize || 0);
        existing.encodedBodySize = Math.max(existing.encodedBodySize, request.encodedBodySize || 0);
        existing.duration = Math.max(existing.duration, request.duration || 0);
        existing.count += 1;
        existing.viewports.add(viewport.key);
        byRequest.set(key, existing);
      }
    }
  }

  return [...byRequest.values()]
    .sort((left, right) => (
      (right.transferSize || right.encodedBodySize || 0)
      - (left.transferSize || left.encodedBodySize || 0)
    ))
    .slice(0, 12)
    .map((request) => ({
      ...request,
      duration: roundMetric(request.duration),
      viewports: [...request.viewports],
    }));
};

const buildMarkdown = (report) => {
  const lines = [
    '# Landing First-Load Audit',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Base URL: ${report.baseUrl}`,
    `- Iterations per viewport: ${report.iterations}`,
    `- Settle time: ${report.settleMs}ms`,
    '',
    '## Core Metrics',
    '',
    '| Viewport | Status | FCP p95 | LCP p95 | Max CLS | TBT proxy p95 | Initial lazy closing max | After-scroll closing max |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...report.viewports.map((viewport) => [
      viewport.label,
      viewport.status,
      formatMs(viewport.summary.fcpP95Ms),
      formatMs(viewport.summary.lcpP95Ms),
      viewport.summary.maxCls,
      formatMs(viewport.summary.totalBlockingTimeProxyP95Ms),
      viewport.summary.maxInitialDeferredRequestCount,
      viewport.summary.maxAfterClosingDeferredRequestCount,
    ].join(' | ')).map((row) => `| ${row} |`),
    '',
    '## Deferred Closing Media',
    '',
    `- Closing assets: ${report.deferredResources.closingAssets.join(', ') || 'n/a'}`,
    '',
    '## Landing Critical Assets',
    '',
    `- Budget: ${formatBytes(report.landingCriticalAssets?.budgetBytes || 0)}`,
    `- Total: ${formatBytes(report.landingCriticalAssets?.totalBytes || 0)}`,
    '',
    '| Asset | Size |',
    '| --- | ---: |',
    ...(report.landingCriticalAssets?.assets || []).map((asset) => (
      `| ${asset.file} | ${formatBytes(asset.sizeBytes || 0)} |`
    )),
    '',
    '### Lazy closing assets',
    '',
    ...(report.landingCriticalAssets?.closingAssets || []).map((asset) => (
      `- ${asset.file}: ${formatBytes(asset.sizeBytes || 0)}`
    )),
    '',
    '## Landing Initial JS',
    '',
    `- Max script transfer: ${formatBytes(report.initialJs?.maxScriptTransferBytes || 0)}`,
    `- State/auth runtime excluded: ${report.initialJs?.stateAuthRuntimeExcluded ? 'yes' : 'no'}`,
    `- Forbidden manifest references: ${report.initialJs?.forbiddenManifestReferences?.length || 0}`,
    `- Forbidden script markers: ${report.initialJs?.forbiddenScriptMarkers?.length || 0}`,
    `- Max state/auth runtime requests: ${report.initialJs?.maxStateAuthRuntimeRequestCount || 0}`,
    '',
    '| Viewport | Max Scripts | Max State/Auth Runtime Requests |',
    '| --- | ---: | ---: |',
    ...report.viewports.map((viewport) => (
      `| ${viewport.label} | ${formatBytes(viewport.summary.maxInitialScriptTransferBytes || 0)} | ${viewport.summary.maxInitialStateAuthRuntimeRequestCount || 0} |`
    )),
    '',
    '## Landing Initial CSS',
    '',
    `- Budget: ${formatBytes(report.initialCss?.budgetBytes || 0)}`,
    `- Max stylesheet transfer: ${formatBytes(report.initialCss?.maxStylesheetTransferBytes || 0)}`,
    '',
    '| Viewport | Max Stylesheets |',
    '| --- | ---: |',
    ...report.viewports.map((viewport) => (
      `| ${viewport.label} | ${formatBytes(viewport.summary.maxInitialStylesheetTransferBytes || 0)} |`
    )),
    '',
    '| Transfer | Encoded | URL |',
    '| ---: | ---: | --- |',
    ...(report.initialCss?.stylesheetRequests || []).map((request) => (
      `| ${formatBytes(preferredTransferSize(request))} | ${formatBytes(request.encodedBodySize || 0)} | ${compactUrl(request.url)} |`
    )),
    '',
    '## Resource Size Summary',
    '',
    '| Viewport | Scripts | Stylesheets | Images | Fonts |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];

  for (const viewport of report.viewports) {
    const firstEntry = viewport.entries[0];
    const summary = firstEntry?.metrics?.resourceSummary || {};
    lines.push(`| ${viewport.label} | ${formatBytes(summary.script?.transferSize || 0)} | ${formatBytes(preferredTransferSize(summary.stylesheet))} | ${formatBytes(summary.image?.transferSize || 0)} | ${formatBytes(summary.font?.transferSize || 0)} |`);
  }

  lines.push(
    '',
    '## Top Initial Requests',
    '',
    '| Type | Transfer | Duration | URL |',
    '| --- | ---: | ---: | --- |',
  );

  for (const request of report.topRequests) {
    lines.push(`| ${request.type} | ${formatBytes(request.transferSize || request.encodedBodySize || 0)} | ${formatMs(request.duration)} | ${compactUrl(request.name)} |`);
  }

  if (report.failures.length > 0) {
    lines.push('', '## Failures', ...report.failures.map((failure) => `- ${failure}`));
  }

  if (report.warnings.length > 0) {
    lines.push('', '## Warnings', ...report.warnings.map((warning) => `- ${warning}`));
  }

  if (report.checks.length > 0) {
    lines.push('', '## Checks', ...report.checks.map((check) => `- ${check}`));
  }

  return `${lines.join('\n')}\n`;
};

const validateDist = async () => {
  const indexStat = await fileExists(path.join(distDir, 'index.html'));
  const manifestStat = await fileExists(manifestPath);
  if (!indexStat?.isFile() || !manifestStat?.isFile()) {
    throw new Error('dist/index.html or dist/.vite/client-manifest.json is missing. Run npm run build first.');
  }
};

const run = async () => {
  await validateDist();
  await ensureDir(path.dirname(jsonPath));
  await ensureDir(path.dirname(markdownPath));

  const manifest = await readManifest();
  const landingCriticalAssets = await collectCriticalLandingAssets(manifest.landing?.assets || []);
  const stateAuthManifestReferences = collectStateAuthManifestReferences(manifest.initialGraph || []);
  const initialGraphScriptMarkers = await collectInitialGraphScriptMarkers(manifest.initialGraph || []);
  const checks = [];
  const warnings = [];
  const setupFailures = [];

  if (!manifest.landing) {
    setupFailures.push('Landing manifest entry was not found');
  }

  const optimizedImageLandingImports = [
    ...(manifest.landing?.imports || []),
    ...(manifest.landing?.importFiles || []),
  ].filter(isOptimizedImageReference);
  if (!manifest.landing) {
    // Missing landing entry is reported above.
  } else if (optimizedImageLandingImports.length > 0) {
    setupFailures.push(`Landing initial import graph includes OptimizedImage: ${optimizedImageLandingImports.join(', ')}`);
  } else {
    checks.push('Landing initial import graph excludes OptimizedImage');
  }

  if (!manifest.landing) {
    // Missing landing entry is reported above.
  } else if (stateAuthManifestReferences.length > 0) {
    setupFailures.push(`Landing anonymous initial import graph includes auth/Zustand runtime: ${stateAuthManifestReferences.map((reference) => `${reference.label}:${reference.value}`).join(', ')}`);
  } else {
    checks.push('Landing anonymous initial import graph excludes auth/Zustand runtime');
  }

  if (initialGraphScriptMarkers.length > 0) {
    setupFailures.push(`Landing anonymous initial scripts include auth/Zustand runtime markers: ${initialGraphScriptMarkers.map((finding) => `${finding.label}:${finding.file}`).join(', ')}`);
  } else {
    checks.push('Landing anonymous initial scripts exclude auth/Zustand runtime markers');
  }

  if (landingCriticalAssets.missingNames.length > 0) {
    setupFailures.push(`Landing critical assets missing from manifest: ${landingCriticalAssets.missingNames.join(', ')}`);
  }
  if (landingCriticalAssets.missingDeferredNames.length > 0) {
    setupFailures.push(`Landing lazy closing assets missing from manifest: ${landingCriticalAssets.missingDeferredNames.join(', ')}`);
  }
  if (landingCriticalAssets.unexpectedAssets.length > 0) {
    setupFailures.push(`Landing manifest contains unexpected first-load assets: ${landingCriticalAssets.unexpectedAssets.join(', ')}`);
  }
  const missingSizedAssets = landingCriticalAssets.assets.filter((asset) => asset.sizeBytes === null);
  const missingSizedClosingAssets = landingCriticalAssets.closingAssets.filter((asset) => asset.sizeBytes === null);
  if (missingSizedAssets.length > 0) {
    setupFailures.push(`Landing critical asset files missing from dist: ${missingSizedAssets.map((asset) => asset.file).join(', ')}`);
  }
  if (missingSizedClosingAssets.length > 0) {
    setupFailures.push(`Landing lazy closing asset files missing from dist: ${missingSizedClosingAssets.map((asset) => asset.file).join(', ')}`);
  }
  if (landingCriticalAssets.totalBytes > landingCriticalAssets.budgetBytes) {
    setupFailures.push(`Landing critical assets exceed budget: ${formatBytes(landingCriticalAssets.totalBytes)} > ${formatBytes(landingCriticalAssets.budgetBytes)}`);
  }
  if (
    landingCriticalAssets.missingNames.length === 0
    && landingCriticalAssets.missingDeferredNames.length === 0
    && landingCriticalAssets.unexpectedAssets.length === 0
    && missingSizedAssets.length === 0
    && missingSizedClosingAssets.length === 0
    && landingCriticalAssets.totalBytes <= landingCriticalAssets.budgetBytes
  ) {
    checks.push(`Landing critical assets stay within ${formatBytes(landingCriticalAssets.budgetBytes)} budget and closing media remains separately classified`);
  }

  const { chromium } = await loadPlaywright();
  const server = await startStaticServer();
  const browser = await launchChromium(chromium);
  const viewportReports = [];

  try {
    for (const viewport of viewports) {
      const entries = [];
      for (let index = 1; index <= iterationCount; index += 1) {
        entries.push(await runIteration({
          browser,
          baseUrl: server.baseUrl,
          viewport,
          index,
          deferredFragments: manifest.deferredResources.fragments,
        }));
      }
      viewportReports.push(summarizeViewport(viewport, entries));
    }
  } finally {
    await browser.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }

  const initialJs = collectInitialJsSummary(
    viewportReports,
    stateAuthManifestReferences,
    initialGraphScriptMarkers,
  );
  const initialCss = collectInitialCssSummary(viewportReports);
  const cssBudgetFailures = initialCss.maxStylesheetTransferBytes > initialCss.budgetBytes
    ? [`Landing initial stylesheets exceed budget: ${formatBytes(initialCss.maxStylesheetTransferBytes)} > ${formatBytes(initialCss.budgetBytes)}`]
    : [];
  if (cssBudgetFailures.length === 0) {
    checks.push(`Landing initial stylesheets stay within ${formatBytes(initialCss.budgetBytes)} budget`);
  }
  const failures = [...setupFailures, ...cssBudgetFailures, ...collectFailures(viewportReports)];
  const report = {
    generatedAt: new Date().toISOString(),
    status: failures.length > 0 ? 'failed' : 'passed',
    baseUrl: server.baseUrl,
    iterations: iterationCount,
    settleMs,
    viewports: viewportReports,
    checks: [...checks, ...collectChecks(viewportReports)],
    warnings: [...warnings, ...collectWarnings(viewportReports)],
    failures,
    landingCriticalAssets,
    initialJs,
    initialCss,
    deferredResources: manifest.deferredResources,
    topRequests: collectTopRequests(viewportReports),
    manifest: {
      entry: manifest.entry,
      initialGraph: manifest.initialGraph,
      landing: manifest.landing,
    },
  };

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, buildMarkdown(report), 'utf8');

  console.log(`[landing-first-load] status=${report.status}`);
  console.log(`[landing-first-load] json=${path.relative(frontendRoot, jsonPath)}`);
  console.log(`[landing-first-load] markdown=${path.relative(frontendRoot, markdownPath)}`);

  if (report.status === 'failed') {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error('[landing-first-load] failed', error);
  process.exitCode = 1;
});
