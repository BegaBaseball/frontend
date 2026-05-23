import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { DAEGU_BLOCKS } from '../src/data/daeguSeatData.ts';
import { validateSeatMapPolygonPath } from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const inventoryDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-inventory');
const inventoryJsonPath = path.join(inventoryDir, 'daegu-operator-reference-inventory.json');
const autoMapJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-auto-map/daegu-operator-reference-auto-map.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p0-approval');
const cropDir = path.join(outputDir, 'crops');
const operatorInputDir = path.join(outputDir, 'operator-input');
const gateDir = path.join(outputDir, 'gate');
const packetJsonPath = path.join(outputDir, 'daegu-operator-reference-p0-approval-packet.json');
const packetCsvPath = path.join(outputDir, 'daegu-operator-reference-p0-approval-packet.csv');
const packetMdPath = path.join(outputDir, 'daegu-operator-reference-p0-approval-packet.md');
const operatorInputJsonPath = path.join(operatorInputDir, 'daegu-operator-reference-p0-operator-input.json');
const operatorInputCsvPath = path.join(operatorInputDir, 'daegu-operator-reference-p0-operator-input.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p0-approval-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p0-approval-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p0-approval-gate.md');
const dryRunPlanPath = path.join(gateDir, 'daegu-operator-reference-p0-dry-run-apply-plan.json');

const task = process.argv[2] ?? 'packet';
const requireApproved = process.argv.includes('--require-approved');
const imageWidth = 4096;
const imageHeight = 4096;
const cropPadding = 150;
const expectedP0VisibleLabels = ['TR8', 'TR9', 'TR10', 'TR0'];

const allowedDecisionTypes = new Set(['ADD_NEW_SECTION', 'MAP_TO_EXISTING', 'EXCLUDE_NON_SEAT']);

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
  const match = normalizeAlias(visibleLabel).match(/^TR(\d+)$/);
  return match ? `TR-${Number(match[1])}` : visibleLabel;
}

function suggestedSectionId(visibleLabel) {
  return `daegu-outfield-table-tr-${canonicalBlockFromVisibleLabel(visibleLabel).toLowerCase()}`;
}

function suggestedSectionName(visibleLabel) {
  return `외야 테이블석 ${canonicalBlockFromVisibleLabel(visibleLabel)}`;
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

function pointInsideBounds(point, bounds, margin = 0) {
  return point[0] >= bounds.minX - margin
    && point[0] <= bounds.maxX + margin
    && point[1] >= bounds.minY - margin
    && point[1] <= bounds.maxY + margin;
}

function distanceBetweenBounds(a, b) {
  const dx = Math.max(0, Math.max(a.minX - b.maxX, b.minX - a.maxX));
  const dy = Math.max(0, Math.max(a.minY - b.maxY, b.minY - a.maxY));
  return Math.hypot(dx, dy);
}

function pathBounds(pathData) {
  const points = pathToPoints(pathData);
  return points.reduce((bounds, [x, y]) => ({
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

function formatBounds(bounds) {
  return `${bounds.minX}/${bounds.minY}/${bounds.maxX}/${bounds.maxY}`;
}

function blockLabelCandidates(block) {
  return [
    block.block,
    block.name,
    ...(block.officialBlocks ?? []),
  ].filter(Boolean);
}

function buildExistingSimilarityRows(candidate) {
  const visible = normalizeAlias(candidate.visibleLabel);
  const prefix = visible.replace(/\d+$/, '');
  const number = Number(visible.match(/\d+$/)?.[0] ?? Number.NaN);
  return DAEGU_BLOCKS.map((block) => {
    const aliases = blockLabelCandidates(block);
    const normalizedAliases = aliases.map(normalizeAlias);
    const hasSamePrefix = normalizedAliases.some((alias) => alias.startsWith(prefix));
    const aliasNumbers = normalizedAliases
      .map((alias) => Number(alias.match(/\d+$/)?.[0] ?? Number.NaN))
      .filter((value) => Number.isFinite(value));
    const nearestNumberDistance = aliasNumbers.length > 0
      ? Math.min(...aliasNumbers.map((aliasNumber) => Math.abs(aliasNumber - number)))
      : Number.POSITIVE_INFINITY;
    const familyScore = hasSamePrefix ? 1 : 0;
    const tableScore = block.category === 'OUTFIELD' && /테이블|TR/i.test([block.id, block.block, block.name].join(' ')) ? 1 : 0;
    const score = (familyScore * 100) + (tableScore * 20) - Math.min(nearestNumberDistance, 20);
    return {
      sectionId: block.id,
      block: block.block,
      name: block.name,
      category: block.category,
      level: block.level,
      side: block.side,
      traceStatus: block.traceStatus,
      aliases,
      score,
      nearestNumberDistance: Number.isFinite(nearestNumberDistance) ? nearestNumberDistance : '',
    };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || String(a.nearestNumberDistance).localeCompare(String(b.nearestNumberDistance)) || a.sectionId.localeCompare(b.sectionId))
    .slice(0, 8);
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (fallback !== null && error.code === 'ENOENT') return fallback;
    throw error;
  }
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
      existingSectionId: existing.existingSectionId ?? '',
      newSectionId: existing.newSectionId ?? candidate.suggestedNewSectionId,
      newSectionName: existing.newSectionName ?? candidate.suggestedNewSectionName,
      newBlock: existing.newBlock ?? candidate.suggestedNewBlock,
      newSeatCategory: existing.newSeatCategory ?? 'OUTFIELD',
      newLevel: existing.newLevel ?? 'OUTFIELD',
      newSide: existing.newSide ?? 'OUTFIELD',
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

function validateOperatorRow(row, candidate) {
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

  if (decision !== 'APPROVED' && decision !== 'REJECTED') {
    failures.push('OPERATOR_DECISION_INVALID');
  }
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

  if (decisionType === 'ADD_NEW_SECTION') {
    if (!row.newSectionId) failures.push('NEW_SECTION_ID_REQUIRED');
    if (!row.newSectionName) failures.push('NEW_SECTION_NAME_REQUIRED');
    if (!row.newBlock) failures.push('NEW_BLOCK_REQUIRED');
    if (!row.newSeatCategory) failures.push('NEW_SEAT_CATEGORY_REQUIRED');
    if (!row.newLevel) failures.push('NEW_LEVEL_REQUIRED');
    if (!row.newSide) failures.push('NEW_SIDE_REQUIRED');
  }

  if (decisionType === 'MAP_TO_EXISTING' && !row.existingSectionId) {
    failures.push('EXISTING_SECTION_ID_REQUIRED');
  }

  if (decisionType !== 'EXCLUDE_NON_SEAT') {
    if (!row.correctedPath) failures.push('CORRECTED_PATH_REQUIRED');
    if (!row.correctedHitPath) failures.push('CORRECTED_HIT_PATH_REQUIRED');
    if (row.correctedLabelX === '' || row.correctedLabelX === undefined) failures.push('CORRECTED_LABEL_X_REQUIRED');
    if (row.correctedLabelY === '' || row.correctedLabelY === undefined) failures.push('CORRECTED_LABEL_Y_REQUIRED');

    const labelPoint = [Number(row.correctedLabelX), Number(row.correctedLabelY)];
    if (row.correctedPath && Number.isFinite(labelPoint[0]) && Number.isFinite(labelPoint[1])) {
      failures.push(...validateSeatMapPolygonPath({
        pathData: row.correctedPath,
        width: imageWidth,
        height: imageHeight,
        minPointCount: 3,
        labelPoint,
        labelTolerance: 6,
      }).map((code) => `CORRECTED_PATH_${code}`));
    }
    if (row.correctedHitPath && Number.isFinite(labelPoint[0]) && Number.isFinite(labelPoint[1])) {
      failures.push(...validateSeatMapPolygonPath({
        pathData: row.correctedHitPath,
        width: imageWidth,
        height: imageHeight,
        minPointCount: 3,
        labelPoint,
        labelTolerance: 6,
      }).map((code) => `CORRECTED_HIT_PATH_${code}`));
    }

    if (!pointInsideBounds(labelPoint, candidate.bounds, 90)) {
      warnings.push('CORRECTED_LABEL_FAR_FROM_REFERENCE_COMPONENT');
    }
    const correctedBounds = row.correctedPath ? pathBounds(row.correctedPath) : null;
    if (correctedBounds && distanceBetweenBounds(correctedBounds, candidate.bounds) > 120) {
      warnings.push('CORRECTED_PATH_FAR_FROM_REFERENCE_COMPONENT');
    }
  }

  if (decisionType === 'ADD_NEW_SECTION' && DAEGU_BLOCKS.some((block) => block.id === row.newSectionId)) {
    failures.push('NEW_SECTION_ID_ALREADY_EXISTS');
  }
  if (decisionType === 'MAP_TO_EXISTING' && !DAEGU_BLOCKS.some((block) => block.id === row.existingSectionId)) {
    failures.push('EXISTING_SECTION_ID_NOT_FOUND');
  }

  return {
    validationStatus: failures.length > 0 ? 'APPROVED_INVALID' : 'APPROVED_VALID',
    failures: [...new Set(failures)],
    warnings: [...new Set(warnings)],
  };
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
  const pngPath = path.join(cropDir, `${safeId}-${normalizeAlias(candidate.visibleLabel).toLowerCase()}-overlay.png`);
  const svgPath = path.join(cropDir, `${safeId}-${normalizeAlias(candidate.visibleLabel).toLowerCase()}-overlay.svg`);
  await fs.writeFile(svgPath, svg);
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  return {
    cropPng: toFrontendRelative(pngPath),
    cropSvg: toFrontendRelative(svgPath),
  };
}

async function buildPacket() {
  const inventory = await readJson(inventoryJsonPath);
  const autoMap = await readJson(autoMapJsonPath);
  const sourceImagePath = path.join(frontendRoot, inventory.source.imagePath);
  const imageBuffer = await fs.readFile(sourceImagePath);
  const autoRowsByDraftId = new Map((autoMap.autoRows ?? []).map((row) => [row.draftId, row]));
  const p0Rows = inventory.priorityQueues.p0MissingBlockCandidates.map((candidate) => {
    const autoRow = autoRowsByDraftId.get(candidate.draftId);
    if (!autoRow) {
      throw new Error(`Auto-map row not found for ${candidate.draftId}`);
    }
    const [minX, minY, maxX, maxY] = candidate.bounds;
    const bounds = { minX, minY, maxX, maxY };
    const visibleLabel = candidate.visibleLabel;
    const suggestedNewBlock = canonicalBlockFromVisibleLabel(visibleLabel);
    const riskFlags = [
      ...(Array.isArray(autoRow.riskFlags) ? autoRow.riskFlags : String(autoRow.riskFlags ?? '').split('|').filter(Boolean)),
      'P0_VISIBLE_LABEL_UNMATCHED',
      ...(normalizeAlias(visibleLabel) === 'TR0' ? ['ZERO_INDEX_LABEL_REVIEW'] : []),
    ];
    return {
      ...candidate,
      bounds,
      visibleLabel,
      draftVisualPath: autoRow.draftVisualPath,
      draftHitPath: autoRow.draftHitPath,
      labelX: autoRow.labelX,
      labelY: autoRow.labelY,
      pointCount: autoRow.pointCount,
      riskFlags: [...new Set(riskFlags)].sort(),
      suggestedNewSectionId: suggestedSectionId(visibleLabel),
      suggestedNewSectionName: suggestedSectionName(visibleLabel),
      suggestedNewBlock,
      suggestedSeatCategory: 'OUTFIELD',
      suggestedLevel: 'OUTFIELD',
      suggestedSide: 'OUTFIELD',
      similarExistingBlocks: buildExistingSimilarityRows({ visibleLabel }),
    };
  });

  await fs.mkdir(cropDir, { recursive: true });
  const candidates = [];
  for (const candidate of p0Rows) {
    candidates.push({
      ...candidate,
      evidence: await buildCandidateCrop({ imageBuffer, candidate }),
    });
  }
  const candidateLabels = new Set(candidates.map((candidate) => candidate.visibleLabel));
  const missingExpectedLabels = expectedP0VisibleLabels.filter((label) => !candidateLabels.has(label));
  if (missingExpectedLabels.length > 0) {
    throw new Error(`Expected P0 labels missing from inventory: ${missingExpectedLabels.join(', ')}`);
  }

  await fs.mkdir(operatorInputDir, { recursive: true });
  const previousOperatorInput = await readJson(operatorInputJsonPath, { rows: [] });
  const operatorRows = mergeOperatorInput(previousOperatorInput.rows, candidates);

  const packet = {
    status: 'p0-approval-packet-ready',
    generatedAt: new Date().toISOString(),
    source: inventory.source,
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      operatorApprovalRequired: true,
      acceptedDecisionTypes: [...allowedDecisionTypes],
      note: 'This packet creates review evidence and operator input only. It never writes src/data/daeguSeatData.ts.',
    },
    summary: {
      candidateCount: candidates.length,
      missingLabels: candidates.map((candidate) => candidate.visibleLabel),
      cropDir: toFrontendRelative(cropDir),
      operatorInput: toFrontendRelative(operatorInputJsonPath),
    },
    candidates,
  };

  await fs.writeFile(packetJsonPath, `${JSON.stringify(packet, null, 2)}\n`);
  await fs.writeFile(packetCsvPath, buildCsv(candidates.map((candidate) => ({
    draftId: candidate.draftId,
    visibleLabel: candidate.visibleLabel,
    suggestedNewSectionId: candidate.suggestedNewSectionId,
    suggestedNewSectionName: candidate.suggestedNewSectionName,
    suggestedNewBlock: candidate.suggestedNewBlock,
    suggestedZone: candidate.suggestedZone,
    colorClass: candidate.colorClass,
    bounds: formatBounds(candidate.bounds),
    cropPng: candidate.evidence.cropPng,
    similarExistingBlocks: candidate.similarExistingBlocks.map((row) => `${row.block}:${row.sectionId}`),
    riskFlags: candidate.riskFlags,
  })), [
    'draftId',
    'visibleLabel',
    'suggestedNewSectionId',
    'suggestedNewSectionName',
    'suggestedNewBlock',
    'suggestedZone',
    'colorClass',
    'bounds',
    'cropPng',
    'similarExistingBlocks',
    'riskFlags',
  ]));
  await fs.writeFile(operatorInputJsonPath, `${JSON.stringify({
    status: 'operator-input-template',
    generatedAt: packet.generatedAt,
    policy: packet.policy,
    instructions: [
      'Set operatorDecision=APPROVED or REJECTED.',
      'For APPROVED rows, choose one decisionType: ADD_NEW_SECTION, MAP_TO_EXISTING, EXCLUDE_NON_SEAT.',
      'Fill reviewer and reviewedAt for every APPROVED row.',
      'Correct correctedPath/correctedHitPath/correctedLabelX/correctedLabelY before approving ADD_NEW_SECTION or MAP_TO_EXISTING.',
    ],
    rows: operatorRows,
  }, null, 2)}\n`);
  await fs.writeFile(operatorInputCsvPath, buildCsv(operatorRows, [
    'draftId',
    'visibleLabel',
    'decisionType',
    'operatorDecision',
    'existingSectionId',
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
    '# 대구 operator reference P0 approval packet',
    '',
    `- status: \`${packet.status}\``,
    `- source: \`${packet.source.imagePath}\``,
    `- coordinate system: \`${packet.source.viewBox}\``,
    `- candidate count: \`${packet.summary.candidateCount}\``,
    `- missing labels: ${packet.summary.missingLabels.map((label) => `\`${label}\``).join(', ')}`,
    `- production write allowed: \`${packet.policy.productionWriteAllowed}\``,
    `- operator input: \`${packet.summary.operatorInput}\``,
    '',
    '## Candidates',
    '',
    ...candidates.map((candidate) => [
      `### ${candidate.visibleLabel} (${candidate.draftId})`,
      '',
      `- suggested new section: \`${candidate.suggestedNewSectionId}\` / \`${candidate.suggestedNewSectionName}\``,
      `- suggested block: \`${candidate.suggestedNewBlock}\``,
      `- bounds: \`${formatBounds(candidate.bounds)}\``,
      `- crop: \`${candidate.evidence.cropPng}\``,
      `- risk flags: ${candidate.riskFlags.map((flag) => `\`${flag}\``).join(', ')}`,
      `- nearest existing family rows: ${candidate.similarExistingBlocks.map((row) => `\`${row.block}\``).join(', ')}`,
      '',
    ].join('\n')),
    '## Approval Rule',
    '',
    '승인 전에는 production 좌표 반영을 하지 않는다. `operatorDecision=APPROVED`, `decisionType`, `reviewer`, `reviewedAt`, corrected geometry가 gate를 통과해야 dry-run apply plan에만 포함된다.',
    '',
  ].join('\n'));

  console.log(`p0_approval_packet_markdown:${packetMdPath}`);
  console.log(`p0_approval_packet_json:${packetJsonPath}`);
  console.log(`p0_operator_input_json:${operatorInputJsonPath}`);
  console.log(`p0_crop_dir:${cropDir}`);
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
    const result = validateOperatorRow(row, candidate);
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
      if (row.decisionType === 'MAP_TO_EXISTING') {
        return {
          operation: 'MAP_TO_EXISTING',
          draftId: row.draftId,
          visibleLabel: row.visibleLabel,
          existingSectionId: row.existingSectionId,
          appendOfficialBlock: canonicalBlockFromVisibleLabel(row.visibleLabel),
          imageGeometryPatch: {
            visualPath: row.correctedPath,
            hitPath: row.correctedHitPath,
            labelPoint: [Number(row.correctedLabelX), Number(row.correctedLabelY)],
            geometryVersion: 'DAEGU_OPERATOR_REFERENCE_P0_APPROVED_DRY_RUN_V1',
            traceSource: 'OPERATOR_REFERENCE_RAPAK_2025',
            manualReviewed: true,
            pixelAlignmentStatus: 'PIXEL_ALIGNED',
          },
          sourcePolicy: 'dry-run only; manual source patch review required',
        };
      }
      return {
        operation: 'ADD_NEW_SECTION',
        draftId: row.draftId,
        visibleLabel: row.visibleLabel,
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
          officialBlocks: [row.newBlock],
          imageGeometry: {
            d: row.correctedPath,
            visualPath: row.correctedPath,
            hitPath: row.correctedHitPath,
            labelPoint: [Number(row.correctedLabelX), Number(row.correctedLabelY)],
            labelX: Number(row.correctedLabelX),
            labelY: Number(row.correctedLabelY),
            shortLabel: row.newBlock,
            geometryVersion: 'DAEGU_OPERATOR_REFERENCE_P0_APPROVED_DRY_RUN_V1',
            traceSource: 'OPERATOR_REFERENCE_RAPAK_2025',
            manualReviewed: true,
            pixelAlignmentStatus: 'PIXEL_ALIGNED',
          },
        },
        sourcePolicy: 'dry-run only; manual source patch review required',
        referenceBounds: candidate.bounds,
      };
    });

  const status = invalidRows.length > 0
    ? 'p0-approval-gate-blocked'
    : approvedValidRows.length > 0
      ? 'p0-approval-gate-dry-run-ready'
      : 'p0-approval-gate-waiting-for-operator-input';
  const gate = {
    status,
    generatedAt: new Date().toISOString(),
    source: packet.source,
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      dryRunOnly: true,
      requireApproved,
      note: 'This gate validates operator input and emits a dry-run plan only. It never writes src/data/daeguSeatData.ts.',
    },
    summary: {
      totalRows: validations.length,
      approvedValidRows: approvedValidRows.length,
      pendingRows: pendingRows.length,
      invalidRows: invalidRows.length,
      dryRunRows: dryRunRows.length,
      readyForDryRunReview: status === 'p0-approval-gate-dry-run-ready',
    },
    validations,
  };
  const dryRunPlan = {
    status: dryRunRows.length > 0 ? 'p0-dry-run-plan-ready' : 'p0-dry-run-plan-empty',
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
    '# 대구 operator reference P0 approval gate',
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
    '이 gate는 operator input 검증과 dry-run plan 생성만 수행한다. 실제 `src/data/daeguSeatData.ts` 변경은 별도 승인된 수동 source patch 단계에서만 진행한다.',
    '',
  ].join('\n'));

  console.log(`p0_approval_gate_markdown:${gateMdPath}`);
  console.log(`p0_approval_gate_json:${gateJsonPath}`);
  console.log(`p0_dry_run_plan_json:${dryRunPlanPath}`);
  console.log(`status:${gate.status} approved=${gate.summary.approvedValidRows} pending=${gate.summary.pendingRows} invalid=${gate.summary.invalidRows} dryRun=${gate.summary.dryRunRows}`);

  if (requireApproved && approvedValidRows.length === 0) {
    process.exitCode = 1;
  }
  if (invalidRows.length > 0) {
    process.exitCode = 1;
  }
}

if (task === 'packet') {
  await buildPacket();
} else if (task === 'gate') {
  await runGate();
} else {
  throw new Error(`Unknown task: ${task}. Expected packet or gate.`);
}
