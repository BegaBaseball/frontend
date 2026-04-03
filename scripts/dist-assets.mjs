import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const assetsDir = path.join(distDir, 'assets');
const defaultManifestPath = path.join(distDir, '.vite', 'client-manifest.json');
const fallbackManifestPath = path.join(distDir, '.vite', 'manifest.json');
const defaultReportPath = path.join(projectRoot, 'reports', 'dist-assets-report.json');

const args = process.argv.slice(2);
let shouldPrune = false;
let reportPath = defaultReportPath;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--prune') {
    shouldPrune = true;
    continue;
  }
  if (arg === '--report') {
    reportPath = path.resolve(projectRoot, args[index + 1] || '');
    index += 1;
  }
}

const resolveManifestPath = () => {
  if (fs.existsSync(defaultManifestPath)) {
    return defaultManifestPath;
  }
  if (fs.existsSync(fallbackManifestPath)) {
    return fallbackManifestPath;
  }
  return '';
};

const manifestPath = resolveManifestPath();

if (!fs.existsSync(distDir)) {
  console.error('[dist-assets] dist directory not found. Run build first.');
  process.exit(1);
}

if (!fs.existsSync(assetsDir)) {
  console.error('[dist-assets] dist/assets directory not found. Run build first.');
  process.exit(1);
}

if (!manifestPath) {
  console.error('[dist-assets] client manifest not found. Expected dist/.vite/client-manifest.json.');
  process.exit(1);
}

const manifestRaw = fs.readFileSync(manifestPath, 'utf-8');
let manifest;

try {
  manifest = JSON.parse(manifestRaw);
} catch (error) {
  console.error(`[dist-assets] failed to parse manifest: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const referencedAssetSet = new Set();
for (const entry of Object.values(manifest)) {
  if (!entry || typeof entry !== 'object') {
    continue;
  }
  const file = typeof entry.file === 'string' ? entry.file : '';
  if (file.startsWith('assets/')) {
    referencedAssetSet.add(file);
  }

  const css = Array.isArray(entry.css) ? entry.css : [];
  for (const cssFile of css) {
    if (typeof cssFile === 'string' && cssFile.startsWith('assets/')) {
      referencedAssetSet.add(cssFile);
    }
  }

  const assets = Array.isArray(entry.assets) ? entry.assets : [];
  for (const assetFile of assets) {
    if (typeof assetFile === 'string' && assetFile.startsWith('assets/')) {
      referencedAssetSet.add(assetFile);
    }
  }
}

const collectAssetFiles = (dir, relativePrefix = 'assets') => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.posix.join(relativePrefix, entry.name);
    if (entry.isDirectory()) {
      return collectAssetFiles(fullPath, relativePath);
    }
    if (entry.isFile()) {
      return [relativePath];
    }
    return [];
  });
};

const diskAssets = collectAssetFiles(assetsDir).sort();
const staleAssets = diskAssets.filter((assetPath) => !referencedAssetSet.has(assetPath));
const removedAssets = [];

if (shouldPrune) {
  for (const assetPath of staleAssets) {
    const targetPath = path.join(distDir, assetPath);
    fs.rmSync(targetPath, { force: true });
    removedAssets.push(assetPath);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  manifestPath: path.relative(projectRoot, manifestPath),
  assetsDirectory: path.relative(projectRoot, assetsDir),
  pruneEnabled: shouldPrune,
  referencedAssets: Array.from(referencedAssetSet).sort(),
  staleAssets,
  removedAssets,
  counts: {
    referencedAssets: referencedAssetSet.size,
    diskAssets: diskAssets.length,
    staleAssets: staleAssets.length,
    removedAssets: removedAssets.length,
  },
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

const reportRelativePath = path.relative(projectRoot, reportPath);
if (shouldPrune) {
  console.log(`[dist-assets] pruned ${removedAssets.length} stale asset(s). report=${reportRelativePath}`);
} else {
  console.log(`[dist-assets] found ${staleAssets.length} stale asset(s). report=${reportRelativePath}`);
}
