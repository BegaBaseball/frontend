import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DAEGU_SEATMAP_IMAGE } from '../src/data/daeguSeatData.ts';
import { spawnSync } from 'node:child_process';

const runP2DecisionPacket = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP2OperatorDir = path.join(defaultReportDir, 'daegu-p2-operator');

  const PACKET_VERSION = 'DAEGU_P2_DECISION_PACKET_V1';
  const PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
  const TARGET_BATCH_ID = 'BATCH_3_P2';
  const EXPECTED = {
    rows: 36,
    manualTraceRequiredRows: 33,
    labelAndHitAreaRows: 2,
    visualApprovalCandidateRows: 1,
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
      return 'Manual retrace required; do not approve without a new corrected polygon path.';
    }
    if (row.operatorAction === 'OPERATOR_LABEL_AND_HIT_AREA_REVIEW') {
      return 'Label and hit-area review required; verify path, label point, and top-hit together.';
    }
    if (row.operatorAction === 'OPERATOR_VISUAL_APPROVAL_CANDIDATE') {
      return 'Visual approval candidate; approve only after operator confirms the candidate against evidence.';
    }
    return 'Operator corrected path required before approval.';
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
  const inputPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.json');
  const inputCsvPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.csv');
  const checklistPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-checklist.md');
  const readinessPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-readiness.md');
  const stagingAuditPath = path.join(reportDir, 'daegu-p2-draft/daegu-seatmap-p2-staging-audit.md');

  const input = await readJson(inputPath);
  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const blockers = [];

  if (input.packageVersion !== PACKAGE_VERSION) {
    blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  }
  if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  if (input.draftOnly !== false) blockers.push('INPUT_DRAFT_ONLY_NOT_FALSE');
  if (input.productionWriteAllowed !== false) blockers.push('INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (inputRows.length !== EXPECTED.rows) blockers.push(`P2_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.rows}`);

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
      requiredOperatorReview: row.requiredOperatorReview || '',
      operatorAction: row.operatorAction,
      stagingBucket: row.stagingBucket || '',
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
      candidateLabel: row.candidateLabelX !== '' && row.candidateLabelY !== ''
        ? `${row.candidateLabelX},${row.candidateLabelY}`
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
  const expectedCounts = [
    ['P2_MANUAL_TRACE_REQUIRED_ROWS', actionCounts.OPERATOR_MANUAL_TRACE_REQUIRED ?? 0, EXPECTED.manualTraceRequiredRows],
    ['P2_LABEL_AND_HIT_AREA_ROWS', actionCounts.OPERATOR_LABEL_AND_HIT_AREA_REVIEW ?? 0, EXPECTED.labelAndHitAreaRows],
    ['P2_VISUAL_APPROVAL_CANDIDATE_ROWS', actionCounts.OPERATOR_VISUAL_APPROVAL_CANDIDATE ?? 0, EXPECTED.visualApprovalCandidateRows],
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
    stagingAudit: path.relative(frontendRoot, stagingAuditPath),
    totalRows: rows.length,
    pendingRows: pendingRows.length,
    approvedRows: approvedRows.length,
    missingEvidenceRows: missingEvidenceRows.length,
    manualTraceRequiredRows: actionCounts.OPERATOR_MANUAL_TRACE_REQUIRED ?? 0,
    labelAndHitAreaRows: actionCounts.OPERATOR_LABEL_AND_HIT_AREA_REVIEW ?? 0,
    visualApprovalCandidateRows: actionCounts.OPERATOR_VISUAL_APPROVAL_CANDIDATE ?? 0,
    requiresOperatorDecision: pendingRows.length > 0,
    productionWriteAllowed: false,
    blockers,
    nextCommandsAfterP0P1ClosedAndOperatorInput: [
      'npm run stadium:daegu:p2-operator-prewrite-gate',
      'npm run stadium:daegu:p2-operator-import:write-template',
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
      'P2 write-template remains blocked until P0 and P1 are closed.',
      'Candidate paths are visual references only and must not be promoted without operator approval.',
      'P2 staging and draft values are not production approvals.',
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

  const jsonPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-decision-packet.json');
  const csvPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-decision-packet.csv');
  const markdownPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-decision-packet.md');

  await fs.mkdir(p2OperatorDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'blockId',
      'block',
      'decision',
      'operatorAction',
      'requiredOperatorReview',
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
      row.requiredOperatorReview,
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
    `![${row.block}](${path.relative(p2OperatorDir, row.evidenceAbsolutePath)})`,
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['blockId', `\`${row.blockId}\``],
        ['name', row.name],
        ['decision', `\`${row.decision}\``],
        ['action', `\`${row.operatorAction}\``],
        ['required review', row.requiredOperatorReview || '-'],
        ['review focus', row.reviewFocus],
        ['candidate points', row.candidatePathPointCount],
        ['duplicate group', row.candidateDuplicateGroup || '-'],
        ['duplicate ids', row.candidateDuplicateIds || '-'],
        ['current label', row.currentLabel],
        ['candidate label', row.candidateLabel || '-'],
        ['failures', row.officialFailureReasons || '-'],
        ['risk flags', row.riskFlags || '-'],
        ['evidence crop', `\`${row.evidenceCrop}\``],
      ],
    ),
    '',
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P2 Decision Packet',
    '',
    `- packet version: \`${PACKET_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- target batch: \`${TARGET_BATCH_ID}\``,
    `- rows: ${summary.totalRows}`,
    `- pending rows: ${summary.pendingRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- manual trace required rows: ${summary.manualTraceRequiredRows}`,
    `- label and hit-area rows: ${summary.labelAndHitAreaRows}`,
    `- visual approval candidate rows: ${summary.visualApprovalCandidateRows}`,
    `- input JSON: \`${summary.input}\``,
    `- input CSV: \`${summary.inputCsv}\``,
    `- readiness report: \`${summary.readiness}\``,
    `- staging audit: \`${summary.stagingAudit}\``,
    '',
    '## Rules',
    '',
    '- This packet is read-only and does not write production data.',
    '- P2 write-template remains blocked until P0 and P1 are closed.',
    '- `candidatePath` and staging values are reference-only; do not approve them automatically.',
    '- `APPROVED` rows require `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt`.',
    '- If a row cannot be approved, set `operatorDecision` to `REJECTED` or `NEEDS_RETRACE`.',
    '',
    '## Summary',
    '',
    markdownTable(
      ['block', 'decision', 'action', 'required review', 'focus', 'evidence'],
      rows.map((row) => [
        `\`${row.block}\``,
        `\`${row.decision}\``,
        `\`${row.operatorAction}\``,
        row.requiredOperatorReview || '-',
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

  console.log(`p2_decision_packet_json:${jsonPath}`);
  console.log(`p2_decision_packet_csv:${csvPath}`);
  console.log(`p2_decision_packet_markdown:${markdownPath}`);
  console.log(`status:${summary.status} rows=${summary.totalRows} pending=${summary.pendingRows} blockers=${summary.blockers.length}`);

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP2NextActionPacket = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP2OperatorDir = path.join(defaultReportDir, 'daegu-p2-operator');
  const defaultP2DraftDir = path.join(defaultReportDir, 'daegu-p2-draft');

  const PACKET_VERSION = 'DAEGU_P2_NEXT_ACTION_PACKET_V1';
  const TARGET_BATCH_ID = 'BATCH_3_P2';
  const EXPECTED = {
    expectedRows: 36,
    labelAndHitAreaRows: 2,
    visualApprovalCandidateRows: 1,
    manualRetraceRows: 33,
    approvalCandidateRows: 3,
    approvedRows: 0,
  };

  const STAGES = {
    LABEL_HIT_AREA_REVIEW_FIRST: {
      order: 1,
      label: 'LABEL_HIT_AREA_REVIEW_FIRST',
      acceptance: 'Approve only after visual path, corrected label point, and top-hit all resolve to this block.',
    },
    VISUAL_APPROVAL_CHECK: {
      order: 2,
      label: 'VISUAL_APPROVAL_CHECK',
      acceptance: 'Approve only after the operator confirms the reference candidate against the official PNG evidence crop.',
    },
    MANUAL_RETRACE_BATCH: {
      order: 3,
      label: 'MANUAL_RETRACE_BATCH',
      acceptance: 'Approve only after a new correctedPath with at least six polygon points passes validation.',
    },
  };

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const readJsonReport = async (filePath) => {
    try {
      return {
        exists: true,
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: '',
        relativePath: path.relative(frontendRoot, filePath),
      };
    } catch (error) {
      return {
        exists: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
        relativePath: path.relative(frontendRoot, filePath),
      };
    }
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

  const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

  const classifyRow = (row) => {
    if (row.operatorAction === 'OPERATOR_LABEL_AND_HIT_AREA_REVIEW') return STAGES.LABEL_HIT_AREA_REVIEW_FIRST;
    if (row.operatorAction === 'OPERATOR_VISUAL_APPROVAL_CANDIDATE') return STAGES.VISUAL_APPROVAL_CHECK;
    return STAGES.MANUAL_RETRACE_BATCH;
  };

  const operatorFocusFor = (stage) => {
    if (stage.label === 'LABEL_HIT_AREA_REVIEW_FIRST') {
      return 'Verify the candidate path, corrected label point, and label top-hit together before approval.';
    }
    if (stage.label === 'VISUAL_APPROVAL_CHECK') {
      return 'Compare the reference candidate against the official PNG crop; approval still requires real reviewer fields.';
    }
    return 'Draw a fresh corrected polygon from the official PNG crop; PATH_REQUIRES_AT_LEAST_SIX_POINTS remains the minimum shape contract.';
  };

  const operatorActionFor = (stage) => {
    if (stage.label === 'LABEL_HIT_AREA_REVIEW_FIRST') {
      return 'Fill correctedPath and correctedLabelX/Y only after the label point selects this block.';
    }
    if (stage.label === 'VISUAL_APPROVAL_CHECK') {
      return 'Use candidate geometry as reference evidence only, then enter explicit corrected fields and reviewer metadata if approved.';
    }
    return 'Trace a new correctedPath with at least six points and fill correctedLabelX/Y, reviewer, and reviewedAt.';
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
  const p2DraftDir = path.resolve(frontendRoot, argValue('--p2-draft-dir', defaultP2DraftDir));
  const inputPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.json');
  const decisionPacketPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-decision-packet.json');
  const readinessPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-readiness.json');
  const stagingAuditPath = path.join(p2DraftDir, 'daegu-seatmap-p2-staging-audit.json');
  const reviewPackagePath = path.join(p2DraftDir, 'daegu-seatmap-p2-review-package.json');

  const input = await readJson(inputPath);
  const decisionPacket = await readJson(decisionPacketPath);
  const readinessReport = await readJsonReport(readinessPath);
  const readiness = readinessReport.data ?? {};
  const stagingAudit = await readJson(stagingAuditPath);
  const reviewPackage = await readJson(reviewPackagePath);

  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const decisionRows = Array.isArray(decisionPacket.rows) ? decisionPacket.rows : [];
  const decisionByBlockId = new Map(decisionRows.map((row) => [row.blockId, row]));

  const blockers = [];
  const warnings = [];

  if (input.packageVersion !== 'DAEGU_P2_OPERATOR_PACKAGE_V1') {
    blockers.push(`P2_INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  }
  if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`P2_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  if (input.productionWriteAllowed !== false) blockers.push('P2_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (inputRows.length !== EXPECTED.expectedRows) blockers.push(`P2_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.expectedRows}`);
  if (decisionPacket.summary?.packetVersion !== 'DAEGU_P2_DECISION_PACKET_V1') {
    blockers.push(`P2_DECISION_PACKET_VERSION_MISMATCH:${decisionPacket.summary?.packetVersion ?? ''}`);
  }
  if (readinessReport.exists && readiness.summary?.readinessVersion !== 'DAEGU_P2_OPERATOR_READINESS_V2') {
    blockers.push(`P2_READINESS_VERSION_MISMATCH:${readiness.summary?.readinessVersion ?? ''}`);
  }
  if (!readinessReport.exists) {
    warnings.push(`P2_READINESS_REPORT_MISSING:${readinessReport.relativePath}`);
  }
  if (stagingAudit.summary?.auditVersion !== 'DAEGU_P2_STAGING_AUDIT_V1') {
    blockers.push(`P2_STAGING_AUDIT_VERSION_MISMATCH:${stagingAudit.summary?.auditVersion ?? ''}`);
  }
  if (reviewPackage.packageVersion !== 'DAEGU_P2_REVIEW_PACKAGE_V1') {
    blockers.push(`P2_REVIEW_PACKAGE_VERSION_MISMATCH:${reviewPackage.packageVersion ?? ''}`);
  }

  const rows = inputRows.map((row) => {
    const stage = classifyRow(row);
    const decisionRow = decisionByBlockId.get(row.blockId) ?? {};
    const decision = normalizeDecision(row.operatorDecision);

    return {
      nextActionPacketVersion: PACKET_VERSION,
      stage: stage.label,
      stageOrder: stage.order,
      blockId: row.blockId,
      block: row.block,
      name: row.name,
      category: row.category,
      decision,
      requiredOperatorReview: row.requiredOperatorReview || '',
      recommendedAction: row.recommendedAction || '',
      stagingBucket: row.stagingBucket || '',
      operatorAction: operatorActionFor(stage),
      operatorFocus: operatorFocusFor(stage),
      acceptance: stage.acceptance,
      evidenceCrop: row.evidenceCrop,
      sourceInput: path.relative(frontendRoot, inputPath),
      candidatePathPointCount: row.candidatePathPointCount,
      candidateLabel: row.candidateLabelX !== '' && row.candidateLabelY !== ''
        ? `${row.candidateLabelX},${row.candidateLabelY}`
        : '',
      currentLabel: `${row.currentLabelX},${row.currentLabelY}`,
      officialFailureReasons: row.officialFailureReasons || decisionRow.officialFailureReasons || '',
      riskFlags: row.riskFlags || decisionRow.riskFlags || '',
      requiredApprovalFields: [
        'operatorDecision=APPROVED',
        'correctedPath',
        'correctedLabelX',
        'correctedLabelY',
        'reviewer',
        'reviewedAt',
      ],
    };
  }).sort((a, b) => a.stageOrder - b.stageOrder || a.block.localeCompare(b.block));

  const countByStage = rows.reduce((counts, row) => ({
    ...counts,
    [row.stage]: (counts[row.stage] ?? 0) + 1,
  }), {});
  const approvedRows = rows.filter((row) => row.decision === 'APPROVED');

  const expectedChecks = [
    ['P2_NEXT_ACTION_EXPECTED_ROWS', rows.length, EXPECTED.expectedRows],
    ['P2_NEXT_ACTION_LABEL_HIT_AREA_ROWS', countByStage.LABEL_HIT_AREA_REVIEW_FIRST ?? 0, EXPECTED.labelAndHitAreaRows],
    ['P2_NEXT_ACTION_VISUAL_APPROVAL_CANDIDATE_ROWS', countByStage.VISUAL_APPROVAL_CHECK ?? 0, EXPECTED.visualApprovalCandidateRows],
    ['P2_NEXT_ACTION_MANUAL_RETRACE_ROWS', countByStage.MANUAL_RETRACE_BATCH ?? 0, EXPECTED.manualRetraceRows],
    ['P2_NEXT_ACTION_APPROVED_ROWS', approvedRows.length, EXPECTED.approvedRows],
  ];

  expectedChecks.forEach(([label, actual, expected]) => {
    if (actual !== expected) blockers.push(`${label}:${actual}!=${expected}`);
  });

  if (stagingAudit.summary?.expectedCounts?.approvalCandidateRows !== EXPECTED.approvalCandidateRows) {
    blockers.push(`P2_NEXT_ACTION_APPROVAL_CANDIDATE_ROWS:${stagingAudit.summary?.expectedCounts?.approvalCandidateRows ?? ''}!=${EXPECTED.approvalCandidateRows}`);
  }
  if (stagingAudit.summary?.expectedCounts?.manualRetraceRows !== EXPECTED.manualRetraceRows) {
    blockers.push(`P2_NEXT_ACTION_STAGING_MANUAL_RETRACE_ROWS:${stagingAudit.summary?.expectedCounts?.manualRetraceRows ?? ''}!=${EXPECTED.manualRetraceRows}`);
  }
  if (readiness.summary?.readyForTemplateImport === true && approvedRows.length === 0) {
    warnings.push('P2_READY_FOR_TEMPLATE_IMPORT_WITHOUT_APPROVED_ROWS_DO_NOT_WRITE_TEMPLATE');
  }

  const summary = {
    packetVersion: PACKET_VERSION,
    status: blockers.length > 0 ? 'blocked' : 'waiting-for-operator',
    targetBatchId: TARGET_BATCH_ID,
    expectedRows: EXPECTED.expectedRows,
    totalRows: rows.length,
    labelAndHitAreaRows: countByStage.LABEL_HIT_AREA_REVIEW_FIRST ?? 0,
    visualApprovalCandidateRows: countByStage.VISUAL_APPROVAL_CHECK ?? 0,
    manualRetraceRows: countByStage.MANUAL_RETRACE_BATCH ?? 0,
    approvalCandidateRows: EXPECTED.approvalCandidateRows,
    approvedRows: approvedRows.length,
    awaitingOperatorInput: approvedRows.length === 0,
    readyForTemplateImport: readiness.summary?.readyForTemplateImport === true,
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    sourceInput: path.relative(frontendRoot, inputPath),
    sourceDecisionPacket: path.relative(frontendRoot, decisionPacketPath),
    sourceReadiness: path.relative(frontendRoot, readinessPath),
    sourceReadinessExists: readinessReport.exists,
    sourceStagingAudit: path.relative(frontendRoot, stagingAuditPath),
    sourceReviewPackage: path.relative(frontendRoot, reviewPackagePath),
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    expected: EXPECTED,
    safetyContract: [
      'This packet is read-only and writes no operator input fields.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'P2 staging and draft values are not production approvals.',
      'Candidate paths and current paths are reference-only and must not be copied into correctedPath without explicit operator approval.',
      'No external crawling, web search, or coordinate inference is allowed.',
      'Production data can change only after the matching source input rows pass p2-operator-validate, p2-operator-import, p2-operator-readiness, and the production write guard.',
    ],
    operatorOrder: [
      {
        stage: 'LABEL_HIT_AREA_REVIEW_FIRST',
        rows: EXPECTED.labelAndHitAreaRows,
        description: 'Handle label/top-hit mismatch rows first because they need focused click-target verification.',
      },
      {
        stage: 'VISUAL_APPROVAL_CHECK',
        rows: EXPECTED.visualApprovalCandidateRows,
        description: 'Review the single visual approval candidate after label/hit rows are resolved.',
      },
      {
        stage: 'MANUAL_RETRACE_BATCH',
        rows: EXPECTED.manualRetraceRows,
        description: 'Trace the remaining manual retrace rows with new polygons and corrected label points.',
      },
    ],
    nextGateCommands: [
      'npm run stadium:daegu:p2-operator-validate',
      'npm run stadium:daegu:p2-operator-import',
      'npm run stadium:daegu:p2-operator-readiness',
      'npm run stadium:daegu:p2-operator-import:write-template',
      'npm run stadium:daegu:operator-corrections-write',
    ],
    rows,
  };

  const jsonPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-next-action-packet.json');
  const csvPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-next-action-packet.csv');
  const markdownPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-next-action-packet.md');

  await fs.mkdir(p2OperatorDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'stageOrder',
      'stage',
      'block',
      'blockId',
      'decision',
      'requiredOperatorReview',
      'operatorFocus',
      'operatorAction',
      'acceptance',
      'candidatePathPointCount',
      'candidateLabel',
      'currentLabel',
      'evidenceCrop',
      'sourceInput',
      'riskFlags',
    ],
    ...rows.map((row) => [
      row.stageOrder,
      row.stage,
      row.block,
      row.blockId,
      row.decision,
      row.requiredOperatorReview,
      row.operatorFocus,
      row.operatorAction,
      row.acceptance,
      row.candidatePathPointCount,
      row.candidateLabel,
      row.currentLabel,
      row.evidenceCrop,
      row.sourceInput,
      row.riskFlags,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P2 Next Action Packet',
    '',
    `- packet version: \`${PACKET_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- stage counts: LABEL_HIT_AREA_REVIEW_FIRST=${summary.labelAndHitAreaRows}, VISUAL_APPROVAL_CHECK=${summary.visualApprovalCandidateRows}, MANUAL_RETRACE_BATCH=${summary.manualRetraceRows}`,
    `- ready for template import: \`${summary.readyForTemplateImport}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- blockers: ${summary.blockers.length ? summary.blockers.map((blocker) => `\`${blocker}\``).join(', ') : 'none'}`,
    `- warnings: ${summary.warnings.length ? summary.warnings.map((warning) => `\`${warning}\``).join(', ') : 'none'}`,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Operator Order',
    '',
    markdownTable(
      ['order', 'stage', 'rows', 'description'],
      report.operatorOrder.map((row, index) => [index + 1, `\`${row.stage}\``, row.rows, row.description]),
    ),
    '',
    '## Rows',
    '',
    markdownTable(
      ['order', 'stage', 'block', 'decision', 'operator focus', 'acceptance', 'candidate points', 'evidence'],
      rows.map((row) => [
        row.stageOrder,
        `\`${row.stage}\``,
        row.block,
        `\`${row.decision}\``,
        row.operatorFocus,
        row.acceptance,
        row.candidatePathPointCount,
        `\`${row.evidenceCrop}\``,
      ]),
    ),
    '',
    '## Required Source Input Fields After Approval',
    '',
    '- `operatorDecision=APPROVED`',
    '- `correctedPath`',
    '- `correctedLabelX`',
    '- `correctedLabelY`',
    '- `reviewer`',
    '- `reviewedAt`',
    '',
    '## Next Gates',
    '',
    ...report.nextGateCommands.map((command) => `- \`${command}\``),
    '',
  ].join('\n'), 'utf8');

  console.log([
    `[${PACKET_VERSION}] status=${summary.status}`,
    `rows=${summary.totalRows}`,
    `labelHitArea=${summary.labelAndHitAreaRows}`,
    `visualApproval=${summary.visualApprovalCandidateRows}`,
    `manualRetrace=${summary.manualRetraceRows}`,
    `approvedRows=${summary.approvedRows}`,
    `readyForTemplateImport=${summary.readyForTemplateImport}`,
    `json=${path.relative(frontendRoot, jsonPath)}`,
    `markdown=${path.relative(frontendRoot, markdownPath)}`,
  ].join(' '));

  if (blockers.length > 0) process.exitCode = 1;
};

const runP2OperatorEntrySheet = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP2OperatorDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-operator');

  const ENTRY_SHEET_VERSION = 'DAEGU_P2_OPERATOR_ENTRY_SHEET_V1';
  const PREFLIGHT_VERSION = 'DAEGU_P2_OPERATOR_WORKSET_PREFLIGHT_V1';
  const PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
  const TARGET_BATCH_ID = 'BATCH_3_P2';
  const SOURCE_INPUT_RELATIVE_PATH = 'reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json';
  const EDITABLE_FIELDS = [
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const WORKSETS = [
    {
      id: 'P2-A',
      slug: 'p2-a-label-hit',
      artifactPrefix: 'daegu-seatmap-p2-a-label-hit-entry-sheet',
      title: 'P2-A Label/Hit Entry Sheet',
      expectedRows: 2,
      focus: 'Fill correctedPath and correctedLabelX/Y only after label top-hit review against the official PNG.',
    },
    {
      id: 'P2-B',
      slug: 'p2-b-visual-approval',
      artifactPrefix: 'daegu-seatmap-p2-b-visual-approval-entry-sheet',
      title: 'P2-B Visual Approval Entry Sheet',
      expectedRows: 1,
      focus: 'Compare candidate geometry with the evidence crop before approving; candidatePath is reference-only.',
    },
    {
      id: 'P2-C',
      slug: 'p2-c-sky-u-manual-retrace',
      artifactPrefix: 'daegu-seatmap-p2-c-sky-u-manual-retrace-entry-sheet',
      title: 'P2-C SKY/U Manual Retrace Entry Sheet',
      expectedRows: 5,
      focus: 'Trace fresh SKY/U polygons from the official PNG; currentPath is reference-only.',
    },
    {
      id: 'P2-D',
      slug: 'p2-d-outfield-manual-retrace',
      artifactPrefix: 'daegu-seatmap-p2-d-outfield-manual-retrace-entry-sheet',
      title: 'P2-D Outfield Manual Retrace Entry Sheet',
      expectedRows: 28,
      focus: 'Trace fresh outfield polygons from the official PNG; do not reuse legacy rectangles.',
    },
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
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

  const isBlank = (value) => String(value ?? '').trim() === '';
  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';
  const svgPathPointCount = (value) => {
    const numbers = String(value ?? '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/giu) ?? [];
    return Math.floor(numbers.length / 2);
  };

  const missingEntryFields = (row) => {
    const missing = [];
    if (normalizeDecision(row.operatorDecision) !== 'APPROVED') missing.push('operatorDecision=APPROVED');
    if (isBlank(row.correctedPath)) missing.push('correctedPath');
    if (isBlank(row.correctedLabelX) || isBlank(row.correctedLabelY)) missing.push('correctedLabelX/Y');
    if (isBlank(row.reviewer)) missing.push('reviewer');
    if (isBlank(row.reviewedAt)) missing.push('reviewedAt');
    return missing;
  };

  const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));
  const preflightPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-workset-preflight.json');
  const inputPath = path.join(frontendRoot, SOURCE_INPUT_RELATIVE_PATH);

  const preflight = await readJson(preflightPath);
  const input = await readJson(inputPath);
  const blockers = [];

  if (preflight.summary?.preflightVersion !== PREFLIGHT_VERSION) {
    blockers.push(`P2_WORKSET_PREFLIGHT_VERSION_MISMATCH:${preflight.summary?.preflightVersion ?? ''}`);
  }
  if (input.packageVersion !== PACKAGE_VERSION) blockers.push(`P2_INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`P2_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  if (input.productionWriteAllowed !== false) blockers.push('P2_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (preflight.summary?.productionWriteAllowed !== false) blockers.push('P2_PREFLIGHT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const preflightRows = Array.isArray(preflight.rows) ? preflight.rows : [];
  const preflightByBlockId = new Map(preflightRows.map((row) => [row.blockId, row]));

  const entries = inputRows.map((inputRow, index) => {
    const preflightRow = preflightByBlockId.get(inputRow.blockId) ?? {};
    const missingFields = missingEntryFields(inputRow);
    const workset = preflightRow.workset ?? 'UNASSIGNED';
    return {
      workset,
      worksetTitle: preflightRow.worksetTitle ?? '',
      block: inputRow.block,
      blockId: inputRow.blockId,
      name: inputRow.name,
      category: inputRow.category,
      rowIndex: index,
      editableTarget: `${SOURCE_INPUT_RELATIVE_PATH}#corrections[${index}]`,
      editableFields: EDITABLE_FIELDS,
      decision: normalizeDecision(inputRow.operatorDecision),
      rowStatus: missingFields.length > 0 ? 'waiting-for-operator-entry' : 'entry-fields-complete',
      missingEntryFields: missingFields,
      requiredOperatorReview: inputRow.requiredOperatorReview,
      operatorAction: inputRow.operatorAction,
      stagingBucket: inputRow.stagingBucket,
      currentPath: inputRow.currentPath ?? '',
      currentPathPointCount: svgPathPointCount(inputRow.currentPath),
      currentPathReferenceOnly: true,
      currentLabelX: inputRow.currentLabelX ?? '',
      currentLabelY: inputRow.currentLabelY ?? '',
      candidatePath: inputRow.candidatePath ?? '',
      candidatePathPointCount: Number(inputRow.candidatePathPointCount ?? svgPathPointCount(inputRow.candidatePath)),
      candidatePathReferenceOnly: true,
      candidateLabelX: inputRow.candidateLabelX ?? '',
      candidateLabelY: inputRow.candidateLabelY ?? '',
      correctedPath: inputRow.correctedPath ?? '',
      correctedPathPointCount: svgPathPointCount(inputRow.correctedPath),
      correctedLabelX: inputRow.correctedLabelX ?? '',
      correctedLabelY: inputRow.correctedLabelY ?? '',
      reviewer: inputRow.reviewer ?? '',
      reviewedAt: inputRow.reviewedAt ?? '',
      operatorNote: inputRow.operatorNote ?? '',
      evidenceCrop: inputRow.evidenceCrop ?? '',
      riskFlags: inputRow.riskFlags ?? '',
      officialFailureReasons: inputRow.officialFailureReasons ?? '',
      preflightStatus: preflightRow.rowStatus ?? 'missing-preflight-row',
      preflightWarnings: preflightRow.warnings ?? [],
      preflightBlockers: preflightRow.blockers ?? [],
      candidateReferenceOnly: true,
      productionWriteAllowed: false,
    };
  });

  const entriesByBlockId = new Map(entries.map((entry) => [entry.blockId, entry]));
  const missingPreflightRows = entries.filter((entry) => entry.preflightStatus === 'missing-preflight-row');
  if (missingPreflightRows.length > 0) {
    blockers.push(`P2_ENTRY_SHEET_MISSING_PREFLIGHT_ROWS:${missingPreflightRows.map((entry) => entry.block).join(' ')}`);
  }
  const extraPreflightRows = preflightRows.filter((row) => !entriesByBlockId.has(row.blockId));
  if (extraPreflightRows.length > 0) {
    blockers.push(`P2_ENTRY_SHEET_EXTRA_PREFLIGHT_ROWS:${extraPreflightRows.map((row) => row.block).join(' ')}`);
  }

  const worksetSummaries = WORKSETS.map((definition) => {
    const rows = entries.filter((entry) => entry.workset === definition.id);
    if (rows.length !== definition.expectedRows) {
      blockers.push(`${definition.id}_ENTRY_ROW_COUNT_MISMATCH:${rows.length}:${definition.expectedRows}`);
    }
    return {
      id: definition.id,
      slug: definition.slug,
      artifactPrefix: definition.artifactPrefix,
      title: definition.title,
      focus: definition.focus,
      expectedRows: definition.expectedRows,
      rowCount: rows.length,
      waitingForOperatorRows: rows.filter((entry) => entry.rowStatus === 'waiting-for-operator-entry').length,
      completeRows: rows.filter((entry) => entry.rowStatus === 'entry-fields-complete').length,
      rows,
    };
  });

  const unassignedEntries = entries.filter((entry) => entry.workset === 'UNASSIGNED');
  if (unassignedEntries.length > 0) {
    blockers.push(`P2_ENTRY_SHEET_UNASSIGNED_ROWS:${unassignedEntries.map((entry) => entry.block).join(' ')}`);
  }

  const waitingForOperatorRows = entries.filter((entry) => entry.rowStatus === 'waiting-for-operator-entry');
  const summary = {
    entrySheetVersion: ENTRY_SHEET_VERSION,
    status: blockers.length > 0
      ? 'blocked'
      : waitingForOperatorRows.length > 0
        ? 'waiting-for-operator-entry'
        : 'ready-for-workset-preflight',
    targetBatchId: TARGET_BATCH_ID,
    sourceInput: SOURCE_INPUT_RELATIVE_PATH,
    sourcePreflight: path.relative(frontendRoot, preflightPath),
    totalRows: entries.length,
    p2aRows: worksetSummaries.find((workset) => workset.id === 'P2-A')?.rowCount ?? 0,
    p2bRows: worksetSummaries.find((workset) => workset.id === 'P2-B')?.rowCount ?? 0,
    p2cRows: worksetSummaries.find((workset) => workset.id === 'P2-C')?.rowCount ?? 0,
    p2dRows: worksetSummaries.find((workset) => workset.id === 'P2-D')?.rowCount ?? 0,
    waitingForOperatorRows: waitingForOperatorRows.length,
    completeRows: entries.filter((entry) => entry.rowStatus === 'entry-fields-complete').length,
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesSourceInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings: preflight.summary?.warnings ?? [],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    editableFields: EDITABLE_FIELDS,
    safetyContract: [
      'This entry sheet is read-only.',
      'It shows editableTarget pointers into the P2 source input file but never writes those fields.',
      'candidatePath is reference-only.',
      'currentPath is reference-only.',
      'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, or reviewedAt.',
      'It never writes source input or the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
    ],
    worksets: worksetSummaries,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p2-operator-entry-sheet.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p2-operator-entry-sheet.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p2-operator-entry-sheet.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'workset',
      'block',
      'blockId',
      'editableTarget',
      'editableFields',
      'decision',
      'rowStatus',
      'missingEntryFields',
      'currentPathReferenceOnly',
      'candidatePathReferenceOnly',
      'currentPathPointCount',
      'candidatePathPointCount',
      'correctedPathPointCount',
      'evidenceCrop',
      'riskFlags',
    ],
    ...entries.map((entry) => [
      entry.workset,
      entry.block,
      entry.blockId,
      entry.editableTarget,
      entry.editableFields.join(' '),
      entry.decision,
      entry.rowStatus,
      entry.missingEntryFields.join(' '),
      entry.currentPathReferenceOnly,
      entry.candidatePathReferenceOnly,
      entry.currentPathPointCount,
      entry.candidatePathPointCount,
      entry.correctedPathPointCount,
      entry.evidenceCrop,
      entry.riskFlags,
    ]),
  ]);

  const writeWorksetEntrySheet = async (workset) => {
    const worksetJsonPath = path.join(outputDir, `${workset.artifactPrefix}.json`);
    const worksetCsvPath = path.join(outputDir, `${workset.artifactPrefix}.csv`);
    const worksetMarkdownPath = path.join(outputDir, `${workset.artifactPrefix}.md`);
    const worksetReport = {
      generatedAt: report.generatedAt,
      entrySheetVersion: ENTRY_SHEET_VERSION,
      productionWriteAllowed: false,
      writesOperatorDecision: false,
      writesSourceInput: false,
      writesCorrectionsTemplate: false,
      writesProductionData: false,
      id: workset.id,
      slug: workset.slug,
      title: workset.title,
      focus: workset.focus,
      expectedRows: workset.expectedRows,
      rowCount: workset.rowCount,
      waitingForOperatorRows: workset.waitingForOperatorRows,
      completeRows: workset.completeRows,
      editableFields: EDITABLE_FIELDS,
      rows: workset.rows,
    };
    await fs.writeFile(worksetJsonPath, `${JSON.stringify(worksetReport, null, 2)}\n`, 'utf8');
    await writeCsv(worksetCsvPath, [
      [
        'block',
        'blockId',
        'editableTarget',
        'decision',
        'rowStatus',
        'missingEntryFields',
        'currentPathPointCount',
        'candidatePathPointCount',
        'correctedPathPointCount',
        'evidenceCrop',
        'operatorNote',
      ],
      ...workset.rows.map((entry) => [
        entry.block,
        entry.blockId,
        entry.editableTarget,
        entry.decision,
        entry.rowStatus,
        entry.missingEntryFields.join(' '),
        entry.currentPathPointCount,
        entry.candidatePathPointCount,
        entry.correctedPathPointCount,
        entry.evidenceCrop,
        entry.operatorNote,
      ]),
    ]);
    await fs.writeFile(worksetMarkdownPath, [
      `# Daegu ${workset.title}`,
      '',
      `- entry sheet version: \`${ENTRY_SHEET_VERSION}\``,
      `- rows: ${workset.rowCount}/${workset.expectedRows}`,
      `- waiting for operator: ${workset.waitingForOperatorRows}`,
      `- complete rows: ${workset.completeRows}`,
      `- production write allowed: \`false\``,
      '',
      '## Focus',
      '',
      workset.focus,
      '',
      '## Editable Fields',
      '',
      `- ${EDITABLE_FIELDS.map((field) => `\`${field}\``).join(' ')}`,
      '- `currentPath` and `candidatePath` are reference-only.',
      '- Fill the matching `editableTarget` row in the P2 source input only after operator review.',
      '',
      '## Rows',
      '',
      markdownTable(
        ['block', 'editable target', 'decision', 'status', 'missing fields', 'current points', 'candidate points', 'evidence'],
        workset.rows.map((entry) => [
          `\`${entry.block}\``,
          `\`${entry.editableTarget}\``,
          `\`${entry.decision}\``,
          `\`${entry.rowStatus}\``,
          entry.missingEntryFields.map((field) => `\`${field}\``).join(' ') || '-',
          entry.currentPathPointCount,
          entry.candidatePathPointCount,
          `\`${entry.evidenceCrop}\``,
        ]),
      ),
      '',
    ].join('\n'), 'utf8');
    return {
      id: workset.id,
      json: path.relative(frontendRoot, worksetJsonPath),
      csv: path.relative(frontendRoot, worksetCsvPath),
      markdown: path.relative(frontendRoot, worksetMarkdownPath),
    };
  };

  const worksetArtifacts = [];
  for (const workset of worksetSummaries) {
    worksetArtifacts.push(await writeWorksetEntrySheet(workset));
  }
  report.worksetArtifacts = worksetArtifacts;
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  await fs.writeFile(markdownPath, [
    '# Daegu P2 Operator Entry Sheet',
    '',
    `- entry sheet version: \`${ENTRY_SHEET_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- waiting for operator: ${summary.waitingForOperatorRows}`,
    `- complete rows: ${summary.completeRows}`,
    `- source input: \`${summary.sourceInput}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Editable Fields',
    '',
    `- ${EDITABLE_FIELDS.map((field) => `\`${field}\``).join(' ')}`,
    '',
    '## Worksets',
    '',
    markdownTable(
      ['workset', 'rows', 'waiting', 'complete', 'artifact'],
      worksetSummaries.map((workset) => {
        const artifact = worksetArtifacts.find((item) => item.id === workset.id);
        return [
          `\`${workset.id}\` ${workset.title}`,
          `${workset.rowCount}/${workset.expectedRows}`,
          workset.waitingForOperatorRows,
          workset.completeRows,
          artifact ? `\`${artifact.markdown}\`` : '-',
        ];
      }),
    ),
    '',
    '## Rows',
    '',
    markdownTable(
      ['workset', 'block', 'editable target', 'status', 'missing fields', 'evidence'],
      entries.map((entry) => [
        `\`${entry.workset}\``,
        `\`${entry.block}\``,
        `\`${entry.editableTarget}\``,
        `\`${entry.rowStatus}\``,
        entry.missingEntryFields.map((field) => `\`${field}\``).join(' ') || '-',
        `\`${entry.evidenceCrop}\``,
      ]),
    ),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p2_operator_entry_sheet_json:${jsonPath}`);
  console.log(`p2_operator_entry_sheet_csv:${csvPath}`);
  console.log(`p2_operator_entry_sheet_markdown:${markdownPath}`);
  console.log(`status:${summary.status} waiting=${summary.waitingForOperatorRows}/${summary.totalRows} complete=${summary.completeRows}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP2OperatorHandoff = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP2OperatorDir = path.join(defaultReportDir, 'daegu-p2-operator');
  const defaultP2DraftDir = path.join(defaultReportDir, 'daegu-p2-draft');
  const defaultP1OperatorDir = path.join(defaultReportDir, 'daegu-p1-operator');

  const HANDOFF_VERSION = 'DAEGU_P2_OPERATOR_HANDOFF_V1';
  const PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
  const NEXT_ACTION_VERSION = 'DAEGU_P2_NEXT_ACTION_PACKET_V1';
  const READINESS_VERSION = 'DAEGU_P2_OPERATOR_READINESS_V2';
  const STAGING_AUDIT_VERSION = 'DAEGU_P2_STAGING_AUDIT_V1';
  const P1_POSTWRITE_GATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_POSTWRITE_GATE_V1';
  const TARGET_BATCH_ID = 'BATCH_3_P2';
  const EXPECTED = {
    totalRows: 36,
    labelAndHitAreaRows: 2,
    visualApprovalCandidateRows: 1,
    manualRetraceRows: 33,
  };

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

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

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
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

  const list = (value) => (Array.isArray(value) ? value : []);

  const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

  const isBlank = (value) => String(value ?? '').trim() === '';

  const countBy = (rows, key) => rows.reduce((counts, row) => ({
    ...counts,
    [row[key] || '']: (counts[row[key] || ''] ?? 0) + 1,
  }), {});

  const missingApprovalFields = (row) => {
    const missing = [];
    if (normalizeDecision(row.operatorDecision) !== 'APPROVED') missing.push('operatorDecision=APPROVED');
    if (isBlank(row.correctedPath)) missing.push('correctedPath');
    if (isBlank(row.correctedLabelX) || isBlank(row.correctedLabelY)) missing.push('correctedLabelX/Y');
    if (isBlank(row.reviewer)) missing.push('reviewer');
    if (isBlank(row.reviewedAt)) missing.push('reviewedAt');
    return missing;
  };

  const stageFor = (row) => {
    if (row.operatorAction === 'OPERATOR_LABEL_AND_HIT_AREA_REVIEW') return 'LABEL_HIT_AREA_REVIEW_FIRST';
    if (row.operatorAction === 'OPERATOR_VISUAL_APPROVAL_CANDIDATE') return 'VISUAL_APPROVAL_CHECK';
    return 'MANUAL_RETRACE_BATCH';
  };

  const nextActionFor = (row, missing) => {
    if (missing.length === 0) return 'Run P2 validate/import/readiness before template import.';
    if (row.operatorAction === 'OPERATOR_LABEL_AND_HIT_AREA_REVIEW') {
      return `Verify label top-hit against the official PNG, then fill ${missing.join(', ')}.`;
    }
    if (row.operatorAction === 'OPERATOR_VISUAL_APPROVAL_CANDIDATE') {
      return `Compare candidate geometry with evidence crop, then fill ${missing.join(', ')} only if approved.`;
    }
    return `Trace a new corrected polygon from the evidence crop, then fill ${missing.join(', ')}.`;
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
  const p2DraftDir = path.resolve(frontendRoot, argValue('--p2-draft-dir', defaultP2DraftDir));
  const p1OperatorDir = path.resolve(frontendRoot, argValue('--p1-operator-dir', defaultP1OperatorDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));

  const reports = {
    package: await readJsonReport(path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-package.json')),
    input: await readJsonReport(path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.json')),
    decisionPacket: await readJsonReport(path.join(p2OperatorDir, 'daegu-seatmap-p2-decision-packet.json')),
    nextAction: await readJsonReport(path.join(p2OperatorDir, 'daegu-seatmap-p2-next-action-packet.json')),
    validation: await readJsonReport(path.join(p2OperatorDir, 'daegu-seatmap-operator-corrections-validation.json')),
    readiness: await readJsonReport(path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-readiness.json')),
    importDryRun: await readJsonReport(path.join(reportDir, 'daegu-seatmap-p2-operator-import.json')),
    stagingAudit: await readJsonReport(path.join(p2DraftDir, 'daegu-seatmap-p2-staging-audit.json')),
    p1PostwriteGate: await readJsonReport(path.join(p1OperatorDir, 'daegu-seatmap-p1-boundary-first-postwrite-gate.json')),
  };

  const blockers = [];
  const warnings = [];
  const requiredReportNames = [
    'package',
    'input',
    'decisionPacket',
    'nextAction',
    'validation',
    'importDryRun',
    'stagingAudit',
  ];

  Object.entries(reports).forEach(([name, report]) => {
    if (!report.exists && requiredReportNames.includes(name)) {
      blockers.push(`MISSING_REPORT:${name}:${report.relativePath}`);
    }
    if (!report.exists && !requiredReportNames.includes(name)) {
      warnings.push(`MISSING_OPTIONAL_REPORT:${name}:${report.relativePath}`);
    }
  });

  if (reports.package.exists && reports.package.data?.packageVersion !== PACKAGE_VERSION) {
    blockers.push(`P2_PACKAGE_VERSION_MISMATCH:${reports.package.data?.packageVersion ?? ''}`);
  }
  if (reports.input.exists && reports.input.data?.packageVersion !== PACKAGE_VERSION) {
    blockers.push(`P2_INPUT_VERSION_MISMATCH:${reports.input.data?.packageVersion ?? ''}`);
  }
  if (reports.nextAction.exists && reports.nextAction.data?.summary?.packetVersion !== NEXT_ACTION_VERSION) {
    blockers.push(`P2_NEXT_ACTION_VERSION_MISMATCH:${reports.nextAction.data?.summary?.packetVersion ?? ''}`);
  }
  if (reports.readiness.exists && reports.readiness.data?.summary?.readinessVersion !== READINESS_VERSION) {
    blockers.push(`P2_READINESS_VERSION_MISMATCH:${reports.readiness.data?.summary?.readinessVersion ?? ''}`);
  }
  if (reports.stagingAudit.exists && reports.stagingAudit.data?.summary?.auditVersion !== STAGING_AUDIT_VERSION) {
    blockers.push(`P2_STAGING_AUDIT_VERSION_MISMATCH:${reports.stagingAudit.data?.summary?.auditVersion ?? ''}`);
  }
  if (reports.p1PostwriteGate.exists && reports.p1PostwriteGate.data?.summary?.gateVersion !== P1_POSTWRITE_GATE_VERSION) {
    blockers.push(`P1_POSTWRITE_GATE_VERSION_MISMATCH:${reports.p1PostwriteGate.data?.summary?.gateVersion ?? ''}`);
  }

  [
    reports.package.data,
    reports.input.data,
    reports.nextAction.data?.summary,
    reports.readiness.data?.summary,
  ].filter(Boolean).forEach((summary) => {
    if (summary.targetBatchId !== TARGET_BATCH_ID) blockers.push(`P2_TARGET_BATCH_MISMATCH:${summary.targetBatchId ?? ''}`);
    if ('productionWriteAllowed' in summary && summary.productionWriteAllowed !== false) {
      blockers.push('P2_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
    }
  });

  const inputRows = list(reports.input.data?.corrections);
  const nextRows = list(reports.nextAction.data?.rows);
  const nextByBlockId = new Map(nextRows.map((row) => [row.blockId, row]));

  if (inputRows.length !== EXPECTED.totalRows) blockers.push(`P2_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.totalRows}`);
  if (nextRows.length !== EXPECTED.totalRows) blockers.push(`P2_NEXT_ACTION_ROW_COUNT_MISMATCH:${nextRows.length}:${EXPECTED.totalRows}`);

  const rows = inputRows.map((row) => {
    const nextRow = nextByBlockId.get(row.blockId) ?? {};
    const missing = missingApprovalFields(row);
    const decision = normalizeDecision(row.operatorDecision);
    const stage = stageFor(row);
    return {
      blockId: row.blockId,
      block: row.block,
      name: row.name,
      category: row.category,
      stage,
      operatorAction: row.operatorAction,
      requiredOperatorReview: row.requiredOperatorReview || '',
      stagingBucket: row.stagingBucket || '',
      decision,
      rowStatus: decision === 'APPROVED' && missing.length === 0 ? 'operator-approved' : 'waiting-for-operator',
      missingApprovalFields: missing,
      candidatePathPointCount: row.candidatePathPointCount,
      candidateDuplicateGroup: row.candidateDuplicateGroup || '',
      candidateDuplicateIds: row.candidateDuplicateIds || '',
      evidenceCrop: row.evidenceCrop,
      riskFlags: row.riskFlags || nextRow.riskFlags || '',
      officialFailureReasons: row.officialFailureReasons || nextRow.officialFailureReasons || '',
      nextOperatorAction: nextActionFor(row, missing),
    };
  });

  const stageCounts = countBy(rows, 'stage');
  const decisionCounts = countBy(rows, 'decision');
  const waitingRows = rows.filter((row) => row.rowStatus === 'waiting-for-operator');
  const approvedRows = rows.filter((row) => row.rowStatus === 'operator-approved');
  const duplicateRows = rows.filter((row) => row.candidateDuplicateGroup || row.candidateDuplicateIds);
  const p1PostwriteStatus = reports.p1PostwriteGate.data?.summary?.status ?? '';
  const priorBatchReady = p1PostwriteStatus === 'postwrite-verified';

  [
    ['P2_LABEL_HIT_AREA_ROWS', stageCounts.LABEL_HIT_AREA_REVIEW_FIRST ?? 0, EXPECTED.labelAndHitAreaRows],
    ['P2_VISUAL_APPROVAL_ROWS', stageCounts.VISUAL_APPROVAL_CHECK ?? 0, EXPECTED.visualApprovalCandidateRows],
    ['P2_MANUAL_RETRACE_ROWS', stageCounts.MANUAL_RETRACE_BATCH ?? 0, EXPECTED.manualRetraceRows],
  ].forEach(([label, actual, expected]) => {
    if (actual !== expected) blockers.push(`${label}:${actual}!=${expected}`);
  });

  if (!priorBatchReady) warnings.push(`P2_WAITING_FOR_P1_POSTWRITE:${p1PostwriteStatus || 'missing'}`);
  if (approvedRows.length === 0) warnings.push('P2_OPERATOR_APPROVAL_REQUIRED:0/36');
  if (reports.readiness.data?.summary?.readyForTemplateImport !== false && approvedRows.length === 0) {
    warnings.push('P2_READY_FOR_TEMPLATE_IMPORT_WITHOUT_APPROVALS');
  }

  const status = blockers.length > 0
    ? 'blocked'
    : !priorBatchReady && waitingRows.length > 0
      ? 'waiting-for-prior-batch-and-operator'
      : waitingRows.length > 0
        ? 'waiting-for-operator'
        : reports.readiness.data?.summary?.readyForTemplateImport === true
          ? 'ready-for-template-import'
          : 'operator-input-needs-gate-fix';

  const summary = {
    handoffVersion: HANDOFF_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    totalRows: rows.length,
    waitingForOperatorRows: waitingRows.length,
    approvedRows: approvedRows.length,
    needsRetraceRows: decisionCounts.NEEDS_RETRACE ?? 0,
    labelAndHitAreaRows: stageCounts.LABEL_HIT_AREA_REVIEW_FIRST ?? 0,
    visualApprovalCandidateRows: stageCounts.VISUAL_APPROVAL_CHECK ?? 0,
    manualRetraceRows: stageCounts.MANUAL_RETRACE_BATCH ?? 0,
    duplicateReferenceRows: duplicateRows.length,
    p1PostwriteStatus,
    priorBatchReady,
    nextActionStatus: reports.nextAction.data?.summary?.status ?? '',
    readinessStatus: reports.readiness.data?.summary?.status ?? '',
    readyForTemplateImport: reports.readiness.data?.summary?.readyForTemplateImport === true,
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesSourceInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    nextCommand: !priorBatchReady
      ? 'Finish P1 boundary-first postwrite verification before P2 production write; P2 operator tracing can continue in parallel.'
      : waitingRows.length > 0
        ? 'Fill P2 operator input rows, then run npm run stadium:daegu:p2-operator-prewrite-gate.'
        : 'Run npm run stadium:daegu:p2-operator-prewrite-gate before any write-template step.',
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    sourceReports: Object.fromEntries(
      Object.entries(reports).map(([name, reportEntry]) => [name, reportEntry.relativePath]),
    ),
    safetyContract: [
      'This handoff is read-only.',
      'It aggregates P2 package, decision, next-action, staging audit, validation, import dry-run, readiness, and P1 postwrite status.',
      'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, or reviewedAt.',
      'It never writes source input or the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'Candidate and draft paths are reference-only and must not be copied into correctedPath without explicit operator approval.',
      'P2 production write remains blocked until P1 boundary-first postwrite is verified.',
    ],
    requiredOperatorFields: [
      'operatorDecision=APPROVED',
      'correctedPath',
      'correctedLabelX/Y',
      'reviewer',
      'reviewedAt',
    ],
    operatorOrder: [
      {
        stage: 'LABEL_HIT_AREA_REVIEW_FIRST',
        rows: summary.labelAndHitAreaRows,
        action: 'Fix label/top-hit sensitive rows first.',
      },
      {
        stage: 'VISUAL_APPROVAL_CHECK',
        rows: summary.visualApprovalCandidateRows,
        action: 'Confirm candidate geometry against official PNG evidence before approval.',
      },
      {
        stage: 'MANUAL_RETRACE_BATCH',
        rows: summary.manualRetraceRows,
        action: 'Trace fresh corrected polygons and label points.',
      },
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p2-operator-handoff.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p2-operator-handoff.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p2-operator-handoff.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'stage',
      'block',
      'blockId',
      'decision',
      'rowStatus',
      'operatorAction',
      'requiredOperatorReview',
      'missingApprovalFields',
      'candidatePathPointCount',
      'candidateDuplicateGroup',
      'candidateDuplicateIds',
      'evidenceCrop',
      'nextOperatorAction',
    ],
    ...rows.map((row) => [
      row.stage,
      row.block,
      row.blockId,
      row.decision,
      row.rowStatus,
      row.operatorAction,
      row.requiredOperatorReview,
      row.missingApprovalFields.join(' '),
      row.candidatePathPointCount,
      row.candidateDuplicateGroup,
      row.candidateDuplicateIds,
      row.evidenceCrop,
      row.nextOperatorAction,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P2 Operator Handoff',
    '',
    `- handoff version: \`${HANDOFF_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- waiting for operator: ${summary.waitingForOperatorRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- P1 postwrite status: \`${summary.p1PostwriteStatus || 'missing'}\``,
    `- next command: ${summary.nextCommand}`,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Operator Order',
    '',
    markdownTable(
      ['stage', 'rows', 'action'],
      report.operatorOrder.map((row) => [`\`${row.stage}\``, row.rows, row.action]),
    ),
    '',
    '## Required Operator Fields',
    '',
    ...report.requiredOperatorFields.map((field) => `- \`${field}\``),
    '',
    '## Rows',
    '',
    markdownTable(
      ['stage', 'block', 'decision', 'status', 'missing fields', 'points', 'duplicate', 'evidence', 'next action'],
      rows.map((row) => [
        `\`${row.stage}\``,
        `\`${row.block}\``,
        `\`${row.decision}\``,
        `\`${row.rowStatus}\``,
        row.missingApprovalFields.map((field) => `\`${field}\``).join(' ') || '-',
        row.candidatePathPointCount,
        row.candidateDuplicateGroup || row.candidateDuplicateIds || '-',
        `\`${row.evidenceCrop}\``,
        row.nextOperatorAction,
      ]),
    ),
    '',
    '## Source Reports',
    '',
    ...Object.entries(report.sourceReports).map(([name, sourcePath]) => `- ${name}: \`${sourcePath}\``),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p2_operator_handoff_json:${jsonPath}`);
  console.log(`p2_operator_handoff_csv:${csvPath}`);
  console.log(`p2_operator_handoff_markdown:${markdownPath}`);
  console.log(`status:${summary.status} waiting=${summary.waitingForOperatorRows}/${summary.totalRows} approved=${summary.approvedRows}/${summary.totalRows} p1Postwrite=${summary.p1PostwriteStatus || 'missing'}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP2OperatorImport = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultInputPath = path.join(
    defaultReportDir,
    'daegu-p2-operator/daegu-seatmap-p2-operator-input.json',
  );
  const defaultValidationPath = path.join(
    defaultReportDir,
    'daegu-p2-operator/daegu-seatmap-operator-corrections-validation.json',
  );

  const IMPORT_VERSION = 'DAEGU_P2_OPERATOR_IMPORT_V1';
  const INPUT_PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
  const VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';
  const TARGET_BATCH_ID = 'BATCH_3_P2';
  const TARGET_PRIORITY = 'P2';
  const PRIOR_BATCHES = [
    { id: 'BATCH_1_P0', priorities: ['P0'] },
    { id: 'BATCH_2_P1', priorities: ['P1'] },
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

  const numberOrZero = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const rowChanged = (before, after) => IMPORT_FIELDS.some((field) => String(before[field] ?? '') !== String(after[field] ?? ''));

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

  const p2HandoffRows = (handoff.workItems ?? []).filter((row) => row.queuePriority === TARGET_PRIORITY);
  const expectedP2Ids = new Set(p2HandoffRows.map((row) => row.id));
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
  if (inputRows.length !== expectedP2Ids.size) blockers.push(`P2_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${expectedP2Ids.size}`);

  const inputIds = new Set(inputRows.map((row) => row.blockId));
  const nonP2InputRows = inputRows.filter((row) => !expectedP2Ids.has(row.blockId));
  if (nonP2InputRows.length > 0) {
    blockers.push(`INPUT_HAS_NON_P2_ROWS:${nonP2InputRows.map((row) => row.blockId).join(' ')}`);
  }
  const missingP2Ids = [...expectedP2Ids].filter((blockId) => !inputIds.has(blockId));
  if (missingP2Ids.length > 0) blockers.push(`INPUT_MISSING_P2_ROWS:${missingP2Ids.join(' ')}`);

  const missingTemplateIds = inputRows
    .map((row) => row.blockId)
    .filter((blockId) => !templateIds.has(blockId));
  if (missingTemplateIds.length > 0) {
    blockers.push(`TEMPLATE_MISSING_P2_ROWS:${missingTemplateIds.join(' ')}`);
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
    blockers.push(`INVALID_P2_OPERATOR_DECISION:${invalidDecisionInputRows.map((row) => row.blockId).join(' ')}`);
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
  if (decidedRows.length === 0) warnings.push('NO_P2_OPERATOR_DECISIONS_TO_IMPORT');
  if (writeTemplate && blockers.length === 0 && decidedRows.length === 0) {
    blockers.push('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_P2_DECISION');
  }
  if (writeTemplate && approvedRows.length === 0) {
    blockers.push('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P2_ROW');
  }
  if (writeTemplate && pendingRows.length > 0) {
    blockers.push(`WRITE_TEMPLATE_REQUIRES_NO_P2_PENDING_ROWS:${pendingRows.map((row) => row.block).join(' ')}`);
  }

  const validationSummary = validation?.summary ?? {};
  const validationApprovedRows = numberOrZero(validationSummary.approvedRows);
  const validApprovedRows = numberOrZero(validationSummary.validApprovedRows);
  const invalidApprovedRows = numberOrZero(validationSummary.invalidApprovedRows);
  const invalidMetadataRows = numberOrZero(validationSummary.invalidMetadataRows);
  if (writeTemplate && approvedRows.length > 0 && !validation) blockers.push('WRITE_TEMPLATE_REQUIRES_P2_VALIDATION_REPORT');
  if (writeTemplate && validation && validationSummary.validationVersion !== VALIDATION_VERSION) {
    blockers.push(`WRITE_TEMPLATE_VALIDATION_VERSION_MISMATCH:${validationSummary.validationVersion ?? ''}`);
  }
  if (writeTemplate && validation && validationSummary.status !== 'ok') blockers.push('WRITE_TEMPLATE_VALIDATION_STATUS_NOT_OK');
  if (writeTemplate && validation && validationApprovedRows !== approvedRows.length) {
    blockers.push(`WRITE_TEMPLATE_VALIDATION_APPROVED_ROWS_MISMATCH:${validationApprovedRows}:${approvedRows.length}`);
  }
  if (writeTemplate && invalidApprovedRows > 0) blockers.push(`WRITE_TEMPLATE_P2_INVALID_APPROVED_ROWS:${invalidApprovedRows}`);
  if (writeTemplate && invalidMetadataRows > 0) blockers.push(`WRITE_TEMPLATE_P2_INVALID_METADATA_ROWS:${invalidMetadataRows}`);
  if (writeTemplate && approvedRows.length > 0 && validApprovedRows !== approvedRows.length) {
    blockers.push(`WRITE_TEMPLATE_P2_VALID_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${validApprovedRows}:${approvedRows.length}`);
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
      'This script only imports P2 operator decisions into the corrections template.',
      'It blocks write-template while any P0 or P1 rows remain pending or approved in the current template.',
      'It blocks write-template while any P2 row remains PENDING.',
      'It blocks write-template unless at least one P2 row is operatorDecision=APPROVED.',
      'It blocks write-template when P2 APPROVED rows do not have validForApproval=true in the existing validator report.',
      'It blocks write-template when draft/staging metadata or DRAFT_VALIDATION_ONLY markers are present.',
      'Do not run npm run stadium:daegu:operator-corrections after write-template because it regenerates the template from handoff defaults.',
      'It never modifies src/data/daeguSeatData.ts or promotes blocks to OFFICIAL_IMAGE_TRACED.',
      'P2 candidate paths are references only and must not be promoted automatically.',
      'Run validation, preview, dry-run apply, batches, status, and write-guard after importing operator decisions.',
    ],
  };

  const jsonPath = path.join(reportDir, 'daegu-seatmap-p2-operator-import.json');
  const csvPath = path.join(reportDir, 'daegu-seatmap-p2-operator-import.csv');
  const markdownPath = path.join(reportDir, 'daegu-seatmap-p2-operator-import.md');

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
    '# Daegu P2 Operator Import',
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

  console.log(`p2_operator_import_json:${jsonPath}`);
  console.log(`p2_operator_import_csv:${csvPath}`);
  console.log(`p2_operator_import_markdown:${markdownPath}`);
  console.log(`status:${summary.status} mode=${summary.mode} imported=${summary.importedRows} changed=${summary.changedRows} decided=${summary.decidedRows} approved=${summary.approvedRows}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runP2OperatorPackage = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP2DraftDir = path.join(defaultReportDir, 'daegu-p2-draft');
  const defaultP2OperatorDir = path.join(defaultReportDir, 'daegu-p2-operator');

  const PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
  const STAGING_PACKAGE_VERSION = 'DAEGU_P2_REVIEW_PACKAGE_V1';
  const TARGET_BATCH_ID = 'BATCH_3_P2';
  const TARGET_PRIORITY = 'P2';
  const EXPECTED = {
    rows: 36,
    approvalCandidateRows: 3,
    manualRetraceRows: 33,
    labelAndHitAreaRows: 2,
    visualApprovalCandidateRows: 1,
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

  const hasOperatorFilledEditableFields = (row) => {
    const editable = editableFieldsFrom(row);
    return editable.operatorDecision !== 'PENDING'
      || Boolean(editable.correctedPath)
      || editable.correctedLabelX !== ''
      || editable.correctedLabelY !== ''
      || Boolean(editable.reviewer)
      || Boolean(editable.reviewedAt)
      || Boolean(editable.operatorNote);
  };

  const operatorActionFor = (stagingRow) => {
    if (stagingRow?.requiredOperatorReview === 'MANUAL_RETRACE_REQUIRED') {
      return 'OPERATOR_MANUAL_TRACE_REQUIRED';
    }
    if (stagingRow?.requiredOperatorReview === 'LABEL_AND_HIT_AREA_REVIEW') {
      return 'OPERATOR_LABEL_AND_HIT_AREA_REVIEW';
    }
    return 'OPERATOR_VISUAL_APPROVAL_CANDIDATE';
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const p2DraftDir = path.resolve(frontendRoot, argValue('--p2-draft-dir', defaultP2DraftDir));
  const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
  const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
  const templatePath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
  const batchesPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-batches.json');
  const reviewPackagePath = path.join(p2DraftDir, 'daegu-seatmap-p2-review-package.json');
  const approvalCandidatesPath = path.join(p2DraftDir, 'daegu-seatmap-p2-operator-approval-candidates.json');
  const manualRetracePath = path.join(p2DraftDir, 'daegu-seatmap-p2-manual-retrace-template.json');
  const operatorInputJsonPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.json');
  const operatorInputCsvPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.csv');
  const checklistCsvPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-checklist.csv');
  const checklistMarkdownPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-checklist.md');
  const summaryJsonPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-package.json');
  const summaryMarkdownPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-package.md');

  const handoff = await readJson(handoffPath);
  const template = await readJson(templatePath);
  const batches = await readJson(batchesPath);
  const reviewPackage = await readJson(reviewPackagePath);
  const approvalCandidates = await readJson(approvalCandidatesPath);
  const manualRetrace = await readJson(manualRetracePath);
  const existingOperatorInput = await readOptionalJson(operatorInputJsonPath);
  const currentExpected = {
    rows: Number(reviewPackage.p2Rows ?? 0),
    approvalCandidateRows: Number(reviewPackage.labelAndHitAreaReview ?? 0)
      + Number(reviewPackage.visualApprovalCandidates ?? 0),
    manualRetraceRows: Number(reviewPackage.manualRetraceRequired ?? 0),
    labelAndHitAreaRows: Number(reviewPackage.labelAndHitAreaReview ?? 0),
    visualApprovalCandidateRows: Number(reviewPackage.visualApprovalCandidates ?? 0),
  };

  const approvalRows = Array.isArray(approvalCandidates.corrections) ? approvalCandidates.corrections : [];
  const manualRows = Array.isArray(manualRetrace.corrections) ? manualRetrace.corrections : [];
  const stagingRows = [
    ...approvalRows.map((row) => ({ ...row, stagingBucket: 'APPROVAL_CANDIDATE' })),
    ...manualRows.map((row) => ({ ...row, stagingBucket: 'MANUAL_RETRACE' })),
  ];
  const stagingByBlockId = new Map(stagingRows.map((row) => [row.blockId, row]));
  const templateByBlockId = new Map((template.corrections ?? []).map((row) => [row.blockId, row]));
  const existingInputRows = Array.isArray(existingOperatorInput?.corrections)
    ? existingOperatorInput.corrections
    : [];
  const existingInputByBlockId = new Map(existingInputRows.map((row) => [row.blockId, row]));

  const p2Rows = (handoff.workItems ?? [])
    .filter((row) => row.queuePriority === TARGET_PRIORITY)
    .sort((a, b) => String(a.block).localeCompare(String(b.block), 'ko'));

  const packageRows = p2Rows.map((row) => {
    const stagingRow = stagingByBlockId.get(row.id) ?? {};
    const templateRow = templateByBlockId.get(row.id) ?? {};
    const existingInputRow = existingInputByBlockId.get(row.id);
    const shouldPreserveExistingInput = hasOperatorFilledEditableFields(existingInputRow);
    const editableSourceRow = shouldPreserveExistingInput ? existingInputRow : templateRow;
    const editableFields = editableFieldsFrom(editableSourceRow);
    const candidatePath = stagingRow.correctedPath || row.candidateOuterBoundaryPath || row.candidateBoundaryPath || row.candidateHullPath || '';
    const candidateLabelX = stagingRow.correctedLabelX ?? row.candidateCenter?.x ?? '';
    const candidateLabelY = stagingRow.correctedLabelY ?? row.candidateCenter?.y ?? '';

    return {
      blockId: row.id,
      block: row.block,
      name: row.name,
      category: row.category,
      queuePriority: row.queuePriority,
      batchId: TARGET_BATCH_ID,
      alignmentClass: row.alignmentClass,
      candidateStatus: row.candidateStatus,
      candidateDuplicateGroup: row.candidateDuplicateGroup || '',
      recommendedAction: row.recommendedAction,
      requiredOperatorReview: stagingRow.requiredOperatorReview || '',
      operatorAction: operatorActionFor(stagingRow),
      stagingBucket: stagingRow.stagingBucket || '',
      evidenceCrop: stagingRow.evidenceCrop || '',
      currentPath: row.currentPath,
      currentLabelX: row.labelX,
      currentLabelY: row.labelY,
      candidatePath,
      candidatePathPointCount: pointCount(candidatePath),
      candidateLabelX,
      candidateLabelY,
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

  const p2Batch = (batches.batches ?? []).find((batch) => batch.id === TARGET_BATCH_ID);
  const blockers = [];
  if (reviewPackage.packageVersion !== STAGING_PACKAGE_VERSION) {
    blockers.push(`STAGING_PACKAGE_VERSION_MISMATCH:${reviewPackage.packageVersion ?? ''}`);
  }
  if (reviewPackage.status !== 'ok') blockers.push(`STAGING_PACKAGE_STATUS_NOT_OK:${reviewPackage.status ?? ''}`);
  if (p2Rows.length !== currentExpected.rows) blockers.push(`P2_ROW_COUNT_CHANGED:${p2Rows.length}:${currentExpected.rows}`);
  if (!p2Batch) {
    blockers.push(`MISSING_BATCH:${TARGET_BATCH_ID}`);
  } else {
    if (!p2Batch.queuePriorities?.includes(TARGET_PRIORITY)) blockers.push(`P2_BATCH_PRIORITY_MISMATCH:${(p2Batch.queuePriorities ?? []).join(' ')}`);
  }
  if (approvalCandidates.stagingOnly !== true) blockers.push('APPROVAL_CANDIDATES_NOT_STAGING_ONLY');
  if (manualRetrace.stagingOnly !== true) blockers.push('MANUAL_RETRACE_NOT_STAGING_ONLY');
  if (approvalRows.length !== currentExpected.approvalCandidateRows) {
    blockers.push(`APPROVAL_CANDIDATE_ROWS:${approvalRows.length}!=${currentExpected.approvalCandidateRows}`);
  }
  if (manualRows.length !== currentExpected.manualRetraceRows) {
    blockers.push(`MANUAL_RETRACE_ROWS:${manualRows.length}!=${currentExpected.manualRetraceRows}`);
  }

  const missingStagingRows = p2Rows.filter((row) => !stagingByBlockId.has(row.id));
  if (missingStagingRows.length > 0) {
    blockers.push(`MISSING_P2_STAGING_ROWS:${missingStagingRows.map((row) => row.block).join(' ')}`);
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
    sourceReviewPackage: path.relative(frontendRoot, reviewPackagePath),
    sourceApprovalCandidates: path.relative(frontendRoot, approvalCandidatesPath),
    sourceManualRetrace: path.relative(frontendRoot, manualRetracePath),
    existingOperatorInput: path.relative(frontendRoot, operatorInputJsonPath),
    outputDirectory: path.relative(frontendRoot, p2OperatorDir),
    totalRows: packageRows.length,
    baselineExpectedRows: EXPECTED.rows,
    expectedRows: currentExpected.rows,
    approvalCandidateRows: packageRows.filter((row) => row.stagingBucket === 'APPROVAL_CANDIDATE').length,
    manualRetraceRows: packageRows.filter((row) => row.stagingBucket === 'MANUAL_RETRACE').length,
    labelAndHitAreaRows: packageRows.filter((row) => row.requiredOperatorReview === 'LABEL_AND_HIT_AREA_REVIEW').length,
    visualApprovalCandidateRows: packageRows.filter((row) => row.requiredOperatorReview === 'VISUAL_APPROVAL_CANDIDATE').length,
    evidenceCropRows: packageRows.filter((row) => row.evidenceCrop).length,
    candidatePathReferenceRows: packageRows.filter((row) => row.candidatePath).length,
    approvedRows: packageRows.filter((row) => row.operatorDecision === 'APPROVED').length,
    existingInputRows: existingInputRows.length,
    preservedEditableRows: packageRows.filter((row) => row.editableSource === 'existingOperatorInput').length,
    templateEditableRows: packageRows.filter((row) => row.editableSource === 'template').length,
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    blockers,
  };

  const expectedCounts = [
    ['P2_APPROVAL_CANDIDATE_ROWS', summary.approvalCandidateRows, currentExpected.approvalCandidateRows],
    ['P2_MANUAL_RETRACE_ROWS', summary.manualRetraceRows, currentExpected.manualRetraceRows],
    ['P2_LABEL_AND_HIT_AREA_ROWS', summary.labelAndHitAreaRows, currentExpected.labelAndHitAreaRows],
    ['P2_VISUAL_APPROVAL_CANDIDATE_ROWS', summary.visualApprovalCandidateRows, currentExpected.visualApprovalCandidateRows],
  ];
  expectedCounts.forEach(([label, actual, expected]) => {
    if (actual !== expected) summary.blockers.push(`${label}:${actual}!=${expected}`);
  });
  summary.status = summary.blockers.length > 0 ? 'blocked' : 'ok';

  const packageJson = {
    generatedAt: summary.generatedAt,
    packageVersion: PACKAGE_VERSION,
    targetBatchId: TARGET_BATCH_ID,
    draftOnly: false,
    productionWriteAllowed: false,
    sourceHandoff: summary.sourceHandoff,
    sourceReviewPackage: summary.sourceReviewPackage,
    sourceApprovalCandidates: summary.sourceApprovalCandidates,
    sourceManualRetrace: summary.sourceManualRetrace,
    existingOperatorInput: summary.existingOperatorInput,
    safetyContract: [
      'Regenerating this package must preserve operator-filled P2 editable fields from the existing operator input file.',
      'Candidate paths in this package are references only and must not be promoted automatically.',
      'This package is not a production write path.',
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

  await fs.mkdir(p2OperatorDir, { recursive: true });
  await fs.writeFile(operatorInputJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

  const editableCsvHeader = [
    'blockId',
    'block',
    'name',
    'batchId',
    'queuePriority',
    'operatorAction',
    'requiredOperatorReview',
    'stagingBucket',
    'editableSource',
    'evidenceCrop',
    'candidatePath',
    'candidateLabelX',
    'candidateLabelY',
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
    'requiredOperatorReview',
    'stagingBucket',
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
    '# Daegu P2 Operator Checklist',
    '',
    `- package version: \`${PACKAGE_VERSION}\``,
    `- target batch: \`${TARGET_BATCH_ID}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- approval candidate rows: ${summary.approvalCandidateRows}`,
    `- manual retrace rows: ${summary.manualRetraceRows}`,
    `- label and hit area rows: ${summary.labelAndHitAreaRows}`,
    `- visual approval candidate rows: ${summary.visualApprovalCandidateRows}`,
    `- candidate path reference rows: ${summary.candidatePathReferenceRows}`,
    `- preserved editable rows: ${summary.preservedEditableRows}`,
    '',
    '## Operator Rules',
    '',
    '1. P2 row는 P0/P1 batch가 종료된 뒤 production write 대상으로 검토합니다.',
    '2. `candidatePath` / `candidateLabelX` / `candidateLabelY`는 참고용이며 운영자 승인 없이 `corrected*` field로 복사하지 않습니다.',
    '3. 승인하려면 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`을 채웁니다.',
    '4. manual retrace row는 corrected fields가 비어 있어야 하며 운영자가 새 path를 직접 작성해야 합니다.',
    '5. package를 다시 생성해도 기존 operator input의 입력된 editable field는 보존합니다.',
    '',
    '## Rows',
    '',
    markdownTable(
      [
        'block',
        'action',
        'review',
        'bucket',
        'points',
        'duplicate',
        'failures',
        'editable source',
        'evidence crop',
      ],
      packageRows.map((row) => [
        `\`${row.block}\``,
        `\`${row.operatorAction}\``,
        `\`${row.requiredOperatorReview || '-'}\``,
        `\`${row.stagingBucket || '-'}\``,
        row.candidatePathPointCount,
        row.candidateDuplicateGroup || '-',
        row.officialFailureReasons || '-',
        `\`${row.editableSource}\``,
        row.evidenceCrop,
      ]),
    ),
    '',
    '## Editable Inputs',
    '',
    '- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json`',
    '- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.csv`',
    '',
  ].join('\n'), 'utf8');

  await fs.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(summaryMarkdownPath, [
    '# Daegu P2 Operator Package',
    '',
    `- package version: \`${PACKAGE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- target batch: \`${summary.targetBatchId}\``,
    `- rows: ${summary.totalRows}`,
    `- approval candidate rows: ${summary.approvalCandidateRows}`,
    `- manual retrace rows: ${summary.manualRetraceRows}`,
    `- approved rows in package: ${summary.approvedRows}`,
    `- existing input rows: ${summary.existingInputRows}`,
    `- preserved editable rows: ${summary.preservedEditableRows}`,
    '',
    '## Outputs',
    '',
    '- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json`',
    '- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.csv`',
    '- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-checklist.md`',
    '- `reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-checklist.csv`',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0
      ? markdownTable(['blocker'], summary.blockers.map((blocker) => [blocker]))
      : 'No package blockers.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p2_operator_package_json:${summaryJsonPath}`);
  console.log(`p2_operator_package_markdown:${summaryMarkdownPath}`);
  console.log(`p2_operator_checklist_markdown:${checklistMarkdownPath}`);
  console.log(`p2_operator_input_json:${operatorInputJsonPath}`);
  console.log(`status:${summary.status} p2=${summary.totalRows} approvalCandidates=${summary.approvalCandidateRows} manualRetrace=${summary.manualRetraceRows} approved=${summary.approvedRows}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runP2OperatorPostEntryQa = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP2OperatorDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-operator');

  const POST_ENTRY_QA_VERSION = 'DAEGU_P2_OPERATOR_POST_ENTRY_QA_V1';
  const PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
  const ENTRY_SHEET_VERSION = 'DAEGU_P2_OPERATOR_ENTRY_SHEET_V1';
  const TRACING_PACK_VERSION = 'DAEGU_P2_OPERATOR_TRACING_PACK_V1';
  const PREFLIGHT_VERSION = 'DAEGU_P2_OPERATOR_WORKSET_PREFLIGHT_V1';
  const HANDOFF_VERSION = 'DAEGU_P2_OPERATOR_HANDOFF_V1';
  const TARGET_BATCH_ID = 'BATCH_3_P2';
  const EXPECTED = {
    totalRows: 36,
    p2aRows: 2,
    p2bRows: 1,
    p2cRows: 5,
    p2dRows: 28,
  };
  const ACTIONS = {
    fillRequiredFields: 'FILL_REQUIRED_FIELDS',
    retraceFromOfficialPng: 'RETRACE_FROM_OFFICIAL_PNG',
    moveLabelPoint: 'MOVE_LABEL_POINT',
    reviewLabelTopHit: 'REVIEW_LABEL_TOP_HIT',
    doNotCopyReferencePath: 'DO_NOT_COPY_REFERENCE_PATH',
    runWorksetPreflight: 'RUN_WORKSET_PREFLIGHT',
    waitForP1Postwrite: 'WAIT_FOR_P1_POSTWRITE',
  };
  const BLOCKERS = {
    approvedRowMissingFields: 'APPROVED_ROW_MISSING_FIELDS',
    correctedPathReusesCurrentPath: 'CORRECTED_PATH_REUSES_CURRENT_PATH',
    correctedPathReusesCandidatePath: 'CORRECTED_PATH_REUSES_CANDIDATE_PATH',
    correctedPathRequiresAtLeastSixPoints: 'CORRECTED_PATH_REQUIRES_AT_LEAST_SIX_POINTS',
    correctedLabelXyNotNumeric: 'CORRECTED_LABEL_XY_NOT_NUMERIC',
    evidenceCropMissing: 'EVIDENCE_CROP_MISSING',
    tracingSvgMissing: 'TRACING_SVG_MISSING',
    worksetAssignmentMismatch: 'WORKSET_ASSIGNMENT_MISMATCH',
  };

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const fileExists = async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
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

  const isBlank = (value) => String(value ?? '').trim() === '';
  const isNumeric = (value) => !isBlank(value) && Number.isFinite(Number(value));
  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';
  const normalizePath = (value) => String(value ?? '').trim().replace(/\s+/gu, ' ').toUpperCase();
  const svgPathPointCount = (value) => {
    const numbers = String(value ?? '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/giu) ?? [];
    return Math.floor(numbers.length / 2);
  };

  const addUnique = (items, value) => {
    if (!items.includes(value)) items.push(value);
  };

  const requiredFieldBlockers = (row) => {
    const missing = [];
    if (isBlank(row.correctedPath)) missing.push('correctedPath');
    if (!isNumeric(row.correctedLabelX) || !isNumeric(row.correctedLabelY)) missing.push('correctedLabelX/Y');
    if (isBlank(row.reviewer)) missing.push('reviewer');
    if (isBlank(row.reviewedAt)) missing.push('reviewedAt');
    return missing;
  };

  const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));
  const inputPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.json');
  const entrySheetPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-entry-sheet.json');
  const preflightPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-workset-preflight.json');
  const tracingPackPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-tracing-pack/daegu-seatmap-p2-operator-tracing-pack.json');
  const handoffPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-handoff.json');

  const input = await readJson(inputPath);
  const entrySheet = await readJson(entrySheetPath);
  const preflight = await readJson(preflightPath);
  const tracingPack = await readJson(tracingPackPath);
  const handoff = await readJson(handoffPath);
  const structuralBlockers = [];

  if (input.packageVersion !== PACKAGE_VERSION) structuralBlockers.push(`P2_INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  if (input.targetBatchId !== TARGET_BATCH_ID) structuralBlockers.push(`P2_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  if (input.productionWriteAllowed !== false) structuralBlockers.push('P2_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (entrySheet.summary?.entrySheetVersion !== ENTRY_SHEET_VERSION) structuralBlockers.push(`P2_ENTRY_SHEET_VERSION_MISMATCH:${entrySheet.summary?.entrySheetVersion ?? ''}`);
  if (preflight.summary?.preflightVersion !== PREFLIGHT_VERSION) structuralBlockers.push(`P2_PREFLIGHT_VERSION_MISMATCH:${preflight.summary?.preflightVersion ?? ''}`);
  if (tracingPack.summary?.tracingPackVersion !== TRACING_PACK_VERSION) structuralBlockers.push(`P2_TRACING_PACK_VERSION_MISMATCH:${tracingPack.summary?.tracingPackVersion ?? ''}`);
  if (handoff.summary?.handoffVersion !== HANDOFF_VERSION) structuralBlockers.push(`P2_HANDOFF_VERSION_MISMATCH:${handoff.summary?.handoffVersion ?? ''}`);
  if (entrySheet.summary?.productionWriteAllowed !== false) structuralBlockers.push('P2_ENTRY_SHEET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (preflight.summary?.productionWriteAllowed !== false) structuralBlockers.push('P2_PREFLIGHT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (tracingPack.summary?.productionWriteAllowed !== false) structuralBlockers.push('P2_TRACING_PACK_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (handoff.summary?.productionWriteAllowed !== false) structuralBlockers.push('P2_HANDOFF_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const entryRows = (Array.isArray(entrySheet.worksets) ? entrySheet.worksets : [])
    .flatMap((workset) => (Array.isArray(workset.rows) ? workset.rows : []));
  const preflightRows = Array.isArray(preflight.rows) ? preflight.rows : [];
  const tracingRows = Array.isArray(tracingPack.rows) ? tracingPack.rows : [];

  if (inputRows.length !== EXPECTED.totalRows) structuralBlockers.push(`P2_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.totalRows}`);
  if (entryRows.length !== EXPECTED.totalRows) structuralBlockers.push(`P2_ENTRY_ROW_COUNT_MISMATCH:${entryRows.length}:${EXPECTED.totalRows}`);
  if (preflightRows.length !== EXPECTED.totalRows) structuralBlockers.push(`P2_PREFLIGHT_ROW_COUNT_MISMATCH:${preflightRows.length}:${EXPECTED.totalRows}`);
  if (tracingRows.length !== EXPECTED.totalRows) structuralBlockers.push(`P2_TRACING_ROW_COUNT_MISMATCH:${tracingRows.length}:${EXPECTED.totalRows}`);

  const entryByBlockId = new Map(entryRows.map((row) => [row.blockId, row]));
  const preflightByBlockId = new Map(preflightRows.map((row) => [row.blockId, row]));
  const tracingByBlockId = new Map(tracingRows.map((row) => [row.blockId, row]));
  const p1PostwriteStatus = handoff.summary?.p1PostwriteStatus ?? '';
  const p1PostwriteVerified = p1PostwriteStatus === 'postwrite-verified';

  const rows = [];
  for (const inputRow of inputRows) {
    const entryRow = entryByBlockId.get(inputRow.blockId) ?? {};
    const preflightRow = preflightByBlockId.get(inputRow.blockId) ?? {};
    const tracingRow = tracingByBlockId.get(inputRow.blockId) ?? {};
    const decision = normalizeDecision(inputRow.operatorDecision);
    const approved = decision === 'APPROVED';
    const blockers = [];
    const actions = [];
    const warnings = [];
    const correctedPathPointCount = svgPathPointCount(inputRow.correctedPath);
    const missingFields = approved ? requiredFieldBlockers(inputRow) : [];
    const evidenceCrop = inputRow.evidenceCrop ?? entryRow.evidenceCrop ?? tracingRow.evidenceCrop ?? '';
    const tracingSvg = tracingRow.tracingSvg ?? '';
    const evidenceCropExists = evidenceCrop
      ? await fileExists(path.resolve(frontendRoot, evidenceCrop))
      : false;
    const tracingSvgExists = tracingSvg
      ? await fileExists(path.resolve(frontendRoot, tracingSvg))
      : false;

    if (entryRow.workset && preflightRow.workset && entryRow.workset !== preflightRow.workset) {
      blockers.push(`${BLOCKERS.worksetAssignmentMismatch}:entry:${entryRow.workset}:preflight:${preflightRow.workset}`);
    }
    if (entryRow.workset && tracingRow.workset && entryRow.workset !== tracingRow.workset) {
      blockers.push(`${BLOCKERS.worksetAssignmentMismatch}:entry:${entryRow.workset}:tracing:${tracingRow.workset}`);
    }
    if (approved && missingFields.length > 0) {
      blockers.push(`${BLOCKERS.approvedRowMissingFields}:${missingFields.join('+')}`);
      addUnique(actions, ACTIONS.fillRequiredFields);
    }
    if (approved && (!isNumeric(inputRow.correctedLabelX) || !isNumeric(inputRow.correctedLabelY))) {
      blockers.push(BLOCKERS.correctedLabelXyNotNumeric);
      addUnique(actions, ACTIONS.moveLabelPoint);
    }
    if (approved && correctedPathPointCount < 6) {
      blockers.push(`${BLOCKERS.correctedPathRequiresAtLeastSixPoints}:${correctedPathPointCount}:6`);
      addUnique(actions, ACTIONS.retraceFromOfficialPng);
    }
    if (approved && !isBlank(inputRow.correctedPath) && normalizePath(inputRow.correctedPath) === normalizePath(inputRow.currentPath)) {
      blockers.push(BLOCKERS.correctedPathReusesCurrentPath);
      addUnique(actions, ACTIONS.doNotCopyReferencePath);
      addUnique(actions, ACTIONS.retraceFromOfficialPng);
    }
    if (approved && !isBlank(inputRow.correctedPath) && normalizePath(inputRow.correctedPath) === normalizePath(inputRow.candidatePath)) {
      blockers.push(BLOCKERS.correctedPathReusesCandidatePath);
      addUnique(actions, ACTIONS.doNotCopyReferencePath);
      addUnique(actions, ACTIONS.retraceFromOfficialPng);
    }
    if (approved && !evidenceCropExists) {
      blockers.push(BLOCKERS.evidenceCropMissing);
      addUnique(actions, ACTIONS.retraceFromOfficialPng);
    }
    if (approved && !tracingSvgExists) {
      blockers.push(BLOCKERS.tracingSvgMissing);
      addUnique(actions, ACTIONS.runWorksetPreflight);
    }
    if (approved && entryRow.workset === 'P2-A') {
      warnings.push('LABEL_TOP_HIT_REQUIRES_OPERATOR_QA');
      addUnique(actions, ACTIONS.reviewLabelTopHit);
    }
    if (approved && !p1PostwriteVerified) {
      addUnique(actions, ACTIONS.waitForP1Postwrite);
    }
    if (approved && (preflightRow.blockers ?? []).length > 0) {
      addUnique(actions, ACTIONS.runWorksetPreflight);
    }
    if (!approved) {
      addUnique(actions, ACTIONS.fillRequiredFields);
    }

    rows.push({
      workset: entryRow.workset ?? preflightRow.workset ?? tracingRow.workset ?? 'UNASSIGNED',
      block: inputRow.block,
      blockId: inputRow.blockId,
      name: inputRow.name,
      editableTarget: entryRow.editableTarget ?? '',
      decision,
      rowStatus: blockers.length > 0
        ? 'blocked-after-entry'
        : approved
          ? 'approved-post-entry-qa-passed'
          : 'waiting-for-operator-entry',
      approved,
      blockers,
      warnings,
      actions,
      correctedPathPointCount,
      minCorrectedPathPoints: 6,
      correctedLabelX: inputRow.correctedLabelX ?? '',
      correctedLabelY: inputRow.correctedLabelY ?? '',
      reviewer: inputRow.reviewer ?? '',
      reviewedAt: inputRow.reviewedAt ?? '',
      evidenceCrop,
      evidenceCropExists,
      tracingSvg,
      tracingSvgExists,
      entryWorkset: entryRow.workset ?? '',
      preflightWorkset: preflightRow.workset ?? '',
      tracingWorkset: tracingRow.workset ?? '',
      preflightStatus: preflightRow.rowStatus ?? '',
      p1PostwriteStatus,
    });
  }

  const worksetSummaries = ['P2-A', 'P2-B', 'P2-C', 'P2-D'].map((workset) => {
    const worksetRows = rows.filter((row) => row.workset === workset);
    const expectedRows = EXPECTED[`${workset.toLowerCase().replace('-', '')}Rows`];
    return {
      workset,
      expectedRows,
      rowCount: worksetRows.length,
      approvedRows: worksetRows.filter((row) => row.approved).length,
      waitingRows: worksetRows.filter((row) => !row.approved).length,
      blockedRows: worksetRows.filter((row) => row.blockers.length > 0).length,
    };
  });
  for (const worksetSummary of worksetSummaries) {
    if (worksetSummary.rowCount !== worksetSummary.expectedRows) {
      structuralBlockers.push(`${worksetSummary.workset}_POST_ENTRY_ROW_COUNT_MISMATCH:${worksetSummary.rowCount}:${worksetSummary.expectedRows}`);
    }
  }

  const approvedRows = rows.filter((row) => row.approved);
  const blockedRows = rows.filter((row) => row.blockers.length > 0);
  const allBlockers = [
    ...structuralBlockers,
    ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.block}:${blocker}`)),
  ];
  const status = allBlockers.length > 0
    ? 'blocked-after-entry'
    : approvedRows.length === 0
      ? 'waiting-for-operator-entry'
      : !p1PostwriteVerified
        ? 'waiting-for-p1-postwrite'
        : 'ready-for-p2-readiness';

  const summary = {
    postEntryQaVersion: POST_ENTRY_QA_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    sourceInput: path.relative(frontendRoot, inputPath),
    sourceEntrySheet: path.relative(frontendRoot, entrySheetPath),
    sourcePreflight: path.relative(frontendRoot, preflightPath),
    sourceTracingPack: path.relative(frontendRoot, tracingPackPath),
    sourceHandoff: path.relative(frontendRoot, handoffPath),
    totalRows: rows.length,
    approvedRows: approvedRows.length,
    waitingForOperatorRows: rows.filter((row) => !row.approved).length,
    blockedRows: blockedRows.length,
    p1PostwriteStatus,
    p1PostwriteVerified,
    readyForP2Readiness: status === 'ready-for-p2-readiness',
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesSourceInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers: allBlockers,
    warnings: [...new Set(rows.flatMap((row) => row.warnings))],
    actions: [...new Set(rows.flatMap((row) => row.actions))],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    actionCatalog: ACTIONS,
    safetyContract: [
      'This post-entry QA is read-only.',
      'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, or reviewedAt.',
      'It never writes source input or the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'APPROVED rows must not copy currentPath or candidatePath into correctedPath.',
      'Evidence crop and tracing SVG must exist before a row can advance.',
      'P2 production write waits for P1 boundary-first postwrite verification.',
    ],
    worksets: worksetSummaries,
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p2-operator-post-entry-qa.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p2-operator-post-entry-qa.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p2-operator-post-entry-qa.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'workset',
      'block',
      'blockId',
      'decision',
      'rowStatus',
      'blockers',
      'actions',
      'correctedPathPointCount',
      'evidenceCropExists',
      'tracingSvgExists',
      'p1PostwriteStatus',
      'editableTarget',
    ],
    ...rows.map((row) => [
      row.workset,
      row.block,
      row.blockId,
      row.decision,
      row.rowStatus,
      row.blockers.join(' '),
      row.actions.join(' '),
      row.correctedPathPointCount,
      row.evidenceCropExists,
      row.tracingSvgExists,
      row.p1PostwriteStatus,
      row.editableTarget,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P2 Operator Post-Entry QA',
    '',
    `- post-entry QA version: \`${POST_ENTRY_QA_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- waiting for operator: ${summary.waitingForOperatorRows}`,
    `- blocked rows: ${summary.blockedRows}`,
    `- P1 postwrite status: \`${summary.p1PostwriteStatus || 'missing'}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Action Catalog',
    '',
    ...Object.values(ACTIONS).map((action) => `- \`${action}\``),
    '',
    '## Worksets',
    '',
    markdownTable(
      ['workset', 'rows', 'approved', 'waiting', 'blocked'],
      worksetSummaries.map((workset) => [
        `\`${workset.workset}\``,
        `${workset.rowCount}/${workset.expectedRows}`,
        workset.approvedRows,
        workset.waitingRows,
        workset.blockedRows,
      ]),
    ),
    '',
    '## Rows',
    '',
    markdownTable(
      ['workset', 'block', 'decision', 'status', 'blockers', 'actions', 'evidence', 'tracing svg'],
      rows.map((row) => [
        `\`${row.workset}\``,
        `\`${row.block}\``,
        `\`${row.decision}\``,
        `\`${row.rowStatus}\``,
        row.blockers.map((blocker) => `\`${blocker}\``).join(' ') || '-',
        row.actions.map((action) => `\`${action}\``).join(' ') || '-',
        String(row.evidenceCropExists),
        String(row.tracingSvgExists),
      ]),
    ),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p2_operator_post_entry_qa_json:${jsonPath}`);
  console.log(`p2_operator_post_entry_qa_csv:${csvPath}`);
  console.log(`p2_operator_post_entry_qa_markdown:${markdownPath}`);
  console.log(`status:${summary.status} approved=${summary.approvedRows} waiting=${summary.waitingForOperatorRows}/${summary.totalRows} blocked=${summary.blockedRows} p1Postwrite=${summary.p1PostwriteStatus || 'missing'}`);

  if (summary.status === 'blocked-after-entry') {
    process.exitCode = 1;
  }
};

const runP2OperatorReadiness = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP2ReportDir = path.join(defaultReportDir, 'daegu-p2-operator');

  const READINESS_VERSION = 'DAEGU_P2_OPERATOR_READINESS_V2';
  const PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
  const IMPORT_VERSION = 'DAEGU_P2_OPERATOR_IMPORT_V1';
  const VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';
  const TEMPLATE_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1';
  const POST_ENTRY_QA_VERSION = 'DAEGU_P2_OPERATOR_POST_ENTRY_QA_V1';
  const P1_POSTWRITE_GATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_POSTWRITE_GATE_V1';
  const TARGET_BATCH_ID = 'BATCH_3_P2';
  const TARGET_PRIORITY = 'P2';
  const PRIOR_BATCHES = [
    { id: 'BATCH_1_P0', priorities: ['P0'] },
    { id: 'BATCH_2_P1', priorities: ['P1'] },
  ];
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const hasArg = (name) => process.argv.includes(name);

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

  const p2ReportDir = path.resolve(frontendRoot, argValue('--p2-report-dir', defaultP2ReportDir));
  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const allowWaitingExitZero = hasArg('--allow-waiting-exit-zero') || hasArg('--report-only');
  const packagePath = path.join(p2ReportDir, 'daegu-seatmap-p2-operator-package.json');
  const inputPath = path.join(p2ReportDir, 'daegu-seatmap-p2-operator-input.json');
  const postEntryQaPath = path.join(p2ReportDir, 'daegu-seatmap-p2-operator-post-entry-qa.json');
  const validationPath = path.join(p2ReportDir, 'daegu-seatmap-operator-corrections-validation.json');
  const importPath = path.join(reportDir, 'daegu-seatmap-p2-operator-import.json');
  const templatePath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
  const p1PostwriteGatePath = path.join(
    reportDir,
    'daegu-p1-operator/daegu-seatmap-p1-boundary-first-postwrite-gate.json',
  );

  const reports = {
    package: await readJsonReport(packagePath),
    input: await readJsonReport(inputPath),
    postEntryQa: await readJsonReport(postEntryQaPath),
    validation: await readJsonReport(validationPath),
    import: await readJsonReport(importPath),
    template: await readJsonReport(templatePath),
    p1PostwriteGate: await readJsonReport(p1PostwriteGatePath),
  };

  const packageReport = reports.package.data ?? {};
  const input = reports.input.data ?? {};
  const postEntrySummary = reports.postEntryQa.data?.summary ?? {};
  const validationSummary = reports.validation.data?.summary ?? {};
  const importSummary = reports.import.data?.summary ?? {};
  const p1PostwriteSummary = reports.p1PostwriteGate.data?.summary ?? {};
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
  const p2TemplateRows = templateRows.filter((row) => row.queuePriority === TARGET_PRIORITY);
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
  const p1PostwriteStatus = p1PostwriteSummary.status ?? postEntrySummary.p1PostwriteStatus ?? '';
  const p1PostwriteVerified = p1PostwriteStatus === 'postwrite-verified';

  const blockers = [];
  const warnings = [];
  const waitingReasons = [];

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
  if (reports.postEntryQa.exists && postEntrySummary.postEntryQaVersion !== POST_ENTRY_QA_VERSION) {
    blockers.push(`POST_ENTRY_QA_VERSION_MISMATCH:${postEntrySummary.postEntryQaVersion ?? ''}`);
  }
  if (reports.postEntryQa.exists && postEntrySummary.targetBatchId !== TARGET_BATCH_ID) {
    blockers.push(`POST_ENTRY_QA_BATCH_MISMATCH:${postEntrySummary.targetBatchId ?? ''}`);
  }
  if (reports.postEntryQa.exists && postEntrySummary.productionWriteAllowed !== false) {
    blockers.push('POST_ENTRY_QA_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  }
  if (reports.p1PostwriteGate.exists && p1PostwriteSummary.gateVersion !== P1_POSTWRITE_GATE_VERSION) {
    blockers.push(`P1_POSTWRITE_GATE_VERSION_MISMATCH:${p1PostwriteSummary.gateVersion ?? ''}`);
  }
  if (reports.template.exists && reports.template.data?.templateVersion !== TEMPLATE_VERSION) {
    blockers.push(`TEMPLATE_VERSION_MISMATCH:${reports.template.data?.templateVersion ?? ''}`);
  }
  if (rows.length !== expectedRows) blockers.push(`P2_INPUT_ROW_COUNT_MISMATCH:${rows.length}:${expectedRows}`);
  if (p2TemplateRows.length !== expectedRows) {
    blockers.push(`P2_TEMPLATE_ROW_COUNT_MISMATCH:${p2TemplateRows.length}:${expectedRows}`);
  }
  if (invalidDecisionRows.length > 0) {
    blockers.push(`INVALID_P2_OPERATOR_DECISION:${invalidDecisionRows.map((row) => row.blockId).join(' ')}`);
  }
  priorBatchSummaries.forEach((batch) => {
    if (approvedRows.length === 0) {
      if (batch.pendingRows > 0) waitingReasons.push(`P2_WAITING_PRIOR_BATCH_CLOSED:${batch.batchId}`);
      if (batch.approvedRows > 0) waitingReasons.push(`P2_WAITING_PRIOR_BATCH_WRITTEN:${batch.batchId}`);
      return;
    }
    if (batch.pendingRows > 0) {
      if (batch.batchId === 'BATCH_2_P1' && !p1PostwriteVerified) {
        waitingReasons.push(`P2_WAITING_P1_POSTWRITE:${batch.batchId}`);
      } else {
        blockers.push(`P2_REQUIRES_PRIOR_BATCH_CLOSED:${batch.batchId}`);
      }
    }
    if (batch.approvedRows > 0) {
      if (batch.batchId === 'BATCH_2_P1' && !p1PostwriteVerified) {
        waitingReasons.push(`P2_WAITING_P1_POSTWRITE:${batch.batchId}`);
      } else {
        blockers.push(`P2_REQUIRES_PRIOR_BATCH_WRITTEN:${batch.batchId}`);
      }
    }
  });
  if (pendingRows.length > 0) {
    if (approvedRows.length === 0) {
      waitingReasons.push(`P2_WAITING_OPERATOR_ENTRY:${pendingRows.length}`);
    } else if (!p1PostwriteVerified) {
      waitingReasons.push(`P2_PENDING_ROWS_DEFERRED_UNTIL_P1_POSTWRITE:${pendingRows.length}`);
    } else {
      blockers.push(`P2_PENDING_ROWS_REMAIN:${pendingRows.map((row) => row.block).join(' ')}`);
    }
  }
  if (decidedRows.length === 0) waitingReasons.push('NO_P2_OPERATOR_DECISIONS');
  if (approvedRows.length === 0) waitingReasons.push('NO_APPROVED_P2_ROWS');

  if (reports.validation.exists && validationSummary.validationVersion !== VALIDATION_VERSION) {
    blockers.push(`VALIDATION_VERSION_MISMATCH:${validationSummary.validationVersion ?? ''}`);
  }
  if (reports.validation.exists && validationSummary.status !== 'ok') blockers.push('P2_VALIDATION_STATUS_NOT_OK');

  const validationApprovedRows = numberOrZero(validationSummary.approvedRows);
  const validApprovedRows = numberOrZero(validationSummary.validApprovedRows);
  const invalidApprovedRows = numberOrZero(validationSummary.invalidApprovedRows);
  const invalidMetadataRows = numberOrZero(validationSummary.invalidMetadataRows);
  if (reports.validation.exists && validationApprovedRows !== approvedRows.length) {
    blockers.push(`P2_VALIDATION_APPROVED_ROWS_MISMATCH:${validationApprovedRows}:${approvedRows.length}`);
  }
  if (invalidApprovedRows > 0) blockers.push(`P2_INVALID_APPROVED_ROWS:${invalidApprovedRows}`);
  if (invalidMetadataRows > 0) blockers.push(`P2_INVALID_METADATA_ROWS:${invalidMetadataRows}`);
  if (approvedRows.length > 0 && validApprovedRows !== approvedRows.length) {
    blockers.push(`P2_VALID_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${validApprovedRows}:${approvedRows.length}`);
  }

  if (reports.import.exists && importSummary.importVersion !== IMPORT_VERSION) {
    blockers.push(`IMPORT_VERSION_MISMATCH:${importSummary.importVersion ?? ''}`);
  }
  if (reports.import.exists && importSummary.status !== 'ok') blockers.push('P2_IMPORT_DRY_RUN_STATUS_NOT_OK');
  if (reports.import.exists && importSummary.mode !== 'dry-run') {
    blockers.push(`P2_IMPORT_REPORT_NOT_DRY_RUN:${importSummary.mode ?? ''}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.importedRows) !== expectedRows) {
    blockers.push(`P2_IMPORT_ROWS_MISMATCH:${importSummary.importedRows ?? ''}:${expectedRows}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.decidedRows) !== decidedRows.length) {
    blockers.push(`P2_IMPORT_DECIDED_ROWS_MISMATCH:${importSummary.decidedRows ?? ''}:${decidedRows.length}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.approvedRows) !== approvedRows.length) {
    blockers.push(`P2_IMPORT_APPROVED_ROWS_MISMATCH:${importSummary.approvedRows ?? ''}:${approvedRows.length}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.pendingRows) !== pendingRows.length) {
    blockers.push(`P2_IMPORT_PENDING_ROWS_MISMATCH:${importSummary.pendingRows ?? ''}:${pendingRows.length}`);
  }
  if (reports.import.exists && boolOrFalse(importSummary.productionDataChanged)) {
    blockers.push('P2_IMPORT_CHANGED_PRODUCTION_DATA');
  }

  if (reports.postEntryQa.exists && numberOrZero(postEntrySummary.totalRows) !== expectedRows) {
    blockers.push(`POST_ENTRY_QA_ROW_COUNT_MISMATCH:${postEntrySummary.totalRows ?? ''}:${expectedRows}`);
  }
  if (reports.postEntryQa.exists && numberOrZero(postEntrySummary.approvedRows) !== approvedRows.length) {
    blockers.push(`POST_ENTRY_QA_APPROVED_ROWS_MISMATCH:${postEntrySummary.approvedRows ?? ''}:${approvedRows.length}`);
  }
  if (reports.postEntryQa.exists && numberOrZero(postEntrySummary.blockedRows) > 0) {
    blockers.push(`POST_ENTRY_QA_BLOCKED_ROWS:${postEntrySummary.blockedRows}`);
  }
  if (reports.postEntryQa.exists && postEntrySummary.status === 'blocked-after-entry') {
    blockers.push('POST_ENTRY_QA_STATUS_BLOCKED_AFTER_ENTRY');
  }
  if (reports.postEntryQa.exists && approvedRows.length > 0 && postEntrySummary.status === 'waiting-for-operator-entry') {
    blockers.push('POST_ENTRY_QA_STATUS_WAITING_BUT_APPROVED_ROWS_EXIST');
  }
  if (approvedRows.length > 0 && !p1PostwriteVerified) {
    waitingReasons.push(`P2_WAITING_FOR_P1_POSTWRITE:${p1PostwriteStatus || 'missing'}`);
  }

  if (approvedRows.length === 0) warnings.push('NO_APPROVED_P2_ROWS_TEMPLATE_IMPORT_WILL_BLOCK');
  if (filledPathRows.length > approvedRows.length) warnings.push('CORRECTED_PATH_FILLED_FOR_NON_APPROVED_ROWS');
  if (filledReviewerRows.length > approvedRows.length) warnings.push('REVIEWER_FILLED_FOR_NON_APPROVED_ROWS');

  const awaitingOperatorInput = blockers.length === 0 && approvedRows.length === 0;
  const waitingForP1Postwrite = blockers.length === 0 && approvedRows.length > 0 && !p1PostwriteVerified;
  const readyForTemplateImport = blockers.length === 0 && approvedRows.length > 0 && p1PostwriteVerified;
  const readyForGuardedWriteAfterTemplateImport = readyForTemplateImport && approvedRows.length > 0;

  const summary = {
    readinessVersion: READINESS_VERSION,
    status: blockers.length > 0
      ? 'blocked'
      : readyForTemplateImport
        ? 'ready'
        : waitingForP1Postwrite
          ? 'waiting-for-p1-postwrite'
          : 'waiting-for-operator-entry',
    awaitingOperatorInput,
    waitingForP1Postwrite,
    readyForTemplateImport,
    readyForGuardedWriteAfterTemplateImport,
    allowWaitingExitZero,
    targetBatchId: TARGET_BATCH_ID,
    priorBatchIds: PRIOR_BATCHES.map((batch) => batch.id),
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
    postEntryQaStatus: postEntrySummary.status ?? '',
    postEntryQaApprovedRows: numberOrZero(postEntrySummary.approvedRows),
    postEntryQaBlockedRows: numberOrZero(postEntrySummary.blockedRows),
    p1PostwriteStatus,
    p1PostwriteVerified,
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
    waitingReasons: [...new Set(waitingReasons)],
    postEntryQaCommand: 'npm run stadium:daegu:p2-operator-post-entry-qa',
    p1PostwriteGateCommand: 'npm run stadium:daegu:p1-boundary-first-postwrite-gate',
    packageCommand: 'npm run stadium:daegu:p2-operator-package',
    validateCommand: 'npm run stadium:daegu:p2-operator-validate',
    importDryRunCommand: 'npm run stadium:daegu:p2-operator-import',
    templateImportCommand: 'npm run stadium:daegu:p2-operator-import:write-template',
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
      'It must be run after npm run stadium:daegu:p2-operator-post-entry-qa.',
      'It must be run after npm run stadium:daegu:p2-operator-validate and npm run stadium:daegu:p2-operator-import.',
      'Use --allow-waiting-exit-zero only when another report needs this readiness output without allowing template import.',
      'It blocks template import when post-entry QA reports blocked rows.',
      'It reports waiting-for-operator-entry while no P2 rows are operatorDecision=APPROVED.',
      'It reports waiting-for-p1-postwrite while P2 approvals exist but P1 boundary-first postwrite is not verified.',
      'It blocks template import while BATCH_1_P0 or BATCH_2_P1 is still pending or still has approved rows waiting for production write.',
      'It blocks template import while any P2 row remains PENDING.',
      'It blocks template import unless at least one P2 row is operatorDecision=APPROVED.',
      'It requires every P2 APPROVED row to be validForApproval=true in the existing validator report.',
      'P2 candidate paths are references only and must not be promoted automatically.',
      'It does not allow production write directly; production write still requires npm run stadium:daegu:operator-corrections-write.',
      'Do not run npm run stadium:daegu:operator-corrections after p2-operator-import:write-template.',
    ],
    rows,
    nextActions: readyForTemplateImport
      ? [
        'Run npm run stadium:daegu:p2-operator-import:write-template.',
        'Then run npm run stadium:daegu:operator-corrections-write.',
      ]
      : waitingForP1Postwrite
        ? [
          'Finish P1 boundary-first production write and postwrite verification.',
          'Run npm run stadium:daegu:p1-boundary-first-postwrite-gate.',
          'Run npm run stadium:daegu:p2-operator-post-entry-qa.',
          'Re-run npm run stadium:daegu:p2-operator-readiness.',
        ]
      : awaitingOperatorInput
        ? [
          'Run npm run stadium:daegu:p2-operator-post-entry-qa after editing the P2 input rows.',
          'Fill at least one P2 source input row with operatorDecision=APPROVED.',
          'Approved rows require correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt.',
          'Run npm run stadium:daegu:p2-operator-validate.',
          'Run npm run stadium:daegu:p2-operator-import.',
          'Re-run npm run stadium:daegu:p2-operator-readiness.',
        ]
      : [
        'Resolve blockers in the P2 operator input.',
        'Run npm run stadium:daegu:p2-operator-validate.',
        'Run npm run stadium:daegu:p2-operator-import.',
        'Re-run npm run stadium:daegu:p2-operator-readiness.',
      ],
  };

  const jsonPath = path.join(p2ReportDir, 'daegu-seatmap-p2-operator-readiness.json');
  const csvPath = path.join(p2ReportDir, 'daegu-seatmap-p2-operator-readiness.csv');
  const markdownPath = path.join(p2ReportDir, 'daegu-seatmap-p2-operator-readiness.md');

  await fs.mkdir(p2ReportDir, { recursive: true });
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
    '# Daegu P2 Operator Readiness',
    '',
    `- readiness version: \`${READINESS_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- awaiting operator input: ${summary.awaitingOperatorInput}`,
    `- waiting for P1 postwrite: ${summary.waitingForP1Postwrite}`,
    `- ready for template import: ${summary.readyForTemplateImport}`,
    `- ready for guarded write after template import: ${summary.readyForGuardedWriteAfterTemplateImport}`,
    `- allow waiting exit zero: ${summary.allowWaitingExitZero}`,
    `- prior pending rows: ${summary.priorPendingRows}`,
    `- prior approved rows: ${summary.priorApprovedRows}`,
    `- post-entry QA status: \`${summary.postEntryQaStatus || 'missing'}\``,
    `- post-entry QA approved rows: ${summary.postEntryQaApprovedRows}`,
    `- post-entry QA blocked rows: ${summary.postEntryQaBlockedRows}`,
    `- P1 postwrite status: \`${summary.p1PostwriteStatus || 'missing'}\``,
    `- P1 postwrite verified: ${summary.p1PostwriteVerified}`,
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
    '2. P0/P1 batch가 pending 없이 닫혔고 approved row도 남아 있지 않아야 P2 template import를 진행할 수 있습니다.',
    '3. P2 36건 중 `PENDING` row가 남아 있으면 template import를 진행하지 않습니다.',
    '4. 승인된 P2 row가 1건 이상 있어야 template import를 진행할 수 있습니다.',
    '5. `APPROVED` row가 있으면 validation에서 `validForApproval=true`여야 합니다.',
    '6. `candidatePath`는 참고자료이며 운영자 승인 없이 `correctedPath`로 자동 승격하지 않습니다.',
    '7. readiness가 통과해도 production write는 `npm run stadium:daegu:operator-corrections-write` guard를 다시 통과해야 합니다.',
    '8. `p2-operator-import:write-template` 이후에는 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않습니다.',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
    '## Waiting Reasons',
    '',
    summary.waitingReasons.length > 0 ? summary.waitingReasons.map((reason) => `- \`${reason}\``).join('\n') : 'No waiting reasons.',
    '',
    '## Next Actions',
    '',
    report.nextActions.map((action, index) => `${index + 1}. ${action}`).join('\n'),
    '',
  ].join('\n'), 'utf8');

  console.log(`p2_operator_readiness_json:${jsonPath}`);
  console.log(`p2_operator_readiness_csv:${csvPath}`);
  console.log(`p2_operator_readiness_markdown:${markdownPath}`);
  console.log(`status:${summary.status} readyForTemplateImport=${summary.readyForTemplateImport} pending=${summary.pendingRows} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows} p1Postwrite=${summary.p1PostwriteStatus || 'missing'} allowWaitingExitZero=${summary.allowWaitingExitZero}`);

  if (!summary.readyForTemplateImport && !(allowWaitingExitZero && summary.status !== 'blocked')) {
    process.exitCode = 1;
  }
};

const runP2OperatorTracingPack = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP2OperatorDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-operator');

  const TRACING_PACK_VERSION = 'DAEGU_P2_OPERATOR_TRACING_PACK_V1';
  const ENTRY_SHEET_VERSION = 'DAEGU_P2_OPERATOR_ENTRY_SHEET_V1';
  const PREFLIGHT_VERSION = 'DAEGU_P2_OPERATOR_WORKSET_PREFLIGHT_V1';
  const TARGET_BATCH_ID = 'BATCH_3_P2';
  const VIEWBOX = {
    width: DAEGU_SEATMAP_IMAGE.imageWidth,
    height: DAEGU_SEATMAP_IMAGE.imageHeight,
  };
  const WORKSET_DEFINITIONS = [
    {
      id: 'P2-A',
      slug: 'p2-a-label-hit',
      overviewFileName: 'daegu-seatmap-p2-a-label-hit-tracing-overview.svg',
      expectedRows: 2,
    },
    {
      id: 'P2-B',
      slug: 'p2-b-visual-approval',
      overviewFileName: 'daegu-seatmap-p2-b-visual-approval-tracing-overview.svg',
      expectedRows: 1,
    },
    {
      id: 'P2-C',
      slug: 'p2-c-sky-u-manual-retrace',
      overviewFileName: 'daegu-seatmap-p2-c-sky-u-manual-retrace-tracing-overview.svg',
      expectedRows: 5,
    },
    {
      id: 'P2-D',
      slug: 'p2-d-outfield-manual-retrace',
      overviewFileName: 'daegu-seatmap-p2-d-outfield-manual-retrace-tracing-overview.svg',
      expectedRows: 28,
    },
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const fileExists = async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
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

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const sanitizeFilePart = (value) => {
    const sanitized = String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return sanitized || 'block';
  };

  const pathPoints = (pathData) => {
    const numbers = String(pathData ?? '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/giu)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  };

  const boundsForPath = (pathData) => {
    const points = pathPoints(pathData);
    if (points.length === 0) return null;
    return {
      minX: Math.min(...points.map(([x]) => x)),
      minY: Math.min(...points.map(([, y]) => y)),
      maxX: Math.max(...points.map(([x]) => x)),
      maxY: Math.max(...points.map(([, y]) => y)),
    };
  };

  const boundsForPoint = (x, y) => {
    const pointX = Number(x);
    const pointY = Number(y);
    if (!Number.isFinite(pointX) || !Number.isFinite(pointY)) return null;
    return { minX: pointX, minY: pointY, maxX: pointX, maxY: pointY };
  };

  const mergeBounds = (items, padding = 70) => {
    const bounds = items.filter(Boolean);
    if (bounds.length === 0) {
      return { x: 0, y: 0, width: VIEWBOX.width, height: VIEWBOX.height };
    }
    const minX = Math.max(0, Math.floor(Math.min(...bounds.map((item) => item.minX)) - padding));
    const minY = Math.max(0, Math.floor(Math.min(...bounds.map((item) => item.minY)) - padding));
    const maxX = Math.min(VIEWBOX.width, Math.ceil(Math.max(...bounds.map((item) => item.maxX)) + padding));
    const maxY = Math.min(VIEWBOX.height, Math.ceil(Math.max(...bounds.map((item) => item.maxY)) + padding));
    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  };

  const gridLines = (crop, step) => {
    const lines = [];
    const startX = Math.ceil(crop.x / step) * step;
    const startY = Math.ceil(crop.y / step) * step;
    for (let x = startX; x <= crop.x + crop.width; x += step) {
      lines.push(`<line class="grid" x1="${x}" y1="${crop.y}" x2="${x}" y2="${crop.y + crop.height}" />`);
      lines.push(`<text class="grid-label" x="${x + 2}" y="${crop.y + 14}">${x}</text>`);
    }
    for (let y = startY; y <= crop.y + crop.height; y += step) {
      lines.push(`<line class="grid" x1="${crop.x}" y1="${y}" x2="${crop.x + crop.width}" y2="${y}" />`);
      lines.push(`<text class="grid-label" x="${crop.x + 4}" y="${y - 4}">${y}</text>`);
    }
    return lines.join('\n  ');
  };

  const pointCircle = (className, x, y, label) => {
    const pointX = Number(x);
    const pointY = Number(y);
    if (!Number.isFinite(pointX) || !Number.isFinite(pointY)) return '';
    return [
      `<circle class="${className}" cx="${pointX}" cy="${pointY}" r="7" />`,
      `<text class="point-label" x="${pointX + 10}" y="${pointY - 9}">${xmlEscape(label)}</text>`,
    ].join('\n  ');
  };

  const buildTargetSvg = (row, outputFilePath, officialImagePath) => {
    const crop = row.crop;
    const imageHref = path.relative(path.dirname(outputFilePath), officialImagePath);
    const titleY = crop.y + 28;
    const detailY = titleY + 22;
    const actionY = detailY + 22;
    const fontSize = Math.max(13, Math.min(22, Math.round(crop.width / 27)));
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}" width="${crop.width}" height="${crop.height}">`,
      '<style>',
      '.official-image { opacity: 0.94; }',
      '.shade { fill: rgba(255, 255, 255, 0.66); stroke: none; }',
      '.grid { stroke: #0f172a; stroke-opacity: 0.18; stroke-width: 1; vector-effect: non-scaling-stroke; }',
      '.grid-label { font: 700 10px Arial, sans-serif; fill: #334155; stroke: #fff; stroke-width: 2; paint-order: stroke; }',
      '.current-path { fill: rgba(220, 38, 38, 0.22); stroke: #dc2626; stroke-width: 4; vector-effect: non-scaling-stroke; }',
      '.candidate-path { fill: none; stroke: #f59e0b; stroke-width: 3; stroke-dasharray: 10 7; vector-effect: non-scaling-stroke; }',
      '.current-label { fill: #111827; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.candidate-label { fill: #f59e0b; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.point-label { font: 900 14px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 4; paint-order: stroke; }',
      '.title { font: 900 24px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 5; paint-order: stroke; }',
      `.detail { font: 800 ${fontSize}px Arial, sans-serif; fill: #374151; stroke: #fff; stroke-width: 4; paint-order: stroke; }`,
      '.warning { font: 900 16px Arial, sans-serif; fill: #b91c1c; stroke: #fff; stroke-width: 4; paint-order: stroke; }',
      '</style>',
      `<image class="official-image" href="${xmlEscape(imageHref)}" x="0" y="0" width="${VIEWBOX.width}" height="${VIEWBOX.height}" preserveAspectRatio="none" />`,
      gridLines(crop, 25),
      row.candidatePath ? `<path class="candidate-path" d="${xmlEscape(row.candidatePath)}"><title>${xmlEscape(`${row.block} candidatePath reference-only`)}</title></path>` : '',
      row.currentPath ? `<path class="current-path" d="${xmlEscape(row.currentPath)}"><title>${xmlEscape(`${row.block} currentPath`)}</title></path>` : '',
      pointCircle('current-label', row.currentLabelX, row.currentLabelY, 'current label'),
      pointCircle('candidate-label', row.candidateLabelX, row.candidateLabelY, 'candidate label'),
      `<rect class="shade" x="${crop.x + 8}" y="${crop.y + 8}" width="${Math.min(crop.width - 16, 860)}" height="92" rx="0" />`,
      `<text class="title" x="${crop.x + 18}" y="${titleY}">${xmlEscape(`${row.rowNumber}. ${row.workset} ${row.block} ${row.name}`)}</text>`,
      `<text class="detail" x="${crop.x + 18}" y="${detailY}">${xmlEscape(`editableTarget=${row.editableTarget}`)}</text>`,
      `<text class="warning" x="${crop.x + 18}" y="${actionY}">${xmlEscape('Trace manually on official PNG. Do not copy currentPath/candidatePath into correctedPath.')}</text>`,
      '</svg>',
    ].filter(Boolean).join('\n');
  };

  const buildOverviewSvg = (rows, outputFilePath, officialImagePath, title) => {
    const imageHref = path.relative(path.dirname(outputFilePath), officialImagePath);
    const paths = rows.flatMap((row) => [
      row.candidatePath ? `<path class="candidate-path" d="${xmlEscape(row.candidatePath)}" data-block="${xmlEscape(row.block)}" />` : '',
      row.currentPath ? `<path class="current-path" d="${xmlEscape(row.currentPath)}" data-block="${xmlEscape(row.block)}" />` : '',
    ]).filter(Boolean);
    const labels = rows.map((row) => pointCircle('current-label', row.currentLabelX, row.currentLabelY, row.block)).filter(Boolean);
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" width="${VIEWBOX.width}" height="${VIEWBOX.height}">`,
      '<style>',
      '.official-image { opacity: 0.88; }',
      '.current-path { fill: rgba(220, 38, 38, 0.20); stroke: #dc2626; stroke-width: 5; vector-effect: non-scaling-stroke; }',
      '.candidate-path { fill: none; stroke: #f59e0b; stroke-width: 3; stroke-dasharray: 10 7; vector-effect: non-scaling-stroke; }',
      '.current-label { fill: #111827; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.point-label { font: 900 24px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 5; paint-order: stroke; }',
      '.title { font: 900 28px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 5; paint-order: stroke; }',
      '</style>',
      `<image class="official-image" href="${xmlEscape(imageHref)}" x="0" y="0" width="${VIEWBOX.width}" height="${VIEWBOX.height}" preserveAspectRatio="none" />`,
      '<g id="daegu-p2-operator-tracing-pack">',
      ...paths,
      ...labels,
      '</g>',
      `<text class="title" x="24" y="40">${xmlEscape(title)}: red=currentPath, orange=candidatePath reference-only</text>`,
      '</svg>',
    ].join('\n');
  };

  const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-tracing-pack')));
  const entrySheetPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-entry-sheet.json');
  const preflightPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-workset-preflight.json');
  const officialImagePath = path.resolve(frontendRoot, DAEGU_SEATMAP_IMAGE.imagePath);

  const entrySheet = await readJson(entrySheetPath);
  const preflight = await readJson(preflightPath);
  const blockers = [];
  const warnings = [];

  if (entrySheet.summary?.entrySheetVersion !== ENTRY_SHEET_VERSION) blockers.push(`P2_ENTRY_SHEET_VERSION_MISMATCH:${entrySheet.summary?.entrySheetVersion ?? ''}`);
  if (preflight.summary?.preflightVersion !== PREFLIGHT_VERSION) blockers.push(`P2_PREFLIGHT_VERSION_MISMATCH:${preflight.summary?.preflightVersion ?? ''}`);
  if (entrySheet.summary?.targetBatchId !== TARGET_BATCH_ID) blockers.push(`P2_ENTRY_SHEET_BATCH_MISMATCH:${entrySheet.summary?.targetBatchId ?? ''}`);
  if (preflight.summary?.targetBatchId !== TARGET_BATCH_ID) blockers.push(`P2_PREFLIGHT_BATCH_MISMATCH:${preflight.summary?.targetBatchId ?? ''}`);
  if (entrySheet.summary?.productionWriteAllowed !== false) blockers.push('P2_ENTRY_SHEET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (preflight.summary?.productionWriteAllowed !== false) blockers.push('P2_PREFLIGHT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (!(await fileExists(officialImagePath))) blockers.push(`P2_TRACING_OFFICIAL_IMAGE_MISSING:${DAEGU_SEATMAP_IMAGE.imagePath}`);
  if ((entrySheet.summary?.blockers ?? []).length > 0) blockers.push('P2_ENTRY_SHEET_HAS_BLOCKERS');
  if ((preflight.summary?.blockers ?? []).length > 0) blockers.push('P2_PREFLIGHT_HAS_BLOCKERS');

  const entryRows = (Array.isArray(entrySheet.worksets) ? entrySheet.worksets : [])
    .flatMap((workset) => (Array.isArray(workset.rows) ? workset.rows : []));

  const rows = [];
  for (const [index, entry] of entryRows.entries()) {
    const evidenceCropExists = entry.evidenceCrop
      ? await fileExists(path.resolve(frontendRoot, entry.evidenceCrop))
      : false;
    const crop = mergeBounds([
      boundsForPath(entry.currentPath),
      boundsForPath(entry.candidatePath),
      boundsForPoint(entry.currentLabelX, entry.currentLabelY),
      boundsForPoint(entry.candidateLabelX, entry.candidateLabelY),
    ]);
    const svgFileName = `${String(index + 1).padStart(2, '0')}-${sanitizeFilePart(entry.workset)}-${sanitizeFilePart(entry.block)}-${sanitizeFilePart(entry.blockId)}.svg`;
    const tracingSvg = path.relative(frontendRoot, path.join(outputDir, 'targets', svgFileName));

    if (!entry.blockId) blockers.push(`P2_TRACING_ENTRY_BLOCK_ID_MISSING:${index}`);
    if (!entry.currentPath) blockers.push(`P2_TRACING_CURRENT_PATH_MISSING:${entry.block}`);
    if (!entry.evidenceCrop || !evidenceCropExists) blockers.push(`P2_TRACING_EVIDENCE_CROP_MISSING:${entry.block}`);
    if (entry.currentPathReferenceOnly !== true) blockers.push(`P2_TRACING_CURRENT_PATH_NOT_REFERENCE_ONLY:${entry.block}`);
    if (entry.candidatePath && entry.candidatePathReferenceOnly !== true) blockers.push(`P2_TRACING_CANDIDATE_PATH_NOT_REFERENCE_ONLY:${entry.block}`);
    if (!entry.candidatePath) warnings.push(`P2_TRACING_CANDIDATE_PATH_MISSING:${entry.block}`);

    rows.push({
      tracingPackVersion: TRACING_PACK_VERSION,
      rowNumber: index + 1,
      workset: entry.workset,
      worksetTitle: entry.worksetTitle,
      block: entry.block,
      blockId: entry.blockId,
      name: entry.name,
      category: entry.category,
      editableTarget: entry.editableTarget,
      editableFields: entry.editableFields,
      rowStatus: entry.rowStatus,
      missingEntryFields: entry.missingEntryFields,
      evidenceCrop: entry.evidenceCrop,
      evidenceCropExists,
      tracingSvg,
      currentPath: entry.currentPath,
      currentPathPointCount: entry.currentPathPointCount,
      currentPathReferenceOnly: true,
      currentLabelX: entry.currentLabelX,
      currentLabelY: entry.currentLabelY,
      candidatePath: entry.candidatePath,
      candidatePathPointCount: entry.candidatePathPointCount,
      candidatePathReferenceOnly: true,
      candidateLabelX: entry.candidateLabelX,
      candidateLabelY: entry.candidateLabelY,
      candidatePathPolicy: 'candidatePath is reference-only and must not be copied into correctedPath.',
      currentPathPolicy: 'currentPath is reference-only and must not be copied into correctedPath.',
      operatorRule: 'Trace manually on the official PNG and write only correctedPath/correctedLabelX/Y/reviewer/reviewedAt into the matching editableTarget.',
      crop,
    });
  }

  if (rows.length !== 36) blockers.push(`P2_TRACING_ROW_COUNT_MISMATCH:${rows.length}:36`);
  for (const definition of WORKSET_DEFINITIONS) {
    const rowCount = rows.filter((row) => row.workset === definition.id).length;
    if (rowCount !== definition.expectedRows) blockers.push(`${definition.id}_TRACING_ROW_COUNT_MISMATCH:${rowCount}:${definition.expectedRows}`);
  }

  await fs.mkdir(path.join(outputDir, 'targets'), { recursive: true });
  for (const row of rows) {
    const svgPath = path.resolve(frontendRoot, row.tracingSvg);
    await fs.writeFile(svgPath, `${buildTargetSvg(row, svgPath, officialImagePath)}\n`, 'utf8');
  }

  const overviewSvgPath = path.join(outputDir, 'daegu-seatmap-p2-operator-tracing-overview.svg');
  await fs.writeFile(
    overviewSvgPath,
    `${buildOverviewSvg(rows, overviewSvgPath, officialImagePath, 'Daegu P2 operator tracing pack')}\n`,
    'utf8',
  );

  const worksetArtifacts = [];
  for (const definition of WORKSET_DEFINITIONS) {
    const worksetRows = rows.filter((row) => row.workset === definition.id);
    const worksetSvgPath = path.join(outputDir, definition.overviewFileName);
    await fs.writeFile(
      worksetSvgPath,
      `${buildOverviewSvg(worksetRows, worksetSvgPath, officialImagePath, `Daegu ${definition.id} tracing overview`)}\n`,
      'utf8',
    );
    worksetArtifacts.push({
      id: definition.id,
      slug: definition.slug,
      expectedRows: definition.expectedRows,
      rowCount: worksetRows.length,
      overviewSvg: path.relative(frontendRoot, worksetSvgPath),
      targetSvgs: worksetRows.map((row) => row.tracingSvg),
    });
  }

  const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator-tracing';
  const summary = {
    tracingPackVersion: TRACING_PACK_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    entrySheet: path.relative(frontendRoot, entrySheetPath),
    preflight: path.relative(frontendRoot, preflightPath),
    officialImage: DAEGU_SEATMAP_IMAGE.imagePath,
    imageSha256: DAEGU_SEATMAP_IMAGE.imageSha256,
    viewBox: `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`,
    totalRows: rows.length,
    p2aRows: rows.filter((row) => row.workset === 'P2-A').length,
    p2bRows: rows.filter((row) => row.workset === 'P2-B').length,
    p2cRows: rows.filter((row) => row.workset === 'P2-C').length,
    p2dRows: rows.filter((row) => row.workset === 'P2-D').length,
    targetSvgRows: rows.filter((row) => Boolean(row.tracingSvg)).length,
    rowsMissingOperatorInput: rows.filter((row) => row.missingEntryFields.length > 0).length,
    rowsWithEvidenceCrop: rows.filter((row) => row.evidenceCropExists).length,
    overviewSvg: path.relative(frontendRoot, overviewSvgPath),
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesSourceInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'This tracing pack is read-only.',
      'It uses the official Daegu PNG as the SVG background and keeps the original 1707x2048 coordinate system.',
      'red=currentPath, orange=candidatePath reference-only.',
      'Per-target SVG files are operator evidence only and are not source-of-truth geometry.',
      'candidatePath is reference-only and must not be copied into correctedPath.',
      'currentPath is reference-only and must not be copied into correctedPath.',
      'It never writes operatorDecision or corrected fields into any source input.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
    ],
    worksetArtifacts,
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p2-operator-tracing-pack.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p2-operator-tracing-pack.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p2-operator-tracing-pack.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'rowNumber',
      'workset',
      'block',
      'blockId',
      'editableTarget',
      'rowStatus',
      'missingEntryFields',
      'tracingSvg',
      'evidenceCrop',
      'evidenceCropExists',
      'currentPathPointCount',
      'candidatePathPointCount',
      'candidatePathPolicy',
      'currentPathPolicy',
    ],
    ...rows.map((row) => [
      row.rowNumber,
      row.workset,
      row.block,
      row.blockId,
      row.editableTarget,
      row.rowStatus,
      row.missingEntryFields.join(' '),
      row.tracingSvg,
      row.evidenceCrop,
      row.evidenceCropExists,
      row.currentPathPointCount,
      row.candidatePathPointCount,
      row.candidatePathPolicy,
      row.currentPathPolicy,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P2 Operator Tracing Pack',
    '',
    `- tracing pack version: \`${TRACING_PACK_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- rows missing operator input: ${summary.rowsMissingOperatorInput}`,
    `- official image: \`${summary.officialImage}\``,
    `- image sha256: \`${summary.imageSha256}\``,
    `- viewBox: \`${summary.viewBox}\``,
    `- overview svg: \`${summary.overviewSvg}\``,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Workset Overviews',
    '',
    markdownTable(
      ['workset', 'rows', 'overview svg'],
      worksetArtifacts.map((artifact) => [
        `\`${artifact.id}\``,
        `${artifact.rowCount}/${artifact.expectedRows}`,
        `\`${artifact.overviewSvg}\``,
      ]),
    ),
    '',
    '## Target SVGs',
    '',
    markdownTable(
      ['row', 'workset', 'block', 'editable target', 'tracing svg', 'missing input', 'evidence'],
      rows.map((row) => [
        row.rowNumber,
        `\`${row.workset}\``,
        `\`${row.block}\``,
        `\`${row.editableTarget}\``,
        `\`${row.tracingSvg}\``,
        row.missingEntryFields.map((field) => `\`${field}\``).join(' ') || '-',
        `\`${row.evidenceCrop}\``,
      ]),
    ),
    '',
    '## Operator Rules',
    '',
    '- Trace manually against the official PNG shown in each SVG.',
    '- Do not copy currentPath or candidatePath into correctedPath.',
    '- Fill only the matching P2 source input row indicated by editableTarget.',
    '- Run `npm run stadium:daegu:p2-operator-workset-preflight` after rows are filled.',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p2_operator_tracing_pack_json:${jsonPath}`);
  console.log(`p2_operator_tracing_pack_csv:${csvPath}`);
  console.log(`p2_operator_tracing_pack_markdown:${markdownPath}`);
  console.log(`p2_operator_tracing_pack_overview_svg:${overviewSvgPath}`);
  console.log(`status:${summary.status} rows=${summary.totalRows} targetSvgs=${summary.targetSvgRows} evidence=${summary.rowsWithEvidenceCrop}/${summary.totalRows} missingOperatorInput=${summary.rowsMissingOperatorInput}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP2OperatorWorksetPreflight = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP2OperatorDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-operator');

  const PREFLIGHT_VERSION = 'DAEGU_P2_OPERATOR_WORKSET_PREFLIGHT_V1';
  const WORKSETS_VERSION = 'DAEGU_P2_OPERATOR_WORKSETS_V1';
  const PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
  const TARGET_BATCH_ID = 'BATCH_3_P2';
  const EXPECTED = {
    totalRows: 36,
    p2aRows: 2,
    p2bRows: 1,
    p2cRows: 5,
    p2dRows: 28,
  };
  const BLOCKERS = {
    approvedRowMissingFields: 'APPROVED_ROW_MISSING_FIELDS',
    correctedPathReusesCurrentPath: 'CORRECTED_PATH_REUSES_CURRENT_PATH',
    correctedPathReusesCandidatePath: 'CORRECTED_PATH_REUSES_CANDIDATE_PATH',
    correctedPathRequiresAtLeastSixPoints: 'CORRECTED_PATH_REQUIRES_AT_LEAST_SIX_POINTS',
    correctedLabelXyNotNumeric: 'CORRECTED_LABEL_XY_NOT_NUMERIC',
    duplicateAssignment: 'P2_WORKSET_DUPLICATE_ASSIGNMENT',
    unassignedRows: 'P2_WORKSET_UNASSIGNED_ROWS',
  };
  const WARNINGS = {
    labelTopHitRequiresOperatorQa: 'LABEL_TOP_HIT_REQUIRES_OPERATOR_QA',
    visualApprovalOperatorNoteRecommended: 'VISUAL_APPROVAL_OPERATOR_NOTE_RECOMMENDED',
    nonApprovedRowHasCorrectedFields: 'NON_APPROVED_ROW_HAS_CORRECTED_FIELDS',
    waitingForOperatorApprovals: 'P2_WORKSET_PREFLIGHT_WAITING_FOR_OPERATOR_APPROVALS',
  };

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
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

  const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';
  const isBlank = (value) => String(value ?? '').trim() === '';
  const isNumeric = (value) => !isBlank(value) && Number.isFinite(Number(value));
  const normalizePath = (value) => String(value ?? '').trim().replace(/\s+/gu, ' ').toUpperCase();
  const svgPathPointCount = (value) => {
    const numbers = String(value ?? '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/giu) ?? [];
    return Math.floor(numbers.length / 2);
  };

  const hasAnyCorrectedField = (row) => [
    row.correctedPath,
    row.correctedLabelX,
    row.correctedLabelY,
    row.reviewer,
    row.reviewedAt,
  ].some((value) => !isBlank(value));

  const missingApprovedFields = (row) => {
    const missing = [];
    if (isBlank(row.correctedPath)) missing.push('correctedPath');
    if (!isNumeric(row.correctedLabelX) || !isNumeric(row.correctedLabelY)) missing.push('correctedLabelX/Y');
    if (isBlank(row.reviewer)) missing.push('reviewer');
    if (isBlank(row.reviewedAt)) missing.push('reviewedAt');
    return missing;
  };

  const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));
  const worksetsPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-worksets.json');
  const inputPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.json');

  const worksetsReport = await readJson(worksetsPath);
  const input = await readJson(inputPath);
  const structuralBlockers = [];
  const reportWarnings = [];

  if (worksetsReport.summary?.worksetsVersion !== WORKSETS_VERSION) {
    structuralBlockers.push(`P2_WORKSETS_VERSION_MISMATCH:${worksetsReport.summary?.worksetsVersion ?? ''}`);
  }
  if (input.packageVersion !== PACKAGE_VERSION) {
    structuralBlockers.push(`P2_INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  }
  if (input.targetBatchId !== TARGET_BATCH_ID) {
    structuralBlockers.push(`P2_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  }
  if (input.productionWriteAllowed !== false) structuralBlockers.push('P2_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (worksetsReport.summary?.productionWriteAllowed !== false) {
    structuralBlockers.push('P2_WORKSETS_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  }

  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const worksets = Array.isArray(worksetsReport.worksets) ? worksetsReport.worksets : [];
  const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
  const assignments = [];
  worksets.forEach((workset) => {
    (Array.isArray(workset.rows) ? workset.rows : []).forEach((row) => {
      assignments.push({ worksetId: workset.id, worksetTitle: workset.title, row });
    });
  });

  if (inputRows.length !== EXPECTED.totalRows) {
    structuralBlockers.push(`P2_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.totalRows}`);
  }
  if (assignments.length !== EXPECTED.totalRows) {
    structuralBlockers.push(`P2_WORKSET_ROW_COUNT_MISMATCH:${assignments.length}:${EXPECTED.totalRows}`);
  }

  const countByWorkset = new Map(worksets.map((workset) => [workset.id, Array.isArray(workset.rows) ? workset.rows.length : 0]));
  const expectedByWorkset = new Map([
    ['P2-A', EXPECTED.p2aRows],
    ['P2-B', EXPECTED.p2bRows],
    ['P2-C', EXPECTED.p2cRows],
    ['P2-D', EXPECTED.p2dRows],
  ]);
  expectedByWorkset.forEach((expectedRows, worksetId) => {
    const actualRows = countByWorkset.get(worksetId) ?? 0;
    if (actualRows !== expectedRows) structuralBlockers.push(`${worksetId}_ROW_COUNT_MISMATCH:${actualRows}:${expectedRows}`);
  });

  const assignedByBlockId = new Map();
  assignments.forEach((assignment) => {
    const blockId = assignment.row.blockId;
    if (!assignedByBlockId.has(blockId)) assignedByBlockId.set(blockId, []);
    assignedByBlockId.get(blockId).push(assignment.worksetId);
  });
  const duplicateAssignments = [...assignedByBlockId.entries()]
    .filter(([, assignedWorksets]) => assignedWorksets.length > 1)
    .map(([blockId, assignedWorksets]) => `${blockId}:${assignedWorksets.join('+')}`);
  if (duplicateAssignments.length > 0) {
    structuralBlockers.push(`${BLOCKERS.duplicateAssignment}:${duplicateAssignments.join(' ')}`);
  }
  const unassignedRows = inputRows.filter((row) => !assignedByBlockId.has(row.blockId));
  if (unassignedRows.length > 0) {
    structuralBlockers.push(`${BLOCKERS.unassignedRows}:${unassignedRows.map((row) => row.block).join(' ')}`);
  }

  const rows = assignments.map(({ worksetId, worksetTitle, row: worksetRow }) => {
    const inputRow = inputByBlockId.get(worksetRow.blockId) ?? {};
    const decision = normalizeDecision(inputRow.operatorDecision ?? worksetRow.decision);
    const approved = decision === 'APPROVED';
    const correctedPathPointCount = svgPathPointCount(inputRow.correctedPath);
    const rowBlockers = [];
    const rowWarnings = [];
    const missingFields = approved ? missingApprovedFields(inputRow) : [];

    if (approved && missingFields.length > 0) {
      rowBlockers.push(`${BLOCKERS.approvedRowMissingFields}:${missingFields.join('+')}`);
    }
    if (approved && (!isNumeric(inputRow.correctedLabelX) || !isNumeric(inputRow.correctedLabelY))) {
      rowBlockers.push(BLOCKERS.correctedLabelXyNotNumeric);
    }
    if (approved && correctedPathPointCount < 6) {
      rowBlockers.push(`${BLOCKERS.correctedPathRequiresAtLeastSixPoints}:${correctedPathPointCount}:6`);
    }
    if (approved && !isBlank(inputRow.correctedPath) && normalizePath(inputRow.correctedPath) === normalizePath(inputRow.currentPath)) {
      rowBlockers.push(BLOCKERS.correctedPathReusesCurrentPath);
    }
    if (approved && !isBlank(inputRow.correctedPath) && normalizePath(inputRow.correctedPath) === normalizePath(inputRow.candidatePath)) {
      rowBlockers.push(BLOCKERS.correctedPathReusesCandidatePath);
    }
    if (worksetId === 'P2-A') rowWarnings.push(WARNINGS.labelTopHitRequiresOperatorQa);
    if (worksetId === 'P2-B' && isBlank(inputRow.operatorNote)) rowWarnings.push(WARNINGS.visualApprovalOperatorNoteRecommended);
    if (!approved && hasAnyCorrectedField(inputRow)) rowWarnings.push(WARNINGS.nonApprovedRowHasCorrectedFields);

    return {
      workset: worksetId,
      worksetTitle,
      block: inputRow.block ?? worksetRow.block ?? '',
      blockId: worksetRow.blockId,
      stage: inputRow.stage ?? worksetRow.stage ?? '',
      decision,
      rowStatus: rowBlockers.length > 0
        ? 'blocked'
        : approved
          ? 'approved-preflight-passed'
          : 'waiting-for-operator',
      blockers: rowBlockers,
      warnings: rowWarnings,
      missingApprovedFields: missingFields,
      correctedPathPointCount,
      minCorrectedPathPoints: 6,
      currentPathPointCount: svgPathPointCount(inputRow.currentPath),
      candidatePathPointCount: Number(inputRow.candidatePathPointCount ?? worksetRow.candidatePathPointCount ?? svgPathPointCount(inputRow.candidatePath)),
      correctedLabelX: inputRow.correctedLabelX ?? '',
      correctedLabelY: inputRow.correctedLabelY ?? '',
      reviewer: inputRow.reviewer ?? '',
      reviewedAt: inputRow.reviewedAt ?? '',
      operatorNote: inputRow.operatorNote ?? '',
      evidenceCrop: inputRow.evidenceCrop ?? worksetRow.evidenceCrop ?? '',
      riskFlags: inputRow.riskFlags ?? worksetRow.riskFlags ?? '',
      officialFailureReasons: inputRow.officialFailureReasons ?? worksetRow.officialFailureReasons ?? '',
    };
  });

  const rowBlockers = rows.flatMap((row) => row.blockers.map((blocker) => `${row.block}:${blocker}`));
  const approvedRows = rows.filter((row) => row.decision === 'APPROVED');
  const waitingForOperatorRows = rows.filter((row) => row.decision !== 'APPROVED');
  if (approvedRows.length === 0) reportWarnings.push(WARNINGS.waitingForOperatorApprovals);

  const allBlockers = [...structuralBlockers, ...rowBlockers];
  const status = allBlockers.length > 0
    ? 'blocked'
    : approvedRows.length === 0
      ? 'waiting-for-operator'
      : waitingForOperatorRows.length > 0
        ? 'partial-approved-preflight-passed'
        : 'ready-for-p2-readiness';

  const summary = {
    preflightVersion: PREFLIGHT_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    sourceWorksets: path.relative(frontendRoot, worksetsPath),
    sourceInput: path.relative(frontendRoot, inputPath),
    totalRows: rows.length,
    p2aRows: countByWorkset.get('P2-A') ?? 0,
    p2bRows: countByWorkset.get('P2-B') ?? 0,
    p2cRows: countByWorkset.get('P2-C') ?? 0,
    p2dRows: countByWorkset.get('P2-D') ?? 0,
    approvedRows: approvedRows.length,
    waitingForOperatorRows: waitingForOperatorRows.length,
    blockedRows: rows.filter((row) => row.blockers.length > 0).length,
    duplicateAssignments: duplicateAssignments.length,
    unassignedRows: unassignedRows.length,
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesSourceInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers: allBlockers,
    warnings: [...reportWarnings, ...new Set(rows.flatMap((row) => row.warnings))],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    expected: EXPECTED,
    safetyContract: [
      'This preflight is read-only.',
      'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, or reviewedAt.',
      'It never writes source input or the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'APPROVED rows must provide correctedPath, numeric correctedLabelX/Y, reviewer, and reviewedAt.',
      'Corrected paths must not reuse currentPath or candidatePath.',
      'Manual P2 precision rows require at least six corrected path points.',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p2-operator-workset-preflight.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p2-operator-workset-preflight.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p2-operator-workset-preflight.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'workset',
      'block',
      'blockId',
      'decision',
      'rowStatus',
      'blockers',
      'warnings',
      'correctedPathPointCount',
      'minCorrectedPathPoints',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
      'evidenceCrop',
      'riskFlags',
    ],
    ...rows.map((row) => [
      row.workset,
      row.block,
      row.blockId,
      row.decision,
      row.rowStatus,
      row.blockers.join(' '),
      row.warnings.join(' '),
      row.correctedPathPointCount,
      row.minCorrectedPathPoints,
      row.correctedLabelX,
      row.correctedLabelY,
      row.reviewer,
      row.reviewedAt,
      row.evidenceCrop,
      row.riskFlags,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P2 Operator Workset Preflight',
    '',
    `- preflight version: \`${PREFLIGHT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- waiting for operator: ${summary.waitingForOperatorRows}`,
    `- blocked rows: ${summary.blockedRows}`,
    `- duplicate assignments: ${summary.duplicateAssignments}`,
    `- unassigned rows: ${summary.unassignedRows}`,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Required Approved Row Checks',
    '',
    `- \`${BLOCKERS.approvedRowMissingFields}\``,
    `- \`${BLOCKERS.correctedLabelXyNotNumeric}\``,
    `- \`${BLOCKERS.correctedPathRequiresAtLeastSixPoints}\``,
    `- \`${BLOCKERS.correctedPathReusesCurrentPath}\``,
    `- \`${BLOCKERS.correctedPathReusesCandidatePath}\``,
    `- \`${WARNINGS.labelTopHitRequiresOperatorQa}\``,
    `- \`${WARNINGS.visualApprovalOperatorNoteRecommended}\``,
    '',
    '## Rows',
    '',
    markdownTable(
      ['workset', 'block', 'decision', 'status', 'blockers', 'warnings', 'corrected points', 'evidence'],
      rows.map((row) => [
        `\`${row.workset}\``,
        `\`${row.block}\``,
        `\`${row.decision}\``,
        `\`${row.rowStatus}\``,
        row.blockers.map((blocker) => `\`${blocker}\``).join(' ') || '-',
        row.warnings.map((warning) => `\`${warning}\``).join(' ') || '-',
        `${row.correctedPathPointCount}/${row.minCorrectedPathPoints}`,
        `\`${row.evidenceCrop}\``,
      ]),
    ),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p2_operator_workset_preflight_json:${jsonPath}`);
  console.log(`p2_operator_workset_preflight_csv:${csvPath}`);
  console.log(`p2_operator_workset_preflight_markdown:${markdownPath}`);
  console.log(`status:${summary.status} approved=${summary.approvedRows} waiting=${summary.waitingForOperatorRows}/${summary.totalRows} blocked=${summary.blockedRows}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP2OperatorWorksets = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP2OperatorDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-operator');

  const WORKSETS_VERSION = 'DAEGU_P2_OPERATOR_WORKSETS_V1';
  const HANDOFF_VERSION = 'DAEGU_P2_OPERATOR_HANDOFF_V1';
  const PACKAGE_VERSION = 'DAEGU_P2_OPERATOR_PACKAGE_V1';
  const TARGET_BATCH_ID = 'BATCH_3_P2';
  const EXPECTED = {
    totalRows: 36,
    p2aRows: 2,
    p2bRows: 1,
    p2cRows: 5,
    p2dRows: 28,
  };
  const WORKSET_DEFINITIONS = [
    {
      id: 'P2-A',
      slug: 'p2-a-label-hit',
      title: 'P2-A Label/Hit Review',
      description: 'Label/top-hit mismatch rows that need path, corrected label point, and click target review together.',
      accepts: (row) => row.stage === 'LABEL_HIT_AREA_REVIEW_FIRST',
      expectedRows: EXPECTED.p2aRows,
      operatorFocus: 'Verify label top-hit against the official PNG, then approve only with correctedPath and correctedLabelX/Y.',
    },
    {
      id: 'P2-B',
      slug: 'p2-b-visual-approval',
      title: 'P2-B Visual Approval Candidate',
      description: 'Single visual approval candidate; candidate geometry is reference-only until explicitly approved by operator.',
      accepts: (row) => row.stage === 'VISUAL_APPROVAL_CHECK',
      expectedRows: EXPECTED.p2bRows,
      operatorFocus: 'Compare candidate geometry with the evidence crop and official PNG before approval.',
    },
    {
      id: 'P2-C',
      slug: 'p2-c-sky-u-manual-retrace',
      title: 'P2-C SKY/U Manual Retrace',
      description: 'Manual retrace rows for SKY/U blocks. These require fresh corrected polygons with at least six points.',
      accepts: (row) => row.stage === 'MANUAL_RETRACE_BATCH' && /^U\d+$/u.test(row.block),
      expectedRows: EXPECTED.p2cRows,
      operatorFocus: 'Trace fresh SKY/U polygons from the evidence crop; do not reuse legacy rectangles.',
    },
    {
      id: 'P2-D',
      slug: 'p2-d-outfield-manual-retrace',
      title: 'P2-D Outfield Manual Retrace',
      description: 'Manual retrace rows for outfield, RF/LF/MR/TR/F, and remaining wide outfield blocks.',
      accepts: (row) => row.stage === 'MANUAL_RETRACE_BATCH' && !/^U\d+$/u.test(row.block),
      expectedRows: EXPECTED.p2dRows,
      operatorFocus: 'Trace fresh outfield polygons from the evidence crop; keep candidate/current paths as reference only.',
    },
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
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

  const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

  const isBlank = (value) => String(value ?? '').trim() === '';

  const missingApprovalFields = (row) => {
    const missing = [];
    if (normalizeDecision(row.operatorDecision) !== 'APPROVED') missing.push('operatorDecision=APPROVED');
    if (isBlank(row.correctedPath)) missing.push('correctedPath');
    if (isBlank(row.correctedLabelX) || isBlank(row.correctedLabelY)) missing.push('correctedLabelX/Y');
    if (isBlank(row.reviewer)) missing.push('reviewer');
    if (isBlank(row.reviewedAt)) missing.push('reviewedAt');
    return missing;
  };

  const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));
  const handoffPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-handoff.json');
  const inputPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.json');

  const handoff = await readJson(handoffPath);
  const input = await readJson(inputPath);
  const blockers = [];
  const warnings = [];

  if (handoff.summary?.handoffVersion !== HANDOFF_VERSION) {
    blockers.push(`P2_HANDOFF_VERSION_MISMATCH:${handoff.summary?.handoffVersion ?? ''}`);
  }
  if (input.packageVersion !== PACKAGE_VERSION) blockers.push(`P2_INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`P2_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  if (input.productionWriteAllowed !== false) blockers.push('P2_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (handoff.summary?.productionWriteAllowed !== false) blockers.push('P2_HANDOFF_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const handoffRows = Array.isArray(handoff.rows) ? handoff.rows : [];
  if (inputRows.length !== EXPECTED.totalRows) blockers.push(`P2_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED.totalRows}`);
  if (handoffRows.length !== EXPECTED.totalRows) blockers.push(`P2_HANDOFF_ROW_COUNT_MISMATCH:${handoffRows.length}:${EXPECTED.totalRows}`);

  const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
  const rows = handoffRows.map((handoffRow) => {
    const inputRow = inputByBlockId.get(handoffRow.blockId) ?? {};
    const missingFields = missingApprovalFields(inputRow);
    const correctedPathBlank = isBlank(inputRow.correctedPath);
    return {
      blockId: handoffRow.blockId,
      block: handoffRow.block,
      name: inputRow.name ?? handoffRow.name ?? '',
      category: inputRow.category ?? handoffRow.category ?? '',
      stage: handoffRow.stage,
      operatorAction: handoffRow.operatorAction,
      requiredOperatorReview: handoffRow.requiredOperatorReview,
      stagingBucket: inputRow.stagingBucket ?? handoffRow.stagingBucket ?? '',
      decision: normalizeDecision(inputRow.operatorDecision ?? handoffRow.decision),
      evidenceCrop: inputRow.evidenceCrop ?? handoffRow.evidenceCrop ?? '',
      currentPath: inputRow.currentPath ?? '',
      currentLabel: `${inputRow.currentLabelX ?? ''},${inputRow.currentLabelY ?? ''}`,
      candidatePath: inputRow.candidatePath ?? '',
      candidatePathPointCount: inputRow.candidatePathPointCount ?? handoffRow.candidatePathPointCount ?? '',
      candidateLabel: inputRow.candidateLabelX !== '' && inputRow.candidateLabelY !== ''
        ? `${inputRow.candidateLabelX},${inputRow.candidateLabelY}`
        : '',
      correctedPathBlank,
      correctedLabelBlank: isBlank(inputRow.correctedLabelX) || isBlank(inputRow.correctedLabelY),
      reviewerBlank: isBlank(inputRow.reviewer),
      reviewedAtBlank: isBlank(inputRow.reviewedAt),
      missingApprovalFields: missingFields,
      minCorrectedPathPoints: 6,
      candidateReferenceOnly: true,
      productionWriteAllowed: false,
      candidateDuplicateGroup: inputRow.candidateDuplicateGroup ?? handoffRow.candidateDuplicateGroup ?? '',
      candidateDuplicateIds: inputRow.candidateDuplicateIds ?? handoffRow.candidateDuplicateIds ?? '',
      officialFailureReasons: inputRow.officialFailureReasons ?? handoffRow.officialFailureReasons ?? '',
      riskFlags: inputRow.riskFlags ?? handoffRow.riskFlags ?? '',
    };
  });

  const assignedBlockIds = new Set();
  const worksets = WORKSET_DEFINITIONS.map((definition) => {
    const worksetRows = rows.filter((row) => definition.accepts(row));
    worksetRows.forEach((row) => assignedBlockIds.add(row.blockId));
    if (worksetRows.length !== definition.expectedRows) {
      blockers.push(`${definition.id}_ROW_COUNT_MISMATCH:${worksetRows.length}:${definition.expectedRows}`);
    }
    return {
      id: definition.id,
      slug: definition.slug,
      title: definition.title,
      description: definition.description,
      operatorFocus: definition.operatorFocus,
      expectedRows: definition.expectedRows,
      rows: worksetRows,
      rowCount: worksetRows.length,
      waitingForOperatorRows: worksetRows.filter((row) => row.missingApprovalFields.length > 0).length,
      approvedRows: worksetRows.filter((row) => row.decision === 'APPROVED' && row.missingApprovalFields.length === 0).length,
    };
  });
  const unassignedRows = rows.filter((row) => !assignedBlockIds.has(row.blockId));
  if (unassignedRows.length > 0) blockers.push(`P2_WORKSET_UNASSIGNED_ROWS:${unassignedRows.map((row) => row.block).join(' ')}`);

  if (handoff.summary?.status === 'waiting-for-prior-batch-and-operator') {
    warnings.push('P2_WORKSETS_WAITING_FOR_P1_POSTWRITE_AND_OPERATOR_APPROVALS');
  }
  if (rows.every((row) => row.missingApprovalFields.length > 0)) {
    warnings.push('P2_WORKSETS_OPERATOR_APPROVAL_REQUIRED_FOR_ALL_ROWS');
  }

  const summary = {
    worksetsVersion: WORKSETS_VERSION,
    status: blockers.length > 0 ? 'blocked' : 'ready-for-operator-worksets',
    targetBatchId: TARGET_BATCH_ID,
    totalRows: rows.length,
    p2aRows: worksets.find((workset) => workset.id === 'P2-A')?.rowCount ?? 0,
    p2bRows: worksets.find((workset) => workset.id === 'P2-B')?.rowCount ?? 0,
    p2cRows: worksets.find((workset) => workset.id === 'P2-C')?.rowCount ?? 0,
    p2dRows: worksets.find((workset) => workset.id === 'P2-D')?.rowCount ?? 0,
    waitingForOperatorRows: rows.filter((row) => row.missingApprovalFields.length > 0).length,
    approvedRows: rows.filter((row) => row.decision === 'APPROVED' && row.missingApprovalFields.length === 0).length,
    sourceHandoff: path.relative(frontendRoot, handoffPath),
    sourceInput: path.relative(frontendRoot, inputPath),
    handoffStatus: handoff.summary?.status ?? '',
    p1PostwriteStatus: handoff.summary?.p1PostwriteStatus ?? '',
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesSourceInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    expected: EXPECTED,
    safetyContract: [
      'This workset split is read-only.',
      'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, or reviewedAt.',
      'It never writes source input or the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'candidatePath and candidateLabel are reference-only and must not be copied into corrected fields without explicit operator approval.',
      'P2 production write remains blocked until P1 boundary-first postwrite is verified and P2 approvals pass readiness.',
    ],
    worksets,
    unassignedRows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p2-operator-worksets.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p2-operator-worksets.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p2-operator-worksets.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'workset',
      'stage',
      'block',
      'blockId',
      'decision',
      'missingApprovalFields',
      'correctedPathBlank',
      'candidatePathPointCount',
      'minCorrectedPathPoints',
      'evidenceCrop',
      'riskFlags',
    ],
    ...worksets.flatMap((workset) => workset.rows.map((row) => [
      workset.id,
      row.stage,
      row.block,
      row.blockId,
      row.decision,
      row.missingApprovalFields.join(' '),
      row.correctedPathBlank,
      row.candidatePathPointCount,
      row.minCorrectedPathPoints,
      row.evidenceCrop,
      row.riskFlags,
    ])),
  ]);

  const writeWorksetArtifacts = async (workset) => {
    const worksetJsonPath = path.join(outputDir, `daegu-seatmap-${workset.slug}-handoff.json`);
    const worksetCsvPath = path.join(outputDir, `daegu-seatmap-${workset.slug}-handoff.csv`);
    const worksetMarkdownPath = path.join(outputDir, `daegu-seatmap-${workset.slug}-handoff.md`);
    const worksetReport = {
      generatedAt: report.generatedAt,
      worksetsVersion: WORKSETS_VERSION,
      productionWriteAllowed: false,
      writesOperatorDecision: false,
      writesSourceInput: false,
      writesCorrectionsTemplate: false,
      writesProductionData: false,
      id: workset.id,
      title: workset.title,
      description: workset.description,
      operatorFocus: workset.operatorFocus,
      expectedRows: workset.expectedRows,
      rowCount: workset.rowCount,
      waitingForOperatorRows: workset.waitingForOperatorRows,
      approvedRows: workset.approvedRows,
      rows: workset.rows,
    };
    await fs.writeFile(worksetJsonPath, `${JSON.stringify(worksetReport, null, 2)}\n`, 'utf8');
    await writeCsv(worksetCsvPath, [
      [
        'block',
        'blockId',
        'stage',
        'decision',
        'missingApprovalFields',
        'candidateReferenceOnly',
        'currentLabel',
        'candidateLabel',
        'candidatePathPointCount',
        'minCorrectedPathPoints',
        'evidenceCrop',
        'officialFailureReasons',
        'riskFlags',
      ],
      ...workset.rows.map((row) => [
        row.block,
        row.blockId,
        row.stage,
        row.decision,
        row.missingApprovalFields.join(' '),
        row.candidateReferenceOnly,
        row.currentLabel,
        row.candidateLabel,
        row.candidatePathPointCount,
        row.minCorrectedPathPoints,
        row.evidenceCrop,
        row.officialFailureReasons,
        row.riskFlags,
      ]),
    ]);
    await fs.writeFile(worksetMarkdownPath, [
      `# Daegu ${workset.title}`,
      '',
      `- worksets version: \`${WORKSETS_VERSION}\``,
      `- rows: ${workset.rowCount}/${workset.expectedRows}`,
      `- waiting for operator: ${workset.waitingForOperatorRows}`,
      `- approved rows: ${workset.approvedRows}`,
      `- production write allowed: \`false\``,
      '',
      '## Operator Focus',
      '',
      workset.operatorFocus,
      '',
      '## Safety',
      '',
      '- Read-only handoff.',
      '- Candidate/current paths are reference-only.',
      '- Approval requires `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX/Y`, `reviewer`, and `reviewedAt`.',
      '- Manual retrace rows require a fresh corrected polygon with at least six points.',
      '',
      '## Rows',
      '',
      markdownTable(
        ['block', 'decision', 'missing fields', 'corrected path blank', 'candidate points', 'min points', 'evidence', 'risk flags'],
        workset.rows.map((row) => [
          `\`${row.block}\``,
          `\`${row.decision}\``,
          row.missingApprovalFields.map((field) => `\`${field}\``).join(' ') || '-',
          String(row.correctedPathBlank),
          row.candidatePathPointCount,
          row.minCorrectedPathPoints,
          `\`${row.evidenceCrop}\``,
          row.riskFlags || '-',
        ]),
      ),
      '',
    ].join('\n'), 'utf8');
    return {
      id: workset.id,
      json: path.relative(frontendRoot, worksetJsonPath),
      csv: path.relative(frontendRoot, worksetCsvPath),
      markdown: path.relative(frontendRoot, worksetMarkdownPath),
    };
  };

  const worksetArtifacts = [];
  for (const workset of worksets) {
    worksetArtifacts.push(await writeWorksetArtifacts(workset));
  }
  report.worksetArtifacts = worksetArtifacts;
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  await fs.writeFile(markdownPath, [
    '# Daegu P2 Operator Worksets',
    '',
    `- worksets version: \`${WORKSETS_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- P2-A label/hit: ${summary.p2aRows}`,
    `- P2-B visual approval: ${summary.p2bRows}`,
    `- P2-C SKY/U manual retrace: ${summary.p2cRows}`,
    `- P2-D outfield manual retrace: ${summary.p2dRows}`,
    `- handoff status: \`${summary.handoffStatus}\``,
    `- P1 postwrite status: \`${summary.p1PostwriteStatus || 'missing'}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Worksets',
    '',
    markdownTable(
      ['workset', 'rows', 'waiting', 'approved', 'artifact'],
      worksets.map((workset) => {
        const artifact = worksetArtifacts.find((item) => item.id === workset.id);
        return [
          `\`${workset.id}\` ${workset.title}`,
          `${workset.rowCount}/${workset.expectedRows}`,
          workset.waitingForOperatorRows,
          workset.approvedRows,
          artifact ? `\`${artifact.markdown}\`` : '-',
        ];
      }),
    ),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p2_operator_worksets_json:${jsonPath}`);
  console.log(`p2_operator_worksets_csv:${csvPath}`);
  console.log(`p2_operator_worksets_markdown:${markdownPath}`);
  console.log(`status:${summary.status} p2a=${summary.p2aRows} p2b=${summary.p2bRows} p2c=${summary.p2cRows} p2d=${summary.p2dRows} waiting=${summary.waitingForOperatorRows}/${summary.totalRows}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP2ReviewPackage = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP2ReportDir = path.join(defaultReportDir, 'daegu-p2-draft');
  const defaultCropDir = path.join(defaultReportDir, 'daegu-handoff-evidence-crops');

  const PACKAGE_VERSION = 'DAEGU_P2_REVIEW_PACKAGE_V1';
  const P2_PRIORITY = 'P2';
  const DRAFT_REVIEWER = 'DRAFT_VALIDATION_ONLY';
  const DRAFT_REVIEWED_AT = '2026-05-10T00:00:00.000Z';
  const EXPECTED_P2_COUNTS = {
    total: 50,
    manualRetrace: 34,
    labelAndHit: 2,
    visualApprovalCandidates: 14,
    validApproved: 16,
    invalidApproved: 34,
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

  const numberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const pointCount = (pathData) => (
    String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.length ?? 0
  ) / 2;

  const runNodeScript = (script, args, expectedExitCodes = [0]) => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', script, ...args], {
      cwd: frontendRoot,
      encoding: 'utf8',
    });

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    const exitCode = result.status ?? 1;
    if (!expectedExitCodes.includes(exitCode)) {
      throw new Error(`${script} exited with ${exitCode}`);
    }

    return {
      script,
      args,
      exitCode,
    };
  };

  const evidenceCropFor = (row, cropFiles) => {
    const match = cropFiles.find((fileName) => fileName.includes(row.id));
    if (match) return `reports/stadium/daegu-handoff-evidence-crops/${match}`;
    return '';
  };

  const draftCorrectionFor = (row, cropFiles) => {
    const correctedPath = row.candidateOuterBoundaryPath || row.candidateHullPath || '';
    const correctedLabelX = numberOrNull(row.candidateCenter?.x) ?? numberOrNull(row.labelX) ?? '';
    const correctedLabelY = numberOrNull(row.candidateCenter?.y) ?? numberOrNull(row.labelY) ?? '';

    return {
      blockId: row.id,
      block: row.block,
      name: row.name,
      category: row.category,
      queuePriority: row.queuePriority,
      alignmentClass: row.alignmentClass,
      candidateStatus: row.candidateStatus,
      candidateDuplicateGroup: row.candidateDuplicateGroup || '',
      recommendedAction: row.recommendedAction,
      evidenceCrop: evidenceCropFor(row, cropFiles),
      operatorDecision: 'APPROVED',
      correctedPath,
      correctedLabelX,
      correctedLabelY,
      reviewer: DRAFT_REVIEWER,
      reviewedAt: DRAFT_REVIEWED_AT,
      operatorNote: 'DRAFT ONLY: pixel candidate path validates technically; requires operator visual approval before copying into production template.',
    };
  };

  const classifyRow = (row, validationRow) => {
    const points = pointCount(row.correctedPath);
    const validationReasons = validationRow?.reasons ?? [];

    if (points < 6 || validationReasons.includes('PATH_REQUIRES_AT_LEAST_SIX_POINTS')) {
      return {
        points,
        action: 'MANUAL_RETRACE_REQUIRED',
        gate: 'BLOCKED_BY_POLYGON_DETAIL_TEST',
      };
    }

    if (row.recommendedAction === 'RETRACE_LABEL_AND_HIT_AREA') {
      return {
        points,
        action: 'LABEL_AND_HIT_AREA_REVIEW',
        gate: 'NEEDS_LABEL_AND_HIT_CONFIRMATION',
      };
    }

    return {
      points,
      action: 'VISUAL_APPROVAL_CANDIDATE',
      gate: 'CAN_MOVE_TO_OPERATOR_TEMPLATE_AFTER_VISUAL_APPROVAL',
    };
  };

  const toOperatorStagingRow = (row, overrides = {}) => ({
    blockId: row.blockId,
    block: row.block,
    name: row.name,
    category: row.category,
    queuePriority: row.queuePriority,
    alignmentClass: row.alignmentClass,
    candidateStatus: row.candidateStatus,
    candidateDuplicateGroup: row.candidateDuplicateGroup || '',
    recommendedAction: row.recommendedAction,
    requiredOperatorReview: row.action,
    evidenceCrop: row.evidenceCrop,
    operatorDecision: 'PENDING',
    correctedPath: row.correctedPath,
    correctedLabelX: row.correctedLabelX,
    correctedLabelY: row.correctedLabelY,
    reviewer: '',
    reviewedAt: '',
    operatorNote: row.action === 'LABEL_AND_HIT_AREA_REVIEW'
      ? 'Operator must confirm correctedPath, correctedLabelX/Y, and top-hit area before setting APPROVED.'
      : 'Operator must visually approve this candidate before setting APPROVED.',
    ...overrides,
  });

  const writeCorrectionBundle = async (jsonPath, csvPath, bundle, rows) => {
    await fs.writeFile(jsonPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

    const header = [
      'blockId',
      'block',
      'name',
      'category',
      'queuePriority',
      'alignmentClass',
      'candidateStatus',
      'candidateDuplicateGroup',
      'recommendedAction',
      'requiredOperatorReview',
      'evidenceCrop',
      'operatorDecision',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
      'operatorNote',
    ];
    await writeCsv(csvPath, [
      header,
      ...rows.map((row) => header.map((key) => row[key])),
    ]);
  };

  const assertCount = (label, actual, expected, blockers) => {
    if (actual !== expected) blockers.push(`${label}:${actual}!=${expected}`);
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const p2ReportDir = path.resolve(frontendRoot, argValue('--p2-report-dir', defaultP2ReportDir));
  const cropDir = path.resolve(frontendRoot, argValue('--crop-dir', defaultCropDir));
  const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');

  const handoff = await readJson(handoffPath);
  const cropFiles = fsSync.existsSync(cropDir) ? await fs.readdir(cropDir) : [];
  const p2Rows = handoff.workItems
    .filter((row) => row.queuePriority === P2_PRIORITY)
    .sort((a, b) => String(a.block).localeCompare(String(b.block), 'ko'));

  const corrections = p2Rows.map((row) => draftCorrectionFor(row, cropFiles));
  const draft = {
    generatedAt: new Date().toISOString(),
    packageVersion: PACKAGE_VERSION,
    draftOnly: true,
    source: path.relative(frontendRoot, handoffPath),
    warning: 'Do not use for production write until an operator visually approves every row and replaces reviewer/reviewedAt.',
    expectedCurrentPlan: EXPECTED_P2_COUNTS,
    remainingPlan: {
      p2Rows: p2Rows.length,
      closedRowsSinceBaseline: EXPECTED_P2_COUNTS.total - p2Rows.length,
    },
    corrections,
  };

  await fs.mkdir(p2ReportDir, { recursive: true });
  const draftInputPath = path.join(p2ReportDir, 'daegu-seatmap-p2-draft-corrections.json');
  await fs.writeFile(draftInputPath, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');

  const commandResults = [];
  commandResults.push(runNodeScript('scripts/daegu-seatmap-operator-corrections.mjs', [
    'operator-corrections-validate',
    '--input',
    path.relative(frontendRoot, draftInputPath),
    '--report-dir',
    path.relative(frontendRoot, p2ReportDir),
    '--handoff',
    path.relative(frontendRoot, handoffPath),
    '--allow-draft-markers',
  ], [0, 1]));
  commandResults.push(runNodeScript('scripts/daegu-seatmap-operator-corrections.mjs', [
    'operator-corrections-preview',
    '--input',
    path.relative(frontendRoot, draftInputPath),
    '--validation',
    path.relative(frontendRoot, path.join(p2ReportDir, 'daegu-seatmap-operator-corrections-validation.json')),
    '--report-dir',
    path.relative(frontendRoot, p2ReportDir),
  ], [0, 1]));
  commandResults.push(runNodeScript('scripts/daegu-seatmap-operator-corrections.mjs', [
    'operator-corrections-apply',
    '--input',
    path.relative(frontendRoot, draftInputPath),
    '--validation',
    path.relative(frontendRoot, path.join(p2ReportDir, 'daegu-seatmap-operator-corrections-validation.json')),
    '--report-dir',
    path.relative(frontendRoot, p2ReportDir),
  ], [0, 1]));

  const validation = await readJson(path.join(p2ReportDir, 'daegu-seatmap-operator-corrections-validation.json'));
  const preview = await readJson(path.join(p2ReportDir, 'daegu-seatmap-operator-corrections-preview.json'));
  const apply = await readJson(path.join(p2ReportDir, 'daegu-seatmap-operator-corrections-apply.json'));
  const validationByBlockId = new Map((validation.rows ?? []).map((row) => [row.blockId, row]));
  const handoffByBlockId = new Map(p2Rows.map((row) => [row.id, row]));

  const checklistRows = corrections.map((row) => {
    const handoffRow = handoffByBlockId.get(row.blockId) ?? {};
    const validationRow = validationByBlockId.get(row.blockId);
    const classification = classifyRow(row, validationRow);

    return {
      ...row,
      ...classification,
      validationValid: validationRow?.validForApproval === true,
      validationReasons: (validationRow?.reasons ?? []).join('; '),
      currentLabel: `${handoffRow.labelX},${handoffRow.labelY}`,
      correctedLabel: `${row.correctedLabelX},${row.correctedLabelY}`,
      officialFailureReasons: (handoffRow.officialFailureReasons ?? []).join('; '),
      riskFlags: (handoffRow.riskFlags ?? []).join('; '),
    };
  });

  const groups = {
    manualRetrace: checklistRows.filter((row) => row.action === 'MANUAL_RETRACE_REQUIRED'),
    labelAndHit: checklistRows.filter((row) => row.action === 'LABEL_AND_HIT_AREA_REVIEW'),
    visualApprovalCandidates: checklistRows.filter((row) => row.action === 'VISUAL_APPROVAL_CANDIDATE'),
  };
  const approvalCandidateRows = [
    ...groups.labelAndHit,
    ...groups.visualApprovalCandidates,
  ].map((row) => toOperatorStagingRow(row));
  const manualRetraceRows = groups.manualRetrace.map((row) => toOperatorStagingRow(row, {
    correctedPath: '',
    correctedLabelX: '',
    correctedLabelY: '',
    operatorNote: 'Manual retrace required: replace with a new operator-traced official PNG path of at least 6 polygon points before setting APPROVED.',
  }));

  const blockers = [];
  const remainingPlan = {
    baselineP2Rows: EXPECTED_P2_COUNTS.total,
    closedRowsSinceBaseline: EXPECTED_P2_COUNTS.total - checklistRows.length,
    remainingP2Rows: checklistRows.length,
    manualRetraceRequired: groups.manualRetrace.length,
    labelAndHitAreaReview: groups.labelAndHit.length,
    visualApprovalCandidates: groups.visualApprovalCandidates.length,
    validApprovedRows: validation.summary?.validApprovedRows ?? 0,
    invalidApprovedRows: validation.summary?.invalidApprovedRows ?? 0,
  };
  assertCount(
    'DRAFT_BUCKET_TOTAL',
    groups.manualRetrace.length + groups.labelAndHit.length + groups.visualApprovalCandidates.length,
    checklistRows.length,
    blockers,
  );
  assertCount(
    'VALIDATION_APPROVED_TOTAL',
    remainingPlan.validApprovedRows + remainingPlan.invalidApprovedRows,
    validation.summary?.approvedRows ?? 0,
    blockers,
  );

  if (groups.manualRetrace.length > 0) {
    if (validation.summary?.status !== 'failed') blockers.push(`VALIDATION_STATUS:${validation.summary?.status}`);
    if (preview.summary?.status !== 'blocked') blockers.push(`PREVIEW_STATUS:${preview.summary?.status}`);
    if (apply.summary?.status !== 'blocked') blockers.push(`APPLY_STATUS:${apply.summary?.status}`);
  } else {
    if (!['ok', 'failed'].includes(validation.summary?.status)) blockers.push(`VALIDATION_STATUS:${validation.summary?.status}`);
  }

  const summary = {
    packageVersion: PACKAGE_VERSION,
    status: blockers.length > 0 ? 'failed' : 'ok',
    generatedAt: new Date().toISOString(),
    draftInput: path.relative(frontendRoot, draftInputPath),
    expectedP2Counts: EXPECTED_P2_COUNTS,
    remainingPlan,
    p2Rows: checklistRows.length,
    manualRetraceRequired: groups.manualRetrace.length,
    labelAndHitAreaReview: groups.labelAndHit.length,
    visualApprovalCandidates: groups.visualApprovalCandidates.length,
    validationStatus: validation.summary?.status ?? '',
    validApprovedRows: validation.summary?.validApprovedRows ?? 0,
    invalidApprovedRows: validation.summary?.invalidApprovedRows ?? 0,
    previewStatus: preview.summary?.status ?? '',
    previewBlockers: preview.summary?.blockers ?? [],
    applyStatus: apply.summary?.status ?? '',
    applyPlannedRows: apply.summary?.plannedRows ?? 0,
    applyDataFileChanged: apply.summary?.dataFileChanged ?? false,
    blockers,
    commandResults,
  };

  const checklistCsvHeader = [
    'priority',
    'block',
    'blockId',
    'name',
    'points',
    'action',
    'gate',
    'validationValid',
    'validationReasons',
    'recommendedAction',
    'candidateStatus',
    'candidateDuplicateGroup',
    'currentLabel',
    'correctedLabel',
    'evidenceCrop',
    'officialFailureReasons',
    'riskFlags',
  ];
  const checklistCsvPath = path.join(p2ReportDir, 'daegu-seatmap-p2-review-checklist.csv');
  await writeCsv(checklistCsvPath, [
    checklistCsvHeader,
    ...checklistRows.map((row) => checklistCsvHeader.map((key) => row[key])),
  ]);

  const approvalCandidatesJsonPath = path.join(p2ReportDir, 'daegu-seatmap-p2-operator-approval-candidates.json');
  const approvalCandidatesCsvPath = path.join(p2ReportDir, 'daegu-seatmap-p2-operator-approval-candidates.csv');
  await writeCorrectionBundle(
    approvalCandidatesJsonPath,
    approvalCandidatesCsvPath,
    {
      generatedAt: summary.generatedAt,
      packageVersion: PACKAGE_VERSION,
      stagingOnly: true,
      warning: 'These rows are PENDING staging rows, not operator approvals. Copy to the production template only after replacing operatorDecision, reviewer, and reviewedAt with real operator approval values.',
      sourceChecklist: 'reports/stadium/daegu-p2-draft/daegu-seatmap-p2-review-checklist.md',
      targetTemplate: 'reports/stadium/daegu-seatmap-operator-corrections-template.json',
      corrections: approvalCandidateRows,
    },
    approvalCandidateRows,
  );

  const manualRetraceJsonPath = path.join(p2ReportDir, 'daegu-seatmap-p2-manual-retrace-template.json');
  const manualRetraceCsvPath = path.join(p2ReportDir, 'daegu-seatmap-p2-manual-retrace-template.csv');
  await writeCorrectionBundle(
    manualRetraceJsonPath,
    manualRetraceCsvPath,
    {
      generatedAt: summary.generatedAt,
      packageVersion: PACKAGE_VERSION,
      stagingOnly: true,
      warning: 'These rows intentionally leave correctedPath/correctedLabelX/correctedLabelY blank. Operators must manually retrace before any APPROVED production template row is valid.',
      sourceChecklist: 'reports/stadium/daegu-p2-draft/daegu-seatmap-p2-review-checklist.md',
      targetTemplate: 'reports/stadium/daegu-seatmap-operator-corrections-template.json',
      corrections: manualRetraceRows,
    },
    manualRetraceRows,
  );

  const rowTable = (rows) => markdownTable(
    ['block', 'points', 'validation', 'action', 'gate', 'evidence crop'],
    rows.map((row) => [
      row.block,
      String(row.points),
      row.validationValid ? 'valid' : row.validationReasons || 'invalid',
      row.action,
      row.gate,
      row.evidenceCrop,
    ]),
  );

  const checklistMarkdownPath = path.join(p2ReportDir, 'daegu-seatmap-p2-review-checklist.md');
  await fs.writeFile(checklistMarkdownPath, [
    '# Daegu P2 Operator Review Checklist',
    '',
    `- package version: \`${PACKAGE_VERSION}\``,
    `- generatedAt: \`${summary.generatedAt}\``,
    `- source: \`${summary.draftInput}\``,
    `- validation status: \`${summary.validationStatus}\``,
    `- validation rows: approved=\`${validation.summary?.approvedRows ?? 0}\`, validApproved=\`${summary.validApprovedRows}\`, invalidApproved=\`${summary.invalidApprovedRows}\``,
    `- preview status: \`${summary.previewStatus}\`, blockers=\`${summary.previewBlockers.join(' ') || '-'}\``,
    `- dry-run apply: status=\`${summary.applyStatus}\`, plannedRows=\`${summary.applyPlannedRows}\`, dataFileChanged=\`${summary.applyDataFileChanged}\``,
    '',
    '## Gate Decision',
    '',
    '이 파일은 P2 드래프트 검수용 산출물이며, 운영자 승인을 의미하지 않습니다. 현재 드래프트는 4점 polygon 34건 때문에 validation이 실패해야 정상입니다.',
    '',
    'Promotion rules for this batch:',
    '',
    '1. `MANUAL_RETRACE_REQUIRED` 행은 operator가 새 `correctedPath`를 직접 작성해야 승인할 수 있습니다.',
    '2. `LABEL_AND_HIT_AREA_REVIEW` 행은 path와 label 위치를 둘 다 시각 검수해야 합니다.',
    '3. `VISUAL_APPROVAL_CANDIDATE` 행도 시각 승인 후에만 `reports/stadium/daegu-seatmap-operator-corrections-template.json`으로 옮기며, `DRAFT_VALIDATION_ONLY` 대신 실제 `reviewer` / `reviewedAt`이 필요합니다.',
    '4. write 전에는 `validate -> preview -> dry-run apply -> status` 순서로 다시 통과시키고, `readyForWrite=true`일 때만 write합니다.',
    '',
    '## Summary',
    '',
    markdownTable(
      ['bucket', 'count'],
      [
        ['total P2 rows', String(summary.p2Rows)],
        ['manual retrace required', String(summary.manualRetraceRequired)],
        ['label and hit area review', String(summary.labelAndHitAreaReview)],
        ['visual approval candidates', String(summary.visualApprovalCandidates)],
      ],
    ),
    '',
    '## Manual Retrace Required',
    '',
    rowTable(groups.manualRetrace),
    '',
    '## Label And Hit Area Review',
    '',
    rowTable(groups.labelAndHit),
    '',
    '## Visual Approval Candidates',
    '',
    rowTable(groups.visualApprovalCandidates),
    '',
    '## CSV',
    '',
    'Detailed row data is also available at `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-review-checklist.csv`.',
    '',
    '## Operator Input Staging Files',
    '',
    '- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-operator-approval-candidates.json` contains the 16 technically valid P2 rows as `PENDING`; operators must set real approval fields before production use.',
    '- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-manual-retrace-template.json` contains the 34 blocked P2 rows with blank corrected fields for manual retracing.',
    '',
  ].join('\n'), 'utf8');

  const summaryJsonPath = path.join(p2ReportDir, 'daegu-seatmap-p2-review-package.json');
  const summaryMarkdownPath = path.join(p2ReportDir, 'daegu-seatmap-p2-review-package.md');
  await fs.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(summaryMarkdownPath, [
    '# Daegu P2 Review Package',
    '',
    `- package version: \`${PACKAGE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- p2 rows: ${summary.p2Rows}`,
    `- manual retrace required: ${summary.manualRetraceRequired}`,
    `- label and hit area review: ${summary.labelAndHitAreaReview}`,
    `- visual approval candidates: ${summary.visualApprovalCandidates}`,
    `- validation: \`${summary.validationStatus}\` (${summary.validApprovedRows} valid / ${summary.invalidApprovedRows} invalid)`,
    `- preview: \`${summary.previewStatus}\``,
    `- apply: \`${summary.applyStatus}\``,
    '',
    '## Outputs',
    '',
    '- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-draft-corrections.json`',
    '- `reports/stadium/daegu-p2-draft/daegu-seatmap-operator-corrections-validation.md`',
    '- `reports/stadium/daegu-p2-draft/daegu-seatmap-operator-corrections-preview.svg`',
    '- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-review-checklist.md`',
    '- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-operator-approval-candidates.json`',
    '- `reports/stadium/daegu-p2-draft/daegu-seatmap-p2-manual-retrace-template.json`',
    '',
    '## Blockers',
    '',
    blockers.length > 0
      ? markdownTable(['blocker'], blockers.map((blocker) => [blocker]))
      : 'No package blockers. The validation/preview/apply blocked state is expected for the draft package.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p2_review_package_json:${summaryJsonPath}`);
  console.log(`p2_review_package_markdown:${summaryMarkdownPath}`);
  console.log(`p2_review_checklist_markdown:${checklistMarkdownPath}`);
  console.log(`p2_operator_approval_candidates_json:${approvalCandidatesJsonPath}`);
  console.log(`p2_manual_retrace_template_json:${manualRetraceJsonPath}`);
  console.log(`status:${summary.status} p2=${summary.p2Rows} validApproved=${summary.validApprovedRows} invalidApproved=${summary.invalidApprovedRows}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runP2StagingAudit = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP2ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-draft');

  const AUDIT_VERSION = 'DAEGU_P2_STAGING_AUDIT_V1';
  const EXPECTED = {
    p2Rows: 36,
    validApprovedRows: 3,
    invalidApprovedRows: 33,
    manualRetraceRequired: 33,
    labelAndHitAreaReview: 2,
    visualApprovalCandidates: 1,
    approvalCandidateRows: 3,
    manualRetraceRows: 33,
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

  const countRows = (rows) => ({
    total: rows.length,
    pending: rows.filter((row) => row.operatorDecision === 'PENDING').length,
    approved: rows.filter((row) => row.operatorDecision === 'APPROVED').length,
    filledPath: rows.filter((row) => !isBlank(row.correctedPath)).length,
    filledLabelX: rows.filter((row) => !isBlank(row.correctedLabelX)).length,
    filledLabelY: rows.filter((row) => !isBlank(row.correctedLabelY)).length,
    filledReviewer: rows.filter((row) => !isBlank(row.reviewer)).length,
    filledReviewedAt: rows.filter((row) => !isBlank(row.reviewedAt)).length,
  });

  const pushExpected = (blockers, label, actual, expected) => {
    if (actual !== expected) blockers.push(`${label}:${actual}!=${expected}`);
  };

  const p2ReportDir = path.resolve(frontendRoot, argValue('--p2-report-dir', defaultP2ReportDir));
  const packagePath = path.join(p2ReportDir, 'daegu-seatmap-p2-review-package.json');
  const approvalCandidatesPath = path.join(p2ReportDir, 'daegu-seatmap-p2-operator-approval-candidates.json');
  const manualRetracePath = path.join(p2ReportDir, 'daegu-seatmap-p2-manual-retrace-template.json');

  const packageReport = await readJson(packagePath);
  const approvalCandidates = await readJson(approvalCandidatesPath);
  const manualRetrace = await readJson(manualRetracePath);

  const approvalRows = approvalCandidates.corrections ?? [];
  const manualRows = manualRetrace.corrections ?? [];
  const approvalCounts = countRows(approvalRows);
  const manualCounts = countRows(manualRows);
  const dynamicExpected = {
    p2Rows: Number(packageReport.p2Rows ?? 0),
    validApprovedRows: Number(packageReport.validApprovedRows ?? 0),
    invalidApprovedRows: Number(packageReport.invalidApprovedRows ?? 0),
    manualRetraceRequired: Number(packageReport.manualRetraceRequired ?? 0),
    labelAndHitAreaReview: Number(packageReport.labelAndHitAreaReview ?? 0),
    visualApprovalCandidates: Number(packageReport.visualApprovalCandidates ?? 0),
    approvalCandidateRows: Number(packageReport.labelAndHitAreaReview ?? 0)
      + Number(packageReport.visualApprovalCandidates ?? 0),
    manualRetraceRows: Number(packageReport.manualRetraceRequired ?? 0),
  };
  const blockers = [];

  pushExpected(blockers, 'PACKAGE_BUCKET_TOTAL', dynamicExpected.manualRetraceRequired + dynamicExpected.approvalCandidateRows, dynamicExpected.p2Rows);
  pushExpected(blockers, 'PACKAGE_VALIDATION_TOTAL', dynamicExpected.validApprovedRows + dynamicExpected.invalidApprovedRows, dynamicExpected.p2Rows);
  if (packageReport.status !== 'ok') blockers.push(`PACKAGE_STATUS_NOT_OK:${packageReport.status ?? ''}`);

  if (approvalCandidates.stagingOnly !== true) blockers.push('APPROVAL_CANDIDATES_NOT_STAGING_ONLY');
  pushExpected(blockers, 'APPROVAL_CANDIDATE_ROWS', approvalCounts.total, dynamicExpected.approvalCandidateRows);
  pushExpected(blockers, 'APPROVAL_CANDIDATE_PENDING_ROWS', approvalCounts.pending, dynamicExpected.approvalCandidateRows);
  pushExpected(blockers, 'APPROVAL_CANDIDATE_APPROVED_ROWS', approvalCounts.approved, 0);
  pushExpected(blockers, 'APPROVAL_CANDIDATE_FILLED_PATH_ROWS', approvalCounts.filledPath, dynamicExpected.approvalCandidateRows);
  pushExpected(blockers, 'APPROVAL_CANDIDATE_FILLED_REVIEWER_ROWS', approvalCounts.filledReviewer, 0);
  pushExpected(blockers, 'APPROVAL_CANDIDATE_FILLED_REVIEWED_AT_ROWS', approvalCounts.filledReviewedAt, 0);

  if (manualRetrace.stagingOnly !== true) blockers.push('MANUAL_RETRACE_NOT_STAGING_ONLY');
  pushExpected(blockers, 'MANUAL_RETRACE_ROWS', manualCounts.total, dynamicExpected.manualRetraceRows);
  pushExpected(blockers, 'MANUAL_RETRACE_PENDING_ROWS', manualCounts.pending, dynamicExpected.manualRetraceRows);
  pushExpected(blockers, 'MANUAL_RETRACE_APPROVED_ROWS', manualCounts.approved, 0);
  pushExpected(blockers, 'MANUAL_RETRACE_FILLED_PATH_ROWS', manualCounts.filledPath, 0);
  pushExpected(blockers, 'MANUAL_RETRACE_FILLED_LABEL_X_ROWS', manualCounts.filledLabelX, 0);
  pushExpected(blockers, 'MANUAL_RETRACE_FILLED_LABEL_Y_ROWS', manualCounts.filledLabelY, 0);
  pushExpected(blockers, 'MANUAL_RETRACE_FILLED_REVIEWER_ROWS', manualCounts.filledReviewer, 0);
  pushExpected(blockers, 'MANUAL_RETRACE_FILLED_REVIEWED_AT_ROWS', manualCounts.filledReviewedAt, 0);

  const summary = {
    auditVersion: AUDIT_VERSION,
    status: blockers.length === 0 ? 'ok' : 'failed',
    p2ReportDir: path.relative(frontendRoot, p2ReportDir),
    packageReport: path.relative(frontendRoot, packagePath),
    approvalCandidates: path.relative(frontendRoot, approvalCandidatesPath),
    manualRetrace: path.relative(frontendRoot, manualRetracePath),
    packageCounts: {
      p2Rows: packageReport.p2Rows,
      baselineP2Rows: EXPECTED.p2Rows,
      validApprovedRows: packageReport.validApprovedRows,
      invalidApprovedRows: packageReport.invalidApprovedRows,
      manualRetraceRequired: packageReport.manualRetraceRequired,
      labelAndHitAreaReview: packageReport.labelAndHitAreaReview,
      visualApprovalCandidates: packageReport.visualApprovalCandidates,
    },
    expectedCounts: dynamicExpected,
    approvalCandidateCounts: approvalCounts,
    manualRetraceCounts: manualCounts,
    blockers,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
  };

  const jsonPath = path.join(p2ReportDir, 'daegu-seatmap-p2-staging-audit.json');
  const csvPath = path.join(p2ReportDir, 'daegu-seatmap-p2-staging-audit.csv');
  const markdownPath = path.join(p2ReportDir, 'daegu-seatmap-p2-staging-audit.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'status',
      'p2Rows',
      'validApprovedRows',
      'invalidApprovedRows',
      'manualRetraceRequired',
      'labelAndHitAreaReview',
      'visualApprovalCandidates',
      'approvalCandidateRows',
      'approvalCandidatePending',
      'approvalCandidateApproved',
      'approvalCandidateFilledPath',
      'manualRetraceRows',
      'manualRetracePending',
      'manualRetraceApproved',
      'manualRetraceFilledPath',
      'blockers',
    ],
    [
      summary.status,
      summary.packageCounts.p2Rows,
      summary.packageCounts.validApprovedRows,
      summary.packageCounts.invalidApprovedRows,
      summary.packageCounts.manualRetraceRequired,
      summary.packageCounts.labelAndHitAreaReview,
      summary.packageCounts.visualApprovalCandidates,
      summary.approvalCandidateCounts.total,
      summary.approvalCandidateCounts.pending,
      summary.approvalCandidateCounts.approved,
      summary.approvalCandidateCounts.filledPath,
      summary.manualRetraceCounts.total,
      summary.manualRetraceCounts.pending,
      summary.manualRetraceCounts.approved,
      summary.manualRetraceCounts.filledPath,
      summary.blockers.join(' '),
    ],
  ]);
  await fs.writeFile(markdownPath, [
    '# 대구 P2 staging audit',
    '',
    `- audit version: \`${AUDIT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- package report: \`${summary.packageReport}\``,
    `- approval candidates: \`${summary.approvalCandidates}\``,
    `- manual retrace: \`${summary.manualRetrace}\``,
    '',
    '## Expected Counts',
    '',
    `- P2 rows: ${summary.packageCounts.p2Rows}`,
    `- valid approved draft rows: ${summary.packageCounts.validApprovedRows}`,
    `- invalid approved draft rows: ${summary.packageCounts.invalidApprovedRows}`,
    `- manual retrace required: ${summary.packageCounts.manualRetraceRequired}`,
    `- label and hit area review: ${summary.packageCounts.labelAndHitAreaReview}`,
    `- visual approval candidates: ${summary.packageCounts.visualApprovalCandidates}`,
    '',
    '## Staging Files',
    '',
    `- approval candidates: rows=${approvalCounts.total}, pending=${approvalCounts.pending}, approved=${approvalCounts.approved}, filledPath=${approvalCounts.filledPath}`,
    `- manual retrace: rows=${manualCounts.total}, pending=${manualCounts.pending}, approved=${manualCounts.approved}, filledPath=${manualCounts.filledPath}`,
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p2_staging_audit_json:${jsonPath}`);
  console.log(`p2_staging_audit_csv:${csvPath}`);
  console.log(`p2_staging_audit_markdown:${markdownPath}`);
  console.log(`status:${summary.status} approvalCandidates=${approvalCounts.total} manualRetrace=${manualCounts.total}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const TASKS = {
  "p2-decision-packet": runP2DecisionPacket,
  "p2-next-action-packet": runP2NextActionPacket,
  "p2-operator-entry-sheet": runP2OperatorEntrySheet,
  "p2-operator-handoff": runP2OperatorHandoff,
  "p2-operator-import": runP2OperatorImport,
  "p2-operator-package": runP2OperatorPackage,
  "p2-operator-post-entry-qa": runP2OperatorPostEntryQa,
  "p2-operator-readiness": runP2OperatorReadiness,
  "p2-operator-tracing-pack": runP2OperatorTracingPack,
  "p2-operator-workset-preflight": runP2OperatorWorksetPreflight,
  "p2-operator-worksets": runP2OperatorWorksets,
  "p2-review-package": runP2ReviewPackage,
  "p2-staging-audit": runP2StagingAudit,
};

export const runDaeguP2OperatorTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Daegu p2 operator task: ${task}. Available tasks: ${available}`);
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
  await runDaeguP2OperatorTask(task, args);
}
