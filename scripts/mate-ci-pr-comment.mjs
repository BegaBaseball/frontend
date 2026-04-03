#!/usr/bin/env node
import { loadMateCiSummaryJson, renderMateCiPrComment } from './mate-ci-pr-comment-lib.mjs';

const args = process.argv.slice(2);
const options = {
  summary: null,
  mode: null,
  runUrl: '',
  reportsArtifact: '',
  failureArtifact: '',
  secondaryArtifact: '',
};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--summary') {
    options.summary = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (arg === '--mode') {
    options.mode = args[index + 1] || null;
    index += 1;
    continue;
  }
  if (arg === '--run-url') {
    options.runUrl = args[index + 1] || '';
    index += 1;
    continue;
  }
  if (arg === '--reports-artifact') {
    options.reportsArtifact = args[index + 1] || '';
    index += 1;
    continue;
  }
  if (arg === '--failure-artifact') {
    options.failureArtifact = args[index + 1] || '';
    index += 1;
    continue;
  }
  if (arg === '--secondary-artifact') {
    options.secondaryArtifact = args[index + 1] || '';
    index += 1;
  }
}

if (!options.summary || !options.mode) {
  console.error('Usage: node scripts/mate-ci-pr-comment.mjs --summary <path> --mode <smoke|regression> [--run-url <url>] [--reports-artifact <name>] [--failure-artifact <name>] [--secondary-artifact <name>]');
  process.exit(1);
}

const summary = loadMateCiSummaryJson(options.summary);
const comment = renderMateCiPrComment({
  summary,
  mode: options.mode,
  runUrl: options.runUrl,
  reportsArtifactName: options.reportsArtifact,
  failureArtifactName: options.failureArtifact,
  secondaryArtifactName: options.secondaryArtifact || null,
});

process.stdout.write(comment);
