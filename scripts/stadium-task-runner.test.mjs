import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  nodeStep,
  runTaskMapCli,
  runTaskSteps,
} from './lib/stadium-task-runner.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');

test('passes passthrough args only when the step opts in', async () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'stadium-task-runner-'));

  try {
    writeFileSync(
      path.join(tmpDir, 'argv.mjs'),
      [
        "import { writeFileSync } from 'node:fs';",
        "writeFileSync('argv.txt', process.argv.slice(2).join('|'));",
      ].join('\n'),
    );

    const status = await runTaskSteps(
      { cwd: tmpDir, tasks: {}, stdio: 'ignore' },
      'argv',
      [nodeStep(['argv.mjs', 'base'], { passArgs: true })],
      ['extra', '--flag'],
      ['argv'],
    );

    assert.equal(status, 0);
    assert.equal(readFileSync(path.join(tmpDir, 'argv.txt'), 'utf8'), 'base|extra|--flag');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('returns the failing child exit status', async () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'stadium-task-runner-'));

  try {
    writeFileSync(path.join(tmpDir, 'exit.mjs'), 'process.exit(Number(process.argv[2]));\n');

    const status = await runTaskSteps(
      { cwd: tmpDir, tasks: {}, stdio: 'ignore' },
      'fail',
      [nodeStep(['exit.mjs', '7'])],
      [],
      ['fail'],
    );

    assert.equal(status, 7);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('rejects recursive task references with a readable chain', async () => {
  await assert.rejects(
    () => runTaskSteps(
      {
        cwd: frontendRoot,
        taskLabel: 'Test',
        tasks: {
          loop: [{ task: 'loop' }],
        },
      },
      'loop',
      [{ task: 'loop' }],
      [],
      ['loop'],
    ),
    /Recursive Test task reference: loop -> loop/,
  );
});

test('runTaskMapCli resolves aliases and routes status through a handler', async () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'stadium-task-runner-'));

  try {
    writeFileSync(
      path.join(tmpDir, 'argv.mjs'),
      [
        "import { writeFileSync } from 'node:fs';",
        "writeFileSync('argv.txt', process.argv.slice(2).join('|'));",
      ].join('\n'),
    );

    const tasks = {
      mobile: [nodeStep(['argv.mjs', 'base'], { passArgs: true })],
    };
    const statusCalls = [];

    const status = await runTaskMapCli({
      args: ['qa', 'extra'],
      aliases: { qa: 'mobile' },
      context: { cwd: tmpDir, tasks, stdio: 'ignore' },
      onStatus: (args) => {
        statusCalls.push(args);
        return 0;
      },
      tasks,
    });

    assert.equal(status, 0);
    assert.equal(readFileSync(path.join(tmpDir, 'argv.txt'), 'utf8'), 'base|extra');

    const statusOnly = await runTaskMapCli({
      args: ['status', '--json'],
      context: { cwd: tmpDir, tasks, stdio: 'ignore' },
      onStatus: (args) => {
        statusCalls.push(args);
        return 0;
      },
      tasks,
    });

    assert.equal(statusOnly, 0);
    assert.deepEqual(statusCalls, [['--json']]);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('runTaskMapCli prints configured unknown task output and returns failure status', async () => {
  const errors = [];
  const tasks = {
    mobile: [nodeStep(['noop.mjs'])],
  };

  const status = await runTaskMapCli({
    args: ['missing'],
    context: { cwd: frontendRoot, tasks, stdio: 'ignore' },
    stderr: (message) => errors.push(message),
    tasks,
    unknownTaskLines: ({ rawTaskName, availableTasks }) => [
      `Unknown Test task: ${rawTaskName}`,
      `Available tasks: status, ${availableTasks.join(', ')}`,
    ],
  });

  assert.equal(status, 1);
  assert.deepEqual(errors, [
    'Unknown Test task: missing',
    'Available tasks: status, mobile',
  ]);
});

test('incheon direct wrapper status matches the central dispatcher', () => {
  const central = spawnSync(process.execPath, ['scripts/stadium-seatmap-ops.mjs', 'incheon', 'status'], {
    cwd: frontendRoot,
    encoding: 'utf8',
  });
  const wrapper = spawnSync(process.execPath, ['scripts/incheon-seatmap-ops.mjs', 'status'], {
    cwd: frontendRoot,
    encoding: 'utf8',
  });

  assert.equal(wrapper.status, central.status);
  assert.equal(wrapper.stderr, central.stderr);
  assert.deepEqual(JSON.parse(wrapper.stdout), JSON.parse(central.stdout));
});

test('incheon direct wrapper unknown task output matches the central dispatcher', () => {
  const central = spawnSync(process.execPath, ['scripts/stadium-seatmap-ops.mjs', 'incheon', 'unknown-task'], {
    cwd: frontendRoot,
    encoding: 'utf8',
  });
  const wrapper = spawnSync(process.execPath, ['scripts/incheon-seatmap-ops.mjs', 'unknown-task'], {
    cwd: frontendRoot,
    encoding: 'utf8',
  });

  assert.equal(wrapper.status, central.status);
  assert.equal(wrapper.stdout, central.stdout);
  assert.equal(wrapper.stderr, central.stderr);
});
