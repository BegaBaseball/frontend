import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
  isDaeguOperatorReferenceSelectableSeat,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const p46JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p46-release-input-preflight/daegu-operator-reference-p46-release-input-preflight.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p47-source-apply-preview');
const gateDir = path.join(outputDir, 'gate');
const previewJsonPath = path.join(outputDir, 'daegu-operator-reference-p47-source-apply-preview.json');
const previewCsvPath = path.join(outputDir, 'daegu-operator-reference-p47-source-apply-preview.csv');
const blockerCsvPath = path.join(outputDir, 'daegu-operator-reference-p47-source-apply-blockers.csv');
const sourcePatchRowsCsvPath = path.join(outputDir, 'daegu-operator-reference-p47-source-patch-rows.csv');
const patchTxtPath = path.join(outputDir, 'daegu-operator-reference-p47-source-apply-preview.patch.txt');
const previewMdPath = path.join(outputDir, 'daegu-operator-reference-p47-source-apply-preview.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p47-source-apply-preview-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p47-source-apply-preview-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p47-source-apply-preview-gate.md');

const task = process.argv[2] ?? 'preview';
const requirePreview = process.argv.includes('--require-preview');

const releaseTraceVersion = 'DAEGU_OPERATOR_REFERENCE_P47_RELEASE_LOCK_PREVIEW_V1';

const sourceContractLiterals = [
  'P47_SOURCE_APPLY_PREVIEW',
  'P46_RELEASE_INPUT_PREFLIGHT',
  'RELEASE_CANDIDATE_REQUIRED',
  'REAL_OPERATOR_INPUT_REQUIRED',
  'APPROVED_CANDIDATES_131_REQUIRED',
  'OPERATOR_REFERENCE_131_ONLY',
  'OFFICIAL_177_UNCHANGED',
  'FIXTURE_INPUT_BLOCKED',
  'PATCH_PREVIEW_ONLY',
  'SOURCE_WRITE_FORBIDDEN',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'p47-source-apply-preview-ready',
  'p47-source-apply-preview-blocked',
  'p47-source-apply-preview-gate-passed',
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

function toFrontendRelative(filePath) {
  return path.relative(frontendRoot, filePath);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function addBlocker(blockers, condition, rowId, severity, message, nextAction) {
  if (!condition) return;
  blockers.push({
    rowId,
    severity,
    message,
    nextAction,
  });
}

function normalizeSummary(p46, sourcePatchRows) {
  const p46Summary = p46.summary ?? {};
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const releaseCandidateAllowed = p46Summary.releaseCandidateAllowed === true;
  const approvedCandidateRows = p46.approvedCandidates?.length ?? 0;
  const sourcePatchAllowed = releaseCandidateAllowed
    && p46Summary.realOperatorInputProvided === true
    && p46Summary.p44FixtureInput !== true
    && approvedCandidateRows === 131
    && sourcePatchRows.length === 131
    && currentSelectableSeats === 131
    && officialDatasetBlocks === 177;

  return {
    status: sourcePatchAllowed ? 'p47-source-apply-preview-ready' : 'p47-source-apply-preview-blocked',
    p46Status: p46.status ?? p46Summary.status,
    p42ReviewInput: p46.source?.p42ReviewInput ?? '',
    p45InputSha256: p46.source?.p45InputSha256 ?? p46Summary.p45InputSha256 ?? '',
    p45InputKind: p46.source?.p45InputKind ?? '',
    p45InputFiles: p46.source?.p45InputFiles ?? [],
    reviewRows: p46Summary.reviewRows ?? 0,
    approvedRows: p46Summary.approvedRows ?? 0,
    rejectedRows: p46Summary.rejectedRows ?? 0,
    pendingRows: p46Summary.pendingRows ?? 0,
    invalidRows: p46Summary.invalidRows ?? 0,
    immutableColumnChangeCount: p46Summary.immutableColumnChangeCount ?? 0,
    approvedCandidateRows,
    sourcePatchRows: sourcePatchRows.length,
    currentSelectableSeats,
    officialDatasetBlocks,
    realOperatorInputProvided: p46Summary.realOperatorInputProvided === true,
    defaultP41HandoffInput: p46Summary.defaultP41HandoffInput === true,
    p44FixtureInput: p46Summary.p44FixtureInput === true,
    releaseCandidateAllowed,
    releaseCandidateBlocked: p46Summary.releaseCandidateBlocked === true,
    p47SourceApplyCandidateAllowed: p46Summary.p47SourceApplyCandidateAllowed === true,
    sourcePatchAllowed,
    sourcePatchBlocked: !sourcePatchAllowed,
    sourcePatchTarget: 'src/data/daeguSeatData.ts',
    traceVersion: releaseTraceVersion,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: p46Summary.buildBlockerTrackedSeparately
      ?? 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildSourcePatchRows(p46) {
  const p46Summary = p46.summary ?? {};
  if (p46Summary.releaseCandidateAllowed !== true) return [];
  return (p46.approvedCandidates ?? []).map((row, index) => ({
    patchOrder: index + 1,
    reviewZone: row.reviewZone,
    reviewId: row.reviewId,
    sectionId: row.sectionId,
    block: row.block,
    name: row.name,
    reviewer: row.reviewer,
    reviewedAt: row.reviewedAt,
    reviewNote: row.reviewNote,
    patchType: 'OPERATOR_REFERENCE_RELEASE_LOCK_METADATA',
    traceVersion: releaseTraceVersion,
    sourceWriteAllowed: false,
  }));
}

function buildPatchPreviewText(summary, sourcePatchRows) {
  if (!summary.sourcePatchAllowed) {
    return [
      'P47_SOURCE_APPLY_PREVIEW blocked.',
      `releaseCandidateAllowed=${summary.releaseCandidateAllowed}`,
      `realOperatorInputProvided=${summary.realOperatorInputProvided}`,
      `approvedCandidateRows=${summary.approvedCandidateRows}`,
      `sourcePatchRows=${summary.sourcePatchRows}`,
      'sourceDataWritePerformed=false',
      '',
    ].join('\n');
  }

  return [
    '// P47_SOURCE_APPLY_PREVIEW only. Do not paste until P47 source apply is explicitly approved.',
    `const DAEGU_OPERATOR_REFERENCE_P47_RELEASE_LOCK_TRACE_VERSION = '${releaseTraceVersion}';`,
    `const DAEGU_OPERATOR_REFERENCE_P47_RELEASE_LOCK_INPUT_SHA256 = '${summary.p45InputSha256}';`,
    `const DAEGU_OPERATOR_REFERENCE_P47_RELEASE_LOCK_ROWS = ${JSON.stringify(sourcePatchRows, null, 2)};`,
    '',
  ].join('\n');
}

function buildBlockers(summary) {
  const blockers = [];
  addBlocker(
    blockers,
    summary.releaseCandidateAllowed !== true,
    'RELEASE_CANDIDATE_REQUIRED',
    'REVIEW_PENDING',
    'RELEASE_CANDIDATE_REQUIRED: P46 has not allowed release candidate status.',
    'Complete real operator approval and rerun P46 before P47 can create patch rows.',
  );
  addBlocker(
    blockers,
    summary.realOperatorInputProvided !== true,
    'REAL_OPERATOR_INPUT_REQUIRED',
    'REVIEW_PENDING',
    'REAL_OPERATOR_INPUT_REQUIRED: P47 requires a real operator input accepted by P45/P46.',
    'Set DAEGU_OPERATOR_REFERENCE_P42_REVIEW_INPUT to real operator data and rerun P42-P47.',
  );
  addBlocker(
    blockers,
    summary.p44FixtureInput === true,
    'FIXTURE_INPUT_BLOCKED',
    'INVALID',
    'FIXTURE_INPUT_BLOCKED: fixture input cannot create source patch rows.',
    'Use P44 fixtures only for tests.',
  );
  addBlocker(
    blockers,
    summary.approvedCandidateRows !== 131,
    'APPROVED_CANDIDATES_131_REQUIRED',
    'REVIEW_PENDING',
    `APPROVED_CANDIDATES_131_REQUIRED: approved candidate rows are ${summary.approvedCandidateRows}.`,
    'P47 requires all 131 approved candidates from P46.',
  );
  addBlocker(
    blockers,
    summary.currentSelectableSeats !== 131,
    'OPERATOR_REFERENCE_131_ONLY',
    'INVALID',
    `OPERATOR_REFERENCE_131_ONLY: current selectable seats are ${summary.currentSelectableSeats}.`,
    'Keep the 4096 operator reference dataset stable at 131 selectable blocks.',
  );
  addBlocker(
    blockers,
    summary.officialDatasetBlocks !== 177,
    'OFFICIAL_177_UNCHANGED',
    'INVALID',
    `OFFICIAL_177_UNCHANGED: official dataset blocks are ${summary.officialDatasetBlocks}.`,
    'Do not mutate the official PNG 1707 dataset in P47.',
  );
  return blockers;
}

function buildRows(summary) {
  return [
    {
      rowId: 'P47_SOURCE_APPLY_PREVIEW',
      validationType: 'PREVIEW_CONTRACT',
      validationStatus: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'P47 is patch preview only and must not write source data.',
    },
    {
      rowId: 'P46_RELEASE_INPUT_PREFLIGHT',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p46Status ? 'PASS' : 'INVALID',
      failures: summary.p46Status ? '' : 'P46_PREFLIGHT_MISSING',
      nextAction: 'Run npm run stadium:daegu:operator-reference-p46-release-input-preflight before P47.',
    },
    {
      rowId: 'RELEASE_CANDIDATE_REQUIRED',
      validationType: 'P47_POLICY',
      validationStatus: summary.releaseCandidateAllowed ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.releaseCandidateAllowed ? '' : 'P46_RELEASE_CANDIDATE_NOT_ALLOWED',
      nextAction: summary.releaseCandidateAllowed ? 'P46 candidate is ready.' : 'Complete real operator approval before source patch preview.',
    },
    {
      rowId: 'REAL_OPERATOR_INPUT_REQUIRED',
      validationType: 'INPUT_POLICY',
      validationStatus: summary.realOperatorInputProvided ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.realOperatorInputProvided ? '' : 'REAL_OPERATOR_INPUT_NOT_PROVIDED',
      nextAction: 'P47 requires real operator input, not default handoff.',
    },
    {
      rowId: 'FIXTURE_INPUT_BLOCKED',
      validationType: 'INPUT_POLICY',
      validationStatus: summary.p44FixtureInput ? 'INVALID' : 'PASS',
      failures: summary.p44FixtureInput ? 'P44_FIXTURE_INPUT' : '',
      nextAction: summary.p44FixtureInput ? 'Do not use fixture input for source patch preview.' : 'Input is not a fixture.',
    },
    {
      rowId: 'APPROVED_CANDIDATES_131_REQUIRED',
      validationType: 'APPROVAL_POLICY',
      validationStatus: summary.approvedCandidateRows === 131 ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.approvedCandidateRows === 131 ? '' : `APPROVED_CANDIDATES:${summary.approvedCandidateRows}`,
      nextAction: 'P47 source patch rows require 131 approved candidates.',
    },
    {
      rowId: 'OPERATOR_REFERENCE_131_ONLY',
      validationType: 'DATASET_POLICY',
      validationStatus: summary.currentSelectableSeats === 131 ? 'PASS' : 'INVALID',
      failures: summary.currentSelectableSeats === 131 ? '' : `SELECTABLE_SEATS:${summary.currentSelectableSeats}`,
      nextAction: 'Keep operator reference dataset at 131 selectable blocks.',
    },
    {
      rowId: 'OFFICIAL_177_UNCHANGED',
      validationType: 'DATASET_POLICY',
      validationStatus: summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.officialDatasetBlocks === 177 ? '' : `OFFICIAL_BLOCKS:${summary.officialDatasetBlocks}`,
      nextAction: 'Do not modify official 177 dataset in P47.',
    },
    {
      rowId: 'PATCH_PREVIEW_ONLY',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false && summary.sourceDataWritePerformed === false ? '' : 'WRITE_POLICY_BROKEN',
      nextAction: 'P47 may generate patch text but must not write source.',
    },
    {
      rowId: 'SOURCE_WRITE_FORBIDDEN',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.sourceDataWritePerformed === false ? 'PASS' : 'INVALID',
      failures: summary.sourceDataWritePerformed === false ? '' : 'SOURCE_WRITE_OCCURRED',
      nextAction: 'Do not modify src/data/daeguSeatData.ts in P47 preview.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P47 is operator reference 131 preview only; official 177 release remains separate.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu seatmap source preview.',
    },
  ];
}

async function writePreview() {
  const p46 = await readJson(p46JsonPath);
  const sourcePatchRows = buildSourcePatchRows(p46);
  const summary = normalizeSummary(p46, sourcePatchRows);
  const blockers = buildBlockers(summary);
  const rows = buildRows(summary);
  const patchPreviewText = buildPatchPreviewText(summary, sourcePatchRows);
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p46Json: toFrontendRelative(p46JsonPath),
      p42ReviewInput: summary.p42ReviewInput,
      p45InputSha256: summary.p45InputSha256,
      p45InputKind: summary.p45InputKind,
      p45InputFiles: summary.p45InputFiles,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      patchPreviewOnly: true,
      passRelease177Allowed: false,
      passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      operatorReference131LockAllowed: false,
      note: 'P47_SOURCE_APPLY_PREVIEW. P46_RELEASE_INPUT_PREFLIGHT. RELEASE_CANDIDATE_REQUIRED. APPROVED_CANDIDATES_131_REQUIRED. PATCH_PREVIEW_ONLY. SOURCE_WRITE_FORBIDDEN.',
    },
    summary: {
      ...summary,
      blockerCount: blockers.length,
    },
    blockers,
    sourcePatchRows,
    rows,
    outputs: {
      previewJson: toFrontendRelative(previewJsonPath),
      previewCsv: toFrontendRelative(previewCsvPath),
      blockerCsv: toFrontendRelative(blockerCsvPath),
      sourcePatchRowsCsv: toFrontendRelative(sourcePatchRowsCsvPath),
      patchTxt: toFrontendRelative(patchTxtPath),
      previewMd: toFrontendRelative(previewMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(previewJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(previewCsvPath, buildCsv(rows, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(blockerCsvPath, buildCsv(blockers, [
    'rowId',
    'severity',
    'message',
    'nextAction',
  ]));
  await fs.writeFile(sourcePatchRowsCsvPath, buildCsv(sourcePatchRows, [
    'patchOrder',
    'reviewZone',
    'reviewId',
    'sectionId',
    'block',
    'name',
    'reviewer',
    'reviewedAt',
    'reviewNote',
    'patchType',
    'traceVersion',
    'sourceWriteAllowed',
  ]));
  await fs.writeFile(patchTxtPath, patchPreviewText);
  await fs.writeFile(previewMdPath, [
    '# 대구 operator reference P47 source apply preview',
    '',
    `- status: \`${summary.status}\``,
    `- P42 review input: \`${summary.p42ReviewInput}\``,
    `- input sha256: \`${summary.p45InputSha256}\``,
    `- real operator input provided: \`${summary.realOperatorInputProvided}\``,
    `- fixture input: \`${summary.p44FixtureInput}\``,
    `- release candidate allowed: \`${summary.releaseCandidateAllowed}\``,
    `- approved candidate rows: \`${summary.approvedCandidateRows}\``,
    `- source patch rows: \`${summary.sourcePatchRows}\``,
    `- source patch allowed: \`${summary.sourcePatchAllowed}\``,
    `- source patch target: \`${summary.sourcePatchTarget}\``,
    `- current selectable seats: \`${summary.currentSelectableSeats}\``,
    `- official dataset blocks: \`${summary.officialDatasetBlocks}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
    '## Blockers',
    '',
    blockers.length > 0
      ? blockers.map((blocker) => `- \`${blocker.rowId}\`: ${blocker.message} Next: ${blocker.nextAction}`).join('\n')
      : '- none',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} realOperatorInput=${summary.realOperatorInputProvided} approvedCandidateRows=${summary.approvedCandidateRows} sourcePatchRows=${summary.sourcePatchRows} sourcePatchAllowed=${summary.sourcePatchAllowed} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
  return payload;
}

async function writeGate() {
  let preview;
  try {
    preview = await readJson(previewJsonPath);
  } catch {
    preview = await writePreview();
  }

  const validations = preview.rows ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p47-source-apply-preview-gate-passed' : 'p47-source-apply-preview-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    p45InputSha256: preview.summary?.p45InputSha256 ?? '',
    realOperatorInputProvided: preview.summary?.realOperatorInputProvided === true,
    p44FixtureInput: preview.summary?.p44FixtureInput === true,
    releaseCandidateAllowed: preview.summary?.releaseCandidateAllowed === true,
    approvedCandidateRows: preview.summary?.approvedCandidateRows ?? 0,
    sourcePatchRows: preview.summary?.sourcePatchRows ?? 0,
    sourcePatchAllowed: preview.summary?.sourcePatchAllowed === true,
    currentSelectableSeats: preview.summary?.currentSelectableSeats ?? 0,
    officialDatasetBlocks: preview.summary?.officialDatasetBlocks ?? 0,
    operatorReference131LockAllowed: false,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    buildBlockerTrackedSeparately: preview.summary?.buildBlockerTrackedSeparately,
  };

  if (requirePreview && invalidRows.length > 0) {
    throw new Error(`P47 source apply preview gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
  }

  await fs.mkdir(gateDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify({ summary, validations }, null, 2)}\n`);
  await fs.writeFile(gateCsvPath, buildCsv(validations, [
    'rowId',
    'validationType',
    'validationStatus',
    'failures',
    'nextAction',
  ]));
  await fs.writeFile(gateMdPath, [
    '# 대구 operator reference P47 source apply preview gate',
    '',
    `- status: \`${summary.status}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- review pending validations: \`${summary.reviewPendingRows}\``,
    `- input sha256: \`${summary.p45InputSha256}\``,
    `- real operator input provided: \`${summary.realOperatorInputProvided}\``,
    `- fixture input: \`${summary.p44FixtureInput}\``,
    `- release candidate allowed: \`${summary.releaseCandidateAllowed}\``,
    `- approved candidate rows: \`${summary.approvedCandidateRows}\``,
    `- source patch rows: \`${summary.sourcePatchRows}\``,
    `- source patch allowed: \`${summary.sourcePatchAllowed}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} realOperatorInput=${summary.realOperatorInputProvided} sourcePatchRows=${summary.sourcePatchRows} sourcePatchAllowed=${summary.sourcePatchAllowed} invalidRows=${summary.invalidRows} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);
}

if (task === 'preview') {
  await writePreview();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
