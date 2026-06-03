import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');

const nodeStep = (args, options = {}) => ({ command: 'node', args, ...options });
const npmRunStep = (script, options = {}) => ({ command: 'npm', args: ['run', script], ...options });

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

function runSteps(steps, passthroughArgs, stack) {
  steps.forEach((step) => runStep(step, passthroughArgs, stack));
}

function runStep(step, passthroughArgs, stack) {
  if (step.task) {
    if (stack.includes(step.task)) {
      throw new Error('Recursive Daegu task reference: ' + [...stack, step.task].join(' -> '));
    }
    const nestedTask = TASKS[step.task];
    if (!nestedTask) throw new Error('Unknown nested Daegu task: ' + step.task);
    runSteps(nestedTask, passthroughArgs, [...stack, step.task]);
    return;
  }

  const args = step.passArgs ? [...step.args, ...passthroughArgs] : step.args;
  const result = spawnSync(step.command, args, {
    cwd: frontendRoot,
    env: process.env,
    shell: false,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const [rawTaskName = 'status', ...passthroughArgs] = process.argv.slice(2);
const taskName = TASK_ALIASES[rawTaskName] ?? rawTaskName;

if (rawTaskName === '--help' || rawTaskName === '-h') {
  console.log('Usage: node scripts/daegu-seatmap-ops.mjs <task>\n\nTasks: status, ' + Object.keys(TASKS).sort().join(', '));
  process.exit(0);
}

if (taskName === 'status') {
  printStatus();
  process.exit(0);
}

const task = TASKS[taskName];
if (!task) {
  console.error('Unknown Daegu task: ' + rawTaskName);
  console.error('Available tasks: status, ' + Object.keys(TASKS).sort().join(', '));
  process.exit(1);
}

runSteps(task, passthroughArgs, [taskName]);
