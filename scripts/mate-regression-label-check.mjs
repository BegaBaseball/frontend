#!/usr/bin/env node
import { loadFullMateRegressionGlobs, findFullMateRegressionMatches, FULL_MATE_REGRESSION_LABEL } from './mate-regression-label-policy.mjs';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const changedFiles = args.filter((arg) => arg !== '--json');

if (changedFiles.length === 0) {
  console.error('Usage: node scripts/mate-regression-label-check.mjs [--json] <changed-file> [changed-file...]');
  process.exit(1);
}

const globs = loadFullMateRegressionGlobs();
const matches = findFullMateRegressionMatches(changedFiles, globs);
const shouldApply = matches.length > 0;

if (asJson) {
  process.stdout.write(`${JSON.stringify({
    label: FULL_MATE_REGRESSION_LABEL,
    shouldApply,
    matches,
  }, null, 2)}\n`);
  process.exit(shouldApply ? 0 : 2);
}

console.log(`${FULL_MATE_REGRESSION_LABEL}: ${shouldApply ? 'apply' : 'skip'}`);
if (matches.length > 0) {
  console.log('Matched files:');
  for (const filePath of matches) {
    console.log(`- ${filePath}`);
  }
}

process.exit(shouldApply ? 0 : 2);
