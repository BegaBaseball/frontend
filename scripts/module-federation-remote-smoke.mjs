#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_EXPECTED_EXPOSES = ['./Button', './Modal', './ThemeProvider'];

const isEntryUrlLike = (value) =>
  /^[a-z][a-z\d+.-]*:\/\//i.test(value) || value.startsWith('/');

const findEntrySeparatorIndex = (value) => {
  if (isEntryUrlLike(value)) {
    return -1;
  }

  for (let index = value.indexOf('@'); index >= 0; index = value.indexOf('@', index + 1)) {
    const candidateEntry = value.slice(index + 1).trim();
    if (isEntryUrlLike(candidateEntry)) {
      return index;
    }
  }

  return -1;
};

export const resolveRemoteEntry = (rawEntry, explicitName = '') => {
  const value = String(rawEntry || '').trim();
  if (!value) {
    return null;
  }

  const separatorIndex = findEntrySeparatorIndex(value);
  const prefixedName = separatorIndex >= 0 ? value.slice(0, separatorIndex).trim() : '';
  const entry = separatorIndex >= 0 ? value.slice(separatorIndex + 1).trim() : value;

  return {
    entry,
    name: String(explicitName || '').trim() || prefixedName || 'design_system',
  };
};

const exposeLeafName = (value) => {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  if (text.startsWith('./')) {
    return text.slice(2);
  }

  if (text.includes(':')) {
    return text.slice(text.lastIndexOf(':') + 1);
  }

  if (text.includes('/')) {
    return text.slice(text.lastIndexOf('/') + 1);
  }

  return text;
};

export const normalizeExposeName = (value) => {
  const leafName = exposeLeafName(value);
  if (!leafName) {
    return '';
  }

  return leafName.startsWith('.') ? leafName : `./${leafName}`;
};

const addExposeName = (names, value) => {
  const normalized = normalizeExposeName(value);
  if (normalized) {
    names.add(normalized);
  }
};

export const extractExposeNames = (manifest) => {
  const names = new Set();
  const exposes = manifest?.exposes;

  if (Array.isArray(exposes)) {
    for (const expose of exposes) {
      if (typeof expose === 'string') {
        addExposeName(names, expose);
        continue;
      }

      if (!expose || typeof expose !== 'object') {
        continue;
      }

      for (const key of ['name', 'id', 'key', 'path', 'expose', 'moduleName']) {
        addExposeName(names, expose[key]);
      }
    }
  } else if (exposes && typeof exposes === 'object') {
    for (const exposeName of Object.keys(exposes)) {
      addExposeName(names, exposeName);
    }
  }

  return Array.from(names).sort();
};

const parseExpectedExposes = (value) => {
  if (!value) {
    return DEFAULT_EXPECTED_EXPOSES;
  }

  return String(value)
    .split(',')
    .map((entry) => normalizeExposeName(entry))
    .filter(Boolean);
};

export const validateRemoteManifest = (manifest, expectedExposes = DEFAULT_EXPECTED_EXPOSES) => {
  const exposedModules = extractExposeNames(manifest);
  const exposedModuleSet = new Set(exposedModules);
  const normalizedExpectedExposes = expectedExposes
    .map((entry) => normalizeExposeName(entry))
    .filter(Boolean);
  const missingExposes = normalizedExpectedExposes.filter((entry) => !exposedModuleSet.has(entry));

  return {
    ok: missingExposes.length === 0,
    expectedExposes: normalizedExpectedExposes,
    exposedModules,
    missingExposes,
  };
};

export const resolveEntryType = (entry) => {
  try {
    return /\.json$/i.test(new URL(entry, 'file:///').pathname)
      ? 'manifest'
      : 'remote-entry';
  } catch {
    return /\.json(?:[?#]|$)/i.test(entry) ? 'manifest' : 'remote-entry';
  }
};

const extractEsmExportNames = (source) => {
  const names = new Set();

  for (const match of source.matchAll(/\bexport\s*\{([\s\S]*?)\}/g)) {
    for (const rawSpecifier of match[1].split(',')) {
      const specifier = rawSpecifier.trim();
      const specifierMatch = specifier.match(/^(?:[A-Za-z_$][\w$]*\s+as\s+)?([A-Za-z_$][\w$]*)$/);
      if (specifierMatch) {
        names.add(specifierMatch[1]);
      }
    }
  }

  for (const match of source.matchAll(
    /\bexport\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    names.add(match[1]);
  }

  return Array.from(names).sort();
};

export const validateRemoteEntrySource = (source) => {
  const exportedNames = extractEsmExportNames(String(source || ''));
  const exportedNameSet = new Set(exportedNames);
  const requiredContainerExports = ['get', 'init'];
  const missingContainerExports = requiredContainerExports.filter(
    (exportName) => !exportedNameSet.has(exportName),
  );

  return {
    ok: missingContainerExports.length === 0,
    containerExports: requiredContainerExports.filter((exportName) => exportedNameSet.has(exportName)),
    missingContainerExports,
  };
};

const loadEntryText = async (entry, fetchImpl = globalThis.fetch) => {
  if (/^https?:\/\//i.test(entry)) {
    if (typeof fetchImpl !== 'function') {
      throw new Error('global fetch is unavailable; use Node 22 or provide a local entry file path');
    }

    const response = await fetchImpl(entry);
    if (!response.ok) {
      throw new Error(`remote entry request failed with HTTP ${response.status}`);
    }
    return response.text();
  }

  if (entry.startsWith('file://')) {
    return readFile(fileURLToPath(entry), 'utf8');
  }

  if (entry.startsWith('/')) {
    return readFile(entry, 'utf8');
  }

  return readFile(resolve(process.cwd(), entry), 'utf8');
};

export const createRemoteSmokeReport = async ({
  rawEntry,
  remoteName,
  expectedExposes = DEFAULT_EXPECTED_EXPOSES,
  fetchImpl = globalThis.fetch,
} = {}) => {
  const remote = resolveRemoteEntry(rawEntry, remoteName);
  if (!remote) {
    return {
      ok: false,
      error: 'missing VITE_MF_DESIGN_SYSTEM_ENTRY or --entry',
    };
  }

  const text = await loadEntryText(remote.entry, fetchImpl);
  const entryType = resolveEntryType(remote.entry);

  if (entryType === 'remote-entry') {
    const validation = validateRemoteEntrySource(text);

    return {
      ok: validation.ok,
      entry: remote.entry,
      entryType,
      remoteName: remote.name,
      exposesVerified: false,
      expectedExposes: expectedExposes
        .map((entry) => normalizeExposeName(entry))
        .filter(Boolean),
      ...validation,
      ...(validation.ok
        ? {}
        : { error: 'remoteEntry.js must provide Module Federation get and init exports' }),
    };
  }

  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      entry: remote.entry,
      entryType,
      remoteName: remote.name,
      error: `entry did not return a JSON mf-manifest: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const validation = validateRemoteManifest(manifest, expectedExposes);

  return {
    ok: validation.ok,
    entry: remote.entry,
    entryType,
    remoteName: remote.name,
    exposesVerified: true,
    ...validation,
  };
};

const parseArgs = (argv) => {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--entry') {
      options.entry = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (arg === '--name') {
      options.name = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (arg === '--expect' || arg === '--expect-exposes') {
      options.expect = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (arg === '--report') {
      options.report = argv[index + 1] || '';
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

  const absoluteReportPath = resolve(process.cwd(), reportPath);
  await mkdir(dirname(absoluteReportPath), { recursive: true });
  await writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = await createRemoteSmokeReport({
      rawEntry: options.entry || process.env.VITE_MF_DESIGN_SYSTEM_ENTRY,
      remoteName: options.name || process.env.VITE_MF_DESIGN_SYSTEM_NAME,
      expectedExposes: parseExpectedExposes(options.expect || process.env.MF_EXPECTED_EXPOSES),
    });

    await writeReport(options.report || 'reports/module-federation-remote-smoke.json', report);

    if (!report.ok) {
      console.error(`[module-federation-remote-smoke] FAILED: ${report.error || `missing exposes: ${report.missingExposes.join(', ')}`}`);
      process.exit(1);
    }

    if (report.entryType === 'remote-entry') {
      console.log(`[module-federation-remote-smoke] OK: ${report.remoteName} remoteEntry container exports ${report.containerExports.join(', ')}; expose contract requires browser probe`);
    } else {
      console.log(`[module-federation-remote-smoke] OK: ${report.remoteName} exposes ${report.expectedExposes.join(', ')}`);
    }
  } catch (error) {
    console.error(`[module-federation-remote-smoke] FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
