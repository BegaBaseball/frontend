import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const defaultMateMobileSuiteContracts = {
  detail: {
    label: 'MateDetail',
    states: ['pending', 'matched', 'host'],
    devices: ['iphone-se', 'iphone-12', 'galaxy-s9-plus', 'pixel-7'],
  },
  create: {
    label: 'MateCreate',
    states: ['step1-idle', 'step2-schedule', 'step2-manual', 'step3-seat', 'step4-description', 'submit-blocked'],
    devices: ['iphone-se', 'iphone-12'],
  },
  list: {
    label: 'MateList',
    states: ['default', 'guide-open', 'selling-tab', 'search-filter', 'date-filter', 'page-2', 'selling-empty', 'error-state'],
    devices: ['iphone-se', 'iphone-12'],
  },
};

const normalizeList = (value) => (
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : []
);

const compareSets = (actualItems, expectedItems) => {
  const actual = new Set(actualItems);
  const expected = new Set(expectedItems);
  return {
    missing: expectedItems.filter((item) => !actual.has(item)),
    unexpected: actualItems.filter((item) => !expected.has(item)),
  };
};

export const loadMateMobileSummaryJson = (summaryPath, cwd = process.cwd()) =>
  JSON.parse(readFileSync(resolve(cwd, summaryPath), 'utf8'));

export const validateMateMobileSummary = ({
  summary,
  expectedSuiteContracts = defaultMateMobileSuiteContracts,
} = {}) => {
  if (!summary || typeof summary !== 'object') {
    return {
      status: 'failed',
      failures: ['mate mobile summary is missing or unreadable'],
    };
  }

  const suites = Array.isArray(summary.suites) ? summary.suites : [];
  const totals = summary.totals && typeof summary.totals === 'object' ? summary.totals : {};
  const failures = [];

  if ((totals.failedSuiteCount || 0) !== 0) {
    failures.push(`failedSuiteCount must be 0, received ${totals.failedSuiteCount || 0}`);
  }
  if ((totals.overflowFailureCount || 0) !== 0) {
    failures.push(`overflow failures must be 0, received ${totals.overflowFailureCount || 0}`);
  }
  if ((totals.actionableFailedRequestCount || 0) !== 0) {
    failures.push(`actionable failed requests must be 0, received ${totals.actionableFailedRequestCount || 0}`);
  }
  if ((totals.actionableConsoleErrorCount || 0) !== 0) {
    failures.push(`actionable console errors must be 0, received ${totals.actionableConsoleErrorCount || 0}`);
  }

  const suiteMap = new Map(suites.map((suite) => [suite.key, suite]));
  const expectedSuiteKeys = Object.keys(expectedSuiteContracts);
  const actualSuiteKeys = suites.map((suite) => suite.key).filter(Boolean);
  const suiteDiff = compareSets(actualSuiteKeys, expectedSuiteKeys);
  if (suiteDiff.missing.length > 0 || suiteDiff.unexpected.length > 0) {
    failures.push(
      `suite keys mismatch: missing=[${suiteDiff.missing.join(', ') || 'none'}], unexpected=[${suiteDiff.unexpected.join(', ') || 'none'}]`
    );
  }

  expectedSuiteKeys.forEach((suiteKey) => {
    const expected = expectedSuiteContracts[suiteKey];
    const actual = suiteMap.get(suiteKey);

    if (!actual) {
      return;
    }

    if (actual.status !== 'passed') {
      failures.push(`${suiteKey} status must be passed, received ${actual.status || 'unknown'}`);
    }
    if ((actual.overflowFailureCount || 0) !== 0) {
      failures.push(`${suiteKey} overflow failures must be 0, received ${actual.overflowFailureCount || 0}`);
    }
    if ((actual.actionableFailedRequestCount || 0) !== 0) {
      failures.push(`${suiteKey} actionable failed requests must be 0, received ${actual.actionableFailedRequestCount || 0}`);
    }
    if ((actual.actionableConsoleErrorCount || 0) !== 0) {
      failures.push(`${suiteKey} actionable console errors must be 0, received ${actual.actionableConsoleErrorCount || 0}`);
    }

    const actualStates = normalizeList(actual.states);
    const actualDevices = normalizeList(actual.devices);
    const stateDiff = compareSets(actualStates, expected.states);
    const deviceDiff = compareSets(actualDevices, expected.devices);
    if (stateDiff.missing.length > 0 || stateDiff.unexpected.length > 0) {
      failures.push(
        `${suiteKey} states mismatch: missing=[${stateDiff.missing.join(', ') || 'none'}], unexpected=[${stateDiff.unexpected.join(', ') || 'none'}]`
      );
    }
    if (deviceDiff.missing.length > 0 || deviceDiff.unexpected.length > 0) {
      failures.push(
        `${suiteKey} devices mismatch: missing=[${deviceDiff.missing.join(', ') || 'none'}], unexpected=[${deviceDiff.unexpected.join(', ') || 'none'}]`
      );
    }

    const expectedEntryCount = expected.states.length * expected.devices.length;
    if ((actual.entryCount || 0) !== expectedEntryCount) {
      failures.push(`${suiteKey} entryCount must be ${expectedEntryCount}, received ${actual.entryCount || 0}`);
    }
  });

  const expectedEntryCount = expectedSuiteKeys.reduce((sum, suiteKey) => {
    const expected = expectedSuiteContracts[suiteKey];
    return sum + (expected.states.length * expected.devices.length);
  }, 0);
  if ((totals.entryCount || 0) !== expectedEntryCount) {
    failures.push(`total entryCount must be ${expectedEntryCount}, received ${totals.entryCount || 0}`);
  }

  return {
    status: failures.length === 0 ? 'passed' : 'failed',
    failures,
    suiteCount: suites.length,
    entryCount: totals.entryCount || 0,
    actualSuiteKeys,
  };
};
