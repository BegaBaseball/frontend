import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const preferredPort = Number(process.env.SAJIK_EDITOR_DEV_SERVER_PORT ?? 5206);
const providedBaseUrl = process.env.SAJIK_EDITOR_BASE_URL;

const sleep = async (timeMs) => new Promise((resolve) => {
  setTimeout(resolve, timeMs);
});

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const checkPortAvailability = async (port) => new Promise((resolve) => {
  const server = net.createServer();
  server.once('error', () => resolve(false));
  server.once('listening', () => {
    server.close(() => resolve(true));
  });
  server.listen(port, '127.0.0.1');
});

const resolvePort = async (startPort) => {
  for (let offset = 0; offset < 80; offset += 1) {
    const candidate = startPort + offset;
    if (await checkPortAvailability(candidate)) {
      return candidate;
    }
  }

  return startPort;
};

const requestServer = async (baseUrl) => new Promise((resolve, reject) => {
  const request = http.get(baseUrl, (response) => {
    response.resume();
    response.on('end', () => {
      if (response.statusCode && response.statusCode >= 200 && response.statusCode < 500) {
        resolve();
        return;
      }
      reject(new Error(`HTTP ${response.statusCode}`));
    });
  });
  request.setTimeout(5000, () => {
    request.destroy(new Error('request timeout'));
  });
  request.on('error', reject);
});

const waitForServer = async (baseUrl) => {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < 60000) {
    try {
      await requestServer(baseUrl);
      return;
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }

  throw new Error(`Timed out waiting for ${baseUrl}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
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
    console.warn(`[sajik-editor] Chrome channel launch failed; retrying bundled Chromium. ${error instanceof Error ? error.message : String(error)}`);
    return chromium.launch({ headless: true });
  }
};

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const textByTestId = async (page, testId) => page.getByTestId(testId).innerText({ timeout: 10000 });

const runRegression = async (baseUrl) => {
  const { chromium } = await loadPlaywright();
  const browser = await launchChromium(chromium);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const result = {
    status: 'failed',
    baseUrl,
    checkedAt: new Date().toISOString(),
    checks: [],
  };

  try {
    await page.goto(`${baseUrl}/internal/sajik-seatmap-editor`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('sajik-seatmap-editor').waitFor({ state: 'visible', timeout: 30000 });
    result.checks.push('route-visible');

    await page.getByTestId('sajik-editor-section-search').fill('112');
    const initialPatch = await textByTestId(page, 'sajik-editor-patch-json');
    assertCondition(await textByTestId(page, 'sajik-editor-draft-status') === 'draft clean', 'Initial draft status must be clean.');
    assertCondition(await textByTestId(page, 'sajik-editor-before-after-status') === 'before = after', 'Initial before/after status must be equal.');
    assertCondition(await textByTestId(page, 'sajik-editor-patch-status-pass') === 'PATCH PASS', 'Initial patch status must pass.');
    result.checks.push('initial-patch-clean');

    await page.getByTestId('sajik-editor-nudge-step').selectOption('5');
    const beforeVertex = await textByTestId(page, 'sajik-editor-selected-vertex');
    await page.getByTestId('sajik-editor-nudge-x-plus').click();
    const afterVertex = await textByTestId(page, 'sajik-editor-selected-vertex');
    const dirtyPatch = await textByTestId(page, 'sajik-editor-patch-json');
    assertCondition(beforeVertex !== afterVertex, 'Nudge must change the selected vertex readout.');
    assertCondition(dirtyPatch !== initialPatch, 'Nudge must change patch preview after geometry.');
    assertCondition(await textByTestId(page, 'sajik-editor-draft-status') === 'draft dirty', 'Nudge must mark selected section dirty.');
    assertCondition((await textByTestId(page, 'sajik-editor-dirty-section-summary')).includes('112'), 'Dirty summary must include 112.');
    assertCondition(await page.getByTestId('sajik-editor-section-dirty-112').count() === 1, 'Section list must show 112 dirty badge.');
    assertCondition(await textByTestId(page, 'sajik-editor-before-after-status') === 'before != after', 'Dirty patch must show before/after difference.');
    assertCondition(!(await page.getByTestId('sajik-editor-copy-json').isDisabled()), 'JSON copy must be enabled for PASS patch.');
    assertCondition(!(await page.getByTestId('sajik-editor-copy-ts').isDisabled()), 'TS copy must be enabled for PASS patch.');
    result.checks.push('nudge-dirty-patch');

    await page.getByTestId('sajik-editor-reset-draft').click();
    assertCondition(await textByTestId(page, 'sajik-editor-draft-status') === 'draft clean', 'Reset current must restore clean state.');
    assertCondition(await textByTestId(page, 'sajik-editor-before-after-status') === 'before = after', 'Reset current must restore before/after equality.');
    assertCondition(await textByTestId(page, 'sajik-editor-patch-json') === initialPatch, 'Reset current must restore original patch preview.');
    result.checks.push('reset-current');

    const visualVertexHandles = page.locator('[data-testid^="sajik-editor-vertex-handle-visualPath-"]');
    const initialVertexHandleCount = await visualVertexHandles.count();
    await page.getByTestId('sajik-editor-add-vertex-after').click();
    assertCondition(await visualVertexHandles.count() === initialVertexHandleCount + 1, 'Add vertex must increase visualPath handle count.');
    assertCondition((await textByTestId(page, 'sajik-editor-selected-vertex')).startsWith('vertex 1:'), 'Add vertex must select the inserted vertex.');
    await page.getByTestId('sajik-editor-delete-vertex').click();
    assertCondition(await visualVertexHandles.count() === initialVertexHandleCount, 'Delete vertex must restore visualPath handle count.');
    assertCondition(await textByTestId(page, 'sajik-editor-draft-status') === 'draft clean', 'Add then delete must return the section to clean state.');
    result.checks.push('vertex-add-delete');

    const dragHandle = page.getByTestId('sajik-editor-vertex-handle-visualPath-0');
    const beforeDragVertex = await textByTestId(page, 'sajik-editor-selected-vertex');
    const dragBox = await dragHandle.boundingBox();
    assertCondition(Boolean(dragBox), 'Vertex handle bounding box must be available for drag.');
    await page.mouse.move(dragBox.x + (dragBox.width / 2), dragBox.y + (dragBox.height / 2));
    await page.mouse.down();
    await page.mouse.move(dragBox.x + (dragBox.width / 2) + 12, dragBox.y + (dragBox.height / 2) + 8, { steps: 4 });
    await page.mouse.up();
    assertCondition(await textByTestId(page, 'sajik-editor-selected-vertex') !== beforeDragVertex, 'Dragging a vertex must update the selected vertex readout.');
    assertCondition(await textByTestId(page, 'sajik-editor-draft-status') === 'draft dirty', 'Dragging a vertex must mark the section dirty.');
    await page.getByTestId('sajik-editor-reset-draft').click();
    result.checks.push('vertex-drag');

    await page.getByTestId('sajik-editor-invalid-hitpath-fixture').click();
    await page.getByTestId('sajik-editor-patch-status-fail').waitFor({ state: 'visible', timeout: 10000 });
    const invalidPatch = await textByTestId(page, 'sajik-editor-patch-json');
    assertCondition(invalidPatch.includes('"HIT_POLYGON_TOO_SMALL"'), 'Invalid hitPath fixture must surface HIT_POLYGON_TOO_SMALL.');
    assertCondition(await page.getByTestId('sajik-editor-copy-json').isDisabled(), 'JSON copy must be disabled when validation fails.');
    assertCondition(await page.getByTestId('sajik-editor-copy-ts').isDisabled(), 'TS copy must be disabled when validation fails.');
    await page.getByTestId('sajik-editor-reset-all-drafts').click();
    result.checks.push('validation-fail-export-lock');

    await page.getByTestId('sajik-editor-path-kind-labelPoint').click();
    assertCondition(await page.getByTestId('sajik-editor-labelpoint-handle').count() === 1, 'Label point mode must render label handle.');
    await page.getByTestId('sajik-editor-nudge-y-plus').click();
    assertCondition(await textByTestId(page, 'sajik-editor-draft-status') === 'draft dirty', 'Label point nudge must mark draft dirty.');
    await page.getByTestId('sajik-editor-reset-all-drafts').click();
    assertCondition(await textByTestId(page, 'sajik-editor-dirty-section-summary') === 'dirty sections: none', 'Reset all must clear dirty summary.');
    result.checks.push('labelpoint-and-reset-all');

    await page.getByTestId('sajik-editor-section-search').fill('hit-candidate');
    const hitCandidateBadge = page.locator('[data-testid^="sajik-editor-section-hit-candidate-"]').first();
    await hitCandidateBadge.waitFor({ state: 'visible', timeout: 10000 });
    assertCondition(
      await page.locator('[data-testid^="sajik-editor-section-hit-candidate-"]').count() > 0,
      'hit-candidate search must reveal hit badge rows.',
    );
    result.checks.push('hit-candidate-search');

    await page.getByTestId('sajik-editor-section-search').fill('WHEELCHAIR');
    const wheelchairPatch = await textByTestId(page, 'sajik-editor-patch-json');
    assertCondition(wheelchairPatch.includes('"markerType": "WHEELCHAIR"'), 'Wheelchair search patch must include markerType.');
    assertCondition(wheelchairPatch.includes('"sectionKind": "ACCESSIBILITY_MARKER"'), 'Wheelchair search patch must include accessibility sectionKind.');
    result.checks.push('wheelchair-search');

    await page.getByTestId('sajik-editor-section-search').fill('011');
    const aliasPatch = await textByTestId(page, 'sajik-editor-patch-json');
    assertCondition(aliasPatch.includes('"enabled": false'), '011 patch must remain disabled alias-only.');
    assertCondition(aliasPatch.includes('"sectionKind": "ALIAS_ONLY"'), '011 patch must include ALIAS_ONLY sectionKind.');
    result.checks.push('alias-only-search');

    result.status = 'passed';
    return result;
  } finally {
    await browser.close().catch(() => undefined);
  }
};

let devServer = null;

try {
  await ensureDir(reportDir);
  const baseUrl = providedBaseUrl ?? `http://127.0.0.1:${await resolvePort(preferredPort)}`;

  if (!providedBaseUrl) {
    const port = new URL(baseUrl).port;
    devServer = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', port, '--strictPort'], {
      cwd: frontendRoot,
      env: {
        ...process.env,
        VITE_PROXY_TARGET: process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:8080',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    devServer.stdout.on('data', (chunk) => process.stdout.write(chunk));
    devServer.stderr.on('data', (chunk) => process.stderr.write(chunk));
  }

  await waitForServer(baseUrl);
  const result = await runRegression(baseUrl);
  const jsonPath = path.join(reportDir, 'sajik-seatmap-editor-regression.json');
  const markdownPath = path.join(reportDir, 'sajik-seatmap-editor-regression.md');
  await fs.writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  await fs.writeFile(markdownPath, [
    '# Sajik Seatmap Editor Regression',
    '',
    `- status: ${result.status}`,
    `- baseUrl: ${result.baseUrl}`,
    `- checkedAt: ${result.checkedAt}`,
    `- checks: ${result.checks.join(', ')}`,
    '',
  ].join('\n'));

  console.log(`editor_regression_json:${jsonPath}`);
  console.log(`editor_regression_markdown:${markdownPath}`);
  console.log(`status:${result.status} checks=${result.checks.length}`);

  if (result.status !== 'passed') {
    process.exitCode = 1;
  }
} finally {
  if (devServer) {
    devServer.kill('SIGTERM');
    await sleep(500);
    if (devServer.exitCode === null) {
      devServer.kill('SIGKILL');
    }
  }
}
