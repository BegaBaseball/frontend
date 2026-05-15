import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSajikSeatMapDataset,
  validateSajikSeatMapDataset,
} from '../src/data/sajikSeatMapDataset.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultOutputPath = path.join(frontendRoot, 'reports/stadium/sajik-seatmap-dataset.json');

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const shouldCheckOnly = process.argv.includes('--check');
const shouldPrintStdout = process.argv.includes('--stdout');
const outputPath = path.resolve(frontendRoot, argValue('--out', defaultOutputPath));

const dataset = buildSajikSeatMapDataset();
const issues = validateSajikSeatMapDataset(dataset);

if (issues.length > 0) {
  console.error(`Sajik seatmap dataset validation failed (${issues.length})`);
  issues.slice(0, 30).forEach((issue) => console.error(`- ${issue}`));
  if (issues.length > 30) {
    console.error(`- ... ${issues.length - 30} more`);
  }
  process.exitCode = 1;
} else if (shouldPrintStdout) {
  process.stdout.write(`${JSON.stringify(dataset, null, 2)}\n`);
} else if (shouldCheckOnly) {
  console.log([
    'Sajik seatmap dataset validation passed',
    `sections=${dataset.summary.totalSections}`,
    `enabled=${dataset.summary.enabledSections}`,
    `aliasOnly=${dataset.summary.aliasOnlySections}`,
    `markers=${dataset.summary.markers}`,
    `mapVersion=${dataset.mapVersion}`,
  ].join(' '));
} else {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
  console.log([
    `Wrote ${path.relative(frontendRoot, outputPath)}`,
    `sections=${dataset.summary.totalSections}`,
    `enabled=${dataset.summary.enabledSections}`,
    `aliasOnly=${dataset.summary.aliasOnlySections}`,
    `markers=${dataset.summary.markers}`,
    `mapVersion=${dataset.mapVersion}`,
  ].join(' '));
}
