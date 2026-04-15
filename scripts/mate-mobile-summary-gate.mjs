#!/usr/bin/env node
import {
  loadMateMobileSummaryJson,
  validateMateMobileSummary,
} from './mate-mobile-summary-lib.mjs';

const args = process.argv.slice(2);
let summaryPath = null;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--summary') {
    summaryPath = args[index + 1] || null;
    index += 1;
  }
}

if (!summaryPath) {
  console.error('Usage: node scripts/mate-mobile-summary-gate.mjs --summary <path>');
  process.exit(1);
}

const summary = loadMateMobileSummaryJson(summaryPath);
const validation = validateMateMobileSummary({ summary });

const lines = [
  `summary: ${summaryPath}`,
  `status: ${validation.status}`,
  `suites: ${validation.suiteCount}`,
  `entries: ${validation.entryCount}`,
  `suiteKeys: ${validation.actualSuiteKeys.join(', ') || 'none'}`,
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
