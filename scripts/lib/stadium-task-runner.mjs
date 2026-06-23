import { spawnSync } from 'node:child_process';
import process from 'node:process';

export const nodeStep = (args, options = {}) => ({ command: 'node', args, ...options });

export const nodeTsxStep = (script, args = [], options = {}) => (
  nodeStep(['--import', 'tsx', script, ...args], options)
);

export const npmRunStep = (script, options = {}) => ({
  command: 'npm',
  args: ['run', script],
  ...options,
});

const taskPrefix = (context) => (context.taskLabel ? `${context.taskLabel} ` : '');

const resolveNestedTask = (context, taskName) => {
  if (context.tasks?.[taskName]) {
    return context.tasks[taskName];
  }

  if (context.legacyShellTasks?.[taskName]) {
    return [{ shellScript: context.legacyShellTasks[taskName] }];
  }

  return null;
};

const normalizeStatus = (status) => (status === null || status === undefined ? 1 : status);

const runCommandStep = (context, step, passthroughArgs) => {
  const args = step.passArgs ? [...step.args, ...passthroughArgs] : step.args;
  const result = spawnSync(step.command, args, {
    cwd: context.cwd,
    env: {
      ...process.env,
      ...(context.env ?? {}),
      ...(step.env ?? {}),
    },
    shell: false,
    stdio: step.stdio ?? context.stdio ?? 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  return normalizeStatus(result.status);
};

const runShellStep = (context, step) => {
  const result = spawnSync(step.shellScript, {
    cwd: context.cwd,
    env: {
      ...process.env,
      ...(context.env ?? {}),
      ...(step.env ?? {}),
    },
    shell: true,
    stdio: step.stdio ?? context.stdio ?? 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  return normalizeStatus(result.status);
};

const normalizeRunResult = (result) => {
  if (typeof result === 'number') {
    return result;
  }

  if (result && typeof result.status === 'number') {
    return result.status;
  }

  return 0;
};

const defaultAvailableTasks = (tasks) => Object.keys(tasks).sort();

const defaultUsageText = (scriptName, tasks) => (
  `Usage: ${scriptName} <task>\n\nTasks: status, ${defaultAvailableTasks(tasks).join(', ')}`
);

const printLines = (write, lines) => {
  lines.forEach((line) => write(line));
};

export async function runTaskSteps(context, taskName, steps, passthroughArgs = [], stack = [taskName]) {
  for (const step of steps) {
    if (step.task) {
      if (stack.includes(step.task)) {
        throw new Error(`Recursive ${taskPrefix(context)}task reference: ${[...stack, step.task].join(' -> ')}`);
      }

      const nestedTask = resolveNestedTask(context, step.task);
      if (!nestedTask) {
        throw new Error(`Unknown nested ${taskPrefix(context)}task: ${step.task}`);
      }

      const nestedStatus = await runTaskSteps(
        context,
        step.task,
        nestedTask,
        passthroughArgs,
        [...stack, step.task],
      );
      if (nestedStatus !== 0) {
        return nestedStatus;
      }
      continue;
    }

    if (step.run) {
      const status = normalizeRunResult(await step.run(passthroughArgs, { context, stack, taskName }));
      if (status !== 0) {
        return status;
      }
      continue;
    }

    const status = step.shellScript
      ? runShellStep(context, step)
      : runCommandStep(context, step, passthroughArgs);

    if (status !== 0) {
      return status;
    }
  }

  return 0;
}

export async function runTaskMapCli({
  aliases = {},
  args = process.argv.slice(2),
  context,
  enableHelp = true,
  helpText,
  onStatus,
  scriptName = 'node script',
  stderr = console.error,
  stdout = console.log,
  tasks,
  unknownTaskLines,
}) {
  const [rawTaskName = 'status', ...passthroughArgs] = args;
  const availableTasks = defaultAvailableTasks(tasks);

  if (enableHelp && (rawTaskName === '--help' || rawTaskName === '-h')) {
    stdout(helpText ?? defaultUsageText(scriptName, tasks));
    return 0;
  }

  const taskName = aliases[rawTaskName] ?? rawTaskName;

  if (taskName === 'status' && onStatus) {
    return normalizeRunResult(await onStatus(passthroughArgs, {
      rawTaskName,
      taskName,
      availableTasks,
    }));
  }

  const task = tasks[taskName];
  if (!task) {
    const lines = unknownTaskLines
      ? unknownTaskLines({ rawTaskName, taskName, availableTasks })
      : [
        `Unknown task: ${rawTaskName}`,
        `Available tasks: status, ${availableTasks.join(', ')}`,
      ];
    printLines(stderr, lines);
    return 1;
  }

  return runTaskSteps(
    context,
    taskName,
    task,
    passthroughArgs,
    [taskName],
  );
}

export function exitWithStatus(status) {
  if (status !== 0) {
    process.exit(status);
  }
}
