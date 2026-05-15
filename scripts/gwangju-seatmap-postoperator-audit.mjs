import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GWANGJU_BLOCKS,
  GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
  GWANGJU_IMAGE_GEOMETRY_DRAFTS,
  GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
  GWANGJU_PENDING_OPERATOR_SECTIONS,
  GWANGJU_SEATMAP_COORDINATES_READY,
  GWANGJU_SEATMAP_IMAGE,
} from '../src/data/gwangjuSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');

const AUDIT_VERSION = 'GWANGJU_SEATMAP_POSTOPERATOR_AUDIT_V1';
const AUDIT_MODE = 'POST_OPERATOR_POLYGON_APPLIED_RELEASE';
const expectedPostOperatorBlockCount = 113;
const expectedBaseTraceBlockCount = 111;
const expectedOperatorSectionIds = ['home-k7-seats', 'away-cheering-seats'];
const expectedPendingOperatorSections = ['K7석', '원정응원석'];
const requiredTraceStatus = 'OFFICIAL_IMAGE_TRACED';
const requiredPixelAlignmentStatus = 'PIXEL_ALIGNED';

const auditJsonPath = path.join(reportDir, 'gwangju-seatmap-postoperator-audit.json');
const auditMarkdownPath = path.join(reportDir, 'gwangju-seatmap-postoperator-audit.md');

const sourcePolicy = {
  allowedCoordinateSource: 'operator-provided official PNG coordinates only',
  coordinateSystem: `${GWANGJU_SEATMAP_IMAGE.naturalWidth}x${GWANGJU_SEATMAP_IMAGE.naturalHeight}`,
  disallowedSources: [
    'browser CSS pixels',
    'resized screenshots',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
  ],
  missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
};

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const hashJson = (value) => crypto
  .createHash('sha256')
  .update(JSON.stringify(value))
  .digest('hex');

const stableBlockPayload = GWANGJU_BLOCKS
  .filter((block) => !expectedOperatorSectionIds.includes(block.id))
  .map((block) => ({
    id: block.id,
    label: block.label,
    category: block.category,
    fanRole: block.fanRole,
    price: block.price,
    imageGeometry: block.imageGeometry,
  }))
  .sort((left, right) => left.id.localeCompare(right.id));

const baseTraceBlockFingerprint = hashJson(stableBlockPayload);
const blocksById = new Map(GWANGJU_BLOCKS.map((block) => [block.id, block]));
const blockers = [];
const checks = [];

const addCheck = (name, expected, actual, pass, blockerCode) => {
  checks.push({ name, expected, actual, pass });
  if (!pass) blockers.push(`${blockerCode}:${actual ?? 'missing'}`);
};

const activeBlockCount = GWANGJU_BLOCKS.length;
const pendingOperatorSections = [...GWANGJU_PENDING_OPERATOR_SECTIONS];
const existingTraceBlockCount = GWANGJU_BLOCKS
  .filter((block) => !expectedOperatorSectionIds.includes(block.id))
  .length;

addCheck(
  'post-operator active block count',
  expectedPostOperatorBlockCount,
  activeBlockCount,
  activeBlockCount === expectedPostOperatorBlockCount && GWANGJU_EXPECTED_TRACE_BLOCK_COUNT === expectedPostOperatorBlockCount,
  'POST_OPERATOR_ACTIVE_BLOCK_COUNT_NOT_113',
);
addCheck(
  'post-operator data coordinate readiness',
  true,
  GWANGJU_SEATMAP_COORDINATES_READY,
  GWANGJU_SEATMAP_COORDINATES_READY === true,
  'POST_OPERATOR_STATUS_NOT_READY',
);
addCheck(
  'post-operator pending sections',
  'none',
  pendingOperatorSections.join(',') || 'none',
  pendingOperatorSections.length === 0,
  'POST_OPERATOR_PENDING_SECTIONS_PRESENT',
);
addCheck(
  'post-operator aggregate hit-area mode',
  false,
  GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
  GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE === false,
  'POST_OPERATOR_STILL_REUSES_EXISTING_TRACE_ONLY',
);
addCheck(
  'existing traced block count',
  expectedBaseTraceBlockCount,
  existingTraceBlockCount,
  existingTraceBlockCount === expectedBaseTraceBlockCount,
  'POST_OPERATOR_EXISTING_TRACE_BLOCK_COUNT_CHANGED',
);

const operatorSectionAudits = expectedOperatorSectionIds.map((id) => {
  const block = blocksById.get(id) ?? null;
  const draft = GWANGJU_IMAGE_GEOMETRY_DRAFTS[id] ?? null;
  const geometry = block?.imageGeometry ?? null;

  addCheck(
    `${id} block definition`,
    'present',
    block ? 'present' : 'missing',
    Boolean(block),
    `POST_OPERATOR_BLOCK_MISSING:${id}`,
  );
  addCheck(
    `${id} geometry draft`,
    'present',
    draft ? 'present' : 'missing',
    Boolean(draft),
    `POST_OPERATOR_GEOMETRY_MISSING:${id}`,
  );
  addCheck(
    `${id} trace status`,
    requiredTraceStatus,
    geometry?.traceStatus,
    geometry?.traceStatus === requiredTraceStatus,
    `POST_OPERATOR_TRACE_STATUS_NOT_TRACED:${id}`,
  );
  addCheck(
    `${id} manual review`,
    true,
    geometry?.manualReviewed,
    geometry?.manualReviewed === true,
    `POST_OPERATOR_MANUAL_REVIEW_NOT_TRUE:${id}`,
  );
  addCheck(
    `${id} pixel alignment`,
    requiredPixelAlignmentStatus,
    geometry?.pixelAlignmentStatus,
    geometry?.pixelAlignmentStatus === requiredPixelAlignmentStatus,
    `POST_OPERATOR_PIXEL_ALIGNMENT_NOT_ALIGNED:${id}`,
  );

  return {
    id,
    blockPresent: Boolean(block),
    geometryPresent: Boolean(draft),
    traceStatus: geometry?.traceStatus ?? null,
    manualReviewed: geometry?.manualReviewed ?? null,
    pixelAlignmentStatus: geometry?.pixelAlignmentStatus ?? null,
    label: block?.label ?? null,
    officialBlock: block?.officialBlock ?? null,
    fanRole: block?.fanRole ?? null,
  };
});

if (operatorSectionAudits.some((section) => !section.blockPresent || !section.geometryPresent)) {
  blockers.push('POST_OPERATOR_POLYGON_NOT_APPLIED:home-k7-seats,away-cheering-seats');
}

const status = blockers.length === 0 ? 'passed' : 'blocked';

const report = {
  version: AUDIT_VERSION,
  auditMode: AUDIT_MODE,
  status,
  doesNotModifyDataFile: true,
  generatedAt: new Date().toISOString(),
  expected: {
    activeBlockCount: expectedPostOperatorBlockCount,
    baseTraceBlockCount: expectedBaseTraceBlockCount,
    postOperatorSectionIds: expectedOperatorSectionIds,
    requiredTraceStatus,
    requiredPixelAlignmentStatus,
    manualReviewed: true,
    pendingOperatorSections: [],
    aggregateHitAreaMode: 'INDEPENDENT_OPERATOR_POLYGONS',
  },
  actual: {
    activeBlockCount,
    expectedTraceBlockCount: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
    coordinatesReady: GWANGJU_SEATMAP_COORDINATES_READY,
    pendingOperatorSections,
    expectedPendingOperatorSectionsBeforeWrite: expectedPendingOperatorSections,
    aggregateHitAreaReusesExistingTrace: GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
    existingTraceBlockCount,
    baseTraceBlockFingerprint,
  },
  operatorSections: operatorSectionAudits,
  checks,
  blockers,
  sourcePolicy,
  nextRequiredCommands: [
    'npm run stadium:gwangju:operator-prewrite-gate',
    'npm run stadium:gwangju:operator-apply:write',
    'npm run stadium:gwangju:operator-postwrite-gate',
    'npm run qa:stadium:gwangju:release-verify:postoperator',
  ],
};

const markdown = [
  '# Gwangju Post-Operator Seatmap Audit',
  '',
  `- version: \`${AUDIT_VERSION}\``,
  `- audit mode: \`${AUDIT_MODE}\``,
  `- status: \`${status}\``,
  '- does not modify data file: `true`',
  `- official PNG coordinate system: \`${sourcePolicy.coordinateSystem}\``,
  `- allowed coordinate source: \`${sourcePolicy.allowedCoordinateSource}\``,
  `- missing baseball data contract: \`${sourcePolicy.missingBaseballDataContract}\``,
  `- expected active blocks: \`${expectedPostOperatorBlockCount}\``,
  `- actual active blocks: \`${activeBlockCount}\``,
  `- expected trace block count constant: \`${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT}\``,
  `- pending operator sections: \`${pendingOperatorSections.join(', ') || 'none'}\``,
  `- base trace block fingerprint: \`${baseTraceBlockFingerprint}\``,
  '',
  '## Operator Sections',
  markdownTable(
    ['id', 'block', 'geometry', 'traceStatus', 'manualReviewed', 'pixelAlignmentStatus', 'fanRole'],
    operatorSectionAudits.map((section) => [
      section.id,
      section.blockPresent ? 'present' : 'missing',
      section.geometryPresent ? 'present' : 'missing',
      section.traceStatus ?? 'missing',
      section.manualReviewed ?? 'missing',
      section.pixelAlignmentStatus ?? 'missing',
      section.fanRole ?? 'missing',
    ]),
  ),
  '',
  '## Checks',
  markdownTable(
    ['check', 'expected', 'actual', 'pass'],
    checks.map((check) => [check.name, check.expected, check.actual, check.pass ? 'yes' : 'no']),
  ),
  '',
  '## Blockers',
  blockers.length > 0
    ? blockers.map((blocker) => `- \`${blocker}\``).join('\n')
    : '- none',
  '',
  '## Source Policy',
  `- allowed: \`${sourcePolicy.allowedCoordinateSource}\``,
  ...sourcePolicy.disallowedSources.map((source) => `- disallowed: \`${source}\``),
  `- missing baseball data contract: \`${sourcePolicy.missingBaseballDataContract}\``,
  '',
  '## Next Commands',
  ...report.nextRequiredCommands.map((command) => `- \`${command}\``),
  '',
].join('\n');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(auditJsonPath, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(auditMarkdownPath, markdown);

console.log([
  `Gwangju post-operator audit status=${status}`,
  `blockers=${blockers.length}`,
  `expectedActiveBlocks=${expectedPostOperatorBlockCount}`,
  `actualActiveBlocks=${activeBlockCount}`,
].join(' '));

if (blockers.length > 0) {
  for (const blocker of blockers) {
    console.error(`- ${blocker}`);
  }
  process.exitCode = 1;
}
