#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const defaultRoot = path.join(repoRoot, 'output', 'playwright');
const defaultDistAssetsRoot = path.join(frontendRoot, 'dist', 'assets');
const defaultBuildReportPath = path.join(frontendRoot, 'reports', 'bundle-guard-report.json');

const homeDeferredResourcePattern = /(?:AdSlot-|AuthenticatedLayoutChrome-|ChatBot-|HomeAuthBridge-|HomeQueryProvider-|HomeSecondaryPanels-|HomeSecondaryPanelsContainer-|PublicNavbar-|PublicNavbarDmUnreadBadge-|liveGame-|realtimeAuth-|sonner-|stomp-)/;
const queryProviderResourcePattern = /(?:AppQueryProvider-|ConfirmDialogContext-|confirmDialogCore-|predictionDeepLink-|queryClient-|vendor-query-)/;
const formerlyHeavyHomeResourcePattern = /(?:predictionHomeLogic|teamIdentity|stadiumDisplay|TeamLogo-|HomeIcons|statusBadgeMeta|status-badge)/;
const fontResourcePattern = /(?:pretendard|Pretendard|woff2|\.woff|\.ttf|\.otf)/;

const parseArgs = (argv) => {
  const options = {
    root: defaultRoot,
    reports: [],
    distAssetsRoot: defaultDistAssetsRoot,
    buildReportPath: defaultBuildReportPath,
    limit: 8,
    all: false,
    json: false,
    requireCurrentBuild: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') {
      options.root = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (arg === '--report') {
      options.reports.push(path.resolve(argv[index + 1] || ''));
      index += 1;
      continue;
    }
    if (arg === '--dist-assets') {
      options.distAssetsRoot = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (arg === '--build-report') {
      options.buildReportPath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (arg === '--limit') {
      const parsed = Number.parseInt(argv[index + 1] || '', 10);
      options.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : options.limit;
      index += 1;
      continue;
    }
    if (arg === '--all') {
      options.all = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--require-current-build') {
      options.requireCurrentBuild = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    if (arg) {
      options.reports.push(path.resolve(arg));
    }
  }

  return options;
};

const printUsage = () => {
  process.stdout.write([
    'Usage: node scripts/home-first-load-report-summary.mjs [--root <dir>] [--report <summary.json>] [--dist-assets <dir>] [--build-report <json>] [--limit <n>] [--all] [--json] [--require-current-build]',
    '',
    'Reads existing home-first-load-summary JSON files and ranks likely first-load bottleneck candidates.',
    'When dist/assets exists, asset resources are annotated as current exact/current family/stale asset.',
    '--require-current-build exits nonzero when inspected runtime reports are older than the current build report or freshness is unknown.',
  ].join('\n') + '\n');
};

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toNumber = (value) => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const roundMetric = (value) => {
  const numberValue = toNumber(value);
  return numberValue === null ? null : Math.round(numberValue * 10) / 10;
};

const formatMs = (value) => {
  const rounded = roundMetric(value);
  return rounded === null ? 'n/a' : `${rounded}ms`;
};

const formatBytes = (value) => {
  const numberValue = toNumber(value);
  if (numberValue === null) {
    return 'n/a';
  }
  if (numberValue >= 1024 * 1024) {
    return `${Math.round((numberValue / (1024 * 1024)) * 10) / 10}MB`;
  }
  if (numberValue >= 1024) {
    return `${Math.round((numberValue / 1024) * 10) / 10}KB`;
  }
  return `${numberValue}B`;
};

const formatCount = (value) => {
  const numberValue = toNumber(value);
  return numberValue === null ? 'n/a' : String(numberValue);
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const formatDuration = (durationMs) => {
  const numberValue = toNumber(durationMs);
  if (numberValue === null) {
    return 'n/a';
  }

  const totalMinutes = Math.max(0, Math.round(numberValue / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [
    days > 0 ? `${days}d` : '',
    hours > 0 ? `${hours}h` : '',
    minutes > 0 || (days === 0 && hours === 0) ? `${minutes}m` : '',
  ].filter(Boolean).join(' ');
};

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const pathExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const isHomeSummaryFile = (fileName) => (
  /^home-first-load(?:-[a-z0-9-]+)?-summary\.json$/i.test(fileName)
);

const collectSummaryFiles = async (rootPath) => {
  const found = [];

  const visit = async (currentPath) => {
    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
        continue;
      }
      if (entry.isFile() && isHomeSummaryFile(entry.name)) {
        found.push(entryPath);
      }
    }
  };

  await visit(rootPath);
  return found.sort();
};

const resolveReportFiles = async (options) => {
  if (options.reports.length > 0) {
    const files = [];
    for (const reportPath of options.reports) {
      let stat;
      try {
        stat = await fs.stat(reportPath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        files.push(...await collectSummaryFiles(reportPath));
      } else if (stat.isFile()) {
        files.push(reportPath);
      }
    }
    return files;
  }

  if (!await pathExists(options.root)) {
    return [];
  }
  return collectSummaryFiles(options.root);
};

const shortPath = (targetPath) => {
  const relative = path.relative(repoRoot, targetPath);
  return relative.startsWith('..') ? targetPath : relative;
};

const shortResourceName = (name) => {
  if (!name) {
    return 'unknown';
  }
  try {
    const url = new URL(name, 'http://local.invalid');
    const displayPath = url.pathname || name;
    return url.search ? `${displayPath}${url.search}` : displayPath;
  } catch {
    return String(name);
  }
};

const assetFilePattern = /\/assets\/([^?#]+)/;

const extractAssetFileName = (name) => {
  if (!name) {
    return '';
  }
  const text = String(name);
  try {
    const url = new URL(text, 'http://local.invalid');
    const match = url.pathname.match(assetFilePattern);
    return match ? path.posix.basename(match[1]) : '';
  } catch {
    const match = text.match(assetFilePattern);
    return match ? path.posix.basename(match[1]) : '';
  }
};

const assetFamily = (assetName) => {
  const match = assetName.match(/^(.+-)[A-Za-z0-9_-]+(\.[a-z0-9]+)$/i);
  return match ? `${match[1]}*${match[2]}` : '';
};

const collectCurrentAssetIndex = async (assetsRoot) => {
  const files = [];

  const visit = async (currentPath) => {
    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
        continue;
      }
      if (entry.isFile()) {
        files.push(entry.name);
      }
    }
  };

  await visit(assetsRoot);

  const familyMap = new Map();
  for (const fileName of files) {
    const family = assetFamily(fileName);
    if (!family) {
      continue;
    }
    const familyFiles = familyMap.get(family) || [];
    familyFiles.push(fileName);
    familyMap.set(family, familyFiles);
  }

  return {
    root: assetsRoot,
    available: files.length > 0,
    count: files.length,
    files: new Set(files),
    familyMap,
  };
};

const loadBuildContext = async (buildReportPath) => {
  try {
    const report = await readJson(buildReportPath);
    const generatedAt = typeof report?.generatedAt === 'string' ? report.generatedAt : null;
    const homeFirstLoadStaticClosure = Array.isArray(report?.homeFirstLoadStaticClosureResults)
      ? report.homeFirstLoadStaticClosureResults.map((result) => {
        const totalJsBytes = toNumber(result?.totalJsBytes);
        const maxJsBytes = toNumber(result?.maxJsBytes);
        const includedFiles = Array.isArray(result?.includedFiles)
          ? result.includedFiles
            .map((file) => ({
              key: file?.key || '',
              file: file?.file || '',
              sizeBytes: toNumber(file?.sizeBytes),
            }))
            .filter((file) => file.file && file.sizeBytes !== null)
            .sort((left, right) => right.sizeBytes - left.sizeBytes)
          : [];

        return {
          label: result?.label || 'unknown',
          ok: result?.ok === true,
          totalJsBytes,
          maxJsBytes,
          headroomBytes: totalJsBytes !== null && maxJsBytes !== null
            ? maxJsBytes - totalJsBytes
            : null,
          overageBytes: toNumber(result?.overageBytes),
          includedFiles,
        };
      })
      : [];

    return {
      path: buildReportPath,
      available: Boolean(generatedAt),
      generatedAt,
      homeFirstLoadStaticClosure,
    };
  } catch {
    return {
      path: buildReportPath,
      available: false,
      generatedAt: null,
      homeFirstLoadStaticClosure: [],
    };
  }
};

const reportFreshness = (reportGeneratedAt, buildGeneratedAt) => {
  const reportTime = Date.parse(reportGeneratedAt || '');
  const buildTime = Date.parse(buildGeneratedAt || '');
  if (!Number.isFinite(reportTime) || !Number.isFinite(buildTime)) {
    return {
      status: 'unknown',
      ageMs: null,
      label: 'unknown',
    };
  }
  if (reportTime >= buildTime) {
    return {
      status: 'current-or-newer',
      ageMs: reportTime - buildTime,
      label: 'current-or-newer',
    };
  }

  return {
    status: 'older-than-current-build',
    ageMs: buildTime - reportTime,
    label: `older-than-current-build by ${formatDuration(buildTime - reportTime)}`,
  };
};

const currentAssetStatus = (assetIndex, resourceName) => {
  if (!assetIndex?.available) {
    return '';
  }

  const assetName = extractAssetFileName(resourceName);
  if (!assetName) {
    return '';
  }
  if (assetIndex.files.has(assetName)) {
    return 'current exact';
  }

  const family = assetFamily(assetName);
  if (family && assetIndex.familyMap.has(family)) {
    return `current family ${family}`;
  }

  return 'stale asset';
};

const freshnessCounts = (statuses) => {
  const counts = {
    currentOrNewer: 0,
    olderThanCurrentBuild: 0,
    unknown: 0,
  };

  for (const status of statuses) {
    if (status === 'current-or-newer') {
      counts.currentOrNewer += 1;
    } else if (status === 'older-than-current-build') {
      counts.olderThanCurrentBuild += 1;
    } else {
      counts.unknown += 1;
    }
  }

  return counts;
};

const candidateFreshness = (statuses) => {
  const counts = freshnessCounts(statuses);
  const total = counts.currentOrNewer + counts.olderThanCurrentBuild + counts.unknown;

  if (total === 0 || counts.unknown === total) {
    return {
      ...counts,
      label: 'freshness unknown',
      actionability: 'rerun home first-load audit before treating this as current-build proof',
    };
  }
  if (counts.currentOrNewer > 0 && counts.olderThanCurrentBuild === 0 && counts.unknown === 0) {
    return {
      ...counts,
      label: 'fresh runtime evidence present',
      actionability: 'candidate has current-build runtime evidence',
    };
  }
  if (counts.currentOrNewer > 0) {
    return {
      ...counts,
      label: `mixed freshness (${counts.currentOrNewer} current, ${counts.olderThanCurrentBuild} older, ${counts.unknown} unknown)`,
      actionability: 'candidate has some current-build runtime evidence; compare stale entries carefully',
    };
  }
  if (counts.olderThanCurrentBuild > 0 && counts.unknown === 0) {
    return {
      ...counts,
      label: 'all runtime evidence older than current build',
      actionability: 'rerun home first-load audit before treating this as current-build proof',
    };
  }

  return {
    ...counts,
    label: `older or unknown freshness (${counts.olderThanCurrentBuild} older, ${counts.unknown} unknown)`,
    actionability: 'rerun home first-load audit before treating this as current-build proof',
  };
};

const evaluateFreshnessGate = (analyses, requireCurrentBuild) => {
  const statuses = analyses.map((analysis) => analysis.freshness?.status || 'unknown');
  const counts = freshnessCounts(statuses);
  const total = analyses.length;
  const staleOrUnknown = counts.olderThanCurrentBuild + counts.unknown;
  const passed = !requireCurrentBuild || (total > 0 && staleOrUnknown === 0);

  let reason = 'not required';
  if (requireCurrentBuild && total === 0) {
    reason = 'no runtime reports were inspected';
  } else if (requireCurrentBuild && staleOrUnknown > 0) {
    reason = `${staleOrUnknown} of ${total} inspected runtime reports are older than the current build or freshness is unknown`;
  } else if (requireCurrentBuild) {
    reason = 'all inspected runtime reports are current-or-newer than the current build report';
  }

  return {
    required: requireCurrentBuild,
    passed,
    total,
    ...counts,
    reason,
  };
};

const resourceTiming = (entry, resource) => {
  if (!isObject(resource)) {
    return { phase: 'unknown', deltaMs: null };
  }
  if (
    (resource.cardTiming === 'pre-card' || resource.cardTiming === 'post-card')
    && typeof resource.firstCardDeltaMs === 'number'
  ) {
    return {
      phase: resource.cardTiming,
      deltaMs: Math.abs(roundMetric(resource.firstCardDeltaMs)),
    };
  }

  const firstGameCardMs = toNumber(entry?.firstGameCardMs);
  const responseEnd = toNumber(resource.responseEnd);
  if (firstGameCardMs === null || responseEnd === null) {
    return { phase: 'unknown', deltaMs: null };
  }

  return {
    phase: responseEnd <= firstGameCardMs ? 'pre-card' : 'post-card',
    deltaMs: Math.abs(roundMetric(responseEnd - firstGameCardMs)),
  };
};

const formatResource = (entry, resource, assetIndex = null) => {
  if (!isObject(resource)) {
    return 'unknown';
  }
  const timing = resourceTiming(entry, resource);
  const timingLabel = timing.phase === 'unknown'
    ? 'timing unknown'
    : `${timing.phase} ${formatMs(timing.deltaMs)}`;
  const assetStatus = currentAssetStatus(assetIndex, resource.name);
  return [
    shortResourceName(resource.name),
    formatMs(resource.duration),
    `@${formatMs(resource.responseEnd)}`,
    timingLabel,
    assetStatus ? `[${assetStatus}]` : '',
  ].filter(Boolean).join(' ');
};

const allEntryResources = (entry) => {
  const resources = [];
  if (Array.isArray(entry?.criticalResources)) {
    resources.push(...entry.criticalResources);
  }
  if (Array.isArray(entry?.slowestResources)) {
    resources.push(...entry.slowestResources);
  }
  if (Array.isArray(entry?.deferredBeforeFirstCardResources)) {
    resources.push(...entry.deferredBeforeFirstCardResources);
  }

  const seen = new Set();
  return resources.filter((resource) => {
    const key = `${resource?.name || ''}:${resource?.responseEnd || ''}:${resource?.duration || ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const reportIdentity = (filePath, report) => [
  path.dirname(filePath),
  report.generatedAt || '',
  report.mode || '',
  report.reportKey || '',
  report.selectedDate || '',
  report.status || '',
].join('|');

const loadReports = async (files) => {
  const reports = [];
  const seen = new Set();

  for (const filePath of files) {
    try {
      const report = await readJson(filePath);
      if (!isObject(report) || !Array.isArray(report.viewports)) {
        continue;
      }
      const identity = reportIdentity(filePath, report);
      if (seen.has(identity)) {
        continue;
      }
      seen.add(identity);
      reports.push({ filePath, report });
    } catch (error) {
      reports.push({
        filePath,
        report: null,
        parseError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return reports.sort((left, right) => {
    const leftTime = Date.parse(left.report?.generatedAt || '');
    const rightTime = Date.parse(right.report?.generatedAt || '');
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    return left.filePath.localeCompare(right.filePath);
  });
};

const measuredEntries = (viewport) => {
  const entries = Array.isArray(viewport?.entries) ? viewport.entries : [];
  const nonPrewarm = entries.filter((entry) => entry && !entry.prewarm);
  return nonPrewarm.length > 0 ? nonPrewarm : entries;
};

const slowestEntry = (viewport) => {
  const entries = measuredEntries(viewport);
  return entries.reduce((selected, entry) => {
    if (!selected) {
      return entry;
    }
    return (toNumber(entry.firstGameCardMs) || 0) > (toNumber(selected.firstGameCardMs) || 0)
      ? entry
      : selected;
  }, null);
};

const p95BudgetStatus = (actual, budget) => {
  const actualNumber = toNumber(actual);
  const budgetNumber = toNumber(budget);
  if (actualNumber === null || budgetNumber === null) {
    return 'unknown';
  }
  return actualNumber <= budgetNumber ? 'ok' : `over by ${formatMs(actualNumber - budgetNumber)}`;
};

const addCandidate = (candidates, key, severity, detail, evidence = '') => {
  const existing = candidates.get(key);
  if (!existing) {
    candidates.set(key, {
      key,
      severity,
      details: detail ? [detail] : [],
      evidence: evidence ? [evidence] : [],
      count: 1,
    });
    return;
  }
  existing.severity = Math.max(existing.severity, severity);
  existing.count += 1;
  if (detail) {
    existing.details.push(detail);
  }
  if (evidence) {
    existing.evidence.push(evidence);
  }
};

const analyzeReport = ({ filePath, report, parseError }, assetIndex = null, buildContext = null) => {
  if (!report) {
    return {
      filePath,
      parseError,
      candidates: [{
        key: 'unreadable report',
        severity: 4,
        details: [parseError || 'unknown parse error'],
        evidence: [],
        count: 1,
      }],
      viewports: [],
    };
  }

  const candidates = new Map();
  const firstGameCardBudget = report.budgets?.firstGameCardP95Ms;
  const bootstrapBudget = report.budgets?.bootstrapResponseP95Ms;

  if (report.status && report.status !== 'passed') {
    addCandidate(
      candidates,
      `report status ${report.status}`,
      report.status === 'failed' ? 5 : 4,
      `${shortPath(filePath)} status=${report.status}`,
    );
  }

  const viewportSummaries = report.viewports.map((viewport) => {
    const entry = slowestEntry(viewport);
    const entryResources = allEntryResources(entry);
    const firstGameCardP95 = toNumber(viewport.firstGameCardP95);
    const bootstrapP95 = toNumber(viewport.bootstrapResponseP95);
    const deferredResources = Array.isArray(entry?.deferredBeforeFirstCardResources)
      ? entry.deferredBeforeFirstCardResources
      : [];
    const preCardScriptCount = toNumber(entry?.preCardScriptResourceCount);
    const scriptCount = toNumber(entry?.scriptResourceCount);

    if (viewport.status && viewport.status !== 'passed') {
      addCandidate(
        candidates,
        `${viewport.viewport} status ${viewport.status}`,
        viewport.status === 'failed' ? 5 : 4,
        viewport.reason || `${viewport.viewport} status=${viewport.status}`,
      );
    }

    if (
      toNumber(firstGameCardBudget) !== null
      && firstGameCardP95 !== null
      && firstGameCardP95 > firstGameCardBudget
    ) {
      addCandidate(
        candidates,
        'first card p95 budget overage',
        5,
        `${viewport.viewport} ${formatMs(firstGameCardP95)} / ${formatMs(firstGameCardBudget)}`,
      );
    }

    if (
      toNumber(bootstrapBudget) !== null
      && bootstrapP95 !== null
      && bootstrapP95 > bootstrapBudget
    ) {
      addCandidate(
        candidates,
        'bootstrap p95 budget overage',
        4,
        `${viewport.viewport} ${formatMs(bootstrapP95)} / ${formatMs(bootstrapBudget)}`,
      );
    }

    if (deferredResources.length > 0) {
      addCandidate(
        candidates,
        'deferred chunk before first card',
        5,
        `${viewport.viewport} count=${deferredResources.length}`,
        deferredResources.slice(0, 3).map((resource) => formatResource(entry, resource, assetIndex)).join('; '),
      );
    }

    if (preCardScriptCount !== null && preCardScriptCount > 12) {
      addCandidate(
        candidates,
        'high pre-card script fanout',
        preCardScriptCount > 24 ? 4 : 3,
        `${viewport.viewport} preCardScriptResourceCount=${preCardScriptCount}`,
      );
    } else if (preCardScriptCount === null && scriptCount !== null && scriptCount > 40) {
      addCandidate(
        candidates,
        'high script fanout, pre-card count unavailable',
        2,
        `${viewport.viewport} scriptResourceCount=${scriptCount}`,
      );
    }

    if (toNumber(entry?.longTaskTotalMs) !== null && entry.longTaskTotalMs > 150) {
      addCandidate(
        candidates,
        'main-thread long tasks before card',
        entry.longestLongTaskMs > 120 ? 4 : 3,
        `${viewport.viewport} total=${formatMs(entry.longTaskTotalMs)} longest=${formatMs(entry.longestLongTaskMs)}`,
      );
    }

    for (const resource of entryResources) {
      const resourceName = shortResourceName(resource?.name || '');
      const timing = resourceTiming(entry, resource);
      if (timing.phase !== 'pre-card') {
        continue;
      }

      if (homeDeferredResourcePattern.test(resourceName)) {
        addCandidate(
          candidates,
          'deferred home chrome chunk loaded pre-card',
          5,
          `${viewport.viewport} ${resourceName}`,
          formatResource(entry, resource, assetIndex),
        );
      } else if (queryProviderResourcePattern.test(resourceName)) {
        addCandidate(
          candidates,
          'query/provider chunk loaded pre-card',
          4,
          `${viewport.viewport} ${resourceName}`,
          formatResource(entry, resource, assetIndex),
        );
      } else if (formerlyHeavyHomeResourcePattern.test(resourceName)) {
        addCandidate(
          candidates,
          'formerly heavy home dependency loaded pre-card',
          4,
          `${viewport.viewport} ${resourceName}`,
          formatResource(entry, resource, assetIndex),
        );
      } else if (fontResourcePattern.test(resourceName)) {
        addCandidate(
          candidates,
          'font resource on first-card path',
          3,
          `${viewport.viewport} ${resourceName}`,
          formatResource(entry, resource, assetIndex),
        );
      }
    }

    return {
      viewport: viewport.viewport || viewport.label || 'unknown',
      status: viewport.status || 'unknown',
      firstGameCardP95,
      firstGameCardBudget,
      firstGameCardBudgetStatus: p95BudgetStatus(firstGameCardP95, firstGameCardBudget),
      bootstrapP95,
      bootstrapBudget,
      bootstrapBudgetStatus: p95BudgetStatus(bootstrapP95, bootstrapBudget),
      slowestFirstCardMs: toNumber(entry?.firstGameCardMs),
      preCardScriptResourceCount: preCardScriptCount,
      scriptResourceCount: scriptCount,
      deferredBeforeFirstCardCount: deferredResources.length,
      longTaskTotalMs: toNumber(entry?.longTaskTotalMs),
      longestLongTaskMs: toNumber(entry?.longestLongTaskMs),
      criticalResources: (entry?.criticalResources || []).slice(0, 5).map((resource) => formatResource(entry, resource, assetIndex)),
      slowestResources: (entry?.slowestResources || []).slice(0, 5).map((resource) => formatResource(entry, resource, assetIndex)),
    };
  });

  return {
    filePath,
    generatedAt: report.generatedAt || null,
    freshness: reportFreshness(report.generatedAt, buildContext?.generatedAt),
    mode: report.mode || report.reportKey || 'unknown',
    reportKey: report.reportKey || report.mode || 'unknown',
    selectedDate: report.selectedDate || null,
    status: report.status || 'unknown',
    budgets: report.budgets || {},
    candidates: [...candidates.values()].sort((left, right) => (
      right.severity - left.severity || right.count - left.count || left.key.localeCompare(right.key)
    )),
    viewports: viewportSummaries,
  };
};

const rankOverallCandidates = (analyses) => {
  const byKey = new Map();
  for (const analysis of analyses) {
    for (const candidate of analysis.candidates || []) {
      const existing = byKey.get(candidate.key);
      const freshnessStatus = analysis.freshness?.status || 'unknown';
      if (!existing) {
        byKey.set(candidate.key, {
          key: candidate.key,
          severity: candidate.severity,
          count: candidate.count || 1,
          details: candidate.details || [],
          evidence: candidate.evidence || [],
          reports: [shortPath(analysis.filePath)],
          freshnessStatuses: [freshnessStatus],
        });
        continue;
      }
      existing.severity = Math.max(existing.severity, candidate.severity);
      existing.count += candidate.count || 1;
      existing.details.push(...(candidate.details || []));
      existing.evidence.push(...(candidate.evidence || []));
      existing.reports.push(shortPath(analysis.filePath));
      existing.freshnessStatuses.push(freshnessStatus);
    }
  }

  return [...byKey.values()]
    .map((candidate) => ({
      ...candidate,
      reports: unique(candidate.reports),
      freshness: candidateFreshness(candidate.freshnessStatuses),
    }))
    .sort((left, right) => (
      right.severity - left.severity || right.count - left.count || left.key.localeCompare(right.key)
    ));
};

const renderMarkdown = ({ root, distAssets, buildContext, analyses, totalFound, limited, freshnessGate }) => {
  const lines = [
    '# Home First Load Report Summary',
    '',
    `- Root: \`${shortPath(root)}\``,
    `- Reports analyzed: \`${analyses.length}\`${limited ? ` of \`${totalFound}\`` : ''}`,
  ];
  if (distAssets?.available) {
    lines.push(`- Current dist assets: \`${shortPath(distAssets.root)}\` (${distAssets.count} files)`);
  } else {
    lines.push(`- Current dist assets: unavailable at \`${shortPath(distAssets?.root || defaultDistAssetsRoot)}\``);
  }
  if (buildContext?.available) {
    lines.push(`- Current build report: \`${shortPath(buildContext.path)}\` generatedAt=\`${buildContext.generatedAt}\``);
    for (const closure of buildContext.homeFirstLoadStaticClosure || []) {
      const headroom = toNumber(closure.headroomBytes);
      const status = closure.ok ? 'ok' : 'failed';
      lines.push(`- Static closure \`${closure.label}\`: \`${status}\` ${formatBytes(closure.totalJsBytes)} / ${formatBytes(closure.maxJsBytes)} headroom=${formatBytes(headroom)}`);
      const largestFiles = (closure.includedFiles || []).slice(0, 6);
      if (largestFiles.length > 0) {
        lines.push(`  - Largest closure files: ${largestFiles.map((file) => `${file.file} ${formatBytes(file.sizeBytes)}`).join('; ')}`);
      }
    }
    if (analyses.length > 0 && analyses.every((analysis) => analysis.freshness?.status === 'older-than-current-build')) {
      lines.push('- Report freshness: inspected runtime reports are older than the current build; treat asset labels as current-build correlation, not fresh runtime proof.');
    }
  } else {
    lines.push(`- Current build report: unavailable at \`${shortPath(buildContext?.path || defaultBuildReportPath)}\``);
  }
  if (freshnessGate?.required) {
    lines.push(`- Freshness gate: \`${freshnessGate.passed ? 'passed' : 'failed'}\` (${freshnessGate.reason})`);
  }

  if (analyses.length === 0) {
    lines.push('', 'No home-first-load summary reports found.');
    return `${lines.join('\n')}\n`;
  }

  const overallCandidates = rankOverallCandidates(analyses);
  lines.push('', '## Ranked Candidates', '');
  if (overallCandidates.length === 0) {
    lines.push('- No bottleneck candidates detected in the inspected reports.');
  } else {
    overallCandidates.slice(0, 12).forEach((candidate, index) => {
      const detail = unique(candidate.details).slice(0, 3).join('; ');
      const evidence = unique(candidate.evidence).slice(0, 2).join('; ');
      const reports = unique(candidate.reports).slice(0, 3).join(', ');
      lines.push(`- ${index + 1}. [S${candidate.severity}] ${candidate.key} (${candidate.count} hits, ${candidate.freshness?.label || 'freshness unknown'})`);
      if (detail) {
        lines.push(`  - Detail: ${detail}`);
      }
      if (evidence) {
        lines.push(`  - Evidence: ${evidence}`);
      }
      if (candidate.freshness?.actionability) {
        lines.push(`  - Freshness: ${candidate.freshness.actionability}`);
      }
      if (reports) {
        lines.push(`  - Reports: ${reports}`);
      }
    });
  }

  lines.push('', '## Reports', '');
  for (const analysis of analyses) {
    lines.push(`### ${shortPath(analysis.filePath)}`);
    if (analysis.parseError) {
      lines.push(`- Parse error: ${analysis.parseError}`, '');
      continue;
    }

    lines.push(
      `- Status: \`${analysis.status}\` mode=\`${analysis.mode}\` generatedAt=\`${analysis.generatedAt || 'unknown'}\` freshness=\`${analysis.freshness?.label || 'unknown'}\` selectedDate=\`${analysis.selectedDate || 'unknown'}\``,
    );

    for (const viewport of analysis.viewports) {
      lines.push(
        `- ${viewport.viewport}: status=\`${viewport.status}\` firstCardP95=${formatMs(viewport.firstGameCardP95)} (${viewport.firstGameCardBudgetStatus}) bootstrapP95=${formatMs(viewport.bootstrapP95)} (${viewport.bootstrapBudgetStatus}) slowestFirstCard=${formatMs(viewport.slowestFirstCardMs)} preCardScripts=${formatCount(viewport.preCardScriptResourceCount)} totalScripts=${formatCount(viewport.scriptResourceCount)} deferredBeforeCard=${viewport.deferredBeforeFirstCardCount} longTasks=${formatMs(viewport.longTaskTotalMs)}/${formatMs(viewport.longestLongTaskMs)}`,
      );
      if (viewport.criticalResources.length > 0) {
        lines.push(`  - Critical: ${viewport.criticalResources.join('; ')}`);
      }
      if (viewport.slowestResources.length > 0) {
        lines.push(`  - Slowest: ${viewport.slowestResources.join('; ')}`);
      }
    }

    if (analysis.candidates.length > 0) {
      const candidates = analysis.candidates
        .slice(0, 5)
        .map((candidate) => `[S${candidate.severity}] ${candidate.key}`)
        .join('; ');
      lines.push(`- Top candidates: ${candidates}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  const files = await resolveReportFiles(options);
  const reports = await loadReports(files);
  const distAssets = await collectCurrentAssetIndex(options.distAssetsRoot);
  const buildContext = await loadBuildContext(options.buildReportPath);
  const limitedReports = options.all ? reports : reports.slice(0, options.limit);
  const analyses = limitedReports.map((report) => analyzeReport(report, distAssets, buildContext));
  const freshnessGate = evaluateFreshnessGate(analyses, options.requireCurrentBuild);
  const payload = {
    root: options.root,
    distAssets: {
      root: distAssets.root,
      available: distAssets.available,
      count: distAssets.count,
    },
    buildContext,
    totalFound: reports.length,
    limited: !options.all && reports.length > limitedReports.length,
    freshnessGate,
    analyses,
    rankedCandidates: rankOverallCandidates(analyses),
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    if (!freshnessGate.passed) {
      console.error(`[home-first-load-report-summary] freshness gate failed: ${freshnessGate.reason}`);
      process.exitCode = 1;
    }
    return;
  }

  process.stdout.write(renderMarkdown(payload));
  if (!freshnessGate.passed) {
    console.error(`[home-first-load-report-summary] freshness gate failed: ${freshnessGate.reason}`);
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error('[home-first-load-report-summary] failed', error);
  process.exit(1);
});
