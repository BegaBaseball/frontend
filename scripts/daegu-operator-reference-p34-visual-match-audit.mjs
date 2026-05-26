import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  DAEGU_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
  isDaeguOperatorReferenceSelectableSeat,
} from '../src/data/daeguSeatData.ts';
import {
  pathToPoints,
  pointInPolygon,
  polygonArea,
  validateSeatMapPolygonPath,
} from '../src/utils/seatMapPolygonValidator.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const traceJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-trace/daegu-operator-reference-trace.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p34-visual-match-audit');
const cropDir = path.join(outputDir, 'block-crops');
const gateDir = path.join(outputDir, 'gate');
const auditJsonPath = path.join(outputDir, 'daegu-operator-reference-p34-visual-match-audit.json');
const auditCsvPath = path.join(outputDir, 'daegu-operator-reference-p34-visual-match-audit.csv');
const auditMdPath = path.join(outputDir, 'daegu-operator-reference-p34-visual-match-audit.md');
const overlaySvgPath = path.join(outputDir, 'daegu-operator-reference-p34-visual-match-overlay.svg');
const overlayPngPath = path.join(outputDir, 'daegu-operator-reference-p34-visual-match-overlay.png');
const contactSheetPath = path.join(outputDir, 'daegu-operator-reference-p34-risk-contact-sheet.png');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p34-visual-match-audit-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p34-visual-match-audit-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p34-visual-match-audit-gate.md');

const task = process.argv[2] ?? 'audit';
const requireAudited = process.argv.includes('--require-audited');
const sampleStep = Number(process.env.DAEGU_OPERATOR_REFERENCE_P34_SAMPLE_STEP ?? 10);
const cropPadding = Number(process.env.DAEGU_OPERATOR_REFERENCE_P34_CROP_PADDING ?? 120);
const colorCoverageThreshold = Number(process.env.DAEGU_OPERATOR_REFERENCE_P34_COLOR_COVERAGE_THRESHOLD ?? 0.35);
const overlapThreshold = Number(process.env.DAEGU_OPERATOR_REFERENCE_P34_OVERLAP_THRESHOLD ?? 0.08);
const hitAreaMaxRatio = Number(process.env.DAEGU_OPERATOR_REFERENCE_P34_HIT_AREA_MAX_RATIO ?? 1.65);
const maxContactSheetRows = Number(process.env.DAEGU_OPERATOR_REFERENCE_P34_MAX_CONTACT_ROWS ?? 80);

const sourceContractLiterals = [
  'P34 audits all 131 operator-reference selectable polygons against the 4096 image component scan.',
  'PASS_VISUAL_MATCH_CANDIDATE',
  'LOW_COLOR_COVERAGE',
  'OVERLAP_REVIEW_REQUIRED',
  'LABEL_POINT_OUTSIDE',
  'HITPATH_TOO_LARGE',
  'BOUNDS_OR_SELF_INTERSECTION_INVALID',
  'MANUAL_RETRACE_REQUIRED',
  'PASS_VISUAL_MATCH_FORBIDDEN_WHILE_BLOCKERS_REMAIN',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p34-visual-match-audit-ready',
  'p34-visual-match-audit-gate-passed',
];

void sourceContractLiterals;

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
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

function xmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

function safeFileName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
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

function unionBounds(boundsList) {
  return {
    minX: Math.min(...boundsList.map((bounds) => bounds.minX)),
    minY: Math.min(...boundsList.map((bounds) => bounds.minY)),
    maxX: Math.max(...boundsList.map((bounds) => bounds.maxX)),
    maxY: Math.max(...boundsList.map((bounds) => bounds.maxY)),
  };
}

function boundsOverlap(first, second) {
  return first.minX <= second.maxX
    && first.maxX >= second.minX
    && first.minY <= second.maxY
    && first.maxY >= second.minY;
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

function cropForBounds(bounds, imageWidth, imageHeight) {
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

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] || 'UNCLASSIFIED';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function blockToPolygon(block) {
  const visualPath = block.imageGeometry.visualPath ?? block.imageGeometry.d;
  const hitPath = block.imageGeometry.hitPath ?? visualPath;
  const visualPoints = pathToPoints(visualPath);
  const hitPoints = pathToPoints(hitPath);
  const labelPoint = block.imageGeometry.labelPoint ?? [block.imageGeometry.labelX, block.imageGeometry.labelY];
  return {
    sectionId: block.id,
    block: block.block,
    name: block.name,
    category: block.category,
    level: block.level,
    side: block.side,
    geometryVersion: block.imageGeometry.geometryVersion,
    traceVersion: block.imageGeometry.traceVersion,
    visualPath,
    hitPath,
    labelPoint,
    visualPoints,
    hitPoints,
    visualBounds: boundsFromPoints(visualPoints),
    hitBounds: boundsFromPoints(hitPoints),
    visualArea: polygonArea(visualPoints),
    hitArea: polygonArea(hitPoints),
  };
}

function normalizeTraceComponents(traceReport) {
  return (traceReport.components ?? []).map((component) => ({
    draftId: component.draftId,
    colorClass: component.colorClass,
    points: component.visualPolygon,
    pathData: component.draftVisualPath,
    bounds: {
      minX: component.bounds.minX,
      minY: component.bounds.minY,
      maxX: component.bounds.maxX,
      maxY: component.bounds.maxY,
    },
    area: component.area,
  }));
}

function sampleBlockAgainstComponents(block, components, neighborBlocks) {
  const componentCandidates = components.filter((component) => boundsOverlap(block.visualBounds, component.bounds));
  const neighborCandidates = neighborBlocks.filter((neighbor) => (
    neighbor.sectionId !== block.sectionId && boundsOverlap(block.visualBounds, neighbor.visualBounds)
  ));
  const componentCounts = new Map();
  const overlapCounts = new Map();
  let visualSamples = 0;
  let componentSamples = 0;
  let overlapSamples = 0;

  for (let y = block.visualBounds.minY; y <= block.visualBounds.maxY; y += sampleStep) {
    for (let x = block.visualBounds.minX; x <= block.visualBounds.maxX; x += sampleStep) {
      const point = [x + sampleStep / 2, y + sampleStep / 2];
      if (!pointInPolygon(point, block.visualPoints)) continue;
      visualSamples += 1;

      const component = componentCandidates.find((candidate) => (
        boundsOverlap({ minX: point[0], minY: point[1], maxX: point[0], maxY: point[1] }, candidate.bounds)
        && pointInPolygon(point, candidate.points)
      ));
      if (component) {
        componentSamples += 1;
        componentCounts.set(component.draftId, (componentCounts.get(component.draftId) ?? 0) + 1);
      }

      const overlap = neighborCandidates.find((candidate) => pointInPolygon(point, candidate.visualPoints));
      if (overlap) {
        overlapSamples += 1;
        overlapCounts.set(overlap.sectionId, (overlapCounts.get(overlap.sectionId) ?? 0) + 1);
      }
    }
  }

  const topComponents = [...componentCounts.entries()]
    .map(([draftId, samples]) => {
      const component = components.find((candidate) => candidate.draftId === draftId);
      return {
        draftId,
        colorClass: component?.colorClass ?? '',
        samples,
        ratio: visualSamples ? samples / visualSamples : 0,
        pathData: component?.pathData ?? '',
      };
    })
    .sort((a, b) => b.samples - a.samples);
  const topOverlaps = [...overlapCounts.entries()]
    .map(([sectionId, samples]) => {
      const neighbor = neighborBlocks.find((candidate) => candidate.sectionId === sectionId);
      return {
        sectionId,
        block: neighbor?.block ?? '',
        name: neighbor?.name ?? '',
        samples,
        ratio: visualSamples ? samples / visualSamples : 0,
      };
    })
    .sort((a, b) => b.samples - a.samples);

  return {
    visualSamples,
    componentSamples,
    colorCoverageRatio: visualSamples ? componentSamples / visualSamples : 0,
    overlapSamples,
    overlapRatio: visualSamples ? overlapSamples / visualSamples : 0,
    topComponents,
    topOverlaps,
  };
}

function resolveFlags({ block, measurement, imageWidth, imageHeight }) {
  const visualIssues = validateSeatMapPolygonPath({
    pathData: block.visualPath,
    width: imageWidth,
    height: imageHeight,
    minPointCount: 3,
    labelPoint: block.labelPoint,
    labelTolerance: 2,
  });
  const hitIssues = validateSeatMapPolygonPath({
    pathData: block.hitPath,
    width: imageWidth,
    height: imageHeight,
    minPointCount: 3,
  });
  const blockerFlags = [];
  const reviewFlags = [];

  if (visualIssues.some((issue) => ['SINGLE_CLOSED_MLZ_PATH_REQUIRED', 'MIN_POINT_COUNT_REQUIRED', 'NON_ZERO_AREA_REQUIRED', 'SELF_INTERSECTION', 'POINT_OUT_OF_BOUNDS'].includes(issue))
    || hitIssues.some((issue) => ['SINGLE_CLOSED_MLZ_PATH_REQUIRED', 'MIN_POINT_COUNT_REQUIRED', 'NON_ZERO_AREA_REQUIRED', 'SELF_INTERSECTION', 'POINT_OUT_OF_BOUNDS'].includes(issue))) {
    blockerFlags.push('BOUNDS_OR_SELF_INTERSECTION_INVALID');
  }
  if (visualIssues.includes('LABEL_OUTSIDE_POLYGON') || visualIssues.includes('LABEL_OUT_OF_BOUNDS')) {
    blockerFlags.push('LABEL_POINT_OUTSIDE');
  }
  if (measurement.visualSamples === 0) {
    blockerFlags.push('MANUAL_RETRACE_REQUIRED');
  }
  if (measurement.colorCoverageRatio === 0) {
    blockerFlags.push('NO_COMPONENT_MATCH');
  } else if (measurement.colorCoverageRatio < colorCoverageThreshold) {
    blockerFlags.push('LOW_COLOR_COVERAGE');
  }
  if (measurement.overlapRatio > overlapThreshold) {
    blockerFlags.push('OVERLAP_REVIEW_REQUIRED');
  }

  const hitAreaRatio = block.visualArea > 0 ? block.hitArea / block.visualArea : 0;
  if (hitAreaRatio > hitAreaMaxRatio) {
    reviewFlags.push('HITPATH_TOO_LARGE');
  }
  if (measurement.topComponents.length > 1 && measurement.topComponents[1].ratio > 0.2) {
    reviewFlags.push('MULTIPLE_COMPONENTS_IN_POLYGON');
  }

  const visualMatchStatus = blockerFlags.length > 0
    ? 'MANUAL_RETRACE_REQUIRED'
    : reviewFlags.length > 0
      ? 'REVIEW_REQUIRED'
      : 'PASS_VISUAL_MATCH_CANDIDATE';

  return {
    visualIssues,
    hitIssues,
    blockerFlags,
    reviewFlags,
    hitAreaRatio,
    visualMatchStatus,
  };
}

async function writeCrop({ block, row, component, imageBuffer, imageWidth, imageHeight }) {
  const cropBounds = unionBounds([block.visualBounds, block.hitBounds]);
  const crop = cropForBounds(cropBounds, imageWidth, imageHeight);
  const cropBuffer = await sharp(imageBuffer).extract(crop).png().toBuffer();
  const href = `data:image/png;base64,${cropBuffer.toString('base64')}`;
  const safeId = safeFileName(`${block.block}-${block.sectionId}`);
  const pngPath = path.join(cropDir, `${safeId}-visual-match.png`);
  const svgPath = path.join(cropDir, `${safeId}-visual-match.svg`);
  const labelX = block.labelPoint[0] - crop.left;
  const labelY = block.labelPoint[1] - crop.top;
  const statusColor = row.visualMatchStatus === 'PASS_VISUAL_MATCH_CANDIDATE'
    ? '#22c55e'
    : row.visualMatchStatus === 'REVIEW_REQUIRED'
      ? '#eab308'
      : '#ef4444';
  const componentPath = component?.pathData ? localizePath(component.pathData, crop) : '';
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="0 0 ${crop.width} ${crop.height}">`,
    `  <image href="${href}" x="0" y="0" width="${crop.width}" height="${crop.height}" />`,
    componentPath
      ? `  <path d="${xmlEscape(componentPath)}" fill="#22c55e18" stroke="#22c55e" stroke-width="5" stroke-dasharray="14 8" vector-effect="non-scaling-stroke" />`
      : '',
    `  <path d="${xmlEscape(localizePath(block.hitPath, crop))}" fill="#f9731624" stroke="#f97316" stroke-width="5" stroke-dasharray="12 8" vector-effect="non-scaling-stroke" />`,
    `  <path d="${xmlEscape(localizePath(block.visualPath, crop))}" fill="#0ea5e933" stroke="${statusColor}" stroke-width="6" vector-effect="non-scaling-stroke" />`,
    `  <circle cx="${formatNumber(labelX)}" cy="${formatNumber(labelY)}" r="11" fill="#f8fafc" stroke="#020617" stroke-width="5" />`,
    '  <rect x="0" y="0" width="100%" height="88" fill="#020617" opacity="0.84" />',
    `  <text x="18" y="34" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#f8fafc">${xmlEscape(block.block)} · ${xmlEscape(block.name)}</text>`,
    `  <text x="18" y="70" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="${statusColor}">${xmlEscape(row.visualMatchStatus)} color=${formatNumber(row.colorCoverageRatio)} overlap=${formatNumber(row.overlapRatio)}</text>`,
    '</svg>',
  ].filter(Boolean).join('\n');
  await fs.writeFile(svgPath, svg);
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  return {
    cropPng: toFrontendRelative(pngPath),
    cropSvg: toFrontendRelative(svgPath),
  };
}

function buildOverlaySvg({ imageHref, imageWidth, imageHeight, rows }) {
  const colorByStatus = {
    PASS_VISUAL_MATCH_CANDIDATE: '#22c55e',
    REVIEW_REQUIRED: '#eab308',
    MANUAL_RETRACE_REQUIRED: '#ef4444',
  };
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}" viewBox="0 0 ${imageWidth} ${imageHeight}">`,
    '  <rect width="100%" height="100%" fill="#020617" />',
    `  <image href="${imageHref}" x="0" y="0" width="${imageWidth}" height="${imageHeight}" opacity="0.72" />`,
    '  <g fill="none" stroke-width="5" vector-effect="non-scaling-stroke">',
    ...rows.map((row) => `    <path d="${xmlEscape(row.visualPath)}" stroke="${colorByStatus[row.visualMatchStatus] ?? '#f8fafc'}" opacity="0.92" />`),
    '  </g>',
    '  <g font-family="Arial, sans-serif" font-size="26" font-weight="900" text-anchor="middle" dominant-baseline="middle">',
    ...rows
      .filter((row) => row.visualMatchStatus !== 'PASS_VISUAL_MATCH_CANDIDATE')
      .map((row) => `    <text x="${formatNumber(row.labelX)}" y="${formatNumber(row.labelY)}" fill="${colorByStatus[row.visualMatchStatus] ?? '#f8fafc'}" stroke="#020617" stroke-width="6" paint-order="stroke">${xmlEscape(row.block)}</text>`),
    '  </g>',
    '</svg>',
  ].join('\n');
}

async function buildContactSheet(rows) {
  const rowsForSheet = rows
    .filter((row) => row.visualMatchStatus !== 'PASS_VISUAL_MATCH_CANDIDATE')
    .slice(0, maxContactSheetRows);
  if (rowsForSheet.length === 0) {
    await sharp({
      create: {
        width: 900,
        height: 180,
        channels: 4,
        background: '#020617',
      },
    }).composite([{
      input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="180"><text x="40" y="105" font-family="Arial" font-size="40" font-weight="900" fill="#22c55e">No P34 risk rows</text></svg>'),
      left: 0,
      top: 0,
    }]).png().toFile(contactSheetPath);
    return;
  }

  const tileWidth = 360;
  const tileHeight = 300;
  const columns = 5;
  const rowsPerSheet = Math.ceil(rowsForSheet.length / columns);
  const composites = [];

  for (let index = 0; index < rowsForSheet.length; index += 1) {
    const row = rowsForSheet[index];
    const crop = await sharp(path.join(frontendRoot, row.cropPng))
      .resize({ width: tileWidth, height: tileHeight, fit: 'inside', background: '#111827' })
      .png()
      .toBuffer();
    const metadata = await sharp(crop).metadata();
    const header = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${tileWidth}" height="${tileHeight}">`,
      '<rect width="100%" height="42" fill="#020617" opacity="0.92" />',
      '<rect y="42" width="100%" height="30" fill="#ef4444" opacity="0.78" />',
      `<text x="10" y="29" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#f8fafc">${xmlEscape(row.block)} ${xmlEscape(row.sectionId)}</text>`,
      `<text x="10" y="64" font-family="Arial, sans-serif" font-size="15" font-weight="900" fill="#020617">${xmlEscape(row.blockerFlags || row.reviewFlags || row.visualMatchStatus)}</text>`,
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

async function writeAudit() {
  const traceReport = await readJson(traceJsonPath);
  const imageWidth = traceReport.source.imageWidth;
  const imageHeight = traceReport.source.imageHeight;
  const imagePath = path.join(frontendRoot, traceReport.source.imagePath);
  const imageBuffer = await fs.readFile(imagePath);
  const components = normalizeTraceComponents(traceReport);
  const activeBlocks = DAEGU_OPERATOR_REFERENCE_BLOCKS
    .filter(isDaeguOperatorReferenceSelectableSeat)
    .map(blockToPolygon);

  const rows = [];
  await fs.mkdir(cropDir, { recursive: true });
  for (const block of activeBlocks) {
    const measurement = sampleBlockAgainstComponents(block, components, activeBlocks);
    const flags = resolveFlags({ block, measurement, imageWidth, imageHeight });
    const topComponent = measurement.topComponents[0];
    const row = {
      sectionId: block.sectionId,
      block: block.block,
      name: block.name,
      category: block.category,
      level: block.level,
      side: block.side,
      geometryVersion: block.geometryVersion,
      traceVersion: block.traceVersion,
      visualMatchStatus: flags.visualMatchStatus,
      blockerFlags: flags.blockerFlags.join('|'),
      reviewFlags: flags.reviewFlags.join('|'),
      visualIssues: flags.visualIssues.join('|'),
      hitIssues: flags.hitIssues.join('|'),
      visualArea: Number(block.visualArea.toFixed(2)),
      hitArea: Number(block.hitArea.toFixed(2)),
      hitAreaRatio: Number(flags.hitAreaRatio.toFixed(4)),
      visualSamples: measurement.visualSamples,
      componentSamples: measurement.componentSamples,
      colorCoverageRatio: Number(measurement.colorCoverageRatio.toFixed(4)),
      overlapSamples: measurement.overlapSamples,
      overlapRatio: Number(measurement.overlapRatio.toFixed(4)),
      topComponentDraftId: topComponent?.draftId ?? '',
      topComponentColorClass: topComponent?.colorClass ?? '',
      topComponentRatio: Number((topComponent?.ratio ?? 0).toFixed(4)),
      topOverlapBlocks: measurement.topOverlaps.map((overlap) => `${overlap.block}:${formatNumber(overlap.ratio)}`).join('|'),
      labelX: block.labelPoint[0],
      labelY: block.labelPoint[1],
      visualPath: block.visualPath,
      hitPath: block.hitPath,
      cropPng: '',
      cropSvg: '',
    };
    const crop = await writeCrop({
      block,
      row,
      component: components.find((component) => component.draftId === row.topComponentDraftId),
      imageBuffer,
      imageWidth,
      imageHeight,
    });
    row.cropPng = crop.cropPng;
    row.cropSvg = crop.cropSvg;
    rows.push(row);
  }

  const imageHref = path.relative(outputDir, imagePath).replaceAll(path.sep, '/');
  const overlaySvg = buildOverlaySvg({ imageHref, imageWidth, imageHeight, rows });
  await fs.writeFile(overlaySvgPath, overlaySvg);
  await sharp(Buffer.from(overlaySvg)).png().toFile(overlayPngPath);
  await buildContactSheet(rows);

  const blockerRows = rows.filter((row) => row.visualMatchStatus === 'MANUAL_RETRACE_REQUIRED');
  const reviewRows = rows.filter((row) => row.visualMatchStatus === 'REVIEW_REQUIRED');
  const passRows = rows.filter((row) => row.visualMatchStatus === 'PASS_VISUAL_MATCH_CANDIDATE');
  const summary = {
    status: 'p34-visual-match-audit-ready',
    traceComponents: components.length,
    auditedSelectableRows: rows.length,
    expectedSelectableRows: 131,
    officialDatasetBlocks: DAEGU_BLOCKS.length,
    passVisualMatchCandidateRows: passRows.length,
    reviewRequiredRows: reviewRows.length,
    manualRetraceRequiredRows: blockerRows.length,
    lowColorCoverageRows: rows.filter((row) => row.blockerFlags.includes('LOW_COLOR_COVERAGE')).length,
    overlapReviewRows: rows.filter((row) => row.blockerFlags.includes('OVERLAP_REVIEW_REQUIRED')).length,
    labelPointOutsideRows: rows.filter((row) => row.blockerFlags.includes('LABEL_POINT_OUTSIDE')).length,
    hitPathTooLargeRows: rows.filter((row) => row.reviewFlags.includes('HITPATH_TOO_LARGE')).length,
    visualMatchReady: blockerRows.length === 0 && reviewRows.length === 0,
    passVisualMatchForbiddenWhileBlockersRemain: blockerRows.length > 0 || reviewRows.length > 0,
    statusCounts: countBy(rows, 'visualMatchStatus'),
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      traceReport: toFrontendRelative(traceJsonPath),
      referenceImage: traceReport.source.imagePath,
      viewBox: traceReport.source.viewBox,
      imageSha256: traceReport.source.imageSha256,
      sampleStep,
      colorCoverageThreshold,
      overlapThreshold,
      hitAreaMaxRatio,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      note: 'P34 audits all 131 operator-reference selectable polygons against the 4096 image component scan. It does not add or modify selectable seat polygons. PASS_VISUAL_MATCH_FORBIDDEN_WHILE_BLOCKERS_REMAIN.',
    },
    summary,
    rows,
    nextBatchCandidates: rows
      .filter((row) => row.visualMatchStatus !== 'PASS_VISUAL_MATCH_CANDIDATE')
      .map((row) => ({
        sectionId: row.sectionId,
        block: row.block,
        name: row.name,
        visualMatchStatus: row.visualMatchStatus,
        blockerFlags: row.blockerFlags,
        reviewFlags: row.reviewFlags,
        colorCoverageRatio: row.colorCoverageRatio,
        overlapRatio: row.overlapRatio,
        cropPng: row.cropPng,
        nextAction: 'P35_OPERATOR_RETRACE_BATCH_CANDIDATE',
      })),
    outputs: {
      auditJson: toFrontendRelative(auditJsonPath),
      auditCsv: toFrontendRelative(auditCsvPath),
      auditMd: toFrontendRelative(auditMdPath),
      overlayPng: toFrontendRelative(overlayPngPath),
      contactSheet: toFrontendRelative(contactSheetPath),
      cropDir: toFrontendRelative(cropDir),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(auditJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(auditCsvPath, buildCsv(rows, [
    'sectionId',
    'block',
    'name',
    'category',
    'level',
    'side',
    'visualMatchStatus',
    'blockerFlags',
    'reviewFlags',
    'visualIssues',
    'hitIssues',
    'colorCoverageRatio',
    'overlapRatio',
    'topComponentDraftId',
    'topComponentColorClass',
    'topComponentRatio',
    'topOverlapBlocks',
    'hitAreaRatio',
    'cropPng',
  ]));
  await fs.writeFile(auditMdPath, [
    '# 대구 operator reference P34 visual match audit',
    '',
    `- status: \`${summary.status}\``,
    `- trace components: \`${summary.traceComponents}\``,
    `- audited selectable rows: \`${summary.auditedSelectableRows}\``,
    `- expected selectable rows: \`${summary.expectedSelectableRows}\``,
    `- official dataset blocks: \`${summary.officialDatasetBlocks}\``,
    `- pass visual match candidate rows: \`${summary.passVisualMatchCandidateRows}\``,
    `- review required rows: \`${summary.reviewRequiredRows}\``,
    `- manual retrace required rows: \`${summary.manualRetraceRequiredRows}\``,
    `- low color coverage rows: \`${summary.lowColorCoverageRows}\``,
    `- overlap review rows: \`${summary.overlapReviewRows}\``,
    `- label point outside rows: \`${summary.labelPointOutsideRows}\``,
    `- hitPath too large rows: \`${summary.hitPathTooLargeRows}\``,
    `- visual match ready: \`${summary.visualMatchReady}\``,
    `- PASS_VISUAL_MATCH forbidden while blockers remain: \`${summary.passVisualMatchForbiddenWhileBlockersRemain}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Outputs',
    '',
    `- overlay: \`${toFrontendRelative(overlayPngPath)}\``,
    `- contact sheet: \`${toFrontendRelative(contactSheetPath)}\``,
    `- crop dir: \`${toFrontendRelative(cropDir)}\``,
    '',
    '## Next Batch Candidates',
    '',
    payload.nextBatchCandidates.length > 0
      ? payload.nextBatchCandidates.map((row) => `- \`${row.block}\` ${row.visualMatchStatus} flags=\`${row.blockerFlags || row.reviewFlags}\` color=${row.colorCoverageRatio} overlap=${row.overlapRatio} crop=\`${row.cropPng}\``).join('\n')
      : '- none',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} auditedRows=${summary.auditedSelectableRows} passCandidates=${summary.passVisualMatchCandidateRows} reviewRequired=${summary.reviewRequiredRows} manualRetrace=${summary.manualRetraceRequiredRows} visualMatchReady=${summary.visualMatchReady}`);
  return payload;
}

async function writeGate() {
  let audit;
  try {
    audit = await readJson(auditJsonPath);
  } catch {
    audit = await writeAudit();
  }

  const failures = [];
  if (audit.summary?.auditedSelectableRows !== 131) failures.push('AUDITED_SELECTABLE_ROWS_NOT_131');
  if ((audit.rows ?? []).length !== 131) failures.push('AUDIT_ROWS_NOT_131');
  if ((audit.rows ?? []).some((row) => !row.cropPng || !row.cropSvg)) failures.push('MISSING_CROP_EVIDENCE');
  if (audit.summary?.productionWriteAllowed !== false) failures.push('PRODUCTION_WRITE_MUST_BE_FALSE');
  if (audit.summary?.sourceDataWritePerformed !== false) failures.push('SOURCE_WRITE_MUST_BE_FALSE');

  const validations = [
    {
      rowId: 'AUDITED_SELECTABLE_ROWS_131',
      validationStatus: audit.summary?.auditedSelectableRows === 131 ? 'PASS' : 'INVALID',
      failures: audit.summary?.auditedSelectableRows === 131 ? '' : 'AUDITED_SELECTABLE_ROWS_NOT_131',
    },
    {
      rowId: 'CROP_EVIDENCE_EXISTS',
      validationStatus: (audit.rows ?? []).every((row) => row.cropPng && row.cropSvg) ? 'PASS' : 'INVALID',
      failures: (audit.rows ?? []).every((row) => row.cropPng && row.cropSvg) ? '' : 'MISSING_CROP_EVIDENCE',
    },
    {
      rowId: 'PASS_VISUAL_MATCH_POLICY',
      validationStatus: audit.summary?.visualMatchReady ? 'PASS' : 'REVIEW_REQUIRED',
      failures: audit.summary?.visualMatchReady ? '' : 'PASS_VISUAL_MATCH_FORBIDDEN_WHILE_BLOCKERS_REMAIN',
    },
    {
      rowId: 'NO_SOURCE_WRITE',
      validationStatus: audit.summary?.productionWriteAllowed === false && audit.summary?.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: audit.summary?.productionWriteAllowed === false && audit.summary?.sourceDataWritePerformed === false ? '' : 'WRITE_POLICY_BROKEN',
    },
  ];
  const summary = {
    status: failures.length === 0 ? 'p34-visual-match-audit-gate-passed' : 'p34-visual-match-audit-gate-blocked',
    failures,
    auditedSelectableRows: audit.summary?.auditedSelectableRows ?? 0,
    passVisualMatchCandidateRows: audit.summary?.passVisualMatchCandidateRows ?? 0,
    reviewRequiredRows: audit.summary?.reviewRequiredRows ?? 0,
    manualRetraceRequiredRows: audit.summary?.manualRetraceRequiredRows ?? 0,
    nextBatchCandidateRows: audit.nextBatchCandidates?.length ?? 0,
    visualMatchReady: audit.summary?.visualMatchReady === true,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };

  if (requireAudited && failures.length > 0) {
    throw new Error(`P34 visual match audit gate failed: ${failures.join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P34 visual match audit gate',
    '',
    `- status: \`${summary.status}\``,
    `- audited selectable rows: \`${summary.auditedSelectableRows}\``,
    `- pass visual match candidate rows: \`${summary.passVisualMatchCandidateRows}\``,
    `- review required rows: \`${summary.reviewRequiredRows}\``,
    `- manual retrace required rows: \`${summary.manualRetraceRequiredRows}\``,
    `- next batch candidate rows: \`${summary.nextBatchCandidateRows}\``,
    `- visual match ready: \`${summary.visualMatchReady}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} auditedRows=${summary.auditedSelectableRows} nextBatchCandidates=${summary.nextBatchCandidateRows} visualMatchReady=${summary.visualMatchReady}`);
}

if (task === 'audit') {
  await writeAudit();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
