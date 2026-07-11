#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const projectRoot = process.cwd();
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {
    host: '127.0.0.1',
    port: null,
    noServer: false,
    out: resolve(projectRoot, 'public/og/bega-og.png'),
    routePath: '/',
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--no-server') {
      result.noServer = true;
      continue;
    }

    if (arg === '--host' && next) {
      result.host = next;
      index += 1;
      continue;
    }

    if (arg === '--port' && next) {
      result.port = next;
      index += 1;
      continue;
    }

    if (arg === '--out' && next) {
      result.out = resolve(projectRoot, next);
      index += 1;
      continue;
    }

    if (arg === '--path' && next) {
      result.routePath = next.startsWith('/') ? next : `/${next}`;
      index += 1;
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

    if (arg.startsWith('--out=')) {
      result.out = resolve(projectRoot, arg.slice('--out='.length));
      continue;
    }

    if (arg.startsWith('--path=')) {
      const value = arg.slice('--path='.length);
      result.routePath = value.startsWith('/') ? value : `/${value}`;
    }
  }

  return result;
};

const log = (message) => console.log(`[landing-og] ${message}`);

const summarizeText = (text) => String(text ?? '')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .slice(-12)
  .join('\n');

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

const waitForServer = async (url, timeoutMs = 60000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady(url)) {
      return true;
    }
    await delay(500);
  }
  return false;
};

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
        // Fall back to the direct child when it is not a process-group leader.
      }
    }

    try {
      child.kill(signal);
    } catch {
      // Ignore cleanup failures after the capture result is known.
    }
  };

  signalChild('SIGINT');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    delay(2500),
  ]);

  if (child.exitCode === null) {
    signalChild('SIGKILL');
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      delay(1000),
    ]);
  }
};

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
      const pending = this.pending.get(message.id);
      if (!pending) {
        return;
      }

      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message));
        return;
      }

      pending.resolve(message.result);
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

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    if (!this.socket) {
      return;
    }

    const socket = this.socket;
    this.socket = null;

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

const getPageWebSocketUrl = async (port, targetUrl) => {
  const startedAt = Date.now();
  let lastPageUrls = [];
  let createdTarget = false;
  while (Date.now() - startedAt < 20000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
        signal: AbortSignal.timeout(1500),
      });
      const pages = await response.json();
      lastPageUrls = pages
        .filter((item) => item.type === 'page')
        .map((item) => item.url);

      const page = pages.find((item) => item.type === 'page' && item.url.startsWith(targetUrl));
      if (page?.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }

      if (!createdTarget) {
        createdTarget = true;
        const createResponse = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(targetUrl)}`, {
          method: 'PUT',
          signal: AbortSignal.timeout(1500),
        });
        if (createResponse.ok) {
          const createdPage = await createResponse.json();
          if (createdPage?.webSocketDebuggerUrl) {
            return createdPage.webSocketDebuggerUrl;
          }
        }
      }
    } catch {
      // Retry until Chrome exposes its debugger target.
    }

    await delay(250);
  }

  const knownPages = lastPageUrls.length > 0 ? lastPageUrls.join(', ') : 'none';
  throw new Error(`Failed to resolve a Chrome DevTools target for ${targetUrl}. Visible pages: ${knownPages}`);
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

const waitForLandingReady = async (client, timeoutMs = 12000) => {
  const result = await evaluateJson(client, `
    new Promise((resolve) => {
      const selectors = [
        '[data-testid="landing-page"]',
        '.landing-hero-context',
        '.ds-hero-title',
        '.ds-section-copy',
        '.landing-product-showcase',
        '.landing-product-showcase img',
        '[data-testid="landing-hero-cta-primary"]'
      ];
      const deadline = Date.now() + ${timeoutMs};

      const check = async () => {
        const selectorsReady = selectors.every((selector) => !!document.querySelector(selector));
        const titleReady = document.querySelector('.ds-hero-title')?.textContent?.includes('경기 전부터 기록까지 한 번에') ?? false;
        const productImagesReady = Array.from(document.querySelectorAll('.landing-product-showcase img'))
          .every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);

        if (document.readyState === 'complete' && selectorsReady && titleReady && productImagesReady) {
          if (document.fonts?.ready) {
            await document.fonts.ready;
          }
          resolve(JSON.stringify({ ready: true }));
          return;
        }

        if (Date.now() >= deadline) {
          resolve(JSON.stringify({
            ready: false,
            readyState: document.readyState,
            title: document.querySelector('.ds-hero-title')?.textContent?.trim() || '',
            selectors: selectors.map((selector) => ({
              selector,
              found: !!document.querySelector(selector),
            })),
            productImages: Array.from(document.querySelectorAll('.landing-product-showcase img')).map((image) => ({
              complete: image.complete,
              width: image.naturalWidth,
              height: image.naturalHeight,
            })),
          }));
          return;
        }

        setTimeout(check, 100);
      };

      check();
    })
  `, true);

  if (!result.ready) {
    throw new Error(`Landing page did not become ready for OG capture: ${JSON.stringify(result)}`);
  }
};

const getPngDimensions = (buffer) => {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error('Captured file is not a PNG image.');
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
};

const captureScreenshot = async (client, filepath) => {
  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    clip: {
      x: 0,
      y: 0,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      scale: 1,
    },
  });
  const png = Buffer.from(screenshot.data, 'base64');
  const dimensions = getPngDimensions(png);

  if (dimensions.width !== DEFAULT_WIDTH || dimensions.height !== DEFAULT_HEIGHT) {
    throw new Error(`Expected ${DEFAULT_WIDTH}x${DEFAULT_HEIGHT} PNG, received ${dimensions.width}x${dimensions.height}.`);
  }

  mkdirSync(dirname(filepath), { recursive: true });
  writeFileSync(filepath, png);
  return dimensions;
};

const main = async () => {
  const args = parseArgs();
  const port = args.port || (args.noServer ? '5178' : String(await getFreePort()));
  const baseUrl = `http://${args.host}:${port}`;
  const targetUrl = `${baseUrl}${args.routePath === '/' ? '' : args.routePath}`;

  const chromeBinary = resolveChromeBinary();
  if (!chromeBinary) {
    throw new Error('Unable to locate Google Chrome or Chromium. Set CHROME_BIN to continue.');
  }

  let devServer = null;
  if (!args.noServer && !(await isServerReady(baseUrl))) {
    log(`starting Vite dev server at ${baseUrl}`);
    devServer = startDevServer(args.host, port);
    const ready = await waitForServer(baseUrl);
    if (!ready) {
      throw new Error(`Dev server did not become ready.\n${devServer.getLogs()}`);
    }
  } else if (!(await isServerReady(baseUrl))) {
    throw new Error(`No frontend server is reachable at ${baseUrl}. Remove --no-server or pass --host/--port.`);
  } else {
    log(`using existing frontend at ${baseUrl}`);
  }

  const debugPort = await getFreePort();
  const userDataDir = mkdtempSync(join(tmpdir(), 'bega-landing-og-'));
  const chromeProcess = spawn(chromeBinary, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-extensions',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${DEFAULT_WIDTH},${DEFAULT_HEIGHT}`,
    targetUrl,
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
  try {
    const wsUrl = await getPageWebSocketUrl(debugPort, targetUrl);
    client = new CDPClient(wsUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ],
    });
    await client.send('Page.navigate', { url: targetUrl });
    await delay(1200);
    await waitForLandingReady(client);
    await client.send('Runtime.evaluate', {
      expression: `window.scrollTo({ top: 0, behavior: 'auto' }); 'ok';`,
      returnByValue: true,
    });
    await delay(200);

    const dimensions = await captureScreenshot(client, args.out);
    log(`captured ${dimensions.width}x${dimensions.height} OG image: ${args.out}`);
  } catch (error) {
    const chromeOutput = summarizeText(chromeLogs.join(''));
    if (chromeOutput) {
      console.error(chromeOutput);
    }
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
    await stopChild(chromeProcess);
    await stopChild(devServer?.child);
    rmSync(userDataDir, { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
