import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DAEGU_BLOCKS, DAEGU_SEATMAP_IMAGE, isDaeguNormalSelectableSeat } from '../src/data/daeguSeatData.ts';

const runP2aOperatorInputPacket = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP2OperatorDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-operator');

  const INPUT_PACKET_VERSION = 'DAEGU_P2A_OPERATOR_INPUT_PACKET_V1';
  const P2A_POST_ENTRY_QA_VERSION = 'DAEGU_P2A_OPERATOR_POST_ENTRY_QA_V1';
  const ENTRY_SHEET_VERSION = 'DAEGU_P2_OPERATOR_ENTRY_SHEET_V1';
  const TRACING_PACK_VERSION = 'DAEGU_P2_OPERATOR_TRACING_PACK_V1';
  const TARGET_BATCH_ID = 'BATCH_3_P2';
  const TARGET_WORKSET = 'P2-A';
  const EXPECTED_P2A_ROWS = 2;
  const REQUIRED_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const LABEL_TOP_HIT_CHECKLIST = [
    'CHECK_CORRECTED_LABEL_POINT_INSIDE_POLYGON',
    'CHECK_LABEL_POINT_SELECTS_SAME_BLOCK',
    'CHECK_HIT_PATH_DOES_NOT_CAPTURE_NEIGHBOR_BLOCK',
    'CHECK_PATH_ALIGNED_TO_OFFICIAL_PNG_SEAT_AREA',
    'CHECK_CURRENT_AND_CANDIDATE_PATHS_NOT_COPIED',
  ];

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

  const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));
  const entrySheetPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-entry-sheet.json');
  const tracingPackPath = path.join(
    p2OperatorDir,
    'daegu-seatmap-p2-operator-tracing-pack/daegu-seatmap-p2-operator-tracing-pack.json',
  );
  const p2aQaPath = path.join(p2OperatorDir, 'daegu-seatmap-p2a-operator-post-entry-qa.json');

  const reports = {
    entrySheet: await readJsonReport(entrySheetPath),
    tracingPack: await readJsonReport(tracingPackPath),
    p2aPostEntryQa: await readJsonReport(p2aQaPath),
  };

  const entrySummary = reports.entrySheet.data?.summary ?? {};
  const tracingSummary = reports.tracingPack.data?.summary ?? {};
  const qaSummary = reports.p2aPostEntryQa.data?.summary ?? {};
  const structuralBlockers = [];

  Object.values(reports).forEach((report) => {
    if (!report.exists) structuralBlockers.push(`MISSING_REPORT:${report.relativePath}`);
  });

  if (reports.entrySheet.exists && entrySummary.entrySheetVersion !== ENTRY_SHEET_VERSION) {
    structuralBlockers.push(`ENTRY_SHEET_VERSION_MISMATCH:${entrySummary.entrySheetVersion ?? ''}`);
  }
  if (reports.tracingPack.exists && tracingSummary.tracingPackVersion !== TRACING_PACK_VERSION) {
    structuralBlockers.push(`TRACING_PACK_VERSION_MISMATCH:${tracingSummary.tracingPackVersion ?? ''}`);
  }
  if (reports.p2aPostEntryQa.exists && qaSummary.p2aPostEntryQaVersion !== P2A_POST_ENTRY_QA_VERSION) {
    structuralBlockers.push(`P2A_POST_ENTRY_QA_VERSION_MISMATCH:${qaSummary.p2aPostEntryQaVersion ?? ''}`);
  }
  if (reports.entrySheet.exists && entrySummary.targetBatchId !== TARGET_BATCH_ID) {
    structuralBlockers.push(`ENTRY_SHEET_BATCH_MISMATCH:${entrySummary.targetBatchId ?? ''}`);
  }
  if (reports.tracingPack.exists && tracingSummary.targetBatchId !== TARGET_BATCH_ID) {
    structuralBlockers.push(`TRACING_PACK_BATCH_MISMATCH:${tracingSummary.targetBatchId ?? ''}`);
  }
  if (reports.p2aPostEntryQa.exists && qaSummary.targetBatchId !== TARGET_BATCH_ID) {
    structuralBlockers.push(`P2A_POST_ENTRY_QA_BATCH_MISMATCH:${qaSummary.targetBatchId ?? ''}`);
  }
  if (reports.entrySheet.exists && entrySummary.productionWriteAllowed !== false) {
    structuralBlockers.push('ENTRY_SHEET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  }
  if (reports.tracingPack.exists && tracingSummary.productionWriteAllowed !== false) {
    structuralBlockers.push('TRACING_PACK_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  }
  if (reports.p2aPostEntryQa.exists && qaSummary.productionWriteAllowed !== false) {
    structuralBlockers.push('P2A_POST_ENTRY_QA_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  }

  const entryRows = (Array.isArray(reports.entrySheet.data?.worksets) ? reports.entrySheet.data.worksets : [])
    .flatMap((workset) => (Array.isArray(workset.rows) ? workset.rows : []))
    .filter((row) => row.workset === TARGET_WORKSET);
  const tracingRows = (Array.isArray(reports.tracingPack.data?.rows) ? reports.tracingPack.data.rows : [])
    .filter((row) => row.workset === TARGET_WORKSET);
  const qaRows = (Array.isArray(reports.p2aPostEntryQa.data?.rows) ? reports.p2aPostEntryQa.data.rows : [])
    .filter((row) => row.subset === TARGET_WORKSET || row.workset === TARGET_WORKSET);

  const entryByBlockId = new Map(entryRows.map((row) => [row.blockId, row]));
  const tracingByBlockId = new Map(tracingRows.map((row) => [row.blockId, row]));
  const qaByBlockId = new Map(qaRows.map((row) => [row.blockId, row]));
  const blockIds = [...new Set([
    ...entryRows.map((row) => row.blockId),
    ...tracingRows.map((row) => row.blockId),
    ...qaRows.map((row) => row.blockId),
  ])].filter(Boolean);

  if (entryRows.length !== EXPECTED_P2A_ROWS) {
    structuralBlockers.push(`P2A_ENTRY_ROW_COUNT_MISMATCH:${entryRows.length}:${EXPECTED_P2A_ROWS}`);
  }
  if (tracingRows.length !== EXPECTED_P2A_ROWS) {
    structuralBlockers.push(`P2A_TRACING_ROW_COUNT_MISMATCH:${tracingRows.length}:${EXPECTED_P2A_ROWS}`);
  }
  if (qaRows.length !== EXPECTED_P2A_ROWS) {
    structuralBlockers.push(`P2A_QA_ROW_COUNT_MISMATCH:${qaRows.length}:${EXPECTED_P2A_ROWS}`);
  }
  if (blockIds.length !== EXPECTED_P2A_ROWS) {
    structuralBlockers.push(`P2A_BLOCK_ID_UNION_COUNT_MISMATCH:${blockIds.length}:${EXPECTED_P2A_ROWS}`);
  }

  const rows = [];
  for (const blockId of blockIds) {
    const entryRow = entryByBlockId.get(blockId) ?? {};
    const tracingRow = tracingByBlockId.get(blockId) ?? {};
    const qaRow = qaByBlockId.get(blockId) ?? {};
    const evidenceCrop = qaRow.evidenceCrop ?? entryRow.evidenceCrop ?? tracingRow.evidenceCrop ?? '';
    const tracingSvg = qaRow.tracingSvg ?? tracingRow.tracingSvg ?? '';
    const evidenceCropExists = evidenceCrop
      ? await fileExists(path.resolve(frontendRoot, evidenceCrop))
      : false;
    const tracingSvgExists = tracingSvg
      ? await fileExists(path.resolve(frontendRoot, tracingSvg))
      : false;
    const rowBlockers = [];

    if (!entryRow.blockId) rowBlockers.push('ENTRY_ROW_MISSING');
    if (!tracingRow.blockId) rowBlockers.push('TRACING_ROW_MISSING');
    if (!qaRow.blockId) rowBlockers.push('POST_ENTRY_QA_ROW_MISSING');
    if (!evidenceCropExists) rowBlockers.push('EVIDENCE_CROP_MISSING');
    if (!tracingSvgExists) rowBlockers.push('TRACING_SVG_MISSING');

    rows.push({
      inputPacketVersion: INPUT_PACKET_VERSION,
      workset: TARGET_WORKSET,
      block: entryRow.block ?? qaRow.block ?? tracingRow.block ?? '',
      blockId,
      name: entryRow.name ?? qaRow.name ?? tracingRow.name ?? '',
      category: entryRow.category ?? tracingRow.category ?? '',
      editableTarget: entryRow.editableTarget ?? qaRow.editableTarget ?? tracingRow.editableTarget ?? '',
      requiredFields: REQUIRED_FIELDS,
      labelTopHitChecklist: LABEL_TOP_HIT_CHECKLIST,
      decision: qaRow.decision ?? entryRow.decision ?? '',
      rowStatus: qaRow.rowStatus ?? entryRow.rowStatus ?? '',
      missingEntryFields: entryRow.missingEntryFields ?? [],
      requiredOperatorReview: entryRow.requiredOperatorReview ?? '',
      operatorAction: entryRow.operatorAction ?? '',
      evidenceCrop,
      evidenceCropExists,
      tracingSvg,
      tracingSvgExists,
      currentPath: entryRow.currentPath ?? tracingRow.currentPath ?? '',
      currentPathPointCount: entryRow.currentPathPointCount ?? tracingRow.currentPathPointCount ?? 0,
      currentPathReferenceOnly: true,
      candidatePath: entryRow.candidatePath ?? tracingRow.candidatePath ?? '',
      candidatePathPointCount: entryRow.candidatePathPointCount ?? tracingRow.candidatePathPointCount ?? 0,
      candidatePathReferenceOnly: true,
      currentLabel: `${entryRow.currentLabelX ?? tracingRow.currentLabelX ?? ''},${entryRow.currentLabelY ?? tracingRow.currentLabelY ?? ''}`,
      candidateLabel: `${entryRow.candidateLabelX ?? tracingRow.candidateLabelX ?? ''},${entryRow.candidateLabelY ?? tracingRow.candidateLabelY ?? ''}`,
      correctedPathPointCount: qaRow.correctedPathPointCount ?? entryRow.correctedPathPointCount ?? 0,
      minCorrectedPathPoints: qaRow.minCorrectedPathPoints ?? 6,
      postEntryActions: qaRow.actions ?? [],
      postEntryWarnings: qaRow.warnings ?? [],
      postEntryBlockers: qaRow.blockers ?? [],
      nextAction: qaRow.nextAction ?? '',
      p1PostwriteStatus: qaRow.p1PostwriteStatus ?? qaSummary.p1PostwriteStatus ?? '',
      noCopyPolicy: 'currentPath and candidatePath are reference-only and must not be copied into correctedPath.',
      operatorInstruction: 'Trace correctedPath on the official PNG evidence, set correctedLabelX/Y after label top-hit QA, then fill reviewer and reviewedAt.',
      rowBlockers,
    });
  }

  const rowBlockers = rows.flatMap((row) => row.rowBlockers.map((blocker) => `${row.block}:${blocker}`));
  const blockers = [...structuralBlockers, ...rowBlockers];
  const approvedRows = rows.filter((row) => row.decision === 'APPROVED');
  const waitingRows = rows.filter((row) => row.decision !== 'APPROVED');
  const p1PostwriteStatus = qaSummary.p1PostwriteStatus ?? '';
  const p1PostwriteVerified = p1PostwriteStatus === 'postwrite-verified';
  const status = blockers.length > 0
    ? 'blocked'
    : approvedRows.length < EXPECTED_P2A_ROWS
      ? 'waiting-for-operator-entry'
      : !p1PostwriteVerified
        ? 'waiting-for-p1-postwrite'
        : 'ready-for-p2-readiness';

  const summary = {
    inputPacketVersion: INPUT_PACKET_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    targetWorkset: TARGET_WORKSET,
    expectedRows: EXPECTED_P2A_ROWS,
    totalRows: rows.length,
    approvedRows: approvedRows.length,
    waitingForOperatorRows: waitingRows.length,
    p1PostwriteStatus,
    p1PostwriteVerified,
    readyForP2Readiness: status === 'ready-for-p2-readiness',
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesSourceInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    sourceEntrySheet: path.relative(frontendRoot, entrySheetPath),
    sourceTracingPack: path.relative(frontendRoot, tracingPackPath),
    sourceP2aPostEntryQa: path.relative(frontendRoot, p2aQaPath),
    requiredFields: REQUIRED_FIELDS,
    labelTopHitChecklist: LABEL_TOP_HIT_CHECKLIST,
    blockers,
    warnings: [...new Set(rows.flatMap((row) => row.postEntryWarnings))],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'This P2-A input packet is read-only.',
      'It aggregates entry sheet, tracing pack, and P2-A post-entry QA artifacts for operator use.',
      'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, reviewedAt, or operatorNote.',
      'It never writes source input or the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'currentPath is reference-only and must not be copied into correctedPath.',
      'candidatePath is reference-only and must not be copied into correctedPath.',
      'P2-A approval never bypasses full P2 readiness or the production write guard.',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p2a-operator-input-packet.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p2a-operator-input-packet.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p2a-operator-input-packet.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'workset',
      'block',
      'blockId',
      'editableTarget',
      'decision',
      'rowStatus',
      'requiredFields',
      'labelTopHitChecklist',
      'evidenceCrop',
      'evidenceCropExists',
      'tracingSvg',
      'tracingSvgExists',
      'postEntryActions',
      'nextAction',
      'rowBlockers',
    ],
    ...rows.map((row) => [
      row.workset,
      row.block,
      row.blockId,
      row.editableTarget,
      row.decision,
      row.rowStatus,
      row.requiredFields.join(' '),
      row.labelTopHitChecklist.join(' '),
      row.evidenceCrop,
      row.evidenceCropExists,
      row.tracingSvg,
      row.tracingSvgExists,
      row.postEntryActions.join(' '),
      row.nextAction,
      row.rowBlockers.join(' '),
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P2-A Operator Input Packet',
    '',
    `- input packet version: \`${INPUT_PACKET_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- workset: \`${summary.targetWorkset}\``,
    `- rows: ${summary.totalRows}/${summary.expectedRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- waiting for operator: ${summary.waitingForOperatorRows}`,
    `- P1 postwrite status: \`${summary.p1PostwriteStatus || 'missing'}\``,
    `- ready for P2 readiness: ${summary.readyForP2Readiness}`,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Required Fields',
    '',
    ...REQUIRED_FIELDS.map((field) => `- \`${field}\``),
    '',
    '## Label Top-Hit Checklist',
    '',
    ...LABEL_TOP_HIT_CHECKLIST.map((item) => `- \`${item}\``),
    '',
    '## Rows',
    '',
    markdownTable(
      [
        'block',
        'editable target',
        'decision',
        'evidence crop',
        'tracing svg',
        'missing fields',
        'actions',
        'next action',
        'blockers',
      ],
      rows.map((row) => [
        `\`${row.block}\``,
        `\`${row.editableTarget}\``,
        `\`${row.decision}\``,
        `\`${row.evidenceCrop}\``,
        `\`${row.tracingSvg}\``,
        row.missingEntryFields.map((field) => `\`${field}\``).join(' ') || '-',
        row.postEntryActions.map((action) => `\`${action}\``).join(' ') || '-',
        `\`${row.nextAction || 'missing'}\``,
        row.rowBlockers.map((blocker) => `\`${blocker}\``).join(' ') || '-',
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

  console.log(`p2a_operator_input_packet_json:${jsonPath}`);
  console.log(`p2a_operator_input_packet_csv:${csvPath}`);
  console.log(`p2a_operator_input_packet_markdown:${markdownPath}`);
  console.log(`status:${summary.status} rows=${summary.totalRows}/${summary.expectedRows} approved=${summary.approvedRows} blockers=${summary.blockers.length}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP2aOperatorPostEntryQa = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP2OperatorDir = path.join(frontendRoot, 'reports/stadium/daegu-p2-operator');

  const P2A_POST_ENTRY_QA_VERSION = 'DAEGU_P2A_OPERATOR_POST_ENTRY_QA_V1';
  const POST_ENTRY_QA_VERSION = 'DAEGU_P2_OPERATOR_POST_ENTRY_QA_V1';
  const TARGET_BATCH_ID = 'BATCH_3_P2';
  const TARGET_WORKSET = 'P2-A';
  const EXPECTED_P2A_ROWS = 2;
  const ACTIONS = {
    fillRequiredFields: 'FILL_REQUIRED_FIELDS',
    reviewLabelTopHit: 'REVIEW_LABEL_TOP_HIT',
    runP2PostEntryQa: 'RUN_P2_POST_ENTRY_QA',
    waitForP1Postwrite: 'WAIT_FOR_P1_POSTWRITE',
    continueP2FullReadiness: 'CONTINUE_P2_FULL_READINESS',
  };

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
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

  const addUnique = (items, value) => {
    if (!items.includes(value)) items.push(value);
  };

  const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));
  const postEntryQaPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-post-entry-qa.json');

  const postEntryQa = await readJsonReport(postEntryQaPath);
  const postEntrySummary = postEntryQa.data?.summary ?? {};
  const sourceRows = Array.isArray(postEntryQa.data?.rows) ? postEntryQa.data.rows : [];
  const structuralBlockers = [];

  if (!postEntryQa.exists) structuralBlockers.push(`MISSING_REPORT:${postEntryQa.relativePath}`);
  if (postEntryQa.exists && postEntrySummary.postEntryQaVersion !== POST_ENTRY_QA_VERSION) {
    structuralBlockers.push(`POST_ENTRY_QA_VERSION_MISMATCH:${postEntrySummary.postEntryQaVersion ?? ''}`);
  }
  if (postEntryQa.exists && postEntrySummary.targetBatchId !== TARGET_BATCH_ID) {
    structuralBlockers.push(`POST_ENTRY_QA_BATCH_MISMATCH:${postEntrySummary.targetBatchId ?? ''}`);
  }
  if (postEntryQa.exists && postEntrySummary.productionWriteAllowed !== false) {
    structuralBlockers.push('POST_ENTRY_QA_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  }
  if (postEntryQa.exists && postEntrySummary.writesSourceInput !== false) {
    structuralBlockers.push('POST_ENTRY_QA_WRITES_SOURCE_INPUT_NOT_FALSE');
  }
  if (postEntryQa.exists && postEntrySummary.writesCorrectionsTemplate !== false) {
    structuralBlockers.push('POST_ENTRY_QA_WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
  }
  if (postEntryQa.exists && postEntrySummary.writesProductionData !== false) {
    structuralBlockers.push('POST_ENTRY_QA_WRITES_PRODUCTION_DATA_NOT_FALSE');
  }

  const p2aRows = sourceRows
    .filter((row) => row.workset === TARGET_WORKSET)
    .map((row) => {
      const actions = Array.isArray(row.actions) ? [...row.actions] : [];
      const warnings = Array.isArray(row.warnings) ? [...row.warnings] : [];
      addUnique(actions, ACTIONS.reviewLabelTopHit);
      if (row.approved !== true) addUnique(actions, ACTIONS.fillRequiredFields);
      if (row.approved === true && row.p1PostwriteStatus !== 'postwrite-verified') {
        addUnique(actions, ACTIONS.waitForP1Postwrite);
      }
      if (row.approved === true && row.p1PostwriteStatus === 'postwrite-verified') {
        addUnique(actions, ACTIONS.continueP2FullReadiness);
      }
      addUnique(warnings, 'P2A_LABEL_TOP_HIT_OPERATOR_QA_REQUIRED');

      return {
        ...row,
        subset: TARGET_WORKSET,
        requiresLabelTopHitQa: true,
        actions,
        warnings,
        nextAction: row.approved === true
          ? row.p1PostwriteStatus === 'postwrite-verified'
            ? ACTIONS.continueP2FullReadiness
            : ACTIONS.waitForP1Postwrite
          : ACTIONS.fillRequiredFields,
      };
    });

  if (p2aRows.length !== EXPECTED_P2A_ROWS) {
    structuralBlockers.push(`P2A_ROW_COUNT_MISMATCH:${p2aRows.length}:${EXPECTED_P2A_ROWS}`);
  }

  const approvedRows = p2aRows.filter((row) => row.approved);
  const waitingRows = p2aRows.filter((row) => !row.approved);
  const blockedRows = p2aRows.filter((row) => Array.isArray(row.blockers) && row.blockers.length > 0);
  const p1PostwriteStatus = postEntrySummary.p1PostwriteStatus ?? '';
  const p1PostwriteVerified = p1PostwriteStatus === 'postwrite-verified';
  const allBlockers = [
    ...structuralBlockers,
    ...p2aRows.flatMap((row) => (row.blockers ?? []).map((blocker) => `${row.block}:${blocker}`)),
  ];

  const status = allBlockers.length > 0
    ? 'blocked-after-entry'
    : approvedRows.length < EXPECTED_P2A_ROWS
      ? 'waiting-for-operator-entry'
      : !p1PostwriteVerified
        ? 'waiting-for-p1-postwrite'
        : 'ready-for-p2-readiness';

  const summary = {
    p2aPostEntryQaVersion: P2A_POST_ENTRY_QA_VERSION,
    upstreamPostEntryQaVersion: postEntrySummary.postEntryQaVersion ?? '',
    status,
    targetBatchId: TARGET_BATCH_ID,
    targetWorkset: TARGET_WORKSET,
    sourcePostEntryQa: path.relative(frontendRoot, postEntryQaPath),
    expectedRows: EXPECTED_P2A_ROWS,
    totalRows: p2aRows.length,
    approvedRows: approvedRows.length,
    waitingForOperatorRows: waitingRows.length,
    blockedRows: blockedRows.length,
    p1PostwriteStatus,
    p1PostwriteVerified,
    readyForP2Readiness: status === 'ready-for-p2-readiness',
    readyForProductionWrite: false,
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesSourceInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers: allBlockers,
    warnings: [...new Set(p2aRows.flatMap((row) => row.warnings ?? []))],
    actions: [...new Set(p2aRows.flatMap((row) => row.actions ?? []))],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    actionCatalog: ACTIONS,
    safetyContract: [
      'This P2-A post-entry QA is read-only.',
      'It only narrows the existing P2 post-entry QA report to P2-A label/hit rows.',
      'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, or reviewedAt.',
      'It never writes source input or the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'P2-A rows require label top-hit operator QA before they can advance.',
      'P2-A approval never bypasses the full P2 readiness gate.',
      'P2 production write waits for P1 boundary-first postwrite verification.',
    ],
    rows: p2aRows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p2a-operator-post-entry-qa.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p2a-operator-post-entry-qa.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p2a-operator-post-entry-qa.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'subset',
      'block',
      'blockId',
      'decision',
      'rowStatus',
      'requiresLabelTopHitQa',
      'blockers',
      'warnings',
      'actions',
      'nextAction',
      'p1PostwriteStatus',
      'editableTarget',
    ],
    ...p2aRows.map((row) => [
      row.subset,
      row.block,
      row.blockId,
      row.decision,
      row.rowStatus,
      row.requiresLabelTopHitQa,
      row.blockers?.join(' ') ?? '',
      row.warnings?.join(' ') ?? '',
      row.actions?.join(' ') ?? '',
      row.nextAction,
      row.p1PostwriteStatus,
      row.editableTarget,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P2-A Operator Post-Entry QA',
    '',
    `- P2-A post-entry QA version: \`${P2A_POST_ENTRY_QA_VERSION}\``,
    `- upstream post-entry QA version: \`${summary.upstreamPostEntryQaVersion || 'missing'}\``,
    `- status: \`${summary.status}\``,
    `- workset: \`${summary.targetWorkset}\``,
    `- rows: ${summary.totalRows}/${summary.expectedRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- waiting for operator: ${summary.waitingForOperatorRows}`,
    `- blocked rows: ${summary.blockedRows}`,
    `- P1 postwrite status: \`${summary.p1PostwriteStatus || 'missing'}\``,
    `- ready for P2 readiness: ${summary.readyForP2Readiness}`,
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
    '## Rows',
    '',
    markdownTable(
      ['block', 'decision', 'status', 'label top-hit QA', 'blockers', 'warnings', 'actions', 'next action'],
      p2aRows.map((row) => [
        `\`${row.block}\``,
        `\`${row.decision}\``,
        `\`${row.rowStatus}\``,
        String(row.requiresLabelTopHitQa),
        row.blockers?.map((blocker) => `\`${blocker}\``).join(' ') || '-',
        row.warnings?.map((warning) => `\`${warning}\``).join(' ') || '-',
        row.actions?.map((action) => `\`${action}\``).join(' ') || '-',
        `\`${row.nextAction}\``,
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

  console.log(`p2a_operator_post_entry_qa_json:${jsonPath}`);
  console.log(`p2a_operator_post_entry_qa_csv:${csvPath}`);
  console.log(`p2a_operator_post_entry_qa_markdown:${markdownPath}`);
  console.log(`status:${summary.status} approved=${summary.approvedRows}/${summary.totalRows} blocked=${summary.blockedRows} p1Postwrite=${summary.p1PostwriteStatus || 'missing'}`);

  if (summary.status === 'blocked-after-entry') {
    process.exitCode = 1;
  }
};

const runP2aPrewriteGate = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP2OperatorDir = path.join(defaultReportDir, 'daegu-p2-operator');

  const PREWRITE_GATE_VERSION = 'DAEGU_P2A_PREWRITE_GATE_V1';
  const INPUT_PACKET_VERSION = 'DAEGU_P2A_OPERATOR_INPUT_PACKET_V1';
  const P2A_POST_ENTRY_QA_VERSION = 'DAEGU_P2A_OPERATOR_POST_ENTRY_QA_V1';
  const VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';
  const IMPORT_VERSION = 'DAEGU_P2_OPERATOR_IMPORT_V1';
  const TARGET_BATCH_ID = 'BATCH_3_P2';
  const TARGET_WORKSET = 'P2-A';
  const EXPECTED_P2A_ROWS = 2;
  const EXPECTED_BLOCK_IDS = [
    'daegu-first-infield-1-7',
    'daegu-grass-zone',
  ];
  const REQUIRED_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const CHECKS = [
    'CHECK_CORRECTED_LABEL_POINT_INSIDE_POLYGON',
    'CHECK_LABEL_POINT_SELECTS_SAME_BLOCK',
    'CHECK_HIT_PATH_DOES_NOT_CAPTURE_NEIGHBOR_BLOCK',
    'CHECK_PATH_ALIGNED_TO_OFFICIAL_PNG_SEAT_AREA',
    'CHECK_CURRENT_AND_CANDIDATE_PATHS_NOT_COPIED',
  ];
  const BLOCKERS = {
    approvedRowMissingFields: 'P2A_APPROVED_ROW_MISSING_FIELDS',
    correctedPathReusesCurrentPath: 'P2A_CORRECTED_PATH_REUSES_CURRENT_PATH',
    correctedPathReusesCandidatePath: 'P2A_CORRECTED_PATH_REUSES_CANDIDATE_PATH',
    correctedPathRequiresAtLeastSixPoints: 'P2A_CORRECTED_PATH_REQUIRES_AT_LEAST_SIX_POINTS',
    correctedPathUnsupportedCommands: 'P2A_CORRECTED_PATH_UNSUPPORTED_COMMANDS',
    correctedPathSinglePolygonRequired: 'P2A_CORRECTED_PATH_SINGLE_POLYGON_REQUIRED',
    correctedPathNotClosed: 'P2A_CORRECTED_PATH_NOT_CLOSED',
    correctedPathOutOfBounds: 'P2A_CORRECTED_PATH_OUT_OF_BOUNDS',
    correctedPathAreaTooSmall: 'P2A_CORRECTED_PATH_AREA_TOO_SMALL',
    correctedPathSelfIntersection: 'P2A_CORRECTED_PATH_SELF_INTERSECTION',
    correctedLabelXyNotNumeric: 'P2A_CORRECTED_LABEL_XY_NOT_NUMERIC',
    correctedLabelOutsidePath: 'P2A_CORRECTED_LABEL_OUTSIDE_PATH',
    correctedLabelTopHitMismatch: 'P2A_CORRECTED_LABEL_TOP_HIT_MISMATCH',
    correctedHitPathCapturesNeighborLabel: 'P2A_CORRECTED_HIT_PATH_CAPTURES_NEIGHBOR_LABEL',
    validationRowNotValidForApproval: 'P2A_VALIDATION_ROW_NOT_VALID_FOR_APPROVAL',
    p2ImportReportNotDryRun: 'P2A_IMPORT_REPORT_NOT_DRY_RUN',
    p2ImportChangedProductionData: 'P2A_IMPORT_CHANGED_PRODUCTION_DATA',
  };
  const ACTIONS = {
    fillRequiredFields: 'FILL_REQUIRED_FIELDS',
    retraceFromOfficialPng: 'RETRACE_FROM_OFFICIAL_PNG',
    moveLabelPoint: 'MOVE_LABEL_POINT',
    reviewLabelTopHit: 'REVIEW_LABEL_TOP_HIT',
    doNotCopyReferencePath: 'DO_NOT_COPY_REFERENCE_PATH',
    waitForP1Postwrite: 'WAIT_FOR_P1_POSTWRITE',
    continueP2FullReadiness: 'CONTINUE_P2_FULL_READINESS',
  };

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const hasArg = (name) => process.argv.includes(name);

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

  const isBlank = (value) => String(value ?? '').trim() === '';
  const isNumeric = (value) => !isBlank(value) && Number.isFinite(Number(value));
  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';
  const normalizePath = (value) => String(value ?? '')
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(/\s*,\s*/gu, ',')
    .toUpperCase();

  const addUnique = (items, value) => {
    if (!items.includes(value)) items.push(value);
  };

  const numberOrZero = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const pathCommands = (pathData) => String(pathData ?? '').match(/[AaCcHhLlMmQqSsTtVvZz]/g) ?? [];

  const pathPoints = (pathData) => {
    const numbers = String(pathData ?? '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/giu)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  };

  const polygonArea = (points) => Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + (point[0] * next[1]) - (next[0] * point[1]);
  }, 0) / 2);

  const distanceToSegment = (point, start, end) => {
    const segmentX = end[0] - start[0];
    const segmentY = end[1] - start[1];
    const lengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
    if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
    const ratio = Math.max(0, Math.min(1, (
      ((point[0] - start[0]) * segmentX) + ((point[1] - start[1]) * segmentY)
    ) / lengthSquared));
    return Math.hypot(
      point[0] - (start[0] + (ratio * segmentX)),
      point[1] - (start[1] + (ratio * segmentY)),
    );
  };

  const pointOnPolygonBoundary = (point, polygon, tolerance = 0.75) => {
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      if (distanceToSegment(point, start, end) <= tolerance) return true;
    }
    return false;
  };

  const pointInPolygon = (point, polygon) => {
    if (polygon.length < 3) return false;
    if (pointOnPolygonBoundary(point, polygon)) return true;

    const [x, y] = point;
    let inside = false;
    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
      const [xi, yi] = polygon[current];
      const [xj, yj] = polygon[previous];
      const intersects = ((yi > y) !== (yj > y))
        && (x < (((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON)) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  };

  const orientation = (a, b, c) => {
    const value = ((b[1] - a[1]) * (c[0] - b[0])) - ((b[0] - a[0]) * (c[1] - b[1]));
    if (Math.abs(value) < 1e-9) return 0;
    return value > 0 ? 1 : 2;
  };

  const onSegment = (a, b, c) => (
    b[0] <= Math.max(a[0], c[0])
    && b[0] >= Math.min(a[0], c[0])
    && b[1] <= Math.max(a[1], c[1])
    && b[1] >= Math.min(a[1], c[1])
  );

  const segmentsIntersect = (a, b, c, d) => {
    const o1 = orientation(a, b, c);
    const o2 = orientation(a, b, d);
    const o3 = orientation(c, d, a);
    const o4 = orientation(c, d, b);
    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && onSegment(a, c, b)) return true;
    if (o2 === 0 && onSegment(a, d, b)) return true;
    if (o3 === 0 && onSegment(c, a, d)) return true;
    if (o4 === 0 && onSegment(c, b, d)) return true;
    return false;
  };

  const hasSelfIntersection = (points) => {
    for (let first = 0; first < points.length; first += 1) {
      const firstNext = (first + 1) % points.length;
      for (let second = first + 1; second < points.length; second += 1) {
        const secondNext = (second + 1) % points.length;
        const adjacent = first === second || firstNext === second || secondNext === first;
        if (adjacent) continue;
        if (segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) return true;
      }
    }
    return false;
  };

  const geometryPaths = (block) => {
    const visualPath = block.imageGeometry.visualPath ?? block.imageGeometry.d;
    const hitPath = block.imageGeometry.hitPath ?? visualPath;
    if (hitPath === block.imageGeometry.d && block.imageGeometry.paths?.length) return block.imageGeometry.paths;
    return [hitPath];
  };

  const blockArea = (block) => geometryPaths(block)
    .map(pathPoints)
    .reduce((total, points) => total + (points.length >= 3 ? polygonArea(points) : 0), 0);

  const pointInAnyPath = (point, block) => geometryPaths(block)
    .map(pathPoints)
    .some((points) => pointInPolygon(point, points));

  const topHitBlockAt = (blocks, point) => {
    let topBlock = null;
    [...blocks].sort((a, b) => blockArea(b) - blockArea(a)).forEach((block) => {
      if (pointInAnyPath(point, block)) topBlock = block;
    });
    return topBlock;
  };

  const cloneBlockWithCorrection = (block, row) => ({
    ...block,
    imageGeometry: {
      ...block.imageGeometry,
      d: row.correctedPath,
      visualPath: row.correctedPath,
      hitPath: row.correctedPath,
      paths: undefined,
      labelX: Number(row.correctedLabelX),
      labelY: Number(row.correctedLabelY),
      labelPoint: [Number(row.correctedLabelX), Number(row.correctedLabelY)],
    },
  });

  const validatePath = (pathData) => {
    const reasons = [];
    const commands = pathCommands(pathData);
    const unsupportedCommands = commands.filter((command) => !['M', 'm', 'L', 'l', 'Z', 'z'].includes(command));
    const points = pathPoints(pathData);

    if (isBlank(pathData)) reasons.push('CORRECTED_PATH_REQUIRED');
    if (unsupportedCommands.length > 0) reasons.push(`${BLOCKERS.correctedPathUnsupportedCommands}:${[...new Set(unsupportedCommands)].join('')}`);
    if (commands.filter((command) => command.toUpperCase() === 'M').length !== 1) reasons.push(BLOCKERS.correctedPathSinglePolygonRequired);
    if (!commands.some((command) => command.toUpperCase() === 'Z')) reasons.push(BLOCKERS.correctedPathNotClosed);
    if (points.length < 6) reasons.push(`${BLOCKERS.correctedPathRequiresAtLeastSixPoints}:${points.length}:6`);
    if (points.some((point) => !point.every(Number.isFinite))) reasons.push('P2A_CORRECTED_PATH_HAS_NON_FINITE_COORDINATES');
    if (points.some(([x, y]) => x < 0 || y < 0 || x > DAEGU_SEATMAP_IMAGE.imageWidth || y > DAEGU_SEATMAP_IMAGE.imageHeight)) {
      reasons.push(BLOCKERS.correctedPathOutOfBounds);
    }
    if (points.length >= 3 && polygonArea(points) < 16) reasons.push(BLOCKERS.correctedPathAreaTooSmall);
    if (points.length >= 4 && hasSelfIntersection(points)) reasons.push(BLOCKERS.correctedPathSelfIntersection);

    return {
      valid: reasons.length === 0,
      reasons,
      points,
      area: points.length >= 3 ? polygonArea(points) : 0,
    };
  };

  const requiredFieldBlockers = (row) => {
    const missing = [];
    if (normalizeDecision(row.operatorDecision) !== 'APPROVED') missing.push('operatorDecision=APPROVED');
    if (isBlank(row.correctedPath)) missing.push('correctedPath');
    if (!isNumeric(row.correctedLabelX) || !isNumeric(row.correctedLabelY)) missing.push('correctedLabelX/Y');
    if (isBlank(row.reviewer)) missing.push('reviewer');
    if (isBlank(row.reviewedAt)) missing.push('reviewedAt');
    if (isBlank(row.operatorNote)) missing.push('operatorNote');
    return missing;
  };

  const labelPointForBlock = (block) => block.imageGeometry.labelPoint
    ?? [block.imageGeometry.labelX, block.imageGeometry.labelY];

  const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));
  const inputPath = path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-input.json');
  const inputPacketPath = path.join(p2OperatorDir, 'daegu-seatmap-p2a-operator-input-packet.json');
  const postEntryQaPath = path.join(p2OperatorDir, 'daegu-seatmap-p2a-operator-post-entry-qa.json');
  const validationPath = path.join(p2OperatorDir, 'daegu-seatmap-operator-corrections-validation.json');
  const importPath = path.join(reportDir, 'daegu-seatmap-p2-operator-import.json');
  const p1PostwriteGatePath = path.join(
    reportDir,
    'daegu-p1-operator/daegu-seatmap-p1-boundary-first-postwrite-gate.json',
  );

  const reports = {
    input: await readJsonReport(inputPath),
    inputPacket: await readJsonReport(inputPacketPath),
    postEntryQa: await readJsonReport(postEntryQaPath),
    validation: await readJsonReport(validationPath),
    import: await readJsonReport(importPath),
  };
  const p1PostwriteGateReport = await readJsonReport(p1PostwriteGatePath);

  const structuralBlockers = [];
  Object.values(reports).forEach((report) => {
    if (!report.exists) structuralBlockers.push(`MISSING_REPORT:${report.relativePath}`);
  });

  const input = reports.input.data ?? {};
  const inputPacketSummary = reports.inputPacket.data?.summary ?? {};
  const postEntryQaSummary = reports.postEntryQa.data?.summary ?? {};
  const validationSummary = reports.validation.data?.summary ?? {};
  const importSummary = reports.import.data?.summary ?? {};
  const p1PostwriteGateSummary = p1PostwriteGateReport.data?.summary ?? {};

  if (reports.input.exists && input.targetBatchId !== TARGET_BATCH_ID) structuralBlockers.push(`P2_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  if (reports.input.exists && input.productionWriteAllowed !== false) structuralBlockers.push('P2_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (reports.inputPacket.exists && inputPacketSummary.inputPacketVersion !== INPUT_PACKET_VERSION) {
    structuralBlockers.push(`P2A_INPUT_PACKET_VERSION_MISMATCH:${inputPacketSummary.inputPacketVersion ?? ''}`);
  }
  if (reports.inputPacket.exists && inputPacketSummary.targetWorkset !== TARGET_WORKSET) {
    structuralBlockers.push(`P2A_INPUT_PACKET_WORKSET_MISMATCH:${inputPacketSummary.targetWorkset ?? ''}`);
  }
  if (reports.postEntryQa.exists && postEntryQaSummary.p2aPostEntryQaVersion !== P2A_POST_ENTRY_QA_VERSION) {
    structuralBlockers.push(`P2A_POST_ENTRY_QA_VERSION_MISMATCH:${postEntryQaSummary.p2aPostEntryQaVersion ?? ''}`);
  }
  if (reports.validation.exists && validationSummary.validationVersion !== VALIDATION_VERSION) {
    structuralBlockers.push(`VALIDATION_VERSION_MISMATCH:${validationSummary.validationVersion ?? ''}`);
  }
  if (reports.import.exists && importSummary.importVersion !== IMPORT_VERSION) {
    structuralBlockers.push(`P2_IMPORT_VERSION_MISMATCH:${importSummary.importVersion ?? ''}`);
  }
  if (reports.import.exists && importSummary.mode !== 'dry-run') {
    structuralBlockers.push(`${BLOCKERS.p2ImportReportNotDryRun}:${importSummary.mode ?? ''}`);
  }
  if (reports.import.exists && importSummary.productionDataChanged === true) {
    structuralBlockers.push(BLOCKERS.p2ImportChangedProductionData);
  }

  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const packetRows = Array.isArray(reports.inputPacket.data?.rows) ? reports.inputPacket.data.rows : [];
  const qaRows = Array.isArray(reports.postEntryQa.data?.rows) ? reports.postEntryQa.data.rows : [];
  const validationRows = Array.isArray(reports.validation.data?.rows) ? reports.validation.data.rows : [];

  const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
  const packetByBlockId = new Map(packetRows.map((row) => [row.blockId, row]));
  const qaByBlockId = new Map(qaRows.map((row) => [row.blockId, row]));
  const validationByBlockId = new Map(validationRows.map((row) => [row.blockId, row]));
  const blockById = new Map(DAEGU_BLOCKS.map((block) => [block.id, block]));

  const packetBlockIds = packetRows.map((row) => row.blockId).filter(Boolean);
  const expectedBlockIds = packetBlockIds.length === EXPECTED_P2A_ROWS ? packetBlockIds : EXPECTED_BLOCK_IDS;
  if (expectedBlockIds.length !== EXPECTED_P2A_ROWS) {
    structuralBlockers.push(`P2A_EXPECTED_BLOCK_COUNT_MISMATCH:${expectedBlockIds.length}:${EXPECTED_P2A_ROWS}`);
  }
  for (const blockId of EXPECTED_BLOCK_IDS) {
    if (!expectedBlockIds.includes(blockId)) structuralBlockers.push(`P2A_EXPECTED_BLOCK_MISSING:${blockId}`);
  }

  const approvedCorrectionsByBlockId = new Map(
    expectedBlockIds
      .map((blockId) => inputByBlockId.get(blockId))
      .filter((row) => row && normalizeDecision(row.operatorDecision) === 'APPROVED')
      .map((row) => [row.blockId, row]),
  );
  const simulationBlocks = DAEGU_BLOCKS.map((block) => {
    const correction = approvedCorrectionsByBlockId.get(block.id);
    return correction ? cloneBlockWithCorrection(block, correction) : block;
  });

  const rows = expectedBlockIds.map((blockId) => {
    const inputRow = inputByBlockId.get(blockId) ?? {};
    const packetRow = packetByBlockId.get(blockId) ?? {};
    const qaRow = qaByBlockId.get(blockId) ?? {};
    const validationRow = validationByBlockId.get(blockId) ?? {};
    const block = blockById.get(blockId);
    const decision = normalizeDecision(inputRow.operatorDecision ?? qaRow.decision);
    const approved = decision === 'APPROVED';
    const blockers = [];
    const warnings = [];
    const actions = [];
    const missingFields = requiredFieldBlockers(inputRow);
    const currentPath = inputRow.currentPath ?? packetRow.currentPath ?? block?.imageGeometry.d ?? '';
    const candidatePath = inputRow.candidatePath ?? packetRow.candidatePath ?? '';
    const correctedPath = String(inputRow.correctedPath ?? '').trim();
    const correctedLabelX = inputRow.correctedLabelX;
    const correctedLabelY = inputRow.correctedLabelY;
    let pathValidation = { valid: false, reasons: [], points: [], area: 0 };
    let labelInsideCorrectedPath = null;
    let correctedLabelTopHitBlockId = '';
    let correctedLabelTopHitOk = null;
    let capturedNeighborLabels = [];

    if (!inputRow.blockId) blockers.push('P2A_SOURCE_INPUT_ROW_MISSING');
    if (!packetRow.blockId) blockers.push('P2A_INPUT_PACKET_ROW_MISSING');
    if (!qaRow.blockId) blockers.push('P2A_POST_ENTRY_QA_ROW_MISSING');
    if (!validationRow.blockId && approved) blockers.push('P2A_VALIDATION_ROW_MISSING');

    if (approved) {
      if (missingFields.length > 0) {
        blockers.push(`${BLOCKERS.approvedRowMissingFields}:${missingFields.join('+')}`);
        addUnique(actions, ACTIONS.fillRequiredFields);
      }
      if (!isBlank(inputRow.reviewedAt) && Number.isNaN(Date.parse(inputRow.reviewedAt))) {
        blockers.push('P2A_REVIEWED_AT_NOT_PARSEABLE');
        addUnique(actions, ACTIONS.fillRequiredFields);
      }
      if (!isBlank(correctedPath) && normalizePath(correctedPath) === normalizePath(currentPath)) {
        blockers.push(BLOCKERS.correctedPathReusesCurrentPath);
        addUnique(actions, ACTIONS.doNotCopyReferencePath);
        addUnique(actions, ACTIONS.retraceFromOfficialPng);
      }
      if (!isBlank(correctedPath) && normalizePath(correctedPath) === normalizePath(candidatePath)) {
        blockers.push(BLOCKERS.correctedPathReusesCandidatePath);
        addUnique(actions, ACTIONS.doNotCopyReferencePath);
        addUnique(actions, ACTIONS.retraceFromOfficialPng);
      }

      pathValidation = validatePath(correctedPath);
      blockers.push(...pathValidation.reasons);
      if (pathValidation.reasons.length > 0) addUnique(actions, ACTIONS.retraceFromOfficialPng);

      if (!isNumeric(correctedLabelX) || !isNumeric(correctedLabelY)) {
        blockers.push(BLOCKERS.correctedLabelXyNotNumeric);
        addUnique(actions, ACTIONS.moveLabelPoint);
      }

      if (pathValidation.points.length >= 3 && isNumeric(correctedLabelX) && isNumeric(correctedLabelY)) {
        const labelPoint = [Number(correctedLabelX), Number(correctedLabelY)];
        labelInsideCorrectedPath = pointInPolygon(labelPoint, pathValidation.points);
        if (!labelInsideCorrectedPath) {
          blockers.push(BLOCKERS.correctedLabelOutsidePath);
          addUnique(actions, ACTIONS.moveLabelPoint);
        }

        const topHit = topHitBlockAt(simulationBlocks, labelPoint);
        correctedLabelTopHitBlockId = topHit?.id ?? '';
        correctedLabelTopHitOk = topHit?.id === blockId;
        if (!correctedLabelTopHitOk) {
          blockers.push(`${BLOCKERS.correctedLabelTopHitMismatch}:${correctedLabelTopHitBlockId || 'none'}`);
          addUnique(actions, ACTIONS.reviewLabelTopHit);
        }

        capturedNeighborLabels = DAEGU_BLOCKS
          .filter((peer) => peer.id !== blockId && isDaeguNormalSelectableSeat(peer))
          .filter((peer) => pointInPolygon(labelPointForBlock(peer), pathValidation.points))
          .map((peer) => peer.block || peer.id);
        if (capturedNeighborLabels.length > 0) {
          blockers.push(`${BLOCKERS.correctedHitPathCapturesNeighborLabel}:${capturedNeighborLabels.join('+')}`);
          addUnique(actions, ACTIONS.reviewLabelTopHit);
        }
      }

      if (validationRow.validForApproval !== true) {
        blockers.push(`${BLOCKERS.validationRowNotValidForApproval}:${(validationRow.reasons ?? []).join('+') || 'missing'}`);
        addUnique(actions, ACTIONS.reviewLabelTopHit);
      }
    } else {
      addUnique(actions, ACTIONS.fillRequiredFields);
    }

    return {
      prewriteGateVersion: PREWRITE_GATE_VERSION,
      workset: TARGET_WORKSET,
      block: inputRow.block ?? packetRow.block ?? qaRow.block ?? block?.block ?? '',
      blockId,
      name: inputRow.name ?? packetRow.name ?? block?.name ?? '',
      decision,
      approved,
      status: blockers.length > 0
        ? 'blocked'
        : approved
          ? 'approved-prewrite-check-passed'
          : 'waiting-for-operator-entry',
      requiredFields: REQUIRED_FIELDS,
      checks: CHECKS,
      missingFields,
      blockers,
      warnings,
      actions,
      currentPath,
      candidatePath,
      correctedPath,
      correctedPathPointCount: pathValidation.points.length,
      correctedPathArea: pathValidation.area,
      correctedLabelX: correctedLabelX ?? '',
      correctedLabelY: correctedLabelY ?? '',
      labelInsideCorrectedPath,
      correctedLabelTopHitBlockId,
      correctedLabelTopHitOk,
      capturedNeighborLabels,
      validationReasons: validationRow.reasons ?? [],
      validationWarnings: validationRow.warnings ?? [],
      validationValidForApproval: validationRow.validForApproval === true,
      reviewer: inputRow.reviewer ?? '',
      reviewedAt: inputRow.reviewedAt ?? '',
      operatorNote: inputRow.operatorNote ?? '',
      editableTarget: packetRow.editableTarget ?? qaRow.editableTarget ?? '',
      evidenceCrop: packetRow.evidenceCrop ?? qaRow.evidenceCrop ?? inputRow.evidenceCrop ?? '',
      tracingSvg: packetRow.tracingSvg ?? qaRow.tracingSvg ?? '',
    };
  });

  if (rows.length !== EXPECTED_P2A_ROWS) {
    structuralBlockers.push(`P2A_ROW_COUNT_MISMATCH:${rows.length}:${EXPECTED_P2A_ROWS}`);
  }

  const approvedRows = rows.filter((row) => row.approved);
  const waitingRows = rows.filter((row) => !row.approved);
  const rowBlockers = rows.flatMap((row) => row.blockers.map((blocker) => `${row.block || row.blockId}:${blocker}`));
  const allBlockers = [...structuralBlockers, ...rowBlockers];
  const p1PostwriteStatus = p1PostwriteGateSummary.status
    ?? postEntryQaSummary.p1PostwriteStatus
    ?? inputPacketSummary.p1PostwriteStatus
    ?? '';
  const p1PostwriteVerified = p1PostwriteStatus === 'postwrite-verified';
  const status = allBlockers.length > 0
    ? 'blocked'
    : approvedRows.length < EXPECTED_P2A_ROWS
      ? 'waiting-for-operator-entry'
      : !p1PostwriteVerified
        ? 'waiting-for-p1-postwrite'
        : 'ready-for-p2-readiness';
  const readyForP2Readiness = status === 'ready-for-p2-readiness';

  if (approvedRows.length === EXPECTED_P2A_ROWS && !p1PostwriteVerified) {
    rows.forEach((row) => {
      if (row.approved) addUnique(row.actions, ACTIONS.waitForP1Postwrite);
    });
  }
  if (readyForP2Readiness) {
    rows.forEach((row) => {
      if (row.approved) addUnique(row.actions, ACTIONS.continueP2FullReadiness);
    });
  }

  const summary = {
    prewriteGateVersion: PREWRITE_GATE_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    targetWorkset: TARGET_WORKSET,
    expectedRows: EXPECTED_P2A_ROWS,
    totalRows: rows.length,
    approvedRows: approvedRows.length,
    waitingForOperatorRows: waitingRows.length,
    blockedRows: rows.filter((row) => row.blockers.length > 0).length,
    readyForP2Readiness,
    readyForProductionWrite: false,
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesSourceInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    p1PostwriteStatus,
    p1PostwriteVerified,
    validationStatus: validationSummary.status ?? '',
    validationApprovedRows: numberOrZero(validationSummary.approvedRows),
    validationValidApprovedRows: numberOrZero(validationSummary.validApprovedRows),
    importStatus: importSummary.status ?? '',
    importMode: importSummary.mode ?? '',
    importApprovedRows: numberOrZero(importSummary.approvedRows),
    importProductionDataChanged: importSummary.productionDataChanged === true,
    requiredFields: REQUIRED_FIELDS,
    checks: CHECKS,
    blockers: allBlockers,
    warnings: [
      ...new Set([
        ...rows.flatMap((row) => row.warnings),
        ...(approvedRows.length === 0 ? ['NO_APPROVED_P2A_ROWS_PREWRITE_BLOCKED'] : []),
      ]),
    ],
    actions: [...new Set(rows.flatMap((row) => row.actions))],
    sourceInput: path.relative(frontendRoot, inputPath),
    sourceInputPacket: path.relative(frontendRoot, inputPacketPath),
    sourcePostEntryQa: path.relative(frontendRoot, postEntryQaPath),
    sourceValidation: path.relative(frontendRoot, validationPath),
    sourceImportDryRun: path.relative(frontendRoot, importPath),
    sourceP1PostwriteGate: path.relative(frontendRoot, p1PostwriteGatePath),
    sourceP1PostwriteGateExists: p1PostwriteGateReport.exists,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    actionCatalog: ACTIONS,
    blockerCatalog: BLOCKERS,
    safetyContract: [
      'This P2-A prewrite gate is read-only.',
      'It validates only the two P2-A label/hit rows before they can advance to full P2 readiness.',
      'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, reviewedAt, or operatorNote.',
      'It never writes source input or the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'currentPath and candidatePath are reference-only and must not be copied into correctedPath.',
      'P2-A prewrite readiness never bypasses the full P2 readiness gate or production write guard.',
      'P2 production write waits for P1 boundary-first postwrite verification.',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p2a-prewrite-gate.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p2a-prewrite-gate.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p2a-prewrite-gate.md');
  const svgPath = path.join(outputDir, 'daegu-seatmap-p2a-prewrite-preview.svg');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'workset',
      'block',
      'blockId',
      'decision',
      'status',
      'missingFields',
      'blockers',
      'actions',
      'correctedPathPointCount',
      'labelInsideCorrectedPath',
      'correctedLabelTopHitBlockId',
      'correctedLabelTopHitOk',
      'capturedNeighborLabels',
      'validationValidForApproval',
      'p1PostwriteStatus',
    ],
    ...rows.map((row) => [
      row.workset,
      row.block,
      row.blockId,
      row.decision,
      row.status,
      row.missingFields.join(' '),
      row.blockers.join(' '),
      row.actions.join(' '),
      row.correctedPathPointCount,
      row.labelInsideCorrectedPath,
      row.correctedLabelTopHitBlockId,
      row.correctedLabelTopHitOk,
      row.capturedNeighborLabels.join(' '),
      row.validationValidForApproval,
      summary.p1PostwriteStatus,
    ]),
  ]);

  const imageHref = path.relative(outputDir, path.join(frontendRoot, DAEGU_SEATMAP_IMAGE.imagePath));
  const approvedPreviewRows = rows.filter((row) => row.approved);
  const previewSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${DAEGU_SEATMAP_IMAGE.imageWidth}" height="${DAEGU_SEATMAP_IMAGE.imageHeight}" viewBox="0 0 ${DAEGU_SEATMAP_IMAGE.imageWidth} ${DAEGU_SEATMAP_IMAGE.imageHeight}">`,
    '  <style>',
    '    .current { fill: #ef4444; fill-opacity: 0.10; stroke: #dc2626; stroke-width: 3; vector-effect: non-scaling-stroke; }',
    '    .candidate { fill: #f97316; fill-opacity: 0.10; stroke: #f97316; stroke-width: 3; stroke-dasharray: 9 5; vector-effect: non-scaling-stroke; }',
    '    .corrected { fill: #22c55e; fill-opacity: 0.18; stroke: #16a34a; stroke-width: 3; vector-effect: non-scaling-stroke; }',
    '    .blocked { fill: #f59e0b; fill-opacity: 0.22; stroke: #d97706; stroke-width: 4; vector-effect: non-scaling-stroke; }',
    '    .label { font: 900 16px Arial, sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 4; paint-order: stroke; text-anchor: middle; dominant-baseline: central; }',
    '    .note { font: 900 28px Arial, sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 6; paint-order: stroke; }',
    '  </style>',
    `  <image href="${xmlEscape(imageHref)}" x="0" y="0" width="${DAEGU_SEATMAP_IMAGE.imageWidth}" height="${DAEGU_SEATMAP_IMAGE.imageHeight}" preserveAspectRatio="none" />`,
    approvedPreviewRows.length === 0
      ? `  <text class="note" x="80" y="100">P2-A waiting for operator-approved corrected paths</text>`
      : '',
    ...approvedPreviewRows.flatMap((row) => [
      row.currentPath ? `  <path class="current" d="${xmlEscape(row.currentPath)}" />` : '',
      row.candidatePath ? `  <path class="candidate" d="${xmlEscape(row.candidatePath)}" />` : '',
      row.correctedPath ? `  <path class="${row.blockers.length > 0 ? 'blocked' : 'corrected'}" d="${xmlEscape(row.correctedPath)}" />` : '',
      isNumeric(row.correctedLabelX) && isNumeric(row.correctedLabelY)
        ? `  <circle cx="${Number(row.correctedLabelX)}" cy="${Number(row.correctedLabelY)}" r="6" fill="#16a34a" stroke="#fff" stroke-width="3" />`
        : '',
      isNumeric(row.correctedLabelX) && isNumeric(row.correctedLabelY)
        ? `  <text class="label" x="${Number(row.correctedLabelX)}" y="${Number(row.correctedLabelY) - 18}">${xmlEscape(row.block)}</text>`
        : '',
    ]),
    '</svg>',
  ].filter(Boolean).join('\n');

  await fs.writeFile(svgPath, `${previewSvg}\n`, 'utf8');

  await fs.writeFile(markdownPath, [
    '# Daegu P2-A Prewrite Gate',
    '',
    `- prewrite gate version: \`${PREWRITE_GATE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- workset: \`${summary.targetWorkset}\``,
    `- rows: ${summary.totalRows}/${summary.expectedRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- blocked rows: ${summary.blockedRows}`,
    `- P1 postwrite status: \`${summary.p1PostwriteStatus || 'missing'}\``,
    `- ready for P2 readiness: ${summary.readyForP2Readiness}`,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- preview SVG: \`${path.relative(frontendRoot, svgPath)}\``,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Required Fields',
    '',
    ...REQUIRED_FIELDS.map((field) => `- \`${field}\``),
    '',
    '## Checks',
    '',
    ...CHECKS.map((check) => `- \`${check}\``),
    '',
    '## Rows',
    '',
    markdownTable(
      ['block', 'decision', 'status', 'missing', 'label inside', 'top hit', 'captures neighbor', 'blockers', 'actions'],
      rows.map((row) => [
        `\`${row.block}\``,
        `\`${row.decision}\``,
        `\`${row.status}\``,
        row.missingFields.map((field) => `\`${field}\``).join(' ') || '-',
        String(row.labelInsideCorrectedPath),
        row.correctedLabelTopHitBlockId ? `\`${row.correctedLabelTopHitBlockId}\`` : '-',
        row.capturedNeighborLabels.map((label) => `\`${label}\``).join(' ') || '-',
        row.blockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
        row.actions.map((action) => `\`${action}\``).join(' ') || '-',
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

  console.log(`p2a_prewrite_gate_json:${jsonPath}`);
  console.log(`p2a_prewrite_gate_csv:${csvPath}`);
  console.log(`p2a_prewrite_gate_markdown:${markdownPath}`);
  console.log(`p2a_prewrite_preview_svg:${svgPath}`);
  console.log(`status:${summary.status} readyForP2Readiness=${summary.readyForP2Readiness} approved=${summary.approvedRows}/${summary.totalRows} blockers=${summary.blockers.length} p1Postwrite=${summary.p1PostwriteStatus || 'missing'}`);

  if (summary.status === 'blocked' || (!hasArg('--allow-waiting-exit-zero') && !summary.readyForP2Readiness)) {
    process.exitCode = 1;
  }
};

const runP2aReadinessV3 = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP2OperatorDir = path.join(defaultReportDir, 'daegu-p2-operator');

  const READINESS_VERSION = 'DAEGU_P2A_READINESS_V3';
  const P2A_POST_ENTRY_QA_VERSION = 'DAEGU_P2A_OPERATOR_POST_ENTRY_QA_V1';
  const INPUT_PACKET_VERSION = 'DAEGU_P2A_OPERATOR_INPUT_PACKET_V1';
  const PREWRITE_GATE_VERSION = 'DAEGU_P2A_PREWRITE_GATE_V1';
  const P2_READINESS_VERSION = 'DAEGU_P2_OPERATOR_READINESS_V2';
  const RENDER_SAFETY_VERSION = 'DAEGU_SEATMAP_RENDER_SAFETY_AUDIT_V1';
  const TARGET_WORKSET = 'P2-A';
  const EXPECTED_P2A_ROWS = 2;

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
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

  const numberOrZero = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));

  const paths = {
    postEntryQa: path.join(p2OperatorDir, 'daegu-seatmap-p2a-operator-post-entry-qa.json'),
    inputPacket: path.join(p2OperatorDir, 'daegu-seatmap-p2a-operator-input-packet.json'),
    prewriteGate: path.join(p2OperatorDir, 'daegu-seatmap-p2a-prewrite-gate.json'),
    p2Readiness: path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-readiness.json'),
    renderSafety: path.join(reportDir, 'daegu-seatmap-render-safety-audit.json'),
  };

  const reports = {
    postEntryQa: await readJsonReport(paths.postEntryQa),
    inputPacket: await readJsonReport(paths.inputPacket),
    prewriteGate: await readJsonReport(paths.prewriteGate),
    p2Readiness: await readJsonReport(paths.p2Readiness),
    renderSafety: await readJsonReport(paths.renderSafety),
  };

  const postEntrySummary = reports.postEntryQa.data?.summary ?? {};
  const inputPacketSummary = reports.inputPacket.data?.summary ?? {};
  const prewriteSummary = reports.prewriteGate.data?.summary ?? {};
  const p2ReadinessSummary = reports.p2Readiness.data?.summary ?? {};
  const renderSafetySummary = reports.renderSafety.data?.summary ?? {};
  const blockers = [];
  const waitingReasons = [];
  const warnings = [];

  Object.entries(reports).forEach(([key, report]) => {
    if (!report.exists && key === 'p2Readiness') {
      waitingReasons.push(`P2A_WAITING_FULL_P2_READINESS_REPORT:${report.relativePath}`);
      return;
    }
    if (!report.exists) blockers.push(`MISSING_REPORT:${report.relativePath}`);
  });

  if (reports.postEntryQa.exists && postEntrySummary.p2aPostEntryQaVersion !== P2A_POST_ENTRY_QA_VERSION) {
    blockers.push(`P2A_POST_ENTRY_QA_VERSION_MISMATCH:${postEntrySummary.p2aPostEntryQaVersion ?? ''}`);
  }
  if (reports.inputPacket.exists && inputPacketSummary.inputPacketVersion !== INPUT_PACKET_VERSION) {
    blockers.push(`P2A_INPUT_PACKET_VERSION_MISMATCH:${inputPacketSummary.inputPacketVersion ?? ''}`);
  }
  if (reports.prewriteGate.exists && prewriteSummary.prewriteGateVersion !== PREWRITE_GATE_VERSION) {
    blockers.push(`P2A_PREWRITE_GATE_VERSION_MISMATCH:${prewriteSummary.prewriteGateVersion ?? ''}`);
  }
  if (reports.p2Readiness.exists && p2ReadinessSummary.readinessVersion !== P2_READINESS_VERSION) {
    blockers.push(`P2_READINESS_VERSION_MISMATCH:${p2ReadinessSummary.readinessVersion ?? ''}`);
  }
  if (reports.renderSafety.exists && reports.renderSafety.data?.auditVersion !== RENDER_SAFETY_VERSION) {
    blockers.push(`RENDER_SAFETY_VERSION_MISMATCH:${reports.renderSafety.data?.auditVersion ?? ''}`);
  }
  if (inputPacketSummary.targetWorkset && inputPacketSummary.targetWorkset !== TARGET_WORKSET) {
    blockers.push(`P2A_INPUT_PACKET_WORKSET_MISMATCH:${inputPacketSummary.targetWorkset}`);
  }
  if (prewriteSummary.targetWorkset && prewriteSummary.targetWorkset !== TARGET_WORKSET) {
    blockers.push(`P2A_PREWRITE_GATE_WORKSET_MISMATCH:${prewriteSummary.targetWorkset}`);
  }
  if (numberOrZero(prewriteSummary.totalRows) !== EXPECTED_P2A_ROWS) {
    blockers.push(`P2A_PREWRITE_ROW_COUNT_MISMATCH:${prewriteSummary.totalRows ?? ''}:${EXPECTED_P2A_ROWS}`);
  }
  if (numberOrZero(inputPacketSummary.totalRows) !== EXPECTED_P2A_ROWS) {
    blockers.push(`P2A_INPUT_PACKET_ROW_COUNT_MISMATCH:${inputPacketSummary.totalRows ?? ''}:${EXPECTED_P2A_ROWS}`);
  }
  if (Array.isArray(prewriteSummary.blockers) && prewriteSummary.blockers.length > 0) {
    blockers.push(...prewriteSummary.blockers.map((blocker) => `PREWRITE_GATE_BLOCKER:${blocker}`));
  }
  if (postEntrySummary.status === 'blocked-after-entry') blockers.push('P2A_POST_ENTRY_QA_BLOCKED_AFTER_ENTRY');
  if (prewriteSummary.status === 'blocked') blockers.push('P2A_PREWRITE_GATE_BLOCKED');
  if (reports.renderSafety.data?.passLevel !== 'PASS_UI_CONTAINMENT') {
    blockers.push(`RENDER_SAFETY_NOT_UI_CONTAINED:${reports.renderSafety.data?.passLevel ?? ''}`);
  }
  if (renderSafetySummary.sourceContracts?.normalLayerUsesSelectablePredicate === false) {
    blockers.push('RENDER_SAFETY_NORMAL_LAYER_SELECTABLE_PREDICATE_MISSING');
  }
  if (Array.isArray(renderSafetySummary.hardBlockers) && renderSafetySummary.hardBlockers.length > 0) {
    blockers.push(...renderSafetySummary.hardBlockers.map((blocker) => `RENDER_SAFETY_HARD_BLOCKER:${blocker}`));
  }

  if (numberOrZero(prewriteSummary.approvedRows) < EXPECTED_P2A_ROWS) {
    waitingReasons.push(`P2A_WAITING_OPERATOR_ENTRY:${numberOrZero(prewriteSummary.approvedRows)}/${EXPECTED_P2A_ROWS}`);
  }
  if (prewriteSummary.approvedRows === EXPECTED_P2A_ROWS && prewriteSummary.p1PostwriteVerified !== true) {
    waitingReasons.push(`P2A_WAITING_P1_POSTWRITE:${prewriteSummary.p1PostwriteStatus || 'missing'}`);
  }
  if (prewriteSummary.readyForP2Readiness === true && p2ReadinessSummary.readyForTemplateImport !== true) {
    waitingReasons.push(`P2A_WAITING_FULL_P2_READINESS:${p2ReadinessSummary.status || 'missing'}`);
  }
  if (p2ReadinessSummary.status === 'blocked') {
    warnings.push('FULL_P2_READINESS_CURRENTLY_BLOCKED');
  }
  if (prewriteSummary.readyForProductionWrite === false) {
    warnings.push('P2A_NEVER_ALLOWS_DIRECT_PRODUCTION_WRITE');
  }

  const ready = blockers.length === 0
    && waitingReasons.length === 0
    && prewriteSummary.readyForP2Readiness === true
    && p2ReadinessSummary.readyForTemplateImport === true;
  const status = blockers.length > 0
    ? 'blocked'
    : ready
      ? 'ready'
      : 'waiting';

  const summary = {
    readinessVersion: READINESS_VERSION,
    status,
    targetWorkset: TARGET_WORKSET,
    expectedRows: EXPECTED_P2A_ROWS,
    approvedRows: numberOrZero(prewriteSummary.approvedRows),
    readyForP2Readiness: prewriteSummary.readyForP2Readiness === true,
    readyForFullP2TemplateImport: p2ReadinessSummary.readyForTemplateImport === true,
    readyForProductionWrite: false,
    productionWriteAllowed: false,
    p1PostwriteStatus: prewriteSummary.p1PostwriteStatus ?? '',
    p1PostwriteVerified: prewriteSummary.p1PostwriteVerified === true,
    postEntryQaStatus: postEntrySummary.status ?? '',
    inputPacketStatus: inputPacketSummary.status ?? '',
    prewriteGateStatus: prewriteSummary.status ?? '',
    p2ReadinessStatus: p2ReadinessSummary.status ?? '',
    renderSafetyPassLevel: reports.renderSafety.data?.passLevel ?? '',
    normalSelectable: numberOrZero(renderSafetySummary.normalSelectableSeats),
    reviewOnly: numberOrZero(renderSafetySummary.reviewOnlySeats),
    blockers,
    waitingReasons: [...new Set(waitingReasons)],
    warnings: [...new Set(warnings)],
    sourceReports: Object.fromEntries(
      Object.entries(reports).map(([key, report]) => [
        key,
        {
          path: report.relativePath,
          exists: report.exists,
          error: report.error,
        },
      ]),
    ),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'This P2-A readiness V3 report is read-only.',
      'It combines P2-A post-entry QA, input packet, prewrite gate, full P2 readiness, and render-safety audit state.',
      'It never writes source input, corrections template, or src/data/daeguSeatData.ts.',
      'P2-A readiness can only advance to full P2 readiness; it never allows direct production write.',
      'The normal UI must remain PASS_UI_CONTAINMENT while P2-A is waiting for operator approval.',
    ],
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p2a-readiness-v3.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p2a-readiness-v3.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p2a-readiness-v3.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    ['metric', 'value'],
    ['readinessVersion', summary.readinessVersion],
    ['status', summary.status],
    ['approvedRows', summary.approvedRows],
    ['readyForP2Readiness', summary.readyForP2Readiness],
    ['readyForFullP2TemplateImport', summary.readyForFullP2TemplateImport],
    ['readyForProductionWrite', summary.readyForProductionWrite],
    ['p1PostwriteStatus', summary.p1PostwriteStatus],
    ['renderSafetyPassLevel', summary.renderSafetyPassLevel],
    ['normalSelectable', summary.normalSelectable],
    ['reviewOnly', summary.reviewOnly],
    ['blockers', summary.blockers.join(' ')],
    ['waitingReasons', summary.waitingReasons.join(' ')],
    ['warnings', summary.warnings.join(' ')],
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P2-A Readiness V3',
    '',
    `- readiness version: \`${READINESS_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- approved rows: ${summary.approvedRows}/${summary.expectedRows}`,
    `- ready for P2 readiness: ${summary.readyForP2Readiness}`,
    `- full P2 template import ready: ${summary.readyForFullP2TemplateImport}`,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- P1 postwrite status: \`${summary.p1PostwriteStatus || 'missing'}\``,
    `- render safety pass level: \`${summary.renderSafetyPassLevel || 'missing'}\``,
    `- normal selectable: ${summary.normalSelectable}`,
    `- review only: ${summary.reviewOnly}`,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Source Reports',
    '',
    markdownTable(
      ['report', 'path', 'exists'],
      Object.entries(summary.sourceReports).map(([name, sourceReport]) => [
        `\`${name}\``,
        `\`${sourceReport.path}\``,
        String(sourceReport.exists),
      ]),
    ),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Waiting Reasons',
    '',
    summary.waitingReasons.length > 0 ? summary.waitingReasons.map((reason) => `- \`${reason}\``).join('\n') : 'No waiting reasons.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p2a_readiness_v3_json:${jsonPath}`);
  console.log(`p2a_readiness_v3_csv:${csvPath}`);
  console.log(`p2a_readiness_v3_markdown:${markdownPath}`);
  console.log(`status:${summary.status} approved=${summary.approvedRows}/${summary.expectedRows} readyForP2Readiness=${summary.readyForP2Readiness} renderSafety=${summary.renderSafetyPassLevel || 'missing'} blockers=${summary.blockers.length} waiting=${summary.waitingReasons.length}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const TASKS = {
  "p2a-operator-input-packet": runP2aOperatorInputPacket,
  "p2a-operator-post-entry-qa": runP2aOperatorPostEntryQa,
  "p2a-prewrite-gate": runP2aPrewriteGate,
  "p2a-readiness-v3": runP2aReadinessV3,
};

export const runDaeguP2aOperatorTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Daegu p2a operator task: ${task}. Available tasks: ${available}`);
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
  await runDaeguP2aOperatorTask(task, args);
}
