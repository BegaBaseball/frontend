#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');
const PROBE_SPEC = 'cypress/e2e/module-federation-probe.cy.ts';

const isRemoteMode = (args = []) => args.includes('--remote');

export const createModuleFederationProbeSmokePlan = ({
  args = [],
  env = process.env,
} = {}) => {
  const remote = isRemoteMode(args);
  const remoteEntry = env.VITE_MF_DESIGN_SYSTEM_ENTRY?.trim() ?? '';

  if (remote && !remoteEntry) {
    throw new Error('VITE_MF_DESIGN_SYSTEM_ENTRY is required for remote Module Federation probe smoke.');
  }

  const testArgs = [
    'scripts/test-e2e.mjs',
    '--host',
    '127.0.0.1',
    '--port',
    remote ? '5193' : '5192',
    '--spec',
    PROBE_SPEC,
  ];

  if (remote) {
    testArgs.push('--env', 'EXPECT_MF_REMOTE=true');
  }

  return {
    command: process.execPath,
    args: testArgs,
    env: remote
      ? {
        VITE_ENABLE_MODULE_FEDERATION: 'true',
      }
      : {
        VITE_ENABLE_MODULE_FEDERATION: '',
        VITE_MF_DESIGN_SYSTEM_ENTRY: '',
      },
  };
};

export const runModuleFederationProbeSmoke = ({
  args = process.argv.slice(2),
  env = process.env,
} = {}) => {
  const plan = createModuleFederationProbeSmokePlan({ args, env });
  const result = spawnSync(plan.command, plan.args, {
    cwd: PROJECT_ROOT,
    env: {
      ...env,
      ...plan.env,
    },
    stdio: 'inherit',
  });

  return result.status ?? 1;
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    process.exit(runModuleFederationProbeSmoke());
  } catch (error) {
    console.error(`[module-federation-probe-smoke] FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
