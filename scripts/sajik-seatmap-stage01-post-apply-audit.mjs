import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSajikSeatMapDataset,
} from '../src/data/sajikSeatMapDataset.ts';
import {
  SAJIK_BLOCKS,
} from '../src/data/sajikSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const defaultStageDir = path.join(reportDir, 'sajik-stage01-operator');
const defaultPrewritePath = path.join(defaultStageDir, 'sajik-seatmap-stage01-prewrite.json');

const POST_APPLY_AUDIT_VERSION = 'SAJIK_STAGE01_POST_APPLY_AUDIT_V1';
const REQUIRED_PREWRITE_VERSION = 'SAJIK_STAGE01_PREWRITE_V1';
const TARGET_STAGE_LABEL = 'Stage 01 P0';

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const hasFlag = (name) => process.argv.includes(name);

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const samePoint = (left, right) => (
  Array.isArray(left)
  && Array.isArray(right)
  && left.length === right.length
  && left.every((value, index) => value === right[index])
);

const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
const prewritePath = path.resolve(frontendRoot, argValue('--prewrite', defaultPrewritePath));
const requireApplied = hasFlag('--require-applied');
const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-post-apply-audit.json');
const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-post-apply-audit.md');

const prewrite = await readJson(prewritePath);
const prewriteSummary = prewrite.summary ?? {};
const patchPayloads = Array.isArray(prewrite.patchPayloads) ? prewrite.patchPayloads : [];
const dataset = buildSajikSeatMapDataset();
const sectionsById = new Map(dataset.sections.map((section) => [section.sectionId, section]));
const blocksBySectionId = new Map(SAJIK_BLOCKS.map((block) => [block.block, block]));

const blockers = [];
const warnings = [];

if (prewriteSummary.prewriteVersion !== REQUIRED_PREWRITE_VERSION) {
  blockers.push(`PREWRITE_VERSION_MISMATCH:${prewriteSummary.prewriteVersion ?? ''}`);
}
if (prewriteSummary.stadiumId !== dataset.stadiumId) {
  blockers.push(`STADIUM_ID_MISMATCH:${prewriteSummary.stadiumId ?? ''}:${dataset.stadiumId}`);
}
if (prewriteSummary.mapVersion !== dataset.mapVersion) {
  blockers.push(`MAP_VERSION_MISMATCH:${prewriteSummary.mapVersion ?? ''}:${dataset.mapVersion}`);
}
if (prewriteSummary.viewBox !== dataset.image.viewBox) {
  blockers.push(`VIEWBOX_MISMATCH:${prewriteSummary.viewBox ?? ''}:${dataset.image.viewBox}`);
}
if (prewriteSummary.targetStage !== TARGET_STAGE_LABEL) {
  blockers.push(`TARGET_STAGE_MISMATCH:${prewriteSummary.targetStage ?? ''}`);
}
if (prewriteSummary.status === 'blocked') {
  blockers.push(...(prewriteSummary.blockers ?? []).map((blocker) => `PREWRITE_BLOCKED:${blocker}`));
}
if (prewriteSummary.productionDataChanged !== false) {
  blockers.push('PREWRITE_PRODUCTION_DATA_CHANGED');
}
if (prewriteSummary.productionWriteAllowed !== false) {
  blockers.push('PREWRITE_PRODUCTION_WRITE_ALLOWED');
}

if (patchPayloads.length === 0) {
  warnings.push('NO_APPROVED_PATCH_PAYLOADS_TO_AUDIT');
}

const rowAudits = patchPayloads.map((payload) => {
  const section = sectionsById.get(payload.sectionId);
  const block = blocksBySectionId.get(payload.sectionId);
  const reasons = [];

  if (!section) {
    reasons.push('CURRENT_SECTION_NOT_FOUND');
  }
  if (!block) {
    reasons.push('CURRENT_BLOCK_NOT_FOUND');
  }
  if (payload.sectionKind !== 'SEAT_SECTION') {
    reasons.push(`PATCH_PAYLOAD_SECTION_KIND_NOT_WRITABLE:${payload.sectionKind ?? ''}`);
  }
  if (payload.validation?.status !== 'PASS') {
    reasons.push(`PATCH_VALIDATION_NOT_PASS:${payload.validation?.status ?? ''}`);
  }
  if (section && section.visualPath !== payload.before?.visualPath) {
    reasons.push('CURRENT_VISUAL_PATH_CHANGED_FROM_PREWRITE_BASELINE');
  }
  if (section && section.hitPath !== payload.after?.hitPath) {
    reasons.push('CURRENT_HIT_PATH_NOT_APPLIED');
  }
  if (section && !samePoint(section.labelPoint, payload.after?.labelPoint)) {
    reasons.push('CURRENT_LABEL_POINT_NOT_APPLIED');
  }
  if (block && block.imageGeometry.labelX !== payload.after?.labelPoint?.[0]) {
    reasons.push('CURRENT_LABEL_X_NOT_APPLIED');
  }
  if (block && block.imageGeometry.labelY !== payload.after?.labelPoint?.[1]) {
    reasons.push('CURRENT_LABEL_Y_NOT_APPLIED');
  }
  if (block && block.imageGeometry.geometryVersion !== 'manual-polygon-v2') {
    reasons.push(`GEOMETRY_VERSION_CHANGED:${block.imageGeometry.geometryVersion ?? ''}`);
  }
  if (block && block.sectionKind !== 'SEAT_SECTION') {
    reasons.push(`CURRENT_SECTION_KIND_NOT_WRITABLE:${block.sectionKind ?? ''}`);
  }
  if (block && block.mapInteractionStatus !== 'MAP_SELECTABLE') {
    reasons.push(`CURRENT_MAP_INTERACTION_NOT_SELECTABLE:${block.mapInteractionStatus ?? ''}`);
  }
  if (block && block.markerType) {
    reasons.push(`CURRENT_MARKER_TYPE_NOT_ALLOWED:${block.markerType}`);
  }

  const applied = reasons.length === 0;
  return {
    sectionId: payload.sectionId,
    blockId: payload.blockId,
    applied,
    hitPathMatches: section?.hitPath === payload.after?.hitPath,
    labelPointMatches: samePoint(section?.labelPoint, payload.after?.labelPoint),
    legacyLabelMatches: Boolean(block)
      && block.imageGeometry.labelX === payload.after?.labelPoint?.[0]
      && block.imageGeometry.labelY === payload.after?.labelPoint?.[1],
    visualPathLocked: section?.visualPath === payload.before?.visualPath,
    reasons,
  };
});

const unappliedRows = rowAudits.filter((row) => !row.applied);
const derivedStatus = blockers.length > 0
  ? 'blocked'
  : patchPayloads.length === 0
    ? 'waiting-for-operator'
    : unappliedRows.length === 0
      ? 'applied'
      : 'not-applied';

if (requireApplied && derivedStatus === 'not-applied') {
  blockers.push(`REQUIRE_APPLIED_UNMATCHED_ROWS:${unappliedRows.map((row) => row.sectionId).join(' ')}`);
}

const status = blockers.length > 0 ? 'blocked' : derivedStatus;
const summary = {
  postApplyAuditVersion: POST_APPLY_AUDIT_VERSION,
  status,
  generatedAt: new Date().toISOString(),
  prewrite: path.relative(frontendRoot, prewritePath),
  requireApplied,
  stadiumId: dataset.stadiumId,
  mapVersion: dataset.mapVersion,
  viewBox: dataset.image.viewBox,
  targetStage: TARGET_STAGE_LABEL,
  approvedPatchPayloads: patchPayloads.length,
  appliedRows: rowAudits.filter((row) => row.applied).length,
  unappliedRows: unappliedRows.length,
  readOnly: true,
  productionWriteAllowed: false,
  sourceDataWritePerformed: false,
  blockers,
  warnings,
};

const report = {
  generatedAt: summary.generatedAt,
  summary,
  safetyContract: [
    'This script is a read-only post-apply audit; it never edits src/data/sajikSeatData.ts.',
    'It compares Stage 01 prewrite patch payloads with the current production dataset.',
    'A not-applied status is expected before manual data patch review has been applied.',
    'Use --require-applied only after a manual data patch is expected to be present.',
  ],
  rows: rowAudits,
};

await fs.mkdir(stageDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(markdownPath, [
  '# Sajik Stage 01 Post-Apply Audit',
  '',
  `- audit version: \`${POST_APPLY_AUDIT_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- prewrite: \`${summary.prewrite}\``,
  `- approved patch payloads: \`${summary.approvedPatchPayloads}\``,
  `- applied rows: \`${summary.appliedRows}\``,
  `- unapplied rows: \`${summary.unappliedRows}\``,
  `- read only: \`${summary.readOnly}\``,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
  '',
  '## Rows',
  '',
  rowAudits.length > 0
    ? markdownTable(
      ['section', 'applied', 'hitPath', 'labelPoint', 'labelX/Y', 'visual locked', 'reasons'],
      rowAudits.map((row) => [
        `\`${row.sectionId}\``,
        `\`${row.applied}\``,
        `\`${row.hitPathMatches}\``,
        `\`${row.labelPointMatches}\``,
        `\`${row.legacyLabelMatches}\``,
        `\`${row.visualPathLocked}\``,
        row.reasons.length > 0 ? row.reasons.join('; ') : '-',
      ]),
    )
    : 'No approved Stage 01 patch payloads are available for post-apply audit.',
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No post-apply blockers.',
  '',
  '## Warnings',
  '',
  warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');

console.log(`stage01_post_apply_audit_json:${path.relative(frontendRoot, jsonPath)}`);
console.log(`stage01_post_apply_audit_markdown:${path.relative(frontendRoot, markdownPath)}`);
console.log(`status:${summary.status} approvedPatchPayloads=${summary.approvedPatchPayloads} applied=${summary.appliedRows} unapplied=${summary.unappliedRows} blockers=${summary.blockers.length} readOnly=${summary.readOnly}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
