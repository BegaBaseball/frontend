import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runP0DecisionPacket = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP0ReportDir = path.join(defaultReportDir, 'daegu-p0-operator');

  const PACKET_VERSION = 'DAEGU_P0_DECISION_PACKET_V1';
  const PACKAGE_VERSION = 'DAEGU_P0_OPERATOR_PACKAGE_V1';
  const TARGET_BATCH_ID = 'BATCH_1_P0';
  const EXPECTED_ROWS = 3;

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

  const reviewFocusFor = (row) => {
    if (row.operatorAction === 'OPERATOR_MANUAL_TRACE_REQUIRED') {
      return 'Manual retrace required; do not approve without a corrected polygon path.';
    }
    if (row.operatorAction === 'OPERATOR_SEPARATE_SHARED_CANDIDATE_BOUNDARY') {
      return 'Duplicate candidate boundary; trace a separate block-specific polygon before approval.';
    }
    return 'Operator corrected path required before approval.';
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const p0ReportDir = path.resolve(frontendRoot, argValue('--p0-report-dir', defaultP0ReportDir));
  const inputPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-input.json');
  const inputCsvPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-input.csv');
  const checklistPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-checklist.md');
  const readinessPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-readiness.md');

  const input = await readJson(inputPath);
  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const blockers = [];

  if (input.packageVersion !== PACKAGE_VERSION) {
    blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  }
  if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  if (input.draftOnly !== false) blockers.push('INPUT_DRAFT_ONLY_NOT_FALSE');
  if (input.productionWriteAllowed !== false) blockers.push('INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (inputRows.length !== EXPECTED_ROWS) blockers.push(`P0_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED_ROWS}`);

  const rows = inputRows.map((row) => {
    const evidenceAbsolutePath = row.evidenceCrop ? path.join(frontendRoot, row.evidenceCrop) : '';
    const evidenceExists = Boolean(evidenceAbsolutePath) && fsSync.existsSync(evidenceAbsolutePath);
    const decision = normalizeDecision(row.operatorDecision);
    const pending = decision === 'PENDING';
    const approved = decision === 'APPROVED';
    const hasCorrectedPath = Boolean(String(row.correctedPath ?? '').trim());
    const hasCorrectedLabel = String(row.correctedLabelX ?? '').trim() !== ''
      && String(row.correctedLabelY ?? '').trim() !== '';
    const hasReviewer = Boolean(String(row.reviewer ?? '').trim());
    const hasReviewedAt = Boolean(String(row.reviewedAt ?? '').trim());

    if (!evidenceExists) blockers.push(`MISSING_EVIDENCE_CROP:${row.blockId}`);

    return {
      blockId: row.blockId,
      block: row.block,
      name: row.name,
      operatorAction: row.operatorAction,
      decision,
      pending,
      approved,
      reviewFocus: reviewFocusFor(row),
      evidenceCrop: row.evidenceCrop,
      evidenceAbsolutePath,
      evidenceExists,
      currentPath: row.currentPath,
      candidatePath: row.candidatePath,
      candidatePathPointCount: row.candidatePathPointCount,
      candidateDuplicateGroup: row.candidateDuplicateGroup || '',
      candidateDuplicateIds: row.candidateDuplicateIds || '',
      currentLabel: `${row.currentLabelX},${row.currentLabelY}`,
      candidateCenter: row.candidateCenterX !== '' && row.candidateCenterY !== ''
        ? `${row.candidateCenterX},${row.candidateCenterY}`
        : '',
      officialFailureReasons: row.officialFailureReasons || '',
      riskFlags: row.riskFlags || '',
      hasCorrectedPath,
      hasCorrectedLabel,
      hasReviewer,
      hasReviewedAt,
    };
  });

  const pendingRows = rows.filter((row) => row.pending);
  const approvedRows = rows.filter((row) => row.approved);
  const missingEvidenceRows = rows.filter((row) => !row.evidenceExists);
  const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator';

  const summary = {
    packetVersion: PACKET_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    input: path.relative(frontendRoot, inputPath),
    inputCsv: path.relative(frontendRoot, inputCsvPath),
    checklist: path.relative(frontendRoot, checklistPath),
    readiness: path.relative(frontendRoot, readinessPath),
    totalRows: rows.length,
    pendingRows: pendingRows.length,
    approvedRows: approvedRows.length,
    missingEvidenceRows: missingEvidenceRows.length,
    requiresOperatorDecision: pendingRows.length > 0,
    productionWriteAllowed: false,
    blockers,
    nextCommandsAfterOperatorInput: [
      'npm run stadium:daegu:p0-operator-prewrite-gate',
      'npm run stadium:daegu:p0-operator-import:write-template',
      'npm run stadium:daegu:operator-corrections-write',
    ],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'This packet is a read-only operator review aid.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'Candidate paths are visual references only and must not be promoted without operator approval.',
    ],
    requiredApprovalFields: [
      'operatorDecision=APPROVED',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
    ],
    rows,
  };

  const jsonPath = path.join(p0ReportDir, 'daegu-seatmap-p0-decision-packet.json');
  const csvPath = path.join(p0ReportDir, 'daegu-seatmap-p0-decision-packet.csv');
  const markdownPath = path.join(p0ReportDir, 'daegu-seatmap-p0-decision-packet.md');

  await fs.mkdir(p0ReportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'blockId',
      'block',
      'decision',
      'operatorAction',
      'reviewFocus',
      'evidenceCrop',
      'evidenceExists',
      'candidatePathPointCount',
      'candidateDuplicateGroup',
      'candidateDuplicateIds',
      'officialFailureReasons',
      'riskFlags',
    ],
    ...rows.map((row) => [
      row.blockId,
      row.block,
      row.decision,
      row.operatorAction,
      row.reviewFocus,
      row.evidenceCrop,
      row.evidenceExists,
      row.candidatePathPointCount,
      row.candidateDuplicateGroup,
      row.candidateDuplicateIds,
      row.officialFailureReasons,
      row.riskFlags,
    ]),
  ]);

  const markdownRows = rows.flatMap((row) => [
    `## ${row.block}`,
    '',
    `![${row.block}](${path.relative(p0ReportDir, row.evidenceAbsolutePath)})`,
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['blockId', `\`${row.blockId}\``],
        ['name', row.name],
        ['decision', `\`${row.decision}\``],
        ['action', `\`${row.operatorAction}\``],
        ['review focus', row.reviewFocus],
        ['candidate points', row.candidatePathPointCount],
        ['duplicate group', row.candidateDuplicateGroup || '-'],
        ['duplicate ids', row.candidateDuplicateIds || '-'],
        ['current label', row.currentLabel],
        ['candidate center', row.candidateCenter || '-'],
        ['failures', row.officialFailureReasons || '-'],
        ['risk flags', row.riskFlags || '-'],
        ['evidence crop', `\`${row.evidenceCrop}\``],
      ],
    ),
    '',
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P0 Decision Packet',
    '',
    `- packet version: \`${PACKET_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- target batch: \`${TARGET_BATCH_ID}\``,
    `- rows: ${summary.totalRows}`,
    `- pending rows: ${summary.pendingRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- input JSON: \`${summary.input}\``,
    `- input CSV: \`${summary.inputCsv}\``,
    `- readiness report: \`${summary.readiness}\``,
    '',
    '## Rules',
    '',
    '- This packet is read-only and does not write production data.',
    '- `candidatePath` is reference-only; do not approve it automatically.',
    '- `APPROVED` rows require `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt`.',
    '- If a row cannot be approved, set `operatorDecision` to `REJECTED` or `NEEDS_RETRACE`.',
    '',
    '## Summary',
    '',
    markdownTable(
      ['block', 'decision', 'action', 'focus', 'evidence'],
      rows.map((row) => [
        `\`${row.block}\``,
        `\`${row.decision}\``,
        `\`${row.operatorAction}\``,
        row.reviewFocus,
        row.evidenceExists ? 'ok' : 'missing',
      ]),
    ),
    '',
    ...markdownRows,
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p0_decision_packet_json:${jsonPath}`);
  console.log(`p0_decision_packet_csv:${csvPath}`);
  console.log(`p0_decision_packet_markdown:${markdownPath}`);
  console.log(`status:${summary.status} rows=${summary.totalRows} pending=${summary.pendingRows} blockers=${summary.blockers.length}`);

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP0OffSeatOperatorImport = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

  const IMPORT_VERSION = 'DAEGU_P0_OFF_SEAT_OPERATOR_IMPORT_V1';
  const DRAFT_INPUT_VERSION = 'DAEGU_P0_OFF_SEAT_OPERATOR_INPUT_V1';
  const SOURCE_INPUT_VERSION = 'DAEGU_P0_OPERATOR_PACKAGE_V1';
  const TARGET_BATCH_ID = 'BATCH_1_P0';
  const TARGET_PRIORITY = 'P0';
  const MIN_OFFICIAL_TRACE_POINTS = 6;
  const DRAFT_REVIEWER = 'DRAFT_VALIDATION_ONLY';
  const DRAFT_REVIEWED_AT = '2026-05-10T00:00:00.000Z';
  const DEFAULT_DRAFT_INPUT = 'reports/stadium/daegu-p0-off-seat-operator-input.json';
  const DEFAULT_SOURCE_INPUT = 'reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json';
  const EXPECTED = {
    expectedRows: 0,
    expectedApprovedRows: 0,
    expectedDuplicateRows: 0,
  };
  const EXPECTED_BLOCK_IDS = new Set([]);
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);
  const SOURCE_COPY_FIELDS = [
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const hasFlag = (name) => process.argv.includes(name);

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const relativeToFrontendRoot = (filePath) => path.relative(frontendRoot, filePath);

  const pathFromFrontendRoot = (filePath) => (
    path.isAbsolute(filePath) ? filePath : path.resolve(frontendRoot, filePath)
  );

  const normalizePathText = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

  const pathPointCount = (pathText) => {
    const normalized = normalizePathText(pathText);
    if (!normalized) return 0;
    const matches = normalized.match(/[ML]\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?/gi);
    return matches ? matches.length : 0;
  };

  const hasValue = (value) => String(value ?? '').trim() !== '';

  const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

  const isDraftMarkerValue = (row) => (
    row.draftOnly === true
    || row.stagingOnly === true
    || row.reviewer === DRAFT_REVIEWER
    || row.reviewedAt === DRAFT_REVIEWED_AT
  );

  const copyEditableFields = (draftRow) => ({
    operatorDecision: normalizeDecision(draftRow.operatorDecision),
    correctedPath: String(draftRow.correctedPath ?? '').trim(),
    correctedLabelX: draftRow.correctedLabelX ?? '',
    correctedLabelY: draftRow.correctedLabelY ?? '',
    reviewer: String(draftRow.reviewer ?? '').trim(),
    reviewedAt: String(draftRow.reviewedAt ?? '').trim(),
    operatorNote: String(draftRow.operatorNote ?? '').trim(),
  });

  const rowChanged = (before, after) => SOURCE_COPY_FIELDS.some((field) => (
    String(before[field] ?? '') !== String(after[field] ?? '')
  ));

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const draftInputPath = pathFromFrontendRoot(argValue('--draft', DEFAULT_DRAFT_INPUT));
  const writeSourceInput = hasFlag('--write-source-input');
  const jsonPath = path.join(reportDir, 'daegu-p0-off-seat-operator-import.json');
  const csvPath = path.join(reportDir, 'daegu-p0-off-seat-operator-import.csv');
  const markdownPath = path.join(reportDir, 'daegu-p0-off-seat-operator-import.md');

  const draft = await readJson(draftInputPath);
  const sourceInputPath = pathFromFrontendRoot(argValue(
    '--source-input',
    draft.copyTargetSourceInput ?? draft.summary?.copyTargetSourceInput ?? DEFAULT_SOURCE_INPUT,
  ));
  const sourceInput = await readJson(sourceInputPath);
  const draftRows = Array.isArray(draft.corrections) ? draft.corrections : [];
  const sourceRows = Array.isArray(sourceInput.corrections) ? sourceInput.corrections : [];
  const sourceByBlockId = new Map(sourceRows.map((row) => [row.blockId, row]));
  const blockers = [];
  const warnings = [];

  if (draft.packageVersion !== DRAFT_INPUT_VERSION) {
    blockers.push(`DRAFT_INPUT_VERSION_MISMATCH:${draft.packageVersion ?? ''}`);
  }
  if (draft.targetBatchId !== TARGET_BATCH_ID) blockers.push(`DRAFT_BATCH_MISMATCH:${draft.targetBatchId ?? ''}`);
  if (draft.draftOnly !== true) blockers.push('DRAFT_INPUT_MUST_BE_DRAFT_ONLY');
  if (draft.sourceOfTruth !== false) blockers.push('DRAFT_INPUT_MUST_NOT_BE_SOURCE_OF_TRUTH');
  if (draft.productionWriteAllowed !== false) blockers.push('DRAFT_INPUT_PRODUCTION_WRITE_ALLOWED');
  if (relativeToFrontendRoot(sourceInputPath) !== (draft.copyTargetSourceInput ?? DEFAULT_SOURCE_INPUT)) {
    blockers.push(`DRAFT_COPY_TARGET_SOURCE_INPUT_MISMATCH:${draft.copyTargetSourceInput ?? ''}`);
  }
  if (sourceInput.packageVersion !== SOURCE_INPUT_VERSION) {
    blockers.push(`SOURCE_INPUT_VERSION_MISMATCH:${sourceInput.packageVersion ?? ''}`);
  }
  if (sourceInput.targetBatchId !== TARGET_BATCH_ID) {
    blockers.push(`SOURCE_INPUT_BATCH_MISMATCH:${sourceInput.targetBatchId ?? ''}`);
  }
  if (sourceInput.draftOnly === true) blockers.push('SOURCE_INPUT_MUST_NOT_BE_DRAFT_ONLY');
  if (sourceInput.stagingOnly === true) blockers.push('SOURCE_INPUT_MUST_NOT_BE_STAGING_ONLY');
  if (sourceInput.productionWriteAllowed !== false) blockers.push('SOURCE_INPUT_PRODUCTION_WRITE_ALLOWED');

  const draftIds = draftRows.map((row) => row.blockId);
  const duplicateDraftIds = draftIds.filter((blockId, index, blockIds) => blockIds.indexOf(blockId) !== index);
  if (draftRows.length !== EXPECTED.expectedRows) {
    blockers.push(`P0_OFF_SEAT_IMPORT_ROWS_CHANGED:${draftRows.length}:${EXPECTED.expectedRows}`);
  }
  if (duplicateDraftIds.length > 0) {
    blockers.push(`DUPLICATE_DRAFT_BLOCK_ID:${[...new Set(duplicateDraftIds)].join(' ')}`);
  }

  const unexpectedDraftRows = draftRows.filter((row) => !EXPECTED_BLOCK_IDS.has(row.blockId));
  if (unexpectedDraftRows.length > 0) {
    blockers.push(`DRAFT_HAS_UNEXPECTED_BLOCKS:${unexpectedDraftRows.map((row) => row.blockId).join(' ')}`);
  }
  const missingDraftIds = [...EXPECTED_BLOCK_IDS].filter((blockId) => !draftIds.includes(blockId));
  if (missingDraftIds.length > 0) blockers.push(`DRAFT_MISSING_BLOCKS:${missingDraftIds.join(' ')}`);

  const missingSourceIds = [...EXPECTED_BLOCK_IDS].filter((blockId) => !sourceByBlockId.has(blockId));
  if (missingSourceIds.length > 0) blockers.push(`SOURCE_INPUT_MISSING_BLOCKS:${missingSourceIds.join(' ')}`);

  const importRows = draftRows.map((draftRow) => {
    const sourceRow = sourceByBlockId.get(draftRow.blockId);
    const operatorDecision = normalizeDecision(draftRow.operatorDecision);
    const editable = copyEditableFields({ ...draftRow, operatorDecision });
    const correctedPathPointCount = pathPointCount(editable.correctedPath);
    const rowBlockers = [];
    const rowWarnings = [];

    if (draftRow.batchId !== TARGET_BATCH_ID) rowBlockers.push(`ROW_BATCH_MISMATCH:${draftRow.batchId ?? ''}`);
    if (draftRow.queuePriority !== TARGET_PRIORITY) rowBlockers.push(`ROW_PRIORITY_NOT_P0:${draftRow.queuePriority ?? ''}`);
    if (draftRow.candidateDuplicateGroup) rowBlockers.push(`ROW_HAS_DUPLICATE_GROUP:${draftRow.candidateDuplicateGroup}`);
    if (!EXPECTED_BLOCK_IDS.has(draftRow.blockId)) rowBlockers.push('ROW_NOT_IN_EXPECTED_P0_OFF_SEAT_SET');
    if (!sourceRow) rowBlockers.push('SOURCE_INPUT_ROW_MISSING');
    if (!DECISION_OPTIONS.has(operatorDecision)) rowBlockers.push(`INVALID_OPERATOR_DECISION:${operatorDecision}`);
    if (sourceRow && sourceRow.batchId !== TARGET_BATCH_ID) rowBlockers.push(`SOURCE_ROW_BATCH_MISMATCH:${sourceRow.batchId ?? ''}`);
    if (sourceRow && sourceRow.queuePriority !== TARGET_PRIORITY) {
      rowBlockers.push(`SOURCE_ROW_PRIORITY_NOT_P0:${sourceRow.queuePriority ?? ''}`);
    }

    if (operatorDecision === 'APPROVED') {
      if (!hasValue(editable.correctedPath)) rowBlockers.push('APPROVED_MISSING_CORRECTED_PATH');
      if (!hasValue(editable.correctedLabelX) || !hasValue(editable.correctedLabelY)) {
        rowBlockers.push('APPROVED_MISSING_CORRECTED_LABEL');
      }
      if (!hasValue(editable.reviewer)) rowBlockers.push('APPROVED_MISSING_REVIEWER');
      if (!hasValue(editable.reviewedAt)) rowBlockers.push('APPROVED_MISSING_REVIEWED_AT');
      if (correctedPathPointCount > 0 && correctedPathPointCount < MIN_OFFICIAL_TRACE_POINTS) {
        rowBlockers.push(`PATH_REQUIRES_AT_LEAST_SIX_POINTS:${correctedPathPointCount}`);
      }
      if (normalizePathText(editable.correctedPath) === normalizePathText(draftRow.currentPath)) {
        rowBlockers.push('APPROVED_CORRECTED_PATH_EQUALS_CURRENT_PATH');
      }
      if (normalizePathText(editable.correctedPath) === normalizePathText(draftRow.candidatePath)) {
        rowBlockers.push('APPROVED_CORRECTED_PATH_EQUALS_REFERENCE_CANDIDATE_PATH');
      }
      if (isDraftMarkerValue(draftRow)) {
        rowBlockers.push('DRAFT_MARKER_NOT_ALLOWED_FOR_SOURCE_IMPORT');
      }
      if (draftRow.reviewer === DRAFT_REVIEWER) {
        rowBlockers.push('DRAFT_REVIEWER_NOT_ALLOWED_FOR_SOURCE_IMPORT');
      }
      if (draftRow.reviewedAt === DRAFT_REVIEWED_AT) {
        rowBlockers.push('DRAFT_REVIEWED_AT_NOT_ALLOWED_FOR_SOURCE_IMPORT');
      }
    } else if (
      hasValue(editable.correctedPath)
      || hasValue(editable.correctedLabelX)
      || hasValue(editable.correctedLabelY)
      || hasValue(editable.reviewer)
      || hasValue(editable.reviewedAt)
    ) {
      rowWarnings.push('NON_APPROVED_ROW_HAS_EDITABLE_FIELDS_NOT_COPIED');
    }

    const mergedSourceRow = sourceRow ? { ...sourceRow, ...editable } : null;
    const validApproved = operatorDecision === 'APPROVED' && rowBlockers.length === 0;
    const copied = validApproved;
    const sourceChanged = copied && sourceRow && rowChanged(sourceRow, mergedSourceRow);

    blockers.push(...rowBlockers.map((blocker) => `${blocker}:${draftRow.blockId}`));
    warnings.push(...rowWarnings.map((warning) => `${warning}:${draftRow.blockId}`));

    return {
      blockId: draftRow.blockId,
      block: draftRow.block,
      queuePriority: draftRow.queuePriority,
      sourceInput: draftRow.sourceInput ?? DEFAULT_SOURCE_INPUT,
      operatorDecision,
      approved: operatorDecision === 'APPROVED',
      copied,
      sourceChanged,
      correctedPathPointCount,
      rowBlockers,
      rowWarnings,
    };
  });

  const approvedRows = importRows.filter((row) => row.approved);
  const copiedRows = importRows.filter((row) => row.copied);
  const sourceChangedRows = importRows.filter((row) => row.sourceChanged);
  const duplicateRows = importRows.filter((row) => {
    const draftRow = draftRows.find((candidate) => candidate.blockId === row.blockId);
    return Boolean(draftRow?.candidateDuplicateGroup);
  });

  if (approvedRows.length !== EXPECTED.expectedApprovedRows) {
    warnings.push(`APPROVED_ROWS_PRESENT_IN_DRAFT_IMPORT:${approvedRows.length}:${EXPECTED.expectedApprovedRows}`);
  }
  if (duplicateRows.length !== EXPECTED.expectedDuplicateRows) {
    blockers.push(`DUPLICATE_ROWS_PRESENT:${duplicateRows.length}:${EXPECTED.expectedDuplicateRows}`);
  }
  if (writeSourceInput && copiedRows.length === 0) warnings.push('NO_APPROVED_ROWS_TO_COPY');

  const sourceInputChanged = sourceChangedRows.length > 0;
  let sourceInputWritten = false;
  if (writeSourceInput && blockers.length === 0 && sourceInputChanged) {
    const copiedByBlockId = new Map(
      draftRows
        .filter((draftRow) => copiedRows.some((row) => row.blockId === draftRow.blockId))
        .map((draftRow) => [draftRow.blockId, copyEditableFields(draftRow)]),
    );
    const mergedSourceInput = {
      ...sourceInput,
      generatedAt: new Date().toISOString(),
      corrections: sourceRows.map((sourceRow) => (
        copiedByBlockId.has(sourceRow.blockId)
          ? { ...sourceRow, ...copiedByBlockId.get(sourceRow.blockId) }
          : sourceRow
      )),
    };
    await fs.writeFile(sourceInputPath, `${JSON.stringify(mergedSourceInput, null, 2)}\n`, 'utf8');
    sourceInputWritten = true;
  }

  const status = blockers.length > 0 ? 'blocked' : 'ok';
  const summary = {
    importVersion: IMPORT_VERSION,
    status,
    mode: writeSourceInput ? 'write-source-input' : 'dry-run',
    draftInput: relativeToFrontendRoot(draftInputPath),
    sourceInput: relativeToFrontendRoot(sourceInputPath),
    targetBatchId: TARGET_BATCH_ID,
    targetPriority: TARGET_PRIORITY,
    totalRows: draftRows.length,
    approvedRows: approvedRows.length,
    copiedRows: copiedRows.length,
    sourceChangedRows: sourceChangedRows.length,
    sourceInputChanged,
    sourceInputWritten,
    productionDataChanged: false,
    templateChanged: false,
    blockers,
    warnings,
  };
  const safetyContract = [
    'This script imports approved P0 off-seat draft rows only into the P0 operator source input.',
    'Dry-run mode is the default and never writes the source input.',
    'The --write-source-input flag is required before any source input write.',
    '승인 row가 없으면 source input을 쓰지 않는다.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'It never changes DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, or the viewport contract.',
    'The currentPath must not be copied into correctedPath.',
    'Candidate paths remain reference-only and are blocked from source import as correctedPath.',
    'Draft markers are blocked from APPROVED rows before source import.',
    'No external crawling, web search, or coordinate inference is allowed.',
  ];
  const report = {
    generatedAt: new Date().toISOString(),
    packageVersion: IMPORT_VERSION,
    draftInputVersion: DRAFT_INPUT_VERSION,
    sourceInputVersion: SOURCE_INPUT_VERSION,
    targetBatchId: TARGET_BATCH_ID,
    targetPriority: TARGET_PRIORITY,
    expected: EXPECTED,
    summary,
    safetyContract,
    importRows,
    nextGateCommandsAfterSourceImport: [
      'npm run stadium:daegu:p0-operator-prewrite-gate',
      'npm run stadium:daegu:p0-operator-import:write-template',
    ],
  };

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'draftInput',
      'sourceInput',
      'blockId',
      'block',
      'operatorDecision',
      'approved',
      'copied',
      'sourceChanged',
      'correctedPathPointCount',
      'rowBlockers',
      'rowWarnings',
    ],
    ...importRows.map((row) => [
      summary.draftInput,
      summary.sourceInput,
      row.blockId,
      row.block,
      row.operatorDecision,
      row.approved,
      row.copied,
      row.sourceChanged,
      row.correctedPathPointCount,
      row.rowBlockers.join('; '),
      row.rowWarnings.join('; '),
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P0 Off-Seat Operator Import',
    '',
    `- import version: \`${IMPORT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- mode: \`${summary.mode}\``,
    `- draft input: \`${summary.draftInput}\``,
    `- source input: \`${summary.sourceInput}\``,
    `- rows: ${summary.totalRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- copied rows: ${summary.copiedRows}`,
    `- source input changed: ${summary.sourceInputChanged}`,
    `- source input written: ${summary.sourceInputWritten}`,
    `- JSON output: \`${relativeToFrontendRoot(jsonPath)}\``,
    `- CSV output: \`${relativeToFrontendRoot(csvPath)}\``,
    '',
    '## Safety',
    '',
    ...safetyContract.map((rule) => `- ${rule}`),
    '',
    '## Import Rows',
    '',
    markdownTable(
      ['block', 'decision', 'approved', 'copied', 'source changed', 'points', 'blockers', 'warnings'],
      importRows.map((row) => [
        `\`${row.block}\``,
        `\`${row.operatorDecision}\``,
        row.approved,
        row.copied,
        row.sourceChanged,
        row.correctedPathPointCount,
        row.rowBlockers.join('<br>') || '-',
        row.rowWarnings.join('<br>') || '-',
      ]),
    ),
    '',
    '## Next Gates',
    '',
    '```bash',
    'npm run stadium:daegu:p0-operator-prewrite-gate',
    'npm run stadium:daegu:p0-operator-import:write-template',
    '```',
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    status,
    mode: summary.mode,
    output: relativeToFrontendRoot(markdownPath),
    totalRows: summary.totalRows,
    approvedRows: summary.approvedRows,
    copiedRows: summary.copiedRows,
    sourceInputChanged: summary.sourceInputChanged,
    sourceInputWritten: summary.sourceInputWritten,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP0OffSeatOperatorInput = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

  const INPUT_VERSION = 'DAEGU_P0_OFF_SEAT_OPERATOR_INPUT_V1';
  const WORKSET_VERSION = 'DAEGU_P0_P1_OFF_SEAT_WORKSET_V1';
  const TARGET_BATCH_ID = 'BATCH_1_P0';
  const TARGET_PRIORITY = 'P0';
  const COPY_TARGET_SOURCE_INPUT = 'reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json';
  const MIN_OFFICIAL_TRACE_POINTS = 6;
  const EXPECTED = {
    expectedRows: 0,
    expectedP0Rows: 0,
    expectedDuplicateRows: 0,
    expectedApprovedRows: 0,
  };
  const EDITABLE_FIELDS = [
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const readJsonIfExists = async (filePath) => {
    if (!fsSync.existsSync(filePath)) return null;
    return readJson(filePath);
  };

  const normalizeDecision = (decision) => String(decision ?? 'NEEDS_RETRACE').trim() || 'NEEDS_RETRACE';

  const absoluteFromFrontendRoot = (filePath) => {
    if (!filePath) return '';
    return path.isAbsolute(filePath) ? filePath : path.join(frontendRoot, filePath);
  };

  const normalizePathText = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

  const pathPointCount = (pathText) => {
    const normalized = normalizePathText(pathText);
    if (!normalized) return 0;
    const matches = normalized.match(/[ML]\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?/gi);
    return matches ? matches.length : 0;
  };

  const hasValue = (value) => String(value ?? '').trim() !== '';

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const worksetPath = path.resolve(
    frontendRoot,
    argValue('--workset', path.join(reportDir, 'daegu-p0-p1-off-seat-workset.json')),
  );
  const jsonPath = path.join(reportDir, 'daegu-p0-off-seat-operator-input.json');
  const csvPath = path.join(reportDir, 'daegu-p0-off-seat-operator-input.csv');
  const markdownPath = path.join(reportDir, 'daegu-p0-off-seat-operator-input.md');
  const existingDraft = await readJsonIfExists(jsonPath);
  const existingRowsByBlockId = new Map((existingDraft?.corrections ?? []).map((row) => [row.blockId, row]));
  const blockers = [];
  const warnings = [];

  const workset = await readJson(worksetPath);
  const worksetRows = Array.isArray(workset.rows) ? workset.rows : [];

  if (workset.summary?.worksetVersion !== WORKSET_VERSION) {
    blockers.push(`WORKSET_VERSION_MISMATCH:${workset.summary?.worksetVersion ?? ''}`);
  }
  if (workset.summary?.status !== 'ready-for-operator') {
    blockers.push(`WORKSET_NOT_READY:${workset.summary?.status ?? ''}`);
  }

  const rows = worksetRows
    .filter((row) => row.queuePriority === TARGET_PRIORITY)
    .map((row) => {
      const existingRow = existingRowsByBlockId.get(row.blockId);
      const draftEditable = EDITABLE_FIELDS.reduce((editable, field) => ({
        ...editable,
        [field]: existingRow?.[field] ?? (field === 'operatorDecision' ? row.operatorDecision : row[field] ?? ''),
      }), {});
      const operatorDecision = normalizeDecision(draftEditable.operatorDecision);
      const correctedPath = String(draftEditable.correctedPath ?? '').trim();
      const correctedPathPointCount = pathPointCount(correctedPath);
      const evidenceAbsolutePath = absoluteFromFrontendRoot(row.evidenceCrop);
      const evidenceExists = Boolean(evidenceAbsolutePath) && fsSync.existsSync(evidenceAbsolutePath);
      const rowBlockers = [];
      const rowWarnings = [];

      if (row.batchId !== TARGET_BATCH_ID) rowBlockers.push(`ROW_BATCH_MISMATCH:${row.batchId ?? ''}`);
      if (row.queuePriority !== TARGET_PRIORITY) rowBlockers.push(`ROW_PRIORITY_NOT_P0:${row.queuePriority ?? ''}`);
      if (row.candidateDuplicateGroup) rowBlockers.push(`ROW_HAS_DUPLICATE_GROUP:${row.candidateDuplicateGroup}`);
      if (!evidenceExists) rowBlockers.push('MISSING_EVIDENCE_CROP');
      if (!DECISION_OPTIONS.has(operatorDecision)) rowBlockers.push(`INVALID_OPERATOR_DECISION:${operatorDecision}`);

      if (operatorDecision === 'APPROVED') {
        if (!hasValue(correctedPath)) rowBlockers.push('APPROVED_MISSING_CORRECTED_PATH');
        if (!hasValue(draftEditable.correctedLabelX) || !hasValue(draftEditable.correctedLabelY)) {
          rowBlockers.push('APPROVED_MISSING_CORRECTED_LABEL');
        }
        if (!hasValue(draftEditable.reviewer)) rowBlockers.push('APPROVED_MISSING_REVIEWER');
        if (!hasValue(draftEditable.reviewedAt)) rowBlockers.push('APPROVED_MISSING_REVIEWED_AT');
        if (correctedPathPointCount > 0 && correctedPathPointCount < MIN_OFFICIAL_TRACE_POINTS) {
          rowBlockers.push(`PATH_REQUIRES_AT_LEAST_SIX_POINTS:${correctedPathPointCount}`);
        }
        if (normalizePathText(correctedPath) && normalizePathText(correctedPath) === normalizePathText(row.currentPath)) {
          rowBlockers.push('APPROVED_CORRECTED_PATH_EQUALS_CURRENT_PATH');
        }
        if (normalizePathText(correctedPath) && normalizePathText(correctedPath) === normalizePathText(row.candidatePath)) {
          rowWarnings.push('APPROVED_CORRECTED_PATH_EQUALS_REFERENCE_CANDIDATE_PATH');
        }
      }

      blockers.push(...rowBlockers.map((blocker) => `${blocker}:${row.blockId}`));
      warnings.push(...rowWarnings.map((warning) => `${warning}:${row.blockId}`));

      return {
        sourceWorkset: path.relative(frontendRoot, worksetPath),
        sourceInput: row.sourceInput,
        copyTargetSourceInput: COPY_TARGET_SOURCE_INPUT,
        batchId: row.batchId,
        blockId: row.blockId,
        block: row.block,
        name: row.name,
        category: row.category,
        queuePriority: row.queuePriority,
        offSeatReason: row.offSeatReason,
        candidateStatus: row.candidateStatus,
        evidenceCrop: row.evidenceCrop,
        evidenceExists,
        currentPathUsage: 'DO_NOT_COPY_CURRENT_PATH_TO_CORRECTED_PATH',
        candidatePathUsage: 'REFERENCE_ONLY_REQUIRES_OPERATOR_VISUAL_APPROVAL',
        currentPath: row.currentPath,
        currentLabelX: row.currentLabelX,
        currentLabelY: row.currentLabelY,
        candidatePath: row.candidatePath,
        candidatePathPointCount: row.candidatePathPointCount,
        candidateCenterX: row.candidateCenterX,
        candidateCenterY: row.candidateCenterY,
        componentInsidePathRatio: row.componentInsidePathRatio,
        pathColorCoverageRatio: row.pathColorCoverageRatio,
        officialFailureReasons: row.officialFailureReasons,
        riskFlags: row.riskFlags,
        operatorDecision,
        correctedPath,
        correctedPathPointCount,
        correctedLabelX: draftEditable.correctedLabelX ?? '',
        correctedLabelY: draftEditable.correctedLabelY ?? '',
        reviewer: draftEditable.reviewer ?? '',
        reviewedAt: draftEditable.reviewedAt ?? '',
        operatorNote: draftEditable.operatorNote ?? '',
        editableSource: existingRow ? 'existing-draft' : 'generated-workset',
        rowBlockers,
        rowWarnings,
      };
    })
    .sort((left, right) => String(left.block).localeCompare(String(right.block), 'ko'));

  const p0Rows = rows.filter((row) => row.queuePriority === TARGET_PRIORITY);
  const duplicateRows = rows.filter((row) => row.candidateDuplicateGroup);
  const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
  const filledEditableRows = rows.filter((row) => (
    hasValue(row.correctedPath)
    || hasValue(row.correctedLabelX)
    || hasValue(row.correctedLabelY)
    || hasValue(row.reviewer)
    || hasValue(row.reviewedAt)
  ));

  if (rows.length !== EXPECTED.expectedRows) warnings.push(`P0_OFF_SEAT_OPERATOR_INPUT_ROWS_CHANGED:${rows.length}:${EXPECTED.expectedRows}`);
  if (p0Rows.length !== EXPECTED.expectedP0Rows) warnings.push(`P0_OFF_SEAT_ROWS_CHANGED:${p0Rows.length}:${EXPECTED.expectedP0Rows}`);
  if (duplicateRows.length !== EXPECTED.expectedDuplicateRows) warnings.push(`DUPLICATE_ROWS_PRESENT:${duplicateRows.length}:${EXPECTED.expectedDuplicateRows}`);
  if (approvedRows.length !== EXPECTED.expectedApprovedRows) warnings.push(`APPROVED_ROWS_PRESENT_IN_DRAFT_INPUT:${approvedRows.length}:${EXPECTED.expectedApprovedRows}`);

  const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator';
  const summary = {
    inputVersion: INPUT_VERSION,
    status,
    draftOnly: true,
    sourceOfTruth: false,
    productionWriteAllowed: false,
    sourceWorkset: path.relative(frontendRoot, worksetPath),
    copyTargetSourceInput: COPY_TARGET_SOURCE_INPUT,
    totalRows: rows.length,
    p0Rows: p0Rows.length,
    approvedRows: approvedRows.length,
    duplicateRows: duplicateRows.length,
    filledEditableRows: filledEditableRows.length,
    blockers,
    warnings,
    approvalRule: 'Copy approved rows into reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json before running P0 gates.',
  };

  const safetyContract = [
    'This draft helper is not a source of truth.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'It never changes DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, or the viewport contract.',
    'The currentPath must not be copied into correctedPath.',
    'Candidate paths remain reference-only and must not be promoted without operator approval.',
    'Approved rows must be copied into the P0 operator source input before any production write gate.',
    'No external crawling, web search, or coordinate inference is allowed.',
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    packageVersion: INPUT_VERSION,
    targetBatchId: TARGET_BATCH_ID,
    targetPriority: TARGET_PRIORITY,
    draftOnly: true,
    sourceOfTruth: false,
    productionWriteAllowed: false,
    sourceWorkset: path.relative(frontendRoot, worksetPath),
    copyTargetSourceInput: COPY_TARGET_SOURCE_INPUT,
    summary,
    safetyContract,
    requiredApprovalFields: [
      'operatorDecision=APPROVED',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
    ],
    nextGateCommandsAfterCopy: [
      'npm run stadium:daegu:p0-operator-prewrite-gate',
      'npm run stadium:daegu:p0-operator-import:write-template',
    ],
    corrections: rows,
  };

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'blockId',
      'block',
      'name',
      'category',
      'queuePriority',
      'sourceWorkset',
      'sourceInput',
      'copyTargetSourceInput',
      'operatorDecision',
      'correctedPath',
      'correctedPathPointCount',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
      'operatorNote',
      'offSeatReason',
      'evidenceCrop',
      'evidenceExists',
      'currentPathUsage',
      'candidatePathUsage',
      'currentPath',
      'currentLabelX',
      'currentLabelY',
      'candidatePath',
      'candidatePathPointCount',
      'candidateCenterX',
      'candidateCenterY',
      'componentInsidePathRatio',
      'pathColorCoverageRatio',
      'officialFailureReasons',
      'riskFlags',
      'rowBlockers',
      'rowWarnings',
    ],
    ...rows.map((row) => [
      row.blockId,
      row.block,
      row.name,
      row.category,
      row.queuePriority,
      row.sourceWorkset,
      row.sourceInput,
      row.copyTargetSourceInput,
      row.operatorDecision,
      row.correctedPath,
      row.correctedPathPointCount,
      row.correctedLabelX,
      row.correctedLabelY,
      row.reviewer,
      row.reviewedAt,
      row.operatorNote,
      row.offSeatReason,
      row.evidenceCrop,
      row.evidenceExists,
      row.currentPathUsage,
      row.candidatePathUsage,
      row.currentPath,
      row.currentLabelX,
      row.currentLabelY,
      row.candidatePath,
      row.candidatePathPointCount,
      row.candidateCenterX,
      row.candidateCenterY,
      row.componentInsidePathRatio,
      row.pathColorCoverageRatio,
      row.officialFailureReasons,
      row.riskFlags,
      row.rowBlockers.join('; '),
      row.rowWarnings.join('; '),
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P0 Off-Seat Operator Input Helper',
    '',
    `- input version: \`${INPUT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- draft only: ${summary.draftOnly}`,
    `- source of truth: ${summary.sourceOfTruth}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- source workset: \`${summary.sourceWorkset}\``,
    `- copy target source input: \`${summary.copyTargetSourceInput}\``,
    `- rows: ${summary.totalRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- duplicate rows: ${summary.duplicateRows}`,
    `- filled editable rows: ${summary.filledEditableRows}`,
    `- JSON output: \`${path.relative(frontendRoot, jsonPath)}\``,
    `- CSV output: \`${path.relative(frontendRoot, csvPath)}\``,
    '',
    '## Safety',
    '',
    ...safetyContract.map((rule) => `- ${rule}`),
    '',
    '## Draft Rows',
    '',
    markdownTable(
      ['block', 'decision', 'reason', 'corrected path points', 'label', 'reviewer', 'evidence', 'source input'],
      rows.map((row) => [
        `\`${row.block}\``,
        `\`${row.operatorDecision}\``,
        row.offSeatReason,
        row.correctedPathPointCount,
        hasValue(row.correctedLabelX) && hasValue(row.correctedLabelY)
          ? `${row.correctedLabelX},${row.correctedLabelY}`
          : 'blank',
        row.reviewer || 'blank',
        row.evidenceCrop ? `[crop](${row.evidenceCrop})` : '-',
        `\`${row.sourceInput}\``,
      ]),
    ),
    '',
    '## Copy Procedure',
    '',
    '- Fill this helper only as an operator draft.',
    '- Copy approved rows into `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json`.',
    '- Keep unapproved rows as `NEEDS_RETRACE` in the source input.',
    '- Run the P0 gate only after copying approved rows to the source input.',
    '',
    '```bash',
    'npm run stadium:daegu:p0-operator-prewrite-gate',
    'npm run stadium:daegu:p0-operator-import:write-template',
    '```',
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    status,
    output: path.relative(frontendRoot, markdownPath),
    totalRows: rows.length,
    p0Rows: p0Rows.length,
    approvedRows: approvedRows.length,
    duplicateRows: duplicateRows.length,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP0OperatorAudit = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP0ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p0-operator');

  const AUDIT_VERSION = 'DAEGU_P0_OPERATOR_AUDIT_V1';
  const TARGET_BATCH_ID = 'BATCH_1_P0';
  const EXPECTED = {
    rows: 3,
    manualTraceRequiredRows: 2,
    sharedCandidateBoundaryRows: 1,
    evidenceCropRows: 3,
  };

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const isBlank = (value) => String(value ?? '').trim() === '';

  const countInputRows = (rows) => ({
    total: rows.length,
    pending: rows.filter((row) => row.operatorDecision === 'PENDING').length,
    approved: rows.filter((row) => row.operatorDecision === 'APPROVED').length,
    decided: rows.filter((row) => row.operatorDecision && row.operatorDecision !== 'PENDING').length,
    filledPath: rows.filter((row) => !isBlank(row.correctedPath)).length,
    filledLabelX: rows.filter((row) => !isBlank(row.correctedLabelX)).length,
    filledLabelY: rows.filter((row) => !isBlank(row.correctedLabelY)).length,
    filledReviewer: rows.filter((row) => !isBlank(row.reviewer)).length,
    filledReviewedAt: rows.filter((row) => !isBlank(row.reviewedAt)).length,
    evidenceCrop: rows.filter((row) => !isBlank(row.evidenceCrop)).length,
  });

  const pushExpected = (blockers, label, actual, expected) => {
    if (actual !== expected) blockers.push(`${label}:${actual}!=${expected}`);
  };

  const p0ReportDir = path.resolve(frontendRoot, argValue('--p0-report-dir', defaultP0ReportDir));
  const packagePath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-package.json');
  const inputPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-input.json');

  const packageReport = await readJson(packagePath);
  const operatorInput = await readJson(inputPath);
  const inputRows = operatorInput.corrections ?? [];
  const inputCounts = countInputRows(inputRows);
  const blockers = [];

  if (packageReport.packageVersion !== 'DAEGU_P0_OPERATOR_PACKAGE_V1') {
    blockers.push(`PACKAGE_VERSION_MISMATCH:${packageReport.packageVersion ?? ''}`);
  }
  if (packageReport.status !== 'ok') blockers.push(`PACKAGE_STATUS_NOT_OK:${packageReport.status ?? ''}`);
  if (packageReport.targetBatchId !== TARGET_BATCH_ID) {
    blockers.push(`PACKAGE_BATCH_MISMATCH:${packageReport.targetBatchId ?? ''}`);
  }
  pushExpected(blockers, 'PACKAGE_ROWS', packageReport.totalRows, EXPECTED.rows);
  pushExpected(blockers, 'PACKAGE_EXPECTED_ROWS', packageReport.expectedRows, EXPECTED.rows);
  pushExpected(blockers, 'PACKAGE_MANUAL_TRACE_ROWS', packageReport.manualTraceRequiredRows, EXPECTED.manualTraceRequiredRows);
  pushExpected(blockers, 'PACKAGE_SHARED_CANDIDATE_ROWS', packageReport.sharedCandidateBoundaryRows, EXPECTED.sharedCandidateBoundaryRows);
  pushExpected(blockers, 'PACKAGE_EVIDENCE_ROWS', packageReport.evidenceCropRows, EXPECTED.evidenceCropRows);
  pushExpected(blockers, 'PACKAGE_APPROVED_ROWS', packageReport.approvedRows, 0);

  if (operatorInput.packageVersion !== 'DAEGU_P0_OPERATOR_PACKAGE_V1') {
    blockers.push(`INPUT_VERSION_MISMATCH:${operatorInput.packageVersion ?? ''}`);
  }
  if (operatorInput.targetBatchId !== TARGET_BATCH_ID) {
    blockers.push(`INPUT_BATCH_MISMATCH:${operatorInput.targetBatchId ?? ''}`);
  }
  if (operatorInput.draftOnly !== false) blockers.push('INPUT_DRAFT_ONLY_NOT_FALSE');
  if (operatorInput.productionWriteAllowed !== false) blockers.push('INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  pushExpected(blockers, 'INPUT_ROWS', inputCounts.total, EXPECTED.rows);
  pushExpected(blockers, 'INPUT_PENDING_ROWS', inputCounts.pending, EXPECTED.rows);
  pushExpected(blockers, 'INPUT_APPROVED_ROWS', inputCounts.approved, 0);
  pushExpected(blockers, 'INPUT_DECIDED_ROWS', inputCounts.decided, 0);
  pushExpected(blockers, 'INPUT_FILLED_PATH_ROWS', inputCounts.filledPath, 0);
  pushExpected(blockers, 'INPUT_FILLED_LABEL_X_ROWS', inputCounts.filledLabelX, 0);
  pushExpected(blockers, 'INPUT_FILLED_LABEL_Y_ROWS', inputCounts.filledLabelY, 0);
  pushExpected(blockers, 'INPUT_FILLED_REVIEWER_ROWS', inputCounts.filledReviewer, 0);
  pushExpected(blockers, 'INPUT_FILLED_REVIEWED_AT_ROWS', inputCounts.filledReviewedAt, 0);
  pushExpected(blockers, 'INPUT_EVIDENCE_ROWS', inputCounts.evidenceCrop, EXPECTED.evidenceCropRows);

  const summary = {
    auditVersion: AUDIT_VERSION,
    status: blockers.length === 0 ? 'ok' : 'failed',
    p0ReportDir: path.relative(frontendRoot, p0ReportDir),
    packageReport: path.relative(frontendRoot, packagePath),
    operatorInput: path.relative(frontendRoot, inputPath),
    packageCounts: {
      totalRows: packageReport.totalRows,
      expectedRows: packageReport.expectedRows,
      manualTraceRequiredRows: packageReport.manualTraceRequiredRows,
      sharedCandidateBoundaryRows: packageReport.sharedCandidateBoundaryRows,
      evidenceCropRows: packageReport.evidenceCropRows,
      approvedRows: packageReport.approvedRows,
      preservedEditableRows: packageReport.preservedEditableRows,
    },
    inputCounts,
    blockers,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
  };

  const jsonPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-audit.json');
  const csvPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-audit.csv');
  const markdownPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-audit.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'status',
      'packageRows',
      'inputRows',
      'pendingRows',
      'approvedRows',
      'decidedRows',
      'filledPathRows',
      'filledReviewerRows',
      'evidenceCropRows',
      'blockers',
    ],
    [
      summary.status,
      summary.packageCounts.totalRows,
      inputCounts.total,
      inputCounts.pending,
      inputCounts.approved,
      inputCounts.decided,
      inputCounts.filledPath,
      inputCounts.filledReviewer,
      inputCounts.evidenceCrop,
      blockers.join(' '),
    ],
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P0 Operator Audit',
    '',
    `- audit version: \`${AUDIT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- package report: \`${summary.packageReport}\``,
    `- operator input: \`${summary.operatorInput}\``,
    '',
    '## Counts',
    '',
    `- package rows: ${summary.packageCounts.totalRows}`,
    `- input rows: ${inputCounts.total}`,
    `- pending rows: ${inputCounts.pending}`,
    `- approved rows: ${inputCounts.approved}`,
    `- decided rows: ${inputCounts.decided}`,
    `- filled path rows: ${inputCounts.filledPath}`,
    `- evidence crop rows: ${inputCounts.evidenceCrop}`,
    '',
    '## Gate',
    '',
    'This audit is for the pre-approval P0 package state. It must be `ok` before operator edits begin.',
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p0_operator_audit_json:${jsonPath}`);
  console.log(`p0_operator_audit_csv:${csvPath}`);
  console.log(`p0_operator_audit_markdown:${markdownPath}`);
  console.log(`status:${summary.status} rows=${inputCounts.total} pending=${inputCounts.pending} approved=${inputCounts.approved}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runP0OperatorImport = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultInputPath = path.join(
    defaultReportDir,
    'daegu-p0-operator/daegu-seatmap-p0-operator-input.json',
  );

  const IMPORT_VERSION = 'DAEGU_P0_OPERATOR_IMPORT_V1';
  const TARGET_BATCH_ID = 'BATCH_1_P0';
  const TARGET_PRIORITY = 'P0';
  const TEMPLATE_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1';
  const DRAFT_REVIEWER = 'DRAFT_VALIDATION_ONLY';
  const DRAFT_REVIEWED_AT = '2026-05-10T00:00:00.000Z';
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);
  const IMPORT_FIELDS = [
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const CSV_HEADERS = [
    'blockId',
    'block',
    'name',
    'category',
    'queuePriority',
    'alignmentClass',
    'candidateStatus',
    'candidateDuplicateGroup',
    'recommendedAction',
    'evidenceCrop',
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const hasFlag = (name) => process.argv.includes(name);

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const normalizeEditableFields = (row) => ({
    operatorDecision: normalizeDecision(row.operatorDecision),
    correctedPath: String(row.correctedPath ?? '').trim(),
    correctedLabelX: row.correctedLabelX ?? '',
    correctedLabelY: row.correctedLabelY ?? '',
    reviewer: String(row.reviewer ?? '').trim(),
    reviewedAt: String(row.reviewedAt ?? '').trim(),
    operatorNote: String(row.operatorNote ?? '').trim(),
  });

  const rowChanged = (before, after) => IMPORT_FIELDS.some((field) => String(before[field] ?? '') !== String(after[field] ?? ''));

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const inputPath = path.resolve(frontendRoot, argValue('--input', defaultInputPath));
  const writeTemplate = hasFlag('--write-template');
  const templateJsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
  const templateCsvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.csv');
  const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');

  const input = await readJson(inputPath);
  const template = await readJson(templateJsonPath);
  const handoff = await readJson(handoffPath);

  const p0HandoffRows = (handoff.workItems ?? []).filter((row) => row.queuePriority === TARGET_PRIORITY);
  const expectedP0Ids = new Set(p0HandoffRows.map((row) => row.id));
  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
  const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
  const blockers = [];
  const warnings = [];

  if (input.packageVersion !== 'DAEGU_P0_OPERATOR_PACKAGE_V1') {
    blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  }
  if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  if (template.templateVersion !== TEMPLATE_VERSION) {
    blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  }
  if (inputRows.length !== expectedP0Ids.size) blockers.push(`P0_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${expectedP0Ids.size}`);

  const inputIds = new Set(inputRows.map((row) => row.blockId));
  const nonP0InputRows = inputRows.filter((row) => !expectedP0Ids.has(row.blockId));
  if (nonP0InputRows.length > 0) {
    blockers.push(`INPUT_HAS_NON_P0_ROWS:${nonP0InputRows.map((row) => row.blockId).join(' ')}`);
  }
  const missingP0Ids = [...expectedP0Ids].filter((blockId) => !inputIds.has(blockId));
  if (missingP0Ids.length > 0) blockers.push(`INPUT_MISSING_P0_ROWS:${missingP0Ids.join(' ')}`);

  const duplicateInputIds = inputRows
    .map((row) => row.blockId)
    .filter((blockId, index, blockIds) => blockIds.indexOf(blockId) !== index);
  if (duplicateInputIds.length > 0) blockers.push(`DUPLICATE_INPUT_BLOCK_ID:${[...new Set(duplicateInputIds)].join(' ')}`);

  const draftMarkerRows = inputRows.filter((row) => (
    row.reviewer === DRAFT_REVIEWER
    || row.reviewedAt === DRAFT_REVIEWED_AT
  ));
  if (writeTemplate && input.draftOnly === true) blockers.push('WRITE_TEMPLATE_INPUT_DRAFT_ONLY');
  if (writeTemplate && input.stagingOnly === true) blockers.push('WRITE_TEMPLATE_INPUT_STAGING_ONLY');
  if (writeTemplate && draftMarkerRows.length > 0) {
    blockers.push(`WRITE_TEMPLATE_HAS_DRAFT_MARKERS:${draftMarkerRows.map((row) => row.blockId).join(' ')}`);
  }

  const importedRows = [];
  const mergedRows = templateRows.map((templateRow) => {
    const inputRow = inputByBlockId.get(templateRow.blockId);
    if (!inputRow) return templateRow;

    const editable = normalizeEditableFields(inputRow);
    const mergedRow = {
      ...templateRow,
      ...editable,
    };
    const changed = rowChanged(templateRow, mergedRow);
    importedRows.push({
      blockId: templateRow.blockId,
      block: templateRow.block,
      queuePriority: templateRow.queuePriority,
      operatorDecision: mergedRow.operatorDecision,
      changed,
      approved: mergedRow.operatorDecision === 'APPROVED',
      decided: mergedRow.operatorDecision !== 'PENDING',
    });
    return mergedRow;
  });

  const changedRows = importedRows.filter((row) => row.changed);
  const decidedRows = importedRows.filter((row) => row.decided);
  const approvedRows = importedRows.filter((row) => row.approved);
  const pendingRows = importedRows.filter((row) => row.operatorDecision === 'PENDING');
  const invalidDecisionRows = importedRows.filter((row) => !DECISION_OPTIONS.has(row.operatorDecision));
  if (invalidDecisionRows.length > 0) {
    blockers.push(`INVALID_P0_OPERATOR_DECISION:${invalidDecisionRows.map((row) => row.blockId).join(' ')}`);
  }
  if (decidedRows.length === 0) warnings.push('NO_P0_OPERATOR_DECISIONS_TO_IMPORT');
  if (writeTemplate && blockers.length === 0 && decidedRows.length === 0) {
    blockers.push('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_P0_DECISION');
  }
  if (writeTemplate && approvedRows.length === 0) {
    blockers.push('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P0_ROW');
  }
  if (writeTemplate && pendingRows.length > 0) {
    blockers.push(`WRITE_TEMPLATE_REQUIRES_NO_P0_PENDING_ROWS:${pendingRows.map((row) => row.block).join(' ')}`);
  }

  const mergedTemplate = {
    ...template,
    generatedAt: new Date().toISOString(),
    corrections: mergedRows,
  };
  const summary = {
    importVersion: IMPORT_VERSION,
    status: blockers.length > 0 ? 'blocked' : 'ok',
    mode: writeTemplate ? 'write-template' : 'dry-run',
    targetBatchId: TARGET_BATCH_ID,
    input: path.relative(frontendRoot, inputPath),
    template: path.relative(frontendRoot, templateJsonPath),
    totalInputRows: inputRows.length,
    importedRows: importedRows.length,
    changedRows: changedRows.length,
    decidedRows: decidedRows.length,
    approvedRows: approvedRows.length,
    pendingRows: pendingRows.length,
    invalidDecisionRows: invalidDecisionRows.length,
    draftMarkerRows: draftMarkerRows.length,
    productionDataChanged: false,
    templateChanged: writeTemplate && blockers.length === 0,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    importedRows,
    safetyContract: [
      'This script only imports P0 operator decisions into the corrections template.',
      'It blocks write-template while any P0 row remains PENDING.',
      'It blocks write-template unless at least one P0 row is operatorDecision=APPROVED.',
      'It blocks write-template when draft/staging metadata or DRAFT_VALIDATION_ONLY markers are present.',
      'Do not run npm run stadium:daegu:operator-corrections after write-template because it regenerates the template from handoff defaults.',
      'It never modifies src/data/daeguSeatData.ts or promotes blocks to OFFICIAL_IMAGE_TRACED.',
      'Run validation, preview, dry-run apply, batches, status, and write-guard after importing operator decisions.',
    ],
  };

  const jsonPath = path.join(reportDir, 'daegu-seatmap-p0-operator-import.json');
  const csvPath = path.join(reportDir, 'daegu-seatmap-p0-operator-import.csv');
  const markdownPath = path.join(reportDir, 'daegu-seatmap-p0-operator-import.md');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'blockId',
      'block',
      'queuePriority',
      'operatorDecision',
      'changed',
      'approved',
      'decided',
    ],
    ...importedRows.map((row) => [
      row.blockId,
      row.block,
      row.queuePriority,
      row.operatorDecision,
      row.changed,
      row.approved,
      row.decided,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P0 Operator Import',
    '',
    `- import version: \`${IMPORT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- mode: \`${summary.mode}\``,
    `- input: \`${summary.input}\``,
    `- imported rows: ${summary.importedRows}`,
    `- changed rows: ${summary.changedRows}`,
    `- decided rows: ${summary.decidedRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- pending rows: ${summary.pendingRows}`,
    `- invalid decision rows: ${summary.invalidDecisionRows}`,
    `- draft marker rows: ${summary.draftMarkerRows}`,
    `- production data changed: ${summary.productionDataChanged}`,
    `- template changed: ${summary.templateChanged}`,
    '',
    '## Imported Rows',
    '',
    markdownTable(
      ['block', 'decision', 'changed', 'approved', 'decided'],
      importedRows.map((row) => [
        `\`${row.block}\``,
        `\`${row.operatorDecision}\``,
        String(row.changed),
        String(row.approved),
        String(row.decided),
      ]),
    ),
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Warnings',
    '',
    warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  if (writeTemplate && blockers.length === 0) {
    await fs.writeFile(templateJsonPath, `${JSON.stringify(mergedTemplate, null, 2)}\n`, 'utf8');
    await writeCsv(templateCsvPath, [
      CSV_HEADERS,
      ...mergedRows.map((row) => CSV_HEADERS.map((key) => row[key])),
    ]);
  }

  console.log(`p0_operator_import_json:${jsonPath}`);
  console.log(`p0_operator_import_csv:${csvPath}`);
  console.log(`p0_operator_import_markdown:${markdownPath}`);
  console.log(`status:${summary.status} mode=${summary.mode} imported=${summary.importedRows} changed=${summary.changedRows} decided=${summary.decidedRows} approved=${summary.approvedRows}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runP0OperatorPackage = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP0ReportDir = path.join(defaultReportDir, 'daegu-p0-operator');
  const defaultCropDir = path.join(defaultReportDir, 'daegu-handoff-evidence-crops');

  const PACKAGE_VERSION = 'DAEGU_P0_OPERATOR_PACKAGE_V1';
  const TARGET_BATCH_ID = 'BATCH_1_P0';
  const TARGET_PRIORITY = 'P0';
  const EXPECTED_P0_ROWS = 3;
  const REQUIRED_APPROVAL_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ];
  const allowClosedBatch = process.argv.includes('--allow-closed-batch');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const readOptionalJson = async (filePath) => {
    try {
      return await readJson(filePath);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  };

  const pointCount = (pathData) => (
    String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.length ?? 0
  ) / 2;

  const editableFieldsFrom = (row) => ({
    operatorDecision: String(row?.operatorDecision ?? 'PENDING').trim() || 'PENDING',
    correctedPath: String(row?.correctedPath ?? '').trim(),
    correctedLabelX: row?.correctedLabelX ?? '',
    correctedLabelY: row?.correctedLabelY ?? '',
    reviewer: String(row?.reviewer ?? '').trim(),
    reviewedAt: String(row?.reviewedAt ?? '').trim(),
    operatorNote: String(row?.operatorNote ?? '').trim(),
  });

  const isGeneratedRetraceNote = (note) => String(note ?? '').startsWith('No operator corrected path provided;');

  const hasOperatorFilledEditableFields = (row) => {
    const editable = editableFieldsFrom(row);
    const hasReviewMarker = Boolean(editable.reviewer)
      || Boolean(editable.reviewedAt)
      || (Boolean(editable.operatorNote) && !isGeneratedRetraceNote(editable.operatorNote));
    const hasCorrectedGeometry = Boolean(editable.correctedPath)
      || editable.correctedLabelX !== ''
      || editable.correctedLabelY !== '';
    return hasReviewMarker || hasCorrectedGeometry;
  };

  const evidenceCropFor = (row, cropFiles) => {
    const match = cropFiles.find((fileName) => fileName.includes(row.id));
    if (match) return `reports/stadium/daegu-handoff-evidence-crops/${match}`;
    return '';
  };

  const operatorActionFor = (row) => {
    if (row.candidateStatus === 'NEEDS_MANUAL_TRACE') return 'OPERATOR_MANUAL_TRACE_REQUIRED';
    if (row.recommendedAction === 'TRACE_SHARED_CANDIDATE_BOUNDARIES') {
      return 'OPERATOR_SEPARATE_SHARED_CANDIDATE_BOUNDARY';
    }
    return 'OPERATOR_CORRECTED_PATH_REQUIRED';
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const p0ReportDir = path.resolve(frontendRoot, argValue('--p0-report-dir', defaultP0ReportDir));
  const cropDir = path.resolve(frontendRoot, argValue('--crop-dir', defaultCropDir));
  const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
  const templatePath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
  const batchesPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-batches.json');
  const operatorInputJsonPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-input.json');
  const operatorInputCsvPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-input.csv');
  const checklistCsvPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-checklist.csv');
  const checklistMarkdownPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-checklist.md');
  const summaryJsonPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-package.json');
  const summaryMarkdownPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-package.md');

  const handoff = await readJson(handoffPath);
  const template = await readJson(templatePath);
  const batches = await readJson(batchesPath);
  const existingOperatorInput = await readOptionalJson(operatorInputJsonPath);
  const cropFiles = fsSync.existsSync(cropDir) ? await fs.readdir(cropDir) : [];
  const templateByBlockId = new Map((template.corrections ?? []).map((row) => [row.blockId, row]));
  const existingInputRows = Array.isArray(existingOperatorInput?.corrections)
    ? existingOperatorInput.corrections
    : [];
  const existingInputByBlockId = new Map(existingInputRows.map((row) => [row.blockId, row]));

  const p0Rows = (handoff.workItems ?? [])
    .filter((row) => row.queuePriority === TARGET_PRIORITY)
    .sort((a, b) => String(a.block).localeCompare(String(b.block), 'ko'));

  const packageRows = p0Rows.map((row) => {
    const templateRow = templateByBlockId.get(row.id) ?? {};
    const existingInputRow = existingInputByBlockId.get(row.id);
    const shouldPreserveExistingInput = hasOperatorFilledEditableFields(existingInputRow);
    const editableSourceRow = shouldPreserveExistingInput ? existingInputRow : templateRow;
    const editableFields = editableFieldsFrom(editableSourceRow);
    const candidatePath = row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath || '';
    const action = operatorActionFor(row);

    return {
      blockId: row.id,
      block: row.block,
      name: row.name,
      category: row.category,
      queuePriority: row.queuePriority,
      batchId: TARGET_BATCH_ID,
      alignmentClass: row.alignmentClass,
      candidateStatus: row.candidateStatus,
      recommendedAction: row.recommendedAction,
      operatorAction: action,
      evidenceCrop: evidenceCropFor(row, cropFiles),
      currentPath: row.currentPath,
      currentLabelX: row.labelX,
      currentLabelY: row.labelY,
      candidatePath,
      candidatePathPointCount: pointCount(candidatePath),
      candidateCenterX: row.candidateCenter?.x ?? '',
      candidateCenterY: row.candidateCenter?.y ?? '',
      candidateDuplicateGroup: row.candidateDuplicateGroup || '',
      candidateDuplicateIds: row.candidateDuplicateIds || '',
      componentInsidePathRatio: row.componentInsidePathRatio ?? '',
      pathColorCoverageRatio: row.pathColorCoverageRatio ?? '',
      officialFailureReasons: (row.officialFailureReasons ?? []).join('; '),
      riskFlags: (row.riskFlags ?? []).join('; '),
      editableSource: shouldPreserveExistingInput ? 'existingOperatorInput' : 'template',
      operatorDecision: editableFields.operatorDecision,
      correctedPath: editableFields.correctedPath,
      correctedLabelX: editableFields.correctedLabelX,
      correctedLabelY: editableFields.correctedLabelY,
      reviewer: editableFields.reviewer,
      reviewedAt: editableFields.reviewedAt,
      operatorNote: editableFields.operatorNote,
    };
  });

  const blockers = [];
  const warnings = [];
  if (p0Rows.length !== EXPECTED_P0_ROWS) {
    warnings.push(`P0_OPEN_ROW_COUNT_CHANGED_AFTER_WRITES:${p0Rows.length}:${EXPECTED_P0_ROWS}`);
  }
  if (batches.summary?.nextBatchId !== TARGET_BATCH_ID && batches.summary?.readyBatchId !== TARGET_BATCH_ID && !allowClosedBatch) {
    blockers.push(`NEXT_BATCH_NOT_P0:${batches.summary?.nextBatchId ?? ''}`);
  } else if (batches.summary?.nextBatchId !== TARGET_BATCH_ID && batches.summary?.readyBatchId !== TARGET_BATCH_ID) {
    warnings.push(`P0_BATCH_ALREADY_CLOSED:${batches.summary?.nextBatchId ?? ''}`);
  }
  const missingEvidenceRows = packageRows.filter((row) => !row.evidenceCrop);
  if (missingEvidenceRows.length > 0) {
    blockers.push(`MISSING_EVIDENCE_CROPS:${missingEvidenceRows.map((row) => row.block).join(' ')}`);
  }

  const summary = {
    packageVersion: PACKAGE_VERSION,
    status: blockers.length > 0 ? 'blocked' : 'ok',
    targetBatchId: TARGET_BATCH_ID,
    targetPriority: TARGET_PRIORITY,
    generatedAt: new Date().toISOString(),
    sourceHandoff: path.relative(frontendRoot, handoffPath),
    sourceTemplate: path.relative(frontendRoot, templatePath),
    sourceBatches: path.relative(frontendRoot, batchesPath),
    existingOperatorInput: path.relative(frontendRoot, operatorInputJsonPath),
    outputDirectory: path.relative(frontendRoot, p0ReportDir),
    totalRows: packageRows.length,
    expectedRows: packageRows.length,
    initialExpectedRows: EXPECTED_P0_ROWS,
    manualTraceRequiredRows: packageRows.filter((row) => row.operatorAction === 'OPERATOR_MANUAL_TRACE_REQUIRED').length,
    sharedCandidateBoundaryRows: packageRows.filter((row) => row.operatorAction === 'OPERATOR_SEPARATE_SHARED_CANDIDATE_BOUNDARY').length,
    evidenceCropRows: packageRows.filter((row) => row.evidenceCrop).length,
    approvedRows: packageRows.filter((row) => row.operatorDecision === 'APPROVED').length,
    existingInputRows: existingInputRows.length,
    preservedEditableRows: packageRows.filter((row) => row.editableSource === 'existingOperatorInput').length,
    templateEditableRows: packageRows.filter((row) => row.editableSource === 'template').length,
    allowClosedBatch,
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    blockers,
    warnings,
  };

  const packageJson = {
    generatedAt: summary.generatedAt,
    packageVersion: PACKAGE_VERSION,
    targetBatchId: TARGET_BATCH_ID,
    draftOnly: false,
    productionWriteAllowed: false,
    sourceHandoff: summary.sourceHandoff,
    sourceTemplate: summary.sourceTemplate,
    existingOperatorInput: summary.existingOperatorInput,
    safetyContract: [
      'Regenerating this package must preserve operator-filled P0 editable fields from the existing operator input file.',
      'This package is still not a production write path.',
    ],
    correctionContract: {
      coordinateSystem: 'official PNG 1707x2048',
      pathRules: ['single closed polygon', 'M/L/Z only', 'minimum 6 polygon points'],
      requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
      noCoordinateInference: true,
      noExternalCrawlingOrWebSearch: true,
    },
    operatorReviewContract: {
      alignmentStandard: 'official PNG 1707x2048',
      nonAutomaticPromotion: 'Do not promote automatically; operatorDecision=APPROVED plus corrected geometry and reviewer metadata are required.',
      operatorDecisionOptions: ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_OPERATOR_REVIEW'],
      operatorReviewInputFields: [
        'operatorDecision=APPROVED',
        'correctedPath',
        'correctedLabelX',
        'correctedLabelY',
        'reviewer',
        'reviewedAt',
        'operatorNote',
        'alignmentClass',
        'officialFailureReasons',
      ],
    },
    corrections: packageRows,
  };

  await fs.mkdir(p0ReportDir, { recursive: true });

  await fs.writeFile(operatorInputJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

  const editableCsvHeader = [
    'blockId',
    'block',
    'name',
    'batchId',
    'queuePriority',
    'operatorAction',
    'editableSource',
    'evidenceCrop',
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  await writeCsv(operatorInputCsvPath, [
    editableCsvHeader,
    ...packageRows.map((row) => editableCsvHeader.map((key) => row[key])),
  ]);

  const checklistCsvHeader = [
    'block',
    'blockId',
    'operatorAction',
    'candidateStatus',
    'recommendedAction',
    'candidatePathPointCount',
    'candidateDuplicateGroup',
    'componentInsidePathRatio',
    'pathColorCoverageRatio',
    'officialFailureReasons',
    'riskFlags',
    'editableSource',
    'evidenceCrop',
  ];
  await writeCsv(checklistCsvPath, [
    checklistCsvHeader,
    ...packageRows.map((row) => checklistCsvHeader.map((key) => row[key])),
  ]);

  await fs.writeFile(checklistMarkdownPath, [
    '# Daegu P0 Operator Checklist',
    '',
    `- package version: \`${PACKAGE_VERSION}\``,
    `- target batch: \`${TARGET_BATCH_ID}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- manual trace required rows: ${summary.manualTraceRequiredRows}`,
    `- shared candidate boundary rows: ${summary.sharedCandidateBoundaryRows}`,
    `- evidence crop rows: ${summary.evidenceCropRows}`,
    `- preserved editable rows: ${summary.preservedEditableRows}`,
    '',
    '## Operator Rules',
    '',
    '1. P0 row는 운영자가 official PNG `1707x2048` 좌표계에서 직접 corrected path를 승인해야 합니다.',
    '2. `candidatePath`는 참고용이며 운영자 승인 없이 production 좌표로 복사하지 않습니다.',
    '3. 승인하려면 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`을 채웁니다.',
    '4. path는 단일 폐합 polygon, `M/L/Z`, 최소 6개 point 조건을 만족해야 합니다.',
    '5. 승인할 수 없으면 `REJECTED` 또는 `NEEDS_RETRACE`로 남기고 다음 batch로 넘기지 않습니다.',
    '6. package를 다시 생성해도 기존 operator input의 입력된 editable field는 보존합니다.',
    '',
    '## Rows',
    '',
    markdownTable(
      [
        'block',
        'action',
        'candidate',
        'points',
        'duplicate',
        'inside',
        'coverage',
        'failures',
        'editable source',
        'evidence crop',
      ],
      packageRows.map((row) => [
        `\`${row.block}\``,
        `\`${row.operatorAction}\``,
        `\`${row.candidateStatus}\``,
        row.candidatePathPointCount,
        row.candidateDuplicateGroup || '-',
        row.componentInsidePathRatio || '-',
        row.pathColorCoverageRatio || '-',
        row.officialFailureReasons || '-',
        `\`${row.editableSource}\``,
        row.evidenceCrop,
      ]),
    ),
    '',
    '## Editable Inputs',
    '',
    '- `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json`',
    '- `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.csv`',
    '',
  ].join('\n'), 'utf8');

  await fs.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(summaryMarkdownPath, [
    '# Daegu P0 Operator Package',
    '',
    `- package version: \`${PACKAGE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- target batch: \`${summary.targetBatchId}\``,
    `- rows: ${summary.totalRows}`,
    `- evidence crop rows: ${summary.evidenceCropRows}`,
    `- approved rows in package: ${summary.approvedRows}`,
    `- existing input rows: ${summary.existingInputRows}`,
    `- preserved editable rows: ${summary.preservedEditableRows}`,
    '',
    '## Outputs',
    '',
    '- `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json`',
    '- `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.csv`',
    '- `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-checklist.md`',
    '- `reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-checklist.csv`',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0
      ? markdownTable(['blocker'], summary.blockers.map((blocker) => [blocker]))
      : 'No package blockers.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p0_operator_package_json:${summaryJsonPath}`);
  console.log(`p0_operator_package_markdown:${summaryMarkdownPath}`);
  console.log(`p0_operator_checklist_markdown:${checklistMarkdownPath}`);
  console.log(`p0_operator_input_json:${operatorInputJsonPath}`);
  console.log(`status:${summary.status} p0=${summary.totalRows} evidence=${summary.evidenceCropRows} approved=${summary.approvedRows}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runP0OperatorReadiness = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP0ReportDir = path.join(defaultReportDir, 'daegu-p0-operator');

  const READINESS_VERSION = 'DAEGU_P0_OPERATOR_READINESS_V1';
  const PACKAGE_VERSION = 'DAEGU_P0_OPERATOR_PACKAGE_V1';
  const IMPORT_VERSION = 'DAEGU_P0_OPERATOR_IMPORT_V1';
  const VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';
  const TARGET_BATCH_ID = 'BATCH_1_P0';
  const EXPECTED_ROWS = 3;
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const readJsonReport = async (filePath) => {
    try {
      return {
        path: filePath,
        relativePath: path.relative(frontendRoot, filePath),
        exists: true,
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: '',
      };
    } catch (error) {
      return {
        path: filePath,
        relativePath: path.relative(frontendRoot, filePath),
        exists: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

  const isBlank = (value) => String(value ?? '').trim() === '';

  const numberOrZero = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const boolOrFalse = (value) => value === true;

  const p0ReportDir = path.resolve(frontendRoot, argValue('--p0-report-dir', defaultP0ReportDir));
  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const packagePath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-package.json');
  const inputPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-input.json');
  const validationPath = path.join(p0ReportDir, 'daegu-seatmap-operator-corrections-validation.json');
  const importPath = path.join(reportDir, 'daegu-seatmap-p0-operator-import.json');

  const reports = {
    package: await readJsonReport(packagePath),
    input: await readJsonReport(inputPath),
    validation: await readJsonReport(validationPath),
    import: await readJsonReport(importPath),
  };

  const packageReport = reports.package.data ?? {};
  const input = reports.input.data ?? {};
  const validationSummary = reports.validation.data?.summary ?? {};
  const importSummary = reports.import.data?.summary ?? {};
  const validationRows = Array.isArray(reports.validation.data?.rows) ? reports.validation.data.rows : [];
  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const validationByBlockId = new Map(validationRows.map((row) => [row.blockId, row]));
  const expectedRows = Number.isFinite(Number(packageReport.totalRows))
    ? Number(packageReport.totalRows)
    : EXPECTED_ROWS;

  const rows = inputRows.map((row) => {
    const decision = normalizeDecision(row.operatorDecision);
    const validationRow = validationByBlockId.get(row.blockId) ?? {};
    return {
      blockId: row.blockId,
      block: row.block,
      decision,
      pending: decision === 'PENDING',
      approved: decision === 'APPROVED',
      rejected: decision === 'REJECTED',
      needsRetrace: decision === 'NEEDS_RETRACE',
      invalidDecision: !DECISION_OPTIONS.has(decision),
      hasCorrectedPath: !isBlank(row.correctedPath),
      hasCorrectedLabelX: !isBlank(row.correctedLabelX),
      hasCorrectedLabelY: !isBlank(row.correctedLabelY),
      hasReviewer: !isBlank(row.reviewer),
      hasReviewedAt: !isBlank(row.reviewedAt),
      validForApproval: validationRow.validForApproval === true,
      reasons: Array.isArray(validationRow.reasons) ? validationRow.reasons : [],
      warnings: Array.isArray(validationRow.warnings) ? validationRow.warnings : [],
    };
  });

  const pendingRows = rows.filter((row) => row.pending);
  const decidedRows = rows.filter((row) => !row.pending);
  const approvedRows = rows.filter((row) => row.approved);
  const rejectedRows = rows.filter((row) => row.rejected);
  const needsRetraceRows = rows.filter((row) => row.needsRetrace);
  const invalidDecisionRows = rows.filter((row) => row.invalidDecision);
  const filledPathRows = rows.filter((row) => row.hasCorrectedPath);
  const filledReviewerRows = rows.filter((row) => row.hasReviewer);
  const blockerRows = rows.filter((row) => row.reasons.length > 0);

  const blockers = [];
  const warnings = [];

  Object.values(reports).forEach((report) => {
    if (!report.exists) blockers.push(`MISSING_REPORT:${report.relativePath}`);
  });

  if (reports.package.exists && packageReport.packageVersion !== PACKAGE_VERSION) {
    blockers.push(`PACKAGE_VERSION_MISMATCH:${packageReport.packageVersion ?? ''}`);
  }
  if (reports.package.exists && packageReport.targetBatchId !== TARGET_BATCH_ID) {
    blockers.push(`PACKAGE_BATCH_MISMATCH:${packageReport.targetBatchId ?? ''}`);
  }
  if (reports.input.exists && input.packageVersion !== PACKAGE_VERSION) {
    blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  }
  if (reports.input.exists && input.targetBatchId !== TARGET_BATCH_ID) {
    blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  }
  if (reports.input.exists && input.draftOnly !== false) blockers.push('INPUT_DRAFT_ONLY_NOT_FALSE');
  if (reports.input.exists && input.productionWriteAllowed !== false) {
    blockers.push('INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  }
  if (rows.length !== expectedRows) blockers.push(`P0_INPUT_ROW_COUNT_MISMATCH:${rows.length}:${expectedRows}`);
  if (invalidDecisionRows.length > 0) {
    blockers.push(`INVALID_P0_OPERATOR_DECISION:${invalidDecisionRows.map((row) => row.blockId).join(' ')}`);
  }
  if (pendingRows.length > 0) {
    blockers.push(`P0_PENDING_ROWS_REMAIN:${pendingRows.map((row) => row.block).join(' ')}`);
  }
  if (decidedRows.length === 0) blockers.push('NO_P0_OPERATOR_DECISIONS');

  if (reports.validation.exists && validationSummary.validationVersion !== VALIDATION_VERSION) {
    blockers.push(`VALIDATION_VERSION_MISMATCH:${validationSummary.validationVersion ?? ''}`);
  }
  if (reports.validation.exists && validationSummary.status !== 'ok') blockers.push('P0_VALIDATION_STATUS_NOT_OK');

  const validationApprovedRows = numberOrZero(validationSummary.approvedRows);
  const validApprovedRows = numberOrZero(validationSummary.validApprovedRows);
  const invalidApprovedRows = numberOrZero(validationSummary.invalidApprovedRows);
  const invalidMetadataRows = numberOrZero(validationSummary.invalidMetadataRows);
  if (reports.validation.exists && validationApprovedRows !== approvedRows.length) {
    blockers.push(`P0_VALIDATION_APPROVED_ROWS_MISMATCH:${validationApprovedRows}:${approvedRows.length}`);
  }
  if (invalidApprovedRows > 0) blockers.push(`P0_INVALID_APPROVED_ROWS:${invalidApprovedRows}`);
  if (invalidMetadataRows > 0) blockers.push(`P0_INVALID_METADATA_ROWS:${invalidMetadataRows}`);
  if (approvedRows.length > 0 && validApprovedRows !== approvedRows.length) {
    blockers.push(`P0_VALID_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${validApprovedRows}:${approvedRows.length}`);
  }

  if (reports.import.exists && importSummary.importVersion !== IMPORT_VERSION) {
    blockers.push(`IMPORT_VERSION_MISMATCH:${importSummary.importVersion ?? ''}`);
  }
  if (reports.import.exists && importSummary.status !== 'ok') blockers.push('P0_IMPORT_DRY_RUN_STATUS_NOT_OK');
  if (reports.import.exists && importSummary.mode !== 'dry-run') {
    blockers.push(`P0_IMPORT_REPORT_NOT_DRY_RUN:${importSummary.mode ?? ''}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.importedRows) !== expectedRows) {
    blockers.push(`P0_IMPORT_ROWS_MISMATCH:${importSummary.importedRows ?? ''}:${expectedRows}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.decidedRows) !== decidedRows.length) {
    blockers.push(`P0_IMPORT_DECIDED_ROWS_MISMATCH:${importSummary.decidedRows ?? ''}:${decidedRows.length}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.approvedRows) !== approvedRows.length) {
    blockers.push(`P0_IMPORT_APPROVED_ROWS_MISMATCH:${importSummary.approvedRows ?? ''}:${approvedRows.length}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.pendingRows) !== pendingRows.length) {
    blockers.push(`P0_IMPORT_PENDING_ROWS_MISMATCH:${importSummary.pendingRows ?? ''}:${pendingRows.length}`);
  }
  if (reports.import.exists && boolOrFalse(importSummary.productionDataChanged)) {
    blockers.push('P0_IMPORT_CHANGED_PRODUCTION_DATA');
  }

  if (approvedRows.length === 0) warnings.push('NO_APPROVED_P0_ROWS_TEMPLATE_IMPORT_WILL_BLOCK');
  if (filledPathRows.length > approvedRows.length) warnings.push('CORRECTED_PATH_FILLED_FOR_NON_APPROVED_ROWS');
  if (filledReviewerRows.length > approvedRows.length) warnings.push('REVIEWER_FILLED_FOR_NON_APPROVED_ROWS');

  const awaitingOperatorInput = blockers.length === 0 && approvedRows.length === 0;
  const readyForTemplateImport = blockers.length === 0 && approvedRows.length > 0;
  const readyForGuardedWriteAfterTemplateImport = readyForTemplateImport && approvedRows.length > 0;

  const summary = {
    readinessVersion: READINESS_VERSION,
    status: blockers.length > 0 ? 'blocked' : readyForTemplateImport ? 'ready' : 'waiting-for-operator',
    awaitingOperatorInput,
    readyForTemplateImport,
    readyForGuardedWriteAfterTemplateImport,
    targetBatchId: TARGET_BATCH_ID,
    expectedRows,
    initialExpectedRows: EXPECTED_ROWS,
    totalRows: rows.length,
    pendingRows: pendingRows.length,
    decidedRows: decidedRows.length,
    approvedRows: approvedRows.length,
    rejectedRows: rejectedRows.length,
    needsRetraceRows: needsRetraceRows.length,
    invalidDecisionRows: invalidDecisionRows.length,
    filledPathRows: filledPathRows.length,
    filledReviewerRows: filledReviewerRows.length,
    validationStatus: validationSummary.status ?? '',
    validationApprovedRows,
    validApprovedRows,
    invalidApprovedRows,
    invalidMetadataRows,
    importStatus: importSummary.status ?? '',
    importMode: importSummary.mode ?? '',
    importChangedRows: numberOrZero(importSummary.changedRows),
    importDecidedRows: numberOrZero(importSummary.decidedRows),
    importApprovedRows: numberOrZero(importSummary.approvedRows),
    importPendingRows: numberOrZero(importSummary.pendingRows),
    productionDataChanged: boolOrFalse(importSummary.productionDataChanged),
    blockerRows: blockerRows.length,
    blockers,
    warnings,
    validateCommand: 'npm run stadium:daegu:p0-operator-validate',
    importDryRunCommand: 'npm run stadium:daegu:p0-operator-import',
    templateImportCommand: 'npm run stadium:daegu:p0-operator-import:write-template',
    guardedWriteCommand: 'npm run stadium:daegu:operator-corrections-write',
    postWriteGateCommand: 'npm run stadium:daegu:operator-corrections-postwrite-gate',
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    sourceReports: Object.fromEntries(
      Object.entries(reports).map(([key, sourceReport]) => [
        key,
        {
          path: sourceReport.relativePath,
          exists: sourceReport.exists,
          error: sourceReport.error,
        },
      ]),
    ),
    safetyContract: [
      'This readiness gate is read-only and never modifies the main corrections template.',
      'It must be run after npm run stadium:daegu:p0-operator-validate and npm run stadium:daegu:p0-operator-import.',
      'It blocks template import while any P0 row remains PENDING.',
      'It blocks template import unless at least one P0 row is operatorDecision=APPROVED.',
      'It does not allow production write directly; production write still requires npm run stadium:daegu:operator-corrections-write.',
      'Do not run npm run stadium:daegu:operator-corrections after p0-operator-import:write-template.',
    ],
    rows,
    nextActions: readyForTemplateImport
      ? [
        'Run npm run stadium:daegu:p0-operator-import:write-template.',
        'Then run npm run stadium:daegu:operator-corrections-write.',
      ]
      : awaitingOperatorInput
        ? [
          'Fill at least one P0 source input row with operatorDecision=APPROVED.',
          'Approved rows require correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt.',
          'Run npm run stadium:daegu:p0-operator-validate.',
          'Run npm run stadium:daegu:p0-operator-import.',
          'Re-run npm run stadium:daegu:p0-operator-readiness.',
        ]
      : [
        'Resolve blockers in the P0 operator input.',
        'Run npm run stadium:daegu:p0-operator-validate.',
        'Run npm run stadium:daegu:p0-operator-import.',
        'Re-run npm run stadium:daegu:p0-operator-readiness.',
      ],
  };

  const jsonPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-readiness.json');
  const csvPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-readiness.csv');
  const markdownPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-readiness.md');

  await fs.mkdir(p0ReportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'blockId',
      'block',
      'decision',
      'validForApproval',
      'hasCorrectedPath',
      'hasCorrectedLabelX',
      'hasCorrectedLabelY',
      'hasReviewer',
      'hasReviewedAt',
      'reasons',
      'warnings',
    ],
    ...rows.map((row) => [
      row.blockId,
      row.block,
      row.decision,
      row.validForApproval,
      row.hasCorrectedPath,
      row.hasCorrectedLabelX,
      row.hasCorrectedLabelY,
      row.hasReviewer,
      row.hasReviewedAt,
      row.reasons.join(' '),
      row.warnings.join(' '),
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P0 Operator Readiness',
    '',
    `- readiness version: \`${READINESS_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- awaiting operator input: ${summary.awaitingOperatorInput}`,
    `- ready for template import: ${summary.readyForTemplateImport}`,
    `- ready for guarded write after template import: ${summary.readyForGuardedWriteAfterTemplateImport}`,
    `- pending rows: ${summary.pendingRows}`,
    `- decided rows: ${summary.decidedRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- rejected rows: ${summary.rejectedRows}`,
    `- needs retrace rows: ${summary.needsRetraceRows}`,
    `- invalid decision rows: ${summary.invalidDecisionRows}`,
    `- valid approved rows: ${summary.validApprovedRows}`,
    `- invalid approved rows: ${summary.invalidApprovedRows}`,
    `- import dry-run status: \`${summary.importStatus || 'missing'}\``,
    `- import dry-run changed rows: ${summary.importChangedRows}`,
    `- production data changed: ${summary.productionDataChanged}`,
    '',
    '## Rows',
    '',
    markdownTable(
      [
        'block',
        'decision',
        'valid',
        'path',
        'label x',
        'label y',
        'reviewer',
        'reviewed at',
        'reasons',
      ],
      rows.map((row) => [
        row.block ? `\`${row.block}\`` : row.blockId,
        `\`${row.decision}\``,
        String(row.validForApproval),
        String(row.hasCorrectedPath),
        String(row.hasCorrectedLabelX),
        String(row.hasCorrectedLabelY),
        String(row.hasReviewer),
        String(row.hasReviewedAt),
        row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Gate',
    '',
    '1. 이 readiness는 read-only이며 main template과 `src/data/daeguSeatData.ts`를 수정하지 않습니다.',
    '2. P0 3건 중 `PENDING` row가 남아 있으면 template import를 진행하지 않습니다.',
    '3. 승인된 P0 row가 1건 이상 있어야 template import를 진행할 수 있습니다.',
    '4. `APPROVED` row가 있으면 validation에서 `validForApproval=true`여야 합니다.',
    '5. readiness가 통과해도 production write는 `npm run stadium:daegu:operator-corrections-write` guard를 다시 통과해야 합니다.',
    '6. `p0-operator-import:write-template` 이후에는 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않습니다.',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
    '## Next Actions',
    '',
    report.nextActions.map((action, index) => `${index + 1}. ${action}`).join('\n'),
    '',
  ].join('\n'), 'utf8');

  console.log(`p0_operator_readiness_json:${jsonPath}`);
  console.log(`p0_operator_readiness_csv:${csvPath}`);
  console.log(`p0_operator_readiness_markdown:${markdownPath}`);
  console.log(`status:${summary.status} readyForTemplateImport=${summary.readyForTemplateImport} pending=${summary.pendingRows} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows}`);

  if (!summary.readyForTemplateImport) {
    process.exitCode = 1;
  }
};

const runP0P1OffSeatWorkset = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

  const WORKSET_VERSION = 'DAEGU_P0_P1_OFF_SEAT_WORKSET_V1';
  const OFF_SEAT_INTAKE_VERSION = 'DAEGU_OFF_SEAT_RETRACE_INTAKE_V1';
  const EXPECTED = {
    expectedRows: 5,
    expectedP0Rows: 0,
    expectedP1Rows: 5,
    expectedDuplicateRows: 0,
    expectedApprovedRows: 0,
  };
  const PRIORITY_ORDER = {
    P0: 1,
    P1: 2,
  };

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const absoluteFromFrontendRoot = (filePath) => {
    if (!filePath) return '';
    return path.isAbsolute(filePath) ? filePath : path.join(frontendRoot, filePath);
  };

  const hasEditableApprovalFields = (row) => (
    String(row.correctedPath ?? '').trim() !== ''
    || String(row.correctedLabelX ?? '').trim() !== ''
    || String(row.correctedLabelY ?? '').trim() !== ''
    || String(row.reviewer ?? '').trim() !== ''
    || String(row.reviewedAt ?? '').trim() !== ''
  );

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const inputPath = path.resolve(
    frontendRoot,
    argValue('--input', path.join(reportDir, 'daegu-off-seat-retrace-intake.json')),
  );
  const blockers = [];
  const warnings = [];

  const offSeatIntake = await readJson(inputPath);
  const intakeRows = Array.isArray(offSeatIntake.rows) ? offSeatIntake.rows : [];

  if (offSeatIntake.summary?.intakeVersion !== OFF_SEAT_INTAKE_VERSION) {
    blockers.push(`OFF_SEAT_INTAKE_VERSION_MISMATCH:${offSeatIntake.summary?.intakeVersion ?? ''}`);
  }
  if (offSeatIntake.summary?.status !== 'ready-for-operator') {
    blockers.push(`OFF_SEAT_INTAKE_NOT_READY:${offSeatIntake.summary?.status ?? ''}`);
  }

  const rows = intakeRows
    .filter((row) => row.intakeTier === 'P0_P1_OFF_SEAT_FIRST')
    .map((row) => {
      const evidenceAbsolutePath = absoluteFromFrontendRoot(row.evidenceCrop);
      const evidenceExists = Boolean(evidenceAbsolutePath) && fsSync.existsSync(evidenceAbsolutePath);
      const worksetBlockers = [];

      if (!['P0', 'P1'].includes(row.queuePriority)) {
        worksetBlockers.push(`ROW_PRIORITY_NOT_P0_P1:${row.queuePriority ?? ''}`);
      }
      if (row.candidateDuplicateGroup) {
        worksetBlockers.push(`ROW_HAS_DUPLICATE_GROUP:${row.candidateDuplicateGroup}`);
      }
      if (!evidenceExists) {
        worksetBlockers.push('MISSING_EVIDENCE_CROP');
      }

      blockers.push(...worksetBlockers.map((blocker) => `${blocker}:${row.blockId}`));

      return {
        ...row,
        sourceOffSeatIntake: path.relative(frontendRoot, inputPath),
        worksetBlockers,
        evidenceExists,
        hasEditableApprovalFields: hasEditableApprovalFields(row),
        approvalInstruction: 'Copy an operator-traced official PNG polygon into the source operator input row, then set operatorDecision=APPROVED with correctedLabelX, correctedLabelY, reviewer, and reviewedAt.',
      };
    })
    .sort((left, right) => (
      (PRIORITY_ORDER[left.queuePriority] ?? 99) - (PRIORITY_ORDER[right.queuePriority] ?? 99)
      || left.batchOrder - right.batchOrder
      || String(left.block).localeCompare(String(right.block), 'ko')
    ));

  const p0Rows = rows.filter((row) => row.queuePriority === 'P0');
  const p1Rows = rows.filter((row) => row.queuePriority === 'P1');
  const duplicateRows = rows.filter((row) => row.candidateDuplicateGroup);
  const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
  const filledEditableRows = rows.filter((row) => row.hasEditableApprovalFields);
  const priorityCounts = rows.reduce((counts, row) => ({
    ...counts,
    [row.queuePriority]: (counts[row.queuePriority] ?? 0) + 1,
  }), {});
  const reasonCounts = rows.reduce((counts, row) => ({
    ...counts,
    [row.offSeatReason]: (counts[row.offSeatReason] ?? 0) + 1,
  }), {});

  if (rows.length !== EXPECTED.expectedRows) warnings.push(`P0_P1_OFF_SEAT_WORKSET_ROWS_CHANGED:${rows.length}:${EXPECTED.expectedRows}`);
  if (p0Rows.length !== EXPECTED.expectedP0Rows) warnings.push(`P0_OFF_SEAT_ROWS_CHANGED:${p0Rows.length}:${EXPECTED.expectedP0Rows}`);
  if (p1Rows.length !== EXPECTED.expectedP1Rows) warnings.push(`P1_OFF_SEAT_ROWS_CHANGED:${p1Rows.length}:${EXPECTED.expectedP1Rows}`);
  if (duplicateRows.length !== EXPECTED.expectedDuplicateRows) warnings.push(`DUPLICATE_ROWS_PRESENT:${duplicateRows.length}:${EXPECTED.expectedDuplicateRows}`);
  if (approvedRows.length !== EXPECTED.expectedApprovedRows) warnings.push(`APPROVED_ROWS_PRESENT_IN_WORKSET:${approvedRows.length}:${EXPECTED.expectedApprovedRows}`);

  const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator';
  const summary = {
    worksetVersion: WORKSET_VERSION,
    status,
    productionWriteAllowed: false,
    sourceOffSeatIntake: path.relative(frontendRoot, inputPath),
    totalRows: rows.length,
    p0Rows: p0Rows.length,
    p1Rows: p1Rows.length,
    approvedRows: approvedRows.length,
    duplicateRows: duplicateRows.length,
    filledEditableRows: filledEditableRows.length,
    priorityCounts,
    reasonCounts,
    blockers,
    warnings,
    approvalRule: 'Only operatorDecision=APPROVED rows with correctedPath/correctedLabelX/correctedLabelY/reviewer/reviewedAt can enter production write gates.',
  };

  const safetyContract = [
    'This P0/P1 off-seat workset is a read-only operator tracing aid.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'It never changes DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, or the viewport contract.',
    'The currentPath is a suspected bad legacy path and must not be reused as the correctedPath.',
    'Candidate paths remain reference-only and must not be promoted without operator approval.',
    'Rows with candidateDuplicateGroup are excluded from this workset.',
    'No external crawling, web search, or coordinate inference is allowed.',
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract,
    requiredApprovalFields: [
      'operatorDecision=APPROVED',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
    ],
    nextGateCommands: {
      p0: [
        'npm run stadium:daegu:p0-operator-prewrite-gate',
        'npm run stadium:daegu:p0-operator-import:write-template',
      ],
      p1: [
        'npm run stadium:daegu:p1-operator-prewrite-gate',
        'npm run stadium:daegu:p1-operator-import:write-template',
      ],
    },
    rows,
  };

  const jsonPath = path.join(reportDir, 'daegu-p0-p1-off-seat-workset.json');
  const csvPath = path.join(reportDir, 'daegu-p0-p1-off-seat-workset.csv');
  const markdownPath = path.join(reportDir, 'daegu-p0-p1-off-seat-workset.md');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'sourceOffSeatIntake',
      'sourceInput',
      'batchId',
      'blockId',
      'block',
      'name',
      'category',
      'queuePriority',
      'operatorDecision',
      'offSeatReason',
      'recommendedOperatorAction',
      'candidateStatus',
      'evidenceCrop',
      'evidenceExists',
      'currentPath',
      'currentLabelX',
      'currentLabelY',
      'candidatePath',
      'candidatePathPointCount',
      'candidateCenterX',
      'candidateCenterY',
      'candidateDuplicateGroup',
      'candidateDuplicateIds',
      'componentInsidePathRatio',
      'pathColorCoverageRatio',
      'officialFailureReasons',
      'riskFlags',
      'operatorDecisionTarget',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
      'operatorNote',
      'approvalInstruction',
    ],
    ...rows.map((row) => [
      row.sourceOffSeatIntake,
      row.sourceInput,
      row.batchId,
      row.blockId,
      row.block,
      row.name,
      row.category,
      row.queuePriority,
      row.operatorDecision,
      row.offSeatReason,
      row.recommendedOperatorAction,
      row.candidateStatus,
      row.evidenceCrop,
      row.evidenceExists,
      row.currentPath,
      row.currentLabelX,
      row.currentLabelY,
      row.candidatePath,
      row.candidatePathPointCount,
      row.candidateCenterX,
      row.candidateCenterY,
      row.candidateDuplicateGroup,
      row.candidateDuplicateIds,
      row.componentInsidePathRatio,
      row.pathColorCoverageRatio,
      row.officialFailureReasons,
      row.riskFlags,
      'operatorDecision=APPROVED',
      row.correctedPath,
      row.correctedLabelX,
      row.correctedLabelY,
      row.reviewer,
      row.reviewedAt,
      row.operatorNote,
      row.approvalInstruction,
    ]),
  ]);

  const rowTable = (tableRows) => markdownTable(
    ['priority', 'batch', 'block', 'category', 'decision', 'reason', 'candidate', 'inside', 'coverage', 'evidence', 'source input'],
    tableRows.map((row) => [
      `\`${row.queuePriority}\``,
      `\`${row.batchId}\``,
      `\`${row.block}\``,
      row.category,
      `\`${row.operatorDecision}\``,
      row.offSeatReason,
      row.candidateStatus,
      row.componentInsidePathRatio === '' ? '-' : row.componentInsidePathRatio,
      row.pathColorCoverageRatio === '' ? '-' : row.pathColorCoverageRatio,
      row.evidenceCrop ? `[crop](${row.evidenceCrop})` : '-',
      `\`${row.sourceInput}\``,
    ]),
  );

  await fs.writeFile(markdownPath, [
    '# Daegu P0/P1 Off-Seat Workset',
    '',
    `- workset version: \`${WORKSET_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- source off-seat intake: \`${summary.sourceOffSeatIntake}\``,
    `- rows: ${summary.totalRows}`,
    `- P0 rows: ${summary.p0Rows}`,
    `- P1 rows: ${summary.p1Rows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- duplicate rows: ${summary.duplicateRows}`,
    `- filled editable rows: ${summary.filledEditableRows}`,
    `- JSON output: \`${path.relative(frontendRoot, jsonPath)}\``,
    `- CSV output: \`${path.relative(frontendRoot, csvPath)}\``,
    '',
    '## Safety',
    '',
    ...safetyContract.map((rule) => `- ${rule}`),
    '',
    '## Work Order',
    '',
    '- Complete the P0 rows first and run the P0 prewrite gate before moving to P1.',
    '- Keep every unreviewed row as `NEEDS_RETRACE`.',
    '- Use `currentPath` only to understand what is wrong; do not copy it into `correctedPath`.',
    '- Use `candidatePath` only as reference unless the operator manually confirms the boundary and label hit area.',
    '',
    '## P0 Rows',
    '',
    rowTable(p0Rows),
    '',
    '## P1 Rows',
    '',
    rowTable(p1Rows),
    '',
    '## Gate Commands',
    '',
    '```bash',
    'npm run stadium:daegu:p0-operator-prewrite-gate',
    'npm run stadium:daegu:p0-operator-import:write-template',
    'npm run stadium:daegu:p1-operator-prewrite-gate',
    'npm run stadium:daegu:p1-operator-import:write-template',
    '```',
    '',
    '## Approval Rule',
    '',
    '- This workset does not approve or write any row.',
    '- Operator-approved rows must still be copied into the matching operator input file with `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt`.',
    '- Production data can change only through the existing validation/preview/apply/write gates.',
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    status,
    output: path.relative(frontendRoot, markdownPath),
    totalRows: rows.length,
    p0Rows: p0Rows.length,
    p1Rows: p1Rows.length,
    approvedRows: approvedRows.length,
    duplicateRows: duplicateRows.length,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP0RetraceIntake = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP0ReportDir = path.join(defaultReportDir, 'daegu-p0-operator');

  const INTAKE_VERSION = 'DAEGU_P0_RETRACE_INTAKE_V1';
  const PACKAGE_VERSION = 'DAEGU_P0_OPERATOR_PACKAGE_V1';
  const TARGET_BATCH_ID = 'BATCH_1_P0';
  const EXPECTED = {
    expectedRows: 1,
    expectedNeedsRetraceRows: 0,
    expectedApprovedRows: 1,
    expectedQueuePriority: 'P0',
  };

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

  const absoluteFromFrontendRoot = (filePath) => {
    if (!filePath) return '';
    return path.isAbsolute(filePath) ? filePath : path.join(frontendRoot, filePath);
  };

  const hasValue = (value) => String(value ?? '').trim() !== '';

  const reviewFocusFor = (row) => {
    if (row.operatorAction === 'OPERATOR_MANUAL_TRACE_REQUIRED') {
      return 'Draw a new block-specific closed polygon with at least 6 points before approval.';
    }
    if (row.operatorAction === 'OPERATOR_SEPARATE_SHARED_CANDIDATE_BOUNDARY') {
      return 'Do not reuse the shared candidate path; draw a separate block-specific boundary before approval.';
    }
    return 'Operator corrected path and label hit point are required before approval.';
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const p0ReportDir = path.resolve(frontendRoot, argValue('--p0-report-dir', defaultP0ReportDir));
  const inputPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-input.json');
  const inputCsvPath = path.join(p0ReportDir, 'daegu-seatmap-p0-operator-input.csv');

  const input = await readJson(inputPath);
  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const blockers = [];
  const warnings = [];

  if (input.packageVersion !== PACKAGE_VERSION) {
    blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  }
  if (input.targetBatchId !== TARGET_BATCH_ID) {
    blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  }
  if (input.draftOnly !== false) blockers.push('INPUT_DRAFT_ONLY_NOT_FALSE');
  if (input.productionWriteAllowed !== false) blockers.push('INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (inputRows.length !== EXPECTED.expectedRows) {
    blockers.push(`P0_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.expectedRows}`);
  }

  const rows = inputRows.map((row) => {
    const evidenceAbsolutePath = absoluteFromFrontendRoot(row.evidenceCrop);
    const evidenceExists = Boolean(evidenceAbsolutePath) && fsSync.existsSync(evidenceAbsolutePath);
    const operatorDecision = normalizeDecision(row.operatorDecision);
    const hasCorrectedPath = hasValue(row.correctedPath);
    const hasCorrectedLabel = hasValue(row.correctedLabelX) && hasValue(row.correctedLabelY);
    const hasReviewer = hasValue(row.reviewer);
    const hasReviewedAt = hasValue(row.reviewedAt);
    const hasFilledEditableFields = hasCorrectedPath || hasCorrectedLabel || hasReviewer || hasReviewedAt;
    const rowBlockers = [];
    const requiresRetraceEvidence = operatorDecision === 'NEEDS_RETRACE';

    if (row.batchId !== TARGET_BATCH_ID) rowBlockers.push(`ROW_BATCH_MISMATCH:${row.batchId ?? ''}`);
    if (row.queuePriority !== EXPECTED.expectedQueuePriority) rowBlockers.push(`ROW_PRIORITY_NOT_P0:${row.queuePriority ?? ''}`);
    if (!['NEEDS_RETRACE', 'APPROVED'].includes(operatorDecision)) {
      rowBlockers.push(`ROW_DECISION_NOT_NEEDS_RETRACE_OR_APPROVED:${operatorDecision}`);
    }
    if (row.draftOnly === true) rowBlockers.push('ROW_DRAFT_ONLY_TRUE');
    if (row.stagingOnly === true) rowBlockers.push('ROW_STAGING_ONLY_TRUE');
    if (requiresRetraceEvidence && !evidenceExists) rowBlockers.push('MISSING_EVIDENCE_CROP');

    blockers.push(...rowBlockers.map((blocker) => `${blocker}:${row.blockId}`));
    if (operatorDecision !== 'APPROVED' && hasFilledEditableFields) {
      warnings.push(`FILLED_EDITABLE_FIELDS_PRESENT:${row.blockId}`);
    }

    return {
      sourceInput: path.relative(frontendRoot, inputPath),
      blockId: row.blockId,
      block: row.block,
      name: row.name,
      category: row.category,
      batchId: row.batchId,
      queuePriority: row.queuePriority,
      alignmentClass: row.alignmentClass,
      candidateStatus: row.candidateStatus,
      recommendedAction: row.recommendedAction,
      operatorAction: row.operatorAction,
      requiredOperatorReview: row.requiredOperatorReview || '',
      operatorDecision,
      reviewFocus: reviewFocusFor(row),
      evidenceCrop: row.evidenceCrop,
      evidenceAbsolutePath,
      evidenceExists,
      currentPath: row.currentPath,
      currentLabelX: row.currentLabelX,
      currentLabelY: row.currentLabelY,
      candidatePath: row.candidatePath,
      candidatePathPointCount: row.candidatePathPointCount,
      candidateCenterX: row.candidateCenterX,
      candidateCenterY: row.candidateCenterY,
      candidateLabelX: row.candidateLabelX,
      candidateLabelY: row.candidateLabelY,
      candidateDuplicateGroup: row.candidateDuplicateGroup || '',
      candidateDuplicateIds: row.candidateDuplicateIds || '',
      componentInsidePathRatio: row.componentInsidePathRatio,
      pathColorCoverageRatio: row.pathColorCoverageRatio,
      officialFailureReasons: row.officialFailureReasons || '',
      riskFlags: row.riskFlags || '',
      correctedPath: row.correctedPath ?? '',
      correctedLabelX: row.correctedLabelX ?? '',
      correctedLabelY: row.correctedLabelY ?? '',
      reviewer: row.reviewer ?? '',
      reviewedAt: row.reviewedAt ?? '',
      operatorNote: row.operatorNote || '',
      hasFilledEditableFields,
      rowBlockers,
      operatorApprovalInstruction: 'Set operatorDecision=APPROVED and fill correctedPath, correctedLabelX, correctedLabelY, reviewer, reviewedAt in the source P0 operator input after manual tracing.',
    };
  });

  const needsRetraceRows = rows.filter((row) => row.operatorDecision === 'NEEDS_RETRACE');
  const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
  const pendingRows = rows.filter((row) => row.operatorDecision === 'PENDING');
  const nonP0Rows = rows.filter((row) => row.queuePriority !== EXPECTED.expectedQueuePriority);
  const missingEvidenceRows = rows.filter((row) => !row.evidenceExists);
  const filledEditableRows = rows.filter((row) => row.hasFilledEditableFields);

  if (needsRetraceRows.length !== EXPECTED.expectedNeedsRetraceRows) {
    blockers.push(`P0_NEEDS_RETRACE_ROW_COUNT_MISMATCH:${needsRetraceRows.length}:${EXPECTED.expectedNeedsRetraceRows}`);
  }
  if (approvedRows.length !== EXPECTED.expectedApprovedRows) {
    blockers.push(`P0_APPROVED_ROWS_NOT_ALLOWED_IN_RETRACE_INTAKE:${approvedRows.length}`);
  }
  if (nonP0Rows.length > 0) blockers.push(`NON_P0_ROWS_PRESENT:${nonP0Rows.length}`);

  const status = blockers.length > 0
    ? 'blocked'
    : needsRetraceRows.length > 0
      ? 'ready-for-operator-retrace'
      : 'closed';
  const summary = {
    intakeVersion: INTAKE_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    sourceInput: path.relative(frontendRoot, inputPath),
    sourceInputCsv: path.relative(frontendRoot, inputCsvPath),
    productionWriteAllowed: false,
    totalRows: rows.length,
    needsRetraceRows: needsRetraceRows.length,
    approvedRows: approvedRows.length,
    pendingRows: pendingRows.length,
    nonP0Rows: nonP0Rows.length,
    missingEvidenceRows: missingEvidenceRows.length,
    filledEditableRows: filledEditableRows.length,
    expectedRows: EXPECTED.expectedRows,
    expectedNeedsRetraceRows: EXPECTED.expectedNeedsRetraceRows,
    expectedApprovedRows: EXPECTED.expectedApprovedRows,
    blockers,
    warnings,
    nextOperatorAction: needsRetraceRows.length > 0
      ? 'Manually trace each P0 block in the official PNG coordinate system, then update the source P0 operator input row with an APPROVED decision and corrected geometry.'
      : 'No P0 retrace rows remain in the current baseline.',
  };

  const safetyContract = [
    'This P0 retrace intake is a read-only operator tracing aid.',
    'It never writes the main corrections template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'It never changes DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, or the viewport contract.',
    'Candidate paths remain reference-only and must not be promoted without operator approval.',
    'The P0 operator input JSON remains the source of truth for approvals.',
  ];

  const requiredApprovalFields = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract,
    requiredApprovalFields,
    rows,
  };

  const jsonPath = path.join(p0ReportDir, 'daegu-seatmap-p0-retrace-intake.json');
  const csvPath = path.join(p0ReportDir, 'daegu-seatmap-p0-retrace-intake.csv');
  const markdownPath = path.join(p0ReportDir, 'daegu-seatmap-p0-retrace-intake.md');

  await fs.mkdir(p0ReportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'sourceInput',
      'blockId',
      'block',
      'name',
      'category',
      'batchId',
      'queuePriority',
      'operatorDecision',
      'operatorAction',
      'recommendedAction',
      'reviewFocus',
      'evidenceCrop',
      'evidenceExists',
      'currentPath',
      'currentLabelX',
      'currentLabelY',
      'candidatePath',
      'candidatePathPointCount',
      'candidateCenterX',
      'candidateCenterY',
      'candidateDuplicateGroup',
      'candidateDuplicateIds',
      'componentInsidePathRatio',
      'pathColorCoverageRatio',
      'officialFailureReasons',
      'riskFlags',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
      'operatorNote',
      'operatorApprovalInstruction',
    ],
    ...rows.map((row) => [
      row.sourceInput,
      row.blockId,
      row.block,
      row.name,
      row.category,
      row.batchId,
      row.queuePriority,
      row.operatorDecision,
      row.operatorAction,
      row.recommendedAction,
      row.reviewFocus,
      row.evidenceCrop,
      row.evidenceExists,
      row.currentPath,
      row.currentLabelX,
      row.currentLabelY,
      row.candidatePath,
      row.candidatePathPointCount,
      row.candidateCenterX,
      row.candidateCenterY,
      row.candidateDuplicateGroup,
      row.candidateDuplicateIds,
      row.componentInsidePathRatio,
      row.pathColorCoverageRatio,
      row.officialFailureReasons,
      row.riskFlags,
      row.correctedPath,
      row.correctedLabelX,
      row.correctedLabelY,
      row.reviewer,
      row.reviewedAt,
      row.operatorNote,
      row.operatorApprovalInstruction,
    ]),
  ]);

  const rowSummaryTable = markdownTable(
    ['block', 'decision', 'action', 'candidate points', 'duplicate group', 'evidence', 'editable fields'],
    rows.map((row) => [
      `\`${row.block}\``,
      `\`${row.operatorDecision}\``,
      `\`${row.operatorAction}\``,
      row.candidatePathPointCount,
      row.candidateDuplicateGroup || '-',
      row.evidenceExists ? 'ok' : 'missing',
      row.hasFilledEditableFields ? 'filled' : 'blank',
    ]),
  );

  const markdownRows = rows.flatMap((row) => {
    const evidenceRelativePath = row.evidenceAbsolutePath
      ? path.relative(p0ReportDir, row.evidenceAbsolutePath)
      : '';

    return [
      `## ${row.block}`,
      '',
      evidenceRelativePath ? `![${row.block}](${evidenceRelativePath})` : '_Missing evidence crop._',
      '',
      markdownTable(
        ['field', 'value'],
        [
          ['blockId', `\`${row.blockId}\``],
          ['name', row.name],
          ['category', row.category],
          ['decision', `\`${row.operatorDecision}\``],
          ['action', `\`${row.operatorAction}\``],
          ['review focus', row.reviewFocus],
          ['candidate points', row.candidatePathPointCount],
          ['candidate duplicate group', row.candidateDuplicateGroup || '-'],
          ['candidate duplicate ids', row.candidateDuplicateIds || '-'],
          ['current label', `${row.currentLabelX},${row.currentLabelY}`],
          ['candidate center', row.candidateCenterX !== '' && row.candidateCenterY !== '' ? `${row.candidateCenterX},${row.candidateCenterY}` : '-'],
          ['component inside current path', row.componentInsidePathRatio],
          ['path color coverage', row.pathColorCoverageRatio],
          ['official failures', row.officialFailureReasons || '-'],
          ['risk flags', row.riskFlags || '-'],
          ['correctedPath', row.correctedPath ? 'filled in source input' : 'blank - operator must fill before approval'],
          ['correctedLabelX/Y', row.correctedLabelX !== '' && row.correctedLabelY !== '' ? `${row.correctedLabelX},${row.correctedLabelY}` : 'blank - operator must fill before approval'],
          ['reviewer', row.reviewer || 'blank - operator must fill before approval'],
          ['reviewedAt', row.reviewedAt || 'blank - operator must fill before approval'],
          ['operator note', row.operatorNote || '-'],
          ['source paths', 'Full currentPath and candidatePath are included in the JSON/CSV outputs.'],
        ],
      ),
      '',
    ];
  });

  await fs.writeFile(markdownPath, [
    '# Daegu P0 Retrace Intake',
    '',
    `- intake version: \`${INTAKE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- target batch: \`${TARGET_BATCH_ID}\``,
    `- rows: ${summary.totalRows}`,
    `- needs retrace rows: ${summary.needsRetraceRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- missing evidence rows: ${summary.missingEvidenceRows}`,
    `- filled editable rows: ${summary.filledEditableRows}`,
    `- source input JSON: \`${summary.sourceInput}\``,
    `- source input CSV: \`${summary.sourceInputCsv}\``,
    `- JSON output: \`${path.relative(frontendRoot, jsonPath)}\``,
    `- CSV output: \`${path.relative(frontendRoot, csvPath)}\``,
    '',
    '## Safety',
    '',
    ...safetyContract.map((rule) => `- ${rule}`),
    '',
    '## Operator Approval Rule',
    '',
    '- Keep `candidatePath` as reference-only.',
    '- Draw a new official-image polygon manually for each P0 block.',
    '- Approve by editing the source P0 operator input row to `operatorDecision=APPROVED` and filling `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt`.',
    '- Leave the row as `NEEDS_RETRACE` until all required approval fields are present.',
    '',
    '## Summary',
    '',
    rowSummaryTable,
    '',
    ...markdownRows,
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    status,
    output: path.relative(frontendRoot, markdownPath),
    totalRows: rows.length,
    needsRetraceRows: needsRetraceRows.length,
    approvedRows: approvedRows.length,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const TASKS = {
  "p0-decision-packet": runP0DecisionPacket,
  "p0-off-seat-operator-import": runP0OffSeatOperatorImport,
  "p0-off-seat-operator-input": runP0OffSeatOperatorInput,
  "p0-operator-audit": runP0OperatorAudit,
  "p0-operator-import": runP0OperatorImport,
  "p0-operator-package": runP0OperatorPackage,
  "p0-operator-readiness": runP0OperatorReadiness,
  "p0-p1-off-seat-workset": runP0P1OffSeatWorkset,
  "p0-retrace-intake": runP0RetraceIntake,
};

export const runDaeguP0OperatorTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Daegu p0 operator task: ${task}. Available tasks: ${available}`);
  }

  const originalArgv = process.argv;
  process.argv = [originalArgv[0], originalArgv[1], ...args];
  try {
    await runner();
  } finally {
    process.argv = originalArgv;
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [task, ...args] = process.argv.slice(2);
  await runDaeguP0OperatorTask(task, args);
}
