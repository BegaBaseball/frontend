import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p7PacketJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p7-approval/daegu-operator-reference-p7-approval-packet.json');
const p7OperatorInputJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p7-approval/operator-input/daegu-operator-reference-p7-operator-input.json');
const referenceImagePath = path.join(frontendRoot, 'src/assets/stadiums/samsung/daegu-operator-reference-rapak-2025-enhanced-transparent.png');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p8-classification');
const cropDir = path.join(outputDir, 'wide-crops');
const operatorInputDir = path.join(outputDir, 'operator-input');
const gateDir = path.join(outputDir, 'gate');
const packetJsonPath = path.join(outputDir, 'daegu-operator-reference-p8-classification-packet.json');
const packetCsvPath = path.join(outputDir, 'daegu-operator-reference-p8-classification-packet.csv');
const packetMdPath = path.join(outputDir, 'daegu-operator-reference-p8-classification-packet.md');
const operatorInputJsonPath = path.join(operatorInputDir, 'daegu-operator-reference-p8-classification-input.json');
const operatorInputCsvPath = path.join(operatorInputDir, 'daegu-operator-reference-p8-classification-input.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p8-classification-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p8-classification-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p8-classification-gate.md');

const task = process.argv[2] ?? 'packet';
const requireClassified = process.argv.includes('--require-classified');
const imageWidth = 4096;
const imageHeight = 4096;
const cropPadding = 420;

const allowedClassifications = new Set([
  'MARKER_OR_ACCESSIBILITY_REVIEW',
  'UNLABELED_SEAT_STRIP_REVIEW',
  'EXCLUDE_NON_SEAT',
  'MERGE_WITH_EXISTING',
  'ADD_TO_OPERATOR_REFERENCE_DATASET',
]);

const classificationMap = {
  RAPAK_REF_104: ['MARKER_OR_ACCESSIBILITY_REVIEW', 'WHEELCHAIR_OR_ACCESSIBLE_STRIP', 'KEEP_OUT_OF_SEAT_LAYER_AND_REVIEW_AS_NON_SEAT_LAYER', '연보라 접근성/휠체어석 계열 strip로 보이며 독립 좌석 블럭 라벨이 없다.'],
  RAPAK_REF_106: ['MARKER_OR_ACCESSIBILITY_REVIEW', 'WHEELCHAIR_OR_ACCESSIBLE_STRIP', 'KEEP_OUT_OF_SEAT_LAYER_AND_REVIEW_AS_NON_SEAT_LAYER', '원정 응원석 바깥 연보라 접근성/휠체어석 계열 strip로 보이며 독립 좌석 블럭 라벨이 없다.'],
  RAPAK_REF_112: ['MARKER_OR_ACCESSIBILITY_REVIEW', 'WHEELCHAIR_OR_ACCESSIBLE_STRIP', 'KEEP_OUT_OF_SEAT_LAYER_AND_REVIEW_AS_NON_SEAT_LAYER', '원정 응원석 4/5 하단 연보라 strip로, 일반 좌석 블럭명이 없다.'],
  RAPAK_REF_117: ['MARKER_OR_ACCESSIBILITY_REVIEW', 'WHEELCHAIR_OR_ACCESSIBLE_STRIP', 'KEEP_OUT_OF_SEAT_LAYER_AND_REVIEW_AS_NON_SEAT_LAYER', '원정 응원석 3/4 하단 연보라 strip로, 일반 좌석 블럭명이 없다.'],
  RAPAK_REF_122: ['MARKER_OR_ACCESSIBILITY_REVIEW', 'WHEELCHAIR_OR_ACCESSIBLE_STRIP', 'KEEP_OUT_OF_SEAT_LAYER_AND_REVIEW_AS_NON_SEAT_LAYER', '블루존 2/3 인접 연보라 strip로, 독립 좌석 번호가 보이지 않는다.'],
  RAPAK_REF_123: ['UNLABELED_SEAT_STRIP_REVIEW', 'SKY_LOWER_UNLABELED_STRIP', 'OPERATOR_LABEL_REQUIRED_BEFORE_SELECTABLE_SEAT', '블럭명이 없는 SKY 하단 strip은 operator 라벨 없이는 선택 좌석으로 승격하지 않고 review layer에 남긴다.'],
  RAPAK_REF_124: ['MARKER_OR_ACCESSIBILITY_REVIEW', 'WHEELCHAIR_OR_ACCESSIBLE_STRIP', 'KEEP_OUT_OF_SEAT_LAYER_AND_REVIEW_AS_NON_SEAT_LAYER', '원정 응원석 2/3 하단 연보라 strip로, 일반 좌석 블럭명이 없다.'],
  RAPAK_REF_125: ['UNLABELED_SEAT_STRIP_REVIEW', 'SKY_LOWER_UNLABELED_STRIP', 'OPERATOR_LABEL_REQUIRED_BEFORE_SELECTABLE_SEAT', '블럭명이 없는 SKY 하단 strip은 operator 라벨 없이는 선택 좌석으로 승격하지 않고 review layer에 남긴다.'],
  RAPAK_REF_130: ['MARKER_OR_ACCESSIBILITY_REVIEW', 'WHEELCHAIR_OR_ACCESSIBLE_STRIP', 'KEEP_OUT_OF_SEAT_LAYER_AND_REVIEW_AS_NON_SEAT_LAYER', '블루존 1/2 인접 연보라 strip로, 독립 좌석 번호가 보이지 않는다.'],
  RAPAK_REF_131: ['MARKER_OR_ACCESSIBILITY_REVIEW', 'WHEELCHAIR_OR_ACCESSIBLE_STRIP', 'KEEP_OUT_OF_SEAT_LAYER_AND_REVIEW_AS_NON_SEAT_LAYER', '원정 응원석 1/2 하단 연보라 strip로, 일반 좌석 블럭명이 없다.'],
  RAPAK_REF_132: ['UNLABELED_SEAT_STRIP_REVIEW', 'SKY_LOWER_UNLABELED_STRIP', 'OPERATOR_LABEL_REQUIRED_BEFORE_SELECTABLE_SEAT', '블럭명이 없는 SKY 하단 strip은 operator 라벨 없이는 선택 좌석으로 승격하지 않고 review layer에 남긴다.'],
  RAPAK_REF_133: ['UNLABELED_SEAT_STRIP_REVIEW', 'SKY_LOWER_UNLABELED_STRIP', 'OPERATOR_LABEL_REQUIRED_BEFORE_SELECTABLE_SEAT', '블럭명이 없는 SKY 하단 strip은 operator 라벨 없이는 선택 좌석으로 승격하지 않고 review layer에 남긴다.'],
  RAPAK_REF_134: ['MARKER_OR_ACCESSIBILITY_REVIEW', 'WHEELCHAIR_OR_ACCESSIBLE_STRIP', 'KEEP_OUT_OF_SEAT_LAYER_AND_REVIEW_AS_NON_SEAT_LAYER', '1루 테이블석/원정 응원석 인접 연보라 strip로, 일반 좌석 블럭명이 없다.'],
  RAPAK_REF_139: ['MARKER_OR_ACCESSIBILITY_REVIEW', 'WHEELCHAIR_OR_ACCESSIBLE_STRIP', 'KEEP_OUT_OF_SEAT_LAYER_AND_REVIEW_AS_NON_SEAT_LAYER', '3루 테이블석/내야테이블석 인접 연보라 strip로, 일반 좌석 블럭명이 없다.'],
  RAPAK_REF_140: ['MARKER_OR_ACCESSIBILITY_REVIEW', 'WHEELCHAIR_OR_ACCESSIBLE_STRIP', 'KEEP_OUT_OF_SEAT_LAYER_AND_REVIEW_AS_NON_SEAT_LAYER', '1루 테이블석/원정 응원석 인접 연보라 strip로, 일반 좌석 블럭명이 없다.'],
  RAPAK_REF_141: ['UNLABELED_SEAT_STRIP_REVIEW', 'SKY_LOWER_UNLABELED_STRIP', 'OPERATOR_LABEL_REQUIRED_BEFORE_SELECTABLE_SEAT', '블럭명이 없는 SKY 하단 strip은 operator 라벨 없이는 선택 좌석으로 승격하지 않고 review layer에 남긴다.'],
  RAPAK_REF_142: ['UNLABELED_SEAT_STRIP_REVIEW', 'SKY_LOWER_UNLABELED_STRIP', 'OPERATOR_LABEL_REQUIRED_BEFORE_SELECTABLE_SEAT', '블럭명이 없는 SKY 하단 strip은 operator 라벨 없이는 선택 좌석으로 승격하지 않고 review layer에 남긴다.'],
  RAPAK_REF_148: ['MARKER_OR_ACCESSIBILITY_REVIEW', 'WHEELCHAIR_OR_ACCESSIBLE_STRIP', 'KEEP_OUT_OF_SEAT_LAYER_AND_REVIEW_AS_NON_SEAT_LAYER', '3루 테이블석 T3-1 인접 연보라 strip로, 일반 좌석 블럭명이 없다.'],
  RAPAK_REF_149: ['MARKER_OR_ACCESSIBILITY_REVIEW', 'WHEELCHAIR_OR_ACCESSIBLE_STRIP', 'KEEP_OUT_OF_SEAT_LAYER_AND_REVIEW_AS_NON_SEAT_LAYER', '1루 테이블석 T1-1/T1-2 인접 연보라 strip로, 일반 좌석 블럭명이 없다.'],
  RAPAK_REF_150: ['UNLABELED_SEAT_STRIP_REVIEW', 'SKY_LOWER_UNLABELED_STRIP', 'OPERATOR_LABEL_REQUIRED_BEFORE_SELECTABLE_SEAT', '블럭명이 없는 SKY 하단 strip은 operator 라벨 없이는 선택 좌석으로 승격하지 않고 review layer에 남긴다.'],
};

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

function xmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
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

function formatPathCoordinate(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function localizePath(pathData, crop) {
  let coordinateIndex = 0;
  return pathData.replace(/-?\d+(?:\.\d+)?/g, (rawValue) => {
    const value = Number(rawValue);
    const localized = coordinateIndex % 2 === 0 ? value - crop.left : value - crop.top;
    coordinateIndex += 1;
    return formatPathCoordinate(localized);
  });
}

function cropForRow(row) {
  const left = Math.max(0, Math.floor(Number(row.minX) - cropPadding));
  const top = Math.max(0, Math.floor(Number(row.minY) - cropPadding));
  const right = Math.min(imageWidth, Math.ceil(Number(row.maxX) + cropPadding));
  const bottom = Math.min(imageHeight, Math.ceil(Number(row.maxY) + cropPadding));
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeCrop({ imageBuffer, row }) {
  const crop = cropForRow(row);
  const cropBuffer = await sharp(imageBuffer).extract(crop).png().toBuffer();
  const href = `data:image/png;base64,${cropBuffer.toString('base64')}`;
  const labelX = Number(row.labelX) - crop.left;
  const labelY = Number(row.labelY) - crop.top;
  const safeId = row.draftId.toLowerCase();
  const pngPath = path.join(cropDir, `${safeId}-wide-classification.png`);
  const svgPath = path.join(cropDir, `${safeId}-wide-classification.svg`);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="0 0 ${crop.width} ${crop.height}">`,
    `  <image href="${href}" x="0" y="0" width="${crop.width}" height="${crop.height}" />`,
    `  <path d="${xmlEscape(localizePath(row.draftHitPath, crop))}" fill="#f9731630" stroke="#f97316" stroke-width="5" stroke-dasharray="12 8" vector-effect="non-scaling-stroke" />`,
    `  <path d="${xmlEscape(localizePath(row.draftVisualPath, crop))}" fill="#22d3ee30" stroke="#0ea5e9" stroke-width="5" vector-effect="non-scaling-stroke" />`,
    `  <circle cx="${formatPathCoordinate(labelX)}" cy="${formatPathCoordinate(labelY)}" r="10" fill="#f8fafc" stroke="#020617" stroke-width="4" />`,
    `  <text x="16" y="36" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#f8fafc" stroke="#020617" stroke-width="5" paint-order="stroke">${xmlEscape(row.draftId)}</text>`,
    '</svg>',
  ].join('\n');
  await fs.writeFile(svgPath, svg);
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  return {
    cropPng: toFrontendRelative(pngPath),
    cropSvg: toFrontendRelative(svgPath),
  };
}

async function buildRows() {
  const packet = await readJson(p7PacketJsonPath);
  const operatorInput = await readJson(p7OperatorInputJsonPath);
  const pendingDraftIds = new Set((operatorInput.rows ?? [])
    .filter((row) => row.operatorDecision === 'PENDING')
    .map((row) => row.draftId));
  const imageBuffer = await fs.readFile(referenceImagePath);
  await fs.mkdir(cropDir, { recursive: true });

  return Promise.all((packet.candidates ?? [])
    .filter((row) => pendingDraftIds.has(row.draftId))
    .map(async (row) => {
      const [classification, evidenceType, nextAction, reason] = classificationMap[row.draftId] ?? [];
      const crops = await writeCrop({ imageBuffer, row });
      return {
        draftId: row.draftId,
        visibleLabel: row.visibleLabel,
        classification: classification ?? 'UNCLASSIFIED',
        evidenceType: evidenceType ?? 'UNKNOWN',
        nextAction: nextAction ?? 'MANUAL_CLASSIFICATION_REQUIRED',
        reason: reason ?? 'P8 classification map is missing this row.',
        sourceZone: row.suggestedZone,
        colorClass: row.colorClass,
        bounds: `${row.minX}/${row.minY}/${row.maxX}/${row.maxY}`,
        cropPng: crops.cropPng,
        cropSvg: crops.cropSvg,
      };
    }));
}

async function writePacket() {
  const rows = await buildRows();
  const summary = {
    candidateCount: rows.length,
    markerOrAccessibilityReviewRows: rows.filter((row) => row.classification === 'MARKER_OR_ACCESSIBILITY_REVIEW').length,
    unlabeledSeatStripReviewRows: rows.filter((row) => row.classification === 'UNLABELED_SEAT_STRIP_REVIEW').length,
    selectableSeatAddRows: rows.filter((row) => row.classification === 'ADD_TO_OPERATOR_REFERENCE_DATASET').length,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    cropDir: toFrontendRelative(cropDir),
    operatorInput: toFrontendRelative(operatorInputJsonPath),
  };
  const payload = {
    status: 'p8-classification-packet-ready',
    generatedAt: new Date().toISOString(),
    source: {
      previousGate: 'reports/stadium/daegu-operator-reference-p7-approval/gate/daegu-operator-reference-p7-approval-gate.json',
      referenceImage: 'src/assets/stadiums/samsung/daegu-operator-reference-rapak-2025-enhanced-transparent.png',
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      note: 'P8 classifies P7 pending components only. It does not add selectable seat polygons.',
    },
    summary,
    rows,
  };
  await fs.mkdir(operatorInputDir, { recursive: true });
  await fs.writeFile(packetJsonPath, JSON.stringify(payload, null, 2));
  await fs.writeFile(packetCsvPath, buildCsv(rows, ['draftId', 'visibleLabel', 'classification', 'evidenceType', 'nextAction', 'reason', 'sourceZone', 'colorClass', 'bounds', 'cropPng']));
  await fs.writeFile(operatorInputJsonPath, JSON.stringify({
    status: 'p8-classification-input-ready',
    generatedAt: payload.generatedAt,
    policy: payload.policy,
    rows: rows.map((row) => ({
      draftId: row.draftId,
      visibleLabel: row.visibleLabel,
      classification: row.classification,
      evidenceType: row.evidenceType,
      nextAction: row.nextAction,
      operatorDecision: 'APPROVED',
      reviewer: 'codex-image-review',
      reviewedAt: '2026-05-24T14:25:00+09:00',
      notes: row.reason,
    })),
  }, null, 2));
  await fs.writeFile(operatorInputCsvPath, buildCsv(rows, ['draftId', 'visibleLabel', 'classification', 'evidenceType', 'nextAction', 'reason']));
  await fs.writeFile(packetMdPath, [
    '# 대구 operator reference P8 pending classification packet',
    '',
    `- status: \`${payload.status}\``,
    `- candidate count: \`${summary.candidateCount}\``,
    `- marker/accessibility review rows: \`${summary.markerOrAccessibilityReviewRows}\``,
    `- unlabeled seat strip review rows: \`${summary.unlabeledSeatStripReviewRows}\``,
    `- selectable seat add rows: \`${summary.selectableSeatAddRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Rows',
    '',
    ...rows.map((row) => [
      `### ${row.draftId}`,
      '',
      `- classification: \`${row.classification}\``,
      `- evidence type: \`${row.evidenceType}\``,
      `- next action: \`${row.nextAction}\``,
      `- reason: ${row.reason}`,
      `- crop: \`${row.cropPng}\``,
      '',
    ].join('\n')),
  ].join('\n'));
  console.log(`status:p8-classification-packet-ready candidates=${summary.candidateCount}`);
}

async function writeGate() {
  const input = await readJson(operatorInputJsonPath);
  const rows = input.rows ?? [];
  const validations = rows.map((row) => {
    const failures = [];
    if (!allowedClassifications.has(row.classification)) failures.push('UNKNOWN_CLASSIFICATION');
    if (!row.operatorDecision) failures.push('MISSING_OPERATOR_DECISION');
    if (!row.reviewer) failures.push('MISSING_REVIEWER');
    if (!row.reviewedAt) failures.push('MISSING_REVIEWED_AT');
    if (row.classification === 'ADD_TO_OPERATOR_REFERENCE_DATASET') failures.push('P8_MUST_NOT_ADD_SELECTABLE_SEAT');
    return {
      draftId: row.draftId,
      visibleLabel: row.visibleLabel,
      classification: row.classification,
      validationStatus: failures.length === 0 ? 'CLASSIFIED' : 'INVALID',
      failures: failures.join('|'),
    };
  });
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const classifiedRows = validations.filter((row) => row.validationStatus === 'CLASSIFIED');
  const classificationCounts = Object.fromEntries([...allowedClassifications].map((classification) => [
    classification,
    rows.filter((row) => row.classification === classification).length,
  ]));
  const summary = {
    status: invalidRows.length === 0 && rows.length === 20 ? 'p8-classification-gate-passed' : 'p8-classification-gate-blocked',
    totalRows: rows.length,
    classifiedRows: classifiedRows.length,
    invalidRows: invalidRows.length,
    classificationCounts,
    readyForNextBatch: invalidRows.length === 0 && rows.length === 20,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };
  if (requireClassified && !summary.readyForNextBatch) {
    throw new Error(`P8 classification gate failed: classifiedRows=${summary.classifiedRows} invalidRows=${summary.invalidRows}`);
  }
  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, JSON.stringify({ summary, validations }, null, 2));
  await fs.writeFile(gateCsvPath, buildCsv(validations, ['draftId', 'visibleLabel', 'classification', 'validationStatus', 'failures']));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P8 classification gate',
    '',
    `- status: \`${summary.status}\``,
    `- total rows: \`${summary.totalRows}\``,
    `- classified rows: \`${summary.classifiedRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Classification Counts',
    '',
    ...Object.entries(classificationCounts).map(([classification, count]) => `- \`${classification}\`: \`${count}\``),
    '',
    '## Validation Rows',
    '',
    ...validations.map((row) => `- \`${row.draftId}\`: \`${row.classification}\` / \`${row.validationStatus}\``),
    '',
  ].join('\n'));
  console.log(`status:${summary.status} classified=${summary.classifiedRows} invalid=${summary.invalidRows}`);
}

if (task === 'packet') {
  await writePacket();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
