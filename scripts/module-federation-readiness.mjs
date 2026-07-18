#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_EXPECTED_EXPOSES,
  resolveRemoteEntry,
} from './module-federation-remote-smoke.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');
const DEFAULT_REPORT_PATH = 'reports/module-federation-readiness.json';

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

const REQUIRED_PACKAGE_SCRIPTS = [
  'build:mf',
  'gate:mf',
  'readiness:mf',
  'readiness:mf:remote',
  'smoke:mf:artifacts',
  'smoke:mf:probe',
  'smoke:mf:probe:remote',
  'smoke:mf:remote',
];

const readPackageJson = (projectRoot) => (
  JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'))
);

const hasRequiredFiles = (projectRoot) => REQUIRED_FILES.filter((relativePath) => (
  !existsSync(resolve(projectRoot, relativePath))
));

const hasRequiredScripts = (packageJson) => REQUIRED_PACKAGE_SCRIPTS.filter((scriptName) => (
  typeof packageJson.scripts?.[scriptName] !== 'string'
));

const parseArgs = (argv = []) => {
  const options = {
    report: DEFAULT_REPORT_PATH,
    requireRemote: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--report') {
      options.report = argv[index + 1] || DEFAULT_REPORT_PATH;
      index += 1;
      continue;
    }
    if (arg === '--require-remote') {
      options.requireRemote = true;
      continue;
    }
    throw new Error(`unknown option: ${arg}`);
  }

  return options;
};

export const createModuleFederationReadinessReport = ({
  env = process.env,
  projectRoot = PROJECT_ROOT,
  requireRemote = false,
} = {}) => {
  const packageJson = readPackageJson(projectRoot);
  const missingFiles = hasRequiredFiles(projectRoot);
  const missingScripts = hasRequiredScripts(packageJson);
  const remote = resolveRemoteEntry(
    env.VITE_MF_DESIGN_SYSTEM_ENTRY,
    env.VITE_MF_DESIGN_SYSTEM_NAME,
  );
  const remoteEntryConfigured = Boolean(remote?.entry);
  const blockers = [];

  if (missingFiles.length > 0) {
    blockers.push('missing required Module Federation files');
  }
  if (missingScripts.length > 0) {
    blockers.push('missing required package scripts');
  }
  if (requireRemote && !remoteEntryConfigured) {
    blockers.push('missing VITE_MF_DESIGN_SYSTEM_ENTRY');
  }

  const hostReady = missingFiles.length === 0 && missingScripts.length === 0;
  const ok = blockers.length === 0;

  return {
    ok,
    status: ok
      ? (remoteEntryConfigured ? 'remote-configured' : 'host-ready-fallback-active')
      : 'blocked',
    hostReady,
    remoteEntryConfigured,
    remoteRequired: requireRemote,
    fallbackActive: !remoteEntryConfigured,
    remoteName: remote?.name ?? 'design_system',
    expectedExposes: DEFAULT_EXPECTED_EXPOSES,
    missingFiles,
    missingScripts,
    blockers,
    nextActions: remoteEntryConfigured
      ? [
        'npm run smoke:mf:remote',
        'npm run smoke:mf:probe:remote',
      ]
      : requireRemote
        ? [
          'set VITE_MF_DESIGN_SYSTEM_ENTRY to design_system@https://.../mf-manifest.json',
          'npm run smoke:mf:remote',
          'npm run smoke:mf:probe:remote',
        ]
        : [
          'keep VITE_MF_DESIGN_SYSTEM_ENTRY unset',
          'npm run smoke:mf:probe',
        ],
  };
};

const writeReport = async (reportPath, report) => {
  const absoluteReportPath = resolve(process.cwd(), reportPath || DEFAULT_REPORT_PATH);
  await mkdir(dirname(absoluteReportPath), { recursive: true });
  await writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return absoluteReportPath;
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = createModuleFederationReadinessReport({
      requireRemote: options.requireRemote,
    });
    const reportPath = await writeReport(options.report, report);

    console.log(`[module-federation-readiness] ${report.status}; report=${reportPath}`);
    if (!report.ok) {
      console.error(`[module-federation-readiness] FAILED: ${report.blockers.join(', ')}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`[module-federation-readiness] FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
