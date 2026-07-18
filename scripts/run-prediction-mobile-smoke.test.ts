import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const qaPresetsSource = () => readFileSync(new URL('./qa-presets.mjs', import.meta.url), 'utf8');
const runnerUrl = new URL('./run-prediction-mobile-smoke.mjs', import.meta.url);
const runnerPath = fileURLToPath(runnerUrl);
const cypressRunPath = fileURLToPath(new URL('./cypress-run.mjs', import.meta.url));
const smokeSpecPath = fileURLToPath(new URL('../cypress/e2e/prediction-mobile-smoke.cy.ts', import.meta.url));
const rankingPredictionPath = fileURLToPath(new URL('../src/components/RankingPrediction.tsx', import.meta.url));

test('prediction mobile smoke presets use the repo-local smoke runner', () => {
  const source = qaPresetsSource();
  const predictionMobileBlock = source.match(/'prediction-mobile': \{([\s\S]*?)\n  \},\n  'prediction-perf':/)?.[1] ?? '';

  assert.match(source, /smoke: nodeStep\(\['scripts\/run-prediction-mobile-smoke\.mjs'\], \{/);
  assert.match(source, /'smoke-attached': nodeStep\(\['scripts\/run-prediction-mobile-smoke\.mjs'\], \{/);
  assert.match(source, /'smoke-ranking': nodeStep\(\['scripts\/run-prediction-mobile-smoke\.mjs'\], \{/);
  assert.match(source, /'smoke-ranking-attached': nodeStep\(\['scripts\/run-prediction-mobile-smoke\.mjs'\], \{/);
  assert.match(source, /const PREDICTION_MOBILE_CORE_SMOKE_STATES = 'match,vote-panel,date-sheet,detail-loading,detail-error,top-notice'/);
  assert.match(source, /const PREDICTION_MOBILE_RANKING_SMOKE_STATES = 'ranking,ranking-ended,ranking-init-error,ranking-save-dialog,ranking-saved'/);
  assert.match(source, /PREDICTION_MOBILE_STATES: PREDICTION_MOBILE_CORE_SMOKE_STATES/);
  assert.match(source, /PREDICTION_MOBILE_STATES: PREDICTION_MOBILE_RANKING_SMOKE_STATES/);
  assert.doesNotMatch(predictionMobileBlock, /smoke: nodeStep\(\['\.\.\/output\/playwright\/run-prediction-mobile-regression\.mjs'\]/);
  assert.doesNotMatch(predictionMobileBlock, /'smoke-attached': nodeStep\(\['\.\.\/output\/playwright\/run-prediction-mobile-regression\.mjs'\]/);
  assert.doesNotMatch(predictionMobileBlock, /'smoke-ranking': nodeStep\(\['\.\.\/output\/playwright\/run-prediction-mobile-regression\.mjs'\]/);
  assert.doesNotMatch(predictionMobileBlock, /'smoke-ranking-attached': nodeStep\(\['\.\.\/output\/playwright\/run-prediction-mobile-regression\.mjs'\]/);
});

test('prediction mobile smoke runner builds summary entries for the smoke matrix', async () => {
  assert.equal(existsSync(runnerPath), true, 'scripts/run-prediction-mobile-smoke.mjs must exist');

  const runner = await import(runnerUrl.href);
  assert.deepEqual(runner.defaultPredictionMobileSmokeStates, [
    'match',
    'vote-panel',
    'date-sheet',
    'detail-loading',
    'detail-error',
    'top-notice',
  ]);
  assert.deepEqual(runner.rankingPredictionMobileSmokeStates, [
    'ranking',
    'ranking-ended',
    'ranking-init-error',
    'ranking-save-dialog',
    'ranking-saved',
  ]);
  assert.deepEqual(runner.allowedPredictionMobileSmokeStates, [
    ...runner.defaultPredictionMobileSmokeStates,
    ...runner.rankingPredictionMobileSmokeStates,
  ]);
  assert.deepEqual(runner.defaultPredictionMobileSmokeDevices, ['mobile-390']);

  const summary = runner.buildPredictionMobileSmokeSummary({
    baseUrl: 'http://127.0.0.1:5177',
    serverMode: 'managed',
    states: runner.defaultPredictionMobileSmokeStates,
    devices: runner.defaultPredictionMobileSmokeDevices,
    cypressStatus: 0,
    durationMs: 1234,
  });

  assert.equal(summary.status, 'passed');
  assert.equal(summary.reportKey, 'core');
  assert.deepEqual(summary.states, runner.defaultPredictionMobileSmokeStates);
  assert.deepEqual(summary.requestedStates, runner.defaultPredictionMobileSmokeStates);
  assert.deepEqual(summary.devices, runner.defaultPredictionMobileSmokeDevices);
  assert.equal(summary.entryCount, 6);
  assert.equal(summary.overflowFailureCount, 0);
  assert.equal(summary.actionableFailedRequestCount, 0);
  assert.equal(summary.actionableConsoleErrorCount, 0);
  assert.deepEqual(
    summary.entries.map((entry: { state: string; device: string }) => `${entry.state}:${entry.device}`),
    [
      'match:mobile-390',
      'vote-panel:mobile-390',
      'date-sheet:mobile-390',
      'detail-loading:mobile-390',
      'detail-error:mobile-390',
      'top-notice:mobile-390',
    ],
  );
});

test('prediction mobile smoke runner writes durable core and ranking summaries', async () => {
  const runner = await import(runnerUrl.href);

  assert.equal(
    runner.resolvePredictionMobileSmokeReportKey(runner.defaultPredictionMobileSmokeStates),
    'core',
  );
  assert.equal(
    runner.resolvePredictionMobileSmokeReportKey(runner.rankingPredictionMobileSmokeStates),
    'ranking',
  );
  assert.equal(
    runner.resolvePredictionMobileSmokeReportKey(['ranking', 'match']),
    'ranking-match',
  );

  const corePaths = runner.resolvePredictionMobileSmokeSummaryPaths(runner.defaultPredictionMobileSmokeStates);
  const rankingPaths = runner.resolvePredictionMobileSmokeSummaryPaths(runner.rankingPredictionMobileSmokeStates);

  assert.match(corePaths.latestJsonPath, /prediction-mobile-regression-summary\.json$/);
  assert.match(corePaths.latestMarkdownPath, /prediction-mobile-regression-summary\.md$/);
  assert.match(corePaths.variantJsonPath, /prediction-mobile-smoke-core-summary\.json$/);
  assert.match(corePaths.variantMarkdownPath, /prediction-mobile-smoke-core-summary\.md$/);
  assert.match(corePaths.indexJsonPath, /prediction-mobile-smoke-index\.json$/);
  assert.match(corePaths.indexMarkdownPath, /prediction-mobile-smoke-index\.md$/);
  assert.match(rankingPaths.variantJsonPath, /prediction-mobile-smoke-ranking-summary\.json$/);
  assert.match(rankingPaths.variantMarkdownPath, /prediction-mobile-smoke-ranking-summary\.md$/);
});

test('prediction mobile smoke runner builds an index for core and ranking reports', async () => {
  const runner = await import(runnerUrl.href);
  const coreSummary = runner.buildPredictionMobileSmokeSummary({
    baseUrl: 'http://127.0.0.1:5177',
    serverMode: 'managed',
    states: runner.defaultPredictionMobileSmokeStates,
    devices: runner.defaultPredictionMobileSmokeDevices,
    cypressStatus: 0,
    durationMs: 1000,
  });
  const rankingSummary = runner.buildPredictionMobileSmokeSummary({
    baseUrl: 'http://127.0.0.1:5177',
    serverMode: 'managed',
    states: runner.rankingPredictionMobileSmokeStates,
    devices: runner.defaultPredictionMobileSmokeDevices,
    cypressStatus: 0,
    durationMs: 2000,
  });

  const index = runner.buildPredictionMobileSmokeReportIndex({
    summaries: [coreSummary, rankingSummary],
    generatedAt: '2026-06-27T00:00:00.000Z',
  });
  const markdown = runner.renderPredictionMobileSmokeReportIndexMarkdown(index);

  assert.equal(index.status, 'passed');
  assert.equal(index.totals.expectedReportCount, 2);
  assert.equal(index.totals.availableReportCount, 2);
  assert.equal(index.totals.failedReportCount, 0);
  assert.equal(index.totals.missingReportCount, 0);
  assert.deepEqual(
    index.reports.map((report: { reportKey: string; status: string }) => `${report.reportKey}:${report.status}`),
    ['core:passed', 'ranking:passed'],
  );
  assert.match(markdown, /# Prediction Mobile Smoke Report Index/);
  assert.match(markdown, /prediction-mobile-smoke-core-summary\.md/);
  assert.match(markdown, /prediction-mobile-smoke-ranking-summary\.md/);

  const partialIndex = runner.buildPredictionMobileSmokeReportIndex({
    summaries: [coreSummary],
    generatedAt: '2026-06-27T00:00:00.000Z',
  });

  assert.equal(partialIndex.status, 'partial');
  assert.equal(partialIndex.totals.availableReportCount, 1);
  assert.equal(partialIndex.totals.missingReportCount, 1);
});

test('prediction mobile smoke runner allows Cypress Docker fallback', () => {
  const source = readFileSync(runnerPath, 'utf8');

  assert.match(source, /'scripts\/cypress-run\.mjs',\s*'--auto-docker',\s*'--spec'/);
});

test('prediction mobile smoke passes active states through Cypress env safely', () => {
  const runnerSource = readFileSync(runnerPath, 'utf8');
  const specSource = readFileSync(smokeSpecPath, 'utf8');
  const cypressRunSource = readFileSync(cypressRunPath, 'utf8');

  assert.match(runnerSource, /PREDICTION_MOBILE_ACTIVE_STATES:\s*states\.join\(','\)/);
  assert.match(runnerSource, /CYPRESS_PREDICTION_MOBILE_ACTIVE_STATES:\s*states\.join\(','\)/);
  assert.match(cypressRunSource, /const dockerPassthroughEnvKeys = \[\s*'CYPRESS_SKIP_VERIFY',\s*'CYPRESS_VERIFY_TIMEOUT',\s*'CYPRESS_PREDICTION_MOBILE_ACTIVE_STATES'/);
  assert.match(specSource, /cy\.env(?:<[^>]+>)?\(\['PREDICTION_MOBILE_ACTIVE_STATES'\]\)/);
  assert.doesNotMatch(specSource, /Cypress\.env\(/);
  assert.match(specSource, /const resolveActiveStateValue = \(envValue: unknown\)/);
});

test('prediction ranking save dialog smoke is gated to Cypress only', () => {
  const specSource = readFileSync(smokeSpecPath, 'utf8');
  const componentSource = readFileSync(rankingPredictionPath, 'utf8');

  assert.match(specSource, /onBeforeLoad:\s*state === 'ranking-save-dialog'/);
  assert.match(specSource, /__BEGA_PREDICTION_MOBILE_SMOKE_RANKING_SAVE_DIALOG__ = true/);
  assert.match(componentSource, /typedWindow\.Cypress/);
  assert.match(componentSource, /typedWindow\.__BEGA_PREDICTION_MOBILE_SMOKE_RANKING_SAVE_DIALOG__/);
  assert.match(componentSource, /setShowSaveDialog\(true\)/);
});

test('prediction mobile smoke supports slow Docker Cypress verification', () => {
  const runnerSource = readFileSync(runnerPath, 'utf8');
  const cypressRunSource = readFileSync(cypressRunPath, 'utf8');

  assert.match(runnerSource, /CYPRESS_VERIFY_TIMEOUT:\s*process\.env\.CYPRESS_VERIFY_TIMEOUT \|\| '120000'/);
  assert.match(cypressRunSource, /const dockerPassthroughEnvKeys = \[\s*'CYPRESS_SKIP_VERIFY',\s*'CYPRESS_VERIFY_TIMEOUT'/);
  assert.match(cypressRunSource, /\.\.\.collectDockerPassthroughEnvArgs\(\),/);
});

test('prediction mobile smoke managed Vite server is reachable from Cypress Docker', () => {
  const source = readFileSync(runnerPath, 'utf8');

  assert.match(source, /server\.listen\(\{\s*port,\s*host:\s*'0\.0\.0\.0'\s*\}\)/);
  assert.match(source, /'--host',\s*'0\.0\.0\.0'/);
  assert.doesNotMatch(source, /'--host',\s*'127\.0\.0\.1'/);
});

test('prediction mobile smoke copies screenshots into the summary artifact root', () => {
  const source = readFileSync(runnerPath, 'utf8');

  assert.match(source, /const cypressSmokeScreenshotRoot = path\.join\(/);
  assert.match(source, /'prediction-mobile-smoke\.cy\.ts'/);
  assert.match(source, /const copyPredictionMobileSmokeScreenshots = async/);
  assert.match(source, /await fs\.copyFile\(sourcePath, destinationPath\)/);
  assert.match(source, /await copyPredictionMobileSmokeScreenshots\(requestedStates, defaultPredictionMobileSmokeDevices\)/);
  assert.match(source, /summary_variant_markdown/);
  assert.match(source, /summary_index_markdown/);
});
