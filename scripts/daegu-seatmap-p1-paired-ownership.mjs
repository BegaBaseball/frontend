import { spawnSync } from 'node:child_process';
import crypto, { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  DAEGU_BLOCKS,
  DAEGU_SEATMAP_IMAGE,
  DAEGU_TRACE_SOURCE,
  DAEGU_TRACE_VERSION,
  isDaeguNormalSelectableSeat,
} from '../src/data/daeguSeatData.ts';
import {
  pathBounds,
  pathToPoints,
  pointInPolygon,
  pointsToPath,
  polygonArea,
  validateSeatMapPolygonPath,
} from '../src/utils/seatMapPolygonValidator.ts';

const runP1PairedOwnershipApplyPlan = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const APPLY_PLAN_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_APPLY_PLAN_V1';
  const GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_TEMPLATE_GATE_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const SOURCE_SCOPE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_SOURCE_SCOPE_V1';

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

  const isApprovedDecision = (decision) => String(decision ?? '').trim() === 'APPROVED';

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const gatePath = path.resolve(
    frontendRoot,
    argValue('--gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-template-gate.json')),
  );
  const templatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );
  const sourceScopePath = path.resolve(
    frontendRoot,
    argValue('--source-scope', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json')),
  );
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));

  const gate = await readJson(gatePath);
  const template = await readJson(templatePath);
  const sourceScope = await readJson(sourceScopePath);

  const blockers = [];
  const warnings = [];

  if (gate.summary?.gateVersion !== GATE_VERSION) blockers.push(`GATE_VERSION_MISMATCH:${gate.summary?.gateVersion ?? ''}`);
  if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  if (template.sourceScopeVersion !== SOURCE_SCOPE_VERSION) blockers.push(`TEMPLATE_SOURCE_SCOPE_VERSION_MISMATCH:${template.sourceScopeVersion ?? ''}`);
  if (sourceScope.summary?.sourceScopeVersion !== SOURCE_SCOPE_VERSION) {
    blockers.push(`SOURCE_SCOPE_VERSION_MISMATCH:${sourceScope.summary?.sourceScopeVersion ?? ''}`);
  }
  if (gate.summary?.productionWriteAllowed !== false) blockers.push('GATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (sourceScope.summary?.productionWriteAllowed !== false) blockers.push('SOURCE_SCOPE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

  const gateRowsByTemplateRowId = new Map((gate.rows ?? []).map((row) => [row.templateRowId, row]));
  const sourceRowsByTemplateRowId = new Map((sourceScope.rows ?? []).map((row) => [row.templateRowId, row]));
  const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
  const gateStatus = gate.summary?.status ?? 'missing-gate-status';
  const readyForSourceCopy = blockers.length === 0 && gateStatus === 'ready-for-source-copy';

  if (gateStatus === 'blocked') blockers.push(...(gate.summary?.blockers ?? ['TEMPLATE_GATE_BLOCKED']));
  if (gateStatus === 'waiting-for-operator') warnings.push('APPLY_PLAN_WAITING_FOR_OPERATOR_APPROVAL');
  if (gateStatus === 'waiting-for-remaining-groups') warnings.push('APPLY_PLAN_WAITING_FOR_REMAINING_GROUPS');
  if (gateStatus !== 'ready-for-source-copy') warnings.push('APPLY_PLAN_SOURCE_COPY_HELD_UNTIL_GROUP_GATE_READY');

  const allCandidateRows = templateRows.map((row) => {
    const gateRow = gateRowsByTemplateRowId.get(row.templateRowId);
    const sourceRow = sourceRowsByTemplateRowId.get(row.templateRowId);
    const approved = isApprovedDecision(row.operatorDecision);
    const rowReady = readyForSourceCopy
      && approved
      && gateRow?.readyForSourceCopy === true
      && Array.isArray(gateRow.reasons)
      && gateRow.reasons.length === 0;
    return {
      templateRowId: row.templateRowId,
      groupId: row.groupId,
      blockId: row.blockId,
      block: row.block,
      blockRole: row.blockRole,
      operatorDecision: row.operatorDecision,
      approved,
      groupGateReady: gateRow?.readyForSourceCopy === true,
      plannedForSourceCopy: rowReady,
      sourceScopeGap: sourceRow?.sourceScopeGap ?? row.sourceScopeGap ?? false,
      correctedPath: rowReady ? row.correctedPath : '',
      correctedLabelX: rowReady ? row.correctedLabelX : '',
      correctedLabelY: rowReady ? row.correctedLabelY : '',
      reviewer: rowReady ? row.reviewer : '',
      reviewedAt: rowReady ? row.reviewedAt : '',
      reasons: rowReady
        ? []
        : [
          ...(!approved ? ['ROW_NOT_APPROVED'] : []),
          ...(gateRow?.reasons ?? []),
          ...(readyForSourceCopy ? [] : [`GATE_NOT_READY:${gateStatus}`]),
        ],
      plannedFields: rowReady
        ? [
          'd',
          'imageGeometry.visualPath',
          'imageGeometry.hitPath',
          'imageGeometry.labelPoint',
          'imageGeometry.traceSource',
          'imageGeometry.geometryVersion',
          'imageGeometry.manualReviewed',
          'imageGeometry.pixelAlignmentStatus',
          'traceStatus',
          'traceMethod',
        ]
        : [],
    };
  });

  const plannedRows = allCandidateRows.filter((row) => row.plannedForSourceCopy);
  const heldRows = allCandidateRows.filter((row) => !row.plannedForSourceCopy);
  const plannedEditCount = plannedRows.reduce((count, row) => count + row.plannedFields.length, 0);
  const completeGroups = (gate.groups ?? []).filter((group) => group.completeApproval === true && (group.groupReasons ?? []).length === 0);
  const eligibleGroups = readyForSourceCopy ? completeGroups : [];

  const status = blockers.length > 0
    ? 'blocked'
    : readyForSourceCopy
      ? 'ready-for-source-copy'
      : gateStatus;

  const summary = {
    applyPlanVersion: APPLY_PLAN_VERSION,
    status,
    gateStatus,
    readyForSourceCopy,
    sourceCopyAllowedNow: readyForSourceCopy,
    plannedRows: plannedRows.length,
    heldRows: heldRows.length,
    plannedEditCount,
    eligibleGroups: eligibleGroups.length,
    totalGroups: gate.summary?.groupCount ?? 0,
    completeApprovalGroups: gate.summary?.completeApprovalGroups ?? 0,
    totalRows: templateRows.length,
    approvedRows: gate.summary?.approvedRows ?? 0,
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesSourceInput: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      gate: path.relative(frontendRoot, gatePath),
      template: path.relative(frontendRoot, templatePath),
      sourceScope: path.relative(frontendRoot, sourceScopePath),
    },
    safetyContract: [
      'This apply plan is read-only and dry-run only.',
      'It never writes source input.',
      'It never modifies src/data/daeguSeatData.ts.',
      'It never writes production data.',
      'plannedRows remains 0 unless the paired ownership template gate status is ready-for-source-copy.',
      'Operator APPROVED rows require correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt in the template gate.',
    ],
    groups: (gate.groups ?? []).map((group) => ({
      groupId: group.groupId,
      approvedRows: group.approvedRows,
      totalRows: group.totalRows,
      completeApproval: group.completeApproval,
      sourceCopyEligible: readyForSourceCopy && group.completeApproval === true && (group.groupReasons ?? []).length === 0,
      reasons: readyForSourceCopy ? (group.groupReasons ?? []) : [`GATE_NOT_READY:${gateStatus}`, ...(group.groupReasons ?? [])],
    })),
    rows: allCandidateRows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-apply-plan.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-apply-plan.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-apply-plan.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    ['templateRowId', 'groupId', 'block', 'operatorDecision', 'approved', 'groupGateReady', 'plannedForSourceCopy', 'plannedFields', 'reasons'],
    ...allCandidateRows.map((row) => [
      row.templateRowId,
      row.groupId,
      row.block,
      row.operatorDecision,
      row.approved,
      row.groupGateReady,
      row.plannedForSourceCopy,
      row.plannedFields.join(' '),
      row.reasons.join(' '),
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership Apply Plan',
    '',
    `- apply plan version: \`${APPLY_PLAN_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- gate status: \`${summary.gateStatus}\``,
    `- ready for source copy: ${summary.readyForSourceCopy}`,
    `- planned rows: ${summary.plannedRows}`,
    `- planned edit count: ${summary.plannedEditCount}`,
    `- data file changed: ${summary.dataFileChanged}`,
    '',
    '## Groups',
    '',
    markdownTable(
      ['group', 'approved', 'total', 'complete', 'eligible', 'reasons'],
      report.groups.map((group) => [
        `\`${group.groupId}\``,
        group.approvedRows,
        group.totalRows,
        String(group.completeApproval),
        String(group.sourceCopyEligible),
        group.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Rows',
    '',
    markdownTable(
      ['template row', 'decision', 'planned', 'fields', 'reasons'],
      report.rows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.operatorDecision}\``,
        String(row.plannedForSourceCopy),
        row.plannedFields.map((field) => `\`${field}\``).join('<br>') || '-',
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

  console.log(JSON.stringify({
    status: summary.status,
    gateStatus: summary.gateStatus,
    readyForSourceCopy: summary.readyForSourceCopy,
    plannedRows: summary.plannedRows,
    plannedEditCount: summary.plannedEditCount,
    dataFileChanged: false,
    writesSourceInput: false,
    writesProductionData: false,
    output: path.relative(frontendRoot, markdownPath),
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipApprovalPacket = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultNeighborDraftDir = path.join(defaultP1ReportDir, 'daegu-seatmap-p1-paired-ownership-neighbor-image-draft');
  const defaultDryRunDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-neighbor-approval-dry-run');
  const defaultOutputDir = path.join(defaultP1ReportDir, 'daegu-seatmap-p1-paired-ownership-approval-packet');

  const PACKET_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_APPROVAL_PACKET_V1';
  const SOURCE_SCOPE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_SOURCE_SCOPE_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const NEIGHBOR_DRAFT_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_NEIGHBOR_IMAGE_DRAFT_V1';
  const NEIGHBOR_DRY_RUN_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_NEIGHBOR_APPROVAL_DRY_RUN_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const EXPECTED = {
    groupCount: 3,
    groupTemplateRows: 16,
    uniqueAffectedBlocks: 12,
    neighborImageDraftRows: 16,
  };

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
      if (error?.code === 'ENOENT') return null;
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

  const requiredApprovalFieldsMissing = (row) => [
    ['operatorDecision', row.operatorDecision],
    ['correctedPath', row.correctedPath],
    ['correctedLabelX', row.correctedLabelX],
    ['correctedLabelY', row.correctedLabelY],
    ['reviewer', row.reviewer],
    ['reviewedAt', row.reviewedAt],
  ]
    .filter(([, value]) => String(value ?? '').trim() === '' || value === 'PENDING')
    .map(([field]) => field);

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));
  const sourceScopePath = path.resolve(
    frontendRoot,
    argValue('--source-scope', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json')),
  );
  const templatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );
  const neighborDraftPath = path.resolve(
    frontendRoot,
    argValue('--neighbor-draft', path.join(defaultNeighborDraftDir, 'daegu-seatmap-p1-paired-ownership-neighbor-image-draft.json')),
  );
  const neighborDryRunPath = path.resolve(
    frontendRoot,
    argValue('--neighbor-dry-run', path.join(defaultDryRunDir, 'daegu-seatmap-p1-paired-ownership-neighbor-approval-dry-run.json')),
  );

  const blockers = [];
  const warnings = [];
  const sourceScope = await readJson(sourceScopePath);
  const template = await readJson(templatePath);
  const neighborDraft = await readOptionalJson(neighborDraftPath);
  const neighborDryRun = await readOptionalJson(neighborDryRunPath);
  const sourceRows = Array.isArray(sourceScope.rows) ? sourceScope.rows : [];
  const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
  const groups = Array.isArray(sourceScope.groups) ? sourceScope.groups : [];

  if (sourceScope.summary?.sourceScopeVersion !== SOURCE_SCOPE_VERSION) {
    blockers.push(`SOURCE_SCOPE_VERSION_MISMATCH:${sourceScope.summary?.sourceScopeVersion ?? ''}`);
  }
  if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  if (template.sourceScopeVersion !== SOURCE_SCOPE_VERSION) blockers.push(`TEMPLATE_SOURCE_SCOPE_VERSION_MISMATCH:${template.sourceScopeVersion ?? ''}`);
  if (template.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
  if (sourceScope.summary?.productionWriteAllowed !== false) blockers.push('SOURCE_SCOPE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (templateRows.length !== EXPECTED.groupTemplateRows) blockers.push(`TEMPLATE_ROW_COUNT_MISMATCH:${templateRows.length}:${EXPECTED.groupTemplateRows}`);
  if (groups.length !== EXPECTED.groupCount) blockers.push(`GROUP_COUNT_MISMATCH:${groups.length}:${EXPECTED.groupCount}`);
  if (sourceScope.summary?.uniqueAffectedBlocks !== EXPECTED.uniqueAffectedBlocks) {
    blockers.push(`UNIQUE_AFFECTED_BLOCKS_MISMATCH:${sourceScope.summary?.uniqueAffectedBlocks ?? ''}:${EXPECTED.uniqueAffectedBlocks}`);
  }
  if (sourceScope.summary?.neighborImageDraftRows !== EXPECTED.neighborImageDraftRows) {
    blockers.push(`SOURCE_SCOPE_NEIGHBOR_IMAGE_DRAFT_ROWS_MISMATCH:${sourceScope.summary?.neighborImageDraftRows ?? ''}:${EXPECTED.neighborImageDraftRows}`);
  }

  if (!neighborDraft) {
    warnings.push(`NEIGHBOR_IMAGE_DRAFT_MISSING:${path.relative(frontendRoot, neighborDraftPath)}`);
  } else {
    if (neighborDraft.draftVersion !== NEIGHBOR_DRAFT_VERSION) {
      blockers.push(`NEIGHBOR_IMAGE_DRAFT_VERSION_MISMATCH:${neighborDraft.draftVersion ?? ''}`);
    }
    if (neighborDraft.productionWriteAllowed !== false) blockers.push('NEIGHBOR_IMAGE_DRAFT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
    if ((neighborDraft.summary?.groupDraftRows ?? neighborDraft.groupDraftRows ?? 0) !== EXPECTED.neighborImageDraftRows) {
      warnings.push(`NEIGHBOR_IMAGE_DRAFT_ROW_COUNT_CHANGED:${neighborDraft.summary?.groupDraftRows ?? neighborDraft.groupDraftRows ?? ''}:${EXPECTED.neighborImageDraftRows}`);
    }
  }

  if (!neighborDryRun) {
    warnings.push(`NEIGHBOR_APPROVAL_DRY_RUN_MISSING:${path.relative(frontendRoot, neighborDryRunPath)}`);
  } else {
    if (neighborDryRun.summary?.dryRunVersion !== NEIGHBOR_DRY_RUN_VERSION) {
      blockers.push(`NEIGHBOR_APPROVAL_DRY_RUN_VERSION_MISMATCH:${neighborDryRun.summary?.dryRunVersion ?? ''}`);
    }
    if (neighborDryRun.summary?.productionWriteAllowed !== false) {
      blockers.push('NEIGHBOR_APPROVAL_DRY_RUN_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
    }
    if (neighborDryRun.summary?.gateStatus !== 'ready-for-source-copy') {
      warnings.push(`NEIGHBOR_APPROVAL_DRY_RUN_GATE_NOT_READY:${neighborDryRun.summary?.gateStatus ?? ''}`);
    }
    if ((neighborDryRun.summary?.gateInvalidRows ?? 0) !== 0) {
      warnings.push(`NEIGHBOR_APPROVAL_DRY_RUN_INVALID_ROWS:${neighborDryRun.summary?.gateInvalidRows ?? ''}`);
    }
  }

  const templateByRowId = new Map(templateRows.map((row) => [row.templateRowId, row]));
  const rows = sourceRows.map((sourceRow) => {
    const templateRow = templateByRowId.get(sourceRow.templateRowId) ?? {};
    const operatorDecision = String(templateRow.operatorDecision ?? 'PENDING').trim() || 'PENDING';
    const approvalMissingFields = operatorDecision === 'APPROVED'
      ? requiredApprovalFieldsMissing(templateRow).filter((field) => field !== 'operatorDecision')
      : ['operatorDecision=APPROVED', 'correctedPath', 'correctedLabelX', 'correctedLabelY', 'reviewer', 'reviewedAt'];
    return {
      templateRowId: sourceRow.templateRowId,
      groupId: sourceRow.groupId,
      blockRole: sourceRow.blockRole,
      blockId: sourceRow.blockId,
      block: sourceRow.block,
      traceStatus: sourceRow.traceStatus,
      traceMethod: sourceRow.traceMethod,
      currentPathPointCount: sourceRow.currentPathPointCount,
      currentLabel: `${sourceRow.currentLabelX},${sourceRow.currentLabelY}`,
      neighborImageDraftPath: sourceRow.neighborImageDraftPath,
      neighborImageDraftLabel: sourceRow.neighborImageDraftLabelX === ''
        ? ''
        : `${sourceRow.neighborImageDraftLabelX},${sourceRow.neighborImageDraftLabelY}`,
      neighborImageDraftCoverage: sourceRow.neighborImageDraftCoverage,
      neighborImageDraftRiskFlags: sourceRow.neighborImageDraftRiskFlags,
      sourceScopeGap: sourceRow.sourceScopeGap,
      operatorDecision,
      correctedPathFilled: String(templateRow.correctedPath ?? '').trim() !== '',
      correctedLabelFilled: String(templateRow.correctedLabelX ?? '').trim() !== ''
        && String(templateRow.correctedLabelY ?? '').trim() !== '',
      reviewerFilled: String(templateRow.reviewer ?? '').trim() !== '',
      reviewedAtFilled: String(templateRow.reviewedAt ?? '').trim() !== '',
      approvalMissingFields,
      overlay: sourceRow.overlay,
    };
  });

  const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
  const pendingRows = rows.filter((row) => row.operatorDecision !== 'APPROVED');
  const neighborRows = rows.filter((row) => row.neighborImageDraftPath);
  const uniqueBlocks = [...new Set(rows.map((row) => row.block))].sort((left, right) => left.localeCompare(right, 'ko'));
  const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator-approval';
  const safetyContract = [
    'This approval packet is read-only evidence for the P1 paired ownership operator review.',
    'It never writes the live operator template.',
    'It never writes source input.',
    'It never modifies src/data/daeguSeatData.ts.',
    'It never promotes neighborImageDraftPath into correctedPath.',
    'neighborImageDraftPath and neighborImageDraftLabelX/Y are official PNG pixel-scan evidence only.',
    'Every ownership group must be approved as a complete group before the source-copy dry-run can plan rows.',
    'A ready neighbor approval dry-run is evidence that the image draft is gate-consistent, not operator approval.',
  ];

  const groupReports = groups.map((group) => {
    const groupRows = rows.filter((row) => row.groupId === group.groupId);
    return {
      groupId: group.groupId,
      title: group.title,
      conflictClass: group.conflictClass,
      targetBlocks: group.targetBlocks ?? [],
      affectedBlocks: group.affectedBlocks ?? [],
      templateRows: groupRows.length,
      approvedRows: groupRows.filter((row) => row.operatorDecision === 'APPROVED').length,
      pendingRows: groupRows.filter((row) => row.operatorDecision !== 'APPROVED').length,
      neighborImageDraftRows: groupRows.filter((row) => row.neighborImageDraftPath).length,
      overlay: group.overlay ?? '',
      operatorAction: group.operatorAction,
      completeGroupApprovalRequired: true,
    };
  });

  const summary = {
    packetVersion: PACKET_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    groupCount: groupReports.length,
    templateRows: rows.length,
    uniqueAffectedBlocks: uniqueBlocks.length,
    uniqueAffectedBlockList: uniqueBlocks,
    neighborImageDraftRows: neighborRows.length,
    approvedRows: approvedRows.length,
    pendingRows: pendingRows.length,
    sourceScope: path.relative(frontendRoot, sourceScopePath),
    operatorTemplate: path.relative(frontendRoot, templatePath),
    neighborDraft: neighborDraft ? path.relative(frontendRoot, neighborDraftPath) : '',
    neighborApprovalDryRun: neighborDryRun ? path.relative(frontendRoot, neighborDryRunPath) : '',
    neighborDryRunStatus: neighborDryRun?.summary?.status ?? '',
    neighborDryRunGateStatus: neighborDryRun?.summary?.gateStatus ?? '',
    productionWriteAllowed: false,
    writesOperatorTemplate: false,
    writesSourceInput: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    expected: EXPECTED,
    safetyContract,
    groups: groupReports,
    rows,
  };

  await fs.mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-approval-packet.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-approval-packet.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-approval-packet.md');
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'groupId',
      'blockRole',
      'block',
      'operatorDecision',
      'neighborImageDraftCoverage',
      'neighborImageDraftRiskFlags',
      'sourceScopeGap',
      'approvalMissingFields',
      'overlay',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.groupId,
      row.blockRole,
      row.block,
      row.operatorDecision,
      row.neighborImageDraftCoverage,
      row.neighborImageDraftRiskFlags,
      row.sourceScopeGap,
      row.approvalMissingFields.join(' '),
      row.overlay,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership Approval Packet',
    '',
    `- packet version: \`${PACKET_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- template rows: ${summary.templateRows}`,
    `- unique affected blocks: ${summary.uniqueAffectedBlocks}`,
    `- neighbor image draft rows: ${summary.neighborImageDraftRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- pending rows: ${summary.pendingRows}`,
    `- neighbor dry-run gate: \`${summary.neighborDryRunGateStatus || '-'}\``,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Safety',
    '',
    ...safetyContract.map((line) => `- ${line}`),
    '',
    '## Groups',
    '',
    markdownTable(
      ['group', 'target', 'affected', 'rows', 'approved', 'neighbor draft', 'overlay'],
      groupReports.map((group) => [
        `\`${group.groupId}\``,
        group.targetBlocks.map((block) => `\`${block}\``).join(' ') || '-',
        group.affectedBlocks.map((block) => `\`${block}\``).join(' ') || '-',
        group.templateRows,
        group.approvedRows,
        group.neighborImageDraftRows,
        group.overlay ? `\`${group.overlay}\`` : '-',
      ]),
    ),
    '',
    '## Rows',
    '',
    markdownTable(
      ['template row', 'role', 'block', 'decision', 'draft label', 'coverage', 'missing approval fields'],
      rows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.blockRole}\``,
        `\`${row.block}\``,
        `\`${row.operatorDecision}\``,
        row.neighborImageDraftLabel || '-',
        row.neighborImageDraftCoverage || '-',
        row.approvalMissingFields.map((field) => `\`${field}\``).join('<br>') || '-',
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

  console.log(JSON.stringify({
    status,
    output: path.relative(frontendRoot, markdownPath),
    templateRows: rows.length,
    uniqueAffectedBlocks: uniqueBlocks.length,
    neighborImageDraftRows: neighborRows.length,
    approvedRows: approvedRows.length,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipCorrectionPackage = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultP1ReportDir = path.join(defaultReportDir, 'daegu-p1-operator');
  const defaultDryRunDir = path.join(defaultReportDir, 'daegu-p1-boundary-first-draft-approval-dry-run');
  const defaultNeighborDraftDir = path.join(defaultP1ReportDir, 'daegu-seatmap-p1-paired-ownership-neighbor-image-draft');
  const defaultOutputDir = path.join(defaultP1ReportDir, 'daegu-seatmap-p1-paired-ownership-correction-package');

  const PACKAGE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_CORRECTION_PACKAGE_V1';
  const INPUT_AID_VERSION = 'DAEGU_P1_BOUNDARY_INPUT_AID_V1';
  const DRAFT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_IMAGE_COORDINATE_DRAFT_V1';
  const NEIGHBOR_DRAFT_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_NEIGHBOR_IMAGE_DRAFT_V1';
  const DRY_RUN_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_DRAFT_APPROVAL_DRY_RUN_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const EXPECTED = {
    groupCount: 3,
    targetRows: 5,
    sourceScopeGapGroups: 3,
    draftReadyRows: 3,
    draftBlockedRows: 2,
  };

  const GROUP_SPECS = [
    {
      groupId: 'P1_T1_TABLE_OWNERSHIP',
      title: 'T1-1 / T1-2 / TC-1 shared ownership',
      targetBlocks: ['T1-1'],
      affectedBlocks: ['T1-1', 'T1-2', 'TC-1'],
      conflictClass: 'PAIRED_RELABELLING_REQUIRED',
      operatorAction: 'Trace T1-1 with T1-2 and TC-1 visible. Do not approve T1-1 until the T1-2 label and TC-1 edge remain outside the corrected T1-1 path.',
    },
    {
      groupId: 'P1_T3_TABLE_OWNERSHIP',
      title: 'T3-2 / T3-3 / T3-4 / TC-3 / T3-1 shared ownership',
      targetBlocks: ['T3-2'],
      affectedBlocks: ['T3-2', 'T3-3', 'T3-4', 'TC-3', 'T3-1'],
      conflictClass: 'PAIRED_RELABELLING_REQUIRED',
      operatorAction: 'Trace T3-2 together with the locked T3-3/T3-4 and neighboring TC-3/T3-1 paths. The final label top-hit must be T3-2 and no paired label may be captured.',
    },
    {
      groupId: 'P1_V_CENTER_TABLE_SPLIT',
      title: 'V1 / V2 / V3 / T3-3/T3-4 center-table manual split',
      targetBlocks: ['V1', 'V2', 'V3'],
      affectedBlocks: ['V1', 'V2', 'V3', 'T3-2', 'T3-3', 'T3-4', 'TC-1', 'TC-2'],
      conflictClass: 'MANUAL_NON_OVERLAP_SPLIT_REQUIRED',
      operatorAction: 'Trace V1/V2/V3 as one manual split package with T3-2/T3-3/T3-4 and TC-1/TC-2 visible. V rows should not be source-copied until adjacent ownership is resolved.',
    },
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
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
      throw error;
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
    return sanitized || 'group';
  };

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

  const pathArea = (pathData) => {
    const points = pathPoints(pathData);
    return points.length >= 3 ? polygonArea(points) : 0;
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
    if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return null;
    return { minX: Number(x), minY: Number(y), maxX: Number(x), maxY: Number(y) };
  };

  const mergeBounds = (items, padding = 70) => {
    const bounds = items.filter(Boolean);
    if (bounds.length === 0) {
      return {
        x: 0,
        y: 0,
        width: DAEGU_SEATMAP_IMAGE.imageWidth,
        height: DAEGU_SEATMAP_IMAGE.imageHeight,
      };
    }
    const minX = Math.max(0, Math.floor(Math.min(...bounds.map((item) => item.minX)) - padding));
    const minY = Math.max(0, Math.floor(Math.min(...bounds.map((item) => item.minY)) - padding));
    const maxX = Math.min(DAEGU_SEATMAP_IMAGE.imageWidth, Math.ceil(Math.max(...bounds.map((item) => item.maxX)) + padding));
    const maxY = Math.min(DAEGU_SEATMAP_IMAGE.imageHeight, Math.ceil(Math.max(...bounds.map((item) => item.maxY)) + padding));
    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  };

  const compactBounds = (bounds) => {
    if (!bounds) return '';
    return `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;
  };

  const blockPath = (block) => block?.imageGeometry?.hitPath
    ?? block?.imageGeometry?.visualPath
    ?? block?.imageGeometry?.d
    ?? '';

  const blockSummary = (block) => {
    if (!block) return null;
    return {
      blockId: block.id,
      block: block.block,
      name: block.name,
      traceStatus: block.traceStatus,
      traceMethod: block.traceMethod,
      sectionKind: block.sectionKind,
      currentPath: blockPath(block),
      currentPathBounds: boundsForPath(blockPath(block)),
      labelX: block.imageGeometry?.labelX,
      labelY: block.imageGeometry?.labelY,
      shortLabel: block.imageGeometry?.shortLabel,
    };
  };

  const pathContainsPoint = (pathData, point) => pointInPolygon(point, pathPoints(pathData));

  const topHitAt = (paths, point) => {
    const hits = paths
      .filter((row) => row.path && pathContainsPoint(row.path, point))
      .sort((left, right) => right.area - left.area);
    return {
      topHit: hits.at(-1)?.block ?? 'none',
      hits: hits.map((hit) => hit.block),
    };
  };

  const buildLabelHitMatrix = (group) => {
    const evidenceRows = Array.isArray(group.neighborDraftRows) && group.neighborDraftRows.length > 0
      ? group.neighborDraftRows
      : group.draftRows;
    const currentPaths = group.affectedBlockDetails
      .filter((block) => block.currentPath)
      .map((block) => ({
        block: block.block,
        path: block.currentPath,
        area: pathArea(block.currentPath),
        source: 'current',
      }));
    const draftPaths = evidenceRows
      .filter((row) => row.draftPath)
      .map((row) => ({
        block: row.block,
        path: row.draftPath,
        area: pathArea(row.draftPath),
        source: 'draft',
      }));
    const draftBlocks = new Set(draftPaths.map((row) => row.block));
    const draftAppliedPaths = [
      ...currentPaths.filter((row) => !draftBlocks.has(row.block)),
      ...draftPaths,
    ];
    const labelRows = [
      ...group.affectedBlockDetails
        .filter((block) => Number.isFinite(Number(block.labelX)) && Number.isFinite(Number(block.labelY)))
        .map((block) => ({
          labelBlock: block.block,
          labelSource: 'current',
          x: Number(block.labelX),
          y: Number(block.labelY),
        })),
      ...evidenceRows
        .filter((row) => Number.isFinite(Number(row.draftLabelX)) && Number.isFinite(Number(row.draftLabelY)))
        .map((row) => ({
          labelBlock: row.block,
          labelSource: row.draftSource ?? 'draft',
          x: Number(row.draftLabelX),
          y: Number(row.draftLabelY),
        })),
    ];

    return labelRows.map((label) => {
      const point = [label.x, label.y];
      const currentHit = topHitAt(currentPaths, point);
      const draftAppliedHit = topHitAt(draftAppliedPaths, point);
      const draftTargetHits = draftPaths
        .filter((row) => pathContainsPoint(row.path, point))
        .map((row) => row.block);
      const ownershipChanged = currentHit.topHit !== draftAppliedHit.topHit;
      const labelCapturedByOtherDraft = draftTargetHits.some((block) => block !== label.labelBlock);
      return {
        groupId: group.groupId,
        labelBlock: label.labelBlock,
        labelSource: label.labelSource,
        labelPoint: [label.x, label.y],
        currentTopHit: currentHit.topHit,
        currentHitStack: currentHit.hits,
        draftAppliedTopHit: draftAppliedHit.topHit,
        draftAppliedHitStack: draftAppliedHit.hits,
        draftTargetHits,
        ownershipChanged,
        labelCapturedByOtherDraft,
        matrixRiskFlags: [
          ownershipChanged ? 'OWNERSHIP_CHANGED_BY_DRAFT' : '',
          labelCapturedByOtherDraft ? 'LABEL_CAPTURED_BY_OTHER_DRAFT' : '',
          draftAppliedHit.topHit !== label.labelBlock ? 'DRAFT_APPLIED_TOP_HIT_MISMATCH' : '',
        ].filter(Boolean),
      };
    });
  };

  const buildGroupSvg = (group, outputFilePath, officialImagePath) => {
    const imageHref = path.relative(path.dirname(outputFilePath), officialImagePath);
    const crop = group.crop;
    const currentPaths = group.affectedBlockDetails
      .filter((block) => block.currentPath)
      .map((block) => `<path class="${group.targetBlocks.includes(block.block) ? 'target-current' : 'paired-current'}" d="${xmlEscape(block.currentPath)}"><title>${xmlEscape(`${block.block} current path`)}</title></path>`);
    const draftPaths = group.draftRows
      .filter((row) => row.draftPath)
      .map((row) => `<path class="${row.dryRunReadyForSourceCopy ? 'draft-ready' : 'draft-blocked'}" d="${xmlEscape(row.draftPath)}"><title>${xmlEscape(`${row.block} official PNG draft`)}</title></path>`);
    const neighborDraftPaths = group.neighborDraftRows
      .filter((row) => row.draftPath)
      .map((row) => `<path class="neighbor-draft" d="${xmlEscape(row.draftPath)}"><title>${xmlEscape(`${row.block} paired-neighbor official PNG draft`)}</title></path>`);
    const currentLabels = group.affectedBlockDetails
      .filter((block) => Number.isFinite(Number(block.labelX)) && Number.isFinite(Number(block.labelY)))
      .map((block) => [
        `<circle class="current-dot" cx="${block.labelX}" cy="${block.labelY}" r="5" />`,
        `<text class="label" x="${Number(block.labelX) + 7}" y="${Number(block.labelY) - 7}">${xmlEscape(block.block)}</text>`,
      ].join('\n'));
    const draftLabels = group.draftRows
      .filter((row) => Number.isFinite(Number(row.draftLabelX)) && Number.isFinite(Number(row.draftLabelY)))
      .map((row) => [
        `<circle class="${row.dryRunReadyForSourceCopy ? 'draft-ready-dot' : 'draft-blocked-dot'}" cx="${row.draftLabelX}" cy="${row.draftLabelY}" r="6" />`,
        `<text class="draft-label" x="${Number(row.draftLabelX) + 8}" y="${Number(row.draftLabelY) + 17}">${xmlEscape(`${row.block} draft`)}</text>`,
      ].join('\n'));
    const neighborDraftLabels = group.neighborDraftRows
      .filter((row) => Number.isFinite(Number(row.draftLabelX)) && Number.isFinite(Number(row.draftLabelY)))
      .map((row) => [
        `<circle class="neighbor-draft-dot" cx="${row.draftLabelX}" cy="${row.draftLabelY}" r="5" />`,
        `<text class="neighbor-draft-label" x="${Number(row.draftLabelX) + 7}" y="${Number(row.draftLabelY) - 8}">${xmlEscape(`${row.block} img`)}</text>`,
      ].join('\n'));
    const titleY = crop.y + 30;
    const detailY = titleY + 24;
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}" width="${crop.width}" height="${crop.height}">`,
      '<style>',
      '.official-image { opacity: 0.9; }',
      '.target-current { fill: rgba(220, 38, 38, 0.18); stroke: #dc2626; stroke-width: 4; vector-effect: non-scaling-stroke; }',
      '.paired-current { fill: rgba(37, 99, 235, 0.10); stroke: #2563eb; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.draft-ready { fill: rgba(22, 163, 74, 0.28); stroke: #16a34a; stroke-width: 4; vector-effect: non-scaling-stroke; }',
      '.draft-blocked { fill: rgba(245, 158, 11, 0.30); stroke: #f97316; stroke-width: 4; stroke-dasharray: 10 7; vector-effect: non-scaling-stroke; }',
      '.neighbor-draft { fill: rgba(14, 165, 233, 0.20); stroke: #0284c7; stroke-width: 3; stroke-dasharray: 6 5; vector-effect: non-scaling-stroke; }',
      '.current-dot { fill: #111827; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.draft-ready-dot { fill: #16a34a; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.draft-blocked-dot { fill: #f97316; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.neighbor-draft-dot { fill: #0284c7; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.label { font: 800 15px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 4; paint-order: stroke; }',
      '.draft-label { font: 900 16px Arial, sans-serif; fill: #7c2d12; stroke: #fff; stroke-width: 4; paint-order: stroke; }',
      '.neighbor-draft-label { font: 900 15px Arial, sans-serif; fill: #075985; stroke: #fff; stroke-width: 4; paint-order: stroke; }',
      '.panel { fill: rgba(255,255,255,0.70); stroke: none; }',
      '.title { font: 900 24px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 5; paint-order: stroke; }',
      '.detail { font: 800 16px Arial, sans-serif; fill: #374151; stroke: #fff; stroke-width: 4; paint-order: stroke; }',
      '</style>',
      `<image class="official-image" href="${xmlEscape(imageHref)}" x="0" y="0" width="${DAEGU_SEATMAP_IMAGE.imageWidth}" height="${DAEGU_SEATMAP_IMAGE.imageHeight}" preserveAspectRatio="none" />`,
      ...currentPaths,
      ...neighborDraftPaths,
      ...draftPaths,
      ...currentLabels,
      ...neighborDraftLabels,
      ...draftLabels,
      `<rect class="panel" x="${crop.x + 8}" y="${crop.y + 8}" width="${Math.min(crop.width - 16, 820)}" height="72" />`,
      `<text class="title" x="${crop.x + 18}" y="${titleY}">${xmlEscape(group.title)}</text>`,
      `<text class="detail" x="${crop.x + 18}" y="${detailY}">${xmlEscape(`cyan=neighbor image draft, orange=blocked target draft, green=gate-ready target draft; source gaps=${group.sourceScopeGapBlocks.join(' ') || '-'}`)}</text>`,
      '</svg>',
    ].join('\n');
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const dryRunDir = path.resolve(frontendRoot, argValue('--dry-run-dir', defaultDryRunDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));
  const inputAidPath = path.resolve(
    frontendRoot,
    argValue('--input-aid', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-input-aid.json')),
  );
  const dryRunPath = path.resolve(
    frontendRoot,
    argValue('--dry-run', path.join(dryRunDir, 'daegu-seatmap-p1-boundary-first-draft-approval-dry-run.json')),
  );
  const draftPath = path.resolve(
    frontendRoot,
    argValue('--draft', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-image-coordinate-draft/daegu-p1-boundary-first-image-coordinate-draft.json')),
  );
  const neighborDraftPath = path.resolve(
    frontendRoot,
    argValue('--neighbor-draft', path.join(defaultNeighborDraftDir, 'daegu-seatmap-p1-paired-ownership-neighbor-image-draft.json')),
  );
  const templatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-operator-template.json')),
  );
  const officialImagePath = path.resolve(frontendRoot, DAEGU_SEATMAP_IMAGE.imagePath);

  const blockers = [];
  const warnings = [];
  const inputAid = await readJson(inputAidPath);
  const dryRun = await readJson(dryRunPath);
  const draft = await readJson(draftPath);
  const neighborDraft = await readOptionalJson(neighborDraftPath);
  const template = await readJson(templatePath);
  const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
  const inputAidRows = Array.isArray(inputAid.rows) ? inputAid.rows : [];
  const dryRunRows = Array.isArray(dryRun.rows) ? dryRun.rows : [];
  const draftRows = Array.isArray(draft.rows) ? draft.rows : [];
  const neighborDraftRows = Array.isArray(neighborDraft?.rows) ? neighborDraft.rows : [];
  const blocksByBlock = new Map(DAEGU_BLOCKS.map((block) => [block.block, block]));
  const templateBlocks = new Set(templateRows.map((row) => row.block).filter(Boolean));
  const inputAidByBlock = new Map(inputAidRows.map((row) => [row.target?.block, row]).filter(([block]) => block));
  const dryRunByBlock = new Map(dryRunRows.map((row) => [row.block, row]).filter(([block]) => block));
  const draftByBlock = new Map(draftRows.map((row) => [row.block, row]).filter(([block]) => block));
  const neighborDraftByBlock = new Map(neighborDraftRows.map((row) => [row.block, row]).filter(([block]) => block));

  if (inputAid.summary?.inputAidVersion !== INPUT_AID_VERSION) {
    blockers.push(`INPUT_AID_VERSION_MISMATCH:${inputAid.summary?.inputAidVersion ?? ''}`);
  }
  if (dryRun.summary?.dryRunVersion !== DRY_RUN_VERSION) {
    blockers.push(`DRY_RUN_VERSION_MISMATCH:${dryRun.summary?.dryRunVersion ?? ''}`);
  }
  if (draft.draftVersion !== DRAFT_VERSION) {
    blockers.push(`DRAFT_VERSION_MISMATCH:${draft.draftVersion ?? ''}`);
  }
  if (!neighborDraft) {
    warnings.push(`NEIGHBOR_IMAGE_DRAFT_MISSING:${path.relative(frontendRoot, neighborDraftPath)}`);
  } else if (neighborDraft.draftVersion !== NEIGHBOR_DRAFT_VERSION) {
    blockers.push(`NEIGHBOR_IMAGE_DRAFT_VERSION_MISMATCH:${neighborDraft.draftVersion ?? ''}`);
  }
  if (template.targetBatchId !== TARGET_BATCH_ID) {
    blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
  }
  if (inputAid.summary?.productionWriteAllowed !== false) blockers.push('INPUT_AID_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (dryRun.summary?.productionWriteAllowed !== false) blockers.push('DRY_RUN_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (draft.productionWriteAllowed !== false) blockers.push('DRAFT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (neighborDraft && neighborDraft.productionWriteAllowed !== false) blockers.push('NEIGHBOR_IMAGE_DRAFT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (!(await fileExists(officialImagePath))) blockers.push(`OFFICIAL_IMAGE_MISSING:${DAEGU_SEATMAP_IMAGE.imagePath}`);

  const groups = GROUP_SPECS.map((spec, index) => {
    const affectedBlockDetails = spec.affectedBlocks.map((block) => blockSummary(blocksByBlock.get(block))).filter(Boolean);
    const targetRows = spec.targetBlocks.map((block) => {
      const aidRow = inputAidByBlock.get(block);
      const dryRunRow = dryRunByBlock.get(block);
      const draftRow = draftByBlock.get(block);
      const gateReasons = Array.isArray(dryRunRow?.gateReasons) ? dryRunRow.gateReasons : [];
      return {
        block,
        blockId: blocksByBlock.get(block)?.id ?? aidRow?.target?.blockId ?? '',
        sourceInputPresent: templateBlocks.has(block),
        reviewType: aidRow?.target?.reviewType ?? '',
        currentPath: blockPath(blocksByBlock.get(block)),
        draftPath: dryRunRow?.draftPath ?? draftRow?.correctedPathDraft ?? '',
        draftLabelX: dryRunRow?.draftLabel?.[0] ?? draftRow?.correctedLabelX ?? '',
        draftLabelY: dryRunRow?.draftLabel?.[1] ?? draftRow?.correctedLabelY ?? '',
        dryRunReadyForSourceCopy: dryRunRow?.dryRunReadyForSourceCopy === true,
        gateReasons,
        nextAction: dryRunRow?.nextAction ?? aidRow?.target?.operatorAction ?? spec.operatorAction,
        overlayPath: draftRow?.overlayPath ?? dryRunRow?.draftOverlayPath ?? '',
      };
    });
    const neighborRows = spec.affectedBlocks
      .map((block) => neighborDraftByBlock.get(block))
      .filter(Boolean)
      .map((row) => ({
        block: row.block,
        blockId: row.blockId,
        draftSource: 'neighborImageDraft',
        draftPath: row.draftPath,
        draftLabelX: row.draftLabelX,
        draftLabelY: row.draftLabelY,
        expectedColorFamily: row.expectedColorFamily,
        pixelTraceStatus: row.pixelTraceStatus,
        pixelColorCoverageRatio: row.pixelColorCoverageRatio,
        componentBbox: row.componentBbox,
        mergedComponentCount: row.mergedComponentCount,
        pointCount: row.pointCount,
        riskFlags: row.riskFlags ?? [],
      }));
    const sourceScopeGapBlocks = spec.affectedBlocks.filter((block) => !templateBlocks.has(block));
    const dryRunReadyRows = targetRows.filter((row) => row.dryRunReadyForSourceCopy);
    const dryRunBlockedRows = targetRows.filter((row) => row.gateReasons.length > 0);
    const crop = mergeBounds([
      ...affectedBlockDetails.map((block) => block.currentPathBounds),
      ...affectedBlockDetails.map((block) => boundsForPoint(block.labelX, block.labelY)),
      ...targetRows.map((row) => boundsForPath(row.draftPath)),
      ...targetRows.map((row) => boundsForPoint(row.draftLabelX, row.draftLabelY)),
    ]);
    const svgFileName = `${String(index + 1).padStart(2, '0')}-${sanitizeFilePart(spec.groupId)}.svg`;
    const svgPath = path.join(outputDir, svgFileName);

    const group = {
      packageVersion: PACKAGE_VERSION,
      groupId: spec.groupId,
      title: spec.title,
      conflictClass: spec.conflictClass,
      targetBlocks: spec.targetBlocks,
      affectedBlocks: spec.affectedBlocks,
      sourceScopeGapBlocks,
      sourceScopeComplete: sourceScopeGapBlocks.length === 0,
      dryRunReadyBlocks: dryRunReadyRows.map((row) => row.block),
      dryRunBlockedBlocks: dryRunBlockedRows.map((row) => row.block),
      gateReasons: targetRows.flatMap((row) => row.gateReasons.map((reason) => `${row.block}:${reason}`)),
      operatorAction: spec.operatorAction,
      productionWriteAllowed: false,
      isolatedApprovalAllowed: false,
      sourceCopyAllowedNow: false,
      crop,
      svgOverlay: path.relative(frontendRoot, svgPath),
      affectedBlockDetails,
      draftRows: targetRows,
      neighborDraftRows: neighborRows,
    };
    return {
      ...group,
      labelHitMatrix: buildLabelHitMatrix(group),
    };
  });

  const missingInputAidTargetBlocks = GROUP_SPECS
    .flatMap((group) => group.targetBlocks)
    .filter((block) => !inputAidByBlock.has(block));
  const missingDryRunTargetBlocks = GROUP_SPECS
    .flatMap((group) => group.targetBlocks)
    .filter((block) => !dryRunByBlock.has(block));
  const missingDraftTargetBlocks = GROUP_SPECS
    .flatMap((group) => group.targetBlocks)
    .filter((block) => !draftByBlock.has(block));
  const missingNeighborDraftBlocks = neighborDraft
    ? [...new Set(GROUP_SPECS.flatMap((group) => group.affectedBlocks))]
      .filter((block) => !neighborDraftByBlock.has(block))
    : [];
  if (missingInputAidTargetBlocks.length > 0) blockers.push(`INPUT_AID_TARGET_ROWS_MISSING:${missingInputAidTargetBlocks.join(' ')}`);
  if (missingDryRunTargetBlocks.length > 0) blockers.push(`DRY_RUN_TARGET_ROWS_MISSING:${missingDryRunTargetBlocks.join(' ')}`);
  if (missingDraftTargetBlocks.length > 0) blockers.push(`DRAFT_TARGET_ROWS_MISSING:${missingDraftTargetBlocks.join(' ')}`);
  if (missingNeighborDraftBlocks.length > 0) warnings.push(`NEIGHBOR_IMAGE_DRAFT_ROWS_MISSING:${missingNeighborDraftBlocks.join(' ')}`);

  const sourceScopeGapGroups = groups.filter((group) => group.sourceScopeGapBlocks.length > 0);
  const draftReadyRows = groups.flatMap((group) => group.draftRows).filter((row) => row.dryRunReadyForSourceCopy);
  const draftBlockedRows = groups.flatMap((group) => group.draftRows).filter((row) => row.gateReasons.length > 0);
  const labelHitMatrixRows = groups.flatMap((group) => group.labelHitMatrix);
  const ownershipChangedRows = labelHitMatrixRows.filter((row) => row.ownershipChanged);
  const labelCapturedByOtherDraftRows = labelHitMatrixRows.filter((row) => row.labelCapturedByOtherDraft);
  const neighborImageDraftRows = groups.flatMap((group) => group.neighborDraftRows);
  const uniqueNeighborImageDraftBlocks = [...new Set(neighborImageDraftRows.map((row) => row.block))];

  if (groups.length !== EXPECTED.groupCount) warnings.push(`GROUP_COUNT_CHANGED:${groups.length}:${EXPECTED.groupCount}`);
  if (groups.flatMap((group) => group.draftRows).length !== EXPECTED.targetRows) {
    warnings.push(`TARGET_ROW_COUNT_CHANGED:${groups.flatMap((group) => group.draftRows).length}:${EXPECTED.targetRows}`);
  }
  if (sourceScopeGapGroups.length !== EXPECTED.sourceScopeGapGroups) {
    warnings.push(`SOURCE_SCOPE_GAP_GROUPS_CHANGED:${sourceScopeGapGroups.length}:${EXPECTED.sourceScopeGapGroups}`);
  }
  if (draftReadyRows.length !== EXPECTED.draftReadyRows) warnings.push(`DRAFT_READY_ROWS_CHANGED:${draftReadyRows.length}:${EXPECTED.draftReadyRows}`);
  if (draftBlockedRows.length !== EXPECTED.draftBlockedRows) warnings.push(`DRAFT_BLOCKED_ROWS_CHANGED:${draftBlockedRows.length}:${EXPECTED.draftBlockedRows}`);

  const status = blockers.length > 0 ? 'blocked' : 'requires-paired-operator-correction';
  const safetyContract = [
    'This P1 paired ownership correction package is read-only.',
    'It writes only reports under reports/stadium/daegu-p1-operator/daegu-seatmap-p1-paired-ownership-correction-package.',
    'It never writes operatorDecision into source input.',
    'It never copies draft paths into the operator template.',
    'It never modifies src/data/daeguSeatData.ts.',
    'A gate-ready draft row is still not production approval.',
    'Production write requires operatorDecision=APPROVED, correctedPath, correctedLabelX/Y, reviewer, reviewedAt, and all P1 gates.',
    'No external baseball data, web search, or automatic promotion is used.',
  ];

  const summary = {
    packageVersion: PACKAGE_VERSION,
    status,
    productionWriteAllowed: false,
    sourceOfTruth: false,
    sourceP1ReportDir: path.relative(frontendRoot, p1ReportDir),
    sourceInputAid: path.relative(frontendRoot, inputAidPath),
    sourceDraftApprovalDryRun: path.relative(frontendRoot, dryRunPath),
    sourceImageCoordinateDraft: path.relative(frontendRoot, draftPath),
    sourceNeighborImageDraft: neighborDraft ? path.relative(frontendRoot, neighborDraftPath) : '',
    sourceOperatorTemplate: path.relative(frontendRoot, templatePath),
    groupCount: groups.length,
    targetRows: groups.flatMap((group) => group.draftRows).length,
    sourceScopeGapGroups: sourceScopeGapGroups.length,
    sourceScopeGapBlocks: [...new Set(sourceScopeGapGroups.flatMap((group) => group.sourceScopeGapBlocks))],
    draftReadyRows: draftReadyRows.length,
    draftReadyBlocks: draftReadyRows.map((row) => row.block),
    draftBlockedRows: draftBlockedRows.length,
    draftBlockedBlocks: draftBlockedRows.map((row) => row.block),
    neighborImageDraftRows: neighborImageDraftRows.length,
    uniqueNeighborImageDraftBlocks,
    labelHitMatrixRows: labelHitMatrixRows.length,
    ownershipChangedRows: ownershipChangedRows.length,
    labelCapturedByOtherDraftRows: labelCapturedByOtherDraftRows.length,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    expected: EXPECTED,
    safetyContract,
    nextGateCommands: [
      'npm run stadium:daegu:p1-boundary-first-template-gate',
      'npm run stadium:daegu:p1-boundary-first-entry-preflight',
      'npm run stadium:daegu:p1-operator-prewrite-gate',
    ],
    groups,
  };

  await fs.mkdir(outputDir, { recursive: true });
  for (const group of groups) {
    await fs.writeFile(
      path.join(frontendRoot, group.svgOverlay),
      buildGroupSvg(group, path.join(frontendRoot, group.svgOverlay), officialImagePath),
      'utf8',
    );
  }

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-correction-package.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-correction-package.csv');
  const matrixCsvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-label-hit-matrix.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-correction-package.md');
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'groupId',
      'conflictClass',
      'targetBlocks',
      'affectedBlocks',
      'sourceScopeComplete',
      'sourceScopeGapBlocks',
      'dryRunReadyBlocks',
      'dryRunBlockedBlocks',
      'neighborImageDraftBlocks',
      'gateReasons',
      'isolatedApprovalAllowed',
      'sourceCopyAllowedNow',
      'svgOverlay',
      'operatorAction',
    ],
    ...groups.map((group) => [
      group.groupId,
      group.conflictClass,
      group.targetBlocks.join(' '),
      group.affectedBlocks.join(' '),
      group.sourceScopeComplete,
      group.sourceScopeGapBlocks.join(' '),
      group.dryRunReadyBlocks.join(' '),
      group.dryRunBlockedBlocks.join(' '),
      group.neighborDraftRows.map((row) => row.block).join(' '),
      group.gateReasons.join('; '),
      group.isolatedApprovalAllowed,
      group.sourceCopyAllowedNow,
      group.svgOverlay,
      group.operatorAction,
    ]),
  ]);
  await writeCsv(matrixCsvPath, [
    [
      'groupId',
      'labelBlock',
      'labelSource',
      'labelPoint',
      'currentTopHit',
      'currentHitStack',
      'draftAppliedTopHit',
      'draftAppliedHitStack',
      'draftTargetHits',
      'ownershipChanged',
      'labelCapturedByOtherDraft',
      'matrixRiskFlags',
    ],
    ...labelHitMatrixRows.map((row) => [
      row.groupId,
      row.labelBlock,
      row.labelSource,
      row.labelPoint.join(' '),
      row.currentTopHit,
      row.currentHitStack.join(' '),
      row.draftAppliedTopHit,
      row.draftAppliedHitStack.join(' '),
      row.draftTargetHits.join(' '),
      row.ownershipChanged,
      row.labelCapturedByOtherDraft,
      row.matrixRiskFlags.join(' '),
    ]),
  ]);

  const groupTable = markdownTable(
    ['group', 'target', 'affected', 'scope gaps', 'ready draft', 'blocked draft', 'neighbor image draft', 'gate reasons', 'overlay'],
    groups.map((group) => [
      `\`${group.groupId}\``,
      group.targetBlocks.map((block) => `\`${block}\``).join(' '),
      group.affectedBlocks.map((block) => `\`${block}\``).join(' '),
      group.sourceScopeGapBlocks.map((block) => `\`${block}\``).join(' ') || '-',
      group.dryRunReadyBlocks.map((block) => `\`${block}\``).join(' ') || '-',
      group.dryRunBlockedBlocks.map((block) => `\`${block}\``).join(' ') || '-',
      group.neighborDraftRows.map((row) => `\`${row.block}\``).join(' ') || '-',
      group.gateReasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
      `[\`${path.basename(group.svgOverlay)}\`](${path.relative(outputDir, path.join(frontendRoot, group.svgOverlay))})`,
    ]),
  );

  const targetRowTable = markdownTable(
    ['block', 'source row', 'dry-run ready', 'gate reasons', 'draft label', 'next action'],
    groups.flatMap((group) => group.draftRows.map((row) => [
      `\`${row.block}\``,
      String(row.sourceInputPresent),
      String(row.dryRunReadyForSourceCopy),
      row.gateReasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
      `${row.draftLabelX}, ${row.draftLabelY}`,
      row.nextAction,
    ])),
  );

  const labelHitMatrixTable = markdownTable(
    ['group', 'label', 'source', 'point', 'current top-hit', 'draft-applied top-hit', 'draft hits', 'risk flags'],
    labelHitMatrixRows.map((row) => [
      `\`${row.groupId}\``,
      `\`${row.labelBlock}\``,
      `\`${row.labelSource}\``,
      row.labelPoint.join(', '),
      `\`${row.currentTopHit}\``,
      `\`${row.draftAppliedTopHit}\``,
      row.draftTargetHits.map((block) => `\`${block}\``).join(' ') || '-',
      row.matrixRiskFlags.map((flag) => `\`${flag}\``).join('<br>') || '-',
    ]),
  );

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership Correction Package',
    '',
    `- package version: \`${PACKAGE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- source of truth: ${summary.sourceOfTruth}`,
    `- group count: ${summary.groupCount}`,
    `- source scope gap groups: ${summary.sourceScopeGapGroups}`,
    `- draft ready rows: ${summary.draftReadyRows} (${summary.draftReadyBlocks.map((block) => `\`${block}\``).join(' ') || '-'})`,
    `- draft blocked rows: ${summary.draftBlockedRows} (${summary.draftBlockedBlocks.map((block) => `\`${block}\``).join(' ') || '-'})`,
    `- neighbor image draft rows: ${summary.neighborImageDraftRows} (${summary.uniqueNeighborImageDraftBlocks.map((block) => `\`${block}\``).join(' ') || '-'})`,
    `- label hit matrix rows: ${summary.labelHitMatrixRows}`,
    `- ownership changed rows: ${summary.ownershipChangedRows}`,
    `- labels captured by other draft rows: ${summary.labelCapturedByOtherDraftRows}`,
    '',
    '## Safety',
    '',
    ...safetyContract.map((rule) => `- ${rule}`),
    '',
    '## Groups',
    '',
    groupTable,
    '',
    '## Target Rows',
    '',
    targetRowTable,
    '',
    '## Label Top-Hit Matrix',
    '',
    labelHitMatrixTable,
    '',
    '## Operator Rule',
    '',
    '- Do not approve `T1-1`, `T3-2`, or `V2` as isolated single-row corrections while the listed gate reasons remain.',
    '- `V1` and `V3` are gate-ready draft candidates, but source-copy should wait until the V split package is reviewed together.',
    '- Any neighbor currently missing from the boundary-first source scope must be handled by a paired correction workflow before production write.',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No structural blockers.',
    '',
    '## Warnings',
    '',
    summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    status,
    output: path.relative(frontendRoot, markdownPath),
    groupCount: groups.length,
    sourceScopeGapGroups: sourceScopeGapGroups.length,
    draftReadyRows: draftReadyRows.length,
    draftBlockedRows: draftBlockedRows.length,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipEntryPreflight = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const PREFLIGHT_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_ENTRY_PREFLIGHT_V1';
  const ENTRY_SHEET_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_ENTRY_SHEET_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const SOURCE_SCOPE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_SOURCE_SCOPE_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const EXPECTED = {
    groupCount: 3,
    groupTemplateRows: 16,
  };
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);

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

  const isBlank = (value) => String(value ?? '').trim() === '';

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const pathCommands = (pathData) => String(pathData ?? '').match(/[AaCcHhLlMmQqSsTtVvZz]/g) ?? [];

  const pathPoints = (pathData) => {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  };

  const validateCorrectedPathDraft = (row) => {
    const reasons = [];
    const decision = normalizeDecision(row.operatorDecision);
    const points = pathPoints(row.correctedPath);
    const commands = pathCommands(row.correctedPath);
    if (decision !== 'APPROVED') return { reasons, pointCount: 0 };

    if (isBlank(row.correctedPath)) reasons.push('CORRECTED_PATH_REQUIRED');
    if (commands.some((command) => !['M', 'm', 'L', 'l', 'Z', 'z'].includes(command))) {
      reasons.push('CORRECTED_PATH_UNSUPPORTED_COMMAND');
    }
    if (!commands.some((command) => command.toUpperCase() === 'M')) reasons.push('CORRECTED_PATH_MISSING_MOVE');
    if (!commands.some((command) => command.toUpperCase() === 'Z')) reasons.push('CORRECTED_PATH_NOT_CLOSED');
    if (points.length < 4) reasons.push('CORRECTED_PATH_REQUIRES_AT_LEAST_FOUR_POINTS');
    if (points.some(([x, y]) => x < 0 || y < 0 || x > 1707 || y > 2048)) reasons.push('CORRECTED_PATH_OUTSIDE_DAEGU_IMAGE_BOUNDS');
    if (!Number.isFinite(Number(row.correctedLabelX))) reasons.push('CORRECTED_LABEL_X_NOT_NUMERIC');
    if (!Number.isFinite(Number(row.correctedLabelY))) reasons.push('CORRECTED_LABEL_Y_NOT_NUMERIC');
    if (!row.reviewer || isBlank(row.reviewer)) reasons.push('REVIEWER_REQUIRED');
    if (!row.reviewedAt || Number.isNaN(Date.parse(row.reviewedAt))) reasons.push('REVIEWED_AT_NOT_PARSEABLE');

    return { reasons, pointCount: points.length };
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const requireReady = hasFlag('--require-ready');
  const entrySheetPath = path.resolve(
    frontendRoot,
    argValue('--entry-sheet', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-entry-sheet.json')),
  );
  const templatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );
  const sourceScopePath = path.resolve(
    frontendRoot,
    argValue('--source-scope', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json')),
  );

  const entrySheet = await readJson(entrySheetPath);
  const template = await readJson(templatePath);
  const sourceScope = await readJson(sourceScopePath);
  const entryRows = Array.isArray(entrySheet.rows) ? entrySheet.rows : [];
  const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
  const sourceRows = Array.isArray(sourceScope.rows) ? sourceScope.rows : [];
  const groups = Array.isArray(sourceScope.groups) ? sourceScope.groups : [];
  const entryRowsByTemplateRowId = new Map(entryRows.map((row) => [row.templateRowId, row]));
  const sourceRowsByTemplateRowId = new Map(sourceRows.map((row) => [row.templateRowId, row]));
  const blockers = [];
  const warnings = [];

  if (entrySheet.summary?.entrySheetVersion !== ENTRY_SHEET_VERSION) {
    blockers.push(`ENTRY_SHEET_VERSION_MISMATCH:${entrySheet.summary?.entrySheetVersion ?? ''}`);
  }
  if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  if (sourceScope.summary?.sourceScopeVersion !== SOURCE_SCOPE_VERSION) {
    blockers.push(`SOURCE_SCOPE_VERSION_MISMATCH:${sourceScope.summary?.sourceScopeVersion ?? ''}`);
  }
  if (entrySheet.summary?.targetBatchId !== TARGET_BATCH_ID) blockers.push(`ENTRY_SHEET_BATCH_MISMATCH:${entrySheet.summary?.targetBatchId ?? ''}`);
  if (template.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
  if (entrySheet.summary?.productionWriteAllowed !== false) blockers.push('ENTRY_SHEET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (entrySheet.summary?.writesSourceInput !== false) blockers.push('ENTRY_SHEET_WRITES_SOURCE_INPUT_NOT_FALSE');
  if (entrySheet.summary?.writesProductionData !== false) blockers.push('ENTRY_SHEET_WRITES_PRODUCTION_DATA_NOT_FALSE');
  if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (sourceScope.summary?.productionWriteAllowed !== false) blockers.push('SOURCE_SCOPE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if ((entrySheet.summary?.blockers ?? []).length > 0) blockers.push('ENTRY_SHEET_HAS_BLOCKERS');
  if (groups.length !== EXPECTED.groupCount) warnings.push(`PREFLIGHT_GROUP_COUNT_CHANGED:${groups.length}:${EXPECTED.groupCount}`);
  if (templateRows.length !== EXPECTED.groupTemplateRows) blockers.push(`PREFLIGHT_TEMPLATE_ROW_COUNT_MISMATCH:${templateRows.length}:${EXPECTED.groupTemplateRows}`);
  if (entryRows.length !== EXPECTED.groupTemplateRows) blockers.push(`PREFLIGHT_ENTRY_ROW_COUNT_MISMATCH:${entryRows.length}:${EXPECTED.groupTemplateRows}`);

  const rows = templateRows.map((templateRow) => {
    const entryRow = entryRowsByTemplateRowId.get(templateRow.templateRowId);
    const sourceRow = sourceRowsByTemplateRowId.get(templateRow.templateRowId);
    const decision = normalizeDecision(templateRow.operatorDecision);
    const reasons = [];
    const warningsForRow = [];
    const pathValidation = validateCorrectedPathDraft(templateRow);

    if (!entryRow) reasons.push('ENTRY_ROW_MISSING');
    if (!sourceRow) reasons.push('SOURCE_SCOPE_ROW_MISSING');
    if (!DECISION_OPTIONS.has(decision)) reasons.push('INVALID_OPERATOR_DECISION');
    if (!templateRow.templateRowId) reasons.push('TEMPLATE_ROW_ID_MISSING');
    if (!templateRow.blockId) reasons.push('BLOCK_ID_MISSING');
    if (entryRow && entryRow.block !== templateRow.block) reasons.push(`ENTRY_BLOCK_MISMATCH:${entryRow.block}:${templateRow.block}`);
    if (sourceRow && sourceRow.block !== templateRow.block) reasons.push(`SOURCE_SCOPE_BLOCK_MISMATCH:${sourceRow.block}:${templateRow.block}`);
    if (!templateRow.overlay) warningsForRow.push('OVERLAY_MISSING');
    if (decision === 'APPROVED') reasons.push(...pathValidation.reasons);
    if (decision !== 'APPROVED' && !isBlank(templateRow.correctedPath)) warningsForRow.push('CORRECTED_PATH_FILLED_FOR_NON_APPROVED_ROW');

    return {
      templateRowId: templateRow.templateRowId,
      groupId: templateRow.groupId,
      blockId: templateRow.blockId,
      block: templateRow.block,
      blockRole: templateRow.blockRole,
      decision,
      approved: decision === 'APPROVED',
      correctedPathPointCount: pathValidation.pointCount,
      reasons,
      warnings: warningsForRow,
      readyForTemplateGate: decision === 'APPROVED' && reasons.length === 0,
    };
  });

  const groupRows = groups.map((group) => {
    const rowsForGroup = rows.filter((row) => row.groupId === group.groupId);
    const approvedRows = rowsForGroup.filter((row) => row.approved);
    const groupReasons = [];
    if (rowsForGroup.length !== (group.affectedBlocks ?? []).length) {
      groupReasons.push(`GROUP_ROW_COUNT_MISMATCH:${rowsForGroup.length}:${(group.affectedBlocks ?? []).length}`);
    }
    if (approvedRows.length > 0 && approvedRows.length < rowsForGroup.length) {
      groupReasons.push(`GROUP_PARTIAL_APPROVAL_BLOCKED:${approvedRows.length}:${rowsForGroup.length}`);
    }
    return {
      groupId: group.groupId,
      targetBlocks: group.targetBlocks ?? [],
      affectedBlocks: group.affectedBlocks ?? [],
      approvedRows: approvedRows.length,
      totalRows: rowsForGroup.length,
      completeApproval: rowsForGroup.length > 0 && approvedRows.length === rowsForGroup.length,
      groupReasons,
    };
  });

  const invalidRows = rows.filter((row) => row.reasons.length > 0);
  const invalidGroups = groupRows.filter((group) => group.groupReasons.length > 0);
  const approvedRows = rows.filter((row) => row.approved);
  const rowsWaitingForOperator = rows.filter((row) => !row.approved);
  if (invalidRows.length > 0) blockers.push(`PREFLIGHT_INVALID_ROWS:${invalidRows.map((row) => row.templateRowId).join(' ')}`);
  if (invalidGroups.length > 0) blockers.push(`PREFLIGHT_INVALID_GROUPS:${invalidGroups.map((group) => group.groupId).join(' ')}`);
  if (requireReady && rowsWaitingForOperator.length > 0) {
    blockers.push(`PREFLIGHT_REQUIRES_OPERATOR_APPROVAL:${rowsWaitingForOperator.length}:${rows.length}`);
  }

  const completeApprovalGroups = groupRows.filter((group) => group.completeApproval);
  const status = blockers.length > 0
    ? 'blocked'
    : approvedRows.length === 0
      ? 'waiting-for-operator'
      : completeApprovalGroups.length === groupRows.length
        ? 'ready-for-template-gate'
        : 'waiting-for-remaining-groups';

  const summary = {
    preflightVersion: PREFLIGHT_VERSION,
    status,
    mode: requireReady ? 'require-ready' : 'report-only',
    targetBatchId: TARGET_BATCH_ID,
    entrySheet: path.relative(frontendRoot, entrySheetPath),
    operatorTemplate: path.relative(frontendRoot, templatePath),
    sourceScope: path.relative(frontendRoot, sourceScopePath),
    totalRows: rows.length,
    approvedRows: approvedRows.length,
    invalidRows: invalidRows.length,
    rowsWaitingForOperator: rowsWaitingForOperator.length,
    groupCount: groupRows.length,
    completeApprovalGroups: completeApprovalGroups.length,
    invalidGroups: invalidGroups.length,
    requireReady,
    productionWriteAllowed: false,
    writesSourceInput: false,
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
      'Report-only mode records waiting-for-operator without failing when no rows are approved.',
      'Partial group approval is blocked with GROUP_PARTIAL_APPROVAL_BLOCKED.',
      'It never writes source input.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'Full geometry acceptance remains owned by npm run stadium:daegu:p1-paired-ownership-template-gate.',
    ],
    groups: groupRows,
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-entry-preflight.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-entry-preflight.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-entry-preflight.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    ['templateRowId', 'groupId', 'block', 'decision', 'approved', 'readyForTemplateGate', 'reasons', 'warnings', 'correctedPathPointCount'],
    ...rows.map((row) => [
      row.templateRowId,
      row.groupId,
      row.block,
      row.decision,
      row.approved,
      row.readyForTemplateGate,
      row.reasons.join(' '),
      row.warnings.join(' '),
      row.correctedPathPointCount,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership Entry Preflight',
    '',
    `- preflight version: \`${PREFLIGHT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- mode: \`${summary.mode}\``,
    `- approved rows: ${summary.approvedRows}/${summary.totalRows}`,
    `- invalid rows: ${summary.invalidRows}`,
    `- complete approval groups: ${summary.completeApprovalGroups}/${summary.groupCount}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Groups',
    '',
    markdownTable(
      ['group', 'approved', 'total', 'complete', 'reasons'],
      groupRows.map((group) => [
        `\`${group.groupId}\``,
        group.approvedRows,
        group.totalRows,
        String(group.completeApproval),
        group.groupReasons.map((reason) => `\`${reason}\``).join(' ') || '-',
      ]),
    ),
    '',
    '## Rows',
    '',
    markdownTable(
      ['template row', 'decision', 'ready', 'reasons', 'warnings'],
      rows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.decision}\``,
        String(row.readyForTemplateGate),
        row.reasons.map((reason) => `\`${reason}\``).join(' ') || '-',
        row.warnings.map((warning) => `\`${warning}\``).join(' ') || '-',
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

  console.log(JSON.stringify({
    status: summary.status,
    mode: summary.mode,
    output: path.relative(frontendRoot, markdownPath),
    approvedRows: summary.approvedRows,
    invalidRows: summary.invalidRows,
    completeApprovalGroups: `${summary.completeApprovalGroups}/${summary.groupCount}`,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipEntrySheet = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const ENTRY_SHEET_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_ENTRY_SHEET_V1';
  const SOURCE_SCOPE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_SOURCE_SCOPE_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const EXPECTED = {
    groupCount: 3,
    groupTemplateRows: 16,
    uniqueAffectedBlocks: 12,
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

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const isBlank = (value) => String(value ?? '').trim() === '';

  const pathPointCount = (pathData) => Math.floor((String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g) ?? []).length / 2);

  const missingApprovalFieldsFor = (row) => {
    const missing = [];
    if (normalizeDecision(row?.operatorDecision) !== 'APPROVED') missing.push('operatorDecision=APPROVED');
    if (isBlank(row?.correctedPath)) missing.push('correctedPath');
    if (isBlank(row?.correctedLabelX)) missing.push('correctedLabelX');
    if (isBlank(row?.correctedLabelY)) missing.push('correctedLabelY');
    if (isBlank(row?.reviewer)) missing.push('reviewer');
    if (isBlank(row?.reviewedAt)) missing.push('reviewedAt');
    return missing;
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const sourceScopePath = path.resolve(
    frontendRoot,
    argValue('--source-scope', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json')),
  );
  const templatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );

  const sourceScope = await readJson(sourceScopePath);
  const template = await readJson(templatePath);
  const scopeRows = Array.isArray(sourceScope.rows) ? sourceScope.rows : [];
  const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
  const groups = Array.isArray(sourceScope.groups) ? sourceScope.groups : [];
  const scopeRowsByTemplateRowId = new Map(scopeRows.map((row) => [row.templateRowId, row]));
  const templateRowsByTemplateRowId = new Map(templateRows.map((row) => [row.templateRowId, row]));
  const blockers = [];
  const warnings = [];

  if (sourceScope.summary?.sourceScopeVersion !== SOURCE_SCOPE_VERSION) {
    blockers.push(`SOURCE_SCOPE_VERSION_MISMATCH:${sourceScope.summary?.sourceScopeVersion ?? ''}`);
  }
  if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  if (template.sourceScopeVersion !== SOURCE_SCOPE_VERSION) blockers.push(`TEMPLATE_SOURCE_SCOPE_VERSION_MISMATCH:${template.sourceScopeVersion ?? ''}`);
  if (template.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
  if (template.templateOnly !== true) blockers.push('TEMPLATE_ONLY_NOT_TRUE');
  if (sourceScope.summary?.productionWriteAllowed !== false) blockers.push('SOURCE_SCOPE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (groups.length !== EXPECTED.groupCount) warnings.push(`ENTRY_GROUP_COUNT_CHANGED:${groups.length}:${EXPECTED.groupCount}`);
  if (templateRows.length !== EXPECTED.groupTemplateRows) blockers.push(`ENTRY_TEMPLATE_ROW_COUNT_MISMATCH:${templateRows.length}:${EXPECTED.groupTemplateRows}`);
  if (sourceScope.summary?.uniqueAffectedBlocks !== EXPECTED.uniqueAffectedBlocks) {
    warnings.push(`ENTRY_UNIQUE_AFFECTED_BLOCKS_CHANGED:${sourceScope.summary?.uniqueAffectedBlocks ?? ''}:${EXPECTED.uniqueAffectedBlocks}`);
  }

  const rows = await Promise.all(templateRows.map(async (templateRow, index) => {
    const sourceRow = scopeRowsByTemplateRowId.get(templateRow.templateRowId);
    const group = groups.find((candidate) => candidate.groupId === templateRow.groupId);
    const overlay = templateRow.overlay || sourceRow?.overlay || group?.overlay || '';
    const overlayExists = overlay ? await fileExists(path.resolve(frontendRoot, overlay)) : false;
    const missingApprovalFields = missingApprovalFieldsFor(templateRow);
    const correctedPathPointCount = pathPointCount(templateRow.correctedPath);
    const currentPathPointCount = Number(templateRow.currentPathPointCount ?? sourceRow?.currentPathPointCount ?? 0);
    const currentLabelPoint = `${templateRow.currentLabelX ?? sourceRow?.currentLabelX ?? ''},${templateRow.currentLabelY ?? sourceRow?.currentLabelY ?? ''}`;
    const currentGroupRows = templateRows.filter((row) => row.groupId === templateRow.groupId);
    const currentGroupApprovedRows = currentGroupRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');

    if (!sourceRow) blockers.push(`ENTRY_SOURCE_SCOPE_ROW_MISSING:${templateRow.templateRowId}`);
    if (!templateRow.templateRowId) blockers.push(`ENTRY_TEMPLATE_ROW_ID_MISSING:${index}`);
    if (!templateRow.blockId) blockers.push(`ENTRY_BLOCK_ID_MISSING:${templateRow.templateRowId ?? index}`);
    if (!overlay) blockers.push(`ENTRY_OVERLAY_MISSING:${templateRow.templateRowId}`);
    if (overlay && !overlayExists) warnings.push(`ENTRY_OVERLAY_FILE_MISSING:${templateRow.templateRowId}`);
    if (sourceRow && sourceRow.block !== templateRow.block) {
      blockers.push(`ENTRY_SOURCE_SCOPE_BLOCK_MISMATCH:${templateRow.templateRowId}:${templateRow.block}:${sourceRow.block}`);
    }

    return {
      entrySheetVersion: ENTRY_SHEET_VERSION,
      rowNumber: index + 1,
      templateRowId: templateRow.templateRowId,
      templateJsonPointer: `/corrections/${index}`,
      editableTarget: `corrections[${index}]`,
      groupId: templateRow.groupId,
      groupTitle: templateRow.groupTitle ?? group?.title ?? '',
      conflictClass: templateRow.conflictClass ?? group?.conflictClass ?? '',
      blockId: templateRow.blockId,
      block: templateRow.block,
      blockRole: templateRow.blockRole,
      name: templateRow.name,
      category: templateRow.category,
      traceStatus: templateRow.traceStatus,
      traceMethod: templateRow.traceMethod,
      sourceScopeGap: Boolean(templateRow.sourceScopeGap),
      currentPath: templateRow.currentPath,
      currentPathPointCount,
      currentLabelPoint,
      currentLabelX: templateRow.currentLabelX,
      currentLabelY: templateRow.currentLabelY,
      groupTargetBlocks: templateRow.groupTargetBlocks ?? group?.targetBlocks?.join(' ') ?? '',
      groupAffectedBlocks: templateRow.groupAffectedBlocks ?? group?.affectedBlocks?.join(' ') ?? '',
      groupApprovedRows: currentGroupApprovedRows.length,
      groupTotalRows: currentGroupRows.length,
      overlay,
      overlayExists,
      operatorAction: sourceRow?.operatorAction ?? group?.operatorAction ?? '',
      operatorDecision: normalizeDecision(templateRow.operatorDecision),
      correctedPathFilled: !isBlank(templateRow.correctedPath),
      correctedPathPointCount,
      correctedLabelX: templateRow.correctedLabelX,
      correctedLabelY: templateRow.correctedLabelY,
      reviewer: templateRow.reviewer,
      reviewedAt: templateRow.reviewedAt,
      operatorNoteFilled: !isBlank(templateRow.operatorNote),
      editableFields: EDITABLE_FIELDS,
      requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
      missingApprovalFields,
      nextOperatorAction: missingApprovalFields.length === 0
        ? 'Run npm run stadium:daegu:p1-paired-ownership-template-gate.'
        : `Fill ${missingApprovalFields.join(', ')} in ${templateRow.templateRowId}.`,
      sourceOfTruth: 'operator-template-editable-fields',
    };
  }));

  const duplicateTemplateRowIds = rows
    .map((row) => row.templateRowId)
    .filter((rowId, index, values) => values.indexOf(rowId) !== index);
  if (duplicateTemplateRowIds.length > 0) blockers.push(`ENTRY_DUPLICATE_TEMPLATE_ROW_ID:${[...new Set(duplicateTemplateRowIds)].join(' ')}`);

  const rowsReadyForGate = rows.filter((row) => row.missingApprovalFields.length === 0);
  const rowsWaitingForOperator = rows.filter((row) => row.missingApprovalFields.length > 0);
  const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
  const status = blockers.length > 0
    ? 'blocked'
    : rowsWaitingForOperator.length === 0
      ? 'ready-for-template-gate'
      : 'waiting-for-operator-entry';

  const summary = {
    entrySheetVersion: ENTRY_SHEET_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    sourceScope: path.relative(frontendRoot, sourceScopePath),
    operatorTemplate: path.relative(frontendRoot, templatePath),
    groupCount: groups.length,
    totalRows: rows.length,
    approvedRows: approvedRows.length,
    rowsReadyForGate: rowsReadyForGate.length,
    rowsWaitingForOperator: rowsWaitingForOperator.length,
    productionWriteAllowed: false,
    writesSourceInput: false,
    writesOperatorDecision: false,
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
      'This entry sheet is read-only.',
      'It lists all 15 paired ownership operator-template rows.',
      'It preserves operator-filled editable fields by reading the current paired ownership operator template.',
      'It never writes source input.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'Operator may edit only operatorDecision, correctedPath, correctedLabelX, correctedLabelY, reviewer, reviewedAt, and operatorNote.',
      'Run the paired ownership template gate after all rows in a group are filled.',
    ],
    editableFieldOrder: EDITABLE_FIELDS,
    groups: groups.map((group) => ({
      groupId: group.groupId,
      title: group.title,
      targetBlocks: group.targetBlocks,
      affectedBlocks: group.affectedBlocks,
      overlay: group.overlay,
      operatorAction: group.operatorAction,
    })),
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-entry-sheet.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-entry-sheet.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-entry-sheet.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'rowNumber',
      'templateRowId',
      'groupId',
      'blockRole',
      'block',
      'traceStatus',
      'currentLabelPoint',
      'currentPathPointCount',
      'operatorDecision',
      'correctedPathFilled',
      'correctedPathPointCount',
      'missingApprovalFields',
      'overlay',
      'nextOperatorAction',
    ],
    ...rows.map((row) => [
      row.rowNumber,
      row.templateRowId,
      row.groupId,
      row.blockRole,
      row.block,
      row.traceStatus,
      row.currentLabelPoint,
      row.currentPathPointCount,
      row.operatorDecision,
      row.correctedPathFilled,
      row.correctedPathPointCount,
      row.missingApprovalFields.join(' '),
      row.overlay,
      row.nextOperatorAction,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership Entry Sheet',
    '',
    `- entry sheet version: \`${ENTRY_SHEET_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- groups: ${summary.groupCount}`,
    `- rows: ${summary.totalRows}`,
    `- rows waiting for operator: ${summary.rowsWaitingForOperator}`,
    `- rows ready for gate: ${summary.rowsReadyForGate}`,
    `- operator template: \`${summary.operatorTemplate}\``,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Groups',
    '',
    markdownTable(
      ['group', 'target', 'affected', 'overlay', 'operator action'],
      report.groups.map((group) => [
        `\`${group.groupId}\``,
        group.targetBlocks?.map((block) => `\`${block}\``).join(' ') || '-',
        group.affectedBlocks?.map((block) => `\`${block}\``).join(' ') || '-',
        group.overlay ? `\`${group.overlay}\`` : '-',
        group.operatorAction,
      ]),
    ),
    '',
    '## Entry Rows',
    '',
    markdownTable(
      ['row', 'template row', 'role', 'block', 'label', 'points', 'decision', 'missing input', 'next action'],
      rows.map((row) => [
        row.rowNumber,
        `\`${row.templateRowId}\``,
        `\`${row.blockRole}\``,
        `\`${row.block}\``,
        row.currentLabelPoint,
        row.currentPathPointCount,
        `\`${row.operatorDecision}\``,
        row.missingApprovalFields.map((field) => `\`${field}\``).join(' ') || '-',
        row.nextOperatorAction,
      ]),
    ),
    '',
    '## Editable Fields',
    '',
    `Only edit: ${EDITABLE_FIELDS.map((field) => `\`${field}\``).join(', ')}.`,
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

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    groups: summary.groupCount,
    rows: summary.totalRows,
    rowsWaitingForOperator: summary.rowsWaitingForOperator,
    rowsReadyForGate: summary.rowsReadyForGate,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipGateRegression = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultOutputDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-gate-regression');

  const REGRESSION_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_GATE_REGRESSION_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const SOURCE_SCOPE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_SOURCE_SCOPE_V1';
  const CASES = [
    'waiting-for-operator',
    'partial-approval',
    'current-path-copy',
    'label-outside',
    'label-top-hit-mismatch',
    'other-label-capture',
    'group-overlap',
    'missing-approved-fields',
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

  const byTemplateRowId = (template) => new Map(template.corrections.map((row) => [row.templateRowId, row]));

  const squarePath = (x, y, radius = 10) => (
    `M ${Math.round(x - radius)} ${Math.round(y - radius)} L ${Math.round(x + radius)} ${Math.round(y - radius)} L ${Math.round(x + radius)} ${Math.round(y + radius)} L ${Math.round(x - radius)} ${Math.round(y + radius)} Z`
  );

  const approveRow = (row, {
    correctedPath = squarePath(Number(row.currentLabelX), Number(row.currentLabelY), 10),
    correctedLabelX = row.currentLabelX,
    correctedLabelY = row.currentLabelY,
    reviewer = 'REGRESSION_FIXTURE',
    reviewedAt = '2026-05-16T00:00:00.000Z',
    operatorNote = 'Regression fixture only; do not source-copy.',
  } = {}) => {
    row.operatorDecision = 'APPROVED';
    row.correctedPath = correctedPath;
    row.correctedLabelX = String(correctedLabelX);
    row.correctedLabelY = String(correctedLabelY);
    row.reviewer = reviewer;
    row.reviewedAt = reviewedAt;
    row.operatorNote = operatorNote;
  };

  const approveGroupWithSquares = (template, groupId) => {
    template.corrections
      .filter((row) => row.groupId === groupId)
      .forEach((row) => approveRow(row));
  };

  const cloneJson = (value) => JSON.parse(JSON.stringify(value));

  const clearOperatorEditableFields = (template) => {
    template.corrections.forEach((row) => {
      row.operatorDecision = 'PENDING';
      row.correctedPath = '';
      row.correctedLabelX = '';
      row.correctedLabelY = '';
      row.reviewer = '';
      row.reviewedAt = '';
      row.operatorNote = '';
    });
    return template;
  };

  const runGate = (caseDir, templatePath, sourceScopePath) => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        path.join(scriptDir, 'daegu-seatmap-p1-paired-ownership.mjs'),
        'p1-paired-ownership-template-gate',
        '--template',
        templatePath,
        '--source-scope',
        sourceScopePath,
        '--output-dir',
        caseDir,
      ],
      {
        cwd: frontendRoot,
        encoding: 'utf8',
      },
    );
    return {
      status: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));
  const sourceTemplatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );
  const sourceScopePath = path.resolve(
    frontendRoot,
    argValue('--source-scope', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json')),
  );

  const blockers = [];
  const warnings = [];
  const sourceTemplate = await readJson(sourceTemplatePath);
  const sourceScope = await readJson(sourceScopePath);

  if (sourceTemplate.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${sourceTemplate.templateVersion ?? ''}`);
  if (sourceScope.summary?.sourceScopeVersion !== SOURCE_SCOPE_VERSION) {
    blockers.push(`SOURCE_SCOPE_VERSION_MISMATCH:${sourceScope.summary?.sourceScopeVersion ?? ''}`);
  }
  if (sourceTemplate.productionWriteAllowed !== false) blockers.push('SOURCE_TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (sourceScope.summary?.productionWriteAllowed !== false) blockers.push('SOURCE_SCOPE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

  const makeCaseTemplate = (caseId) => {
    const template = clearOperatorEditableFields(cloneJson(sourceTemplate));
    const rows = byTemplateRowId(template);

    if (caseId === 'waiting-for-operator') return template;

    if (caseId === 'partial-approval') {
      approveRow(rows.get('P1_T1_TABLE_OWNERSHIP:T1-1'));
      return template;
    }

    if (caseId === 'current-path-copy') {
      const row = rows.get('P1_T1_TABLE_OWNERSHIP:T1-1');
      approveRow(row, { correctedPath: row.currentPath });
      return template;
    }

    if (caseId === 'label-outside') {
      const row = rows.get('P1_T1_TABLE_OWNERSHIP:T1-1');
      approveRow(row, {
        correctedPath: squarePath(Number(row.currentLabelX), Number(row.currentLabelY), 10),
        correctedLabelX: Number(row.currentLabelX) + 70,
        correctedLabelY: Number(row.currentLabelY) + 70,
      });
      return template;
    }

    if (caseId === 'label-top-hit-mismatch') {
      const row = rows.get('P1_T1_TABLE_OWNERSHIP:T1-1');
      approveRow(row, {
        correctedPath: 'M 980 900 L 1070 900 L 1070 980 L 980 980 Z',
        correctedLabelX: 1020.3,
        correctedLabelY: 941.3,
      });
      return template;
    }

    if (caseId === 'other-label-capture') {
      const row = rows.get('P1_V_CENTER_TABLE_SPLIT:V2');
      approveRow(row, {
        correctedPath: 'M 930 1030 L 970 1030 L 970 1065 L 930 1065 Z',
        correctedLabelX: 948,
        correctedLabelY: 1048,
      });
      return template;
    }

    if (caseId === 'group-overlap') {
      approveGroupWithSquares(template, 'P1_T1_TABLE_OWNERSHIP');
      const overlapPath = 'M 990 1010 L 1065 1010 L 1065 1060 L 990 1060 Z';
      approveRow(rows.get('P1_T1_TABLE_OWNERSHIP:T1-1'), {
        correctedPath: overlapPath,
        correctedLabelX: 1030,
        correctedLabelY: 1030,
      });
      approveRow(rows.get('P1_T1_TABLE_OWNERSHIP:T1-2'), {
        correctedPath: overlapPath,
        correctedLabelX: 1038,
        correctedLabelY: 1037,
      });
      return template;
    }

    if (caseId === 'missing-approved-fields') {
      const row = rows.get('P1_T1_TABLE_OWNERSHIP:T1-1');
      row.operatorDecision = 'APPROVED';
      row.operatorNote = 'Regression fixture with missing approval fields.';
      return template;
    }

    throw new Error(`Unknown regression case: ${caseId}`);
  };

  await fs.mkdir(outputDir, { recursive: true });

  const caseResults = [];
  for (const caseId of CASES) {
    const caseDir = path.join(outputDir, caseId);
    await fs.mkdir(caseDir, { recursive: true });
    const fixtureTemplate = makeCaseTemplate(caseId);
    const fixtureTemplatePath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json');
    const fixtureSourceScopePath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json');
    await fs.writeFile(fixtureTemplatePath, `${JSON.stringify(fixtureTemplate, null, 2)}\n`, 'utf8');
    await fs.writeFile(fixtureSourceScopePath, `${JSON.stringify(sourceScope, null, 2)}\n`, 'utf8');

    const command = runGate(caseDir, fixtureTemplatePath, fixtureSourceScopePath);
    const gateReportPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-template-gate.json');
    const gateReport = await readJson(gateReportPath);
    const reasons = [
      ...(gateReport.summary?.blockers ?? []),
      ...(gateReport.groups ?? []).flatMap((group) => group.groupReasons ?? []),
      ...(gateReport.rows ?? []).flatMap((row) => row.reasons ?? []),
    ];
    caseResults.push({
      caseId,
      commandExitCode: command.status,
      gateStatus: gateReport.summary?.status ?? '',
      approvedRows: gateReport.summary?.approvedRows ?? 0,
      invalidRows: gateReport.summary?.invalidRows ?? 0,
      completeApprovalGroups: gateReport.summary?.completeApprovalGroups ?? 0,
      blockers: gateReport.summary?.blockers ?? [],
      warnings: gateReport.summary?.warnings ?? [],
      reasons,
      template: path.relative(frontendRoot, fixtureTemplatePath),
      report: path.relative(frontendRoot, gateReportPath),
    });
  }

  const expectedCaseContracts = {
    'waiting-for-operator': ['status:waiting-for-operator', 'warning:PAIRED_OWNERSHIP_TEMPLATE_HAS_NO_APPROVED_ROWS'],
    'partial-approval': ['status:blocked', 'GROUP_PARTIAL_APPROVAL_BLOCKED'],
    'current-path-copy': ['status:blocked', 'CORRECTED_PATH_REUSES_CURRENT_PATH'],
    'label-outside': ['status:blocked', 'CORRECTED_LABEL_OUTSIDE_PATH'],
    'label-top-hit-mismatch': ['status:blocked', 'GROUP_CORRECTED_LABEL_TOP_HIT_MISMATCH'],
    'other-label-capture': ['status:blocked', 'GROUP_CORRECTED_PATH_CAPTURES_OTHER_LABEL'],
    'group-overlap': ['status:blocked', 'GROUP_CORRECTED_PATH_OVERLAP'],
    'missing-approved-fields': ['status:blocked', 'APPROVED_ROW_MISSING_FIELDS'],
  };

  caseResults.forEach((result) => {
    const expected = expectedCaseContracts[result.caseId] ?? [];
    expected.forEach((contract) => {
      if (contract.startsWith('status:')) {
        const expectedStatus = contract.slice('status:'.length);
        if (result.gateStatus !== expectedStatus) {
          blockers.push(`REGRESSION_STATUS_MISMATCH:${result.caseId}:${result.gateStatus}:${expectedStatus}`);
        }
        return;
      }
      if (contract.startsWith('warning:')) {
        const expectedWarning = contract.slice('warning:'.length);
        if (!result.warnings.includes(expectedWarning)) {
          blockers.push(`REGRESSION_WARNING_MISSING:${result.caseId}:${expectedWarning}`);
        }
        return;
      }
      if (!result.reasons.some((reason) => String(reason).includes(contract))) {
        blockers.push(`REGRESSION_REASON_MISSING:${result.caseId}:${contract}`);
      }
    });
  });

  const summary = {
    regressionVersion: REGRESSION_VERSION,
    status: blockers.length > 0 ? 'blocked' : 'passed',
    sourceTemplate: path.relative(frontendRoot, sourceTemplatePath),
    sourceScope: path.relative(frontendRoot, sourceScopePath),
    totalCases: caseResults.length,
    passedCases: blockers.length > 0 ? 0 : caseResults.length,
    productionWriteAllowed: false,
    writesSourceInput: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    expectedCaseContracts,
    safetyContract: [
      'This regression script writes only fixture/report files under reports/stadium/daegu-p1-paired-ownership-gate-regression.',
      'It never writes the production paired ownership operator template.',
      'It never writes source input.',
      'It never modifies src/data/daeguSeatData.ts.',
      'Fixture approvals are synthetic and must not be copied into operator input.',
    ],
    cases: caseResults,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-gate-regression.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-gate-regression.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-gate-regression.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    ['caseId', 'gateStatus', 'approvedRows', 'invalidRows', 'completeApprovalGroups', 'reasons', 'report'],
    ...caseResults.map((result) => [
      result.caseId,
      result.gateStatus,
      result.approvedRows,
      result.invalidRows,
      result.completeApprovalGroups,
      result.reasons.join('; '),
      result.report,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership Gate Regression',
    '',
    `- regression version: \`${REGRESSION_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- total cases: ${summary.totalCases}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Cases',
    '',
    markdownTable(
      ['case', 'status', 'approved', 'invalid', 'complete groups', 'expected reasons', 'report'],
      caseResults.map((result) => [
        `\`${result.caseId}\``,
        `\`${result.gateStatus}\``,
        result.approvedRows,
        result.invalidRows,
        result.completeApprovalGroups,
        result.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
        `[\`json\`](${path.relative(outputDir, path.join(frontendRoot, result.report))})`,
      ]),
    ),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    totalCases: summary.totalCases,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipNeighborApprovalDryRun = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultOutputDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-neighbor-approval-dry-run');

  const DRY_RUN_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_NEIGHBOR_APPROVAL_DRY_RUN_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const SOURCE_SCOPE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_SOURCE_SCOPE_V1';
  const GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_TEMPLATE_GATE_V1';
  const EXPECTED = {
    groupCount: 3,
    groupTemplateRows: 16,
    uniqueAffectedBlocks: 12,
    neighborImageDraftRows: 16,
  };

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
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

  const cloneJson = (value) => JSON.parse(JSON.stringify(value));

  const runTemplateGate = (outputDir, templatePath, sourceScopePath) => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        path.join(scriptDir, 'daegu-seatmap-p1-paired-ownership.mjs'),
        'p1-paired-ownership-template-gate',
        '--template',
        templatePath,
        '--source-scope',
        sourceScopePath,
        '--output-dir',
        outputDir,
      ],
      {
        cwd: frontendRoot,
        encoding: 'utf8',
      },
    );
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));
  const sourceTemplatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );
  const sourceScopePath = path.resolve(
    frontendRoot,
    argValue('--source-scope', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json')),
  );

  const blockers = [];
  const warnings = [];
  const sourceTemplate = await readJson(sourceTemplatePath);
  const sourceScope = await readJson(sourceScopePath);
  const templateRows = Array.isArray(sourceTemplate.corrections) ? sourceTemplate.corrections : [];
  const sourceRows = Array.isArray(sourceScope.rows) ? sourceScope.rows : [];

  if (sourceTemplate.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${sourceTemplate.templateVersion ?? ''}`);
  if (sourceScope.summary?.sourceScopeVersion !== SOURCE_SCOPE_VERSION) {
    blockers.push(`SOURCE_SCOPE_VERSION_MISMATCH:${sourceScope.summary?.sourceScopeVersion ?? ''}`);
  }
  if (sourceTemplate.productionWriteAllowed !== false) blockers.push('SOURCE_TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (sourceScope.summary?.productionWriteAllowed !== false) blockers.push('SOURCE_SCOPE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (templateRows.length !== EXPECTED.groupTemplateRows) blockers.push(`TEMPLATE_ROW_COUNT_MISMATCH:${templateRows.length}:${EXPECTED.groupTemplateRows}`);
  if (sourceScope.summary?.groupTemplateRows !== EXPECTED.groupTemplateRows) {
    blockers.push(`SOURCE_SCOPE_GROUP_TEMPLATE_ROWS_MISMATCH:${sourceScope.summary?.groupTemplateRows ?? ''}:${EXPECTED.groupTemplateRows}`);
  }
  if (sourceScope.summary?.uniqueAffectedBlocks !== EXPECTED.uniqueAffectedBlocks) {
    blockers.push(`SOURCE_SCOPE_UNIQUE_AFFECTED_BLOCKS_MISMATCH:${sourceScope.summary?.uniqueAffectedBlocks ?? ''}:${EXPECTED.uniqueAffectedBlocks}`);
  }
  if (sourceScope.summary?.neighborImageDraftRows !== EXPECTED.neighborImageDraftRows) {
    blockers.push(`SOURCE_SCOPE_NEIGHBOR_IMAGE_DRAFT_ROWS_MISMATCH:${sourceScope.summary?.neighborImageDraftRows ?? ''}:${EXPECTED.neighborImageDraftRows}`);
  }

  const syntheticTemplate = cloneJson(sourceTemplate);
  const filledRows = [];
  syntheticTemplate.corrections.forEach((row) => {
    if (!row.neighborImageDraftPath || row.neighborImageDraftLabelX === '' || row.neighborImageDraftLabelY === '') {
      blockers.push(`NEIGHBOR_IMAGE_DRAFT_FIELDS_MISSING:${row.templateRowId}`);
      return;
    }
    row.operatorDecision = 'APPROVED';
    row.correctedPath = row.neighborImageDraftPath;
    row.correctedLabelX = String(row.neighborImageDraftLabelX);
    row.correctedLabelY = String(row.neighborImageDraftLabelY);
    row.reviewer = 'IMAGE_DRAFT_DRY_RUN';
    row.reviewedAt = '2026-05-17T00:00:00.000Z';
    row.operatorNote = 'Synthetic neighbor image draft approval dry-run only. Do not source-copy without real operator approval.';
    filledRows.push({
      templateRowId: row.templateRowId,
      groupId: row.groupId,
      block: row.block,
      neighborImageDraftCoverage: row.neighborImageDraftCoverage,
    });
  });

  await fs.mkdir(outputDir, { recursive: true });
  const syntheticTemplatePath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-neighbor-approval-template.fixture.json');
  await writeJson(syntheticTemplatePath, syntheticTemplate);

  const gateOutputDir = path.join(outputDir, 'template-gate');
  const gateCommand = blockers.length === 0
    ? runTemplateGate(gateOutputDir, syntheticTemplatePath, sourceScopePath)
    : { exitCode: 1, stdout: '', stderr: 'Skipped because dry-run preconditions failed.' };
  const gateReportPath = path.join(gateOutputDir, 'daegu-seatmap-p1-paired-ownership-template-gate.json');
  const gateReport = blockers.length === 0 ? await readJson(gateReportPath) : null;

  if (gateReport?.summary?.gateVersion !== GATE_VERSION) {
    blockers.push(`GATE_VERSION_MISMATCH:${gateReport?.summary?.gateVersion ?? ''}`);
  }
  if (gateReport?.summary?.status !== 'ready-for-source-copy') {
    blockers.push(`NEIGHBOR_APPROVAL_DRY_RUN_GATE_NOT_READY:${gateReport?.summary?.status ?? 'missing'}`);
  }
  if (gateReport?.summary?.approvedRows !== EXPECTED.groupTemplateRows) {
    blockers.push(`NEIGHBOR_APPROVAL_DRY_RUN_APPROVED_ROWS_MISMATCH:${gateReport?.summary?.approvedRows ?? ''}:${EXPECTED.groupTemplateRows}`);
  }
  if (gateReport?.summary?.invalidRows !== 0) {
    blockers.push(`NEIGHBOR_APPROVAL_DRY_RUN_INVALID_ROWS:${gateReport?.summary?.invalidRows ?? ''}`);
  }
  if (gateReport?.summary?.completeApprovalGroups !== EXPECTED.groupCount) {
    blockers.push(`NEIGHBOR_APPROVAL_DRY_RUN_COMPLETE_GROUPS_MISMATCH:${gateReport?.summary?.completeApprovalGroups ?? ''}:${EXPECTED.groupCount}`);
  }
  if (gateReport?.summary?.productionWriteAllowed !== false) blockers.push('GATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

  const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator-review';
  const summary = {
    dryRunVersion: DRY_RUN_VERSION,
    status,
    sourceTemplate: path.relative(frontendRoot, sourceTemplatePath),
    sourceScope: path.relative(frontendRoot, sourceScopePath),
    syntheticTemplate: path.relative(frontendRoot, syntheticTemplatePath),
    gateReport: gateReport ? path.relative(frontendRoot, gateReportPath) : '',
    sourceTemplateRows: templateRows.length,
    sourceScopeRows: sourceRows.length,
    filledRows: filledRows.length,
    gateExitCode: gateCommand.exitCode,
    gateStatus: gateReport?.summary?.status ?? '',
    gateApprovedRows: gateReport?.summary?.approvedRows ?? 0,
    gateInvalidRows: gateReport?.summary?.invalidRows ?? 0,
    completeApprovalGroups: gateReport?.summary?.completeApprovalGroups ?? 0,
    productionWriteAllowed: false,
    writesOperatorTemplate: false,
    writesSourceInput: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    expected: EXPECTED,
    safetyContract: [
      'This dry-run creates only a synthetic fixture under reports/stadium/daegu-p1-paired-ownership-neighbor-approval-dry-run.',
      'It never writes the live operator template.',
      'It never writes source input or src/data/daeguSeatData.ts.',
      'It copies neighborImageDraftPath into correctedPath only inside the synthetic fixture to test gate viability.',
      'A ready dry-run is evidence that the image draft is internally gate-consistent, not operator approval.',
    ],
    filledRows,
    gateSummary: gateReport?.summary ?? null,
    gateRowsWithReasons: (gateReport?.rows ?? [])
      .filter((row) => (row.reasons ?? []).length > 0)
      .map((row) => ({
        templateRowId: row.templateRowId,
        block: row.block,
        reasons: row.reasons,
      })),
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-neighbor-approval-dry-run.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-neighbor-approval-dry-run.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-neighbor-approval-dry-run.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    ['templateRowId', 'groupId', 'block', 'neighborImageDraftCoverage'],
    ...filledRows.map((row) => [
      row.templateRowId,
      row.groupId,
      row.block,
      row.neighborImageDraftCoverage,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership Neighbor Approval Dry Run',
    '',
    `- dry-run version: \`${DRY_RUN_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- filled rows: ${summary.filledRows}`,
    `- gate status: \`${summary.gateStatus || '-'}\``,
    `- gate approved rows: ${summary.gateApprovedRows}`,
    `- gate invalid rows: ${summary.gateInvalidRows}`,
    `- complete groups: ${summary.completeApprovalGroups}/${EXPECTED.groupCount}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Safety',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Filled Synthetic Rows',
    '',
    markdownTable(
      ['template row', 'group', 'block', 'coverage'],
      filledRows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.groupId}\``,
        `\`${row.block}\``,
        row.neighborImageDraftCoverage,
      ]),
    ),
    '',
    '## Gate Rows With Reasons',
    '',
    report.gateRowsWithReasons.length > 0
      ? markdownTable(
        ['template row', 'block', 'reasons'],
        report.gateRowsWithReasons.map((row) => [
          `\`${row.templateRowId}\``,
          `\`${row.block}\``,
          row.reasons.map((reason) => `\`${reason}\``).join('<br>'),
        ]),
      )
      : 'No gate row reasons.',
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

  console.log(JSON.stringify({
    status,
    output: path.relative(frontendRoot, markdownPath),
    filledRows: summary.filledRows,
    gateStatus: summary.gateStatus,
    gateApprovedRows: summary.gateApprovedRows,
    gateInvalidRows: summary.gateInvalidRows,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipNeighborImageDraft = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const DRAFT_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_NEIGHBOR_IMAGE_DRAFT_V1';
  const OFFICIAL_IMAGE = 'src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png';
  const EXPECTED_SHA256 = '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0';
  const VIEWBOX = { width: 1707, height: 2048, viewBox: '0 0 1707 2048' };

  const GROUP_SPECS = [
    {
      groupId: 'P1_T1_TABLE_OWNERSHIP',
      title: 'T1/T1-TC paired ownership image draft',
      affectedBlocks: ['T1-1', 'T1-2', 'TC-1'],
      overlayFile: '01-p1-t1-neighbor-image-draft.png',
    },
    {
      groupId: 'P1_T3_TABLE_OWNERSHIP',
      title: 'T3/T3-TC paired ownership image draft',
      affectedBlocks: ['T3-2', 'T3-3', 'T3-4', 'TC-3', 'T3-1'],
      overlayFile: '02-p1-t3-neighbor-image-draft.png',
    },
    {
      groupId: 'P1_V_CENTER_TABLE_SPLIT',
      title: 'V/TC center split image draft',
      affectedBlocks: ['V1', 'V2', 'V3', 'T3-2', 'T3-3', 'T3-4', 'TC-1', 'TC-2'],
      overlayFile: '03-p1-v-neighbor-image-draft.png',
    },
  ];

  const TARGETS = [
    {
      block: 'T1-2',
      blockId: 'daegu-first-table-t1-2',
      groupIds: ['P1_T1_TABLE_OWNERSHIP'],
      expectedColorFamily: 'TEAL',
      labelPoint: [1019, 987],
      searchRadius: 72,
      note: 'Official teal T1-2 component above T1-1.',
    },
    {
      block: 'T1-1',
      blockId: 'daegu-first-table-t1-1',
      groupIds: ['P1_T1_TABLE_OWNERSHIP'],
      expectedColorFamily: 'TEAL',
      labelPoint: [1031, 1030],
      searchRadius: 72,
      note: 'Official teal T1-1 component below T1-2.',
    },
    {
      block: 'TC-1',
      blockId: 'daegu-central-table-tc-1',
      groupIds: ['P1_T1_TABLE_OWNERSHIP', 'P1_V_CENTER_TABLE_SPLIT'],
      expectedColorFamily: 'OLIVE',
      labelPoint: [1019, 1057],
      searchRadius: 76,
      note: 'Official yellow/olive TC-1 component adjacent to T1 and V1.',
    },
    {
      block: 'T3-4',
      blockId: 'daegu-third-table-t3-4',
      groupIds: ['P1_T3_TABLE_OWNERSHIP'],
      expectedColorFamily: 'MAROON',
      labelPoint: [811, 1121],
      seedPoints: [[811, 1108], [811, 1141]],
      searchRadius: 52,
      componentCount: 2,
      note: 'Official narrow maroon T3-4 is split into upper/lower color components by its text label.',
    },
    {
      block: 'T3-3',
      blockId: 'daegu-third-table-t3-3',
      groupIds: ['P1_T3_TABLE_OWNERSHIP', 'P1_V_CENTER_TABLE_SPLIT'],
      expectedColorFamily: 'MAROON',
      labelPoint: [839, 1121],
      searchRadius: 62,
      note: 'Official maroon T3-3 component left of T3-2.',
    },
    {
      block: 'T3-2',
      blockId: 'daegu-third-table-t3-2',
      groupIds: ['P1_T3_TABLE_OWNERSHIP', 'P1_V_CENTER_TABLE_SPLIT'],
      expectedColorFamily: 'MAROON',
      labelPoint: [887, 1121],
      searchRadius: 64,
      note: 'Official maroon T3-2 component between T3-3 and T3-1.',
    },
    {
      block: 'T3-1',
      blockId: 'daegu-third-table-t3-1',
      groupIds: ['P1_T3_TABLE_OWNERSHIP'],
      expectedColorFamily: 'MAROON',
      labelPoint: [930, 1131],
      searchRadius: 70,
      note: 'Official slanted maroon T3-1 component.',
    },
    {
      block: 'TC-3',
      blockId: 'daegu-central-table-tc-3',
      groupIds: ['P1_T3_TABLE_OWNERSHIP'],
      expectedColorFamily: 'OLIVE',
      labelPoint: [958, 1119],
      searchRadius: 78,
      note: 'Official yellow/olive TC-3 component adjacent to T3-1.',
    },
    {
      block: 'V1',
      blockId: 'daegu-central-table-v-v1',
      groupIds: ['P1_V_CENTER_TABLE_SPLIT'],
      expectedColorFamily: 'OLIVE',
      labelPoint: [975, 1022],
      searchRadius: 55,
      note: 'Official small V1 component; text fragmentation risk remains operator-visible.',
    },
    {
      block: 'V2',
      blockId: 'daegu-central-table-v-v2',
      groupIds: ['P1_V_CENTER_TABLE_SPLIT'],
      expectedColorFamily: 'OLIVE',
      labelPoint: [948, 1048],
      searchRadius: 66,
      note: 'Official V2 component inside the central split.',
    },
    {
      block: 'V3',
      blockId: 'daegu-central-table-v-v3',
      groupIds: ['P1_V_CENTER_TABLE_SPLIT'],
      expectedColorFamily: 'OLIVE',
      labelPoint: [922, 1074],
      searchRadius: 66,
      note: 'Official V3 component above T3-1.',
    },
    {
      block: 'TC-2',
      blockId: 'daegu-central-table-tc-2',
      groupIds: ['P1_V_CENTER_TABLE_SPLIT'],
      expectedColorFamily: 'OLIVE',
      labelPoint: [983, 1082],
      searchRadius: 86,
      note: 'Official large yellow/olive TC-2 component in the center split.',
    },
  ];

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

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const round = (value, digits = 1) => Number(value.toFixed(digits));

  const parsePathPoints = (pathData) => {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  };

  const pointKey = ([x, y]) => `${x},${y}`;

  const pointInPolygon = ([x, y], polygon) => {
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
      const [xi, yi] = polygon[index];
      const [xj, yj] = polygon[previous];
      const intersects = ((yi > y) !== (yj > y))
        && x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;
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

  const polygonBoundsFromPoints = (points) => ({
    minX: Math.floor(Math.min(...points.map((point) => point[0]))),
    minY: Math.floor(Math.min(...points.map((point) => point[1]))),
    maxX: Math.ceil(Math.max(...points.map((point) => point[0]))),
    maxY: Math.ceil(Math.max(...points.map((point) => point[1]))),
  });

  const bboxArray = (bbox) => bbox ? [bbox.minX, bbox.minY, bbox.maxX, bbox.maxY] : [];

  const mergeBbox = (boxes) => {
    const valid = boxes.filter(Boolean);
    if (valid.length === 0) return null;
    return {
      minX: Math.min(...valid.map((bbox) => bbox.minX)),
      minY: Math.min(...valid.map((bbox) => bbox.minY)),
      maxX: Math.max(...valid.map((bbox) => bbox.maxX)),
      maxY: Math.max(...valid.map((bbox) => bbox.maxY)),
    };
  };

  const pathFromPoints = (points) => {
    const [first, ...rest] = points;
    return `M ${first[0]} ${first[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(' ')} Z`;
  };

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

  const mergeBounds = (items, padding = 54) => {
    const bounds = items.filter(Boolean);
    if (bounds.length === 0) return { left: 0, top: 0, width: VIEWBOX.width, height: VIEWBOX.height };
    const minX = Math.max(0, Math.floor(Math.min(...bounds.map((item) => item.minX)) - padding));
    const minY = Math.max(0, Math.floor(Math.min(...bounds.map((item) => item.minY)) - padding));
    const maxX = Math.min(VIEWBOX.width, Math.ceil(Math.max(...bounds.map((item) => item.maxX)) + padding));
    const maxY = Math.min(VIEWBOX.height, Math.ceil(Math.max(...bounds.map((item) => item.maxY)) + padding));
    return {
      left: minX,
      top: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  };

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

  const componentPolygonPoints = (components) => {
    const boundaryPixels = components.flatMap((component) => (
      component.boundaryPixels.length > 0 ? component.boundaryPixels : component.pixels
    ));
    return ensureMinimumPolygonPoints(
      convexHull(boundaryPixels).map(([x, y]) => [round(x), round(y)]),
    );
  };

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
    const seedPoints = target.seedPoints ?? [target.labelPoint];
    const components = findColorComponents(
      image,
      centerBounds(target.labelPoint, target.searchRadius),
      target.expectedColorFamily,
    );
    const chosen = [...components]
      .sort((first, second) => (
        Math.min(...seedPoints.map((seed) => distanceToComponent(seed, first)))
        - Math.min(...seedPoints.map((seed) => distanceToComponent(seed, second)))
      ))
      .slice(0, target.componentCount ?? 1);
    if (chosen.length === 0) {
      return {
        status: 'NO_PIXEL_COMPONENT',
        points: [],
        componentArea: 0,
        componentBounds: null,
        componentCenter: null,
        mergedComponentCount: 0,
      };
    }

    const points = componentPolygonPoints(chosen);
    const allPixels = chosen.flatMap((component) => component.pixels);
    const sum = allPixels.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0]);
    return {
      status: 'PIXEL_COMPONENT_TRACED',
      points,
      componentArea: chosen.reduce((sumArea, component) => sumArea + component.area, 0),
      componentBounds: mergeBbox(chosen.map((component) => component.bbox)),
      componentCenter: [round(sum[0] / allPixels.length), round(sum[1] / allPixels.length)],
      mergedComponentCount: chosen.length,
    };
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

  const outputDir = path.resolve(
    frontendRoot,
    argValue(
      '--output-dir',
      path.join(defaultP1ReportDir, 'daegu-seatmap-p1-paired-ownership-neighbor-image-draft'),
    ),
  );
  const imagePath = path.resolve(frontendRoot, OFFICIAL_IMAGE);
  const imageBuffer = await fs.readFile(imagePath);
  const imageSha256 = crypto.createHash('sha256').update(imageBuffer).digest('hex');
  const officialImage = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const imageData = {
    width: officialImage.info.width,
    height: officialImage.info.height,
    data: officialImage.data,
  };
  const blockers = [];
  const warnings = [];

  if (imageSha256 !== EXPECTED_SHA256 || imageSha256 !== DAEGU_SEATMAP_IMAGE.imageSha256) {
    blockers.push(`OFFICIAL_IMAGE_SHA256_MISMATCH:${imageSha256}`);
  }
  if (imageData.width !== VIEWBOX.width || imageData.height !== VIEWBOX.height) {
    blockers.push(`OFFICIAL_IMAGE_SIZE_MISMATCH:${imageData.width}x${imageData.height}`);
  }

  const rows = TARGETS.map((target) => {
    const trace = traceConnectedTarget(imageData, target);
    const draftPath = trace.points.length > 0 ? pathFromPoints(trace.points) : '';
    const points = parsePathPoints(draftPath);
    const draftLabelPoint = trace.componentCenter ?? target.labelPoint;
    const labelInsideDraft = pointInPolygon(draftLabelPoint, points);
    const selfIntersection = hasSelfIntersection(points);
    const boundsInsideImage = points.every(([x, y]) => (
      x >= 0 && x <= VIEWBOX.width && y >= 0 && y <= VIEWBOX.height
    ));
    const pixelColorCoverageRatio = trace.points.length > 0
      ? samplePolygonColorCoverage(imageData, trace.points, target.expectedColorFamily)
      : 0;
    const riskFlags = ['DRAFT_ONLY', 'OPERATOR_APPROVAL_REQUIRED'];

    if (trace.status !== 'PIXEL_COMPONENT_TRACED') riskFlags.push(`IMAGE_DRAFT_PIXEL_TRACE_NOT_READY:${trace.status}`);
    if (!labelInsideDraft) riskFlags.push('LABEL_POINT_NEEDS_OPERATOR_ADJUSTMENT');
    if (selfIntersection) riskFlags.push('SELF_INTERSECTION');
    if (!boundsInsideImage) riskFlags.push('OUT_OF_BOUNDS');
    if (target.componentCount && target.componentCount > 1) riskFlags.push('TEXT_SPLIT_COMPONENT_MERGE');
    if (pixelColorCoverageRatio < 0.6) riskFlags.push('LOW_PIXEL_COLOR_COVERAGE');

    return {
      draftVersion: DRAFT_VERSION,
      block: target.block,
      blockId: target.blockId,
      groupIds: target.groupIds,
      expectedColorFamily: target.expectedColorFamily,
      sourceTraceMode: 'CONNECTED_COLOR_COMPONENT',
      pixelTraceStatus: trace.status,
      pixelComponentArea: trace.componentArea,
      pixelComponentCenter: trace.componentCenter,
      mergedComponentCount: trace.mergedComponentCount,
      componentBbox: bboxArray(trace.componentBounds),
      pixelColorCoverageRatio,
      draftPath,
      draftLabelX: draftLabelPoint[0],
      draftLabelY: draftLabelPoint[1],
      pointCount: points.length,
      labelInsideDraft,
      selfIntersection,
      boundsInsideImage,
      riskFlags,
      note: target.note,
    };
  });

  const groups = GROUP_SPECS.map((group) => {
    const groupRows = group.affectedBlocks.map((block) => rows.find((row) => row.block === block)).filter(Boolean);
    const crop = mergeBounds([
      ...groupRows.map((row) => row.draftPath ? polygonBoundsFromPoints(parsePathPoints(row.draftPath)) : null),
      ...groupRows.map((row) => ({ minX: row.draftLabelX, minY: row.draftLabelY, maxX: row.draftLabelX, maxY: row.draftLabelY })),
    ]);
    return {
      ...group,
      rowCount: groupRows.length,
      overlayPath: path.relative(frontendRoot, path.join(outputDir, group.overlayFile)),
      blocks: groupRows.map((row) => row.block),
      crop,
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
    sourceTraceContract: 'OFFICIAL_PNG_CONNECTED_COMPONENT_PIXEL_SCAN_FOR_PAIRED_OWNERSHIP',
    uniqueDraftRows: rows.length,
    groupDraftRows: GROUP_SPECS.reduce((count, group) => count + group.affectedBlocks.length, 0),
    blockers,
    warnings,
    safetyContract: [
      'Official PNG connected-component pixel scan only.',
      'No external baseball data or web search was used.',
      'These coordinates are draft evidence for paired ownership operator review.',
      'The script writes only reports and overlays.',
      'It never writes operator input or src/data/daeguSeatData.ts.',
      'Do not write production data until every group row is operator-approved with correctedPath, correctedLabelX/Y, reviewer, and reviewedAt.',
    ],
    groups,
    rows,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-neighbor-image-draft.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );

  const headers = [
    'block',
    'blockId',
    'groupIds',
    'expectedColorFamily',
    'sourceTraceMode',
    'pixelTraceStatus',
    'pixelComponentArea',
    'pixelComponentCenter',
    'mergedComponentCount',
    'componentBbox',
    'pixelColorCoverageRatio',
    'draftPath',
    'draftLabelX',
    'draftLabelY',
    'pointCount',
    'labelInsideDraft',
    'selfIntersection',
    'boundsInsideImage',
    'riskFlags',
    'note',
  ];
  await fs.writeFile(
    path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-neighbor-image-draft.csv'),
    [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
    ].join('\n') + '\n',
    'utf8',
  );

  const rowTable = markdownTable(
    ['block', 'groups', 'family', 'status', 'coverage', 'bbox', 'label', 'points', 'risk flags'],
    rows.map((row) => [
      `\`${row.block}\``,
      row.groupIds.map((groupId) => `\`${groupId}\``).join(' '),
      `\`${row.expectedColorFamily}\``,
      `\`${row.pixelTraceStatus}\``,
      row.pixelColorCoverageRatio,
      `\`${row.componentBbox.join(' ')}\``,
      `${row.draftLabelX}, ${row.draftLabelY}`,
      row.pointCount,
      row.riskFlags.map((flag) => `\`${flag}\``).join('<br>'),
    ]),
  );

  const groupTable = markdownTable(
    ['group', 'blocks', 'overlay'],
    groups.map((group) => [
      `\`${group.groupId}\``,
      group.blocks.map((block) => `\`${block}\``).join(' '),
      `[\`${group.overlayFile}\`](${group.overlayFile})`,
    ]),
  );

  await fs.writeFile(
    path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-neighbor-image-draft.md'),
    [
      '# Daegu P1 Paired Ownership Neighbor Image Draft',
      '',
      `- draft version: \`${DRAFT_VERSION}\``,
      `- source image: \`${OFFICIAL_IMAGE}\``,
      `- image sha256: \`${imageSha256}\``,
      `- sha256 matches expected: ${imageSha256 === EXPECTED_SHA256}`,
      '- source trace contract: `OFFICIAL_PNG_CONNECTED_COMPONENT_PIXEL_SCAN_FOR_PAIRED_OWNERSHIP`',
      '- production write allowed: false',
      '- source of truth: false',
      '- operator approval required: true',
      `- unique draft rows: ${rows.length}`,
      `- group draft rows: ${report.groupDraftRows}`,
      '',
      '## Groups',
      '',
      groupTable,
      '',
      '## Draft Rows',
      '',
      rowTable,
      '',
      '## Safety Contract',
      '',
      ...report.safetyContract.map((line) => `- ${line}`),
      '',
    ].join('\n'),
    'utf8',
  );

  for (const group of groups) {
    const crop = group.crop;
    const groupRows = group.affectedBlocks.map((block) => rows.find((row) => row.block === block)).filter(Boolean);
    const base = await sharp(imagePath).extract(crop).png().toBuffer();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="0 0 ${crop.width} ${crop.height}">
    <style>
      .draft{fill:rgba(34,197,94,0.22);stroke:#16a34a;stroke-width:2.5;vector-effect:non-scaling-stroke;}
      .label{font:800 13px Arial,sans-serif;fill:#0f172a;stroke:#fff;stroke-width:3.5;paint-order:stroke;}
      .point{fill:#16a34a;stroke:#fff;stroke-width:2;}
    </style>
    ${groupRows.map((row, index) => `<path class="draft" d="${pathToLocal(row.draftPath, crop)}"><title>${row.block} neighbor image draft</title></path><circle class="point" cx="${row.draftLabelX - crop.left}" cy="${row.draftLabelY - crop.top}" r="4"/><text class="label" x="${row.draftLabelX - crop.left + 6}" y="${row.draftLabelY - crop.top - 6}">${index + 1}. ${row.block}</text>`).join('\n')}
  </svg>`;
    await sharp(base)
      .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
      .png()
      .toFile(path.join(outputDir, group.overlayFile));
  }

  console.log(JSON.stringify({
    status: blockers.length > 0 ? 'blocked' : 'draft-ready',
    output: path.relative(frontendRoot, path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-neighbor-image-draft.md')),
    uniqueDraftRows: rows.length,
    groupDraftRows: report.groupDraftRows,
    productionWriteAllowed: false,
    sha256MatchesExpected: imageSha256 === EXPECTED_SHA256,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipSourceCopyDryRun = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const DRY_RUN_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_SOURCE_COPY_DRY_RUN_V1';
  const GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_TEMPLATE_GATE_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const SOURCE_SCOPE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_SOURCE_SCOPE_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const EXPECTED = {
    groupCount: 3,
    groupTemplateRows: 16,
    uniqueAffectedBlocks: 12,
  };
  const PLANNED_FIELDS = [
    'd',
    'imageGeometry.visualPath',
    'imageGeometry.hitPath',
    'imageGeometry.labelX',
    'imageGeometry.labelY',
    'imageGeometry.labelPoint',
    'imageGeometry.traceSource',
    'imageGeometry.traceVersion',
    'imageGeometry.geometryVersion',
    'imageGeometry.manualReviewed',
    'imageGeometry.pixelAlignmentStatus',
    'traceStatus',
    'traceMethod',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

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

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const normalizePath = (value) => String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toUpperCase();

  const normalizeLabel = (row) => [
    String(row?.correctedLabelX ?? '').trim(),
    String(row?.correctedLabelY ?? '').trim(),
  ].join(',');

  const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);

  const currentBlockFields = (block) => ({
    d: block?.imageGeometry?.d ?? '',
    visualPath: block?.imageGeometry?.visualPath ?? '',
    hitPath: block?.imageGeometry?.hitPath ?? '',
    labelX: block?.imageGeometry?.labelX ?? '',
    labelY: block?.imageGeometry?.labelY ?? '',
    labelPoint: block?.imageGeometry?.labelPoint ?? '',
    traceSource: block?.imageGeometry?.traceSource ?? '',
    traceVersion: block?.imageGeometry?.traceVersion ?? '',
    geometryVersion: block?.imageGeometry?.geometryVersion ?? '',
    manualReviewed: block?.imageGeometry?.manualReviewed ?? '',
    pixelAlignmentStatus: block?.imageGeometry?.pixelAlignmentStatus ?? '',
    traceStatus: block?.traceStatus ?? '',
    traceMethod: block?.traceMethod ?? '',
  });

  const proposedBlockFields = (row) => {
    const labelX = Number(row.correctedLabelX);
    const labelY = Number(row.correctedLabelY);
    return {
      d: String(row.correctedPath ?? '').trim(),
      visualPath: String(row.correctedPath ?? '').trim(),
      hitPath: String(row.correctedPath ?? '').trim(),
      labelX,
      labelY,
      labelPoint: [labelX, labelY],
      traceSource: DAEGU_TRACE_SOURCE,
      traceVersion: DAEGU_TRACE_VERSION,
      geometryVersion: DAEGU_TRACE_VERSION,
      manualReviewed: true,
      pixelAlignmentStatus: 'PIXEL_ALIGNED',
      traceStatus: 'OFFICIAL_IMAGE_TRACED',
      traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    };
  };

  const changedFields = (current, proposed) => ([
    ['d', current.d, proposed.d],
    ['imageGeometry.visualPath', current.visualPath, proposed.visualPath],
    ['imageGeometry.hitPath', current.hitPath, proposed.hitPath],
    ['imageGeometry.labelX', current.labelX, proposed.labelX],
    ['imageGeometry.labelY', current.labelY, proposed.labelY],
    ['imageGeometry.labelPoint', current.labelPoint, proposed.labelPoint],
    ['imageGeometry.traceSource', current.traceSource, proposed.traceSource],
    ['imageGeometry.traceVersion', current.traceVersion, proposed.traceVersion],
    ['imageGeometry.geometryVersion', current.geometryVersion, proposed.geometryVersion],
    ['imageGeometry.manualReviewed', current.manualReviewed, proposed.manualReviewed],
    ['imageGeometry.pixelAlignmentStatus', current.pixelAlignmentStatus, proposed.pixelAlignmentStatus],
    ['traceStatus', current.traceStatus, proposed.traceStatus],
    ['traceMethod', current.traceMethod, proposed.traceMethod],
  ]).filter(([, before, after]) => !sameValue(before, after)).map(([field]) => field);

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const gatePath = path.resolve(
    frontendRoot,
    argValue('--gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-template-gate.json')),
  );
  const templatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );
  const sourceScopePath = path.resolve(
    frontendRoot,
    argValue('--source-scope', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json')),
  );

  const gate = await readJson(gatePath);
  const template = await readJson(templatePath);
  const sourceScope = await readJson(sourceScopePath);
  const gateRows = Array.isArray(gate.rows) ? gate.rows : [];
  const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
  const sourceRows = Array.isArray(sourceScope.rows) ? sourceScope.rows : [];
  const sourceGroups = Array.isArray(sourceScope.groups) ? sourceScope.groups : [];
  const blockers = [];
  const warnings = [];

  const templateSha256 = await sha256File(templatePath);
  const sourceScopeSha256 = await sha256File(sourceScopePath);
  const blockByBlock = new Map(DAEGU_BLOCKS.map((block) => [block.block, block]));

  if (gate.summary?.gateVersion !== GATE_VERSION) blockers.push(`GATE_VERSION_MISMATCH:${gate.summary?.gateVersion ?? ''}`);
  if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  if (template.sourceScopeVersion !== SOURCE_SCOPE_VERSION) blockers.push(`TEMPLATE_SOURCE_SCOPE_VERSION_MISMATCH:${template.sourceScopeVersion ?? ''}`);
  if (template.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
  if (sourceScope.summary?.sourceScopeVersion !== SOURCE_SCOPE_VERSION) {
    blockers.push(`SOURCE_SCOPE_VERSION_MISMATCH:${sourceScope.summary?.sourceScopeVersion ?? ''}`);
  }
  if (gate.summary?.productionWriteAllowed !== false) blockers.push('GATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (sourceScope.summary?.productionWriteAllowed !== false) blockers.push('SOURCE_SCOPE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (gate.summary?.templateSha256 && gate.summary.templateSha256 !== templateSha256) blockers.push('GATE_TEMPLATE_SHA256_STALE');
  if (gate.summary?.sourceScopeSha256 && gate.summary.sourceScopeSha256 !== sourceScopeSha256) blockers.push('GATE_SOURCE_SCOPE_SHA256_STALE');
  if (sourceGroups.length !== EXPECTED.groupCount) blockers.push(`SOURCE_SCOPE_GROUP_COUNT_MISMATCH:${sourceGroups.length}:${EXPECTED.groupCount}`);
  if (templateRows.length !== EXPECTED.groupTemplateRows) blockers.push(`TEMPLATE_ROW_COUNT_MISMATCH:${templateRows.length}:${EXPECTED.groupTemplateRows}`);
  if (sourceScope.summary?.uniqueAffectedBlocks !== EXPECTED.uniqueAffectedBlocks) {
    blockers.push(`UNIQUE_AFFECTED_BLOCKS_MISMATCH:${sourceScope.summary?.uniqueAffectedBlocks ?? ''}:${EXPECTED.uniqueAffectedBlocks}`);
  }
  if ((gate.summary?.invalidRows ?? 0) > 0) blockers.push(`GATE_INVALID_ROWS:${gate.summary.invalidRows}`);
  if ((gate.summary?.invalidGroups ?? 0) > 0) blockers.push(`GATE_INVALID_GROUPS:${gate.summary.invalidGroups}`);

  const gateStatus = gate.summary?.status ?? 'missing';
  const gateReady = gateStatus === 'ready-for-source-copy';
  if (!gateReady) warnings.push(`SOURCE_COPY_DRY_RUN_WAITING_FOR_TEMPLATE_GATE:${gateStatus}`);
  if ((gate.summary?.approvedRows ?? 0) === 0) warnings.push('SOURCE_COPY_DRY_RUN_HAS_NO_APPROVED_ROWS');

  const gateRowsByTemplateRowId = new Map(gateRows.map((row) => [row.templateRowId, row]));
  const approvedTemplateRows = templateRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const rowsByBlock = new Map();
  approvedTemplateRows.forEach((row) => {
    const values = rowsByBlock.get(row.block) ?? [];
    values.push(row);
    rowsByBlock.set(row.block, values);
  });

  const approvedByBlock = new Map();
  rowsByBlock.forEach((rows, block) => {
    const uniquePaths = new Set(rows.map((row) => normalizePath(row.correctedPath)).filter(Boolean));
    const uniqueLabels = new Set(rows.map(normalizeLabel).filter((label) => label !== ','));
    if (uniquePaths.size > 1 || uniqueLabels.size > 1) {
      blockers.push(`DUPLICATE_APPROVED_BLOCK_COPY_FIELDS_MISMATCH:${block}`);
      return;
    }
    approvedByBlock.set(block, rows[0]);
  });

  const uniqueSourceBlocks = [...new Set(sourceRows.map((row) => row.block))];
  uniqueSourceBlocks.forEach((block) => {
    if (!blockByBlock.has(block)) blockers.push(`PRODUCTION_BLOCK_MISSING:${block}`);
  });

  const readyForProductionPreview = blockers.length === 0 && gateReady;
  const templateRowReports = templateRows.map((row) => {
    const gateRow = gateRowsByTemplateRowId.get(row.templateRowId);
    const approved = normalizeDecision(row.operatorDecision) === 'APPROVED';
    return {
      templateRowId: row.templateRowId,
      groupId: row.groupId,
      block: row.block,
      blockId: row.blockId,
      blockRole: row.blockRole,
      approved,
      readyForSourceCopy: gateRow?.readyForSourceCopy === true,
      gateReasons: gateRow?.reasons ?? [],
      sourceCopyRole: approvedByBlock.get(row.block) === row ? 'production-preview-source-row' : 'duplicate-or-held-template-row',
    };
  });

  const blockPlans = uniqueSourceBlocks.map((block) => {
    const sourceRow = sourceRows.find((row) => row.block === block);
    const productionBlock = blockByBlock.get(block);
    const approvedRow = approvedByBlock.get(block);
    const current = currentBlockFields(productionBlock);
    const proposed = approvedRow ? proposedBlockFields(approvedRow) : null;
    const plannedForProductionPreview = Boolean(readyForProductionPreview && productionBlock && approvedRow);
    const changed = plannedForProductionPreview ? changedFields(current, proposed) : [];
    return {
      block,
      blockId: productionBlock?.id ?? sourceRow?.blockId ?? '',
      sourceScopeRows: sourceRows.filter((row) => row.block === block).map((row) => row.templateRowId),
      approvedTemplateRows: approvedTemplateRows.filter((row) => row.block === block).map((row) => row.templateRowId),
      plannedForProductionPreview,
      wouldChange: changed.length > 0,
      changedFields: changed,
      plannedFields: plannedForProductionPreview ? PLANNED_FIELDS : [],
      current,
      proposed: plannedForProductionPreview ? proposed : null,
      reasons: [
        ...(!productionBlock ? ['PRODUCTION_BLOCK_MISSING'] : []),
        ...(!approvedRow ? ['APPROVED_TEMPLATE_ROW_MISSING'] : []),
        ...(readyForProductionPreview ? [] : [`TEMPLATE_GATE_NOT_READY:${gateStatus}`]),
      ],
    };
  });

  const plannedRows = blockPlans.filter((row) => row.plannedForProductionPreview);
  const status = blockers.length > 0
    ? 'blocked'
    : readyForProductionPreview
      ? 'ready-for-production-preview'
      : approvedTemplateRows.length > 0
        ? 'waiting-for-complete-group-gate'
        : 'waiting-for-operator';

  const summary = {
    dryRunVersion: DRY_RUN_VERSION,
    status,
    gateStatus,
    readyForProductionPreview,
    templateRows: templateRows.length,
    sourceScopeRows: sourceRows.length,
    uniqueAffectedBlocks: uniqueSourceBlocks.length,
    approvedTemplateRows: approvedTemplateRows.length,
    plannedRows: plannedRows.length,
    wouldChangeRows: plannedRows.filter((row) => row.wouldChange).length,
    plannedFieldCount: plannedRows.reduce((count, row) => count + row.changedFields.length, 0),
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesOperatorTemplate: false,
    writesSourceInput: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    expected: EXPECTED,
    inputs: {
      gate: path.relative(frontendRoot, gatePath),
      gateTemplateSha256: gate.summary?.templateSha256 ?? '',
      gateSourceScopeSha256: gate.summary?.sourceScopeSha256 ?? '',
      template: path.relative(frontendRoot, templatePath),
      templateSha256,
      sourceScope: path.relative(frontendRoot, sourceScopePath),
      sourceScopeSha256,
    },
    safetyContract: [
      'This source-copy dry-run is read-only.',
      'It never writes the live operator template.',
      'It never writes source input.',
      'It never modifies src/data/daeguSeatData.ts.',
      'It never promotes blocks to OFFICIAL_IMAGE_TRACED without a ready template gate.',
      'It creates only a production-field preview for d, imageGeometry.visualPath, imageGeometry.hitPath, imageGeometry.labelPoint, traceStatus, traceMethod, manualReviewed, and pixelAlignmentStatus.',
      'Duplicate template rows for the same block must keep correctedPath and correctedLabelX/Y identical before a block can be planned.',
      'Production write remains forbidden; this report is evidence for a later reviewed patch only.',
    ],
    templateRows: templateRowReports,
    blockPlans,
  };

  await fs.mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-source-copy-dry-run.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-source-copy-dry-run.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-source-copy-dry-run.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'block',
      'blockId',
      'plannedForProductionPreview',
      'wouldChange',
      'changedFields',
      'approvedTemplateRows',
      'sourceScopeRows',
      'reasons',
    ],
    ...blockPlans.map((row) => [
      row.block,
      row.blockId,
      row.plannedForProductionPreview,
      row.wouldChange,
      row.changedFields.join(' '),
      row.approvedTemplateRows.join(' '),
      row.sourceScopeRows.join(' '),
      row.reasons.join(' '),
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership Source Copy Dry Run',
    '',
    `- dry run version: \`${DRY_RUN_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- gate status: \`${summary.gateStatus}\``,
    `- approved template rows: ${summary.approvedTemplateRows}/${summary.templateRows}`,
    `- planned rows: ${summary.plannedRows}/${summary.uniqueAffectedBlocks}`,
    `- would change rows: ${summary.wouldChangeRows}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- data file changed: ${summary.dataFileChanged}`,
    '',
    '## Safety',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Block Plans',
    '',
    markdownTable(
      ['block', 'planned', 'would change', 'changed fields', 'approved rows', 'reasons'],
      blockPlans.map((row) => [
        `\`${row.block}\``,
        String(row.plannedForProductionPreview),
        String(row.wouldChange),
        row.changedFields.map((field) => `\`${field}\``).join('<br>') || '-',
        row.approvedTemplateRows.map((rowId) => `\`${rowId}\``).join('<br>') || '-',
        row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Template Rows',
    '',
    markdownTable(
      ['template row', 'block', 'approved', 'gate ready', 'source-copy role', 'gate reasons'],
      templateRowReports.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        String(row.approved),
        String(row.readyForSourceCopy),
        `\`${row.sourceCopyRole}\``,
        row.gateReasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
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

  console.log(JSON.stringify({
    status,
    output: path.relative(frontendRoot, markdownPath),
    gateStatus,
    approvedTemplateRows: approvedTemplateRows.length,
    plannedRows: plannedRows.length,
    wouldChangeRows: summary.wouldChangeRows,
    productionWriteAllowed: false,
    dataFileChanged: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipSourceScope = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultPackageDir = path.join(defaultP1ReportDir, 'daegu-seatmap-p1-paired-ownership-correction-package');

  const SOURCE_SCOPE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_SOURCE_SCOPE_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const CORRECTION_PACKAGE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_CORRECTION_PACKAGE_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const DECISION_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE'];
  const EXPECTED = {
    groupCount: 3,
    uniqueAffectedBlocks: 12,
    groupTemplateRows: 16,
    targetRows: 5,
  };

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

  const pathPointCount = (pathData) => Math.floor((String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g) ?? []).length / 2);

  const normalizeDecision = (decision) => {
    const normalized = String(decision ?? 'PENDING').trim() || 'PENDING';
    return DECISION_OPTIONS.includes(normalized) ? normalized : 'PENDING';
  };

  const editableFieldsFrom = (row) => ({
    operatorDecision: normalizeDecision(row?.operatorDecision),
    correctedPath: String(row?.correctedPath ?? '').trim(),
    correctedLabelX: row?.correctedLabelX === undefined || row?.correctedLabelX === null ? '' : String(row.correctedLabelX).trim(),
    correctedLabelY: row?.correctedLabelY === undefined || row?.correctedLabelY === null ? '' : String(row.correctedLabelY).trim(),
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

  const blockPath = (block) => block?.imageGeometry?.hitPath
    ?? block?.imageGeometry?.visualPath
    ?? block?.imageGeometry?.d
    ?? '';

  const blockSummary = (block) => {
    if (!block) return null;
    const currentPath = blockPath(block);
    return {
      blockId: block.id,
      block: block.block,
      name: block.name,
      category: block.category,
      level: block.level,
      side: block.side,
      fanRole: block.fanRole,
      traceStatus: block.traceStatus,
      traceMethod: block.traceMethod,
      sectionKind: block.sectionKind,
      currentPath,
      currentPathPointCount: pathPointCount(currentPath),
      currentLabelX: block.imageGeometry?.labelX ?? '',
      currentLabelY: block.imageGeometry?.labelY ?? '',
      shortLabel: block.imageGeometry?.shortLabel ?? block.block,
    };
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const packageDir = path.resolve(frontendRoot, argValue('--package-dir', defaultPackageDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const packagePath = path.resolve(
    frontendRoot,
    argValue('--package', path.join(packageDir, 'daegu-seatmap-p1-paired-ownership-correction-package.json')),
  );
  const existingTemplatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );

  const blockers = [];
  const warnings = [];
  const correctionPackage = await readJson(packagePath);
  const existingTemplate = await readOptionalJson(existingTemplatePath);
  const groups = Array.isArray(correctionPackage.groups) ? correctionPackage.groups : [];
  const blocksByBlock = new Map(DAEGU_BLOCKS.map((block) => [block.block, block]));
  const existingRows = Array.isArray(existingTemplate?.corrections) ? existingTemplate.corrections : [];
  const existingByTemplateRowId = new Map(existingRows.map((row) => [row.templateRowId, row]));

  if (correctionPackage.summary?.packageVersion !== CORRECTION_PACKAGE_VERSION) {
    blockers.push(`CORRECTION_PACKAGE_VERSION_MISMATCH:${correctionPackage.summary?.packageVersion ?? ''}`);
  }
  if (correctionPackage.summary?.productionWriteAllowed !== false) {
    blockers.push('CORRECTION_PACKAGE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  }

  const rows = groups.flatMap((group) => {
    const affectedBlocks = Array.isArray(group.affectedBlocks) ? group.affectedBlocks : [];
    const targetBlocks = Array.isArray(group.targetBlocks) ? group.targetBlocks : [];
    const neighborDraftByBlock = new Map((group.neighborDraftRows ?? []).map((row) => [row.block, row]));
    return affectedBlocks.map((block, blockIndex) => {
      const blockData = blockSummary(blocksByBlock.get(block));
      const neighborDraft = neighborDraftByBlock.get(block);
      const templateRowId = `${group.groupId}:${block}`;
      const existingRow = existingByTemplateRowId.get(templateRowId);
      const editable = hasOperatorFilledEditableFields(existingRow)
        ? editableFieldsFrom(existingRow)
        : editableFieldsFrom();
      const role = targetBlocks.includes(block)
        ? 'TARGET'
        : correctionPackage.summary?.draftReadyBlocks?.includes(block)
          ? 'DRAFT_READY_CONTEXT'
          : 'PAIRED_CONTEXT';
      const missingSourceBlock = !blockData;

      if (missingSourceBlock) blockers.push(`SOURCE_SCOPE_BLOCK_MISSING:${group.groupId}:${block}`);

      return {
        sourceScopeVersion: SOURCE_SCOPE_VERSION,
        templateVersion: TEMPLATE_VERSION,
        targetBatchId: TARGET_BATCH_ID,
        templateRowId,
        rowNumber: blockIndex + 1,
        groupId: group.groupId,
        groupTitle: group.title,
        conflictClass: group.conflictClass,
        groupTargetBlocks: targetBlocks,
        groupAffectedBlocks: affectedBlocks,
        blockRole: role,
        blockId: blockData?.blockId ?? '',
        block,
        name: blockData?.name ?? block,
        category: blockData?.category ?? '',
        traceStatus: blockData?.traceStatus ?? '',
        traceMethod: blockData?.traceMethod ?? '',
        currentPath: blockData?.currentPath ?? '',
        currentPathPointCount: blockData?.currentPathPointCount ?? 0,
        currentLabelX: blockData?.currentLabelX ?? '',
        currentLabelY: blockData?.currentLabelY ?? '',
        dryRunReadyForSourceCopy: group.dryRunReadyBlocks?.includes(block) ?? false,
        dryRunBlocked: group.dryRunBlockedBlocks?.includes(block) ?? false,
        neighborImageDraftPath: neighborDraft?.draftPath ?? '',
        neighborImageDraftLabelX: neighborDraft?.draftLabelX ?? '',
        neighborImageDraftLabelY: neighborDraft?.draftLabelY ?? '',
        neighborImageDraftCoverage: neighborDraft?.pixelColorCoverageRatio ?? '',
        neighborImageDraftComponentBbox: Array.isArray(neighborDraft?.componentBbox) ? neighborDraft.componentBbox.join(' ') : '',
        neighborImageDraftRiskFlags: Array.isArray(neighborDraft?.riskFlags) ? neighborDraft.riskFlags.join(' ') : '',
        groupGateReasons: group.gateReasons ?? [],
        sourceScopeGap: group.sourceScopeGapBlocks?.includes(block) ?? false,
        overlay: group.svgOverlay ?? '',
        operatorAction: group.operatorAction,
        editableSource: hasOperatorFilledEditableFields(existingRow) ? 'existingOperatorTemplate' : 'generatedPendingTemplate',
        ...editable,
        requiredApprovalFields: [
          'operatorDecision=APPROVED',
          'correctedPath',
          'correctedLabelX',
          'correctedLabelY',
          'reviewer',
          'reviewedAt',
        ],
      };
    });
  });

  const uniqueAffectedBlocks = [...new Set(rows.map((row) => row.block))].sort((left, right) => left.localeCompare(right, 'ko'));
  const targetRows = rows.filter((row) => row.blockRole === 'TARGET');
  const preservedEditableRows = rows.filter((row) => row.editableSource === 'existingOperatorTemplate');
  const neighborImageDraftRows = rows.filter((row) => row.neighborImageDraftPath);

  if (groups.length !== EXPECTED.groupCount) warnings.push(`SOURCE_SCOPE_GROUP_COUNT_CHANGED:${groups.length}:${EXPECTED.groupCount}`);
  if (rows.length !== EXPECTED.groupTemplateRows) warnings.push(`SOURCE_SCOPE_GROUP_TEMPLATE_ROWS_CHANGED:${rows.length}:${EXPECTED.groupTemplateRows}`);
  if (uniqueAffectedBlocks.length !== EXPECTED.uniqueAffectedBlocks) {
    warnings.push(`SOURCE_SCOPE_UNIQUE_AFFECTED_BLOCKS_CHANGED:${uniqueAffectedBlocks.length}:${EXPECTED.uniqueAffectedBlocks}`);
  }
  if (targetRows.length !== EXPECTED.targetRows) warnings.push(`SOURCE_SCOPE_TARGET_ROWS_CHANGED:${targetRows.length}:${EXPECTED.targetRows}`);

  const groupSummaries = groups.map((group) => {
    const groupRows = rows.filter((row) => row.groupId === group.groupId);
    return {
      groupId: group.groupId,
      title: group.title,
      conflictClass: group.conflictClass,
      targetBlocks: group.targetBlocks,
      affectedBlocks: group.affectedBlocks,
      sourceScopeGapBlocks: group.sourceScopeGapBlocks ?? [],
      groupTemplateRows: groupRows.length,
      approvedRows: groupRows.filter((row) => row.operatorDecision === 'APPROVED').length,
      preservedEditableRows: groupRows.filter((row) => row.editableSource === 'existingOperatorTemplate').length,
      isolatedApprovalAllowed: false,
      groupApprovalRequired: true,
      overlay: group.svgOverlay ?? '',
      operatorAction: group.operatorAction,
    };
  });

  const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator-template';
  const safetyContract = [
    'This source scope writes only P1 paired ownership report/template files.',
    'It never writes reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json.',
    'It never writes the boundary-first source input.',
    'It never modifies src/data/daeguSeatData.ts.',
    'It preserves operator-filled editable fields in the paired ownership operator template.',
    'Neighbor image draft fields are read-only evidence and must not be treated as operator approval.',
    'Group rows are duplicated by templateRowId when the same block belongs to multiple ownership groups.',
    'Production data can change only after a future source-copy/write path and full P1 gates pass.',
    'No external baseball data, web search, or automatic promotion is used.',
  ];

  const summary = {
    sourceScopeVersion: SOURCE_SCOPE_VERSION,
    operatorTemplateVersion: TEMPLATE_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    productionWriteAllowed: false,
    writesSourceInput: false,
    writesProductionData: false,
    writesOperatorTemplate: true,
    sourceCorrectionPackage: path.relative(frontendRoot, packagePath),
    outputTemplate: path.relative(frontendRoot, existingTemplatePath),
    groupCount: groups.length,
    groupTemplateRows: rows.length,
    uniqueAffectedBlocks: uniqueAffectedBlocks.length,
    uniqueAffectedBlockList: uniqueAffectedBlocks,
    targetRows: targetRows.length,
    neighborImageDraftRows: neighborImageDraftRows.length,
    preservedEditableRows: preservedEditableRows.length,
    blockers,
    warnings,
  };

  const sourceScopeReport = {
    generatedAt: new Date().toISOString(),
    summary,
    expected: EXPECTED,
    safetyContract,
    groups: groupSummaries,
    rows,
  };

  const operatorTemplate = {
    generatedAt: new Date().toISOString(),
    templateVersion: TEMPLATE_VERSION,
    sourceScopeVersion: SOURCE_SCOPE_VERSION,
    targetBatchId: TARGET_BATCH_ID,
    templateOnly: true,
    productionWriteAllowed: false,
    sourceScope: 'reports/stadium/daegu-p1-operator/daegu-seatmap-p1-paired-ownership-source-scope.json',
    decisionOptions: DECISION_OPTIONS,
    approvalRule: 'Each ownership group must be approved as a complete group before any source-copy or production write path is allowed.',
    corrections: rows.map((row) => ({
      templateRowId: row.templateRowId,
      groupId: row.groupId,
      groupTitle: row.groupTitle,
      conflictClass: row.conflictClass,
      blockRole: row.blockRole,
      blockId: row.blockId,
      block: row.block,
      name: row.name,
      category: row.category,
      traceStatus: row.traceStatus,
      traceMethod: row.traceMethod,
      currentPath: row.currentPath,
      currentLabelX: row.currentLabelX,
      currentLabelY: row.currentLabelY,
      currentPathPointCount: row.currentPathPointCount,
      neighborImageDraftPath: row.neighborImageDraftPath,
      neighborImageDraftLabelX: row.neighborImageDraftLabelX,
      neighborImageDraftLabelY: row.neighborImageDraftLabelY,
      neighborImageDraftCoverage: row.neighborImageDraftCoverage,
      neighborImageDraftComponentBbox: row.neighborImageDraftComponentBbox,
      neighborImageDraftRiskFlags: row.neighborImageDraftRiskFlags,
      groupTargetBlocks: row.groupTargetBlocks.join(' '),
      groupAffectedBlocks: row.groupAffectedBlocks.join(' '),
      sourceScopeGap: row.sourceScopeGap,
      dryRunReadyForSourceCopy: row.dryRunReadyForSourceCopy,
      dryRunBlocked: row.dryRunBlocked,
      groupGateReasons: row.groupGateReasons.join('; '),
      overlay: row.overlay,
      editableSource: row.editableSource,
      operatorDecision: row.operatorDecision,
      correctedPath: row.correctedPath,
      correctedLabelX: row.correctedLabelX,
      correctedLabelY: row.correctedLabelY,
      reviewer: row.reviewer,
      reviewedAt: row.reviewedAt,
      operatorNote: row.operatorNote,
    })),
  };

  await fs.mkdir(outputDir, { recursive: true });

  const sourceScopeJsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json');
  const sourceScopeCsvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-source-scope.csv');
  const sourceScopeMdPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-source-scope.md');
  const templateJsonPath = existingTemplatePath;
  const templateCsvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-operator-template.csv');
  const templateMdPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-operator-template.md');

  await fs.writeFile(sourceScopeJsonPath, `${JSON.stringify(sourceScopeReport, null, 2)}\n`, 'utf8');
  await writeCsv(sourceScopeCsvPath, [
    [
      'templateRowId',
      'groupId',
      'blockRole',
      'blockId',
      'block',
      'traceStatus',
      'traceMethod',
      'neighborImageDraftCoverage',
      'sourceScopeGap',
      'dryRunReadyForSourceCopy',
      'dryRunBlocked',
      'operatorDecision',
      'editableSource',
      'overlay',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.groupId,
      row.blockRole,
      row.blockId,
      row.block,
      row.traceStatus,
      row.traceMethod,
      row.neighborImageDraftCoverage,
      row.sourceScopeGap,
      row.dryRunReadyForSourceCopy,
      row.dryRunBlocked,
      row.operatorDecision,
      row.editableSource,
      row.overlay,
    ]),
  ]);

  await fs.writeFile(templateJsonPath, `${JSON.stringify(operatorTemplate, null, 2)}\n`, 'utf8');
  await writeCsv(templateCsvPath, [
    [
      'templateRowId',
      'groupId',
      'blockRole',
      'blockId',
      'block',
      'operatorDecision',
      'neighborImageDraftPath',
      'neighborImageDraftLabelX',
      'neighborImageDraftLabelY',
      'neighborImageDraftCoverage',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
      'operatorNote',
    ],
    ...operatorTemplate.corrections.map((row) => [
      row.templateRowId,
      row.groupId,
      row.blockRole,
      row.blockId,
      row.block,
      row.operatorDecision,
      row.neighborImageDraftPath,
      row.neighborImageDraftLabelX,
      row.neighborImageDraftLabelY,
      row.neighborImageDraftCoverage,
      row.correctedPath,
      row.correctedLabelX,
      row.correctedLabelY,
      row.reviewer,
      row.reviewedAt,
      row.operatorNote,
    ]),
  ]);

  const groupTable = markdownTable(
    ['group', 'target', 'affected', 'scope gaps', 'rows', 'preserved', 'overlay'],
    groupSummaries.map((group) => [
      `\`${group.groupId}\``,
      group.targetBlocks.map((block) => `\`${block}\``).join(' '),
      group.affectedBlocks.map((block) => `\`${block}\``).join(' '),
      group.sourceScopeGapBlocks.map((block) => `\`${block}\``).join(' ') || '-',
      group.groupTemplateRows,
      group.preservedEditableRows,
      group.overlay ? `[\`${path.basename(group.overlay)}\`](${path.relative(outputDir, path.join(frontendRoot, group.overlay))})` : '-',
    ]),
  );

  const rowTable = markdownTable(
    ['template row', 'role', 'block', 'trace', 'neighbor draft coverage', 'gap', 'decision', 'editable'],
    rows.map((row) => [
      `\`${row.templateRowId}\``,
      `\`${row.blockRole}\``,
      `\`${row.block}\``,
      `\`${row.traceStatus || '-'}\``,
      row.neighborImageDraftCoverage || '-',
      String(row.sourceScopeGap),
      `\`${row.operatorDecision}\``,
      row.editableSource,
    ]),
  );

  const groupInputGuideTable = markdownTable(
    ['group', 'operator rule', 'affected rows', 'overlay'],
    groupSummaries.map((group) => [
      `\`${group.groupId}\``,
      'Approve every row in this group together, or leave the group pending.',
      group.affectedBlocks.map((block) => `\`${block}\``).join(' '),
      group.overlay ? `[\`${path.basename(group.overlay)}\`](${path.relative(outputDir, path.join(frontendRoot, group.overlay))})` : '-',
    ]),
  );

  const editableGuideTable = markdownTable(
    ['template row', 'current label', 'image draft label', 'image draft coverage', 'current points', 'editable fields'],
    rows.map((row) => [
      `\`${row.templateRowId}\``,
      `${row.currentLabelX}, ${row.currentLabelY}`,
      row.neighborImageDraftLabelX === '' ? '-' : `${row.neighborImageDraftLabelX}, ${row.neighborImageDraftLabelY}`,
      row.neighborImageDraftCoverage || '-',
      row.currentPathPointCount,
      '`operatorDecision`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`, `operatorNote`',
    ]),
  );

  await fs.writeFile(sourceScopeMdPath, [
    '# Daegu P1 Paired Ownership Source Scope',
    '',
    `- source scope version: \`${SOURCE_SCOPE_VERSION}\``,
    `- operator template version: \`${TEMPLATE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- group count: ${summary.groupCount}`,
    `- group template rows: ${summary.groupTemplateRows}`,
    `- unique affected blocks: ${summary.uniqueAffectedBlocks}`,
    `- neighbor image draft rows: ${summary.neighborImageDraftRows}`,
    `- preserved editable rows: ${summary.preservedEditableRows}`,
    `- operator template: \`${path.relative(frontendRoot, templateJsonPath)}\``,
    '',
    '## Safety',
    '',
    ...safetyContract.map((rule) => `- ${rule}`),
    '',
    '## Groups',
    '',
    groupTable,
    '',
    '## Rows',
    '',
    rowTable,
    '',
    '## Next Gate',
    '',
    '- `npm run stadium:daegu:p1-paired-ownership-template-gate`',
  ].join('\n'), 'utf8');

  await fs.writeFile(templateMdPath, [
    '# Daegu P1 Paired Ownership Operator Template',
    '',
    `- template version: \`${TEMPLATE_VERSION}\``,
    `- source scope version: \`${SOURCE_SCOPE_VERSION}\``,
    '- Fill only `operatorDecision`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`, and `operatorNote`.',
    '- `neighborImageDraftPath` and `neighborImageDraftLabelX/Y` are read-only official PNG pixel-scan evidence. They are not auto-approved.',
    '- Do not copy currentPath into correctedPath.',
    '- Do not approve a partial group.',
    '- A group is source-copy eligible only when every row in that group is `APPROVED` and the group gate passes.',
    '- Run `npm run stadium:daegu:p1-paired-ownership-template-gate` before any source-copy discussion.',
    '',
    '## Group Input Guide',
    '',
    groupInputGuideTable,
    '',
    '## Editable Field Guide',
    '',
    editableGuideTable,
    '',
    '## Current Rows',
    '',
    rowTable,
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    status,
    sourceScope: path.relative(frontendRoot, sourceScopeMdPath),
    operatorTemplate: path.relative(frontendRoot, templateJsonPath),
    groupCount: summary.groupCount,
    groupTemplateRows: summary.groupTemplateRows,
    uniqueAffectedBlocks: summary.uniqueAffectedBlocks,
    neighborImageDraftRows: summary.neighborImageDraftRows,
    preservedEditableRows: summary.preservedEditableRows,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT1ApprovalReadiness = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const READINESS_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T1_APPROVAL_READINESS_V1';
  const TEMPLATE_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_TEMPLATE_GATE_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const T1_INPUT_PACK_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T1_INPUT_PACK_V1';
  const T1_DRAFT_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T1_COORDINATE_DRAFT_V1';
  const GROUP_ID = 'P1_T1_TABLE_OWNERSHIP';
  const EXPECTED_BLOCKS = ['T1-1', 'T1-2', 'TC-1'];

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

  const normalizePath = (value) => String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toUpperCase();

  const isApproved = (value) => String(value ?? '').trim() === 'APPROVED';

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const templateGatePath = path.resolve(
    frontendRoot,
    argValue('--template-gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-template-gate.json')),
  );
  const templatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );
  const t1InputPackPath = path.resolve(
    frontendRoot,
    argValue('--t1-input-pack', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t1-input-pack.json')),
  );
  const t1DraftPath = path.resolve(
    frontendRoot,
    argValue(
      '--t1-draft',
      path.join(
        p1ReportDir,
        'daegu-seatmap-p1-paired-ownership-t1-coordinate-draft/daegu-seatmap-p1-paired-ownership-t1-coordinate-draft.json',
      ),
    ),
  );

  const gate = await readJson(templateGatePath);
  const template = await readJson(templatePath);
  const t1InputPack = await readJson(t1InputPackPath);
  const t1Draft = await readJson(t1DraftPath);
  const blockers = [];
  const warnings = [];

  if (gate.summary?.gateVersion !== TEMPLATE_GATE_VERSION) {
    blockers.push(`TEMPLATE_GATE_VERSION_MISMATCH:${gate.summary?.gateVersion ?? ''}`);
  }
  if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  if (t1InputPack.summary?.packVersion !== T1_INPUT_PACK_VERSION) {
    blockers.push(`T1_INPUT_PACK_VERSION_MISMATCH:${t1InputPack.summary?.packVersion ?? ''}`);
  }
  if (t1Draft.summary?.draftVersion !== T1_DRAFT_VERSION) {
    blockers.push(`T1_DRAFT_VERSION_MISMATCH:${t1Draft.summary?.draftVersion ?? ''}`);
  }
  if (t1InputPack.summary?.groupId !== GROUP_ID) blockers.push(`T1_INPUT_GROUP_MISMATCH:${t1InputPack.summary?.groupId ?? ''}`);
  if (t1Draft.summary?.groupId !== GROUP_ID) blockers.push(`T1_DRAFT_GROUP_MISMATCH:${t1Draft.summary?.groupId ?? ''}`);
  if (gate.summary?.productionWriteAllowed !== false) blockers.push('TEMPLATE_GATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (t1InputPack.summary?.productionWriteAllowed !== false) blockers.push('T1_INPUT_PACK_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (t1Draft.summary?.productionWriteAllowed !== false) blockers.push('T1_DRAFT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (t1Draft.summary?.sourceOfTruth !== false) blockers.push('T1_DRAFT_SOURCE_OF_TRUTH_NOT_FALSE');
  if ((t1Draft.summary?.blockers ?? []).length > 0) blockers.push('T1_DRAFT_HAS_BLOCKERS');

  const templateRows = (template.corrections ?? []).filter((row) => row.groupId === GROUP_ID);
  const gateRows = (gate.rows ?? []).filter((row) => row.groupId === GROUP_ID);
  const inputRows = (t1InputPack.rows ?? []).filter((row) => row.templateRowId?.startsWith(`${GROUP_ID}:`));
  const draftRows = t1Draft.rows ?? [];
  const groupGate = (gate.groups ?? []).find((group) => group.groupId === GROUP_ID);
  const templateBlocks = templateRows.map((row) => row.block);
  const gateBlocks = gateRows.map((row) => row.block);
  const inputBlocks = inputRows.map((row) => row.block);
  const draftBlocks = draftRows.map((row) => row.block);

  if (templateBlocks.join(' ') !== EXPECTED_BLOCKS.join(' ')) blockers.push(`T1_TEMPLATE_BLOCK_ORDER_MISMATCH:${templateBlocks.join(' ')}`);
  if (gateBlocks.join(' ') !== EXPECTED_BLOCKS.join(' ')) blockers.push(`T1_GATE_BLOCK_ORDER_MISMATCH:${gateBlocks.join(' ')}`);
  if (inputBlocks.join(' ') !== EXPECTED_BLOCKS.join(' ')) blockers.push(`T1_INPUT_BLOCK_ORDER_MISMATCH:${inputBlocks.join(' ')}`);
  if (draftBlocks.join(' ') !== EXPECTED_BLOCKS.join(' ')) blockers.push(`T1_DRAFT_BLOCK_ORDER_MISMATCH:${draftBlocks.join(' ')}`);
  if (!groupGate) blockers.push('T1_GROUP_GATE_MISSING');

  const gateRowsByTemplateRowId = new Map(gateRows.map((row) => [row.templateRowId, row]));
  const inputRowsByTemplateRowId = new Map(inputRows.map((row) => [row.templateRowId, row]));
  const draftRowsByBlock = new Map(draftRows.map((row) => [row.block, row]));
  const approvedRows = templateRows.filter((row) => isApproved(row.operatorDecision));
  const partialApproval = approvedRows.length > 0 && approvedRows.length < EXPECTED_BLOCKS.length;
  if (partialApproval) blockers.push(`T1_PARTIAL_APPROVAL_BLOCKED:${approvedRows.length}:${EXPECTED_BLOCKS.length}`);

  const rows = templateRows.map((templateRow) => {
    const gateRow = gateRowsByTemplateRowId.get(templateRow.templateRowId);
    const inputRow = inputRowsByTemplateRowId.get(templateRow.templateRowId);
    const draftRow = draftRowsByBlock.get(templateRow.block);
    const approved = isApproved(templateRow.operatorDecision);
    const correctedPathMatchesDraft = approved
      && normalizePath(templateRow.correctedPath) !== ''
      && normalizePath(templateRow.correctedPath) === normalizePath(draftRow?.draftPathCandidate);
    const reasons = [];
    const rowWarnings = [];

    if (!gateRow) reasons.push('T1_GATE_ROW_MISSING');
    if (!inputRow) reasons.push('T1_INPUT_ROW_MISSING');
    if (!draftRow) reasons.push('T1_DRAFT_ROW_MISSING');
    if (gateRow && gateRow.readyForSourceCopy !== approved) reasons.push(`T1_GATE_READY_STATE_MISMATCH:${gateRow.readyForSourceCopy}:${approved}`);
    if (approved && gateRow && gateRow.readyForSourceCopy !== true) reasons.push('T1_APPROVED_ROW_NOT_READY_FOR_SOURCE_COPY');
    if (approved && (gateRow?.reasons ?? []).length > 0) reasons.push(...gateRow.reasons);
    if (!approved && String(templateRow.correctedPath ?? '').trim() !== '') rowWarnings.push('T1_NON_APPROVED_ROW_HAS_CORRECTED_PATH');
    if (correctedPathMatchesDraft) rowWarnings.push('T1_CORRECTED_PATH_MATCHES_DRAFT_CONFIRM_OPERATOR_INTENT');

    return {
      templateRowId: templateRow.templateRowId,
      editableTarget: inputRow?.editableTarget ?? '',
      block: templateRow.block,
      blockRole: templateRow.blockRole,
      operatorDecision: templateRow.operatorDecision,
      approved,
      gateReadyForSourceCopy: gateRow?.readyForSourceCopy === true,
      correctedPathPointCount: gateRow?.correctedPathPointCount ?? 0,
      draftPathPointCount: draftRow?.draftPathPointCount ?? 0,
      currentLabelToDraftDistance: draftRow?.currentLabelToDraftDistance ?? null,
      draftTopHit: draftRow?.draftTopHit ?? '',
      correctedPathMatchesDraft,
      reasons,
      warnings: rowWarnings,
      nextAction: approved
        ? 'Keep row approved only if the operator has verified correctedPath against the official PNG.'
        : 'Fill operatorDecision=APPROVED, correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt after operator tracing.',
    };
  });

  const invalidRows = rows.filter((row) => row.reasons.length > 0);
  if (invalidRows.length > 0) blockers.push(`T1_INVALID_READY_ROWS:${invalidRows.map((row) => row.templateRowId).join(' ')}`);

  const completeT1Approval = approvedRows.length === EXPECTED_BLOCKS.length
    && rows.every((row) => row.approved && row.gateReadyForSourceCopy && row.reasons.length === 0);
  const readyForT1SourceCopyDryRun = blockers.length === 0 && completeT1Approval;
  const globalGateStatus = gate.summary?.status ?? 'missing-gate-status';
  const readyForGlobalSourceCopy = globalGateStatus === 'ready-for-source-copy';

  if (readyForT1SourceCopyDryRun && !readyForGlobalSourceCopy) {
    warnings.push(`T1_READY_BUT_GLOBAL_PAIRED_GATE_NOT_READY:${globalGateStatus}`);
  }
  if (approvedRows.length === 0) warnings.push('T1_APPROVAL_READINESS_HAS_NO_APPROVED_ROWS');
  if (rows.some((row) => row.correctedPathMatchesDraft)) {
    warnings.push('T1_APPROVED_ROW_MATCHES_DRAFT_PATH_CONFIRM_OPERATOR_INTENT');
  }

  const status = blockers.length > 0
    ? partialApproval
      ? 'blocked-partial-t1-approval'
      : 'blocked'
    : readyForT1SourceCopyDryRun
      ? 'ready-for-t1-source-copy-dry-run'
      : 'waiting-for-t1-operator';

  const summary = {
    readinessVersion: READINESS_VERSION,
    status,
    groupId: GROUP_ID,
    expectedBlocks: EXPECTED_BLOCKS,
    globalGateStatus,
    totalRows: rows.length,
    approvedRows: approvedRows.length,
    invalidRows: invalidRows.length,
    completeT1Approval,
    readyForT1SourceCopyDryRun,
    readyForGlobalSourceCopy,
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesSourceInput: false,
    writesOperatorDecision: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      templateGate: path.relative(frontendRoot, templateGatePath),
      template: path.relative(frontendRoot, templatePath),
      t1InputPack: path.relative(frontendRoot, t1InputPackPath),
      t1CoordinateDraft: path.relative(frontendRoot, t1DraftPath),
    },
    safetyContract: [
      'This T1 approval readiness gate is read-only.',
      'It never writes source input.',
      'It never writes operatorDecision or corrected fields.',
      'It never writes the main corrections template.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'T1 source-copy dry-run remains blocked unless T1-1, T1-2, and TC-1 are all APPROVED and template-gate-ready.',
      'Production source write remains separate from this readiness gate.',
    ],
    operatorChecklist: [
      'Approve T1-1, T1-2, and TC-1 together or leave all three pending.',
      'Each approved row must include correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt.',
      'Run npm run stadium:daegu:p1-paired-ownership-template-gate after editing operator rows.',
      'Use ready-for-t1-source-copy-dry-run only as a dry-run readiness state, not as production release approval.',
    ],
    group: {
      groupId: GROUP_ID,
      approvedRows: groupGate?.approvedRows ?? 0,
      totalRows: groupGate?.totalRows ?? 0,
      completeApproval: groupGate?.completeApproval ?? false,
      groupReasons: groupGate?.groupReasons ?? [],
    },
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t1-approval-readiness.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t1-approval-readiness.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t1-approval-readiness.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'block',
      'operatorDecision',
      'approved',
      'gateReadyForSourceCopy',
      'correctedPathPointCount',
      'currentLabelToDraftDistance',
      'correctedPathMatchesDraft',
      'reasons',
      'warnings',
      'nextAction',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.block,
      row.operatorDecision,
      row.approved,
      row.gateReadyForSourceCopy,
      row.correctedPathPointCount,
      row.currentLabelToDraftDistance ?? '',
      row.correctedPathMatchesDraft,
      row.reasons.join(' '),
      row.warnings.join(' '),
      row.nextAction,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T1 Approval Readiness',
    '',
    `- readiness version: \`${READINESS_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- group: \`${GROUP_ID}\``,
    `- approved rows: ${summary.approvedRows}/${summary.totalRows}`,
    `- complete T1 approval: ${summary.completeT1Approval}`,
    `- ready for T1 source-copy dry-run: ${summary.readyForT1SourceCopyDryRun}`,
    `- global paired gate status: \`${summary.globalGateStatus}\``,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Rows',
    '',
    markdownTable(
      ['template row', 'block', 'decision', 'gate ready', 'draft distance', 'matches draft', 'reasons', 'warnings'],
      rows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        `\`${row.operatorDecision}\``,
        String(row.gateReadyForSourceCopy),
        row.currentLabelToDraftDistance ?? '-',
        String(row.correctedPathMatchesDraft),
        row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
        row.warnings.map((warning) => `\`${warning}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Operator Checklist',
    '',
    ...report.operatorChecklist.map((line) => `- ${line}`),
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

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    rows: summary.totalRows,
    approvedRows: summary.approvedRows,
    readyForT1SourceCopyDryRun: summary.readyForT1SourceCopyDryRun,
    readyForGlobalSourceCopy: summary.readyForGlobalSourceCopy,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (summary.status === 'blocked' || summary.status === 'blocked-partial-t1-approval') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT1CoordinateDraft = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const DRAFT_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T1_COORDINATE_DRAFT_V1';
  const T1_INPUT_PACK_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T1_INPUT_PACK_V1';
  const GROUP_ID = 'P1_T1_TABLE_OWNERSHIP';
  const EXPECTED_BLOCKS = ['T1-1', 'T1-2', 'TC-1'];
  const CROP = { left: 900, top: 920, width: 260, height: 245 };

  const COLOR_PROFILES = {
    tealTable: {
      label: 'teal table block',
      range: {
        minR: 50,
        maxR: 115,
        minG: 130,
        maxG: 205,
        minB: 135,
        maxB: 215,
      },
    },
    yellowTable: {
      label: 'yellow central table block',
      range: {
        minR: 185,
        maxR: 245,
        minG: 145,
        maxG: 210,
        minB: 10,
        maxB: 85,
      },
    },
  };

  const DRAFT_ROWS = [
    {
      block: 'T1-1',
      draftLabel: [1031, 1030],
      draftPathCandidate: 'M 995 1017 L 1060 1017 L 1060 1054 L 1023 1040 L 986 1026 Z',
      colorProfile: 'tealTable',
      expectedComponentBbox: [986, 1017, 1060, 1054],
      draftReason: 'Official teal trapezoid labelled T1-1. Current T1-1 is shifted into the central table area.',
    },
    {
      block: 'T1-2',
      draftLabel: [1020, 986],
      draftPathCandidate: 'M 991 962 L 1048 962 L 1048 1011 L 991 1011 Z',
      colorProfile: 'tealTable',
      expectedComponentBbox: [991, 962, 1048, 1011],
      draftReason: 'Official teal rectangle labelled T1-2. Current T1-2 occupies the lower T1-1 shape.',
    },
    {
      block: 'TC-1',
      draftLabel: [1020, 1058],
      draftPathCandidate: 'M 977 1030 L 990 1032 L 1058 1060 L 1030 1088 L 1004 1061 Z',
      colorProfile: 'yellowTable',
      expectedComponentBbox: [977, 1030, 1058, 1087],
      draftReason: 'Official yellow central table polygon labelled TC-1. Included so T1 ownership is reviewed as a full group.',
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

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const parsePathPoints = (pathData) => {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  };

  const parseLabelPoint = (value) => {
    if (Array.isArray(value) && value.length >= 2) return [Number(value[0]), Number(value[1])];
    const numbers = String(value ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    return [numbers[0], numbers[1]];
  };

  const pathBounds = (pathData) => {
    const points = parsePathPoints(pathData);
    if (points.length === 0) return null;
    return [
      Math.min(...points.map(([x]) => x)),
      Math.min(...points.map(([, y]) => y)),
      Math.max(...points.map(([x]) => x)),
      Math.max(...points.map(([, y]) => y)),
    ];
  };

  const bboxArea = ([minX, minY, maxX, maxY]) => Math.max(0, maxX - minX) * Math.max(0, maxY - minY);

  const bboxIntersectionArea = (left, right) => {
    const minX = Math.max(left[0], right[0]);
    const minY = Math.max(left[1], right[1]);
    const maxX = Math.min(left[2], right[2]);
    const maxY = Math.min(left[3], right[3]);
    return bboxArea([minX, minY, maxX, maxY]);
  };

  const bboxIou = (left, right) => {
    const intersection = bboxIntersectionArea(left, right);
    const union = bboxArea(left) + bboxArea(right) - intersection;
    return union > 0 ? intersection / union : 0;
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

  const polygonOverlap = (left, right) => (
    left.some((point) => pointInPolygon(point, right))
    || right.some((point) => pointInPolygon(point, left))
    || left.some((start, index) => {
      const end = left[(index + 1) % left.length];
      return right.some((otherStart, otherIndex) => (
        segmentsIntersect(start, end, otherStart, right[(otherIndex + 1) % right.length])
      ));
    })
  );

  const distance = ([x1, y1], [x2, y2]) => Math.hypot(x1 - x2, y1 - y2);

  const matchesColor = (r, g, b, range) => (
    r >= range.minR && r <= range.maxR
    && g >= range.minG && g <= range.maxG
    && b >= range.minB && b <= range.maxB
  );

  const collectComponents = ({ data, info }, profile) => {
    const { left, top, width, height } = CROP;
    const mask = new Uint8Array(width * height);
    for (let y = top; y < top + height; y += 1) {
      for (let x = left; x < left + width; x += 1) {
        const offset = (y * info.width + x) * info.channels;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const a = info.channels === 4 ? data[offset + 3] : 255;
        if (a >= 128 && matchesColor(r, g, b, profile.range)) {
          mask[(y - top) * width + (x - left)] = 1;
        }
      }
    }

    const seen = new Uint8Array(width * height);
    const components = [];
    const queue = [];
    for (let localY = 0; localY < height; localY += 1) {
      for (let localX = 0; localX < width; localX += 1) {
        const startIndex = localY * width + localX;
        if (!mask[startIndex] || seen[startIndex]) continue;

        let minX = localX;
        let maxX = localX;
        let minY = localY;
        let maxY = localY;
        let count = 0;
        queue.length = 0;
        queue.push([localX, localY]);
        seen[startIndex] = 1;

        for (let index = 0; index < queue.length; index += 1) {
          const [x, y] = queue[index];
          count += 1;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);

          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nextX = x + dx;
            const nextY = y + dy;
            if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
            const nextIndex = nextY * width + nextX;
            if (!mask[nextIndex] || seen[nextIndex]) continue;
            seen[nextIndex] = 1;
            queue.push([nextX, nextY]);
          }
        }

        if (count >= 20) {
          components.push({
            count,
            bbox: [minX + left, minY + top, maxX + left, maxY + top],
          });
        }
      }
    }

    return components.sort((leftComponent, rightComponent) => rightComponent.count - leftComponent.count);
  };

  const pathToLocal = (pathData) => {
    let coordinateIndex = 0;
    return String(pathData).replace(/-?\d+(?:\.\d+)?/g, (match) => {
      const value = Number(match);
      const localValue = coordinateIndex % 2 === 0 ? value - CROP.left : value - CROP.top;
      coordinateIndex += 1;
      return String(localValue);
    });
  };

  const pathToScaledLocal = (pathData, scale) => {
    let coordinateIndex = 0;
    return String(pathData).replace(/-?\d+(?:\.\d+)?/g, (match) => {
      const value = Number(match);
      const localValue = coordinateIndex % 2 === 0 ? value - CROP.left : value - CROP.top;
      coordinateIndex += 1;
      return String(localValue * scale);
    });
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue(
    '--output-dir',
    path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t1-coordinate-draft'),
  ));
  const t1InputPackPath = path.resolve(
    frontendRoot,
    argValue('--t1-input-pack', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t1-input-pack.json')),
  );
  const imagePath = path.resolve(frontendRoot, DAEGU_SEATMAP_IMAGE.imagePath);
  const blockers = [];
  const warnings = [];

  const t1InputPack = await readJson(t1InputPackPath);
  if (t1InputPack.summary?.packVersion !== T1_INPUT_PACK_VERSION) {
    blockers.push(`T1_INPUT_PACK_VERSION_MISMATCH:${t1InputPack.summary?.packVersion ?? ''}`);
  }
  if (t1InputPack.summary?.groupId !== GROUP_ID) blockers.push(`T1_GROUP_MISMATCH:${t1InputPack.summary?.groupId ?? ''}`);
  if (t1InputPack.summary?.productionWriteAllowed !== false) blockers.push('T1_INPUT_PACK_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

  const inputRows = (t1InputPack.rows ?? []).filter((row) => row.templateRowId?.startsWith(`${GROUP_ID}:`));
  const inputBlocks = inputRows.map((row) => row.block);
  if (inputBlocks.join(' ') !== EXPECTED_BLOCKS.join(' ')) {
    blockers.push(`T1_INPUT_BLOCK_ORDER_MISMATCH:${inputBlocks.join(' ')}`);
  }

  const imageBuffer = await fs.readFile(imagePath);
  const imageSha256 = crypto.createHash('sha256').update(imageBuffer).digest('hex');
  if (imageSha256 !== DAEGU_SEATMAP_IMAGE.imageSha256) {
    blockers.push(`OFFICIAL_IMAGE_SHA256_MISMATCH:${imageSha256}`);
  }

  const rawImage = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  const componentsByProfile = Object.fromEntries(Object.entries(COLOR_PROFILES).map(([key, profile]) => [
    key,
    collectComponents(rawImage, profile),
  ]));

  const draftPolygons = Object.fromEntries(DRAFT_ROWS.map((row) => [
    row.block,
    parsePathPoints(row.draftPathCandidate),
  ]));

  const topHitForLabel = (label) => {
    const hits = DRAFT_ROWS
      .filter((row) => pointInPolygon(label, draftPolygons[row.block]))
      .map((row) => row.block);
    return {
      hits,
      topHit: hits[0] ?? '',
    };
  };

  const overlapPairs = [];
  for (let leftIndex = 0; leftIndex < DRAFT_ROWS.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < DRAFT_ROWS.length; rightIndex += 1) {
      const left = DRAFT_ROWS[leftIndex];
      const right = DRAFT_ROWS[rightIndex];
      if (polygonOverlap(draftPolygons[left.block], draftPolygons[right.block])) {
        overlapPairs.push(`${left.block}:${right.block}`);
      }
    }
  }
  if (overlapPairs.length > 0) blockers.push(`T1_DRAFT_PATH_OVERLAP:${overlapPairs.join('|')}`);

  const rows = DRAFT_ROWS.map((draftRow) => {
    const inputRow = inputRows.find((row) => row.block === draftRow.block);
    const profileComponents = componentsByProfile[draftRow.colorProfile] ?? [];
    const component = profileComponents
      .map((candidate) => ({
        ...candidate,
        expectedBboxIou: bboxIou(candidate.bbox, draftRow.expectedComponentBbox),
      }))
      .sort((left, right) => right.expectedBboxIou - left.expectedBboxIou)[0] ?? null;
    const draftPoints = draftPolygons[draftRow.block];
    const draftBounds = pathBounds(draftRow.draftPathCandidate);
    const labelInsideDraft = pointInPolygon(draftRow.draftLabel, draftPoints);
    const selfIntersection = hasSelfIntersection(draftPoints);
    const boundsInsideImage = draftPoints.every(([x, y]) => (
      x >= 0 && x <= DAEGU_SEATMAP_IMAGE.imageWidth && y >= 0 && y <= DAEGU_SEATMAP_IMAGE.imageHeight
    ));
    const draftTopHit = topHitForLabel(draftRow.draftLabel);
    const currentLabel = parseLabelPoint(inputRow?.currentLabelPoint);
    const currentLabelToDraftDistance = Number.isFinite(currentLabel[0]) && Number.isFinite(currentLabel[1])
      ? Number(distance(currentLabel, draftRow.draftLabel).toFixed(2))
      : null;
    const riskFlags = [
      'DRAFT_ONLY',
      'OPERATOR_APPROVAL_REQUIRED',
      'DO_NOT_COPY_DRAFT_INTO_CORRECTED_PATH_WITHOUT_OPERATOR_REVIEW',
    ];

    if (!component) riskFlags.push('COLOR_COMPONENT_NOT_FOUND');
    if ((component?.expectedBboxIou ?? 0) < 0.65) riskFlags.push('LOW_COMPONENT_BBOX_MATCH');
    if (!labelInsideDraft) riskFlags.push('DRAFT_LABEL_OUTSIDE_PATH');
    if (selfIntersection) riskFlags.push('DRAFT_SELF_INTERSECTION');
    if (!boundsInsideImage) riskFlags.push('DRAFT_OUT_OF_BOUNDS');
    if (draftTopHit.topHit !== draftRow.block || draftTopHit.hits.length !== 1) riskFlags.push('DRAFT_LABEL_TOP_HIT_REVIEW');
    if ((currentLabelToDraftDistance ?? 0) > 20) riskFlags.push('CURRENT_LABEL_SHIFT_GT_20');

    return {
      templateRowId: inputRow?.templateRowId ?? `${GROUP_ID}:${draftRow.block}`,
      editableTarget: inputRow?.editableTarget ?? '',
      block: draftRow.block,
      currentPathPointCount: inputRow?.currentPathPointCount ?? 0,
      currentLabelPoint: inputRow?.currentLabelPoint ?? '',
      currentLabelToDraftDistance,
      draftPathCandidate: draftRow.draftPathCandidate,
      draftPathPointCount: draftPoints.length,
      draftLabelX: draftRow.draftLabel[0],
      draftLabelY: draftRow.draftLabel[1],
      draftBounds,
      colorProfile: draftRow.colorProfile,
      componentBbox: component?.bbox ?? null,
      componentAreaPx: component?.count ?? 0,
      componentBboxIou: component ? Number(component.expectedBboxIou.toFixed(3)) : 0,
      labelInsideDraft,
      selfIntersection,
      boundsInsideImage,
      draftTopHit: draftTopHit.topHit,
      draftTopHitCandidates: draftTopHit.hits,
      riskFlags,
      draftReason: draftRow.draftReason,
    };
  });

  for (const row of rows) {
    if (row.riskFlags.includes('COLOR_COMPONENT_NOT_FOUND')) blockers.push(`T1_COLOR_COMPONENT_NOT_FOUND:${row.block}`);
    if (!row.labelInsideDraft) blockers.push(`T1_DRAFT_LABEL_OUTSIDE_PATH:${row.block}`);
    if (row.selfIntersection) blockers.push(`T1_DRAFT_SELF_INTERSECTION:${row.block}`);
    if (!row.boundsInsideImage) blockers.push(`T1_DRAFT_OUT_OF_BOUNDS:${row.block}`);
    if (row.draftTopHit !== row.block || row.draftTopHitCandidates.length !== 1) {
      blockers.push(`T1_DRAFT_LABEL_TOP_HIT_MISMATCH:${row.block}:${row.draftTopHit || 'none'}`);
    }
  }

  const status = blockers.length > 0 ? 'blocked' : 'draft-ready-for-operator-review';
  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t1-coordinate-draft.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t1-coordinate-draft.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t1-coordinate-draft.md');
  const svgPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t1-coordinate-draft.svg');
  const pngPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t1-coordinate-draft.png');

  const summary = {
    draftVersion: DRAFT_VERSION,
    status,
    groupId: GROUP_ID,
    sourceImage: DAEGU_SEATMAP_IMAGE.imagePath,
    imageSha256,
    expectedImageSha256: DAEGU_SEATMAP_IMAGE.imageSha256,
    sha256MatchesExpected: imageSha256 === DAEGU_SEATMAP_IMAGE.imageSha256,
    viewBox: DAEGU_SEATMAP_IMAGE.viewBox,
    t1InputPack: path.relative(frontendRoot, t1InputPackPath),
    outputJson: path.relative(frontendRoot, jsonPath),
    outputCsv: path.relative(frontendRoot, csvPath),
    outputMarkdown: path.relative(frontendRoot, markdownPath),
    outputSvg: path.relative(frontendRoot, svgPath),
    outputPng: path.relative(frontendRoot, pngPath),
    rows: rows.length,
    productionWriteAllowed: false,
    sourceOfTruth: false,
    operatorApprovalRequired: true,
    writesSourceInput: false,
    writesOperatorDecision: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    crop: CROP,
    colorProfiles: COLOR_PROFILES,
    safetyContract: [
      'This T1 coordinate draft is read-only evidence.',
      'It uses only the official Daegu PNG and existing operator workflow inputs.',
      'No external baseball data, web search, or automatic production promotion is used.',
      'draftPathCandidate is reference-only and must not be copied into correctedPath without operator tracing/review.',
      'It never writes source input.',
      'It never writes operatorDecision or corrected fields.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
    ],
    operatorChecklist: [
      'Open the SVG/PNG overlay and compare each draftPathCandidate against the official PNG.',
      'If the operator accepts a shape, retrace or intentionally enter correctedPath in the paired ownership operator template.',
      'Set operatorDecision=APPROVED only after correctedPath, correctedLabelX/Y, reviewer, and reviewedAt are filled.',
      'Approve T1-1, T1-2, and TC-1 together or leave all three pending.',
      'Run npm run stadium:daegu:p1-paired-ownership-entry-preflight and npm run stadium:daegu:p1-paired-ownership-template-gate after editing.',
    ],
    componentsByProfile,
    overlapPairs,
    rows,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'editableTarget',
      'block',
      'draftPathCandidate',
      'draftLabelX',
      'draftLabelY',
      'componentBbox',
      'componentAreaPx',
      'componentBboxIou',
      'currentLabelToDraftDistance',
      'labelInsideDraft',
      'draftTopHit',
      'riskFlags',
      'draftReason',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.editableTarget,
      row.block,
      row.draftPathCandidate,
      row.draftLabelX,
      row.draftLabelY,
      row.componentBbox,
      row.componentAreaPx,
      row.componentBboxIou,
      row.currentLabelToDraftDistance,
      row.labelInsideDraft,
      row.draftTopHit,
      row.riskFlags.join(' '),
      row.draftReason,
    ]),
  ]);

  const imageHref = path.relative(path.dirname(svgPath), imagePath);
  const svgOverlay = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CROP.left} ${CROP.top} ${CROP.width} ${CROP.height}" width="${CROP.width}" height="${CROP.height}">`,
    '<style>',
    '.official-image { opacity: 0.94; }',
    '.draft-path { fill: rgba(16, 185, 129, 0.24); stroke: #059669; stroke-width: 4; vector-effect: non-scaling-stroke; }',
    '.component-box { fill: none; stroke: #f97316; stroke-width: 2.5; stroke-dasharray: 7 4; vector-effect: non-scaling-stroke; }',
    '.label-dot { fill: #111827; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }',
    '.label-text { font: 900 17px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 5; paint-order: stroke; }',
    '.title { font: 900 18px Arial, sans-serif; fill: #064e3b; stroke: #fff; stroke-width: 5; paint-order: stroke; }',
    '.note { font: 800 12px Arial, sans-serif; fill: #92400e; stroke: #fff; stroke-width: 4; paint-order: stroke; }',
    '</style>',
    `<image class="official-image" href="${xmlEscape(imageHref)}" x="0" y="0" width="${DAEGU_SEATMAP_IMAGE.imageWidth}" height="${DAEGU_SEATMAP_IMAGE.imageHeight}" preserveAspectRatio="none" />`,
    ...rows.map((row) => `<path class="draft-path" d="${xmlEscape(row.draftPathCandidate)}"><title>${xmlEscape(`${row.block} draftPathCandidate`)}</title></path>`),
    ...rows.filter((row) => row.componentBbox).map((row) => {
      const [minX, minY, maxX, maxY] = row.componentBbox;
      return `<rect class="component-box" x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}"><title>${xmlEscape(`${row.block} color component`)}</title></rect>`;
    }),
    ...rows.map((row) => [
      `<circle class="label-dot" cx="${row.draftLabelX}" cy="${row.draftLabelY}" r="5" />`,
      `<text class="label-text" x="${row.draftLabelX + 8}" y="${row.draftLabelY - 8}">${xmlEscape(row.block)}</text>`,
    ].join('\n')),
    `<text class="title" x="${CROP.left + 10}" y="${CROP.top + 24}">${xmlEscape('T1 paired ownership coordinate draft')}</text>`,
    `<text class="note" x="${CROP.left + 10}" y="${CROP.top + 43}">${xmlEscape('Green=draftPathCandidate, orange=color component bbox. Evidence only.')}</text>`,
    '</svg>',
  ].join('\n');
  await fs.writeFile(svgPath, `${svgOverlay}\n`, 'utf8');

  const pngScale = 4;
  const scaledCropWidth = CROP.width * pngScale;
  const scaledCropHeight = CROP.height * pngScale;
  const base = await sharp(imagePath)
    .extract(CROP)
    .resize({ width: scaledCropWidth, kernel: 'nearest' })
    .png()
    .toBuffer();
  const localSvgOverlay = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${scaledCropWidth}" height="${scaledCropHeight}" viewBox="0 0 ${scaledCropWidth} ${scaledCropHeight}">`,
    '<style>',
    '.draft-path { fill: rgba(16,185,129,0.24); stroke: #059669; stroke-width: 8; }',
    '.component-box { fill: none; stroke: #f97316; stroke-width: 6; stroke-dasharray: 18 10; }',
    '.label-dot { fill: #111827; stroke: #fff; stroke-width: 6; }',
    '.label-text { font: 800 44px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 10; paint-order: stroke; }',
    '</style>',
    ...rows.map((row) => `<path class="draft-path" d="${pathToScaledLocal(row.draftPathCandidate, pngScale)}" />`),
    ...rows.filter((row) => row.componentBbox).map((row) => {
      const [minX, minY, maxX, maxY] = row.componentBbox;
      return `<rect class="component-box" x="${(minX - CROP.left) * pngScale}" y="${(minY - CROP.top) * pngScale}" width="${(maxX - minX) * pngScale}" height="${(maxY - minY) * pngScale}" />`;
    }),
    ...rows.map((row) => [
      `<circle class="label-dot" cx="${(row.draftLabelX - CROP.left) * pngScale}" cy="${(row.draftLabelY - CROP.top) * pngScale}" r="14" />`,
      `<text class="label-text" x="${(row.draftLabelX - CROP.left) * pngScale + 24}" y="${(row.draftLabelY - CROP.top) * pngScale - 20}">${xmlEscape(row.block)}</text>`,
    ].join('\n')),
    '</svg>',
  ].join('\n');
  await sharp(base)
    .composite([{ input: Buffer.from(localSvgOverlay), left: 0, top: 0 }])
    .png()
    .toFile(pngPath);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T1 Coordinate Draft',
    '',
    `- draft version: \`${DRAFT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- group: \`${GROUP_ID}\``,
    `- source image: \`${summary.sourceImage}\``,
    `- image sha256 matches expected: ${summary.sha256MatchesExpected}`,
    `- svg overlay: \`${summary.outputSvg}\``,
    `- png overlay: \`${summary.outputPng}\``,
    '- production write allowed: false',
    '- operator approval required: true',
    '',
    '## Draft Rows',
    '',
    markdownTable(
      ['block', 'draft path candidate', 'draft label', 'component bbox', 'bbox iou', 'label top-hit', 'current label distance', 'risk flags'],
      rows.map((row) => [
        `\`${row.block}\``,
        `\`${row.draftPathCandidate}\``,
        `${row.draftLabelX},${row.draftLabelY}`,
        row.componentBbox ? `\`${row.componentBbox.join(' ')}\`` : '-',
        row.componentBboxIou,
        `\`${row.draftTopHit || '-'}\``,
        row.currentLabelToDraftDistance ?? '-',
        row.riskFlags.map((flag) => `\`${flag}\``).join('<br>'),
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Operator Checklist',
    '',
    ...report.operatorChecklist.map((line) => `- ${line}`),
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

  console.log(JSON.stringify({
    status: summary.status,
    output: summary.outputMarkdown,
    svg: summary.outputSvg,
    png: summary.outputPng,
    rows: summary.rows,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT1InputPack = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const PACK_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T1_INPUT_PACK_V1';
  const ENTRY_SHEET_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_ENTRY_SHEET_V1';
  const TRACING_PACK_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_TRACING_PACK_V1';
  const PREFLIGHT_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_ENTRY_PREFLIGHT_V1';
  const TEMPLATE_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_TEMPLATE_GATE_V1';
  const GROUP_ID = 'P1_T1_TABLE_OWNERSHIP';
  const EXPECTED_BLOCKS = ['T1-1', 'T1-2', 'TC-1'];

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

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const entrySheetPath = path.resolve(
    frontendRoot,
    argValue('--entry-sheet', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-entry-sheet.json')),
  );
  const tracingPackPath = path.resolve(
    frontendRoot,
    argValue(
      '--tracing-pack',
      path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-tracing-pack/daegu-seatmap-p1-paired-ownership-tracing-pack.json'),
    ),
  );
  const preflightPath = path.resolve(
    frontendRoot,
    argValue('--preflight', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-entry-preflight.json')),
  );
  const templateGatePath = path.resolve(
    frontendRoot,
    argValue('--template-gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-template-gate.json')),
  );

  const entrySheet = await readJson(entrySheetPath);
  const tracingPack = await readJson(tracingPackPath);
  const preflight = await readJson(preflightPath);
  const templateGate = await readJson(templateGatePath);
  const blockers = [];
  const warnings = [];

  if (entrySheet.summary?.entrySheetVersion !== ENTRY_SHEET_VERSION) {
    blockers.push(`ENTRY_SHEET_VERSION_MISMATCH:${entrySheet.summary?.entrySheetVersion ?? ''}`);
  }
  if (tracingPack.summary?.tracingPackVersion !== TRACING_PACK_VERSION) {
    blockers.push(`TRACING_PACK_VERSION_MISMATCH:${tracingPack.summary?.tracingPackVersion ?? ''}`);
  }
  if (preflight.summary?.preflightVersion !== PREFLIGHT_VERSION) {
    blockers.push(`PREFLIGHT_VERSION_MISMATCH:${preflight.summary?.preflightVersion ?? ''}`);
  }
  if (templateGate.summary?.gateVersion !== TEMPLATE_GATE_VERSION) {
    blockers.push(`TEMPLATE_GATE_VERSION_MISMATCH:${templateGate.summary?.gateVersion ?? ''}`);
  }
  if (entrySheet.summary?.productionWriteAllowed !== false) blockers.push('ENTRY_SHEET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (tracingPack.summary?.productionWriteAllowed !== false) blockers.push('TRACING_PACK_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (preflight.summary?.productionWriteAllowed !== false) blockers.push('PREFLIGHT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (templateGate.summary?.productionWriteAllowed !== false) blockers.push('TEMPLATE_GATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

  const entryRows = (entrySheet.rows ?? []).filter((row) => row.groupId === GROUP_ID);
  const preflightRows = (preflight.rows ?? []).filter((row) => row.groupId === GROUP_ID);
  const gateRows = (templateGate.rows ?? []).filter((row) => row.groupId === GROUP_ID);
  const tracingGroup = (tracingPack.groups ?? []).find((group) => group.groupId === GROUP_ID);
  const entryBlocks = entryRows.map((row) => row.block);

  if (entryRows.length !== EXPECTED_BLOCKS.length) blockers.push(`T1_ENTRY_ROW_COUNT_MISMATCH:${entryRows.length}:${EXPECTED_BLOCKS.length}`);
  if (entryBlocks.join(' ') !== EXPECTED_BLOCKS.join(' ')) blockers.push(`T1_ENTRY_BLOCK_ORDER_MISMATCH:${entryBlocks.join(' ')}`);
  if (!tracingGroup) blockers.push('T1_TRACING_GROUP_MISSING');
  if (preflightRows.length !== EXPECTED_BLOCKS.length) blockers.push(`T1_PREFLIGHT_ROW_COUNT_MISMATCH:${preflightRows.length}:${EXPECTED_BLOCKS.length}`);
  if (gateRows.length !== EXPECTED_BLOCKS.length) blockers.push(`T1_GATE_ROW_COUNT_MISMATCH:${gateRows.length}:${EXPECTED_BLOCKS.length}`);

  const approvedRows = entryRows.filter((row) => row.operatorDecision === 'APPROVED');
  const rowsWaitingForOperator = entryRows.filter((row) => row.operatorDecision !== 'APPROVED');
  const groupPartialApproval = approvedRows.length > 0 && approvedRows.length < entryRows.length;
  if (groupPartialApproval) blockers.push(`T1_PARTIAL_APPROVAL_BLOCKED:${approvedRows.length}:${entryRows.length}`);

  const rows = entryRows.map((entryRow) => {
    const preflightRow = preflightRows.find((row) => row.templateRowId === entryRow.templateRowId);
    const gateRow = gateRows.find((row) => row.templateRowId === entryRow.templateRowId);
    return {
      templateRowId: entryRow.templateRowId,
      editableTarget: entryRow.editableTarget,
      templateJsonPointer: entryRow.templateJsonPointer,
      block: entryRow.block,
      blockRole: entryRow.blockRole,
      currentLabelPoint: entryRow.currentLabelPoint,
      currentPathPointCount: entryRow.currentPathPointCount,
      operatorDecision: entryRow.operatorDecision,
      correctedPathFilled: entryRow.correctedPathFilled,
      correctedPathPointCount: entryRow.correctedPathPointCount,
      missingApprovalFields: entryRow.missingApprovalFields,
      preflightReady: preflightRow?.readyForTemplateGate ?? false,
      preflightReasons: preflightRow?.reasons ?? [],
      gateReadyForSourceCopy: gateRow?.readyForSourceCopy ?? false,
      gateReasons: gateRow?.reasons ?? [],
      nextOperatorAction: entryRow.nextOperatorAction,
    };
  });

  const status = blockers.length > 0
    ? 'blocked'
    : approvedRows.length === 0
      ? 'waiting-for-t1-operator'
      : approvedRows.length === entryRows.length
        ? 'ready-for-t1-template-gate'
        : 'blocked';

  const summary = {
    packVersion: PACK_VERSION,
    status,
    groupId: GROUP_ID,
    entrySheet: path.relative(frontendRoot, entrySheetPath),
    tracingPack: path.relative(frontendRoot, tracingPackPath),
    preflight: path.relative(frontendRoot, preflightPath),
    templateGate: path.relative(frontendRoot, templateGatePath),
    tracingSvg: tracingGroup?.tracingSvg ?? '',
    affectedBlocks: EXPECTED_BLOCKS,
    totalRows: rows.length,
    approvedRows: approvedRows.length,
    rowsWaitingForOperator: rowsWaitingForOperator.length,
    productionWriteAllowed: false,
    writesSourceInput: false,
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
      'This T1 input pack is read-only.',
      'It narrows the paired ownership workflow to T1-1, T1-2, and TC-1.',
      'It never writes source input.',
      'It never writes operatorDecision or corrected fields.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'T1 source-copy remains blocked until all three T1 rows are APPROVED and the paired ownership template gate passes.',
    ],
    operatorChecklist: [
      'Open the T1 tracing SVG and official PNG background.',
      'Trace T1-1, T1-2, and TC-1 as separate non-overlapping correctedPath values.',
      'Keep each correctedLabelX/Y inside its own correctedPath.',
      'Do not let a correctedPath capture another row label.',
      'Approve all three T1 rows together or leave all three pending.',
      'Run npm run stadium:daegu:p1-paired-ownership-entry-preflight after editing.',
      'Run npm run stadium:daegu:p1-paired-ownership-template-gate before any source-copy discussion.',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t1-input-pack.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t1-input-pack.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t1-input-pack.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'editableTarget',
      'block',
      'blockRole',
      'currentLabelPoint',
      'currentPathPointCount',
      'operatorDecision',
      'missingApprovalFields',
      'preflightReady',
      'gateReadyForSourceCopy',
      'nextOperatorAction',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.editableTarget,
      row.block,
      row.blockRole,
      row.currentLabelPoint,
      row.currentPathPointCount,
      row.operatorDecision,
      row.missingApprovalFields.join(' '),
      row.preflightReady,
      row.gateReadyForSourceCopy,
      row.nextOperatorAction,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T1 Input Pack',
    '',
    `- pack version: \`${PACK_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- group: \`${GROUP_ID}\``,
    `- rows: ${summary.totalRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- rows waiting for operator: ${summary.rowsWaitingForOperator}`,
    `- tracing svg: ${summary.tracingSvg ? `\`${summary.tracingSvg}\`` : '-'}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Operator Checklist',
    '',
    ...report.operatorChecklist.map((line) => `- ${line}`),
    '',
    '## T1 Rows',
    '',
    markdownTable(
      ['template row', 'editable target', 'role', 'block', 'label', 'points', 'decision', 'missing input', 'gate reasons'],
      rows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.editableTarget}\``,
        `\`${row.blockRole}\``,
        `\`${row.block}\``,
        row.currentLabelPoint,
        row.currentPathPointCount,
        `\`${row.operatorDecision}\``,
        row.missingApprovalFields.map((field) => `\`${field}\``).join(' ') || '-',
        row.gateReasons.map((reason) => `\`${reason}\``).join(' ') || '-',
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

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    tracingSvg: summary.tracingSvg,
    rows: summary.totalRows,
    approvedRows: summary.approvedRows,
    rowsWaitingForOperator: summary.rowsWaitingForOperator,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VApplyPlanRegression = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultGateRegressionDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-t3-v-target-entry-gate-regression');
  const defaultOutputDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-t3-v-apply-plan-regression');

  const REGRESSION_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPLY_PLAN_REGRESSION_V1';
  const APPLY_PLAN_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPLY_PLAN_V1';
  const CASES = [
    'waiting-for-operator',
    'partial-v-approval',
    't3-duplicate-mismatch',
    'valid-target-preview',
    'context-only-row-copy-attempt',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const cloneJson = (value) => JSON.parse(JSON.stringify(value));

  const spawnNode = (scriptName, args) => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', path.join(scriptDir, scriptName), ...args],
      { cwd: frontendRoot, encoding: 'utf8' },
    );
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  };

  const includesAll = (actualValues, expectedValues = []) => expectedValues.every((expectedValue) => (
    (actualValues ?? []).includes(expectedValue)
  ));

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const gateRegressionDir = path.resolve(frontendRoot, argValue('--gate-regression-dir', defaultGateRegressionDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));

  const expected = {
    'waiting-for-operator': {
      exitCode: 0,
      status: 'waiting-for-operator',
      plannedRows: 0,
      applyDryRunReady: false,
      sourceCopyBlocked: true,
      requiredWarnings: ['T3V_APPLY_PLAN_WAITING_FOR_OPERATOR_APPROVAL'],
    },
    'partial-v-approval': {
      exitCode: 0,
      status: 'ready-for-apply-dry-run',
      plannedRows: 1,
      applyDryRunReady: true,
      sourceCopyBlocked: true,
      requiredWarnings: [
        'T3V_APPLY_PLAN_SOURCE_COPY_BLOCKED:T3V_TARGET_V_PARTIAL_APPROVAL_SOURCE_COPY_BLOCKED:1:3',
        'T3V_APPLY_PLAN_SOURCE_COPY_BLOCKED:T3V_TARGET_PARTIAL_APPROVAL_SOURCE_COPY_BLOCKED:1:5',
        'T3V_APPLY_PLAN_SOURCE_COPY_BLOCKED:T3V_CONTEXT_ONLY_ROWS_STILL_REQUIRED:7',
      ],
    },
    't3-duplicate-mismatch': {
      exitCode: 1,
      status: 'blocked',
      plannedRows: 0,
      applyDryRunReady: false,
      sourceCopyBlocked: true,
      requiredBlockers: [
        'T3V_TARGET_DUPLICATE_PATH_MISMATCH:T3-2',
        'T3V_TARGET_DUPLICATE_LABEL_MISMATCH:T3-2',
      ],
    },
    'valid-target-preview': {
      exitCode: 0,
      status: 'ready-for-apply-dry-run',
      plannedRows: 5,
      applyDryRunReady: true,
      sourceCopyBlocked: true,
      requiredWarnings: ['T3V_APPLY_PLAN_SOURCE_COPY_BLOCKED:T3V_CONTEXT_ONLY_ROWS_STILL_REQUIRED:7'],
    },
    'context-only-row-copy-attempt': {
      exitCode: 1,
      status: 'blocked',
      plannedRows: 0,
      applyDryRunReady: false,
      sourceCopyBlocked: true,
      requiredBlockerPrefixes: ['TARGET_ENTRY_TEMPLATE_ROW_ORDER_MISMATCH:'],
    },
  };

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const sourceTargetEntry = await readJson(path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.json'));
  const sourceTargetReviewPacket = await readJson(path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.json'));
  const sourcePairedTemplate = await readJson(path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json'));

  const createContextOnlyAttemptCase = async (caseDir) => {
    const targetEntry = cloneJson(sourceTargetEntry);
    const targetReviewPacket = cloneJson(sourceTargetReviewPacket);
    const pairedTemplate = cloneJson(sourcePairedTemplate);
    const referenceRow = targetEntry.rows.find((row) => row.block === 'V1') ?? targetEntry.rows[0];
    targetEntry.rows.push({
      ...referenceRow,
      templateRowId: 'P1_V_CENTER_TABLE_SPLIT:T3-3',
      editableTarget: 'context-only-row-copy-attempt',
      block: 'T3-3',
      duplicateTargetBlock: false,
      operatorDecision: 'APPROVED',
      correctedPath: referenceRow.correctedPath || 'M 800 1000 L 830 1000 L 830 1030 L 800 1030 Z',
      correctedLabelX: referenceRow.correctedLabelX || '815',
      correctedLabelY: referenceRow.correctedLabelY || '1015',
      reviewer: 'T3_V_APPLY_PLAN_REGRESSION_FIXTURE',
      reviewedAt: '2026-05-16T00:00:00.000Z',
      operatorNote: 'Context-only row copy attempt fixture; must remain blocked.',
    });

    const targetEntryPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.json');
    const targetReviewPacketPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.json');
    const pairedTemplatePath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json');
    await writeJson(targetEntryPath, targetEntry);
    await writeJson(targetReviewPacketPath, targetReviewPacket);
    await writeJson(pairedTemplatePath, pairedTemplate);

    spawnNode('daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-target-entry-gate', 
      '--target-entry',
      targetEntryPath,
      '--target-review-packet',
      targetReviewPacketPath,
      '--paired-template',
      pairedTemplatePath,
      '--output-dir',
      caseDir,
    ]);
  };

  const runApplyPlanCase = async (caseName) => {
    const caseDir = caseName === 'context-only-row-copy-attempt'
      ? path.join(outputDir, caseName)
      : path.join(gateRegressionDir, caseName);
    await fs.mkdir(caseDir, { recursive: true });
    if (caseName === 'context-only-row-copy-attempt') {
      await createContextOnlyAttemptCase(caseDir);
    }

    const run = spawnNode('daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-apply-plan', 
      '--target-entry',
      path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.json'),
      '--target-review-packet',
      path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.json'),
      '--target-entry-gate',
      path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate.json'),
      '--output-dir',
      caseDir,
    ]);
    const applyPlanPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-apply-plan.json');
    const applyPlan = await readJson(applyPlanPath);
    const overlayPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-apply-plan-overlay.svg');
    const overlayExists = await fs.stat(overlayPath).then(() => true, () => false);
    const caseExpectation = expected[caseName];
    const failures = [];

    if (run.exitCode !== caseExpectation.exitCode) failures.push(`EXIT_CODE:${run.exitCode}:${caseExpectation.exitCode}`);
    if (applyPlan.summary?.applyPlanVersion !== APPLY_PLAN_VERSION) failures.push(`APPLY_PLAN_VERSION:${applyPlan.summary?.applyPlanVersion ?? ''}`);
    if (applyPlan.summary?.status !== caseExpectation.status) failures.push(`STATUS:${applyPlan.summary?.status ?? ''}:${caseExpectation.status}`);
    if (applyPlan.summary?.plannedRows !== caseExpectation.plannedRows) failures.push(`PLANNED_ROWS:${applyPlan.summary?.plannedRows}:${caseExpectation.plannedRows}`);
    if (applyPlan.summary?.applyDryRunReady !== caseExpectation.applyDryRunReady) {
      failures.push(`APPLY_DRY_RUN_READY:${applyPlan.summary?.applyDryRunReady}:${caseExpectation.applyDryRunReady}`);
    }
    if (applyPlan.summary?.sourceCopyBlocked !== caseExpectation.sourceCopyBlocked) {
      failures.push(`SOURCE_COPY_BLOCKED:${applyPlan.summary?.sourceCopyBlocked}:${caseExpectation.sourceCopyBlocked}`);
    }
    if (applyPlan.summary?.productionWriteAllowed !== false) failures.push('PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
    if (applyPlan.summary?.writesOperatorInput !== false) failures.push('WRITES_OPERATOR_INPUT_NOT_FALSE');
    if (applyPlan.summary?.writesCorrectionsTemplate !== false) failures.push('WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
    if (applyPlan.summary?.writesProductionData !== false) failures.push('WRITES_PRODUCTION_DATA_NOT_FALSE');
    if (applyPlan.summary?.dataFileChanged !== false) failures.push('DATA_FILE_CHANGED_NOT_FALSE');
    if ((applyPlan.summary?.contextOnlyRowsCopied ?? null) !== 0) failures.push('CONTEXT_ONLY_ROWS_COPIED_NOT_ZERO');
    if (!overlayExists || applyPlan.summary?.overlayWritten !== true) failures.push('OVERLAY_MISSING');
    if (!includesAll(applyPlan.summary?.blockers, caseExpectation.requiredBlockers)) {
      failures.push(`MISSING_BLOCKERS:${(caseExpectation.requiredBlockers ?? []).join(' ')}`);
    }
    if (!includesAll(applyPlan.summary?.warnings, caseExpectation.requiredWarnings)) {
      failures.push(`MISSING_WARNINGS:${(caseExpectation.requiredWarnings ?? []).join(' ')}`);
    }
    (caseExpectation.requiredBlockerPrefixes ?? []).forEach((prefix) => {
      if (!(applyPlan.summary?.blockers ?? []).some((blocker) => String(blocker).startsWith(prefix))) {
        failures.push(`MISSING_BLOCKER_PREFIX:${prefix}`);
      }
    });

    return {
      caseName,
      passed: failures.length === 0,
      expectedStatus: caseExpectation.status,
      actualStatus: applyPlan.summary?.status ?? '',
      exitCode: run.exitCode,
      expectedExitCode: caseExpectation.exitCode,
      plannedRows: applyPlan.summary?.plannedRows ?? 0,
      applyDryRunReady: applyPlan.summary?.applyDryRunReady ?? false,
      sourceCopyBlocked: applyPlan.summary?.sourceCopyBlocked ?? null,
      productionWriteAllowed: applyPlan.summary?.productionWriteAllowed ?? null,
      writesOperatorInput: applyPlan.summary?.writesOperatorInput ?? null,
      writesCorrectionsTemplate: applyPlan.summary?.writesCorrectionsTemplate ?? null,
      writesProductionData: applyPlan.summary?.writesProductionData ?? null,
      dataFileChanged: applyPlan.summary?.dataFileChanged ?? null,
      contextOnlyRowsCopied: applyPlan.summary?.contextOnlyRowsCopied ?? null,
      overlayExists,
      blockers: applyPlan.summary?.blockers ?? [],
      warnings: applyPlan.summary?.warnings ?? [],
      report: path.relative(frontendRoot, applyPlanPath),
      stdout: run.stdout.trim(),
      stderr: run.stderr.trim(),
      failures,
    };
  };

  const caseResults = [];
  for (const caseName of CASES) {
    caseResults.push(await runApplyPlanCase(caseName));
  }

  const failedCases = caseResults.filter((result) => !result.passed);
  const summary = {
    regressionVersion: REGRESSION_VERSION,
    status: failedCases.length === 0 ? 'passed' : 'failed',
    totalCases: caseResults.length,
    passedCases: caseResults.length - failedCases.length,
    failedCases: failedCases.length,
    caseNames: CASES,
    productionWriteAllowed: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    dataFileChanged: false,
    blockers: failedCases.map((result) => `T3V_APPLY_PLAN_REGRESSION_FAILED:${result.caseName}`),
    warnings: [],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      gateRegressionDir: path.relative(frontendRoot, gateRegressionDir),
      p1ReportDir: path.relative(frontendRoot, p1ReportDir),
    },
    safetyContract: [
      'This apply-plan regression writes only fixture/report files under reports/stadium.',
      'It never writes operator input, corrections template source, production data, or src/data/daeguSeatData.ts.',
      'valid-target-preview may produce a dry-run apply plan, but productionWriteAllowed must remain false.',
      'context-only-row-copy-attempt must remain blocked.',
    ],
    cases: caseResults,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-apply-plan-regression.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-apply-plan-regression.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-apply-plan-regression.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'case',
      'passed',
      'status',
      'exitCode',
      'plannedRows',
      'applyDryRunReady',
      'sourceCopyBlocked',
      'productionWriteAllowed',
      'writesProductionData',
      'dataFileChanged',
      'contextOnlyRowsCopied',
      'blockers',
      'warnings',
      'failures',
    ],
    ...caseResults.map((result) => [
      result.caseName,
      result.passed,
      result.actualStatus,
      result.exitCode,
      result.plannedRows,
      result.applyDryRunReady,
      result.sourceCopyBlocked,
      result.productionWriteAllowed,
      result.writesProductionData,
      result.dataFileChanged,
      result.contextOnlyRowsCopied,
      result.blockers.join(' '),
      result.warnings.join(' '),
      result.failures.join(' '),
    ]),
  ]);

  await fs.writeFile(`${markdownPath}.tmp`, [
    '# Daegu P1 Paired Ownership T3/V Apply Plan Regression',
    '',
    `- regression version: \`${REGRESSION_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- cases: ${summary.passedCases}/${summary.totalCases}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- writes production data: ${summary.writesProductionData}`,
    '',
    '## Cases',
    '',
    markdownTable(
      ['case', 'passed', 'status', 'exit', 'planned', 'source-copy blocked', 'blockers'],
      caseResults.map((result) => [
        `\`${result.caseName}\``,
        String(result.passed),
        `\`${result.actualStatus}\``,
        `${result.exitCode}/${result.expectedExitCode}`,
        result.plannedRows,
        String(result.sourceCopyBlocked),
        [
          ...result.blockers,
          ...result.failures,
        ].map((value) => `\`${value}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    report.safetyContract.map((item) => `- ${item}`).join('\n'),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
  ].join('\n'), 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    totalCases: summary.totalCases,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status !== 'passed') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VApplyPlan = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const APPLY_PLAN_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPLY_PLAN_V1';
  const TARGET_ENTRY_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_GATE_V1';
  const TARGET_ENTRY_TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_TEMPLATE_V1';
  const TARGET_REVIEW_PACKET_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_REVIEW_PACKET_V1';
  const IMAGE_WIDTH = 1707;
  const IMAGE_HEIGHT = 2048;
  const IMAGE_HREF = '../../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png';
  const TARGET_TEMPLATE_ROWS = [
    'P1_T3_TABLE_OWNERSHIP:T3-2',
    'P1_V_CENTER_TABLE_SPLIT:V1',
    'P1_V_CENTER_TABLE_SPLIT:V2',
    'P1_V_CENTER_TABLE_SPLIT:V3',
    'P1_V_CENTER_TABLE_SPLIT:T3-2',
  ];
  const PRODUCTION_FIELDS = [
    'd',
    'imageGeometry.visualPath',
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.geometryVersion',
    'imageGeometry.traceSource',
    'imageGeometry.manualReviewed',
    'imageGeometry.pixelAlignmentStatus',
    'traceStatus',
    'traceMethod',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
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

  const round = (value, digits = 2) => {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
  };

  const pathBoundsOrNull = (pathData) => {
    const text = String(pathData ?? '').trim();
    if (!text) return null;
    try {
      const points = pathToPoints(text);
      if (points.length < 3) return null;
      const bounds = pathBounds(text);
      if (![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(Number.isFinite)) return null;
      return bounds;
    } catch {
      return null;
    }
  };

  const pointBounds = (point) => {
    if (!Array.isArray(point) || point.length < 2) return null;
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { minX: x, minY: y, maxX: x, maxY: y };
  };

  const unionBounds = (boundsList) => {
    const validBounds = boundsList.filter(Boolean);
    if (validBounds.length === 0) return { minX: 0, minY: 0, maxX: IMAGE_WIDTH, maxY: IMAGE_HEIGHT };
    return {
      minX: Math.min(...validBounds.map((bounds) => bounds.minX)),
      minY: Math.min(...validBounds.map((bounds) => bounds.minY)),
      maxX: Math.max(...validBounds.map((bounds) => bounds.maxX)),
      maxY: Math.max(...validBounds.map((bounds) => bounds.maxY)),
    };
  };

  const expandedViewBox = (bounds) => {
    const margin = 96;
    const minX = Math.max(0, bounds.minX - margin);
    const minY = Math.max(0, bounds.minY - margin);
    const maxX = Math.min(IMAGE_WIDTH, bounds.maxX + margin);
    const maxY = Math.min(IMAGE_HEIGHT, bounds.maxY + margin);
    const width = Math.min(IMAGE_WIDTH, Math.max(340, maxX - minX));
    const height = Math.min(IMAGE_HEIGHT, Math.max(260, maxY - minY));
    return {
      minX: round(Math.max(0, Math.min(IMAGE_WIDTH - width, minX))),
      minY: round(Math.max(0, Math.min(IMAGE_HEIGHT - height, minY))),
      width: round(width),
      height: round(height),
    };
  };

  const normalizePath = (pathData) => String(pathData ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  const renderApplyOverlay = ({ rows, targetRowsById, viewport }) => {
    const viewBox = `${viewport.minX} ${viewport.minY} ${viewport.width} ${viewport.height}`;
    const height = Math.max(540, Math.round((viewport.height / viewport.width) * 1160));
    const layers = rows.map((row, index) => {
      const targetRow = targetRowsById.get(row.templateRowId) ?? {};
      const label = row.expectedProduction?.labelPoint;
      return [
        targetRow.currentPath
          ? `<path d="${xmlEscape(targetRow.currentPath)}" fill="#f97316" fill-opacity="0.13" stroke="#dc2626" stroke-width="2.3" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} current legacy path`)}</title></path>`
          : '',
        targetRow.draftPath
          ? `<path d="${xmlEscape(targetRow.draftPath)}" fill="#0ea5e9" fill-opacity="0.1" stroke="#0284c7" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} draft evidence only`)}</title></path>`
          : '',
        row.correctedPath
          ? `<path d="${xmlEscape(row.correctedPath)}" fill="#22c55e" fill-opacity="0.18" stroke="#16a34a" stroke-width="3" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} expected visualPath/hitPath`)}</title></path>`
          : '',
        label
          ? `<circle cx="${label[0]}" cy="${label[1]}" r="6" fill="#16a34a" stroke="#ffffff" stroke-width="1.8" vector-effect="non-scaling-stroke"/>`
          : '',
        label
          ? `<text x="${label[0] + 9}" y="${label[1] - 8}" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="4" paint-order="stroke">${xmlEscape(`${index + 1}. ${row.block}`)}</text>`
          : '',
      ].join('\n');
    }).join('\n');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="${height}" viewBox="${viewBox}">
    <image href="${xmlEscape(IMAGE_HREF)}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" opacity="0.84"/>
    <rect x="${viewport.minX + 2}" y="${viewport.minY + 2}" width="${viewport.width - 4}" height="${viewport.height - 4}" fill="none" stroke="#0f172a" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
    ${layers}
    <g transform="translate(${viewport.minX + 10} ${viewport.minY + 18})">
      <rect x="0" y="-14" width="432" height="88" rx="4" fill="#ffffff" fill-opacity="0.94" stroke="#cbd5e1" vector-effect="non-scaling-stroke"/>
      <text x="10" y="0" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f172a">Daegu T3/V apply plan dry-run overlay</text>
      <text x="10" y="18" font-family="Arial, sans-serif" font-size="10" fill="#334155">red=current, blue=draft evidence, green=expected production visualPath/hitPath</text>
      <text x="10" y="35" font-family="Arial, sans-serif" font-size="10" fill="#334155">d remains a backward-compatible canonical visual path.</text>
      <text x="10" y="52" font-family="Arial, sans-serif" font-size="10" fill="#334155">productionWriteAllowed=false; src/data/daeguSeatData.ts is not modified.</text>
    </g>
  </svg>
  `;
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const targetEntryPath = path.resolve(
    frontendRoot,
    argValue('--target-entry', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.json')),
  );
  const targetReviewPacketPath = path.resolve(
    frontendRoot,
    argValue('--target-review-packet', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.json')),
  );
  const targetEntryGatePath = path.resolve(
    frontendRoot,
    argValue('--target-entry-gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate.json')),
  );

  const targetEntry = await readJson(targetEntryPath);
  const targetReviewPacket = await readJson(targetReviewPacketPath);
  const targetEntryGate = await readJson(targetEntryGatePath);
  const blockers = [];
  const warnings = [];

  if (targetEntry.targetEntryTemplateVersion !== TARGET_ENTRY_TEMPLATE_VERSION) {
    blockers.push(`TARGET_ENTRY_TEMPLATE_VERSION_MISMATCH:${targetEntry.targetEntryTemplateVersion ?? ''}`);
  }
  if (targetReviewPacket.summary?.packetVersion !== TARGET_REVIEW_PACKET_VERSION) {
    blockers.push(`TARGET_REVIEW_PACKET_VERSION_MISMATCH:${targetReviewPacket.summary?.packetVersion ?? ''}`);
  }
  if (targetEntryGate.summary?.gateVersion !== TARGET_ENTRY_GATE_VERSION) {
    blockers.push(`TARGET_ENTRY_GATE_VERSION_MISMATCH:${targetEntryGate.summary?.gateVersion ?? ''}`);
  }
  if (targetEntry.productionWriteAllowed !== false) blockers.push('TARGET_ENTRY_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (targetEntry.writesOperatorInput !== false) blockers.push('TARGET_ENTRY_WRITES_OPERATOR_INPUT_NOT_FALSE');
  if (targetEntry.writesProductionData !== false) blockers.push('TARGET_ENTRY_WRITES_PRODUCTION_DATA_NOT_FALSE');
  if (targetReviewPacket.summary?.productionWriteAllowed !== false) blockers.push('TARGET_REVIEW_PACKET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (targetEntryGate.summary?.productionWriteAllowed !== false) blockers.push('TARGET_ENTRY_GATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (targetEntryGate.summary?.writesProductionData !== false) blockers.push('TARGET_ENTRY_GATE_WRITES_PRODUCTION_DATA_NOT_FALSE');
  if (targetEntryGate.summary?.writesOperatorInput !== false) blockers.push('TARGET_ENTRY_GATE_WRITES_OPERATOR_INPUT_NOT_FALSE');
  if (targetEntryGate.summary?.writesCorrectionsTemplate !== false) blockers.push('TARGET_ENTRY_GATE_WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');

  const targetEntryRows = Array.isArray(targetEntry.rows) ? targetEntry.rows : [];
  const actualRowIds = targetEntryRows.map((row) => row.templateRowId);
  if (actualRowIds.join(' ') !== TARGET_TEMPLATE_ROWS.join(' ')) {
    blockers.push(`TARGET_ENTRY_TEMPLATE_ROW_ORDER_MISMATCH:${actualRowIds.join(' ')}`);
  }
  const targetRowsById = new Map((targetReviewPacket.targetRows ?? []).map((row) => [row.templateRowId, row]));
  const gateRowsById = new Map((targetEntryGate.rows ?? []).map((row) => [row.templateRowId, row]));

  if (targetEntryGate.summary?.status === 'blocked') {
    blockers.push(...(targetEntryGate.summary?.blockers ?? ['TARGET_ENTRY_GATE_BLOCKED']));
  }
  if ((targetEntryGate.summary?.approvedRows ?? 0) === 0) warnings.push('T3V_APPLY_PLAN_WAITING_FOR_OPERATOR_APPROVAL');
  if ((targetEntryGate.summary?.sourceCopyBlockers ?? []).length > 0) {
    warnings.push(...targetEntryGate.summary.sourceCopyBlockers.map((blocker) => `T3V_APPLY_PLAN_SOURCE_COPY_BLOCKED:${blocker}`));
  }
  if (targetEntryGate.summary?.readyForSourceCopyDryRun !== true) {
    warnings.push(`T3V_APPLY_PLAN_SOURCE_COPY_DRY_RUN_NOT_READY:${targetEntryGate.summary?.status ?? ''}`);
  }

  const rows = targetEntryRows.map((entryRow) => {
    const gateRow = gateRowsById.get(entryRow.templateRowId) ?? {};
    const targetRow = targetRowsById.get(entryRow.templateRowId) ?? {};
    const plannedForApplyDryRun = blockers.length === 0
      && gateRow.approved === true
      && gateRow.mergeCandidate === true
      && Array.isArray(gateRow.reasons)
      && gateRow.reasons.length === 0;
    const correctedPath = plannedForApplyDryRun ? normalizePath(entryRow.correctedPath) : '';
    const labelPoint = plannedForApplyDryRun
      ? [Number(entryRow.correctedLabelX), Number(entryRow.correctedLabelY)]
      : null;
    const validLabelPoint = Array.isArray(labelPoint) && labelPoint.every(Number.isFinite) ? labelPoint : null;
    return {
      templateRowId: entryRow.templateRowId,
      editableTarget: entryRow.editableTarget,
      groupId: entryRow.groupId,
      block: entryRow.block,
      duplicateTargetBlock: Boolean(entryRow.duplicateTargetBlock),
      operatorDecision: entryRow.operatorDecision,
      gateApproved: gateRow.approved === true,
      gateMergeCandidate: gateRow.mergeCandidate === true,
      plannedForApplyDryRun,
      plannedFields: plannedForApplyDryRun ? PRODUCTION_FIELDS : [],
      correctedPath,
      expectedProduction: plannedForApplyDryRun ? {
        d: correctedPath,
        visualPath: correctedPath,
        hitPath: correctedPath,
        labelPoint: validLabelPoint,
        traceStatus: 'OFFICIAL_IMAGE_TRACED',
        traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
        traceSource: 'OPERATOR_APPROVED_OFFICIAL_IMAGE_TRACE',
        manualReviewed: true,
        pixelAlignmentStatus: 'PIXEL_ALIGNED',
        geometryVersion: 'DAEGU_P1_T3_V_OPERATOR_APPROVED_DRY_RUN_V1',
        backwardCompatibleDPolicy: 'd remains the canonical visual path for older renderers.',
      } : null,
      reasons: plannedForApplyDryRun ? [] : [
        ...(gateRow.approved === true ? [] : ['TARGET_ROW_NOT_APPROVED']),
        ...(gateRow.mergeCandidate === true ? [] : ['TARGET_ROW_NOT_MERGE_CANDIDATE']),
        ...(gateRow.reasons ?? []),
        ...(blockers.length > 0 ? ['APPLY_PLAN_BLOCKED'] : []),
      ],
      warnings: [
        ...(gateRow.warnings ?? []),
        ...(targetRow.draftReferenceOnly ? ['DRAFT_PATH_IS_EVIDENCE_ONLY'] : []),
        ...(entryRow.block === 'T3-2' ? ['T3V_DUPLICATE_TARGET_KEEP_IDENTICAL'] : []),
      ],
    };
  });

  const plannedRows = rows.filter((row) => row.plannedForApplyDryRun);
  const applyDryRunReady = blockers.length === 0 && plannedRows.length > 0;
  const sourceCopyBlocked = targetEntryGate.summary?.readyForSourceCopyDryRun !== true
    || (targetEntryGate.summary?.sourceCopyBlockers ?? []).length > 0;
  const status = blockers.length > 0
    ? 'blocked'
    : plannedRows.length > 0
      ? 'ready-for-apply-dry-run'
      : 'waiting-for-operator';

  const overlayPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-apply-plan-overlay.svg');
  const viewport = expandedViewBox(unionBounds([
    ...rows.map((row) => pathBoundsOrNull(row.correctedPath)),
    ...rows.map((row) => pointBounds(row.expectedProduction?.labelPoint)),
    ...(targetReviewPacket.targetRows ?? []).flatMap((row) => [
      pathBoundsOrNull(row.currentPath),
      pathBoundsOrNull(row.draftPath),
      pointBounds(row.currentLabelPoint),
      pointBounds(row.draftLabelPoint),
    ]),
  ]));

  const summary = {
    applyPlanVersion: APPLY_PLAN_VERSION,
    status,
    targetEntryGateStatus: targetEntryGate.summary?.status ?? '',
    targetEntryGateReadyForTemplateImportDryRun: targetEntryGate.summary?.readyForTemplateImportDryRun === true,
    targetEntryGateReadyForSourceCopyDryRun: targetEntryGate.summary?.readyForSourceCopyDryRun === true,
    applyDryRunReady,
    sourceCopyBlocked,
    totalRows: rows.length,
    approvedRows: targetEntryGate.summary?.approvedRows ?? 0,
    validApprovedRows: targetEntryGate.summary?.validApprovedRows ?? 0,
    plannedRows: plannedRows.length,
    contextOnlyRowsCopied: 0,
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    overlayWritten: true,
    overlay: path.relative(frontendRoot, overlayPath),
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      targetEntry: path.relative(frontendRoot, targetEntryPath),
      targetReviewPacket: path.relative(frontendRoot, targetReviewPacketPath),
      targetEntryGate: path.relative(frontendRoot, targetEntryGatePath),
    },
    expectedProductionFieldPolicy: {
      visualPath: 'operator correctedPath',
      hitPath: 'operator correctedPath for this dry-run; separate hit expansion can be reviewed later',
      labelPoint: 'operator correctedLabelX/Y',
      d: 'backward-compatible canonical visual path',
      traceStatus: 'OFFICIAL_IMAGE_TRACED',
      traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
      manualReviewed: true,
      pixelAlignmentStatus: 'PIXEL_ALIGNED',
    },
    safetyContract: [
      'This T3/V apply plan is read-only and dry-run only.',
      'It never writes operator input.',
      'It never writes corrections template source.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'Context-only rows must not be copied into apply targets.',
      'T3-2 duplicate target rows must pass the target-entry-gate identical path/label checks before planning.',
      'V1/V2/V3 partial approval may produce a dry-run plan, but source-copy remains blocked until the paired T3/V gates pass.',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-apply-plan.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-apply-plan.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-apply-plan.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'groupId',
      'block',
      'operatorDecision',
      'gateApproved',
      'gateMergeCandidate',
      'plannedForApplyDryRun',
      'plannedFields',
      'traceStatus',
      'traceMethod',
      'manualReviewed',
      'pixelAlignmentStatus',
      'reasons',
      'warnings',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.groupId,
      row.block,
      row.operatorDecision,
      row.gateApproved,
      row.gateMergeCandidate,
      row.plannedForApplyDryRun,
      row.plannedFields.join(' '),
      row.expectedProduction?.traceStatus ?? '',
      row.expectedProduction?.traceMethod ?? '',
      row.expectedProduction?.manualReviewed ?? '',
      row.expectedProduction?.pixelAlignmentStatus ?? '',
      row.reasons.join(' '),
      row.warnings.join(' '),
    ]),
  ]);
  await fs.writeFile(
    `${overlayPath}.tmp`,
    renderApplyOverlay({ rows: plannedRows, targetRowsById, viewport }),
    'utf8',
  );
  await fs.rename(`${overlayPath}.tmp`, overlayPath);

  await fs.writeFile(`${markdownPath}.tmp`, [
    '# Daegu P1 Paired Ownership T3/V Apply Plan',
    '',
    `- apply plan version: \`${APPLY_PLAN_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- target-entry-gate status: \`${summary.targetEntryGateStatus}\``,
    `- apply dry-run ready: ${summary.applyDryRunReady}`,
    `- source-copy blocked: ${summary.sourceCopyBlocked}`,
    `- planned rows: ${summary.plannedRows}/${summary.totalRows}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- data file changed: ${summary.dataFileChanged}`,
    `- overlay: \`${summary.overlay}\``,
    '',
    '## Field Policy',
    '',
    markdownTable(
      ['field', 'planned value'],
      Object.entries(report.expectedProductionFieldPolicy).map(([field, value]) => [`\`${field}\``, String(value)]),
    ),
    '',
    '## Rows',
    '',
    markdownTable(
      ['template row', 'block', 'decision', 'planned', 'fields', 'reasons', 'warnings'],
      rows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        `\`${row.operatorDecision}\``,
        String(row.plannedForApplyDryRun),
        row.plannedFields.map((field) => `\`${field}\``).join('<br>') || '-',
        row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
        row.warnings.map((warning) => `\`${warning}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    report.safetyContract.map((item) => `- ${item}`).join('\n'),
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
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    plannedRows: summary.plannedRows,
    applyDryRunReady: summary.applyDryRunReady,
    sourceCopyBlocked: summary.sourceCopyBlocked,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VApprovalHandoff = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const HANDOFF_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_HANDOFF_V1';
  const APPROVAL_INPUT_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_GATE_V1';
  const APPROVAL_INPUT_TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_TEMPLATE_V1';
  const APPROVAL_INPUT_DRY_RUN_APPLY_PLAN_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_DRY_RUN_APPLY_PLAN_V1';
  const WARNING_REVIEW_BOARD_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_WARNING_REVIEW_BOARD_V1';
  const EXPECTED_IMAGE_SHA256 = '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0';
  const EXPECTED_TEMPLATE_ROWS = [
    'P1_T3_TABLE_OWNERSHIP:T3-2',
    'P1_V_CENTER_TABLE_SPLIT:V1',
    'P1_V_CENTER_TABLE_SPLIT:V2',
    'P1_V_CENTER_TABLE_SPLIT:V3',
    'P1_V_CENTER_TABLE_SPLIT:T3-2',
  ];
  const REQUIRED_APPROVAL_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ];
  const OPERATOR_EXECUTION_ORDER = [
    'npm run stadium:daegu:p1-paired-ownership-t3-v-warning-review-board',
    'npm run stadium:daegu:p1-paired-ownership-t3-v-approval-input-gate',
    'edit reports/stadium/daegu-p1-operator/daegu-seatmap-p1-paired-ownership-t3-v-approval-input-template.json or .csv',
    'npm run stadium:daegu:p1-paired-ownership-t3-v-approval-input-gate -- --approval-input reports/stadium/daegu-p1-operator/daegu-seatmap-p1-paired-ownership-t3-v-approval-input-template.json',
    'npm run stadium:daegu:p1-paired-ownership-t3-v-approval-input-gate-regression',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const list = (value) => (Array.isArray(value) ? value : []);

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
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const pathOrMissing = (filePath, exists) => (exists ? path.relative(frontendRoot, filePath) : `missing:${path.relative(frontendRoot, filePath)}`);

  const assertSafetySummary = (summary, label, blockers) => {
    if (!summary) return;
    if (summary.productionWriteAllowed !== false) blockers.push(`${label}_PRODUCTION_WRITE_ALLOWED_NOT_FALSE`);
    if (summary.dataFileChanged === true) blockers.push(`${label}_DATA_FILE_CHANGED_TRUE`);
    if (summary.writesOperatorInput === true) blockers.push(`${label}_WRITES_OPERATOR_INPUT_TRUE`);
    if (summary.writesCorrectionsTemplate === true) blockers.push(`${label}_WRITES_CORRECTIONS_TEMPLATE_TRUE`);
    if (summary.writesProductionData !== false) blockers.push(`${label}_WRITES_PRODUCTION_DATA_NOT_FALSE`);
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const warningBoardPath = path.resolve(
    frontendRoot,
    argValue('--warning-board', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.json')),
  );
  const warningBoardSvgPath = path.resolve(
    frontendRoot,
    argValue('--warning-board-svg', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.svg')),
  );
  const approvalTemplatePath = path.resolve(
    frontendRoot,
    argValue('--approval-template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-template.json')),
  );
  const approvalTemplateCsvPath = path.resolve(
    frontendRoot,
    argValue('--approval-template-csv', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-template.csv')),
  );
  const approvalTemplateMdPath = path.resolve(
    frontendRoot,
    argValue('--approval-template-md', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-template.md')),
  );
  const approvalGatePath = path.resolve(
    frontendRoot,
    argValue('--approval-gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate.json')),
  );
  const approvalGateOverlayPath = path.resolve(
    frontendRoot,
    argValue('--approval-gate-overlay', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate-overlay.svg')),
  );

  const reports = {
    warningBoard: await readJsonReport(warningBoardPath),
    approvalTemplate: await readJsonReport(approvalTemplatePath),
    approvalGate: await readJsonReport(approvalGatePath),
  };
  const auxiliaryFiles = {
    warningBoardSvg: await fileExists(warningBoardSvgPath),
    approvalTemplateCsv: await fileExists(approvalTemplateCsvPath),
    approvalTemplateMd: await fileExists(approvalTemplateMdPath),
    approvalGateOverlay: await fileExists(approvalGateOverlayPath),
  };

  const blockers = [];
  const warnings = [];
  Object.entries(reports).forEach(([name, report]) => {
    if (!report.exists) blockers.push(`MISSING_REPORT:${name}:${report.relativePath}`);
  });
  Object.entries(auxiliaryFiles).forEach(([name, exists]) => {
    if (!exists) blockers.push(`MISSING_AUXILIARY_FILE:${name}`);
  });

  const warningSummary = reports.warningBoard.data?.summary;
  const template = reports.approvalTemplate.data;
  const gateSummary = reports.approvalGate.data?.summary;

  if (warningSummary?.reviewBoardVersion !== WARNING_REVIEW_BOARD_VERSION) {
    blockers.push(`WARNING_REVIEW_BOARD_VERSION_MISMATCH:${warningSummary?.reviewBoardVersion ?? ''}`);
  }
  if (template?.approvalInputTemplateVersion !== APPROVAL_INPUT_TEMPLATE_VERSION) {
    blockers.push(`APPROVAL_INPUT_TEMPLATE_VERSION_MISMATCH:${template?.approvalInputTemplateVersion ?? ''}`);
  }
  if (template?.generatedBy !== APPROVAL_INPUT_GATE_VERSION) {
    blockers.push(`APPROVAL_INPUT_TEMPLATE_GENERATOR_MISMATCH:${template?.generatedBy ?? ''}`);
  }
  if (gateSummary?.gateVersion !== APPROVAL_INPUT_GATE_VERSION) {
    blockers.push(`APPROVAL_INPUT_GATE_VERSION_MISMATCH:${gateSummary?.gateVersion ?? ''}`);
  }
  if (gateSummary?.templateVersion !== APPROVAL_INPUT_TEMPLATE_VERSION) {
    blockers.push(`APPROVAL_INPUT_GATE_TEMPLATE_VERSION_MISMATCH:${gateSummary?.templateVersion ?? ''}`);
  }
  if (gateSummary?.dryRunApplyPlanVersion !== APPROVAL_INPUT_DRY_RUN_APPLY_PLAN_VERSION) {
    blockers.push(`APPROVAL_INPUT_GATE_DRY_RUN_VERSION_MISMATCH:${gateSummary?.dryRunApplyPlanVersion ?? ''}`);
  }
  if (warningSummary?.officialImageSha256 !== EXPECTED_IMAGE_SHA256 || warningSummary?.sha256MatchesExpected !== true) {
    blockers.push('WARNING_REVIEW_BOARD_IMAGE_SHA256_MISMATCH');
  }
  if (template?.officialImageSha256 !== EXPECTED_IMAGE_SHA256) {
    blockers.push('APPROVAL_INPUT_TEMPLATE_IMAGE_SHA256_MISMATCH');
  }

  assertSafetySummary(warningSummary, 'WARNING_REVIEW_BOARD', blockers);
  assertSafetySummary(template, 'APPROVAL_INPUT_TEMPLATE', blockers);
  assertSafetySummary(gateSummary, 'APPROVAL_INPUT_GATE', blockers);

  const templateRows = list(template?.rows);
  const gateRows = list(reports.approvalGate.data?.rows);
  const warningRows = list(reports.warningBoard.data?.rows);
  const templateRowIds = templateRows.map((row) => row.templateRowId);
  const gateRowIds = gateRows.map((row) => row.templateRowId);
  const warningRowIds = warningRows.map((row) => row.templateRowId);
  if (templateRowIds.join(' ') !== EXPECTED_TEMPLATE_ROWS.join(' ')) {
    blockers.push(`APPROVAL_INPUT_TEMPLATE_ROW_ORDER_MISMATCH:${templateRowIds.join(' ')}`);
  }
  if (gateRowIds.join(' ') !== EXPECTED_TEMPLATE_ROWS.join(' ')) {
    blockers.push(`APPROVAL_INPUT_GATE_ROW_ORDER_MISMATCH:${gateRowIds.join(' ')}`);
  }
  if (warningRowIds.join(' ') !== EXPECTED_TEMPLATE_ROWS.join(' ')) {
    blockers.push(`WARNING_REVIEW_BOARD_ROW_ORDER_MISMATCH:${warningRowIds.join(' ')}`);
  }
  if (gateSummary?.status === 'approval-input-blocked') {
    blockers.push('APPROVAL_INPUT_GATE_BLOCKED');
  }
  if (!['waiting-for-operator', 'ready-for-dry-run-import'].includes(gateSummary?.status ?? '')) {
    blockers.push(`APPROVAL_INPUT_GATE_STATUS_UNEXPECTED:${gateSummary?.status ?? ''}`);
  }
  if (gateSummary?.targetRows !== EXPECTED_TEMPLATE_ROWS.length) {
    blockers.push(`APPROVAL_INPUT_GATE_TARGET_ROW_COUNT_MISMATCH:${gateSummary?.targetRows ?? ''}`);
  }
  if (warningSummary?.targetRows !== EXPECTED_TEMPLATE_ROWS.length) {
    blockers.push(`WARNING_REVIEW_BOARD_TARGET_ROW_COUNT_MISMATCH:${warningSummary?.targetRows ?? ''}`);
  }
  if (warningSummary?.readyForOperatorReview !== true) {
    blockers.push('WARNING_REVIEW_BOARD_NOT_READY_FOR_OPERATOR_REVIEW');
  }
  if (warningSummary?.rowSvgCount !== EXPECTED_TEMPLATE_ROWS.length) {
    blockers.push(`WARNING_REVIEW_BOARD_ROW_SVG_COUNT_MISMATCH:${warningSummary?.rowSvgCount ?? ''}`);
  }
  if (new Set(templateRows.filter((row) => row.block === 'T3-2').map((row) => row.templateRowId)).size !== 2) {
    blockers.push('APPROVAL_INPUT_T3_DUPLICATE_ROWS_MISSING');
  }

  const templateRowsById = new Map(templateRows.map((row) => [row.templateRowId, row]));
  const gateRowsById = new Map(gateRows.map((row) => [row.templateRowId, row]));
  const warningRowsById = new Map(warningRows.map((row) => [row.templateRowId, row]));
  const rowSvgOutputs = list(reports.warningBoard.data?.rowSvgOutputs);
  const rowSvgByIndex = new Map(rowSvgOutputs.map((svgPath, index) => [EXPECTED_TEMPLATE_ROWS[index], svgPath]));
  const rows = EXPECTED_TEMPLATE_ROWS.map((templateRowId) => {
    const templateRow = templateRowsById.get(templateRowId) ?? {};
    const gateRow = gateRowsById.get(templateRowId) ?? {};
    const warningRow = warningRowsById.get(templateRowId) ?? {};
    const missingApprovalFields = REQUIRED_APPROVAL_FIELDS.filter((field) => {
      if (field === 'operatorDecision=APPROVED') return templateRow.operatorDecision !== 'APPROVED';
      return String(templateRow[field] ?? '').trim() === '';
    });
    const warningIssues = list(warningRow.issues).map((issue) => issue.code ?? issue.warning).filter(Boolean);
    const nextActions = [
      ...list(templateRow.candidateReference?.nextActions),
      ...list(warningRow.issues).map((issue) => issue.nextAction).filter(Boolean),
    ];
    return {
      templateRowId,
      rowNumber: templateRow.rowNumber ?? warningRow.rowNumber ?? '',
      groupId: templateRow.groupId ?? warningRow.groupId ?? '',
      block: templateRow.block ?? warningRow.block ?? '',
      duplicateTargetBlock: Boolean(templateRow.duplicateTargetBlock ?? warningRow.duplicateTargetBlock),
      operatorDecision: templateRow.operatorDecision ?? '',
      missingApprovalFields,
      gateApproved: Boolean(gateRow.approved),
      gateReasons: list(gateRow.reasons),
      gateWarnings: list(gateRow.warnings),
      candidateColorCoverage: templateRow.candidateReference?.candidateColorCoverage ?? warningRow.candidateColorCoverage ?? null,
      warningIssueCount: warningIssues.length,
      warningIssues,
      rowSvg: rowSvgByIndex.get(templateRowId) ?? '',
      reviewPoints: list(templateRow.candidateReference?.reviewPoints),
      nextActions: Array.from(new Set(nextActions)),
    };
  });

  const rowsMissingApproval = rows.filter((row) => row.missingApprovalFields.length > 0);
  if (rowsMissingApproval.length > 0) warnings.push(`T3V_APPROVAL_HANDOFF_WAITING_FOR_OPERATOR:${rowsMissingApproval.length}:${rows.length}`);
  list(gateSummary?.warnings).forEach((warning) => warnings.push(warning));
  list(warningSummary?.warnings).forEach((warning) => warnings.push(warning));

  const status = blockers.length > 0
    ? 'blocked'
    : gateSummary?.status === 'ready-for-dry-run-import'
      ? 'ready-for-dry-run-review'
      : 'ready-for-approval-input';

  const sourceReports = {
    warningBoard: pathOrMissing(warningBoardPath, reports.warningBoard.exists),
    warningBoardSvg: pathOrMissing(warningBoardSvgPath, auxiliaryFiles.warningBoardSvg),
    approvalTemplate: pathOrMissing(approvalTemplatePath, reports.approvalTemplate.exists),
    approvalTemplateCsv: pathOrMissing(approvalTemplateCsvPath, auxiliaryFiles.approvalTemplateCsv),
    approvalTemplateMd: pathOrMissing(approvalTemplateMdPath, auxiliaryFiles.approvalTemplateMd),
    approvalGate: pathOrMissing(approvalGatePath, reports.approvalGate.exists),
    approvalGateOverlay: pathOrMissing(approvalGateOverlayPath, auxiliaryFiles.approvalGateOverlay),
  };

  const summary = {
    handoffVersion: HANDOFF_VERSION,
    approvalInputGateVersion: APPROVAL_INPUT_GATE_VERSION,
    approvalInputTemplateVersion: APPROVAL_INPUT_TEMPLATE_VERSION,
    warningReviewBoardVersion: WARNING_REVIEW_BOARD_VERSION,
    status,
    officialImageSha256: EXPECTED_IMAGE_SHA256,
    targetRows: rows.length,
    duplicateT3Rows: rows.filter((row) => row.block === 'T3-2').length,
    rowsMissingApproval: rowsMissingApproval.length,
    approvedRows: gateSummary?.approvedRows ?? 0,
    validApprovedRows: gateSummary?.validApprovedRows ?? 0,
    warningIssues: rows.reduce((sum, row) => sum + row.warningIssueCount, 0),
    approvalGateStatus: gateSummary?.status ?? '',
    readyForDryRunImport: gateSummary?.readyForDryRunImport === true,
    dryRunApplyPlanWritten: gateSummary?.dryRunApplyPlanWritten === true,
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings: Array.from(new Set(warnings)),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    sourceReports,
    operatorExecutionOrder: OPERATOR_EXECUTION_ORDER,
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    operatorRules: [
      'Only operatorDecision=APPROVED rows with correctedPath, correctedLabelX/Y, reviewer, and reviewedAt can advance.',
      'T3-2 appears twice and both approval rows must use identical correctedPath and correctedLabelX/Y.',
      'Candidate paths are image-based evidence only; copy them into corrected fields only after operator visual confirmation.',
      'Non-approved rows must keep correctedPath and correctedLabelX/Y blank.',
      'The approval gate must pass before any dry-run import plan is discussed.',
      'This handoff does not write src/data/daeguSeatData.ts.',
    ],
    safetyContract: [
      'This T3/V approval handoff is read-only.',
      'It never writes operator input fields.',
      'It never writes the paired ownership corrections template.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'productionWriteAllowed: false',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-handoff.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-handoff.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-handoff.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'rowNumber',
      'groupId',
      'block',
      'duplicateTargetBlock',
      'operatorDecision',
      'missingApprovalFields',
      'candidateColorCoverage',
      'warningIssues',
      'rowSvg',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.rowNumber,
      row.groupId,
      row.block,
      row.duplicateTargetBlock,
      row.operatorDecision,
      row.missingApprovalFields.join(' '),
      row.candidateColorCoverage ?? '',
      row.warningIssues.join(' '),
      row.rowSvg,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T3/V Approval Handoff',
    '',
    `- handoff version: \`${summary.handoffVersion}\``,
    `- status: \`${summary.status}\``,
    `- target rows: ${summary.targetRows}`,
    `- duplicate T3-2 rows: ${summary.duplicateT3Rows}`,
    `- rows missing approval: ${summary.rowsMissingApproval}`,
    `- approved rows: ${summary.approvedRows}`,
    `- valid approved rows: ${summary.validApprovedRows}`,
    `- warning issues: ${summary.warningIssues}`,
    `- approval gate status: \`${summary.approvalGateStatus || 'missing'}\``,
    `- ready for dry-run import: ${summary.readyForDryRunImport}`,
    `- dry-run apply plan written: ${summary.dryRunApplyPlanWritten}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Source Artifacts',
    '',
    Object.entries(sourceReports).map(([label, sourcePath]) => `- ${label}: \`${sourcePath}\``).join('\n'),
    '',
    '## Required Approval Fields',
    '',
    report.requiredApprovalFields.map((field) => `- \`${field}\``).join('\n'),
    '',
    '## Operator Execution Order',
    '',
    report.operatorExecutionOrder.map((command, index) => `${index + 1}. \`${command}\``).join('\n'),
    '',
    '## Operator Rules',
    '',
    report.operatorRules.map((rule) => `- ${rule}`).join('\n'),
    '',
    '## Target Rows',
    '',
    markdownTable(
      ['row', 'block', 'decision', 'duplicate', 'missing fields', 'coverage', 'warnings', 'row svg'],
      rows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        `\`${row.operatorDecision || 'PENDING'}\``,
        String(row.duplicateTargetBlock),
        row.missingApprovalFields.map((field) => `\`${field}\``).join('<br>') || '-',
        row.candidateColorCoverage ?? '-',
        row.warningIssues.map((issue) => `\`${issue}\``).join('<br>') || '-',
        row.rowSvg ? `\`${row.rowSvg}\`` : '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    report.safetyContract.map((item) => `- ${item}`).join('\n'),
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

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    targetRows: summary.targetRows,
    duplicateT3Rows: summary.duplicateT3Rows,
    rowsMissingApproval: summary.rowsMissingApproval,
    approvedRows: summary.approvedRows,
    validApprovedRows: summary.validApprovedRows,
    readyForDryRunImport: summary.readyForDryRunImport,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VApprovalInputGateRegression = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultOutputDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-t3-v-approval-input-gate-regression');

  const REGRESSION_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_GATE_REGRESSION_V1';
  const GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_GATE_V1';
  const CASES = [
    'default-waiting-for-operator',
    'partial-approval-blocked',
    't3-duplicate-mismatch',
    'invalid-self-intersection',
    'auto-filled-pending-row',
    'valid-five-row-dry-run',
  ];
  const REVIEWED_AT = '2026-05-16T00:00:00.000Z';

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const cloneJson = (value) => JSON.parse(JSON.stringify(value));

  const spawnNode = (scriptName, args) => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', path.join(scriptDir, scriptName), ...args],
      { cwd: frontendRoot, encoding: 'utf8' },
    );
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  };

  const includesPrefix = (values, prefix) => (values ?? []).some((value) => String(value).startsWith(prefix));

  const approveFromCandidate = (row, reviewer = 't3-v-operator-fixture') => {
    row.operatorDecision = 'APPROVED';
    row.correctedPath = row.candidateReference.candidateVisualPath;
    row.correctedLabelX = String(row.candidateReference.candidateLabelPoint[0]);
    row.correctedLabelY = String(row.candidateReference.candidateLabelPoint[1]);
    row.reviewer = reviewer;
    row.reviewedAt = REVIEWED_AT;
  };

  const approveAll = (template) => {
    template.rows.forEach((row) => approveFromCandidate(row));
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const seedDir = path.join(outputDir, '_seed');
  await fs.mkdir(seedDir, { recursive: true });
  const seedRun = spawnNode('daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-approval-input-gate', 
    '--output-dir',
    seedDir,
    '--review-board',
    path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.json'),
  ]);
  if (seedRun.exitCode !== 0) {
    throw new Error(`Seed approval input template failed: ${seedRun.stderr || seedRun.stdout}`);
  }
  const sourceTemplate = await readJson(path.join(seedDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-template.json'));

  const expected = {
    'default-waiting-for-operator': {
      exitCode: 0,
      status: 'waiting-for-operator',
      approvedRows: 0,
      dryRunApplyPlanWritten: false,
    },
    'partial-approval-blocked': {
      exitCode: 1,
      status: 'approval-input-blocked',
      requiredBlockerPrefix: 'T3V_APPROVAL_INPUT_DUPLICATE_PARTIAL_APPROVAL_BLOCKED:T3-2',
    },
    't3-duplicate-mismatch': {
      exitCode: 1,
      status: 'approval-input-blocked',
      requiredBlockerPrefix: 'T3V_APPROVAL_INPUT_DUPLICATE_PATH_MISMATCH:T3-2',
    },
    'invalid-self-intersection': {
      exitCode: 1,
      status: 'approval-input-blocked',
      requiredBlockerPrefix: 'T3V_APPROVAL_INPUT_INVALID_ROWS:',
    },
    'auto-filled-pending-row': {
      exitCode: 1,
      status: 'approval-input-blocked',
      requiredBlockerPrefix: 'T3V_APPROVAL_INPUT_INVALID_ROWS:',
    },
    'valid-five-row-dry-run': {
      exitCode: 0,
      status: 'ready-for-dry-run-import',
      approvedRows: 5,
      validApprovedRows: 5,
      dryRunApplyPlanWritten: true,
    },
  };

  const mutateTemplate = (caseName, template) => {
    const draft = cloneJson(template);
    if (caseName === 'partial-approval-blocked') {
      approveFromCandidate(draft.rows[0]);
    }
    if (caseName === 't3-duplicate-mismatch') {
      approveAll(draft);
      const secondT3 = draft.rows.filter((row) => row.block === 'T3-2')[1];
      const v1 = draft.rows.find((row) => row.block === 'V1');
      secondT3.correctedPath = v1.candidateReference.candidateVisualPath;
      secondT3.correctedLabelX = String(v1.candidateReference.candidateLabelPoint[0]);
      secondT3.correctedLabelY = String(v1.candidateReference.candidateLabelPoint[1]);
    }
    if (caseName === 'invalid-self-intersection') {
      approveAll(draft);
      const v1 = draft.rows.find((row) => row.block === 'V1');
      v1.correctedPath = 'M 0 0 L 10 10 L 0 10 L 10 0 Z';
      v1.correctedLabelX = '5';
      v1.correctedLabelY = '5';
    }
    if (caseName === 'auto-filled-pending-row') {
      const row = draft.rows[0];
      row.autoFilled = true;
      row.correctedPath = row.candidateReference.candidateVisualPath;
      row.correctedLabelX = String(row.candidateReference.candidateLabelPoint[0]);
      row.correctedLabelY = String(row.candidateReference.candidateLabelPoint[1]);
      row.reviewer = 'auto-fill-fixture';
      row.reviewedAt = REVIEWED_AT;
    }
    if (caseName === 'valid-five-row-dry-run') {
      approveAll(draft);
    }
    return draft;
  };

  const caseResults = [];
  for (const caseName of CASES) {
    const caseDir = path.join(outputDir, caseName);
    await fs.mkdir(caseDir, { recursive: true });
    const approvalInputPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input.json');
    await writeJson(approvalInputPath, mutateTemplate(caseName, sourceTemplate));

    const run = spawnNode('daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-approval-input-gate', 
      '--approval-input',
      approvalInputPath,
      '--output-dir',
      caseDir,
      '--review-board',
      path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.json'),
    ]);
    const gatePath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate.json');
    const gate = await readJson(gatePath);
    const overlayPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate-overlay.svg');
    const dryRunPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-dry-run-apply-plan.json');
    const overlayExists = await fs.stat(overlayPath).then(() => true, () => false);
    const dryRunExists = await fs.stat(dryRunPath).then(() => true, () => false);
    const expectation = expected[caseName];
    const failures = [];

    if (run.exitCode !== expectation.exitCode) failures.push(`EXIT_CODE:${run.exitCode}:${expectation.exitCode}`);
    if (gate.summary?.gateVersion !== GATE_VERSION) failures.push(`GATE_VERSION:${gate.summary?.gateVersion ?? ''}`);
    if (gate.summary?.status !== expectation.status) failures.push(`STATUS:${gate.summary?.status ?? ''}:${expectation.status}`);
    if (expectation.approvedRows !== undefined && gate.summary?.approvedRows !== expectation.approvedRows) {
      failures.push(`APPROVED_ROWS:${gate.summary?.approvedRows}:${expectation.approvedRows}`);
    }
    if (expectation.validApprovedRows !== undefined && gate.summary?.validApprovedRows !== expectation.validApprovedRows) {
      failures.push(`VALID_APPROVED_ROWS:${gate.summary?.validApprovedRows}:${expectation.validApprovedRows}`);
    }
    if (expectation.dryRunApplyPlanWritten !== undefined && gate.summary?.dryRunApplyPlanWritten !== expectation.dryRunApplyPlanWritten) {
      failures.push(`DRY_RUN_APPLY_PLAN_WRITTEN:${gate.summary?.dryRunApplyPlanWritten}:${expectation.dryRunApplyPlanWritten}`);
    }
    if (expectation.requiredBlockerPrefix && !includesPrefix(gate.summary?.blockers, expectation.requiredBlockerPrefix)) {
      failures.push(`MISSING_BLOCKER_PREFIX:${expectation.requiredBlockerPrefix}`);
    }
    if (gate.summary?.productionWriteAllowed !== false) failures.push('PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
    if (gate.summary?.writesOperatorInput !== false) failures.push('WRITES_OPERATOR_INPUT_NOT_FALSE');
    if (gate.summary?.writesCorrectionsTemplate !== false) failures.push('WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
    if (gate.summary?.writesProductionData !== false) failures.push('WRITES_PRODUCTION_DATA_NOT_FALSE');
    if (gate.summary?.dataFileChanged !== false) failures.push('DATA_FILE_CHANGED_NOT_FALSE');
    if (!overlayExists) failures.push('OVERLAY_MISSING');
    if (gate.summary?.dryRunApplyPlanWritten === true && !dryRunExists) failures.push('DRY_RUN_APPLY_PLAN_MISSING');
    if (gate.summary?.dryRunApplyPlanWritten === false && dryRunExists) failures.push('UNEXPECTED_DRY_RUN_APPLY_PLAN');

    caseResults.push({
      caseName,
      exitCode: run.exitCode,
      status: gate.summary?.status ?? '',
      approvedRows: gate.summary?.approvedRows ?? null,
      validApprovedRows: gate.summary?.validApprovedRows ?? null,
      dryRunApplyPlanWritten: gate.summary?.dryRunApplyPlanWritten ?? null,
      productionWriteAllowed: gate.summary?.productionWriteAllowed ?? null,
      dataFileChanged: gate.summary?.dataFileChanged ?? null,
      blockers: gate.summary?.blockers ?? [],
      warnings: gate.summary?.warnings ?? [],
      failures,
    });
  }

  const failedCases = caseResults.filter((result) => result.failures.length > 0);
  const summary = {
    regressionVersion: REGRESSION_VERSION,
    status: failedCases.length === 0 ? 'passed' : 'failed',
    totalCases: caseResults.length,
    passedCases: caseResults.length - failedCases.length,
    failedCases: failedCases.length,
    productionWriteAllowed: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    dataFileChanged: false,
    blockers: failedCases.flatMap((result) => result.failures.map((failure) => `${result.caseName}:${failure}`)),
    warnings: [],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'Approval input gate regression never writes operator input, corrections template source, production data, or src/data/daeguSeatData.ts.',
      'default-waiting-for-operator must preserve blank approval fields.',
      'partial-approval-blocked must remain blocked.',
      't3-duplicate-mismatch must remain blocked.',
      'invalid-self-intersection must remain blocked.',
      'auto-filled-pending-row must remain blocked.',
      'valid-five-row-dry-run may write a dry-run apply plan, but productionWriteAllowed must remain false.',
    ],
    cases: caseResults,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate-regression.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate-regression.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate-regression.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'caseName',
      'exitCode',
      'status',
      'approvedRows',
      'validApprovedRows',
      'dryRunApplyPlanWritten',
      'productionWriteAllowed',
      'dataFileChanged',
      'failures',
    ],
    ...caseResults.map((result) => [
      result.caseName,
      result.exitCode,
      result.status,
      result.approvedRows ?? '',
      result.validApprovedRows ?? '',
      result.dryRunApplyPlanWritten,
      result.productionWriteAllowed,
      result.dataFileChanged,
      result.failures.join(' '),
    ]),
  ]);
  await fs.writeFile(`${markdownPath}.tmp`, [
    '# Daegu T3/V Approval Input Gate Regression',
    '',
    `- regression version: \`${summary.regressionVersion}\``,
    `- status: \`${summary.status}\``,
    `- cases: ${summary.passedCases}/${summary.totalCases}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    markdownTable(
      ['case', 'exit', 'status', 'approved', 'valid', 'dry-run plan', 'failures'],
      caseResults.map((result) => [
        `\`${result.caseName}\``,
        result.exitCode,
        `\`${result.status}\``,
        result.approvedRows ?? '-',
        result.validApprovedRows ?? '-',
        String(result.dryRunApplyPlanWritten),
        result.failures.length > 0 ? result.failures.map((failure) => `\`${failure}\``).join('<br>') : '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
  ].join('\n'), 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    totalCases: summary.totalCases,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status !== 'passed') process.exitCode = 1;
};

const runP1PairedOwnershipT3VApprovalInputGate = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_GATE_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_TEMPLATE_V1';
  const DRY_RUN_APPLY_PLAN_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_DRY_RUN_APPLY_PLAN_V1';
  const REVIEW_BOARD_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_WARNING_REVIEW_BOARD_V1';
  const EXPECTED_SHA256 = '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0';
  const IMAGE_WIDTH = 1707;
  const IMAGE_HEIGHT = 2048;
  const IMAGE_HREF = '../../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png';
  const BBOX_OVERLAP_BLOCKER_RATIO = 0.35;
  const EXPECTED_TEMPLATE_ROWS = [
    'P1_T3_TABLE_OWNERSHIP:T3-2',
    'P1_V_CENTER_TABLE_SPLIT:V1',
    'P1_V_CENTER_TABLE_SPLIT:V2',
    'P1_V_CENTER_TABLE_SPLIT:V3',
    'P1_V_CENTER_TABLE_SPLIT:T3-2',
  ];
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);
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

  const hasArg = (name) => process.argv.includes(name);

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const round = (value, digits = 2) => {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
  };

  const normalizeDecision = (decision) => String(decision ?? 'PENDING').trim() || 'PENDING';

  const normalizePath = (pathData) => String(pathData ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toUpperCase();

  const normalizeLabel = (row) => [
    String(row?.correctedLabelX ?? '').trim(),
    String(row?.correctedLabelY ?? '').trim(),
  ].join(',');

  const isBlank = (value) => String(value ?? '').trim() === '';

  const pathBoundsOrNull = (pathData) => {
    const text = String(pathData ?? '').trim();
    if (!text) return null;
    try {
      const points = pathToPoints(text);
      if (points.length < 3) return null;
      const bounds = pathBounds(text);
      if (![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(Number.isFinite)) return null;
      return bounds;
    } catch {
      return null;
    }
  };

  const pointBounds = (point) => {
    if (!Array.isArray(point) || point.length < 2) return null;
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { minX: x, minY: y, maxX: x, maxY: y };
  };

  const boundsArea = (bounds) => {
    if (!bounds) return 0;
    return Math.max(0, bounds.maxX - bounds.minX) * Math.max(0, bounds.maxY - bounds.minY);
  };

  const boundsOverlapArea = (first, second) => {
    if (!first || !second) return 0;
    const width = Math.max(0, Math.min(first.maxX, second.maxX) - Math.max(first.minX, second.minX));
    const height = Math.max(0, Math.min(first.maxY, second.maxY) - Math.max(first.minY, second.minY));
    return width * height;
  };

  const unionBounds = (boundsList) => {
    const validBounds = boundsList.filter(Boolean);
    if (validBounds.length === 0) return { minX: 0, minY: 0, maxX: IMAGE_WIDTH, maxY: IMAGE_HEIGHT };
    return {
      minX: Math.min(...validBounds.map((bounds) => bounds.minX)),
      minY: Math.min(...validBounds.map((bounds) => bounds.minY)),
      maxX: Math.max(...validBounds.map((bounds) => bounds.maxX)),
      maxY: Math.max(...validBounds.map((bounds) => bounds.maxY)),
    };
  };

  const expandedViewport = (bounds, margin = 104) => {
    const minX = Math.max(0, bounds.minX - margin);
    const minY = Math.max(0, bounds.minY - margin);
    const maxX = Math.min(IMAGE_WIDTH, bounds.maxX + margin);
    const maxY = Math.min(IMAGE_HEIGHT, bounds.maxY + margin);
    const width = Math.max(390, maxX - minX);
    const height = Math.max(300, maxY - minY);
    const adjustedMinX = Math.max(0, Math.min(IMAGE_WIDTH - width, minX));
    const adjustedMinY = Math.max(0, Math.min(IMAGE_HEIGHT - height, minY));
    const adjustedWidth = Math.min(IMAGE_WIDTH, width);
    const adjustedHeight = Math.min(IMAGE_HEIGHT, height);
    return {
      minX: round(adjustedMinX),
      minY: round(adjustedMinY),
      width: round(adjustedWidth),
      height: round(adjustedHeight),
      viewBox: `${round(adjustedMinX)} ${round(adjustedMinY)} ${round(adjustedWidth)} ${round(adjustedHeight)}`,
    };
  };

  const buildTemplate = ({ reviewBoard, reviewBoardPath }) => ({
    approvalInputTemplateVersion: TEMPLATE_VERSION,
    generatedBy: GATE_VERSION,
    sourceReviewBoard: path.relative(frontendRoot, reviewBoardPath),
    officialImageSha256: reviewBoard.summary?.officialImageSha256 ?? '',
    productionWriteAllowed: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    dataFileChanged: false,
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    rows: (reviewBoard.rows ?? []).map((row) => ({
      templateRowId: row.templateRowId,
      rowNumber: row.rowNumber,
      groupId: row.groupId,
      block: row.block,
      duplicateTargetBlock: row.duplicateTargetBlock === true,
      operatorDecision: 'PENDING',
      correctedPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      reviewer: '',
      reviewedAt: '',
      operatorNote: '',
      candidateReference: {
        candidateVisualPath: row.candidateVisualPath,
        candidateHitPath: row.candidateHitPath,
        candidateLabelPoint: row.candidateLabelPoint,
        candidateColorCoverage: row.candidateColorCoverage,
        currentPath: row.currentPath,
        warningCodes: (row.issues ?? []).map((issue) => issue.code),
        reviewPoints: (row.issues ?? []).map((issue) => issue.reviewPoint),
        nextActions: (row.issues ?? []).map((issue) => issue.nextAction),
      },
    })),
  });

  const renderOverlay = ({ rows, viewport, status }) => {
    const height = Math.max(540, Math.round((viewport.height / viewport.width) * 1160));
    const layers = rows.map((row, index) => [
      row.candidateReference?.currentPath
        ? `<path d="${xmlEscape(row.candidateReference.currentPath)}" fill="#f97316" fill-opacity="0.13" stroke="#dc2626" stroke-width="2" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} current legacy`)}</title></path>`
        : '',
      row.candidateReference?.candidateVisualPath
        ? `<path d="${xmlEscape(row.candidateReference.candidateVisualPath)}" fill="#0ea5e9" fill-opacity="0.1" stroke="#0284c7" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} candidate evidence`)}</title></path>`
        : '',
      row.approved && row.correctedPath
        ? `<path d="${xmlEscape(row.correctedPath)}" fill="#22c55e" fill-opacity="0.23" stroke="#16a34a" stroke-width="3" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} operator corrected`)}</title></path>`
        : '',
      row.correctedLabelPoint
        ? `<circle cx="${row.correctedLabelPoint[0]}" cy="${row.correctedLabelPoint[1]}" r="6" fill="${row.approved ? '#16a34a' : '#f59e0b'}" stroke="#ffffff" stroke-width="1.8" vector-effect="non-scaling-stroke"/>`
        : '',
      row.correctedLabelPoint
        ? `<text x="${row.correctedLabelPoint[0] + 9}" y="${row.correctedLabelPoint[1] - 8}" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="4" paint-order="stroke">${xmlEscape(`${index + 1}. ${row.block}`)}</text>`
        : '',
    ].join('\n')).join('\n');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="${height}" viewBox="${viewport.viewBox}">
    <image href="${xmlEscape(IMAGE_HREF)}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" opacity="0.84"/>
    ${layers}
    <g transform="translate(${viewport.minX + 10} ${viewport.minY + 18})">
      <rect x="0" y="-14" width="610" height="112" rx="4" fill="#ffffff" fill-opacity="0.94" stroke="#cbd5e1" vector-effect="non-scaling-stroke"/>
      <text x="10" y="0" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f172a">Daegu T3/V approval input gate</text>
      <text x="10" y="18" font-family="Arial, sans-serif" font-size="10" fill="#334155">status: ${xmlEscape(status)}</text>
      <text x="10" y="36" font-family="Arial, sans-serif" font-size="10" fill="#334155">red=current legacy, blue=candidate evidence, green=operator corrected</text>
      <text x="10" y="54" font-family="Arial, sans-serif" font-size="10" fill="#334155">approved rows require operatorDecision=APPROVED, correctedPath, correctedLabelX/Y, reviewer, reviewedAt.</text>
      <text x="10" y="72" font-family="Arial, sans-serif" font-size="10" fill="#334155">productionWriteAllowed=false; src/data/daeguSeatData.ts is not modified.</text>
    </g>
  </svg>
  `;
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const reviewBoardPath = path.resolve(
    frontendRoot,
    argValue('--review-board', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.json')),
  );
  const approvalInputArg = argValue('--approval-input', null);
  const templatePath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-template.json');
  const approvalInputPath = approvalInputArg
    ? path.resolve(frontendRoot, approvalInputArg)
    : templatePath;

  const reviewBoard = await readJson(reviewBoardPath);
  const blockers = [];
  const warnings = [];

  if (reviewBoard.summary?.reviewBoardVersion !== REVIEW_BOARD_VERSION) {
    blockers.push(`REVIEW_BOARD_VERSION_MISMATCH:${reviewBoard.summary?.reviewBoardVersion ?? ''}`);
  }
  if (reviewBoard.summary?.officialImageSha256 !== EXPECTED_SHA256) {
    blockers.push(`OFFICIAL_IMAGE_SHA256_MISMATCH:${reviewBoard.summary?.officialImageSha256 ?? ''}`);
  }
  if (reviewBoard.summary?.status === 'review-board-blocked' || (reviewBoard.summary?.blockers ?? []).length > 0) {
    blockers.push('WARNING_REVIEW_BOARD_BLOCKED');
  }
  if (reviewBoard.summary?.productionWriteAllowed !== false) blockers.push('REVIEW_BOARD_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (reviewBoard.summary?.writesOperatorInput !== false) blockers.push('REVIEW_BOARD_WRITES_OPERATOR_INPUT_NOT_FALSE');
  if (reviewBoard.summary?.writesCorrectionsTemplate !== false) blockers.push('REVIEW_BOARD_WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
  if (reviewBoard.summary?.writesProductionData !== false) blockers.push('REVIEW_BOARD_WRITES_PRODUCTION_DATA_NOT_FALSE');
  if (reviewBoard.summary?.dataFileChanged !== false) blockers.push('REVIEW_BOARD_DATA_FILE_CHANGED_NOT_FALSE');

  const template = buildTemplate({ reviewBoard, reviewBoardPath });
  await writeJson(templatePath, template);
  await writeCsv(path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-template.csv'), [
    [
      'templateRowId',
      'rowNumber',
      'groupId',
      'block',
      'operatorDecision',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
      'candidateVisualPath',
      'candidateLabelPoint',
      'warningCodes',
    ],
    ...template.rows.map((row) => [
      row.templateRowId,
      row.rowNumber,
      row.groupId,
      row.block,
      row.operatorDecision,
      row.correctedPath,
      row.correctedLabelX,
      row.correctedLabelY,
      row.reviewer,
      row.reviewedAt,
      row.candidateReference.candidateVisualPath,
      row.candidateReference.candidateLabelPoint,
      row.candidateReference.warningCodes.join(' '),
    ]),
  ]);
  await fs.writeFile(path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-template.md'), [
    '# Daegu T3/V Approval Input Template',
    '',
    `- template version: \`${TEMPLATE_VERSION}\``,
    `- source review board: \`${path.relative(frontendRoot, reviewBoardPath)}\``,
    '- operator input fields are intentionally blank.',
    '- Candidate paths are reference evidence only and must not be auto-approved.',
    '',
    markdownTable(
      ['row', 'template row', 'block', 'decision', 'candidate label', 'warnings'],
      template.rows.map((row) => [
        row.rowNumber,
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        `\`${row.operatorDecision}\``,
        row.candidateReference.candidateLabelPoint?.join(',') ?? '-',
        row.candidateReference.warningCodes.map((code) => `\`${code}\``).join('<br>'),
      ]),
    ),
    '',
  ].join('\n'), 'utf8');

  const approvalInput = hasArg('--approval-input') ? await readJson(approvalInputPath) : template;
  if (approvalInput.approvalInputTemplateVersion !== TEMPLATE_VERSION) {
    blockers.push(`APPROVAL_INPUT_TEMPLATE_VERSION_MISMATCH:${approvalInput.approvalInputTemplateVersion ?? ''}`);
  }
  if (approvalInput.productionWriteAllowed !== false) blockers.push('APPROVAL_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (approvalInput.writesOperatorInput !== false) blockers.push('APPROVAL_INPUT_WRITES_OPERATOR_INPUT_NOT_FALSE');
  if (approvalInput.writesCorrectionsTemplate !== false) blockers.push('APPROVAL_INPUT_WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
  if (approvalInput.writesProductionData !== false) blockers.push('APPROVAL_INPUT_WRITES_PRODUCTION_DATA_NOT_FALSE');
  if (approvalInput.dataFileChanged !== false) blockers.push('APPROVAL_INPUT_DATA_FILE_CHANGED_NOT_FALSE');

  const templateRowsById = new Map(template.rows.map((row) => [row.templateRowId, row]));
  const inputRows = Array.isArray(approvalInput.rows) ? approvalInput.rows : [];
  const actualRows = inputRows.map((row) => row.templateRowId);
  if (actualRows.join(' ') !== EXPECTED_TEMPLATE_ROWS.join(' ')) {
    blockers.push(`T3V_APPROVAL_INPUT_ROW_ORDER_MISMATCH:${actualRows.join(' ')}`);
  }
  if (inputRows.length !== EXPECTED_TEMPLATE_ROWS.length) {
    blockers.push(`T3V_APPROVAL_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED_TEMPLATE_ROWS.length}`);
  }

  const rows = inputRows.map((inputRow) => {
    const templateRow = templateRowsById.get(inputRow.templateRowId);
    const decision = normalizeDecision(inputRow.operatorDecision);
    const approved = decision === 'APPROVED';
    const reasons = [];
    const rowWarnings = [];
    const labelPoint = [Number(inputRow.correctedLabelX), Number(inputRow.correctedLabelY)];
    const correctedPath = String(inputRow.correctedPath ?? '');
    const correctedPathPoints = pathToPoints(correctedPath);
    const correctedPathArea = correctedPathPoints.length >= 3 ? round(polygonArea(correctedPathPoints), 2) : null;

    if (!templateRow) reasons.push('T3V_APPROVAL_INPUT_UNEXPECTED_ROW');
    if (!DECISION_OPTIONS.has(decision)) reasons.push('T3V_APPROVAL_INPUT_INVALID_OPERATOR_DECISION');
    if (templateRow && inputRow.groupId !== templateRow.groupId) {
      reasons.push(`T3V_APPROVAL_INPUT_GROUP_MISMATCH:${inputRow.groupId}:${templateRow.groupId}`);
    }
    if (templateRow && inputRow.block !== templateRow.block) {
      reasons.push(`T3V_APPROVAL_INPUT_BLOCK_MISMATCH:${inputRow.block}:${templateRow.block}`);
    }
    if (inputRow.autoApproved === true || inputRow.autoFilled === true) {
      reasons.push('T3V_APPROVAL_INPUT_AUTO_FILLED_ROW');
    }

    if (approved) {
      const missingFields = [
        ['correctedPath', inputRow.correctedPath],
        ['correctedLabelX', inputRow.correctedLabelX],
        ['correctedLabelY', inputRow.correctedLabelY],
        ['reviewer', inputRow.reviewer],
        ['reviewedAt', inputRow.reviewedAt],
      ].filter(([, value]) => isBlank(value)).map(([field]) => field);
      if (missingFields.length > 0) {
        reasons.push(`T3V_APPROVAL_INPUT_APPROVED_ROW_MISSING_FIELDS:${missingFields.join(' ')}`);
      }
      if (!Number.isFinite(labelPoint[0])) reasons.push('T3V_APPROVAL_INPUT_CORRECTED_LABEL_X_NOT_NUMERIC');
      if (!Number.isFinite(labelPoint[1])) reasons.push('T3V_APPROVAL_INPUT_CORRECTED_LABEL_Y_NOT_NUMERIC');
      if (Number.isFinite(labelPoint[0]) && Number.isFinite(labelPoint[1])) {
        reasons.push(...validateSeatMapPolygonPath({
          pathData: correctedPath,
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
          minPointCount: 4,
          labelPoint,
          labelTolerance: 1,
        }).map((code) => `T3V_APPROVAL_INPUT_${code}`));
      }
      if (inputRow.reviewedAt && Number.isNaN(Date.parse(inputRow.reviewedAt))) {
        reasons.push('T3V_APPROVAL_INPUT_REVIEWED_AT_NOT_PARSEABLE');
      }
      if (templateRow && normalizePath(correctedPath) === normalizePath(templateRow.candidateReference.currentPath)) {
        reasons.push('T3V_APPROVAL_INPUT_CORRECTED_PATH_REUSES_CURRENT_PATH');
      }
      if (templateRow && normalizePath(correctedPath) === normalizePath(templateRow.candidateReference.candidateVisualPath)) {
        rowWarnings.push('T3V_APPROVAL_INPUT_CORRECTED_PATH_MATCHES_CANDIDATE_CONFIRM_OPERATOR_INTENT');
      }
    } else if (!isBlank(inputRow.correctedPath)
      || !isBlank(inputRow.correctedLabelX)
      || !isBlank(inputRow.correctedLabelY)
      || !isBlank(inputRow.reviewer)
      || !isBlank(inputRow.reviewedAt)) {
      reasons.push('T3V_APPROVAL_INPUT_NON_APPROVED_ROW_HAS_CORRECTION_FIELDS');
    }

    return {
      templateRowId: inputRow.templateRowId,
      rowNumber: inputRow.rowNumber,
      groupId: inputRow.groupId,
      block: inputRow.block,
      duplicateTargetBlock: templateRow?.duplicateTargetBlock === true,
      decision,
      approved,
      correctedPath,
      correctedLabelPoint: Number.isFinite(labelPoint[0]) && Number.isFinite(labelPoint[1]) ? labelPoint : null,
      correctedPathPointCount: correctedPathPoints.length,
      correctedPathArea,
      correctedPathPoints,
      correctedPathBounds: pathBoundsOrNull(correctedPath),
      candidateReference: templateRow?.candidateReference ?? inputRow.candidateReference ?? {},
      reasons,
      warnings: rowWarnings,
      readyForDryRunImport: approved && reasons.length === 0,
    };
  });

  rows.filter((row) => row.approved && row.correctedLabelPoint).forEach((row) => {
    const containingRows = rows.filter((candidate) => candidate.approved
      && candidate.block !== row.block
      && candidate.correctedPathPoints.length >= 3
      && pointInPolygon(row.correctedLabelPoint, candidate.correctedPathPoints));
    if (containingRows.length > 0) {
      row.reasons.push(`T3V_APPROVAL_INPUT_LABEL_TOP_HIT_MISMATCH:${containingRows.map((hit) => hit.block).join('|')}`);
    }
  });

  rows.filter((row) => row.approved && row.correctedPathBounds).forEach((row, index, approvedRowsWithBounds) => {
    approvedRowsWithBounds.slice(index + 1).forEach((otherRow) => {
      if (row.block === otherRow.block) return;
      const overlapArea = boundsOverlapArea(row.correctedPathBounds, otherRow.correctedPathBounds);
      const denominator = Math.min(boundsArea(row.correctedPathBounds), boundsArea(otherRow.correctedPathBounds));
      const overlapRatio = denominator > 0 ? round(overlapArea / denominator, 3) : 0;
      if (overlapRatio >= BBOX_OVERLAP_BLOCKER_RATIO) {
        row.reasons.push(`T3V_APPROVAL_INPUT_CORRECTED_PATH_OVERLAP:${otherRow.block}:${overlapRatio}`);
        otherRow.reasons.push(`T3V_APPROVAL_INPUT_CORRECTED_PATH_OVERLAP:${row.block}:${overlapRatio}`);
      }
    });
  });

  const approvedRows = rows.filter((row) => row.approved);
  const t3ApprovedRows = rows.filter((row) => row.block === 'T3-2' && row.approved);
  if (t3ApprovedRows.length === 1) blockers.push('T3V_APPROVAL_INPUT_DUPLICATE_PARTIAL_APPROVAL_BLOCKED:T3-2');
  if (t3ApprovedRows.length === 2) {
    const uniquePaths = new Set(t3ApprovedRows.map((row) => normalizePath(row.correctedPath)).filter(Boolean));
    const uniqueLabels = new Set(t3ApprovedRows.map((row) => normalizeLabel({
      correctedLabelX: row.correctedLabelPoint?.[0],
      correctedLabelY: row.correctedLabelPoint?.[1],
    })).filter((label) => label !== ','));
    if (uniquePaths.size !== 1) blockers.push('T3V_APPROVAL_INPUT_DUPLICATE_PATH_MISMATCH:T3-2');
    if (uniqueLabels.size !== 1) blockers.push('T3V_APPROVAL_INPUT_DUPLICATE_LABEL_MISMATCH:T3-2');
  }
  if (approvedRows.length > 0 && approvedRows.length < EXPECTED_TEMPLATE_ROWS.length) {
    blockers.push(`T3V_APPROVAL_INPUT_PARTIAL_APPROVAL_BLOCKED:${approvedRows.length}:${EXPECTED_TEMPLATE_ROWS.length}`);
  }
  const invalidRows = rows.filter((row) => row.reasons.length > 0);
  if (invalidRows.length > 0) {
    blockers.push(`T3V_APPROVAL_INPUT_INVALID_ROWS:${invalidRows.map((row) => row.templateRowId).join(' ')}`);
  }
  if (approvedRows.length === 0) warnings.push('T3V_APPROVAL_INPUT_HAS_NO_APPROVED_ROWS');

  const readyRows = rows.filter((row) => row.readyForDryRunImport && row.reasons.length === 0);
  const readyForDryRunImport = blockers.length === 0
    && approvedRows.length === EXPECTED_TEMPLATE_ROWS.length
    && readyRows.length === EXPECTED_TEMPLATE_ROWS.length;
  const status = blockers.length > 0
    ? 'approval-input-blocked'
    : readyForDryRunImport
      ? 'ready-for-dry-run-import'
      : 'waiting-for-operator';

  const dryRunApplyPlan = readyForDryRunImport
    ? {
      dryRunApplyPlanVersion: DRY_RUN_APPLY_PLAN_VERSION,
      generatedBy: GATE_VERSION,
      sourceApprovalInput: path.relative(frontendRoot, approvalInputPath),
      sourceReviewBoard: path.relative(frontendRoot, reviewBoardPath),
      productionWriteAllowed: false,
      writesProductionData: false,
      dataFileChanged: false,
      plannedRows: rows.map((row) => ({
        templateRowId: row.templateRowId,
        block: row.block,
        duplicateTargetBlock: row.duplicateTargetBlock,
        correctedPath: row.correctedPath,
        correctedLabelPoint: row.correctedLabelPoint,
        expectedProduction: {
          d: row.correctedPath,
          imageGeometry: {
            visualPath: row.correctedPath,
            hitPath: row.correctedPath,
            labelPoint: row.correctedLabelPoint,
            geometryVersion: '2026-official-operator-approved-t3-v-dry-run',
            traceSource: 'OFFICIAL_IMAGE_TRACED',
            manualReviewed: true,
            pixelAlignmentStatus: 'PIXEL_ALIGNED',
          },
          traceStatus: 'OFFICIAL_IMAGE_TRACED',
          traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
        },
      })),
    }
    : null;

  const viewport = expandedViewport(unionBounds(rows.flatMap((row) => [
    pathBoundsOrNull(row.candidateReference?.currentPath),
    pathBoundsOrNull(row.candidateReference?.candidateVisualPath),
    pathBoundsOrNull(row.correctedPath),
    pointBounds(row.correctedLabelPoint),
  ])));

  const overlayPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate-overlay.svg');
  await fs.writeFile(`${overlayPath}.tmp`, renderOverlay({ rows, viewport, status }), 'utf8');
  await fs.rename(`${overlayPath}.tmp`, overlayPath);

  const dryRunApplyPlanPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-dry-run-apply-plan.json');
  if (dryRunApplyPlan) await writeJson(dryRunApplyPlanPath, dryRunApplyPlan);

  const summary = {
    gateVersion: GATE_VERSION,
    templateVersion: TEMPLATE_VERSION,
    dryRunApplyPlanVersion: DRY_RUN_APPLY_PLAN_VERSION,
    reviewBoardVersion: reviewBoard.summary?.reviewBoardVersion ?? '',
    status,
    targetRows: rows.length,
    approvedRows: approvedRows.length,
    validApprovedRows: readyRows.length,
    invalidRows: invalidRows.length,
    templateWritten: true,
    overlayWritten: true,
    dryRunApplyPlanWritten: Boolean(dryRunApplyPlan),
    readyForDryRunImport,
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      reviewBoard: path.relative(frontendRoot, reviewBoardPath),
      approvalInput: path.relative(frontendRoot, approvalInputPath),
    },
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    safetyContract: [
      'Approval input gate is read-only.',
      'It writes a blank approval input template, reports, overlay, and optional dry-run apply plan only.',
      'It never writes operator input.',
      'It never writes corrections template source.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'Candidate values are reference evidence only and must not be auto-approved.',
      'T3-2 duplicate approval rows must use identical correctedPath and correctedLabelX/Y.',
      'Partial approval is blocked before dry-run import.',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate.md');
  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'rowNumber',
      'block',
      'decision',
      'approved',
      'readyForDryRunImport',
      'pointCount',
      'area',
      'reasons',
      'warnings',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.rowNumber,
      row.block,
      row.decision,
      row.approved,
      row.readyForDryRunImport,
      row.correctedPathPointCount,
      row.correctedPathArea ?? '',
      row.reasons.join(' '),
      row.warnings.join(' '),
    ]),
  ]);
  await fs.writeFile(`${markdownPath}.tmp`, [
    '# Daegu T3/V Approval Input Gate',
    '',
    `- gate version: \`${summary.gateVersion}\``,
    `- status: \`${summary.status}\``,
    `- target rows: ${summary.targetRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- valid approved rows: ${summary.validApprovedRows}`,
    `- dry-run apply plan written: ${summary.dryRunApplyPlanWritten}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- data file changed: ${summary.dataFileChanged}`,
    '',
    '## Rows',
    '',
    markdownTable(
      ['row', 'template row', 'block', 'decision', 'ready', 'reasons', 'warnings'],
      rows.map((row) => [
        row.rowNumber,
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        `\`${row.decision}\``,
        String(row.readyForDryRunImport),
        row.reasons.length > 0 ? row.reasons.map((reason) => `\`${reason}\``).join('<br>') : '-',
        row.warnings.length > 0 ? row.warnings.map((warning) => `\`${warning}\``).join('<br>') : '-',
      ]),
    ),
    '',
    '## Outputs',
    '',
    `- \`${path.relative(frontendRoot, templatePath)}\``,
    `- \`${path.relative(frontendRoot, jsonPath)}\``,
    `- \`${path.relative(frontendRoot, csvPath)}\``,
    `- \`${path.relative(frontendRoot, markdownPath)}\``,
    `- \`${path.relative(frontendRoot, overlayPath)}\``,
    dryRunApplyPlan ? `- \`${path.relative(frontendRoot, dryRunApplyPlanPath)}\`` : '- dry-run apply plan: not written',
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
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
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    template: path.relative(frontendRoot, templatePath),
    overlay: path.relative(frontendRoot, overlayPath),
    approvedRows: summary.approvedRows,
    validApprovedRows: summary.validApprovedRows,
    dryRunApplyPlanWritten: summary.dryRunApplyPlanWritten,
    readyForDryRunImport: summary.readyForDryRunImport,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status === 'approval-input-blocked') process.exitCode = 1;
};

const runP1PairedOwnershipT3VApprovalInputGuideRegression = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultOutputDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-t3-v-approval-input-guide-regression');

  const REGRESSION_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_GUIDE_REGRESSION_V1';
  const GUIDE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_GUIDE_V1';
  const EXPECTED_TARGET_ROWS = 5;
  const EXPECTED_DUPLICATE_T3_ROWS = 2;
  const CASES = [
    'default-guide-read-only',
    'missing-handoff-blocked',
    'template-row-order-mismatch',
    'template-production-write-flag-blocked',
    'gate-production-write-flag-blocked',
    'candidate-reference-missing',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));
  const cloneJson = (value) => JSON.parse(JSON.stringify(value));

  const fileSha256 = async (filePath) => createHash('sha256')
    .update(await fs.readFile(filePath))
    .digest('hex');

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const spawnGuide = (args) => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', path.join(scriptDir, 'daegu-seatmap-p1-paired-ownership.mjs'),
        'p1-paired-ownership-t3-v-approval-input-guide', ...args],
      { cwd: frontendRoot, encoding: 'utf8' },
    );
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  };

  const includesPrefix = (values, prefix) => (values ?? []).some((value) => String(value).startsWith(prefix));

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));
  const dataPath = path.join(frontendRoot, 'src/data/daeguSeatData.ts');
  const basePaths = {
    handoff: path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-handoff.json'),
    template: path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-template.json'),
    warningBoard: path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.json'),
    approvalGate: path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate.json'),
  };

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const beforeDataHash = await fileSha256(dataPath);
  const baseReports = {
    handoff: await readJson(basePaths.handoff),
    template: await readJson(basePaths.template),
    warningBoard: await readJson(basePaths.warningBoard),
    approvalGate: await readJson(basePaths.approvalGate),
  };

  const writeFixture = async (caseDir, name, value) => {
    const filePath = path.join(caseDir, '_fixtures', `${name}.json`);
    await writeJson(filePath, value);
    return filePath;
  };

  const caseResults = [];

  for (const caseName of CASES) {
    const caseDir = path.join(outputDir, caseName);
    await fs.mkdir(path.join(caseDir, '_fixtures'), { recursive: true });

    const args = ['--output-dir', caseDir];
    const expected = {
      exitCode: 0,
      status: null,
      requiredBlockerPrefix: '',
    };

    if (caseName === 'missing-handoff-blocked') {
      args.push('--handoff', path.join(caseDir, '_fixtures', 'missing-handoff.json'));
      expected.exitCode = 1;
      expected.status = 'blocked';
      expected.requiredBlockerPrefix = 'MISSING_REPORT:handoff:';
    }

    if (caseName === 'template-row-order-mismatch') {
      const template = cloneJson(baseReports.template);
      template.rows = [template.rows[1], template.rows[0], ...template.rows.slice(2)];
      args.push('--approval-template', await writeFixture(caseDir, 'template-row-order-mismatch', template));
      expected.exitCode = 1;
      expected.status = 'blocked';
      expected.requiredBlockerPrefix = 'TEMPLATE_ROW_ORDER_MISMATCH:';
    }

    if (caseName === 'template-production-write-flag-blocked') {
      const template = cloneJson(baseReports.template);
      template.productionWriteAllowed = true;
      args.push('--approval-template', await writeFixture(caseDir, 'template-production-write-flag-blocked', template));
      expected.exitCode = 1;
      expected.status = 'blocked';
      expected.requiredBlockerPrefix = 'TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE';
    }

    if (caseName === 'gate-production-write-flag-blocked') {
      const approvalGate = cloneJson(baseReports.approvalGate);
      approvalGate.summary.productionWriteAllowed = true;
      args.push('--approval-gate', await writeFixture(caseDir, 'gate-production-write-flag-blocked', approvalGate));
      expected.exitCode = 1;
      expected.status = 'blocked';
      expected.requiredBlockerPrefix = 'APPROVAL_GATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE';
    }

    if (caseName === 'candidate-reference-missing') {
      const template = cloneJson(baseReports.template);
      template.rows[1].candidateReference.candidateVisualPath = '';
      args.push('--approval-template', await writeFixture(caseDir, 'candidate-reference-missing', template));
      expected.exitCode = 1;
      expected.status = 'blocked';
      expected.requiredBlockerPrefix = 'T3V_APPROVAL_INPUT_GUIDE_CANDIDATE_REFERENCE_MISSING';
    }

    const run = spawnGuide(args);
    const guidePath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-guide.json');
    const csvPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-guide.csv');
    const markdownPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-guide.md');
    const guide = await readJson(guidePath);
    const csvExists = await fs.stat(csvPath).then(() => true, () => false);
    const markdownExists = await fs.stat(markdownPath).then(() => true, () => false);
    const failures = [];

    if (run.exitCode !== expected.exitCode) failures.push(`EXIT_CODE:${run.exitCode}:${expected.exitCode}`);
    if (guide.summary?.guideVersion !== GUIDE_VERSION) failures.push(`GUIDE_VERSION:${guide.summary?.guideVersion ?? ''}`);
    if (expected.status && guide.summary?.status !== expected.status) failures.push(`STATUS:${guide.summary?.status ?? ''}:${expected.status}`);
    if (!expected.status && !['ready-for-operator-entry', 'ready-for-dry-run-review'].includes(guide.summary?.status)) {
      failures.push(`STATUS:${guide.summary?.status ?? ''}:ready-for-operator-entry|ready-for-dry-run-review`);
    }
    if (guide.summary?.targetRows !== EXPECTED_TARGET_ROWS) failures.push(`TARGET_ROWS:${guide.summary?.targetRows}`);
    if (guide.summary?.duplicateT3Rows !== EXPECTED_DUPLICATE_T3_ROWS) failures.push(`DUPLICATE_T3_ROWS:${guide.summary?.duplicateT3Rows}`);
    if (expected.requiredBlockerPrefix && !includesPrefix(guide.summary?.blockers, expected.requiredBlockerPrefix)) {
      failures.push(`MISSING_BLOCKER_PREFIX:${expected.requiredBlockerPrefix}`);
    }
    if (guide.summary?.productionWriteAllowed !== false) failures.push('PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
    if (guide.summary?.writesOperatorInput !== false) failures.push('WRITES_OPERATOR_INPUT_NOT_FALSE');
    if (guide.summary?.writesCorrectionsTemplate !== false) failures.push('WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
    if (guide.summary?.writesProductionData !== false) failures.push('WRITES_PRODUCTION_DATA_NOT_FALSE');
    if (guide.summary?.dataFileChanged !== false) failures.push('DATA_FILE_CHANGED_NOT_FALSE');
    if (!guide.safetyContract?.includes('This approval input guide is read-only.')) failures.push('SAFETY_CONTRACT_READ_ONLY_MISSING');
    if (!guide.safetyContract?.includes('Candidate paths are evidence only and are not auto-approved.')) failures.push('SAFETY_CONTRACT_EVIDENCE_ONLY_MISSING');
    if (guide.rows?.some((row) => row.evidenceOnly !== true || row.approvalRequired !== true)) failures.push('ROW_EVIDENCE_ONLY_CONTRACT_MISSING');
    if (!csvExists) failures.push('CSV_OUTPUT_MISSING');
    if (!markdownExists) failures.push('MARKDOWN_OUTPUT_MISSING');

    caseResults.push({
      caseName,
      exitCode: run.exitCode,
      status: guide.summary?.status ?? '',
      targetRows: guide.summary?.targetRows ?? null,
      duplicateT3Rows: guide.summary?.duplicateT3Rows ?? null,
      rowsMissingApproval: guide.summary?.rowsMissingApproval ?? null,
      productionWriteAllowed: guide.summary?.productionWriteAllowed ?? null,
      writesOperatorInput: guide.summary?.writesOperatorInput ?? null,
      writesCorrectionsTemplate: guide.summary?.writesCorrectionsTemplate ?? null,
      writesProductionData: guide.summary?.writesProductionData ?? null,
      dataFileChanged: guide.summary?.dataFileChanged ?? null,
      blockers: guide.summary?.blockers ?? [],
      warnings: guide.summary?.warnings ?? [],
      failures,
    });
  }

  const afterDataHash = await fileSha256(dataPath);
  if (beforeDataHash !== afterDataHash) {
    caseResults.push({
      caseName: 'data-file-hash-guard',
      exitCode: 1,
      status: 'failed',
      targetRows: null,
      duplicateT3Rows: null,
      rowsMissingApproval: null,
      productionWriteAllowed: false,
      writesOperatorInput: false,
      writesCorrectionsTemplate: false,
      writesProductionData: true,
      dataFileChanged: true,
      blockers: ['DATA_FILE_HASH_CHANGED'],
      warnings: [],
      failures: ['DATA_FILE_HASH_CHANGED'],
    });
  }

  const failedCases = caseResults.filter((result) => result.failures.length > 0);
  const summary = {
    regressionVersion: REGRESSION_VERSION,
    guideVersion: GUIDE_VERSION,
    status: failedCases.length === 0 ? 'passed' : 'failed',
    totalCases: caseResults.length,
    passedCases: caseResults.length - failedCases.length,
    failedCases: failedCases.length,
    productionWriteAllowed: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    dataFileChanged: beforeDataHash !== afterDataHash,
    blockers: failedCases.flatMap((result) => result.failures.map((failure) => `${result.caseName}:${failure}`)),
    warnings: [],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    cases: caseResults,
    safetyContract: [
      'Approval input guide regression never writes operator input, corrections template source, production data, or src/data/daeguSeatData.ts',
      'Guide candidates remain evidence only and require operatorDecision=APPROVED before any later import gate can advance.',
      'Blocked fixture cases must still emit JSON/CSV/MD guide outputs for operator diagnosis.',
    ],
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-guide-regression.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-guide-regression.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-guide-regression.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'caseName',
      'exitCode',
      'status',
      'targetRows',
      'duplicateT3Rows',
      'rowsMissingApproval',
      'productionWriteAllowed',
      'dataFileChanged',
      'failures',
    ],
    ...caseResults.map((result) => [
      result.caseName,
      result.exitCode,
      result.status,
      result.targetRows ?? '',
      result.duplicateT3Rows ?? '',
      result.rowsMissingApproval ?? '',
      result.productionWriteAllowed,
      result.dataFileChanged,
      result.failures.join(' '),
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T3/V Approval Input Guide Regression',
    '',
    `- regression version: \`${summary.regressionVersion}\``,
    `- guide version: \`${summary.guideVersion}\``,
    `- status: \`${summary.status}\``,
    `- total cases: ${summary.totalCases}`,
    `- passed cases: ${summary.passedCases}`,
    `- failed cases: ${summary.failedCases}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- data file changed: ${summary.dataFileChanged}`,
    '',
    '## Cases',
    '',
    markdownTable(
      ['case', 'exit', 'status', 'target rows', 'duplicate T3 rows', 'missing approval', 'failures'],
      caseResults.map((result) => [
        `\`${result.caseName}\``,
        result.exitCode,
        `\`${result.status}\``,
        result.targetRows ?? '-',
        result.duplicateT3Rows ?? '-',
        result.rowsMissingApproval ?? '-',
        result.failures.length > 0 ? result.failures.map((failure) => `\`${failure}\``).join('<br>') : '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    report.safetyContract.map((item) => `- ${item}`).join('\n'),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    totalCases: summary.totalCases,
    passedCases: summary.passedCases,
    failedCases: summary.failedCases,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status !== 'passed') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VApprovalInputGuide = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const GUIDE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_GUIDE_V1';
  const HANDOFF_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_HANDOFF_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_TEMPLATE_V1';
  const GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_GATE_V1';
  const WARNING_REVIEW_BOARD_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_WARNING_REVIEW_BOARD_V1';
  const EXPECTED_IMAGE_SHA256 = '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0';
  const EXPECTED_TEMPLATE_ROWS = [
    'P1_T3_TABLE_OWNERSHIP:T3-2',
    'P1_V_CENTER_TABLE_SPLIT:V1',
    'P1_V_CENTER_TABLE_SPLIT:V2',
    'P1_V_CENTER_TABLE_SPLIT:V3',
    'P1_V_CENTER_TABLE_SPLIT:T3-2',
  ];
  const REQUIRED_APPROVAL_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ];
  const OPERATOR_INPUT_STEPS = [
    'Open the approval input template JSON or CSV.',
    'Compare candidateReference.candidateVisualPath against the official PNG and row SVG.',
    'If the boundary is correct, set operatorDecision=APPROVED and fill correctedPath/correctedLabelX/correctedLabelY/reviewer/reviewedAt.',
    'Keep corrected fields blank for every row that remains PENDING.',
    'Run npm run stadium:daegu:p1-paired-ownership-t3-v-approval-input-gate -- --approval-input reports/stadium/daegu-p1-operator/daegu-seatmap-p1-paired-ownership-t3-v-approval-input-template.json.',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const list = (value) => (Array.isArray(value) ? value : []);

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
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const sameRowOrder = (rows) => rows.map((row) => row.templateRowId).join(' ') === EXPECTED_TEMPLATE_ROWS.join(' ');

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const handoffPath = path.resolve(
    frontendRoot,
    argValue('--handoff', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-handoff.json')),
  );
  const templatePath = path.resolve(
    frontendRoot,
    argValue('--approval-template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-template.json')),
  );
  const warningBoardPath = path.resolve(
    frontendRoot,
    argValue('--warning-board', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.json')),
  );
  const gatePath = path.resolve(
    frontendRoot,
    argValue('--approval-gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate.json')),
  );

  const reports = {
    handoff: await readJsonReport(handoffPath),
    template: await readJsonReport(templatePath),
    warningBoard: await readJsonReport(warningBoardPath),
    approvalGate: await readJsonReport(gatePath),
  };

  const blockers = [];
  const warnings = [];
  Object.entries(reports).forEach(([name, report]) => {
    if (!report.exists) blockers.push(`MISSING_REPORT:${name}:${report.relativePath}`);
  });

  const handoffSummary = reports.handoff.data?.summary;
  const template = reports.template.data;
  const warningSummary = reports.warningBoard.data?.summary;
  const gateSummary = reports.approvalGate.data?.summary;

  if (handoffSummary?.handoffVersion !== HANDOFF_VERSION) blockers.push(`HANDOFF_VERSION_MISMATCH:${handoffSummary?.handoffVersion ?? ''}`);
  if (template?.approvalInputTemplateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template?.approvalInputTemplateVersion ?? ''}`);
  if (template?.generatedBy !== GATE_VERSION) blockers.push(`TEMPLATE_GENERATED_BY_MISMATCH:${template?.generatedBy ?? ''}`);
  if (warningSummary?.reviewBoardVersion !== WARNING_REVIEW_BOARD_VERSION) blockers.push(`WARNING_REVIEW_BOARD_VERSION_MISMATCH:${warningSummary?.reviewBoardVersion ?? ''}`);
  if (gateSummary?.gateVersion !== GATE_VERSION) blockers.push(`APPROVAL_GATE_VERSION_MISMATCH:${gateSummary?.gateVersion ?? ''}`);
  if (handoffSummary?.officialImageSha256 !== EXPECTED_IMAGE_SHA256) blockers.push('HANDOFF_IMAGE_SHA256_MISMATCH');
  if (template?.officialImageSha256 !== EXPECTED_IMAGE_SHA256) blockers.push('TEMPLATE_IMAGE_SHA256_MISMATCH');
  if (warningSummary?.officialImageSha256 !== EXPECTED_IMAGE_SHA256) blockers.push('WARNING_REVIEW_IMAGE_SHA256_MISMATCH');
  if (handoffSummary?.productionWriteAllowed !== false) blockers.push('HANDOFF_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (template?.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (warningSummary?.productionWriteAllowed !== false) blockers.push('WARNING_REVIEW_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (gateSummary?.productionWriteAllowed !== false) blockers.push('APPROVAL_GATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (gateSummary?.status === 'approval-input-blocked') blockers.push('APPROVAL_GATE_BLOCKED');

  const templateRows = list(template?.rows);
  const warningRows = list(reports.warningBoard.data?.rows);
  const gateRows = list(reports.approvalGate.data?.rows);
  const handoffRows = list(reports.handoff.data?.rows);
  if (!sameRowOrder(templateRows)) blockers.push(`TEMPLATE_ROW_ORDER_MISMATCH:${templateRows.map((row) => row.templateRowId).join(' ')}`);
  if (!sameRowOrder(warningRows)) blockers.push(`WARNING_REVIEW_ROW_ORDER_MISMATCH:${warningRows.map((row) => row.templateRowId).join(' ')}`);
  if (!sameRowOrder(gateRows)) blockers.push(`APPROVAL_GATE_ROW_ORDER_MISMATCH:${gateRows.map((row) => row.templateRowId).join(' ')}`);
  if (!sameRowOrder(handoffRows)) blockers.push(`HANDOFF_ROW_ORDER_MISMATCH:${handoffRows.map((row) => row.templateRowId).join(' ')}`);

  const warningRowsById = new Map(warningRows.map((row) => [row.templateRowId, row]));
  const gateRowsById = new Map(gateRows.map((row) => [row.templateRowId, row]));
  const handoffRowsById = new Map(handoffRows.map((row) => [row.templateRowId, row]));
  const rowSvgOutputs = list(reports.warningBoard.data?.rowSvgOutputs);
  const rowSvgById = new Map(rowSvgOutputs.map((rowSvg, index) => [EXPECTED_TEMPLATE_ROWS[index], rowSvg]));

  const rows = EXPECTED_TEMPLATE_ROWS.map((templateRowId) => {
    const templateRow = templateRows.find((row) => row.templateRowId === templateRowId) ?? {};
    const warningRow = warningRowsById.get(templateRowId) ?? {};
    const gateRow = gateRowsById.get(templateRowId) ?? {};
    const handoffRow = handoffRowsById.get(templateRowId) ?? {};
    const candidate = templateRow.candidateReference ?? {};
    const labelPoint = list(candidate.candidateLabelPoint);
    const missingApprovalFields = REQUIRED_APPROVAL_FIELDS.filter((field) => {
      if (field === 'operatorDecision=APPROVED') return templateRow.operatorDecision !== 'APPROVED';
      return String(templateRow[field] ?? '').trim() === '';
    });
    const warningIssues = list(warningRow.issues).map((issue) => ({
      code: issue.code ?? issue.warning ?? '',
      reviewPoint: issue.reviewPoint ?? '',
      nextAction: issue.nextAction ?? '',
    }));
    return {
      templateRowId,
      rowNumber: templateRow.rowNumber ?? warningRow.rowNumber ?? '',
      groupId: templateRow.groupId ?? warningRow.groupId ?? '',
      block: templateRow.block ?? warningRow.block ?? '',
      duplicateTargetBlock: Boolean(templateRow.duplicateTargetBlock ?? warningRow.duplicateTargetBlock),
      operatorDecision: templateRow.operatorDecision ?? '',
      fieldsToFill: {
        operatorDecision: 'APPROVED',
        correctedPath: candidate.candidateVisualPath ?? '',
        correctedLabelX: labelPoint[0] ?? '',
        correctedLabelY: labelPoint[1] ?? '',
        reviewer: '<operator-id>',
        reviewedAt: '<ISO-8601 timestamp>',
      },
      candidateReference: {
        candidateVisualPath: candidate.candidateVisualPath ?? '',
        candidateHitPath: candidate.candidateHitPath ?? '',
        candidateLabelPoint: labelPoint,
        candidateColorCoverage: candidate.candidateColorCoverage ?? null,
        currentPath: candidate.currentPath ?? '',
      },
      evidenceOnly: true,
      approvalRequired: true,
      missingApprovalFields,
      warningCodes: Array.from(new Set([
        ...list(candidate.warningCodes),
        ...warningIssues.map((issue) => issue.code).filter(Boolean),
      ])),
      reviewPoints: Array.from(new Set([
        ...list(candidate.reviewPoints),
        ...warningIssues.map((issue) => issue.reviewPoint).filter(Boolean),
      ])),
      nextActions: Array.from(new Set([
        ...list(candidate.nextActions),
        ...warningIssues.map((issue) => issue.nextAction).filter(Boolean),
      ])),
      rowSvg: rowSvgById.get(templateRowId) ?? handoffRow.rowSvg ?? '',
      gateReasons: list(gateRow.reasons),
      gateWarnings: list(gateRow.warnings),
    };
  });

  const rowsMissingApproval = rows.filter((row) => row.missingApprovalFields.length > 0);
  if (rowsMissingApproval.length > 0) warnings.push(`T3V_APPROVAL_INPUT_GUIDE_WAITING_FOR_OPERATOR:${rowsMissingApproval.length}:${rows.length}`);
  if (rows.filter((row) => row.block === 'T3-2').length !== 2) blockers.push('T3V_APPROVAL_INPUT_GUIDE_T3_DUPLICATE_ROWS_MISSING');
  if (rows.some((row) => !row.candidateReference.candidateVisualPath || row.candidateReference.candidateLabelPoint.length !== 2)) {
    blockers.push('T3V_APPROVAL_INPUT_GUIDE_CANDIDATE_REFERENCE_MISSING');
  }

  const status = blockers.length > 0
    ? 'blocked'
    : gateSummary?.status === 'ready-for-dry-run-import'
      ? 'ready-for-dry-run-review'
      : 'ready-for-operator-entry';

  const summary = {
    guideVersion: GUIDE_VERSION,
    handoffVersion: HANDOFF_VERSION,
    templateVersion: TEMPLATE_VERSION,
    gateVersion: GATE_VERSION,
    warningReviewBoardVersion: WARNING_REVIEW_BOARD_VERSION,
    status,
    officialImageSha256: EXPECTED_IMAGE_SHA256,
    targetRows: rows.length,
    duplicateT3Rows: rows.filter((row) => row.block === 'T3-2').length,
    rowsMissingApproval: rowsMissingApproval.length,
    approvedRows: gateSummary?.approvedRows ?? 0,
    validApprovedRows: gateSummary?.validApprovedRows ?? 0,
    readyForDryRunImport: gateSummary?.readyForDryRunImport === true,
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings: Array.from(new Set(warnings)),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    sourceReports: {
      approvalHandoff: path.relative(frontendRoot, handoffPath),
      approvalTemplate: path.relative(frontendRoot, templatePath),
      warningReviewBoard: path.relative(frontendRoot, warningBoardPath),
      approvalGate: path.relative(frontendRoot, gatePath),
    },
    operatorInputSteps: OPERATOR_INPUT_STEPS,
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    safetyContract: [
      'This approval input guide is read-only.',
      'Candidate paths are evidence only and are not auto-approved.',
      'It never writes operator input fields.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'productionWriteAllowed: false',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-guide.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-guide.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-guide.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'rowNumber',
      'block',
      'operatorDecision',
      'correctedPathCandidate',
      'correctedLabelXCandidate',
      'correctedLabelYCandidate',
      'candidateColorCoverage',
      'warningCodes',
      'rowSvg',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.rowNumber,
      row.block,
      row.operatorDecision,
      row.fieldsToFill.correctedPath,
      row.fieldsToFill.correctedLabelX,
      row.fieldsToFill.correctedLabelY,
      row.candidateReference.candidateColorCoverage ?? '',
      row.warningCodes.join(' '),
      row.rowSvg,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T3/V Approval Input Guide',
    '',
    `- guide version: \`${summary.guideVersion}\``,
    `- status: \`${summary.status}\``,
    `- target rows: ${summary.targetRows}`,
    `- duplicate T3-2 rows: ${summary.duplicateT3Rows}`,
    `- rows missing approval: ${summary.rowsMissingApproval}`,
    `- approved rows: ${summary.approvedRows}`,
    `- valid approved rows: ${summary.validApprovedRows}`,
    `- ready for dry-run import: ${summary.readyForDryRunImport}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Source Reports',
    '',
    Object.entries(report.sourceReports).map(([label, sourcePath]) => `- ${label}: \`${sourcePath}\``).join('\n'),
    '',
    '## Operator Input Steps',
    '',
    report.operatorInputSteps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
    '',
    '## Candidate Values',
    '',
    markdownTable(
      ['row', 'block', 'decision', 'correctedPath candidate', 'label X', 'label Y', 'warnings', 'row svg'],
      rows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        `\`${row.operatorDecision || 'PENDING'}\``,
        `\`${row.fieldsToFill.correctedPath}\``,
        row.fieldsToFill.correctedLabelX,
        row.fieldsToFill.correctedLabelY,
        row.warningCodes.map((code) => `\`${code}\``).join('<br>') || '-',
        row.rowSvg ? `\`${row.rowSvg}\`` : '-',
      ]),
    ),
    '',
    '## Row Review Checklist',
    '',
    rows.map((row) => [
      `### ${row.templateRowId}`,
      '',
      `- block: \`${row.block}\``,
      `- duplicate target block: ${row.duplicateTargetBlock}`,
      `- candidate visual path: \`${row.candidateReference.candidateVisualPath}\``,
      `- candidate label point: \`${row.candidateReference.candidateLabelPoint.join(',')}\``,
      `- candidate hit path: \`${row.candidateReference.candidateHitPath}\``,
      `- row SVG: \`${row.rowSvg || 'missing'}\``,
      `- missing approval fields: ${row.missingApprovalFields.map((field) => `\`${field}\``).join(', ') || 'none'}`,
      '',
      row.reviewPoints.length > 0 ? row.reviewPoints.map((point) => `- review: ${point}`).join('\n') : '- review: no additional warning review point',
      row.nextActions.length > 0 ? row.nextActions.map((action) => `- next: ${action}`).join('\n') : '- next: compare with official PNG before approval',
    ].join('\n')).join('\n\n'),
    '',
    '## Safety Contract',
    '',
    report.safetyContract.map((item) => `- ${item}`).join('\n'),
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

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    targetRows: summary.targetRows,
    duplicateT3Rows: summary.duplicateT3Rows,
    rowsMissingApproval: summary.rowsMissingApproval,
    approvedRows: summary.approvedRows,
    validApprovedRows: summary.validApprovedRows,
    readyForDryRunImport: summary.readyForDryRunImport,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VApprovalReadiness = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const READINESS_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_READINESS_V1';
  const TEMPLATE_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_TEMPLATE_GATE_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const SOURCE_SCOPE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_SOURCE_SCOPE_V1';
  const IMAGE_DRAFT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_IMAGE_COORDINATE_DRAFT_V1';
  const FOCUS_GROUPS = [
    {
      groupId: 'P1_T3_TABLE_OWNERSHIP',
      title: 'T3-2 / T3-3 / T3-4 / TC-3 / T3-1 shared ownership',
      expectedBlocks: ['T3-2', 'T3-3', 'T3-4', 'TC-3', 'T3-1'],
      draftReferenceBlocks: ['T3-2'],
    },
    {
      groupId: 'P1_V_CENTER_TABLE_SPLIT',
      title: 'V1 / V2 / V3 center table split',
      expectedBlocks: ['V1', 'V2', 'V3', 'T3-2', 'T3-3', 'TC-1', 'TC-2'],
      draftReferenceBlocks: ['V1', 'V2', 'V3', 'T3-2'],
    },
  ];
  const SHARED_BLOCKS = ['T3-2', 'T3-3'];

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

  const normalizePath = (value) => String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toUpperCase();

  const normalizeLabel = (row) => [
    String(row?.correctedLabelX ?? '').trim(),
    String(row?.correctedLabelY ?? '').trim(),
  ].join(',');

  const isApproved = (value) => String(value ?? '').trim() === 'APPROVED';

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const templateGatePath = path.resolve(
    frontendRoot,
    argValue('--template-gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-template-gate.json')),
  );
  const templatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );
  const sourceScopePath = path.resolve(
    frontendRoot,
    argValue('--source-scope', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json')),
  );
  const imageDraftPath = path.resolve(
    frontendRoot,
    argValue(
      '--image-draft',
      path.join(
        p1ReportDir,
        'daegu-seatmap-p1-boundary-first-image-coordinate-draft/daegu-p1-boundary-first-image-coordinate-draft.json',
      ),
    ),
  );

  const gate = await readJson(templateGatePath);
  const template = await readJson(templatePath);
  const sourceScope = await readJson(sourceScopePath);
  const imageDraft = await readJson(imageDraftPath);
  const blockers = [];
  const warnings = [];

  if (gate.summary?.gateVersion !== TEMPLATE_GATE_VERSION) {
    blockers.push(`TEMPLATE_GATE_VERSION_MISMATCH:${gate.summary?.gateVersion ?? ''}`);
  }
  if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  if (sourceScope.summary?.sourceScopeVersion !== SOURCE_SCOPE_VERSION) {
    blockers.push(`SOURCE_SCOPE_VERSION_MISMATCH:${sourceScope.summary?.sourceScopeVersion ?? ''}`);
  }
  if (imageDraft.draftVersion !== IMAGE_DRAFT_VERSION) blockers.push(`IMAGE_DRAFT_VERSION_MISMATCH:${imageDraft.draftVersion ?? ''}`);
  if (gate.summary?.productionWriteAllowed !== false) blockers.push('TEMPLATE_GATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (sourceScope.summary?.productionWriteAllowed !== false) blockers.push('SOURCE_SCOPE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (imageDraft.productionWriteAllowed !== false) blockers.push('IMAGE_DRAFT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (imageDraft.sourceOfTruth !== false) blockers.push('IMAGE_DRAFT_SOURCE_OF_TRUTH_NOT_FALSE');
  if (imageDraft.sha256MatchesExpected !== true) blockers.push('IMAGE_DRAFT_SHA256_MISMATCH');

  const focusGroupIds = new Set(FOCUS_GROUPS.map((group) => group.groupId));
  const templateRows = (template.corrections ?? []).filter((row) => focusGroupIds.has(row.groupId));
  const gateRows = (gate.rows ?? []).filter((row) => focusGroupIds.has(row.groupId));
  const sourceRows = (sourceScope.rows ?? []).filter((row) => focusGroupIds.has(row.groupId));
  const draftRowsByBlock = new Map((imageDraft.rows ?? []).map((row) => [row.block, row]));
  const gateRowsByTemplateRowId = new Map(gateRows.map((row) => [row.templateRowId, row]));
  const sourceRowsByTemplateRowId = new Map(sourceRows.map((row) => [row.templateRowId, row]));

  FOCUS_GROUPS.forEach((group) => {
    const groupTemplateBlocks = templateRows.filter((row) => row.groupId === group.groupId).map((row) => row.block);
    const groupGateBlocks = gateRows.filter((row) => row.groupId === group.groupId).map((row) => row.block);
    const groupSourceBlocks = sourceRows.filter((row) => row.groupId === group.groupId).map((row) => row.block);
    const groupGate = (gate.groups ?? []).find((row) => row.groupId === group.groupId);

    if (!groupGate) blockers.push(`T3V_GROUP_GATE_MISSING:${group.groupId}`);
    if (groupTemplateBlocks.join(' ') !== group.expectedBlocks.join(' ')) {
      blockers.push(`T3V_TEMPLATE_BLOCK_ORDER_MISMATCH:${group.groupId}:${groupTemplateBlocks.join(' ')}`);
    }
    if (groupGateBlocks.join(' ') !== group.expectedBlocks.join(' ')) {
      blockers.push(`T3V_GATE_BLOCK_ORDER_MISMATCH:${group.groupId}:${groupGateBlocks.join(' ')}`);
    }
    if (groupSourceBlocks.join(' ') !== group.expectedBlocks.join(' ')) {
      blockers.push(`T3V_SOURCE_SCOPE_BLOCK_ORDER_MISMATCH:${group.groupId}:${groupSourceBlocks.join(' ')}`);
    }
    group.draftReferenceBlocks.forEach((block) => {
      if (!draftRowsByBlock.has(block)) blockers.push(`T3V_IMAGE_DRAFT_ROW_MISSING:${group.groupId}:${block}`);
    });
  });

  const approvedRows = templateRows.filter((row) => isApproved(row.operatorDecision));
  const groupSummaries = FOCUS_GROUPS.map((group) => {
    const rows = templateRows.filter((row) => row.groupId === group.groupId);
    const groupApprovedRows = rows.filter((row) => isApproved(row.operatorDecision));
    const partialApproval = groupApprovedRows.length > 0 && groupApprovedRows.length < group.expectedBlocks.length;
    if (partialApproval) {
      blockers.push(`T3V_PARTIAL_APPROVAL_BLOCKED:${group.groupId}:${groupApprovedRows.length}:${group.expectedBlocks.length}`);
    }
    return {
      groupId: group.groupId,
      title: group.title,
      expectedBlocks: group.expectedBlocks,
      totalRows: rows.length,
      approvedRows: groupApprovedRows.length,
      completeApproval: groupApprovedRows.length === group.expectedBlocks.length,
      partialApproval,
    };
  });

  const rows = templateRows.map((templateRow) => {
    const group = FOCUS_GROUPS.find((focusGroup) => focusGroup.groupId === templateRow.groupId);
    const gateRow = gateRowsByTemplateRowId.get(templateRow.templateRowId);
    const sourceRow = sourceRowsByTemplateRowId.get(templateRow.templateRowId);
    const draftRow = draftRowsByBlock.get(templateRow.block);
    const approved = isApproved(templateRow.operatorDecision);
    const correctedPathMatchesDraft = approved
      && normalizePath(templateRow.correctedPath) !== ''
      && normalizePath(templateRow.correctedPath) === normalizePath(draftRow?.correctedPathDraft);
    const draftReference = Boolean(group?.draftReferenceBlocks.includes(templateRow.block));
    const reasons = [];
    const rowWarnings = [];

    if (!gateRow) reasons.push('T3V_GATE_ROW_MISSING');
    if (!sourceRow) reasons.push('T3V_SOURCE_SCOPE_ROW_MISSING');
    if (draftReference && !draftRow) reasons.push('T3V_DRAFT_ROW_MISSING');
    if (gateRow && gateRow.readyForSourceCopy !== approved) {
      reasons.push(`T3V_GATE_READY_STATE_MISMATCH:${gateRow.readyForSourceCopy}:${approved}`);
    }
    if (approved && gateRow && gateRow.readyForSourceCopy !== true) reasons.push('T3V_APPROVED_ROW_NOT_READY_FOR_SOURCE_COPY');
    if (approved && (gateRow?.reasons ?? []).length > 0) reasons.push(...gateRow.reasons);
    if (!approved && String(templateRow.correctedPath ?? '').trim() !== '') rowWarnings.push('T3V_NON_APPROVED_ROW_HAS_CORRECTED_PATH');
    if (correctedPathMatchesDraft) rowWarnings.push('T3V_CORRECTED_PATH_MATCHES_DRAFT_CONFIRM_OPERATOR_INTENT');
    if (draftReference && draftRow?.correctedPathDraft) rowWarnings.push('T3V_DRAFT_REFERENCE_ONLY_OPERATOR_MUST_CONFIRM');

    return {
      templateRowId: templateRow.templateRowId,
      groupId: templateRow.groupId,
      block: templateRow.block,
      blockRole: templateRow.blockRole,
      operatorDecision: templateRow.operatorDecision,
      approved,
      sharedBlock: SHARED_BLOCKS.includes(templateRow.block),
      gateReadyForSourceCopy: gateRow?.readyForSourceCopy === true,
      correctedPathPointCount: gateRow?.correctedPathPointCount ?? 0,
      draftReference,
      draftLabel: draftRow ? [draftRow.correctedLabelX, draftRow.correctedLabelY] : [],
      correctedPathMatchesDraft,
      reasons,
      warnings: rowWarnings,
      nextAction: approved
        ? 'Keep row approved only if the operator has verified the correctedPath against the official PNG and the full overlapping T3/V group.'
        : 'Fill operatorDecision=APPROVED, correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt after operator tracing.',
    };
  });

  const approvedSharedBlockMismatches = SHARED_BLOCKS.flatMap((block) => {
    const blockRows = rows.filter((row) => row.block === block && row.approved);
    if (blockRows.length < 2) return [];
    const templateRowsForBlock = blockRows.map((row) => templateRows.find((templateRow) => (
      templateRow.templateRowId === row.templateRowId
    )));
    const uniquePaths = new Set(templateRowsForBlock.map((row) => normalizePath(row?.correctedPath)).filter(Boolean));
    const uniqueLabels = new Set(templateRowsForBlock.map(normalizeLabel).filter((label) => label !== ','));
    const mismatches = [];
    if (uniquePaths.size > 1) mismatches.push(`T3V_SHARED_BLOCK_CORRECTED_PATH_MISMATCH:${block}`);
    if (uniqueLabels.size > 1) mismatches.push(`T3V_SHARED_BLOCK_CORRECTED_LABEL_MISMATCH:${block}`);
    return mismatches;
  });
  blockers.push(...approvedSharedBlockMismatches);

  const invalidRows = rows.filter((row) => row.reasons.length > 0);
  if (invalidRows.length > 0) {
    blockers.push(`T3V_INVALID_READY_ROWS:${invalidRows.map((row) => row.templateRowId).join(' ')}`);
  }

  const completeT3VApproval = groupSummaries.every((group) => group.completeApproval)
    && rows.every((row) => row.approved && row.gateReadyForSourceCopy && row.reasons.length === 0);
  const readyForT3VSourceCopyDryRun = blockers.length === 0 && completeT3VApproval;
  const globalGateStatus = gate.summary?.status ?? 'missing-gate-status';
  const readyForGlobalSourceCopy = globalGateStatus === 'ready-for-source-copy';

  if (readyForT3VSourceCopyDryRun && !readyForGlobalSourceCopy) {
    warnings.push(`T3V_READY_BUT_GLOBAL_PAIRED_GATE_NOT_READY:${globalGateStatus}`);
  }
  if (approvedRows.length === 0) warnings.push('T3V_APPROVAL_READINESS_HAS_NO_APPROVED_ROWS');
  if (rows.some((row) => row.correctedPathMatchesDraft)) {
    warnings.push('T3V_APPROVED_ROW_MATCHES_DRAFT_PATH_CONFIRM_OPERATOR_INTENT');
  }

  const hasPartialApproval = groupSummaries.some((group) => group.partialApproval);
  const status = blockers.length > 0
    ? hasPartialApproval
      ? 'blocked-partial-t3-v-approval'
      : 'blocked'
    : readyForT3VSourceCopyDryRun
      ? 'ready-for-t3-v-source-copy-dry-run'
      : 'waiting-for-t3-v-operator';

  const summary = {
    readinessVersion: READINESS_VERSION,
    status,
    focusGroups: FOCUS_GROUPS.map((group) => group.groupId),
    sharedBlocks: SHARED_BLOCKS,
    globalGateStatus,
    totalRows: rows.length,
    approvedRows: approvedRows.length,
    invalidRows: invalidRows.length,
    completeT3VApproval,
    readyForT3VSourceCopyDryRun,
    readyForGlobalSourceCopy,
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesSourceInput: false,
    writesOperatorDecision: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      templateGate: path.relative(frontendRoot, templateGatePath),
      template: path.relative(frontendRoot, templatePath),
      sourceScope: path.relative(frontendRoot, sourceScopePath),
      imageCoordinateDraft: path.relative(frontendRoot, imageDraftPath),
    },
    safetyContract: [
      'This T3/V approval readiness gate is read-only.',
      'It never writes source input.',
      'It never writes operatorDecision or corrected fields.',
      'It never writes the main corrections template.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'T3/V source-copy dry-run remains blocked unless both overlapping groups are fully APPROVED and template-gate-ready.',
      'Image-coordinate draft rows are evidence-only and must not be copied into correctedPath without operator tracing/review.',
      'Production source write remains separate from this readiness gate.',
    ],
    operatorChecklist: [
      'Approve P1_T3_TABLE_OWNERSHIP as a complete group or leave every row in that group pending.',
      'Approve P1_V_CENTER_TABLE_SPLIT as a complete group or leave every row in that group pending.',
      'T3-2 and T3-3 appear in both focus groups; duplicated rows must remain boundary-consistent.',
      'Duplicated T3-2 and T3-3 rows must use the same correctedPath and correctedLabelX/Y in every approved group.',
      'Each approved row must include correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt.',
      'Run npm run stadium:daegu:p1-paired-ownership-template-gate after editing operator rows.',
      'Use ready-for-t3-v-source-copy-dry-run only as a dry-run readiness state, not as production release approval.',
    ],
    groups: groupSummaries,
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-readiness.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-readiness.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-readiness.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'groupId',
      'block',
      'operatorDecision',
      'approved',
      'sharedBlock',
      'gateReadyForSourceCopy',
      'correctedPathPointCount',
      'draftReference',
      'correctedPathMatchesDraft',
      'reasons',
      'warnings',
      'nextAction',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.groupId,
      row.block,
      row.operatorDecision,
      row.approved,
      row.sharedBlock,
      row.gateReadyForSourceCopy,
      row.correctedPathPointCount,
      row.draftReference,
      row.correctedPathMatchesDraft,
      row.reasons.join(' '),
      row.warnings.join(' '),
      row.nextAction,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T3/V Approval Readiness',
    '',
    `- readiness version: \`${READINESS_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- focus groups: ${summary.focusGroups.map((groupId) => `\`${groupId}\``).join(', ')}`,
    `- approved rows: ${summary.approvedRows}/${summary.totalRows}`,
    `- complete T3/V approval: ${summary.completeT3VApproval}`,
    `- ready for T3/V source-copy dry-run: ${summary.readyForT3VSourceCopyDryRun}`,
    `- global paired gate status: \`${summary.globalGateStatus}\``,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Groups',
    '',
    markdownTable(
      ['group', 'approved', 'complete', 'partial', 'expected blocks'],
      groupSummaries.map((group) => [
        `\`${group.groupId}\``,
        `${group.approvedRows}/${group.totalRows}`,
        String(group.completeApproval),
        String(group.partialApproval),
        group.expectedBlocks.map((block) => `\`${block}\``).join(' '),
      ]),
    ),
    '',
    '## Rows',
    '',
    markdownTable(
      ['template row', 'block', 'decision', 'shared', 'gate ready', 'draft ref', 'matches draft', 'reasons', 'warnings'],
      rows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        `\`${row.operatorDecision}\``,
        String(row.sharedBlock),
        String(row.gateReadyForSourceCopy),
        String(row.draftReference),
        String(row.correctedPathMatchesDraft),
        row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
        row.warnings.map((warning) => `\`${warning}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Operator Checklist',
    '',
    ...report.operatorChecklist.map((line) => `- ${line}`),
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

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    rows: summary.totalRows,
    approvedRows: summary.approvedRows,
    readyForT3VSourceCopyDryRun: summary.readyForT3VSourceCopyDryRun,
    readyForGlobalSourceCopy: summary.readyForGlobalSourceCopy,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (summary.status === 'blocked' || summary.status === 'blocked-partial-t3-v-approval') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VApprovedDryRunRegression = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultOutputDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-t3-v-approved-dry-run-regression');

  const REGRESSION_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVED_DRY_RUN_REGRESSION_V1';
  const APPROVED_DRY_RUN_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVED_DRY_RUN_V1';
  const REVIEWED_AT = '2026-05-16T00:00:00.000Z';
  const CASES = [
    'zero-approval-waiting',
    'partial-approval-blocked',
    't3-duplicate-mismatch-blocked',
    'context-only-row-blocked',
    'valid-five-row-dry-run',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));
  const cloneJson = (value) => JSON.parse(JSON.stringify(value));

  const fileSha256 = async (filePath) => createHash('sha256')
    .update(await fs.readFile(filePath))
    .digest('hex');

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const spawnScript = (scriptName, args) => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', path.join(scriptDir, scriptName), ...args],
      { cwd: frontendRoot, encoding: 'utf8' },
    );
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  };

  const includesPrefix = (values, prefix) => (values ?? []).some((value) => String(value).startsWith(prefix));

  const approveFromCandidate = (row, reviewer = 't3-v-approved-dry-run-fixture') => {
    row.operatorDecision = 'APPROVED';
    row.correctedPath = row.candidateReference.candidateVisualPath;
    row.correctedLabelX = String(row.candidateReference.candidateLabelPoint[0]);
    row.correctedLabelY = String(row.candidateReference.candidateLabelPoint[1]);
    row.reviewer = reviewer;
    row.reviewedAt = REVIEWED_AT;
  };

  const approveAll = (template) => {
    template.rows.forEach((row) => approveFromCandidate(row));
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));
  const dataPath = path.join(frontendRoot, 'src/data/daeguSeatData.ts');
  const reviewBoardPath = path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.json');

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const beforeDataHash = await fileSha256(dataPath);
  const seedDir = path.join(outputDir, '_seed');
  await fs.mkdir(seedDir, { recursive: true });
  const seedGateRun = spawnScript('daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-approval-input-gate', 
    '--output-dir',
    seedDir,
    '--review-board',
    reviewBoardPath,
  ]);
  if (seedGateRun.exitCode !== 0) {
    throw new Error(`Seed approval input gate failed: ${seedGateRun.stderr || seedGateRun.stdout}`);
  }
  const sourceTemplate = await readJson(path.join(seedDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-template.json'));

  const expected = {
    'zero-approval-waiting': {
      exitCode: 0,
      gateExitCode: 0,
      status: 'waiting-for-approved-input',
      plannedRows: 0,
      requiredWarning: 'APPROVED_DRY_RUN_WAITING_FOR_OPERATOR_APPROVAL',
    },
    'partial-approval-blocked': {
      exitCode: 1,
      gateExitCode: 1,
      status: 'approved-dry-run-blocked',
      plannedRows: 0,
      requiredBlockerPrefix: 'APPROVED_DRY_RUN_APPROVAL_GATE_BLOCKED:T3V_APPROVAL_INPUT_DUPLICATE_PARTIAL_APPROVAL_BLOCKED:T3-2',
    },
    't3-duplicate-mismatch-blocked': {
      exitCode: 1,
      gateExitCode: 1,
      status: 'approved-dry-run-blocked',
      plannedRows: 0,
      requiredBlockerPrefix: 'APPROVED_DRY_RUN_APPROVAL_GATE_BLOCKED:T3V_APPROVAL_INPUT_DUPLICATE_PATH_MISMATCH:T3-2',
    },
    'context-only-row-blocked': {
      exitCode: 1,
      gateExitCode: 1,
      status: 'approved-dry-run-blocked',
      plannedRows: 0,
      requiredBlockerPrefix: 'APPROVED_DRY_RUN_APPROVAL_GATE_BLOCKED:T3V_APPROVAL_INPUT_ROW_ORDER_MISMATCH:',
    },
    'valid-five-row-dry-run': {
      exitCode: 0,
      gateExitCode: 0,
      status: 'ready-for-approved-dry-run-review',
      plannedRows: 5,
      dryRunReady: true,
    },
  };

  const mutateTemplate = (caseName, template) => {
    const draft = cloneJson(template);
    if (caseName === 'partial-approval-blocked') {
      approveFromCandidate(draft.rows[0]);
    }
    if (caseName === 't3-duplicate-mismatch-blocked') {
      approveAll(draft);
      const secondT3 = draft.rows.filter((row) => row.block === 'T3-2')[1];
      const v1 = draft.rows.find((row) => row.block === 'V1');
      secondT3.correctedPath = v1.candidateReference.candidateVisualPath;
      secondT3.correctedLabelX = String(v1.candidateReference.candidateLabelPoint[0]);
      secondT3.correctedLabelY = String(v1.candidateReference.candidateLabelPoint[1]);
    }
    if (caseName === 'context-only-row-blocked') {
      approveAll(draft);
      const v1 = draft.rows.find((row) => row.block === 'V1');
      draft.rows.push({
        ...cloneJson(v1),
        templateRowId: 'P1_CONTEXT_ONLY:T3-3',
        block: 'T3-3',
        duplicateTargetBlock: false,
        operatorNote: 'Context-only row copy attempt fixture; must remain blocked.',
      });
    }
    if (caseName === 'valid-five-row-dry-run') {
      approveAll(draft);
    }
    return draft;
  };

  const caseResults = [];

  for (const caseName of CASES) {
    const caseDir = path.join(outputDir, caseName);
    await fs.mkdir(caseDir, { recursive: true });
    const approvalInputPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input.json');
    await writeJson(approvalInputPath, mutateTemplate(caseName, sourceTemplate));

    const gateRun = spawnScript('daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-approval-input-gate', 
      '--approval-input',
      approvalInputPath,
      '--output-dir',
      caseDir,
      '--review-board',
      reviewBoardPath,
    ]);
    const approvedDryRunRun = spawnScript('daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-approved-dry-run', 
      '--approval-gate',
      path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate.json'),
      '--dry-run-plan',
      path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-dry-run-apply-plan.json'),
      '--output-dir',
      caseDir,
    ]);
    const approvedDryRun = await readJson(path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approved-dry-run.json'));
    const expectation = expected[caseName];
    const failures = [];

    if (gateRun.exitCode !== expectation.gateExitCode) failures.push(`GATE_EXIT_CODE:${gateRun.exitCode}:${expectation.gateExitCode}`);
    if (approvedDryRunRun.exitCode !== expectation.exitCode) failures.push(`EXIT_CODE:${approvedDryRunRun.exitCode}:${expectation.exitCode}`);
    if (approvedDryRun.summary?.approvedDryRunVersion !== APPROVED_DRY_RUN_VERSION) {
      failures.push(`APPROVED_DRY_RUN_VERSION:${approvedDryRun.summary?.approvedDryRunVersion ?? ''}`);
    }
    if (approvedDryRun.summary?.status !== expectation.status) failures.push(`STATUS:${approvedDryRun.summary?.status ?? ''}:${expectation.status}`);
    if (approvedDryRun.summary?.plannedRows !== expectation.plannedRows) failures.push(`PLANNED_ROWS:${approvedDryRun.summary?.plannedRows}:${expectation.plannedRows}`);
    if (expectation.dryRunReady !== undefined && approvedDryRun.summary?.dryRunReady !== expectation.dryRunReady) {
      failures.push(`DRY_RUN_READY:${approvedDryRun.summary?.dryRunReady}:${expectation.dryRunReady}`);
    }
    if (expectation.requiredBlockerPrefix && !includesPrefix(approvedDryRun.summary?.blockers, expectation.requiredBlockerPrefix)) {
      failures.push(`MISSING_BLOCKER_PREFIX:${expectation.requiredBlockerPrefix}`);
    }
    if (expectation.requiredWarning && !(approvedDryRun.summary?.warnings ?? []).includes(expectation.requiredWarning)) {
      failures.push(`MISSING_WARNING:${expectation.requiredWarning}`);
    }
    if (approvedDryRun.summary?.productionWriteAllowed !== false) failures.push('PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
    if (approvedDryRun.summary?.writesOperatorInput !== false) failures.push('WRITES_OPERATOR_INPUT_NOT_FALSE');
    if (approvedDryRun.summary?.writesCorrectionsTemplate !== false) failures.push('WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
    if (approvedDryRun.summary?.writesProductionData !== false) failures.push('WRITES_PRODUCTION_DATA_NOT_FALSE');
    if (approvedDryRun.summary?.dataFileChanged !== false) failures.push('DATA_FILE_CHANGED_NOT_FALSE');
    if ((approvedDryRun.summary?.contextOnlyRowsCopied ?? 0) !== 0) failures.push('CONTEXT_ONLY_ROWS_COPIED_NOT_ZERO');
    if (caseName === 'valid-five-row-dry-run') {
      if (approvedDryRun.summary?.duplicateT3Rows !== 2) failures.push(`DUPLICATE_T3_ROWS:${approvedDryRun.summary?.duplicateT3Rows}`);
      if ((approvedDryRun.summary?.uniqueBlocks ?? []).join(' ') !== 'T3-2 V1 V2 V3') {
        failures.push(`UNIQUE_BLOCKS:${(approvedDryRun.summary?.uniqueBlocks ?? []).join(' ')}`);
      }
      if ((approvedDryRun.rows ?? []).some((row) => row.failures.length > 0)) {
        failures.push('VALID_CASE_ROW_FAILURES_PRESENT');
      }
    }

    caseResults.push({
      caseName,
      gateExitCode: gateRun.exitCode,
      exitCode: approvedDryRunRun.exitCode,
      status: approvedDryRun.summary?.status ?? '',
      plannedRows: approvedDryRun.summary?.plannedRows ?? null,
      dryRunReady: approvedDryRun.summary?.dryRunReady ?? null,
      productionWriteAllowed: approvedDryRun.summary?.productionWriteAllowed ?? null,
      writesOperatorInput: approvedDryRun.summary?.writesOperatorInput ?? null,
      writesCorrectionsTemplate: approvedDryRun.summary?.writesCorrectionsTemplate ?? null,
      writesProductionData: approvedDryRun.summary?.writesProductionData ?? null,
      dataFileChanged: approvedDryRun.summary?.dataFileChanged ?? null,
      blockers: approvedDryRun.summary?.blockers ?? [],
      warnings: approvedDryRun.summary?.warnings ?? [],
      failures,
    });
  }

  const afterDataHash = await fileSha256(dataPath);
  if (beforeDataHash !== afterDataHash) {
    caseResults.push({
      caseName: 'data-file-hash-guard',
      gateExitCode: 0,
      exitCode: 1,
      status: 'failed',
      plannedRows: null,
      dryRunReady: false,
      productionWriteAllowed: false,
      writesOperatorInput: false,
      writesCorrectionsTemplate: false,
      writesProductionData: true,
      dataFileChanged: true,
      blockers: ['DATA_FILE_HASH_CHANGED'],
      warnings: [],
      failures: ['DATA_FILE_HASH_CHANGED'],
    });
  }

  const failedCases = caseResults.filter((result) => result.failures.length > 0);
  const summary = {
    regressionVersion: REGRESSION_VERSION,
    approvedDryRunVersion: APPROVED_DRY_RUN_VERSION,
    status: failedCases.length === 0 ? 'passed' : 'failed',
    totalCases: caseResults.length,
    passedCases: caseResults.length - failedCases.length,
    failedCases: failedCases.length,
    productionWriteAllowed: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    dataFileChanged: beforeDataHash !== afterDataHash,
    blockers: failedCases.flatMap((result) => result.failures.map((failure) => `${result.caseName}:${failure}`)),
    warnings: [],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    cases: caseResults,
    safetyContract: [
      'Approved dry-run regression never writes operator input, corrections template source, production data, or src/data/daeguSeatData.ts',
      'The valid fixture may generate a dry-run apply plan, but productionWriteAllowed must remain false.',
      'Partial, duplicate-mismatch, and context-only copy attempts must remain blocked.',
    ],
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approved-dry-run-regression.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approved-dry-run-regression.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approved-dry-run-regression.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'caseName',
      'gateExitCode',
      'exitCode',
      'status',
      'plannedRows',
      'dryRunReady',
      'productionWriteAllowed',
      'dataFileChanged',
      'failures',
    ],
    ...caseResults.map((result) => [
      result.caseName,
      result.gateExitCode,
      result.exitCode,
      result.status,
      result.plannedRows ?? '',
      result.dryRunReady,
      result.productionWriteAllowed,
      result.dataFileChanged,
      result.failures.join(' '),
    ]),
  ]);

  await fs.writeFile(`${markdownPath}.tmp`, [
    '# Daegu P1 Paired Ownership T3/V Approved Dry-Run Regression',
    '',
    `- regression version: \`${summary.regressionVersion}\``,
    `- approved dry-run version: \`${summary.approvedDryRunVersion}\``,
    `- status: \`${summary.status}\``,
    `- cases: ${summary.passedCases}/${summary.totalCases}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- data file changed: ${summary.dataFileChanged}`,
    '',
    '## Cases',
    '',
    markdownTable(
      ['case', 'gate exit', 'exit', 'status', 'planned rows', 'dry-run ready', 'failures'],
      caseResults.map((result) => [
        `\`${result.caseName}\``,
        result.gateExitCode,
        result.exitCode,
        `\`${result.status}\``,
        result.plannedRows ?? '-',
        result.dryRunReady,
        result.failures.length > 0 ? result.failures.map((failure) => `\`${failure}\``).join('<br>') : '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    report.safetyContract.map((item) => `- ${item}`).join('\n'),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
  ].join('\n'), 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    totalCases: summary.totalCases,
    passedCases: summary.passedCases,
    failedCases: summary.failedCases,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status !== 'passed') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VApprovedDryRun = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const APPROVED_DRY_RUN_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVED_DRY_RUN_V1';
  const GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_GATE_V1';
  const DRY_RUN_APPLY_PLAN_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_INPUT_DRY_RUN_APPLY_PLAN_V1';
  const EXPECTED_TEMPLATE_ROWS = [
    'P1_T3_TABLE_OWNERSHIP:T3-2',
    'P1_V_CENTER_TABLE_SPLIT:V1',
    'P1_V_CENTER_TABLE_SPLIT:V2',
    'P1_V_CENTER_TABLE_SPLIT:V3',
    'P1_V_CENTER_TABLE_SPLIT:T3-2',
  ];
  const EXPECTED_UNIQUE_BLOCKS = ['T3-2', 'V1', 'V2', 'V3'];
  const REQUIRED_PRODUCTION_FIELDS = [
    'd',
    'imageGeometry.visualPath',
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.geometryVersion',
    'imageGeometry.traceSource',
    'imageGeometry.manualReviewed',
    'imageGeometry.pixelAlignmentStatus',
    'traceStatus',
    'traceMethod',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const list = (value) => (Array.isArray(value) ? value : []);

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

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const normalizePath = (pathData) => String(pathData ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toUpperCase();

  const normalizePoint = (point) => list(point).slice(0, 2).map((value) => Number(value));
  const samePoint = (a, b) => {
    const first = normalizePoint(a);
    const second = normalizePoint(b);
    return first.length === 2
      && second.length === 2
      && first.every(Number.isFinite)
      && second.every(Number.isFinite)
      && first[0] === second[0]
      && first[1] === second[1];
  };

  const isNonBlank = (value) => String(value ?? '').trim() !== '';

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const approvalGatePath = path.resolve(
    frontendRoot,
    argValue('--approval-gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-gate.json')),
  );
  const dryRunPlanPath = path.resolve(
    frontendRoot,
    argValue('--dry-run-plan', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-input-dry-run-apply-plan.json')),
  );

  const gateReport = await readJsonReport(approvalGatePath);
  const dryRunPlanReport = await readJsonReport(dryRunPlanPath);
  const blockers = [];
  const warnings = [];

  if (!gateReport.exists) blockers.push(`APPROVED_DRY_RUN_MISSING_APPROVAL_GATE:${gateReport.relativePath}`);

  const gateSummary = gateReport.data?.summary;
  if (gateSummary?.gateVersion !== GATE_VERSION) blockers.push(`APPROVED_DRY_RUN_GATE_VERSION_MISMATCH:${gateSummary?.gateVersion ?? ''}`);
  if (gateSummary?.productionWriteAllowed !== false) blockers.push('APPROVED_DRY_RUN_GATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (gateSummary?.writesOperatorInput !== false) blockers.push('APPROVED_DRY_RUN_GATE_WRITES_OPERATOR_INPUT_NOT_FALSE');
  if (gateSummary?.writesCorrectionsTemplate !== false) blockers.push('APPROVED_DRY_RUN_GATE_WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
  if (gateSummary?.writesProductionData !== false) blockers.push('APPROVED_DRY_RUN_GATE_WRITES_PRODUCTION_DATA_NOT_FALSE');
  if (gateSummary?.dataFileChanged !== false) blockers.push('APPROVED_DRY_RUN_GATE_DATA_FILE_CHANGED_NOT_FALSE');
  if (gateSummary?.status === 'approval-input-blocked') {
    list(gateSummary.blockers).forEach((blocker) => blockers.push(`APPROVED_DRY_RUN_APPROVAL_GATE_BLOCKED:${blocker}`));
    if (list(gateSummary.blockers).length === 0) blockers.push('APPROVED_DRY_RUN_APPROVAL_GATE_BLOCKED');
  }

  const gateRows = list(gateReport.data?.rows);
  const approvedRows = gateRows.filter((row) => row.approved === true);
  if ((gateSummary?.approvedRows ?? approvedRows.length) === 0) {
    warnings.push('APPROVED_DRY_RUN_WAITING_FOR_OPERATOR_APPROVAL');
  }
  if (gateSummary?.readyForDryRunImport === true && dryRunPlanReport.exists !== true) {
    blockers.push(`APPROVED_DRY_RUN_PLAN_MISSING:${dryRunPlanReport.relativePath}`);
  }
  if (gateSummary?.readyForDryRunImport !== true && dryRunPlanReport.exists === true) {
    blockers.push(`APPROVED_DRY_RUN_STALE_PLAN_PRESENT:${dryRunPlanReport.relativePath}`);
  }

  const plan = dryRunPlanReport.data;
  if (dryRunPlanReport.exists) {
    if (plan?.dryRunApplyPlanVersion !== DRY_RUN_APPLY_PLAN_VERSION) {
      blockers.push(`APPROVED_DRY_RUN_PLAN_VERSION_MISMATCH:${plan?.dryRunApplyPlanVersion ?? ''}`);
    }
    if (plan?.generatedBy !== GATE_VERSION) blockers.push(`APPROVED_DRY_RUN_PLAN_GENERATED_BY_MISMATCH:${plan?.generatedBy ?? ''}`);
    if (plan?.productionWriteAllowed !== false) blockers.push('APPROVED_DRY_RUN_PLAN_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
    if (plan?.writesProductionData !== false) blockers.push('APPROVED_DRY_RUN_PLAN_WRITES_PRODUCTION_DATA_NOT_FALSE');
    if (plan?.dataFileChanged !== false) blockers.push('APPROVED_DRY_RUN_PLAN_DATA_FILE_CHANGED_NOT_FALSE');
  }

  const plannedRows = list(plan?.plannedRows);
  const plannedRowIds = plannedRows.map((row) => row.templateRowId);
  if (dryRunPlanReport.exists && plannedRowIds.join(' ') !== EXPECTED_TEMPLATE_ROWS.join(' ')) {
    blockers.push(`APPROVED_DRY_RUN_ROW_ORDER_MISMATCH:${plannedRowIds.join(' ')}`);
  }
  const unexpectedRows = plannedRows.filter((row) => !EXPECTED_TEMPLATE_ROWS.includes(row.templateRowId));
  unexpectedRows.forEach((row) => blockers.push(`APPROVED_DRY_RUN_CONTEXT_ONLY_ROW_INCLUDED:${row.templateRowId}:${row.block}`));
  const uniqueBlocks = Array.from(new Set(plannedRows.map((row) => row.block))).sort();
  if (dryRunPlanReport.exists && uniqueBlocks.join(' ') !== [...EXPECTED_UNIQUE_BLOCKS].sort().join(' ')) {
    blockers.push(`APPROVED_DRY_RUN_UNEXPECTED_BLOCK_SET:${uniqueBlocks.join(' ')}`);
  }
  if (dryRunPlanReport.exists && plannedRows.filter((row) => row.block === 'T3-2').length !== 2) {
    blockers.push(`APPROVED_DRY_RUN_T3_DUPLICATE_ROWS_MISSING:${plannedRows.filter((row) => row.block === 'T3-2').length}`);
  }

  const rowReports = plannedRows.map((row) => {
    const expectedProduction = row.expectedProduction ?? {};
    const geometry = expectedProduction.imageGeometry ?? {};
    const failures = [];
    const plannedFields = [];

    if (!isNonBlank(row.correctedPath)) failures.push('CORRECTED_PATH_MISSING');
    if (!Array.isArray(row.correctedLabelPoint) || row.correctedLabelPoint.length !== 2 || normalizePoint(row.correctedLabelPoint).some((value) => !Number.isFinite(value))) {
      failures.push('CORRECTED_LABEL_POINT_INVALID');
    }
    if (expectedProduction.d !== row.correctedPath) failures.push('EXPECTED_D_MISMATCH');
    else plannedFields.push('d');
    if (geometry.visualPath !== row.correctedPath) failures.push('VISUAL_PATH_MISMATCH');
    else plannedFields.push('imageGeometry.visualPath');
    if (geometry.hitPath !== row.correctedPath) failures.push('HIT_PATH_MISMATCH');
    else plannedFields.push('imageGeometry.hitPath');
    if (!samePoint(geometry.labelPoint, row.correctedLabelPoint)) failures.push('LABEL_POINT_MISMATCH');
    else plannedFields.push('imageGeometry.labelPoint');
    if (!isNonBlank(geometry.geometryVersion)) failures.push('GEOMETRY_VERSION_MISSING');
    else plannedFields.push('imageGeometry.geometryVersion');
    if (geometry.traceSource !== 'OFFICIAL_IMAGE_TRACED') failures.push(`TRACE_SOURCE_MISMATCH:${geometry.traceSource ?? ''}`);
    else plannedFields.push('imageGeometry.traceSource');
    if (geometry.manualReviewed !== true) failures.push('MANUAL_REVIEWED_NOT_TRUE');
    else plannedFields.push('imageGeometry.manualReviewed');
    if (geometry.pixelAlignmentStatus !== 'PIXEL_ALIGNED') failures.push(`PIXEL_ALIGNMENT_STATUS_MISMATCH:${geometry.pixelAlignmentStatus ?? ''}`);
    else plannedFields.push('imageGeometry.pixelAlignmentStatus');
    if (expectedProduction.traceStatus !== 'OFFICIAL_IMAGE_TRACED') failures.push(`TRACE_STATUS_MISMATCH:${expectedProduction.traceStatus ?? ''}`);
    else plannedFields.push('traceStatus');
    if (expectedProduction.traceMethod !== 'PATH_TRACED_FROM_OFFICIAL_IMAGE') failures.push(`TRACE_METHOD_MISMATCH:${expectedProduction.traceMethod ?? ''}`);
    else plannedFields.push('traceMethod');

    const missingFields = REQUIRED_PRODUCTION_FIELDS.filter((field) => !plannedFields.includes(field));
    if (missingFields.length > 0) failures.push(`REQUIRED_PRODUCTION_FIELDS_MISSING:${missingFields.join(' ')}`);

    return {
      templateRowId: row.templateRowId,
      block: row.block,
      duplicateTargetBlock: row.duplicateTargetBlock === true,
      correctedPath: row.correctedPath ?? '',
      correctedLabelPoint: row.correctedLabelPoint ?? null,
      plannedFields,
      failures,
    };
  });

  rowReports
    .filter((row) => row.failures.length > 0)
    .forEach((row) => blockers.push(`APPROVED_DRY_RUN_INVALID_PLAN_ROW:${row.templateRowId}:${row.failures.join('|')}`));

  const t3Rows = rowReports.filter((row) => row.block === 'T3-2');
  if (t3Rows.length === 2) {
    const uniquePaths = new Set(t3Rows.map((row) => normalizePath(row.correctedPath)));
    const uniqueLabels = new Set(t3Rows.map((row) => normalizePoint(row.correctedLabelPoint).join(',')));
    if (uniquePaths.size !== 1) blockers.push('APPROVED_DRY_RUN_T3_DUPLICATE_PATH_MISMATCH');
    if (uniqueLabels.size !== 1) blockers.push('APPROVED_DRY_RUN_T3_DUPLICATE_LABEL_MISMATCH');
  }

  const dryRunReady = blockers.length === 0 && dryRunPlanReport.exists === true;
  const status = blockers.length > 0
    ? 'approved-dry-run-blocked'
    : dryRunReady
      ? 'ready-for-approved-dry-run-review'
      : 'waiting-for-approved-input';

  const summary = {
    approvedDryRunVersion: APPROVED_DRY_RUN_VERSION,
    gateVersion: GATE_VERSION,
    dryRunApplyPlanVersion: DRY_RUN_APPLY_PLAN_VERSION,
    status,
    gateStatus: gateSummary?.status ?? '',
    targetRows: EXPECTED_TEMPLATE_ROWS.length,
    approvedRows: gateSummary?.approvedRows ?? approvedRows.length,
    validApprovedRows: gateSummary?.validApprovedRows ?? 0,
    plannedRows: plannedRows.length,
    uniqueBlocks,
    duplicateT3Rows: plannedRows.filter((row) => row.block === 'T3-2').length,
    readyForDryRunImport: gateSummary?.readyForDryRunImport === true,
    dryRunPlanWritten: dryRunPlanReport.exists,
    dryRunReady,
    contextOnlyRowsCopied: unexpectedRows.length,
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      approvalGate: path.relative(frontendRoot, approvalGatePath),
      dryRunApplyPlan: path.relative(frontendRoot, dryRunPlanPath),
    },
    requiredProductionFields: REQUIRED_PRODUCTION_FIELDS,
    expectedRows: EXPECTED_TEMPLATE_ROWS,
    expectedUniqueBlocks: EXPECTED_UNIQUE_BLOCKS,
    safetyContract: [
      'Approved dry-run validation is read-only.',
      'It validates the approval input dry-run apply plan only.',
      'It never writes operator input.',
      'It never writes corrections template source.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'Context-only rows must not be copied into production apply plans.',
      'Only T3-2, V1, V2, and V3 may appear as production target blocks.',
      'T3-2 duplicate approval rows must remain identical before any later write gate.',
    ],
    rows: rowReports,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approved-dry-run.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approved-dry-run.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approved-dry-run.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'block',
      'duplicateTargetBlock',
      'plannedFields',
      'failures',
    ],
    ...rowReports.map((row) => [
      row.templateRowId,
      row.block,
      row.duplicateTargetBlock,
      row.plannedFields.join(' '),
      row.failures.join(' '),
    ]),
  ]);

  await fs.writeFile(`${markdownPath}.tmp`, [
    '# Daegu P1 Paired Ownership T3/V Approved Dry-Run Validation',
    '',
    `- version: \`${summary.approvedDryRunVersion}\``,
    `- status: \`${summary.status}\``,
    `- gate status: \`${summary.gateStatus}\``,
    `- approved rows: ${summary.approvedRows}`,
    `- valid approved rows: ${summary.validApprovedRows}`,
    `- planned rows: ${summary.plannedRows}/${summary.targetRows}`,
    `- dry-run ready: ${summary.dryRunReady}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- data file changed: ${summary.dataFileChanged}`,
    '',
    '## Rows',
    '',
    markdownTable(
      ['template row', 'block', 'duplicate', 'planned fields', 'failures'],
      rowReports.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        row.duplicateTargetBlock,
        row.plannedFields.map((field) => `\`${field}\``).join('<br>') || '-',
        row.failures.map((failure) => `\`${failure}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    report.safetyContract.map((item) => `- ${item}`).join('\n'),
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
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    approvedRows: summary.approvedRows,
    validApprovedRows: summary.validApprovedRows,
    plannedRows: summary.plannedRows,
    dryRunReady: summary.dryRunReady,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status === 'approved-dry-run-blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VCandidateApprovalReadinessRegression = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultOutputDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-t3-v-candidate-approval-readiness-regression');

  const REGRESSION_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_CANDIDATE_APPROVAL_READINESS_REGRESSION_V1';
  const READINESS_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_CANDIDATE_APPROVAL_READINESS_V1';
  const CASES = [
    'default-candidate-review-warning',
    'duplicate-t3-path-mismatch',
    'candidate-row-order-mismatch',
    'auto-approved-row',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const cloneJson = (value) => JSON.parse(JSON.stringify(value));

  const spawnNode = (scriptName, args) => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', path.join(scriptDir, scriptName), ...args],
      { cwd: frontendRoot, encoding: 'utf8' },
    );
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  };

  const includesPrefix = (values, prefix) => (values ?? []).some((value) => String(value).startsWith(prefix));

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const sourceCandidateCorrections = await readJson(
    path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-corrections.json'),
  );

  const expected = {
    'default-candidate-review-warning': {
      exitCode: 0,
      status: 'candidate-review-warning',
      targetRows: 5,
      autoApprovedRows: 0,
      requiredWarningPrefix: 'P1_V_CENTER_TABLE_SPLIT:V1:CANDIDATE_COLOR_COVERAGE_REVIEW:',
    },
    'duplicate-t3-path-mismatch': {
      exitCode: 1,
      status: 'candidate-blocked',
      requiredBlockerPrefix: 'CANDIDATE_DUPLICATE_T3_PATH_MISMATCH',
    },
    'candidate-row-order-mismatch': {
      exitCode: 1,
      status: 'candidate-blocked',
      requiredBlockerPrefix: 'CANDIDATE_ROW_ORDER_MISMATCH:',
    },
    'auto-approved-row': {
      exitCode: 1,
      status: 'candidate-blocked',
      requiredBlockerPrefix: 'P1_V_CENTER_TABLE_SPLIT:V1:CANDIDATE_AUTO_APPROVED_ROW',
    },
  };

  const mutateCandidate = (caseName, candidateCorrections) => {
    const candidate = cloneJson(candidateCorrections);
    if (caseName === 'duplicate-t3-path-mismatch') {
      const t3Rows = candidate.rows.filter((row) => row.block === 'T3-2');
      if (t3Rows[1]) {
        t3Rows[1].candidateVisualPath = candidate.rows.find((row) => row.block === 'V1')?.candidateVisualPath ?? t3Rows[1].candidateVisualPath;
        t3Rows[1].suggestedCorrectedPath = t3Rows[1].candidateVisualPath;
      }
    }
    if (caseName === 'candidate-row-order-mismatch') {
      candidate.rows = [...candidate.rows].reverse();
    }
    if (caseName === 'auto-approved-row') {
      const row = candidate.rows.find((candidateRow) => candidateRow.block === 'V1') ?? candidate.rows[0];
      row.operatorDecisionRecommendation = 'APPROVED';
      row.suggestedTargetEntryRow.operatorDecision = 'APPROVED';
    }
    return candidate;
  };

  const caseResults = [];
  for (const caseName of CASES) {
    const caseDir = path.join(outputDir, caseName);
    await fs.mkdir(caseDir, { recursive: true });
    const candidatePath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-corrections.json');
    await writeJson(candidatePath, mutateCandidate(caseName, sourceCandidateCorrections));

    const run = spawnNode('daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-candidate-approval-readiness', 
      '--candidate-corrections',
      candidatePath,
      '--output-dir',
      caseDir,
    ]);
    const readinessPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-approval-readiness.json');
    const readiness = await readJson(readinessPath);
    const overlayPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-approval-readiness-overlay.svg');
    const overlayExists = await fs.stat(overlayPath).then(() => true, () => false);
    const caseExpectation = expected[caseName];
    const failures = [];

    if (run.exitCode !== caseExpectation.exitCode) failures.push(`EXIT_CODE:${run.exitCode}:${caseExpectation.exitCode}`);
    if (readiness.summary?.readinessVersion !== READINESS_VERSION) failures.push(`READINESS_VERSION:${readiness.summary?.readinessVersion ?? ''}`);
    if (readiness.summary?.status !== caseExpectation.status) failures.push(`STATUS:${readiness.summary?.status ?? ''}:${caseExpectation.status}`);
    if (caseExpectation.targetRows !== undefined && readiness.summary?.targetRows !== caseExpectation.targetRows) {
      failures.push(`TARGET_ROWS:${readiness.summary?.targetRows}:${caseExpectation.targetRows}`);
    }
    if (caseExpectation.autoApprovedRows !== undefined && readiness.summary?.autoApprovedRows !== caseExpectation.autoApprovedRows) {
      failures.push(`AUTO_APPROVED_ROWS:${readiness.summary?.autoApprovedRows}:${caseExpectation.autoApprovedRows}`);
    }
    if (caseExpectation.requiredBlockerPrefix && !includesPrefix(readiness.summary?.blockers, caseExpectation.requiredBlockerPrefix)) {
      failures.push(`MISSING_BLOCKER_PREFIX:${caseExpectation.requiredBlockerPrefix}`);
    }
    if (caseExpectation.requiredWarningPrefix && !includesPrefix(readiness.summary?.warnings, caseExpectation.requiredWarningPrefix)) {
      failures.push(`MISSING_WARNING_PREFIX:${caseExpectation.requiredWarningPrefix}`);
    }
    if (readiness.summary?.productionWriteAllowed !== false) failures.push('PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
    if (readiness.summary?.writesOperatorInput !== false) failures.push('WRITES_OPERATOR_INPUT_NOT_FALSE');
    if (readiness.summary?.writesCorrectionsTemplate !== false) failures.push('WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
    if (readiness.summary?.writesProductionData !== false) failures.push('WRITES_PRODUCTION_DATA_NOT_FALSE');
    if (readiness.summary?.dataFileChanged !== false) failures.push('DATA_FILE_CHANGED_NOT_FALSE');
    if (!overlayExists) failures.push('OVERLAY_MISSING');

    caseResults.push({
      caseName,
      exitCode: run.exitCode,
      status: readiness.summary?.status ?? '',
      targetRows: readiness.summary?.targetRows ?? null,
      autoApprovedRows: readiness.summary?.autoApprovedRows ?? null,
      productionWriteAllowed: readiness.summary?.productionWriteAllowed ?? null,
      dataFileChanged: readiness.summary?.dataFileChanged ?? null,
      blockers: readiness.summary?.blockers ?? [],
      warnings: readiness.summary?.warnings ?? [],
      failures,
    });
  }

  const failedCases = caseResults.filter((result) => result.failures.length > 0);
  const summary = {
    regressionVersion: REGRESSION_VERSION,
    status: failedCases.length === 0 ? 'passed' : 'failed',
    totalCases: caseResults.length,
    passedCases: caseResults.length - failedCases.length,
    failedCases: failedCases.length,
    productionWriteAllowed: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    dataFileChanged: false,
    blockers: failedCases.flatMap((result) => result.failures.map((failure) => `${result.caseName}:${failure}`)),
    warnings: [],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'Candidate approval readiness regression never writes operator input, corrections template source, production data, or src/data/daeguSeatData.ts.',
      'default-candidate-review-warning must preserve PENDING candidate suggestions.',
      'duplicate-t3-path-mismatch must remain blocked.',
      'candidate-row-order-mismatch must remain blocked.',
      'auto-approved-row must remain blocked.',
    ],
    cases: caseResults,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-approval-readiness-regression.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-approval-readiness-regression.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-approval-readiness-regression.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'caseName',
      'exitCode',
      'status',
      'targetRows',
      'autoApprovedRows',
      'productionWriteAllowed',
      'dataFileChanged',
      'failures',
    ],
    ...caseResults.map((result) => [
      result.caseName,
      result.exitCode,
      result.status,
      result.targetRows ?? '',
      result.autoApprovedRows ?? '',
      result.productionWriteAllowed,
      result.dataFileChanged,
      result.failures.join(' '),
    ]),
  ]);
  await fs.writeFile(`${markdownPath}.tmp`, [
    '# Daegu T3/V Candidate Approval Readiness Regression',
    '',
    `- regression version: \`${summary.regressionVersion}\``,
    `- status: \`${summary.status}\``,
    `- cases: ${summary.passedCases}/${summary.totalCases}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    markdownTable(
      ['case', 'exit', 'status', 'rows', 'auto approved', 'failures'],
      caseResults.map((result) => [
        `\`${result.caseName}\``,
        result.exitCode,
        `\`${result.status}\``,
        result.targetRows ?? '-',
        result.autoApprovedRows ?? '-',
        result.failures.length > 0 ? result.failures.map((failure) => `\`${failure}\``).join('<br>') : '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
  ].join('\n'), 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    totalCases: summary.totalCases,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status !== 'passed') process.exitCode = 1;
};

const runP1PairedOwnershipT3VCandidateApprovalReadiness = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const READINESS_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_CANDIDATE_APPROVAL_READINESS_V1';
  const CANDIDATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_CANDIDATE_CORRECTIONS_V1';
  const EXPECTED_SHA256 = '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0';
  const IMAGE_WIDTH = 1707;
  const IMAGE_HEIGHT = 2048;
  const IMAGE_HREF = '../../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png';
  const EXPECTED_TEMPLATE_ROWS = [
    'P1_T3_TABLE_OWNERSHIP:T3-2',
    'P1_V_CENTER_TABLE_SPLIT:V1',
    'P1_V_CENTER_TABLE_SPLIT:V2',
    'P1_V_CENTER_TABLE_SPLIT:V3',
    'P1_V_CENTER_TABLE_SPLIT:T3-2',
  ];
  const REQUIRED_APPROVAL_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ];
  const MIN_COLOR_COVERAGE_BLOCKER = 0.7;
  const MIN_COLOR_COVERAGE_REVIEW = 0.8;
  const BBOX_OVERLAP_BLOCKER_RATIO = 0.35;

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const round = (value, digits = 3) => {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
  };

  const normalizePath = (pathData) => String(pathData ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toUpperCase();

  const normalizeLabel = (row) => [
    String(row?.suggestedCorrectedLabelX ?? '').trim(),
    String(row?.suggestedCorrectedLabelY ?? '').trim(),
  ].join(',');

  const normalizeReadinessLabel = (row) => {
    if (!Array.isArray(row?.candidateLabelPoint)) return '';
    return row.candidateLabelPoint.map((value) => String(value).trim()).join(',');
  };

  const pathBoundsOrNull = (pathData) => {
    const text = String(pathData ?? '').trim();
    if (!text) return null;
    try {
      const points = pathToPoints(text);
      if (points.length < 3) return null;
      const bounds = pathBounds(text);
      if (![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(Number.isFinite)) return null;
      return bounds;
    } catch {
      return null;
    }
  };

  const pointBounds = (point) => {
    if (!Array.isArray(point) || point.length < 2) return null;
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { minX: x, minY: y, maxX: x, maxY: y };
  };

  const unionBounds = (boundsList) => {
    const validBounds = boundsList.filter(Boolean);
    if (validBounds.length === 0) return { minX: 0, minY: 0, maxX: IMAGE_WIDTH, maxY: IMAGE_HEIGHT };
    return {
      minX: Math.min(...validBounds.map((bounds) => bounds.minX)),
      minY: Math.min(...validBounds.map((bounds) => bounds.minY)),
      maxX: Math.max(...validBounds.map((bounds) => bounds.maxX)),
      maxY: Math.max(...validBounds.map((bounds) => bounds.maxY)),
    };
  };

  const expandedViewport = (bounds, margin = 118) => {
    const minX = Math.max(0, bounds.minX - margin);
    const minY = Math.max(0, bounds.minY - margin);
    const maxX = Math.min(IMAGE_WIDTH, bounds.maxX + margin);
    const maxY = Math.min(IMAGE_HEIGHT, bounds.maxY + margin);
    const width = Math.max(390, maxX - minX);
    const height = Math.max(310, maxY - minY);
    const adjustedMinX = Math.max(0, Math.min(IMAGE_WIDTH - width, minX));
    const adjustedMinY = Math.max(0, Math.min(IMAGE_HEIGHT - height, minY));
    const adjustedWidth = Math.min(IMAGE_WIDTH, width);
    const adjustedHeight = Math.min(IMAGE_HEIGHT, height);
    return {
      minX: round(adjustedMinX, 2),
      minY: round(adjustedMinY, 2),
      width: round(adjustedWidth, 2),
      height: round(adjustedHeight, 2),
      viewBox: `${round(adjustedMinX, 2)} ${round(adjustedMinY, 2)} ${round(adjustedWidth, 2)} ${round(adjustedHeight, 2)}`,
    };
  };

  const boundsArea = (bounds) => {
    if (!bounds) return 0;
    return Math.max(0, bounds.maxX - bounds.minX) * Math.max(0, bounds.maxY - bounds.minY);
  };

  const boundsOverlapArea = (first, second) => {
    if (!first || !second) return 0;
    const width = Math.max(0, Math.min(first.maxX, second.maxX) - Math.max(first.minX, second.minX));
    const height = Math.max(0, Math.min(first.maxY, second.maxY) - Math.max(first.minY, second.minY));
    return width * height;
  };

  const renderOverlay = ({ rows, contextRows, viewport, status }) => {
    const height = Math.max(580, Math.round((viewport.height / viewport.width) * 1160));
    const contextLayer = contextRows.map((row) => row.currentLabelPoint
      ? `<g><circle cx="${row.currentLabelPoint[0]}" cy="${row.currentLabelPoint[1]}" r="5" fill="#111827" fill-opacity="0.75" stroke="#ffffff" stroke-width="1.5" vector-effect="non-scaling-stroke"/><text x="${row.currentLabelPoint[0] + 7}" y="${row.currentLabelPoint[1] - 7}" font-family="Arial, sans-serif" font-size="10" font-weight="800" fill="#111827" stroke="#ffffff" stroke-width="3" paint-order="stroke">${xmlEscape(`${row.block} context`)}</text></g>`
      : '').join('\n');
    const rowLayers = rows.map((row, index) => [
      row.currentPath
        ? `<path d="${xmlEscape(row.currentPath)}" fill="#f97316" fill-opacity="0.12" stroke="#dc2626" stroke-width="2.2" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} current legacy`)}</title></path>`
        : '',
      row.candidateHitPath
        ? `<path d="${xmlEscape(row.candidateHitPath)}" fill="#a855f7" fill-opacity="0.08" stroke="#7e22ce" stroke-width="2" stroke-dasharray="7 4" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} candidate hitPath`)}</title></path>`
        : '',
      row.candidateVisualPath
        ? `<path d="${xmlEscape(row.candidateVisualPath)}" fill="#22c55e" fill-opacity="0.24" stroke="#16a34a" stroke-width="3" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} candidate visualPath`)}</title></path>`
        : '',
      row.candidateLabelPoint
        ? `<circle cx="${row.candidateLabelPoint[0]}" cy="${row.candidateLabelPoint[1]}" r="6" fill="${row.blockers.length > 0 ? '#dc2626' : '#16a34a'}" stroke="#ffffff" stroke-width="1.8" vector-effect="non-scaling-stroke"/>`
        : '',
      row.candidateLabelPoint
        ? `<text x="${row.candidateLabelPoint[0] + 9}" y="${row.candidateLabelPoint[1] - 8}" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="4" paint-order="stroke">${xmlEscape(`${index + 1}. ${row.block}`)}</text>`
        : '',
      row.candidateLabelPoint && row.warnings.length > 0
        ? `<text x="${row.candidateLabelPoint[0] + 9}" y="${row.candidateLabelPoint[1] + 9}" font-family="Arial, sans-serif" font-size="9" font-weight="800" fill="#b45309" stroke="#ffffff" stroke-width="3" paint-order="stroke">${xmlEscape(row.warnings[0])}</text>`
        : '',
    ].join('\n')).join('\n');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="${height}" viewBox="${viewport.viewBox}">
    <image href="${xmlEscape(IMAGE_HREF)}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" opacity="0.86"/>
    ${contextLayer}
    ${rowLayers}
    <g transform="translate(${viewport.minX + 10} ${viewport.minY + 18})">
      <rect x="0" y="-14" width="535" height="112" rx="4" fill="#ffffff" fill-opacity="0.95" stroke="#cbd5e1" vector-effect="non-scaling-stroke"/>
      <text x="10" y="0" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f172a">Daegu T3/V candidate approval readiness</text>
      <text x="10" y="18" font-family="Arial, sans-serif" font-size="10" fill="#334155">status: ${xmlEscape(status)}</text>
      <text x="10" y="35" font-family="Arial, sans-serif" font-size="10" fill="#334155">green=candidate visualPath, purple=candidate hitPath, red=current legacy</text>
      <text x="10" y="52" font-family="Arial, sans-serif" font-size="10" fill="#334155">operatorDecision/correctedPath/reviewer/reviewedAt are never auto-filled.</text>
      <text x="10" y="69" font-family="Arial, sans-serif" font-size="10" fill="#334155">productionWriteAllowed=false; src/data/daeguSeatData.ts is not modified.</text>
    </g>
  </svg>
  `;
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const candidateCorrectionsPath = path.resolve(
    frontendRoot,
    argValue('--candidate-corrections', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-corrections.json')),
  );

  const candidateCorrections = await readJson(candidateCorrectionsPath);
  const blockers = [];
  const warnings = [];

  if (candidateCorrections.summary?.candidateVersion !== CANDIDATE_VERSION) {
    blockers.push(`CANDIDATE_VERSION_MISMATCH:${candidateCorrections.summary?.candidateVersion ?? ''}`);
  }
  if (candidateCorrections.summary?.officialImageSha256 !== EXPECTED_SHA256) {
    blockers.push(`OFFICIAL_IMAGE_SHA256_MISMATCH:${candidateCorrections.summary?.officialImageSha256 ?? ''}`);
  }
  if (candidateCorrections.summary?.productionWriteAllowed !== false) blockers.push('CANDIDATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (candidateCorrections.summary?.writesOperatorInput !== false) blockers.push('CANDIDATE_WRITES_OPERATOR_INPUT_NOT_FALSE');
  if (candidateCorrections.summary?.writesCorrectionsTemplate !== false) blockers.push('CANDIDATE_WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
  if (candidateCorrections.summary?.writesProductionData !== false) blockers.push('CANDIDATE_WRITES_PRODUCTION_DATA_NOT_FALSE');
  if (candidateCorrections.summary?.dataFileChanged !== false) blockers.push('CANDIDATE_DATA_FILE_CHANGED_NOT_FALSE');

  const candidateRows = Array.isArray(candidateCorrections.rows) ? candidateCorrections.rows : [];
  const actualTemplateRows = candidateRows.map((row) => row.templateRowId);
  if (actualTemplateRows.join(' ') !== EXPECTED_TEMPLATE_ROWS.join(' ')) {
    blockers.push(`CANDIDATE_ROW_ORDER_MISMATCH:${actualTemplateRows.join(' ')}`);
  }
  if (candidateRows.length !== EXPECTED_TEMPLATE_ROWS.length) {
    blockers.push(`CANDIDATE_ROW_COUNT_MISMATCH:${candidateRows.length}:${EXPECTED_TEMPLATE_ROWS.length}`);
  }

  const readinessRows = candidateRows.map((row) => {
    const rowBlockers = [];
    const rowWarnings = [];
    const labelPoint = Array.isArray(row.candidateLabelPoint)
      ? [Number(row.candidateLabelPoint[0]), Number(row.candidateLabelPoint[1])]
      : [Number(row.suggestedCorrectedLabelX), Number(row.suggestedCorrectedLabelY)];
    const visualPath = String(row.candidateVisualPath ?? row.suggestedCorrectedPath ?? '');
    const hitPath = String(row.candidateHitPath ?? '');
    const visualPoints = pathToPoints(visualPath);
    const hitPoints = pathToPoints(hitPath);

    if (!visualPath.trim()) rowBlockers.push('CANDIDATE_VISUAL_PATH_MISSING');
    if (!hitPath.trim()) rowBlockers.push('CANDIDATE_HIT_PATH_MISSING');
    if (!Number.isFinite(labelPoint[0])) rowBlockers.push('CANDIDATE_LABEL_X_NOT_NUMERIC');
    if (!Number.isFinite(labelPoint[1])) rowBlockers.push('CANDIDATE_LABEL_Y_NOT_NUMERIC');

    if (Number.isFinite(labelPoint[0]) && Number.isFinite(labelPoint[1])) {
      rowBlockers.push(...validateSeatMapPolygonPath({
        pathData: visualPath,
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        minPointCount: 4,
        labelPoint,
        labelTolerance: 1,
      }).map((code) => `CANDIDATE_VISUAL_${code}`));
      rowBlockers.push(...validateSeatMapPolygonPath({
        pathData: hitPath,
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        minPointCount: 4,
        labelPoint,
        labelTolerance: 1,
      }).map((code) => `CANDIDATE_HIT_${code}`));
    }

    if (row.suggestedTargetEntryRow?.operatorDecision === 'APPROVED'
      || row.operatorDecisionRecommendation === 'APPROVED') {
      rowBlockers.push('CANDIDATE_AUTO_APPROVED_ROW');
    }
    if (String(row.suggestedTargetEntryRow?.correctedPath ?? '').trim() !== '') rowBlockers.push('CANDIDATE_AUTOFILLED_CORRECTED_PATH');
    if (String(row.suggestedTargetEntryRow?.correctedLabelX ?? '').trim() !== '') rowBlockers.push('CANDIDATE_AUTOFILLED_CORRECTED_LABEL_X');
    if (String(row.suggestedTargetEntryRow?.correctedLabelY ?? '').trim() !== '') rowBlockers.push('CANDIDATE_AUTOFILLED_CORRECTED_LABEL_Y');
    if (String(row.suggestedTargetEntryRow?.reviewer ?? '').trim() !== '') rowBlockers.push('CANDIDATE_AUTOFILLED_REVIEWER');
    if (String(row.suggestedTargetEntryRow?.reviewedAt ?? '').trim() !== '') rowBlockers.push('CANDIDATE_AUTOFILLED_REVIEWED_AT');

    const coverage = Number(row.candidateColorCoverage);
    if (!Number.isFinite(coverage)) {
      rowBlockers.push('CANDIDATE_COLOR_COVERAGE_NOT_NUMERIC');
    } else if (coverage < MIN_COLOR_COVERAGE_BLOCKER) {
      rowBlockers.push(`CANDIDATE_COLOR_COVERAGE_BLOCKED:${coverage}`);
    } else if (coverage < MIN_COLOR_COVERAGE_REVIEW) {
      rowWarnings.push(`CANDIDATE_COLOR_COVERAGE_REVIEW:${coverage}`);
    }
    if ((row.rowWarnings ?? []).includes('SMALL_BLOCK_TEXT_FRAGMENTATION_REVIEW')) {
      rowWarnings.push('SMALL_BLOCK_TEXT_FRAGMENTATION_REVIEW');
    }
    if ((row.rowWarnings ?? []).includes('T3V_DUPLICATE_TARGET_KEEP_IDENTICAL')) {
      rowWarnings.push('T3V_DUPLICATE_TARGET_KEEP_IDENTICAL');
    }
    if (normalizePath(visualPath) === normalizePath(row.currentPath)) {
      rowBlockers.push('CANDIDATE_REUSES_CURRENT_LEGACY_PATH');
    }
    if (normalizePath(visualPath) === normalizePath(row.draftPath)) {
      rowWarnings.push('CANDIDATE_MATCHES_DRAFT_EVIDENCE_CONFIRM_OPERATOR_INTENT');
    }

    return {
      templateRowId: row.templateRowId,
      rowNumber: row.rowNumber,
      groupId: row.groupId,
      block: row.block,
      duplicateTargetBlock: row.duplicateTargetBlock,
      candidateVisualPath: visualPath,
      candidateHitPath: hitPath,
      candidateLabelPoint: Number.isFinite(labelPoint[0]) && Number.isFinite(labelPoint[1]) ? labelPoint : null,
      candidateVisualPointCount: visualPoints.length,
      candidateHitPointCount: hitPoints.length,
      candidateColorCoverage: Number.isFinite(coverage) ? coverage : null,
      candidateVisualBounds: pathBoundsOrNull(visualPath),
      candidateHitBounds: pathBoundsOrNull(hitPath),
      currentPath: row.currentPath ?? '',
      blockers: [...new Set(rowBlockers)],
      warnings: [...new Set(rowWarnings)],
      readyForOperatorReview: rowBlockers.length === 0,
    };
  });

  const rowsByBlock = readinessRows.reduce((map, row) => {
    const list = map.get(row.block) ?? [];
    list.push(row);
    map.set(row.block, list);
    return map;
  }, new Map());

  const t3Rows = rowsByBlock.get('T3-2') ?? [];
  if (t3Rows.length !== 2) blockers.push(`CANDIDATE_DUPLICATE_T3_ROW_COUNT:${t3Rows.length}`);
  if (t3Rows.length === 2) {
    if (new Set(t3Rows.map((row) => normalizePath(row.candidateVisualPath))).size !== 1) {
      blockers.push('CANDIDATE_DUPLICATE_T3_PATH_MISMATCH');
    }
    if (new Set(t3Rows.map((row) => normalizePath(row.candidateHitPath))).size !== 1) {
      blockers.push('CANDIDATE_DUPLICATE_T3_HIT_PATH_MISMATCH');
    }
    if (new Set(t3Rows.map(normalizeReadinessLabel)).size !== 1) {
      blockers.push('CANDIDATE_DUPLICATE_T3_LABEL_MISMATCH');
    }
  }

  readinessRows.forEach((row) => {
    if (!row.candidateLabelPoint) return;
    const containingRows = readinessRows.filter((candidate) => candidate.block !== row.block
      && pointInPolygon(row.candidateLabelPoint, pathToPoints(candidate.candidateVisualPath)));
    if (containingRows.length > 0) {
      row.blockers.push(`CANDIDATE_LABEL_TOP_HIT_MISMATCH:${containingRows.map((candidate) => candidate.block).join('|')}`);
    }
  });

  readinessRows.forEach((row, index) => {
    readinessRows.slice(index + 1).forEach((otherRow) => {
      if (row.block === otherRow.block) return;
      const overlapArea = boundsOverlapArea(row.candidateVisualBounds, otherRow.candidateVisualBounds);
      const denominator = Math.min(boundsArea(row.candidateVisualBounds), boundsArea(otherRow.candidateVisualBounds));
      const overlapRatio = denominator > 0 ? round(overlapArea / denominator) : 0;
      if (overlapRatio >= BBOX_OVERLAP_BLOCKER_RATIO) {
        row.blockers.push(`CANDIDATE_VISUAL_BBOX_OVERLAP:${otherRow.block}:${overlapRatio}`);
        otherRow.blockers.push(`CANDIDATE_VISUAL_BBOX_OVERLAP:${row.block}:${overlapRatio}`);
      }
    });
  });

  const rowBlockers = readinessRows.flatMap((row) => row.blockers.map((blocker) => `${row.templateRowId}:${blocker}`));
  const rowWarnings = readinessRows.flatMap((row) => row.warnings.map((warning) => `${row.templateRowId}:${warning}`));
  const allBlockers = [...new Set([...blockers, ...rowBlockers])];
  const allWarnings = [...new Set([...warnings, ...rowWarnings])];
  const status = allBlockers.length > 0
    ? 'candidate-blocked'
    : allWarnings.length > 0
      ? 'candidate-review-warning'
      : 'candidate-review-ready';
  const viewport = expandedViewport(unionBounds([
    ...readinessRows.flatMap((row) => [
      row.candidateVisualBounds,
      row.candidateHitBounds,
      pathBoundsOrNull(row.currentPath),
      pointBounds(row.candidateLabelPoint),
    ]),
    ...(candidateCorrections.contextRows ?? []).map((row) => pointBounds(row.currentLabelPoint)),
  ]));

  const summary = {
    readinessVersion: READINESS_VERSION,
    status,
    candidateVersion: candidateCorrections.summary?.candidateVersion ?? '',
    officialImageSha256: candidateCorrections.summary?.officialImageSha256 ?? '',
    sha256MatchesExpected: candidateCorrections.summary?.officialImageSha256 === EXPECTED_SHA256,
    targetRows: readinessRows.length,
    reviewReadyRows: readinessRows.filter((row) => row.readyForOperatorReview).length,
    duplicateTargetRows: t3Rows.length,
    autoApprovedRows: readinessRows.filter((row) => row.blockers.includes('CANDIDATE_AUTO_APPROVED_ROW')).length,
    minCandidateColorCoverage: readinessRows.length > 0
      ? Math.min(...readinessRows.map((row) => Number(row.candidateColorCoverage ?? 0)))
      : 0,
    targetViewport: viewport,
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    readyForOperatorReview: status !== 'candidate-blocked',
    blockers: allBlockers,
    warnings: allWarnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      candidateCorrections: path.relative(frontendRoot, candidateCorrectionsPath),
    },
    thresholds: {
      minColorCoverageBlocker: MIN_COLOR_COVERAGE_BLOCKER,
      minColorCoverageReview: MIN_COLOR_COVERAGE_REVIEW,
      bboxOverlapBlockerRatio: BBOX_OVERLAP_BLOCKER_RATIO,
    },
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    safetyContract: [
      'Candidate approval readiness is read-only.',
      'It never writes operator input.',
      'It never writes corrections template source.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'It does not auto-fill correctedPath, correctedLabelX/Y, reviewer, reviewedAt, or operatorDecision=APPROVED.',
      'Candidate paths remain evidence until an operator explicitly approves them.',
    ],
    rows: readinessRows,
    contextRows: candidateCorrections.contextRows ?? [],
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-approval-readiness.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-approval-readiness.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-approval-readiness.md');
  const overlayPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-approval-readiness-overlay.svg');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'rowNumber',
      'block',
      'readyForOperatorReview',
      'candidateVisualPointCount',
      'candidateHitPointCount',
      'candidateColorCoverage',
      'blockers',
      'warnings',
    ],
    ...readinessRows.map((row) => [
      row.templateRowId,
      row.rowNumber,
      row.block,
      row.readyForOperatorReview,
      row.candidateVisualPointCount,
      row.candidateHitPointCount,
      row.candidateColorCoverage ?? '',
      row.blockers.join(' '),
      row.warnings.join(' '),
    ]),
  ]);
  await fs.writeFile(
    `${overlayPath}.tmp`,
    renderOverlay({ rows: readinessRows, contextRows: candidateCorrections.contextRows ?? [], viewport, status }),
    'utf8',
  );
  await fs.rename(`${overlayPath}.tmp`, overlayPath);

  await fs.writeFile(`${markdownPath}.tmp`, [
    '# Daegu P1 Paired Ownership T3/V Candidate Approval Readiness',
    '',
    `- readiness version: \`${summary.readinessVersion}\``,
    `- status: \`${summary.status}\``,
    `- ready for operator review: ${summary.readyForOperatorReview}`,
    `- target rows: ${summary.targetRows}`,
    `- review-ready rows: ${summary.reviewReadyRows}`,
    `- duplicate target rows: ${summary.duplicateTargetRows}`,
    `- auto-approved rows: ${summary.autoApprovedRows}`,
    `- min candidate color coverage: ${summary.minCandidateColorCoverage}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- data file changed: ${summary.dataFileChanged}`,
    '',
    '## Rows',
    '',
    markdownTable(
      ['row', 'template row', 'block', 'ready', 'visual pts', 'hit pts', 'coverage', 'blockers', 'warnings'],
      readinessRows.map((row) => [
        row.rowNumber,
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        String(row.readyForOperatorReview),
        row.candidateVisualPointCount,
        row.candidateHitPointCount,
        row.candidateColorCoverage ?? '-',
        row.blockers.length > 0 ? row.blockers.map((blocker) => `\`${blocker}\``).join('<br>') : '-',
        row.warnings.length > 0 ? row.warnings.map((warning) => `\`${warning}\``).join('<br>') : '-',
      ]),
    ),
    '',
    '## Outputs',
    '',
    `- \`${path.relative(frontendRoot, jsonPath)}\``,
    `- \`${path.relative(frontendRoot, csvPath)}\``,
    `- \`${path.relative(frontendRoot, markdownPath)}\``,
    `- \`${path.relative(frontendRoot, overlayPath)}\``,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
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
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    overlay: path.relative(frontendRoot, overlayPath),
    targetRows: summary.targetRows,
    reviewReadyRows: summary.reviewReadyRows,
    duplicateTargetRows: summary.duplicateTargetRows,
    autoApprovedRows: summary.autoApprovedRows,
    minCandidateColorCoverage: summary.minCandidateColorCoverage,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status === 'candidate-blocked') process.exitCode = 1;
};

const runP1PairedOwnershipT3VCandidateCorrectionsRegression = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultOutputDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-t3-v-candidate-corrections-regression');

  const REGRESSION_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_CANDIDATE_CORRECTIONS_REGRESSION_V1';
  const CANDIDATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_CANDIDATE_CORRECTIONS_V1';
  const CASES = [
    'default-candidate-ready',
    'bad-image-draft-version',
    'target-entry-row-order-mismatch',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const cloneJson = (value) => JSON.parse(JSON.stringify(value));

  const spawnNode = (scriptName, args) => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', path.join(scriptDir, scriptName), ...args],
      { cwd: frontendRoot, encoding: 'utf8' },
    );
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  };

  const hasPrefix = (values, prefix) => (values ?? []).some((value) => String(value).startsWith(prefix));

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const sourceTargetEntryTemplate = await readJson(path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.json'));
  const sourceImageDraft = await readJson(path.join(
    p1ReportDir,
    'daegu-seatmap-p1-boundary-first-image-coordinate-draft/daegu-p1-boundary-first-image-coordinate-draft.json',
  ));

  const expected = {
    'default-candidate-ready': {
      exitCode: 0,
      status: 'candidate-ready',
      targetRows: 5,
      duplicateTargetRows: 2,
      autoApprovedRows: 0,
    },
    'bad-image-draft-version': {
      exitCode: 1,
      status: 'blocked',
      requiredBlockerPrefix: 'IMAGE_DRAFT_VERSION_MISMATCH:',
    },
    'target-entry-row-order-mismatch': {
      exitCode: 1,
      status: 'blocked',
      requiredBlockerPrefix: 'TARGET_ENTRY_TEMPLATE_ROW_ORDER_MISMATCH:',
    },
  };

  const prepareCase = async (caseName, caseDir) => {
    const args = ['--output-dir', caseDir];
    if (caseName === 'bad-image-draft-version') {
      const imageDraft = cloneJson(sourceImageDraft);
      imageDraft.draftVersion = 'BAD_IMAGE_DRAFT_VERSION_REGRESSION_FIXTURE';
      const imageDraftPath = path.join(caseDir, 'bad-image-draft.json');
      await writeJson(imageDraftPath, imageDraft);
      args.push('--image-draft', imageDraftPath);
    }
    if (caseName === 'target-entry-row-order-mismatch') {
      const targetEntryTemplate = cloneJson(sourceTargetEntryTemplate);
      targetEntryTemplate.rows = [...targetEntryTemplate.rows].reverse();
      const targetEntryTemplatePath = path.join(caseDir, 'bad-target-entry-template.json');
      await writeJson(targetEntryTemplatePath, targetEntryTemplate);
      args.push('--target-entry-template', targetEntryTemplatePath);
    }
    return args;
  };

  const caseResults = [];
  for (const caseName of CASES) {
    const caseDir = path.join(outputDir, caseName);
    await fs.mkdir(caseDir, { recursive: true });
    const args = await prepareCase(caseName, caseDir);
    const run = spawnNode('daegu-seatmap-p1-paired-ownership-t3-v-candidate-corrections.mjs', args);
    const reportPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-corrections.json');
    const overlayPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-corrections-overlay.svg');
    const report = await readJson(reportPath);
    const overlayExists = await fs.stat(overlayPath).then(() => true, () => false);
    const caseExpectation = expected[caseName];
    const failures = [];

    if (run.exitCode !== caseExpectation.exitCode) failures.push(`EXIT_CODE:${run.exitCode}:${caseExpectation.exitCode}`);
    if (report.summary?.candidateVersion !== CANDIDATE_VERSION) failures.push(`CANDIDATE_VERSION:${report.summary?.candidateVersion ?? ''}`);
    if (report.summary?.status !== caseExpectation.status) failures.push(`STATUS:${report.summary?.status ?? ''}:${caseExpectation.status}`);
    if (caseExpectation.targetRows !== undefined && report.summary?.targetRows !== caseExpectation.targetRows) {
      failures.push(`TARGET_ROWS:${report.summary?.targetRows}:${caseExpectation.targetRows}`);
    }
    if (caseExpectation.duplicateTargetRows !== undefined && report.summary?.duplicateTargetRows !== caseExpectation.duplicateTargetRows) {
      failures.push(`DUPLICATE_TARGET_ROWS:${report.summary?.duplicateTargetRows}:${caseExpectation.duplicateTargetRows}`);
    }
    if (caseExpectation.autoApprovedRows !== undefined && report.summary?.autoApprovedRows !== caseExpectation.autoApprovedRows) {
      failures.push(`AUTO_APPROVED_ROWS:${report.summary?.autoApprovedRows}:${caseExpectation.autoApprovedRows}`);
    }
    if (caseExpectation.requiredBlockerPrefix && !hasPrefix(report.summary?.blockers, caseExpectation.requiredBlockerPrefix)) {
      failures.push(`MISSING_BLOCKER_PREFIX:${caseExpectation.requiredBlockerPrefix}`);
    }
    if (report.summary?.productionWriteAllowed !== false) failures.push('PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
    if (report.summary?.writesOperatorInput !== false) failures.push('WRITES_OPERATOR_INPUT_NOT_FALSE');
    if (report.summary?.writesCorrectionsTemplate !== false) failures.push('WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
    if (report.summary?.writesProductionData !== false) failures.push('WRITES_PRODUCTION_DATA_NOT_FALSE');
    if (report.summary?.dataFileChanged !== false) failures.push('DATA_FILE_CHANGED_NOT_FALSE');
    if (report.rows.some((row) => row.suggestedTargetEntryRow?.operatorDecision === 'APPROVED')) {
      failures.push('SUGGESTED_TARGET_ENTRY_AUTO_APPROVED');
    }
    if (!overlayExists) failures.push('OVERLAY_MISSING');

    caseResults.push({
      caseName,
      exitCode: run.exitCode,
      status: report.summary?.status ?? '',
      targetRows: report.summary?.targetRows ?? null,
      duplicateTargetRows: report.summary?.duplicateTargetRows ?? null,
      autoApprovedRows: report.summary?.autoApprovedRows ?? null,
      productionWriteAllowed: report.summary?.productionWriteAllowed ?? null,
      dataFileChanged: report.summary?.dataFileChanged ?? null,
      blockers: report.summary?.blockers ?? [],
      failures,
    });
  }

  const failedCases = caseResults.filter((result) => result.failures.length > 0);
  const summary = {
    regressionVersion: REGRESSION_VERSION,
    status: failedCases.length === 0 ? 'passed' : 'failed',
    totalCases: caseResults.length,
    passedCases: caseResults.length - failedCases.length,
    failedCases: failedCases.length,
    productionWriteAllowed: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    dataFileChanged: false,
    blockers: failedCases.flatMap((result) => result.failures.map((failure) => `${result.caseName}:${failure}`)),
    warnings: [],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'Candidate corrections regression never writes operator input, corrections template source, production data, or src/data/daeguSeatData.ts.',
      'default-candidate-ready must keep suggestedTargetEntryRow.operatorDecision=PENDING.',
      'bad-image-draft-version must remain blocked.',
      'target-entry-row-order-mismatch must remain blocked.',
    ],
    cases: caseResults,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-corrections-regression.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-corrections-regression.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-corrections-regression.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'caseName',
      'exitCode',
      'status',
      'targetRows',
      'duplicateTargetRows',
      'autoApprovedRows',
      'productionWriteAllowed',
      'dataFileChanged',
      'failures',
    ],
    ...caseResults.map((result) => [
      result.caseName,
      result.exitCode,
      result.status,
      result.targetRows ?? '',
      result.duplicateTargetRows ?? '',
      result.autoApprovedRows ?? '',
      result.productionWriteAllowed,
      result.dataFileChanged,
      result.failures.join(' '),
    ]),
  ]);
  await fs.writeFile(`${markdownPath}.tmp`, [
    '# Daegu T3/V Candidate Corrections Regression',
    '',
    `- regression version: \`${summary.regressionVersion}\``,
    `- status: \`${summary.status}\``,
    `- cases: ${summary.passedCases}/${summary.totalCases}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    markdownTable(
      ['case', 'exit', 'status', 'rows', 'duplicate', 'auto approved', 'failures'],
      caseResults.map((result) => [
        `\`${result.caseName}\``,
        result.exitCode,
        `\`${result.status}\``,
        result.targetRows ?? '-',
        result.duplicateTargetRows ?? '-',
        result.autoApprovedRows ?? '-',
        result.failures.length > 0 ? result.failures.map((failure) => `\`${failure}\``).join('<br>') : '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
  ].join('\n'), 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    totalCases: summary.totalCases,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status !== 'passed') process.exitCode = 1;
};

const runP1PairedOwnershipT3VCandidateCorrections = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const CANDIDATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_CANDIDATE_CORRECTIONS_V1';
  const TARGET_REVIEW_PACKET_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_REVIEW_PACKET_V1';
  const TARGET_ENTRY_TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_TEMPLATE_V1';
  const TARGET_ENTRY_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_GATE_V1';
  const IMAGE_DRAFT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_IMAGE_COORDINATE_DRAFT_V1';
  const EXPECTED_SHA256 = '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0';
  const OFFICIAL_IMAGE = 'src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png';
  const IMAGE_WIDTH = 1707;
  const IMAGE_HEIGHT = 2048;
  const IMAGE_HREF = '../../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png';
  const TARGET_TEMPLATE_ROWS = [
    'P1_T3_TABLE_OWNERSHIP:T3-2',
    'P1_V_CENTER_TABLE_SPLIT:V1',
    'P1_V_CENTER_TABLE_SPLIT:V2',
    'P1_V_CENTER_TABLE_SPLIT:V3',
    'P1_V_CENTER_TABLE_SPLIT:T3-2',
  ];
  const DUPLICATE_TARGET_BLOCKS = ['T3-2'];
  const TARGET_BLOCKS = ['T3-2', 'V1', 'V2', 'V3'];
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

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const round = (value, digits = 2) => {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
  };

  const pathBoundsOrNull = (pathData) => {
    const text = String(pathData ?? '').trim();
    if (!text) return null;
    try {
      const points = pathToPoints(text);
      if (points.length < 3) return null;
      const bounds = pathBounds(text);
      if (![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(Number.isFinite)) return null;
      return bounds;
    } catch {
      return null;
    }
  };

  const pointBounds = (point) => {
    if (!Array.isArray(point) || point.length < 2) return null;
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { minX: x, minY: y, maxX: x, maxY: y };
  };

  const bboxBounds = (bbox) => {
    if (!Array.isArray(bbox) || bbox.length < 4) return null;
    const values = bbox.slice(0, 4).map(Number);
    if (!values.every(Number.isFinite)) return null;
    return {
      minX: Math.min(values[0], values[2]),
      minY: Math.min(values[1], values[3]),
      maxX: Math.max(values[0], values[2]),
      maxY: Math.max(values[1], values[3]),
    };
  };

  const unionBounds = (boundsList) => {
    const validBounds = boundsList.filter(Boolean);
    if (validBounds.length === 0) {
      return { minX: 0, minY: 0, maxX: IMAGE_WIDTH, maxY: IMAGE_HEIGHT };
    }
    return {
      minX: Math.min(...validBounds.map((bounds) => bounds.minX)),
      minY: Math.min(...validBounds.map((bounds) => bounds.minY)),
      maxX: Math.max(...validBounds.map((bounds) => bounds.maxX)),
      maxY: Math.max(...validBounds.map((bounds) => bounds.maxY)),
    };
  };

  const expandedViewport = (bounds, margin = 108) => {
    const minX = Math.max(0, bounds.minX - margin);
    const minY = Math.max(0, bounds.minY - margin);
    const maxX = Math.min(IMAGE_WIDTH, bounds.maxX + margin);
    const maxY = Math.min(IMAGE_HEIGHT, bounds.maxY + margin);
    const width = Math.max(360, maxX - minX);
    const height = Math.max(280, maxY - minY);
    const adjustedMinX = Math.max(0, Math.min(IMAGE_WIDTH - width, minX));
    const adjustedMinY = Math.max(0, Math.min(IMAGE_HEIGHT - height, minY));
    return {
      minX: round(adjustedMinX),
      minY: round(adjustedMinY),
      width: round(Math.min(IMAGE_WIDTH, width)),
      height: round(Math.min(IMAGE_HEIGHT, height)),
      viewBox: `${round(adjustedMinX)} ${round(adjustedMinY)} ${round(Math.min(IMAGE_WIDTH, width))} ${round(Math.min(IMAGE_HEIGHT, height))}`,
    };
  };

  const polygonCentroid = (points) => {
    const total = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0]);
    return [total[0] / points.length, total[1] / points.length];
  };

  const clampPoint = ([x, y]) => [
    Math.max(0, Math.min(IMAGE_WIDTH, round(x))),
    Math.max(0, Math.min(IMAGE_HEIGHT, round(y))),
  ];

  const candidateHitPath = (visualPath, margin) => {
    const points = pathToPoints(visualPath);
    if (points.length < 3) return '';
    const [cx, cy] = polygonCentroid(points);
    const expanded = points.map(([x, y]) => {
      const dx = x - cx;
      const dy = y - cy;
      const length = Math.hypot(dx, dy) || 1;
      return clampPoint([x + ((dx / length) * margin), y + ((dy / length) * margin)]);
    });
    return pointsToPath(expanded);
  };

  const colorMatches = ([red, green, blue], colorClass) => {
    if (colorClass === 'maroon') {
      return red >= 50 && red <= 150 && green <= 95 && blue <= 115 && red >= green + 25;
    }
    if (colorClass === 'olive') {
      return red >= 150 && red <= 235 && green >= 150 && green <= 235 && blue >= 15 && blue <= 130
        && Math.abs(red - green) <= 48 && red >= blue + 70 && green >= blue + 70;
    }
    return false;
  };

  const sampleCandidatePixels = ({ imageBuffer, imageInfo, visualPath, colorClass }) => {
    const points = pathToPoints(visualPath);
    const bounds = pathBounds(visualPath);
    let sampledPixels = 0;
    let targetLikePixels = 0;
    const colors = new Map();
    for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y += 1) {
      for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x += 1) {
        if (x < 0 || y < 0 || x >= imageInfo.width || y >= imageInfo.height) continue;
        if (!pointInPolygon([x + 0.5, y + 0.5], points)) continue;
        const offset = ((y * imageInfo.width) + x) * imageInfo.channels;
        const red = imageBuffer[offset];
        const green = imageBuffer[offset + 1];
        const blue = imageBuffer[offset + 2];
        const alpha = imageInfo.channels >= 4 ? imageBuffer[offset + 3] : 255;
        if (alpha < 128) continue;
        sampledPixels += 1;
        if (colorMatches([red, green, blue], colorClass)) targetLikePixels += 1;
        const key = `${Math.round(red / 16) * 16},${Math.round(green / 16) * 16},${Math.round(blue / 16) * 16}`;
        colors.set(key, (colors.get(key) ?? 0) + 1);
      }
    }
    return {
      sampledPixels,
      targetLikePixels,
      targetColorCoverage: sampledPixels > 0 ? round(targetLikePixels / sampledPixels, 4) : 0,
      dominantColors: [...colors.entries()]
        .sort((first, second) => second[1] - first[1])
        .slice(0, 6)
        .map(([rgb, pixels]) => ({ rgb, pixels })),
    };
  };

  const boundsArea = (bounds) => {
    if (!bounds) return 0;
    return Math.max(0, bounds.maxX - bounds.minX) * Math.max(0, bounds.maxY - bounds.minY);
  };

  const boundsOverlapArea = (first, second) => {
    if (!first || !second) return 0;
    const width = Math.max(0, Math.min(first.maxX, second.maxX) - Math.max(first.minX, second.minX));
    const height = Math.max(0, Math.min(first.maxY, second.maxY) - Math.max(first.minY, second.minY));
    return width * height;
  };

  const renderOverlay = ({ rows, contextRows, viewport }) => {
    const height = Math.max(560, Math.round((viewport.height / viewport.width) * 1160));
    const rowLayers = rows.map((row, index) => [
      row.currentPath
        ? `<path d="${xmlEscape(row.currentPath)}" fill="#f97316" fill-opacity="0.13" stroke="#dc2626" stroke-width="2.4" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} current legacy`)}</title></path>`
        : '',
      row.draftPath
        ? `<path d="${xmlEscape(row.draftPath)}" fill="#0ea5e9" fill-opacity="0.12" stroke="#0284c7" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} draft evidence`)}</title></path>`
        : '',
      row.candidateHitPath
        ? `<path d="${xmlEscape(row.candidateHitPath)}" fill="#a855f7" fill-opacity="0.08" stroke="#7e22ce" stroke-width="2" stroke-dasharray="7 4" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} candidate hitPath`)}</title></path>`
        : '',
      row.candidateVisualPath
        ? `<path d="${xmlEscape(row.candidateVisualPath)}" fill="#22c55e" fill-opacity="0.22" stroke="#16a34a" stroke-width="3" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} candidate visualPath`)}</title></path>`
        : '',
      row.candidateLabelPoint
        ? `<circle cx="${row.candidateLabelPoint[0]}" cy="${row.candidateLabelPoint[1]}" r="6" fill="#16a34a" stroke="#ffffff" stroke-width="1.8" vector-effect="non-scaling-stroke"/>`
        : '',
      row.candidateLabelPoint
        ? `<text x="${row.candidateLabelPoint[0] + 9}" y="${row.candidateLabelPoint[1] - 8}" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="4" paint-order="stroke">${xmlEscape(`${index + 1}. ${row.block}`)}</text>`
        : '',
    ].join('\n')).join('\n');
    const contextLayer = contextRows.map((row) => row.currentLabelPoint
      ? `<g><circle cx="${row.currentLabelPoint[0]}" cy="${row.currentLabelPoint[1]}" r="5" fill="#111827" fill-opacity="0.8" stroke="#ffffff" stroke-width="1.5" vector-effect="non-scaling-stroke"/><text x="${row.currentLabelPoint[0] + 7}" y="${row.currentLabelPoint[1] - 7}" font-family="Arial, sans-serif" font-size="10" font-weight="800" fill="#111827" stroke="#ffffff" stroke-width="3" paint-order="stroke">${xmlEscape(`${row.block} context`)}</text></g>`
      : '').join('\n');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="${height}" viewBox="${viewport.viewBox}">
    <image href="${xmlEscape(IMAGE_HREF)}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" opacity="0.86"/>
    ${contextLayer}
    ${rowLayers}
    <g transform="translate(${viewport.minX + 10} ${viewport.minY + 18})">
      <rect x="0" y="-14" width="500" height="103" rx="4" fill="#ffffff" fill-opacity="0.95" stroke="#cbd5e1" vector-effect="non-scaling-stroke"/>
      <text x="10" y="0" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f172a">Daegu T3/V candidate corrections</text>
      <text x="10" y="18" font-family="Arial, sans-serif" font-size="10" fill="#334155">red=current, blue=draft evidence, green=candidate visualPath, purple=candidate hitPath</text>
      <text x="10" y="35" font-family="Arial, sans-serif" font-size="10" fill="#334155">candidate paths are official-PNG image-analysis evidence only.</text>
      <text x="10" y="52" font-family="Arial, sans-serif" font-size="10" fill="#334155">operatorDecision remains PENDING until reviewer/reviewedAt are filled.</text>
      <text x="10" y="69" font-family="Arial, sans-serif" font-size="10" fill="#334155">productionWriteAllowed=false; src/data/daeguSeatData.ts is not modified.</text>
    </g>
  </svg>
  `;
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const targetReviewPacketPath = path.resolve(
    frontendRoot,
    argValue('--target-review-packet', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.json')),
  );
  const targetEntryTemplatePath = path.resolve(
    frontendRoot,
    argValue('--target-entry-template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.json')),
  );
  const targetEntryGatePath = path.resolve(
    frontendRoot,
    argValue('--target-entry-gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate.json')),
  );
  const imageDraftPath = path.resolve(
    frontendRoot,
    argValue(
      '--image-draft',
      path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-image-coordinate-draft/daegu-p1-boundary-first-image-coordinate-draft.json'),
    ),
  );
  const officialImagePath = path.resolve(frontendRoot, argValue('--official-image', OFFICIAL_IMAGE));

  const targetReviewPacket = await readJson(targetReviewPacketPath);
  const targetEntryTemplate = await readJson(targetEntryTemplatePath);
  const targetEntryGate = await readJson(targetEntryGatePath);
  const imageDraft = await readJson(imageDraftPath);
  const officialImageBuffer = await fs.readFile(officialImagePath);
  const officialImageSha256 = crypto.createHash('sha256').update(officialImageBuffer).digest('hex');
  const rawImage = await sharp(officialImageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const blockers = [];
  const warnings = [];

  if (targetReviewPacket.summary?.packetVersion !== TARGET_REVIEW_PACKET_VERSION) {
    blockers.push(`TARGET_REVIEW_PACKET_VERSION_MISMATCH:${targetReviewPacket.summary?.packetVersion ?? ''}`);
  }
  if (targetEntryTemplate.targetEntryTemplateVersion !== TARGET_ENTRY_TEMPLATE_VERSION) {
    blockers.push(`TARGET_ENTRY_TEMPLATE_VERSION_MISMATCH:${targetEntryTemplate.targetEntryTemplateVersion ?? ''}`);
  }
  if (targetEntryGate.summary?.gateVersion !== TARGET_ENTRY_GATE_VERSION) {
    blockers.push(`TARGET_ENTRY_GATE_VERSION_MISMATCH:${targetEntryGate.summary?.gateVersion ?? ''}`);
  }
  if (imageDraft.draftVersion !== IMAGE_DRAFT_VERSION) blockers.push(`IMAGE_DRAFT_VERSION_MISMATCH:${imageDraft.draftVersion ?? ''}`);
  if (officialImageSha256 !== EXPECTED_SHA256) blockers.push(`OFFICIAL_IMAGE_SHA256_MISMATCH:${officialImageSha256}`);
  if (rawImage.info.width !== IMAGE_WIDTH || rawImage.info.height !== IMAGE_HEIGHT) {
    blockers.push(`OFFICIAL_IMAGE_SIZE_MISMATCH:${rawImage.info.width}x${rawImage.info.height}`);
  }
  [
    ['TARGET_REVIEW_PACKET', targetReviewPacket.summary],
    ['TARGET_ENTRY_GATE', targetEntryGate.summary],
  ].forEach(([label, summary]) => {
    if (summary?.productionWriteAllowed !== false) blockers.push(`${label}_PRODUCTION_WRITE_ALLOWED_NOT_FALSE`);
    if (summary?.writesOperatorInput === true) blockers.push(`${label}_WRITES_OPERATOR_INPUT_TRUE`);
    if (summary?.writesProductionData === true) blockers.push(`${label}_WRITES_PRODUCTION_DATA_TRUE`);
  });
  if (targetEntryTemplate.productionWriteAllowed !== false) blockers.push('TARGET_ENTRY_TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (targetEntryTemplate.writesOperatorInput !== false) blockers.push('TARGET_ENTRY_TEMPLATE_WRITES_OPERATOR_INPUT_NOT_FALSE');
  if (targetEntryTemplate.writesProductionData !== false) blockers.push('TARGET_ENTRY_TEMPLATE_WRITES_PRODUCTION_DATA_NOT_FALSE');

  const targetRows = Array.isArray(targetReviewPacket.targetRows) ? targetReviewPacket.targetRows : [];
  const targetEntryRows = Array.isArray(targetEntryTemplate.rows) ? targetEntryTemplate.rows : [];
  const draftRowsByBlock = new Map((imageDraft.rows ?? []).map((row) => [row.block, row]));
  const targetRowsByTemplateRowId = new Map(targetRows.map((row) => [row.templateRowId, row]));
  const targetEntryRowsByTemplateRowId = new Map(targetEntryRows.map((row) => [row.templateRowId, row]));
  const actualRowIds = targetEntryRows.map((row) => row.templateRowId);
  if (actualRowIds.join(' ') !== TARGET_TEMPLATE_ROWS.join(' ')) {
    blockers.push(`TARGET_ENTRY_TEMPLATE_ROW_ORDER_MISMATCH:${actualRowIds.join(' ')}`);
  }
  TARGET_BLOCKS.forEach((block) => {
    if (!draftRowsByBlock.has(block)) blockers.push(`IMAGE_DRAFT_TARGET_ROW_MISSING:${block}`);
  });

  const candidateRows = TARGET_TEMPLATE_ROWS.map((templateRowId, index) => {
    const targetRow = targetRowsByTemplateRowId.get(templateRowId) ?? {};
    const entryRow = targetEntryRowsByTemplateRowId.get(templateRowId) ?? {};
    const draftRow = draftRowsByBlock.get(entryRow.block ?? targetRow.block) ?? {};
    const visualPath = String(draftRow.correctedPathDraft ?? targetRow.draftPath ?? '').trim();
    const visualPoints = pathToPoints(visualPath);
    const labelPoint = [Number(draftRow.correctedLabelX), Number(draftRow.correctedLabelY)];
    const hitPath = candidateHitPath(visualPath, entryRow.block === 'T3-2' ? 5 : 7);
    const validationCodes = validateSeatMapPolygonPath({
      pathData: visualPath,
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      minPointCount: 4,
      labelPoint,
      labelTolerance: 1,
    });
    const hitValidationCodes = validateSeatMapPolygonPath({
      pathData: hitPath,
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      minPointCount: 4,
      labelPoint,
      labelTolerance: 1,
    });
    const imageSample = visualPath
      ? sampleCandidatePixels({
        imageBuffer: rawImage.data,
        imageInfo: rawImage.info,
        visualPath,
        colorClass: draftRow.colorClass,
      })
      : {
        sampledPixels: 0,
        targetLikePixels: 0,
        targetColorCoverage: 0,
        dominantColors: [],
      };
    const rowWarnings = [
      'DRAFT_PATH_IS_EVIDENCE_ONLY',
      'OPERATOR_APPROVAL_REQUIRED',
      ...(entryRow.block === 'T3-2' ? ['T3V_DUPLICATE_TARGET_KEEP_IDENTICAL'] : []),
      ...(String(entryRow.block ?? '').startsWith('V') ? ['SMALL_BLOCK_TEXT_FRAGMENTATION_REVIEW'] : []),
    ];
    if (imageSample.targetColorCoverage < 0.5) rowWarnings.push(`LOW_CANDIDATE_COLOR_COVERAGE:${imageSample.targetColorCoverage}`);
    if (validationCodes.length > 0) rowWarnings.push(`CANDIDATE_VISUAL_VALIDATION:${validationCodes.join('|')}`);
    if (hitValidationCodes.length > 0) rowWarnings.push(`CANDIDATE_HIT_VALIDATION:${hitValidationCodes.join('|')}`);

    return {
      rowNumber: index + 1,
      templateRowId,
      editableTarget: entryRow.editableTarget ?? targetRow.editableTarget ?? '',
      groupId: entryRow.groupId ?? targetRow.groupId ?? '',
      block: entryRow.block ?? targetRow.block ?? '',
      duplicateTargetBlock: DUPLICATE_TARGET_BLOCKS.includes(entryRow.block ?? targetRow.block),
      operatorDecisionRecommendation: 'PENDING',
      suggestedCorrectedPath: visualPath,
      suggestedCorrectedLabelX: Number.isFinite(labelPoint[0]) ? labelPoint[0] : '',
      suggestedCorrectedLabelY: Number.isFinite(labelPoint[1]) ? labelPoint[1] : '',
      candidateVisualPath: visualPath,
      candidateHitPath: hitPath,
      candidateLabelPoint: Number.isFinite(labelPoint[0]) && Number.isFinite(labelPoint[1]) ? labelPoint : null,
      candidateVisualPointCount: visualPoints.length,
      candidateVisualArea: visualPoints.length >= 3 ? round(polygonArea(visualPoints), 2) : null,
      candidateHitArea: pathToPoints(hitPath).length >= 3 ? round(polygonArea(pathToPoints(hitPath)), 2) : null,
      candidateVisualBounds: pathBoundsOrNull(visualPath),
      candidateHitBounds: pathBoundsOrNull(hitPath),
      candidateLabelInsideVisual: visualPoints.length >= 3 && Number.isFinite(labelPoint[0]) && Number.isFinite(labelPoint[1])
        ? pointInPolygon(labelPoint, visualPoints)
        : false,
      validationCodes,
      hitValidationCodes,
      imageBasedAnalysis: true,
      officialImageSha256,
      sourceColorClass: draftRow.colorClass ?? '',
      sourceComponentBbox: draftRow.componentBbox ?? null,
      sourceComponentAreaPx: draftRow.componentAreaPx ?? null,
      candidateColorCoverage: imageSample.targetColorCoverage,
      candidateTargetLikePixels: imageSample.targetLikePixels,
      candidateSampledPixels: imageSample.sampledPixels,
      dominantColors: imageSample.dominantColors,
      targetReviewCoverage: targetRow.targetColorCoverage ?? null,
      currentPath: targetRow.currentPath ?? '',
      draftPath: targetRow.draftPath ?? '',
      currentLabelPoint: targetRow.currentLabelPoint ?? null,
      draftLabelPoint: targetRow.draftLabelPoint ?? null,
      evidenceCrop: targetRow.evidenceCrop ?? '',
      draftOverlayPath: targetRow.draftOverlayPath ?? draftRow.overlayPath ?? '',
      suggestedTargetEntryRow: {
        templateRowId,
        operatorDecision: 'PENDING',
        correctedPath: '',
        correctedLabelX: '',
        correctedLabelY: '',
        reviewer: '',
        reviewedAt: '',
        operatorNote: 'Use suggestedCorrectedPath/Label only after operator visual approval.',
        suggestedCorrectedPath: visualPath,
        suggestedCorrectedLabelX: Number.isFinite(labelPoint[0]) ? labelPoint[0] : '',
        suggestedCorrectedLabelY: Number.isFinite(labelPoint[1]) ? labelPoint[1] : '',
      },
      rowWarnings,
    };
  });

  candidateRows.forEach((row) => {
    if (row.candidateLabelPoint) {
      const containingOtherBlocks = candidateRows.filter((candidate) => candidate.block !== row.block
        && pointInPolygon(row.candidateLabelPoint, pathToPoints(candidate.candidateVisualPath)));
      if (containingOtherBlocks.length > 0) {
        row.rowWarnings.push(`CANDIDATE_LABEL_TOP_HIT_REVIEW:${containingOtherBlocks.map((candidate) => candidate.block).join('|')}`);
      }
    }
  });

  candidateRows.forEach((row, index) => {
    candidateRows.slice(index + 1).forEach((otherRow) => {
      if (row.block === otherRow.block) return;
      const overlapArea = boundsOverlapArea(row.candidateVisualBounds, otherRow.candidateVisualBounds);
      const denominator = Math.min(boundsArea(row.candidateVisualBounds), boundsArea(otherRow.candidateVisualBounds));
      const overlapRatio = denominator > 0 ? round(overlapArea / denominator, 3) : 0;
      if (overlapRatio >= 0.35) {
        row.rowWarnings.push(`CANDIDATE_BBOX_OVERLAP_REVIEW:${otherRow.block}:${overlapRatio}`);
        otherRow.rowWarnings.push(`CANDIDATE_BBOX_OVERLAP_REVIEW:${row.block}:${overlapRatio}`);
      }
    });
  });

  const autoApprovedRows = candidateRows.filter((row) => row.suggestedTargetEntryRow.operatorDecision === 'APPROVED');
  if (autoApprovedRows.length > 0) blockers.push(`CANDIDATE_AUTO_APPROVED_ROWS:${autoApprovedRows.map((row) => row.templateRowId).join(' ')}`);

  const duplicateT3Rows = candidateRows.filter((row) => row.block === 'T3-2');
  if (duplicateT3Rows.length !== 2) blockers.push(`CANDIDATE_DUPLICATE_T3_ROW_COUNT:${duplicateT3Rows.length}`);
  if (new Set(duplicateT3Rows.map((row) => row.suggestedCorrectedPath)).size > 1) {
    blockers.push('CANDIDATE_DUPLICATE_T3_PATH_MISMATCH');
  }
  if (new Set(duplicateT3Rows.map((row) => `${row.suggestedCorrectedLabelX},${row.suggestedCorrectedLabelY}`)).size > 1) {
    blockers.push('CANDIDATE_DUPLICATE_T3_LABEL_MISMATCH');
  }

  const contextRows = (targetReviewPacket.contextRows ?? []).map((row) => ({
    templateRowId: row.templateRowId,
    groupId: row.groupId,
    block: row.block,
    currentLabelPoint: row.currentLabelPoint ?? null,
    role: row.sourceCopyRole ?? 'context-only-gate-row',
  }));
  const viewport = expandedViewport(unionBounds([
    ...candidateRows.flatMap((row) => [
      pathBoundsOrNull(row.currentPath),
      pathBoundsOrNull(row.draftPath),
      row.candidateVisualBounds,
      row.candidateHitBounds,
      pointBounds(row.currentLabelPoint),
      pointBounds(row.draftLabelPoint),
      pointBounds(row.candidateLabelPoint),
      bboxBounds(row.sourceComponentBbox),
    ]),
    ...contextRows.map((row) => pointBounds(row.currentLabelPoint)),
  ]));

  const status = blockers.length > 0 ? 'blocked' : 'candidate-ready';
  const summary = {
    candidateVersion: CANDIDATE_VERSION,
    status,
    targetReviewPacketVersion: targetReviewPacket.summary?.packetVersion ?? '',
    targetEntryTemplateVersion: targetEntryTemplate.targetEntryTemplateVersion ?? '',
    targetEntryGateVersion: targetEntryGate.summary?.gateVersion ?? '',
    imageDraftVersion: imageDraft.draftVersion ?? '',
    officialImage: path.relative(frontendRoot, officialImagePath),
    officialImageSha256,
    sha256MatchesExpected: officialImageSha256 === EXPECTED_SHA256,
    targetRows: candidateRows.length,
    duplicateTargetRows: duplicateT3Rows.length,
    autoApprovedRows: autoApprovedRows.length,
    candidateRows: candidateRows.length,
    candidateRowsWithWarnings: candidateRows.filter((row) => row.rowWarnings.length > 0).length,
    minCandidateColorCoverage: candidateRows.length > 0
      ? Math.min(...candidateRows.map((row) => row.candidateColorCoverage))
      : 0,
    coordinateSystem: 'SVG viewBox 0 0 1707 2048',
    targetViewport: viewport,
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    sourceOfTruth: false,
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      targetReviewPacket: path.relative(frontendRoot, targetReviewPacketPath),
      targetEntryTemplate: path.relative(frontendRoot, targetEntryTemplatePath),
      targetEntryGate: path.relative(frontendRoot, targetEntryGatePath),
      imageDraft: path.relative(frontendRoot, imageDraftPath),
    },
    sourcePolicy: {
      allowedCoordinateSource: 'official Daegu Samsung Lions Park PNG 1707x2048 plus operator-provided corrected coordinates only',
      imageBasedAnalysis: true,
      disallowedSources: [
        'automatic production promotion',
        'browser CSS pixels',
        'resized screenshots',
        'external baseball crawling',
        'web-search-based baseball data',
        'context-only row copy',
      ],
    },
    safetyContract: [
      'This candidate-corrections packet is read-only.',
      'It never writes operator input.',
      'It never writes corrections template source.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'Candidate paths are official-PNG image-analysis evidence only.',
      'operatorDecision remains PENDING in suggestedTargetEntryRow.',
      'Do not copy suggestedCorrectedPath into correctedPath without operator visual approval.',
      'Production reflection still requires operatorDecision=APPROVED, correctedPath, correctedLabelX/Y, reviewer, and reviewedAt.',
    ],
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    rows: candidateRows,
    contextRows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-corrections.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-corrections.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-corrections.md');
  const overlayPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-corrections-overlay.svg');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'rowNumber',
      'templateRowId',
      'groupId',
      'block',
      'duplicateTargetBlock',
      'operatorDecisionRecommendation',
      'suggestedCorrectedPath',
      'suggestedCorrectedLabelX',
      'suggestedCorrectedLabelY',
      'candidateVisualPointCount',
      'candidateVisualArea',
      'candidateHitArea',
      'candidateColorCoverage',
      'candidateTargetLikePixels',
      'candidateSampledPixels',
      'validationCodes',
      'hitValidationCodes',
      'rowWarnings',
    ],
    ...candidateRows.map((row) => [
      row.rowNumber,
      row.templateRowId,
      row.groupId,
      row.block,
      row.duplicateTargetBlock,
      row.operatorDecisionRecommendation,
      row.suggestedCorrectedPath,
      row.suggestedCorrectedLabelX,
      row.suggestedCorrectedLabelY,
      row.candidateVisualPointCount,
      row.candidateVisualArea ?? '',
      row.candidateHitArea ?? '',
      row.candidateColorCoverage,
      row.candidateTargetLikePixels,
      row.candidateSampledPixels,
      row.validationCodes.join(' '),
      row.hitValidationCodes.join(' '),
      row.rowWarnings.join(' '),
    ]),
  ]);
  await fs.writeFile(`${overlayPath}.tmp`, renderOverlay({ rows: candidateRows, contextRows, viewport }), 'utf8');
  await fs.rename(`${overlayPath}.tmp`, overlayPath);

  await fs.writeFile(`${markdownPath}.tmp`, [
    '# Daegu P1 Paired Ownership T3/V Candidate Corrections',
    '',
    `- candidate version: \`${summary.candidateVersion}\``,
    `- status: \`${summary.status}\``,
    `- official image sha256: \`${summary.officialImageSha256}\``,
    `- sha256 matches expected: ${summary.sha256MatchesExpected}`,
    `- target rows: ${summary.targetRows}`,
    `- duplicate target rows: ${summary.duplicateTargetRows}`,
    `- auto-approved rows: ${summary.autoApprovedRows}`,
    `- min candidate color coverage: ${summary.minCandidateColorCoverage}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- data file changed: ${summary.dataFileChanged}`,
    '',
    '## Candidate Rows',
    '',
    markdownTable(
      ['row', 'template row', 'block', 'decision', 'visual pts', 'visual area', 'hit area', 'coverage', 'warnings'],
      candidateRows.map((row) => [
        row.rowNumber,
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        `\`${row.operatorDecisionRecommendation}\``,
        row.candidateVisualPointCount,
        row.candidateVisualArea ?? '-',
        row.candidateHitArea ?? '-',
        row.candidateColorCoverage,
        row.rowWarnings.map((warning) => `\`${warning}\``).join('<br>'),
      ]),
    ),
    '',
    '## Suggested Entry Policy',
    '',
    '- `suggestedTargetEntryRow.operatorDecision` is always `PENDING`.',
    '- `suggestedCorrectedPath` is evidence for the operator, not production input.',
    '- The operator must explicitly fill `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt` before target-entry-gate can accept a row.',
    '',
    '## Outputs',
    '',
    `- \`${path.relative(frontendRoot, jsonPath)}\``,
    `- \`${path.relative(frontendRoot, csvPath)}\``,
    `- \`${path.relative(frontendRoot, markdownPath)}\``,
    `- \`${path.relative(frontendRoot, overlayPath)}\``,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
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
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    overlay: path.relative(frontendRoot, overlayPath),
    targetRows: summary.targetRows,
    duplicateTargetRows: summary.duplicateTargetRows,
    autoApprovedRows: summary.autoApprovedRows,
    minCandidateColorCoverage: summary.minCandidateColorCoverage,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') process.exitCode = 1;
};

const runP1PairedOwnershipT3VCoordinateEntryPack = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const PACK_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_COORDINATE_ENTRY_PACK_V1';
  const TARGET_REVIEW_PACKET_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_REVIEW_PACKET_V1';
  const TARGET_ENTRY_TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_TEMPLATE_V1';
  const TARGET_ENTRY_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_GATE_V1';
  const HANDOFF_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_OPERATOR_HANDOFF_V1';
  const EXPECTED_SHA256 = '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0';
  const IMAGE_WIDTH = 1707;
  const IMAGE_HEIGHT = 2048;
  const IMAGE_HREF = '../../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png';
  const TARGET_TEMPLATE_ROWS = [
    'P1_T3_TABLE_OWNERSHIP:T3-2',
    'P1_V_CENTER_TABLE_SPLIT:V1',
    'P1_V_CENTER_TABLE_SPLIT:V2',
    'P1_V_CENTER_TABLE_SPLIT:V3',
    'P1_V_CENTER_TABLE_SPLIT:T3-2',
  ];
  const TARGET_BLOCKS = ['T3-2', 'V1', 'V2', 'V3'];
  const REQUIRED_APPROVAL_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ];
  const VIEWPORT_MARGIN = 96;
  const MIN_VIEWPORT_WIDTH = 320;
  const MIN_VIEWPORT_HEIGHT = 250;

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

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const list = (value) => (Array.isArray(value) ? value : []);

  const round = (value, digits = 2) => {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
  };

  const parsePoint = (value) => {
    if (Array.isArray(value) && value.length >= 2) {
      const x = Number(value[0]);
      const y = Number(value[1]);
      return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
    }
    const numbers = String(value ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    if (numbers.length < 2 || !Number.isFinite(numbers[0]) || !Number.isFinite(numbers[1])) return null;
    return [numbers[0], numbers[1]];
  };

  const pathBoundsOrNull = (pathData) => {
    const text = String(pathData ?? '').trim();
    if (!text) return null;
    try {
      const points = pathToPoints(text);
      if (points.length < 3) return null;
      const bounds = pathBounds(text);
      if (![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(Number.isFinite)) return null;
      return bounds;
    } catch {
      return null;
    }
  };

  const pointBounds = (point) => {
    if (!point) return null;
    return { minX: point[0], minY: point[1], maxX: point[0], maxY: point[1] };
  };

  const bboxBounds = (bbox) => {
    if (!Array.isArray(bbox) || bbox.length < 4) return null;
    const values = bbox.slice(0, 4).map(Number);
    if (!values.every(Number.isFinite)) return null;
    return {
      minX: Math.min(values[0], values[2]),
      minY: Math.min(values[1], values[3]),
      maxX: Math.max(values[0], values[2]),
      maxY: Math.max(values[1], values[3]),
    };
  };

  const unionBounds = (boundsList) => {
    const validBounds = boundsList.filter(Boolean);
    if (validBounds.length === 0) {
      return { minX: 0, minY: 0, maxX: IMAGE_WIDTH, maxY: IMAGE_HEIGHT };
    }
    return {
      minX: Math.min(...validBounds.map((bounds) => bounds.minX)),
      minY: Math.min(...validBounds.map((bounds) => bounds.minY)),
      maxX: Math.max(...validBounds.map((bounds) => bounds.maxX)),
      maxY: Math.max(...validBounds.map((bounds) => bounds.maxY)),
    };
  };

  const expandedViewport = (bounds, margin = VIEWPORT_MARGIN) => {
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const width = Math.min(IMAGE_WIDTH, Math.max(MIN_VIEWPORT_WIDTH, (bounds.maxX - bounds.minX) + (margin * 2)));
    const height = Math.min(IMAGE_HEIGHT, Math.max(MIN_VIEWPORT_HEIGHT, (bounds.maxY - bounds.minY) + (margin * 2)));
    const minX = Math.max(0, Math.min(IMAGE_WIDTH - width, centerX - (width / 2)));
    const minY = Math.max(0, Math.min(IMAGE_HEIGHT - height, centerY - (height / 2)));
    return {
      minX: round(minX),
      minY: round(minY),
      width: round(width),
      height: round(height),
      viewBox: `${round(minX)} ${round(minY)} ${round(width)} ${round(height)}`,
    };
  };

  const pointCount = (pathData) => pathToPoints(String(pathData ?? '')).length;

  const areaOrNull = (pathData) => {
    const points = pathToPoints(String(pathData ?? ''));
    return points.length >= 3 ? round(polygonArea(points), 2) : null;
  };

  const safeId = (value) => String(value ?? '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  const markerPoint = (row) => row.draftLabelPoint
    ?? row.currentLabelPoint
    ?? parsePoint([
      (row.viewport.minX + (row.viewport.width / 2)),
      (row.viewport.minY + (row.viewport.height / 2)),
    ]);

  const gridLines = (viewport) => {
    const parts = [];
    const startX = Math.ceil(viewport.minX / 50) * 50;
    const endX = viewport.minX + viewport.width;
    const startY = Math.ceil(viewport.minY / 50) * 50;
    const endY = viewport.minY + viewport.height;
    for (let x = startX; x <= endX; x += 50) {
      parts.push(`<line x1="${x}" y1="${viewport.minY}" x2="${x}" y2="${endY}" stroke="#94a3b8" stroke-opacity="0.35" stroke-width="0.7" vector-effect="non-scaling-stroke"/>`);
      parts.push(`<text x="${x + 2}" y="${viewport.minY + 12}" font-family="Arial, sans-serif" font-size="8" fill="#475569">${x}</text>`);
    }
    for (let y = startY; y <= endY; y += 50) {
      parts.push(`<line x1="${viewport.minX}" y1="${y}" x2="${endX}" y2="${y}" stroke="#94a3b8" stroke-opacity="0.35" stroke-width="0.7" vector-effect="non-scaling-stroke"/>`);
      parts.push(`<text x="${viewport.minX + 4}" y="${y - 3}" font-family="Arial, sans-serif" font-size="8" fill="#475569">${y}</text>`);
    }
    return parts.join('\n');
  };

  const rowSvg = (row, viewport, title) => {
    const height = Math.max(520, Math.round((viewport.height / viewport.width) * 1120));
    const currentLabel = row.currentLabelPoint;
    const draftLabel = row.draftLabelPoint;
    const marker = markerPoint({ ...row, viewport });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${height}" viewBox="${viewport.viewBox}">
    <image href="${xmlEscape(IMAGE_HREF)}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" opacity="0.84"/>
    ${gridLines(viewport)}
    ${row.currentPath ? `<path d="${xmlEscape(row.currentPath)}" fill="#f97316" fill-opacity="0.2" stroke="#dc2626" stroke-width="2.7" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} current legacy path`)}</title></path>` : ''}
    ${row.draftPath ? `<path d="${xmlEscape(row.draftPath)}" fill="#0ea5e9" fill-opacity="0.17" stroke="#0284c7" stroke-width="2.2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} draft evidence only`)}</title></path>` : ''}
    ${currentLabel ? `<circle cx="${currentLabel[0]}" cy="${currentLabel[1]}" r="5" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" vector-effect="non-scaling-stroke"/>` : ''}
    ${draftLabel ? `<circle cx="${draftLabel[0]}" cy="${draftLabel[1]}" r="4.5" fill="#0284c7" stroke="#ffffff" stroke-width="1.5" vector-effect="non-scaling-stroke"/>` : ''}
    ${marker ? `<text x="${marker[0] + 8}" y="${marker[1] - 8}" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="4" paint-order="stroke">${xmlEscape(row.block)} / row ${row.rowNumber}</text>` : ''}
    <g transform="translate(${viewport.minX + 10} ${viewport.minY + 18})">
      <rect x="0" y="-14" width="360" height="84" rx="4" fill="#ffffff" fill-opacity="0.94" stroke="#cbd5e1" vector-effect="non-scaling-stroke"/>
      <text x="10" y="0" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="#0f172a">${xmlEscape(title)}</text>
      <text x="10" y="18" font-family="Arial, sans-serif" font-size="9.5" fill="#334155">red=current legacy, blue=draft evidence only; trace correctedPath from PNG.</text>
      <text x="10" y="34" font-family="Arial, sans-serif" font-size="9.5" fill="#334155">required: operatorDecision=APPROVED, correctedPath, label X/Y, reviewer, reviewedAt</text>
      <text x="10" y="50" font-family="Arial, sans-serif" font-size="9.5" fill="#334155">T3-2 duplicate rows must keep identical correctedPath and label.</text>
    </g>
  </svg>
  `;
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const rowSvgDir = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-coordinate-entry-pack');
  const targetReviewPacketPath = path.resolve(
    frontendRoot,
    argValue('--target-review-packet', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.json')),
  );
  const targetEntryTemplatePath = path.resolve(
    frontendRoot,
    argValue('--target-entry-template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.json')),
  );
  const targetEntryGatePath = path.resolve(
    frontendRoot,
    argValue('--target-entry-gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate.json')),
  );
  const operatorHandoffPath = path.resolve(
    frontendRoot,
    argValue('--operator-handoff', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-operator-handoff.json')),
  );

  const reports = {
    targetReviewPacket: await readJsonReport(targetReviewPacketPath),
    targetEntryTemplate: await readJsonReport(targetEntryTemplatePath),
    targetEntryGate: await readJsonReport(targetEntryGatePath),
    operatorHandoff: await readJsonReport(operatorHandoffPath),
  };

  const blockers = [];
  const warnings = [];
  Object.entries(reports).forEach(([name, report]) => {
    if (!report.exists) blockers.push(`MISSING_REPORT:${name}:${report.relativePath}`);
  });

  if (reports.targetReviewPacket.exists
    && reports.targetReviewPacket.data?.summary?.packetVersion !== TARGET_REVIEW_PACKET_VERSION) {
    blockers.push(`TARGET_REVIEW_PACKET_VERSION_MISMATCH:${reports.targetReviewPacket.data?.summary?.packetVersion ?? ''}`);
  }
  if (reports.targetEntryTemplate.exists
    && reports.targetEntryTemplate.data?.targetEntryTemplateVersion !== TARGET_ENTRY_TEMPLATE_VERSION) {
    blockers.push(`TARGET_ENTRY_TEMPLATE_VERSION_MISMATCH:${reports.targetEntryTemplate.data?.targetEntryTemplateVersion ?? ''}`);
  }
  if (reports.targetEntryGate.exists
    && reports.targetEntryGate.data?.summary?.gateVersion !== TARGET_ENTRY_GATE_VERSION) {
    blockers.push(`TARGET_ENTRY_GATE_VERSION_MISMATCH:${reports.targetEntryGate.data?.summary?.gateVersion ?? ''}`);
  }
  if (reports.operatorHandoff.exists
    && reports.operatorHandoff.data?.summary?.handoffVersion !== HANDOFF_VERSION) {
    blockers.push(`OPERATOR_HANDOFF_VERSION_MISMATCH:${reports.operatorHandoff.data?.summary?.handoffVersion ?? ''}`);
  }
  if (reports.targetReviewPacket.data?.summary?.officialImageSha256 !== EXPECTED_SHA256) {
    blockers.push(`OFFICIAL_IMAGE_SHA256_MISMATCH:${reports.targetReviewPacket.data?.summary?.officialImageSha256 ?? ''}`);
  }

  [
    reports.targetReviewPacket.data?.summary,
    reports.targetEntryGate.data?.summary,
    reports.operatorHandoff.data?.summary,
  ].filter(Boolean).forEach((summary) => {
    if (summary.productionWriteAllowed !== false) blockers.push(`PRODUCTION_WRITE_ALLOWED_NOT_FALSE:${summary.status ?? ''}`);
    if (summary.writesOperatorInput === true) blockers.push(`WRITES_OPERATOR_INPUT_TRUE:${summary.status ?? ''}`);
    if (summary.writesCorrectionsTemplate === true) blockers.push(`WRITES_CORRECTIONS_TEMPLATE_TRUE:${summary.status ?? ''}`);
    if (summary.writesProductionData !== false) blockers.push(`WRITES_PRODUCTION_DATA_NOT_FALSE:${summary.status ?? ''}`);
  });

  const targetRows = list(reports.targetReviewPacket.data?.targetRows);
  const templateRows = list(reports.targetEntryTemplate.data?.rows);
  const gateRows = list(reports.targetEntryGate.data?.rows);
  const targetRowsById = new Map(targetRows.map((row) => [row.templateRowId, row]));
  const templateRowsById = new Map(templateRows.map((row) => [row.templateRowId, row]));
  const gateRowsById = new Map(gateRows.map((row) => [row.templateRowId, row]));

  const actualTemplateRowIds = templateRows.map((row) => row.templateRowId);
  if (actualTemplateRowIds.join(' ') !== TARGET_TEMPLATE_ROWS.join(' ')) {
    blockers.push(`TARGET_ENTRY_TEMPLATE_ROW_ORDER_MISMATCH:${actualTemplateRowIds.join(' ')}`);
  }
  if (targetRows.length !== TARGET_TEMPLATE_ROWS.length) {
    blockers.push(`TARGET_REVIEW_ROW_COUNT_MISMATCH:${targetRows.length}:${TARGET_TEMPLATE_ROWS.length}`);
  }

  const rows = TARGET_TEMPLATE_ROWS.map((templateRowId, index) => {
    const targetRow = targetRowsById.get(templateRowId) ?? {};
    const templateRow = templateRowsById.get(templateRowId) ?? {};
    const gateRow = gateRowsById.get(templateRowId) ?? {};
    const currentLabelPoint = parsePoint(targetRow.currentLabelPoint);
    const draftLabelPoint = parsePoint(targetRow.draftLabelPoint);
    const bounds = unionBounds([
      pathBoundsOrNull(targetRow.currentPath),
      pathBoundsOrNull(targetRow.draftPath),
      pointBounds(currentLabelPoint),
      pointBounds(draftLabelPoint),
      bboxBounds(targetRow.componentBbox),
    ]);
    const viewport = expandedViewport(bounds);
    return {
      rowNumber: index + 1,
      templateRowId,
      editableTarget: templateRow.editableTarget ?? targetRow.editableTarget ?? '',
      groupId: templateRow.groupId ?? targetRow.groupId ?? '',
      block: templateRow.block ?? targetRow.block ?? '',
      sharedBlock: Boolean(templateRow.sharedBlock ?? targetRow.sharedBlock),
      duplicateTargetBlock: Boolean(templateRow.duplicateTargetBlock ?? targetRow.duplicateTargetBlock),
      operatorDecision: templateRow.operatorDecision ?? 'PENDING',
      gateStatus: gateRow.approved
        ? gateRow.mergeCandidate ? 'approved-for-template-import-dry-run' : 'approved-but-blocked'
        : 'waiting-for-operator',
      currentPath: targetRow.currentPath ?? '',
      currentPathPointCount: pointCount(targetRow.currentPath),
      currentPathArea: areaOrNull(targetRow.currentPath),
      draftPath: targetRow.draftPath ?? '',
      draftPathPointCount: pointCount(targetRow.draftPath),
      draftPathArea: areaOrNull(targetRow.draftPath),
      currentLabelPoint,
      draftLabelPoint,
      targetColorCoverage: targetRow.targetColorCoverage ?? null,
      riskFlags: targetRow.riskFlags ?? '',
      evidenceCrop: targetRow.evidenceCrop ?? '',
      tracingSvg: targetRow.tracingSvg ?? '',
      correctionOverlay: targetRow.correctionOverlay ?? '',
      requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
      inputFieldsToFill: [
        'operatorDecision',
        'correctedPath',
        'correctedLabelX',
        'correctedLabelY',
        'reviewer',
        'reviewedAt',
        'operatorNote',
      ],
      nextOperatorAction: targetRow.nextOperatorAction
        ?? 'Trace correctedPath from the official PNG, then fill target-entry-template and rerun target-entry-gate.',
      rowWarnings: [
        'DRAFT_PATH_IS_EVIDENCE_ONLY',
        ...(templateRow.block === 'T3-2' ? ['T3V_DUPLICATE_TARGET_KEEP_IDENTICAL'] : []),
        ...(targetRow.sharedBlock ? ['SHARED_BLOCK_REQUIRES_GROUP_CONSISTENCY'] : []),
      ],
      viewport,
    };
  });

  if (rows.filter((row) => row.block === 'T3-2').length !== 2) blockers.push('T3V_DUPLICATE_TARGET_ROWS_MISSING:T3-2');
  if (rows.some((row) => row.gateStatus === 'waiting-for-operator')) {
    warnings.push(`T3V_COORDINATE_ENTRY_REQUIRED:${rows.filter((row) => row.gateStatus === 'waiting-for-operator').length}:${rows.length}`);
  }

  const combinedViewport = expandedViewport(unionBounds(rows.flatMap((row) => [
    pathBoundsOrNull(row.currentPath),
    pathBoundsOrNull(row.draftPath),
    pointBounds(row.currentLabelPoint),
    pointBounds(row.draftLabelPoint),
    bboxBounds(targetRowsById.get(row.templateRowId)?.componentBbox),
  ])), 120);
  const rowSvgPaths = [];
  await fs.mkdir(rowSvgDir, { recursive: true });
  for (const row of rows) {
    const filePath = path.join(rowSvgDir, `${String(row.rowNumber).padStart(2, '0')}-${safeId(row.templateRowId)}.svg`);
    await fs.writeFile(
      `${filePath}.tmp`,
      rowSvg(row, row.viewport, `Daegu T3/V coordinate entry row ${row.rowNumber}: ${row.templateRowId}`),
      'utf8',
    );
    await fs.rename(`${filePath}.tmp`, filePath);
    rowSvgPaths.push(path.relative(frontendRoot, filePath));
  }

  const combinedPaths = rows.map((row) => {
    const marker = markerPoint({ ...row, viewport: combinedViewport });
    return [
      row.currentPath ? `<path d="${xmlEscape(row.currentPath)}" fill="#f97316" fill-opacity="0.15" stroke="#dc2626" stroke-width="2.4" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.rowNumber}. ${row.block} current`)}</title></path>` : '',
      row.draftPath ? `<path d="${xmlEscape(row.draftPath)}" fill="#0ea5e9" fill-opacity="0.11" stroke="#0284c7" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.rowNumber}. ${row.block} draft evidence`)}</title></path>` : '',
      marker ? `<circle cx="${marker[0]}" cy="${marker[1]}" r="9" fill="#111827" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke"/>` : '',
      marker ? `<text x="${marker[0] - 3}" y="${marker[1] + 4}" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="#ffffff">${row.rowNumber}</text>` : '',
      marker ? `<text x="${marker[0] + 13}" y="${marker[1] - 8}" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="4" paint-order="stroke">${xmlEscape(`${row.block}`)}</text>` : '',
    ].join('\n');
  }).join('\n');

  const combinedSvgPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-coordinate-entry-pack.svg');
  const combinedHeight = Math.max(560, Math.round((combinedViewport.height / combinedViewport.width) * 1160));
  await fs.writeFile(`${combinedSvgPath}.tmp`, `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="${combinedHeight}" viewBox="${combinedViewport.viewBox}">
    <image href="${xmlEscape(IMAGE_HREF)}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" opacity="0.84"/>
    ${gridLines(combinedViewport)}
    ${combinedPaths}
    <g transform="translate(${combinedViewport.minX + 10} ${combinedViewport.minY + 18})">
      <rect x="0" y="-14" width="405" height="86" rx="4" fill="#ffffff" fill-opacity="0.94" stroke="#cbd5e1" vector-effect="non-scaling-stroke"/>
      <text x="10" y="0" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f172a">Daegu T3/V coordinate entry pack</text>
      <text x="10" y="18" font-family="Arial, sans-serif" font-size="10" fill="#334155">rows 1-5 must be traced from official PNG coordinates: 0 0 1707 2048</text>
      <text x="10" y="35" font-family="Arial, sans-serif" font-size="10" fill="#334155">red=current legacy, blue=draft evidence only; do not copy context-only rows</text>
      <text x="10" y="52" font-family="Arial, sans-serif" font-size="10" fill="#334155">T3-2 duplicate rows must be identical before any source-copy step.</text>
    </g>
  </svg>
  `, 'utf8');
  await fs.rename(`${combinedSvgPath}.tmp`, combinedSvgPath);

  const rowsWithSvg = rows.map((row, index) => ({
    ...row,
    rowSvg: rowSvgPaths[index],
  }));

  const summary = {
    packVersion: PACK_VERSION,
    status: blockers.length > 0 ? 'blocked' : 'ready-for-coordinate-entry',
    targetBlocks: TARGET_BLOCKS,
    targetTemplateRows: rows.length,
    duplicateTargetRows: rows.filter((row) => row.block === 'T3-2').length,
    coordinateSystem: 'SVG viewBox 0 0 1707 2048',
    officialImageSha256: reports.targetReviewPacket.data?.summary?.officialImageSha256 ?? '',
    targetEntryGateStatus: reports.targetEntryGate.data?.summary?.status ?? '',
    operatorHandoffStatus: reports.operatorHandoff.data?.summary?.status ?? '',
    combinedSvg: path.relative(frontendRoot, combinedSvgPath),
    rowSvgDirectory: path.relative(frontendRoot, rowSvgDir),
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    nextCommand: 'Fill target entry template rows, then run npm run stadium:daegu:p1-paired-ownership-t3-v-target-entry-gate.',
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      targetReviewPacket: path.relative(frontendRoot, targetReviewPacketPath),
      targetEntryTemplate: path.relative(frontendRoot, targetEntryTemplatePath),
      targetEntryGate: path.relative(frontendRoot, targetEntryGatePath),
      operatorHandoff: path.relative(frontendRoot, operatorHandoffPath),
    },
    sourcePolicy: {
      allowedCoordinateSource: 'official Daegu Samsung Lions Park PNG 1707x2048 plus operator-provided corrected coordinates only',
      disallowedSources: [
        'automatic draft promotion',
        'browser CSS pixels',
        'resized screenshots',
        'external baseball crawling',
        'web-search-based baseball data',
        'context-only row copy',
      ],
    },
    safetyContract: [
      'This coordinate entry pack is read-only.',
      'It never writes operator input.',
      'It never writes corrections template source.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'Draft paths are evidence only and must not be promoted without operatorDecision=APPROVED.',
      'T3-2 duplicate target rows must keep correctedPath and correctedLabelX/Y identical.',
      'Context-only rows must not be copied into target rows.',
    ],
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    rows: rowsWithSvg,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-coordinate-entry-pack.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-coordinate-entry-pack.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-coordinate-entry-pack.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'rowNumber',
      'templateRowId',
      'editableTarget',
      'groupId',
      'block',
      'duplicateTargetBlock',
      'sharedBlock',
      'gateStatus',
      'currentPathPointCount',
      'draftPathPointCount',
      'targetColorCoverage',
      'rowSvg',
      'evidenceCrop',
      'requiredApprovalFields',
      'nextOperatorAction',
    ],
    ...rowsWithSvg.map((row) => [
      row.rowNumber,
      row.templateRowId,
      row.editableTarget,
      row.groupId,
      row.block,
      row.duplicateTargetBlock,
      row.sharedBlock,
      row.gateStatus,
      row.currentPathPointCount,
      row.draftPathPointCount,
      row.targetColorCoverage ?? '',
      row.rowSvg,
      row.evidenceCrop,
      row.requiredApprovalFields.join('|'),
      row.nextOperatorAction,
    ]),
  ]);

  await fs.writeFile(`${markdownPath}.tmp`, [
    '# Daegu P1 Paired Ownership T3/V Coordinate Entry Pack',
    '',
    `- pack version: \`${summary.packVersion}\``,
    `- status: \`${summary.status}\``,
    `- target blocks: ${summary.targetBlocks.map((block) => `\`${block}\``).join(', ')}`,
    `- target template rows: ${summary.targetTemplateRows}`,
    `- duplicate target rows: ${summary.duplicateTargetRows}`,
    `- coordinate system: \`${summary.coordinateSystem}\``,
    `- official image sha256: \`${summary.officialImageSha256}\``,
    `- target-entry-gate status: \`${summary.targetEntryGateStatus}\``,
    `- operator-handoff status: \`${summary.operatorHandoffStatus}\``,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Operator Instructions',
    '',
    '1. Open the combined SVG and the per-row SVG for the target row.',
    '2. Trace `correctedPath` from the official PNG coordinate system `0 0 1707 2048`.',
    '3. Fill `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt` in the target entry template.',
    '4. Keep the two `T3-2` target rows identical for `correctedPath` and corrected label coordinates.',
    '5. Rerun `npm run stadium:daegu:p1-paired-ownership-t3-v-target-entry-gate`.',
    '',
    '## Visual References',
    '',
    `- combined SVG: \`${summary.combinedSvg}\``,
    `- per-row SVG directory: \`${summary.rowSvgDirectory}\``,
    '- red polygon: current legacy path',
    '- blue polygon: draft evidence only',
    '- grid labels: official image coordinate ticks',
    '',
    '## Target Rows',
    '',
    markdownTable(
      ['row', 'template row', 'block', 'gate', 'duplicate', 'coverage', 'row SVG', 'required fields', 'warnings'],
      rowsWithSvg.map((row) => [
        row.rowNumber,
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        `\`${row.gateStatus}\``,
        String(row.duplicateTargetBlock),
        row.targetColorCoverage ?? '-',
        `\`${row.rowSvg}\``,
        row.requiredApprovalFields.map((field) => `\`${field}\``).join('<br>'),
        row.rowWarnings.map((warning) => `\`${warning}\``).join('<br>'),
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Outputs',
    '',
    `- \`${path.relative(frontendRoot, jsonPath)}\``,
    `- \`${path.relative(frontendRoot, csvPath)}\``,
    `- \`${path.relative(frontendRoot, markdownPath)}\``,
    `- \`${path.relative(frontendRoot, combinedSvgPath)}\``,
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
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    targetRows: summary.targetTemplateRows,
    duplicateTargetRows: summary.duplicateTargetRows,
    combinedSvg: summary.combinedSvg,
    rowSvgDirectory: summary.rowSvgDirectory,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VEvidenceQualityAudit = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const AUDIT_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_EVIDENCE_QUALITY_AUDIT_V1';
  const ENTRY_BRIEF_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_OPERATOR_ENTRY_BRIEF_V1';
  const IMAGE_DRAFT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_IMAGE_COORDINATE_DRAFT_V1';
  const EXPECTED_SHA256 = '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0';
  const EXPECTED_TARGET_BLOCKS = ['T3-2', 'V1', 'V2', 'V3'];
  const EXPECTED_DUPLICATE_TARGET_BLOCKS = ['T3-2'];

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

  const polygonBounds = (points) => {
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    return {
      minX: Math.floor(Math.min(...xs)),
      minY: Math.floor(Math.min(...ys)),
      maxX: Math.ceil(Math.max(...xs)),
      maxY: Math.ceil(Math.max(...ys)),
    };
  };

  const matchesColorClass = (colorClass, r, g, b, a) => {
    if (a === 0) return false;
    if (colorClass === 'maroon') {
      return r >= 45 && g <= 95 && b <= 110 && r >= g * 1.4 && r >= b * 0.7;
    }
    if (colorClass === 'olive') {
      return r >= 130 && g >= 130 && b <= 165 && Math.abs(r - g) <= 45 && r > b * 1.15 && g > b * 1.15;
    }
    return false;
  };

  const sampleDraftColorCoverage = (image, points, colorClass) => {
    if (points.length < 3) {
      return {
        polygonPixels: 0,
        targetColorPixels: 0,
        targetColorCoverage: 0,
      };
    }

    const bounds = polygonBounds(points);
    const clampedBounds = {
      minX: Math.max(0, bounds.minX),
      minY: Math.max(0, bounds.minY),
      maxX: Math.min(image.width - 1, bounds.maxX),
      maxY: Math.min(image.height - 1, bounds.maxY),
    };
    let polygonPixels = 0;
    let targetColorPixels = 0;

    for (let y = clampedBounds.minY; y <= clampedBounds.maxY; y += 1) {
      for (let x = clampedBounds.minX; x <= clampedBounds.maxX; x += 1) {
        if (!pointInPolygon([x + 0.5, y + 0.5], points)) continue;
        polygonPixels += 1;
        const offset = (y * image.width + x) * image.channels;
        if (matchesColorClass(
          colorClass,
          image.data[offset],
          image.data[offset + 1],
          image.data[offset + 2],
          image.channels > 3 ? image.data[offset + 3] : 255,
        )) {
          targetColorPixels += 1;
        }
      }
    }

    return {
      polygonPixels,
      targetColorPixels,
      targetColorCoverage: polygonPixels > 0 ? Number((targetColorPixels / polygonPixels).toFixed(4)) : 0,
    };
  };

  const sorted = (values) => [...values].sort((a, b) => a.localeCompare(b, 'ko'));

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const entryBriefPath = path.resolve(
    frontendRoot,
    argValue('--entry-brief', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-operator-entry-brief.json')),
  );
  const imageDraftPath = path.resolve(
    frontendRoot,
    argValue(
      '--image-draft',
      path.join(
        p1ReportDir,
        'daegu-seatmap-p1-boundary-first-image-coordinate-draft/daegu-p1-boundary-first-image-coordinate-draft.json',
      ),
    ),
  );

  const entryBrief = await readJson(entryBriefPath);
  const imageDraft = await readJson(imageDraftPath);
  const imagePath = path.resolve(frontendRoot, imageDraft.sourceImage ?? '');
  const imageSha256 = await sha256File(imagePath);
  const rawImage = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  const image = {
    data: rawImage.data,
    width: rawImage.info.width,
    height: rawImage.info.height,
    channels: rawImage.info.channels,
  };
  const blockers = [];
  const warnings = [];

  if (entryBrief.summary?.briefVersion !== ENTRY_BRIEF_VERSION) {
    blockers.push(`ENTRY_BRIEF_VERSION_MISMATCH:${entryBrief.summary?.briefVersion ?? ''}`);
  }
  if (imageDraft.draftVersion !== IMAGE_DRAFT_VERSION) {
    blockers.push(`IMAGE_DRAFT_VERSION_MISMATCH:${imageDraft.draftVersion ?? ''}`);
  }
  if (entryBrief.summary?.productionWriteAllowed !== false) blockers.push('ENTRY_BRIEF_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (entryBrief.summary?.sourceOfTruth !== false) blockers.push('ENTRY_BRIEF_SOURCE_OF_TRUTH_NOT_FALSE');
  if (imageDraft.productionWriteAllowed !== false) blockers.push('IMAGE_DRAFT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (imageDraft.sourceOfTruth !== false) blockers.push('IMAGE_DRAFT_SOURCE_OF_TRUTH_NOT_FALSE');
  if (imageSha256 !== EXPECTED_SHA256) blockers.push(`OFFICIAL_IMAGE_SHA256_MISMATCH:${imageSha256}`);
  if (imageDraft.sha256MatchesExpected !== true) blockers.push('IMAGE_DRAFT_SHA256_MATCH_FLAG_NOT_TRUE');

  const targetRows = (entryBrief.rows ?? []).filter((row) => EXPECTED_TARGET_BLOCKS.includes(row.block));
  const uniqueTargetBlocks = sorted([...new Set(targetRows.map((row) => row.block))]);
  const duplicateTargetBlocks = sorted(uniqueTargetBlocks.filter((block) => (
    targetRows.filter((row) => row.block === block).length > 1
  )));
  const draftRowsByBlock = new Map((imageDraft.rows ?? []).map((row) => [row.block, row]));

  if (uniqueTargetBlocks.join(' ') !== sorted(EXPECTED_TARGET_BLOCKS).join(' ')) {
    blockers.push(`T3V_TARGET_BLOCKS_MISMATCH:${uniqueTargetBlocks.join(' ')}`);
  }
  if (duplicateTargetBlocks.join(' ') !== EXPECTED_DUPLICATE_TARGET_BLOCKS.join(' ')) {
    blockers.push(`T3V_DUPLICATE_TARGET_BLOCKS_MISMATCH:${duplicateTargetBlocks.join(' ')}`);
  }

  const rows = await Promise.all(targetRows.map(async (entryRow) => {
    const draftRow = draftRowsByBlock.get(entryRow.block);
    const evidenceCrop = entryRow.evidenceCrop ?? '';
    const draftOverlayPath = entryRow.draftOverlayPath ?? draftRow?.overlayPath ?? '';
    const evidenceCropExists = evidenceCrop ? await fileExists(path.resolve(frontendRoot, evidenceCrop)) : false;
    const draftOverlayExists = draftOverlayPath ? await fileExists(path.resolve(frontendRoot, draftOverlayPath)) : false;
    const points = parsePathPoints(draftRow?.correctedPathDraft);
    const coverage = sampleDraftColorCoverage(image, points, draftRow?.colorClass ?? '');
    const rowBlockers = [];
    const rowWarnings = [];
    const riskFlags = String(entryRow.riskFlags ?? '').split(';').map((flag) => flag.trim()).filter(Boolean);
    const draftRiskFlags = draftRow?.riskFlags ?? [];

    if (!draftRow) rowBlockers.push('T3V_IMAGE_DRAFT_ROW_MISSING');
    if (!evidenceCrop) rowBlockers.push('T3V_EVIDENCE_CROP_MISSING');
    if (evidenceCrop && !evidenceCropExists) rowBlockers.push('T3V_EVIDENCE_CROP_FILE_MISSING');
    if (!draftOverlayPath) rowBlockers.push('T3V_DRAFT_OVERLAY_MISSING');
    if (draftOverlayPath && !draftOverlayExists) rowBlockers.push('T3V_DRAFT_OVERLAY_FILE_MISSING');
    if ((draftRow?.pointCount ?? 0) < 3) rowBlockers.push('T3V_DRAFT_PATH_TOO_FEW_POINTS');
    if (draftRow?.labelInsideDraft !== true) rowBlockers.push('T3V_DRAFT_LABEL_OUTSIDE_PATH');
    if (draftRow?.selfIntersection !== false) rowBlockers.push('T3V_DRAFT_SELF_INTERSECTION');
    if (draftRow?.boundsInsideImage !== true) rowBlockers.push('T3V_DRAFT_OUT_OF_BOUNDS');
    if (!riskFlags.includes('OPERATOR_REQUIRED')) rowWarnings.push('T3V_ENTRY_ROW_MISSING_OPERATOR_REQUIRED_FLAG');
    if (!riskFlags.includes('NEEDS_MANUAL_TRACE')) rowWarnings.push('T3V_ENTRY_ROW_MISSING_NEEDS_MANUAL_TRACE_FLAG');
    if (!draftRiskFlags.includes('DRAFT_ONLY')) rowBlockers.push('T3V_DRAFT_ROW_MISSING_DRAFT_ONLY_FLAG');
    if (!draftRiskFlags.includes('OPERATOR_APPROVAL_REQUIRED')) rowBlockers.push('T3V_DRAFT_ROW_MISSING_OPERATOR_APPROVAL_REQUIRED_FLAG');
    if (coverage.polygonPixels === 0) rowBlockers.push('T3V_DRAFT_POLYGON_HAS_NO_PIXELS');
    if (coverage.targetColorPixels === 0) rowBlockers.push('T3V_DRAFT_POLYGON_HAS_NO_TARGET_COLOR_PIXELS');
    if (coverage.targetColorCoverage > 0 && coverage.targetColorCoverage < 0.35) {
      rowWarnings.push('T3V_LOW_DRAFT_TARGET_COLOR_COVERAGE_OPERATOR_CONFIRM');
    }
    if (String(entryRow.operatorDecision ?? '') === 'APPROVED') {
      rowWarnings.push('T3V_APPROVED_ROW_STILL_REQUIRES_TEMPLATE_GATE_AND_SOURCE_COPY_DRY_RUN');
    }

    return {
      templateRowId: entryRow.templateRowId,
      groupId: entryRow.groupId,
      block: entryRow.block,
      duplicatedTargetBlock: duplicateTargetBlocks.includes(entryRow.block),
      evidenceCrop,
      evidenceCropExists,
      draftOverlayPath,
      draftOverlayExists,
      draftPath: draftRow?.correctedPathDraft ?? '',
      draftPointCount: draftRow?.pointCount ?? 0,
      draftLabel: draftRow ? [draftRow.correctedLabelX, draftRow.correctedLabelY] : [],
      draftColorClass: draftRow?.colorClass ?? '',
      componentBbox: draftRow?.componentBbox ?? [],
      componentAreaPx: draftRow?.componentAreaPx ?? 0,
      labelInsideDraft: draftRow?.labelInsideDraft === true,
      selfIntersection: draftRow?.selfIntersection === true,
      boundsInsideImage: draftRow?.boundsInsideImage === true,
      polygonPixels: coverage.polygonPixels,
      targetColorPixels: coverage.targetColorPixels,
      targetColorCoverage: coverage.targetColorCoverage,
      imageBasedAnalysis: true,
      rowBlockers,
      rowWarnings,
      nextAction: 'Use this image-based draft only as evidence; operator must trace or confirm correctedPath/correctedLabelX/Y before approval.',
    };
  }));

  rows.forEach((row) => {
    row.rowBlockers.forEach((blocker) => blockers.push(`${blocker}:${row.templateRowId}`));
    row.rowWarnings.forEach((warning) => warnings.push(`${warning}:${row.templateRowId}`));
  });

  const status = blockers.length > 0
    ? 'blocked'
    : warnings.length > 0
      ? 'operator-review-ready-with-warnings'
      : 'operator-review-ready';

  const summary = {
    auditVersion: AUDIT_VERSION,
    status,
    entryBriefStatus: entryBrief.summary?.status ?? '',
    officialImage: path.relative(frontendRoot, imagePath),
    officialImageSha256: imageSha256,
    expectedSha256: EXPECTED_SHA256,
    imageSha256MatchesExpected: imageSha256 === EXPECTED_SHA256,
    imageBasedAnalysis: true,
    targetRows: rows.length,
    uniqueTargetBlocks,
    duplicateTargetBlocks,
    minTargetColorCoverage: rows.length > 0 ? Math.min(...rows.map((row) => row.targetColorCoverage)) : 0,
    maxTargetColorCoverage: rows.length > 0 ? Math.max(...rows.map((row) => row.targetColorCoverage)) : 0,
    productionWriteAllowed: false,
    sourceOfTruth: false,
    writesSourceInput: false,
    writesOperatorDecision: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      entryBrief: path.relative(frontendRoot, entryBriefPath),
      imageDraft: path.relative(frontendRoot, imageDraftPath),
    },
    safetyContract: [
      'This T3/V evidence quality audit is read-only.',
      'It samples pixels from the official Daegu PNG only.',
      'No external baseball data or web search is used.',
      'It never writes source input.',
      'It never writes operatorDecision or corrected fields.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'Draft paths remain evidence only and must not be copied into correctedPath without operator tracing/review.',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-evidence-quality-audit.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-evidence-quality-audit.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-evidence-quality-audit.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'block',
      'groupId',
      'duplicatedTargetBlock',
      'evidenceCropExists',
      'draftOverlayExists',
      'draftColorClass',
      'draftPointCount',
      'labelInsideDraft',
      'boundsInsideImage',
      'polygonPixels',
      'targetColorPixels',
      'targetColorCoverage',
      'rowBlockers',
      'rowWarnings',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.block,
      row.groupId,
      row.duplicatedTargetBlock,
      row.evidenceCropExists,
      row.draftOverlayExists,
      row.draftColorClass,
      row.draftPointCount,
      row.labelInsideDraft,
      row.boundsInsideImage,
      row.polygonPixels,
      row.targetColorPixels,
      row.targetColorCoverage,
      row.rowBlockers.join(' '),
      row.rowWarnings.join(' '),
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T3/V Evidence Quality Audit',
    '',
    `- audit version: \`${AUDIT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- entry brief status: \`${summary.entryBriefStatus || 'none'}\``,
    `- official image sha256: \`${summary.officialImageSha256}\``,
    `- image based analysis: ${summary.imageBasedAnalysis}`,
    `- target rows: ${summary.targetRows}`,
    `- unique target blocks: ${summary.uniqueTargetBlocks.map((block) => `\`${block}\``).join(', ')}`,
    `- duplicate target blocks: ${summary.duplicateTargetBlocks.map((block) => `\`${block}\``).join(', ') || '-'}`,
    `- min target color coverage: ${summary.minTargetColorCoverage}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Target Rows',
    '',
    markdownTable(
      [
        'template row',
        'block',
        'group',
        'crop',
        'overlay',
        'color',
        'path pts',
        'target color px',
        'coverage',
        'blockers',
        'warnings',
      ],
      rows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        `\`${row.groupId}\``,
        row.evidenceCropExists ? 'yes' : 'no',
        row.draftOverlayExists ? 'yes' : 'no',
        row.draftColorClass || '-',
        row.draftPointCount,
        row.targetColorPixels,
        row.targetColorCoverage,
        row.rowBlockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
        row.rowWarnings.map((warning) => `\`${warning}\``).join('<br>') || '-',
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

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    targetRows: summary.targetRows,
    uniqueTargetBlocks: summary.uniqueTargetBlocks.length,
    duplicateTargetBlocks: summary.duplicateTargetBlocks,
    minTargetColorCoverage: summary.minTargetColorCoverage,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VOperatorEntryBrief = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const BRIEF_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_OPERATOR_ENTRY_BRIEF_V1';
  const ENTRY_SHEET_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_ENTRY_SHEET_V1';
  const TRACING_PACK_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_TRACING_PACK_V1';
  const READINESS_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_READINESS_V1';
  const IMAGE_DRAFT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_IMAGE_COORDINATE_DRAFT_V1';
  const BOUNDARY_PACKET_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_PACKET_V1';
  const EVIDENCE_QUALITY_AUDIT_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_EVIDENCE_QUALITY_AUDIT_V1';
  const PRE_APPROVAL_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_PRE_APPROVAL_GATE_V1';
  const EXPECTED_SHA256 = '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0';
  const FOCUS_GROUPS = [
    'P1_T3_TABLE_OWNERSHIP',
    'P1_V_CENTER_TABLE_SPLIT',
  ];
  const FOCUS_TARGET_BLOCKS = ['T3-2', 'V1', 'V2', 'V3'];
  const SHARED_BLOCKS = ['T3-2', 'T3-3'];
  const EDITABLE_FIELDS = [
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

  const pathPointCount = (pathData) => Math.floor((String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g) ?? []).length / 2);

  const sorted = (values) => [...values].sort((a, b) => a.localeCompare(b, 'ko'));

  const sha256File = async (filePath) => crypto
    .createHash('sha256')
    .update(await fs.readFile(filePath))
    .digest('hex');

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

  const polygonBounds = (points) => {
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    return {
      minX: Math.floor(Math.min(...xs)),
      minY: Math.floor(Math.min(...ys)),
      maxX: Math.ceil(Math.max(...xs)),
      maxY: Math.ceil(Math.max(...ys)),
    };
  };

  const matchesColorClass = (colorClass, r, g, b, a) => {
    if (a === 0) return false;
    if (colorClass === 'maroon') {
      return r >= 45 && g <= 95 && b <= 110 && r >= g * 1.4 && r >= b * 0.7;
    }
    if (colorClass === 'olive') {
      return r >= 130 && g >= 130 && b <= 165 && Math.abs(r - g) <= 45 && r > b * 1.15 && g > b * 1.15;
    }
    return false;
  };

  const sampleDraftColorCoverage = (image, points, colorClass) => {
    if (points.length < 3) {
      return {
        polygonPixels: 0,
        targetColorPixels: 0,
        targetColorCoverage: 0,
      };
    }

    const bounds = polygonBounds(points);
    const clampedBounds = {
      minX: Math.max(0, bounds.minX),
      minY: Math.max(0, bounds.minY),
      maxX: Math.min(image.width - 1, bounds.maxX),
      maxY: Math.min(image.height - 1, bounds.maxY),
    };
    let polygonPixels = 0;
    let targetColorPixels = 0;

    for (let y = clampedBounds.minY; y <= clampedBounds.maxY; y += 1) {
      for (let x = clampedBounds.minX; x <= clampedBounds.maxX; x += 1) {
        if (!pointInPolygon([x + 0.5, y + 0.5], points)) continue;
        polygonPixels += 1;
        const offset = (y * image.width + x) * image.channels;
        if (matchesColorClass(
          colorClass,
          image.data[offset],
          image.data[offset + 1],
          image.data[offset + 2],
          image.channels > 3 ? image.data[offset + 3] : 255,
        )) {
          targetColorPixels += 1;
        }
      }
    }

    return {
      polygonPixels,
      targetColorPixels,
      targetColorCoverage: polygonPixels > 0 ? Number((targetColorPixels / polygonPixels).toFixed(4)) : 0,
    };
  };

  const groupNextAction = (groupId) => {
    if (groupId === 'P1_T3_TABLE_OWNERSHIP') {
      return 'Approve all five T3 ownership rows together after T3-2 no longer captures T3-3/T3-4/TC-3/T3-1 labels.';
    }
    if (groupId === 'P1_V_CENTER_TABLE_SPLIT') {
      return 'Approve all seven V split rows together after V1/V2/V3 and adjacent T3/TC rows are non-overlapping.';
    }
    return 'Approve the complete paired ownership group together or leave the group pending.';
  };

  const rowNextAction = (row) => {
    if (row.block === 'T3-2') {
      return 'T3-2 appears in both T3 and V groups; enter identical correctedPath and correctedLabelX/Y in both T3-2 rows after tracing against the official PNG.';
    }
    if (row.block === 'T3-3') {
      return 'T3-3 appears in both focus groups; keep its correctedPath and correctedLabelX/Y identical in both rows if the row is approved.';
    }
    if (['V1', 'V2', 'V3'].includes(row.block)) {
      return `${row.block} is a narrow center-table split row; trace with V1/V2/V3, T3-2/T3-3, TC-1, and TC-2 visible, then approve the full V group together.`;
    }
    if (row.blockRole === 'PAIRED_CONTEXT') {
      return `${row.block} is a context owner; approve only as part of the full ${row.groupId} group and preserve its label top-hit.`;
    }
    return 'Trace manually on the official PNG and approve only with the full focus group.';
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const entrySheetPath = path.resolve(
    frontendRoot,
    argValue('--entry-sheet', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-entry-sheet.json')),
  );
  const tracingPackPath = path.resolve(
    frontendRoot,
    argValue(
      '--tracing-pack',
      path.join(
        p1ReportDir,
        'daegu-seatmap-p1-paired-ownership-tracing-pack/daegu-seatmap-p1-paired-ownership-tracing-pack.json',
      ),
    ),
  );
  const readinessPath = path.resolve(
    frontendRoot,
    argValue('--readiness', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-readiness.json')),
  );
  const imageDraftPath = path.resolve(
    frontendRoot,
    argValue(
      '--image-draft',
      path.join(
        p1ReportDir,
        'daegu-seatmap-p1-boundary-first-image-coordinate-draft/daegu-p1-boundary-first-image-coordinate-draft.json',
      ),
    ),
  );
  const boundaryPacketPath = path.resolve(
    frontendRoot,
    argValue('--boundary-packet', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-packet.json')),
  );
  const preApprovalGatePath = path.resolve(
    frontendRoot,
    argValue('--pre-approval-gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-pre-approval-gate.json')),
  );

  const entrySheet = await readJson(entrySheetPath);
  const tracingPack = await readJson(tracingPackPath);
  const readiness = await readJson(readinessPath);
  const imageDraft = await readJson(imageDraftPath);
  const boundaryPacket = await readJson(boundaryPacketPath);
  const existingPreApprovalGate = await fileExists(preApprovalGatePath)
    ? await readJson(preApprovalGatePath)
    : null;
  const imagePath = path.resolve(frontendRoot, imageDraft.sourceImage ?? '');
  const imageSha256 = imageDraft.sourceImage ? await sha256File(imagePath) : '';
  const rawImage = imageDraft.sourceImage
    ? await sharp(imagePath).raw().toBuffer({ resolveWithObject: true })
    : null;
  const officialImage = rawImage
    ? {
      data: rawImage.data,
      width: rawImage.info.width,
      height: rawImage.info.height,
      channels: rawImage.info.channels,
    }
    : null;
  const blockers = [];
  const warnings = [];

  if (entrySheet.summary?.entrySheetVersion !== ENTRY_SHEET_VERSION) {
    blockers.push(`ENTRY_SHEET_VERSION_MISMATCH:${entrySheet.summary?.entrySheetVersion ?? ''}`);
  }
  if (tracingPack.summary?.tracingPackVersion !== TRACING_PACK_VERSION) {
    blockers.push(`TRACING_PACK_VERSION_MISMATCH:${tracingPack.summary?.tracingPackVersion ?? ''}`);
  }
  if (readiness.summary?.readinessVersion !== READINESS_VERSION) {
    blockers.push(`READINESS_VERSION_MISMATCH:${readiness.summary?.readinessVersion ?? ''}`);
  }
  if (imageDraft.draftVersion !== IMAGE_DRAFT_VERSION) blockers.push(`IMAGE_DRAFT_VERSION_MISMATCH:${imageDraft.draftVersion ?? ''}`);
  if (boundaryPacket.summary?.packetVersion !== BOUNDARY_PACKET_VERSION) {
    blockers.push(`BOUNDARY_PACKET_VERSION_MISMATCH:${boundaryPacket.summary?.packetVersion ?? ''}`);
  }
  if (entrySheet.summary?.productionWriteAllowed !== false) blockers.push('ENTRY_SHEET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (tracingPack.summary?.productionWriteAllowed !== false) blockers.push('TRACING_PACK_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (readiness.summary?.productionWriteAllowed !== false) blockers.push('READINESS_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (imageDraft.productionWriteAllowed !== false) blockers.push('IMAGE_DRAFT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (imageDraft.sourceOfTruth !== false) blockers.push('IMAGE_DRAFT_SOURCE_OF_TRUTH_NOT_FALSE');
  if (imageSha256 !== EXPECTED_SHA256) blockers.push(`BRIEF_OFFICIAL_IMAGE_SHA256_MISMATCH:${imageSha256}`);
  if (boundaryPacket.summary?.productionWriteAllowed !== false) blockers.push('BOUNDARY_PACKET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

  const entryRows = (entrySheet.rows ?? []).filter((row) => FOCUS_GROUPS.includes(row.groupId));
  const readinessRowsByTemplateRowId = new Map((readiness.rows ?? []).map((row) => [row.templateRowId, row]));
  const draftRowsByBlock = new Map((imageDraft.rows ?? []).map((row) => [row.block, row]));
  const boundaryRowsByBlock = new Map((boundaryPacket.rows ?? []).map((row) => [row.block, row]));
  const tracingGroupsByGroupId = new Map((tracingPack.groups ?? []).map((group) => [group.groupId, group]));
  const blockOccurrences = entryRows.reduce((counts, row) => {
    counts.set(row.block, (counts.get(row.block) ?? 0) + 1);
    return counts;
  }, new Map());

  const focusGroupIdsInRows = sorted([...new Set(entryRows.map((row) => row.groupId))]);
  if (focusGroupIdsInRows.join(' ') !== sorted(FOCUS_GROUPS).join(' ')) {
    blockers.push(`FOCUS_GROUPS_MISMATCH:${focusGroupIdsInRows.join(' ')}`);
  }

  const groups = FOCUS_GROUPS.map((groupId) => {
    const entryGroupRows = entryRows.filter((row) => row.groupId === groupId);
    const readinessGroup = (readiness.groups ?? []).find((group) => group.groupId === groupId);
    const tracingGroup = tracingGroupsByGroupId.get(groupId);
    const missingRows = (readinessGroup?.expectedBlocks ?? []).filter((block) => (
      !entryGroupRows.some((row) => row.block === block)
    ));
    if (missingRows.length > 0) blockers.push(`BRIEF_GROUP_ROWS_MISSING:${groupId}:${missingRows.join(' ')}`);
    if (!tracingGroup) blockers.push(`BRIEF_TRACING_GROUP_MISSING:${groupId}`);

    return {
      groupId,
      title: readinessGroup?.title ?? tracingGroup?.title ?? entryGroupRows[0]?.groupTitle ?? '',
      expectedBlocks: readinessGroup?.expectedBlocks ?? [],
      rowCount: entryGroupRows.length,
      approvedRows: readinessGroup?.approvedRows ?? 0,
      completeApproval: readinessGroup?.completeApproval ?? false,
      partialApproval: readinessGroup?.partialApproval ?? false,
      tracingSvg: tracingGroup?.tracingSvg ?? '',
      correctionOverlay: tracingGroup?.overlay ?? entryGroupRows[0]?.overlay ?? '',
      operatorAction: tracingGroup?.operatorAction ?? entryGroupRows[0]?.operatorAction ?? '',
      nextAction: groupNextAction(groupId),
    };
  });

  const rows = await Promise.all(entryRows.map(async (entryRow) => {
    const readinessRow = readinessRowsByTemplateRowId.get(entryRow.templateRowId);
    const draftRow = draftRowsByBlock.get(entryRow.block);
    const boundaryRow = boundaryRowsByBlock.get(entryRow.block);
    const tracingGroup = tracingGroupsByGroupId.get(entryRow.groupId);
    const evidenceCrop = boundaryRow?.evidenceCrop ?? '';
    const evidenceCropExists = evidenceCrop ? await fileExists(path.resolve(frontendRoot, evidenceCrop)) : false;
    const tracingSvg = tracingGroup?.tracingSvg ?? '';
    const tracingSvgExists = tracingSvg ? await fileExists(path.resolve(frontendRoot, tracingSvg)) : false;
    const correctionOverlay = tracingGroup?.overlay ?? entryRow.overlay ?? '';
    const correctionOverlayExists = correctionOverlay ? await fileExists(path.resolve(frontendRoot, correctionOverlay)) : false;
    const draftOverlayPath = draftRow?.overlayPath ?? '';
    const draftOverlayExists = draftOverlayPath ? await fileExists(path.resolve(frontendRoot, draftOverlayPath)) : false;
    const draftPath = draftRow?.correctedPathDraft ?? '';
    const draftCoverage = officialImage
      ? sampleDraftColorCoverage(officialImage, parsePathPoints(draftPath), draftRow?.colorClass ?? '')
      : { polygonPixels: 0, targetColorPixels: 0, targetColorCoverage: 0 };
    const sharedBlock = SHARED_BLOCKS.includes(entryRow.block);
    const duplicatedInFocusGroups = (blockOccurrences.get(entryRow.block) ?? 0) > 1;
    const rowWarnings = [];

    if (!readinessRow) blockers.push(`BRIEF_READINESS_ROW_MISSING:${entryRow.templateRowId}`);
    if (FOCUS_TARGET_BLOCKS.includes(entryRow.block) && !boundaryRow) {
      blockers.push(`BRIEF_BOUNDARY_PACKET_TARGET_ROW_MISSING:${entryRow.block}`);
    }
    if (evidenceCrop && !evidenceCropExists) warnings.push(`BRIEF_EVIDENCE_CROP_MISSING:${entryRow.templateRowId}`);
    if (tracingSvg && !tracingSvgExists) warnings.push(`BRIEF_TRACING_SVG_MISSING:${entryRow.templateRowId}`);
    if (correctionOverlay && !correctionOverlayExists) warnings.push(`BRIEF_CORRECTION_OVERLAY_MISSING:${entryRow.templateRowId}`);
    if (draftOverlayPath && !draftOverlayExists) warnings.push(`BRIEF_DRAFT_OVERLAY_MISSING:${entryRow.templateRowId}`);
    if (readinessRow?.draftReference) rowWarnings.push('DRAFT_REFERENCE_ONLY_OPERATOR_MUST_CONFIRM');
    if (draftRow?.correctedPathDraft) rowWarnings.push('DRAFT_PATH_IS_EVIDENCE_ONLY_OPERATOR_MUST_TRACE_OR_CONFIRM');
    if (sharedBlock) rowWarnings.push('SHARED_BLOCK_KEEP_PATH_AND_LABEL_IDENTICAL_ACROSS_GROUPS');
    if (entryRow.operatorDecision !== 'APPROVED') rowWarnings.push('WAITING_FOR_OPERATOR_APPROVAL');

    return {
      templateRowId: entryRow.templateRowId,
      editableTarget: entryRow.editableTarget,
      groupId: entryRow.groupId,
      block: entryRow.block,
      blockRole: entryRow.blockRole,
      name: entryRow.name,
      traceStatus: entryRow.traceStatus,
      traceMethod: entryRow.traceMethod,
      operatorDecision: entryRow.operatorDecision,
      missingApprovalFields: entryRow.missingApprovalFields ?? [],
      sharedBlock,
      duplicatedInFocusGroups,
      currentPathPointCount: entryRow.currentPathPointCount,
      currentLabelPoint: entryRow.currentLabelPoint,
      draftReference: readinessRow?.draftReference === true,
      draftPath,
      draftPathPointCount: draftRow ? pathPointCount(draftPath) : 0,
      draftLabel: draftRow ? [draftRow.correctedLabelX, draftRow.correctedLabelY] : [],
      draftColorClass: draftRow?.colorClass ?? '',
      polygonPixels: draftCoverage.polygonPixels,
      targetColorPixels: draftCoverage.targetColorPixels,
      targetColorCoverage: draftCoverage.targetColorCoverage,
      draftOverlayPath,
      draftNote: draftRow?.note ?? '',
      evidenceCrop,
      evidenceCropExists,
      tracingSvg,
      tracingSvgExists,
      correctionOverlay,
      correctionOverlayExists,
      boundaryOperatorFocus: boundaryRow?.operatorFocus ?? '',
      boundaryApprovalRule: boundaryRow?.approvalRule ?? '',
      riskFlags: boundaryRow?.riskFlags ?? '',
      readinessWarnings: readinessRow?.warnings ?? [],
      editableFields: EDITABLE_FIELDS,
      nextOperatorAction: rowNextAction(entryRow),
      rowWarnings,
    };
  }));

  const targetRows = rows.filter((row) => FOCUS_TARGET_BLOCKS.includes(row.block));
  const sharedRows = rows.filter((row) => row.sharedBlock);
  const targetRowsWithCoverage = targetRows.filter((row) => row.targetColorPixels > 0);
  const missingEvidenceTargetRows = targetRows.filter((row) => !row.evidenceCrop);
  if (missingEvidenceTargetRows.length > 0) {
    blockers.push(`BRIEF_TARGET_EVIDENCE_MISSING:${missingEvidenceTargetRows.map((row) => row.templateRowId).join(' ')}`);
  }

  const overlayIndex = {
    tracingOverviewSvg: tracingPack.summary?.overviewSvg ?? '',
    evidenceQualityAudit: path.relative(
      frontendRoot,
      path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-evidence-quality-audit.md'),
    ),
    evidenceQualityAuditVersion: EVIDENCE_QUALITY_AUDIT_VERSION,
    evidenceQualityAuditExpectedStatuses: ['operator-review-ready', 'operator-review-ready-with-warnings'],
    preApprovalGate: path.relative(
      frontendRoot,
      path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-pre-approval-gate.md'),
    ),
    preApprovalGateVersion: PRE_APPROVAL_GATE_VERSION,
    preApprovalGateExpectedStatuses: [
      'waiting-for-operator',
      'blocked-partial-approval',
      'ready-for-source-copy-dry-run',
    ],
    groups: groups.map((group) => ({
      groupId: group.groupId,
      tracingSvg: group.tracingSvg,
      correctionOverlay: group.correctionOverlay,
    })),
    evidenceCrops: targetRows
      .filter((row) => row.evidenceCrop)
      .map((row) => ({
        block: row.block,
        evidenceCrop: row.evidenceCrop,
        draftOverlayPath: row.draftOverlayPath,
        targetColorCoverage: row.targetColorCoverage,
        targetColorPixels: row.targetColorPixels,
      })),
  };

  const status = blockers.length > 0
    ? 'blocked'
    : readiness.summary?.approvedRows > 0
      ? 'operator-entry-in-progress'
      : 'waiting-for-t3-v-operator-entry';

  const summary = {
    briefVersion: BRIEF_VERSION,
    status,
    readinessStatus: readiness.summary?.status ?? '',
    focusGroups: FOCUS_GROUPS,
    focusTargetBlocks: FOCUS_TARGET_BLOCKS,
    sharedBlocks: SHARED_BLOCKS,
    totalRows: rows.length,
    targetRows: targetRows.length,
    sharedRows: sharedRows.length,
    targetRowsWithCoverage: targetRowsWithCoverage.length,
    minTargetColorCoverage: targetRows.length > 0 ? Math.min(...targetRows.map((row) => row.targetColorCoverage)) : 0,
    officialImageSha256: imageSha256,
    evidenceQualityAudit: overlayIndex.evidenceQualityAudit,
    preApprovalGate: overlayIndex.preApprovalGate,
    preApprovalGateStatus: existingPreApprovalGate?.summary?.status ?? 'not-generated-yet',
    preApprovalGateReadyForSourceCopyDryRun: existingPreApprovalGate?.summary?.readyForSourceCopyDryRun === true,
    imageBasedAnalysis: true,
    approvedRows: readiness.summary?.approvedRows ?? 0,
    readyForT3VSourceCopyDryRun: readiness.summary?.readyForT3VSourceCopyDryRun ?? false,
    productionWriteAllowed: false,
    sourceOfTruth: false,
    writesSourceInput: false,
    writesOperatorDecision: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      entrySheet: path.relative(frontendRoot, entrySheetPath),
      tracingPack: path.relative(frontendRoot, tracingPackPath),
      readiness: path.relative(frontendRoot, readinessPath),
      imageDraft: path.relative(frontendRoot, imageDraftPath),
      boundaryPacket: path.relative(frontendRoot, boundaryPacketPath),
      preApprovalGate: path.relative(frontendRoot, preApprovalGatePath),
      officialImage: imageDraft.sourceImage ?? '',
    },
    safetyContract: [
      'This T3/V operator entry brief is read-only.',
      'It never writes source input.',
      'It never writes operatorDecision or corrected fields.',
      'It never writes the main corrections template.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'The image-coordinate draft is reference-only and sourceOfTruth=false.',
      'Draft path is evidence only; correctedPath must be operator traced or explicitly confirmed against the official PNG.',
      'Operator approval still requires correctedPath, correctedLabelX/Y, reviewer, and reviewedAt in the paired ownership operator template.',
      'The pre-approval gate must pass before source-copy dry-run can plan rows.',
    ],
    groupRules: [
      'P1_T3_TABLE_OWNERSHIP must be approved as a complete five-row group or remain pending.',
      'P1_V_CENTER_TABLE_SPLIT must be approved as a complete seven-row group or remain pending.',
      'T3-2 and T3-3 are shared rows; if approved in both groups, correctedPath and correctedLabelX/Y must match exactly.',
      'Do not copy currentPath or draftPath into correctedPath without operator tracing against the official PNG.',
    ],
    operatorExecutionOrder: [
      'npm run stadium:daegu:p1-paired-ownership-t3-v-evidence-quality-audit',
      'npm run stadium:daegu:p1-paired-ownership-t3-v-pre-approval-gate',
      'npm run stadium:daegu:p1-paired-ownership-t3-v-source-copy-dry-run',
    ],
    overlayIndex,
    groups,
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-operator-entry-brief.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-operator-entry-brief.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-operator-entry-brief.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'editableTarget',
      'groupId',
      'block',
      'blockRole',
      'sharedBlock',
      'operatorDecision',
      'missingApprovalFields',
      'evidenceCrop',
      'tracingSvg',
      'draftOverlayPath',
      'draftPath',
      'draftLabel',
      'targetColorPixels',
      'targetColorCoverage',
      'draftNote',
      'nextOperatorAction',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.editableTarget,
      row.groupId,
      row.block,
      row.blockRole,
      row.sharedBlock,
      row.operatorDecision,
      row.missingApprovalFields.join(' '),
      row.evidenceCrop,
      row.tracingSvg,
      row.draftOverlayPath,
      row.draftPath,
      row.draftLabel.join(' '),
      row.targetColorPixels,
      row.targetColorCoverage,
      row.draftNote,
      row.nextOperatorAction,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T3/V Operator Entry Brief',
    '',
    `- brief version: \`${BRIEF_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- readiness status: \`${summary.readinessStatus}\``,
    `- focus groups: ${FOCUS_GROUPS.map((groupId) => `\`${groupId}\``).join(', ')}`,
    `- target blocks: ${FOCUS_TARGET_BLOCKS.map((block) => `\`${block}\``).join(', ')}`,
    `- shared blocks: ${SHARED_BLOCKS.map((block) => `\`${block}\``).join(', ')}`,
    `- approved rows: ${summary.approvedRows}/${summary.totalRows}`,
    `- ready for T3/V source-copy dry-run: ${summary.readyForT3VSourceCopyDryRun}`,
    `- official image sha256: \`${summary.officialImageSha256}\``,
    `- min target color coverage: ${summary.minTargetColorCoverage}`,
    `- evidence quality audit: \`${summary.evidenceQualityAudit}\``,
    `- pre-approval gate: \`${summary.preApprovalGate}\``,
    `- pre-approval gate status: \`${summary.preApprovalGateStatus}\``,
    `- pre-approval gate ready: ${summary.preApprovalGateReadyForSourceCopyDryRun}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Group Rules',
    '',
    ...report.groupRules.map((line) => `- ${line}`),
    '',
    '## Operator Execution Order',
    '',
    ...report.operatorExecutionOrder.map((line) => `- \`${line}\``),
    '',
    '## Overlay Index',
    '',
    `- tracing overview: \`${overlayIndex.tracingOverviewSvg || '-'}\``,
    `- evidence quality audit: \`${overlayIndex.evidenceQualityAudit}\``,
    `- evidence quality audit expected statuses: ${overlayIndex.evidenceQualityAuditExpectedStatuses.map((entry) => `\`${entry}\``).join(', ')}`,
    `- pre-approval gate: \`${overlayIndex.preApprovalGate}\``,
    `- pre-approval gate expected statuses: ${overlayIndex.preApprovalGateExpectedStatuses.map((entry) => `\`${entry}\``).join(', ')}`,
    '',
    markdownTable(
      ['group', 'tracing svg', 'correction overlay', 'next action'],
      groups.map((group) => [
        `\`${group.groupId}\``,
        group.tracingSvg ? `\`${group.tracingSvg}\`` : '-',
        group.correctionOverlay ? `\`${group.correctionOverlay}\`` : '-',
        group.nextAction,
      ]),
    ),
    '',
    '## Target Evidence',
    '',
    markdownTable(
      ['block', 'evidence crop', 'draft overlay', 'draft label', 'target color px', 'coverage', 'draft path', 'draft note'],
      targetRows.map((row) => [
        `\`${row.block}\``,
        row.evidenceCrop ? `\`${row.evidenceCrop}\`` : '-',
        row.draftOverlayPath ? `\`${row.draftOverlayPath}\`` : '-',
        row.draftLabel.length > 0 ? row.draftLabel.join(',') : '-',
        row.targetColorPixels,
        row.targetColorCoverage,
        row.draftPath ? `\`${row.draftPath}\`` : '-',
        row.draftNote || '-',
      ]),
    ),
    '',
    '## Operator Rows',
    '',
    markdownTable(
      ['template row', 'editable target', 'block', 'role', 'shared', 'decision', 'missing fields', 'next action'],
      rows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.editableTarget}\``,
        `\`${row.block}\``,
        `\`${row.blockRole}\``,
        String(row.sharedBlock),
        `\`${row.operatorDecision}\``,
        row.missingApprovalFields.map((field) => `\`${field}\``).join('<br>') || '-',
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

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    rows: summary.totalRows,
    targetRows: summary.targetRows,
    sharedRows: summary.sharedRows,
    approvedRows: summary.approvedRows,
    readyForT3VSourceCopyDryRun: summary.readyForT3VSourceCopyDryRun,
    preApprovalGateStatus: summary.preApprovalGateStatus,
    preApprovalGateReadyForSourceCopyDryRun: summary.preApprovalGateReadyForSourceCopyDryRun,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VOperatorHandoff = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultRegressionDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-t3-v-target-entry-gate-regression');

  const HANDOFF_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_OPERATOR_HANDOFF_V1';
  const TARGET_REVIEW_PACKET_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_REVIEW_PACKET_V1';
  const TARGET_ENTRY_TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_TEMPLATE_V1';
  const TARGET_ENTRY_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_GATE_V1';
  const TARGET_ENTRY_GATE_REGRESSION_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_GATE_REGRESSION_V1';
  const TARGET_BLOCKS = ['T3-2', 'V1', 'V2', 'V3'];
  const TARGET_TEMPLATE_ROWS = [
    'P1_T3_TABLE_OWNERSHIP:T3-2',
    'P1_V_CENTER_TABLE_SPLIT:V1',
    'P1_V_CENTER_TABLE_SPLIT:V2',
    'P1_V_CENTER_TABLE_SPLIT:V3',
    'P1_V_CENTER_TABLE_SPLIT:T3-2',
  ];
  const REQUIRED_APPROVAL_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ];
  const OPERATOR_COMMANDS = [
    'npm run stadium:daegu:p1-paired-ownership-t3-v-target-review-packet',
    'edit reports/stadium/daegu-p1-operator/daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.json or .csv',
    'npm run stadium:daegu:p1-paired-ownership-t3-v-target-entry-gate',
    'npm run stadium:daegu:p1-paired-ownership-t3-v-target-entry-gate-regression',
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
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
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
  const regressionDir = path.resolve(frontendRoot, argValue('--regression-dir', defaultRegressionDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const targetReviewPacketPath = path.resolve(
    frontendRoot,
    argValue('--target-review-packet', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.json')),
  );
  const targetEntryTemplatePath = path.resolve(
    frontendRoot,
    argValue('--target-entry-template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.json')),
  );
  const targetEntryTemplateCsvPath = path.resolve(
    frontendRoot,
    argValue('--target-entry-template-csv', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.csv')),
  );
  const targetEntryGatePath = path.resolve(
    frontendRoot,
    argValue('--target-entry-gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate.json')),
  );
  const targetEntryGateRegressionPath = path.resolve(
    frontendRoot,
    argValue(
      '--target-entry-gate-regression',
      path.join(regressionDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate-regression.json'),
    ),
  );
  const targetReviewSvgPath = path.resolve(
    frontendRoot,
    argValue('--target-review-svg', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.svg')),
  );

  const reports = {
    targetReviewPacket: await readJsonReport(targetReviewPacketPath),
    targetEntryTemplate: await readJsonReport(targetEntryTemplatePath),
    targetEntryGate: await readJsonReport(targetEntryGatePath),
    targetEntryGateRegression: await readJsonReport(targetEntryGateRegressionPath),
  };

  const blockers = [];
  const warnings = [];
  Object.entries(reports).forEach(([name, report]) => {
    if (!report.exists) blockers.push(`MISSING_REPORT:${name}:${report.relativePath}`);
  });

  if (reports.targetReviewPacket.exists
    && reports.targetReviewPacket.data?.summary?.packetVersion !== TARGET_REVIEW_PACKET_VERSION) {
    blockers.push(`TARGET_REVIEW_PACKET_VERSION_MISMATCH:${reports.targetReviewPacket.data?.summary?.packetVersion ?? ''}`);
  }
  if (reports.targetEntryTemplate.exists
    && reports.targetEntryTemplate.data?.targetEntryTemplateVersion !== TARGET_ENTRY_TEMPLATE_VERSION) {
    blockers.push(`TARGET_ENTRY_TEMPLATE_VERSION_MISMATCH:${reports.targetEntryTemplate.data?.targetEntryTemplateVersion ?? ''}`);
  }
  if (reports.targetEntryGate.exists
    && reports.targetEntryGate.data?.summary?.gateVersion !== TARGET_ENTRY_GATE_VERSION) {
    blockers.push(`TARGET_ENTRY_GATE_VERSION_MISMATCH:${reports.targetEntryGate.data?.summary?.gateVersion ?? ''}`);
  }
  if (reports.targetEntryGateRegression.exists
    && reports.targetEntryGateRegression.data?.summary?.regressionVersion !== TARGET_ENTRY_GATE_REGRESSION_VERSION) {
    blockers.push(`TARGET_ENTRY_GATE_REGRESSION_VERSION_MISMATCH:${reports.targetEntryGateRegression.data?.summary?.regressionVersion ?? ''}`);
  }

  [
    reports.targetReviewPacket.data?.summary,
    reports.targetEntryGate.data?.summary,
    reports.targetEntryGateRegression.data?.summary,
  ].filter(Boolean).forEach((summary) => {
    if (summary.productionWriteAllowed !== false) blockers.push(`PRODUCTION_WRITE_ALLOWED_NOT_FALSE:${summary.status ?? ''}`);
    if (summary.writesOperatorInput === true) blockers.push(`WRITES_OPERATOR_INPUT_TRUE:${summary.status ?? ''}`);
    if (summary.writesCorrectionsTemplate === true) blockers.push(`WRITES_CORRECTIONS_TEMPLATE_TRUE:${summary.status ?? ''}`);
    if (summary.writesProductionData !== false) blockers.push(`WRITES_PRODUCTION_DATA_NOT_FALSE:${summary.status ?? ''}`);
  });

  const targetRows = list(reports.targetReviewPacket.data?.targetRows);
  const entryRows = list(reports.targetEntryTemplate.data?.rows);
  const gateRows = list(reports.targetEntryGate.data?.rows);
  const targetRowsById = new Map(targetRows.map((row) => [row.templateRowId, row]));
  const entryRowsById = new Map(entryRows.map((row) => [row.templateRowId, row]));
  const gateRowsById = new Map(gateRows.map((row) => [row.templateRowId, row]));
  const entryRowIds = entryRows.map((row) => row.templateRowId);
  if (entryRowIds.join(' ') !== TARGET_TEMPLATE_ROWS.join(' ')) {
    blockers.push(`TARGET_ENTRY_TEMPLATE_ROW_ORDER_MISMATCH:${entryRowIds.join(' ')}`);
  }
  if ((reports.targetReviewPacket.data?.summary?.targetTemplateRows ?? null) !== TARGET_TEMPLATE_ROWS.length) {
    blockers.push(`TARGET_REVIEW_TARGET_ROW_COUNT_MISMATCH:${reports.targetReviewPacket.data?.summary?.targetTemplateRows ?? ''}`);
  }
  if ((reports.targetReviewPacket.data?.summary?.contextOnlyRows ?? null) !== 7) {
    blockers.push(`TARGET_REVIEW_CONTEXT_ONLY_COUNT_MISMATCH:${reports.targetReviewPacket.data?.summary?.contextOnlyRows ?? ''}`);
  }
  if ((reports.targetEntryGateRegression.data?.summary?.status ?? '') !== 'passed') {
    blockers.push(`TARGET_ENTRY_GATE_REGRESSION_NOT_PASSED:${reports.targetEntryGateRegression.data?.summary?.status ?? ''}`);
  }

  const csvExists = await fileExists(targetEntryTemplateCsvPath);
  const svgExists = await fileExists(targetReviewSvgPath);
  if (!csvExists) blockers.push(`TARGET_ENTRY_TEMPLATE_CSV_MISSING:${path.relative(frontendRoot, targetEntryTemplateCsvPath)}`);
  if (!svgExists) blockers.push(`TARGET_REVIEW_SVG_MISSING:${path.relative(frontendRoot, targetReviewSvgPath)}`);

  const rows = TARGET_TEMPLATE_ROWS.map((templateRowId) => {
    const targetRow = targetRowsById.get(templateRowId) ?? {};
    const entryRow = entryRowsById.get(templateRowId) ?? {};
    const gateRow = gateRowsById.get(templateRowId) ?? {};
    const missingFields = list(targetRow.missingApprovalFields).length > 0
      ? list(targetRow.missingApprovalFields)
      : REQUIRED_APPROVAL_FIELDS;
    const rowStatus = gateRow.approved
      ? gateRow.mergeCandidate ? 'approved-for-template-import-dry-run' : 'approved-but-blocked'
      : 'waiting-for-operator';
    return {
      templateRowId,
      editableTarget: entryRow.editableTarget ?? targetRow.editableTarget ?? '',
      groupId: entryRow.groupId ?? targetRow.groupId ?? '',
      block: entryRow.block ?? targetRow.block ?? '',
      duplicateTargetBlock: Boolean(entryRow.duplicateTargetBlock ?? targetRow.duplicateTargetBlock),
      sharedBlock: Boolean(entryRow.sharedBlock ?? targetRow.sharedBlock),
      operatorDecision: entryRow.operatorDecision ?? '',
      missingFields,
      rowStatus,
      evidenceCrop: targetRow.evidenceCrop ?? '',
      tracingSvg: targetRow.tracingSvg ?? '',
      correctionOverlay: targetRow.correctionOverlay ?? '',
      draftReferenceOnly: targetRow.draftReferenceOnly === true,
      targetColorCoverage: targetRow.targetColorCoverage ?? null,
      gateReasons: list(gateRow.reasons),
      gateWarnings: list(gateRow.warnings),
      nextOperatorAction: targetRow.nextOperatorAction ?? '',
    };
  });

  const waitingRows = rows.filter((row) => row.rowStatus === 'waiting-for-operator');
  if (waitingRows.length > 0) warnings.push(`T3V_OPERATOR_INPUT_REQUIRED:${waitingRows.length}:${rows.length}`);
  if (rows.filter((row) => row.block === 'T3-2').length !== 2) blockers.push('T3V_DUPLICATE_TARGET_ROWS_MISSING:T3-2');

  const summary = {
    handoffVersion: HANDOFF_VERSION,
    status: blockers.length > 0 ? 'blocked' : 'ready-for-operator-handoff',
    targetBlocks: TARGET_BLOCKS,
    targetTemplateRows: rows.length,
    t3DuplicateTargetRows: rows.filter((row) => row.block === 'T3-2').length,
    contextOnlyRows: reports.targetReviewPacket.data?.summary?.contextOnlyRows ?? 0,
    waitingForOperatorRows: waitingRows.length,
    targetEntryGateStatus: reports.targetEntryGate.data?.summary?.status ?? '',
    targetEntryGateRegressionStatus: reports.targetEntryGateRegression.data?.summary?.status ?? '',
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    nextCommand: 'Fill target entry template rows, then run npm run stadium:daegu:p1-paired-ownership-t3-v-target-entry-gate.',
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    sourceReports: {
      targetReviewPacket: path.relative(frontendRoot, targetReviewPacketPath),
      targetReviewSvg: path.relative(frontendRoot, targetReviewSvgPath),
      targetEntryTemplate: path.relative(frontendRoot, targetEntryTemplatePath),
      targetEntryTemplateCsv: path.relative(frontendRoot, targetEntryTemplateCsvPath),
      targetEntryGate: path.relative(frontendRoot, targetEntryGatePath),
      targetEntryGateRegression: path.relative(frontendRoot, targetEntryGateRegressionPath),
    },
    operatorExecutionOrder: OPERATOR_COMMANDS,
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    operatorRules: [
      'T3-2 duplicate target rows must use identical correctedPath and correctedLabelX/Y.',
      'context-only rows must not be copied into the target entry template.',
      'draft paths are evidence only and require operator confirmation before APPROVED.',
      'Use operatorDecision=APPROVED only after tracing against the official PNG.',
      'Run target-entry-gate before discussing any template import.',
      'Run target-entry-gate-regression after the gate to keep partial approval and duplicate mismatch protections fixed.',
      'Source-copy remains blocked until the paired T3/V pre-approval and source-copy dry-run gates pass.',
    ],
    safetyContract: [
      'This T3/V operator handoff is read-only.',
      'It never writes operator input fields.',
      'It never writes the paired ownership corrections template.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'productionWriteAllowed: false',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-operator-handoff.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-operator-handoff.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-operator-handoff.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'editableTarget',
      'groupId',
      'block',
      'duplicateTargetBlock',
      'rowStatus',
      'operatorDecision',
      'missingFields',
      'evidenceCrop',
      'tracingSvg',
      'nextOperatorAction',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.editableTarget,
      row.groupId,
      row.block,
      row.duplicateTargetBlock,
      row.rowStatus,
      row.operatorDecision,
      row.missingFields.join(' '),
      row.evidenceCrop,
      row.tracingSvg,
      row.nextOperatorAction,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T3/V Operator Handoff',
    '',
    `- handoff version: \`${summary.handoffVersion}\``,
    `- status: \`${summary.status}\``,
    `- target blocks: ${summary.targetBlocks.map((block) => `\`${block}\``).join(', ')}`,
    `- target rows: ${summary.targetTemplateRows}`,
    `- T3-2 duplicate target rows: ${summary.t3DuplicateTargetRows}`,
    `- context-only rows: ${summary.contextOnlyRows}`,
    `- waiting for operator rows: ${summary.waitingForOperatorRows}`,
    `- target-entry-gate status: \`${summary.targetEntryGateStatus || 'missing'}\``,
    `- target-entry-gate-regression status: \`${summary.targetEntryGateRegressionStatus || 'missing'}\``,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Operator Inputs',
    '',
    `- JSON: \`${report.sourceReports.targetEntryTemplate}\``,
    `- CSV: \`${report.sourceReports.targetEntryTemplateCsv}\``,
    `- review packet: \`${report.sourceReports.targetReviewPacket}\``,
    `- review svg: \`${report.sourceReports.targetReviewSvg}\``,
    '',
    '## Required Fields',
    '',
    report.requiredApprovalFields.map((field) => `- \`${field}\``).join('\n'),
    '',
    '## Execution Order',
    '',
    report.operatorExecutionOrder.map((command, index) => `${index + 1}. \`${command}\``).join('\n'),
    '',
    '## Operator Rules',
    '',
    report.operatorRules.map((rule) => `- ${rule}`).join('\n'),
    '',
    '## Target Rows',
    '',
    markdownTable(
      ['template row', 'block', 'status', 'duplicate', 'missing fields', 'evidence', 'tracing'],
      rows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        `\`${row.rowStatus}\``,
        String(row.duplicateTargetBlock),
        row.missingFields.map((field) => `\`${field}\``).join('<br>') || '-',
        row.evidenceCrop ? `\`${row.evidenceCrop}\`` : '-',
        row.tracingSvg ? `\`${row.tracingSvg}\`` : '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    report.safetyContract.map((item) => `- ${item}`).join('\n'),
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

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    targetRows: summary.targetTemplateRows,
    t3DuplicateTargetRows: summary.t3DuplicateTargetRows,
    contextOnlyRows: summary.contextOnlyRows,
    waitingForOperatorRows: summary.waitingForOperatorRows,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VPreApprovalGate = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const PRE_APPROVAL_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_PRE_APPROVAL_GATE_V1';
  const READINESS_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_READINESS_V1';
  const TEMPLATE_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_TEMPLATE_GATE_V1';
  const ENTRY_BRIEF_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_OPERATOR_ENTRY_BRIEF_V1';
  const EVIDENCE_QUALITY_AUDIT_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_EVIDENCE_QUALITY_AUDIT_V1';
  const FOCUS_GROUPS = ['P1_T3_TABLE_OWNERSHIP', 'P1_V_CENTER_TABLE_SPLIT'];
  const SOURCE_TARGET_BLOCKS = ['T3-2', 'V1', 'V2', 'V3'];
  const SHARED_BLOCKS = ['T3-2', 'T3-3'];

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

  const includesAll = (values, expectedValues) => {
    const valueSet = new Set(values ?? []);
    return expectedValues.every((value) => valueSet.has(value));
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const readinessPath = path.resolve(
    frontendRoot,
    argValue('--readiness', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-readiness.json')),
  );
  const templateGatePath = path.resolve(
    frontendRoot,
    argValue('--template-gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-template-gate.json')),
  );
  const entryBriefPath = path.resolve(
    frontendRoot,
    argValue('--entry-brief', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-operator-entry-brief.json')),
  );
  const evidenceAuditPath = path.resolve(
    frontendRoot,
    argValue('--evidence-audit', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-evidence-quality-audit.json')),
  );

  const readiness = await readJson(readinessPath);
  const templateGate = await readJson(templateGatePath);
  const entryBrief = await readJson(entryBriefPath);
  const evidenceAudit = await readJson(evidenceAuditPath);
  const blockers = [];
  const warnings = [];

  if (readiness.summary?.readinessVersion !== READINESS_VERSION) {
    blockers.push(`READINESS_VERSION_MISMATCH:${readiness.summary?.readinessVersion ?? ''}`);
  }
  if (templateGate.summary?.gateVersion !== TEMPLATE_GATE_VERSION) {
    blockers.push(`TEMPLATE_GATE_VERSION_MISMATCH:${templateGate.summary?.gateVersion ?? ''}`);
  }
  if (entryBrief.summary?.briefVersion !== ENTRY_BRIEF_VERSION) {
    blockers.push(`ENTRY_BRIEF_VERSION_MISMATCH:${entryBrief.summary?.briefVersion ?? ''}`);
  }
  if (evidenceAudit.summary?.auditVersion !== EVIDENCE_QUALITY_AUDIT_VERSION) {
    blockers.push(`EVIDENCE_QUALITY_AUDIT_VERSION_MISMATCH:${evidenceAudit.summary?.auditVersion ?? ''}`);
  }

  [
    ['READINESS', readiness.summary],
    ['TEMPLATE_GATE', templateGate.summary],
    ['ENTRY_BRIEF', entryBrief.summary],
    ['EVIDENCE_QUALITY_AUDIT', evidenceAudit.summary],
  ].forEach(([label, summary]) => {
    if (summary?.productionWriteAllowed !== false) blockers.push(`${label}_PRODUCTION_WRITE_ALLOWED_NOT_FALSE`);
    if (summary?.writesSourceInput !== false) blockers.push(`${label}_WRITES_SOURCE_INPUT_NOT_FALSE`);
    if (summary?.writesProductionData !== false) blockers.push(`${label}_WRITES_PRODUCTION_DATA_NOT_FALSE`);
  });

  if (!includesAll(entryBrief.summary?.focusGroups, FOCUS_GROUPS)) blockers.push('ENTRY_BRIEF_FOCUS_GROUPS_MISMATCH');
  if (!includesAll(entryBrief.summary?.focusTargetBlocks, SOURCE_TARGET_BLOCKS)) {
    blockers.push('ENTRY_BRIEF_SOURCE_TARGET_BLOCKS_MISMATCH');
  }
  if (!includesAll(entryBrief.summary?.sharedBlocks, SHARED_BLOCKS)) blockers.push('ENTRY_BRIEF_SHARED_BLOCKS_MISMATCH');
  if (!includesAll(evidenceAudit.summary?.uniqueTargetBlocks, SOURCE_TARGET_BLOCKS)) {
    blockers.push('EVIDENCE_AUDIT_SOURCE_TARGET_BLOCKS_MISMATCH');
  }
  if (evidenceAudit.summary?.imageBasedAnalysis !== true) blockers.push('EVIDENCE_AUDIT_IMAGE_BASED_ANALYSIS_NOT_TRUE');
  if ((evidenceAudit.summary?.blockers ?? []).length > 0) {
    blockers.push(...evidenceAudit.summary.blockers.map((blocker) => `EVIDENCE_AUDIT_BLOCKER:${blocker}`));
  }
  if ((entryBrief.summary?.blockers ?? []).length > 0) {
    blockers.push(...entryBrief.summary.blockers.map((blocker) => `ENTRY_BRIEF_BLOCKER:${blocker}`));
  }
  if ((readiness.summary?.blockers ?? []).length > 0) blockers.push(...readiness.summary.blockers);

  const evidenceRowsByTemplateRowId = new Map((evidenceAudit.rows ?? []).map((row) => [row.templateRowId, row]));
  const rows = (readiness.rows ?? []).map((row) => {
    const evidenceRow = evidenceRowsByTemplateRowId.get(row.templateRowId);
    const rowWarnings = [
      ...(row.warnings ?? []),
      ...(evidenceRow?.rowWarnings ?? []).map((warning) => `EVIDENCE:${warning}`),
    ];
    if (row.correctedPathMatchesDraft) rowWarnings.push('CORRECTED_PATH_MATCHES_DRAFT_CONFIRM_OPERATOR_INTENT');
    return {
      templateRowId: row.templateRowId,
      groupId: row.groupId,
      block: row.block,
      operatorDecision: row.operatorDecision,
      approved: row.approved,
      targetBlock: SOURCE_TARGET_BLOCKS.includes(row.block),
      sharedBlock: SHARED_BLOCKS.includes(row.block),
      gateReadyForSourceCopy: row.gateReadyForSourceCopy,
      readyForSourceCopy: row.approved && row.gateReadyForSourceCopy && (row.reasons ?? []).length === 0,
      correctedPathPointCount: row.correctedPathPointCount,
      draftReference: row.draftReference,
      correctedPathMatchesDraft: row.correctedPathMatchesDraft,
      targetColorCoverage: evidenceRow?.targetColorCoverage ?? null,
      reasons: row.reasons ?? [],
      warnings: rowWarnings,
      nextAction: row.nextAction,
    };
  });

  const groups = (readiness.groups ?? []).map((group) => {
    const groupRows = rows.filter((row) => row.groupId === group.groupId);
    return {
      groupId: group.groupId,
      title: group.title,
      expectedBlocks: group.expectedBlocks,
      totalRows: group.totalRows,
      approvedRows: group.approvedRows,
      completeApproval: group.completeApproval,
      partialApproval: group.partialApproval,
      readyForSourceCopy: group.completeApproval && groupRows.every((row) => row.readyForSourceCopy),
    };
  });

  const approvedRows = rows.filter((row) => row.approved);
  const groupPartialBlockers = groups
    .filter((group) => group.approvedRows > 0 && !group.completeApproval)
    .map((group) => `T3V_PARTIAL_APPROVAL_BLOCKED:${group.groupId}:${group.approvedRows}:${group.totalRows}`);
  blockers.push(...groupPartialBlockers);

  const approvedSharedRowsByBlock = new Map();
  rows.filter((row) => row.approved && row.sharedBlock).forEach((row) => {
    const sharedRows = approvedSharedRowsByBlock.get(row.block) ?? [];
    sharedRows.push(row);
    approvedSharedRowsByBlock.set(row.block, sharedRows);
  });
  approvedSharedRowsByBlock.forEach((sharedRows, block) => {
    if (sharedRows.length === 1) blockers.push(`T3V_SHARED_BLOCK_PARTIAL_APPROVAL_BLOCKED:${block}`);
  });

  const completeAllGroups = groups.every((group) => group.completeApproval);
  if (approvedRows.length > 0 && !completeAllGroups && !readiness.summary?.readyForT3VSourceCopyDryRun) {
    blockers.push(`T3V_PARTIAL_APPROVAL_BLOCKED:ALL:${approvedRows.length}:${rows.length}`);
  }
  if (templateGate.summary?.status === 'blocked') blockers.push('T3V_TEMPLATE_GATE_BLOCKED');
  if (readiness.summary?.status === 'blocked') blockers.push('T3V_READINESS_BLOCKED');
  if (readiness.summary?.status === 'blocked-partial-t3-v-approval') blockers.push('T3V_READINESS_PARTIAL_APPROVAL_BLOCKED');

  warnings.push(...(readiness.summary?.warnings ?? []));
  warnings.push(...(templateGate.summary?.warnings ?? []).map((warning) => `TEMPLATE_GATE:${warning}`));
  warnings.push(...(entryBrief.summary?.warnings ?? []).map((warning) => `ENTRY_BRIEF:${warning}`));
  warnings.push(...(evidenceAudit.summary?.warnings ?? []).map((warning) => `EVIDENCE_AUDIT:${warning}`));
  if (approvedRows.length === 0) warnings.push('T3V_PRE_APPROVAL_GATE_HAS_NO_APPROVED_ROWS');

  const hasPartialApproval = groups.some((group) => group.approvedRows > 0 && !group.completeApproval)
    || (approvedRows.length > 0 && !completeAllGroups && !readiness.summary?.readyForT3VSourceCopyDryRun);
  const readyForSourceCopyDryRun = blockers.length === 0 && readiness.summary?.readyForT3VSourceCopyDryRun === true;
  const status = blockers.length > 0
    ? hasPartialApproval
      ? 'blocked-partial-approval'
      : 'blocked'
    : readyForSourceCopyDryRun
      ? 'ready-for-source-copy-dry-run'
      : 'waiting-for-operator';

  const summary = {
    preApprovalGateVersion: PRE_APPROVAL_GATE_VERSION,
    status,
    readinessVersion: READINESS_VERSION,
    readinessStatus: readiness.summary?.status ?? '',
    templateGateStatus: templateGate.summary?.status ?? '',
    entryBriefStatus: entryBrief.summary?.status ?? '',
    evidenceAuditStatus: evidenceAudit.summary?.status ?? '',
    focusGroups: FOCUS_GROUPS,
    sourceTargetBlocks: SOURCE_TARGET_BLOCKS,
    sharedBlocks: SHARED_BLOCKS,
    totalRows: rows.length,
    approvedRows: approvedRows.length,
    completeApprovalGroups: groups.filter((group) => group.completeApproval).length,
    partialApprovalGroups: groups.filter((group) => group.partialApproval).length,
    readyRows: rows.filter((row) => row.readyForSourceCopy).length,
    readyForSourceCopyDryRun,
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesSourceInput: false,
    writesOperatorDecision: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      readiness: path.relative(frontendRoot, readinessPath),
      templateGate: path.relative(frontendRoot, templateGatePath),
      entryBrief: path.relative(frontendRoot, entryBriefPath),
      evidenceAudit: path.relative(frontendRoot, evidenceAuditPath),
    },
    safetyContract: [
      'This T3/V pre-approval gate is read-only.',
      'It never writes source input.',
      'It never writes operatorDecision or corrected fields.',
      'It never writes the main corrections template.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'waiting-for-operator is not a release approval.',
      'ready-for-source-copy-dry-run only allows the next dry-run gate, not a production write.',
      'APPROVED rows must pass the template gate before this report can become ready-for-source-copy-dry-run.',
    ],
    groups,
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-pre-approval-gate.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-pre-approval-gate.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-pre-approval-gate.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'groupId',
      'block',
      'operatorDecision',
      'approved',
      'targetBlock',
      'sharedBlock',
      'gateReadyForSourceCopy',
      'readyForSourceCopy',
      'correctedPathPointCount',
      'targetColorCoverage',
      'reasons',
      'warnings',
      'nextAction',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.groupId,
      row.block,
      row.operatorDecision,
      row.approved,
      row.targetBlock,
      row.sharedBlock,
      row.gateReadyForSourceCopy,
      row.readyForSourceCopy,
      row.correctedPathPointCount,
      row.targetColorCoverage ?? '',
      row.reasons.join(' '),
      row.warnings.join(' '),
      row.nextAction,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T3/V Pre-Approval Gate',
    '',
    `- pre-approval gate version: \`${PRE_APPROVAL_GATE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- readiness status: \`${summary.readinessStatus || 'none'}\``,
    `- template gate status: \`${summary.templateGateStatus || 'none'}\``,
    `- evidence audit status: \`${summary.evidenceAuditStatus || 'none'}\``,
    `- approved rows: ${summary.approvedRows}/${summary.totalRows}`,
    `- ready rows: ${summary.readyRows}/${summary.totalRows}`,
    `- ready for source-copy dry-run: ${summary.readyForSourceCopyDryRun}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Groups',
    '',
    markdownTable(
      ['group', 'approved', 'complete', 'partial', 'ready', 'expected blocks'],
      groups.map((group) => [
        `\`${group.groupId}\``,
        `${group.approvedRows}/${group.totalRows}`,
        String(group.completeApproval),
        String(group.partialApproval),
        String(group.readyForSourceCopy),
        group.expectedBlocks.map((block) => `\`${block}\``).join(' '),
      ]),
    ),
    '',
    '## Rows',
    '',
    markdownTable(
      ['template row', 'block', 'decision', 'target', 'shared', 'gate ready', 'ready', 'coverage', 'reasons', 'warnings'],
      rows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        `\`${row.operatorDecision}\``,
        String(row.targetBlock),
        String(row.sharedBlock),
        String(row.gateReadyForSourceCopy),
        String(row.readyForSourceCopy),
        row.targetColorCoverage ?? '-',
        row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
        row.warnings.map((warning) => `\`${warning}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
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

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    approvedRows: summary.approvedRows,
    readyRows: summary.readyRows,
    readyForSourceCopyDryRun: summary.readyForSourceCopyDryRun,
    productionWriteAllowed: false,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status === 'blocked' || summary.status === 'blocked-partial-approval') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VReadinessRegression = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultOutputDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-t3-v-readiness-regression');

  const REGRESSION_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_READINESS_REGRESSION_V1';
  const PRE_APPROVAL_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_PRE_APPROVAL_GATE_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const SOURCE_SCOPE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_SOURCE_SCOPE_V1';
  const IMAGE_DRAFT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_IMAGE_COORDINATE_DRAFT_V1';
  const ENTRY_BRIEF_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_OPERATOR_ENTRY_BRIEF_V1';
  const EVIDENCE_QUALITY_AUDIT_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_EVIDENCE_QUALITY_AUDIT_V1';
  const CASES = [
    'waiting-for-operator',
    't3-partial-approval',
    'v-partial-approval',
    'shared-block-path-label-mismatch',
    'full-t3-v-approval',
  ];
  const FOCUS_GROUP_IDS = ['P1_T3_TABLE_OWNERSHIP', 'P1_V_CENTER_TABLE_SPLIT'];
  const SOURCE_TARGET_BLOCKS = ['T3-2', 'V1', 'V2', 'V3'];
  const SHARED_BLOCKS = ['T3-2', 'T3-3'];

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

  const cloneJson = (value) => JSON.parse(JSON.stringify(value));

  const byTemplateRowId = (template) => new Map(template.corrections.map((row) => [row.templateRowId, row]));

  const squarePath = (x, y, radius = 4) => (
    `M ${Math.round(x - radius)} ${Math.round(y - radius)} L ${Math.round(x + radius)} ${Math.round(y - radius)} L ${Math.round(x + radius)} ${Math.round(y + radius)} L ${Math.round(x - radius)} ${Math.round(y + radius)} Z`
  );

  const requireRow = (rows, templateRowId) => {
    const row = rows.get(templateRowId);
    if (!row) throw new Error(`Regression fixture row missing: ${templateRowId}`);
    return row;
  };

  const approveRow = (row, {
    correctedPath = squarePath(Number(row.currentLabelX), Number(row.currentLabelY), 8),
    correctedLabelX = row.currentLabelX,
    correctedLabelY = row.currentLabelY,
    reviewer = 'T3_V_READINESS_REGRESSION_FIXTURE',
    reviewedAt = '2026-05-16T00:00:00.000Z',
    operatorNote = 'Regression fixture only; do not source-copy.',
  } = {}) => {
    row.operatorDecision = 'APPROVED';
    row.correctedPath = correctedPath;
    row.correctedLabelX = String(correctedLabelX);
    row.correctedLabelY = String(correctedLabelY);
    row.reviewer = reviewer;
    row.reviewedAt = reviewedAt;
    row.operatorNote = operatorNote;
  };

  const approveFocusGroupsWithSquares = (template) => {
    const sharedFixtures = new Map();
    template.corrections
      .filter((row) => FOCUS_GROUP_IDS.includes(row.groupId))
      .forEach((row) => {
        if (SHARED_BLOCKS.includes(row.block)) {
          const fixture = sharedFixtures.get(row.block) ?? {
            correctedPath: squarePath(Number(row.currentLabelX), Number(row.currentLabelY)),
            correctedLabelX: row.currentLabelX,
            correctedLabelY: row.currentLabelY,
          };
          sharedFixtures.set(row.block, fixture);
          approveRow(row, fixture);
          return;
        }
        approveRow(row);
      });
  };

  const spawnNode = (scriptName, args, cwd = frontendRoot) => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', path.join(scriptDir, scriptName), ...args],
      {
        cwd,
        encoding: 'utf8',
      },
    );
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  };

  const runTemplateGate = (caseDir, templatePath, sourceScopePath) => spawnNode(
    'daegu-seatmap-p1-paired-ownership-template-gate.mjs',
    [
      '--template',
      templatePath,
      '--source-scope',
      sourceScopePath,
      '--output-dir',
      caseDir,
    ],
  );

  const runReadiness = (caseDir, templatePath, sourceScopePath, imageDraftPath) => spawnNode(
    'daegu-seatmap-p1-paired-ownership-t3-v-approval-readiness.mjs',
    [
      '--template-gate',
      path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-template-gate.json'),
      '--template',
      templatePath,
      '--source-scope',
      sourceScopePath,
      '--image-draft',
      imageDraftPath,
      '--output-dir',
      caseDir,
    ],
  );

  const runPreApprovalGate = (caseDir, readinessPath, entryBriefPath, evidenceAuditPath) => spawnNode(
    'daegu-seatmap-p1-paired-ownership-t3-v-pre-approval-gate.mjs',
    [
      '--template-gate',
      path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-template-gate.json'),
      '--readiness',
      readinessPath,
      '--entry-brief',
      entryBriefPath,
      '--evidence-audit',
      evidenceAuditPath,
      '--output-dir',
      caseDir,
    ],
  );

  const makeEntryBrief = (readinessReport) => ({
    generatedAt: new Date().toISOString(),
    summary: {
      briefVersion: ENTRY_BRIEF_VERSION,
      status: (readinessReport.summary?.approvedRows ?? 0) > 0
        ? 'operator-entry-in-progress'
        : 'waiting-for-t3-v-operator-entry',
      readinessStatus: readinessReport.summary?.status ?? '',
      focusGroups: FOCUS_GROUP_IDS,
      focusTargetBlocks: SOURCE_TARGET_BLOCKS,
      sharedBlocks: SHARED_BLOCKS,
      totalRows: readinessReport.summary?.totalRows ?? 0,
      targetRows: 5,
      sharedRows: 4,
      targetRowsWithCoverage: 5,
      minTargetColorCoverage: 1,
      imageBasedAnalysis: true,
      approvedRows: readinessReport.summary?.approvedRows ?? 0,
      readyForT3VSourceCopyDryRun: readinessReport.summary?.readyForT3VSourceCopyDryRun ?? false,
      productionWriteAllowed: false,
      sourceOfTruth: false,
      writesSourceInput: false,
      writesOperatorDecision: false,
      writesCorrectionsTemplate: false,
      writesProductionData: false,
      blockers: [],
      warnings: [],
    },
  });

  const makeEvidenceAudit = (readinessReport) => ({
    generatedAt: new Date().toISOString(),
    summary: {
      auditVersion: EVIDENCE_QUALITY_AUDIT_VERSION,
      status: 'operator-review-ready',
      imageBasedAnalysis: true,
      targetRows: 5,
      uniqueTargetBlocks: SOURCE_TARGET_BLOCKS,
      duplicateTargetBlocks: ['T3-2'],
      minTargetColorCoverage: 1,
      maxTargetColorCoverage: 1,
      productionWriteAllowed: false,
      sourceOfTruth: false,
      writesSourceInput: false,
      writesOperatorDecision: false,
      writesCorrectionsTemplate: false,
      writesProductionData: false,
      blockers: [],
      warnings: [],
    },
    rows: (readinessReport.rows ?? [])
      .filter((row) => SOURCE_TARGET_BLOCKS.includes(row.block))
      .map((row) => ({
        templateRowId: row.templateRowId,
        groupId: row.groupId,
        block: row.block,
        targetColorCoverage: 1,
        rowBlockers: [],
        rowWarnings: [],
      })),
  });

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));
  const sourceTemplatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );
  const sourceScopePath = path.resolve(
    frontendRoot,
    argValue('--source-scope', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json')),
  );
  const imageDraftPath = path.resolve(
    frontendRoot,
    argValue(
      '--image-draft',
      path.join(
        p1ReportDir,
        'daegu-seatmap-p1-boundary-first-image-coordinate-draft/daegu-p1-boundary-first-image-coordinate-draft.json',
      ),
    ),
  );

  const blockers = [];
  const warnings = [];
  const sourceTemplate = await readJson(sourceTemplatePath);
  const sourceScope = await readJson(sourceScopePath);
  const imageDraft = await readJson(imageDraftPath);

  if (sourceTemplate.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${sourceTemplate.templateVersion ?? ''}`);
  if (sourceScope.summary?.sourceScopeVersion !== SOURCE_SCOPE_VERSION) {
    blockers.push(`SOURCE_SCOPE_VERSION_MISMATCH:${sourceScope.summary?.sourceScopeVersion ?? ''}`);
  }
  if (imageDraft.draftVersion !== IMAGE_DRAFT_VERSION) blockers.push(`IMAGE_DRAFT_VERSION_MISMATCH:${imageDraft.draftVersion ?? ''}`);
  if (sourceTemplate.productionWriteAllowed !== false) blockers.push('SOURCE_TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (sourceScope.summary?.productionWriteAllowed !== false) blockers.push('SOURCE_SCOPE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (imageDraft.productionWriteAllowed !== false) blockers.push('IMAGE_DRAFT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (imageDraft.sourceOfTruth !== false) blockers.push('IMAGE_DRAFT_SOURCE_OF_TRUTH_NOT_FALSE');

  const makeCaseTemplate = (caseId) => {
    const template = cloneJson(sourceTemplate);
    const rows = byTemplateRowId(template);

    if (caseId === 'waiting-for-operator') return template;

    if (caseId === 't3-partial-approval') {
      approveRow(requireRow(rows, 'P1_T3_TABLE_OWNERSHIP:T3-2'));
      return template;
    }

    if (caseId === 'v-partial-approval') {
      approveRow(requireRow(rows, 'P1_V_CENTER_TABLE_SPLIT:V1'));
      return template;
    }

    if (caseId === 'full-t3-v-approval') {
      approveFocusGroupsWithSquares(template);
      return template;
    }

    if (caseId === 'shared-block-path-label-mismatch') {
      approveFocusGroupsWithSquares(template);
      approveRow(requireRow(rows, 'P1_T3_TABLE_OWNERSHIP:T3-2'), {
        correctedPath: 'M 862 1091 L 911 1091 L 911 1152 L 862 1152 Z',
        correctedLabelX: 887,
        correctedLabelY: 1121,
      });
      approveRow(requireRow(rows, 'P1_V_CENTER_TABLE_SPLIT:T3-2'), {
        correctedPath: 'M 930 1081 L 988 1081 L 988 1157 L 930 1157 Z',
        correctedLabelX: 958,
        correctedLabelY: 1119,
      });
      return template;
    }

    throw new Error(`Unknown regression case: ${caseId}`);
  };

  await fs.mkdir(outputDir, { recursive: true });

  const caseResults = [];
  if (blockers.length === 0) {
    for (const caseId of CASES) {
      const caseDir = path.join(outputDir, caseId);
      await fs.mkdir(caseDir, { recursive: true });
      const fixtureTemplate = makeCaseTemplate(caseId);
      const fixtureTemplatePath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json');
      const fixtureSourceScopePath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json');
      const fixtureEntryBriefPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-operator-entry-brief.json');
      const fixtureEvidenceAuditPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-evidence-quality-audit.json');
      await fs.writeFile(fixtureTemplatePath, `${JSON.stringify(fixtureTemplate, null, 2)}\n`, 'utf8');
      await fs.writeFile(fixtureSourceScopePath, `${JSON.stringify(sourceScope, null, 2)}\n`, 'utf8');

      const templateGateCommand = runTemplateGate(caseDir, fixtureTemplatePath, fixtureSourceScopePath);
      const readinessCommand = runReadiness(caseDir, fixtureTemplatePath, fixtureSourceScopePath, imageDraftPath);
      const readinessReportPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-readiness.json');
      const readinessReport = await readJson(readinessReportPath);
      await fs.writeFile(fixtureEntryBriefPath, `${JSON.stringify(makeEntryBrief(readinessReport), null, 2)}\n`, 'utf8');
      await fs.writeFile(fixtureEvidenceAuditPath, `${JSON.stringify(makeEvidenceAudit(readinessReport), null, 2)}\n`, 'utf8');
      const preApprovalCommand = runPreApprovalGate(
        caseDir,
        readinessReportPath,
        fixtureEntryBriefPath,
        fixtureEvidenceAuditPath,
      );
      const preApprovalReportPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-pre-approval-gate.json');
      const preApprovalReport = await readJson(preApprovalReportPath);
      const reasons = [
        ...(readinessReport.summary?.blockers ?? []),
        ...(readinessReport.summary?.warnings ?? []),
        ...(preApprovalReport.summary?.blockers ?? []),
        ...(preApprovalReport.summary?.warnings ?? []),
        ...(readinessReport.groups ?? []).flatMap((group) => [
          group.partialApproval ? `GROUP_PARTIAL:${group.groupId}` : '',
        ].filter(Boolean)),
        ...(readinessReport.rows ?? []).flatMap((row) => [
          ...(row.reasons ?? []),
          ...(row.warnings ?? []),
        ]),
        ...(preApprovalReport.rows ?? []).flatMap((row) => [
          ...(row.reasons ?? []),
          ...(row.warnings ?? []),
        ]),
      ];

      caseResults.push({
        caseId,
        templateGateExitCode: templateGateCommand.exitCode,
        readinessExitCode: readinessCommand.exitCode,
        preApprovalExitCode: preApprovalCommand.exitCode,
        readinessStatus: readinessReport.summary?.status ?? '',
        preApprovalStatus: preApprovalReport.summary?.status ?? '',
        approvedRows: readinessReport.summary?.approvedRows ?? 0,
        invalidRows: readinessReport.summary?.invalidRows ?? 0,
        readyForT3VSourceCopyDryRun: readinessReport.summary?.readyForT3VSourceCopyDryRun ?? false,
        readyForSourceCopyDryRun: preApprovalReport.summary?.readyForSourceCopyDryRun ?? false,
        blockers: readinessReport.summary?.blockers ?? [],
        warnings: [
          ...(readinessReport.summary?.warnings ?? []),
          ...(preApprovalReport.summary?.warnings ?? []),
        ],
        reasons,
        template: path.relative(frontendRoot, fixtureTemplatePath),
        report: path.relative(frontendRoot, readinessReportPath),
        preApprovalReport: path.relative(frontendRoot, preApprovalReportPath),
      });
    }
  }

  const expectedCaseContracts = {
    'waiting-for-operator': [
      'status:waiting-for-t3-v-operator',
      'preApprovalStatus:waiting-for-operator',
      'warning:T3V_APPROVAL_READINESS_HAS_NO_APPROVED_ROWS',
    ],
    't3-partial-approval': [
      'status:blocked-partial-t3-v-approval',
      'preApprovalStatus:blocked-partial-approval',
      'T3V_PARTIAL_APPROVAL_BLOCKED:P1_T3_TABLE_OWNERSHIP',
    ],
    'v-partial-approval': [
      'status:blocked-partial-t3-v-approval',
      'preApprovalStatus:blocked-partial-approval',
      'T3V_PARTIAL_APPROVAL_BLOCKED:P1_V_CENTER_TABLE_SPLIT',
    ],
    'shared-block-path-label-mismatch': [
      'status:blocked',
      'preApprovalStatus:blocked',
      'T3V_SHARED_BLOCK_CORRECTED_PATH_MISMATCH:T3-2',
      'T3V_SHARED_BLOCK_CORRECTED_LABEL_MISMATCH:T3-2',
    ],
    'full-t3-v-approval': [
      'status:ready-for-t3-v-source-copy-dry-run',
      'preApprovalStatus:ready-for-source-copy-dry-run',
      'readyForSourceCopyDryRun:true',
    ],
  };

  caseResults.forEach((result) => {
    const expected = expectedCaseContracts[result.caseId] ?? [];
    expected.forEach((contract) => {
      if (contract.startsWith('status:')) {
        const expectedStatus = contract.slice('status:'.length);
        if (result.readinessStatus !== expectedStatus) {
          blockers.push(`REGRESSION_STATUS_MISMATCH:${result.caseId}:${result.readinessStatus}:${expectedStatus}`);
        }
        return;
      }
      if (contract.startsWith('warning:')) {
        const expectedWarning = contract.slice('warning:'.length);
        if (!result.warnings.includes(expectedWarning)) {
          blockers.push(`REGRESSION_WARNING_MISSING:${result.caseId}:${expectedWarning}`);
        }
        return;
      }
      if (contract.startsWith('preApprovalStatus:')) {
        const expectedStatus = contract.slice('preApprovalStatus:'.length);
        if (result.preApprovalStatus !== expectedStatus) {
          blockers.push(`REGRESSION_PRE_APPROVAL_STATUS_MISMATCH:${result.caseId}:${result.preApprovalStatus}:${expectedStatus}`);
        }
        return;
      }
      if (contract === 'readyForSourceCopyDryRun:true') {
        if (result.readyForSourceCopyDryRun !== true) {
          blockers.push(`REGRESSION_PRE_APPROVAL_READY_MISMATCH:${result.caseId}`);
        }
        return;
      }
      if (!result.reasons.some((reason) => String(reason).includes(contract))) {
        blockers.push(`REGRESSION_REASON_MISSING:${result.caseId}:${contract}`);
      }
    });
  });

  const summary = {
    regressionVersion: REGRESSION_VERSION,
    readinessVersion: 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_READINESS_V1',
    preApprovalGateVersion: PRE_APPROVAL_GATE_VERSION,
    status: blockers.length > 0 ? 'blocked' : 'passed',
    sourceTemplate: path.relative(frontendRoot, sourceTemplatePath),
    sourceScope: path.relative(frontendRoot, sourceScopePath),
    imageDraft: path.relative(frontendRoot, imageDraftPath),
    totalCases: caseResults.length,
    passedCases: blockers.length > 0 ? 0 : caseResults.length,
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
    expectedCaseContracts,
    safetyContract: [
      'This regression script writes only fixture/report files under reports/stadium/daegu-p1-paired-ownership-t3-v-readiness-regression.',
      'It never writes the production paired ownership operator template.',
      'It never writes source input.',
      'It never writes src/data/daeguSeatData.ts.',
      'Fixture approvals are synthetic and must not be copied into operator input.',
      'The shared-block mismatch fixture intentionally gives T3-2 conflicting correctedPath and correctedLabelX/Y values across the T3 and V groups.',
      'The full approval fixture must reach ready-for-source-copy-dry-run only in the read-only pre-approval gate.',
    ],
    cases: caseResults,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-readiness-regression.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-readiness-regression.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-readiness-regression.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'caseId',
      'readinessStatus',
      'preApprovalStatus',
      'approvedRows',
      'invalidRows',
      'readyForT3VSourceCopyDryRun',
      'readyForSourceCopyDryRun',
      'reasons',
      'report',
      'preApprovalReport',
    ],
    ...caseResults.map((result) => [
      result.caseId,
      result.readinessStatus,
      result.preApprovalStatus,
      result.approvedRows,
      result.invalidRows,
      result.readyForT3VSourceCopyDryRun,
      result.readyForSourceCopyDryRun,
      result.reasons.join('; '),
      result.report,
      result.preApprovalReport,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T3/V Readiness Regression',
    '',
    `- regression version: \`${REGRESSION_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- total cases: ${summary.totalCases}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Cases',
    '',
    markdownTable(
      ['case', 'readiness', 'pre-approval', 'approved', 'invalid', 'ready', 'pre ready', 'expected reasons', 'report'],
      caseResults.map((result) => [
        `\`${result.caseId}\``,
        `\`${result.readinessStatus}\``,
        `\`${result.preApprovalStatus}\``,
        result.approvedRows,
        result.invalidRows,
        String(result.readyForT3VSourceCopyDryRun),
        String(result.readyForSourceCopyDryRun),
        result.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
        `[\`readiness\`](${path.relative(outputDir, path.join(frontendRoot, result.report))}) / [\`pre-approval\`](${path.relative(outputDir, path.join(frontendRoot, result.preApprovalReport))})`,
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    totalCases: summary.totalCases,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VSourceCopyDryRun = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const DRY_RUN_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_SOURCE_COPY_DRY_RUN_V1';
  const READINESS_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_READINESS_V1';
  const PRE_APPROVAL_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_PRE_APPROVAL_GATE_V1';
  const ENTRY_BRIEF_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_OPERATOR_ENTRY_BRIEF_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const SOURCE_INPUT_VERSION = 'DAEGU_P1_OPERATOR_PACKAGE_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const FOCUS_GROUPS = [
    'P1_T3_TABLE_OWNERSHIP',
    'P1_V_CENTER_TABLE_SPLIT',
  ];
  const SOURCE_TARGET_BLOCKS = ['T3-2', 'V1', 'V2', 'V3'];
  const SHARED_BLOCKS = ['T3-2', 'T3-3'];
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

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const readOptionalJson = async (filePath) => {
    try {
      return await readJson(filePath);
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
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

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const normalizePath = (value) => String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toUpperCase();

  const normalizeLabel = (row) => [
    String(row?.correctedLabelX ?? '').trim(),
    String(row?.correctedLabelY ?? '').trim(),
  ].join(',');

  const normalizeCopyFields = (row) => ({
    operatorDecision: normalizeDecision(row.operatorDecision),
    correctedPath: String(row.correctedPath ?? '').trim(),
    correctedLabelX: row.correctedLabelX ?? '',
    correctedLabelY: row.correctedLabelY ?? '',
    reviewer: String(row.reviewer ?? '').trim(),
    reviewedAt: String(row.reviewedAt ?? '').trim(),
    operatorNote: String(row.operatorNote ?? '').trim(),
  });

  const rowChanged = (before, copiedFields) => COPY_FIELDS.some((field) => (
    String(before?.[field] ?? '') !== String(copiedFields?.[field] ?? '')
  ));

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const readinessPath = path.resolve(
    frontendRoot,
    argValue('--readiness', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-readiness.json')),
  );
  const entryBriefPath = path.resolve(
    frontendRoot,
    argValue('--entry-brief', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-operator-entry-brief.json')),
  );
  const preApprovalGatePath = path.resolve(
    frontendRoot,
    argValue('--pre-approval-gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-pre-approval-gate.json')),
  );
  const templatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );
  const sourceInputPath = path.resolve(
    frontendRoot,
    argValue('--source-input', path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json')),
  );

  const readiness = await readJson(readinessPath);
  const entryBrief = await readJson(entryBriefPath);
  const preApprovalGate = await readOptionalJson(preApprovalGatePath);
  const template = await readJson(templatePath);
  const sourceInput = await readJson(sourceInputPath);
  const blockers = [];
  const warnings = [];

  const templateSha256 = await sha256File(templatePath);
  const sourceInputSha256 = await sha256File(sourceInputPath);

  if (readiness.summary?.readinessVersion !== READINESS_VERSION) {
    blockers.push(`READINESS_VERSION_MISMATCH:${readiness.summary?.readinessVersion ?? ''}`);
  }
  if (entryBrief.summary?.briefVersion !== ENTRY_BRIEF_VERSION) {
    blockers.push(`ENTRY_BRIEF_VERSION_MISMATCH:${entryBrief.summary?.briefVersion ?? ''}`);
  }
  if (!preApprovalGate) {
    blockers.push('T3V_PRE_APPROVAL_GATE_MISSING');
  } else {
    if (preApprovalGate.summary?.preApprovalGateVersion !== PRE_APPROVAL_GATE_VERSION) {
      blockers.push(`PRE_APPROVAL_GATE_VERSION_MISMATCH:${preApprovalGate.summary?.preApprovalGateVersion ?? ''}`);
    }
    if (preApprovalGate.summary?.productionWriteAllowed !== false) {
      blockers.push('PRE_APPROVAL_GATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
    }
    if (preApprovalGate.summary?.writesSourceInput !== false) {
      blockers.push('PRE_APPROVAL_GATE_WRITES_SOURCE_INPUT_NOT_FALSE');
    }
    if (preApprovalGate.summary?.writesProductionData !== false) {
      blockers.push('PRE_APPROVAL_GATE_WRITES_PRODUCTION_DATA_NOT_FALSE');
    }
  }
  if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  if (sourceInput.packageVersion !== SOURCE_INPUT_VERSION) {
    blockers.push(`SOURCE_INPUT_PACKAGE_VERSION_MISMATCH:${sourceInput.packageVersion ?? ''}`);
  }
  if (template.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
  if (sourceInput.targetBatchId !== TARGET_BATCH_ID) blockers.push(`SOURCE_INPUT_BATCH_MISMATCH:${sourceInput.targetBatchId ?? ''}`);
  if (readiness.summary?.productionWriteAllowed !== false) blockers.push('READINESS_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (entryBrief.summary?.productionWriteAllowed !== false) blockers.push('ENTRY_BRIEF_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (sourceInput.productionWriteAllowed !== false) blockers.push('SOURCE_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

  const preApprovalStatus = preApprovalGate?.summary?.status ?? 'missing';
  const preApprovalReady = preApprovalGate?.summary?.status === 'ready-for-source-copy-dry-run'
    && preApprovalGate?.summary?.readyForSourceCopyDryRun === true;
  const sameStringSet = (left, right) => {
    const leftValues = [...new Set(left ?? [])].sort().join(' ');
    const rightValues = [...new Set(right ?? [])].sort().join(' ');
    return leftValues === rightValues;
  };

  if (preApprovalGate) {
    if (preApprovalGate.summary?.readinessStatus !== readiness.summary?.status) {
      blockers.push(`T3V_PRE_APPROVAL_READINESS_STATUS_MISMATCH:${preApprovalGate.summary?.readinessStatus ?? ''}:${readiness.summary?.status ?? ''}`);
    }
    if ((preApprovalGate.summary?.approvedRows ?? 0) !== (readiness.summary?.approvedRows ?? 0)) {
      blockers.push(`T3V_PRE_APPROVAL_APPROVED_ROWS_MISMATCH:${preApprovalGate.summary?.approvedRows ?? 0}:${readiness.summary?.approvedRows ?? 0}`);
    }
    if (preApprovalGate.summary?.readyForSourceCopyDryRun !== (readiness.summary?.readyForT3VSourceCopyDryRun === true)) {
      blockers.push('T3V_PRE_APPROVAL_READY_STATE_MISMATCH');
    }
    if (!sameStringSet(preApprovalGate.summary?.focusGroups, FOCUS_GROUPS)) blockers.push('T3V_PRE_APPROVAL_FOCUS_GROUPS_MISMATCH');
    if (!sameStringSet(preApprovalGate.summary?.sourceTargetBlocks, SOURCE_TARGET_BLOCKS)) {
      blockers.push('T3V_PRE_APPROVAL_SOURCE_TARGET_BLOCKS_MISMATCH');
    }
    if (!sameStringSet(preApprovalGate.summary?.sharedBlocks, SHARED_BLOCKS)) {
      blockers.push('T3V_PRE_APPROVAL_SHARED_BLOCKS_MISMATCH');
    }
    if (preApprovalGate.summary?.status === 'blocked' || preApprovalGate.summary?.status === 'blocked-partial-approval') {
      blockers.push(`T3V_PRE_APPROVAL_GATE_BLOCKED:${preApprovalGate.summary.status}`);
    }
    if ((readiness.summary?.approvedRows ?? 0) > 0 && !preApprovalReady) {
      blockers.push(`T3V_PRE_APPROVAL_GATE_NOT_READY:${preApprovalStatus}`);
    }
  }

  const focusGroupSet = new Set(FOCUS_GROUPS);
  const sourceTargetSet = new Set(SOURCE_TARGET_BLOCKS);
  const templateRows = (template.corrections ?? []).filter((row) => focusGroupSet.has(row.groupId));
  const sourceRows = Array.isArray(sourceInput.corrections) ? sourceInput.corrections : [];
  const sourceRowsByBlock = new Map(sourceRows.map((row) => [row.block, row]));
  const approvedTemplateRows = templateRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  const approvedRowsByBlock = new Map();

  SOURCE_TARGET_BLOCKS.forEach((block) => {
    if (!sourceRowsByBlock.has(block)) blockers.push(`T3V_SOURCE_INPUT_TARGET_ROW_MISSING:${block}`);
  });

  FOCUS_GROUPS.forEach((groupId) => {
    const group = (readiness.groups ?? []).find((row) => row.groupId === groupId);
    if (!group) blockers.push(`T3V_READINESS_GROUP_MISSING:${groupId}`);
  });

  const duplicateApprovedBlockMismatches = [];
  const approvedRowsGroupedByBlock = new Map();
  approvedTemplateRows.forEach((row) => {
    const rows = approvedRowsGroupedByBlock.get(row.block) ?? [];
    rows.push(row);
    approvedRowsGroupedByBlock.set(row.block, rows);
  });

  approvedRowsGroupedByBlock.forEach((rows, block) => {
    if (rows.length < 2) {
      approvedRowsByBlock.set(block, rows[0]);
      return;
    }
    const uniquePaths = new Set(rows.map((row) => normalizePath(row.correctedPath)).filter(Boolean));
    const uniqueLabels = new Set(rows.map(normalizeLabel).filter((label) => label !== ','));
    if (uniquePaths.size > 1 || uniqueLabels.size > 1) {
      duplicateApprovedBlockMismatches.push(`DUPLICATE_APPROVED_BLOCK_COPY_FIELDS_MISMATCH:${block}`);
      return;
    }
    approvedRowsByBlock.set(block, rows[0]);
  });
  blockers.push(...duplicateApprovedBlockMismatches);

  if (readiness.summary?.status === 'blocked' || readiness.summary?.status === 'blocked-partial-t3-v-approval') {
    blockers.push(`T3V_READINESS_BLOCKED:${readiness.summary.status}`);
  }
  if (readiness.summary?.readyForT3VSourceCopyDryRun !== true) {
    warnings.push(`T3V_SOURCE_COPY_DRY_RUN_WAITING_FOR_READY_READINESS:${readiness.summary?.status ?? ''}`);
  }
  if ((readiness.summary?.approvedRows ?? 0) === 0) warnings.push('T3V_SOURCE_COPY_DRY_RUN_HAS_NO_APPROVED_ROWS');
  if (preApprovalGate && !preApprovalReady) warnings.push(`T3V_SOURCE_COPY_DRY_RUN_WAITING_FOR_PRE_APPROVAL_GATE:${preApprovalStatus}`);
  if (entryBrief.summary?.status === 'blocked') blockers.push('T3V_ENTRY_BRIEF_BLOCKED');

  const readyForDryRun = blockers.length === 0
    && readiness.summary?.readyForT3VSourceCopyDryRun === true
    && preApprovalReady;
  const sourceTargetRows = SOURCE_TARGET_BLOCKS.map((block) => {
    const sourceRow = sourceRowsByBlock.get(block);
    const templateRow = approvedRowsByBlock.get(block);
    const copiedFields = templateRow ? normalizeCopyFields(templateRow) : null;
    const plannedForSourceCopy = Boolean(readyForDryRun && sourceRow && templateRow);
    return {
      block,
      blockId: sourceRow?.blockId ?? templateRow?.blockId ?? '',
      sourceInputMatched: Boolean(sourceRow),
      approvedInTemplate: Boolean(templateRow),
      sharedBlock: SHARED_BLOCKS.includes(block),
      plannedForSourceCopy,
      wouldChange: plannedForSourceCopy ? rowChanged(sourceRow, copiedFields) : false,
      copiedFields: plannedForSourceCopy ? COPY_FIELDS : [],
      reasons: [
        ...(!sourceRow ? ['SOURCE_INPUT_ROW_MISSING'] : []),
        ...(!templateRow ? ['APPROVED_TEMPLATE_ROW_MISSING'] : []),
        ...(readyForDryRun ? [] : [`READINESS_NOT_READY:${readiness.summary?.status ?? ''}`]),
        ...(readyForDryRun ? [] : [`PRE_APPROVAL_GATE_NOT_READY:${preApprovalStatus}`]),
      ],
    };
  });

  const contextRows = templateRows
    .filter((row) => !sourceTargetSet.has(row.block))
    .map((row) => ({
      templateRowId: row.templateRowId,
      groupId: row.groupId,
      block: row.block,
      blockRole: row.blockRole,
      approved: normalizeDecision(row.operatorDecision) === 'APPROVED',
      sharedBlock: SHARED_BLOCKS.includes(row.block),
      sourceInputMatched: sourceRowsByBlock.has(row.block),
      sourceCopyRole: 'context-only-gate-row',
    }));

  const plannedRows = sourceTargetRows.filter((row) => row.plannedForSourceCopy);
  const status = blockers.length > 0
    ? 'blocked'
    : readyForDryRun
      ? 'ready-for-t3-v-source-copy'
      : (readiness.summary?.approvedRows ?? 0) > 0
        ? 'waiting-for-complete-t3-v-approval'
        : 'waiting-for-t3-v-operator-entry';

  const summary = {
    dryRunVersion: DRY_RUN_VERSION,
    status,
    readinessStatus: readiness.summary?.status ?? '',
    entryBriefStatus: entryBrief.summary?.status ?? '',
    preApprovalGateStatus: preApprovalStatus,
    targetBatchId: TARGET_BATCH_ID,
    focusGroups: FOCUS_GROUPS,
    sourceTargetBlocks: SOURCE_TARGET_BLOCKS,
    sharedBlocks: SHARED_BLOCKS,
    totalTemplateRows: templateRows.length,
    approvedTemplateRows: approvedTemplateRows.length,
    plannedSourceRows: plannedRows.length,
    wouldChangeRows: plannedRows.filter((row) => row.wouldChange).length,
    contextOnlyRows: contextRows.length,
    readyForT3VSourceCopyDryRun: readiness.summary?.readyForT3VSourceCopyDryRun === true,
    preApprovalGateReadyForSourceCopyDryRun: preApprovalReady,
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesSourceInput: false,
    writesOperatorDecision: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      readiness: path.relative(frontendRoot, readinessPath),
      entryBrief: path.relative(frontendRoot, entryBriefPath),
      preApprovalGate: path.relative(frontendRoot, preApprovalGatePath),
      template: path.relative(frontendRoot, templatePath),
      templateSha256,
      sourceInput: path.relative(frontendRoot, sourceInputPath),
      sourceInputSha256,
    },
    safetyContract: [
      'This T3/V source-copy dry-run is read-only.',
      'It never writes source input.',
      'It never writes operatorDecision or corrected fields.',
      'It never writes the main corrections template.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'It requires the T3/V pre-approval gate before planning any source-copy row.',
      'It plans only P1 source-input target blocks T3-2, V1, V2, and V3.',
      'Context rows such as T3-3, T3-4, T3-1, TC-1, TC-2, and TC-3 remain gate-only rows unless they already exist in source input.',
      'Duplicate approved rows for shared blocks must keep correctedPath and correctedLabelX/Y identical before any future source-copy path can be considered.',
    ],
    rows: sourceTargetRows,
    contextRows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-source-copy-dry-run.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-source-copy-dry-run.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-source-copy-dry-run.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    ['block', 'sourceInputMatched', 'approvedInTemplate', 'sharedBlock', 'plannedForSourceCopy', 'wouldChange', 'copiedFields', 'reasons'],
    ...sourceTargetRows.map((row) => [
      row.block,
      row.sourceInputMatched,
      row.approvedInTemplate,
      row.sharedBlock,
      row.plannedForSourceCopy,
      row.wouldChange,
      row.copiedFields.join(' '),
      row.reasons.join(' '),
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T3/V Source Copy Dry Run',
    '',
    `- dry run version: \`${DRY_RUN_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- readiness status: \`${summary.readinessStatus || 'none'}\``,
    `- entry brief status: \`${summary.entryBriefStatus || 'none'}\``,
    `- pre-approval gate status: \`${summary.preApprovalGateStatus || 'none'}\``,
    `- source target blocks: ${summary.sourceTargetBlocks.map((block) => `\`${block}\``).join(', ')}`,
    `- approved template rows: ${summary.approvedTemplateRows}/${summary.totalTemplateRows}`,
    `- planned source rows: ${summary.plannedSourceRows}`,
    `- would change rows: ${summary.wouldChangeRows}`,
    `- context-only rows: ${summary.contextOnlyRows}`,
    `- pre-approval gate ready: ${summary.preApprovalGateReadyForSourceCopyDryRun}`,
    `- writes source input: ${summary.writesSourceInput}`,
    `- writes production data: ${summary.writesProductionData}`,
    '',
    '## Source Target Rows',
    '',
    markdownTable(
      ['block', 'source matched', 'approved', 'shared', 'planned', 'would change', 'reasons'],
      sourceTargetRows.map((row) => [
        `\`${row.block}\``,
        String(row.sourceInputMatched),
        String(row.approvedInTemplate),
        String(row.sharedBlock),
        String(row.plannedForSourceCopy),
        String(row.wouldChange),
        row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Context Rows',
    '',
    markdownTable(
      ['template row', 'group', 'block', 'approved', 'shared', 'source copy role'],
      contextRows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.groupId}\``,
        `\`${row.block}\``,
        String(row.approved),
        String(row.sharedBlock),
        `\`${row.sourceCopyRole}\``,
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
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

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    plannedSourceRows: summary.plannedSourceRows,
    approvedTemplateRows: summary.approvedTemplateRows,
    readyForT3VSourceCopyDryRun: summary.readyForT3VSourceCopyDryRun,
    preApprovalGateReadyForSourceCopyDryRun: summary.preApprovalGateReadyForSourceCopyDryRun,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VSourceCopyRegression = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultOutputDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-t3-v-source-copy-regression');

  const REGRESSION_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_SOURCE_COPY_REGRESSION_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const SOURCE_SCOPE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_SOURCE_SCOPE_V1';
  const SOURCE_INPUT_VERSION = 'DAEGU_P1_OPERATOR_PACKAGE_V1';
  const IMAGE_DRAFT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_IMAGE_COORDINATE_DRAFT_V1';
  const ENTRY_BRIEF_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_OPERATOR_ENTRY_BRIEF_V1';
  const PRE_APPROVAL_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_PRE_APPROVAL_GATE_V1';
  const EVIDENCE_QUALITY_AUDIT_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_EVIDENCE_QUALITY_AUDIT_V1';
  const CASES = [
    'waiting-for-operator',
    't3-partial-approval',
    'v-partial-approval',
    'shared-block-path-label-mismatch',
    'pre-approval-gate-missing',
    'pre-approval-gate-waiting',
    'stale-approved-rows-mismatch',
    'full-t3-v-approval',
    'source-input-target-missing',
  ];
  const FOCUS_GROUP_IDS = ['P1_T3_TABLE_OWNERSHIP', 'P1_V_CENTER_TABLE_SPLIT'];
  const SOURCE_TARGET_BLOCKS = ['T3-2', 'V1', 'V2', 'V3'];
  const SHARED_BLOCKS = ['T3-2', 'T3-3'];

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

  const cloneJson = (value) => JSON.parse(JSON.stringify(value));

  const byTemplateRowId = (template) => new Map(template.corrections.map((row) => [row.templateRowId, row]));

  const fixturePath = (x, y, radius = 4) => {
    const left = Number(x) - radius;
    const right = Number(x) + radius;
    const top = Number(y) - radius;
    const bottom = Number(y) + radius;
    return `M ${left.toFixed(1)} ${top.toFixed(1)} L ${right.toFixed(1)} ${top.toFixed(1)} L ${right.toFixed(1)} ${bottom.toFixed(1)} L ${left.toFixed(1)} ${bottom.toFixed(1)} Z`;
  };

  const requireRow = (rows, templateRowId) => {
    const row = rows.get(templateRowId);
    if (!row) throw new Error(`Regression fixture row missing: ${templateRowId}`);
    return row;
  };

  const approveRow = (row, {
    correctedPath = fixturePath(Number(row.currentLabelX), Number(row.currentLabelY)),
    correctedLabelX = row.currentLabelX,
    correctedLabelY = row.currentLabelY,
    reviewer = 'T3_V_SOURCE_COPY_REGRESSION_FIXTURE',
    reviewedAt = '2026-05-16T00:00:00.000Z',
    operatorNote = 'Regression fixture only; do not source-copy.',
  } = {}) => {
    row.operatorDecision = 'APPROVED';
    row.correctedPath = correctedPath;
    row.correctedLabelX = String(correctedLabelX);
    row.correctedLabelY = String(correctedLabelY);
    row.reviewer = reviewer;
    row.reviewedAt = reviewedAt;
    row.operatorNote = operatorNote;
  };

  const approveFocusGroupsWithIndependentPaths = (template) => {
    const rows = byTemplateRowId(template);
    const sharedFixtures = new Map();
    FOCUS_GROUP_IDS.forEach((groupId) => {
      template.corrections
        .filter((row) => row.groupId === groupId)
        .forEach((row) => {
          if (SHARED_BLOCKS.includes(row.block)) {
            const fixture = sharedFixtures.get(row.block) ?? {
              correctedPath: fixturePath(Number(row.currentLabelX), Number(row.currentLabelY)),
              correctedLabelX: row.currentLabelX,
              correctedLabelY: row.currentLabelY,
            };
            sharedFixtures.set(row.block, fixture);
            approveRow(row, fixture);
            return;
          }
          approveRow(row);
        });
    });
    return rows;
  };

  const spawnNode = (scriptName, args, cwd = frontendRoot) => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', path.join(scriptDir, scriptName), ...args],
      {
        cwd,
        encoding: 'utf8',
      },
    );
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  };

  const runTemplateGate = (caseDir, templatePath, sourceScopePath) => spawnNode(
    'daegu-seatmap-p1-paired-ownership-template-gate.mjs',
    [
      '--template',
      templatePath,
      '--source-scope',
      sourceScopePath,
      '--output-dir',
      caseDir,
    ],
  );

  const runReadiness = (caseDir, templatePath, sourceScopePath, imageDraftPath) => spawnNode(
    'daegu-seatmap-p1-paired-ownership-t3-v-approval-readiness.mjs',
    [
      '--template-gate',
      path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-template-gate.json'),
      '--template',
      templatePath,
      '--source-scope',
      sourceScopePath,
      '--image-draft',
      imageDraftPath,
      '--output-dir',
      caseDir,
    ],
  );

  const runPreApprovalGate = (caseDir, readinessPath, entryBriefPath, evidenceAuditPath) => spawnNode(
    'daegu-seatmap-p1-paired-ownership-t3-v-pre-approval-gate.mjs',
    [
      '--readiness',
      readinessPath,
      '--template-gate',
      path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-template-gate.json'),
      '--entry-brief',
      entryBriefPath,
      '--evidence-audit',
      evidenceAuditPath,
      '--output-dir',
      caseDir,
    ],
  );

  const runSourceCopyDryRun = (caseDir, templatePath, sourceInputPath) => spawnNode(
    'daegu-seatmap-p1-paired-ownership-t3-v-source-copy-dry-run.mjs',
    [
      '--readiness',
      path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-readiness.json'),
      '--entry-brief',
      path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-operator-entry-brief.json'),
      '--pre-approval-gate',
      path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-pre-approval-gate.json'),
      '--template',
      templatePath,
      '--source-input',
      sourceInputPath,
      '--output-dir',
      caseDir,
    ],
  );

  const makeEntryBrief = (readinessReport) => ({
    generatedAt: new Date().toISOString(),
    summary: {
      briefVersion: ENTRY_BRIEF_VERSION,
      status: (readinessReport.summary?.approvedRows ?? 0) > 0
        ? 'operator-entry-in-progress'
        : 'waiting-for-t3-v-operator-entry',
      readinessStatus: readinessReport.summary?.status ?? '',
      focusGroups: FOCUS_GROUP_IDS,
      focusTargetBlocks: SOURCE_TARGET_BLOCKS,
      sharedBlocks: SHARED_BLOCKS,
      totalRows: readinessReport.summary?.totalRows ?? 0,
      targetRows: 5,
      sharedRows: 4,
      approvedRows: readinessReport.summary?.approvedRows ?? 0,
      readyForT3VSourceCopyDryRun: readinessReport.summary?.readyForT3VSourceCopyDryRun ?? false,
      productionWriteAllowed: false,
      sourceOfTruth: false,
      writesSourceInput: false,
      writesOperatorDecision: false,
      writesCorrectionsTemplate: false,
      writesProductionData: false,
      blockers: [],
      warnings: [],
    },
  });

  const makeEvidenceAudit = (readinessReport) => ({
    generatedAt: new Date().toISOString(),
    summary: {
      auditVersion: EVIDENCE_QUALITY_AUDIT_VERSION,
      status: 'operator-review-ready',
      imageBasedAnalysis: true,
      targetRows: SOURCE_TARGET_BLOCKS.length,
      uniqueTargetBlocks: SOURCE_TARGET_BLOCKS,
      duplicateTargetBlocks: ['T3-2'],
      minTargetColorCoverage: 1,
      maxTargetColorCoverage: 1,
      productionWriteAllowed: false,
      sourceOfTruth: false,
      writesSourceInput: false,
      writesOperatorDecision: false,
      writesCorrectionsTemplate: false,
      writesProductionData: false,
      blockers: [],
      warnings: [],
    },
    rows: (readinessReport.rows ?? [])
      .filter((row) => SOURCE_TARGET_BLOCKS.includes(row.block))
      .map((row) => ({
        templateRowId: row.templateRowId,
        groupId: row.groupId,
        block: row.block,
        targetColorCoverage: 1,
        rowBlockers: [],
        rowWarnings: [],
      })),
  });

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));
  const sourceTemplatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );
  const sourceScopePath = path.resolve(
    frontendRoot,
    argValue('--source-scope', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json')),
  );
  const sourceInputPath = path.resolve(
    frontendRoot,
    argValue('--source-input', path.join(p1ReportDir, 'daegu-seatmap-p1-operator-input.json')),
  );
  const imageDraftPath = path.resolve(
    frontendRoot,
    argValue(
      '--image-draft',
      path.join(
        p1ReportDir,
        'daegu-seatmap-p1-boundary-first-image-coordinate-draft/daegu-p1-boundary-first-image-coordinate-draft.json',
      ),
    ),
  );

  const blockers = [];
  const warnings = [];
  const sourceTemplate = await readJson(sourceTemplatePath);
  const sourceScope = await readJson(sourceScopePath);
  const sourceInput = await readJson(sourceInputPath);
  const imageDraft = await readJson(imageDraftPath);

  if (sourceTemplate.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${sourceTemplate.templateVersion ?? ''}`);
  if (sourceScope.summary?.sourceScopeVersion !== SOURCE_SCOPE_VERSION) {
    blockers.push(`SOURCE_SCOPE_VERSION_MISMATCH:${sourceScope.summary?.sourceScopeVersion ?? ''}`);
  }
  if (sourceInput.packageVersion !== SOURCE_INPUT_VERSION) {
    blockers.push(`SOURCE_INPUT_VERSION_MISMATCH:${sourceInput.packageVersion ?? ''}`);
  }
  if (imageDraft.draftVersion !== IMAGE_DRAFT_VERSION) blockers.push(`IMAGE_DRAFT_VERSION_MISMATCH:${imageDraft.draftVersion ?? ''}`);
  if (sourceTemplate.productionWriteAllowed !== false) blockers.push('SOURCE_TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (sourceScope.summary?.productionWriteAllowed !== false) blockers.push('SOURCE_SCOPE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (sourceInput.productionWriteAllowed !== false) blockers.push('SOURCE_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (imageDraft.productionWriteAllowed !== false) blockers.push('IMAGE_DRAFT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (imageDraft.sourceOfTruth !== false) blockers.push('IMAGE_DRAFT_SOURCE_OF_TRUTH_NOT_FALSE');

  const makeCaseTemplate = (caseId) => {
    const template = cloneJson(sourceTemplate);
    const rows = byTemplateRowId(template);

    if (caseId === 'waiting-for-operator') return template;

    if (caseId === 't3-partial-approval') {
      approveRow(requireRow(rows, 'P1_T3_TABLE_OWNERSHIP:T3-2'));
      return template;
    }

    if (caseId === 'v-partial-approval') {
      approveRow(requireRow(rows, 'P1_V_CENTER_TABLE_SPLIT:V1'));
      return template;
    }

    approveFocusGroupsWithIndependentPaths(template);

    if (caseId === 'shared-block-path-label-mismatch') {
      approveRow(requireRow(rows, 'P1_T3_TABLE_OWNERSHIP:T3-2'), {
        correctedPath: 'M 950 1089 L 966 1089 L 966 1105 L 950 1105 Z',
        correctedLabelX: 958,
        correctedLabelY: 1097,
      });
      approveRow(requireRow(rows, 'P1_V_CENTER_TABLE_SPLIT:T3-2'), {
        correctedPath: 'M 978 1089 L 994 1089 L 994 1105 L 978 1105 Z',
        correctedLabelX: 986,
        correctedLabelY: 1097,
      });
      return template;
    }

    if ([
      'pre-approval-gate-missing',
      'pre-approval-gate-waiting',
      'stale-approved-rows-mismatch',
      'full-t3-v-approval',
      'source-input-target-missing',
    ].includes(caseId)) return template;

    throw new Error(`Unknown regression case: ${caseId}`);
  };

  const makeCaseSourceInput = (caseId) => {
    const input = cloneJson(sourceInput);
    if (caseId !== 'source-input-target-missing') return input;
    input.corrections = input.corrections.filter((row) => row.block !== 'V3');
    return input;
  };

  await fs.mkdir(outputDir, { recursive: true });

  const caseResults = [];
  if (blockers.length === 0) {
    for (const caseId of CASES) {
      const caseDir = path.join(outputDir, caseId);
      await fs.mkdir(caseDir, { recursive: true });
      const fixtureTemplate = makeCaseTemplate(caseId);
      const fixtureSourceInput = makeCaseSourceInput(caseId);
      const fixtureTemplatePath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json');
      const fixtureSourceScopePath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json');
      const fixtureSourceInputPath = path.join(caseDir, 'daegu-seatmap-p1-operator-input.json');
      const fixtureEntryBriefPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-operator-entry-brief.json');
      const fixtureEvidenceAuditPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-evidence-quality-audit.json');
      const preApprovalGatePath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-pre-approval-gate.json');
      await fs.writeFile(fixtureTemplatePath, `${JSON.stringify(fixtureTemplate, null, 2)}\n`, 'utf8');
      await fs.writeFile(fixtureSourceScopePath, `${JSON.stringify(sourceScope, null, 2)}\n`, 'utf8');
      await fs.writeFile(fixtureSourceInputPath, `${JSON.stringify(fixtureSourceInput, null, 2)}\n`, 'utf8');

      const templateGateCommand = runTemplateGate(caseDir, fixtureTemplatePath, fixtureSourceScopePath);
      const readinessCommand = runReadiness(caseDir, fixtureTemplatePath, fixtureSourceScopePath, imageDraftPath);
      const readinessReportPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-readiness.json');
      const readinessReport = await readJson(readinessReportPath);
      await fs.writeFile(fixtureEntryBriefPath, `${JSON.stringify(makeEntryBrief(readinessReport), null, 2)}\n`, 'utf8');
      await fs.writeFile(fixtureEvidenceAuditPath, `${JSON.stringify(makeEvidenceAudit(readinessReport), null, 2)}\n`, 'utf8');
      const preApprovalGateCommand = caseId === 'pre-approval-gate-missing'
        ? { exitCode: 0, stdout: '', stderr: '' }
        : runPreApprovalGate(caseDir, readinessReportPath, fixtureEntryBriefPath, fixtureEvidenceAuditPath);
      let preApprovalGateReport = null;
      if (caseId !== 'pre-approval-gate-missing') {
        preApprovalGateReport = await readJson(preApprovalGatePath);
        if (caseId === 'pre-approval-gate-waiting') {
          preApprovalGateReport.summary.status = 'waiting-for-operator';
          preApprovalGateReport.summary.readyForSourceCopyDryRun = false;
          preApprovalGateReport.summary.readyRows = 0;
          await fs.writeFile(preApprovalGatePath, `${JSON.stringify(preApprovalGateReport, null, 2)}\n`, 'utf8');
        }
        if (caseId === 'stale-approved-rows-mismatch') {
          preApprovalGateReport.summary.approvedRows = 0;
          await fs.writeFile(preApprovalGatePath, `${JSON.stringify(preApprovalGateReport, null, 2)}\n`, 'utf8');
        }
      }
      const dryRunCommand = runSourceCopyDryRun(caseDir, fixtureTemplatePath, fixtureSourceInputPath);
      const dryRunReportPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-source-copy-dry-run.json');
      const dryRunReport = await readJson(dryRunReportPath);
      const reasons = [
        ...(readinessReport.summary?.blockers ?? []),
        ...(readinessReport.summary?.warnings ?? []),
        ...(dryRunReport.summary?.blockers ?? []),
        ...(dryRunReport.summary?.warnings ?? []),
        ...(preApprovalGateReport?.summary?.blockers ?? []),
        ...(preApprovalGateReport?.summary?.warnings ?? []),
        ...(readinessReport.groups ?? []).flatMap((group) => [
          group.partialApproval ? `GROUP_PARTIAL:${group.groupId}` : '',
        ].filter(Boolean)),
        ...(readinessReport.rows ?? []).flatMap((row) => [
          ...(row.reasons ?? []),
          ...(row.warnings ?? []),
        ]),
        ...(dryRunReport.rows ?? []).flatMap((row) => row.reasons ?? []),
      ];

      caseResults.push({
        caseId,
        templateGateExitCode: templateGateCommand.exitCode,
        readinessExitCode: readinessCommand.exitCode,
        preApprovalGateExitCode: preApprovalGateCommand.exitCode,
        dryRunExitCode: dryRunCommand.exitCode,
        readinessStatus: readinessReport.summary?.status ?? '',
        preApprovalGateStatus: preApprovalGateReport?.summary?.status ?? 'missing',
        dryRunStatus: dryRunReport.summary?.status ?? '',
        approvedRows: readinessReport.summary?.approvedRows ?? 0,
        plannedSourceRows: dryRunReport.summary?.plannedSourceRows ?? 0,
        contextOnlyRows: dryRunReport.summary?.contextOnlyRows ?? 0,
        writesSourceInput: dryRunReport.summary?.writesSourceInput ?? true,
        writesProductionData: dryRunReport.summary?.writesProductionData ?? true,
        readyForT3VSourceCopyDryRun: readinessReport.summary?.readyForT3VSourceCopyDryRun ?? false,
        preApprovalGateReadyForSourceCopyDryRun: dryRunReport.summary?.preApprovalGateReadyForSourceCopyDryRun ?? false,
        reasons,
        template: path.relative(frontendRoot, fixtureTemplatePath),
        sourceInput: path.relative(frontendRoot, fixtureSourceInputPath),
        readinessReport: path.relative(frontendRoot, readinessReportPath),
        preApprovalGateReport: caseId === 'pre-approval-gate-missing'
          ? ''
          : path.relative(frontendRoot, preApprovalGatePath),
        dryRunReport: path.relative(frontendRoot, dryRunReportPath),
      });
    }
  }

  const expectedCaseContracts = {
    'waiting-for-operator': {
      dryRunStatus: 'waiting-for-t3-v-operator-entry',
      plannedSourceRows: 0,
      reasons: ['T3V_SOURCE_COPY_DRY_RUN_HAS_NO_APPROVED_ROWS'],
    },
    't3-partial-approval': {
      dryRunStatus: 'blocked',
      reasons: ['T3V_READINESS_BLOCKED:blocked-partial-t3-v-approval', 'T3V_PARTIAL_APPROVAL_BLOCKED:P1_T3_TABLE_OWNERSHIP'],
    },
    'v-partial-approval': {
      dryRunStatus: 'blocked',
      reasons: ['T3V_READINESS_BLOCKED:blocked-partial-t3-v-approval', 'T3V_PARTIAL_APPROVAL_BLOCKED:P1_V_CENTER_TABLE_SPLIT'],
    },
    'shared-block-path-label-mismatch': {
      dryRunStatus: 'blocked',
      reasons: [
        'T3V_READINESS_BLOCKED:blocked',
        'T3V_SHARED_BLOCK_CORRECTED_PATH_MISMATCH:T3-2',
        'T3V_SHARED_BLOCK_CORRECTED_LABEL_MISMATCH:T3-2',
        'DUPLICATE_APPROVED_BLOCK_COPY_FIELDS_MISMATCH:T3-2',
      ],
    },
    'pre-approval-gate-missing': {
      dryRunStatus: 'blocked',
      plannedSourceRows: 0,
      reasons: ['T3V_PRE_APPROVAL_GATE_MISSING'],
    },
    'pre-approval-gate-waiting': {
      dryRunStatus: 'blocked',
      plannedSourceRows: 0,
      reasons: ['T3V_PRE_APPROVAL_GATE_NOT_READY:waiting-for-operator'],
    },
    'stale-approved-rows-mismatch': {
      dryRunStatus: 'blocked',
      plannedSourceRows: 0,
      reasons: ['T3V_PRE_APPROVAL_APPROVED_ROWS_MISMATCH:0:12'],
    },
    'full-t3-v-approval': {
      dryRunStatus: 'ready-for-t3-v-source-copy',
      plannedSourceRows: 4,
      contextOnlyRows: 7,
      reasons: [],
    },
    'source-input-target-missing': {
      dryRunStatus: 'blocked',
      reasons: ['T3V_SOURCE_INPUT_TARGET_ROW_MISSING:V3', 'SOURCE_INPUT_ROW_MISSING'],
    },
  };

  caseResults.forEach((result) => {
    const expected = expectedCaseContracts[result.caseId];
    if (!expected) {
      blockers.push(`REGRESSION_EXPECTATION_MISSING:${result.caseId}`);
      return;
    }
    if (result.dryRunStatus !== expected.dryRunStatus) {
      blockers.push(`REGRESSION_DRY_RUN_STATUS_MISMATCH:${result.caseId}:${result.dryRunStatus}:${expected.dryRunStatus}`);
    }
    if (typeof expected.plannedSourceRows === 'number' && result.plannedSourceRows !== expected.plannedSourceRows) {
      blockers.push(`REGRESSION_PLANNED_SOURCE_ROWS_MISMATCH:${result.caseId}:${result.plannedSourceRows}:${expected.plannedSourceRows}`);
    }
    if (typeof expected.contextOnlyRows === 'number' && result.contextOnlyRows !== expected.contextOnlyRows) {
      blockers.push(`REGRESSION_CONTEXT_ONLY_ROWS_MISMATCH:${result.caseId}:${result.contextOnlyRows}:${expected.contextOnlyRows}`);
    }
    if (result.writesSourceInput !== false) blockers.push(`REGRESSION_WRITES_SOURCE_INPUT:${result.caseId}`);
    if (result.writesProductionData !== false) blockers.push(`REGRESSION_WRITES_PRODUCTION_DATA:${result.caseId}`);
    (expected.reasons ?? []).forEach((contract) => {
      if (!result.reasons.some((reason) => String(reason).includes(contract))) {
        blockers.push(`REGRESSION_REASON_MISSING:${result.caseId}:${contract}`);
      }
    });
  });

  const summary = {
    regressionVersion: REGRESSION_VERSION,
    dryRunVersion: 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_SOURCE_COPY_DRY_RUN_V1',
    status: blockers.length > 0 ? 'blocked' : 'passed',
    sourceTemplate: path.relative(frontendRoot, sourceTemplatePath),
    sourceScope: path.relative(frontendRoot, sourceScopePath),
    sourceInput: path.relative(frontendRoot, sourceInputPath),
    imageDraft: path.relative(frontendRoot, imageDraftPath),
    totalCases: caseResults.length,
    passedCases: blockers.length > 0 ? 0 : caseResults.length,
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
    expectedCaseContracts,
    safetyContract: [
      'This regression script writes only fixture/report files under reports/stadium/daegu-p1-paired-ownership-t3-v-source-copy-regression.',
      'It never writes the production paired ownership operator template.',
      'It never writes source input.',
      'It never writes src/data/daeguSeatData.ts.',
      'Fixture approvals are synthetic and must not be copied into operator input.',
      'The full approval fixture is synthetic and exists only to verify that planned source rows are exactly T3-2, V1, V2, and V3.',
      'Context-only rows must remain excluded from planned source-copy rows.',
      'Source-copy dry-run must remain blocked when the T3/V pre-approval gate is missing, waiting, partial, or stale.',
    ],
    cases: caseResults,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-source-copy-regression.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-source-copy-regression.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-source-copy-regression.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'caseId',
      'readinessStatus',
      'preApprovalGateStatus',
      'dryRunStatus',
      'approvedRows',
      'plannedSourceRows',
      'contextOnlyRows',
      'preApprovalGateReadyForSourceCopyDryRun',
      'writesSourceInput',
      'writesProductionData',
      'reasons',
      'dryRunReport',
    ],
    ...caseResults.map((result) => [
      result.caseId,
      result.readinessStatus,
      result.preApprovalGateStatus,
      result.dryRunStatus,
      result.approvedRows,
      result.plannedSourceRows,
      result.contextOnlyRows,
      result.preApprovalGateReadyForSourceCopyDryRun,
      result.writesSourceInput,
      result.writesProductionData,
      result.reasons.join('; '),
      result.dryRunReport,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T3/V Source Copy Regression',
    '',
    `- regression version: \`${REGRESSION_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- total cases: ${summary.totalCases}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- writes source input: ${summary.writesSourceInput}`,
    '',
    '## Cases',
    '',
    markdownTable(
      ['case', 'readiness', 'pre-approval', 'dry-run', 'approved', 'planned source rows', 'context-only', 'gate ready', 'writes source', 'reasons', 'report'],
      caseResults.map((result) => [
        `\`${result.caseId}\``,
        `\`${result.readinessStatus}\``,
        `\`${result.preApprovalGateStatus}\``,
        `\`${result.dryRunStatus}\``,
        result.approvedRows,
        result.plannedSourceRows,
        result.contextOnlyRows,
        String(result.preApprovalGateReadyForSourceCopyDryRun),
        String(result.writesSourceInput),
        result.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
        `[\`json\`](${path.relative(outputDir, path.join(frontendRoot, result.dryRunReport))})`,
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    totalCases: summary.totalCases,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VTargetEntryGateRegression = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultOutputDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-t3-v-target-entry-gate-regression');

  const REGRESSION_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_GATE_REGRESSION_V1';
  const TARGET_ENTRY_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_GATE_V1';
  const TARGET_ENTRY_TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_TEMPLATE_V1';
  const TARGET_REVIEW_PACKET_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_REVIEW_PACKET_V1';
  const TARGET_ROWS = [
    'P1_T3_TABLE_OWNERSHIP:T3-2',
    'P1_V_CENTER_TABLE_SPLIT:V1',
    'P1_V_CENTER_TABLE_SPLIT:V2',
    'P1_V_CENTER_TABLE_SPLIT:V3',
    'P1_V_CENTER_TABLE_SPLIT:T3-2',
  ];
  const CASES = [
    'waiting-for-operator',
    'partial-v-approval',
    't3-duplicate-partial',
    't3-duplicate-mismatch',
    'invalid-path',
    'area-delta-warning',
    'valid-target-preview',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const cloneJson = (value) => JSON.parse(JSON.stringify(value));

  const byTemplateRowId = (rows) => new Map(rows.map((row) => [row.templateRowId, row]));

  const shiftedPath = (pathData, dx) => String(pathData ?? '').replace(/-?\d+(?:\.\d+)?/g, (token, offset, source) => {
    const previousCommand = source.slice(0, offset).match(/[MLZ]\s*$/i);
    const value = Number(token);
    if (!Number.isFinite(value) || !previousCommand) return token;
    return String(Number((value + dx).toFixed(1)));
  });

  const tinyBoxPath = ([x, y], size = 2) => {
    const left = Number((Number(x) - size).toFixed(1));
    const top = Number((Number(y) - size).toFixed(1));
    const right = Number((Number(x) + size).toFixed(1));
    const bottom = Number((Number(y) + size).toFixed(1));
    return `M ${left} ${top} L ${right} ${top} L ${right} ${bottom} L ${left} ${bottom} Z`;
  };

  const applyApprovedFixture = (entryRow, packetRowsByTemplateRowId, overrides = {}) => {
    const packetRow = packetRowsByTemplateRowId.get(entryRow.templateRowId);
    if (!packetRow) throw new Error(`Packet row missing for fixture: ${entryRow.templateRowId}`);
    const [labelX, labelY] = packetRow.draftLabelPoint ?? packetRow.currentLabelPoint ?? [];
    entryRow.operatorDecision = 'APPROVED';
    entryRow.correctedPath = overrides.correctedPath ?? packetRow.draftPath;
    entryRow.correctedLabelX = String(overrides.correctedLabelX ?? labelX);
    entryRow.correctedLabelY = String(overrides.correctedLabelY ?? labelY);
    entryRow.reviewer = overrides.reviewer ?? 'T3_V_TARGET_ENTRY_GATE_REGRESSION_FIXTURE';
    entryRow.reviewedAt = overrides.reviewedAt ?? '2026-05-16T00:00:00.000Z';
    entryRow.operatorNote = overrides.operatorNote ?? 'Regression fixture only; do not source-copy.';
  };

  const applyCase = (caseName, targetEntry, targetReviewPacket) => {
    const rows = byTemplateRowId(targetEntry.rows);
    const packetRows = byTemplateRowId(targetReviewPacket.targetRows);
    const approve = (templateRowId, overrides = {}) => applyApprovedFixture(rows.get(templateRowId), packetRows, overrides);

    if (caseName === 'waiting-for-operator') return;
    if (caseName === 'partial-v-approval') {
      approve('P1_V_CENTER_TABLE_SPLIT:V1');
      return;
    }
    if (caseName === 't3-duplicate-partial') {
      approve('P1_T3_TABLE_OWNERSHIP:T3-2');
      return;
    }
    if (caseName === 't3-duplicate-mismatch') {
      approve('P1_T3_TABLE_OWNERSHIP:T3-2');
      const packetRow = packetRows.get('P1_V_CENTER_TABLE_SPLIT:T3-2');
      approve('P1_V_CENTER_TABLE_SPLIT:T3-2', {
        correctedPath: shiftedPath(packetRow.draftPath, 11),
        correctedLabelX: Number(packetRow.draftLabelPoint?.[0] ?? 0) + 11,
        correctedLabelY: packetRow.draftLabelPoint?.[1],
      });
      return;
    }
    if (caseName === 'invalid-path') {
      approve('P1_V_CENTER_TABLE_SPLIT:V1', {
        correctedPath: 'M 820 1040 L 850 1070 L 820 1070 L 850 1040 Z',
        correctedLabelX: 835,
        correctedLabelY: 1055,
      });
      return;
    }
    if (caseName === 'area-delta-warning') {
      const packetRow = packetRows.get('P1_V_CENTER_TABLE_SPLIT:V1');
      const labelPoint = packetRow.draftLabelPoint ?? packetRow.currentLabelPoint;
      approve('P1_V_CENTER_TABLE_SPLIT:V1', {
        correctedPath: tinyBoxPath(labelPoint),
        correctedLabelX: labelPoint[0],
        correctedLabelY: labelPoint[1],
      });
      return;
    }
    if (caseName === 'valid-target-preview') {
      TARGET_ROWS.forEach((templateRowId) => approve(templateRowId));
      const t3TableRow = rows.get('P1_T3_TABLE_OWNERSHIP:T3-2');
      const t3VRow = rows.get('P1_V_CENTER_TABLE_SPLIT:T3-2');
      t3VRow.correctedPath = t3TableRow.correctedPath;
      t3VRow.correctedLabelX = t3TableRow.correctedLabelX;
      t3VRow.correctedLabelY = t3TableRow.correctedLabelY;
      return;
    }
    throw new Error(`Unknown target entry gate regression case: ${caseName}`);
  };

  const expected = {
    'waiting-for-operator': {
      exitCode: 0,
      status: 'waiting-for-operator',
      approvedRows: 0,
      previewWritten: false,
      readyForTemplateImportDryRun: false,
      requiredWarnings: ['T3V_TARGET_ENTRY_HAS_NO_APPROVED_ROWS'],
    },
    'partial-v-approval': {
      exitCode: 0,
      status: 'ready-for-template-import-dry-run',
      approvedRows: 1,
      previewWritten: true,
      readyForTemplateImportDryRun: true,
      requiredSourceCopyBlockers: [
        'T3V_TARGET_V_PARTIAL_APPROVAL_SOURCE_COPY_BLOCKED:1:3',
        'T3V_TARGET_PARTIAL_APPROVAL_SOURCE_COPY_BLOCKED:1:5',
        'T3V_CONTEXT_ONLY_ROWS_STILL_REQUIRED:7',
      ],
    },
    't3-duplicate-partial': {
      exitCode: 1,
      status: 'blocked',
      approvedRows: 1,
      previewWritten: false,
      requiredBlockers: ['T3V_TARGET_DUPLICATE_PARTIAL_APPROVAL_BLOCKED:T3-2'],
    },
    't3-duplicate-mismatch': {
      exitCode: 1,
      status: 'blocked',
      approvedRows: 2,
      previewWritten: false,
      requiredBlockers: [
        'T3V_TARGET_DUPLICATE_PATH_MISMATCH:T3-2',
        'T3V_TARGET_DUPLICATE_LABEL_MISMATCH:T3-2',
      ],
    },
    'invalid-path': {
      exitCode: 1,
      status: 'blocked',
      approvedRows: 1,
      previewWritten: false,
      requiredBlockers: ['T3V_TARGET_ENTRY_INVALID_ROWS:P1_V_CENTER_TABLE_SPLIT:V1'],
      requiredRowReasons: ['T3V_TARGET_SELF_INTERSECTION'],
    },
    'area-delta-warning': {
      exitCode: 0,
      status: 'ready-for-template-import-dry-run',
      approvedRows: 1,
      previewWritten: true,
      readyForTemplateImportDryRun: true,
      requiredSourceCopyBlockers: [
        'T3V_TARGET_V_PARTIAL_APPROVAL_SOURCE_COPY_BLOCKED:1:3',
        'T3V_TARGET_PARTIAL_APPROVAL_SOURCE_COPY_BLOCKED:1:5',
        'T3V_CONTEXT_ONLY_ROWS_STILL_REQUIRED:7',
      ],
      requiredRowWarningPrefixes: ['T3V_TARGET_CORRECTED_AREA_DELTA_REVIEW:'],
    },
    'valid-target-preview': {
      exitCode: 0,
      status: 'ready-for-template-import-dry-run',
      approvedRows: 5,
      previewWritten: true,
      readyForTemplateImportDryRun: true,
      requiredSourceCopyBlockers: ['T3V_CONTEXT_ONLY_ROWS_STILL_REQUIRED:7'],
    },
  };

  const spawnNode = (scriptName, args) => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', path.join(scriptDir, scriptName), ...args],
      { cwd: frontendRoot, encoding: 'utf8' },
    );
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  };

  const includesAll = (actualValues, expectedValues = []) => expectedValues.every((expectedValue) => (
    (actualValues ?? []).includes(expectedValue)
  ));

  const includesAllPrefixes = (actualValues, expectedPrefixes = []) => expectedPrefixes.every((expectedPrefix) => (
    (actualValues ?? []).some((actualValue) => String(actualValue).startsWith(expectedPrefix))
  ));

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));
  const sourceTargetEntryPath = path.resolve(
    frontendRoot,
    argValue('--target-entry', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.json')),
  );
  const sourceTargetReviewPacketPath = path.resolve(
    frontendRoot,
    argValue('--target-review-packet', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.json')),
  );
  const sourcePairedTemplatePath = path.resolve(
    frontendRoot,
    argValue('--paired-template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );

  const sourceTargetEntry = await readJson(sourceTargetEntryPath);
  const sourceTargetReviewPacket = await readJson(sourceTargetReviewPacketPath);
  const sourcePairedTemplate = await readJson(sourcePairedTemplatePath);

  if (sourceTargetEntry.targetEntryTemplateVersion !== TARGET_ENTRY_TEMPLATE_VERSION) {
    throw new Error(`Target entry template version mismatch: ${sourceTargetEntry.targetEntryTemplateVersion ?? ''}`);
  }
  if (sourceTargetReviewPacket.summary?.packetVersion !== TARGET_REVIEW_PACKET_VERSION) {
    throw new Error(`Target review packet version mismatch: ${sourceTargetReviewPacket.summary?.packetVersion ?? ''}`);
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const caseResults = [];

  for (const caseName of CASES) {
    const caseDir = path.join(outputDir, caseName);
    const targetEntry = cloneJson(sourceTargetEntry);
    const targetReviewPacket = cloneJson(sourceTargetReviewPacket);
    const pairedTemplate = cloneJson(sourcePairedTemplate);
    applyCase(caseName, targetEntry, targetReviewPacket);

    const targetEntryPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.json');
    const targetReviewPacketPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.json');
    const pairedTemplatePath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json');
    await writeJson(targetEntryPath, targetEntry);
    await writeJson(targetReviewPacketPath, targetReviewPacket);
    await writeJson(pairedTemplatePath, pairedTemplate);

    const run = spawnNode('daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-target-entry-gate', 
      '--target-entry',
      targetEntryPath,
      '--target-review-packet',
      targetReviewPacketPath,
      '--paired-template',
      pairedTemplatePath,
      '--output-dir',
      caseDir,
    ]);
    const gateReportPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate.json');
    const gateReport = await readJson(gateReportPath);
    const previewPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-merged-template-preview.json');
    const previewExists = await fs.stat(previewPath).then(() => true, () => false);
    const qaOverlayPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate-qa-overlay.svg');
    const qaOverlayExists = await fs.stat(qaOverlayPath).then(() => true, () => false);
    const caseExpectation = expected[caseName];
    const failures = [];

    if (run.exitCode !== caseExpectation.exitCode) failures.push(`EXIT_CODE:${run.exitCode}:${caseExpectation.exitCode}`);
    if (gateReport.summary?.gateVersion !== TARGET_ENTRY_GATE_VERSION) {
      failures.push(`GATE_VERSION:${gateReport.summary?.gateVersion ?? ''}`);
    }
    if (gateReport.summary?.status !== caseExpectation.status) {
      failures.push(`STATUS:${gateReport.summary?.status ?? ''}:${caseExpectation.status}`);
    }
    if (gateReport.summary?.approvedRows !== caseExpectation.approvedRows) {
      failures.push(`APPROVED_ROWS:${gateReport.summary?.approvedRows}:${caseExpectation.approvedRows}`);
    }
    if (gateReport.summary?.previewWritten !== caseExpectation.previewWritten) {
      failures.push(`PREVIEW_WRITTEN:${gateReport.summary?.previewWritten}:${caseExpectation.previewWritten}`);
    }
    if (previewExists !== caseExpectation.previewWritten) {
      failures.push(`PREVIEW_EXISTS:${previewExists}:${caseExpectation.previewWritten}`);
    }
    if (caseExpectation.readyForTemplateImportDryRun !== undefined
      && gateReport.summary?.readyForTemplateImportDryRun !== caseExpectation.readyForTemplateImportDryRun) {
      failures.push(
        `READY_FOR_TEMPLATE_IMPORT_DRY_RUN:${gateReport.summary?.readyForTemplateImportDryRun}:${caseExpectation.readyForTemplateImportDryRun}`,
      );
    }
    if (gateReport.summary?.readyForSourceCopyDryRun !== false) failures.push('READY_FOR_SOURCE_COPY_DRY_RUN_NOT_FALSE');
    if (gateReport.summary?.productionWriteAllowed !== false) failures.push('PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
    if (gateReport.summary?.writesOperatorInput !== false) failures.push('WRITES_OPERATOR_INPUT_NOT_FALSE');
    if (gateReport.summary?.writesCorrectionsTemplate !== false) failures.push('WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
    if (gateReport.summary?.writesProductionData !== false) failures.push('WRITES_PRODUCTION_DATA_NOT_FALSE');
    if ((gateReport.summary?.contextOnlyRowsCopied ?? null) !== 0) failures.push('CONTEXT_ONLY_ROWS_COPIED_NOT_ZERO');
    if (gateReport.summary?.qaOverlayVersion !== 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_GATE_QA_OVERLAY_V1') {
      failures.push(`QA_OVERLAY_VERSION:${gateReport.summary?.qaOverlayVersion ?? ''}`);
    }
    if (gateReport.summary?.qaOverlayWritten !== true) failures.push('QA_OVERLAY_WRITTEN_NOT_TRUE');
    if (!qaOverlayExists) failures.push('QA_OVERLAY_MISSING');

    if (!includesAll(gateReport.summary?.blockers, caseExpectation.requiredBlockers)) {
      failures.push(`MISSING_BLOCKERS:${(caseExpectation.requiredBlockers ?? []).join(' ')}`);
    }
    if (!includesAll(gateReport.summary?.sourceCopyBlockers, caseExpectation.requiredSourceCopyBlockers)) {
      failures.push(`MISSING_SOURCE_COPY_BLOCKERS:${(caseExpectation.requiredSourceCopyBlockers ?? []).join(' ')}`);
    }
    if (!includesAll(gateReport.summary?.warnings, caseExpectation.requiredWarnings)) {
      failures.push(`MISSING_WARNINGS:${(caseExpectation.requiredWarnings ?? []).join(' ')}`);
    }
    const rowReasons = (gateReport.rows ?? []).flatMap((row) => row.reasons ?? []);
    if (!includesAll(rowReasons, caseExpectation.requiredRowReasons)) {
      failures.push(`MISSING_ROW_REASONS:${(caseExpectation.requiredRowReasons ?? []).join(' ')}`);
    }
    const rowWarnings = (gateReport.rows ?? []).flatMap((row) => row.warnings ?? []);
    if (!includesAllPrefixes(rowWarnings, caseExpectation.requiredRowWarningPrefixes)) {
      failures.push(`MISSING_ROW_WARNING_PREFIXES:${(caseExpectation.requiredRowWarningPrefixes ?? []).join(' ')}`);
    }

    caseResults.push({
      caseName,
      passed: failures.length === 0,
      expectedStatus: caseExpectation.status,
      actualStatus: gateReport.summary?.status ?? '',
      exitCode: run.exitCode,
      expectedExitCode: caseExpectation.exitCode,
      approvedRows: gateReport.summary?.approvedRows ?? 0,
      previewWritten: gateReport.summary?.previewWritten ?? false,
      previewExists,
      qaOverlayWritten: gateReport.summary?.qaOverlayWritten ?? false,
      qaOverlayExists,
      readyForTemplateImportDryRun: gateReport.summary?.readyForTemplateImportDryRun ?? false,
      readyForSourceCopyDryRun: gateReport.summary?.readyForSourceCopyDryRun ?? null,
      productionWriteAllowed: gateReport.summary?.productionWriteAllowed ?? null,
      writesOperatorInput: gateReport.summary?.writesOperatorInput ?? null,
      writesCorrectionsTemplate: gateReport.summary?.writesCorrectionsTemplate ?? null,
      writesProductionData: gateReport.summary?.writesProductionData ?? null,
      contextOnlyRowsCopied: gateReport.summary?.contextOnlyRowsCopied ?? null,
      blockers: gateReport.summary?.blockers ?? [],
      sourceCopyBlockers: gateReport.summary?.sourceCopyBlockers ?? [],
      warnings: gateReport.summary?.warnings ?? [],
      rowReasons,
      rowWarnings,
      report: path.relative(frontendRoot, gateReportPath),
      stdout: run.stdout.trim(),
      stderr: run.stderr.trim(),
      failures,
    });
  }

  const failedCases = caseResults.filter((result) => !result.passed);
  const summary = {
    regressionVersion: REGRESSION_VERSION,
    status: failedCases.length === 0 ? 'passed' : 'failed',
    totalCases: caseResults.length,
    passedCases: caseResults.length - failedCases.length,
    failedCases: failedCases.length,
    caseNames: CASES,
    productionWriteAllowed: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    dataFileChanged: false,
    blockers: failedCases.map((result) => `TARGET_ENTRY_GATE_REGRESSION_FAILED:${result.caseName}`),
    warnings: [],
  };
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      targetEntry: path.relative(frontendRoot, sourceTargetEntryPath),
      targetReviewPacket: path.relative(frontendRoot, sourceTargetReviewPacketPath),
      pairedTemplate: path.relative(frontendRoot, sourcePairedTemplatePath),
    },
    safetyContract: [
      'This target entry gate regression writes only fixture/report files under reports/stadium.',
      'It never writes operator input, corrections template source, production data, or src/data/daeguSeatData.ts.',
      'Regression fixtures use operator-like APPROVED rows only inside isolated case directories.',
      'valid-target-preview may write a merged-template-preview fixture, but readyForSourceCopyDryRun must remain false.',
      'Context-only rows must never be copied by the target entry merge preview.',
    ],
    cases: caseResults,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate-regression.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate-regression.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate-regression.md');
  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'case',
      'passed',
      'status',
      'exitCode',
      'approvedRows',
      'previewWritten',
      'qaOverlayWritten',
      'readyForTemplateImportDryRun',
      'readyForSourceCopyDryRun',
      'writesProductionData',
      'blockers',
      'sourceCopyBlockers',
      'rowReasons',
      'rowWarnings',
      'failures',
    ],
    ...caseResults.map((result) => [
      result.caseName,
      result.passed,
      result.actualStatus,
      result.exitCode,
      result.approvedRows,
      result.previewWritten,
      result.qaOverlayWritten,
      result.readyForTemplateImportDryRun,
      result.readyForSourceCopyDryRun,
      result.writesProductionData,
      result.blockers.join(' '),
      result.sourceCopyBlockers.join(' '),
      result.rowReasons.join(' '),
      result.rowWarnings.join(' '),
      result.failures.join(' '),
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T3/V Target Entry Gate Regression',
    '',
    `- regression version: \`${summary.regressionVersion}\``,
    `- status: \`${summary.status}\``,
    `- cases: ${summary.passedCases}/${summary.totalCases}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- writes operator input: ${summary.writesOperatorInput}`,
    `- writes corrections template: ${summary.writesCorrectionsTemplate}`,
    `- writes production data: ${summary.writesProductionData}`,
    '',
    '## Cases',
    '',
    markdownTable(
      ['case', 'passed', 'status', 'exit', 'approved', 'preview', 'source-copy', 'blockers'],
      caseResults.map((result) => [
        `\`${result.caseName}\``,
        String(result.passed),
        `\`${result.actualStatus}\``,
        `${result.exitCode}/${result.expectedExitCode}`,
        result.approvedRows,
        String(result.previewWritten),
        String(result.readyForSourceCopyDryRun),
        [
          ...result.blockers,
          ...result.sourceCopyBlockers,
          ...result.failures,
        ].map((value) => `\`${value}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    report.safetyContract.map((item) => `- ${item}`).join('\n'),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
  ].join('\n'), 'utf8');

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    totalCases: summary.totalCases,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status !== 'passed') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VTargetEntryGate = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_GATE_V1';
  const QA_OVERLAY_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_GATE_QA_OVERLAY_V1';
  const TARGET_ENTRY_TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_TEMPLATE_V1';
  const TARGET_REVIEW_PACKET_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_REVIEW_PACKET_V1';
  const PAIRED_TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const IMAGE_WIDTH = 1707;
  const IMAGE_HEIGHT = 2048;
  const IMAGE_HREF = '../../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png';
  const AREA_DELTA_RATIO_LOW = 0.35;
  const AREA_DELTA_RATIO_HIGH = 3.25;
  const BBOX_OVERLAP_REVIEW_RATIO = 0.35;
  const EXPECTED_TARGET_ROWS = [
    {
      templateRowId: 'P1_T3_TABLE_OWNERSHIP:T3-2',
      editableTarget: 'corrections[3]',
      groupId: 'P1_T3_TABLE_OWNERSHIP',
      block: 'T3-2',
      duplicateTargetBlock: true,
    },
    {
      templateRowId: 'P1_V_CENTER_TABLE_SPLIT:V1',
      editableTarget: 'corrections[8]',
      groupId: 'P1_V_CENTER_TABLE_SPLIT',
      block: 'V1',
      duplicateTargetBlock: false,
    },
    {
      templateRowId: 'P1_V_CENTER_TABLE_SPLIT:V2',
      editableTarget: 'corrections[9]',
      groupId: 'P1_V_CENTER_TABLE_SPLIT',
      block: 'V2',
      duplicateTargetBlock: false,
    },
    {
      templateRowId: 'P1_V_CENTER_TABLE_SPLIT:V3',
      editableTarget: 'corrections[10]',
      groupId: 'P1_V_CENTER_TABLE_SPLIT',
      block: 'V3',
      duplicateTargetBlock: false,
    },
    {
      templateRowId: 'P1_V_CENTER_TABLE_SPLIT:T3-2',
      editableTarget: 'corrections[11]',
      groupId: 'P1_V_CENTER_TABLE_SPLIT',
      block: 'T3-2',
      duplicateTargetBlock: true,
    },
  ];
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);
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

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
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

  const normalizePath = (pathData) => String(pathData ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toUpperCase();

  const normalizeLabel = (row) => [
    String(row?.correctedLabelX ?? '').trim(),
    String(row?.correctedLabelY ?? '').trim(),
  ].join(',');

  const isBlank = (value) => String(value ?? '').trim() === '';

  const round = (value, digits = 2) => {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
  };

  const areaRatio = (area, referenceArea) => {
    if (!Number.isFinite(area) || !Number.isFinite(referenceArea) || referenceArea <= 0) return null;
    return round(area / referenceArea, 3);
  };

  const areaOrNull = (pathData) => {
    const points = pathToPoints(String(pathData ?? ''));
    return points.length >= 3 ? round(polygonArea(points), 2) : null;
  };

  const pathBoundsOrNull = (pathData) => {
    const text = String(pathData ?? '').trim();
    if (!text) return null;
    try {
      const points = pathToPoints(text);
      if (points.length < 3) return null;
      const bounds = pathBounds(text);
      if (![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(Number.isFinite)) return null;
      return bounds;
    } catch {
      return null;
    }
  };

  const pointBounds = (point) => {
    if (!Array.isArray(point) || point.length < 2) return null;
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { minX: x, minY: y, maxX: x, maxY: y };
  };

  const boundsArea = (bounds) => {
    if (!bounds) return 0;
    return Math.max(0, bounds.maxX - bounds.minX) * Math.max(0, bounds.maxY - bounds.minY);
  };

  const boundsOverlapArea = (first, second) => {
    if (!first || !second) return 0;
    const width = Math.max(0, Math.min(first.maxX, second.maxX) - Math.max(first.minX, second.minX));
    const height = Math.max(0, Math.min(first.maxY, second.maxY) - Math.max(first.minY, second.minY));
    return width * height;
  };

  const unionBounds = (boundsList) => {
    const validBounds = boundsList.filter(Boolean);
    if (validBounds.length === 0) return { minX: 0, minY: 0, maxX: IMAGE_WIDTH, maxY: IMAGE_HEIGHT };
    return {
      minX: Math.min(...validBounds.map((bounds) => bounds.minX)),
      minY: Math.min(...validBounds.map((bounds) => bounds.minY)),
      maxX: Math.max(...validBounds.map((bounds) => bounds.maxX)),
      maxY: Math.max(...validBounds.map((bounds) => bounds.maxY)),
    };
  };

  const expandedViewBox = (bounds) => {
    const margin = 92;
    const minX = Math.max(0, bounds.minX - margin);
    const minY = Math.max(0, bounds.minY - margin);
    const maxX = Math.min(IMAGE_WIDTH, bounds.maxX + margin);
    const maxY = Math.min(IMAGE_HEIGHT, bounds.maxY + margin);
    const width = Math.max(320, maxX - minX);
    const height = Math.max(240, maxY - minY);
    return {
      minX: round(Math.max(0, Math.min(IMAGE_WIDTH - width, minX))),
      minY: round(Math.max(0, Math.min(IMAGE_HEIGHT - height, minY))),
      width: round(Math.min(IMAGE_WIDTH, width)),
      height: round(Math.min(IMAGE_HEIGHT, height)),
    };
  };

  const renderQaOverlay = ({ rows, packetRowsByTemplateRowId, viewport }) => {
    const viewBox = `${viewport.minX} ${viewport.minY} ${viewport.width} ${viewport.height}`;
    const height = Math.max(540, Math.round((viewport.height / viewport.width) * 1160));
    const rowLayers = rows.map((row, index) => {
      const packetRow = packetRowsByTemplateRowId.get(row.templateRowId) ?? {};
      const labelPoint = row.correctedLabelPoint;
      return [
        packetRow.currentPath
          ? `<path d="${xmlEscape(packetRow.currentPath)}" fill="#f97316" fill-opacity="0.15" stroke="#dc2626" stroke-width="2.4" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} current legacy path`)}</title></path>`
          : '',
        packetRow.draftPath
          ? `<path d="${xmlEscape(packetRow.draftPath)}" fill="#0ea5e9" fill-opacity="0.12" stroke="#0284c7" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} draft evidence only`)}</title></path>`
          : '',
        row.approved && row.correctedPath
          ? `<path d="${xmlEscape(row.correctedPath)}" fill="#22c55e" fill-opacity="0.2" stroke="#16a34a" stroke-width="3" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} operator corrected path`)}</title></path>`
          : '',
        labelPoint
          ? `<circle cx="${labelPoint[0]}" cy="${labelPoint[1]}" r="6" fill="${row.approved ? '#16a34a' : '#f59e0b'}" stroke="#ffffff" stroke-width="1.8" vector-effect="non-scaling-stroke"/>`
          : '',
        labelPoint
          ? `<text x="${labelPoint[0] + 9}" y="${labelPoint[1] - 8}" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="4" paint-order="stroke">${xmlEscape(`${index + 1}. ${row.block}`)}</text>`
          : '',
      ].join('\n');
    }).join('\n');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="${height}" viewBox="${viewBox}">
    <image href="${xmlEscape(IMAGE_HREF)}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" opacity="0.84"/>
    <rect x="${viewport.minX + 2}" y="${viewport.minY + 2}" width="${viewport.width - 4}" height="${viewport.height - 4}" fill="none" stroke="#0f172a" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
    ${rowLayers}
    <g transform="translate(${viewport.minX + 10} ${viewport.minY + 18})">
      <rect x="0" y="-14" width="390" height="86" rx="4" fill="#ffffff" fill-opacity="0.94" stroke="#cbd5e1" vector-effect="non-scaling-stroke"/>
      <text x="10" y="0" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f172a">Daegu T3/V target-entry-gate QA overlay</text>
      <text x="10" y="18" font-family="Arial, sans-serif" font-size="10" fill="#334155">red=current legacy, blue=draft evidence only, green=operator corrected</text>
      <text x="10" y="35" font-family="Arial, sans-serif" font-size="10" fill="#334155">overlay version: ${xmlEscape(QA_OVERLAY_VERSION)}</text>
      <text x="10" y="52" font-family="Arial, sans-serif" font-size="10" fill="#334155">productionWriteAllowed=false; src/data/daeguSeatData.ts is not modified</text>
    </g>
  </svg>
  `;
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const targetEntryPath = path.resolve(
    frontendRoot,
    argValue('--target-entry', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.json')),
  );
  const targetReviewPacketPath = path.resolve(
    frontendRoot,
    argValue('--target-review-packet', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.json')),
  );
  const pairedTemplatePath = path.resolve(
    frontendRoot,
    argValue('--paired-template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );

  const targetEntry = await readJson(targetEntryPath);
  const targetReviewPacket = await readJson(targetReviewPacketPath);
  const pairedTemplate = await readJson(pairedTemplatePath);
  const blockers = [];
  const warnings = [];
  const sourceCopyBlockers = [];

  if (targetEntry.targetEntryTemplateVersion !== TARGET_ENTRY_TEMPLATE_VERSION) {
    blockers.push(`TARGET_ENTRY_TEMPLATE_VERSION_MISMATCH:${targetEntry.targetEntryTemplateVersion ?? ''}`);
  }
  if (targetReviewPacket.summary?.packetVersion !== TARGET_REVIEW_PACKET_VERSION) {
    blockers.push(`TARGET_REVIEW_PACKET_VERSION_MISMATCH:${targetReviewPacket.summary?.packetVersion ?? ''}`);
  }
  if (pairedTemplate.templateVersion !== PAIRED_TEMPLATE_VERSION) {
    blockers.push(`PAIRED_TEMPLATE_VERSION_MISMATCH:${pairedTemplate.templateVersion ?? ''}`);
  }
  if (targetEntry.productionWriteAllowed !== false) blockers.push('TARGET_ENTRY_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (targetEntry.writesOperatorInput !== false) blockers.push('TARGET_ENTRY_WRITES_OPERATOR_INPUT_NOT_FALSE');
  if (targetEntry.writesProductionData !== false) blockers.push('TARGET_ENTRY_WRITES_PRODUCTION_DATA_NOT_FALSE');
  if (targetReviewPacket.summary?.productionWriteAllowed !== false) {
    blockers.push('TARGET_REVIEW_PACKET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  }
  if (pairedTemplate.productionWriteAllowed !== false) blockers.push('PAIRED_TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

  const entryRows = Array.isArray(targetEntry.rows) ? targetEntry.rows : [];
  const packetRowsByTemplateRowId = new Map((targetReviewPacket.targetRows ?? []).map((row) => [row.templateRowId, row]));
  const pairedRowsByTemplateRowId = new Map((pairedTemplate.corrections ?? []).map((row) => [row.templateRowId, row]));
  const expectedRowsByTemplateRowId = new Map(EXPECTED_TARGET_ROWS.map((row) => [row.templateRowId, row]));
  const targetRowIds = entryRows.map((row) => row.templateRowId);
  const duplicateRowIds = targetRowIds.filter((rowId, index, values) => values.indexOf(rowId) !== index);

  if (entryRows.length !== EXPECTED_TARGET_ROWS.length) {
    blockers.push(`T3V_TARGET_ENTRY_ROW_COUNT_MISMATCH:${entryRows.length}:${EXPECTED_TARGET_ROWS.length}`);
  }
  if (duplicateRowIds.length > 0) blockers.push(`T3V_TARGET_ENTRY_DUPLICATE_ROW_ID:${[...new Set(duplicateRowIds)].join(' ')}`);
  EXPECTED_TARGET_ROWS.forEach((expectedRow, index) => {
    const actualRow = entryRows[index];
    if (!actualRow) {
      blockers.push(`T3V_TARGET_ENTRY_ROW_MISSING:${expectedRow.templateRowId}`);
      return;
    }
    if (actualRow.templateRowId !== expectedRow.templateRowId) {
      blockers.push(`T3V_TARGET_ENTRY_ROW_ORDER_MISMATCH:${index}:${actualRow.templateRowId}:${expectedRow.templateRowId}`);
    }
  });

  const rows = entryRows.map((entryRow) => {
    const expectedRow = expectedRowsByTemplateRowId.get(entryRow.templateRowId);
    const packetRow = packetRowsByTemplateRowId.get(entryRow.templateRowId);
    const pairedRow = pairedRowsByTemplateRowId.get(entryRow.templateRowId);
    const decision = normalizeDecision(entryRow.operatorDecision);
    const approved = decision === 'APPROVED';
    const reasons = [];
    const rowWarnings = [];
    const missingFields = [];
    const labelPoint = [Number(entryRow.correctedLabelX), Number(entryRow.correctedLabelY)];
    const pathPoints = pathToPoints(String(entryRow.correctedPath ?? ''));
    const pathArea = pathPoints.length >= 3 ? round(polygonArea(pathPoints), 2) : null;
    const currentPathArea = packetRow?.currentPath ? areaOrNull(packetRow.currentPath) : null;
    const draftPathArea = packetRow?.draftPath ? areaOrNull(packetRow.draftPath) : null;
    const areaRatioVsCurrent = areaRatio(pathArea, currentPathArea);
    const areaRatioVsDraft = areaRatio(pathArea, draftPathArea);

    if (!expectedRow) reasons.push('T3V_TARGET_ENTRY_UNEXPECTED_ROW');
    if (!packetRow) reasons.push('T3V_TARGET_REVIEW_PACKET_ROW_MISSING');
    if (!pairedRow) reasons.push('T3V_PAIRED_TEMPLATE_ROW_MISSING');
    if (!DECISION_OPTIONS.has(decision)) reasons.push('T3V_TARGET_ENTRY_INVALID_OPERATOR_DECISION');
    if (expectedRow && entryRow.groupId !== expectedRow.groupId) {
      reasons.push(`T3V_TARGET_ENTRY_GROUP_MISMATCH:${entryRow.groupId}:${expectedRow.groupId}`);
    }
    if (expectedRow && entryRow.block !== expectedRow.block) {
      reasons.push(`T3V_TARGET_ENTRY_BLOCK_MISMATCH:${entryRow.block}:${expectedRow.block}`);
    }
    if (expectedRow && entryRow.editableTarget !== expectedRow.editableTarget) {
      reasons.push(`T3V_TARGET_ENTRY_EDITABLE_TARGET_MISMATCH:${entryRow.editableTarget}:${expectedRow.editableTarget}`);
    }

    if (approved) {
      [
        ['correctedPath', entryRow.correctedPath],
        ['correctedLabelX', entryRow.correctedLabelX],
        ['correctedLabelY', entryRow.correctedLabelY],
        ['reviewer', entryRow.reviewer],
        ['reviewedAt', entryRow.reviewedAt],
      ].forEach(([field, value]) => {
        if (isBlank(value)) missingFields.push(field);
      });
      if (missingFields.length > 0) reasons.push(`T3V_TARGET_APPROVED_ROW_MISSING_FIELDS:${missingFields.join(' ')}`);

      if (!Number.isFinite(labelPoint[0])) reasons.push('T3V_TARGET_CORRECTED_LABEL_X_NOT_NUMERIC');
      if (!Number.isFinite(labelPoint[1])) reasons.push('T3V_TARGET_CORRECTED_LABEL_Y_NOT_NUMERIC');
      if (Number.isFinite(labelPoint[0]) && Number.isFinite(labelPoint[1])) {
        reasons.push(...validateSeatMapPolygonPath({
          pathData: String(entryRow.correctedPath ?? ''),
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
          minPointCount: 4,
          labelPoint,
          labelTolerance: 1,
        }).map((code) => `T3V_TARGET_${code}`));
      }
      if (entryRow.reviewedAt && Number.isNaN(Date.parse(entryRow.reviewedAt))) {
        reasons.push('T3V_TARGET_REVIEWED_AT_NOT_PARSEABLE');
      }
      const correctedPathKey = normalizePath(entryRow.correctedPath);
      if (correctedPathKey && packetRow && correctedPathKey === normalizePath(packetRow.currentPath)) {
        reasons.push('T3V_TARGET_CORRECTED_PATH_REUSES_CURRENT_PATH');
      }
      if (correctedPathKey && packetRow && correctedPathKey === normalizePath(packetRow.draftPath)) {
        rowWarnings.push('T3V_TARGET_CORRECTED_PATH_MATCHES_DRAFT_CONFIRM_OPERATOR_INTENT');
      }
      if (areaRatioVsCurrent !== null
        && (areaRatioVsCurrent < AREA_DELTA_RATIO_LOW || areaRatioVsCurrent > AREA_DELTA_RATIO_HIGH)) {
        rowWarnings.push(`T3V_TARGET_CORRECTED_AREA_DELTA_REVIEW:current:${areaRatioVsCurrent}`);
      }
      if (areaRatioVsDraft !== null
        && (areaRatioVsDraft < AREA_DELTA_RATIO_LOW || areaRatioVsDraft > AREA_DELTA_RATIO_HIGH)) {
        rowWarnings.push(`T3V_TARGET_CORRECTED_AREA_DELTA_REVIEW:draft:${areaRatioVsDraft}`);
      }
    } else if (!isBlank(entryRow.correctedPath)
      || !isBlank(entryRow.correctedLabelX)
      || !isBlank(entryRow.correctedLabelY)
      || !isBlank(entryRow.reviewer)
      || !isBlank(entryRow.reviewedAt)) {
      rowWarnings.push('T3V_TARGET_NON_APPROVED_ROW_HAS_CORRECTION_FIELDS');
    }

    return {
      templateRowId: entryRow.templateRowId,
      editableTarget: entryRow.editableTarget,
      groupId: entryRow.groupId,
      block: entryRow.block,
      duplicateTargetBlock: Boolean(expectedRow?.duplicateTargetBlock),
      decision,
      approved,
      mergeCandidate: approved && reasons.length === 0,
      correctedPath: String(entryRow.correctedPath ?? ''),
      correctedLabelPoint: Number.isFinite(labelPoint[0]) && Number.isFinite(labelPoint[1]) ? labelPoint : null,
      correctedPathPointCount: pathPoints.length,
      correctedPathArea: pathArea,
      currentPathArea,
      draftPathArea,
      correctedAreaRatioVsCurrent: areaRatioVsCurrent,
      correctedAreaRatioVsDraft: areaRatioVsDraft,
      correctedPathBounds: pathBoundsOrNull(entryRow.correctedPath),
      correctedPathPoints: pathPoints,
      targetColorCoverage: packetRow?.targetColorCoverage ?? null,
      reasons,
      warnings: rowWarnings,
      sourceCopyRole: 'target-entry-merge-candidate',
    };
  });

  rows.filter((row) => row.approved && row.correctedLabelPoint).forEach((row) => {
    const containingRows = rows.filter((candidate) => candidate.approved
      && candidate.correctedPathPoints.length >= 3
      && pointInPolygon(row.correctedLabelPoint, candidate.correctedPathPoints));
    const otherBlockHits = containingRows.filter((candidate) => candidate.block !== row.block);
    if (otherBlockHits.length > 0) {
      row.warnings.push(`T3V_TARGET_CORRECTED_LABEL_TOP_HIT_REVIEW:${otherBlockHits.map((hit) => hit.block).join('|')}`);
    }
  });

  rows.filter((row) => row.approved && row.correctedPathBounds).forEach((row, index, approvedRowsWithBounds) => {
    approvedRowsWithBounds.slice(index + 1).forEach((otherRow) => {
      if (row.block === otherRow.block) return;
      const overlapArea = boundsOverlapArea(row.correctedPathBounds, otherRow.correctedPathBounds);
      const denominator = Math.min(boundsArea(row.correctedPathBounds), boundsArea(otherRow.correctedPathBounds));
      const overlapRatio = denominator > 0 ? round(overlapArea / denominator, 3) : 0;
      if (overlapRatio >= BBOX_OVERLAP_REVIEW_RATIO) {
        row.warnings.push(`T3V_TARGET_CORRECTED_PATH_OVERLAP_REVIEW:${otherRow.block}:${overlapRatio}`);
        otherRow.warnings.push(`T3V_TARGET_CORRECTED_PATH_OVERLAP_REVIEW:${row.block}:${overlapRatio}`);
      }
    });
  });

  const approvedRows = rows.filter((row) => row.approved);
  const invalidRows = rows.filter((row) => row.reasons.length > 0);
  const validApprovedRows = rows.filter((row) => row.approved && row.reasons.length === 0);
  const validApprovedRowIds = new Set(validApprovedRows.map((row) => row.templateRowId));
  const t3DuplicateRows = entryRows.filter((row) => row.block === 'T3-2');
  const approvedT3DuplicateRows = t3DuplicateRows.filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED');
  if (approvedT3DuplicateRows.length === 1) {
    blockers.push('T3V_TARGET_DUPLICATE_PARTIAL_APPROVAL_BLOCKED:T3-2');
  }
  if (approvedT3DuplicateRows.length === 2) {
    const uniquePaths = new Set(approvedT3DuplicateRows.map((row) => normalizePath(row.correctedPath)).filter(Boolean));
    const uniqueLabels = new Set(approvedT3DuplicateRows.map(normalizeLabel).filter((label) => label !== ','));
    if (uniquePaths.size !== 1) blockers.push('T3V_TARGET_DUPLICATE_PATH_MISMATCH:T3-2');
    if (uniqueLabels.size !== 1) blockers.push('T3V_TARGET_DUPLICATE_LABEL_MISMATCH:T3-2');
  }
  if (invalidRows.length > 0) {
    blockers.push(`T3V_TARGET_ENTRY_INVALID_ROWS:${invalidRows.map((row) => row.templateRowId).join(' ')}`);
  }

  const approvedVRows = rows.filter((row) => row.groupId === 'P1_V_CENTER_TABLE_SPLIT'
    && ['V1', 'V2', 'V3'].includes(row.block)
    && row.approved);
  if (approvedVRows.length > 0 && approvedVRows.length < 3) {
    sourceCopyBlockers.push(`T3V_TARGET_V_PARTIAL_APPROVAL_SOURCE_COPY_BLOCKED:${approvedVRows.length}:3`);
  }
  if (approvedRows.length > 0 && approvedRows.length < EXPECTED_TARGET_ROWS.length) {
    sourceCopyBlockers.push(`T3V_TARGET_PARTIAL_APPROVAL_SOURCE_COPY_BLOCKED:${approvedRows.length}:${EXPECTED_TARGET_ROWS.length}`);
  }
  if (validApprovedRows.length > 0) {
    sourceCopyBlockers.push('T3V_CONTEXT_ONLY_ROWS_STILL_REQUIRED:7');
  }
  if (approvedRows.length === 0) warnings.push('T3V_TARGET_ENTRY_HAS_NO_APPROVED_ROWS');

  const canWritePreview = blockers.length === 0 && validApprovedRows.length > 0 && validApprovedRows.length === approvedRows.length;
  const mergedTemplatePreview = canWritePreview
    ? {
      ...pairedTemplate,
      dryRunOnly: true,
      generatedBy: GATE_VERSION,
      productionWriteAllowed: false,
      sourceTargetEntry: path.relative(frontendRoot, targetEntryPath),
      sourceTargetReviewPacket: path.relative(frontendRoot, targetReviewPacketPath),
      approvalNote: 'This is a dry-run merged preview only. It must not be copied into production without the paired template gate and T3/V pre-approval gate.',
      corrections: pairedTemplate.corrections.map((pairedRow) => {
        if (!validApprovedRowIds.has(pairedRow.templateRowId)) return pairedRow;
        const targetRow = entryRows.find((row) => row.templateRowId === pairedRow.templateRowId);
        return {
          ...pairedRow,
          operatorDecision: 'APPROVED',
          correctedPath: targetRow.correctedPath,
          correctedLabelX: targetRow.correctedLabelX,
          correctedLabelY: targetRow.correctedLabelY,
          reviewer: targetRow.reviewer,
          reviewedAt: targetRow.reviewedAt,
          operatorNote: targetRow.operatorNote,
          editableSource: 't3-v-target-entry-gate-preview',
        };
      }),
    }
    : null;

  const status = blockers.length > 0
    ? 'blocked'
    : approvedRows.length === 0
      ? 'waiting-for-operator'
      : 'ready-for-template-import-dry-run';

  const qaOverlayPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate-qa-overlay.svg');
  const qaViewport = expandedViewBox(unionBounds([
    ...rows.map((row) => row.correctedPathBounds),
    ...rows.map((row) => pointBounds(row.correctedLabelPoint)),
    ...entryRows.flatMap((entryRow) => {
      const packetRow = packetRowsByTemplateRowId.get(entryRow.templateRowId) ?? {};
      return [
        pathBoundsOrNull(packetRow.currentPath),
        pathBoundsOrNull(packetRow.draftPath),
        pointBounds(packetRow.currentLabelPoint),
        pointBounds(packetRow.draftLabelPoint),
      ];
    }),
  ]));

  const summary = {
    gateVersion: GATE_VERSION,
    qaOverlayVersion: QA_OVERLAY_VERSION,
    status,
    targetEntryTemplateVersion: targetEntry.targetEntryTemplateVersion ?? '',
    targetReviewPacketVersion: targetReviewPacket.summary?.packetVersion ?? '',
    pairedTemplateVersion: pairedTemplate.templateVersion ?? '',
    expectedRows: EXPECTED_TARGET_ROWS.length,
    totalRows: rows.length,
    approvedRows: approvedRows.length,
    validApprovedRows: validApprovedRows.length,
    invalidRows: invalidRows.length,
    previewWritten: Boolean(mergedTemplatePreview),
    qaOverlayWritten: true,
    qaOverlay: path.relative(frontendRoot, qaOverlayPath),
    readyForTemplateImportDryRun: status === 'ready-for-template-import-dry-run',
    readyForSourceCopyDryRun: false,
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    contextOnlyRowsCopied: 0,
    blockers: [...new Set(blockers)],
    sourceCopyBlockers: [...new Set(sourceCopyBlockers)],
    warnings: [...new Set(warnings)],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      targetEntry: path.relative(frontendRoot, targetEntryPath),
      targetReviewPacket: path.relative(frontendRoot, targetReviewPacketPath),
      pairedTemplate: path.relative(frontendRoot, pairedTemplatePath),
    },
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    safetyContract: [
      'This T3/V target entry gate is read-only for operator input and production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'It never overwrites the 15-row paired ownership operator template.',
      'It writes only report artifacts and an optional merged-template-preview dry-run file.',
      'context-only rows are not copied into the target entry merge preview.',
      'T3-2 duplicate target rows must keep correctedPath and correctedLabelX/Y identical.',
      'V1/V2/V3 partial approval may be previewed, but source-copy remains blocked until the full paired T3/V gates pass.',
      'Automatic draft paths remain evidence only and require operator confirmation.',
      'Approved rows generate a QA overlay with current, draft, and corrected geometry layers.',
      'Corrected area delta, label top-hit review, and corrected path overlap review are report flags before source-copy.',
    ],
    rows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-gate.md');
  const previewPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-merged-template-preview.json');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'groupId',
      'block',
      'decision',
      'approved',
      'mergeCandidate',
      'pointCount',
      'area',
      'currentArea',
      'draftArea',
      'areaRatioVsCurrent',
      'areaRatioVsDraft',
      'targetColorCoverage',
      'reasons',
      'warnings',
    ],
    ...rows.map((row) => [
      row.templateRowId,
      row.groupId,
      row.block,
      row.decision,
      row.approved,
      row.mergeCandidate,
      row.correctedPathPointCount,
      row.correctedPathArea ?? '',
      row.currentPathArea ?? '',
      row.draftPathArea ?? '',
      row.correctedAreaRatioVsCurrent ?? '',
      row.correctedAreaRatioVsDraft ?? '',
      row.targetColorCoverage ?? '',
      row.reasons.join(' '),
      row.warnings.join(' '),
    ]),
  ]);
  if (mergedTemplatePreview) await writeJson(previewPath, mergedTemplatePreview);
  await fs.writeFile(
    `${qaOverlayPath}.tmp`,
    renderQaOverlay({ rows, packetRowsByTemplateRowId, viewport: qaViewport }),
    'utf8',
  );
  await fs.rename(`${qaOverlayPath}.tmp`, qaOverlayPath);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership T3/V Target Entry Gate',
    '',
    `- gate version: \`${summary.gateVersion}\``,
    `- status: \`${summary.status}\``,
    `- approved rows: ${summary.approvedRows}/${summary.totalRows}`,
    `- valid approved rows: ${summary.validApprovedRows}/${summary.totalRows}`,
    `- preview written: ${summary.previewWritten}`,
    `- QA overlay written: ${summary.qaOverlayWritten}`,
    `- QA overlay: \`${summary.qaOverlay}\``,
    `- ready for template import dry-run: ${summary.readyForTemplateImportDryRun}`,
    `- ready for source-copy dry-run: ${summary.readyForSourceCopyDryRun}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Target Rows',
    '',
    markdownTable(
      ['template row', 'block', 'decision', 'merge', 'area ratio', 'reasons', 'warnings'],
      rows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.block}\``,
        `\`${row.decision}\``,
        String(row.mergeCandidate),
        [
          row.correctedAreaRatioVsCurrent === null ? '' : `current=${row.correctedAreaRatioVsCurrent}`,
          row.correctedAreaRatioVsDraft === null ? '' : `draft=${row.correctedAreaRatioVsDraft}`,
        ].filter(Boolean).join('<br>') || '-',
        row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
        row.warnings.map((warning) => `\`${warning}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Visual QA Overlay',
    '',
    `- \`${summary.qaOverlay}\``,
    '- red: current legacy path',
    '- blue dashed: official PNG draft evidence only',
    '- green: operator corrected path',
    '',
    '## Source-Copy Blockers',
    '',
    summary.sourceCopyBlockers.length > 0
      ? summary.sourceCopyBlockers.map((blocker) => `- \`${blocker}\``).join('\n')
      : 'No source-copy blockers.',
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

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    approvedRows: summary.approvedRows,
    validApprovedRows: summary.validApprovedRows,
    previewWritten: summary.previewWritten,
    readyForTemplateImportDryRun: summary.readyForTemplateImportDryRun,
    readyForSourceCopyDryRun: summary.readyForSourceCopyDryRun,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    qaOverlayWritten: summary.qaOverlayWritten,
    blockers: summary.blockers.length,
    sourceCopyBlockers: summary.sourceCopyBlockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VTargetReviewPacket = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const PACKET_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_REVIEW_PACKET_V1';
  const TARGET_ENTRY_TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_TARGET_ENTRY_TEMPLATE_V1';
  const ENTRY_BRIEF_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_OPERATOR_ENTRY_BRIEF_V1';
  const READINESS_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_APPROVAL_READINESS_V1';
  const BOUNDARY_PACKET_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_PACKET_V1';
  const IMAGE_DRAFT_VERSION = 'DAEGU_P1_BOUNDARY_FIRST_IMAGE_COORDINATE_DRAFT_V1';
  const EVIDENCE_QUALITY_AUDIT_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_EVIDENCE_QUALITY_AUDIT_V1';
  const PRE_APPROVAL_GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_PRE_APPROVAL_GATE_V1';
  const EXPECTED_SHA256 = '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0';
  const IMAGE_WIDTH = 1707;
  const IMAGE_HEIGHT = 2048;
  const IMAGE_HREF = '../../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png';
  const FOCUS_GROUPS = [
    'P1_T3_TABLE_OWNERSHIP',
    'P1_V_CENTER_TABLE_SPLIT',
  ];
  const SOURCE_TARGET_BLOCKS = ['T3-2', 'V1', 'V2', 'V3'];
  const SHARED_BLOCKS = ['T3-2', 'T3-3'];
  const DUPLICATE_TARGET_BLOCKS = ['T3-2'];
  const OPERATOR_DECISION_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE'];
  const APPROVED_REQUIRED_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ];
  const VIEWPORT_MARGIN = 88;
  const MIN_VIEWPORT_WIDTH = 340;
  const MIN_VIEWPORT_HEIGHT = 260;

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);

  const round = (value, digits = 2) => {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
  };

  const parsePoint = (value) => {
    if (Array.isArray(value) && value.length >= 2) {
      const x = Number(value[0]);
      const y = Number(value[1]);
      return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
    }
    const numbers = String(value ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    if (numbers.length < 2 || !Number.isFinite(numbers[0]) || !Number.isFinite(numbers[1])) return null;
    return [numbers[0], numbers[1]];
  };

  const pathPointCount = (pathData) => pathToPoints(String(pathData ?? '')).length;

  const pathBoundsOrNull = (pathData) => {
    const text = String(pathData ?? '').trim();
    if (!text) return null;
    try {
      const points = pathToPoints(text);
      if (points.length < 3) return null;
      const bounds = pathBounds(text);
      if (![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(Number.isFinite)) return null;
      return bounds;
    } catch {
      return null;
    }
  };

  const pointBounds = (point) => {
    if (!Array.isArray(point) || point.length < 2) return null;
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { minX: x, minY: y, maxX: x, maxY: y };
  };

  const bboxBounds = (bbox) => {
    if (!Array.isArray(bbox) || bbox.length < 4) return null;
    const values = bbox.slice(0, 4).map(Number);
    if (!values.every(Number.isFinite)) return null;
    return {
      minX: Math.min(values[0], values[2]),
      minY: Math.min(values[1], values[3]),
      maxX: Math.max(values[0], values[2]),
      maxY: Math.max(values[1], values[3]),
    };
  };

  const unionBounds = (boundsList) => {
    const validBounds = boundsList.filter(Boolean);
    if (validBounds.length === 0) {
      return { minX: 0, minY: 0, maxX: IMAGE_WIDTH, maxY: IMAGE_HEIGHT };
    }
    return {
      minX: Math.min(...validBounds.map((bounds) => bounds.minX)),
      minY: Math.min(...validBounds.map((bounds) => bounds.minY)),
      maxX: Math.max(...validBounds.map((bounds) => bounds.maxX)),
      maxY: Math.max(...validBounds.map((bounds) => bounds.maxY)),
    };
  };

  const expandedViewport = (bounds) => {
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const width = Math.min(IMAGE_WIDTH, Math.max(MIN_VIEWPORT_WIDTH, (bounds.maxX - bounds.minX) + (VIEWPORT_MARGIN * 2)));
    const height = Math.min(IMAGE_HEIGHT, Math.max(MIN_VIEWPORT_HEIGHT, (bounds.maxY - bounds.minY) + (VIEWPORT_MARGIN * 2)));
    const minX = Math.max(0, Math.min(IMAGE_WIDTH - width, centerX - (width / 2)));
    const minY = Math.max(0, Math.min(IMAGE_HEIGHT - height, centerY - (height / 2)));
    return {
      minX: round(minX),
      minY: round(minY),
      width: round(width),
      height: round(height),
      viewBox: `${round(minX)} ${round(minY)} ${round(width)} ${round(height)}`,
    };
  };

  const areaOrNull = (pathData) => {
    const points = pathToPoints(String(pathData ?? ''));
    return points.length >= 3 ? round(polygonArea(points), 2) : null;
  };

  const sourcePolicy = {
    allowedCoordinateSource: 'official Daegu Samsung Lions Park PNG 1707x2048 plus operator-provided corrected coordinates only',
    coordinateSystem: 'SVG viewBox 0 0 1707 2048',
    targetReviewOnly: true,
    sourceCopyTargetBlocks: SOURCE_TARGET_BLOCKS,
    disallowedSources: [
      'automatic draft promotion',
      'browser CSS pixels',
      'resized screenshots',
      'external baseball crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const entryBriefPath = path.resolve(
    frontendRoot,
    argValue('--entry-brief', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-operator-entry-brief.json')),
  );
  const readinessPath = path.resolve(
    frontendRoot,
    argValue('--readiness', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-approval-readiness.json')),
  );
  const boundaryPacketPath = path.resolve(
    frontendRoot,
    argValue('--boundary-packet', path.join(p1ReportDir, 'daegu-seatmap-p1-boundary-first-packet.json')),
  );
  const imageDraftPath = path.resolve(
    frontendRoot,
    argValue(
      '--image-draft',
      path.join(
        p1ReportDir,
        'daegu-seatmap-p1-boundary-first-image-coordinate-draft/daegu-p1-boundary-first-image-coordinate-draft.json',
      ),
    ),
  );
  const evidenceAuditPath = path.resolve(
    frontendRoot,
    argValue('--evidence-audit', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-evidence-quality-audit.json')),
  );
  const preApprovalGatePath = path.resolve(
    frontendRoot,
    argValue('--pre-approval-gate', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-pre-approval-gate.json')),
  );

  const entryBrief = await readJson(entryBriefPath);
  const readiness = await readJson(readinessPath);
  const boundaryPacket = await readJson(boundaryPacketPath);
  const imageDraft = await readJson(imageDraftPath);
  const evidenceAudit = await readJson(evidenceAuditPath);
  const preApprovalGate = await readJson(preApprovalGatePath);

  const blockers = [];
  const warnings = [];

  if (entryBrief.summary?.briefVersion !== ENTRY_BRIEF_VERSION) {
    blockers.push(`ENTRY_BRIEF_VERSION_MISMATCH:${entryBrief.summary?.briefVersion ?? ''}`);
  }
  if (readiness.summary?.readinessVersion !== READINESS_VERSION) {
    blockers.push(`READINESS_VERSION_MISMATCH:${readiness.summary?.readinessVersion ?? ''}`);
  }
  if (boundaryPacket.summary?.packetVersion !== BOUNDARY_PACKET_VERSION) {
    blockers.push(`BOUNDARY_PACKET_VERSION_MISMATCH:${boundaryPacket.summary?.packetVersion ?? ''}`);
  }
  if (imageDraft.draftVersion !== IMAGE_DRAFT_VERSION) blockers.push(`IMAGE_DRAFT_VERSION_MISMATCH:${imageDraft.draftVersion ?? ''}`);
  if (evidenceAudit.summary?.auditVersion !== EVIDENCE_QUALITY_AUDIT_VERSION) {
    blockers.push(`EVIDENCE_QUALITY_AUDIT_VERSION_MISMATCH:${evidenceAudit.summary?.auditVersion ?? ''}`);
  }
  if (preApprovalGate.summary?.preApprovalGateVersion !== PRE_APPROVAL_GATE_VERSION) {
    blockers.push(`PRE_APPROVAL_GATE_VERSION_MISMATCH:${preApprovalGate.summary?.preApprovalGateVersion ?? ''}`);
  }
  [
    ['ENTRY_BRIEF', entryBrief.summary],
    ['READINESS', readiness.summary],
    ['BOUNDARY_PACKET', boundaryPacket.summary],
    ['EVIDENCE_AUDIT', evidenceAudit.summary],
    ['PRE_APPROVAL_GATE', preApprovalGate.summary],
  ].forEach(([label, summary]) => {
    if (summary?.productionWriteAllowed !== false) blockers.push(`${label}_PRODUCTION_WRITE_ALLOWED_NOT_FALSE`);
    if (summary?.writesSourceInput === true) blockers.push(`${label}_WRITES_SOURCE_INPUT_TRUE`);
    if (summary?.writesProductionData === true) blockers.push(`${label}_WRITES_PRODUCTION_DATA_TRUE`);
  });
  if (entryBrief.summary?.officialImageSha256 !== EXPECTED_SHA256) {
    blockers.push(`OFFICIAL_IMAGE_SHA256_MISMATCH:${entryBrief.summary?.officialImageSha256 ?? ''}`);
  }
  if (evidenceAudit.summary?.imageBasedAnalysis !== true) blockers.push('EVIDENCE_AUDIT_IMAGE_BASED_ANALYSIS_NOT_TRUE');

  const briefRows = Array.isArray(entryBrief.rows) ? entryBrief.rows : [];
  const targetBriefRows = briefRows.filter((row) => SOURCE_TARGET_BLOCKS.includes(row.block));
  const readinessRowsByTemplateRowId = new Map((readiness.rows ?? []).map((row) => [row.templateRowId, row]));
  const boundaryRowsByBlock = new Map((boundaryPacket.rows ?? []).map((row) => [row.block, row]));
  const draftRowsByBlock = new Map((imageDraft.rows ?? []).map((row) => [row.block, row]));
  const evidenceRowsByTemplateRowId = new Map((evidenceAudit.rows ?? []).map((row) => [row.templateRowId, row]));
  const preApprovalRowsByTemplateRowId = new Map((preApprovalGate.rows ?? []).map((row) => [row.templateRowId, row]));

  if (targetBriefRows.length !== 5) blockers.push(`TARGET_TEMPLATE_ROW_COUNT_MISMATCH:${targetBriefRows.length}:5`);
  SOURCE_TARGET_BLOCKS.forEach((block) => {
    if (!targetBriefRows.some((row) => row.block === block)) blockers.push(`TARGET_BLOCK_ROW_MISSING:${block}`);
    if (!boundaryRowsByBlock.has(block)) blockers.push(`BOUNDARY_PACKET_TARGET_ROW_MISSING:${block}`);
    if (!draftRowsByBlock.has(block)) blockers.push(`IMAGE_DRAFT_TARGET_ROW_MISSING:${block}`);
  });

  const targetRows = targetBriefRows.map((briefRow) => {
    const boundaryRow = boundaryRowsByBlock.get(briefRow.block) ?? {};
    const draftRow = draftRowsByBlock.get(briefRow.block) ?? {};
    const readinessRow = readinessRowsByTemplateRowId.get(briefRow.templateRowId) ?? {};
    const evidenceRow = evidenceRowsByTemplateRowId.get(briefRow.templateRowId) ?? {};
    const preApprovalRow = preApprovalRowsByTemplateRowId.get(briefRow.templateRowId) ?? {};
    const currentPath = boundaryRow.targetReference?.currentPath ?? '';
    const currentLabelPoint = parsePoint([
      boundaryRow.targetReference?.currentLabelX ?? '',
      boundaryRow.targetReference?.currentLabelY ?? '',
    ]) ?? parsePoint(briefRow.currentLabelPoint);
    const draftLabelPoint = parsePoint([
      draftRow.correctedLabelX ?? '',
      draftRow.correctedLabelY ?? '',
    ]);

    return {
      templateRowId: briefRow.templateRowId,
      editableTarget: briefRow.editableTarget,
      groupId: briefRow.groupId,
      block: briefRow.block,
      blockRole: briefRow.blockRole,
      name: briefRow.name,
      sourceCopyTarget: SOURCE_TARGET_BLOCKS.includes(briefRow.block),
      sharedBlock: SHARED_BLOCKS.includes(briefRow.block),
      duplicateTargetBlock: DUPLICATE_TARGET_BLOCKS.includes(briefRow.block),
      operatorDecision: briefRow.operatorDecision,
      missingApprovalFields: briefRow.missingApprovalFields ?? [],
      currentPath,
      currentPathPointCount: pathPointCount(currentPath),
      currentPathArea: areaOrNull(currentPath),
      currentLabelPoint,
      currentFailureReasons: boundaryRow.currentFailureReasons ?? '',
      draftPath: draftRow.correctedPathDraft ?? briefRow.draftPath ?? '',
      draftPathPointCount: pathPointCount(draftRow.correctedPathDraft ?? briefRow.draftPath ?? ''),
      draftPathArea: areaOrNull(draftRow.correctedPathDraft ?? briefRow.draftPath ?? ''),
      draftLabelPoint,
      draftReferenceOnly: true,
      draftOverlayPath: briefRow.draftOverlayPath ?? draftRow.overlayPath ?? '',
      evidenceCrop: briefRow.evidenceCrop ?? boundaryRow.evidenceCrop ?? '',
      evidenceCropExists: briefRow.evidenceCropExists === true,
      targetColorCoverage: evidenceRow.targetColorCoverage ?? briefRow.targetColorCoverage ?? null,
      targetColorPixels: briefRow.targetColorPixels ?? null,
      componentBbox: draftRow.componentBbox ?? null,
      colorClass: draftRow.colorClass ?? briefRow.draftColorClass ?? '',
      riskFlags: briefRow.riskFlags || boundaryRow.riskFlags || '',
      readinessReasons: readinessRow.reasons ?? [],
      readinessWarnings: readinessRow.warnings ?? [],
      preApprovalReasons: preApprovalRow.reasons ?? [],
      preApprovalWarnings: preApprovalRow.warnings ?? [],
      tracingSvg: briefRow.tracingSvg ?? '',
      correctionOverlay: briefRow.correctionOverlay ?? '',
      nextOperatorAction: briefRow.nextOperatorAction,
    };
  });

  const contextRows = briefRows
    .filter((row) => FOCUS_GROUPS.includes(row.groupId) && !SOURCE_TARGET_BLOCKS.includes(row.block))
    .map((row) => ({
      templateRowId: row.templateRowId,
      groupId: row.groupId,
      block: row.block,
      blockRole: row.blockRole,
      sharedBlock: SHARED_BLOCKS.includes(row.block),
      currentLabelPoint: parsePoint(row.currentLabelPoint),
      operatorDecision: row.operatorDecision,
      sourceCopyRole: 'context-only-gate-row',
      nextOperatorAction: row.nextOperatorAction,
    }));

  const viewportBounds = unionBounds([
    ...targetRows.flatMap((row) => [
      pathBoundsOrNull(row.currentPath),
      pathBoundsOrNull(row.draftPath),
      pointBounds(row.currentLabelPoint),
      pointBounds(row.draftLabelPoint),
      bboxBounds(row.componentBbox),
    ]),
    ...contextRows.map((row) => pointBounds(row.currentLabelPoint)),
  ]);
  const viewport = expandedViewport(viewportBounds);

  const targetEntryTemplate = {
    targetEntryTemplateVersion: TARGET_ENTRY_TEMPLATE_VERSION,
    sourcePacketVersion: PACKET_VERSION,
    operatorDecisionOptions: OPERATOR_DECISION_OPTIONS,
    approvedRequiredFields: APPROVED_REQUIRED_FIELDS,
    sourceCopyTargetBlocks: SOURCE_TARGET_BLOCKS,
    duplicateTargetBlocks: DUPLICATE_TARGET_BLOCKS,
    sharedBlocks: SHARED_BLOCKS,
    productionWriteAllowed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    rows: targetRows.map((row) => ({
      templateRowId: row.templateRowId,
      editableTarget: row.editableTarget,
      groupId: row.groupId,
      block: row.block,
      sharedBlock: row.sharedBlock,
      duplicateTargetBlock: row.duplicateTargetBlock,
      operatorDecision: 'PENDING',
      correctedPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      reviewer: '',
      reviewedAt: '',
      operatorNote: '',
      approvedRequiredFields: APPROVED_REQUIRED_FIELDS,
      nextOperatorAction: row.nextOperatorAction,
    })),
  };

  const summary = {
    packetVersion: PACKET_VERSION,
    status: blockers.length > 0 ? 'blocked' : 'waiting-for-operator',
    targetBatchId: 'BATCH_2_P1',
    focusGroups: FOCUS_GROUPS,
    sourceCopyTargetBlocks: SOURCE_TARGET_BLOCKS,
    targetTemplateRows: targetRows.length,
    contextOnlyRows: contextRows.length,
    duplicateTargetBlocks: DUPLICATE_TARGET_BLOCKS,
    sharedBlocks: SHARED_BLOCKS,
    readinessStatus: readiness.summary?.status ?? '',
    preApprovalGateStatus: preApprovalGate.summary?.status ?? '',
    officialImageSha256: entryBrief.summary?.officialImageSha256 ?? '',
    targetViewport: viewport,
    minTargetColorCoverage: targetRows.length > 0
      ? Math.min(...targetRows.map((row) => Number(row.targetColorCoverage ?? 0)))
      : 0,
    productionWriteAllowed: false,
    sourceOfTruth: false,
    sourceDataWritePerformed: false,
    writesOperatorInput: false,
    writesSourceInput: false,
    writesOperatorDecision: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      entryBrief: relativePath(entryBriefPath),
      readiness: relativePath(readinessPath),
      boundaryPacket: relativePath(boundaryPacketPath),
      imageDraft: relativePath(imageDraftPath),
      evidenceAudit: relativePath(evidenceAuditPath),
      preApprovalGate: relativePath(preApprovalGatePath),
    },
    sourcePolicy,
    safetyContract: [
      'This T3/V target review packet is read-only.',
      'It never writes operator input.',
      'It never writes source input.',
      'It never writes operatorDecision or corrected fields.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'Draft paths and pixel components are evidence only and must not be copied into correctedPath without operator approval.',
      'T3-2 appears in two focus groups; both rows must keep correctedPath and correctedLabelX/Y identical before any source-copy path can be considered.',
      'Context-only rows remain gate rows and must not become source-copy target rows.',
      'External baseball data, web search, crawling, resized screenshots, and browser CSS pixels are not valid coordinate sources.',
    ],
    targetEntryTemplate,
    targetRows,
    contextRows,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.md');
  const svgPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-review-packet.svg');
  const entryTemplateJsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.json');
  const entryTemplateCsvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-target-entry-template.csv');

  await writeJson(jsonPath, report);
  await writeJson(entryTemplateJsonPath, targetEntryTemplate);
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'groupId',
      'block',
      'sharedBlock',
      'duplicateTargetBlock',
      'currentPathPointCount',
      'draftPathPointCount',
      'currentLabelPoint',
      'draftLabelPoint',
      'targetColorCoverage',
      'riskFlags',
      'evidenceCrop',
      'nextOperatorAction',
    ],
    ...targetRows.map((row) => [
      row.templateRowId,
      row.groupId,
      row.block,
      row.sharedBlock,
      row.duplicateTargetBlock,
      row.currentPathPointCount,
      row.draftPathPointCount,
      row.currentLabelPoint?.join(',') ?? '',
      row.draftLabelPoint?.join(',') ?? '',
      row.targetColorCoverage ?? '',
      row.riskFlags,
      row.evidenceCrop,
      row.nextOperatorAction,
    ]),
  ]);
  await writeCsv(entryTemplateCsvPath, [
    [
      'templateRowId',
      'editableTarget',
      'groupId',
      'block',
      'sharedBlock',
      'duplicateTargetBlock',
      'operatorDecision',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
      'operatorNote',
      'approvedRequiredFields',
    ],
    ...targetEntryTemplate.rows.map((row) => [
      row.templateRowId,
      row.editableTarget,
      row.groupId,
      row.block,
      row.sharedBlock,
      row.duplicateTargetBlock,
      row.operatorDecision,
      row.correctedPath,
      row.correctedLabelX,
      row.correctedLabelY,
      row.reviewer,
      row.reviewedAt,
      row.operatorNote,
      row.approvedRequiredFields.join('|'),
    ]),
  ]);

  await fs.writeFile(`${markdownPath}.tmp`, [
    '# Daegu P1 Paired Ownership T3/V Target Review Packet',
    '',
    `- packet version: \`${PACKET_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- source-copy target blocks: ${summary.sourceCopyTargetBlocks.map((block) => `\`${block}\``).join(', ')}`,
    `- target template rows: ${summary.targetTemplateRows}`,
    `- context-only rows: ${summary.contextOnlyRows}`,
    `- duplicate target blocks: ${summary.duplicateTargetBlocks.map((block) => `\`${block}\``).join(', ')}`,
    `- readiness status: \`${summary.readinessStatus}\``,
    `- pre-approval gate status: \`${summary.preApprovalGateStatus}\``,
    `- official image sha256: \`${summary.officialImageSha256}\``,
    `- target viewport: \`${summary.targetViewport.viewBox}\``,
    `- min target color coverage: ${summary.minTargetColorCoverage}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- writes operator input: ${summary.writesOperatorInput}`,
    `- writes production data: ${summary.writesProductionData}`,
    '',
    '## Source Policy',
    '',
    `- allowed coordinate source: \`${sourcePolicy.allowedCoordinateSource}\``,
    `- coordinate system: \`${sourcePolicy.coordinateSystem}\``,
    `- missing baseball data contract: \`${sourcePolicy.missingBaseballDataContract}\``,
    '- Draft paths and pixel components are evidence only.',
    '',
    '## Target Rows',
    '',
    markdownTable(
      ['template row', 'group', 'block', 'shared', 'duplicate', 'current pts', 'draft pts', 'current label', 'draft label', 'coverage', 'risk', 'next action'],
      targetRows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.groupId}\``,
        `\`${row.block}\``,
        String(row.sharedBlock),
        String(row.duplicateTargetBlock),
        row.currentPathPointCount,
        row.draftPathPointCount,
        row.currentLabelPoint?.join(',') ?? '-',
        row.draftLabelPoint?.join(',') ?? '-',
        row.targetColorCoverage ?? '-',
        row.riskFlags,
        row.nextOperatorAction,
      ]),
    ),
    '',
    '## Context Rows',
    '',
    markdownTable(
      ['template row', 'group', 'block', 'shared', 'role'],
      contextRows.map((row) => [
        `\`${row.templateRowId}\``,
        `\`${row.groupId}\``,
        `\`${row.block}\``,
        String(row.sharedBlock),
        `\`${row.sourceCopyRole}\``,
      ]),
    ),
    '',
    '## Operator Entry Template',
    '',
    `- \`${relativePath(entryTemplateJsonPath)}\``,
    `- \`${relativePath(entryTemplateCsvPath)}\``,
    '',
    '```json',
    JSON.stringify(targetEntryTemplate, null, 2),
    '```',
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Outputs',
    '',
    `- \`${relativePath(jsonPath)}\``,
    `- \`${relativePath(csvPath)}\``,
    `- \`${relativePath(markdownPath)}\``,
    `- \`${relativePath(svgPath)}\``,
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
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  const targetRowsByBlock = new Map();
  targetRows.forEach((row) => {
    if (!targetRowsByBlock.has(row.block)) targetRowsByBlock.set(row.block, row);
  });
  const currentPaths = [...targetRowsByBlock.values()].map((row) => (
    row.currentPath
      ? `<path d="${xmlEscape(row.currentPath)}" fill="#f97316" fill-opacity="0.18" stroke="#dc2626" stroke-width="2.5" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} current legacy path`)}</title></path>`
      : ''
  )).join('\n');
  const draftPaths = [...targetRowsByBlock.values()].map((row) => (
    row.draftPath
      ? `<path d="${xmlEscape(row.draftPath)}" fill="#0ea5e9" fill-opacity="0.14" stroke="#0284c7" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} official PNG draft evidence only`)}</title></path>`
      : ''
  )).join('\n');
  const labelMarkers = [...targetRowsByBlock.values()].flatMap((row) => {
    const current = row.currentLabelPoint;
    const draft = row.draftLabelPoint;
    return [
      current ? `<circle cx="${current[0]}" cy="${current[1]}" r="5" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" vector-effect="non-scaling-stroke"/>` : '',
      current ? `<text x="${current[0] + 8}" y="${current[1] - 8}" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="3" paint-order="stroke">${xmlEscape(`${row.block} current`)}</text>` : '',
      draft ? `<circle cx="${draft[0]}" cy="${draft[1]}" r="4" fill="#0284c7" stroke="#ffffff" stroke-width="1.5" vector-effect="non-scaling-stroke"/>` : '',
      draft ? `<text x="${draft[0] + 8}" y="${draft[1] + 14}" font-family="Arial, sans-serif" font-size="10" font-weight="900" fill="#0369a1" stroke="#ffffff" stroke-width="3" paint-order="stroke">${xmlEscape(`${row.block} draft`)}</text>` : '',
    ];
  }).join('\n');
  const contextMarkers = contextRows.map((row) => {
    const point = row.currentLabelPoint;
    if (!point) return '';
    return `<circle cx="${point[0]}" cy="${point[1]}" r="3.5" fill="#111827" stroke="#ffffff" stroke-width="1.2" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} context label`)}</title></circle>`;
  }).join('\n');
  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${Math.max(520, Math.round((viewport.height / viewport.width) * 1120))}" viewBox="${viewport.viewBox}">
    <image href="${xmlEscape(IMAGE_HREF)}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" opacity="0.78"/>
    <rect x="${viewport.minX + 2}" y="${viewport.minY + 2}" width="${viewport.width - 4}" height="${viewport.height - 4}" fill="none" stroke="#0f172a" stroke-width="1" vector-effect="non-scaling-stroke"/>
    ${currentPaths}
    ${draftPaths}
    ${contextMarkers}
    ${labelMarkers}
    <g transform="translate(${viewport.minX + 10} ${viewport.minY + 18})">
      <rect x="0" y="-14" width="230" height="58" rx="4" fill="#ffffff" fill-opacity="0.92" stroke="#cbd5e1" vector-effect="non-scaling-stroke"/>
      <text x="9" y="0" font-family="Arial, sans-serif" font-size="10" font-weight="900" fill="#0f172a">Daegu T3/V target review</text>
      <text x="9" y="16" font-family="Arial, sans-serif" font-size="9" fill="#334155">red=current legacy, blue=official PNG draft evidence</text>
      <text x="9" y="31" font-family="Arial, sans-serif" font-size="9" fill="#334155">targets: ${xmlEscape(SOURCE_TARGET_BLOCKS.join(' '))}; context dots are not source-copy targets</text>
    </g>
  </svg>
  `;
  await fs.writeFile(`${svgPath}.tmp`, overlaySvg, 'utf8');
  await fs.rename(`${svgPath}.tmp`, svgPath);

  console.log(JSON.stringify({
    status: summary.status,
    output: relativePath(markdownPath),
    targetTemplateRows: summary.targetTemplateRows,
    sourceCopyTargetBlocks: summary.sourceCopyTargetBlocks,
    contextOnlyRows: summary.contextOnlyRows,
    productionWriteAllowed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipT3VWarningReviewBoardRegression = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');
  const defaultOutputDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-paired-ownership-t3-v-warning-review-board-regression');

  const REGRESSION_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_WARNING_REVIEW_BOARD_REGRESSION_V1';
  const REVIEW_BOARD_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_WARNING_REVIEW_BOARD_V1';
  const CASES = [
    'default-warning-review-board',
    'blocked-readiness',
    'unmapped-warning-code',
    'warning-summary-row-mismatch',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const cloneJson = (value) => JSON.parse(JSON.stringify(value));

  const spawnNode = (scriptName, args) => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', path.join(scriptDir, scriptName), ...args],
      { cwd: frontendRoot, encoding: 'utf8' },
    );
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  };

  const includesPrefix = (values, prefix) => (values ?? []).some((value) => String(value).startsWith(prefix));

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', defaultOutputDir));

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const sourceReadiness = await readJson(
    path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-approval-readiness.json'),
  );

  const expected = {
    'default-warning-review-board': {
      exitCode: 0,
      status: 'review-board-ready-with-warnings',
      targetRows: 5,
      warningIssues: 12,
      rowSvgCount: 5,
    },
    'blocked-readiness': {
      exitCode: 1,
      status: 'review-board-blocked',
      requiredBlockerPrefix: 'READINESS_BLOCKED',
    },
    'unmapped-warning-code': {
      exitCode: 1,
      status: 'review-board-blocked',
      requiredBlockerPrefix: 'UNMAPPED_WARNING_CODE:UNKNOWN_REVIEW_CODE',
    },
    'warning-summary-row-mismatch': {
      exitCode: 1,
      status: 'review-board-blocked',
      requiredBlockerPrefix: 'WARNING_SUMMARY_ROW_MISMATCH:',
    },
  };

  const mutateReadiness = (caseName, readiness) => {
    const draft = cloneJson(readiness);
    if (caseName === 'blocked-readiness') {
      draft.summary.status = 'candidate-blocked';
      draft.summary.blockers = ['SIMULATED_READINESS_BLOCKER'];
    }
    if (caseName === 'unmapped-warning-code') {
      const row = draft.rows.find((candidateRow) => candidateRow.block === 'V1') ?? draft.rows[0];
      row.warnings.push('UNKNOWN_REVIEW_CODE');
      draft.summary.warnings.push(`${row.templateRowId}:UNKNOWN_REVIEW_CODE`);
    }
    if (caseName === 'warning-summary-row-mismatch') {
      draft.summary.warnings = [];
    }
    return draft;
  };

  const caseResults = [];
  for (const caseName of CASES) {
    const caseDir = path.join(outputDir, caseName);
    await fs.mkdir(caseDir, { recursive: true });
    const readinessPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-approval-readiness.json');
    await writeJson(readinessPath, mutateReadiness(caseName, sourceReadiness));

    const run = spawnNode('daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-warning-review-board', 
      '--readiness',
      readinessPath,
      '--output-dir',
      caseDir,
    ]);
    const reviewBoardPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.json');
    const reviewBoard = await readJson(reviewBoardPath);
    const combinedSvgPath = path.join(caseDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.svg');
    const combinedSvgExists = await fs.stat(combinedSvgPath).then(() => true, () => false);
    const expectation = expected[caseName];
    const failures = [];

    if (run.exitCode !== expectation.exitCode) failures.push(`EXIT_CODE:${run.exitCode}:${expectation.exitCode}`);
    if (reviewBoard.summary?.reviewBoardVersion !== REVIEW_BOARD_VERSION) failures.push(`REVIEW_BOARD_VERSION:${reviewBoard.summary?.reviewBoardVersion ?? ''}`);
    if (reviewBoard.summary?.status !== expectation.status) failures.push(`STATUS:${reviewBoard.summary?.status ?? ''}:${expectation.status}`);
    if (expectation.targetRows !== undefined && reviewBoard.summary?.targetRows !== expectation.targetRows) {
      failures.push(`TARGET_ROWS:${reviewBoard.summary?.targetRows}:${expectation.targetRows}`);
    }
    if (expectation.warningIssues !== undefined && reviewBoard.summary?.warningIssues !== expectation.warningIssues) {
      failures.push(`WARNING_ISSUES:${reviewBoard.summary?.warningIssues}:${expectation.warningIssues}`);
    }
    if (expectation.rowSvgCount !== undefined && reviewBoard.summary?.rowSvgCount !== expectation.rowSvgCount) {
      failures.push(`ROW_SVG_COUNT:${reviewBoard.summary?.rowSvgCount}:${expectation.rowSvgCount}`);
    }
    if (expectation.requiredBlockerPrefix && !includesPrefix(reviewBoard.summary?.blockers, expectation.requiredBlockerPrefix)) {
      failures.push(`MISSING_BLOCKER_PREFIX:${expectation.requiredBlockerPrefix}`);
    }
    if (reviewBoard.summary?.productionWriteAllowed !== false) failures.push('PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
    if (reviewBoard.summary?.writesOperatorInput !== false) failures.push('WRITES_OPERATOR_INPUT_NOT_FALSE');
    if (reviewBoard.summary?.writesCorrectionsTemplate !== false) failures.push('WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
    if (reviewBoard.summary?.writesProductionData !== false) failures.push('WRITES_PRODUCTION_DATA_NOT_FALSE');
    if (reviewBoard.summary?.dataFileChanged !== false) failures.push('DATA_FILE_CHANGED_NOT_FALSE');
    if (!combinedSvgExists) failures.push('COMBINED_SVG_MISSING');

    caseResults.push({
      caseName,
      exitCode: run.exitCode,
      status: reviewBoard.summary?.status ?? '',
      targetRows: reviewBoard.summary?.targetRows ?? null,
      warningIssues: reviewBoard.summary?.warningIssues ?? null,
      rowSvgCount: reviewBoard.summary?.rowSvgCount ?? null,
      productionWriteAllowed: reviewBoard.summary?.productionWriteAllowed ?? null,
      dataFileChanged: reviewBoard.summary?.dataFileChanged ?? null,
      blockers: reviewBoard.summary?.blockers ?? [],
      warnings: reviewBoard.summary?.warnings ?? [],
      failures,
    });
  }

  const failedCases = caseResults.filter((result) => result.failures.length > 0);
  const summary = {
    regressionVersion: REGRESSION_VERSION,
    status: failedCases.length === 0 ? 'passed' : 'failed',
    totalCases: caseResults.length,
    passedCases: caseResults.length - failedCases.length,
    failedCases: failedCases.length,
    productionWriteAllowed: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    dataFileChanged: false,
    blockers: failedCases.flatMap((result) => result.failures.map((failure) => `${result.caseName}:${failure}`)),
    warnings: [],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'Warning review board regression never writes operator input, corrections template source, production data, or src/data/daeguSeatData.ts.',
      'default-warning-review-board must preserve all 12 candidate-review-warning issues.',
      'blocked-readiness must remain blocked.',
      'unmapped-warning-code must remain blocked.',
      'warning-summary-row-mismatch must remain blocked.',
    ],
    cases: caseResults,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board-regression.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board-regression.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board-regression.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'caseName',
      'exitCode',
      'status',
      'targetRows',
      'warningIssues',
      'rowSvgCount',
      'productionWriteAllowed',
      'dataFileChanged',
      'failures',
    ],
    ...caseResults.map((result) => [
      result.caseName,
      result.exitCode,
      result.status,
      result.targetRows ?? '',
      result.warningIssues ?? '',
      result.rowSvgCount ?? '',
      result.productionWriteAllowed,
      result.dataFileChanged,
      result.failures.join(' '),
    ]),
  ]);

  await fs.writeFile(`${markdownPath}.tmp`, [
    '# Daegu T3/V Warning Review Board Regression',
    '',
    `- regression version: \`${summary.regressionVersion}\``,
    `- status: \`${summary.status}\``,
    `- cases: ${summary.passedCases}/${summary.totalCases}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    markdownTable(
      ['case', 'exit', 'status', 'rows', 'issues', 'row svgs', 'failures'],
      caseResults.map((result) => [
        `\`${result.caseName}\``,
        result.exitCode,
        `\`${result.status}\``,
        result.targetRows ?? '-',
        result.warningIssues ?? '-',
        result.rowSvgCount ?? '-',
        result.failures.length > 0 ? result.failures.map((failure) => `\`${failure}\``).join('<br>') : '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
  ].join('\n'), 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    totalCases: summary.totalCases,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status !== 'passed') process.exitCode = 1;
};

const runP1PairedOwnershipT3VWarningReviewBoard = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const REVIEW_BOARD_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_WARNING_REVIEW_BOARD_V1';
  const READINESS_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_T3_V_CANDIDATE_APPROVAL_READINESS_V1';
  const EXPECTED_SHA256 = '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0';
  const IMAGE_WIDTH = 1707;
  const IMAGE_HEIGHT = 2048;
  const IMAGE_HREF = '../../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png';
  const REQUIRED_APPROVAL_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ];

  const WARNING_GUIDANCE = {
    T3V_DUPLICATE_TARGET_KEEP_IDENTICAL: {
      severity: 'review',
      reason: 'T3-2 is intentionally present in two target rows because it belongs to the shared T3/V ownership boundary.',
      reviewPoint: 'Confirm both T3-2 rows use identical correctedPath and correctedLabelX/Y before approval.',
      nextAction: 'Approve both T3-2 rows with the same corrected values, or leave both rows PENDING.',
    },
    CANDIDATE_MATCHES_DRAFT_EVIDENCE_CONFIRM_OPERATOR_INTENT: {
      severity: 'review',
      reason: 'The candidate path matches image-based draft evidence, so it must stay evidence until an operator confirms the official PNG boundary.',
      reviewPoint: 'Compare candidate visualPath against the official PNG seat boundary and current legacy path.',
      nextAction: 'Copy the candidate values into corrected fields only when the boundary is visually correct and reviewer metadata is filled.',
    },
    CANDIDATE_COLOR_COVERAGE_REVIEW: {
      severity: 'review',
      reason: 'Candidate color coverage is below the review threshold, usually because small labels, white dividers, or antialias pixels are inside the polygon.',
      reviewPoint: 'Inspect whether the polygon follows the colored seat block rather than nearby text, gutters, or neighboring sections.',
      nextAction: 'Manually tighten vertices if the candidate captures non-seat pixels; otherwise approve with reviewer metadata.',
    },
    SMALL_BLOCK_TEXT_FRAGMENTATION_REVIEW: {
      severity: 'review',
      reason: 'The block is small enough that text and white divider pixels can fragment color evidence.',
      reviewPoint: 'Check candidate visualPath against the visible block outline and verify labelPoint remains inside the intended section.',
      nextAction: 'Adjust visualPath/hitPath manually if the label text or divider drove the outline.',
    },
  };

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(`${filePath}.tmp`, `${content}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const round = (value, digits = 2) => {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
  };

  const warningCode = (warning) => String(warning ?? '').split(':')[0];

  const warningValue = (warning) => {
    const parts = String(warning ?? '').split(':');
    return parts.length > 1 ? parts.slice(1).join(':') : '';
  };

  const pathBoundsOrNull = (pathData) => {
    const text = String(pathData ?? '').trim();
    if (!text) return null;
    try {
      const points = pathToPoints(text);
      if (points.length < 3) return null;
      const bounds = pathBounds(text);
      if (![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(Number.isFinite)) return null;
      return bounds;
    } catch {
      return null;
    }
  };

  const pointBounds = (point) => {
    if (!Array.isArray(point) || point.length < 2) return null;
    const x = Number(point[0]);
    const y = Number(point[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { minX: x, minY: y, maxX: x, maxY: y };
  };

  const unionBounds = (boundsList) => {
    const validBounds = boundsList.filter(Boolean);
    if (validBounds.length === 0) return { minX: 0, minY: 0, maxX: IMAGE_WIDTH, maxY: IMAGE_HEIGHT };
    return {
      minX: Math.min(...validBounds.map((bounds) => bounds.minX)),
      minY: Math.min(...validBounds.map((bounds) => bounds.minY)),
      maxX: Math.max(...validBounds.map((bounds) => bounds.maxX)),
      maxY: Math.max(...validBounds.map((bounds) => bounds.maxY)),
    };
  };

  const expandedViewport = (bounds, margin = 112) => {
    const minX = Math.max(0, bounds.minX - margin);
    const minY = Math.max(0, bounds.minY - margin);
    const maxX = Math.min(IMAGE_WIDTH, bounds.maxX + margin);
    const maxY = Math.min(IMAGE_HEIGHT, bounds.maxY + margin);
    const width = Math.max(370, maxX - minX);
    const height = Math.max(290, maxY - minY);
    const adjustedMinX = Math.max(0, Math.min(IMAGE_WIDTH - width, minX));
    const adjustedMinY = Math.max(0, Math.min(IMAGE_HEIGHT - height, minY));
    const adjustedWidth = Math.min(IMAGE_WIDTH, width);
    const adjustedHeight = Math.min(IMAGE_HEIGHT, height);
    return {
      minX: round(adjustedMinX),
      minY: round(adjustedMinY),
      width: round(adjustedWidth),
      height: round(adjustedHeight),
      viewBox: `${round(adjustedMinX)} ${round(adjustedMinY)} ${round(adjustedWidth)} ${round(adjustedHeight)}`,
    };
  };

  const rowViewport = (row) => expandedViewport(unionBounds([
    pathBoundsOrNull(row.currentPath),
    pathBoundsOrNull(row.candidateVisualPath),
    pathBoundsOrNull(row.candidateHitPath),
    pointBounds(row.candidateLabelPoint),
  ]), 72);

  const combinedViewport = (rows) => expandedViewport(unionBounds(rows.flatMap((row) => [
    pathBoundsOrNull(row.currentPath),
    pathBoundsOrNull(row.candidateVisualPath),
    pathBoundsOrNull(row.candidateHitPath),
    pointBounds(row.candidateLabelPoint),
  ])));

  const safeFileToken = (value) => String(value ?? 'row').replace(/[^a-zA-Z0-9_-]+/g, '_');

  const issueFromWarning = (row, warning) => {
    const code = warningCode(warning);
    const guidance = WARNING_GUIDANCE[code];
    return {
      templateRowId: row.templateRowId,
      rowNumber: row.rowNumber,
      groupId: row.groupId,
      block: row.block,
      warning,
      code,
      value: warningValue(warning),
      severity: guidance?.severity ?? 'unknown',
      reason: guidance?.reason ?? 'No guidance is defined for this warning code.',
      reviewPoint: guidance?.reviewPoint ?? 'Add explicit review guidance before this row can be handed to an operator.',
      nextAction: guidance?.nextAction ?? 'Block the review board until this warning code is mapped.',
    };
  };

  const renderSvg = ({ rows, viewport, title, subtitle, combined = false }) => {
    const height = Math.max(520, Math.round((viewport.height / viewport.width) * 1160));
    const rowLayers = rows.map((row, index) => {
      const yOffset = row.candidateLabelPoint?.[1] ?? viewport.minY;
      const warningText = row.issues.map((issue) => issue.code).join(', ');
      return [
        row.currentPath
          ? `<path d="${xmlEscape(row.currentPath)}" fill="#f97316" fill-opacity="0.13" stroke="#dc2626" stroke-width="2" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} current legacy`)}</title></path>`
          : '',
        row.candidateHitPath
          ? `<path d="${xmlEscape(row.candidateHitPath)}" fill="#a855f7" fill-opacity="0.08" stroke="#7e22ce" stroke-width="2" stroke-dasharray="7 4" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} candidate hitPath`)}</title></path>`
          : '',
        row.candidateVisualPath
          ? `<path d="${xmlEscape(row.candidateVisualPath)}" fill="#22c55e" fill-opacity="0.25" stroke="#16a34a" stroke-width="3" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${row.block} candidate visualPath`)}</title></path>`
          : '',
        row.candidateLabelPoint
          ? `<circle cx="${row.candidateLabelPoint[0]}" cy="${row.candidateLabelPoint[1]}" r="6" fill="#16a34a" stroke="#ffffff" stroke-width="1.8" vector-effect="non-scaling-stroke"/>`
          : '',
        row.candidateLabelPoint
          ? `<text x="${row.candidateLabelPoint[0] + 9}" y="${row.candidateLabelPoint[1] - 8}" font-family="Arial, sans-serif" font-size="${combined ? 11 : 13}" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="4" paint-order="stroke">${xmlEscape(`${index + 1}. ${row.block}`)}</text>`
          : '',
        combined && warningText
          ? `<text x="${viewport.minX + 14}" y="${yOffset + 24}" font-family="Arial, sans-serif" font-size="9" font-weight="800" fill="#92400e" stroke="#ffffff" stroke-width="3" paint-order="stroke">${xmlEscape(`${row.block}: ${warningText}`)}</text>`
          : '',
      ].join('\n');
    }).join('\n');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="${height}" viewBox="${viewport.viewBox}">
    <image href="${xmlEscape(IMAGE_HREF)}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" opacity="0.86"/>
    ${rowLayers}
    <g transform="translate(${viewport.minX + 10} ${viewport.minY + 18})">
      <rect x="0" y="-14" width="620" height="124" rx="4" fill="#ffffff" fill-opacity="0.95" stroke="#cbd5e1" vector-effect="non-scaling-stroke"/>
      <text x="10" y="0" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f172a">${xmlEscape(title)}</text>
      <text x="10" y="18" font-family="Arial, sans-serif" font-size="10" fill="#334155">${xmlEscape(subtitle)}</text>
      <text x="10" y="36" font-family="Arial, sans-serif" font-size="10" fill="#334155">green=candidate visualPath, purple=candidate hitPath, red=current legacy</text>
      <text x="10" y="54" font-family="Arial, sans-serif" font-size="10" fill="#334155">Operator must fill operatorDecision=APPROVED, correctedPath, correctedLabelX/Y, reviewer, reviewedAt.</text>
      <text x="10" y="72" font-family="Arial, sans-serif" font-size="10" fill="#334155">This board is read-only and never modifies src/data/daeguSeatData.ts.</text>
    </g>
  </svg>
  `;
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));
  const readinessPath = path.resolve(
    frontendRoot,
    argValue('--readiness', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-t3-v-candidate-approval-readiness.json')),
  );

  const readiness = await readJson(readinessPath);
  const blockers = [];
  const warnings = [];

  if (readiness.summary?.readinessVersion !== READINESS_VERSION) {
    blockers.push(`READINESS_VERSION_MISMATCH:${readiness.summary?.readinessVersion ?? ''}`);
  }
  if (readiness.summary?.officialImageSha256 !== EXPECTED_SHA256) {
    blockers.push(`OFFICIAL_IMAGE_SHA256_MISMATCH:${readiness.summary?.officialImageSha256 ?? ''}`);
  }
  if (readiness.summary?.status === 'candidate-blocked' || (readiness.summary?.blockers ?? []).length > 0) {
    blockers.push('READINESS_BLOCKED');
  }
  if (readiness.summary?.productionWriteAllowed !== false) blockers.push('READINESS_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (readiness.summary?.writesOperatorInput !== false) blockers.push('READINESS_WRITES_OPERATOR_INPUT_NOT_FALSE');
  if (readiness.summary?.writesCorrectionsTemplate !== false) blockers.push('READINESS_WRITES_CORRECTIONS_TEMPLATE_NOT_FALSE');
  if (readiness.summary?.writesProductionData !== false) blockers.push('READINESS_WRITES_PRODUCTION_DATA_NOT_FALSE');
  if (readiness.summary?.dataFileChanged !== false) blockers.push('READINESS_DATA_FILE_CHANGED_NOT_FALSE');
  if (readiness.summary?.autoApprovedRows !== 0) blockers.push(`READINESS_AUTO_APPROVED_ROWS:${readiness.summary?.autoApprovedRows ?? ''}`);

  const rows = Array.isArray(readiness.rows) ? readiness.rows : [];
  if (rows.length !== 5) blockers.push(`REVIEW_BOARD_ROW_COUNT_MISMATCH:${rows.length}:5`);

  const reviewRows = rows.map((row) => {
    const issues = (row.warnings ?? []).map((warning) => issueFromWarning(row, warning));
    const unmapped = issues.filter((issue) => issue.severity === 'unknown');
    unmapped.forEach((issue) => blockers.push(`UNMAPPED_WARNING_CODE:${issue.code}`));
    if ((row.blockers ?? []).length > 0) blockers.push(`${row.templateRowId}:READINESS_ROW_BLOCKERS_PRESENT`);
    return {
      templateRowId: row.templateRowId,
      rowNumber: row.rowNumber,
      groupId: row.groupId,
      block: row.block,
      duplicateTargetBlock: row.duplicateTargetBlock === true,
      candidateVisualPath: row.candidateVisualPath,
      candidateHitPath: row.candidateHitPath,
      candidateLabelPoint: row.candidateLabelPoint,
      candidateColorCoverage: row.candidateColorCoverage,
      currentPath: row.currentPath,
      readyForOperatorReview: row.readyForOperatorReview === true,
      requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
      issues,
    };
  });

  const rowWarningCount = reviewRows.reduce((sum, row) => sum + row.issues.length, 0);
  const summaryWarningCount = (readiness.summary?.warnings ?? []).length;
  if (rowWarningCount !== summaryWarningCount) {
    blockers.push(`WARNING_SUMMARY_ROW_MISMATCH:${summaryWarningCount}:${rowWarningCount}`);
  }

  const t3Rows = reviewRows.filter((row) => row.block === 'T3-2');
  if (t3Rows.length !== 2) blockers.push(`T3_DUPLICATE_REVIEW_ROW_COUNT:${t3Rows.length}`);
  if (t3Rows.length === 2) {
    warnings.push('T3 duplicate approval rows must stay identical during operator entry.');
  }

  const allIssues = reviewRows.flatMap((row) => row.issues);
  const status = blockers.length > 0
    ? 'review-board-blocked'
    : allIssues.length > 0
      ? 'review-board-ready-with-warnings'
      : 'review-board-ready';

  const rowSvgDir = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board');
  await fs.mkdir(rowSvgDir, { recursive: true });

  const rowSvgOutputs = [];
  for (const row of reviewRows) {
    const svgName = `row-${String(row.rowNumber).padStart(2, '0')}-${safeFileToken(row.block)}.svg`;
    const svgPath = path.join(rowSvgDir, svgName);
    await fs.writeFile(`${svgPath}.tmp`, renderSvg({
      rows: [row],
      viewport: rowViewport(row),
      title: `Daegu T3/V warning review: ${row.block}`,
      subtitle: `${row.templateRowId} / warnings=${row.issues.length}`,
    }), 'utf8');
    await fs.rename(`${svgPath}.tmp`, svgPath);
    rowSvgOutputs.push(path.relative(frontendRoot, svgPath));
  }

  const combinedSvgPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.svg');
  await fs.writeFile(`${combinedSvgPath}.tmp`, renderSvg({
    rows: reviewRows,
    viewport: combinedViewport(reviewRows),
    title: 'Daegu T3/V candidate warning review board',
    subtitle: `${status} / rows=${reviewRows.length} / warning issues=${allIssues.length}`,
    combined: true,
  }), 'utf8');
  await fs.rename(`${combinedSvgPath}.tmp`, combinedSvgPath);

  const summary = {
    reviewBoardVersion: REVIEW_BOARD_VERSION,
    status,
    readinessVersion: readiness.summary?.readinessVersion ?? '',
    readinessStatus: readiness.summary?.status ?? '',
    officialImageSha256: readiness.summary?.officialImageSha256 ?? '',
    sha256MatchesExpected: readiness.summary?.officialImageSha256 === EXPECTED_SHA256,
    targetRows: reviewRows.length,
    warningIssues: allIssues.length,
    warningCodes: [...new Set(allIssues.map((issue) => issue.code))],
    duplicateTargetRows: t3Rows.length,
    rowSvgCount: rowSvgOutputs.length,
    productionWriteAllowed: false,
    dataFileChanged: false,
    writesOperatorInput: false,
    writesCorrectionsTemplate: false,
    writesProductionData: false,
    readyForOperatorReview: status !== 'review-board-blocked',
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    inputs: {
      readiness: path.relative(frontendRoot, readinessPath),
    },
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    warningGuidance: WARNING_GUIDANCE,
    safetyContract: [
      'Warning review board is read-only.',
      'It never writes operator input.',
      'It never writes corrections template source.',
      'It never writes production data.',
      'It never modifies src/data/daeguSeatData.ts.',
      'It does not auto-fill correctedPath, correctedLabelX/Y, reviewer, reviewedAt, or operatorDecision=APPROVED.',
      'Candidate paths remain evidence until an operator explicitly approves them.',
    ],
    rows: reviewRows,
    rowSvgOutputs,
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-t3-v-warning-review-board.md');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'templateRowId',
      'rowNumber',
      'block',
      'warningCode',
      'warningValue',
      'reason',
      'reviewPoint',
      'nextAction',
    ],
    ...allIssues.map((issue) => [
      issue.templateRowId,
      issue.rowNumber,
      issue.block,
      issue.code,
      issue.value,
      issue.reason,
      issue.reviewPoint,
      issue.nextAction,
    ]),
  ]);

  await fs.writeFile(`${markdownPath}.tmp`, [
    '# Daegu T3/V Warning Review Board',
    '',
    `- review board version: \`${summary.reviewBoardVersion}\``,
    `- status: \`${summary.status}\``,
    `- readiness status: \`${summary.readinessStatus}\``,
    `- target rows: ${summary.targetRows}`,
    `- warning issues: ${summary.warningIssues}`,
    `- duplicate target rows: ${summary.duplicateTargetRows}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    `- data file changed: ${summary.dataFileChanged}`,
    '',
    '## Warning Issues',
    '',
    markdownTable(
      ['row', 'template row', 'block', 'code', 'value', 'review point', 'next action'],
      allIssues.map((issue) => [
        issue.rowNumber,
        `\`${issue.templateRowId}\``,
        `\`${issue.block}\``,
        `\`${issue.code}\``,
        issue.value || '-',
        issue.reviewPoint,
        issue.nextAction,
      ]),
    ),
    '',
    '## Row SVGs',
    '',
    ...rowSvgOutputs.map((output) => `- \`${output}\``),
    '',
    '## Outputs',
    '',
    `- \`${path.relative(frontendRoot, jsonPath)}\``,
    `- \`${path.relative(frontendRoot, csvPath)}\``,
    `- \`${path.relative(frontendRoot, markdownPath)}\``,
    `- \`${path.relative(frontendRoot, combinedSvgPath)}\``,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
  ].join('\n'), 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    combinedSvg: path.relative(frontendRoot, combinedSvgPath),
    rowSvgCount: summary.rowSvgCount,
    targetRows: summary.targetRows,
    warningIssues: summary.warningIssues,
    warningCodes: summary.warningCodes,
    duplicateTargetRows: summary.duplicateTargetRows,
    productionWriteAllowed: summary.productionWriteAllowed,
    writesOperatorInput: summary.writesOperatorInput,
    writesCorrectionsTemplate: summary.writesCorrectionsTemplate,
    writesProductionData: summary.writesProductionData,
    dataFileChanged: summary.dataFileChanged,
    blockers: summary.blockers.length,
    warnings: summary.warnings.length,
  }, null, 2));

  if (summary.status === 'review-board-blocked') process.exitCode = 1;
};

const runP1PairedOwnershipTemplateGate = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const GATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_TEMPLATE_GATE_V1';
  const TEMPLATE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_OPERATOR_TEMPLATE_V1';
  const SOURCE_SCOPE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_SOURCE_SCOPE_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE']);
  const EXPECTED = {
    groupCount: 3,
    groupTemplateRows: 16,
    uniqueAffectedBlocks: 12,
  };

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

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

  const samePoint = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;

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

  const segmentsCrossWithInterior = (a, b, c, d) => {
    if (!segmentsIntersect(a, b, c, d)) return false;
    return !samePoint(a, c) && !samePoint(a, d) && !samePoint(b, c) && !samePoint(b, d);
  };

  const hasSelfIntersection = (points) => {
    for (let first = 0; first < points.length; first += 1) {
      const firstNext = (first + 1) % points.length;
      for (let second = first + 1; second < points.length; second += 1) {
        const secondNext = (second + 1) % points.length;
        const adjacent = first === second || firstNext === second || secondNext === first;
        if (adjacent) continue;
        if (segmentsCrossWithInterior(points[first], points[firstNext], points[second], points[secondNext])) return true;
      }
    }
    return false;
  };

  const polygonOverlap = (left, right) => {
    if (left.length < 3 || right.length < 3) return false;
    if (left.some((point) => pointInPolygon(point, right))) return true;
    if (right.some((point) => pointInPolygon(point, left))) return true;
    for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
      const leftNext = (leftIndex + 1) % left.length;
      for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
        const rightNext = (rightIndex + 1) % right.length;
        if (segmentsCrossWithInterior(left[leftIndex], left[leftNext], right[rightIndex], right[rightNext])) return true;
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
    if (points.length < 4) reasons.push('PATH_REQUIRES_AT_LEAST_FOUR_POINTS');
    if (points.some(([x, y]) => x < 0 || y < 0 || x > 1707 || y > 2048)) reasons.push('PATH_OUTSIDE_DAEGU_IMAGE_BOUNDS');
    if (points.length >= 3 && polygonArea(points) < 16) reasons.push('PATH_AREA_TOO_SMALL');
    if (points.length >= 4 && hasSelfIntersection(points)) reasons.push('PATH_SELF_INTERSECTION');

    return { reasons, points };
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const templatePath = path.resolve(
    frontendRoot,
    argValue('--template', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-operator-template.json')),
  );
  const sourceScopePath = path.resolve(
    frontendRoot,
    argValue('--source-scope', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json')),
  );
  const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p1ReportDir));

  const template = await readJson(templatePath);
  const sourceScope = await readJson(sourceScopePath);
  const templateRows = Array.isArray(template.corrections) ? template.corrections : [];
  const scopeGroups = Array.isArray(sourceScope.groups) ? sourceScope.groups : [];
  const blockers = [];
  const warnings = [];

  if (template.templateVersion !== TEMPLATE_VERSION) blockers.push(`TEMPLATE_VERSION_MISMATCH:${template.templateVersion ?? ''}`);
  if (template.sourceScopeVersion !== SOURCE_SCOPE_VERSION) blockers.push(`TEMPLATE_SOURCE_SCOPE_VERSION_MISMATCH:${template.sourceScopeVersion ?? ''}`);
  if (template.targetBatchId !== TARGET_BATCH_ID) blockers.push(`TEMPLATE_BATCH_MISMATCH:${template.targetBatchId ?? ''}`);
  if (template.productionWriteAllowed !== false) blockers.push('TEMPLATE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (template.templateOnly !== true) blockers.push('TEMPLATE_ONLY_NOT_TRUE');
  if (sourceScope.summary?.sourceScopeVersion !== SOURCE_SCOPE_VERSION) {
    blockers.push(`SOURCE_SCOPE_VERSION_MISMATCH:${sourceScope.summary?.sourceScopeVersion ?? ''}`);
  }
  if (sourceScope.summary?.productionWriteAllowed !== false) blockers.push('SOURCE_SCOPE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');

  const templateRowIds = templateRows.map((row) => row.templateRowId);
  const duplicateTemplateRowIds = templateRowIds.filter((rowId, index, values) => values.indexOf(rowId) !== index);
  if (duplicateTemplateRowIds.length > 0) blockers.push(`DUPLICATE_TEMPLATE_ROW_ID:${[...new Set(duplicateTemplateRowIds)].join(' ')}`);
  if (templateRows.length !== EXPECTED.groupTemplateRows) {
    blockers.push(`TEMPLATE_ROW_COUNT_MISMATCH:${templateRows.length}:${EXPECTED.groupTemplateRows}`);
  }
  if (scopeGroups.length !== EXPECTED.groupCount) warnings.push(`GATE_GROUP_COUNT_CHANGED:${scopeGroups.length}:${EXPECTED.groupCount}`);
  if (sourceScope.summary?.uniqueAffectedBlocks !== EXPECTED.uniqueAffectedBlocks) {
    warnings.push(`GATE_UNIQUE_AFFECTED_BLOCKS_CHANGED:${sourceScope.summary?.uniqueAffectedBlocks ?? ''}:${EXPECTED.uniqueAffectedBlocks}`);
  }

  const normalSelectableBlocks = DAEGU_BLOCKS.filter(isDaeguNormalSelectableSeat);
  const sourceRowsByTemplateRowId = new Map((sourceScope.rows ?? []).map((row) => [row.templateRowId, row]));
  const allRows = templateRows.map((row) => {
    const sourceRow = sourceRowsByTemplateRowId.get(row.templateRowId);
    return {
      ...row,
      sourceRow,
      decision: normalizeDecision(row.operatorDecision),
    };
  });

  const rows = allRows.map((row) => {
    const reasons = [];
    const rowWarnings = [];
    const decision = row.decision;
    const missingFields = [];
    const sourceRow = row.sourceRow;
    const currentPathKey = normalizePath(row.currentPath || sourceRow?.currentPath);

    if (!sourceRow) reasons.push('SOURCE_SCOPE_ROW_MISSING');
    if (!DECISION_OPTIONS.has(decision)) reasons.push('INVALID_OPERATOR_DECISION');
    if (sourceRow && row.block !== sourceRow.block) reasons.push(`SOURCE_SCOPE_BLOCK_MISMATCH:${row.block}:${sourceRow.block}`);
    if (sourceRow && row.groupId !== sourceRow.groupId) reasons.push(`SOURCE_SCOPE_GROUP_MISMATCH:${row.groupId}:${sourceRow.groupId}`);

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
      if (correctedPathKey && correctedPathKey === currentPathKey) reasons.push('CORRECTED_PATH_REUSES_CURRENT_PATH');

      const labelX = Number(row.correctedLabelX);
      const labelY = Number(row.correctedLabelY);
      if (!Number.isFinite(labelX)) reasons.push('CORRECTED_LABEL_X_NOT_NUMERIC');
      if (!Number.isFinite(labelY)) reasons.push('CORRECTED_LABEL_Y_NOT_NUMERIC');
      if (pathValidation.points.length >= 3 && Number.isFinite(labelX) && Number.isFinite(labelY)) {
        if (!pointInPolygon([labelX, labelY], pathValidation.points)) reasons.push('CORRECTED_LABEL_OUTSIDE_PATH');
      }
      if (row.reviewedAt && Number.isNaN(Date.parse(row.reviewedAt))) reasons.push('REVIEWED_AT_NOT_PARSEABLE');
    } else if (!isBlank(row.correctedPath)) {
      rowWarnings.push('CORRECTED_PATH_FILLED_FOR_NON_APPROVED_ROW');
    }

    return {
      templateRowId: row.templateRowId,
      groupId: row.groupId,
      blockId: row.blockId,
      block: row.block,
      blockRole: row.blockRole,
      decision,
      approved: decision === 'APPROVED',
      reasons,
      warnings: rowWarnings,
      correctedPathPointCount: pathValidation.points.length,
      correctedPathPoints: pathValidation.points,
    };
  });

  const groupRows = scopeGroups.map((group) => {
    const rowsForGroup = rows.filter((row) => row.groupId === group.groupId);
    const templateRowsForGroup = allRows.filter((row) => row.groupId === group.groupId);
    const expectedBlocks = group.affectedBlocks ?? [];
    const actualBlocks = rowsForGroup.map((row) => row.block);
    const approvedRows = rowsForGroup.filter((row) => row.approved);
    const groupReasons = [];

    expectedBlocks
      .filter((block) => !actualBlocks.includes(block))
      .forEach((block) => groupReasons.push(`GROUP_TEMPLATE_BLOCK_MISSING:${block}`));
    actualBlocks
      .filter((block) => !expectedBlocks.includes(block))
      .forEach((block) => groupReasons.push(`GROUP_TEMPLATE_UNEXPECTED_BLOCK:${block}`));
    if (approvedRows.length > 0 && approvedRows.length < expectedBlocks.length) {
      groupReasons.push(`GROUP_PARTIAL_APPROVAL_BLOCKED:${approvedRows.length}:${expectedBlocks.length}`);
    }

    const groupAffectedBlocks = new Set(expectedBlocks);
    const approvedVirtualBlocks = templateRowsForGroup
      .filter((row) => normalizeDecision(row.operatorDecision) === 'APPROVED')
      .map((row) => ({
        id: row.blockId,
        block: row.block,
        imageGeometry: {
          d: row.correctedPath,
          hitPath: row.correctedPath,
        },
      }));
    const topHitBlocks = [
      ...normalSelectableBlocks.filter((block) => !groupAffectedBlocks.has(block.block)),
      ...approvedVirtualBlocks,
    ];
    const labelPointsByTemplateRowId = new Map(templateRowsForGroup.map((row) => {
      const approved = normalizeDecision(row.operatorDecision) === 'APPROVED';
      return [
        row.templateRowId,
        {
          block: row.block,
          x: Number(approved ? row.correctedLabelX : row.currentLabelX),
          y: Number(approved ? row.correctedLabelY : row.currentLabelY),
        },
      ];
    }));

    rowsForGroup.filter((row) => row.approved).forEach((row) => {
      const templateRow = templateRowsForGroup.find((candidate) => candidate.templateRowId === row.templateRowId);
      const labelX = Number(templateRow?.correctedLabelX);
      const labelY = Number(templateRow?.correctedLabelY);
      if (Number.isFinite(labelX) && Number.isFinite(labelY)) {
        const topHitBlock = topHitBlockAt(topHitBlocks, [labelX, labelY]);
        if (topHitBlock?.id !== row.blockId) {
          row.reasons.push(`GROUP_CORRECTED_LABEL_TOP_HIT_MISMATCH:${topHitBlock?.block ?? 'none'}`);
        }
      }
      labelPointsByTemplateRowId.forEach((labelPoint, otherTemplateRowId) => {
        if (otherTemplateRowId === row.templateRowId) return;
        if (!Number.isFinite(labelPoint.x) || !Number.isFinite(labelPoint.y)) return;
        if (pointInPolygon([labelPoint.x, labelPoint.y], row.correctedPathPoints)) {
          row.reasons.push(`GROUP_CORRECTED_PATH_CAPTURES_OTHER_LABEL:${labelPoint.block}`);
        }
      });
    });

    for (let leftIndex = 0; leftIndex < approvedRows.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < approvedRows.length; rightIndex += 1) {
        const left = approvedRows[leftIndex];
        const right = approvedRows[rightIndex];
        if (polygonOverlap(left.correctedPathPoints, right.correctedPathPoints)) {
          left.reasons.push(`GROUP_CORRECTED_PATH_OVERLAP:${right.block}`);
          right.reasons.push(`GROUP_CORRECTED_PATH_OVERLAP:${left.block}`);
        }
      }
    }

    return {
      groupId: group.groupId,
      conflictClass: group.conflictClass,
      affectedBlocks: expectedBlocks,
      targetBlocks: group.targetBlocks ?? [],
      approvedRows: approvedRows.length,
      totalRows: rowsForGroup.length,
      completeApproval: approvedRows.length === expectedBlocks.length,
      groupReasons,
    };
  });

  const invalidRows = rows.filter((row) => row.reasons.length > 0);
  const approvedRows = rows.filter((row) => row.approved);
  const nonApprovedFilledRows = rows.filter((row) => row.warnings.includes('CORRECTED_PATH_FILLED_FOR_NON_APPROVED_ROW'));
  const invalidGroups = groupRows.filter((group) => group.groupReasons.length > 0);
  const completeGroups = groupRows.filter((group) => group.completeApproval);

  if (invalidRows.length > 0) blockers.push(`PAIRED_OWNERSHIP_TEMPLATE_INVALID_ROWS:${invalidRows.map((row) => row.templateRowId).join(' ')}`);
  if (invalidGroups.length > 0) blockers.push(`PAIRED_OWNERSHIP_TEMPLATE_INVALID_GROUPS:${invalidGroups.map((group) => group.groupId).join(' ')}`);
  if (nonApprovedFilledRows.length > 0) warnings.push(`PAIRED_OWNERSHIP_NON_APPROVED_FILLED_PATH:${nonApprovedFilledRows.map((row) => row.templateRowId).join(' ')}`);
  if (approvedRows.length === 0) warnings.push('PAIRED_OWNERSHIP_TEMPLATE_HAS_NO_APPROVED_ROWS');
  if (approvedRows.length > 0 && completeGroups.length < groupRows.length) {
    warnings.push(`PAIRED_OWNERSHIP_REMAINING_GROUPS:${completeGroups.length}:${groupRows.length}`);
  }

  const templateSha256 = await sha256File(templatePath);
  const sourceScopeSha256 = await sha256File(sourceScopePath);
  const status = blockers.length > 0
    ? 'blocked'
    : approvedRows.length === 0
      ? 'waiting-for-operator'
      : completeGroups.length === groupRows.length
        ? 'ready-for-source-copy'
        : 'waiting-for-remaining-groups';

  const summary = {
    gateVersion: GATE_VERSION,
    status,
    template: path.relative(frontendRoot, templatePath),
    templateSha256,
    sourceScope: path.relative(frontendRoot, sourceScopePath),
    sourceScopeSha256,
    totalRows: rows.length,
    approvedRows: approvedRows.length,
    invalidRows: invalidRows.length,
    groupCount: groupRows.length,
    completeApprovalGroups: completeGroups.length,
    invalidGroups: invalidGroups.length,
    nonApprovedFilledRows: nonApprovedFilledRows.length,
    productionWriteAllowed: false,
    writesSourceInput: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    expected: EXPECTED,
    safetyContract: [
      'This paired ownership template gate is read-only.',
      'It never writes source input or src/data/daeguSeatData.ts.',
      'APPROVED rows must contain correctedPath, correctedLabelX, correctedLabelY, reviewer, and reviewedAt.',
      'APPROVED rows must not copy currentPath into correctedPath.',
      'A group with only some approved rows is blocked.',
      'A group approval must pass label-inside, label top-hit, self-intersection, bounds, other-label capture, and overlap checks.',
      'Production write remains forbidden until a future source-copy/write path and full P1 gates pass.',
    ],
    groups: groupRows,
    rows: rows.map((row) => ({
      templateRowId: row.templateRowId,
      groupId: row.groupId,
      blockId: row.blockId,
      block: row.block,
      blockRole: row.blockRole,
      decision: row.decision,
      approved: row.approved,
      readyForSourceCopy: row.approved && row.reasons.length === 0,
      reasons: row.reasons,
      warnings: row.warnings,
      correctedPathPointCount: row.correctedPathPointCount,
    })),
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-template-gate.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-template-gate.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-template-gate.md');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    ['templateRowId', 'groupId', 'block', 'decision', 'approved', 'readyForSourceCopy', 'reasons', 'warnings', 'correctedPathPointCount'],
    ...report.rows.map((row) => [
      row.templateRowId,
      row.groupId,
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
    '# Daegu P1 Paired Ownership Template Gate',
    '',
    `- gate version: \`${GATE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- total rows: ${summary.totalRows}`,
    `- approved rows: ${summary.approvedRows}`,
    `- invalid rows: ${summary.invalidRows}`,
    `- complete approval groups: ${summary.completeApprovalGroups}/${summary.groupCount}`,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Groups',
    '',
    markdownTable(
      ['group', 'approved', 'total', 'complete', 'reasons'],
      groupRows.map((group) => [
        `\`${group.groupId}\``,
        group.approvedRows,
        group.totalRows,
        String(group.completeApproval),
        group.groupReasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Rows',
    '',
    markdownTable(
      ['template row', 'decision', 'ready', 'reasons'],
      report.rows.map((row) => [
        `\`${row.templateRowId}\``,
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

  console.log(`p1_paired_ownership_template_gate_json:${jsonPath}`);
  console.log(`p1_paired_ownership_template_gate_csv:${csvPath}`);
  console.log(`p1_paired_ownership_template_gate_markdown:${markdownPath}`);
  console.log(`status:${summary.status} rows=${summary.totalRows} approved=${summary.approvedRows} invalid=${summary.invalidRows} completeGroups=${summary.completeApprovalGroups}/${summary.groupCount}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runP1PairedOwnershipTracingPack = async () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultP1ReportDir = path.join(frontendRoot, 'reports/stadium/daegu-p1-operator');

  const TRACING_PACK_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_TRACING_PACK_V1';
  const ENTRY_SHEET_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_ENTRY_SHEET_V1';
  const SOURCE_SCOPE_VERSION = 'DAEGU_P1_PAIRED_OWNERSHIP_SOURCE_SCOPE_V1';
  const TARGET_BATCH_ID = 'BATCH_2_P1';
  const VIEWBOX = {
    width: DAEGU_SEATMAP_IMAGE.imageWidth,
    height: DAEGU_SEATMAP_IMAGE.imageHeight,
  };
  const EXPECTED = {
    groupCount: 3,
    groupTemplateRows: 16,
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
    return sanitized || 'group';
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

  const boundsForLabel = (x, y) => {
    const labelX = Number(x);
    const labelY = Number(y);
    if (!Number.isFinite(labelX) || !Number.isFinite(labelY)) return null;
    return { minX: labelX, minY: labelY, maxX: labelX, maxY: labelY };
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
    return lines.join('\n');
  };

  const labelCircle = (row) => {
    const x = Number(row.currentLabelX);
    const y = Number(row.currentLabelY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return '';
    const className = row.blockRole === 'TARGET' ? 'target-dot' : 'context-dot';
    return [
      `<circle class="${className}" cx="${x}" cy="${y}" r="${row.blockRole === 'TARGET' ? 7 : 5}" />`,
      `<text class="block-label" x="${x + 9}" y="${y - 7}">${xmlEscape(row.block)}</text>`,
    ].join('\n');
  };

  const buildGroupSvg = (group, groupRows, outputFilePath, officialImagePath) => {
    const crop = mergeBounds([
      ...groupRows.map((row) => boundsForPath(row.currentPath)),
      ...groupRows.map((row) => boundsForLabel(row.currentLabelX, row.currentLabelY)),
    ]);
    const imageHref = path.relative(path.dirname(outputFilePath), officialImagePath);
    const pathElements = groupRows.map((row) => {
      const className = row.blockRole === 'TARGET' ? 'target-current' : 'context-current';
      return `<path class="${className}" d="${xmlEscape(row.currentPath)}"><title>${xmlEscape(`${row.templateRowId} current path`)}</title></path>`;
    });
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}" width="${crop.width}" height="${crop.height}">`,
      '<style>',
      '.official-image { opacity: 0.93; }',
      '.grid { stroke: #0f172a; stroke-opacity: 0.18; stroke-width: 1; vector-effect: non-scaling-stroke; }',
      '.grid-label { font: 700 10px Arial, sans-serif; fill: #334155; stroke: #fff; stroke-width: 2; paint-order: stroke; }',
      '.target-current { fill: rgba(220, 38, 38, 0.24); stroke: #dc2626; stroke-width: 5; vector-effect: non-scaling-stroke; }',
      '.context-current { fill: rgba(37, 99, 235, 0.13); stroke: #2563eb; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.target-dot { fill: #dc2626; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.context-dot { fill: #2563eb; stroke: #fff; stroke-width: 2; vector-effect: non-scaling-stroke; }',
      '.block-label { font: 900 18px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 4; paint-order: stroke; }',
      '.title { font: 900 24px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 5; paint-order: stroke; }',
      '.note { font: 800 15px Arial, sans-serif; fill: #991b1b; stroke: #fff; stroke-width: 4; paint-order: stroke; }',
      '</style>',
      `<image class="official-image" href="${xmlEscape(imageHref)}" x="0" y="0" width="${VIEWBOX.width}" height="${VIEWBOX.height}" preserveAspectRatio="none" />`,
      gridLines(crop, 25),
      ...pathElements,
      ...groupRows.map(labelCircle).filter(Boolean),
      `<text class="title" x="${crop.x + 16}" y="${crop.y + 30}">${xmlEscape(group.groupId)}</text>`,
      `<text class="note" x="${crop.x + 16}" y="${crop.y + 54}">${xmlEscape('Red=target row, blue=context row. Trace correctedPath manually on official PNG.')}</text>`,
      `<text class="note" x="${crop.x + 16}" y="${crop.y + 76}">${xmlEscape('Approve every row in this group together or leave the group pending.')}</text>`,
      '</svg>',
    ].join('\n');
  };

  const buildOverviewSvg = (groups, rows, outputFilePath, officialImagePath) => {
    const imageHref = path.relative(path.dirname(outputFilePath), officialImagePath);
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" width="${VIEWBOX.width}" height="${VIEWBOX.height}">`,
      '<style>',
      '.official-image { opacity: 0.86; }',
      '.target-current { fill: rgba(220, 38, 38, 0.22); stroke: #dc2626; stroke-width: 5; vector-effect: non-scaling-stroke; }',
      '.context-current { fill: rgba(37, 99, 235, 0.10); stroke: #2563eb; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.target-dot { fill: #dc2626; stroke: #fff; stroke-width: 3; vector-effect: non-scaling-stroke; }',
      '.context-dot { fill: #2563eb; stroke: #fff; stroke-width: 2; vector-effect: non-scaling-stroke; }',
      '.block-label { font: 900 22px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 5; paint-order: stroke; }',
      '.title { font: 900 30px Arial, sans-serif; fill: #111827; stroke: #fff; stroke-width: 6; paint-order: stroke; }',
      '</style>',
      `<image class="official-image" href="${xmlEscape(imageHref)}" x="0" y="0" width="${VIEWBOX.width}" height="${VIEWBOX.height}" preserveAspectRatio="none" />`,
      ...rows.map((row) => `<path class="${row.blockRole === 'TARGET' ? 'target-current' : 'context-current'}" d="${xmlEscape(row.currentPath)}" data-row="${xmlEscape(row.templateRowId)}" />`),
      ...rows.map(labelCircle).filter(Boolean),
      '<text class="title" x="24" y="42">Daegu P1 paired ownership tracing pack</text>',
      `<text class="title" x="24" y="78">${xmlEscape(groups.map((group) => group.groupId).join(' / '))}</text>`,
      '</svg>',
    ].join('\n');
  };

  const p1ReportDir = path.resolve(frontendRoot, argValue('--p1-report-dir', defaultP1ReportDir));
  const outputDir = path.resolve(
    frontendRoot,
    argValue('--output-dir', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-tracing-pack')),
  );
  const sourceScopePath = path.resolve(
    frontendRoot,
    argValue('--source-scope', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-source-scope.json')),
  );
  const entrySheetPath = path.resolve(
    frontendRoot,
    argValue('--entry-sheet', path.join(p1ReportDir, 'daegu-seatmap-p1-paired-ownership-entry-sheet.json')),
  );
  const officialImagePath = path.resolve(frontendRoot, DAEGU_SEATMAP_IMAGE.imagePath);

  const sourceScope = await readJson(sourceScopePath);
  const entrySheet = await readJson(entrySheetPath);
  const groups = Array.isArray(sourceScope.groups) ? sourceScope.groups : [];
  const rows = Array.isArray(entrySheet.rows) ? entrySheet.rows : [];
  const blockers = [];
  const warnings = [];

  if (sourceScope.summary?.sourceScopeVersion !== SOURCE_SCOPE_VERSION) {
    blockers.push(`SOURCE_SCOPE_VERSION_MISMATCH:${sourceScope.summary?.sourceScopeVersion ?? ''}`);
  }
  if (entrySheet.summary?.entrySheetVersion !== ENTRY_SHEET_VERSION) {
    blockers.push(`ENTRY_SHEET_VERSION_MISMATCH:${entrySheet.summary?.entrySheetVersion ?? ''}`);
  }
  if (entrySheet.summary?.targetBatchId !== TARGET_BATCH_ID) blockers.push(`ENTRY_SHEET_BATCH_MISMATCH:${entrySheet.summary?.targetBatchId ?? ''}`);
  if (sourceScope.summary?.productionWriteAllowed !== false) blockers.push('SOURCE_SCOPE_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (entrySheet.summary?.productionWriteAllowed !== false) blockers.push('ENTRY_SHEET_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  if (!(await fileExists(officialImagePath))) blockers.push(`OFFICIAL_IMAGE_MISSING:${DAEGU_SEATMAP_IMAGE.imagePath}`);
  if ((entrySheet.summary?.blockers ?? []).length > 0) blockers.push('ENTRY_SHEET_HAS_BLOCKERS');
  if (groups.length !== EXPECTED.groupCount) warnings.push(`TRACING_GROUP_COUNT_CHANGED:${groups.length}:${EXPECTED.groupCount}`);
  if (rows.length !== EXPECTED.groupTemplateRows) blockers.push(`TRACING_ROW_COUNT_MISMATCH:${rows.length}:${EXPECTED.groupTemplateRows}`);

  await fs.mkdir(outputDir, { recursive: true });

  const groupReports = [];
  for (const group of groups) {
    const groupRows = rows.filter((row) => row.groupId === group.groupId);
    const svgFileName = `${String(groupReports.length + 1).padStart(2, '0')}-${sanitizeFilePart(group.groupId)}.svg`;
    const svgPath = path.join(outputDir, svgFileName);
    if (groupRows.length !== (group.affectedBlocks ?? []).length) {
      blockers.push(`TRACING_GROUP_ROW_COUNT_MISMATCH:${group.groupId}:${groupRows.length}:${(group.affectedBlocks ?? []).length}`);
    }
    if (groupRows.some((row) => !row.currentPath)) blockers.push(`TRACING_GROUP_CURRENT_PATH_MISSING:${group.groupId}`);
    await fs.writeFile(svgPath, `${buildGroupSvg(group, groupRows, svgPath, officialImagePath)}\n`, 'utf8');
    groupReports.push({
      groupId: group.groupId,
      title: group.title,
      targetBlocks: group.targetBlocks ?? [],
      affectedBlocks: group.affectedBlocks ?? [],
      rowCount: groupRows.length,
      tracingSvg: path.relative(frontendRoot, svgPath),
      overlay: group.overlay,
      operatorAction: group.operatorAction,
    });
  }

  const overviewSvgPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-tracing-overview.svg');
  await fs.writeFile(overviewSvgPath, `${buildOverviewSvg(groups, rows, overviewSvgPath, officialImagePath)}\n`, 'utf8');

  const status = blockers.length > 0 ? 'blocked' : 'ready-for-operator-tracing';
  const summary = {
    tracingPackVersion: TRACING_PACK_VERSION,
    status,
    targetBatchId: TARGET_BATCH_ID,
    sourceScope: path.relative(frontendRoot, sourceScopePath),
    entrySheet: path.relative(frontendRoot, entrySheetPath),
    officialImage: DAEGU_SEATMAP_IMAGE.imagePath,
    imageSha256: DAEGU_SEATMAP_IMAGE.imageSha256,
    groupCount: groupReports.length,
    totalRows: rows.length,
    groupSvgRows: groupReports.length,
    overviewSvg: path.relative(frontendRoot, overviewSvgPath),
    rowsWaitingForOperator: rows.filter((row) => row.operatorDecision !== 'APPROVED').length,
    productionWriteAllowed: false,
    sourceOfTruth: false,
    writesSourceInput: false,
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
      'Group SVG files are operator evidence only and are not source-of-truth geometry.',
      'It never writes source input.',
      'It never writes the main corrections template.',
      'It never modifies src/data/daeguSeatData.ts.',
      'Operator-approved correctedPath values must be entered in the paired ownership operator template and validated by the template gate.',
    ],
    groups: groupReports,
    rows: rows.map((row) => ({
      templateRowId: row.templateRowId,
      groupId: row.groupId,
      block: row.block,
      blockRole: row.blockRole,
      currentLabelPoint: row.currentLabelPoint,
      currentPathPointCount: row.currentPathPointCount,
      operatorDecision: row.operatorDecision,
      missingApprovalFields: row.missingApprovalFields,
      editableTarget: row.editableTarget,
    })),
  };

  const jsonPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-tracing-pack.json');
  const csvPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-tracing-pack.csv');
  const markdownPath = path.join(outputDir, 'daegu-seatmap-p1-paired-ownership-tracing-pack.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    ['groupId', 'rowCount', 'targetBlocks', 'affectedBlocks', 'tracingSvg', 'overlay', 'operatorAction'],
    ...groupReports.map((group) => [
      group.groupId,
      group.rowCount,
      group.targetBlocks.join(' '),
      group.affectedBlocks.join(' '),
      group.tracingSvg,
      group.overlay,
      group.operatorAction,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Daegu P1 Paired Ownership Tracing Pack',
    '',
    `- tracing pack version: \`${TRACING_PACK_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- groups: ${summary.groupCount}`,
    `- rows: ${summary.totalRows}`,
    `- official image: \`${summary.officialImage}\``,
    `- image sha256: \`${summary.imageSha256}\``,
    `- overview svg: \`${summary.overviewSvg}\``,
    `- production write allowed: ${summary.productionWriteAllowed}`,
    '',
    '## Safety Contract',
    '',
    ...report.safetyContract.map((line) => `- ${line}`),
    '',
    '## Group SVGs',
    '',
    markdownTable(
      ['group', 'rows', 'target', 'affected', 'tracing svg', 'operator action'],
      groupReports.map((group) => [
        `\`${group.groupId}\``,
        group.rowCount,
        group.targetBlocks.map((block) => `\`${block}\``).join(' ') || '-',
        group.affectedBlocks.map((block) => `\`${block}\``).join(' ') || '-',
        `\`${group.tracingSvg}\``,
        group.operatorAction,
      ]),
    ),
    '',
    '## Operator Rules',
    '',
    '- Red paths are target rows; blue paths are context rows.',
    '- Trace correctedPath manually against the official PNG.',
    '- Approve every row in a group together, or leave the group pending.',
    '- Run `npm run stadium:daegu:p1-paired-ownership-entry-preflight` after editing operator fields.',
    '- Run `npm run stadium:daegu:p1-paired-ownership-template-gate` before any source-copy discussion.',
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

  console.log(JSON.stringify({
    status: summary.status,
    output: path.relative(frontendRoot, markdownPath),
    overviewSvg: summary.overviewSvg,
    groups: summary.groupCount,
    rows: summary.totalRows,
    productionWriteAllowed: false,
    blockers: blockers.length,
    warnings: warnings.length,
  }, null, 2));

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const TASKS = {
  "p1-paired-ownership-apply-plan": runP1PairedOwnershipApplyPlan,
  "p1-paired-ownership-approval-packet": runP1PairedOwnershipApprovalPacket,
  "p1-paired-ownership-correction-package": runP1PairedOwnershipCorrectionPackage,
  "p1-paired-ownership-entry-preflight": runP1PairedOwnershipEntryPreflight,
  "p1-paired-ownership-entry-sheet": runP1PairedOwnershipEntrySheet,
  "p1-paired-ownership-gate-regression": runP1PairedOwnershipGateRegression,
  "p1-paired-ownership-neighbor-approval-dry-run": runP1PairedOwnershipNeighborApprovalDryRun,
  "p1-paired-ownership-neighbor-image-draft": runP1PairedOwnershipNeighborImageDraft,
  "p1-paired-ownership-source-copy-dry-run": runP1PairedOwnershipSourceCopyDryRun,
  "p1-paired-ownership-source-scope": runP1PairedOwnershipSourceScope,
  "p1-paired-ownership-t1-approval-readiness": runP1PairedOwnershipT1ApprovalReadiness,
  "p1-paired-ownership-t1-coordinate-draft": runP1PairedOwnershipT1CoordinateDraft,
  "p1-paired-ownership-t1-input-pack": runP1PairedOwnershipT1InputPack,
  "p1-paired-ownership-t3-v-apply-plan-regression": runP1PairedOwnershipT3VApplyPlanRegression,
  "p1-paired-ownership-t3-v-apply-plan": runP1PairedOwnershipT3VApplyPlan,
  "p1-paired-ownership-t3-v-approval-handoff": runP1PairedOwnershipT3VApprovalHandoff,
  "p1-paired-ownership-t3-v-approval-input-gate-regression": runP1PairedOwnershipT3VApprovalInputGateRegression,
  "p1-paired-ownership-t3-v-approval-input-gate": runP1PairedOwnershipT3VApprovalInputGate,
  "p1-paired-ownership-t3-v-approval-input-guide-regression": runP1PairedOwnershipT3VApprovalInputGuideRegression,
  "p1-paired-ownership-t3-v-approval-input-guide": runP1PairedOwnershipT3VApprovalInputGuide,
  "p1-paired-ownership-t3-v-approval-readiness": runP1PairedOwnershipT3VApprovalReadiness,
  "p1-paired-ownership-t3-v-approved-dry-run-regression": runP1PairedOwnershipT3VApprovedDryRunRegression,
  "p1-paired-ownership-t3-v-approved-dry-run": runP1PairedOwnershipT3VApprovedDryRun,
  "p1-paired-ownership-t3-v-candidate-approval-readiness-regression": runP1PairedOwnershipT3VCandidateApprovalReadinessRegression,
  "p1-paired-ownership-t3-v-candidate-approval-readiness": runP1PairedOwnershipT3VCandidateApprovalReadiness,
  "p1-paired-ownership-t3-v-candidate-corrections-regression": runP1PairedOwnershipT3VCandidateCorrectionsRegression,
  "p1-paired-ownership-t3-v-candidate-corrections": runP1PairedOwnershipT3VCandidateCorrections,
  "p1-paired-ownership-t3-v-coordinate-entry-pack": runP1PairedOwnershipT3VCoordinateEntryPack,
  "p1-paired-ownership-t3-v-evidence-quality-audit": runP1PairedOwnershipT3VEvidenceQualityAudit,
  "p1-paired-ownership-t3-v-operator-entry-brief": runP1PairedOwnershipT3VOperatorEntryBrief,
  "p1-paired-ownership-t3-v-operator-handoff": runP1PairedOwnershipT3VOperatorHandoff,
  "p1-paired-ownership-t3-v-pre-approval-gate": runP1PairedOwnershipT3VPreApprovalGate,
  "p1-paired-ownership-t3-v-readiness-regression": runP1PairedOwnershipT3VReadinessRegression,
  "p1-paired-ownership-t3-v-source-copy-dry-run": runP1PairedOwnershipT3VSourceCopyDryRun,
  "p1-paired-ownership-t3-v-source-copy-regression": runP1PairedOwnershipT3VSourceCopyRegression,
  "p1-paired-ownership-t3-v-target-entry-gate-regression": runP1PairedOwnershipT3VTargetEntryGateRegression,
  "p1-paired-ownership-t3-v-target-entry-gate": runP1PairedOwnershipT3VTargetEntryGate,
  "p1-paired-ownership-t3-v-target-review-packet": runP1PairedOwnershipT3VTargetReviewPacket,
  "p1-paired-ownership-t3-v-warning-review-board-regression": runP1PairedOwnershipT3VWarningReviewBoardRegression,
  "p1-paired-ownership-t3-v-warning-review-board": runP1PairedOwnershipT3VWarningReviewBoard,
  "p1-paired-ownership-template-gate": runP1PairedOwnershipTemplateGate,
  "p1-paired-ownership-tracing-pack": runP1PairedOwnershipTracingPack,
};

export const runDaeguP1PairedOwnershipTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Daegu p1 paired-ownership task: ${task}. Available tasks: ${available}`);
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
  await runDaeguP1PairedOwnershipTask(task, args);
}
