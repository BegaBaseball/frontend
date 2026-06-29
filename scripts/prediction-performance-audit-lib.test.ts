import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPredictionPerformanceMarkdown,
  buildPredictionPerformanceJsonFallbackSummary,
  buildTimingSummary,
  classifyPredictionApiRequest,
  evaluatePredictionRuntimeBudget,
  evaluatePredictionScenarioSummary,
  evaluatePredictionPerformanceReport,
  extractPredictionFailedScenarioIds,
  groupPredictionScenarioFailures,
  parsePredictionPerformanceScenarioIds,
  parsePredictionPerformanceScenarioSelection,
  percentile,
  predictionApiEndpointKeys,
} from './prediction-performance-audit-lib.mjs';

const budgets = {
  previewP95Ms: 1000,
  detailP95Ms: 1500,
  reentryP95Ms: 200,
  apiWarmP95Ms: 200,
  apiColdP95Ms: 500,
};

test('percentile uses nearest-rank calculation', () => {
  assert.equal(percentile([10, 50, 20, 30, 40], 0.5), 30);
  assert.equal(percentile([10, 50, 20, 30, 40], 0.95), 50);
  assert.equal(percentile([], 0.95), null);
});

test('buildTimingSummary returns rounded p50/p95 values', () => {
  const summary = buildTimingSummary([10.14, 20.26, 30.39, 40.41]);

  assert.equal(summary.count, 4);
  assert.equal(summary.min, 10.1);
  assert.equal(summary.p50, 20.3);
  assert.equal(summary.p95, 40.4);
  assert.equal(summary.max, 40.4);
});

test('parsePredictionPerformanceScenarioIds supports subsets and rejects unknown scenarios', () => {
  assert.deepEqual(
    parsePredictionPerformanceScenarioIds('scheduled-game,rest-day,scheduled-game'),
    ['scheduled-game', 'rest-day'],
  );
  assert.deepEqual(
    parsePredictionPerformanceScenarioIds('', ['scheduled-game']),
    ['scheduled-game'],
  );
  assert.throws(
    () => parsePredictionPerformanceScenarioIds('scheduled-game,unknown-case'),
    /Unknown prediction performance scenario: unknown-case/,
  );
});

test('parsePredictionPerformanceScenarioSelection resolves scenario tiers', () => {
  assert.deepEqual(
    parsePredictionPerformanceScenarioSelection({ rawTier: 'core' }),
    {
      scenarioTier: 'core',
      scenarioSelectionSource: 'tier',
      selectedScenarioIds: ['scheduled-game', 'rest-day', 'past-completed', 'manual-data-required'],
      skippedScenarioIds: ['ranking-tab', 'today-live'],
    },
  );
  assert.deepEqual(
    parsePredictionPerformanceScenarioSelection({ rawTier: 'extended' }),
    {
      scenarioTier: 'extended',
      scenarioSelectionSource: 'tier',
      selectedScenarioIds: ['today-live', 'ranking-tab'],
      skippedScenarioIds: ['scheduled-game', 'rest-day', 'past-completed', 'manual-data-required'],
    },
  );
  assert.deepEqual(
    parsePredictionPerformanceScenarioSelection({ rawTier: 'all' }),
    {
      scenarioTier: 'all',
      scenarioSelectionSource: 'tier',
      selectedScenarioIds: ['scheduled-game', 'ranking-tab', 'rest-day', 'past-completed', 'today-live', 'manual-data-required'],
      skippedScenarioIds: [],
    },
  );
  assert.throws(
    () => parsePredictionPerformanceScenarioSelection({ rawTier: 'quick' }),
    /Unknown prediction performance scenario tier: quick/,
  );
});

test('parsePredictionPerformanceScenarioSelection lets explicit scenarios override tier', () => {
  assert.deepEqual(
    parsePredictionPerformanceScenarioSelection({
      rawTier: 'core',
      rawScenarioIds: 'scheduled-game,today-live',
    }),
    {
      scenarioTier: 'custom',
      scenarioSelectionSource: 'env-scenarios',
      selectedScenarioIds: ['scheduled-game', 'today-live'],
      skippedScenarioIds: ['ranking-tab', 'rest-day', 'past-completed', 'manual-data-required'],
    },
  );
});

test('classifyPredictionApiRequest recognizes prediction performance endpoints', () => {
  assert.equal(
    classifyPredictionApiRequest('http://localhost/api/matches/day?date=2026-06-07'),
    predictionApiEndpointKeys.MATCHES_DAY,
  );
  assert.equal(
    classifyPredictionApiRequest('/api/predictions/bootstrap?date=2026-06-07&gameId=GAME-1'),
    predictionApiEndpointKeys.BOOTSTRAP,
  );
  assert.equal(
    classifyPredictionApiRequest('/api/kbo/rankings/snapshot?date=2026-06-07'),
    predictionApiEndpointKeys.RANKING_SNAPSHOT,
  );
  assert.equal(
    classifyPredictionApiRequest('/api/predictions/ranking/init'),
    predictionApiEndpointKeys.RANKING_PREDICTION,
  );
  assert.equal(
    classifyPredictionApiRequest('/api/prediction/stats/me'),
    predictionApiEndpointKeys.PREDICTION_STATS,
  );
  assert.equal(
    classifyPredictionApiRequest('/api/matches/GAME-1/live-relay?afterId=1'),
    predictionApiEndpointKeys.LIVE_RELAY,
  );
  assert.equal(
    classifyPredictionApiRequest('/api/matches/GAME-1/live?afterSeq=1'),
    predictionApiEndpointKeys.LIVE,
  );
  assert.equal(
    classifyPredictionApiRequest('/api/matches/GAME-1'),
    predictionApiEndpointKeys.GAME_DETAIL,
  );
  assert.equal(
    classifyPredictionApiRequest('/api/matches/bounds?date=2026-06-07'),
    predictionApiEndpointKeys.OTHER,
  );
  assert.equal(
    classifyPredictionApiRequest('/api/matches/live?gameIds=GAME-1'),
    predictionApiEndpointKeys.OTHER,
  );
  assert.equal(
    classifyPredictionApiRequest('/api/predictions/status/GAME-1'),
    predictionApiEndpointKeys.VOTE_STATUS,
  );
});

test('evaluatePredictionPerformanceReport passes when budgets and network contracts are met', () => {
  const result = evaluatePredictionPerformanceReport({
    mode: 'mock',
    budgets,
    browserSummary: {
      previewP95Ms: 800,
      detailP95Ms: 1100,
      reentryP95Ms: 120,
      maxDeepLinkBootstrapRequests: 1,
      maxDeepLinkMatchesDayRequests: 0,
      maxDeepLinkGameDetailRequests: 0,
      maxDeepLinkVoteStatusRequests: 0,
      maxPreDetailDeferredRequests: 0,
    },
    apiSummary: {
      endpoints: {
        bootstrap: {
          coldMs: 600,
          warm: { p95: 120 },
          failedRequestCount: 0,
        },
      },
    },
  });

  assert.equal(result.status, 'passed');
  assert.deepEqual(result.failures, []);
});

test('evaluatePredictionPerformanceReport fails on render budget and duplicate network calls', () => {
  const result = evaluatePredictionPerformanceReport({
    mode: 'real',
    budgets,
    browserSummary: {
      previewP95Ms: 1200,
      detailP95Ms: 1600,
      reentryP95Ms: 260,
      maxDeepLinkBootstrapRequests: 2,
      maxDeepLinkMatchesDayRequests: 1,
      maxDeepLinkGameDetailRequests: 1,
      maxDeepLinkVoteStatusRequests: 1,
      maxPreDetailDeferredRequests: 1,
    },
    apiSummary: {
      endpoints: {
        matchesDay: {
          coldMs: 100,
          warm: { p95: 240 },
          failedRequestCount: 0,
        },
      },
    },
  });

  assert.equal(result.status, 'failed');
  assert.ok(result.failures.includes('PREVIEW_P95_BUDGET_EXCEEDED'));
  assert.ok(result.failures.includes('UNEXPECTED_DEEP_LINK_BOOTSTRAP_REQUEST_COUNT'));
  assert.ok(result.failures.includes('API_WARM_P95_BUDGET_EXCEEDED:matchesDay'));
});

test('evaluatePredictionPerformanceReport reports needs-backend and optional strict cold failures', () => {
  const needsBackend = evaluatePredictionPerformanceReport({
    mode: 'real',
    budgets,
    browserSummary: {},
    apiSummary: {},
    backendReachable: false,
  });

  assert.equal(needsBackend.status, 'needs-backend');

  const strictCold = evaluatePredictionPerformanceReport({
    mode: 'real',
    budgets,
    strictCold: true,
    browserSummary: {
      previewP95Ms: 800,
      detailP95Ms: 1100,
      reentryP95Ms: 120,
      maxDeepLinkBootstrapRequests: 1,
      maxDeepLinkMatchesDayRequests: 0,
      maxDeepLinkGameDetailRequests: 0,
      maxDeepLinkVoteStatusRequests: 0,
      maxPreDetailDeferredRequests: 0,
    },
    apiSummary: {
      endpoints: {
        bootstrap: {
          coldMs: 700,
          warm: { p95: 120 },
          failedRequestCount: 0,
        },
      },
    },
  });

  assert.equal(strictCold.status, 'failed');
  assert.ok(strictCold.failures.includes('API_COLD_BUDGET_EXCEEDED:bootstrap'));
});

test('evaluatePredictionPerformanceReport prioritizes manual baseball data requirements in real mode', () => {
  const result = evaluatePredictionPerformanceReport({
    mode: 'real',
    budgets,
    browserSummary: {
      failedEntryCount: 1,
      maxDeepLinkBootstrapRequests: 0,
    },
    apiSummary: {
      endpoints: {
        matchesDay: {
          coldStatus: 409,
          manualDataRequired: true,
          manualDataContract: {
            code: 'MANUAL_BASEBALL_DATA_REQUIRED',
            scope: 'prediction.matches_by_date',
            missingItems: [{
              key: 'season_league_context',
              label: 'Season league context',
              reason: 'season row is missing',
            }],
            operatorMessage: 'Provide season league context.',
          },
          warm: { p95: 12 },
          failedRequestCount: 0,
        },
      },
    },
  });

  assert.equal(result.status, 'manual-data-required');
  assert.deepEqual(result.failures, ['MANUAL_BASEBALL_DATA_REQUIRED:matchesDay']);
});

test('evaluatePredictionScenarioSummary excludes rest-day detail and reentry budgets', () => {
  const result = evaluatePredictionScenarioSummary({
    budgets,
    scenarioSummary: [{
      id: 'rest-day',
      requiresDetail: false,
      previewP95Ms: 900,
      detailP95Ms: 4000,
      reentryP95Ms: 4000,
      missingVoteButtonCount: 5,
      maxDeepLinkBootstrapRequests: 0,
      maxDeepLinkMatchesDayRequests: 0,
      maxDeepLinkGameDetailRequests: 0,
      maxDeepLinkVoteStatusRequests: 0,
      maxPreDetailDeferredRequests: 0,
      failedEntryCount: 0,
    }],
  });

  assert.equal(result.status, 'passed');
  assert.deepEqual(result.failures, []);
});

test('evaluatePredictionScenarioSummary fails live policy contract regressions', () => {
  const result = evaluatePredictionScenarioSummary({
    budgets,
    scenarioSummary: [
      {
        id: 'past-completed',
        requiresDetail: true,
        livePolicy: 'none-after-idle',
        previewP95Ms: 800,
        detailP95Ms: 1000,
        reentryP95Ms: 100,
        missingVoteButtonCount: 0,
        maxDeepLinkBootstrapRequests: 1,
        maxDeepLinkMatchesDayRequests: 0,
        maxDeepLinkGameDetailRequests: 0,
        maxDeepLinkVoteStatusRequests: 0,
        maxPreDetailDeferredRequests: 0,
        maxPostIdleLiveRequests: 1,
        maxPostIdleLiveRelayRequests: 0,
        failedEntryCount: 0,
      },
      {
        id: 'today-live',
        requiresDetail: true,
        livePolicy: 'requires-after-idle',
        previewP95Ms: 800,
        detailP95Ms: 1000,
        reentryP95Ms: 100,
        missingVoteButtonCount: 0,
        maxDeepLinkBootstrapRequests: 1,
        maxDeepLinkMatchesDayRequests: 0,
        maxDeepLinkGameDetailRequests: 0,
        maxDeepLinkVoteStatusRequests: 0,
        maxPreDetailDeferredRequests: 0,
        minPostIdleLiveRequests: 0,
        minPostIdleLiveRelayRequests: 1,
        failedEntryCount: 0,
      },
      {
        id: 'manual-data-required',
        requiresDetail: true,
        livePolicy: 'manual-suppressed',
        previewP95Ms: 800,
        detailP95Ms: 1000,
        reentryP95Ms: 100,
        missingVoteButtonCount: 0,
        maxDeepLinkBootstrapRequests: 1,
        maxDeepLinkMatchesDayRequests: 0,
        maxDeepLinkGameDetailRequests: 0,
        maxDeepLinkVoteStatusRequests: 0,
        maxPreDetailDeferredRequests: 0,
        minPostIdleLiveRequests: 1,
        minPostIdleLiveRelayRequests: 1,
        maxPostIdleLiveRequests: 2,
        maxPostIdleLiveRelayRequests: 1,
        maxAfterFocusLiveRequests: 1,
        maxAfterFocusLiveRelayRequests: 0,
        failedEntryCount: 0,
      },
    ],
  });

  assert.equal(result.status, 'failed');
  assert.ok(result.failures.includes('SCENARIO_UNEXPECTED_LIVE_REQUEST_AFTER_IDLE:past-completed'));
  assert.ok(result.failures.includes('SCENARIO_MISSING_LIVE_REQUEST_AFTER_IDLE:today-live'));
  assert.ok(result.failures.includes('SCENARIO_MANUAL_DATA_REQUIRED_REPEATED_POLLING:manual-data-required'));
  assert.ok(result.failures.includes('SCENARIO_MANUAL_DATA_REQUIRED_FOCUS_RETRY:manual-data-required'));
});

test('evaluatePredictionScenarioSummary fails ranking deferred contract regressions', () => {
  const result = evaluatePredictionScenarioSummary({
    budgets,
    scenarioSummary: [{
      id: 'ranking-tab',
      requiresDetail: false,
      enforcePreviewBudget: false,
      failedEntryCount: 0,
      maxRankingRequestsBeforeTabEntry: 1,
      minRankingChunkLoadsAfterTabEntry: 0,
    }],
  });

  assert.equal(result.status, 'failed');
  assert.ok(result.failures.includes('SCENARIO_RANKING_REQUEST_BEFORE_TAB_ENTRY:ranking-tab'));
  assert.ok(result.failures.includes('SCENARIO_RANKING_CHUNK_NOT_LOADED:ranking-tab'));
});

test('groupPredictionScenarioFailures groups scenario-specific failures', () => {
  assert.deepEqual(
    groupPredictionScenarioFailures([
      'SCENARIO_DETAIL_P95_BUDGET_EXCEEDED:scheduled-game',
      'API_WARM_P95_BUDGET_EXCEEDED:bootstrap',
      'SCENARIO_DEFERRED_REQUEST_BEFORE_DETAIL_RENDER:scheduled-game',
      'SCENARIO_UNEXPECTED_LIVE_REQUEST_AFTER_IDLE:past-completed',
    ]),
    [
      {
        scenarioId: 'scheduled-game',
        failures: [
          'SCENARIO_DETAIL_P95_BUDGET_EXCEEDED',
          'SCENARIO_DEFERRED_REQUEST_BEFORE_DETAIL_RENDER',
        ],
      },
      {
        scenarioId: 'past-completed',
        failures: ['SCENARIO_UNEXPECTED_LIVE_REQUEST_AFTER_IDLE'],
      },
    ],
  );
});

test('extractPredictionFailedScenarioIds returns unique scenario ids', () => {
  assert.deepEqual(
    extractPredictionFailedScenarioIds([
      { scenarioId: 'scheduled-game', failures: ['SCENARIO_DETAIL_P95_BUDGET_EXCEEDED'] },
      { scenarioId: 'scheduled-game', failures: ['SCENARIO_DEFERRED_REQUEST_BEFORE_DETAIL_RENDER'] },
      { scenarioId: 'past-completed', failures: ['SCENARIO_UNEXPECTED_LIVE_REQUEST_AFTER_IDLE'] },
    ]),
    ['scheduled-game', 'past-completed'],
  );
});

test('evaluatePredictionRuntimeBudget reports warn-only runtime status', () => {
  assert.deepEqual(
    evaluatePredictionRuntimeBudget({
      totalDurationMs: 301000,
      runtimeBudgetMs: 300000,
    }),
    {
      totalDurationMs: 301000,
      runtimeBudgetMs: 300000,
      runtimeBudgetStatus: 'warning',
    },
  );
  assert.deepEqual(
    evaluatePredictionRuntimeBudget({
      totalDurationMs: 250000,
      runtimeBudgetMs: 300000,
    }),
    {
      totalDurationMs: 250000,
      runtimeBudgetMs: 300000,
      runtimeBudgetStatus: 'ok',
    },
  );
});

test('evaluatePredictionPerformanceReport includes grouped scenario failures', () => {
  const result = evaluatePredictionPerformanceReport({
    mode: 'mock',
    budgets,
    browserSummary: {},
    scenarioSummary: [{
      id: 'scheduled-game',
      requiresDetail: true,
      previewP95Ms: 800,
      detailP95Ms: 1800,
      reentryP95Ms: 100,
      missingVoteButtonCount: 0,
      maxDeepLinkBootstrapRequests: 1,
      maxDeepLinkMatchesDayRequests: 0,
      maxDeepLinkGameDetailRequests: 0,
      maxDeepLinkVoteStatusRequests: 0,
      maxPreDetailDeferredRequests: 1,
      failedEntryCount: 0,
    }],
    apiSummary: { endpoints: {} },
  });

  assert.equal(result.status, 'failed');
  assert.deepEqual(result.scenarioFailures, [{
    scenarioId: 'scheduled-game',
    failures: [
      'SCENARIO_DETAIL_P95_BUDGET_EXCEEDED',
      'SCENARIO_DEFERRED_REQUEST_BEFORE_DETAIL_RENDER',
    ],
  }]);
});

test('runtime budget warning does not change performance report status', () => {
  const runtime = evaluatePredictionRuntimeBudget({
    totalDurationMs: 301000,
    runtimeBudgetMs: 300000,
  });
  const result = evaluatePredictionPerformanceReport({
    mode: 'mock',
    budgets,
    browserSummary: {},
    scenarioSummary: [{
      id: 'scheduled-game',
      requiresDetail: true,
      previewP95Ms: 800,
      detailP95Ms: 1100,
      reentryP95Ms: 100,
      missingVoteButtonCount: 0,
      maxDeepLinkBootstrapRequests: 1,
      maxDeepLinkMatchesDayRequests: 0,
      maxDeepLinkGameDetailRequests: 0,
      maxDeepLinkVoteStatusRequests: 0,
      maxPreDetailDeferredRequests: 0,
      failedEntryCount: 0,
    }],
    apiSummary: { endpoints: {} },
  });

  assert.equal(runtime.runtimeBudgetStatus, 'warning');
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.failures, []);
});

test('buildPredictionPerformanceMarkdown renders real API baseline metadata and warm budgets', () => {
  const markdown = buildPredictionPerformanceMarkdown({
    generatedAt: '2026-06-08T00:00:00.000Z',
    mode: 'real',
    selectedDate: '2026-06-07',
    selectedGameId: '20260607HHLT0',
    status: 'passed',
    baseUrl: 'http://127.0.0.1:5177',
    serverMode: 'started:5177',
    iterations: 5,
    totalDurationMs: 3200,
    runtimeBudgetMs: 300000,
    runtimeBudgetStatus: 'ok',
    apiBaseUrl: 'http://localhost:8080/api/',
    backendReachable: true,
    strictCold: false,
    scenarioTier: 'core',
    scenarioSelectionSource: 'tier',
    selectedScenarioIds: ['scheduled-game', 'rest-day'],
    skippedScenarioIds: ['today-live'],
    budgets,
    browser: {
      summary: {
        previewP95Ms: 800,
        detailP95Ms: 1100,
        bootstrapReadyP95Ms: 320,
        detailRootVisibleP95Ms: 1420,
        voteButtonP95Ms: 180,
        reentryP95Ms: 120,
        maxDeepLinkBootstrapRequests: 1,
        maxDeepLinkMatchesDayRequests: 0,
        maxDeepLinkGameDetailRequests: 0,
        maxDeepLinkVoteStatusRequests: 0,
        maxPreDetailDeferredRequests: 0,
      },
    },
    api: {
      endpoints: {
        bootstrap: {
          coldStatus: 200,
          coldMs: 320,
          warm: { p50: 90, p95: 140 },
          warmBudgetMs: 250,
          failedRequestCount: 0,
        },
      },
    },
    guidance: [
      'Cold API timings are report-only by default; set PREDICTION_PERF_STRICT_COLD=1 to fail on cold budget.',
    ],
    failures: [],
  });

  assert.match(markdown, /API base URL: http:\/\/localhost:8080\/api\//);
  assert.match(markdown, /Backend reachable: yes/);
  assert.match(markdown, /Strict cold budget: disabled/);
  assert.match(markdown, /Cold API timing policy: report-only/);
  assert.match(markdown, /\| Deep-link bootstrap ready \| 320ms \| n\/a \|/);
  assert.match(markdown, /\| Detail root wall-clock \| 1420ms \| n\/a \|/);
  assert.match(markdown, /\| Vote button after bootstrap \| 180ms \| n\/a \|/);
  assert.match(markdown, /\| Endpoint \| HTTP \| Cold \| Warm p50 \| Warm p95 \| Warm budget \| Failures \|/);
  assert.match(markdown, /\| bootstrap \| 200 \| 320ms \| 90ms \| 140ms \| 250ms \| 0 \|/);
});

test('buildPredictionPerformanceMarkdown renders scenario summary matrix', () => {
  const markdown = buildPredictionPerformanceMarkdown({
    generatedAt: '2026-06-08T00:00:00.000Z',
    mode: 'mock',
    selectedDate: '2026-06-07',
    selectedGameId: '20260607HHLT0',
    status: 'passed',
    baseUrl: 'http://127.0.0.1:5177',
    serverMode: 'started:5177',
    iterations: 5,
    totalDurationMs: 3200,
    runtimeBudgetMs: 300000,
    runtimeBudgetStatus: 'ok',
    apiBaseUrl: 'http://localhost:8080/api/',
    backendReachable: null,
    strictCold: false,
    scenarioTier: 'core',
    scenarioSelectionSource: 'tier',
    selectedScenarioIds: ['scheduled-game', 'rest-day'],
    skippedScenarioIds: ['today-live'],
    budgets,
    scenarios: [
      { id: 'scheduled-game' },
      { id: 'rest-day' },
    ],
    scenarioSummary: [
      {
        id: 'scheduled-game',
        durationMs: 3100,
        entryCount: 6,
        measuredEntryCount: 5,
        prewarmEntryCount: 1,
        previewP95Ms: 800,
        detailP95Ms: 1100,
        bootstrapReadyP95Ms: 320,
        detailRootVisibleP95Ms: 1420,
        voteButtonP95Ms: 180,
        reentryP95Ms: 120,
        maxDeepLinkBootstrapRequests: 1,
        maxPreDetailDeferredRequests: 0,
        maxPostIdleLiveRequests: 0,
        maxPostIdleLiveRelayRequests: 0,
        contractStatus: 'passed',
      },
      {
        id: 'rest-day',
        durationMs: 900,
        entryCount: 6,
        measuredEntryCount: 5,
        prewarmEntryCount: 1,
        previewP95Ms: 650,
        detailP95Ms: null,
        reentryP95Ms: null,
        maxDeepLinkBootstrapRequests: 0,
        maxPreDetailDeferredRequests: 0,
        maxPostIdleLiveRequests: 0,
        maxPostIdleLiveRelayRequests: 0,
        contractStatus: 'passed',
      },
    ],
    browser: {
      summary: {
        previewP95Ms: 800,
        detailP95Ms: 1100,
        reentryP95Ms: 120,
        maxDeepLinkBootstrapRequests: 1,
        maxDeepLinkMatchesDayRequests: 0,
        maxDeepLinkGameDetailRequests: 0,
        maxDeepLinkVoteStatusRequests: 0,
        maxPreDetailDeferredRequests: 0,
      },
    },
    api: { endpoints: {} },
    guidance: [],
    failures: [],
  });

  assert.match(markdown, /Scenarios: scheduled-game, rest-day/);
  assert.match(markdown, /Scenario tier: core \(tier\)/);
  assert.match(markdown, /Selected scenarios: scheduled-game, rest-day/);
  assert.match(markdown, /Skipped scenarios: today-live/);
  assert.match(markdown, /## Scenario Summary/);
  assert.match(markdown, /Runtime: 3200ms \/ 300000ms \(ok, warn-only\)/);
  assert.match(markdown, /Runtime status: 3200ms \/ 300000ms \(ok, warn-only\)/);
  assert.match(markdown, /\| Scenario \| Duration \| Runs \| Preview p95 \| Bootstrap p95 \| Detail root p95 \| Detail render p95 \| Vote p95 \| Re-entry p95 \| Bootstrap \| Deferred before detail \| Ranking pre-tab \| Ranking chunks \| Ranking tab p95 \| Idle live \| Idle relay \| Contract \|/);
  assert.match(markdown, /\| scheduled-game \| 3100ms \| 5 measured \+ 1 prewarm \| 800ms \| 320ms \| 1420ms \| 1100ms \| 180ms \| 120ms \| 1 \| 0 \| n\/a \| n\/a \| n\/a \| 0 \| 0 \| passed \|/);
  assert.match(markdown, /\| rest-day \| 900ms \| 5 measured \+ 1 prewarm \| 650ms \| n\/a \| n\/a \| n\/a \| n\/a \| n\/a \| 0 \| 0 \| n\/a \| n\/a \| n\/a \| 0 \| 0 \| passed \|/);
});

test('buildPredictionPerformanceMarkdown renders scenario failures after flat failure list', () => {
  const markdown = buildPredictionPerformanceMarkdown({
    generatedAt: '2026-06-08T00:00:00.000Z',
    mode: 'mock',
    selectedDate: '2026-06-07',
    selectedGameId: '20260607HHLT0',
    status: 'failed',
    baseUrl: 'http://127.0.0.1:5177',
    serverMode: 'started:5177',
    iterations: 3,
    totalDurationMs: 301000,
    runtimeBudgetMs: 300000,
    runtimeBudgetStatus: 'warning',
    apiBaseUrl: 'http://localhost:8080/api/',
    backendReachable: null,
    strictCold: false,
    budgets,
    scenarios: [{ id: 'scheduled-game' }],
    scenarioSummary: [],
    browser: { summary: {} },
    api: { endpoints: {} },
    guidance: [],
    failures: [
      'SCENARIO_DETAIL_P95_BUDGET_EXCEEDED:scheduled-game',
      'SCENARIO_DEFERRED_REQUEST_BEFORE_DETAIL_RENDER:scheduled-game',
    ],
    scenarioFailures: [{
      scenarioId: 'scheduled-game',
      failures: [
        'SCENARIO_DETAIL_P95_BUDGET_EXCEEDED',
        'SCENARIO_DEFERRED_REQUEST_BEFORE_DETAIL_RENDER',
      ],
    }],
    failureArtifacts: {
      enabled: true,
      items: [{
        scenarioId: 'scheduled-game',
        status: 'captured',
        traceArtifactPath: 'output/playwright/prediction-performance/failure-artifacts/scheduled-game/trace.zip',
        iterationArtifactPath: 'output/playwright/prediction-performance/failure-artifacts/scheduled-game/iteration.json',
        screenshotArtifactPath: 'output/playwright/prediction-performance/failure-artifacts/scheduled-game/screenshot.png',
      }],
    },
  });

  assert.match(markdown, /Runtime: 301000ms \/ 300000ms \(warning, warn-only\)/);
  assert.match(markdown, /## Failures/);
  assert.match(markdown, /SCENARIO_DETAIL_P95_BUDGET_EXCEEDED:scheduled-game/);
  assert.match(markdown, /\*\*Scenario Failures\*\*/);
  assert.match(markdown, /scheduled-game: SCENARIO_DETAIL_P95_BUDGET_EXCEEDED, SCENARIO_DEFERRED_REQUEST_BEFORE_DETAIL_RENDER/);
  assert.match(markdown, /\*\*Failure Artifacts\*\*/);
  assert.match(markdown, /scheduled-game: trace=output\/playwright\/prediction-performance\/failure-artifacts\/scheduled-game\/trace\.zip/);
});

test('buildPredictionPerformanceJsonFallbackSummary prioritizes scenario summary', () => {
  const summary = buildPredictionPerformanceJsonFallbackSummary({
    status: 'failed',
    mode: 'mock',
    selectedDate: '2026-06-07',
    selectedGameId: '20260607HHLT0',
    apiBaseUrl: 'http://localhost:8080/api/',
    backendReachable: null,
    strictCold: false,
    scenarioTier: 'custom',
    scenarioSelectionSource: 'env-scenarios',
    selectedScenarioIds: ['scheduled-game'],
    skippedScenarioIds: ['ranking-tab', 'rest-day', 'past-completed', 'today-live', 'manual-data-required'],
    totalDurationMs: 301000,
    runtimeBudgetMs: 300000,
    runtimeBudgetStatus: 'warning',
    budgets,
    scenarioSummary: [{
      id: 'scheduled-game',
      durationMs: 1200,
      entryCount: 4,
      measuredEntryCount: 3,
      prewarmEntryCount: 1,
      previewP95Ms: 800,
      bootstrapReadyP95Ms: 320,
      detailRootVisibleP95Ms: 1920,
      detailP95Ms: 1600,
      voteButtonP95Ms: 410,
      reentryP95Ms: 150,
      maxDeepLinkBootstrapRequests: 1,
      maxPreDetailDeferredRequests: 0,
      contractStatus: 'failed',
    }],
    browser: {
      summary: {
        previewP95Ms: 900,
        detailP95Ms: 1700,
        reentryP95Ms: 180,
      },
    },
    api: { endpoints: {} },
    failures: ['SCENARIO_DETAIL_P95_BUDGET_EXCEEDED:scheduled-game'],
    scenarioFailures: [{
      scenarioId: 'scheduled-game',
      failures: ['SCENARIO_DETAIL_P95_BUDGET_EXCEEDED'],
    }],
    failureArtifacts: {
      enabled: true,
      items: [{
        scenarioId: 'scheduled-game',
        status: 'captured',
        traceArtifactPath: 'output/playwright/prediction-performance/failure-artifacts/scheduled-game/trace.zip',
        iterationArtifactPath: 'output/playwright/prediction-performance/failure-artifacts/scheduled-game/iteration.json',
      }],
    },
  });

  assert.match(summary, /- Runtime: 301000ms \/ 300000ms \(warning, warn-only\)/);
  assert.match(summary, /- Scenario tier: custom \(env-scenarios\)/);
  assert.match(summary, /- Selected scenarios: scheduled-game/);
  assert.match(summary, /- Skipped scenarios: ranking-tab, rest-day, past-completed, today-live, manual-data-required/);
  assert.match(summary, /\*\*Scenario summary\*\*/);
  assert.match(summary, /\| scheduled-game \| 1200ms \| 3 measured \+ 1 prewarm \| 800ms \| 320ms \| 1920ms \| 1600ms \| 410ms \| 150ms \| 1 \| 0 \| n\/a \| n\/a \| n\/a \| failed \|/);
  assert.doesNotMatch(summary, /- Preview p95: 900ms/);
  assert.match(summary, /\*\*Scenario failures\*\*/);
  assert.match(summary, /scheduled-game: SCENARIO_DETAIL_P95_BUDGET_EXCEEDED/);
  assert.match(summary, /\*\*Failure artifacts\*\*/);
  assert.match(summary, /scheduled-game: trace=output\/playwright\/prediction-performance\/failure-artifacts\/scheduled-game\/trace\.zip/);
});

test('buildPredictionPerformanceMarkdown renders needs-backend guidance', () => {
  const markdown = buildPredictionPerformanceMarkdown({
    generatedAt: '2026-06-08T00:00:00.000Z',
    mode: 'real',
    selectedDate: '2026-06-07',
    selectedGameId: '20260607HHLT0',
    status: 'needs-backend',
    baseUrl: null,
    serverMode: 'not-started',
    iterations: 5,
    apiBaseUrl: 'http://localhost:8080/api/',
    backendReachable: false,
    strictCold: false,
    budgets,
    browser: { summary: {}, entries: [] },
    api: {
      endpoints: {},
      attemptedEndpoints: [
        {
          key: predictionApiEndpointKeys.MATCHES_DAY,
          url: 'http://localhost:8080/api/matches/day?date=2026-06-07',
        },
      ],
    },
    guidance: [
      'Backend was not reachable at http://localhost:8080/api/matches/day?date=2026-06-07.',
      'Start a backend locally, set PREDICTION_PERF_API_BASE_URL to a reachable /api URL, or use workflow_dispatch apiBaseUrl.',
    ],
    failures: ['BACKEND_UNREACHABLE'],
  });

  assert.match(markdown, /Backend reachable: no/);
  assert.match(markdown, /## Guidance/);
  assert.match(markdown, /Backend was not reachable/);
  assert.match(markdown, /BACKEND_UNREACHABLE/);
});

test('buildPredictionPerformanceMarkdown renders manual baseball data requirements', () => {
  const markdown = buildPredictionPerformanceMarkdown({
    generatedAt: '2026-06-08T00:00:00.000Z',
    mode: 'real',
    selectedDate: '2026-06-07',
    selectedGameId: '20260607HHLT0',
    status: 'manual-data-required',
    baseUrl: null,
    serverMode: 'not-started',
    iterations: 1,
    totalDurationMs: 1200,
    runtimeBudgetMs: 300000,
    runtimeBudgetStatus: 'ok',
    apiBaseUrl: 'http://localhost:8080/api/',
    backendReachable: true,
    strictCold: false,
    budgets,
    browser: { summary: {}, entries: [] },
    api: {
      endpoints: {
        matchesDay: {
          url: 'http://localhost:8080/api/matches/day?date=2026-06-07',
          coldStatus: 409,
          coldMs: 42,
          warm: { p50: 10, p95: 12 },
          warmBudgetMs: 200,
          failedRequestCount: 0,
          manualDataRequired: true,
          manualDataContract: {
            code: 'MANUAL_BASEBALL_DATA_REQUIRED',
            scope: 'prediction.matches_by_date',
            missingItems: [{
              key: 'season_league_context',
              label: 'Season league context',
              reason: 'season row is missing',
            }],
            operatorMessage: 'Provide season league context.',
          },
        },
      },
    },
    guidance: [
      'Real mode reached the backend, but baseball data is not ready.',
    ],
    failures: ['MANUAL_BASEBALL_DATA_REQUIRED:matchesDay'],
  });

  assert.match(markdown, /Status: manual-data-required/);
  assert.match(markdown, /## Manual Baseball Data Required/);
  assert.match(markdown, /\| matchesDay \| prediction\.matches_by_date \| season_league_context: Season league context \(season row is missing\) \| Provide season league context\. \|/);
  assert.match(markdown, /MANUAL_BASEBALL_DATA_REQUIRED:matchesDay/);
});
