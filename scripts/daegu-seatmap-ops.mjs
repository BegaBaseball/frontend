import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  exitWithStatus,
  nodeStep,
  npmRunStep,
  runTaskMapCli,
} from './lib/stadium-task-runner.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');

const TASKS = {
  mobile: [nodeStep(['scripts/run-stadium-isolated-qa.mjs', 'DAEGU'])],
  full: [nodeStep(['scripts/run-stadium-isolated-qa.mjs', 'DAEGU:FULL'])],
  'pixel-components': [nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'pixel-components'])],
  'trace-manifest': [{ task: 'pixel-components' }, nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'trace-manifest'])],
  'alignment-audit': [{ task: 'pixel-components' }, nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'alignment-audit'])],
  'operator-handoff': [
    { task: 'pixel-components' },
    nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'trace-manifest']),
    nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'operator-handoff']),
  ],
  'handoff-evidence': [
    { task: 'pixel-components' },
    nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'trace-manifest']),
    nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'operator-handoff']),
    nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'handoff-evidence']),
  ],
  'source-baseline-audit': [nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-source-baseline-audit.mjs'])],
  'canonical-decision-table': [nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-canonical-decision-table.mjs'])],
  'qa-ownership-audit': [nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-qa-ownership-audit.mjs'])],
  'canonical-block-decision-guard': [nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-canonical-block-decision-guard.mjs'])],
  'canonical-official-only-retrace-workset': [nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-canonical-official-only-retrace-workset.mjs'])],
  'canonical-retrace-batch': [nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-canonical-retrace-batch.mjs', 'batch'], { passArgs: true })],
  'canonical-retrace-gate': [nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-canonical-retrace-batch.mjs', 'gate'], { passArgs: true })],
  'canonical-retrace-gate:require-approved': [nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-canonical-retrace-batch.mjs', 'gate', '--require-approved'], { passArgs: true })],
  'precision-audit': [{ task: 'alignment-audit' }, { task: 'handoff-evidence' }, nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-precision-audit.mjs'], { passArgs: true })],
  'render-safety-audit': [{ task: 'precision-audit' }, nodeStep(['--import', 'tsx', 'scripts/daegu-seatmap-render-safety-audit.mjs'], { passArgs: true })],
  'release-lock': [npmRunStep('qa:stadium:daegu:release-lock', { passArgs: true })],
};

const TASK_ALIASES = { qa: 'mobile', 'release-gate': 'release-lock' };

function printStatus() {
  console.log(JSON.stringify({
    stadium: 'daegu',
    label: 'Daegu Samsung Lions Park',
    status: 'canonical-runtime-release-entrypoint',
    tasks: Object.keys(TASKS).sort(),
    retainedScriptFiles: [
      'daegu-seatmap-core-qa.mjs',
      'daegu-seatmap-source-baseline-audit.mjs',
      'daegu-seatmap-canonical-decision-table.mjs',
      'daegu-seatmap-qa-ownership-audit.mjs',
      'daegu-seatmap-canonical-block-decision-guard.mjs',
      'daegu-seatmap-canonical-official-only-retrace-workset.mjs',
      'daegu-seatmap-canonical-retrace-batch.mjs',
      'daegu-seatmap-precision-audit.mjs',
      'daegu-seatmap-render-safety-audit.mjs',
      'daegu-seatmap-ops.mjs',
    ],
    cleanupPolicy: 'historical operator-reference stage scripts are recoverable from Git history only',
  }, null, 2));
}

const [rawTaskName = 'status', ...passthroughArgs] = process.argv.slice(2);
const status = await runTaskMapCli({
  aliases: TASK_ALIASES,
  args: [rawTaskName, ...passthroughArgs],
  context: {
    cwd: frontendRoot,
    taskLabel: 'Daegu',
    tasks: TASKS,
  },
  helpText: 'Usage: node scripts/daegu-seatmap-ops.mjs <task>\n\nTasks: status, ' + Object.keys(TASKS).sort().join(', '),
  onStatus: () => {
    printStatus();
    return 0;
  },
  tasks: TASKS,
  unknownTaskLines: ({ rawTaskName: unknownTaskName, availableTasks }) => [
    'Unknown Daegu task: ' + unknownTaskName,
    'Available tasks: status, ' + availableTasks.join(', '),
  ],
});
exitWithStatus(status);
