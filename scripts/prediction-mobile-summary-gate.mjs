#!/usr/bin/env node
import {
  defaultPredictionMobileDevices,
  defaultPredictionMobileStates,
  loadPredictionMobileSummaryJson,
  validatePredictionMobileSummary,
} from './prediction-mobile-summary-lib.mjs';

const args = process.argv.slice(2);
let summaryPath = null;
let expectedStates = defaultPredictionMobileStates;
let expectedDevices = defaultPredictionMobileDevices;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--summary') {
    summaryPath = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (arg === '--expected-states') {
    expectedStates = args[index + 1] || '';
    index += 1;
    continue;
  }
  if (arg === '--expected-devices') {
    expectedDevices = args[index + 1] || '';
    index += 1;
  }
}

if (!summaryPath) {
  console.error('Usage: node scripts/prediction-mobile-summary-gate.mjs --summary <path> [--expected-states a,b] [--expected-devices x,y]');
  process.exit(1);
}

const summary = loadPredictionMobileSummaryJson(summaryPath);
const validation = validatePredictionMobileSummary({
  summary,
  expectedStates,
  expectedDevices,
});

const lines = [
  `summary: ${summaryPath}`,
  `status: ${validation.status}`,
  `entries: ${validation.entryCount}`,
  `states: ${validation.actualStates.join(', ') || 'none'}`,
  `devices: ${validation.actualDevices.join(', ') || 'none'}`,
];

if (validation.failures.length > 0) {
  lines.push('failures:');
  validation.failures.forEach((failure) => {
    lines.push(`- ${failure}`);
  });
}

process.stdout.write(`${lines.join('\n')}\n`);

if (validation.status !== 'passed') {
  process.exit(1);
}
