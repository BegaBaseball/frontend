import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const summaryScriptPath = path.join(scriptDir, 'home-first-load-report-summary.mjs');

const writeJson = (filePath: string, payload: unknown) => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const createHomeFirstLoadFixture = ({
  reportGeneratedAt,
  buildGeneratedAt,
}: {
  reportGeneratedAt: string;
  buildGeneratedAt: string;
}) => {
  const root = mkdtempSync(path.join(tmpdir(), 'home-first-load-summary-'));
  const reportsRoot = path.join(root, 'reports');
  const assetsRoot = path.join(root, 'assets');
  const buildReportPath = path.join(root, 'bundle-guard-report.json');
  const runtimeReportPath = path.join(reportsRoot, 'home-first-load-summary.json');

  mkdirSync(assetsRoot, { recursive: true });
  writeFileSync(path.join(assetsRoot, 'Home-abc123.js'), 'export {};\n', 'utf8');

  writeJson(buildReportPath, {
    generatedAt: buildGeneratedAt,
    homeFirstLoadStaticClosureResults: [{
      label: '/home first-load static closure',
      ok: true,
      totalJsBytes: 283120,
      maxJsBytes: 290000,
      overageBytes: 0,
      includedFiles: [{
        key: 'src/components/Home.tsx',
        file: 'assets/Home-abc123.js',
        sizeBytes: 27594,
      }],
    }],
  });

  writeJson(runtimeReportPath, {
    generatedAt: reportGeneratedAt,
    status: 'passed',
    mode: 'mock',
    reportKey: 'home-first-load-mock',
    selectedDate: '2026-06-30',
    budgets: {
      firstGameCardP95Ms: 2500,
      bootstrapResponseP95Ms: 800,
    },
    viewports: [{
      viewport: 'desktop',
      status: 'passed',
      firstGameCardP95: 1200,
      bootstrapResponseP95: 200,
      entries: [{
        firstGameCardMs: 1180,
        prewarm: false,
        criticalResources: [],
        slowestResources: [],
        deferredBeforeFirstCardResources: [],
        preCardScriptResourceCount: 5,
        scriptResourceCount: 8,
        longTaskTotalMs: 0,
        longestLongTaskMs: 0,
      }],
    }],
  });

  return {
    reportsRoot,
    assetsRoot,
    buildReportPath,
  };
};

const runSummary = (fixture: ReturnType<typeof createHomeFirstLoadFixture>) => spawnSync(
  process.execPath,
  [
    summaryScriptPath,
    '--root',
    fixture.reportsRoot,
    '--dist-assets',
    fixture.assetsRoot,
    '--build-report',
    fixture.buildReportPath,
    '--limit',
    '1',
    '--require-current-build',
    '--json',
  ],
  {
    cwd: frontendRoot,
    encoding: 'utf8',
  },
);

test('home first-load summary freshness gate rejects stale runtime reports', () => {
  const fixture = createHomeFirstLoadFixture({
    reportGeneratedAt: '2026-06-30T08:00:00.000Z',
    buildGeneratedAt: '2026-06-30T09:00:00.000Z',
  });

  const result = runSummary(fixture);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /freshness gate failed/);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.freshnessGate.passed, false);
  assert.equal(payload.freshnessGate.olderThanCurrentBuild, 1);
  assert.equal(payload.analyses[0].freshness.status, 'older-than-current-build');
});

test('home first-load summary freshness gate accepts current runtime reports', () => {
  const fixture = createHomeFirstLoadFixture({
    reportGeneratedAt: '2026-06-30T09:05:00.000Z',
    buildGeneratedAt: '2026-06-30T09:00:00.000Z',
  });

  const result = runSummary(fixture);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.freshnessGate.passed, true);
  assert.equal(payload.freshnessGate.currentOrNewer, 1);
  assert.equal(payload.analyses[0].freshness.status, 'current-or-newer');
});
