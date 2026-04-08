#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const args = new Set(process.argv.slice(2));
const allowMissing = args.has('--allow-missing');
const defaultOutputRoot = process.env.MOBILE_PLAYWRIGHT_SUMMARY_OUTPUT_ROOT
  ? path.resolve(process.env.MOBILE_PLAYWRIGHT_SUMMARY_OUTPUT_ROOT)
  : path.join(repoRoot, 'output', 'playwright');

export const getSummaryPaths = (outputRoot) => ({
  predictionJsonPath: path.join(outputRoot, 'prediction-mobile-regression-summary.json'),
  predictionMarkdownPath: path.join(outputRoot, 'prediction-mobile-regression-summary.md'),
  mateJsonPath: path.join(outputRoot, 'mate-mobile-regression-summary.json'),
  mateMarkdownPath: path.join(outputRoot, 'mate-mobile-regression-summary.md'),
  combinedJsonPath: path.join(outputRoot, 'mobile-playwright-smoke-summary.json'),
  combinedMarkdownPath: path.join(outputRoot, 'mobile-playwright-smoke-summary.md'),
});

const readJsonIfExists = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

export const normalizePredictionSummary = (summary, summaryPaths) => {
  if (!summary) {
    return null;
  }

  return {
    key: 'prediction',
    label: 'Prediction',
    status: summary.status || 'unknown',
    baseUrl: summary.baseUrl || null,
    serverMode: summary.serverMode || null,
    entryCount: summary.entryCount || 0,
    overflowFailureCount: summary.overflowFailureCount || 0,
    actionableFailedRequestCount: summary.actionableFailedRequestCount || 0,
    actionableConsoleErrorCount: summary.actionableConsoleErrorCount || 0,
    requestedScopes: Array.isArray(summary.requestedStates) ? summary.requestedStates : [],
    durationMs: summary.durationMs || 0,
    summaryPath: summaryPaths.predictionMarkdownPath,
  };
};

export const normalizeMateSummary = (summary, summaryPaths) => {
  if (!summary) {
    return null;
  }

  const totals = summary.totals || {};
  const failedSuiteCount = totals.failedSuiteCount || 0;

  return {
    key: 'mate',
    label: 'Mate',
    status: failedSuiteCount > 0 ? 'failed' : 'passed',
    baseUrl: summary.baseUrl || null,
    serverMode: summary.serverMode || null,
    entryCount: totals.entryCount || 0,
    overflowFailureCount: totals.overflowFailureCount || 0,
    actionableFailedRequestCount: totals.actionableFailedRequestCount || 0,
    actionableConsoleErrorCount: totals.actionableConsoleErrorCount || 0,
    requestedScopes: Array.isArray(summary.suites)
      ? summary.suites.map((suite) => suite.label).filter(Boolean)
      : [],
    durationMs: Array.isArray(summary.suites)
      ? summary.suites.reduce((sum, suite) => sum + (suite.durationMs || 0), 0)
      : 0,
    summaryPath: summaryPaths.mateMarkdownPath,
  };
};

export const buildCombinedReport = ({
  predictionSummary,
  mateSummary,
  summaryPaths,
  generatedAt = new Date().toISOString(),
}) => {
  const domains = [
    normalizePredictionSummary(predictionSummary, summaryPaths),
    normalizeMateSummary(mateSummary, summaryPaths),
  ].filter(Boolean);

  if (domains.length === 0) {
    return null;
  }

  const status = domains.every((domain) => domain.status === 'passed') ? 'passed' : 'failed';

  return {
    generatedAt,
    status,
    domainCount: domains.length,
    baseUrls: [...new Set(domains.map((domain) => domain.baseUrl).filter(Boolean))],
    serverModes: [...new Set(domains.map((domain) => domain.serverMode).filter(Boolean))],
    totalEntryCount: domains.reduce((sum, domain) => sum + domain.entryCount, 0),
    totalOverflowFailureCount: domains.reduce((sum, domain) => sum + domain.overflowFailureCount, 0),
    totalActionableFailedRequestCount: domains.reduce((sum, domain) => sum + domain.actionableFailedRequestCount, 0),
    totalActionableConsoleErrorCount: domains.reduce((sum, domain) => sum + domain.actionableConsoleErrorCount, 0),
    domains,
  };
};

export const buildMarkdown = (report) => {
  const lines = [
    '# Mobile Playwright Smoke Summary',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Domains: ${report.domainCount}`,
    `- Base URLs: ${report.baseUrls.length > 0 ? report.baseUrls.join(', ') : 'none'}`,
    `- Server modes: ${report.serverModes.length > 0 ? report.serverModes.join(', ') : 'none'}`,
    `- Total entries: ${report.totalEntryCount}`,
    `- Overflow failures: ${report.totalOverflowFailureCount}`,
    `- Actionable failed requests: ${report.totalActionableFailedRequestCount}`,
    `- Actionable console errors: ${report.totalActionableConsoleErrorCount}`,
    '',
    '| Domain | Status | Entries | Overflow | Actionable req | Actionable console | Duration | Summary |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
  ];

  report.domains.forEach((domain) => {
    lines.push(
      `| ${domain.label} | ${domain.status} | ${domain.entryCount} | ${domain.overflowFailureCount} | ${domain.actionableFailedRequestCount} | ${domain.actionableConsoleErrorCount} | ${domain.durationMs}ms | ${domain.summaryPath} |`
    );
  });

  return `${lines.join('\n')}\n`;
};

export const generateCombinedSummary = async ({
  outputRoot = defaultOutputRoot,
  allowMissing: allowMissingFlag = false,
  generatedAt,
} = {}) => {
  const summaryPaths = getSummaryPaths(outputRoot);
  const [predictionSummary, mateSummary] = await Promise.all([
    readJsonIfExists(summaryPaths.predictionJsonPath),
    readJsonIfExists(summaryPaths.mateJsonPath),
  ]);
  const report = buildCombinedReport({
    predictionSummary,
    mateSummary,
    summaryPaths,
    generatedAt,
  });

  if (!report) {
    if (allowMissingFlag) {
      return null;
    }
    throw new Error('No mobile summary inputs found.');
  }

  await fs.writeFile(summaryPaths.combinedJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(summaryPaths.combinedMarkdownPath, buildMarkdown(report), 'utf8');

  return {
    report,
    ...summaryPaths,
  };
};

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMainModule) {
  generateCombinedSummary({
    outputRoot: defaultOutputRoot,
    allowMissing,
  }).then((result) => {
    if (!result) {
      console.log('No mobile summary inputs found. Skipping combined summary generation.');
      return;
    }

    console.log(`summary:${result.combinedJsonPath}`);
    console.log(`summary_markdown:${result.combinedMarkdownPath}`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
