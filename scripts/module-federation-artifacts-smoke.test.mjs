import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  createModuleFederationArtifactsSmokeReport,
} from './module-federation-artifacts-smoke.mjs';

const writeFixtureArtifacts = async (distDir) => {
  await mkdir(join(distDir, 'assets'), { recursive: true });
  await mkdir(join(distDir, 'begabaseball_frontend'), { recursive: true });

  await writeFile(join(distDir, 'mf-manifest.json'), JSON.stringify({ name: 'bega_frontend' }), 'utf8');
  await writeFile(join(distDir, 'mf-stats.json'), JSON.stringify({ chunks: [] }), 'utf8');
  await writeFile(join(distDir, 'assets/mf-entry-bootstrap-test.js'), 'export {};\n', 'utf8');
  await writeFile(join(distDir, 'begabaseball_frontend/remoteEntry.js'), 'export const init = () => {};\n', 'utf8');
  await writeFile(join(distDir, 'begabaseball_frontend/mf-manifest.json'), JSON.stringify({ name: 'bega_frontend' }), 'utf8');
  await writeFile(join(distDir, 'begabaseball_frontend/mf-stats.json'), JSON.stringify({ chunks: [] }), 'utf8');
};

test('Module Federation artifact smoke accepts a complete MF build shape', async () => {
  const distDir = await mkdtemp(join(tmpdir(), 'mf-artifacts-complete-'));
  await writeFixtureArtifacts(distDir);

  const report = await createModuleFederationArtifactsSmokeReport({ distDir });

  assert.equal(report.ok, true);
  assert.equal(report.failedArtifacts.length, 0);
  assert.equal(report.counts.bootstrapAssets, 1);
  assert.equal(report.counts.checkedArtifacts, 6);
});

test('Module Federation artifact smoke reports missing bootstrap assets', async () => {
  const distDir = await mkdtemp(join(tmpdir(), 'mf-artifacts-missing-bootstrap-'));
  await writeFixtureArtifacts(distDir);
  await writeFile(join(distDir, 'assets/other.js'), 'export {};\n', 'utf8');
  await writeFile(join(distDir, 'assets/mf-entry-bootstrap-test.js'), '', 'utf8');

  const report = await createModuleFederationArtifactsSmokeReport({ distDir });

  assert.equal(report.ok, false);
  assert.ok(report.failedArtifacts.some((artifact) => (
    artifact.label === 'clientBootstrap' && artifact.error === 'empty file'
  )));
});

test('Module Federation artifact smoke reports invalid JSON metadata', async () => {
  const distDir = await mkdtemp(join(tmpdir(), 'mf-artifacts-invalid-json-'));
  await writeFixtureArtifacts(distDir);
  await writeFile(join(distDir, 'mf-manifest.json'), 'not json', 'utf8');

  const report = await createModuleFederationArtifactsSmokeReport({ distDir });

  assert.equal(report.ok, false);
  assert.ok(report.failedArtifacts.some((artifact) => (
    artifact.label === 'clientManifest' && artifact.error.startsWith('invalid JSON')
  )));
});

test('Module Federation artifact smoke reports missing worker remote entry', async () => {
  const distDir = await mkdtemp(join(tmpdir(), 'mf-artifacts-missing-remote-'));
  await mkdir(join(distDir, 'assets'), { recursive: true });
  await mkdir(join(distDir, 'begabaseball_frontend'), { recursive: true });

  await writeFile(join(distDir, 'mf-manifest.json'), JSON.stringify({ name: 'bega_frontend' }), 'utf8');
  await writeFile(join(distDir, 'mf-stats.json'), JSON.stringify({ chunks: [] }), 'utf8');
  await writeFile(join(distDir, 'assets/mf-entry-bootstrap-test.js'), 'export {};\n', 'utf8');
  await writeFile(join(distDir, 'begabaseball_frontend/mf-manifest.json'), JSON.stringify({ name: 'bega_frontend' }), 'utf8');
  await writeFile(join(distDir, 'begabaseball_frontend/mf-stats.json'), JSON.stringify({ chunks: [] }), 'utf8');

  const report = await createModuleFederationArtifactsSmokeReport({ distDir });

  assert.equal(report.ok, false);
  assert.ok(report.failedArtifacts.some((artifact) => (
    artifact.label === 'workerRemoteEntry' && artifact.error === 'missing'
  )));
});
