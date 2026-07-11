import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createModuleFederationGateSteps,
} from './module-federation-gate.mjs';

const stepSignatures = (env) => createModuleFederationGateSteps(env).map((step) => ({
  label: step.label,
  args: step.args,
}));

test('Module Federation gate always builds and validates local artifacts', () => {
  assert.deepEqual(stepSignatures({}), [
    {
      label: 'check Module Federation readiness',
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
      args: ['run', 'build:mf'],
    },
    {
      label: 'smoke Module Federation artifacts',
      args: [
        'run',
        'smoke:mf:artifacts',
        '--',
        '--report',
        'reports/module-federation-artifacts-smoke.json',
      ],
    },
  ]);
});

test('Module Federation gate adds remote smoke for a configured remoteEntry.js', () => {
  assert.deepEqual(stepSignatures({
    VITE_MF_DESIGN_SYSTEM_ENTRY: ' design_system@https://cdn.example.com/design-system/remoteEntry.js ',
  }), [
    {
      label: 'check Module Federation readiness',
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
      args: ['run', 'build:mf'],
    },
    {
      label: 'smoke Module Federation artifacts',
      args: [
        'run',
        'smoke:mf:artifacts',
        '--',
        '--report',
        'reports/module-federation-artifacts-smoke.json',
      ],
    },
    {
      label: 'smoke design_system remote entry',
      args: [
        'run',
        'smoke:mf:remote',
        '--',
        '--report',
        'reports/module-federation-remote-smoke.json',
      ],
    },
  ]);
});
