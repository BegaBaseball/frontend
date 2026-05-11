import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildAnchorImpactByBlockId,
  buildAnchorReviewCrops,
  coordinateChangeImpactContract,
  coordinateImpactForBlock,
} from './daejeon-seatmap-anchor-contract.mjs';
import {
  DAEJEON_BLOCKS,
  DAEJEON_TRACE_REVIEW_SUMMARY,
  isDaejeonSelectableSeatBlock,
} from '../src/data/daejeonSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const outputRoot = path.join(repoRoot, 'output/playwright');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const anchorReviewOutputDir = path.join(outputRoot, 'daejeon-anchor-review');
const baselinePath = path.join(frontendRoot, 'src/data/daejeonGeometryBaseline.json');
const geometryDiffJsonPath = path.join(reportDir, 'daejeon-seatmap-geometry-diff.json');
const geometryDiffMarkdownPath = path.join(reportDir, 'daejeon-seatmap-geometry-diff.md');
const geometryDiffContract = 'DAEJEON_GEOMETRY_BASELINE_V1';
const expectedBlockCount = 145;

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

const stableStringify = (value) => JSON.stringify(value);

const sha256Json = (value) => createHash('sha256')
  .update(stableStringify(value))
  .digest('hex');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
].join('\n');

const normalizeGeometry = (block) => ({
  id: block.id,
  parentId: block.parentId,
  blockCode: block.blockCode,
  officialBlockLabel: block.officialBlockLabel,
  officialSectionName: block.officialSectionName,
  category: block.category,
  traceStatus: block.traceStatus,
  traceMethod: block.traceMethod,
  sourceConfidence: block.sourceConfidence,
  selectable: isDaejeonSelectableSeatBlock(block),
  imageGeometry: {
    d: block.imageGeometry.d,
    labelX: block.imageGeometry.labelX,
    labelY: block.imageGeometry.labelY,
    shortLabel: block.imageGeometry.shortLabel,
    labelFontSize: block.imageGeometry.labelFontSize ?? null,
    labelRotate: block.imageGeometry.labelRotate ?? null,
  },
  hitAreaD: block.hitAreaD ?? null,
});

const normalizeImpact = (impact) => ({
  anchorCropIds: [...(impact.anchorCropIds ?? [])].sort(),
  regressionTestIds: [...(impact.regressionTestIds ?? [])].sort(),
  reviewPriority: impact.reviewPriority ?? 'P2',
  reviewMode: impact.reviewMode ?? 'VISUAL_CROP_REVIEW',
  riskTags: [...(impact.riskTags ?? [])].sort(),
  manualOnlyReasons: [...(impact.manualOnlyReasons ?? [])].sort(),
});

const fieldComparisons = (expected, actual) => [
  ['imageGeometry.d', expected.geometry.imageGeometry.d, actual.geometry.imageGeometry.d],
  ['imageGeometry.labelX', expected.geometry.imageGeometry.labelX, actual.geometry.imageGeometry.labelX],
  ['imageGeometry.labelY', expected.geometry.imageGeometry.labelY, actual.geometry.imageGeometry.labelY],
  ['imageGeometry.shortLabel', expected.geometry.imageGeometry.shortLabel, actual.geometry.imageGeometry.shortLabel],
  ['imageGeometry.labelFontSize', expected.geometry.imageGeometry.labelFontSize, actual.geometry.imageGeometry.labelFontSize],
  ['imageGeometry.labelRotate', expected.geometry.imageGeometry.labelRotate, actual.geometry.imageGeometry.labelRotate],
  ['hitAreaD', expected.geometry.hitAreaD, actual.geometry.hitAreaD],
  ['traceStatus', expected.geometry.traceStatus, actual.geometry.traceStatus],
  ['traceMethod', expected.geometry.traceMethod, actual.geometry.traceMethod],
  ['sourceConfidence', expected.geometry.sourceConfidence, actual.geometry.sourceConfidence],
  ['selectable', expected.geometry.selectable, actual.geometry.selectable],
  ['officialBlockLabel', expected.geometry.officialBlockLabel, actual.geometry.officialBlockLabel],
  ['officialSectionName', expected.geometry.officialSectionName, actual.geometry.officialSectionName],
  ['category', expected.geometry.category, actual.geometry.category],
];

const changedFieldsForBlock = (expected, actual) => fieldComparisons(expected, actual)
  .filter(([, left, right]) => stableStringify(left) !== stableStringify(right))
  .map(([field]) => field);

const buildCurrentSnapshot = () => {
  const anchorImpactByBlockId = buildAnchorImpactByBlockId(buildAnchorReviewCrops(anchorReviewOutputDir));
  const blocks = DAEJEON_BLOCKS
    .map((block) => {
      const geometry = normalizeGeometry(block);
      const impact = normalizeImpact(coordinateImpactForBlock(anchorImpactByBlockId, block.id));

      return {
        id: block.id,
        blockCode: block.blockCode,
        parentId: block.parentId,
        officialBlockLabel: block.officialBlockLabel,
        officialSectionName: block.officialSectionName,
        fingerprint: sha256Json(geometry),
        geometry,
        ...impact,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    contract: geometryDiffContract,
    coordinateChangeImpactContract,
    expectedBlockCount,
    summary: {
      totalBlocks: DAEJEON_TRACE_REVIEW_SUMMARY.totalBlocks,
      officialImageTraced: DAEJEON_TRACE_REVIEW_SUMMARY.officialImageTraced,
      needsOperatorReview: DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview,
      selectableBlocks: blocks.filter((block) => block.geometry.selectable).length,
    },
    blocks,
  };
};

const buildBaselineFile = (snapshot) => ({
  contract: geometryDiffContract,
  generatedAt: new Date().toISOString(),
  coordinateChangeImpactContract: snapshot.coordinateChangeImpactContract,
  expectedBlockCount: snapshot.expectedBlockCount,
  policy: {
    purpose: '대전 공식 PNG overlay block geometry fingerprint baseline',
    coordinateSystem: 'official PNG 920x1060',
    lockedFields: [
      'imageGeometry.d',
      'imageGeometry.labelX',
      'imageGeometry.labelY',
      'imageGeometry.shortLabel',
      'imageGeometry.labelFontSize',
      'imageGeometry.labelRotate',
      'hitAreaD',
      'traceStatus',
      'traceMethod',
      'sourceConfidence',
      'selectable',
    ],
    note: '좌표/path/trace 계약 변경으로 fingerprint가 바뀌면 release-lock에서 geometry diff가 실패하며 baseline 갱신 전 운영자 검수가 필요하다.',
  },
  summary: snapshot.summary,
  blocks: snapshot.blocks,
});

const compareSnapshot = (baseline, snapshot) => {
  const baselineById = new Map((baseline.blocks ?? []).map((block) => [block.id, block]));
  const currentById = new Map(snapshot.blocks.map((block) => [block.id, block]));
  const missingBlockIds = [...baselineById.keys()].filter((id) => !currentById.has(id)).sort();
  const extraBlockIds = [...currentById.keys()].filter((id) => !baselineById.has(id)).sort();
  const changedBlocks = [];

  for (const [id, current] of currentById.entries()) {
    const expected = baselineById.get(id);
    if (!expected || expected.fingerprint === current.fingerprint) continue;

    changedBlocks.push({
      id,
      blockCode: current.blockCode,
      parentId: current.parentId,
      officialBlockLabel: current.officialBlockLabel,
      officialSectionName: current.officialSectionName,
      expectedFingerprint: expected.fingerprint,
      actualFingerprint: current.fingerprint,
      changedFields: changedFieldsForBlock(expected, current),
      anchorCropIds: current.anchorCropIds,
      regressionTestIds: current.regressionTestIds,
      reviewPriority: current.reviewPriority,
      reviewMode: current.reviewMode,
      riskTags: current.riskTags,
      manualOnlyReasons: current.manualOnlyReasons,
    });
  }

  const changedFieldSets = changedBlocks.map((block) => new Set(block.changedFields));
  const countChangedByField = (field) => changedFieldSets.filter((fields) => fields.has(field)).length;
  const traceContractFields = new Set(['traceStatus', 'traceMethod', 'sourceConfidence', 'selectable']);
  const imageGeometryMetadataFields = new Set([
    'imageGeometry.shortLabel',
    'imageGeometry.labelFontSize',
    'imageGeometry.labelRotate',
  ]);
  const failures = [
    ...missingBlockIds.map((id) => `missing baseline block in current output: ${id}`),
    ...extraBlockIds.map((id) => `extra block not present in baseline: ${id}`),
    ...changedBlocks.map((block) => `block geometry fingerprint changed: ${block.id} (${block.changedFields.join(', ')})`),
  ];

  return {
    contract: geometryDiffContract,
    status: failures.length === 0 ? 'passed' : 'failed',
    summary: {
      baselineBlockCount: baseline.blocks?.length ?? 0,
      currentBlockCount: snapshot.blocks.length,
      missingBlockCount: missingBlockIds.length,
      extraBlockCount: extraBlockIds.length,
      changedBlockCount: changedBlocks.length,
      changedImageGeometryDCount: countChangedByField('imageGeometry.d'),
      changedHitAreaDCount: countChangedByField('hitAreaD'),
      changedLabelCoordinateCount: countChangedByField('imageGeometry.labelX') + countChangedByField('imageGeometry.labelY'),
      changedImageGeometryMetadataCount: changedBlocks.filter((block) => block.changedFields.some((field) => imageGeometryMetadataFields.has(field))).length,
      changedTraceContractCount: changedBlocks.filter((block) => block.changedFields.some((field) => traceContractFields.has(field))).length,
      p0ChangedBlockCount: changedBlocks.filter((block) => block.reviewPriority === 'P0').length,
    },
    baseline: {
      path: path.relative(frontendRoot, baselinePath).replaceAll(path.sep, '/'),
      generatedAt: baseline.generatedAt ?? null,
      coordinateChangeImpactContract: baseline.coordinateChangeImpactContract ?? null,
    },
    current: {
      generatedAt: new Date().toISOString(),
      coordinateChangeImpactContract: snapshot.coordinateChangeImpactContract,
      summary: snapshot.summary,
    },
    missingBlockIds,
    extraBlockIds,
    changedBlocks,
    failures,
  };
};

const writeReport = async (result) => {
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(geometryDiffJsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  const changedRows = result.changedBlocks.map((block) => [
    block.reviewPriority,
    block.reviewMode,
    `\`${block.id}\``,
    block.blockCode,
    block.changedFields.map((field) => `\`${field}\``).join('<br>'),
    block.anchorCropIds.length ? block.anchorCropIds.map((id) => `\`${id}\``).join('<br>') : 'n/a',
    block.regressionTestIds.length ? block.regressionTestIds.map((id) => `\`${id}\``).join('<br>') : 'n/a',
  ]);

  await fs.writeFile(geometryDiffMarkdownPath, [
    '# 대전 좌석도 geometry fingerprint diff',
    '',
    `- generated: ${result.current.generatedAt}`,
    `- status: ${result.status}`,
    `- contract: \`${result.contract}\``,
    `- baseline: \`${result.baseline.path}\` (${result.baseline.generatedAt ?? 'unknown'})`,
    `- coordinate impact contract: \`${result.current.coordinateChangeImpactContract}\``,
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      Object.entries(result.summary).map(([key, value]) => [key, String(value)]),
    ),
    '',
    '## Changed Blocks',
    '',
    changedRows.length
      ? markdownTable(['priority', 'mode', 'block', 'code', 'changed fields', 'anchor crops', 'regression tests'], changedRows)
      : 'No block geometry fingerprint changes.',
    '',
    '## Missing / Extra Blocks',
    '',
    `- missing: ${result.missingBlockIds.length ? result.missingBlockIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
    `- extra: ${result.extraBlockIds.length ? result.extraBlockIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
    '',
    '## Failures',
    '',
    result.failures.length
      ? result.failures.map((failure) => `- ${failure}`).join('\n')
      : '- none',
    '',
    '## Policy',
    '',
    '- baseline block fingerprint가 바뀌면 좌표/path/trace 계약 변경 영향으로 보고 release-lock을 실패시킨다.',
    '- 변경 block은 anchorCropIds, regressionTestIds, reviewPriority 기준으로 재검수한다.',
    '- baseline 갱신은 운영자 검수 후 `npm run stadium:daejeon:geometry-baseline`로만 수행한다.',
    '',
  ].join('\n'), 'utf8');
};

try {
  const snapshot = buildCurrentSnapshot();

  if (writeBaseline) {
    const baseline = buildBaselineFile(snapshot);
    await fs.writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
    await writeReport({
      contract: geometryDiffContract,
      status: 'baseline-written',
      summary: {
        baselineBlockCount: baseline.blocks.length,
        currentBlockCount: snapshot.blocks.length,
        missingBlockCount: 0,
        extraBlockCount: 0,
        changedBlockCount: 0,
        changedImageGeometryDCount: 0,
        changedHitAreaDCount: 0,
        changedLabelCoordinateCount: 0,
        changedImageGeometryMetadataCount: 0,
        changedTraceContractCount: 0,
        p0ChangedBlockCount: 0,
      },
      baseline: {
        path: path.relative(frontendRoot, baselinePath).replaceAll(path.sep, '/'),
        generatedAt: baseline.generatedAt,
        coordinateChangeImpactContract: baseline.coordinateChangeImpactContract,
      },
      current: {
        generatedAt: baseline.generatedAt,
        coordinateChangeImpactContract: snapshot.coordinateChangeImpactContract,
        summary: snapshot.summary,
      },
      missingBlockIds: [],
      extraBlockIds: [],
      changedBlocks: [],
      failures: [],
    });
    console.log(`geometry_baseline:${baselinePath}`);
    console.log(`geometry_diff_json:${geometryDiffJsonPath}`);
    console.log(`geometry_diff_markdown:${geometryDiffMarkdownPath}`);
    console.log(`status:baseline-written blocks=${baseline.blocks.length}`);
    process.exit(0);
  }

  if (!(await fileExists(baselinePath))) {
    throw new Error(`Missing Daejeon geometry baseline: ${baselinePath}`);
  }

  const baseline = await readJson(baselinePath);
  const result = compareSnapshot(baseline, snapshot);
  await writeReport(result);

  console.log(`geometry_diff_json:${geometryDiffJsonPath}`);
  console.log(`geometry_diff_markdown:${geometryDiffMarkdownPath}`);
  console.log(`status:${result.status} changed=${result.summary.changedBlockCount} missing=${result.summary.missingBlockCount} extra=${result.summary.extraBlockCount}`);

  if (result.status !== 'passed') {
    process.exitCode = 1;
  }
} catch (error) {
  console.error('status:failed');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
