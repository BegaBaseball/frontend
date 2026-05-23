import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  DAEGU_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
} from '../src/data/daeguSeatData.ts';
import { validateSeatMapPolygonPath } from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const inventoryJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-inventory/daegu-operator-reference-inventory.json');
const autoMapJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-auto-map/daegu-operator-reference-auto-map.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p2c-approval');
const cropDir = path.join(outputDir, 'crops');
const operatorInputDir = path.join(outputDir, 'operator-input');
const gateDir = path.join(outputDir, 'gate');
const packetJsonPath = path.join(outputDir, 'daegu-operator-reference-p2c-approval-packet.json');
const packetCsvPath = path.join(outputDir, 'daegu-operator-reference-p2c-approval-packet.csv');
const packetMdPath = path.join(outputDir, 'daegu-operator-reference-p2c-approval-packet.md');
const operatorInputJsonPath = path.join(operatorInputDir, 'daegu-operator-reference-p2c-operator-input.json');
const operatorInputCsvPath = path.join(operatorInputDir, 'daegu-operator-reference-p2c-operator-input.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p2c-approval-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p2c-approval-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p2c-approval-gate.md');
const dryRunPlanPath = path.join(gateDir, 'daegu-operator-reference-p2c-dry-run-apply-plan.json');

const task = process.argv[2] ?? 'packet';
const requireApproved = process.argv.includes('--require-approved');
const imageWidth = 4096;
const imageHeight = 4096;
const cropPadding = 150;
const geometryVersion = 'DAEGU_OPERATOR_REFERENCE_P2C_APPROVED_DRY_RUN_V1';
const expectedP2CVisibleLabels = [
  'S24',
  'S25',
  'S26',
  'S27',
  'S28',
  'S29',
  'S30',
  'S31',
];

const targetLabelSet = new Set(expectedP2CVisibleLabels);
const allowedDecisionTypes = new Set(['ADD_TO_OPERATOR_REFERENCE_DATASET', 'EXCLUDE_NON_SEAT']);

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
    ...rows.map((row) => columns.map((column) => {
      const value = row[column];
      return csvEscape(Array.isArray(value) ? value.join('|') : value);
    }).join(',')),
  ].join('\n')}\n`;
}

function normalizeAlias(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .replace(/-/g, '');
}

function canonicalBlockFromVisibleLabel(visibleLabel) {
  const match = normalizeAlias(visibleLabel).match(/^([A-Z]+)(\d+)$/);
  if (!match) return visibleLabel;
  return `${match[1]}-${Number(match[2])}`;
}

function formatPathCoordinate(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function pathToPoints(pathData) {
  const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
}

function pathBounds(pathData) {
  return pathToPoints(pathData).reduce((bounds, [x, y]) => ({
    minX: Math.min(bounds.minX, x),
    minY: Math.min(bounds.minY, y),
    maxX: Math.max(bounds.maxX, x),
    maxY: Math.max(bounds.maxY, y),
  }), {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  });
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

function cropForBounds(bounds) {
  const left = Math.max(0, Math.floor(bounds.minX - cropPadding));
  const top = Math.max(0, Math.floor(bounds.minY - cropPadding));
  const right = Math.min(imageWidth, Math.ceil(bounds.maxX + cropPadding));
  const bottom = Math.min(imageHeight, Math.ceil(bounds.maxY + cropPadding));
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function formatBounds(bounds) {
  return `${bounds.minX}/${bounds.minY}/${bounds.maxX}/${bounds.maxY}`;
}

function existingBlockById(sectionId) {
  return DAEGU_BLOCKS.find((block) => block.id === sectionId) ?? null;
}

function operatorReferenceBlockExists(blockName) {
  const normalized = normalizeAlias(blockName);
  return DAEGU_OPERATOR_REFERENCE_BLOCKS.some((block) => normalizeAlias(block.block) === normalized);
}

function defaultSectionId(blockName, existingBlock) {
  if (existingBlock) return existingBlock.id;
  const normalized = canonicalBlockFromVisibleLabel(blockName).toLowerCase();
  if (normalized.startsWith('tr-')) return `daegu-outfield-table-tr-${normalized}`;
  if (normalized.startsWith('rf-')) return `daegu-outfield-reserved-rf-${normalized}`;
  if (normalized.startsWith('lf-')) return `daegu-outfield-reserved-lf-${normalized}`;
  return `daegu-operator-reference-${normalized}`;
}

function defaultSectionName(blockName, existingBlock) {
  if (existingBlock) return existingBlock.name;
  if (blockName.startsWith('TR-')) return `외야 테이블석 ${blockName}`;
  if (blockName.startsWith('RF-')) return `외야 지정석 ${blockName}`;
  if (blockName.startsWith('LF-')) return `외야 지정석 ${blockName}`;
  return `외야석 ${blockName}`;
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (fallback !== null && error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function buildCandidateCrop({ imageBuffer, candidate }) {
  const crop = cropForBounds(candidate.bounds);
  const cropBuffer = await sharp(imageBuffer).extract(crop).png().toBuffer();
  const cropHref = `data:image/png;base64,${cropBuffer.toString('base64')}`;
  const labelX = Number(candidate.labelX) - crop.left;
  const labelY = Number(candidate.labelY) - crop.top;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="0 0 ${crop.width} ${crop.height}">`,
    `  <image href="${cropHref}" x="0" y="0" width="${crop.width}" height="${crop.height}" />`,
    `  <path d="${xmlEscape(localizePath(candidate.draftHitPath, crop))}" fill="#f9731633" stroke="#f97316" stroke-width="5" stroke-dasharray="12 8" vector-effect="non-scaling-stroke" />`,
    `  <path d="${xmlEscape(localizePath(candidate.draftVisualPath, crop))}" fill="#22d3ee33" stroke="#0ea5e9" stroke-width="5" vector-effect="non-scaling-stroke" />`,
    `  <circle cx="${formatPathCoordinate(labelX)}" cy="${formatPathCoordinate(labelY)}" r="10" fill="#f8fafc" stroke="#020617" stroke-width="4" />`,
    `  <text x="16" y="34" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#f8fafc" stroke="#020617" stroke-width="5" paint-order="stroke">${xmlEscape(candidate.visibleLabel)} / ${xmlEscape(candidate.draftId)}</text>`,
    '</svg>',
  ].join('\n');
  const safeId = candidate.draftId.toLowerCase();
  const safeLabel = normalizeAlias(candidate.visibleLabel).toLowerCase();
  const pngPath = path.join(cropDir, `${safeId}-${safeLabel}-overlay.png`);
  const svgPath = path.join(cropDir, `${safeId}-${safeLabel}-overlay.svg`);
  await fs.writeFile(svgPath, svg);
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  return {
    cropPng: toFrontendRelative(pngPath),
    cropSvg: toFrontendRelative(svgPath),
  };
}

function mergeOperatorInput(existingRows, candidateRows) {
  const existingByDraftId = new Map((existingRows ?? []).map((row) => [row.draftId, row]));
  return candidateRows.map((candidate) => {
    const existing = existingByDraftId.get(candidate.draftId) ?? {};
    return {
      draftId: candidate.draftId,
      visibleLabel: candidate.visibleLabel,
      decisionType: existing.decisionType ?? '',
      operatorDecision: existing.operatorDecision ?? 'PENDING',
      referenceExistingSectionId: candidate.referenceExistingSectionId,
      newSectionId: existing.newSectionId ?? candidate.suggestedNewSectionId,
      newSectionName: existing.newSectionName ?? candidate.suggestedNewSectionName,
      newBlock: existing.newBlock ?? candidate.suggestedNewBlock,
      newSeatCategory: existing.newSeatCategory ?? candidate.suggestedSeatCategory,
      newLevel: existing.newLevel ?? candidate.suggestedLevel,
      newSide: existing.newSide ?? candidate.suggestedSide,
      correctedPath: existing.correctedPath ?? candidate.draftVisualPath,
      correctedHitPath: existing.correctedHitPath ?? candidate.draftHitPath,
      correctedLabelX: existing.correctedLabelX ?? candidate.labelX,
      correctedLabelY: existing.correctedLabelY ?? candidate.labelY,
      reviewer: existing.reviewer ?? '',
      reviewedAt: existing.reviewedAt ?? '',
      notes: existing.notes ?? '',
    };
  });
}

function validateOperatorRow(row) {
  const failures = [];
  const warnings = [];
  const decision = row.operatorDecision;
  const decisionType = row.decisionType;

  if (decision === 'PENDING' || !decision) {
    return {
      validationStatus: 'PENDING_OPERATOR_DECISION',
      failures,
      warnings,
    };
  }

  if (decision !== 'APPROVED' && decision !== 'REJECTED') failures.push('OPERATOR_DECISION_INVALID');
  if (decision === 'REJECTED') {
    return {
      validationStatus: failures.length > 0 ? 'REJECTED_INVALID' : 'REJECTED_VALID',
      failures,
      warnings,
    };
  }

  if (!allowedDecisionTypes.has(decisionType)) failures.push('DECISION_TYPE_REQUIRED');
  if (!row.reviewer) failures.push('REVIEWER_REQUIRED');
  if (!row.reviewedAt) failures.push('REVIEWED_AT_REQUIRED');

  if (decisionType === 'EXCLUDE_NON_SEAT') {
    return {
      validationStatus: failures.length > 0 ? 'APPROVED_INVALID' : 'APPROVED_VALID',
      failures: [...new Set(failures)],
      warnings,
    };
  }

  if (!row.newSectionId) failures.push('NEW_SECTION_ID_REQUIRED');
  if (!row.newSectionName) failures.push('NEW_SECTION_NAME_REQUIRED');
  if (!row.newBlock) failures.push('NEW_BLOCK_REQUIRED');
  if (!row.correctedPath) failures.push('CORRECTED_PATH_REQUIRED');
  if (!row.correctedHitPath) failures.push('CORRECTED_HIT_PATH_REQUIRED');
  if (row.correctedLabelX === '' || row.correctedLabelX === undefined) failures.push('CORRECTED_LABEL_X_REQUIRED');
  if (row.correctedLabelY === '' || row.correctedLabelY === undefined) failures.push('CORRECTED_LABEL_Y_REQUIRED');

  const labelPoint = [Number(row.correctedLabelX), Number(row.correctedLabelY)];
  if (!Number.isFinite(labelPoint[0]) || !Number.isFinite(labelPoint[1])) failures.push('CORRECTED_LABEL_POINT_INVALID');

  for (const [pathKind, pathData] of [['visualPath', row.correctedPath], ['hitPath', row.correctedHitPath]]) {
    if (!pathData) continue;
    const errors = validateSeatMapPolygonPath({
      pathData,
      width: imageWidth,
      height: imageHeight,
      labelPoint: pathKind === 'hitPath' && Number.isFinite(labelPoint[0]) && Number.isFinite(labelPoint[1]) ? labelPoint : undefined,
      sectionId: row.newSectionId,
      pathKind,
    });
    failures.push(...errors.map((error) => `${pathKind}:${error}`));
    const bounds = pathBounds(pathData);
    if (bounds.maxY > 3260) warnings.push(`${pathKind}:TRACE_REGION_BOTTOM_EDGE_NEAR_LEGEND`);
  }

  return {
    validationStatus: failures.length > 0 ? 'APPROVED_INVALID' : 'APPROVED_VALID',
    failures: [...new Set(failures)],
    warnings: [...new Set(warnings)],
  };
}

async function buildPacket() {
  const inventory = await readJson(inventoryJsonPath);
  const autoMap = await readJson(autoMapJsonPath);
  const sourceImagePath = path.join(frontendRoot, inventory.source.imagePath);
  const imageBuffer = await fs.readFile(sourceImagePath);
  const autoRowsByDraftId = new Map((autoMap.autoRows ?? []).map((row) => [row.draftId, row]));
  const exactRows = inventory.priorityQueues.p1ExactMatchApprovalCandidates ?? [];
  const p2cRows = exactRows
    .filter((candidate) => targetLabelSet.has(normalizeAlias(candidate.visibleLabel)))
    .map((candidate) => {
      const autoRow = autoRowsByDraftId.get(candidate.draftId);
      if (!autoRow) throw new Error(`Auto-map row not found for ${candidate.draftId}`);
      const canonicalBlock = canonicalBlockFromVisibleLabel(candidate.visibleLabel);
      const existingBlock = existingBlockById(candidate.existingSectionId);
      const [minX, minY, maxX, maxY] = candidate.bounds;
      return {
        ...candidate,
        bounds: { minX, minY, maxX, maxY },
        visibleLabel: normalizeAlias(candidate.visibleLabel),
        referenceExistingSectionId: candidate.existingSectionId,
        referenceExistingBlockName: candidate.existingBlockName,
        draftVisualPath: autoRow.draftVisualPath,
        draftHitPath: autoRow.draftHitPath,
        labelX: autoRow.labelX,
        labelY: autoRow.labelY,
        pointCount: autoRow.pointCount,
        colorClass: autoRow.colorClass,
        suggestedZone: autoRow.suggestedZone,
        riskFlags: [
          ...(Array.isArray(autoRow.riskFlags) ? autoRow.riskFlags : String(autoRow.riskFlags ?? '').split('|').filter(Boolean)),
          'P2C_OPERATOR_REFERENCE_EXACT_LABEL_MATCH',
          operatorReferenceBlockExists(canonicalBlock) ? 'ALREADY_ACTIVE_IN_OPERATOR_REFERENCE_DATASET' : '',
        ].filter(Boolean).sort(),
        suggestedNewSectionId: defaultSectionId(canonicalBlock, existingBlock),
        suggestedNewSectionName: defaultSectionName(canonicalBlock, existingBlock),
        suggestedNewBlock: canonicalBlock,
        suggestedSeatCategory: existingBlock?.category ?? 'OUTFIELD',
        suggestedLevel: existingBlock?.level ?? 'OUTFIELD',
        suggestedSide: existingBlock?.side ?? 'OUTFIELD',
      };
    })
    .sort((a, b) => expectedP2CVisibleLabels.indexOf(a.visibleLabel) - expectedP2CVisibleLabels.indexOf(b.visibleLabel));

  const foundLabels = new Set(p2cRows.map((row) => row.visibleLabel));
  const missingExpectedLabels = expectedP2CVisibleLabels.filter((label) => !foundLabels.has(label));
  if (missingExpectedLabels.length > 0) {
    throw new Error(`Expected P2C labels missing from inventory: ${missingExpectedLabels.join(', ')}`);
  }

  await fs.mkdir(cropDir, { recursive: true });
  const candidates = [];
  for (const candidate of p2cRows) {
    candidates.push({
      ...candidate,
      evidence: await buildCandidateCrop({ imageBuffer, candidate }),
    });
  }

  await fs.mkdir(operatorInputDir, { recursive: true });
  const previousOperatorInput = await readJson(operatorInputJsonPath, { rows: [] });
  const operatorRows = mergeOperatorInput(previousOperatorInput.rows, candidates);

  const packet = {
    status: 'p2c-approval-packet-ready',
    generatedAt: new Date().toISOString(),
    source: inventory.source,
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      operatorApprovalRequired: true,
      acceptedDecisionTypes: [...allowedDecisionTypes],
      note: 'This packet creates 4096 operator-reference P2C SKY S24-S31 review evidence only. It never writes src/data/daeguSeatData.ts.',
    },
    summary: {
      candidateCount: candidates.length,
      targetLabels: expectedP2CVisibleLabels,
      cropDir: toFrontendRelative(cropDir),
      operatorInput: toFrontendRelative(operatorInputJsonPath),
    },
    candidates,
  };

  await fs.writeFile(packetJsonPath, `${JSON.stringify(packet, null, 2)}\n`);
  await fs.writeFile(packetCsvPath, buildCsv(candidates.map((candidate) => ({
    draftId: candidate.draftId,
    visibleLabel: candidate.visibleLabel,
    referenceExistingSectionId: candidate.referenceExistingSectionId,
    referenceExistingBlockName: candidate.referenceExistingBlockName,
    suggestedNewSectionId: candidate.suggestedNewSectionId,
    suggestedNewSectionName: candidate.suggestedNewSectionName,
    suggestedNewBlock: candidate.suggestedNewBlock,
    suggestedZone: candidate.suggestedZone,
    colorClass: candidate.colorClass,
    bounds: formatBounds(candidate.bounds),
    cropPng: candidate.evidence.cropPng,
    riskFlags: candidate.riskFlags,
  })), [
    'draftId',
    'visibleLabel',
    'referenceExistingSectionId',
    'referenceExistingBlockName',
    'suggestedNewSectionId',
    'suggestedNewSectionName',
    'suggestedNewBlock',
    'suggestedZone',
    'colorClass',
    'bounds',
    'cropPng',
    'riskFlags',
  ]));
  await fs.writeFile(operatorInputJsonPath, `${JSON.stringify({
    status: 'operator-input-template',
    generatedAt: packet.generatedAt,
    policy: packet.policy,
    instructions: [
      'Set operatorDecision=APPROVED or REJECTED.',
      'For APPROVED rows, choose one decisionType: ADD_TO_OPERATOR_REFERENCE_DATASET or EXCLUDE_NON_SEAT.',
      'Fill reviewer and reviewedAt for every APPROVED row.',
      'Correct correctedPath/correctedHitPath/correctedLabelX/correctedLabelY before approving ADD_TO_OPERATOR_REFERENCE_DATASET.',
      'This template targets DAEGU_OPERATOR_REFERENCE_BLOCKS only. Do not overwrite DAEGU_BLOCKS official PNG coordinates.',
    ],
    rows: operatorRows,
  }, null, 2)}\n`);
  await fs.writeFile(operatorInputCsvPath, buildCsv(operatorRows, [
    'draftId',
    'visibleLabel',
    'decisionType',
    'operatorDecision',
    'referenceExistingSectionId',
    'newSectionId',
    'newSectionName',
    'newBlock',
    'newSeatCategory',
    'newLevel',
    'newSide',
    'correctedPath',
    'correctedHitPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'notes',
  ]));
  await fs.writeFile(packetMdPath, [
    '# 대구 operator reference P2C approval packet',
    '',
    `- status: \`${packet.status}\``,
    `- source: \`${packet.source.imagePath}\``,
    `- coordinate system: \`${packet.source.viewBox}\``,
    `- candidate count: \`${packet.summary.candidateCount}\``,
    `- target labels: ${packet.summary.targetLabels.map((label) => `\`${label}\``).join(', ')}`,
    `- production write allowed: \`${packet.policy.productionWriteAllowed}\``,
    `- operator input: \`${packet.summary.operatorInput}\``,
    '',
    '## Candidates',
    '',
    ...candidates.map((candidate) => [
      `### ${candidate.visibleLabel} (${candidate.draftId})`,
      '',
      `- reference existing section: \`${candidate.referenceExistingSectionId}\` / \`${candidate.referenceExistingBlockName}\``,
      `- operator reference section: \`${candidate.suggestedNewSectionId}\` / \`${candidate.suggestedNewSectionName}\``,
      `- bounds: \`${formatBounds(candidate.bounds)}\``,
      `- crop: \`${candidate.evidence.cropPng}\``,
      `- risk flags: ${candidate.riskFlags.map((flag) => `\`${flag}\``).join(', ')}`,
      '',
    ].join('\n')),
    '## Approval Rule',
    '',
    '승인 전에는 production 좌표 반영을 하지 않는다. `operatorDecision=APPROVED`, `decisionType=ADD_TO_OPERATOR_REFERENCE_DATASET`, `reviewer`, `reviewedAt`, corrected geometry가 gate를 통과해야 dry-run apply plan에만 포함된다.',
    '',
  ].join('\n'));

  console.log(`p2c_approval_packet_markdown:${packetMdPath}`);
  console.log(`p2c_approval_packet_json:${packetJsonPath}`);
  console.log(`p2c_operator_input_json:${operatorInputJsonPath}`);
  console.log(`p2c_crop_dir:${cropDir}`);
  console.log(`status:${packet.status} candidates=${candidates.length}`);
}

async function runGate() {
  const packet = await readJson(packetJsonPath);
  const input = await readJson(operatorInputJsonPath);
  const candidatesByDraftId = new Map(packet.candidates.map((candidate) => [candidate.draftId, candidate]));
  const validations = input.rows.map((row) => {
    const candidate = candidatesByDraftId.get(row.draftId);
    if (!candidate) {
      return {
        draftId: row.draftId,
        visibleLabel: row.visibleLabel,
        validationStatus: 'UNKNOWN_DRAFT_ID',
        failures: ['UNKNOWN_DRAFT_ID'],
        warnings: [],
      };
    }
    const result = validateOperatorRow(row);
    return {
      draftId: row.draftId,
      visibleLabel: row.visibleLabel,
      decisionType: row.decisionType,
      operatorDecision: row.operatorDecision,
      validationStatus: result.validationStatus,
      failures: result.failures,
      warnings: result.warnings,
    };
  });
  const approvedValidRows = input.rows.filter((row) => {
    const validation = validations.find((candidate) => candidate.draftId === row.draftId);
    return validation?.validationStatus === 'APPROVED_VALID';
  });
  const invalidRows = validations.filter((row) => row.failures.length > 0);
  const pendingRows = validations.filter((row) => row.validationStatus === 'PENDING_OPERATOR_DECISION');
  const dryRunRows = approvedValidRows
    .filter((row) => row.decisionType !== 'EXCLUDE_NON_SEAT')
    .map((row) => {
      const candidate = candidatesByDraftId.get(row.draftId);
      return {
        operation: 'ADD_TO_OPERATOR_REFERENCE_DATASET',
        draftId: row.draftId,
        visibleLabel: row.visibleLabel,
        referenceExistingSectionId: row.referenceExistingSectionId,
        newSection: {
          id: row.newSectionId,
          name: row.newSectionName,
          block: row.newBlock,
          category: row.newSeatCategory,
          level: row.newLevel,
          side: row.newSide,
          sectionKind: 'SEAT_SECTION',
          traceStatus: 'OFFICIAL_IMAGE_TRACED',
          traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
          sourceConfidence: 'OPERATOR_APPROVED',
          officialBlocks: [row.newBlock],
          imageGeometry: {
            d: row.correctedPath,
            visualPath: row.correctedPath,
            hitPath: row.correctedHitPath,
            labelPoint: [Number(row.correctedLabelX), Number(row.correctedLabelY)],
            labelX: Number(row.correctedLabelX),
            labelY: Number(row.correctedLabelY),
            shortLabel: row.newBlock,
            geometryVersion,
            traceSource: 'OPERATOR_REFERENCE_RAPAK_2025',
            manualReviewed: true,
            pixelAlignmentStatus: 'PIXEL_ALIGNED',
          },
        },
        sourcePolicy: 'dry-run only; patch DAEGU_OPERATOR_REFERENCE_BLOCKS, not DAEGU_BLOCKS',
        referenceBounds: candidate.bounds,
      };
    });

  const status = invalidRows.length > 0
    ? 'p2c-approval-gate-blocked'
    : approvedValidRows.length > 0
      ? 'p2c-approval-gate-dry-run-ready'
      : 'p2c-approval-gate-waiting-for-operator-input';
  const gate = {
    status,
    generatedAt: new Date().toISOString(),
    source: packet.source,
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      dryRunOnly: true,
      requireApproved,
      note: 'This gate validates P2C operator input and emits a dry-run plan only. It never writes src/data/daeguSeatData.ts.',
    },
    summary: {
      totalRows: validations.length,
      approvedValidRows: approvedValidRows.length,
      pendingRows: pendingRows.length,
      invalidRows: invalidRows.length,
      dryRunRows: dryRunRows.length,
      readyForDryRunReview: status === 'p2c-approval-gate-dry-run-ready',
    },
    validations,
  };
  const dryRunPlan = {
    status: dryRunRows.length > 0 ? 'p2c-dry-run-plan-ready' : 'p2c-dry-run-plan-empty',
    generatedAt: gate.generatedAt,
    sourceDataWritePerformed: false,
    productionWriteAllowed: false,
    dryRunRows,
  };

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify(gate, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'draftId',
    'visibleLabel',
    'decisionType',
    'operatorDecision',
    'validationStatus',
    'failures',
    'warnings',
  ]));
  await fs.writeFile(dryRunPlanPath, `${JSON.stringify(dryRunPlan, null, 2)}\n`);
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P2C approval gate',
    '',
    `- status: \`${gate.status}\``,
    `- approved valid rows: \`${gate.summary.approvedValidRows}\``,
    `- pending rows: \`${gate.summary.pendingRows}\``,
    `- invalid rows: \`${gate.summary.invalidRows}\``,
    `- dry-run rows: \`${gate.summary.dryRunRows}\``,
    `- production write allowed: \`${gate.policy.productionWriteAllowed}\``,
    `- source data write performed: \`${gate.policy.sourceDataWritePerformed}\``,
    `- dry-run plan: \`${toFrontendRelative(dryRunPlanPath)}\``,
    '',
    '## Validation Rows',
    '',
    ...validations.map((row) => `- \`${row.visibleLabel}\` (${row.draftId}): \`${row.validationStatus}\`${row.failures.length ? ` failures=${row.failures.map((failure) => `\`${failure}\``).join(', ')}` : ''}`),
    '',
    '## Source Policy',
    '',
    '이 gate는 operator input 검증과 dry-run plan 생성만 수행한다. 실제 source patch는 `DAEGU_OPERATOR_REFERENCE_BLOCKS` 확장에만 적용해야 하며 공식 PNG `DAEGU_BLOCKS`는 변경하지 않는다.',
    '',
  ].join('\n'));

  console.log(`p2c_approval_gate_markdown:${gateMdPath}`);
  console.log(`p2c_approval_gate_json:${gateJsonPath}`);
  console.log(`p2c_dry_run_plan_json:${dryRunPlanPath}`);
  console.log(`status:${gate.status} approved=${gate.summary.approvedValidRows} pending=${gate.summary.pendingRows} invalid=${gate.summary.invalidRows} dryRun=${gate.summary.dryRunRows}`);

  if (requireApproved && approvedValidRows.length === 0) process.exitCode = 1;
  if (invalidRows.length > 0) process.exitCode = 1;
}

if (task === 'packet') {
  await buildPacket();
} else if (task === 'gate') {
  await runGate();
} else {
  throw new Error(`Unknown task: ${task}. Expected packet or gate.`);
}
