import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const outputRoot = path.join(repoRoot, 'output/playwright');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const releaseGatePath = path.join(reportDir, 'daejeon-seatmap-release-gate.json');
const staleToleranceMs = 1000;

const EXPECTED_BLOCKS = 145;
const EXPECTED_TRACED = 145;
const EXPECTED_REVIEW = 0;
const EXPECTED_P2_ALIASES = 11;
const EXPECTED_ANCHOR_CROPS = 28;

const WATCH_FILES = [
  'package.json',
  'docs/daejeon-seatmap-release-lock.md',
  'src/data/daejeonAnchorVisualBaseline.json',
  'src/data/daejeonGeometryBaseline.json',
  'src/data/daejeonSeatData.ts',
  'src/data/daejeonSeatData.test.ts',
  'src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.png',
];

const WATCH_DIRECTORIES = [
  'src/components/daejeon',
  'src/components/stadium/daejeon',
  'src/components/stadium',
  'scripts',
];

const isWatchedDirectoryFile = (relativePath) => {
  if (relativePath.startsWith('scripts/')) {
    return path.basename(relativePath).startsWith('daejeon-');
  }
  if (relativePath.startsWith('src/components/stadium/')) {
    return relativePath.includes('/daejeon/') || relativePath.endsWith('stadiumSeatMapRegistry.tsx');
  }
  return true;
};

const assertGuard = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const walkDirectory = async (directory) => {
  if (!(await fileExists(directory))) return [];

  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkDirectory(entryPath));
      continue;
    }
    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
};

const collectWatchedFiles = async () => {
  const files = new Set();

  for (const relativePath of WATCH_FILES) {
    const absolutePath = path.join(frontendRoot, relativePath);
    if (await fileExists(absolutePath)) {
      files.add(absolutePath);
    }
  }

  for (const relativePath of WATCH_DIRECTORIES) {
    const directoryPath = path.join(frontendRoot, relativePath);
    const directoryFiles = await walkDirectory(directoryPath);
    for (const filePath of directoryFiles) {
      const normalizedRelativePath = path.relative(frontendRoot, filePath).replaceAll(path.sep, '/');
      if (isWatchedDirectoryFile(normalizedRelativePath)) {
        files.add(filePath);
      }
    }
  }

  return [...files].sort();
};

const validateReleaseGateReport = async () => {
  assertGuard(await fileExists(releaseGatePath), `missing Daejeon release gate report: ${releaseGatePath}`);

  const report = await readJson(releaseGatePath);
  const generatedAtMs = Date.parse(report.generatedAt);
  assertGuard(Number.isFinite(generatedAtMs), 'release gate report generatedAt must be a valid date');
  assertGuard(report.status === 'passed', 'release gate report status must be passed');
  assertGuard(report.expected?.totalBlocks === EXPECTED_BLOCKS, `release gate expected.totalBlocks must be ${EXPECTED_BLOCKS}`);
  assertGuard(report.expected?.officialImageTraced === EXPECTED_TRACED, `release gate expected.officialImageTraced must be ${EXPECTED_TRACED}`);
  assertGuard(report.expected?.needsOperatorReview === EXPECTED_REVIEW, `release gate expected.needsOperatorReview must be ${EXPECTED_REVIEW}`);
  assertGuard(report.expected?.p2DeduplicatedAliases === EXPECTED_P2_ALIASES, `release gate expected.p2DeduplicatedAliases must be ${EXPECTED_P2_ALIASES}`);
  assertGuard(report.expected?.anchorCrops === EXPECTED_ANCHOR_CROPS, `release gate expected.anchorCrops must be ${EXPECTED_ANCHOR_CROPS}`);
  assertGuard(report.coordinateChangeImpactSummary?.contract === 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1', 'release gate coordinateChangeImpactSummary contract is missing');
  assertGuard(report.coordinateChangeImpactSummary?.counts?.missingImpact === 0, 'release gate coordinateChangeImpactSummary missingImpact must be 0');

  const expectedCommands = [
    'node --import tsx --test src/data/daejeonSeatData.test.ts src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    'npm run stadium:daejeon:evidence',
    'npm run stadium:daejeon:visual-diff',
    'npm run stadium:daejeon:geometry-diff',
    'npm run stadium:daejeon:coverage-report',
    'npm run qa:stadium:daejeon:trace-review',
    'npm run build',
  ];
  const commands = report.commands ?? [];
  for (const command of expectedCommands) {
    const entry = commands.find((item) => item.command === command);
    assertGuard(entry?.status === 'passed', `release gate command must pass: ${command}`);
  }

  const requiredArtifacts = [
    'traceManifest',
    'traceSummary',
    'p2Evidence',
    'p2EvidenceSummary',
    'anchorCrops',
    'anchorCropsSummary',
    'visualDiff',
    'visualDiffSummary',
    'geometryDiff',
    'geometryDiffSummary',
    'coverageReport',
    'coverageSummary',
    'browserQa',
    'browserQaSummary',
    'mobileScreenshot',
    'desktopScreenshot',
  ];
  for (const artifactKey of requiredArtifacts) {
    assertGuard(typeof report.artifacts?.[artifactKey] === 'string', `release gate artifact is missing: ${artifactKey}`);
  }

  return { report, generatedAtMs };
};

const resolveArtifactPath = (artifactPath) => path.resolve(frontendRoot, artifactPath);

const validateArtifactContents = async (report) => {
  const traceManifest = await readJson(resolveArtifactPath(report.artifacts.traceManifest));
  assertGuard(traceManifest.summary?.totalBlocks === EXPECTED_BLOCKS, `trace manifest totalBlocks must be ${EXPECTED_BLOCKS}`);
  assertGuard(traceManifest.summary?.officialImageTraced === EXPECTED_TRACED, `trace manifest officialImageTraced must be ${EXPECTED_TRACED}`);
  assertGuard(traceManifest.summary?.needsOperatorReview === EXPECTED_REVIEW, `trace manifest needsOperatorReview must be ${EXPECTED_REVIEW}`);
  assertGuard((traceManifest.traceReviewQueue ?? []).length === 0, 'trace manifest queue must stay empty');
  assertGuard(traceManifest.precisionAudit?.labelTopHitFailureCount === 0, 'trace manifest labelTopHitFailureCount must be 0');
  assertGuard((traceManifest.deduplicatedAliases ?? []).length === EXPECTED_P2_ALIASES, `trace manifest deduplicatedAliases must be ${EXPECTED_P2_ALIASES}`);
  assertGuard(traceManifest.coordinateChangeImpact?.contract === 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1', 'trace manifest coordinateChangeImpact contract is missing');
  assertGuard(traceManifest.coordinateChangeImpact?.counts?.missingImpact === 0, 'trace manifest coordinateChangeImpact missingImpact must be 0');

  const p2Evidence = await readJson(resolveArtifactPath(report.artifacts.p2Evidence));
  assertGuard((p2Evidence.outputs ?? []).length === EXPECTED_P2_ALIASES, `P2 evidence outputs must be ${EXPECTED_P2_ALIASES}`);
  const retiredBlockExists = (p2Evidence.outputs ?? []).filter((output) => output.retiredBlockExists);
  assertGuard(retiredBlockExists.length === 0, `P2 retired aliases must not exist as operational geometry: ${retiredBlockExists.map((output) => output.retiredBlockId).join(', ')}`);

  const anchorCrops = await readJson(resolveArtifactPath(report.artifacts.anchorCrops));
  assertGuard((anchorCrops.crops ?? []).length === EXPECTED_ANCHOR_CROPS, `anchor crop count must be ${EXPECTED_ANCHOR_CROPS}`);

  const visualDiff = await readJson(resolveArtifactPath(report.artifacts.visualDiff));
  assertGuard(visualDiff.contract === 'DAEJEON_ANCHOR_VISUAL_BASELINE_V1', 'visual diff contract is missing');
  assertGuard(visualDiff.status === 'passed', 'visual diff status must be passed');
  assertGuard(visualDiff.summary?.baselineCropCount === EXPECTED_ANCHOR_CROPS, `visual diff baselineCropCount must be ${EXPECTED_ANCHOR_CROPS}`);
  assertGuard(visualDiff.summary?.currentCropCount === EXPECTED_ANCHOR_CROPS, `visual diff currentCropCount must be ${EXPECTED_ANCHOR_CROPS}`);
  assertGuard(visualDiff.summary?.changedCropCount === 0, 'visual diff changedCropCount must be 0');
  assertGuard(visualDiff.summary?.metadataMismatchCount === 0, 'visual diff metadataMismatchCount must be 0');

  const geometryDiff = await readJson(resolveArtifactPath(report.artifacts.geometryDiff));
  assertGuard(geometryDiff.contract === 'DAEJEON_GEOMETRY_BASELINE_V1', 'geometry diff contract is missing');
  assertGuard(geometryDiff.status === 'passed', 'geometry diff status must be passed');
  assertGuard(geometryDiff.summary?.baselineBlockCount === EXPECTED_BLOCKS, `geometry diff baselineBlockCount must be ${EXPECTED_BLOCKS}`);
  assertGuard(geometryDiff.summary?.currentBlockCount === EXPECTED_BLOCKS, `geometry diff currentBlockCount must be ${EXPECTED_BLOCKS}`);
  assertGuard(geometryDiff.summary?.changedBlockCount === 0, 'geometry diff changedBlockCount must be 0');
  assertGuard(geometryDiff.summary?.missingBlockCount === 0, 'geometry diff missingBlockCount must be 0');
  assertGuard(geometryDiff.summary?.extraBlockCount === 0, 'geometry diff extraBlockCount must be 0');

  const coverageReport = await readJson(resolveArtifactPath(report.artifacts.coverageReport));
  assertGuard(coverageReport.summary?.totalBlocks === EXPECTED_BLOCKS, `coverage report totalBlocks must be ${EXPECTED_BLOCKS}`);
  assertGuard(coverageReport.summary?.lockedCount === EXPECTED_BLOCKS, `coverage report lockedCount must be ${EXPECTED_BLOCKS}`);
  assertGuard(coverageReport.summary?.labelOnlyCount === 0, 'coverage report labelOnlyCount must be 0');
  assertGuard(coverageReport.summary?.partialCount === 0, 'coverage report partialCount must be 0');
  assertGuard(coverageReport.summary?.missingLabelTopHitCount === 0, 'coverage report missingLabelTopHitCount must be 0');
  assertGuard(coverageReport.summary?.missingAnchorWithoutExceptionCount === 0, 'coverage report missingAnchorWithoutExceptionCount must be 0');
  assertGuard(coverageReport.summary?.missingOwnerPointRequiredCount === 0, 'coverage report missingOwnerPointRequiredCount must be 0');
  assertGuard(coverageReport.coordinateChangeImpact?.contract === 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1', 'coverage report coordinateChangeImpact contract is missing');
  assertGuard(coverageReport.coordinateChangeImpact?.counts?.missingImpact === 0, 'coverage report coordinateChangeImpact missingImpact must be 0');

  const browserQa = await readJson(resolveArtifactPath(report.artifacts.browserQa));
  assertGuard(browserQa.status === 'passed', 'browser QA status must be passed');
  assertGuard(browserQa.entryCount === 2, 'browser QA must include mobile and desktop scenarios');
  assertGuard(browserQa.overflowFailureCount === 0, 'browser QA overflowFailureCount must be 0');
  assertGuard(browserQa.actionableFailedRequestCount === 0, 'browser QA actionableFailedRequestCount must be 0');
  assertGuard(browserQa.actionableConsoleErrorCount === 0, 'browser QA actionableConsoleErrorCount must be 0');
};

const validateFreshness = async (generatedAtMs, watchedFiles) => {
  const staleFiles = [];

  for (const filePath of watchedFiles) {
    const stat = await fs.stat(filePath);
    if (stat.mtimeMs > generatedAtMs + staleToleranceMs) {
      staleFiles.push({
        path: path.relative(frontendRoot, filePath).replaceAll(path.sep, '/'),
        mtime: new Date(stat.mtimeMs).toISOString(),
      });
    }
  }

  assertGuard(
    staleFiles.length === 0,
    [
      'Daejeon release gate is stale. Re-run `npm run qa:stadium:daejeon:release-lock`.',
      ...staleFiles.map((file) => `- ${file.path} (${file.mtime})`),
    ].join('\n'),
  );
};

try {
  const watchedFiles = await collectWatchedFiles();
  const { report, generatedAtMs } = await validateReleaseGateReport();

  await validateArtifactContents(report);
  await validateFreshness(generatedAtMs, watchedFiles);

  console.log(`[daejeon-change-guard] status:passed watched=${watchedFiles.length} releaseGate=${releaseGatePath}`);
} catch (error) {
  console.error('[daejeon-change-guard] status:failed');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
