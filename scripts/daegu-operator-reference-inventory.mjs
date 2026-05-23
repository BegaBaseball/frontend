import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DAEGU_BLOCKS } from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const autoMapDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-auto-map');
const autoMapJsonPath = path.join(autoMapDir, 'daegu-operator-reference-auto-map.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-inventory');
const inventoryJsonPath = path.join(outputDir, 'daegu-operator-reference-inventory.json');
const referenceCsvPath = path.join(outputDir, 'daegu-operator-reference-components.csv');
const existingCsvPath = path.join(outputDir, 'daegu-existing-block-reference-coverage.csv');
const markdownPath = path.join(outputDir, 'daegu-operator-reference-inventory.md');

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsvRows(rows, columns) {
  return `${[
    columns.map(csvEscape).join(','),
    ...rows.map((row) => columns.map((column) => {
      const value = row[column];
      return csvEscape(Array.isArray(value) ? value.join('|') : value);
    }).join(',')),
  ].join('\n')}\n`;
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] || 'UNCLASSIFIED';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function resolveReferenceStatus(row) {
  if (row.autoMappingStatus === 'AUTO_SUGGESTED_EXISTING_BLOCK') return 'REFERENCE_EXACT_EXISTING_MATCH';
  if (row.autoMappingStatus === 'AUTO_REFERENCE_LABEL_UNMATCHED') return 'REFERENCE_VISIBLE_LABEL_UNMATCHED';
  if (row.autoMappingStatus === 'AUTO_FAMILY_REVIEW_REQUIRED') return 'REFERENCE_FAMILY_REVIEW_REQUIRED';
  if (row.autoMappingStatus === 'AUTO_NON_SEAT_OR_MARKER_REVIEW') return 'REFERENCE_NON_SEAT_OR_MARKER_REVIEW';
  return 'REFERENCE_MANUAL_REVIEW_REQUIRED';
}

function resolveNextAction(row) {
  switch (resolveReferenceStatus(row)) {
    case 'REFERENCE_EXACT_EXISTING_MATCH':
      return 'Operator must approve the suggested existing block before production import.';
    case 'REFERENCE_VISIBLE_LABEL_UNMATCHED':
      return 'Treat as missing-block candidate; decide whether to add a new section or map to an existing alias.';
    case 'REFERENCE_FAMILY_REVIEW_REQUIRED':
      return 'Review the family group on the image and assign exact section ownership manually.';
    case 'REFERENCE_NON_SEAT_OR_MARKER_REVIEW':
      return 'Keep out of selectable seat layer unless operator confirms it is a seat section.';
    default:
      return 'Manual image review is required before any mapping decision.';
  }
}

function buildReferenceRows(autoRows) {
  return autoRows.map((row) => ({
    draftId: row.draftId,
    referenceStatus: resolveReferenceStatus(row),
    visibleLabel: row.autoSuggestedBlockName,
    suggestedExistingSectionId: row.autoSuggestedExistingSectionId,
    suggestedExistingBlockName: row.autoSuggestedExistingBlockName,
    candidateFamily: row.autoCandidateFamily,
    confidence: row.autoConfidence,
    suggestedZone: row.suggestedZone,
    colorClass: row.colorClass,
    minX: row.minX,
    minY: row.minY,
    maxX: row.maxX,
    maxY: row.maxY,
    labelX: row.labelX,
    labelY: row.labelY,
    pointCount: row.pointCount,
    riskFlags: Array.isArray(row.riskFlags) ? row.riskFlags : String(row.riskFlags ?? '').split('|').filter(Boolean),
    nextAction: resolveNextAction(row),
  })).sort((a, b) => {
    const statusOrder = {
      REFERENCE_VISIBLE_LABEL_UNMATCHED: 0,
      REFERENCE_EXACT_EXISTING_MATCH: 1,
      REFERENCE_FAMILY_REVIEW_REQUIRED: 2,
      REFERENCE_MANUAL_REVIEW_REQUIRED: 3,
      REFERENCE_NON_SEAT_OR_MARKER_REVIEW: 4,
    };
    return (statusOrder[a.referenceStatus] ?? 99) - (statusOrder[b.referenceStatus] ?? 99)
      || a.draftId.localeCompare(b.draftId);
  });
}

function buildExistingRows(referenceRows) {
  const directMatchesBySection = new Map();
  for (const row of referenceRows) {
    if (!row.suggestedExistingSectionId) continue;
    const rows = directMatchesBySection.get(row.suggestedExistingSectionId) ?? [];
    rows.push(row);
    directMatchesBySection.set(row.suggestedExistingSectionId, rows);
  }

  return DAEGU_BLOCKS.map((block) => {
    const matches = directMatchesBySection.get(block.id) ?? [];
    const coverageStatus = matches.length > 0
      ? 'EXISTING_DIRECTLY_CONFIRMED_BY_REFERENCE_LABEL'
      : 'EXISTING_NOT_DIRECTLY_CONFIRMED_BY_REFERENCE_LABEL';
    return {
      sectionId: block.id,
      block: block.block,
      name: block.name,
      category: block.category,
      level: block.level,
      side: block.side,
      sectionKind: block.sectionKind,
      traceStatus: block.traceStatus,
      coverageStatus,
      referenceDraftIds: matches.map((match) => match.draftId),
      referenceVisibleLabels: matches.map((match) => match.visibleLabel),
      nextAction: matches.length > 0
        ? 'Exact reference label exists, but operator approval is still required before coordinate promotion.'
        : 'No exact visible-label reference match yet; keep current source status and review by image zone before declaring missing.',
    };
  }).sort((a, b) => a.coverageStatus.localeCompare(b.coverageStatus) || a.sectionId.localeCompare(b.sectionId));
}

async function main() {
  let autoMap;
  try {
    autoMap = JSON.parse(await fs.readFile(autoMapJsonPath, 'utf8'));
  } catch (error) {
    throw new Error(`Auto-map report not found. Run npm run stadium:daegu:operator-reference-auto-map first. ${error.message}`);
  }

  const referenceRows = buildReferenceRows(autoMap.autoRows ?? []);
  const existingRows = buildExistingRows(referenceRows);
  const visibleUnmatchedRows = referenceRows.filter((row) => row.referenceStatus === 'REFERENCE_VISIBLE_LABEL_UNMATCHED');
  const exactRows = referenceRows.filter((row) => row.referenceStatus === 'REFERENCE_EXACT_EXISTING_MATCH');
  const directConfirmedExistingRows = existingRows.filter((row) => row.coverageStatus === 'EXISTING_DIRECTLY_CONFIRMED_BY_REFERENCE_LABEL');
  const unconfirmedExistingRows = existingRows.filter((row) => row.coverageStatus === 'EXISTING_NOT_DIRECTLY_CONFIRMED_BY_REFERENCE_LABEL');

  const report = {
    status: 'operator-reference-inventory-ready',
    generatedAt: new Date().toISOString(),
    source: autoMap.source,
    policy: {
      productionWriteAllowed: false,
      operatorApprovalRequired: true,
      note: 'This inventory is image-analysis evidence only. Do not promote coordinates without approved operator rows.',
    },
    summary: {
      referenceComponentCount: referenceRows.length,
      existingBlockCount: existingRows.length,
      exactReferenceMatches: exactRows.length,
      visibleLabelUnmatchedCount: visibleUnmatchedRows.length,
      directlyConfirmedExistingBlockCount: directConfirmedExistingRows.length,
      notDirectlyConfirmedExistingBlockCount: unconfirmedExistingRows.length,
      referenceStatusCounts: countBy(referenceRows, 'referenceStatus'),
      existingCoverageCounts: countBy(existingRows, 'coverageStatus'),
      candidateFamilyCounts: countBy(referenceRows, 'candidateFamily'),
    },
    priorityQueues: {
      p0MissingBlockCandidates: visibleUnmatchedRows.map((row) => ({
        draftId: row.draftId,
        visibleLabel: row.visibleLabel,
        suggestedZone: row.suggestedZone,
        colorClass: row.colorClass,
        bounds: [row.minX, row.minY, row.maxX, row.maxY],
        nextAction: row.nextAction,
      })),
      p1ExactMatchApprovalCandidates: exactRows.map((row) => ({
        draftId: row.draftId,
        visibleLabel: row.visibleLabel,
        existingSectionId: row.suggestedExistingSectionId,
        existingBlockName: row.suggestedExistingBlockName,
        bounds: [row.minX, row.minY, row.maxX, row.maxY],
        nextAction: row.nextAction,
      })),
    },
    outputs: {
      inventoryJson: path.relative(frontendRoot, inventoryJsonPath),
      referenceCsv: path.relative(frontendRoot, referenceCsvPath),
      existingCsv: path.relative(frontendRoot, existingCsvPath),
      markdown: path.relative(frontendRoot, markdownPath),
    },
    referenceRows,
    existingRows,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(inventoryJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(referenceCsvPath, writeCsvRows(referenceRows, [
    'draftId',
    'referenceStatus',
    'visibleLabel',
    'suggestedExistingSectionId',
    'suggestedExistingBlockName',
    'candidateFamily',
    'confidence',
    'suggestedZone',
    'colorClass',
    'minX',
    'minY',
    'maxX',
    'maxY',
    'labelX',
    'labelY',
    'pointCount',
    'riskFlags',
    'nextAction',
  ]));
  await fs.writeFile(existingCsvPath, writeCsvRows(existingRows, [
    'sectionId',
    'block',
    'name',
    'category',
    'level',
    'side',
    'sectionKind',
    'traceStatus',
    'coverageStatus',
    'referenceDraftIds',
    'referenceVisibleLabels',
    'nextAction',
  ]));
  await fs.writeFile(markdownPath, [
    '# 대구 operator reference inventory',
    '',
    `- status: \`${report.status}\``,
    `- source: \`${report.source.imagePath}\``,
    `- coordinate system: \`${report.source.viewBox}\``,
    `- reference components: \`${report.summary.referenceComponentCount}\``,
    `- existing blocks: \`${report.summary.existingBlockCount}\``,
    `- exact reference matches: \`${report.summary.exactReferenceMatches}\``,
    `- visible label unmatched: \`${report.summary.visibleLabelUnmatchedCount}\``,
    `- directly confirmed existing blocks: \`${report.summary.directlyConfirmedExistingBlockCount}\``,
    `- not directly confirmed existing blocks: \`${report.summary.notDirectlyConfirmedExistingBlockCount}\``,
    `- production write allowed: \`${report.policy.productionWriteAllowed}\``,
    '',
    '## P0 Missing-Block Candidates',
    '',
    visibleUnmatchedRows.length > 0
      ? visibleUnmatchedRows.map((row) => `- \`${row.visibleLabel}\` (${row.draftId}, ${row.suggestedZone}, ${row.colorClass}, bounds ${row.minX}/${row.minY}/${row.maxX}/${row.maxY})`).join('\n')
      : '- none',
    '',
    '## Reference Status Counts',
    '',
    ...Object.entries(report.summary.referenceStatusCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([status, count]) => `- \`${status}\`: ${count}`),
    '',
    '## Existing Coverage Counts',
    '',
    ...Object.entries(report.summary.existingCoverageCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([status, count]) => `- \`${status}\`: ${count}`),
    '',
    '## Outputs',
    '',
    `- inventory JSON: \`${report.outputs.inventoryJson}\``,
    `- reference CSV: \`${report.outputs.referenceCsv}\``,
    `- existing CSV: \`${report.outputs.existingCsv}\``,
    '',
    '## Promotion Rule',
    '',
    '이 inventory는 업로드 이미지 분석 근거다. 좌표 production 반영은 operator-approved row가 들어온 뒤 별도 gate에서만 진행한다.',
    '',
  ].join('\n'));

  console.log(`operator_reference_inventory_markdown:${markdownPath}`);
  console.log(`operator_reference_inventory_json:${inventoryJsonPath}`);
  console.log(`operator_reference_reference_csv:${referenceCsvPath}`);
  console.log(`operator_reference_existing_csv:${existingCsvPath}`);
  console.log(`status:${report.status} missingCandidates=${report.summary.visibleLabelUnmatchedCount} exact=${report.summary.exactReferenceMatches} existingUnconfirmed=${report.summary.notDirectlyConfirmedExistingBlockCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
