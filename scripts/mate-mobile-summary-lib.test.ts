import assert from 'node:assert/strict';
import test from 'node:test';

import {
  defaultMateMobileSuiteContracts,
  validateMateMobileSummary,
} from './mate-mobile-summary-lib.mjs';

const createSuite = (key: keyof typeof defaultMateMobileSuiteContracts) => {
  const suite = defaultMateMobileSuiteContracts[key];
  return {
    key,
    label: suite.label,
    status: 'passed',
    states: [...suite.states],
    devices: [...suite.devices],
    entryCount: suite.states.length * suite.devices.length,
    overflowFailureCount: 0,
    actionableFailedRequestCount: 0,
    actionableConsoleErrorCount: 0,
  };
};

const createSummary = (overrides: Record<string, unknown> = {}) => {
  const suites = Object.keys(defaultMateMobileSuiteContracts).map((key) =>
    createSuite(key as keyof typeof defaultMateMobileSuiteContracts)
  );
  const entryCount = suites.reduce((sum, suite) => sum + suite.entryCount, 0);

  return {
    suites,
    totals: {
      failedSuiteCount: 0,
      entryCount,
      overflowFailureCount: 0,
      actionableFailedRequestCount: 0,
      actionableConsoleErrorCount: 0,
    },
    ...overrides,
  };
};

test('validateMateMobileSummary passes when all suite contracts match', () => {
  const validation = validateMateMobileSummary({
    summary: createSummary(),
  });

  assert.equal(validation.status, 'passed');
  assert.deepEqual(validation.failures, []);
});

test('validateMateMobileSummary fails when a suite state is missing', () => {
  const summary = createSummary({
    suites: [
      createSuite('detail'),
      createSuite('create'),
      {
        ...createSuite('list'),
        states: defaultMateMobileSuiteContracts.list.states.filter((state) => state !== 'error-state'),
        entryCount: (defaultMateMobileSuiteContracts.list.states.length - 1) * defaultMateMobileSuiteContracts.list.devices.length,
      },
    ],
    totals: {
      failedSuiteCount: 0,
      entryCount:
        createSuite('detail').entryCount
        + createSuite('create').entryCount
        + ((defaultMateMobileSuiteContracts.list.states.length - 1) * defaultMateMobileSuiteContracts.list.devices.length),
      overflowFailureCount: 0,
      actionableFailedRequestCount: 0,
      actionableConsoleErrorCount: 0,
    },
  });

  const validation = validateMateMobileSummary({ summary });

  assert.equal(validation.status, 'failed');
  assert.match(validation.failures.join('\n'), /error-state/);
});
