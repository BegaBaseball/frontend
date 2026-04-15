import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const statusEmoji = {
  passed: '✅',
  failed: '❌',
  unknown: '⚪',
};

export const defaultPredictionMobileStates = [
  'match',
  'ranking',
  'ranking-ended',
  'ranking-init-error',
  'ranking-saved-load-error',
  'ranking-save-dialog',
  'ranking-saved',
  'detail-error',
  'detail-not-found',
  'vote-auth-expired',
];

export const defaultPredictionMobileDevices = ['iphone-se', 'iphone-12'];

const normalizeList = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [...fallback];
};

const compareSets = (actualItems, expectedItems) => {
  const actual = new Set(actualItems);
  const expected = new Set(expectedItems);
  const missing = expectedItems.filter((item) => !actual.has(item));
  const unexpected = actualItems.filter((item) => !expected.has(item));
  return {
    matches: missing.length === 0 && unexpected.length === 0,
    missing,
    unexpected,
  };
};

export const loadPredictionMobileSummaryJson = (summaryPath, cwd = process.cwd()) =>
  JSON.parse(readFileSync(resolve(cwd, summaryPath), 'utf8'));

export const validatePredictionMobileSummary = ({
  summary,
  expectedStates = defaultPredictionMobileStates,
  expectedDevices = defaultPredictionMobileDevices,
} = {}) => {
  if (!summary || typeof summary !== 'object') {
    return {
      status: 'failed',
      failures: ['prediction mobile summary is missing or unreadable'],
      expectedStates: normalizeList(expectedStates, defaultPredictionMobileStates),
      expectedDevices: normalizeList(expectedDevices, defaultPredictionMobileDevices),
      entryCount: 0,
    };
  }

  const normalizedExpectedStates = normalizeList(expectedStates, defaultPredictionMobileStates);
  const normalizedExpectedDevices = normalizeList(expectedDevices, defaultPredictionMobileDevices);
  const actualStates = normalizeList(summary.states);
  const actualRequestedStates = normalizeList(summary.requestedStates);
  const actualDevices = normalizeList(summary.devices);
  const actualEntries = Array.isArray(summary.entries) ? summary.entries : [];
  const failures = [];

  if (summary.status !== 'passed') {
    failures.push(`summary status must be passed, received ${summary.status || 'unknown'}`);
  }

  if ((summary.overflowFailureCount || 0) !== 0) {
    failures.push(`overflow failures must be 0, received ${summary.overflowFailureCount}`);
  }
  if ((summary.actionableFailedRequestCount || 0) !== 0) {
    failures.push(`actionable failed requests must be 0, received ${summary.actionableFailedRequestCount}`);
  }
  if ((summary.actionableConsoleErrorCount || 0) !== 0) {
    failures.push(`actionable console errors must be 0, received ${summary.actionableConsoleErrorCount}`);
  }

  const stateDiff = compareSets(actualStates, normalizedExpectedStates);
  if (!stateDiff.matches) {
    failures.push(
      `states mismatch: missing=[${stateDiff.missing.join(', ') || 'none'}], unexpected=[${stateDiff.unexpected.join(', ') || 'none'}]`
    );
  }

  if (actualRequestedStates.length > 0) {
    const requestedDiff = compareSets(actualRequestedStates, normalizedExpectedStates);
    if (!requestedDiff.matches) {
      failures.push(
        `requestedStates mismatch: missing=[${requestedDiff.missing.join(', ') || 'none'}], unexpected=[${requestedDiff.unexpected.join(', ') || 'none'}]`
      );
    }
  }

  const deviceDiff = compareSets(actualDevices, normalizedExpectedDevices);
  if (!deviceDiff.matches) {
    failures.push(
      `devices mismatch: missing=[${deviceDiff.missing.join(', ') || 'none'}], unexpected=[${deviceDiff.unexpected.join(', ') || 'none'}]`
    );
  }

  const expectedEntryCount = normalizedExpectedStates.length * normalizedExpectedDevices.length;
  if ((summary.entryCount || 0) !== expectedEntryCount) {
    failures.push(`entryCount must be ${expectedEntryCount}, received ${summary.entryCount || 0}`);
  }
  if (actualEntries.length !== expectedEntryCount) {
    failures.push(`entries length must be ${expectedEntryCount}, received ${actualEntries.length}`);
  }

  const entryPairs = new Set(
    actualEntries
      .map((entry) => `${entry.state || 'unknown'}::${entry.device || 'unknown'}`)
  );

  normalizedExpectedStates.forEach((state) => {
    normalizedExpectedDevices.forEach((device) => {
      const pairKey = `${state}::${device}`;
      if (!entryPairs.has(pairKey)) {
        failures.push(`missing entry for ${pairKey}`);
      }
    });
  });

  return {
    status: failures.length === 0 ? 'passed' : 'failed',
    failures,
    expectedStates: normalizedExpectedStates,
    expectedDevices: normalizedExpectedDevices,
    actualStates,
    actualDevices,
    entryCount: summary.entryCount || 0,
    durationMs: summary.durationMs || 0,
  };
};

export const renderPredictionMobilePrComment = ({
  summary,
  validation,
  runUrl,
  artifactName,
}) => {
  const normalizedValidation = validation || validatePredictionMobileSummary({ summary });
  const marker = '<!-- prediction-mobile-qa -->';
  const icon = statusEmoji[normalizedValidation.status] || statusEmoji.unknown;
  const states = normalizeList(summary?.states).join(', ') || 'none';
  const devices = normalizeList(summary?.devices).join(', ') || 'none';
  const lines = [
    marker,
    `## ${icon} Frontend Prediction Mobile QA`,
    '',
    runUrl ? `- Run: [workflow run](${runUrl})` : null,
    artifactName ? `- Artifacts: \`${artifactName}\`` : null,
    `- Status: ${summary?.status || 'unknown'}`,
    `- Entries: ${summary?.entryCount || 0}`,
    `- States: ${states}`,
    `- Devices: ${devices}`,
    `- Server mode: ${summary?.serverMode || 'unknown'}`,
    `- Actionable failed requests: ${summary?.actionableFailedRequestCount || 0}`,
    `- Actionable console errors: ${summary?.actionableConsoleErrorCount || 0}`,
    `- Overflow failures: ${summary?.overflowFailureCount || 0}`,
    `- Duration: ${summary?.durationMs || 0}ms`,
  ].filter(Boolean);

  if (normalizedValidation.failures.length > 0) {
    lines.push('', '**Validation failures**');
    normalizedValidation.failures.forEach((failure) => {
      lines.push(`- ${failure}`);
    });
  }

  return `${lines.join('\n')}\n`;
};
