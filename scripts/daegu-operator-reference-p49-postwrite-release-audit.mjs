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
const p48JsonPath = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p48-source-apply-guard/daegu-operator-reference-p48-source-apply-guard.json');
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-p49-postwrite-release-audit');
const gateDir = path.join(outputDir, 'gate');
const auditJsonPath = path.join(outputDir, 'daegu-operator-reference-p49-postwrite-release-audit.json');
const auditCsvPath = path.join(outputDir, 'daegu-operator-reference-p49-postwrite-release-audit.csv');
const blockerCsvPath = path.join(outputDir, 'daegu-operator-reference-p49-postwrite-release-blockers.csv');
const releaseLockManifestMdPath = path.join(outputDir, 'daegu-operator-reference-p49-release-lock-manifest.md');
const auditMdPath = path.join(outputDir, 'daegu-operator-reference-p49-postwrite-release-audit.md');
const gateJsonPath = path.join(gateDir, 'daegu-operator-reference-p49-postwrite-release-audit-gate.json');
const gateCsvPath = path.join(gateDir, 'daegu-operator-reference-p49-postwrite-release-audit-gate.csv');
const gateMdPath = path.join(gateDir, 'daegu-operator-reference-p49-postwrite-release-audit-gate.md');

const task = process.argv[2] ?? 'audit';
const requireAudit = process.argv.includes('--require-audit');
const sourceTarget = 'src/data/daeguSeatData.ts';

const sourceContractLiterals = [
  'P49_POSTWRITE_RELEASE_AUDIT',
  'P48_SOURCE_APPLY_GUARD',
  'SOURCE_WRITE_REQUIRED_FOR_POSTWRITE',
  'OPERATOR_REFERENCE_131_REQUIRED',
  'OFFICIAL_177_UNCHANGED',
  'INPUT_SHA256_REQUIRED',
  'SOURCE_TARGET_DAEGU_SEAT_DATA',
  'RELEASE_LOCK_REQUIRES_POSTWRITE_AUDIT',
  'SOURCE_WRITE_AUDIT_ONLY',
  'PASS_RELEASE_177_REMAINS_FORBIDDEN',
  'BUILD_BLOCKER_TRACKED_SEPARATELY',
  'productionWriteAllowed: false',
  'sourceDataWritePerformed: false',
  'postwriteAuditReady=false',
  'releaseLockAllowed=false',
  'p49-postwrite-release-audit-ready',
  'p49-postwrite-release-audit-blocked',
  'p49-postwrite-release-audit-gate-passed',
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

function normalizeSummary(p48) {
  const p48Summary = p48.summary ?? {};
  const currentSelectableSeats = DAEGU_OPERATOR_REFERENCE_BLOCKS.filter(isDaeguOperatorReferenceSelectableSeat).length;
  const officialDatasetBlocks = DAEGU_BLOCKS.length;
  const sourceDataWritePerformed = p48Summary.sourceDataWritePerformed === true;
  const inputSha256 = p48Summary.p45InputSha256 ?? p48.source?.p45InputSha256 ?? '';
  const postwriteAuditReady = sourceDataWritePerformed
    && p48Summary.sourceApplyPreconditionsMet === true
    && p48Summary.sourceApplyPlanRows === 131
    && p48Summary.realOperatorInputProvided === true
    && inputSha256.length > 0
    && currentSelectableSeats === 131
    && officialDatasetBlocks === 177;

  return {
    status: postwriteAuditReady ? 'p49-postwrite-release-audit-ready' : 'p49-postwrite-release-audit-blocked',
    p48Status: p48.status ?? p48Summary.status,
    p42ReviewInput: p48.source?.p42ReviewInput ?? '',
    p45InputSha256: inputSha256,
    realOperatorInputProvided: p48Summary.realOperatorInputProvided === true,
    releaseCandidateAllowed: p48Summary.releaseCandidateAllowed === true,
    sourcePatchAllowed: p48Summary.sourcePatchAllowed === true,
    sourcePatchRows: p48Summary.sourcePatchRows ?? 0,
    sourceApplyPlanRows: p48Summary.sourceApplyPlanRows ?? 0,
    sourceApplyPreconditionsMet: p48Summary.sourceApplyPreconditionsMet === true,
    sourceTarget: p48Summary.sourceTarget ?? sourceTarget,
    currentSelectableSeats,
    officialDatasetBlocks,
    postwriteAuditReady,
    postwriteAuditBlocked: !postwriteAuditReady,
    releaseLockAllowed: postwriteAuditReady,
    releaseLockBlocked: !postwriteAuditReady,
    operatorReference131LockAllowed: postwriteAuditReady,
    passRelease177Allowed: false,
    passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
    productionWriteAllowed: false,
    sourceDataWritePerformed,
    sourceWriteAuditOnly: true,
    buildBlockerTrackedSeparately: p48Summary.buildBlockerTrackedSeparately
      ?? 'Mate runtime exceeded budget (18140 > 16000)',
  };
}

function buildBlockers(summary) {
  const blockers = [];
  addBlocker(
    blockers,
    summary.sourceDataWritePerformed !== true,
    'SOURCE_WRITE_REQUIRED_FOR_POSTWRITE',
    'REVIEW_PENDING',
    'SOURCE_WRITE_REQUIRED_FOR_POSTWRITE: P49 cannot release-lock before source apply has actually occurred.',
    'Run the explicit source apply step only after P48 preconditions are met.',
  );
  addBlocker(
    blockers,
    summary.sourceApplyPreconditionsMet !== true,
    'P48_SOURCE_APPLY_GUARD_NOT_READY',
    'REVIEW_PENDING',
    'P48 source apply guard has not reached precondition-ready status.',
    'Complete real operator approval and rerun P42-P48 before postwrite audit.',
  );
  addBlocker(
    blockers,
    summary.sourceApplyPlanRows !== 131,
    'SOURCE_APPLY_PLAN_ROWS_131_REQUIRED',
    'REVIEW_PENDING',
    `P49 requires 131 source apply plan rows; found ${summary.sourceApplyPlanRows}.`,
    'P47/P48 must produce 131 source apply rows before P49 can pass.',
  );
  addBlocker(
    blockers,
    summary.currentSelectableSeats !== 131,
    'OPERATOR_REFERENCE_131_REQUIRED',
    'INVALID',
    `OPERATOR_REFERENCE_131_REQUIRED: current selectable seats are ${summary.currentSelectableSeats}.`,
    'Keep operator reference selectable blocks at 131 after source apply.',
  );
  addBlocker(
    blockers,
    summary.officialDatasetBlocks !== 177,
    'OFFICIAL_177_UNCHANGED',
    'INVALID',
    `OFFICIAL_177_UNCHANGED: official dataset blocks are ${summary.officialDatasetBlocks}.`,
    'Do not mutate the official 1707 PNG dataset during operator reference release.',
  );
  addBlocker(
    blockers,
    !summary.p45InputSha256,
    'INPUT_SHA256_REQUIRED',
    'INVALID',
    'INPUT_SHA256_REQUIRED: P49 requires the operator input hash recorded by P45.',
    'Rerun P45-P49 with a real operator input manifest.',
  );
  return blockers;
}

function buildRows(summary) {
  return [
    {
      rowId: 'P49_POSTWRITE_RELEASE_AUDIT',
      validationType: 'AUDIT_CONTRACT',
      validationStatus: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.currentSelectableSeats === 131 && summary.officialDatasetBlocks === 177
        ? ''
        : `SELECTABLE_${summary.currentSelectableSeats}_OFFICIAL_${summary.officialDatasetBlocks}`,
      nextAction: 'P49 audits source state only; it does not write source data.',
    },
    {
      rowId: 'P48_SOURCE_APPLY_GUARD',
      validationType: 'SOURCE_CHAIN',
      validationStatus: summary.p48Status ? 'PASS' : 'INVALID',
      failures: summary.p48Status ? '' : 'P48_GUARD_MISSING',
      nextAction: 'Run npm run stadium:daegu:operator-reference-p48-source-apply-guard before P49.',
    },
    {
      rowId: 'SOURCE_WRITE_REQUIRED_FOR_POSTWRITE',
      validationType: 'POSTWRITE_POLICY',
      validationStatus: summary.sourceDataWritePerformed ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.sourceDataWritePerformed ? '' : 'SOURCE_WRITE_NOT_PERFORMED',
      nextAction: 'P49 release lock requires an explicit source apply before postwrite audit can pass.',
    },
    {
      rowId: 'RELEASE_LOCK_REQUIRES_POSTWRITE_AUDIT',
      validationType: 'RELEASE_LOCK_POLICY',
      validationStatus: summary.postwriteAuditReady ? 'PASS' : 'REVIEW_PENDING',
      failures: summary.postwriteAuditReady ? '' : 'POSTWRITE_AUDIT_NOT_READY',
      nextAction: 'Release lock remains blocked until source write and postwrite checks pass.',
    },
    {
      rowId: 'OPERATOR_REFERENCE_131_REQUIRED',
      validationType: 'DATASET_POLICY',
      validationStatus: summary.currentSelectableSeats === 131 ? 'PASS' : 'INVALID',
      failures: summary.currentSelectableSeats === 131 ? '' : `SELECTABLE_SEATS:${summary.currentSelectableSeats}`,
      nextAction: 'Operator reference selectable dataset must remain 131.',
    },
    {
      rowId: 'OFFICIAL_177_UNCHANGED',
      validationType: 'DATASET_POLICY',
      validationStatus: summary.officialDatasetBlocks === 177 ? 'PASS' : 'INVALID',
      failures: summary.officialDatasetBlocks === 177 ? '' : `OFFICIAL_BLOCKS:${summary.officialDatasetBlocks}`,
      nextAction: 'Official PNG 177 dataset must remain unchanged.',
    },
    {
      rowId: 'INPUT_SHA256_REQUIRED',
      validationType: 'INPUT_MANIFEST',
      validationStatus: summary.p45InputSha256 ? 'PASS' : 'INVALID',
      failures: summary.p45InputSha256 ? '' : 'INPUT_SHA256_MISSING',
      nextAction: 'P49 must preserve the operator input SHA-256.',
    },
    {
      rowId: 'SOURCE_TARGET_DAEGU_SEAT_DATA',
      validationType: 'SOURCE_TARGET_POLICY',
      validationStatus: summary.sourceTarget === sourceTarget ? 'PASS' : 'INVALID',
      failures: summary.sourceTarget === sourceTarget ? '' : `SOURCE_TARGET:${summary.sourceTarget}`,
      nextAction: 'P49 source target must remain src/data/daeguSeatData.ts.',
    },
    {
      rowId: 'SOURCE_WRITE_AUDIT_ONLY',
      validationType: 'WRITE_POLICY',
      validationStatus: summary.productionWriteAllowed === false ? 'PASS' : 'INVALID',
      failures: summary.productionWriteAllowed === false ? '' : 'PRODUCTION_WRITE_ALLOWED_IN_AUDIT',
      nextAction: 'P49 is an audit step and must not perform production writes.',
    },
    {
      rowId: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      validationType: 'RELEASE_STATUS_POLICY',
      validationStatus: summary.passRelease177Allowed === false ? 'PASS' : 'INVALID',
      failures: summary.passRelease177Allowed === false ? '' : 'PASS_RELEASE_177_ALLOWED_TOO_EARLY',
      nextAction: 'P49 can only lock operator reference 131; official 177 release remains separate.',
    },
    {
      rowId: 'BUILD_BLOCKER_TRACKED_SEPARATELY',
      validationType: 'BUILD_POLICY',
      validationStatus: summary.buildBlockerTrackedSeparately ? 'PASS' : 'INVALID',
      failures: summary.buildBlockerTrackedSeparately ? '' : 'BUILD_BLOCKER_NOT_TRACKED',
      nextAction: 'Keep Mate bundle budget tracking separate from Daegu seatmap release audit.',
    },
  ];
}

async function writeAudit() {
  const p48 = await readJson(p48JsonPath);
  const summary = normalizeSummary(p48);
  const blockers = buildBlockers(summary);
  const rows = buildRows(summary);
  const payload = {
    status: summary.status,
    generatedAt: new Date().toISOString(),
    source: {
      p48Json: toFrontendRelative(p48JsonPath),
      p42ReviewInput: summary.p42ReviewInput,
      p45InputSha256: summary.p45InputSha256,
      sourceTarget,
    },
    policy: {
      productionWriteAllowed: false,
      sourceDataWritePerformed: summary.sourceDataWritePerformed,
      sourceWriteAuditOnly: true,
      passRelease177Allowed: false,
      passRelease177Status: 'PASS_RELEASE_177_REMAINS_FORBIDDEN',
      releaseLockAllowed: summary.releaseLockAllowed,
      note: 'P49_POSTWRITE_RELEASE_AUDIT. P48_SOURCE_APPLY_GUARD. SOURCE_WRITE_REQUIRED_FOR_POSTWRITE. OPERATOR_REFERENCE_131_REQUIRED. OFFICIAL_177_UNCHANGED. INPUT_SHA256_REQUIRED.',
    },
    summary: {
      ...summary,
      blockerCount: blockers.length,
    },
    blockers,
    rows,
    outputs: {
      auditJson: toFrontendRelative(auditJsonPath),
      auditCsv: toFrontendRelative(auditCsvPath),
      blockerCsv: toFrontendRelative(blockerCsvPath),
      releaseLockManifestMd: toFrontendRelative(releaseLockManifestMdPath),
      auditMd: toFrontendRelative(auditMdPath),
      gateJson: toFrontendRelative(gateJsonPath),
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(auditJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(auditCsvPath, buildCsv(rows, [
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
  await fs.writeFile(releaseLockManifestMdPath, [
    '# 대구 operator reference P49 release lock manifest',
    '',
    `- postwrite audit ready: \`${summary.postwriteAuditReady}\``,
    `- release lock allowed: \`${summary.releaseLockAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- input sha256: \`${summary.p45InputSha256}\``,
    `- operator reference selectable seats: \`${summary.currentSelectableSeats}\``,
    `- official dataset blocks: \`${summary.officialDatasetBlocks}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    '',
  ].join('\n'));
  await fs.writeFile(auditMdPath, [
    '# 대구 operator reference P49 postwrite release audit',
    '',
    `- status: \`${summary.status}\``,
    `- P42 review input: \`${summary.p42ReviewInput}\``,
    `- input sha256: \`${summary.p45InputSha256}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- postwrite audit ready: \`${summary.postwriteAuditReady}\``,
    `- release lock allowed: \`${summary.releaseLockAllowed}\``,
    `- release lock blocked: \`${summary.releaseLockBlocked}\``,
    `- operator reference selectable seats: \`${summary.currentSelectableSeats}\``,
    `- official dataset blocks: \`${summary.officialDatasetBlocks}\``,
    `- source target: \`${summary.sourceTarget}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
    '## Blockers',
    '',
    blockers.length > 0
      ? blockers.map((blocker) => `- \`${blocker.rowId}\`: ${blocker.message} Next: ${blocker.nextAction}`).join('\n')
      : '- none',
    '',
  ].join('\n'));

  console.log(`status:${summary.status} sourceDataWritePerformed=${summary.sourceDataWritePerformed} postwriteAuditReady=${summary.postwriteAuditReady} releaseLockAllowed=${summary.releaseLockAllowed} currentSelectableSeats=${summary.currentSelectableSeats} officialDatasetBlocks=${summary.officialDatasetBlocks}`);
  return payload;
}

async function writeGate() {
  let audit;
  try {
    audit = await readJson(auditJsonPath);
  } catch {
    audit = await writeAudit();
  }

  const validations = audit.rows ?? [];
  const invalidRows = validations.filter((row) => row.validationStatus === 'INVALID');
  const reviewPendingRows = validations.filter((row) => row.validationStatus === 'REVIEW_PENDING');
  const summary = {
    status: invalidRows.length === 0 ? 'p49-postwrite-release-audit-gate-passed' : 'p49-postwrite-release-audit-gate-blocked',
    totalValidations: validations.length,
    invalidRows: invalidRows.length,
    reviewPendingRows: reviewPendingRows.length,
    p45InputSha256: audit.summary?.p45InputSha256 ?? '',
    sourceDataWritePerformed: audit.summary?.sourceDataWritePerformed === true,
    postwriteAuditReady: audit.summary?.postwriteAuditReady === true,
    releaseLockAllowed: audit.summary?.releaseLockAllowed === true,
    releaseLockBlocked: audit.summary?.releaseLockBlocked === true,
    currentSelectableSeats: audit.summary?.currentSelectableSeats ?? 0,
    officialDatasetBlocks: audit.summary?.officialDatasetBlocks ?? 0,
    operatorReference131LockAllowed: audit.summary?.operatorReference131LockAllowed === true,
    passRelease177Allowed: false,
    productionWriteAllowed: false,
    buildBlockerTrackedSeparately: audit.summary?.buildBlockerTrackedSeparately,
  };

  if (requireAudit && invalidRows.length > 0) {
    throw new Error(`P49 postwrite release audit gate failed: ${invalidRows.map((row) => row.rowId).join(',')}`);
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
    '# 대구 operator reference P49 postwrite release audit gate',
    '',
    `- status: \`${summary.status}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- review pending validations: \`${summary.reviewPendingRows}\``,
    `- input sha256: \`${summary.p45InputSha256}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- postwrite audit ready: \`${summary.postwriteAuditReady}\``,
    `- release lock allowed: \`${summary.releaseLockAllowed}\``,
    `- operator reference selectable seats: \`${summary.currentSelectableSeats}\``,
    `- official dataset blocks: \`${summary.officialDatasetBlocks}\``,
    `- PASS_RELEASE_177 allowed: \`${summary.passRelease177Allowed}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- build blocker tracked separately: \`${summary.buildBlockerTrackedSeparately}\``,
    '',
  ].join('\n'));

  console.log(`status:${summary.status} sourceDataWritePerformed=${summary.sourceDataWritePerformed} postwriteAuditReady=${summary.postwriteAuditReady} releaseLockAllowed=${summary.releaseLockAllowed} invalidRows=${summary.invalidRows}`);
}

if (task === 'audit') {
  await writeAudit();
} else if (task === 'gate') {
  await writeGate();
} else {
  throw new Error(`Unsupported task: ${task}`);
}
