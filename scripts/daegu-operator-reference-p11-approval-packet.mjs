import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { DAEGU_OPERATOR_REFERENCE_BLOCKS } from '../src/data/daeguSeatData.ts';
import { validateSeatMapPolygonPath } from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p10PacketJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p10-candidate-classification/daegu-operator-reference-p10-candidate-classification-packet.json');
const p11CandidateJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p10-candidate-classification/daegu-operator-reference-p11-promotion-candidates.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p11-approval');
const operatorInputDir = path.join(outputDir, 'operator-input');
const gateDir = path.join(outputDir, 'gate');
const packetJsonPath = path.join(outputDir, 'daegu-operator-reference-p11-approval-packet.json');
const packetCsvPath = path.join(outputDir, 'daegu-operator-reference-p11-approval-packet.csv');
const packetMdPath = path.join(outputDir, 'daegu-operator-reference-p11-approval-packet.md');
const overlaySvgPath = path.join(outputDir, 'daegu-operator-reference-p11-approval-overlay.svg');
const contactSheetPath = path.join(outputDir, 'daegu-operator-reference-p11-approval-contact-sheet.png');
const operatorInputJsonPath = path.join(operatorInputDir, 'daegu-operator-reference-p11-operator-input.json');
const operatorInputCsvPath = path.join(operatorInputDir, 'daegu-operator-reference-p11-operator-input.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p11-approval-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p11-approval-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p11-approval-gate.md');
const dryRunPlanPath = path.join(gateDir, 'daegu-operator-reference-p11-dry-run-apply-plan.json');

const task = process.argv[2] ?? 'packet';
const requireReady = process.argv.includes('--require-ready');
const requireApproved = process.argv.includes('--require-approved');
const imageWidth = 4096;
const imageHeight = 4096;

const sourceContractLiterals = [
  'P11 builds an approval packet from P10 label-visible missing candidates. It does not add selectable seat polygons.',
  'P11 uses sourceDraftVisualPath/sourceDraftHitPath from the image component scan as draft evidence only.',
  'ADD_TO_OPERATOR_REFERENCE_DATASET',
  'operatorDecision: \'PENDING\'',
  'correctedPath',
  'correctedHitPath',
  'correctedLabelX',
  'correctedLabelY',
  'reviewer',
  'reviewedAt',
  'p11-approval-packet-ready',
  'p11-approval-gate-waiting-for-operator-input',
  'p11-approval-gate-dry-run-ready',
  'daegu-operator-reference-p11-approval-packet.json',
  'daegu-operator-reference-p11-operator-input.json',
  'daegu-operator-reference-p11-dry-run-apply-plan.json',
  'RAPAK_REF_011',
  '루프탑 테이블석',
  'RAPAK_REF_187',
  'SKY요기보존',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
];

void sourceContractLiterals;

const metadataByDraftId = {
  RAPAK_REF_011: { id: 'daegu-operator-reference-rooftop-table', block: '루프탑', name: '루프탑 테이블석', category: 'TABLE', level: 'OUTFIELD', side: 'OUTFIELD' },
  RAPAK_REF_054: { id: 'daegu-operator-reference-party-floor', block: '파티플로어', name: '파티플로어석', category: 'PARTY', level: 'OUTFIELD', side: 'OUTFIELD' },
  RAPAK_REF_057: { id: 'daegu-operator-reference-grass-zone', block: '잔디석', name: '잔디석', category: 'OUTFIELD', level: 'OUTFIELD', side: 'OUTFIELD' },
  RAPAK_REF_058: { id: 'daegu-operator-reference-imbank-camping-zone', block: 'IM뱅크 캠핑존', name: 'IM뱅크 캠핑존', category: 'OUTFIELD', level: 'OUTFIELD', side: 'OUTFIELD' },
  RAPAK_REF_155: skyMetadata('S-4'),
  RAPAK_REF_156: skyMetadata('S-20'),
  RAPAK_REF_159: skyMetadata('S-19'),
  RAPAK_REF_160: skyMetadata('S-5'),
  RAPAK_REF_163: skyMetadata('S-18'),
  RAPAK_REF_164: skyMetadata('S-6'),
  RAPAK_REF_167: skyMetadata('S-17'),
  RAPAK_REF_168: skyMetadata('S-7'),
  RAPAK_REF_171: skyMetadata('S-16'),
  RAPAK_REF_172: skyMetadata('S-8'),
  RAPAK_REF_175: skyMetadata('S-15'),
  RAPAK_REF_176: skyMetadata('S-9'),
  RAPAK_REF_182: skyMetadata('S-14'),
  RAPAK_REF_183: skyMetadata('S-13'),
  RAPAK_REF_184: skyMetadata('S-12'),
  RAPAK_REF_185: skyMetadata('S-11'),
  RAPAK_REF_186: skyMetadata('S-10'),
  RAPAK_REF_187: { id: 'daegu-operator-reference-sky-yogibo-zone', block: 'SKY요기보존', name: 'SKY요기보존', category: 'SKY', level: '5F', side: 'CENTER' },
};

function skyMetadata(block) {
  const number = Number(block.replace('S-', ''));
  const side = number <= 8 ? 'FIRST_BASE' : number <= 14 ? 'CENTER' : 'THIRD_BASE';
  return {
    id: `daegu-sky-lower-${block.toLowerCase().replace('-', '')}`,
    block,
    name: `SKY 하단 지정석 ${block}`,
    category: 'SKY',
    level: '5F',
    side,
  };
}

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

function pathPoints(pathData) {
  const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
}

function svgPoints(pathData) {
  return pathPoints(pathData).map(([x, y]) => `${x},${y}`).join(' ');
}

function activeBlockKeys() {
  return new Set(DAEGU_OPERATOR_REFERENCE_BLOCKS.flatMap((block) => [
    block.id,
    block.name,
    block.block,
    block.block.replace('-', ''),
    ...block.officialBlocks,
  ]));
}

function draftValidation(row) {
  const labelPoint = [Number(row.draftLabelX), Number(row.draftLabelY)];
  const visualFailures = validateSeatMapPolygonPath({
    pathData: row.draftVisualPath,
    width: imageWidth,
    height: imageHeight,
    labelPoint,
    labelTolerance: 3,
  }).map((failure) => `draftVisualPath:${failure}`);
  const hitFailures = validateSeatMapPolygonPath({
    pathData: row.draftHitPath,
    width: imageWidth,
    height: imageHeight,
  }).map((failure) => `draftHitPath:${failure}`);
  return [...visualFailures, ...hitFailures];
}

function validateOperatorInputRow(row) {
  const failures = [];
  if (row.operatorDecision === 'PENDING') {
    return {
      validationStatus: 'PENDING_OPERATOR_DECISION',
      failures,
    };
  }
  if (row.operatorDecision !== 'APPROVED') failures.push('OPERATOR_DECISION_NOT_APPROVED');
  if (row.decisionType !== 'ADD_TO_OPERATOR_REFERENCE_DATASET') failures.push('UNSUPPORTED_DECISION_TYPE');
  if (!row.correctedPath) failures.push('MISSING_CORRECTED_PATH');
  if (!row.correctedHitPath) failures.push('MISSING_CORRECTED_HIT_PATH');
  if (!Number.isFinite(Number(row.correctedLabelX))) failures.push('MISSING_CORRECTED_LABEL_X');
  if (!Number.isFinite(Number(row.correctedLabelY))) failures.push('MISSING_CORRECTED_LABEL_Y');
  if (!row.reviewer) failures.push('MISSING_REVIEWER');
  if (!row.reviewedAt) failures.push('MISSING_REVIEWED_AT');

  if (row.correctedPath) {
    validateSeatMapPolygonPath({
      pathData: row.correctedPath,
      width: imageWidth,
      height: imageHeight,
      labelPoint: [Number(row.correctedLabelX), Number(row.correctedLabelY)],
      labelTolerance: 3,
    }).forEach((failure) => failures.push(`correctedPath:${failure}`));
  }
  if (row.correctedHitPath) {
    validateSeatMapPolygonPath({
      pathData: row.correctedHitPath,
      width: imageWidth,
      height: imageHeight,
    }).forEach((failure) => failures.push(`correctedHitPath:${failure}`));
  }

  return {
    validationStatus: failures.length === 0 ? 'APPROVED_READY' : 'INVALID',
    failures,
  };
}

function buildRows(p10Packet, p11Candidates) {
  const labelRowsById = new Map((p10Packet.rows ?? [])
    .filter((row) => row.classification === 'LABEL_VISIBLE_SEAT_BLOCK')
    .map((row) => [row.draftId, row]));
  const existingKeys = activeBlockKeys();

  return (p11Candidates.rows ?? []).map((candidate) => {
    const sourceRow = labelRowsById.get(candidate.draftId);
    const metadata = metadataByDraftId[candidate.draftId];
    if (!sourceRow) {
      throw new Error(`Missing P10 label-visible row for ${candidate.draftId}`);
    }
    if (!metadata) {
      throw new Error(`Missing P11 metadata mapping for ${candidate.draftId}`);
    }
    const row = {
      draftId: candidate.draftId,
      visibleLabel: candidate.suggestedBlockName,
      suggestedId: metadata.id,
      suggestedName: metadata.name,
      suggestedBlock: metadata.block,
      suggestedCategory: metadata.category,
      suggestedLevel: metadata.level,
      suggestedSide: metadata.side,
      decisionType: 'ADD_TO_OPERATOR_REFERENCE_DATASET',
      operatorDecision: 'PENDING',
      draftVisualPath: candidate.sourceDraftVisualPath,
      draftHitPath: candidate.sourceDraftHitPath,
      draftLabelX: sourceRow.labelX,
      draftLabelY: sourceRow.labelY,
      correctedPath: '',
      correctedHitPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      reviewer: '',
      reviewedAt: '',
      cropPng: candidate.cropPng,
      sourceClassification: sourceRow.classification,
      sourceReviewNote: sourceRow.reviewNote,
      duplicateRisk: existingKeys.has(metadata.id) || existingKeys.has(metadata.name) || existingKeys.has(metadata.block) || existingKeys.has(metadata.block.replace('-', '')),
      riskFlags: [],
    };
    row.riskFlags = [
      row.duplicateRisk ? 'DUPLICATE_ACTIVE_BLOCK_KEY' : '',
      metadata.block === 'SKY요기보존' ? 'NON_NUMERIC_SPECIAL_SKY_LABEL' : '',
      metadata.block.includes('IM뱅크') ? 'SPONSOR_NAMED_ZONE_LABEL' : '',
    ].filter(Boolean);
    return row;
  });
}

async function buildContactSheet(rows) {
  const tileWidth = 420;
  const tileHeight = 320;
  const columns = 4;
  const rowsPerSheet = Math.ceil(rows.length / columns);
  const composites = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const crop = await sharp(path.join(frontendRoot, row.cropPng))
      .resize({ width: tileWidth, height: tileHeight, fit: 'inside', background: '#111827' })
      .png()
      .toBuffer();
    const metadata = await sharp(crop).metadata();
    const header = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${tileWidth}" height="${tileHeight}">`,
      '<rect width="100%" height="42" fill="#020617" opacity="0.94" />',
      '<rect y="42" width="100%" height="34" fill="#16a34a" opacity="0.9" />',
      `<text x="10" y="27" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="#f8fafc">${xmlEscape(row.draftId)} / ${xmlEscape(row.suggestedBlock)}</text>`,
      `<text x="10" y="65" font-family="Arial, sans-serif" font-size="16" font-weight="900" fill="#052e16">${xmlEscape(row.visibleLabel)}</text>`,
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

async function writeOverlay(rows, source) {
  const imageHref = path.relative(outputDir, path.join(frontendRoot, source.referenceImage)).split(path.sep).join('/');
  const overlay = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageWidth} ${imageHeight}" width="${imageWidth}" height="${imageHeight}">`,
    `<image href="${xmlEscape(imageHref)}" x="0" y="0" width="${imageWidth}" height="${imageHeight}" />`,
    '<g fill="rgba(34,197,94,0.24)" stroke="#16a34a" stroke-width="8" vector-effect="non-scaling-stroke">',
    ...rows.map((row) => `<polygon points="${svgPoints(row.draftVisualPath)}"><title>${xmlEscape(`${row.draftId} ${row.visibleLabel}`)}</title></polygon>`),
    '</g>',
    '<g font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#052e16" stroke="#f8fafc" stroke-width="6" paint-order="stroke">',
    ...rows.map((row) => `<text x="${row.draftLabelX}" y="${row.draftLabelY}" text-anchor="middle">${xmlEscape(row.suggestedBlock)}</text>`),
    '</g>',
    '</svg>',
    '',
  ].join('\n');
  await fs.writeFile(overlaySvgPath, overlay);
}

function buildSummary(rows, status) {
  return {
    status,
    p10PromotionCandidateRows: rows.length,
    packetCandidateRows: rows.length,
    draftValidatedRows: rows.filter((row) => draftValidation(row).length === 0).length,
    duplicateRiskRows: rows.filter((row) => row.duplicateRisk).length,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };
}

async function writePacket() {
  const p10Packet = await readJson(p10PacketJsonPath);
  const p11Candidates = await readJson(p11CandidateJsonPath);
  const rows = buildRows(p10Packet, p11Candidates);
  const draftFailures = rows.flatMap((row) => draftValidation(row).map((failure) => ({ draftId: row.draftId, failure })));
  if (rows.length !== 22) {
    throw new Error(`P11 expected 22 promotion candidates, got ${rows.length}`);
  }
  if (draftFailures.length > 0) {
    throw new Error(`P11 draft validation failed: ${JSON.stringify(draftFailures.slice(0, 5))}`);
  }

  const generatedAt = new Date().toISOString();
  const summary = buildSummary(rows, 'p11-approval-packet-ready');
  const payload = {
    status: summary.status,
    generatedAt,
    source: {
      p10Packet: 'reports/stadium/daegu-operator-reference-p10-candidate-classification/daegu-operator-reference-p10-candidate-classification-packet.json',
      p11PromotionCandidates: 'reports/stadium/daegu-operator-reference-p10-candidate-classification/daegu-operator-reference-p11-promotion-candidates.json',
      referenceImage: p10Packet.source?.referenceImage,
      viewBox: p10Packet.source?.viewBox,
      imageSha256: p10Packet.source?.imageSha256,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      note: 'P11 builds an approval packet from P10 label-visible missing candidates. It does not add selectable seat polygons. P11 uses sourceDraftVisualPath/sourceDraftHitPath from the image component scan as draft evidence only.',
      promotionRule: 'Only rows later edited to operatorDecision=APPROVED with correctedPath/correctedHitPath/correctedLabelX/correctedLabelY/reviewer/reviewedAt can be used by a later production-write phase.',
    },
    summary,
    rows,
    outputs: {
      packetCsv: toFrontendRelative(packetCsvPath),
      packetMd: toFrontendRelative(packetMdPath),
      overlaySvg: toFrontendRelative(overlaySvgPath),
      contactSheet: toFrontendRelative(contactSheetPath),
      operatorInputJson: toFrontendRelative(operatorInputJsonPath),
      operatorInputCsv: toFrontendRelative(operatorInputCsvPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(operatorInputDir, { recursive: true });
  await buildContactSheet(rows);
  await writeOverlay(rows, payload.source);
  await fs.writeFile(packetJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(packetCsvPath, buildCsv(rows, [
    'draftId',
    'visibleLabel',
    'suggestedId',
    'suggestedName',
    'suggestedBlock',
    'suggestedCategory',
    'suggestedLevel',
    'suggestedSide',
    'decisionType',
    'operatorDecision',
    'draftVisualPath',
    'draftHitPath',
    'draftLabelX',
    'draftLabelY',
    'correctedPath',
    'correctedHitPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'cropPng',
    'riskFlags',
  ]));
  await fs.writeFile(operatorInputJsonPath, `${JSON.stringify({
    status: 'p11-operator-input-ready',
    generatedAt,
    policy: payload.policy,
    rows: rows.map((row) => ({
      draftId: row.draftId,
      visibleLabel: row.visibleLabel,
      suggestedId: row.suggestedId,
      suggestedName: row.suggestedName,
      suggestedBlock: row.suggestedBlock,
      suggestedCategory: row.suggestedCategory,
      suggestedLevel: row.suggestedLevel,
      suggestedSide: row.suggestedSide,
      decisionType: row.decisionType,
      operatorDecision: 'PENDING',
      draftVisualPath: row.draftVisualPath,
      draftHitPath: row.draftHitPath,
      draftLabelX: row.draftLabelX,
      draftLabelY: row.draftLabelY,
      correctedPath: '',
      correctedHitPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      reviewer: '',
      reviewedAt: '',
      notes: row.sourceReviewNote,
    })),
  }, null, 2)}\n`);
  await fs.writeFile(operatorInputCsvPath, buildCsv(rows, [
    'draftId',
    'visibleLabel',
    'suggestedId',
    'suggestedName',
    'suggestedBlock',
    'suggestedCategory',
    'suggestedLevel',
    'suggestedSide',
    'decisionType',
    'operatorDecision',
    'draftVisualPath',
    'draftHitPath',
    'draftLabelX',
    'draftLabelY',
    'correctedPath',
    'correctedHitPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'cropPng',
  ]));
  await fs.writeFile(packetMdPath, [
    '# 대구 operator reference P11 approval packet',
    '',
    `- status: \`${summary.status}\``,
    `- candidates: \`${summary.packetCandidateRows}\``,
    `- draft validated rows: \`${summary.draftValidatedRows}\``,
    `- duplicate risk rows: \`${summary.duplicateRiskRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Outputs',
    '',
    `- overlay: \`${toFrontendRelative(overlaySvgPath)}\``,
    `- contact sheet: \`${toFrontendRelative(contactSheetPath)}\``,
    `- operator input: \`${toFrontendRelative(operatorInputJsonPath)}\``,
    '',
    '## Candidates',
    '',
    ...rows.map((row) => `- \`${row.draftId}\` -> \`${row.suggestedName}\` / \`${row.suggestedBlock}\``),
    '',
  ].join('\n'));

  console.log(`status:${summary.status} candidates=${summary.packetCandidateRows} draftValidatedRows=${summary.draftValidatedRows}`);
}

async function writeGate() {
  const packet = await readJson(packetJsonPath);
  const input = await readJson(operatorInputJsonPath);
  const packetRows = packet.rows ?? [];
  const inputRows = input.rows ?? [];
  const validations = packetRows.map((packetRow) => {
    const inputRow = inputRows.find((candidate) => candidate.draftId === packetRow.draftId);
    const failures = [];
    if (!inputRow) failures.push('MISSING_OPERATOR_INPUT_ROW');
    if (packetRow.decisionType !== 'ADD_TO_OPERATOR_REFERENCE_DATASET') failures.push('UNSUPPORTED_PACKET_DECISION_TYPE');
    if (packetRow.operatorDecision !== 'PENDING') failures.push('PACKET_OPERATOR_DECISION_MUST_STAY_PENDING');
    if (packetRow.correctedPath || packetRow.correctedHitPath) failures.push('PACKET_MUST_NOT_PREPOPULATE_CORRECTED_GEOMETRY');
    failures.push(...draftValidation(packetRow));
    const operatorValidation = inputRow ? validateOperatorInputRow(inputRow) : { validationStatus: 'INVALID', failures: [] };
    failures.push(...operatorValidation.failures);
    const validationStatus = failures.length
      ? 'INVALID'
      : operatorValidation.validationStatus === 'APPROVED_READY'
        ? 'APPROVED_READY'
        : 'PENDING_OPERATOR_DECISION';
    return {
      draftId: packetRow.draftId,
      visibleLabel: packetRow.visibleLabel,
      suggestedBlock: packetRow.suggestedBlock,
      operatorDecision: inputRow?.operatorDecision ?? '',
      decisionType: inputRow?.decisionType ?? '',
      validationStatus,
      failures: failures.join('|'),
    };
  });
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const approvedRows = validations.filter((row) => row.validationStatus === 'APPROVED_READY');
  const pendingRows = validations.filter((row) => row.validationStatus === 'PENDING_OPERATOR_DECISION');
  const packetReady = packetRows.length === 22 && inputRows.length === 22 && invalidRows.length === 0;
  const readyForTemplateImport = packetReady && approvedRows.length > 0;
  const status = readyForTemplateImport
    ? 'p11-approval-gate-dry-run-ready'
    : packetReady
      ? 'p11-approval-gate-waiting-for-operator-input'
      : 'p11-approval-gate-blocked';

  if (requireReady && !packetReady) {
    throw new Error(`P11 approval gate is not packet-ready: candidates=${packetRows.length} invalidRows=${invalidRows.length}`);
  }
  if (requireApproved && !readyForTemplateImport) {
    throw new Error(`P11 approval gate has no approved dry-run rows: approvedRows=${approvedRows.length} invalidRows=${invalidRows.length}`);
  }

  const summary = {
    status,
    totalRows: packetRows.length,
    pendingRows: pendingRows.length,
    approvedRows: approvedRows.length,
    invalidRows: invalidRows.length,
    packetReady,
    readyForTemplateImport,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    dryRunPlan: toFrontendRelative(dryRunPlanPath),
  };
  const dryRunPlan = {
    status: 'dry-run only; P12 may patch DAEGU_OPERATOR_REFERENCE_BLOCKS from approved rows, not DAEGU_BLOCKS',
    phase: 'p11',
    geometryVersion: 'DAEGU_OPERATOR_REFERENCE_P11_APPROVED_DRY_RUN_V1',
    approvedRows: inputRows.filter((row) => approvedRows.some((approved) => approved.draftId === row.draftId)),
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'draftId',
    'visibleLabel',
    'suggestedBlock',
    'operatorDecision',
    'decisionType',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(dryRunPlanPath, `${JSON.stringify(dryRunPlan, null, 2)}\n`);
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P11 approval gate',
    '',
    `- status: \`${summary.status}\``,
    `- total rows: \`${summary.totalRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- packet ready: \`${summary.packetReady}\``,
    `- ready for template import: \`${summary.readyForTemplateImport}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Rows',
    '',
    ...validations.map((row) => `- \`${row.draftId}\` / \`${row.visibleLabel}\`: \`${row.validationStatus}\`${row.failures ? ` (${row.failures})` : ''}`),
    '',
  ].join('\n'));

  console.log(`status:${summary.status} candidates=${summary.totalRows} pendingRows=${summary.pendingRows} approvedRows=${summary.approvedRows} invalidRows=${summary.invalidRows}`);
}

if (task === 'packet') {
  await writePacket();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
