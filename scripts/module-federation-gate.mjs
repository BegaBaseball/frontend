#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const hasRemoteEntry = (env = process.env) => Boolean(env.VITE_MF_DESIGN_SYSTEM_ENTRY?.trim());

export const createModuleFederationGateSteps = (env = process.env) => {
  const steps = [
    {
      label: 'check Module Federation readiness',
      command: npmCommand,
      args: [
        'run',
        'readiness:mf',
        '--',
        '--report',
        'reports/module-federation-readiness.json',
      ],
    },
    {
      label: 'build Module Federation artifacts',
      command: npmCommand,
      args: ['run', 'build:mf'],
    },
    {
      label: 'smoke Module Federation artifacts',
      command: npmCommand,
      args: [
        'run',
        'smoke:mf:artifacts',
        '--',
        '--report',
        'reports/module-federation-artifacts-smoke.json',
      ],
    },
  ];

  if (hasRemoteEntry(env)) {
    steps.push({
      label: 'smoke design_system remote entry',
      command: npmCommand,
      args: [
        'run',
        'smoke:mf:remote',
        '--',
        '--report',
        'reports/module-federation-remote-smoke.json',
      ],
    });
  }

  return steps;
};

const runStep = (step) => new Promise((resolveStep, rejectStep) => {
  console.log(`[module-federation-gate] ${step.label}`);
  const child = spawn(step.command, step.args, {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio: 'inherit',
  });

  child.on('error', rejectStep);
  child.on('close', (code, signal) => {
    if (code === 0) {
      resolveStep();
      return;
    }

    rejectStep(new Error(`${step.label} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`));
  });
});

export const runModuleFederationGate = async (env = process.env) => {
  const steps = createModuleFederationGateSteps(env);
  for (const step of steps) {
    await runStep(step);
  }

  if (!hasRemoteEntry(env)) {
    console.log('[module-federation-gate] VITE_MF_DESIGN_SYSTEM_ENTRY is unset; skipped remote entry smoke.');
  }
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    await runModuleFederationGate();
  } catch (error) {
    console.error(`[module-federation-gate] FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
