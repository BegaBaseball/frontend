import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p9PacketJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p9-missing-scan/daegu-operator-reference-p9-missing-scan-packet.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p10-candidate-classification');
const operatorInputDir = path.join(outputDir, 'operator-input');
const gateDir = path.join(outputDir, 'gate');
const packetJsonPath = path.join(outputDir, 'daegu-operator-reference-p10-candidate-classification-packet.json');
const packetCsvPath = path.join(outputDir, 'daegu-operator-reference-p10-candidate-classification-packet.csv');
const packetMdPath = path.join(outputDir, 'daegu-operator-reference-p10-candidate-classification-packet.md');
const contactSheetPath = path.join(outputDir, 'daegu-operator-reference-p10-candidate-classification-contact-sheet.png');
const operatorInputJsonPath = path.join(operatorInputDir, 'daegu-operator-reference-p10-candidate-classification-input.json');
const operatorInputCsvPath = path.join(operatorInputDir, 'daegu-operator-reference-p10-candidate-classification-input.csv');
const p11CandidateJsonPath = path.join(outputDir, 'daegu-operator-reference-p11-promotion-candidates.json');
const p11CandidateCsvPath = path.join(outputDir, 'daegu-operator-reference-p11-promotion-candidates.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p10-candidate-classification-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p10-candidate-classification-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p10-candidate-classification-gate.md');

const task = process.argv[2] ?? 'packet';
const requireClassified = process.argv.includes('--require-classified');

const allowedClassifications = new Set([
  'LABEL_VISIBLE_SEAT_BLOCK',
  'UNLABELED_SEAT_STRIP_REVIEW',
  'MARKER_OR_ACCESSIBILITY_REVIEW',
  'FACILITY_OR_NON_SEAT',
  'LEGEND_OR_DECORATION',
  'MERGE_WITH_EXISTING_REVIEW',
]);

const sourceContractLiterals = [
  'LABEL_VISIBLE_SEAT_BLOCK',
  'UNLABELED_SEAT_STRIP_REVIEW',
  'MARKER_OR_ACCESSIBILITY_REVIEW',
  'FACILITY_OR_NON_SEAT',
  'LEGEND_OR_DECORATION',
  'MERGE_WITH_EXISTING_REVIEW',
  'P11_PROMOTION_CANDIDATE',
  'PENDING_OPERATOR_LABEL',
  'ADD_TO_OPERATOR_REFERENCE_DATASET is forbidden in P10.',
  'P10 classifies the current P9 missing candidates from image crop evidence. It does not add selectable seat polygons.',
  'operatorDecision: \'PENDING\'',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p10-candidate-classification-packet-ready',
  'p10-candidate-classification-gate-passed',
  'daegu-operator-reference-p11-promotion-candidates.json',
];

void sourceContractLiterals;

const labelVisible = (suggestedBlockName, suggestedCategory, reviewNote) => ({
  classification: 'LABEL_VISIBLE_SEAT_BLOCK',
  suggestedBlockName,
  suggestedCategory,
  p11DecisionType: 'P11_PROMOTION_CANDIDATE',
  nextAction: 'P11_OPERATOR_APPROVAL_REQUIRED_BEFORE_SELECTABLE_SEAT',
  reviewNote,
});

const stripReview = (reviewNote) => ({
  classification: 'UNLABELED_SEAT_STRIP_REVIEW',
  suggestedBlockName: '',
  suggestedCategory: 'SKY',
  p11DecisionType: 'PENDING_OPERATOR_LABEL',
  nextAction: 'KEEP_OUT_OF_SEAT_LAYER_UNTIL_OPERATOR_LABEL',
  reviewNote,
});

const mergeReview = (reviewNote) => ({
  classification: 'MERGE_WITH_EXISTING_REVIEW',
  suggestedBlockName: '',
  suggestedCategory: '',
  p11DecisionType: 'MERGE_OR_IGNORE_REVIEW',
  nextAction: 'REVIEW_NEIGHBOR_OWNERSHIP_BEFORE_ANY_PROMOTION',
  reviewNote,
});

const nonSeat = (reviewNote) => ({
  classification: 'FACILITY_OR_NON_SEAT',
  suggestedBlockName: '',
  suggestedCategory: '',
  p11DecisionType: 'EXCLUDE_NON_SEAT',
  nextAction: 'KEEP_OUT_OF_SEAT_LAYER',
  reviewNote,
});

const classificationMap = {
  RAPAK_REF_011: labelVisible('루프탑 테이블석', 'TABLE', 'Crop shows the 루프탑 테이블석 label on the large yellow top-left component.'),
  RAPAK_REF_050: mergeReview('Small pink split near TR0/RF1 has no independent readable block label; review as neighbor ownership, not a new seat.'),
  RAPAK_REF_054: labelVisible('파티플로어석', 'PARTY', 'Crop shows the vertical 파티플로어석 label.'),
  RAPAK_REF_056: mergeReview('Thin blue strip beside party floor has no independent readable block label.'),
  RAPAK_REF_057: labelVisible('잔디석', 'OUTFIELD', 'Crop shows the vertical 잔디석 label.'),
  RAPAK_REF_058: labelVisible('IM뱅크 캠핑존', 'OUTFIELD', 'Crop shows the vertical IM뱅크 캠핑존 label.'),
  RAPAK_REF_061: stripReview('Cyan SKY strip beside S31/S30 has no independent block label.'),
  RAPAK_REF_069: stripReview('Cyan SKY strip beside S30/S29 has no independent block label.'),
  RAPAK_REF_076: stripReview('Cyan SKY strip beside S29/S28 has no independent block label.'),
  RAPAK_REF_077: mergeReview('Thin blue component between aisle and 3루 내야 block has no independent label.'),
  RAPAK_REF_082: stripReview('Cyan SKY strip beside S28/S27 has no independent block label.'),
  RAPAK_REF_084: mergeReview('Thin blue component beside 3루 내야/블루존 row has no independent label.'),
  RAPAK_REF_086: mergeReview('Small green infield component near 1/2 area has no independent readable block label.'),
  RAPAK_REF_090: stripReview('Cyan SKY strip beside S27/S26 has no independent block label.'),
  RAPAK_REF_093: mergeReview('Thin blue component near 3루 블루존 6/5 split has no independent label.'),
  RAPAK_REF_094: nonSeat('Bright green 응원단상 label component; keep as facility/non-seat.'),
  RAPAK_REF_097: nonSeat('Bright green 응원단상 label component; keep as facility/non-seat.'),
  RAPAK_REF_101: stripReview('Cyan SKY strip beside S26/S25 has no independent block label.'),
  RAPAK_REF_111: stripReview('Cyan SKY strip beside S25/S24 has no independent block label.'),
  RAPAK_REF_118: stripReview('Cyan SKY diagonal strip between S24/S23 has no independent block label.'),
  RAPAK_REF_151: stripReview('Cyan SKY diagonal strip around S4/S5 has no independent block label.'),
  RAPAK_REF_155: labelVisible('SKY 지정석 S-4', 'SKY', 'Crop shows the visible 4 block label between S3 and S5.'),
  RAPAK_REF_156: labelVisible('SKY 지정석 S-20', 'SKY', 'Crop shows the visible 20 block label between S21 and S19.'),
  RAPAK_REF_157: stripReview('Cyan SKY diagonal strip beside S20/S19 has no independent block label.'),
  RAPAK_REF_158: stripReview('Cyan SKY diagonal strip beside S4/S5 has no independent block label.'),
  RAPAK_REF_159: labelVisible('SKY 지정석 S-19', 'SKY', 'Crop shows the visible 19 block label.'),
  RAPAK_REF_160: labelVisible('SKY 지정석 S-5', 'SKY', 'Crop shows the visible 5 block label.'),
  RAPAK_REF_161: stripReview('Cyan SKY diagonal strip beside S19/S18 has no independent block label.'),
  RAPAK_REF_162: stripReview('Cyan SKY diagonal strip beside S5/S6 has no independent block label.'),
  RAPAK_REF_163: labelVisible('SKY 지정석 S-18', 'SKY', 'Crop shows the visible 18 block label.'),
  RAPAK_REF_164: labelVisible('SKY 지정석 S-6', 'SKY', 'Crop shows the visible 6 block label.'),
  RAPAK_REF_165: stripReview('Cyan SKY diagonal strip beside S18/S17 has no independent block label.'),
  RAPAK_REF_166: stripReview('Cyan SKY diagonal strip beside S6/S7 has no independent block label.'),
  RAPAK_REF_167: labelVisible('SKY 지정석 S-17', 'SKY', 'Crop shows the visible 17 block label.'),
  RAPAK_REF_168: labelVisible('SKY 지정석 S-7', 'SKY', 'Crop shows the visible 7 block label.'),
  RAPAK_REF_169: stripReview('Cyan SKY diagonal strip beside S17/S16 has no independent block label.'),
  RAPAK_REF_170: stripReview('Cyan SKY diagonal strip beside S7/S8 has no independent block label.'),
  RAPAK_REF_171: labelVisible('SKY 지정석 S-16', 'SKY', 'Crop shows the visible 16 block label.'),
  RAPAK_REF_172: labelVisible('SKY 지정석 S-8', 'SKY', 'Crop shows the visible 8 block label.'),
  RAPAK_REF_173: stripReview('Cyan SKY diagonal strip beside S16/S15 has no independent block label.'),
  RAPAK_REF_174: stripReview('Cyan SKY diagonal strip beside S8/S9 has no independent block label.'),
  RAPAK_REF_175: labelVisible('SKY 지정석 S-15', 'SKY', 'Crop shows the visible 15 block label.'),
  RAPAK_REF_176: labelVisible('SKY 지정석 S-9', 'SKY', 'Crop shows the visible 9 block label.'),
  RAPAK_REF_177: stripReview('Cyan SKY bottom strip above S15/S14 has no independent block label.'),
  RAPAK_REF_178: stripReview('Cyan SKY bottom strip above S14/S13 has no independent block label.'),
  RAPAK_REF_179: stripReview('Cyan SKY bottom strip above S13/S12 has no independent block label.'),
  RAPAK_REF_180: stripReview('Cyan SKY bottom strip above S12/S11 has no independent block label.'),
  RAPAK_REF_181: stripReview('Cyan SKY bottom strip above S11/S10/S9 has no independent block label.'),
  RAPAK_REF_182: labelVisible('SKY 지정석 S-14', 'SKY', 'Crop shows the visible 14 block label.'),
  RAPAK_REF_183: labelVisible('SKY 지정석 S-13', 'SKY', 'Crop shows the visible 13 block label.'),
  RAPAK_REF_184: labelVisible('SKY 지정석 S-12', 'SKY', 'Crop shows the visible 12 block label.'),
  RAPAK_REF_185: labelVisible('SKY 지정석 S-11', 'SKY', 'Crop shows the visible 11 block label.'),
  RAPAK_REF_186: labelVisible('SKY 지정석 S-10', 'SKY', 'Crop shows the visible 10 block label.'),
  RAPAK_REF_187: labelVisible('SKY요기보존', 'SKY', 'Crop shows the red SKY요기보존 label.'),
};

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(rows, columns) {
  return `${[
    columns.map(csvEscape).join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')),
  ].join('\n')}\n`;
}

function xmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function classifyRows(p9Packet) {
  return (p9Packet.rows ?? [])
    .filter((row) => row.classification === 'MISSING_BLOCK_CANDIDATE')
    .map((row) => {
      const decision = classificationMap[row.draftId] ?? {
        classification: 'UNCLASSIFIED',
        suggestedBlockName: '',
        suggestedCategory: '',
        p11DecisionType: 'MANUAL_CLASSIFICATION_REQUIRED',
        nextAction: 'MANUAL_CLASSIFICATION_REQUIRED',
        reviewNote: 'P10 classification map is missing this candidate.',
      };
      return {
        draftId: row.draftId,
        classification: decision.classification,
        suggestedBlockName: decision.suggestedBlockName,
        suggestedCategory: decision.suggestedCategory,
        p11DecisionType: decision.p11DecisionType,
        nextAction: decision.nextAction,
        reviewNote: decision.reviewNote,
        colorClass: row.colorClass,
        area: row.area,
        minX: row.minX,
        minY: row.minY,
        maxX: row.maxX,
        maxY: row.maxY,
        labelX: row.labelX,
        labelY: row.labelY,
        draftVisualPath: row.draftVisualPath,
        draftHitPath: row.draftHitPath,
        cropPng: row.cropPng,
        operatorDecision: 'PENDING',
      };
    });
}

function countBy(rows, field) {
  return rows.reduce((counts, row) => {
    counts[row[field]] = (counts[row[field]] ?? 0) + 1;
    return counts;
  }, {});
}

async function buildContactSheet(rows) {
  const tileWidth = 360;
  const tileHeight = 300;
  const columns = 6;
  const rowsPerSheet = Math.ceil(rows.length / columns);
  const composites = [];
  const colorByClassification = {
    LABEL_VISIBLE_SEAT_BLOCK: '#22c55e',
    UNLABELED_SEAT_STRIP_REVIEW: '#38bdf8',
    MERGE_WITH_EXISTING_REVIEW: '#eab308',
    FACILITY_OR_NON_SEAT: '#ef4444',
    MARKER_OR_ACCESSIBILITY_REVIEW: '#a855f7',
    LEGEND_OR_DECORATION: '#94a3b8',
  };

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const cropPath = path.join(frontendRoot, row.cropPng);
    const crop = await sharp(cropPath)
      .resize({ width: tileWidth, height: tileHeight, fit: 'inside', background: '#111827' })
      .png()
      .toBuffer();
    const metadata = await sharp(crop).metadata();
    const header = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${tileWidth}" height="${tileHeight}">`,
      '<rect width="100%" height="38" fill="#020617" opacity="0.92" />',
      `<rect y="38" width="100%" height="28" fill="${colorByClassification[row.classification] ?? '#f8fafc'}" opacity="0.82" />`,
      `<text x="10" y="25" font-family="Arial, sans-serif" font-size="21" font-weight="900" fill="#f8fafc">${xmlEscape(row.draftId)}</text>`,
      `<text x="10" y="59" font-family="Arial, sans-serif" font-size="15" font-weight="900" fill="#020617">${xmlEscape(row.classification)}</text>`,
      '</svg>',
    ].join('');
    const tile = await sharp({
      create: {
        width: tileWidth,
        height: tileHeight,
        channels: 4,
        background: '#111827',
      },
    }).composite([
      {
        input: crop,
        left: Math.floor((tileWidth - metadata.width) / 2),
        top: 0,
      },
      {
        input: Buffer.from(header),
        left: 0,
        top: 0,
      },
    ]).png().toBuffer();
    composites.push({
      input: tile,
      left: (index % columns) * tileWidth,
      top: Math.floor(index / columns) * tileHeight,
    });
  }

  await sharp({
    create: {
      width: columns * tileWidth,
      height: rowsPerSheet * tileHeight,
      channels: 4,
      background: '#020617',
    },
  }).composite(composites).png().toFile(contactSheetPath);
}

async function writePacket() {
  const p9Packet = await readJson(p9PacketJsonPath);
  const rows = classifyRows(p9Packet);
  const labelVisibleRows = rows.filter((row) => row.classification === 'LABEL_VISIBLE_SEAT_BLOCK');
  const p11Candidates = labelVisibleRows.map((row) => ({
    draftId: row.draftId,
    suggestedBlockName: row.suggestedBlockName,
    suggestedCategory: row.suggestedCategory,
    p11DecisionType: 'P11_PROMOTION_CANDIDATE',
    operatorDecision: 'PENDING',
    correctedPath: '',
    correctedHitPath: '',
    correctedLabelX: '',
    correctedLabelY: '',
    reviewer: '',
    reviewedAt: '',
    cropPng: row.cropPng,
    sourceDraftVisualPath: row.draftVisualPath,
    sourceDraftHitPath: row.draftHitPath,
  }));
  const summary = {
    status: 'p10-candidate-classification-packet-ready',
    p9MissingCandidateRows: rows.length,
    classifiedRows: rows.filter((row) => allowedClassifications.has(row.classification)).length,
    labelVisibleSeatRows: labelVisibleRows.length,
    unlabeledSeatStripRows: rows.filter((row) => row.classification === 'UNLABELED_SEAT_STRIP_REVIEW').length,
    markerOrAccessibilityReviewRows: rows.filter((row) => row.classification === 'MARKER_OR_ACCESSIBILITY_REVIEW').length,
    facilityOrNonSeatRows: rows.filter((row) => row.classification === 'FACILITY_OR_NON_SEAT').length,
    legendOrDecorationRows: rows.filter((row) => row.classification === 'LEGEND_OR_DECORATION').length,
    mergeWithExistingReviewRows: rows.filter((row) => row.classification === 'MERGE_WITH_EXISTING_REVIEW').length,
    p11PromotionCandidateRows: p11Candidates.length,
    classificationCounts: countBy(rows, 'classification'),
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p9Packet: 'reports/stadium/daegu-operator-reference-p9-missing-scan/daegu-operator-reference-p9-missing-scan-packet.json',
      referenceImage: p9Packet.source?.referenceImage,
      viewBox: p9Packet.source?.viewBox,
      imageSha256: p9Packet.source?.imageSha256,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      note: 'P10 classifies the current P9 missing candidates from image crop evidence. It does not add selectable seat polygons. ADD_TO_OPERATOR_REFERENCE_DATASET is forbidden in P10.',
    },
    summary,
    rows,
    p11PromotionCandidates: p11Candidates,
    outputs: {
      packetCsv: toFrontendRelative(packetCsvPath),
      packetMd: toFrontendRelative(packetMdPath),
      contactSheet: toFrontendRelative(contactSheetPath),
      operatorInputJson: toFrontendRelative(operatorInputJsonPath),
      operatorInputCsv: toFrontendRelative(operatorInputCsvPath),
      p11PromotionCandidatesJson: toFrontendRelative(p11CandidateJsonPath),
      p11PromotionCandidatesCsv: toFrontendRelative(p11CandidateCsvPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(operatorInputDir, { recursive: true });
  await buildContactSheet(rows);
  await fs.writeFile(packetJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(packetCsvPath, buildCsv(rows, [
    'draftId',
    'classification',
    'suggestedBlockName',
    'suggestedCategory',
    'p11DecisionType',
    'nextAction',
    'reviewNote',
    'colorClass',
    'area',
    'minX',
    'minY',
    'maxX',
    'maxY',
    'labelX',
    'labelY',
    'cropPng',
  ]));
  await fs.writeFile(operatorInputJsonPath, `${JSON.stringify({
    status: 'p10-candidate-classification-operator-input-ready',
    generatedAt: payload.generatedAt,
    policy: payload.policy,
    rows: rows.map((row) => ({
      draftId: row.draftId,
      classification: row.classification,
      suggestedBlockName: row.suggestedBlockName,
      suggestedCategory: row.suggestedCategory,
      p11DecisionType: row.p11DecisionType,
      operatorDecision: 'PENDING',
      correctedPath: '',
      correctedHitPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      reviewer: '',
      reviewedAt: '',
      notes: row.reviewNote,
    })),
  }, null, 2)}\n`);
  await fs.writeFile(operatorInputCsvPath, buildCsv(rows, [
    'draftId',
    'classification',
    'suggestedBlockName',
    'suggestedCategory',
    'p11DecisionType',
    'operatorDecision',
    'reviewNote',
  ]));
  await fs.writeFile(p11CandidateJsonPath, `${JSON.stringify({
    status: 'p11-promotion-candidates-ready',
    generatedAt: payload.generatedAt,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    rows: p11Candidates,
  }, null, 2)}\n`);
  await fs.writeFile(p11CandidateCsvPath, buildCsv(p11Candidates, [
    'draftId',
    'suggestedBlockName',
    'suggestedCategory',
    'p11DecisionType',
    'operatorDecision',
    'cropPng',
  ]));
  await fs.writeFile(packetMdPath, [
    '# 대구 operator reference P10 candidate classification',
    '',
    `- status: \`${payload.status}\``,
    `- P9 missing candidates: \`${summary.p9MissingCandidateRows}\``,
    `- classified rows: \`${summary.classifiedRows}\``,
    `- label visible seat rows: \`${summary.labelVisibleSeatRows}\``,
    `- unlabeled seat strip rows: \`${summary.unlabeledSeatStripRows}\``,
    `- merge review rows: \`${summary.mergeWithExistingReviewRows}\``,
    `- facility/non-seat rows: \`${summary.facilityOrNonSeatRows}\``,
    `- P11 promotion candidates: \`${summary.p11PromotionCandidateRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Outputs',
    '',
    `- contact sheet: \`${toFrontendRelative(contactSheetPath)}\``,
    `- P11 candidates: \`${toFrontendRelative(p11CandidateJsonPath)}\``,
    '',
    '## P11 Promotion Candidates',
    '',
    ...p11Candidates.map((row) => `- \`${row.draftId}\` -> \`${row.suggestedBlockName}\` (${row.suggestedCategory})`),
    '',
  ].join('\n'));

  console.log(`status:${summary.status} classifiedRows=${summary.classifiedRows} p11PromotionCandidateRows=${summary.p11PromotionCandidateRows}`);
}

async function writeGate() {
  const packet = await readJson(packetJsonPath);
  const input = await readJson(operatorInputJsonPath);
  const rows = packet.rows ?? [];
  const inputRows = input.rows ?? [];
  const validations = rows.map((row) => {
    const inputRow = inputRows.find((candidate) => candidate.draftId === row.draftId);
    const failures = [];
    if (!allowedClassifications.has(row.classification)) failures.push('UNKNOWN_CLASSIFICATION');
    if (!row.reviewNote) failures.push('MISSING_REVIEW_NOTE');
    if (!row.nextAction) failures.push('MISSING_NEXT_ACTION');
    if (!inputRow) failures.push('MISSING_OPERATOR_INPUT_ROW');
    if (inputRow?.operatorDecision !== 'PENDING') failures.push('P10_MUST_KEEP_OPERATOR_DECISION_PENDING');
    if (inputRow?.p11DecisionType === 'ADD_TO_OPERATOR_REFERENCE_DATASET') failures.push('P10_MUST_NOT_ALLOW_DATASET_ADD');
    if (inputRow?.correctedPath || inputRow?.correctedHitPath) failures.push('P10_MUST_NOT_PREPOPULATE_CORRECTED_GEOMETRY');
    if (row.classification === 'LABEL_VISIBLE_SEAT_BLOCK' && !row.suggestedBlockName) failures.push('LABEL_VISIBLE_ROW_NEEDS_SUGGESTED_BLOCK_NAME');
    return {
      draftId: row.draftId,
      classification: row.classification,
      suggestedBlockName: row.suggestedBlockName,
      p11DecisionType: row.p11DecisionType,
      validationStatus: failures.length ? 'INVALID' : 'CLASSIFIED',
      failures: failures.join('|'),
    };
  });
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const summary = {
    status: invalidRows.length === 0 && rows.length > 0 ? 'p10-candidate-classification-gate-passed' : 'p10-candidate-classification-gate-blocked',
    totalRows: rows.length,
    classifiedRows: validations.filter((row) => row.validationStatus === 'CLASSIFIED').length,
    invalidRows: invalidRows.length,
    labelVisibleSeatRows: rows.filter((row) => row.classification === 'LABEL_VISIBLE_SEAT_BLOCK').length,
    unlabeledSeatStripRows: rows.filter((row) => row.classification === 'UNLABELED_SEAT_STRIP_REVIEW').length,
    mergeWithExistingReviewRows: rows.filter((row) => row.classification === 'MERGE_WITH_EXISTING_REVIEW').length,
    facilityOrNonSeatRows: rows.filter((row) => row.classification === 'FACILITY_OR_NON_SEAT').length,
    p11PromotionCandidateRows: packet.p11PromotionCandidates?.length ?? 0,
    allCurrentMissingCandidatesClassified: invalidRows.length === 0 && rows.length > 0,
    readyForP11ApprovalBatch: invalidRows.length === 0 && (packet.p11PromotionCandidates?.length ?? 0) > 0,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };

  if (requireClassified && !summary.allCurrentMissingCandidatesClassified) {
    throw new Error(`P10 classification gate failed: classifiedRows=${summary.classifiedRows} invalidRows=${summary.invalidRows}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'draftId',
    'classification',
    'suggestedBlockName',
    'p11DecisionType',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P10 classification gate',
    '',
    `- status: \`${summary.status}\``,
    `- total rows: \`${summary.totalRows}\``,
    `- classified rows: \`${summary.classifiedRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- label visible seat rows: \`${summary.labelVisibleSeatRows}\``,
    `- unlabeled seat strip rows: \`${summary.unlabeledSeatStripRows}\``,
    `- merge review rows: \`${summary.mergeWithExistingReviewRows}\``,
    `- facility/non-seat rows: \`${summary.facilityOrNonSeatRows}\``,
    `- P11 promotion candidates: \`${summary.p11PromotionCandidateRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} classifiedRows=${summary.classifiedRows} invalidRows=${summary.invalidRows} p11PromotionCandidateRows=${summary.p11PromotionCandidateRows}`);
}

if (task === 'packet') {
  await writePacket();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
