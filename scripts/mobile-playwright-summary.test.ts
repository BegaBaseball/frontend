import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCombinedReport,
  buildMarkdown,
  generateCombinedSummary,
  getSummaryPaths,
} from './mobile-playwright-summary.mjs';

const createPredictionSummary = () => ({
  status: 'passed',
  baseUrl: 'http://127.0.0.1:5176',
  serverMode: 'existing',
  entryCount: 10,
  overflowFailureCount: 0,
  actionableFailedRequestCount: 0,
  actionableConsoleErrorCount: 0,
  requestedStates: ['match', 'ranking'],
  durationMs: 1200,
});

const createMateSummary = () => ({
  baseUrl: 'http://127.0.0.1:5176',
  serverMode: 'existing',
  suites: [
    { label: 'MateDetail', durationMs: 2000 },
    { label: 'MateCreate', durationMs: 1500 },
  ],
  totals: {
    entryCount: 40,
    overflowFailureCount: 0,
    actionableFailedRequestCount: 0,
    actionableConsoleErrorCount: 0,
    failedSuiteCount: 0,
  },
});

test('buildCombinedReport aggregates prediction and mate summaries', () => {
  const summaryPaths = getSummaryPaths('/tmp/mobile-playwright-summary-test');
  const report = buildCombinedReport({
    predictionSummary: createPredictionSummary(),
    mateSummary: createMateSummary(),
    summaryPaths,
    generatedAt: '2026-04-06T00:00:00.000Z',
  });

  assert.ok(report);
  assert.equal(report.status, 'passed');
  assert.equal(report.domainCount, 2);
  assert.deepEqual(report.baseUrls, ['http://127.0.0.1:5176']);
  assert.equal(report.totalEntryCount, 50);
  assert.equal(report.totalActionableConsoleErrorCount, 0);
  assert.equal(report.domains[0]?.label, 'Prediction');
  assert.equal(report.domains[1]?.label, 'Mate');
});

test('buildMarkdown renders a combined domain table', () => {
  const summaryPaths = getSummaryPaths('/tmp/mobile-playwright-summary-test');
  const report = buildCombinedReport({
    predictionSummary: createPredictionSummary(),
    mateSummary: createMateSummary(),
    summaryPaths,
    generatedAt: '2026-04-06T00:00:00.000Z',
  });

  assert.ok(report);
  const markdown = buildMarkdown(report);

  assert.match(markdown, /# Mobile Playwright Smoke Summary/);
  assert.match(markdown, /\| Prediction \| passed \| 10 \|/);
  assert.match(markdown, /\| Mate \| passed \| 40 \|/);
});

test('generateCombinedSummary writes combined markdown and json outputs', async () => {
  const outputRoot = mkdtempSync(join(tmpdir(), 'mobile-playwright-summary-'));
  const summaryPaths = getSummaryPaths(outputRoot);

  writeFileSync(summaryPaths.predictionJsonPath, `${JSON.stringify(createPredictionSummary(), null, 2)}\n`);
  writeFileSync(summaryPaths.mateJsonPath, `${JSON.stringify(createMateSummary(), null, 2)}\n`);

  const result = await generateCombinedSummary({
    outputRoot,
    generatedAt: '2026-04-06T00:00:00.000Z',
  });

  assert.ok(result);
  assert.equal(result.report.status, 'passed');
  assert.equal(existsSync(summaryPaths.combinedJsonPath), true);
  assert.equal(existsSync(summaryPaths.combinedMarkdownPath), true);

  const combinedJson = JSON.parse(readFileSync(summaryPaths.combinedJsonPath, 'utf8'));
  const combinedMarkdown = readFileSync(summaryPaths.combinedMarkdownPath, 'utf8');

  assert.equal(combinedJson.totalEntryCount, 50);
  assert.match(combinedMarkdown, /Total entries: 50/);
});

test('generateCombinedSummary returns null when inputs are missing and allowMissing is true', async () => {
  const outputRoot = mkdtempSync(join(tmpdir(), 'mobile-playwright-summary-empty-'));

  const result = await generateCombinedSummary({
    outputRoot,
    allowMissing: true,
    generatedAt: '2026-04-06T00:00:00.000Z',
  });

  assert.equal(result, null);
});
