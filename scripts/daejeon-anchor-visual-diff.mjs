import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  coordinateChangeImpactContract,
  reviewContractVersion,
} from './daejeon-seatmap-anchor-contract.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const outputRoot = path.join(repoRoot, 'output/playwright');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const anchorIndexPath = path.join(outputRoot, 'daejeon-anchor-review/daejeon-anchor-review-crops.json');
const baselinePath = path.join(frontendRoot, 'src/data/daejeonAnchorVisualBaseline.json');
const visualDiffJsonPath = path.join(reportDir, 'daejeon-seatmap-visual-diff.json');
const visualDiffMarkdownPath = path.join(reportDir, 'daejeon-seatmap-visual-diff.md');
const visualDiffContract = 'DAEJEON_ANCHOR_VISUAL_BASELINE_V1';

const args = new Set(process.argv.slice(2));
const writeBaseline = args.has('--write-baseline');

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const sha256File = async (filePath) => createHash('sha256')
  .update(await fs.readFile(filePath))
  .digest('hex');

const stableCropMetadata = (crop) => ({
  id: crop.id,
  group: crop.group,
  reviewPriority: crop.reviewPriority,
  reviewMode: crop.reviewMode,
  manualOnlyReason: crop.manualOnlyReason ?? null,
  riskTags: [...(crop.riskTags ?? [])].sort(),
  regressionTestIds: [...(crop.regressionTestIds ?? [])].sort(),
  crop: crop.crop,
  blocks: [...(crop.blocks ?? [])],
});

const stableStringify = (value) => JSON.stringify(value);

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
].join('\n');

const normalizeCrop = async (crop) => {
  const outputPath = path.resolve(crop.outputPath);
  const sha256 = await sha256File(outputPath);

  return {
    ...stableCropMetadata(crop),
    sha256,
    outputPath,
    outputPathRelativeToRepo: path.relative(repoRoot, outputPath).replaceAll(path.sep, '/'),
    purpose: crop.purpose ?? 'anchor crop 검수',
    reviewFocus: crop.reviewFocus ?? '공식 PNG와 overlay path 정렬 확인',
  };
};

const buildCurrentSnapshot = async () => {
  if (!(await fileExists(anchorIndexPath))) {
    throw new Error(`Missing Daejeon anchor crop index. Run npm run stadium:daejeon:anchor-crops first: ${anchorIndexPath}`);
  }

  const index = await readJson(anchorIndexPath);
  const crops = [];
  for (const crop of index.crops ?? []) {
    crops.push(await normalizeCrop(crop));
  }

  return {
    contract: visualDiffContract,
    reviewContractVersion,
    coordinateChangeImpactContract,
    expectedCropCount: crops.length,
    anchorIndexPath: path.relative(frontendRoot, anchorIndexPath).replaceAll(path.sep, '/'),
    crops,
  };
};

const buildBaselineFile = (snapshot) => ({
  contract: visualDiffContract,
  generatedAt: new Date().toISOString(),
  reviewContractVersion: snapshot.reviewContractVersion,
  coordinateChangeImpactContract: snapshot.coordinateChangeImpactContract,
  expectedCropCount: snapshot.expectedCropCount,
  policy: {
    purpose: '대전 공식 PNG overlay anchor crop visual baseline',
    coordinateSystem: 'official PNG 920x1060',
    note: '좌표/path 수정으로 crop hash가 바뀌면 release-lock에서 visual diff가 실패하며 baseline 갱신 전 운영자 검수가 필요하다.',
  },
  crops: snapshot.crops.map((crop) => ({
    id: crop.id,
    group: crop.group,
    reviewPriority: crop.reviewPriority,
    reviewMode: crop.reviewMode,
    manualOnlyReason: crop.manualOnlyReason,
    riskTags: crop.riskTags,
    regressionTestIds: crop.regressionTestIds,
    crop: crop.crop,
    blocks: crop.blocks,
    sha256: crop.sha256,
  })),
});

const compareSnapshot = (baseline, snapshot) => {
  const baselineById = new Map((baseline.crops ?? []).map((crop) => [crop.id, crop]));
  const currentById = new Map(snapshot.crops.map((crop) => [crop.id, crop]));
  const missingCropIds = [...baselineById.keys()].filter((id) => !currentById.has(id)).sort();
  const extraCropIds = [...currentById.keys()].filter((id) => !baselineById.has(id)).sort();
  const hashChanged = [];
  const metadataChanged = [];
  const p0ChangedWithoutRegression = [];
  const p2ManualOnlyChanged = [];

  for (const [id, current] of currentById.entries()) {
    const expected = baselineById.get(id);
    if (!expected) continue;

    const currentMetadata = stableCropMetadata(current);
    const expectedMetadata = stableCropMetadata(expected);
    const hashMatches = expected.sha256 === current.sha256;
    const metadataMatches = stableStringify(expectedMetadata) === stableStringify(currentMetadata);

    if (!hashMatches) {
      hashChanged.push({
        id,
        reviewPriority: current.reviewPriority,
        reviewMode: current.reviewMode,
        expectedSha256: expected.sha256,
        actualSha256: current.sha256,
        outputPath: current.outputPathRelativeToRepo,
        regressionTestIds: current.regressionTestIds,
        manualOnlyReason: current.manualOnlyReason,
      });
    }
    if (!metadataMatches) {
      metadataChanged.push({
        id,
        expected: expectedMetadata,
        actual: currentMetadata,
      });
    }
    if (!hashMatches && current.reviewPriority === 'P0' && current.regressionTestIds.length === 0) {
      p0ChangedWithoutRegression.push(id);
    }
    if (!hashMatches && current.reviewMode === 'MANUAL_CROP_ONLY') {
      p2ManualOnlyChanged.push(id);
    }
  }

  const failures = [
    ...missingCropIds.map((id) => `missing baseline crop in current output: ${id}`),
    ...extraCropIds.map((id) => `extra crop not present in baseline: ${id}`),
    ...metadataChanged.map((item) => `crop metadata changed: ${item.id}`),
    ...hashChanged.map((item) => `crop image hash changed: ${item.id}`),
    ...p0ChangedWithoutRegression.map((id) => `P0 crop changed without regression test id: ${id}`),
  ];

  return {
    contract: visualDiffContract,
    status: failures.length === 0 ? 'passed' : 'failed',
    summary: {
      baselineCropCount: baseline.crops?.length ?? 0,
      currentCropCount: snapshot.crops.length,
      missingCropCount: missingCropIds.length,
      extraCropCount: extraCropIds.length,
      changedCropCount: hashChanged.length,
      metadataMismatchCount: metadataChanged.length,
      p0ChangedWithoutRegressionCount: p0ChangedWithoutRegression.length,
      p2ManualOnlyChangedCount: p2ManualOnlyChanged.length,
    },
    baseline: {
      path: path.relative(frontendRoot, baselinePath).replaceAll(path.sep, '/'),
      generatedAt: baseline.generatedAt ?? null,
      reviewContractVersion: baseline.reviewContractVersion ?? null,
      coordinateChangeImpactContract: baseline.coordinateChangeImpactContract ?? null,
    },
    current: {
      generatedAt: new Date().toISOString(),
      anchorIndexPath: path.relative(frontendRoot, anchorIndexPath).replaceAll(path.sep, '/'),
      reviewContractVersion: snapshot.reviewContractVersion,
      coordinateChangeImpactContract: snapshot.coordinateChangeImpactContract,
    },
    missingCropIds,
    extraCropIds,
    hashChanged,
    metadataChanged,
    p0ChangedWithoutRegression,
    p2ManualOnlyChanged,
    failures,
  };
};

const writeReport = async (result) => {
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(visualDiffJsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  const changedRows = result.hashChanged.map((item) => [
    item.reviewPriority,
    item.reviewMode,
    item.id,
    item.regressionTestIds.length ? item.regressionTestIds.map((id) => `\`${id}\``).join('<br>') : 'n/a',
    item.manualOnlyReason ?? '',
    `\`${item.outputPath}\``,
  ]);
  const metadataRows = result.metadataChanged.map((item) => [
    item.id,
    '`metadata mismatch`',
  ]);

  await fs.writeFile(visualDiffMarkdownPath, [
    '# 대전 좌석도 anchor visual diff',
    '',
    `- generated: ${result.current.generatedAt}`,
    `- status: ${result.status}`,
    `- contract: \`${result.contract}\``,
    `- baseline: \`${result.baseline.path}\` (${result.baseline.generatedAt ?? 'unknown'})`,
    `- anchor index: \`${result.current.anchorIndexPath}\``,
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      Object.entries(result.summary).map(([key, value]) => [key, String(value)]),
    ),
    '',
    '## Changed Crops',
    '',
    changedRows.length
      ? markdownTable(['priority', 'mode', 'crop', 'regression tests', 'manual reason', 'output'], changedRows)
      : 'No crop image hash changes.',
    '',
    '## Metadata Changes',
    '',
    metadataRows.length
      ? markdownTable(['crop', 'change'], metadataRows)
      : 'No crop metadata changes.',
    '',
    '## Failures',
    '',
    result.failures.length
      ? result.failures.map((failure) => `- ${failure}`).join('\n')
      : '- none',
    '',
    '## Policy',
    '',
    '- baseline crop hash가 바뀌면 좌표/path/공식 PNG 변경 영향으로 보고 release-lock을 실패시킨다.',
    '- P0 crop은 regressionTestIds가 반드시 있어야 한다.',
    '- P2 MANUAL_CROP_ONLY 변경은 수동 검수 대상으로 report에 남긴다.',
    '- baseline 갱신은 운영자 검수 후 `npm run stadium:daejeon:visual-baseline`로만 수행한다.',
    '',
  ].join('\n'), 'utf8');
};

try {
  const snapshot = await buildCurrentSnapshot();

  if (writeBaseline) {
    const baseline = buildBaselineFile(snapshot);
    await fs.writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
    await writeReport({
      contract: visualDiffContract,
      status: 'baseline-written',
      summary: {
        baselineCropCount: baseline.crops.length,
        currentCropCount: snapshot.crops.length,
        missingCropCount: 0,
        extraCropCount: 0,
        changedCropCount: 0,
        metadataMismatchCount: 0,
        p0ChangedWithoutRegressionCount: 0,
        p2ManualOnlyChangedCount: 0,
      },
      baseline: {
        path: path.relative(frontendRoot, baselinePath).replaceAll(path.sep, '/'),
        generatedAt: baseline.generatedAt,
        reviewContractVersion: baseline.reviewContractVersion,
        coordinateChangeImpactContract: baseline.coordinateChangeImpactContract,
      },
      current: {
        generatedAt: baseline.generatedAt,
        anchorIndexPath: path.relative(frontendRoot, anchorIndexPath).replaceAll(path.sep, '/'),
        reviewContractVersion: snapshot.reviewContractVersion,
        coordinateChangeImpactContract: snapshot.coordinateChangeImpactContract,
      },
      missingCropIds: [],
      extraCropIds: [],
      hashChanged: [],
      metadataChanged: [],
      p0ChangedWithoutRegression: [],
      p2ManualOnlyChanged: [],
      failures: [],
    });
    console.log(`visual_baseline:${baselinePath}`);
    console.log(`visual_diff_json:${visualDiffJsonPath}`);
    console.log(`visual_diff_markdown:${visualDiffMarkdownPath}`);
    console.log(`status:baseline-written crops=${baseline.crops.length}`);
    process.exit(0);
  }

  if (!(await fileExists(baselinePath))) {
    throw new Error(`Missing Daejeon anchor visual baseline: ${baselinePath}`);
  }

  const baseline = await readJson(baselinePath);
  const result = compareSnapshot(baseline, snapshot);
  await writeReport(result);

  console.log(`visual_diff_json:${visualDiffJsonPath}`);
  console.log(`visual_diff_markdown:${visualDiffMarkdownPath}`);
  console.log(`status:${result.status} changed=${result.summary.changedCropCount} metadata=${result.summary.metadataMismatchCount}`);

  if (result.status !== 'passed') {
    process.exitCode = 1;
  }
} catch (error) {
  console.error('status:failed');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
