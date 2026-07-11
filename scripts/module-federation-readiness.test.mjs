import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { createModuleFederationReadinessReport } from './module-federation-readiness.mjs';

const REQUIRED_FILES = [
  'module-federation.config.ts',
  'vite.config.ts',
  'src/types/module-federation.d.ts',
  'src/components/moduleFederation/ModuleFederationDesignSystemProbe.tsx',
  'cypress/e2e/module-federation-probe.cy.ts',
  'scripts/module-federation-artifacts-smoke.mjs',
  'scripts/module-federation-gate.mjs',
  'scripts/module-federation-probe-smoke.mjs',
  'scripts/module-federation-remote-smoke.mjs',
  'docs/module-federation.md',
];

const REQUIRED_SCRIPTS = [
  'build:mf',
  'gate:mf',
  'readiness:mf',
  'readiness:mf:remote',
  'smoke:mf:artifacts',
  'smoke:mf:probe',
  'smoke:mf:probe:remote',
  'smoke:mf:remote',
];

const writeFixtureFile = (root, relativePath, contents = '') => {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
};

const createFixtureProject = ({ omitFile, omitScript } = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'mf-readiness-'));

  for (const relativePath of REQUIRED_FILES) {
    if (relativePath !== omitFile) {
      writeFixtureFile(root, relativePath);
    }
  }

  const scripts = Object.fromEntries(
    REQUIRED_SCRIPTS
      .filter((scriptName) => scriptName !== omitScript)
      .map((scriptName) => [scriptName, `echo ${scriptName}`]),
  );
  writeFixtureFile(root, 'package.json', JSON.stringify({ scripts }, null, 2));

  return root;
};

test('readiness reports host-ready-fallback-active when remote federation stays disabled', () => {
  const report = createModuleFederationReadinessReport({
    env: {},
    projectRoot: createFixtureProject(),
  });

  assert.equal(report.ok, true);
  assert.equal(report.hostReady, true);
  assert.equal(report.remoteEntryConfigured, false);
  assert.equal(report.remoteRequired, false);
  assert.equal(report.fallbackActive, true);
  assert.equal(report.status, 'host-ready-fallback-active');
  assert.deepEqual(report.blockers, []);
  assert.deepEqual(report.nextActions, [
    'keep VITE_MF_DESIGN_SYSTEM_ENTRY unset',
    'npm run smoke:mf:probe',
  ]);
});

test('readiness can require the remote entry for rollout checks', () => {
  const report = createModuleFederationReadinessReport({
    env: {},
    projectRoot: createFixtureProject(),
    requireRemote: true,
  });

  assert.equal(report.ok, false);
  assert.equal(report.status, 'blocked');
  assert.equal(report.remoteRequired, true);
  assert.equal(report.fallbackActive, true);
  assert.deepEqual(report.blockers, ['missing VITE_MF_DESIGN_SYSTEM_ENTRY']);
});

test('readiness reports configured remote name without exposing the entry value', () => {
  const report = createModuleFederationReadinessReport({
    env: {
      VITE_MF_DESIGN_SYSTEM_ENTRY: 'custom_design@https://cdn.example.com/design-system/mf-manifest.json',
    },
    projectRoot: createFixtureProject(),
    requireRemote: true,
  });

  assert.equal(report.ok, true);
  assert.equal(report.status, 'remote-configured');
  assert.equal(report.remoteEntryConfigured, true);
  assert.equal(report.remoteRequired, true);
  assert.equal(report.fallbackActive, false);
  assert.equal(report.remoteName, 'custom_design');
  assert.equal(Object.hasOwn(report, 'entry'), false);
});

test('readiness reports missing files and package scripts', () => {
  const report = createModuleFederationReadinessReport({
    env: {},
    projectRoot: createFixtureProject({
      omitFile: 'scripts/module-federation-probe-smoke.mjs',
      omitScript: 'smoke:mf:probe',
    }),
  });

  assert.equal(report.ok, false);
  assert.equal(report.status, 'blocked');
  assert.deepEqual(report.missingFiles, ['scripts/module-federation-probe-smoke.mjs']);
  assert.deepEqual(report.missingScripts, ['smoke:mf:probe']);
});
