import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { DAEGU_BLOCKS } from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const traceDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-trace');
const traceJsonPath = path.join(traceDir, 'daegu-operator-reference-trace.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-review');
const contactSheetDir = path.join(outputDir, 'contact-sheets');
const mappingCsvPath = path.join(outputDir, 'daegu-operator-reference-mapping-template.csv');
const mappingJsonPath = path.join(outputDir, 'daegu-operator-reference-mapping-template.json');
const existingBlockCsvPath = path.join(outputDir, 'daegu-existing-block-inventory.csv');
const reviewMdPath = path.join(outputDir, 'daegu-operator-reference-review-packet.md');

const pageColumns = Number(process.env.DAEGU_OPERATOR_REFERENCE_REVIEW_COLUMNS ?? 4);
const pageRows = Number(process.env.DAEGU_OPERATOR_REFERENCE_REVIEW_ROWS ?? 5);
const tileWidth = Number(process.env.DAEGU_OPERATOR_REFERENCE_REVIEW_TILE_WIDTH ?? 640);
const tileHeight = Number(process.env.DAEGU_OPERATOR_REFERENCE_REVIEW_TILE_HEIGHT ?? 560);
const cropWidth = Number(process.env.DAEGU_OPERATOR_REFERENCE_REVIEW_CROP_WIDTH ?? 568);
const cropHeight = Number(process.env.DAEGU_OPERATOR_REFERENCE_REVIEW_CROP_HEIGHT ?? 390);
const cropPadding = Number(process.env.DAEGU_OPERATOR_REFERENCE_REVIEW_CROP_PADDING ?? 90);

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

function pointsToPath(points) {
  return `M ${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')} Z`;
}

function getReviewZone(component) {
  const [x, y] = component.labelPoint;

  if (y >= 2580) return 'SKY_BOTTOM_ROW';
  if (x <= 760 && y >= 1060) return 'SKY_LEFT_OUTER';
  if (x >= 3240 && y >= 980 && y <= 1840) return 'RIGHT_FIELD_FACILITY_OR_MARKER_REVIEW';
  if (y <= 430 && x >= 1700 && x <= 2500) return 'OUTFIELD_TOP_CENTER';
  if (y <= 1120 && x < 1700) return 'LEFT_FIELD_OR_THIRD_BASE_TOP';
  if (y <= 1120 && x > 2500) return 'RIGHT_FIELD_OR_FIRST_BASE_TOP';
  if (x < 1600 && y < 2300) return 'THIRD_BASE_INFIELD';
  if (x > 2500 && y < 2300) return 'FIRST_BASE_INFIELD';
  if (y >= 1980 && y < 2580 && x < 1900) return 'THIRD_BASE_TABLE';
  if (y >= 1980 && y < 2580 && x > 2200) return 'FIRST_BASE_TABLE';
  if (y >= 1980 && y < 2580) return 'CENTER_TABLE_OR_VIP';
  return 'CENTER_OR_MANUAL_REVIEW';
}

function getMappingRiskFlags(component, reviewZone) {
  const riskFlags = new Set(component.riskFlags ?? []);
  if (component.bounds.minY <= 40 || component.bounds.maxY >= component.sourceImageHeight - 40) {
    riskFlags.add('IMAGE_EDGE_TOUCH');
  }
  if (component.bounds.width < 44 || component.bounds.height < 32) {
    riskFlags.add('SMALL_COMPONENT_LABEL_REVIEW');
  }
  if (component.bounds.width > 620 || component.bounds.height > 620) {
    riskFlags.add('LARGE_COMPONENT_SPLIT_REVIEW');
  }
  if (reviewZone.includes('FACILITY_OR_MARKER')) {
    riskFlags.add('NON_SEAT_MARKER_OR_FACILITY_REVIEW');
  }
  return [...riskFlags].sort();
}

function buildMappingRows(traceReport) {
  const { imageWidth, imageHeight } = traceReport.source;
  return traceReport.components.map((component) => {
    const reviewZone = getReviewZone(component);
    const withImageSize = {
      ...component,
      sourceImageWidth: imageWidth,
      sourceImageHeight: imageHeight,
    };

    return {
      draftId: component.draftId,
      sourceId: traceReport.source.sourceId,
      coordinateSystem: traceReport.source.coordinateSystem,
      viewBox: traceReport.source.viewBox,
      suggestedBlockName: '',
      existingSectionId: '',
      existingBlockName: '',
      suggestedZone: reviewZone,
      colorClass: component.colorClass,
      area: component.area,
      minX: component.bounds.minX,
      minY: component.bounds.minY,
      maxX: component.bounds.maxX,
      maxY: component.bounds.maxY,
      labelX: component.labelPoint[0],
      labelY: component.labelPoint[1],
      pointCount: component.visualPolygon.length,
      draftVisualPath: component.draftVisualPath,
      draftHitPath: component.draftHitPath,
      riskFlags: getMappingRiskFlags(withImageSize, reviewZone),
      mappingStatus: 'PENDING_OPERATOR_MAPPING',
      operatorDecision: 'PENDING',
      reviewer: '',
      reviewedAt: '',
      notes: '',
    };
  });
}

function buildExistingBlockInventoryRows() {
  return DAEGU_BLOCKS.map((block) => ({
    existingSectionId: block.id,
    block: block.block,
    name: block.name,
    category: block.category,
    level: block.level,
    side: block.side,
    traceStatus: block.traceStatus,
    sectionKind: block.sectionKind,
    officialBlocks: (block.officialBlocks ?? []).join('|'),
  })).sort((a, b) => a.name.localeCompare(b.name, 'ko') || a.existingSectionId.localeCompare(b.existingSectionId));
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

async function buildTile({ imageBuffer, component, imageWidth, imageHeight }) {
  const region = {
    left: Math.max(0, component.bounds.minX - cropPadding),
    top: Math.max(0, component.bounds.minY - cropPadding),
    width: Math.min(imageWidth - Math.max(0, component.bounds.minX - cropPadding), component.bounds.width + cropPadding * 2),
    height: Math.min(imageHeight - Math.max(0, component.bounds.minY - cropPadding), component.bounds.height + cropPadding * 2),
  };
  const scale = Math.min(cropWidth / region.width, cropHeight / region.height);
  const renderedWidth = region.width * scale;
  const renderedHeight = region.height * scale;
  const imageX = Math.round((tileWidth - renderedWidth) / 2);
  const imageY = 24;
  const cropBuffer = await sharp(imageBuffer)
    .extract(region)
    .resize({
      width: Math.round(renderedWidth),
      height: Math.round(renderedHeight),
      fit: 'fill',
    })
    .png()
    .toBuffer();
  const cropHref = `data:image/png;base64,${cropBuffer.toString('base64')}`;
  const polygon = component.visualPolygon.map(([x, y]) => [
    imageX + (x - region.left) * scale,
    imageY + (y - region.top) * scale,
  ]);
  const hitPolygon = component.hitPolygon.map(([x, y]) => [
    imageX + (x - region.left) * scale,
    imageY + (y - region.top) * scale,
  ]);
  const labelX = imageX + (component.labelPoint[0] - region.left) * scale;
  const labelY = imageY + (component.labelPoint[1] - region.top) * scale;
  const reviewZone = getReviewZone(component);
  const lines = [
    component.draftId,
    `${component.colorClass} | area ${component.area} | pts ${component.visualPolygon.length}`,
    `bounds ${component.bounds.minX},${component.bounds.minY} - ${component.bounds.maxX},${component.bounds.maxY}`,
    reviewZone,
  ];

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tileWidth}" height="${tileHeight}" viewBox="0 0 ${tileWidth} ${tileHeight}">`,
    '  <rect width="100%" height="100%" fill="#111827" />',
    `  <rect x="${imageX - 4}" y="${imageY - 4}" width="${renderedWidth + 8}" height="${renderedHeight + 8}" fill="#020617" stroke="#475569" stroke-width="2" />`,
    `  <image href="${cropHref}" x="${imageX}" y="${imageY}" width="${renderedWidth}" height="${renderedHeight}" />`,
    `  <path d="${pointsToPath(hitPolygon)}" fill="rgba(251, 146, 60, 0.16)" stroke="#fb923c" stroke-width="3" stroke-dasharray="10 8" />`,
    `  <path d="${pointsToPath(polygon)}" fill="rgba(34, 211, 238, 0.12)" stroke="${component.stroke}" stroke-width="6" />`,
    `  <circle cx="${labelX.toFixed(1)}" cy="${labelY.toFixed(1)}" r="9" fill="#f8fafc" stroke="#020617" stroke-width="4" />`,
    '  <g font-family="Arial, sans-serif" fill="#f8fafc">',
    ...lines.map((line, index) => {
      const fontSize = index === 0 ? 30 : 22;
      const weight = index === 0 ? 900 : 700;
      return `    <text x="32" y="${cropHeight + 70 + index * 34}" font-size="${fontSize}" font-weight="${weight}">${xmlEscape(line)}</text>`;
    }),
    '  </g>',
    '</svg>',
  ].join('\n');

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function buildContactSheets({ imageBuffer, components, imageWidth, imageHeight }) {
  await fs.mkdir(contactSheetDir, { recursive: true });
  const pageSize = pageColumns * pageRows;
  const contactSheets = [];

  for (let pageIndex = 0; pageIndex < Math.ceil(components.length / pageSize); pageIndex += 1) {
    const pageComponents = components.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
    const composites = [];
    for (let tileIndex = 0; tileIndex < pageComponents.length; tileIndex += 1) {
      const component = pageComponents[tileIndex];
      const tileBuffer = await buildTile({ imageBuffer, component, imageWidth, imageHeight });
      composites.push({
        input: tileBuffer,
        left: (tileIndex % pageColumns) * tileWidth,
        top: Math.floor(tileIndex / pageColumns) * tileHeight,
      });
    }
    const pagePath = path.join(contactSheetDir, `daegu-operator-reference-contact-sheet-${String(pageIndex + 1).padStart(2, '0')}.png`);
    await sharp({
      create: {
        width: pageColumns * tileWidth,
        height: pageRows * tileHeight,
        channels: 4,
        background: '#020617',
      },
    }).composite(composites).png().toFile(pagePath);
    contactSheets.push(pagePath);
  }

  return contactSheets;
}

async function main() {
  let traceReport;
  try {
    traceReport = JSON.parse(await fs.readFile(traceJsonPath, 'utf8'));
  } catch (error) {
    throw new Error(`Trace report not found. Run npm run stadium:daegu:operator-reference-trace first. ${error.message}`);
  }

  const imagePath = path.join(frontendRoot, traceReport.source.imagePath);
  const imageBuffer = await fs.readFile(imagePath);
  const mappingRows = buildMappingRows(traceReport);
  const existingBlockRows = buildExistingBlockInventoryRows();

  await fs.mkdir(outputDir, { recursive: true });
  const contactSheets = await buildContactSheets({
    imageBuffer,
    components: traceReport.components,
    imageWidth: traceReport.source.imageWidth,
    imageHeight: traceReport.source.imageHeight,
  });

  const mappingColumns = [
    'draftId',
    'sourceId',
    'coordinateSystem',
    'viewBox',
    'suggestedBlockName',
    'existingSectionId',
    'existingBlockName',
    'suggestedZone',
    'colorClass',
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
  ];
  const existingBlockColumns = [
    'existingSectionId',
    'block',
    'name',
    'category',
    'level',
    'side',
    'traceStatus',
    'sectionKind',
    'officialBlocks',
  ];

  const report = {
    status: 'mapping-template-ready',
    generatedAt: new Date().toISOString(),
    source: traceReport.source,
    policy: {
      productionWriteAllowed: false,
      operatorMappingRequired: true,
      operatorApprovalRequired: true,
      note: 'This packet maps uploaded-reference draft polygons to operator-owned block names. It does not update DAEGU_BLOCKS.',
    },
    summary: {
      draftComponentCount: mappingRows.length,
      existingDaeguBlockCount: existingBlockRows.length,
      contactSheetCount: contactSheets.length,
      pageColumns,
      pageRows,
      tileWidth,
      tileHeight,
    },
    outputs: {
      mappingCsv: path.relative(frontendRoot, mappingCsvPath),
      mappingJson: path.relative(frontendRoot, mappingJsonPath),
      existingBlockCsv: path.relative(frontendRoot, existingBlockCsvPath),
      contactSheets: contactSheets.map((sheetPath) => path.relative(frontendRoot, sheetPath)),
    },
    mappingRows,
  };

  await fs.writeFile(mappingCsvPath, buildCsv(mappingRows, mappingColumns));
  await fs.writeFile(existingBlockCsvPath, buildCsv(existingBlockRows, existingBlockColumns));
  await fs.writeFile(mappingJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(reviewMdPath, [
    '# 대구 operator reference review packet',
    '',
    `- status: \`${report.status}\``,
    `- source: \`${traceReport.source.imagePath}\``,
    `- coordinate system: \`${traceReport.source.viewBox}\``,
    `- draft components: \`${mappingRows.length}\``,
    `- existing Daegu blocks: \`${existingBlockRows.length}\``,
    `- contact sheet pages: \`${contactSheets.length}\``,
    `- production write allowed: \`${report.policy.productionWriteAllowed}\``,
    '',
    '## Outputs',
    '',
    `- mapping CSV: \`${path.relative(frontendRoot, mappingCsvPath)}\``,
    `- mapping JSON: \`${path.relative(frontendRoot, mappingJsonPath)}\``,
    `- existing block inventory CSV: \`${path.relative(frontendRoot, existingBlockCsvPath)}\``,
    ...contactSheets.map((sheetPath) => `- contact sheet: \`${path.relative(frontendRoot, sheetPath)}\``),
    '',
    '## Operator Mapping Rule',
    '',
    '`suggestedBlockName`, `existingSectionId`, `operatorDecision`, `reviewer`, `reviewedAt`이 채워지기 전까지 production 좌표로 반영하지 않는다.',
    '`operatorDecision=APPROVED`가 아닌 row는 계속 reference draft로만 유지한다.',
    '',
  ].join('\n'));

  console.log(`operator_reference_review_markdown:${reviewMdPath}`);
  console.log(`operator_reference_mapping_csv:${mappingCsvPath}`);
  console.log(`operator_reference_mapping_json:${mappingJsonPath}`);
  console.log(`operator_reference_existing_block_csv:${existingBlockCsvPath}`);
  console.log(`operator_reference_contact_sheets:${contactSheets.length}`);
  console.log(`status:${report.status} draftComponents=${mappingRows.length} existingBlocks=${existingBlockRows.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
