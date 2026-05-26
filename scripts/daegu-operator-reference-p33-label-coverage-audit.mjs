import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
  isDaeguOperatorReferenceSelectableSeat,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p33-label-coverage-audit');
const auditJsonPath = path.join(outputDir, 'daegu-operator-reference-p33-label-coverage-audit.json');
const auditCsvPath = path.join(outputDir, 'daegu-operator-reference-p33-label-coverage-audit.csv');
const groupCsvPath = path.join(outputDir, 'daegu-operator-reference-p33-group-label-coverage.csv');
const nonSeatCsvPath = path.join(outputDir, 'daegu-operator-reference-p33-non-seat-labels.csv');
const auditMdPath = path.join(outputDir, 'daegu-operator-reference-p33-label-coverage-audit.md');
const gateDir = path.join(outputDir, 'gate');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p33-label-coverage-audit-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p33-label-coverage-audit-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p33-label-coverage-audit-gate.md');

const task = process.argv[2] ?? 'audit';
const requireCovered = process.argv.includes('--require-covered');

const sourceContractLiterals = [
  'P33 transcribes visible seat labels from the 4096 operator reference image and compares them with DAEGU_OPERATOR_REFERENCE_BLOCKS.',
  'VISIBLE_SEAT_LABEL_ACTIVE',
  'MISSING_LABEL_BLOCK',
  'GROUP_LABEL_ONLY',
  'NON_SEAT_LABEL',
  'EXPECTED_VISIBLE_SEAT_LABELS_131',
  'NO_MISSING_VISIBLE_SEAT_LABELS',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p33-label-coverage-audit-ready',
  'p33-label-coverage-audit-gate-passed',
];

void sourceContractLiterals;

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(rows, columns) {
  return `${[
    columns.map(csvEscape).join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')),
  ].join('\n')}\n`;
}

function normalizeLabel(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .toUpperCase();
}

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

function seatLabel({ labelId, visibleText, expectedBlock, zone, category, note = '' }) {
  return {
    labelId,
    visibleText,
    expectedBlock,
    zone,
    category,
    note,
  };
}

function numericSeatLabels(prefix, numbers, zone, category) {
  return numbers.map((number) => seatLabel({
    labelId: `${prefix}_${number}`,
    visibleText: String(number),
    expectedBlock: `${prefix}-${number}`,
    zone,
    category,
  }));
}

function prefixedSeatLabels(prefix, numbers, zone, category) {
  return numbers.map((number) => seatLabel({
    labelId: `${prefix}_${number}`,
    visibleText: `${prefix}${number}`,
    expectedBlock: `${prefix}-${number}`,
    zone,
    category,
  }));
}

const VISIBLE_SEAT_LABEL_INVENTORY = [
  ...prefixedSeatLabels('TR', [9, 10, 8, 7, 6, 5, 4, 3, 2, 1, 0], 'OUTFIELD_TABLE_TOP_RIGHT', 'TABLE'),
  ...prefixedSeatLabels('RF', range(1, 10), 'OUTFIELD_RESERVED_RIGHT', 'OUTFIELD'),
  ...prefixedSeatLabels('MR', [10, 8, 7, 6, 5, 4, 3, 2, 1], 'OUTFIELD_MINI_TABLE_RIGHT', 'TABLE'),
  ...prefixedSeatLabels('LF', range(1, 10), 'OUTFIELD_RESERVED_LEFT', 'OUTFIELD'),
  ...prefixedSeatLabels('ML', [1, 2, 3, 4, 5, 6, 7, 8, 10], 'OUTFIELD_MINI_TABLE_LEFT', 'TABLE'),
  ...prefixedSeatLabels('F', [2, 1], 'OUTFIELD_FAMILY_DETACHED', 'OUTFIELD'),
  ...prefixedSeatLabels('S', range(1, 31), 'SKY_RESERVED', 'SKY'),
  ...numericSeatLabels('3', range(1, 12), 'THIRD_BASE_INFIELD_AND_BLUE', 'INFIELD'),
  ...numericSeatLabels('1', range(1, 12), 'FIRST_BASE_INFIELD_AND_AWAY', 'INFIELD'),
  ...numericSeatLabels('3E', range(1, 3), 'THIRD_BASE_EXCITING', 'EXCITING'),
  ...numericSeatLabels('1E', range(1, 3), 'FIRST_BASE_EXCITING', 'EXCITING'),
  ...numericSeatLabels('VIP', [3, 2, 1], 'VIP_HOME_PLATE', 'VIP'),
  ...numericSeatLabels('TC', [3, 2, 1], 'CENTER_TABLE_HOME_PLATE', 'TABLE'),
  ...numericSeatLabels('T3', [4, 3, 2, 1], 'THIRD_BASE_TABLE', 'TABLE'),
  ...numericSeatLabels('T1', [4, 3, 2, 1], 'FIRST_BASE_TABLE', 'TABLE'),
  seatLabel({
    labelId: 'ROOFTOP_TABLE',
    visibleText: '루프탑 테이블석',
    expectedBlock: '루프탑',
    zone: 'ROOFTOP_LEFT_FIELD',
    category: 'TABLE',
  }),
  seatLabel({
    labelId: 'PARTY_FLOOR',
    visibleText: '파티플로어석',
    expectedBlock: '파티플로어',
    zone: 'LEFT_FIELD_PARTY_FLOOR',
    category: 'PARTY',
  }),
  seatLabel({
    labelId: 'GRASS',
    visibleText: '잔디석',
    expectedBlock: '잔디석',
    zone: 'RIGHT_FIELD_GRASS',
    category: 'OUTFIELD',
  }),
  seatLabel({
    labelId: 'CAMPING',
    visibleText: 'IM뱅크 캠핑존',
    expectedBlock: 'IM뱅크 캠핑존',
    zone: 'RIGHT_FIELD_CAMPING',
    category: 'OUTFIELD',
  }),
  seatLabel({
    labelId: 'SKY_YOGIBO',
    visibleText: 'SKY요기보존',
    expectedBlock: 'SKY요기보존',
    zone: 'SKY_BOTTOM_CENTER',
    category: 'SKY',
  }),
];

const GROUP_LABEL_INVENTORY = [
  { labelId: 'GROUP_OUTFIELD_RESERVED', visibleText: '외야 지정석', coverageBlocks: [...range(1, 10).map((n) => `LF-${n}`), ...range(1, 10).map((n) => `RF-${n}`)] },
  { labelId: 'GROUP_OUTFIELD_MINI_TABLE', visibleText: '외야 미니테이블석', coverageBlocks: [...[1, 2, 3, 4, 5, 6, 7, 8, 10].map((n) => `ML-${n}`), ...[1, 2, 3, 4, 5, 6, 7, 8, 10].map((n) => `MR-${n}`)] },
  { labelId: 'GROUP_OUTFIELD_TABLE', visibleText: '외야 테이블석', coverageBlocks: [...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `TR-${n}`), '루프탑'] },
  { labelId: 'GROUP_OUTFIELD_FAMILY', visibleText: '외야 패밀리석', coverageBlocks: ['F-1', 'F-2'] },
  { labelId: 'GROUP_SKY_RESERVED', visibleText: 'SKY 지정석', coverageBlocks: range(1, 31).map((n) => `S-${n}`) },
  { labelId: 'GROUP_THIRD_BASE_INFIELD', visibleText: '3루 내야지정석', coverageBlocks: range(8, 12).map((n) => `3-${n}`) },
  { labelId: 'GROUP_FIRST_BASE_INFIELD', visibleText: '1루 내야지정석', coverageBlocks: range(6, 12).map((n) => `1-${n}`) },
  { labelId: 'GROUP_BLUE_ZONE', visibleText: '블루존', coverageBlocks: range(1, 7).map((n) => `3-${n}`) },
  { labelId: 'GROUP_AWAY_CHEER', visibleText: '원정응원석', coverageBlocks: range(1, 5).map((n) => `1-${n}`) },
  { labelId: 'GROUP_THIRD_BASE_EXCITING', visibleText: '3루 익사이팅석', coverageBlocks: range(1, 3).map((n) => `3E-${n}`) },
  { labelId: 'GROUP_FIRST_BASE_EXCITING', visibleText: '1루 익사이팅석', coverageBlocks: range(1, 3).map((n) => `1E-${n}`) },
  { labelId: 'GROUP_VIP', visibleText: 'VIP석', coverageBlocks: [3, 2, 1].map((n) => `VIP-${n}`) },
  { labelId: 'GROUP_CENTER_TABLE', visibleText: '중앙테이블석', coverageBlocks: [3, 2, 1].map((n) => `TC-${n}`) },
  { labelId: 'GROUP_THIRD_BASE_TABLE', visibleText: '3루 테이블석', coverageBlocks: range(1, 4).map((n) => `T3-${n}`) },
  { labelId: 'GROUP_FIRST_BASE_TABLE', visibleText: '1루 테이블석', coverageBlocks: range(1, 4).map((n) => `T1-${n}`) },
  { labelId: 'GROUP_ROOFTOP_TABLE', visibleText: '루프탑 테이블석', coverageBlocks: ['루프탑'] },
  { labelId: 'GROUP_PARTY_FLOOR', visibleText: '파티플로어석', coverageBlocks: ['파티플로어'] },
  { labelId: 'GROUP_GRASS', visibleText: '잔디석', coverageBlocks: ['잔디석'] },
  { labelId: 'GROUP_CAMPING', visibleText: 'IM뱅크 캠핑존', coverageBlocks: ['IM뱅크 캠핑존'] },
  { labelId: 'GROUP_SKY_YOGIBO', visibleText: 'SKY요기보존', coverageBlocks: ['SKY요기보존'] },
];

const NON_SEAT_LABEL_INVENTORY = [
  { labelId: 'NON_SEAT_CHEER_STAGE_HOME', visibleText: '응원단상', zone: 'THIRD_BASE_BLUE_ZONE', nextAction: 'KEEP_AS_NON_SEAT_LABEL' },
  { labelId: 'NON_SEAT_CHEER_STAGE_AWAY', visibleText: '응원단상', zone: 'FIRST_BASE_AWAY_CHEER', nextAction: 'KEEP_AS_NON_SEAT_LABEL' },
  { labelId: 'NON_SEAT_BULLPEN_LEFT', visibleText: '불펜', zone: 'THIRD_BASE_FOUL_ZONE', nextAction: 'KEEP_AS_NON_SEAT_LABEL' },
  { labelId: 'NON_SEAT_BULLPEN_RIGHT', visibleText: '불펜', zone: 'FIRST_BASE_FOUL_ZONE', nextAction: 'KEEP_AS_NON_SEAT_LABEL' },
  { labelId: 'NON_SEAT_CAMERA', visibleText: '카메라', zone: 'LEFT_FIELD_SKY_EDGE', nextAction: 'KEEP_AS_NON_SEAT_LABEL' },
];

function buildActiveBlockIndex() {
  const activeBlocks = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat);
  const byAlias = new Map();
  for (const block of activeBlocks) {
    [
      block.block,
      block.name,
      block.id,
      block.block.replace('-', ''),
    ].forEach((alias) => {
      if (!alias) return;
      byAlias.set(normalizeLabel(alias), block);
    });
  }
  return { activeBlocks, byAlias };
}

function resolveSeatRows(byAlias) {
  return VISIBLE_SEAT_LABEL_INVENTORY.map((label) => {
    const block = byAlias.get(normalizeLabel(label.expectedBlock)) ?? byAlias.get(normalizeLabel(label.visibleText));
    const coverageStatus = block ? 'VISIBLE_SEAT_LABEL_ACTIVE' : 'MISSING_LABEL_BLOCK';
    return {
      labelId: label.labelId,
      visibleText: label.visibleText,
      expectedBlock: label.expectedBlock,
      zone: label.zone,
      category: label.category,
      currentSectionId: block?.id ?? '',
      currentBlock: block?.block ?? '',
      currentName: block?.name ?? '',
      coverageStatus,
      nextAction: block
        ? 'NO_ACTION_SELECTABLE_BLOCK_EXISTS'
        : 'CREATE_OPERATOR_APPROVAL_BATCH_WITH_IMAGE_CROP_BEFORE_SOURCE_WRITE',
      note: label.note,
    };
  });
}

function resolveGroupRows(byAlias) {
  return GROUP_LABEL_INVENTORY.map((label) => {
    const missingCoverageBlocks = label.coverageBlocks.filter((blockName) => !byAlias.has(normalizeLabel(blockName)));
    return {
      labelId: label.labelId,
      visibleText: label.visibleText,
      coverageBlocks: label.coverageBlocks,
      missingCoverageBlocks,
      coverageStatus: missingCoverageBlocks.length === 0 ? 'GROUP_LABEL_ONLY' : 'GROUP_LABEL_COVERAGE_INCOMPLETE',
      nextAction: missingCoverageBlocks.length === 0
        ? 'DO_NOT_CREATE_EXTRA_SELECTABLE_GROUP_POLYGON'
        : 'REVIEW_MISSING_COVERAGE_BLOCKS_BEFORE_GROUP_LABEL_CAN_BE_CLOSED',
    };
  });
}

function resolveUnexpectedActiveRows(seatRows, activeBlocks) {
  const expectedBlocks = new Set(seatRows.map((row) => normalizeLabel(row.expectedBlock)));
  return activeBlocks
    .filter((block) => !expectedBlocks.has(normalizeLabel(block.block)))
    .map((block) => ({
      sectionId: block.id,
      block: block.block,
      name: block.name,
      category: block.category,
      coverageStatus: 'ACTIVE_BLOCK_NOT_IN_VISIBLE_LABEL_INVENTORY',
      nextAction: 'REVIEW_VISIBLE_LABEL_INVENTORY_OR_REMOVE_FROM_OPERATOR_REFERENCE_MODE',
    }));
}

async function writeAudit() {
  const { activeBlocks, byAlias } = buildActiveBlockIndex();
  const seatRows = resolveSeatRows(byAlias);
  const groupRows = resolveGroupRows(byAlias);
  const nonSeatRows = NON_SEAT_LABEL_INVENTORY.map((row) => ({
    ...row,
    coverageStatus: 'NON_SEAT_LABEL',
  }));
  const missingSeatRows = seatRows.filter((row) => row.coverageStatus === 'MISSING_LABEL_BLOCK');
  const incompleteGroupRows = groupRows.filter((row) => row.coverageStatus === 'GROUP_LABEL_COVERAGE_INCOMPLETE');
  const unexpectedActiveRows = resolveUnexpectedActiveRows(seatRows, activeBlocks);
  const status = missingSeatRows.length === 0 && incompleteGroupRows.length === 0 && unexpectedActiveRows.length === 0
    ? 'p33-label-coverage-audit-ready'
    : 'p33-label-coverage-audit-blocked';
  const summary = {
    status,
    expectedVisibleSeatLabels: VISIBLE_SEAT_LABEL_INVENTORY.length,
    activeSelectableSeats: activeBlocks.length,
    officialDatasetBlocks: DAEGU_BLOCKS.length,
    coveredVisibleSeatLabels: seatRows.filter((row) => row.coverageStatus === 'VISIBLE_SEAT_LABEL_ACTIVE').length,
    missingVisibleSeatLabels: missingSeatRows.length,
    groupLabelRows: groupRows.length,
    incompleteGroupLabelRows: incompleteGroupRows.length,
    nonSeatLabelRows: nonSeatRows.length,
    unexpectedActiveRows: unexpectedActiveRows.length,
    noMissingVisibleSeatLabels: missingSeatRows.length === 0,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };
  const payload = {
    status,
    generatedAt: new Date().toISOString(),
    source: {
      referenceImage: 'src/assets/stadiums/samsung/daegu-operator-reference-rapak-2025-enhanced-transparent.png',
      viewBox: '0 0 4096 4096',
      labelInventorySource: 'manual visual transcription from the local 4096 operator reference image',
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      note: 'P33 transcribes visible seat labels from the 4096 operator reference image and compares them with DAEGU_OPERATOR_REFERENCE_BLOCKS. It does not add selectable seat polygons.',
    },
    summary,
    rows: seatRows,
    groupRows,
    nonSeatRows,
    unexpectedActiveRows,
    nextAction: missingSeatRows.length > 0
      ? 'CREATE_P34_APPROVAL_BATCH_FOR_MISSING_LABEL_BLOCKS'
      : 'NO_MISSING_VISIBLE_SEAT_LABELS; keep group-only and non-seat labels out of selectable seat layer.',
    outputs: {
      auditJson: toFrontendRelative(auditJsonPath),
      auditCsv: toFrontendRelative(auditCsvPath),
      groupCsv: toFrontendRelative(groupCsvPath),
      nonSeatCsv: toFrontendRelative(nonSeatCsvPath),
      auditMd: toFrontendRelative(auditMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(auditJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(auditCsvPath, buildCsv(seatRows, [
    'labelId',
    'visibleText',
    'expectedBlock',
    'zone',
    'category',
    'currentSectionId',
    'currentBlock',
    'currentName',
    'coverageStatus',
    'nextAction',
    'note',
  ]));
  await fs.writeFile(groupCsvPath, buildCsv(groupRows, [
    'labelId',
    'visibleText',
    'coverageBlocks',
    'missingCoverageBlocks',
    'coverageStatus',
    'nextAction',
  ]));
  await fs.writeFile(nonSeatCsvPath, buildCsv(nonSeatRows, [
    'labelId',
    'visibleText',
    'zone',
    'coverageStatus',
    'nextAction',
  ]));
  await fs.writeFile(auditMdPath, [
    '# 대구 operator reference P33 label coverage audit',
    '',
    `- status: \`${summary.status}\``,
    `- expected visible seat labels: \`${summary.expectedVisibleSeatLabels}\``,
    `- active selectable seats: \`${summary.activeSelectableSeats}\``,
    `- official dataset blocks: \`${summary.officialDatasetBlocks}\``,
    `- covered visible seat labels: \`${summary.coveredVisibleSeatLabels}\``,
    `- missing visible seat labels: \`${summary.missingVisibleSeatLabels}\``,
    `- group label rows: \`${summary.groupLabelRows}\``,
    `- incomplete group label rows: \`${summary.incompleteGroupLabelRows}\``,
    `- non-seat label rows: \`${summary.nonSeatLabelRows}\``,
    `- unexpected active rows: \`${summary.unexpectedActiveRows}\``,
    `- no missing visible seat labels: \`${summary.noMissingVisibleSeatLabels}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Missing Visible Seat Labels',
    '',
    missingSeatRows.length > 0
      ? missingSeatRows.map((row) => `- \`${row.visibleText}\` expected=\`${row.expectedBlock}\` zone=\`${row.zone}\``).join('\n')
      : '- none',
    '',
    '## Group Labels',
    '',
    ...groupRows.map((row) => `- \`${row.visibleText}\`: ${row.coverageStatus}`),
    '',
    '## Non-Seat Labels',
    '',
    ...nonSeatRows.map((row) => `- \`${row.visibleText}\` (${row.zone}) -> ${row.coverageStatus}`),
    '',
  ].join('\n'));

  console.log(`status:${summary.status} expectedVisibleSeatLabels=${summary.expectedVisibleSeatLabels} activeSelectable=${summary.activeSelectableSeats} missingVisibleSeatLabels=${summary.missingVisibleSeatLabels} unexpectedActiveRows=${summary.unexpectedActiveRows}`);
  return payload;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeGate() {
  let audit;
  try {
    audit = await readJson(auditJsonPath);
  } catch {
    audit = await writeAudit();
  }

  const failures = [];
  if (audit.summary?.expectedVisibleSeatLabels !== 131) failures.push('EXPECTED_VISIBLE_SEAT_LABELS_NOT_131');
  if (audit.summary?.activeSelectableSeats !== 131) failures.push('ACTIVE_SELECTABLE_SEATS_NOT_131');
  if (audit.summary?.missingVisibleSeatLabels !== 0) failures.push('MISSING_VISIBLE_SEAT_LABELS_REMAIN');
  if (audit.summary?.incompleteGroupLabelRows !== 0) failures.push('GROUP_LABEL_COVERAGE_INCOMPLETE');
  if (audit.summary?.unexpectedActiveRows !== 0) failures.push('UNEXPECTED_ACTIVE_ROWS');
  if (audit.summary?.productionWriteAllowed !== false) failures.push('PRODUCTION_WRITE_MUST_BE_FALSE');
  if (audit.summary?.sourceDataWritePerformed !== false) failures.push('SOURCE_WRITE_MUST_BE_FALSE');

  const validations = [
    {
      rowId: 'EXPECTED_VISIBLE_SEAT_LABELS_131',
      validationStatus: audit.summary?.expectedVisibleSeatLabels === 131 ? 'PASS' : 'INVALID',
      failures: audit.summary?.expectedVisibleSeatLabels === 131 ? '' : 'EXPECTED_VISIBLE_SEAT_LABELS_NOT_131',
    },
    {
      rowId: 'NO_MISSING_VISIBLE_SEAT_LABELS',
      validationStatus: audit.summary?.missingVisibleSeatLabels === 0 ? 'PASS' : 'INVALID',
      failures: audit.summary?.missingVisibleSeatLabels === 0 ? '' : 'MISSING_VISIBLE_SEAT_LABELS_REMAIN',
    },
    {
      rowId: 'NO_UNEXPECTED_ACTIVE_ROWS',
      validationStatus: audit.summary?.unexpectedActiveRows === 0 ? 'PASS' : 'INVALID',
      failures: audit.summary?.unexpectedActiveRows === 0 ? '' : 'UNEXPECTED_ACTIVE_ROWS',
    },
    {
      rowId: 'NO_SOURCE_WRITE',
      validationStatus: audit.summary?.productionWriteAllowed === false && audit.summary?.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: audit.summary?.productionWriteAllowed === false && audit.summary?.sourceDataWritePerformed === false ? '' : 'WRITE_POLICY_BROKEN',
    },
  ];
  const summary = {
    status: failures.length === 0 ? 'p33-label-coverage-audit-gate-passed' : 'p33-label-coverage-audit-gate-blocked',
    failures,
    expectedVisibleSeatLabels: audit.summary?.expectedVisibleSeatLabels ?? 0,
    activeSelectableSeats: audit.summary?.activeSelectableSeats ?? 0,
    missingVisibleSeatLabels: audit.summary?.missingVisibleSeatLabels ?? 0,
    groupLabelRows: audit.summary?.groupLabelRows ?? 0,
    nonSeatLabelRows: audit.summary?.nonSeatLabelRows ?? 0,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };

  if (requireCovered && failures.length > 0) {
    throw new Error(`P33 label coverage gate failed: ${failures.join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P33 label coverage audit gate',
    '',
    `- status: \`${summary.status}\``,
    `- expected visible seat labels: \`${summary.expectedVisibleSeatLabels}\``,
    `- active selectable seats: \`${summary.activeSelectableSeats}\``,
    `- missing visible seat labels: \`${summary.missingVisibleSeatLabels}\``,
    `- group label rows: \`${summary.groupLabelRows}\``,
    `- non-seat label rows: \`${summary.nonSeatLabelRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} expectedVisibleSeatLabels=${summary.expectedVisibleSeatLabels} missingVisibleSeatLabels=${summary.missingVisibleSeatLabels}`);
}

if (task === 'audit') {
  await writeAudit();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
