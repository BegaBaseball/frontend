import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
} from '../src/data/daeguSeatData.ts';
import {
  pathToPoints,
  pointInPolygon,
  polygonArea,
} from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const traceJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-trace/daegu-operator-reference-trace.json');
const p8GateJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p8-classification/gate/daegu-operator-reference-p8-classification-gate.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p9-missing-scan');
const cropDir = path.join(outputDir, 'candidate-crops');
const gateDir = path.join(outputDir, 'gate');
const operatorInputDir = path.join(outputDir, 'operator-input');
const packetJsonPath = path.join(outputDir, 'daegu-operator-reference-p9-missing-scan-packet.json');
const packetCsvPath = path.join(outputDir, 'daegu-operator-reference-p9-missing-scan-packet.csv');
const packetMdPath = path.join(outputDir, 'daegu-operator-reference-p9-missing-scan-packet.md');
const overlaySvgPath = path.join(outputDir, 'daegu-operator-reference-p9-missing-scan-overlay.svg');
const overlayPngPath = path.join(outputDir, 'daegu-operator-reference-p9-missing-scan-overlay.png');
const operatorInputJsonPath = path.join(operatorInputDir, 'daegu-operator-reference-p9-missing-scan-input.json');
const operatorInputCsvPath = path.join(operatorInputDir, 'daegu-operator-reference-p9-missing-scan-input.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p9-missing-scan-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p9-missing-scan-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p9-missing-scan-gate.md');

const task = process.argv[2] ?? 'packet';
const requireCandidates = process.argv.includes('--require-candidates');
const activeCoverageThreshold = Number(process.env.DAEGU_OPERATOR_REFERENCE_P9_ACTIVE_COVERAGE_THRESHOLD ?? 0.28);
const floatingCoverageThreshold = Number(process.env.DAEGU_OPERATOR_REFERENCE_P9_FLOATING_COVERAGE_THRESHOLD ?? 0.16);
const sampleStep = Number(process.env.DAEGU_OPERATOR_REFERENCE_P9_SAMPLE_STEP ?? 12);
const maxCropRows = Number(process.env.DAEGU_OPERATOR_REFERENCE_P9_MAX_CROPS ?? 80);
const cropPadding = Number(process.env.DAEGU_OPERATOR_REFERENCE_P9_CROP_PADDING ?? 140);

const sourceContractLiterals = [
  'MISSING_BLOCK_CANDIDATE',
  'ALREADY_COVERED_ACTIVE_SEAT',
  'P8_CLASSIFIED_NON_SELECTABLE_OR_LABEL_REQUIRED',
  'FLOATING_POLYGON_RISK',
  'OPERATOR_LABEL_REQUIRED_BEFORE_SELECTABLE_SEAT',
  'P9 scans the 4096 operator reference image components and compares them with the current active selectable polygons.',
  'operatorDecision: \'PENDING\'',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p9-missing-scan-packet-ready',
  'p9-missing-scan-gate-passed',
  'daegu-operator-reference-trace.json',
  'DAEGU_OPERATOR_REFERENCE_BLOCKS',
];

void sourceContractLiterals;

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
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(rows, columns) {
  return `${[
    columns.map(csvEscape).join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')),
  ].join('\n')}\n`;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

function pointsToPath(points) {
  if (!points.length) return '';
  const [first, ...rest] = points;
  return `M ${formatNumber(first[0])} ${formatNumber(first[1])} ${rest.map(([x, y]) => `L ${formatNumber(x)} ${formatNumber(y)}`).join(' ')} Z`;
}

function boundsFromPoints(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function boundsOverlap(first, second) {
  return first.minX <= second.maxX
    && first.maxX >= second.minX
    && first.minY <= second.maxY
    && first.maxY >= second.minY;
}

function centroid(points) {
  const sum = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

function blockPolygon(block) {
  const pathData = block.imageGeometry.hitPath ?? block.imageGeometry.visualPath ?? block.imageGeometry.d;
  const points = pathToPoints(pathData);
  return {
    sectionId: block.id,
    block: block.block,
    name: block.name,
    category: block.category,
    points,
    bounds: boundsFromPoints(points),
    area: polygonArea(points),
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readTraceReport() {
  try {
    return await readJson(traceJsonPath);
  } catch (error) {
    throw new Error(`Trace report not found. Run npm run stadium:daegu:operator-reference-trace first. ${error.message}`);
  }
}

async function readP8ClassifiedIds() {
  const gate = await readJson(p8GateJsonPath);
  return new Set((gate.validations ?? []).map((row) => row.draftId));
}

function sampleComponentAgainstBlocks(component, activePolygons) {
  const componentPoints = component.visualPolygon;
  const componentBounds = component.bounds;
  const byBlock = new Map();
  let componentSamples = 0;
  let activeSamples = 0;

  for (let y = componentBounds.minY; y <= componentBounds.maxY; y += sampleStep) {
    for (let x = componentBounds.minX; x <= componentBounds.maxX; x += sampleStep) {
      const point = [x + sampleStep / 2, y + sampleStep / 2];
      if (!pointInPolygon(point, componentPoints)) continue;
      componentSamples += 1;
      for (const block of activePolygons) {
        if (!boundsOverlap(componentBounds, block.bounds)) continue;
        if (!pointInPolygon(point, block.points)) continue;
        activeSamples += 1;
        byBlock.set(block.sectionId, (byBlock.get(block.sectionId) ?? 0) + 1);
        break;
      }
    }
  }

  const overlapBlocks = [...byBlock.entries()]
    .map(([sectionId, samples]) => {
      const block = activePolygons.find((candidate) => candidate.sectionId === sectionId);
      return {
        sectionId,
        block: block?.block ?? '',
        name: block?.name ?? '',
        samples,
        ratio: componentSamples ? samples / componentSamples : 0,
      };
    })
    .sort((a, b) => b.samples - a.samples)
    .slice(0, 5);

  return {
    componentSamples,
    activeSamples,
    activeCoverageRatio: componentSamples ? activeSamples / componentSamples : 0,
    overlapBlocks,
  };
}

function sampleBlockAgainstComponents(block, components) {
  const componentEntries = components.map((component) => ({
    draftId: component.draftId,
    points: component.visualPolygon,
    bounds: component.bounds,
  })).filter((component) => boundsOverlap(block.bounds, component.bounds));
  let blockSamples = 0;
  let componentSamples = 0;

  for (let y = block.bounds.minY; y <= block.bounds.maxY; y += sampleStep) {
    for (let x = block.bounds.minX; x <= block.bounds.maxX; x += sampleStep) {
      const point = [x + sampleStep / 2, y + sampleStep / 2];
      if (!pointInPolygon(point, block.points)) continue;
      blockSamples += 1;
      if (componentEntries.some((component) => pointInPolygon(point, component.points))) {
        componentSamples += 1;
      }
    }
  }

  return {
    blockSamples,
    componentSamples,
    componentCoverageRatio: blockSamples ? componentSamples / blockSamples : 0,
  };
}

function classifyComponent(component, match, p8ClassifiedIds) {
  if (p8ClassifiedIds.has(component.draftId)) {
    return {
      classification: 'P8_CLASSIFIED_NON_SELECTABLE_OR_LABEL_REQUIRED',
      missingReason: 'P8 gate already classified this component outside the normal selectable seat layer.',
      nextAction: 'KEEP_OUT_OF_SEAT_LAYER',
    };
  }

  if (match.activeCoverageRatio >= activeCoverageThreshold) {
    return {
      classification: 'ALREADY_COVERED_ACTIVE_SEAT',
      missingReason: `component overlaps active selectable polygon coverage ratio ${formatNumber(match.activeCoverageRatio)}`,
      nextAction: 'NO_ACTION',
    };
  }

  return {
    classification: 'MISSING_BLOCK_CANDIDATE',
    missingReason: `image component has active selectable coverage ratio ${formatNumber(match.activeCoverageRatio)} below ${activeCoverageThreshold}`,
    nextAction: 'OPERATOR_LABEL_REQUIRED_BEFORE_SELECTABLE_SEAT',
  };
}

function cropForComponent(component, imageWidth, imageHeight) {
  const minX = component.bounds?.minX ?? component.minX;
  const minY = component.bounds?.minY ?? component.minY;
  const maxX = component.bounds?.maxX ?? component.maxX;
  const maxY = component.bounds?.maxY ?? component.maxY;
  const left = Math.max(0, Math.floor(minX - cropPadding));
  const top = Math.max(0, Math.floor(minY - cropPadding));
  const right = Math.min(imageWidth, Math.ceil(maxX + cropPadding));
  const bottom = Math.min(imageHeight, Math.ceil(maxY + cropPadding));
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function localizePath(pathData, crop) {
  let coordinateIndex = 0;
  return pathData.replace(/-?\d+(?:\.\d+)?/g, (rawValue) => {
    const value = Number(rawValue);
    const localized = coordinateIndex % 2 === 0 ? value - crop.left : value - crop.top;
    coordinateIndex += 1;
    return formatNumber(localized);
  });
}

async function writeCandidateCrop({ imageBuffer, imageWidth, imageHeight, row }) {
  const crop = cropForComponent(row, imageWidth, imageHeight);
  const cropBuffer = await sharp(imageBuffer).extract(crop).png().toBuffer();
  const href = `data:image/png;base64,${cropBuffer.toString('base64')}`;
  const pngPath = path.join(cropDir, `${row.draftId.toLowerCase()}-missing-candidate.png`);
  const svgPath = path.join(cropDir, `${row.draftId.toLowerCase()}-missing-candidate.svg`);
  const labelX = row.labelPoint[0] - crop.left;
  const labelY = row.labelPoint[1] - crop.top;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="0 0 ${crop.width} ${crop.height}">`,
    `  <image href="${href}" x="0" y="0" width="${crop.width}" height="${crop.height}" />`,
    `  <path d="${xmlEscape(localizePath(row.draftHitPath, crop))}" fill="#f9731630" stroke="#f97316" stroke-width="5" stroke-dasharray="12 8" vector-effect="non-scaling-stroke" />`,
    `  <path d="${xmlEscape(localizePath(row.draftVisualPath, crop))}" fill="#22d3ee25" stroke="#06b6d4" stroke-width="5" vector-effect="non-scaling-stroke" />`,
    `  <circle cx="${formatNumber(labelX)}" cy="${formatNumber(labelY)}" r="10" fill="#f8fafc" stroke="#020617" stroke-width="4" />`,
    `  <text x="16" y="38" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#f8fafc" stroke="#020617" stroke-width="5" paint-order="stroke">${xmlEscape(row.draftId)}</text>`,
    `  <text x="16" y="72" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="#fb923c" stroke="#020617" stroke-width="4" paint-order="stroke">${xmlEscape(row.classification)}</text>`,
    '</svg>',
  ].join('\n');
  await fs.writeFile(svgPath, svg);
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  return {
    cropPng: toFrontendRelative(pngPath),
    cropSvg: toFrontendRelative(svgPath),
  };
}

function buildOverlaySvg({ traceReport, rows, activePolygons, imageHref }) {
  const width = traceReport.source.imageWidth;
  const height = traceReport.source.imageHeight;
  const colorByClassification = {
    MISSING_BLOCK_CANDIDATE: '#f97316',
    ALREADY_COVERED_ACTIVE_SEAT: '#38bdf8',
    P8_CLASSIFIED_NON_SELECTABLE_OR_LABEL_REQUIRED: '#94a3b8',
  };
  const rowsByPriority = [...rows].sort((a, b) => {
    const priority = {
      ALREADY_COVERED_ACTIVE_SEAT: 0,
      P8_CLASSIFIED_NON_SELECTABLE_OR_LABEL_REQUIRED: 1,
      MISSING_BLOCK_CANDIDATE: 2,
    };
    return (priority[a.classification] ?? 0) - (priority[b.classification] ?? 0);
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '  <rect width="100%" height="100%" fill="#020617" />',
    `  <image href="${imageHref}" x="0" y="0" width="${width}" height="${height}" opacity="0.74" />`,
    '  <g fill="none" stroke="#2563eb" stroke-width="5" opacity="0.86" vector-effect="non-scaling-stroke">',
    ...activePolygons.map((block) => `    <path d="${xmlEscape(pointsToPath(block.points))}" />`),
    '  </g>',
    '  <g fill="none" stroke-width="7" vector-effect="non-scaling-stroke">',
    ...rowsByPriority.map((row) => {
      const stroke = colorByClassification[row.classification] ?? '#f8fafc';
      const dash = row.classification === 'MISSING_BLOCK_CANDIDATE' ? ' stroke-dasharray="18 10"' : '';
      return `    <path d="${xmlEscape(row.draftVisualPath)}" stroke="${stroke}"${dash} opacity="0.94" />`;
    }),
    '  </g>',
    '  <g font-family="Arial, sans-serif" font-size="22" font-weight="900" text-anchor="middle" dominant-baseline="middle">',
    ...rowsByPriority
      .filter((row) => row.classification === 'MISSING_BLOCK_CANDIDATE')
      .map((row) => `    <text x="${formatNumber(row.labelPoint[0])}" y="${formatNumber(row.labelPoint[1])}" fill="#fb923c" stroke="#020617" stroke-width="5" paint-order="stroke">${xmlEscape(row.draftId)}</text>`),
    '  </g>',
    '</svg>',
  ].join('\n');
}

async function buildPacket() {
  const traceReport = await readTraceReport();
  const p8ClassifiedIds = await readP8ClassifiedIds();
  const activePolygons = DAEGU_OPERATOR_REFERENCE_BLOCKS.map(blockPolygon);
  const traceComponents = traceReport.components.map((component) => ({
    ...component,
    bounds: {
      minX: component.bounds.minX,
      minY: component.bounds.minY,
      maxX: component.bounds.maxX,
      maxY: component.bounds.maxY,
      width: component.bounds.width,
      height: component.bounds.height,
    },
    visualPolygon: component.visualPolygon,
    labelPoint: component.labelPoint ?? centroid(component.visualPolygon),
  }));

  const rows = traceComponents.map((component) => {
    const match = sampleComponentAgainstBlocks(component, activePolygons);
    const classification = classifyComponent(component, match, p8ClassifiedIds);
    return {
      draftId: component.draftId,
      classification: classification.classification,
      missingReason: classification.missingReason,
      nextAction: classification.nextAction,
      colorClass: component.colorClass,
      area: component.area,
      minX: component.bounds.minX,
      minY: component.bounds.minY,
      maxX: component.bounds.maxX,
      maxY: component.bounds.maxY,
      labelX: component.labelPoint[0],
      labelY: component.labelPoint[1],
      labelPoint: component.labelPoint,
      activeCoverageRatio: Number(match.activeCoverageRatio.toFixed(4)),
      componentSamples: match.componentSamples,
      activeSamples: match.activeSamples,
      topOverlapBlocks: match.overlapBlocks.map((block) => `${block.block}:${formatNumber(block.ratio)}`).join('|'),
      draftVisualPath: component.draftVisualPath,
      draftHitPath: component.draftHitPath,
      riskFlags: [
        'IMAGE_COMPONENT_SCAN',
        'OPERATOR_APPROVAL_REQUIRED',
        ...(classification.classification === 'MISSING_BLOCK_CANDIDATE' ? ['P9_MISSING_BLOCK_CANDIDATE'] : []),
      ],
      cropPng: '',
      cropSvg: '',
    };
  });

  const floatingPolygonRisks = activePolygons.map((block) => {
    const coverage = sampleBlockAgainstComponents(block, traceComponents);
    return {
      sectionId: block.sectionId,
      block: block.block,
      name: block.name,
      componentCoverageRatio: Number(coverage.componentCoverageRatio.toFixed(4)),
      status: coverage.componentCoverageRatio < floatingCoverageThreshold ? 'FLOATING_POLYGON_RISK' : 'IMAGE_COMPONENT_COVERED',
    };
  }).filter((row) => row.status === 'FLOATING_POLYGON_RISK');

  await fs.mkdir(cropDir, { recursive: true });
  const imagePath = path.join(frontendRoot, traceReport.source.imagePath);
  const imageBuffer = await fs.readFile(imagePath);
  const candidateRows = rows.filter((row) => row.classification === 'MISSING_BLOCK_CANDIDATE');
  for (const row of candidateRows.slice(0, maxCropRows)) {
    const crops = await writeCandidateCrop({
      imageBuffer,
      imageWidth: traceReport.source.imageWidth,
      imageHeight: traceReport.source.imageHeight,
      row,
    });
    row.cropPng = crops.cropPng;
    row.cropSvg = crops.cropSvg;
  }

  const relativeImageHref = path.relative(outputDir, imagePath).replaceAll(path.sep, '/');
  const overlaySvg = buildOverlaySvg({
    traceReport,
    rows,
    activePolygons,
    imageHref: relativeImageHref,
  });

  const summary = {
    status: 'p9-missing-scan-packet-ready',
    traceComponentCount: traceComponents.length,
    activeSelectableSeatCount: activePolygons.length,
    p8ClassifiedRows: p8ClassifiedIds.size,
    missingCandidateRows: candidateRows.length,
    alreadyCoveredRows: rows.filter((row) => row.classification === 'ALREADY_COVERED_ACTIVE_SEAT').length,
    p8ExcludedRows: rows.filter((row) => row.classification === 'P8_CLASSIFIED_NON_SELECTABLE_OR_LABEL_REQUIRED').length,
    floatingPolygonRiskRows: floatingPolygonRisks.length,
    activeCoverageThreshold,
    floatingCoverageThreshold,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };

  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      traceReport: 'reports/stadium/daegu-operator-reference-trace/daegu-operator-reference-trace.json',
      p8Gate: 'reports/stadium/daegu-operator-reference-p8-classification/gate/daegu-operator-reference-p8-classification-gate.json',
      referenceImage: traceReport.source.imagePath,
      viewBox: traceReport.source.viewBox,
      imageSha256: traceReport.source.imageSha256,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      operatorApprovalRequired: true,
      note: 'P9 scans the 4096 operator reference image components and compares them with the current active selectable polygons. It does not add selectable seat polygons.',
    },
    summary,
    rows,
    floatingPolygonRisks,
    outputs: {
      packetCsv: toFrontendRelative(packetCsvPath),
      packetMd: toFrontendRelative(packetMdPath),
      operatorInputJson: toFrontendRelative(operatorInputJsonPath),
      operatorInputCsv: toFrontendRelative(operatorInputCsvPath),
      overlaySvg: toFrontendRelative(overlaySvgPath),
      overlayPng: toFrontendRelative(overlayPngPath),
      cropDir: toFrontendRelative(cropDir),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(operatorInputDir, { recursive: true });
  await fs.writeFile(packetJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(packetCsvPath, buildCsv(rows, [
    'draftId',
    'classification',
    'missingReason',
    'nextAction',
    'colorClass',
    'area',
    'minX',
    'minY',
    'maxX',
    'maxY',
    'labelX',
    'labelY',
    'activeCoverageRatio',
    'topOverlapBlocks',
    'riskFlags',
    'cropPng',
  ]));
  await fs.writeFile(operatorInputJsonPath, `${JSON.stringify({
    status: 'p9-missing-scan-operator-input-ready',
    generatedAt: payload.generatedAt,
    policy: payload.policy,
    rows: candidateRows.map((row) => ({
      draftId: row.draftId,
      suggestedBlockName: '',
      existingSectionId: '',
      classification: row.classification,
      decisionType: 'PENDING_OPERATOR_LABEL',
      operatorDecision: 'PENDING',
      reviewer: '',
      reviewedAt: '',
      correctedPath: '',
      correctedHitPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      notes: row.missingReason,
    })),
  }, null, 2)}\n`);
  await fs.writeFile(operatorInputCsvPath, buildCsv(candidateRows, [
    'draftId',
    'classification',
    'missingReason',
    'nextAction',
    'colorClass',
    'area',
    'minX',
    'minY',
    'maxX',
    'maxY',
    'labelX',
    'labelY',
    'activeCoverageRatio',
    'cropPng',
  ]));
  await fs.writeFile(overlaySvgPath, overlaySvg);
  await sharp(Buffer.from(overlaySvg)).png().toFile(overlayPngPath);
  await fs.writeFile(packetMdPath, [
    '# 대구 operator reference P9 missing block scan',
    '',
    `- status: \`${payload.status}\``,
    `- trace components: \`${summary.traceComponentCount}\``,
    `- active selectable seats: \`${summary.activeSelectableSeatCount}\``,
    `- P8 classified rows: \`${summary.p8ClassifiedRows}\``,
    `- missing candidates: \`${summary.missingCandidateRows}\``,
    `- already covered rows: \`${summary.alreadyCoveredRows}\``,
    `- P8 excluded rows: \`${summary.p8ExcludedRows}\``,
    `- floating polygon risks: \`${summary.floatingPolygonRiskRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Outputs',
    '',
    `- packet JSON: \`${toFrontendRelative(packetJsonPath)}\``,
    `- packet CSV: \`${toFrontendRelative(packetCsvPath)}\``,
    `- operator input JSON: \`${toFrontendRelative(operatorInputJsonPath)}\``,
    `- overlay PNG: \`${toFrontendRelative(overlayPngPath)}\``,
    `- crop dir: \`${toFrontendRelative(cropDir)}\``,
    '',
    '## Missing Candidates',
    '',
    ...candidateRows.map((row) => `- \`${row.draftId}\` ${row.colorClass} area=${row.area} coverage=${row.activeCoverageRatio} next=\`${row.nextAction}\` crop=\`${row.cropPng || 'not-generated'}\``),
    '',
  ].join('\n'));

  return payload;
}

async function runGate() {
  const packet = await readJson(packetJsonPath);
  const input = await readJson(operatorInputJsonPath);
  const packetRows = packet.rows ?? [];
  const inputRows = input.rows ?? [];
  const candidateRows = packetRows.filter((row) => row.classification === 'MISSING_BLOCK_CANDIDATE');
  const validations = candidateRows.map((row) => {
    const inputRow = inputRows.find((candidate) => candidate.draftId === row.draftId);
    const failures = [];
    if (!inputRow) failures.push('MISSING_OPERATOR_INPUT_ROW');
    if (!row.missingReason) failures.push('MISSING_REASON_REQUIRED');
    if (row.nextAction !== 'OPERATOR_LABEL_REQUIRED_BEFORE_SELECTABLE_SEAT') failures.push('NEXT_ACTION_MUST_REQUIRE_OPERATOR_LABEL');
    if (inputRow?.operatorDecision !== 'PENDING') failures.push('P9_MUST_KEEP_OPERATOR_DECISION_PENDING');
    if (inputRow?.correctedPath || inputRow?.correctedHitPath) failures.push('P9_MUST_NOT_PREPOPULATE_CORRECTED_GEOMETRY');
    return {
      draftId: row.draftId,
      classification: row.classification,
      activeCoverageRatio: row.activeCoverageRatio,
      validationStatus: failures.length ? 'INVALID' : 'PENDING_OPERATOR_LABEL',
      failures: failures.join('|'),
    };
  });
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const summary = {
    status: invalidRows.length === 0 && candidateRows.length > 0 ? 'p9-missing-scan-gate-passed' : 'p9-missing-scan-gate-blocked',
    traceComponentCount: packet.summary?.traceComponentCount ?? 0,
    activeSelectableSeatCount: packet.summary?.activeSelectableSeatCount ?? 0,
    missingCandidateRows: candidateRows.length,
    pendingOperatorLabelRows: validations.filter((row) => row.validationStatus === 'PENDING_OPERATOR_LABEL').length,
    invalidRows: invalidRows.length,
    p8ExcludedRows: packet.summary?.p8ExcludedRows ?? 0,
    alreadyCoveredRows: packet.summary?.alreadyCoveredRows ?? 0,
    floatingPolygonRiskRows: packet.summary?.floatingPolygonRiskRows ?? 0,
    readyForOperatorLabeling: invalidRows.length === 0 && candidateRows.length > 0,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };

  if (requireCandidates && !summary.readyForOperatorLabeling) {
    throw new Error(`P9 missing scan gate failed: missingCandidateRows=${summary.missingCandidateRows} invalidRows=${summary.invalidRows}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'draftId',
    'classification',
    'activeCoverageRatio',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P9 missing scan gate',
    '',
    `- status: \`${summary.status}\``,
    `- trace components: \`${summary.traceComponentCount}\``,
    `- active selectable seats: \`${summary.activeSelectableSeatCount}\``,
    `- missing candidates: \`${summary.missingCandidateRows}\``,
    `- pending operator label rows: \`${summary.pendingOperatorLabelRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- P8 excluded rows: \`${summary.p8ExcludedRows}\``,
    `- already covered rows: \`${summary.alreadyCoveredRows}\``,
    `- floating polygon risks: \`${summary.floatingPolygonRiskRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} missingCandidateRows=${summary.missingCandidateRows} invalidRows=${summary.invalidRows}`);
}

if (task === 'packet') {
  const payload = await buildPacket();
  console.log(`status:${payload.status} traceComponents=${payload.summary.traceComponentCount} missingCandidateRows=${payload.summary.missingCandidateRows}`);
} else if (task === 'gate') {
  await runGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
