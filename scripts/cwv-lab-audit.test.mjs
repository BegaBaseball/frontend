import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const labScriptPath = path.join(scriptDir, 'cwv-lab-audit.mjs');

const writeMockPlaywrightModule = (filePath) => {
  writeFileSync(filePath, `
const metricNumber = (name, fallback) => {
  const value = Number(process.env[name] || fallback);
  return Number.isFinite(value) ? value : fallback;
};

const createLocator = () => ({
  first() {
    return this;
  },
  count: async () => 1,
  isVisible: async () => true,
  isEnabled: async () => true,
  scrollIntoViewIfNeeded: async () => undefined,
  click: async () => undefined,
});

const createPage = () => ({
  addInitScript: async () => undefined,
  getByRole: () => createLocator(),
  locator: () => createLocator(),
  goto: async () => ({
    status: () => 200,
  }),
  evaluate: async (fn) => {
    const source = String(fn);
    if (source.includes('window.__cwvLabPendingAction') && source.includes('return startTime')) {
      return 100;
    }
    if (source.includes('window.__cwvLabMetrics.syntheticActions.push')) {
      return undefined;
    }
    if (!source.includes('performance.getEntriesByType')) {
      return undefined;
    }

    const lcp = metricNumber('CWV_LAB_MOCK_LCP', 1000);
    const cls = metricNumber('CWV_LAB_MOCK_CLS', 0.01);
    const synthetic = metricNumber('CWV_LAB_MOCK_SYNTHETIC', 50);

    return {
      finalUrl: 'http://127.0.0.1:5180/',
      title: 'Mock CWV Lab',
      navigation: {
        requestStart: 0,
        responseStart: 4,
        domContentLoaded: 20,
        loadEventEnd: 30,
        duration: 30,
      },
      fcp: 100,
      lcp: {
        startTime: lcp,
        size: 1200,
        url: null,
        element: 'main',
      },
      cls,
      layoutShifts: cls > 0
        ? [{ startTime: 50, value: cls, sources: [{ node: 'main' }] }]
        : [],
      layoutShiftCount: cls > 0 ? 1 : 0,
      longTaskCount: 0,
      longTaskTotal: 0,
      longestLongTask: 0,
      syntheticInteractionMax: synthetic,
      syntheticActions: [{ label: 'mock action', startTime: 100, duration: synthetic }],
      lcpElement: 'main',
      lcpUrl: null,
    };
  },
});

const browser = {
  newContext: async () => ({
    newPage: async () => createPage(),
    close: async () => undefined,
  }),
  close: async () => undefined,
};

export const chromium = {
  launch: async () => browser,
};
`, 'utf8');
};

const createFixture = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'cwv-lab-test-'));
  const jsonPath = path.join(root, 'cwv-lab-audit.json');
  const markdownPath = path.join(root, 'cwv-lab-audit.md');
  const mockPlaywrightPath = path.join(root, 'mock-playwright.mjs');

  mkdirSync(root, { recursive: true });
  writeMockPlaywrightModule(mockPlaywrightPath);

  return {
    root,
    jsonPath,
    markdownPath,
    mockPlaywrightPath,
  };
};

const runLabAudit = (fixture, env = {}, extraArgs = [], routeArg = '/') => {
  const commandArgs = [
    labScriptPath,
  ];

  if (routeArg !== null) {
    commandArgs.push('--routes', routeArg);
  }

  commandArgs.push(
    '--iterations',
    '1',
    '--settle-ms',
    '1',
    '--json',
    fixture.jsonPath,
    '--markdown',
    fixture.markdownPath,
    ...extraArgs,
  );

  return spawnSync(process.execPath, commandArgs, {
  cwd: frontendRoot,
  env: {
    ...process.env,
    PLAYWRIGHT_MODULE_URL: pathToFileURL(fixture.mockPlaywrightPath).href,
    ...env,
  },
  encoding: 'utf8',
  });
};

test('cwv lab default route set covers core public journeys', () => {
  const fixture = createFixture();
  const result = runLabAudit(fixture, {}, [], null);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const markdown = readFileSync(fixture.markdownPath, 'utf8');

  assert.deepEqual(report.routes, ['/', '/home', '/prediction', '/cheer', '/mate']);
  assert.match(markdown, /- Routes: \/, \/home, \/prediction, \/cheer, \/mate/);
});

test('cwv lab gate passes when strict lab SLOs and synthetic interaction pass', () => {
  const fixture = createFixture();
  const result = runLabAudit(fixture, {}, ['--fail-on-review']);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const markdown = readFileSync(fixture.markdownPath, 'utf8');

  assert.equal(report.ok, true);
  assert.equal(report.failOnReview, true);
  assert.equal(report.summaries.every((summary) => summary.strictLabAssessment === 'pass'), true);
  assert.equal(report.summaries.every((summary) => summary.syntheticInteractionStrictPass === true), true);
  assert.match(markdown, /- Mode: gate \(review fails\)/);
});

test('cwv lab gate fails when synthetic interaction misses internal SLO', () => {
  const fixture = createFixture();
  const result = runLabAudit(fixture, {
    CWV_LAB_MOCK_SYNTHETIC: '150',
  }, ['--fail-on-review']);

  assert.equal(result.status, 1);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));

  assert.equal(report.ok, false);
  assert.equal(report.summaries.every((summary) => summary.officialLabAssessment === 'pass'), true);
  assert.equal(report.summaries.every((summary) => summary.strictLabAssessment === 'review'), true);
  assert.equal(report.summaries.every((summary) => summary.syntheticInteractionStrictPass === false), true);
  assert.match(result.stderr, /gate failed/);
});

test('cwv lab audit-only mode records review without failing the process', () => {
  const fixture = createFixture();
  const result = runLabAudit(fixture, {
    CWV_LAB_MOCK_LCP: '2200',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const markdown = readFileSync(fixture.markdownPath, 'utf8');

  assert.equal(report.ok, false);
  assert.equal(report.failOnReview, false);
  assert.equal(report.summaries.every((summary) => summary.officialLabAssessment === 'pass'), true);
  assert.equal(report.summaries.every((summary) => summary.strictLabAssessment === 'review'), true);
  assert.match(markdown, /- Mode: audit-only/);
});
