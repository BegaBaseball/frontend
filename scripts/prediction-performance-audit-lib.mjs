export const predictionPerformanceStatusValues = new Set([
  'passed',
  'failed',
  'needs-backend',
  'needs-date',
  'manual-data-required',
]);

export const manualBaseballDataRequiredCode = 'MANUAL_BASEBALL_DATA_REQUIRED';

export const predictionApiEndpointKeys = {
  MATCHES_DAY: 'matchesDay',
  BOOTSTRAP: 'bootstrap',
  RANKING_SNAPSHOT: 'rankingSnapshot',
  RANKING_PREDICTION: 'rankingPrediction',
  PREDICTION_STATS: 'predictionStats',
  GAME_DETAIL: 'gameDetail',
  VOTE_STATUS: 'voteStatus',
  LIVE: 'live',
  LIVE_RELAY: 'liveRelay',
  OTHER: 'other',
};

export const predictionPerformanceDefaultScenarioIds = [
  'scheduled-game',
  'ranking-tab',
  'rest-day',
  'past-completed',
  'today-live',
  'manual-data-required',
];

export const predictionPerformanceScenarioTiers = {
  core: [
    'scheduled-game',
    'rest-day',
    'past-completed',
    'manual-data-required',
  ],
  extended: [
    'today-live',
    'ranking-tab',
  ],
  all: predictionPerformanceDefaultScenarioIds,
};

export const roundMetric = (value) => (
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10) / 10 : null
);

export const parsePredictionPerformanceScenarioIds = (
  rawValue,
  availableIds = predictionPerformanceDefaultScenarioIds,
) => {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    return [...availableIds];
  }

  const available = new Set(availableIds);
  const selected = [];
  rawValue.split(',').forEach((item) => {
    const scenarioId = item.trim();
    if (!scenarioId) {
      return;
    }
    if (!available.has(scenarioId)) {
      throw new Error(`Unknown prediction performance scenario: ${scenarioId}`);
    }
    if (!selected.includes(scenarioId)) {
      selected.push(scenarioId);
    }
  });

  return selected.length > 0 ? selected : [...availableIds];
};

export const parsePredictionPerformanceScenarioSelection = ({
  rawScenarioIds,
  rawTier,
  availableIds = predictionPerformanceDefaultScenarioIds,
} = {}) => {
  const available = [...availableIds];
  if (typeof rawScenarioIds === 'string' && rawScenarioIds.trim() !== '') {
    const selectedScenarioIds = parsePredictionPerformanceScenarioIds(rawScenarioIds, available);
    return {
      scenarioTier: 'custom',
      scenarioSelectionSource: 'env-scenarios',
      selectedScenarioIds,
      skippedScenarioIds: available.filter((scenarioId) => !selectedScenarioIds.includes(scenarioId)),
    };
  }

  const scenarioTier = typeof rawTier === 'string' && rawTier.trim() !== ''
    ? rawTier.trim()
    : 'all';
  const tierScenarioIds = predictionPerformanceScenarioTiers[scenarioTier];
  if (!Array.isArray(tierScenarioIds)) {
    throw new Error(`Unknown prediction performance scenario tier: ${scenarioTier}`);
  }

  const selectedScenarioIds = tierScenarioIds.filter((scenarioId) => available.includes(scenarioId));
  return {
    scenarioTier,
    scenarioSelectionSource: 'tier',
    selectedScenarioIds,
    skippedScenarioIds: available.filter((scenarioId) => !selectedScenarioIds.includes(scenarioId)),
  };
};

export const percentile = (values, percentileValue) => {
  const sorted = values
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
    .sort((left, right) => left - right);
  if (sorted.length === 0) {
    return null;
  }
  const index = Math.max(0, Math.ceil(sorted.length * percentileValue) - 1);
  return sorted[index];
};

export const buildTimingSummary = (values) => {
  const sorted = values
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
    .sort((left, right) => left - right);
  if (sorted.length === 0) {
    return {
      count: 0,
      min: null,
      p50: null,
      p95: null,
      max: null,
    };
  }

  return {
    count: sorted.length,
    min: roundMetric(sorted[0]),
    p50: roundMetric(percentile(sorted, 0.5)),
    p95: roundMetric(percentile(sorted, 0.95)),
    max: roundMetric(sorted[sorted.length - 1]),
  };
};

export const extractPredictionManualDataRequirements = (apiSummary = {}) => {
  if (Array.isArray(apiSummary.manualDataRequirements) && apiSummary.manualDataRequirements.length > 0) {
    return apiSummary.manualDataRequirements;
  }

  return Object.entries(apiSummary.endpoints ?? {}).flatMap(([endpointKey, endpoint]) => {
    const contract = endpoint?.manualDataContract ?? {};
    const hasManualContract = endpoint?.manualDataRequired === true
      || contract.code === manualBaseballDataRequiredCode;
    if (!hasManualContract) {
      return [];
    }

    return [{
      endpointKey,
      url: endpoint?.url ?? null,
      status: endpoint?.coldStatus ?? null,
      code: contract.code ?? manualBaseballDataRequiredCode,
      scope: contract.scope ?? null,
      missingItems: Array.isArray(contract.missingItems) ? contract.missingItems : [],
      operatorMessage: contract.operatorMessage ?? contract.message ?? null,
    }];
  });
};

export const classifyPredictionApiRequest = (rawUrl) => {
  let url;
  try {
    url = new URL(rawUrl, 'http://localhost');
  } catch {
    return predictionApiEndpointKeys.OTHER;
  }

  const pathname = url.pathname;
  if (pathname === '/api/matches/day') {
    return predictionApiEndpointKeys.MATCHES_DAY;
  }
  if (pathname === '/api/matches/bounds' || pathname === '/api/matches/range' || pathname === '/api/matches/live') {
    return predictionApiEndpointKeys.OTHER;
  }
  if (pathname === '/api/predictions/bootstrap') {
    return predictionApiEndpointKeys.BOOTSTRAP;
  }
  if (pathname === '/api/kbo/rankings/snapshot') {
    return predictionApiEndpointKeys.RANKING_SNAPSHOT;
  }
  if (
    pathname === '/api/predictions/ranking'
    || pathname === '/api/predictions/ranking/init'
    || pathname === '/api/predictions/ranking/current-season'
  ) {
    return predictionApiEndpointKeys.RANKING_PREDICTION;
  }
  if (pathname === '/api/prediction/stats/me') {
    return predictionApiEndpointKeys.PREDICTION_STATS;
  }
  if (/^\/api\/matches\/[^/]+\/live-relay$/.test(pathname)) {
    return predictionApiEndpointKeys.LIVE_RELAY;
  }
  if (/^\/api\/matches\/[^/]+\/live$/.test(pathname)) {
    return predictionApiEndpointKeys.LIVE;
  }
  if (/^\/api\/matches\/[^/]+$/.test(pathname)) {
    return predictionApiEndpointKeys.GAME_DETAIL;
  }
  if (/^\/api\/predictions\/status\/[^/]+$/.test(pathname)) {
    return predictionApiEndpointKeys.VOTE_STATUS;
  }

  return predictionApiEndpointKeys.OTHER;
};

const hasBudgetFailure = (value, budget) => (
  typeof value === 'number'
  && typeof budget === 'number'
  && Number.isFinite(value)
  && Number.isFinite(budget)
  && value > budget
);

const pushScenarioFailure = (failures, summary, reason) => {
  failures.push(`${reason}:${summary.id}`);
};

export const groupPredictionScenarioFailures = (failures = []) => {
  const groups = new Map();

  failures.forEach((failure) => {
    if (typeof failure !== 'string') {
      return;
    }

    const separatorIndex = failure.lastIndexOf(':');
    if (separatorIndex <= 0 || separatorIndex === failure.length - 1) {
      return;
    }

    const reason = failure.slice(0, separatorIndex);
    const scenarioId = failure.slice(separatorIndex + 1);
    if (!reason.startsWith('SCENARIO_')) {
      return;
    }

    if (!groups.has(scenarioId)) {
      groups.set(scenarioId, []);
    }
    groups.get(scenarioId).push(reason);
  });

  return Array.from(groups, ([scenarioId, scenarioFailures]) => ({
    scenarioId,
    failures: scenarioFailures,
  }));
};

export const extractPredictionFailedScenarioIds = (scenarioFailures = []) => {
  const scenarioIds = [];

  scenarioFailures.forEach((group) => {
    const scenarioId = typeof group === 'string' ? group : group?.scenarioId;
    if (typeof scenarioId === 'string' && scenarioId && !scenarioIds.includes(scenarioId)) {
      scenarioIds.push(scenarioId);
    }
  });

  return scenarioIds;
};

export const evaluatePredictionRuntimeBudget = ({
  totalDurationMs,
  runtimeBudgetMs,
} = {}) => ({
  totalDurationMs: roundMetric(totalDurationMs),
  runtimeBudgetMs,
  runtimeBudgetStatus: (
    typeof totalDurationMs === 'number'
    && typeof runtimeBudgetMs === 'number'
    && Number.isFinite(totalDurationMs)
    && Number.isFinite(runtimeBudgetMs)
    && totalDurationMs > runtimeBudgetMs
  ) ? 'warning' : 'ok',
});

export const evaluatePredictionScenarioSummary = ({
  scenarioSummary = [],
  budgets,
} = {}) => {
  const failures = [];

  scenarioSummary.forEach((summary) => {
    if ((summary.failedEntryCount ?? 0) > 0) {
      pushScenarioFailure(failures, summary, 'SCENARIO_BROWSER_ITERATION_FAILED');
    }
    if (summary.enforcePreviewBudget !== false && hasBudgetFailure(summary.previewP95Ms, budgets.previewP95Ms)) {
      pushScenarioFailure(failures, summary, 'SCENARIO_PREVIEW_P95_BUDGET_EXCEEDED');
    }

    if (summary.requiresDetail !== false) {
      if (summary.expectsVoteButton !== false && (summary.missingVoteButtonCount ?? 0) > 0) {
        pushScenarioFailure(failures, summary, 'SCENARIO_VOTE_BUTTON_NOT_VISIBLE');
      }
      if (summary.enforceDetailBudget !== false && hasBudgetFailure(summary.detailP95Ms, budgets.detailP95Ms)) {
        pushScenarioFailure(failures, summary, 'SCENARIO_DETAIL_P95_BUDGET_EXCEEDED');
      }
      if (summary.enforceReentryBudget !== false && hasBudgetFailure(summary.reentryP95Ms, budgets.reentryP95Ms)) {
        pushScenarioFailure(failures, summary, 'SCENARIO_REENTRY_P95_BUDGET_EXCEEDED');
      }
      if ((summary.maxDeepLinkBootstrapRequests ?? 0) !== 1) {
        pushScenarioFailure(failures, summary, 'SCENARIO_UNEXPECTED_DEEP_LINK_BOOTSTRAP_REQUEST_COUNT');
      }
      if ((summary.maxDeepLinkMatchesDayRequests ?? 0) !== 0) {
        pushScenarioFailure(failures, summary, 'SCENARIO_DEEP_LINK_MATCHES_DAY_DUPLICATE_REQUEST');
      }
      if ((summary.maxDeepLinkGameDetailRequests ?? 0) !== 0) {
        pushScenarioFailure(failures, summary, 'SCENARIO_DEEP_LINK_GAME_DETAIL_DUPLICATE_REQUEST');
      }
      if ((summary.maxDeepLinkVoteStatusRequests ?? 0) !== 0) {
        pushScenarioFailure(failures, summary, 'SCENARIO_DEEP_LINK_VOTE_STATUS_DUPLICATE_REQUEST');
      }
      if ((summary.maxPreDetailDeferredRequests ?? 0) !== 0) {
        pushScenarioFailure(failures, summary, 'SCENARIO_DEFERRED_REQUEST_BEFORE_DETAIL_RENDER');
      }
    }

    if (summary.livePolicy === 'none-after-idle') {
      if ((summary.maxPostIdleLiveRequests ?? 0) !== 0 || (summary.maxPostIdleLiveRelayRequests ?? 0) !== 0) {
        pushScenarioFailure(failures, summary, 'SCENARIO_UNEXPECTED_LIVE_REQUEST_AFTER_IDLE');
      }
    }

    if (summary.livePolicy === 'requires-after-idle') {
      if ((summary.minPostIdleLiveRequests ?? 0) < 1 || (summary.minPostIdleLiveRelayRequests ?? 0) < 1) {
        pushScenarioFailure(failures, summary, 'SCENARIO_MISSING_LIVE_REQUEST_AFTER_IDLE');
      }
    }

    if (summary.livePolicy === 'manual-suppressed') {
      if ((summary.minPostIdleLiveRequests ?? 0) < 1 || (summary.minPostIdleLiveRelayRequests ?? 0) < 1) {
        pushScenarioFailure(failures, summary, 'SCENARIO_MISSING_MANUAL_DATA_REQUIRED_PROBE');
      }
      if ((summary.maxPostIdleLiveRequests ?? 0) > 1 || (summary.maxPostIdleLiveRelayRequests ?? 0) > 1) {
        pushScenarioFailure(failures, summary, 'SCENARIO_MANUAL_DATA_REQUIRED_REPEATED_POLLING');
      }
      if ((summary.maxAfterFocusLiveRequests ?? 0) !== 0 || (summary.maxAfterFocusLiveRelayRequests ?? 0) !== 0) {
        pushScenarioFailure(failures, summary, 'SCENARIO_MANUAL_DATA_REQUIRED_FOCUS_RETRY');
      }
    }

    if (summary.id === 'ranking-tab') {
      if ((summary.maxRankingRequestsBeforeTabEntry ?? 0) > 0) {
        pushScenarioFailure(failures, summary, 'SCENARIO_RANKING_REQUEST_BEFORE_TAB_ENTRY');
      }
      if ((summary.minRankingChunkLoadsAfterTabEntry ?? 0) < 1) {
        pushScenarioFailure(failures, summary, 'SCENARIO_RANKING_CHUNK_NOT_LOADED');
      }
    }
  });

  return {
    status: failures.length > 0 ? 'failed' : 'passed',
    failures,
    scenarioFailures: groupPredictionScenarioFailures(failures),
  };
};

export const evaluatePredictionPerformanceReport = ({
  mode,
  browserSummary,
  scenarioSummary,
  apiSummary,
  budgets,
  strictCold = false,
  backendReachable = true,
  needsDate = false,
}) => {
  if (mode === 'real' && !backendReachable) {
    return {
      status: 'needs-backend',
      failures: ['BACKEND_UNREACHABLE'],
      scenarioFailures: [],
    };
  }
  if (needsDate) {
    return {
      status: 'needs-date',
      failures: ['NO_GAME_OR_DETAIL_FOR_SELECTED_DATE'],
      scenarioFailures: [],
    };
  }

  const manualDataRequirements = extractPredictionManualDataRequirements(apiSummary);
  if (mode === 'real' && manualDataRequirements.length > 0) {
    return {
      status: 'manual-data-required',
      failures: manualDataRequirements.map((requirement) => (
        `${manualBaseballDataRequiredCode}:${requirement.endpointKey}`
      )),
      scenarioFailures: [],
    };
  }

  const failures = [];
  if (mode === 'mock' && Array.isArray(scenarioSummary) && scenarioSummary.length > 0) {
    failures.push(...evaluatePredictionScenarioSummary({ scenarioSummary, budgets }).failures);
  } else {
    if ((browserSummary?.failedEntryCount ?? 0) > 0) {
      failures.push('BROWSER_ITERATION_FAILED');
    }
    if (mode === 'mock' && (browserSummary?.missingVoteButtonCount ?? 0) > 0) {
      failures.push('VOTE_BUTTON_NOT_VISIBLE');
    }
    if (hasBudgetFailure(browserSummary?.previewP95Ms, budgets.previewP95Ms)) {
      failures.push('PREVIEW_P95_BUDGET_EXCEEDED');
    }
    if (hasBudgetFailure(browserSummary?.detailP95Ms, budgets.detailP95Ms)) {
      failures.push('DETAIL_P95_BUDGET_EXCEEDED');
    }
    if (hasBudgetFailure(browserSummary?.reentryP95Ms, budgets.reentryP95Ms)) {
      failures.push('REENTRY_P95_BUDGET_EXCEEDED');
    }
    if ((browserSummary?.maxDeepLinkBootstrapRequests ?? 0) !== 1) {
      failures.push('UNEXPECTED_DEEP_LINK_BOOTSTRAP_REQUEST_COUNT');
    }
    if ((browserSummary?.maxDeepLinkMatchesDayRequests ?? 0) !== 0) {
      failures.push('DEEP_LINK_MATCHES_DAY_DUPLICATE_REQUEST');
    }
    if ((browserSummary?.maxDeepLinkGameDetailRequests ?? 0) !== 0) {
      failures.push('DEEP_LINK_GAME_DETAIL_DUPLICATE_REQUEST');
    }
    if ((browserSummary?.maxDeepLinkVoteStatusRequests ?? 0) !== 0) {
      failures.push('DEEP_LINK_VOTE_STATUS_DUPLICATE_REQUEST');
    }
    if ((browserSummary?.maxPreDetailDeferredRequests ?? 0) !== 0) {
      failures.push('DEFERRED_REQUEST_BEFORE_DETAIL_RENDER');
    }
  }

  Object.entries(apiSummary?.endpoints ?? {}).forEach(([endpointKey, endpoint]) => {
    if (endpoint?.warm?.p95 !== null && hasBudgetFailure(endpoint.warm.p95, budgets.apiWarmP95Ms)) {
      failures.push(`API_WARM_P95_BUDGET_EXCEEDED:${endpointKey}`);
    }
    if (
      strictCold
      && endpoint?.coldMs !== null
      && hasBudgetFailure(endpoint.coldMs, endpoint.coldBudgetMs ?? budgets.apiColdP95Ms)
    ) {
      failures.push(`API_COLD_BUDGET_EXCEEDED:${endpointKey}`);
    }
    if (endpoint?.failedRequestCount > 0) {
      failures.push(`API_REQUEST_FAILED:${endpointKey}`);
    }
  });

  return {
    status: failures.length > 0 ? 'failed' : 'passed',
    failures,
    scenarioFailures: groupPredictionScenarioFailures(failures),
  };
};

const formatMetric = (value) => (
  typeof value === 'number' && Number.isFinite(value) ? `${value}ms` : 'n/a'
);

const formatStatus = (value) => (
  typeof value === 'number' && Number.isFinite(value) ? String(value) : 'n/a'
);

const formatBoolean = (value) => {
  if (value === true) {
    return 'yes';
  }
  if (value === false) {
    return 'no';
  }
  return 'n/a';
};

const formatRuns = (summary) => {
  const measured = typeof summary?.measuredEntryCount === 'number' ? summary.measuredEntryCount : null;
  const prewarm = typeof summary?.prewarmEntryCount === 'number' ? summary.prewarmEntryCount : null;
  if (measured !== null || prewarm !== null) {
    return `${measured ?? 0} measured + ${prewarm ?? 0} prewarm`;
  }
  return typeof summary?.entryCount === 'number' ? String(summary.entryCount) : 'n/a';
};

const formatRuntimeStatus = (report) => {
  if (typeof report.totalDurationMs !== 'number') {
    return 'n/a';
  }
  return `${formatMetric(report.totalDurationMs)} / ${formatMetric(report.runtimeBudgetMs)} (${report.runtimeBudgetStatus ?? 'n/a'}, warn-only)`;
};

const formatScenarioList = (scenarioIds) => (
  Array.isArray(scenarioIds) && scenarioIds.length > 0 ? scenarioIds.join(', ') : 'none'
);

const formatMarkdownTableCell = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'n/a';
  }
  return String(value)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
};

const formatManualDataMissingItems = (missingItems) => {
  if (!Array.isArray(missingItems) || missingItems.length === 0) {
    return 'n/a';
  }

  return missingItems.map((item) => {
    const key = item?.key ?? 'unknown';
    const label = item?.label ? `: ${item.label}` : '';
    const reason = item?.reason ? ` (${item.reason})` : '';
    return `${key}${label}${reason}`;
  }).join('<br>');
};

const resolveFailureArtifactItems = (report) => {
  if (Array.isArray(report.failureArtifacts?.items)) {
    return report.failureArtifacts.items;
  }
  if (Array.isArray(report.failureArtifacts)) {
    return report.failureArtifacts;
  }
  return [];
};

const formatArtifactPath = (value) => (
  typeof value === 'string' && value ? value : 'n/a'
);

export const buildPredictionPerformanceJsonFallbackSummary = (report) => {
  const browser = report.browser?.summary || {};
  const scenarioSummary = Array.isArray(report.scenarioSummary) ? report.scenarioSummary : [];
  const failureArtifactItems = resolveFailureArtifactItems(report);
  const manualDataRequirements = extractPredictionManualDataRequirements(report.api);
  const lines = [
    `- Status: ${report.status || 'unknown'}`,
    `- Mode: ${report.mode || 'unknown'}`,
    `- Date: ${report.selectedDate || '-'}`,
    `- Game ID: ${report.selectedGameId || '-'}`,
    `- API base URL: ${report.apiBaseUrl || 'n/a'}`,
    `- Backend reachable: ${report.backendReachable === true ? 'yes' : report.backendReachable === false ? 'no' : 'n/a'}`,
    `- Strict cold budget: ${report.strictCold ? 'enabled' : 'disabled'}`,
    `- Runtime: ${formatRuntimeStatus(report)}`,
    `- Scenario tier: ${report.scenarioTier ?? 'n/a'} (${report.scenarioSelectionSource ?? 'n/a'})`,
    `- Selected scenarios: ${formatScenarioList(report.selectedScenarioIds)}`,
    `- Skipped scenarios: ${formatScenarioList(report.skippedScenarioIds)}`,
  ];

  if (scenarioSummary.length > 0) {
    lines.push(
      '',
      '**Scenario summary**',
      '| Scenario | Duration | Runs | Preview p95 | Bootstrap p95 | Detail root p95 | Detail render p95 | Vote p95 | Re-entry p95 | Bootstrap | Deferred before detail | Ranking pre-tab | Ranking chunks | Ranking tab p95 | Contract |',
      '| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
      ...scenarioSummary.map((summary) => (
        `| ${summary.id} | ${formatMetric(summary.durationMs)} | ${formatRuns(summary)} | ${formatMetric(summary.previewP95Ms)} | ${formatMetric(summary.bootstrapReadyP95Ms)} | ${formatMetric(summary.detailRootVisibleP95Ms)} | ${formatMetric(summary.detailP95Ms)} | ${formatMetric(summary.voteButtonP95Ms)} | ${formatMetric(summary.reentryP95Ms)} | ${summary.maxDeepLinkBootstrapRequests ?? 'n/a'} | ${summary.maxPreDetailDeferredRequests ?? 'n/a'} | ${summary.maxRankingRequestsBeforeTabEntry ?? 'n/a'} | ${summary.minRankingChunkLoadsAfterTabEntry ?? 'n/a'} | ${formatMetric(summary.rankingTabEntryP95Ms)} | ${summary.contractStatus ?? 'n/a'} |`
      )),
    );
  } else {
    lines.push(
      `- Preview p95: ${formatMetric(browser.previewP95Ms)}`,
      `- Detail p95: ${formatMetric(browser.detailP95Ms)}`,
      `- Same-game re-entry p95: ${formatMetric(browser.reentryP95Ms)}`,
      `- Deep-link bootstrap requests: ${browser.maxDeepLinkBootstrapRequests ?? 'n/a'}`,
      `- Deep-link matches/day duplicates: ${browser.maxDeepLinkMatchesDayRequests ?? 'n/a'}`,
      `- Deep-link game-detail duplicates: ${browser.maxDeepLinkGameDetailRequests ?? 'n/a'}`,
      `- Deep-link vote-status duplicates: ${browser.maxDeepLinkVoteStatusRequests ?? 'n/a'}`,
      `- Deferred requests before detail: ${browser.maxPreDetailDeferredRequests ?? 'n/a'}`,
    );
  }

  if (report.api?.endpoints && Object.keys(report.api.endpoints).length > 0) {
    lines.push('', '**API timings**');
    Object.entries(report.api.endpoints).forEach(([key, endpoint]) => {
      lines.push(`- ${key}: status=${endpoint.coldStatus ?? 'n/a'}, cold=${formatMetric(endpoint.coldMs)}, warm p95=${formatMetric(endpoint.warm?.p95)}, warm budget=${formatMetric(endpoint.warmBudgetMs ?? report.budgets?.apiWarmP95Ms)}, failures=${endpoint.failedRequestCount ?? 0}`);
    });
  }

  if (manualDataRequirements.length > 0) {
    lines.push('', '**Manual baseball data required**');
    manualDataRequirements.forEach((requirement) => {
      lines.push(`- ${requirement.endpointKey}: scope=${requirement.scope ?? 'n/a'}, missing=${formatManualDataMissingItems(requirement.missingItems)}, operatorMessage=${requirement.operatorMessage ?? 'n/a'}`);
    });
  }

  if (Array.isArray(report.guidance) && report.guidance.length > 0) {
    lines.push('', '**Guidance**');
    report.guidance.forEach((item) => {
      lines.push(`- ${item}`);
    });
  }

  if (Array.isArray(report.failures) && report.failures.length > 0) {
    lines.push('', '**Failures**');
    report.failures.forEach((failure) => {
      lines.push(`- ${failure}`);
    });
  }

  const scenarioFailures = Array.isArray(report.scenarioFailures) && report.scenarioFailures.length > 0
    ? report.scenarioFailures
    : groupPredictionScenarioFailures(report.failures);
  if (scenarioFailures.length > 0) {
    lines.push('', '**Scenario failures**');
    scenarioFailures.forEach((group) => {
      lines.push(`- ${group.scenarioId}: ${group.failures.join(', ')}`);
    });
  }

  if (failureArtifactItems.length > 0) {
    lines.push('', '**Failure artifacts**');
    failureArtifactItems.forEach((item) => {
      lines.push(`- ${item.scenarioId}: trace=${formatArtifactPath(item.traceArtifactPath ?? item.tracePath)}, iteration=${formatArtifactPath(item.iterationArtifactPath ?? item.iterationPath)}, screenshot=${formatArtifactPath(item.screenshotArtifactPath ?? item.screenshotPath)}, status=${item.status ?? 'n/a'}`);
    });
  }

  return lines.join('\n');
};

export const buildPredictionPerformanceMarkdown = (report) => {
  const scenarioFailures = Array.isArray(report.scenarioFailures) && report.scenarioFailures.length > 0
    ? report.scenarioFailures
    : groupPredictionScenarioFailures(report.failures);
  const failureArtifactItems = resolveFailureArtifactItems(report);
  const manualDataRequirements = extractPredictionManualDataRequirements(report.api);
  const lines = [
    '# Prediction Performance Audit',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Mode: ${report.mode}`,
    `- Date: ${report.selectedDate}`,
    `- Game ID: ${report.selectedGameId}`,
    `- Status: ${report.status}`,
    `- Base URL: ${report.baseUrl}`,
    `- Server mode: ${report.serverMode}`,
    `- Iterations: ${report.iterations}`,
    `- API base URL: ${report.apiBaseUrl ?? 'n/a'}`,
    `- Backend reachable: ${formatBoolean(report.backendReachable)}`,
    `- Strict cold budget: ${report.strictCold ? 'enabled' : 'disabled'}`,
    `- Cold API timing policy: ${report.strictCold ? 'budget enforced' : 'report-only'}`,
    `- Runtime: ${formatRuntimeStatus(report)}`,
    `- Scenario tier: ${report.scenarioTier ?? 'n/a'} (${report.scenarioSelectionSource ?? 'n/a'})`,
    `- Selected scenarios: ${formatScenarioList(report.selectedScenarioIds)}`,
    `- Skipped scenarios: ${formatScenarioList(report.skippedScenarioIds)}`,
    ...(Array.isArray(report.scenarios) && report.scenarios.length > 0
      ? [`- Scenarios: ${report.scenarios.map((scenario) => scenario.id).join(', ')}`]
      : []),
    '',
  ];

  if (Array.isArray(report.scenarioSummary) && report.scenarioSummary.length > 0) {
    lines.push(
      '## Scenario Summary',
      '',
      '| Scenario | Duration | Runs | Preview p95 | Bootstrap p95 | Detail root p95 | Detail render p95 | Vote p95 | Re-entry p95 | Bootstrap | Deferred before detail | Ranking pre-tab | Ranking chunks | Ranking tab p95 | Idle live | Idle relay | Contract |',
      '| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
      ...report.scenarioSummary.map((summary) => (
        `| ${summary.id} | ${formatMetric(summary.durationMs)} | ${formatRuns(summary)} | ${formatMetric(summary.previewP95Ms)} | ${formatMetric(summary.bootstrapReadyP95Ms)} | ${formatMetric(summary.detailRootVisibleP95Ms)} | ${formatMetric(summary.detailP95Ms)} | ${formatMetric(summary.voteButtonP95Ms)} | ${formatMetric(summary.reentryP95Ms)} | ${summary.maxDeepLinkBootstrapRequests ?? 'n/a'} | ${summary.maxPreDetailDeferredRequests ?? 'n/a'} | ${summary.maxRankingRequestsBeforeTabEntry ?? 'n/a'} | ${summary.minRankingChunkLoadsAfterTabEntry ?? 'n/a'} | ${formatMetric(summary.rankingTabEntryP95Ms)} | ${summary.maxPostIdleLiveRequests ?? 'n/a'} | ${summary.maxPostIdleLiveRelayRequests ?? 'n/a'} | ${summary.contractStatus ?? 'n/a'} |`
      )),
      '',
      `Runtime status: ${formatRuntimeStatus(report)}`,
      '',
    );
  }

  lines.push(
    '## Browser',
    '',
    '| Metric | p95 | Budget |',
    '| --- | ---: | ---: |',
    `| Preview first render | ${formatMetric(report.browser?.summary?.previewP95Ms)} | ${formatMetric(report.budgets.previewP95Ms)} |`,
    `| Deep-link bootstrap ready | ${formatMetric(report.browser?.summary?.bootstrapReadyP95Ms)} | n/a |`,
    `| Detail root wall-clock | ${formatMetric(report.browser?.summary?.detailRootVisibleP95Ms)} | n/a |`,
    `| Detail first render after bootstrap | ${formatMetric(report.browser?.summary?.detailP95Ms)} | ${formatMetric(report.budgets.detailP95Ms)} |`,
    `| Vote button after bootstrap | ${formatMetric(report.browser?.summary?.voteButtonP95Ms)} | n/a |`,
    `| Same-game re-entry | ${formatMetric(report.browser?.summary?.reentryP95Ms)} | ${formatMetric(report.budgets.reentryP95Ms)} |`,
    '',
    '## Network Contract',
    '',
    '| Metric | Max |',
    '| --- | ---: |',
    `| Deep-link bootstrap requests | ${report.browser?.summary?.maxDeepLinkBootstrapRequests ?? 0} |`,
    `| Deep-link matches/day duplicates | ${report.browser?.summary?.maxDeepLinkMatchesDayRequests ?? 0} |`,
    `| Deep-link game-detail duplicates | ${report.browser?.summary?.maxDeepLinkGameDetailRequests ?? 0} |`,
    `| Deep-link vote-status duplicates | ${report.browser?.summary?.maxDeepLinkVoteStatusRequests ?? 0} |`,
    `| Deferred requests before detail | ${report.browser?.summary?.maxPreDetailDeferredRequests ?? 0} |`,
    '',
  );

  if (report.api?.endpoints) {
    lines.push(
      '## API Timings',
      '',
      '| Endpoint | HTTP | Cold | Warm p50 | Warm p95 | Warm budget | Failures |',
      '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
      ...Object.entries(report.api.endpoints).map(([key, endpoint]) => (
        `| ${key} | ${formatStatus(endpoint.coldStatus)} | ${formatMetric(endpoint.coldMs)} | ${formatMetric(endpoint.warm?.p50)} | ${formatMetric(endpoint.warm?.p95)} | ${formatMetric(endpoint.warmBudgetMs ?? report.budgets?.apiWarmP95Ms)} | ${endpoint.failedRequestCount ?? 0} |`
      )),
      '',
    );
  }

  if (manualDataRequirements.length > 0) {
    lines.push(
      '## Manual Baseball Data Required',
      '',
      '| Endpoint | Scope | Missing items | Operator message |',
      '| --- | --- | --- | --- |',
      ...manualDataRequirements.map((requirement) => (
        `| ${formatMarkdownTableCell(requirement.endpointKey)} | ${formatMarkdownTableCell(requirement.scope)} | ${formatMarkdownTableCell(formatManualDataMissingItems(requirement.missingItems))} | ${formatMarkdownTableCell(requirement.operatorMessage)} |`
      )),
      '',
    );
  }

  if (Array.isArray(report.guidance) && report.guidance.length > 0) {
    lines.push(
      '## Guidance',
      '',
      ...report.guidance.map((item) => `- ${item}`),
      '',
    );
  }

  if (Array.isArray(report.failures) && report.failures.length > 0) {
    lines.push(
      '## Failures',
      '',
      ...report.failures.map((failure) => `- ${failure}`),
      '',
    );

    if (scenarioFailures.length > 0) {
      lines.push(
        '**Scenario Failures**',
        '',
        ...scenarioFailures.map((group) => `- ${group.scenarioId}: ${group.failures.join(', ')}`),
        '',
      );
    }

    if (failureArtifactItems.length > 0) {
      lines.push(
        '**Failure Artifacts**',
        '',
        ...failureArtifactItems.map((item) => (
          `- ${item.scenarioId}: trace=${formatArtifactPath(item.traceArtifactPath ?? item.tracePath)}, iteration=${formatArtifactPath(item.iterationArtifactPath ?? item.iterationPath)}, screenshot=${formatArtifactPath(item.screenshotArtifactPath ?? item.screenshotPath)}, status=${item.status ?? 'n/a'}`
        )),
        '',
      );
    }
  }

  return `${lines.join('\n')}\n`;
};
