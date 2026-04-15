#!/usr/bin/env node
import {
  loadPredictionMobileSummaryJson,
  renderPredictionMobilePrComment,
  validatePredictionMobileSummary,
} from './prediction-mobile-summary-lib.mjs';

const args = process.argv.slice(2);
let summaryPath = null;
let expectedStates = null;
let expectedDevices = null;
let runUrl = null;
let artifactName = null;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--summary') {
    summaryPath = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (arg === '--expected-states') {
    expectedStates = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (arg === '--expected-devices') {
    expectedDevices = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (arg === '--run-url') {
    runUrl = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (arg === '--artifact') {
    artifactName = args[index + 1] || null;
    index += 1;
  }
}

if (!summaryPath) {
  console.error('Usage: node scripts/prediction-mobile-pr-comment.mjs --summary <path> [--expected-states a,b] [--expected-devices x,y] [--run-url <url>] [--artifact <name>]');
  process.exit(1);
}

const summary = loadPredictionMobileSummaryJson(summaryPath);
const validation = validatePredictionMobileSummary({
  summary,
  expectedStates: expectedStates || undefined,
  expectedDevices: expectedDevices || undefined,
});

process.stdout.write(renderPredictionMobilePrComment({
  summary,
  validation,
  runUrl,
  artifactName,
}));
