#!/usr/bin/env node
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');

const REQUIRED_JSON_ARTIFACTS = [
  ['clientManifest', 'mf-manifest.json'],
  ['clientStats', 'mf-stats.json'],
  ['workerManifest', 'begabaseball_frontend/mf-manifest.json'],
  ['workerStats', 'begabaseball_frontend/mf-stats.json'],
];

const REQUIRED_TEXT_ARTIFACTS = [
  ['workerRemoteEntry', 'begabaseball_frontend/remoteEntry.js'],
];

const relativeToProject = (filePath) => relative(PROJECT_ROOT, filePath).split('\\').join('/');

const fileStats = async (filePath) => {
  try {
    const stats = await stat(filePath);
    return stats.isFile() ? stats : null;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const readJsonArtifact = async (label, filePath) => {
  const stats = await fileStats(filePath);
  if (!stats) {
    return {
      ok: false,
      label,
      path: relativeToProject(filePath),
      error: 'missing',
    };
  }

  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8'));
    const isObject = Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed);
    return {
      ok: isObject,
      label,
      path: relativeToProject(filePath),
      bytes: stats.size,
      error: isObject ? undefined : 'expected JSON object',
    };
  } catch (error) {
    return {
      ok: false,
      label,
      path: relativeToProject(filePath),
      bytes: stats.size,
      error: `invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

const readTextArtifact = async (label, filePath) => {
  const stats = await fileStats(filePath);
  if (!stats) {
    return {
      ok: false,
      label,
      path: relativeToProject(filePath),
      error: 'missing',
    };
  }

  return {
    ok: stats.size > 0,
    label,
    path: relativeToProject(filePath),
    bytes: stats.size,
    error: stats.size > 0 ? undefined : 'empty file',
  };
};

const listBootstrapAssets = async (distDir) => {
  const assetsDir = join(distDir, 'assets');
  try {
    const entries = await readdir(assetsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /^mf-entry-bootstrap-.*\.js$/.test(name))
      .sort()
      .map((name) => join(assetsDir, name));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

export const createModuleFederationArtifactsSmokeReport = async ({
  distDir = resolve(PROJECT_ROOT, 'dist'),
} = {}) => {
  const absoluteDistDir = resolve(PROJECT_ROOT, distDir);
  const checkedArtifacts = [];

  for (const [label, relativePath] of REQUIRED_JSON_ARTIFACTS) {
    checkedArtifacts.push(await readJsonArtifact(label, join(absoluteDistDir, relativePath)));
  }

  for (const [label, relativePath] of REQUIRED_TEXT_ARTIFACTS) {
    checkedArtifacts.push(await readTextArtifact(label, join(absoluteDistDir, relativePath)));
  }

  const bootstrapAssetPaths = await listBootstrapAssets(absoluteDistDir);
  const bootstrapAssets = await Promise.all(
    bootstrapAssetPaths.map((filePath) => readTextArtifact('clientBootstrap', filePath)),
  );
  checkedArtifacts.push(...bootstrapAssets);

  if (bootstrapAssets.length === 0) {
    checkedArtifacts.push({
      ok: false,
      label: 'clientBootstrap',
      path: relativeToProject(join(absoluteDistDir, 'assets/mf-entry-bootstrap-*.js')),
      error: 'missing',
    });
  }

  const failedArtifacts = checkedArtifacts.filter((artifact) => !artifact.ok);

  return {
    ok: failedArtifacts.length === 0,
    distDir: relativeToProject(absoluteDistDir),
    checkedArtifacts,
    failedArtifacts,
    counts: {
      checkedArtifacts: checkedArtifacts.length,
      failedArtifacts: failedArtifacts.length,
      bootstrapAssets: bootstrapAssets.length,
    },
  };
};

const parseArgs = (argv) => {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dist') {
      options.distDir = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (arg === '--report') {
      options.reportPath = argv[index + 1] || '';
      index += 1;
      continue;
    }
    throw new Error(`unknown option: ${arg}`);
  }
  return options;
};

const writeReport = async (reportPath, report) => {
  if (!reportPath) {
    return;
  }

  const absoluteReportPath = resolve(PROJECT_ROOT, reportPath);
  await mkdir(dirname(absoluteReportPath), { recursive: true });
  await writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = await createModuleFederationArtifactsSmokeReport({
      distDir: options.distDir || resolve(PROJECT_ROOT, 'dist'),
    });
    await writeReport(options.reportPath || 'reports/module-federation-artifacts-smoke.json', report);

    if (!report.ok) {
      console.error(
        `[module-federation-artifacts-smoke] FAILED: ${report.failedArtifacts
          .map((artifact) => `${artifact.path} (${artifact.error})`)
          .join(', ')}`,
      );
      process.exit(1);
    }

    console.log(
      `[module-federation-artifacts-smoke] OK: checked ${report.counts.checkedArtifacts} artifact(s), ${report.counts.bootstrapAssets} bootstrap asset(s)`,
    );
  } catch (error) {
    console.error(`[module-federation-artifacts-smoke] FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
