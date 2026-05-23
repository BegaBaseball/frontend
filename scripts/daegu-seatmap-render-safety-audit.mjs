import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
  DAEGU_IMAGE_SHA256,
  DAEGU_SEATMAP_IMAGE,
  isDaeguNormalSelectableSeat,
  isDaeguOfficialUnconfirmedSeat,
  isDaeguReviewOnlySeat,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const AUDIT_VERSION = 'DAEGU_SEATMAP_RENDER_SAFETY_AUDIT_V1';
const UI_PASS_LEVEL = 'PASS_UI_CONTAINMENT';
const CLICKABLE_PASS_LEVEL = 'PASS_CLICKABLE_CURRENT';
const VISUAL_MATCH_PASS_LEVEL = 'PASS_VISUAL_MATCH';
const VISIBLE_OFFICIAL_PASS_LEVEL = 'PASS_RELEASE_VISIBLE_OFFICIAL_SEATS';
const RELEASE_PASS_LEVEL = 'PASS_RELEASE_177';
const WORKFLOW_PASS_LEVEL = 'PASS_WORKFLOW';
const EXPECTED_TOTAL_BLOCKS = 177;
const SCREENSHOT_ZONE_BLOCKS = new Set(['13', '14', '15', '16', 'U25', 'U26', 'U27', 'U28', 'S23', 'S24']);

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const precisionAuditPath = path.join(reportDir, 'daegu-seatmap-precision-audit.json');
const svgSourcePath = path.join(frontendRoot, 'src/components/daegu/DaeguSeatMapSvg.tsx');
const pageSourcePath = path.join(frontendRoot, 'src/components/daegu/DaeguSeatMap.tsx');

const csvEscape = (value) => {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

const writeCsv = async (filePath, rows) => {
  const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  await fs.writeFile(filePath, `${content}\n`, 'utf8');
};

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const xmlEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const readText = async (filePath) => fs.readFile(filePath, 'utf8');

const readJsonOptional = async (filePath) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const pathPoints = (pathData) => {
  const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
};

const pathOutOfBounds = (pathData) => pathPoints(pathData).some(([x, y]) => (
  x < 0
  || y < 0
  || x > DAEGU_SEATMAP_IMAGE.imageWidth
  || y > DAEGU_SEATMAP_IMAGE.imageHeight
));

const orientation = (a, b, c) => {
  const value = ((b[0] - a[0]) * (c[1] - a[1])) - ((b[1] - a[1]) * (c[0] - a[0]));
  return Math.sign(value);
};

const segmentsIntersect = (a, b, c, d) => {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return Boolean(o1 && o2 && o3 && o4 && o1 !== o2 && o3 !== o4);
};

const hasSelfIntersection = (points) => {
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    for (let nextIndex = index + 1; nextIndex < points.length; nextIndex += 1) {
      const adjacent = Math.abs(index - nextIndex) <= 1 || (index === 0 && nextIndex === points.length - 1);
      if (adjacent) continue;
      const c = points[nextIndex];
      const d = points[(nextIndex + 1) % points.length];
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
};

const flagCounts = (rows) => rows.reduce((counts, row) => {
  row.failureFlags.forEach((flag) => {
    counts[flag] = (counts[flag] ?? 0) + 1;
  });
  return counts;
}, {});

const precisionAudit = await readJsonOptional(precisionAuditPath);
const precisionRowsById = new Map((precisionAudit?.unresolvedWorkset ?? precisionAudit?.rows ?? []).map((row) => [row.id, row]));
const svgSource = await readText(svgSourcePath);
const pageSource = await readText(pageSourcePath);

const allSeatRows = DAEGU_BLOCKS.filter((block) => block.sectionKind === 'SEAT_SECTION');
const normalSelectableSeats = DAEGU_BLOCKS.filter(isDaeguNormalSelectableSeat);
const reviewOnlySeats = DAEGU_BLOCKS.filter(isDaeguReviewOnlySeat);
const officialUnconfirmedSeats = DAEGU_BLOCKS.filter(isDaeguOfficialUnconfirmedSeat);
const markerRows = DAEGU_BLOCKS.filter((block) => block.sectionKind !== 'SEAT_SECTION');
const classifiedReleaseRows = [...officialUnconfirmedSeats, ...markerRows];
const blockById = new Map(DAEGU_BLOCKS.map((block) => [block.id, block]));
const precisionUnresolvedRows = precisionAudit?.unresolvedWorkset ?? [];
const expectedReviewOnlySeats = Array.isArray(precisionUnresolvedRows)
  ? precisionUnresolvedRows.filter((row) => {
    const block = blockById.get(row.id);
    return block?.sectionKind === 'SEAT_SECTION' && !isDaeguOfficialUnconfirmedSeat(block);
  }).length
  : null;

const sourceContracts = {
  normalLayerUsesSelectablePredicate: svgSource.includes('renderBlocks.filter(isDaeguNormalSelectableSeat)'),
  reviewLayerUsesReviewPredicate: svgSource.includes('renderBlocks.filter(isDaeguReviewOnlySeat)'),
  reviewLayerDebugOnly: svgSource.includes('showDebug &&') && svgSource.includes('data-layer="daegu-review-polygon-layer"'),
  reviewLayerPointerDisabled: svgSource.includes('pointerEvents="none"'),
  markerLayerStillSeparate: svgSource.includes('data-layer="daegu-marker-layer"'),
  markerLayerUsesNonSeatRenderer: svgSource.includes('renderMarkerOnlyBlocks(renderMarkerBlocks)'),
  markerLayerPointerDisabled: svgSource.includes('data-layer="marker-only"') && svgSource.includes('pointerEvents="none"'),
  sectionFinderUsesSelectableBlocks: pageSource.includes('sections: selectableDaeguBlocks')
    && pageSource.includes('return selectableDaeguBlocks.filter'),
  hiddenSelectionGuard: pageSource.includes('!isDaeguNormalSelectableSeat(selected)')
    && pageSource.includes('!selectableDaeguBlockIds.has(hover)'),
};

const rows = reviewOnlySeats.map((block) => {
  const precisionRow = precisionRowsById.get(block.id);
  const flags = [
    'HIDDEN_FROM_NORMAL_UI',
    block.traceStatus,
    block.traceMethod,
    ...(precisionRow?.precisionFlags ?? []),
  ];
  if (block.traceMethod === 'LEGACY_SCALED_POLYGON') flags.push('LEGACY_RECTANGLE_REVIEW');
  if (SCREENSHOT_ZONE_BLOCKS.has(block.block)) flags.push('SCREENSHOT_ZONE_RISK');
  if (pathOutOfBounds(block.imageGeometry.hitPath ?? block.imageGeometry.d)) flags.push('PATH_BOUNDS_EXCEEDED');
  if (hasSelfIntersection(pathPoints(block.imageGeometry.hitPath ?? block.imageGeometry.d))) flags.push('SELF_INTERSECTION');

  return {
    auditVersion: AUDIT_VERSION,
    blockId: block.id,
    block: block.block,
    name: block.name,
    traceStatus: block.traceStatus,
    traceMethod: block.traceMethod,
    manualReviewed: block.imageGeometry.manualReviewed,
    pixelAlignmentStatus: block.imageGeometry.pixelAlignmentStatus,
    renderLayer: 'debug-review-only',
    normalUiSelectable: false,
    failureFlags: [...new Set(flags.filter(Boolean))],
    nextAction: precisionRow?.nextAction
      ?? 'Keep hidden from normal UI and request operator-approved correctedPath from the official PNG.',
    currentPath: block.imageGeometry.hitPath ?? block.imageGeometry.d,
    labelPoint: block.imageGeometry.labelPoint ?? [block.imageGeometry.labelX, block.imageGeometry.labelY],
    evidenceCrop: precisionRow?.evidenceCrop ?? '',
  };
});

const policyExcludedRows = officialUnconfirmedSeats.map((block) => {
  const precisionRow = precisionRowsById.get(block.id);
  const flags = [
    'HIDDEN_FROM_NORMAL_UI',
    'POLICY_EXCLUDED_OFFICIAL_COMPONENT_UNCONFIRMED',
    block.traceStatus,
    block.traceMethod,
    ...(precisionRow?.precisionFlags ?? []),
  ];

  return {
    auditVersion: AUDIT_VERSION,
    blockId: block.id,
    block: block.block,
    name: block.name,
    traceStatus: block.traceStatus,
    traceMethod: block.traceMethod,
    manualReviewed: block.imageGeometry.manualReviewed,
    pixelAlignmentStatus: block.imageGeometry.pixelAlignmentStatus,
    renderLayer: 'policy-excluded-official-unconfirmed',
    normalUiSelectable: false,
    failureFlags: [...new Set(flags.filter(Boolean))],
    nextAction: precisionRow?.nextAction
      ?? 'Keep policy-excluded until operator confirms an independent official seat component.',
    currentPath: block.imageGeometry.hitPath ?? block.imageGeometry.d,
    labelPoint: block.imageGeometry.labelPoint ?? [block.imageGeometry.labelX, block.imageGeometry.labelY],
    evidenceCrop: precisionRow?.evidenceCrop ?? '',
  };
});
const hiddenRows = [...rows, ...policyExcludedRows];

const hardBlockers = [];
if (DAEGU_SEATMAP_IMAGE.imageSha256 !== DAEGU_IMAGE_SHA256) hardBlockers.push('IMAGE_SHA256_CONSTANT_MISMATCH');
if (DAEGU_BLOCKS.length !== EXPECTED_TOTAL_BLOCKS) hardBlockers.push(`DAEGU_BLOCK_CONTRACT_CHANGED:${DAEGU_BLOCKS.length}`);
if (expectedReviewOnlySeats === null) {
  hardBlockers.push('PRECISION_AUDIT_UNRESOLVED_COUNT_MISSING');
} else if (reviewOnlySeats.length !== expectedReviewOnlySeats) {
  hardBlockers.push(`REVIEW_ONLY_SEAT_COUNT_MISMATCH:${reviewOnlySeats.length}:${expectedReviewOnlySeats}`);
}
Object.entries(sourceContracts).forEach(([key, ok]) => {
  if (!ok) hardBlockers.push(`SOURCE_CONTRACT_MISSING:${key}`);
});
const normalPolicyFailures = normalSelectableSeats.filter((block) => (
  block.sectionKind !== 'SEAT_SECTION'
  || block.traceStatus !== 'OFFICIAL_IMAGE_TRACED'
  || block.imageGeometry.manualReviewed !== true
  || block.imageGeometry.pixelAlignmentStatus !== 'PIXEL_ALIGNED'
));
if (normalPolicyFailures.length > 0) {
  hardBlockers.push(`NORMAL_SELECTABLE_POLICY_FAILURE:${normalPolicyFailures.map((block) => block.block).join(' ')}`);
}
const screenshotBlock16 = DAEGU_BLOCKS.find((block) => block.sectionKind === 'SEAT_SECTION' && block.block === '16');
if (!screenshotBlock16) {
  hardBlockers.push('SCREENSHOT_BLOCK_16_MISSING');
} else if (isDaeguReviewOnlySeat(screenshotBlock16)) {
  const reviewRow = rows.find((row) => row.block === '16');
  if (!reviewRow || !(
    reviewRow.failureFlags.includes('FLOATING_OR_OFF_SEAT_REVIEW')
    || reviewRow.failureFlags.includes('LEGACY_RECTANGLE_REVIEW')
    || reviewRow.failureFlags.includes('SCREENSHOT_ZONE_RISK')
    || reviewRow.failureFlags.includes('UNRESOLVED_REQUIRES_OPERATOR_APPROVAL')
  )) {
    hardBlockers.push('SCREENSHOT_BLOCK_16_REVIEW_NOT_FLAGGED');
  }
} else if (!isDaeguNormalSelectableSeat(screenshotBlock16)) {
  hardBlockers.push('SCREENSHOT_BLOCK_16_NOT_SELECTABLE_OR_REVIEW_ONLY');
}

const passLevel = hardBlockers.length === 0
  ? UI_PASS_LEVEL
  : WORKFLOW_PASS_LEVEL;
const releaseReady = reviewOnlySeats.length === 0
  && normalSelectableSeats.length + classifiedReleaseRows.length === DAEGU_BLOCKS.length
  && hardBlockers.length === 0;
const visibleOfficialReleaseReady = reviewOnlySeats.length === 0
  && normalSelectableSeats.length + officialUnconfirmedSeats.length === allSeatRows.length
  && hardBlockers.length === 0;
const report = {
  generatedAt: new Date().toISOString(),
  auditVersion: AUDIT_VERSION,
  status: hardBlockers.length > 0 ? 'failed' : releaseReady ? 'release-ready' : 'ui-contained',
  passLevel: releaseReady
    ? RELEASE_PASS_LEVEL
    : visibleOfficialReleaseReady
      ? VISIBLE_OFFICIAL_PASS_LEVEL
      : passLevel,
  sourceReports: {
    precisionAudit: {
      exists: Boolean(precisionAudit),
      path: path.relative(frontendRoot, precisionAuditPath),
      passLevel: precisionAudit?.passLevel ?? '',
    },
  },
  passCriteria: {
    [WORKFLOW_PASS_LEVEL]: 'Scripts ran, but normal UI containment is not proven.',
    [UI_PASS_LEVEL]: 'Unreviewed Daegu seat polygons are hidden from the normal UI and remain available only in debug review overlays.',
    [CLICKABLE_PASS_LEVEL]: `The currently exposed ${normalSelectableSeats.length} Daegu seat polygons passed click/render smoke only; this is not official PNG visual precision proof.`,
    [VISUAL_MATCH_PASS_LEVEL]: 'Official PNG crop overlays have no visual blockers for visible official Daegu seat polygons.',
    [VISIBLE_OFFICIAL_PASS_LEVEL]: 'Visible official Daegu seat polygons are contained; classified non-seat/policy-excluded rows are hidden from selectable seat layers.',
    [RELEASE_PASS_LEVEL]: 'All 177 Daegu inventory rows are resolved: official seat polygons are selectable and classified non-seat/policy-excluded rows are not selectable seat polygons.',
  },
  summary: {
    totalBlocks: DAEGU_BLOCKS.length,
    seatSections: allSeatRows.length,
    markerRows: markerRows.length,
    normalSelectableSeats: normalSelectableSeats.length,
    reviewOnlySeats: reviewOnlySeats.length,
    officialUnconfirmedSeats: officialUnconfirmedSeats.length,
    classifiedReleaseRows: classifiedReleaseRows.length,
    expectedReviewOnlySeats,
    expectedReviewOnlySource: 'reports/stadium/daegu-seatmap-precision-audit.json unresolvedWorkset filtered to sectionKind=SEAT_SECTION',
    hiddenFromNormalUiRows: hiddenRows.length,
    sourceContracts,
    failureFlagCounts: flagCounts(hiddenRows),
    hardBlockers,
    visibleOfficialReleaseReady,
    releaseReady,
    precisionStatement: 'PASS_RELEASE_177 can be reached only when visible official seat polygons pass visual match and classified rows remain outside selectable seat layers.',
  },
  rows,
  policyExcludedRows,
};

const jsonPath = path.join(reportDir, 'daegu-seatmap-render-safety-audit.json');
const csvPath = path.join(reportDir, 'daegu-seatmap-render-safety-audit.csv');
const markdownPath = path.join(reportDir, 'daegu-seatmap-render-safety-audit.md');
const svgPath = path.join(reportDir, 'daegu-seatmap-render-safety-audit.svg');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  ['block', 'blockId', 'name', 'traceStatus', 'traceMethod', 'renderLayer', 'normalUiSelectable', 'failureFlags', 'nextAction', 'evidenceCrop'],
  ...rows.map((row) => [
    row.block,
    row.blockId,
    row.name,
    row.traceStatus,
    row.traceMethod,
    row.renderLayer,
    row.normalUiSelectable,
    row.failureFlags.join(' '),
    row.nextAction,
    row.evidenceCrop,
  ]),
  ...policyExcludedRows.map((row) => [
    row.block,
    row.blockId,
    row.name,
    row.traceStatus,
    row.traceMethod,
    row.renderLayer,
    row.normalUiSelectable,
    row.failureFlags.join(' '),
    row.nextAction,
    row.evidenceCrop,
  ]),
]);

const flagRows = Object.entries(report.summary.failureFlagCounts)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([flag, count]) => [`\`${flag}\``, String(count)]);
const worksetRows = hiddenRows.slice(0, 80).map((row) => [
  `\`${row.block}\``,
  row.name,
  `\`${row.traceMethod}\``,
  row.failureFlags.map((flag) => `\`${flag}\``).join('<br>'),
  row.nextAction,
]);

const markdown = [
  '# Daegu Seatmap Render Safety Audit',
  '',
  `- audit version: \`${AUDIT_VERSION}\``,
  `- status: \`${report.status}\``,
  `- pass level: \`${report.passLevel}\``,
  `- normal selectable seats: ${report.summary.normalSelectableSeats}`,
  `- review-only seats hidden from normal UI: ${report.summary.reviewOnlySeats}`,
  `- official-image unconfirmed seats hidden from all seat layers: ${report.summary.officialUnconfirmedSeats}`,
  `- classified release rows: ${report.summary.classifiedReleaseRows}`,
  `- visible official release ready: ${report.summary.visibleOfficialReleaseReady}`,
  `- release ready: ${report.summary.releaseReady}`,
  `- precision statement: ${report.summary.precisionStatement}`,
  '',
  '## Pass Criteria',
  '',
  markdownTable(
    ['level', 'meaning'],
    Object.entries(report.passCriteria).map(([level, meaning]) => [`\`${level}\``, meaning]),
  ),
  '',
  '## Source Contracts',
  '',
  markdownTable(
    ['contract', 'ok'],
    Object.entries(sourceContracts).map(([key, ok]) => [`\`${key}\``, String(ok)]),
  ),
  '',
  '## Hard Blockers',
  '',
  hardBlockers.length > 0 ? hardBlockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No hard blockers.',
  '',
  '## Failure Flags',
  '',
  flagRows.length > 0 ? markdownTable(['flag', 'rows'], flagRows) : 'No hidden rows.',
  '',
  '## Hidden Workset',
  '',
  worksetRows.length > 0
    ? markdownTable(['block', 'name', 'method', 'flags', 'next action'], worksetRows)
    : 'No hidden workset rows.',
  '',
].join('\n');
await fs.writeFile(markdownPath, markdown, 'utf8');

const overlaySvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1707" height="2048" viewBox="0 0 1707 2048">',
  '  <style>',
  '    .normal { fill: #16a34a; fill-opacity: 0.05; stroke: #16a34a; stroke-opacity: 0.22; stroke-width: 1.5; vector-effect: non-scaling-stroke; }',
  '    .review { fill: #f97316; fill-opacity: 0.14; stroke: #f97316; stroke-opacity: 0.78; stroke-width: 2.5; stroke-dasharray: 7 5; vector-effect: non-scaling-stroke; }',
  '    .policy { fill: #64748b; fill-opacity: 0.12; stroke: #334155; stroke-opacity: 0.82; stroke-width: 2.5; stroke-dasharray: 3 4; vector-effect: non-scaling-stroke; }',
  '    .label { font: 900 11px sans-serif; fill: #f97316; stroke: #fff; stroke-width: 3; paint-order: stroke; }',
  '  </style>',
  '  <image href="../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png" x="0" y="0" width="1707" height="2048" preserveAspectRatio="none" />',
  '  <g id="normal-selectable-seat-reference">',
  ...normalSelectableSeats.map((block) => `    <path class="normal" d="${xmlEscape(block.imageGeometry.hitPath ?? block.imageGeometry.d)}"><title>${xmlEscape(`${block.block} normal selectable`)}</title></path>`),
  '  </g>',
  '  <g id="hidden-review-only-seat-polygons">',
  ...rows.map((row) => `    <path class="review" d="${xmlEscape(row.currentPath)}"><title>${xmlEscape(`${row.block} ${(row.failureFlags ?? []).join(' ')}`)}</title></path>`),
  '  </g>',
  '  <g id="policy-excluded-official-unconfirmed-polygons">',
  ...policyExcludedRows.map((row) => `    <path class="policy" d="${xmlEscape(row.currentPath)}"><title>${xmlEscape(`${row.block} ${(row.failureFlags ?? []).join(' ')}`)}</title></path>`),
  '  </g>',
  '  <g id="review-labels">',
  ...hiddenRows.map((row) => `    <text class="label" x="${row.labelPoint[0] + 6}" y="${row.labelPoint[1] - 6}">${xmlEscape(row.block)}</text>`),
  '  </g>',
  '</svg>',
].join('\n');
await fs.writeFile(svgPath, overlaySvg, 'utf8');

console.log(`render_safety_audit_json:${jsonPath}`);
console.log(`render_safety_audit_csv:${csvPath}`);
console.log(`render_safety_audit_markdown:${markdownPath}`);
console.log(`render_safety_audit_svg:${svgPath}`);
console.log(`status:${report.status} passLevel=${report.passLevel} normalSelectable=${report.summary.normalSelectableSeats} reviewOnly=${report.summary.reviewOnlySeats} officialUnconfirmed=${report.summary.officialUnconfirmedSeats}`);

if (hardBlockers.length > 0) {
  process.exitCode = 1;
}
