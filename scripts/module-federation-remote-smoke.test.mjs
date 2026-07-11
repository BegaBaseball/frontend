import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_EXPECTED_EXPOSES,
  createRemoteSmokeReport,
  extractExposeNames,
  normalizeExposeName,
  resolveEntryType,
  resolveRemoteEntry,
  validateRemoteEntrySource,
  validateRemoteManifest,
} from './module-federation-remote-smoke.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');

const expectedRemoteModules = () => DEFAULT_EXPECTED_EXPOSES.map((exposeName) => (
  `design_system/${exposeName.replace(/^\.\//, '')}`
)).sort();

test('resolves name-prefixed manifest entries without splitting URL credentials', () => {
  assert.deepEqual(resolveRemoteEntry('design_system@https://cdn.example.com/mf-manifest.json'), {
    name: 'design_system',
    entry: 'https://cdn.example.com/mf-manifest.json',
  });

  assert.deepEqual(resolveRemoteEntry('https://user@example.com/mf-manifest.json'), {
    name: 'design_system',
    entry: 'https://user@example.com/mf-manifest.json',
  });
});

test('normalizes host import ids and expose ids to manifest expose keys', () => {
  assert.equal(normalizeExposeName('design_system/Button'), './Button');
  assert.equal(normalizeExposeName('./Modal'), './Modal');
  assert.equal(normalizeExposeName('ThemeProvider'), './ThemeProvider');
});

test('classifies manifest and JavaScript entries with URL query strings', () => {
  assert.equal(
    resolveEntryType('https://cdn.example.com/mf-manifest.json?version=42'),
    'manifest',
  );
  assert.equal(
    resolveEntryType('https://cdn.example.com/remoteEntry.js?version=42'),
    'remote-entry',
  );
});

test('recognizes minified aliases exported as Module Federation container names', () => {
  assert.deepEqual(
    validateRemoteEntrySource('const a=()=>{};const b=()=>{};export{a as get,b as init};'),
    {
      ok: true,
      containerExports: ['get', 'init'],
      missingContainerExports: [],
    },
  );
});

test('extracts exposes from object-shaped manifests', () => {
  assert.deepEqual(extractExposeNames({
    exposes: {
      './Button': {},
      './Modal': {},
    },
  }), ['./Button', './Modal']);
});

test('extracts exposes from array-shaped manifests', () => {
  assert.deepEqual(extractExposeNames({
    exposes: [
      { id: 'design_system:Button' },
      { name: './Modal' },
      { moduleName: 'ThemeProvider' },
    ],
  }), ['./Button', './Modal', './ThemeProvider']);
});

test('validates expected remote design system exposes', () => {
  assert.deepEqual(validateRemoteManifest({
    exposes: [
      { name: 'Button' },
      { name: 'Modal' },
      { name: 'ThemeProvider' },
    ],
  }), {
    ok: true,
    expectedExposes: ['./Button', './Modal', './ThemeProvider'],
    exposedModules: ['./Button', './Modal', './ThemeProvider'],
    missingExposes: [],
  });
});

test('reports missing expected exposes', () => {
  assert.deepEqual(validateRemoteManifest({
    exposes: {
      './Button': {},
    },
  }), {
    ok: false,
    expectedExposes: ['./Button', './Modal', './ThemeProvider'],
    exposedModules: ['./Button'],
    missingExposes: ['./Modal', './ThemeProvider'],
  });
});

test('loads and validates a fetched manifest entry', async () => {
  const fetchImpl = async (url) => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      name: 'design_system',
      exposes: {
        './Button': {},
        './Modal': {},
        './ThemeProvider': {},
      },
      url,
    }),
  });

  const report = await createRemoteSmokeReport({
    rawEntry: 'manifest_design_system@https://cdn.example.com/mf-manifest.json',
    fetchImpl,
  });

  assert.equal(report.ok, true);
  assert.equal(report.remoteName, 'manifest_design_system');
  assert.equal(report.entry, 'https://cdn.example.com/mf-manifest.json');
  assert.deepEqual(report.missingExposes, []);
});

test('validates an ESM remoteEntry container when a JavaScript entry is configured', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    text: async () => [
      'const get = async (moduleName) => moduleName;',
      'const init = (shareScope) => shareScope;',
      'export { get, init };',
    ].join('\n'),
  });

  const report = await createRemoteSmokeReport({
    rawEntry: 'https://cdn.example.com/remoteEntry.js',
    fetchImpl,
  });

  assert.equal(report.ok, true);
  assert.equal(report.entryType, 'remote-entry');
  assert.equal(report.exposesVerified, false);
  assert.deepEqual(report.containerExports, ['get', 'init']);
});

test('rejects a JavaScript entry without Module Federation container exports', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    text: async () => '<!doctype html><title>Not found</title>',
  });

  const report = await createRemoteSmokeReport({
    rawEntry: 'https://cdn.example.com/remoteEntry.js',
    fetchImpl,
  });

  assert.equal(report.ok, false);
  assert.equal(report.entryType, 'remote-entry');
  assert.match(report.error, /get and init exports/);
});

test('default remote smoke exposes stay aligned with host type declarations', async () => {
  const declarationText = await readFile(resolve(PROJECT_ROOT, 'src/types/module-federation.d.ts'), 'utf8');
  const declaredModules = Array.from(declarationText.matchAll(/declare module '([^']+)'/g))
    .map((match) => match[1])
    .sort();

  assert.deepEqual(declaredModules, expectedRemoteModules());
});

test('Module Federation docs list every default remote smoke contract module', async () => {
  const docs = await readFile(resolve(PROJECT_ROOT, 'docs/module-federation.md'), 'utf8');

  for (const remoteModule of expectedRemoteModules()) {
    assert.ok(
      docs.includes(remoteModule),
      `docs/module-federation.md must mention ${remoteModule}`,
    );
  }

  for (const exposeName of DEFAULT_EXPECTED_EXPOSES) {
    assert.ok(
      docs.includes(exposeName),
      `docs/module-federation.md must mention ${exposeName}`,
    );
  }
});
