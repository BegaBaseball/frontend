import assert from 'node:assert/strict';
import test from 'node:test';

import {
  defaultPredictionMobileDevices,
  defaultPredictionMobileStates,
  renderPredictionMobilePrComment,
  validatePredictionMobileSummary,
} from './prediction-mobile-summary-lib.mjs';

const createSummary = (overrides: Record<string, unknown> = {}) => ({
  status: 'passed',
  serverMode: 'forced-started',
  entryCount: defaultPredictionMobileStates.length * defaultPredictionMobileDevices.length,
  overflowFailureCount: 0,
  actionableFailedRequestCount: 0,
  actionableConsoleErrorCount: 0,
  states: [...defaultPredictionMobileStates],
  requestedStates: [...defaultPredictionMobileStates],
  devices: [...defaultPredictionMobileDevices],
  durationMs: 12345,
  entries: defaultPredictionMobileStates.flatMap((state) => (
    defaultPredictionMobileDevices.map((device) => ({
      state,
      device,
      screenshotPath: `/tmp/${state}-${device}.png`,
    }))
  )),
  ...overrides,
});

test('validatePredictionMobileSummary passes when state/device matrix is complete', () => {
  const validation = validatePredictionMobileSummary({
    summary: createSummary(),
  });

  assert.equal(validation.status, 'passed');
  assert.deepEqual(validation.failures, []);
});

test('validatePredictionMobileSummary fails when a required state is missing', () => {
  const summary = createSummary({
    states: defaultPredictionMobileStates.filter((state) => state !== 'detail-not-found'),
    requestedStates: defaultPredictionMobileStates.filter((state) => state !== 'detail-not-found'),
    entryCount: (defaultPredictionMobileStates.length - 1) * defaultPredictionMobileDevices.length,
    entries: defaultPredictionMobileStates
      .filter((state) => state !== 'detail-not-found')
      .flatMap((state) => defaultPredictionMobileDevices.map((device) => ({
        state,
        device,
        screenshotPath: `/tmp/${state}-${device}.png`,
      }))),
  });
  const validation = validatePredictionMobileSummary({ summary });

  assert.equal(validation.status, 'failed');
  assert.match(validation.failures.join('\n'), /detail-not-found/);
});

test('renderPredictionMobilePrComment includes marker and validation failures', () => {
  const summary = createSummary({ status: 'failed', actionableConsoleErrorCount: 2 });
  const validation = validatePredictionMobileSummary({ summary });
  const comment = renderPredictionMobilePrComment({
    summary,
    validation,
    runUrl: 'https://example.com/run',
    artifactName: 'frontend-prediction-mobile-qa-artifacts',
  });

  assert.match(comment, /<!-- prediction-mobile-qa -->/);
  assert.match(comment, /## ❌ Frontend Prediction Mobile QA/);
  assert.match(comment, /frontend-prediction-mobile-qa-artifacts/);
  assert.match(comment, /Validation failures/);
});
