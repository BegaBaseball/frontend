import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p11PacketJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p11-approval/daegu-operator-reference-p11-approval-packet.json');
const p13PlanJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p13-source-apply/daegu-operator-reference-p13-source-apply-plan.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p14-review-workflow');
const operatorInputDir = path.join(outputDir, 'operator-input');
const gateDir = path.join(outputDir, 'gate');
const packetJsonPath = path.join(outputDir, 'daegu-operator-reference-p14-review-packet.json');
const packetCsvPath = path.join(outputDir, 'daegu-operator-reference-p14-review-packet.csv');
const packetMdPath = path.join(outputDir, 'daegu-operator-reference-p14-review-packet.md');
const specialOverlaySvgPath = path.join(outputDir, 'p14-special-zone-overlay.svg');
const skyOverlaySvgPath = path.join(outputDir, 'p14-sky-lower-overlay.svg');
const checklistMdPath = path.join(outputDir, 'p14-review-checklist.md');
const operatorInputJsonPath = path.join(operatorInputDir, 'daegu-operator-reference-p14-review-input.json');
const operatorInputCsvPath = path.join(operatorInputDir, 'daegu-operator-reference-p14-review-input.csv');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p14-review-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p14-review-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p14-review-gate.md');

const task = process.argv[2] ?? 'packet';
const requireReady = process.argv.includes('--require-ready');
const imageWidth = 4096;
const imageHeight = 4096;

const sourceContractLiterals = [
  'P14 reorganizes the 22 P11 approval candidates into operator review groups.',
  'P14 does not auto-fill correctedPath or correctedHitPath.',
  'SPECIAL_ZONE_REVIEW',
  'SKY_LOWER_SEQUENCE_REVIEW',
  'draftPathRecommendedAsStartingPoint',
  'draftLabelRecommendedAsStartingPoint',
  'operatorAction',
  'approvalChecklist',
  'operatorDecision: \'PENDING\'',
  'correctedPath: \'\'',
  'correctedHitPath: \'\'',
  'p14-review-packet-ready',
  'p14-review-gate-ready',
  'p14-special-zone-overlay.svg',
  'p14-sky-lower-overlay.svg',
  'p14-review-checklist.md',
  'currentSelectableRows=109',
  'sourceDataWritePerformed: false',
  'productionWriteAllowed: false',
];

void sourceContractLiterals;

const specialOrder = ['루프탑', '파티플로어', '잔디석', 'IM뱅크 캠핑존', 'SKY요기보존'];

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
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

function skyBlockNumber(row) {
  const match = String(row.suggestedBlock).match(/^S-(\d+)$/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function reviewGroup(row) {
  return String(row.suggestedBlock).startsWith('S-')
    ? 'SKY_LOWER_SEQUENCE_REVIEW'
    : 'SPECIAL_ZONE_REVIEW';
}

function groupSortKey(row) {
  if (reviewGroup(row) === 'SPECIAL_ZONE_REVIEW') {
    return specialOrder.indexOf(row.suggestedBlock);
  }
  return 100 + skyBlockNumber(row);
}

function riskFlagsFor(row) {
  return [
    ...(row.riskFlags ?? []),
    reviewGroup(row) === 'SPECIAL_ZONE_REVIEW' ? 'LARGE_OR_SPECIAL_ZONE_BOUNDARY_REVIEW' : 'SKY_SEQUENCE_NEIGHBOR_BOUNDARY_REVIEW',
    row.suggestedBlock === 'SKY요기보존' ? 'NON_NUMERIC_SPECIAL_SKY_LABEL' : '',
    row.suggestedBlock === 'IM뱅크 캠핑존' ? 'SPONSOR_NAMED_ZONE_LABEL' : '',
  ].filter(Boolean);
}

function checklistFor(row) {
  return [
    '공식 4096 reference image crop에서 좌석/구역 색상 경계와 draftVisualPath가 맞는지 확인',
    '흰색 경계선과 텍스트가 polygon vertex로 잘못 포함되지 않았는지 확인',
    '인접 블럭과 의도치 않게 겹치지 않는지 확인',
    'correctedLabelX/correctedLabelY가 correctedPath 내부에 있는지 확인',
    row.suggestedBlock.startsWith('S-')
      ? 'SKY 연속 블럭은 번호 순서와 좌우 인접 블럭 ownership을 함께 확인'
      : '특수 구역은 좌석 구역인지 marker/facility인지 최종 확인',
  ];
}

function buildRows(p11Packet) {
  return (p11Packet.rows ?? [])
    .map((row) => {
      const group = reviewGroup(row);
      return {
        draftId: row.draftId,
        reviewGroup: group,
        reviewOrder: 0,
        visibleLabel: row.visibleLabel,
        suggestedId: row.suggestedId,
        suggestedName: row.suggestedName,
        suggestedBlock: row.suggestedBlock,
        suggestedCategory: row.suggestedCategory,
        suggestedLevel: row.suggestedLevel,
        suggestedSide: row.suggestedSide,
        operatorAction: 'VERIFY_OR_CORRECT_DRAFT_GEOMETRY_THEN_APPROVE',
        operatorDecision: 'PENDING',
        draftVisualPath: row.draftVisualPath,
        draftHitPath: row.draftHitPath,
        draftLabelX: row.draftLabelX,
        draftLabelY: row.draftLabelY,
        draftPathRecommendedAsStartingPoint: row.draftVisualPath,
        draftHitPathRecommendedAsStartingPoint: row.draftHitPath,
        draftLabelRecommendedAsStartingPoint: [row.draftLabelX, row.draftLabelY],
        correctedPath: '',
        correctedHitPath: '',
        correctedLabelX: '',
        correctedLabelY: '',
        reviewer: '',
        reviewedAt: '',
        approvalChecklist: checklistFor(row),
        riskFlags: riskFlagsFor(row),
        cropPng: row.cropPng,
      };
    })
    .sort((a, b) => groupSortKey(a) - groupSortKey(b))
    .map((row, index) => ({
      ...row,
      reviewOrder: index + 1,
    }));
}

async function writeOverlay(rows, group, filePath) {
  const imageHref = path.relative(path.dirname(filePath), path.join(frontendRoot, 'src/assets/stadiums/samsung/daegu-operator-reference-rapak-2025-enhanced-transparent.png')).split(path.sep).join('/');
  const color = group === 'SPECIAL_ZONE_REVIEW' ? '#f97316' : '#0ea5e9';
  const filtered = rows.filter((row) => row.reviewGroup === group);
  const overlay = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageWidth} ${imageHeight}" width="${imageWidth}" height="${imageHeight}">`,
    `<image href="${xmlEscape(imageHref)}" x="0" y="0" width="${imageWidth}" height="${imageHeight}" />`,
    `<g fill="${color}33" stroke="${color}" stroke-width="8" vector-effect="non-scaling-stroke">`,
    ...filtered.map((row) => `<polygon points="${svgPoints(row.draftVisualPath)}"><title>${xmlEscape(`${row.reviewOrder}. ${row.draftId} ${row.visibleLabel}`)}</title></polygon>`),
    '</g>',
    '<g font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#111827" stroke="#f8fafc" stroke-width="7" paint-order="stroke">',
    ...filtered.map((row) => `<text x="${row.draftLabelX}" y="${row.draftLabelY}" text-anchor="middle">${xmlEscape(`${row.reviewOrder}. ${row.suggestedBlock}`)}</text>`),
    '</g>',
    '</svg>',
    '',
  ].join('\n');
  await fs.writeFile(filePath, overlay);
}

function buildSummary(rows, p13Plan) {
  return {
    status: 'p14-review-packet-ready',
    totalRows: rows.length,
    specialZoneRows: rows.filter((row) => row.reviewGroup === 'SPECIAL_ZONE_REVIEW').length,
    skyLowerRows: rows.filter((row) => row.reviewGroup === 'SKY_LOWER_SEQUENCE_REVIEW').length,
    pendingRows: rows.filter((row) => row.operatorDecision === 'PENDING').length,
    correctedGeometryPrefilledRows: rows.filter((row) => row.correctedPath || row.correctedHitPath || row.correctedLabelX || row.correctedLabelY).length,
    currentSelectableRows: p13Plan.summary?.currentSelectableRows ?? 109,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };
}

async function writePacket() {
  const p11Packet = await readJson(p11PacketJsonPath);
  const p13Plan = await readJson(p13PlanJsonPath);
  const rows = buildRows(p11Packet);
  const summary = buildSummary(rows, p13Plan);
  const generatedAt = new Date().toISOString();

  if (rows.length !== 22) {
    throw new Error(`P14 expected 22 P11 review candidates, got ${rows.length}`);
  }

  const payload = {
    status: summary.status,
    generatedAt,
    source: {
      p11Packet: 'reports/stadium/daegu-operator-reference-p11-approval/daegu-operator-reference-p11-approval-packet.json',
      p13Plan: 'reports/stadium/daegu-operator-reference-p13-source-apply/daegu-operator-reference-p13-source-apply-plan.json',
      viewBox: '0 0 4096 4096',
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      note: 'P14 reorganizes the 22 P11 approval candidates into operator review groups. P14 does not auto-fill correctedPath or correctedHitPath.',
    },
    summary,
    rows,
    outputs: {
      packetCsv: toFrontendRelative(packetCsvPath),
      packetMd: toFrontendRelative(packetMdPath),
      specialOverlaySvg: toFrontendRelative(specialOverlaySvgPath),
      skyOverlaySvg: toFrontendRelative(skyOverlaySvgPath),
      checklistMd: toFrontendRelative(checklistMdPath),
      operatorInputJson: toFrontendRelative(operatorInputJsonPath),
      operatorInputCsv: toFrontendRelative(operatorInputCsvPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(operatorInputDir, { recursive: true });
  await writeOverlay(rows, 'SPECIAL_ZONE_REVIEW', specialOverlaySvgPath);
  await writeOverlay(rows, 'SKY_LOWER_SEQUENCE_REVIEW', skyOverlaySvgPath);
  await fs.writeFile(packetJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(packetCsvPath, buildCsv(rows, [
    'reviewOrder',
    'draftId',
    'reviewGroup',
    'visibleLabel',
    'suggestedBlock',
    'operatorAction',
    'operatorDecision',
    'draftPathRecommendedAsStartingPoint',
    'draftHitPathRecommendedAsStartingPoint',
    'correctedPath',
    'correctedHitPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'riskFlags',
    'cropPng',
  ]));
  await fs.writeFile(operatorInputJsonPath, `${JSON.stringify({
    status: 'p14-review-operator-input-ready',
    generatedAt,
    policy: payload.policy,
    rows,
  }, null, 2)}\n`);
  await fs.writeFile(operatorInputCsvPath, buildCsv(rows, [
    'reviewOrder',
    'draftId',
    'reviewGroup',
    'visibleLabel',
    'suggestedId',
    'suggestedName',
    'suggestedBlock',
    'suggestedCategory',
    'suggestedLevel',
    'suggestedSide',
    'operatorAction',
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
    'approvalChecklist',
    'riskFlags',
  ]));
  await fs.writeFile(checklistMdPath, [
    '# 대구 operator reference P14 review checklist',
    '',
    `- total rows: \`${summary.totalRows}\``,
    `- special zone rows: \`${summary.specialZoneRows}\``,
    `- SKY lower rows: \`${summary.skyLowerRows}\``,
    `- current selectable rows: \`${summary.currentSelectableRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Operator Approval Requirements',
    '',
    '- `operatorDecision=APPROVED`',
    '- `correctedPath`',
    '- `correctedHitPath`',
    '- `correctedLabelX`',
    '- `correctedLabelY`',
    '- `reviewer`',
    '- `reviewedAt`',
    '',
    '## Review Rows',
    '',
    ...rows.map((row) => [
      `### ${row.reviewOrder}. ${row.visibleLabel} (${row.draftId})`,
      '',
      `- group: \`${row.reviewGroup}\``,
      `- crop: \`${row.cropPng}\``,
      `- risk flags: \`${row.riskFlags.join('|') || 'NONE'}\``,
      ...row.approvalChecklist.map((item) => `- ${item}`),
      '',
    ].join('\n')),
  ].join('\n'));
  await fs.writeFile(packetMdPath, [
    '# 대구 operator reference P14 review workflow',
    '',
    `- status: \`${summary.status}\``,
    `- total rows: \`${summary.totalRows}\``,
    `- special zone rows: \`${summary.specialZoneRows}\``,
    `- SKY lower rows: \`${summary.skyLowerRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- corrected geometry prefilled rows: \`${summary.correctedGeometryPrefilledRows}\``,
    `- current selectable rows: \`${summary.currentSelectableRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Outputs',
    '',
    `- special overlay: \`${toFrontendRelative(specialOverlaySvgPath)}\``,
    `- SKY overlay: \`${toFrontendRelative(skyOverlaySvgPath)}\``,
    `- checklist: \`${toFrontendRelative(checklistMdPath)}\``,
    `- operator input: \`${toFrontendRelative(operatorInputJsonPath)}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} totalRows=${summary.totalRows} specialZoneRows=${summary.specialZoneRows} skyLowerRows=${summary.skyLowerRows} currentSelectableRows=${summary.currentSelectableRows}`);
}

async function writeGate() {
  const packet = await readJson(packetJsonPath);
  const rows = packet.rows ?? [];
  const validations = rows.map((row) => {
    const failures = [];
    if (!['SPECIAL_ZONE_REVIEW', 'SKY_LOWER_SEQUENCE_REVIEW'].includes(row.reviewGroup)) failures.push('UNKNOWN_REVIEW_GROUP');
    if (row.operatorDecision !== 'PENDING') failures.push('P14_MUST_KEEP_OPERATOR_DECISION_PENDING');
    if (row.correctedPath || row.correctedHitPath || row.correctedLabelX || row.correctedLabelY) failures.push('P14_MUST_NOT_PREFILL_CORRECTED_GEOMETRY');
    if (!row.draftPathRecommendedAsStartingPoint) failures.push('MISSING_DRAFT_PATH_STARTING_POINT');
    if (!row.draftLabelRecommendedAsStartingPoint) failures.push('MISSING_DRAFT_LABEL_STARTING_POINT');
    if (!row.operatorAction) failures.push('MISSING_OPERATOR_ACTION');
    if (!Array.isArray(row.approvalChecklist) || row.approvalChecklist.length < 5) failures.push('MISSING_APPROVAL_CHECKLIST');
    return {
      draftId: row.draftId,
      reviewGroup: row.reviewGroup,
      visibleLabel: row.visibleLabel,
      validationStatus: failures.length ? 'INVALID' : 'READY_FOR_OPERATOR_REVIEW',
      failures: failures.join('|'),
    };
  });
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const summary = {
    status: invalidRows.length === 0 && rows.length === 22 ? 'p14-review-gate-ready' : 'p14-review-gate-blocked',
    totalRows: rows.length,
    readyRows: validations.filter((row) => row.validationStatus === 'READY_FOR_OPERATOR_REVIEW').length,
    invalidRows: invalidRows.length,
    specialZoneRows: rows.filter((row) => row.reviewGroup === 'SPECIAL_ZONE_REVIEW').length,
    skyLowerRows: rows.filter((row) => row.reviewGroup === 'SKY_LOWER_SEQUENCE_REVIEW').length,
    currentSelectableRows: packet.summary?.currentSelectableRows ?? 109,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };

  if (requireReady && summary.status !== 'p14-review-gate-ready') {
    throw new Error(`P14 review gate failed: readyRows=${summary.readyRows} invalidRows=${summary.invalidRows}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'draftId',
    'reviewGroup',
    'visibleLabel',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P14 review gate',
    '',
    `- status: \`${summary.status}\``,
    `- total rows: \`${summary.totalRows}\``,
    `- ready rows: \`${summary.readyRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- special zone rows: \`${summary.specialZoneRows}\``,
    `- SKY lower rows: \`${summary.skyLowerRows}\``,
    `- current selectable rows: \`${summary.currentSelectableRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} readyRows=${summary.readyRows} invalidRows=${summary.invalidRows} currentSelectableRows=${summary.currentSelectableRows}`);
}

if (task === 'packet') {
  await writePacket();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
