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
const traceJsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-trace/daegu-operator-reference-trace.json');
const p9JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p9-missing-scan/daegu-operator-reference-p9-missing-scan-packet.json');
const p32JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p32-post-p31-audit/daegu-operator-reference-p32-post-p31-audit.json');
const p33JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p33-label-coverage-audit/daegu-operator-reference-p33-label-coverage-audit.json');
const p34JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p34-visual-match-audit/daegu-operator-reference-p34-visual-match-audit.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p35-review-lock-audit');
const gateDir = path.join(outputDir, 'gate');
const auditJsonPath = path.join(outputDir, 'daegu-operator-reference-p35-review-lock-audit.json');
const selectableCsvPath = path.join(outputDir, 'daegu-operator-reference-p35-selectable-review-lock.csv');
const componentCsvPath = path.join(outputDir, 'daegu-operator-reference-p35-component-disposition.csv');
const auditMdPath = path.join(outputDir, 'daegu-operator-reference-p35-review-lock-audit.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p35-review-lock-audit-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p35-review-lock-audit-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p35-review-lock-audit-gate.md');

const task = process.argv[2] ?? 'audit';
const requireEvidence = process.argv.includes('--require-evidence');

const sourceContractLiterals = [
  'P35 locks P34 crop/overlay evidence and component disposition before any release wording.',
  'AUTO_VISUAL_MATCH_READY',
  'OPERATOR_VISUAL_REVIEW_PENDING',
  'OPERATOR_VISUAL_REVIEW_NOT_COMPLETE',
  'SELECTABLE_COMPONENT_EVIDENCE',
  'SELECTABLE_COMPONENT_SHARED_OR_MERGED',
  'P32_REVIEW_ONLY_COMPONENT',
  'P8_NON_SELECTABLE_OR_LABEL_REQUIRED',
  'ALL_187_COMPONENTS_DISPOSITIONED',
  'PASS_RELEASE_177_FORBIDDEN',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p35-review-lock-audit-ready',
  'p35-review-lock-audit-gate-passed',
];

void sourceContractLiterals;

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

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] || 'UNCLASSIFIED';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function pathExists(frontendRelativePath) {
  if (!frontendRelativePath) return false;
  try {
    await fs.access(path.join(frontendRoot, frontendRelativePath));
    return true;
  } catch {
    return false;
  }
}

function mapP32ByDraftId(p32Rows) {
  return new Map(p32Rows.map((row) => [row.draftId, row]));
}

function mapP34ByTopComponent(p34Rows) {
  const byDraftId = new Map();
  for (const row of p34Rows) {
    if (!row.topComponentDraftId) continue;
    const rows = byDraftId.get(row.topComponentDraftId) ?? [];
    rows.push(row);
    byDraftId.set(row.topComponentDraftId, rows);
  }
  return byDraftId;
}

function buildSelectableReviewRows(p34Rows) {
  return p34Rows.map((row) => ({
    sectionId: row.sectionId,
    block: row.block,
    name: row.name,
    category: row.category,
    level: row.level,
    side: row.side,
    geometryVersion: row.geometryVersion,
    traceVersion: row.traceVersion,
    autoVisualMatchStatus: row.visualMatchStatus,
    autoVisualMatchReady: row.visualMatchStatus === 'PASS_VISUAL_MATCH_CANDIDATE',
    visualReviewStatus: 'OPERATOR_VISUAL_REVIEW_PENDING',
    operatorVisualReviewed: false,
    operatorVisualReviewedAt: '',
    reviewBlocker: 'OPERATOR_VISUAL_REVIEW_NOT_COMPLETE',
    evidenceCropPng: row.cropPng,
    evidenceCropSvg: row.cropSvg,
    overlayPng: 'reports/stadium/daegu-operator-reference-p34-visual-match-audit/daegu-operator-reference-p34-visual-match-overlay.png',
    contactSheet: 'reports/stadium/daegu-operator-reference-p34-visual-match-audit/daegu-operator-reference-p34-risk-contact-sheet.png',
    topComponentDraftId: row.topComponentDraftId,
    colorCoverageRatio: row.colorCoverageRatio,
    overlapRatio: row.overlapRatio,
    hitAreaRatio: row.hitAreaRatio,
    reviewChecklist: 'VERIFY_CROP_POLYGON_BOUNDARY_LABEL_AND_NEIGHBOR_OWNERSHIP',
    nextAction: 'OPERATOR_VISUAL_REVIEW_REQUIRED_BEFORE_RELEASE_LOCK',
  }));
}

function buildComponentDispositionRows({ p9Rows, p32Rows, p34Rows }) {
  const p32ByDraftId = mapP32ByDraftId(p32Rows);
  const p34ByTopComponent = mapP34ByTopComponent(p34Rows);

  return p9Rows.map((row) => {
    const p34Matches = p34ByTopComponent.get(row.draftId) ?? [];
    const p32Row = p32ByDraftId.get(row.draftId);
    const matchedBlocks = p34Matches.map((match) => match.block).join('|');

    if (p34Matches.length > 0) {
      return {
        draftId: row.draftId,
        disposition: 'SELECTABLE_COMPONENT_EVIDENCE',
        sourceClassification: row.classification,
        matchedBlocks,
        matchedSectionIds: p34Matches.map((match) => match.sectionId).join('|'),
        reviewStatus: 'COVERED_BY_P34_SELECTABLE_CROP',
        nextAction: 'VERIFY_WITH_P34_CROP_BEFORE_OPERATOR_VISUAL_REVIEW_LOCK',
        blocker: '',
        colorClass: row.colorClass,
        minX: row.minX,
        minY: row.minY,
        maxX: row.maxX,
        maxY: row.maxY,
        labelX: row.labelX,
        labelY: row.labelY,
        topOverlapBlocks: row.topOverlapBlocks,
        activeCoverageRatio: row.activeCoverageRatio,
      };
    }

    if (row.classification === 'ALREADY_COVERED_ACTIVE_SEAT') {
      return {
        draftId: row.draftId,
        disposition: 'SELECTABLE_COMPONENT_SHARED_OR_MERGED',
        sourceClassification: row.classification,
        matchedBlocks: row.topOverlapBlocks,
        matchedSectionIds: '',
        reviewStatus: 'COVERED_BY_EXISTING_SELECTABLE_POLYGON_BUT_NOT_TOP_COMPONENT',
        nextAction: 'NO_NEW_BLOCK; REVIEW_AS_SHARED_OR_MERGED_COMPONENT_IF_VISUAL_DIFF_FOUND',
        blocker: '',
        colorClass: row.colorClass,
        minX: row.minX,
        minY: row.minY,
        maxX: row.maxX,
        maxY: row.maxY,
        labelX: row.labelX,
        labelY: row.labelY,
        topOverlapBlocks: row.topOverlapBlocks,
        activeCoverageRatio: row.activeCoverageRatio,
      };
    }

    if (p32Row) {
      return {
        draftId: row.draftId,
        disposition: 'P32_REVIEW_ONLY_COMPONENT',
        sourceClassification: row.classification,
        matchedBlocks: p32Row.suggestedBlockName,
        matchedSectionIds: '',
        reviewStatus: p32Row.p32Classification,
        nextAction: p32Row.nextAction,
        blocker: p32Row.blocker,
        colorClass: row.colorClass,
        minX: row.minX,
        minY: row.minY,
        maxX: row.maxX,
        maxY: row.maxY,
        labelX: row.labelX,
        labelY: row.labelY,
        topOverlapBlocks: row.topOverlapBlocks,
        activeCoverageRatio: row.activeCoverageRatio,
      };
    }

    if (row.classification === 'P8_CLASSIFIED_NON_SELECTABLE_OR_LABEL_REQUIRED') {
      return {
        draftId: row.draftId,
        disposition: 'P8_NON_SELECTABLE_OR_LABEL_REQUIRED',
        sourceClassification: row.classification,
        matchedBlocks: '',
        matchedSectionIds: '',
        reviewStatus: 'PREVIOUSLY_CLASSIFIED_OUT_OF_SELECTABLE_LAYER',
        nextAction: 'KEEP_OUT_OF_SELECTABLE_LAYER_UNLESS_OPERATOR_RECLASSIFIES_WITH_VISIBLE_BLOCK_LABEL',
        blocker: 'NOT_CURRENTLY_A_SELECTABLE_SEAT_BLOCK',
        colorClass: row.colorClass,
        minX: row.minX,
        minY: row.minY,
        maxX: row.maxX,
        maxY: row.maxY,
        labelX: row.labelX,
        labelY: row.labelY,
        topOverlapBlocks: row.topOverlapBlocks,
        activeCoverageRatio: row.activeCoverageRatio,
      };
    }

    return {
      draftId: row.draftId,
      disposition: 'UNCLASSIFIED_COMPONENT',
      sourceClassification: row.classification,
      matchedBlocks: '',
      matchedSectionIds: '',
      reviewStatus: 'MANUAL_CLASSIFICATION_REQUIRED',
      nextAction: 'CLASSIFY_BEFORE_ANY_RELEASE_LOCK',
      blocker: 'UNCLASSIFIED_TRACE_COMPONENT',
      colorClass: row.colorClass,
      minX: row.minX,
      minY: row.minY,
      maxX: row.maxX,
      maxY: row.maxY,
      labelX: row.labelX,
      labelY: row.labelY,
      topOverlapBlocks: row.topOverlapBlocks,
      activeCoverageRatio: row.activeCoverageRatio,
    };
  });
}

async function buildValidations({ trace, p9, p32, p33, p34, selectableRows, componentRows }) {
  const cropEvidenceResults = await Promise.all(selectableRows.map(async (row) => ({
    sectionId: row.sectionId,
    cropPngExists: await pathExists(row.evidenceCropPng),
    cropSvgExists: await pathExists(row.evidenceCropSvg),
  })));
  const missingCropRows = cropEvidenceResults.filter((row) => !row.cropPngExists || !row.cropSvgExists);
  const overlayExists = await pathExists('reports/stadium/daegu-operator-reference-p34-visual-match-audit/daegu-operator-reference-p34-visual-match-overlay.png');
  const contactSheetExists = await pathExists('reports/stadium/daegu-operator-reference-p34-visual-match-audit/daegu-operator-reference-p34-risk-contact-sheet.png');
  const unclassifiedRows = componentRows.filter((row) => row.disposition === 'UNCLASSIFIED_COMPONENT');
  const p32NextBatchRows = (p32.rows ?? []).filter((row) => row.p32Classification === 'POST_P31_NEXT_BATCH_CANDIDATE');
  const currentSelectableRows = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat);

  return [
    {
      rowId: 'P35_SELECTABLE_REVIEW_ROWS_131',
      validationType: 'SELECTABLE_REVIEW_LOCK_COVERAGE',
      validationStatus: selectableRows.length === 131 && currentSelectableRows.length === 131 ? 'PASS' : 'INVALID',
      failures: selectableRows.length === 131 && currentSelectableRows.length === 131
        ? ''
        : `SELECTABLE_COUNT_MISMATCH:${selectableRows.length}_CURRENT_${currentSelectableRows.length}`,
    },
    {
      rowId: 'P34_CROP_EVIDENCE_EXISTS',
      validationType: 'VISUAL_EVIDENCE_FILES',
      validationStatus: missingCropRows.length === 0 ? 'PASS' : 'INVALID',
      failures: missingCropRows.map((row) => row.sectionId).join('|'),
    },
    {
      rowId: 'P34_OVERLAY_EVIDENCE_EXISTS',
      validationType: 'VISUAL_EVIDENCE_FILES',
      validationStatus: overlayExists && contactSheetExists ? 'PASS' : 'INVALID',
      failures: overlayExists && contactSheetExists ? '' : 'P34_OVERLAY_OR_CONTACT_SHEET_MISSING',
    },
    {
      rowId: 'P34_AUTO_VISUAL_MATCH_READY',
      validationType: 'AUTO_VISUAL_MATCH_STATUS',
      validationStatus: p34.summary?.visualMatchReady === true && selectableRows.every((row) => row.autoVisualMatchReady) ? 'PASS' : 'INVALID',
      failures: p34.summary?.visualMatchReady === true && selectableRows.every((row) => row.autoVisualMatchReady)
        ? ''
        : 'AUTO_VISUAL_MATCH_NOT_READY',
    },
    {
      rowId: 'P33_VISIBLE_LABELS_COVERED',
      validationType: 'VISIBLE_LABEL_COVERAGE',
      validationStatus: p33.summary?.missingVisibleSeatLabels === 0 && p33.summary?.unexpectedActiveRows === 0 ? 'PASS' : 'INVALID',
      failures: p33.summary?.missingVisibleSeatLabels === 0 && p33.summary?.unexpectedActiveRows === 0
        ? ''
        : 'VISIBLE_LABELS_MISSING_OR_UNEXPECTED_ACTIVE_ROWS',
    },
    {
      rowId: 'P32_NO_NEXT_BATCH_CANDIDATES',
      validationType: 'MISSING_COMPONENT_DISPOSITION',
      validationStatus: p32NextBatchRows.length === 0 ? 'PASS' : 'INVALID',
      failures: p32NextBatchRows.map((row) => row.draftId).join('|'),
    },
    {
      rowId: 'ALL_187_COMPONENTS_DISPOSITIONED',
      validationType: 'TRACE_COMPONENT_DISPOSITION',
      validationStatus: componentRows.length === trace.summary?.componentCount && componentRows.length === p9.summary?.traceComponentCount && unclassifiedRows.length === 0
        ? 'PASS'
        : 'INVALID',
      failures: componentRows.length === trace.summary?.componentCount && componentRows.length === p9.summary?.traceComponentCount && unclassifiedRows.length === 0
        ? ''
        : `TRACE_COMPONENT_DISPOSITION_MISMATCH:${componentRows.length}_TRACE_${trace.summary?.componentCount}_UNCLASSIFIED_${unclassifiedRows.length}`,
    },
    {
      rowId: 'OPERATOR_VISUAL_REVIEW_NOT_COMPLETE',
      validationType: 'RELEASE_LOCK_POLICY',
      validationStatus: selectableRows.every((row) => row.operatorVisualReviewed === false) ? 'REVIEW_PENDING' : 'INVALID',
      failures: selectableRows.every((row) => row.operatorVisualReviewed === false)
        ? 'PASS_RELEASE_177_FORBIDDEN'
        : 'UNEXPECTED_OPERATOR_VISUAL_REVIEW_LOCK',
    },
    {
      rowId: 'NO_SOURCE_WRITE',
      validationType: 'WRITE_POLICY',
      validationStatus: p34.summary?.productionWriteAllowed === false && p34.summary?.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: p34.summary?.productionWriteAllowed === false && p34.summary?.sourceDataWritePerformed === false
        ? ''
        : 'WRITE_POLICY_BROKEN',
    },
  ];
}

async function writeAudit() {
  const [trace, p9, p32, p33, p34] = await Promise.all([
    readJson(traceJsonPath),
    readJson(p9JsonPath),
    readJson(p32JsonPath),
    readJson(p33JsonPath),
    readJson(p34JsonPath),
  ]);
  const selectableRows = buildSelectableReviewRows(p34.rows ?? []);
  const componentRows = buildComponentDispositionRows({
    p9Rows: p9.rows ?? [],
    p32Rows: p32.rows ?? [],
    p34Rows: p34.rows ?? [],
  });
  const validations = await buildValidations({ trace, p9, p32, p33, p34, selectableRows, componentRows });
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const componentDispositionCounts = countBy(componentRows, 'disposition');
  const operatorVisualReviewedRows = selectableRows.filter((row) => row.operatorVisualReviewed).length;
  const summary = {
    status: invalidRows.length === 0 ? 'p35-review-lock-audit-ready' : 'p35-review-lock-audit-blocked',
    traceComponents: trace.summary?.componentCount ?? 0,
    selectableEvidenceRows: selectableRows.length,
    expectedSelectableRows: 131,
    officialDatasetBlocks: DAEGU_BLOCKS.length,
    componentDispositionRows: componentRows.length,
    unclassifiedComponentRows: componentRows.filter((row) => row.disposition === 'UNCLASSIFIED_COMPONENT').length,
    p33MissingVisibleSeatLabels: p33.summary?.missingVisibleSeatLabels ?? 0,
    p33UnexpectedActiveRows: p33.summary?.unexpectedActiveRows ?? 0,
    p32NextBatchCandidateRows: p32.summary?.nextBatchCandidateRows ?? 0,
    p34PassVisualMatchCandidateRows: p34.summary?.passVisualMatchCandidateRows ?? 0,
    p34ReviewRequiredRows: p34.summary?.reviewRequiredRows ?? 0,
    p34ManualRetraceRequiredRows: p34.summary?.manualRetraceRequiredRows ?? 0,
    operatorVisualReviewedRows,
    operatorVisualPendingRows: selectableRows.length - operatorVisualReviewedRows,
    operatorVisualReviewComplete: operatorVisualReviewedRows === selectableRows.length && selectableRows.length > 0,
    all187ComponentsDispositioned: componentRows.length === trace.summary?.componentCount
      && componentRows.filter((row) => row.disposition === 'UNCLASSIFIED_COMPONENT').length === 0,
    visualMatchEvidenceLocked: invalidRows.length === 0,
    releaseLockAllowed: false,
    passRelease177Allowed: false,
    componentDispositionCounts,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      traceReport: toFrontendRelative(traceJsonPath),
      p9Packet: toFrontendRelative(p9JsonPath),
      p32Audit: toFrontendRelative(p32JsonPath),
      p33Audit: toFrontendRelative(p33JsonPath),
      p34Audit: toFrontendRelative(p34JsonPath),
      referenceImage: trace.source?.imagePath,
      viewBox: trace.source?.viewBox,
      imageSha256: trace.source?.imageSha256,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      releaseLockAllowed: false,
      passRelease177Allowed: false,
      note: 'P35 locks P34 crop/overlay evidence and component disposition before any release wording. AUTO_VISUAL_MATCH_READY is not an operator visual approval. PASS_RELEASE_177_FORBIDDEN until operatorVisualReviewed=true for every selectable row.',
    },
    summary,
    selectableReviewRows: selectableRows,
    componentDispositionRows: componentRows,
    validations,
    outputs: {
      auditJson: toFrontendRelative(auditJsonPath),
      selectableCsv: toFrontendRelative(selectableCsvPath),
      componentCsv: toFrontendRelative(componentCsvPath),
      auditMd: toFrontendRelative(auditMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(auditJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(selectableCsvPath, buildCsv(selectableRows, [
    'sectionId',
    'block',
    'name',
    'autoVisualMatchStatus',
    'autoVisualMatchReady',
    'visualReviewStatus',
    'operatorVisualReviewed',
    'reviewBlocker',
    'evidenceCropPng',
    'evidenceCropSvg',
    'topComponentDraftId',
    'colorCoverageRatio',
    'overlapRatio',
    'hitAreaRatio',
    'nextAction',
  ]));
  await fs.writeFile(componentCsvPath, buildCsv(componentRows, [
    'draftId',
    'disposition',
    'sourceClassification',
    'matchedBlocks',
    'reviewStatus',
    'blocker',
    'nextAction',
    'colorClass',
    'minX',
    'minY',
    'maxX',
    'maxY',
    'labelX',
    'labelY',
    'topOverlapBlocks',
    'activeCoverageRatio',
  ]));
  await fs.writeFile(auditMdPath, [
    '# 대구 operator reference P35 review lock audit',
    '',
    `- status: \`${summary.status}\``,
    `- trace components: \`${summary.traceComponents}\``,
    `- selectable evidence rows: \`${summary.selectableEvidenceRows}\``,
    `- component disposition rows: \`${summary.componentDispositionRows}\``,
    `- unclassified component rows: \`${summary.unclassifiedComponentRows}\``,
    `- P33 missing visible seat labels: \`${summary.p33MissingVisibleSeatLabels}\``,
    `- P32 next batch candidates: \`${summary.p32NextBatchCandidateRows}\``,
    `- P34 pass visual match candidate rows: \`${summary.p34PassVisualMatchCandidateRows}\``,
    `- operator visual reviewed rows: \`${summary.operatorVisualReviewedRows}\``,
    `- operator visual pending rows: \`${summary.operatorVisualPendingRows}\``,
    `- operator visual review complete: \`${summary.operatorVisualReviewComplete}\``,
    `- visual match evidence locked: \`${summary.visualMatchEvidenceLocked}\``,
    `- release lock allowed: \`${summary.releaseLockAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Component Disposition Counts',
    '',
    ...Object.entries(summary.componentDispositionCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([classification, count]) => `- \`${classification}\`: ${count}`),
    '',
    '## Review Policy',
    '',
    '- `AUTO_VISUAL_MATCH_READY` means the P34 script found no image blocker.',
    '- `OPERATOR_VISUAL_REVIEW_PENDING` means a human still has to approve each crop before release wording.',
    '- `PASS_RELEASE_177_FORBIDDEN` remains in force in P35.',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} selectableEvidence=${summary.selectableEvidenceRows} componentDisposition=${summary.componentDispositionRows} unclassified=${summary.unclassifiedComponentRows} operatorPending=${summary.operatorVisualPendingRows}`);
  return payload;
}

async function writeGate() {
  let audit;
  try {
    audit = await readJson(auditJsonPath);
  } catch {
    audit = await writeAudit();
  }

  const validations = audit.validations ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p35-review-lock-audit-gate-passed' : 'p35-review-lock-audit-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    selectableEvidenceRows: audit.summary?.selectableEvidenceRows ?? 0,
    componentDispositionRows: audit.summary?.componentDispositionRows ?? 0,
    unclassifiedComponentRows: audit.summary?.unclassifiedComponentRows ?? 0,
    all187ComponentsDispositioned: audit.summary?.all187ComponentsDispositioned === true,
    visualMatchEvidenceLocked: audit.summary?.visualMatchEvidenceLocked === true,
    operatorVisualReviewComplete: audit.summary?.operatorVisualReviewComplete === true,
    releaseLockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
  };

  if (requireEvidence && invalidRows.length > 0) {
    throw new Error(`P35 review lock audit gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P35 review lock audit gate',
    '',
    `- status: \`${summary.status}\``,
    `- total validations: \`${summary.totalValidations}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- review pending rows: \`${summary.reviewPendingRows}\``,
    `- selectable evidence rows: \`${summary.selectableEvidenceRows}\``,
    `- component disposition rows: \`${summary.componentDispositionRows}\``,
    `- unclassified component rows: \`${summary.unclassifiedComponentRows}\``,
    `- all 187 components dispositioned: \`${summary.all187ComponentsDispositioned}\``,
    `- visual match evidence locked: \`${summary.visualMatchEvidenceLocked}\``,
    `- operator visual review complete: \`${summary.operatorVisualReviewComplete}\``,
    `- release lock allowed: \`${summary.releaseLockAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} invalidRows=${summary.invalidRows} reviewPendingRows=${summary.reviewPendingRows} visualMatchEvidenceLocked=${summary.visualMatchEvidenceLocked}`);
}

if (task === 'audit') {
  await writeAudit();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
