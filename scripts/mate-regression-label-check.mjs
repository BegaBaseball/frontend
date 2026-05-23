#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { loadFullMateRegressionGlobs, findFullMateRegressionMatches, FULL_MATE_REGRESSION_LABEL } from './mate-regression-label-policy.mjs';

const args = process.argv.slice(2);
let asJson = false;
let changedFilesPath = null;
const inlineChangedFiles = [];

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--json') {
    asJson = true;
    continue;
  }
  if (arg === '--file') {
    changedFilesPath = args[index + 1] ?? null;
    index += 1;
    continue;
  }
  inlineChangedFiles.push(arg);
}

const fileChangedFiles = changedFilesPath
  ? readFileSync(changedFilesPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  : [];
const changedFiles = [...inlineChangedFiles, ...fileChangedFiles];

if (changedFiles.length === 0) {
  console.error('Usage: node scripts/mate-regression-label-check.mjs [--json] [--file <changed-files.txt>] <changed-file> [changed-file...]');
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
