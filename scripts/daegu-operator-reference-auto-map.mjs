import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DAEGU_BLOCKS } from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reviewDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-review');
const mappingJsonPath = path.join(reviewDir, 'daegu-operator-reference-mapping-template.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-auto-map');
const aliasJsonPath = path.join(outputDir, 'daegu-existing-block-aliases.json');
const aliasCsvPath = path.join(outputDir, 'daegu-existing-block-aliases.csv');
const autoMapJsonPath = path.join(outputDir, 'daegu-operator-reference-auto-map.json');
const autoMapCsvPath = path.join(outputDir, 'daegu-operator-reference-auto-map.csv');
const autoMapMdPath = path.join(outputDir, 'daegu-operator-reference-auto-map.md');

const directDraftLabelHints = new Map([
  ['RAPAK_REF_001', 'TR9'],
  ['RAPAK_REF_002', 'TR10'],
  ['RAPAK_REF_003', 'TR8'],
  ['RAPAK_REF_004', 'LF9'],
  ['RAPAK_REF_005', 'LF10'],
  ['RAPAK_REF_006', 'RF10'],
  ['RAPAK_REF_007', 'RF9'],
  ['RAPAK_REF_008', 'RF8'],
  ['RAPAK_REF_009', 'LF8'],
  ['RAPAK_REF_010', 'F2'],
  ['RAPAK_REF_012', 'TR7'],
  ['RAPAK_REF_015', 'MR10'],
  ['RAPAK_REF_017', 'RF7'],
  ['RAPAK_REF_018', 'LF7'],
  ['RAPAK_REF_019', 'TR6'],
  ['RAPAK_REF_022', 'RF6'],
  ['RAPAK_REF_023', 'LF6'],
  ['RAPAK_REF_024', 'TR5'],
  ['RAPAK_REF_027', 'RF5'],
  ['RAPAK_REF_028', 'LF5'],
  ['RAPAK_REF_029', 'TR4'],
  ['RAPAK_REF_032', 'RF4'],
  ['RAPAK_REF_033', 'F1'],
  ['RAPAK_REF_034', 'LF4'],
  ['RAPAK_REF_035', 'TR3'],
  ['RAPAK_REF_038', 'RF3'],
  ['RAPAK_REF_039', 'LF3'],
  ['RAPAK_REF_040', 'TR2'],
  ['RAPAK_REF_042', 'RF2'],
  ['RAPAK_REF_044', 'LF2'],
  ['RAPAK_REF_045', 'TR1'],
  ['RAPAK_REF_048', 'RF1'],
  ['RAPAK_REF_049', 'LF1'],
  ['RAPAK_REF_051', 'TR0'],
  ['RAPAK_REF_060', 'S31'],
  ['RAPAK_REF_068', 'S30'],
  ['RAPAK_REF_075', 'S29'],
  ['RAPAK_REF_081', 'S28'],
  ['RAPAK_REF_089', 'S27'],
  ['RAPAK_REF_100', 'S26'],
  ['RAPAK_REF_110', 'S25'],
  ['RAPAK_REF_121', 'S24'],
]);

const zoneFamilyHints = [
  { zone: 'OUTFIELD_TOP_CENTER', colorClass: 'PINK', family: 'TR', reason: 'top outfield pink reference blocks use TR labels' },
  { zone: 'RIGHT_FIELD_OR_FIRST_BASE_TOP', colorClass: 'PINK', family: 'TR', reason: 'right-top pink diagonal blocks use TR labels' },
  { zone: 'LEFT_FIELD_OR_THIRD_BASE_TOP', colorClass: 'TEAL', family: 'LF', reason: 'left-top teal diagonal blocks use LF labels' },
  { zone: 'OUTFIELD_TOP_CENTER', colorClass: 'TEAL', family: 'LF/RF', reason: 'top-center teal blocks split between LF and RF labels' },
  { zone: 'RIGHT_FIELD_OR_FIRST_BASE_TOP', colorClass: 'TEAL', family: 'RF', reason: 'right-top teal diagonal blocks use RF labels' },
  { zone: 'OUTFIELD_TOP_CENTER', colorClass: 'ORANGE', family: 'ML/MR', reason: 'top-center orange blocks are mini table left/right labels' },
  { zone: 'LEFT_FIELD_OR_THIRD_BASE_TOP', colorClass: 'ORANGE', family: 'ML', reason: 'left-top orange diagonal blocks use ML labels in the operator reference' },
  { zone: 'RIGHT_FIELD_OR_FIRST_BASE_TOP', colorClass: 'ORANGE', family: 'MR/F', reason: 'right-top orange blocks mix MR labels and F markers' },
  { zone: 'SKY_LEFT_OUTER', colorClass: 'BLUE', family: 'S24-S31', reason: 'left outer blue stack shows upper SKY section numbers' },
  { zone: 'SKY_LEFT_OUTER', colorClass: 'CYAN', family: 'SKY_LEFT_LOWER_STRIP', reason: 'cyan strip beside SKY left stack has no standalone block label' },
  { zone: 'SKY_BOTTOM_ROW', colorClass: 'BLUE', family: 'SKY_BOTTOM_UPPER', reason: 'bottom blue stack uses SKY upper number labels' },
  { zone: 'SKY_BOTTOM_ROW', colorClass: 'CYAN', family: 'SKY_BOTTOM_LOWER_STRIP', reason: 'bottom cyan strip requires manual linkage to adjacent SKY labels' },
  { zone: 'FIRST_BASE_INFIELD', colorClass: 'LIME', family: '1루 내야지정석', reason: 'first-base lime blocks are infield reserved seats' },
  { zone: 'THIRD_BASE_INFIELD', colorClass: 'LIME', family: '3루 내야지정석', reason: 'third-base lime blocks are infield reserved seats' },
  { zone: 'FIRST_BASE_INFIELD', colorClass: 'RED', family: '원정 응원석', reason: 'first-base red blocks are away cheering sections' },
  { zone: 'THIRD_BASE_INFIELD', colorClass: 'CYAN', family: '블루존/3루 내야', reason: 'third-base cyan blocks require manual split between blue zone and infield labels' },
  { zone: 'FIRST_BASE_TABLE', colorClass: 'ORANGE', family: '1루 테이블석', reason: 'first-base orange lower blocks are table seats' },
  { zone: 'THIRD_BASE_TABLE', colorClass: 'DARK_RED', family: '3루 테이블석', reason: 'third-base dark-red lower blocks are table seats' },
  { zone: 'CENTER_TABLE_OR_VIP', colorClass: 'PURPLE', family: 'VIP', reason: 'center purple blocks are VIP seats' },
  { zone: 'CENTER_TABLE_OR_VIP', colorClass: 'PINK', family: '중앙 테이블석', reason: 'center pink blocks are central table seats' },
];

const nonSeatZonePattern = /FACILITY_OR_MARKER/i;

function normalizeAlias(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .replace(/-/g, '');
}

function canonicalReferenceLabel(label) {
  const normalized = normalizeAlias(label);
  const match = normalized.match(/^([A-Z]+)(\d+)$/);
  if (!match) return normalized;

  const [, prefix, rawNumber] = match;
  const number = String(Number(rawNumber));
  if (['LF', 'RF', 'MR', 'TR', 'F'].includes(prefix)) return `${prefix}${number}`;
  return `${prefix}${number}`;
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(rows, columns) {
  return `${[
    columns.map(csvEscape).join(','),
    ...rows.map((row) => columns.map((column) => {
      const value = row[column];
      return csvEscape(Array.isArray(value) ? value.join('|') : value);
    }).join(',')),
  ].join('\n')}\n`;
}

function buildAliasRows() {
  const rows = [];
  for (const block of DAEGU_BLOCKS) {
    const rawAliases = new Set([
      block.block,
      block.name,
      ...(block.officialBlocks ?? []),
      block.block?.replace('-', ''),
    ]);
    for (const alias of rawAliases) {
      if (!alias) continue;
      rows.push({
        alias,
        normalizedAlias: canonicalReferenceLabel(alias),
        existingSectionId: block.id,
        existingBlockName: block.name,
        block: block.block,
        category: block.category,
        level: block.level,
        side: block.side,
        sectionKind: block.sectionKind,
        traceStatus: block.traceStatus,
      });
    }
  }
  return rows.sort((a, b) => a.normalizedAlias.localeCompare(b.normalizedAlias) || a.existingSectionId.localeCompare(b.existingSectionId));
}

function buildAliasIndex(aliasRows) {
  const index = new Map();
  for (const row of aliasRows) {
    const rows = index.get(row.normalizedAlias) ?? [];
    rows.push(row);
    index.set(row.normalizedAlias, rows);
  }
  return index;
}

function findZoneFamily(row) {
  return zoneFamilyHints.find((hint) => hint.zone === row.suggestedZone && hint.colorClass === row.colorClass) ?? null;
}

function pickExistingMatch(matches) {
  if (!matches.length) return null;
  const seatMatches = matches.filter((match) => match.sectionKind === 'SEAT_SECTION');
  return (seatMatches.length ? seatMatches : matches).sort((a, b) => {
    const aOfficial = a.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? 0 : 1;
    const bOfficial = b.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? 0 : 1;
    return aOfficial - bOfficial || a.existingSectionId.localeCompare(b.existingSectionId);
  })[0];
}

function buildAutoSuggestion(row, aliasIndex) {
  const directLabel = directDraftLabelHints.get(row.draftId) ?? '';
  const directKey = directLabel ? canonicalReferenceLabel(directLabel) : '';
  const matches = directKey ? aliasIndex.get(directKey) ?? [] : [];
  const existingMatch = pickExistingMatch(matches);
  const zoneFamily = findZoneFamily(row);

  if (existingMatch) {
    return {
      autoSuggestedBlockName: directLabel,
      autoSuggestedExistingSectionId: existingMatch.existingSectionId,
      autoSuggestedExistingBlockName: existingMatch.existingBlockName,
      autoCandidateFamily: zoneFamily?.family ?? directLabel.replace(/\d+$/, ''),
      autoConfidence: '0.92',
      autoMappingStatus: 'AUTO_SUGGESTED_EXISTING_BLOCK',
      autoReason: `direct visible label hint ${directLabel} matched existing Daegu alias ${existingMatch.block}`,
      autoExistingMatchCount: String(matches.length),
    };
  }

  if (directLabel) {
    return {
      autoSuggestedBlockName: directLabel,
      autoSuggestedExistingSectionId: '',
      autoSuggestedExistingBlockName: '',
      autoCandidateFamily: zoneFamily?.family ?? directLabel.replace(/\d+$/, ''),
      autoConfidence: '0.68',
      autoMappingStatus: 'AUTO_REFERENCE_LABEL_UNMATCHED',
      autoReason: `direct visible label hint ${directLabel} is not present in existing DAEGU_BLOCKS aliases`,
      autoExistingMatchCount: String(matches.length),
    };
  }

  if (nonSeatZonePattern.test(row.suggestedZone) || row.riskFlags.includes('NON_SEAT_MARKER_OR_FACILITY_REVIEW')) {
    return {
      autoSuggestedBlockName: '',
      autoSuggestedExistingSectionId: '',
      autoSuggestedExistingBlockName: '',
      autoCandidateFamily: 'MARKER_OR_FACILITY_REVIEW',
      autoConfidence: '0.35',
      autoMappingStatus: 'AUTO_NON_SEAT_OR_MARKER_REVIEW',
      autoReason: 'review packet classified this row as facility/marker-adjacent, so it must not be promoted automatically',
      autoExistingMatchCount: '0',
    };
  }

  if (zoneFamily) {
    return {
      autoSuggestedBlockName: '',
      autoSuggestedExistingSectionId: '',
      autoSuggestedExistingBlockName: '',
      autoCandidateFamily: zoneFamily.family,
      autoConfidence: '0.45',
      autoMappingStatus: 'AUTO_FAMILY_REVIEW_REQUIRED',
      autoReason: zoneFamily.reason,
      autoExistingMatchCount: '0',
    };
  }

  return {
    autoSuggestedBlockName: '',
    autoSuggestedExistingSectionId: '',
    autoSuggestedExistingBlockName: '',
    autoCandidateFamily: '',
    autoConfidence: '0.00',
    autoMappingStatus: 'AUTO_REVIEW_REQUIRED',
    autoReason: 'no deterministic family or visible-label rule matched this draft row',
    autoExistingMatchCount: '0',
  };
}

function summarize(rows) {
  const byStatus = {};
  const byFamily = {};
  for (const row of rows) {
    byStatus[row.autoMappingStatus] = (byStatus[row.autoMappingStatus] ?? 0) + 1;
    const family = row.autoCandidateFamily || 'UNCLASSIFIED';
    byFamily[family] = (byFamily[family] ?? 0) + 1;
  }
  return { byStatus, byFamily };
}

async function main() {
  let reviewPacket;
  try {
    reviewPacket = JSON.parse(await fs.readFile(mappingJsonPath, 'utf8'));
  } catch (error) {
    throw new Error(`Review mapping template not found. Run npm run stadium:daegu:operator-reference-review-packet first. ${error.message}`);
  }

  const aliasRows = buildAliasRows();
  const aliasIndex = buildAliasIndex(aliasRows);
  const autoRows = reviewPacket.mappingRows.map((row) => ({
    ...row,
    ...buildAutoSuggestion(row, aliasIndex),
  }));
  const summary = summarize(autoRows);

  const report = {
    status: 'auto-map-draft-ready',
    generatedAt: new Date().toISOString(),
    source: reviewPacket.source,
    policy: {
      productionWriteAllowed: false,
      operatorApprovalRequired: true,
      note: 'Auto-map output is a draft suggestion only. operatorDecision=APPROVED, reviewer, and reviewedAt are still required before production use.',
    },
    summary: {
      draftComponentCount: autoRows.length,
      aliasCount: aliasRows.length,
      exactExistingSuggestions: summary.byStatus.AUTO_SUGGESTED_EXISTING_BLOCK ?? 0,
      unmatchedReferenceLabels: summary.byStatus.AUTO_REFERENCE_LABEL_UNMATCHED ?? 0,
      familyReviewRows: summary.byStatus.AUTO_FAMILY_REVIEW_REQUIRED ?? 0,
      markerOrFacilityReviewRows: summary.byStatus.AUTO_NON_SEAT_OR_MARKER_REVIEW ?? 0,
      manualReviewRows: summary.byStatus.AUTO_REVIEW_REQUIRED ?? 0,
      byStatus: summary.byStatus,
      byFamily: summary.byFamily,
    },
    outputs: {
      aliasesJson: path.relative(frontendRoot, aliasJsonPath),
      aliasesCsv: path.relative(frontendRoot, aliasCsvPath),
      autoMapJson: path.relative(frontendRoot, autoMapJsonPath),
      autoMapCsv: path.relative(frontendRoot, autoMapCsvPath),
    },
    autoRows,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(aliasJsonPath, `${JSON.stringify({ status: 'alias-index-ready', generatedAt: report.generatedAt, aliasRows }, null, 2)}\n`);
  await fs.writeFile(aliasCsvPath, buildCsv(aliasRows, [
    'alias',
    'normalizedAlias',
    'existingSectionId',
    'existingBlockName',
    'block',
    'category',
    'level',
    'side',
    'sectionKind',
    'traceStatus',
  ]));
  await fs.writeFile(autoMapJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(autoMapCsvPath, buildCsv(autoRows, [
    'draftId',
    'suggestedZone',
    'colorClass',
    'autoSuggestedBlockName',
    'autoSuggestedExistingSectionId',
    'autoSuggestedExistingBlockName',
    'autoCandidateFamily',
    'autoConfidence',
    'autoMappingStatus',
    'autoReason',
    'autoExistingMatchCount',
    'area',
    'minX',
    'minY',
    'maxX',
    'maxY',
    'labelX',
    'labelY',
    'pointCount',
    'draftVisualPath',
    'draftHitPath',
    'riskFlags',
    'mappingStatus',
    'operatorDecision',
    'reviewer',
    'reviewedAt',
    'notes',
  ]));
  await fs.writeFile(autoMapMdPath, [
    '# 대구 operator reference auto-map draft',
    '',
    `- status: \`${report.status}\``,
    `- source: \`${reviewPacket.source.imagePath}\``,
    `- coordinate system: \`${reviewPacket.source.viewBox}\``,
    `- draft components: \`${report.summary.draftComponentCount}\``,
    `- alias count: \`${report.summary.aliasCount}\``,
    `- exact existing suggestions: \`${report.summary.exactExistingSuggestions}\``,
    `- unmatched reference labels: \`${report.summary.unmatchedReferenceLabels}\``,
    `- family review rows: \`${report.summary.familyReviewRows}\``,
    `- marker/facility review rows: \`${report.summary.markerOrFacilityReviewRows}\``,
    `- manual review rows: \`${report.summary.manualReviewRows}\``,
    `- production write allowed: \`${report.policy.productionWriteAllowed}\``,
    '',
    '## Status Counts',
    '',
    ...Object.entries(report.summary.byStatus)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([status, count]) => `- \`${status}\`: ${count}`),
    '',
    '## Outputs',
    '',
    `- aliases JSON: \`${report.outputs.aliasesJson}\``,
    `- aliases CSV: \`${report.outputs.aliasesCsv}\``,
    `- auto-map JSON: \`${report.outputs.autoMapJson}\``,
    `- auto-map CSV: \`${report.outputs.autoMapCsv}\``,
    '',
    '## Promotion Rule',
    '',
    '이 파일의 `AUTO_SUGGESTED_EXISTING_BLOCK`도 production 승인 상태가 아니다.',
    '`operatorDecision=APPROVED`, `reviewer`, `reviewedAt`이 채워진 row만 후속 import gate 대상으로 삼는다.',
    '',
  ].join('\n'));

  console.log(`operator_reference_auto_map_markdown:${autoMapMdPath}`);
  console.log(`operator_reference_auto_map_json:${autoMapJsonPath}`);
  console.log(`operator_reference_auto_map_csv:${autoMapCsvPath}`);
  console.log(`operator_reference_alias_json:${aliasJsonPath}`);
  console.log(`status:${report.status} exact=${report.summary.exactExistingSuggestions} unmatched=${report.summary.unmatchedReferenceLabels} familyReview=${report.summary.familyReviewRows}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
