import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  DAEGU_BLOCKS,
  DAEGU_SEATMAP_IMAGE,
  isDaeguNormalSelectableSeat,
} from '../src/data/daeguSeatData.ts';

const runP1BoundaryFirstDraftApprovalDryRun = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultSourceP1Dir = path.join(defaultReportDir, 'daegu-p1-operator');
  const defaultFixtureDir = path.join(defaultReportDir, 'daegu-p1-boundary-first-draft-approval-dry-run');

  const DRY_RUN_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_DRAFT_APPROVAL_DRY_RUN_V1';
  const DRAFT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_IMAGE_COORDINATE_DRAFT_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const REVIEWER = 'P1_BOUNDARY_FIRST_DRAFT_APPROVAL_DRY_RUN';
  const REVIEWED_AT = '2026-05-15T00:00:00.000Z';
  const EXPECTED_BLOCK_IDS = [
    'daegu-first-table-t1-1',
    'daegu-third-table-t3-2',
    'daegu-central-table-v-v1',
    'daegu-central-table-v-v2',
    'daegu-central-table-v-v3',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, data) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    await fs.writeFile(filePath, `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const runNodeScript = (scriptPath, args) => new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', scriptPath, ...args],
      {
        cwd: frontendRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (exitCode) => {
      resolve({
        script: path.relative(frontendRoot, scriptPath),
        args,
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });

  const fixtureDir = path.resolve(frontendRoot, argValue('--fixture-dir', defaultFixtureDir));
  const sourceP1Dir = path.resolve(frontendRoot, argValue('--source-p1-dir', defaultSourceP1Dir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', fixtureDir));
  const sourceTemplatePath = path.join(sourceP1Dir, 'daegu-seatmap-p1-boundary-first-operator-template.json');
  const sourceInputPath = path.join(sourceP1Dir, 'daegu-seatmap-p1-operator-input.json');
  const sourceBoundaryAidPath = path.join(sourceP1Dir, 'daegu-seatmap-p1-boundary-input-aid.json');
  const draftPath = path.join(
    sourceP1Dir,
    'daegu-seatmap-p1-boundary-first-image-coordinate-draft/daegu-p1-boundary-first-image-coordinate-draft.json',
  );
  const fixtureTemplatePath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-draft-approval-template.json');

  const blockers = [];
  const warnings = [];
  const sourceTemplate = await readJson(sourceTemplatePath);
  const sourceInput = await readJson(sourceInputPath);
  const boundaryAid = await readJson(sourceBoundaryAidPath);
  const draft = await readJson(draftPath);
  const draftRows = Array.isArray(draft.rows) ? draft.rows : [];
  const draftByBlockId = new Map(draftRows.map((row) => [row.blockId, row]));

  if (sourceTemplate.templateVersion !== TEMPLATE_VERSION) {
    blockers.push(`SOURCE_TEMPLATE_VERSION_MISMATCH:${sourceTemplate.templateVersion ?? ''}`);
  }
  if (sourceTemplate.targetBatchId !== TARGET_BATCH_ID) {
    blockers.push(`SOURCE_TEMPLATE_BATCH_MISMATCH:${sourceTemplate.targetBatchId ?? ''}`);
  }
  if (sourceTemplate.productionWriteAllowed !== false) blockers.push('SOURCE_TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (sourceTemplate.templateOnly !== true) blockers.push('SOURCE_TEMPLATE_ONLY_NOT_TRUE');
  if (sourceInput.targetBatchId !== TARGET_BATCH_ID) blockers.push(`SOURCE_INPUT_BATCH_MISMATCH:${sourceInput.targetBatchId ?? ''}`);
  if (sourceInput.productionWriteAllowed !== false) blockers.push('SOURCE_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (boundaryAid.summary?.inputAidVersion !== 'DAEGU_P1_BOUNDARY_INPUT_AID_V1') {
    blockers.push(`BOUNDARY_AID_VERSION_MISMATCH:${boundaryAid.summary?.inputAidVersion ?? ''}`);
  }
  if (draft.draftVersion !== DRAFT_VERSION) blockers.push(`IMAGE_DRAFT_VERSION_MISMATCH:${draft.draftVersion ?? ''}`);
  if (draft.productionWriteAllowed !== false) blockers.push('IMAGE_DRAFT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (draft.sourceOfTruth !== false) blockers.push('IMAGE_DRAFT_SOURCE_OF_TRUTH_NOT_FALSE');
  if (draft.sha256MatchesExpected !== true) blockers.push('IMAGE_DRAFT_SHA256_MISMATCH');

  const missingDraftRows = EXPECTED_BLOCK_IDS.filter((blockId) => !draftByBlockId.has(blockId));
  if (missingDraftRows.length > 0) blockers.push(`IMAGE_DRAFT_ROWS_MISSING:${missingDraftRows.join(' ')}`);

  const fixtureTemplate = {
    ...sourceTemplate,
    generatedAt: new Date().toISOString(),
    dryRunVersion: DRY_RUN_VERSION,
    sourceTemplate: path.relative(frontendRoot, sourceTemplatePath),
    sourceImageDraft: path.relative(frontendRoot, draftPath),
    templateOnly: true,
    productionWriteAllowed: false,
    corrections: (sourceTemplate.corrections ?? []).map((row) => {
      const draftRow = draftByBlockId.get(row.blockId);
      if (!draftRow) return row;
      return {
        ...row,
        editableSource: 'imageCoordinateDraftDryRun',
        operatorDecision: 'APPROVED',
        correctedPath: draftRow.correctedPathDraft,
        correctedLabelX: String(draftRow.correctedLabelX),
        correctedLabelY: String(draftRow.correctedLabelY),
        reviewer: REVIEWER,
        reviewedAt: REVIEWED_AT,
        operatorNote: [
          'Dry-run fixture only.',
          'Uses image-coordinate draft as if approved to expose template gate blockers.',
          'This is not operator approval and must not be copied to production automatically.',
        ].join(' '),
      };
    }),
  };

  let commandResult = null;
  let gateReport = null;
  if (blockers.length === 0) {
    await writeJson(fixtureTemplatePath, fixtureTemplate);
    commandResult = await runNodeScript(
      path.join(scriptDir, 'daegu-seatmap-p1-operator-boundary.mjs'),
      [
        'p1-boundary-first-template-gate',
        '--template',
        path.relative(frontendRoot, fixtureTemplatePath),
        '--source-input',
        path.relative(frontendRoot, sourceInputPath),
        '--boundary-aid',
        path.relative(frontendRoot, sourceBoundaryAidPath),
        '--output-dir',
        path.relative(frontendRoot, outputDir),
      ],
    );
    gateReport = await readJson(path.join(outputDir, 'daegu-seatmap-p1-boundary-first-template-gate.json'));
  }

  const gateRows = Array.isArray(gateReport?.rows) ? gateReport.rows : [];
  const approvalReadyRows = gateRows.filter((row) => row.approved && row.reasons.length === 0);
  const approvalBlockedRows = gateRows.filter((row) => row.approved && row.reasons.length > 0);
  const reasonCounts = approvalBlockedRows
    .flatMap((row) => row.reasons)
    .reduce((counts, reason) => {
      const reasonKey = reason.split(':')[0];
      counts[reasonKey] = (counts[reasonKey] ?? 0) + 1;
      return counts;
    }, {});

  const rows = gateRows.map((row) => {
    const draftRow = draftByBlockId.get(row.blockId);
    return {
      blockId: row.blockId,
      block: row.block,
      approved: row.approved,
      dryRunReadyForSourceCopy: row.readyForSourceCopy,
      correctedPathPointCount: row.correctedPathPointCount,
      gateReasons: row.reasons,
      gateWarnings: row.warnings,
      draftPath: draftRow?.correctedPathDraft ?? '',
      draftLabel: draftRow ? [draftRow.correctedLabelX, draftRow.correctedLabelY] : [],
      draftOverlayPath: draftRow?.overlayPath ?? '',
      nextAction: row.reasons.length === 0
        ? 'Operator may review this row as an approval candidate; still requires real reviewer/reviewedAt in the source template.'
        : 'Do not approve as-is. Resolve the listed gate reasons before source-copy/write.',
    };
  });

  const summary = {
    dryRunVersion: DRY_RUN_VERSION,
    status: blockers.length > 0
      ? 'blocked'
      : approvalBlockedRows.length > 0
        ? 'blocked-by-template-gate'
        : 'approval-draft-gate-clean',
    sourceTemplate: path.relative(frontendRoot, sourceTemplatePath),
    sourceInput: path.relative(frontendRoot, sourceInputPath),
    sourceBoundaryAid: path.relative(frontendRoot, sourceBoundaryAidPath),
    imageCoordinateDraft: path.relative(frontendRoot, draftPath),
    fixtureTemplate: path.relative(frontendRoot, fixtureTemplatePath),
    gateReport: gateReport ? path.relative(frontendRoot, path.join(outputDir, 'daegu-seatmap-p1-boundary-first-template-gate.json')) : '',
    totalRows: rows.length,
    approvalReadyRows: approvalReadyRows.length,
    approvalBlockedRows: approvalBlockedRows.length,
    reasonCounts,
    templateGateExitCode: commandResult?.exitCode ?? null,
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
    commandResult,
    safetyContract: [
      'This dry-run writes only fixture/report files under reports/stadium/daegu-p1-boundary-first-draft-approval-dry-run.',
      'It never edits reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json.',
      'It never edits reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-operator-template.json.',
      'It never modifies src/data/daeguSeatData.ts.',
      'The image-coordinate draft remains evidence-only and sourceOfTruth=false.',
      'A gate-clean dry-run is not operator approval; source-copy still requires real operatorDecision=APPROVED, correctedPath, correctedLabelX/Y, reviewer, and reviewedAt.',
    ],
    rows,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await writeJson(path.join(outputDir, 'daegu-seatmap-p1-boundary-first-draft-approval-dry-run.json'), report);
  await writeCsv(path.join(outputDir, 'daegu-seatmap-p1-boundary-first-draft-approval-dry-run.csv'), [
    [
      'block',
      'blockId',
      'approved',
      'dryRunReadyForSourceCopy',
      'correctedPathPointCount',
      'gateReasons',
      'draftPath',
      'draftLabel',
      'draftOverlayPath',
      'nextAction',
    ],
    ...rows.map((row) => [
      row.block,
      row.blockId,
      row.approved,
      row.dryRunReadyForSourceCopy,
      row.correctedPathPointCount,
      row.gateReasons.join(' '),
      row.draftPath,
      row.draftLabel.join(','),
      row.draftOverlayPath,
      row.nextAction,
    ]),
  ]);

  await fs.writeFile(
    path.join(outputDir, 'daegu-seatmap-p1-boundary-first-draft-approval-dry-run.md'),
    [
      '# Daegu P1 Boundary-First Draft Approval Dry Run',
      '',
      `- dry-run version: \`${DRY_RUN_VERSION}\``,
      `- status: \`${summary.status}\``,
      `- approval ready rows: ${summary.approvalReadyRows}`,
      `- approval blocked rows: ${summary.approvalBlockedRows}`,
      `- template gate exit code: ${summary.templateGateExitCode}`,
      `- production write allowed: ${summary.productionWriteAllowed}`,
      '',
      '## Rows',
      '',
      markdownTable(
        ['block', 'point count', 'ready', 'gate reasons', 'draft path', 'draft label', 'next action'],
        rows.map((row) => [
          `\`${row.block}\``,
          row.correctedPathPointCount,
          row.dryRunReadyForSourceCopy ? 'yes' : 'no',
          row.gateReasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
          `\`${row.draftPath}\``,
          row.draftLabel.join(', '),
          row.nextAction,
        ]),
      ),
      '',
      '## Reason Counts',
      '',
      Object.keys(summary.reasonCounts).length > 0
        ? Object.entries(summary.reasonCounts).map(([reason, count]) => `- \`${reason}\`: ${count}`).join('\n')
        : 'No gate blockers.',
      '',
      '## Safety Contract',
      '',
      ...report.safetyContract.map((line) => `- ${line}`),
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(`p1_boundary_first_draft_approval_dry_run_json:${path.join(outputDir, 'daegu-seatmap-p1-boundary-first-draft-approval-dry-run.json')}`);
  console.log(`status:${summary.status} ready=${summary.approvalReadyRows} blocked=${summary.approvalBlockedRows} templateGateExit=${summary.templateGateExitCode}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1BoundaryFirstEntryPreflight = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const PREFLIGHT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_ENTRY_PREFLIGHT_V1';
  const ENTRY_SHEET_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_ENTRY_SHEET_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const EXPECTED_BLOCKS = ['T1-1', 'T3-2', 'V1', 'V2', 'V3'];
  const EXPECTED_BLOCK_IDS = [
    'daegu-first-table-t1-1',
    'daegu-third-table-t3-2',
    'daegu-central-table-v-v1',
    'daegu-central-table-v-v2',
    'daegu-central-table-v-v3',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const hasFlag = (name) => process.argv.includes(name);

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

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const entrySheetPath = path.resolve(
    frontendRoot,
    argValue('--entry-sheet', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-entry-sheet.json')),
  );
  const requireReady = hasFlag('--require-ready');

  const entrySheet = await readJson(entrySheetPath);
  const entryRows = Array.isArray(entrySheet.rows) ? entrySheet.rows : [];
  const blockers = [];
  const warnings = [];

  if (entrySheet.summary?.entrySheetVersion !== ENTRY_SHEET_VERSION) {
    blockers.push(`ENTRY_SHEET_VERSION_MISMATCH:${entrySheet.summary?.entrySheetVersion ?? ''}`);
  }
  if (entrySheet.summary?.targetBatchId !== TARGET_BATCH_ID) {
    blockers.push(`ENTRY_SHEET_BATCH_MISMATCH:${entrySheet.summary?.targetBatchId ?? ''}`);
  }
  if (entrySheet.summary?.productionWriteAllowed !== false) blockers.push('ENTRY_SHEET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (entrySheet.summary?.writesOperatorDecision !== false) blockers.push('ENTRY_SHEET_WRITES_OPERATOR_DECISION_NOT_FALSE');
  if (entrySheet.summary?.writesCorrectionsTemplate !== false) blockers.push('ENTRY_SHEET_WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
  if (entrySheet.summary?.writesProductionData !== false) blockers.push('ENTRY_SHEET_WRITES_PRODUCTION_DATA_NOT_FALSE');
  if ((entrySheet.summary?.blockers ?? []).length > 0) blockers.push('ENTRY_SHEET_HAS_BLOCKERS');

  const blocks = entryRows.map((row) => row.block);
  const blockIds = entryRows.map((row) => row.blockId);
  if (entryRows.length !== EXPECTED_BLOCKS.length) blockers.push(`ENTRY_SHEET_ROW_COUNT_MISMATCH:${entryRows.length}:${EXPECTED_BLOCKS.length}`);
  if (blocks.join(' ') !== EXPECTED_BLOCKS.join(' ')) blockers.push(`ENTRY_SHEET_BLOCK_ORDER_MISMATCH:${blocks.join(' ')}`);
  if (blockIds.join(' ') !== EXPECTED_BLOCK_IDS.join(' ')) blockers.push(`ENTRY_SHEET_BLOCK_ID_ORDER_MISMATCH:${blockIds.join(' ')}`);

  const rows = entryRows.map((row) => {
    const missingOperatorInputFields = Array.isArray(row.missingOperatorInputFields)
      ? row.missingOperatorInputFields
      : [];
    const readyForTemplateGate = missingOperatorInputFields.length === 0;
    if (!row.editableTarget) blockers.push(`ENTRY_ROW_EDITABLE_TARGET_MISSING:${row.block ?? row.blockId}`);
    if (!row.evidenceCrop) warnings.push(`ENTRY_ROW_EVIDENCE_CROP_MISSING:${row.block ?? row.blockId}`);
    if (!String(row.candidatePathPolicy ?? '').includes('reference-only')) {
      blockers.push(`ENTRY_ROW_CANDIDATE_POLICY_MISSING:${row.block ?? row.blockId}`);
    }
    return {
      blockId: row.blockId,
      block: row.block,
      editableTarget: row.editableTarget,
      currentDecision: row.currentDecision,
      readyForTemplateGate,
      missingOperatorInputFields,
      nextOperatorAction: row.nextOperatorAction,
      evidenceCrop: row.evidenceCrop,
    };
  });

  const rowsReadyForTemplateGate = rows.filter((row) => row.readyForTemplateGate);
  const rowsWaitingForOperator = rows.filter((row) => !row.readyForTemplateGate);
  if (requireReady && rowsWaitingForOperator.length > 0) {
    blockers.push(`ENTRY_PREFLIGHT_REQUIRES_OPERATOR_INPUT:${rowsWaitingForOperator.length}:${rows.length}`);
  }

  const status = blockers.length > 0
    ? 'blocked'
    : rowsWaitingForOperator.length === 0
      ? 'ready-for-template-gate'
      : 'waiting-for-operator-entry';
  const summary = {
    preflightVersion: PREFLIGHT_VERSION,
    status,
    mode: requireReady ? 'require-ready' : 'report-only',
    targetBatchId: TARGET_BATCH_ID,
    entrySheet: path.relative(frontendRoot, entrySheetPath),
    totalRows: rows.length,
    rowsReadyForTemplateGate: rowsReadyForTemplateGate.length,
    rowsWaitingForOperator: rowsWaitingForOperator.length,
    requireReady,
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'This preflight is read-only.',
      'It is the explicit stop sign before source-copy/write when operator input is incomplete.',
      'Report-only mode records waiting-for-operator-entry without failing the command.',
      'Require-ready mode fails until all five boundary-first rows have no missingOperatorInputFields.',
      'It never writes operatorDecision or corrected fields into any source input.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-entry-preflight.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-entry-preflight.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-entry-preflight.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'block',
      'editableTarget',
      'currentDecision',
      'readyForTemplateGate',
      'missingOperatorInputFields',
      'evidenceCrop',
      'nextOperatorAction',
    ],
    ...rows.map((row) => [
      row.block,
      row.editableTarget,
      row.currentDecision,
      row.readyForTemplateGate,
      row.missingOperatorInputFields.join(' '),
      row.evidenceCrop,
      row.nextOperatorAction,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P1 Boundary-First Entry Preflight',
    '',
    `- preflight version: \`${PREFLIGHT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- mode: \`${summary.mode}\``,
    `- rows ready for template gate: ${summary.rowsReadyForTemplateGate}/${summary.totalRows}`,
    `- rows waiting for operator: ${summary.rowsWaitingForOperator}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Rows',
    '',
    markdownTable(
      ['block', 'editable target', 'decision', 'ready', 'missing input', 'next action'],
      rows.map((row) => [
        `\`${row.block}\``,
        `\`${row.editableTarget}\``,
        `\`${row.currentDecision}\``,
        String(row.readyForTemplateGate),
        row.missingOperatorInputFields.map((field) => `\`${field}\``).join(' ') || '-',
        row.nextOperatorAction,
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

  console.log(`p1_boundary_first_entry_preflight_json:${jsonPath}`);
  console.log(`p1_boundary_first_entry_preflight_csv:${csvPath}`);
  console.log(`p1_boundary_first_entry_preflight_markdown:${markdownPath}`);
  console.log(`status:${summary.status} mode=${summary.mode} ready=${summary.rowsReadyForTemplateGate}/${summary.totalRows} waiting=${summary.rowsWaitingForOperator}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1BoundaryFirstEntrySheet = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const ENTRY_SHEET_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_ENTRY_SHEET_V1';
  const REVIEW_BOARD_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_REVIEW_BOARD_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1';
  const IMAGE_COORDINATE_DRAFT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_IMAGE_COORDINATE_DRAFT_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const EXPECTED_BLOCKS = ['T1-1', 'T3-2', 'V1', 'V2', 'V3'];
  const EXPECTED_BLOCK_IDS = [
    'daegu-first-table-t1-1',
    'daegu-third-table-t3-2',
    'daegu-central-table-v-v1',
    'daegu-central-table-v-v2',
    'daegu-central-table-v-v3',
  ];
  const REQUIRED_APPROVAL_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

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

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const isBlank = (value) => String(value ?? '').trim() === '';

  const hasFilledCorrectedLabel = (row) => !isBlank(row?.correctedLabelX) && !isBlank(row?.correctedLabelY);

  const missingApprovalFieldsFor = (templateRow) => {
    const missing = [];
    if (normalizeDecision(templateRow?.operatorDecision) !== 'APPROVED') missing.push('operatorDecision=APPROVED');
    if (isBlank(templateRow?.correctedPath)) missing.push('correctedPath');
    if (!hasFilledCorrectedLabel(templateRow)) missing.push('correctedLabelX/Y');
    if (isBlank(templateRow?.reviewer)) missing.push('reviewer');
    if (isBlank(templateRow?.reviewedAt)) missing.push('reviewedAt');
    return missing;
  };

  const fieldStatus = (missingFields, fieldName) => missingFields.includes(fieldName) ? 'missing' : 'filled';

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const reviewBoardPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-review-board.json');
  const templatePath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-operator-template.json');
  const imageCoordinateDraftPath = path.join(
    p1ReportDir,
    'daegu-seatmap-p1-boundary-first-image-coordinate-draft/daegu-p1-boundary-first-image-coordinate-draft.json',
  );

  const reviewBoard = await readJson(reviewBoardPath);
  const template = await readJson(templatePath);
  const imageCoordinateDraft = await readOptionalJson(imageCoordinateDraftPath);
  const reviewRows = Array.isArray(reviewBoard.rows) ? reviewBoard.rows : [];
  const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
  const imageCoordinateDraftRows = Array.isArray(imageCoordinateDraft?.rows) ? imageCoordinateDraft.rows : [];
  const reviewByBlockId = new Map(reviewRows.map((row) => [row.blockId, row]));
  const templateByBlockId = new Map(templateRows.map((row) => [row.blockId, row]));
  const imageCoordinateDraftByBlockId = new Map(imageCoordinateDraftRows.map((row) => [row.blockId, row]));
  const blockers = [];
  const warnings = [];

  if (reviewBoard.summary?.reviewBoardVersion !== REVIEW_BOARD_VERSION) {
    blockers.push(`REVIEW_BOARD_VERSION_MISMATCH:${reviewBoard.summary?.reviewBoardVersion ?? ''}`);
  }
  if (template.templateVersion !== TEMPLATE_VERSION) {
    blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  }
  if (template.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
  if (template.templateOnly !== true) blockers.push('TEMPLATE_ONLY_NOT_TRUE');
  if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if ((reviewBoard.summary?.blockers ?? []).length > 0) blockers.push('REVIEW_BOARD_HAS_BLOCKERS');
  if (!imageCoordinateDraft) {
    warnings.push('IMAGE_COORDINATE_DRAFT_MISSING');
  } else {
    if (imageCoordinateDraft.draftVersion !== IMAGE_COORDINATE_DRAFT_VERSION) {
      blockers.push(`IMAGE_COORDINATE_DRAFT_VERSION_MISMATCH:${imageCoordinateDraft.draftVersion ?? ''}`);
    }
    if (imageCoordinateDraft.productionWriteAllowed !== false) {
      blockers.push('IMAGE_COORDINATE_DRAFT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
    }
    if (imageCoordinateDraft.sourceOfTruth !== false) {
      blockers.push('IMAGE_COORDINATE_DRAFT_SOURCE_OF_TRUTH_NOT_FALSE');
    }
    if (imageCoordinateDraft.sha256MatchesExpected !== true) {
      blockers.push('IMAGE_COORDINATE_DRAFT_SHA256_MISMATCH');
    }
  }

  const templateBlocks = templateRows.map((row) => row.block);
  const templateBlockIds = templateRows.map((row) => row.blockId);
  if (templateRows.length !== EXPECTED_BLOCKS.length) blockers.push(`TEMPLATE_ROW_COUNT_MISMATCH:${templateRows.length}:${EXPECTED_BLOCKS.length}`);
  if (templateBlocks.join(' ') !== EXPECTED_BLOCKS.join(' ')) blockers.push(`TEMPLATE_BLOCK_ORDER_MISMATCH:${templateBlocks.join(' ')}`);
  if (templateBlockIds.join(' ') !== EXPECTED_BLOCK_IDS.join(' ')) blockers.push(`TEMPLATE_BLOCK_ID_ORDER_MISMATCH:${templateBlockIds.join(' ')}`);

  const rows = EXPECTED_BLOCK_IDS.map((blockId, index) => {
    const templateRow = templateByBlockId.get(blockId) ?? {};
    const reviewRow = reviewByBlockId.get(blockId) ?? {};
    const imageDraftRow = imageCoordinateDraftByBlockId.get(blockId) ?? {};
    const missingOperatorInputFields = missingApprovalFieldsFor(templateRow);
    const labelPoint = hasFilledCorrectedLabel(templateRow)
      ? `${templateRow.correctedLabelX},${templateRow.correctedLabelY}`
      : '';
    const editableTarget = `corrections[${index}]`;

    if (!templateRow.blockId) blockers.push(`ENTRY_TEMPLATE_ROW_MISSING:${blockId}`);
    if (!reviewRow.blockId) blockers.push(`ENTRY_REVIEW_ROW_MISSING:${blockId}`);
    if (imageCoordinateDraft && !imageDraftRow.blockId) blockers.push(`ENTRY_IMAGE_COORDINATE_DRAFT_ROW_MISSING:${blockId}`);
    if (reviewRow.evidenceCropExists === false) blockers.push(`ENTRY_EVIDENCE_CROP_MISSING:${reviewRow.block ?? blockId}`);
    if (Array.isArray(reviewRow.approvalMissingFields)
      && reviewRow.approvalMissingFields.join(' ') !== missingOperatorInputFields.join(' ')) {
      warnings.push(`ENTRY_REVIEW_BOARD_MISSING_FIELDS_STALE:${reviewRow.block ?? blockId}`);
    }

    return {
      entrySheetVersion: ENTRY_SHEET_VERSION,
      rowNumber: index + 1,
      blockId,
      block: templateRow.block ?? reviewRow.block ?? EXPECTED_BLOCKS[index],
      name: templateRow.name ?? reviewRow.name ?? '',
      category: templateRow.category ?? reviewRow.category ?? '',
      editableTarget,
      templateJsonPointer: `/corrections/${index}`,
      templateEditableSource: templateRow.editableSource ?? reviewRow.templateEditableSource ?? '',
      operatorTemplate: path.relative(frontendRoot, templatePath),
      reviewBoard: path.relative(frontendRoot, reviewBoardPath),
      evidenceCrop: templateRow.evidenceCrop ?? reviewRow.evidenceCrop ?? '',
      pairedBlocks: Array.isArray(reviewRow.pairedBlocks) ? reviewRow.pairedBlocks : [],
      currentDecision: normalizeDecision(templateRow.operatorDecision),
      currentCorrectedPathFilled: !isBlank(templateRow.correctedPath),
      currentCorrectedPathPointCount: String(templateRow.correctedPath ?? '').match(/-?\d+(?:\.\d+)?/g)?.length / 2 || 0,
      currentCorrectedLabelPoint: labelPoint,
      currentReviewer: String(templateRow.reviewer ?? '').trim(),
      currentReviewedAt: String(templateRow.reviewedAt ?? '').trim(),
      currentOperatorNoteFilled: !isBlank(templateRow.operatorNote),
      missingOperatorInputFields,
      fieldChecklist: {
        'operatorDecision=APPROVED': fieldStatus(missingOperatorInputFields, 'operatorDecision=APPROVED'),
        correctedPath: fieldStatus(missingOperatorInputFields, 'correctedPath'),
        'correctedLabelX/Y': fieldStatus(missingOperatorInputFields, 'correctedLabelX/Y'),
        reviewer: fieldStatus(missingOperatorInputFields, 'reviewer'),
        reviewedAt: fieldStatus(missingOperatorInputFields, 'reviewedAt'),
      },
      nextOperatorAction: missingOperatorInputFields.length === 0
        ? 'Run npm run stadium:daegu:p1-boundary-first-template-gate.'
        : `Fill ${missingOperatorInputFields.join(', ')} in ${editableTarget} of daegu-seatmap-p1-boundary-first-operator-template.json.`,
      candidatePathPolicy: 'candidatePath is reference-only and must not be copied into correctedPath.',
      imageCoordinateDraft: imageDraftRow.blockId
        ? {
          draftReport: path.relative(frontendRoot, imageCoordinateDraftPath),
          correctedPathDraft: imageDraftRow.correctedPathDraft ?? '',
          correctedLabelX: imageDraftRow.correctedLabelX ?? '',
          correctedLabelY: imageDraftRow.correctedLabelY ?? '',
          componentBbox: imageDraftRow.componentBbox ?? [],
          overlayPath: imageDraftRow.overlayPath ?? '',
          riskFlags: imageDraftRow.riskFlags ?? [],
          note: imageDraftRow.note ?? '',
          draftOnly: true,
          sourceOfTruth: false,
        }
        : null,
      requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
      nextGateCommand: 'npm run stadium:daegu:p1-boundary-first-template-gate',
    };
  });

  const rowsMissingOperatorInput = rows.filter((row) => row.missingOperatorInputFields.length > 0);
  const rowsReadyForGate = rows.filter((row) => row.missingOperatorInputFields.length === 0);
  const status = blockers.length > 0
    ? 'blocked'
    : rowsMissingOperatorInput.length === 0
      ? 'ready-for-template-gate'
      : 'waiting-for-operator-entry';

  const summary = {
    entrySheetVersion: ENTRY_SHEET_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    reviewBoard: path.relative(frontendRoot, reviewBoardPath),
    operatorTemplate: path.relative(frontendRoot, templatePath),
    imageCoordinateDraft: path.relative(frontendRoot, imageCoordinateDraftPath),
    imageCoordinateDraftAvailable: Boolean(imageCoordinateDraft),
    imageCoordinateDraftRows: imageCoordinateDraftRows.length,
    imageCoordinateDraftRowsMissing: rows.filter((row) => !row.imageCoordinateDraft).length,
    totalRows: rows.length,
    rowsMissingOperatorInput: rowsMissingOperatorInput.length,
    rowsReadyForGate: rowsReadyForGate.length,
    approvedRows: rows.filter((row) => row.currentDecision === 'APPROVED').length,
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'This entry sheet is read-only.',
      'It lists exactly the five P1 boundary-first operator-template rows to edit.',
      'It never writes operatorDecision or corrected fields into any source input.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'candidatePath is reference-only and must not be copied into correctedPath.',
      'imageCoordinateDraft is evidence-only and must be manually reviewed before any correctedPath entry.',
      'Run the boundary-first template gate after all missingOperatorInputFields are filled.',
    ],
    editableFieldOrder: [
      'operatorDecision',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
      'operatorNote',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-entry-sheet.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-entry-sheet.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-entry-sheet.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'rowNumber',
      'block',
      'blockId',
      'editableTarget',
      'templateJsonPointer',
      'currentDecision',
      'currentCorrectedPathFilled',
      'currentCorrectedLabelPoint',
      'currentReviewer',
      'currentReviewedAt',
      'missingOperatorInputFields',
      'pairedBlocks',
      'evidenceCrop',
      'candidatePathPolicy',
      'draftCorrectedPathCandidate',
      'draftCorrectedLabelPoint',
      'draftOverlayPath',
      'draftRiskFlags',
      'nextOperatorAction',
    ],
    ...rows.map((row) => [
      row.rowNumber,
      row.block,
      row.blockId,
      row.editableTarget,
      row.templateJsonPointer,
      row.currentDecision,
      row.currentCorrectedPathFilled,
      row.currentCorrectedLabelPoint,
      row.currentReviewer,
      row.currentReviewedAt,
      row.missingOperatorInputFields.join(' '),
      row.pairedBlocks.join(' '),
      row.evidenceCrop,
      row.candidatePathPolicy,
      row.imageCoordinateDraft?.correctedPathDraft ?? '',
      row.imageCoordinateDraft ? `${row.imageCoordinateDraft.correctedLabelX},${row.imageCoordinateDraft.correctedLabelY}` : '',
      row.imageCoordinateDraft?.overlayPath ?? '',
      row.imageCoordinateDraft?.riskFlags?.join(' ') ?? '',
      row.nextOperatorAction,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P1 Boundary-First Entry Sheet',
    '',
    `- entry sheet version: \`${ENTRY_SHEET_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- rows missing operator input: ${summary.rowsMissingOperatorInput}`,
    `- rows ready for gate: ${summary.rowsReadyForGate}`,
    `- operator template: \`${summary.operatorTemplate}\``,
    `- review board: \`${summary.reviewBoard}\``,
    `- image coordinate draft: \`${summary.imageCoordinateDraft}\``,
    `- image coordinate draft rows: ${summary.imageCoordinateDraftRows}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Entry Rows',
    '',
    markdownTable(
      ['row', 'block', 'editable target', 'decision', 'missing input', 'draft correctedPath', 'draft label', 'evidence', 'next action'],
      rows.map((row) => [
        row.rowNumber,
        `\`${row.block}\``,
        `\`${row.editableTarget}\``,
        `\`${row.currentDecision}\``,
        row.missingOperatorInputFields.map((field) => `\`${field}\``).join(' ') || '-',
        row.imageCoordinateDraft?.correctedPathDraft ? `\`${row.imageCoordinateDraft.correctedPathDraft}\`` : '-',
        row.imageCoordinateDraft ? `${row.imageCoordinateDraft.correctedLabelX}, ${row.imageCoordinateDraft.correctedLabelY}` : '-',
        row.evidenceCrop,
        row.nextOperatorAction,
      ]),
    ),
    '',
    '## Field Checklist',
    '',
    ...rows.flatMap((row) => [
      `### ${row.block}`,
      '',
      `- template JSON pointer: \`${row.templateJsonPointer}\``,
      `- paired blocks: ${row.pairedBlocks.map((block) => `\`${block}\``).join(' ') || '-'}`,
      `- evidence crop: \`${row.evidenceCrop}\``,
      `- image-coordinate overlay: ${row.imageCoordinateDraft?.overlayPath ? `\`${row.imageCoordinateDraft.overlayPath}\`` : '-'}`,
      `- image-coordinate draft path: ${row.imageCoordinateDraft?.correctedPathDraft ? `\`${row.imageCoordinateDraft.correctedPathDraft}\`` : '-'}`,
      `- image-coordinate draft label: ${row.imageCoordinateDraft ? `\`${row.imageCoordinateDraft.correctedLabelX},${row.imageCoordinateDraft.correctedLabelY}\`` : '-'}`,
      `- image-coordinate risk flags: ${row.imageCoordinateDraft?.riskFlags?.map((flag) => `\`${flag}\``).join(' ') || '-'}`,
      `- operatorDecision=APPROVED: \`${row.fieldChecklist['operatorDecision=APPROVED']}\``,
      `- correctedPath: \`${row.fieldChecklist.correctedPath}\``,
      `- correctedLabelX/Y: \`${row.fieldChecklist['correctedLabelX/Y']}\``,
      `- reviewer: \`${row.fieldChecklist.reviewer}\``,
      `- reviewedAt: \`${row.fieldChecklist.reviewedAt}\``,
      `- candidate policy: ${row.candidatePathPolicy}`,
      '',
    ]),
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p1_boundary_first_entry_sheet_json:${jsonPath}`);
  console.log(`p1_boundary_first_entry_sheet_csv:${csvPath}`);
  console.log(`p1_boundary_first_entry_sheet_markdown:${markdownPath}`);
  console.log(`status:${summary.status} rows=${summary.totalRows} missingOperatorInput=${summary.rowsMissingOperatorInput} readyForGate=${summary.rowsReadyForGate}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1BoundaryFirstImageCoordinateDraft = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const DRAFT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_IMAGE_COORDINATE_DRAFT_V1';
  const OFFICIAL_IMAGE = 'src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png';
  const EXPECTED_SHA256 = '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0';
  const VIEWBOX = { width: 1707, height: 2048, viewBox: '0 0 1707 2048' };

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

  const parsePathPoints = (pathData) => {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  };

  const pointInPolygon = ([x, y], polygon) => {
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
      const [xi, yi] = polygon[index];
      const [xj, yj] = polygon[previous];
      const intersects = ((yi > y) !== (yj > y))
        && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
  };

  const orientation = (a, b, c) => {
    const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
    if (Math.abs(value) < 1e-9) return 0;
    return value > 0 ? 1 : 2;
  };

  const segmentsIntersect = (a, b, c, d) => {
    const o1 = orientation(a, b, c);
    const o2 = orientation(a, b, d);
    const o3 = orientation(c, d, a);
    const o4 = orientation(c, d, b);
    return o1 !== o2 && o3 !== o4;
  };

  const hasSelfIntersection = (points) => {
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      for (let other = index + 1; other < points.length; other += 1) {
        if (Math.abs(index - other) <= 1) continue;
        if (index === 0 && other === points.length - 1) continue;
        const c = points[other];
        const d = points[(other + 1) % points.length];
        if (segmentsIntersect(a, b, c, d)) return true;
      }
    }
    return false;
  };

  const pathToLocal = (pathData, crop) => {
    let coordinateIndex = 0;
    return pathData.replace(/-?\d+(?:\.\d+)?/g, (match) => {
      const value = Number(match);
      const localValue = coordinateIndex % 2 === 0 ? value - crop.left : value - crop.top;
      coordinateIndex += 1;
      return String(localValue);
    });
  };

  const round = (value, digits = 1) => Number(value.toFixed(digits));

  const pixelOffset = (width, x, y) => ((y * width) + x) * 4;

  const getPixel = (image, x, y) => {
    const safeX = Math.max(0, Math.min(image.width - 1, Math.round(x)));
    const safeY = Math.max(0, Math.min(image.height - 1, Math.round(y)));
    const offset = pixelOffset(image.width, safeX, safeY);
    return [
      image.data[offset],
      image.data[offset + 1],
      image.data[offset + 2],
      image.data[offset + 3],
    ];
  };

  const classifySeatColorFamily = ([red, green, blue, alpha]) => {
    if (alpha < 200) return 'NONE';
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const luminance = ((0.2126 * red) + (0.7152 * green) + (0.0722 * blue)) / 255;
    if (max < 35 || luminance > 0.94 || max - min < 14) return 'NONE';
    if (green >= 120 && blue >= 125 && red <= 130 && green > red + 35 && blue > red + 35) return 'TEAL';
    if (red >= 50 && red > green * 1.8 && red > blue * 1.8 && green < 95 && blue < 95) return 'MAROON';
    if (red >= 130 && green >= 130 && blue <= 175 && Math.abs(red - green) <= 90 && green > blue + 25 && red > blue + 20) {
      return 'OLIVE';
    }
    return 'OTHER';
  };

  const isTargetFamilyPixel = (rgba, expectedColorFamily) => (
    classifySeatColorFamily(rgba) === expectedColorFamily
  );

  const boundedRegion = (bounds) => ({
    minX: Math.max(0, Math.floor(bounds.minX)),
    minY: Math.max(0, Math.floor(bounds.minY)),
    maxX: Math.min(VIEWBOX.width - 1, Math.ceil(bounds.maxX)),
    maxY: Math.min(VIEWBOX.height - 1, Math.ceil(bounds.maxY)),
  });

  const centerBounds = ([x, y], radius) => boundedRegion({
    minX: x - radius,
    minY: y - radius,
    maxX: x + radius,
    maxY: y + radius,
  });

  const pointKey = ([x, y]) => `${x},${y}`;

  const convexHull = (points) => {
    const sorted = [...new Map(points.map((point) => [pointKey(point), point])).values()]
      .sort((first, second) => first[0] - second[0] || first[1] - second[1]);
    if (sorted.length <= 1) return sorted;
    const cross = (origin, a, b) => (
      (a[0] - origin[0]) * (b[1] - origin[1])
      - (a[1] - origin[1]) * (b[0] - origin[0])
    );
    const lower = [];
    sorted.forEach((point) => {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
      lower.push(point);
    });
    const upper = [];
    [...sorted].reverse().forEach((point) => {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
      upper.push(point);
    });
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  };

  const polygonBoundsFromPoints = (points) => ({
    minX: Math.floor(Math.min(...points.map((point) => point[0]))),
    minY: Math.floor(Math.min(...points.map((point) => point[1]))),
    maxX: Math.ceil(Math.max(...points.map((point) => point[0]))),
    maxY: Math.ceil(Math.max(...points.map((point) => point[1]))),
  });

  const bboxArray = (bbox) => bbox ? [bbox.minX, bbox.minY, bbox.maxX, bbox.maxY] : [];

  const pathFromPoints = (points) => {
    const [first, ...rest] = points;
    return `M ${first[0]} ${first[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(' ')} Z`;
  };

  const ensureMinimumPolygonPoints = (points, minPointCount = 6) => {
    const expanded = [...points];
    while (expanded.length > 2 && expanded.length < minPointCount) {
      let longestEdgeIndex = 0;
      let longestEdgeLength = -1;
      for (let index = 0; index < expanded.length; index += 1) {
        const current = expanded[index];
        const next = expanded[(index + 1) % expanded.length];
        const edgeLength = Math.hypot(next[0] - current[0], next[1] - current[1]);
        if (edgeLength > longestEdgeLength) {
          longestEdgeLength = edgeLength;
          longestEdgeIndex = index;
        }
      }
      const current = expanded[longestEdgeIndex];
      const next = expanded[(longestEdgeIndex + 1) % expanded.length];
      expanded.splice(longestEdgeIndex + 1, 0, [
        round((current[0] + next[0]) / 2),
        round((current[1] + next[1]) / 2),
      ]);
    }
    return expanded;
  };

  const distanceToComponent = (point, component) => {
    const bboxDistanceX = point[0] < component.bbox.minX
      ? component.bbox.minX - point[0]
      : point[0] > component.bbox.maxX
        ? point[0] - component.bbox.maxX
        : 0;
    const bboxDistanceY = point[1] < component.bbox.minY
      ? component.bbox.minY - point[1]
      : point[1] > component.bbox.maxY
        ? point[1] - component.bbox.maxY
        : 0;
    const bboxDistance = Math.hypot(bboxDistanceX, bboxDistanceY);
    const centerDistance = Math.hypot(point[0] - component.center[0], point[1] - component.center[1]);
    return bboxDistance * 1000 + centerDistance;
  };

  const findColorComponents = (image, bounds, expectedColorFamily) => {
    const region = boundedRegion(bounds);
    const width = region.maxX - region.minX + 1;
    const height = region.maxY - region.minY + 1;
    const mask = new Uint8Array(width * height);
    const seen = new Uint8Array(width * height);

    for (let y = region.minY; y <= region.maxY; y += 1) {
      for (let x = region.minX; x <= region.maxX; x += 1) {
        if (isTargetFamilyPixel(getPixel(image, x, y), expectedColorFamily)) {
          mask[((y - region.minY) * width) + (x - region.minX)] = 1;
        }
      }
    }

    const components = [];
    for (let startIndex = 0; startIndex < mask.length; startIndex += 1) {
      if (!mask[startIndex] || seen[startIndex]) continue;
      const queue = [startIndex];
      const pixels = [];
      const boundaryPixels = [];
      let sumX = 0;
      let sumY = 0;
      let minX = VIEWBOX.width;
      let minY = VIEWBOX.height;
      let maxX = 0;
      let maxY = 0;
      seen[startIndex] = 1;

      while (queue.length > 0) {
        const current = queue.pop();
        const localX = current % width;
        const localY = Math.floor(current / width);
        const x = region.minX + localX;
        const y = region.minY + localY;
        pixels.push([x, y]);
        sumX += x;
        sumY += y;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);

        const neighbors = [
          localX > 0 ? current - 1 : -1,
          localX < width - 1 ? current + 1 : -1,
          localY > 0 ? current - width : -1,
          localY < height - 1 ? current + width : -1,
        ];
        if (neighbors.some((next) => next < 0 || !mask[next])) boundaryPixels.push([x, y]);
        neighbors.forEach((next) => {
          if (next < 0 || seen[next] || !mask[next]) return;
          seen[next] = 1;
          queue.push(next);
        });
      }

      if (pixels.length < 10) continue;
      components.push({
        pixels,
        boundaryPixels,
        area: pixels.length,
        bbox: { minX, minY, maxX, maxY },
        center: [sumX / pixels.length, sumY / pixels.length],
      });
    }

    return components.sort((first, second) => second.area - first.area);
  };

  const componentPolygonPoints = (component) => (
    convexHull(component.boundaryPixels.length > 0 ? component.boundaryPixels : component.pixels)
      .map(([x, y]) => [round(x), round(y)])
  );

  const samplePolygonColorCoverage = (image, points, expectedColorFamily) => {
    const bounds = boundedRegion(polygonBoundsFromPoints(points));
    let insidePixels = 0;
    let familyPixels = 0;
    for (let y = bounds.minY; y <= bounds.maxY; y += 2) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 2) {
        if (!pointInPolygon([x + 0.5, y + 0.5], points)) continue;
        insidePixels += 1;
        if (isTargetFamilyPixel(getPixel(image, x, y), expectedColorFamily)) familyPixels += 1;
      }
    }
    return insidePixels > 0 ? round(familyPixels / insidePixels, 3) : 0;
  };

  const traceConnectedTarget = (image, target) => {
    const components = findColorComponents(
      image,
      centerBounds(target.labelPoint, target.searchRadius),
      target.expectedColorFamily,
    );
    const component = [...components].sort((first, second) => (
      distanceToComponent(target.labelPoint, first) - distanceToComponent(target.labelPoint, second)
    ))[0];
    if (!component) {
      return {
        status: 'NO_PIXEL_COMPONENT',
        points: [],
        componentArea: 0,
        componentBounds: null,
        componentCenter: null,
      };
    }
    const points = ensureMinimumPolygonPoints(componentPolygonPoints(component));
    return {
      status: 'PIXEL_COMPONENT_TRACED',
      points,
      componentArea: component.area,
      componentBounds: component.bbox,
      componentCenter: component.center.map((value) => round(value)),
    };
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(
    frontendRoot,
    argValue(
      '--output-dir',
      path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-image-coordinate-draft'),
    ),
  );
  const imagePath = path.resolve(frontendRoot, OFFICIAL_IMAGE);
  const imageSha256 = crypto.createHash('sha256').update(await fs.readFile(imagePath)).digest('hex');
  const officialImage = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const imageData = {
    width: officialImage.info.width,
    height: officialImage.info.height,
    data: officialImage.data,
  };
  const blockers = [];
  const warnings = [];

  if (imageSha256 !== EXPECTED_SHA256) {
    blockers.push(`OFFICIAL_IMAGE_SHA256_MISMATCH:${imageSha256}`);
  }

  if (imageData.width !== VIEWBOX.width || imageData.height !== VIEWBOX.height) {
    blockers.push(`OFFICIAL_IMAGE_SIZE_MISMATCH:${imageData.width}x${imageData.height}`);
  }

  const rows = [
    {
      block: 'T1-1',
      blockId: 'daegu-first-table-t1-1',
      sourceCrop: { left: 899, top: 957, width: 222, height: 229 },
      overlayFile: '01-t1-1-draft-overlay.png',
      expectedColorFamily: 'TEAL',
      traceMode: 'CONNECTED_COLOR_COMPONENT',
      searchRadius: 70,
      labelPoint: [1031, 1030],
      note: 'Official teal T1-1 block below T1-2; current production evidence is shifted into the TC area.',
    },
    {
      block: 'T3-2',
      blockId: 'daegu-third-table-t3-2',
      sourceCrop: { left: 763, top: 985, width: 324, height: 239 },
      overlayFile: '02-t3-2-draft-overlay.png',
      expectedColorFamily: 'MAROON',
      traceMode: 'CONNECTED_COLOR_COMPONENT',
      searchRadius: 80,
      labelPoint: [887, 1121],
      note: 'Official maroon T3-2 rectangle between T3-3 and T3-1; current production evidence is in the central table area.',
    },
    {
      block: 'V1',
      blockId: 'daegu-central-table-v-v1',
      sourceCrop: { left: 813, top: 966, width: 305, height: 220 },
      overlayFile: '03-v1-v2-v3-draft-overlay.png',
      expectedColorFamily: 'OLIVE',
      traceMode: 'CONNECTED_COLOR_COMPONENT',
      searchRadius: 55,
      labelPoint: [975, 1022],
      note: 'Tiny official V1 block at the T1/V junction; white label fragments the color mask.',
    },
    {
      block: 'V2',
      blockId: 'daegu-central-table-v-v2',
      sourceCrop: { left: 813, top: 966, width: 305, height: 220 },
      overlayFile: '03-v1-v2-v3-draft-overlay.png',
      expectedColorFamily: 'OLIVE',
      traceMode: 'CONNECTED_COLOR_COMPONENT',
      searchRadius: 70,
      labelPoint: [948, 1048],
      note: 'Official V2 is a small olive component around the V2 label; adjacent olive table areas require operator ownership confirmation.',
    },
    {
      block: 'V3',
      blockId: 'daegu-central-table-v-v3',
      sourceCrop: { left: 813, top: 966, width: 305, height: 220 },
      overlayFile: '03-v1-v2-v3-draft-overlay.png',
      expectedColorFamily: 'OLIVE',
      traceMode: 'CONNECTED_COLOR_COMPONENT',
      searchRadius: 70,
      labelPoint: [922, 1074],
      note: 'Official V3 small olive block above T3-1; current data is a floating rectangle near the maroon rows.',
    },
  ].map((row) => {
    const trace = traceConnectedTarget(imageData, row);
    const correctedPathDraft = trace.points.length > 0 ? pathFromPoints(trace.points) : '';
    const points = parsePathPoints(correctedPathDraft);
    const labelPoint = row.labelPoint;
    const labelInsideDraft = pointInPolygon(labelPoint, points);
    const selfIntersection = hasSelfIntersection(points);
    const boundsInsideImage = points.every(([x, y]) => (
      x >= 0 && x <= VIEWBOX.width && y >= 0 && y <= VIEWBOX.height
    ));
    const overlayPath = path.relative(frontendRoot, path.join(outputDir, row.overlayFile));
    const riskFlags = ['DRAFT_ONLY', 'OPERATOR_APPROVAL_REQUIRED'];

    if (trace.status !== 'PIXEL_COMPONENT_TRACED') riskFlags.push(`IMAGE_DRAFT_PIXEL_TRACE_NOT_READY:${trace.status}`);
    if (!labelInsideDraft) riskFlags.push('LABEL_POINT_NEEDS_OPERATOR_ADJUSTMENT');
    if (selfIntersection) riskFlags.push('SELF_INTERSECTION');
    if (!boundsInsideImage) riskFlags.push('OUT_OF_BOUNDS');
    if (row.expectedColorFamily === 'OLIVE') riskFlags.push('SMALL_BLOCK_TEXT_FRAGMENTATION');

    return {
      ...row,
      colorClass: row.expectedColorFamily.toLowerCase(),
      overlayPath,
      sourceTraceMode: row.traceMode,
      pixelTraceStatus: trace.status,
      pixelComponentArea: trace.componentArea,
      pixelComponentCenter: trace.componentCenter,
      pixelColorCoverageRatio: trace.points.length > 0
        ? samplePolygonColorCoverage(imageData, trace.points, row.expectedColorFamily)
        : 0,
      componentBbox: bboxArray(trace.componentBounds),
      correctedPathDraft,
      correctedLabelX: labelPoint[0],
      correctedLabelY: labelPoint[1],
      pointCount: points.length,
      labelInsideDraft,
      selfIntersection,
      boundsInsideImage,
      riskFlags,
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    draftVersion: DRAFT_VERSION,
    sourceImage: OFFICIAL_IMAGE,
    imageSize: VIEWBOX,
    imageSha256,
    expectedSha256: EXPECTED_SHA256,
    sha256MatchesExpected: imageSha256 === EXPECTED_SHA256,
    productionWriteAllowed: false,
    sourceOfTruth: false,
    operatorApprovalRequired: true,
    sourceTraceContract: 'OFFICIAL_PNG_CONNECTED_COMPONENT_PIXEL_SCAN',
    blockers,
    warnings,
    safetyContract: [
      'Official PNG connected-component pixel scan only.',
      'No external baseball data or web search was used.',
      'These coordinates are draft evidence for operator review.',
      'Do not write production data until operatorDecision=APPROVED, correctedPath, correctedLabelX/Y, reviewer, and reviewedAt are filled in the operator input.',
    ],
    rows,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, 'daegu-p1-boundary-first-image-coordinate-draft.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );

  const headers = [
    'block',
    'blockId',
    'correctedPathDraft',
    'correctedLabelX',
    'correctedLabelY',
    'expectedColorFamily',
    'sourceTraceMode',
    'pixelTraceStatus',
    'pixelComponentArea',
    'componentBbox',
    'pixelColorCoverageRatio',
    'pointCount',
    'labelInsideDraft',
    'selfIntersection',
    'boundsInsideImage',
    'overlayPath',
    'riskFlags',
    'note',
  ];
  await fs.writeFile(
    path.join(outputDir, 'daegu-p1-boundary-first-image-coordinate-draft.csv'),
    [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
    ].join('\n') + '\n',
    'utf8',
  );

  await fs.writeFile(
    path.join(outputDir, 'daegu-p1-boundary-first-image-coordinate-draft.md'),
    [
      '# Daegu P1 boundary-first image coordinate draft',
      '',
      `- draft version: \`${DRAFT_VERSION}\``,
      `- source image: \`${OFFICIAL_IMAGE}\``,
      `- image sha256: \`${imageSha256}\``,
      `- sha256 matches expected: ${imageSha256 === EXPECTED_SHA256}`,
      '- source trace contract: `OFFICIAL_PNG_CONNECTED_COMPONENT_PIXEL_SCAN`',
      '- production write allowed: false',
      '- operator approval required: true',
      '',
      '## Draft Coordinates',
      '',
      '| block | mode | status | coverage | correctedPathDraft | label | component bbox | overlay | label inside | self intersection | risk flags |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      ...rows.map((row) => [
        `| \`${row.block}\``,
        `\`${row.sourceTraceMode}\``,
        `\`${row.pixelTraceStatus}\``,
        row.pixelColorCoverageRatio,
        `\`${row.correctedPathDraft}\``,
        `${row.correctedLabelX}, ${row.correctedLabelY}`,
        `\`${row.componentBbox.join(' ')}\``,
        `\`${row.overlayPath}\``,
        row.labelInsideDraft ? 'yes' : 'no',
        row.selfIntersection ? 'yes' : 'no',
        `${row.riskFlags.map((flag) => `\`${flag}\``).join('<br>')} |`,
      ].join(' | ')),
      '',
      '## Safety Contract',
      '',
      ...report.safetyContract.map((line) => `- ${line}`),
      '',
    ].join('\n'),
    'utf8',
  );

  const cropGroups = new Map();
  rows.forEach((row) => {
    const key = JSON.stringify(row.sourceCrop);
    if (!cropGroups.has(key)) cropGroups.set(key, []);
    cropGroups.get(key).push(row);
  });

  for (const [key, cropRows] of cropGroups.entries()) {
    const crop = JSON.parse(key);
    const base = await sharp(imagePath).extract(crop).png().toBuffer();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="0 0 ${crop.width} ${crop.height}">
    <style>
      .draft{fill:rgba(255,80,0,0.24);stroke:#ff3000;stroke-width:2.5;vector-effect:non-scaling-stroke;}
      .label{font:700 14px Arial,sans-serif;fill:#111;stroke:#fff;stroke-width:3;paint-order:stroke;}
      .point{fill:#111;stroke:#fff;stroke-width:2;}
    </style>
    ${cropRows.map((row) => `<path class="draft" d="${pathToLocal(row.correctedPathDraft, crop)}"/><circle class="point" cx="${row.correctedLabelX - crop.left}" cy="${row.correctedLabelY - crop.top}" r="3"/><text class="label" x="${row.correctedLabelX - crop.left + 6}" y="${row.correctedLabelY - crop.top - 6}">${row.block}</text>`).join('\n')}
  </svg>`;
    await sharp(base)
      .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
      .png()
      .toFile(path.join(outputDir, cropRows[0].overlayFile));
  }

  console.log(`p1_boundary_first_image_coordinate_draft:${path.join(outputDir, 'daegu-p1-boundary-first-image-coordinate-draft.json')}`);
  console.log(`status:${blockers.length > 0 ? 'blocked' : 'draft-ready'} rows=${rows.length} sha256MatchesExpected=${imageSha256 === EXPECTED_SHA256}`);

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP1BoundaryFirstOperatorHandoff = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const HANDOFF_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_HANDOFF_V1';
  const TRACING_PACK_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_TRACING_PACK_V1';
  const ENTRY_PREFLIGHT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_ENTRY_PREFLIGHT_V1';
  const POSTWRITE_GATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_POSTWRITE_GATE_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const EXPECTED_BLOCK_IDS = [
    'daegu-first-table-t1-1',
    'daegu-third-table-t3-2',
    'daegu-central-table-v-v1',
    'daegu-central-table-v-v2',
    'daegu-central-table-v-v3',
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

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const tracingPackDir = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-tracing-pack');
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));

  const reports = {
    tracingPack: await readJsonReport(path.join(tracingPackDir, 'daegu-seatmap-p1-boundary-first-tracing-pack.json')),
    entrySheet: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-entry-sheet.json')),
    entryPreflight: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-entry-preflight.json')),
    templateGate: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-template-gate.json')),
    sourceCopy: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-source-copy.json')),
    postwriteGate: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-postwrite-gate.json')),
  };

  const blockers = [];
  const warnings = [];

  Object.entries(reports).forEach(([name, report]) => {
    if (!report.exists) blockers.push(`MISSING_REPORT:${name}:${report.relativePath}`);
  });

  if (reports.tracingPack.exists && reports.tracingPack.data?.summary?.tracingPackVersion !== TRACING_PACK_VERSION) {
    blockers.push(`TRACING_PACK_VERSION_MISMATCH:${reports.tracingPack.data?.summary?.tracingPackVersion ?? ''}`);
  }
  if (reports.entryPreflight.exists && reports.entryPreflight.data?.summary?.preflightVersion !== ENTRY_PREFLIGHT_VERSION) {
    blockers.push(`ENTRY_PREFLIGHT_VERSION_MISMATCH:${reports.entryPreflight.data?.summary?.preflightVersion ?? ''}`);
  }
  if (reports.postwriteGate.exists && reports.postwriteGate.data?.summary?.gateVersion !== POSTWRITE_GATE_VERSION) {
    blockers.push(`POSTWRITE_GATE_VERSION_MISMATCH:${reports.postwriteGate.data?.summary?.gateVersion ?? ''}`);
  }

  const tracingRows = list(reports.tracingPack.data?.rows);
  const entryRows = list(reports.entrySheet.data?.rows);
  const postwriteRows = list(reports.postwriteGate.data?.rows);
  const tracingById = new Map(tracingRows.map((row) => [row.blockId, row]));
  const entryById = new Map(entryRows.map((row) => [row.blockId, row]));
  const postwriteById = new Map(postwriteRows.map((row) => [row.blockId, row]));
  const tracingIds = tracingRows.map((row) => row.blockId);
  const entryIds = entryRows.map((row) => row.blockId);
  const templateGateStatus = reports.templateGate.data?.summary?.status ?? '';
  const sourceCopyStatus = reports.sourceCopy.data?.summary?.status ?? '';
  const readyForSourceCopyGate = templateGateStatus === 'ready-for-source-copy'
    && ['ready-for-write-source-input', 'source-input-updated'].includes(sourceCopyStatus);

  if (tracingRows.length !== EXPECTED_BLOCK_IDS.length) {
    blockers.push(`TRACING_PACK_ROW_COUNT_MISMATCH:${tracingRows.length}:${EXPECTED_BLOCK_IDS.length}`);
  }
  if (entryRows.length !== EXPECTED_BLOCK_IDS.length) {
    blockers.push(`ENTRY_SHEET_ROW_COUNT_MISMATCH:${entryRows.length}:${EXPECTED_BLOCK_IDS.length}`);
  }
  if (tracingIds.join(' ') !== EXPECTED_BLOCK_IDS.join(' ')) {
    blockers.push(`TRACING_PACK_BLOCK_ORDER_MISMATCH:${tracingIds.join(' ')}`);
  }
  if (entryIds.join(' ') !== EXPECTED_BLOCK_IDS.join(' ')) {
    blockers.push(`ENTRY_SHEET_BLOCK_ORDER_MISMATCH:${entryIds.join(' ')}`);
  }

  [
    reports.tracingPack.data?.summary,
    reports.entrySheet.data?.summary,
    reports.entryPreflight.data?.summary,
    reports.postwriteGate.data?.summary,
  ].filter(Boolean).forEach((summary) => {
    if (summary.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TARGET_BATCH_MISMATCH:${summary.targetBatchId ?? ''}`);
    if (summary.productionWriteAllowed !== false) blockers.push(`PRODUCTION_WRITE_ALLOWED_NOT_FALSE:${summary.targetBatchId ?? ''}`);
    if (summary.writesProductionData !== false) blockers.push(`WRITES_PRODUCTION_DATA_NOT_FALSE:${summary.targetBatchId ?? ''}`);
  });

  const rows = EXPECTED_BLOCK_IDS.map((blockId) => {
    const tracingRow = tracingById.get(blockId) ?? {};
    const entryRow = entryById.get(blockId) ?? {};
    const postwriteRow = postwriteById.get(blockId) ?? {};
    const missingOperatorInputFields = list(entryRow.missingOperatorInputFields ?? tracingRow.missingOperatorInputFields);
    const rowStatus = postwriteRow.postwriteReady
      ? 'postwrite-verified'
      : missingOperatorInputFields.length === 0
        ? readyForSourceCopyGate ? 'ready-for-source-copy' : 'operator-input-needs-gate-fix'
        : 'waiting-for-operator';

    return {
      blockId,
      block: tracingRow.block ?? entryRow.block ?? postwriteRow.block ?? '',
      editableTarget: tracingRow.editableTarget ?? entryRow.editableTarget ?? '',
      templateJsonPointer: tracingRow.templateJsonPointer ?? '',
      tracingSvg: tracingRow.tracingSvg ?? '',
      evidenceCrop: tracingRow.evidenceCrop ?? entryRow.evidenceCrop ?? '',
      evidenceCropExists: tracingRow.evidenceCropExists === true,
      sourceDecision: postwriteRow.sourceDecision ?? entryRow.currentDecision ?? '',
      alignmentClass: postwriteRow.alignmentClass ?? '',
      renderLayer: postwriteRow.renderLayer ?? '',
      missingOperatorInputFields,
      rowStatus,
      nextOperatorAction: missingOperatorInputFields.length > 0
        ? `Fill ${missingOperatorInputFields.join(', ')} in ${tracingRow.editableTarget ?? entryRow.editableTarget ?? 'boundary template row'}.`
        : 'Run template gate and source-copy dry-run before production write.',
    };
  });

  const waitingRows = rows.filter((row) => row.rowStatus === 'waiting-for-operator');
  const readyRows = rows.filter((row) => row.rowStatus === 'ready-for-source-copy');
  const verifiedRows = rows.filter((row) => row.rowStatus === 'postwrite-verified');
  const needsGateFixRows = rows.filter((row) => row.rowStatus === 'operator-input-needs-gate-fix');
  const status = blockers.length > 0
    ? 'blocked'
    : verifiedRows.length === EXPECTED_BLOCK_IDS.length
      ? 'postwrite-verified'
      : readyRows.length === EXPECTED_BLOCK_IDS.length
        ? 'ready-for-source-copy'
        : needsGateFixRows.length > 0 && waitingRows.length === 0
          ? 'operator-input-needs-gate-fix'
          : 'ready-for-operator-tracing';

  if (waitingRows.length > 0) warnings.push(`P1_BOUNDARY_FIRST_OPERATOR_INPUT_REQUIRED:${waitingRows.length}:${rows.length}`);
  if (needsGateFixRows.length > 0) warnings.push(`P1_BOUNDARY_FIRST_OPERATOR_INPUT_NEEDS_GATE_FIX:${needsGateFixRows.length}:${rows.length}`);
  if (reports.postwriteGate.data?.summary?.status === 'waiting-for-operator') {
    warnings.push('P1_BOUNDARY_FIRST_POSTWRITE_GATE_WAITING_FOR_OPERATOR');
  }

  const summary = {
    handoffVersion: HANDOFF_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    totalRows: rows.length,
    waitingForOperatorRows: waitingRows.length,
    readyForSourceCopyRows: readyRows.length,
    operatorInputNeedsGateFixRows: needsGateFixRows.length,
    postwriteVerifiedRows: verifiedRows.length,
    tracingPackStatus: reports.tracingPack.data?.summary?.status ?? '',
    entryPreflightStatus: reports.entryPreflight.data?.summary?.status ?? '',
    templateGateStatus,
    sourceCopyStatus,
    postwriteGateStatus: reports.postwriteGate.data?.summary?.status ?? '',
    nextCommand: waitingRows.length > 0
      ? 'Fill reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-operator-template.json, then run npm run stadium:daegu:p1-boundary-first-template-gate.'
      : status === 'ready-for-source-copy'
        ? 'Run npm run stadium:daegu:p1-boundary-first-source-copy:write-source-input, then P1 prewrite/import/write gates.'
        : status === 'operator-input-needs-gate-fix'
          ? 'Run npm run stadium:daegu:p1-boundary-first-template-gate and fix reported blockers before source-copy.'
          : 'Run npm run stadium:daegu:operator-corrections-postwrite-gate.',
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
    sourceReports: Object.fromEntries(
      Object.entries(reports).map(([name, reportEntry]) => [name, reportEntry.relativePath]),
    ),
    safetyContract: [
      'This handoff is read-only.',
      'It aggregates boundary-first tracing, entry, template gate, source-copy, and postwrite status for operator work.',
      'It never writes operatorDecision, correctedPath, correctedLabelX/Y, reviewer, or reviewedAt.',
      'It never writes source input or the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'candidatePath is reference-only and must not be copied into correctedPath.',
    ],
    requiredOperatorFields: [
      'operatorDecision=APPROVED',
      'correctedPath',
      'correctedLabelX/Y',
      'reviewer',
      'reviewedAt',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-operator-handoff.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-operator-handoff.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-operator-handoff.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'block',
      'editableTarget',
      'rowStatus',
      'sourceDecision',
      'alignmentClass',
      'renderLayer',
      'missingOperatorInputFields',
      'tracingSvg',
      'evidenceCrop',
      'nextOperatorAction',
    ],
    ...rows.map((row) => [
      row.block,
      row.editableTarget,
      row.rowStatus,
      row.sourceDecision,
      row.alignmentClass,
      row.renderLayer,
      row.missingOperatorInputFields.join(' '),
      row.tracingSvg,
      row.evidenceCrop,
      row.nextOperatorAction,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P1 Boundary-First Operator Handoff',
    '',
    `- handoff version: \`${HANDOFF_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- waiting for operator: ${summary.waitingForOperatorRows}/${summary.totalRows}`,
    `- ready for source copy: ${summary.readyForSourceCopyRows}/${summary.totalRows}`,
    `- operator input needs gate fix: ${summary.operatorInputNeedsGateFixRows}/${summary.totalRows}`,
    `- postwrite verified: ${summary.postwriteVerifiedRows}/${summary.totalRows}`,
    `- next command: \`${summary.nextCommand}\``,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Required Operator Fields',
    '',
    ...report.requiredOperatorFields.map((field) => `- \`${field}\``),
    '',
    '## Rows',
    '',
    markdownTable(
      ['block', 'editable target', 'status', 'source decision', 'alignment', 'render layer', 'missing fields', 'tracing SVG', 'evidence crop', 'next action'],
      rows.map((row) => [
        `\`${row.block}\``,
        `\`${row.editableTarget}\``,
        `\`${row.rowStatus}\``,
        `\`${row.sourceDecision}\``,
        `\`${row.alignmentClass}\``,
        `\`${row.renderLayer}\``,
        row.missingOperatorInputFields.map((field) => `\`${field}\``).join(' ') || '-',
        `\`${row.tracingSvg}\``,
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

  console.log(`p1_boundary_first_operator_handoff_json:${jsonPath}`);
  console.log(`p1_boundary_first_operator_handoff_csv:${csvPath}`);
  console.log(`p1_boundary_first_operator_handoff_markdown:${markdownPath}`);
  console.log(`status:${summary.status} waiting=${summary.waitingForOperatorRows}/${summary.totalRows} readyForSourceCopy=${summary.readyForSourceCopyRows}/${summary.totalRows} needsGateFix=${summary.operatorInputNeedsGateFixRows}/${summary.totalRows} postwriteVerified=${summary.postwriteVerifiedRows}/${summary.totalRows}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1BoundaryFirstPacket = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP1ReportDir = path.join(defaultReportDir, 'daegu-p1-operator');

  const PACKET_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_PACKET_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const VIEWBOX = { width: 1707, height: 2048 };
  const EXPECTED_BLOCKS = ['T1-1', 'T3-2', 'V1', 'V2', 'V3'];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

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

  const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

  const numberText = (value) => (value === '' || value === null || value === undefined ? '' : String(value));

  const editableFieldsFrom = (row) => ({
    operatorDecision: normalizeDecision(row?.operatorDecision),
    correctedPath: String(row?.correctedPath ?? '').trim(),
    correctedLabelX: numberText(row?.correctedLabelX),
    correctedLabelY: numberText(row?.correctedLabelY),
    reviewer: String(row?.reviewer ?? '').trim(),
    reviewedAt: String(row?.reviewedAt ?? '').trim(),
    operatorNote: String(row?.operatorNote ?? '').trim(),
  });

  const isGeneratedRetraceNote = (note) => String(note ?? '').startsWith('No operator corrected path provided;');

  const hasOperatorFilledEditableFields = (row, defaultEditableRow = { operatorDecision: 'PENDING' }) => {
    const editable = editableFieldsFrom(row);
    const defaults = typeof defaultEditableRow === 'string'
      ? { operatorDecision: normalizeDecision(defaultEditableRow), operatorNote: '' }
      : editableFieldsFrom(defaultEditableRow);
    const hasDecisionOverride = editable.operatorDecision !== defaults.operatorDecision
      && ['APPROVED', 'REJECTED'].includes(editable.operatorDecision);
    const hasReviewMarker = Boolean(editable.reviewer)
      || Boolean(editable.reviewedAt)
      || (Boolean(editable.operatorNote)
        && editable.operatorNote !== defaults.operatorNote
        && !isGeneratedRetraceNote(editable.operatorNote));
    const hasCorrectedGeometry = Boolean(editable.correctedPath)
      || editable.correctedLabelX !== ''
      || editable.correctedLabelY !== '';
    return hasDecisionOverride || hasReviewMarker || hasCorrectedGeometry;
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const readinessPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-readiness.json');
  const inputPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json');
  const boundaryAidPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-input-aid.json');
  const nextActionPath = path.join(p1ReportDir, 'daegu-seatmap-p1-next-action-packet.json');
  const templateJsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-operator-template.json');

  const readiness = await readJson(readinessPath);
  const input = await readJson(inputPath);
  const boundaryAid = await readJson(boundaryAidPath);
  const nextAction = await readJson(nextActionPath);
  const existingOperatorTemplate = await readOptionalJson(templateJsonPath);

  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const existingTemplateRows = Array.isArray(existingOperatorTemplate?.corrections)
    ? existingOperatorTemplate.corrections
    : [];
  const boundaryAidRows = Array.isArray(boundaryAid.rows) ? boundaryAid.rows : [];
  const nextActionRows = Array.isArray(nextAction.rows) ? nextAction.rows : [];
  const readinessRows = Array.isArray(readiness.rows) ? readiness.rows : [];
  const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
  const existingTemplateByBlockId = new Map(existingTemplateRows.map((row) => [row.blockId, row]));
  const boundaryAidByBlockId = new Map(boundaryAidRows.map((row) => [row.target?.blockId, row]).filter(([blockId]) => blockId));
  const nextActionByBlockId = new Map(nextActionRows.map((row) => [row.blockId, row]));

  const blockers = [];
  const warnings = [];

  if (readiness.summary?.readinessVersion !== 'DAEGU_P1_BOUNDARY_FIRST_READINESS_V1') {
    blockers.push(`BOUNDARY_FIRST_READINESS_VERSION_MISMATCH:${readiness.summary?.readinessVersion ?? ''}`);
  }
  if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`P1_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  if (boundaryAid.summary?.inputAidVersion !== 'DAEGU_P1_BOUNDARY_INPUT_AID_V1') {
    blockers.push(`BOUNDARY_AID_VERSION_MISMATCH:${boundaryAid.summary?.inputAidVersion ?? ''}`);
  }
  if (nextAction.summary?.packetVersion !== 'DAEGU_P1_NEXT_ACTION_PACKET_V1') {
    blockers.push(`NEXT_ACTION_PACKET_VERSION_MISMATCH:${nextAction.summary?.packetVersion ?? ''}`);
  }
  if (readiness.summary?.missingEvidenceRows > 0) blockers.push(`BOUNDARY_FIRST_MISSING_EVIDENCE:${readiness.summary.missingEvidenceRows}`);
  if (readiness.summary?.missingContextRows > 0) blockers.push(`BOUNDARY_FIRST_MISSING_CONTEXT:${readiness.summary.missingContextRows}`);
  if (readiness.summary?.approvedInvalidRows > 0) blockers.push(`BOUNDARY_FIRST_APPROVED_INVALID:${readiness.summary.approvedInvalidRows}`);

  const rows = readinessRows.map((readinessRow, index) => {
    const inputRow = inputByBlockId.get(readinessRow.blockId) ?? {};
    const aidRow = boundaryAidByBlockId.get(readinessRow.blockId) ?? {};
    const actionRow = nextActionByBlockId.get(readinessRow.blockId) ?? {};
    const target = aidRow.target ?? {};
    const targetGeometry = aidRow.targetGeometryReference ?? {};
    const pairedGeometry = Array.isArray(aidRow.pairedGeometryReference) ? aidRow.pairedGeometryReference : [];
    const decision = normalizeDecision(inputRow.operatorDecision);

    if (!EXPECTED_BLOCKS.includes(readinessRow.block)) {
      blockers.push(`UNEXPECTED_BOUNDARY_FIRST_BLOCK:${readinessRow.block}`);
    }
    if (!targetGeometry.currentPath) blockers.push(`BOUNDARY_FIRST_TARGET_PATH_MISSING:${readinessRow.block}`);
    if (pairedGeometry.length === 0) blockers.push(`BOUNDARY_FIRST_PAIRED_CONTEXT_MISSING:${readinessRow.block}`);

    return {
      packetVersion: PACKET_VERSION,
      rowNumber: index + 1,
      blockId: readinessRow.blockId,
      block: readinessRow.block,
      name: readinessRow.name,
      category: readinessRow.category,
      status: readinessRow.status,
      decision,
      stage: actionRow.stage ?? readinessRow.stage,
      reviewType: readinessRow.reviewType,
      evidenceCrop: readinessRow.evidenceCrop,
      operatorFocus: actionRow.operatorFocus ?? readinessRow.operatorFocus,
      operatorAction: actionRow.operatorAction ?? readinessRow.operatorAction,
      approvalRule: target.approvalRule ?? actionRow.acceptance ?? readinessRow.approvalRule,
      currentFailureReasons: inputRow.officialFailureReasons ?? actionRow.officialFailureReasons ?? '',
      riskFlags: inputRow.riskFlags ?? actionRow.riskFlags ?? '',
      targetReference: {
        currentPath: targetGeometry.currentPath ?? inputRow.currentPath ?? '',
        currentLabelX: targetGeometry.labelX ?? inputRow.currentLabelX ?? '',
        currentLabelY: targetGeometry.labelY ?? inputRow.currentLabelY ?? '',
        currentPathPointCount: targetGeometry.currentPathPointCount ?? 0,
        candidatePath: targetGeometry.candidatePath ?? inputRow.candidatePath ?? '',
        candidatePathPointCount: targetGeometry.candidatePathPointCount ?? 0,
        candidateReferenceOnly: true,
        candidateStatus: targetGeometry.candidateStatus ?? inputRow.candidateStatus ?? '',
      },
      pairedNeighbors: pairedGeometry.map((paired) => ({
        blockId: paired.blockId,
        block: paired.block,
        name: paired.name,
        currentPath: paired.currentPath,
        currentLabelX: paired.labelX,
        currentLabelY: paired.labelY,
        labelTopHitBlock: paired.labelTopHitBlock,
        labelTopHitOk: paired.labelTopHitOk,
      })),
      sourceInput: path.relative(frontendRoot, inputPath),
      requiredApprovalFields: [
        'operatorDecision=APPROVED',
        'correctedPath',
        'correctedLabelX',
        'correctedLabelY',
        'reviewer',
        'reviewedAt',
      ],
      operatorTemplateDefaults: {
        operatorDecision: decision,
        correctedPath: inputRow.correctedPath ?? '',
        correctedLabelX: numberText(inputRow.correctedLabelX),
        correctedLabelY: numberText(inputRow.correctedLabelY),
        reviewer: inputRow.reviewer ?? '',
        reviewedAt: inputRow.reviewedAt ?? '',
        operatorNote: inputRow.operatorNote ?? '',
      },
    };
  });

  const templateRows = rows.map((row) => ({
    ...(() => {
      const existingTemplateRow = existingTemplateByBlockId.get(row.blockId);
      const shouldPreserveExistingTemplate = hasOperatorFilledEditableFields(
        existingTemplateRow,
        row.operatorTemplateDefaults,
      );
      const editableFields = editableFieldsFrom(
        shouldPreserveExistingTemplate ? existingTemplateRow : row.operatorTemplateDefaults,
      );

      return {
        blockId: row.blockId,
        block: row.block,
        name: row.name,
        category: row.category,
        sourceInput: row.sourceInput,
        readinessStatus: row.status,
        pairedBlocks: row.pairedNeighbors.map((paired) => paired.block).join(' '),
        evidenceCrop: row.evidenceCrop,
        editableSource: shouldPreserveExistingTemplate ? 'existingOperatorTemplate' : 'sourceInput',
        operatorDecision: editableFields.operatorDecision,
        correctedPath: editableFields.correctedPath,
        correctedLabelX: editableFields.correctedLabelX,
        correctedLabelY: editableFields.correctedLabelY,
        reviewer: editableFields.reviewer,
        reviewedAt: editableFields.reviewedAt,
        operatorNote: editableFields.operatorNote,
      };
    })(),
  }));

  if (rows.length !== EXPECTED_BLOCKS.length) blockers.push(`BOUNDARY_FIRST_PACKET_ROW_COUNT:${rows.length}:${EXPECTED_BLOCKS.length}`);
  if (templateRows.some((row) => !EXPECTED_BLOCKS.includes(row.block))) {
    blockers.push(`BOUNDARY_FIRST_TEMPLATE_HAS_UNEXPECTED_BLOCK:${templateRows.filter((row) => !EXPECTED_BLOCKS.includes(row.block)).map((row) => row.block).join(' ')}`);
  }

  const summary = {
    packetVersion: PACKET_VERSION,
    status: blockers.length > 0 ? 'blocked' : 'ready-for-operator',
    targetBatchId: TARGET_BATCH_ID,
    sourceReadiness: path.relative(frontendRoot, readinessPath),
    sourceInput: path.relative(frontendRoot, inputPath),
    existingOperatorTemplate: path.relative(frontendRoot, templateJsonPath),
    sourceBoundaryAid: path.relative(frontendRoot, boundaryAidPath),
    sourceNextAction: path.relative(frontendRoot, nextActionPath),
    totalRows: rows.length,
    readyForOperatorRows: rows.filter((row) => row.status === 'READY_FOR_OPERATOR').length,
    approvedValidRows: rows.filter((row) => row.status === 'APPROVED_VALID').length,
    approvedInvalidRows: rows.filter((row) => row.status === 'APPROVED_INVALID').length,
    missingEvidenceRows: rows.filter((row) => row.status === 'MISSING_EVIDENCE').length,
    missingContextRows: rows.filter((row) => row.status === 'MISSING_CONTEXT').length,
    existingTemplateRows: existingTemplateRows.length,
    preservedEditableRows: templateRows.filter((row) => row.editableSource === 'existingOperatorTemplate').length,
    sourceInputEditableRows: templateRows.filter((row) => row.editableSource === 'sourceInput').length,
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const packet = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'This boundary-first packet is read-only.',
      'It writes no operatorDecision or corrected fields into the source P1 input.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'candidatePath is reference-only and must not be copied into correctedPath.',
      'The operator template is copy/staging material only and productionWriteAllowed=false.',
      'Regenerating this packet must preserve operator-filled editable fields from the existing boundary-first operator template.',
    ],
    rows,
  };

  const template = {
    generatedAt: new Date().toISOString(),
    templateVersion: TEMPLATE_VERSION,
    targetBatchId: TARGET_BATCH_ID,
    sourcePacketVersion: PACKET_VERSION,
    sourcePacket: 'reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-packet.json',
    sourceInput: path.relative(frontendRoot, inputPath),
    templateOnly: true,
    productionWriteAllowed: false,
    allowedBlocks: EXPECTED_BLOCKS,
    editableFields: [
      'operatorDecision',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
      'operatorNote',
    ],
    corrections: templateRows,
  };

  const svgPathRows = rows.flatMap((row) => [
    ...row.pairedNeighbors.map((paired) => `<path d="${xmlEscape(paired.currentPath)}" fill="rgba(37,99,235,0.12)" stroke="#2563eb" stroke-width="3" vector-effect="non-scaling-stroke" data-kind="paired" data-block="${xmlEscape(paired.block)}" />`),
    row.targetReference.candidatePath
      ? `<path d="${xmlEscape(row.targetReference.candidatePath)}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="10 8" vector-effect="non-scaling-stroke" data-kind="candidate-reference-only" data-block="${xmlEscape(row.block)}" />`
      : '',
    `<path d="${xmlEscape(row.targetReference.currentPath)}" fill="rgba(220,38,38,0.22)" stroke="#dc2626" stroke-width="5" vector-effect="non-scaling-stroke" data-kind="target-current" data-block="${xmlEscape(row.block)}" />`,
    row.targetReference.currentLabelX && row.targetReference.currentLabelY
      ? `<circle cx="${xmlEscape(row.targetReference.currentLabelX)}" cy="${xmlEscape(row.targetReference.currentLabelY)}" r="8" fill="#dc2626" data-kind="target-label" data-block="${xmlEscape(row.block)}" />`
      : '',
    `<text x="24" y="${40 + (row.rowNumber * 34)}" font-family="Arial, sans-serif" font-size="24" fill="#111827">${xmlEscape(row.rowNumber)}. ${xmlEscape(row.block)} ${xmlEscape(row.status)}</text>`,
  ]);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" width="${VIEWBOX.width}" height="${VIEWBOX.height}">`,
    '<rect width="100%" height="100%" fill="#fff" />',
    '<g id="paired-neighbor-layer">',
    ...svgPathRows.filter(Boolean),
    '</g>',
    '<text x="24" y="32" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#111827">Daegu P1 boundary-first overlay: red=target, blue=paired, orange=candidate reference only</text>',
    '</svg>',
  ].join('\n');

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-packet.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-packet.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-packet.md');
  const svgPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-overlay.svg');
  const templateCsvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-operator-template.csv');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    ['block', 'status', 'decision', 'pairedBlocks', 'evidenceCrop', 'operatorFocus', 'approvalRule', 'riskFlags'],
    ...rows.map((row) => [
      row.block,
      row.status,
      row.decision,
      row.pairedNeighbors.map((paired) => paired.block).join(' '),
      row.evidenceCrop,
      row.operatorFocus,
      row.approvalRule,
      row.riskFlags,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P1 Boundary-First Packet',
    '',
    `- packet version: \`${PACKET_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- operator template: \`${path.relative(frontendRoot, templateJsonPath)}\``,
    `- overlay svg: \`${path.relative(frontendRoot, svgPath)}\``,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- preserved editable rows: ${summary.preservedEditableRows}`,
    '',
    '## Rows',
    '',
    markdownTable(
      ['block', 'status', 'paired', 'evidence', 'focus'],
      rows.map((row) => [
        `\`${row.block}\``,
        `\`${row.status}\``,
        row.pairedNeighbors.map((paired) => `\`${paired.block}\``).join(' '),
        row.evidenceCrop,
        row.operatorFocus,
      ]),
    ),
    '',
    '## Operator Rules',
    '',
    '1. 이 packet과 template은 source P1 input을 수정하지 않습니다.',
    '2. candidatePath는 reference-only이며 correctedPath로 복사하지 않습니다.',
    '3. operator template을 source input에 옮기기 전에는 `npm run stadium:daegu:p1-boundary-first-template-gate`를 실행합니다.',
    '4. 5개가 모두 `APPROVED_VALID`가 되기 전에는 다음 P1 stage로 넘어가지 않습니다.',
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
  await fs.writeFile(svgPath, `${svg}\n`, 'utf8');
  await fs.writeFile(templateJsonPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
  await writeCsv(templateCsvPath, [
    ['blockId', 'block', 'name', 'category', 'editableSource', 'operatorDecision', 'correctedPath', 'correctedLabelX', 'correctedLabelY', 'reviewer', 'reviewedAt', 'operatorNote', 'evidenceCrop', 'pairedBlocks'],
    ...templateRows.map((row) => [
      row.blockId,
      row.block,
      row.name,
      row.category,
      row.editableSource,
      row.operatorDecision,
      row.correctedPath,
      row.correctedLabelX,
      row.correctedLabelY,
      row.reviewer,
      row.reviewedAt,
      row.operatorNote,
      row.evidenceCrop,
      row.pairedBlocks,
    ]),
  ]);

  console.log(`p1_boundary_first_packet_json:${jsonPath}`);
  console.log(`p1_boundary_first_packet_csv:${csvPath}`);
  console.log(`p1_boundary_first_packet_markdown:${markdownPath}`);
  console.log(`p1_boundary_first_overlay_svg:${svgPath}`);
  console.log(`p1_boundary_first_operator_template_json:${templateJsonPath}`);
  console.log(`status:${summary.status} rows=${summary.totalRows} ready=${summary.readyForOperatorRows} approvedValid=${summary.approvedValidRows} preservedEditable=${summary.preservedEditableRows}`);

  if (summary.status !== 'ready-for-operator') {
    process.exitCode = 1;
  }
};

const runP1BoundaryFirstPostwriteGate = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP1ReportDir = path.join(defaultReportDir, 'daegu-p1-operator');

  const GATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_POSTWRITE_GATE_V1';
  const IMAGE_APPROVAL_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_IMAGE_APPROVED_V1';
  const IMAGE_APPROVED_GEOMETRY_VERSION = 'daegu-p1-boundary-first-image-approved-v1';
  const OFFICIAL_IMAGE_SHA256 = '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const EXPECTED_BLOCK_IDS = [
    'daegu-first-table-t1-1',
    'daegu-third-table-t3-2',
    'daegu-central-table-v-v1',
    'daegu-central-table-v-v2',
    'daegu-central-table-v-v3',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const hasFlag = (name) => process.argv.includes(name);

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

  const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

  const shortHash = (value) => crypto
    .createHash('sha256')
    .update(String(value ?? ''))
    .digest('hex')
    .slice(0, 12);

  const numberOrZero = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const requireWritten = hasFlag('--require-written');

  const reports = {
    sourceInput: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json')),
    sourceCopy: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-source-copy.json')),
    imageApproval: await readJsonReport(path.join(p1ReportDir, 'boundary-analysis/daegu-p1-boundary-first-image-approved-patch.json')),
    p1Readiness: await readJsonReport(path.join(p1ReportDir, 'daegu-seatmap-p1-operator-readiness.json')),
    validation: await readJsonReport(path.join(reportDir, 'daegu-seatmap-operator-corrections-validation.json')),
    apply: await readJsonReport(path.join(reportDir, 'daegu-seatmap-operator-corrections-apply.json')),
    alignment: await readJsonReport(path.join(reportDir, 'daegu-seatmap-alignment-audit.json')),
    renderSafety: await readJsonReport(path.join(reportDir, 'daegu-seatmap-render-safety-audit.json')),
  };

  const sourceInputRows = Array.isArray(reports.sourceInput.data?.corrections)
    ? reports.sourceInput.data.corrections
    : [];
  const validationRows = Array.isArray(reports.validation.data?.rows)
    ? reports.validation.data.rows
    : [];
  const applyRows = Array.isArray(reports.apply.data?.rows) ? reports.apply.data.rows : [];
  const alignmentRows = Array.isArray(reports.alignment.data?.blocks) ? reports.alignment.data.blocks : [];
  const renderRows = Array.isArray(reports.renderSafety.data?.rows) ? reports.renderSafety.data.rows : [];
  const imageApprovalRows = Array.isArray(reports.imageApproval.data?.rows)
    ? reports.imageApproval.data.rows
    : [];

  const sourceByBlockId = new Map(sourceInputRows.map((row) => [row.blockId, row]));
  const imageApprovalByBlockId = new Map(imageApprovalRows.map((row) => [row.blockId, row]));
  const validationByBlockId = new Map(validationRows.map((row) => [row.blockId, row]));
  const applyByBlockId = new Map(applyRows.map((row) => [row.blockId, row]));
  const alignmentByBlockId = new Map(alignmentRows.map((row) => [row.id, row]));
  const renderByBlockId = new Map(renderRows.map((row) => [row.blockId, row]));
  const blockById = new Map(DAEGU_BLOCKS.map((block) => [block.id, block]));

  const sourceBoundaryRows = EXPECTED_BLOCK_IDS.map((blockId) => sourceByBlockId.get(blockId)).filter(Boolean);
  const approvedSourceRows = sourceBoundaryRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const imageBoundaryRows = EXPECTED_BLOCK_IDS.map((blockId) => imageApprovalByBlockId.get(blockId)).filter(Boolean);
  const approvedImageRows = imageBoundaryRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const approvedValidationRows = validationRows.filter((row) => row.operatorDecision === 'APPROVED');
  const approvedBoundaryValidationRows = approvedValidationRows.filter((row) => EXPECTED_BLOCK_IDS.includes(row.blockId));
  const approvedNonBoundaryRows = approvedValidationRows.filter((row) => !EXPECTED_BLOCK_IDS.includes(row.blockId));
  const applyBoundaryRows = applyRows.filter((row) => EXPECTED_BLOCK_IDS.includes(row.blockId));

  const blockers = [];
  const warnings = [];
  const imageApprovalBlockers = [];

  if (reports.imageApproval.exists) {
    if (reports.imageApproval.data?.approvalVersion !== IMAGE_APPROVAL_VERSION) {
      imageApprovalBlockers.push(`IMAGE_APPROVAL_VERSION_MISMATCH:${reports.imageApproval.data?.approvalVersion ?? ''}`);
    }
    if (reports.imageApproval.data?.sourceImageSha256 !== OFFICIAL_IMAGE_SHA256) {
      imageApprovalBlockers.push(`IMAGE_APPROVAL_SHA256_MISMATCH:${reports.imageApproval.data?.sourceImageSha256 ?? ''}`);
    }
    if (imageBoundaryRows.length !== EXPECTED_BLOCK_IDS.length) {
      imageApprovalBlockers.push(`IMAGE_APPROVAL_BOUNDARY_ROW_COUNT_MISMATCH:${imageBoundaryRows.length}:${EXPECTED_BLOCK_IDS.length}`);
    }
    if (approvedImageRows.length !== EXPECTED_BLOCK_IDS.length) {
      imageApprovalBlockers.push(`IMAGE_APPROVAL_REQUIRES_FIVE_APPROVED_ROWS:${approvedImageRows.length}:${EXPECTED_BLOCK_IDS.length}`);
    }
    imageBoundaryRows.forEach((row) => {
      if (!row.correctedPath) imageApprovalBlockers.push(`IMAGE_APPROVAL_CORRECTED_PATH_MISSING:${row.blockId ?? ''}`);
      if (!Number.isFinite(Number(row.correctedLabelX))) imageApprovalBlockers.push(`IMAGE_APPROVAL_CORRECTED_LABEL_X_MISSING:${row.blockId ?? ''}`);
      if (!Number.isFinite(Number(row.correctedLabelY))) imageApprovalBlockers.push(`IMAGE_APPROVAL_CORRECTED_LABEL_Y_MISSING:${row.blockId ?? ''}`);
      if (!row.reviewer) imageApprovalBlockers.push(`IMAGE_APPROVAL_REVIEWER_MISSING:${row.blockId ?? ''}`);
      if (!row.reviewedAt) imageApprovalBlockers.push(`IMAGE_APPROVAL_REVIEWED_AT_MISSING:${row.blockId ?? ''}`);
    });
  }

  const imageApprovalReady = reports.imageApproval.exists
    && imageApprovalBlockers.length === 0
    && approvedImageRows.length === EXPECTED_BLOCK_IDS.length;
  const sourceApprovalMode = approvedSourceRows.length > 0;
  const imageApprovalMode = !sourceApprovalMode && imageApprovalReady;

  if (!imageApprovalMode) {
    if (!reports.sourceInput.exists) blockers.push(`MISSING_REPORT:${reports.sourceInput.relativePath}`);
    if (reports.sourceInput.exists && reports.sourceInput.data?.targetBatchId !== TARGET_BATCH_ID) {
      blockers.push(`SOURCE_INPUT_BATCH_MISMATCH:${reports.sourceInput.data?.targetBatchId ?? ''}`);
    }
    if (sourceBoundaryRows.length !== EXPECTED_BLOCK_IDS.length) {
      blockers.push(`SOURCE_INPUT_BOUNDARY_ROW_COUNT_MISMATCH:${sourceBoundaryRows.length}:${EXPECTED_BLOCK_IDS.length}`);
    }
    if (reports.imageApproval.exists) {
      blockers.push(...imageApprovalBlockers);
    }
  }

  if (!sourceApprovalMode && !imageApprovalMode) {
    warnings.push('P1_BOUNDARY_FIRST_WAITING_FOR_OPERATOR_APPROVALS');
  } else {
    const requiredReports = imageApprovalMode
      ? {
        imageApproval: reports.imageApproval,
        alignment: reports.alignment,
        renderSafety: reports.renderSafety,
      }
      : reports;

    Object.entries(requiredReports).forEach(([key, report]) => {
      if (!report.exists) blockers.push(`MISSING_REPORT:${key}:${report.relativePath}`);
    });

    if (sourceApprovalMode && approvedSourceRows.length !== EXPECTED_BLOCK_IDS.length) {
      blockers.push(`P1_BOUNDARY_FIRST_REQUIRES_FIVE_APPROVED_SOURCE_ROWS:${approvedSourceRows.length}:${EXPECTED_BLOCK_IDS.length}`);
    }
    if (sourceApprovalMode && !['source-input-updated', 'ready-for-write-source-input'].includes(reports.sourceCopy.data?.summary?.status ?? '')) {
      blockers.push(`SOURCE_COPY_NOT_READY_OR_UPDATED:${reports.sourceCopy.data?.summary?.status ?? ''}`);
    }
    if (sourceApprovalMode && reports.p1Readiness.exists && reports.p1Readiness.data?.summary?.approvedRows !== approvedSourceRows.length) {
      blockers.push(`P1_READINESS_APPROVED_ROWS_MISMATCH:${reports.p1Readiness.data?.summary?.approvedRows ?? ''}:${approvedSourceRows.length}`);
    }
    if (sourceApprovalMode && reports.validation.data?.summary?.status !== 'ok') {
      blockers.push(`VALIDATION_STATUS_NOT_OK:${reports.validation.data?.summary?.status ?? ''}`);
    }
    if (sourceApprovalMode && numberOrZero(reports.validation.data?.summary?.approvedRows) !== EXPECTED_BLOCK_IDS.length) {
      blockers.push(`VALIDATION_APPROVED_ROWS_NOT_BOUNDARY_FIVE:${reports.validation.data?.summary?.approvedRows ?? ''}:${EXPECTED_BLOCK_IDS.length}`);
    }
    if (sourceApprovalMode && approvedBoundaryValidationRows.length !== EXPECTED_BLOCK_IDS.length) {
      blockers.push(`VALIDATION_BOUNDARY_APPROVED_ROWS_MISMATCH:${approvedBoundaryValidationRows.length}:${EXPECTED_BLOCK_IDS.length}`);
    }
    if (sourceApprovalMode && approvedNonBoundaryRows.length > 0) {
      blockers.push(`VALIDATION_HAS_NON_BOUNDARY_APPROVED_ROWS:${approvedNonBoundaryRows.map((row) => row.block ?? row.blockId).join(' ')}`);
    }
    if (sourceApprovalMode && reports.apply.data?.summary?.status !== 'ok') {
      blockers.push(`APPLY_STATUS_NOT_OK:${reports.apply.data?.summary?.status ?? ''}`);
    }
    if (sourceApprovalMode && reports.apply.data?.summary?.mode !== 'write') {
      blockers.push(`APPLY_REPORT_NOT_WRITE_MODE:${reports.apply.data?.summary?.mode ?? ''}`);
    }
    if (sourceApprovalMode && reports.apply.data?.summary?.dataFileChanged !== true) {
      blockers.push('APPLY_WRITE_DID_NOT_CHANGE_DATA_FILE');
    }
    if (sourceApprovalMode && numberOrZero(reports.apply.data?.summary?.plannedRows) !== EXPECTED_BLOCK_IDS.length) {
      blockers.push(`APPLY_PLANNED_ROWS_NOT_BOUNDARY_FIVE:${reports.apply.data?.summary?.plannedRows ?? ''}:${EXPECTED_BLOCK_IDS.length}`);
    }
    if (sourceApprovalMode && applyBoundaryRows.length !== EXPECTED_BLOCK_IDS.length) {
      blockers.push(`APPLY_BOUNDARY_ROWS_MISMATCH:${applyBoundaryRows.length}:${EXPECTED_BLOCK_IDS.length}`);
    }
    if (reports.alignment.data?.summary?.officialAlignmentFailures !== 0) {
      blockers.push(`ALIGNMENT_OFFICIAL_FAILURES:${reports.alignment.data?.summary?.officialAlignmentFailures ?? ''}`);
    }
    if (reports.renderSafety.data?.status !== 'ui-contained') {
      blockers.push(`RENDER_SAFETY_STATUS_NOT_UI_CONTAINED:${reports.renderSafety.data?.status ?? ''}`);
    }
  }

  const rows = EXPECTED_BLOCK_IDS.map((blockId) => {
    const sourceRow = sourceByBlockId.get(blockId) ?? {};
    const imageApprovalRow = imageApprovalByBlockId.get(blockId) ?? {};
    const validationRow = validationByBlockId.get(blockId) ?? {};
    const applyRow = applyByBlockId.get(blockId) ?? {};
    const alignmentRow = alignmentByBlockId.get(blockId) ?? {};
    const renderRow = renderByBlockId.get(blockId) ?? {};
    const block = blockById.get(blockId);
    const sourceDecision = normalizeDecision(sourceRow.operatorDecision);
    const approvedInSource = sourceDecision === 'APPROVED';
    const imageDecision = normalizeDecision(imageApprovalRow.operatorDecision);
    const approvedInImage = imageApprovalMode && imageDecision === 'APPROVED';
    const rowBlockers = [];

    if (!block) rowBlockers.push('CURRENT_BLOCK_NOT_FOUND');

    if (approvedInSource || approvedInImage) {
      if (approvedInSource) {
        if (validationRow.operatorDecision !== 'APPROVED') rowBlockers.push('VALIDATION_APPROVED_ROW_MISSING');
        if (validationRow.validForApproval !== true) rowBlockers.push('VALIDATION_ROW_NOT_VALID_FOR_APPROVAL');
        if (!applyRow.blockId) rowBlockers.push('APPLY_ROW_MISSING');
      }
      if (block?.traceStatus !== 'OFFICIAL_IMAGE_TRACED') rowBlockers.push(`TRACE_STATUS_NOT_OFFICIAL:${block?.traceStatus ?? ''}`);
      if (block?.traceMethod !== 'PATH_TRACED_FROM_OFFICIAL_IMAGE') rowBlockers.push(`TRACE_METHOD_NOT_OFFICIAL_PATH:${block?.traceMethod ?? ''}`);
      if (block?.sourceConfidence !== 'OFFICIAL') rowBlockers.push(`SOURCE_CONFIDENCE_NOT_OFFICIAL:${block?.sourceConfidence ?? ''}`);
      if (block?.imageGeometry.manualReviewed !== true) rowBlockers.push('MANUAL_REVIEWED_NOT_TRUE');
      if (block?.imageGeometry.pixelAlignmentStatus !== 'PIXEL_ALIGNED') {
        rowBlockers.push(`PIXEL_ALIGNMENT_NOT_ALIGNED:${block?.imageGeometry.pixelAlignmentStatus ?? ''}`);
      }
      if (block && !isDaeguNormalSelectableSeat(block)) rowBlockers.push('NORMAL_SELECTABLE_PREDICATE_FALSE');
      if (approvedInSource && applyRow.newPathHash && block && shortHash(block.imageGeometry.d) !== applyRow.newPathHash) {
        rowBlockers.push(`CURRENT_PATH_HASH_MISMATCH:${shortHash(block.imageGeometry.d)}:${applyRow.newPathHash}`);
      }
      if (approvedInSource && applyRow.newLabel && block && `${block.imageGeometry.labelX},${block.imageGeometry.labelY}` !== applyRow.newLabel) {
        rowBlockers.push(`CURRENT_LABEL_MISMATCH:${block.imageGeometry.labelX},${block.imageGeometry.labelY}:${applyRow.newLabel}`);
      }
      if (approvedInImage) {
        if (block?.imageGeometry.geometryVersion !== IMAGE_APPROVED_GEOMETRY_VERSION) {
          rowBlockers.push(`GEOMETRY_VERSION_NOT_IMAGE_APPROVED:${block?.imageGeometry.geometryVersion ?? ''}`);
        }
        if (block && imageApprovalRow.correctedPath && shortHash(block.imageGeometry.d) !== shortHash(imageApprovalRow.correctedPath)) {
          rowBlockers.push(`CURRENT_IMAGE_APPROVAL_PATH_HASH_MISMATCH:${shortHash(block.imageGeometry.d)}:${shortHash(imageApprovalRow.correctedPath)}`);
        }
        const imageLabel = `${Number(imageApprovalRow.correctedLabelX)},${Number(imageApprovalRow.correctedLabelY)}`;
        if (block && imageApprovalRow.correctedLabelX !== undefined && imageApprovalRow.correctedLabelY !== undefined) {
          const labelMatches = Math.abs(Number(block.imageGeometry.labelX) - Number(imageApprovalRow.correctedLabelX)) <= 0.001
            && Math.abs(Number(block.imageGeometry.labelY) - Number(imageApprovalRow.correctedLabelY)) <= 0.001;
          if (!labelMatches) {
            rowBlockers.push(`CURRENT_IMAGE_APPROVAL_LABEL_MISMATCH:${block.imageGeometry.labelX},${block.imageGeometry.labelY}:${imageLabel}`);
          }
        }
      }
      if (alignmentRow.alignmentClass !== 'LOCKED_VERIFIED') {
        rowBlockers.push(`ALIGNMENT_CLASS_NOT_LOCKED_VERIFIED:${alignmentRow.alignmentClass ?? ''}`);
      }
      if (alignmentRow.labelInsideCurrentPath !== true) rowBlockers.push('ALIGNMENT_LABEL_NOT_INSIDE_PATH');
      if (alignmentRow.labelTopHitOk !== true) rowBlockers.push(`ALIGNMENT_LABEL_TOP_HIT_FAILED:${alignmentRow.labelTopHitBlockId ?? ''}`);
      if (Array.isArray(alignmentRow.officialFailureReasons) && alignmentRow.officialFailureReasons.length > 0) {
        rowBlockers.push(`ALIGNMENT_OFFICIAL_FAILURE_REASONS:${alignmentRow.officialFailureReasons.join(' ')}`);
      }
      if (renderRow.normalUiSelectable === false) rowBlockers.push('RENDER_SAFETY_NOT_NORMAL_SELECTABLE');
      if (renderRow.renderLayer && renderRow.renderLayer !== 'normal-seat') {
        rowBlockers.push(`RENDER_LAYER_NOT_NORMAL_SEAT:${renderRow.renderLayer}`);
      }
    } else if (block?.traceStatus === 'OFFICIAL_IMAGE_TRACED') {
      rowBlockers.push('BOUNDARY_ROW_PROMOTED_WITHOUT_SOURCE_APPROVAL');
    }

    return {
      blockId,
      block: block?.block ?? sourceRow.block ?? validationRow.block ?? '',
      approvedInSource,
      approvedInImage,
      sourceDecision,
      imageDecision,
      validationApproved: validationRow.operatorDecision === 'APPROVED',
      validationValid: validationRow.validForApproval === true,
      appliedByWrite: reports.apply.data?.summary?.mode === 'write' && Boolean(applyRow.blockId),
      currentTraceStatus: block?.traceStatus ?? '',
      currentTraceMethod: block?.traceMethod ?? '',
      normalSelectable: block ? isDaeguNormalSelectableSeat(block) : false,
      alignmentClass: alignmentRow.alignmentClass ?? '',
      labelTopHitOk: alignmentRow.labelTopHitOk ?? null,
      renderLayer: renderRow.renderLayer ?? '',
      normalUiSelectable: renderRow.normalUiSelectable ?? null,
      rowBlockers,
    };
  });

  rows.forEach((row) => {
    row.rowBlockers.forEach((blocker) => blockers.push(`${blocker}:${row.block}`));
  });

  const approvalMode = sourceApprovalMode
    ? 'source-copy'
    : imageApprovalMode
      ? 'image-approved'
      : 'waiting-for-operator';
  const postwriteVerified = blockers.length === 0 && (approvedSourceRows.length === EXPECTED_BLOCK_IDS.length || imageApprovalMode);
  const status = blockers.length > 0
    ? 'blocked'
    : postwriteVerified
      ? 'postwrite-verified'
      : 'waiting-for-operator';
  const summary = {
    gateVersion: GATE_VERSION,
    status,
    postwriteVerified,
    approvalMode,
    requireWritten,
    targetBatchId: TARGET_BATCH_ID,
    totalBoundaryRows: EXPECTED_BLOCK_IDS.length,
    sourceBoundaryRows: sourceBoundaryRows.length,
    approvedSourceRows: approvedSourceRows.length,
    imageApprovalRows: imageBoundaryRows.length,
    approvedImageRows: approvedImageRows.length,
    imageApprovalReady,
    imageApprovalVersion: reports.imageApproval.data?.approvalVersion ?? '',
    imageApprovedGeometryVersion: IMAGE_APPROVED_GEOMETRY_VERSION,
    imageApprovalBlockers,
    validationApprovedRows: numberOrZero(reports.validation.data?.summary?.approvedRows),
    boundaryValidationApprovedRows: approvedBoundaryValidationRows.length,
    nonBoundaryValidationApprovedRows: approvedNonBoundaryRows.length,
    applyMode: reports.apply.data?.summary?.mode ?? '',
    applyStatus: reports.apply.data?.summary?.status ?? '',
    applyPlannedRows: numberOrZero(reports.apply.data?.summary?.plannedRows),
    applyBoundaryRows: applyBoundaryRows.length,
    dataFileChanged: reports.apply.data?.summary?.dataFileChanged === true,
    alignmentOfficialFailures: numberOrZero(reports.alignment.data?.summary?.officialAlignmentFailures),
    renderSafetyStatus: reports.renderSafety.data?.status ?? '',
    productionWriteAllowed: false,
    writesSourceInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
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
    rows,
    safetyContract: [
      'This gate is read-only and never modifies source input, corrections template, or src/data/daeguSeatData.ts.',
      'It verifies only the five P1 boundary-first rows: T1-1, T3-2, V1, V2, and V3.',
      'If no boundary-first source rows are APPROVED and no image-approved artifact is valid, status stays waiting-for-operator and production data must not be changed.',
      'If boundary-first source rows are APPROVED, all five rows must already be written and verified before this gate passes.',
      'If DAEGU_P1_BOUNDARY_FIRST_IMAGE_APPROVED_V1 is valid, all five rows must match the approved path hash, label, geometryVersion, alignment, and normal selectable state before this gate passes.',
      'Approved rows must be OFFICIAL_IMAGE_TRACED, PATH_TRACED_FROM_OFFICIAL_IMAGE, manualReviewed=true, PIXEL_ALIGNED, normal selectable, and LOCKED_VERIFIED.',
      'Rows without source-copy approval or image-approved artifact approval must not be promoted to OFFICIAL_IMAGE_TRACED.',
    ],
  };

  const jsonPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-postwrite-gate.json');
  const csvPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-postwrite-gate.csv');
  const markdownPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-postwrite-gate.md');

  await fs.mkdir(p1ReportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'block',
      'approvedInSource',
      'approvedInImage',
      'sourceDecision',
      'imageDecision',
      'validationApproved',
      'validationValid',
      'appliedByWrite',
      'currentTraceStatus',
      'currentTraceMethod',
      'normalSelectable',
      'alignmentClass',
      'labelTopHitOk',
      'renderLayer',
      'normalUiSelectable',
      'rowBlockers',
    ],
    ...rows.map((row) => [
      row.block,
      row.approvedInSource,
      row.approvedInImage,
      row.sourceDecision,
      row.imageDecision,
      row.validationApproved,
      row.validationValid,
      row.appliedByWrite,
      row.currentTraceStatus,
      row.currentTraceMethod,
      row.normalSelectable,
      row.alignmentClass,
      row.labelTopHitOk,
      row.renderLayer,
      row.normalUiSelectable,
      row.rowBlockers.join(' '),
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P1 Boundary-First Postwrite Gate',
    '',
    `- gate version: \`${summary.gateVersion}\``,
    `- status: \`${summary.status}\``,
    `- approval mode: \`${summary.approvalMode}\``,
    `- postwrite verified: ${summary.postwriteVerified}`,
    `- approved source rows: ${summary.approvedSourceRows}/${summary.totalBoundaryRows}`,
    `- approved image rows: ${summary.approvedImageRows}/${summary.totalBoundaryRows}`,
    `- image approval ready: ${summary.imageApprovalReady}`,
    `- validation approved rows: ${summary.validationApprovedRows}`,
    `- boundary validation approved rows: ${summary.boundaryValidationApprovedRows}`,
    `- non-boundary validation approved rows: ${summary.nonBoundaryValidationApprovedRows}`,
    `- apply mode: \`${summary.applyMode || 'none'}\``,
    `- apply planned rows: ${summary.applyPlannedRows}`,
    `- apply boundary rows: ${summary.applyBoundaryRows}`,
    `- data file changed: ${summary.dataFileChanged}`,
    `- alignment official failures: ${summary.alignmentOfficialFailures}`,
    `- render safety status: \`${summary.renderSafetyStatus || 'none'}\``,
    '',
    '## Rows',
    '',
    markdownTable(
      [
        'block',
        'source approved',
        'image approved',
        'validation valid',
        'applied',
        'trace status',
        'normal selectable',
        'alignment',
        'render layer',
        'blockers',
      ],
      rows.map((row) => [
        `\`${row.block}\``,
        String(row.approvedInSource),
        String(row.approvedInImage),
        String(row.validationValid),
        String(row.appliedByWrite),
        `\`${row.currentTraceStatus}/${row.currentTraceMethod}\``,
        String(row.normalSelectable),
        `\`${row.alignmentClass || '-'}\``,
        `\`${row.renderLayer || '-'}\``,
        row.rowBlockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
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
    '## Gate',
    '',
    '1. source-copy 승인 row가 있으면 다섯 boundary-first row 전체가 source input, validation, apply write, alignment, render-safety에서 일치해야 합니다.',
    '2. source-copy 승인 row가 없더라도 `DAEGU_P1_BOUNDARY_FIRST_IMAGE_APPROVED_V1` artifact가 다섯 row를 모두 승인하면 image-approved mode로 검증할 수 있습니다.',
    '3. image-approved mode는 현재 production path hash, label, geometryVersion, alignment, normal selectable 상태가 승인 artifact와 일치해야 통과합니다.',
    '4. 승인 artifact가 없는 boundary-first row가 `OFFICIAL_IMAGE_TRACED`로 승격되면 차단합니다.',
    '5. 이 gate는 read-only이며 `src/data/daeguSeatData.ts`를 수정하지 않습니다.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p1_boundary_first_postwrite_gate_json:${jsonPath}`);
  console.log(`p1_boundary_first_postwrite_gate_csv:${csvPath}`);
  console.log(`p1_boundary_first_postwrite_gate_markdown:${markdownPath}`);
  console.log(
    [
      `status:${summary.status}`,
      `approvalMode=${summary.approvalMode}`,
      `sourceApproved=${summary.approvedSourceRows}/${summary.totalBoundaryRows}`,
      `imageApproved=${summary.approvedImageRows}/${summary.totalBoundaryRows}`,
      `postwriteVerified=${summary.postwriteVerified}`,
      `blockers=${summary.blockers.length}`,
    ].join(' '),
  );

  if (summary.status === 'blocked' || (requireWritten && !summary.postwriteVerified)) {
    process.exitCode = 1;
  }
};

const runP1BoundaryFirstReadiness = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP1ReportDir = path.join(defaultReportDir, 'daegu-p1-operator');

  const READINESS_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_READINESS_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const INPUT_PACKAGE_VERSION = 'DAEGU_P1_OPERATOR_PACKAGE_V1';
  const BOUNDARY_AID_VERSION = 'DAEGU_P1_BOUNDARY_INPUT_AID_V1';
  const NEXT_ACTION_PACKET_VERSION = 'DAEGU_P1_NEXT_ACTION_PACKET_V1';
  const VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';
  const REQUIRED_STAGE = 'PAIR_BOUNDARY_FIRST';
  const REQUIRED_APPROVAL_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ];
  const EXPECTED_BOUNDARY_ROWS = [
    {
      blockId: 'daegu-first-table-t1-1',
      block: 'T1-1',
      pairedBlocks: ['T1-2', 'TC-1'],
      reviewType: 'PAIRED_RELABEL_BOUNDARY_REVIEW',
    },
    {
      blockId: 'daegu-third-table-t3-2',
      block: 'T3-2',
      pairedBlocks: ['T3-1', 'T3-3', 'T3-4', 'TC-3'],
      reviewType: 'PAIRED_RELABEL_BOUNDARY_REVIEW',
    },
    {
      blockId: 'daegu-central-table-v-v1',
      block: 'V1',
      pairedBlocks: ['V2', 'TC-1', 'TC-2'],
      reviewType: 'MANUAL_NON_OVERLAP_SPLIT_REQUIRED',
    },
    {
      blockId: 'daegu-central-table-v-v2',
      block: 'V2',
      pairedBlocks: ['V1', 'V3', 'T3-2', 'T3-3'],
      reviewType: 'MANUAL_NON_OVERLAP_SPLIT_REQUIRED',
    },
    {
      blockId: 'daegu-central-table-v-v3',
      block: 'V3',
      pairedBlocks: ['V1', 'V2', 'T3-3', 'T3-1'],
      reviewType: 'MANUAL_NON_OVERLAP_SPLIT_REQUIRED',
    },
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

  const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

  const normalizePath = (pathData) => String(pathData ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toUpperCase();

  const isBlank = (value) => String(value ?? '').trim() === '';

  const sorted = (values) => [...values].sort((a, b) => a.localeCompare(b, 'ko'));

  const sameStringSet = (left, right) => {
    const leftSorted = sorted(left);
    const rightSorted = sorted(right);
    return leftSorted.length === rightSorted.length
      && leftSorted.every((value, index) => value === rightSorted[index]);
  };

  const classifyStatus = ({ decision, evidenceMissing, contextMissing, approvedInvalid }) => {
    if (decision === 'APPROVED') return approvedInvalid ? 'APPROVED_INVALID' : 'APPROVED_VALID';
    if (evidenceMissing) return 'MISSING_EVIDENCE';
    if (contextMissing) return 'MISSING_CONTEXT';
    return 'READY_FOR_OPERATOR';
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const inputPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json');
  const boundaryAidPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-input-aid.json');
  const nextActionPath = path.join(p1ReportDir, 'daegu-seatmap-p1-next-action-packet.json');
  const validationPath = path.join(p1ReportDir, 'daegu-seatmap-operator-corrections-validation.json');

  const reports = {
    input: await readJsonReport(inputPath),
    boundaryAid: await readJsonReport(boundaryAidPath),
    nextAction: await readJsonReport(nextActionPath),
    validation: await readJsonReport(validationPath),
  };

  const input = reports.input.data ?? {};
  const boundaryAid = reports.boundaryAid.data ?? {};
  const nextAction = reports.nextAction.data ?? {};
  const validation = reports.validation.data ?? {};
  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const boundaryAidRows = Array.isArray(boundaryAid.rows) ? boundaryAid.rows : [];
  const nextActionRows = Array.isArray(nextAction.rows) ? nextAction.rows : [];
  const validationRows = Array.isArray(validation.rows) ? validation.rows : [];
  const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
  const boundaryAidByBlockId = new Map(boundaryAidRows.map((row) => [row.target?.blockId, row]).filter(([blockId]) => blockId));
  const nextActionByBlockId = new Map(nextActionRows.map((row) => [row.blockId, row]));
  const validationByBlockId = new Map(validationRows.map((row) => [row.blockId, row]));

  const blockers = [];
  const warnings = [];

  Object.values(reports).forEach((report) => {
    if (!report.exists) blockers.push(`MISSING_REPORT:${report.relativePath}`);
  });

  if (reports.input.exists && input.packageVersion !== INPUT_PACKAGE_VERSION) {
    blockers.push(`P1_INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  }
  if (reports.input.exists && input.targetBatchId !== TARGET_BATCH_ID) {
    blockers.push(`P1_INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  }
  if (reports.input.exists && input.productionWriteAllowed !== false) {
    blockers.push('P1_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  }
  if (reports.boundaryAid.exists && boundaryAid.summary?.inputAidVersion !== BOUNDARY_AID_VERSION) {
    blockers.push(`P1_BOUNDARY_AID_VERSION_MISMATCH:${boundaryAid.summary?.inputAidVersion ?? ''}`);
  }
  if (reports.nextAction.exists && nextAction.summary?.packetVersion !== NEXT_ACTION_PACKET_VERSION) {
    blockers.push(`P1_NEXT_ACTION_PACKET_VERSION_MISMATCH:${nextAction.summary?.packetVersion ?? ''}`);
  }
  if (reports.nextAction.exists && nextAction.summary?.targetBatchId !== TARGET_BATCH_ID) {
    blockers.push(`P1_NEXT_ACTION_BATCH_MISMATCH:${nextAction.summary?.targetBatchId ?? ''}`);
  }
  if (reports.validation.exists && (validation.summary?.validationVersion ?? validation.validationVersion) !== VALIDATION_VERSION) {
    blockers.push(`P1_VALIDATION_VERSION_MISMATCH:${validation.summary?.validationVersion ?? validation.validationVersion ?? ''}`);
  }
  if (reports.validation.exists && validation.summary?.status !== 'ok') {
    warnings.push(`P1_VALIDATION_STATUS_NOT_OK:${validation.summary?.status ?? ''}`);
  }

  const approvedBoundaryRows = EXPECTED_BOUNDARY_ROWS
    .map((expected) => inputByBlockId.get(expected.blockId))
    .filter((row) => normalizeDecision(row?.operatorDecision) === 'APPROVED');
  const duplicateCorrectedPathGroups = approvedBoundaryRows.reduce((groups, row) => {
    const key = normalizePath(row.correctedPath);
    if (!key) return groups;
    const group = groups.get(key) ?? [];
    group.push(row.block);
    groups.set(key, group);
    return groups;
  }, new Map());
  const duplicateCorrectedPathBlocks = new Set();
  duplicateCorrectedPathGroups.forEach((blocks) => {
    if (blocks.length < 2) return;
    blocks.forEach((block) => duplicateCorrectedPathBlocks.add(block));
  });

  const rows = await Promise.all(EXPECTED_BOUNDARY_ROWS.map(async (expected, index) => {
    const inputRow = inputByBlockId.get(expected.blockId);
    const boundaryAidRow = boundaryAidByBlockId.get(expected.blockId);
    const nextActionRow = nextActionByBlockId.get(expected.blockId);
    const validationRow = validationByBlockId.get(expected.blockId);
    const decision = normalizeDecision(inputRow?.operatorDecision);
    const evidenceCrop = inputRow?.evidenceCrop || boundaryAidRow?.target?.evidenceCrop || nextActionRow?.evidenceCrop || '';
    const evidencePath = evidenceCrop ? path.resolve(frontendRoot, evidenceCrop) : '';
    const evidenceExists = evidencePath ? await fileExists(evidencePath) : false;
    const pairedContextBlocks = Array.isArray(boundaryAidRow?.pairedGeometryReference)
      ? boundaryAidRow.pairedGeometryReference.map((row) => row.block).filter(Boolean)
      : [];
    const rowBlockers = [];
    const rowWarnings = [];

    if (!inputRow) rowBlockers.push('SOURCE_INPUT_ROW_MISSING');
    if (!boundaryAidRow) rowBlockers.push('BOUNDARY_AID_ROW_MISSING');
    if (!nextActionRow) rowBlockers.push('NEXT_ACTION_ROW_MISSING');
    if (nextActionRow && nextActionRow.stage !== REQUIRED_STAGE) {
      rowBlockers.push(`NEXT_ACTION_STAGE_NOT_BOUNDARY_FIRST:${nextActionRow.stage}`);
    }
    if (boundaryAidRow?.target?.reviewType && boundaryAidRow.target.reviewType !== expected.reviewType) {
      rowBlockers.push(`BOUNDARY_AID_REVIEW_TYPE_MISMATCH:${boundaryAidRow.target.reviewType}`);
    }
    if (!evidenceCrop) rowBlockers.push('EVIDENCE_CROP_MISSING');
    if (evidenceCrop && !evidenceExists) rowBlockers.push('EVIDENCE_FILE_MISSING');
    if (!boundaryAidRow?.targetGeometryReference?.currentPath) rowBlockers.push('TARGET_CURRENT_PATH_MISSING');
    if (!boundaryAidRow?.targetGeometryReference?.candidateStatus) rowWarnings.push('TARGET_CANDIDATE_STATUS_MISSING');
    if (pairedContextBlocks.length === 0) rowBlockers.push('PAIRED_CONTEXT_MISSING');
    if (pairedContextBlocks.length > 0 && !sameStringSet(pairedContextBlocks, expected.pairedBlocks)) {
      rowBlockers.push(`PAIRED_CONTEXT_BLOCKS_MISMATCH:${sorted(pairedContextBlocks).join(' ')}!=${sorted(expected.pairedBlocks).join(' ')}`);
    }
    if (boundaryAidRow?.pairedGeometryReference?.some((paired) => !paired.currentPath)) {
      rowBlockers.push('PAIRED_CONTEXT_CURRENT_PATH_MISSING');
    }

    const missingApprovalFields = decision === 'APPROVED'
      ? [
        ['correctedPath', inputRow?.correctedPath],
        ['correctedLabelX', inputRow?.correctedLabelX],
        ['correctedLabelY', inputRow?.correctedLabelY],
        ['reviewer', inputRow?.reviewer],
        ['reviewedAt', inputRow?.reviewedAt],
      ].filter(([, value]) => isBlank(value)).map(([field]) => field)
      : [];
    const validationReasons = Array.isArray(validationRow?.reasons) ? validationRow.reasons : [];
    const approvedInvalid = decision === 'APPROVED' && (
      rowBlockers.length > 0
      || missingApprovalFields.length > 0
      || !validationRow?.validForApproval
      || duplicateCorrectedPathBlocks.has(expected.block)
    );

    if (decision === 'APPROVED') {
      if (!validationRow) rowBlockers.push('VALIDATION_ROW_MISSING');
      if (missingApprovalFields.length > 0) rowBlockers.push(`APPROVED_ROW_MISSING_FIELDS:${missingApprovalFields.join(' ')}`);
      if (validationRow && validationRow.validForApproval !== true) {
        rowBlockers.push(`APPROVED_ROW_NOT_VALID_FOR_APPROVAL:${validationReasons.join(' ') || 'UNKNOWN_REASON'}`);
      }
      if (duplicateCorrectedPathBlocks.has(expected.block)) rowBlockers.push('BOUNDARY_FIRST_DUPLICATE_CORRECTED_PATH');
    }

    const evidenceMissing = rowBlockers.some((blocker) => blocker.startsWith('EVIDENCE_'));
    const contextMissing = rowBlockers.some((blocker) => (
      blocker.startsWith('BOUNDARY_AID_')
      || blocker.startsWith('TARGET_')
      || blocker.startsWith('PAIRED_')
      || blocker.startsWith('NEXT_ACTION_')
    ));
    const status = classifyStatus({
      decision,
      evidenceMissing,
      contextMissing,
      approvedInvalid,
    });

    return {
      readinessVersion: READINESS_VERSION,
      rowNumber: index + 1,
      blockId: expected.blockId,
      block: expected.block,
      name: inputRow?.name ?? boundaryAidRow?.target?.name ?? nextActionRow?.name ?? '',
      category: inputRow?.category ?? boundaryAidRow?.target?.category ?? nextActionRow?.category ?? '',
      stage: nextActionRow?.stage ?? '',
      reviewType: boundaryAidRow?.target?.reviewType ?? expected.reviewType,
      expectedPairedBlocks: expected.pairedBlocks.join(' '),
      pairedContextBlocks: pairedContextBlocks.join(' '),
      decision,
      status,
      evidenceCrop,
      evidenceExists,
      operatorFocus: nextActionRow?.operatorFocus ?? boundaryAidRow?.target?.operatorFocus ?? '',
      operatorAction: nextActionRow?.operatorAction ?? boundaryAidRow?.target?.operatorAction ?? '',
      approvalRule: boundaryAidRow?.target?.approvalRule ?? nextActionRow?.acceptance ?? '',
      targetCurrentPathPointCount: boundaryAidRow?.targetGeometryReference?.currentPathPointCount ?? 0,
      targetCandidatePathPointCount: boundaryAidRow?.targetGeometryReference?.candidatePathPointCount ?? 0,
      targetCandidateStatus: boundaryAidRow?.targetGeometryReference?.candidateStatus ?? inputRow?.candidateStatus ?? '',
      correctedPathFilled: !isBlank(inputRow?.correctedPath),
      correctedLabelFilled: !isBlank(inputRow?.correctedLabelX) && !isBlank(inputRow?.correctedLabelY),
      reviewerFilled: !isBlank(inputRow?.reviewer),
      reviewedAtFilled: !isBlank(inputRow?.reviewedAt),
      validForApproval: validationRow?.validForApproval === true,
      validationReasons,
      validationWarnings: Array.isArray(validationRow?.warnings) ? validationRow.warnings : [],
      rowBlockers,
      rowWarnings,
      requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    };
  }));

  const statusCounts = rows.reduce((counts, row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    return counts;
  }, {});
  const approvedValidRows = rows.filter((row) => row.status === 'APPROVED_VALID');
  const approvedInvalidRows = rows.filter((row) => row.status === 'APPROVED_INVALID');
  const readyForOperatorRows = rows.filter((row) => row.status === 'READY_FOR_OPERATOR');
  const missingEvidenceRows = rows.filter((row) => row.status === 'MISSING_EVIDENCE');
  const missingContextRows = rows.filter((row) => row.status === 'MISSING_CONTEXT');
  const rowBlockers = rows.flatMap((row) => row.rowBlockers.map((blocker) => `${row.block}:${blocker}`));

  const expectedIds = new Set(EXPECTED_BOUNDARY_ROWS.map((row) => row.blockId));
  const boundaryStageIds = nextActionRows
    .filter((row) => row.stage === REQUIRED_STAGE)
    .map((row) => row.blockId);
  const missingExpectedIds = [...expectedIds].filter((blockId) => !boundaryStageIds.includes(blockId));
  const extraBoundaryStageIds = boundaryStageIds.filter((blockId) => !expectedIds.has(blockId));
  if (missingExpectedIds.length > 0) blockers.push(`BOUNDARY_FIRST_MISSING_EXPECTED_ROWS:${missingExpectedIds.join(' ')}`);
  if (extraBoundaryStageIds.length > 0) blockers.push(`BOUNDARY_FIRST_HAS_EXTRA_ROWS:${extraBoundaryStageIds.join(' ')}`);
  if (rows.length !== EXPECTED_BOUNDARY_ROWS.length) {
    blockers.push(`BOUNDARY_FIRST_ROW_COUNT_MISMATCH:${rows.length}:${EXPECTED_BOUNDARY_ROWS.length}`);
  }
  if (approvedInvalidRows.length > 0) blockers.push(`BOUNDARY_FIRST_APPROVED_INVALID_ROWS:${approvedInvalidRows.map((row) => row.block).join(' ')}`);
  if (missingEvidenceRows.length > 0) blockers.push(`BOUNDARY_FIRST_MISSING_EVIDENCE_ROWS:${missingEvidenceRows.map((row) => row.block).join(' ')}`);
  if (missingContextRows.length > 0) blockers.push(`BOUNDARY_FIRST_MISSING_CONTEXT_ROWS:${missingContextRows.map((row) => row.block).join(' ')}`);

  if (rowBlockers.length > 0) warnings.push(`BOUNDARY_FIRST_ROW_BLOCKERS:${rowBlockers.join(' | ')}`);
  if (readyForOperatorRows.length > 0) warnings.push(`BOUNDARY_FIRST_WAITING_FOR_OPERATOR:${readyForOperatorRows.map((row) => row.block).join(' ')}`);

  const canAdvanceToSingleCorrectedPath = blockers.length === 0
    && approvedValidRows.length === EXPECTED_BOUNDARY_ROWS.length;
  const summary = {
    readinessVersion: READINESS_VERSION,
    status: blockers.length > 0 ? 'blocked' : canAdvanceToSingleCorrectedPath ? 'ready-for-next-stage' : 'ready-for-operator',
    targetBatchId: TARGET_BATCH_ID,
    requiredStage: REQUIRED_STAGE,
    expectedRows: EXPECTED_BOUNDARY_ROWS.length,
    totalRows: rows.length,
    approvedValidRows: approvedValidRows.length,
    approvedInvalidRows: approvedInvalidRows.length,
    readyForOperatorRows: readyForOperatorRows.length,
    missingEvidenceRows: missingEvidenceRows.length,
    missingContextRows: missingContextRows.length,
    statusCounts,
    canAdvanceToSingleCorrectedPath,
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    sourceInput: reports.input.relativePath,
    sourceBoundaryAid: reports.boundaryAid.relativePath,
    sourceNextAction: reports.nextAction.relativePath,
    sourceValidation: reports.validation.relativePath,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    expectedRows: EXPECTED_BOUNDARY_ROWS,
    safetyContract: [
      'This P1 boundary-first readiness report is read-only.',
      'It never writes operatorDecision or corrected fields.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'Boundary-first rows must be approved before SINGLE_CORRECTED_PATH or DUPLICATE_CANDIDATE_SPLIT rows can advance.',
      'APPROVED rows must pass the shared operator corrections validator before they count as APPROVED_VALID.',
      'No external crawling, web search, or coordinate inference is allowed.',
    ],
    statusDefinitions: {
      READY_FOR_OPERATOR: 'Evidence and context are present, but the source input row is not approved yet.',
      MISSING_EVIDENCE: 'Evidence crop is missing or not present on disk.',
      MISSING_CONTEXT: 'Boundary aid, next action, target geometry, or paired neighbor context is incomplete.',
      APPROVED_VALID: 'The row is operatorDecision=APPROVED and the shared validation row is validForApproval=true.',
      APPROVED_INVALID: 'The row is approved but missing required fields, duplicate correctedPath, or validator approval.',
    },
    rows,
  };

  const jsonPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-readiness.json');
  const csvPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-readiness.csv');
  const markdownPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-readiness.md');

  await fs.mkdir(p1ReportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'block',
      'blockId',
      'status',
      'decision',
      'stage',
      'reviewType',
      'evidenceExists',
      'pairedContextBlocks',
      'validForApproval',
      'rowBlockers',
      'validationReasons',
    ],
    ...rows.map((row) => [
      row.block,
      row.blockId,
      row.status,
      row.decision,
      row.stage,
      row.reviewType,
      row.evidenceExists,
      row.pairedContextBlocks,
      row.validForApproval,
      row.rowBlockers.join(' '),
      row.validationReasons.join(' '),
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P1 Boundary-First Readiness',
    '',
    `- readiness version: \`${READINESS_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- required stage: \`${summary.requiredStage}\``,
    `- total rows: ${summary.totalRows}`,
    `- approved valid rows: ${summary.approvedValidRows}`,
    `- approved invalid rows: ${summary.approvedInvalidRows}`,
    `- ready for operator rows: ${summary.readyForOperatorRows}`,
    `- missing evidence rows: ${summary.missingEvidenceRows}`,
    `- missing context rows: ${summary.missingContextRows}`,
    `- can advance to single corrected path: ${summary.canAdvanceToSingleCorrectedPath}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Rows',
    '',
    markdownTable(
      [
        'block',
        'status',
        'decision',
        'paired context',
        'evidence',
        'valid',
        'blockers',
      ],
      rows.map((row) => [
        `\`${row.block}\``,
        `\`${row.status}\``,
        `\`${row.decision}\``,
        row.pairedContextBlocks,
        row.evidenceExists ? 'yes' : 'no',
        String(row.validForApproval),
        row.rowBlockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Gate',
    '',
    '1. 이 report는 read-only이며 source P1 input, main template, production data를 수정하지 않습니다.',
    '2. `T1-1`, `T3-2`, `V1`, `V2`, `V3` 5개만 boundary-first 대상으로 검사합니다.',
    '3. 5개가 모두 `APPROVED_VALID`가 되기 전에는 `M-9`와 duplicate split 11개로 넘어가지 않습니다.',
    '4. `APPROVED_INVALID`, `MISSING_EVIDENCE`, `MISSING_CONTEXT`가 있으면 operator 재검수가 필요합니다.',
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

  console.log(`p1_boundary_first_readiness_json:${jsonPath}`);
  console.log(`p1_boundary_first_readiness_csv:${csvPath}`);
  console.log(`p1_boundary_first_readiness_markdown:${markdownPath}`);
  console.log(`status:${summary.status} approvedValid=${summary.approvedValidRows} readyForOperator=${summary.readyForOperatorRows} missingEvidence=${summary.missingEvidenceRows} missingContext=${summary.missingContextRows} canAdvance=${summary.canAdvanceToSingleCorrectedPath}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1BoundaryFirstRegression = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultSourceP1Dir = path.join(defaultReportDir, 'daegu-p1-operator');
  const defaultFixtureDir = path.join(defaultReportDir, 'daegu-p1-boundary-first-regression');

  const REGRESSION_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_REGRESSION_V1';
  const PACKET_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_PACKET_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const REVIEWER = 'P1_BOUNDARY_FIRST_REGRESSION_ONLY';
  const PRESERVATION_REVIEWER = 'P1_BOUNDARY_FIRST_TEMPLATE_PRESERVATION_REGRESSION';
  const REVIEWED_AT = '2026-05-13T00:00:00.000Z';
  const BOUNDARY_FIRST_BLOCK_IDS = [
    'daegu-first-table-t1-1',
    'daegu-third-table-t3-2',
    'daegu-central-table-v-v1',
    'daegu-central-table-v-v2',
    'daegu-central-table-v-v3',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, data) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  };

  const runNodeScript = (scriptPath, args, { expectFailure = false } = {}) => new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', scriptPath, ...args],
      {
        cwd: frontendRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const failedUnexpectedly = expectFailure ? code === 0 : code !== 0;
      const result = {
        script: path.relative(frontendRoot, scriptPath),
        args,
        exitCode: code,
        expectedFailure: expectFailure,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
      if (failedUnexpectedly) {
        reject(new Error(`Unexpected exit for ${result.script}: ${code}\n${stdout}\n${stderr}`));
        return;
      }
      resolve(result);
    });
  });

  const assertCondition = (condition, message, blockers) => {
    if (!condition) blockers.push(message);
  };

  const makeApproval = (row, overrides) => ({
    ...row,
    operatorDecision: 'APPROVED',
    correctedPath: row.currentPath,
    correctedLabelX: row.currentLabelX,
    correctedLabelY: row.currentLabelY,
    reviewer: REVIEWER,
    reviewedAt: REVIEWED_AT,
    operatorNote: 'Regression fixture: intentionally invalid boundary-first approval.',
    ...overrides,
  });

  const fixtureDir = path.resolve(frontendRoot, argValue('--fixture-dir', defaultFixtureDir));
  const sourceP1Dir = path.resolve(frontendRoot, argValue('--source-p1-dir', defaultSourceP1Dir));
  const sourceInputPath = path.join(sourceP1Dir, 'daegu-seatmap-p1-operator-input.json');
  const sourceBoundaryAidPath = path.join(sourceP1Dir, 'daegu-seatmap-p1-boundary-input-aid.json');
  const sourceNextActionPath = path.join(sourceP1Dir, 'daegu-seatmap-p1-next-action-packet.json');
  const sourceHandoffPath = path.join(defaultReportDir, 'daegu-seatmap-operator-handoff.json');

  const fixtureP1Dir = path.join(fixtureDir, 'daegu-p1-operator');
  const fixtureInputPath = path.join(fixtureP1Dir, 'daegu-seatmap-p1-operator-input.json');
  const fixtureBoundaryAidPath = path.join(fixtureP1Dir, 'daegu-seatmap-p1-boundary-input-aid.json');
  const fixtureNextActionPath = path.join(fixtureP1Dir, 'daegu-seatmap-p1-next-action-packet.json');
  const fixtureHandoffPath = path.join(fixtureDir, 'daegu-seatmap-operator-handoff.json');
  const preservationFixtureDir = path.join(fixtureDir, 'template-preservation');
  const preservationP1Dir = path.join(preservationFixtureDir, 'daegu-p1-operator');
  const preservationInputPath = path.join(preservationP1Dir, 'daegu-seatmap-p1-operator-input.json');
  const preservationBoundaryAidPath = path.join(preservationP1Dir, 'daegu-seatmap-p1-boundary-input-aid.json');
  const preservationNextActionPath = path.join(preservationP1Dir, 'daegu-seatmap-p1-next-action-packet.json');
  const preservationHandoffPath = path.join(preservationFixtureDir, 'daegu-seatmap-operator-handoff.json');
  const preservationTemplatePath = path.join(preservationP1Dir, 'daegu-seatmap-p1-boundary-first-operator-template.json');

  const sourceInput = await readJson(sourceInputPath);
  const sourceBoundaryAid = await readJson(sourceBoundaryAidPath);
  const sourceNextAction = await readJson(sourceNextActionPath);
  const sourceHandoff = await readJson(sourceHandoffPath);
  const sourceRowsById = new Map((sourceInput.corrections ?? []).map((row) => [row.blockId, row]));
  const blockers = [];

  assertCondition(sourceInput.targetBatchId === TARGET_BATCH_ID, `SOURCE_INPUT_BATCH_MISMATCH:${sourceInput.targetBatchId ?? ''}`, blockers);
  assertCondition(sourceInput.productionWriteAllowed === false, 'SOURCE_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE', blockers);
  assertCondition(sourceBoundaryAid.summary?.inputAidVersion === 'DAEGU_P1_BOUNDARY_INPUT_AID_V1', `SOURCE_BOUNDARY_AID_VERSION_MISMATCH:${sourceBoundaryAid.summary?.inputAidVersion ?? ''}`, blockers);
  assertCondition(sourceNextAction.summary?.packetVersion === 'DAEGU_P1_NEXT_ACTION_PACKET_V1', `SOURCE_NEXT_ACTION_PACKET_VERSION_MISMATCH:${sourceNextAction.summary?.packetVersion ?? ''}`, blockers);

  BOUNDARY_FIRST_BLOCK_IDS.forEach((blockId) => {
    const sourceRow = sourceRowsById.get(blockId);
    assertCondition(Boolean(sourceRow), `SOURCE_BOUNDARY_ROW_MISSING:${blockId}`, blockers);
    assertCondition(Boolean(sourceRow?.currentPath), `SOURCE_BOUNDARY_CURRENT_PATH_MISSING:${blockId}`, blockers);
  });

  if (blockers.length === 0) {
    const v1Source = sourceRowsById.get('daegu-central-table-v-v1');
    const fixtureInput = {
      ...sourceInput,
      generatedAt: new Date().toISOString(),
      regressionFixture: REGRESSION_VERSION,
      sourceInput: path.relative(frontendRoot, sourceInputPath),
      corrections: sourceInput.corrections.map((row) => {
        if (!BOUNDARY_FIRST_BLOCK_IDS.includes(row.blockId)) {
          return {
            ...row,
            operatorDecision: 'NEEDS_RETRACE',
            correctedPath: '',
            correctedLabelX: '',
            correctedLabelY: '',
            reviewer: '',
            reviewedAt: '',
            operatorNote: 'Regression fixture: non-boundary row kept non-approved.',
          };
        }

        if (row.blockId === 'daegu-first-table-t1-1') {
          return makeApproval(row, {
            correctedPath: '',
            operatorNote: 'Regression fixture: approved row missing correctedPath.',
          });
        }
        if (row.blockId === 'daegu-third-table-t3-2') {
          return makeApproval(row, {
            correctedLabelX: '',
            correctedLabelY: '',
            operatorNote: 'Regression fixture: approved row missing corrected label coordinates.',
          });
        }
        if (row.blockId === 'daegu-central-table-v-v1') {
          return makeApproval(row, {
            correctedPath: v1Source.currentPath,
            correctedLabelX: v1Source.currentLabelX,
            correctedLabelY: v1Source.currentLabelY,
            operatorNote: 'Regression fixture: approved row shares correctedPath with V2.',
          });
        }
        if (row.blockId === 'daegu-central-table-v-v2') {
          return makeApproval(row, {
            correctedPath: v1Source.currentPath,
            correctedLabelX: row.currentLabelX,
            correctedLabelY: row.currentLabelY,
            operatorNote: 'Regression fixture: approved row shares correctedPath with V1.',
          });
        }
        return makeApproval(row, {
          correctedLabelX: 0,
          correctedLabelY: 0,
          operatorNote: 'Regression fixture: approved row has label outside correctedPath.',
        });
      }),
    };

    await writeJson(fixtureInputPath, fixtureInput);
    await writeJson(fixtureBoundaryAidPath, {
      ...sourceBoundaryAid,
      generatedAt: new Date().toISOString(),
      regressionFixture: REGRESSION_VERSION,
    });
    await writeJson(fixtureNextActionPath, {
      ...sourceNextAction,
      generatedAt: new Date().toISOString(),
      regressionFixture: REGRESSION_VERSION,
    });
    await writeJson(fixtureHandoffPath, {
      ...sourceHandoff,
      generatedAt: new Date().toISOString(),
      regressionFixture: REGRESSION_VERSION,
    });
  }

  const commandResults = [];
  let preservationReport = null;
  let preservationTemplate = null;
  if (blockers.length === 0) {
    commandResults.push(await runNodeScript(
      path.join(scriptDir, 'daegu-seatmap-operator-corrections.mjs'),
      [
        'operator-corrections-validate',
        '--input',
        path.relative(frontendRoot, fixtureInputPath),
        '--report-dir',
        path.relative(frontendRoot, fixtureP1Dir),
        '--handoff',
        path.relative(frontendRoot, fixtureHandoffPath),
      ],
      { expectFailure: true },
    ));

    commandResults.push(await runNodeScript(
      path.join(scriptDir, 'daegu-seatmap-p1-operator-boundary.mjs'),
      [
        'p1-boundary-first-readiness',
        '--p1-report-dir',
        path.relative(frontendRoot, fixtureP1Dir),
        '--report-dir',
        path.relative(frontendRoot, fixtureDir),
      ],
      { expectFailure: true },
    ));

    await writeJson(preservationInputPath, {
      ...sourceInput,
      generatedAt: new Date().toISOString(),
      regressionFixture: `${REGRESSION_VERSION}:template-preservation`,
      sourceInput: path.relative(frontendRoot, sourceInputPath),
      corrections: sourceInput.corrections.map((row) => ({
        ...row,
        operatorDecision: 'NEEDS_RETRACE',
        correctedPath: '',
        correctedLabelX: '',
        correctedLabelY: '',
        reviewer: '',
        reviewedAt: '',
      })),
    });
    await writeJson(preservationBoundaryAidPath, {
      ...sourceBoundaryAid,
      generatedAt: new Date().toISOString(),
      regressionFixture: `${REGRESSION_VERSION}:template-preservation`,
    });
    await writeJson(preservationNextActionPath, {
      ...sourceNextAction,
      generatedAt: new Date().toISOString(),
      regressionFixture: `${REGRESSION_VERSION}:template-preservation`,
    });
    await writeJson(preservationHandoffPath, {
      ...sourceHandoff,
      generatedAt: new Date().toISOString(),
      regressionFixture: `${REGRESSION_VERSION}:template-preservation`,
    });

    commandResults.push(await runNodeScript(
      path.join(scriptDir, 'daegu-seatmap-operator-corrections.mjs'),
      [
        'operator-corrections-validate',
        '--input',
        path.relative(frontendRoot, preservationInputPath),
        '--report-dir',
        path.relative(frontendRoot, preservationP1Dir),
        '--handoff',
        path.relative(frontendRoot, preservationHandoffPath),
      ],
    ));

    commandResults.push(await runNodeScript(
      path.join(scriptDir, 'daegu-seatmap-p1-operator-boundary.mjs'),
      [
        'p1-boundary-first-readiness',
        '--p1-report-dir',
        path.relative(frontendRoot, preservationP1Dir),
        '--report-dir',
        path.relative(frontendRoot, preservationFixtureDir),
      ],
    ));

    const preservationRows = BOUNDARY_FIRST_BLOCK_IDS.map((blockId) => {
      const sourceRow = sourceRowsById.get(blockId);
      const approvedPreservationRow = blockId === 'daegu-first-table-t1-1' || blockId === 'daegu-central-table-v-v1';
      return {
        blockId,
        block: sourceRow.block,
        name: sourceRow.name,
        category: sourceRow.category,
        sourceInput: path.relative(frontendRoot, preservationInputPath),
        readinessStatus: 'READY_FOR_OPERATOR',
        pairedBlocks: '',
        evidenceCrop: sourceRow.evidenceCrop ?? '',
        editableSource: approvedPreservationRow ? 'existingOperatorTemplate' : 'sourceInput',
        operatorDecision: approvedPreservationRow ? 'APPROVED' : 'NEEDS_RETRACE',
        correctedPath: approvedPreservationRow ? sourceRow.currentPath : '',
        correctedLabelX: approvedPreservationRow ? sourceRow.currentLabelX : '',
        correctedLabelY: approvedPreservationRow ? sourceRow.currentLabelY : '',
        reviewer: approvedPreservationRow ? PRESERVATION_REVIEWER : '',
        reviewedAt: approvedPreservationRow ? REVIEWED_AT : '',
        operatorNote: approvedPreservationRow
          ? `Regression fixture: preserve editable fields for ${sourceRow.block}.`
          : '',
      };
    });

    await writeJson(preservationTemplatePath, {
      generatedAt: new Date().toISOString(),
      templateVersion: TEMPLATE_VERSION,
      targetBatchId: TARGET_BATCH_ID,
      sourcePacketVersion: PACKET_VERSION,
      sourcePacket: path.relative(frontendRoot, path.join(preservationP1Dir, 'daegu-seatmap-p1-boundary-first-packet.json')),
      sourceInput: path.relative(frontendRoot, preservationInputPath),
      templateOnly: true,
      productionWriteAllowed: false,
      allowedBlocks: ['T1-1', 'T3-2', 'V1', 'V2', 'V3'],
      editableFields: [
        'operatorDecision',
        'correctedPath',
        'correctedLabelX',
        'correctedLabelY',
        'reviewer',
        'reviewedAt',
        'operatorNote',
      ],
      corrections: preservationRows,
    });

    commandResults.push(await runNodeScript(
      path.join(scriptDir, 'daegu-seatmap-p1-operator-boundary.mjs'),
      [
        'p1-boundary-first-packet',
        '--p1-report-dir',
        path.relative(frontendRoot, preservationP1Dir),
        '--output-dir',
        path.relative(frontendRoot, preservationP1Dir),
      ],
    ));
  }

  const validationReport = blockers.length === 0
    ? await readJson(path.join(fixtureP1Dir, 'daegu-seatmap-operator-corrections-validation.json'))
    : null;
  const readinessReport = blockers.length === 0
    ? await readJson(path.join(fixtureP1Dir, 'daegu-seatmap-p1-boundary-first-readiness.json'))
    : null;
  if (blockers.length === 0) {
    preservationReport = await readJson(path.join(preservationP1Dir, 'daegu-seatmap-p1-boundary-first-packet.json'));
    preservationTemplate = await readJson(preservationTemplatePath);
  }

  if (blockers.length === 0) {
    const readinessRows = readinessReport.rows ?? [];
    const approvedInvalidRows = readinessRows.filter((row) => row.status === 'APPROVED_INVALID');
    const allRowBlockers = readinessRows.flatMap((row) => row.rowBlockers ?? []);

    assertCondition(validationReport.summary.status === 'failed', `VALIDATION_STATUS_NOT_FAILED:${validationReport.summary.status}`, blockers);
    assertCondition(validationReport.summary.approvedRows === 5, `VALIDATION_APPROVED_ROWS_MISMATCH:${validationReport.summary.approvedRows}`, blockers);
    assertCondition(validationReport.summary.invalidApprovedRows === 5, `VALIDATION_INVALID_APPROVED_ROWS_MISMATCH:${validationReport.summary.invalidApprovedRows}`, blockers);
    assertCondition(readinessReport.summary.status === 'blocked', `READINESS_STATUS_NOT_BLOCKED:${readinessReport.summary.status}`, blockers);
    assertCondition(readinessReport.summary.approvedInvalidRows === 5, `READINESS_APPROVED_INVALID_ROWS_MISMATCH:${readinessReport.summary.approvedInvalidRows}`, blockers);
    assertCondition(readinessReport.summary.canAdvanceToSingleCorrectedPath === false, 'READINESS_CAN_ADVANCE_NOT_FALSE', blockers);
    assertCondition(
      readinessReport.summary.blockers.some((blocker) => blocker.includes('BOUNDARY_FIRST_APPROVED_INVALID_ROWS')),
      'READINESS_APPROVED_INVALID_BLOCKER_MISSING',
      blockers,
    );
    assertCondition(approvedInvalidRows.length === 5, `READINESS_APPROVED_INVALID_ROW_COUNT_MISMATCH:${approvedInvalidRows.length}`, blockers);
    assertCondition(
      allRowBlockers.some((blocker) => blocker.includes('APPROVED_ROW_MISSING_FIELDS:correctedPath')),
      'MISSING_CORRECTED_PATH_BLOCKER_NOT_OBSERVED',
      blockers,
    );
    assertCondition(
      allRowBlockers.some((blocker) => blocker.includes('APPROVED_ROW_MISSING_FIELDS:correctedLabelX correctedLabelY')),
      'MISSING_CORRECTED_LABEL_BLOCKER_NOT_OBSERVED',
      blockers,
    );
    assertCondition(
      allRowBlockers.includes('BOUNDARY_FIRST_DUPLICATE_CORRECTED_PATH'),
      'DUPLICATE_CORRECTED_PATH_BLOCKER_NOT_OBSERVED',
      blockers,
    );
    assertCondition(
      readinessRows.some((row) => row.validationReasons.includes('CORRECTED_LABEL_OUTSIDE_PATH')),
      'LABEL_OUTSIDE_PATH_REASON_NOT_OBSERVED',
      blockers,
    );

    const preservedRows = preservationTemplate.corrections.filter((row) => row.editableSource === 'existingOperatorTemplate');
    const preservedBlocks = preservedRows.map((row) => row.block).sort();
    const t11Preserved = preservationTemplate.corrections.find((row) => row.blockId === 'daegu-first-table-t1-1');
    const v1Preserved = preservationTemplate.corrections.find((row) => row.blockId === 'daegu-central-table-v-v1');
    const t32NotPreserved = preservationTemplate.corrections.find((row) => row.blockId === 'daegu-third-table-t3-2');

    assertCondition(
      preservationReport.summary.packetVersion === PACKET_VERSION,
      `PRESERVATION_PACKET_VERSION_MISMATCH:${preservationReport.summary.packetVersion ?? ''}`,
      blockers,
    );
    assertCondition(
      preservationReport.summary.preservedEditableRows === 2,
      `PRESERVATION_EDITABLE_ROWS_MISMATCH:${preservationReport.summary.preservedEditableRows}`,
      blockers,
    );
    assertCondition(
      preservedBlocks.join(' ') === 'T1-1 V1',
      `PRESERVATION_BLOCKS_MISMATCH:${preservedBlocks.join(' ')}`,
      blockers,
    );
    assertCondition(t11Preserved?.operatorDecision === 'APPROVED', 'PRESERVATION_T11_DECISION_LOST', blockers);
    assertCondition(Boolean(t11Preserved?.correctedPath), 'PRESERVATION_T11_PATH_LOST', blockers);
    assertCondition(t11Preserved?.reviewer === PRESERVATION_REVIEWER, 'PRESERVATION_T11_REVIEWER_LOST', blockers);
    assertCondition(t11Preserved?.reviewedAt === REVIEWED_AT, 'PRESERVATION_T11_REVIEWED_AT_LOST', blockers);
    assertCondition(v1Preserved?.operatorDecision === 'APPROVED', 'PRESERVATION_V1_DECISION_LOST', blockers);
    assertCondition(Boolean(v1Preserved?.correctedPath), 'PRESERVATION_V1_PATH_LOST', blockers);
    assertCondition(t32NotPreserved?.editableSource === 'sourceInput', 'PRESERVATION_NON_EDITED_ROW_NOT_REGENERATED_FROM_SOURCE', blockers);
  }

  const summary = {
    regressionVersion: REGRESSION_VERSION,
    status: blockers.length > 0 ? 'failed' : 'ok',
    fixtureDir: path.relative(frontendRoot, fixtureDir),
    fixtureInput: path.relative(frontendRoot, fixtureInputPath),
    boundaryFirstRows: BOUNDARY_FIRST_BLOCK_IDS.length,
    validationStatus: validationReport?.summary?.status ?? '',
    validationApprovedRows: validationReport?.summary?.approvedRows ?? 0,
    validationInvalidApprovedRows: validationReport?.summary?.invalidApprovedRows ?? 0,
    readinessStatus: readinessReport?.summary?.status ?? '',
    readinessApprovedInvalidRows: readinessReport?.summary?.approvedInvalidRows ?? 0,
    readinessCanAdvanceToSingleCorrectedPath: readinessReport?.summary?.canAdvanceToSingleCorrectedPath ?? false,
    preservationFixtureDir: path.relative(frontendRoot, preservationFixtureDir),
    preservationStatus: preservationReport?.summary?.status ?? '',
    preservationRows: preservationTemplate?.corrections?.length ?? 0,
    preservationPreservedEditableRows: preservationReport?.summary?.preservedEditableRows ?? 0,
    blockers,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    commandResults,
    safetyContract: [
      'This regression script writes only fixture/report files under reports/stadium/daegu-p1-boundary-first-regression.',
      'It never edits reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json.',
      'It never modifies src/data/daeguSeatData.ts or the main corrections template.',
      'The fixture intentionally creates invalid boundary-first approvals to prove they cannot advance.',
      'The template-preservation fixture proves packet regeneration keeps operator-filled boundary-first template rows.',
    ],
  };

  const reportPath = path.join(fixtureDir, 'daegu-seatmap-p1-boundary-first-regression.json');
  await writeJson(reportPath, report);

  console.log(`p1_boundary_first_regression_json:${reportPath}`);
  console.log(`status:${summary.status} validation=${summary.validationStatus} invalidApproved=${summary.validationInvalidApprovedRows} readiness=${summary.readinessStatus} approvedInvalid=${summary.readinessApprovedInvalidRows} canAdvance=${summary.readinessCanAdvanceToSingleCorrectedPath} preservedEditable=${summary.preservationPreservedEditableRows}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runP1BoundaryFirstReviewBoard = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const REVIEW_BOARD_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_REVIEW_BOARD_V1';
  const PACKET_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_PACKET_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1';
  const GATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_TEMPLATE_GATE_V1';
  const SOURCE_COPY_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_SOURCE_COPY_V1';
  const READINESS_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_READINESS_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const VIEWBOX = { width: 1707, height: 2048 };
  const EXPECTED_BLOCKS = ['T1-1', 'T3-2', 'V1', 'V2', 'V3'];
  const EXPECTED_BLOCK_IDS = [
    'daegu-first-table-t1-1',
    'daegu-third-table-t3-2',
    'daegu-central-table-v-v1',
    'daegu-central-table-v-v2',
    'daegu-central-table-v-v3',
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

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const asTextList = (value) => {
    if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
    const text = String(value ?? '').trim();
    return text ? text.split(/\s+/) : [];
  };

  const arraysEqual = (left, right) => left.length === right.length
    && left.every((item, index) => item === right[index]);

  const pointText = (x, y) => {
    if (x === '' || x === null || x === undefined || y === '' || y === null || y === undefined) return '';
    return `${x},${y}`;
  };

  const isBlank = (value) => String(value ?? '').trim() === '';

  const approvalMissingFieldsFor = (row, decision) => {
    const missing = [];
    if (decision !== 'APPROVED') missing.push('operatorDecision=APPROVED');
    if (isBlank(row.correctedPath)) missing.push('correctedPath');
    if (isBlank(row.correctedLabelX) || isBlank(row.correctedLabelY)) missing.push('correctedLabelX/Y');
    if (isBlank(row.reviewer)) missing.push('reviewer');
    if (isBlank(row.reviewedAt)) missing.push('reviewedAt');
    return missing;
  };

  const nextOperatorActionFor = (missingFields) => {
    if (missingFields.length === 0) return 'Run npm run stadium:daegu:p1-boundary-first-template-gate.';
    return `Fill ${missingFields.join(', ')} in daegu-seatmap-p1-boundary-first-operator-template.json.`;
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const packetPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-packet.json');
  const templatePath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-operator-template.json');
  const gatePath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-template-gate.json');
  const sourceCopyPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-source-copy.json');
  const readinessPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-readiness.json');

  const packet = await readJson(packetPath);
  const template = await readJson(templatePath);
  const gate = await readJson(gatePath);
  const sourceCopy = await readJson(sourceCopyPath);
  const readiness = await readJson(readinessPath);

  const packetRows = Array.isArray(packet.rows) ? packet.rows : [];
  const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
  const gateRows = Array.isArray(gate.rows) ? gate.rows : [];
  const sourceCopyRows = Array.isArray(sourceCopy.rows) ? sourceCopy.rows : [];
  const readinessRows = Array.isArray(readiness.rows) ? readiness.rows : [];

  const packetByBlock = new Map(packetRows.map((row) => [row.block, row]));
  const templateByBlockId = new Map(templateRows.map((row) => [row.blockId, row]));
  const gateByBlock = new Map(gateRows.map((row) => [row.block, row]));
  const sourceCopyByBlockId = new Map(sourceCopyRows.map((row) => [row.blockId, row]));
  const readinessByBlockId = new Map(readinessRows.map((row) => [row.blockId, row]));
  const blockers = [];
  const warnings = [];

  if (packet.summary?.packetVersion !== PACKET_VERSION) blockers.push(`PACKET_VERSION_MISMATCH:${packet.summary?.packetVersion ?? ''}`);
  if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  if (gate.summary?.gateVersion !== GATE_VERSION) blockers.push(`GATE_VERSION_MISMATCH:${gate.summary?.gateVersion ?? ''}`);
  if (sourceCopy.summary?.copyVersion !== SOURCE_COPY_VERSION) blockers.push(`SOURCE_COPY_VERSION_MISMATCH:${sourceCopy.summary?.copyVersion ?? ''}`);
  if (readiness.summary?.readinessVersion !== READINESS_VERSION) blockers.push(`READINESS_VERSION_MISMATCH:${readiness.summary?.readinessVersion ?? ''}`);
  if (template.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
  if (template.templateOnly !== true) blockers.push('TEMPLATE_ONLY_NOT_TRUE');
  if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (packet.summary?.productionWriteAllowed !== false) blockers.push('PACKET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (packet.summary?.writesOperatorDecision !== false) blockers.push('PACKET_WRITES_OPERATOR_DECISION_NOT_FALSE');
  if (packet.summary?.writesCorrectionsTemplate !== false) blockers.push('PACKET_WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
  if (packet.summary?.writesProductionData !== false) blockers.push('PACKET_WRITES_PRODUCTION_DATA_NOT_FALSE');
  if (gate.summary?.productionWriteAllowed !== false) blockers.push('GATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (gate.summary?.writesProductionData !== false) blockers.push('GATE_WRITES_PRODUCTION_DATA_NOT_FALSE');
  if (sourceCopy.summary?.productionWriteAllowed !== false) blockers.push('SOURCE_COPY_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (sourceCopy.summary?.writesProductionData !== false) blockers.push('SOURCE_COPY_WRITES_PRODUCTION_DATA_NOT_FALSE');
  if (sourceCopy.summary?.mode !== 'dry-run') warnings.push(`SOURCE_COPY_NOT_DRY_RUN:${sourceCopy.summary?.mode ?? ''}`);

  const packetBlocks = packetRows.map((row) => row.block);
  const templateBlocks = templateRows.map((row) => row.block);
  const templateBlockIds = templateRows.map((row) => row.blockId);
  if (!arraysEqual(packetBlocks, EXPECTED_BLOCKS)) blockers.push(`PACKET_BLOCK_ORDER_MISMATCH:${packetBlocks.join(' ')}`);
  if (!arraysEqual(templateBlocks, EXPECTED_BLOCKS)) blockers.push(`TEMPLATE_BLOCK_ORDER_MISMATCH:${templateBlocks.join(' ')}`);
  if (!arraysEqual(templateBlockIds, EXPECTED_BLOCK_IDS)) blockers.push(`TEMPLATE_BLOCK_ID_ORDER_MISMATCH:${templateBlockIds.join(' ')}`);
  if (!arraysEqual(template.allowedBlocks ?? [], EXPECTED_BLOCKS)) blockers.push(`TEMPLATE_ALLOWED_BLOCKS_MISMATCH:${(template.allowedBlocks ?? []).join(' ')}`);
  if (packet.summary?.totalRows !== EXPECTED_BLOCKS.length) blockers.push(`PACKET_ROW_COUNT_MISMATCH:${packet.summary?.totalRows ?? ''}`);
  if (templateRows.length !== EXPECTED_BLOCKS.length) blockers.push(`TEMPLATE_ROW_COUNT_MISMATCH:${templateRows.length}`);
  if (gate.summary?.totalRows !== EXPECTED_BLOCKS.length) blockers.push(`GATE_ROW_COUNT_MISMATCH:${gate.summary?.totalRows ?? ''}`);
  if (sourceCopy.summary?.totalBoundaryRows !== EXPECTED_BLOCKS.length) blockers.push(`SOURCE_COPY_ROW_COUNT_MISMATCH:${sourceCopy.summary?.totalBoundaryRows ?? ''}`);

  const rows = await Promise.all(EXPECTED_BLOCKS.map(async (block, index) => {
    const packetRow = packetByBlock.get(block) ?? {};
    const templateRow = templateByBlockId.get(EXPECTED_BLOCK_IDS[index]) ?? {};
    const gateRow = gateByBlock.get(block) ?? {};
    const sourceCopyRow = sourceCopyByBlockId.get(EXPECTED_BLOCK_IDS[index]) ?? {};
    const readinessRow = readinessByBlockId.get(EXPECTED_BLOCK_IDS[index]) ?? {};
    const pairedNeighbors = Array.isArray(packetRow.pairedNeighbors) ? packetRow.pairedNeighbors : [];
    const targetReference = packetRow.targetReference ?? {};
    const evidenceCrop = packetRow.evidenceCrop ?? templateRow.evidenceCrop ?? '';
    const evidenceCropExists = evidenceCrop
      ? await fileExists(path.resolve(frontendRoot, evidenceCrop))
      : false;
    const decision = normalizeDecision(templateRow.operatorDecision ?? packetRow.decision);
    const gateReasons = Array.isArray(gateRow.reasons) ? gateRow.reasons : [];
    const gateWarnings = Array.isArray(gateRow.warnings) ? gateRow.warnings : [];
    const riskFlags = asTextList(packetRow.riskFlags);
    const currentFailureReasons = asTextList(packetRow.currentFailureReasons);
    const approvalMissingFields = approvalMissingFieldsFor(templateRow, decision);

    if (!packetRow.blockId) blockers.push(`PACKET_ROW_MISSING:${block}`);
    if (!templateRow.blockId) blockers.push(`TEMPLATE_ROW_MISSING:${block}`);
    if (!gateRow.block) blockers.push(`GATE_ROW_MISSING:${block}`);
    if (!sourceCopyRow.blockId) blockers.push(`SOURCE_COPY_ROW_MISSING:${block}`);
    if (!readinessRow.blockId) blockers.push(`READINESS_ROW_MISSING:${block}`);
    if (!evidenceCropExists) blockers.push(`BOUNDARY_FIRST_EVIDENCE_MISSING:${block}`);
    if (!targetReference.currentPath) blockers.push(`BOUNDARY_FIRST_CURRENT_PATH_MISSING:${block}`);
    if (targetReference.candidateReferenceOnly !== true) blockers.push(`BOUNDARY_FIRST_CANDIDATE_NOT_REFERENCE_ONLY:${block}`);
    if (pairedNeighbors.length === 0) blockers.push(`BOUNDARY_FIRST_PAIRED_NEIGHBOR_MISSING:${block}`);

    return {
      reviewBoardVersion: REVIEW_BOARD_VERSION,
      rowNumber: index + 1,
      blockId: packetRow.blockId ?? templateRow.blockId ?? EXPECTED_BLOCK_IDS[index],
      block,
      name: packetRow.name ?? templateRow.name ?? '',
      category: packetRow.category ?? templateRow.category ?? '',
      reviewType: packetRow.reviewType ?? '',
      packetStatus: packetRow.status ?? '',
      readinessStatus: readinessRow.status ?? '',
      templateEditableSource: templateRow.editableSource ?? '',
      templateDecision: decision,
      approvalMissingFields,
      nextOperatorAction: nextOperatorActionFor(approvalMissingFields),
      gateReadyForSourceCopy: gateRow.readyForSourceCopy ?? false,
      gateReasons,
      gateWarnings,
      sourceCopyApproved: sourceCopyRow.approvedInTemplate ?? false,
      sourceCopyChanged: sourceCopyRow.changed ?? false,
      evidenceCrop,
      evidenceCropExists,
      pairedBlocks: pairedNeighbors.map((paired) => paired.block),
      operatorFocus: packetRow.operatorFocus ?? '',
      operatorAction: packetRow.operatorAction ?? '',
      approvalRule: packetRow.approvalRule ?? '',
      currentFailureReasons,
      riskFlags,
      targetReference: {
        currentPath: targetReference.currentPath ?? '',
        currentLabelPoint: pointText(targetReference.currentLabelX, targetReference.currentLabelY),
        currentPathPointCount: targetReference.currentPathPointCount ?? 0,
        candidatePath: targetReference.candidatePath ?? '',
        candidatePathPointCount: targetReference.candidatePathPointCount ?? 0,
        candidateReferenceOnly: targetReference.candidateReferenceOnly === true,
        candidateStatus: targetReference.candidateStatus ?? '',
      },
      pairedNeighbors,
      approvalChecklist: [
        'operatorDecision=APPROVED',
        'correctedPath manually traced from the official PNG',
        'correctedLabelX/Y inside correctedPath',
        'reviewer filled',
        'reviewedAt filled with parseable timestamp',
        'no duplicate correctedPath across boundary-first rows',
        'paired neighbor ownership remains non-overlapping',
        'candidatePath is reference-only and is not copied',
      ],
      nextGateCommand: 'npm run stadium:daegu:p1-boundary-first-template-gate',
    };
  }));

  const approvedRows = rows.filter((row) => row.templateDecision === 'APPROVED');
  const approvedInvalidRows = rows.filter((row) => row.templateDecision === 'APPROVED' && row.gateReasons.length > 0);
  const boardStatus = blockers.length > 0
    ? 'blocked'
    : gate.summary?.status === 'ready-for-source-copy' && sourceCopy.summary?.status === 'ready-for-write-source-input'
      ? 'ready-for-source-input-copy'
      : approvedRows.length > 0
        ? 'partial-boundary-approval'
        : 'waiting-for-operator';

  const summary = {
    reviewBoardVersion: REVIEW_BOARD_VERSION,
    status: boardStatus,
    targetBatchId: TARGET_BATCH_ID,
    packet: path.relative(frontendRoot, packetPath),
    operatorTemplate: path.relative(frontendRoot, templatePath),
    templateGate: path.relative(frontendRoot, gatePath),
    sourceCopyDryRun: path.relative(frontendRoot, sourceCopyPath),
    readiness: path.relative(frontendRoot, readinessPath),
    totalRows: rows.length,
    readyForOperatorRows: rows.filter((row) => row.packetStatus === 'READY_FOR_OPERATOR').length,
    approvedRows: approvedRows.length,
    approvedInvalidRows: approvedInvalidRows.length,
    rowsMissingApprovalFields: rows.filter((row) => row.approvalMissingFields.length > 0).length,
    gateStatus: gate.summary?.status ?? '',
    sourceCopyStatus: sourceCopy.summary?.status ?? '',
    canAdvanceToSingleCorrectedPath: readiness.summary?.canAdvanceToSingleCorrectedPath === true,
    productionWriteAllowed: false,
    writesOperatorDecision: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'This review board is read-only.',
      'It combines packet, operator template, template gate, source-copy dry-run, and readiness reports.',
      'It never writes operatorDecision or corrected fields into source input.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'candidatePath is reference-only and must not be copied into correctedPath.',
      'Production write remains forbidden until the normal P1 and postwrite gates pass.',
    ],
    rows,
  };

  const svgRows = rows.flatMap((row) => [
    ...row.pairedNeighbors.map((paired) => `<path d="${xmlEscape(paired.currentPath)}" fill="rgba(37,99,235,0.10)" stroke="#2563eb" stroke-width="3" vector-effect="non-scaling-stroke" data-kind="paired-neighbor" data-block="${xmlEscape(paired.block)}" />`),
    row.targetReference.candidatePath
      ? `<path d="${xmlEscape(row.targetReference.candidatePath)}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="10 8" vector-effect="non-scaling-stroke" data-kind="candidate-reference-only" data-block="${xmlEscape(row.block)}" />`
      : '',
    `<path d="${xmlEscape(row.targetReference.currentPath)}" fill="rgba(220,38,38,0.20)" stroke="#dc2626" stroke-width="5" vector-effect="non-scaling-stroke" data-kind="target-current" data-block="${xmlEscape(row.block)}" />`,
    row.targetReference.currentLabelPoint
      ? `<circle cx="${xmlEscape(row.targetReference.currentLabelPoint.split(',')[0])}" cy="${xmlEscape(row.targetReference.currentLabelPoint.split(',')[1])}" r="8" fill="#dc2626" data-kind="target-label" data-block="${xmlEscape(row.block)}" />`
      : '',
    `<text x="24" y="${70 + (row.rowNumber * 34)}" font-family="Arial, sans-serif" font-size="24" fill="#111827">${xmlEscape(row.rowNumber)}. ${xmlEscape(row.block)} ${xmlEscape(row.templateDecision)}</text>`,
  ]);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" width="${VIEWBOX.width}" height="${VIEWBOX.height}">`,
    '<rect width="100%" height="100%" fill="#fff" />',
    `<text x="24" y="34" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#111827">Daegu P1 boundary-first review board: red=current target, blue=paired, orange=candidate reference-only</text>`,
    `<text x="24" y="62" font-family="Arial, sans-serif" font-size="18" fill="#374151">status=${xmlEscape(summary.status)} approved=${summary.approvedRows}/${summary.totalRows} productionWriteAllowed=false</text>`,
    '<g id="daegu-p1-boundary-first-review-board">',
    ...svgRows.filter(Boolean),
    '</g>',
    '</svg>',
  ].join('\n');

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-review-board.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-review-board.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-review-board.md');
  const svgPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-review-board.svg');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'block',
      'packetStatus',
      'readinessStatus',
      'templateDecision',
      'templateEditableSource',
      'approvalMissingFields',
      'gateReadyForSourceCopy',
      'sourceCopyApproved',
      'pairedBlocks',
      'evidenceCrop',
      'currentFailureReasons',
      'riskFlags',
      'nextGateCommand',
    ],
    ...rows.map((row) => [
      row.block,
      row.packetStatus,
      row.readinessStatus,
      row.templateDecision,
      row.templateEditableSource,
      row.approvalMissingFields.join(' '),
      row.gateReadyForSourceCopy,
      row.sourceCopyApproved,
      row.pairedBlocks.join(' '),
      row.evidenceCrop,
      row.currentFailureReasons.join(' '),
      row.riskFlags.join(' '),
      row.nextGateCommand,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P1 Boundary-First Review Board',
    '',
    `- review board version: \`${REVIEW_BOARD_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- approved rows: ${summary.approvedRows}/${summary.totalRows}`,
    `- gate status: \`${summary.gateStatus || 'none'}\``,
    `- source-copy status: \`${summary.sourceCopyStatus || 'none'}\``,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- operator template: \`${summary.operatorTemplate}\``,
    `- next gate command: \`npm run stadium:daegu:p1-boundary-first-template-gate\``,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Gate Snapshot',
    '',
    markdownTable(
      ['source', 'status', 'write flags'],
      [
        ['packet', packet.summary?.status ?? '', `operator=${packet.summary?.writesOperatorDecision} template=${packet.summary?.writesCorrectionsTemplate} production=${packet.summary?.writesProductionData}`],
        ['template gate', gate.summary?.status ?? '', `sourceInput=${gate.summary?.writesSourceInput} production=${gate.summary?.writesProductionData}`],
        ['source-copy dry-run', sourceCopy.summary?.status ?? '', `sourceInput=${sourceCopy.summary?.writesSourceInput} production=${sourceCopy.summary?.writesProductionData}`],
        ['readiness', readiness.summary?.status ?? '', `advance=${summary.canAdvanceToSingleCorrectedPath}`],
      ],
    ),
    '',
    '## Rows',
    '',
    markdownTable(
      ['block', 'decision', 'missing approval fields', 'gate ready', 'paired', 'evidence', 'review action'],
      rows.map((row) => [
        `\`${row.block}\``,
        `\`${row.templateDecision}\``,
        row.approvalMissingFields.map((field) => `\`${field}\``).join(' ') || '-',
        String(row.gateReadyForSourceCopy),
        row.pairedBlocks.map((paired) => `\`${paired}\``).join(' '),
        row.evidenceCrop,
        row.operatorAction,
      ]),
    ),
    '',
    '## Block Details',
    '',
    ...rows.flatMap((row) => [
      `### ${row.block}`,
      '',
      `- evidence crop: \`${row.evidenceCrop}\``,
      `- paired blocks: ${row.pairedBlocks.map((paired) => `\`${paired}\``).join(' ') || '-'}`,
      `- review type: \`${row.reviewType || 'none'}\``,
      `- current label: \`${row.targetReference.currentLabelPoint || 'none'}\`, current path points: ${row.targetReference.currentPathPointCount}`,
      `- candidate status: \`${row.targetReference.candidateStatus || 'none'}\`, candidate reference only: ${row.targetReference.candidateReferenceOnly}, candidate points: ${row.targetReference.candidatePathPointCount}`,
      `- current failures: ${row.currentFailureReasons.map((reason) => `\`${reason}\``).join(' ') || '-'}`,
      `- risk flags: ${row.riskFlags.map((flag) => `\`${flag}\``).join(' ') || '-'}`,
      `- missing approval fields: ${row.approvalMissingFields.map((field) => `\`${field}\``).join(' ') || '-'}`,
      `- next operator action: ${row.nextOperatorAction}`,
      `- approval rule: ${row.approvalRule || '-'}`,
      `- checklist: ${row.approvalChecklist.map((item) => `\`${item}\``).join(' ')}`,
      '',
    ]),
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');
  await fs.writeFile(svgPath, `${svg}\n`, 'utf8');

  console.log(`p1_boundary_first_review_board_json:${jsonPath}`);
  console.log(`p1_boundary_first_review_board_csv:${csvPath}`);
  console.log(`p1_boundary_first_review_board_markdown:${markdownPath}`);
  console.log(`p1_boundary_first_review_board_svg:${svgPath}`);
  console.log(`status:${summary.status} rows=${summary.totalRows} approved=${summary.approvedRows}/${summary.totalRows} gate=${summary.gateStatus} sourceCopy=${summary.sourceCopyStatus}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1BoundaryFirstSourceCopy = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const COPY_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_SOURCE_COPY_V1';
  const GATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_TEMPLATE_GATE_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const EXPECTED_BLOCK_IDS = [
    'daegu-first-table-t1-1',
    'daegu-third-table-t3-2',
    'daegu-central-table-v-v1',
    'daegu-central-table-v-v2',
    'daegu-central-table-v-v3',
  ];
  const COPY_FIELDS = [
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

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const sha256File = async (filePath) => crypto
    .createHash('sha256')
    .update(await fs.readFile(filePath))
    .digest('hex');

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

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const normalizeCopyFields = (row) => ({
    operatorDecision: normalizeDecision(row.operatorDecision),
    correctedPath: String(row.correctedPath ?? '').trim(),
    correctedLabelX: row.correctedLabelX ?? '',
    correctedLabelY: row.correctedLabelY ?? '',
    reviewer: String(row.reviewer ?? '').trim(),
    reviewedAt: String(row.reviewedAt ?? '').trim(),
    operatorNote: String(row.operatorNote ?? '').trim(),
  });

  const rowChanged = (before, after) => COPY_FIELDS.some((field) => String(before[field] ?? '') !== String(after[field] ?? ''));

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const templatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-operator-template.json')),
  );
  const sourceInputPath = path.resolve(
    frontendRoot,
    argValue('--source-input', path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json')),
  );
  const gatePath = path.resolve(
    frontendRoot,
    argValue('--gate', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-template-gate.json')),
  );
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const writeSourceInput = hasFlag('--write-source-input');

  const template = await readJson(templatePath);
  const sourceInput = await readJson(sourceInputPath);
  const gate = await readJson(gatePath);
  const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
  const sourceRows = Array.isArray(sourceInput.corrections) ? sourceInput.corrections : [];
  const approvedTemplateRows = templateRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const approvedByBlockId = new Map(approvedTemplateRows.map((row) => [row.blockId, row]));
  const blockers = [];
  const warnings = [];

  const templateSha256 = await sha256File(templatePath);
  const sourceInputSha256Before = await sha256File(sourceInputPath);
  const expectedTemplatePath = path.relative(frontendRoot, templatePath);
  const expectedSourceInputPath = path.relative(frontendRoot, sourceInputPath);

  if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  if (template.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
  if (template.templateOnly !== true) blockers.push('TEMPLATE_ONLY_NOT_TRUE');
  if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (sourceInput.packageVersion !== 'DAEGU_P1_OPERATOR_PACKAGE_V1') {
    blockers.push(`SOURCE_INPUT_PACKAGE_VERSION_MISMATCH:${sourceInput.packageVersion ?? ''}`);
  }
  if (sourceInput.targetBatchId !== TARGET_BATCH_ID) blockers.push(`SOURCE_INPUT_BATCH_MISMATCH:${sourceInput.targetBatchId ?? ''}`);
  if (gate.summary?.gateVersion !== GATE_VERSION) blockers.push(`GATE_VERSION_MISMATCH:${gate.summary?.gateVersion ?? ''}`);
  if (gate.summary?.template !== expectedTemplatePath) blockers.push(`GATE_TEMPLATE_PATH_MISMATCH:${gate.summary?.template ?? ''}:${expectedTemplatePath}`);
  if (gate.summary?.sourceInput !== expectedSourceInputPath) {
    blockers.push(`GATE_SOURCE_INPUT_PATH_MISMATCH:${gate.summary?.sourceInput ?? ''}:${expectedSourceInputPath}`);
  }
  if (!gate.summary?.templateSha256) blockers.push('GATE_TEMPLATE_SHA256_MISSING');
  if (!gate.summary?.sourceInputSha256) blockers.push('GATE_SOURCE_INPUT_SHA256_MISSING');
  if (gate.summary?.templateSha256 && gate.summary.templateSha256 !== templateSha256) {
    blockers.push('GATE_TEMPLATE_SHA256_STALE');
  }
  if (gate.summary?.sourceInputSha256 && gate.summary.sourceInputSha256 !== sourceInputSha256Before) {
    blockers.push('GATE_SOURCE_INPUT_SHA256_STALE');
  }
  if (gate.summary?.status !== 'ready-for-source-copy') {
    warnings.push(`GATE_NOT_READY_FOR_SOURCE_COPY:${gate.summary?.status ?? ''}`);
  }
  if ((gate.summary?.blockers ?? []).length > 0) blockers.push('GATE_HAS_BLOCKERS');
  if ((gate.summary?.invalidRows ?? 0) > 0) blockers.push(`GATE_INVALID_ROWS:${gate.summary.invalidRows}`);
  if ((gate.summary?.approvedRows ?? 0) !== EXPECTED_BLOCK_IDS.length) {
    warnings.push(`GATE_REQUIRES_ALL_BOUNDARY_FIRST_APPROVALS:${gate.summary?.approvedRows ?? 0}:${EXPECTED_BLOCK_IDS.length}`);
  }

  const templateIds = templateRows.map((row) => row.blockId);
  const sourceIds = sourceRows.map((row) => row.blockId);
  const duplicateTemplateIds = templateIds.filter((blockId, index, ids) => ids.indexOf(blockId) !== index);
  const duplicateSourceIds = sourceIds.filter((blockId, index, ids) => ids.indexOf(blockId) !== index);
  const missingTemplateIds = EXPECTED_BLOCK_IDS.filter((blockId) => !templateIds.includes(blockId));
  const missingSourceIds = EXPECTED_BLOCK_IDS.filter((blockId) => !sourceIds.includes(blockId));
  const extraTemplateIds = templateIds.filter((blockId) => !EXPECTED_BLOCK_IDS.includes(blockId));
  if (templateRows.length !== EXPECTED_BLOCK_IDS.length) blockers.push(`TEMPLATE_ROW_COUNT_MISMATCH:${templateRows.length}:${EXPECTED_BLOCK_IDS.length}`);
  if (duplicateTemplateIds.length > 0) blockers.push(`DUPLICATE_TEMPLATE_BLOCK_ID:${[...new Set(duplicateTemplateIds)].join(' ')}`);
  if (duplicateSourceIds.length > 0) blockers.push(`DUPLICATE_SOURCE_INPUT_BLOCK_ID:${[...new Set(duplicateSourceIds)].join(' ')}`);
  if (missingTemplateIds.length > 0) blockers.push(`TEMPLATE_MISSING_BOUNDARY_ROWS:${missingTemplateIds.join(' ')}`);
  if (missingSourceIds.length > 0) blockers.push(`SOURCE_INPUT_MISSING_BOUNDARY_ROWS:${missingSourceIds.join(' ')}`);
  if (extraTemplateIds.length > 0) blockers.push(`TEMPLATE_HAS_NON_BOUNDARY_ROWS:${extraTemplateIds.join(' ')}`);
  if (approvedTemplateRows.length !== EXPECTED_BLOCK_IDS.length) {
    warnings.push(`BOUNDARY_FIRST_SOURCE_COPY_WAITING_FOR_ALL_APPROVALS:${approvedTemplateRows.length}:${EXPECTED_BLOCK_IDS.length}`);
  }

  const rowReports = EXPECTED_BLOCK_IDS.map((blockId) => {
    const templateRow = approvedByBlockId.get(blockId);
    const sourceRow = sourceRows.find((row) => row.blockId === blockId);
    const copiedFields = templateRow ? normalizeCopyFields(templateRow) : {};
    const afterRow = sourceRow && templateRow ? { ...sourceRow, ...copiedFields } : sourceRow;
    return {
      blockId,
      block: templateRow?.block ?? sourceRow?.block ?? '',
      sourceMatched: Boolean(sourceRow),
      approvedInTemplate: Boolean(templateRow),
      changed: Boolean(sourceRow && templateRow && rowChanged(sourceRow, afterRow)),
      operatorDecision: templateRow ? normalizeDecision(templateRow.operatorDecision) : '',
      copiedFields: templateRow ? COPY_FIELDS : [],
    };
  });

  const canCopy = blockers.length === 0
    && gate.summary?.status === 'ready-for-source-copy'
    && approvedTemplateRows.length === EXPECTED_BLOCK_IDS.length
    && rowReports.every((row) => row.sourceMatched && row.approvedInTemplate);
  if (writeSourceInput && !canCopy) blockers.push('WRITE_SOURCE_INPUT_REQUIRES_READY_GATE_AND_FIVE_APPROVALS');

  const mergedRows = sourceRows.map((sourceRow) => {
    const templateRow = approvedByBlockId.get(sourceRow.blockId);
    if (!templateRow) return sourceRow;
    return {
      ...sourceRow,
      ...normalizeCopyFields(templateRow),
    };
  });
  const mergedInput = {
    ...sourceInput,
    generatedAt: new Date().toISOString(),
    existingOperatorInput: path.relative(frontendRoot, sourceInputPath),
    corrections: mergedRows,
  };

  if (writeSourceInput && canCopy && blockers.length === 0) {
    await fs.writeFile(sourceInputPath, `${JSON.stringify(mergedInput, null, 2)}\n`, 'utf8');
  }

  const sourceInputSha256After = await sha256File(sourceInputPath);
  const status = blockers.length > 0
    ? 'blocked'
    : canCopy
      ? writeSourceInput ? 'source-input-updated' : 'ready-for-write-source-input'
      : approvedTemplateRows.length > 0 ? 'partial-boundary-approval' : 'waiting-for-operator';
  const summary = {
    copyVersion: COPY_VERSION,
    status,
    mode: writeSourceInput ? 'write-source-input' : 'dry-run',
    template: expectedTemplatePath,
    templateSha256,
    sourceInput: expectedSourceInputPath,
    sourceInputSha256Before,
    sourceInputSha256After,
    gate: path.relative(frontendRoot, gatePath),
    gateStatus: gate.summary?.status ?? '',
    targetBatchId: TARGET_BATCH_ID,
    totalBoundaryRows: EXPECTED_BLOCK_IDS.length,
    approvedTemplateRows: approvedTemplateRows.length,
    copiedRows: canCopy ? rowReports.filter((row) => row.approvedInTemplate).length : 0,
    changedRows: canCopy ? rowReports.filter((row) => row.changed).length : 0,
    productionWriteAllowed: false,
    writesSourceInput: writeSourceInput && canCopy && blockers.length === 0,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
  };
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    rows: rowReports,
    safetyContract: [
      'This script copies only operator-approved boundary-first rows from the boundary template into the P1 source input.',
      'It requires a fresh template gate with matching templateSha256 and sourceInputSha256.',
      'It requires all five boundary-first rows to be APPROVED before --write-source-input can update the source input.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts or promotes blocks to OFFICIAL_IMAGE_TRACED.',
    ],
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-source-copy.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-source-copy.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-source-copy.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    ['block', 'sourceMatched', 'approvedInTemplate', 'changed', 'operatorDecision', 'copiedFields'],
    ...rowReports.map((row) => [
      row.block,
      row.sourceMatched,
      row.approvedInTemplate,
      row.changed,
      row.operatorDecision,
      row.copiedFields.join(' '),
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P1 Boundary-First Source Copy',
    '',
    `- copy version: \`${COPY_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- mode: \`${summary.mode}\``,
    `- gate status: \`${summary.gateStatus || 'none'}\``,
    `- approved template rows: ${summary.approvedTemplateRows}/${summary.totalBoundaryRows}`,
    `- copied rows: ${summary.copiedRows}`,
    `- changed rows: ${summary.changedRows}`,
    `- writes source input: ${summary.writesSourceInput}`,
    `- writes production data: ${summary.writesProductionData}`,
    '',
    '## Rows',
    '',
    markdownTable(
      ['block', 'source matched', 'approved', 'changed', 'decision'],
      rowReports.map((row) => [
        `\`${row.block || row.blockId}\``,
        String(row.sourceMatched),
        String(row.approvedInTemplate),
        String(row.changed),
        `\`${row.operatorDecision || 'none'}\``,
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

  console.log(`p1_boundary_first_source_copy_json:${jsonPath}`);
  console.log(`p1_boundary_first_source_copy_csv:${csvPath}`);
  console.log(`p1_boundary_first_source_copy_markdown:${markdownPath}`);
  console.log(`status:${summary.status} mode=${summary.mode} approved=${summary.approvedTemplateRows}/${summary.totalBoundaryRows} copied=${summary.copiedRows} changed=${summary.changedRows}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1BoundaryFirstTemplateGate = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const GATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_TEMPLATE_GATE_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const EXPECTED_BLOCK_IDS = [
    'daegu-first-table-t1-1',
    'daegu-third-table-t3-2',
    'daegu-central-table-v-v1',
    'daegu-central-table-v-v2',
    'daegu-central-table-v-v3',
  ];
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const readOptionalJson = async (filePath) => {
    try {
      return await readJson(filePath);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
      throw error;
    }
  };

  const sha256File = async (filePath) => crypto
    .createHash('sha256')
    .update(await fs.readFile(filePath))
    .digest('hex');

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

  const normalizePath = (pathData) => String(pathData ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toUpperCase();

  const isBlank = (value) => String(value ?? '').trim() === '';

  const pathCommands = (pathData) => String(pathData ?? '').match(/[AaCcHhLlMmQqSsTtVvZz]/g) ?? [];

  const pathPoints = (pathData) => {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
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

  const pointInPolygon = (point, polygon) => {
    if (polygon.length < 3) return false;
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
    const imageGeometry = block.imageGeometry ?? {};
    const pathData = imageGeometry.hitPath ?? imageGeometry.visualPath ?? imageGeometry.d;
    if (pathData === imageGeometry.d && Array.isArray(imageGeometry.paths) && imageGeometry.paths.length > 0) {
      return imageGeometry.paths;
    }
    return pathData ? [pathData] : [];
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

  const validatePath = (pathData) => {
    const reasons = [];
    const commands = pathCommands(pathData);
    const unsupportedCommands = commands.filter((command) => !['M', 'm', 'L', 'l', 'Z', 'z'].includes(command));
    const points = pathPoints(pathData);

    if (isBlank(pathData)) reasons.push('CORRECTED_PATH_REQUIRED');
    if (unsupportedCommands.length > 0) reasons.push(`UNSUPPORTED_PATH_COMMANDS:${[...new Set(unsupportedCommands)].join('')}`);
    if (commands.filter((command) => command.toUpperCase() === 'M').length !== 1) reasons.push('SINGLE_POLYGON_PATH_REQUIRED');
    if (!commands.some((command) => command.toUpperCase() === 'Z')) reasons.push('PATH_NOT_CLOSED');
    if (points.length < 6) reasons.push('PATH_REQUIRES_AT_LEAST_SIX_POINTS');
    if (points.some(([x, y]) => x < 0 || y < 0 || x > 1707 || y > 2048)) reasons.push('PATH_OUTSIDE_DAEGU_IMAGE_BOUNDS');
    if (points.length >= 3 && polygonArea(points) < 16) reasons.push('PATH_AREA_TOO_SMALL');
    if (points.length >= 4 && hasSelfIntersection(points)) reasons.push('PATH_SELF_INTERSECTION');

    return { reasons, points };
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const templatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-operator-template.json')),
  );
  const sourceInputPath = path.resolve(
    frontendRoot,
    argValue('--source-input', path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json')),
  );
  const boundaryAidPath = path.resolve(
    frontendRoot,
    argValue('--boundary-aid', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-input-aid.json')),
  );
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));

  const template = await readJson(templatePath);
  const sourceInput = await readJson(sourceInputPath);
  const boundaryAid = await readOptionalJson(boundaryAidPath);
  const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
  const sourceRows = Array.isArray(sourceInput.corrections) ? sourceInput.corrections : [];
  const boundaryAidRows = Array.isArray(boundaryAid?.rows) ? boundaryAid.rows : [];
  const sourceByBlockId = new Map(sourceRows.map((row) => [row.blockId, row]));
  const boundaryAidByBlockId = new Map(boundaryAidRows.map((row) => [row.target?.blockId, row]).filter(([blockId]) => blockId));
  const blockers = [];
  const warnings = [];

  if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  if (template.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
  if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (template.templateOnly !== true) blockers.push('TEMPLATE_ONLY_NOT_TRUE');
  if (sourceInput.targetBatchId !== TARGET_BATCH_ID) blockers.push(`SOURCE_INPUT_BATCH_MISMATCH:${sourceInput.targetBatchId ?? ''}`);
  if (boundaryAid && boundaryAid.summary?.inputAidVersion !== 'DAEGU_P1_BOUNDARY_INPUT_AID_V1') {
    blockers.push(`BOUNDARY_AID_VERSION_MISMATCH:${boundaryAid.summary?.inputAidVersion ?? ''}`);
  }

  const templateIds = templateRows.map((row) => row.blockId);
  const duplicateTemplateIds = templateIds.filter((blockId, index, values) => values.indexOf(blockId) !== index);
  const missingExpectedIds = EXPECTED_BLOCK_IDS.filter((blockId) => !templateIds.includes(blockId));
  const extraTemplateIds = templateIds.filter((blockId) => !EXPECTED_BLOCK_IDS.includes(blockId));
  if (templateRows.length !== EXPECTED_BLOCK_IDS.length) blockers.push(`TEMPLATE_ROW_COUNT_MISMATCH:${templateRows.length}:${EXPECTED_BLOCK_IDS.length}`);
  if (duplicateTemplateIds.length > 0) blockers.push(`DUPLICATE_TEMPLATE_BLOCK_ID:${[...new Set(duplicateTemplateIds)].join(' ')}`);
  if (missingExpectedIds.length > 0) blockers.push(`TEMPLATE_MISSING_BOUNDARY_ROWS:${missingExpectedIds.join(' ')}`);
  if (extraTemplateIds.length > 0) blockers.push(`TEMPLATE_HAS_NON_BOUNDARY_ROWS:${extraTemplateIds.join(' ')}`);

  const approvedRows = templateRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const correctedPathGroups = approvedRows.reduce((groups, row) => {
    const key = normalizePath(row.correctedPath);
    if (!key) return groups;
    const group = groups.get(key) ?? [];
    group.push(row.block);
    groups.set(key, group);
    return groups;
  }, new Map());
  const duplicateCorrectedPathBlocks = new Set();
  correctedPathGroups.forEach((blocks) => {
    if (blocks.length < 2) return;
    blocks.forEach((block) => duplicateCorrectedPathBlocks.add(block));
  });
  const approvedCandidateBlocks = approvedRows
    .filter((row) => !isBlank(row.correctedPath))
    .map((row) => ({
      id: row.blockId,
      block: row.block,
      imageGeometry: {
        d: row.correctedPath,
        hitPath: row.correctedPath,
      },
    }));
  const approvedTemplateByBlock = new Map(approvedRows.map((row) => [row.block, row]));
  const normalSelectableBlocks = DAEGU_BLOCKS.filter(isDaeguNormalSelectableSeat);

  const pairedLabelPoint = (paired) => {
    const approvedPairedRow = approvedTemplateByBlock.get(paired.block);
    const approvedX = Number(approvedPairedRow?.correctedLabelX);
    const approvedY = Number(approvedPairedRow?.correctedLabelY);
    if (Number.isFinite(approvedX) && Number.isFinite(approvedY)) {
      return [approvedX, approvedY];
    }
    const referenceX = Number(paired.labelX);
    const referenceY = Number(paired.labelY);
    return Number.isFinite(referenceX) && Number.isFinite(referenceY)
      ? [referenceX, referenceY]
      : null;
  };

  const rows = templateRows.map((row) => {
    const decision = normalizeDecision(row.operatorDecision);
    const sourceRow = sourceByBlockId.get(row.blockId);
    const boundaryAidRow = boundaryAidByBlockId.get(row.blockId);
    const reasons = [];
    const warningsForRow = [];
    const missingFields = [];

    if (!sourceRow) reasons.push('SOURCE_INPUT_ROW_MISSING');
    if (!DECISION_OPTIONS.has(decision)) reasons.push('INVALID_OPERATOR_DECISION');
    if (sourceRow && row.block !== sourceRow.block) reasons.push(`SOURCE_BLOCK_MISMATCH:${row.block}:${sourceRow.block}`);
    if (sourceRow && row.name !== sourceRow.name) warningsForRow.push('SOURCE_NAME_CHANGED_REVIEW_BEFORE_COPY');

    let pathValidation = { reasons: [], points: [] };
    if (decision === 'APPROVED') {
      [
        ['correctedPath', row.correctedPath],
        ['correctedLabelX', row.correctedLabelX],
        ['correctedLabelY', row.correctedLabelY],
        ['reviewer', row.reviewer],
        ['reviewedAt', row.reviewedAt],
      ].forEach(([field, value]) => {
        if (isBlank(value)) missingFields.push(field);
      });
      if (missingFields.length > 0) reasons.push(`APPROVED_ROW_MISSING_FIELDS:${missingFields.join(' ')}`);

      pathValidation = validatePath(row.correctedPath);
      reasons.push(...pathValidation.reasons);

      const correctedPathKey = normalizePath(row.correctedPath);
      const currentReferencePaths = [
        sourceRow?.currentPath,
        boundaryAidRow?.targetGeometryReference?.currentPath,
      ].map(normalizePath).filter(Boolean);
      const candidateReferencePaths = [
        sourceRow?.candidatePath,
        boundaryAidRow?.targetGeometryReference?.candidatePath,
      ].map(normalizePath).filter(Boolean);
      if (currentReferencePaths.includes(correctedPathKey)) reasons.push('CORRECTED_PATH_REUSES_CURRENT_PATH');
      if (candidateReferencePaths.includes(correctedPathKey)) reasons.push('CORRECTED_PATH_REUSES_CANDIDATE_PATH');

      const labelX = Number(row.correctedLabelX);
      const labelY = Number(row.correctedLabelY);
      if (!Number.isFinite(labelX)) reasons.push('CORRECTED_LABEL_X_NOT_NUMERIC');
      if (!Number.isFinite(labelY)) reasons.push('CORRECTED_LABEL_Y_NOT_NUMERIC');
      if (pathValidation.points.length >= 3 && Number.isFinite(labelX) && Number.isFinite(labelY)) {
        if (!pointInPolygon([labelX, labelY], pathValidation.points)) reasons.push('CORRECTED_LABEL_OUTSIDE_PATH');
        const topHitBlock = topHitBlockAt([...normalSelectableBlocks, ...approvedCandidateBlocks], [labelX, labelY]);
        if (topHitBlock?.id !== row.blockId) {
          reasons.push(`CORRECTED_LABEL_TOP_HIT_MISMATCH:${topHitBlock?.block ?? 'none'}`);
        }

        const capturedPairedLabels = (boundaryAidRow?.pairedGeometryReference ?? [])
          .map((paired) => ({ paired, labelPoint: pairedLabelPoint(paired) }))
          .filter(({ labelPoint }) => labelPoint)
          .filter(({ labelPoint }) => pointInPolygon(labelPoint, pathValidation.points))
          .map(({ paired }) => paired)
          .map((paired) => paired.block);
        if (capturedPairedLabels.length > 0) {
          reasons.push(`CORRECTED_PATH_CAPTURES_PAIRED_LABEL:${capturedPairedLabels.join(' ')}`);
        }
      }
      if (row.reviewedAt && Number.isNaN(Date.parse(row.reviewedAt))) reasons.push('REVIEWED_AT_NOT_PARSEABLE');
      if (duplicateCorrectedPathBlocks.has(row.block)) reasons.push('BOUNDARY_FIRST_DUPLICATE_CORRECTED_PATH');
    } else if (!isBlank(row.correctedPath)) {
      warningsForRow.push('CORRECTED_PATH_FILLED_FOR_NON_APPROVED_ROW');
    }

    return {
      blockId: row.blockId,
      block: row.block,
      decision,
      sourceMatched: Boolean(sourceRow),
      approved: decision === 'APPROVED',
      readyForSourceCopy: decision !== 'APPROVED' || reasons.length === 0,
      reasons,
      warnings: warningsForRow,
      correctedPathPointCount: pathValidation.points.length,
      pairedContextRows: boundaryAidRow?.pairedGeometryReference?.length ?? 0,
    };
  });

  const invalidRows = rows.filter((row) => row.reasons.length > 0);
  const approvedInvalidRows = rows.filter((row) => row.approved && row.reasons.length > 0);
  const nonApprovedFilledRows = rows.filter((row) => row.warnings.includes('CORRECTED_PATH_FILLED_FOR_NON_APPROVED_ROW'));
  if (invalidRows.length > 0) blockers.push(`BOUNDARY_FIRST_TEMPLATE_INVALID_ROWS:${invalidRows.map((row) => row.block).join(' ')}`);
  if (nonApprovedFilledRows.length > 0) warnings.push(`BOUNDARY_FIRST_TEMPLATE_NON_APPROVED_FILLED_PATH:${nonApprovedFilledRows.map((row) => row.block).join(' ')}`);
  if (approvedRows.length === 0) warnings.push('BOUNDARY_FIRST_TEMPLATE_HAS_NO_APPROVED_ROWS');
  if (approvedRows.length > 0 && approvedRows.length < EXPECTED_BLOCK_IDS.length) {
    warnings.push(`BOUNDARY_FIRST_TEMPLATE_PARTIAL_APPROVAL:${approvedRows.length}:${EXPECTED_BLOCK_IDS.length}`);
  }

  const templateSha256 = await sha256File(templatePath);
  const sourceInputSha256 = await sha256File(sourceInputPath);
  const status = blockers.length > 0
    ? 'blocked'
    : approvedRows.length === EXPECTED_BLOCK_IDS.length
      ? 'ready-for-source-copy'
      : approvedRows.length > 0
        ? 'partial-boundary-approval'
        : 'waiting-for-operator';

  const summary = {
    gateVersion: GATE_VERSION,
    status,
    template: path.relative(frontendRoot, templatePath),
    templateSha256,
    sourceInput: path.relative(frontendRoot, sourceInputPath),
    sourceInputSha256,
    boundaryAid: path.relative(frontendRoot, boundaryAidPath),
    boundaryAidExists: Boolean(boundaryAid),
    totalRows: rows.length,
    approvedRows: approvedRows.length,
    approvedInvalidRows: approvedInvalidRows.length,
    invalidRows: invalidRows.length,
    nonApprovedFilledRows: nonApprovedFilledRows.length,
    productionWriteAllowed: false,
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
      'This gate is read-only and never copies template rows into the source P1 input.',
      'Only the five boundary-first rows may be present in the operator template.',
      'APPROVED rows must contain correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt.',
      'APPROVED rows must not copy currentPath or candidatePath into correctedPath.',
      'APPROVED rows must keep correctedLabelX/Y inside correctedPath and top-hit on the same target block.',
      'APPROVED rows must not capture paired neighbor label points.',
      'APPROVED rows must not contain self-intersecting correctedPath polygons.',
      'Duplicate correctedPath among approved boundary-first rows is blocked.',
      'Production write remains forbidden until the source input is updated and full P1 gates pass.',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-template-gate.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-template-gate.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-template-gate.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    ['block', 'decision', 'approved', 'readyForSourceCopy', 'reasons', 'warnings', 'correctedPathPointCount'],
    ...rows.map((row) => [
      row.block,
      row.decision,
      row.approved,
      row.readyForSourceCopy,
      row.reasons.join(' '),
      row.warnings.join(' '),
      row.correctedPathPointCount,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P1 Boundary-First Template Gate',
    '',
    `- gate version: \`${GATE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- total rows: ${summary.totalRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- approved invalid rows: ${summary.approvedInvalidRows}`,
    `- invalid rows: ${summary.invalidRows}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Rows',
    '',
    markdownTable(
      ['block', 'decision', 'ready', 'reasons'],
      rows.map((row) => [
        `\`${row.block}\``,
        `\`${row.decision}\``,
        String(row.readyForSourceCopy),
        row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
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

  console.log(`p1_boundary_first_template_gate_json:${jsonPath}`);
  console.log(`p1_boundary_first_template_gate_csv:${csvPath}`);
  console.log(`p1_boundary_first_template_gate_markdown:${markdownPath}`);
  console.log(`status:${summary.status} rows=${summary.totalRows} approved=${summary.approvedRows} invalid=${summary.invalidRows}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1BoundaryFirstTracingPack = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const TRACING_PACK_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_TRACING_PACK_V1';
  const REVIEW_BOARD_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_REVIEW_BOARD_V1';
  const ENTRY_SHEET_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_ENTRY_SHEET_V1';
  const PREFLIGHT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_ENTRY_PREFLIGHT_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const VIEWBOX = {
    width: DAEGU_SEATMAP_IMAGE.imageWidth,
    height: DAEGU_SEATMAP_IMAGE.imageHeight,
  };
  const EXPECTED_BLOCKS = ['T1-1', 'T3-2', 'V1', 'V2', 'V3'];
  const EXPECTED_BLOCK_IDS = [
    'daegu-first-table-t1-1',
    'daegu-third-table-t3-2',
    'daegu-central-table-v-v1',
    'daegu-central-table-v-v2',
    'daegu-central-table-v-v3',
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
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
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

  const boundsForLabel = (labelPoint) => {
    const [x, y] = String(labelPoint ?? '').split(',').map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { minX: x, minY: y, maxX: x, maxY: y };
  };

  const mergeBounds = (items, padding = 60) => {
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

  const labelCoordinates = (labelPoint) => {
    const [x, y] = String(labelPoint ?? '').split(',').map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
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

  const buildTargetSvg = (row, outputFilePath, officialImagePath) => {
    const crop = row.crop;
    const imageHref = path.relative(path.dirname(outputFilePath), officialImagePath);
    const label = labelCoordinates(row.targetReference.currentLabelPoint);
    const titleY = crop.y + 28;
    const detailY = titleY + 22;
    const actionY = detailY + 22;
    const fontSize = Math.max(14, Math.min(24, Math.round(crop.width / 25)));
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}" width="${crop.width}" height="${crop.height}">`,
      '<style>',
      '.official-image { opacity: 0.94; }',
      '.shade { fill: rgba(255, 255, 255, 0.58); stroke: none; }',
      '.grid { stroke: #0f172a; stroke-opacity: 0.18; stroke-width: 1; vector-effect: non-scaling-stroke; }',
      '.grid-label { font: 700 10px Arial, sans-serif; fill: #334155; stroke: #fff; stroke-width: 2; paint-order: stroke; }',
      '.target-current { fill: rgba(220, 38, 38, 0.22); stroke: #dc2626; stroke-width: 4; vector-effect: non-scaling-stroke; }',
      '.target-candidate { fill: none; stroke: #f59e0b; stroke-width: 3; stroke-dasharray: 10 7; vector-effect: non-scaling-stroke; }',
      '.paired-current { fill: rgba(37, 99, 235, 0.12); stroke: #2563eb; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.label-dot { fill: #111827; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.paired-dot { fill: #2563eb; stroke: #fff; stroke-width: 2; vector-effect: non-scaling-stroke; }',
      '.title { font: 900 24px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 5; paint-order: stroke; }',
      `.detail { font: 800 ${fontSize}px Arial, sans-serif; fill: #374151; stroke: #fff; stroke-width: 4; paint-order: stroke; }`,
      '.warning { font: 900 16px Arial, sans-serif; fill: #b91c1c; stroke: #fff; stroke-width: 4; paint-order: stroke; }',
      '</style>',
      `<image class="official-image" href="${xmlEscape(imageHref)}" x="0" y="0" width="${VIEWBOX.width}" height="${VIEWBOX.height}" preserveAspectRatio="none" />`,
      gridLines(crop, 25),
      ...row.pairedNeighbors.map((paired) => `<path class="paired-current" d="${xmlEscape(paired.currentPath)}"><title>${xmlEscape(`${paired.block} paired current path`)}</title></path>`),
      `<path class="target-current" d="${xmlEscape(row.targetReference.currentPath)}"><title>${xmlEscape(`${row.block} current path`)}</title></path>`,
      row.targetReference.candidatePath
        ? `<path class="target-candidate" d="${xmlEscape(row.targetReference.candidatePath)}"><title>${xmlEscape(`${row.block} candidate reference-only path`)}</title></path>`
        : '',
      ...row.pairedNeighbors.map((paired) => (
        Number.isFinite(paired.currentLabelX) && Number.isFinite(paired.currentLabelY)
          ? `<circle class="paired-dot" cx="${paired.currentLabelX}" cy="${paired.currentLabelY}" r="5" /><text class="detail" x="${paired.currentLabelX + 8}" y="${paired.currentLabelY - 8}">${xmlEscape(paired.block)}</text>`
          : ''
      )),
      label ? `<circle class="label-dot" cx="${label.x}" cy="${label.y}" r="7" />` : '',
      `<rect class="shade" x="${crop.x + 8}" y="${crop.y + 8}" width="${Math.min(crop.width - 16, 760)}" height="86" rx="0" />`,
      `<text class="title" x="${crop.x + 18}" y="${titleY}">${xmlEscape(`${row.rowNumber}. ${row.block} ${row.name}`)}</text>`,
      `<text class="detail" x="${crop.x + 18}" y="${detailY}">${xmlEscape(`editableTarget=${row.editableTarget} paired=${row.pairedBlocks.join(' ') || '-'}`)}</text>`,
      `<text class="warning" x="${crop.x + 18}" y="${actionY}">${xmlEscape('Trace manually on official PNG. Do not copy candidatePath into correctedPath.')}</text>`,
      '</svg>',
    ].filter(Boolean).join('\n');
  };

  const buildOverviewSvg = (rows, outputFilePath, officialImagePath) => {
    const imageHref = path.relative(path.dirname(outputFilePath), officialImagePath);
    const paths = rows.flatMap((row) => [
      ...row.pairedNeighbors.map((paired) => `<path class="paired-current" d="${xmlEscape(paired.currentPath)}" data-block="${xmlEscape(paired.block)}" />`),
      row.targetReference.candidatePath
        ? `<path class="target-candidate" d="${xmlEscape(row.targetReference.candidatePath)}" data-block="${xmlEscape(row.block)}" />`
        : '',
      `<path class="target-current" d="${xmlEscape(row.targetReference.currentPath)}" data-block="${xmlEscape(row.block)}" />`,
    ]).filter(Boolean);
    const labels = rows.map((row) => {
      const label = labelCoordinates(row.targetReference.currentLabelPoint);
      return label
        ? `<text class="target-label" x="${label.x + 10}" y="${label.y - 8}">${xmlEscape(row.block)}</text><circle class="target-dot" cx="${label.x}" cy="${label.y}" r="6" />`
        : '';
    });
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" width="${VIEWBOX.width}" height="${VIEWBOX.height}">`,
      '<style>',
      '.official-image { opacity: 0.88; }',
      '.target-current { fill: rgba(220, 38, 38, 0.22); stroke: #dc2626; stroke-width: 5; vector-effect: non-scaling-stroke; }',
      '.target-candidate { fill: none; stroke: #f59e0b; stroke-width: 3; stroke-dasharray: 10 7; vector-effect: non-scaling-stroke; }',
      '.paired-current { fill: rgba(37, 99, 235, 0.12); stroke: #2563eb; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.target-dot { fill: #111827; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.target-label { font: 900 24px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 5; paint-order: stroke; }',
      '.title { font: 900 28px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 5; paint-order: stroke; }',
      '</style>',
      `<image class="official-image" href="${xmlEscape(imageHref)}" x="0" y="0" width="${VIEWBOX.width}" height="${VIEWBOX.height}" preserveAspectRatio="none" />`,
      '<g id="daegu-p1-boundary-first-tracing-overview">',
      ...paths,
      ...labels.filter(Boolean),
      '</g>',
      '<text class="title" x="24" y="40">Daegu P1 boundary-first tracing pack: red=current target, blue=paired, orange=candidate reference-only</text>',
      '</svg>',
    ].join('\n');
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-tracing-pack')));
  const reviewBoardPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-review-board.json');
  const entrySheetPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-entry-sheet.json');
  const preflightPath = path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-entry-preflight.json');
  const officialImagePath = path.resolve(frontendRoot, DAEGU_SEATMAP_IMAGE.imagePath);

  const reviewBoard = await readJson(reviewBoardPath);
  const entrySheet = await readJson(entrySheetPath);
  const preflight = await readJson(preflightPath);
  const reviewRows = Array.isArray(reviewBoard.rows) ? reviewBoard.rows : [];
  const entryRows = Array.isArray(entrySheet.rows) ? entrySheet.rows : [];
  const reviewByBlockId = new Map(reviewRows.map((row) => [row.blockId, row]));
  const entryByBlockId = new Map(entryRows.map((row) => [row.blockId, row]));
  const blockers = [];
  const warnings = [];

  if (reviewBoard.summary?.reviewBoardVersion !== REVIEW_BOARD_VERSION) blockers.push(`REVIEW_BOARD_VERSION_MISMATCH:${reviewBoard.summary?.reviewBoardVersion ?? ''}`);
  if (entrySheet.summary?.entrySheetVersion !== ENTRY_SHEET_VERSION) blockers.push(`ENTRY_SHEET_VERSION_MISMATCH:${entrySheet.summary?.entrySheetVersion ?? ''}`);
  if (preflight.summary?.preflightVersion !== PREFLIGHT_VERSION) blockers.push(`PREFLIGHT_VERSION_MISMATCH:${preflight.summary?.preflightVersion ?? ''}`);
  if (entrySheet.summary?.targetBatchId !== TARGET_BATCH_ID) blockers.push(`ENTRY_SHEET_BATCH_MISMATCH:${entrySheet.summary?.targetBatchId ?? ''}`);
  if (preflight.summary?.targetBatchId !== TARGET_BATCH_ID) blockers.push(`PREFLIGHT_BATCH_MISMATCH:${preflight.summary?.targetBatchId ?? ''}`);
  if (!(await fileExists(officialImagePath))) blockers.push(`OFFICIAL_IMAGE_MISSING:${DAEGU_SEATMAP_IMAGE.imagePath}`);
  if ((reviewBoard.summary?.blockers ?? []).length > 0) blockers.push('REVIEW_BOARD_HAS_BLOCKERS');
  if ((entrySheet.summary?.blockers ?? []).length > 0) blockers.push('ENTRY_SHEET_HAS_BLOCKERS');
  if ((preflight.summary?.blockers ?? []).length > 0) blockers.push('PREFLIGHT_HAS_BLOCKERS');

  const rows = await Promise.all(EXPECTED_BLOCK_IDS.map(async (blockId, index) => {
    const reviewRow = reviewByBlockId.get(blockId) ?? {};
    const entryRow = entryByBlockId.get(blockId) ?? {};
    const block = reviewRow.block ?? entryRow.block ?? EXPECTED_BLOCKS[index];
    const evidenceCrop = entryRow.evidenceCrop ?? reviewRow.evidenceCrop ?? '';
    const evidenceCropExists = evidenceCrop ? await fileExists(path.resolve(frontendRoot, evidenceCrop)) : false;
    const targetReference = reviewRow.targetReference ?? {};
    const pairedNeighbors = Array.isArray(reviewRow.pairedNeighbors) ? reviewRow.pairedNeighbors : [];
    const pairedBlocks = Array.isArray(entryRow.pairedBlocks) ? entryRow.pairedBlocks : [];
    const crop = mergeBounds([
      boundsForPath(targetReference.currentPath),
      boundsForPath(targetReference.candidatePath),
      boundsForLabel(targetReference.currentLabelPoint),
      ...pairedNeighbors.map((paired) => boundsForPath(paired.currentPath)),
      ...pairedNeighbors.map((paired) => (
        Number.isFinite(paired.currentLabelX) && Number.isFinite(paired.currentLabelY)
          ? { minX: paired.currentLabelX, minY: paired.currentLabelY, maxX: paired.currentLabelX, maxY: paired.currentLabelY }
          : null
      )),
    ]);
    const svgFileName = `${String(index + 1).padStart(2, '0')}-${sanitizeFilePart(block)}-${sanitizeFilePart(blockId)}.svg`;
    const svgPath = path.join(outputDir, svgFileName);

    if (!reviewRow.blockId) blockers.push(`TRACING_REVIEW_ROW_MISSING:${blockId}`);
    if (!entryRow.blockId) blockers.push(`TRACING_ENTRY_ROW_MISSING:${blockId}`);
    if (!evidenceCropExists) blockers.push(`TRACING_EVIDENCE_CROP_MISSING:${block}`);
    if (!targetReference.currentPath) blockers.push(`TRACING_CURRENT_PATH_MISSING:${block}`);
    if (targetReference.candidateReferenceOnly !== true) blockers.push(`TRACING_CANDIDATE_NOT_REFERENCE_ONLY:${block}`);
    if (pairedNeighbors.length === 0) blockers.push(`TRACING_PAIRED_NEIGHBOR_MISSING:${block}`);
    if (pairedBlocks.join(' ') !== pairedNeighbors.map((paired) => paired.block).join(' ')) {
      warnings.push(`TRACING_PAIRED_BLOCKS_STALE:${block}`);
    }

    return {
      tracingPackVersion: TRACING_PACK_VERSION,
      rowNumber: index + 1,
      blockId,
      block,
      name: reviewRow.name ?? entryRow.name ?? '',
      category: reviewRow.category ?? entryRow.category ?? '',
      editableTarget: entryRow.editableTarget ?? `corrections[${index}]`,
      templateJsonPointer: entryRow.templateJsonPointer ?? `/corrections/${index}`,
      evidenceCrop,
      evidenceCropExists,
      tracingSvg: path.relative(frontendRoot, svgPath),
      pairedBlocks: pairedNeighbors.map((paired) => paired.block),
      missingOperatorInputFields: entryRow.missingOperatorInputFields ?? [],
      nextOperatorAction: entryRow.nextOperatorAction ?? '',
      operatorFocus: reviewRow.operatorFocus ?? '',
      operatorAction: reviewRow.operatorAction ?? '',
      approvalRule: reviewRow.approvalRule ?? '',
      candidatePathPolicy: 'candidatePath is reference-only and must not be copied into correctedPath.',
      crop,
      targetReference,
      pairedNeighbors,
    };
  }));

  const blockOrder = rows.map((row) => row.block);
  const blockIdOrder = rows.map((row) => row.blockId);
  if (blockOrder.join(' ') !== EXPECTED_BLOCKS.join(' ')) blockers.push(`TRACING_BLOCK_ORDER_MISMATCH:${blockOrder.join(' ')}`);
  if (blockIdOrder.join(' ') !== EXPECTED_BLOCK_IDS.join(' ')) blockers.push(`TRACING_BLOCK_ID_ORDER_MISMATCH:${blockIdOrder.join(' ')}`);

  await fs.mkdir(outputDir, { recursive: true });

  for (const row of rows) {
    const svgPath = path.resolve(frontendRoot, row.tracingSvg);
    await fs.writeFile(svgPath, `${buildTargetSvg(row, svgPath, officialImagePath)}\n`, 'utf8');
  }

  const overviewSvgPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-tracing-overview.svg');
  await fs.writeFile(overviewSvgPath, `${buildOverviewSvg(rows, overviewSvgPath, officialImagePath)}\n`, 'utf8');

  const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator-tracing';
  const summary = {
    tracingPackVersion: TRACING_PACK_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    reviewBoard: path.relative(frontendRoot, reviewBoardPath),
    entrySheet: path.relative(frontendRoot, entrySheetPath),
    preflight: path.relative(frontendRoot, preflightPath),
    officialImage: DAEGU_SEATMAP_IMAGE.imagePath,
    imageSha256: DAEGU_SEATMAP_IMAGE.imageSha256,
    totalRows: rows.length,
    targetSvgRows: rows.filter((row) => Boolean(row.tracingSvg)).length,
    rowsMissingOperatorInput: rows.filter((row) => row.missingOperatorInputFields.length > 0).length,
    rowsWithEvidenceCrop: rows.filter((row) => row.evidenceCropExists).length,
    overviewSvg: path.relative(frontendRoot, overviewSvgPath),
    productionWriteAllowed: false,
    writesOperatorDecision: false,
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
      'Per-target SVG files are operator evidence only and are not source-of-truth geometry.',
      'candidatePath is reference-only and must not be copied into correctedPath.',
      'It never writes operatorDecision or corrected fields into any source input.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-tracing-pack.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-tracing-pack.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-boundary-first-tracing-pack.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'rowNumber',
      'block',
      'blockId',
      'editableTarget',
      'templateJsonPointer',
      'tracingSvg',
      'evidenceCrop',
      'evidenceCropExists',
      'pairedBlocks',
      'missingOperatorInputFields',
      'candidatePathPolicy',
      'nextOperatorAction',
    ],
    ...rows.map((row) => [
      row.rowNumber,
      row.block,
      row.blockId,
      row.editableTarget,
      row.templateJsonPointer,
      row.tracingSvg,
      row.evidenceCrop,
      row.evidenceCropExists,
      row.pairedBlocks.join(' '),
      row.missingOperatorInputFields.join(' '),
      row.candidatePathPolicy,
      row.nextOperatorAction,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P1 Boundary-First Tracing Pack',
    '',
    `- tracing pack version: \`${TRACING_PACK_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- rows missing operator input: ${summary.rowsMissingOperatorInput}`,
    `- official image: \`${summary.officialImage}\``,
    `- image sha256: \`${summary.imageSha256}\``,
    `- overview svg: \`${summary.overviewSvg}\``,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Target SVGs',
    '',
    markdownTable(
      ['row', 'block', 'editable target', 'tracing svg', 'paired', 'missing input', 'next action'],
      rows.map((row) => [
        row.rowNumber,
        `\`${row.block}\``,
        `\`${row.editableTarget}\``,
        `\`${row.tracingSvg}\``,
        row.pairedBlocks.map((block) => `\`${block}\``).join(' ') || '-',
        row.missingOperatorInputFields.map((field) => `\`${field}\``).join(' ') || '-',
        row.nextOperatorAction,
      ]),
    ),
    '',
    '## Operator Rules',
    '',
    '- Trace manually against the official PNG shown in each SVG.',
    '- Do not copy candidatePath into correctedPath.',
    '- Fill only the matching boundary-first operator template row indicated by editableTarget.',
    '- Run `npm run stadium:daegu:p1-boundary-first-entry-preflight:require-ready` after all five rows are filled.',
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

  console.log(`p1_boundary_first_tracing_pack_json:${jsonPath}`);
  console.log(`p1_boundary_first_tracing_pack_csv:${csvPath}`);
  console.log(`p1_boundary_first_tracing_pack_markdown:${markdownPath}`);
  console.log(`p1_boundary_first_tracing_pack_overview_svg:${overviewSvgPath}`);
  console.log(`status:${summary.status} rows=${summary.totalRows} targetSvgs=${summary.targetSvgRows} evidence=${summary.rowsWithEvidenceCrop}/${summary.totalRows} missingOperatorInput=${summary.rowsMissingOperatorInput}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1OperatorAudit = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const AUDIT_VERSION = 'DAEGU_P1_OPERATOR_AUDIT_V1';
  const EXPECTED = {
    targetBatchId: 'BATCH_2_P1',
    packageRows: 12,
    manualTraceRequiredRows: 1,
    sharedCandidateBoundaryRows: 9,
    correctedPathRequiredRows: 2,
    evidenceCropRows: 12,
    pendingRows: 11,
    needsRetraceRows: 0,
    approvedRows: 1,
    decidedRows: 1,
    filledApprovalFieldRows: 1,
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

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const packagePath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-package.json');
  const inputPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json');

  const packageReport = await readJson(packagePath);
  const input = await readJson(inputPath);
  const inputRows = input.corrections ?? [];
  const inputCounts = countInputRows(inputRows);
  const blockers = [];

  pushExpected(blockers, 'PACKAGE_ROWS', packageReport.totalRows, EXPECTED.packageRows);
  pushExpected(blockers, 'PACKAGE_EXPECTED_ROWS', packageReport.expectedRows, EXPECTED.packageRows);
  pushExpected(blockers, 'PACKAGE_MANUAL_TRACE_REQUIRED_ROWS', packageReport.manualTraceRequiredRows, EXPECTED.manualTraceRequiredRows);
  pushExpected(blockers, 'PACKAGE_SHARED_CANDIDATE_BOUNDARY_ROWS', packageReport.sharedCandidateBoundaryRows, EXPECTED.sharedCandidateBoundaryRows);
  pushExpected(blockers, 'PACKAGE_CORRECTED_PATH_REQUIRED_ROWS', packageReport.correctedPathRequiredRows, EXPECTED.correctedPathRequiredRows);
  pushExpected(blockers, 'PACKAGE_EVIDENCE_CROP_ROWS', packageReport.evidenceCropRows, EXPECTED.evidenceCropRows);
  pushExpected(blockers, 'PACKAGE_APPROVED_ROWS', packageReport.approvedRows, EXPECTED.approvedRows);
  if (packageReport.status !== 'ok') blockers.push(`PACKAGE_STATUS_NOT_OK:${packageReport.status ?? ''}`);
  if (packageReport.targetBatchId !== EXPECTED.targetBatchId) blockers.push(`PACKAGE_BATCH_MISMATCH:${packageReport.targetBatchId ?? ''}`);

  if (input.packageVersion !== 'DAEGU_P1_OPERATOR_PACKAGE_V1') blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  if (input.targetBatchId !== EXPECTED.targetBatchId) blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  if (input.draftOnly !== false) blockers.push('INPUT_DRAFT_ONLY_NOT_FALSE');
  if (input.productionWriteAllowed !== false) blockers.push('INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

  pushExpected(blockers, 'INPUT_ROWS', inputCounts.total, EXPECTED.packageRows);
  pushExpected(blockers, 'INPUT_PENDING_ROWS', inputCounts.pending, EXPECTED.pendingRows);
  pushExpected(blockers, 'INPUT_NEEDS_RETRACE_ROWS', inputCounts.needsRetrace, EXPECTED.needsRetraceRows);
  pushExpected(blockers, 'INPUT_APPROVED_ROWS', inputCounts.approved, EXPECTED.approvedRows);
  pushExpected(blockers, 'INPUT_DECIDED_ROWS', inputCounts.decided, EXPECTED.decidedRows);
  pushExpected(blockers, 'INPUT_FILLED_PATH_ROWS', inputCounts.filledPath, EXPECTED.filledApprovalFieldRows);
  pushExpected(blockers, 'INPUT_FILLED_LABEL_X_ROWS', inputCounts.filledLabelX, EXPECTED.filledApprovalFieldRows);
  pushExpected(blockers, 'INPUT_FILLED_LABEL_Y_ROWS', inputCounts.filledLabelY, EXPECTED.filledApprovalFieldRows);
  pushExpected(blockers, 'INPUT_FILLED_REVIEWER_ROWS', inputCounts.filledReviewer, EXPECTED.filledApprovalFieldRows);
  pushExpected(blockers, 'INPUT_FILLED_REVIEWED_AT_ROWS', inputCounts.filledReviewedAt, EXPECTED.filledApprovalFieldRows);
  pushExpected(blockers, 'INPUT_EVIDENCE_ROWS', inputCounts.evidenceCrop, EXPECTED.evidenceCropRows);

  const summary = {
    auditVersion: AUDIT_VERSION,
    status: blockers.length === 0 ? 'ok' : 'failed',
    p1ReportDir: path.relative(frontendRoot, p1ReportDir),
    packageReport: path.relative(frontendRoot, packagePath),
    input: path.relative(frontendRoot, inputPath),
    targetBatchId: EXPECTED.targetBatchId,
    packageCounts: {
      totalRows: packageReport.totalRows,
      expectedRows: packageReport.expectedRows,
      manualTraceRequiredRows: packageReport.manualTraceRequiredRows,
      sharedCandidateBoundaryRows: packageReport.sharedCandidateBoundaryRows,
      correctedPathRequiredRows: packageReport.correctedPathRequiredRows,
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

  const jsonPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-audit.json');
  const csvPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-audit.csv');
  const markdownPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-audit.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'status',
      'targetBatchId',
      'packageRows',
      'manualTraceRequiredRows',
      'sharedCandidateBoundaryRows',
      'correctedPathRequiredRows',
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
      summary.packageCounts.manualTraceRequiredRows,
      summary.packageCounts.sharedCandidateBoundaryRows,
      summary.packageCounts.correctedPathRequiredRows,
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
    '# 대구 P1 operator audit',
    '',
    `- audit version: \`${AUDIT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- package report: \`${summary.packageReport}\``,
    `- input: \`${summary.input}\``,
    '',
    '## Expected Counts',
    '',
    `- P1 rows: ${summary.packageCounts.totalRows}`,
    `- manual trace required: ${summary.packageCounts.manualTraceRequiredRows}`,
    `- shared candidate boundary: ${summary.packageCounts.sharedCandidateBoundaryRows}`,
    `- corrected path required: ${summary.packageCounts.correctedPathRequiredRows}`,
    `- evidence crop rows: ${summary.packageCounts.evidenceCropRows}`,
    '',
    '## Input File',
    '',
    `- rows: ${summary.inputCounts.total}`,
    `- pending: ${summary.inputCounts.pending}`,
    `- needsRetrace: ${summary.inputCounts.needsRetrace}`,
    `- approved: ${summary.inputCounts.approved}`,
    `- decided: ${summary.inputCounts.decided}`,
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

  console.log(`p1_operator_audit_json:${jsonPath}`);
  console.log(`p1_operator_audit_csv:${csvPath}`);
  console.log(`p1_operator_audit_markdown:${markdownPath}`);
  console.log(`status:${summary.status} rows=${inputCounts.total} pending=${inputCounts.pending} approved=${inputCounts.approved}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runP1OperatorImport = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultInputPath = path.join(
    defaultReportDir,
    'daegu-p1-operator/daegu-seatmap-p1-operator-input.json',
  );

  const IMPORT_VERSION = 'DAEGU_P1_OPERATOR_IMPORT_V1';
  const NEXT_ACTION_PACKET_VERSION = 'DAEGU_P1_NEXT_ACTION_PACKET_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const TARGET_PRIORITY = 'P1';
  const PRIOR_BATCH_ID = 'BATCH_1_P0';
  const PRIOR_PRIORITY = 'P0';
  const TEMPLATE_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1';
  const DRAFT_REVIEWER = 'DRAFT_VALIDATION_ONLY';
  const DRAFT_REVIEWED_AT = '2026-05-10T00:00:00.000Z';
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);
  const STAGE_ORDER = {
    PAIR_BOUNDARY_FIRST: 1,
    SINGLE_CORRECTED_PATH: 2,
    DUPLICATE_CANDIDATE_SPLIT: 3,
  };
  const ORDERED_STAGES = [
    'PAIR_BOUNDARY_FIRST',
    'SINGLE_CORRECTED_PATH',
    'DUPLICATE_CANDIDATE_SPLIT',
  ];
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

  const hasDraftMarker = (row) => (
    row.draftOnly === true
    || row.stagingOnly === true
    || row.reviewer === DRAFT_REVIEWER
    || row.reviewedAt === DRAFT_REVIEWED_AT
  );

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const inputPath = path.resolve(frontendRoot, argValue('--input', defaultInputPath));
  const writeTemplate = hasFlag('--write-template');
  const templateJsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
  const templateCsvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.csv');
  const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
  const nextActionPath = path.resolve(
    frontendRoot,
    argValue('--next-action', path.join(path.dirname(inputPath), 'daegu-seatmap-p1-next-action-packet.json')),
  );

  const input = await readJson(inputPath);
  const template = await readJson(templateJsonPath);
  const handoff = await readJson(handoffPath);
  const nextAction = await readJson(nextActionPath);

  const p1HandoffRows = (handoff.workItems ?? []).filter((row) => row.queuePriority === TARGET_PRIORITY);
  const expectedP1Ids = new Set(p1HandoffRows.map((row) => row.id));
  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const inputByBlockId = new Map(inputRows.map((row) => [row.blockId, row]));
  const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
  const templateIds = new Set(templateRows.map((row) => row.blockId));
  const nextActionRows = Array.isArray(nextAction.rows) ? nextAction.rows : [];
  const nextActionByBlockId = new Map(nextActionRows.map((row) => [row.blockId, row]));
  const blockers = [];
  const warnings = [];

  if (input.packageVersion !== 'DAEGU_P1_OPERATOR_PACKAGE_V1') {
    blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  }
  if (input.targetBatchId !== TARGET_BATCH_ID) blockers.push(`INPUT_BATCH_MISMATCH:${input.targetBatchId ?? ''}`);
  if (template.templateVersion !== TEMPLATE_VERSION) {
    blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  }
  if (nextAction.summary?.packetVersion !== NEXT_ACTION_PACKET_VERSION) {
    blockers.push(`NEXT_ACTION_PACKET_VERSION_MISMATCH:${nextAction.summary?.packetVersion ?? ''}`);
  }
  if (nextAction.summary?.targetBatchId !== TARGET_BATCH_ID) {
    blockers.push(`NEXT_ACTION_BATCH_MISMATCH:${nextAction.summary?.targetBatchId ?? ''}`);
  }
  const inputIds = new Set(inputRows.map((row) => row.blockId));
  const nonP1InputRows = inputRows.filter((row) => !expectedP1Ids.has(row.blockId));
  const missingP1Ids = [...expectedP1Ids].filter((blockId) => !inputIds.has(blockId));
  if (missingP1Ids.length > 0) blockers.push(`INPUT_MISSING_P1_ROWS:${missingP1Ids.join(' ')}`);

  const missingTemplateIds = inputRows
    .map((row) => row.blockId)
    .filter((blockId) => !templateIds.has(blockId));
  const closedTerminalInputRows = nonP1InputRows.filter((row) => (
    !templateIds.has(row.blockId)
    && normalizeDecision(row.operatorDecision) !== 'PENDING'
  ));
  const closedTerminalInputIds = new Set(closedTerminalInputRows.map((row) => row.blockId));
  const blockingNonP1InputRows = nonP1InputRows.filter((row) => !closedTerminalInputIds.has(row.blockId));
  const blockingMissingTemplateIds = missingTemplateIds.filter((blockId) => !closedTerminalInputIds.has(blockId));
  if (inputRows.length !== expectedP1Ids.size + closedTerminalInputRows.length) {
    blockers.push(`P1_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${expectedP1Ids.size}`);
  }
  if (blockingNonP1InputRows.length > 0) {
    blockers.push(`INPUT_HAS_NON_P1_ROWS:${blockingNonP1InputRows.map((row) => row.blockId).join(' ')}`);
  }
  if (blockingMissingTemplateIds.length > 0) {
    blockers.push(`TEMPLATE_MISSING_P1_ROWS:${blockingMissingTemplateIds.join(' ')}`);
  }
  if (closedTerminalInputRows.length > 0) {
    warnings.push(`INPUT_TERMINAL_ROWS_CLOSED_IN_TEMPLATE:${closedTerminalInputRows.map((row) => row.blockId).join(' ')}`);
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

  const priorBatchRows = templateRows.filter((row) => row.queuePriority === PRIOR_PRIORITY);
  const priorPendingRows = priorBatchRows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
  const priorApprovedRows = priorBatchRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  if (writeTemplate && priorPendingRows.length > 0) {
    blockers.push(`WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_CLOSED:${PRIOR_BATCH_ID}:${priorPendingRows.map((row) => row.block).join(' ')}`);
  }
  if (writeTemplate && priorApprovedRows.length > 0) {
    blockers.push(`WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_WRITTEN:${PRIOR_BATCH_ID}:${priorApprovedRows.map((row) => row.block).join(' ')}`);
  }

  const invalidDecisionInputRows = inputRows.filter((row) => !DECISION_OPTIONS.has(normalizeDecision(row.operatorDecision)));
  if (invalidDecisionInputRows.length > 0) {
    blockers.push(`INVALID_P1_OPERATOR_DECISION:${invalidDecisionInputRows.map((row) => row.blockId).join(' ')}`);
  }

  const importedRows = [];
  const mergedRows = templateRows.map((templateRow) => {
    const inputRow = inputByBlockId.get(templateRow.blockId);
    if (!inputRow) return templateRow;

    const editable = normalizeEditableFields(inputRow);
    const nextActionRow = nextActionByBlockId.get(templateRow.blockId);
    if (!nextActionRow) blockers.push(`P1_NEXT_ACTION_MISSING_ROW:${templateRow.blockId}`);
    if (nextActionRow && !Object.hasOwn(STAGE_ORDER, nextActionRow.stage)) {
      blockers.push(`P1_NEXT_ACTION_UNKNOWN_STAGE:${templateRow.blockId}:${nextActionRow.stage ?? ''}`);
    }
    const mergedRow = {
      ...templateRow,
      ...editable,
    };
    const changed = rowChanged(templateRow, mergedRow);
    importedRows.push({
      blockId: templateRow.blockId,
      block: templateRow.block,
      queuePriority: templateRow.queuePriority,
      stage: nextActionRow?.stage ?? '',
      stageOrder: STAGE_ORDER[nextActionRow?.stage] ?? 99,
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
  const stageSummaries = ORDERED_STAGES.map((stage) => {
    const stageRows = importedRows.filter((row) => row.stage === stage);
    const stageApprovedRows = stageRows.filter((row) => row.approved);
    return {
      stage,
      stageOrder: STAGE_ORDER[stage],
      rows: stageRows.length,
      approvedRows: stageApprovedRows.length,
      approvedBlocks: stageApprovedRows.map((row) => row.block),
    };
  });
  const firstIncompleteStage = stageSummaries.find((stage) => stage.approvedRows < stage.rows);
  const laterApprovedRows = firstIncompleteStage
    ? approvedRows.filter((row) => row.stageOrder > firstIncompleteStage.stageOrder)
    : [];
  if (decidedRows.length === 0) warnings.push('NO_P1_OPERATOR_DECISIONS_TO_IMPORT');
  if (writeTemplate && blockers.length === 0 && decidedRows.length === 0) {
    blockers.push('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_P1_DECISION');
  }
  if (writeTemplate && approvedRows.length === 0) {
    blockers.push('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P1_ROW');
  }
  if (writeTemplate && laterApprovedRows.length > 0) {
    blockers.push(`WRITE_TEMPLATE_REQUIRES_P1_STAGE_ORDER:${firstIncompleteStage.stage}:${laterApprovedRows.map((row) => row.block).join(' ')}`);
  }
  if (writeTemplate && pendingRows.length > 0) {
    blockers.push(`WRITE_TEMPLATE_REQUIRES_NO_P1_PENDING_ROWS:${pendingRows.map((row) => row.block).join(' ')}`);
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
    priorBatchId: PRIOR_BATCH_ID,
    input: path.relative(frontendRoot, inputPath),
    template: path.relative(frontendRoot, templateJsonPath),
    nextAction: path.relative(frontendRoot, nextActionPath),
    totalInputRows: inputRows.length,
    importedRows: importedRows.length,
    changedRows: changedRows.length,
    decidedRows: decidedRows.length,
    approvedRows: approvedRows.length,
    pendingRows: pendingRows.length,
    closedTerminalInputRows: closedTerminalInputRows.length,
    invalidDecisionRows: invalidDecisionInputRows.length,
    draftMarkerRows: draftMarkerRows.length,
    priorBatchRows: priorBatchRows.length,
    priorPendingRows: priorPendingRows.length,
    priorApprovedRows: priorApprovedRows.length,
    stageSummaries,
    firstIncompleteStage: firstIncompleteStage?.stage ?? '',
    laterApprovedRows: laterApprovedRows.length,
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
      'This script only imports P1 operator decisions into the corrections template.',
      'It blocks write-template while P0 remains pending or has approved rows that still need the P0 production write path.',
      'It blocks write-template while any P1 row remains PENDING.',
      'It blocks write-template unless at least one P1 row is operatorDecision=APPROVED.',
      'It blocks write-template when SINGLE_CORRECTED_PATH or DUPLICATE_CANDIDATE_SPLIT rows are approved before the earlier P1 stage is complete.',
      'Terminal P1 input rows already closed by production data may remain in the source input as audit history.',
      'It blocks write-template when draft/staging metadata or DRAFT_VALIDATION_ONLY markers are present.',
      'Do not run npm run stadium:daegu:operator-corrections after write-template because it regenerates the template from handoff defaults.',
      'It never modifies src/data/daeguSeatData.ts or promotes blocks to OFFICIAL_IMAGE_TRACED.',
      'Run validation, preview, dry-run apply, batches, status, and write-guard after importing operator decisions.',
    ],
  };

  const jsonPath = path.join(reportDir, 'daegu-seatmap-p1-operator-import.json');
  const csvPath = path.join(reportDir, 'daegu-seatmap-p1-operator-import.csv');
  const markdownPath = path.join(reportDir, 'daegu-seatmap-p1-operator-import.md');

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
      'stage',
    ],
    ...importedRows.map((row) => [
      row.blockId,
      row.block,
      row.queuePriority,
      row.operatorDecision,
      row.changed,
      row.approved,
      row.decided,
      row.stage,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P1 Operator Import',
    '',
    `- import version: \`${IMPORT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- mode: \`${summary.mode}\``,
    `- input: \`${summary.input}\``,
    `- prior batch: \`${summary.priorBatchId}\``,
    `- imported rows: ${summary.importedRows}`,
    `- changed rows: ${summary.changedRows}`,
    `- decided rows: ${summary.decidedRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- pending rows: ${summary.pendingRows}`,
    `- closed terminal input rows: ${summary.closedTerminalInputRows}`,
    `- invalid decision rows: ${summary.invalidDecisionRows}`,
    `- draft marker rows: ${summary.draftMarkerRows}`,
    `- prior pending rows: ${summary.priorPendingRows}`,
    `- prior approved rows: ${summary.priorApprovedRows}`,
    `- first incomplete stage: \`${summary.firstIncompleteStage || 'none'}\``,
    `- later approved rows: ${summary.laterApprovedRows}`,
    `- production data changed: ${summary.productionDataChanged}`,
    `- template changed: ${summary.templateChanged}`,
    '',
    '## Imported Rows',
    '',
    markdownTable(
      ['block', 'stage', 'decision', 'changed', 'approved', 'decided'],
      importedRows.map((row) => [
        `\`${row.block}\``,
        `\`${row.stage || 'UNKNOWN'}\``,
        `\`${row.operatorDecision}\``,
        String(row.changed),
        String(row.approved),
        String(row.decided),
      ]),
    ),
    '',
    '## Stage Order',
    '',
    markdownTable(
      ['stage', 'rows', 'approved', 'approved blocks'],
      stageSummaries.map((row) => [
        `\`${row.stage}\``,
        row.rows,
        row.approvedRows,
        row.approvedBlocks.map((block) => `\`${block}\``).join(' ') || '-',
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

  console.log(`p1_operator_import_json:${jsonPath}`);
  console.log(`p1_operator_import_csv:${csvPath}`);
  console.log(`p1_operator_import_markdown:${markdownPath}`);
  console.log(`status:${summary.status} mode=${summary.mode} imported=${summary.importedRows} changed=${summary.changedRows} decided=${summary.decidedRows} approved=${summary.approvedRows}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runP1OperatorPackage = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP1ReportDir = path.join(defaultReportDir, 'daegu-p1-operator');
  const defaultCropDir = path.join(defaultReportDir, 'daegu-handoff-evidence-crops');

  const PACKAGE_VERSION = 'DAEGU_P1_OPERATOR_PACKAGE_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const TARGET_PRIORITY = 'P1';
  const EXPECTED = {
    rows: 12,
    manualTraceRequiredRows: 1,
    sharedCandidateBoundaryRows: 9,
    correctedPathRequiredRows: 2,
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
    if (row.recommendedAction === 'TRACE_SHARED_CANDIDATE_BOUNDARIES') {
      return 'OPERATOR_SEPARATE_SHARED_CANDIDATE_BOUNDARY';
    }
    return 'OPERATOR_CORRECTED_PATH_REQUIRED';
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const cropDir = path.resolve(frontendRoot, argValue('--crop-dir', defaultCropDir));
  const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
  const templatePath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
  const batchesPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-batches.json');
  const operatorInputJsonPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json');
  const operatorInputCsvPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.csv');
  const checklistCsvPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-checklist.csv');
  const checklistMarkdownPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-checklist.md');
  const summaryJsonPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-package.json');
  const summaryMarkdownPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-package.md');

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

  const p1Rows = (handoff.workItems ?? [])
    .filter((row) => row.queuePriority === TARGET_PRIORITY)
    .sort((a, b) => String(a.block).localeCompare(String(b.block), 'ko'));

  const packageRows = p1Rows.map((row) => {
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

  const p1Batch = (batches.batches ?? []).find((batch) => batch.id === TARGET_BATCH_ID);
  const blockers = [];
  const warnings = [];
  if (p1Rows.length !== EXPECTED.rows) warnings.push(`P1_ROW_COUNT_CHANGED_AFTER_WRITES:${p1Rows.length}:${EXPECTED.rows}`);
  if (!p1Batch) {
    blockers.push(`MISSING_BATCH:${TARGET_BATCH_ID}`);
  } else {
    if (p1Batch.expectedRows !== EXPECTED.rows) warnings.push(`P1_BATCH_EXPECTED_ROWS_CHANGED_AFTER_WRITES:${p1Batch.expectedRows}:${EXPECTED.rows}`);
    if (!p1Batch.queuePriorities?.includes(TARGET_PRIORITY)) blockers.push(`P1_BATCH_PRIORITY_MISMATCH:${(p1Batch.queuePriorities ?? []).join(' ')}`);
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
    outputDirectory: path.relative(frontendRoot, p1ReportDir),
    totalRows: packageRows.length,
    expectedRows: EXPECTED.rows,
    manualTraceRequiredRows: packageRows.filter((row) => row.operatorAction === 'OPERATOR_MANUAL_TRACE_REQUIRED').length,
    sharedCandidateBoundaryRows: packageRows.filter((row) => row.operatorAction === 'OPERATOR_SEPARATE_SHARED_CANDIDATE_BOUNDARY').length,
    correctedPathRequiredRows: packageRows.filter((row) => row.operatorAction === 'OPERATOR_CORRECTED_PATH_REQUIRED').length,
    evidenceCropRows: packageRows.filter((row) => row.evidenceCrop).length,
    approvedRows: packageRows.filter((row) => row.operatorDecision === 'APPROVED').length,
    existingInputRows: existingInputRows.length,
    preservedEditableRows: packageRows.filter((row) => row.editableSource === 'existingOperatorInput').length,
    templateEditableRows: packageRows.filter((row) => row.editableSource === 'template').length,
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    baselineExpectedRows: EXPECTED.rows,
    warnings,
    blockers,
  };

  const expectedCounts = [
    ['P1_MANUAL_TRACE_REQUIRED_ROWS', summary.manualTraceRequiredRows, EXPECTED.manualTraceRequiredRows],
    ['P1_SHARED_CANDIDATE_BOUNDARY_ROWS', summary.sharedCandidateBoundaryRows, EXPECTED.sharedCandidateBoundaryRows],
    ['P1_CORRECTED_PATH_REQUIRED_ROWS', summary.correctedPathRequiredRows, EXPECTED.correctedPathRequiredRows],
  ];
  expectedCounts.forEach(([label, actual, expected]) => {
    if (actual !== expected) summary.warnings.push(`${label}_CHANGED_AFTER_WRITES:${actual}:${expected}`);
  });
  summary.status = summary.blockers.length > 0 ? 'blocked' : 'ok';

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
      'Regenerating this package must preserve operator-filled P1 editable fields from the existing operator input file.',
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

  await fs.mkdir(p1ReportDir, { recursive: true });

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
    '# Daegu P1 Operator Checklist',
    '',
    `- package version: \`${PACKAGE_VERSION}\``,
    `- target batch: \`${TARGET_BATCH_ID}\``,
    `- status: \`${summary.status}\``,
    `- rows: ${summary.totalRows}`,
    `- manual trace required rows: ${summary.manualTraceRequiredRows}`,
    `- shared candidate boundary rows: ${summary.sharedCandidateBoundaryRows}`,
    `- corrected path required rows: ${summary.correctedPathRequiredRows}`,
    `- evidence crop rows: ${summary.evidenceCropRows}`,
    `- preserved editable rows: ${summary.preservedEditableRows}`,
    '',
    '## Operator Rules',
    '',
    '1. P1 row는 P0 batch가 종료된 뒤 production write 대상으로 검토합니다.',
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
    '- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json`',
    '- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.csv`',
    '',
  ].join('\n'), 'utf8');

  await fs.writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(summaryMarkdownPath, [
    '# Daegu P1 Operator Package',
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
    '- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json`',
    '- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.csv`',
    '- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-checklist.md`',
    '- `reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-checklist.csv`',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0
      ? markdownTable(['blocker'], summary.blockers.map((blocker) => [blocker]))
      : 'No package blockers.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0
      ? markdownTable(['warning'], summary.warnings.map((warning) => [warning]))
      : 'No package warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`p1_operator_package_json:${summaryJsonPath}`);
  console.log(`p1_operator_package_markdown:${summaryMarkdownPath}`);
  console.log(`p1_operator_checklist_markdown:${checklistMarkdownPath}`);
  console.log(`p1_operator_input_json:${operatorInputJsonPath}`);
  console.log(`status:${summary.status} p1=${summary.totalRows} evidence=${summary.evidenceCropRows} approved=${summary.approvedRows}`);

  if (summary.status !== 'ok') {
    process.exitCode = 1;
  }
};

const runP1OperatorReadiness = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP1ReportDir = path.join(defaultReportDir, 'daegu-p1-operator');

  const READINESS_VERSION = 'DAEGU_P1_OPERATOR_READINESS_V1';
  const PACKAGE_VERSION = 'DAEGU_P1_OPERATOR_PACKAGE_V1';
  const IMPORT_VERSION = 'DAEGU_P1_OPERATOR_IMPORT_V1';
  const VALIDATION_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1';
  const TEMPLATE_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1';
  const NEXT_ACTION_PACKET_VERSION = 'DAEGU_P1_NEXT_ACTION_PACKET_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const TARGET_PRIORITY = 'P1';
  const PRIOR_BATCH_ID = 'BATCH_1_P0';
  const PRIOR_PRIORITY = 'P0';
  const BASELINE_EXPECTED_ROWS = 12;
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);
  const STAGE_ORDER = {
    PAIR_BOUNDARY_FIRST: 1,
    SINGLE_CORRECTED_PATH: 2,
    DUPLICATE_CANDIDATE_SPLIT: 3,
  };
  const ORDERED_STAGES = [
    'PAIR_BOUNDARY_FIRST',
    'SINGLE_CORRECTED_PATH',
    'DUPLICATE_CANDIDATE_SPLIT',
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

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const packagePath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-package.json');
  const inputPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json');
  const validationPath = path.join(p1ReportDir, 'daegu-seatmap-operator-corrections-validation.json');
  const importPath = path.join(reportDir, 'daegu-seatmap-p1-operator-import.json');
  const templatePath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
  const nextActionPath = path.join(p1ReportDir, 'daegu-seatmap-p1-next-action-packet.json');

  const reports = {
    package: await readJsonReport(packagePath),
    input: await readJsonReport(inputPath),
    validation: await readJsonReport(validationPath),
    import: await readJsonReport(importPath),
    template: await readJsonReport(templatePath),
    nextAction: await readJsonReport(nextActionPath),
  };

  const packageReport = reports.package.data ?? {};
  const input = reports.input.data ?? {};
  const validationSummary = reports.validation.data?.summary ?? reports.validation.data ?? {};
  const importSummary = reports.import.data?.summary ?? reports.import.data ?? {};
  const validationRows = Array.isArray(reports.validation.data?.rows) ? reports.validation.data.rows : [];
  const nextActionRows = Array.isArray(reports.nextAction.data?.rows) ? reports.nextAction.data.rows : [];
  const inputRows = Array.isArray(input.corrections) ? input.corrections : [];
  const templateRows = Array.isArray(reports.template.data?.corrections) ? reports.template.data.corrections : [];
  const validationByBlockId = new Map(validationRows.map((row) => [row.blockId, row]));
  const nextActionByBlockId = new Map(nextActionRows.map((row) => [row.blockId, row]));
  const expectedRows = Number.isFinite(Number(packageReport.totalRows))
    ? Number(packageReport.totalRows)
    : inputRows.length;

  const rows = inputRows.map((row) => {
    const decision = normalizeDecision(row.operatorDecision);
    const validationRow = validationByBlockId.get(row.blockId) ?? {};
    const nextActionRow = nextActionByBlockId.get(row.blockId) ?? {};
    return {
      blockId: row.blockId,
      block: row.block,
      stage: nextActionRow.stage ?? '',
      stageOrder: STAGE_ORDER[nextActionRow.stage] ?? 99,
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
      closedTerminalInputRow: validationRow.closedTerminalInputRow === true,
      validForApproval: validationRow.validForApproval === true,
      reasons: Array.isArray(validationRow.reasons) ? validationRow.reasons : [],
      warnings: Array.isArray(validationRow.warnings) ? validationRow.warnings : [],
    };
  });

  const closedTerminalInputRows = rows.filter((row) => row.closedTerminalInputRow);
  const actionableRows = rows.filter((row) => !row.closedTerminalInputRow);
  const pendingRows = actionableRows.filter((row) => row.pending);
  const decidedRows = actionableRows.filter((row) => !row.pending);
  const approvedRows = actionableRows.filter((row) => row.approved);
  const rejectedRows = actionableRows.filter((row) => row.rejected);
  const needsRetraceRows = actionableRows.filter((row) => row.needsRetrace);
  const invalidDecisionRows = rows.filter((row) => row.invalidDecision);
  const filledPathRows = actionableRows.filter((row) => row.hasCorrectedPath);
  const filledReviewerRows = actionableRows.filter((row) => row.hasReviewer);
  const blockerRows = rows.filter((row) => row.reasons.length > 0);
  const priorBatchRows = templateRows.filter((row) => row.queuePriority === PRIOR_PRIORITY);
  const priorPendingRows = priorBatchRows.filter((row) => normalizeDecision(row.operatorDecision) === 'PENDING');
  const priorApprovedRows = priorBatchRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const p1TemplateRows = templateRows.filter((row) => row.queuePriority === TARGET_PRIORITY);

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
  if (reports.nextAction.exists && reports.nextAction.data?.summary?.packetVersion !== NEXT_ACTION_PACKET_VERSION) {
    blockers.push(`NEXT_ACTION_PACKET_VERSION_MISMATCH:${reports.nextAction.data?.summary?.packetVersion ?? ''}`);
  }
  if (reports.nextAction.exists && reports.nextAction.data?.summary?.targetBatchId !== TARGET_BATCH_ID) {
    blockers.push(`NEXT_ACTION_BATCH_MISMATCH:${reports.nextAction.data?.summary?.targetBatchId ?? ''}`);
  }
  if (rows.length !== expectedRows) blockers.push(`P1_INPUT_ROW_COUNT_MISMATCH:${rows.length}:${expectedRows}`);
  if (rows.length !== BASELINE_EXPECTED_ROWS) {
    warnings.push(`P1_INPUT_ROW_COUNT_CHANGED_AFTER_WRITES:${rows.length}:${BASELINE_EXPECTED_ROWS}`);
  }
  if (p1TemplateRows.length !== actionableRows.length) {
    blockers.push(`P1_TEMPLATE_ROW_COUNT_MISMATCH:${p1TemplateRows.length}:${actionableRows.length}`);
  }
  if (invalidDecisionRows.length > 0) {
    blockers.push(`INVALID_P1_OPERATOR_DECISION:${invalidDecisionRows.map((row) => row.blockId).join(' ')}`);
  }
  const missingStageRows = actionableRows.filter((row) => !row.stage);
  const unknownStageRows = actionableRows.filter((row) => row.stage && !Object.hasOwn(STAGE_ORDER, row.stage));
  if (missingStageRows.length > 0) {
    blockers.push(`P1_NEXT_ACTION_MISSING_STAGE:${missingStageRows.map((row) => row.block).join(' ')}`);
  }
  if (unknownStageRows.length > 0) {
    blockers.push(`P1_NEXT_ACTION_UNKNOWN_STAGE:${unknownStageRows.map((row) => `${row.block}:${row.stage}`).join(' ')}`);
  }
  if (priorPendingRows.length > 0) {
    blockers.push(`P1_REQUIRES_PRIOR_BATCH_CLOSED:${PRIOR_BATCH_ID}:${priorPendingRows.map((row) => row.block).join(' ')}`);
  }
  if (priorApprovedRows.length > 0) {
    blockers.push(`P1_REQUIRES_PRIOR_BATCH_WRITTEN:${PRIOR_BATCH_ID}:${priorApprovedRows.map((row) => row.block).join(' ')}`);
  }
  if (pendingRows.length > 0) {
    blockers.push(`P1_PENDING_ROWS_REMAIN:${pendingRows.map((row) => row.block).join(' ')}`);
  }
  if (decidedRows.length === 0) blockers.push('NO_P1_OPERATOR_DECISIONS');

  if (reports.validation.exists && validationSummary.validationVersion !== VALIDATION_VERSION) {
    blockers.push(`VALIDATION_VERSION_MISMATCH:${validationSummary.validationVersion ?? ''}`);
  }
  if (reports.validation.exists && validationSummary.status !== 'ok') blockers.push('P1_VALIDATION_STATUS_NOT_OK');

  const validationApprovedRows = numberOrZero(validationSummary.approvedRows);
  const validApprovedRows = numberOrZero(validationSummary.validApprovedRows);
  const invalidApprovedRows = numberOrZero(validationSummary.invalidApprovedRows);
  const invalidMetadataRows = numberOrZero(validationSummary.invalidMetadataRows);
  if (reports.validation.exists && validationApprovedRows !== approvedRows.length) {
    blockers.push(`P1_VALIDATION_APPROVED_ROWS_MISMATCH:${validationApprovedRows}:${approvedRows.length}`);
  }
  if (invalidApprovedRows > 0) blockers.push(`P1_INVALID_APPROVED_ROWS:${invalidApprovedRows}`);
  if (invalidMetadataRows > 0) blockers.push(`P1_INVALID_METADATA_ROWS:${invalidMetadataRows}`);
  if (approvedRows.length > 0 && validApprovedRows !== approvedRows.length) {
    blockers.push(`P1_VALID_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS:${validApprovedRows}:${approvedRows.length}`);
  }

  if (reports.import.exists && importSummary.importVersion !== IMPORT_VERSION) {
    blockers.push(`IMPORT_VERSION_MISMATCH:${importSummary.importVersion ?? ''}`);
  }
  if (reports.import.exists && importSummary.status !== 'ok') blockers.push('P1_IMPORT_DRY_RUN_STATUS_NOT_OK');
  if (reports.import.exists && importSummary.mode !== 'dry-run') {
    blockers.push(`P1_IMPORT_REPORT_NOT_DRY_RUN:${importSummary.mode ?? ''}`);
  }
  const importChangedRows = numberOrZero(importSummary.changedRows);

  if (reports.import.exists && numberOrZero(importSummary.importedRows) !== actionableRows.length) {
    blockers.push(`P1_IMPORT_ROWS_MISMATCH:${importSummary.importedRows ?? ''}:${actionableRows.length}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.decidedRows) !== decidedRows.length) {
    blockers.push(`P1_IMPORT_DECIDED_ROWS_MISMATCH:${importSummary.decidedRows ?? ''}:${decidedRows.length}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.approvedRows) !== approvedRows.length) {
    blockers.push(`P1_IMPORT_APPROVED_ROWS_MISMATCH:${importSummary.approvedRows ?? ''}:${approvedRows.length}`);
  }
  if (reports.import.exists && numberOrZero(importSummary.pendingRows) !== pendingRows.length) {
    blockers.push(`P1_IMPORT_PENDING_ROWS_MISMATCH:${importSummary.pendingRows ?? ''}:${pendingRows.length}`);
  }
  if (reports.import.exists && boolOrFalse(importSummary.productionDataChanged)) {
    blockers.push('P1_IMPORT_CHANGED_PRODUCTION_DATA');
  }

  if (closedTerminalInputRows.length > 0) {
    warnings.push(`CLOSED_TERMINAL_INPUT_ROWS_IGNORED:${closedTerminalInputRows.map((row) => row.block).join(' ')}`);
  }
  const stageSummaries = ORDERED_STAGES.map((stage) => {
    const stageRows = actionableRows.filter((row) => row.stage === stage);
    const stageApprovedRows = stageRows.filter((row) => row.approved);
    return {
      stage,
      stageOrder: STAGE_ORDER[stage],
      rows: stageRows.length,
      approvedRows: stageApprovedRows.length,
      approvedBlocks: stageApprovedRows.map((row) => row.block),
    };
  });
  const firstIncompleteStage = stageSummaries.find((stage) => stage.approvedRows < stage.rows);
  const laterApprovedRows = firstIncompleteStage
    ? approvedRows.filter((row) => row.stageOrder > firstIncompleteStage.stageOrder)
    : [];
  if (laterApprovedRows.length > 0) {
    blockers.push(`P1_STAGE_ORDER_APPROVAL_BLOCKED:${firstIncompleteStage.stage}:${laterApprovedRows.map((row) => row.block).join(' ')}`);
  }
  if (importChangedRows === 0) warnings.push('NO_P1_TEMPLATE_CHANGES_TO_IMPORT');
  if (approvedRows.length === 0) warnings.push('NO_APPROVED_P1_ROWS_TEMPLATE_IMPORT_WILL_BLOCK');
  if (filledPathRows.length > approvedRows.length) warnings.push('CORRECTED_PATH_FILLED_FOR_NON_APPROVED_ROWS');
  if (filledReviewerRows.length > approvedRows.length) warnings.push('REVIEWER_FILLED_FOR_NON_APPROVED_ROWS');

  const awaitingOperatorInput = blockers.length === 0 && (importChangedRows === 0 || approvedRows.length === 0);
  const readyForTemplateImport = blockers.length === 0 && importChangedRows > 0 && approvedRows.length > 0;
  const readyForGuardedWriteAfterTemplateImport = readyForTemplateImport && approvedRows.length > 0;

  const summary = {
    readinessVersion: READINESS_VERSION,
    status: blockers.length > 0 ? 'blocked' : readyForTemplateImport ? 'ready' : 'waiting-for-operator',
    awaitingOperatorInput,
    readyForTemplateImport,
    readyForGuardedWriteAfterTemplateImport,
    targetBatchId: TARGET_BATCH_ID,
    priorBatchId: PRIOR_BATCH_ID,
    expectedRows,
    baselineExpectedRows: BASELINE_EXPECTED_ROWS,
    totalRows: rows.length,
    actionableRows: actionableRows.length,
    closedTerminalInputRows: closedTerminalInputRows.length,
    pendingRows: pendingRows.length,
    decidedRows: decidedRows.length,
    approvedRows: approvedRows.length,
    rejectedRows: rejectedRows.length,
    needsRetraceRows: needsRetraceRows.length,
    invalidDecisionRows: invalidDecisionRows.length,
    filledPathRows: filledPathRows.length,
    filledReviewerRows: filledReviewerRows.length,
    priorPendingRows: priorPendingRows.length,
    priorApprovedRows: priorApprovedRows.length,
    validationStatus: validationSummary.status ?? '',
    validationApprovedRows,
    validApprovedRows,
    invalidApprovedRows,
    invalidMetadataRows,
    importStatus: importSummary.status ?? '',
    importMode: importSummary.mode ?? '',
    importChangedRows,
    importDecidedRows: numberOrZero(importSummary.decidedRows),
    importApprovedRows: numberOrZero(importSummary.approvedRows),
    importPendingRows: numberOrZero(importSummary.pendingRows),
    stageSummaries,
    firstIncompleteStage: firstIncompleteStage?.stage ?? '',
    laterApprovedRows: laterApprovedRows.length,
    productionDataChanged: boolOrFalse(importSummary.productionDataChanged),
    blockerRows: blockerRows.length,
    blockers,
    warnings,
    validateCommand: 'npm run stadium:daegu:p1-operator-validate',
    importDryRunCommand: 'npm run stadium:daegu:p1-operator-import',
    templateImportCommand: 'npm run stadium:daegu:p1-operator-import:write-template',
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
      'It must be run after npm run stadium:daegu:p1-operator-validate and npm run stadium:daegu:p1-operator-import.',
      'It blocks template import while BATCH_1_P0 is still pending or still has approved rows waiting for production write.',
      'It blocks template import while any P1 row remains PENDING.',
      'It blocks template import unless at least one P1 row is operatorDecision=APPROVED.',
      'It blocks template import if SINGLE_CORRECTED_PATH or DUPLICATE_CANDIDATE_SPLIT is approved before the earlier P1 stage is complete.',
      'Terminal P1 input rows already closed in production data may remain as audit history and are ignored for actionable import/write counts.',
      'It does not allow production write directly; production write still requires npm run stadium:daegu:operator-corrections-write.',
      'Do not run npm run stadium:daegu:operator-corrections after p1-operator-import:write-template.',
    ],
    rows,
    nextActions: readyForTemplateImport
      ? [
        'Run npm run stadium:daegu:p1-operator-import:write-template.',
        'Then run npm run stadium:daegu:operator-corrections-write.',
      ]
      : awaitingOperatorInput
        ? [
          'Fill at least one P1 source input row with an operator decision that changes the corrections template.',
          'For production promotion, use operatorDecision=APPROVED with correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt.',
          'Run npm run stadium:daegu:p1-operator-validate.',
          'Run npm run stadium:daegu:p1-operator-import.',
          'Re-run npm run stadium:daegu:p1-operator-readiness.',
        ]
      : [
        'Resolve blockers in the P1 operator input.',
        'Run npm run stadium:daegu:p1-operator-validate.',
        'Run npm run stadium:daegu:p1-operator-import.',
        'Re-run npm run stadium:daegu:p1-operator-readiness.',
      ],
  };

  const jsonPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-readiness.json');
  const csvPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-readiness.csv');
  const markdownPath = path.join(p1ReportDir, 'daegu-seatmap-p1-operator-readiness.md');

  await fs.mkdir(p1ReportDir, { recursive: true });
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
      'closedTerminalInputRow',
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
      row.closedTerminalInputRow,
      row.reasons.join(' '),
      row.warnings.join(' '),
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P1 Operator Readiness',
    '',
    `- readiness version: \`${READINESS_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- awaiting operator input: ${summary.awaitingOperatorInput}`,
    `- ready for template import: ${summary.readyForTemplateImport}`,
    `- ready for guarded write after template import: ${summary.readyForGuardedWriteAfterTemplateImport}`,
    `- prior pending rows: ${summary.priorPendingRows}`,
    `- prior approved rows: ${summary.priorApprovedRows}`,
    `- actionable rows: ${summary.actionableRows}`,
    `- closed terminal input rows: ${summary.closedTerminalInputRows}`,
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
    `- first incomplete stage: \`${summary.firstIncompleteStage || 'none'}\``,
    `- later approved rows: ${summary.laterApprovedRows}`,
    `- production data changed: ${summary.productionDataChanged}`,
    '',
    '## Rows',
    '',
    markdownTable(
      [
        'block',
        'stage',
        'decision',
        'valid',
        'path',
        'label x',
        'label y',
        'reviewer',
        'reviewed at',
        'closed terminal',
        'reasons',
      ],
      rows.map((row) => [
        row.block ? `\`${row.block}\`` : row.blockId,
        `\`${row.stage || 'UNKNOWN'}\``,
        `\`${row.decision}\``,
        String(row.validForApproval),
        String(row.hasCorrectedPath),
        String(row.hasCorrectedLabelX),
        String(row.hasCorrectedLabelY),
        String(row.hasReviewer),
        String(row.hasReviewedAt),
        String(row.closedTerminalInputRow),
        row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Stage Order',
    '',
    markdownTable(
      ['stage', 'rows', 'approved', 'approved blocks'],
      stageSummaries.map((row) => [
        `\`${row.stage}\``,
        row.rows,
        row.approvedRows,
        row.approvedBlocks.map((block) => `\`${block}\``).join(' ') || '-',
      ]),
    ),
    '',
    '## Gate',
    '',
    '1. 이 readiness는 read-only이며 main template과 `src/data/daeguSeatData.ts`를 수정하지 않습니다.',
    '2. P0 batch가 pending 없이 닫혔고 approved row도 남아 있지 않아야 P1 template import를 진행할 수 있습니다.',
    '3. 이미 production data에서 닫힌 terminal P1 row는 audit history로 남길 수 있고, actionable import/write 집계에서는 제외합니다.',
    '4. P1 actionable row 중 `PENDING` row가 남아 있으면 template import를 진행하지 않습니다.',
    '5. `APPROVED` row가 있으면 validation에서 `validForApproval=true`여야 합니다.',
    '6. `PAIR_BOUNDARY_FIRST`가 완료되기 전 `SINGLE_CORRECTED_PATH` 또는 `DUPLICATE_CANDIDATE_SPLIT` 승인 row는 template import를 진행하지 않습니다.',
    '7. readiness가 통과해도 production write는 `npm run stadium:daegu:operator-corrections-write` guard를 다시 통과해야 합니다.',
    '8. `p1-operator-import:write-template` 이후에는 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않습니다.',
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

  console.log(`p1_operator_readiness_json:${jsonPath}`);
  console.log(`p1_operator_readiness_csv:${csvPath}`);
  console.log(`p1_operator_readiness_markdown:${markdownPath}`);
  console.log(`status:${summary.status} readyForTemplateImport=${summary.readyForTemplateImport} pending=${summary.pendingRows} approved=${summary.approvedRows} validApproved=${summary.validApprovedRows}`);

  if (!summary.readyForTemplateImport) {
    process.exitCode = 1;
  }
};

const TASKS = {
  "p1-boundary-first-draft-approval-dry-run": runP1BoundaryFirstDraftApprovalDryRun,
  "p1-boundary-first-entry-preflight": runP1BoundaryFirstEntryPreflight,
  "p1-boundary-first-entry-sheet": runP1BoundaryFirstEntrySheet,
  "p1-boundary-first-image-coordinate-draft": runP1BoundaryFirstImageCoordinateDraft,
  "p1-boundary-first-operator-handoff": runP1BoundaryFirstOperatorHandoff,
  "p1-boundary-first-packet": runP1BoundaryFirstPacket,
  "p1-boundary-first-postwrite-gate": runP1BoundaryFirstPostwriteGate,
  "p1-boundary-first-readiness": runP1BoundaryFirstReadiness,
  "p1-boundary-first-regression": runP1BoundaryFirstRegression,
  "p1-boundary-first-review-board": runP1BoundaryFirstReviewBoard,
  "p1-boundary-first-source-copy": runP1BoundaryFirstSourceCopy,
  "p1-boundary-first-template-gate": runP1BoundaryFirstTemplateGate,
  "p1-boundary-first-tracing-pack": runP1BoundaryFirstTracingPack,
  "p1-operator-audit": runP1OperatorAudit,
  "p1-operator-import": runP1OperatorImport,
  "p1-operator-package": runP1OperatorPackage,
  "p1-operator-readiness": runP1OperatorReadiness,
};

export const runDaeguP1OperatorBoundaryTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Daegu p1 operator/boundary task: ${task}. Available tasks: ${available}`);
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
  await runDaeguP1OperatorBoundaryTask(task, args);
}
