#!/usr/bin/env node
import { buildMateCiSummary, writeMateCiSummaryOutputs } from './mate-ci-summary-lib.mjs';

const args = process.argv.slice(2);
const workflow = args[0];
let jsonOutputPath = null;
let markdownOutputPath = null;

for (let index = 1; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--json') {
    jsonOutputPath = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (arg === '--markdown') {
    markdownOutputPath = args[index + 1] || null;
    index += 1;
  }
}

if (!workflow || !['smoke', 'regression'].includes(workflow)) {
  console.error('Usage: node scripts/mate-ci-summary.mjs <smoke|regression>');
  process.exit(1);
}

const summary = buildMateCiSummary({ workflow });
const markdown = writeMateCiSummaryOutputs({
  summary,
  jsonOutputPath,
  markdownOutputPath,
});

process.stdout.write(markdown);
