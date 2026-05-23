import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runP3P4DecisionPacket = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP3P4ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p3-p4-operator');

  const PACKET_VERSION = 'DAEGU_P3_P4_DECISION_PACKET_V1';
  const PACKAGE_VERSION = 'DAEGU_P3_P4_OPERATOR_PACKAGE_V1';
  const TARGET_BATCH_ID = 'BATCH_4_P3_P4';
  const EXPECTED = {
    rows: 44,
    p3Rows: 0,
    p4Rows: 44,
    manualTraceRequiredRows: 22,
    correctedPathRequiredRows: 22,
    labelAndHitAreaRows: 3,
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

  const reviewFocusFor = (row) => {
    if (row.operatorAction === 'OPERATOR_MANUAL_TRACE_REQUIRED') {
      return 'Manual retrace required; do not approve without a corrected polygon path.';
    }
    if (row.recommendedAction === 'RETRACE_LABEL_AND_HIT_AREA') {
      return 'Label and hit-area review required; verify path, label point, and top-hit together.';
    }
    return 'Operator corrected path required before approval.';
  };

  const p3p4ReportDir = path.resolve(frontendRoot, argValue('--p3-p4-report-dir', defaultP3P4ReportDir));
  const inputPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-input.json');
  const inputCsvPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-input.csv');
  const checklistPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-checklist.md');
  const readinessPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-readiness.md');

  const input = await readJson(inputPath);
  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const blockers = [];

  if (input.packageVersion !== PACKAGE_VERSION) {
    blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  }
  if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  if (input.draftOnly !== false) blockers.push('INPUT_DRAFT_ONLY_NOT_FALSE');
  if (input.productionWriteAllowed !== false) blockers.push('INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (inputRows.length !== EXPECTED.rows) {
    blockers.push(`P3_P4_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.rows}`);
  }

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
      queuePriority: row.queuePriority,
      recommendedAction: row.recommendedAction,
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

  const actionCounts = rows.reduce((counts, row) => ({
    ...counts,
    [row.operatorAction]: (counts[row.operatorAction] ?? 0) + 1,
  }), {});
  const p3Rows = rows.filter((row) => row.queuePriority === 'P3').length;
  const p4Rows = rows.filter((row) => row.queuePriority === 'P4').length;
  const labelAndHitAreaRows = rows.filter((row) => row.recommendedAction === 'RETRACE_LABEL_AND_HIT_AREA').length;
  const expectedCounts = [
    ['P3_P4_P3_ROWS', p3Rows, EXPECTED.p3Rows],
    ['P3_P4_P4_ROWS', p4Rows, EXPECTED.p4Rows],
    ['P3_P4_MANUAL_TRACE_REQUIRED_ROWS', actionCounts.OPERATOR_MANUAL_TRACE_REQUIRED ?? 0, EXPECTED.manualTraceRequiredRows],
    ['P3_P4_CORRECTED_PATH_REQUIRED_ROWS', actionCounts.OPERATOR_CORRECTED_PATH_REQUIRED ?? 0, EXPECTED.correctedPathRequiredRows],
    ['P3_P4_LABEL_AND_HIT_AREA_ROWS', labelAndHitAreaRows, EXPECTED.labelAndHitAreaRows],
  ];
  expectedCounts.forEach(([label, actual, expected]) => {
    if (actual !== expected) blockers.push(`${label}:${actual}!=${expected}`);
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
    p3Rows,
    p4Rows,
    manualTraceRequiredRows: actionCounts.OPERATOR_MANUAL_TRACE_REQUIRED ?? 0,
    correctedPathRequiredRows: actionCounts.OPERATOR_CORRECTED_PATH_REQUIRED ?? 0,
    labelAndHitAreaRows,
    requiresOperatorDecision: pendingRows.length > 0,
    productionWriteAllowed: false,
    blockers,
    nextCommandsAfterP0P1P2ClosedAndOperatorInput: [
      'npm run stadium:daegu:p3-p4-operator-prewrite-gate',
      'npm run stadium:daegu:p3-p4-operator-import:write-template',
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
      'P3/P4 write-template remains blocked until P0, P1, and P2 are closed.',
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

  const jsonPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-decision-packet.json');
  const csvPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-decision-packet.csv');
  const markdownPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-decision-packet.md');

  await fs.mkdir(p3p4ReportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'blockId',
      'block',
      'queuePriority',
      'decision',
      'operatorAction',
      'recommendedAction',
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
      row.queuePriority,
      row.decision,
      row.operatorAction,
      row.recommendedAction,
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
    `![${row.block}](${path.relative(p3p4ReportDir, row.evidenceAbsolutePath)})`,
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['blockId', `\`${row.blockId}\``],
        ['name', row.name],
        ['priority', `\`${row.queuePriority}\``],
        ['decision', `\`${row.decision}\``],
        ['action', `\`${row.operatorAction}\``],
        ['recommended action', row.recommendedAction || '-'],
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
    '# Daegu P3/P4 Decision Packet',
    '',
    `- packet version: \`${PACKET_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- target batch: \`${TARGET_BATCH_ID}\``,
    `- rows: ${summary.totalRows}`,
    `- pending rows: ${summary.pendingRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- P3 rows: ${summary.p3Rows}`,
    `- P4 rows: ${summary.p4Rows}`,
    `- manual trace required rows: ${summary.manualTraceRequiredRows}`,
    `- corrected path required rows: ${summary.correctedPathRequiredRows}`,
    `- label and hit-area rows: ${summary.labelAndHitAreaRows}`,
    `- input JSON: \`${summary.input}\``,
    `- input CSV: \`${summary.inputCsv}\``,
    `- readiness report: \`${summary.readiness}\``,
    '',
    '## Rules',
    '',
    '- This packet is read-only and does not write production data.',
    '- P3/P4 write-template remains blocked until P0, P1, and P2 are closed.',
    '- `candidatePath` is reference-only; do not approve it automatically.',
    '- `APPROVED` rows require `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt`.',
    '- If a row cannot be approved, set `operatorDecision` to `REJECTED` or `NEEDS_RETRACE`.',
    '',
    '## Summary',
    '',
    markdownTable(
      ['block', 'priority', 'decision', 'action', 'focus', 'evidence'],
      rows.map((row) => [
        `\`${row.block}\``,
        `\`${row.queuePriority}\``,
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

  console.log(`p3_p4_decision_packet_json:${jsonPath}`);
  console.log(`p3_p4_decision_packet_csv:${csvPath}`);
  console.log(`p3_p4_decision_packet_markdown:${markdownPath}`);
  console.log(`status:${summary.status} rows=${summary.totalRows} pending=${summary.pendingRows} blockers=${summary.blockers.length}`);

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP3P4OperatorAudit = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP3P4ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p3-p4-operator');

  const AUDIT_VERSION = 'DAEGU_P3_P4_OPERATOR_AUDIT_V1';
  const EXPECTED = {
    targetBatchId: 'BATCH_4_P3_P4',
    packageRows: 44,
    p3Rows: 0,
    p4Rows: 44,
    manualTraceRequiredRows: 22,
    correctedPathRequiredRows: 22,
    labelAndHitAreaRows: 3,
    evidenceCropRows: 44,
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
    needsRetrace: rows.filter((row) => row.operatorDecision === 'NEEDS_RETRACE').length,
    approved: rows.filter((row) => row.operatorDecision === 'APPROVED').length,
    decided: rows.filter((row) => row.operatorDecision !== 'PENDING').length,
    p3: rows.filter((row) => row.queuePriority === 'P3').length,
    p4: rows.filter((row) => row.queuePriority === 'P4').length,
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

  const p3p4ReportDir = path.resolve(frontendRoot, argValue('--p3-p4-report-dir', defaultP3P4ReportDir));
  const packagePath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-package.json');
  const inputPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-input.json');

  const packageReport = await readJson(packagePath);
  const input = await readJson(inputPath);
  const inputRows = input.corrections ?? [];
  const inputCounts = countInputRows(inputRows);
  const blockers = [];

  pushExpected(blockers, 'PACKAGE_ROWS', packageReport.totalRows, EXPECTED.packageRows);
  pushExpected(blockers, 'PACKAGE_EXPECTED_ROWS', packageReport.expectedRows, EXPECTED.packageRows);
  pushExpected(blockers, 'PACKAGE_P3_ROWS', packageReport.p3Rows, EXPECTED.p3Rows);
  pushExpected(blockers, 'PACKAGE_P4_ROWS', packageReport.p4Rows, EXPECTED.p4Rows);
  pushExpected(blockers, 'PACKAGE_MANUAL_TRACE_REQUIRED_ROWS', packageReport.manualTraceRequiredRows, EXPECTED.manualTraceRequiredRows);
  pushExpected(blockers, 'PACKAGE_CORRECTED_PATH_REQUIRED_ROWS', packageReport.correctedPathRequiredRows, EXPECTED.correctedPathRequiredRows);
  pushExpected(blockers, 'PACKAGE_LABEL_AND_HIT_AREA_ROWS', packageReport.labelAndHitAreaRows, EXPECTED.labelAndHitAreaRows);
  pushExpected(blockers, 'PACKAGE_EVIDENCE_CROP_ROWS', packageReport.evidenceCropRows, EXPECTED.evidenceCropRows);
  pushExpected(blockers, 'PACKAGE_APPROVED_ROWS', packageReport.approvedRows, 0);
  if (packageReport.status !== 'ok') blockers.push(`PACKAGE_STATUS_NOT_OK:${packageReport.status ?? ''}`);
  if (packageReport.targetBatchId !== EXPECTED.targetBatchId) blockers.push(`PACKAGE_BATCH_MISMATCH:${packageReport.targetBatchId ?? ''}`);

  if (input.packageVersion !== 'DAEGU_P3_P4_OPERATOR_PACKAGE_V1') blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  if (input.targetBatchId !== EXPECTED.targetBatchId) blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  if (input.draftOnly !== false) blockers.push('INPUT_DRAFT_ONLY_NOT_FALSE');
  if (input.productionWriteAllowed !== false) blockers.push('INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

  pushExpected(blockers, 'INPUT_ROWS', inputCounts.total, EXPECTED.packageRows);
  pushExpected(blockers, 'INPUT_PENDING_ROWS', inputCounts.pending, 0);
  pushExpected(blockers, 'INPUT_NEEDS_RETRACE_ROWS', inputCounts.needsRetrace, EXPECTED.packageRows);
  pushExpected(blockers, 'INPUT_APPROVED_ROWS', inputCounts.approved, 0);
  pushExpected(blockers, 'INPUT_DECIDED_ROWS', inputCounts.decided, EXPECTED.packageRows);
  pushExpected(blockers, 'INPUT_P3_ROWS', inputCounts.p3, EXPECTED.p3Rows);
  pushExpected(blockers, 'INPUT_P4_ROWS', inputCounts.p4, EXPECTED.p4Rows);
  pushExpected(blockers, 'INPUT_FILLED_PATH_ROWS', inputCounts.filledPath, 0);
  pushExpected(blockers, 'INPUT_FILLED_LABEL_X_ROWS', inputCounts.filledLabelX, 0);
  pushExpected(blockers, 'INPUT_FILLED_LABEL_Y_ROWS', inputCounts.filledLabelY, 0);
  pushExpected(blockers, 'INPUT_FILLED_REVIEWER_ROWS', inputCounts.filledReviewer, 0);
  pushExpected(blockers, 'INPUT_FILLED_REVIEWED_AT_ROWS', inputCounts.filledReviewedAt, 0);
  pushExpected(blockers, 'INPUT_EVIDENCE_ROWS', inputCounts.evidenceCrop, EXPECTED.evidenceCropRows);

  const summary = {
    auditVersion: AUDIT_VERSION,
    status: blockers.length === 0 ? 'ok' : 'failed',
    p3p4ReportDir: path.relative(frontendRoot, p3p4ReportDir),
    packageReport: path.relative(frontendRoot, packagePath),
    input: path.relative(frontendRoot, inputPath),
    targetBatchId: EXPECTED.targetBatchId,
    packageCounts: {
      totalRows: packageReport.totalRows,
      expectedRows: packageReport.expectedRows,
      p3Rows: packageReport.p3Rows,
      p4Rows: packageReport.p4Rows,
      manualTraceRequiredRows: packageReport.manualTraceRequiredRows,
      correctedPathRequiredRows: packageReport.correctedPathRequiredRows,
      labelAndHitAreaRows: packageReport.labelAndHitAreaRows,
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

  const jsonPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-audit.json');
  const csvPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-audit.csv');
  const markdownPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-audit.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'status',
      'targetBatchId',
      'packageRows',
      'p3Rows',
      'p4Rows',
      'manualTraceRequiredRows',
      'correctedPathRequiredRows',
      'labelAndHitAreaRows',
      'evidenceCropRows',
      'inputRows',
      'inputPending',
      'inputNeedsRetrace',
      'inputApproved',
      'inputDecided',
      'inputFilledPath',
      'blockers',
    ],
    [
      summary.status,
      summary.targetBatchId,
      summary.packageCounts.totalRows,
      summary.packageCounts.p3Rows,
      summary.packageCounts.p4Rows,
      summary.packageCounts.manualTraceRequiredRows,
      summary.packageCounts.correctedPathRequiredRows,
      summary.packageCounts.labelAndHitAreaRows,
      summary.packageCounts.evidenceCropRows,
      summary.inputCounts.total,
      summary.inputCounts.pending,
      summary.inputCounts.needsRetrace,
      summary.inputCounts.approved,
      summary.inputCounts.decided,
      summary.inputCounts.filledPath,
      summary.blockers.join(' '),
    ],
  ]);
  await fs.writeFile(markdownPath, [
    '# 대구 P3/P4 operator audit',
    '',
    `- audit version: \`${AUDIT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- package report: \`${summary.packageReport}\``,
    `- input: \`${summary.input}\``,
    '',
    '## Expected Counts',
    '',
    `- P3/P4 rows: ${summary.packageCounts.totalRows}`,
    `- P3 rows: ${summary.packageCounts.p3Rows}`,
    `- P4 rows: ${summary.packageCounts.p4Rows}`,
    `- manual trace required: ${summary.packageCounts.manualTraceRequiredRows}`,
    `- corrected path required: ${summary.packageCounts.correctedPathRequiredRows}`,
    `- label and hit-area review: ${summary.packageCounts.labelAndHitAreaRows}`,
    `- evidence crop rows: ${summary.packageCounts.evidenceCropRows}`,
    '',
    '## Input File',
    '',
    `- rows: ${summary.inputCounts.total}`,
    `- pending: ${summary.inputCounts.pending}`,
    `- needsRetrace: ${summary.inputCounts.needsRetrace}`,
    `- approved: ${summary.inputCounts.approved}`,
    `- decided: ${summary.inputCounts.decided}`,
    `- P3 rows: ${summary.inputCounts.p3}`,
    `- P4 rows: ${summary.inputCounts.p4}`,
    `- filledPath: ${summary.inputCounts.filledPath}`,
    `- filledLabelX: ${summary.inputCounts.filledLabelX}`,
    `- filledLabelY: ${summary.inputCounts.filledLabelY}`,
    `- filledReviewer: ${summary.inputCounts.filledReviewer}`,
    `- filledReviewedAt: ${summary.inputCounts.filledReviewedAt}`,
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p3_p4_operator_audit_json:${jsonPath}`);
  console.log(`p3_p4_operator_audit_csv:${csvPath}`);
  console.log(`p3_p4_operator_audit_markdown:${markdownPath}`);
  console.log(`status:${summary.status} rows=${inputCounts.total} p3=${inputCounts.p3} p4=${inputCounts.p4} pending=${inputCounts.pending} approved=${inputCounts.approved}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runP3P4OperatorImport = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultInputPath = path.join(
    defaultReportDir,
    'daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-input.json',
  );
  const defaultValidationPath = path.join(
    defaultReportDir,
    'daegu-p3-p4-operator/daegu-seatmap-operator-corrections-validation.json',
  );

  const IMPORT_VERSION = 'DAEGU_P3_P4_OPERATOR_IMPORT_V1';
  const INPUT_PACKAGE_VERSION = 'DAEGU_P3_P4_OPERATOR_PACKAGE_V1';
  const VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';
  const TARGET_BATCH_ID = 'BATCH_4_P3_P4';
  const TARGET_PRIORITIES = ['P3', 'P4'];
  const PRIOR_BATCHES = [
    { id: 'BATCH_1_P0', priorities: ['P0'] },
    { id: 'BATCH_2_P1', priorities: ['P1'] },
    { id: 'BATCH_3_P2', priorities: ['P2'] },
  ];
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

  const numberOrZero = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const hasDraftMarker = (row) => (
    row.draftOnly === true
    || row.stagingOnly === true
    || row.reviewer === DRAFT_REVIEWER
    || row.reviewedAt === DRAFT_REVIEWED_AT
  );

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const inputPath = path.resolve(frontendRoot, argValue('--input', defaultInputPath));
  const validationPath = path.resolve(frontendRoot, argValue('--validation', defaultValidationPath));
  const writeTemplate = hasFlag('--write-template');
  const templateJsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
  const templateCsvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.csv');
  const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');

  const input = await readJson(inputPath);
  const template = await readJson(templateJsonPath);
  const handoff = await readJson(handoffPath);
  const validation = await readOptionalJson(validationPath);

  const p3p4HandoffRows = (handoff.workItems ?? []).filter((row) => TARGET_PRIORITIES.includes(row.queuePriority));
  const expectedP3P4Ids = new Set(p3p4HandoffRows.map((row) => row.id));
  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
  const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
  const templateIds = new Set(templateRows.map((row) => row.blockId));
  const blockers = [];
  const warnings = [];

  if (input.packageVersion !== INPUT_PACKAGE_VERSION) {
    blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  }
  if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  if (template.templateVersion !== TEMPLATE_VERSION) {
    blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  }
  if (inputRows.length !== expectedP3P4Ids.size) {
    blockers.push(`P3_P4_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${expectedP3P4Ids.size}`);
  }

  const inputIds = new Set(inputRows.map((row) => row.blockId));
  const nonP3P4InputRows = inputRows.filter((row) => !expectedP3P4Ids.has(row.blockId));
  if (nonP3P4InputRows.length > 0) {
    blockers.push(`INPUT_HAS_NON_P3_P4_ROWS:${nonP3P4InputRows.map((row) => row.blockId).join(' ')}`);
  }
  const missingP3P4Ids = [...expectedP3P4Ids].filter((blockId) => !inputIds.has(blockId));
  if (missingP3P4Ids.length > 0) blockers.push(`INPUT_MISSING_P3_P4_ROWS:${missingP3P4Ids.join(' ')}`);

  const missingTemplateIds = inputRows
    .map((row) => row.blockId)
    .filter((blockId) => !templateIds.has(blockId));
  if (missingTemplateIds.length > 0) {
    blockers.push(`TEMPLATE_MISSING_P3_P4_ROWS:${missingTemplateIds.join(' ')}`);
  }

  const duplicateInputIds = inputRows
    .map((row) => row.blockId)
    .filter((blockId, index, blockIds) => blockIds.indexOf(blockId) !== index);
  if (duplicateInputIds.length > 0) blockers.push(`DUPLICATE_INPUT_BLOCK_ID:${[...new Set(duplicateInputIds)].join(' ')}`);

  const draftMarkerRows = inputRows.filter(hasDraftMarker);
  if (writeTemplate && input.draftOnly === true) blockers.push('WRITE_TEMPLATE_INPUT_DRAFT_ONLY');
  if (writeTemplate && input.stagingOnly === true) blockers.push('WRITE_TEMPLATE_INPUT_STAGING_ONLY');
  if (writeTemplate && draftMarkerRows.length > 0) {
    blockers.push(`WRITE_TEMPLATE_HAS_DRAFT_MARKERS:${draftMarkerRows.map((row) => row.blockId).join(' ')}`);
  }

  const priorBatchSummaries = PRIOR_BATCHES.map((batch) => {
    const rows = templateRows.filter((row) => batch.priorities.includes(row.queuePriority));
    const pendingRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
    const approvedRows = rows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
    if (writeTemplate && pendingRows.length > 0) {
      blockers.push(`WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_CLOSED:${batch.id}:${pendingRows.map((row) => row.block).join(' ')}`);
    }
    if (writeTemplate && approvedRows.length > 0) {
      blockers.push(`WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_WRITTEN:${batch.id}:${approvedRows.map((row) => row.block).join(' ')}`);
    }
    return {
      batchId: batch.id,
      priorities: batch.priorities,
      rows: rows.length,
      pendingRows: pendingRows.length,
      approvedRows: approvedRows.length,
    };
  });

  const invalidDecisionInputRows = inputRows.filter((row) => !DECISION_OPTIONS.has(normalizeDecision(row.operatorDecision)));
  if (invalidDecisionInputRows.length > 0) {
    blockers.push(`INVALID_P3_P4_OPERATOR_DECISION:${invalidDecisionInputRows.map((row) => row.blockId).join(' ')}`);
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
  if (decidedRows.length === 0) warnings.push('NO_P3_P4_OPERATOR_DECISIONS_TO_IMPORT');
  if (writeTemplate && blockers.length === 0 && decidedRows.length === 0) {
    blockers.push('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_P3_P4_DECISION');
  }
  if (writeTemplate && approvedRows.length === 0) {
    blockers.push('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P3_P4_ROW');
  }
  if (writeTemplate && pendingRows.length > 0) {
    blockers.push(`WRITE_TEMPLATE_REQUIRES_NO_P3_P4_PENDING_ROWS:${pendingRows.map((row) => row.block).join(' ')}`);
  }

  const validationSummary = validation?.summary ?? {};
  const validationApprovedRows = numberOrZero(validationSummary.approvedRows);
  const validApprovedRows = numberOrZero(validationSummary.validApprovedRows);
  const invalidApprovedRows = numberOrZero(validationSummary.invalidApprovedRows);
  const invalidMetadataRows = numberOrZero(validationSummary.invalidMetadataRows);
  if (writeTemplate && approvedRows.length > 0 && !validation) blockers.push('WRITE_TEMPLATE_REQUIRES_P3_P4_VALIDATION_REPORT');
  if (writeTemplate && validation && validationSummary.validationVersion !== VALIDATION_VERSION) {
    blockers.push(`WRITE_TEMPLATE_VALIDATION_VERSION_MISMATCH:${validationSummary.validationVersion ?? ''}`);
  }
  if (writeTemplate && validation && validationSummary.status !== 'ok') blockers.push('WRITE_TEMPLATE_VALIDATION_STATUS_NOT_OK');
  if (writeTemplate && validation && validationApprovedRows !== approvedRows.length) {
    blockers.push(`WRITE_TEMPLATE_VALIDATION_APPROVED_ROWS_MISMATCH:${validationApprovedRows}:${approvedRows.length}`);
  }
  if (writeTemplate && invalidApprovedRows > 0) blockers.push(`WRITE_TEMPLATE_P3_P4_INVALID_APPROVED_ROWS:${invalidApprovedRows}`);
  if (writeTemplate && invalidMetadataRows > 0) blockers.push(`WRITE_TEMPLATE_P3_P4_INVALID_METADATA_ROWS:${invalidMetadataRows}`);
  if (writeTemplate && approvedRows.length > 0 && validApprovedRows !== approvedRows.length) {
    blockers.push(`WRITE_TEMPLATE_P3_P4_VALID_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${validApprovedRows}:${approvedRows.length}`);
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
    priorBatchIds: PRIOR_BATCHES.map((batch) => batch.id),
    input: path.relative(frontendRoot, inputPath),
    template: path.relative(frontendRoot, templateJsonPath),
    validation: path.relative(frontendRoot, validationPath),
    totalInputRows: inputRows.length,
    importedRows: importedRows.length,
    changedRows: changedRows.length,
    decidedRows: decidedRows.length,
    approvedRows: approvedRows.length,
    pendingRows: pendingRows.length,
    invalidDecisionRows: invalidDecisionInputRows.length,
    draftMarkerRows: draftMarkerRows.length,
    priorBatchSummaries,
    priorPendingRows: priorBatchSummaries.reduce((total, batch) => total + batch.pendingRows, 0),
    priorApprovedRows: priorBatchSummaries.reduce((total, batch) => total + batch.approvedRows, 0),
    validationStatus: validationSummary.status ?? '',
    validationApprovedRows,
    validApprovedRows,
    invalidApprovedRows,
    invalidMetadataRows,
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
      'This script only imports P3/P4 operator decisions into the corrections template.',
      'It blocks write-template while any P0, P1, or P2 rows remain pending or approved in the current template.',
      'It blocks write-template while any P3/P4 row remains PENDING.',
      'It blocks write-template unless at least one P3/P4 row is operatorDecision=APPROVED.',
      'It blocks write-template when P3/P4 APPROVED rows do not have validForApproval=true in the existing validator report.',
      'It blocks write-template when draft/staging metadata or DRAFT_VALIDATION_ONLY markers are present.',
      'Do not run npm run stadium:daegu:operator-corrections after write-template because it regenerates the template from handoff defaults.',
      'It never modifies src/data/daeguSeatData.ts or promotes blocks to OFFICIAL_IMAGE_TRACED.',
      'Run validation, preview, dry-run apply, batches, status, and write-guard after importing operator decisions.',
    ],
  };

  const jsonPath = path.join(reportDir, 'daegu-seatmap-p3-p4-operator-import.json');
  const csvPath = path.join(reportDir, 'daegu-seatmap-p3-p4-operator-import.csv');
  const markdownPath = path.join(reportDir, 'daegu-seatmap-p3-p4-operator-import.md');

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
    '# Daegu P3/P4 Operator Import',
    '',
    `- import version: \`${IMPORT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- mode: \`${summary.mode}\``,
    `- input: \`${summary.input}\``,
    `- prior batches: \`${summary.priorBatchIds.join(', ')}\``,
    `- imported rows: ${summary.importedRows}`,
    `- changed rows: ${summary.changedRows}`,
    `- decided rows: ${summary.decidedRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- pending rows: ${summary.pendingRows}`,
    `- invalid decision rows: ${summary.invalidDecisionRows}`,
    `- draft marker rows: ${summary.draftMarkerRows}`,
    `- prior pending rows: ${summary.priorPendingRows}`,
    `- prior approved rows: ${summary.priorApprovedRows}`,
    `- valid approved rows: ${summary.validApprovedRows}`,
    `- invalid approved rows: ${summary.invalidApprovedRows}`,
    `- production data changed: ${summary.productionDataChanged}`,
    `- template changed: ${summary.templateChanged}`,
    '',
    '## Prior Batches',
    '',
    markdownTable(
      ['batch', 'priorities', 'rows', 'pending', 'approved'],
      priorBatchSummaries.map((row) => [
        `\`${row.batchId}\``,
        `\`${row.priorities.join(',')}\``,
        row.rows,
        row.pendingRows,
        row.approvedRows,
      ]),
    ),
    '',
    '## Imported Rows',
    '',
    markdownTable(
      ['block', 'priority', 'decision', 'changed', 'approved', 'decided'],
      importedRows.map((row) => [
        `\`${row.block}\``,
        `\`${row.queuePriority}\``,
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

  console.log(`p3_p4_operator_import_json:${jsonPath}`);
  console.log(`p3_p4_operator_import_csv:${csvPath}`);
  console.log(`p3_p4_operator_import_markdown:${markdownPath}`);
  console.log(`status:${summary.status} mode=${summary.mode} imported=${summary.importedRows} changed=${summary.changedRows} decided=${summary.decidedRows} approved=${summary.approvedRows}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runP3P4OperatorPackage = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP3P4ReportDir = path.join(defaultReportDir, 'daegu-p3-p4-operator');
  const defaultCropDir = path.join(defaultReportDir, 'daegu-handoff-evidence-crops');

  const PACKAGE_VERSION = 'DAEGU_P3_P4_OPERATOR_PACKAGE_V1';
  const TARGET_BATCH_ID = 'BATCH_4_P3_P4';
  const TARGET_PRIORITIES = ['P3', 'P4'];
  const EXPECTED = {
    rows: 44,
    p3Rows: 0,
    p4Rows: 44,
    manualTraceRequiredRows: 22,
    correctedPathRequiredRows: 22,
    labelAndHitAreaRows: 3,
  };
  const REQUIRED_APPROVAL_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ];

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
    return 'OPERATOR_CORRECTED_PATH_REQUIRED';
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const p3p4ReportDir = path.resolve(frontendRoot, argValue('--p3-p4-report-dir', defaultP3P4ReportDir));
  const cropDir = path.resolve(frontendRoot, argValue('--crop-dir', defaultCropDir));
  const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
  const templatePath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
  const batchesPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-batches.json');
  const operatorInputJsonPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-input.json');
  const operatorInputCsvPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-input.csv');
  const checklistCsvPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-checklist.csv');
  const checklistMarkdownPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-checklist.md');
  const summaryJsonPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-package.json');
  const summaryMarkdownPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-package.md');

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

  const p3p4Rows = (handoff.workItems ?? [])
    .filter((row) => TARGET_PRIORITIES.includes(row.queuePriority))
    .sort((a, b) => {
      const priorityCompare = TARGET_PRIORITIES.indexOf(a.queuePriority) - TARGET_PRIORITIES.indexOf(b.queuePriority);
      if (priorityCompare !== 0) return priorityCompare;
      return String(a.block).localeCompare(String(b.block), 'ko');
    });

  const packageRows = p3p4Rows.map((row) => {
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

  const p3p4Batch = (batches.batches ?? []).find((batch) => batch.id === TARGET_BATCH_ID);
  const blockers = [];
  const warnings = [];
  if (p3p4Rows.length !== EXPECTED.rows) warnings.push(`P3_P4_ROW_COUNT_CHANGED_AFTER_WRITES:${p3p4Rows.length}:${EXPECTED.rows}`);
  if (!p3p4Batch) {
    blockers.push(`MISSING_BATCH:${TARGET_BATCH_ID}`);
  } else {
    if (p3p4Batch.expectedRows !== EXPECTED.rows) warnings.push(`P3_P4_BATCH_EXPECTED_ROWS_CHANGED_AFTER_WRITES:${p3p4Batch.expectedRows}:${EXPECTED.rows}`);
    const missingPriorities = TARGET_PRIORITIES.filter((priority) => !p3p4Batch.queuePriorities?.includes(priority));
    if (missingPriorities.length > 0) blockers.push(`P3_P4_BATCH_PRIORITY_MISMATCH:${(p3p4Batch.queuePriorities ?? []).join(' ')}`);
  }
  const missingEvidenceRows = packageRows.filter((row) => !row.evidenceCrop);
  if (missingEvidenceRows.length > 0) {
    blockers.push(`MISSING_EVIDENCE_CROPS:${missingEvidenceRows.map((row) => row.block).join(' ')}`);
  }

  const summary = {
    packageVersion: PACKAGE_VERSION,
    status: blockers.length > 0 ? 'blocked' : 'ok',
    targetBatchId: TARGET_BATCH_ID,
    targetPriorities: TARGET_PRIORITIES,
    generatedAt: new Date().toISOString(),
    sourceHandoff: path.relative(frontendRoot, handoffPath),
    sourceTemplate: path.relative(frontendRoot, templatePath),
    sourceBatches: path.relative(frontendRoot, batchesPath),
    existingOperatorInput: path.relative(frontendRoot, operatorInputJsonPath),
    outputDirectory: path.relative(frontendRoot, p3p4ReportDir),
    totalRows: packageRows.length,
    baselineExpectedRows: EXPECTED.rows,
    expectedRows: packageRows.length,
    p3Rows: packageRows.filter((row) => row.queuePriority === 'P3').length,
    p4Rows: packageRows.filter((row) => row.queuePriority === 'P4').length,
    manualTraceRequiredRows: packageRows.filter((row) => row.operatorAction === 'OPERATOR_MANUAL_TRACE_REQUIRED').length,
    correctedPathRequiredRows: packageRows.filter((row) => row.operatorAction === 'OPERATOR_CORRECTED_PATH_REQUIRED').length,
    labelAndHitAreaRows: packageRows.filter((row) => row.recommendedAction === 'RETRACE_LABEL_AND_HIT_AREA').length,
    evidenceCropRows: packageRows.filter((row) => row.evidenceCrop).length,
    approvedRows: packageRows.filter((row) => row.operatorDecision === 'APPROVED').length,
    existingInputRows: existingInputRows.length,
    preservedEditableRows: packageRows.filter((row) => row.editableSource === 'existingOperatorInput').length,
    templateEditableRows: packageRows.filter((row) => row.editableSource === 'template').length,
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    blockers,
    warnings,
  };

  const expectedCounts = [
    ['P3_P4_P3_ROWS', summary.p3Rows, EXPECTED.p3Rows],
    ['P3_P4_P4_ROWS', summary.p4Rows, EXPECTED.p4Rows],
    ['P3_P4_MANUAL_TRACE_REQUIRED_ROWS', summary.manualTraceRequiredRows, EXPECTED.manualTraceRequiredRows],
    ['P3_P4_CORRECTED_PATH_REQUIRED_ROWS', summary.correctedPathRequiredRows, EXPECTED.correctedPathRequiredRows],
    ['P3_P4_LABEL_AND_HIT_AREA_ROWS', summary.labelAndHitAreaRows, EXPECTED.labelAndHitAreaRows],
  ];
  expectedCounts.forEach(([label, actual, expected]) => {
    if (actual !== expected) summary.warnings.push(`${label}_CHANGED_AFTER_WRITES:${actual}!=${expected}`);
  });
  if (summary.p3Rows + summary.p4Rows !== summary.totalRows) {
    summary.blockers.push(`P3_P4_PRIORITY_TOTAL_MISMATCH:${summary.p3Rows + summary.p4Rows}:${summary.totalRows}`);
  }
  if (summary.manualTraceRequiredRows + summary.correctedPathRequiredRows !== summary.totalRows) {
    summary.blockers.push(`P3_P4_ACTION_TOTAL_MISMATCH:${summary.manualTraceRequiredRows + summary.correctedPathRequiredRows}:${summary.totalRows}`);
  }
  summary.status = summary.blockers.length > 0 ? 'blocked' : 'ok';

  const packageJson = {
    generatedAt: summary.generatedAt,
    packageVersion: PACKAGE_VERSION,
    targetBatchId: TARGET_BATCH_ID,
    targetPriorities: TARGET_PRIORITIES,
    draftOnly: false,
    productionWriteAllowed: false,
    sourceHandoff: summary.sourceHandoff,
    sourceTemplate: summary.sourceTemplate,
    existingOperatorInput: summary.existingOperatorInput,
    safetyContract: [
      'Regenerating this package must preserve operator-filled P3/P4 editable fields from the existing operator input file.',
      'This package is not a production write path and must not promote candidate paths automatically.',
    ],
    correctionContract: {
      coordinateSystem: 'official PNG 1707x2048',
      pathRules: ['single closed polygon', 'M/L/Z only', 'minimum 6 polygon points'],
      requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
      noCoordinateInference: true,
      noExternalCrawlingOrWebSearch: true,
    },
    corrections: packageRows,
  };

  await fs.mkdir(p3p4ReportDir, { recursive: true });

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
    'queuePriority',
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
    '# Daegu P3/P4 Operator Checklist',
    '',
    `- package version: \`${PACKAGE_VERSION}\``,
    `- target batch: \`${TARGET_BATCH_ID}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- P3 rows: ${summary.p3Rows}`,
    `- P4 rows: ${summary.p4Rows}`,
    `- manual trace required rows: ${summary.manualTraceRequiredRows}`,
    `- corrected path required rows: ${summary.correctedPathRequiredRows}`,
    `- label and hit-area review rows: ${summary.labelAndHitAreaRows}`,
    `- evidence crop rows: ${summary.evidenceCropRows}`,
    `- preserved editable rows: ${summary.preservedEditableRows}`,
    '',
    '## Operator Rules',
    '',
    '1. P3/P4 row는 P0, P1, P2 batch가 종료된 뒤 마지막 production write 대상으로 검토합니다.',
    '2. `candidatePath`는 참고용이며 운영자 승인 없이 production 좌표로 복사하지 않습니다.',
    '3. 승인하려면 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`을 채웁니다.',
    '4. path는 단일 폐합 polygon, `M/L/Z`, 최소 6개 point 조건을 만족해야 합니다.',
    '5. package를 다시 생성해도 기존 operator input의 입력된 editable field는 보존합니다.',
    '',
    '## Rows',
    '',
    markdownTable(
      [
        'block',
        'priority',
        'action',
        'candidate',
        'recommended',
        'points',
        'inside',
        'coverage',
        'failures',
        'editable source',
        'evidence crop',
      ],
      packageRows.map((row) => [
        `\`${row.block}\``,
        `\`${row.queuePriority}\``,
        `\`${row.operatorAction}\``,
        `\`${row.candidateStatus}\``,
        `\`${row.recommendedAction}\``,
        row.candidatePathPointCount,
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
    '- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-input.json`',
    '- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-input.csv`',
    '',
  ].join('\n'), 'utf8');

  await fs.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(summaryMarkdownPath, [
    '# Daegu P3/P4 Operator Package',
    '',
    `- package version: \`${PACKAGE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- target batch: \`${summary.targetBatchId}\``,
    `- rows: ${summary.totalRows}`,
    `- P3 rows: ${summary.p3Rows}`,
    `- P4 rows: ${summary.p4Rows}`,
    `- evidence crop rows: ${summary.evidenceCropRows}`,
    `- approved rows in package: ${summary.approvedRows}`,
    `- existing input rows: ${summary.existingInputRows}`,
    `- preserved editable rows: ${summary.preservedEditableRows}`,
    '',
    '## Outputs',
    '',
    '- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-input.json`',
    '- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-input.csv`',
    '- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-checklist.md`',
    '- `reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-checklist.csv`',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0
      ? markdownTable(['blocker'], summary.blockers.map((blocker) => [blocker]))
      : 'No package blockers.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p3_p4_operator_package_json:${summaryJsonPath}`);
  console.log(`p3_p4_operator_package_markdown:${summaryMarkdownPath}`);
  console.log(`p3_p4_operator_checklist_markdown:${checklistMarkdownPath}`);
  console.log(`p3_p4_operator_input_json:${operatorInputJsonPath}`);
  console.log(`status:${summary.status} p3p4=${summary.totalRows} p3=${summary.p3Rows} p4=${summary.p4Rows} evidence=${summary.evidenceCropRows} approved=${summary.approvedRows}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runP3P4OperatorReadiness = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP3P4ReportDir = path.join(defaultReportDir, 'daegu-p3-p4-operator');

  const READINESS_VERSION = 'DAEGU_P3_P4_OPERATOR_READINESS_V1';
  const PACKAGE_VERSION = 'DAEGU_P3_P4_OPERATOR_PACKAGE_V1';
  const IMPORT_VERSION = 'DAEGU_P3_P4_OPERATOR_IMPORT_V1';
  const VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';
  const TEMPLATE_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1';
  const TARGET_BATCH_ID = 'BATCH_4_P3_P4';
  const TARGET_PRIORITIES = ['P3', 'P4'];
  const PRIOR_BATCHES = [
    { id: 'BATCH_1_P0', priorities: ['P0'] },
    { id: 'BATCH_2_P1', priorities: ['P1'] },
    { id: 'BATCH_3_P2', priorities: ['P2'] },
  ];
  const BASELINE_EXPECTED_ROWS = 52;
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

  const p3p4ReportDir = path.resolve(frontendRoot, argValue('--p3-p4-report-dir', defaultP3P4ReportDir));
  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const packagePath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-package.json');
  const inputPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-input.json');
  const validationPath = path.join(p3p4ReportDir, 'daegu-seatmap-operator-corrections-validation.json');
  const importPath = path.join(reportDir, 'daegu-seatmap-p3-p4-operator-import.json');
  const templatePath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');

  const reports = {
    package: await readJsonReport(packagePath),
    input: await readJsonReport(inputPath),
    validation: await readJsonReport(validationPath),
    import: await readJsonReport(importPath),
    template: await readJsonReport(templatePath),
  };

  const packageReport = reports.package.data ?? {};
  const input = reports.input.data ?? {};
  const validationSummary = reports.validation.data?.summary ?? {};
  const importSummary = reports.import.data?.summary ?? {};
  const validationRows = Array.isArray(reports.validation.data?.rows) ? reports.validation.data.rows : [];
  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const templateRows = Array.isArray(reports.template.data?.corrections) ? reports.template.data.corrections : [];
  const validationByBlockId = new Map(validationRows.map((row) => [row.blockId, row]));
  const expectedRows = Number(packageReport.totalRows ?? inputRows.length);

  const rows = inputRows.map((row) => {
    const decision = normalizeDecision(row.operatorDecision);
    const validationRow = validationByBlockId.get(row.blockId) ?? {};
    return {
      blockId: row.blockId,
      block: row.block,
      queuePriority: row.queuePriority,
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
  const p3p4TemplateRows = templateRows.filter((row) => TARGET_PRIORITIES.includes(row.queuePriority));
  const priorBatchSummaries = PRIOR_BATCHES.map((batch) => {
    const batchRows = templateRows.filter((row) => batch.priorities.includes(row.queuePriority));
    return {
      batchId: batch.id,
      priorities: batch.priorities,
      rows: batchRows.length,
      pendingRows: batchRows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING').length,
      approvedRows: batchRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED').length,
    };
  });
  const priorPendingRows = priorBatchSummaries.reduce((total, row) => total + row.pendingRows, 0);
  const priorApprovedRows = priorBatchSummaries.reduce((total, row) => total + row.approvedRows, 0);

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
  if (reports.template.exists && reports.template.data?.templateVersion !== TEMPLATE_VERSION) {
    blockers.push(`TEMPLATE_VERSION_MISMATCH:${reports.template.data?.templateVersion ?? ''}`);
  }
  if (rows.length !== expectedRows) blockers.push(`P3_P4_INPUT_ROW_COUNT_MISMATCH:${rows.length}:${expectedRows}`);
  if (p3p4TemplateRows.length !== expectedRows) {
    blockers.push(`P3_P4_TEMPLATE_ROW_COUNT_MISMATCH:${p3p4TemplateRows.length}:${expectedRows}`);
  }
  if (invalidDecisionRows.length > 0) {
    blockers.push(`INVALID_P3_P4_OPERATOR_DECISION:${invalidDecisionRows.map((row) => row.blockId).join(' ')}`);
  }
  priorBatchSummaries.forEach((batch) => {
    if (batch.pendingRows > 0) blockers.push(`P3_P4_REQUIRES_PRIOR_BATCH_CLOSED:${batch.batchId}`);
    if (batch.approvedRows > 0) blockers.push(`P3_P4_REQUIRES_PRIOR_BATCH_WRITTEN:${batch.batchId}`);
  });
  if (pendingRows.length > 0) {
    blockers.push(`P3_P4_PENDING_ROWS_REMAIN:${pendingRows.map((row) => row.block).join(' ')}`);
  }
  if (decidedRows.length === 0) blockers.push('NO_P3_P4_OPERATOR_DECISIONS');

  if (reports.validation.exists && validationSummary.validationVersion !== VALIDATION_VERSION) {
    blockers.push(`VALIDATION_VERSION_MISMATCH:${validationSummary.validationVersion ?? ''}`);
  }
  if (reports.validation.exists && validationSummary.status !== 'ok') blockers.push('P3_P4_VALIDATION_STATUS_NOT_OK');

  const validationApprovedRows = numberOrZero(validationSummary.approvedRows);
  const validApprovedRows = numberOrZero(validationSummary.validApprovedRows);
  const invalidApprovedRows = numberOrZero(validationSummary.invalidApprovedRows);
  const invalidMetadataRows = numberOrZero(validationSummary.invalidMetadataRows);
  if (reports.validation.exists && validationApprovedRows !== approvedRows.length) {
    blockers.push(`P3_P4_VALIDATION_APPROVED_ROWS_MISMATCH:${validationApprovedRows}:${approvedRows.length}`);
  }
  if (invalidApprovedRows > 0) blockers.push(`P3_P4_INVALID_APPROVED_ROWS:${invalidApprovedRows}`);
  if (invalidMetadataRows > 0) blockers.push(`P3_P4_INVALID_METADATA_ROWS:${invalidMetadataRows}`);
  if (approvedRows.length > 0 && validApprovedRows !== approvedRows.length) {
    blockers.push(`P3_P4_VALID_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${validApprovedRows}:${approvedRows.length}`);
  }

  if (reports.import.exists && importSummary.importVersion !== IMPORT_VERSION) {
    blockers.push(`IMPORT_VERSION_MISMATCH:${importSummary.importVersion ?? ''}`);
  }
  if (reports.import.exists && importSummary.status !== 'ok') blockers.push('P3_P4_IMPORT_DRY_RUN_STATUS_NOT_OK');
  if (reports.import.exists && importSummary.mode !== 'dry-run') {
    blockers.push(`P3_P4_IMPORT_REPORT_NOT_DRY_RUN:${importSummary.mode ?? ''}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.importedRows) !== expectedRows) {
    blockers.push(`P3_P4_IMPORT_ROWS_MISMATCH:${importSummary.importedRows ?? ''}:${expectedRows}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.decidedRows) !== decidedRows.length) {
    blockers.push(`P3_P4_IMPORT_DECIDED_ROWS_MISMATCH:${importSummary.decidedRows ?? ''}:${decidedRows.length}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.approvedRows) !== approvedRows.length) {
    blockers.push(`P3_P4_IMPORT_APPROVED_ROWS_MISMATCH:${importSummary.approvedRows ?? ''}:${approvedRows.length}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.pendingRows) !== pendingRows.length) {
    blockers.push(`P3_P4_IMPORT_PENDING_ROWS_MISMATCH:${importSummary.pendingRows ?? ''}:${pendingRows.length}`);
  }
  if (reports.import.exists && boolOrFalse(importSummary.productionDataChanged)) {
    blockers.push('P3_P4_IMPORT_CHANGED_PRODUCTION_DATA');
  }

  if (approvedRows.length === 0) warnings.push('NO_APPROVED_P3_P4_ROWS_TEMPLATE_IMPORT_WILL_BLOCK');
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
    targetPriorities: TARGET_PRIORITIES,
    priorBatchIds: PRIOR_BATCHES.map((batch) => batch.id),
    baselineExpectedRows: BASELINE_EXPECTED_ROWS,
    expectedRows,
    totalRows: rows.length,
    pendingRows: pendingRows.length,
    decidedRows: decidedRows.length,
    approvedRows: approvedRows.length,
    rejectedRows: rejectedRows.length,
    needsRetraceRows: needsRetraceRows.length,
    invalidDecisionRows: invalidDecisionRows.length,
    filledPathRows: filledPathRows.length,
    filledReviewerRows: filledReviewerRows.length,
    priorBatchSummaries,
    priorPendingRows,
    priorApprovedRows,
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
    packageCommand: 'npm run stadium:daegu:p3-p4-operator-package',
    auditCommand: 'npm run stadium:daegu:p3-p4-operator-audit',
    validateCommand: 'npm run stadium:daegu:p3-p4-operator-validate',
    importDryRunCommand: 'npm run stadium:daegu:p3-p4-operator-import',
    templateImportCommand: 'npm run stadium:daegu:p3-p4-operator-import:write-template',
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
      'It must be run after npm run stadium:daegu:p3-p4-operator-validate and npm run stadium:daegu:p3-p4-operator-import.',
      'It blocks template import while any P0, P1, or P2 batch is still pending or still has approved rows waiting for production write.',
      'It blocks template import while any P3/P4 row remains PENDING.',
      'It blocks template import unless at least one P3/P4 row is operatorDecision=APPROVED.',
      'It requires every P3/P4 APPROVED row to be validForApproval=true in the existing validator report.',
      'It does not allow production write directly; production write still requires npm run stadium:daegu:operator-corrections-write.',
      'Do not run npm run stadium:daegu:operator-corrections after p3-p4-operator-import:write-template.',
    ],
    rows,
    nextActions: readyForTemplateImport
      ? [
        'Run npm run stadium:daegu:p3-p4-operator-import:write-template.',
        'Then run npm run stadium:daegu:operator-corrections-write.',
      ]
      : awaitingOperatorInput
        ? [
          'Fill at least one P3/P4 source input row with operatorDecision=APPROVED.',
          'Approved rows require correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt.',
          'Run npm run stadium:daegu:p3-p4-operator-validate.',
          'Run npm run stadium:daegu:p3-p4-operator-import.',
          'Re-run npm run stadium:daegu:p3-p4-operator-readiness.',
        ]
      : [
        'Resolve blockers in the P3/P4 operator input.',
        'Run npm run stadium:daegu:p3-p4-operator-validate.',
        'Run npm run stadium:daegu:p3-p4-operator-import.',
        'Re-run npm run stadium:daegu:p3-p4-operator-readiness.',
      ],
  };

  const jsonPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-readiness.json');
  const csvPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-readiness.csv');
  const markdownPath = path.join(p3p4ReportDir, 'daegu-seatmap-p3-p4-operator-readiness.md');

  await fs.mkdir(p3p4ReportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'blockId',
      'block',
      'queuePriority',
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
      row.queuePriority,
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
    '# Daegu P3/P4 Operator Readiness',
    '',
    `- readiness version: \`${READINESS_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- awaiting operator input: ${summary.awaitingOperatorInput}`,
    `- ready for template import: ${summary.readyForTemplateImport}`,
    `- ready for guarded write after template import: ${summary.readyForGuardedWriteAfterTemplateImport}`,
    `- prior pending rows: ${summary.priorPendingRows}`,
    `- prior approved rows: ${summary.priorApprovedRows}`,
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
    '## Prior Batches',
    '',
    markdownTable(
      ['batch', 'priorities', 'rows', 'pending', 'approved'],
      priorBatchSummaries.map((row) => [
        `\`${row.batchId}\``,
        `\`${row.priorities.join(',')}\``,
        row.rows,
        row.pendingRows,
        row.approvedRows,
      ]),
    ),
    '',
    '## Rows',
    '',
    markdownTable(
      [
        'block',
        'priority',
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
        `\`${row.queuePriority}\``,
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
    '2. P0/P1/P2 batch가 pending 없이 닫혔고 approved row도 남아 있지 않아야 P3/P4 template import를 진행할 수 있습니다.',
    '3. P3/P4 44건 중 `PENDING` row가 남아 있으면 template import를 진행하지 않습니다.',
    '4. 승인된 P3/P4 row가 1건 이상 있어야 template import를 진행할 수 있습니다.',
    '5. `APPROVED` row가 있으면 validation에서 `validForApproval=true`여야 합니다.',
    '6. readiness가 통과해도 production write는 `npm run stadium:daegu:operator-corrections-write` guard를 다시 통과해야 합니다.',
    '7. `p3-p4-operator-import:write-template` 이후에는 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않습니다.',
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

  console.log(`p3_p4_operator_readiness_json:${jsonPath}`);
  console.log(`p3_p4_operator_readiness_csv:${csvPath}`);
  console.log(`p3_p4_operator_readiness_markdown:${markdownPath}`);
  console.log(`status:${summary.status} readyForTemplateImport=${summary.readyForTemplateImport} pending=${summary.pendingRows} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows}`);

  if (!summary.readyForTemplateImport) {
    process.exitCode = 1;
  }
};

const TASKS = {
  "p3-p4-decision-packet": runP3P4DecisionPacket,
  "p3-p4-operator-audit": runP3P4OperatorAudit,
  "p3-p4-operator-import": runP3P4OperatorImport,
  "p3-p4-operator-package": runP3P4OperatorPackage,
  "p3-p4-operator-readiness": runP3P4OperatorReadiness,
};

export const runDaeguP3P4OperatorTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Daegu p3-p4 operator task: ${task}. Available tasks: ${available}`);
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
  await runDaeguP3P4OperatorTask(task, args);
}
