import assert from 'node:assert/strict';
import test from 'node:test';

import { createModuleFederationProbeSmokePlan } from './module-federation-probe-smoke.mjs';

test('fallback probe smoke clears remote configuration before starting Cypress', () => {
  const plan = createModuleFederationProbeSmokePlan({
    env: {
      VITE_MF_DESIGN_SYSTEM_ENTRY: 'design_system@https://cdn.example.com/mf-manifest.json',
      VITE_ENABLE_MODULE_FEDERATION: 'true',
    },
  });

  assert.equal(plan.command, process.execPath);
  assert.deepEqual(plan.args, [
    'scripts/test-e2e.mjs',
    '--host',
    '127.0.0.1',
    '--port',
    '5192',
    '--spec',
    'cypress/e2e/module-federation-probe.cy.ts',
  ]);
  assert.deepEqual(plan.env, {
    VITE_ENABLE_MODULE_FEDERATION: '',
    VITE_MF_DESIGN_SYSTEM_ENTRY: '',
  });
});

test('remote probe smoke requires a configured design_system remote entry', () => {
  assert.throws(
    () => createModuleFederationProbeSmokePlan({
      args: ['--remote'],
      env: {},
    }),
    /VITE_MF_DESIGN_SYSTEM_ENTRY is required/,
  );
});

test('remote probe smoke enables Module Federation and asserts remote mode in Cypress', () => {
  const plan = createModuleFederationProbeSmokePlan({
    args: ['--remote'],
    env: {
      VITE_MF_DESIGN_SYSTEM_ENTRY: 'design_system@https://cdn.example.com/mf-manifest.json',
    },
  });

  assert.deepEqual(plan.args, [
    'scripts/test-e2e.mjs',
    '--host',
    '127.0.0.1',
    '--port',
    '5193',
    '--spec',
    'cypress/e2e/module-federation-probe.cy.ts',
    '--env',
    'EXPECT_MF_REMOTE=true',
  ]);
  assert.deepEqual(plan.env, {
    VITE_ENABLE_MODULE_FEDERATION: 'true',
  });
});
