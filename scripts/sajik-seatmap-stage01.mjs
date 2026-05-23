import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runStage01131ApplyPathStatus = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const STATUS_VERSION = 'SAJIK_STAGE01_131_APPLY_PATH_STATUS_V1';
  const DECISION_PACKET_VERSION = 'SAJIK_STAGE01_131_DECISION_PACKET_V1';
  const TARGET_SECTION_ID = '131';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const TARGET_SOURCE_FILE = 'src/data/sajikSeatData.ts';
  const TARGET_APPLY_PATH_STATUS_JSON = '131-apply-path-status.json';
  const TARGET_APPLY_PATH_STATUS_MARKDOWN = '131-apply-path-status.md';
  const TARGET_OFFICIAL_CROP_PNG = '131-official-crop.png';
  const TARGET_OFFICIAL_OVERLAY_CROP_PNG = '131-official-overlay-crop.png';
  const TARGET_OFFICIAL_EDGE_CROP_PNG = '131-official-edge-crop.png';
  const REQUIRED_TARGET_REVIEW_PACKET_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1';
  const REQUIRED_TARGET_APPROVAL_GATE_VERSION = 'SAJIK_STAGE01_TARGET_APPROVAL_GATE_V1';
  const REQUIRED_OPERATOR_INPUT_INTAKE_GATE_VERSION = 'SAJIK_STAGE01_OPERATOR_INPUT_INTAKE_GATE_V1';
  const REQUIRED_TARGET_APPLY_PRECHECK_VERSION = 'SAJIK_STAGE01_TARGET_APPLY_PRECHECK_V1';
  const REQUIRED_LIFECYCLE_SMOKE_VERSION = 'SAJIK_STAGE01_131_LIFECYCLE_SMOKE_V1';
  const REQUIRED_TARGET_REVIEW_EVIDENCE_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1';
  const OFFICIAL_IMAGE_SHA256 = 'e9cb51ccf57a754ddf066a95c6c789d65edf8dff167f432fd35fe809e9dc80aa';
  const MAP_VERSION = 'BUSAN_SAJIK_2026_MANUAL_POLYGON_V2';
  const COORDINATE_SYSTEM = 'SVG viewBox 0 0 960 640';
  const WRITABLE_SOURCE_FIELDS = [
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.labelX',
    'imageGeometry.labelY',
  ];
  const LOCKED_SOURCE_FIELDS = [
    'imageGeometry.visualPath',
    'imageGeometry.geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
  ];
  const REQUIRED_ENTRY_FIELDS = [
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const REQUIRED_APPROVAL_INPUT_FIELDS = ['operatorDecision=APPROVED', ...REQUIRED_ENTRY_FIELDS];
  const REQUIRED_KEEP_CURRENT_FIELDS = ['reviewer', 'reviewedAt', 'operatorNote'];
  const FORBIDDEN_KEEP_CURRENT_FIELDS = ['correctedPath', 'correctedLabelX', 'correctedLabelY'];
  const REQUIRED_IMAGE_ANALYSIS_ARTIFACT_FIELDS = [
    'officialCropPng',
    'overlayCropPng',
    'edgeCropPng',
  ];
  const REQUIRED_IMAGE_ANALYSIS_ARTIFACT_FILES = {
    officialCropPng: TARGET_OFFICIAL_CROP_PNG,
    overlayCropPng: TARGET_OFFICIAL_OVERLAY_CROP_PNG,
    edgeCropPng: TARGET_OFFICIAL_EDGE_CROP_PNG,
  };
  const REQUIRED_REVIEW_ASSERTIONS = [
    'Opened the target review overlay SVG with the official PNG background visible.',
    'Checked the official image hash and mapVersion in this packet.',
    'Compared current hitPath, current label point, pixel component bbox, and adjacent section boundaries.',
    'Did not copy pixel candidate overlayPath, browser CSS pixels, resized screenshot coordinates, or external seatmap coordinates.',
    'Placed correctedLabelX/Y inside the operator-traced correctedPath.',
  ];
  const REQUIRED_READY_FOR_PREWRITE_CRITERIA = [
    'operatorDecision=APPROVED',
    'correctedPath is a valid single closed M/L/Z polygon path',
    'correctedLabelX and correctedLabelY are finite numbers inside correctedPath',
    'reviewer and reviewedAt are present',
    'operatorNote documents official PNG manual review',
    'target approval gate reports readyForPrewrite=true',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const stageDir = path.resolve(
    frontendRoot,
    argValue('--stage-dir', path.join('reports/stadium/sajik-stage01-operator')),
  );
  const targetSectionId = String(argValue('--target', argValue('--section', TARGET_SECTION_ID))).trim();
  const targetDir = path.join(stageDir, 'targets');
  const defaultTargetFile = (suffix) => `${targetSectionId}-${suffix}`;
  const targetApplyPathStatusFile = targetSectionId === TARGET_SECTION_ID
    ? TARGET_APPLY_PATH_STATUS_JSON
    : defaultTargetFile('apply-path-status.json');
  const targetApplyPathStatusMarkdown = targetSectionId === TARGET_SECTION_ID
    ? TARGET_APPLY_PATH_STATUS_MARKDOWN
    : defaultTargetFile('apply-path-status.md');

  const paths = {
    targetReviewPacket: path.join(targetDir, defaultTargetFile('review-packet.json')),
    targetEntryTemplate: path.join(targetDir, defaultTargetFile('entry-template.json')),
    operatorInputIntakeGate: path.join(stageDir, 'sajik-seatmap-stage01-operator-input-intake-gate.json'),
    targetApprovalGate: path.join(targetDir, defaultTargetFile('approval-gate.json')),
    targetApplyPrecheck: path.join(targetDir, defaultTargetFile('apply-precheck.json')),
    lifecycleSmoke: path.join(stageDir, 'target-lifecycle-smoke/sajik-seatmap-stage01-131-lifecycle-smoke.json'),
  };
  const jsonPath = path.join(targetDir, targetApplyPathStatusFile);
  const markdownPath = path.join(targetDir, targetApplyPathStatusMarkdown);

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const readRequiredJson = async (label, filePath, blockers) => {
    try {
      return await readJson(filePath);
    } catch (error) {
      blockers.push(`REPORT_MISSING:${label}:${relativePath(filePath)}`);
      return null;
    }
  };

  const reportStatus = (report) => report?.summary?.status ?? report?.status ?? 'missing';

  const reportVersion = (report, fieldName) => report?.summary?.[fieldName] ?? report?.[fieldName];

  const sameStringArray = (actual, expected) => (
    Array.isArray(actual)
    && actual.length === expected.length
    && expected.every((value, index) => actual[index] === value)
  );

  const includesAll = (actual, expected) => (
    Array.isArray(actual)
    && expected.every((value) => actual.includes(value))
  );

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const normalizePath = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

  const isBlank = (value) => value === '' || value === null || value === undefined;

  const pushVersionBlocker = (blockers, label, actual, expected) => {
    if (actual !== expected) {
      blockers.push(`${label}_VERSION_MISMATCH:${actual ?? ''}:${expected}`);
    }
  };

  const pushFalseFlagBlocker = (blockers, label, report) => {
    const summary = report?.summary ?? report ?? {};
    [
      'sourceDataWritePerformed',
      'productionWriteAllowed',
      'productionDataChanged',
      'writesOperatorInput',
      'writesProductionData',
    ].forEach((flagName) => {
      if (flagName in summary && summary[flagName] !== false) {
        blockers.push(`${label}_${flagName}_MUST_BE_FALSE`);
      }
    });
  };

  const blockers = [];
  const warnings = [];

  if (targetSectionId !== TARGET_SECTION_ID) {
    blockers.push(`UNSUPPORTED_TARGET:${targetSectionId}`);
  }

  const targetReviewPacket = await readRequiredJson('target-review-packet', paths.targetReviewPacket, blockers);
  const targetEntryTemplate = await readRequiredJson('target-entry-template', paths.targetEntryTemplate, blockers);
  const operatorInputIntakeGate = await readRequiredJson('operator-input-intake-gate', paths.operatorInputIntakeGate, blockers);
  const targetApprovalGate = await readRequiredJson('target-approval-gate', paths.targetApprovalGate, blockers);
  const targetApplyPrecheck = await readRequiredJson('target-apply-precheck', paths.targetApplyPrecheck, blockers);
  const lifecycleSmoke = await readRequiredJson('131-lifecycle-smoke', paths.lifecycleSmoke, blockers);

  pushVersionBlocker(blockers, 'TARGET_REVIEW_PACKET', reportVersion(targetReviewPacket, 'packetVersion'), REQUIRED_TARGET_REVIEW_PACKET_VERSION);
  pushVersionBlocker(blockers, 'OPERATOR_INPUT_INTAKE_GATE', reportVersion(operatorInputIntakeGate, 'operatorInputIntakeGateVersion'), REQUIRED_OPERATOR_INPUT_INTAKE_GATE_VERSION);
  pushVersionBlocker(blockers, 'TARGET_APPROVAL_GATE', reportVersion(targetApprovalGate, 'gateVersion'), REQUIRED_TARGET_APPROVAL_GATE_VERSION);
  pushVersionBlocker(blockers, 'TARGET_APPLY_PRECHECK', reportVersion(targetApplyPrecheck, 'targetApplyPrecheckVersion'), REQUIRED_TARGET_APPLY_PRECHECK_VERSION);
  pushVersionBlocker(blockers, 'LIFECYCLE_SMOKE', lifecycleSmoke?.version, REQUIRED_LIFECYCLE_SMOKE_VERSION);

  [
    ['TARGET_REVIEW_PACKET', targetReviewPacket],
    ['OPERATOR_INPUT_INTAKE_GATE', operatorInputIntakeGate],
    ['TARGET_APPROVAL_GATE', targetApprovalGate],
    ['TARGET_APPLY_PRECHECK', targetApplyPrecheck],
    ['LIFECYCLE_SMOKE', lifecycleSmoke],
  ].forEach(([label, report]) => pushFalseFlagBlocker(blockers, label, report));

  if (targetReviewPacket?.summary?.targetSectionId !== targetSectionId) {
    blockers.push(`TARGET_REVIEW_PACKET_SECTION_MISMATCH:${targetReviewPacket?.summary?.targetSectionId ?? ''}`);
  }
  if (targetReviewPacket?.summary?.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`TARGET_REVIEW_PACKET_STAGE_MISMATCH:${targetReviewPacket?.summary?.targetStage ?? ''}`);
  }
  if (targetApprovalGate?.summary?.targetSectionId !== targetSectionId) {
    blockers.push(`TARGET_APPROVAL_GATE_SECTION_MISMATCH:${targetApprovalGate?.summary?.targetSectionId ?? ''}`);
  }
  if (targetApprovalGate?.summary?.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`TARGET_APPROVAL_GATE_STAGE_MISMATCH:${targetApprovalGate?.summary?.targetStage ?? ''}`);
  }
  if (targetApplyPrecheck?.summary?.targetSectionId !== targetSectionId) {
    blockers.push(`TARGET_APPLY_PRECHECK_SECTION_MISMATCH:${targetApplyPrecheck?.summary?.targetSectionId ?? ''}`);
  }
  if (targetApplyPrecheck?.summary?.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`TARGET_APPLY_PRECHECK_STAGE_MISMATCH:${targetApplyPrecheck?.summary?.targetStage ?? ''}`);
  }
  if (targetApplyPrecheck?.summary?.targetSourceFile !== TARGET_SOURCE_FILE) {
    blockers.push(`TARGET_APPLY_PRECHECK_SOURCE_FILE_MISMATCH:${targetApplyPrecheck?.summary?.targetSourceFile ?? ''}`);
  }
  if (lifecycleSmoke?.targetSectionId !== targetSectionId) {
    blockers.push(`LIFECYCLE_SMOKE_SECTION_MISMATCH:${lifecycleSmoke?.targetSectionId ?? ''}`);
  }
  if (targetReviewPacket?.summary?.officialImageSha256 !== OFFICIAL_IMAGE_SHA256) {
    blockers.push(`TARGET_REVIEW_PACKET_IMAGE_HASH_MISMATCH:${targetReviewPacket?.summary?.officialImageSha256 ?? ''}`);
  }
  if (targetApprovalGate?.summary?.officialImageSha256 !== OFFICIAL_IMAGE_SHA256) {
    blockers.push(`TARGET_APPROVAL_GATE_IMAGE_HASH_MISMATCH:${targetApprovalGate?.summary?.officialImageSha256 ?? ''}`);
  }
  if (targetReviewPacket?.summary?.mapVersion !== MAP_VERSION) {
    blockers.push(`TARGET_REVIEW_PACKET_MAP_VERSION_MISMATCH:${targetReviewPacket?.summary?.mapVersion ?? ''}`);
  }
  if (targetApprovalGate?.summary?.mapVersion !== MAP_VERSION) {
    blockers.push(`TARGET_APPROVAL_GATE_MAP_VERSION_MISMATCH:${targetApprovalGate?.summary?.mapVersion ?? ''}`);
  }
  if (targetReviewPacket?.officialPngEvidence?.evidenceVersion !== REQUIRED_TARGET_REVIEW_EVIDENCE_VERSION) {
    blockers.push(`TARGET_REVIEW_EVIDENCE_VERSION_MISMATCH:${targetReviewPacket?.officialPngEvidence?.evidenceVersion ?? ''}`);
  }
  if (targetReviewPacket?.officialPngEvidence?.officialImageSha256 !== OFFICIAL_IMAGE_SHA256) {
    blockers.push(`TARGET_REVIEW_EVIDENCE_IMAGE_HASH_MISMATCH:${targetReviewPacket?.officialPngEvidence?.officialImageSha256 ?? ''}`);
  }
  if (targetReviewPacket?.officialPngEvidence?.mapVersion !== MAP_VERSION) {
    blockers.push(`TARGET_REVIEW_EVIDENCE_MAP_VERSION_MISMATCH:${targetReviewPacket?.officialPngEvidence?.mapVersion ?? ''}`);
  }
  if (targetReviewPacket?.officialPngEvidence?.coordinateSystem !== COORDINATE_SYSTEM) {
    blockers.push(`TARGET_REVIEW_EVIDENCE_COORDINATE_SYSTEM_MISMATCH:${targetReviewPacket?.officialPngEvidence?.coordinateSystem ?? ''}`);
  }
  if (targetReviewPacket?.officialPngEvidence?.pixelComponentReference?.candidateReferenceOnly !== true) {
    blockers.push('TARGET_REVIEW_PIXEL_COMPONENT_NOT_REFERENCE_ONLY');
  }
  if (targetReviewPacket?.officialPngEvidence?.imageAnalysisArtifacts?.referenceOnly !== true) {
    blockers.push('TARGET_REVIEW_IMAGE_ANALYSIS_NOT_REFERENCE_ONLY');
  }
  if (targetReviewPacket?.officialPngEvidence?.imageAnalysisArtifacts?.sourceImageVerified !== true) {
    blockers.push('TARGET_REVIEW_IMAGE_ANALYSIS_SOURCE_NOT_VERIFIED');
  }
  if (targetReviewPacket?.operatorInputChecklist?.allowedCoordinateSource !== 'operator-provided official 2026 Sajik PNG coordinates only') {
    blockers.push(`OPERATOR_INPUT_CHECKLIST_COORDINATE_SOURCE_MISMATCH:${targetReviewPacket?.operatorInputChecklist?.allowedCoordinateSource ?? ''}`);
  }
  if (targetReviewPacket?.operatorInputChecklist?.coordinateSystem !== COORDINATE_SYSTEM) {
    blockers.push(`OPERATOR_INPUT_CHECKLIST_COORDINATE_SYSTEM_MISMATCH:${targetReviewPacket?.operatorInputChecklist?.coordinateSystem ?? ''}`);
  }
  if (!sameStringArray(targetReviewPacket?.operatorInputChecklist?.requiredApprovalFields, REQUIRED_APPROVAL_INPUT_FIELDS)) {
    blockers.push('OPERATOR_INPUT_CHECKLIST_REQUIRED_FIELDS_MISMATCH');
  }
  if (!includesAll(targetReviewPacket?.operatorInputChecklist?.requiredReviewAssertions, REQUIRED_REVIEW_ASSERTIONS)) {
    blockers.push('OPERATOR_INPUT_CHECKLIST_REVIEW_ASSERTIONS_INCOMPLETE');
  }
  if (!includesAll(targetReviewPacket?.operatorInputChecklist?.readyForPrewriteCriteria, REQUIRED_READY_FOR_PREWRITE_CRITERIA)) {
    blockers.push('OPERATOR_INPUT_CHECKLIST_READY_CRITERIA_INCOMPLETE');
  }
  if (!includesAll(targetReviewPacket?.operatorInputChecklist?.forbiddenCoordinateSources, [
    'AI coordinate prediction',
    'browser CSS pixels',
    'resized screenshots',
    'web-search-based baseball data',
  ])) {
    blockers.push('OPERATOR_INPUT_CHECKLIST_FORBIDDEN_SOURCES_INCOMPLETE');
  }
  REQUIRED_IMAGE_ANALYSIS_ARTIFACT_FIELDS.forEach((field) => {
    if (!targetReviewPacket?.operatorInputChecklist?.[field]) {
      blockers.push(`OPERATOR_INPUT_CHECKLIST_ARTIFACT_MISSING:${field}`);
    }
  });
  Object.entries(REQUIRED_IMAGE_ANALYSIS_ARTIFACT_FILES).forEach(([field, fileName]) => {
    const artifactPath = targetReviewPacket?.operatorInputChecklist?.[field]
      ?? targetReviewPacket?.summary?.targetImageAnalysisArtifacts?.[field]
      ?? '';
    if (!String(artifactPath).endsWith(fileName)) {
      blockers.push(`OPERATOR_INPUT_CHECKLIST_ARTIFACT_FILE_MISMATCH:${field}:${artifactPath}`);
    }
  });
  if (!sameStringArray(targetApplyPrecheck?.summary?.writableSourceFields, WRITABLE_SOURCE_FIELDS)) {
    blockers.push('TARGET_APPLY_PRECHECK_WRITABLE_FIELDS_MISMATCH');
  }
  if (!sameStringArray(targetApplyPrecheck?.summary?.lockedSourceFields, LOCKED_SOURCE_FIELDS)) {
    blockers.push('TARGET_APPLY_PRECHECK_LOCKED_FIELDS_MISMATCH');
  }
  if (lifecycleSmoke?.status !== 'passed') {
    blockers.push(`LIFECYCLE_SMOKE_NOT_PASSED:${lifecycleSmoke?.status ?? ''}`);
  }
  if (lifecycleSmoke?.lifecycleContract?.manualPatchAction !== 'MANUAL_PATCH_REQUIRED') {
    blockers.push(`LIFECYCLE_SMOKE_MANUAL_PATCH_ACTION_MISMATCH:${lifecycleSmoke?.lifecycleContract?.manualPatchAction ?? ''}`);
  }
  if (lifecycleSmoke?.lifecycleContract?.readinessStatus !== 'APPROVED_NOT_APPLIED') {
    blockers.push(`LIFECYCLE_SMOKE_READINESS_STATUS_MISMATCH:${lifecycleSmoke?.lifecycleContract?.readinessStatus ?? ''}`);
  }
  if (lifecycleSmoke?.sourceFieldContract?.patchAllowedFieldsOnly !== true) {
    blockers.push('LIFECYCLE_SMOKE_PATCH_ALLOWED_FIELDS_ONLY_NOT_TRUE');
  }
  if (lifecycleSmoke?.sourceFieldContract?.writableFragmentLockedTokensAbsent !== true) {
    blockers.push('LIFECYCLE_SMOKE_LOCKED_TOKENS_PRESENT_IN_WRITABLE_FRAGMENT');
  }

  const intakeRows = Array.isArray(operatorInputIntakeGate?.rows) ? operatorInputIntakeGate.rows : [];
  const intakeRow = intakeRows.find((row) => row.sectionId === targetSectionId) ?? null;
  const decision = normalizeDecision(targetApprovalGate?.summary?.selectedDecision ?? targetEntryTemplate?.operatorDecision);
  const editableFieldsBlank = REQUIRED_ENTRY_FIELDS.every((field) => isBlank(targetEntryTemplate?.[field]));
  const readyForPrewrite = targetApprovalGate?.summary?.readyForPrewrite === true;
  const manualPatchRequired = targetApplyPrecheck?.summary?.manualPatchRequired === true;
  const targetApplied = targetApplyPrecheck?.summary?.targetApplied === true;
  const lifecycleFixtureReady = lifecycleSmoke?.status === 'passed'
    && lifecycleSmoke?.flow?.targetApprovalStatus === 'ready-for-prewrite'
    && lifecycleSmoke?.flow?.manualPatchPlanStatus === 'ready-for-manual-apply'
    && lifecycleSmoke?.lifecycleContract?.manualPatchAction === 'MANUAL_PATCH_REQUIRED'
    && lifecycleSmoke?.lifecycleContract?.readinessStatus === 'APPROVED_NOT_APPLIED';
  const officialPngEvidenceReady = targetReviewPacket?.officialPngEvidence?.evidenceVersion === REQUIRED_TARGET_REVIEW_EVIDENCE_VERSION
    && targetReviewPacket?.officialPngEvidence?.officialImageSha256 === OFFICIAL_IMAGE_SHA256
    && targetReviewPacket?.officialPngEvidence?.mapVersion === MAP_VERSION
    && targetReviewPacket?.officialPngEvidence?.coordinateSystem === COORDINATE_SYSTEM
    && targetReviewPacket?.officialPngEvidence?.pixelComponentReference?.candidateReferenceOnly === true
    && targetReviewPacket?.officialPngEvidence?.imageAnalysisArtifacts?.referenceOnly === true
    && targetReviewPacket?.officialPngEvidence?.imageAnalysisArtifacts?.sourceImageVerified === true;
  const approvalInputChecklistReady = targetReviewPacket?.operatorInputChecklist?.allowedCoordinateSource === 'operator-provided official 2026 Sajik PNG coordinates only'
    && targetReviewPacket?.operatorInputChecklist?.coordinateSystem === COORDINATE_SYSTEM
    && sameStringArray(targetReviewPacket?.operatorInputChecklist?.requiredApprovalFields, REQUIRED_APPROVAL_INPUT_FIELDS)
    && includesAll(targetReviewPacket?.operatorInputChecklist?.requiredReviewAssertions, REQUIRED_REVIEW_ASSERTIONS)
    && includesAll(targetReviewPacket?.operatorInputChecklist?.readyForPrewriteCriteria, REQUIRED_READY_FOR_PREWRITE_CRITERIA);

  if (decision === 'PENDING' && editableFieldsBlank) {
    warnings.push('TARGET_WAITING_FOR_OPERATOR_APPROVED_COORDINATES');
  }
  if (readyForPrewrite && !manualPatchRequired && !targetApplied) {
    blockers.push('TARGET_READY_FOR_PREWRITE_WITHOUT_MANUAL_PATCH_OR_APPLIED_STATUS');
  }
  if (manualPatchRequired && targetApplyPrecheck?.summary?.status !== 'ready-for-manual-apply') {
    blockers.push(`TARGET_MANUAL_PATCH_STATUS_MISMATCH:${targetApplyPrecheck?.summary?.status ?? ''}`);
  }

  const status = blockers.length > 0
    ? 'blocked'
    : targetApplied
      ? 'applied'
      : manualPatchRequired
        ? 'ready-for-manual-apply'
        : readyForPrewrite
          ? 'ready-for-prewrite'
          : 'waiting-for-operator';

  const coordinatePatchReadiness = {
    targetSectionId,
    productionPatchAllowedNow: manualPatchRequired && status === 'ready-for-manual-apply',
    sourcePatchAllowedNow: manualPatchRequired && status === 'ready-for-manual-apply',
    nextRequiredDecision: readyForPrewrite ? 'MANUAL_PATCH_REVIEW' : 'OPERATOR_APPROVED_COORDINATES_REQUIRED',
    blockerReason: readyForPrewrite ? '' : 'OPERATOR_APPROVED_COORDINATES_MISSING',
    currentDecision: decision,
    correctedPathPresent: !isBlank(targetEntryTemplate?.correctedPath),
    correctedLabelPresent: !isBlank(targetEntryTemplate?.correctedLabelX) && !isBlank(targetEntryTemplate?.correctedLabelY),
    reviewerPresent: !isBlank(targetEntryTemplate?.reviewer),
    reviewedAtPresent: !isBlank(targetEntryTemplate?.reviewedAt),
    operatorNotePresent: !isBlank(targetEntryTemplate?.operatorNote),
    allowedPatchFields: WRITABLE_SOURCE_FIELDS,
    lockedPatchFields: LOCKED_SOURCE_FIELDS,
  };

  const summary = {
    applyPathStatusVersion: STATUS_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    targetSectionId,
    targetStage: TARGET_STAGE_LABEL,
    targetSourceFile: TARGET_SOURCE_FILE,
    selectedDecision: decision,
    selectedSource: targetApprovalGate?.summary?.selectedSource ?? 'none',
    editableFieldsBlank,
    readyForPrewrite,
    manualPatchRequired,
    targetApplied,
    lifecycleFixtureReady,
    officialPngEvidenceReady,
    approvalInputChecklistReady,
    sourceDataWritePerformed: false,
    productionWriteAllowed: false,
    productionDataChanged: false,
    writesOperatorInput: false,
    writesProductionData: false,
    blockers,
    warnings,
  };

  const officialPngVisualReviewBrief = {
    reviewBasis: [
      relativePath(paths.targetReviewPacket),
      relativePath(paths.targetEntryTemplate),
      'reports/stadium/sajik-stage01-operator/targets/131-official-crop.png',
      'reports/stadium/sajik-stage01-operator/targets/131-official-overlay-crop.png',
      'reports/stadium/sajik-stage01-operator/targets/131-official-edge-crop.png',
    ],
    officialCropObservation: [
      '131 is a thin horizontal official PNG block between upper 121 and lower 061.',
      'The target is close to white seams and nearby 121, 132, and 142 boundaries.',
      'The section number text overlaps the visual target, so the label area is not a reliable boundary source by itself.',
    ],
    overlayObservation: [
      'Current hitPath is overlaid on the lower 131 thin block; overlay does not approve coordinates by itself.',
      'The blue pixel component remains reference-only and must not be copied into correctedPath.',
      'The current label point sits inside the current hitPath, but approval still requires operator-traced correctedPath and correctedLabelX/Y.',
    ],
    edgeCropObservation: [
      'Edge crop shows thin white seams around the 131 block and adjacent seating rows.',
      'Edge crop is a boundary aid only; the official crop remains the primary tracing source.',
    ],
    patchDecision: readyForPrewrite
      ? 'approval-gate-ready'
      : 'keep production source unchanged until operator-approved official PNG coordinates are entered',
    noCoordinatePatchYetBecause: [
      'operatorDecision is not APPROVED',
      'correctedPath is blank',
      'correctedLabelX/Y are blank',
      'reviewer, reviewedAt, and operatorNote are blank',
    ],
  };

  const row = {
    sectionId: targetSectionId,
    decision,
    editableFieldsBlank,
    imagePriorityRank: targetApprovalGate?.summary?.targetImagePriorityRank ?? targetReviewPacket?.summary?.targetImagePriorityRank ?? null,
    imageRiskLevel: targetApprovalGate?.summary?.targetImageRiskLevel ?? targetReviewPacket?.summary?.targetImageRiskLevel ?? '',
    targetImageBbox: targetApprovalGate?.summary?.targetImageBbox ?? targetReviewPacket?.summary?.targetImageBbox ?? '',
    intakeStatus: intakeRow?.intakeStatus ?? 'missing',
    approvalGateStatus: reportStatus(targetApprovalGate),
    applyPrecheckStatus: reportStatus(targetApplyPrecheck),
    lifecycleSmokeStatus: lifecycleSmoke?.status ?? 'missing',
    lifecycleManualPatchAction: lifecycleSmoke?.lifecycleContract?.manualPatchAction ?? '',
    lifecycleReadinessStatus: lifecycleSmoke?.lifecycleContract?.readinessStatus ?? '',
    lifecyclePatchAllowedFieldsOnly: lifecycleSmoke?.sourceFieldContract?.patchAllowedFieldsOnly ?? false,
    lifecycleWritableFragmentLockedTokensAbsent: lifecycleSmoke?.sourceFieldContract?.writableFragmentLockedTokensAbsent ?? false,
  };

  const approvalInputBrief = {
    primaryInputSource: targetReviewPacket?.operatorInputChecklist?.primaryInputSource ?? relativePath(paths.targetEntryTemplate),
    alternateInputSource: targetReviewPacket?.operatorInputChecklist?.alternateInputSource ?? 'reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json',
    targetEntryTemplate: targetReviewPacket?.operatorInputChecklist?.targetEntryTemplate ?? relativePath(paths.targetEntryTemplate),
    targetEntryTemplateCsv: targetReviewPacket?.operatorInputChecklist?.targetEntryTemplateCsv ?? '',
    reviewPacketMarkdown: targetReviewPacket?.operatorInputChecklist?.reviewPacketMarkdown ?? '',
    reviewPacketOverlaySvg: targetReviewPacket?.operatorInputChecklist?.reviewPacketOverlaySvg ?? targetReviewPacket?.officialPngEvidence?.overlaySvg ?? '',
    officialCropPng: targetReviewPacket?.operatorInputChecklist?.officialCropPng ?? targetReviewPacket?.summary?.targetImageAnalysisArtifacts?.officialCropPng ?? relativePath(path.join(targetDir, TARGET_OFFICIAL_CROP_PNG)),
    overlayCropPng: targetReviewPacket?.operatorInputChecklist?.overlayCropPng ?? targetReviewPacket?.summary?.targetImageAnalysisArtifacts?.overlayCropPng ?? relativePath(path.join(targetDir, TARGET_OFFICIAL_OVERLAY_CROP_PNG)),
    edgeCropPng: targetReviewPacket?.operatorInputChecklist?.edgeCropPng ?? targetReviewPacket?.summary?.targetImageAnalysisArtifacts?.edgeCropPng ?? relativePath(path.join(targetDir, TARGET_OFFICIAL_EDGE_CROP_PNG)),
    sourceConflictRule: targetReviewPacket?.operatorInputChecklist?.sourceConflictRule ?? '',
    requiredApprovalFields: targetReviewPacket?.operatorInputChecklist?.requiredApprovalFields ?? REQUIRED_APPROVAL_INPUT_FIELDS,
    requiredHumanActions: targetReviewPacket?.operatorInputChecklist?.requiredHumanActions ?? [],
    requiredReviewAssertions: targetReviewPacket?.operatorInputChecklist?.requiredReviewAssertions ?? [],
    readyForPrewriteCriteria: targetReviewPacket?.operatorInputChecklist?.readyForPrewriteCriteria ?? [],
    forbiddenCoordinateSources: targetReviewPacket?.operatorInputChecklist?.forbiddenCoordinateSources ?? [],
    approvedEntryExample: targetReviewPacket?.operatorInputChecklist?.approvedEntryExample ?? {
      sectionId: targetSectionId,
      operatorDecision: 'APPROVED',
      correctedPath: '<operator traced official PNG path>',
      correctedLabelX: '<label x inside correctedPath>',
      correctedLabelY: '<label y inside correctedPath>',
      reviewer: '<operator name>',
      reviewedAt: '<ISO timestamp>',
      operatorNote: 'official PNG manual trace',
    },
  };

  const currentTraceForDraft = targetReviewPacket?.officialPngEvidence?.currentTrace ?? {};
  const currentLabelPointForDraft = currentTraceForDraft.labelPoint ?? targetReviewPacket?.target?.currentLabelPoint ?? [];
  const currentGeometryApprovalDraft = {
    draftKind: 'APPROVED_CURRENT_GEOMETRY_REVIEW_REQUIRED',
    source: 'current production hitPath/labelPoint from the locked 131 review packet',
    requiresOperatorApproval: true,
    notAutoApproved: true,
    noCoordinateInference: true,
    writesOperatorInput: false,
    writesProductionData: false,
    expectedGateWarnings: [
      'CORRECTED_PATH_REUSES_CURRENT_HIT_PATH',
      'CORRECTED_PATH_REUSES_CURRENT_VISUAL_PATH',
      'APPROVED_NO_GEOMETRY_DELTA_EXPECTED',
    ],
    candidateEntry: {
      sectionId: targetSectionId,
      operatorDecision: 'APPROVED',
      correctedPath: normalizePath(currentTraceForDraft.hitPath ?? targetReviewPacket?.target?.currentHitPath ?? ''),
      correctedLabelX: currentLabelPointForDraft[0] ?? '',
      correctedLabelY: currentLabelPointForDraft[1] ?? '',
      reviewer: '<operator name>',
      reviewedAt: '<ISO timestamp>',
      operatorNote: 'Operator approved current production hitPath after official PNG crop/overlay/edge review; no geometry delta expected.',
    },
    copyRules: [
      'Use this draft only if the operator confirms the current production hitPath matches the official PNG block.',
      'Replace reviewer and reviewedAt before running the approval gate.',
      'Do not use this draft as a new coordinate trace or as an automatic production patch.',
    ],
  };
  const keepCurrentDecisionDraft = {
    draftKind: 'KEEP_CURRENT_DECISION_REVIEW_REQUIRED',
    source: 'operator decision row only; no patch preview is expected',
    requiresOperatorApproval: true,
    notAutoApproved: true,
    noCoordinateInference: true,
    writesOperatorInput: false,
    writesProductionData: false,
    candidateEntry: {
      sectionId: targetSectionId,
      operatorDecision: 'KEEP_CURRENT',
      correctedPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      reviewer: '<operator name>',
      reviewedAt: '<ISO timestamp>',
      operatorNote: 'Operator chose KEEP_CURRENT after official PNG review; no Stage 01 geometry patch.',
    },
    copyRules: [
      'Use KEEP_CURRENT when the operator wants to record review without producing a patch preview.',
      'KEEP_CURRENT rows must keep correctedPath and correctedLabelX/Y blank.',
      'KEEP_CURRENT must keep correctedPath/correctedLabelX/correctedLabelY blank.',
      'KEEP_CURRENT does not move the target into manual source patch state.',
    ],
  };

  const operatorDecisionPacket = {
    decisionPacketVersion: DECISION_PACKET_VERSION,
    targetSectionId,
    targetStage: TARGET_STAGE_LABEL,
    status,
    currentDecision: decision,
    productionPatchAllowedNow: coordinatePatchReadiness.productionPatchAllowedNow,
    sourceDataWritePerformed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    decisionRequiredBecause: coordinatePatchReadiness.blockerReason || 'READY_FOR_MANUAL_PATCH_REVIEW',
    allowedDecisionPaths: [
      {
        operatorDecision: 'APPROVED',
        purpose: 'operator-approved official PNG geometry can enter patch preview',
        requiredFields: REQUIRED_APPROVAL_INPUT_FIELDS,
        forbiddenFields: [],
        placeholderPolicy: 'reviewer and reviewedAt placeholders must be replaced before intake',
        candidateEntry: currentGeometryApprovalDraft.candidateEntry,
        expectedStatusAfterValidInput: {
          targetApprovalGate: 'ready-for-prewrite',
          prewrite: 'ready-for-data-patch',
          applyReady: 'ready-for-manual-apply',
          manualPatchPlan: 'MANUAL_PATCH_REQUIRED',
        },
        nextCommands: [
          'npm run stadium:sajik:stage01-target-approval-gate',
          'npm run stadium:sajik:stage01-operator-input-intake-gate',
          'npm run stadium:sajik:stage01-prewrite',
          'npm run stadium:sajik:stage01-apply-ready',
          'npm run stadium:sajik:stage01-manual-patch-plan',
          'npm run stadium:sajik:stage01-target-apply-precheck',
          'npm run stadium:sajik:stage01-131-apply-path-status',
        ],
      },
      {
        operatorDecision: 'KEEP_CURRENT',
        purpose: 'operator records official PNG review and keeps current production geometry',
        requiredFields: ['operatorDecision=KEEP_CURRENT', ...REQUIRED_KEEP_CURRENT_FIELDS],
        forbiddenFields: FORBIDDEN_KEEP_CURRENT_FIELDS,
        placeholderPolicy: 'reviewer and reviewedAt placeholders must be replaced before intake',
        candidateEntry: keepCurrentDecisionDraft.candidateEntry,
        expectedStatusAfterValidInput: {
          intake: 'NO_PATCH_PREVIEW',
          prewrite: 'waiting-for-operator',
          patchPreviewRows: 0,
          manualPatchRows: 0,
        },
        nextCommands: [
          'npm run stadium:sajik:stage01-operator-input-intake-gate',
          'npm run stadium:sajik:stage01-prewrite',
          'npm run stadium:sajik:stage01-operator-status',
          'npm run stadium:sajik:stage01-completion-gate',
        ],
      },
    ],
    currentBlockingFields: {
      correctedPathPresent: coordinatePatchReadiness.correctedPathPresent,
      correctedLabelPresent: coordinatePatchReadiness.correctedLabelPresent,
      reviewerPresent: coordinatePatchReadiness.reviewerPresent,
      reviewedAtPresent: coordinatePatchReadiness.reviewedAtPresent,
      operatorNotePresent: coordinatePatchReadiness.operatorNotePresent,
    },
    nextOperatorAction: decision === 'PENDING'
      ? 'Choose APPROVED with official PNG corrected geometry or KEEP_CURRENT with reviewer/reviewedAt/operatorNote.'
      : 'Run the decision-specific gate chain and inspect blockers.',
  };

  const officialPngEvidenceBrief = {
    evidenceVersion: targetReviewPacket?.officialPngEvidence?.evidenceVersion ?? null,
    officialImageAsset: targetReviewPacket?.officialPngEvidence?.officialImageAsset ?? targetReviewPacket?.summary?.officialImageAsset ?? null,
    officialImageSha256: targetReviewPacket?.officialPngEvidence?.officialImageSha256 ?? targetReviewPacket?.summary?.officialImageSha256 ?? null,
    mapVersion: targetReviewPacket?.officialPngEvidence?.mapVersion ?? targetReviewPacket?.summary?.mapVersion ?? null,
    coordinateSystem: targetReviewPacket?.officialPngEvidence?.coordinateSystem ?? COORDINATE_SYSTEM,
    targetViewport: targetReviewPacket?.officialPngEvidence?.targetViewport ?? targetReviewPacket?.summary?.targetViewport ?? null,
    imageRiskLevel: targetReviewPacket?.summary?.targetImageRiskLevel ?? '',
    imageRiskReasons: targetReviewPacket?.summary?.targetImageRiskReasons ?? [],
    targetImageBbox: targetReviewPacket?.summary?.targetImageBbox ?? '',
    imageAnalysisArtifacts: targetReviewPacket?.officialPngEvidence?.imageAnalysisArtifacts ?? null,
    currentTrace: targetReviewPacket?.officialPngEvidence?.currentTrace ?? null,
    pixelComponentReference: targetReviewPacket?.officialPngEvidence?.pixelComponentReference
      ? {
        status: targetReviewPacket.officialPngEvidence.pixelComponentReference.status,
        riskLevel: targetReviewPacket.officialPngEvidence.pixelComponentReference.riskLevel,
        componentArea: targetReviewPacket.officialPngEvidence.pixelComponentReference.componentArea,
        bbox: targetReviewPacket.officialPngEvidence.pixelComponentReference.bbox,
        center: targetReviewPacket.officialPngEvidence.pixelComponentReference.center,
        pathColorCoverageRatio: targetReviewPacket.officialPngEvidence.pixelComponentReference.pathColorCoverageRatio,
        overlayPathReferenceOnly: targetReviewPacket.officialPngEvidence.pixelComponentReference.candidateReferenceOnly === true,
      }
      : null,
    operatorInterpretation: targetReviewPacket?.officialPngEvidence?.operatorInterpretation ?? [],
    cannotAutoApproveReasons: targetReviewPacket?.officialPngEvidence?.cannotAutoApproveReasons ?? [],
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    coordinatePatchReadiness,
    row,
    approvalInputBrief,
    currentGeometryApprovalDraft,
    keepCurrentDecisionDraft,
    operatorDecisionPacket,
    officialPngVisualReviewBrief,
    officialPngEvidenceBrief,
    sourceReports: Object.fromEntries(
      Object.entries(paths).map(([key, filePath]) => [key, relativePath(filePath)]),
    ),
    sourcePolicy: {
      allowedCoordinateSource: 'operator-provided official 2026 Sajik PNG coordinates only',
      coordinateSystem: COORDINATE_SYSTEM,
      officialImageSha256: OFFICIAL_IMAGE_SHA256,
      mapVersion: MAP_VERSION,
      noAutomaticSourceWrite: true,
      missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      disallowedSources: [
        'AI coordinate prediction',
        'browser CSS pixels',
        'resized screenshots',
        'external crawling',
        'web-search-based baseball data',
        'third-party copied seatmap images',
      ],
    },
    sourceFieldContract: {
      writableSourceFields: WRITABLE_SOURCE_FIELDS,
      lockedSourceFields: LOCKED_SOURCE_FIELDS,
      requiredApprovalInputFields: REQUIRED_APPROVAL_INPUT_FIELDS,
      manualPatchAllowedOnlyAfter: [
        'targetApprovalGate.readyForPrewrite=true',
        'targetApplyPrecheck.manualPatchRequired=true',
        'lifecycle fixture proves MANUAL_PATCH_REQUIRED',
        'lifecycle fixture proves APPROVED_NOT_APPLIED',
      ],
    },
  };

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const lines = [
    '# Sajik Stage 01 131 Apply Path Status',
    '',
    `- status version: \`${STATUS_VERSION}\``,
    `- target section: \`${targetSectionId}\``,
    `- status: \`${summary.status}\``,
    `- selected decision: \`${summary.selectedDecision}\``,
    `- selected source: \`${summary.selectedSource}\``,
    `- editable fields blank: \`${summary.editableFieldsBlank}\``,
    `- ready for prewrite: \`${summary.readyForPrewrite}\``,
    `- manual patch required: \`${summary.manualPatchRequired}\``,
    `- target applied: \`${summary.targetApplied}\``,
    `- lifecycle fixture ready: \`${summary.lifecycleFixtureReady}\``,
    `- official PNG evidence ready: \`${summary.officialPngEvidenceReady}\``,
    `- approval input checklist ready: \`${summary.approvalInputChecklistReady}\``,
    `- coordinate patch allowed now: \`${coordinatePatchReadiness.productionPatchAllowedNow}\``,
    `- coordinate patch blocker: \`${coordinatePatchReadiness.blockerReason || '-'}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- writes operator input: \`${summary.writesOperatorInput}\``,
    `- writes production data: \`${summary.writesProductionData}\``,
    '',
    '## Target State',
    '',
    markdownTable(
      ['section', 'decision', 'intake', 'approval', 'apply precheck', 'lifecycle', 'manual action', 'readiness'],
      [[
        `\`${row.sectionId}\``,
        `\`${row.decision}\``,
        `\`${row.intakeStatus}\``,
        `\`${row.approvalGateStatus}\``,
        `\`${row.applyPrecheckStatus}\``,
        `\`${row.lifecycleSmokeStatus}\``,
        `\`${row.lifecycleManualPatchAction || '-'}\``,
        `\`${row.lifecycleReadinessStatus || '-'}\``,
      ]],
    ),
    '',
    '## Coordinate Patch Readiness',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['production patch allowed now', `\`${coordinatePatchReadiness.productionPatchAllowedNow}\``],
        ['source patch allowed now', `\`${coordinatePatchReadiness.sourcePatchAllowedNow}\``],
        ['next required decision', `\`${coordinatePatchReadiness.nextRequiredDecision}\``],
        ['blocker reason', `\`${coordinatePatchReadiness.blockerReason || '-'}\``],
        ['current decision', `\`${coordinatePatchReadiness.currentDecision}\``],
        ['corrected path present', `\`${coordinatePatchReadiness.correctedPathPresent}\``],
        ['corrected label present', `\`${coordinatePatchReadiness.correctedLabelPresent}\``],
        ['reviewer present', `\`${coordinatePatchReadiness.reviewerPresent}\``],
        ['reviewedAt present', `\`${coordinatePatchReadiness.reviewedAtPresent}\``],
        ['operator note present', `\`${coordinatePatchReadiness.operatorNotePresent}\``],
      ],
    ),
    '',
    '## Official PNG Visual Review Brief',
    '',
    ...officialPngVisualReviewBrief.officialCropObservation.map((note) => `- official crop: ${note}`),
    ...officialPngVisualReviewBrief.overlayObservation.map((note) => `- overlay crop: ${note}`),
    ...officialPngVisualReviewBrief.edgeCropObservation.map((note) => `- edge crop: ${note}`),
    `- patch decision: \`${officialPngVisualReviewBrief.patchDecision}\``,
    '',
    '## Operator Decision Drafts',
    '',
    '- `currentGeometryApprovalDraft` is not auto-approved; it only copies the current production `hitPath`/`labelPoint` into an approval entry shape for operator review.',
    '- `keepCurrentDecisionDraft` records a no-patch decision and cannot produce a patch preview.',
    '',
    '### Current Geometry Approval Draft',
    '',
    '```json',
    JSON.stringify(currentGeometryApprovalDraft.candidateEntry, null, 2),
    '```',
    '',
    `- expected warnings: \`${currentGeometryApprovalDraft.expectedGateWarnings.join('`, `')}\``,
    ...currentGeometryApprovalDraft.copyRules.map((rule) => `- ${rule}`),
    '',
    '### Keep Current Decision Draft',
    '',
    '```json',
    JSON.stringify(keepCurrentDecisionDraft.candidateEntry, null, 2),
    '```',
    '',
    ...keepCurrentDecisionDraft.copyRules.map((rule) => `- ${rule}`),
    '',
    '## Operator Decision Packet',
    '',
    `- decision packet version: \`${operatorDecisionPacket.decisionPacketVersion}\``,
    `- JSON field: \`operatorDecisionPacket\``,
    `- allowed path field: \`allowedDecisionPaths\``,
    `- next operator action: ${operatorDecisionPacket.nextOperatorAction}`,
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['status', `\`${operatorDecisionPacket.status}\``],
        ['current decision', `\`${operatorDecisionPacket.currentDecision}\``],
        ['production patch allowed now', `\`${operatorDecisionPacket.productionPatchAllowedNow}\``],
        ['decision required because', `\`${operatorDecisionPacket.decisionRequiredBecause}\``],
        ['source data write performed', `\`${operatorDecisionPacket.sourceDataWritePerformed}\``],
        ['writes operator input', `\`${operatorDecisionPacket.writesOperatorInput}\``],
        ['writes production data', `\`${operatorDecisionPacket.writesProductionData}\``],
      ],
    ),
    '',
    '### Decision Paths',
    '',
    markdownTable(
      ['decision', 'required', 'forbidden', 'next status'],
      operatorDecisionPacket.allowedDecisionPaths.map((decisionPath) => [
        `\`${decisionPath.operatorDecision}\``,
        `\`${decisionPath.requiredFields.join('`, `')}\``,
        decisionPath.forbiddenFields.length > 0 ? `\`${decisionPath.forbiddenFields.join('`, `')}\`` : '`-`',
        `\`${Object.entries(decisionPath.expectedStatusAfterValidInput).map(([key, value]) => `${key}=${value}`).join(', ')}\``,
      ]),
    ),
    '',
    '- `operatorDecision=KEEP_CURRENT` is allowed only as a no-patch review row.',
    '- KEEP_CURRENT must keep correctedPath/correctedLabelX/correctedLabelY blank.',
    '',
    '## Official PNG Evidence Brief',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['official image asset', `\`${officialPngEvidenceBrief.officialImageAsset ?? '-'}\``],
        ['official image sha256', `\`${officialPngEvidenceBrief.officialImageSha256 ?? '-'}\``],
        ['map version', `\`${officialPngEvidenceBrief.mapVersion ?? '-'}\``],
        ['coordinate system', `\`${officialPngEvidenceBrief.coordinateSystem}\``],
        ['target viewport', `\`${officialPngEvidenceBrief.targetViewport?.viewBox ?? '-'}\``],
        ['image risk', `\`${officialPngEvidenceBrief.imageRiskLevel || '-'}\``],
        ['target bbox', `\`${officialPngEvidenceBrief.targetImageBbox || '-'}\``],
        ['current hit bounds', `\`${JSON.stringify(officialPngEvidenceBrief.currentTrace?.hitPathBounds ?? null)}\``],
        ['current label point', `\`${JSON.stringify(officialPngEvidenceBrief.currentTrace?.labelPoint ?? null)}\``],
        ['pixel component bbox', `\`${JSON.stringify(officialPngEvidenceBrief.pixelComponentReference?.bbox ?? null)}\``],
        ['pixel component reference only', `\`${officialPngEvidenceBrief.pixelComponentReference?.overlayPathReferenceOnly ?? false}\``],
      ],
    ),
    '',
    '## Approval Input Contract',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['primary input source', `\`${approvalInputBrief.primaryInputSource}\``],
        ['alternate input source', `\`${approvalInputBrief.alternateInputSource}\``],
        ['review packet overlay SVG', `\`${approvalInputBrief.reviewPacketOverlaySvg}\``],
        ['official crop PNG', `\`${approvalInputBrief.officialCropPng}\``],
        ['overlay crop PNG', `\`${approvalInputBrief.overlayCropPng}\``],
        ['edge crop PNG', `\`${approvalInputBrief.edgeCropPng}\``],
        ['source conflict rule', `\`${approvalInputBrief.sourceConflictRule || '-'}\``],
        ['required approval fields', `\`${approvalInputBrief.requiredApprovalFields.join('`, `')}\``],
      ],
    ),
    '',
    '## Ready For Prewrite Criteria',
    '',
    ...approvalInputBrief.readyForPrewriteCriteria.map((criterion) => `- ${criterion}`),
    '',
    '## Required Review Assertions',
    '',
    ...approvalInputBrief.requiredReviewAssertions.map((assertion) => `- ${assertion}`),
    '',
    '## Forbidden Coordinate Sources',
    '',
    ...approvalInputBrief.forbiddenCoordinateSources.map((source) => `- ${source}`),
    '',
    '## Reports',
    '',
    `- target review packet: \`${relativePath(paths.targetReviewPacket)}\``,
    `- target entry template: \`${relativePath(paths.targetEntryTemplate)}\``,
    `- operator input intake gate: \`${relativePath(paths.operatorInputIntakeGate)}\``,
    `- target approval gate: \`${relativePath(paths.targetApprovalGate)}\``,
    `- target apply precheck: \`${relativePath(paths.targetApplyPrecheck)}\``,
    `- lifecycle smoke: \`${relativePath(paths.lifecycleSmoke)}\``,
    '',
    '## Guardrail',
    '',
    '- this status report is read-only and never edits `src/data/sajikSeatData.ts` or operator input files.',
    '- the current target remains blocked from production geometry changes until operator-approved official PNG coordinates are entered.',
    '- lifecycle smoke proves the approved fixture path reaches manual patch review without allowing locked source fields.',
  ];

  if (blockers.length > 0) {
    lines.push('', '## Blockers', '', ...blockers.map((blocker) => `- \`${blocker}\``));
  }
  if (warnings.length > 0) {
    lines.push('', '## Warnings', '', ...warnings.map((warning) => `- \`${warning}\``));
  }

  await fs.writeFile(markdownPath, `${lines.join('\n')}\n`, 'utf8');

  console.log(`stage01_131_apply_path_status_json:${relativePath(jsonPath)}`);
  console.log(`stage01_131_apply_path_status_markdown:${relativePath(markdownPath)}`);
  console.log(`status:${summary.status} target=${targetSectionId} decision=${summary.selectedDecision} editableFieldsBlank=${summary.editableFieldsBlank} readyForPrewrite=${summary.readyForPrewrite} manualPatchRequired=${summary.manualPatchRequired} lifecycleFixtureReady=${summary.lifecycleFixtureReady} officialPngEvidenceReady=${summary.officialPngEvidenceReady} approvalInputChecklistReady=${summary.approvalInputChecklistReady} sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`);

  if (status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01131LifecycleSmoke = async () => {
  const { execFile } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { promisify } = await import("node:util");
  const { pathToPoints, pointsToPath } = await import("../src/utils/seatMapPolygonValidator.ts");

  const execFileAsync = promisify(execFile);

  const SMOKE_VERSION = 'SAJIK_STAGE01_131_LIFECYCLE_SMOKE_V1';
  const TARGET_SECTION_ID = '131';
  const REVIEWER = 'STAGE01_131_LIFECYCLE_OPERATOR';
  const REVIEWED_AT = '2026-05-16T00:00:00.000Z';
  const SOURCE_DATA_FILE = 'src/data/sajikSeatData.ts';
  const WRITABLE_SOURCE_FIELDS = [
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.labelX',
    'imageGeometry.labelY',
  ];
  const LOCKED_FRAGMENT_TOKENS = [
    'visualPath',
    'geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const stageDir = path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator');
  const smokeDir = path.join(stageDir, 'target-lifecycle-smoke');
  const smokeTargetDir = path.join(smokeDir, 'targets');

  const baseInputPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json');
  const baseTargetReviewPacketPath = path.join(stageDir, 'targets/131-review-packet.json');
  const smokeInputPath = path.join(smokeDir, 'sajik-seatmap-stage01-operator-input.json');
  const smokeTargetReviewPacketPath = path.join(smokeTargetDir, '131-review-packet.json');
  const smokeTargetEntryPreflightPath = path.join(smokeTargetDir, '131-entry-preflight.json');
  const smokeTargetEntryPath = path.join(smokeTargetDir, '131-entry-template.json');
  const targetApprovalPath = path.join(smokeTargetDir, '131-approval-gate.json');
  const inputAidPath = path.join(smokeDir, 'sajik-seatmap-stage01-operator-input-aid.json');
  const prewritePath = path.join(smokeDir, 'sajik-seatmap-stage01-prewrite.json');
  const patchPreviewPath = path.join(smokeDir, 'sajik-seatmap-stage01-prewrite.patch-preview.ts');
  const applyReadyPath = path.join(smokeDir, 'sajik-seatmap-stage01-apply-ready.json');
  const postApplyPath = path.join(smokeDir, 'sajik-seatmap-stage01-post-apply-audit.json');
  const operatorStatusPath = path.join(smokeDir, 'sajik-seatmap-stage01-operator-status.json');
  const manualPatchPlanPath = path.join(smokeDir, 'sajik-seatmap-stage01-manual-patch-plan.json');
  const realApprovalReadinessPath = path.join(smokeDir, 'sajik-seatmap-stage01-real-approval-readiness.json');
  const smokeJsonPath = path.join(smokeDir, 'sajik-seatmap-stage01-131-lifecycle-smoke.json');
  const smokeMarkdownPath = path.join(smokeDir, 'sajik-seatmap-stage01-131-lifecycle-smoke.md');

  function normalizeForSmoke(row) {
    return {
      ...row,
      operatorDecision: 'PENDING',
      correctedPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      reviewer: '',
      reviewedAt: '',
      operatorNote: '',
    };
  }

  function makeApprovedRow(row) {
    const points = pathToPoints(row.currentHitPath ?? row.currentPath);
    if (points.length < 3) {
      throw new Error(`Cannot create ${TARGET_SECTION_ID} lifecycle smoke row: currentHitPath has fewer than 3 points.`);
    }

    const adjustedPoints = points.map((point, index) => (
      index === 0 ? [point[0] + 0.5, point[1] + 0.5] : point
    ));

    return {
      ...row,
      operatorDecision: 'APPROVED',
      correctedPath: pointsToPath(adjustedPoints),
      correctedLabelX: row.currentLabelX,
      correctedLabelY: row.currentLabelY,
      reviewer: REVIEWER,
      reviewedAt: REVIEWED_AT,
      operatorNote: '131 lifecycle smoke official PNG operator approval fixture; no source write.',
    };
  }

  function targetEntryForApprovedRow(row) {
    return {
      sectionId: row.sectionId,
      operatorDecision: row.operatorDecision,
      correctedPath: row.correctedPath,
      correctedLabelX: row.correctedLabelX,
      correctedLabelY: row.correctedLabelY,
      reviewer: row.reviewer,
      reviewedAt: row.reviewedAt,
      operatorNote: row.operatorNote,
    };
  }

  async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  async function readJsonOrNull(filePath) {
    try {
      return await readJson(filePath);
    } catch {
      return null;
    }
  }

  async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  }

  function formatRelative(filePath) {
    return path.relative(frontendRoot, filePath);
  }

  async function runNodeScript(scriptName, args) {
    const result = {
      script: scriptName,
      args,
      exitCode: 0,
      stdout: '',
      stderr: '',
    };

    try {
      const { stdout, stderr } = await execFileAsync(
        process.execPath,
        ['--import', 'tsx', path.join('scripts', scriptName), ...args],
        {
          cwd: frontendRoot,
          maxBuffer: 1024 * 1024 * 16,
        },
      );
      result.stdout = stdout.trim();
      result.stderr = stderr.trim();
    } catch (error) {
      result.exitCode = Number.isInteger(error.code) ? error.code : 1;
      result.stdout = String(error.stdout ?? '').trim();
      result.stderr = String(error.stderr ?? error.message ?? '').trim();
    }

    return result;
  }

  async function runRequired(commandResults, blockers, scriptName, args) {
    const result = await runNodeScript(scriptName, args);
    commandResults.push(result);
    if (result.exitCode !== 0) {
      blockers.push({
        type: 'command-failed',
        script: scriptName,
        exitCode: result.exitCode,
        stderr: result.stderr,
      });
    }
    return result;
  }

  function assertCondition(issues, condition, message, details = undefined) {
    if (!condition) {
      issues.push(details === undefined ? { message } : { message, details });
    }
  }

  function isSameStringArray(actual, expected) {
    return Array.isArray(actual)
      && actual.length === expected.length
      && expected.every((value, index) => actual[index] === value);
  }

  function reportStatus(report) {
    return report?.status ?? report?.summary?.status ?? 'missing';
  }

  function includesAll(text, tokens) {
    return tokens.every((token) => String(text ?? '').includes(token));
  }

  function excludesAll(text, tokens) {
    return tokens.every((token) => !String(text ?? '').includes(token));
  }

  function buildMarkdown(report) {
    const statusRows = [
      ['targetSectionId', report.targetSectionId],
      ['status', report.status],
      ['targetEntryPreflightStatus', report.flow.targetEntryPreflightStatus],
      ['targetApprovalStatus', report.flow.targetApprovalStatus],
      ['prewriteStatus', report.flow.prewriteStatus],
      ['applyReadyStatus', report.flow.applyReadyStatus],
      ['postApplyStatus', report.flow.postApplyStatus],
      ['operatorStatus', report.flow.operatorStatus],
      ['manualPatchPlanStatus', report.flow.manualPatchPlanStatus],
      ['realApprovalReadinessStatus', report.flow.realApprovalReadinessStatus],
      ['manualPatchRows', String(report.flow.manualPatchRows)],
      ['operatorStatusRow', report.lifecycleContract.operatorStatusRowStatus ?? '-'],
      ['readinessRow', report.lifecycleContract.readinessStatus ?? '-'],
      ['writableFragmentLockedTokensAbsent', String(report.sourceFieldContract.writableFragmentLockedTokensAbsent)],
      ['patchAllowedFieldsOnly', String(report.sourceFieldContract.patchAllowedFieldsOnly)],
      ['sourceDataWritePerformed', String(report.safetyContract.sourceDataWritePerformed)],
      ['productionWriteAllowed', String(report.safetyContract.productionWriteAllowed)],
      ['productionDataChanged', String(report.safetyContract.productionDataChanged)],
    ];

    const lines = [
      '# Sajik Stage 01 131 Lifecycle Smoke',
      '',
      '| Field | Value |',
      '| --- | --- |',
      ...statusRows.map(([field, value]) => `| ${field} | ${value} |`),
      '',
      '## Outputs',
      '',
      `- Target entry preflight: \`${formatRelative(smokeTargetEntryPreflightPath)}\``,
      `- Target approval gate: \`${formatRelative(targetApprovalPath)}\``,
      `- Smoke input: \`${formatRelative(smokeInputPath)}\``,
      `- Prewrite: \`${formatRelative(prewritePath)}\``,
      `- Apply-ready: \`${formatRelative(applyReadyPath)}\``,
      `- Post-apply audit: \`${formatRelative(postApplyPath)}\``,
      `- Operator status: \`${formatRelative(operatorStatusPath)}\``,
      `- Manual patch plan: \`${formatRelative(manualPatchPlanPath)}\``,
      `- Real approval readiness: \`${formatRelative(realApprovalReadinessPath)}\``,
      '',
      '## Lifecycle Contract',
      '',
      '- `targetApprovalGate=ready-for-prewrite`',
      '- `prewrite=ready-for-data-patch`',
      '- `applyReady=ready-for-manual-apply`',
      '- `postApply=not-applied`',
      '- `operatorStatusRow=NOT_APPLIED`',
      '- `manualPatchPlan=MANUAL_PATCH_REQUIRED`',
      '- `readinessRow=APPROVED_NOT_APPLIED`',
      '',
      '## Source Field Contract',
      '',
      `- writableSourceFields: \`${WRITABLE_SOURCE_FIELDS.join('`, `')}\``,
      `- writable fragment includes only writable geometry assignments: \`${report.sourceFieldContract.writableFragmentLockedTokensAbsent}\``,
      `- locked fragment tokens checked: \`${LOCKED_FRAGMENT_TOKENS.join('`, `')}\``,
      '',
      '## Safety Contract',
      '',
      `- The smoke does not edit \`${SOURCE_DATA_FILE}\`.`,
      '- `productionWriteAllowed` must remain `false`.',
      '- `sourceDataWritePerformed` must remain `false`.',
      '- `productionDataChanged` must remain `false`.',
    ];

    if (report.issues.length > 0) {
      lines.push('', '## Issues', '');
      for (const issue of report.issues) {
        lines.push(`- ${issue.message}`);
      }
    }

    return `${lines.join('\n')}\n`;
  }

  async function main() {
    const commandResults = [];
    const blockers = [];
    const issues = [];

    await fs.mkdir(smokeTargetDir, { recursive: true });

    const baseInput = await readJson(baseInputPath);
    const targetReviewPacket = await readJson(baseTargetReviewPacketPath);
    const baseRows = Array.isArray(baseInput.corrections)
      ? baseInput.corrections
      : Array.isArray(baseInput.rows)
        ? baseInput.rows
        : [];
    const normalizedRows = baseRows.map(normalizeForSmoke);
    const targetIndex = normalizedRows.findIndex((row) => row.sectionId === TARGET_SECTION_ID);
    if (targetIndex < 0) {
      throw new Error(`Stage 01 operator input does not contain ${TARGET_SECTION_ID}. Run npm run stadium:sajik:stage01-operator-package first.`);
    }

    const approvedRow = makeApprovedRow(normalizedRows[targetIndex]);
    normalizedRows[targetIndex] = approvedRow;

    const smokeInput = {
      ...baseInput,
      smokeVersion: SMOKE_VERSION,
      smokeTargetSectionId: TARGET_SECTION_ID,
      corrections: normalizedRows,
    };

    await writeJson(smokeInputPath, smokeInput);
    await writeJson(smokeTargetReviewPacketPath, targetReviewPacket);
    await writeJson(smokeTargetEntryPath, targetEntryForApprovedRow(approvedRow));

    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--stage-dir',
      smokeDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--stage-dir',
      smokeDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--input',
      smokeInputPath,
      '--stage-dir',
      smokeDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--input',
      smokeInputPath,
      '--stage-dir',
      smokeDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--prewrite',
      prewritePath,
      '--patch-preview',
      patchPreviewPath,
      '--stage-dir',
      smokeDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--prewrite',
      prewritePath,
      '--stage-dir',
      smokeDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--operator-input',
      smokeInputPath,
      '--prewrite',
      prewritePath,
      '--apply-ready',
      applyReadyPath,
      '--post-apply',
      postApplyPath,
      '--stage-dir',
      smokeDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--operator-status',
      operatorStatusPath,
      '--prewrite',
      prewritePath,
      '--stage-dir',
      smokeDir,
      '--require-ready',
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--operator-input',
      smokeInputPath,
      '--input-aid',
      inputAidPath,
      '--prewrite',
      prewritePath,
      '--apply-ready',
      applyReadyPath,
      '--post-apply',
      postApplyPath,
      '--operator-status',
      operatorStatusPath,
      '--manual-patch-plan',
      manualPatchPlanPath,
      '--stage-dir',
      smokeDir,
    ]);

    const targetEntryPreflight = await readJsonOrNull(smokeTargetEntryPreflightPath);
    const targetApproval = await readJsonOrNull(targetApprovalPath);
    const inputAid = await readJsonOrNull(inputAidPath);
    const prewrite = await readJsonOrNull(prewritePath);
    const applyReady = await readJsonOrNull(applyReadyPath);
    const postApply = await readJsonOrNull(postApplyPath);
    const operatorStatus = await readJsonOrNull(operatorStatusPath);
    const manualPatchPlan = await readJsonOrNull(manualPatchPlanPath);
    const realApprovalReadiness = await readJsonOrNull(realApprovalReadinessPath);

    const patchPayload = prewrite?.patchPayloads?.find((row) => row.sectionId === TARGET_SECTION_ID) ?? null;
    const sourcePatchContractRow = prewrite?.sourcePatchContractRows?.find((row) => row.sectionId === TARGET_SECTION_ID) ?? null;
    const statusRow = operatorStatus?.rows?.find((row) => row.sectionId === TARGET_SECTION_ID) ?? null;
    const manualPatchRow = manualPatchPlan?.rows?.find((row) => row.sectionId === TARGET_SECTION_ID) ?? null;
    const readinessRow = realApprovalReadiness?.rows?.find((row) => row.sectionId === TARGET_SECTION_ID) ?? null;
    const writableFragment = String(manualPatchRow?.writableTsFragment ?? '');

    assertCondition(issues, blockers.length === 0, 'All child lifecycle scripts must exit successfully.', blockers);
    assertCondition(issues, reportStatus(targetEntryPreflight) === 'ready-for-approval-gate', 'Target entry preflight must be ready-for-approval-gate.', reportStatus(targetEntryPreflight));
    assertCondition(issues, targetEntryPreflight?.summary?.selectedDecision === 'APPROVED', 'Target entry preflight must select APPROVED.', targetEntryPreflight?.summary);
    assertCondition(issues, targetEntryPreflight?.summary?.selectedSource === 'matched-sources', 'Target entry preflight must match operator input and target entry sources.', targetEntryPreflight?.summary);
    assertCondition(issues, targetEntryPreflight?.summary?.readyForApprovalGate === true, 'Target entry preflight readyForApprovalGate must be true.', targetEntryPreflight?.summary);
    assertCondition(issues, targetEntryPreflight?.summary?.sourceDataWritePerformed === false, 'Target entry preflight sourceDataWritePerformed must be false.', targetEntryPreflight?.summary);
    assertCondition(issues, reportStatus(targetApproval) === 'ready-for-prewrite', 'Target approval gate must be ready-for-prewrite.', reportStatus(targetApproval));
    assertCondition(issues, targetApproval?.summary?.selectedDecision === 'APPROVED', 'Target approval gate must select APPROVED.', targetApproval?.summary);
    assertCondition(issues, targetApproval?.summary?.selectedSource === 'matched-sources', 'Target approval gate must match operator input and target entry sources.', targetApproval?.summary);
    assertCondition(issues, targetApproval?.summary?.readyForPrewrite === true, 'Target approval gate readyForPrewrite must be true.', targetApproval?.summary);
    assertCondition(issues, targetApproval?.summary?.sourceDataWritePerformed === false, 'Target approval gate sourceDataWritePerformed must be false.', targetApproval?.summary);
    assertCondition(issues, targetApproval?.sourceComparison?.meaningfulSourceCount === 2, 'Target approval gate must compare two meaningful sources.', targetApproval?.sourceComparison);
    assertCondition(issues, targetApproval?.sourceComparison?.selectedSourceConflicts?.length === 0, 'Target approval gate must have no source conflicts.', targetApproval?.sourceComparison);

    assertCondition(issues, reportStatus(inputAid) === 'ready-for-prewrite', 'Input aid must be ready-for-prewrite.', reportStatus(inputAid));
    assertCondition(issues, reportStatus(prewrite) === 'ready-for-data-patch', 'Prewrite must be ready-for-data-patch.', reportStatus(prewrite));
    assertCondition(issues, prewrite?.summary?.approvedRows === 1, 'Prewrite must contain one approved row.', prewrite?.summary);
    assertCondition(issues, prewrite?.summary?.patchPreviewRows === 1, 'Prewrite must contain one patch preview row.', prewrite?.summary);
    assertCondition(issues, prewrite?.summary?.targetSourceFile === SOURCE_DATA_FILE, 'Prewrite target source file must be src/data/sajikSeatData.ts.', prewrite?.summary);
    assertCondition(issues, patchPayload?.sectionId === TARGET_SECTION_ID, 'Patch payload must target 131.', patchPayload);
    assertCondition(issues, patchPayload?.validation?.status === 'PASS', 'Patch payload validation must be PASS.', patchPayload);
    assertCondition(issues, sourcePatchContractRow?.patchAllowedFieldsOnly === true, 'Source patch contract must allow only writable fields.', sourcePatchContractRow);
    assertCondition(issues, sourcePatchContractRow?.unexpectedChangedSourceFields?.length === 0, 'Source patch contract must not report unexpected changed fields.', sourcePatchContractRow);

    assertCondition(issues, reportStatus(applyReady) === 'ready-for-manual-apply', 'Apply-ready must be ready-for-manual-apply.', reportStatus(applyReady));
    assertCondition(issues, reportStatus(postApply) === 'not-applied', 'Post-apply audit must be not-applied.', reportStatus(postApply));
    assertCondition(issues, postApply?.summary?.unappliedRows === 1, 'Post-apply audit must report one unapplied row.', postApply?.summary);
    assertCondition(issues, reportStatus(operatorStatus) === 'ready-for-manual-apply', 'Operator status must be ready-for-manual-apply.', reportStatus(operatorStatus));
    assertCondition(issues, statusRow?.rowStatus === 'NOT_APPLIED', 'Operator status row must be NOT_APPLIED.', statusRow);
    assertCondition(issues, reportStatus(manualPatchPlan) === 'ready-for-manual-apply', 'Manual patch plan must be ready-for-manual-apply.', reportStatus(manualPatchPlan));
    assertCondition(issues, manualPatchPlan?.summary?.manualPatchRows === 1, 'Manual patch plan must expose one row.', manualPatchPlan?.summary);
    assertCondition(issues, manualPatchRow?.action === 'MANUAL_PATCH_REQUIRED', 'Manual patch row must require a manual patch.', manualPatchRow);
    assertCondition(issues, manualPatchRow?.targetSourceFile === SOURCE_DATA_FILE, 'Manual patch row target source file must be src/data/sajikSeatData.ts.', manualPatchRow);
    assertCondition(issues, manualPatchRow?.visualPathLocked === true, 'Manual patch row must keep visualPath locked.', manualPatchRow);
    assertCondition(issues, isSameStringArray(manualPatchRow?.writableSourceFields, WRITABLE_SOURCE_FIELDS), 'Manual patch row writableSourceFields must be limited to hitPath and label fields.', manualPatchRow?.writableSourceFields);
    assertCondition(issues, includesAll(writableFragment, ['hitPath:', 'labelPoint:', 'labelX:', 'labelY:']), 'Writable fragment must include all writable geometry fields.', writableFragment);
    assertCondition(issues, excludesAll(writableFragment, LOCKED_FRAGMENT_TOKENS), 'Writable fragment must omit locked source fields.', writableFragment);

    assertCondition(issues, reportStatus(realApprovalReadiness) === 'ready-for-manual-apply', 'Real approval readiness must be ready-for-manual-apply.', reportStatus(realApprovalReadiness));
    assertCondition(issues, readinessRow?.readinessStatus === 'APPROVED_NOT_APPLIED', 'Readiness row must be APPROVED_NOT_APPLIED.', readinessRow);
    assertCondition(issues, readinessRow?.readinessAction === 'APPLY_MANUAL_PATCH', 'Readiness action must be APPLY_MANUAL_PATCH.', readinessRow);
    assertCondition(issues, realApprovalReadiness?.summary?.approvedBlockedRows === 0, 'Real approval readiness must have zero approved blocked rows.', realApprovalReadiness?.summary);

    const safetyContract = {
      sourceDataFile: SOURCE_DATA_FILE,
      sourceDataWritePerformed: Boolean(
        targetEntryPreflight?.summary?.sourceDataWritePerformed
          || targetApproval?.summary?.sourceDataWritePerformed
          || inputAid?.summary?.sourceDataWritePerformed
          || applyReady?.summary?.sourceDataWritePerformed
          || postApply?.summary?.sourceDataWritePerformed
          || operatorStatus?.summary?.sourceDataWritePerformed
          || manualPatchPlan?.summary?.sourceDataWritePerformed
          || realApprovalReadiness?.summary?.safetyContract?.sourceDataWritePerformed,
      ),
      productionWriteAllowed: Boolean(
        targetEntryPreflight?.summary?.productionWriteAllowed
          || targetApproval?.summary?.productionWriteAllowed
          || prewrite?.summary?.productionWriteAllowed
          || applyReady?.summary?.productionWriteAllowed
          || postApply?.summary?.productionWriteAllowed
          || operatorStatus?.summary?.productionWriteAllowed
          || manualPatchPlan?.summary?.productionWriteAllowed
          || realApprovalReadiness?.summary?.safetyContract?.productionWriteAllowed,
      ),
      productionDataChanged: Boolean(
        prewrite?.summary?.productionDataChanged
          || applyReady?.summary?.productionDataChanged
          || realApprovalReadiness?.summary?.safetyContract?.productionDataChanged,
      ),
    };

    assertCondition(issues, safetyContract.sourceDataWritePerformed === false, 'Lifecycle smoke must not write source data.', safetyContract);
    assertCondition(issues, safetyContract.productionWriteAllowed === false, 'Lifecycle smoke must keep productionWriteAllowed=false.', safetyContract);
    assertCondition(issues, safetyContract.productionDataChanged === false, 'Lifecycle smoke must keep productionDataChanged=false.', safetyContract);

    const report = {
      version: SMOKE_VERSION,
      targetSectionId: TARGET_SECTION_ID,
      status: issues.length === 0 ? 'passed' : 'failed',
      generatedAt: new Date().toISOString(),
      inputs: {
        baseInput: formatRelative(baseInputPath),
        baseTargetReviewPacket: formatRelative(baseTargetReviewPacketPath),
        smokeInput: formatRelative(smokeInputPath),
        smokeTargetEntryPreflight: formatRelative(smokeTargetEntryPreflightPath),
        smokeTargetEntry: formatRelative(smokeTargetEntryPath),
      },
      outputs: {
        targetEntryPreflight: formatRelative(smokeTargetEntryPreflightPath),
        targetApprovalGate: formatRelative(targetApprovalPath),
        inputAid: formatRelative(inputAidPath),
        prewrite: formatRelative(prewritePath),
        applyReady: formatRelative(applyReadyPath),
        postApply: formatRelative(postApplyPath),
        operatorStatus: formatRelative(operatorStatusPath),
        manualPatchPlan: formatRelative(manualPatchPlanPath),
        realApprovalReadiness: formatRelative(realApprovalReadinessPath),
        smokeJson: formatRelative(smokeJsonPath),
        smokeMarkdown: formatRelative(smokeMarkdownPath),
      },
      flow: {
        targetEntryPreflightStatus: reportStatus(targetEntryPreflight),
        targetApprovalStatus: reportStatus(targetApproval),
        inputAidStatus: reportStatus(inputAid),
        prewriteStatus: reportStatus(prewrite),
        applyReadyStatus: reportStatus(applyReady),
        postApplyStatus: reportStatus(postApply),
        operatorStatus: reportStatus(operatorStatus),
        manualPatchPlanStatus: reportStatus(manualPatchPlan),
        realApprovalReadinessStatus: reportStatus(realApprovalReadiness),
        manualPatchRows: manualPatchPlan?.summary?.manualPatchRows ?? 0,
        approvedBlockedRows: realApprovalReadiness?.summary?.approvedBlockedRows ?? 0,
      },
      lifecycleContract: {
        targetApprovalReadyForPrewrite: targetApproval?.summary?.readyForPrewrite ?? false,
        prewritePatchPreviewRows: prewrite?.summary?.patchPreviewRows ?? null,
        operatorStatusRowStatus: statusRow?.rowStatus ?? null,
        manualPatchAction: manualPatchRow?.action ?? null,
        readinessStatus: readinessRow?.readinessStatus ?? null,
        readinessAction: readinessRow?.readinessAction ?? null,
      },
      sourceFieldContract: {
        targetSourceFile: manualPatchRow?.targetSourceFile ?? null,
        writableSourceFields: manualPatchRow?.writableSourceFields ?? [],
        sourcePatchChangedFields: sourcePatchContractRow?.changedSourceFields ?? [],
        sourcePatchUnexpectedChangedFields: sourcePatchContractRow?.unexpectedChangedSourceFields ?? [],
        patchAllowedFieldsOnly: sourcePatchContractRow?.patchAllowedFieldsOnly ?? null,
        writableFragmentIncludesWritableFields: includesAll(writableFragment, ['hitPath:', 'labelPoint:', 'labelX:', 'labelY:']),
        writableFragmentLockedTokensAbsent: excludesAll(writableFragment, LOCKED_FRAGMENT_TOKENS),
        lockedFragmentTokens: LOCKED_FRAGMENT_TOKENS,
      },
      safetyContract,
      commandResults,
      blockers,
      issues,
    };

    await writeJson(smokeJsonPath, report);
    await fs.writeFile(smokeMarkdownPath, buildMarkdown(report), 'utf8');

    console.log(`stage01_131_lifecycle_smoke_json:${formatRelative(smokeJsonPath)}`);
    console.log(`stage01_131_lifecycle_smoke_markdown:${formatRelative(smokeMarkdownPath)}`);
    console.log(
      `status:${report.status} target=${TARGET_SECTION_ID} preflight=${report.flow.targetEntryPreflightStatus} approval=${report.flow.targetApprovalStatus} prewrite=${report.flow.prewriteStatus} applyReady=${report.flow.applyReadyStatus} postApply=${report.flow.postApplyStatus} operatorStatusRow=${report.lifecycleContract.operatorStatusRowStatus} manualPatchAction=${report.lifecycleContract.manualPatchAction} readinessRow=${report.lifecycleContract.readinessStatus} sourceDataWritePerformed=${report.safetyContract.sourceDataWritePerformed}`,
    );

    if (report.status !== 'passed') {
      process.exitCode = 1;
    }
  }

  main().catch(async (error) => {
    const failureReport = {
      version: SMOKE_VERSION,
      targetSectionId: TARGET_SECTION_ID,
      status: 'failed',
      generatedAt: new Date().toISOString(),
      flow: {
        targetApprovalStatus: 'missing',
        prewriteStatus: 'missing',
        applyReadyStatus: 'missing',
        postApplyStatus: 'missing',
        operatorStatus: 'missing',
        manualPatchPlanStatus: 'missing',
        realApprovalReadinessStatus: 'missing',
        manualPatchRows: 0,
      },
      sourceFieldContract: {
        writableFragmentLockedTokensAbsent: false,
        patchAllowedFieldsOnly: false,
      },
      safetyContract: {
        sourceDataWritePerformed: false,
        productionWriteAllowed: false,
        productionDataChanged: false,
      },
      issues: [
        {
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
    await writeJson(smokeJsonPath, failureReport).catch(() => {});
    await fs.writeFile(smokeMarkdownPath, buildMarkdown(failureReport), 'utf8').catch(() => {});
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
};

const runStage01AllTargetApprovalInputGuideSmoke = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const SMOKE_VERSION = 'SAJIK_STAGE01_ALL_TARGET_APPROVAL_INPUT_GUIDE_SMOKE_V1';
  const REQUIRED_GUIDE_VERSION = 'SAJIK_STAGE01_ALL_TARGET_APPROVAL_INPUT_GUIDE_V1';
  const EXPECTED_STAGE01_TARGET_SECTION_IDS = [
    '131',
    '032',
    '133',
    '143',
    '135',
    '134',
    '122',
    '123',
    '132',
    '031',
    '022',
    '142',
    '121',
    '124',
    '125',
    '021',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const stageDir = path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator');
  const guidePath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-input-guide.json');
  const smokeJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-input-guide-smoke.json');
  const smokeMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-input-guide-smoke.md');

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);
  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const guide = await readJson(guidePath);
  const summary = guide.summary ?? {};
  const rows = Array.isArray(guide.rows) ? guide.rows : [];
  const sourcePolicy = guide.sourcePolicy ?? {};
  const failures = [];

  const expect = (condition, code) => {
    if (!condition) failures.push(code);
  };

  expect(summary.approvalInputGuideVersion === REQUIRED_GUIDE_VERSION, `GUIDE_VERSION_MISMATCH:${summary.approvalInputGuideVersion ?? ''}`);
  expect(summary.status === 'waiting-for-operator', `GUIDE_STATUS_CHANGED:${summary.status ?? ''}`);
  expect(summary.expectedTargetCount === EXPECTED_STAGE01_TARGET_SECTION_IDS.length, `EXPECTED_TARGET_COUNT_CHANGED:${summary.expectedTargetCount ?? ''}`);
  expect(summary.targetCount === EXPECTED_STAGE01_TARGET_SECTION_IDS.length, `TARGET_COUNT_CHANGED:${summary.targetCount ?? ''}`);
  expect(rows.length === EXPECTED_STAGE01_TARGET_SECTION_IDS.length, `ROW_COUNT_CHANGED:${rows.length}`);
  expect((summary.targetSectionIds ?? []).join(',') === EXPECTED_STAGE01_TARGET_SECTION_IDS.join(','), 'TARGET_SECTION_ORDER_CHANGED');
  expect(rows.map((row) => row.sectionId).join(',') === EXPECTED_STAGE01_TARGET_SECTION_IDS.join(','), 'ROW_SECTION_ORDER_CHANGED');
  expect(summary.operatorInputRows === EXPECTED_STAGE01_TARGET_SECTION_IDS.length, `OPERATOR_INPUT_ROW_COUNT_CHANGED:${summary.operatorInputRows ?? ''}`);
  expect(summary.pendingCount === EXPECTED_STAGE01_TARGET_SECTION_IDS.length, `PENDING_COUNT_CHANGED:${summary.pendingCount ?? ''}`);
  expect(summary.operatorInputApprovedCount === 0, `OPERATOR_INPUT_APPROVED_COUNT_CHANGED:${summary.operatorInputApprovedCount ?? ''}`);
  expect(summary.readyForApprovalGateCount === 0, `READY_FOR_APPROVAL_GATE_COUNT_CHANGED:${summary.readyForApprovalGateCount ?? ''}`);
  expect(summary.readyForPrewriteCount === 0, `READY_FOR_PREWRITE_COUNT_CHANGED:${summary.readyForPrewriteCount ?? ''}`);
  expect(summary.missingTemplateCount === 0, `MISSING_TEMPLATE_COUNT_NOT_ZERO:${summary.missingTemplateCount ?? ''}`);
  expect(summary.missingOfficialPngEvidenceCount === 0, `MISSING_OFFICIAL_PNG_EVIDENCE_COUNT_NOT_ZERO:${summary.missingOfficialPngEvidenceCount ?? ''}`);
  expect(summary.blockedCount === 0, `BLOCKED_COUNT_NOT_ZERO:${summary.blockedCount ?? ''}`);
  expect(summary.sourceDataWritePerformed === false, 'SOURCE_DATA_WRITE_PERFORMED_NOT_FALSE');
  expect(summary.productionWriteAllowed === false, 'PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  expect(summary.writesOperatorInput === false, 'WRITES_OPERATOR_INPUT_NOT_FALSE');
  expect(summary.writesProductionData === false, 'WRITES_PRODUCTION_DATA_NOT_FALSE');
  expect(summary.officialPngOnly === true, 'OFFICIAL_PNG_ONLY_NOT_TRUE');
  expect(summary.operatorApprovedCoordinatesRequired === true, 'OPERATOR_APPROVED_COORDINATES_REQUIRED_NOT_TRUE');
  expect(sourcePolicy.allowedCoordinateSource === 'operator-provided official 2026 Sajik PNG coordinates only', 'ALLOWED_COORDINATE_SOURCE_CHANGED');
  expect(sourcePolicy.coordinateSystem === 'SVG viewBox 0 0 960 640', 'COORDINATE_SYSTEM_CHANGED');
  expect(Array.isArray(sourcePolicy.disallowedSources) && sourcePolicy.disallowedSources.includes('AI coordinate prediction'), 'AI_COORDINATE_PREDICTION_NOT_FORBIDDEN');
  expect(Array.isArray(sourcePolicy.disallowedSources) && sourcePolicy.disallowedSources.includes('web-search-based baseball data'), 'WEB_SEARCH_BASEBALL_DATA_NOT_FORBIDDEN');

  for (const row of rows) {
    expect(row.inputStatus === 'PENDING', `ROW_INPUT_STATUS_CHANGED:${row.sectionId}:${row.inputStatus ?? ''}`);
    expect(row.operatorDecision === 'PENDING', `ROW_OPERATOR_DECISION_CHANGED:${row.sectionId}:${row.operatorDecision ?? ''}`);
    expect(row.nextOperatorAction === 'FILL_OR_DECIDE_FROM_OFFICIAL_PNG', `ROW_NEXT_ACTION_CHANGED:${row.sectionId}:${row.nextOperatorAction ?? ''}`);
    expect(Boolean(row.entryTemplateJson), `ROW_ENTRY_TEMPLATE_JSON_MISSING:${row.sectionId}`);
    expect(Boolean(row.entryTemplateCsv), `ROW_ENTRY_TEMPLATE_CSV_MISSING:${row.sectionId}`);
    expect(Boolean(row.officialCropPng), `ROW_OFFICIAL_CROP_MISSING:${row.sectionId}`);
    expect(Boolean(row.overlayCropPng), `ROW_OVERLAY_CROP_MISSING:${row.sectionId}`);
    expect(Boolean(row.edgeCropPng), `ROW_EDGE_CROP_MISSING:${row.sectionId}`);
    expect(Boolean(row.targetReviewPacket), `ROW_REVIEW_PACKET_MISSING:${row.sectionId}`);
    expect(Boolean(row.targetEntryPreflight), `ROW_ENTRY_PREFLIGHT_MISSING:${row.sectionId}`);
    expect(Boolean(row.targetApprovalGate), `ROW_APPROVAL_GATE_MISSING:${row.sectionId}`);
    expect(Array.isArray(row.approvedRequiredFields) && row.approvedRequiredFields.length === 7, `ROW_APPROVED_REQUIRED_FIELDS_CHANGED:${row.sectionId}`);
    expect(row.editableFieldsBlank === true, `ROW_EDITABLE_FIELDS_NOT_BLANK:${row.sectionId}`);
    expect(Array.isArray(row.missingApprovedFields) && row.missingApprovedFields.length === 0, `ROW_MISSING_APPROVED_FIELDS_NOT_EMPTY:${row.sectionId}`);
    expect(row.officialImageVerified === true, `ROW_OFFICIAL_IMAGE_NOT_VERIFIED:${row.sectionId}`);
    expect(row.candidateReferenceOnly === true, `ROW_CANDIDATE_NOT_REFERENCE_ONLY:${row.sectionId}`);
    expect(row.sourceDataWritePerformed === false, `ROW_SOURCE_DATA_WRITE_PERFORMED:${row.sectionId}`);
    expect(row.writesOperatorInput === false, `ROW_WRITES_OPERATOR_INPUT:${row.sectionId}`);
    expect(row.writesProductionData === false, `ROW_WRITES_PRODUCTION_DATA:${row.sectionId}`);
    expect(Array.isArray(row.blockers) && row.blockers.length === 0, `ROW_BLOCKERS_PRESENT:${row.sectionId}`);
  }

  const status = failures.length > 0 ? 'failed' : 'passed';
  const smoke = {
    smokeVersion: SMOKE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    report: relativePath(guidePath),
    targetCount: rows.length,
    pendingCount: summary.pendingCount ?? 0,
    operatorInputApprovedCount: summary.operatorInputApprovedCount ?? 0,
    readyForApprovalGateCount: summary.readyForApprovalGateCount ?? 0,
    readyForPrewriteCount: summary.readyForPrewriteCount ?? 0,
    sourceDataWritePerformed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    failures,
  };

  await writeJson(smokeJsonPath, smoke);

  const markdown = [
    '# Sajik Stage 01 All-Target Approval Input Guide Smoke',
    '',
    `- smokeVersion: \`${SMOKE_VERSION}\``,
    `- status: \`${status}\``,
    `- report: \`${relativePath(guidePath)}\``,
    `- targets: \`${rows.length}/${EXPECTED_STAGE01_TARGET_SECTION_IDS.length}\``,
    `- pendingCount: \`${smoke.pendingCount}\``,
    `- operatorInputApprovedCount: \`${smoke.operatorInputApprovedCount}\``,
    `- readyForApprovalGateCount: \`${smoke.readyForApprovalGateCount}\``,
    `- readyForPrewriteCount: \`${smoke.readyForPrewriteCount}\``,
    `- sourceDataWritePerformed: \`${smoke.sourceDataWritePerformed}\``,
    `- writesOperatorInput: \`${smoke.writesOperatorInput}\``,
    `- writesProductionData: \`${smoke.writesProductionData}\``,
    '',
    '## Failures',
    '',
    ...(failures.length > 0 ? failures.map((failure) => `- \`${failure}\``) : ['- none']),
    '',
  ].join('\n');

  await fs.writeFile(`${smokeMarkdownPath}.tmp`, markdown, 'utf8');
  await fs.rename(`${smokeMarkdownPath}.tmp`, smokeMarkdownPath);

  console.log(`stage01_all_target_approval_input_guide_smoke_json:${relativePath(smokeJsonPath)}`);
  console.log(`stage01_all_target_approval_input_guide_smoke_markdown:${relativePath(smokeMarkdownPath)}`);
  console.log(
    `status:${status} targets=${rows.length}/${EXPECTED_STAGE01_TARGET_SECTION_IDS.length} pending=${smoke.pendingCount} approved=${smoke.operatorInputApprovedCount} readyForApprovalGate=${smoke.readyForApprovalGateCount} readyForPrewrite=${smoke.readyForPrewriteCount} sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`,
  );

  if (status !== 'passed') {
    process.exitCode = 1;
  }
};

const runStage01AllTargetApprovalInputGuide = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const GUIDE_VERSION = 'SAJIK_STAGE01_ALL_TARGET_APPROVAL_INPUT_GUIDE_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const EXPECTED_STAGE01_TARGET_SECTION_IDS = [
    '131',
    '032',
    '135',
    '132',
    '031',
    '133',
    '022',
    '143',
    '134',
    '142',
    '121',
    '124',
    '125',
    '122',
    '021',
    '123',
  ];
  const APPROVED_REQUIRED_EDITABLE_FIELDS = [
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const stageDir = path.resolve(
    frontendRoot,
    argValue('--stage-dir', path.join('reports/stadium/sajik-stage01-operator')),
  );
  const targetDir = path.join(stageDir, 'targets');
  const reviewPacketsPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-review-packets.json');
  const operatorInputPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json');
  const approvalReadinessPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-readiness.json');
  const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-input-guide.json');
  const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-input-guide.csv');
  const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-input-guide.md');

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const readOptionalJson = async (filePath) => {
    try {
      return { exists: true, data: await readJson(filePath), error: null };
    } catch (error) {
      return {
        exists: error?.code !== 'ENOENT',
        data: null,
        error: error?.code === 'ENOENT'
          ? `MISSING_JSON:${relativePath(filePath)}`
          : `READ_JSON_FAILED:${relativePath(filePath)}:${error.message}`,
      };
    }
  };

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
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

  const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';
  const pathForTemplate = (sectionId) => path.join(targetDir, `${sectionId}-entry-template.json`);
  const toRelativeOrEmpty = (value) => value ? value : '';

  const decisionNextAction = (row) => {
    if (row.blockers.length > 0) return 'RESOLVE_INPUT_GUIDE_BLOCKERS';
    if (row.readyForPrewrite) return 'RUN_PREWRITE';
    if (row.readyForApprovalGate) return 'RUN_TARGET_APPROVAL_GATE';
    if (row.operatorDecision === 'APPROVED') return 'RUN_TARGET_ENTRY_PREFLIGHT';
    if (row.operatorDecision === 'KEEP_CURRENT') return 'NO_PATCH_PREVIEW_KEEP_CURRENT';
    if (['REJECTED', 'NEEDS_RETRACE'].includes(row.operatorDecision)) return 'NO_PATCH_PREVIEW_OPERATOR_DECISION';
    return 'FILL_OR_DECIDE_FROM_OFFICIAL_PNG';
  };

  const statusForRow = (row) => {
    if (row.blockers.length > 0) return 'BLOCKED';
    if (row.readyForPrewrite) return 'READY_FOR_PREWRITE';
    if (row.readyForApprovalGate) return 'READY_FOR_APPROVAL_GATE';
    if (row.operatorDecision === 'PENDING') return 'PENDING';
    return row.operatorDecision;
  };

  const reviewPackets = await readJson(reviewPacketsPath);
  const operatorInput = await readJson(operatorInputPath);
  const approvalReadiness = await readJson(approvalReadinessPath);

  const reviewRowsBySection = new Map((Array.isArray(reviewPackets.rows) ? reviewPackets.rows : [])
    .map((row) => [row.sectionId, row]));
  const inputRowsBySection = new Map((Array.isArray(operatorInput.corrections) ? operatorInput.corrections : [])
    .map((row) => [row.sectionId, row]));
  const readinessRowsBySection = new Map((Array.isArray(approvalReadiness.rows) ? approvalReadiness.rows : [])
    .map((row) => [row.sectionId, row]));

  const rows = [];
  for (const sectionId of EXPECTED_STAGE01_TARGET_SECTION_IDS) {
    const reviewRow = reviewRowsBySection.get(sectionId);
    const inputRow = inputRowsBySection.get(sectionId);
    const readinessRow = readinessRowsBySection.get(sectionId);
    const templatePath = path.resolve(frontendRoot, reviewRow?.entryTemplateJson ?? relativePath(pathForTemplate(sectionId)));
    const templateResult = await readOptionalJson(templatePath);
    const template = templateResult.data ?? {};
    const officialArtifacts = template.officialPngImageAnalysisArtifacts ?? {};
    const operatorDecision = String(inputRow?.operatorDecision ?? template.operatorDecision ?? readinessRow?.selectedDecision ?? 'PENDING');
    const editableFieldsBlank = APPROVED_REQUIRED_EDITABLE_FIELDS.every((field) => isBlank(inputRow?.[field]));
    const missingApprovedFields = operatorDecision === 'APPROVED'
      ? APPROVED_REQUIRED_EDITABLE_FIELDS.filter((field) => isBlank(inputRow?.[field]))
      : [];
    const evidencePaths = {
      officialCropPng: toRelativeOrEmpty(reviewRow?.officialCropPng ?? officialArtifacts.officialCropPng),
      overlayCropPng: toRelativeOrEmpty(reviewRow?.overlayCropPng ?? officialArtifacts.overlayCropPng),
      edgeCropPng: toRelativeOrEmpty(reviewRow?.edgeCropPng ?? officialArtifacts.edgeCropPng),
    };
    const evidenceMissing = !reviewRow
      || reviewRow.officialImageVerified !== true
      || !evidencePaths.officialCropPng
      || !evidencePaths.overlayCropPng
      || !evidencePaths.edgeCropPng;
    const blockers = [
      ...(!inputRow ? ['OPERATOR_INPUT_SECTION_MISSING'] : []),
      ...(!readinessRow ? ['READINESS_ROW_MISSING'] : []),
      ...(!templateResult.data ? ['MISSING_ENTRY_TEMPLATE'] : []),
      ...(templateResult.error && templateResult.exists ? [templateResult.error] : []),
      ...(evidenceMissing ? ['MISSING_OFFICIAL_PNG_EVIDENCE'] : []),
      ...(operatorDecision === 'APPROVED' && missingApprovedFields.length > 0
        ? [`APPROVED_REQUIRED_FIELDS_MISSING:${missingApprovedFields.join('|')}`]
        : []),
      ...(Array.isArray(readinessRow?.blockers) ? readinessRow.blockers : []),
    ];
    const row = {
      sectionId,
      inputStatus: 'PENDING',
      operatorDecision,
      nextOperatorAction: '',
      entryTemplateJson: toRelativeOrEmpty(reviewRow?.entryTemplateJson ?? relativePath(templatePath)),
      entryTemplateCsv: toRelativeOrEmpty(reviewRow?.entryTemplateCsv ?? relativePath(path.join(targetDir, `${sectionId}-entry-template.csv`))),
      officialCropPng: evidencePaths.officialCropPng,
      overlayCropPng: evidencePaths.overlayCropPng,
      edgeCropPng: evidencePaths.edgeCropPng,
      targetReviewPacket: toRelativeOrEmpty(readinessRow?.targetReviewPacket ?? `reports/stadium/sajik-stage01-operator/targets/${sectionId}-review-packet.json`),
      targetEntryPreflight: toRelativeOrEmpty(readinessRow?.targetEntryPreflight ?? `reports/stadium/sajik-stage01-operator/targets/${sectionId}-entry-preflight.json`),
      targetApprovalGate: toRelativeOrEmpty(readinessRow?.targetApprovalGate ?? `reports/stadium/sajik-stage01-operator/targets/${sectionId}-approval-gate.json`),
      approvedRequiredFields: Array.isArray(template.approvedRequiredFields) ? template.approvedRequiredFields : [],
      editableFieldsBlank,
      missingApprovedFields,
      readyForApprovalGate: readinessRow?.readyForApprovalGate === true,
      readyForPrewrite: readinessRow?.readyForPrewrite === true,
      preflightStatus: readinessRow?.preflightStatus ?? 'missing',
      approvalStatus: readinessRow?.approvalStatus ?? 'missing',
      selectedSource: readinessRow?.selectedSource ?? 'none',
      imageRiskLevel: reviewRow?.imageRiskLevel ?? inputRow?.imageRiskLevel ?? 'UNKNOWN',
      imageRiskReasons: Array.isArray(reviewRow?.imageRiskReasons) ? reviewRow.imageRiskReasons : [],
      imagePriorityRank: reviewRow?.imagePriorityRank ?? inputRow?.imagePriorityRank ?? null,
      officialImageVerified: reviewRow?.officialImageVerified === true,
      candidateReferenceOnly: reviewRow?.candidateReferenceOnly === true,
      sourceDataWritePerformed: false,
      writesOperatorInput: false,
      writesProductionData: false,
      blockers,
    };
    row.inputStatus = statusForRow(row);
    row.nextOperatorAction = decisionNextAction(row);
    rows.push(row);
  }

  const operatorInputRows = Array.isArray(operatorInput.corrections) ? operatorInput.corrections.length : 0;
  const operatorInputApprovedCount = rows.filter((row) => row.operatorDecision === 'APPROVED').length;
  const pendingCount = rows.filter((row) => row.operatorDecision === 'PENDING').length;
  const readyForApprovalGateCount = rows.filter((row) => row.readyForApprovalGate).length;
  const readyForPrewriteCount = rows.filter((row) => row.readyForPrewrite).length;
  const missingTemplateCount = rows.filter((row) => row.blockers.includes('MISSING_ENTRY_TEMPLATE')).length;
  const missingOfficialPngEvidenceCount = rows.filter((row) => row.blockers.includes('MISSING_OFFICIAL_PNG_EVIDENCE')).length;
  const blockedCount = rows.filter((row) => row.blockers.length > 0).length;
  const blockers = rows.flatMap((row) => row.blockers.map((blocker) => `TARGET_APPROVAL_INPUT_GUIDE_BLOCKED:${row.sectionId}:${blocker}`));
  const status = blockedCount > 0
    ? 'blocked'
    : readyForPrewriteCount > 0
      ? 'ready-for-prewrite'
      : readyForApprovalGateCount > 0
        ? 'ready-for-approval-gate'
        : 'waiting-for-operator';

  const summary = {
    approvalInputGuideVersion: GUIDE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    targetStage: TARGET_STAGE_LABEL,
    expectedTargetCount: EXPECTED_STAGE01_TARGET_SECTION_IDS.length,
    targetCount: rows.length,
    targetSectionIds: rows.map((row) => row.sectionId),
    operatorInputRows,
    operatorInputApprovedCount,
    pendingCount,
    readyForApprovalGateCount,
    readyForPrewriteCount,
    missingTemplateCount,
    missingOfficialPngEvidenceCount,
    blockedCount,
    sourceDataWritePerformed: false,
    productionWriteAllowed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    officialPngOnly: true,
    operatorApprovedCoordinatesRequired: true,
    blockers,
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    sourceReports: {
      allTargetReviewPackets: relativePath(reviewPacketsPath),
      operatorInput: relativePath(operatorInputPath),
      allTargetApprovalReadiness: relativePath(approvalReadinessPath),
    },
    sourcePolicy: {
      allowedCoordinateSource: 'operator-provided official 2026 Sajik PNG coordinates only',
      coordinateSystem: 'SVG viewBox 0 0 960 640',
      noAutomaticSourceWrite: true,
      missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      disallowedSources: [
        'AI coordinate prediction',
        'browser CSS pixels',
        'resized screenshots',
        'external crawling',
        'web-search-based baseball data',
        'third-party copied seatmap images',
      ],
    },
    operatorInstructions: {
      firstArtifactToOpen: 'officialCropPng',
      compareArtifact: 'overlayCropPng',
      boundaryArtifact: 'edgeCropPng',
      requiredApprovalDecision: 'operatorDecision=APPROVED',
      approvedRequiredFields: [
        'operatorDecision=APPROVED',
        ...APPROVED_REQUIRED_EDITABLE_FIELDS,
      ],
      doNotCopyReferenceCandidates: true,
      productionDataPatchEligibleOnlyAfter: 'readyForPrewrite=true',
    },
    rows,
  };

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'sectionId',
      'inputStatus',
      'operatorDecision',
      'nextOperatorAction',
      'entryTemplateJson',
      'officialCropPng',
      'overlayCropPng',
      'edgeCropPng',
      'readyForApprovalGate',
      'readyForPrewrite',
      'editableFieldsBlank',
      'missingApprovedFields',
      'imageRiskLevel',
      'imageRiskReasons',
      'blockers',
    ],
    ...rows.map((row) => [
      row.sectionId,
      row.inputStatus,
      row.operatorDecision,
      row.nextOperatorAction,
      row.entryTemplateJson,
      row.officialCropPng,
      row.overlayCropPng,
      row.edgeCropPng,
      row.readyForApprovalGate,
      row.readyForPrewrite,
      row.editableFieldsBlank,
      row.missingApprovedFields.join('|'),
      row.imageRiskLevel,
      row.imageRiskReasons.join('|'),
      row.blockers.join('|'),
    ]),
  ]);

  const markdown = [
    '# Sajik Stage 01 All-Target Approval Input Guide',
    '',
    `- version: \`${GUIDE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- targets: \`${summary.targetCount}/${summary.expectedTargetCount}\``,
    `- pendingCount: \`${summary.pendingCount}\``,
    `- operatorInputApprovedCount: \`${summary.operatorInputApprovedCount}\``,
    `- readyForApprovalGateCount: \`${summary.readyForApprovalGateCount}\``,
    `- readyForPrewriteCount: \`${summary.readyForPrewriteCount}\``,
    `- blockedCount: \`${summary.blockedCount}\``,
    `- sourceDataWritePerformed: \`${summary.sourceDataWritePerformed}\``,
    `- writesOperatorInput: \`${summary.writesOperatorInput}\``,
    `- writesProductionData: \`${summary.writesProductionData}\``,
    '',
    '## Operator Source Policy',
    '',
    '- Use only the locked official 2026 Sajik PNG in SVG viewBox `0 0 960 640`.',
    '- Do not use AI coordinate prediction, resized screenshots, browser CSS pixels, web search, crawling, or third-party seatmap images.',
    '- This guide does not edit the operator input file or production source data.',
    '',
    '## Required Approval Fields',
    '',
    ...report.operatorInstructions.approvedRequiredFields.map((field) => `- \`${field}\``),
    '',
    '## Target Rows',
    '',
    markdownTable(
      ['section', 'status', 'decision', 'next action', 'template', 'official crop', 'overlay crop', 'edge crop', 'risk', 'blockers'],
      rows.map((row) => [
        `\`${row.sectionId}\``,
        `\`${row.inputStatus}\``,
        `\`${row.operatorDecision}\``,
        `\`${row.nextOperatorAction}\``,
        `\`${row.entryTemplateJson}\``,
        `\`${row.officialCropPng}\``,
        `\`${row.overlayCropPng}\``,
        `\`${row.edgeCropPng}\``,
        `\`${row.imageRiskLevel}\``,
        row.blockers.length > 0 ? `\`${row.blockers.join(' | ')}\`` : 'none',
      ]),
    ),
    '',
    '## Outputs',
    '',
    `- \`${relativePath(jsonPath)}\``,
    `- \`${relativePath(csvPath)}\``,
    `- \`${relativePath(markdownPath)}\``,
    '',
    '## Blockers',
    '',
    ...(blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``) : ['- none']),
    '',
  ].join('\n');

  await fs.writeFile(`${markdownPath}.tmp`, markdown, 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(`stage01_all_target_approval_input_guide_json:${relativePath(jsonPath)}`);
  console.log(`stage01_all_target_approval_input_guide_csv:${relativePath(csvPath)}`);
  console.log(`stage01_all_target_approval_input_guide_markdown:${relativePath(markdownPath)}`);
  console.log(
    `status:${summary.status} targets=${summary.targetCount}/${summary.expectedTargetCount} pending=${summary.pendingCount} approved=${summary.operatorInputApprovedCount} readyForApprovalGate=${summary.readyForApprovalGateCount} readyForPrewrite=${summary.readyForPrewriteCount} sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`,
  );

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01AllTargetApprovalReadinessSmoke = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const SMOKE_VERSION = 'SAJIK_STAGE01_ALL_TARGET_APPROVAL_READINESS_SMOKE_V1';
  const REQUIRED_READINESS_VERSION = 'SAJIK_STAGE01_ALL_TARGET_APPROVAL_READINESS_V1';
  const EXPECTED_STAGE01_TARGET_SECTION_IDS = [
    '131',
    '032',
    '133',
    '143',
    '135',
    '134',
    '122',
    '123',
    '132',
    '031',
    '022',
    '142',
    '121',
    '124',
    '125',
    '021',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const stageDir = path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator');
  const reportPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-readiness.json');
  const smokeJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-readiness-smoke.json');
  const smokeMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-readiness-smoke.md');

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);
  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const report = await readJson(reportPath);
  const summary = report.summary ?? {};
  const rows = Array.isArray(report.rows) ? report.rows : [];
  const failures = [];

  const expect = (condition, code) => {
    if (!condition) failures.push(code);
  };

  expect(summary.allTargetApprovalReadinessVersion === REQUIRED_READINESS_VERSION, `READINESS_VERSION_MISMATCH:${summary.allTargetApprovalReadinessVersion ?? ''}`);
  expect(summary.targetCount === EXPECTED_STAGE01_TARGET_SECTION_IDS.length, `TARGET_COUNT_MISMATCH:${summary.targetCount ?? ''}`);
  expect(rows.length === EXPECTED_STAGE01_TARGET_SECTION_IDS.length, `ROW_COUNT_MISMATCH:${rows.length}`);
  expect((summary.targetSectionIds ?? []).join(',') === EXPECTED_STAGE01_TARGET_SECTION_IDS.join(','), 'TARGET_SECTION_ORDER_MISMATCH');
  expect(rows.map((row) => row.sectionId).join(',') === EXPECTED_STAGE01_TARGET_SECTION_IDS.join(','), 'ROW_SECTION_ORDER_MISMATCH');
  expect(summary.sourceDataWritePerformed === false, 'SOURCE_DATA_WRITE_PERFORMED_NOT_FALSE');
  expect(summary.productionWriteAllowed === false, 'PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  expect(summary.writesOperatorInput === false, 'WRITES_OPERATOR_INPUT_NOT_FALSE');
  expect(summary.writesProductionData === false, 'WRITES_PRODUCTION_DATA_NOT_FALSE');
  expect(summary.officialPngOnly === true, 'OFFICIAL_PNG_ONLY_NOT_TRUE');
  expect(summary.operatorApprovedCoordinatesRequired === true, 'OPERATOR_APPROVED_COORDINATES_REQUIRED_NOT_TRUE');
  expect(rows.every((row) => row.preflightCommandExitCode === 0), 'PREFLIGHT_COMMAND_EXIT_NONZERO');
  expect(rows.every((row) => row.approvalCommandExitCode === 0), 'APPROVAL_COMMAND_EXIT_NONZERO');
  expect(rows.every((row) => row.allowAnyStage01Target === true), 'ALLOW_ANY_STAGE01_TARGET_NOT_TRUE_FOR_ALL_ROWS');
  expect(rows.filter((row) => row.matchesNextOperatorSection === true).map((row) => row.sectionId).join(',') === '131', 'NEXT_OPERATOR_SECTION_NOT_ONLY_131');
  expect(rows.every((row) => Array.isArray(row.blockers) && row.blockers.length === 0), 'ROW_BLOCKERS_PRESENT');
  expect(summary.blockedCount === 0, `BLOCKED_COUNT_NOT_ZERO:${summary.blockedCount ?? ''}`);
  expect(summary.readyForPrewriteCount === rows.filter((row) => row.readyForPrewrite).length, 'READY_FOR_PREWRITE_COUNT_MISMATCH');

  const status = failures.length > 0 ? 'failed' : 'passed';
  const smoke = {
    smokeVersion: SMOKE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    report: relativePath(reportPath),
    targetCount: rows.length,
    readyForApprovalGateCount: summary.readyForApprovalGateCount ?? 0,
    readyForPrewriteCount: summary.readyForPrewriteCount ?? 0,
    sourceDataWritePerformed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    failures,
  };

  await writeJson(smokeJsonPath, smoke);

  const markdown = [
    '# Sajik Stage 01 All-Target Approval Readiness Smoke',
    '',
    `- smokeVersion: \`${SMOKE_VERSION}\``,
    `- status: \`${status}\``,
    `- report: \`${relativePath(reportPath)}\``,
    `- targets: \`${rows.length}/${EXPECTED_STAGE01_TARGET_SECTION_IDS.length}\``,
    `- readyForApprovalGateCount: \`${smoke.readyForApprovalGateCount}\``,
    `- readyForPrewriteCount: \`${smoke.readyForPrewriteCount}\``,
    `- sourceDataWritePerformed: \`${smoke.sourceDataWritePerformed}\``,
    `- writesOperatorInput: \`${smoke.writesOperatorInput}\``,
    `- writesProductionData: \`${smoke.writesProductionData}\``,
    '',
    '## Failures',
    '',
    ...(failures.length > 0 ? failures.map((failure) => `- \`${failure}\``) : ['- none']),
    '',
  ].join('\n');

  await fs.writeFile(`${smokeMarkdownPath}.tmp`, markdown, 'utf8');
  await fs.rename(`${smokeMarkdownPath}.tmp`, smokeMarkdownPath);

  console.log(`stage01_all_target_approval_readiness_smoke_json:${relativePath(smokeJsonPath)}`);
  console.log(`stage01_all_target_approval_readiness_smoke_markdown:${relativePath(smokeMarkdownPath)}`);
  console.log(
    `status:${status} targets=${rows.length}/${EXPECTED_STAGE01_TARGET_SECTION_IDS.length} readyForApprovalGate=${smoke.readyForApprovalGateCount} readyForPrewrite=${smoke.readyForPrewriteCount} sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`,
  );

  if (status !== 'passed') {
    process.exitCode = 1;
  }
};

const runStage01AllTargetApprovalReadiness = async () => {
  const { spawnSync } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const READINESS_VERSION = 'SAJIK_STAGE01_ALL_TARGET_APPROVAL_READINESS_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const EXPECTED_STAGE01_TARGET_SECTION_IDS = [
    '131',
    '032',
    '135',
    '132',
    '031',
    '133',
    '022',
    '143',
    '134',
    '142',
    '121',
    '124',
    '125',
    '122',
    '021',
    '123',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const stageDir = path.resolve(
    frontendRoot,
    argValue('--stage-dir', path.join('reports/stadium/sajik-stage01-operator')),
  );
  const targetDir = path.join(stageDir, 'targets');
  const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-readiness.json');
  const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-readiness.csv');
  const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-readiness.md');

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
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

  const runNodeScript = (scriptPath, args) => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', scriptPath, ...args], {
      cwd: frontendRoot,
      encoding: 'utf8',
    });
    return {
      command: `node --import tsx ${scriptPath} ${args.join(' ')}`,
      exitCode: result.status ?? 1,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  };

  const commandTail = (value) => String(value ?? '')
    .trim()
    .split('\n')
    .filter(Boolean)
    .slice(-4)
    .join('\n');

  const rows = [];
  const blockers = [];

  for (const sectionId of EXPECTED_STAGE01_TARGET_SECTION_IDS) {
    const preflightCommand = runNodeScript('scripts/sajik-seatmap-stage01.mjs', [
      '--target',
      sectionId,
    ]);
    const approvalCommand = runNodeScript('scripts/sajik-seatmap-stage01.mjs', [
      '--target',
      sectionId,
      '--allow-any-stage01-target',
    ]);

    const preflightPath = path.join(targetDir, `${sectionId}-entry-preflight.json`);
    const approvalPath = path.join(targetDir, `${sectionId}-approval-gate.json`);
    const preflight = await readJson(preflightPath);
    const approval = await readJson(approvalPath);
    const preflightSummary = preflight.summary ?? {};
    const approvalSummary = approval.summary ?? {};
    const rowBlockers = [
      ...(Array.isArray(preflightSummary.blockers) ? preflightSummary.blockers : []),
      ...(Array.isArray(approvalSummary.blockers) ? approvalSummary.blockers : []),
    ];

    if (preflightCommand.exitCode !== 0) {
      rowBlockers.push(`PREFLIGHT_COMMAND_FAILED:${preflightCommand.exitCode}`);
    }
    if (approvalCommand.exitCode !== 0) {
      rowBlockers.push(`APPROVAL_COMMAND_FAILED:${approvalCommand.exitCode}`);
    }
    if (preflightSummary.targetSectionId !== sectionId) {
      rowBlockers.push(`PREFLIGHT_TARGET_MISMATCH:${preflightSummary.targetSectionId ?? ''}:${sectionId}`);
    }
    if (approvalSummary.targetSectionId !== sectionId) {
      rowBlockers.push(`APPROVAL_TARGET_MISMATCH:${approvalSummary.targetSectionId ?? ''}:${sectionId}`);
    }
    if (preflightSummary.sourceDataWritePerformed !== false || approvalSummary.sourceDataWritePerformed !== false) {
      rowBlockers.push('SOURCE_DATA_WRITE_PERFORMED_NOT_FALSE');
    }
    if (preflightSummary.writesOperatorInput !== false || approvalSummary.writesOperatorInput !== false) {
      rowBlockers.push('WRITES_OPERATOR_INPUT_NOT_FALSE');
    }
    if (preflightSummary.writesProductionData !== false || approvalSummary.writesProductionData !== false) {
      rowBlockers.push('WRITES_PRODUCTION_DATA_NOT_FALSE');
    }

    rows.push({
      sectionId,
      preflightStatus: preflightSummary.status ?? 'missing',
      approvalStatus: approvalSummary.status ?? 'missing',
      selectedSource: approvalSummary.selectedSource ?? preflightSummary.selectedSource ?? 'none',
      selectedDecision: approvalSummary.selectedDecision ?? preflightSummary.selectedDecision ?? 'PENDING',
      readyForApprovalGate: preflightSummary.readyForApprovalGate === true,
      readyForPrewrite: approvalSummary.readyForPrewrite === true,
      matchesNextOperatorSection: approvalSummary.matchesNextOperatorSection === true,
      allowAnyStage01Target: approvalSummary.allowAnyStage01Target === true,
      targetReviewPacket: approvalSummary.targetReviewPacket ?? preflightSummary.targetReviewPacket ?? '',
      targetEntryPreflight: approvalSummary.targetEntryPreflight ?? relativePath(preflightPath),
      targetApprovalGate: relativePath(approvalPath),
      preflightCommandExitCode: preflightCommand.exitCode,
      approvalCommandExitCode: approvalCommand.exitCode,
      commandTail: commandTail(`${preflightCommand.stdout}\n${approvalCommand.stdout}\n${preflightCommand.stderr}\n${approvalCommand.stderr}`),
      blockers: rowBlockers,
    });
  }

  rows.forEach((row) => {
    if (row.blockers.length > 0) {
      blockers.push(`TARGET_APPROVAL_READINESS_BLOCKED:${row.sectionId}:${row.blockers.join(':')}`);
    }
  });

  const readyForPrewriteCount = rows.filter((row) => row.readyForPrewrite).length;
  const readyForApprovalGateCount = rows.filter((row) => row.readyForApprovalGate).length;
  const waitingCount = rows.filter((row) => row.approvalStatus === 'waiting-for-operator').length;
  const status = blockers.length > 0
    ? 'blocked'
    : readyForPrewriteCount > 0
      ? 'ready-for-prewrite'
      : 'waiting-for-operator';

  const summary = {
    allTargetApprovalReadinessVersion: READINESS_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    targetStage: TARGET_STAGE_LABEL,
    expectedTargetCount: EXPECTED_STAGE01_TARGET_SECTION_IDS.length,
    targetCount: rows.length,
    targetSectionIds: rows.map((row) => row.sectionId),
    readyForApprovalGateCount,
    readyForPrewriteCount,
    waitingCount,
    blockedCount: rows.filter((row) => row.blockers.length > 0).length,
    sourceDataWritePerformed: false,
    productionWriteAllowed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    officialPngOnly: true,
    operatorApprovedCoordinatesRequired: true,
    blockers,
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    sourcePolicy: {
      allowedCoordinateSource: 'operator-provided official 2026 Sajik PNG coordinates only',
      coordinateSystem: 'SVG viewBox 0 0 960 640',
      noAutomaticSourceWrite: true,
      missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      disallowedSources: [
        'AI coordinate prediction',
        'browser CSS pixels',
        'resized screenshots',
        'external crawling',
        'web-search-based baseball data',
        'third-party copied seatmap images',
      ],
    },
    rows,
  };

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'sectionId',
      'preflightStatus',
      'approvalStatus',
      'selectedSource',
      'selectedDecision',
      'readyForApprovalGate',
      'readyForPrewrite',
      'matchesNextOperatorSection',
      'allowAnyStage01Target',
      'blockers',
    ],
    ...rows.map((row) => [
      row.sectionId,
      row.preflightStatus,
      row.approvalStatus,
      row.selectedSource,
      row.selectedDecision,
      row.readyForApprovalGate,
      row.readyForPrewrite,
      row.matchesNextOperatorSection,
      row.allowAnyStage01Target,
      row.blockers.join('|'),
    ]),
  ]);

  const markdown = [
    '# Sajik Stage 01 All-Target Approval Readiness',
    '',
    `- version: \`${READINESS_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- targets: \`${summary.targetCount}/${summary.expectedTargetCount}\``,
    `- readyForApprovalGateCount: \`${summary.readyForApprovalGateCount}\``,
    `- readyForPrewriteCount: \`${summary.readyForPrewriteCount}\``,
    `- waitingCount: \`${summary.waitingCount}\``,
    `- blockedCount: \`${summary.blockedCount}\``,
    `- sourceDataWritePerformed: \`${summary.sourceDataWritePerformed}\``,
    `- writesOperatorInput: \`${summary.writesOperatorInput}\``,
    `- writesProductionData: \`${summary.writesProductionData}\``,
    '',
    '## Target Rows',
    '',
    markdownTable(
      ['section', 'preflight', 'approval', 'decision', 'ready approval', 'ready prewrite', 'next', 'blockers'],
      rows.map((row) => [
        `\`${row.sectionId}\``,
        `\`${row.preflightStatus}\``,
        `\`${row.approvalStatus}\``,
        `\`${row.selectedDecision}\``,
        `\`${row.readyForApprovalGate}\``,
        `\`${row.readyForPrewrite}\``,
        `\`${row.matchesNextOperatorSection}\``,
        row.blockers.length > 0 ? `\`${row.blockers.join(' | ')}\`` : 'none',
      ]),
    ),
    '',
    '## Outputs',
    '',
    `- \`${relativePath(jsonPath)}\``,
    `- \`${relativePath(csvPath)}\``,
    `- \`${relativePath(markdownPath)}\``,
    '',
    '## Blockers',
    '',
    ...(blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``) : ['- none']),
    '',
  ].join('\n');

  await fs.writeFile(`${markdownPath}.tmp`, markdown, 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(`stage01_all_target_approval_readiness_json:${relativePath(jsonPath)}`);
  console.log(`stage01_all_target_approval_readiness_csv:${relativePath(csvPath)}`);
  console.log(`stage01_all_target_approval_readiness_markdown:${relativePath(markdownPath)}`);
  console.log(
    `status:${summary.status} targets=${summary.targetCount}/${summary.expectedTargetCount} readyForApprovalGate=${summary.readyForApprovalGateCount} readyForPrewrite=${summary.readyForPrewriteCount} sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`,
  );

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01AppliedDryRun = async () => {
  const { execFile } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { promisify } = await import("node:util");

  const execFileAsync = promisify(execFile);

  const DRY_RUN_VERSION = 'SAJIK_STAGE01_APPLIED_DRY_RUN_V1';
  const DRY_RUN_TARGET_SECTION_ID = '021';
  const DRY_RUN_REVIEWER = 'STAGE01_APPLIED_DRY_RUN_OPERATOR';
  const DRY_RUN_REVIEWED_AT = '2026-05-15T00:00:00.000Z';
  const SOURCE_DATA_FILE = 'src/data/sajikSeatData.ts';
  const WRITABLE_SOURCE_FIELDS = [
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.labelX',
    'imageGeometry.labelY',
  ];
  const LOCKED_SOURCE_FIELDS = [
    'imageGeometry.visualPath',
    'imageGeometry.geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const stageDir = path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator');
  const dryRunDir = path.join(stageDir, 'applied-dry-run');

  const baseInputPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json');
  const dryRunInputPath = path.join(dryRunDir, 'sajik-seatmap-stage01-operator-input.json');
  const inputAidPath = path.join(dryRunDir, 'sajik-seatmap-stage01-operator-input-aid.json');
  const prewritePath = path.join(dryRunDir, 'sajik-seatmap-stage01-prewrite.json');
  const applyReadyPath = path.join(dryRunDir, 'sajik-seatmap-stage01-apply-ready.json');
  const patchPreviewPath = path.join(dryRunDir, 'sajik-seatmap-stage01-prewrite.patch-preview.ts');
  const postApplyPath = path.join(dryRunDir, 'sajik-seatmap-stage01-post-apply-audit.json');
  const operatorStatusPath = path.join(dryRunDir, 'sajik-seatmap-stage01-operator-status.json');
  const manualPatchPlanPath = path.join(dryRunDir, 'sajik-seatmap-stage01-manual-patch-plan.json');
  const realApprovalReadinessPath = path.join(dryRunDir, 'sajik-seatmap-stage01-real-approval-readiness.json');
  const dryRunJsonPath = path.join(dryRunDir, 'sajik-seatmap-stage01-applied-dry-run.json');
  const dryRunMarkdownPath = path.join(dryRunDir, 'sajik-seatmap-stage01-applied-dry-run.md');

  function normalizeForDryRun(row) {
    return {
      ...row,
      operatorDecision: 'PENDING',
      correctedPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      reviewer: '',
      reviewedAt: '',
      operatorNote: '',
    };
  }

  function makeAppliedDryRunRow(row) {
    return {
      ...row,
      operatorDecision: 'APPROVED',
      correctedPath: row.currentHitPath ?? row.currentPath,
      correctedLabelX: row.currentLabelX,
      correctedLabelY: row.currentLabelY,
      reviewer: DRY_RUN_REVIEWER,
      reviewedAt: DRY_RUN_REVIEWED_AT,
      operatorNote: 'Applied dry-run only. Corrected geometry already matches production data; this fixture must not edit src/data/sajikSeatData.ts.',
    };
  }

  async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  async function readJsonOrNull(filePath) {
    try {
      return await readJson(filePath);
    } catch {
      return null;
    }
  }

  async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  }

  function formatRelative(filePath) {
    return path.relative(frontendRoot, filePath);
  }

  async function runNodeScript(scriptName, args) {
    const result = {
      script: scriptName,
      args,
      exitCode: 0,
      stdout: '',
      stderr: '',
    };

    try {
      const { stdout, stderr } = await execFileAsync(
        process.execPath,
        ['--import', 'tsx', path.join('scripts', scriptName), ...args],
        {
          cwd: frontendRoot,
          maxBuffer: 1024 * 1024 * 16,
        },
      );
      result.stdout = stdout.trim();
      result.stderr = stderr.trim();
    } catch (error) {
      result.exitCode = Number.isInteger(error.code) ? error.code : 1;
      result.stdout = String(error.stdout ?? '').trim();
      result.stderr = String(error.stderr ?? error.message ?? '').trim();
    }

    return result;
  }

  async function runRequired(commandResults, blockers, scriptName, args) {
    const result = await runNodeScript(scriptName, args);
    commandResults.push(result);
    if (result.exitCode !== 0) {
      blockers.push({
        type: 'command-failed',
        script: scriptName,
        exitCode: result.exitCode,
        stderr: result.stderr,
      });
    }
    return result;
  }

  function assertCondition(issues, condition, message, details = undefined) {
    if (!condition) {
      issues.push(details === undefined ? { message } : { message, details });
    }
  }

  function isSameStringArray(actual, expected) {
    return Array.isArray(actual)
      && actual.length === expected.length
      && expected.every((value, index) => actual[index] === value);
  }

  function reportStatus(report) {
    return report?.status ?? report?.summary?.status ?? 'missing';
  }

  function buildMarkdown(report) {
    const statusRows = [
      ['targetSectionId', report.targetSectionId],
      ['status', report.status],
      ['inputAidStatus', report.flow.inputAidStatus],
      ['prewriteStatus', report.flow.prewriteStatus],
      ['applyReadyStatus', report.flow.applyReadyStatus],
      ['postApplyStatus', report.flow.postApplyStatus],
      ['operatorStatus', report.flow.operatorStatus],
      ['manualPatchPlanStatus', report.flow.manualPatchPlanStatus],
      ['realApprovalReadinessStatus', report.flow.realApprovalReadinessStatus],
      ['manualPatchRows', String(report.flow.manualPatchRows)],
      ['approvedAppliedRows', String(report.flow.approvedAppliedRows)],
      ['approvedBlockedRows', String(report.flow.approvedBlockedRows)],
      ['operatorStatusRow', report.appliedContract.operatorStatusRowStatus ?? '-'],
      ['readinessRow', report.realApprovalReadinessContract.readinessStatus ?? '-'],
      ['sourceDataWritePerformed', String(report.safetyContract.sourceDataWritePerformed)],
      ['productionWriteAllowed', String(report.safetyContract.productionWriteAllowed)],
      ['productionDataChanged', String(report.safetyContract.productionDataChanged)],
    ];

    const lines = [
      '# Sajik Stage 01 Applied Dry-Run',
      '',
      '| Field | Value |',
      '| --- | --- |',
      ...statusRows.map(([field, value]) => `| ${field} | ${value} |`),
      '',
      '## Outputs',
      '',
      `- Dry-run input: \`${formatRelative(dryRunInputPath)}\``,
      `- Input aid: \`${formatRelative(inputAidPath)}\``,
      `- Prewrite: \`${formatRelative(prewritePath)}\``,
      `- Apply-ready: \`${formatRelative(applyReadyPath)}\``,
      `- Post-apply audit: \`${formatRelative(postApplyPath)}\``,
      `- Operator status: \`${formatRelative(operatorStatusPath)}\``,
      `- Manual patch plan: \`${formatRelative(manualPatchPlanPath)}\``,
      `- Real approval readiness: \`${formatRelative(realApprovalReadinessPath)}\``,
      '',
      '## Applied Contract',
      '',
      '- `postApply=applied`',
      '- `operatorStatusRow=APPLIED`',
      '- `manualPatchRows=0`',
      '- `readinessRow=APPROVED_APPLIED`',
      '- `readinessAction=VERIFY_APPLIED`',
      '',
      '## Safety Contract',
      '',
      `- The dry-run does not edit \`${SOURCE_DATA_FILE}\`.`,
      '- `productionWriteAllowed` must remain `false`.',
      '- `sourceDataWritePerformed` must remain `false`.',
      '- `productionDataChanged` must remain `false`.',
    ];

    if (report.issues.length > 0) {
      lines.push('', '## Issues', '');
      for (const issue of report.issues) {
        lines.push(`- ${issue.message}`);
      }
    }

    return `${lines.join('\n')}\n`;
  }

  async function main() {
    const commandResults = [];
    const blockers = [];
    const issues = [];

    await fs.mkdir(dryRunDir, { recursive: true });

    const baseInput = await readJson(baseInputPath);
    const baseRows = Array.isArray(baseInput.corrections)
      ? baseInput.corrections
      : Array.isArray(baseInput.rows)
        ? baseInput.rows
        : [];
    const normalizedRows = baseRows.map(normalizeForDryRun);
    const targetIndex = normalizedRows.findIndex((row) => row.sectionId === DRY_RUN_TARGET_SECTION_ID);
    if (targetIndex < 0) {
      throw new Error(`Stage 01 operator input does not contain ${DRY_RUN_TARGET_SECTION_ID}. Run npm run stadium:sajik:stage01-operator-package first.`);
    }

    normalizedRows[targetIndex] = makeAppliedDryRunRow(normalizedRows[targetIndex]);

    const dryRunInput = {
      ...baseInput,
      dryRunVersion: DRY_RUN_VERSION,
      dryRunTargetSectionId: DRY_RUN_TARGET_SECTION_ID,
      corrections: normalizedRows,
    };

    await writeJson(dryRunInputPath, dryRunInput);

    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--input',
      dryRunInputPath,
      '--stage-dir',
      dryRunDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--input',
      dryRunInputPath,
      '--stage-dir',
      dryRunDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--prewrite',
      prewritePath,
      '--patch-preview',
      patchPreviewPath,
      '--stage-dir',
      dryRunDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--prewrite',
      prewritePath,
      '--stage-dir',
      dryRunDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--operator-input',
      dryRunInputPath,
      '--prewrite',
      prewritePath,
      '--apply-ready',
      applyReadyPath,
      '--post-apply',
      postApplyPath,
      '--stage-dir',
      dryRunDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--operator-status',
      operatorStatusPath,
      '--prewrite',
      prewritePath,
      '--stage-dir',
      dryRunDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--operator-input',
      dryRunInputPath,
      '--input-aid',
      inputAidPath,
      '--prewrite',
      prewritePath,
      '--apply-ready',
      applyReadyPath,
      '--post-apply',
      postApplyPath,
      '--operator-status',
      operatorStatusPath,
      '--manual-patch-plan',
      manualPatchPlanPath,
      '--stage-dir',
      dryRunDir,
    ]);

    const inputAid = await readJsonOrNull(inputAidPath);
    const prewrite = await readJsonOrNull(prewritePath);
    const applyReady = await readJsonOrNull(applyReadyPath);
    const postApply = await readJsonOrNull(postApplyPath);
    const operatorStatus = await readJsonOrNull(operatorStatusPath);
    const manualPatchPlan = await readJsonOrNull(manualPatchPlanPath);
    const realApprovalReadiness = await readJsonOrNull(realApprovalReadinessPath);

    const patchPayload = prewrite?.patchPayloads?.[0] ?? null;
    const prewriteRow = (prewrite?.rows ?? []).find((row) => row.sectionId === DRY_RUN_TARGET_SECTION_ID) ?? null;
    const patchReviewRow = prewrite?.patchReviewRows?.[0] ?? null;
    const applyReadyRow = (applyReady?.rows ?? []).find((row) => row.sectionId === DRY_RUN_TARGET_SECTION_ID) ?? null;
    const postApplyRow = (postApply?.rows ?? []).find((row) => row.sectionId === DRY_RUN_TARGET_SECTION_ID) ?? null;
    const statusRow = (operatorStatus?.rows ?? []).find((row) => row.sectionId === DRY_RUN_TARGET_SECTION_ID) ?? null;
    const readinessRow = (realApprovalReadiness?.rows ?? []).find((row) => row.sectionId === DRY_RUN_TARGET_SECTION_ID) ?? null;

    assertCondition(issues, blockers.length === 0, 'All child scripts must exit successfully.', blockers);
    assertCondition(issues, reportStatus(inputAid) === 'ready-for-prewrite', 'Input aid must be ready-for-prewrite.', reportStatus(inputAid));
    assertCondition(issues, inputAid?.summary?.readyForPrewriteRows === 1, 'Input aid must expose exactly one ready row.', inputAid?.summary);
    assertCondition(issues, inputAid?.summary?.invalidRows === 0, 'Input aid must expose zero invalid rows.', inputAid?.summary);
    assertCondition(issues, reportStatus(prewrite) === 'ready-for-data-patch', 'Prewrite must be ready-for-data-patch.', reportStatus(prewrite));
    assertCondition(issues, prewrite?.summary?.approvedRows === 1, 'Prewrite must contain one approved row.', prewrite?.summary);
    assertCondition(issues, prewrite?.summary?.patchPreviewRows === 1, 'Prewrite must contain one patch preview row.', prewrite?.summary);
    assertCondition(issues, prewrite?.summary?.productionWriteAllowed === false, 'Prewrite productionWriteAllowed must be false.', prewrite?.summary);
    assertCondition(issues, prewrite?.summary?.productionDataChanged === false, 'Prewrite productionDataChanged must be false.', prewrite?.summary);
    assertCondition(issues, patchPayload?.sectionId === DRY_RUN_TARGET_SECTION_ID, 'Patch payload must target the dry-run section.', patchPayload);
    assertCondition(issues, patchPayload?.sectionKind === 'SEAT_SECTION', 'Patch payload must remain a seat section.', patchPayload);
    assertCondition(issues, patchPayload?.validation?.status === 'PASS', 'Patch payload validationStatus must be PASS.', patchPayload);
    assertCondition(issues, patchReviewRow?.visualPathLocked === true, 'Patch review row must lock visualPath.', patchReviewRow);
    assertCondition(issues, patchReviewRow?.hitPathChanged === false, 'Patch review row must prove hitPath did not change.', patchReviewRow);
    assertCondition(issues, patchReviewRow?.labelPointChanged === false, 'Patch review row must prove labelPoint did not change.', patchReviewRow);
    assertCondition(issues, patchReviewRow?.validationIssueCount === 0, 'Patch review row must have zero validation issues.', patchReviewRow);
    assertCondition(issues, prewriteRow?.warnings?.includes('APPROVED_NO_GEOMETRY_DELTA'), 'Prewrite row must warn APPROVED_NO_GEOMETRY_DELTA.', prewriteRow);
    assertCondition(issues, reportStatus(applyReady) === 'ready-for-manual-apply', 'Apply-ready status must be ready-for-manual-apply.', reportStatus(applyReady));
    assertCondition(issues, applyReady?.summary?.manualPatchReviewReady === true, 'Apply-ready must mark manual patch review ready.', applyReady?.summary);
    assertCondition(issues, applyReady?.summary?.sourceDataWritePerformed === false, 'Apply-ready sourceDataWritePerformed must be false.', applyReady?.summary);
    assertCondition(issues, applyReadyRow?.geometryDelta === false, 'Apply-ready row must have no geometry delta.', applyReadyRow);
    assertCondition(issues, applyReadyRow?.warnings?.includes('PATCH_PAYLOAD_HAS_NO_GEOMETRY_DELTA'), 'Apply-ready row must warn PATCH_PAYLOAD_HAS_NO_GEOMETRY_DELTA.', applyReadyRow);
    assertCondition(issues, reportStatus(postApply) === 'applied', 'Post-apply audit must be applied.', reportStatus(postApply));
    assertCondition(issues, postApply?.summary?.appliedRows === 1, 'Post-apply audit must expose one applied row.', postApply?.summary);
    assertCondition(issues, postApply?.summary?.unappliedRows === 0, 'Post-apply audit must expose zero unapplied rows.', postApply?.summary);
    assertCondition(issues, postApplyRow?.applied === true, 'Post-apply row must be applied.', postApplyRow);
    assertCondition(issues, reportStatus(operatorStatus) === 'applied', 'Operator status must be applied.', reportStatus(operatorStatus));
    assertCondition(issues, operatorStatus?.summary?.appliedRows === 1, 'Operator status must expose one applied row.', operatorStatus?.summary);
    assertCondition(issues, operatorStatus?.summary?.notAppliedRows === 0, 'Operator status must expose zero not-applied rows.', operatorStatus?.summary);
    assertCondition(issues, statusRow?.rowStatus === 'APPLIED', 'Operator status row must be APPLIED.', statusRow);
    assertCondition(issues, statusRow?.action === 'NO_ACTION', 'Operator status row action must be NO_ACTION.', statusRow);
    assertCondition(issues, reportStatus(manualPatchPlan) === 'applied', 'Manual patch plan must be applied.', reportStatus(manualPatchPlan));
    assertCondition(issues, manualPatchPlan?.summary?.manualPatchRows === 0, 'Manual patch plan must expose zero rows.', manualPatchPlan?.summary);
    assertCondition(issues, isSameStringArray(manualPatchPlan?.summary?.writableSourceFields, WRITABLE_SOURCE_FIELDS), 'Manual patch writableSourceFields must stay locked.', manualPatchPlan?.summary?.writableSourceFields);
    assertCondition(issues, isSameStringArray(manualPatchPlan?.summary?.lockedSourceFields, LOCKED_SOURCE_FIELDS), 'Manual patch lockedSourceFields must stay locked.', manualPatchPlan?.summary?.lockedSourceFields);
    assertCondition(issues, reportStatus(realApprovalReadiness) === 'applied', 'Real approval readiness must be applied.', reportStatus(realApprovalReadiness));
    assertCondition(issues, realApprovalReadiness?.summary?.approvedRows === 1, 'Real approval readiness must see one approved row.', realApprovalReadiness?.summary);
    assertCondition(issues, realApprovalReadiness?.summary?.approvedNotAppliedRows === 0, 'Real approval readiness must report zero APPROVED_NOT_APPLIED rows.', realApprovalReadiness?.summary);
    assertCondition(issues, realApprovalReadiness?.summary?.approvedAppliedRows === 1, 'Real approval readiness must report one APPROVED_APPLIED row.', realApprovalReadiness?.summary);
    assertCondition(issues, realApprovalReadiness?.summary?.approvedBlockedRows === 0, 'Real approval readiness must report zero APPROVED_BLOCKED rows.', realApprovalReadiness?.summary);
    assertCondition(issues, realApprovalReadiness?.summary?.manualPatchRows === 0, 'Real approval readiness must report zero manual patch rows.', realApprovalReadiness?.summary);
    assertCondition(issues, realApprovalReadiness?.summary?.safetyContract?.sourceDataWritePerformed === false, 'Real approval readiness sourceDataWritePerformed must be false.', realApprovalReadiness?.summary);
    assertCondition(issues, realApprovalReadiness?.summary?.safetyContract?.productionWriteAllowed === false, 'Real approval readiness productionWriteAllowed must be false.', realApprovalReadiness?.summary);
    assertCondition(issues, realApprovalReadiness?.summary?.safetyContract?.productionDataChanged === false, 'Real approval readiness productionDataChanged must be false.', realApprovalReadiness?.summary);
    assertCondition(issues, readinessRow?.readinessStatus === 'APPROVED_APPLIED', 'Dry-run approved row must be APPROVED_APPLIED.', readinessRow);
    assertCondition(issues, readinessRow?.readinessAction === 'VERIFY_APPLIED', 'Dry-run readiness action must be VERIFY_APPLIED.', readinessRow);

    const report = {
      version: DRY_RUN_VERSION,
      targetSectionId: DRY_RUN_TARGET_SECTION_ID,
      status: issues.length === 0 ? 'passed' : 'failed',
      generatedAt: new Date().toISOString(),
      inputs: {
        baseInput: formatRelative(baseInputPath),
        dryRunInput: formatRelative(dryRunInputPath),
      },
      outputs: {
        inputAid: formatRelative(inputAidPath),
        prewrite: formatRelative(prewritePath),
        applyReady: formatRelative(applyReadyPath),
        patchPreview: formatRelative(patchPreviewPath),
        postApply: formatRelative(postApplyPath),
        operatorStatus: formatRelative(operatorStatusPath),
        manualPatchPlan: formatRelative(manualPatchPlanPath),
        realApprovalReadiness: formatRelative(realApprovalReadinessPath),
        dryRunJson: formatRelative(dryRunJsonPath),
        dryRunMarkdown: formatRelative(dryRunMarkdownPath),
      },
      flow: {
        inputAidStatus: reportStatus(inputAid),
        prewriteStatus: reportStatus(prewrite),
        applyReadyStatus: reportStatus(applyReady),
        postApplyStatus: reportStatus(postApply),
        operatorStatus: reportStatus(operatorStatus),
        manualPatchPlanStatus: reportStatus(manualPatchPlan),
        realApprovalReadinessStatus: reportStatus(realApprovalReadiness),
        manualPatchRows: manualPatchPlan?.summary?.manualPatchRows ?? 0,
        approvedAppliedRows: realApprovalReadiness?.summary?.approvedAppliedRows ?? 0,
        approvedBlockedRows: realApprovalReadiness?.summary?.approvedBlockedRows ?? 0,
      },
      safetyContract: {
        sourceDataFile: SOURCE_DATA_FILE,
        sourceDataWritePerformed: realApprovalReadiness?.summary?.safetyContract?.sourceDataWritePerformed ?? false,
        productionWriteAllowed: realApprovalReadiness?.summary?.safetyContract?.productionWriteAllowed ?? false,
        productionDataChanged: realApprovalReadiness?.summary?.safetyContract?.productionDataChanged ?? false,
        statement: `Applied dry-run does not edit ${SOURCE_DATA_FILE}.`,
      },
      appliedContract: {
        postApplyRowApplied: postApplyRow?.applied ?? null,
        operatorStatusRowStatus: statusRow?.rowStatus ?? null,
        operatorStatusRowAction: statusRow?.action ?? null,
        manualPatchRows: manualPatchPlan?.summary?.manualPatchRows ?? null,
        noGeometryDelta: patchReviewRow?.hitPathChanged === false && patchReviewRow?.labelPointChanged === false,
      },
      manualPatchContract: {
        writableSourceFields: manualPatchPlan?.summary?.writableSourceFields ?? [],
        lockedSourceFields: manualPatchPlan?.summary?.lockedSourceFields ?? [],
        targetSourceFile: manualPatchPlan?.summary?.targetSourceFile ?? SOURCE_DATA_FILE,
      },
      realApprovalReadinessContract: {
        readinessStatus: readinessRow?.readinessStatus ?? null,
        readinessAction: readinessRow?.readinessAction ?? null,
        approvedReadinessStatuses: realApprovalReadiness?.summary?.approvedReadinessStatuses ?? [],
        status: realApprovalReadiness?.summary?.status ?? null,
        approvedAppliedRows: realApprovalReadiness?.summary?.approvedAppliedRows ?? null,
        approvedNotAppliedRows: realApprovalReadiness?.summary?.approvedNotAppliedRows ?? null,
        approvedBlockedRows: realApprovalReadiness?.summary?.approvedBlockedRows ?? null,
        safetyContract: realApprovalReadiness?.summary?.safetyContract ?? null,
      },
      commandResults,
      blockers,
      issues,
    };

    await writeJson(dryRunJsonPath, report);
    await fs.writeFile(dryRunMarkdownPath, buildMarkdown(report), 'utf8');

    console.log(`stage01_applied_dry_run_json:${formatRelative(dryRunJsonPath)}`);
    console.log(`stage01_applied_dry_run_markdown:${formatRelative(dryRunMarkdownPath)}`);
    console.log(
      `status:${report.status} target=${DRY_RUN_TARGET_SECTION_ID} postApply=${report.flow.postApplyStatus} operatorStatus=${report.flow.operatorStatus} operatorStatusRow=${report.appliedContract.operatorStatusRowStatus} manualPatchRows=${report.flow.manualPatchRows} readiness=${report.flow.realApprovalReadinessStatus} readinessRow=${report.realApprovalReadinessContract.readinessStatus} sourceDataWritePerformed=${report.safetyContract.sourceDataWritePerformed}`,
    );

    if (report.status !== 'passed') {
      process.exitCode = 1;
    }
  }

  main().catch(async (error) => {
    const failureReport = {
      version: DRY_RUN_VERSION,
      targetSectionId: DRY_RUN_TARGET_SECTION_ID,
      status: 'failed',
      generatedAt: new Date().toISOString(),
      flow: {
        inputAidStatus: 'missing',
        prewriteStatus: 'missing',
        applyReadyStatus: 'missing',
        postApplyStatus: 'missing',
        operatorStatus: 'missing',
        manualPatchPlanStatus: 'missing',
        realApprovalReadinessStatus: 'missing',
        manualPatchRows: 0,
        approvedAppliedRows: 0,
        approvedBlockedRows: 0,
      },
      safetyContract: {
        sourceDataWritePerformed: false,
        productionWriteAllowed: false,
        productionDataChanged: false,
      },
      appliedContract: {
        operatorStatusRowStatus: null,
      },
      realApprovalReadinessContract: {
        readinessStatus: null,
      },
      issues: [
        {
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
    await writeJson(dryRunJsonPath, failureReport).catch(() => {});
    await fs.writeFile(dryRunMarkdownPath, buildMarkdown(failureReport), 'utf8').catch(() => {});
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
};

const runStage01ApplyReady = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { buildSajikSeatMapDataset } = await import("../src/data/sajikSeatMapDataset.ts");
  const { pathBounds, pathToPoints, polygonArea } = await import("../src/utils/seatMapPolygonValidator.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultStageDir = path.join(reportDir, 'sajik-stage01-operator');
  const defaultPrewritePath = path.join(defaultStageDir, 'sajik-seatmap-stage01-prewrite.json');
  const defaultPatchPreviewPath = path.join(defaultStageDir, 'sajik-seatmap-stage01-prewrite.patch-preview.ts');

  const APPLY_READY_VERSION = 'SAJIK_STAGE01_APPLY_READY_V1';
  const REQUIRED_PREWRITE_VERSION = 'SAJIK_STAGE01_PREWRITE_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const EXPECTED_STAGE01_ROWS = 16;
  const EXPECTED_STAGE01_SECTION_IDS = [
    '021',
    '022',
    '031',
    '032',
    '121',
    '122',
    '123',
    '124',
    '125',
    '131',
    '132',
    '133',
    '134',
    '135',
    '142',
    '143',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
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

  const sorted = (values) => [...values].sort();

  const samePoint = (left, right) => (
    Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index])
  );

  const roundDelta = (value) => Number(value.toFixed(2));

  const geometryStats = (pathData) => {
    const points = pathToPoints(pathData);
    return {
      pointCount: points.length,
      area: roundDelta(polygonArea(points)),
      bounds: pathBounds(pathData),
    };
  };

  const geometryDiffSummaryFor = (payload) => {
    const beforeHit = geometryStats(payload.before?.hitPath ?? '');
    const afterHit = geometryStats(payload.after?.hitPath ?? '');
    const beforeLabel = payload.before?.labelPoint ?? [null, null];
    const afterLabel = payload.after?.labelPoint ?? [null, null];

    return {
      pointCountBefore: beforeHit.pointCount,
      pointCountAfter: afterHit.pointCount,
      pointCountDelta: afterHit.pointCount - beforeHit.pointCount,
      areaBefore: beforeHit.area,
      areaAfter: afterHit.area,
      areaDelta: roundDelta(afterHit.area - beforeHit.area),
      boundsBefore: beforeHit.bounds,
      boundsAfter: afterHit.bounds,
      boundsDelta: {
        minX: roundDelta(afterHit.bounds.minX - beforeHit.bounds.minX),
        minY: roundDelta(afterHit.bounds.minY - beforeHit.bounds.minY),
        maxX: roundDelta(afterHit.bounds.maxX - beforeHit.bounds.maxX),
        maxY: roundDelta(afterHit.bounds.maxY - beforeHit.bounds.maxY),
      },
      labelPointBefore: beforeLabel,
      labelPointAfter: afterLabel,
      labelPointDelta: [
        typeof beforeLabel[0] === 'number' && typeof afterLabel[0] === 'number'
          ? roundDelta(afterLabel[0] - beforeLabel[0])
          : null,
        typeof beforeLabel[1] === 'number' && typeof afterLabel[1] === 'number'
          ? roundDelta(afterLabel[1] - beforeLabel[1])
          : null,
      ],
    };
  };

  const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
  const prewritePath = path.resolve(frontendRoot, argValue('--prewrite', defaultPrewritePath));
  const patchPreviewPath = path.resolve(frontendRoot, argValue('--patch-preview', defaultPatchPreviewPath));
  const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-apply-ready.json');
  const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-apply-ready.md');

  const prewrite = await readJson(prewritePath);
  const patchPreviewText = await fs.readFile(patchPreviewPath, 'utf8').catch(() => '');
  const dataset = buildSajikSeatMapDataset();
  const sectionsById = new Map(dataset.sections.map((section) => [section.sectionId, section]));
  const summary = prewrite.summary ?? {};
  const rows = Array.isArray(prewrite.rows) ? prewrite.rows : [];
  const patchPayloads = Array.isArray(prewrite.patchPayloads) ? prewrite.patchPayloads : [];
  const rowsBySectionId = new Map(rows.map((row) => [row.sectionId, row]));

  const blockers = [];
  const warnings = [];

  if (summary.prewriteVersion !== REQUIRED_PREWRITE_VERSION) {
    blockers.push(`PREWRITE_VERSION_MISMATCH:${summary.prewriteVersion ?? ''}`);
  }
  if (summary.stadiumId !== dataset.stadiumId) {
    blockers.push(`STADIUM_ID_MISMATCH:${summary.stadiumId ?? ''}:${dataset.stadiumId}`);
  }
  if (summary.mapVersion !== dataset.mapVersion) {
    blockers.push(`MAP_VERSION_MISMATCH:${summary.mapVersion ?? ''}:${dataset.mapVersion}`);
  }
  if (summary.viewBox !== dataset.image.viewBox) {
    blockers.push(`VIEWBOX_MISMATCH:${summary.viewBox ?? ''}:${dataset.image.viewBox}`);
  }
  if (summary.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`TARGET_STAGE_MISMATCH:${summary.targetStage ?? ''}`);
  }
  if (summary.totalRows !== EXPECTED_STAGE01_ROWS) {
    blockers.push(`STAGE01_ROW_COUNT_MISMATCH:${summary.totalRows ?? ''}:${EXPECTED_STAGE01_ROWS}`);
  }
  if (summary.productionDataChanged !== false) {
    blockers.push('PREWRITE_PRODUCTION_DATA_CHANGED');
  }
  if (summary.productionWriteAllowed !== false) {
    blockers.push('PREWRITE_PRODUCTION_WRITE_ALLOWED');
  }
  if (!['waiting-for-operator', 'ready-for-data-patch', 'blocked'].includes(summary.status)) {
    blockers.push(`PREWRITE_STATUS_UNKNOWN:${summary.status ?? ''}`);
  }
  if (summary.status === 'blocked') {
    blockers.push(...(summary.blockers ?? []).map((blocker) => `PREWRITE_BLOCKED:${blocker}`));
  }
  if ((summary.blockers ?? []).length > 0 && summary.status !== 'blocked') {
    blockers.push(`PREWRITE_BLOCKERS_WITH_NON_BLOCKED_STATUS:${(summary.blockers ?? []).length}`);
  }

  const rowIds = sorted(rows.map((row) => row.sectionId));
  const expectedIds = sorted(EXPECTED_STAGE01_SECTION_IDS);
  if (rowIds.join(',') !== expectedIds.join(',')) {
    blockers.push(`STAGE01_ROW_SECTION_IDS_MISMATCH:${rowIds.join(' ')}:${expectedIds.join(' ')}`);
  }

  const approvedRows = rows.filter((row) => row.approved);
  const validRows = rows.filter((row) => row.validForPatchPreview);
  const patchSectionIds = sorted(patchPayloads.map((payload) => payload.sectionId));
  const validSectionIds = sorted(validRows.map((row) => row.sectionId));

  if (summary.status === 'waiting-for-operator') {
    if (summary.approvedRows !== 0 || approvedRows.length !== 0) {
      blockers.push(`WAITING_STATUS_HAS_APPROVED_ROWS:${summary.approvedRows ?? approvedRows.length}`);
    }
    if (summary.patchPreviewRows !== 0 || patchPayloads.length !== 0) {
      blockers.push(`WAITING_STATUS_HAS_PATCH_PAYLOADS:${summary.patchPreviewRows ?? patchPayloads.length}`);
    }
  }

  if (summary.status === 'ready-for-data-patch') {
    if (summary.approvedRows <= 0 || approvedRows.length <= 0) {
      blockers.push('READY_STATUS_REQUIRES_APPROVED_ROWS');
    }
    if (summary.validApprovedRows !== summary.approvedRows) {
      blockers.push(`APPROVED_ROWS_NOT_ALL_VALID:${summary.validApprovedRows ?? ''}:${summary.approvedRows ?? ''}`);
    }
    if (summary.patchPreviewRows !== summary.validApprovedRows) {
      blockers.push(`PATCH_PREVIEW_ROW_COUNT_MISMATCH:${summary.patchPreviewRows ?? ''}:${summary.validApprovedRows ?? ''}`);
    }
    if (patchPayloads.length !== summary.patchPreviewRows) {
      blockers.push(`PATCH_PAYLOAD_COUNT_MISMATCH:${patchPayloads.length}:${summary.patchPreviewRows ?? ''}`);
    }
    if (patchSectionIds.join(',') !== validSectionIds.join(',')) {
      blockers.push(`PATCH_PAYLOAD_SECTION_MISMATCH:${patchSectionIds.join(' ')}:${validSectionIds.join(' ')}`);
    }
  }

  const duplicatePatchIds = patchPayloads
    .map((payload) => payload.sectionId)
    .filter((sectionId, index, sectionIds) => sectionIds.indexOf(sectionId) !== index);
  if (duplicatePatchIds.length > 0) {
    blockers.push(`DUPLICATE_PATCH_PAYLOAD_SECTION_ID:${[...new Set(duplicatePatchIds)].join(' ')}`);
  }

  const patchReviewRows = patchPayloads.map((payload) => {
    const section = sectionsById.get(payload.sectionId);
    const row = rowsBySectionId.get(payload.sectionId);
    const reasons = [];
    const rowWarnings = [];

    if (payload.type !== 'SAJIK_SECTION_GEOMETRY_PATCH_PREVIEW') {
      reasons.push(`PATCH_PAYLOAD_TYPE_MISMATCH:${payload.type ?? ''}`);
    }
    if (!EXPECTED_STAGE01_SECTION_IDS.includes(payload.sectionId)) {
      reasons.push(`PATCH_PAYLOAD_NOT_STAGE01:${payload.sectionId}`);
    }
    if (!section) {
      reasons.push('PATCH_SECTION_NOT_FOUND');
    }
    if (section && section.sectionKind !== 'SEAT_SECTION') {
      reasons.push(`PATCH_SECTION_KIND_NOT_WRITABLE:${section.sectionKind}`);
    }
    if (payload.sectionKind !== 'SEAT_SECTION') {
      reasons.push(`PATCH_PAYLOAD_SECTION_KIND_NOT_WRITABLE:${payload.sectionKind ?? ''}`);
    }
    if (payload.enabled !== true) {
      reasons.push('PATCH_PAYLOAD_SECTION_NOT_ENABLED');
    }
    if (payload.validation?.status !== 'PASS') {
      reasons.push(`PATCH_VALIDATION_NOT_PASS:${payload.validation?.status ?? ''}`);
    }
    if ((payload.validation?.issueCount ?? 0) !== 0) {
      reasons.push(`PATCH_VALIDATION_ISSUES:${payload.validation?.issueCount ?? ''}`);
    }
    if (payload.before?.visualPath !== payload.after?.visualPath) {
      reasons.push('VISUAL_PATH_CHANGED');
    }
    if (section && payload.before?.visualPath !== section.visualPath) {
      reasons.push('BEFORE_VISUAL_PATH_NOT_CURRENT_DATASET');
    }
    if (section && payload.before?.hitPath !== section.hitPath) {
      reasons.push('BEFORE_HIT_PATH_NOT_CURRENT_DATASET');
    }
    if (section && !samePoint(payload.before?.labelPoint, section.labelPoint)) {
      reasons.push('BEFORE_LABEL_POINT_NOT_CURRENT_DATASET');
    }
    if (!patchPreviewText.includes(`sectionId: '${payload.sectionId}'`)) {
      reasons.push('PATCH_PREVIEW_FRAGMENT_MISSING');
    }

    const geometryDelta = payload.before?.hitPath !== payload.after?.hitPath
      || !samePoint(payload.before?.labelPoint, payload.after?.labelPoint);
    if (!geometryDelta) {
      rowWarnings.push('PATCH_PAYLOAD_HAS_NO_GEOMETRY_DELTA');
    }
    const diffSummary = geometryDiffSummaryFor(payload);

    return {
      sectionId: payload.sectionId,
      blockId: payload.blockId,
      validationStatus: payload.validation?.status ?? '',
      geometryDelta,
      visualPathLocked: payload.before?.visualPath === payload.after?.visualPath,
      hitPathChanged: payload.before?.hitPath !== payload.after?.hitPath,
      labelPointChanged: !samePoint(payload.before?.labelPoint, payload.after?.labelPoint),
      diffSummary,
      reviewer: row?.reviewer ?? '',
      reviewedAt: row?.reviewedAt ?? '',
      reasons,
      warnings: rowWarnings,
    };
  });

  patchReviewRows
    .filter((row) => row.reasons.length > 0)
    .forEach((row) => blockers.push(`PATCH_PAYLOAD_INVALID:${row.sectionId}:${row.reasons.join('|')}`));

  const applyReadinessStatus = blockers.length > 0
    ? 'blocked'
    : summary.status === 'ready-for-data-patch'
      ? 'ready-for-manual-apply'
      : 'waiting-for-operator';

  if (applyReadinessStatus === 'waiting-for-operator') {
    warnings.push('NO_MANUAL_DATA_PATCH_CANDIDATES');
  }

  const applyReadySummary = {
    applyReadyVersion: APPLY_READY_VERSION,
    status: applyReadinessStatus,
    generatedAt: new Date().toISOString(),
    prewrite: path.relative(frontendRoot, prewritePath),
    patchPreview: path.relative(frontendRoot, patchPreviewPath),
    stadiumId: dataset.stadiumId,
    mapVersion: dataset.mapVersion,
    viewBox: dataset.image.viewBox,
    targetStage: TARGET_STAGE_LABEL,
    totalRows: rows.length,
    approvedRows: approvedRows.length,
    validApprovedRows: validRows.length,
    patchPreviewRows: patchPayloads.length,
    manualPatchReviewReady: applyReadinessStatus === 'ready-for-manual-apply',
    productionDataChanged: false,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: applyReadySummary.generatedAt,
    summary: applyReadySummary,
    safetyContract: [
      'MANUAL_DATA_PATCH_REVIEW_ONLY: this script never edits src/data/sajikSeatData.ts.',
      'It reads the Stage 01 prewrite report and confirms whether approved rows are ready for manual data patch review.',
      'The production write path remains closed; productionWriteAllowed is always false.',
      'A ready-for-manual-apply status means patch-preview fragments are valid candidates, not that a file write was performed.',
      'visualPath must remain locked for Stage 01; correctedPath is reviewed as hitPath only.',
    ],
    manualApplyChecklist: [
      'Review every fragment in sajik-seatmap-stage01-prewrite.patch-preview.ts.',
      'Apply only approved section hitPath and labelPoint values to src/data/sajikSeatData.ts.',
      'Keep imageGeometry.visualPath and geometryVersion unchanged unless a separate operator-approved visual retrace exists.',
      'Update labelX/labelY with the approved labelPoint when applying a section.',
      'Run npm run qa:stadium:sajik:polygon-v2 after any manual data patch.',
    ],
    rows: patchReviewRows,
  };

  await fs.mkdir(stageDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, [
    '# Sajik Stage 01 Apply-Ready Gate',
    '',
    `- apply-ready version: \`${APPLY_READY_VERSION}\``,
    `- status: \`${applyReadySummary.status}\``,
    `- prewrite: \`${applyReadySummary.prewrite}\``,
    `- patch preview: \`${applyReadySummary.patchPreview}\``,
    `- approved rows: \`${applyReadySummary.approvedRows}\``,
    `- valid approved rows: \`${applyReadySummary.validApprovedRows}\``,
    `- patch preview rows: \`${applyReadySummary.patchPreviewRows}\``,
    `- manual patch review ready: \`${applyReadySummary.manualPatchReviewReady}\``,
    `- production data changed: \`${applyReadySummary.productionDataChanged}\``,
    `- production write allowed: \`${applyReadySummary.productionWriteAllowed}\``,
    `- source data write performed: \`${applyReadySummary.sourceDataWritePerformed}\``,
    `- diff summaries: \`${patchReviewRows.length}\``,
    '',
    '## Patch Candidates',
    '',
    patchReviewRows.length > 0
      ? markdownTable(
        ['section', 'validation', 'delta', 'points', 'area delta', 'bounds delta', 'label delta', 'reviewer', 'reasons', 'warnings'],
        patchReviewRows.map((row) => [
          `\`${row.sectionId}\``,
          `\`${row.validationStatus}\``,
          `\`${row.geometryDelta}\``,
          `\`${row.diffSummary.pointCountBefore}->${row.diffSummary.pointCountAfter}\``,
          `\`${row.diffSummary.areaDelta}\``,
          `\`${JSON.stringify(row.diffSummary.boundsDelta)}\``,
          `\`${row.diffSummary.labelPointDelta.join(',')}\``,
          `\`${row.reviewer || '-'}\``,
          row.reasons.length > 0 ? row.reasons.join('; ') : '-',
          row.warnings.length > 0 ? row.warnings.join('; ') : '-',
        ]),
      )
      : 'No Stage 01 rows are ready for manual data patch review.',
    '',
    '## Manual Apply Checklist',
    '',
    report.manualApplyChecklist.map((item) => `- ${item}`).join('\n'),
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No apply-ready blockers.',
    '',
    '## Warnings',
    '',
    warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`stage01_apply_ready_json:${path.relative(frontendRoot, jsonPath)}`);
  console.log(`stage01_apply_ready_markdown:${path.relative(frontendRoot, markdownPath)}`);
  console.log(`status:${applyReadySummary.status} approved=${applyReadySummary.approvedRows} patchPreview=${applyReadySummary.patchPreviewRows} blockers=${applyReadySummary.blockers.length} productionDataChanged=${applyReadySummary.productionDataChanged}`);

  if (applyReadySummary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01ApprovedDryRun = async () => {
  const { execFile } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { promisify } = await import("node:util");
  const { pathToPoints, pointsToPath } = await import("../src/utils/seatMapPolygonValidator.ts");

  const execFileAsync = promisify(execFile);

  const DRY_RUN_VERSION = 'SAJIK_STAGE01_APPROVED_DRY_RUN_V1';
  const DRY_RUN_TARGET_SECTION_ID = '021';
  const DRY_RUN_REVIEWER = 'STAGE01_DRY_RUN_OPERATOR';
  const DRY_RUN_REVIEWED_AT = '2026-05-15T00:00:00.000Z';

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const stageDir = path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator');
  const dryRunDir = path.join(stageDir, 'dry-run');

  const baseInputPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json');
  const dryRunInputPath = path.join(dryRunDir, 'sajik-seatmap-stage01-operator-input.json');
  const inputAidPath = path.join(dryRunDir, 'sajik-seatmap-stage01-operator-input-aid.json');
  const prewritePath = path.join(dryRunDir, 'sajik-seatmap-stage01-prewrite.json');
  const applyReadyPath = path.join(dryRunDir, 'sajik-seatmap-stage01-apply-ready.json');
  const patchPreviewPath = path.join(dryRunDir, 'sajik-seatmap-stage01-prewrite.patch-preview.ts');
  const postApplyPath = path.join(dryRunDir, 'sajik-seatmap-stage01-post-apply-audit.json');
  const operatorStatusPath = path.join(dryRunDir, 'sajik-seatmap-stage01-operator-status.json');
  const manualPatchPlanPath = path.join(dryRunDir, 'sajik-seatmap-stage01-manual-patch-plan.json');
  const realApprovalReadinessPath = path.join(dryRunDir, 'sajik-seatmap-stage01-real-approval-readiness.json');
  const dryRunJsonPath = path.join(dryRunDir, 'sajik-seatmap-stage01-approved-dry-run.json');
  const dryRunMarkdownPath = path.join(dryRunDir, 'sajik-seatmap-stage01-approved-dry-run.md');

  const SOURCE_DATA_FILE = 'src/data/sajikSeatData.ts';

  function normalizeForDryRun(row) {
    return {
      ...row,
      operatorDecision: 'PENDING',
      correctedPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      reviewer: '',
      reviewedAt: '',
      operatorNote: '',
    };
  }

  function makeApprovedDryRunRow(row) {
    const points = pathToPoints(row.currentHitPath ?? row.currentPath);
    if (points.length < 3) {
      throw new Error(`Cannot create approved dry-run row for ${row.sectionId}: currentPath has fewer than 3 points.`);
    }

    const adjustedPoints = points.map((point, index) => {
      if (index !== 0) {
        return point;
      }
      return [point[0] + 0.5, point[1] + 0.5];
    });

    return {
      ...row,
      operatorDecision: 'APPROVED',
      correctedPath: pointsToPath(adjustedPoints),
      correctedLabelX: row.currentLabelX,
      correctedLabelY: row.currentLabelY,
      reviewer: DRY_RUN_REVIEWER,
      reviewedAt: DRY_RUN_REVIEWED_AT,
      operatorNote: 'Approved dry-run only. This fixture must not edit src/data/sajikSeatData.ts.',
    };
  }

  async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  async function readJsonOrNull(filePath) {
    try {
      return await readJson(filePath);
    } catch {
      return null;
    }
  }

  async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  }

  function formatRelative(filePath) {
    return path.relative(frontendRoot, filePath);
  }

  async function runNodeScript(scriptName, args) {
    const result = {
      script: scriptName,
      args,
      exitCode: 0,
      stdout: '',
      stderr: '',
    };

    try {
      const { stdout, stderr } = await execFileAsync(
        process.execPath,
        ['--import', 'tsx', path.join('scripts', scriptName), ...args],
        {
          cwd: frontendRoot,
          maxBuffer: 1024 * 1024 * 16,
        },
      );
      result.stdout = stdout.trim();
      result.stderr = stderr.trim();
    } catch (error) {
      result.exitCode = Number.isInteger(error.code) ? error.code : 1;
      result.stdout = String(error.stdout ?? '').trim();
      result.stderr = String(error.stderr ?? error.message ?? '').trim();
    }

    return result;
  }

  async function runRequired(commandResults, blockers, scriptName, args) {
    const result = await runNodeScript(scriptName, args);
    commandResults.push(result);
    if (result.exitCode !== 0) {
      blockers.push({
        type: 'command-failed',
        script: scriptName,
        exitCode: result.exitCode,
        stderr: result.stderr,
      });
    }
    return result;
  }

  function assertCondition(issues, condition, message, details = undefined) {
    if (!condition) {
      issues.push(details === undefined ? { message } : { message, details });
    }
  }

  function isSameStringArray(actual, expected) {
    return Array.isArray(actual)
      && actual.length === expected.length
      && expected.every((value, index) => actual[index] === value);
  }

  function reportStatus(report) {
    return report?.status ?? report?.summary?.status ?? 'missing';
  }

  function buildMarkdown(report) {
    const statusRows = [
      ['targetSectionId', report.targetSectionId],
      ['status', report.status],
      ['inputAidStatus', report.flow.inputAidStatus],
      ['prewriteStatus', report.flow.prewriteStatus],
      ['applyReadyStatus', report.flow.applyReadyStatus],
      ['postApplyStatus', report.flow.postApplyStatus],
      ['operatorStatus', report.flow.operatorStatus],
      ['manualPatchPlanStatus', report.flow.manualPatchPlanStatus],
      ['realApprovalReadinessStatus', report.flow.realApprovalReadinessStatus],
      ['manualPatchRows', String(report.flow.manualPatchRows)],
      ['approvedNotAppliedRows', String(report.flow.approvedNotAppliedRows)],
      ['approvedBlockedRows', String(report.flow.approvedBlockedRows)],
      ['sourceDataWritePerformed', String(report.safetyContract.sourceDataWritePerformed)],
      ['productionWriteAllowed', String(report.safetyContract.productionWriteAllowed)],
      ['productionDataChanged', String(report.safetyContract.productionDataChanged)],
    ];

    const lines = [
      '# Sajik Stage 01 Approved Dry-Run',
      '',
      '| Field | Value |',
      '| --- | --- |',
      ...statusRows.map(([field, value]) => `| ${field} | ${value} |`),
      '',
      '## Outputs',
      '',
      `- Dry-run input: \`${formatRelative(dryRunInputPath)}\``,
      `- Input aid: \`${formatRelative(inputAidPath)}\``,
      `- Prewrite: \`${formatRelative(prewritePath)}\``,
      `- Apply-ready: \`${formatRelative(applyReadyPath)}\``,
      `- Post-apply audit: \`${formatRelative(postApplyPath)}\``,
      `- Operator status: \`${formatRelative(operatorStatusPath)}\``,
      `- Manual patch plan: \`${formatRelative(manualPatchPlanPath)}\``,
      `- Real approval readiness: \`${formatRelative(realApprovalReadinessPath)}\``,
      '',
      '## Safety Contract',
      '',
      `- The dry-run does not edit \`${SOURCE_DATA_FILE}\`.`,
      '- `productionWriteAllowed` must remain `false`.',
      '- `sourceDataWritePerformed` must remain `false`.',
      '- `productionDataChanged` must remain `false`.',
    ];

    if (report.issues.length > 0) {
      lines.push('', '## Issues', '');
      for (const issue of report.issues) {
        lines.push(`- ${issue.message}`);
      }
    }

    return `${lines.join('\n')}\n`;
  }

  async function main() {
    const commandResults = [];
    const blockers = [];
    const issues = [];

    await fs.mkdir(dryRunDir, { recursive: true });

    const baseInput = await readJson(baseInputPath);
    const baseRows = Array.isArray(baseInput.corrections)
      ? baseInput.corrections
      : Array.isArray(baseInput.rows)
        ? baseInput.rows
        : [];
    const normalizedRows = baseRows.map(normalizeForDryRun);
    const targetIndex = normalizedRows.findIndex((row) => row.sectionId === DRY_RUN_TARGET_SECTION_ID);
    if (targetIndex < 0) {
      throw new Error(`Stage 01 operator input does not contain ${DRY_RUN_TARGET_SECTION_ID}. Run npm run stadium:sajik:stage01-operator-package first.`);
    }

    normalizedRows[targetIndex] = makeApprovedDryRunRow(normalizedRows[targetIndex]);

    const dryRunInput = {
      ...baseInput,
      dryRunVersion: DRY_RUN_VERSION,
      dryRunTargetSectionId: DRY_RUN_TARGET_SECTION_ID,
      corrections: normalizedRows,
    };

    await writeJson(dryRunInputPath, dryRunInput);

    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--input',
      dryRunInputPath,
      '--stage-dir',
      dryRunDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--input',
      dryRunInputPath,
      '--stage-dir',
      dryRunDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--prewrite',
      prewritePath,
      '--patch-preview',
      patchPreviewPath,
      '--stage-dir',
      dryRunDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--prewrite',
      prewritePath,
      '--stage-dir',
      dryRunDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--operator-input',
      dryRunInputPath,
      '--prewrite',
      prewritePath,
      '--apply-ready',
      applyReadyPath,
      '--post-apply',
      postApplyPath,
      '--stage-dir',
      dryRunDir,
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--operator-status',
      operatorStatusPath,
      '--prewrite',
      prewritePath,
      '--stage-dir',
      dryRunDir,
      '--require-ready',
    ]);
    await runRequired(commandResults, blockers, 'sajik-seatmap-stage01.mjs', [
      '--operator-input',
      dryRunInputPath,
      '--input-aid',
      inputAidPath,
      '--prewrite',
      prewritePath,
      '--apply-ready',
      applyReadyPath,
      '--post-apply',
      postApplyPath,
      '--operator-status',
      operatorStatusPath,
      '--manual-patch-plan',
      manualPatchPlanPath,
      '--stage-dir',
      dryRunDir,
    ]);

    const inputAid = await readJsonOrNull(inputAidPath);
    const prewrite = await readJsonOrNull(prewritePath);
    const applyReady = await readJsonOrNull(applyReadyPath);
    const postApply = await readJsonOrNull(postApplyPath);
    const operatorStatus = await readJsonOrNull(operatorStatusPath);
    const manualPatchPlan = await readJsonOrNull(manualPatchPlanPath);
    const realApprovalReadiness = await readJsonOrNull(realApprovalReadinessPath);

    const patchPayload = prewrite?.patchPayloads?.[0] ?? null;
    const patchReviewRow = prewrite?.patchReviewRows?.[0] ?? null;
    const statusRow = (operatorStatus?.rows ?? []).find((row) => row.sectionId === DRY_RUN_TARGET_SECTION_ID) ?? null;
    const manualPatchRow = (manualPatchPlan?.rows ?? []).find((row) => row.sectionId === DRY_RUN_TARGET_SECTION_ID) ?? null;
    const readinessRow = (realApprovalReadiness?.rows ?? []).find((row) => row.sectionId === DRY_RUN_TARGET_SECTION_ID) ?? null;

    assertCondition(issues, blockers.length === 0, 'All child scripts must exit successfully.', blockers);
    assertCondition(issues, reportStatus(inputAid) === 'ready-for-prewrite', 'Input aid must be ready-for-prewrite.', reportStatus(inputAid));
    assertCondition(issues, inputAid?.summary?.readyForPrewriteRows === 1, 'Input aid must expose exactly one ready row.', inputAid?.summary);
    assertCondition(issues, inputAid?.summary?.invalidRows === 0, 'Input aid must expose zero invalid rows.', inputAid?.summary);
    assertCondition(issues, reportStatus(prewrite) === 'ready-for-data-patch', 'Prewrite must be ready-for-data-patch.', reportStatus(prewrite));
    assertCondition(issues, prewrite?.summary?.approvedRows === 1, 'Prewrite must contain one approved row.', prewrite?.summary);
    assertCondition(issues, prewrite?.summary?.patchPreviewRows === 1, 'Prewrite must contain one patch preview row.', prewrite?.summary);
    assertCondition(issues, prewrite?.summary?.productionWriteAllowed === false, 'Prewrite productionWriteAllowed must be false.', prewrite?.summary);
    assertCondition(issues, prewrite?.summary?.productionDataChanged === false, 'Prewrite productionDataChanged must be false.', prewrite?.summary);
    assertCondition(issues, patchPayload?.sectionId === DRY_RUN_TARGET_SECTION_ID, 'Patch payload must target the dry-run section.', patchPayload);
    assertCondition(issues, patchPayload?.sectionKind === 'SEAT_SECTION', 'Patch payload must remain a seat section.', patchPayload);
    assertCondition(issues, patchPayload?.validation?.status === 'PASS', 'Patch payload validationStatus must be PASS.', patchPayload);
    assertCondition(issues, patchReviewRow?.visualPathLocked === true, 'Patch review row must lock visualPath.', patchReviewRow);
    assertCondition(issues, patchReviewRow?.hitPathChanged === true, 'Patch review row must prove hitPath changed.', patchReviewRow);
    assertCondition(issues, patchReviewRow?.validationIssueCount === 0, 'Patch review row must have zero validation issues.', patchReviewRow);
    assertCondition(issues, reportStatus(applyReady) === 'ready-for-manual-apply', 'Apply-ready status must be ready-for-manual-apply.', reportStatus(applyReady));
    assertCondition(issues, applyReady?.summary?.manualPatchReviewReady === true, 'Apply-ready must mark manual patch review ready.', applyReady?.summary);
    assertCondition(issues, applyReady?.summary?.sourceDataWritePerformed === false, 'Apply-ready sourceDataWritePerformed must be false.', applyReady?.summary);
    assertCondition(issues, reportStatus(postApply) === 'not-applied', 'Post-apply audit must remain not-applied.', reportStatus(postApply));
    assertCondition(issues, postApply?.summary?.unappliedRows === 1, 'Post-apply audit must expose one unapplied row.', postApply?.summary);
    assertCondition(issues, reportStatus(operatorStatus) === 'ready-for-manual-apply', 'Operator status must be ready-for-manual-apply.', reportStatus(operatorStatus));
    assertCondition(issues, operatorStatus?.summary?.notAppliedRows === 1, 'Operator status must expose one not-applied row.', operatorStatus?.summary);
    assertCondition(issues, statusRow?.rowStatus === 'NOT_APPLIED', 'Operator status row must be NOT_APPLIED.', statusRow);
    assertCondition(issues, reportStatus(manualPatchPlan) === 'ready-for-manual-apply', 'Manual patch plan must be ready-for-manual-apply.', reportStatus(manualPatchPlan));
    assertCondition(issues, manualPatchPlan?.summary?.manualPatchRows === 1, 'Manual patch plan must expose one row.', manualPatchPlan?.summary);
    assertCondition(issues, manualPatchRow?.action === 'MANUAL_PATCH_REQUIRED', 'Manual patch row action must be MANUAL_PATCH_REQUIRED.', manualPatchRow);
    assertCondition(issues, manualPatchRow?.targetSourceFile === SOURCE_DATA_FILE, 'Manual patch row target source file must be src/data/sajikSeatData.ts.', manualPatchRow);
    assertCondition(issues, manualPatchRow?.visualPathLocked === true, 'Manual patch row visualPathLocked must be true.', manualPatchRow);
    assertCondition(
      issues,
      isSameStringArray(manualPatchRow?.writableSourceFields, [
        'imageGeometry.hitPath',
        'imageGeometry.labelPoint',
        'imageGeometry.labelX',
        'imageGeometry.labelY',
      ]),
      'Manual patch writableSourceFields must be limited to hitPath and label fields.',
      manualPatchRow?.writableSourceFields,
    );
    assertCondition(
      issues,
      isSameStringArray(manualPatchRow?.lockedSourceFields, [
        'imageGeometry.visualPath',
        'imageGeometry.geometryVersion',
        'sectionKind',
        'markerType',
        'mapInteractionStatus',
        'traceSource',
        'traceMethod',
        'traceVersion',
      ]),
      'Manual patch lockedSourceFields must protect render identity and trace metadata.',
      manualPatchRow?.lockedSourceFields,
    );
    assertCondition(issues, String(manualPatchRow?.tsFragment ?? '').includes("sectionId: '021'"), 'Manual patch TypeScript fragment must include sectionId 021.', manualPatchRow?.tsFragment);
    assertCondition(issues, reportStatus(realApprovalReadiness) === 'ready-for-manual-apply', 'Real approval readiness must be ready-for-manual-apply.', reportStatus(realApprovalReadiness));
    assertCondition(issues, realApprovalReadiness?.summary?.approvedRows === 1, 'Real approval readiness must see one approved row.', realApprovalReadiness?.summary);
    assertCondition(issues, realApprovalReadiness?.summary?.approvedNotAppliedRows === 1, 'Real approval readiness must report one APPROVED_NOT_APPLIED row.', realApprovalReadiness?.summary);
    assertCondition(issues, realApprovalReadiness?.summary?.approvedBlockedRows === 0, 'Real approval readiness must report zero APPROVED_BLOCKED rows.', realApprovalReadiness?.summary);
    assertCondition(issues, realApprovalReadiness?.summary?.manualPatchRows === 1, 'Real approval readiness must mirror one manual patch row.', realApprovalReadiness?.summary);
    assertCondition(issues, realApprovalReadiness?.summary?.safetyContract?.sourceDataWritePerformed === false, 'Real approval readiness sourceDataWritePerformed must be false.', realApprovalReadiness?.summary);
    assertCondition(issues, realApprovalReadiness?.summary?.safetyContract?.productionWriteAllowed === false, 'Real approval readiness productionWriteAllowed must be false.', realApprovalReadiness?.summary);
    assertCondition(issues, realApprovalReadiness?.summary?.safetyContract?.productionDataChanged === false, 'Real approval readiness productionDataChanged must be false.', realApprovalReadiness?.summary);
    assertCondition(issues, readinessRow?.readinessStatus === 'APPROVED_NOT_APPLIED', 'Dry-run approved row must be APPROVED_NOT_APPLIED.', readinessRow);
    assertCondition(issues, readinessRow?.readinessAction === 'APPLY_MANUAL_PATCH', 'Dry-run readiness action must be APPLY_MANUAL_PATCH.', readinessRow);

    const report = {
      version: DRY_RUN_VERSION,
      targetSectionId: DRY_RUN_TARGET_SECTION_ID,
      status: issues.length === 0 ? 'passed' : 'failed',
      generatedAt: new Date().toISOString(),
      inputs: {
        baseInput: formatRelative(baseInputPath),
        dryRunInput: formatRelative(dryRunInputPath),
      },
      outputs: {
        inputAid: formatRelative(inputAidPath),
        prewrite: formatRelative(prewritePath),
        applyReady: formatRelative(applyReadyPath),
        patchPreview: formatRelative(patchPreviewPath),
        postApply: formatRelative(postApplyPath),
        operatorStatus: formatRelative(operatorStatusPath),
        manualPatchPlan: formatRelative(manualPatchPlanPath),
        realApprovalReadiness: formatRelative(realApprovalReadinessPath),
        dryRunJson: formatRelative(dryRunJsonPath),
        dryRunMarkdown: formatRelative(dryRunMarkdownPath),
      },
      flow: {
        inputAidStatus: reportStatus(inputAid),
        prewriteStatus: reportStatus(prewrite),
        applyReadyStatus: reportStatus(applyReady),
        postApplyStatus: reportStatus(postApply),
        operatorStatus: reportStatus(operatorStatus),
        manualPatchPlanStatus: reportStatus(manualPatchPlan),
        realApprovalReadinessStatus: reportStatus(realApprovalReadiness),
        manualPatchRows: manualPatchPlan?.summary?.manualPatchRows ?? 0,
        approvedNotAppliedRows: realApprovalReadiness?.summary?.approvedNotAppliedRows ?? 0,
        approvedBlockedRows: realApprovalReadiness?.summary?.approvedBlockedRows ?? 0,
      },
      safetyContract: {
        sourceDataFile: SOURCE_DATA_FILE,
        sourceDataWritePerformed: applyReady?.summary?.sourceDataWritePerformed ?? false,
        productionWriteAllowed: prewrite?.summary?.productionWriteAllowed ?? false,
        productionDataChanged: prewrite?.summary?.productionDataChanged ?? false,
        statement: `Approved dry-run does not edit ${SOURCE_DATA_FILE}.`,
      },
      manualPatchContract: {
        action: manualPatchRow?.action ?? null,
        writableSourceFields: manualPatchRow?.writableSourceFields ?? [],
        lockedSourceFields: manualPatchRow?.lockedSourceFields ?? [],
        visualPathLocked: manualPatchRow?.visualPathLocked ?? null,
        targetSourceFile: manualPatchRow?.targetSourceFile ?? null,
      },
      realApprovalReadinessContract: {
        readinessStatus: readinessRow?.readinessStatus ?? null,
        readinessAction: readinessRow?.readinessAction ?? null,
        approvedReadinessStatuses: realApprovalReadiness?.summary?.approvedReadinessStatuses ?? [],
        status: realApprovalReadiness?.summary?.status ?? null,
        approvedNotAppliedRows: realApprovalReadiness?.summary?.approvedNotAppliedRows ?? null,
        approvedBlockedRows: realApprovalReadiness?.summary?.approvedBlockedRows ?? null,
        safetyContract: realApprovalReadiness?.summary?.safetyContract ?? null,
      },
      commandResults,
      blockers,
      issues,
    };

    await writeJson(dryRunJsonPath, report);
    await fs.writeFile(dryRunMarkdownPath, buildMarkdown(report), 'utf8');

    console.log(`stage01_approved_dry_run_json:${formatRelative(dryRunJsonPath)}`);
    console.log(`stage01_approved_dry_run_markdown:${formatRelative(dryRunMarkdownPath)}`);
    console.log(
      `status:${report.status} target=${DRY_RUN_TARGET_SECTION_ID} prewrite=${report.flow.prewriteStatus} applyReady=${report.flow.applyReadyStatus} postApply=${report.flow.postApplyStatus} readiness=${report.flow.realApprovalReadinessStatus} readinessRow=${report.realApprovalReadinessContract.readinessStatus} manualPatchRows=${report.flow.manualPatchRows} sourceDataWritePerformed=${report.safetyContract.sourceDataWritePerformed}`,
    );

    if (report.status !== 'passed') {
      process.exitCode = 1;
    }
  }

  main().catch(async (error) => {
    const failureReport = {
      version: DRY_RUN_VERSION,
      targetSectionId: DRY_RUN_TARGET_SECTION_ID,
      status: 'failed',
      generatedAt: new Date().toISOString(),
      issues: [
        {
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
    await writeJson(dryRunJsonPath, failureReport).catch(() => {});
    await fs.writeFile(dryRunMarkdownPath, buildMarkdown({
      ...failureReport,
      flow: {
        inputAidStatus: 'missing',
        prewriteStatus: 'missing',
        applyReadyStatus: 'missing',
        postApplyStatus: 'missing',
        operatorStatus: 'missing',
        manualPatchPlanStatus: 'missing',
        realApprovalReadinessStatus: 'missing',
        manualPatchRows: 0,
        approvedNotAppliedRows: 0,
        approvedBlockedRows: 0,
      },
      safetyContract: {
        sourceDataWritePerformed: false,
        productionWriteAllowed: false,
        productionDataChanged: false,
      },
    }), 'utf8').catch(() => {});
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
};

const runStage01CompletionGateSmoke = async () => {
  const { spawnSync } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const SMOKE_VERSION = 'SAJIK_STAGE01_COMPLETION_GATE_SMOKE_V1';
  const COMPLETION_GATE_SCRIPT = 'scripts/sajik-seatmap-stage01.mjs';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const TARGET_APPROVAL_SECTION_ID = '131';
  const TARGET_SOURCE_FILE = 'src/data/sajikSeatData.ts';
  const EXPECTED_STAGE01_ROWS = 16;
  const EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER = [
    '131',
    '032',
    '135',
    '132',
    '031',
    '133',
    '022',
    '143',
    '134',
    '142',
    '121',
    '124',
    '125',
    '122',
    '021',
    '123',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const stageDir = path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator');
  const smokeRoot = path.join(stageDir, 'completion-gate-smoke', `run-${Date.now()}-${process.pid}`);
  const smokeJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-completion-gate-smoke.json');
  const smokeMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-completion-gate-smoke.md');
  const gateScriptPath = path.join(frontendRoot, COMPLETION_GATE_SCRIPT);

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  }

  async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  function baseCounts(overrides = {}) {
    return {
      pendingRows: 16,
      invalidRows: 0,
      approvedRows: 0,
      approvedAppliedRows: 0,
      approvedNotAppliedRows: 0,
      approvedBlockedRows: 0,
      manualPatchRows: 0,
      rejectedRows: 0,
      needsRetraceRows: 0,
      keepCurrentRows: 0,
      ...overrides,
    };
  }

  function buildReports({
    generatedAt = new Date().toISOString(),
    counts = baseCounts(),
    nextOperatorSectionId = TARGET_APPROVAL_SECTION_ID,
    readinessStatus = 'passed',
    readinessContractOverrides = {},
    targetApplyOverrides = {},
    versionOverrides = {},
  } = {}) {
    const terminalRows = counts.approvedAppliedRows + counts.rejectedRows + counts.keepCurrentRows;
    const sharedSafety = {
      sourceDataWritePerformed: false,
      productionWriteAllowed: false,
      productionDataChanged: false,
    };

    return {
      readinessSummary: {
        generatedAt,
        version: versionOverrides.readinessSummary ?? 'SAJIK_STAGE01_READINESS_SUMMARY_V1',
        status: readinessStatus,
        contract: {
          ...sharedSafety,
          operatorPackageImagePriorityOrder: [...EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER],
          operatorInputImagePriorityOrder: [...EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER],
          reviewBoardImagePriorityOrder: [...EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER],
          ...readinessContractOverrides,
        },
      },
      realApprovalReadiness: {
        summary: {
          realApprovalReadinessVersion: versionOverrides.realApprovalReadiness ?? 'SAJIK_STAGE01_REAL_APPROVAL_READINESS_V1',
          status: counts.pendingRows > 0 ? 'waiting-for-operator' : 'passed',
          generatedAt,
          targetStage: TARGET_STAGE_LABEL,
          targetSourceFile: TARGET_SOURCE_FILE,
          expectedRows: EXPECTED_STAGE01_ROWS,
          pendingRows: counts.pendingRows,
          approvedRows: counts.approvedRows,
          approvedAppliedRows: counts.approvedAppliedRows,
          approvedNotAppliedRows: counts.approvedNotAppliedRows,
          approvedBlockedRows: counts.approvedBlockedRows,
          manualPatchRows: counts.manualPatchRows,
          rejectedRows: counts.rejectedRows,
          needsRetraceRows: counts.needsRetraceRows,
          keepCurrentRows: counts.keepCurrentRows,
          terminalRows,
          safetyContract: { ...sharedSafety },
        },
      },
      operatorStatus: {
        summary: {
          operatorStatusVersion: versionOverrides.operatorStatus ?? 'SAJIK_STAGE01_OPERATOR_STATUS_V1',
          status: counts.pendingRows > 0 ? 'waiting-for-operator' : 'passed',
          generatedAt,
          targetStage: TARGET_STAGE_LABEL,
          expectedRows: EXPECTED_STAGE01_ROWS,
          pendingRows: counts.pendingRows,
          invalidRows: counts.invalidRows,
          approvedRows: counts.approvedRows,
          appliedRows: counts.approvedAppliedRows,
          notAppliedRows: counts.approvedNotAppliedRows,
          rejectedRows: counts.rejectedRows,
          needsRetraceRows: counts.needsRetraceRows,
          keepCurrentRows: counts.keepCurrentRows,
          ...sharedSafety,
        },
      },
      manualPatchPlan: {
        summary: {
          manualPatchPlanVersion: versionOverrides.manualPatchPlan ?? 'SAJIK_STAGE01_MANUAL_PATCH_PLAN_V1',
          status: counts.manualPatchRows > 0 ? 'ready-for-manual-apply' : 'passed',
          generatedAt,
          targetStage: TARGET_STAGE_LABEL,
          targetSourceFile: TARGET_SOURCE_FILE,
          manualPatchRows: counts.manualPatchRows,
          invalidRows: counts.invalidRows,
          ...sharedSafety,
        },
      },
      nextActionPacket: {
        summary: {
          packetVersion: versionOverrides.nextActionPacket ?? 'SAJIK_STAGE01_NEXT_ACTION_PACKET_V1',
          status: counts.pendingRows > 0 ? 'waiting-for-operator' : 'complete',
          generatedAt,
          targetStage: TARGET_STAGE_LABEL,
          expectedRows: EXPECTED_STAGE01_ROWS,
          pendingRows: counts.pendingRows,
          nextOperatorSectionId: counts.pendingRows > 0 ? nextOperatorSectionId : null,
          nextOperatorImagePriorityRank: counts.pendingRows > 0 ? 1 : null,
          nextOperatorAction: counts.pendingRows > 0 ? 'Trace official PNG manually before approval.' : null,
          ...sharedSafety,
        },
      },
      targetApplyPrecheck: {
        summary: {
          targetApplyPrecheckVersion: versionOverrides.targetApplyPrecheck ?? 'SAJIK_STAGE01_TARGET_APPLY_PRECHECK_V1',
          status: counts.pendingRows > 0 ? 'waiting-for-operator' : 'passed',
          generatedAt,
          targetStage: TARGET_STAGE_LABEL,
          targetSectionId: TARGET_APPROVAL_SECTION_ID,
          targetSourceFile: TARGET_SOURCE_FILE,
          selectedDecision: counts.pendingRows > 0 ? 'PENDING' : 'APPROVED',
          readyForPrewrite: false,
          manualPatchRequired: false,
          targetApplied: counts.approvedAppliedRows > 0,
          writesOperatorInput: false,
          writesProductionData: false,
          ...sharedSafety,
          ...targetApplyOverrides,
        },
      },
    };
  }

  async function writeFixture(caseDir, reports) {
    await writeJson(path.join(caseDir, 'sajik-seatmap-stage01-readiness-summary.json'), reports.readinessSummary);
    await writeJson(path.join(caseDir, 'sajik-seatmap-stage01-real-approval-readiness.json'), reports.realApprovalReadiness);
    await writeJson(path.join(caseDir, 'sajik-seatmap-stage01-operator-status.json'), reports.operatorStatus);
    await writeJson(path.join(caseDir, 'sajik-seatmap-stage01-manual-patch-plan.json'), reports.manualPatchPlan);
    await writeJson(path.join(caseDir, 'sajik-seatmap-stage01-next-action-packet.json'), reports.nextActionPacket);
    await writeJson(path.join(caseDir, 'targets/131-apply-precheck.json'), reports.targetApplyPrecheck);
  }

  function runGate(caseDir, requireComplete) {
    return spawnSync(process.execPath, [
      '--import',
      'tsx',
      gateScriptPath,
      '--stage-dir',
      caseDir,
      ...(requireComplete ? ['--require-complete'] : []),
    ], {
      cwd: frontendRoot,
      encoding: 'utf8',
    });
  }

  const cases = [
    {
      caseId: 'pending-waits',
      requireComplete: false,
      reports: buildReports(),
      expectedExitCode: 0,
      expectedStatus: 'waiting-for-operator',
      expectedReadyForClose: false,
      expectedCompletionBlockers: ['PENDING_OPERATOR_ROWS:16', 'TERMINAL_ROW_COUNT_INCOMPLETE:0/16'],
    },
    {
      caseId: 'pending-require-complete-fails',
      requireComplete: true,
      reports: buildReports(),
      expectedExitCode: 1,
      expectedStatus: 'waiting-for-operator',
      expectedReadyForClose: false,
      expectedCompletionBlockers: ['PENDING_OPERATOR_ROWS:16'],
    },
    {
      caseId: 'complete-passes',
      requireComplete: false,
      reports: buildReports({
        counts: baseCounts({
          pendingRows: 0,
          approvedRows: 8,
          approvedAppliedRows: 8,
          rejectedRows: 4,
          keepCurrentRows: 4,
        }),
      }),
      expectedExitCode: 0,
      expectedStatus: 'stage01-complete',
      expectedReadyForClose: true,
      expectedCompletionBlockers: [],
    },
    {
      caseId: 'complete-require-complete-passes',
      requireComplete: true,
      reports: buildReports({
        counts: baseCounts({
          pendingRows: 0,
          approvedRows: 16,
          approvedAppliedRows: 16,
        }),
      }),
      expectedExitCode: 0,
      expectedStatus: 'stage01-complete',
      expectedReadyForClose: true,
      expectedCompletionBlockers: [],
    },
    {
      caseId: 'manual-apply-waits',
      requireComplete: false,
      reports: buildReports({
        counts: baseCounts({
          pendingRows: 0,
          approvedRows: 1,
          approvedAppliedRows: 0,
          approvedNotAppliedRows: 1,
          manualPatchRows: 1,
        }),
        targetApplyOverrides: {
          status: 'ready-for-manual-apply',
          readyForPrewrite: true,
          manualPatchRequired: true,
          targetApplied: false,
        },
      }),
      expectedExitCode: 0,
      expectedStatus: 'ready-for-manual-apply',
      expectedReadyForClose: false,
      expectedCompletionBlockers: ['MANUAL_PATCH_ROWS_NOT_APPLIED:1', 'APPROVED_NOT_APPLIED_ROWS:1'],
    },
    {
      caseId: 'needs-retrace-waits',
      requireComplete: false,
      reports: buildReports({
        counts: baseCounts({
          pendingRows: 0,
          rejectedRows: 15,
          needsRetraceRows: 1,
        }),
      }),
      expectedExitCode: 0,
      expectedStatus: 'waiting-for-operator',
      expectedReadyForClose: false,
      expectedCompletionBlockers: ['NEEDS_RETRACE_ROWS:1'],
    },
    {
      caseId: 'source-write-tamper-blocks',
      requireComplete: false,
      reports: buildReports({
        readinessContractOverrides: {
          sourceDataWritePerformed: true,
        },
      }),
      expectedExitCode: 1,
      expectedStatus: 'blocked',
      expectedReadyForClose: false,
      expectedBlockers: ['READINESS_SUMMARY_SOURCE_DATA_WRITE_PERFORMED_MUST_BE_FALSE'],
    },
    {
      caseId: 'target-ready-without-manual-patch-blocks',
      requireComplete: false,
      reports: buildReports({
        targetApplyOverrides: {
          readyForPrewrite: true,
          manualPatchRequired: false,
        },
      }),
      expectedExitCode: 1,
      expectedStatus: 'blocked',
      expectedReadyForClose: false,
      expectedBlockers: ['TARGET_APPLY_READY_WITHOUT_MANUAL_PATCH_REQUIREMENT'],
    },
    {
      caseId: 'version-mismatch-blocks',
      requireComplete: false,
      reports: buildReports({
        versionOverrides: {
          readinessSummary: 'BAD_VERSION',
        },
      }),
      expectedExitCode: 1,
      expectedStatus: 'blocked',
      expectedReadyForClose: false,
      expectedBlockers: ['READINESS_SUMMARY_VERSION_MISMATCH:BAD_VERSION:SAJIK_STAGE01_READINESS_SUMMARY_V1'],
    },
  ];

  const caseSummaries = [];

  for (const smokeCase of cases) {
    const caseDir = path.join(smokeRoot, smokeCase.caseId);
    await writeFixture(caseDir, smokeCase.reports);
    const result = runGate(caseDir, smokeCase.requireComplete);
    const reportPath = path.join(caseDir, 'sajik-seatmap-stage01-completion-gate.json');
    const report = await readJson(reportPath);
    const blockerText = [
      ...(report.blockers ?? []),
      ...(report.completionBlockers ?? []),
    ].join('\n');
    const failures = [];

    if (result.status !== smokeCase.expectedExitCode) {
      failures.push(`EXIT_CODE:${result.status}:${smokeCase.expectedExitCode}`);
    }
    if (report.status !== smokeCase.expectedStatus) {
      failures.push(`STATUS:${report.status}:${smokeCase.expectedStatus}`);
    }
    if (report.closeCriteria?.readyForStage01Close !== smokeCase.expectedReadyForClose) {
      failures.push(`READY_FOR_CLOSE:${report.closeCriteria?.readyForStage01Close}:${smokeCase.expectedReadyForClose}`);
    }
    for (const expectedBlocker of smokeCase.expectedCompletionBlockers ?? []) {
      if (!blockerText.includes(expectedBlocker)) failures.push(`MISSING_COMPLETION_BLOCKER:${expectedBlocker}`);
    }
    for (const expectedBlocker of smokeCase.expectedBlockers ?? []) {
      if (!blockerText.includes(expectedBlocker)) failures.push(`MISSING_BLOCKER:${expectedBlocker}`);
    }
    if (report.sourceDataWritePerformed !== false) failures.push('SOURCE_DATA_WRITE_PERFORMED_NOT_FALSE');
    if (report.writesOperatorInput !== false) failures.push('WRITES_OPERATOR_INPUT_NOT_FALSE');
    if (report.writesProductionData !== false) failures.push('WRITES_PRODUCTION_DATA_NOT_FALSE');

    caseSummaries.push({
      caseId: smokeCase.caseId,
      status: failures.length === 0 ? 'passed' : 'failed',
      requireComplete: smokeCase.requireComplete,
      exitCode: result.status,
      expectedExitCode: smokeCase.expectedExitCode,
      gateStatus: report.status,
      readyForStage01Close: report.closeCriteria?.readyForStage01Close,
      blockers: report.blockers ?? [],
      completionBlockers: report.completionBlockers ?? [],
      failures,
    });
  }

  const failedCases = caseSummaries.filter((entry) => entry.status !== 'passed');
  const report = {
    generatedAt: new Date().toISOString(),
    smokeVersion: SMOKE_VERSION,
    status: failedCases.length > 0 ? 'failed' : 'passed',
    gateScript: COMPLETION_GATE_SCRIPT,
    totalCases: caseSummaries.length,
    passedCases: caseSummaries.length - failedCases.length,
    failedCases: failedCases.length,
    sourceDataWritePerformed: false,
    productionWriteAllowed: false,
    productionDataChanged: false,
    writesOperatorInput: false,
    writesProductionData: false,
    sourcePolicy: {
      allowedCoordinateSource: 'operator-approved official 2026 Sajik PNG manual trace only',
      disallowedSources: [
        'automatic coordinate guessing',
        'pixel candidate path copy without operator approval',
        'external crawling',
        'web-search-based baseball data',
      ],
      missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    },
    caseSummaries,
  };

  const markdown = [
    '# Sajik Stage 01 Completion Gate Smoke',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['status', report.status],
        ['cases', `${report.passedCases}/${report.totalCases}`],
        ['failedCases', String(report.failedCases)],
        ['sourceDataWritePerformed', String(report.sourceDataWritePerformed)],
        ['writesOperatorInput', String(report.writesOperatorInput)],
        ['writesProductionData', String(report.writesProductionData)],
      ],
    ),
    '',
    '## Cases',
    '',
    markdownTable(
      ['case', 'status', 'exit', 'gate status', 'ready for close', 'failures'],
      caseSummaries.map((entry) => [
        entry.caseId,
        entry.status,
        `${entry.exitCode}/${entry.expectedExitCode}`,
        entry.gateStatus,
        String(entry.readyForStage01Close),
        entry.failures.join(', ') || '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    '- This smoke writes only generated reports under `reports/stadium/sajik-stage01-operator`.',
    '- It does not modify `src/data/sajikSeatData.ts`.',
    '- It does not write operator input.',
    '- Completion remains blocked until operator-approved official PNG tracing is applied and verified.',
    '',
  ].join('\n');

  await writeJson(smokeJsonPath, report);
  await fs.writeFile(`${smokeMarkdownPath}.tmp`, markdown, 'utf8');
  await fs.rename(`${smokeMarkdownPath}.tmp`, smokeMarkdownPath);

  console.log(`stage01_completion_gate_smoke_json:${path.relative(frontendRoot, smokeJsonPath)}`);
  console.log(`stage01_completion_gate_smoke_markdown:${path.relative(frontendRoot, smokeMarkdownPath)}`);
  console.log(
    `status:${report.status} cases=${report.passedCases}/${report.totalCases} sourceDataWritePerformed=${report.sourceDataWritePerformed} writesOperatorInput=${report.writesOperatorInput} writesProductionData=${report.writesProductionData}`,
  );

  if (failedCases.length > 0) {
    process.exitCode = 1;
  }
};

const runStage01CompletionGate = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const COMPLETION_GATE_VERSION = 'SAJIK_STAGE01_COMPLETION_GATE_V1';
  const REQUIRED_READINESS_SUMMARY_VERSION = 'SAJIK_STAGE01_READINESS_SUMMARY_V1';
  const REQUIRED_REAL_APPROVAL_READINESS_VERSION = 'SAJIK_STAGE01_REAL_APPROVAL_READINESS_V1';
  const REQUIRED_OPERATOR_STATUS_VERSION = 'SAJIK_STAGE01_OPERATOR_STATUS_V1';
  const REQUIRED_MANUAL_PATCH_PLAN_VERSION = 'SAJIK_STAGE01_MANUAL_PATCH_PLAN_V1';
  const REQUIRED_NEXT_ACTION_PACKET_VERSION = 'SAJIK_STAGE01_NEXT_ACTION_PACKET_V1';
  const REQUIRED_TARGET_APPLY_PRECHECK_VERSION = 'SAJIK_STAGE01_TARGET_APPLY_PRECHECK_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const TARGET_APPROVAL_SECTION_ID = '131';
  const TARGET_SOURCE_FILE = 'src/data/sajikSeatData.ts';
  const EXPECTED_STAGE01_ROWS = 16;
  const EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER = [
    '131',
    '032',
    '135',
    '132',
    '031',
    '133',
    '022',
    '143',
    '134',
    '142',
    '121',
    '124',
    '125',
    '122',
    '021',
    '123',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const requireComplete = process.argv.includes('--require-complete');
  const stageDir = path.resolve(
    frontendRoot,
    argValue('--stage-dir', path.join('reports/stadium/sajik-stage01-operator')),
  );

  const paths = {
    readinessSummary: path.join(stageDir, 'sajik-seatmap-stage01-readiness-summary.json'),
    realApprovalReadiness: path.join(stageDir, 'sajik-seatmap-stage01-real-approval-readiness.json'),
    operatorStatus: path.join(stageDir, 'sajik-seatmap-stage01-operator-status.json'),
    manualPatchPlan: path.join(stageDir, 'sajik-seatmap-stage01-manual-patch-plan.json'),
    nextActionPacket: path.join(stageDir, 'sajik-seatmap-stage01-next-action-packet.json'),
    targetApplyPrecheck: path.join(stageDir, 'targets/131-apply-precheck.json'),
    json: path.join(stageDir, 'sajik-seatmap-stage01-completion-gate.json'),
    markdown: path.join(stageDir, 'sajik-seatmap-stage01-completion-gate.md'),
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

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

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);

  const sameArray = (left, right) => JSON.stringify(left ?? []) === JSON.stringify(right);

  const reportStatus = (report) => report?.summary?.status ?? report?.status ?? 'missing';

  const summaryVersion = (report, key) => report?.summary?.[key] ?? report?.[key];

  const addVersionBlocker = (blockers, label, actual, expected) => {
    if (actual !== expected) {
      blockers.push(`${label}_VERSION_MISMATCH:${actual ?? ''}:${expected}`);
    }
  };

  const addFalseFlagBlocker = (blockers, label, fieldName, actual) => {
    if (actual !== false) {
      blockers.push(`${label}_${fieldName}_MUST_BE_FALSE`);
    }
  };

  const readinessSummary = await readJson(paths.readinessSummary);
  const realApprovalReadiness = await readJson(paths.realApprovalReadiness);
  const operatorStatus = await readJson(paths.operatorStatus);
  const manualPatchPlan = await readJson(paths.manualPatchPlan);
  const nextActionPacket = await readJson(paths.nextActionPacket);
  const targetApplyPrecheck = await readJson(paths.targetApplyPrecheck);

  const realSummary = realApprovalReadiness.summary ?? {};
  const operatorSummary = operatorStatus.summary ?? {};
  const manualSummary = manualPatchPlan.summary ?? {};
  const nextSummary = nextActionPacket.summary ?? nextActionPacket;
  const targetSummary = targetApplyPrecheck.summary ?? targetApplyPrecheck;

  const blockers = [];
  const completionBlockers = [];
  const warnings = [];

  addVersionBlocker(blockers, 'READINESS_SUMMARY', readinessSummary.version, REQUIRED_READINESS_SUMMARY_VERSION);
  addVersionBlocker(blockers, 'REAL_APPROVAL_READINESS', summaryVersion(realApprovalReadiness, 'realApprovalReadinessVersion'), REQUIRED_REAL_APPROVAL_READINESS_VERSION);
  addVersionBlocker(blockers, 'OPERATOR_STATUS', summaryVersion(operatorStatus, 'operatorStatusVersion'), REQUIRED_OPERATOR_STATUS_VERSION);
  addVersionBlocker(blockers, 'MANUAL_PATCH_PLAN', summaryVersion(manualPatchPlan, 'manualPatchPlanVersion'), REQUIRED_MANUAL_PATCH_PLAN_VERSION);
  addVersionBlocker(blockers, 'NEXT_ACTION_PACKET', summaryVersion(nextActionPacket, 'packetVersion'), REQUIRED_NEXT_ACTION_PACKET_VERSION);
  addVersionBlocker(blockers, 'TARGET_APPLY_PRECHECK', summaryVersion(targetApplyPrecheck, 'targetApplyPrecheckVersion'), REQUIRED_TARGET_APPLY_PRECHECK_VERSION);

  if (readinessSummary.status !== 'passed') {
    blockers.push(`READINESS_SUMMARY_NOT_PASSED:${readinessSummary.status ?? ''}`);
  }
  if (realSummary.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`REAL_APPROVAL_STAGE_MISMATCH:${realSummary.targetStage ?? ''}`);
  }
  if (operatorSummary.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`OPERATOR_STATUS_STAGE_MISMATCH:${operatorSummary.targetStage ?? ''}`);
  }
  if (manualSummary.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`MANUAL_PATCH_STAGE_MISMATCH:${manualSummary.targetStage ?? ''}`);
  }
  if (nextSummary.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`NEXT_ACTION_STAGE_MISMATCH:${nextSummary.targetStage ?? ''}`);
  }
  if (targetSummary.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`TARGET_APPLY_STAGE_MISMATCH:${targetSummary.targetStage ?? ''}`);
  }
  if (targetSummary.targetSectionId !== TARGET_APPROVAL_SECTION_ID) {
    blockers.push(`TARGET_APPLY_SECTION_MISMATCH:${targetSummary.targetSectionId ?? ''}`);
  }
  if (manualSummary.targetSourceFile !== TARGET_SOURCE_FILE) {
    blockers.push(`MANUAL_PATCH_SOURCE_FILE_MISMATCH:${manualSummary.targetSourceFile ?? ''}`);
  }
  if (realSummary.targetSourceFile !== TARGET_SOURCE_FILE) {
    blockers.push(`REAL_APPROVAL_SOURCE_FILE_MISMATCH:${realSummary.targetSourceFile ?? ''}`);
  }
  if (targetSummary.targetSourceFile !== TARGET_SOURCE_FILE) {
    blockers.push(`TARGET_APPLY_SOURCE_FILE_MISMATCH:${targetSummary.targetSourceFile ?? ''}`);
  }
  if (realSummary.expectedRows !== EXPECTED_STAGE01_ROWS) {
    blockers.push(`REAL_APPROVAL_EXPECTED_ROWS_MISMATCH:${realSummary.expectedRows ?? ''}`);
  }
  if (operatorSummary.expectedRows !== EXPECTED_STAGE01_ROWS) {
    blockers.push(`OPERATOR_STATUS_EXPECTED_ROWS_MISMATCH:${operatorSummary.expectedRows ?? ''}`);
  }
  if (nextSummary.expectedRows !== EXPECTED_STAGE01_ROWS) {
    blockers.push(`NEXT_ACTION_EXPECTED_ROWS_MISMATCH:${nextSummary.expectedRows ?? ''}`);
  }
  if (!sameArray(readinessSummary.contract?.operatorPackageImagePriorityOrder, EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER)) {
    blockers.push('READINESS_OPERATOR_PACKAGE_IMAGE_PRIORITY_CHANGED');
  }
  if (!sameArray(readinessSummary.contract?.operatorInputImagePriorityOrder, EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER)) {
    blockers.push('READINESS_OPERATOR_INPUT_IMAGE_PRIORITY_CHANGED');
  }
  if (!sameArray(readinessSummary.contract?.reviewBoardImagePriorityOrder, EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER)) {
    blockers.push('READINESS_REVIEW_BOARD_IMAGE_PRIORITY_CHANGED');
  }

  [
    ['READINESS_SUMMARY', readinessSummary.contract],
    ['REAL_APPROVAL_READINESS', realSummary.safetyContract ?? realSummary],
    ['OPERATOR_STATUS', operatorSummary],
    ['MANUAL_PATCH_PLAN', manualSummary],
    ['NEXT_ACTION_PACKET', nextSummary],
    ['TARGET_APPLY_PRECHECK', targetSummary],
  ].forEach(([label, source]) => {
    if (!source) {
      blockers.push(`${label}_SUMMARY_MISSING`);
      return;
    }
    addFalseFlagBlocker(blockers, label, 'SOURCE_DATA_WRITE_PERFORMED', source.sourceDataWritePerformed);
    addFalseFlagBlocker(blockers, label, 'PRODUCTION_WRITE_ALLOWED', source.productionWriteAllowed);
    if ('productionDataChanged' in source) {
      addFalseFlagBlocker(blockers, label, 'PRODUCTION_DATA_CHANGED', source.productionDataChanged);
    }
    if ('writesOperatorInput' in source) {
      addFalseFlagBlocker(blockers, label, 'WRITES_OPERATOR_INPUT', source.writesOperatorInput);
    }
    if ('writesProductionData' in source) {
      addFalseFlagBlocker(blockers, label, 'WRITES_PRODUCTION_DATA', source.writesProductionData);
    }
  });

  const pendingRows = Number(realSummary.pendingRows ?? operatorSummary.pendingRows ?? nextSummary.pendingRows ?? 0);
  const invalidRows = Number(operatorSummary.invalidRows ?? manualSummary.invalidRows ?? 0);
  const approvedRows = Number(realSummary.approvedRows ?? operatorSummary.approvedRows ?? 0);
  const approvedAppliedRows = Number(realSummary.approvedAppliedRows ?? operatorSummary.appliedRows ?? 0);
  const approvedNotAppliedRows = Number(realSummary.approvedNotAppliedRows ?? operatorSummary.notAppliedRows ?? 0);
  const approvedBlockedRows = Number(realSummary.approvedBlockedRows ?? 0);
  const manualPatchRows = Number(realSummary.manualPatchRows ?? manualSummary.manualPatchRows ?? 0);
  const rejectedRows = Number(realSummary.rejectedRows ?? operatorSummary.rejectedRows ?? 0);
  const needsRetraceRows = Number(realSummary.needsRetraceRows ?? operatorSummary.needsRetraceRows ?? 0);
  const keepCurrentRows = Number(realSummary.keepCurrentRows ?? operatorSummary.keepCurrentRows ?? 0);
  const terminalRows = approvedAppliedRows + rejectedRows + keepCurrentRows;
  const allRowsTerminal = terminalRows === EXPECTED_STAGE01_ROWS;
  const readyForStage01Close = blockers.length === 0
    && pendingRows === 0
    && invalidRows === 0
    && approvedNotAppliedRows === 0
    && approvedBlockedRows === 0
    && manualPatchRows === 0
    && needsRetraceRows === 0
    && approvedRows === approvedAppliedRows
    && allRowsTerminal;

  if (pendingRows > 0) {
    completionBlockers.push(`PENDING_OPERATOR_ROWS:${pendingRows}`);
  }
  if (invalidRows > 0) {
    completionBlockers.push(`INVALID_OPERATOR_ROWS:${invalidRows}`);
  }
  if (manualPatchRows > 0) {
    completionBlockers.push(`MANUAL_PATCH_ROWS_NOT_APPLIED:${manualPatchRows}`);
  }
  if (approvedNotAppliedRows > 0) {
    completionBlockers.push(`APPROVED_NOT_APPLIED_ROWS:${approvedNotAppliedRows}`);
  }
  if (approvedBlockedRows > 0) {
    completionBlockers.push(`APPROVED_BLOCKED_ROWS:${approvedBlockedRows}`);
  }
  if (needsRetraceRows > 0) {
    completionBlockers.push(`NEEDS_RETRACE_ROWS:${needsRetraceRows}`);
  }
  if (approvedRows !== approvedAppliedRows) {
    completionBlockers.push(`APPROVED_APPLIED_COUNT_MISMATCH:${approvedAppliedRows}/${approvedRows}`);
  }
  if (!allRowsTerminal) {
    completionBlockers.push(`TERMINAL_ROW_COUNT_INCOMPLETE:${terminalRows}/${EXPECTED_STAGE01_ROWS}`);
  }
  if (targetSummary.readyForPrewrite === true && targetSummary.manualPatchRequired !== true) {
    blockers.push('TARGET_APPLY_READY_WITHOUT_MANUAL_PATCH_REQUIREMENT');
  }

  if (pendingRows > 0 && nextSummary.nextOperatorSectionId) {
    warnings.push(`NEXT_OPERATOR_SECTION:${nextSummary.nextOperatorSectionId}`);
  }
  if (targetSummary.status === 'waiting-for-operator') {
    warnings.push(`TARGET_${TARGET_APPROVAL_SECTION_ID}_WAITING_FOR_OPERATOR`);
  }

  const status = blockers.length > 0
    ? 'blocked'
    : readyForStage01Close
      ? 'stage01-complete'
      : manualPatchRows > 0 || approvedNotAppliedRows > 0
        ? 'ready-for-manual-apply'
        : 'waiting-for-operator';

  const report = {
    generatedAt: new Date().toISOString(),
    completionGateVersion: COMPLETION_GATE_VERSION,
    status,
    targetStage: TARGET_STAGE_LABEL,
    targetSourceFile: TARGET_SOURCE_FILE,
    expectedRows: EXPECTED_STAGE01_ROWS,
    requireComplete,
    sourceDataWritePerformed: false,
    productionWriteAllowed: false,
    productionDataChanged: false,
    writesOperatorInput: false,
    writesProductionData: false,
    reports: {
      readinessSummary: relativePath(paths.readinessSummary),
      realApprovalReadiness: relativePath(paths.realApprovalReadiness),
      operatorStatus: relativePath(paths.operatorStatus),
      manualPatchPlan: relativePath(paths.manualPatchPlan),
      nextActionPacket: relativePath(paths.nextActionPacket),
      targetApplyPrecheck: relativePath(paths.targetApplyPrecheck),
    },
    closeCriteria: {
      pendingRowsMustBeZero: pendingRows === 0,
      invalidRowsMustBeZero: invalidRows === 0,
      manualPatchRowsMustBeZero: manualPatchRows === 0,
      approvedRowsMustBeApplied: approvedRows === approvedAppliedRows,
      needsRetraceRowsMustBeZero: needsRetraceRows === 0,
      terminalRowsMustCoverStage: allRowsTerminal,
      readyForStage01Close,
    },
    counts: {
      pendingRows,
      invalidRows,
      approvedRows,
      approvedAppliedRows,
      approvedNotAppliedRows,
      approvedBlockedRows,
      manualPatchRows,
      rejectedRows,
      needsRetraceRows,
      keepCurrentRows,
      terminalRows,
      expectedRows: EXPECTED_STAGE01_ROWS,
    },
    nextAction: {
      nextOperatorSectionId: nextSummary.nextOperatorSectionId ?? null,
      nextOperatorImagePriorityRank: nextSummary.nextOperatorImagePriorityRank ?? null,
      nextOperatorAction: nextSummary.nextOperatorAction ?? null,
    },
    targetApplyPrecheck: {
      targetSectionId: targetSummary.targetSectionId ?? TARGET_APPROVAL_SECTION_ID,
      status: reportStatus(targetApplyPrecheck),
      selectedDecision: targetSummary.selectedDecision ?? null,
      readyForPrewrite: targetSummary.readyForPrewrite ?? false,
      manualPatchRequired: targetSummary.manualPatchRequired ?? false,
      targetApplied: targetSummary.targetApplied ?? false,
    },
    sourcePolicy: {
      allowedCoordinateSource: 'operator-approved official 2026 Sajik PNG manual trace only',
      coordinateSystem: '960x640 SVG viewBox 0 0 960 640',
      missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      disallowedSources: [
        'external crawling',
        'web-search-based baseball data',
        'automatic coordinate guessing',
        'pixel candidate path copy without operator approval',
        'browser CSS pixels',
        'resized screenshots',
        'third-party copied seatmap images',
      ],
    },
    completionBlockers,
    blockers,
    warnings,
  };

  const markdown = [
    '# Sajik Stage 01 Completion Gate',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['status', report.status],
        ['targetStage', report.targetStage],
        ['expectedRows', String(report.expectedRows)],
        ['readyForStage01Close', String(report.closeCriteria.readyForStage01Close)],
        ['pendingRows', String(report.counts.pendingRows)],
        ['approvedRows', String(report.counts.approvedRows)],
        ['approvedAppliedRows', String(report.counts.approvedAppliedRows)],
        ['manualPatchRows', String(report.counts.manualPatchRows)],
        ['needsRetraceRows', String(report.counts.needsRetraceRows)],
        ['terminalRows', `${report.counts.terminalRows}/${report.counts.expectedRows}`],
        ['nextOperatorSectionId', report.nextAction.nextOperatorSectionId ?? '-'],
        ['targetApplyPrecheckStatus', report.targetApplyPrecheck.status],
        ['sourceDataWritePerformed', String(report.sourceDataWritePerformed)],
        ['writesOperatorInput', String(report.writesOperatorInput)],
        ['writesProductionData', String(report.writesProductionData)],
      ],
    ),
    '',
    '## Close Criteria',
    '',
    markdownTable(
      ['criterion', 'passed'],
      Object.entries(report.closeCriteria).map(([key, value]) => [key, String(value)]),
    ),
    '',
    '## Completion Blockers',
    '',
    report.completionBlockers.length > 0
      ? report.completionBlockers.map((entry) => `- \`${entry}\``).join('\n')
      : '- none',
    '',
    '## Structural Blockers',
    '',
    report.blockers.length > 0
      ? report.blockers.map((entry) => `- \`${entry}\``).join('\n')
      : '- none',
    '',
    '## Safety Contract',
    '',
    '- This gate is read-only.',
    '- It does not modify `src/data/sajikSeatData.ts`.',
    '- It does not write operator input.',
    '- Completion requires operator-approved official PNG tracing; no automatic coordinate guessing is allowed.',
    '',
  ].join('\n');

  await writeJson(paths.json, report);
  await fs.writeFile(`${paths.markdown}.tmp`, markdown, 'utf8');
  await fs.rename(`${paths.markdown}.tmp`, paths.markdown);

  console.log(`stage01_completion_gate_json:${relativePath(paths.json)}`);
  console.log(`stage01_completion_gate_markdown:${relativePath(paths.markdown)}`);
  console.log(
    `status:${report.status} pending=${pendingRows} approvedApplied=${approvedAppliedRows} manualPatchRows=${manualPatchRows} next=${report.nextAction.nextOperatorSectionId ?? '-'} readyForStage01Close=${readyForStage01Close} sourceDataWritePerformed=${report.sourceDataWritePerformed}`,
  );

  if (blockers.length > 0 || (requireComplete && !readyForStage01Close)) {
    process.exitCode = 1;
  }
};

const runStage01ManualPatchPlan = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: crypto } = await import("node:crypto");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { buildSajikSeatMapDataset, formatSajikSeatMapSectionPatchTsFragment } = await import("../src/data/sajikSeatMapDataset.ts");
  const { pathBounds, pathToPoints, polygonArea } = await import("../src/utils/seatMapPolygonValidator.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultStageDir = path.join(reportDir, 'sajik-stage01-operator');

  const MANUAL_PATCH_PLAN_VERSION = 'SAJIK_STAGE01_MANUAL_PATCH_PLAN_V1';
  const REQUIRED_OPERATOR_STATUS_VERSION = 'SAJIK_STAGE01_OPERATOR_STATUS_V1';
  const REQUIRED_PREWRITE_VERSION = 'SAJIK_STAGE01_PREWRITE_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const TARGET_SOURCE_FILE = 'src/data/sajikSeatData.ts';
  const WRITABLE_SOURCE_FIELDS = [
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.labelX',
    'imageGeometry.labelY',
  ];
  const LOCKED_SOURCE_FIELDS = [
    'imageGeometry.visualPath',
    'imageGeometry.geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
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

  const booleanText = (value) => (value ? 'true' : 'false');

  const stableJson = (value) => {
    if (Array.isArray(value)) {
      return `[${value.map(stableJson).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  };

  const fingerprint = (value) => crypto
    .createHash('sha256')
    .update(stableJson(value))
    .digest('hex');

  const pointDelta = (before, after) => {
    if (!Array.isArray(before) || !Array.isArray(after)) return null;
    return [
      Number((after[0] - before[0]).toFixed(2)),
      Number((after[1] - before[1]).toFixed(2)),
    ];
  };

  function escapeTsString(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function formatPointForTs(point) {
    return `[${point[0]}, ${point[1]}]`;
  }

  const formatWritableSourcePatchTsFragment = (row) => [
    `// ${row.sectionId} Stage 01 writable source fields only`,
    '// Apply inside the matching imageGeometry object in src/data/sajikSeatData.ts.',
    '// Keep locked source fields unchanged.',
    `hitPath: '${escapeTsString(row.approved.hitPath)}',`,
    `labelPoint: ${formatPointForTs(row.approved.labelPoint)} as const,`,
    `labelX: ${row.approved.labelX},`,
    `labelY: ${row.approved.labelY},`,
  ].join('\n');

  const diffSummaryFor = (payload) => {
    const beforeHitPoints = pathToPoints(payload.before.hitPath);
    const afterHitPoints = pathToPoints(payload.after.hitPath);
    const beforeVisualPoints = pathToPoints(payload.before.visualPath);
    const afterVisualPoints = pathToPoints(payload.after.visualPath);

    return {
      visualPathChanged: payload.before.visualPath !== payload.after.visualPath,
      hitPathChanged: payload.before.hitPath !== payload.after.hitPath,
      labelPointChanged: JSON.stringify(payload.before.labelPoint) !== JSON.stringify(payload.after.labelPoint),
      hitPointCountBefore: beforeHitPoints.length,
      hitPointCountAfter: afterHitPoints.length,
      visualPointCountBefore: beforeVisualPoints.length,
      visualPointCountAfter: afterVisualPoints.length,
      hitAreaBefore: Number(polygonArea(beforeHitPoints).toFixed(2)),
      hitAreaAfter: Number(polygonArea(afterHitPoints).toFixed(2)),
      hitBoundsBefore: pathBounds(payload.before.hitPath),
      hitBoundsAfter: pathBounds(payload.after.hitPath),
      labelPointBefore: payload.before.labelPoint,
      labelPointAfter: payload.after.labelPoint,
      labelPointDelta: pointDelta(payload.before.labelPoint, payload.after.labelPoint),
    };
  };

  const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
  const operatorStatusPath = path.resolve(
    frontendRoot,
    argValue('--operator-status', path.join(stageDir, 'sajik-seatmap-stage01-operator-status.json')),
  );
  const prewritePath = path.resolve(
    frontendRoot,
    argValue('--prewrite', path.join(stageDir, 'sajik-seatmap-stage01-prewrite.json')),
  );
  const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-manual-patch-plan.json');
  const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-manual-patch-plan.csv');
  const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-manual-patch-plan.md');
  const requireReady = hasFlag('--require-ready');

  const dataset = buildSajikSeatMapDataset();
  const sectionsById = new Map(dataset.sections.map((section) => [section.sectionId, section]));
  const operatorStatus = await readJson(operatorStatusPath);
  const prewrite = await readJson(prewritePath);

  const operatorRows = Array.isArray(operatorStatus.rows) ? operatorStatus.rows : [];
  const patchPayloads = Array.isArray(prewrite.patchPayloads) ? prewrite.patchPayloads : [];
  const patchPayloadBySectionId = new Map(patchPayloads.map((payload) => [String(payload.sectionId ?? '').trim(), payload]));
  const blockers = [];
  const warnings = [];

  if (operatorStatus.summary?.operatorStatusVersion !== REQUIRED_OPERATOR_STATUS_VERSION) {
    blockers.push(`OPERATOR_STATUS_VERSION_MISMATCH:${operatorStatus.summary?.operatorStatusVersion ?? ''}`);
  }
  if (prewrite.summary?.prewriteVersion !== REQUIRED_PREWRITE_VERSION) {
    blockers.push(`PREWRITE_VERSION_MISMATCH:${prewrite.summary?.prewriteVersion ?? ''}`);
  }
  if (operatorStatus.summary?.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`OPERATOR_STATUS_STAGE_MISMATCH:${operatorStatus.summary?.targetStage ?? ''}`);
  }
  if (prewrite.summary?.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`PREWRITE_STAGE_MISMATCH:${prewrite.summary?.targetStage ?? ''}`);
  }
  if (operatorStatus.summary?.productionWriteAllowed !== false) {
    blockers.push('OPERATOR_STATUS_PRODUCTION_WRITE_ALLOWED');
  }
  if (operatorStatus.summary?.sourceDataWritePerformed !== false) {
    blockers.push('OPERATOR_STATUS_SOURCE_DATA_WRITE_PERFORMED');
  }
  if (prewrite.summary?.productionDataChanged !== false) {
    blockers.push('PREWRITE_PRODUCTION_DATA_CHANGED');
  }
  if (prewrite.summary?.productionWriteAllowed !== false) {
    blockers.push('PREWRITE_PRODUCTION_WRITE_ALLOWED');
  }
  if (operatorStatus.summary?.status === 'blocked') {
    blockers.push(...(operatorStatus.summary.blockers ?? []).map((blocker) => `OPERATOR_STATUS_BLOCKED:${blocker}`));
  }

  const notAppliedRows = operatorRows.filter((row) => row.rowStatus === 'NOT_APPLIED');
  const appliedRows = operatorRows.filter((row) => row.rowStatus === 'APPLIED');
  const invalidRows = operatorRows.filter((row) => row.rowStatus === 'INVALID');
  const approvedRows = operatorRows.filter((row) => row.operatorDecision === 'APPROVED');

  const planRows = notAppliedRows.map((row) => {
    const patchPayload = row.patchPayload ?? patchPayloadBySectionId.get(row.sectionId);
    const section = sectionsById.get(row.sectionId);
    if (!patchPayload) {
      blockers.push(`PATCH_PAYLOAD_MISSING:${row.sectionId}`);
      return {
        sectionId: row.sectionId,
        action: 'PATCH_PAYLOAD_MISSING',
        reasons: ['PATCH_PAYLOAD_MISSING'],
      };
    }
    if (patchPayload.validation?.status !== 'PASS') {
      blockers.push(`PATCH_PAYLOAD_INVALID:${row.sectionId}:${patchPayload.validation?.status ?? ''}`);
    }
    if (section && section.hitPath !== patchPayload.before?.hitPath) {
      blockers.push(`CURRENT_SOURCE_BASELINE_MISMATCH:${row.sectionId}:hitPath`);
    }
    if (section && JSON.stringify(section.labelPoint) !== JSON.stringify(patchPayload.before?.labelPoint)) {
      blockers.push(`CURRENT_SOURCE_BASELINE_MISMATCH:${row.sectionId}:labelPoint`);
    }
    if (section && section.visualPath !== patchPayload.before?.visualPath) {
      blockers.push(`LOCKED_SOURCE_BASELINE_MISMATCH:${row.sectionId}:visualPath`);
    }

    const diffSummary = diffSummaryFor(patchPayload);
    if (diffSummary.visualPathChanged) {
      blockers.push(`LOCKED_SOURCE_FIELD_MUTATED:${row.sectionId}:imageGeometry.visualPath`);
    }
    const sourceBaseline = {
      sectionId: row.sectionId,
      visualPath: patchPayload.before.visualPath,
      hitPath: patchPayload.before.hitPath,
      labelPoint: patchPayload.before.labelPoint,
      labelX: patchPayload.before.labelPoint?.[0] ?? null,
      labelY: patchPayload.before.labelPoint?.[1] ?? null,
      geometryVersion: section?.geometryVersion ?? 'manual-polygon-v2',
      sectionKind: section?.sectionKind ?? patchPayload.sectionKind,
      markerType: section?.markerType ?? null,
      mapInteractionStatus: section?.mapInteractionStatus ?? null,
      traceSource: section?.traceSource ?? null,
      traceMethod: section?.traceMethod ?? null,
      traceVersion: section?.traceVersion ?? null,
    };
    const approvedSource = {
      ...sourceBaseline,
      hitPath: patchPayload.after.hitPath,
      labelPoint: patchPayload.after.labelPoint,
      labelX: patchPayload.after.labelPoint?.[0] ?? null,
      labelY: patchPayload.after.labelPoint?.[1] ?? null,
    };
    const beforeFingerprint = fingerprint(sourceBaseline);
    const approvedFingerprint = fingerprint(approvedSource);
    const lockedFieldFingerprint = fingerprint({
      visualPath: sourceBaseline.visualPath,
      geometryVersion: sourceBaseline.geometryVersion,
      sectionKind: sourceBaseline.sectionKind,
      markerType: sourceBaseline.markerType,
      mapInteractionStatus: sourceBaseline.mapInteractionStatus,
      traceSource: sourceBaseline.traceSource,
      traceMethod: sourceBaseline.traceMethod,
      traceVersion: sourceBaseline.traceVersion,
    });
    const patchPayloadWithFingerprints = {
      ...patchPayload,
      beforeFingerprint,
      approvedFingerprint,
      lockedFieldFingerprint,
    };

    return {
      sectionId: row.sectionId,
      blockId: patchPayload.blockId,
      batchId: row.batchId,
      zoneId: row.zoneId,
      sectionName: row.sectionName,
      seatCategoryLabel: row.seatCategoryLabel,
      targetSourceFile: TARGET_SOURCE_FILE,
      action: 'MANUAL_PATCH_REQUIRED',
      reviewer: row.reviewer,
      reviewedAt: row.reviewedAt,
      visualPathLocked: !diffSummary.visualPathChanged,
      geometryVersion: 'manual-polygon-v2',
      writableSourceFields: WRITABLE_SOURCE_FIELDS,
      lockedSourceFields: LOCKED_SOURCE_FIELDS,
      sourceEditChecklist: [
        'verify beforeFingerprint still matches the current source baseline before editing',
        'apply imageGeometry.hitPath from approved.hitPath',
        'apply imageGeometry.labelPoint from approved.labelPoint',
        'update imageGeometry.labelX and imageGeometry.labelY to match approved.labelPoint',
        'keep imageGeometry.visualPath unchanged',
        'keep sectionKind, markerType, mapInteractionStatus, traceSource, traceMethod, and traceVersion unchanged',
      ],
      beforeFingerprint,
      approvedFingerprint,
      lockedFieldFingerprint,
      sourceBaseline,
      current: {
        visualPath: patchPayload.before.visualPath,
        hitPath: patchPayload.before.hitPath,
        labelPoint: patchPayload.before.labelPoint,
        labelX: patchPayload.before.labelPoint?.[0] ?? null,
        labelY: patchPayload.before.labelPoint?.[1] ?? null,
      },
      approved: {
        visualPath: patchPayload.after.visualPath,
        hitPath: patchPayload.after.hitPath,
        labelPoint: patchPayload.after.labelPoint,
        labelX: patchPayload.after.labelPoint?.[0] ?? null,
        labelY: patchPayload.after.labelPoint?.[1] ?? null,
      },
      diffSummary,
      patchPayload: patchPayloadWithFingerprints,
      tsFragment: formatSajikSeatMapSectionPatchTsFragment(patchPayloadWithFingerprints),
      writableTsFragment: formatWritableSourcePatchTsFragment({
        sectionId: row.sectionId,
        approved: approvedSource,
      }),
    };
  });

  if (invalidRows.length > 0) {
    blockers.push(`INVALID_OPERATOR_STATUS_ROWS:${invalidRows.map((row) => row.sectionId).join(' ')}`);
  }
  if (approvedRows.length === 0) {
    warnings.push('NO_OPERATOR_APPROVED_STAGE01_ROWS');
  }
  if (planRows.length > 0) {
    warnings.push(`MANUAL_PATCH_REQUIRED:${planRows.map((row) => row.sectionId).join(' ')}`);
  }

  const baseStatus = blockers.length > 0
    ? 'blocked'
    : approvedRows.length === 0
      ? 'waiting-for-operator'
      : planRows.length > 0
        ? 'ready-for-manual-apply'
        : appliedRows.length === approvedRows.length
          ? 'applied'
          : operatorStatus.summary?.status ?? 'in-progress';

  if (requireReady && baseStatus !== 'ready-for-manual-apply') {
    blockers.push(`REQUIRE_READY_NOT_SATISFIED:${baseStatus}`);
  }

  const status = blockers.length > 0 ? 'blocked' : baseStatus;
  const summary = {
    manualPatchPlanVersion: MANUAL_PATCH_PLAN_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    operatorStatus: path.relative(frontendRoot, operatorStatusPath),
    prewrite: path.relative(frontendRoot, prewritePath),
    stadiumId: dataset.stadiumId,
    mapVersion: dataset.mapVersion,
    viewBox: dataset.image.viewBox,
    targetStage: TARGET_STAGE_LABEL,
    targetSourceFile: TARGET_SOURCE_FILE,
    approvedRows: approvedRows.length,
    appliedRows: appliedRows.length,
    notAppliedRows: notAppliedRows.length,
    manualPatchRows: planRows.length,
    invalidRows: invalidRows.length,
    requireReady,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    writableSourceFields: WRITABLE_SOURCE_FIELDS,
    lockedSourceFields: LOCKED_SOURCE_FIELDS,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    safetyContract: [
      'This script is a read-only Stage 01 manual patch plan; it never edits src/data/sajikSeatData.ts.',
      'It reads operator-status and prewrite output, then emits only NOT_APPLIED rows as manual patch targets.',
      'MANUAL_PATCH_REQUIRED rows must be reviewed before editing the production data file.',
      'The --require-ready flag fails unless the board is ready-for-manual-apply.',
      'Source data writes remain forbidden here: sourceDataWritePerformed=false and productionWriteAllowed=false.',
      'Writable source fields are limited to imageGeometry.hitPath, imageGeometry.labelPoint, imageGeometry.labelX, and imageGeometry.labelY.',
      'visualPath, sectionKind, markerType, mapInteractionStatus, and trace metadata are locked fields in this Stage 01 plan.',
    ],
    rows: planRows,
  };

  await fs.mkdir(stageDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'sectionId',
      'blockId',
      'batchId',
      'zoneId',
      'action',
      'visualPathLocked',
      'hitPathChanged',
      'labelPointChanged',
      'labelX',
      'labelY',
      'beforeFingerprint',
      'approvedFingerprint',
      'lockedFieldFingerprint',
      'writableSourceFields',
      'lockedSourceFields',
      'targetSourceFile',
      'writableTsFragment',
      'reviewer',
      'reviewedAt',
    ],
    ...planRows.map((row) => [
      row.sectionId,
      row.blockId,
      row.batchId,
      row.zoneId,
      row.action,
      row.visualPathLocked,
      row.diffSummary?.hitPathChanged,
      row.diffSummary?.labelPointChanged,
      row.approved?.labelX,
      row.approved?.labelY,
      row.beforeFingerprint,
      row.approvedFingerprint,
      row.lockedFieldFingerprint,
      row.writableSourceFields?.join('; '),
      row.lockedSourceFields?.join('; '),
      row.targetSourceFile,
      row.writableTsFragment,
      row.reviewer,
      row.reviewedAt,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Sajik Stage 01 Manual Patch Plan',
    '',
    `- plan version: \`${MANUAL_PATCH_PLAN_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- target source file: \`${summary.targetSourceFile}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- applied rows: \`${summary.appliedRows}\``,
    `- not applied rows: \`${summary.notAppliedRows}\``,
    `- manual patch rows: \`${summary.manualPatchRows}\``,
    `- require ready: \`${summary.requireReady}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Source Edit Contract',
    '',
    `- writable source fields: \`${WRITABLE_SOURCE_FIELDS.join('`, `')}\``,
    `- locked source fields: \`${LOCKED_SOURCE_FIELDS.join('`, `')}\``,
    '- source edit checklist: verify `beforeFingerprint`, apply only approved `hitPath` and `labelPoint`, then update legacy-compatible `labelX/labelY`.',
    '- lock rule: keep `visualPath`, `sectionKind`, `markerType`, `mapInteractionStatus`, and trace metadata unchanged.',
    '- fragment rule: generated writable fragments intentionally omit locked `visualPath` and metadata fields.',
    '',
    '## Rows',
    '',
    planRows.length > 0
      ? markdownTable(
        ['section', 'batch', 'zone', 'action', 'visual locked', 'hit changed', 'label changed', 'labelPoint', 'before fingerprint', 'approved fingerprint', 'locked fingerprint', 'target'],
        planRows.map((row) => [
          `\`${row.sectionId}\``,
          `\`${row.batchId}\``,
          `\`${row.zoneId}\``,
          `\`${row.action}\``,
          `\`${booleanText(row.visualPathLocked)}\``,
          `\`${booleanText(row.diffSummary?.hitPathChanged)}\``,
          `\`${booleanText(row.diffSummary?.labelPointChanged)}\``,
          `\`${JSON.stringify(row.approved?.labelPoint ?? null)}\``,
          `\`${row.beforeFingerprint}\``,
          `\`${row.approvedFingerprint}\``,
          `\`${row.lockedFieldFingerprint}\``,
          `\`${row.targetSourceFile}\``,
        ]),
      )
      : 'No manual Stage 01 source patch is currently required.',
    '',
    '## Patch Fragments',
    '',
    planRows.length > 0
      ? planRows.map((row) => [
        `### ${row.sectionId}`,
        '',
        'Writable source fields only:',
        '',
        '```ts',
        row.writableTsFragment,
        '```',
        '',
        'Full context preview (do not copy locked fields as edits):',
        '',
        '```ts',
        row.tsFragment,
        '```',
      ].join('\n')).join('\n\n')
      : 'No patch fragments.',
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No manual patch plan blockers.',
    '',
    '## Warnings',
    '',
    warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`stage01_manual_patch_plan_json:${path.relative(frontendRoot, jsonPath)}`);
  console.log(`stage01_manual_patch_plan_csv:${path.relative(frontendRoot, csvPath)}`);
  console.log(`stage01_manual_patch_plan_markdown:${path.relative(frontendRoot, markdownPath)}`);
  console.log(`status:${summary.status} manualPatchRows=${summary.manualPatchRows} approved=${summary.approvedRows} applied=${summary.appliedRows} notApplied=${summary.notAppliedRows} blockers=${summary.blockers.length} requireReady=${summary.requireReady}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01NextActionPacket = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const PACKET_VERSION = 'SAJIK_STAGE01_NEXT_ACTION_PACKET_V1';
  const REQUIRED_OPERATOR_INPUT_AID_VERSION = 'SAJIK_STAGE01_OPERATOR_INPUT_AID_V1';
  const REQUIRED_REVIEW_BOARD_VERSION = 'SAJIK_STAGE01_REVIEW_BOARD_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const EXPECTED_STAGE01_ROWS = 16;
  const OPERATOR_ACTION_FILL_OR_DECIDE = 'FILL_OR_DECIDE';
  const EXPECTED_PRIORITY_ORDER = [
    '131',
    '032',
    '135',
    '132',
    '031',
    '133',
    '022',
    '143',
    '134',
    '142',
    '121',
    '124',
    '125',
    '122',
    '021',
    '123',
  ];
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT']);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const stageDir = path.resolve(
    frontendRoot,
    argValue('--stage-dir', path.join('reports/stadium/sajik-stage01-operator')),
  );

  const inputPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json');
  const inputAidPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input-aid.json');
  const reviewBoardPath = path.join(stageDir, 'sajik-seatmap-stage01-review-board.json');
  const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-next-action-packet.json');
  const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-next-action-packet.csv');
  const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-next-action-packet.md');

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
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

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);

  const normalizeDecision = (value) => {
    const decision = String(value ?? 'PENDING').trim();
    return decision || 'PENDING';
  };

  const normalizeStatus = (value) => {
    const status = String(value ?? 'PENDING').trim();
    return status || 'PENDING';
  };

  const priorityOrderFor = (rows) => rows
    .slice()
    .sort((left, right) => Number(left.imagePriorityRank ?? 999) - Number(right.imagePriorityRank ?? 999))
    .map((row) => String(row.sectionId ?? '').trim())
    .filter(Boolean);

  const sameArray = (left, right) => JSON.stringify(left) === JSON.stringify(right);

  const riskSortValue = (riskLevel) => {
    if (riskLevel === 'HIGH') return 1;
    if (riskLevel === 'MEDIUM') return 2;
    if (riskLevel === 'LOW') return 3;
    return 4;
  };

  const operatorActionFor = (row) => {
    if (row.rowStatus === 'INVALID') {
      return 'Fix the operator input fields before running prewrite.';
    }
    if (row.rowStatus === 'READY_FOR_PREWRITE') {
      return 'Run npm run stadium:sajik:stage01-prewrite, then review apply-ready/manual patch reports.';
    }
    if (row.operatorDecision === 'REJECTED' || row.operatorDecision === 'NEEDS_RETRACE' || row.operatorDecision === 'KEEP_CURRENT') {
      return 'No patch preview is produced. Verify the operator note explains the decision.';
    }
    return 'Inspect the official PNG, review-board SVG, and entry sheet; then choose APPROVED, REJECTED, NEEDS_RETRACE, or KEEP_CURRENT.';
  };

  const operatorFocusFor = (row) => {
    const reasons = Array.isArray(row.imageRiskReasons) ? row.imageRiskReasons : [];
    if (row.rowStatus === 'INVALID') {
      return 'Correct missing or malformed fields in the source operator input row.';
    }
    if (row.rowStatus === 'READY_FOR_PREWRITE') {
      return 'Do not edit production data yet; let prewrite/apply-ready produce the manual patch fragment.';
    }
    if (row.operatorDecision !== 'PENDING') {
      return 'Confirm this non-APPROVED decision is intentional and documented.';
    }
    if (reasons.includes('SMALL_OFFICIAL_PIXEL_COMPONENT')) {
      return 'Small official PNG component: zoom in on the review-board SVG and official PNG before deciding.';
    }
    if (reasons.includes('LOW_PATH_COLOR_COVERAGE')) {
      return 'Low current path color coverage: compare current hitPath against the official PNG component evidence.';
    }
    return 'Compare current hitPath, label point, and official PNG evidence without copying pixel candidate paths.';
  };

  const acceptanceFor = (row) => {
    if (row.rowStatus === 'READY_FOR_PREWRITE') {
      return 'Prewrite must accept the row with no blockers and productionDataChanged=false.';
    }
    if (row.operatorDecision === 'KEEP_CURRENT') {
      return 'KEEP_CURRENT must preserve current production geometry and produce no patch preview.';
    }
    if (row.operatorDecision === 'REJECTED' || row.operatorDecision === 'NEEDS_RETRACE') {
      return 'Decision row must include a note and produce no patch preview.';
    }
    return 'APPROVED requires correctedPath, correctedLabelX/Y, reviewer, reviewedAt, operatorNote, and human confirmation that the path came from official PNG review.';
  };

  const sourcePolicy = {
    allowedCoordinateSource: 'operator-provided official 2026 Sajik PNG coordinates only',
    coordinateSystem: 'SVG viewBox 0 0 960 640',
    disallowedSources: [
      'pixel candidate path copy without operator approval',
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  };

  const operatorInput = await readJson(inputPath);
  const inputAid = await readJson(inputAidPath);
  const reviewBoard = await readJson(reviewBoardPath);

  const inputRows = Array.isArray(operatorInput.corrections) ? operatorInput.corrections : [];
  const inputAidRows = Array.isArray(inputAid.rows) ? inputAid.rows : [];
  const reviewRows = Array.isArray(reviewBoard.rows) ? reviewBoard.rows : [];
  const inputAidBySectionId = new Map(inputAidRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
  const reviewBySectionId = new Map(reviewRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
  const blockers = [];
  const warnings = [];

  if (inputAid.summary?.inputAidVersion !== REQUIRED_OPERATOR_INPUT_AID_VERSION) {
    blockers.push(`INPUT_AID_VERSION_MISMATCH:${inputAid.summary?.inputAidVersion ?? 'missing'}`);
  }
  if (reviewBoard.summary?.reviewBoardVersion !== REQUIRED_REVIEW_BOARD_VERSION) {
    blockers.push(`REVIEW_BOARD_VERSION_MISMATCH:${reviewBoard.summary?.reviewBoardVersion ?? 'missing'}`);
  }
  if (operatorInput.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`TARGET_STAGE_MISMATCH:${operatorInput.targetStage ?? 'missing'}`);
  }
  if (inputRows.length !== EXPECTED_STAGE01_ROWS) {
    blockers.push(`OPERATOR_INPUT_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED_STAGE01_ROWS}`);
  }
  if (inputAidRows.length !== EXPECTED_STAGE01_ROWS) {
    blockers.push(`INPUT_AID_ROW_COUNT_MISMATCH:${inputAidRows.length}:${EXPECTED_STAGE01_ROWS}`);
  }
  if (reviewRows.length !== EXPECTED_STAGE01_ROWS) {
    blockers.push(`REVIEW_BOARD_ROW_COUNT_MISMATCH:${reviewRows.length}:${EXPECTED_STAGE01_ROWS}`);
  }
  if (inputAid.summary?.productionWriteAllowed !== false || reviewBoard.summary?.productionWriteAllowed !== false) {
    blockers.push('PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  }
  if (inputAid.summary?.sourceDataWritePerformed !== false || reviewBoard.summary?.sourceDataWritePerformed !== false) {
    blockers.push('SOURCE_DATA_WRITE_PERFORMED_NOT_FALSE');
  }
  if (reviewBoard.summary?.imageAnalysis?.candidateReferenceOnly !== true) {
    blockers.push('PIXEL_CANDIDATE_REFERENCE_ONLY_DISABLED');
  }
  if (!sameArray(priorityOrderFor(inputRows), EXPECTED_PRIORITY_ORDER)) {
    blockers.push('OPERATOR_INPUT_IMAGE_PRIORITY_CHANGED');
  }
  if (!sameArray(priorityOrderFor(inputAidRows), EXPECTED_PRIORITY_ORDER)) {
    blockers.push('INPUT_AID_IMAGE_PRIORITY_CHANGED');
  }
  if (!sameArray(reviewBoard.summary?.imageAnalysis?.priorityOrder ?? [], EXPECTED_PRIORITY_ORDER)) {
    blockers.push('REVIEW_BOARD_IMAGE_PRIORITY_CHANGED');
  }

  const rows = inputRows
    .map((inputRow) => {
      const sectionId = String(inputRow.sectionId ?? '').trim();
      const aidRow = inputAidBySectionId.get(sectionId) ?? {};
      const reviewRow = reviewBySectionId.get(sectionId) ?? {};
      const imageAnalysis = reviewRow.imageAnalysis ?? {};
      const operatorDecision = normalizeDecision(inputRow.operatorDecision);
      const rowStatus = normalizeStatus(aidRow.rowStatus ?? reviewRow.rowStatus ?? operatorDecision);
      const imageRiskReasons = Array.isArray(inputRow.imageRiskReasons)
        ? inputRow.imageRiskReasons
        : Array.isArray(imageAnalysis.riskReasons)
          ? imageAnalysis.riskReasons
          : [];
      const warningsForRow = [
        ...(Array.isArray(aidRow.warnings) ? aidRow.warnings : []),
        ...(Array.isArray(reviewRow.warnings) ? reviewRow.warnings : []),
      ];

      return {
        packetVersion: PACKET_VERSION,
        sectionId,
        sectionName: inputRow.sectionName ?? reviewRow.sectionName ?? '',
        batchId: inputRow.batchId ?? reviewRow.batchId ?? '',
        zoneId: inputRow.zoneId ?? reviewRow.zoneId ?? '',
        zoneLabel: inputRow.zoneLabel ?? reviewRow.zoneLabel ?? '',
        imagePriorityRank: Number(inputRow.imagePriorityRank ?? aidRow.imagePriorityRank ?? 999),
        imageRiskLevel: inputRow.imageRiskLevel ?? imageAnalysis.riskLevel ?? '',
        imageRiskReasons,
        imageCandidateStatus: inputRow.imageCandidateStatus ?? imageAnalysis.status ?? '',
        imageCandidateReferenceOnly: inputRow.imageCandidateReferenceOnly === true || imageAnalysis.candidateReferenceOnly === true,
        imageComponentArea: inputRow.imageComponentArea ?? imageAnalysis.componentArea ?? null,
        imagePathColorCoverageRatio: inputRow.imagePathColorCoverageRatio ?? imageAnalysis.pathColorCoverageRatio ?? null,
        imageBbox: inputRow.imageBbox ?? (
          imageAnalysis.bbox
            ? `${imageAnalysis.bbox.minX},${imageAnalysis.bbox.minY},${imageAnalysis.bbox.maxX},${imageAnalysis.bbox.maxY}`
            : ''
        ),
        operatorDecision,
        rowStatus,
        action: aidRow.action ?? reviewRow.action ?? '',
        actionCode: rowStatus === 'READY_FOR_PREWRITE'
          ? 'RUN_PREWRITE'
          : rowStatus === 'INVALID'
            ? 'FIX_OPERATOR_INPUT'
            : operatorDecision === 'PENDING'
              ? OPERATOR_ACTION_FILL_OR_DECIDE
              : 'NO_PATCH_PREVIEW',
        nextAction: aidRow.nextAction ?? reviewRow.nextAction ?? '',
        operatorAction: operatorActionFor({ ...inputRow, ...aidRow, operatorDecision, rowStatus, imageRiskReasons }),
        operatorFocus: operatorFocusFor({ ...inputRow, ...aidRow, operatorDecision, rowStatus, imageRiskReasons }),
        acceptance: acceptanceFor({ ...inputRow, ...aidRow, operatorDecision, rowStatus }),
        patchPreviewEligible: reviewRow.patchPreviewEligible === true,
        editableFieldsPresent: reviewRow.editableFieldsPresent === true,
        missingFields: aidRow.missingFields ?? reviewRow.missingFields ?? [],
        warnings: warningsForRow,
        currentHitPath: inputRow.currentHitPath ?? reviewRow.currentHitPath ?? '',
        currentLabelPoint: inputRow.currentLabelPoint ?? reviewRow.currentLabelPoint ?? [],
        correctedPath: inputRow.correctedPath ?? '',
        correctedLabelX: inputRow.correctedLabelX ?? '',
        correctedLabelY: inputRow.correctedLabelY ?? '',
        reviewer: inputRow.reviewer ?? '',
        reviewedAt: inputRow.reviewedAt ?? '',
        operatorNote: inputRow.operatorNote ?? '',
      };
    })
    .sort((left, right) => {
      const priority = left.imagePriorityRank - right.imagePriorityRank;
      if (priority !== 0) return priority;
      const risk = riskSortValue(left.imageRiskLevel) - riskSortValue(right.imageRiskLevel);
      if (risk !== 0) return risk;
      return left.sectionId.localeCompare(right.sectionId, 'ko');
    });

  rows
    .filter((row) => !DECISION_OPTIONS.has(row.operatorDecision))
    .forEach((row) => blockers.push(`INVALID_OPERATOR_DECISION:${row.sectionId}:${row.operatorDecision}`));
  rows
    .filter((row) => row.imageCandidateReferenceOnly !== true)
    .forEach((row) => blockers.push(`PIXEL_CANDIDATE_NOT_REFERENCE_ONLY:${row.sectionId}`));

  const statusCounts = rows.reduce((counts, row) => {
    counts[row.rowStatus] = (counts[row.rowStatus] ?? 0) + 1;
    return counts;
  }, {});
  const decisionCounts = rows.reduce((counts, row) => {
    counts[row.operatorDecision] = (counts[row.operatorDecision] ?? 0) + 1;
    return counts;
  }, {});
  const readyRows = rows.filter((row) => row.rowStatus === 'READY_FOR_PREWRITE');
  const invalidRows = rows.filter((row) => row.rowStatus === 'INVALID');
  const pendingRows = rows.filter((row) => row.operatorDecision === 'PENDING');
  const decidedRows = rows.filter((row) => row.operatorDecision !== 'PENDING');
  const nextOperatorRow = invalidRows[0] ?? readyRows[0] ?? pendingRows[0] ?? decidedRows[0] ?? null;

  if (readyRows.length > 0) {
    warnings.push('READY_FOR_PREWRITE_ROWS_PRESENT_RUN_PREWRITE_BEFORE_MANUAL_PATCH');
  }
  if (pendingRows.length === rows.length) {
    warnings.push('ALL_STAGE01_ROWS_PENDING_OPERATOR_DECISION');
  }

  const status = blockers.length > 0
    ? 'blocked'
    : invalidRows.length > 0
      ? 'operator-input-invalid'
      : readyRows.length > 0
        ? 'ready-for-prewrite'
        : pendingRows.length > 0
          ? 'waiting-for-operator'
          : 'decisions-recorded';

  const nextCommandOrder = [
    'npm run stadium:sajik:stage01-review-board',
    'npm run stadium:sajik:stage01-next-action-packet',
    'fill reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json from official PNG review',
    'npm run stadium:sajik:stage01-operator-input-aid',
    'npm run stadium:sajik:stage01-prewrite',
    'npm run stadium:sajik:stage01-apply-ready',
    'npm run stadium:sajik:stage01-manual-patch-plan',
    'npm run stadium:sajik:stage01-real-approval-readiness',
    'npm run qa:stadium:sajik:stage01-readiness',
  ];

  const summary = {
    packetVersion: PACKET_VERSION,
    status,
    targetStage: TARGET_STAGE_LABEL,
    totalRows: rows.length,
    expectedRows: EXPECTED_STAGE01_ROWS,
    pendingRows: pendingRows.length,
    decidedRows: decidedRows.length,
    readyForPrewriteRows: readyRows.length,
    invalidRows: invalidRows.length,
    highRiskRows: rows.filter((row) => row.imageRiskLevel === 'HIGH').length,
    mediumRiskRows: rows.filter((row) => row.imageRiskLevel === 'MEDIUM').length,
    lowRiskRows: rows.filter((row) => row.imageRiskLevel === 'LOW').length,
    nextOperatorSectionId: nextOperatorRow?.sectionId ?? null,
    nextOperatorImagePriorityRank: nextOperatorRow?.imagePriorityRank ?? null,
    nextOperatorAction: nextOperatorRow?.operatorAction ?? null,
    statusCounts,
    decisionCounts,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    operatorInput: relativePath(inputPath),
    operatorInputAid: relativePath(inputAidPath),
    reviewBoard: relativePath(reviewBoardPath),
    reviewBoardMarkdown: relativePath(path.join(stageDir, 'sajik-seatmap-stage01-review-board.md')),
    entrySheetCsv: relativePath(path.join(stageDir, 'sajik-seatmap-stage01-entry-sheet.csv')),
    reviewBoardSvg: relativePath(path.join(stageDir, 'sajik-seatmap-stage01-review-board.svg')),
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    sourcePolicy,
    nextCommandOrder,
    rows,
  };

  const csvRows = [
    [
      'imagePriorityRank',
      'sectionId',
      'rowStatus',
      'operatorDecision',
      'imageRiskLevel',
      'imageRiskReasons',
      'operatorAction',
      'actionCode',
      'operatorFocus',
      'acceptance',
      'imageBbox',
      'currentLabelPoint',
    ],
    ...rows.map((row) => [
      row.imagePriorityRank,
      row.sectionId,
      row.rowStatus,
      row.operatorDecision,
      row.imageRiskLevel,
      row.imageRiskReasons.join(' '),
      row.operatorAction,
      row.actionCode,
      row.operatorFocus,
      row.acceptance,
      row.imageBbox,
      Array.isArray(row.currentLabelPoint) ? row.currentLabelPoint.join(' ') : '',
    ]),
  ];

  const markdown = [
    '# Sajik Stage 01 Next Action Packet',
    '',
    `- packetVersion: \`${PACKET_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- nextOperatorSectionId: \`${summary.nextOperatorSectionId ?? '-'}\``,
    `- rows: \`${summary.totalRows}/${summary.expectedRows}\``,
    `- pendingRows: \`${summary.pendingRows}\``,
    `- readyForPrewriteRows: \`${summary.readyForPrewriteRows}\``,
    `- invalidRows: \`${summary.invalidRows}\``,
    `- productionWriteAllowed: \`${summary.productionWriteAllowed}\``,
    `- sourceDataWritePerformed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Source Policy',
    '',
    `- allowedCoordinateSource: \`${sourcePolicy.allowedCoordinateSource}\``,
    `- coordinateSystem: \`${sourcePolicy.coordinateSystem}\``,
    `- missingBaseballDataContract: \`${sourcePolicy.missingBaseballDataContract}\``,
    '- Pixel candidate paths are evidence only and must not be copied into `correctedPath` without operator approval.',
    '',
    '## Operator Inputs',
    '',
    `- operator input: \`${summary.operatorInput}\``,
    `- input aid: \`${summary.operatorInputAid}\``,
    `- review board: \`${summary.reviewBoardMarkdown}\``,
    `- entry sheet: \`${summary.entrySheetCsv}\``,
    `- review overlay: \`${summary.reviewBoardSvg}\``,
    '',
    '## Next Command Order',
    '',
    ...nextCommandOrder.map((command, index) => `${index + 1}. \`${command}\``),
    '',
    '## Rows',
    '',
    markdownTable(
      ['priority', 'section', 'status', 'decision', 'risk', 'action code', 'operator action', 'operator focus', 'acceptance'],
      rows.map((row) => [
        row.imagePriorityRank,
        row.sectionId,
        row.rowStatus,
        row.operatorDecision,
        `${row.imageRiskLevel} ${row.imageRiskReasons.join(' ')}`,
        row.actionCode,
        row.operatorAction,
        row.operatorFocus,
        row.acceptance,
      ]),
    ),
    '',
    '## Blockers',
    '',
    ...(blockers.length ? blockers.map((blocker) => `- \`${blocker}\``) : ['- none']),
    '',
    '## Warnings',
    '',
    ...(warnings.length ? warnings.map((warning) => `- \`${warning}\``) : ['- none']),
    '',
  ].join('\n');

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, csvRows);
  await fs.writeFile(`${markdownPath}.tmp`, markdown, 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(`stage01_next_action_packet_json:${relativePath(jsonPath)}`);
  console.log(`stage01_next_action_packet_csv:${relativePath(csvPath)}`);
  console.log(`stage01_next_action_packet_markdown:${relativePath(markdownPath)}`);
  console.log(
    `status:${summary.status} rows=${summary.totalRows} pending=${summary.pendingRows} ready=${summary.readyForPrewriteRows} invalid=${summary.invalidRows} next=${summary.nextOperatorSectionId ?? '-'}`,
  );

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runStage01OperatorInputAid = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { distanceToPolygon, pathBounds, pathToPoints, pointInPolygon, polygonArea, validateSeatMapPolygonPathIssues } = await import("../src/utils/seatMapPolygonValidator.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultStageDir = path.join(reportDir, 'sajik-stage01-operator');

  const INPUT_AID_VERSION = 'SAJIK_STAGE01_OPERATOR_INPUT_AID_V1';
  const REQUIRED_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const EXPECTED_STAGE01_ROWS = 16;
  const EXPECTED_STAGE01_SECTION_IDS = [
    '021',
    '022',
    '031',
    '032',
    '121',
    '122',
    '123',
    '124',
    '125',
    '131',
    '132',
    '133',
    '134',
    '135',
    '142',
    '143',
  ];
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT']);
  const REQUIRED_APPROVAL_FIELDS = [
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const IMAGE_WIDTH = 960;
  const IMAGE_HEIGHT = 640;
  const LABEL_NEAR_BOUNDARY_WARNING_PX = 1;
  const AREA_RATIO_WARNING_THRESHOLD = 1.5;
  const AREA_RATIO_BLOCK_THRESHOLD = 2.5;
  const BOUNDS_DELTA_WARNING_PX = 20;
  const BOUNDS_DELTA_BLOCK_PX = 80;
  const POINT_COUNT_WARNING_DELTA = 12;
  const POINT_COUNT_BLOCK_MAX = 64;

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

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const numberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const fieldMissing = (value) => value === '' || value === null || value === undefined;

  const sorted = (values) => [...values].sort();

  const normalizePath = (value) => String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  const roundDelta = (value) => Number(value.toFixed(2));

  const noteSuggestsPixelCandidateCopy = (value) => {
    const note = String(value ?? '').toLowerCase();
    if (!note.includes('pixel') || !note.includes('candidate')) return false;
    return /(copy|copied|paste|pasted|복사|붙여넣)/i.test(note);
  };

  const safePathStats = (pathData) => {
    const points = pathToPoints(normalizePath(pathData));
    if (points.length === 0) {
      return {
        pointCount: 0,
        area: 0,
        bounds: null,
        points,
      };
    }

    return {
      pointCount: points.length,
      area: roundDelta(polygonArea(points)),
      bounds: pathBounds(normalizePath(pathData)),
      points,
    };
  };

  const maxAbsBoundsDelta = (before, after) => {
    if (!before || !after) return null;
    return Math.max(
      Math.abs(after.minX - before.minX),
      Math.abs(after.minY - before.minY),
      Math.abs(after.maxX - before.maxX),
      Math.abs(after.maxY - before.maxY),
    );
  };

  const buildGeometryQualityReview = ({ row, correctedLabelX, correctedLabelY }) => {
    const correctedPath = normalizePath(row.correctedPath);
    if (!correctedPath) {
      return null;
    }

    const currentHitPath = normalizePath(row.currentHitPath);
    const currentVisualPath = normalizePath(row.currentVisualPath);
    const correctedStats = safePathStats(correctedPath);
    const currentHitStats = safePathStats(currentHitPath);
    const currentVisualStats = safePathStats(currentVisualPath);
    const labelPoint = correctedLabelX !== null && correctedLabelY !== null
      ? [correctedLabelX, correctedLabelY]
      : null;
    const areaRatioVsCurrentHit = currentHitStats.area > 0
      ? roundDelta(correctedStats.area / currentHitStats.area)
      : null;
    const areaRatioVsCurrentVisual = currentVisualStats.area > 0
      ? roundDelta(correctedStats.area / currentVisualStats.area)
      : null;
    const boundsMaxAbsDelta = maxAbsBoundsDelta(currentHitStats.bounds, correctedStats.bounds);
    const pointCountDelta = correctedStats.pointCount - currentHitStats.pointCount;
    const labelBoundaryDistance = labelPoint && correctedStats.points.length >= 3
      ? roundDelta(distanceToPolygon(labelPoint, correctedStats.points))
      : null;
    const labelInside = labelPoint && correctedStats.points.length >= 3
      ? pointInPolygon(labelPoint, correctedStats.points)
      : false;

    const reasons = [];
    const warnings = [];

    if (correctedPath === currentHitPath) {
      warnings.push('CORRECTED_PATH_REUSES_CURRENT_HIT_PATH');
    }
    if (currentVisualPath && correctedPath === currentVisualPath) {
      warnings.push('CORRECTED_PATH_REUSES_CURRENT_VISUAL_PATH');
    }
    if (correctedStats.pointCount > POINT_COUNT_BLOCK_MAX) {
      reasons.push('CORRECTED_POINT_COUNT_TOO_HIGH');
    } else if (Math.abs(pointCountDelta) > POINT_COUNT_WARNING_DELTA) {
      warnings.push('CORRECTED_POINT_COUNT_DELTA_REVIEW');
    }
    if (areaRatioVsCurrentHit !== null && areaRatioVsCurrentHit > AREA_RATIO_BLOCK_THRESHOLD) {
      reasons.push('CORRECTED_GEOMETRY_AREA_DELTA_TOO_LARGE');
    } else if (areaRatioVsCurrentHit !== null && areaRatioVsCurrentHit > AREA_RATIO_WARNING_THRESHOLD) {
      warnings.push('CORRECTED_GEOMETRY_AREA_DELTA_REVIEW');
    }
    if (boundsMaxAbsDelta !== null && boundsMaxAbsDelta > BOUNDS_DELTA_BLOCK_PX) {
      reasons.push('CORRECTED_GEOMETRY_BOUNDS_DELTA_TOO_LARGE');
    } else if (boundsMaxAbsDelta !== null && boundsMaxAbsDelta > BOUNDS_DELTA_WARNING_PX) {
      warnings.push('CORRECTED_GEOMETRY_BOUNDS_DELTA_REVIEW');
    }
    if (
      labelPoint
      && labelInside
      && labelBoundaryDistance !== null
      && labelBoundaryDistance <= LABEL_NEAR_BOUNDARY_WARNING_PX
    ) {
      warnings.push('CORRECTED_LABEL_NEAR_BOUNDARY');
    }

    return {
      reasons,
      warnings,
      review: {
        reusesCurrentHitPath: correctedPath === currentHitPath,
        reusesCurrentVisualPath: currentVisualPath ? correctedPath === currentVisualPath : false,
        correctedPointCount: correctedStats.pointCount,
        currentHitPointCount: currentHitStats.pointCount,
        pointCountDelta,
        correctedArea: correctedStats.area,
        currentHitArea: currentHitStats.area,
        areaRatioVsCurrentHit,
        areaRatioVsCurrentVisual,
        boundsMaxAbsDelta: boundsMaxAbsDelta === null ? null : roundDelta(boundsMaxAbsDelta),
        labelBoundaryDistance,
        labelNearBoundary: warnings.includes('CORRECTED_LABEL_NEAR_BOUNDARY'),
      },
    };
  };

  const nextActionFor = (rowStatus) => {
    if (rowStatus === 'READY_FOR_PREWRITE') {
      return 'Run npm run stadium:sajik:stage01-prewrite; only this READY_FOR_PREWRITE row may enter patch preview.';
    }
    if (rowStatus === 'INVALID') {
      return 'Fix the listed missing fields, invalid values, or path issues before running prewrite.';
    }
    if (rowStatus === 'REJECTED') {
      return 'No patch preview; keep the rejection note and leave this section out of Stage 01 source patching.';
    }
    if (rowStatus === 'NEEDS_RETRACE') {
      return 'No patch preview; retrace the section and update the corrected fields only after operator approval.';
    }
    if (rowStatus === 'KEEP_CURRENT') {
      return 'No patch preview; keep the current production geometry for this Stage 01 pass.';
    }
    return 'Fill correctedPath, correctedLabelX/Y, reviewer, reviewedAt, operatorNote and APPROVED, or choose REJECTED/NEEDS_RETRACE/KEEP_CURRENT with an operator note.';
  };

  const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
  const inputPath = path.resolve(
    frontendRoot,
    argValue('--input', path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json')),
  );
  const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input-aid.json');
  const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input-aid.csv');
  const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input-aid.md');

  const input = await readJson(inputPath);
  const rows = Array.isArray(input.corrections) ? input.corrections : [];
  const blockers = [];
  const warnings = [];

  if (input.packageVersion !== REQUIRED_PACKAGE_VERSION) {
    blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  }
  if (input.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`INPUT_STAGE_MISMATCH:${input.targetStage ?? ''}`);
  }
  if (rows.length !== EXPECTED_STAGE01_ROWS) {
    blockers.push(`STAGE01_INPUT_ROW_COUNT_MISMATCH:${rows.length}:${EXPECTED_STAGE01_ROWS}`);
  }

  const rowIds = sorted(rows.map((row) => String(row.sectionId ?? '').trim()));
  const expectedIds = sorted(EXPECTED_STAGE01_SECTION_IDS);
  if (rowIds.join(',') !== expectedIds.join(',')) {
    blockers.push(`STAGE01_INPUT_SECTION_IDS_MISMATCH:${rowIds.join(' ')}:${expectedIds.join(' ')}`);
  }

  const duplicateIds = rowIds.filter((sectionId, index, sectionIds) => sectionIds.indexOf(sectionId) !== index);
  if (duplicateIds.length > 0) {
    blockers.push(`DUPLICATE_STAGE01_SECTION_ID:${[...new Set(duplicateIds)].join(' ')}`);
  }

  const rowReports = rows.map((row) => {
    const sectionId = String(row.sectionId ?? '').trim();
    const decision = normalizeDecision(row.operatorDecision);
    const correctedLabelX = numberOrNull(row.correctedLabelX);
    const correctedLabelY = numberOrNull(row.correctedLabelY);
    const reasons = [];
    const rowWarnings = [];
    const missingFields = [];
    let geometryQualityReview = null;

    if (!DECISION_OPTIONS.has(decision)) {
      reasons.push(`INVALID_OPERATOR_DECISION:${decision}`);
    }
    if (row.sectionKind !== 'SEAT_SECTION') {
      reasons.push(`SECTION_KIND_NOT_WRITABLE:${row.sectionKind ?? ''}`);
    }
    if (row.mapInteractionStatus !== 'MAP_SELECTABLE') {
      reasons.push(`SECTION_NOT_MAP_SELECTABLE:${row.mapInteractionStatus ?? ''}`);
    }

    if (decision === 'APPROVED') {
      if (noteSuggestsPixelCandidateCopy(row.operatorNote)) {
        rowWarnings.push('OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW');
      }
      REQUIRED_APPROVAL_FIELDS.forEach((field) => {
        if (fieldMissing(row[field])) {
          missingFields.push(field);
          reasons.push(`APPROVAL_FIELD_REQUIRED:${field}`);
        }
      });
      if (!fieldMissing(row.correctedLabelX) && correctedLabelX === null) {
        reasons.push('APPROVAL_FIELD_INVALID_NUMBER:correctedLabelX');
      }
      if (!fieldMissing(row.correctedLabelY) && correctedLabelY === null) {
        reasons.push('APPROVAL_FIELD_INVALID_NUMBER:correctedLabelY');
      }
      if (row.reviewedAt && Number.isNaN(Date.parse(row.reviewedAt))) {
        reasons.push('REVIEWED_AT_INVALID_DATE');
      }
      if (!fieldMissing(row.correctedPath) && correctedLabelX !== null && correctedLabelY !== null) {
        const issues = validateSeatMapPolygonPathIssues({
          pathData: normalizePath(row.correctedPath),
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
          labelPoint: [correctedLabelX, correctedLabelY],
          labelTolerance: 1,
          sectionId,
          pathKind: 'correctedPath',
        });
        reasons.push(...issues.map((issue) => `CORRECTED_PATH_${issue.code}`));
        geometryQualityReview = buildGeometryQualityReview({ row, correctedLabelX, correctedLabelY });
        if (geometryQualityReview) {
          reasons.push(...geometryQualityReview.reasons);
          rowWarnings.push(...geometryQualityReview.warnings);
        }
      }
    }

    if ((decision === 'REJECTED' || decision === 'NEEDS_RETRACE' || decision === 'KEEP_CURRENT') && !String(row.operatorNote ?? '').trim()) {
      rowWarnings.push('DECISION_NOTE_RECOMMENDED');
    }
    if (decision === 'PENDING' && (
      String(row.correctedPath ?? '').trim()
      || !fieldMissing(row.correctedLabelX)
      || !fieldMissing(row.correctedLabelY)
      || String(row.reviewer ?? '').trim()
      || String(row.reviewedAt ?? '').trim()
    )) {
      rowWarnings.push('PENDING_ROW_HAS_EDITABLE_FIELDS');
    }

    const rowStatus = reasons.length > 0
      ? 'INVALID'
      : decision === 'APPROVED'
        ? 'READY_FOR_PREWRITE'
        : decision === 'REJECTED'
          ? 'REJECTED'
          : decision === 'NEEDS_RETRACE'
            ? 'NEEDS_RETRACE'
            : decision === 'KEEP_CURRENT'
              ? 'KEEP_CURRENT'
              : 'PENDING';

    const action = rowStatus === 'READY_FOR_PREWRITE'
      ? 'RUN_PREWRITE'
      : rowStatus === 'INVALID'
        ? 'FIX_OPERATOR_INPUT'
        : rowStatus === 'PENDING'
          ? 'FILL_OR_DECIDE'
          : 'NO_PATCH_PREVIEW';
    const nextAction = nextActionFor(rowStatus);

    return {
      sectionId,
      batchId: row.batchId ?? '',
      zoneId: row.zoneId ?? '',
      sectionName: row.sectionName ?? '',
      seatCategoryLabel: row.seatCategoryLabel ?? '',
      imagePriorityRank: row.imagePriorityRank ?? null,
      imageRiskLevel: row.imageRiskLevel ?? '',
      imageRiskReasons: Array.isArray(row.imageRiskReasons) ? row.imageRiskReasons : [],
      imageCandidateStatus: row.imageCandidateStatus ?? '',
      imageComponentArea: row.imageComponentArea ?? null,
      imagePathColorCoverageRatio: row.imagePathColorCoverageRatio ?? null,
      imageBbox: row.imageBbox ?? '',
      imageCandidateReferenceOnly: row.imageCandidateReferenceOnly === true,
      operatorDecision: decision,
      rowStatus,
      action,
      nextAction,
      missingFields,
      correctedPointCount: geometryQualityReview?.review.correctedPointCount
        ?? (String(row.correctedPath ?? '').trim() ? pathToPoints(String(row.correctedPath)).length : 0),
      currentHitPath: row.currentHitPath ?? '',
      currentLabelPoint: row.currentLabelPoint ?? [row.currentLabelX ?? null, row.currentLabelY ?? null],
      correctedPath: row.correctedPath ?? '',
      correctedLabelX,
      correctedLabelY,
      reviewer: String(row.reviewer ?? '').trim(),
      reviewedAt: String(row.reviewedAt ?? '').trim(),
      geometryQualityReview: geometryQualityReview?.review ?? null,
      reasons,
      warnings: rowWarnings,
    };
  });

  rowReports
    .filter((row) => row.rowStatus === 'INVALID')
    .forEach((row) => blockers.push(`INVALID_OPERATOR_INPUT_ROW:${row.sectionId}:${row.reasons.join('|')}`));

  rowReports
    .filter((row) => row.warnings.length > 0)
    .forEach((row) => warnings.push(`ROW_WARNING:${row.sectionId}:${row.warnings.join('|')}`));

  const approvedRows = rowReports.filter((row) => row.operatorDecision === 'APPROVED');
  const readyForPrewriteRows = rowReports.filter((row) => row.rowStatus === 'READY_FOR_PREWRITE');
  const pendingRows = rowReports.filter((row) => row.rowStatus === 'PENDING');
  const rejectedRows = rowReports.filter((row) => row.rowStatus === 'REJECTED');
  const needsRetraceRows = rowReports.filter((row) => row.rowStatus === 'NEEDS_RETRACE');
  const keepCurrentRows = rowReports.filter((row) => row.rowStatus === 'KEEP_CURRENT');
  const invalidRows = rowReports.filter((row) => row.rowStatus === 'INVALID');
  const decidedRows = rowReports.filter((row) => row.operatorDecision !== 'PENDING');

  if (approvedRows.length === 0) {
    warnings.push('NO_OPERATOR_APPROVED_STAGE01_ROWS');
  }

  const status = blockers.length > 0
    ? 'blocked'
    : readyForPrewriteRows.length > 0
      ? 'ready-for-prewrite'
      : decidedRows.length > 0
        ? 'decisions-recorded'
        : 'waiting-for-operator';

  const summary = {
    inputAidVersion: INPUT_AID_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    input: path.relative(frontendRoot, inputPath),
    targetStage: TARGET_STAGE_LABEL,
    totalRows: rowReports.length,
    expectedRows: EXPECTED_STAGE01_ROWS,
    approvedRows: approvedRows.length,
    readyForPrewriteRows: readyForPrewriteRows.length,
    pendingRows: pendingRows.length,
    rejectedRows: rejectedRows.length,
    needsRetraceRows: needsRetraceRows.length,
    keepCurrentRows: keepCurrentRows.length,
    invalidRows: invalidRows.length,
    decidedRows: decidedRows.length,
    decisionOptions: [...DECISION_OPTIONS],
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    safetyContract: [
      'This script is a read-only Stage 01 operator input aid; it never edits src/data/sajikSeatData.ts.',
      'It validates editable operator fields before prewrite so bad APPROVED rows are visible early.',
      'Image-analysis metadata is advisory only; operator-filled correctedPath/label fields are the only prewrite input source.',
      'Operator notes that indicate pixel candidate path copy/paste are flagged for human review.',
      'READY_FOR_PREWRITE rows may proceed to the Stage 01 prewrite gate.',
      'REJECTED and NEEDS_RETRACE rows are decision rows only and do not produce patch previews.',
      'KEEP_CURRENT rows explicitly keep the current production geometry and do not produce patch previews.',
      'External baseball data, web search, crawling, or third-party coordinate sources are not used.',
    ],
    rowStatusLegend: {
      PENDING: 'No operator decision yet.',
      READY_FOR_PREWRITE: 'APPROVED row has the required editable fields and basic path/label validation passed.',
      REJECTED: 'Operator rejected the candidate; no patch preview should be generated.',
      NEEDS_RETRACE: 'Operator requested retracing; no patch preview should be generated.',
      KEEP_CURRENT: 'Operator chose to keep the current production geometry for this Stage 01 pass.',
      INVALID: 'Operator input is malformed and must be fixed before prewrite.',
    },
    nextActionContract: {
      FILL_OR_DECIDE: 'PENDING rows require operator input before prewrite.',
      RUN_PREWRITE: 'Only READY_FOR_PREWRITE rows may enter the Stage 01 prewrite patch preview.',
      FIX_OPERATOR_INPUT: 'INVALID rows must be corrected before prewrite.',
      NO_PATCH_PREVIEW: 'REJECTED, NEEDS_RETRACE, and KEEP_CURRENT rows are decision rows only.',
    },
    rows: rowReports,
  };

  await fs.mkdir(stageDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'sectionId',
      'imagePriorityRank',
      'imageRiskLevel',
      'imageRiskReasons',
      'batchId',
      'zoneId',
      'operatorDecision',
      'rowStatus',
      'action',
      'nextAction',
      'missingFields',
      'correctedPointCount',
      'areaRatioVsCurrentHit',
      'boundsMaxAbsDelta',
      'labelBoundaryDistance',
      'reviewer',
      'reviewedAt',
      'reasons',
      'warnings',
    ],
    ...rowReports.map((row) => [
      row.sectionId,
      row.imagePriorityRank ?? '',
      row.imageRiskLevel,
      row.imageRiskReasons.join('; '),
      row.batchId,
      row.zoneId,
      row.operatorDecision,
      row.rowStatus,
      row.action,
      row.nextAction,
      row.missingFields.join('; '),
      row.correctedPointCount,
      row.geometryQualityReview?.areaRatioVsCurrentHit ?? '',
      row.geometryQualityReview?.boundsMaxAbsDelta ?? '',
      row.geometryQualityReview?.labelBoundaryDistance ?? '',
      row.reviewer,
      row.reviewedAt,
      row.reasons.join('; '),
      row.warnings.join('; '),
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Sajik Stage 01 Operator Input Aid',
    '',
    `- input aid version: \`${INPUT_AID_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- input: \`${summary.input}\``,
    `- rows: \`${summary.totalRows}/${summary.expectedRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- ready for prewrite rows: \`${summary.readyForPrewriteRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- rejected rows: \`${summary.rejectedRows}\``,
    `- needs retrace rows: \`${summary.needsRetraceRows}\``,
    `- keep current rows: \`${summary.keepCurrentRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Rows',
    '',
    markdownTable(
      ['rank', 'risk', 'section', 'batch', 'zone', 'decision', 'row status', 'action', 'next action', 'missing fields', 'points', 'area ratio', 'bounds max delta', 'label boundary', 'reasons', 'warnings'],
      rowReports.map((row) => [
        `\`${row.imagePriorityRank ?? '-'}\``,
        `\`${row.imageRiskLevel || '-'}\``,
        `\`${row.sectionId}\``,
        `\`${row.batchId}\``,
        `\`${row.zoneId}\``,
        `\`${row.operatorDecision}\``,
        `\`${row.rowStatus}\``,
        `\`${row.action}\``,
        row.nextAction,
        row.missingFields.join('; ') || '-',
        `\`${row.correctedPointCount}\``,
        row.geometryQualityReview?.areaRatioVsCurrentHit ?? '-',
        row.geometryQualityReview?.boundsMaxAbsDelta ?? '-',
        row.geometryQualityReview?.labelBoundaryDistance ?? '-',
        row.reasons.join('; ') || '-',
        row.warnings.join('; ') || '-',
      ]),
    ),
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No operator input blockers.',
    '',
    '## Warnings',
    '',
    warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`stage01_operator_input_aid_json:${path.relative(frontendRoot, jsonPath)}`);
  console.log(`stage01_operator_input_aid_csv:${path.relative(frontendRoot, csvPath)}`);
  console.log(`stage01_operator_input_aid_markdown:${path.relative(frontendRoot, markdownPath)}`);
  console.log(`status:${summary.status} ready=${summary.readyForPrewriteRows} approved=${summary.approvedRows} pending=${summary.pendingRows} rejected=${summary.rejectedRows} needsRetrace=${summary.needsRetraceRows} keepCurrent=${summary.keepCurrentRows} invalid=${summary.invalidRows} blockers=${summary.blockers.length}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01OperatorInputIntakeGateSmoke = async () => {
  const { spawnSync } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const SMOKE_VERSION = 'SAJIK_STAGE01_OPERATOR_INPUT_INTAKE_GATE_SMOKE_V1';
  const REQUIRED_INTAKE_VERSION = 'SAJIK_STAGE01_OPERATOR_INPUT_INTAKE_GATE_V1';
  const INTAKE_SCRIPT = 'scripts/sajik-seatmap-stage01.mjs';
  const EXPECTED_STAGE01_TARGET_SECTION_IDS = [
    '131',
    '032',
    '133',
    '143',
    '135',
    '134',
    '122',
    '123',
    '132',
    '031',
    '022',
    '142',
    '121',
    '124',
    '125',
    '021',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const stageDir = path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator');
  const targetDir = path.join(stageDir, 'targets');
  const reportPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input-intake-gate.json');
  const smokeRoot = path.join(stageDir, 'operator-input-intake-gate-smoke', `run-${Date.now()}-${process.pid}`);
  const smokeJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input-intake-gate-smoke.json');
  const smokeMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input-intake-gate-smoke.md');

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);
  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const copyJson = async (from, to) => {
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
  };

  const expect = (failures, condition, code) => {
    if (!condition) failures.push(code);
  };

  const runIntake = (label, fixtureStageDir) => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', INTAKE_SCRIPT, '--stage-dir', fixtureStageDir], {
      cwd: frontendRoot,
      encoding: 'utf8',
    });
    return {
      label,
      exitCode: result.status ?? 1,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      reportPath: path.join(fixtureStageDir, 'sajik-seatmap-stage01-operator-input-intake-gate.json'),
    };
  };

  const prepareFixture = async (name, mutateOperatorInput) => {
    const fixtureStageDir = path.join(smokeRoot, name);
    const fixtureTargetDir = path.join(fixtureStageDir, 'targets');
    await fs.mkdir(fixtureTargetDir, { recursive: true });
    await copyJson(
      path.join(stageDir, 'sajik-seatmap-stage01-all-target-review-packets.json'),
      path.join(fixtureStageDir, 'sajik-seatmap-stage01-all-target-review-packets.json'),
    );
    await copyJson(
      path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-input-guide.json'),
      path.join(fixtureStageDir, 'sajik-seatmap-stage01-all-target-approval-input-guide.json'),
    );
    for (const sectionId of EXPECTED_STAGE01_TARGET_SECTION_IDS) {
      await copyJson(
        path.join(targetDir, `${sectionId}-entry-template.json`),
        path.join(fixtureTargetDir, `${sectionId}-entry-template.json`),
      );
    }

    const operatorInput = await readJson(path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json'));
    mutateOperatorInput(operatorInput);
    await writeJson(path.join(fixtureStageDir, 'sajik-seatmap-stage01-operator-input.json'), operatorInput);
    return fixtureStageDir;
  };

  const failures = [];
  const defaultReport = await readJson(reportPath);
  const defaultSummary = defaultReport.summary ?? {};
  const defaultRows = Array.isArray(defaultReport.rows) ? defaultReport.rows : [];

  expect(failures, defaultSummary.operatorInputIntakeGateVersion === REQUIRED_INTAKE_VERSION, `INTAKE_VERSION_MISMATCH:${defaultSummary.operatorInputIntakeGateVersion ?? ''}`);
  expect(failures, defaultSummary.status === 'waiting-for-operator', `DEFAULT_STATUS_CHANGED:${defaultSummary.status ?? ''}`);
  expect(failures, defaultSummary.targetCount === EXPECTED_STAGE01_TARGET_SECTION_IDS.length, `DEFAULT_TARGET_COUNT_CHANGED:${defaultSummary.targetCount ?? ''}`);
  expect(failures, defaultRows.length === EXPECTED_STAGE01_TARGET_SECTION_IDS.length, `DEFAULT_ROW_COUNT_CHANGED:${defaultRows.length}`);
  expect(failures, defaultRows.map((row) => row.sectionId).join(',') === EXPECTED_STAGE01_TARGET_SECTION_IDS.join(','), 'DEFAULT_ROW_ORDER_CHANGED');
  expect(failures, defaultSummary.operatorInputRows === EXPECTED_STAGE01_TARGET_SECTION_IDS.length, `DEFAULT_OPERATOR_INPUT_ROWS_CHANGED:${defaultSummary.operatorInputRows ?? ''}`);
  expect(failures, defaultSummary.approvedRowCount === 0, `DEFAULT_APPROVED_COUNT_CHANGED:${defaultSummary.approvedRowCount ?? ''}`);
  expect(failures, defaultSummary.readyForPrewriteRows === 0, `DEFAULT_READY_FOR_PREWRITE_CHANGED:${defaultSummary.readyForPrewriteRows ?? ''}`);
  expect(failures, defaultSummary.waitingForOperatorRows === EXPECTED_STAGE01_TARGET_SECTION_IDS.length, `DEFAULT_WAITING_ROWS_CHANGED:${defaultSummary.waitingForOperatorRows ?? ''}`);
  expect(failures, defaultSummary.blockedRows === 0, `DEFAULT_BLOCKED_ROWS_CHANGED:${defaultSummary.blockedRows ?? ''}`);
  expect(failures, defaultSummary.sourceDataWritePerformed === false, 'DEFAULT_SOURCE_DATA_WRITE_PERFORMED_NOT_FALSE');
  expect(failures, defaultSummary.productionWriteAllowed === false, 'DEFAULT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  expect(failures, defaultSummary.writesOperatorInput === false, 'DEFAULT_WRITES_OPERATOR_INPUT_NOT_FALSE');
  expect(failures, defaultSummary.writesProductionData === false, 'DEFAULT_WRITES_PRODUCTION_DATA_NOT_FALSE');
  expect(failures, defaultSummary.officialPngOnly === true, 'DEFAULT_OFFICIAL_PNG_ONLY_NOT_TRUE');
  expect(failures, defaultSummary.operatorApprovedCoordinatesRequired === true, 'DEFAULT_OPERATOR_APPROVED_COORDINATES_REQUIRED_NOT_TRUE');

  for (const row of defaultRows) {
    expect(failures, row.intakeStatus === 'WAITING_FOR_OPERATOR', `DEFAULT_ROW_STATUS_CHANGED:${row.sectionId}:${row.intakeStatus ?? ''}`);
    expect(failures, row.selectedSource === 'none', `DEFAULT_ROW_SOURCE_CHANGED:${row.sectionId}:${row.selectedSource ?? ''}`);
    expect(failures, row.selectedDecision === 'PENDING', `DEFAULT_ROW_DECISION_CHANGED:${row.sectionId}:${row.selectedDecision ?? ''}`);
    expect(failures, row.readyForPrewrite === false, `DEFAULT_ROW_READY_FOR_PREWRITE:${row.sectionId}`);
    expect(failures, row.hasOperatorInputRow === true, `DEFAULT_ROW_OPERATOR_INPUT_MISSING:${row.sectionId}`);
    expect(failures, row.hasTargetEntryTemplate === true, `DEFAULT_ROW_TEMPLATE_MISSING:${row.sectionId}`);
    expect(failures, row.officialImageVerified === true, `DEFAULT_ROW_OFFICIAL_IMAGE_NOT_VERIFIED:${row.sectionId}`);
    expect(failures, row.candidateReferenceOnly === true, `DEFAULT_ROW_CANDIDATE_NOT_REFERENCE_ONLY:${row.sectionId}`);
    expect(failures, Array.isArray(row.blockers) && row.blockers.length === 0, `DEFAULT_ROW_BLOCKERS_PRESENT:${row.sectionId}`);
  }

  const validFixtureStageDir = await prepareFixture('approved-valid', (operatorInput) => {
    const row = operatorInput.corrections.find((entry) => entry.sectionId === '131');
    row.operatorDecision = 'APPROVED';
    row.correctedPath = row.currentHitPath;
    row.correctedLabelX = row.currentLabelX;
    row.correctedLabelY = row.currentLabelY;
    row.reviewer = 'intake-smoke';
    row.reviewedAt = '2026-05-17T00:00:00.000Z';
    row.operatorNote = 'Fixture approval from locked official PNG crop for intake gate smoke.';
  });
  const validRun = runIntake('approved-valid', validFixtureStageDir);
  const validReport = await readJson(validRun.reportPath);
  const validSummary = validReport.summary ?? {};
  const valid131 = validReport.rows.find((row) => row.sectionId === '131');

  expect(failures, validRun.exitCode === 0, `VALID_FIXTURE_EXIT_NONZERO:${validRun.exitCode}:${validRun.stderr}`);
  expect(failures, validSummary.status === 'ready-for-prewrite', `VALID_FIXTURE_STATUS_CHANGED:${validSummary.status ?? ''}`);
  expect(failures, validSummary.approvedRowCount === 1, `VALID_FIXTURE_APPROVED_COUNT_CHANGED:${validSummary.approvedRowCount ?? ''}`);
  expect(failures, validSummary.readyForPrewriteRows === 1, `VALID_FIXTURE_READY_COUNT_CHANGED:${validSummary.readyForPrewriteRows ?? ''}`);
  expect(failures, validSummary.blockedRows === 0, `VALID_FIXTURE_BLOCKED_ROWS_CHANGED:${validSummary.blockedRows ?? ''}`);
  expect(failures, valid131?.intakeStatus === 'READY_FOR_PREWRITE', `VALID_FIXTURE_131_STATUS_CHANGED:${valid131?.intakeStatus ?? ''}`);
  expect(failures, valid131?.selectedSource === 'operator-input', `VALID_FIXTURE_131_SOURCE_CHANGED:${valid131?.selectedSource ?? ''}`);
  expect(failures, valid131?.geometryReview?.imageCoordinateValidation?.correctedPathSelfIntersectionFree === true, 'VALID_FIXTURE_SELF_INTERSECTION_FLAG_NOT_TRUE');
  expect(failures, valid131?.sourceDataWritePerformed === false, 'VALID_FIXTURE_ROW_SOURCE_DATA_WRITE_PERFORMED_NOT_FALSE');

  const approvedPlaceholderFixtureStageDir = await prepareFixture('approved-placeholder', (operatorInput) => {
    const row = operatorInput.corrections.find((entry) => entry.sectionId === '131');
    row.operatorDecision = 'APPROVED';
    row.correctedPath = row.currentHitPath;
    row.correctedLabelX = row.currentLabelX;
    row.correctedLabelY = row.currentLabelY;
    row.reviewer = '<operator name>';
    row.reviewedAt = '2026-05-17T00:00:00.000Z';
    row.operatorNote = 'Fixture approval copied from current geometry draft with placeholder reviewer.';
  });
  const approvedPlaceholderRun = runIntake('approved-placeholder', approvedPlaceholderFixtureStageDir);
  const approvedPlaceholderReport = await readJson(approvedPlaceholderRun.reportPath);
  const approvedPlaceholderSummary = approvedPlaceholderReport.summary ?? {};
  const approvedPlaceholder131 = approvedPlaceholderReport.rows.find((row) => row.sectionId === '131');

  expect(failures, approvedPlaceholderRun.exitCode === 1, `APPROVED_PLACEHOLDER_EXIT_CHANGED:${approvedPlaceholderRun.exitCode}`);
  expect(failures, approvedPlaceholderSummary.status === 'blocked', `APPROVED_PLACEHOLDER_STATUS_CHANGED:${approvedPlaceholderSummary.status ?? ''}`);
  expect(failures, approvedPlaceholderSummary.blockedRows === 1, `APPROVED_PLACEHOLDER_BLOCKED_ROWS_CHANGED:${approvedPlaceholderSummary.blockedRows ?? ''}`);
  expect(
    failures,
    (approvedPlaceholder131?.blockers ?? []).includes('OPERATOR_PLACEHOLDER_NOT_REPLACED:reviewer'),
    `APPROVED_PLACEHOLDER_BLOCKER_MISSING:${(approvedPlaceholder131?.blockers ?? []).join('|')}`,
  );

  const keepCurrentFixtureStageDir = await prepareFixture('keep-current-valid', (operatorInput) => {
    const row = operatorInput.corrections.find((entry) => entry.sectionId === '131');
    row.operatorDecision = 'KEEP_CURRENT';
    row.correctedPath = '';
    row.correctedLabelX = '';
    row.correctedLabelY = '';
    row.reviewer = 'intake-smoke';
    row.reviewedAt = '2026-05-17T00:00:00.000Z';
    row.operatorNote = 'Fixture keep-current decision after official PNG review.';
  });
  const keepCurrentRun = runIntake('keep-current-valid', keepCurrentFixtureStageDir);
  const keepCurrentReport = await readJson(keepCurrentRun.reportPath);
  const keepCurrentSummary = keepCurrentReport.summary ?? {};
  const keepCurrent131 = keepCurrentReport.rows.find((row) => row.sectionId === '131');

  expect(failures, keepCurrentRun.exitCode === 0, `KEEP_CURRENT_FIXTURE_EXIT_NONZERO:${keepCurrentRun.exitCode}:${keepCurrentRun.stderr}`);
  expect(failures, keepCurrentSummary.status === 'waiting-for-operator', `KEEP_CURRENT_FIXTURE_STATUS_CHANGED:${keepCurrentSummary.status ?? ''}`);
  expect(failures, keepCurrentSummary.noPatchRows === 1, `KEEP_CURRENT_FIXTURE_NO_PATCH_COUNT_CHANGED:${keepCurrentSummary.noPatchRows ?? ''}`);
  expect(failures, keepCurrent131?.intakeStatus === 'NO_PATCH_PREVIEW', `KEEP_CURRENT_FIXTURE_131_STATUS_CHANGED:${keepCurrent131?.intakeStatus ?? ''}`);
  expect(failures, keepCurrent131?.readyForPrewrite === false, 'KEEP_CURRENT_FIXTURE_READY_FOR_PREWRITE_NOT_FALSE');
  expect(failures, Array.isArray(keepCurrent131?.blockers) && keepCurrent131.blockers.length === 0, `KEEP_CURRENT_FIXTURE_BLOCKERS_PRESENT:${(keepCurrent131?.blockers ?? []).join('|')}`);

  const keepCurrentPlaceholderFixtureStageDir = await prepareFixture('keep-current-placeholder', (operatorInput) => {
    const row = operatorInput.corrections.find((entry) => entry.sectionId === '131');
    row.operatorDecision = 'KEEP_CURRENT';
    row.correctedPath = '';
    row.correctedLabelX = '';
    row.correctedLabelY = '';
    row.reviewer = '<operator name>';
    row.reviewedAt = '<ISO timestamp>';
    row.operatorNote = 'Fixture keep-current copied from draft without replacing placeholders.';
  });
  const keepCurrentPlaceholderRun = runIntake('keep-current-placeholder', keepCurrentPlaceholderFixtureStageDir);
  const keepCurrentPlaceholderReport = await readJson(keepCurrentPlaceholderRun.reportPath);
  const keepCurrentPlaceholderSummary = keepCurrentPlaceholderReport.summary ?? {};
  const keepCurrentPlaceholder131 = keepCurrentPlaceholderReport.rows.find((row) => row.sectionId === '131');

  expect(failures, keepCurrentPlaceholderRun.exitCode === 1, `KEEP_CURRENT_PLACEHOLDER_EXIT_CHANGED:${keepCurrentPlaceholderRun.exitCode}`);
  expect(failures, keepCurrentPlaceholderSummary.status === 'blocked', `KEEP_CURRENT_PLACEHOLDER_STATUS_CHANGED:${keepCurrentPlaceholderSummary.status ?? ''}`);
  expect(
    failures,
    (keepCurrentPlaceholder131?.blockers ?? []).includes('OPERATOR_PLACEHOLDER_NOT_REPLACED:reviewer'),
    `KEEP_CURRENT_PLACEHOLDER_REVIEWER_BLOCKER_MISSING:${(keepCurrentPlaceholder131?.blockers ?? []).join('|')}`,
  );
  expect(
    failures,
    (keepCurrentPlaceholder131?.blockers ?? []).includes('OPERATOR_PLACEHOLDER_NOT_REPLACED:reviewedAt'),
    `KEEP_CURRENT_PLACEHOLDER_REVIEWED_AT_BLOCKER_MISSING:${(keepCurrentPlaceholder131?.blockers ?? []).join('|')}`,
  );

  const invalidFixtureStageDir = await prepareFixture('approved-invalid', (operatorInput) => {
    const row = operatorInput.corrections.find((entry) => entry.sectionId === '131');
    row.operatorDecision = 'APPROVED';
    row.correctedPath = 'M 680 480 L 700 500 L 680 500 L 700 480 Z';
    row.correctedLabelX = 690;
    row.correctedLabelY = 490;
    row.reviewer = 'intake-smoke';
    row.reviewedAt = '2026-05-17T00:00:00.000Z';
    row.operatorNote = 'Fixture invalid self-intersection for intake gate smoke.';
  });
  const invalidRun = runIntake('approved-invalid', invalidFixtureStageDir);
  const invalidReport = await readJson(invalidRun.reportPath);
  const invalidSummary = invalidReport.summary ?? {};
  const invalid131 = invalidReport.rows.find((row) => row.sectionId === '131');

  expect(failures, invalidRun.exitCode === 1, `INVALID_FIXTURE_EXIT_CHANGED:${invalidRun.exitCode}`);
  expect(failures, invalidSummary.status === 'blocked', `INVALID_FIXTURE_STATUS_CHANGED:${invalidSummary.status ?? ''}`);
  expect(failures, invalidSummary.approvedRowCount === 1, `INVALID_FIXTURE_APPROVED_COUNT_CHANGED:${invalidSummary.approvedRowCount ?? ''}`);
  expect(failures, invalidSummary.readyForPrewriteRows === 0, `INVALID_FIXTURE_READY_COUNT_CHANGED:${invalidSummary.readyForPrewriteRows ?? ''}`);
  expect(failures, invalidSummary.blockedRows === 1, `INVALID_FIXTURE_BLOCKED_ROWS_CHANGED:${invalidSummary.blockedRows ?? ''}`);
  expect(failures, invalid131?.intakeStatus === 'BLOCKED', `INVALID_FIXTURE_131_STATUS_CHANGED:${invalid131?.intakeStatus ?? ''}`);
  expect(
    failures,
    (invalid131?.blockers ?? []).includes('CORRECTED_PATH_SELF_INTERSECTION'),
    `INVALID_FIXTURE_SELF_INTERSECTION_BLOCKER_MISSING:${(invalid131?.blockers ?? []).join('|')}`,
  );

  const status = failures.length > 0 ? 'failed' : 'passed';
  const smoke = {
    smokeVersion: SMOKE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    report: relativePath(reportPath),
    targetCount: defaultRows.length,
    pendingCount: defaultSummary.waitingForOperatorRows ?? 0,
    approvedRowCount: defaultSummary.approvedRowCount ?? 0,
    readyForPrewriteRows: defaultSummary.readyForPrewriteRows ?? 0,
    blockedRows: defaultSummary.blockedRows ?? 0,
    fixtureRuns: [
      {
        label: validRun.label,
        exitCode: validRun.exitCode,
        status: validSummary.status,
        readyForPrewriteRows: validSummary.readyForPrewriteRows,
        blockedRows: validSummary.blockedRows,
      },
      {
        label: approvedPlaceholderRun.label,
        exitCode: approvedPlaceholderRun.exitCode,
        status: approvedPlaceholderSummary.status,
        readyForPrewriteRows: approvedPlaceholderSummary.readyForPrewriteRows,
        blockedRows: approvedPlaceholderSummary.blockedRows,
      },
      {
        label: keepCurrentRun.label,
        exitCode: keepCurrentRun.exitCode,
        status: keepCurrentSummary.status,
        readyForPrewriteRows: keepCurrentSummary.readyForPrewriteRows,
        blockedRows: keepCurrentSummary.blockedRows,
      },
      {
        label: keepCurrentPlaceholderRun.label,
        exitCode: keepCurrentPlaceholderRun.exitCode,
        status: keepCurrentPlaceholderSummary.status,
        readyForPrewriteRows: keepCurrentPlaceholderSummary.readyForPrewriteRows,
        blockedRows: keepCurrentPlaceholderSummary.blockedRows,
      },
      {
        label: invalidRun.label,
        exitCode: invalidRun.exitCode,
        status: invalidSummary.status,
        readyForPrewriteRows: invalidSummary.readyForPrewriteRows,
        blockedRows: invalidSummary.blockedRows,
      },
    ],
    sourceDataWritePerformed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    failures,
  };

  await writeJson(smokeJsonPath, smoke);

  const markdown = [
    '# Sajik Stage 01 Operator Input Intake Gate Smoke',
    '',
    `- smokeVersion: \`${SMOKE_VERSION}\``,
    `- status: \`${status}\``,
    `- report: \`${relativePath(reportPath)}\``,
    `- targets: \`${defaultRows.length}/${EXPECTED_STAGE01_TARGET_SECTION_IDS.length}\``,
    `- pendingCount: \`${smoke.pendingCount}\``,
    `- approvedRowCount: \`${smoke.approvedRowCount}\``,
    `- readyForPrewriteRows: \`${smoke.readyForPrewriteRows}\``,
    `- blockedRows: \`${smoke.blockedRows}\``,
    `- sourceDataWritePerformed: \`${smoke.sourceDataWritePerformed}\``,
    `- writesOperatorInput: \`${smoke.writesOperatorInput}\``,
    `- writesProductionData: \`${smoke.writesProductionData}\``,
    '',
    '## Fixture Runs',
    '',
    ...smoke.fixtureRuns.map((run) => `- \`${run.label}\`: exit=\`${run.exitCode}\`, status=\`${run.status}\`, ready=\`${run.readyForPrewriteRows}\`, blocked=\`${run.blockedRows}\``),
    '',
    '## Failures',
    '',
    ...(failures.length > 0 ? failures.map((failure) => `- \`${failure}\``) : ['- none']),
    '',
  ].join('\n');

  await fs.writeFile(`${smokeMarkdownPath}.tmp`, markdown, 'utf8');
  await fs.rename(`${smokeMarkdownPath}.tmp`, smokeMarkdownPath);

  console.log(`stage01_operator_input_intake_gate_smoke_json:${relativePath(smokeJsonPath)}`);
  console.log(`stage01_operator_input_intake_gate_smoke_markdown:${relativePath(smokeMarkdownPath)}`);
  console.log(
    `status:${status} targets=${defaultRows.length}/${EXPECTED_STAGE01_TARGET_SECTION_IDS.length} pending=${smoke.pendingCount} approved=${smoke.approvedRowCount} readyForPrewrite=${smoke.readyForPrewriteRows} blocked=${smoke.blockedRows} fixtureValid=${validSummary.status} fixtureInvalid=${invalidSummary.status} sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`,
  );

  if (status !== 'passed') {
    process.exitCode = 1;
  }
};

const runStage01OperatorInputIntakeGate = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { distanceToPolygon, pathBounds, pathToPoints, pointInPolygon, polygonArea, validateSeatMapPolygonPathIssues } = await import("../src/utils/seatMapPolygonValidator.ts");

  const INTAKE_VERSION = 'SAJIK_STAGE01_OPERATOR_INPUT_INTAKE_GATE_V1';
  const REQUIRED_OPERATOR_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
  const REQUIRED_ALL_TARGET_REVIEW_PACKETS_VERSION = 'SAJIK_STAGE01_ALL_TARGET_REVIEW_PACKETS_V1';
  const TARGET_REVIEW_EVIDENCE_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const STADIUM_ID = 'BUSAN_SAJIK';
  const MAP_VERSION = 'BUSAN_SAJIK_2026_MANUAL_POLYGON_V2';
  const VIEW_BOX = '0 0 960 640';
  const IMAGE_WIDTH = 960;
  const IMAGE_HEIGHT = 640;
  const OFFICIAL_IMAGE_SHA256 = 'e9cb51ccf57a754ddf066a95c6c789d65edf8dff167f432fd35fe809e9dc80aa';
  const TARGET_SOURCE_FILE = 'src/data/sajikSeatData.ts';
  const EXPECTED_STAGE01_TARGET_SECTION_IDS = [
    '131',
    '032',
    '135',
    '132',
    '031',
    '133',
    '022',
    '143',
    '134',
    '142',
    '121',
    '124',
    '125',
    '122',
    '021',
    '123',
  ];
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT']);
  const REQUIRED_APPROVAL_FIELDS = [
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const REQUIRED_KEEP_CURRENT_FIELDS = [
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const FORBIDDEN_KEEP_CURRENT_FIELDS = [
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
  ];
  const SOURCE_FINGERPRINT_FIELDS = [
    'sectionId',
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const WRITABLE_SOURCE_FIELDS = [
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.labelX',
    'imageGeometry.labelY',
  ];
  const LOCKED_SOURCE_FIELDS = [
    'imageGeometry.visualPath',
    'imageGeometry.geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
  ];
  const LABEL_NEAR_BOUNDARY_WARNING_PX = 1;
  const AREA_RATIO_WARNING_THRESHOLD = 1.5;
  const AREA_RATIO_BLOCK_THRESHOLD = 2.5;
  const BOUNDS_DELTA_WARNING_PX = 20;
  const BOUNDS_DELTA_BLOCK_PX = 80;
  const POINT_COUNT_WARNING_DELTA = 12;
  const POINT_COUNT_BLOCK_MAX = 64;

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const stageDir = path.resolve(
    frontendRoot,
    argValue('--stage-dir', path.join('reports/stadium/sajik-stage01-operator')),
  );
  const targetDir = path.join(stageDir, 'targets');
  const operatorInputPath = path.resolve(
    frontendRoot,
    argValue('--operator-input', path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json')),
  );
  const reviewPacketsPath = path.resolve(
    frontendRoot,
    argValue('--review-packets', path.join(stageDir, 'sajik-seatmap-stage01-all-target-review-packets.json')),
  );
  const inputGuidePath = path.resolve(
    frontendRoot,
    argValue('--input-guide', path.join(stageDir, 'sajik-seatmap-stage01-all-target-approval-input-guide.json')),
  );
  const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input-intake-gate.json');
  const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input-intake-gate.csv');
  const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input-intake-gate.md');

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);
  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));
  const readOptionalJson = async (filePath) => {
    try {
      return { exists: true, data: await readJson(filePath), error: null };
    } catch (error) {
      return {
        exists: error?.code !== 'ENOENT',
        data: null,
        error: error?.code === 'ENOENT'
          ? `MISSING_JSON:${relativePath(filePath)}`
          : `READ_JSON_FAILED:${relativePath(filePath)}:${error.message}`,
      };
    }
  };

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
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

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';
  const normalizePath = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const fieldMissing = (value) => value === '' || value === null || value === undefined;
  const rawEntryValue = (entry, field) => {
    if (field === 'correctedLabelX') return entry.correctedLabelXRaw;
    if (field === 'correctedLabelY') return entry.correctedLabelYRaw;
    return entry[field];
  };
  const fieldHasPlaceholder = (value) => /^<[^>]+>$/.test(String(value ?? '').trim());
  const placeholderBlockersFor = (entry, fields) => fields
    .filter((field) => fieldHasPlaceholder(rawEntryValue(entry, field)))
    .map((field) => `OPERATOR_PLACEHOLDER_NOT_REPLACED:${field}`);
  const numberOrNull = (value) => {
    if (fieldMissing(value)) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const round = (value, digits = 2) => {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
  };
  const templatePathFor = (sectionId) => path.join(targetDir, `${sectionId}-entry-template.json`);

  const safePathStats = (pathData) => {
    const normalizedPath = normalizePath(pathData);
    const points = pathToPoints(normalizedPath);
    if (points.length === 0) {
      return {
        pointCount: 0,
        area: 0,
        bounds: null,
        points,
      };
    }
    return {
      pointCount: points.length,
      area: round(polygonArea(points)),
      bounds: pathBounds(normalizedPath),
      points,
    };
  };

  const maxAbsBoundsDelta = (before, after) => {
    if (!before || !after) return null;
    return Math.max(
      Math.abs(after.minX - before.minX),
      Math.abs(after.minY - before.minY),
      Math.abs(after.maxX - before.maxX),
      Math.abs(after.maxY - before.maxY),
    );
  };

  const noteSuggestsPixelCandidateCopy = (value) => {
    const note = String(value ?? '').toLowerCase();
    if (!note.includes('pixel') || !note.includes('candidate')) return false;
    return /(copy|copied|paste|pasted|복사|붙여넣)/i.test(note);
  };

  const normalizeEntry = (row, source) => {
    const correctedLabelX = numberOrNull(row?.correctedLabelX);
    const correctedLabelY = numberOrNull(row?.correctedLabelY);
    return {
      source,
      sectionId: String(row?.sectionId ?? '').trim(),
      operatorDecision: normalizeDecision(row?.operatorDecision),
      correctedPath: normalizePath(row?.correctedPath),
      correctedLabelXRaw: row?.correctedLabelX,
      correctedLabelYRaw: row?.correctedLabelY,
      correctedLabelX,
      correctedLabelY,
      reviewer: String(row?.reviewer ?? '').trim(),
      reviewedAt: String(row?.reviewedAt ?? '').trim(),
      operatorNote: String(row?.operatorNote ?? '').trim(),
    };
  };

  const hasEditableApprovalValue = (entry) => entry.operatorDecision !== 'PENDING'
    || entry.correctedPath
    || !fieldMissing(entry.correctedLabelXRaw)
    || !fieldMissing(entry.correctedLabelYRaw)
    || entry.reviewer
    || entry.reviewedAt
    || entry.operatorNote;

  const hasPatchCoordinateValue = (entry) => entry.correctedPath
    || !fieldMissing(entry.correctedLabelXRaw)
    || !fieldMissing(entry.correctedLabelYRaw);

  const approvalFingerprint = (entry) => JSON.stringify({
    sectionId: entry.sectionId,
    operatorDecision: entry.operatorDecision,
    correctedPath: entry.correctedPath,
    correctedLabelX: entry.correctedLabelX,
    correctedLabelY: entry.correctedLabelY,
    reviewer: entry.reviewer,
    reviewedAt: entry.reviewedAt,
    operatorNote: entry.operatorNote,
  });

  const sourceComparisonEntry = (entry) => ({
    source: entry.source,
    sectionId: entry.sectionId,
    operatorDecision: entry.operatorDecision,
    hasEditableApprovalValue: hasEditableApprovalValue(entry),
    approvalFingerprint: approvalFingerprint(entry),
    correctedPointCount: entry.correctedPath ? pathToPoints(entry.correctedPath).length : 0,
    correctedLabelX: entry.correctedLabelX,
    correctedLabelY: entry.correctedLabelY,
    reviewer: entry.reviewer,
    reviewedAt: entry.reviewedAt,
  });

  const reviewGeometry = (entry, baseline, sectionId) => {
    const blockers = [];
    const warnings = [];
    let geometryReview = null;

    REQUIRED_APPROVAL_FIELDS.forEach((field) => {
      if (fieldMissing(entry[field])) {
        blockers.push(`APPROVAL_FIELD_REQUIRED:${field}`);
      }
    });
    blockers.push(...placeholderBlockersFor(entry, REQUIRED_APPROVAL_FIELDS));
    if (!fieldMissing(entry.correctedLabelXRaw) && entry.correctedLabelX === null) {
      blockers.push('APPROVAL_FIELD_INVALID_NUMBER:correctedLabelX');
    }
    if (!fieldMissing(entry.correctedLabelYRaw) && entry.correctedLabelY === null) {
      blockers.push('APPROVAL_FIELD_INVALID_NUMBER:correctedLabelY');
    }
    if (entry.reviewedAt && Number.isNaN(Date.parse(entry.reviewedAt))) {
      blockers.push('REVIEWED_AT_INVALID_DATE');
    }
    if (noteSuggestsPixelCandidateCopy(entry.operatorNote)) {
      blockers.push('OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW');
    }

    if (entry.correctedPath && entry.correctedLabelX !== null && entry.correctedLabelY !== null) {
      const labelPoint = [entry.correctedLabelX, entry.correctedLabelY];
      const issues = validateSeatMapPolygonPathIssues({
        pathData: entry.correctedPath,
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        labelPoint,
        labelTolerance: 1,
        sectionId,
        pathKind: 'correctedPath',
      });
      const issueCodes = issues.map((issue) => issue.code);
      blockers.push(...issues.map((issue) => `CORRECTED_PATH_${issue.code}`));

      const correctedStats = safePathStats(entry.correctedPath);
      const currentHitStats = safePathStats(baseline.currentHitPath);
      const currentVisualStats = safePathStats(baseline.currentVisualPath);
      const pointCountDelta = correctedStats.pointCount - currentHitStats.pointCount;
      const areaRatioVsCurrentHit = currentHitStats.area > 0
        ? round(correctedStats.area / currentHitStats.area)
        : null;
      const areaRatioVsCurrentVisual = currentVisualStats.area > 0
        ? round(correctedStats.area / currentVisualStats.area)
        : null;
      const boundsMaxAbsDelta = maxAbsBoundsDelta(currentHitStats.bounds, correctedStats.bounds);
      const labelInside = pointInPolygon(labelPoint, correctedStats.points);
      const labelBoundaryDistance = correctedStats.points.length >= 3
        ? round(distanceToPolygon(labelPoint, correctedStats.points))
        : null;

      if (entry.correctedPath === normalizePath(baseline.currentHitPath)) {
        warnings.push('CORRECTED_PATH_REUSES_CURRENT_HIT_PATH');
      }
      if (entry.correctedPath === normalizePath(baseline.currentVisualPath)) {
        warnings.push('CORRECTED_PATH_REUSES_CURRENT_VISUAL_PATH');
      }
      if (correctedStats.pointCount > POINT_COUNT_BLOCK_MAX) {
        blockers.push('CORRECTED_POINT_COUNT_TOO_HIGH');
      } else if (Math.abs(pointCountDelta) > POINT_COUNT_WARNING_DELTA) {
        warnings.push('CORRECTED_POINT_COUNT_DELTA_REVIEW');
      }
      if (areaRatioVsCurrentHit !== null && areaRatioVsCurrentHit > AREA_RATIO_BLOCK_THRESHOLD) {
        blockers.push('CORRECTED_GEOMETRY_AREA_DELTA_TOO_LARGE');
      } else if (areaRatioVsCurrentHit !== null && areaRatioVsCurrentHit > AREA_RATIO_WARNING_THRESHOLD) {
        warnings.push('CORRECTED_GEOMETRY_AREA_DELTA_REVIEW');
      }
      if (boundsMaxAbsDelta !== null && boundsMaxAbsDelta > BOUNDS_DELTA_BLOCK_PX) {
        blockers.push('CORRECTED_GEOMETRY_BOUNDS_DELTA_TOO_LARGE');
      } else if (boundsMaxAbsDelta !== null && boundsMaxAbsDelta > BOUNDS_DELTA_WARNING_PX) {
        warnings.push('CORRECTED_GEOMETRY_BOUNDS_DELTA_REVIEW');
      }
      if (labelInside && labelBoundaryDistance !== null && labelBoundaryDistance <= LABEL_NEAR_BOUNDARY_WARNING_PX) {
        warnings.push('CORRECTED_LABEL_NEAR_BOUNDARY');
      }

      geometryReview = {
        correctedPointCount: correctedStats.pointCount,
        currentHitPointCount: currentHitStats.pointCount,
        pointCountDelta,
        correctedArea: correctedStats.area,
        currentHitArea: currentHitStats.area,
        areaRatioVsCurrentHit,
        areaRatioVsCurrentVisual,
        correctedBounds: correctedStats.bounds,
        currentHitBounds: currentHitStats.bounds,
        boundsMaxAbsDelta: boundsMaxAbsDelta === null ? null : round(boundsMaxAbsDelta),
        labelPoint,
        labelInside,
        labelBoundaryDistance,
        validationIssueCodes: issueCodes,
        imageCoordinateValidation: {
          officialPngOnly: true,
          coordinateSystem: VIEW_BOX,
          correctedPathSingleClosed: !issueCodes.includes('SINGLE_CLOSED_MLZ_PATH_REQUIRED'),
          correctedPathWithinViewBox: !issueCodes.includes('POINT_OUT_OF_BOUNDS'),
          correctedPathSelfIntersectionFree: !issueCodes.includes('SELF_INTERSECTION'),
          labelWithinViewBox: !issueCodes.includes('LABEL_OUT_OF_BOUNDS'),
          labelInsideOrWithinTolerance: !issueCodes.includes('LABEL_OUTSIDE_POLYGON'),
        },
        reusesCurrentHitPath: entry.correctedPath === normalizePath(baseline.currentHitPath),
        reusesCurrentVisualPath: entry.correctedPath === normalizePath(baseline.currentVisualPath),
      };
    }

    return { blockers, warnings, geometryReview };
  };

  const sourcePolicy = {
    allowedCoordinateSource: 'operator-provided official 2026 Sajik PNG coordinates only',
    coordinateSystem: `SVG viewBox ${VIEW_BOX}`,
    noAutomaticSourceWrite: true,
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    disallowedSources: [
      'AI coordinate prediction',
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
  };

  const operatorInput = await readJson(operatorInputPath);
  const reviewPackets = await readJson(reviewPacketsPath);
  const inputGuide = await readOptionalJson(inputGuidePath);
  const inputRows = Array.isArray(operatorInput.corrections) ? operatorInput.corrections : [];
  const reviewRowsBySection = new Map((Array.isArray(reviewPackets.rows) ? reviewPackets.rows : [])
    .map((row) => [String(row.sectionId ?? '').trim(), row]));
  const inputGuideRowsBySection = new Map((Array.isArray(inputGuide.data?.rows) ? inputGuide.data.rows : [])
    .map((row) => [String(row.sectionId ?? '').trim(), row]));
  const inputRowsBySection = new Map();
  const duplicateSectionIds = [];

  for (const row of inputRows) {
    const sectionId = String(row.sectionId ?? '').trim();
    if (!sectionId) continue;
    if (inputRowsBySection.has(sectionId)) duplicateSectionIds.push(sectionId);
    inputRowsBySection.set(sectionId, row);
  }

  const globalBlockers = [];
  if (operatorInput.packageVersion !== REQUIRED_OPERATOR_PACKAGE_VERSION) {
    globalBlockers.push(`OPERATOR_INPUT_PACKAGE_VERSION_MISMATCH:${operatorInput.packageVersion ?? 'missing'}`);
  }
  if (operatorInput.stadiumId !== STADIUM_ID) {
    globalBlockers.push(`OPERATOR_INPUT_STADIUM_ID_MISMATCH:${operatorInput.stadiumId ?? 'missing'}`);
  }
  if (operatorInput.mapVersion !== MAP_VERSION) {
    globalBlockers.push(`OPERATOR_INPUT_MAP_VERSION_MISMATCH:${operatorInput.mapVersion ?? 'missing'}`);
  }
  if (operatorInput.viewBox !== VIEW_BOX) {
    globalBlockers.push(`OPERATOR_INPUT_VIEWBOX_MISMATCH:${operatorInput.viewBox ?? 'missing'}`);
  }
  if (operatorInput.targetStage !== TARGET_STAGE_LABEL) {
    globalBlockers.push(`OPERATOR_INPUT_STAGE_MISMATCH:${operatorInput.targetStage ?? 'missing'}`);
  }
  if (operatorInput.productionWriteAllowed !== false) {
    globalBlockers.push('OPERATOR_INPUT_PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  }
  if (reviewPackets.summary?.packetVersion !== REQUIRED_ALL_TARGET_REVIEW_PACKETS_VERSION) {
    globalBlockers.push(`REVIEW_PACKETS_VERSION_MISMATCH:${reviewPackets.summary?.packetVersion ?? 'missing'}`);
  }
  if (reviewPackets.summary?.officialImageSha256 !== OFFICIAL_IMAGE_SHA256) {
    globalBlockers.push(`REVIEW_PACKETS_OFFICIAL_IMAGE_SHA256_MISMATCH:${reviewPackets.summary?.officialImageSha256 ?? 'missing'}`);
  }
  if (reviewPackets.summary?.mapVersion !== MAP_VERSION) {
    globalBlockers.push(`REVIEW_PACKETS_MAP_VERSION_MISMATCH:${reviewPackets.summary?.mapVersion ?? 'missing'}`);
  }
  if (inputGuide.exists && inputGuide.data?.summary?.sourceDataWritePerformed !== false) {
    globalBlockers.push('INPUT_GUIDE_SOURCE_DATA_WRITE_FLAG_DRIFT');
  }
  duplicateSectionIds.forEach((sectionId) => {
    globalBlockers.push(`OPERATOR_INPUT_DUPLICATE_SECTION_ID:${sectionId}`);
  });

  const expectedSet = new Set(EXPECTED_STAGE01_TARGET_SECTION_IDS);
  const unexpectedInputSectionIds = [...inputRowsBySection.keys()].filter((sectionId) => !expectedSet.has(sectionId));
  unexpectedInputSectionIds.forEach((sectionId) => {
    globalBlockers.push(`OPERATOR_INPUT_UNEXPECTED_SECTION_ID:${sectionId}`);
  });

  const rows = [];
  for (const sectionId of EXPECTED_STAGE01_TARGET_SECTION_IDS) {
    const inputRow = inputRowsBySection.get(sectionId);
    const templatePath = templatePathFor(sectionId);
    const templateResult = await readOptionalJson(templatePath);
    const targetEntry = templateResult.data;
    const reviewRow = reviewRowsBySection.get(sectionId);
    const inputGuideRow = inputGuideRowsBySection.get(sectionId);
    const rowBlockers = [];
    const rowWarnings = [];

    if (!inputRow) rowBlockers.push('OPERATOR_INPUT_SECTION_MISSING');
    if (!targetEntry) rowBlockers.push('TARGET_ENTRY_TEMPLATE_MISSING');
    if (templateResult.error && templateResult.exists) rowBlockers.push(templateResult.error);
    if (!reviewRow) rowBlockers.push('TARGET_REVIEW_PACKET_ROW_MISSING');
    if (reviewRow?.officialImageVerified !== true) rowBlockers.push('TARGET_REVIEW_OFFICIAL_IMAGE_NOT_VERIFIED');
    if (reviewRow?.officialImageSha256 && reviewRow.officialImageSha256 !== OFFICIAL_IMAGE_SHA256) {
      rowBlockers.push(`TARGET_REVIEW_OFFICIAL_IMAGE_SHA256_MISMATCH:${reviewRow.officialImageSha256}`);
    }
    if (reviewRow?.mapVersion && reviewRow.mapVersion !== MAP_VERSION) {
      rowBlockers.push(`TARGET_REVIEW_MAP_VERSION_MISMATCH:${reviewRow.mapVersion}`);
    }

    const sourceEntries = [
      normalizeEntry(inputRow, 'operator-input'),
      normalizeEntry(targetEntry, 'target-entry-template'),
    ];
    const meaningfulEntries = sourceEntries.filter(hasEditableApprovalValue);
    const selectedSourceConflicts = [];
    let selectedEntry = null;
    let selectedSource = 'none';

    if (meaningfulEntries.length === 1) {
      [selectedEntry] = meaningfulEntries;
      selectedSource = selectedEntry.source;
    } else if (meaningfulEntries.length > 1) {
      const [firstEntry, ...otherEntries] = meaningfulEntries;
      const firstFingerprint = approvalFingerprint(firstEntry);
      const mismatchedEntry = otherEntries.find((entry) => approvalFingerprint(entry) !== firstFingerprint);
      if (mismatchedEntry) {
        selectedSourceConflicts.push(...meaningfulEntries.map((entry) => entry.source));
        rowBlockers.push(`OPERATOR_INPUT_SOURCE_CONFLICT:${selectedSourceConflicts.join(':')}`);
      } else {
        selectedEntry = firstEntry;
        selectedSource = 'matched-sources';
      }
    }

    const selectedDecision = selectedEntry?.operatorDecision ?? 'PENDING';
    let geometryReview = null;
    if (selectedEntry) {
      if (selectedEntry.sectionId !== sectionId) {
        rowBlockers.push(`SELECTED_ENTRY_SECTION_MISMATCH:${selectedEntry.sectionId}:${sectionId}`);
      }
      if (!DECISION_OPTIONS.has(selectedDecision)) {
        rowBlockers.push(`INVALID_OPERATOR_DECISION:${selectedDecision}`);
      }
      if (selectedDecision === 'APPROVED') {
        const geometryResult = reviewGeometry(selectedEntry, {
          currentHitPath: inputRow?.currentHitPath ?? reviewRow?.currentHitPath,
          currentVisualPath: inputRow?.currentVisualPath ?? reviewRow?.currentVisualPath,
        }, sectionId);
        rowBlockers.push(...geometryResult.blockers);
        rowWarnings.push(...geometryResult.warnings);
        geometryReview = geometryResult.geometryReview;
      } else if (selectedDecision === 'KEEP_CURRENT') {
        REQUIRED_KEEP_CURRENT_FIELDS.forEach((field) => {
          if (fieldMissing(selectedEntry[field])) {
            rowBlockers.push(`KEEP_CURRENT_FIELD_REQUIRED:${field}`);
          }
        });
        rowBlockers.push(...placeholderBlockersFor(selectedEntry, REQUIRED_KEEP_CURRENT_FIELDS));
        if (selectedEntry.reviewedAt && Number.isNaN(Date.parse(selectedEntry.reviewedAt))) {
          rowBlockers.push('KEEP_CURRENT_REVIEWED_AT_INVALID_DATE');
        }
        if (hasPatchCoordinateValue(selectedEntry)) {
          rowBlockers.push('KEEP_CURRENT_ROW_HAS_COORDINATE_FIELDS');
        }
      } else {
        if (selectedDecision === 'PENDING') {
          rowBlockers.push('PENDING_ROW_HAS_EDITABLE_FIELDS');
        }
        if (hasPatchCoordinateValue(selectedEntry)) {
          rowBlockers.push(`NON_APPROVED_ROW_HAS_COORDINATE_FIELDS:${selectedDecision}`);
        }
        if (['REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT'].includes(selectedDecision) && !selectedEntry.operatorNote) {
          rowWarnings.push('DECISION_NOTE_RECOMMENDED');
        }
        rowBlockers.push(...placeholderBlockersFor(selectedEntry, SOURCE_FINGERPRINT_FIELDS));
      }
    }

    const readyForPrewrite = selectedDecision === 'APPROVED'
      && selectedEntry !== null
      && rowBlockers.length === 0;
    const rowStatus = rowBlockers.length > 0
      ? 'BLOCKED'
      : readyForPrewrite
        ? 'READY_FOR_PREWRITE'
        : selectedDecision === 'PENDING'
          ? 'WAITING_FOR_OPERATOR'
          : 'NO_PATCH_PREVIEW';
    const nextAction = rowStatus === 'READY_FOR_PREWRITE'
      ? 'RUN_PREWRITE'
      : rowStatus === 'BLOCKED'
        ? 'RESOLVE_OPERATOR_INPUT_BLOCKERS'
        : selectedDecision === 'PENDING'
          ? 'FILL_OR_DECIDE_FROM_OFFICIAL_PNG'
          : 'NO_PATCH_PREVIEW_FOR_OPERATOR_DECISION';

    rows.push({
      sectionId,
      intakeStatus: rowStatus,
      selectedSource,
      selectedDecision,
      readyForPrewrite,
      approved: selectedDecision === 'APPROVED',
      hasOperatorInputRow: Boolean(inputRow),
      hasTargetEntryTemplate: Boolean(targetEntry),
      targetEntryTemplate: relativePath(templatePath),
      targetReviewPacket: reviewRow?.targetReviewPacket ?? `reports/stadium/sajik-stage01-operator/targets/${sectionId}-review-packet.json`,
      inputGuideStatus: inputGuideRow?.inputStatus ?? 'missing',
      imageRiskLevel: reviewRow?.imageRiskLevel ?? inputRow?.imageRiskLevel ?? 'UNKNOWN',
      imagePriorityRank: reviewRow?.imagePriorityRank ?? inputRow?.imagePriorityRank ?? null,
      officialImageVerified: reviewRow?.officialImageVerified === true,
      candidateReferenceOnly: reviewRow?.candidateReferenceOnly === true || inputRow?.imageCandidateReferenceOnly === true,
      missingApprovedFields: selectedDecision === 'APPROVED' && selectedEntry
        ? REQUIRED_APPROVAL_FIELDS.filter((field) => fieldMissing(selectedEntry[field]))
        : [],
      selectedSourceConflicts,
      geometryReview,
      sourceComparison: sourceEntries.map(sourceComparisonEntry),
      writableSourceFields: WRITABLE_SOURCE_FIELDS,
      lockedSourceFields: LOCKED_SOURCE_FIELDS,
      sourceDataWritePerformed: false,
      writesOperatorInput: false,
      writesProductionData: false,
      nextAction,
      blockers: rowBlockers,
      warnings: rowWarnings,
    });
  }

  const blockedRows = rows.filter((row) => row.intakeStatus === 'BLOCKED');
  const readyForPrewriteRows = rows.filter((row) => row.readyForPrewrite);
  const waitingForOperatorRows = rows.filter((row) => row.intakeStatus === 'WAITING_FOR_OPERATOR');
  const noPatchRows = rows.filter((row) => row.intakeStatus === 'NO_PATCH_PREVIEW');
  const approvedRows = rows.filter((row) => row.selectedDecision === 'APPROVED');
  const missingOperatorInputRows = rows.filter((row) => !row.hasOperatorInputRow);
  const missingTemplateRows = rows.filter((row) => !row.hasTargetEntryTemplate);
  const rowBlockers = rows.flatMap((row) => row.blockers.map((blocker) => `OPERATOR_INPUT_INTAKE_ROW_BLOCKED:${row.sectionId}:${blocker}`));
  const blockers = [...globalBlockers, ...rowBlockers];
  const status = blockers.length > 0
    ? 'blocked'
    : readyForPrewriteRows.length > 0
      ? 'ready-for-prewrite'
      : 'waiting-for-operator';

  const summary = {
    operatorInputIntakeGateVersion: INTAKE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    targetStage: TARGET_STAGE_LABEL,
    expectedTargetCount: EXPECTED_STAGE01_TARGET_SECTION_IDS.length,
    targetCount: rows.length,
    targetSectionIds: rows.map((row) => row.sectionId),
    operatorInputRows: inputRows.length,
    approvedRowCount: approvedRows.length,
    readyForPrewriteRows: readyForPrewriteRows.length,
    waitingForOperatorRows: waitingForOperatorRows.length,
    noPatchRows: noPatchRows.length,
    blockedRows: blockedRows.length,
    missingOperatorInputRows: missingOperatorInputRows.length,
    missingTemplateRows: missingTemplateRows.length,
    unexpectedInputSectionIds,
    duplicateSectionIds,
    sourceDataWritePerformed: false,
    productionWriteAllowed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    officialPngOnly: true,
    operatorApprovedCoordinatesRequired: true,
    keepCurrentReviewRequiredFields: REQUIRED_KEEP_CURRENT_FIELDS,
    keepCurrentForbiddenFields: FORBIDDEN_KEEP_CURRENT_FIELDS,
    targetSourceFile: TARGET_SOURCE_FILE,
    writableSourceFields: WRITABLE_SOURCE_FIELDS,
    lockedSourceFields: LOCKED_SOURCE_FIELDS,
    blockers,
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    sourceReports: {
      operatorInput: relativePath(operatorInputPath),
      allTargetReviewPackets: relativePath(reviewPacketsPath),
      allTargetApprovalInputGuide: inputGuide.exists ? relativePath(inputGuidePath) : '',
    },
    sourcePolicy,
    intakeContract: {
      statusMatrix: {
        PENDING: 'waiting-for-operator',
        APPROVED_VALID: 'ready-for-prewrite',
        APPROVED_INVALID: 'blocked',
        REJECTED: 'no-patch-preview',
        NEEDS_RETRACE: 'no-patch-preview',
        KEEP_CURRENT: 'no-patch-preview',
      },
      approvedRequiredFields: ['operatorDecision=APPROVED', ...REQUIRED_APPROVAL_FIELDS],
      sourceFingerprintFields: SOURCE_FINGERPRINT_FIELDS,
      exactMatchRequiredWhenMultipleSourcesHaveEditableValues: true,
      productionWriteAllowed: false,
      writesOperatorInput: false,
      writesProductionData: false,
    },
    rows,
  };

  await writeJson(jsonPath, report);
  await writeCsv(csvPath, [
    [
      'sectionId',
      'intakeStatus',
      'selectedSource',
      'selectedDecision',
      'readyForPrewrite',
      'imageRiskLevel',
      'imagePriorityRank',
      'missingApprovedFields',
      'blockers',
      'warnings',
    ],
    ...rows.map((row) => [
      row.sectionId,
      row.intakeStatus,
      row.selectedSource,
      row.selectedDecision,
      row.readyForPrewrite,
      row.imageRiskLevel,
      row.imagePriorityRank,
      row.missingApprovedFields.join('|'),
      row.blockers.join('|'),
      row.warnings.join('|'),
    ]),
  ]);

  const markdown = [
    '# Sajik Stage 01 Operator Input Intake Gate',
    '',
    `- version: \`${INTAKE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- targets: \`${summary.targetCount}/${summary.expectedTargetCount}\``,
    `- approvedRowCount: \`${summary.approvedRowCount}\``,
    `- readyForPrewriteRows: \`${summary.readyForPrewriteRows}\``,
    `- waitingForOperatorRows: \`${summary.waitingForOperatorRows}\``,
    `- noPatchRows: \`${summary.noPatchRows}\``,
    `- blockedRows: \`${summary.blockedRows}\``,
    `- sourceDataWritePerformed: \`${summary.sourceDataWritePerformed}\``,
    `- writesOperatorInput: \`${summary.writesOperatorInput}\``,
    `- writesProductionData: \`${summary.writesProductionData}\``,
    '',
    '## Source Policy',
    '',
    `- allowedCoordinateSource: \`${sourcePolicy.allowedCoordinateSource}\``,
    `- coordinateSystem: \`${sourcePolicy.coordinateSystem}\``,
    `- missingBaseballDataContract: \`${sourcePolicy.missingBaseballDataContract}\``,
    '- No coordinates are predicted, crawled, or copied from browser CSS pixels.',
    '',
    '## Intake Rows',
    '',
    markdownTable(
      ['section', 'status', 'source', 'decision', 'ready', 'risk', 'rank', 'next action', 'blockers', 'warnings'],
      rows.map((row) => [
        `\`${row.sectionId}\``,
        `\`${row.intakeStatus}\``,
        `\`${row.selectedSource}\``,
        `\`${row.selectedDecision}\``,
        `\`${row.readyForPrewrite}\``,
        `\`${row.imageRiskLevel}\``,
        `\`${row.imagePriorityRank ?? '-'}\``,
        `\`${row.nextAction}\``,
        row.blockers.length > 0 ? row.blockers.map((blocker) => `\`${blocker}\``).join('<br>') : 'none',
        row.warnings.length > 0 ? row.warnings.map((warning) => `\`${warning}\``).join('<br>') : 'none',
      ]),
    ),
    '',
    '## Outputs',
    '',
    `- \`${relativePath(jsonPath)}\``,
    `- \`${relativePath(csvPath)}\``,
    `- \`${relativePath(markdownPath)}\``,
    '',
    '## Blockers',
    '',
    ...(blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``) : ['- none']),
    '',
  ].join('\n');

  await fs.writeFile(`${markdownPath}.tmp`, markdown, 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(`stage01_operator_input_intake_gate_json:${relativePath(jsonPath)}`);
  console.log(`stage01_operator_input_intake_gate_csv:${relativePath(csvPath)}`);
  console.log(`stage01_operator_input_intake_gate_markdown:${relativePath(markdownPath)}`);
  console.log(
    `status:${summary.status} targets=${summary.targetCount}/${summary.expectedTargetCount} approved=${summary.approvedRowCount} readyForPrewrite=${summary.readyForPrewriteRows} waiting=${summary.waitingForOperatorRows} blocked=${summary.blockedRows} sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`,
  );

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01OperatorPackage = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultStageDir = path.join(defaultReportDir, 'sajik-stage01-operator');

  const PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
  const REQUIRED_WORKSET_VERSION = 'SAJIK_ZONE_PRECISION_WORKSETS_V1';
  const REQUIRED_PIXEL_TOTAL_BLOCKS = 89;
  const REQUIRED_PIXEL_READY_BLOCKS = 89;
  const REQUIRED_PIXEL_NO_SEED_BLOCKS = 0;
  const TARGET_STAGE_IDS = ['P0-A', 'P0-B', 'P0-C'];
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const EXPECTED_STAGE01_ROWS = 16;
  const EXPECTED_STAGE01_SECTION_IDS = [
    '021',
    '022',
    '031',
    '032',
    '121',
    '122',
    '123',
    '124',
    '125',
    '131',
    '132',
    '133',
    '134',
    '135',
    '142',
    '143',
  ];
  const EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER = [
    '131',
    '032',
    '135',
    '132',
    '031',
    '133',
    '022',
    '143',
    '134',
    '142',
    '121',
    '124',
    '125',
    '122',
    '021',
    '123',
  ];
  const EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER_TEXT = '131 -> 032 -> 135 -> 132 -> 031 -> 133 -> 022 -> 143 -> 134 -> 142 -> 121 -> 124 -> 125 -> 122 -> 021 -> 123';
  const REQUIRED_APPROVAL_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const DECISION_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT'];
  const IMAGE_ANALYSIS_MIN_COVERAGE_HIGH_RISK = 0.86;
  const IMAGE_ANALYSIS_MIN_COVERAGE_MEDIUM_RISK = 0.9;
  const IMAGE_ANALYSIS_SMALL_COMPONENT_AREA = 80;
  const IMAGE_ANALYSIS_MEDIUM_COMPONENT_AREA = 250;
  const IMAGE_ANALYSIS_OUTSIDE_DISTANCE_HIGH_RISK = 1.5;

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

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

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

  const editableFieldsFrom = (row) => ({
    operatorDecision: normalizeDecision(row?.operatorDecision),
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

  const sorted = (values) => [...values].sort();

  const roundMetric = (value, digits = 3) => {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
  };

  const formatPoint = (value) => (Array.isArray(value) ? value.join(' ') : '');

  const formatBbox = (value) => {
    if (!value || typeof value !== 'object') return '';
    return `${value.minX},${value.minY},${value.maxX},${value.maxY}`;
  };

  const formatCenter = (value) => {
    if (!value || typeof value !== 'object') return '';
    return `${value.x},${value.y}`;
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
  const worksetPath = path.resolve(
    frontendRoot,
    argValue('--worksets', path.join('reports/stadium', 'sajik-seatmap-zone-precision-worksets.json')),
  );
  const pixelComponentsPath = path.resolve(
    frontendRoot,
    argValue('--pixel-components', path.join(reportDir, 'sajik-seatmap-pixel-components.json')),
  );
  const operatorInputJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json');
  const operatorInputCsvPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input.csv');
  const checklistMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-checklist.md');
  const checklistCsvPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-checklist.csv');
  const packageJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-package.json');
  const packageMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-package.md');
  const packageSvgPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-package.svg');

  const worksets = await readJson(worksetPath);
  const pixelComponents = await readJson(pixelComponentsPath);
  const pixelRows = Array.isArray(pixelComponents.blocks) ? pixelComponents.blocks : [];
  const pixelBySectionId = new Map(pixelRows.map((row) => [String(row.block ?? row.sectionId ?? '').trim(), row]));
  const existingOperatorInput = await readOptionalJson(operatorInputJsonPath);
  const existingRows = Array.isArray(existingOperatorInput?.corrections) ? existingOperatorInput.corrections : [];
  const existingBySectionId = new Map(existingRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
  const expectedSectionIdSet = new Set(EXPECTED_STAGE01_SECTION_IDS);
  const existingEditableRows = existingRows
    .map((row) => ({
      sectionId: String(row.sectionId ?? '').trim(),
      row,
    }))
    .filter(({ row }) => hasOperatorFilledEditableFields(row));
  const existingEditableStageRows = existingEditableRows
    .filter(({ sectionId }) => expectedSectionIdSet.has(sectionId));
  const ignoredExistingEditableRows = existingEditableRows
    .filter(({ sectionId }) => !expectedSectionIdSet.has(sectionId));
  const duplicateExistingEditableSectionIds = sorted(
    existingEditableRows
      .map(({ sectionId }) => sectionId)
      .filter((sectionId, index, sectionIds) => sectionIds.indexOf(sectionId) !== index),
  );

  const stageRows = (worksets.candidateRows ?? [])
    .filter((row) => TARGET_STAGE_IDS.includes(row.batchId))
    .sort((left, right) => {
      const leftStage = TARGET_STAGE_IDS.indexOf(left.batchId);
      const rightStage = TARGET_STAGE_IDS.indexOf(right.batchId);
      if (leftStage !== rightStage) return leftStage - rightStage;
      return String(left.sectionId).localeCompare(String(right.sectionId), 'ko');
    });

  const buildImageAnalysis = (sectionId) => {
    const pixelRow = pixelBySectionId.get(sectionId);
    if (!pixelRow) {
      return {
        imageCandidateStatus: 'MISSING_PIXEL_COMPONENT_ROW',
        imageRiskLevel: 'HIGH',
        imageRiskReasons: ['PIXEL_COMPONENT_ROW_MISSING'],
        imageSeedPoint: '',
        imageSeedColor: '',
        imageComponentArea: null,
        imageBbox: '',
        imageCenter: '',
        imagePathColorCoverageRatio: null,
        imageComponentInsidePathRatio: null,
        imageComponentOutsideDilatedPathRatio: null,
        imageMaxComponentOutsidePathDistance: null,
        imageOuterBoundaryPointCount: null,
        imageAnalysisSource: path.relative(frontendRoot, pixelComponentsPath),
        imageCandidateReferenceOnly: true,
      };
    }

    const candidate = pixelRow.candidate ?? {};
    const riskReasons = [];
    const imageCandidateStatus = candidate.status ?? 'UNKNOWN';
    const imageComponentArea = Number(candidate.area ?? 0);
    const pathColorCoverageRatio = Number(candidate.pathColorCoverageRatio ?? 0);
    const componentOutsideDilatedPathRatio = Number(candidate.componentOutsideDilatedPathRatio ?? 0);
    const maxComponentOutsidePathDistance = Number(candidate.maxComponentOutsidePathDistance ?? 0);

    if (imageCandidateStatus !== 'PIXEL_CANDIDATE_READY') {
      riskReasons.push(`PIXEL_STATUS_${imageCandidateStatus}`);
    }
    if (imageComponentArea > 0 && imageComponentArea < IMAGE_ANALYSIS_SMALL_COMPONENT_AREA) {
      riskReasons.push('SMALL_OFFICIAL_PIXEL_COMPONENT');
    } else if (imageComponentArea > 0 && imageComponentArea < IMAGE_ANALYSIS_MEDIUM_COMPONENT_AREA) {
      riskReasons.push('MEDIUM_OFFICIAL_PIXEL_COMPONENT');
    }
    if (pathColorCoverageRatio > 0 && pathColorCoverageRatio < IMAGE_ANALYSIS_MIN_COVERAGE_HIGH_RISK) {
      riskReasons.push('LOW_PATH_COLOR_COVERAGE');
    } else if (pathColorCoverageRatio > 0 && pathColorCoverageRatio < IMAGE_ANALYSIS_MIN_COVERAGE_MEDIUM_RISK) {
      riskReasons.push('MEDIUM_PATH_COLOR_COVERAGE');
    }
    if (componentOutsideDilatedPathRatio > 0) {
      riskReasons.push('OFFICIAL_COMPONENT_OUTSIDE_DILATED_PATH');
    }
    if (maxComponentOutsidePathDistance > IMAGE_ANALYSIS_OUTSIDE_DISTANCE_HIGH_RISK) {
      riskReasons.push('OFFICIAL_COMPONENT_OUTSIDE_PATH_DISTANCE');
    }

    const highRisk = imageCandidateStatus !== 'PIXEL_CANDIDATE_READY'
      || riskReasons.includes('SMALL_OFFICIAL_PIXEL_COMPONENT')
      || riskReasons.includes('LOW_PATH_COLOR_COVERAGE')
      || riskReasons.includes('OFFICIAL_COMPONENT_OUTSIDE_PATH_DISTANCE');
    const mediumRisk = riskReasons.length > 0;

    return {
      imageCandidateStatus,
      imageRiskLevel: highRisk ? 'HIGH' : (mediumRisk ? 'MEDIUM' : 'LOW'),
      imageRiskReasons: riskReasons,
      imageSeedPoint: formatPoint(candidate.seedPoint),
      imageSeedColor: formatPoint(candidate.seedColor),
      imageComponentArea: imageComponentArea || null,
      imageBbox: formatBbox(candidate.bbox),
      imageCenter: formatCenter(candidate.center),
      imagePathColorCoverageRatio: roundMetric(pathColorCoverageRatio),
      imageComponentInsidePathRatio: roundMetric(candidate.componentInsidePathRatio),
      imageComponentOutsideDilatedPathRatio: roundMetric(componentOutsideDilatedPathRatio),
      imageMaxComponentOutsidePathDistance: roundMetric(maxComponentOutsidePathDistance),
      imageOuterBoundaryPointCount: candidate.outerBoundaryPointCount ?? null,
      imageAnalysisSource: path.relative(frontendRoot, pixelComponentsPath),
      imageCandidateReferenceOnly: true,
    };
  };

  const imageAnalysisBySectionId = new Map(
    stageRows.map((row) => [String(row.sectionId), buildImageAnalysis(String(row.sectionId))]),
  );
  const imageRiskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const imagePrioritySectionIds = [...stageRows]
    .sort((left, right) => {
      const leftAnalysis = imageAnalysisBySectionId.get(String(left.sectionId));
      const rightAnalysis = imageAnalysisBySectionId.get(String(right.sectionId));
      const leftRisk = imageRiskOrder[leftAnalysis?.imageRiskLevel] ?? 99;
      const rightRisk = imageRiskOrder[rightAnalysis?.imageRiskLevel] ?? 99;
      if (leftRisk !== rightRisk) return leftRisk - rightRisk;
      const leftArea = Number(leftAnalysis?.imageComponentArea ?? Number.POSITIVE_INFINITY);
      const rightArea = Number(rightAnalysis?.imageComponentArea ?? Number.POSITIVE_INFINITY);
      if (leftArea !== rightArea) return leftArea - rightArea;
      return String(left.sectionId).localeCompare(String(right.sectionId), 'ko');
    })
    .map((row) => String(row.sectionId));
  const imagePriorityRankBySectionId = new Map(
    imagePrioritySectionIds.map((sectionId, index) => [sectionId, index + 1]),
  );

  const corrections = stageRows.map((row) => {
    const existingRow = existingBySectionId.get(row.sectionId);
    const shouldPreserveExistingInput = hasOperatorFilledEditableFields(existingRow);
    const editable = editableFieldsFrom(shouldPreserveExistingInput ? existingRow : null);
    const [currentLabelX = '', currentLabelY = ''] = row.labelPoint ?? [];
    const imageAnalysis = imageAnalysisBySectionId.get(String(row.sectionId)) ?? buildImageAnalysis(String(row.sectionId));

    return {
      worksetVersion: row.worksetVersion,
      packageVersion: PACKAGE_VERSION,
      targetStage: TARGET_STAGE_LABEL,
      priority: row.priority,
      batchId: row.batchId,
      stageOrder: row.stageOrder,
      zoneId: row.zoneId,
      zoneLabel: row.zoneLabel,
      sectionId: row.sectionId,
      sectionName: row.sectionName,
      blockId: row.blockId,
      seatCategoryLabel: row.seatCategoryLabel,
      level: row.level,
      floor: row.floor,
      side: row.side,
      sectionKind: row.sectionKind,
      mapInteractionStatus: row.mapInteractionStatus,
      allowedChange: row.allowedChange,
      currentVisualPath: row.visualPath,
      currentHitPath: row.hitPath,
      currentLabelX,
      currentLabelY,
      currentLabelPoint: row.labelPoint,
      currentVisualEqualsHit: row.visualEqualsHit,
      visualArea: row.visualArea,
      hitArea: row.hitArea,
      hitToVisualAreaRatio: row.hitToVisualAreaRatio,
      bounds: row.bounds,
      validationIssueCount: row.validationIssueCount,
      validationIssues: row.validationIssues,
      objective: row.objective,
      imagePriorityRank: imagePriorityRankBySectionId.get(String(row.sectionId)) ?? null,
      ...imageAnalysis,
      editableSource: shouldPreserveExistingInput ? 'existingOperatorInput' : 'emptyTemplate',
      operatorDecision: editable.operatorDecision,
      correctedPath: editable.correctedPath,
      correctedLabelX: editable.correctedLabelX,
      correctedLabelY: editable.correctedLabelY,
      reviewer: editable.reviewer,
      reviewedAt: editable.reviewedAt,
      operatorNote: editable.operatorNote,
    };
  }).sort((left, right) => {
    const leftRank = Number(left.imagePriorityRank ?? Number.POSITIVE_INFINITY);
    const rightRank = Number(right.imagePriorityRank ?? Number.POSITIVE_INFINITY);
    if (leftRank !== rightRank) return leftRank - rightRank;
    return String(left.sectionId).localeCompare(String(right.sectionId), 'ko');
  });

  const blockers = [];
  const warnings = [];
  const stageIds = sorted(stageRows.map((row) => row.sectionId));
  const expectedIds = sorted(EXPECTED_STAGE01_SECTION_IDS);

  if (worksets.summary?.worksetVersion !== REQUIRED_WORKSET_VERSION) {
    blockers.push(`WORKSET_VERSION_MISMATCH:${worksets.summary?.worksetVersion ?? ''}`);
  }
  if (worksets.summary?.blockers?.length > 0) {
    blockers.push(`WORKSET_HAS_BLOCKERS:${worksets.summary.blockers.length}`);
  }
  if (pixelComponents.summary?.totalBlocks !== REQUIRED_PIXEL_TOTAL_BLOCKS) {
    blockers.push(`PIXEL_COMPONENT_TOTAL_BLOCKS:${pixelComponents.summary?.totalBlocks ?? ''}:${REQUIRED_PIXEL_TOTAL_BLOCKS}`);
  }
  if (pixelComponents.summary?.pixelCandidateReady !== REQUIRED_PIXEL_READY_BLOCKS) {
    blockers.push(`PIXEL_COMPONENT_READY_BLOCKS:${pixelComponents.summary?.pixelCandidateReady ?? ''}:${REQUIRED_PIXEL_READY_BLOCKS}`);
  }
  if (pixelComponents.summary?.noSeedColor !== REQUIRED_PIXEL_NO_SEED_BLOCKS) {
    blockers.push(`PIXEL_COMPONENT_NO_SEED_BLOCKS:${pixelComponents.summary?.noSeedColor ?? ''}:${REQUIRED_PIXEL_NO_SEED_BLOCKS}`);
  }
  if (stageRows.length !== EXPECTED_STAGE01_ROWS) {
    blockers.push(`STAGE01_ROW_COUNT_MISMATCH:${stageRows.length}:${EXPECTED_STAGE01_ROWS}`);
  }
  if (stageIds.join(',') !== expectedIds.join(',')) {
    blockers.push(`STAGE01_SECTION_IDS_MISMATCH:${stageIds.join(' ')}:${expectedIds.join(' ')}`);
  }
  if (imagePrioritySectionIds.join(',') !== EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER.join(',')) {
    blockers.push(`STAGE01_IMAGE_PRIORITY_ORDER_CHANGED:${imagePrioritySectionIds.join(' ')}:${EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER.join(' ')}`);
  }
  corrections
    .filter((row) => row.sectionKind !== 'SEAT_SECTION')
    .forEach((row) => blockers.push(`STAGE01_NON_SEAT_SECTION:${row.sectionId}:${row.sectionKind}`));
  corrections
    .filter((row) => row.mapInteractionStatus !== 'MAP_SELECTABLE')
    .forEach((row) => blockers.push(`STAGE01_NOT_MAP_SELECTABLE:${row.sectionId}:${row.mapInteractionStatus}`));
  corrections
    .filter((row) => row.validationIssueCount > 0)
    .forEach((row) => blockers.push(`STAGE01_CURRENT_GEOMETRY_INVALID:${row.sectionId}`));
  corrections
    .filter((row) => row.imageCandidateStatus !== 'PIXEL_CANDIDATE_READY')
    .forEach((row) => blockers.push(`STAGE01_PIXEL_COMPONENT_NOT_READY:${row.sectionId}:${row.imageCandidateStatus}`));

  if (existingRows.length > 0 && existingRows.length !== EXPECTED_STAGE01_ROWS) {
    warnings.push(`EXISTING_OPERATOR_INPUT_ROW_COUNT:${existingRows.length}:${EXPECTED_STAGE01_ROWS}`);
  }
  const preservedEditableSectionIds = new Set(
    corrections
      .filter((row) => row.editableSource === 'existingOperatorInput')
      .map((row) => row.sectionId),
  );
  const missingPreservedEditableRows = existingEditableStageRows
    .filter(({ sectionId }) => !preservedEditableSectionIds.has(sectionId));

  if (missingPreservedEditableRows.length > 0) {
    blockers.push(`OPERATOR_INPUT_PRESERVATION_FAILED:${missingPreservedEditableRows.map(({ sectionId }) => sectionId).join(' ')}`);
  }
  if (ignoredExistingEditableRows.length > 0) {
    blockers.push(`OPERATOR_INPUT_OUTSIDE_STAGE01:${ignoredExistingEditableRows.map(({ sectionId }) => sectionId || 'UNKNOWN').join(' ')}`);
  }
  if (duplicateExistingEditableSectionIds.length > 0) {
    blockers.push(`DUPLICATE_EXISTING_OPERATOR_INPUT:${duplicateExistingEditableSectionIds.join(' ')}`);
  }

  const preservationStatus = blockers.some((blocker) => blocker.startsWith('OPERATOR_INPUT_') || blocker.startsWith('DUPLICATE_EXISTING_OPERATOR_INPUT'))
    ? 'blocked'
    : existingEditableRows.length === 0
      ? 'no-existing-input'
      : 'preserved';
  const imageRiskCounts = corrections.reduce((accumulator, row) => ({
    ...accumulator,
    [row.imageRiskLevel]: (accumulator[row.imageRiskLevel] ?? 0) + 1,
  }), {});

  const summary = {
    packageVersion: PACKAGE_VERSION,
    status: blockers.length > 0 ? 'blocked' : 'waiting-for-operator',
    generatedAt: new Date().toISOString(),
    stadiumId: worksets.summary?.stadiumId ?? '',
    mapVersion: worksets.summary?.mapVersion ?? '',
    viewBox: worksets.summary?.viewBox ?? '',
    coordinateSystem: worksets.summary?.coordinateSystem ?? '',
    sourceWorksets: path.relative(frontendRoot, worksetPath),
    pixelComponents: path.relative(frontendRoot, pixelComponentsPath),
    outputDirectory: path.relative(frontendRoot, stageDir),
    targetStage: TARGET_STAGE_LABEL,
    targetBatchIds: TARGET_STAGE_IDS,
    targetSectionIds: EXPECTED_STAGE01_SECTION_IDS,
    totalRows: corrections.length,
    expectedRows: EXPECTED_STAGE01_ROWS,
    approvedRows: corrections.filter((row) => row.operatorDecision === 'APPROVED').length,
    pendingRows: corrections.filter((row) => row.operatorDecision === 'PENDING').length,
    decidedRows: corrections.filter((row) => row.operatorDecision !== 'PENDING').length,
    keepCurrentRows: corrections.filter((row) => row.operatorDecision === 'KEEP_CURRENT').length,
    existingEditableRows: existingEditableRows.length,
    existingEditableStageRows: existingEditableStageRows.length,
    preservedEditableRows: corrections.filter((row) => row.editableSource === 'existingOperatorInput').length,
    ignoredExistingEditableRows: ignoredExistingEditableRows.length,
    duplicateExistingEditableSectionIds,
    preservationStatus,
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    decisionOptions: DECISION_OPTIONS,
    imageAnalysisMetadataRegenerated: true,
    imageCandidateReferenceOnly: true,
    imageRiskCounts: {
      HIGH: imageRiskCounts.HIGH ?? 0,
      MEDIUM: imageRiskCounts.MEDIUM ?? 0,
      LOW: imageRiskCounts.LOW ?? 0,
    },
    imageAnalysisPriorityOrder: imagePrioritySectionIds,
    productionWriteAllowed: false,
    sourceOfTruth: false,
    blockers,
    warnings,
  };

  const packageJson = {
    generatedAt: summary.generatedAt,
    packageVersion: PACKAGE_VERSION,
    status: summary.status,
    stadiumId: summary.stadiumId,
    mapVersion: summary.mapVersion,
    viewBox: summary.viewBox,
    targetStage: summary.targetStage,
    targetBatchIds: summary.targetBatchIds,
    targetSectionIds: summary.targetSectionIds,
    productionWriteAllowed: false,
    sourceOfTruth: false,
    safetyContract: [
      'Stage 01 operator package is an input aid only; it never changes production seatmap data.',
      'correctedPath is the operator-approved hitPath for the section in the official 960x640 SVG viewBox coordinate system.',
      'visualPath remains the current official traced path in Stage 01 unless a later plan explicitly allows visualPath writes.',
      'Image-analysis metadata is regenerated from the local official PNG pixel-component report and is not operator editable.',
      'Pixel candidate paths are never copied into correctedPath by this package.',
      'Regenerating this package preserves operator-filled editable fields from the existing operator input file.',
      'If a filled editable row would be dropped or duplicated during regeneration, the package is blocked.',
      'Alias-only sections and accessibility markers are excluded from this package.',
    ],
    correctionContract: {
      coordinateSystem: 'official PNG 960x640, SVG viewBox 0 0 960 640',
      allowedChange: 'HITPATH_ONLY_WITH_OPERATOR_APPROVAL',
      pathRules: ['single closed polygon', 'M/L/Z only', 'minimum 3 polygon points'],
      decisionOptions: DECISION_OPTIONS,
      requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
      imageAnalysisFields: [
        'imagePriorityRank',
        'imageRiskLevel',
        'imageRiskReasons',
        'imageCandidateStatus',
        'imageComponentArea',
        'imagePathColorCoverageRatio',
        'imageBbox',
        'imageSeedPoint',
      ],
      noCoordinateInference: true,
      noPixelCandidatePathCopy: true,
      noExternalCrawlingOrWebSearch: true,
    },
    corrections,
  };

  await fs.mkdir(stageDir, { recursive: true });
  await fs.writeFile(operatorInputJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

  const editableHeaders = [
    'sectionId',
    'sectionName',
    'batchId',
    'zoneId',
    'seatCategoryLabel',
    'imagePriorityRank',
    'imageRiskLevel',
    'imageRiskReasons',
    'imageCandidateStatus',
    'imageComponentArea',
    'imagePathColorCoverageRatio',
    'imageComponentOutsideDilatedPathRatio',
    'imageMaxComponentOutsidePathDistance',
    'imageBbox',
    'imageSeedPoint',
    'imageCandidateReferenceOnly',
    'currentVisualPath',
    'currentHitPath',
    'currentLabelX',
    'currentLabelY',
    'editableSource',
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  await writeCsv(operatorInputCsvPath, [
    editableHeaders,
    ...corrections.map((row) => editableHeaders.map((key) => Array.isArray(row[key]) ? row[key].join('; ') : row[key])),
  ]);

  const checklistHeaders = [
    'imagePriorityRank',
    'sectionId',
    'batchId',
    'zoneId',
    'sectionName',
    'seatCategoryLabel',
    'imageRiskLevel',
    'imageRiskReasons',
    'imageCandidateStatus',
    'imageComponentArea',
    'imagePathColorCoverageRatio',
    'imageBbox',
    'currentVisualEqualsHit',
    'hitToVisualAreaRatio',
    'validationIssueCount',
    'objective',
    'editableSource',
  ];
  await writeCsv(checklistCsvPath, [
    checklistHeaders,
    ...corrections.map((row) => checklistHeaders.map((key) => row[key])),
  ]);

  const rowsTable = markdownTable(
    ['rank', 'risk', 'batch', 'zone', 'section', 'category', 'area', 'coverage', 'decision', 'editable source'],
    corrections.map((row) => [
      `\`${row.imagePriorityRank}\``,
      `\`${row.imageRiskLevel}\``,
      `\`${row.batchId}\``,
      `\`${row.zoneId}\``,
      `\`${row.sectionId}\``,
      row.seatCategoryLabel,
      `\`${row.imageComponentArea ?? '-'}\``,
      `\`${row.imagePathColorCoverageRatio ?? '-'}\``,
      `\`${row.operatorDecision}\``,
      `\`${row.editableSource}\``,
    ]),
  );

  await fs.writeFile(checklistMarkdownPath, [
    '# Sajik Stage 01 Operator Checklist',
    '',
    `- package version: \`${PACKAGE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- target stage: \`${TARGET_STAGE_LABEL}\``,
    `- rows: \`${summary.totalRows}/${EXPECTED_STAGE01_ROWS}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- keep current rows: \`${summary.keepCurrentRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Operator Rules',
    '',
    '1. `correctedPath`는 공식 PNG `960x640` 좌표계 기준의 operator-approved `hitPath`입니다.',
    '2. Stage 01에서는 `visualPath`를 production source로 수정하지 않습니다.',
    '3. 승인하려면 `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`, `operatorNote`를 채웁니다.',
    '4. 승인할 수 없으면 `REJECTED`, `NEEDS_RETRACE`, 또는 `KEEP_CURRENT`로 남기고 prewrite에서 production patch preview를 만들지 않습니다.',
    '5. package를 다시 생성해도 기존 operator input의 editable field는 보존됩니다.',
    '',
    '## Image Analysis Rules',
    '',
    `- source: \`${summary.pixelComponents}\``,
    '- `imagePriorityRank`는 로컬 공식 PNG pixel-component 리포트의 위험도, component area, sectionId 순서로 재생성됩니다.',
    '- `imageRiskLevel`, `imageRiskReasons`, `imageComponentArea`, `imagePathColorCoverageRatio`, `imageBbox`는 검수 우선순위 참고용이며 operator editable field가 아닙니다.',
    '- pixel candidate path는 package에 포함하지 않으며 `correctedPath`로 복사하지 않습니다.',
    `- current priority order: \`${summary.imageAnalysisPriorityOrder.join(' -> ')}\``,
    `- expected priority order: \`${EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER_TEXT}\``,
    '',
    '## Rows',
    '',
    rowsTable,
    '',
    '## Editable Inputs',
    '',
    `- \`${path.relative(frontendRoot, operatorInputJsonPath)}\``,
    `- \`${path.relative(frontendRoot, operatorInputCsvPath)}\``,
    '',
  ].join('\n'), 'utf8');

  await fs.writeFile(packageJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(packageMarkdownPath, [
    '# Sajik Stage 01 Operator Package',
    '',
    `- package version: \`${PACKAGE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- target stage: \`${summary.targetStage}\``,
    `- rows: \`${summary.totalRows}/${summary.expectedRows}\``,
    `- approved rows in package: \`${summary.approvedRows}\``,
    `- keep current rows in package: \`${summary.keepCurrentRows}\``,
    `- image analysis source: \`${summary.pixelComponents}\``,
    `- image risk counts: \`HIGH=${summary.imageRiskCounts.HIGH}, MEDIUM=${summary.imageRiskCounts.MEDIUM}, LOW=${summary.imageRiskCounts.LOW}\``,
    `- image priority order: \`${summary.imageAnalysisPriorityOrder.join(' -> ')}\``,
    `- existing editable rows: \`${summary.existingEditableRows}\``,
    `- preserved editable rows: \`${summary.preservedEditableRows}\``,
    `- ignored existing editable rows: \`${summary.ignoredExistingEditableRows}\``,
    `- preservation status: \`${summary.preservationStatus}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Outputs',
    '',
    `- \`${path.relative(frontendRoot, operatorInputJsonPath)}\``,
    `- \`${path.relative(frontendRoot, operatorInputCsvPath)}\``,
    `- \`${path.relative(frontendRoot, checklistMarkdownPath)}\``,
    `- \`${path.relative(frontendRoot, checklistCsvPath)}\``,
    `- \`${path.relative(frontendRoot, packageSvgPath)}\``,
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0
      ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n')
      : 'No package blockers.',
    '',
  ].join('\n'), 'utf8');

  const stageColors = {
    'P0-A': '#DC2626',
    'P0-B': '#EA580C',
    'P0-C': '#CA8A04',
  };
  const svgPaths = corrections.map((row) => `
    <path d="${xmlEscape(row.currentVisualPath)}" fill="${stageColors[row.batchId] ?? '#64748B'}" fill-opacity="0.2" stroke="${stageColors[row.batchId] ?? '#64748B'}" stroke-width="2" vector-effect="non-scaling-stroke">
      <title>${xmlEscape(`${row.batchId} · ${row.zoneId} · ${row.sectionId} · ${row.sectionName}`)}</title>
    </path>
    <text x="${row.currentLabelX}" y="${row.currentLabelY}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="3" paint-order="stroke">${xmlEscape(row.sectionId)}</text>
  `).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640">
    <rect width="960" height="640" fill="#f8fafc"/>
    <text x="20" y="32" font-size="18" font-weight="900" fill="#0f172a">Sajik Stage 01 operator package (${summary.status})</text>
    ${svgPaths}
  </svg>
  `;
  await fs.writeFile(packageSvgPath, svg, 'utf8');

  console.log(`stage01_operator_package_json:${path.relative(frontendRoot, packageJsonPath)}`);
  console.log(`stage01_operator_package_markdown:${path.relative(frontendRoot, packageMarkdownPath)}`);
  console.log(`stage01_operator_input_json:${path.relative(frontendRoot, operatorInputJsonPath)}`);
  console.log(`stage01_operator_checklist_markdown:${path.relative(frontendRoot, checklistMarkdownPath)}`);
  console.log(`stage01_operator_package_svg:${path.relative(frontendRoot, packageSvgPath)}`);
  console.log(`status:${summary.status} rows=${summary.totalRows} approved=${summary.approvedRows} preserved=${summary.preservedEditableRows} preservation=${summary.preservationStatus} blockers=${summary.blockers.length}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01OperatorStatus = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { buildSajikSeatMapDataset } = await import("../src/data/sajikSeatMapDataset.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultStageDir = path.join(reportDir, 'sajik-stage01-operator');

  const STATUS_VERSION = 'SAJIK_STAGE01_OPERATOR_STATUS_V1';
  const REQUIRED_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
  const REQUIRED_PREWRITE_VERSION = 'SAJIK_STAGE01_PREWRITE_V1';
  const REQUIRED_APPLY_READY_VERSION = 'SAJIK_STAGE01_APPLY_READY_V1';
  const REQUIRED_POST_APPLY_VERSION = 'SAJIK_STAGE01_POST_APPLY_AUDIT_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const EXPECTED_STAGE01_ROWS = 16;
  const EXPECTED_STAGE01_SECTION_IDS = [
    '021',
    '022',
    '031',
    '032',
    '121',
    '122',
    '123',
    '124',
    '125',
    '131',
    '132',
    '133',
    '134',
    '135',
    '142',
    '143',
  ];
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT']);

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

  const sorted = (values) => [...values].sort();

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
  const operatorInputPath = path.resolve(
    frontendRoot,
    argValue('--operator-input', path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json')),
  );
  const prewritePath = path.resolve(
    frontendRoot,
    argValue('--prewrite', path.join(stageDir, 'sajik-seatmap-stage01-prewrite.json')),
  );
  const applyReadyPath = path.resolve(
    frontendRoot,
    argValue('--apply-ready', path.join(stageDir, 'sajik-seatmap-stage01-apply-ready.json')),
  );
  const postApplyPath = path.resolve(
    frontendRoot,
    argValue('--post-apply', path.join(stageDir, 'sajik-seatmap-stage01-post-apply-audit.json')),
  );
  const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-status.json');
  const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-status.csv');
  const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-status.md');

  const dataset = buildSajikSeatMapDataset();
  const input = await readJson(operatorInputPath);
  const prewrite = await readJson(prewritePath);
  const applyReady = await readJson(applyReadyPath);
  const postApply = await readJson(postApplyPath);

  const operatorRows = Array.isArray(input.corrections) ? input.corrections : [];
  const prewriteRows = Array.isArray(prewrite.rows) ? prewrite.rows : [];
  const applyReadyRows = Array.isArray(applyReady.rows) ? applyReady.rows : [];
  const postApplyRows = Array.isArray(postApply.rows) ? postApply.rows : [];
  const patchPayloads = Array.isArray(prewrite.patchPayloads) ? prewrite.patchPayloads : [];

  const operatorBySectionId = new Map(operatorRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
  const prewriteBySectionId = new Map(prewriteRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
  const applyReadyBySectionId = new Map(applyReadyRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
  const postApplyBySectionId = new Map(postApplyRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
  const patchPayloadBySectionId = new Map(patchPayloads.map((payload) => [String(payload.sectionId ?? '').trim(), payload]));

  const blockers = [];
  const warnings = [];

  if (input.packageVersion !== REQUIRED_PACKAGE_VERSION) {
    blockers.push(`OPERATOR_INPUT_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  }
  if (input.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`OPERATOR_INPUT_STAGE_MISMATCH:${input.targetStage ?? ''}`);
  }
  if (prewrite.summary?.prewriteVersion !== REQUIRED_PREWRITE_VERSION) {
    blockers.push(`PREWRITE_VERSION_MISMATCH:${prewrite.summary?.prewriteVersion ?? ''}`);
  }
  if (applyReady.summary?.applyReadyVersion !== REQUIRED_APPLY_READY_VERSION) {
    blockers.push(`APPLY_READY_VERSION_MISMATCH:${applyReady.summary?.applyReadyVersion ?? ''}`);
  }
  if (postApply.summary?.postApplyAuditVersion !== REQUIRED_POST_APPLY_VERSION) {
    blockers.push(`POST_APPLY_VERSION_MISMATCH:${postApply.summary?.postApplyAuditVersion ?? ''}`);
  }
  if (prewrite.summary?.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`PREWRITE_STAGE_MISMATCH:${prewrite.summary?.targetStage ?? ''}`);
  }
  if (applyReady.summary?.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`APPLY_READY_STAGE_MISMATCH:${applyReady.summary?.targetStage ?? ''}`);
  }
  if (postApply.summary?.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`POST_APPLY_STAGE_MISMATCH:${postApply.summary?.targetStage ?? ''}`);
  }
  if (prewrite.summary?.productionDataChanged !== false) {
    blockers.push('PREWRITE_PRODUCTION_DATA_CHANGED');
  }
  if (prewrite.summary?.productionWriteAllowed !== false) {
    blockers.push('PREWRITE_PRODUCTION_WRITE_ALLOWED');
  }
  if (applyReady.summary?.productionDataChanged !== false) {
    blockers.push('APPLY_READY_PRODUCTION_DATA_CHANGED');
  }
  if (applyReady.summary?.productionWriteAllowed !== false) {
    blockers.push('APPLY_READY_PRODUCTION_WRITE_ALLOWED');
  }
  if (applyReady.summary?.sourceDataWritePerformed !== false) {
    blockers.push('APPLY_READY_SOURCE_DATA_WRITE_PERFORMED');
  }
  if (postApply.summary?.readOnly !== true) {
    blockers.push('POST_APPLY_NOT_READ_ONLY');
  }
  if (postApply.summary?.productionWriteAllowed !== false) {
    blockers.push('POST_APPLY_PRODUCTION_WRITE_ALLOWED');
  }
  if (postApply.summary?.sourceDataWritePerformed !== false) {
    blockers.push('POST_APPLY_SOURCE_DATA_WRITE_PERFORMED');
  }

  const operatorIds = sorted(operatorRows.map((row) => String(row.sectionId ?? '').trim()));
  const expectedIds = sorted(EXPECTED_STAGE01_SECTION_IDS);
  if (operatorRows.length !== EXPECTED_STAGE01_ROWS) {
    blockers.push(`STAGE01_OPERATOR_ROW_COUNT_MISMATCH:${operatorRows.length}:${EXPECTED_STAGE01_ROWS}`);
  }
  if (operatorIds.join(',') !== expectedIds.join(',')) {
    blockers.push(`STAGE01_OPERATOR_SECTION_IDS_MISMATCH:${operatorIds.join(' ')}:${expectedIds.join(' ')}`);
  }

  const rowStatusFor = ({ operatorRow, prewriteRow, postApplyRow }) => {
    const decision = normalizeDecision(operatorRow?.operatorDecision);
    if (!DECISION_OPTIONS.has(decision)) return 'INVALID';
    if (decision === 'PENDING') return 'PENDING';
    if (decision === 'REJECTED') return 'REJECTED';
    if (decision === 'NEEDS_RETRACE') return 'NEEDS_RETRACE';
    if (decision === 'KEEP_CURRENT') return 'KEEP_CURRENT';
    if (!prewriteRow || prewriteRow.validForPatchPreview !== true) return 'INVALID';
    if (!postApplyRow) return 'NOT_APPLIED';
    return postApplyRow.applied ? 'APPLIED' : 'NOT_APPLIED';
  };

  const statusSectionIds = [
    ...EXPECTED_STAGE01_SECTION_IDS,
    ...operatorIds.filter((sectionId) => !EXPECTED_STAGE01_SECTION_IDS.includes(sectionId)),
  ];

  const rows = statusSectionIds.map((sectionId) => {
    const operatorRow = operatorBySectionId.get(sectionId);
    const prewriteRow = prewriteBySectionId.get(sectionId);
    const applyReadyRow = applyReadyBySectionId.get(sectionId);
    const postApplyRow = postApplyBySectionId.get(sectionId);
    const patchPayload = patchPayloadBySectionId.get(sectionId);
    const rowStatus = rowStatusFor({ operatorRow, prewriteRow, postApplyRow });
    const decision = normalizeDecision(operatorRow?.operatorDecision);
    const action = rowStatus === 'NOT_APPLIED'
      ? 'MANUAL_PATCH_REQUIRED'
      : rowStatus === 'INVALID'
        ? 'FIX_OPERATOR_INPUT'
        : rowStatus === 'PENDING'
          ? 'WAIT_FOR_OPERATOR'
          : rowStatus === 'REJECTED' || rowStatus === 'NEEDS_RETRACE' || rowStatus === 'KEEP_CURRENT'
            ? 'NO_PATCH_PREVIEW'
            : 'NO_ACTION';

    return {
      sectionId,
      batchId: operatorRow?.batchId ?? prewriteRow?.batchId ?? '',
      zoneId: operatorRow?.zoneId ?? prewriteRow?.zoneId ?? '',
      sectionName: operatorRow?.sectionName ?? prewriteRow?.sectionName ?? '',
      seatCategoryLabel: operatorRow?.seatCategoryLabel ?? prewriteRow?.seatCategoryLabel ?? '',
      operatorDecision: decision,
      rowStatus,
      action,
      validForPatchPreview: Boolean(prewriteRow?.validForPatchPreview),
      geometryDelta: Boolean(prewriteRow?.geometryDelta),
      applyReadyStatus: applyReadyRow ? (applyReadyRow.reasons?.length > 0 ? 'blocked' : applyReady.summary?.status) : applyReady.summary?.status,
      postApplyStatus: postApplyRow ? (postApplyRow.applied ? 'applied' : 'not-applied') : '-',
      reviewer: prewriteRow?.reviewer ?? operatorRow?.reviewer ?? '',
      reviewedAt: prewriteRow?.reviewedAt ?? operatorRow?.reviewedAt ?? '',
      prewriteReasons: prewriteRow?.reasons ?? [],
      prewriteWarnings: prewriteRow?.warnings ?? [],
      applyReadyReasons: applyReadyRow?.reasons ?? [],
      applyReadyWarnings: applyReadyRow?.warnings ?? [],
      postApplyReasons: postApplyRow?.reasons ?? [],
      patchPayload,
    };
  });

  const statusCounts = rows.reduce((accumulator, row) => ({
    ...accumulator,
    [row.rowStatus]: (accumulator[row.rowStatus] ?? 0) + 1,
  }), {});
  const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
  const validApprovedRows = approvedRows.filter((row) => row.validForPatchPreview);
  const invalidRows = rows.filter((row) => row.rowStatus === 'INVALID');
  const notAppliedRows = rows.filter((row) => row.rowStatus === 'NOT_APPLIED');
  const appliedRows = rows.filter((row) => row.rowStatus === 'APPLIED');
  const pendingRows = rows.filter((row) => row.rowStatus === 'PENDING');
  const rejectedRows = rows.filter((row) => row.rowStatus === 'REJECTED');
  const needsRetraceRows = rows.filter((row) => row.rowStatus === 'NEEDS_RETRACE');
  const keepCurrentRows = rows.filter((row) => row.rowStatus === 'KEEP_CURRENT');

  if (prewrite.summary?.status === 'blocked') {
    blockers.push(...(prewrite.summary.blockers ?? []).map((blocker) => `PREWRITE_BLOCKED:${blocker}`));
  }
  if (applyReady.summary?.status === 'blocked') {
    blockers.push(...(applyReady.summary.blockers ?? []).map((blocker) => `APPLY_READY_BLOCKED:${blocker}`));
  }
  if (postApply.summary?.status === 'blocked') {
    blockers.push(...(postApply.summary.blockers ?? []).map((blocker) => `POST_APPLY_BLOCKED:${blocker}`));
  }
  if (invalidRows.length > 0) {
    blockers.push(`INVALID_APPROVED_ROWS:${invalidRows.map((row) => row.sectionId).join(' ')}`);
  }
  if (approvedRows.length === 0) {
    warnings.push('NO_OPERATOR_APPROVED_STAGE01_ROWS');
  }
  if (notAppliedRows.length > 0) {
    warnings.push(`APPROVED_ROWS_NOT_APPLIED:${notAppliedRows.map((row) => row.sectionId).join(' ')}`);
  }
  if (rejectedRows.length > 0) {
    warnings.push(`REJECTED_ROWS:${rejectedRows.map((row) => row.sectionId).join(' ')}`);
  }
  if (needsRetraceRows.length > 0) {
    warnings.push(`NEEDS_RETRACE_ROWS:${needsRetraceRows.map((row) => row.sectionId).join(' ')}`);
  }
  if (keepCurrentRows.length > 0) {
    warnings.push(`KEEP_CURRENT_ROWS:${keepCurrentRows.map((row) => row.sectionId).join(' ')}`);
  }

  const status = blockers.length > 0
    ? 'blocked'
    : approvedRows.length === 0
      ? 'waiting-for-operator'
      : notAppliedRows.length > 0
        ? 'ready-for-manual-apply'
        : appliedRows.length === approvedRows.length
          ? 'applied'
          : 'in-progress';

  const manualPatchChecklist = notAppliedRows.map((row) => ({
    sectionId: row.sectionId,
    batchId: row.batchId,
    sectionName: row.sectionName,
    applyHitPathFrom: 'patchPayload.after.hitPath',
    hitPath: row.patchPayload?.after?.hitPath ?? '',
    labelPoint: row.patchPayload?.after?.labelPoint ?? null,
    legacyLabelX: row.patchPayload?.after?.labelPoint?.[0] ?? null,
    legacyLabelY: row.patchPayload?.after?.labelPoint?.[1] ?? null,
    visualPathLocked: row.patchPayload?.before?.visualPath === row.patchPayload?.after?.visualPath,
    geometryVersion: 'manual-polygon-v2',
    sourcePreview: 'reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite.patch-preview.ts',
  }));

  const summary = {
    operatorStatusVersion: STATUS_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    operatorInput: path.relative(frontendRoot, operatorInputPath),
    prewrite: path.relative(frontendRoot, prewritePath),
    applyReady: path.relative(frontendRoot, applyReadyPath),
    postApply: path.relative(frontendRoot, postApplyPath),
    stadiumId: dataset.stadiumId,
    mapVersion: dataset.mapVersion,
    viewBox: dataset.image.viewBox,
    targetStage: TARGET_STAGE_LABEL,
    totalRows: rows.length,
    expectedRows: EXPECTED_STAGE01_ROWS,
    approvedRows: approvedRows.length,
    validApprovedRows: validApprovedRows.length,
    appliedRows: appliedRows.length,
    notAppliedRows: notAppliedRows.length,
    pendingRows: pendingRows.length,
    rejectedRows: rejectedRows.length,
    needsRetraceRows: needsRetraceRows.length,
    keepCurrentRows: keepCurrentRows.length,
    invalidRows: invalidRows.length,
    manualPatchChecklistRows: manualPatchChecklist.length,
    statusCounts,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    safetyContract: [
      'This script is a read-only Stage 01 operator status board; it never edits src/data/sajikSeatData.ts.',
      'It merges operator input, prewrite, apply-ready, and post-apply audit reports into row-level statuses.',
      'APPROVED rows can become APPLIED only when post-apply audit confirms current production data matches the patch payload.',
      'NOT_APPLIED rows require a manual data patch review using sajik-seatmap-stage01-prewrite.patch-preview.ts.',
      'Alias-only sections and accessibility markers are not writable in Stage 01.',
    ],
    rowStatusLegend: {
      PENDING: 'No operator decision yet.',
      APPROVED: 'Raw operator decision only; final rowStatus is APPLIED, NOT_APPLIED, or INVALID.',
      REJECTED: 'Operator rejected the candidate; no production patch preview should be applied.',
      NEEDS_RETRACE: 'Operator requested retracing; no production patch preview should be applied.',
      KEEP_CURRENT: 'Operator chose to keep the current production geometry; no production patch preview should be applied.',
      INVALID: 'Operator-approved row is malformed or blocked by prewrite/apply-ready validation.',
      APPLIED: 'Operator-approved row matches current production hitPath/labelPoint data.',
      NOT_APPLIED: 'Operator-approved row is valid but current production data does not match yet.',
    },
    rows,
    manualPatchChecklist,
  };

  await fs.mkdir(stageDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'sectionId',
      'batchId',
      'zoneId',
      'operatorDecision',
      'rowStatus',
      'action',
      'validForPatchPreview',
      'geometryDelta',
      'postApplyStatus',
      'reviewer',
      'reviewedAt',
      'reasons',
      'warnings',
    ],
    ...rows.map((row) => [
      row.sectionId,
      row.batchId,
      row.zoneId,
      row.operatorDecision,
      row.rowStatus,
      row.action,
      row.validForPatchPreview,
      row.geometryDelta,
      row.postApplyStatus,
      row.reviewer,
      row.reviewedAt,
      [
        ...row.prewriteReasons,
        ...row.applyReadyReasons,
        ...row.postApplyReasons,
      ].join('; '),
      [
        ...row.prewriteWarnings,
        ...row.applyReadyWarnings,
      ].join('; '),
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# Sajik Stage 01 Operator Status',
    '',
    `- status version: \`${STATUS_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- valid approved rows: \`${summary.validApprovedRows}\``,
    `- applied rows: \`${summary.appliedRows}\``,
    `- not applied rows: \`${summary.notAppliedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- keep current rows: \`${summary.keepCurrentRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- manual patch checklist rows: \`${summary.manualPatchChecklistRows}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Rows',
    '',
    markdownTable(
      ['section', 'batch', 'zone', 'decision', 'row status', 'action', 'valid', 'delta', 'post-apply', 'reasons'],
      rows.map((row) => [
        `\`${row.sectionId}\``,
        `\`${row.batchId}\``,
        `\`${row.zoneId}\``,
        `\`${row.operatorDecision}\``,
        `\`${row.rowStatus}\``,
        `\`${row.action}\``,
        `\`${row.validForPatchPreview}\``,
        `\`${row.geometryDelta}\``,
        `\`${row.postApplyStatus}\``,
        [
          ...row.prewriteReasons,
          ...row.applyReadyReasons,
          ...row.postApplyReasons,
        ].join('; ') || '-',
      ]),
    ),
    '',
    '## Manual Patch Checklist',
    '',
    manualPatchChecklist.length > 0
      ? markdownTable(
        ['section', 'batch', 'hitPath source', 'labelPoint', 'labelX/Y', 'visual locked', 'source preview'],
        manualPatchChecklist.map((item) => [
          `\`${item.sectionId}\``,
          `\`${item.batchId}\``,
          `\`${item.applyHitPathFrom}\``,
          `\`${JSON.stringify(item.labelPoint)}\``,
          `\`${item.legacyLabelX},${item.legacyLabelY}\``,
          `\`${item.visualPathLocked}\``,
          `\`${item.sourcePreview}\``,
        ]),
      )
      : 'No manual Stage 01 data patch is currently required.',
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No operator status blockers.',
    '',
    '## Warnings',
    '',
    warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`stage01_operator_status_json:${path.relative(frontendRoot, jsonPath)}`);
  console.log(`stage01_operator_status_csv:${path.relative(frontendRoot, csvPath)}`);
  console.log(`stage01_operator_status_markdown:${path.relative(frontendRoot, markdownPath)}`);
  console.log(`status:${summary.status} approved=${summary.approvedRows} applied=${summary.appliedRows} notApplied=${summary.notAppliedRows} pending=${summary.pendingRows} invalid=${summary.invalidRows} blockers=${summary.blockers.length}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01PostApplyAudit = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { buildSajikSeatMapDataset } = await import("../src/data/sajikSeatMapDataset.ts");
  const { SAJIK_BLOCKS } = await import("../src/data/sajikSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultStageDir = path.join(reportDir, 'sajik-stage01-operator');
  const defaultPrewritePath = path.join(defaultStageDir, 'sajik-seatmap-stage01-prewrite.json');

  const POST_APPLY_AUDIT_VERSION = 'SAJIK_STAGE01_POST_APPLY_AUDIT_V1';
  const REQUIRED_PREWRITE_VERSION = 'SAJIK_STAGE01_PREWRITE_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const hasFlag = (name) => process.argv.includes(name);

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const samePoint = (left, right) => (
    Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index])
  );

  const labelPointFromBlock = (block) => (
    block?.imageGeometry?.labelPoint ?? [block?.imageGeometry?.labelX, block?.imageGeometry?.labelY]
  );

  const sameLegacyLabel = (block, labelPoint) => (
    Boolean(block)
    && Array.isArray(labelPoint)
    && block.imageGeometry.labelX === labelPoint[0]
    && block.imageGeometry.labelY === labelPoint[1]
  );

  const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
  const prewritePath = path.resolve(frontendRoot, argValue('--prewrite', defaultPrewritePath));
  const requireApplied = hasFlag('--require-applied');
  const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-post-apply-audit.json');
  const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-post-apply-audit.md');

  const prewrite = await readJson(prewritePath);
  const prewriteSummary = prewrite.summary ?? {};
  const patchPayloads = Array.isArray(prewrite.patchPayloads) ? prewrite.patchPayloads : [];
  const dataset = buildSajikSeatMapDataset();
  const sectionsById = new Map(dataset.sections.map((section) => [section.sectionId, section]));
  const blocksBySectionId = new Map(SAJIK_BLOCKS.map((block) => [block.block, block]));

  const blockers = [];
  const warnings = [];

  if (prewriteSummary.prewriteVersion !== REQUIRED_PREWRITE_VERSION) {
    blockers.push(`PREWRITE_VERSION_MISMATCH:${prewriteSummary.prewriteVersion ?? ''}`);
  }
  if (prewriteSummary.stadiumId !== dataset.stadiumId) {
    blockers.push(`STADIUM_ID_MISMATCH:${prewriteSummary.stadiumId ?? ''}:${dataset.stadiumId}`);
  }
  if (prewriteSummary.mapVersion !== dataset.mapVersion) {
    blockers.push(`MAP_VERSION_MISMATCH:${prewriteSummary.mapVersion ?? ''}:${dataset.mapVersion}`);
  }
  if (prewriteSummary.viewBox !== dataset.image.viewBox) {
    blockers.push(`VIEWBOX_MISMATCH:${prewriteSummary.viewBox ?? ''}:${dataset.image.viewBox}`);
  }
  if (prewriteSummary.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`TARGET_STAGE_MISMATCH:${prewriteSummary.targetStage ?? ''}`);
  }
  if (prewriteSummary.status === 'blocked') {
    blockers.push(...(prewriteSummary.blockers ?? []).map((blocker) => `PREWRITE_BLOCKED:${blocker}`));
  }
  if (prewriteSummary.productionDataChanged !== false) {
    blockers.push('PREWRITE_PRODUCTION_DATA_CHANGED');
  }
  if (prewriteSummary.productionWriteAllowed !== false) {
    blockers.push('PREWRITE_PRODUCTION_WRITE_ALLOWED');
  }

  if (patchPayloads.length === 0) {
    warnings.push('NO_APPROVED_PATCH_PAYLOADS_TO_AUDIT');
  }

  const rowAudits = patchPayloads.map((payload) => {
    const section = sectionsById.get(payload.sectionId);
    const block = blocksBySectionId.get(payload.sectionId);
    const reasons = [];
    const blockingReasons = [];

    if (!section) {
      blockingReasons.push('CURRENT_SECTION_NOT_FOUND');
    }
    if (!block) {
      blockingReasons.push('CURRENT_BLOCK_NOT_FOUND');
    }
    if (payload.sectionKind !== 'SEAT_SECTION') {
      blockingReasons.push(`PATCH_PAYLOAD_SECTION_KIND_NOT_WRITABLE:${payload.sectionKind ?? ''}`);
    }
    if (payload.validation?.status !== 'PASS') {
      blockingReasons.push(`PATCH_VALIDATION_NOT_PASS:${payload.validation?.status ?? ''}`);
    }

    const hitPathChanged = payload.before?.hitPath !== payload.after?.hitPath;
    const labelPointChanged = !samePoint(payload.before?.labelPoint, payload.after?.labelPoint);
    const hitPathMatchesBefore = section?.hitPath === payload.before?.hitPath;
    const hitPathMatchesAfter = section?.hitPath === payload.after?.hitPath;
    const labelPointMatchesBefore = samePoint(section?.labelPoint, payload.before?.labelPoint);
    const labelPointMatchesAfter = samePoint(section?.labelPoint, payload.after?.labelPoint);
    const legacyLabelMatchesCurrent = sameLegacyLabel(block, section ? labelPointFromBlock(block) : null);
    const legacyLabelMatchesBefore = sameLegacyLabel(block, payload.before?.labelPoint);
    const legacyLabelMatchesAfter = sameLegacyLabel(block, payload.after?.labelPoint);
    const visualPathLocked = section?.visualPath === payload.before?.visualPath
      && payload.before?.visualPath === payload.after?.visualPath;

    if (section && !visualPathLocked) {
      blockingReasons.push('LOCKED_FIELD_MUTATED:visualPath');
    }
    if (section && !hitPathMatchesAfter) {
      reasons.push('CURRENT_HIT_PATH_NOT_APPLIED');
    }
    if (section && !labelPointMatchesAfter) {
      reasons.push('CURRENT_LABEL_POINT_NOT_APPLIED');
    }
    if (block && block.imageGeometry.labelX !== payload.after?.labelPoint?.[0]) {
      reasons.push('CURRENT_LABEL_X_NOT_APPLIED');
    }
    if (block && block.imageGeometry.labelY !== payload.after?.labelPoint?.[1]) {
      reasons.push('CURRENT_LABEL_Y_NOT_APPLIED');
    }
    if (hitPathChanged && hitPathMatchesAfter && (!labelPointMatchesAfter || !legacyLabelMatchesAfter)) {
      blockingReasons.push('PARTIAL_APPLY_HITPATH_ONLY');
    }
    if (labelPointChanged && labelPointMatchesAfter && legacyLabelMatchesAfter && !hitPathMatchesAfter) {
      blockingReasons.push('PARTIAL_APPLY_LABEL_ONLY');
    }
    if (section && block && !legacyLabelMatchesCurrent) {
      blockingReasons.push('LEGACY_LABEL_DRIFT');
    } else if (section && block && labelPointMatchesAfter && !legacyLabelMatchesAfter) {
      blockingReasons.push('LEGACY_LABEL_DRIFT');
    }
    if (section && hitPathChanged && !hitPathMatchesBefore && !hitPathMatchesAfter) {
      blockingReasons.push('STALE_BEFORE_SNAPSHOT_HIT_PATH');
    }
    if (section && labelPointChanged && !labelPointMatchesBefore && !labelPointMatchesAfter) {
      blockingReasons.push('STALE_BEFORE_SNAPSHOT_LABEL_POINT');
    }
    if (block && block.imageGeometry.geometryVersion !== 'manual-polygon-v2') {
      blockingReasons.push(`LOCKED_FIELD_MUTATED:geometryVersion:${block.imageGeometry.geometryVersion ?? ''}`);
    }
    if (block && block.sectionKind !== 'SEAT_SECTION') {
      blockingReasons.push(`LOCKED_FIELD_MUTATED:sectionKind:${block.sectionKind ?? ''}`);
    }
    if (block && block.mapInteractionStatus !== 'MAP_SELECTABLE') {
      blockingReasons.push(`LOCKED_FIELD_MUTATED:mapInteractionStatus:${block.mapInteractionStatus ?? ''}`);
    }
    if (block && block.markerType) {
      blockingReasons.push(`LOCKED_FIELD_MUTATED:markerType:${block.markerType}`);
    }

    const applied = reasons.length === 0 && blockingReasons.length === 0;
    let applyState = 'applied';
    if (!applied) {
      applyState = blockingReasons.length > 0 ? 'blocked' : 'not-applied';
    }
    return {
      sectionId: payload.sectionId,
      blockId: payload.blockId,
      applied,
      applyState,
      hitPathChanged,
      labelPointChanged,
      hitPathMatchesBefore,
      hitPathMatches: hitPathMatchesAfter,
      labelPointMatchesBefore,
      labelPointMatches: labelPointMatchesAfter,
      legacyLabelMatchesBefore,
      legacyLabelMatches: legacyLabelMatchesAfter,
      visualPathLocked,
      reasons,
      blockingReasons,
    };
  });

  const unappliedRows = rowAudits.filter((row) => !row.applied);
  const blockedRows = rowAudits.filter((row) => row.blockingReasons.length > 0);
  blockedRows.forEach((row) => {
    row.blockingReasons.forEach((reason) => blockers.push(`${reason}:${row.sectionId}`));
  });
  const derivedStatus = blockers.length > 0
    ? 'blocked'
    : patchPayloads.length === 0
      ? 'waiting-for-operator'
      : unappliedRows.length === 0
        ? 'applied'
        : 'not-applied';

  if (requireApplied && derivedStatus === 'not-applied') {
    blockers.push(`REQUIRE_APPLIED_UNMATCHED_ROWS:${unappliedRows.map((row) => row.sectionId).join(' ')}`);
  }

  const status = blockers.length > 0 ? 'blocked' : derivedStatus;
  const summary = {
    postApplyAuditVersion: POST_APPLY_AUDIT_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    prewrite: path.relative(frontendRoot, prewritePath),
    requireApplied,
    stadiumId: dataset.stadiumId,
    mapVersion: dataset.mapVersion,
    viewBox: dataset.image.viewBox,
    targetStage: TARGET_STAGE_LABEL,
    approvedPatchPayloads: patchPayloads.length,
    appliedRows: rowAudits.filter((row) => row.applied).length,
    unappliedRows: unappliedRows.length,
    blockedRows: blockedRows.length,
    readOnly: true,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    safetyContract: [
      'This script is a read-only post-apply audit; it never edits src/data/sajikSeatData.ts.',
      'It compares Stage 01 prewrite patch payloads with the current production dataset.',
      'A not-applied status is expected before manual data patch review has been applied.',
      'Partial apply, stale before snapshot, legacy label drift, and locked field mutations are blocking states.',
      'Use --require-applied only after a manual data patch is expected to be present.',
    ],
    rows: rowAudits,
  };

  await fs.mkdir(stageDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, [
    '# Sajik Stage 01 Post-Apply Audit',
    '',
    `- audit version: \`${POST_APPLY_AUDIT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- prewrite: \`${summary.prewrite}\``,
    `- approved patch payloads: \`${summary.approvedPatchPayloads}\``,
    `- applied rows: \`${summary.appliedRows}\``,
    `- unapplied rows: \`${summary.unappliedRows}\``,
    `- blocked rows: \`${summary.blockedRows}\``,
    `- read only: \`${summary.readOnly}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Rows',
    '',
    rowAudits.length > 0
      ? markdownTable(
        ['section', 'state', 'applied', 'hitPath', 'labelPoint', 'labelX/Y', 'visual locked', 'reasons', 'blocking reasons'],
        rowAudits.map((row) => [
          `\`${row.sectionId}\``,
          `\`${row.applyState}\``,
          `\`${row.applied}\``,
          `\`${row.hitPathMatches}\``,
          `\`${row.labelPointMatches}\``,
          `\`${row.legacyLabelMatches}\``,
          `\`${row.visualPathLocked}\``,
          row.reasons.length > 0 ? row.reasons.join('; ') : '-',
          row.blockingReasons.length > 0 ? row.blockingReasons.join('; ') : '-',
        ]),
      )
      : 'No approved Stage 01 patch payloads are available for post-apply audit.',
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No post-apply blockers.',
    '',
    '## Warnings',
    '',
    warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`stage01_post_apply_audit_json:${path.relative(frontendRoot, jsonPath)}`);
  console.log(`stage01_post_apply_audit_markdown:${path.relative(frontendRoot, markdownPath)}`);
  console.log(`status:${summary.status} approvedPatchPayloads=${summary.approvedPatchPayloads} applied=${summary.appliedRows} unapplied=${summary.unappliedRows} blockedRows=${summary.blockedRows} blockers=${summary.blockers.length} readOnly=${summary.readOnly}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01PrewriteSmoke = async () => {
  const { execFile } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { promisify } = await import("node:util");
  const { buildSajikSeatMapDataset } = await import("../src/data/sajikSeatMapDataset.ts");
  const { distanceToPolygon, pathToPoints, pointInPolygon, pointsToPath } = await import("../src/utils/seatMapPolygonValidator.ts");

  const execFileAsync = promisify(execFile);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const stageDir = path.join(reportDir, 'sajik-stage01-operator');
  const smokeRootDir = path.join(stageDir, 'smoke');
  const baseInputPath = path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json');
  const summaryJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-prewrite-smoke.json');
  const summaryMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-prewrite-smoke.md');

  const SMOKE_VERSION = 'SAJIK_STAGE01_PREWRITE_SMOKE_V1';
  const SMOKE_REVIEWER = 'STAGE01_SMOKE_OPERATOR';
  const SMOKE_REVIEWED_AT = '2026-05-14T00:00:00.000Z';
  const TARGET_APPROVAL_GATE_VERSION = 'SAJIK_STAGE01_TARGET_APPROVAL_GATE_V1';
  const TARGET_APPROVAL_SECTION_ID = '131';
  const TARGET_SOURCE_FILE = 'src/data/sajikSeatData.ts';

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
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

  const normalizePath = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

  const pendingSmokeInput = (input) => {
    const clone = cloneJson(input);
    for (const row of clone.corrections ?? []) {
      row.operatorDecision = 'PENDING';
      row.correctedPath = '';
      row.correctedLabelX = '';
      row.correctedLabelY = '';
      row.reviewer = '';
      row.reviewedAt = '';
      row.operatorNote = '';
      row.editableSource = 'emptyTemplate';
    }
    return clone;
  };

  const numberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const sectionRowFromDataset = (templateRow, section) => ({
    ...templateRow,
    sectionId: section.sectionId,
    sectionName: section.sectionName,
    blockId: section.blockId,
    seatCategoryLabel: section.seatCategoryLabel,
    level: section.level,
    floor: section.floor,
    side: section.side,
    sectionKind: section.sectionKind,
    mapInteractionStatus: section.mapInteractionStatus,
    currentVisualPath: section.visualPath,
    currentHitPath: section.hitPath,
    currentLabelX: section.labelPoint[0],
    currentLabelY: section.labelPoint[1],
    currentLabelPoint: section.labelPoint,
    correctedPath: section.hitPath,
    correctedLabelX: section.labelPoint[0],
    correctedLabelY: section.labelPoint[1],
    operatorDecision: 'APPROVED',
    reviewer: SMOKE_REVIEWER,
    reviewedAt: SMOKE_REVIEWED_AT,
    operatorNote: 'Smoke fixture row; must never be copied to production data.',
  });

  const setApprovedNoDelta = (input, sectionId) => {
    const row = input.corrections.find((candidate) => candidate.sectionId === sectionId);
    if (!row) {
      throw new Error(`Missing Stage 01 smoke target row: ${sectionId}`);
    }
    row.operatorDecision = 'APPROVED';
    row.correctedPath = row.currentHitPath;
    row.correctedLabelX = row.currentLabelX;
    row.correctedLabelY = row.currentLabelY;
    row.reviewer = SMOKE_REVIEWER;
    row.reviewedAt = SMOKE_REVIEWED_AT;
    row.operatorNote = 'Smoke fixture approval using the current hitPath; expects no production geometry delta.';
  };

  const setApprovedWithDelta = (input, sectionId) => {
    const row = input.corrections.find((candidate) => candidate.sectionId === sectionId);
    if (!row) {
      throw new Error(`Missing Stage 01 smoke target row: ${sectionId}`);
    }
    const points = pathToPoints(row.currentHitPath);
    if (points.length < 3) {
      throw new Error(`Cannot create Stage 01 delta fixture for ${sectionId}; currentHitPath has too few points.`);
    }

    const adjustedPoints = points.map(([x, y], index) => (
      index === 0 ? [Number((x + 0.5).toFixed(2)), Number((y + 0.5).toFixed(2))] : [x, y]
    ));
    row.operatorDecision = 'APPROVED';
    row.correctedPath = pointsToPath(adjustedPoints);
    row.correctedLabelX = row.currentLabelX;
    row.correctedLabelY = row.currentLabelY;
    row.reviewer = SMOKE_REVIEWER;
    row.reviewedAt = SMOKE_REVIEWED_AT;
    row.operatorNote = 'Smoke fixture approval with a tiny valid hitPath delta; must produce a manual apply candidate.';
  };

  const getMutableCorrectionRow = (input, sectionId) => {
    const row = input.corrections.find((candidate) => candidate.sectionId === sectionId);
    if (!row) {
      throw new Error(`Missing Stage 01 smoke target row: ${sectionId}`);
    }
    return row;
  };

  const boundsForPoints = (points) => {
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  };

  const centerForPoints = (points) => {
    const bounds = boundsForPoints(points);
    return [
      Number(((bounds.minX + bounds.maxX) / 2).toFixed(2)),
      Number(((bounds.minY + bounds.maxY) / 2).toFixed(2)),
    ];
  };

  const setApprovedLargeArea = (input, sectionId) => {
    const row = getMutableCorrectionRow(input, sectionId);
    row.operatorDecision = 'APPROVED';
    row.correctedPath = 'M 0 0 L 960 0 L 960 640 L 0 640 Z';
    row.correctedLabelX = 480;
    row.correctedLabelY = 320;
    row.reviewer = SMOKE_REVIEWER;
    row.reviewedAt = SMOKE_REVIEWED_AT;
    row.operatorNote = 'Smoke fixture huge correctedPath; must be blocked by the geometry quality gate.';
  };

  const setApprovedExcessivePointCount = (input, sectionId) => {
    const row = getMutableCorrectionRow(input, sectionId);
    const points = pathToPoints(row.currentHitPath);
    if (points.length < 3) {
      throw new Error(`Cannot create excessive point count fixture for ${sectionId}; currentHitPath has too few points.`);
    }
    const bounds = boundsForPoints(points);
    const [centerX, centerY] = centerForPoints(points);
    const radiusX = Math.max(1, (bounds.maxX - bounds.minX) / 2);
    const radiusY = Math.max(1, (bounds.maxY - bounds.minY) / 2);
    const correctedPoints = Array.from({ length: 72 }, (_, index) => {
      const radians = (Math.PI * 2 * index) / 72;
      return [
        Number((centerX + (Math.cos(radians) * radiusX)).toFixed(2)),
        Number((centerY + (Math.sin(radians) * radiusY)).toFixed(2)),
      ];
    });
    row.operatorDecision = 'APPROVED';
    row.correctedPath = pointsToPath(correctedPoints);
    row.correctedLabelX = centerX;
    row.correctedLabelY = centerY;
    row.reviewer = SMOKE_REVIEWER;
    row.reviewedAt = SMOKE_REVIEWED_AT;
    row.operatorNote = 'Smoke fixture excessive vertex count; must be blocked by the geometry quality gate.';
  };

  const findNearBoundaryLabelPoint = (pathData) => {
    const points = pathToPoints(pathData);
    const [centerX, centerY] = centerForPoints(points);
    const centroid = [centerX, centerY];
    const insetRatios = [0.005, 0.01, 0.015, 0.02, 0.03, 0.05, 0.08, 0.1];

    for (const vertex of points) {
      for (const ratio of insetRatios) {
        const candidate = [
          Number((vertex[0] + ((centroid[0] - vertex[0]) * ratio)).toFixed(2)),
          Number((vertex[1] + ((centroid[1] - vertex[1]) * ratio)).toFixed(2)),
        ];
        if (pointInPolygon(candidate, points) && distanceToPolygon(candidate, points) <= 1) {
          return candidate;
        }
      }
    }

    throw new Error('Could not find a label point inside the path and within 1px of its boundary.');
  };

  const setApprovedLabelNearBoundary = (input, sectionId) => {
    const row = getMutableCorrectionRow(input, sectionId);
    const [labelX, labelY] = findNearBoundaryLabelPoint(row.currentHitPath);
    row.operatorDecision = 'APPROVED';
    row.correctedPath = row.currentHitPath;
    row.correctedLabelX = labelX;
    row.correctedLabelY = labelY;
    row.reviewer = SMOKE_REVIEWER;
    row.reviewedAt = SMOKE_REVIEWED_AT;
    row.operatorNote = 'Smoke fixture label inside polygon but within 1px of boundary; must warn without blocking.';
  };

  const setApprovedPixelCandidateCopyNote = (input, sectionId) => {
    const row = getMutableCorrectionRow(input, sectionId);
    row.operatorDecision = 'APPROVED';
    row.correctedPath = row.currentHitPath;
    row.correctedLabelX = row.currentLabelX;
    row.correctedLabelY = row.currentLabelY;
    row.reviewer = SMOKE_REVIEWER;
    row.reviewedAt = SMOKE_REVIEWED_AT;
    row.operatorNote = 'Smoke fixture says pixel candidate copied and pasted; must warn for human review without blocking.';
  };

  const targetApprovalGateSelectedEntryForRow = (row) => ({
    source: 'operator-input',
    sectionId: row.sectionId,
    operatorDecision: row.operatorDecision,
    correctedPath: normalizePath(row.correctedPath),
    correctedLabelX: numberOrNull(row.correctedLabelX),
    correctedLabelY: numberOrNull(row.correctedLabelY),
    reviewer: String(row.reviewer ?? '').trim(),
    reviewedAt: String(row.reviewedAt ?? '').trim(),
    operatorNote: String(row.operatorNote ?? '').trim(),
  });

  const buildTargetApprovalGateForInput = ({ input, caseInputPath, overrides = {}, selectedEntryOverrides = {} }) => {
    const row = getMutableCorrectionRow(input, TARGET_APPROVAL_SECTION_ID);
    const selectedEntry = {
      ...targetApprovalGateSelectedEntryForRow(row),
      ...selectedEntryOverrides,
    };
    const summary = {
      gateVersion: TARGET_APPROVAL_GATE_VERSION,
      status: 'ready-for-prewrite',
      targetSectionId: TARGET_APPROVAL_SECTION_ID,
      targetEntryPreflight: path.relative(frontendRoot, path.join(path.dirname(caseInputPath), 'targets/131-entry-preflight.json')),
      targetEntryPreflightStatus: 'ready-for-approval-gate',
      targetEntryPreflightReadyForApprovalGate: true,
      targetEntryPreflightSelectedSource: 'operator-input',
      targetEntryPreflightSelectedDecision: 'APPROVED',
      operatorInput: path.relative(frontendRoot, caseInputPath),
      selectedSource: 'operator-input',
      selectedDecision: 'APPROVED',
      readyForPrewrite: true,
      approved: true,
      targetSourceFile: TARGET_SOURCE_FILE,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      writesOperatorInput: false,
      writesProductionData: false,
      blockers: [],
      warnings: [],
      ...overrides,
    };

    return {
      generatedAt: new Date().toISOString(),
      summary,
      selectedEntry,
    };
  };

  const setInvalidApproved = (input, sectionId) => {
    const row = getMutableCorrectionRow(input, sectionId);
    row.operatorDecision = 'APPROVED';
    row.correctedPath = 'M 0 0 L 10 0 Z';
    row.correctedLabelX = '';
    row.correctedLabelY = '';
    row.reviewer = '';
    row.reviewedAt = 'not-a-date';
    row.operatorNote = 'Smoke fixture invalid approval; must be blocked by prewrite.';
  };

  const setInvalidPathApproved = (input, sectionId) => {
    const row = getMutableCorrectionRow(input, sectionId);
    row.operatorDecision = 'APPROVED';
    row.correctedPath = 'M 0 0 L 10 0 Z';
    row.correctedLabelX = 5;
    row.correctedLabelY = 0;
    row.reviewer = SMOKE_REVIEWER;
    row.reviewedAt = SMOKE_REVIEWED_AT;
    row.operatorNote = 'Smoke fixture invalid path; must be blocked before patch preview.';
  };

  const setInvalidLabelApproved = (input, sectionId) => {
    const row = getMutableCorrectionRow(input, sectionId);
    row.operatorDecision = 'APPROVED';
    row.correctedPath = row.currentHitPath;
    row.correctedLabelX = 0;
    row.correctedLabelY = 0;
    row.reviewer = SMOKE_REVIEWER;
    row.reviewedAt = SMOKE_REVIEWED_AT;
    row.operatorNote = 'Smoke fixture invalid labelPoint; must be blocked before patch preview.';
  };

  const setUnknownSectionApproved = (input, sectionId) => {
    const row = getMutableCorrectionRow(input, sectionId);
    row.sectionId = '999-UNKNOWN';
    row.blockId = '999-UNKNOWN';
    row.sectionName = 'Unknown smoke section';
    row.operatorDecision = 'APPROVED';
    row.correctedPath = row.currentHitPath;
    row.correctedLabelX = row.currentLabelX;
    row.correctedLabelY = row.currentLabelY;
    row.reviewer = SMOKE_REVIEWER;
    row.reviewedAt = SMOKE_REVIEWED_AT;
    row.operatorNote = 'Smoke fixture unknown section; must be blocked before patch preview.';
  };

  const setForbiddenRows = (input, dataset) => {
    const aliasOnlySection = dataset.sections.find((section) => section.sectionKind === 'ALIAS_ONLY');
    const markerSection = dataset.sections.find((section) => section.sectionKind === 'ACCESSIBILITY_MARKER');
    if (!aliasOnlySection || !markerSection) {
      throw new Error('Missing alias-only or accessibility marker section for Sajik Stage 01 smoke.');
    }

    input.corrections[0] = sectionRowFromDataset(input.corrections[0], aliasOnlySection);
    input.corrections[1] = sectionRowFromDataset(input.corrections[1], markerSection);
  };

  const setDecisionRows = (input) => {
    const rejectedRow = input.corrections.find((candidate) => candidate.sectionId === '021');
    const needsRetraceRow = input.corrections.find((candidate) => candidate.sectionId === '022');
    const keepCurrentRow = input.corrections.find((candidate) => candidate.sectionId === '031');
    if (!rejectedRow || !needsRetraceRow || !keepCurrentRow) {
      throw new Error('Missing Stage 01 smoke decision rows: 021/022/031');
    }

    rejectedRow.operatorDecision = 'REJECTED';
    rejectedRow.operatorNote = 'Smoke fixture rejection; must stay out of patch preview.';
    needsRetraceRow.operatorDecision = 'NEEDS_RETRACE';
    needsRetraceRow.operatorNote = 'Smoke fixture retrace request; must stay out of patch preview.';
    keepCurrentRow.operatorDecision = 'KEEP_CURRENT';
    keepCurrentRow.reviewer = SMOKE_REVIEWER;
    keepCurrentRow.reviewedAt = SMOKE_REVIEWED_AT;
    keepCurrentRow.operatorNote = 'Smoke fixture keep-current decision; must stay out of patch preview.';
  };

  const setMixedRows = (input) => {
    setApprovedWithDelta(input, '021');
    const rejectedRow = input.corrections.find((candidate) => candidate.sectionId === '022');
    const keepCurrentRow = input.corrections.find((candidate) => candidate.sectionId === '031');
    if (!rejectedRow || !keepCurrentRow) {
      throw new Error('Missing Stage 01 smoke mixed rows: 022/031');
    }
    rejectedRow.operatorDecision = 'REJECTED';
    rejectedRow.operatorNote = 'Smoke fixture mixed rejection; must stay out of patch preview.';
    keepCurrentRow.operatorDecision = 'KEEP_CURRENT';
    keepCurrentRow.reviewer = SMOKE_REVIEWER;
    keepCurrentRow.reviewedAt = SMOKE_REVIEWED_AT;
    keepCurrentRow.operatorNote = 'Smoke fixture mixed keep-current; must stay out of patch preview.';
  };

  const tamperVisualPathForReadiness = ({ prewriteReport }) => {
    const payload = prewriteReport.patchPayloads?.[0];
    if (!payload) {
      throw new Error('tampered-visual-path-readiness requires a patch payload.');
    }
    payload.after.visualPath = payload.after.visualPath.replace(/Z\s*$/u, ' L 0 0 Z');
    const reviewRow = prewriteReport.patchReviewRows?.[0];
    if (reviewRow) {
      reviewRow.visualPathLocked = false;
    }
  };

  const tamperTargetSourceForReadiness = ({ manualPatchPlanReport }) => {
    manualPatchPlanReport.summary.targetSourceFile = 'src/data/notSajikSeatData.ts';
    for (const row of manualPatchPlanReport.rows ?? []) {
      row.targetSourceFile = 'src/data/notSajikSeatData.ts';
    }
  };

  const simulateAppliedForReadiness = ({ postApplyReport, operatorStatusReport, manualPatchPlanReport }) => {
    const appliedSectionIds = new Set((postApplyReport.rows ?? []).map((row) => row.sectionId));
    const approvedRows = operatorStatusReport.summary?.approvedRows ?? appliedSectionIds.size;

    postApplyReport.summary.status = 'applied';
    postApplyReport.summary.appliedRows = appliedSectionIds.size;
    postApplyReport.summary.unappliedRows = 0;
    postApplyReport.summary.blockers = [];
    postApplyReport.summary.warnings = [];
    for (const row of postApplyReport.rows ?? []) {
      row.applied = true;
      row.hitPathMatches = true;
      row.labelPointMatches = true;
      row.legacyLabelMatches = true;
      row.visualPathLocked = true;
      row.reasons = [];
    }

    operatorStatusReport.summary.status = 'applied';
    operatorStatusReport.summary.appliedRows = approvedRows;
    operatorStatusReport.summary.notAppliedRows = 0;
    operatorStatusReport.summary.manualPatchChecklistRows = 0;
    operatorStatusReport.summary.statusCounts = {
      APPLIED: approvedRows,
      PENDING: Math.max(0, (operatorStatusReport.summary.totalRows ?? 0) - approvedRows),
    };
    operatorStatusReport.summary.warnings = [];
    for (const row of operatorStatusReport.rows ?? []) {
      if (appliedSectionIds.has(row.sectionId)) {
        row.rowStatus = 'APPLIED';
        row.action = 'NO_ACTION';
        row.postApplyStatus = 'applied';
        row.postApplyReasons = [];
      }
    }
    operatorStatusReport.manualPatchChecklist = [];

    manualPatchPlanReport.summary.status = 'applied';
    manualPatchPlanReport.summary.appliedRows = approvedRows;
    manualPatchPlanReport.summary.notAppliedRows = 0;
    manualPatchPlanReport.summary.manualPatchRows = 0;
    manualPatchPlanReport.summary.warnings = [];
    manualPatchPlanReport.rows = [];
  };

  const tamperPostApplyBlockedForReadiness = (reason) => ({ postApplyReport }) => {
    const row = postApplyReport.rows?.[0];
    if (!row) {
      throw new Error(`${reason} fixture requires a post-apply row.`);
    }
    postApplyReport.summary.status = 'blocked';
    postApplyReport.summary.blockers = [`${reason}:${row.sectionId}`];
    postApplyReport.summary.blockedRows = 1;
    postApplyReport.summary.unappliedRows = 1;
    row.applied = false;
    row.applyState = 'blocked';
    row.blockingReasons = [reason];
    row.reasons = [...(row.reasons ?? []), reason];
  };

  const runPrewrite = async ({
    caseId,
    input,
    targetApprovalGate = null,
    tamperReadinessReports = null,
  }) => {
    const caseDir = path.join(smokeRootDir, caseId);
    const caseInputPath = path.join(caseDir, 'sajik-seatmap-stage01-operator-input.json');
    const outputDir = path.join(caseDir, 'output');
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(caseInputPath, `${JSON.stringify(input, null, 2)}\n`, 'utf8');

    if (targetApprovalGate) {
      const targetDir = path.join(outputDir, 'targets');
      await fs.mkdir(targetDir, { recursive: true });
      const gate = typeof targetApprovalGate === 'function'
        ? targetApprovalGate({ input, caseInputPath, outputDir })
        : targetApprovalGate;
      await writeJson(path.join(targetDir, '131-approval-gate.json'), gate);
    }

    let inputAidExitCode = 0;
    let inputAidStdout = '';
    let inputAidStderr = '';
    try {
      const result = await execFileAsync(process.execPath, [
        '--import',
        'tsx',
        'scripts/sajik-seatmap-stage01.mjs',
        '--input',
        caseInputPath,
        '--stage-dir',
        outputDir,
      ], { cwd: frontendRoot });
      inputAidStdout = result.stdout;
      inputAidStderr = result.stderr;
    } catch (error) {
      inputAidExitCode = error?.code ?? 1;
      inputAidStdout = error?.stdout ?? '';
      inputAidStderr = error?.stderr ?? '';
    }
    const inputAidReportPath = path.join(outputDir, 'sajik-seatmap-stage01-operator-input-aid.json');
    const inputAidReport = await readJson(inputAidReportPath);

    let exitCode = 0;
    let stdout = '';
    let stderr = '';
    try {
      const result = await execFileAsync(process.execPath, [
        '--import',
        'tsx',
        'scripts/sajik-seatmap-stage01.mjs',
        '--input',
        caseInputPath,
        '--stage-dir',
        outputDir,
      ], { cwd: frontendRoot });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      exitCode = error?.code ?? 1;
      stdout = error?.stdout ?? '';
      stderr = error?.stderr ?? '';
    }

    const reportPath = path.join(outputDir, 'sajik-seatmap-stage01-prewrite.json');
    const patchPreviewPath = path.join(outputDir, 'sajik-seatmap-stage01-prewrite.patch-preview.ts');
    const report = await readJson(reportPath);
    const patchPreview = await fs.readFile(patchPreviewPath, 'utf8');

    let applyReadyExitCode = 0;
    let applyReadyStdout = '';
    let applyReadyStderr = '';
    try {
      const result = await execFileAsync(process.execPath, [
        '--import',
        'tsx',
        'scripts/sajik-seatmap-stage01.mjs',
        '--prewrite',
        reportPath,
        '--patch-preview',
        patchPreviewPath,
        '--stage-dir',
        outputDir,
      ], { cwd: frontendRoot });
      applyReadyStdout = result.stdout;
      applyReadyStderr = result.stderr;
    } catch (error) {
      applyReadyExitCode = error?.code ?? 1;
      applyReadyStdout = error?.stdout ?? '';
      applyReadyStderr = error?.stderr ?? '';
    }
    const applyReadyReportPath = path.join(outputDir, 'sajik-seatmap-stage01-apply-ready.json');
    const applyReadyReport = await readJson(applyReadyReportPath);

    let postApplyExitCode = 0;
    let postApplyStdout = '';
    let postApplyStderr = '';
    try {
      const result = await execFileAsync(process.execPath, [
        '--import',
        'tsx',
        'scripts/sajik-seatmap-stage01.mjs',
        '--prewrite',
        reportPath,
        '--stage-dir',
        outputDir,
      ], { cwd: frontendRoot });
      postApplyStdout = result.stdout;
      postApplyStderr = result.stderr;
    } catch (error) {
      postApplyExitCode = error?.code ?? 1;
      postApplyStdout = error?.stdout ?? '';
      postApplyStderr = error?.stderr ?? '';
    }
    const postApplyReportPath = path.join(outputDir, 'sajik-seatmap-stage01-post-apply-audit.json');
    const postApplyReport = await readJson(postApplyReportPath);

    let operatorStatusExitCode = 0;
    let operatorStatusStdout = '';
    let operatorStatusStderr = '';
    try {
      const result = await execFileAsync(process.execPath, [
        '--import',
        'tsx',
        'scripts/sajik-seatmap-stage01.mjs',
        '--operator-input',
        caseInputPath,
        '--prewrite',
        reportPath,
        '--apply-ready',
        applyReadyReportPath,
        '--post-apply',
        postApplyReportPath,
        '--stage-dir',
        outputDir,
      ], { cwd: frontendRoot });
      operatorStatusStdout = result.stdout;
      operatorStatusStderr = result.stderr;
    } catch (error) {
      operatorStatusExitCode = error?.code ?? 1;
      operatorStatusStdout = error?.stdout ?? '';
      operatorStatusStderr = error?.stderr ?? '';
    }
    const operatorStatusReportPath = path.join(outputDir, 'sajik-seatmap-stage01-operator-status.json');
    const operatorStatusReport = await readJson(operatorStatusReportPath);

    let manualPatchPlanExitCode = 0;
    let manualPatchPlanStdout = '';
    let manualPatchPlanStderr = '';
    try {
      const result = await execFileAsync(process.execPath, [
        '--import',
        'tsx',
        'scripts/sajik-seatmap-stage01.mjs',
        '--operator-status',
        operatorStatusReportPath,
        '--prewrite',
        reportPath,
        '--stage-dir',
        outputDir,
      ], { cwd: frontendRoot });
      manualPatchPlanStdout = result.stdout;
      manualPatchPlanStderr = result.stderr;
    } catch (error) {
      manualPatchPlanExitCode = error?.code ?? 1;
      manualPatchPlanStdout = error?.stdout ?? '';
      manualPatchPlanStderr = error?.stderr ?? '';
    }
    const manualPatchPlanReportPath = path.join(outputDir, 'sajik-seatmap-stage01-manual-patch-plan.json');
    const manualPatchPlanReport = await readJson(manualPatchPlanReportPath);

    if (tamperReadinessReports) {
      tamperReadinessReports({
        prewriteReport: report,
        applyReadyReport,
        postApplyReport,
        operatorStatusReport,
        manualPatchPlanReport,
      });
      await writeJson(reportPath, report);
      await writeJson(applyReadyReportPath, applyReadyReport);
      await writeJson(postApplyReportPath, postApplyReport);
      await writeJson(operatorStatusReportPath, operatorStatusReport);
      await writeJson(manualPatchPlanReportPath, manualPatchPlanReport);
    }

    let realApprovalReadinessExitCode = 0;
    let realApprovalReadinessStdout = '';
    let realApprovalReadinessStderr = '';
    try {
      const result = await execFileAsync(process.execPath, [
        '--import',
        'tsx',
        'scripts/sajik-seatmap-stage01.mjs',
        '--operator-input',
        caseInputPath,
        '--input-aid',
        inputAidReportPath,
        '--prewrite',
        reportPath,
        '--apply-ready',
        applyReadyReportPath,
        '--post-apply',
        postApplyReportPath,
        '--operator-status',
        operatorStatusReportPath,
        '--manual-patch-plan',
        manualPatchPlanReportPath,
        '--stage-dir',
        outputDir,
      ], { cwd: frontendRoot });
      realApprovalReadinessStdout = result.stdout;
      realApprovalReadinessStderr = result.stderr;
    } catch (error) {
      realApprovalReadinessExitCode = error?.code ?? 1;
      realApprovalReadinessStdout = error?.stdout ?? '';
      realApprovalReadinessStderr = error?.stderr ?? '';
    }
    const realApprovalReadinessReportPath = path.join(outputDir, 'sajik-seatmap-stage01-real-approval-readiness.json');
    const realApprovalReadinessReport = await readJson(realApprovalReadinessReportPath);

    return {
      caseId,
      input: path.relative(frontendRoot, caseInputPath),
      inputAidReport: path.relative(frontendRoot, inputAidReportPath),
      report: path.relative(frontendRoot, reportPath),
      patchPreview: path.relative(frontendRoot, patchPreviewPath),
      applyReadyReport: path.relative(frontendRoot, applyReadyReportPath),
      postApplyReport: path.relative(frontendRoot, postApplyReportPath),
      operatorStatusReport: path.relative(frontendRoot, operatorStatusReportPath),
      manualPatchPlanReport: path.relative(frontendRoot, manualPatchPlanReportPath),
      realApprovalReadinessReport: path.relative(frontendRoot, realApprovalReadinessReportPath),
      inputAidExitCode,
      exitCode,
      applyReadyExitCode,
      postApplyExitCode,
      operatorStatusExitCode,
      manualPatchPlanExitCode,
      realApprovalReadinessExitCode,
      inputAidStdout: inputAidStdout.trim(),
      inputAidStderr: inputAidStderr.trim(),
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      applyReadyStdout: applyReadyStdout.trim(),
      applyReadyStderr: applyReadyStderr.trim(),
      postApplyStdout: postApplyStdout.trim(),
      postApplyStderr: postApplyStderr.trim(),
      operatorStatusStdout: operatorStatusStdout.trim(),
      operatorStatusStderr: operatorStatusStderr.trim(),
      manualPatchPlanStdout: manualPatchPlanStdout.trim(),
      manualPatchPlanStderr: manualPatchPlanStderr.trim(),
      realApprovalReadinessStdout: realApprovalReadinessStdout.trim(),
      realApprovalReadinessStderr: realApprovalReadinessStderr.trim(),
      inputAidSummary: inputAidReport.summary,
      inputAidRows: inputAidReport.rows ?? [],
      summary: report.summary,
      applyReadySummary: applyReadyReport.summary,
      postApplySummary: postApplyReport.summary,
      operatorStatusSummary: operatorStatusReport.summary,
      operatorStatusRows: operatorStatusReport.rows ?? [],
      manualPatchPlanSummary: manualPatchPlanReport.summary,
      manualPatchPlanRows: manualPatchPlanReport.rows ?? [],
      realApprovalReadinessSummary: realApprovalReadinessReport.summary,
      realApprovalReadinessRows: realApprovalReadinessReport.rows ?? [],
      rows: report.rows,
      patchPayloadCount: report.patchPayloads?.length ?? 0,
      patchPreviewText: patchPreview,
    };
  };

  const includesText = (values, pattern) => values.some((value) => String(value).includes(pattern));

  const validateCase = (result, expectations) => {
    const assertions = [];
    const addAssertion = (name, passed, detail = '') => {
      assertions.push({ name, passed, detail });
    };

    addAssertion('exitCode', result.exitCode === expectations.exitCode, `${result.exitCode} !== ${expectations.exitCode}`);
    addAssertion('status', result.summary.status === expectations.status, `${result.summary.status} !== ${expectations.status}`);
    addAssertion('approvedRows', result.summary.approvedRows === expectations.approvedRows, `${result.summary.approvedRows} !== ${expectations.approvedRows}`);
    addAssertion('patchPreviewRows', result.summary.patchPreviewRows === expectations.patchPreviewRows, `${result.summary.patchPreviewRows} !== ${expectations.patchPreviewRows}`);
    addAssertion('productionDataChanged', result.summary.productionDataChanged === false, String(result.summary.productionDataChanged));
    addAssertion('productionWriteAllowed', result.summary.productionWriteAllowed === false, String(result.summary.productionWriteAllowed));

    if (expectations.inputAidStatus) {
      addAssertion('inputAidExitCode', result.inputAidExitCode === expectations.inputAidExitCode, `${result.inputAidExitCode} !== ${expectations.inputAidExitCode}`);
      addAssertion('inputAidStatus', result.inputAidSummary.status === expectations.inputAidStatus, `${result.inputAidSummary.status} !== ${expectations.inputAidStatus}`);
      addAssertion('inputAidReadyRows', result.inputAidSummary.readyForPrewriteRows === expectations.inputAidReadyRows, `${result.inputAidSummary.readyForPrewriteRows} !== ${expectations.inputAidReadyRows}`);
      addAssertion('inputAidRejectedRows', result.inputAidSummary.rejectedRows === expectations.inputAidRejectedRows, `${result.inputAidSummary.rejectedRows} !== ${expectations.inputAidRejectedRows}`);
      addAssertion('inputAidNeedsRetraceRows', result.inputAidSummary.needsRetraceRows === expectations.inputAidNeedsRetraceRows, `${result.inputAidSummary.needsRetraceRows} !== ${expectations.inputAidNeedsRetraceRows}`);
      if (expectations.inputAidKeepCurrentRows !== undefined) {
        addAssertion('inputAidKeepCurrentRows', result.inputAidSummary.keepCurrentRows === expectations.inputAidKeepCurrentRows, `${result.inputAidSummary.keepCurrentRows} !== ${expectations.inputAidKeepCurrentRows}`);
      }
      addAssertion('inputAidInvalidRows', result.inputAidSummary.invalidRows === expectations.inputAidInvalidRows, `${result.inputAidSummary.invalidRows} !== ${expectations.inputAidInvalidRows}`);
      addAssertion('inputAidProductionWriteAllowed', result.inputAidSummary.productionWriteAllowed === false, String(result.inputAidSummary.productionWriteAllowed));
      addAssertion('inputAidSourceDataWritePerformed', result.inputAidSummary.sourceDataWritePerformed === false, String(result.inputAidSummary.sourceDataWritePerformed));
    }
    if (expectations.inputAidRowStatus) {
      addAssertion(
        `inputAidRowStatus:${expectations.inputAidRowStatus}`,
        result.inputAidRows.some((row) => row.rowStatus === expectations.inputAidRowStatus),
      );
    }
    if (expectations.inputAidRowStatuses) {
      expectations.inputAidRowStatuses.forEach((rowStatus) => {
        addAssertion(
          `inputAidRowStatus:${rowStatus}`,
          result.inputAidRows.some((row) => row.rowStatus === rowStatus),
        );
      });
    }
    if (expectations.inputAidAction) {
      addAssertion(
        `inputAidAction:${expectations.inputAidAction}`,
        result.inputAidRows.some((row) => row.action === expectations.inputAidAction),
      );
    }
    if (expectations.inputAidRowWarning) {
      addAssertion(
        `inputAidRowWarning:${expectations.inputAidRowWarning}`,
        result.inputAidRows.some((row) => includesText(row.warnings ?? [], expectations.inputAidRowWarning)),
      );
    }
    if (expectations.inputAidNextActionIncludes) {
      addAssertion(
        `inputAidNextActionIncludes:${expectations.inputAidNextActionIncludes}`,
        result.inputAidRows.some((row) => String(row.nextAction ?? '').includes(expectations.inputAidNextActionIncludes)),
      );
    }

    if (expectations.applyReadyStatus) {
      addAssertion('applyReadyExitCode', result.applyReadyExitCode === expectations.applyReadyExitCode, `${result.applyReadyExitCode} !== ${expectations.applyReadyExitCode}`);
      addAssertion('applyReadyStatus', result.applyReadySummary.status === expectations.applyReadyStatus, `${result.applyReadySummary.status} !== ${expectations.applyReadyStatus}`);
      addAssertion('applyReadyProductionDataChanged', result.applyReadySummary.productionDataChanged === false, String(result.applyReadySummary.productionDataChanged));
      addAssertion('applyReadyProductionWriteAllowed', result.applyReadySummary.productionWriteAllowed === false, String(result.applyReadySummary.productionWriteAllowed));
      addAssertion('applyReadySourceDataWritePerformed', result.applyReadySummary.sourceDataWritePerformed === false, String(result.applyReadySummary.sourceDataWritePerformed));
    }
    if (expectations.postApplyStatus) {
      addAssertion('postApplyExitCode', result.postApplyExitCode === expectations.postApplyExitCode, `${result.postApplyExitCode} !== ${expectations.postApplyExitCode}`);
      addAssertion('postApplyStatus', result.postApplySummary.status === expectations.postApplyStatus, `${result.postApplySummary.status} !== ${expectations.postApplyStatus}`);
      addAssertion('postApplyReadOnly', result.postApplySummary.readOnly === true, String(result.postApplySummary.readOnly));
      addAssertion('postApplyProductionWriteAllowed', result.postApplySummary.productionWriteAllowed === false, String(result.postApplySummary.productionWriteAllowed));
      addAssertion('postApplySourceDataWritePerformed', result.postApplySummary.sourceDataWritePerformed === false, String(result.postApplySummary.sourceDataWritePerformed));
    }
    if (expectations.operatorStatus) {
      addAssertion('operatorStatusExitCode', result.operatorStatusExitCode === expectations.operatorStatusExitCode, `${result.operatorStatusExitCode} !== ${expectations.operatorStatusExitCode}`);
      addAssertion('operatorStatus', result.operatorStatusSummary.status === expectations.operatorStatus, `${result.operatorStatusSummary.status} !== ${expectations.operatorStatus}`);
      addAssertion('operatorStatusProductionWriteAllowed', result.operatorStatusSummary.productionWriteAllowed === false, String(result.operatorStatusSummary.productionWriteAllowed));
      addAssertion('operatorStatusSourceDataWritePerformed', result.operatorStatusSummary.sourceDataWritePerformed === false, String(result.operatorStatusSummary.sourceDataWritePerformed));
    }
    if (expectations.manualPatchPlanStatus) {
      addAssertion('manualPatchPlanExitCode', result.manualPatchPlanExitCode === expectations.manualPatchPlanExitCode, `${result.manualPatchPlanExitCode} !== ${expectations.manualPatchPlanExitCode}`);
      addAssertion('manualPatchPlanStatus', result.manualPatchPlanSummary.status === expectations.manualPatchPlanStatus, `${result.manualPatchPlanSummary.status} !== ${expectations.manualPatchPlanStatus}`);
      addAssertion('manualPatchPlanRows', result.manualPatchPlanSummary.manualPatchRows === expectations.manualPatchPlanRows, `${result.manualPatchPlanSummary.manualPatchRows} !== ${expectations.manualPatchPlanRows}`);
      addAssertion('manualPatchPlanProductionWriteAllowed', result.manualPatchPlanSummary.productionWriteAllowed === false, String(result.manualPatchPlanSummary.productionWriteAllowed));
      addAssertion('manualPatchPlanSourceDataWritePerformed', result.manualPatchPlanSummary.sourceDataWritePerformed === false, String(result.manualPatchPlanSummary.sourceDataWritePerformed));
    }
    if (expectations.operatorRowStatus) {
      addAssertion(
        `operatorRowStatus:${expectations.operatorRowStatus}`,
        result.operatorStatusRows.some((row) => row.rowStatus === expectations.operatorRowStatus),
      );
    }
    if (expectations.operatorRowStatuses) {
      expectations.operatorRowStatuses.forEach((rowStatus) => {
        addAssertion(
          `operatorRowStatus:${rowStatus}`,
          result.operatorStatusRows.some((row) => row.rowStatus === rowStatus),
        );
      });
    }
    if (expectations.manualPatchPlanAction) {
      addAssertion(
        `manualPatchPlanAction:${expectations.manualPatchPlanAction}`,
        result.manualPatchPlanRows.some((row) => row.action === expectations.manualPatchPlanAction),
      );
    }
    if (expectations.realApprovalReadinessStatus) {
      addAssertion('realApprovalReadinessExitCode', result.realApprovalReadinessExitCode === expectations.realApprovalReadinessExitCode, `${result.realApprovalReadinessExitCode} !== ${expectations.realApprovalReadinessExitCode}`);
      addAssertion('realApprovalReadinessStatus', result.realApprovalReadinessSummary.status === expectations.realApprovalReadinessStatus, `${result.realApprovalReadinessSummary.status} !== ${expectations.realApprovalReadinessStatus}`);
      addAssertion('realApprovalReadinessApprovedRows', result.realApprovalReadinessSummary.approvedRows === expectations.realApprovalReadinessApprovedRows, `${result.realApprovalReadinessSummary.approvedRows} !== ${expectations.realApprovalReadinessApprovedRows}`);
      addAssertion('realApprovalReadinessReadyRows', result.realApprovalReadinessSummary.approvedReadyRows === expectations.realApprovalReadinessReadyRows, `${result.realApprovalReadinessSummary.approvedReadyRows} !== ${expectations.realApprovalReadinessReadyRows}`);
      addAssertion('realApprovalReadinessNotAppliedRows', result.realApprovalReadinessSummary.approvedNotAppliedRows === expectations.realApprovalReadinessNotAppliedRows, `${result.realApprovalReadinessSummary.approvedNotAppliedRows} !== ${expectations.realApprovalReadinessNotAppliedRows}`);
      addAssertion('realApprovalReadinessAppliedRows', result.realApprovalReadinessSummary.approvedAppliedRows === expectations.realApprovalReadinessAppliedRows, `${result.realApprovalReadinessSummary.approvedAppliedRows} !== ${expectations.realApprovalReadinessAppliedRows}`);
      addAssertion('realApprovalReadinessBlockedRows', result.realApprovalReadinessSummary.approvedBlockedRows === expectations.realApprovalReadinessBlockedRows, `${result.realApprovalReadinessSummary.approvedBlockedRows} !== ${expectations.realApprovalReadinessBlockedRows}`);
      addAssertion('realApprovalReadinessManualPatchRows', result.realApprovalReadinessSummary.manualPatchRows === expectations.realApprovalReadinessManualPatchRows, `${result.realApprovalReadinessSummary.manualPatchRows} !== ${expectations.realApprovalReadinessManualPatchRows}`);
      addAssertion('realApprovalReadinessSourceDataWritePerformed', result.realApprovalReadinessSummary.safetyContract?.sourceDataWritePerformed === false, String(result.realApprovalReadinessSummary.safetyContract?.sourceDataWritePerformed));
      addAssertion('realApprovalReadinessProductionWriteAllowed', result.realApprovalReadinessSummary.safetyContract?.productionWriteAllowed === false, String(result.realApprovalReadinessSummary.safetyContract?.productionWriteAllowed));
      addAssertion('realApprovalReadinessProductionDataChanged', result.realApprovalReadinessSummary.safetyContract?.productionDataChanged === false, String(result.realApprovalReadinessSummary.safetyContract?.productionDataChanged));
    }
    if (expectations.realApprovalReadinessRowStatus) {
      addAssertion(
        `realApprovalReadinessRowStatus:${expectations.realApprovalReadinessRowStatus}`,
        result.realApprovalReadinessRows.some((row) => row.readinessStatus === expectations.realApprovalReadinessRowStatus),
      );
    }
    if (expectations.realApprovalReadinessAction) {
      addAssertion(
        `realApprovalReadinessAction:${expectations.realApprovalReadinessAction}`,
        result.realApprovalReadinessRows.some((row) => row.readinessAction === expectations.realApprovalReadinessAction),
      );
    }
    if (expectations.realApprovalReadinessBlocker) {
      addAssertion(
        `realApprovalReadinessBlocker:${expectations.realApprovalReadinessBlocker}`,
        includesText(result.realApprovalReadinessSummary.blockers ?? [], expectations.realApprovalReadinessBlocker),
      );
    }
    if (expectations.realApprovalReadinessWarning) {
      addAssertion(
        `realApprovalReadinessWarning:${expectations.realApprovalReadinessWarning}`,
        includesText(result.realApprovalReadinessSummary.warnings ?? [], expectations.realApprovalReadinessWarning),
      );
    }

    if (expectations.rowWarning) {
      addAssertion(
        `rowWarning:${expectations.rowWarning}`,
        result.rows.some((row) => includesText(row.warnings ?? [], expectations.rowWarning)),
      );
    }
    if (expectations.rowWarningAbsent) {
      addAssertion(
        `rowWarningAbsent:${expectations.rowWarningAbsent}`,
        result.rows.every((row) => !includesText(row.warnings ?? [], expectations.rowWarningAbsent)),
      );
    }
    if (expectations.geometryDelta !== undefined) {
      addAssertion(
        `geometryDelta:${expectations.geometryDelta}`,
        result.rows.some((row) => row.validForPatchPreview && row.geometryDelta === expectations.geometryDelta),
      );
    }
    if (expectations.rowReason) {
      addAssertion(
        `rowReason:${expectations.rowReason}`,
        result.rows.some((row) => includesText(row.reasons ?? [], expectations.rowReason)),
      );
    }
    if (expectations.blocker) {
      addAssertion(
        `blocker:${expectations.blocker}`,
        includesText(result.summary.blockers ?? [], expectations.blocker),
      );
    }
    if (expectations.patchPreviewIncludes) {
      addAssertion(
        `patchPreviewIncludes:${expectations.patchPreviewIncludes}`,
        result.patchPreviewText.includes(expectations.patchPreviewIncludes),
      );
    }

    return {
      ...result,
      expectations,
      assertions,
      passed: assertions.every((assertion) => assertion.passed),
    };
  };

  const runOperatorPackagePreservation = async (input) => {
    const caseId = 'operator-input-preservation';
    const caseDir = path.join(smokeRootDir, caseId);
    const caseInputPath = path.join(caseDir, 'sajik-seatmap-stage01-operator-input.json');
    const caseWorksetsPath = path.join(reportDir, 'sajik-seatmap-zone-precision-worksets.json');
    await fs.mkdir(caseDir, { recursive: true });
    await fs.writeFile(caseInputPath, `${JSON.stringify(input, null, 2)}\n`, 'utf8');

    let exitCode = 0;
    let stdout = '';
    let stderr = '';
    try {
      const result = await execFileAsync(process.execPath, [
        '--import',
        'tsx',
        'scripts/sajik-seatmap-stage01.mjs',
        '--stage-dir',
        caseDir,
        '--worksets',
        caseWorksetsPath,
      ], { cwd: frontendRoot });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      exitCode = error?.code ?? 1;
      stdout = error?.stdout ?? '';
      stderr = error?.stderr ?? '';
    }

    const regeneratedInput = await readJson(caseInputPath);
    const packageSummaryPath = path.join(caseDir, 'sajik-seatmap-stage01-operator-package.json');
    const packageSummary = await readJson(packageSummaryPath);
    const row = regeneratedInput.corrections.find((candidate) => candidate.sectionId === '021');
    const originalRow = input.corrections.find((candidate) => candidate.sectionId === '021');
    const assertions = [];
    const addAssertion = (name, passed, detail = '') => {
      assertions.push({ name, passed, detail });
    };

    addAssertion('exitCode', exitCode === 0, `${exitCode} !== 0`);
    addAssertion('preservationStatus', packageSummary.preservationStatus === 'preserved', `${packageSummary.preservationStatus ?? ''} !== preserved`);
    addAssertion('existingEditableRows', packageSummary.existingEditableRows === 1, `${packageSummary.existingEditableRows} !== 1`);
    addAssertion('existingEditableStageRows', packageSummary.existingEditableStageRows === 1, `${packageSummary.existingEditableStageRows} !== 1`);
    addAssertion('preservedEditableRows', packageSummary.preservedEditableRows === 1, `${packageSummary.preservedEditableRows} !== 1`);
    addAssertion('ignoredExistingEditableRows', packageSummary.ignoredExistingEditableRows === 0, `${packageSummary.ignoredExistingEditableRows} !== 0`);
    addAssertion('approvedRows', packageSummary.approvedRows === 1, `${packageSummary.approvedRows} !== 1`);
    addAssertion('editableSource', row?.editableSource === 'existingOperatorInput', `${row?.editableSource ?? ''} !== existingOperatorInput`);
    addAssertion('operatorDecision', row?.operatorDecision === 'APPROVED', `${row?.operatorDecision ?? ''} !== APPROVED`);
    addAssertion('correctedPath', row?.correctedPath === originalRow?.correctedPath, 'correctedPath was not preserved');
    addAssertion('correctedLabelX', row?.correctedLabelX === originalRow?.correctedLabelX, 'correctedLabelX was not preserved');
    addAssertion('correctedLabelY', row?.correctedLabelY === originalRow?.correctedLabelY, 'correctedLabelY was not preserved');
    addAssertion('reviewer', row?.reviewer === SMOKE_REVIEWER, `${row?.reviewer ?? ''} !== ${SMOKE_REVIEWER}`);
    addAssertion('reviewedAt', row?.reviewedAt === SMOKE_REVIEWED_AT, `${row?.reviewedAt ?? ''} !== ${SMOKE_REVIEWED_AT}`);

    return {
      caseId,
      passed: assertions.every((assertion) => assertion.passed),
      exitCode,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      packageSummary: path.relative(frontendRoot, packageSummaryPath),
      regeneratedInput: path.relative(frontendRoot, caseInputPath),
      assertions,
    };
  };

  const baseInput = await readJson(baseInputPath);
  const dataset = buildSajikSeatMapDataset();

  const pendingOnlyInput = pendingSmokeInput(baseInput);

  const approvedNoDeltaInput = pendingSmokeInput(baseInput);
  setApprovedNoDelta(approvedNoDeltaInput, '021');

  const approvedWithDeltaInput = pendingSmokeInput(baseInput);
  setApprovedWithDelta(approvedWithDeltaInput, '021');

  const approvedAppliedInput = pendingSmokeInput(baseInput);
  setApprovedWithDelta(approvedAppliedInput, '021');

  const approvedLargeAreaInput = pendingSmokeInput(baseInput);
  setApprovedLargeArea(approvedLargeAreaInput, '021');

  const approvedExcessivePointCountInput = pendingSmokeInput(baseInput);
  setApprovedExcessivePointCount(approvedExcessivePointCountInput, '021');

  const approvedLabelNearBoundaryInput = pendingSmokeInput(baseInput);
  setApprovedLabelNearBoundary(approvedLabelNearBoundaryInput, '021');

  const approvedPixelCandidateCopyNoteInput = pendingSmokeInput(baseInput);
  setApprovedPixelCandidateCopyNote(approvedPixelCandidateCopyNoteInput, '021');

  const approved131WithoutApprovalGateInput = pendingSmokeInput(baseInput);
  setApprovedWithDelta(approved131WithoutApprovalGateInput, TARGET_APPROVAL_SECTION_ID);

  const approved131BlockedApprovalGateInput = pendingSmokeInput(baseInput);
  setApprovedWithDelta(approved131BlockedApprovalGateInput, TARGET_APPROVAL_SECTION_ID);

  const approved131MismatchedApprovalGateInput = pendingSmokeInput(baseInput);
  setApprovedWithDelta(approved131MismatchedApprovalGateInput, TARGET_APPROVAL_SECTION_ID);

  const approved131ReadyGateInput = pendingSmokeInput(baseInput);
  setApprovedWithDelta(approved131ReadyGateInput, TARGET_APPROVAL_SECTION_ID);

  const invalidApprovedInput = pendingSmokeInput(baseInput);
  setInvalidApproved(invalidApprovedInput, '021');

  const invalidPathInput = pendingSmokeInput(baseInput);
  setInvalidPathApproved(invalidPathInput, '021');

  const invalidLabelInput = pendingSmokeInput(baseInput);
  setInvalidLabelApproved(invalidLabelInput, '021');

  const unknownSectionInput = pendingSmokeInput(baseInput);
  setUnknownSectionApproved(unknownSectionInput, '021');

  const forbiddenRowsInput = pendingSmokeInput(baseInput);
  setForbiddenRows(forbiddenRowsInput, dataset);

  const decisionRowsInput = pendingSmokeInput(baseInput);
  setDecisionRows(decisionRowsInput);

  const mixedRowsInput = pendingSmokeInput(baseInput);
  setMixedRows(mixedRowsInput);

  const rawCaseResults = [
    await runPrewrite({
      caseId: 'pending-only',
      input: pendingOnlyInput,
    }),
    await runPrewrite({
      caseId: 'approved-no-delta',
      input: approvedNoDeltaInput,
    }),
    await runPrewrite({
      caseId: 'approved-with-delta',
      input: approvedWithDeltaInput,
    }),
    await runPrewrite({
      caseId: 'invalid-approved-row',
      input: invalidApprovedInput,
    }),
    await runPrewrite({
      caseId: 'invalid-path-row',
      input: invalidPathInput,
    }),
    await runPrewrite({
      caseId: 'invalid-label-row',
      input: invalidLabelInput,
    }),
    await runPrewrite({
      caseId: 'unknown-section-row',
      input: unknownSectionInput,
    }),
    await runPrewrite({
      caseId: 'forbidden-alias-marker-row',
      input: forbiddenRowsInput,
    }),
    await runPrewrite({
      caseId: 'decision-rows',
      input: decisionRowsInput,
    }),
    await runPrewrite({
      caseId: 'mixed-approved-decision-pending',
      input: mixedRowsInput,
    }),
    await runPrewrite({
      caseId: 'tampered-visual-path-readiness',
      input: approvedWithDeltaInput,
      tamperReadinessReports: tamperVisualPathForReadiness,
    }),
    await runPrewrite({
      caseId: 'tampered-target-source-readiness',
      input: approvedWithDeltaInput,
      tamperReadinessReports: tamperTargetSourceForReadiness,
    }),
    await runPrewrite({
      caseId: 'approved-applied-after-manual-patch',
      input: approvedAppliedInput,
      tamperReadinessReports: simulateAppliedForReadiness,
    }),
    await runPrewrite({
      caseId: 'partial-hitpath-only-applied',
      input: approvedWithDeltaInput,
      tamperReadinessReports: tamperPostApplyBlockedForReadiness('PARTIAL_APPLY_HITPATH_ONLY'),
    }),
    await runPrewrite({
      caseId: 'partial-label-only-applied',
      input: approvedWithDeltaInput,
      tamperReadinessReports: tamperPostApplyBlockedForReadiness('PARTIAL_APPLY_LABEL_ONLY'),
    }),
    await runPrewrite({
      caseId: 'legacy-label-drift',
      input: approvedWithDeltaInput,
      tamperReadinessReports: tamperPostApplyBlockedForReadiness('LEGACY_LABEL_DRIFT'),
    }),
    await runPrewrite({
      caseId: 'stale-before-snapshot',
      input: approvedWithDeltaInput,
      tamperReadinessReports: tamperPostApplyBlockedForReadiness('STALE_BEFORE_SNAPSHOT_HIT_PATH'),
    }),
    await runPrewrite({
      caseId: 'locked-field-mutated',
      input: approvedWithDeltaInput,
      tamperReadinessReports: tamperPostApplyBlockedForReadiness('LOCKED_FIELD_MUTATED:visualPath'),
    }),
    await runPrewrite({
      caseId: 'approved-large-area-row',
      input: approvedLargeAreaInput,
    }),
    await runPrewrite({
      caseId: 'approved-excessive-point-count-row',
      input: approvedExcessivePointCountInput,
    }),
    await runPrewrite({
      caseId: 'approved-label-near-boundary-row',
      input: approvedLabelNearBoundaryInput,
    }),
    await runPrewrite({
      caseId: 'approved-pixel-candidate-copy-note-row',
      input: approvedPixelCandidateCopyNoteInput,
    }),
    await runPrewrite({
      caseId: 'approved-131-without-approval-gate',
      input: approved131WithoutApprovalGateInput,
    }),
    await runPrewrite({
      caseId: 'approved-131-with-blocked-approval-gate',
      input: approved131BlockedApprovalGateInput,
      targetApprovalGate: ({ input, caseInputPath }) => buildTargetApprovalGateForInput({
        input,
        caseInputPath,
        overrides: {
          status: 'blocked',
          readyForPrewrite: false,
          targetEntryPreflightReadyForApprovalGate: false,
          blockers: ['SMOKE_BLOCKED_APPROVAL_GATE'],
        },
      }),
    }),
    await runPrewrite({
      caseId: 'approved-131-with-mismatched-approval-gate',
      input: approved131MismatchedApprovalGateInput,
      targetApprovalGate: ({ input, caseInputPath }) => buildTargetApprovalGateForInput({
        input,
        caseInputPath,
        selectedEntryOverrides: {
          correctedLabelX: 1,
        },
      }),
    }),
    await runPrewrite({
      caseId: 'approved-131-with-ready-approval-gate',
      input: approved131ReadyGateInput,
      targetApprovalGate: ({ input, caseInputPath }) => buildTargetApprovalGateForInput({
        input,
        caseInputPath,
      }),
    }),
  ];
  const operatorPackagePreservation = await runOperatorPackagePreservation(approvedWithDeltaInput);

  const caseResults = [
    validateCase(rawCaseResults[0], {
      exitCode: 0,
      status: 'waiting-for-operator',
      approvedRows: 0,
      patchPreviewRows: 0,
      inputAidExitCode: 0,
      inputAidStatus: 'waiting-for-operator',
      inputAidReadyRows: 0,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'PENDING',
      inputAidAction: 'FILL_OR_DECIDE',
      applyReadyExitCode: 0,
      applyReadyStatus: 'waiting-for-operator',
      postApplyExitCode: 0,
      postApplyStatus: 'waiting-for-operator',
      operatorStatusExitCode: 0,
      operatorStatus: 'waiting-for-operator',
      operatorRowStatus: 'PENDING',
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'waiting-for-operator',
      manualPatchPlanRows: 0,
      realApprovalReadinessExitCode: 0,
      realApprovalReadinessStatus: 'waiting-for-operator',
      realApprovalReadinessApprovedRows: 0,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 0,
      realApprovalReadinessManualPatchRows: 0,
    }),
    validateCase(rawCaseResults[1], {
      exitCode: 0,
      status: 'ready-for-data-patch',
      approvedRows: 1,
      patchPreviewRows: 1,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      inputAidNextActionIncludes: 'stage01-prewrite',
      rowWarning: 'APPROVED_NO_GEOMETRY_DELTA',
      patchPreviewIncludes: "sectionId: '021'",
      applyReadyExitCode: 0,
      applyReadyStatus: 'ready-for-manual-apply',
      postApplyExitCode: 0,
      postApplyStatus: 'applied',
      operatorStatusExitCode: 0,
      operatorStatus: 'applied',
      operatorRowStatus: 'APPLIED',
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'applied',
      manualPatchPlanRows: 0,
      realApprovalReadinessExitCode: 0,
      realApprovalReadinessStatus: 'applied',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 1,
      realApprovalReadinessBlockedRows: 0,
      realApprovalReadinessManualPatchRows: 0,
      realApprovalReadinessRowStatus: 'APPROVED_APPLIED',
      realApprovalReadinessAction: 'VERIFY_APPLIED',
      realApprovalReadinessWarning: 'APPROVED_NO_GEOMETRY_DELTA',
    }),
    validateCase(rawCaseResults[2], {
      exitCode: 0,
      status: 'ready-for-data-patch',
      approvedRows: 1,
      patchPreviewRows: 1,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      inputAidNextActionIncludes: 'stage01-prewrite',
      rowWarningAbsent: 'APPROVED_NO_GEOMETRY_DELTA',
      geometryDelta: true,
      patchPreviewIncludes: "sectionId: '021'",
      applyReadyExitCode: 0,
      applyReadyStatus: 'ready-for-manual-apply',
      postApplyExitCode: 0,
      postApplyStatus: 'not-applied',
      operatorStatusExitCode: 0,
      operatorStatus: 'ready-for-manual-apply',
      operatorRowStatus: 'NOT_APPLIED',
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'ready-for-manual-apply',
      manualPatchPlanRows: 1,
      manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
      realApprovalReadinessExitCode: 0,
      realApprovalReadinessStatus: 'ready-for-manual-apply',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 1,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 0,
      realApprovalReadinessManualPatchRows: 1,
      realApprovalReadinessRowStatus: 'APPROVED_NOT_APPLIED',
      realApprovalReadinessAction: 'APPLY_MANUAL_PATCH',
    }),
    validateCase(rawCaseResults[3], {
      exitCode: 1,
      status: 'blocked',
      approvedRows: 1,
      patchPreviewRows: 0,
      inputAidExitCode: 1,
      inputAidStatus: 'blocked',
      inputAidReadyRows: 0,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 1,
      inputAidRowStatus: 'INVALID',
      inputAidAction: 'FIX_OPERATOR_INPUT',
      inputAidNextActionIncludes: 'Fix the listed missing fields',
      blocker: 'APPROVED_ROW_INVALID:021',
      rowReason: 'APPROVAL_FIELD_REQUIRED:reviewer',
      applyReadyExitCode: 1,
      applyReadyStatus: 'blocked',
      postApplyExitCode: 1,
      postApplyStatus: 'blocked',
      operatorStatusExitCode: 1,
      operatorStatus: 'blocked',
      operatorRowStatus: 'INVALID',
      manualPatchPlanExitCode: 1,
      manualPatchPlanStatus: 'blocked',
      manualPatchPlanRows: 0,
      realApprovalReadinessExitCode: 1,
      realApprovalReadinessStatus: 'blocked',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 1,
      realApprovalReadinessManualPatchRows: 0,
      realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
      realApprovalReadinessAction: 'FIX_APPROVAL',
    }),
    validateCase(rawCaseResults[4], {
      exitCode: 1,
      status: 'blocked',
      approvedRows: 1,
      patchPreviewRows: 0,
      inputAidExitCode: 1,
      inputAidStatus: 'blocked',
      inputAidReadyRows: 0,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 1,
      inputAidRowStatus: 'INVALID',
      inputAidAction: 'FIX_OPERATOR_INPUT',
      inputAidNextActionIncludes: 'Fix the listed missing fields',
      blocker: 'APPROVED_ROW_INVALID:021',
      rowReason: 'MIN_POINT_COUNT_REQUIRED',
      applyReadyExitCode: 1,
      applyReadyStatus: 'blocked',
      postApplyExitCode: 1,
      postApplyStatus: 'blocked',
      operatorStatusExitCode: 1,
      operatorStatus: 'blocked',
      operatorRowStatus: 'INVALID',
      manualPatchPlanExitCode: 1,
      manualPatchPlanStatus: 'blocked',
      manualPatchPlanRows: 0,
      realApprovalReadinessExitCode: 1,
      realApprovalReadinessStatus: 'blocked',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 1,
      realApprovalReadinessManualPatchRows: 0,
      realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
      realApprovalReadinessAction: 'FIX_APPROVAL',
    }),
    validateCase(rawCaseResults[5], {
      exitCode: 1,
      status: 'blocked',
      approvedRows: 1,
      patchPreviewRows: 0,
      inputAidExitCode: 1,
      inputAidStatus: 'blocked',
      inputAidReadyRows: 0,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 1,
      inputAidRowStatus: 'INVALID',
      inputAidAction: 'FIX_OPERATOR_INPUT',
      inputAidNextActionIncludes: 'Fix the listed missing fields',
      blocker: 'APPROVED_ROW_INVALID:021',
      rowReason: 'LABEL_OUTSIDE_POLYGON',
      applyReadyExitCode: 1,
      applyReadyStatus: 'blocked',
      postApplyExitCode: 1,
      postApplyStatus: 'blocked',
      operatorStatusExitCode: 1,
      operatorStatus: 'blocked',
      operatorRowStatus: 'INVALID',
      manualPatchPlanExitCode: 1,
      manualPatchPlanStatus: 'blocked',
      manualPatchPlanRows: 0,
      realApprovalReadinessExitCode: 1,
      realApprovalReadinessStatus: 'blocked',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 1,
      realApprovalReadinessManualPatchRows: 0,
      realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
      realApprovalReadinessAction: 'FIX_APPROVAL',
    }),
    validateCase(rawCaseResults[6], {
      exitCode: 1,
      status: 'blocked',
      approvedRows: 1,
      patchPreviewRows: 0,
      inputAidExitCode: 1,
      inputAidStatus: 'blocked',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      blocker: 'STAGE01_INPUT_SECTION_IDS_MISMATCH',
      rowReason: 'SECTION_NOT_FOUND',
      applyReadyExitCode: 1,
      applyReadyStatus: 'blocked',
      postApplyExitCode: 1,
      postApplyStatus: 'blocked',
      operatorStatusExitCode: 1,
      operatorStatus: 'blocked',
      operatorRowStatus: 'INVALID',
      manualPatchPlanExitCode: 1,
      manualPatchPlanStatus: 'blocked',
      manualPatchPlanRows: 0,
      realApprovalReadinessExitCode: 1,
      realApprovalReadinessStatus: 'blocked',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 1,
      realApprovalReadinessManualPatchRows: 0,
      realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
      realApprovalReadinessAction: 'FIX_APPROVAL',
    }),
    validateCase(rawCaseResults[7], {
      exitCode: 1,
      status: 'blocked',
      approvedRows: 2,
      patchPreviewRows: 0,
      inputAidExitCode: 1,
      inputAidStatus: 'blocked',
      inputAidReadyRows: 0,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 2,
      inputAidRowStatus: 'INVALID',
      inputAidAction: 'FIX_OPERATOR_INPUT',
      inputAidNextActionIncludes: 'Fix the listed missing fields',
      blocker: 'STAGE01_INPUT_SECTION_IDS_MISMATCH',
      rowReason: 'SECTION_KIND_NOT_WRITABLE',
      applyReadyExitCode: 1,
      applyReadyStatus: 'blocked',
      postApplyExitCode: 1,
      postApplyStatus: 'blocked',
      operatorStatusExitCode: 1,
      operatorStatus: 'blocked',
      operatorRowStatus: 'INVALID',
      manualPatchPlanExitCode: 1,
      manualPatchPlanStatus: 'blocked',
      manualPatchPlanRows: 0,
      realApprovalReadinessExitCode: 1,
      realApprovalReadinessStatus: 'blocked',
      realApprovalReadinessApprovedRows: 2,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 2,
      realApprovalReadinessManualPatchRows: 0,
      realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
      realApprovalReadinessAction: 'FIX_APPROVAL',
      realApprovalReadinessBlocker: 'SECTION_KIND_NOT_WRITABLE',
    }),
    validateCase(rawCaseResults[8], {
      exitCode: 0,
      status: 'waiting-for-operator',
      approvedRows: 0,
      patchPreviewRows: 0,
      inputAidExitCode: 0,
      inputAidStatus: 'decisions-recorded',
      inputAidReadyRows: 0,
      inputAidRejectedRows: 1,
      inputAidNeedsRetraceRows: 1,
      inputAidKeepCurrentRows: 1,
      inputAidInvalidRows: 0,
      inputAidRowStatuses: ['REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT'],
      inputAidAction: 'NO_PATCH_PREVIEW',
      inputAidNextActionIncludes: 'No patch preview',
      applyReadyExitCode: 0,
      applyReadyStatus: 'waiting-for-operator',
      postApplyExitCode: 0,
      postApplyStatus: 'waiting-for-operator',
      operatorStatusExitCode: 0,
      operatorStatus: 'waiting-for-operator',
      operatorRowStatuses: ['REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT'],
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'waiting-for-operator',
      manualPatchPlanRows: 0,
      realApprovalReadinessExitCode: 0,
      realApprovalReadinessStatus: 'waiting-for-operator',
      realApprovalReadinessApprovedRows: 0,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 0,
      realApprovalReadinessManualPatchRows: 0,
    }),
    validateCase(rawCaseResults[9], {
      exitCode: 0,
      status: 'ready-for-data-patch',
      approvedRows: 1,
      patchPreviewRows: 1,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 1,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 1,
      inputAidInvalidRows: 0,
      inputAidRowStatuses: ['READY_FOR_PREWRITE', 'REJECTED', 'KEEP_CURRENT', 'PENDING'],
      inputAidAction: 'RUN_PREWRITE',
      geometryDelta: true,
      patchPreviewIncludes: "sectionId: '021'",
      applyReadyExitCode: 0,
      applyReadyStatus: 'ready-for-manual-apply',
      postApplyExitCode: 0,
      postApplyStatus: 'not-applied',
      operatorStatusExitCode: 0,
      operatorStatus: 'ready-for-manual-apply',
      operatorRowStatuses: ['NOT_APPLIED', 'REJECTED', 'KEEP_CURRENT', 'PENDING'],
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'ready-for-manual-apply',
      manualPatchPlanRows: 1,
      manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
      realApprovalReadinessExitCode: 0,
      realApprovalReadinessStatus: 'ready-for-manual-apply',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 1,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 0,
      realApprovalReadinessManualPatchRows: 1,
      realApprovalReadinessRowStatus: 'APPROVED_NOT_APPLIED',
      realApprovalReadinessAction: 'APPLY_MANUAL_PATCH',
    }),
    validateCase(rawCaseResults[10], {
      exitCode: 0,
      status: 'ready-for-data-patch',
      approvedRows: 1,
      patchPreviewRows: 1,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      geometryDelta: true,
      applyReadyExitCode: 0,
      applyReadyStatus: 'ready-for-manual-apply',
      postApplyExitCode: 0,
      postApplyStatus: 'not-applied',
      operatorStatusExitCode: 0,
      operatorStatus: 'ready-for-manual-apply',
      operatorRowStatus: 'NOT_APPLIED',
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'ready-for-manual-apply',
      manualPatchPlanRows: 1,
      manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
      realApprovalReadinessExitCode: 1,
      realApprovalReadinessStatus: 'blocked',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 1,
      realApprovalReadinessManualPatchRows: 1,
      realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
      realApprovalReadinessAction: 'FIX_APPROVAL',
      realApprovalReadinessBlocker: 'VISUAL_PATH_CHANGED_WITHOUT_APPROVAL',
    }),
    validateCase(rawCaseResults[11], {
      exitCode: 0,
      status: 'ready-for-data-patch',
      approvedRows: 1,
      patchPreviewRows: 1,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      geometryDelta: true,
      applyReadyExitCode: 0,
      applyReadyStatus: 'ready-for-manual-apply',
      postApplyExitCode: 0,
      postApplyStatus: 'not-applied',
      operatorStatusExitCode: 0,
      operatorStatus: 'ready-for-manual-apply',
      operatorRowStatus: 'NOT_APPLIED',
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'ready-for-manual-apply',
      manualPatchPlanRows: 1,
      manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
      realApprovalReadinessExitCode: 1,
      realApprovalReadinessStatus: 'blocked',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 1,
      realApprovalReadinessManualPatchRows: 1,
      realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
      realApprovalReadinessAction: 'FIX_APPROVAL',
      realApprovalReadinessBlocker: 'TARGET_SOURCE_FILE_MISMATCH',
    }),
    validateCase(rawCaseResults[12], {
      exitCode: 0,
      status: 'ready-for-data-patch',
      approvedRows: 1,
      patchPreviewRows: 1,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      geometryDelta: true,
      applyReadyExitCode: 0,
      applyReadyStatus: 'ready-for-manual-apply',
      postApplyExitCode: 0,
      postApplyStatus: 'applied',
      operatorStatusExitCode: 0,
      operatorStatus: 'applied',
      operatorRowStatus: 'APPLIED',
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'applied',
      manualPatchPlanRows: 0,
      realApprovalReadinessExitCode: 0,
      realApprovalReadinessStatus: 'applied',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 1,
      realApprovalReadinessBlockedRows: 0,
      realApprovalReadinessManualPatchRows: 0,
      realApprovalReadinessRowStatus: 'APPROVED_APPLIED',
      realApprovalReadinessAction: 'VERIFY_APPLIED',
    }),
    validateCase(rawCaseResults[13], {
      exitCode: 0,
      status: 'ready-for-data-patch',
      approvedRows: 1,
      patchPreviewRows: 1,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      geometryDelta: true,
      applyReadyExitCode: 0,
      applyReadyStatus: 'ready-for-manual-apply',
      postApplyExitCode: 0,
      postApplyStatus: 'blocked',
      operatorStatusExitCode: 0,
      operatorStatus: 'ready-for-manual-apply',
      operatorRowStatus: 'NOT_APPLIED',
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'ready-for-manual-apply',
      manualPatchPlanRows: 1,
      manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
      realApprovalReadinessExitCode: 1,
      realApprovalReadinessStatus: 'blocked',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 1,
      realApprovalReadinessManualPatchRows: 1,
      realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
      realApprovalReadinessAction: 'FIX_APPROVAL',
      realApprovalReadinessBlocker: 'PARTIAL_APPLY_HITPATH_ONLY',
    }),
    validateCase(rawCaseResults[14], {
      exitCode: 0,
      status: 'ready-for-data-patch',
      approvedRows: 1,
      patchPreviewRows: 1,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      geometryDelta: true,
      applyReadyExitCode: 0,
      applyReadyStatus: 'ready-for-manual-apply',
      postApplyExitCode: 0,
      postApplyStatus: 'blocked',
      operatorStatusExitCode: 0,
      operatorStatus: 'ready-for-manual-apply',
      operatorRowStatus: 'NOT_APPLIED',
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'ready-for-manual-apply',
      manualPatchPlanRows: 1,
      manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
      realApprovalReadinessExitCode: 1,
      realApprovalReadinessStatus: 'blocked',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 1,
      realApprovalReadinessManualPatchRows: 1,
      realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
      realApprovalReadinessAction: 'FIX_APPROVAL',
      realApprovalReadinessBlocker: 'PARTIAL_APPLY_LABEL_ONLY',
    }),
    validateCase(rawCaseResults[15], {
      exitCode: 0,
      status: 'ready-for-data-patch',
      approvedRows: 1,
      patchPreviewRows: 1,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      geometryDelta: true,
      applyReadyExitCode: 0,
      applyReadyStatus: 'ready-for-manual-apply',
      postApplyExitCode: 0,
      postApplyStatus: 'blocked',
      operatorStatusExitCode: 0,
      operatorStatus: 'ready-for-manual-apply',
      operatorRowStatus: 'NOT_APPLIED',
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'ready-for-manual-apply',
      manualPatchPlanRows: 1,
      manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
      realApprovalReadinessExitCode: 1,
      realApprovalReadinessStatus: 'blocked',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 1,
      realApprovalReadinessManualPatchRows: 1,
      realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
      realApprovalReadinessAction: 'FIX_APPROVAL',
      realApprovalReadinessBlocker: 'LEGACY_LABEL_DRIFT',
    }),
    validateCase(rawCaseResults[16], {
      exitCode: 0,
      status: 'ready-for-data-patch',
      approvedRows: 1,
      patchPreviewRows: 1,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      geometryDelta: true,
      applyReadyExitCode: 0,
      applyReadyStatus: 'ready-for-manual-apply',
      postApplyExitCode: 0,
      postApplyStatus: 'blocked',
      operatorStatusExitCode: 0,
      operatorStatus: 'ready-for-manual-apply',
      operatorRowStatus: 'NOT_APPLIED',
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'ready-for-manual-apply',
      manualPatchPlanRows: 1,
      manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
      realApprovalReadinessExitCode: 1,
      realApprovalReadinessStatus: 'blocked',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 1,
      realApprovalReadinessManualPatchRows: 1,
      realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
      realApprovalReadinessAction: 'FIX_APPROVAL',
      realApprovalReadinessBlocker: 'STALE_BEFORE_SNAPSHOT_HIT_PATH',
    }),
    validateCase(rawCaseResults[17], {
      exitCode: 0,
      status: 'ready-for-data-patch',
      approvedRows: 1,
      patchPreviewRows: 1,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      geometryDelta: true,
      applyReadyExitCode: 0,
      applyReadyStatus: 'ready-for-manual-apply',
      postApplyExitCode: 0,
      postApplyStatus: 'blocked',
      operatorStatusExitCode: 0,
      operatorStatus: 'ready-for-manual-apply',
      operatorRowStatus: 'NOT_APPLIED',
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'ready-for-manual-apply',
      manualPatchPlanRows: 1,
      manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
      realApprovalReadinessExitCode: 1,
      realApprovalReadinessStatus: 'blocked',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 1,
      realApprovalReadinessManualPatchRows: 1,
      realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
      realApprovalReadinessAction: 'FIX_APPROVAL',
      realApprovalReadinessBlocker: 'LOCKED_FIELD_MUTATED:visualPath',
    }),
    validateCase(rawCaseResults[18], {
      exitCode: 1,
      status: 'blocked',
      approvedRows: 1,
      patchPreviewRows: 0,
      inputAidExitCode: 1,
      inputAidStatus: 'blocked',
      inputAidReadyRows: 0,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 1,
      inputAidRowStatus: 'INVALID',
      inputAidAction: 'FIX_OPERATOR_INPUT',
      inputAidNextActionIncludes: 'Fix the listed missing fields',
      blocker: 'APPROVED_ROW_INVALID:021',
      rowReason: 'CORRECTED_GEOMETRY_AREA_DELTA_TOO_LARGE',
      applyReadyExitCode: 1,
      applyReadyStatus: 'blocked',
      postApplyExitCode: 1,
      postApplyStatus: 'blocked',
      operatorStatusExitCode: 1,
      operatorStatus: 'blocked',
      operatorRowStatus: 'INVALID',
      manualPatchPlanExitCode: 1,
      manualPatchPlanStatus: 'blocked',
      manualPatchPlanRows: 0,
      realApprovalReadinessExitCode: 1,
      realApprovalReadinessStatus: 'blocked',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 1,
      realApprovalReadinessManualPatchRows: 0,
      realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
      realApprovalReadinessAction: 'FIX_APPROVAL',
    }),
    validateCase(rawCaseResults[19], {
      exitCode: 1,
      status: 'blocked',
      approvedRows: 1,
      patchPreviewRows: 0,
      inputAidExitCode: 1,
      inputAidStatus: 'blocked',
      inputAidReadyRows: 0,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 1,
      inputAidRowStatus: 'INVALID',
      inputAidAction: 'FIX_OPERATOR_INPUT',
      inputAidNextActionIncludes: 'Fix the listed missing fields',
      blocker: 'APPROVED_ROW_INVALID:021',
      rowReason: 'CORRECTED_POINT_COUNT_TOO_HIGH',
      applyReadyExitCode: 1,
      applyReadyStatus: 'blocked',
      postApplyExitCode: 1,
      postApplyStatus: 'blocked',
      operatorStatusExitCode: 1,
      operatorStatus: 'blocked',
      operatorRowStatus: 'INVALID',
      manualPatchPlanExitCode: 1,
      manualPatchPlanStatus: 'blocked',
      manualPatchPlanRows: 0,
      realApprovalReadinessExitCode: 1,
      realApprovalReadinessStatus: 'blocked',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 1,
      realApprovalReadinessManualPatchRows: 0,
      realApprovalReadinessRowStatus: 'APPROVED_BLOCKED',
      realApprovalReadinessAction: 'FIX_APPROVAL',
    }),
    validateCase(rawCaseResults[20], {
      exitCode: 0,
      status: 'ready-for-data-patch',
      approvedRows: 1,
      patchPreviewRows: 1,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      inputAidNextActionIncludes: 'stage01-prewrite',
      inputAidRowWarning: 'CORRECTED_LABEL_NEAR_BOUNDARY',
      rowWarning: 'CORRECTED_LABEL_NEAR_BOUNDARY',
      geometryDelta: true,
      patchPreviewIncludes: "sectionId: '021'",
      applyReadyExitCode: 0,
      applyReadyStatus: 'ready-for-manual-apply',
      postApplyExitCode: 0,
      postApplyStatus: 'not-applied',
      operatorStatusExitCode: 0,
      operatorStatus: 'ready-for-manual-apply',
      operatorRowStatus: 'NOT_APPLIED',
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'ready-for-manual-apply',
      manualPatchPlanRows: 1,
      manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
      realApprovalReadinessExitCode: 0,
      realApprovalReadinessStatus: 'ready-for-manual-apply',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 1,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 0,
      realApprovalReadinessManualPatchRows: 1,
      realApprovalReadinessRowStatus: 'APPROVED_NOT_APPLIED',
      realApprovalReadinessAction: 'APPLY_MANUAL_PATCH',
    }),
    validateCase(rawCaseResults[21], {
      exitCode: 0,
      status: 'ready-for-data-patch',
      approvedRows: 1,
      patchPreviewRows: 1,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      inputAidNextActionIncludes: 'stage01-prewrite',
      inputAidRowWarning: 'OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW',
      rowWarning: 'OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW',
      patchPreviewIncludes: "sectionId: '021'",
      applyReadyExitCode: 0,
      applyReadyStatus: 'ready-for-manual-apply',
      postApplyExitCode: 0,
      postApplyStatus: 'applied',
      operatorStatusExitCode: 0,
      operatorStatus: 'applied',
      operatorRowStatus: 'APPLIED',
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'applied',
      manualPatchPlanRows: 0,
      realApprovalReadinessExitCode: 0,
      realApprovalReadinessStatus: 'applied',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 0,
      realApprovalReadinessAppliedRows: 1,
      realApprovalReadinessBlockedRows: 0,
      realApprovalReadinessManualPatchRows: 0,
      realApprovalReadinessRowStatus: 'APPROVED_APPLIED',
      realApprovalReadinessAction: 'VERIFY_APPLIED',
      realApprovalReadinessWarning: 'APPROVED_NO_GEOMETRY_DELTA',
    }),
    validateCase(rawCaseResults[22], {
      exitCode: 1,
      status: 'blocked',
      approvedRows: 1,
      patchPreviewRows: 0,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      inputAidNextActionIncludes: 'stage01-prewrite',
      blocker: 'APPROVED_ROW_INVALID:131',
      rowReason: 'TARGET_APPROVAL_GATE_REQUIRED',
    }),
    validateCase(rawCaseResults[23], {
      exitCode: 1,
      status: 'blocked',
      approvedRows: 1,
      patchPreviewRows: 0,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      inputAidNextActionIncludes: 'stage01-prewrite',
      blocker: 'APPROVED_ROW_INVALID:131',
      rowReason: 'TARGET_APPROVAL_GATE_NOT_READY',
    }),
    validateCase(rawCaseResults[24], {
      exitCode: 1,
      status: 'blocked',
      approvedRows: 1,
      patchPreviewRows: 0,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      inputAidNextActionIncludes: 'stage01-prewrite',
      blocker: 'APPROVED_ROW_INVALID:131',
      rowReason: 'TARGET_APPROVAL_GATE_SELECTED_ENTRY_MISMATCH',
    }),
    validateCase(rawCaseResults[25], {
      exitCode: 0,
      status: 'ready-for-data-patch',
      approvedRows: 1,
      patchPreviewRows: 1,
      inputAidExitCode: 0,
      inputAidStatus: 'ready-for-prewrite',
      inputAidReadyRows: 1,
      inputAidRejectedRows: 0,
      inputAidNeedsRetraceRows: 0,
      inputAidKeepCurrentRows: 0,
      inputAidInvalidRows: 0,
      inputAidRowStatus: 'READY_FOR_PREWRITE',
      inputAidAction: 'RUN_PREWRITE',
      inputAidNextActionIncludes: 'stage01-prewrite',
      rowWarningAbsent: 'APPROVED_NO_GEOMETRY_DELTA',
      geometryDelta: true,
      patchPreviewIncludes: "sectionId: '131'",
      applyReadyExitCode: 0,
      applyReadyStatus: 'ready-for-manual-apply',
      postApplyExitCode: 0,
      postApplyStatus: 'not-applied',
      operatorStatusExitCode: 0,
      operatorStatus: 'ready-for-manual-apply',
      operatorRowStatus: 'NOT_APPLIED',
      manualPatchPlanExitCode: 0,
      manualPatchPlanStatus: 'ready-for-manual-apply',
      manualPatchPlanRows: 1,
      manualPatchPlanAction: 'MANUAL_PATCH_REQUIRED',
      realApprovalReadinessExitCode: 0,
      realApprovalReadinessStatus: 'ready-for-manual-apply',
      realApprovalReadinessApprovedRows: 1,
      realApprovalReadinessReadyRows: 0,
      realApprovalReadinessNotAppliedRows: 1,
      realApprovalReadinessAppliedRows: 0,
      realApprovalReadinessBlockedRows: 0,
      realApprovalReadinessManualPatchRows: 1,
      realApprovalReadinessRowStatus: 'APPROVED_NOT_APPLIED',
      realApprovalReadinessAction: 'APPLY_MANUAL_PATCH',
    }),
  ];

  const failedCases = caseResults.filter((result) => !result.passed);
  const failedPreservation = operatorPackagePreservation.passed ? [] : [operatorPackagePreservation];
  const summary = {
    smokeVersion: SMOKE_VERSION,
    status: failedCases.length === 0 && failedPreservation.length === 0 ? 'passed' : 'failed',
    generatedAt: new Date().toISOString(),
    baseInput: path.relative(frontendRoot, baseInputPath),
    outputDirectory: path.relative(frontendRoot, smokeRootDir),
    cases: caseResults.length,
    passedCases: caseResults.filter((result) => result.passed).length,
    failedCases: failedCases.length,
    operatorPackagePreservationPassed: operatorPackagePreservation.passed,
    productionDataChanged: false,
    productionWriteAllowed: false,
    caseSummaries: caseResults.map((result) => ({
      caseId: result.caseId,
      passed: result.passed,
      inputAidStatus: result.inputAidSummary.status,
      inputAidReadyRows: result.inputAidSummary.readyForPrewriteRows,
      inputAidReport: result.inputAidReport,
      exitCode: result.exitCode,
      status: result.summary.status,
      approvedRows: result.summary.approvedRows,
      patchPreviewRows: result.summary.patchPreviewRows,
      applyReadyStatus: result.applyReadySummary.status,
      applyReadyReport: result.applyReadyReport,
      postApplyStatus: result.postApplySummary.status,
      postApplyReport: result.postApplyReport,
      operatorStatus: result.operatorStatusSummary.status,
      operatorStatusReport: result.operatorStatusReport,
      manualPatchPlanStatus: result.manualPatchPlanSummary.status,
      manualPatchPlanRows: result.manualPatchPlanSummary.manualPatchRows,
      manualPatchPlanReport: result.manualPatchPlanReport,
      realApprovalReadinessStatus: result.realApprovalReadinessSummary.status,
      realApprovalReadinessApprovedNotAppliedRows: result.realApprovalReadinessSummary.approvedNotAppliedRows,
      realApprovalReadinessApprovedAppliedRows: result.realApprovalReadinessSummary.approvedAppliedRows,
      realApprovalReadinessApprovedBlockedRows: result.realApprovalReadinessSummary.approvedBlockedRows,
      realApprovalReadinessReport: result.realApprovalReadinessReport,
      blockers: result.summary.blockers,
      warnings: result.summary.warnings,
      report: result.report,
    })),
    operatorPackagePreservation: {
      caseId: operatorPackagePreservation.caseId,
      passed: operatorPackagePreservation.passed,
      exitCode: operatorPackagePreservation.exitCode,
      packageSummary: operatorPackagePreservation.packageSummary,
      regeneratedInput: operatorPackagePreservation.regeneratedInput,
    },
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    safetyContract: [
      'This smoke test creates temporary Stage 01 operator inputs only under reports/stadium/sajik-stage01-operator/smoke.',
      'It never edits src/data/sajikSeatData.ts.',
      'The pending-only fixture confirms empty operator input remains waiting-for-operator with no patch preview.',
      'The approved fixtures confirm operator input aid reports READY_FOR_PREWRITE rows before prewrite.',
      'The approved-no-delta fixture confirms the ready-for-data-patch branch without changing geometry.',
      'The approved-no-delta fixture also confirms the ready-for-manual-apply apply-ready branch without writing production data.',
      'The approved-with-delta fixture confirms a changed hitPath can become a manual data patch candidate without writing production data.',
      'The approved-with-delta fixture also confirms post-apply audit reports not-applied before a manual data patch is present.',
      'The approved-with-delta fixture also confirms operator status reports rowStatus=NOT_APPLIED before a manual data patch is present.',
      'The approved-with-delta fixture also confirms manual patch plan reports MANUAL_PATCH_REQUIRED before a manual data patch is present.',
      'The approved-with-delta fixture also confirms real approval readiness reports APPROVED_NOT_APPLIED before a manual data patch is present.',
      'The approved-no-delta fixture confirms real approval readiness reports APPROVED_APPLIED with APPROVED_NO_GEOMETRY_DELTA.',
      'The approved-applied-after-manual-patch fixture simulates post-apply APPLIED reports and confirms real approval readiness reports APPROVED_APPLIED with VERIFY_APPLIED.',
      'The partial-hitpath-only-applied fixture confirms partial hitPath-only apply is blocked before Stage 02.',
      'The partial-label-only-applied fixture confirms partial label-only apply is blocked before Stage 02.',
      'The legacy-label-drift fixture confirms labelPoint and legacy labelX/Y drift is blocked before Stage 02.',
      'The stale-before-snapshot fixture confirms stale prewrite baselines are blocked before Stage 02.',
      'The locked-field-mutated fixture confirms locked field mutation is blocked before Stage 02.',
      'The approved-large-area-row fixture confirms abnormal correctedPath area expansion is blocked before patch preview.',
      'The approved-excessive-point-count-row fixture confirms excessive correctedPath vertex count is blocked before patch preview.',
      'The approved-label-near-boundary-row fixture confirms labels inside the polygon but within 1px of its boundary warn without blocking manual patch preview.',
      'The approved-pixel-candidate-copy-note-row fixture confirms operator notes that mention pixel candidate copy/paste warn without blocking manual patch preview.',
      'The approved-131-without-approval-gate fixture confirms section 131 APPROVED rows cannot enter prewrite without the target approval gate report.',
      'The approved-131-with-blocked-approval-gate fixture confirms section 131 APPROVED rows cannot enter prewrite when the target approval gate is not ready.',
      'The approved-131-with-mismatched-approval-gate fixture confirms section 131 APPROVED rows cannot enter prewrite when the gate selected entry differs from operator input.',
      'The approved-131-with-ready-approval-gate fixture confirms section 131 APPROVED rows can enter manual patch preview only after a matching ready target approval gate.',
      'The invalid-approved-row fixture confirms approved rows with missing fields are blocked.',
      'The invalid-path-row fixture confirms malformed correctedPath values are blocked.',
      'The invalid-label-row fixture confirms labelPoint outside the correctedPath is blocked.',
      'The unknown-section-row fixture confirms non-Stage 01 or unknown section ids are blocked.',
      'The forbidden-alias-marker-row fixture confirms alias-only and accessibility marker rows cannot enter Stage 01 seat-section patch previews.',
      'The tampered-visual-path-readiness fixture confirms real approval readiness blocks VISUAL_PATH_CHANGED_WITHOUT_APPROVAL.',
      'The tampered-target-source-readiness fixture confirms real approval readiness blocks TARGET_SOURCE_FILE_MISMATCH.',
      'The decision-rows fixture confirms REJECTED, NEEDS_RETRACE, and KEEP_CURRENT rows are decision rows only.',
      'The mixed-approved-decision-pending fixture confirms only APPROVED rows enter patch preview when decision and pending rows are present.',
      'The operator-input-preservation fixture confirms regenerated packages preserve filled editable fields.',
    ],
    cases: caseResults.map(({
      patchPreviewText: _patchPreviewText,
      inputAidStdout: _inputAidStdout,
      inputAidStderr: _inputAidStderr,
      stdout: _stdout,
      stderr: _stderr,
      applyReadyStdout: _applyReadyStdout,
      applyReadyStderr: _applyReadyStderr,
      postApplyStdout: _postApplyStdout,
      postApplyStderr: _postApplyStderr,
      operatorStatusStdout: _operatorStatusStdout,
      operatorStatusStderr: _operatorStatusStderr,
      manualPatchPlanStdout: _manualPatchPlanStdout,
      manualPatchPlanStderr: _manualPatchPlanStderr,
      realApprovalReadinessStdout: _realApprovalReadinessStdout,
      realApprovalReadinessStderr: _realApprovalReadinessStderr,
      ...result
    }) => result),
  };

  await fs.writeFile(summaryJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(summaryMarkdownPath, [
    '# Sajik Stage 01 Prewrite Smoke',
    '',
    `- smoke version: \`${SMOKE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- cases: \`${summary.passedCases}/${summary.cases}\``,
    `- production data changed: \`${summary.productionDataChanged}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Cases',
    '',
    markdownTable(
      ['case', 'passed', 'input-aid', 'input ready', 'exit', 'status', 'approved', 'patch previews', 'apply-ready', 'post-apply', 'operator-status', 'manual-plan', 'manual rows', 'readiness', 'not-applied', 'applied', 'blocked', 'report'],
      summary.caseSummaries.map((row) => [
        `\`${row.caseId}\``,
        `\`${row.passed}\``,
        `\`${row.inputAidStatus}\``,
        `\`${row.inputAidReadyRows}\``,
        `\`${row.exitCode}\``,
        `\`${row.status}\``,
        `\`${row.approvedRows}\``,
        `\`${row.patchPreviewRows}\``,
        `\`${row.applyReadyStatus}\``,
        `\`${row.postApplyStatus}\``,
        `\`${row.operatorStatus}\``,
        `\`${row.manualPatchPlanStatus}\``,
        `\`${row.manualPatchPlanRows}\``,
        `\`${row.realApprovalReadinessStatus}\``,
        `\`${row.realApprovalReadinessApprovedNotAppliedRows}\``,
        `\`${row.realApprovalReadinessApprovedAppliedRows}\``,
        `\`${row.realApprovalReadinessApprovedBlockedRows}\``,
        `\`${row.report}\``,
      ]),
    ),
    '',
    '## Failed Assertions',
    '',
    failedCases.length > 0 || failedPreservation.length > 0
      ? [
        ...failedCases.flatMap((result) => result.assertions
        .filter((assertion) => !assertion.passed)
          .map((assertion) => `- \`${result.caseId}:${assertion.name}\` ${assertion.detail}`)),
        ...failedPreservation.flatMap((result) => result.assertions
          .filter((assertion) => !assertion.passed)
          .map((assertion) => `- \`${result.caseId}:${assertion.name}\` ${assertion.detail}`)),
      ].join('\n')
      : 'No failed assertions.',
    '',
    '## Operator Package Preservation',
    '',
    `- passed: \`${operatorPackagePreservation.passed}\``,
    `- package summary: \`${operatorPackagePreservation.packageSummary}\``,
    `- regenerated input: \`${operatorPackagePreservation.regeneratedInput}\``,
    '',
  ].join('\n'), 'utf8');

  console.log(`stage01_prewrite_smoke_json:${path.relative(frontendRoot, summaryJsonPath)}`);
  console.log(`stage01_prewrite_smoke_markdown:${path.relative(frontendRoot, summaryMarkdownPath)}`);
  console.log(`status:${summary.status} cases=${summary.passedCases}/${summary.cases} productionDataChanged=${summary.productionDataChanged}`);

  if (summary.status !== 'passed') {
    process.exitCode = 1;
  }
};

const runStage01Prewrite = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: crypto } = await import("node:crypto");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { buildSajikSeatMapDataset, buildSajikSeatMapSectionPatchPayload, formatSajikSeatMapSectionPatchTsFragment, geometrySnapshotForSection, validateSajikSeatMapDataset } = await import("../src/data/sajikSeatMapDataset.ts");
  const { distanceToPolygon, pathBounds, pathToPoints, pointInPolygon, polygonArea } = await import("../src/utils/seatMapPolygonValidator.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultStageDir = path.join(defaultReportDir, 'sajik-stage01-operator');
  const defaultInputPath = path.join(defaultStageDir, 'sajik-seatmap-stage01-operator-input.json');

  const PREWRITE_VERSION = 'SAJIK_STAGE01_PREWRITE_V1';
  const REQUIRED_TARGET_APPROVAL_GATE_VERSION = 'SAJIK_STAGE01_TARGET_APPROVAL_GATE_V1';
  const REQUIRED_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const TARGET_SOURCE_FILE = 'src/data/sajikSeatData.ts';
  const TARGET_APPROVAL_SECTION_ID = '131';
  const TARGET_APPROVAL_GATE_JSON_FILE = '131-approval-gate.json';
  const EXPECTED_STAGE01_ROWS = 16;
  const EXPECTED_STAGE01_SECTION_IDS = [
    '021',
    '022',
    '031',
    '032',
    '121',
    '122',
    '123',
    '124',
    '125',
    '131',
    '132',
    '133',
    '134',
    '135',
    '142',
    '143',
  ];
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT']);
  const REQUIRED_APPROVAL_FIELDS = [
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const REQUIRED_KEEP_CURRENT_FIELDS = [
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const FORBIDDEN_KEEP_CURRENT_FIELDS = [
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
  ];
  const LABEL_NEAR_BOUNDARY_WARNING_PX = 1;
  const AREA_RATIO_WARNING_THRESHOLD = 1.5;
  const AREA_RATIO_BLOCK_THRESHOLD = 2.5;
  const BOUNDS_DELTA_WARNING_PX = 20;
  const BOUNDS_DELTA_BLOCK_PX = 80;
  const POINT_COUNT_WARNING_DELTA = 12;
  const POINT_COUNT_BLOCK_MAX = 64;
  const WRITABLE_SOURCE_FIELDS = [
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.labelX',
    'imageGeometry.labelY',
  ];
  const LOCKED_SOURCE_FIELDS = [
    'imageGeometry.visualPath',
    'imageGeometry.geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
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

  const parseCsv = (content) => {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let index = 0; index < content.length; index += 1) {
      const char = content[index];
      const next = content[index + 1];
      if (quoted) {
        if (char === '"' && next === '"') {
          field += '"';
          index += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"') {
        quoted = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (char !== '\r') {
        field += char;
      }
    }

    if (field || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    const [headers, ...dataRows] = rows.filter((item) => item.some((fieldValue) => fieldValue !== ''));
    if (!headers) return [];
    return dataRows.map((dataRow) => Object.fromEntries(headers.map((header, index) => [header, dataRow[index] ?? ''])));
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

  const readInput = async (filePath) => {
    const content = await fs.readFile(filePath, 'utf8');
    if (filePath.endsWith('.csv')) {
      return {
        packageVersion: REQUIRED_PACKAGE_VERSION,
        targetStage: TARGET_STAGE_LABEL,
        corrections: parseCsv(content),
      };
    }
    return JSON.parse(content);
  };

  const sha256File = async (filePath) => crypto
    .createHash('sha256')
    .update(await fs.readFile(filePath))
    .digest('hex');

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const normalizePath = (value) => String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  const numberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const sorted = (values) => [...values].sort();

  const fieldMissing = (value) => value === '' || value === null || value === undefined;
  const rawRowValue = (row, field) => {
    if (field === 'correctedLabelX') return row.correctedLabelXRaw;
    if (field === 'correctedLabelY') return row.correctedLabelYRaw;
    return row[field];
  };
  const fieldHasPlaceholder = (value) => /^<[^>]+>$/.test(String(value ?? '').trim());
  const placeholderReasonsFor = (row, fields) => fields
    .filter((field) => fieldHasPlaceholder(rawRowValue(row, field)))
    .map((field) => `OPERATOR_PLACEHOLDER_NOT_REPLACED:${field}`);

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);

  const roundDelta = (value) => Number(value.toFixed(2));

  const pointAverage = (points) => {
    if (points.length === 0) return [null, null];
    const [sumX, sumY] = points.reduce(([x, y], point) => [x + point[0], y + point[1]], [0, 0]);
    return [roundDelta(sumX / points.length), roundDelta(sumY / points.length)];
  };

  const geometryStats = (pathData) => {
    const points = pathToPoints(pathData);
    return {
      pointCount: points.length,
      area: roundDelta(polygonArea(points)),
      bounds: pathBounds(pathData),
      centroid: pointAverage(points),
    };
  };

  const geometryReviewForPatchPayload = (payload) => {
    const beforeHit = geometryStats(payload.before.hitPath);
    const afterHit = geometryStats(payload.after.hitPath);
    const beforeLabel = payload.before.labelPoint ?? [null, null];
    const afterLabel = payload.after.labelPoint ?? [null, null];
    return {
      sectionId: payload.sectionId,
      blockId: payload.blockId,
      visualPathLocked: payload.before.visualPath === payload.after.visualPath,
      hitPathChanged: payload.before.hitPath !== payload.after.hitPath,
      labelPointChanged: JSON.stringify(beforeLabel) !== JSON.stringify(afterLabel),
      pointCountBefore: beforeHit.pointCount,
      pointCountAfter: afterHit.pointCount,
      pointCountDelta: afterHit.pointCount - beforeHit.pointCount,
      areaBefore: beforeHit.area,
      areaAfter: afterHit.area,
      areaDelta: roundDelta(afterHit.area - beforeHit.area),
      boundsBefore: beforeHit.bounds,
      boundsAfter: afterHit.bounds,
      centroidBefore: beforeHit.centroid,
      centroidAfter: afterHit.centroid,
      centroidDelta: [
        typeof beforeHit.centroid[0] === 'number' && typeof afterHit.centroid[0] === 'number'
          ? roundDelta(afterHit.centroid[0] - beforeHit.centroid[0])
          : null,
        typeof beforeHit.centroid[1] === 'number' && typeof afterHit.centroid[1] === 'number'
          ? roundDelta(afterHit.centroid[1] - beforeHit.centroid[1])
          : null,
      ],
      boundsDelta: {
        minX: roundDelta(afterHit.bounds.minX - beforeHit.bounds.minX),
        minY: roundDelta(afterHit.bounds.minY - beforeHit.bounds.minY),
        maxX: roundDelta(afterHit.bounds.maxX - beforeHit.bounds.maxX),
        maxY: roundDelta(afterHit.bounds.maxY - beforeHit.bounds.maxY),
      },
      labelPointBefore: beforeLabel,
      labelPointAfter: afterLabel,
      labelPointDelta: [
        typeof beforeLabel[0] === 'number' && typeof afterLabel[0] === 'number'
          ? roundDelta(afterLabel[0] - beforeLabel[0])
          : null,
        typeof beforeLabel[1] === 'number' && typeof afterLabel[1] === 'number'
          ? roundDelta(afterLabel[1] - beforeLabel[1])
          : null,
      ],
      validationStatus: payload.validation?.status ?? '',
      validationIssueCount: payload.validation?.issueCount ?? 0,
    };
  };

  const sourcePatchContractForPatchPayload = (payload) => {
    const review = geometryReviewForPatchPayload(payload);
    const changedSourceFields = [];
    const unexpectedChangedSourceFields = [];

    if (review.hitPathChanged) {
      changedSourceFields.push('imageGeometry.hitPath');
    }
    if (review.labelPointChanged) {
      changedSourceFields.push('imageGeometry.labelPoint', 'imageGeometry.labelX', 'imageGeometry.labelY');
    }
    if (!review.visualPathLocked) {
      unexpectedChangedSourceFields.push('imageGeometry.visualPath');
    }

    changedSourceFields
      .filter((field) => !WRITABLE_SOURCE_FIELDS.includes(field))
      .forEach((field) => unexpectedChangedSourceFields.push(field));

    return {
      sectionId: payload.sectionId,
      targetSourceFile: TARGET_SOURCE_FILE,
      writableSourceFields: WRITABLE_SOURCE_FIELDS,
      lockedSourceFields: LOCKED_SOURCE_FIELDS,
      changedSourceFields,
      unexpectedChangedSourceFields: [...new Set(unexpectedChangedSourceFields)],
      visualPathLocked: review.visualPathLocked,
      hitPathChanged: review.hitPathChanged,
      labelPointChanged: review.labelPointChanged,
      labelXMustMatch: payload.after.labelPoint?.[0] ?? null,
      labelYMustMatch: payload.after.labelPoint?.[1] ?? null,
      patchAllowedFieldsOnly: unexpectedChangedSourceFields.length === 0,
    };
  };

  const normalizeRow = (row) => {
    const correctedLabelX = numberOrNull(row.correctedLabelX);
    const correctedLabelY = numberOrNull(row.correctedLabelY);
    return {
      ...row,
      sectionId: String(row.sectionId ?? '').trim(),
      blockId: String(row.blockId ?? '').trim(),
      batchId: String(row.batchId ?? '').trim(),
      zoneId: String(row.zoneId ?? '').trim(),
      sectionKind: String(row.sectionKind ?? '').trim(),
      mapInteractionStatus: String(row.mapInteractionStatus ?? '').trim(),
      operatorDecision: normalizeDecision(row.operatorDecision),
      correctedPath: normalizePath(row.correctedPath),
      correctedLabelXRaw: row.correctedLabelX,
      correctedLabelYRaw: row.correctedLabelY,
      correctedLabelX,
      correctedLabelY,
      reviewer: String(row.reviewer ?? '').trim(),
      reviewedAt: String(row.reviewedAt ?? '').trim(),
      operatorNote: String(row.operatorNote ?? '').trim(),
    };
  };

  const labelPointForRow = (row) => {
    if (row.correctedLabelX === null || row.correctedLabelY === null) return null;
    return [row.correctedLabelX, row.correctedLabelY];
  };

  const hasPatchCoordinateValue = (row) => row.correctedPath
    || !fieldMissing(row.correctedLabelXRaw)
    || !fieldMissing(row.correctedLabelYRaw);

  const rowHasGeometryDelta = (section, row) => {
    const labelPoint = labelPointForRow(row);
    return row.correctedPath !== section.hitPath
      || (labelPoint && (labelPoint[0] !== section.labelPoint[0] || labelPoint[1] !== section.labelPoint[1]));
  };

  const approvalFingerprintForRow = (row) => JSON.stringify({
    sectionId: row.sectionId,
    operatorDecision: row.operatorDecision,
    correctedPath: normalizePath(row.correctedPath),
    correctedLabelX: row.correctedLabelX,
    correctedLabelY: row.correctedLabelY,
    reviewer: row.reviewer,
    reviewedAt: row.reviewedAt,
    operatorNote: row.operatorNote,
  });

  const approvalFingerprintForGateEntry = (entry) => JSON.stringify({
    sectionId: String(entry?.sectionId ?? '').trim(),
    operatorDecision: normalizeDecision(entry?.operatorDecision),
    correctedPath: normalizePath(entry?.correctedPath),
    correctedLabelX: numberOrNull(entry?.correctedLabelX),
    correctedLabelY: numberOrNull(entry?.correctedLabelY),
    reviewer: String(entry?.reviewer ?? '').trim(),
    reviewedAt: String(entry?.reviewedAt ?? '').trim(),
    operatorNote: String(entry?.operatorNote ?? '').trim(),
  });

  const targetApprovalGateReasonsForRow = ({
    row,
    targetApprovalGate,
    targetApprovalGatePath,
    inputPath,
  }) => {
    if (row.sectionId !== TARGET_APPROVAL_SECTION_ID || row.operatorDecision !== 'APPROVED') {
      return [];
    }

    if (!targetApprovalGate) {
      return [`TARGET_APPROVAL_GATE_REQUIRED:${TARGET_APPROVAL_SECTION_ID}:${relativePath(targetApprovalGatePath)}`];
    }

    const reasons = [];
    const summary = targetApprovalGate.summary ?? {};
    const selectedEntry = targetApprovalGate.selectedEntry ?? null;

    if (summary.gateVersion !== REQUIRED_TARGET_APPROVAL_GATE_VERSION) {
      reasons.push(`TARGET_APPROVAL_GATE_VERSION_MISMATCH:${summary.gateVersion ?? 'missing'}`);
    }
    if (String(summary.targetSectionId ?? '').trim() !== TARGET_APPROVAL_SECTION_ID) {
      reasons.push(`TARGET_APPROVAL_GATE_SECTION_MISMATCH:${summary.targetSectionId ?? 'missing'}:${TARGET_APPROVAL_SECTION_ID}`);
    }
    if (summary.status !== 'ready-for-prewrite') {
      reasons.push(`TARGET_APPROVAL_GATE_NOT_READY:${summary.status ?? 'missing'}`);
    }
    if (summary.selectedDecision !== 'APPROVED') {
      reasons.push(`TARGET_APPROVAL_GATE_DECISION_MISMATCH:${summary.selectedDecision ?? 'missing'}`);
    }
    if (summary.readyForPrewrite !== true) {
      reasons.push(`TARGET_APPROVAL_GATE_READY_FALSE:${summary.readyForPrewrite ?? 'missing'}`);
    }
    if (summary.targetEntryPreflightReadyForApprovalGate !== true) {
      reasons.push(`TARGET_APPROVAL_GATE_PREFLIGHT_NOT_READY:${summary.targetEntryPreflightReadyForApprovalGate ?? 'missing'}`);
    }
    if (!['operator-input', 'matched-sources'].includes(summary.selectedSource)) {
      reasons.push(`TARGET_APPROVAL_GATE_SOURCE_NOT_OPERATOR_INPUT:${summary.selectedSource ?? 'missing'}`);
    }
    if (summary.operatorInput !== relativePath(inputPath)) {
      reasons.push(`TARGET_APPROVAL_GATE_OPERATOR_INPUT_MISMATCH:${summary.operatorInput ?? 'missing'}:${relativePath(inputPath)}`);
    }
    if (summary.productionWriteAllowed !== false || summary.sourceDataWritePerformed !== false) {
      reasons.push('TARGET_APPROVAL_GATE_WRITE_FLAGS_NOT_FALSE');
    }
    if (summary.writesOperatorInput !== false) {
      reasons.push('TARGET_APPROVAL_GATE_WRITES_OPERATOR_INPUT');
    }
    if (summary.writesProductionData !== false) {
      reasons.push('TARGET_APPROVAL_GATE_WRITES_PRODUCTION_DATA');
    }
    if (summary.targetSourceFile !== TARGET_SOURCE_FILE) {
      reasons.push(`TARGET_APPROVAL_GATE_SOURCE_FILE_MISMATCH:${summary.targetSourceFile ?? 'missing'}:${TARGET_SOURCE_FILE}`);
    }
    if (!selectedEntry) {
      reasons.push('TARGET_APPROVAL_GATE_SELECTED_ENTRY_MISSING');
    } else if (approvalFingerprintForGateEntry(selectedEntry) !== approvalFingerprintForRow(row)) {
      reasons.push('TARGET_APPROVAL_GATE_SELECTED_ENTRY_MISMATCH');
    }

    return reasons;
  };

  const noteSuggestsPixelCandidateCopy = (value) => {
    const note = String(value ?? '').toLowerCase();
    if (!note.includes('pixel') || !note.includes('candidate')) return false;
    return /(copy|copied|paste|pasted|복사|붙여넣)/i.test(note);
  };

  const safePathStats = (pathData) => {
    const normalizedPath = normalizePath(pathData);
    const points = pathToPoints(normalizedPath);
    if (points.length === 0) {
      return {
        pointCount: 0,
        area: 0,
        bounds: null,
        points,
      };
    }

    return {
      pointCount: points.length,
      area: roundDelta(polygonArea(points)),
      bounds: pathBounds(normalizedPath),
      points,
    };
  };

  const maxAbsBoundsDelta = (before, after) => {
    if (!before || !after) return null;
    return Math.max(
      Math.abs(after.minX - before.minX),
      Math.abs(after.minY - before.minY),
      Math.abs(after.maxX - before.maxX),
      Math.abs(after.maxY - before.maxY),
    );
  };

  const buildGeometryQualityReview = ({ section, row, labelPoint }) => {
    const correctedPath = normalizePath(row.correctedPath);
    if (!correctedPath || !section) {
      return null;
    }

    const currentHitPath = normalizePath(section.hitPath);
    const currentVisualPath = normalizePath(section.visualPath);
    const correctedStats = safePathStats(correctedPath);
    const currentHitStats = safePathStats(currentHitPath);
    const currentVisualStats = safePathStats(currentVisualPath);
    const areaRatioVsCurrentHit = currentHitStats.area > 0
      ? roundDelta(correctedStats.area / currentHitStats.area)
      : null;
    const areaRatioVsCurrentVisual = currentVisualStats.area > 0
      ? roundDelta(correctedStats.area / currentVisualStats.area)
      : null;
    const boundsMaxAbsDelta = maxAbsBoundsDelta(currentHitStats.bounds, correctedStats.bounds);
    const pointCountDelta = correctedStats.pointCount - currentHitStats.pointCount;
    const labelBoundaryDistance = labelPoint && correctedStats.points.length >= 3
      ? roundDelta(distanceToPolygon(labelPoint, correctedStats.points))
      : null;
    const labelInside = labelPoint && correctedStats.points.length >= 3
      ? pointInPolygon(labelPoint, correctedStats.points)
      : false;

    const reasons = [];
    const warnings = [];

    if (correctedPath === currentHitPath) {
      warnings.push('CORRECTED_PATH_REUSES_CURRENT_HIT_PATH');
    }
    if (correctedPath === currentVisualPath) {
      warnings.push('CORRECTED_PATH_REUSES_CURRENT_VISUAL_PATH');
    }
    if (correctedStats.pointCount > POINT_COUNT_BLOCK_MAX) {
      reasons.push('CORRECTED_POINT_COUNT_TOO_HIGH');
    } else if (Math.abs(pointCountDelta) > POINT_COUNT_WARNING_DELTA) {
      warnings.push('CORRECTED_POINT_COUNT_DELTA_REVIEW');
    }
    if (areaRatioVsCurrentHit !== null && areaRatioVsCurrentHit > AREA_RATIO_BLOCK_THRESHOLD) {
      reasons.push('CORRECTED_GEOMETRY_AREA_DELTA_TOO_LARGE');
    } else if (areaRatioVsCurrentHit !== null && areaRatioVsCurrentHit > AREA_RATIO_WARNING_THRESHOLD) {
      warnings.push('CORRECTED_GEOMETRY_AREA_DELTA_REVIEW');
    }
    if (boundsMaxAbsDelta !== null && boundsMaxAbsDelta > BOUNDS_DELTA_BLOCK_PX) {
      reasons.push('CORRECTED_GEOMETRY_BOUNDS_DELTA_TOO_LARGE');
    } else if (boundsMaxAbsDelta !== null && boundsMaxAbsDelta > BOUNDS_DELTA_WARNING_PX) {
      warnings.push('CORRECTED_GEOMETRY_BOUNDS_DELTA_REVIEW');
    }
    if (
      labelPoint
      && labelInside
      && labelBoundaryDistance !== null
      && labelBoundaryDistance <= LABEL_NEAR_BOUNDARY_WARNING_PX
    ) {
      warnings.push('CORRECTED_LABEL_NEAR_BOUNDARY');
    }

    return {
      reasons,
      warnings,
      review: {
        reusesCurrentHitPath: correctedPath === currentHitPath,
        reusesCurrentVisualPath: correctedPath === currentVisualPath,
        correctedPointCount: correctedStats.pointCount,
        currentHitPointCount: currentHitStats.pointCount,
        pointCountDelta,
        correctedArea: correctedStats.area,
        currentHitArea: currentHitStats.area,
        areaRatioVsCurrentHit,
        areaRatioVsCurrentVisual,
        boundsMaxAbsDelta: boundsMaxAbsDelta === null ? null : roundDelta(boundsMaxAbsDelta),
        labelBoundaryDistance,
        labelNearBoundary: warnings.includes('CORRECTED_LABEL_NEAR_BOUNDARY'),
      },
    };
  };

  const topHitIssuesFor = (dataset, approvedAfterBySectionId) => {
    const seatSections = dataset.sections
      .filter((section) => section.enabled && section.sectionKind === 'SEAT_SECTION')
      .sort((left, right) => left.displayPriority - right.displayPriority);

    return seatSections.flatMap((target) => {
      const targetAfter = approvedAfterBySectionId.get(target.sectionId);
      const labelPoint = targetAfter?.labelPoint ?? target.labelPoint;
      const hits = seatSections.filter((candidate) => {
        const candidateAfter = approvedAfterBySectionId.get(candidate.sectionId);
        const hitPath = candidateAfter?.hitPath ?? candidate.hitPath;
        return pointInPolygon(labelPoint, pathToPoints(hitPath));
      });

      if (hits.length === 0) {
        return [`LABEL_TOP_HIT_MISSING:${target.sectionId}`];
      }
      if (hits.at(-1)?.sectionId !== target.sectionId) {
        return [`LABEL_TOP_HIT_MISMATCH:${target.sectionId}:${hits.at(-1)?.sectionId ?? ''}`];
      }
      return [];
    });
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
  const inputPath = path.resolve(frontendRoot, argValue('--input', defaultInputPath));
  const targetApprovalGatePath = path.resolve(
    frontendRoot,
    argValue('--target-approval-gate', path.join(stageDir, 'targets', TARGET_APPROVAL_GATE_JSON_FILE)),
  );
  const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-prewrite.json');
  const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-prewrite.csv');
  const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-prewrite.md');
  const patchPreviewPath = path.join(stageDir, 'sajik-seatmap-stage01-prewrite.patch-preview.ts');

  const input = await readInput(inputPath);
  const inputSha256 = await sha256File(inputPath);
  const dataset = buildSajikSeatMapDataset();
  const sectionsById = new Map(dataset.sections.map((section) => [section.sectionId, section]));
  const rows = (Array.isArray(input.corrections) ? input.corrections : []).map(normalizeRow);
  const targetApprovalGateRequiredRows = rows.filter((row) => (
    row.sectionId === TARGET_APPROVAL_SECTION_ID && row.operatorDecision === 'APPROVED'
  ));
  const targetApprovalGate = targetApprovalGateRequiredRows.length > 0
    ? await readOptionalJson(targetApprovalGatePath)
    : null;
  const blockers = [];
  const warnings = [];
  const datasetIssues = validateSajikSeatMapDataset(dataset);

  if (input.packageVersion !== REQUIRED_PACKAGE_VERSION) {
    blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${input.packageVersion ?? ''}`);
  }
  if (input.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`INPUT_STAGE_MISMATCH:${input.targetStage ?? ''}`);
  }
  if (datasetIssues.length > 0) {
    blockers.push(`DATASET_VALIDATION_ISSUES:${datasetIssues.length}`);
  }
  if (rows.length !== EXPECTED_STAGE01_ROWS) {
    blockers.push(`STAGE01_INPUT_ROW_COUNT_MISMATCH:${rows.length}:${EXPECTED_STAGE01_ROWS}`);
  }

  const rowIds = sorted(rows.map((row) => row.sectionId));
  const expectedIds = sorted(EXPECTED_STAGE01_SECTION_IDS);
  if (rowIds.join(',') !== expectedIds.join(',')) {
    blockers.push(`STAGE01_INPUT_SECTION_IDS_MISMATCH:${rowIds.join(' ')}:${expectedIds.join(' ')}`);
  }

  const duplicateIds = rows
    .map((row) => row.sectionId)
    .filter((sectionId, index, sectionIds) => sectionIds.indexOf(sectionId) !== index);
  if (duplicateIds.length > 0) {
    blockers.push(`DUPLICATE_STAGE01_SECTION_ID:${[...new Set(duplicateIds)].join(' ')}`);
  }

  const approvedAfterBySectionId = new Map();
  const rowReports = rows.map((row) => {
    const section = sectionsById.get(row.sectionId);
    const reasons = [];
    const rowWarnings = [];
    let geometryQualityReview = null;

    if (!DECISION_OPTIONS.has(row.operatorDecision)) {
      reasons.push(`INVALID_OPERATOR_DECISION:${row.operatorDecision}`);
    }
    if (!section) {
      reasons.push('SECTION_NOT_FOUND');
    }
    if (section && section.sectionKind !== 'SEAT_SECTION') {
      reasons.push(`SECTION_KIND_NOT_WRITABLE:${section.sectionKind}`);
    }
    if (section && !section.enabled) {
      reasons.push('SECTION_NOT_MAP_SELECTABLE');
    }

    let patchPayload = null;
    if (row.operatorDecision === 'APPROVED' && section) {
      const targetApprovalGateReasons = targetApprovalGateReasonsForRow({
        row,
        targetApprovalGate,
        targetApprovalGatePath,
        inputPath,
      });
      reasons.push(...targetApprovalGateReasons);

      if (noteSuggestsPixelCandidateCopy(row.operatorNote)) {
        rowWarnings.push('OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW');
      }
      REQUIRED_APPROVAL_FIELDS.forEach((field) => {
        if (fieldMissing(row[field])) {
          reasons.push(`APPROVAL_FIELD_REQUIRED:${field}`);
        }
      });
      reasons.push(...placeholderReasonsFor(row, REQUIRED_APPROVAL_FIELDS));
      if (row.reviewedAt && Number.isNaN(Date.parse(row.reviewedAt))) {
        reasons.push('REVIEWED_AT_INVALID_DATE');
      }
      if (!fieldMissing(row.correctedLabelXRaw) && row.correctedLabelX === null) {
        reasons.push('APPROVAL_FIELD_INVALID_NUMBER:correctedLabelX');
      }
      if (!fieldMissing(row.correctedLabelYRaw) && row.correctedLabelY === null) {
        reasons.push('APPROVAL_FIELD_INVALID_NUMBER:correctedLabelY');
      }

      const labelPoint = labelPointForRow(row);
      if (labelPoint) {
        const after = {
          visualPath: section.visualPath,
          hitPath: row.correctedPath,
          labelPoint,
          visualPolygon: pathToPoints(section.visualPath),
          hitPolygon: pathToPoints(row.correctedPath),
        };
        patchPayload = buildSajikSeatMapSectionPatchPayload(section, dataset, after);
        if (patchPayload.validation.status !== 'PASS') {
          reasons.push(...patchPayload.validation.issues.map((issue) => `${issue.pathKind ?? 'geometry'}:${issue.code}`));
        }
        geometryQualityReview = buildGeometryQualityReview({ section, row, labelPoint });
        if (geometryQualityReview) {
          reasons.push(...geometryQualityReview.reasons);
          rowWarnings.push(...geometryQualityReview.warnings);
        }
        if (!rowHasGeometryDelta(section, row)) {
          rowWarnings.push('APPROVED_NO_GEOMETRY_DELTA');
        }
        if (reasons.length === 0) {
          approvedAfterBySectionId.set(row.sectionId, after);
        }
      }
    }

    if (row.operatorDecision === 'KEEP_CURRENT') {
      REQUIRED_KEEP_CURRENT_FIELDS.forEach((field) => {
        if (fieldMissing(row[field])) {
          reasons.push(`KEEP_CURRENT_FIELD_REQUIRED:${field}`);
        }
      });
      reasons.push(...placeholderReasonsFor(row, REQUIRED_KEEP_CURRENT_FIELDS));
      if (row.reviewedAt && Number.isNaN(Date.parse(row.reviewedAt))) {
        reasons.push('KEEP_CURRENT_REVIEWED_AT_INVALID_DATE');
      }
      if (hasPatchCoordinateValue(row)) {
        reasons.push('KEEP_CURRENT_ROW_HAS_COORDINATE_FIELDS');
      }
    }

    if (row.operatorDecision === 'REJECTED' || row.operatorDecision === 'NEEDS_RETRACE') {
      if (!row.operatorNote) rowWarnings.push('DECISION_NOTE_RECOMMENDED');
    }

    return {
      sectionId: row.sectionId,
      blockId: row.blockId || section?.blockId || '',
      batchId: row.batchId,
      zoneId: row.zoneId,
      sectionName: section?.sectionName ?? row.sectionName ?? '',
      seatCategoryLabel: section?.seatCategoryLabel ?? row.seatCategoryLabel ?? '',
      operatorDecision: row.operatorDecision,
      approved: row.operatorDecision === 'APPROVED',
      skipped: row.operatorDecision !== 'APPROVED',
      validForPatchPreview: row.operatorDecision === 'APPROVED' && reasons.length === 0,
      geometryDelta: section ? rowHasGeometryDelta(section, row) : false,
      reviewer: row.reviewer,
      reviewedAt: row.reviewedAt,
      reasons,
      warnings: rowWarnings,
      targetApprovalGateRequired: row.sectionId === TARGET_APPROVAL_SECTION_ID && row.operatorDecision === 'APPROVED',
      targetApprovalGateStatus: row.sectionId === TARGET_APPROVAL_SECTION_ID && row.operatorDecision === 'APPROVED'
        ? targetApprovalGate?.summary?.status ?? 'missing'
        : '',
      geometryQualityReview: geometryQualityReview?.review ?? null,
      patchPayload,
    };
  });

  const topHitIssues = topHitIssuesFor(dataset, approvedAfterBySectionId);
  if (topHitIssues.length > 0) {
    blockers.push(...topHitIssues);
  }

  rowReports
    .filter((row) => row.reasons.length > 0 && row.operatorDecision === 'APPROVED')
    .forEach((row) => blockers.push(`APPROVED_ROW_INVALID:${row.sectionId}:${row.reasons.join('|')}`));
  rowReports
    .filter((row) => row.reasons.length > 0 && row.operatorDecision === 'KEEP_CURRENT')
    .forEach((row) => blockers.push(`KEEP_CURRENT_ROW_INVALID:${row.sectionId}:${row.reasons.join('|')}`));

  const approvedRows = rowReports.filter((row) => row.approved);
  const validApprovedRows = approvedRows.filter((row) => row.validForPatchPreview);
  const patchPreviewRows = rowReports.filter((row) => row.validForPatchPreview && row.patchPayload);
  const keepCurrentRows = rowReports.filter((row) => row.operatorDecision === 'KEEP_CURRENT');
  const patchReviewRows = patchPreviewRows.map((row) => geometryReviewForPatchPayload(row.patchPayload));
  const sourcePatchContractRows = patchPreviewRows.map((row) => sourcePatchContractForPatchPayload(row.patchPayload));

  sourcePatchContractRows
    .filter((row) => !row.patchAllowedFieldsOnly)
    .forEach((row) => blockers.push(`PATCH_PREVIEW_WRITES_LOCKED_FIELD:${row.sectionId}:${row.unexpectedChangedSourceFields.join('|')}`));

  if (approvedRows.length === 0) {
    warnings.push('NO_OPERATOR_APPROVED_STAGE01_ROWS');
  }
  rowReports
    .filter((row) => row.operatorDecision === 'REJECTED' || row.operatorDecision === 'NEEDS_RETRACE' || row.operatorDecision === 'KEEP_CURRENT')
    .forEach((row) => warnings.push(`STAGE01_ROW_NOT_APPROVED:${row.sectionId}:${row.operatorDecision}`));

  const status = blockers.length > 0
    ? 'blocked'
    : approvedRows.length === 0
      ? 'waiting-for-operator'
      : 'ready-for-data-patch';

  const summary = {
    prewriteVersion: PREWRITE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    input: path.relative(frontendRoot, inputPath),
    inputSha256,
    stadiumId: dataset.stadiumId,
    mapVersion: dataset.mapVersion,
    viewBox: dataset.image.viewBox,
    targetStage: TARGET_STAGE_LABEL,
    targetSourceFile: TARGET_SOURCE_FILE,
    targetApprovalGate: relativePath(targetApprovalGatePath),
    targetApprovalGateRequiredRows: targetApprovalGateRequiredRows.length,
    targetApprovalGateStatus: targetApprovalGate?.summary?.status ?? (targetApprovalGateRequiredRows.length > 0 ? 'missing' : 'not-required'),
    totalRows: rows.length,
    expectedRows: EXPECTED_STAGE01_ROWS,
    approvedRows: approvedRows.length,
    validApprovedRows: validApprovedRows.length,
    keepCurrentRows: keepCurrentRows.length,
    skippedRows: rowReports.filter((row) => row.skipped).length,
    patchPreviewRows: patchPreviewRows.length,
    topHitIssues: topHitIssues.length,
    productionDataChanged: false,
    productionWriteAllowed: false,
    writableSourceFields: WRITABLE_SOURCE_FIELDS,
    lockedSourceFields: LOCKED_SOURCE_FIELDS,
    blockers,
    warnings,
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    operatorInputSchema: {
      editableFields: [
        'operatorDecision',
        'correctedPath',
        'correctedLabelX',
        'correctedLabelY',
        'reviewer',
        'reviewedAt',
        'operatorNote',
      ],
      decisionOptions: [...DECISION_OPTIONS],
      approvedRequiredFields: ['operatorDecision=APPROVED', ...REQUIRED_APPROVAL_FIELDS],
      keepCurrentRequiredFields: ['operatorDecision=KEEP_CURRENT', ...REQUIRED_KEEP_CURRENT_FIELDS],
      keepCurrentForbiddenFields: FORBIDDEN_KEEP_CURRENT_FIELDS,
      productionWritableDecisions: ['APPROVED'],
      noPatchPreviewDecisions: ['PENDING', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT'],
    },
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    safetyContract: [
      'This script is a prewrite gate only; it never edits src/data/sajikSeatData.ts.',
      'Only operatorDecision=APPROVED rows can produce patch preview fragments.',
      'PENDING, REJECTED, NEEDS_RETRACE, and KEEP_CURRENT rows never produce patch preview fragments.',
      'Stage 01 applies correctedPath as hitPath while keeping visualPath fixed to the current official traced path.',
      'Alias-only sections and accessibility markers are blocked from patch previews.',
      'Top-hit checks run across the seat section hitPath layer after applying approved Stage 01 rows in memory.',
      'Patch previews may only target imageGeometry.hitPath, imageGeometry.labelPoint, imageGeometry.labelX, and imageGeometry.labelY.',
      'imageGeometry.visualPath, geometryVersion, sectionKind, markerType, mapInteractionStatus, and trace metadata are locked.',
    ],
    sourcePatchContract: {
      targetSourceFile: TARGET_SOURCE_FILE,
      writableSourceFields: WRITABLE_SOURCE_FIELDS,
      lockedSourceFields: LOCKED_SOURCE_FIELDS,
      productionWriteAllowed: false,
      productionDataChanged: false,
    },
    targetApprovalGateContract: {
      requiredForSectionIds: [TARGET_APPROVAL_SECTION_ID],
      requiredGateVersion: REQUIRED_TARGET_APPROVAL_GATE_VERSION,
      targetApprovalGate: relativePath(targetApprovalGatePath),
      requiredRows: targetApprovalGateRequiredRows.length,
      status: targetApprovalGate?.summary?.status ?? (targetApprovalGateRequiredRows.length > 0 ? 'missing' : 'not-required'),
      targetSectionId: targetApprovalGate?.summary?.targetSectionId ?? null,
      selectedSource: targetApprovalGate?.summary?.selectedSource ?? null,
      selectedDecision: targetApprovalGate?.summary?.selectedDecision ?? null,
      readyForPrewrite: targetApprovalGate?.summary?.readyForPrewrite ?? null,
      targetEntryPreflightReadyForApprovalGate: targetApprovalGate?.summary?.targetEntryPreflightReadyForApprovalGate ?? null,
      sourceDataWritePerformed: targetApprovalGate?.summary?.sourceDataWritePerformed ?? null,
      writesOperatorInput: targetApprovalGate?.summary?.writesOperatorInput ?? null,
      writesProductionData: targetApprovalGate?.summary?.writesProductionData ?? null,
      operatorInput: targetApprovalGate?.summary?.operatorInput ?? null,
      selectedEntryFingerprint: targetApprovalGate?.selectedEntry
        ? approvalFingerprintForGateEntry(targetApprovalGate.selectedEntry)
        : null,
    },
    rows: rowReports.map(({ patchPayload, ...row }) => ({
      ...row,
      patchValidationStatus: patchPayload?.validation.status ?? '',
      patchValidationIssueCount: patchPayload?.validation.issueCount ?? 0,
    })),
    patchPayloads: patchPreviewRows.map((row) => row.patchPayload),
    patchReviewRows,
    sourcePatchContractRows,
  };

  await fs.mkdir(stageDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'sectionId',
      'batchId',
      'zoneId',
      'operatorDecision',
      'validForPatchPreview',
      'visualPathLocked',
      'geometryDelta',
      'pointCountDelta',
      'areaDelta',
      'boundsDelta',
      'centroidDelta',
      'labelPointDelta',
      'areaRatioVsCurrentHit',
      'boundsMaxAbsDelta',
      'patchAllowedFieldsOnly',
      'changedSourceFields',
      'unexpectedChangedSourceFields',
      'reviewer',
      'reviewedAt',
      'reasons',
      'warnings',
    ],
    ...rowReports.map((row) => [
      row.sectionId,
      row.batchId,
      row.zoneId,
      row.operatorDecision,
      row.validForPatchPreview,
      row.patchPayload ? geometryReviewForPatchPayload(row.patchPayload).visualPathLocked : '',
      row.geometryDelta,
      row.patchPayload ? geometryReviewForPatchPayload(row.patchPayload).pointCountDelta : '',
      row.patchPayload ? geometryReviewForPatchPayload(row.patchPayload).areaDelta : '',
      row.patchPayload ? JSON.stringify(geometryReviewForPatchPayload(row.patchPayload).boundsDelta) : '',
      row.patchPayload ? geometryReviewForPatchPayload(row.patchPayload).centroidDelta.join(',') : '',
      row.patchPayload ? geometryReviewForPatchPayload(row.patchPayload).labelPointDelta.join(',') : '',
      row.geometryQualityReview?.areaRatioVsCurrentHit ?? '',
      row.geometryQualityReview?.boundsMaxAbsDelta ?? '',
      row.patchPayload ? sourcePatchContractForPatchPayload(row.patchPayload).patchAllowedFieldsOnly : '',
      row.patchPayload ? sourcePatchContractForPatchPayload(row.patchPayload).changedSourceFields.join('; ') : '',
      row.patchPayload ? sourcePatchContractForPatchPayload(row.patchPayload).unexpectedChangedSourceFields.join('; ') : '',
      row.reviewer,
      row.reviewedAt,
      row.reasons.join('; '),
      row.warnings.join('; '),
    ]),
  ]);

  const patchPreview = patchPreviewRows.length > 0
    ? patchPreviewRows.map((row) => formatSajikSeatMapSectionPatchTsFragment(row.patchPayload)).join('\n\n')
    : [
      '// No Sajik Stage 01 operator-approved geometry rows are ready for patch preview.',
      `// Input: ${path.relative(frontendRoot, inputPath)}`,
      `// Current status: ${status}`,
    ].join('\n');
  await fs.writeFile(patchPreviewPath, `${patchPreview}\n`, 'utf8');

  await fs.writeFile(markdownPath, [
    '# Sajik Stage 01 Prewrite Gate',
    '',
    `- prewrite version: \`${PREWRITE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- input: \`${summary.input}\``,
    `- rows: \`${summary.totalRows}/${summary.expectedRows}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- valid approved rows: \`${summary.validApprovedRows}\``,
    `- keep current rows: \`${summary.keepCurrentRows}\``,
    `- patch preview rows: \`${summary.patchPreviewRows}\``,
    `- target approval gate: \`${summary.targetApprovalGate}\``,
    `- target approval gate required rows: \`${summary.targetApprovalGateRequiredRows}\``,
    `- target approval gate status: \`${summary.targetApprovalGateStatus}\``,
    `- production data changed: \`${summary.productionDataChanged}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Target Approval Gate Contract',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['requiredForSectionIds', `\`${report.targetApprovalGateContract.requiredForSectionIds.join(',')}\``],
        ['requiredGateVersion', `\`${report.targetApprovalGateContract.requiredGateVersion}\``],
        ['targetApprovalGate', `\`${report.targetApprovalGateContract.targetApprovalGate}\``],
        ['requiredRows', `\`${report.targetApprovalGateContract.requiredRows}\``],
        ['status', `\`${report.targetApprovalGateContract.status}\``],
        ['selectedSource', `\`${report.targetApprovalGateContract.selectedSource ?? '-'}\``],
        ['selectedDecision', `\`${report.targetApprovalGateContract.selectedDecision ?? '-'}\``],
        ['readyForPrewrite', `\`${report.targetApprovalGateContract.readyForPrewrite ?? '-'}\``],
        ['targetEntryPreflightReadyForApprovalGate', `\`${report.targetApprovalGateContract.targetEntryPreflightReadyForApprovalGate ?? '-'}\``],
        ['sourceDataWritePerformed', `\`${report.targetApprovalGateContract.sourceDataWritePerformed ?? '-'}\``],
        ['operatorInput', `\`${report.targetApprovalGateContract.operatorInput ?? '-'}\``],
      ],
    ),
    '',
    '## Source Patch Contract',
    '',
    `- target source file: \`${TARGET_SOURCE_FILE}\``,
    `- writable source fields: \`${WRITABLE_SOURCE_FIELDS.join('`, `')}\``,
    `- locked source fields: \`${LOCKED_SOURCE_FIELDS.join('`, `')}\``,
    '- patch previews are valid only when `patchAllowedFieldsOnly=true`.',
    '',
    sourcePatchContractRows.length > 0
      ? markdownTable(
        ['section', 'allowed fields only', 'changed source fields', 'unexpected changed fields', 'labelX', 'labelY'],
        sourcePatchContractRows.map((row) => [
          `\`${row.sectionId}\``,
          `\`${row.patchAllowedFieldsOnly}\``,
          `\`${row.changedSourceFields.join(',') || '-'}\``,
          `\`${row.unexpectedChangedSourceFields.join(',') || '-'}\``,
          `\`${row.labelXMustMatch ?? '-'}\``,
          `\`${row.labelYMustMatch ?? '-'}\``,
        ]),
      )
      : 'No operator-approved source patch contract rows are ready.',
    '',
    '## Patch Preview Review',
    '',
    patchReviewRows.length > 0
      ? markdownTable(
        ['section', 'visual locked', 'hit changed', 'label changed', 'points', 'area delta', 'bounds delta', 'centroid delta', 'label delta', 'validation'],
        patchReviewRows.map((row) => [
          `\`${row.sectionId}\``,
          `\`${row.visualPathLocked}\``,
          `\`${row.hitPathChanged}\``,
          `\`${row.labelPointChanged}\``,
          `\`${row.pointCountBefore}->${row.pointCountAfter}\``,
          `\`${row.areaDelta}\``,
          `\`${JSON.stringify(row.boundsDelta)}\``,
          `\`${row.centroidDelta.join(',')}\``,
          `\`${row.labelPointDelta.join(',')}\``,
          `\`${row.validationStatus}:${row.validationIssueCount}\``,
        ]),
      )
      : 'No operator-approved patch preview rows are ready.',
    '',
    '## Rows',
    '',
    markdownTable(
      ['section', 'batch', 'zone', 'decision', 'valid', 'approval gate', 'delta', 'area ratio', 'bounds max delta', 'label boundary', 'reasons', 'warnings'],
      rowReports.map((row) => [
        `\`${row.sectionId}\``,
        `\`${row.batchId}\``,
        `\`${row.zoneId}\``,
        `\`${row.operatorDecision}\``,
        `\`${row.validForPatchPreview}\``,
        row.targetApprovalGateRequired ? `\`${row.targetApprovalGateStatus}\`` : '-',
        `\`${row.geometryDelta}\``,
        row.geometryQualityReview?.areaRatioVsCurrentHit ?? '-',
        row.geometryQualityReview?.boundsMaxAbsDelta ?? '-',
        row.geometryQualityReview?.labelBoundaryDistance ?? '-',
        row.reasons.length > 0 ? row.reasons.join('; ') : '-',
        row.warnings.length > 0 ? row.warnings.join('; ') : '-',
      ]),
    ),
    '',
    '## Outputs',
    '',
    `- \`${path.relative(frontendRoot, jsonPath)}\``,
    `- \`${path.relative(frontendRoot, csvPath)}\``,
    `- \`${path.relative(frontendRoot, patchPreviewPath)}\``,
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No prewrite blockers.',
    '',
    '## Warnings',
    '',
    warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
    '',
  ].join('\n'), 'utf8');

  console.log(`stage01_prewrite_json:${path.relative(frontendRoot, jsonPath)}`);
  console.log(`stage01_prewrite_markdown:${path.relative(frontendRoot, markdownPath)}`);
  console.log(`stage01_prewrite_patch_preview:${path.relative(frontendRoot, patchPreviewPath)}`);
  console.log(`status:${summary.status} rows=${summary.totalRows} approved=${summary.approvedRows} valid=${summary.validApprovedRows} patchPreview=${summary.patchPreviewRows} blockers=${summary.blockers.length}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01ReadinessSummarySmoke = async () => {
  const { spawnSync } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const SMOKE_VERSION = 'SAJIK_STAGE01_READINESS_SUMMARY_SMOKE_V1';
  const SUMMARY_SCRIPT = 'scripts/sajik-seatmap-stage01.mjs';
  const MAX_AGE_SECONDS = 60 * 60;
  const EXPECTED_PREWRITE_SMOKE_CASES = 26;
  const EXPECTED_TARGET_ENTRY_PREFLIGHT_SMOKE_CASES = 12;
  const TARGET_ENTRY_PREFLIGHT_VERSION = 'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_V1';
  const TARGET_ENTRY_PREFLIGHT_SMOKE_VERSION = 'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_SMOKE_V1';
  const TARGET_APPROVAL_GATE_VERSION = 'SAJIK_STAGE01_TARGET_APPROVAL_GATE_V1';
  const REQUIRED_OPERATOR_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const TARGET_APPROVAL_SECTION_ID = '131';
  const EXPECTED_IMAGE_PIXEL_SOURCE = 'reports/stadium/sajik-seatmap-pixel-components.json';
  const EXPECTED_STAGE01_SECTION_IDS = [
    '021',
    '022',
    '031',
    '032',
    '121',
    '122',
    '123',
    '124',
    '125',
    '131',
    '132',
    '133',
    '134',
    '135',
    '142',
    '143',
  ];
  const EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER = [
    '131',
    '032',
    '135',
    '132',
    '031',
    '133',
    '022',
    '143',
    '134',
    '142',
    '121',
    '124',
    '125',
    '122',
    '021',
    '123',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const stageDir = path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator');
  const smokeRoot = path.join(stageDir, 'summary-smoke', `run-${Date.now()}-${process.pid}`);
  const smokeJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-readiness-summary-smoke.json');
  const smokeMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-readiness-summary-smoke.md');

  const reportRelativePaths = {
    operatorPackage: 'sajik-seatmap-stage01-operator-package.json',
    operatorInput: 'sajik-seatmap-stage01-operator-input.json',
    reviewBoard: 'sajik-seatmap-stage01-review-board.json',
    realApprovalReadiness: 'sajik-seatmap-stage01-real-approval-readiness.json',
    prewriteSmoke: 'sajik-seatmap-stage01-prewrite-smoke.json',
    approvedDryRun: 'dry-run/sajik-seatmap-stage01-approved-dry-run.json',
    appliedDryRun: 'applied-dry-run/sajik-seatmap-stage01-applied-dry-run.json',
    targetEntryPreflight: 'targets/131-entry-preflight.json',
    targetEntryPreflightSmoke: 'sajik-seatmap-stage01-target-entry-preflight-smoke.json',
    targetApprovalGate: 'targets/131-approval-gate.json',
  };

  function imageRiskLevelForRank(rank) {
    if (rank <= 3) return 'HIGH';
    if (rank <= 10) return 'MEDIUM';
    return 'LOW';
  }

  function buildOperatorCorrection(sectionId, index) {
    const rank = index + 1;
    return {
      sectionId,
      imagePriorityRank: rank,
      imageRiskLevel: imageRiskLevelForRank(rank),
      imageRiskReasons: rank <= 3 ? ['SMOKE_HIGH_RISK'] : [],
      imageCandidateStatus: 'PIXEL_CANDIDATE_READY',
      imageAnalysisSource: EXPECTED_IMAGE_PIXEL_SOURCE,
      imageCandidateReferenceOnly: true,
      operatorDecision: 'PENDING',
    };
  }

  function formatRelative(filePath) {
    return path.relative(frontendRoot, filePath);
  }

  async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  }

  async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  function buildBaseReports(generatedAt = new Date().toISOString()) {
    const corrections = EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER.map(buildOperatorCorrection);

    return {
      operatorPackage: {
        generatedAt,
        packageVersion: REQUIRED_OPERATOR_PACKAGE_VERSION,
        status: 'waiting-for-operator',
        totalRows: EXPECTED_STAGE01_SECTION_IDS.length,
        productionWriteAllowed: false,
        sourceOfTruth: false,
        pixelComponents: EXPECTED_IMAGE_PIXEL_SOURCE,
        imageAnalysisMetadataRegenerated: true,
        imageCandidateReferenceOnly: true,
        imageRiskCounts: {
          HIGH: 3,
          MEDIUM: 7,
          LOW: 6,
        },
        imageAnalysisPriorityOrder: [...EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER],
      },
      operatorInput: {
        generatedAt,
        packageVersion: REQUIRED_OPERATOR_PACKAGE_VERSION,
        status: 'waiting-for-operator',
        targetStage: TARGET_STAGE_LABEL,
        corrections,
      },
      reviewBoard: {
        generatedAt,
        summary: {
          status: 'waiting-for-operator',
          generatedAt,
          totalRows: EXPECTED_STAGE01_SECTION_IDS.length,
          productionWriteAllowed: false,
          sourceDataWritePerformed: false,
          imageAnalysis: {
            source: EXPECTED_IMAGE_PIXEL_SOURCE,
            officialPngOnly: true,
            candidateReferenceOnly: true,
            stage01RowsWithPixelCandidate: EXPECTED_STAGE01_SECTION_IDS.length,
            highRiskRows: 3,
            mediumRiskRows: 7,
            lowRiskRows: 6,
            priorityOrder: [...EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER],
            guardrail: 'Pixel component paths are evidence for operator review only and must not be copied into correctedPath without operator approval.',
          },
        },
      },
      realApprovalReadiness: {
        summary: {
          status: 'waiting-for-operator',
          generatedAt,
          approvedRows: 0,
          manualPatchRows: 0,
          safetyContract: {
            sourceDataWritePerformed: false,
            productionWriteAllowed: false,
            productionDataChanged: false,
          },
        },
      },
      prewriteSmoke: {
        summary: {
          status: 'passed',
          generatedAt,
          cases: EXPECTED_PREWRITE_SMOKE_CASES,
          failedCases: 0,
          productionWriteAllowed: false,
          productionDataChanged: false,
          caseSummaries: [
            {
              caseId: 'approved-no-delta',
              realApprovalReadinessApprovedAppliedRows: 1,
              realApprovalReadinessApprovedNotAppliedRows: 0,
              realApprovalReadinessApprovedBlockedRows: 0,
            },
            {
              caseId: 'approved-with-delta',
              realApprovalReadinessApprovedAppliedRows: 0,
              realApprovalReadinessApprovedNotAppliedRows: 1,
              realApprovalReadinessApprovedBlockedRows: 0,
            },
            {
              caseId: 'approved-applied-after-manual-patch',
              realApprovalReadinessApprovedAppliedRows: 1,
              realApprovalReadinessApprovedNotAppliedRows: 0,
              realApprovalReadinessApprovedBlockedRows: 0,
            },
          ],
        },
      },
      approvedDryRun: {
        status: 'passed',
        generatedAt,
        flow: {
          postApplyStatus: 'not-applied',
          manualPatchRows: 1,
        },
        safetyContract: {
          sourceDataWritePerformed: false,
          productionWriteAllowed: false,
          productionDataChanged: false,
        },
        realApprovalReadinessContract: {
          readinessStatus: 'APPROVED_NOT_APPLIED',
        },
      },
      appliedDryRun: {
        status: 'passed',
        generatedAt,
        flow: {
          postApplyStatus: 'applied',
          manualPatchRows: 0,
        },
        safetyContract: {
          sourceDataWritePerformed: false,
          productionWriteAllowed: false,
          productionDataChanged: false,
        },
        appliedContract: {
          operatorStatusRowStatus: 'APPLIED',
        },
        realApprovalReadinessContract: {
          readinessStatus: 'APPROVED_APPLIED',
        },
      },
      targetEntryPreflight: {
        generatedAt,
        summary: {
          preflightVersion: TARGET_ENTRY_PREFLIGHT_VERSION,
          status: 'waiting-for-operator',
          generatedAt,
          targetStage: TARGET_STAGE_LABEL,
          targetSectionId: TARGET_APPROVAL_SECTION_ID,
          selectedSource: 'none',
          selectedDecision: 'PENDING',
          readyForApprovalGate: false,
          productionWriteAllowed: false,
          sourceDataWritePerformed: false,
          writesOperatorInput: false,
          writesProductionData: false,
          blockers: [],
          warnings: [],
        },
      },
      targetEntryPreflightSmoke: {
        version: TARGET_ENTRY_PREFLIGHT_SMOKE_VERSION,
        status: 'passed',
        generatedAt,
        totalCases: EXPECTED_TARGET_ENTRY_PREFLIGHT_SMOKE_CASES,
        passedCases: EXPECTED_TARGET_ENTRY_PREFLIGHT_SMOKE_CASES,
        failedCases: 0,
        sourceDataWritePerformed: false,
        writesOperatorInput: false,
        writesProductionData: false,
        cases: [],
      },
      targetApprovalGate: {
        generatedAt,
        summary: {
          gateVersion: TARGET_APPROVAL_GATE_VERSION,
          status: 'waiting-for-operator',
          targetStage: TARGET_STAGE_LABEL,
          targetSectionId: TARGET_APPROVAL_SECTION_ID,
          selectedSource: 'none',
          selectedDecision: 'PENDING',
          readyForPrewrite: false,
          approved: false,
          productionWriteAllowed: false,
          sourceDataWritePerformed: false,
          writesOperatorInput: false,
          writesProductionData: false,
          blockers: [],
          warnings: [],
        },
      },
    };
  }

  async function writeFixtureReports(caseDir, reports) {
    for (const [id, relativePath] of Object.entries(reportRelativePaths)) {
      if (reports[id] === undefined) {
        continue;
      }
      await writeJson(path.join(caseDir, relativePath), reports[id]);
    }
  }

  async function ageFixtureReports(caseDir, staleDate) {
    for (const relativePath of Object.values(reportRelativePaths)) {
      const filePath = path.join(caseDir, relativePath);
      await fs.utimes(filePath, staleDate, staleDate);
    }
  }

  function runSummary(caseDir, maxAgeSeconds = MAX_AGE_SECONDS) {
    return spawnSync(
      process.execPath,
      [
        path.join(frontendRoot, SUMMARY_SCRIPT),
        '--stage-dir',
        caseDir,
        '--max-age-seconds',
        String(maxAgeSeconds),
      ],
      {
        cwd: frontendRoot,
        encoding: 'utf8',
      },
    );
  }

  async function runCase(caseSpec) {
    const caseDir = path.join(smokeRoot, caseSpec.caseId);
    const reports = buildBaseReports(caseSpec.generatedAt ?? new Date().toISOString());

    if (caseSpec.mutateReports) {
      caseSpec.mutateReports(reports);
    }

    await writeFixtureReports(caseDir, reports);

    if (caseSpec.staleDate) {
      await ageFixtureReports(caseDir, caseSpec.staleDate);
    }

    const result = runSummary(caseDir, caseSpec.maxAgeSeconds);
    const summaryPath = path.join(caseDir, 'sajik-seatmap-stage01-readiness-summary.json');
    const summary = await readJson(summaryPath).catch(() => null);
    const issueCodes = (summary?.issues ?? []).map((issue) => issue.code);
    const passed = result.status === caseSpec.expectedExit
      && summary?.status === caseSpec.expectedSummaryStatus
      && caseSpec.expectedIssueCodes.every((code) => issueCodes.includes(code));

    return {
      caseId: caseSpec.caseId,
      passed,
      expectedExit: caseSpec.expectedExit,
      actualExit: result.status,
      expectedSummaryStatus: caseSpec.expectedSummaryStatus,
      actualSummaryStatus: summary?.status ?? 'missing',
      expectedIssueCodes: caseSpec.expectedIssueCodes,
      actualIssueCodes: issueCodes,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      summary: formatRelative(summaryPath),
    };
  }

  function buildMarkdown(report) {
    const lines = [
      '# Sajik Stage 01 Readiness Summary Smoke',
      '',
      `- status: \`${report.status}\``,
      `- cases: \`${report.passedCases}/${report.totalCases}\``,
      `- smokeRoot: \`${report.smokeRoot}\``,
      '',
      '| Case | Status | Expected Issues | Actual Issues |',
      '| --- | --- | --- | --- |',
      ...report.cases.map((row) => [
        row.caseId,
        row.passed ? 'passed' : 'failed',
        row.expectedIssueCodes.join(', ') || '-',
        row.actualIssueCodes.join(', ') || '-',
      ]).map((columns) => `| ${columns.join(' | ')} |`),
    ];

    return `${lines.join('\n')}\n`;
  }

  async function main() {
    const staleGeneratedAt = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const staleDate = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const caseSpecs = [
      {
        caseId: 'valid-summary',
        expectedExit: 0,
        expectedSummaryStatus: 'passed',
        expectedIssueCodes: [],
      },
      {
        caseId: 'missing-report',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['REPORT_MISSING'],
        mutateReports: (reports) => {
          delete reports.appliedDryRun;
        },
      },
      {
        caseId: 'review-board-missing',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['REPORT_MISSING'],
        mutateReports: (reports) => {
          delete reports.reviewBoard;
        },
      },
      {
        caseId: 'stale-report',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['REPORT_NOT_FRESH'],
        generatedAt: staleGeneratedAt,
        staleDate,
      },
      {
        caseId: 'approved-readiness-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['APPROVED_DRY_RUN_READINESS_ROW_CHANGED'],
        mutateReports: (reports) => {
          reports.approvedDryRun.realApprovalReadinessContract.readinessStatus = 'APPROVED_APPLIED';
        },
      },
      {
        caseId: 'applied-readiness-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['APPLIED_DRY_RUN_READINESS_ROW_CHANGED'],
        mutateReports: (reports) => {
          reports.appliedDryRun.realApprovalReadinessContract.readinessStatus = 'APPROVED_NOT_APPLIED';
        },
      },
      {
        caseId: 'image-analysis-priority-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['REVIEW_BOARD_IMAGE_PRIORITY_CHANGED', 'PACKAGE_REVIEW_BOARD_IMAGE_PRIORITY_MISMATCH'],
        mutateReports: (reports) => {
          reports.reviewBoard.summary.imageAnalysis.priorityOrder = [
            '032',
            '131',
            ...EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER.slice(2),
          ];
        },
      },
      {
        caseId: 'image-analysis-risk-count-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['REVIEW_BOARD_IMAGE_RISK_COUNTS_CHANGED'],
        mutateReports: (reports) => {
          reports.reviewBoard.summary.imageAnalysis.highRiskRows = 5;
          reports.reviewBoard.summary.imageAnalysis.mediumRiskRows = 6;
        },
      },
      {
        caseId: 'candidate-reference-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['REVIEW_BOARD_IMAGE_REFERENCE_ONLY_DISABLED'],
        mutateReports: (reports) => {
          reports.reviewBoard.summary.imageAnalysis.candidateReferenceOnly = false;
        },
      },
      {
        caseId: 'pixel-component-source-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['REVIEW_BOARD_PIXEL_COMPONENT_SOURCE_CHANGED'],
        mutateReports: (reports) => {
          reports.reviewBoard.summary.imageAnalysis.source = 'reports/stadium/stale-pixel-components.json';
        },
      },
      {
        caseId: 'package-image-priority-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['OPERATOR_PACKAGE_IMAGE_PRIORITY_CHANGED', 'PACKAGE_REVIEW_BOARD_IMAGE_PRIORITY_MISMATCH'],
        mutateReports: (reports) => {
          reports.operatorPackage.imageAnalysisPriorityOrder = [
            '032',
            '131',
            ...EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER.slice(2),
          ];
        },
      },
      {
        caseId: 'package-image-risk-count-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['OPERATOR_PACKAGE_IMAGE_RISK_COUNTS_CHANGED', 'PACKAGE_REVIEW_BOARD_IMAGE_RISK_COUNTS_MISMATCH'],
        mutateReports: (reports) => {
          reports.operatorPackage.imageRiskCounts.HIGH = 5;
          reports.operatorPackage.imageRiskCounts.MEDIUM = 6;
        },
      },
      {
        caseId: 'package-candidate-reference-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['OPERATOR_PACKAGE_IMAGE_REFERENCE_ONLY_DISABLED'],
        mutateReports: (reports) => {
          reports.operatorPackage.imageCandidateReferenceOnly = false;
        },
      },
      {
        caseId: 'package-pixel-component-source-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['OPERATOR_PACKAGE_PIXEL_COMPONENT_SOURCE_CHANGED'],
        mutateReports: (reports) => {
          reports.operatorPackage.pixelComponents = 'reports/stadium/stale-pixel-components.json';
        },
      },
      {
        caseId: 'operator-input-image-priority-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['OPERATOR_INPUT_IMAGE_PRIORITY_CHANGED', 'OPERATOR_INPUT_FIRST_IMAGE_PRIORITY_ROW_CHANGED', 'PACKAGE_OPERATOR_INPUT_IMAGE_PRIORITY_MISMATCH'],
        mutateReports: (reports) => {
          reports.operatorInput.corrections = [
            reports.operatorInput.corrections[1],
            reports.operatorInput.corrections[0],
            ...reports.operatorInput.corrections.slice(2),
          ].map((row, index) => ({
            ...row,
            imagePriorityRank: index + 1,
          }));
        },
      },
      {
        caseId: 'package-review-board-image-mismatch',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['PACKAGE_REVIEW_BOARD_IMAGE_PRIORITY_MISMATCH'],
        mutateReports: (reports) => {
          reports.operatorPackage.imageAnalysisPriorityOrder = [...EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER];
          reports.reviewBoard.summary.imageAnalysis.priorityOrder = [
            ...EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER.slice(0, 15),
            '999',
          ];
        },
      },
      {
        caseId: 'source-write-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['SOURCE_DATA_WRITE_PERFORMED'],
        mutateReports: (reports) => {
          reports.approvedDryRun.safetyContract.sourceDataWritePerformed = true;
        },
      },
      {
        caseId: 'target-entry-preflight-missing',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['REPORT_MISSING'],
        mutateReports: (reports) => {
          delete reports.targetEntryPreflight;
        },
      },
      {
        caseId: 'target-entry-preflight-stale',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['REPORT_NOT_FRESH'],
        mutateReports: (reports) => {
          reports.targetEntryPreflight.generatedAt = staleGeneratedAt;
          reports.targetEntryPreflight.summary.generatedAt = staleGeneratedAt;
        },
      },
      {
        caseId: 'target-entry-preflight-source-write-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['TARGET_ENTRY_PREFLIGHT_SOURCE_DATA_WRITE_PERFORMED'],
        mutateReports: (reports) => {
          reports.targetEntryPreflight.summary.sourceDataWritePerformed = true;
        },
      },
      {
        caseId: 'target-entry-preflight-status-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['TARGET_ENTRY_PREFLIGHT_STATUS_CHANGED'],
        mutateReports: (reports) => {
          reports.targetEntryPreflight.summary.status = 'blocked';
        },
      },
      {
        caseId: 'target-entry-preflight-smoke-failed',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['TARGET_ENTRY_PREFLIGHT_SMOKE_STATUS_CHANGED', 'TARGET_ENTRY_PREFLIGHT_SMOKE_CASE_COUNT_CHANGED'],
        mutateReports: (reports) => {
          reports.targetEntryPreflightSmoke.status = 'failed';
          reports.targetEntryPreflightSmoke.passedCases = EXPECTED_TARGET_ENTRY_PREFLIGHT_SMOKE_CASES - 1;
          reports.targetEntryPreflightSmoke.failedCases = 1;
        },
      },
      {
        caseId: 'target-entry-preflight-target-mismatch',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['TARGET_ENTRY_PREFLIGHT_SECTION_CHANGED'],
        mutateReports: (reports) => {
          reports.targetEntryPreflight.summary.targetSectionId = '132';
        },
      },
      {
        caseId: 'target-approval-gate-missing',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['REPORT_MISSING'],
        mutateReports: (reports) => {
          delete reports.targetApprovalGate;
        },
      },
      {
        caseId: 'target-approval-source-write-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['TARGET_APPROVAL_GATE_SOURCE_DATA_WRITE_PERFORMED'],
        mutateReports: (reports) => {
          reports.targetApprovalGate.summary.sourceDataWritePerformed = true;
        },
      },
      {
        caseId: 'target-approval-status-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['TARGET_APPROVAL_GATE_STATUS_CHANGED'],
        mutateReports: (reports) => {
          reports.targetApprovalGate.summary.status = 'blocked';
        },
      },
      {
        caseId: 'operator-input-drift',
        expectedExit: 1,
        expectedSummaryStatus: 'failed',
        expectedIssueCodes: ['OPERATOR_INPUT_ROW_COUNT_CHANGED'],
        mutateReports: (reports) => {
          reports.operatorInput.corrections.pop();
        },
      },
    ];

    const cases = [];
    for (const caseSpec of caseSpecs) {
      cases.push(await runCase(caseSpec));
    }

    const passedCases = cases.filter((row) => row.passed).length;
    const report = {
      version: SMOKE_VERSION,
      status: passedCases === cases.length ? 'passed' : 'failed',
      generatedAt: new Date().toISOString(),
      smokeRoot: formatRelative(smokeRoot),
      totalCases: cases.length,
      passedCases,
      failedCases: cases.length - passedCases,
      cases,
    };

    await writeJson(smokeJsonPath, report);
    await fs.writeFile(smokeMarkdownPath, buildMarkdown(report), 'utf8');

    console.log(`stage01_readiness_summary_smoke_json:${formatRelative(smokeJsonPath)}`);
    console.log(`stage01_readiness_summary_smoke_markdown:${formatRelative(smokeMarkdownPath)}`);
    console.log(`status:${report.status} cases=${report.passedCases}/${report.totalCases}`);

    if (report.status !== 'passed') {
      process.exitCode = 1;
    }
  }

  main().catch(async (error) => {
    const report = {
      version: SMOKE_VERSION,
      status: 'failed',
      generatedAt: new Date().toISOString(),
      smokeRoot: formatRelative(smokeRoot),
      totalCases: 0,
      passedCases: 0,
      failedCases: 0,
      cases: [],
      issues: [
        {
          code: 'SUMMARY_SMOKE_CRASHED',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
    await writeJson(smokeJsonPath, report).catch(() => {});
    await fs.writeFile(smokeMarkdownPath, buildMarkdown(report), 'utf8').catch(() => {});
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
};

const runStage01ReadinessSummary = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const SUMMARY_VERSION = 'SAJIK_STAGE01_READINESS_SUMMARY_V1';
  const DEFAULT_MAX_REPORT_AGE_SECONDS = 2 * 60 * 60;
  const EXPECTED_PREWRITE_SMOKE_CASES = 26;
  const EXPECTED_TARGET_ENTRY_PREFLIGHT_SMOKE_CASES = 12;
  const REQUIRED_OPERATOR_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
  const REQUIRED_TARGET_ENTRY_PREFLIGHT_VERSION = 'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_V1';
  const REQUIRED_TARGET_ENTRY_PREFLIGHT_SMOKE_VERSION = 'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_SMOKE_V1';
  const REQUIRED_TARGET_APPROVAL_GATE_VERSION = 'SAJIK_STAGE01_TARGET_APPROVAL_GATE_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const TARGET_APPROVAL_SECTION_ID = '131';
  const EXPECTED_STAGE01_ROWS = 16;
  const EXPECTED_IMAGE_HIGH_RISK_ROWS = 3;
  const EXPECTED_IMAGE_MEDIUM_RISK_ROWS = 7;
  const EXPECTED_IMAGE_LOW_RISK_ROWS = 6;
  const EXPECTED_IMAGE_PIXEL_SOURCE = 'reports/stadium/sajik-seatmap-pixel-components.json';
  const EXPECTED_STAGE01_SECTION_IDS = [
    '021',
    '022',
    '031',
    '032',
    '121',
    '122',
    '123',
    '124',
    '125',
    '131',
    '132',
    '133',
    '134',
    '135',
    '142',
    '143',
  ];
  const EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER = [
    '131',
    '032',
    '135',
    '132',
    '031',
    '133',
    '022',
    '143',
    '134',
    '142',
    '121',
    '124',
    '125',
    '122',
    '021',
    '123',
  ];
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT']);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');

  function parseArgs(argv) {
    const options = {
      stageDir: path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator'),
      maxAgeSeconds: DEFAULT_MAX_REPORT_AGE_SECONDS,
    };

    for (let index = 0; index < argv.length; index += 1) {
      const arg = argv[index];
      const next = argv[index + 1];

      if (arg === '--stage-dir') {
        if (!next) {
          throw new Error('--stage-dir requires a path.');
        }
        options.stageDir = path.resolve(frontendRoot, next);
        index += 1;
        continue;
      }

      if (arg === '--max-age-seconds') {
        if (!next) {
          throw new Error('--max-age-seconds requires a number.');
        }
        const parsed = Number(next);
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error('--max-age-seconds must be a non-negative number.');
        }
        options.maxAgeSeconds = parsed;
        index += 1;
        continue;
      }

      throw new Error(`Unknown argument: ${arg}`);
    }

    return options;
  }

  const options = parseArgs(process.argv.slice(2));
  const stageDir = options.stageDir;
  const maxReportAgeMs = options.maxAgeSeconds * 1000;
  const summaryJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-readiness-summary.json');
  const summaryMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-readiness-summary.md');

  const reportFiles = {
    operatorPackage: path.join(stageDir, 'sajik-seatmap-stage01-operator-package.json'),
    operatorInput: path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json'),
    reviewBoard: path.join(stageDir, 'sajik-seatmap-stage01-review-board.json'),
    realApprovalReadiness: path.join(stageDir, 'sajik-seatmap-stage01-real-approval-readiness.json'),
    prewriteSmoke: path.join(stageDir, 'sajik-seatmap-stage01-prewrite-smoke.json'),
    approvedDryRun: path.join(stageDir, 'dry-run/sajik-seatmap-stage01-approved-dry-run.json'),
    appliedDryRun: path.join(stageDir, 'applied-dry-run/sajik-seatmap-stage01-applied-dry-run.json'),
    targetEntryPreflight: path.join(stageDir, 'targets/131-entry-preflight.json'),
    targetEntryPreflightSmoke: path.join(stageDir, 'sajik-seatmap-stage01-target-entry-preflight-smoke.json'),
    targetApprovalGate: path.join(stageDir, 'targets/131-approval-gate.json'),
  };

  function formatRelative(filePath) {
    return path.relative(frontendRoot, filePath);
  }

  async function readReport(id, filePath) {
    const raw = await fs.readFile(filePath, 'utf8');
    const stat = await fs.stat(filePath);
    const json = JSON.parse(raw);
    return {
      id,
      file: formatRelative(filePath),
      json,
      mtimeMs: stat.mtimeMs,
    };
  }

  async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  }

  function reportStatus(report) {
    return report?.status ?? report?.summary?.status ?? 'missing';
  }

  function generatedAt(report) {
    return report?.generatedAt ?? report?.summary?.generatedAt ?? null;
  }

  function addIssue(issues, condition, code, message, details = undefined) {
    if (!condition) {
      issues.push(details === undefined ? { code, message } : { code, message, details });
    }
  }

  function parseTime(value) {
    if (!value) {
      return Number.NaN;
    }
    return Date.parse(value);
  }

  function safetyFor(report) {
    return report?.safetyContract
      ?? report?.summary?.safetyContract
      ?? report?.realApprovalReadinessContract?.safetyContract
      ?? null;
  }

  function safetyFlags(report) {
    const safety = safetyFor(report);
    return {
      sourceDataWritePerformed: safety?.sourceDataWritePerformed
        ?? report?.summary?.sourceDataWritePerformed
        ?? report?.sourceDataWritePerformed
        ?? false,
      productionWriteAllowed: safety?.productionWriteAllowed
        ?? report?.summary?.productionWriteAllowed
        ?? report?.productionWriteAllowed
        ?? false,
      productionDataChanged: safety?.productionDataChanged
        ?? report?.summary?.productionDataChanged
        ?? report?.productionDataChanged
        ?? false,
    };
  }

  function smokeCase(smoke, caseId) {
    return (smoke?.summary?.caseSummaries ?? []).find((row) => row.caseId === caseId) ?? null;
  }

  function normalizeDecision(value) {
    const decision = String(value ?? 'PENDING').trim();
    return decision || 'PENDING';
  }

  function operatorInputRows(operatorInput) {
    return Array.isArray(operatorInput?.corrections) ? operatorInput.corrections : [];
  }

  function decisionCountsFor(rows) {
    return rows.reduce((counts, row) => {
      const decision = normalizeDecision(row.operatorDecision);
      counts[decision] = (counts[decision] ?? 0) + 1;
      return counts;
    }, {});
  }

  function sorted(values) {
    return [...values].sort();
  }

  function riskCountsFromRows(rows) {
    return rows.reduce((counts, row) => {
      const riskLevel = String(row.imageRiskLevel ?? '').trim();
      if (riskLevel) {
        counts[riskLevel] = (counts[riskLevel] ?? 0) + 1;
      }
      return counts;
    }, {});
  }

  function expectedRiskCountsMatch(counts) {
    return counts?.HIGH === EXPECTED_IMAGE_HIGH_RISK_ROWS
      && counts?.MEDIUM === EXPECTED_IMAGE_MEDIUM_RISK_ROWS
      && counts?.LOW === EXPECTED_IMAGE_LOW_RISK_ROWS;
  }

  function imagePriorityMatchesExpected(priorityOrder) {
    return JSON.stringify(priorityOrder) === JSON.stringify(EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER);
  }

  function buildMarkdown(report) {
    const rows = [
      ['status', report.status],
      ['operatorPackageStatus', report.contract.operatorPackageStatus],
      ['operatorPackageImagePriorityOrder', report.contract.operatorPackageImagePriorityOrder.join(' -> ')],
      ['operatorPackageImageRiskRows', `${report.contract.operatorPackageHighRiskRows}/${report.contract.operatorPackageMediumRiskRows}/${report.contract.operatorPackageLowRiskRows}`],
      ['operatorInputStatus', report.contract.operatorInputStatus],
      ['operatorInputRows', String(report.contract.operatorInputRows)],
      ['operatorInputApprovedRows', String(report.contract.operatorInputApprovedRows)],
      ['operatorInputPendingRows', String(report.contract.operatorInputPendingRows)],
      ['operatorInputImagePriorityOrder', report.contract.operatorInputImagePriorityOrder.join(' -> ')],
      ['operatorInputFirstImagePriorityRow', report.contract.operatorInputFirstImagePriorityRow],
      ['reviewBoardStatus', report.contract.reviewBoardStatus],
      ['reviewBoardPixelCandidateRows', String(report.contract.reviewBoardPixelCandidateRows)],
      ['reviewBoardHighRiskRows', String(report.contract.reviewBoardHighRiskRows)],
      ['reviewBoardMediumRiskRows', String(report.contract.reviewBoardMediumRiskRows)],
      ['reviewBoardLowRiskRows', String(report.contract.reviewBoardLowRiskRows)],
      ['reviewBoardImagePriorityOrder', report.contract.reviewBoardImagePriorityOrder.join(' -> ')],
      ['packageReviewBoardImagePriorityMatched', String(report.contract.packageReviewBoardImagePriorityMatched)],
      ['packageReviewBoardImageRiskMatched', String(report.contract.packageReviewBoardImageRiskMatched)],
      ['packageOperatorInputImagePriorityMatched', String(report.contract.packageOperatorInputImagePriorityMatched)],
      ['realApprovalReadiness', report.contract.realApprovalReadinessStatus],
      ['prewriteSmoke', report.contract.prewriteSmokeStatus],
      ['approvedDryRunReadinessRow', report.contract.approvedDryRunReadinessRow],
      ['appliedDryRunReadinessRow', report.contract.appliedDryRunReadinessRow],
      ['targetEntryPreflightStatus', report.contract.targetEntryPreflightStatus],
      ['targetEntryPreflightDecision', report.contract.targetEntryPreflightDecision],
      ['targetEntryPreflightReadyForApprovalGate', String(report.contract.targetEntryPreflightReadyForApprovalGate)],
      ['targetEntryPreflightSmoke', report.contract.targetEntryPreflightSmokeStatus],
      ['targetEntryPreflightSmokeCases', String(report.contract.targetEntryPreflightSmokeCases)],
      ['targetApprovalGateStatus', report.contract.targetApprovalGateStatus],
      ['targetApprovalGateDecision', report.contract.targetApprovalGateDecision],
      ['targetApprovalGateReadyForPrewrite', String(report.contract.targetApprovalGateReadyForPrewrite)],
      ['sourceDataWritePerformed', String(report.contract.sourceDataWritePerformed)],
      ['productionWriteAllowed', String(report.contract.productionWriteAllowed)],
      ['productionDataChanged', String(report.contract.productionDataChanged)],
      ['freshReports', String(report.contract.freshReports)],
    ];

    const lines = [
      '# Sajik Stage 01 Readiness Summary',
      '',
      '| Field | Value |',
      '| --- | --- |',
      ...rows.map(([field, value]) => `| ${field} | ${value} |`),
      '',
      '## Required Reports',
      '',
      ...report.reports.map((entry) => `- ${entry.id}: \`${entry.file}\` generatedAt=\`${entry.generatedAt ?? '-'}\` ageSeconds=\`${entry.ageSeconds}\``),
      '',
      '## Fixed Contract',
      '',
      '- `realApprovalReadiness.status=waiting-for-operator|ready-for-manual-apply`',
      '- `operatorPackage.imageAnalysisMetadataRegenerated=true`',
      '- `operatorPackage.imageAnalysis.candidateReferenceOnly=true`',
      '- `operatorPackage.imageAnalysis.riskRows=3/7/6`',
      '- `operatorPackage.imageAnalysis.priorityOrder=131/032/135/132/031/133/022/143/134/142/121/124/125/122/021/123`',
      '- `operatorPackage.imageAnalysis.source=reports/stadium/sajik-seatmap-pixel-components.json`',
      '- `operatorInput.packageVersion=SAJIK_STAGE01_OPERATOR_PACKAGE_V1`',
      '- `operatorInput.targetStage=Stage 01 P0`',
      '- `operatorInput.rows=16`',
      '- `operatorInput.imagePriorityRank=1 starts with 131`',
      '- `reviewBoard.imageAnalysis.candidateReferenceOnly=true`',
      '- `reviewBoard.imageAnalysis.stage01RowsWithPixelCandidate=16`',
      '- `reviewBoard.imageAnalysis.riskRows=3/7/6`',
      '- `reviewBoard.imageAnalysis.priorityOrder=131/032/135/132/031/133/022/143/134/142/121/124/125/122/021/123`',
      '- `reviewBoard.imageAnalysis.source=reports/stadium/sajik-seatmap-pixel-components.json`',
      '- `prewriteSmoke.status=passed`',
      '- `approvedDryRun.readinessRow=APPROVED_NOT_APPLIED`',
      '- `appliedDryRun.readinessRow=APPROVED_APPLIED`',
      '- `targetEntryPreflight.status=waiting-for-operator|ready-for-approval-gate`',
      '- `targetEntryPreflight.targetSectionId=131`',
      '- `targetEntryPreflight.sourceDataWritePerformed=false`',
      '- `targetEntryPreflightSmoke.status=passed`',
      '- `targetEntryPreflightSmoke.cases=12/12`',
      '- `targetEntryPreflightSmoke.sourceDataWritePerformed=false`',
      '- `targetApprovalGate.status=waiting-for-operator|ready-for-prewrite`',
      '- `targetApprovalGate.targetSectionId=131`',
      '- `targetApprovalGate.sourceDataWritePerformed=false`',
      '- `sourceDataWritePerformed=false`',
      '- `productionWriteAllowed=false`',
      '- `productionDataChanged=false`',
    ];

    if (report.issues.length > 0) {
      lines.push('', '## Issues', '');
      for (const issue of report.issues) {
        lines.push(`- ${issue.code}: ${issue.message}`);
      }
    }

    return `${lines.join('\n')}\n`;
  }

  async function main() {
    const now = Date.now();
    const issues = [];
    const loaded = {};

    for (const [id, filePath] of Object.entries(reportFiles)) {
      try {
        loaded[id] = await readReport(id, filePath);
      } catch (error) {
        issues.push({
          code: 'REPORT_MISSING',
          message: `Required Stage 01 report is missing or unreadable: ${formatRelative(filePath)}`,
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const realApprovalReadiness = loaded.realApprovalReadiness?.json ?? null;
    const operatorPackage = loaded.operatorPackage?.json ?? null;
    const operatorInput = loaded.operatorInput?.json ?? null;
    const reviewBoard = loaded.reviewBoard?.json ?? null;
    const prewriteSmoke = loaded.prewriteSmoke?.json ?? null;
    const approvedDryRun = loaded.approvedDryRun?.json ?? null;
    const appliedDryRun = loaded.appliedDryRun?.json ?? null;
    const targetEntryPreflight = loaded.targetEntryPreflight?.json ?? null;
    const targetEntryPreflightSmoke = loaded.targetEntryPreflightSmoke?.json ?? null;
    const targetApprovalGate = loaded.targetApprovalGate?.json ?? null;
    const operatorRows = operatorInputRows(operatorInput);
    const operatorDecisionCounts = decisionCountsFor(operatorRows);
    const operatorSectionIds = operatorRows.map((row) => String(row.sectionId ?? '').trim());
    const operatorInputImagePriorityOrder = operatorRows
      .map((row) => ({
        sectionId: String(row.sectionId ?? '').trim(),
        imagePriorityRank: Number(row.imagePriorityRank ?? Number.POSITIVE_INFINITY),
      }))
      .sort((left, right) => {
        if (left.imagePriorityRank !== right.imagePriorityRank) {
          return left.imagePriorityRank - right.imagePriorityRank;
        }
        return left.sectionId.localeCompare(right.sectionId, 'ko');
      })
      .map((row) => row.sectionId);
    const operatorInputFirstImagePriorityRow = operatorRows.length > 0
      ? `${operatorRows[0].sectionId ?? ''}:${operatorRows[0].imagePriorityRank ?? ''}`
      : '';
    const operatorInputRiskCounts = riskCountsFromRows(operatorRows);
    const unknownOperatorDecisions = Object.keys(operatorDecisionCounts).filter((decision) => !DECISION_OPTIONS.has(decision));

    const reports = Object.values(loaded).map((entry) => {
      const generated = generatedAt(entry.json);
      const generatedMs = parseTime(generated);
      const ageMs = Number.isFinite(generatedMs) ? now - generatedMs : Number.POSITIVE_INFINITY;
      const mtimeAgeMs = now - entry.mtimeMs;
      return {
        id: entry.id,
        file: entry.file,
        generatedAt: generated,
        ageSeconds: Number.isFinite(ageMs) ? Math.max(0, Math.round(ageMs / 1000)) : null,
        mtimeAgeSeconds: Math.max(0, Math.round(mtimeAgeMs / 1000)),
        fresh: Number.isFinite(ageMs) && ageMs <= maxReportAgeMs && mtimeAgeMs <= maxReportAgeMs,
      };
    });

    for (const entry of reports) {
      addIssue(
        issues,
        entry.fresh,
        'REPORT_NOT_FRESH',
        `${entry.id} must be generated within ${options.maxAgeSeconds} seconds before readiness summary runs.`,
        entry,
      );
    }

    const approvedNoDelta = smokeCase(prewriteSmoke, 'approved-no-delta');
    const approvedWithDelta = smokeCase(prewriteSmoke, 'approved-with-delta');
    const approvedAppliedAfterManualPatch = smokeCase(prewriteSmoke, 'approved-applied-after-manual-patch');

    const operatorPackageRiskCounts = operatorPackage?.imageRiskCounts ?? {};
    const operatorPackagePriorityOrder = Array.isArray(operatorPackage?.imageAnalysisPriorityOrder)
      ? operatorPackage.imageAnalysisPriorityOrder
      : [];

    addIssue(issues, reportStatus(operatorPackage) === 'waiting-for-operator', 'OPERATOR_PACKAGE_STATUS_CHANGED', 'operator package must remain waiting-for-operator for the base Stage 01 readiness gate.', reportStatus(operatorPackage));
    addIssue(issues, operatorPackage?.packageVersion === REQUIRED_OPERATOR_PACKAGE_VERSION, 'OPERATOR_PACKAGE_VERSION_CHANGED', `operator package version must be ${REQUIRED_OPERATOR_PACKAGE_VERSION}.`, operatorPackage?.packageVersion);
    addIssue(issues, operatorPackage?.totalRows === EXPECTED_STAGE01_ROWS, 'OPERATOR_PACKAGE_ROW_COUNT_CHANGED', `operator package must contain ${EXPECTED_STAGE01_ROWS} Stage 01 rows.`, operatorPackage?.totalRows);
    addIssue(issues, operatorPackage?.productionWriteAllowed === false, 'OPERATOR_PACKAGE_PRODUCTION_WRITE_ALLOWED', 'operator package must keep productionWriteAllowed=false.', operatorPackage);
    addIssue(issues, operatorPackage?.sourceOfTruth === false, 'OPERATOR_PACKAGE_SOURCE_OF_TRUTH_ENABLED', 'operator package must keep sourceOfTruth=false.', operatorPackage);
    addIssue(issues, operatorPackage?.imageAnalysisMetadataRegenerated === true, 'OPERATOR_PACKAGE_IMAGE_METADATA_NOT_REGENERATED', 'operator package must regenerate image-analysis metadata from the local official PNG pixel report.', operatorPackage);
    addIssue(issues, operatorPackage?.imageCandidateReferenceOnly === true, 'OPERATOR_PACKAGE_IMAGE_REFERENCE_ONLY_DISABLED', 'operator package image-analysis metadata must stay candidateReferenceOnly=true.', operatorPackage);
    addIssue(issues, operatorPackage?.pixelComponents === EXPECTED_IMAGE_PIXEL_SOURCE, 'OPERATOR_PACKAGE_PIXEL_COMPONENT_SOURCE_CHANGED', `operator package pixel component source must remain ${EXPECTED_IMAGE_PIXEL_SOURCE}.`, operatorPackage?.pixelComponents);
    addIssue(
      issues,
      expectedRiskCountsMatch(operatorPackageRiskCounts),
      'OPERATOR_PACKAGE_IMAGE_RISK_COUNTS_CHANGED',
      'operator package image-analysis risk counts must remain high=3, medium=7, low=6.',
      operatorPackageRiskCounts,
    );
    addIssue(
      issues,
      imagePriorityMatchesExpected(operatorPackagePriorityOrder),
      'OPERATOR_PACKAGE_IMAGE_PRIORITY_CHANGED',
      'operator package image-analysis priority order must stay tied to the official PNG analysis output.',
      operatorPackagePriorityOrder,
    );

    addIssue(issues, reportStatus(operatorInput) === 'waiting-for-operator', 'OPERATOR_INPUT_STATUS_CHANGED', 'operator input must remain waiting-for-operator for the base Stage 01 readiness gate.', reportStatus(operatorInput));
    addIssue(issues, operatorInput?.packageVersion === REQUIRED_OPERATOR_PACKAGE_VERSION, 'OPERATOR_INPUT_PACKAGE_VERSION_CHANGED', `operator input packageVersion must be ${REQUIRED_OPERATOR_PACKAGE_VERSION}.`, operatorInput?.packageVersion);
    addIssue(issues, operatorInput?.targetStage === TARGET_STAGE_LABEL, 'OPERATOR_INPUT_TARGET_STAGE_CHANGED', `operator input targetStage must be ${TARGET_STAGE_LABEL}.`, operatorInput?.targetStage);
    addIssue(issues, operatorRows.length === EXPECTED_STAGE01_ROWS, 'OPERATOR_INPUT_ROW_COUNT_CHANGED', `operator input must contain ${EXPECTED_STAGE01_ROWS} Stage 01 rows.`, operatorRows.length);
    addIssue(
      issues,
      JSON.stringify(sorted(operatorSectionIds)) === JSON.stringify(sorted(EXPECTED_STAGE01_SECTION_IDS)),
      'OPERATOR_INPUT_SECTION_IDS_CHANGED',
      'operator input section ids must match the Stage 01 P0 target set.',
      operatorSectionIds,
    );
    addIssue(issues, unknownOperatorDecisions.length === 0, 'OPERATOR_INPUT_UNKNOWN_DECISION', 'operator input contains an unknown operatorDecision.', unknownOperatorDecisions);
    addIssue(
      issues,
      imagePriorityMatchesExpected(operatorInputImagePriorityOrder),
      'OPERATOR_INPUT_IMAGE_PRIORITY_CHANGED',
      'operator input imagePriorityRank order must match the Stage 01 official PNG image-analysis priority order.',
      operatorInputImagePriorityOrder,
    );
    addIssue(
      issues,
      operatorInputFirstImagePriorityRow === '131:1',
      'OPERATOR_INPUT_FIRST_IMAGE_PRIORITY_ROW_CHANGED',
      'operator input first row must be imagePriorityRank=1 section 131.',
      operatorInputFirstImagePriorityRow,
    );
    addIssue(
      issues,
      expectedRiskCountsMatch(operatorInputRiskCounts),
      'OPERATOR_INPUT_IMAGE_RISK_COUNTS_CHANGED',
      'operator input image-analysis risk counts must remain high=3, medium=7, low=6.',
      operatorInputRiskCounts,
    );
    addIssue(
      issues,
      operatorRows.every((row) => row.imageCandidateReferenceOnly === true),
      'OPERATOR_INPUT_IMAGE_REFERENCE_ONLY_DISABLED',
      'operator input image-analysis metadata must stay candidateReferenceOnly=true for every row.',
      operatorRows.map((row) => ({ sectionId: row.sectionId, imageCandidateReferenceOnly: row.imageCandidateReferenceOnly })),
    );
    addIssue(
      issues,
      operatorRows.every((row) => row.imageAnalysisSource === EXPECTED_IMAGE_PIXEL_SOURCE),
      'OPERATOR_INPUT_PIXEL_COMPONENT_SOURCE_CHANGED',
      `operator input imageAnalysisSource must remain ${EXPECTED_IMAGE_PIXEL_SOURCE} for every row.`,
      operatorRows.map((row) => ({ sectionId: row.sectionId, imageAnalysisSource: row.imageAnalysisSource })),
    );

    const reviewBoardImageAnalysis = reviewBoard?.summary?.imageAnalysis ?? {};
    const reviewBoardPriorityOrder = Array.isArray(reviewBoardImageAnalysis.priorityOrder)
      ? reviewBoardImageAnalysis.priorityOrder
      : [];
    addIssue(
      issues,
      ['waiting-for-operator', 'ready-for-prewrite'].includes(reportStatus(reviewBoard)),
      'REVIEW_BOARD_STATUS_CHANGED',
      'review board must be waiting-for-operator before input or ready-for-prewrite after valid 131 input.',
      reportStatus(reviewBoard),
    );
    addIssue(issues, reviewBoard?.summary?.totalRows === EXPECTED_STAGE01_ROWS, 'REVIEW_BOARD_ROW_COUNT_CHANGED', `review board must contain ${EXPECTED_STAGE01_ROWS} Stage 01 rows.`, reviewBoard?.summary?.totalRows);
    addIssue(issues, reviewBoard?.summary?.sourceDataWritePerformed === false, 'REVIEW_BOARD_SOURCE_DATA_WRITE_PERFORMED', 'review board must keep sourceDataWritePerformed=false.', reviewBoard?.summary);
    addIssue(issues, reviewBoard?.summary?.productionWriteAllowed === false, 'REVIEW_BOARD_PRODUCTION_WRITE_ALLOWED', 'review board must keep productionWriteAllowed=false.', reviewBoard?.summary);
    addIssue(issues, reviewBoardImageAnalysis.candidateReferenceOnly === true, 'REVIEW_BOARD_IMAGE_REFERENCE_ONLY_DISABLED', 'review board image analysis must stay candidateReferenceOnly=true.', reviewBoardImageAnalysis);
    addIssue(issues, reviewBoardImageAnalysis.officialPngOnly === true, 'REVIEW_BOARD_IMAGE_OFFICIAL_PNG_ONLY_DISABLED', 'review board image analysis must stay officialPngOnly=true.', reviewBoardImageAnalysis);
    addIssue(issues, reviewBoardImageAnalysis.source === EXPECTED_IMAGE_PIXEL_SOURCE, 'REVIEW_BOARD_PIXEL_COMPONENT_SOURCE_CHANGED', `review board image analysis source must remain ${EXPECTED_IMAGE_PIXEL_SOURCE}.`, reviewBoardImageAnalysis.source);
    addIssue(issues, reviewBoardImageAnalysis.stage01RowsWithPixelCandidate === EXPECTED_STAGE01_ROWS, 'REVIEW_BOARD_PIXEL_CANDIDATE_ROW_COUNT_CHANGED', `review board must keep ${EXPECTED_STAGE01_ROWS} Stage 01 pixel candidate rows.`, reviewBoardImageAnalysis);
    addIssue(
      issues,
      expectedRiskCountsMatch({
        HIGH: reviewBoardImageAnalysis.highRiskRows,
        MEDIUM: reviewBoardImageAnalysis.mediumRiskRows,
        LOW: reviewBoardImageAnalysis.lowRiskRows,
      }),
      'REVIEW_BOARD_IMAGE_RISK_COUNTS_CHANGED',
      'review board image analysis risk counts must remain high=3, medium=7, low=6.',
      reviewBoardImageAnalysis,
    );
    addIssue(
      issues,
      imagePriorityMatchesExpected(reviewBoardPriorityOrder),
      'REVIEW_BOARD_IMAGE_PRIORITY_CHANGED',
      'review board image analysis priority order must stay tied to the official PNG analysis output.',
      reviewBoardPriorityOrder,
    );
    addIssue(
      issues,
      JSON.stringify(operatorPackagePriorityOrder) === JSON.stringify(reviewBoardPriorityOrder),
      'PACKAGE_REVIEW_BOARD_IMAGE_PRIORITY_MISMATCH',
      'operator package and review board image-analysis priority order must match exactly.',
      { operatorPackagePriorityOrder, reviewBoardPriorityOrder },
    );
    addIssue(
      issues,
      JSON.stringify(operatorPackagePriorityOrder) === JSON.stringify(operatorInputImagePriorityOrder),
      'PACKAGE_OPERATOR_INPUT_IMAGE_PRIORITY_MISMATCH',
      'operator package and operator input image-analysis priority order must match exactly.',
      { operatorPackagePriorityOrder, operatorInputImagePriorityOrder },
    );
    addIssue(
      issues,
      operatorPackageRiskCounts.HIGH === reviewBoardImageAnalysis.highRiskRows
        && operatorPackageRiskCounts.MEDIUM === reviewBoardImageAnalysis.mediumRiskRows
        && operatorPackageRiskCounts.LOW === reviewBoardImageAnalysis.lowRiskRows,
      'PACKAGE_REVIEW_BOARD_IMAGE_RISK_COUNTS_MISMATCH',
      'operator package and review board image-analysis risk counts must match exactly.',
      { operatorPackageRiskCounts, reviewBoardImageAnalysis },
    );

    addIssue(
      issues,
      ['waiting-for-operator', 'ready-for-manual-apply', 'applied'].includes(reportStatus(realApprovalReadiness)),
      'REAL_APPROVAL_READINESS_STATUS_CHANGED',
      'real approval readiness must be waiting-for-operator before input, ready-for-manual-apply after valid 131 input, or applied after the manual patch.',
      reportStatus(realApprovalReadiness),
    );
    addIssue(
      issues,
      realApprovalReadiness?.summary?.approvedRows === (operatorDecisionCounts.APPROVED ?? 0),
      'REAL_APPROVAL_READINESS_APPROVED_ROWS_CHANGED',
      'real approval readiness approvedRows must match operator input APPROVED decisions.',
      realApprovalReadiness?.summary,
    );
    addIssue(
      issues,
      Number(realApprovalReadiness?.summary?.manualPatchRows ?? 0) >= 0,
      'REAL_APPROVAL_READINESS_MANUAL_PATCH_ROWS_CHANGED',
      'real approval readiness manualPatchRows must be a non-negative count.',
      realApprovalReadiness?.summary,
    );
    addIssue(
      issues,
      (operatorDecisionCounts.APPROVED ?? 0) === realApprovalReadiness?.summary?.approvedRows,
      'OPERATOR_INPUT_APPROVED_COUNT_MISMATCH',
      'operator input approved row count must match real approval readiness approvedRows.',
      { operatorDecisionCounts, realApprovalReadinessSummary: realApprovalReadiness?.summary },
    );

    addIssue(issues, reportStatus(prewriteSmoke) === 'passed', 'PREWRITE_SMOKE_STATUS_CHANGED', 'prewrite smoke must pass.', reportStatus(prewriteSmoke));
    addIssue(
      issues,
      prewriteSmoke?.summary?.cases === EXPECTED_PREWRITE_SMOKE_CASES,
      'PREWRITE_SMOKE_CASE_COUNT_CHANGED',
      `prewrite smoke must keep ${EXPECTED_PREWRITE_SMOKE_CASES} cases.`,
      prewriteSmoke?.summary,
    );
    addIssue(issues, prewriteSmoke?.summary?.failedCases === 0, 'PREWRITE_SMOKE_FAILED_CASES_CHANGED', 'prewrite smoke must have zero failed cases.', prewriteSmoke?.summary);
    addIssue(issues, approvedNoDelta?.realApprovalReadinessApprovedAppliedRows === 1, 'SMOKE_APPROVED_NO_DELTA_BRANCH_CHANGED', 'approved-no-delta fixture must exercise APPROVED_APPLIED branch.', approvedNoDelta);
    addIssue(issues, approvedWithDelta?.realApprovalReadinessApprovedNotAppliedRows === 1, 'SMOKE_APPROVED_WITH_DELTA_BRANCH_CHANGED', 'approved-with-delta fixture must exercise APPROVED_NOT_APPLIED branch.', approvedWithDelta);
    addIssue(issues, approvedAppliedAfterManualPatch?.realApprovalReadinessApprovedAppliedRows === 1, 'SMOKE_APPLIED_AFTER_MANUAL_PATCH_BRANCH_CHANGED', 'approved-applied-after-manual-patch fixture must exercise APPROVED_APPLIED branch.', approvedAppliedAfterManualPatch);

    addIssue(issues, reportStatus(approvedDryRun) === 'passed', 'APPROVED_DRY_RUN_STATUS_CHANGED', 'approved dry-run must pass.', reportStatus(approvedDryRun));
    addIssue(issues, approvedDryRun?.flow?.postApplyStatus === 'not-applied', 'APPROVED_DRY_RUN_POST_APPLY_CHANGED', 'approved dry-run must remain not-applied.', approvedDryRun?.flow);
    addIssue(issues, approvedDryRun?.flow?.manualPatchRows === 1, 'APPROVED_DRY_RUN_MANUAL_PATCH_ROWS_CHANGED', 'approved dry-run must expose one manual patch row.', approvedDryRun?.flow);
    addIssue(issues, approvedDryRun?.realApprovalReadinessContract?.readinessStatus === 'APPROVED_NOT_APPLIED', 'APPROVED_DRY_RUN_READINESS_ROW_CHANGED', 'approved dry-run readiness row must be APPROVED_NOT_APPLIED.', approvedDryRun?.realApprovalReadinessContract);

    addIssue(issues, reportStatus(appliedDryRun) === 'passed', 'APPLIED_DRY_RUN_STATUS_CHANGED', 'applied dry-run must pass.', reportStatus(appliedDryRun));
    addIssue(issues, appliedDryRun?.flow?.postApplyStatus === 'applied', 'APPLIED_DRY_RUN_POST_APPLY_CHANGED', 'applied dry-run must report postApply=applied.', appliedDryRun?.flow);
    addIssue(issues, appliedDryRun?.appliedContract?.operatorStatusRowStatus === 'APPLIED', 'APPLIED_DRY_RUN_OPERATOR_STATUS_CHANGED', 'applied dry-run operator status row must be APPLIED.', appliedDryRun?.appliedContract);
    addIssue(issues, appliedDryRun?.flow?.manualPatchRows === 0, 'APPLIED_DRY_RUN_MANUAL_PATCH_ROWS_CHANGED', 'applied dry-run must expose zero manual patch rows.', appliedDryRun?.flow);
    addIssue(issues, appliedDryRun?.realApprovalReadinessContract?.readinessStatus === 'APPROVED_APPLIED', 'APPLIED_DRY_RUN_READINESS_ROW_CHANGED', 'applied dry-run readiness row must be APPROVED_APPLIED.', appliedDryRun?.realApprovalReadinessContract);

    const targetEntryPreflightStatus = reportStatus(targetEntryPreflight);
    addIssue(issues, targetEntryPreflight?.summary?.preflightVersion === REQUIRED_TARGET_ENTRY_PREFLIGHT_VERSION, 'TARGET_ENTRY_PREFLIGHT_VERSION_CHANGED', `target entry preflight version must be ${REQUIRED_TARGET_ENTRY_PREFLIGHT_VERSION}.`, targetEntryPreflight?.summary?.preflightVersion);
    addIssue(issues, targetEntryPreflight?.summary?.targetSectionId === TARGET_APPROVAL_SECTION_ID, 'TARGET_ENTRY_PREFLIGHT_SECTION_CHANGED', `target entry preflight must stay pinned to ${TARGET_APPROVAL_SECTION_ID}.`, targetEntryPreflight?.summary?.targetSectionId);
    addIssue(
      issues,
      targetEntryPreflightStatus === 'waiting-for-operator' || targetEntryPreflightStatus === 'ready-for-approval-gate',
      'TARGET_ENTRY_PREFLIGHT_STATUS_CHANGED',
      'target entry preflight status must be waiting-for-operator before input or ready-for-approval-gate after valid input.',
      targetEntryPreflightStatus,
    );
    addIssue(issues, targetEntryPreflight?.summary?.productionWriteAllowed === false, 'TARGET_ENTRY_PREFLIGHT_PRODUCTION_WRITE_ALLOWED', 'target entry preflight must keep productionWriteAllowed=false.', targetEntryPreflight?.summary);
    addIssue(issues, targetEntryPreflight?.summary?.sourceDataWritePerformed === false, 'TARGET_ENTRY_PREFLIGHT_SOURCE_DATA_WRITE_PERFORMED', 'target entry preflight must keep sourceDataWritePerformed=false.', targetEntryPreflight?.summary);
    addIssue(issues, targetEntryPreflight?.summary?.writesOperatorInput === false, 'TARGET_ENTRY_PREFLIGHT_WRITES_OPERATOR_INPUT', 'target entry preflight must never write operator input.', targetEntryPreflight?.summary);
    addIssue(issues, targetEntryPreflight?.summary?.writesProductionData === false, 'TARGET_ENTRY_PREFLIGHT_WRITES_PRODUCTION_DATA', 'target entry preflight must never write production data.', targetEntryPreflight?.summary);
    addIssue(
      issues,
      targetEntryPreflight?.summary?.selectedDecision !== 'APPROVED' || targetEntryPreflight?.summary?.readyForApprovalGate === true,
      'TARGET_ENTRY_PREFLIGHT_APPROVED_NOT_READY',
      'target entry preflight APPROVED input must be ready-for-approval-gate or blocked before readiness summary.',
      targetEntryPreflight?.summary,
    );

    addIssue(issues, targetEntryPreflightSmoke?.version === REQUIRED_TARGET_ENTRY_PREFLIGHT_SMOKE_VERSION, 'TARGET_ENTRY_PREFLIGHT_SMOKE_VERSION_CHANGED', `target entry preflight smoke version must be ${REQUIRED_TARGET_ENTRY_PREFLIGHT_SMOKE_VERSION}.`, targetEntryPreflightSmoke?.version);
    addIssue(issues, reportStatus(targetEntryPreflightSmoke) === 'passed', 'TARGET_ENTRY_PREFLIGHT_SMOKE_STATUS_CHANGED', 'target entry preflight smoke must pass.', reportStatus(targetEntryPreflightSmoke));
    addIssue(
      issues,
      targetEntryPreflightSmoke?.totalCases === EXPECTED_TARGET_ENTRY_PREFLIGHT_SMOKE_CASES
        && targetEntryPreflightSmoke?.passedCases === EXPECTED_TARGET_ENTRY_PREFLIGHT_SMOKE_CASES
        && targetEntryPreflightSmoke?.failedCases === 0,
      'TARGET_ENTRY_PREFLIGHT_SMOKE_CASE_COUNT_CHANGED',
      `target entry preflight smoke must keep ${EXPECTED_TARGET_ENTRY_PREFLIGHT_SMOKE_CASES}/${EXPECTED_TARGET_ENTRY_PREFLIGHT_SMOKE_CASES} passing cases.`,
      targetEntryPreflightSmoke,
    );
    addIssue(issues, targetEntryPreflightSmoke?.sourceDataWritePerformed === false, 'TARGET_ENTRY_PREFLIGHT_SMOKE_SOURCE_DATA_WRITE_PERFORMED', 'target entry preflight smoke must keep sourceDataWritePerformed=false.', targetEntryPreflightSmoke);
    addIssue(issues, targetEntryPreflightSmoke?.writesOperatorInput === false, 'TARGET_ENTRY_PREFLIGHT_SMOKE_WRITES_OPERATOR_INPUT', 'target entry preflight smoke must never write operator input.', targetEntryPreflightSmoke);
    addIssue(issues, targetEntryPreflightSmoke?.writesProductionData === false, 'TARGET_ENTRY_PREFLIGHT_SMOKE_WRITES_PRODUCTION_DATA', 'target entry preflight smoke must never write production data.', targetEntryPreflightSmoke);

    const targetApprovalStatus = reportStatus(targetApprovalGate);
    addIssue(issues, targetApprovalGate?.summary?.gateVersion === REQUIRED_TARGET_APPROVAL_GATE_VERSION, 'TARGET_APPROVAL_GATE_VERSION_CHANGED', `target approval gate version must be ${REQUIRED_TARGET_APPROVAL_GATE_VERSION}.`, targetApprovalGate?.summary?.gateVersion);
    addIssue(issues, targetApprovalGate?.summary?.targetSectionId === TARGET_APPROVAL_SECTION_ID, 'TARGET_APPROVAL_GATE_SECTION_CHANGED', `target approval gate must stay pinned to ${TARGET_APPROVAL_SECTION_ID}.`, targetApprovalGate?.summary?.targetSectionId);
    addIssue(
      issues,
      targetApprovalStatus === 'waiting-for-operator' || targetApprovalStatus === 'ready-for-prewrite',
      'TARGET_APPROVAL_GATE_STATUS_CHANGED',
      'target approval gate status must be waiting-for-operator before input or ready-for-prewrite after valid APPROVED input.',
      targetApprovalStatus,
    );
    addIssue(issues, targetApprovalGate?.summary?.productionWriteAllowed === false, 'TARGET_APPROVAL_GATE_PRODUCTION_WRITE_ALLOWED', 'target approval gate must keep productionWriteAllowed=false.', targetApprovalGate?.summary);
    addIssue(issues, targetApprovalGate?.summary?.sourceDataWritePerformed === false, 'TARGET_APPROVAL_GATE_SOURCE_DATA_WRITE_PERFORMED', 'target approval gate must keep sourceDataWritePerformed=false.', targetApprovalGate?.summary);
    addIssue(issues, targetApprovalGate?.summary?.writesOperatorInput === false, 'TARGET_APPROVAL_GATE_WRITES_OPERATOR_INPUT', 'target approval gate must never write operator input.', targetApprovalGate?.summary);
    addIssue(issues, targetApprovalGate?.summary?.writesProductionData === false, 'TARGET_APPROVAL_GATE_WRITES_PRODUCTION_DATA', 'target approval gate must never write production data.', targetApprovalGate?.summary);
    addIssue(
      issues,
      targetApprovalGate?.summary?.selectedDecision !== 'APPROVED' || targetApprovalGate?.summary?.readyForPrewrite === true,
      'TARGET_APPROVAL_GATE_APPROVED_NOT_READY',
      'target approval gate APPROVED input must be ready-for-prewrite or blocked before readiness summary.',
      targetApprovalGate?.summary,
    );

    const allSafetyFlags = [
      ['reviewBoard', safetyFlags(reviewBoard)],
      ['realApprovalReadiness', safetyFlags(realApprovalReadiness)],
      ['prewriteSmoke', safetyFlags(prewriteSmoke)],
      ['approvedDryRun', safetyFlags(approvedDryRun)],
      ['appliedDryRun', safetyFlags(appliedDryRun)],
      ['targetEntryPreflight', safetyFlags(targetEntryPreflight)],
      ['targetEntryPreflightSmoke', safetyFlags(targetEntryPreflightSmoke)],
      ['targetApprovalGate', safetyFlags(targetApprovalGate)],
    ];
    for (const [id, flags] of allSafetyFlags) {
      addIssue(issues, flags.sourceDataWritePerformed === false, 'SOURCE_DATA_WRITE_PERFORMED', `${id} must keep sourceDataWritePerformed=false.`, flags);
      addIssue(issues, flags.productionWriteAllowed === false, 'PRODUCTION_WRITE_ALLOWED', `${id} must keep productionWriteAllowed=false.`, flags);
      addIssue(issues, flags.productionDataChanged === false, 'PRODUCTION_DATA_CHANGED', `${id} must keep productionDataChanged=false.`, flags);
    }

    const contract = {
      operatorPackageStatus: reportStatus(operatorPackage),
      operatorPackageRows: operatorPackage?.totalRows ?? null,
      operatorPackageImageMetadataRegenerated: operatorPackage?.imageAnalysisMetadataRegenerated === true,
      operatorPackageCandidateReferenceOnly: operatorPackage?.imageCandidateReferenceOnly === true,
      operatorPackageHighRiskRows: operatorPackageRiskCounts.HIGH ?? null,
      operatorPackageMediumRiskRows: operatorPackageRiskCounts.MEDIUM ?? null,
      operatorPackageLowRiskRows: operatorPackageRiskCounts.LOW ?? null,
      operatorPackageImagePriorityOrder: operatorPackagePriorityOrder,
      operatorPackagePixelComponentSource: operatorPackage?.pixelComponents ?? null,
      operatorInputStatus: reportStatus(operatorInput),
      operatorInputRows: operatorRows.length,
      operatorInputPendingRows: operatorDecisionCounts.PENDING ?? 0,
      operatorInputApprovedRows: operatorDecisionCounts.APPROVED ?? 0,
      operatorInputDecisionCounts: operatorDecisionCounts,
      operatorInputImagePriorityOrder,
      operatorInputFirstImagePriorityRow,
      operatorInputHighRiskRows: operatorInputRiskCounts.HIGH ?? null,
      operatorInputMediumRiskRows: operatorInputRiskCounts.MEDIUM ?? null,
      operatorInputLowRiskRows: operatorInputRiskCounts.LOW ?? null,
      reviewBoardStatus: reportStatus(reviewBoard),
      reviewBoardPixelCandidateRows: reviewBoardImageAnalysis.stage01RowsWithPixelCandidate ?? null,
      reviewBoardHighRiskRows: reviewBoardImageAnalysis.highRiskRows ?? null,
      reviewBoardMediumRiskRows: reviewBoardImageAnalysis.mediumRiskRows ?? null,
      reviewBoardLowRiskRows: reviewBoardImageAnalysis.lowRiskRows ?? null,
      reviewBoardCandidateReferenceOnly: reviewBoardImageAnalysis.candidateReferenceOnly === true,
      reviewBoardImagePriorityOrder: reviewBoardPriorityOrder,
      reviewBoardPixelComponentSource: reviewBoardImageAnalysis.source ?? null,
      packageReviewBoardImagePriorityMatched: JSON.stringify(operatorPackagePriorityOrder) === JSON.stringify(reviewBoardPriorityOrder),
      packageReviewBoardImageRiskMatched: operatorPackageRiskCounts.HIGH === reviewBoardImageAnalysis.highRiskRows
        && operatorPackageRiskCounts.MEDIUM === reviewBoardImageAnalysis.mediumRiskRows
        && operatorPackageRiskCounts.LOW === reviewBoardImageAnalysis.lowRiskRows,
      packageOperatorInputImagePriorityMatched: JSON.stringify(operatorPackagePriorityOrder) === JSON.stringify(operatorInputImagePriorityOrder),
      realApprovalReadinessStatus: reportStatus(realApprovalReadiness),
      prewriteSmokeStatus: reportStatus(prewriteSmoke),
      approvedDryRunReadinessRow: approvedDryRun?.realApprovalReadinessContract?.readinessStatus ?? null,
      appliedDryRunReadinessRow: appliedDryRun?.realApprovalReadinessContract?.readinessStatus ?? null,
      targetEntryPreflightStatus,
      targetEntryPreflightDecision: targetEntryPreflight?.summary?.selectedDecision ?? null,
      targetEntryPreflightReadyForApprovalGate: targetEntryPreflight?.summary?.readyForApprovalGate === true,
      targetEntryPreflightSourceDataWritePerformed: targetEntryPreflight?.summary?.sourceDataWritePerformed ?? null,
      targetEntryPreflightWritesOperatorInput: targetEntryPreflight?.summary?.writesOperatorInput ?? null,
      targetEntryPreflightWritesProductionData: targetEntryPreflight?.summary?.writesProductionData ?? null,
      targetEntryPreflightSmokeStatus: reportStatus(targetEntryPreflightSmoke),
      targetEntryPreflightSmokeCases: `${targetEntryPreflightSmoke?.passedCases ?? 0}/${targetEntryPreflightSmoke?.totalCases ?? 0}`,
      targetEntryPreflightSmokeSourceDataWritePerformed: targetEntryPreflightSmoke?.sourceDataWritePerformed ?? null,
      targetEntryPreflightSmokeWritesOperatorInput: targetEntryPreflightSmoke?.writesOperatorInput ?? null,
      targetEntryPreflightSmokeWritesProductionData: targetEntryPreflightSmoke?.writesProductionData ?? null,
      targetApprovalGateStatus: targetApprovalStatus,
      targetApprovalGateDecision: targetApprovalGate?.summary?.selectedDecision ?? null,
      targetApprovalGateReadyForPrewrite: targetApprovalGate?.summary?.readyForPrewrite === true,
      targetApprovalGateSourceDataWritePerformed: targetApprovalGate?.summary?.sourceDataWritePerformed ?? null,
      sourceDataWritePerformed: allSafetyFlags.some(([, flags]) => flags.sourceDataWritePerformed !== false),
      productionWriteAllowed: allSafetyFlags.some(([, flags]) => flags.productionWriteAllowed !== false),
      productionDataChanged: allSafetyFlags.some(([, flags]) => flags.productionDataChanged !== false),
      freshReports: reports.length === Object.keys(reportFiles).length && reports.every((entry) => entry.fresh),
    };

    const summary = {
      version: SUMMARY_VERSION,
      status: issues.length === 0 ? 'passed' : 'failed',
      generatedAt: new Date(now).toISOString(),
      stageDir: formatRelative(stageDir),
      maxAgeSeconds: options.maxAgeSeconds,
      reports,
      contract,
      issues,
    };

    await writeJson(summaryJsonPath, summary);
    await fs.writeFile(summaryMarkdownPath, buildMarkdown(summary), 'utf8');

    console.log(`stage01_readiness_summary_json:${formatRelative(summaryJsonPath)}`);
    console.log(`stage01_readiness_summary_markdown:${formatRelative(summaryMarkdownPath)}`);
    console.log(
      `status:${summary.status} operatorInputRows=${contract.operatorInputRows} operatorInputApproved=${contract.operatorInputApprovedRows} packageImageHighRisk=${contract.operatorPackageHighRiskRows} reviewBoardImageHighRisk=${contract.reviewBoardHighRiskRows} packageImagePriority=${contract.operatorPackageImagePriorityOrder.join('>')} reviewBoardImagePriority=${contract.reviewBoardImagePriorityOrder.join('>')} packageReviewBoardImagePriorityMatched=${contract.packageReviewBoardImagePriorityMatched} realApprovalReadiness=${contract.realApprovalReadinessStatus} prewriteSmoke=${contract.prewriteSmokeStatus} approvedDryRun=${contract.approvedDryRunReadinessRow} appliedDryRun=${contract.appliedDryRunReadinessRow} targetEntryPreflight=${contract.targetEntryPreflightStatus}:${contract.targetEntryPreflightDecision} targetEntryPreflightReady=${contract.targetEntryPreflightReadyForApprovalGate} targetEntryPreflightSmoke=${contract.targetEntryPreflightSmokeStatus}:${contract.targetEntryPreflightSmokeCases} targetApprovalGate=${contract.targetApprovalGateStatus}:${contract.targetApprovalGateDecision} targetApprovalReady=${contract.targetApprovalGateReadyForPrewrite} sourceDataWritePerformed=${contract.sourceDataWritePerformed} freshReports=${contract.freshReports}`,
    );

    if (summary.status !== 'passed') {
      process.exitCode = 1;
    }
  }

  main().catch(async (error) => {
    const failure = {
      version: SUMMARY_VERSION,
      status: 'failed',
      generatedAt: new Date().toISOString(),
      stageDir: formatRelative(stageDir),
      maxAgeSeconds: options.maxAgeSeconds,
      reports: [],
      contract: {
        operatorInputStatus: 'missing',
        operatorPackageStatus: 'missing',
        operatorPackageRows: null,
        operatorPackageImageMetadataRegenerated: false,
        operatorPackageCandidateReferenceOnly: false,
        operatorPackageHighRiskRows: null,
        operatorPackageMediumRiskRows: null,
        operatorPackageLowRiskRows: null,
        operatorPackageImagePriorityOrder: [],
        operatorPackagePixelComponentSource: null,
        operatorInputRows: 0,
        operatorInputPendingRows: 0,
        operatorInputApprovedRows: 0,
        operatorInputDecisionCounts: {},
        operatorInputImagePriorityOrder: [],
        operatorInputFirstImagePriorityRow: '',
        operatorInputHighRiskRows: null,
        operatorInputMediumRiskRows: null,
        operatorInputLowRiskRows: null,
        reviewBoardStatus: 'missing',
        reviewBoardPixelCandidateRows: null,
        reviewBoardHighRiskRows: null,
        reviewBoardMediumRiskRows: null,
        reviewBoardLowRiskRows: null,
        reviewBoardCandidateReferenceOnly: false,
        reviewBoardImagePriorityOrder: [],
        reviewBoardPixelComponentSource: null,
        packageReviewBoardImagePriorityMatched: false,
        packageReviewBoardImageRiskMatched: false,
        packageOperatorInputImagePriorityMatched: false,
        realApprovalReadinessStatus: 'missing',
        prewriteSmokeStatus: 'missing',
        approvedDryRunReadinessRow: null,
        appliedDryRunReadinessRow: null,
        targetEntryPreflightStatus: 'missing',
        targetEntryPreflightDecision: null,
        targetEntryPreflightReadyForApprovalGate: false,
        targetEntryPreflightSourceDataWritePerformed: null,
        targetEntryPreflightWritesOperatorInput: null,
        targetEntryPreflightWritesProductionData: null,
        targetEntryPreflightSmokeStatus: 'missing',
        targetEntryPreflightSmokeCases: '0/0',
        targetEntryPreflightSmokeSourceDataWritePerformed: null,
        targetEntryPreflightSmokeWritesOperatorInput: null,
        targetEntryPreflightSmokeWritesProductionData: null,
        targetApprovalGateStatus: 'missing',
        targetApprovalGateDecision: null,
        targetApprovalGateReadyForPrewrite: false,
        targetApprovalGateSourceDataWritePerformed: null,
        sourceDataWritePerformed: false,
        productionWriteAllowed: false,
        productionDataChanged: false,
        freshReports: false,
      },
      issues: [
        {
          code: 'SUMMARY_CRASHED',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
    await writeJson(summaryJsonPath, failure).catch(() => {});
    await fs.writeFile(summaryMarkdownPath, buildMarkdown(failure), 'utf8').catch(() => {});
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
};

const runStage01RealApprovalReadiness = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultStageDir = path.join(reportDir, 'sajik-stage01-operator');

  const REAL_APPROVAL_READINESS_VERSION = 'SAJIK_STAGE01_REAL_APPROVAL_READINESS_V1';
  const REQUIRED_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
  const REQUIRED_INPUT_AID_VERSION = 'SAJIK_STAGE01_OPERATOR_INPUT_AID_V1';
  const REQUIRED_PREWRITE_VERSION = 'SAJIK_STAGE01_PREWRITE_V1';
  const REQUIRED_APPLY_READY_VERSION = 'SAJIK_STAGE01_APPLY_READY_V1';
  const REQUIRED_POST_APPLY_VERSION = 'SAJIK_STAGE01_POST_APPLY_AUDIT_V1';
  const REQUIRED_OPERATOR_STATUS_VERSION = 'SAJIK_STAGE01_OPERATOR_STATUS_V1';
  const REQUIRED_MANUAL_PATCH_PLAN_VERSION = 'SAJIK_STAGE01_MANUAL_PATCH_PLAN_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const TARGET_SOURCE_FILE = 'src/data/sajikSeatData.ts';
  const EXPECTED_STAGE01_ROWS = 16;
  const EXPECTED_STAGE01_SECTION_IDS = [
    '021',
    '022',
    '031',
    '032',
    '121',
    '122',
    '123',
    '124',
    '125',
    '131',
    '132',
    '133',
    '134',
    '135',
    '142',
    '143',
  ];
  const WRITABLE_SOURCE_FIELDS = [
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.labelX',
    'imageGeometry.labelY',
  ];
  const LOCKED_SOURCE_FIELDS = [
    'imageGeometry.visualPath',
    'imageGeometry.geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
  ];
  const APPROVED_READINESS_STATUSES = [
    'APPROVED_READY',
    'APPROVED_NOT_APPLIED',
    'APPROVED_APPLIED',
    'APPROVED_BLOCKED',
  ];
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT']);

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

  const sorted = (values) => [...values].sort();

  const sameStringArray = (actual, expected) => (
    Array.isArray(actual)
    && actual.length === expected.length
    && expected.every((value, index) => actual[index] === value)
  );

  const reportStatus = (report) => report?.summary?.status ?? report?.status ?? 'missing';

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const relativeToFrontend = (filePath) => path.relative(frontendRoot, filePath);

  const pushVersionBlocker = (blockers, reportName, actual, expected) => {
    if (actual !== expected) {
      blockers.push(`${reportName}_VERSION_MISMATCH:${actual ?? ''}:${expected}`);
    }
  };

  const pushStageBlocker = (blockers, reportName, actual) => {
    if (actual !== TARGET_STAGE_LABEL) {
      blockers.push(`${reportName}_STAGE_MISMATCH:${actual ?? ''}`);
    }
  };

  const pushFalseFlagBlocker = (blockers, reportName, flagName, actual) => {
    if (actual !== false) {
      blockers.push(`${reportName}_${flagName}_MUST_BE_FALSE`);
    }
  };

  const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
  const operatorInputPath = path.resolve(
    frontendRoot,
    argValue('--operator-input', path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json')),
  );
  const inputAidPath = path.resolve(
    frontendRoot,
    argValue('--input-aid', path.join(stageDir, 'sajik-seatmap-stage01-operator-input-aid.json')),
  );
  const prewritePath = path.resolve(
    frontendRoot,
    argValue('--prewrite', path.join(stageDir, 'sajik-seatmap-stage01-prewrite.json')),
  );
  const applyReadyPath = path.resolve(
    frontendRoot,
    argValue('--apply-ready', path.join(stageDir, 'sajik-seatmap-stage01-apply-ready.json')),
  );
  const postApplyPath = path.resolve(
    frontendRoot,
    argValue('--post-apply', path.join(stageDir, 'sajik-seatmap-stage01-post-apply-audit.json')),
  );
  const operatorStatusPath = path.resolve(
    frontendRoot,
    argValue('--operator-status', path.join(stageDir, 'sajik-seatmap-stage01-operator-status.json')),
  );
  const manualPatchPlanPath = path.resolve(
    frontendRoot,
    argValue('--manual-patch-plan', path.join(stageDir, 'sajik-seatmap-stage01-manual-patch-plan.json')),
  );
  const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-real-approval-readiness.json');
  const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-real-approval-readiness.csv');
  const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-real-approval-readiness.md');

  const operatorInput = await readJson(operatorInputPath);
  const inputAid = await readJson(inputAidPath);
  const prewrite = await readJson(prewritePath);
  const applyReady = await readJson(applyReadyPath);
  const postApply = await readJson(postApplyPath);
  const operatorStatus = await readJson(operatorStatusPath);
  const manualPatchPlan = await readJson(manualPatchPlanPath);

  const operatorRows = Array.isArray(operatorInput.corrections) ? operatorInput.corrections : [];
  const inputAidRows = Array.isArray(inputAid.rows) ? inputAid.rows : [];
  const prewriteRows = Array.isArray(prewrite.rows) ? prewrite.rows : [];
  const applyReadyRows = Array.isArray(applyReady.rows) ? applyReady.rows : [];
  const postApplyRows = Array.isArray(postApply.rows) ? postApply.rows : [];
  const operatorStatusRows = Array.isArray(operatorStatus.rows) ? operatorStatus.rows : [];
  const manualPatchRows = Array.isArray(manualPatchPlan.rows) ? manualPatchPlan.rows : [];
  const patchPayloads = Array.isArray(prewrite.patchPayloads) ? prewrite.patchPayloads : [];

  const inputAidBySectionId = new Map(inputAidRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
  const prewriteBySectionId = new Map(prewriteRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
  const applyReadyBySectionId = new Map(applyReadyRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
  const postApplyBySectionId = new Map(postApplyRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
  const operatorStatusBySectionId = new Map(operatorStatusRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
  const manualPatchBySectionId = new Map(manualPatchRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
  const patchPayloadBySectionId = new Map(patchPayloads.map((payload) => [String(payload.sectionId ?? '').trim(), payload]));

  const blockers = [];
  const warnings = [];

  pushVersionBlocker(blockers, 'OPERATOR_INPUT', operatorInput.packageVersion, REQUIRED_PACKAGE_VERSION);
  pushVersionBlocker(blockers, 'INPUT_AID', inputAid.summary?.inputAidVersion, REQUIRED_INPUT_AID_VERSION);
  pushVersionBlocker(blockers, 'PREWRITE', prewrite.summary?.prewriteVersion, REQUIRED_PREWRITE_VERSION);
  pushVersionBlocker(blockers, 'APPLY_READY', applyReady.summary?.applyReadyVersion, REQUIRED_APPLY_READY_VERSION);
  pushVersionBlocker(blockers, 'POST_APPLY', postApply.summary?.postApplyAuditVersion, REQUIRED_POST_APPLY_VERSION);
  pushVersionBlocker(blockers, 'OPERATOR_STATUS', operatorStatus.summary?.operatorStatusVersion, REQUIRED_OPERATOR_STATUS_VERSION);
  pushVersionBlocker(blockers, 'MANUAL_PATCH_PLAN', manualPatchPlan.summary?.manualPatchPlanVersion, REQUIRED_MANUAL_PATCH_PLAN_VERSION);

  pushStageBlocker(blockers, 'OPERATOR_INPUT', operatorInput.targetStage);
  pushStageBlocker(blockers, 'INPUT_AID', inputAid.summary?.targetStage);
  pushStageBlocker(blockers, 'PREWRITE', prewrite.summary?.targetStage);
  pushStageBlocker(blockers, 'APPLY_READY', applyReady.summary?.targetStage);
  pushStageBlocker(blockers, 'POST_APPLY', postApply.summary?.targetStage);
  pushStageBlocker(blockers, 'OPERATOR_STATUS', operatorStatus.summary?.targetStage);
  pushStageBlocker(blockers, 'MANUAL_PATCH_PLAN', manualPatchPlan.summary?.targetStage);

  pushFalseFlagBlocker(blockers, 'INPUT_AID', 'SOURCE_DATA_WRITE_PERFORMED', inputAid.summary?.sourceDataWritePerformed);
  pushFalseFlagBlocker(blockers, 'PREWRITE', 'PRODUCTION_DATA_CHANGED', prewrite.summary?.productionDataChanged);
  pushFalseFlagBlocker(blockers, 'PREWRITE', 'PRODUCTION_WRITE_ALLOWED', prewrite.summary?.productionWriteAllowed);
  pushFalseFlagBlocker(blockers, 'APPLY_READY', 'PRODUCTION_DATA_CHANGED', applyReady.summary?.productionDataChanged);
  pushFalseFlagBlocker(blockers, 'APPLY_READY', 'PRODUCTION_WRITE_ALLOWED', applyReady.summary?.productionWriteAllowed);
  pushFalseFlagBlocker(blockers, 'APPLY_READY', 'SOURCE_DATA_WRITE_PERFORMED', applyReady.summary?.sourceDataWritePerformed);
  pushFalseFlagBlocker(blockers, 'POST_APPLY', 'PRODUCTION_WRITE_ALLOWED', postApply.summary?.productionWriteAllowed);
  pushFalseFlagBlocker(blockers, 'POST_APPLY', 'SOURCE_DATA_WRITE_PERFORMED', postApply.summary?.sourceDataWritePerformed);
  pushFalseFlagBlocker(blockers, 'OPERATOR_STATUS', 'PRODUCTION_WRITE_ALLOWED', operatorStatus.summary?.productionWriteAllowed);
  pushFalseFlagBlocker(blockers, 'OPERATOR_STATUS', 'SOURCE_DATA_WRITE_PERFORMED', operatorStatus.summary?.sourceDataWritePerformed);
  pushFalseFlagBlocker(blockers, 'MANUAL_PATCH_PLAN', 'PRODUCTION_WRITE_ALLOWED', manualPatchPlan.summary?.productionWriteAllowed);
  pushFalseFlagBlocker(blockers, 'MANUAL_PATCH_PLAN', 'SOURCE_DATA_WRITE_PERFORMED', manualPatchPlan.summary?.sourceDataWritePerformed);

  if (postApply.summary?.readOnly !== true) {
    blockers.push('POST_APPLY_MUST_BE_READ_ONLY');
  }
  if (reportStatus(postApply) === 'blocked') {
    blockers.push(...(postApply.summary?.blockers ?? []).map((blocker) => `POST_APPLY_BLOCKED:${blocker}`));
  }
  if (manualPatchPlan.summary?.targetSourceFile !== TARGET_SOURCE_FILE) {
    blockers.push(`TARGET_SOURCE_FILE_MISMATCH:${manualPatchPlan.summary?.targetSourceFile ?? ''}:${TARGET_SOURCE_FILE}`);
  }
  if (!sameStringArray(manualPatchPlan.summary?.writableSourceFields, WRITABLE_SOURCE_FIELDS)) {
    blockers.push('WRITABLE_SOURCE_FIELDS_MISMATCH');
  }
  if (!sameStringArray(manualPatchPlan.summary?.lockedSourceFields, LOCKED_SOURCE_FIELDS)) {
    blockers.push('LOCKED_SOURCE_FIELDS_MISMATCH');
  }

  const operatorIds = sorted(operatorRows.map((row) => String(row.sectionId ?? '').trim()));
  const expectedIds = sorted(EXPECTED_STAGE01_SECTION_IDS);
  if (operatorRows.length !== EXPECTED_STAGE01_ROWS) {
    blockers.push(`STAGE01_OPERATOR_ROW_COUNT_MISMATCH:${operatorRows.length}:${EXPECTED_STAGE01_ROWS}`);
  }
  if (operatorIds.join(',') !== expectedIds.join(',')) {
    blockers.push(`STAGE01_OPERATOR_SECTION_IDS_MISMATCH:${operatorIds.join(' ')}:${expectedIds.join(' ')}`);
  }

  const rows = operatorRows.map((operatorRow) => {
    const sectionId = String(operatorRow.sectionId ?? '').trim();
    const decision = normalizeDecision(operatorRow.operatorDecision);
    const inputAidRow = inputAidBySectionId.get(sectionId);
    const prewriteRow = prewriteBySectionId.get(sectionId);
    const applyReadyRow = applyReadyBySectionId.get(sectionId);
    const postApplyRow = postApplyBySectionId.get(sectionId);
    const operatorStatusRow = operatorStatusBySectionId.get(sectionId);
    const manualPatchRow = manualPatchBySectionId.get(sectionId);
    const patchPayload = patchPayloadBySectionId.get(sectionId);
    const rowBlockers = [];
    const rowWarnings = [];

    if (!EXPECTED_STAGE01_SECTION_IDS.includes(sectionId)) {
      rowBlockers.push(`SECTION_OUTSIDE_STAGE01:${sectionId}`);
    }
    if (!DECISION_OPTIONS.has(decision)) {
      rowBlockers.push(`UNKNOWN_OPERATOR_DECISION:${decision}`);
    }

    let readinessStatus = operatorStatusRow?.rowStatus ?? inputAidRow?.rowStatus ?? 'PENDING';
    let readinessAction = decision === 'PENDING' ? 'FILL_OR_DECIDE' : 'NO_PATCH_PREVIEW';

    if (decision === 'APPROVED') {
      if (!patchPayload) {
        rowBlockers.push('PATCH_PAYLOAD_MISSING');
      }
      if (prewriteRow?.validForPatchPreview !== true) {
        rowBlockers.push('APPROVED_ROW_NOT_VALID_FOR_PATCH_PREVIEW');
      }
      if (patchPayload?.sectionKind !== 'SEAT_SECTION') {
        rowBlockers.push(`SECTION_KIND_NOT_WRITABLE:${patchPayload?.sectionKind ?? ''}`);
      }
      if (patchPayload?.validation?.status !== 'PASS') {
        rowBlockers.push(`PATCH_PAYLOAD_VALIDATION_NOT_PASS:${patchPayload?.validation?.status ?? ''}`);
      }
      if (patchPayload && patchPayload.before?.visualPath !== patchPayload.after?.visualPath) {
        rowBlockers.push('VISUAL_PATH_CHANGED_WITHOUT_APPROVAL');
      }
      if (manualPatchRow && manualPatchRow.targetSourceFile !== TARGET_SOURCE_FILE) {
        rowBlockers.push(`MANUAL_PATCH_TARGET_SOURCE_FILE_MISMATCH:${manualPatchRow.targetSourceFile ?? ''}`);
      }
      if (manualPatchRow && !sameStringArray(manualPatchRow.writableSourceFields, WRITABLE_SOURCE_FIELDS)) {
        rowBlockers.push('MANUAL_PATCH_WRITABLE_SOURCE_FIELDS_MISMATCH');
      }
      if (manualPatchRow && !sameStringArray(manualPatchRow.lockedSourceFields, LOCKED_SOURCE_FIELDS)) {
        rowBlockers.push('MANUAL_PATCH_LOCKED_SOURCE_FIELDS_MISMATCH');
      }
      if (postApplyRow?.blockingReasons?.length > 0) {
        rowBlockers.push(...postApplyRow.blockingReasons);
      }

      const hitPathChanged = patchPayload && patchPayload.before?.hitPath !== patchPayload.after?.hitPath;
      const labelPointChanged = patchPayload && JSON.stringify(patchPayload.before?.labelPoint) !== JSON.stringify(patchPayload.after?.labelPoint);
      if (patchPayload && !hitPathChanged && !labelPointChanged) {
        rowWarnings.push('APPROVED_NO_GEOMETRY_DELTA');
      }

      if (rowBlockers.length > 0 || operatorStatusRow?.rowStatus === 'INVALID') {
        readinessStatus = 'APPROVED_BLOCKED';
        readinessAction = 'FIX_APPROVAL';
      } else if (operatorStatusRow?.rowStatus === 'APPLIED' || postApplyRow?.applied === true) {
        readinessStatus = 'APPROVED_APPLIED';
        readinessAction = 'VERIFY_APPLIED';
      } else if (operatorStatusRow?.rowStatus === 'NOT_APPLIED' || manualPatchRow?.action === 'MANUAL_PATCH_REQUIRED') {
        readinessStatus = 'APPROVED_NOT_APPLIED';
        readinessAction = 'APPLY_MANUAL_PATCH';
      } else if (reportStatus(applyReady) === 'ready-for-manual-apply') {
        readinessStatus = 'APPROVED_READY';
        readinessAction = 'REVIEW_MANUAL_PATCH';
      } else {
        readinessStatus = 'APPROVED_BLOCKED';
        readinessAction = 'FIX_APPROVAL';
        rowBlockers.push(`APPROVED_ROW_NOT_READY:${reportStatus(applyReady)}`);
      }
    }

    rowBlockers.forEach((blocker) => blockers.push(`${blocker}:${sectionId}`));
    rowWarnings.forEach((warning) => warnings.push(`${warning}:${sectionId}`));

    return {
      sectionId,
      batchId: operatorRow.batchId ?? operatorStatusRow?.batchId ?? '',
      zoneId: operatorRow.zoneId ?? operatorStatusRow?.zoneId ?? '',
      sectionName: operatorRow.sectionName ?? operatorStatusRow?.sectionName ?? '',
      seatCategoryLabel: operatorRow.seatCategoryLabel ?? operatorStatusRow?.seatCategoryLabel ?? '',
      operatorDecision: decision,
      inputAidRowStatus: inputAidRow?.rowStatus ?? '',
      operatorRowStatus: operatorStatusRow?.rowStatus ?? '',
      readinessStatus,
      readinessAction,
      patchPreviewEligible: decision === 'APPROVED',
      validForPatchPreview: Boolean(prewriteRow?.validForPatchPreview),
      applied: Boolean(postApplyRow?.applied),
      manualPatchRequired: manualPatchRow?.action === 'MANUAL_PATCH_REQUIRED',
      geometryDelta: Boolean(prewriteRow?.geometryDelta),
      visualPathLocked: patchPayload ? patchPayload.before?.visualPath === patchPayload.after?.visualPath : null,
      hitPathChanged: patchPayload ? patchPayload.before?.hitPath !== patchPayload.after?.hitPath : null,
      labelPointChanged: patchPayload
        ? JSON.stringify(patchPayload.before?.labelPoint) !== JSON.stringify(patchPayload.after?.labelPoint)
        : null,
      targetSourceFile: manualPatchRow?.targetSourceFile ?? TARGET_SOURCE_FILE,
      writableSourceFields: manualPatchRow?.writableSourceFields ?? WRITABLE_SOURCE_FIELDS,
      lockedSourceFields: manualPatchRow?.lockedSourceFields ?? LOCKED_SOURCE_FIELDS,
      blockers: rowBlockers,
      warnings: rowWarnings,
    };
  });

  const readinessCounts = rows.reduce((counts, row) => {
    counts[row.readinessStatus] = (counts[row.readinessStatus] ?? 0) + 1;
    return counts;
  }, {});
  const approvedRows = rows.filter((row) => row.operatorDecision === 'APPROVED');
  const approvedReadyRows = rows.filter((row) => row.readinessStatus === 'APPROVED_READY');
  const approvedNotAppliedRows = rows.filter((row) => row.readinessStatus === 'APPROVED_NOT_APPLIED');
  const approvedAppliedRows = rows.filter((row) => row.readinessStatus === 'APPROVED_APPLIED');
  const approvedBlockedRows = rows.filter((row) => row.readinessStatus === 'APPROVED_BLOCKED');
  const manualPatchRequiredRows = rows.filter((row) => row.manualPatchRequired);

  let status = 'waiting-for-operator';
  if (blockers.length > 0 || approvedBlockedRows.length > 0 || reportStatus(inputAid) === 'blocked' || reportStatus(prewrite) === 'blocked' || reportStatus(applyReady) === 'blocked' || reportStatus(postApply) === 'blocked' || reportStatus(operatorStatus) === 'blocked' || reportStatus(manualPatchPlan) === 'blocked') {
    status = 'blocked';
  } else if (approvedRows.length === 0) {
    status = 'waiting-for-operator';
  } else if (approvedNotAppliedRows.length > 0 || approvedReadyRows.length > 0) {
    status = 'ready-for-manual-apply';
  } else if (approvedAppliedRows.length === approvedRows.length) {
    status = 'applied';
  }

  const summary = {
    realApprovalReadinessVersion: REAL_APPROVAL_READINESS_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    stageDir: relativeToFrontend(stageDir),
    operatorInput: relativeToFrontend(operatorInputPath),
    inputAid: relativeToFrontend(inputAidPath),
    prewrite: relativeToFrontend(prewritePath),
    applyReady: relativeToFrontend(applyReadyPath),
    postApply: relativeToFrontend(postApplyPath),
    operatorStatus: relativeToFrontend(operatorStatusPath),
    manualPatchPlan: relativeToFrontend(manualPatchPlanPath),
    targetStage: TARGET_STAGE_LABEL,
    targetSourceFile: TARGET_SOURCE_FILE,
    totalRows: rows.length,
    expectedRows: EXPECTED_STAGE01_ROWS,
    approvedRows: approvedRows.length,
    approvedReadyRows: approvedReadyRows.length,
    approvedNotAppliedRows: approvedNotAppliedRows.length,
    approvedAppliedRows: approvedAppliedRows.length,
    approvedBlockedRows: approvedBlockedRows.length,
    manualPatchRows: manualPatchPlan.summary?.manualPatchRows ?? manualPatchRequiredRows.length,
    manualPatchRequiredRows: manualPatchRequiredRows.length,
    pendingRows: rows.filter((row) => row.operatorDecision === 'PENDING').length,
    rejectedRows: rows.filter((row) => row.operatorDecision === 'REJECTED').length,
    needsRetraceRows: rows.filter((row) => row.operatorDecision === 'NEEDS_RETRACE').length,
    keepCurrentRows: rows.filter((row) => row.operatorDecision === 'KEEP_CURRENT').length,
    readinessCounts,
    approvedReadinessStatuses: APPROVED_READINESS_STATUSES,
    reportStatuses: {
      inputAid: reportStatus(inputAid),
      prewrite: reportStatus(prewrite),
      applyReady: reportStatus(applyReady),
      postApply: reportStatus(postApply),
      operatorStatus: reportStatus(operatorStatus),
      manualPatchPlan: reportStatus(manualPatchPlan),
    },
    safetyContract: {
      sourceDataWritePerformed: false,
      productionWriteAllowed: false,
      productionDataChanged: false,
      writableSourceFields: WRITABLE_SOURCE_FIELDS,
      lockedSourceFields: LOCKED_SOURCE_FIELDS,
      sourceWritePolicy: 'read-only readiness gate; manual review patch only',
    },
    blockers,
    warnings,
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    rows,
  };

  const csvRows = [
    [
      'sectionId',
      'batchId',
      'zoneId',
      'operatorDecision',
      'inputAidRowStatus',
      'operatorRowStatus',
      'readinessStatus',
      'readinessAction',
      'validForPatchPreview',
      'applied',
      'manualPatchRequired',
      'geometryDelta',
      'visualPathLocked',
      'hitPathChanged',
      'labelPointChanged',
      'blockers',
      'warnings',
    ],
    ...rows.map((row) => [
      row.sectionId,
      row.batchId,
      row.zoneId,
      row.operatorDecision,
      row.inputAidRowStatus,
      row.operatorRowStatus,
      row.readinessStatus,
      row.readinessAction,
      row.validForPatchPreview,
      row.applied,
      row.manualPatchRequired,
      row.geometryDelta,
      row.visualPathLocked,
      row.hitPathChanged,
      row.labelPointChanged,
      row.blockers.join(';'),
      row.warnings.join(';'),
    ]),
  ];

  const approvedRowsTable = markdownTable(
    ['section', 'decision', 'readiness', 'action', 'manualPatch', 'visualLocked', 'hitChanged', 'labelChanged', 'blockers', 'warnings'],
    (approvedRows.length > 0 ? approvedRows : rows).map((row) => [
      row.sectionId,
      row.operatorDecision,
      row.readinessStatus,
      row.readinessAction,
      row.manualPatchRequired,
      row.visualPathLocked,
      row.hitPathChanged,
      row.labelPointChanged,
      row.blockers.join('<br>'),
      row.warnings.join('<br>'),
    ]),
  );

  const markdown = [
    '# Sajik Stage 01 Real Approval Readiness',
    '',
    `- status: \`${summary.status}\``,
    `- approved rows: \`${summary.approvedRows}\``,
    `- approved ready rows: \`${summary.approvedReadyRows}\``,
    `- approved not applied rows: \`${summary.approvedNotAppliedRows}\``,
    `- approved applied rows: \`${summary.approvedAppliedRows}\``,
    `- approved blocked rows: \`${summary.approvedBlockedRows}\``,
    `- manual patch rows: \`${summary.manualPatchRows}\``,
    `- blockers: \`${summary.blockers.length}\``,
    `- source data write performed: \`${summary.safetyContract.sourceDataWritePerformed}\``,
    '',
    '## Readiness Statuses',
    '',
    '- `APPROVED_READY`: approved row has a valid patch preview and is review-ready.',
    '- `APPROVED_NOT_APPLIED`: approved row is valid and requires a manual source patch.',
    '- `APPROVED_APPLIED`: approved row already matches production data.',
    '- `APPROVED_BLOCKED`: approved row has invalid input, unsafe section kind, visualPath change, or blocked upstream report.',
    '',
    '## Approved Row Readiness',
    '',
    approvedRowsTable,
    '',
    '## Safety Contract',
    '',
    `- target source file: \`${TARGET_SOURCE_FILE}\``,
    `- writable source fields: \`${WRITABLE_SOURCE_FIELDS.join(', ')}\``,
    `- locked source fields: \`${LOCKED_SOURCE_FIELDS.join(', ')}\``,
    '- source data write performed: `false`',
    '- production write allowed: `false`',
    '- production data changed: `false`',
    '',
    '## Next Step',
    '',
    summary.status === 'waiting-for-operator'
      ? '- Wait for operator-approved Stage 01 rows.'
      : summary.status === 'ready-for-manual-apply'
        ? '- Review manual patch plan fragments and apply approved rows manually.'
        : summary.status === 'applied'
          ? '- Run post-apply audit with `--require-applied` before entering Stage 02.'
          : '- Fix blockers before applying any source patch.',
  ].join('\n');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, csvRows);
  await fs.writeFile(markdownPath, `${markdown}\n`, 'utf8');

  console.log(`stage01_real_approval_readiness_json:${relativeToFrontend(jsonPath)}`);
  console.log(`stage01_real_approval_readiness_csv:${relativeToFrontend(csvPath)}`);
  console.log(`stage01_real_approval_readiness_markdown:${relativeToFrontend(markdownPath)}`);
  console.log(`status:${summary.status} approved=${summary.approvedRows} ready=${summary.approvedReadyRows} notApplied=${summary.approvedNotAppliedRows} applied=${summary.approvedAppliedRows} blocked=${summary.approvedBlockedRows} manualPatchRows=${summary.manualPatchRows} blockers=${summary.blockers.length} sourceDataWritePerformed=false`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01ReviewBoard = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { pathToPoints } = await import("../src/utils/seatMapPolygonValidator.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultStageDir = path.join(reportDir, 'sajik-stage01-operator');

  const REVIEW_BOARD_VERSION = 'SAJIK_STAGE01_REVIEW_BOARD_V1';
  const REQUIRED_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
  const REQUIRED_INPUT_AID_VERSION = 'SAJIK_STAGE01_OPERATOR_INPUT_AID_V1';
  const REQUIRED_PIXEL_TOTAL_BLOCKS = 89;
  const REQUIRED_PIXEL_READY_BLOCKS = 89;
  const REQUIRED_PIXEL_NO_SEED_BLOCKS = 0;
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const EXPECTED_STAGE01_ROWS = 16;
  const EXPECTED_STAGE01_SECTION_IDS = [
    '021',
    '022',
    '031',
    '032',
    '121',
    '122',
    '123',
    '124',
    '125',
    '131',
    '132',
    '133',
    '134',
    '135',
    '142',
    '143',
  ];
  const DECISION_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT'];
  const APPROVED_REQUIRED_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
  ];
  const IMAGE_HREF = '../../../src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png';
  const IMAGE_WIDTH = 960;
  const IMAGE_HEIGHT = 640;
  const IMAGE_ANALYSIS_MIN_COVERAGE_HIGH_RISK = 0.86;
  const IMAGE_ANALYSIS_MIN_COVERAGE_MEDIUM_RISK = 0.9;
  const IMAGE_ANALYSIS_SMALL_COMPONENT_AREA = 80;
  const IMAGE_ANALYSIS_MEDIUM_COMPONENT_AREA = 250;
  const IMAGE_ANALYSIS_OUTSIDE_DISTANCE_HIGH_RISK = 1.5;

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

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const sorted = (values) => [...values].sort();

  const editableFieldsPresent = (row) => String(row.operatorDecision ?? 'PENDING').trim() !== 'PENDING'
    || Boolean(String(row.correctedPath ?? '').trim())
    || row.correctedLabelX !== ''
    || row.correctedLabelY !== ''
    || Boolean(String(row.reviewer ?? '').trim())
    || Boolean(String(row.reviewedAt ?? '').trim())
    || Boolean(String(row.operatorNote ?? '').trim());

  const safePointCount = (pathData) => {
    try {
      return pathToPoints(String(pathData ?? '')).length;
    } catch {
      return 0;
    }
  };

  const roundMetric = (value, digits = 3) => {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
  };

  const formatPoint = (value) => (Array.isArray(value) ? value.join(' ') : '');

  const formatBbox = (value) => {
    if (!value || typeof value !== 'object') return '';
    return `${value.minX},${value.minY},${value.maxX},${value.maxY}`;
  };

  const statusFill = (rowStatus) => {
    if (rowStatus === 'READY_FOR_PREWRITE') return '#16A34A';
    if (rowStatus === 'INVALID') return '#DC2626';
    if (rowStatus === 'REJECTED') return '#475569';
    if (rowStatus === 'NEEDS_RETRACE') return '#EA580C';
    if (rowStatus === 'KEEP_CURRENT') return '#0284C7';
    return '#64748B';
  };

  const batchStroke = (batchId) => {
    if (batchId === 'P0-A') return '#DC2626';
    if (batchId === 'P0-B') return '#EA580C';
    if (batchId === 'P0-C') return '#CA8A04';
    return '#334155';
  };

  const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
  const inputPath = path.resolve(
    frontendRoot,
    argValue('--input', path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json')),
  );
  const inputAidPath = path.resolve(
    frontendRoot,
    argValue('--input-aid', path.join(stageDir, 'sajik-seatmap-stage01-operator-input-aid.json')),
  );
  const packagePath = path.resolve(
    frontendRoot,
    argValue('--package', path.join(stageDir, 'sajik-seatmap-stage01-operator-package.json')),
  );
  const pixelComponentsPath = path.resolve(
    frontendRoot,
    argValue('--pixel-components', path.join(reportDir, 'sajik-seatmap-pixel-components.json')),
  );
  const jsonPath = path.join(stageDir, 'sajik-seatmap-stage01-review-board.json');
  const csvPath = path.join(stageDir, 'sajik-seatmap-stage01-review-board.csv');
  const markdownPath = path.join(stageDir, 'sajik-seatmap-stage01-review-board.md');
  const entrySheetCsvPath = path.join(stageDir, 'sajik-seatmap-stage01-entry-sheet.csv');
  const entrySheetMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-entry-sheet.md');
  const overlaySvgPath = path.join(stageDir, 'sajik-seatmap-stage01-review-board.svg');

  const operatorInput = await readJson(inputPath);
  const inputAid = await readJson(inputAidPath);
  const packageSummary = await readJson(packagePath);
  const pixelComponents = await readJson(pixelComponentsPath);
  const inputRows = Array.isArray(operatorInput.corrections) ? operatorInput.corrections : [];
  const aidRows = Array.isArray(inputAid.rows) ? inputAid.rows : [];
  const aidBySectionId = new Map(aidRows.map((row) => [String(row.sectionId ?? '').trim(), row]));
  const pixelRows = Array.isArray(pixelComponents.blocks) ? pixelComponents.blocks : [];
  const pixelBySectionId = new Map(pixelRows.map((row) => [String(row.block ?? '').trim(), row]));
  const blockers = [];

  if (operatorInput.packageVersion !== REQUIRED_PACKAGE_VERSION) {
    blockers.push(`INPUT_PACKAGE_VERSION_MISMATCH:${operatorInput.packageVersion ?? ''}`);
  }
  if (operatorInput.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`INPUT_STAGE_MISMATCH:${operatorInput.targetStage ?? ''}`);
  }
  if (inputAid.summary?.inputAidVersion !== REQUIRED_INPUT_AID_VERSION) {
    blockers.push(`INPUT_AID_VERSION_MISMATCH:${inputAid.summary?.inputAidVersion ?? ''}`);
  }
  if (packageSummary.packageVersion !== REQUIRED_PACKAGE_VERSION) {
    blockers.push(`PACKAGE_SUMMARY_VERSION_MISMATCH:${packageSummary.packageVersion ?? ''}`);
  }
  if (pixelComponents.summary?.totalBlocks !== REQUIRED_PIXEL_TOTAL_BLOCKS) {
    blockers.push(`PIXEL_COMPONENT_TOTAL_BLOCKS:${pixelComponents.summary?.totalBlocks ?? ''}:${REQUIRED_PIXEL_TOTAL_BLOCKS}`);
  }
  if (pixelComponents.summary?.pixelCandidateReady !== REQUIRED_PIXEL_READY_BLOCKS) {
    blockers.push(`PIXEL_COMPONENT_READY_BLOCKS:${pixelComponents.summary?.pixelCandidateReady ?? ''}:${REQUIRED_PIXEL_READY_BLOCKS}`);
  }
  if (pixelComponents.summary?.noSeedColor !== REQUIRED_PIXEL_NO_SEED_BLOCKS) {
    blockers.push(`PIXEL_COMPONENT_NO_SEED_BLOCKS:${pixelComponents.summary?.noSeedColor ?? ''}:${REQUIRED_PIXEL_NO_SEED_BLOCKS}`);
  }
  if (inputRows.length !== EXPECTED_STAGE01_ROWS) {
    blockers.push(`STAGE01_REVIEW_BOARD_ROW_COUNT_MISMATCH:${inputRows.length}:${EXPECTED_STAGE01_ROWS}`);
  }

  const rowIds = sorted(inputRows.map((row) => String(row.sectionId ?? '').trim()));
  const expectedIds = sorted(EXPECTED_STAGE01_SECTION_IDS);
  if (rowIds.join(',') !== expectedIds.join(',')) {
    blockers.push(`STAGE01_REVIEW_BOARD_SECTION_IDS_MISMATCH:${rowIds.join(' ')}:${expectedIds.join(' ')}`);
  }

  const buildImageAnalysis = (sectionId) => {
    const pixelRow = pixelBySectionId.get(sectionId);
    if (!pixelRow) {
      return {
        status: 'MISSING_PIXEL_COMPONENT_ROW',
        riskLevel: 'HIGH',
        riskReasons: ['PIXEL_COMPONENT_ROW_MISSING'],
        source: path.relative(frontendRoot, pixelComponentsPath),
        candidateReferenceOnly: true,
      };
    }

    const candidate = pixelRow.candidate ?? {};
    const riskReasons = [];
    const status = candidate.status ?? 'UNKNOWN';
    const area = Number(candidate.area ?? 0);
    const pathColorCoverageRatio = Number(candidate.pathColorCoverageRatio ?? 0);
    const componentOutsideDilatedPathRatio = Number(candidate.componentOutsideDilatedPathRatio ?? 0);
    const maxComponentOutsidePathDistance = Number(candidate.maxComponentOutsidePathDistance ?? 0);

    if (status !== 'PIXEL_CANDIDATE_READY') {
      riskReasons.push(`PIXEL_STATUS_${status}`);
    }
    if (area > 0 && area < IMAGE_ANALYSIS_SMALL_COMPONENT_AREA) {
      riskReasons.push('SMALL_OFFICIAL_PIXEL_COMPONENT');
    } else if (area > 0 && area < IMAGE_ANALYSIS_MEDIUM_COMPONENT_AREA) {
      riskReasons.push('MEDIUM_OFFICIAL_PIXEL_COMPONENT');
    }
    if (pathColorCoverageRatio > 0 && pathColorCoverageRatio < IMAGE_ANALYSIS_MIN_COVERAGE_HIGH_RISK) {
      riskReasons.push('LOW_PATH_COLOR_COVERAGE');
    } else if (pathColorCoverageRatio > 0 && pathColorCoverageRatio < IMAGE_ANALYSIS_MIN_COVERAGE_MEDIUM_RISK) {
      riskReasons.push('MEDIUM_PATH_COLOR_COVERAGE');
    }
    if (componentOutsideDilatedPathRatio > 0) {
      riskReasons.push('OFFICIAL_COMPONENT_OUTSIDE_DILATED_PATH');
    }
    if (maxComponentOutsidePathDistance > IMAGE_ANALYSIS_OUTSIDE_DISTANCE_HIGH_RISK) {
      riskReasons.push('OFFICIAL_COMPONENT_OUTSIDE_PATH_DISTANCE');
    }

    const highRisk = status !== 'PIXEL_CANDIDATE_READY'
      || riskReasons.includes('SMALL_OFFICIAL_PIXEL_COMPONENT')
      || riskReasons.includes('LOW_PATH_COLOR_COVERAGE')
      || riskReasons.includes('OFFICIAL_COMPONENT_OUTSIDE_PATH_DISTANCE');
    const mediumRisk = riskReasons.length > 0;

    return {
      status,
      riskLevel: highRisk ? 'HIGH' : (mediumRisk ? 'MEDIUM' : 'LOW'),
      riskReasons,
      seedPoint: candidate.seedPoint ?? null,
      seedColor: candidate.seedColor ?? null,
      componentArea: area || null,
      bbox: candidate.bbox ?? null,
      center: candidate.center ?? null,
      pathColorCoverageRatio: roundMetric(pathColorCoverageRatio),
      componentInsidePathRatio: roundMetric(candidate.componentInsidePathRatio),
      componentOutsideDilatedPathRatio: roundMetric(componentOutsideDilatedPathRatio),
      maxComponentOutsidePathDistance: roundMetric(maxComponentOutsidePathDistance),
      outerBoundaryPointCount: candidate.outerBoundaryPointCount ?? null,
      overlayPath: candidate.outerBoundaryPath || candidate.hullPath || '',
      source: path.relative(frontendRoot, pixelComponentsPath),
      candidateReferenceOnly: true,
    };
  };

  const rows = inputRows.map((row) => {
    const sectionId = String(row.sectionId ?? '').trim();
    const aidRow = aidBySectionId.get(sectionId);
    if (!aidRow) {
      blockers.push(`INPUT_AID_ROW_MISSING:${sectionId}`);
    }
    const rowStatus = aidRow?.rowStatus ?? 'MISSING_AID';
    const currentLabelPoint = row.currentLabelPoint ?? [row.currentLabelX ?? null, row.currentLabelY ?? null];
    const imageAnalysis = buildImageAnalysis(sectionId);
    if (imageAnalysis.status !== 'PIXEL_CANDIDATE_READY') {
      blockers.push(`STAGE01_PIXEL_COMPONENT_NOT_READY:${sectionId}:${imageAnalysis.status}`);
    }
    return {
      sectionId,
      batchId: row.batchId ?? '',
      stageOrder: row.stageOrder ?? '',
      zoneId: row.zoneId ?? '',
      zoneLabel: row.zoneLabel ?? '',
      sectionName: row.sectionName ?? '',
      seatCategoryLabel: row.seatCategoryLabel ?? '',
      currentVisualPath: row.currentVisualPath ?? '',
      currentHitPath: row.currentHitPath ?? '',
      currentPointCount: safePointCount(row.currentHitPath),
      currentLabelX: row.currentLabelX ?? '',
      currentLabelY: row.currentLabelY ?? '',
      currentLabelPoint,
      operatorDecision: aidRow?.operatorDecision ?? row.operatorDecision ?? 'PENDING',
      rowStatus,
      action: aidRow?.action ?? 'MISSING_AID',
      nextAction: aidRow?.nextAction ?? 'Regenerate input aid before operator entry.',
      patchPreviewEligible: rowStatus === 'READY_FOR_PREWRITE',
      missingFields: aidRow?.missingFields ?? [],
      correctedPointCount: aidRow?.correctedPointCount ?? safePointCount(row.correctedPath),
      reviewer: String(row.reviewer ?? '').trim(),
      reviewedAt: String(row.reviewedAt ?? '').trim(),
      operatorNote: String(row.operatorNote ?? '').trim(),
      correctedPath: row.correctedPath ?? '',
      correctedLabelX: row.correctedLabelX ?? '',
      correctedLabelY: row.correctedLabelY ?? '',
      editableFieldsPresent: editableFieldsPresent(row),
      imageAnalysis,
      reasons: aidRow?.reasons ?? [],
      warnings: aidRow?.warnings ?? [],
    };
  });

  const statusCounts = rows.reduce((accumulator, row) => ({
    ...accumulator,
    [row.rowStatus]: (accumulator[row.rowStatus] ?? 0) + 1,
  }), {});
  const invalidRows = rows.filter((row) => row.rowStatus === 'INVALID');
  const readyRows = rows.filter((row) => row.rowStatus === 'READY_FOR_PREWRITE');
  const imageRiskCounts = rows.reduce((accumulator, row) => ({
    ...accumulator,
    [row.imageAnalysis.riskLevel]: (accumulator[row.imageAnalysis.riskLevel] ?? 0) + 1,
  }), {});
  const imageAnalysisPriorityRows = [...rows].sort((left, right) => {
    const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const leftRisk = riskOrder[left.imageAnalysis.riskLevel] ?? 99;
    const rightRisk = riskOrder[right.imageAnalysis.riskLevel] ?? 99;
    if (leftRisk !== rightRisk) return leftRisk - rightRisk;
    const leftArea = Number(left.imageAnalysis.componentArea ?? Number.POSITIVE_INFINITY);
    const rightArea = Number(right.imageAnalysis.componentArea ?? Number.POSITIVE_INFINITY);
    if (leftArea !== rightArea) return leftArea - rightArea;
    return left.sectionId.localeCompare(right.sectionId, 'ko');
  });

  const summary = {
    reviewBoardVersion: REVIEW_BOARD_VERSION,
    status: blockers.length > 0 ? 'blocked' : inputAid.summary?.status ?? 'waiting-for-operator',
    generatedAt: new Date().toISOString(),
    targetStage: TARGET_STAGE_LABEL,
    input: path.relative(frontendRoot, inputPath),
    inputAid: path.relative(frontendRoot, inputAidPath),
    packageSummary: path.relative(frontendRoot, packagePath),
    pixelComponents: path.relative(frontendRoot, pixelComponentsPath),
    totalRows: rows.length,
    expectedRows: EXPECTED_STAGE01_ROWS,
    pendingRows: statusCounts.PENDING ?? 0,
    readyForPrewriteRows: readyRows.length,
    rejectedRows: statusCounts.REJECTED ?? 0,
    needsRetraceRows: statusCounts.NEEDS_RETRACE ?? 0,
    keepCurrentRows: statusCounts.KEEP_CURRENT ?? 0,
    invalidRows: invalidRows.length,
    editableRows: rows.filter((row) => row.editableFieldsPresent).length,
    patchPreviewEligibleRows: readyRows.length,
    statusCounts,
    operatorDecisionOptions: DECISION_OPTIONS,
    approvedRequiredFields: APPROVED_REQUIRED_FIELDS,
    keepCurrentRule: 'KEEP_CURRENT keeps the current production geometry and never enters patch preview.',
    preservationStatus: packageSummary.preservationStatus ?? '',
    preservedEditableRows: packageSummary.preservedEditableRows ?? 0,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    coordinateSystem: `SVG viewBox 0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`,
    imageAnalysis: {
      source: path.relative(frontendRoot, pixelComponentsPath),
      officialPngOnly: true,
      candidateReferenceOnly: true,
      stage01RowsWithPixelCandidate: rows.filter((row) => row.imageAnalysis.status === 'PIXEL_CANDIDATE_READY').length,
      highRiskRows: imageRiskCounts.HIGH ?? 0,
      mediumRiskRows: imageRiskCounts.MEDIUM ?? 0,
      lowRiskRows: imageRiskCounts.LOW ?? 0,
      priorityOrder: imageAnalysisPriorityRows.map((row) => row.sectionId),
      guardrail: 'Pixel component paths are evidence for operator review only and must not be copied into correctedPath without operator approval.',
    },
    blockers,
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    safetyContract: [
      'This Stage 01 review board is read-only and never edits src/data/sajikSeatData.ts.',
      'It reads the operator package and input aid, then emits review board, entry sheet, and overlay outputs.',
      'It reads the official PNG pixel-component report to prioritize review rows, but pixel candidates are evidence only.',
      'It does not infer coordinates, expand hitPath, crawl baseball data, or use web search.',
      'It never copies pixel candidate paths into correctedPath or production data.',
      'The entry sheet is for operator-provided correctedPath and labelPoint values only.',
    ],
    actionLegend: {
      FILL_OR_DECIDE: 'Operator must fill approval fields or choose REJECTED/NEEDS_RETRACE/KEEP_CURRENT.',
      RUN_PREWRITE: 'Row is ready for the Stage 01 prewrite gate.',
      FIX_OPERATOR_INPUT: 'Operator input is invalid and must be fixed first.',
      NO_PATCH_PREVIEW: 'Decision row only; no source patch preview should be produced.',
      KEEP_CURRENT: 'Operator chose to keep the current production geometry for this Stage 01 pass.',
    },
    operatorGuide: {
      operatorDecisionOptions: DECISION_OPTIONS,
      approvedRequiredFields: APPROVED_REQUIRED_FIELDS,
      keepCurrentRule: summary.keepCurrentRule,
      patchPreviewRule: 'Only READY_FOR_PREWRITE rows with operatorDecision=APPROVED can enter patch preview.',
      invalidRowsFirst: true,
    },
    rows,
  };

  await fs.mkdir(stageDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const boardHeaders = [
    'sectionId',
    'batchId',
    'zoneId',
    'sectionName',
    'seatCategoryLabel',
    'rowStatus',
    'action',
    'nextAction',
    'operatorDecision',
    'imageRiskLevel',
    'imageRiskReasons',
    'imageCandidateStatus',
    'imageComponentArea',
    'imagePathColorCoverageRatio',
    'imageOutsideDilatedPathRatio',
    'imageMaxOutsidePathDistance',
    'imageBbox',
    'imageSeedPoint',
    'patchPreviewEligible',
    'missingFields',
    'currentPointCount',
    'correctedPointCount',
    'editableFieldsPresent',
    'reasons',
    'warnings',
  ];
  await writeCsv(csvPath, [
    boardHeaders,
    ...rows.map((row) => [
      row.sectionId,
      row.batchId,
      row.zoneId,
      row.sectionName,
      row.seatCategoryLabel,
      row.rowStatus,
      row.action,
      row.nextAction,
      row.operatorDecision,
      row.imageAnalysis.riskLevel,
      row.imageAnalysis.riskReasons.join('; '),
      row.imageAnalysis.status,
      row.imageAnalysis.componentArea ?? '',
      row.imageAnalysis.pathColorCoverageRatio ?? '',
      row.imageAnalysis.componentOutsideDilatedPathRatio ?? '',
      row.imageAnalysis.maxComponentOutsidePathDistance ?? '',
      formatBbox(row.imageAnalysis.bbox),
      formatPoint(row.imageAnalysis.seedPoint),
      row.patchPreviewEligible,
      row.missingFields.join('; '),
      row.currentPointCount,
      row.correctedPointCount,
      row.editableFieldsPresent,
      row.reasons.join('; '),
      row.warnings.join('; '),
    ]),
  ]);

  const entryHeaders = [
    'sectionId',
    'batchId',
    'zoneId',
    'rowStatus',
    'action',
    'operatorDecision',
    'operatorDecisionOptions',
    'imageRiskLevel',
    'imageRiskReasons',
    'imageCandidateStatus',
    'imageComponentArea',
    'imagePathColorCoverageRatio',
    'imageBbox',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
    'approvedRequiredFields',
    'keepCurrentRule',
    'patchPreviewEligible',
    'nextAction',
  ];
  await writeCsv(entrySheetCsvPath, [
    entryHeaders,
    ...rows.map((row) => [
      row.sectionId,
      row.batchId,
      row.zoneId,
      row.rowStatus,
      row.action,
      row.operatorDecision,
      DECISION_OPTIONS.join('|'),
      row.imageAnalysis.riskLevel,
      row.imageAnalysis.riskReasons.join('; '),
      row.imageAnalysis.status,
      row.imageAnalysis.componentArea ?? '',
      row.imageAnalysis.pathColorCoverageRatio ?? '',
      formatBbox(row.imageAnalysis.bbox),
      row.correctedPath,
      row.correctedLabelX,
      row.correctedLabelY,
      row.reviewer,
      row.reviewedAt,
      row.operatorNote,
      APPROVED_REQUIRED_FIELDS.join('|'),
      summary.keepCurrentRule,
      row.patchPreviewEligible,
      row.nextAction,
    ]),
  ]);

  await fs.writeFile(markdownPath, [
    '# Sajik Stage 01 Review Board',
    '',
    `- review board version: \`${REVIEW_BOARD_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- target stage: \`${summary.targetStage}\``,
    `- rows: \`${summary.totalRows}/${summary.expectedRows}\``,
    `- pending rows: \`${summary.pendingRows}\``,
    `- ready for prewrite rows: \`${summary.readyForPrewriteRows}\``,
    `- patch preview eligible rows: \`${summary.patchPreviewEligibleRows}\``,
    `- invalid rows: \`${summary.invalidRows}\``,
    `- image analysis source: \`${summary.imageAnalysis.source}\``,
    `- image analysis priority: \`${summary.imageAnalysis.priorityOrder.join(' -> ')}\``,
    `- image risk rows: high=\`${summary.imageAnalysis.highRiskRows}\`, medium=\`${summary.imageAnalysis.mediumRiskRows}\`, low=\`${summary.imageAnalysis.lowRiskRows}\``,
    `- preservation status: \`${summary.preservationStatus}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    '',
    '## Status Counts',
    '',
    markdownTable(
      ['status', 'count'],
      DECISION_OPTIONS
        .map((decision) => (decision === 'APPROVED' ? 'READY_FOR_PREWRITE' : decision))
        .filter((status, index, values) => values.indexOf(status) === index)
        .concat(['INVALID'])
        .map((status) => [`\`${status}\``, `\`${statusCounts[status] ?? 0}\``]),
    ),
    '',
    '## Invalid Rows First',
    '',
    invalidRows.length > 0
      ? markdownTable(
        ['section', 'status', 'action', 'next action', 'reasons'],
        invalidRows.map((row) => [
          `\`${row.sectionId}\``,
          `\`${row.rowStatus}\``,
          `\`${row.action}\``,
          row.nextAction,
          row.reasons.join('; ') || '-',
        ]),
      )
      : 'No invalid operator input rows.',
    '',
    '## Official PNG Image Analysis',
    '',
    'The metrics below come from the local official PNG pixel-component report. They are operator-review evidence only; do not paste candidate paths into `correctedPath` without explicit operator approval.',
    '',
    markdownTable(
      ['priority', 'section', 'batch', 'risk', 'pixel status', 'area', 'coverage', 'outside', 'max outside px', 'bbox', 'seed', 'reasons'],
      imageAnalysisPriorityRows.map((row, index) => [
        `\`${index + 1}\``,
        `\`${row.sectionId}\``,
        `\`${row.batchId}\``,
        `\`${row.imageAnalysis.riskLevel}\``,
        `\`${row.imageAnalysis.status}\``,
        `\`${row.imageAnalysis.componentArea ?? '-'}\``,
        `\`${row.imageAnalysis.pathColorCoverageRatio ?? '-'}\``,
        `\`${row.imageAnalysis.componentOutsideDilatedPathRatio ?? '-'}\``,
        `\`${row.imageAnalysis.maxComponentOutsidePathDistance ?? '-'}\``,
        `\`${formatBbox(row.imageAnalysis.bbox) || '-'}\``,
        `\`${formatPoint(row.imageAnalysis.seedPoint) || '-'}\``,
        row.imageAnalysis.riskReasons.join('; ') || '-',
      ]),
    ),
    '',
    '## Rows',
    '',
    markdownTable(
      ['section', 'batch', 'zone', 'status', 'action', 'patch eligible', 'next action', 'missing fields', 'points', 'editable', 'reasons'],
      rows.map((row) => [
        `\`${row.sectionId}\``,
        `\`${row.batchId}\``,
        `\`${row.zoneId}\``,
        `\`${row.rowStatus}\``,
        `\`${row.action}\``,
        `\`${row.patchPreviewEligible}\``,
        row.nextAction,
        row.missingFields.join('; ') || '-',
        `\`${row.currentPointCount}/${row.correctedPointCount}\``,
        `\`${row.editableFieldsPresent}\``,
        row.reasons.join('; ') || '-',
      ]),
    ),
    '',
    '## Outputs',
    '',
    `- \`${path.relative(frontendRoot, jsonPath)}\``,
    `- \`${path.relative(frontendRoot, csvPath)}\``,
    `- \`${path.relative(frontendRoot, entrySheetCsvPath)}\``,
    `- \`${path.relative(frontendRoot, entrySheetMarkdownPath)}\``,
    `- \`${path.relative(frontendRoot, overlaySvgPath)}\``,
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No review board blockers.',
    '',
  ].join('\n'), 'utf8');

  await fs.writeFile(entrySheetMarkdownPath, [
    '# Sajik Stage 01 Entry Sheet',
    '',
    `- review board version: \`${REVIEW_BOARD_VERSION}\``,
    `- source input: \`${summary.input}\``,
    `- editable csv: \`${path.relative(frontendRoot, entrySheetCsvPath)}\``,
    `- production write allowed: \`${summary.productionWriteAllowed}\``,
    '',
    '## Editable Fields',
    '',
    '- `operatorDecision`: `PENDING`, `APPROVED`, `REJECTED`, or `NEEDS_RETRACE`',
    `- operatorDecisionOptions: \`${DECISION_OPTIONS.join(' | ')}\``,
    `- approvedRequiredFields: \`${APPROVED_REQUIRED_FIELDS.join(' | ')}\``,
    '- `correctedPath`: operator-approved `hitPath` in the official `960x640` SVG viewBox',
    '- `correctedLabelX` / `correctedLabelY`: operator-approved label point',
    '- `reviewer` and `reviewedAt`: required for `APPROVED` rows',
    '- `operatorNote`: required in practice for `REJECTED`, `NEEDS_RETRACE`, and `KEEP_CURRENT` rows',
    `- keepCurrentRule: ${summary.keepCurrentRule}`,
    '- patchPreviewEligible: only `READY_FOR_PREWRITE` rows can proceed to prewrite patch preview',
    '- image analysis fields are copied from the local official PNG pixel-component report and are not operator-approved coordinates',
    '- image candidate paths are evidence only and must not be copied into `correctedPath` without operator approval',
    '',
    '## Examples',
    '',
    'Example approved entry:',
    '',
    '```json',
    JSON.stringify({
      operatorDecision: 'APPROVED',
      correctedPath: 'M ... Z',
      correctedLabelX: 480,
      correctedLabelY: 312,
      reviewer: 'operator-name',
      reviewedAt: '2026-05-15T00:00:00.000Z',
      operatorNote: 'Approved hitPath after official PNG trace review.',
    }, null, 2),
    '```',
    '',
    'Example keep-current entry:',
    '',
    '```json',
    JSON.stringify({
      operatorDecision: 'KEEP_CURRENT',
      operatorNote: 'Current production hitPath is acceptable for this Stage 01 pass.',
    }, null, 2),
    '```',
    '',
    '## Rows',
    '',
    markdownTable(
      ['section', 'batch', 'zone', 'risk', 'status', 'action', 'patch eligible', 'operator decision', 'next action'],
      rows.map((row) => [
        `\`${row.sectionId}\``,
        `\`${row.batchId}\``,
        `\`${row.zoneId}\``,
        `\`${row.imageAnalysis.riskLevel}\``,
        `\`${row.rowStatus}\``,
        `\`${row.action}\``,
        `\`${row.patchPreviewEligible}\``,
        `\`${row.operatorDecision}\``,
        row.nextAction,
      ]),
    ),
    '',
  ].join('\n'), 'utf8');

  const svgPaths = rows.map((row) => {
    const [labelX, labelY] = row.currentLabelPoint;
    const imageAnalysisOverlay = row.imageAnalysis.overlayPath ? `
    <path d="${xmlEscape(row.imageAnalysis.overlayPath)}" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="3 3" vector-effect="non-scaling-stroke">
      <title>${xmlEscape(`${row.sectionId} official PNG pixel component reference only`)}</title>
    </path>` : '';
    return `
    <path d="${xmlEscape(row.currentVisualPath)}" fill="${statusFill(row.rowStatus)}" fill-opacity="0.22" stroke="${batchStroke(row.batchId)}" stroke-width="2.5" vector-effect="non-scaling-stroke">
      <title>${xmlEscape(`${row.sectionId} ${row.rowStatus} ${row.action}`)}</title>
    </path>
    ${imageAnalysisOverlay}
    <circle cx="${Number(labelX) || 0}" cy="${Number(labelY) || 0}" r="7" fill="${statusFill(row.rowStatus)}" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke"/>
    <text x="${Number(labelX) || 0}" y="${Number(labelY) || 0}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="3" paint-order="stroke">${xmlEscape(row.sectionId)}</text>
  `;
  }).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}">
    <image href="${xmlEscape(IMAGE_HREF)}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" opacity="0.52"/>
    <rect x="12" y="12" width="340" height="92" rx="8" fill="#ffffff" fill-opacity="0.9" stroke="#cbd5e1"/>
    <text x="28" y="38" font-size="18" font-weight="900" fill="#0f172a">Sajik Stage 01 review board</text>
    <text x="28" y="62" font-size="12" fill="#334155">status=${xmlEscape(summary.status)} pending=${summary.pendingRows} ready=${summary.readyForPrewriteRows} invalid=${summary.invalidRows}</text>
    <text x="28" y="82" font-size="12" fill="#334155">red/orange/yellow strokes=P0-A/B/C, blue dashed=PNG pixel evidence only</text>
    ${svgPaths}
  </svg>
  `;
  await fs.writeFile(overlaySvgPath, svg, 'utf8');

  console.log(`stage01_review_board_json:${path.relative(frontendRoot, jsonPath)}`);
  console.log(`stage01_review_board_csv:${path.relative(frontendRoot, csvPath)}`);
  console.log(`stage01_review_board_markdown:${path.relative(frontendRoot, markdownPath)}`);
  console.log(`stage01_entry_sheet_csv:${path.relative(frontendRoot, entrySheetCsvPath)}`);
  console.log(`stage01_entry_sheet_markdown:${path.relative(frontendRoot, entrySheetMarkdownPath)}`);
  console.log(`stage01_review_board_svg:${path.relative(frontendRoot, overlaySvgPath)}`);
  console.log(`status:${summary.status} rows=${summary.totalRows} pending=${summary.pendingRows} ready=${summary.readyForPrewriteRows} invalid=${summary.invalidRows} imageHighRisk=${summary.imageAnalysis.highRiskRows} blockers=${summary.blockers.length} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`);

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01StagedScopeAuditSmoke = async () => {
  const { spawnSync } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const SMOKE_VERSION = 'SAJIK_STAGE01_STAGED_SCOPE_AUDIT_SMOKE_V1';
  const STAGED_SCOPE_AUDIT_SCRIPT = 'scripts/sajik-seatmap-stage01.mjs';
  const EXPECTED_STAGE01_PARTIAL_TARGET_FILE_COUNT = 40;

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const stageDir = path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator');
  const smokeRoot = path.join(stageDir, 'staged-scope-audit-smoke', `run-${Date.now()}-${process.pid}`);
  const smokeJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-staged-scope-audit-smoke.json');
  const smokeMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-staged-scope-audit-smoke.md');
  const auditScriptPath = path.join(frontendRoot, STAGED_SCOPE_AUDIT_SCRIPT);

  const targetFiles = [
    'docs/sajik-seatmap-pr-packaging-inventory.md',
    'docs/sajik-seatmap-release-lock.md',
    'docs/sajik-seatmap-stage01-handoff.md',
    'package.json',
    'scripts/sajik-seatmap-editor-scope.mjs',
    'scripts/sajik-seatmap-editor-scope.mjs',    'scripts/sajik-seatmap-stage01.mjs',
  ];

  if (targetFiles.length !== EXPECTED_STAGE01_PARTIAL_TARGET_FILE_COUNT) {
    throw new Error(`Stage 01 staged scope smoke target count drift: ${targetFiles.length}`);
  }

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  }

  async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  function buildScopeGuardReport(overrides = {}) {
    return {
      generatedAt: new Date().toISOString(),
      executionMode: 'stage01-partial',
      stage01PartialScopeStatus: 'passed',
      includedFiles: targetFiles.map((file) => ({ file })),
      separateDirtyWork: [
        { file: 'src/data/gwangjuSeatData.ts' },
        { file: 'src/components/MateResultsRuntime.tsx' },
      ],
      unexpectedFiles: [],
      stagingManifest: {
        stage01PartialStagingVerdict: 'ready-for-partial-stage01-staging',
        safeToRunBulkGitAdd: false,
        partialHunkReviewBeforeStaging: [
          { file: 'package.json', status: 'manual-hunk-review' },
          { file: 'src/components/StadiumGuideRuntimeSeatMaps.test.ts', status: 'manual-hunk-review' },
        ],
      },
      summary: {
        unexpectedFileCount: 0,
        includedFileCount: EXPECTED_STAGE01_PARTIAL_TARGET_FILE_COUNT,
      },
      ...overrides,
    };
  }

  async function writeCaseInputs(caseDir, { sourceReport = buildScopeGuardReport(), stagedEntries }) {
    await writeJson(path.join(caseDir, 'source-scope-guard.json'), sourceReport);
    await writeJson(path.join(caseDir, 'staged-entries.json'), stagedEntries);
  }

  function runAudit(caseDir, requireComplete) {
    const outputDir = path.join(caseDir, 'out');
    const result = spawnSync(process.execPath, [
      auditScriptPath,
      '--source-report',
      path.relative(frontendRoot, path.join(caseDir, 'source-scope-guard.json')),
      '--staged-entries',
      path.relative(frontendRoot, path.join(caseDir, 'staged-entries.json')),
      '--output-dir',
      path.relative(frontendRoot, outputDir),
      ...(requireComplete ? ['--require-complete'] : []),
    ], {
      cwd: frontendRoot,
      encoding: 'utf8',
    });

    return {
      result,
      reportPath: path.join(outputDir, 'sajik-seatmap-stage01-staged-scope-audit.json'),
    };
  }

  const entry = (file, status = 'M') => ({ status, file, from: null });

  const cases = [
    {
      caseId: 'partial-target-subset-passes',
      stagedEntries: [entry('package.json'), entry('scripts/sajik-seatmap-stage01.mjs', 'A')],
      expectedExitCode: 0,
      expectedStatus: 'passed',
      expectedReadyForCommit: true,
      expectedUnstageFiles: [],
      expectedUnstageReasons: {},
    },
    {
      caseId: 'complete-target-set-passes',
      requireComplete: true,
      stagedEntries: targetFiles.map((file) => entry(file, file.endsWith('-smoke.mjs') ? 'A' : 'M')),
      expectedExitCode: 0,
      expectedStatus: 'passed',
      expectedReadyForCommit: true,
      expectedUnstageFiles: [],
      expectedUnstageReasons: {},
    },
    {
      caseId: 'complete-mode-missing-target-blocks',
      requireComplete: true,
      stagedEntries: targetFiles.slice(0, -1).map((file) => entry(file)),
      expectedExitCode: 1,
      expectedStatus: 'blocked',
      expectedBlockers: ['STAGED_TARGET_COUNT_INCOMPLETE:39/40', `STAGED_TARGET_FILE_MISSING:${targetFiles[targetFiles.length - 1]}`],
      expectedUnstageFiles: [],
      expectedUnstageReasons: {},
    },
    {
      caseId: 'outside-file-blocks',
      stagedEntries: [entry('package.json'), entry('src/data/sajikSeatData.ts')],
      expectedExitCode: 1,
      expectedStatus: 'blocked',
      expectedBlockers: ['STAGED_FILE_OUTSIDE_STAGE01_TARGETS:src/data/sajikSeatData.ts'],
      expectedUnstageFiles: ['src/data/sajikSeatData.ts'],
      expectedUnstageReasons: {
        'src/data/sajikSeatData.ts': ['OUTSIDE_STAGE01_TARGET'],
      },
    },
    {
      caseId: 'separate-work-blocks',
      stagedEntries: [entry('src/data/gwangjuSeatData.ts')],
      expectedExitCode: 1,
      expectedStatus: 'blocked',
      expectedBlockers: [
        'STAGED_FILE_OUTSIDE_STAGE01_TARGETS:src/data/gwangjuSeatData.ts',
        'STAGED_SEPARATE_DIRTY_WORK:src/data/gwangjuSeatData.ts',
      ],
      expectedUnstageFiles: ['src/data/gwangjuSeatData.ts'],
      expectedUnstageReasons: {
        'src/data/gwangjuSeatData.ts': ['OUTSIDE_STAGE01_TARGET', 'SEPARATE_DIRTY_WORK'],
      },
    },
    {
      caseId: 'deleted-target-blocks',
      stagedEntries: [entry('scripts/sajik-seatmap-stage01.mjs', 'D')],
      expectedExitCode: 1,
      expectedStatus: 'blocked',
      expectedBlockers: ['STAGED_STAGE01_TARGET_DELETED:scripts/sajik-seatmap-stage01.mjs'],
      expectedUnstageFiles: ['scripts/sajik-seatmap-stage01.mjs'],
      expectedUnstageReasons: {
        'scripts/sajik-seatmap-stage01.mjs': ['DELETED_STAGE01_TARGET'],
      },
    },
    {
      caseId: 'source-count-drift-blocks',
      sourceReport: buildScopeGuardReport({
        summary: {
          unexpectedFileCount: 0,
          includedFileCount: 32,
        },
      }),
      stagedEntries: [entry('package.json')],
      expectedExitCode: 1,
      expectedStatus: 'blocked',
      expectedBlockers: ['SOURCE_INCLUDED_FILE_COUNT_CHANGED:32'],
      expectedUnstageFiles: [],
      expectedUnstageReasons: {},
    },
  ];

  const caseSummaries = [];

  for (const smokeCase of cases) {
    const caseDir = path.join(smokeRoot, smokeCase.caseId);
    await writeCaseInputs(caseDir, smokeCase);
    const { result, reportPath } = runAudit(caseDir, smokeCase.requireComplete);
    const auditReport = await readJson(reportPath);
    const blockerText = (auditReport.blockers ?? []).join('\n');
    const failures = [];

    if (result.status !== smokeCase.expectedExitCode) {
      failures.push(`EXIT_CODE:${result.status}:${smokeCase.expectedExitCode}`);
    }
    if (auditReport.status !== smokeCase.expectedStatus) {
      failures.push(`STATUS:${auditReport.status}:${smokeCase.expectedStatus}`);
    }
    if (
      'expectedReadyForCommit' in smokeCase
      && auditReport.stagedScopeGate?.readyForCommit !== smokeCase.expectedReadyForCommit
    ) {
      failures.push(`READY_FOR_COMMIT:${auditReport.stagedScopeGate?.readyForCommit}:${smokeCase.expectedReadyForCommit}`);
    }
    if (auditReport.stagedScopeGate?.safeToRunBulkGitAdd !== false) failures.push('SAFE_TO_RUN_BULK_GIT_ADD_NOT_FALSE');
    if (auditReport.doesNotRunGitAdd !== true) failures.push('DOES_NOT_RUN_GIT_ADD_NOT_TRUE');
    if (auditReport.doesNotModifyDataFile !== true) failures.push('DOES_NOT_MODIFY_DATA_FILE_NOT_TRUE');
    if (auditReport.stagedScopeGate?.fixtureMode !== true) failures.push('FIXTURE_MODE_NOT_TRUE');
    if (auditReport.stagingRemediation?.doesNotRunGitCommands !== true) failures.push('REMEDIATION_RUNS_GIT_COMMANDS');
    if (auditReport.stagingRemediation?.actionMode !== 'operator-manual-index-cleanup') failures.push('REMEDIATION_ACTION_MODE_CHANGED');
    for (const expectedBlocker of smokeCase.expectedBlockers ?? []) {
      if (!blockerText.includes(expectedBlocker)) failures.push(`MISSING_BLOCKER:${expectedBlocker}`);
    }
    for (const expectedUnstageFile of smokeCase.expectedUnstageFiles ?? []) {
      if (!auditReport.stagingRemediation?.stagedFilesToUnstage?.includes(expectedUnstageFile)) {
        failures.push(`MISSING_UNSTAGE_FILE:${expectedUnstageFile}`);
      }
    }
    const unstageReasonsByFile = Object.fromEntries(
      (auditReport.stagingRemediation?.stagedFilesToUnstageWithReasons ?? [])
        .map((entry) => [entry.file, entry.reasons ?? []]),
    );
    for (const [expectedFile, expectedReasons] of Object.entries(smokeCase.expectedUnstageReasons ?? {})) {
      const actualReasons = unstageReasonsByFile[expectedFile] ?? [];
      for (const expectedReason of expectedReasons) {
        if (!actualReasons.includes(expectedReason)) {
          failures.push(`MISSING_UNSTAGE_REASON:${expectedFile}:${expectedReason}`);
        }
      }
    }
    if ((smokeCase.expectedUnstageFiles ?? []).length === 0 && auditReport.stagingRemediation?.stagedFilesToUnstage?.length > 0) {
      failures.push(`UNEXPECTED_UNSTAGE_FILES:${auditReport.stagingRemediation.stagedFilesToUnstage.join(',')}`);
    }

    caseSummaries.push({
      caseId: smokeCase.caseId,
      status: failures.length === 0 ? 'passed' : 'failed',
      requireComplete: Boolean(smokeCase.requireComplete),
      exitCode: result.status,
      expectedExitCode: smokeCase.expectedExitCode,
      auditStatus: auditReport.status,
      readyForCommit: auditReport.stagedScopeGate?.readyForCommit,
      stagedFilesToUnstage: auditReport.stagingRemediation?.stagedFilesToUnstage ?? [],
      stagedFilesToUnstageWithReasons: auditReport.stagingRemediation?.stagedFilesToUnstageWithReasons ?? [],
      blockerCount: auditReport.blockers?.length ?? 0,
      blockers: auditReport.blockers ?? [],
      failures,
    });
  }

  const failedCases = caseSummaries.filter((caseSummary) => caseSummary.status !== 'passed');
  const report = {
    generatedAt: new Date().toISOString(),
    smokeVersion: SMOKE_VERSION,
    status: failedCases.length > 0 ? 'failed' : 'passed',
    auditScript: STAGED_SCOPE_AUDIT_SCRIPT,
    totalCases: caseSummaries.length,
    passedCases: caseSummaries.length - failedCases.length,
    failedCases: failedCases.length,
    expectedStage01PartialTargetFileCount: EXPECTED_STAGE01_PARTIAL_TARGET_FILE_COUNT,
    sourceDataWritePerformed: false,
    productionWriteAllowed: false,
    productionDataChanged: false,
    writesOperatorInput: false,
    writesProductionData: false,
    sourcePolicy: {
      allowedCoordinateSource: 'operator-approved official 2026 Sajik PNG manual trace only',
      missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      disallowedSources: [
        'automatic coordinate guessing',
        'bulk git add',
        'external crawling',
        'web-search-based baseball data',
      ],
    },
    caseSummaries,
  };

  const markdown = [
    '# Sajik Stage 01 Staged Scope Audit Smoke',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['status', report.status],
        ['cases', `${report.passedCases}/${report.totalCases}`],
        ['expectedStage01PartialTargetFileCount', String(report.expectedStage01PartialTargetFileCount)],
        ['sourceDataWritePerformed', String(report.sourceDataWritePerformed)],
        ['writesOperatorInput', String(report.writesOperatorInput)],
        ['writesProductionData', String(report.writesProductionData)],
      ],
    ),
    '',
    '## Cases',
    '',
    markdownTable(
      ['case', 'status', 'exit', 'audit status', 'ready for commit', 'unstage files', 'unstage reasons', 'blockers', 'failures'],
      caseSummaries.map((caseSummary) => [
        caseSummary.caseId,
        caseSummary.status,
        `${caseSummary.exitCode}/${caseSummary.expectedExitCode}`,
        caseSummary.auditStatus,
        String(caseSummary.readyForCommit),
        caseSummary.stagedFilesToUnstage.join(', ') || '-',
        caseSummary.stagedFilesToUnstageWithReasons
          .map((entry) => `${entry.file}:${(entry.reasons ?? []).join('+')}`)
          .join(', ') || '-',
        String(caseSummary.blockerCount),
        caseSummary.failures.join(', ') || '-',
      ]),
    ),
    '',
    '## Safety Contract',
    '',
    '- This smoke writes only generated fixture reports under `reports/stadium/sajik-stage01-operator`.',
    '- It does not run `git add`.',
    '- It does not modify `src/data/sajikSeatData.ts`.',
    '- It does not write operator input.',
    '',
  ].join('\n');

  await writeJson(smokeJsonPath, report);
  await fs.writeFile(`${smokeMarkdownPath}.tmp`, markdown, 'utf8');
  await fs.rename(`${smokeMarkdownPath}.tmp`, smokeMarkdownPath);

  console.log(`stage01_staged_scope_audit_smoke_json:${path.relative(frontendRoot, smokeJsonPath)}`);
  console.log(`stage01_staged_scope_audit_smoke_markdown:${path.relative(frontendRoot, smokeMarkdownPath)}`);
  console.log(
    `status:${report.status} cases=${report.passedCases}/${report.totalCases} expectedStage01PartialTargetFileCount=${EXPECTED_STAGE01_PARTIAL_TARGET_FILE_COUNT} sourceDataWritePerformed=${report.sourceDataWritePerformed}`,
  );

  if (failedCases.length > 0) {
    process.exitCode = 1;
  }
};

const runStage01StagedScopeAudit = async () => {
  const { execFile } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { promisify } = await import("node:util");

  const execFileAsync = promisify(execFile);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const resolveFromRoot = (value) => path.resolve(frontendRoot, value);
  const reportDir = resolveFromRoot(argValue('--output-dir', 'reports/stadium'));
  const sourceReportPath = resolveFromRoot(argValue('--source-report', 'reports/stadium/sajik-seatmap-pr-scope-guard.json'));
  const stagedEntriesPath = argValue('--staged-entries', null);
  const outputPaths = {
    json: path.join(reportDir, 'sajik-seatmap-stage01-staged-scope-audit.json'),
    csv: path.join(reportDir, 'sajik-seatmap-stage01-staged-scope-audit.csv'),
    markdown: path.join(reportDir, 'sajik-seatmap-stage01-staged-scope-audit.md'),
  };

  const REPORT_VERSION = 'SAJIK_STAGE01_STAGED_SCOPE_AUDIT_V1';
  const EXPECTED_STAGE01_PARTIAL_TARGET_FILE_COUNT = 40;
  const requireComplete = process.argv.includes('--require-complete');

  const sourcePolicy = {
    allowedCoordinateSource: 'official 2026 Sajik PNG plus operator-approved manual polygon-v2 trace only',
    coordinateSystem: '960x640 SVG viewBox 0 0 960 640',
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    disallowedSources: [
      'external crawling',
      'web-search-based baseball data',
      'resized screenshots',
      'browser CSS pixels as source coordinates',
      'third-party copied seatmap images',
    ],
  };

  const forbiddenCommands = [
    'git add .',
    'git add -A',
    'git commit -am',
  ];

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const csvEscape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };

  const readJson = async (filePath) => {
    try {
      return {
        exists: true,
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: null,
      };
    } catch (error) {
      return {
        exists: error?.code !== 'ENOENT',
        data: null,
        error: error?.code === 'ENOENT'
          ? `MISSING_REPORT:${path.relative(frontendRoot, filePath)}`
          : `READ_REPORT_FAILED:${error.message}`,
      };
    }
  };

  const parseNameStatusZ = (stdout) => {
    const tokens = stdout.split('\0').filter(Boolean);
    const entries = [];
    for (let index = 0; index < tokens.length;) {
      const status = tokens[index++];
      if (status?.startsWith('R') || status?.startsWith('C')) {
        const from = tokens[index++];
        const file = tokens[index++];
        entries.push({ status, file, from });
      } else if (status) {
        const file = tokens[index++];
        entries.push({ status, file, from: null });
      }
    }
    return entries;
  };

  const readStagedEntries = async () => {
    if (stagedEntriesPath) {
      const entries = JSON.parse(await fs.readFile(resolveFromRoot(stagedEntriesPath), 'utf8'));
      return entries.map((entry) => ({
        status: String(entry.status ?? ''),
        file: String(entry.file ?? ''),
        from: entry.from ?? null,
      }));
    }

    const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-status', '-z'], {
      cwd: frontendRoot,
      maxBuffer: 1024 * 1024 * 16,
    });
    return parseNameStatusZ(stdout);
  };

  const unique = (values) => [...new Set(values)];

  const { exists: sourceReportExists, data: sourceReport, error: sourceReportError } = await readJson(sourceReportPath);
  const stagedEntries = await readStagedEntries();

  const targetFiles = (sourceReport?.includedFiles ?? [])
    .map((entry) => entry.file)
    .filter(Boolean);
  const targetFileSet = new Set(targetFiles);
  const duplicateTargetFiles = targetFiles.filter((file, index) => targetFiles.indexOf(file) !== index);
  const separateDirtyWork = sourceReport?.separateDirtyWork ?? [];
  const separateDirtyWorkSet = new Set(separateDirtyWork.map((entry) => entry.file));
  const unexpectedDirtyFiles = sourceReport?.unexpectedFiles ?? [];
  const unexpectedDirtyFileSet = new Set(unexpectedDirtyFiles.map((entry) => entry.file));
  const hunkReviewFileSet = new Set(
    (sourceReport?.stagingManifest?.partialHunkReviewBeforeStaging ?? [])
      .filter((entry) => entry.status !== '-')
      .map((entry) => entry.file),
  );

  const stagedOutsideTargets = stagedEntries.filter((entry) => !targetFileSet.has(entry.file));
  const stagedSeparateDirtyWork = stagedEntries.filter((entry) => separateDirtyWorkSet.has(entry.file));
  const stagedUnexpectedDirtyFiles = stagedEntries.filter((entry) => unexpectedDirtyFileSet.has(entry.file));
  const deletedTargetFiles = stagedEntries.filter((entry) => targetFileSet.has(entry.file) && entry.status === 'D');
  const stagedTargetFileSet = new Set(stagedEntries
    .filter((entry) => targetFileSet.has(entry.file))
    .map((entry) => entry.file));
  const missingStagedTargetFiles = targetFiles.filter((file) => !stagedTargetFileSet.has(file));

  const sourceReportBlockers = [
    ...(sourceReportError ? [`${sourceReportError}:reports/stadium/sajik-seatmap-pr-scope-guard.json`] : []),
    ...(sourceReport?.executionMode !== 'stage01-partial' ? [`SOURCE_SCOPE_GUARD_NOT_STAGE01_PARTIAL:${sourceReport?.executionMode ?? 'missing'}`] : []),
    ...(sourceReport?.stage01PartialScopeStatus !== 'passed' ? [`SOURCE_STAGE01_PARTIAL_SCOPE_NOT_PASSED:${sourceReport?.stage01PartialScopeStatus ?? 'missing'}`] : []),
    ...(sourceReport?.stagingManifest?.stage01PartialStagingVerdict !== 'ready-for-partial-stage01-staging'
      ? [`SOURCE_STAGE01_PARTIAL_STAGING_NOT_READY:${sourceReport?.stagingManifest?.stage01PartialStagingVerdict ?? 'missing'}`]
      : []),
    ...(sourceReport?.stagingManifest?.safeToRunBulkGitAdd !== false ? ['SOURCE_SCOPE_GUARD_BULK_GIT_ADD_ALLOWED'] : []),
    ...(sourceReport?.summary?.unexpectedFileCount !== 0 ? [`SOURCE_SCOPE_GUARD_UNEXPECTED_FILES:${sourceReport?.summary?.unexpectedFileCount ?? 'missing'}`] : []),
    ...(sourceReport?.summary?.includedFileCount !== EXPECTED_STAGE01_PARTIAL_TARGET_FILE_COUNT
      ? [`SOURCE_INCLUDED_FILE_COUNT_CHANGED:${sourceReport?.summary?.includedFileCount ?? 'missing'}`]
      : []),
    ...(targetFiles.length !== EXPECTED_STAGE01_PARTIAL_TARGET_FILE_COUNT ? [`TARGET_FILE_COUNT_CHANGED:${targetFiles.length}`] : []),
  ];

  const strictCompletionBlockers = requireComplete
    ? [
      ...(missingStagedTargetFiles.length > 0 ? [`STAGED_TARGET_COUNT_INCOMPLETE:${stagedTargetFileSet.size}/${targetFiles.length}`] : []),
      ...missingStagedTargetFiles.map((file) => `STAGED_TARGET_FILE_MISSING:${file}`),
    ]
    : [];

  const blockers = [
    ...sourceReportBlockers,
    ...duplicateTargetFiles.map((file) => `DUPLICATE_TARGET_FILE:${file}`),
    ...stagedOutsideTargets.map((entry) => `STAGED_FILE_OUTSIDE_STAGE01_TARGETS:${entry.file}`),
    ...stagedSeparateDirtyWork.map((entry) => `STAGED_SEPARATE_DIRTY_WORK:${entry.file}`),
    ...stagedUnexpectedDirtyFiles.map((entry) => `STAGED_UNEXPECTED_DIRTY_FILE:${entry.file}`),
    ...deletedTargetFiles.map((entry) => `STAGED_STAGE01_TARGET_DELETED:${entry.file}`),
    ...strictCompletionBlockers,
  ];

  const stagedRows = stagedEntries.map((entry, index) => ({
    order: index + 1,
    file: entry.file,
    status: entry.status,
    from: entry.from,
    inStage01TargetFiles: targetFileSet.has(entry.file),
    requiresManualHunkReview: hunkReviewFileSet.has(entry.file),
    isSeparateDirtyWork: separateDirtyWorkSet.has(entry.file),
    isUnexpectedDirtyFile: unexpectedDirtyFileSet.has(entry.file),
  }));

  const remediationReasonsForEntry = (entry) => [
    !entry.inStage01TargetFiles ? 'OUTSIDE_STAGE01_TARGET' : null,
    entry.isSeparateDirtyWork ? 'SEPARATE_DIRTY_WORK' : null,
    entry.isUnexpectedDirtyFile ? 'UNEXPECTED_DIRTY_FILE' : null,
    entry.inStage01TargetFiles && entry.status === 'D' ? 'DELETED_STAGE01_TARGET' : null,
  ].filter(Boolean);

  const stagedFilesToUnstage = unique([
    ...stagedOutsideTargets.map((entry) => entry.file),
    ...stagedSeparateDirtyWork.map((entry) => entry.file),
    ...stagedUnexpectedDirtyFiles.map((entry) => entry.file),
    ...deletedTargetFiles.map((entry) => entry.file),
  ]).sort();
  const stagedFilesToUnstageWithReasons = stagedFilesToUnstage.map((file) => {
    const stagedRow = stagedRows.find((entry) => entry.file === file);
    return {
      file,
      status: stagedRow?.status ?? '',
      reasons: stagedRow ? remediationReasonsForEntry(stagedRow) : ['UNKNOWN_STAGED_FILE'],
    };
  });
  const stagedTargetFilesToKeep = stagedRows
    .filter((entry) => entry.inStage01TargetFiles && !stagedFilesToUnstage.includes(entry.file))
    .map((entry) => entry.file);
  const stagedManualHunkReviewFiles = stagedRows
    .filter((entry) => entry.inStage01TargetFiles && entry.requiresManualHunkReview)
    .map((entry) => entry.file);
  const nextActions = blockers.length === 0
    ? [
      'Review staged Stage 01 target files before commit.',
      requireComplete
        ? 'Complete-mode target set is fully staged.'
        : 'Partial-mode staged target subset is clean; use --require-complete only for commit-readiness.',
    ]
    : [
      stagedFilesToUnstage.length > 0
        ? 'Remove staged non-Stage-01 or separated workstream files from the index, then rerun this audit.'
        : null,
      missingStagedTargetFiles.length > 0 && requireComplete
        ? 'Stage the missing Stage 01 target files with manual hunk review where required, then rerun --require-complete.'
        : null,
      sourceReportBlockers.length > 0
        ? 'Regenerate the Stage 01 partial PR scope guard report before auditing staged files.'
        : null,
    ].filter(Boolean);

  const report = {
    generatedAt: new Date().toISOString(),
    version: REPORT_VERSION,
    status: blockers.length === 0 ? 'passed' : 'blocked',
    doesNotModifyDataFile: true,
    doesNotRunGitAdd: true,
    writesOnlyReports: true,
    requiresCompleteTargetSet: requireComplete,
    sourceReports: {
      prScopeGuard: {
        path: 'reports/stadium/sajik-seatmap-pr-scope-guard.json',
        actualPath: path.relative(frontendRoot, sourceReportPath),
        exists: sourceReportExists,
        executionMode: sourceReport?.executionMode ?? null,
        stage01PartialScopeStatus: sourceReport?.stage01PartialScopeStatus ?? null,
        stage01PartialStagingVerdict: sourceReport?.stagingManifest?.stage01PartialStagingVerdict ?? null,
        generatedAt: sourceReport?.generatedAt ?? null,
      },
    },
    summary: {
      expectedStage01PartialTargetFileCount: EXPECTED_STAGE01_PARTIAL_TARGET_FILE_COUNT,
      requiresCompleteTargetSet: requireComplete,
      targetFileCount: targetFiles.length,
      stagedFileCount: stagedRows.length,
      stagedTargetFileCount: stagedTargetFileSet.size,
      missingStagedTargetFileCount: missingStagedTargetFiles.length,
      stagedOutsideTargetFileCount: stagedOutsideTargets.length,
      stagedSeparateDirtyWorkFileCount: stagedSeparateDirtyWork.length,
      stagedUnexpectedDirtyFileCount: stagedUnexpectedDirtyFiles.length,
      stagedFilesToKeepCount: stagedTargetFilesToKeep.length,
      stagedFilesToUnstageCount: stagedFilesToUnstage.length,
      manualHunkReviewFileCount: unique([...hunkReviewFileSet]).length,
      stagedManualHunkReviewFileCount: stagedRows.filter((entry) => entry.requiresManualHunkReview).length,
      blockerCount: blockers.length,
    },
    stagedScopeGate: {
      status: blockers.length === 0 ? 'passed' : 'blocked',
      stagedState: stagedRows.length === 0 ? 'no-staged-files' : 'staged-files-present',
      requiresCompleteTargetSet: requireComplete,
      readyForCommit: requireComplete
        ? blockers.length === 0 && missingStagedTargetFiles.length === 0 && stagedTargetFileSet.size === targetFiles.length
        : blockers.length === 0 && stagedRows.length > 0,
      acceptsOnlyStage01TargetFiles: true,
      blocksSeparateDirtyWork: true,
      blocksUnexpectedDirtyFiles: true,
      safeToRunBulkGitAdd: false,
      recommendedCommandKind: 'audit-cached-index-only',
      fixtureMode: Boolean(stagedEntriesPath),
      forbiddenCommands,
      currentContract: 'Report only. It inspects git diff --cached and fails if staged files are outside the current Sajik Stage 01 partial target file list or include separated workstream files.',
    },
    targetFiles,
    stagedRows,
    stagingRemediation: {
      actionMode: 'operator-manual-index-cleanup',
      doesNotRunGitCommands: true,
      stagedFilesToKeep: stagedTargetFilesToKeep,
      stagedFilesToUnstage,
      stagedFilesToUnstageWithReasons,
      stagedManualHunkReviewFiles,
      missingTargetFilesForCompleteMode: requireComplete ? missingStagedTargetFiles : [],
      nextActions,
    },
    missingStagedTargetFiles,
    stagedOutsideTargets,
    stagedSeparateDirtyWork,
    stagedUnexpectedDirtyFiles,
    sourcePolicy,
    blockers,
  };

  const csvRows = [
    ['order', 'file', 'status', 'from', 'inStage01TargetFiles', 'requiresManualHunkReview', 'isSeparateDirtyWork', 'isUnexpectedDirtyFile', 'remediationAction', 'remediationReasons'],
    ...stagedRows.map((entry) => [
      entry.order,
      entry.file,
      entry.status,
      entry.from ?? '',
      entry.inStage01TargetFiles,
      entry.requiresManualHunkReview,
      entry.isSeparateDirtyWork,
      entry.isUnexpectedDirtyFile,
      stagedFilesToUnstage.includes(entry.file) ? 'UNSTAGE' : 'KEEP',
      remediationReasonsForEntry(entry).join(';'),
    ]),
  ];

  const markdown = [
    '# 사직 Stage 01 staged scope audit',
    '',
    `- version: \`${REPORT_VERSION}\``,
    `- status: \`${report.status}\``,
    `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
    `- runs git add: \`${!report.doesNotRunGitAdd}\``,
    `- writes only reports: \`${report.writesOnlyReports}\``,
    '- source scope guard report: `reports/stadium/sajik-seatmap-pr-scope-guard.json`',
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      Object.entries(report.summary).map(([key, value]) => [key, `\`${value}\``]),
    ),
    '',
    '## Staged Scope Gate',
    '',
    `- stagedScopeAudit.status=${report.status}`,
    `- stagedScopeAudit.requireComplete=${requireComplete}`,
    '- stagedScopeAudit.doesNotRunGitAdd=true',
    '- stagedScopeAudit.safeToRunBulkGitAdd=false',
    '- stagedScopeAudit.acceptsOnlyStage01TargetFiles=true',
    '- stagedScopeAudit.blocksSeparateDirtyWork=true',
    '- stagedScopeAudit.blocksUnexpectedDirtyFiles=true',
    `- stagedScopeAudit.expectedStage01PartialTargetFileCount=${EXPECTED_STAGE01_PARTIAL_TARGET_FILE_COUNT}`,
    `- stagedScopeAudit.missingStagedTargetFileCount=${missingStagedTargetFiles.length}`,
    '- stagedScopeAudit.stagedOutsideTargetFileCount=0',
    '- stagedScopeAudit.stagedSeparateDirtyWorkFileCount=0',
    '- Strict commit-readiness mode: `--require-complete` blocks with `STAGED_TARGET_FILE_MISSING` until every Stage 01 partial target file is staged.',
    '- Command kind: `audit-cached-index-only`',
    `- Fixture mode: \`${Boolean(stagedEntriesPath)}\``,
    '- Do not use `git add .`, `git add -A`, or `git commit -am` for this partial PR.',
    '',
    '## Staging Remediation',
    '',
    `- actionMode: \`${report.stagingRemediation.actionMode}\``,
    '- doesNotRunGitCommands: `true`',
    '- staged files to keep:',
    stagedTargetFilesToKeep.length > 0
      ? stagedTargetFilesToKeep.map((file) => `  - \`${file}\``).join('\n')
      : '  - none',
    '- staged files to unstage:',
    stagedFilesToUnstage.length > 0
      ? stagedFilesToUnstage.map((file) => `  - \`${file}\``).join('\n')
      : '  - none',
    '- staged files to unstage with reasons:',
    stagedFilesToUnstageWithReasons.length > 0
      ? markdownTable(
        ['file', 'status', 'reasons'],
        stagedFilesToUnstageWithReasons.map((entry) => [
          `\`${entry.file}\``,
          `\`${entry.status || '-'}\``,
          entry.reasons.map((reason) => `\`${reason}\``).join(', '),
        ]),
      )
      : '  - none',
    '- staged manual hunk review files:',
    stagedManualHunkReviewFiles.length > 0
      ? stagedManualHunkReviewFiles.map((file) => `  - \`${file}\``).join('\n')
      : '  - none',
    '- next actions:',
    nextActions.length > 0
      ? nextActions.map((action) => `  - ${action}`).join('\n')
      : '  - none',
    '',
    '## Staged Files',
    '',
    stagedRows.length > 0
      ? markdownTable(
        ['order', 'file', 'status', 'target file', 'manual hunk review', 'separate dirty work'],
        stagedRows.map((entry) => [
          `\`${entry.order}\``,
          `\`${entry.file}\``,
          `\`${entry.status}\``,
          `\`${entry.inStage01TargetFiles}\``,
          `\`${entry.requiresManualHunkReview}\``,
          `\`${entry.isSeparateDirtyWork}\``,
        ]),
      )
      : '- none',
    '',
    '## Missing Staged Target Files',
    '',
    missingStagedTargetFiles.length > 0
      ? missingStagedTargetFiles.map((file) => `- \`${file}\``).join('\n')
      : '- none',
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : '- none',
    '',
    '## Source Policy',
    '',
    '- Allowed coordinate source: official 2026 Sajik PNG plus operator-approved manual polygon-v2 trace only.',
    '- Allowed coordinate system: original official PNG `960x640` / SVG `viewBox="0 0 960 640"`.',
    '- Disallowed: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images.',
    '- Missing or unclear baseball operating data keeps `MANUAL_BASEBALL_DATA_REQUIRED`.',
    '',
  ].join('\n');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(outputPaths.csv, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');
  await fs.writeFile(outputPaths.markdown, markdown, 'utf8');

  console.log(`stage01_staged_scope_audit_json:${outputPaths.json}`);
  console.log(`stage01_staged_scope_audit_csv:${outputPaths.csv}`);
  console.log(`stage01_staged_scope_audit_markdown:${outputPaths.markdown}`);
  console.log(`status:${report.status} staged=${stagedRows.length} targets=${targetFiles.length} outside=${stagedOutsideTargets.length} separate=${stagedSeparateDirtyWork.length} blockers=${blockers.length} requireComplete=${requireComplete}`);

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runStage01TargetApplyPrecheck = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultStageDir = path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator');
  const defaultTargetDir = path.join(defaultStageDir, 'targets');

  const PRECHECK_VERSION = 'SAJIK_STAGE01_TARGET_APPLY_PRECHECK_V1';
  const TARGET_SECTION_ID = '131';
  const DEFAULT_TARGET_ENTRY_PREFLIGHT_JSON_FILE = '131-entry-preflight.json';
  const DEFAULT_TARGET_APPROVAL_GATE_JSON_FILE = '131-approval-gate.json';
  const DEFAULT_TARGET_APPLY_PRECHECK_JSON_FILE = '131-apply-precheck.json';
  const DEFAULT_TARGET_APPLY_PRECHECK_MARKDOWN_FILE = '131-apply-precheck.md';
  const DEFAULT_STATUS_CONTRACT_EXAMPLE = 'status:${summary.status} target=${TARGET_SECTION_ID}';
  const TARGET_SOURCE_FILE = 'src/data/sajikSeatData.ts';
  const REQUIRED_APPROVAL_GATE_VERSION = 'SAJIK_STAGE01_TARGET_APPROVAL_GATE_V1';
  const REQUIRED_TARGET_ENTRY_PREFLIGHT_VERSION = 'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_V1';
  const REQUIRED_PREWRITE_VERSION = 'SAJIK_STAGE01_PREWRITE_V1';
  const REQUIRED_APPLY_READY_VERSION = 'SAJIK_STAGE01_APPLY_READY_V1';
  const REQUIRED_POST_APPLY_VERSION = 'SAJIK_STAGE01_POST_APPLY_AUDIT_V1';
  const REQUIRED_OPERATOR_STATUS_VERSION = 'SAJIK_STAGE01_OPERATOR_STATUS_V1';
  const REQUIRED_MANUAL_PATCH_PLAN_VERSION = 'SAJIK_STAGE01_MANUAL_PATCH_PLAN_V1';
  const REQUIRED_REAL_APPROVAL_READINESS_VERSION = 'SAJIK_STAGE01_REAL_APPROVAL_READINESS_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const STAGE01_IMAGE_PRIORITY_SECTION_IDS = [
    '131',
    '032',
    '135',
    '132',
    '031',
    '133',
    '022',
    '143',
    '134',
    '142',
    '121',
    '124',
    '125',
    '122',
    '021',
    '123',
  ];
  const WRITABLE_SOURCE_FIELDS = [
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.labelX',
    'imageGeometry.labelY',
  ];
  const LOCKED_SOURCE_FIELDS = [
    'imageGeometry.visualPath',
    'imageGeometry.geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
  ];
  const LOCKED_FRAGMENT_TOKENS = [
    'visualPath',
    'geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const sameStringArray = (actual, expected) => (
    Array.isArray(actual)
    && actual.length === expected.length
    && expected.every((value, index) => actual[index] === value)
  );

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);

  const reportStatus = (report) => report?.summary?.status ?? report?.status ?? 'missing';

  const reportVersion = (report, fieldName) => report?.summary?.[fieldName] ?? report?.[fieldName];

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const pushVersionBlocker = (blockers, label, actual, expected) => {
    if (actual !== expected) {
      blockers.push(`${label}_VERSION_MISMATCH:${actual ?? ''}:${expected}`);
    }
  };

  const pushStageBlocker = (blockers, label, actual) => {
    if (actual !== TARGET_STAGE_LABEL) {
      blockers.push(`${label}_STAGE_MISMATCH:${actual ?? ''}`);
    }
  };

  const pushFalseFlagBlocker = (blockers, label, flagName, actual) => {
    if (actual !== false) {
      blockers.push(`${label}_${flagName}_MUST_BE_FALSE`);
    }
  };

  const sourceFlagValues = (reports) => ({
    sourceDataWritePerformed: reports.every((report) => report?.summary?.sourceDataWritePerformed !== true),
    productionWriteAllowed: reports.every((report) => report?.summary?.productionWriteAllowed !== true),
    productionDataChanged: reports.every((report) => report?.summary?.productionDataChanged !== true),
    writesOperatorInput: reports.every((report) => report?.summary?.writesOperatorInput !== true),
    writesProductionData: reports.every((report) => report?.summary?.writesProductionData !== true),
  });

  const stageDir = path.resolve(frontendRoot, argValue('--stage-dir', defaultStageDir));
  const targetDir = path.resolve(frontendRoot, argValue('--target-dir', path.join(stageDir, 'targets')));
  const targetSectionId = String(argValue('--target', argValue('--section', TARGET_SECTION_ID))).trim();
  const defaultTargetFile = (defaultFile, suffix) => (
    targetSectionId === TARGET_SECTION_ID ? defaultFile : `${targetSectionId}-${suffix}`
  );
  const targetEntryPreflightPath = path.resolve(frontendRoot, argValue('--target-entry-preflight', path.join(targetDir, defaultTargetFile(DEFAULT_TARGET_ENTRY_PREFLIGHT_JSON_FILE, 'entry-preflight.json'))));
  const targetApprovalGatePath = path.resolve(frontendRoot, argValue('--target-approval-gate', path.join(targetDir, defaultTargetFile(DEFAULT_TARGET_APPROVAL_GATE_JSON_FILE, 'approval-gate.json'))));
  const prewritePath = path.resolve(frontendRoot, argValue('--prewrite', path.join(stageDir, 'sajik-seatmap-stage01-prewrite.json')));
  const applyReadyPath = path.resolve(frontendRoot, argValue('--apply-ready', path.join(stageDir, 'sajik-seatmap-stage01-apply-ready.json')));
  const postApplyPath = path.resolve(frontendRoot, argValue('--post-apply', path.join(stageDir, 'sajik-seatmap-stage01-post-apply-audit.json')));
  const operatorStatusPath = path.resolve(frontendRoot, argValue('--operator-status', path.join(stageDir, 'sajik-seatmap-stage01-operator-status.json')));
  const manualPatchPlanPath = path.resolve(frontendRoot, argValue('--manual-patch-plan', path.join(stageDir, 'sajik-seatmap-stage01-manual-patch-plan.json')));
  const realApprovalReadinessPath = path.resolve(frontendRoot, argValue('--real-approval-readiness', path.join(stageDir, 'sajik-seatmap-stage01-real-approval-readiness.json')));
  const jsonPath = path.join(targetDir, defaultTargetFile(DEFAULT_TARGET_APPLY_PRECHECK_JSON_FILE, 'apply-precheck.json'));
  const markdownPath = path.join(targetDir, defaultTargetFile(DEFAULT_TARGET_APPLY_PRECHECK_MARKDOWN_FILE, 'apply-precheck.md'));

  const targetEntryPreflight = await readJson(targetEntryPreflightPath);
  const targetApprovalGate = await readJson(targetApprovalGatePath);
  const prewrite = await readJson(prewritePath);
  const applyReady = await readJson(applyReadyPath);
  const postApply = await readJson(postApplyPath);
  const operatorStatus = await readJson(operatorStatusPath);
  const manualPatchPlan = await readJson(manualPatchPlanPath);
  const realApprovalReadiness = await readJson(realApprovalReadinessPath);

  const blockers = [];
  const warnings = [];

  if (!STAGE01_IMAGE_PRIORITY_SECTION_IDS.includes(targetSectionId)) {
    blockers.push(`TARGET_NOT_IN_STAGE01_P0_SCOPE:${targetSectionId}`);
  }

  pushVersionBlocker(blockers, 'TARGET_ENTRY_PREFLIGHT', reportVersion(targetEntryPreflight, 'preflightVersion'), REQUIRED_TARGET_ENTRY_PREFLIGHT_VERSION);
  pushVersionBlocker(blockers, 'TARGET_APPROVAL_GATE', reportVersion(targetApprovalGate, 'gateVersion'), REQUIRED_APPROVAL_GATE_VERSION);
  pushVersionBlocker(blockers, 'PREWRITE', reportVersion(prewrite, 'prewriteVersion'), REQUIRED_PREWRITE_VERSION);
  pushVersionBlocker(blockers, 'APPLY_READY', reportVersion(applyReady, 'applyReadyVersion'), REQUIRED_APPLY_READY_VERSION);
  pushVersionBlocker(blockers, 'POST_APPLY', reportVersion(postApply, 'postApplyAuditVersion'), REQUIRED_POST_APPLY_VERSION);
  pushVersionBlocker(blockers, 'OPERATOR_STATUS', reportVersion(operatorStatus, 'operatorStatusVersion'), REQUIRED_OPERATOR_STATUS_VERSION);
  pushVersionBlocker(blockers, 'MANUAL_PATCH_PLAN', reportVersion(manualPatchPlan, 'manualPatchPlanVersion'), REQUIRED_MANUAL_PATCH_PLAN_VERSION);
  pushVersionBlocker(blockers, 'REAL_APPROVAL_READINESS', reportVersion(realApprovalReadiness, 'realApprovalReadinessVersion'), REQUIRED_REAL_APPROVAL_READINESS_VERSION);

  pushStageBlocker(blockers, 'TARGET_ENTRY_PREFLIGHT', targetEntryPreflight.summary?.targetStage);
  pushStageBlocker(blockers, 'TARGET_APPROVAL_GATE', targetApprovalGate.summary?.targetStage);
  pushStageBlocker(blockers, 'PREWRITE', prewrite.summary?.targetStage);
  pushStageBlocker(blockers, 'APPLY_READY', applyReady.summary?.targetStage);
  pushStageBlocker(blockers, 'POST_APPLY', postApply.summary?.targetStage);
  pushStageBlocker(blockers, 'OPERATOR_STATUS', operatorStatus.summary?.targetStage);
  pushStageBlocker(blockers, 'MANUAL_PATCH_PLAN', manualPatchPlan.summary?.targetStage);
  pushStageBlocker(blockers, 'REAL_APPROVAL_READINESS', realApprovalReadiness.summary?.targetStage);

  if (targetEntryPreflight.summary?.targetSectionId !== targetSectionId) {
    blockers.push(`TARGET_ENTRY_PREFLIGHT_SECTION_MISMATCH:${targetEntryPreflight.summary?.targetSectionId ?? ''}`);
  }
  if (targetApprovalGate.summary?.targetSectionId !== targetSectionId) {
    blockers.push(`TARGET_APPROVAL_GATE_SECTION_MISMATCH:${targetApprovalGate.summary?.targetSectionId ?? ''}`);
  }
  if (manualPatchPlan.summary?.targetSourceFile !== TARGET_SOURCE_FILE) {
    blockers.push(`MANUAL_PATCH_TARGET_SOURCE_FILE_MISMATCH:${manualPatchPlan.summary?.targetSourceFile ?? ''}`);
  }
  if (realApprovalReadiness.summary?.targetSourceFile !== TARGET_SOURCE_FILE) {
    blockers.push(`READINESS_TARGET_SOURCE_FILE_MISMATCH:${realApprovalReadiness.summary?.targetSourceFile ?? ''}`);
  }

  [
    ['TARGET_ENTRY_PREFLIGHT', targetEntryPreflight],
    ['TARGET_APPROVAL_GATE', targetApprovalGate],
    ['PREWRITE', prewrite],
    ['APPLY_READY', applyReady],
    ['POST_APPLY', postApply],
    ['OPERATOR_STATUS', operatorStatus],
    ['MANUAL_PATCH_PLAN', manualPatchPlan],
    ['REAL_APPROVAL_READINESS', realApprovalReadiness],
  ].forEach(([label, report]) => {
    if ('sourceDataWritePerformed' in (report.summary ?? {})) {
      pushFalseFlagBlocker(blockers, label, 'SOURCE_DATA_WRITE_PERFORMED', report.summary.sourceDataWritePerformed);
    }
    if ('productionWriteAllowed' in (report.summary ?? {})) {
      pushFalseFlagBlocker(blockers, label, 'PRODUCTION_WRITE_ALLOWED', report.summary.productionWriteAllowed);
    }
    if ('productionDataChanged' in (report.summary ?? {})) {
      pushFalseFlagBlocker(blockers, label, 'PRODUCTION_DATA_CHANGED', report.summary.productionDataChanged);
    }
    if ('writesOperatorInput' in (report.summary ?? {})) {
      pushFalseFlagBlocker(blockers, label, 'WRITES_OPERATOR_INPUT', report.summary.writesOperatorInput);
    }
    if ('writesProductionData' in (report.summary ?? {})) {
      pushFalseFlagBlocker(blockers, label, 'WRITES_PRODUCTION_DATA', report.summary.writesProductionData);
    }
  });

  if (postApply.summary?.readOnly !== true) {
    blockers.push('POST_APPLY_MUST_BE_READ_ONLY');
  }
  if (!sameStringArray(manualPatchPlan.summary?.writableSourceFields, WRITABLE_SOURCE_FIELDS)) {
    blockers.push('MANUAL_PATCH_WRITABLE_SOURCE_FIELDS_MISMATCH');
  }
  if (!sameStringArray(manualPatchPlan.summary?.lockedSourceFields, LOCKED_SOURCE_FIELDS)) {
    blockers.push('MANUAL_PATCH_LOCKED_SOURCE_FIELDS_MISMATCH');
  }
  if (!sameStringArray(realApprovalReadiness.summary?.safetyContract?.writableSourceFields, WRITABLE_SOURCE_FIELDS)) {
    blockers.push('READINESS_WRITABLE_SOURCE_FIELDS_MISMATCH');
  }
  if (!sameStringArray(realApprovalReadiness.summary?.safetyContract?.lockedSourceFields, LOCKED_SOURCE_FIELDS)) {
    blockers.push('READINESS_LOCKED_SOURCE_FIELDS_MISMATCH');
  }

  const prewriteRows = Array.isArray(prewrite.rows) ? prewrite.rows : [];
  const applyReadyRows = Array.isArray(applyReady.rows) ? applyReady.rows : [];
  const postApplyRows = Array.isArray(postApply.rows) ? postApply.rows : [];
  const operatorStatusRows = Array.isArray(operatorStatus.rows) ? operatorStatus.rows : [];
  const manualPatchRows = Array.isArray(manualPatchPlan.rows) ? manualPatchPlan.rows : [];
  const readinessRows = Array.isArray(realApprovalReadiness.rows) ? realApprovalReadiness.rows : [];
  const patchPayloads = Array.isArray(prewrite.patchPayloads) ? prewrite.patchPayloads : [];

  const prewriteRow = prewriteRows.find((row) => row.sectionId === targetSectionId);
  const applyReadyRow = applyReadyRows.find((row) => row.sectionId === targetSectionId);
  const postApplyRow = postApplyRows.find((row) => row.sectionId === targetSectionId);
  const operatorStatusRow = operatorStatusRows.find((row) => row.sectionId === targetSectionId);
  const manualPatchRow = manualPatchRows.find((row) => row.sectionId === targetSectionId);
  const readinessRow = readinessRows.find((row) => row.sectionId === targetSectionId);
  const patchPayload = patchPayloads.find((payload) => payload.sectionId === targetSectionId);
  const decision = normalizeDecision(targetApprovalGate.summary?.selectedDecision ?? targetEntryPreflight.summary?.selectedDecision);
  const approvalReady = targetApprovalGate.summary?.readyForPrewrite === true;
  const manualPatchRequired = manualPatchRow?.action === 'MANUAL_PATCH_REQUIRED';
  const targetApplied = operatorStatusRow?.rowStatus === 'APPLIED' && readinessRow?.readinessStatus === 'APPROVED_APPLIED';
  const targetNotApplied = operatorStatusRow?.rowStatus === 'NOT_APPLIED' && readinessRow?.readinessStatus === 'APPROVED_NOT_APPLIED';

  if (approvalReady && decision !== 'APPROVED') {
    blockers.push(`TARGET_APPROVAL_READY_WITH_NON_APPROVED_DECISION:${decision}`);
  }
  if (approvalReady && !manualPatchRequired && !targetApplied) {
    blockers.push('TARGET_APPROVAL_READY_WITHOUT_MANUAL_PATCH_ROW');
  }
  if (manualPatchRequired && !targetNotApplied) {
    blockers.push(`TARGET_MANUAL_PATCH_ROW_STATUS_MISMATCH:${operatorStatusRow?.rowStatus ?? ''}:${readinessRow?.readinessStatus ?? ''}`);
  }
  if (manualPatchRequired && !patchPayload) {
    blockers.push('TARGET_PATCH_PAYLOAD_MISSING');
  }
  if (manualPatchRequired && manualPatchRow.targetSourceFile !== TARGET_SOURCE_FILE) {
    blockers.push(`TARGET_MANUAL_PATCH_SOURCE_FILE_MISMATCH:${manualPatchRow.targetSourceFile ?? ''}`);
  }
  if (manualPatchRequired && manualPatchRow.visualPathLocked !== true) {
    blockers.push('TARGET_MANUAL_PATCH_VISUAL_PATH_NOT_LOCKED');
  }
  if (manualPatchRequired && !sameStringArray(manualPatchRow.writableSourceFields, WRITABLE_SOURCE_FIELDS)) {
    blockers.push('TARGET_MANUAL_PATCH_WRITABLE_FIELDS_MISMATCH');
  }
  if (manualPatchRequired && !sameStringArray(manualPatchRow.lockedSourceFields, LOCKED_SOURCE_FIELDS)) {
    blockers.push('TARGET_MANUAL_PATCH_LOCKED_FIELDS_MISMATCH');
  }
  if (manualPatchRequired && typeof manualPatchRow.writableTsFragment === 'string') {
    const fragment = manualPatchRow.writableTsFragment;
    ['hitPath:', 'labelPoint:', 'labelX:', 'labelY:'].forEach((token) => {
      if (!fragment.includes(token)) {
        blockers.push(`TARGET_WRITABLE_FRAGMENT_MISSING:${token}`);
      }
    });
    LOCKED_FRAGMENT_TOKENS.forEach((token) => {
      if (fragment.includes(token)) {
        blockers.push(`TARGET_WRITABLE_FRAGMENT_CONTAINS_LOCKED_TOKEN:${token}`);
      }
    });
  }
  if (manualPatchRequired && patchPayload?.validation?.status !== 'PASS') {
    blockers.push(`TARGET_PATCH_PAYLOAD_VALIDATION_NOT_PASS:${patchPayload?.validation?.status ?? ''}`);
  }
  if (manualPatchRequired && patchPayload?.before?.visualPath !== patchPayload?.after?.visualPath) {
    blockers.push('TARGET_PATCH_PAYLOAD_VISUAL_PATH_CHANGED');
  }

  if (!approvalReady) {
    if (manualPatchRequired || patchPayload) {
      blockers.push('TARGET_NOT_APPROVED_HAS_PATCH_PREVIEW');
    }
    if (manualPatchPlan.summary?.manualPatchRows !== 0) {
      warnings.push(`NON_TARGET_MANUAL_PATCH_ROWS_PRESENT:${manualPatchPlan.summary.manualPatchRows}`);
    }
  }
  if (!approvalReady && decision === 'PENDING') {
    warnings.push('TARGET_WAITING_FOR_OPERATOR_APPROVAL');
  }

  const status = blockers.length > 0
    ? 'blocked'
    : targetApplied
      ? 'applied'
      : manualPatchRequired && targetNotApplied
        ? 'ready-for-manual-apply'
        : 'waiting-for-operator';

  const sourceFlags = sourceFlagValues([
    targetEntryPreflight,
    targetApprovalGate,
    prewrite,
    applyReady,
    postApply,
    operatorStatus,
    manualPatchPlan,
    realApprovalReadiness,
  ]);

  const summary = {
    targetApplyPrecheckVersion: PRECHECK_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    targetSectionId,
    targetStage: TARGET_STAGE_LABEL,
    targetSourceFile: TARGET_SOURCE_FILE,
    targetEntryPreflight: relativePath(targetEntryPreflightPath),
    targetApprovalGate: relativePath(targetApprovalGatePath),
    prewrite: relativePath(prewritePath),
    applyReady: relativePath(applyReadyPath),
    postApply: relativePath(postApplyPath),
    operatorStatus: relativePath(operatorStatusPath),
    manualPatchPlan: relativePath(manualPatchPlanPath),
    realApprovalReadiness: relativePath(realApprovalReadinessPath),
    selectedDecision: decision,
    selectedSource: targetApprovalGate.summary?.selectedSource ?? targetEntryPreflight.summary?.selectedSource ?? 'none',
    readyForPrewrite: approvalReady,
    manualPatchRequired,
    targetApplied,
    sourceDataWritePerformed: false,
    productionWriteAllowed: false,
    productionDataChanged: false,
    writesOperatorInput: false,
    writesProductionData: false,
    writableSourceFields: WRITABLE_SOURCE_FIELDS,
    lockedSourceFields: LOCKED_SOURCE_FIELDS,
    blockers,
    warnings,
  };

  const row = {
    sectionId: targetSectionId,
    decision,
    targetEntryPreflightStatus: reportStatus(targetEntryPreflight),
    targetEntryPreflightReadyForApprovalGate: targetEntryPreflight.summary?.readyForApprovalGate === true,
    targetApprovalGateStatus: reportStatus(targetApprovalGate),
    readyForPrewrite: approvalReady,
    prewriteStatus: reportStatus(prewrite),
    prewriteRowValidForPatchPreview: prewriteRow?.validForPatchPreview === true,
    applyReadyStatus: reportStatus(applyReady),
    postApplyStatus: postApplyRow ? (postApplyRow.applied ? 'applied' : 'not-applied') : reportStatus(postApply),
    operatorStatusRow: operatorStatusRow?.rowStatus ?? 'missing',
    manualPatchAction: manualPatchRow?.action ?? 'WAIT_FOR_OPERATOR',
    readinessStatus: readinessRow?.readinessStatus ?? 'missing',
    manualPatchRequired,
    targetApplied,
    visualPathLocked: manualPatchRow?.visualPathLocked ?? null,
    hitPathChanged: manualPatchRow?.diffSummary?.hitPathChanged ?? null,
    labelPointChanged: manualPatchRow?.diffSummary?.labelPointChanged ?? null,
    beforeFingerprint: manualPatchRow?.beforeFingerprint ?? '',
    approvedFingerprint: manualPatchRow?.approvedFingerprint ?? '',
    lockedFieldFingerprint: manualPatchRow?.lockedFieldFingerprint ?? '',
    writableTsFragment: manualPatchRow?.writableTsFragment ?? '',
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    sourcePolicy: {
      allowedCoordinateSource: 'operator-provided official 2026 Sajik PNG coordinates only',
      coordinateSystem: 'SVG viewBox 0 0 960 640',
      targetSourceFile: TARGET_SOURCE_FILE,
      manualPatchOnly: true,
      noAutomaticSourceWrite: true,
      missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      disallowedSources: [
        'AI coordinate prediction',
        'browser CSS pixels',
        'resized screenshots',
        'external crawling',
        'web-search-based baseball data',
        'third-party copied seatmap images',
      ],
    },
    sourceFieldContract: {
      writableSourceFields: WRITABLE_SOURCE_FIELDS,
      lockedSourceFields: LOCKED_SOURCE_FIELDS,
      lockedFragmentTokens: LOCKED_FRAGMENT_TOKENS,
      manualPatchAllowedOnlyAfter: [
        'targetApprovalGate.readyForPrewrite=true',
        'manualPatchPlan row action=MANUAL_PATCH_REQUIRED',
        'operatorStatus rowStatus=NOT_APPLIED',
        'realApprovalReadiness readinessStatus=APPROVED_NOT_APPLIED',
      ],
    },
    safetyContract: {
      ...sourceFlags,
      sourceDataWritePerformed: false,
      productionWriteAllowed: false,
      productionDataChanged: false,
      writesOperatorInput: false,
      writesProductionData: false,
    },
    row,
  };

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const lines = [
    '# Sajik Stage 01 Target Apply Precheck',
    '',
    `- precheck version: \`${PRECHECK_VERSION}\``,
    `- target section: \`${targetSectionId}\``,
    `- status: \`${summary.status}\``,
    `- selected decision: \`${summary.selectedDecision}\``,
    `- selected source: \`${summary.selectedSource}\``,
    `- ready for prewrite: \`${summary.readyForPrewrite}\``,
    `- manual patch required: \`${summary.manualPatchRequired}\``,
    `- target applied: \`${summary.targetApplied}\``,
    `- source data write performed: \`${summary.sourceDataWritePerformed}\``,
    `- writes operator input: \`${summary.writesOperatorInput}\``,
    `- writes production data: \`${summary.writesProductionData}\``,
    '',
    '## Target Row',
    '',
    markdownTable(
      ['section', 'decision', 'approval', 'prewrite', 'apply', 'operator status', 'manual action', 'readiness'],
      [[
        `\`${row.sectionId}\``,
        `\`${row.decision}\``,
        `\`${row.targetApprovalGateStatus}\``,
        `\`${row.prewriteStatus}\``,
        `\`${row.applyReadyStatus}\``,
        `\`${row.operatorStatusRow}\``,
        `\`${row.manualPatchAction}\``,
        `\`${row.readinessStatus}\``,
      ]],
    ),
    '',
    '## Source Field Contract',
    '',
    `- writable source fields: \`${WRITABLE_SOURCE_FIELDS.join('`, `')}\``,
    `- locked source fields: \`${LOCKED_SOURCE_FIELDS.join('`, `')}\``,
    '- manual patch is allowed only after `targetApprovalGate.readyForPrewrite=true`, `MANUAL_PATCH_REQUIRED`, `NOT_APPLIED`, and `APPROVED_NOT_APPLIED` all match.',
    '- this precheck never edits `src/data/sajikSeatData.ts` or operator input files.',
    '',
    '## Reports',
    '',
    `- target entry preflight: \`${summary.targetEntryPreflight}\``,
    `- target approval gate: \`${summary.targetApprovalGate}\``,
    `- manual patch plan: \`${summary.manualPatchPlan}\``,
    `- real approval readiness: \`${summary.realApprovalReadiness}\``,
  ];

  if (row.writableTsFragment) {
    lines.push('', '## Writable Fragment', '', '```ts', row.writableTsFragment, '```');
  }
  if (blockers.length > 0) {
    lines.push('', '## Blockers', '', ...blockers.map((blocker) => `- \`${blocker}\``));
  }
  if (warnings.length > 0) {
    lines.push('', '## Warnings', '', ...warnings.map((warning) => `- \`${warning}\``));
  }

  await fs.writeFile(markdownPath, `${lines.join('\n')}\n`, 'utf8');

  console.log(`stage01_target_apply_precheck_json:${relativePath(jsonPath)}`);
  console.log(`stage01_target_apply_precheck_markdown:${relativePath(markdownPath)}`);
  console.log(`status:${summary.status} target=${targetSectionId} decision=${summary.selectedDecision} readyForPrewrite=${summary.readyForPrewrite} manualPatchRequired=${summary.manualPatchRequired} targetApplied=${summary.targetApplied} sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`);

  if (status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01TargetApprovalGateSmoke = async () => {
  const { spawnSync } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const SMOKE_VERSION = 'SAJIK_STAGE01_TARGET_APPROVAL_GATE_SMOKE_V1';
  const GATE_SCRIPT = 'scripts/sajik-seatmap-stage01.mjs';
  const PREWRITE_SCRIPT = 'scripts/sajik-seatmap-stage01.mjs';
  const TARGET_ENTRY_PREFLIGHT_VERSION = 'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_V1';
  const TARGET_REVIEW_PACKET_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1';
  const TARGET_REVIEW_EVIDENCE_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1';
  const OPERATOR_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const TARGET_SECTION_ID = '131';
  const TARGET_SOURCE_FILE = 'src/data/sajikSeatData.ts';
  const OFFICIAL_IMAGE_SHA256 = 'e9cb51ccf57a754ddf066a95c6c789d65edf8dff167f432fd35fe809e9dc80aa';
  const MAP_VERSION = 'BUSAN_SAJIK_2026_MANUAL_POLYGON_V2';
  const EXPECTED_WRITABLE_SOURCE_FIELDS = [
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.labelX',
    'imageGeometry.labelY',
  ];
  const EXPECTED_STAGE01_SECTION_IDS = [
    '021',
    '022',
    '031',
    '032',
    '121',
    '122',
    '123',
    '124',
    '125',
    '131',
    '132',
    '133',
    '134',
    '135',
    '142',
    '143',
  ];
  const CURRENT_HIT_PATH = 'M 666 484 L 694 483 L 703 484 L 704 491 L 700 493 L 674 493 L 666 491 Z';
  const CURRENT_LABEL_POINT = [683, 489];
  const SELF_INTERSECTING_PATH = 'M 666 484 L 704 493 L 666 493 L 704 484 Z';
  const SAFETY_CONTRACT_LINES = [
    'sourceDataWritePerformed=false',
    'writesOperatorInput=false',
    'writesProductionData=false',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const stageDir = path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator');
  const smokeRoot = path.join(stageDir, 'target-approval-smoke', `run-${Date.now()}-${process.pid}`);
  const smokeJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-target-approval-gate-smoke.json');
  const smokeMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-target-approval-gate-smoke.md');

  function formatRelative(filePath) {
    return path.relative(frontendRoot, filePath);
  }

  async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  }

  async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  function buildTargetReviewPacket(generatedAt = new Date().toISOString()) {
    return {
      generatedAt,
      summary: {
        packetVersion: TARGET_REVIEW_PACKET_VERSION,
        evidenceVersion: TARGET_REVIEW_EVIDENCE_VERSION,
        status: 'waiting-for-operator',
        targetStage: TARGET_STAGE_LABEL,
        targetSectionId: TARGET_SECTION_ID,
        officialImageSha256: OFFICIAL_IMAGE_SHA256,
        mapVersion: MAP_VERSION,
        matchesNextOperatorSection: true,
        nextOperatorSectionId: TARGET_SECTION_ID,
        targetImagePriorityRank: 1,
        targetImageRiskLevel: 'HIGH',
        targetImageRiskReasons: [
          'SMALL_OFFICIAL_PIXEL_COMPONENT',
          'LOW_PATH_COLOR_COVERAGE',
        ],
        targetImageBbox: '682,485,684,490',
        productionWriteAllowed: false,
        sourceDataWritePerformed: false,
        writesOperatorInput: false,
        writesProductionData: false,
        blockers: [],
        warnings: [],
      },
      officialPngEvidence: {
        evidenceVersion: TARGET_REVIEW_EVIDENCE_VERSION,
        targetSectionId: TARGET_SECTION_ID,
        officialImageSha256: OFFICIAL_IMAGE_SHA256,
        mapVersion: MAP_VERSION,
        coordinateSystem: 'SVG viewBox 0 0 960 640',
        viewBox: '0 0 960 640',
        targetViewport: {
          minX: 615,
          minY: 433,
          width: 140,
          height: 110,
          viewBox: '615 433 140 110',
        },
        pixelComponentReference: {
          candidateReferenceOnly: true,
        },
        requiredReviewAssertions: [
          'Opened the target review overlay SVG with the official PNG background visible.',
        ],
        cannotAutoApproveReasons: [
          'targetImageRiskLevel is HIGH.',
        ],
        sourceFieldPolicy: {
          targetSourceFile: TARGET_SOURCE_FILE,
          writableSourceFields: EXPECTED_WRITABLE_SOURCE_FIELDS,
          lockedSourceFields: [
            'imageGeometry.visualPath',
            'imageGeometry.geometryVersion',
          ],
          productionWriteAllowed: false,
          sourceDataWritePerformed: false,
        },
      },
      target: {
        sectionId: TARGET_SECTION_ID,
        sectionName: '네이버 클립존 (응원탁자석) 131블록',
        currentHitPath: CURRENT_HIT_PATH,
        currentVisualPath: CURRENT_HIT_PATH,
        currentLabelPoint: CURRENT_LABEL_POINT,
      },
    };
  }

  function buildPendingEntry() {
    return {
      sectionId: TARGET_SECTION_ID,
      operatorDecision: 'PENDING',
      correctedPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      reviewer: '',
      reviewedAt: '',
      operatorNote: '',
    };
  }

  function buildApprovedEntry(overrides = {}) {
    return {
      sectionId: TARGET_SECTION_ID,
      operatorDecision: 'APPROVED',
      correctedPath: CURRENT_HIT_PATH,
      correctedLabelX: CURRENT_LABEL_POINT[0],
      correctedLabelY: CURRENT_LABEL_POINT[1],
      reviewer: 'operator-smoke',
      reviewedAt: '2026-05-16T00:00:00.000Z',
      operatorNote: 'approved from official PNG operator review',
      ...overrides,
    };
  }

  function hasEditableApprovalValue(entry) {
    return entry.operatorDecision !== 'PENDING'
      || Boolean(entry.correctedPath)
      || entry.correctedLabelX !== ''
      || entry.correctedLabelY !== ''
      || Boolean(entry.reviewer)
      || Boolean(entry.reviewedAt)
      || Boolean(entry.operatorNote);
  }

  function approvalFingerprint(entry) {
    return JSON.stringify({
      sectionId: entry.sectionId,
      operatorDecision: entry.operatorDecision,
      correctedPath: entry.correctedPath,
      correctedLabelX: entry.correctedLabelX === '' ? null : Number(entry.correctedLabelX),
      correctedLabelY: entry.correctedLabelY === '' ? null : Number(entry.correctedLabelY),
      reviewer: entry.reviewer,
      reviewedAt: entry.reviewedAt,
      operatorNote: entry.operatorNote,
    });
  }

  function buildTargetEntryPreflight({ generatedAt, caseDir, operatorEntry, targetEntry }) {
    const sources = [
      ['operator-input', operatorEntry],
      ['target-entry-template', targetEntry],
    ].filter(([, entry]) => hasEditableApprovalValue(entry));
    let selectedSource = 'none';
    let selectedDecision = 'PENDING';
    let readyForApprovalGate = false;
    let status = 'waiting-for-operator';
    const blockers = [];

    if (sources.length === 1) {
      selectedSource = sources[0][0];
      selectedDecision = sources[0][1].operatorDecision;
      readyForApprovalGate = true;
      status = 'ready-for-approval-gate';
    } else if (sources.length > 1) {
      const [firstSource, firstEntry] = sources[0];
      const mismatch = sources.slice(1).some(([, entry]) => approvalFingerprint(entry) !== approvalFingerprint(firstEntry));
      if (mismatch) {
        blockers.push(`TARGET_ENTRY_SOURCE_CONFLICT:${sources.map(([source]) => source).join(':')}`);
        status = 'blocked';
      } else {
        selectedSource = 'matched-sources';
        selectedDecision = firstEntry.operatorDecision;
        readyForApprovalGate = true;
        status = 'ready-for-approval-gate';
      }
    }

    return {
      generatedAt,
      summary: {
        preflightVersion: TARGET_ENTRY_PREFLIGHT_VERSION,
        status,
        generatedAt,
        targetStage: TARGET_STAGE_LABEL,
        targetSectionId: TARGET_SECTION_ID,
        targetReviewPacket: formatRelative(path.join(caseDir, 'targets/131-review-packet.json')),
        targetEntryTemplate: formatRelative(path.join(caseDir, 'targets/131-entry-template.json')),
        operatorInput: formatRelative(path.join(caseDir, 'sajik-seatmap-stage01-operator-input.json')),
        selectedSource,
        selectedDecision,
        readyForApprovalGate,
        productionWriteAllowed: false,
        sourceDataWritePerformed: false,
        writesOperatorInput: false,
        writesProductionData: false,
        blockers,
        warnings: [],
      },
    };
  }

  function buildStage01PrewriteInput(targetEntry = buildApprovedEntry()) {
    return {
      generatedAt: new Date().toISOString(),
      packageVersion: OPERATOR_PACKAGE_VERSION,
      status: 'waiting-for-operator',
      targetStage: TARGET_STAGE_LABEL,
      corrections: EXPECTED_STAGE01_SECTION_IDS.map((sectionId) => (
        sectionId === TARGET_SECTION_ID
          ? targetEntry
          : {
              ...buildPendingEntry(),
              sectionId,
            }
      )),
    };
  }

  async function writeCaseFixture(caseDir, {
    operatorEntry = buildPendingEntry(),
    targetEntry = buildPendingEntry(),
    skipTargetEntryPreflight = false,
    mutateTargetEntryPreflight,
    mutateTargetReviewPacket,
  }) {
    const targetDir = path.join(caseDir, 'targets');
    const targetReviewPacket = buildTargetReviewPacket();
    if (mutateTargetReviewPacket) {
      mutateTargetReviewPacket(targetReviewPacket);
    }
    const targetEntryPreflight = buildTargetEntryPreflight({
      generatedAt: targetReviewPacket.generatedAt ?? targetReviewPacket.summary.generatedAt,
      caseDir,
      operatorEntry,
      targetEntry,
    });
    if (mutateTargetEntryPreflight) {
      mutateTargetEntryPreflight(targetEntryPreflight);
    }

    await writeJson(path.join(targetDir, '131-review-packet.json'), targetReviewPacket);
    if (!skipTargetEntryPreflight) {
      await writeJson(path.join(targetDir, '131-entry-preflight.json'), targetEntryPreflight);
    }
    await writeJson(path.join(targetDir, '131-entry-template.json'), targetEntry);
    await writeJson(path.join(caseDir, 'sajik-seatmap-stage01-operator-input.json'), buildStage01PrewriteInput(operatorEntry));
  }

  function runGate(caseDir) {
    return spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        path.join(frontendRoot, GATE_SCRIPT),
        '--stage-dir',
        caseDir,
      ],
      {
        cwd: frontendRoot,
        encoding: 'utf8',
      },
    );
  }

  function runPrewrite(caseDir) {
    const prewriteDir = path.join(caseDir, 'prewrite');
    return spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        path.join(frontendRoot, PREWRITE_SCRIPT),
        '--stage-dir',
        prewriteDir,
        '--input',
        path.join(caseDir, 'sajik-seatmap-stage01-operator-input.json'),
        '--target-approval-gate',
        path.join(caseDir, 'targets/131-approval-gate.json'),
      ],
      {
        cwd: frontendRoot,
        encoding: 'utf8',
      },
    );
  }

  async function runCase(caseSpec) {
    const caseDir = path.join(smokeRoot, caseSpec.caseId);
    await writeCaseFixture(caseDir, caseSpec);
    const result = runGate(caseDir);
    const reportPath = path.join(caseDir, 'targets/131-approval-gate.json');
    const report = await readJson(reportPath).catch(() => null);
    const blockers = report?.summary?.blockers ?? [];
    const warnings = report?.summary?.warnings ?? [];
    let prewrite = null;

    if (caseSpec.expectedPrewrite) {
      const prewriteDir = path.join(caseDir, 'prewrite');
      const prewriteResult = runPrewrite(caseDir);
      const prewriteReportPath = path.join(prewriteDir, 'sajik-seatmap-stage01-prewrite.json');
      const prewriteReport = await readJson(prewriteReportPath).catch(() => null);
      const prewriteTargetRow = prewriteReport?.rows?.find((row) => row.sectionId === TARGET_SECTION_ID);
      const prewritePatchReview = prewriteReport?.patchReviewRows?.find((row) => row.sectionId === TARGET_SECTION_ID);
      prewrite = {
        report: formatRelative(prewriteReportPath),
        expectedExit: caseSpec.expectedPrewrite.exit,
        actualExit: prewriteResult.status,
        expectedStatus: caseSpec.expectedPrewrite.status,
        actualStatus: prewriteReport?.summary?.status ?? 'missing',
        expectedTargetSourceFile: TARGET_SOURCE_FILE,
        actualTargetSourceFile: prewriteReport?.summary?.targetSourceFile ?? 'missing',
        expectedWritableSourceFields: EXPECTED_WRITABLE_SOURCE_FIELDS,
        actualWritableSourceFields: prewriteReport?.summary?.writableSourceFields ?? [],
        expectedApprovedRows: caseSpec.expectedPrewrite.approvedRows,
        actualApprovedRows: prewriteReport?.summary?.approvedRows ?? null,
        expectedPatchPreviewRows: caseSpec.expectedPrewrite.patchPreviewRows,
        actualPatchPreviewRows: prewriteReport?.summary?.patchPreviewRows ?? null,
        expectedValidForPatchPreview: caseSpec.expectedPrewrite.validForPatchPreview,
        actualValidForPatchPreview: prewriteTargetRow?.validForPatchPreview ?? null,
        expectedVisualPathLocked: caseSpec.expectedPrewrite.visualPathLocked,
        actualVisualPathLocked: prewritePatchReview?.visualPathLocked ?? null,
        expectedPatchAllowedFieldsOnly: true,
        actualPatchAllowedFieldsOnly: prewriteReport?.sourcePatchContractRows?.every((row) => row.patchAllowedFieldsOnly === true) ?? null,
        expectedProductionDataChanged: false,
        actualProductionDataChanged: prewriteReport?.summary?.productionDataChanged ?? null,
        stdout: prewriteResult.stdout.trim(),
        stderr: prewriteResult.stderr.trim(),
      };
    }

    const passed = result.status === caseSpec.expectedExit
      && report?.summary?.status === caseSpec.expectedStatus
      && report?.summary?.selectedDecision === caseSpec.expectedDecision
      && report?.summary?.readyForPrewrite === caseSpec.expectedReadyForPrewrite
      && caseSpec.expectedBlockers.every((code) => blockers.some((blocker) => blocker.includes(code)))
      && caseSpec.expectedWarnings.every((code) => warnings.some((warning) => warning.includes(code)))
      && (
        !caseSpec.expectedPrewrite
        || (
          prewrite?.actualExit === caseSpec.expectedPrewrite.exit
          && prewrite?.actualStatus === caseSpec.expectedPrewrite.status
          && prewrite?.actualApprovedRows === caseSpec.expectedPrewrite.approvedRows
          && prewrite?.actualPatchPreviewRows === caseSpec.expectedPrewrite.patchPreviewRows
          && prewrite?.actualValidForPatchPreview === caseSpec.expectedPrewrite.validForPatchPreview
          && prewrite?.actualVisualPathLocked === caseSpec.expectedPrewrite.visualPathLocked
          && prewrite?.actualTargetSourceFile === TARGET_SOURCE_FILE
          && JSON.stringify(prewrite?.actualWritableSourceFields) === JSON.stringify(EXPECTED_WRITABLE_SOURCE_FIELDS)
          && prewrite?.actualPatchAllowedFieldsOnly === true
          && prewrite?.actualProductionDataChanged === false
        )
      );

    return {
      caseId: caseSpec.caseId,
      passed,
      expectedExit: caseSpec.expectedExit,
      actualExit: result.status,
      expectedStatus: caseSpec.expectedStatus,
      actualStatus: report?.summary?.status ?? 'missing',
      expectedDecision: caseSpec.expectedDecision,
      actualDecision: report?.summary?.selectedDecision ?? 'missing',
      expectedReadyForPrewrite: caseSpec.expectedReadyForPrewrite,
      actualReadyForPrewrite: report?.summary?.readyForPrewrite ?? false,
      expectedBlockers: caseSpec.expectedBlockers,
      actualBlockers: blockers,
      expectedWarnings: caseSpec.expectedWarnings,
      actualWarnings: warnings,
      sourceDataWritePerformed: report?.summary?.sourceDataWritePerformed ?? null,
      writesOperatorInput: report?.summary?.writesOperatorInput ?? null,
      writesProductionData: report?.summary?.writesProductionData ?? null,
      prewrite,
      report: formatRelative(reportPath),
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  }

  function buildMarkdown(report) {
    const lines = [
      '# Sajik Stage 01 Target Approval Gate Smoke',
      '',
      `- status: \`${report.status}\``,
      `- cases: \`${report.passedCases}/${report.totalCases}\``,
      `- smokeRoot: \`${report.smokeRoot}\``,
      `- sourceDataWritePerformed: \`${report.sourceDataWritePerformed}\``,
      `- writesOperatorInput: \`${report.writesOperatorInput}\``,
      `- writesProductionData: \`${report.writesProductionData}\``,
      '',
      '## Safety Contract',
      '',
      ...SAFETY_CONTRACT_LINES.map((line) => `- \`${line}\``),
      '',
      '| Case | Status | Decision | Ready | Expected Blockers | Actual Blockers | Expected Warnings | Actual Warnings |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
      ...report.cases.map((row) => [
        row.caseId,
        row.passed ? 'passed' : 'failed',
        row.actualDecision,
        String(row.actualReadyForPrewrite),
        row.expectedBlockers.join(', ') || '-',
        row.actualBlockers.join('<br>') || '-',
        row.expectedWarnings.join(', ') || '-',
        row.actualWarnings.join('<br>') || '-',
      ]).map((columns) => `| ${columns.join(' | ')} |`),
      '',
      '## Approval To Prewrite Linkage',
      '',
      '| Case | Prewrite Status | Patch Preview Rows | Valid Target Row | Visual Path Locked | Allowed Fields Only | Target Source | Production Changed |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
      ...report.cases
        .filter((row) => row.prewrite)
        .map((row) => `| ${row.caseId} | ${row.prewrite.actualStatus} | ${row.prewrite.actualPatchPreviewRows} | ${row.prewrite.actualValidForPatchPreview} | ${row.prewrite.actualVisualPathLocked} | ${row.prewrite.actualPatchAllowedFieldsOnly} | ${row.prewrite.actualTargetSourceFile} | ${row.prewrite.actualProductionDataChanged} |`),
    ];

    return `${lines.join('\n')}\n`;
  }

  async function main() {
    const cases = [
      {
        caseId: 'pending-no-input',
        expectedExit: 0,
        expectedStatus: 'waiting-for-operator',
        expectedDecision: 'PENDING',
        expectedReadyForPrewrite: false,
        expectedBlockers: [],
        expectedWarnings: [],
      },
      {
        caseId: 'approved-valid-131',
        operatorEntry: buildApprovedEntry(),
        expectedExit: 0,
        expectedStatus: 'ready-for-prewrite',
        expectedDecision: 'APPROVED',
        expectedReadyForPrewrite: true,
        expectedBlockers: [],
        expectedWarnings: ['CORRECTED_PATH_REUSES_CURRENT_HIT_PATH'],
        expectedPrewrite: {
          exit: 0,
          status: 'ready-for-data-patch',
          approvedRows: 1,
          patchPreviewRows: 1,
          validForPatchPreview: true,
          visualPathLocked: true,
        },
      },
      {
        caseId: 'approved-missing-correctedPath',
        operatorEntry: buildApprovedEntry({ correctedPath: '' }),
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'APPROVED',
        expectedReadyForPrewrite: false,
        expectedBlockers: ['APPROVAL_FIELD_REQUIRED:correctedPath'],
        expectedWarnings: [],
      },
      {
        caseId: 'approved-placeholder-reviewer',
        operatorEntry: buildApprovedEntry({ reviewer: '<operator name>' }),
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'APPROVED',
        expectedReadyForPrewrite: false,
        expectedBlockers: ['OPERATOR_PLACEHOLDER_NOT_REPLACED:reviewer'],
        expectedWarnings: ['CORRECTED_PATH_REUSES_CURRENT_HIT_PATH'],
      },
      {
        caseId: 'approved-invalid-label',
        operatorEntry: buildApprovedEntry({ correctedLabelX: 10, correctedLabelY: 10 }),
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'APPROVED',
        expectedReadyForPrewrite: false,
        expectedBlockers: ['CORRECTED_PATH_LABEL_OUTSIDE_POLYGON'],
        expectedWarnings: [],
      },
      {
        caseId: 'approved-self-intersection',
        operatorEntry: buildApprovedEntry({ correctedPath: SELF_INTERSECTING_PATH }),
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'APPROVED',
        expectedReadyForPrewrite: false,
        expectedBlockers: ['CORRECTED_PATH_SELF_INTERSECTION'],
        expectedWarnings: [],
      },
      {
        caseId: 'operator-input-vs-target-entry-conflict',
        operatorEntry: buildApprovedEntry(),
        targetEntry: buildApprovedEntry({ correctedLabelX: 684 }),
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'PENDING',
        expectedReadyForPrewrite: false,
        expectedBlockers: ['TARGET_APPROVAL_SOURCE_CONFLICT'],
        expectedWarnings: [],
      },
      {
        caseId: 'pixel-candidate-copy-note',
        operatorEntry: buildApprovedEntry({ operatorNote: 'copied pixel candidate path from reference overlay' }),
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'APPROVED',
        expectedReadyForPrewrite: false,
        expectedBlockers: ['OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW'],
        expectedWarnings: [],
      },
      {
        caseId: 'rejected-no-patch-preview',
        operatorEntry: { ...buildPendingEntry(), operatorDecision: 'REJECTED', operatorNote: 'official PNG review rejected current candidate' },
        expectedExit: 0,
        expectedStatus: 'waiting-for-operator',
        expectedDecision: 'REJECTED',
        expectedReadyForPrewrite: false,
        expectedBlockers: [],
        expectedWarnings: [],
      },
      {
        caseId: 'needs-retrace-no-patch-preview',
        operatorEntry: { ...buildPendingEntry(), operatorDecision: 'NEEDS_RETRACE', operatorNote: 'operator needs a new official PNG trace' },
        expectedExit: 0,
        expectedStatus: 'waiting-for-operator',
        expectedDecision: 'NEEDS_RETRACE',
        expectedReadyForPrewrite: false,
        expectedBlockers: [],
        expectedWarnings: [],
      },
      {
        caseId: 'keep-current-no-patch-preview',
        operatorEntry: {
          ...buildPendingEntry(),
          operatorDecision: 'KEEP_CURRENT',
          reviewer: 'operator-smoke',
          reviewedAt: '2026-05-16T00:00:00.000Z',
          operatorNote: 'keep current hitPath for this pass',
        },
        expectedExit: 0,
        expectedStatus: 'waiting-for-operator',
        expectedDecision: 'KEEP_CURRENT',
        expectedReadyForPrewrite: false,
        expectedBlockers: [],
        expectedWarnings: [],
        expectedPrewrite: {
          exit: 0,
          status: 'waiting-for-operator',
          approvedRows: 0,
          patchPreviewRows: 0,
          validForPatchPreview: false,
          visualPathLocked: null,
        },
      },
      {
        caseId: 'keep-current-placeholder-reviewer',
        operatorEntry: {
          ...buildPendingEntry(),
          operatorDecision: 'KEEP_CURRENT',
          reviewer: '<operator name>',
          reviewedAt: '<ISO timestamp>',
          operatorNote: 'keep-current draft copied without replacing placeholders',
        },
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'KEEP_CURRENT',
        expectedReadyForPrewrite: false,
        expectedBlockers: [
          'OPERATOR_PLACEHOLDER_NOT_REPLACED:reviewer',
          'OPERATOR_PLACEHOLDER_NOT_REPLACED:reviewedAt',
        ],
        expectedWarnings: [],
      },
      {
        caseId: 'target-review-write-flag-drift',
        mutateTargetReviewPacket: (packet) => {
          packet.summary.sourceDataWritePerformed = true;
        },
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'PENDING',
        expectedReadyForPrewrite: false,
        expectedBlockers: ['TARGET_REVIEW_PACKET_WRITE_FLAGS_NOT_FALSE'],
        expectedWarnings: [],
      },
      {
        caseId: 'target-review-evidence-contract-drift',
        mutateTargetReviewPacket: (packet) => {
          packet.officialPngEvidence.officialImageSha256 = 'sha256-drift';
          packet.officialPngEvidence.pixelComponentReference.candidateReferenceOnly = false;
        },
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'PENDING',
        expectedReadyForPrewrite: false,
        expectedBlockers: [
          'TARGET_REVIEW_OFFICIAL_IMAGE_SHA256_MISMATCH',
          'TARGET_REVIEW_PIXEL_COMPONENT_NOT_REFERENCE_ONLY',
        ],
        expectedWarnings: [],
      },
      {
        caseId: 'target-entry-preflight-missing',
        operatorEntry: buildApprovedEntry(),
        skipTargetEntryPreflight: true,
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'APPROVED',
        expectedReadyForPrewrite: false,
        expectedBlockers: ['TARGET_ENTRY_PREFLIGHT_MISSING'],
        expectedWarnings: ['CORRECTED_PATH_REUSES_CURRENT_HIT_PATH'],
      },
      {
        caseId: 'target-entry-preflight-stale',
        operatorEntry: buildApprovedEntry(),
        mutateTargetEntryPreflight: (preflight) => {
          preflight.generatedAt = '2026-05-15T00:00:00.000Z';
          preflight.summary.generatedAt = '2026-05-15T00:00:00.000Z';
        },
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'APPROVED',
        expectedReadyForPrewrite: false,
        expectedBlockers: ['TARGET_ENTRY_PREFLIGHT_STALE'],
        expectedWarnings: ['CORRECTED_PATH_REUSES_CURRENT_HIT_PATH'],
      },
      {
        caseId: 'target-entry-preflight-target-mismatch',
        operatorEntry: buildApprovedEntry(),
        mutateTargetEntryPreflight: (preflight) => {
          preflight.summary.targetSectionId = '132';
        },
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'APPROVED',
        expectedReadyForPrewrite: false,
        expectedBlockers: ['TARGET_ENTRY_PREFLIGHT_SECTION_MISMATCH'],
        expectedWarnings: ['CORRECTED_PATH_REUSES_CURRENT_HIT_PATH'],
      },
      {
        caseId: 'target-entry-preflight-source-write-drift',
        operatorEntry: buildApprovedEntry(),
        mutateTargetEntryPreflight: (preflight) => {
          preflight.summary.sourceDataWritePerformed = true;
        },
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'APPROVED',
        expectedReadyForPrewrite: false,
        expectedBlockers: ['TARGET_ENTRY_PREFLIGHT_WRITE_FLAGS_NOT_FALSE'],
        expectedWarnings: ['CORRECTED_PATH_REUSES_CURRENT_HIT_PATH'],
      },
      {
        caseId: 'target-entry-preflight-production-write-drift',
        operatorEntry: buildApprovedEntry(),
        mutateTargetEntryPreflight: (preflight) => {
          preflight.summary.productionWriteAllowed = true;
          preflight.summary.writesProductionData = true;
        },
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'APPROVED',
        expectedReadyForPrewrite: false,
        expectedBlockers: [
          'TARGET_ENTRY_PREFLIGHT_WRITE_FLAGS_NOT_FALSE',
          'TARGET_ENTRY_PREFLIGHT_WRITES_PRODUCTION_DATA',
        ],
        expectedWarnings: ['CORRECTED_PATH_REUSES_CURRENT_HIT_PATH'],
      },
      {
        caseId: 'approved-without-valid-preflight',
        operatorEntry: buildApprovedEntry(),
        mutateTargetEntryPreflight: (preflight) => {
          preflight.summary.status = 'waiting-for-operator';
          preflight.summary.readyForApprovalGate = false;
          preflight.summary.selectedSource = 'none';
          preflight.summary.selectedDecision = 'PENDING';
        },
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'APPROVED',
        expectedReadyForPrewrite: false,
        expectedBlockers: [
          'TARGET_ENTRY_PREFLIGHT_READY_MISMATCH',
          'TARGET_ENTRY_PREFLIGHT_SOURCE_MISMATCH',
          'TARGET_ENTRY_PREFLIGHT_DECISION_MISMATCH',
          'TARGET_ENTRY_PREFLIGHT_NOT_READY_FOR_APPROVAL_GATE',
        ],
        expectedWarnings: ['CORRECTED_PATH_REUSES_CURRENT_HIT_PATH'],
      },
    ];

    const caseResults = [];
    for (const caseSpec of cases) {
      caseResults.push(await runCase(caseSpec));
    }

    const passedCases = caseResults.filter((row) => row.passed).length;
    const report = {
      version: SMOKE_VERSION,
      status: passedCases === caseResults.length ? 'passed' : 'failed',
      generatedAt: new Date().toISOString(),
      smokeRoot: formatRelative(smokeRoot),
      totalCases: caseResults.length,
      passedCases,
      failedCases: caseResults.length - passedCases,
      sourceDataWritePerformed: caseResults.some((row) => row.sourceDataWritePerformed !== false),
      writesOperatorInput: caseResults.some((row) => row.writesOperatorInput !== false),
      writesProductionData: caseResults.some((row) => row.writesProductionData !== false),
      cases: caseResults,
    };

    await writeJson(smokeJsonPath, report);
    await fs.writeFile(smokeMarkdownPath, buildMarkdown(report), 'utf8');

    console.log(`stage01_target_approval_gate_smoke_json:${formatRelative(smokeJsonPath)}`);
    console.log(`stage01_target_approval_gate_smoke_markdown:${formatRelative(smokeMarkdownPath)}`);
    console.log(
      `status:${report.status} cases=${report.passedCases}/${report.totalCases} sourceDataWritePerformed=${report.sourceDataWritePerformed} writesOperatorInput=${report.writesOperatorInput} writesProductionData=${report.writesProductionData}`,
    );

    if (report.status !== 'passed') {
      process.exitCode = 1;
    }
  }

  main().catch(async (error) => {
    const report = {
      version: SMOKE_VERSION,
      status: 'failed',
      generatedAt: new Date().toISOString(),
      smokeRoot: formatRelative(smokeRoot),
      totalCases: 0,
      passedCases: 0,
      failedCases: 0,
      sourceDataWritePerformed: false,
      writesOperatorInput: false,
      writesProductionData: false,
      cases: [],
      issues: [
        {
          code: 'TARGET_APPROVAL_GATE_SMOKE_CRASHED',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
    await writeJson(smokeJsonPath, report).catch(() => {});
    await fs.writeFile(smokeMarkdownPath, buildMarkdown(report), 'utf8').catch(() => {});
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
};

const runStage01TargetApprovalGate = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { distanceToPolygon, pathBounds, pathToPoints, pointInPolygon, polygonArea, validateSeatMapPolygonPathIssues } = await import("../src/utils/seatMapPolygonValidator.ts");

  const GATE_VERSION = 'SAJIK_STAGE01_TARGET_APPROVAL_GATE_V1';
  const REQUIRED_TARGET_ENTRY_PREFLIGHT_VERSION = 'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_V1';
  const REQUIRED_TARGET_REVIEW_PACKET_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1';
  const REQUIRED_OPERATOR_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
  const SCRIPT_NAME = 'sajik-seatmap-stage01.mjs';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const DEFAULT_TARGET_SECTION_ID = '131';
  const DEFAULT_TARGET_REVIEW_PACKET_FILE = '131-review-packet.json';
  const DEFAULT_TARGET_ENTRY_PREFLIGHT_JSON_FILE = '131-entry-preflight.json';
  const DEFAULT_TARGET_ENTRY_TEMPLATE_FILE = '131-entry-template.json';
  const DEFAULT_TARGET_APPROVAL_GATE_JSON_FILE = '131-approval-gate.json';
  const DEFAULT_TARGET_APPROVAL_GATE_MARKDOWN_FILE = '131-approval-gate.md';
  const OPERATOR_INPUT_JSON_FILE = 'sajik-seatmap-stage01-operator-input.json';
  const STAGE01_IMAGE_PRIORITY_SECTION_IDS = [
    '131',
    '032',
    '135',
    '132',
    '031',
    '133',
    '022',
    '143',
    '134',
    '142',
    '121',
    '124',
    '125',
    '122',
    '021',
    '123',
  ];
  const IMAGE_WIDTH = 960;
  const IMAGE_HEIGHT = 640;
  const TARGET_REVIEW_EVIDENCE_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1';
  const OFFICIAL_IMAGE_SHA256 = 'e9cb51ccf57a754ddf066a95c6c789d65edf8dff167f432fd35fe809e9dc80aa';
  const MAP_VERSION = 'BUSAN_SAJIK_2026_MANUAL_POLYGON_V2';
  const TARGET_SOURCE_FILE = 'src/data/sajikSeatData.ts';
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT']);
  const REQUIRED_APPROVAL_FIELDS = [
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const REQUIRED_KEEP_CURRENT_FIELDS = [
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const FORBIDDEN_KEEP_CURRENT_FIELDS = [
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
  ];
  const REQUIRED_CORRECTED_PATH_BLOCKER = 'APPROVAL_FIELD_REQUIRED:correctedPath';
  const LABEL_NEAR_BOUNDARY_WARNING_PX = 1;
  const AREA_RATIO_WARNING_THRESHOLD = 1.5;
  const AREA_RATIO_BLOCK_THRESHOLD = 2.5;
  const BOUNDS_DELTA_WARNING_PX = 20;
  const BOUNDS_DELTA_BLOCK_PX = 80;
  const POINT_COUNT_WARNING_DELTA = 12;
  const POINT_COUNT_BLOCK_MAX = 64;
  const SOURCE_FINGERPRINT_FIELDS = [
    'sectionId',
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const WRITABLE_SOURCE_FIELDS = [
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.labelX',
    'imageGeometry.labelY',
  ];
  const LOCKED_SOURCE_FIELDS = [
    'imageGeometry.visualPath',
    'imageGeometry.geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
  ];
  const PREWRITE_COMMAND_CHAIN = [
    'npm run stadium:sajik:stage01-target-approval-gate',
    'npm run stadium:sajik:stage01-operator-input-aid',
    'npm run stadium:sajik:stage01-prewrite',
    'npm run stadium:sajik:stage01-apply-ready',
    'npm run stadium:sajik:stage01-manual-patch-plan',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const stageDir = path.resolve(
    frontendRoot,
    argValue('--stage-dir', path.join('reports/stadium/sajik-stage01-operator')),
  );
  const targetWasExplicit = process.argv.includes('--target') || process.argv.includes('--section');
  const allowAnyStage01Target = process.argv.includes('--allow-any-stage01-target') || targetWasExplicit;
  const targetSectionId = String(argValue('--target', argValue('--section', DEFAULT_TARGET_SECTION_ID))).trim();
  const targetDir = path.join(stageDir, 'targets');
  const defaultTargetFile = (defaultFile, suffix) => (
    targetSectionId === DEFAULT_TARGET_SECTION_ID ? defaultFile : `${targetSectionId}-${suffix}`
  );
  const targetReviewPacketPath = path.resolve(
    frontendRoot,
    argValue('--target-review-packet', path.join(targetDir, defaultTargetFile(DEFAULT_TARGET_REVIEW_PACKET_FILE, 'review-packet.json'))),
  );
  const targetEntryPreflightPath = path.resolve(
    frontendRoot,
    argValue('--target-entry-preflight', path.join(targetDir, defaultTargetFile(DEFAULT_TARGET_ENTRY_PREFLIGHT_JSON_FILE, 'entry-preflight.json'))),
  );
  const targetEntryPath = path.resolve(
    frontendRoot,
    argValue('--target-entry', path.join(targetDir, defaultTargetFile(DEFAULT_TARGET_ENTRY_TEMPLATE_FILE, 'entry-template.json'))),
  );
  const operatorInputPath = path.resolve(
    frontendRoot,
    argValue('--operator-input', path.join(stageDir, OPERATOR_INPUT_JSON_FILE)),
  );
  const jsonPath = path.join(targetDir, defaultTargetFile(DEFAULT_TARGET_APPROVAL_GATE_JSON_FILE, 'approval-gate.json'));
  const markdownPath = path.join(targetDir, defaultTargetFile(DEFAULT_TARGET_APPROVAL_GATE_MARKDOWN_FILE, 'approval-gate.md'));
  const prewriteCommandChain = [
    `node --import tsx scripts/sajik-seatmap-stage01.mjs --target ${targetSectionId} --allow-any-stage01-target`,
    'npm run stadium:sajik:stage01-operator-input-aid',
    'npm run stadium:sajik:stage01-prewrite',
    'npm run stadium:sajik:stage01-apply-ready',
    'npm run stadium:sajik:stage01-manual-patch-plan',
  ];

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const readOptionalJson = async (filePath) => {
    try {
      return await readJson(filePath);
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
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

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';

  const normalizePath = (value) => String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  const numberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const fieldMissing = (value) => value === '' || value === null || value === undefined;
  const rawEntryValue = (entry, field) => {
    if (field === 'correctedLabelX') return entry.correctedLabelXRaw;
    if (field === 'correctedLabelY') return entry.correctedLabelYRaw;
    return entry[field];
  };
  const fieldHasPlaceholder = (value) => /^<[^>]+>$/.test(String(value ?? '').trim());
  const placeholderReasonsFor = (entry, fields) => fields
    .filter((field) => fieldHasPlaceholder(rawEntryValue(entry, field)))
    .map((field) => `OPERATOR_PLACEHOLDER_NOT_REPLACED:${field}`);

  const round = (value, digits = 2) => {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
  };

  const timestampMs = (value) => {
    const ms = Date.parse(String(value ?? ''));
    return Number.isFinite(ms) ? ms : null;
  };

  const safePathStats = (pathData) => {
    const normalizedPath = normalizePath(pathData);
    const points = pathToPoints(normalizedPath);
    if (points.length === 0) {
      return {
        pointCount: 0,
        area: 0,
        bounds: null,
        points,
      };
    }
    return {
      pointCount: points.length,
      area: round(polygonArea(points)),
      bounds: pathBounds(normalizedPath),
      points,
    };
  };

  const maxAbsBoundsDelta = (before, after) => {
    if (!before || !after) return null;
    return Math.max(
      Math.abs(after.minX - before.minX),
      Math.abs(after.minY - before.minY),
      Math.abs(after.maxX - before.maxX),
      Math.abs(after.maxY - before.maxY),
    );
  };

  const noteSuggestsPixelCandidateCopy = (value) => {
    const note = String(value ?? '').toLowerCase();
    if (!note.includes('pixel') || !note.includes('candidate')) return false;
    return /(copy|copied|paste|pasted|복사|붙여넣)/i.test(note);
  };

  const hasEditableApprovalValue = (entry) => entry.operatorDecision !== 'PENDING'
    || entry.correctedPath
    || !fieldMissing(entry.correctedLabelXRaw)
    || !fieldMissing(entry.correctedLabelYRaw)
    || entry.reviewer
    || entry.reviewedAt
    || entry.operatorNote;

  const hasPatchCoordinateValue = (entry) => entry.correctedPath
    || !fieldMissing(entry.correctedLabelXRaw)
    || !fieldMissing(entry.correctedLabelYRaw);

  const normalizeEntry = (row, source) => {
    const correctedLabelX = numberOrNull(row?.correctedLabelX);
    const correctedLabelY = numberOrNull(row?.correctedLabelY);
    return {
      source,
      sectionId: String(row?.sectionId ?? '').trim(),
      operatorDecision: normalizeDecision(row?.operatorDecision),
      correctedPath: normalizePath(row?.correctedPath),
      correctedLabelXRaw: row?.correctedLabelX,
      correctedLabelYRaw: row?.correctedLabelY,
      correctedLabelX,
      correctedLabelY,
      reviewer: String(row?.reviewer ?? '').trim(),
      reviewedAt: String(row?.reviewedAt ?? '').trim(),
      operatorNote: String(row?.operatorNote ?? '').trim(),
    };
  };

  const approvalFingerprint = (entry) => JSON.stringify({
    sectionId: entry.sectionId,
    operatorDecision: entry.operatorDecision,
    correctedPath: entry.correctedPath,
    correctedLabelX: entry.correctedLabelX,
    correctedLabelY: entry.correctedLabelY,
    reviewer: entry.reviewer,
    reviewedAt: entry.reviewedAt,
    operatorNote: entry.operatorNote,
  });

  const sourceComparisonEntry = (entry) => ({
    source: entry.source,
    sectionId: entry.sectionId,
    operatorDecision: entry.operatorDecision,
    hasEditableApprovalValue: hasEditableApprovalValue(entry),
    approvalFingerprint: approvalFingerprint(entry),
    correctedPointCount: entry.correctedPath ? pathToPoints(entry.correctedPath).length : 0,
    correctedLabelX: entry.correctedLabelX,
    correctedLabelY: entry.correctedLabelY,
    reviewer: entry.reviewer,
    reviewedAt: entry.reviewedAt,
  });

  const sourcePolicy = {
    allowedCoordinateSource: 'operator-provided official 2026 Sajik PNG coordinates only',
    coordinateSystem: 'SVG viewBox 0 0 960 640',
    targetApprovalOnly: true,
    disallowedSources: [
      'pixel candidate path copy without operator approval',
      'AI coordinate prediction',
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  };

  const targetReviewPacket = await readJson(targetReviewPacketPath);
  const targetEntryPreflight = await readOptionalJson(targetEntryPreflightPath);
  const targetEntry = await readOptionalJson(targetEntryPath);
  const operatorInput = await readOptionalJson(operatorInputPath);
  const operatorInputRows = Array.isArray(operatorInput?.corrections) ? operatorInput.corrections : [];
  const operatorInputRow = operatorInputRows.find((row) => String(row.sectionId ?? '').trim() === targetSectionId);
  const target = targetReviewPacket.target ?? {};
  const blockers = [];
  const warnings = [];

  if (!STAGE01_IMAGE_PRIORITY_SECTION_IDS.includes(targetSectionId)) {
    blockers.push(`TARGET_NOT_IN_STAGE01_P0_SCOPE:${targetSectionId}`);
  }
  if (targetReviewPacket.summary?.packetVersion !== REQUIRED_TARGET_REVIEW_PACKET_VERSION) {
    blockers.push(`TARGET_REVIEW_PACKET_VERSION_MISMATCH:${targetReviewPacket.summary?.packetVersion ?? 'missing'}`);
  }
  if (String(targetReviewPacket.summary?.targetSectionId ?? '').trim() !== targetSectionId) {
    blockers.push(`TARGET_REVIEW_SECTION_MISMATCH:${targetReviewPacket.summary?.targetSectionId ?? 'missing'}:${targetSectionId}`);
  }
  if (!allowAnyStage01Target && targetReviewPacket.summary?.matchesNextOperatorSection !== true) {
    blockers.push('TARGET_DOES_NOT_MATCH_NEXT_OPERATOR_SECTION');
  }
  if (targetReviewPacket.summary?.productionWriteAllowed !== false || targetReviewPacket.summary?.sourceDataWritePerformed !== false) {
    blockers.push('TARGET_REVIEW_PACKET_WRITE_FLAGS_NOT_FALSE');
  }
  if (targetReviewPacket.summary?.evidenceVersion !== TARGET_REVIEW_EVIDENCE_VERSION
    || targetReviewPacket.officialPngEvidence?.evidenceVersion !== TARGET_REVIEW_EVIDENCE_VERSION) {
    blockers.push(`TARGET_REVIEW_EVIDENCE_VERSION_MISMATCH:${targetReviewPacket.summary?.evidenceVersion ?? 'missing'}:${targetReviewPacket.officialPngEvidence?.evidenceVersion ?? 'missing'}`);
  }
  if (targetReviewPacket.summary?.officialImageSha256 !== OFFICIAL_IMAGE_SHA256
    || targetReviewPacket.officialPngEvidence?.officialImageSha256 !== OFFICIAL_IMAGE_SHA256) {
    blockers.push(`TARGET_REVIEW_OFFICIAL_IMAGE_SHA256_MISMATCH:${targetReviewPacket.summary?.officialImageSha256 ?? 'missing'}:${targetReviewPacket.officialPngEvidence?.officialImageSha256 ?? 'missing'}`);
  }
  if (targetReviewPacket.summary?.mapVersion !== MAP_VERSION
    || targetReviewPacket.officialPngEvidence?.mapVersion !== MAP_VERSION) {
    blockers.push(`TARGET_REVIEW_MAP_VERSION_MISMATCH:${targetReviewPacket.summary?.mapVersion ?? 'missing'}:${targetReviewPacket.officialPngEvidence?.mapVersion ?? 'missing'}`);
  }
  if (targetReviewPacket.officialPngEvidence?.pixelComponentReference?.candidateReferenceOnly !== true) {
    blockers.push('TARGET_REVIEW_PIXEL_COMPONENT_NOT_REFERENCE_ONLY');
  }
  if (targetReviewPacket.officialPngEvidence?.sourceFieldPolicy?.productionWriteAllowed !== false
    || targetReviewPacket.officialPngEvidence?.sourceFieldPolicy?.sourceDataWritePerformed !== false) {
    blockers.push('TARGET_REVIEW_EVIDENCE_WRITE_FLAGS_NOT_FALSE');
  }
  if (operatorInput && operatorInput.packageVersion !== REQUIRED_OPERATOR_PACKAGE_VERSION) {
    blockers.push(`OPERATOR_INPUT_PACKAGE_VERSION_MISMATCH:${operatorInput.packageVersion ?? 'missing'}`);
  }
  if (operatorInput && operatorInput.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`OPERATOR_INPUT_STAGE_MISMATCH:${operatorInput.targetStage ?? 'missing'}`);
  }
  if (!targetEntryPreflight) {
    blockers.push(`TARGET_ENTRY_PREFLIGHT_MISSING:${relativePath(targetEntryPreflightPath)}`);
  } else {
    const preflightSummary = targetEntryPreflight.summary ?? {};
    const preflightGeneratedAt = targetEntryPreflight.generatedAt ?? preflightSummary.generatedAt;
    const reviewPacketGeneratedAt = targetReviewPacket.generatedAt ?? targetReviewPacket.summary?.generatedAt;
    const preflightMs = timestampMs(preflightGeneratedAt);
    const reviewPacketMs = timestampMs(reviewPacketGeneratedAt);

    if (preflightSummary.preflightVersion !== REQUIRED_TARGET_ENTRY_PREFLIGHT_VERSION) {
      blockers.push(`TARGET_ENTRY_PREFLIGHT_VERSION_MISMATCH:${preflightSummary.preflightVersion ?? 'missing'}`);
    }
    if (preflightMs === null) {
      blockers.push(`TARGET_ENTRY_PREFLIGHT_GENERATED_AT_INVALID:${preflightGeneratedAt ?? 'missing'}`);
    }
    if (reviewPacketMs !== null && preflightMs !== null && preflightMs < reviewPacketMs) {
      blockers.push(`TARGET_ENTRY_PREFLIGHT_STALE:${preflightGeneratedAt}:${reviewPacketGeneratedAt}`);
    }
    if (String(preflightSummary.targetSectionId ?? '').trim() !== targetSectionId) {
      blockers.push(`TARGET_ENTRY_PREFLIGHT_SECTION_MISMATCH:${preflightSummary.targetSectionId ?? 'missing'}:${targetSectionId}`);
    }
    if (!['waiting-for-operator', 'ready-for-approval-gate'].includes(preflightSummary.status)) {
      blockers.push(`TARGET_ENTRY_PREFLIGHT_STATUS_NOT_ACCEPTED:${preflightSummary.status ?? 'missing'}`);
    }
    if (preflightSummary.productionWriteAllowed !== false || preflightSummary.sourceDataWritePerformed !== false) {
      blockers.push('TARGET_ENTRY_PREFLIGHT_WRITE_FLAGS_NOT_FALSE');
    }
    if (preflightSummary.writesOperatorInput !== false) {
      blockers.push('TARGET_ENTRY_PREFLIGHT_WRITES_OPERATOR_INPUT');
    }
    if (preflightSummary.writesProductionData !== false) {
      blockers.push('TARGET_ENTRY_PREFLIGHT_WRITES_PRODUCTION_DATA');
    }
    if (preflightSummary.targetReviewPacket !== relativePath(targetReviewPacketPath)) {
      blockers.push(`TARGET_ENTRY_PREFLIGHT_REVIEW_PACKET_MISMATCH:${preflightSummary.targetReviewPacket ?? 'missing'}:${relativePath(targetReviewPacketPath)}`);
    }
    if (preflightSummary.targetEntryTemplate !== relativePath(targetEntryPath)) {
      blockers.push(`TARGET_ENTRY_PREFLIGHT_TARGET_ENTRY_MISMATCH:${preflightSummary.targetEntryTemplate ?? 'missing'}:${relativePath(targetEntryPath)}`);
    }
    if (preflightSummary.operatorInput !== relativePath(operatorInputPath)) {
      blockers.push(`TARGET_ENTRY_PREFLIGHT_OPERATOR_INPUT_MISMATCH:${preflightSummary.operatorInput ?? 'missing'}:${relativePath(operatorInputPath)}`);
    }
  }

  const sourceEntries = [
    normalizeEntry(operatorInputRow, 'operator-input'),
    normalizeEntry(targetEntry, 'target-entry-template'),
  ];
  const meaningfulEntries = sourceEntries.filter(hasEditableApprovalValue);
  const selectedSourceConflicts = [];
  let selectedEntry = null;
  let selectedSource = 'none';

  if (meaningfulEntries.length === 1) {
    [selectedEntry] = meaningfulEntries;
    selectedSource = selectedEntry.source;
  } else if (meaningfulEntries.length > 1) {
    const [firstEntry, ...otherEntries] = meaningfulEntries;
    const firstFingerprint = approvalFingerprint(firstEntry);
    const mismatchedEntry = otherEntries.find((entry) => approvalFingerprint(entry) !== firstFingerprint);
    if (mismatchedEntry) {
      selectedSourceConflicts.push(...meaningfulEntries.map((entry) => entry.source));
      blockers.push(`TARGET_APPROVAL_SOURCE_CONFLICT:${selectedSourceConflicts.join(':')}`);
    } else {
      selectedEntry = firstEntry;
      selectedSource = 'matched-sources';
    }
  }

  const approvalReasons = [];
  const approvalWarnings = [];
  let geometryReview = null;

  if (!operatorInputRow) {
    warnings.push(`TARGET_OPERATOR_INPUT_ROW_MISSING:${targetSectionId}`);
  }
  if (!targetEntry) {
    warnings.push(`TARGET_ENTRY_TEMPLATE_MISSING:${relativePath(targetEntryPath)}`);
  }

  if (selectedEntry) {
    if (selectedEntry.sectionId !== targetSectionId) {
      approvalReasons.push(`TARGET_ENTRY_SECTION_MISMATCH:${selectedEntry.sectionId}:${targetSectionId}`);
    }
    if (!DECISION_OPTIONS.has(selectedEntry.operatorDecision)) {
      approvalReasons.push(`INVALID_OPERATOR_DECISION:${selectedEntry.operatorDecision}`);
    }
    if (noteSuggestsPixelCandidateCopy(selectedEntry.operatorNote)) {
      approvalReasons.push('OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW');
    }

    if (selectedEntry.operatorDecision === 'APPROVED') {
      REQUIRED_APPROVAL_FIELDS.forEach((field) => {
        if (fieldMissing(selectedEntry[field])) {
          approvalReasons.push(`APPROVAL_FIELD_REQUIRED:${field}`);
        }
      });
      approvalReasons.push(...placeholderReasonsFor(selectedEntry, REQUIRED_APPROVAL_FIELDS));
      if (!fieldMissing(selectedEntry.correctedLabelXRaw) && selectedEntry.correctedLabelX === null) {
        approvalReasons.push('APPROVAL_FIELD_INVALID_NUMBER:correctedLabelX');
      }
      if (!fieldMissing(selectedEntry.correctedLabelYRaw) && selectedEntry.correctedLabelY === null) {
        approvalReasons.push('APPROVAL_FIELD_INVALID_NUMBER:correctedLabelY');
      }
      if (selectedEntry.reviewedAt && Number.isNaN(Date.parse(selectedEntry.reviewedAt))) {
        approvalReasons.push('REVIEWED_AT_INVALID_DATE');
      }

      if (selectedEntry.correctedPath && selectedEntry.correctedLabelX !== null && selectedEntry.correctedLabelY !== null) {
        const labelPoint = [selectedEntry.correctedLabelX, selectedEntry.correctedLabelY];
        const issues = validateSeatMapPolygonPathIssues({
          pathData: selectedEntry.correctedPath,
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
          labelPoint,
          labelTolerance: 1,
          sectionId: targetSectionId,
          pathKind: 'correctedPath',
        });
        const issueCodes = issues.map((issue) => issue.code);
        approvalReasons.push(...issues.map((issue) => `CORRECTED_PATH_${issue.code}`));

        const correctedStats = safePathStats(selectedEntry.correctedPath);
        const currentHitStats = safePathStats(target.currentHitPath);
        const currentVisualStats = safePathStats(target.currentVisualPath);
        const pointCountDelta = correctedStats.pointCount - currentHitStats.pointCount;
        const areaRatioVsCurrentHit = currentHitStats.area > 0
          ? round(correctedStats.area / currentHitStats.area)
          : null;
        const areaRatioVsCurrentVisual = currentVisualStats.area > 0
          ? round(correctedStats.area / currentVisualStats.area)
          : null;
        const boundsMaxAbsDelta = maxAbsBoundsDelta(currentHitStats.bounds, correctedStats.bounds);
        const labelInside = pointInPolygon(labelPoint, correctedStats.points);
        const labelBoundaryDistance = correctedStats.points.length >= 3
          ? round(distanceToPolygon(labelPoint, correctedStats.points))
          : null;

        if (selectedEntry.correctedPath === normalizePath(target.currentHitPath)) {
          approvalWarnings.push('CORRECTED_PATH_REUSES_CURRENT_HIT_PATH');
        }
        if (selectedEntry.correctedPath === normalizePath(target.currentVisualPath)) {
          approvalWarnings.push('CORRECTED_PATH_REUSES_CURRENT_VISUAL_PATH');
        }
        if (correctedStats.pointCount > POINT_COUNT_BLOCK_MAX) {
          approvalReasons.push('CORRECTED_POINT_COUNT_TOO_HIGH');
        } else if (Math.abs(pointCountDelta) > POINT_COUNT_WARNING_DELTA) {
          approvalWarnings.push('CORRECTED_POINT_COUNT_DELTA_REVIEW');
        }
        if (areaRatioVsCurrentHit !== null && areaRatioVsCurrentHit > AREA_RATIO_BLOCK_THRESHOLD) {
          approvalReasons.push('CORRECTED_GEOMETRY_AREA_DELTA_TOO_LARGE');
        } else if (areaRatioVsCurrentHit !== null && areaRatioVsCurrentHit > AREA_RATIO_WARNING_THRESHOLD) {
          approvalWarnings.push('CORRECTED_GEOMETRY_AREA_DELTA_REVIEW');
        }
        if (boundsMaxAbsDelta !== null && boundsMaxAbsDelta > BOUNDS_DELTA_BLOCK_PX) {
          approvalReasons.push('CORRECTED_GEOMETRY_BOUNDS_DELTA_TOO_LARGE');
        } else if (boundsMaxAbsDelta !== null && boundsMaxAbsDelta > BOUNDS_DELTA_WARNING_PX) {
          approvalWarnings.push('CORRECTED_GEOMETRY_BOUNDS_DELTA_REVIEW');
        }
        if (labelInside && labelBoundaryDistance !== null && labelBoundaryDistance <= LABEL_NEAR_BOUNDARY_WARNING_PX) {
          approvalWarnings.push('CORRECTED_LABEL_NEAR_BOUNDARY');
        }

        geometryReview = {
          correctedPointCount: correctedStats.pointCount,
          currentHitPointCount: currentHitStats.pointCount,
          pointCountDelta,
          correctedArea: correctedStats.area,
          currentHitArea: currentHitStats.area,
          areaRatioVsCurrentHit,
          areaRatioVsCurrentVisual,
          correctedBounds: correctedStats.bounds,
          currentHitBounds: currentHitStats.bounds,
          boundsMaxAbsDelta: boundsMaxAbsDelta === null ? null : round(boundsMaxAbsDelta),
          labelPoint,
          labelInside,
          labelBoundaryDistance,
          validationIssueCodes: issueCodes,
          imageCoordinateValidation: {
            officialPngOnly: true,
            coordinateSystem: sourcePolicy.coordinateSystem,
            viewBox: `0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`,
            correctedPathSingleClosed: !issueCodes.includes('SINGLE_CLOSED_MLZ_PATH_REQUIRED'),
            correctedPathWithinViewBox: !issueCodes.includes('POINT_OUT_OF_BOUNDS'),
            correctedPathSelfIntersectionFree: !issueCodes.includes('SELF_INTERSECTION'),
            labelWithinViewBox: !issueCodes.includes('LABEL_OUT_OF_BOUNDS'),
            labelInsideOrWithinTolerance: !issueCodes.includes('LABEL_OUTSIDE_POLYGON'),
          },
          reusesCurrentHitPath: selectedEntry.correctedPath === normalizePath(target.currentHitPath),
          reusesCurrentVisualPath: selectedEntry.correctedPath === normalizePath(target.currentVisualPath),
        };
      }
    } else if (selectedEntry.operatorDecision === 'KEEP_CURRENT') {
      REQUIRED_KEEP_CURRENT_FIELDS.forEach((field) => {
        if (fieldMissing(selectedEntry[field])) {
          approvalReasons.push(`KEEP_CURRENT_FIELD_REQUIRED:${field}`);
        }
      });
      approvalReasons.push(...placeholderReasonsFor(selectedEntry, REQUIRED_KEEP_CURRENT_FIELDS));
      if (selectedEntry.reviewedAt && Number.isNaN(Date.parse(selectedEntry.reviewedAt))) {
        approvalReasons.push('KEEP_CURRENT_REVIEWED_AT_INVALID_DATE');
      }
      if (hasPatchCoordinateValue(selectedEntry)) {
        approvalReasons.push('KEEP_CURRENT_ROW_HAS_COORDINATE_FIELDS');
      }
    } else if (selectedEntry.operatorDecision === 'PENDING') {
      approvalWarnings.push('PENDING_ROW_HAS_EDITABLE_FIELDS');
    } else if (!selectedEntry.operatorNote) {
      approvalWarnings.push('DECISION_NOTE_RECOMMENDED');
      approvalReasons.push(...placeholderReasonsFor(selectedEntry, SOURCE_FINGERPRINT_FIELDS));
    }
  }

  blockers.push(...approvalReasons.map((reason) => `TARGET_APPROVAL_INVALID:${targetSectionId}:${reason}`));
  warnings.push(...approvalWarnings.map((warning) => `TARGET_APPROVAL_WARNING:${targetSectionId}:${warning}`));

  const selectedDecision = selectedEntry?.operatorDecision ?? 'PENDING';
  if (targetEntryPreflight) {
    const preflightSummary = targetEntryPreflight.summary ?? {};
    if ((selectedEntry !== null) !== (preflightSummary.readyForApprovalGate === true)) {
      blockers.push(`TARGET_ENTRY_PREFLIGHT_READY_MISMATCH:${preflightSummary.readyForApprovalGate ?? 'missing'}:${selectedEntry !== null}`);
    }
    if ((preflightSummary.selectedSource ?? 'none') !== selectedSource) {
      blockers.push(`TARGET_ENTRY_PREFLIGHT_SOURCE_MISMATCH:${preflightSummary.selectedSource ?? 'missing'}:${selectedSource}`);
    }
    if ((preflightSummary.selectedDecision ?? 'PENDING') !== selectedDecision) {
      blockers.push(`TARGET_ENTRY_PREFLIGHT_DECISION_MISMATCH:${preflightSummary.selectedDecision ?? 'missing'}:${selectedDecision}`);
    }
    if (selectedEntry && preflightSummary.status !== 'ready-for-approval-gate') {
      blockers.push(`TARGET_ENTRY_PREFLIGHT_NOT_READY_FOR_APPROVAL_GATE:${preflightSummary.status ?? 'missing'}`);
    }
    if (!selectedEntry && preflightSummary.status !== 'waiting-for-operator') {
      blockers.push(`TARGET_ENTRY_PREFLIGHT_UNEXPECTED_READY_WITHOUT_SELECTED_INPUT:${preflightSummary.status ?? 'missing'}`);
    }
  }
  const readyForPrewrite = selectedDecision === 'APPROVED'
    && selectedEntry !== null
    && approvalReasons.length === 0
    && blockers.length === 0;
  const status = blockers.length > 0
    ? 'blocked'
    : readyForPrewrite
      ? 'ready-for-prewrite'
      : 'waiting-for-operator';

  const summary = {
    gateVersion: GATE_VERSION,
    status,
    generatedAt: new Date().toISOString(),
    targetStage: TARGET_STAGE_LABEL,
    targetSectionId,
    allowAnyStage01Target,
    matchesNextOperatorSection: targetReviewPacket.summary?.matchesNextOperatorSection === true,
    targetReviewPacket: relativePath(targetReviewPacketPath),
    targetEntryPreflight: relativePath(targetEntryPreflightPath),
    targetEntryTemplate: relativePath(targetEntryPath),
    operatorInput: relativePath(operatorInputPath),
    targetEntryPreflightStatus: targetEntryPreflight?.summary?.status ?? 'missing',
    targetEntryPreflightReadyForApprovalGate: targetEntryPreflight?.summary?.readyForApprovalGate ?? false,
    targetEntryPreflightSelectedSource: targetEntryPreflight?.summary?.selectedSource ?? 'missing',
    targetEntryPreflightSelectedDecision: targetEntryPreflight?.summary?.selectedDecision ?? 'missing',
    selectedSource,
    selectedDecision,
    selectedSourceConflicts,
    readyForPrewrite,
    approved: selectedDecision === 'APPROVED',
    hasOperatorInputRow: Boolean(operatorInputRow),
    hasTargetEntryTemplate: Boolean(targetEntry),
    targetImagePriorityRank: targetReviewPacket.summary?.targetImagePriorityRank ?? null,
    targetImageRiskLevel: targetReviewPacket.summary?.targetImageRiskLevel ?? '',
    targetImageBbox: targetReviewPacket.summary?.targetImageBbox ?? '',
    targetReviewEvidenceVersion: targetReviewPacket.officialPngEvidence?.evidenceVersion ?? null,
    officialImageSha256: targetReviewPacket.officialPngEvidence?.officialImageSha256 ?? null,
    mapVersion: targetReviewPacket.officialPngEvidence?.mapVersion ?? null,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    allowedCoordinateSource: sourcePolicy.allowedCoordinateSource,
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    keepCurrentReviewRequiredFields: REQUIRED_KEEP_CURRENT_FIELDS,
    keepCurrentForbiddenFields: FORBIDDEN_KEEP_CURRENT_FIELDS,
    targetSourceFile: TARGET_SOURCE_FILE,
    writableSourceFields: WRITABLE_SOURCE_FIELDS,
    lockedSourceFields: LOCKED_SOURCE_FIELDS,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    sourcePolicy,
    safetyContract: [
      'This target approval gate is read-only and never edits src/data/sajikSeatData.ts.',
      'It never modifies reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json.',
      targetSectionId === DEFAULT_TARGET_SECTION_ID
        ? 'It reads the generated 131 target review packet, target entry preflight, and operator-provided approval input, then emits approval readiness only.'
        : `It reads the generated ${targetSectionId} target review packet, target entry preflight, and operator-provided approval input, then emits approval readiness only.`,
      targetSectionId === DEFAULT_TARGET_SECTION_ID
        ? 'It requires targets/131-entry-preflight.json to be fresh and ready-for-approval-gate before any selected input can become ready-for-prewrite.'
        : `It requires targets/${targetSectionId}-entry-preflight.json to be fresh and ready-for-approval-gate before any selected input can become ready-for-prewrite.`,
      'It accepts only operator-provided official 2026 Sajik PNG coordinates as correctedPath and correctedLabelX/Y.',
      'Pixel candidate paths are reference-only and must not be copied into correctedPath without operator approval.',
      'AI coordinate prediction, web search, crawling, resized screenshots, and browser CSS pixels are not valid coordinate sources.',
      'APPROVED target input can become READY_FOR_PREWRITE only after required fields and polygon validation pass.',
      `It is generated by ${SCRIPT_NAME}.`,
    ],
    approvalSourceContract: {
      allowedSources: [
        'reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json',
        `reports/stadium/sajik-stage01-operator/targets/${targetSectionId}-entry-template.json`,
      ],
      conflictBlocker: 'TARGET_APPROVAL_SOURCE_CONFLICT',
      exactMatchRequiredWhenMultipleSourcesHaveEditableValues: true,
      sourceFingerprintFields: SOURCE_FINGERPRINT_FIELDS,
      approvedRequiredFields: ['operatorDecision=APPROVED', ...REQUIRED_APPROVAL_FIELDS],
      statusMatrix: {
        PENDING: 'waiting-for-operator',
        APPROVED_VALID: 'ready-for-prewrite',
        APPROVED_INVALID: 'blocked',
        REJECTED: 'waiting-for-operator',
        NEEDS_RETRACE: 'waiting-for-operator',
        KEEP_CURRENT: 'waiting-for-operator',
      },
    },
    preflightContract: {
      requiredPreflightVersion: REQUIRED_TARGET_ENTRY_PREFLIGHT_VERSION,
      actualPreflightVersion: targetEntryPreflight?.summary?.preflightVersion ?? null,
      targetEntryPreflight: relativePath(targetEntryPreflightPath),
      status: targetEntryPreflight?.summary?.status ?? 'missing',
      selectedSource: targetEntryPreflight?.summary?.selectedSource ?? 'missing',
      selectedDecision: targetEntryPreflight?.summary?.selectedDecision ?? 'missing',
      readyForApprovalGate: targetEntryPreflight?.summary?.readyForApprovalGate ?? false,
      targetSectionId: targetEntryPreflight?.summary?.targetSectionId ?? null,
      generatedAt: targetEntryPreflight?.generatedAt ?? targetEntryPreflight?.summary?.generatedAt ?? null,
      targetReviewPacket: targetEntryPreflight?.summary?.targetReviewPacket ?? null,
      targetEntryTemplate: targetEntryPreflight?.summary?.targetEntryTemplate ?? null,
      operatorInput: targetEntryPreflight?.summary?.operatorInput ?? null,
      productionWriteAllowed: targetEntryPreflight?.summary?.productionWriteAllowed ?? null,
      sourceDataWritePerformed: targetEntryPreflight?.summary?.sourceDataWritePerformed ?? null,
      writesOperatorInput: targetEntryPreflight?.summary?.writesOperatorInput ?? null,
      writesProductionData: targetEntryPreflight?.summary?.writesProductionData ?? null,
      requiredBeforeReadyForPrewrite: true,
    },
    reviewEvidenceContract: {
      requiredEvidenceVersion: TARGET_REVIEW_EVIDENCE_VERSION,
      actualEvidenceVersion: targetReviewPacket.officialPngEvidence?.evidenceVersion ?? null,
      requiredOfficialImageSha256: OFFICIAL_IMAGE_SHA256,
      actualOfficialImageSha256: targetReviewPacket.officialPngEvidence?.officialImageSha256 ?? null,
      requiredMapVersion: MAP_VERSION,
      actualMapVersion: targetReviewPacket.officialPngEvidence?.mapVersion ?? null,
      targetViewport: targetReviewPacket.officialPngEvidence?.targetViewport ?? null,
      candidateReferenceOnly: targetReviewPacket.officialPngEvidence?.pixelComponentReference?.candidateReferenceOnly === true,
      requiredReviewAssertions: targetReviewPacket.officialPngEvidence?.requiredReviewAssertions ?? [],
      cannotAutoApproveReasons: targetReviewPacket.officialPngEvidence?.cannotAutoApproveReasons ?? [],
      sourceFieldPolicy: targetReviewPacket.officialPngEvidence?.sourceFieldPolicy ?? null,
    },
    sourceComparison: {
      exactMatchRequiredWhenMultipleSourcesHaveEditableValues: true,
      sourceConflictRule: 'TARGET_APPROVAL_SOURCE_CONFLICT',
      sourceFingerprintFields: SOURCE_FINGERPRINT_FIELDS,
      meaningfulSourceCount: meaningfulEntries.length,
      selectedSource,
      selectedSourceConflicts,
      entries: sourceEntries.map(sourceComparisonEntry),
    },
    prewriteContract: {
      commandChain: prewriteCommandChain,
      targetSourceFile: TARGET_SOURCE_FILE,
      writableSourceFields: WRITABLE_SOURCE_FIELDS,
      lockedSourceFields: LOCKED_SOURCE_FIELDS,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      manualPatchAllowedOnlyAfter: 'MANUAL_PATCH_REQUIRED',
    },
    sources: sourceEntries.map(sourceComparisonEntry),
    selectedEntry: selectedEntry
      ? {
        source: selectedEntry.source,
        sectionId: selectedEntry.sectionId,
        operatorDecision: selectedEntry.operatorDecision,
        correctedPath: selectedEntry.correctedPath,
        correctedLabelX: selectedEntry.correctedLabelX,
        correctedLabelY: selectedEntry.correctedLabelY,
        reviewer: selectedEntry.reviewer,
        reviewedAt: selectedEntry.reviewedAt,
        operatorNote: selectedEntry.operatorNote,
      }
      : null,
    geometryReview,
  };

  await writeJson(jsonPath, report);

  const markdown = [
    '# Sajik Stage 01 Target Approval Gate',
    '',
    `- gateVersion: \`${GATE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- targetSectionId: \`${summary.targetSectionId}\``,
    `- evidenceVersion: \`${summary.targetReviewEvidenceVersion ?? '-'}\``,
    `- mapVersion: \`${summary.mapVersion ?? '-'}\``,
    `- officialImageSha256: \`${summary.officialImageSha256 ?? '-'}\``,
    `- selectedSource: \`${summary.selectedSource}\``,
    `- selectedDecision: \`${summary.selectedDecision}\``,
    `- readyForPrewrite: \`${summary.readyForPrewrite}\``,
    `- targetEntryPreflightStatus: \`${summary.targetEntryPreflightStatus}\``,
    `- targetEntryPreflightReadyForApprovalGate: \`${summary.targetEntryPreflightReadyForApprovalGate}\``,
    `- productionWriteAllowed: \`${summary.productionWriteAllowed}\``,
    `- sourceDataWritePerformed: \`${summary.sourceDataWritePerformed}\``,
    `- writesOperatorInput: \`${summary.writesOperatorInput}\``,
    `- writesProductionData: \`${summary.writesProductionData}\``,
    '',
    '## Source Policy',
    '',
    `- allowedCoordinateSource: \`${sourcePolicy.allowedCoordinateSource}\``,
    `- coordinateSystem: \`${sourcePolicy.coordinateSystem}\``,
    `- missingBaseballDataContract: \`${sourcePolicy.missingBaseballDataContract}\``,
    '- Pixel candidate paths are reference-only and must not be copied into `correctedPath` without operator approval.',
    targetSectionId === DEFAULT_TARGET_SECTION_ID
      ? '- `targets/131-entry-preflight.json` must be fresh and ready before any selected input can become `ready-for-prewrite`.'
      : `- \`targets/${targetSectionId}-entry-preflight.json\` must be fresh and ready before any selected input can become \`ready-for-prewrite\`.`,
    '',
    '## Target Entry Preflight Contract',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['requiredPreflightVersion', `\`${report.preflightContract.requiredPreflightVersion}\``],
        ['actualPreflightVersion', `\`${report.preflightContract.actualPreflightVersion ?? '-'}\``],
        ['status', `\`${report.preflightContract.status}\``],
        ['selectedSource', `\`${report.preflightContract.selectedSource}\``],
        ['selectedDecision', `\`${report.preflightContract.selectedDecision}\``],
        ['readyForApprovalGate', `\`${report.preflightContract.readyForApprovalGate}\``],
        ['targetSectionId', `\`${report.preflightContract.targetSectionId ?? '-'}\``],
        ['generatedAt', `\`${report.preflightContract.generatedAt ?? '-'}\``],
        ['sourceDataWritePerformed', `\`${report.preflightContract.sourceDataWritePerformed}\``],
        ['writesOperatorInput', `\`${report.preflightContract.writesOperatorInput}\``],
        ['writesProductionData', `\`${report.preflightContract.writesProductionData}\``],
      ],
    ),
    '',
    '## Review Evidence Contract',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['requiredEvidenceVersion', `\`${report.reviewEvidenceContract.requiredEvidenceVersion}\``],
        ['actualEvidenceVersion', `\`${report.reviewEvidenceContract.actualEvidenceVersion ?? '-'}\``],
        ['requiredOfficialImageSha256', `\`${report.reviewEvidenceContract.requiredOfficialImageSha256}\``],
        ['actualOfficialImageSha256', `\`${report.reviewEvidenceContract.actualOfficialImageSha256 ?? '-'}\``],
        ['requiredMapVersion', `\`${report.reviewEvidenceContract.requiredMapVersion}\``],
        ['actualMapVersion', `\`${report.reviewEvidenceContract.actualMapVersion ?? '-'}\``],
        ['candidateReferenceOnly', `\`${report.reviewEvidenceContract.candidateReferenceOnly}\``],
        ['requiredReviewAssertions', `\`${report.reviewEvidenceContract.requiredReviewAssertions.join(' | ') || '-'}\``],
        ['cannotAutoApproveReasons', `\`${report.reviewEvidenceContract.cannotAutoApproveReasons.join(' | ') || '-'}\``],
      ],
    ),
    '',
    '## Source Comparison',
    '',
    `- sourceConflictRule: \`${report.sourceComparison.sourceConflictRule}\``,
    `- exactMatchRequiredWhenMultipleSourcesHaveEditableValues: \`${report.sourceComparison.exactMatchRequiredWhenMultipleSourcesHaveEditableValues}\``,
    `- sourceFingerprintFields: \`${SOURCE_FINGERPRINT_FIELDS.join('`, `')}\``,
    '',
    '## Input Sources',
    '',
    markdownTable(
      ['source', 'section', 'decision', 'has editable input', 'fingerprint', 'points', 'label', 'reviewer', 'reviewedAt'],
      report.sources.map((entry) => [
        `\`${entry.source}\``,
        `\`${entry.sectionId || '-'}\``,
        `\`${entry.operatorDecision}\``,
        `\`${entry.hasEditableApprovalValue}\``,
        `\`${entry.approvalFingerprint}\``,
        `\`${entry.correctedPointCount}\``,
        `\`${entry.correctedLabelX ?? '-'},${entry.correctedLabelY ?? '-'}\``,
        entry.reviewer || '-',
        entry.reviewedAt || '-',
      ]),
    ),
    '',
    '## Geometry Review',
    '',
    geometryReview
      ? markdownTable(
        ['field', 'value'],
        [
          ['correctedPointCount', `\`${geometryReview.correctedPointCount}\``],
          ['currentHitPointCount', `\`${geometryReview.currentHitPointCount}\``],
          ['pointCountDelta', `\`${geometryReview.pointCountDelta}\``],
          ['correctedArea', `\`${geometryReview.correctedArea}\``],
          ['currentHitArea', `\`${geometryReview.currentHitArea}\``],
          ['areaRatioVsCurrentHit', `\`${geometryReview.areaRatioVsCurrentHit ?? '-'}\``],
          ['boundsMaxAbsDelta', `\`${geometryReview.boundsMaxAbsDelta ?? '-'}\``],
          ['labelInside', `\`${geometryReview.labelInside}\``],
          ['labelBoundaryDistance', `\`${geometryReview.labelBoundaryDistance ?? '-'}\``],
          ['validationIssueCodes', `\`${geometryReview.validationIssueCodes.join(',') || 'none'}\``],
          ['correctedPathWithinViewBox', `\`${geometryReview.imageCoordinateValidation.correctedPathWithinViewBox}\``],
          ['correctedPathSelfIntersectionFree', `\`${geometryReview.imageCoordinateValidation.correctedPathSelfIntersectionFree}\``],
          ['labelWithinViewBox', `\`${geometryReview.imageCoordinateValidation.labelWithinViewBox}\``],
          ['labelInsideOrWithinTolerance', `\`${geometryReview.imageCoordinateValidation.labelInsideOrWithinTolerance}\``],
          ['reusesCurrentHitPath', `\`${geometryReview.reusesCurrentHitPath}\``],
        ],
      )
      : 'No APPROVED target geometry is available for validation.',
    '',
    '## Prewrite Contract',
    '',
    `- targetSourceFile: \`${TARGET_SOURCE_FILE}\``,
    `- writableSourceFields: \`${WRITABLE_SOURCE_FIELDS.join('`, `')}\``,
    `- lockedSourceFields: \`${LOCKED_SOURCE_FIELDS.join('`, `')}\``,
    `- manualPatchAllowedOnlyAfter: \`${report.prewriteContract.manualPatchAllowedOnlyAfter}\``,
    '- command chain:',
    ...prewriteCommandChain.map((command) => `  - \`${command}\``),
    '',
    '## Outputs',
    '',
    `- \`${relativePath(jsonPath)}\``,
    `- \`${relativePath(markdownPath)}\``,
    '',
    '## Blockers',
    '',
    ...(blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``) : ['- none']),
    '',
    '## Warnings',
    '',
    ...(warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``) : ['- none']),
    '',
  ].join('\n');
  await fs.writeFile(`${markdownPath}.tmp`, markdown, 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(`stage01_target_approval_gate_json:${relativePath(jsonPath)}`);
  console.log(`stage01_target_approval_gate_markdown:${relativePath(markdownPath)}`);
  console.log(
    `status:${summary.status} target=${summary.targetSectionId} source=${summary.selectedSource} decision=${summary.selectedDecision} readyForPrewrite=${summary.readyForPrewrite} targetEntryPreflight=${summary.targetEntryPreflightStatus}:${summary.targetEntryPreflightSelectedDecision} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`,
  );

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01TargetEntryPreflightSmoke = async () => {
  const { spawnSync } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const SMOKE_VERSION = 'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_SMOKE_V1';
  const PREFLIGHT_VERSION = 'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_V1';
  const PREFLIGHT_SCRIPT = 'scripts/sajik-seatmap-stage01.mjs';
  const TARGET_REVIEW_PACKET_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1';
  const TARGET_REVIEW_EVIDENCE_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1';
  const OPERATOR_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const TARGET_SECTION_ID = '131';
  const OFFICIAL_IMAGE_SHA256 = 'e9cb51ccf57a754ddf066a95c6c789d65edf8dff167f432fd35fe809e9dc80aa';
  const MAP_VERSION = 'BUSAN_SAJIK_2026_MANUAL_POLYGON_V2';
  const CURRENT_HIT_PATH = 'M 666 484 L 694 483 L 703 484 L 704 491 L 700 493 L 674 493 L 666 491 Z';
  const CURRENT_LABEL_POINT = [683, 489];
  const SELF_INTERSECTING_PATH = 'M 666 484 L 704 493 L 666 493 L 704 484 Z';

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const stageDir = path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator');
  const smokeRoot = path.join(stageDir, 'target-entry-preflight-smoke', `run-${Date.now()}-${process.pid}`);
  const smokeJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-target-entry-preflight-smoke.json');
  const smokeMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-target-entry-preflight-smoke.md');

  function formatRelative(filePath) {
    return path.relative(frontendRoot, filePath);
  }

  async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  }

  async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  function buildTargetReviewPacket() {
    return {
      generatedAt: new Date().toISOString(),
      summary: {
        packetVersion: TARGET_REVIEW_PACKET_VERSION,
        evidenceVersion: TARGET_REVIEW_EVIDENCE_VERSION,
        status: 'waiting-for-operator',
        targetStage: TARGET_STAGE_LABEL,
        targetSectionId: TARGET_SECTION_ID,
        officialImageSha256: OFFICIAL_IMAGE_SHA256,
        mapVersion: MAP_VERSION,
        matchesNextOperatorSection: true,
        nextOperatorSectionId: TARGET_SECTION_ID,
        targetImagePriorityRank: 1,
        targetImageRiskLevel: 'HIGH',
        targetImageBbox: '682,485,684,490',
        productionWriteAllowed: false,
        sourceDataWritePerformed: false,
        writesOperatorInput: false,
        writesProductionData: false,
        blockers: [],
        warnings: [],
      },
      officialPngEvidence: {
        evidenceVersion: TARGET_REVIEW_EVIDENCE_VERSION,
        targetSectionId: TARGET_SECTION_ID,
        officialImageSha256: OFFICIAL_IMAGE_SHA256,
        mapVersion: MAP_VERSION,
        coordinateSystem: 'SVG viewBox 0 0 960 640',
        viewBox: '0 0 960 640',
        targetViewport: {
          minX: 615,
          minY: 433,
          width: 140,
          height: 110,
          viewBox: '615 433 140 110',
        },
        pixelComponentReference: {
          candidateReferenceOnly: true,
        },
        requiredReviewAssertions: [
          'Opened the target review overlay SVG with the official PNG background visible.',
        ],
        cannotAutoApproveReasons: [
          'targetImageRiskLevel is HIGH.',
        ],
        sourceFieldPolicy: {
          targetSourceFile: 'src/data/sajikSeatData.ts',
          productionWriteAllowed: false,
          sourceDataWritePerformed: false,
        },
      },
      target: {
        sectionId: TARGET_SECTION_ID,
        currentHitPath: CURRENT_HIT_PATH,
        currentVisualPath: CURRENT_HIT_PATH,
        currentLabelPoint: CURRENT_LABEL_POINT,
      },
    };
  }

  function buildPendingEntry(overrides = {}) {
    return {
      sectionId: TARGET_SECTION_ID,
      operatorDecision: 'PENDING',
      correctedPath: '',
      correctedLabelX: '',
      correctedLabelY: '',
      reviewer: '',
      reviewedAt: '',
      operatorNote: '',
      ...overrides,
    };
  }

  function buildApprovedEntry(overrides = {}) {
    return {
      sectionId: TARGET_SECTION_ID,
      operatorDecision: 'APPROVED',
      correctedPath: CURRENT_HIT_PATH,
      correctedLabelX: CURRENT_LABEL_POINT[0],
      correctedLabelY: CURRENT_LABEL_POINT[1],
      reviewer: 'operator-smoke',
      reviewedAt: '2026-05-16T00:00:00.000Z',
      operatorNote: 'official PNG manual trace',
      ...overrides,
    };
  }

  function buildOperatorInput(entry = buildPendingEntry()) {
    return {
      generatedAt: new Date().toISOString(),
      packageVersion: OPERATOR_PACKAGE_VERSION,
      status: 'waiting-for-operator',
      targetStage: TARGET_STAGE_LABEL,
      corrections: [entry],
    };
  }

  async function writeFixture(caseDir, { operatorEntry = buildPendingEntry(), targetEntry = buildPendingEntry(), mutateTargetReviewPacket }) {
    const targetDir = path.join(caseDir, 'targets');
    const targetReviewPacket = buildTargetReviewPacket();
    if (mutateTargetReviewPacket) {
      mutateTargetReviewPacket(targetReviewPacket);
    }
    await writeJson(path.join(targetDir, '131-review-packet.json'), targetReviewPacket);
    await writeJson(path.join(targetDir, '131-entry-template.json'), targetEntry);
    await writeJson(path.join(caseDir, 'sajik-seatmap-stage01-operator-input.json'), buildOperatorInput(operatorEntry));
  }

  function runPreflight(caseDir) {
    return spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        path.join(frontendRoot, PREFLIGHT_SCRIPT),
        '--stage-dir',
        caseDir,
      ],
      {
        cwd: frontendRoot,
        encoding: 'utf8',
      },
    );
  }

  async function runCase(caseSpec) {
    const caseDir = path.join(smokeRoot, caseSpec.caseId);
    await writeFixture(caseDir, caseSpec);
    const result = runPreflight(caseDir);
    const reportPath = path.join(caseDir, 'targets/131-entry-preflight.json');
    const report = await readJson(reportPath).catch(() => null);
    const blockers = report?.summary?.blockers ?? [];
    const warnings = report?.summary?.warnings ?? [];
    const passed = result.status === caseSpec.expectedExit
      && report?.summary?.preflightVersion === PREFLIGHT_VERSION
      && report?.summary?.status === caseSpec.expectedStatus
      && report?.summary?.selectedDecision === caseSpec.expectedDecision
      && report?.summary?.readyForApprovalGate === caseSpec.expectedReadyForApprovalGate
      && caseSpec.expectedBlockers.every((code) => blockers.some((blocker) => blocker.includes(code)))
      && caseSpec.expectedWarnings.every((code) => warnings.some((warning) => warning.includes(code)))
      && report?.summary?.sourceDataWritePerformed === false
      && report?.summary?.writesOperatorInput === false
      && report?.summary?.writesProductionData === false;

    return {
      caseId: caseSpec.caseId,
      passed,
      expectedExit: caseSpec.expectedExit,
      actualExit: result.status,
      expectedStatus: caseSpec.expectedStatus,
      actualStatus: report?.summary?.status ?? 'missing',
      actualPreflightVersion: report?.summary?.preflightVersion ?? 'missing',
      expectedDecision: caseSpec.expectedDecision,
      actualDecision: report?.summary?.selectedDecision ?? 'missing',
      expectedReadyForApprovalGate: caseSpec.expectedReadyForApprovalGate,
      actualReadyForApprovalGate: report?.summary?.readyForApprovalGate ?? false,
      expectedBlockers: caseSpec.expectedBlockers,
      actualBlockers: blockers,
      expectedWarnings: caseSpec.expectedWarnings,
      actualWarnings: warnings,
      sourceDataWritePerformed: report?.summary?.sourceDataWritePerformed ?? null,
      writesOperatorInput: report?.summary?.writesOperatorInput ?? null,
      writesProductionData: report?.summary?.writesProductionData ?? null,
      report: formatRelative(reportPath),
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  }

  function buildMarkdown(report) {
    return `${[
      '# Sajik Stage 01 Target Entry Preflight Smoke',
      '',
      `- status: \`${report.status}\``,
      `- cases: \`${report.passedCases}/${report.totalCases}\``,
      `- smokeRoot: \`${report.smokeRoot}\``,
      `- sourceDataWritePerformed: \`${report.sourceDataWritePerformed}\``,
      `- writesOperatorInput: \`${report.writesOperatorInput}\``,
      `- writesProductionData: \`${report.writesProductionData}\``,
      '',
      '| Case | Status | Decision | Ready | Expected Blockers | Actual Blockers | Expected Warnings | Actual Warnings |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
      ...report.cases.map((row) => [
        row.caseId,
        row.passed ? 'passed' : 'failed',
        row.actualDecision,
        String(row.actualReadyForApprovalGate),
        row.expectedBlockers.join(', ') || '-',
        row.actualBlockers.join('<br>') || '-',
        row.expectedWarnings.join(', ') || '-',
        row.actualWarnings.join('<br>') || '-',
      ]).map((columns) => `| ${columns.join(' | ')} |`),
    ].join('\n')}\n`;
  }

  async function main() {
    const cases = [
      {
        caseId: 'pending-no-input',
        expectedExit: 0,
        expectedStatus: 'waiting-for-operator',
        expectedDecision: 'PENDING',
        expectedReadyForApprovalGate: false,
        expectedBlockers: [],
        expectedWarnings: [],
      },
      {
        caseId: 'approved-valid-target-entry',
        targetEntry: buildApprovedEntry(),
        expectedExit: 0,
        expectedStatus: 'ready-for-approval-gate',
        expectedDecision: 'APPROVED',
        expectedReadyForApprovalGate: true,
        expectedBlockers: [],
        expectedWarnings: [],
      },
      {
        caseId: 'approved-missing-label',
        targetEntry: buildApprovedEntry({ correctedLabelX: '', correctedLabelY: '' }),
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'APPROVED',
        expectedReadyForApprovalGate: false,
        expectedBlockers: ['APPROVAL_FIELD_REQUIRED:target-entry-template:correctedLabelX'],
        expectedWarnings: [],
      },
      {
        caseId: 'path-only-pending',
        targetEntry: buildPendingEntry({ correctedPath: CURRENT_HIT_PATH }),
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'PENDING',
        expectedReadyForApprovalGate: false,
        expectedBlockers: ['PARTIAL_APPROVAL_INPUT_PATH_WITHOUT_LABEL'],
        expectedWarnings: [],
      },
      {
        caseId: 'label-only-pending',
        targetEntry: buildPendingEntry({ correctedLabelX: 683, correctedLabelY: 489 }),
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'PENDING',
        expectedReadyForApprovalGate: false,
        expectedBlockers: ['PARTIAL_APPROVAL_INPUT_LABEL_WITHOUT_PATH'],
        expectedWarnings: [],
      },
      {
        caseId: 'operator-input-vs-target-entry-conflict',
        operatorEntry: buildApprovedEntry(),
        targetEntry: buildApprovedEntry({ correctedLabelX: 684 }),
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'PENDING',
        expectedReadyForApprovalGate: false,
        expectedBlockers: ['TARGET_ENTRY_SOURCE_CONFLICT'],
        expectedWarnings: [],
      },
      {
        caseId: 'invalid-reviewed-at',
        targetEntry: buildApprovedEntry({ reviewedAt: 'not-a-date' }),
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'APPROVED',
        expectedReadyForApprovalGate: false,
        expectedBlockers: ['REVIEWED_AT_INVALID_DATE'],
        expectedWarnings: [],
      },
      {
        caseId: 'locked-field-target-entry',
        targetEntry: buildPendingEntry({ visualPath: CURRENT_HIT_PATH }),
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'PENDING',
        expectedReadyForApprovalGate: false,
        expectedBlockers: ['TARGET_ENTRY_LOCKED_FIELD_PRESENT:visualPath'],
        expectedWarnings: [],
      },
      {
        caseId: 'evidence-hash-drift',
        mutateTargetReviewPacket: (packet) => {
          packet.officialPngEvidence.officialImageSha256 = 'hash-drift';
        },
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'PENDING',
        expectedReadyForApprovalGate: false,
        expectedBlockers: ['TARGET_REVIEW_EVIDENCE_HASH_MISMATCH'],
        expectedWarnings: [],
      },
      {
        caseId: 'pixel-candidate-copy-note-warning',
        targetEntry: buildApprovedEntry({ operatorNote: 'copied pixel candidate reference after official review' }),
        expectedExit: 0,
        expectedStatus: 'ready-for-approval-gate',
        expectedDecision: 'APPROVED',
        expectedReadyForApprovalGate: true,
        expectedBlockers: [],
        expectedWarnings: ['OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW'],
      },
      {
        caseId: 'self-intersection-path',
        targetEntry: buildApprovedEntry({ correctedPath: SELF_INTERSECTING_PATH }),
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'APPROVED',
        expectedReadyForApprovalGate: false,
        expectedBlockers: ['CORRECTED_PATH_SELF_INTERSECTION'],
        expectedWarnings: [],
      },
      {
        caseId: 'locked-field-operator-input',
        operatorEntry: buildPendingEntry({ hitPath: CURRENT_HIT_PATH }),
        expectedExit: 1,
        expectedStatus: 'blocked',
        expectedDecision: 'PENDING',
        expectedReadyForApprovalGate: false,
        expectedBlockers: ['OPERATOR_INPUT_LOCKED_FIELD_PRESENT:hitPath'],
        expectedWarnings: [],
      },
    ];

    const caseResults = [];
    for (const caseSpec of cases) {
      caseResults.push(await runCase(caseSpec));
    }

    const passedCases = caseResults.filter((row) => row.passed).length;
    const report = {
      version: SMOKE_VERSION,
      status: passedCases === caseResults.length ? 'passed' : 'failed',
      generatedAt: new Date().toISOString(),
      smokeRoot: formatRelative(smokeRoot),
      totalCases: caseResults.length,
      passedCases,
      failedCases: caseResults.length - passedCases,
      sourceDataWritePerformed: caseResults.some((row) => row.sourceDataWritePerformed !== false),
      writesOperatorInput: caseResults.some((row) => row.writesOperatorInput !== false),
      writesProductionData: caseResults.some((row) => row.writesProductionData !== false),
      cases: caseResults,
    };

    await writeJson(smokeJsonPath, report);
    await fs.writeFile(smokeMarkdownPath, buildMarkdown(report), 'utf8');

    console.log(`stage01_target_entry_preflight_smoke_json:${formatRelative(smokeJsonPath)}`);
    console.log(`stage01_target_entry_preflight_smoke_markdown:${formatRelative(smokeMarkdownPath)}`);
    console.log(
      `status:${report.status} cases=${report.passedCases}/${report.totalCases} sourceDataWritePerformed=${report.sourceDataWritePerformed} writesOperatorInput=${report.writesOperatorInput} writesProductionData=${report.writesProductionData}`,
    );

    if (report.status !== 'passed') {
      process.exitCode = 1;
    }
  }

  main().catch(async (error) => {
    const report = {
      version: SMOKE_VERSION,
      status: 'failed',
      generatedAt: new Date().toISOString(),
      smokeRoot: formatRelative(smokeRoot),
      totalCases: 0,
      passedCases: 0,
      failedCases: 0,
      sourceDataWritePerformed: false,
      writesOperatorInput: false,
      writesProductionData: false,
      cases: [],
      issues: [
        {
          code: 'TARGET_ENTRY_PREFLIGHT_SMOKE_CRASHED',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
    await writeJson(smokeJsonPath, report).catch(() => {});
    await fs.writeFile(smokeMarkdownPath, buildMarkdown(report), 'utf8').catch(() => {});
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
};

const runStage01TargetEntryPreflight = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { pathToPoints, validateSeatMapPolygonPathIssues } = await import("../src/utils/seatMapPolygonValidator.ts");

  const PREFLIGHT_VERSION = 'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_V1';
  const SCRIPT_NAME = 'sajik-seatmap-stage01.mjs';
  const REQUIRED_TARGET_REVIEW_PACKET_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1';
  const REQUIRED_TARGET_REVIEW_EVIDENCE_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1';
  const REQUIRED_OPERATOR_PACKAGE_VERSION = 'SAJIK_STAGE01_OPERATOR_PACKAGE_V1';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const DEFAULT_TARGET_SECTION_ID = '131';
  const DEFAULT_TARGET_REVIEW_PACKET_FILE = '131-review-packet.json';
  const DEFAULT_TARGET_ENTRY_TEMPLATE_FILE = '131-entry-template.json';
  const DEFAULT_TARGET_ENTRY_PREFLIGHT_JSON_FILE = '131-entry-preflight.json';
  const DEFAULT_TARGET_ENTRY_PREFLIGHT_MARKDOWN_FILE = '131-entry-preflight.md';
  const OPERATOR_INPUT_JSON_FILE = 'sajik-seatmap-stage01-operator-input.json';
  const STAGE01_IMAGE_PRIORITY_SECTION_IDS = [
    '131',
    '032',
    '135',
    '132',
    '031',
    '133',
    '022',
    '143',
    '134',
    '142',
    '121',
    '124',
    '125',
    '122',
    '021',
    '123',
  ];
  const IMAGE_WIDTH = 960;
  const IMAGE_HEIGHT = 640;
  const OFFICIAL_IMAGE_SHA256 = 'e9cb51ccf57a754ddf066a95c6c789d65edf8dff167f432fd35fe809e9dc80aa';
  const MAP_VERSION = 'BUSAN_SAJIK_2026_MANUAL_POLYGON_V2';
  const DECISION_OPTIONS = new Set(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT']);
  const APPROVED_REQUIRED_FIELDS = [
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const EDITABLE_SOURCE_FIELDS = [
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const SOURCE_FINGERPRINT_FIELDS = ['sectionId', ...EDITABLE_SOURCE_FIELDS];
  const TARGET_ENTRY_FORBIDDEN_FIELDS = [
    'imageGeometry',
    'visualPath',
    'hitPath',
    'labelPoint',
    'labelX',
    'labelY',
    'geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
  ];
  const OPERATOR_INPUT_FORBIDDEN_FIELDS = [
    'imageGeometry',
    'visualPath',
    'hitPath',
    'labelPoint',
    'labelX',
    'labelY',
    'geometryVersion',
    'markerType',
    'traceSource',
    'traceMethod',
    'traceVersion',
  ];
  const LOCKED_SOURCE_FIELDS = [
    'imageGeometry.visualPath',
    'imageGeometry.geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
  ];
  const WRITABLE_SOURCE_FIELDS = [
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.labelX',
    'imageGeometry.labelY',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const stageDir = path.resolve(
    frontendRoot,
    argValue('--stage-dir', path.join('reports/stadium/sajik-stage01-operator')),
  );
  const targetSectionId = String(argValue('--target', argValue('--section', DEFAULT_TARGET_SECTION_ID))).trim();
  const targetDir = path.join(stageDir, 'targets');
  const defaultTargetFile = (defaultFile, suffix) => (
    targetSectionId === DEFAULT_TARGET_SECTION_ID ? defaultFile : `${targetSectionId}-${suffix}`
  );
  const targetReviewPacketPath = path.resolve(
    frontendRoot,
    argValue('--target-review-packet', path.join(targetDir, defaultTargetFile(DEFAULT_TARGET_REVIEW_PACKET_FILE, 'review-packet.json'))),
  );
  const targetEntryPath = path.resolve(
    frontendRoot,
    argValue('--target-entry', path.join(targetDir, defaultTargetFile(DEFAULT_TARGET_ENTRY_TEMPLATE_FILE, 'entry-template.json'))),
  );
  const operatorInputPath = path.resolve(
    frontendRoot,
    argValue('--operator-input', path.join(stageDir, OPERATOR_INPUT_JSON_FILE)),
  );
  const jsonPath = path.join(targetDir, defaultTargetFile(DEFAULT_TARGET_ENTRY_PREFLIGHT_JSON_FILE, 'entry-preflight.json'));
  const markdownPath = path.join(targetDir, defaultTargetFile(DEFAULT_TARGET_ENTRY_PREFLIGHT_MARKDOWN_FILE, 'entry-preflight.md'));

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const readOptionalJson = async (filePath) => {
    try {
      return await readJson(filePath);
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
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

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);

  const normalizeDecision = (value) => String(value ?? 'PENDING').trim() || 'PENDING';
  const normalizePath = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const fieldMissing = (value) => value === '' || value === null || value === undefined;

  const numberOrNull = (value) => {
    if (fieldMissing(value)) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const hasAnyRawLabel = (entry) => !fieldMissing(entry.correctedLabelXRaw)
    || !fieldMissing(entry.correctedLabelYRaw);

  const hasBothNumericLabels = (entry) => entry.correctedLabelX !== null && entry.correctedLabelY !== null;

  const noteSuggestsPixelCandidateCopy = (value) => {
    const note = String(value ?? '').toLowerCase();
    if (!note.includes('pixel') || !note.includes('candidate')) return false;
    return /(copy|copied|paste|pasted|복사|붙여넣)/i.test(note);
  };

  const forbiddenFieldsFor = (row, source) => {
    const directKeys = new Set(Object.keys(row ?? {}));
    const forbiddenFieldList = source === 'target-entry-template'
      ? TARGET_ENTRY_FORBIDDEN_FIELDS
      : OPERATOR_INPUT_FORBIDDEN_FIELDS;
    return forbiddenFieldList.filter((field) => directKeys.has(field));
  };

  const normalizeEntry = (row, source) => {
    const correctedLabelX = numberOrNull(row?.correctedLabelX);
    const correctedLabelY = numberOrNull(row?.correctedLabelY);
    return {
      source,
      exists: Boolean(row),
      sectionId: String(row?.sectionId ?? '').trim(),
      operatorDecision: normalizeDecision(row?.operatorDecision),
      correctedPath: normalizePath(row?.correctedPath),
      correctedLabelXRaw: row?.correctedLabelX,
      correctedLabelYRaw: row?.correctedLabelY,
      correctedLabelX,
      correctedLabelY,
      reviewer: String(row?.reviewer ?? '').trim(),
      reviewedAt: String(row?.reviewedAt ?? '').trim(),
      operatorNote: String(row?.operatorNote ?? '').trim(),
      forbiddenFields: forbiddenFieldsFor(row, source),
    };
  };

  const hasEditableApprovalValue = (entry) => entry.operatorDecision !== 'PENDING'
    || entry.correctedPath
    || !fieldMissing(entry.correctedLabelXRaw)
    || !fieldMissing(entry.correctedLabelYRaw)
    || entry.reviewer
    || entry.reviewedAt
    || entry.operatorNote;

  const entryFingerprint = (entry) => JSON.stringify({
    sectionId: entry.sectionId,
    operatorDecision: entry.operatorDecision,
    correctedPath: entry.correctedPath,
    correctedLabelX: entry.correctedLabelX,
    correctedLabelY: entry.correctedLabelY,
    reviewer: entry.reviewer,
    reviewedAt: entry.reviewedAt,
    operatorNote: entry.operatorNote,
  });

  const sourceComparisonEntry = (entry) => ({
    source: entry.source,
    exists: entry.exists,
    sectionId: entry.sectionId,
    operatorDecision: entry.operatorDecision,
    hasEditableApprovalValue: hasEditableApprovalValue(entry),
    fingerprint: entryFingerprint(entry),
    correctedPointCount: entry.correctedPath ? pathToPoints(entry.correctedPath).length : 0,
    correctedLabelX: entry.correctedLabelX,
    correctedLabelY: entry.correctedLabelY,
    hasCorrectedPath: Boolean(entry.correctedPath),
    hasAnyRawLabel: hasAnyRawLabel(entry),
    hasBothNumericLabels: hasBothNumericLabels(entry),
    reviewerPresent: Boolean(entry.reviewer),
    reviewedAtPresent: Boolean(entry.reviewedAt),
    forbiddenFields: entry.forbiddenFields,
  });

  const actionForBlocker = (blocker) => {
    if (blocker.includes('APPROVAL_FIELD_REQUIRED')) return 'Fill the missing APPROVED field before approval gate.';
    if (blocker.includes('PARTIAL_APPROVAL_INPUT')) return 'Complete both correctedPath and correctedLabelX/Y, or clear the partial values.';
    if (blocker.includes('TARGET_ENTRY_LOCKED_FIELD_PRESENT')) return 'Remove locked source fields from 131-entry-template.json; only editable operator fields belong there.';
    if (blocker.includes('OPERATOR_INPUT_LOCKED_FIELD_PRESENT')) return 'Remove direct source patch fields from the operator input row; use correctedPath and correctedLabelX/Y only.';
    if (blocker.includes('SOURCE_CONFLICT')) return 'Make the target entry template and operator input editable values match exactly, or clear one source.';
    if (blocker.includes('EVIDENCE')) return 'Regenerate target review packet from the official Sajik PNG before accepting operator input.';
    if (blocker.includes('CORRECTED_PATH_')) return 'Fix correctedPath geometry before running approval gate.';
    if (blocker.includes('APPROVAL_FIELD_INVALID_NUMBER')) return 'Use finite numeric correctedLabelX and correctedLabelY values.';
    if (blocker.includes('REVIEWED_AT_INVALID_DATE')) return 'Use an ISO-compatible reviewedAt timestamp.';
    return 'Review the target entry preflight report before running approval gate.';
  };

  const validateEntry = (entry, blockers, warnings) => {
    if (!entry.exists) return;
    if (entry.sectionId && entry.sectionId !== targetSectionId) {
      blockers.push(`TARGET_ENTRY_SECTION_MISMATCH:${entry.source}:${entry.sectionId}:${targetSectionId}`);
    }
    if (entry.source === 'target-entry-template' && entry.forbiddenFields.length > 0) {
      blockers.push(`TARGET_ENTRY_LOCKED_FIELD_PRESENT:${entry.forbiddenFields.join(':')}`);
    }
    if (entry.source === 'operator-input' && entry.forbiddenFields.length > 0) {
      blockers.push(`OPERATOR_INPUT_LOCKED_FIELD_PRESENT:${entry.forbiddenFields.join(':')}`);
    }
    if (!hasEditableApprovalValue(entry)) return;
    if (!DECISION_OPTIONS.has(entry.operatorDecision)) {
      blockers.push(`INVALID_OPERATOR_DECISION:${entry.source}:${entry.operatorDecision}`);
    }
    if (entry.operatorDecision === 'PENDING') {
      blockers.push(`PENDING_ROW_HAS_EDITABLE_FIELDS:${entry.source}`);
    }
    if (entry.correctedPath && !hasAnyRawLabel(entry)) {
      blockers.push(`PARTIAL_APPROVAL_INPUT_PATH_WITHOUT_LABEL:${entry.source}`);
    }
    if (!entry.correctedPath && hasAnyRawLabel(entry)) {
      blockers.push(`PARTIAL_APPROVAL_INPUT_LABEL_WITHOUT_PATH:${entry.source}`);
    }
    if (!fieldMissing(entry.correctedLabelXRaw) && entry.correctedLabelX === null) {
      blockers.push(`APPROVAL_FIELD_INVALID_NUMBER:${entry.source}:correctedLabelX`);
    }
    if (!fieldMissing(entry.correctedLabelYRaw) && entry.correctedLabelY === null) {
      blockers.push(`APPROVAL_FIELD_INVALID_NUMBER:${entry.source}:correctedLabelY`);
    }
    if (entry.operatorDecision === 'APPROVED') {
      APPROVED_REQUIRED_FIELDS.forEach((field) => {
        if (fieldMissing(entry[field])) {
          blockers.push(`APPROVAL_FIELD_REQUIRED:${entry.source}:${field}`);
        }
      });
    }
    if (entry.reviewedAt && Number.isNaN(Date.parse(entry.reviewedAt))) {
      blockers.push(`REVIEWED_AT_INVALID_DATE:${entry.source}`);
    }
    if (entry.correctedPath) {
      const labelPoint = hasBothNumericLabels(entry)
        ? [entry.correctedLabelX, entry.correctedLabelY]
        : undefined;
      const issues = validateSeatMapPolygonPathIssues({
        pathData: entry.correctedPath,
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        labelPoint,
        labelTolerance: 1,
        sectionId: targetSectionId,
        pathKind: 'correctedPath',
      });
      blockers.push(...issues.map((issue) => `CORRECTED_PATH_${issue.code}:${entry.source}`));
    }
    if (noteSuggestsPixelCandidateCopy(entry.operatorNote)) {
      warnings.push(`OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW:${entry.source}`);
    }
  };

  const sourcePolicy = {
    allowedCoordinateSource: 'operator-provided official 2026 Sajik PNG coordinates only',
    coordinateSystem: 'SVG viewBox 0 0 960 640',
    targetPreflightOnly: true,
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    disallowedSources: [
      'pixel candidate path copy without operator approval',
      'AI coordinate prediction',
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
  };

  const targetReviewPacket = await readJson(targetReviewPacketPath);
  const targetEntry = await readOptionalJson(targetEntryPath);
  const operatorInput = await readOptionalJson(operatorInputPath);
  const operatorInputRows = Array.isArray(operatorInput?.corrections) ? operatorInput.corrections : [];
  const operatorInputRow = operatorInputRows.find((row) => String(row.sectionId ?? '').trim() === targetSectionId);
  const blockers = [];
  const warnings = [];

  if (!STAGE01_IMAGE_PRIORITY_SECTION_IDS.includes(targetSectionId)) {
    blockers.push(`TARGET_NOT_IN_STAGE01_P0_SCOPE:${targetSectionId}`);
  }
  if (targetReviewPacket.summary?.packetVersion !== REQUIRED_TARGET_REVIEW_PACKET_VERSION) {
    blockers.push(`TARGET_REVIEW_PACKET_VERSION_MISMATCH:${targetReviewPacket.summary?.packetVersion ?? 'missing'}`);
  }
  if (targetReviewPacket.summary?.evidenceVersion !== REQUIRED_TARGET_REVIEW_EVIDENCE_VERSION
    || targetReviewPacket.officialPngEvidence?.evidenceVersion !== REQUIRED_TARGET_REVIEW_EVIDENCE_VERSION) {
    blockers.push(`TARGET_REVIEW_EVIDENCE_VERSION_MISMATCH:${targetReviewPacket.summary?.evidenceVersion ?? 'missing'}:${targetReviewPacket.officialPngEvidence?.evidenceVersion ?? 'missing'}`);
  }
  if (targetReviewPacket.summary?.officialImageSha256 !== OFFICIAL_IMAGE_SHA256
    || targetReviewPacket.officialPngEvidence?.officialImageSha256 !== OFFICIAL_IMAGE_SHA256) {
    blockers.push(`TARGET_REVIEW_EVIDENCE_HASH_MISMATCH:${targetReviewPacket.summary?.officialImageSha256 ?? 'missing'}:${targetReviewPacket.officialPngEvidence?.officialImageSha256 ?? 'missing'}`);
  }
  if (targetReviewPacket.summary?.mapVersion !== MAP_VERSION
    || targetReviewPacket.officialPngEvidence?.mapVersion !== MAP_VERSION) {
    blockers.push(`TARGET_REVIEW_EVIDENCE_MAP_VERSION_MISMATCH:${targetReviewPacket.summary?.mapVersion ?? 'missing'}:${targetReviewPacket.officialPngEvidence?.mapVersion ?? 'missing'}`);
  }
  if (String(targetReviewPacket.summary?.targetSectionId ?? '').trim() !== targetSectionId) {
    blockers.push(`TARGET_REVIEW_SECTION_MISMATCH:${targetReviewPacket.summary?.targetSectionId ?? 'missing'}:${targetSectionId}`);
  }
  if (targetReviewPacket.summary?.productionWriteAllowed !== false || targetReviewPacket.summary?.sourceDataWritePerformed !== false) {
    blockers.push('TARGET_REVIEW_PACKET_WRITE_FLAGS_NOT_FALSE');
  }
  if (targetReviewPacket.officialPngEvidence?.pixelComponentReference?.candidateReferenceOnly !== true) {
    blockers.push('TARGET_REVIEW_PIXEL_COMPONENT_NOT_REFERENCE_ONLY');
  }
  if (operatorInput && operatorInput.packageVersion !== REQUIRED_OPERATOR_PACKAGE_VERSION) {
    blockers.push(`OPERATOR_INPUT_PACKAGE_VERSION_MISMATCH:${operatorInput.packageVersion ?? 'missing'}`);
  }
  if (operatorInput && operatorInput.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push(`OPERATOR_INPUT_STAGE_MISMATCH:${operatorInput.targetStage ?? 'missing'}`);
  }
  if (!targetEntry) warnings.push(`TARGET_ENTRY_TEMPLATE_MISSING:${relativePath(targetEntryPath)}`);
  if (!operatorInputRow) warnings.push(`TARGET_OPERATOR_INPUT_ROW_MISSING:${targetSectionId}`);

  const sourceEntries = [
    normalizeEntry(operatorInputRow, 'operator-input'),
    normalizeEntry(targetEntry, 'target-entry-template'),
  ];
  sourceEntries.forEach((entry) => validateEntry(entry, blockers, warnings));

  const meaningfulEntries = sourceEntries.filter(hasEditableApprovalValue);
  let selectedEntry = null;
  let selectedSource = 'none';
  const selectedSourceConflicts = [];
  if (meaningfulEntries.length === 1) {
    [selectedEntry] = meaningfulEntries;
    selectedSource = selectedEntry.source;
  } else if (meaningfulEntries.length > 1) {
    const [firstEntry, ...otherEntries] = meaningfulEntries;
    const firstFingerprint = entryFingerprint(firstEntry);
    const mismatch = otherEntries.find((entry) => entryFingerprint(entry) !== firstFingerprint);
    if (mismatch) {
      selectedSourceConflicts.push(...meaningfulEntries.map((entry) => entry.source));
      blockers.push(`TARGET_ENTRY_SOURCE_CONFLICT:${selectedSourceConflicts.join(':')}`);
    } else {
      selectedEntry = firstEntry;
      selectedSource = 'matched-sources';
    }
  }

  const status = blockers.length > 0
    ? 'blocked'
    : selectedEntry
      ? 'ready-for-approval-gate'
      : 'waiting-for-operator';
  const nextCommand = status === 'ready-for-approval-gate'
    ? `node --import tsx scripts/sajik-seatmap-stage01.mjs --target ${targetSectionId} --allow-any-stage01-target`
    : `node --import tsx scripts/sajik-seatmap-stage01.mjs --target ${targetSectionId} --allow-any-stage01-target`;
  const operatorActions = blockers.length > 0
    ? Array.from(new Set(blockers.map(actionForBlocker)))
    : selectedEntry
      ? [`Run node --import tsx scripts/sajik-seatmap-stage01.mjs --target ${targetSectionId} --allow-any-stage01-target, then continue to prewrite only if it reports ready-for-prewrite.`]
      : [`Fill ${targetSectionId}-entry-template.json or the ${targetSectionId} row in sajik-seatmap-stage01-operator-input.json using official PNG coordinates.`];

  const summary = {
    preflightVersion: PREFLIGHT_VERSION,
    script: SCRIPT_NAME,
    status,
    generatedAt: new Date().toISOString(),
    targetStage: TARGET_STAGE_LABEL,
    targetSectionId,
    targetReviewPacket: relativePath(targetReviewPacketPath),
    targetEntryTemplate: relativePath(targetEntryPath),
    operatorInput: relativePath(operatorInputPath),
    targetReviewEvidenceVersion: targetReviewPacket.officialPngEvidence?.evidenceVersion ?? null,
    officialImageSha256: targetReviewPacket.officialPngEvidence?.officialImageSha256 ?? null,
    mapVersion: targetReviewPacket.officialPngEvidence?.mapVersion ?? null,
    selectedSource,
    selectedDecision: selectedEntry?.operatorDecision ?? 'PENDING',
    selectedSourceConflicts,
    meaningfulSourceCount: meaningfulEntries.length,
    readyForApprovalGate: status === 'ready-for-approval-gate',
    nextCommand,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    writableSourceFields: WRITABLE_SOURCE_FIELDS,
    lockedSourceFields: LOCKED_SOURCE_FIELDS,
    editableSourceFields: EDITABLE_SOURCE_FIELDS,
    blockers,
    warnings,
  };

  const report = {
    generatedAt: summary.generatedAt,
    summary,
    sourcePolicy,
    safetyContract: [
      'This target entry preflight is read-only and never edits src/data/sajikSeatData.ts.',
      'It never modifies reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json.',
      `It validates operator-provided ${targetSectionId} input before the target approval gate.`,
      'It blocks partial correctedPath/label input, source conflicts, invalid reviewedAt, locked field input, evidence drift, and malformed correctedPath values.',
      'It accepts only operator-provided official 2026 Sajik PNG coordinates as correctedPath and correctedLabelX/Y.',
    ],
    evidenceContract: {
      requiredEvidenceVersion: REQUIRED_TARGET_REVIEW_EVIDENCE_VERSION,
      actualEvidenceVersion: targetReviewPacket.officialPngEvidence?.evidenceVersion ?? null,
      requiredOfficialImageSha256: OFFICIAL_IMAGE_SHA256,
      actualOfficialImageSha256: targetReviewPacket.officialPngEvidence?.officialImageSha256 ?? null,
      requiredMapVersion: MAP_VERSION,
      actualMapVersion: targetReviewPacket.officialPngEvidence?.mapVersion ?? null,
      candidateReferenceOnly: targetReviewPacket.officialPngEvidence?.pixelComponentReference?.candidateReferenceOnly === true,
    },
    inputFieldPolicy: {
      editableSourceFields: EDITABLE_SOURCE_FIELDS,
      writableSourceFields: WRITABLE_SOURCE_FIELDS,
      lockedSourceFields: LOCKED_SOURCE_FIELDS,
      targetEntryForbiddenFields: TARGET_ENTRY_FORBIDDEN_FIELDS,
      operatorInputForbiddenFields: OPERATOR_INPUT_FORBIDDEN_FIELDS,
      approvedRequiredFields: APPROVED_REQUIRED_FIELDS,
      sourceFingerprintFields: SOURCE_FINGERPRINT_FIELDS,
    },
    sourceComparison: {
      exactMatchRequiredWhenMultipleSourcesHaveEditableValues: true,
      sourceConflictRule: 'TARGET_ENTRY_SOURCE_CONFLICT',
      sourceFingerprintFields: SOURCE_FINGERPRINT_FIELDS,
      meaningfulSourceCount: meaningfulEntries.length,
      selectedSource,
      selectedSourceConflicts,
      entries: sourceEntries.map(sourceComparisonEntry),
    },
    selectedEntry: selectedEntry
      ? {
        source: selectedEntry.source,
        sectionId: selectedEntry.sectionId,
        operatorDecision: selectedEntry.operatorDecision,
        correctedPath: selectedEntry.correctedPath,
        correctedLabelX: selectedEntry.correctedLabelX,
        correctedLabelY: selectedEntry.correctedLabelY,
        reviewer: selectedEntry.reviewer,
        reviewedAt: selectedEntry.reviewedAt,
        operatorNote: selectedEntry.operatorNote,
      }
      : null,
    operatorActions,
  };

  await writeJson(jsonPath, report);

  const markdown = [
    '# Sajik Stage 01 Target Entry Preflight',
    '',
    `- preflightVersion: \`${PREFLIGHT_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- targetSectionId: \`${summary.targetSectionId}\``,
    `- selectedSource: \`${summary.selectedSource}\``,
    `- selectedDecision: \`${summary.selectedDecision}\``,
    `- readyForApprovalGate: \`${summary.readyForApprovalGate}\``,
    `- nextCommand: \`${summary.nextCommand}\``,
    `- sourceDataWritePerformed: \`${summary.sourceDataWritePerformed}\``,
    `- writesOperatorInput: \`${summary.writesOperatorInput}\``,
    `- writesProductionData: \`${summary.writesProductionData}\``,
    '',
    '## Evidence Contract',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['requiredEvidenceVersion', `\`${report.evidenceContract.requiredEvidenceVersion}\``],
        ['actualEvidenceVersion', `\`${report.evidenceContract.actualEvidenceVersion ?? '-'}\``],
        ['requiredOfficialImageSha256', `\`${report.evidenceContract.requiredOfficialImageSha256}\``],
        ['actualOfficialImageSha256', `\`${report.evidenceContract.actualOfficialImageSha256 ?? '-'}\``],
        ['requiredMapVersion', `\`${report.evidenceContract.requiredMapVersion}\``],
        ['actualMapVersion', `\`${report.evidenceContract.actualMapVersion ?? '-'}\``],
        ['candidateReferenceOnly', `\`${report.evidenceContract.candidateReferenceOnly}\``],
      ],
    ),
    '',
    '## Source Comparison',
    '',
    markdownTable(
      ['source', 'exists', 'decision', 'editable', 'points', 'label', 'forbidden fields'],
      report.sourceComparison.entries.map((entry) => [
        `\`${entry.source}\``,
        `\`${entry.exists}\``,
        `\`${entry.operatorDecision}\``,
        `\`${entry.hasEditableApprovalValue}\``,
        `\`${entry.correctedPointCount}\``,
        `\`${entry.correctedLabelX ?? '-'},${entry.correctedLabelY ?? '-'}\``,
        `\`${entry.forbiddenFields.join(',') || '-'}\``,
      ]),
    ),
    '',
    '## Input Field Policy',
    '',
    `- editableSourceFields: \`${EDITABLE_SOURCE_FIELDS.join('`, `')}\``,
    `- writableSourceFields: \`${WRITABLE_SOURCE_FIELDS.join('`, `')}\``,
    `- lockedSourceFields: \`${LOCKED_SOURCE_FIELDS.join('`, `')}\``,
    `- targetEntryForbiddenFields: \`${TARGET_ENTRY_FORBIDDEN_FIELDS.join('`, `')}\``,
    `- operatorInputForbiddenFields: \`${OPERATOR_INPUT_FORBIDDEN_FIELDS.join('`, `')}\``,
    '',
    '## Operator Actions',
    '',
    ...operatorActions.map((action) => `- ${action}`),
    '',
    '## Outputs',
    '',
    `- \`${relativePath(jsonPath)}\``,
    `- \`${relativePath(markdownPath)}\``,
    '',
    '## Blockers',
    '',
    ...(blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``) : ['- none']),
    '',
    '## Warnings',
    '',
    ...(warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``) : ['- none']),
    '',
  ].join('\n');
  await fs.writeFile(`${markdownPath}.tmp`, markdown, 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(`stage01_target_entry_preflight_json:${relativePath(jsonPath)}`);
  console.log(`stage01_target_entry_preflight_markdown:${relativePath(markdownPath)}`);
  console.log(
    `status:${summary.status} target=${summary.targetSectionId} source=${summary.selectedSource} decision=${summary.selectedDecision} readyForApprovalGate=${summary.readyForApprovalGate} blockers=${summary.blockers.length} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`,
  );

  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runStage01TargetEntryTemplateReadinessSmoke = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");

  const SMOKE_VERSION = 'SAJIK_STAGE01_TARGET_ENTRY_TEMPLATE_READINESS_SMOKE_V1';
  const TARGET_REVIEW_PACKET_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1';
  const TARGET_REVIEW_EVIDENCE_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1';
  const TARGET_IMAGE_ANALYSIS_VERSION = 'SAJIK_STAGE01_TARGET_IMAGE_ANALYSIS_V1';
  const TARGET_SECTION_ID = '131';
  const MAP_VERSION = 'BUSAN_SAJIK_2026_MANUAL_POLYGON_V2';
  const OFFICIAL_IMAGE_SHA256 = 'e9cb51ccf57a754ddf066a95c6c789d65edf8dff167f432fd35fe809e9dc80aa';
  const SOURCE_VIEWPORT = '615 433 140 110';
  const EXPECTED_PNG_WIDTH = 560;
  const EXPECTED_PNG_HEIGHT = 440;
  const EXPECTED_DECISION_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT'];
  const EDITABLE_FIELDS = [
    'operatorDecision',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const APPROVED_REQUIRED_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const WRITABLE_SOURCE_FIELDS = [
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.labelX',
    'imageGeometry.labelY',
  ];
  const LOCKED_SOURCE_FIELDS = [
    'imageGeometry.visualPath',
    'imageGeometry.geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
  ];
  const LOCKED_DIRECT_FIELDS = [
    'imageGeometry',
    'visualPath',
    'hitPath',
    'labelPoint',
    'labelX',
    'labelY',
    'geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
  ];
  const REQUIRED_REVIEW_ASSERTION_TOKENS = [
    'official image hash',
    'pixel candidate',
    'correctedLabelX/Y inside',
  ];
  const REQUIRED_FORBIDDEN_USE_TOKENS = [
    'blue pixel component path',
    'resized screenshot',
    'edge crop alone',
    'web search',
    'AI coordinate prediction',
    'third-party seatmap images',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const stageDir = path.join(frontendRoot, 'reports/stadium/sajik-stage01-operator');
  const targetDir = path.join(stageDir, 'targets');
  const targetReviewPacketPath = path.join(targetDir, '131-review-packet.json');
  const targetEntryTemplatePath = path.join(targetDir, '131-entry-template.json');
  const outputPaths = {
    json: path.join(stageDir, 'sajik-seatmap-stage01-target-entry-template-readiness-smoke.json'),
    markdown: path.join(stageDir, 'sajik-seatmap-stage01-target-entry-template-readiness-smoke.md'),
  };
  const pngArtifacts = [
    '131-official-crop.png',
    '131-official-overlay-crop.png',
    '131-official-edge-crop.png',
  ].map((fileName) => path.join(targetDir, fileName));

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);

  const isBlank = (value) => value === '' || value === null || value === undefined;

  const arrayHasAll = (actual, expected) => Array.isArray(actual)
    && expected.every((item) => actual.includes(item));

  const joinedIncludesAll = (values, tokens) => {
    const text = Array.isArray(values) ? values.join(' ') : String(values ?? '');
    return tokens.every((token) => text.includes(token));
  };

  const collectPngMetadata = async () => Promise.all(pngArtifacts.map(async (filePath) => {
    try {
      const metadata = await sharp(filePath).metadata();
      return {
        path: relativePath(filePath),
        exists: true,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      };
    } catch (error) {
      return {
        path: relativePath(filePath),
        exists: false,
        width: null,
        height: null,
        format: null,
        error: error.message,
      };
    }
  }));

  const buildMarkdown = (report) => `${[
    '# Sajik Stage 01 Target Entry Template Readiness Smoke',
    '',
    `- status: \`${report.status}\``,
    `- targetSectionId: \`${report.targetSectionId}\``,
    `- templateDecision: \`${report.templateDecision}\``,
    `- editableFieldsBlank: \`${report.editableFieldsBlank}\``,
    `- approvedRequiredFields: \`${report.approvedRequiredFieldsCount}\``,
    `- sourceDataWritePerformed: \`${report.sourceDataWritePerformed}\``,
    `- writesOperatorInput: \`${report.writesOperatorInput}\``,
    `- writesProductionData: \`${report.writesProductionData}\``,
    '',
    '## PNG Artifacts',
    '',
    '| Artifact | Exists | Size | Format |',
    '| --- | --- | --- | --- |',
    ...report.pngArtifacts.map((artifact) => `| \`${artifact.path}\` | \`${artifact.exists}\` | \`${artifact.width}x${artifact.height}\` | \`${artifact.format ?? '-'}\` |`),
    '',
    '## Blockers',
    '',
    ...(report.blockers.length === 0 ? ['- none'] : report.blockers.map((blocker) => `- \`${blocker}\``)),
  ].join('\n')}\n`;

  const targetReviewPacket = await readJson(targetReviewPacketPath);
  const targetEntryTemplate = await readJson(targetEntryTemplatePath);
  const pngMetadata = await collectPngMetadata();

  const imageArtifacts = targetEntryTemplate.officialPngImageAnalysisArtifacts ?? {};
  const crop = imageArtifacts.crop ?? {};
  const blockers = [
    ...(targetReviewPacket?.summary?.packetVersion !== TARGET_REVIEW_PACKET_VERSION
      ? [`TARGET_REVIEW_PACKET_VERSION_CHANGED:${targetReviewPacket?.summary?.packetVersion ?? 'missing'}`]
      : []),
    ...(targetReviewPacket?.summary?.evidenceVersion !== TARGET_REVIEW_EVIDENCE_VERSION
      ? [`TARGET_REVIEW_EVIDENCE_VERSION_CHANGED:${targetReviewPacket?.summary?.evidenceVersion ?? 'missing'}`]
      : []),
    ...(targetReviewPacket?.summary?.targetSectionId !== TARGET_SECTION_ID
      ? [`TARGET_REVIEW_SECTION_CHANGED:${targetReviewPacket?.summary?.targetSectionId ?? 'missing'}`]
      : []),
    ...(targetReviewPacket?.summary?.officialImageSha256 !== OFFICIAL_IMAGE_SHA256
      ? [`TARGET_REVIEW_IMAGE_HASH_CHANGED:${targetReviewPacket?.summary?.officialImageSha256 ?? 'missing'}`]
      : []),
    ...(targetReviewPacket?.summary?.mapVersion !== MAP_VERSION
      ? [`TARGET_REVIEW_MAP_VERSION_CHANGED:${targetReviewPacket?.summary?.mapVersion ?? 'missing'}`]
      : []),
    ...(targetEntryTemplate?.sectionId !== TARGET_SECTION_ID
      ? [`TARGET_ENTRY_SECTION_CHANGED:${targetEntryTemplate?.sectionId ?? 'missing'}`]
      : []),
    ...(targetEntryTemplate?.operatorDecision !== 'PENDING'
      ? [`TARGET_ENTRY_DECISION_NOT_PENDING:${targetEntryTemplate?.operatorDecision ?? 'missing'}`]
      : []),
    ...EDITABLE_FIELDS
      .filter((field) => field !== 'operatorDecision')
      .filter((field) => !isBlank(targetEntryTemplate?.[field]))
      .map((field) => `TARGET_ENTRY_EDITABLE_FIELD_NOT_BLANK:${field}`),
    ...LOCKED_DIRECT_FIELDS
      .filter((field) => Object.prototype.hasOwnProperty.call(targetEntryTemplate ?? {}, field))
      .map((field) => `TARGET_ENTRY_LOCKED_FIELD_PRESENT:${field}`),
    ...(!arrayHasAll(targetEntryTemplate?.operatorDecisionOptions, EXPECTED_DECISION_OPTIONS)
      ? ['TARGET_ENTRY_DECISION_OPTIONS_CHANGED']
      : []),
    ...(!arrayHasAll(targetEntryTemplate?.approvedRequiredFields, APPROVED_REQUIRED_FIELDS)
      ? ['TARGET_ENTRY_APPROVED_REQUIRED_FIELDS_CHANGED']
      : []),
    ...(targetEntryTemplate?.officialPngEvidenceVersion !== TARGET_REVIEW_EVIDENCE_VERSION
      ? [`TARGET_ENTRY_EVIDENCE_VERSION_CHANGED:${targetEntryTemplate?.officialPngEvidenceVersion ?? 'missing'}`]
      : []),
    ...(targetEntryTemplate?.officialImageSha256 !== OFFICIAL_IMAGE_SHA256
      ? [`TARGET_ENTRY_IMAGE_HASH_CHANGED:${targetEntryTemplate?.officialImageSha256 ?? 'missing'}`]
      : []),
    ...(targetEntryTemplate?.mapVersion !== MAP_VERSION
      ? [`TARGET_ENTRY_MAP_VERSION_CHANGED:${targetEntryTemplate?.mapVersion ?? 'missing'}`]
      : []),
    ...(targetEntryTemplate?.sourceViewport !== SOURCE_VIEWPORT
      ? [`TARGET_ENTRY_SOURCE_VIEWPORT_CHANGED:${targetEntryTemplate?.sourceViewport ?? 'missing'}`]
      : []),
    ...(targetEntryTemplate?.officialPngReviewRequired !== true
      ? ['TARGET_ENTRY_OFFICIAL_PNG_REVIEW_NOT_REQUIRED']
      : []),
    ...(!joinedIncludesAll(targetEntryTemplate?.officialPngReviewAssertions, REQUIRED_REVIEW_ASSERTION_TOKENS)
      ? ['TARGET_ENTRY_REVIEW_ASSERTIONS_INCOMPLETE']
      : []),
    ...(imageArtifacts?.artifactVersion !== TARGET_IMAGE_ANALYSIS_VERSION
      ? [`TARGET_ENTRY_IMAGE_ANALYSIS_VERSION_CHANGED:${imageArtifacts?.artifactVersion ?? 'missing'}`]
      : []),
    ...(imageArtifacts?.targetSectionId !== TARGET_SECTION_ID
      ? [`TARGET_ENTRY_IMAGE_ANALYSIS_SECTION_CHANGED:${imageArtifacts?.targetSectionId ?? 'missing'}`]
      : []),
    ...(imageArtifacts?.referenceOnly !== true
      ? ['TARGET_ENTRY_IMAGE_ANALYSIS_NOT_REFERENCE_ONLY']
      : []),
    ...(imageArtifacts?.sourceImageVerified !== true
      ? ['TARGET_ENTRY_IMAGE_SOURCE_NOT_VERIFIED']
      : []),
    ...(imageArtifacts?.sourceImageActualSha256 !== OFFICIAL_IMAGE_SHA256
      ? [`TARGET_ENTRY_IMAGE_ANALYSIS_HASH_CHANGED:${imageArtifacts?.sourceImageActualSha256 ?? 'missing'}`]
      : []),
    ...(imageArtifacts?.sourceImageActualSize !== '960x640'
      ? [`TARGET_ENTRY_IMAGE_ANALYSIS_SIZE_CHANGED:${imageArtifacts?.sourceImageActualSize ?? 'missing'}`]
      : []),
    ...(crop.viewBox !== SOURCE_VIEWPORT
      ? [`TARGET_ENTRY_IMAGE_ANALYSIS_CROP_CHANGED:${crop.viewBox ?? 'missing'}`]
      : []),
    ...(!joinedIncludesAll(imageArtifacts?.forbiddenUse, REQUIRED_FORBIDDEN_USE_TOKENS)
      ? ['TARGET_ENTRY_IMAGE_ANALYSIS_FORBIDDEN_USE_INCOMPLETE']
      : []),
    ...(!arrayHasAll(targetEntryTemplate?.writableSourceFields, WRITABLE_SOURCE_FIELDS)
      ? ['TARGET_ENTRY_WRITABLE_SOURCE_FIELDS_CHANGED']
      : []),
    ...(!arrayHasAll(targetEntryTemplate?.lockedSourceFields, LOCKED_SOURCE_FIELDS)
      ? ['TARGET_ENTRY_LOCKED_SOURCE_FIELDS_CHANGED']
      : []),
    ...pngMetadata
      .filter((artifact) => !artifact.exists)
      .map((artifact) => `TARGET_ENTRY_PNG_ARTIFACT_MISSING:${artifact.path}`),
    ...pngMetadata
      .filter((artifact) => artifact.exists && (artifact.width !== EXPECTED_PNG_WIDTH || artifact.height !== EXPECTED_PNG_HEIGHT))
      .map((artifact) => `TARGET_ENTRY_PNG_SIZE_CHANGED:${artifact.path}:${artifact.width}x${artifact.height}`),
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    version: SMOKE_VERSION,
    status: blockers.length === 0 ? 'passed' : 'failed',
    targetSectionId: TARGET_SECTION_ID,
    targetEntryTemplate: relativePath(targetEntryTemplatePath),
    targetReviewPacket: relativePath(targetReviewPacketPath),
    templateDecision: targetEntryTemplate?.operatorDecision ?? 'missing',
    editableFieldsBlank: EDITABLE_FIELDS
      .filter((field) => field !== 'operatorDecision')
      .every((field) => isBlank(targetEntryTemplate?.[field])),
    approvedRequiredFieldsCount: targetEntryTemplate?.approvedRequiredFields?.length ?? 0,
    sourceDataWritePerformed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    officialPngReviewRequired: targetEntryTemplate?.officialPngReviewRequired === true,
    officialImageSha256: targetEntryTemplate?.officialImageSha256 ?? 'missing',
    mapVersion: targetEntryTemplate?.mapVersion ?? 'missing',
    sourceViewport: targetEntryTemplate?.sourceViewport ?? 'missing',
    imageAnalysisVersion: imageArtifacts?.artifactVersion ?? 'missing',
    pngArtifacts: pngMetadata,
    blockers,
    output: {
      json: relativePath(outputPaths.json),
      markdown: relativePath(outputPaths.markdown),
    },
  };

  await writeJson(outputPaths.json, report);
  await fs.writeFile(outputPaths.markdown, buildMarkdown(report), 'utf8');

  console.log(`stage01_target_entry_template_readiness_smoke_json:${relativePath(outputPaths.json)}`);
  console.log(`stage01_target_entry_template_readiness_smoke_markdown:${relativePath(outputPaths.markdown)}`);
  console.log(`status:${report.status} target=${report.targetSectionId} decision=${report.templateDecision} editableFieldsBlank=${report.editableFieldsBlank} approvedRequiredFields=${report.approvedRequiredFieldsCount} sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`);

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runStage01TargetImageAnalysisSmoke = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");

  const SMOKE_VERSION = 'SAJIK_STAGE01_TARGET_IMAGE_ANALYSIS_SMOKE_V1';
  const TARGET_REVIEW_PACKET_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1';
  const TARGET_REVIEW_EVIDENCE_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1';
  const TARGET_IMAGE_ANALYSIS_VERSION = 'SAJIK_STAGE01_TARGET_IMAGE_ANALYSIS_V1';
  const ALL_TARGET_REVIEW_PACKETS_VERSION = 'SAJIK_STAGE01_ALL_TARGET_REVIEW_PACKETS_V1';
  const TARGET_SECTION_ID = '131';
  const EXPECTED_STAGE01_TARGET_SECTION_IDS = [
    '131',
    '032',
    '133',
    '143',
    '135',
    '134',
    '122',
    '123',
    '132',
    '031',
    '022',
    '142',
    '121',
    '124',
    '125',
    '021',
  ];
  const EXPECTED_CROP_VIEWBOX = '615 433 140 110';
  const EXPECTED_PNG_WIDTH = 560;
  const EXPECTED_PNG_HEIGHT = 440;
  const EXPECTED_OFFICIAL_IMAGE_SHA256 = 'e9cb51ccf57a754ddf066a95c6c789d65edf8dff167f432fd35fe809e9dc80aa';
  const EXPECTED_MAP_VERSION = 'BUSAN_SAJIK_2026_MANUAL_POLYGON_V2';
  const EXPECTED_REPORTS = {
    reviewPacket: 'targets/131-review-packet.json',
    officialCrop: 'targets/131-official-crop.png',
    overlayCrop: 'targets/131-official-overlay-crop.png',
    edgeCrop: 'targets/131-official-edge-crop.png',
  };

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const stageDir = path.resolve(
    frontendRoot,
    argValue('--stage-dir', path.join('reports/stadium/sajik-stage01-operator')),
  );
  const allStage01TargetsMode = process.argv.includes('--all-stage01-targets');
  const jsonPath = path.join(
    stageDir,
    allStage01TargetsMode
      ? 'sajik-seatmap-stage01-all-target-image-analysis-smoke.json'
      : 'sajik-seatmap-stage01-target-image-analysis-smoke.json',
  );
  const markdownPath = path.join(
    stageDir,
    allStage01TargetsMode
      ? 'sajik-seatmap-stage01-all-target-image-analysis-smoke.md'
      : 'sajik-seatmap-stage01-target-image-analysis-smoke.md',
  );

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const exists = async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const addCheck = (checks, id, passed, detail = {}) => {
    checks.push({
      id,
      passed: Boolean(passed),
      ...detail,
    });
  };

  if (allStage01TargetsMode) {
    const allTargetReportPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-review-packets.json');
    const allTargetReport = await readJson(allTargetReportPath);
    const rows = Array.isArray(allTargetReport.rows) ? allTargetReport.rows : [];
    const checks = [];

    addCheck(
      checks,
      'all-target-report-version',
      allTargetReport.summary?.packetVersion === ALL_TARGET_REVIEW_PACKETS_VERSION,
      { actualVersion: allTargetReport.summary?.packetVersion ?? null },
    );
    addCheck(
      checks,
      'all-target-count',
      allTargetReport.summary?.targetCount === EXPECTED_STAGE01_TARGET_SECTION_IDS.length
        && rows.length === EXPECTED_STAGE01_TARGET_SECTION_IDS.length,
      {
        expected: EXPECTED_STAGE01_TARGET_SECTION_IDS.length,
        summaryCount: allTargetReport.summary?.targetCount ?? null,
        rowCount: rows.length,
      },
    );
    addCheck(
      checks,
      'all-target-section-order',
      JSON.stringify(rows.map((row) => row.sectionId)) === JSON.stringify(EXPECTED_STAGE01_TARGET_SECTION_IDS),
      { actual: rows.map((row) => row.sectionId) },
    );
    addCheck(
      checks,
      'all-target-official-image-lock',
      allTargetReport.summary?.allOfficialImagesVerified === true
        && allTargetReport.summary?.officialImageSha256 === EXPECTED_OFFICIAL_IMAGE_SHA256
        && allTargetReport.summary?.mapVersion === EXPECTED_MAP_VERSION,
      {
        allOfficialImagesVerified: allTargetReport.summary?.allOfficialImagesVerified ?? null,
        officialImageSha256: allTargetReport.summary?.officialImageSha256 ?? null,
        mapVersion: allTargetReport.summary?.mapVersion ?? null,
      },
    );
    addCheck(
      checks,
      'all-target-reference-only',
      allTargetReport.summary?.allPixelCandidatesReferenceOnly === true,
      { allPixelCandidatesReferenceOnly: allTargetReport.summary?.allPixelCandidatesReferenceOnly ?? null },
    );
    addCheck(
      checks,
      'all-target-read-only-flags',
      allTargetReport.summary?.sourceDataWritePerformed === false
        && allTargetReport.summary?.writesOperatorInput === false
        && allTargetReport.summary?.writesProductionData === false,
      {
        sourceDataWritePerformed: allTargetReport.summary?.sourceDataWritePerformed ?? null,
        writesOperatorInput: allTargetReport.summary?.writesOperatorInput ?? null,
        writesProductionData: allTargetReport.summary?.writesProductionData ?? null,
      },
    );

    const imageArtifactRows = [];
    for (const row of rows) {
      for (const artifactId of ['officialCropPng', 'overlayCropPng', 'edgeCropPng']) {
        const artifactPath = path.join(frontendRoot, row[artifactId]);
        const artifactExists = await exists(artifactPath);
        const metadata = artifactExists ? await sharp(artifactPath).metadata() : null;
        const dimensionsOk = Number(metadata?.width) > 0 && Number(metadata?.height) > 0;
        addCheck(checks, `${row.sectionId}-${artifactId}`, artifactExists && dimensionsOk, {
          path: row[artifactId],
          exists: artifactExists,
          width: metadata?.width ?? null,
          height: metadata?.height ?? null,
        });
        imageArtifactRows.push({
          sectionId: row.sectionId,
          artifactId,
          path: row[artifactId],
          exists: artifactExists,
          width: metadata?.width ?? null,
          height: metadata?.height ?? null,
        });
      }
    }

    const failures = checks.filter((check) => !check.passed);
    const report = {
      generatedAt: new Date().toISOString(),
      smokeVersion: SMOKE_VERSION,
      status: failures.length > 0 ? 'failed' : 'passed',
      mode: 'all-stage01-targets',
      allTargetReport: relativePath(allTargetReportPath),
      expectedTargetSectionIds: EXPECTED_STAGE01_TARGET_SECTION_IDS,
      targetCount: rows.length,
      sourceDataWritePerformed: false,
      writesOperatorInput: false,
      writesProductionData: false,
      checks,
      imageArtifacts: imageArtifactRows,
      failures: failures.map((failure) => failure.id),
    };

    const markdown = [
      '# Sajik Stage 01 All-Target Image Analysis Smoke',
      '',
      `- smokeVersion: \`${SMOKE_VERSION}\``,
      `- status: \`${report.status}\``,
      `- mode: \`${report.mode}\``,
      `- allTargetReport: \`${report.allTargetReport}\``,
      `- targetCount: \`${report.targetCount}/${EXPECTED_STAGE01_TARGET_SECTION_IDS.length}\``,
      `- sourceDataWritePerformed: \`${report.sourceDataWritePerformed}\``,
      `- writesOperatorInput: \`${report.writesOperatorInput}\``,
      `- writesProductionData: \`${report.writesProductionData}\``,
      '',
      '## Checks',
      '',
      markdownTable(
        ['check', 'status', 'detail'],
        checks.map((check) => [
          `\`${check.id}\``,
          check.passed ? '`passed`' : '`failed`',
          `\`${JSON.stringify(Object.fromEntries(Object.entries(check).filter(([key]) => !['id', 'passed'].includes(key))))}\``,
        ]),
      ),
      '',
      '## Image Artifacts',
      '',
      markdownTable(
        ['section', 'artifact', 'path', 'exists', 'size'],
        imageArtifactRows.map((row) => [
          `\`${row.sectionId}\``,
          `\`${row.artifactId}\``,
          `\`${row.path}\``,
          `\`${row.exists}\``,
          `\`${row.width ?? '-'}x${row.height ?? '-'}\``,
        ]),
      ),
      '',
      '## Failures',
      '',
      failures.length > 0 ? failures.map((failure) => `- \`${failure.id}\``).join('\n') : '- none',
      '',
    ].join('\n');

    await writeJson(jsonPath, report);
    await fs.writeFile(`${markdownPath}.tmp`, markdown, 'utf8');
    await fs.rename(`${markdownPath}.tmp`, markdownPath);

    console.log(`stage01_all_target_image_analysis_smoke_json:${relativePath(jsonPath)}`);
    console.log(`stage01_all_target_image_analysis_smoke_markdown:${relativePath(markdownPath)}`);
    console.log(
      `status:${report.status} mode=${report.mode} targets=${report.targetCount}/${EXPECTED_STAGE01_TARGET_SECTION_IDS.length} sourceDataWritePerformed=${report.sourceDataWritePerformed} writesOperatorInput=${report.writesOperatorInput} writesProductionData=${report.writesProductionData}`,
    );

    if (failures.length > 0) {
      process.exitCode = 1;
    }
    process.exit();
  }

  const expectedArtifactPath = (relativeTargetPath) => path.join(stageDir, relativeTargetPath);
  const reviewPacketPath = expectedArtifactPath(EXPECTED_REPORTS.reviewPacket);
  const reviewPacket = await readJson(reviewPacketPath);
  const checks = [];

  addCheck(
    checks,
    'review-packet-version',
    reviewPacket.summary?.packetVersion === TARGET_REVIEW_PACKET_VERSION
      && reviewPacket.summary?.evidenceVersion === TARGET_REVIEW_EVIDENCE_VERSION,
    {
      actualPacketVersion: reviewPacket.summary?.packetVersion ?? null,
      actualEvidenceVersion: reviewPacket.summary?.evidenceVersion ?? null,
    },
  );
  addCheck(checks, 'target-section', reviewPacket.summary?.targetSectionId === TARGET_SECTION_ID, {
    actualTargetSectionId: reviewPacket.summary?.targetSectionId ?? null,
  });
  addCheck(
    checks,
    'official-image-lock',
    reviewPacket.summary?.officialImageVerified === true
      && reviewPacket.summary?.officialImageSha256 === EXPECTED_OFFICIAL_IMAGE_SHA256
      && reviewPacket.summary?.mapVersion === EXPECTED_MAP_VERSION,
    {
      officialImageVerified: reviewPacket.summary?.officialImageVerified ?? null,
      officialImageSha256: reviewPacket.summary?.officialImageSha256 ?? null,
      mapVersion: reviewPacket.summary?.mapVersion ?? null,
    },
  );
  addCheck(
    checks,
    'image-analysis-version',
    reviewPacket.summary?.targetImageAnalysisVersion === TARGET_IMAGE_ANALYSIS_VERSION
      && reviewPacket.officialPngEvidence?.imageAnalysisArtifacts?.artifactVersion === TARGET_IMAGE_ANALYSIS_VERSION
      && reviewPacket.operatorInputChecklist?.imageAnalysisArtifacts?.artifactVersion === TARGET_IMAGE_ANALYSIS_VERSION,
    {
      summaryVersion: reviewPacket.summary?.targetImageAnalysisVersion ?? null,
      evidenceVersion: reviewPacket.officialPngEvidence?.imageAnalysisArtifacts?.artifactVersion ?? null,
      checklistVersion: reviewPacket.operatorInputChecklist?.imageAnalysisArtifacts?.artifactVersion ?? null,
    },
  );
  addCheck(
    checks,
    'crop-viewbox',
    reviewPacket.summary?.targetImageAnalysisCrop?.viewBox === EXPECTED_CROP_VIEWBOX
      && reviewPacket.officialPngEvidence?.imageAnalysisArtifacts?.crop?.viewBox === EXPECTED_CROP_VIEWBOX
      && reviewPacket.operatorEntryTemplate?.officialPngImageAnalysisArtifacts?.crop?.viewBox === EXPECTED_CROP_VIEWBOX,
    {
      summaryViewBox: reviewPacket.summary?.targetImageAnalysisCrop?.viewBox ?? null,
      evidenceViewBox: reviewPacket.officialPngEvidence?.imageAnalysisArtifacts?.crop?.viewBox ?? null,
      templateViewBox: reviewPacket.operatorEntryTemplate?.officialPngImageAnalysisArtifacts?.crop?.viewBox ?? null,
    },
  );
  addCheck(
    checks,
    'read-only-flags',
    reviewPacket.summary?.sourceDataWritePerformed === false
      && reviewPacket.summary?.writesOperatorInput === false
      && reviewPacket.summary?.writesProductionData === false
      && reviewPacket.officialPngEvidence?.sourceFieldPolicy?.sourceDataWritePerformed === false
      && reviewPacket.officialPngEvidence?.sourceFieldPolicy?.productionWriteAllowed === false,
    {
      sourceDataWritePerformed: reviewPacket.summary?.sourceDataWritePerformed ?? null,
      writesOperatorInput: reviewPacket.summary?.writesOperatorInput ?? null,
      writesProductionData: reviewPacket.summary?.writesProductionData ?? null,
      evidenceSourceDataWritePerformed: reviewPacket.officialPngEvidence?.sourceFieldPolicy?.sourceDataWritePerformed ?? null,
      evidenceProductionWriteAllowed: reviewPacket.officialPngEvidence?.sourceFieldPolicy?.productionWriteAllowed ?? null,
    },
  );

  const imageArtifactRows = [];
  for (const [artifactId, relativeTargetPath] of Object.entries({
    officialCrop: EXPECTED_REPORTS.officialCrop,
    overlayCrop: EXPECTED_REPORTS.overlayCrop,
    edgeCrop: EXPECTED_REPORTS.edgeCrop,
  })) {
    const artifactPath = expectedArtifactPath(relativeTargetPath);
    const artifactExists = await exists(artifactPath);
    const metadata = artifactExists ? await sharp(artifactPath).metadata() : null;
    const expectedReportPath = relativePath(artifactPath);
    const summaryPath = reviewPacket.summary?.targetImageAnalysisArtifacts?.[`${artifactId}Png`] ?? null;
    const evidencePath = reviewPacket.officialPngEvidence?.imageAnalysisArtifacts?.[`${artifactId}Png`] ?? null;
    const checklistPath = reviewPacket.operatorInputChecklist?.[`${artifactId}Png`] ?? null;
    const dimensionsOk = metadata?.width === EXPECTED_PNG_WIDTH && metadata?.height === EXPECTED_PNG_HEIGHT;
    const referencesOk = summaryPath === expectedReportPath
      && evidencePath === expectedReportPath
      && checklistPath === expectedReportPath;

    addCheck(checks, `${artifactId}-png`, artifactExists && dimensionsOk && referencesOk, {
      path: expectedReportPath,
      exists: artifactExists,
      width: metadata?.width ?? null,
      height: metadata?.height ?? null,
      expectedWidth: EXPECTED_PNG_WIDTH,
      expectedHeight: EXPECTED_PNG_HEIGHT,
      summaryPath,
      evidencePath,
      checklistPath,
    });
    imageArtifactRows.push({
      artifactId,
      path: expectedReportPath,
      exists: artifactExists,
      width: metadata?.width ?? null,
      height: metadata?.height ?? null,
      summaryPath,
      evidencePath,
      checklistPath,
    });
  }

  const failures = checks.filter((check) => !check.passed);
  const report = {
    generatedAt: new Date().toISOString(),
    smokeVersion: SMOKE_VERSION,
    status: failures.length > 0 ? 'failed' : 'passed',
    targetSectionId: TARGET_SECTION_ID,
    targetReviewPacket: relativePath(reviewPacketPath),
    expectedCropViewBox: EXPECTED_CROP_VIEWBOX,
    expectedPngSize: `${EXPECTED_PNG_WIDTH}x${EXPECTED_PNG_HEIGHT}`,
    sourceDataWritePerformed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    checks,
    imageArtifacts: imageArtifactRows,
    failures: failures.map((failure) => failure.id),
  };

  const markdown = [
    '# Sajik Stage 01 Target Image Analysis Smoke',
    '',
    `- smokeVersion: \`${SMOKE_VERSION}\``,
    `- status: \`${report.status}\``,
    `- targetSectionId: \`${report.targetSectionId}\``,
    `- targetReviewPacket: \`${report.targetReviewPacket}\``,
    `- expectedCropViewBox: \`${report.expectedCropViewBox}\``,
    `- expectedPngSize: \`${report.expectedPngSize}\``,
    `- sourceDataWritePerformed: \`${report.sourceDataWritePerformed}\``,
    `- writesOperatorInput: \`${report.writesOperatorInput}\``,
    `- writesProductionData: \`${report.writesProductionData}\``,
    '',
    '## Checks',
    '',
    markdownTable(
      ['check', 'status', 'detail'],
      checks.map((check) => [
        `\`${check.id}\``,
        check.passed ? '`passed`' : '`failed`',
        `\`${JSON.stringify(Object.fromEntries(Object.entries(check).filter(([key]) => !['id', 'passed'].includes(key))))}\``,
      ]),
    ),
    '',
    '## Image Artifacts',
    '',
    markdownTable(
      ['artifact', 'path', 'exists', 'size'],
      imageArtifactRows.map((row) => [
        `\`${row.artifactId}\``,
        `\`${row.path}\``,
        `\`${row.exists}\``,
        `\`${row.width ?? '-'}x${row.height ?? '-'}\``,
      ]),
    ),
    '',
    '## Failures',
    '',
    failures.length > 0 ? failures.map((failure) => `- \`${failure.id}\``).join('\n') : '- none',
    '',
  ].join('\n');

  await writeJson(jsonPath, report);
  await fs.writeFile(`${markdownPath}.tmp`, markdown, 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  console.log(`stage01_target_image_analysis_smoke_json:${relativePath(jsonPath)}`);
  console.log(`stage01_target_image_analysis_smoke_markdown:${relativePath(markdownPath)}`);
  console.log(
    `status:${report.status} target=${report.targetSectionId} crop=${report.expectedCropViewBox} pngSize=${report.expectedPngSize} sourceDataWritePerformed=${report.sourceDataWritePerformed} writesOperatorInput=${report.writesOperatorInput} writesProductionData=${report.writesProductionData}`,
  );

  if (failures.length > 0) {
    process.exitCode = 1;
  }
};

const runStage01TargetReviewPacket = async () => {
  const { createHash } = await import("node:crypto");
  const { spawnSync } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");
  const { pathBounds, pathToPoints, polygonArea } = await import("../src/utils/seatMapPolygonValidator.ts");

  const PACKET_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1';
  const REQUIRED_NEXT_ACTION_PACKET_VERSION = 'SAJIK_STAGE01_NEXT_ACTION_PACKET_V1';
  const REQUIRED_REVIEW_BOARD_VERSION = 'SAJIK_STAGE01_REVIEW_BOARD_V1';
  const SCRIPT_NAME = 'sajik-seatmap-stage01.mjs';
  const TARGET_STAGE_LABEL = 'Stage 01 P0';
  const DEFAULT_TARGET_SECTION_ID = '131';
  const DEFAULT_TARGET_REVIEW_PACKET_JSON_FILE = '131-review-packet.json';
  const DEFAULT_TARGET_REVIEW_PACKET_MARKDOWN_FILE = '131-review-packet.md';
  const DEFAULT_TARGET_REVIEW_PACKET_SVG_FILE = '131-review-packet.svg';
  const DEFAULT_TARGET_ENTRY_TEMPLATE_JSON_FILE = '131-entry-template.json';
  const DEFAULT_TARGET_ENTRY_TEMPLATE_CSV_FILE = '131-entry-template.csv';
  const DEFAULT_TARGET_OFFICIAL_CROP_PNG_FILE = '131-official-crop.png';
  const DEFAULT_TARGET_OVERLAY_CROP_PNG_FILE = '131-official-overlay-crop.png';
  const DEFAULT_TARGET_EDGE_CROP_PNG_FILE = '131-official-edge-crop.png';
  const IMAGE_WIDTH = 960;
  const IMAGE_HEIGHT = 640;
  const IMAGE_HREF = '../../../../src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png';
  const OFFICIAL_IMAGE_ASSET = 'src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png';
  const OFFICIAL_IMAGE_SHA256 = 'e9cb51ccf57a754ddf066a95c6c789d65edf8dff167f432fd35fe809e9dc80aa';
  const MAP_VERSION = 'BUSAN_SAJIK_2026_MANUAL_POLYGON_V2';
  const TARGET_REVIEW_EVIDENCE_VERSION = 'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1';
  const TARGET_IMAGE_ANALYSIS_VERSION = 'SAJIK_STAGE01_TARGET_IMAGE_ANALYSIS_V1';
  const ALL_TARGET_REVIEW_PACKETS_VERSION = 'SAJIK_STAGE01_ALL_TARGET_REVIEW_PACKETS_V1';
  const VIEWPORT_MARGIN = 42;
  const MIN_VIEWPORT_WIDTH = 140;
  const MIN_VIEWPORT_HEIGHT = 110;
  const ANALYSIS_CROP_SCALE = 4;
  const STAGE01_IMAGE_PRIORITY_SECTION_IDS = [
    '131',
    '032',
    '135',
    '132',
    '031',
    '133',
    '022',
    '143',
    '134',
    '142',
    '121',
    '124',
    '125',
    '122',
    '021',
    '123',
  ];
  const OPERATOR_DECISION_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE', 'KEEP_CURRENT'];
  const APPROVED_REQUIRED_FIELDS = [
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'reviewer',
    'reviewedAt',
    'operatorNote',
  ];
  const WRITABLE_SOURCE_FIELDS = [
    'imageGeometry.hitPath',
    'imageGeometry.labelPoint',
    'imageGeometry.labelX',
    'imageGeometry.labelY',
  ];
  const LOCKED_SOURCE_FIELDS = [
    'imageGeometry.visualPath',
    'imageGeometry.geometryVersion',
    'sectionKind',
    'markerType',
    'mapInteractionStatus',
    'traceSource',
    'traceMethod',
    'traceVersion',
  ];

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const stageDir = path.resolve(
    frontendRoot,
    argValue('--stage-dir', path.join('reports/stadium/sajik-stage01-operator')),
  );
  const allStage01TargetsMode = process.argv.includes('--all-stage01-targets');
  const allowAnyStage01Target = process.argv.includes('--allow-any-stage01-target');
  const targetSectionId = String(argValue('--target', argValue('--section', DEFAULT_TARGET_SECTION_ID))).trim();
  const targetDir = path.join(stageDir, 'targets');

  const nextActionPacketPath = path.join(stageDir, 'sajik-seatmap-stage01-next-action-packet.json');
  const reviewBoardPath = path.join(stageDir, 'sajik-seatmap-stage01-review-board.json');
  const outputPrefix = `${targetSectionId}-review-packet`;
  const targetReviewPacketJsonFile = targetSectionId === DEFAULT_TARGET_SECTION_ID
    ? DEFAULT_TARGET_REVIEW_PACKET_JSON_FILE
    : `${outputPrefix}.json`;
  const targetReviewPacketMarkdownFile = targetSectionId === DEFAULT_TARGET_SECTION_ID
    ? DEFAULT_TARGET_REVIEW_PACKET_MARKDOWN_FILE
    : `${outputPrefix}.md`;
  const targetReviewPacketSvgFile = targetSectionId === DEFAULT_TARGET_SECTION_ID
    ? DEFAULT_TARGET_REVIEW_PACKET_SVG_FILE
    : `${outputPrefix}.svg`;
  const targetEntryTemplateJsonFile = targetSectionId === DEFAULT_TARGET_SECTION_ID
    ? DEFAULT_TARGET_ENTRY_TEMPLATE_JSON_FILE
    : `${targetSectionId}-entry-template.json`;
  const targetEntryTemplateCsvFile = targetSectionId === DEFAULT_TARGET_SECTION_ID
    ? DEFAULT_TARGET_ENTRY_TEMPLATE_CSV_FILE
    : `${targetSectionId}-entry-template.csv`;
  const targetOfficialCropPngFile = targetSectionId === DEFAULT_TARGET_SECTION_ID
    ? DEFAULT_TARGET_OFFICIAL_CROP_PNG_FILE
    : `${targetSectionId}-official-crop.png`;
  const targetOverlayCropPngFile = targetSectionId === DEFAULT_TARGET_SECTION_ID
    ? DEFAULT_TARGET_OVERLAY_CROP_PNG_FILE
    : `${targetSectionId}-official-overlay-crop.png`;
  const targetEdgeCropPngFile = targetSectionId === DEFAULT_TARGET_SECTION_ID
    ? DEFAULT_TARGET_EDGE_CROP_PNG_FILE
    : `${targetSectionId}-official-edge-crop.png`;
  const jsonPath = path.join(targetDir, targetReviewPacketJsonFile);
  const markdownPath = path.join(targetDir, targetReviewPacketMarkdownFile);
  const overlaySvgPath = path.join(targetDir, targetReviewPacketSvgFile);
  const entryTemplateJsonPath = path.join(targetDir, targetEntryTemplateJsonFile);
  const entryTemplateCsvPath = path.join(targetDir, targetEntryTemplateCsvFile);
  const officialCropPngPath = path.join(targetDir, targetOfficialCropPngFile);
  const overlayCropPngPath = path.join(targetDir, targetOverlayCropPngFile);
  const edgeCropPngPath = path.join(targetDir, targetEdgeCropPngFile);
  const officialImagePath = path.join(frontendRoot, OFFICIAL_IMAGE_ASSET);

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(`${filePath}.tmp`, filePath);
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
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

  const round = (value, digits = 3) => {
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

  const areaOrNull = (pathData) => {
    const points = pathToPoints(String(pathData ?? ''));
    return points.length >= 3 ? round(polygonArea(points), 2) : null;
  };

  const bboxObject = (bbox) => {
    if (!bbox || typeof bbox !== 'object') return null;
    const minX = Number(bbox.minX);
    const minY = Number(bbox.minY);
    const maxX = Number(bbox.maxX);
    const maxY = Number(bbox.maxY);
    if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
    return { minX, minY, maxX, maxY };
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
    const width = Math.max(MIN_VIEWPORT_WIDTH, (bounds.maxX - bounds.minX) + (VIEWPORT_MARGIN * 2));
    const height = Math.max(MIN_VIEWPORT_HEIGHT, (bounds.maxY - bounds.minY) + (VIEWPORT_MARGIN * 2));
    const minX = Math.max(0, Math.min(IMAGE_WIDTH - width, centerX - (width / 2)));
    const minY = Math.max(0, Math.min(IMAGE_HEIGHT - height, centerY - (height / 2)));
    const clampedWidth = Math.min(width, IMAGE_WIDTH);
    const clampedHeight = Math.min(height, IMAGE_HEIGHT);
    return {
      minX: round(minX, 2),
      minY: round(minY, 2),
      width: round(clampedWidth, 2),
      height: round(clampedHeight, 2),
      viewBox: `${round(minX, 2)} ${round(minY, 2)} ${round(clampedWidth, 2)} ${round(clampedHeight, 2)}`,
    };
  };

  const formatBbox = (bbox) => {
    const normalized = bboxObject(bbox);
    if (!normalized) return '';
    return `${normalized.minX},${normalized.minY},${normalized.maxX},${normalized.maxY}`;
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const integerCropFromViewport = (viewport) => {
    const left = clamp(Math.floor(Number(viewport.minX) || 0), 0, IMAGE_WIDTH - 1);
    const top = clamp(Math.floor(Number(viewport.minY) || 0), 0, IMAGE_HEIGHT - 1);
    const right = clamp(Math.ceil((Number(viewport.minX) || 0) + (Number(viewport.width) || MIN_VIEWPORT_WIDTH)), left + 1, IMAGE_WIDTH);
    const bottom = clamp(Math.ceil((Number(viewport.minY) || 0) + (Number(viewport.height) || MIN_VIEWPORT_HEIGHT)), top + 1, IMAGE_HEIGHT);

    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
      viewBox: `${left} ${top} ${right - left} ${bottom - top}`,
    };
  };

  const gridLines = (crop, minorStep = 5, majorStep = 25) => {
    const lines = [];
    const startX = Math.ceil(crop.x / minorStep) * minorStep;
    const startY = Math.ceil(crop.y / minorStep) * minorStep;
    const endX = crop.x + crop.width;
    const endY = crop.y + crop.height;

    for (let x = startX; x <= endX; x += minorStep) {
      const major = x % majorStep === 0;
      lines.push(`<line class="${major ? 'grid-major' : 'grid-minor'}" x1="${x}" y1="${crop.y}" x2="${x}" y2="${endY}" />`);
      if (major) {
        lines.push(`<text class="grid-label" x="${x + 1}" y="${crop.y + 8}">${x}</text>`);
      }
    }

    for (let y = startY; y <= endY; y += minorStep) {
      const major = y % majorStep === 0;
      lines.push(`<line class="${major ? 'grid-major' : 'grid-minor'}" x1="${crop.x}" y1="${y}" x2="${endX}" y2="${y}" />`);
      if (major) {
        lines.push(`<text class="grid-label" x="${crop.x + 2}" y="${y - 1}">${y}</text>`);
      }
    }

    return lines.join('\n  ');
  };

  const buildAnalysisCropOverlaySvg = ({ crop, width, height, target, title, edgeMode = false }) => {
    const [labelX, labelY] = Array.isArray(target.currentLabelPoint) ? target.currentLabelPoint : [0, 0];
    const imageBbox = bboxObject(target.imageAnalysis.bbox);
    const bboxRect = imageBbox
      ? `<rect x="${imageBbox.minX}" y="${imageBbox.minY}" width="${Math.max(1, imageBbox.maxX - imageBbox.minX)}" height="${Math.max(1, imageBbox.maxY - imageBbox.minY)}" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="2 2" vector-effect="non-scaling-stroke" />`
      : '';
    const pixelOverlay = target.imageAnalysis.overlayPath
      ? `<path d="${xmlEscape(target.imageAnalysis.overlayPath)}" fill="#0ea5e9" fill-opacity="${edgeMode ? '0.08' : '0.16'}" stroke="#0ea5e9" stroke-width="1.8" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${target.sectionId} reference-only official PNG pixel component`)}</title></path>`
      : '';
    const currentPath = target.currentHitPath
      ? `<path d="${xmlEscape(target.currentHitPath)}" fill="#f97316" fill-opacity="${edgeMode ? '0.08' : '0.24'}" stroke="#dc2626" stroke-width="2.2" vector-effect="non-scaling-stroke"><title>${xmlEscape(`${target.sectionId} current production hitPath`)}</title></path>`
      : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${crop.viewBox}">
    <style>
      .grid-minor { stroke: #0f172a; stroke-opacity: ${edgeMode ? '0.16' : '0.1'}; stroke-width: 0.55; vector-effect: non-scaling-stroke; }
      .grid-major { stroke: #0f172a; stroke-opacity: ${edgeMode ? '0.28' : '0.2'}; stroke-width: 0.85; vector-effect: non-scaling-stroke; }
      .grid-label { font: 600 2.8px Arial, sans-serif; fill: #0f172a; fill-opacity: 0.78; stroke: #ffffff; stroke-width: 0.7; paint-order: stroke; }
      .title { font: 900 4px Arial, sans-serif; fill: #0f172a; stroke: #ffffff; stroke-width: 1.2; paint-order: stroke; }
      .legend { font: 800 3.2px Arial, sans-serif; fill: #334155; stroke: #ffffff; stroke-width: 0.9; paint-order: stroke; }
    </style>
    ${gridLines(crop)}
    ${currentPath}
    ${pixelOverlay}
    ${bboxRect}
    <circle cx="${Number(labelX) || 0}" cy="${Number(labelY) || 0}" r="2.3" fill="#ef4444" stroke="#ffffff" stroke-width="0.9" vector-effect="non-scaling-stroke" />
    <text class="title" x="${crop.x + 4}" y="${crop.y + 7}">${xmlEscape(title)}</text>
    <text class="legend" x="${crop.x + 4}" y="${crop.y + 13}">red=current hitPath, blue=reference-only PNG component, grid=official viewBox px</text>
    <text class="legend" x="${crop.x + 4}" y="${crop.y + 18}">operator must trace from official PNG manually; do not copy candidate path</text>
  </svg>`;
  };

  const writeImageAnalysisArtifacts = async ({ imageBuffer, crop, target }) => {
    await fs.mkdir(path.dirname(officialCropPngPath), { recursive: true });
    const outputWidth = crop.width * ANALYSIS_CROP_SCALE;
    const outputHeight = crop.height * ANALYSIS_CROP_SCALE;
    const extractRegion = {
      left: crop.x,
      top: crop.y,
      width: crop.width,
      height: crop.height,
    };
    const resizeOptions = {
      width: outputWidth,
      height: outputHeight,
      kernel: sharp.kernel.nearest,
    };

    const officialCropBuffer = await sharp(imageBuffer)
      .extract(extractRegion)
      .resize(resizeOptions)
      .png()
      .toBuffer();
    await sharp(officialCropBuffer).toFile(officialCropPngPath);

    const overlaySvg = Buffer.from(buildAnalysisCropOverlaySvg({
      crop,
      width: outputWidth,
      height: outputHeight,
      target,
      title: `Sajik ${target.sectionId} official PNG crop overlay`,
    }));
    await sharp(officialCropBuffer)
      .composite([{ input: overlaySvg, left: 0, top: 0 }])
      .png()
      .toFile(overlayCropPngPath);

    const edgeCropBuffer = await sharp(imageBuffer)
      .extract(extractRegion)
      .resize(resizeOptions)
      .greyscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [
          -1, -1, -1,
          -1, 8, -1,
          -1, -1, -1,
        ],
      })
      .normalise()
      .png()
      .toBuffer();
    const edgeOverlaySvg = Buffer.from(buildAnalysisCropOverlaySvg({
      crop,
      width: outputWidth,
      height: outputHeight,
      target,
      title: `Sajik ${target.sectionId} edge reference crop`,
      edgeMode: true,
    }));
    await sharp(edgeCropBuffer)
      .composite([{ input: edgeOverlaySvg, left: 0, top: 0 }])
      .png()
      .toFile(edgeCropPngPath);
  };

  const sourcePolicy = {
    allowedCoordinateSource: 'operator-provided official 2026 Sajik PNG coordinates only',
    coordinateSystem: 'SVG viewBox 0 0 960 640',
    targetReviewOnly: true,
    disallowedSources: [
      'pixel candidate path copy without operator approval',
      'AI coordinate prediction',
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  };

  const targetReviewPacketFileName = (sectionId) => `${sectionId}-review-packet.json`;
  const targetReviewMarkdownFileName = (sectionId) => `${sectionId}-review-packet.md`;
  const targetOfficialCropFileName = (sectionId) => `${sectionId}-official-crop.png`;
  const targetOverlayCropFileName = (sectionId) => `${sectionId}-official-overlay-crop.png`;
  const targetEdgeCropFileName = (sectionId) => `${sectionId}-official-edge-crop.png`;
  const targetEntryTemplateFileName = (sectionId) => `${sectionId}-entry-template.json`;
  const targetEntryTemplateCsvFileName = (sectionId) => `${sectionId}-entry-template.csv`;

  if (allStage01TargetsMode) {
    const allTargetJsonPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-review-packets.json');
    const allTargetCsvPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-review-packets.csv');
    const allTargetMarkdownPath = path.join(stageDir, 'sajik-seatmap-stage01-all-target-review-packets.md');
    const scriptPath = fileURLToPath(import.meta.url);
    const rows = [];
    const blockers = [];

    await fs.mkdir(targetDir, { recursive: true });

    for (const sectionId of STAGE01_IMAGE_PRIORITY_SECTION_IDS) {
      const result = spawnSync(process.execPath, [
        '--import',
        'tsx',
        scriptPath,
        '--stage-dir',
        stageDir,
        '--section',
        sectionId,
        '--allow-any-stage01-target',
      ], {
        cwd: frontendRoot,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 16,
      });

      const packetPath = path.join(targetDir, targetReviewPacketFileName(sectionId));
      const officialCropPath = path.join(targetDir, targetOfficialCropFileName(sectionId));
      const overlayCropPath = path.join(targetDir, targetOverlayCropFileName(sectionId));
      const edgeCropPath = path.join(targetDir, targetEdgeCropFileName(sectionId));
      const entryTemplatePath = path.join(targetDir, targetEntryTemplateFileName(sectionId));
      const entryTemplateCsvPathForTarget = path.join(targetDir, targetEntryTemplateCsvFileName(sectionId));
      let packet = null;
      let cropMetadata = null;

      if (result.status !== 0) {
        blockers.push(`TARGET_PACKET_GENERATION_FAILED:${sectionId}:${result.status}`);
      }

      try {
        packet = await readJson(packetPath);
      } catch (error) {
        blockers.push(`TARGET_PACKET_MISSING:${sectionId}:${error.message}`);
      }

      try {
        cropMetadata = await sharp(officialCropPath).metadata();
      } catch (error) {
        blockers.push(`TARGET_OFFICIAL_CROP_MISSING:${sectionId}:${error.message}`);
      }

      const packetBlockers = packet?.summary?.blockers ?? [];
      if (packetBlockers.length > 0) {
        blockers.push(...packetBlockers.map((blocker) => `TARGET_PACKET_BLOCKER:${sectionId}:${blocker}`));
      }
      if (packet?.summary?.officialImageVerified !== true) {
        blockers.push(`TARGET_OFFICIAL_IMAGE_NOT_VERIFIED:${sectionId}`);
      }
      if (packet?.summary?.sourceDataWritePerformed !== false) {
        blockers.push(`TARGET_SOURCE_DATA_WRITE_DRIFT:${sectionId}`);
      }
      if (packet?.summary?.writesOperatorInput !== false || packet?.summary?.writesProductionData !== false) {
        blockers.push(`TARGET_WRITE_FLAG_DRIFT:${sectionId}`);
      }
      if (packet?.target?.imageAnalysis?.candidateReferenceOnly !== true) {
        blockers.push(`TARGET_PIXEL_CANDIDATE_NOT_REFERENCE_ONLY:${sectionId}`);
      }

      rows.push({
        sectionId,
        status: packet?.summary?.status ?? 'missing',
        matchesNextOperatorSection: packet?.summary?.matchesNextOperatorSection ?? false,
        targetSelectionMode: packet?.summary?.targetSelectionMode ?? '',
        imagePriorityRank: packet?.summary?.targetImagePriorityRank ?? null,
        imageRiskLevel: packet?.summary?.targetImageRiskLevel ?? '',
        imageRiskReasons: packet?.summary?.targetImageRiskReasons ?? [],
        cropViewBox: packet?.summary?.targetImageAnalysisCrop?.viewBox ?? '',
        officialCropPng: relativePath(officialCropPath),
        overlayCropPng: relativePath(overlayCropPath),
        edgeCropPng: relativePath(edgeCropPath),
        entryTemplateJson: relativePath(entryTemplatePath),
        entryTemplateCsv: relativePath(entryTemplateCsvPathForTarget),
        cropWidth: cropMetadata?.width ?? null,
        cropHeight: cropMetadata?.height ?? null,
        officialImageVerified: packet?.summary?.officialImageVerified === true,
        candidateReferenceOnly: packet?.target?.imageAnalysis?.candidateReferenceOnly === true,
        sourceDataWritePerformed: packet?.summary?.sourceDataWritePerformed ?? null,
        writesOperatorInput: packet?.summary?.writesOperatorInput ?? null,
        writesProductionData: packet?.summary?.writesProductionData ?? null,
        packetBlockers,
        commandExitCode: result.status,
      });
    }

    const summary = {
      packetVersion: ALL_TARGET_REVIEW_PACKETS_VERSION,
      status: blockers.length > 0 ? 'blocked' : 'waiting-for-operator',
      generatedAt: new Date().toISOString(),
      targetStage: TARGET_STAGE_LABEL,
      targetSelectionMode: 'all-stage01-official-png-review',
      expectedTargetCount: STAGE01_IMAGE_PRIORITY_SECTION_IDS.length,
      targetCount: rows.length,
      targetSectionIds: rows.map((row) => row.sectionId),
      officialPngOnly: true,
      targetPacketsGenerated: rows.filter((row) => row.status !== 'missing').length,
      officialCropTargetCount: rows.filter((row) => row.officialCropPng).length,
      overlayCropTargetCount: rows.filter((row) => row.overlayCropPng).length,
      edgeCropTargetCount: rows.filter((row) => row.edgeCropPng).length,
      entryTemplateTargetCount: rows.filter((row) => row.entryTemplateJson).length,
      allOfficialImagesVerified: rows.every((row) => row.officialImageVerified === true),
      allPixelCandidatesReferenceOnly: rows.every((row) => row.candidateReferenceOnly === true),
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
      writesOperatorInput: false,
      writesProductionData: false,
      officialImageAsset: OFFICIAL_IMAGE_ASSET,
      officialImageSha256: OFFICIAL_IMAGE_SHA256,
      mapVersion: MAP_VERSION,
      coordinateSystem: sourcePolicy.coordinateSystem,
      blockers,
    };

    const report = {
      generatedAt: summary.generatedAt,
      summary,
      sourcePolicy: {
        ...sourcePolicy,
        allStage01TargetsReviewOnly: true,
        targetPacketMode: '--allow-any-stage01-target',
      },
      safetyContract: [
        'This all-target Stage 01 review packet generator is read-only and never edits src/data/sajikSeatData.ts.',
        'It expands official PNG evidence coverage to all 16 Stage 01 P0 targets.',
        'It writes target review packets, crops, overlays, and blank target entry templates under reports only.',
        'It does not modify the operator input file and does not write production data.',
        'Pixel candidate paths remain reference-only and must not be copied into correctedPath without operator approval.',
      ],
      rows,
    };

    await writeJson(allTargetJsonPath, report);
    await writeCsv(allTargetCsvPath, [
      [
        'sectionId',
        'status',
        'matchesNextOperatorSection',
        'targetSelectionMode',
        'imagePriorityRank',
        'imageRiskLevel',
        'cropViewBox',
        'officialCropPng',
        'overlayCropPng',
        'edgeCropPng',
        'entryTemplateJson',
        'cropSize',
        'officialImageVerified',
        'candidateReferenceOnly',
        'sourceDataWritePerformed',
        'writesOperatorInput',
        'writesProductionData',
        'commandExitCode',
        'packetBlockers',
      ],
      ...rows.map((row) => [
        row.sectionId,
        row.status,
        row.matchesNextOperatorSection,
        row.targetSelectionMode,
        row.imagePriorityRank ?? '',
        row.imageRiskLevel,
        row.cropViewBox,
        row.officialCropPng,
        row.overlayCropPng,
        row.edgeCropPng,
        row.entryTemplateJson,
        `${row.cropWidth ?? '-'}x${row.cropHeight ?? '-'}`,
        row.officialImageVerified,
        row.candidateReferenceOnly,
        row.sourceDataWritePerformed,
        row.writesOperatorInput,
        row.writesProductionData,
        row.commandExitCode,
        row.packetBlockers.join('; '),
      ]),
    ]);
    const markdown = [
      '# Sajik Stage 01 All-Target Review Packets',
      '',
      `- packetVersion: \`${ALL_TARGET_REVIEW_PACKETS_VERSION}\``,
      `- status: \`${summary.status}\``,
      `- targetStage: \`${summary.targetStage}\``,
      `- targetSelectionMode: \`${summary.targetSelectionMode}\``,
      `- targets: \`${summary.targetCount}/${summary.expectedTargetCount}\``,
      `- officialImageSha256: \`${summary.officialImageSha256}\``,
      `- mapVersion: \`${summary.mapVersion}\``,
      `- sourceDataWritePerformed: \`${summary.sourceDataWritePerformed}\``,
      `- writesOperatorInput: \`${summary.writesOperatorInput}\``,
      `- writesProductionData: \`${summary.writesProductionData}\``,
      '',
      '## Scope',
      '',
      'This report widens Stage 01 official PNG review coverage from the next operator target to all 16 Stage 01 P0 targets. It creates review artifacts only; operator approval is still required before any production data change.',
      '',
      '## Targets',
      '',
      markdownTable(
        ['priority', 'section', 'status', 'next target', 'risk', 'crop viewBox', 'crop size', 'official crop', 'overlay crop', 'edge crop', 'entry template'],
        rows.map((row, index) => [
          `\`${index + 1}\``,
          `\`${row.sectionId}\``,
          `\`${row.status}\``,
          `\`${row.matchesNextOperatorSection}\``,
          `\`${row.imageRiskLevel || '-'}\``,
          `\`${row.cropViewBox || '-'}\``,
          `\`${row.cropWidth ?? '-'}x${row.cropHeight ?? '-'}\``,
          `\`${row.officialCropPng}\``,
          `\`${row.overlayCropPng}\``,
          `\`${row.edgeCropPng}\``,
          `\`${row.entryTemplateJson}\``,
        ]),
      ),
      '',
      '## Safety Contract',
      '',
      ...report.safetyContract.map((item) => `- ${item}`),
      '',
      '## Blockers',
      '',
      blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : '- none',
      '',
    ].join('\n');
    await fs.writeFile(`${allTargetMarkdownPath}.tmp`, markdown, 'utf8');
    await fs.rename(`${allTargetMarkdownPath}.tmp`, allTargetMarkdownPath);

    console.log(`stage01_all_target_review_packets_json:${relativePath(allTargetJsonPath)}`);
    console.log(`stage01_all_target_review_packets_csv:${relativePath(allTargetCsvPath)}`);
    console.log(`stage01_all_target_review_packets_markdown:${relativePath(allTargetMarkdownPath)}`);
    console.log(`status:${summary.status} targets=${summary.targetCount}/${summary.expectedTargetCount} officialPngOnly=${summary.officialPngOnly} sourceDataWritePerformed=${summary.sourceDataWritePerformed} writesOperatorInput=${summary.writesOperatorInput} writesProductionData=${summary.writesProductionData}`);

    if (blockers.length > 0) {
      process.exitCode = 1;
    }
    process.exit();
  }

  const nextActionPacket = await readJson(nextActionPacketPath);
  const reviewBoard = await readJson(reviewBoardPath);
  const nextRows = Array.isArray(nextActionPacket.rows) ? nextActionPacket.rows : [];
  const reviewRows = Array.isArray(reviewBoard.rows) ? reviewBoard.rows : [];
  const nextRow = nextRows.find((row) => String(row.sectionId ?? '').trim() === targetSectionId);
  const reviewRow = reviewRows.find((row) => String(row.sectionId ?? '').trim() === targetSectionId);
  const blockers = [];
  const warnings = [];

  if (nextActionPacket.summary?.packetVersion !== REQUIRED_NEXT_ACTION_PACKET_VERSION) {
    blockers.push(`NEXT_ACTION_PACKET_VERSION_MISMATCH:${nextActionPacket.summary?.packetVersion ?? 'missing'}`);
  }
  if (reviewBoard.summary?.reviewBoardVersion !== REQUIRED_REVIEW_BOARD_VERSION) {
    blockers.push(`REVIEW_BOARD_VERSION_MISMATCH:${reviewBoard.summary?.reviewBoardVersion ?? 'missing'}`);
  }
  if (nextActionPacket.summary?.targetStage !== TARGET_STAGE_LABEL || reviewBoard.summary?.targetStage !== TARGET_STAGE_LABEL) {
    blockers.push('TARGET_STAGE_MISMATCH');
  }
  if (String(nextActionPacket.summary?.nextOperatorSectionId ?? '').trim() !== targetSectionId && !allowAnyStage01Target) {
    blockers.push(`TARGET_DOES_NOT_MATCH_NEXT_OPERATOR_SECTION:${targetSectionId}:${nextActionPacket.summary?.nextOperatorSectionId ?? 'missing'}`);
  } else if (String(nextActionPacket.summary?.nextOperatorSectionId ?? '').trim() !== targetSectionId && allowAnyStage01Target) {
    warnings.push(`TARGET_IS_NOT_NEXT_OPERATOR_SECTION:${targetSectionId}:${nextActionPacket.summary?.nextOperatorSectionId ?? 'missing'}`);
  }
  if (!nextRow) {
    blockers.push(`NEXT_ACTION_ROW_MISSING:${targetSectionId}`);
  }
  if (!reviewRow) {
    blockers.push(`REVIEW_BOARD_ROW_MISSING:${targetSectionId}`);
  }
  if (nextActionPacket.summary?.productionWriteAllowed !== false || reviewBoard.summary?.productionWriteAllowed !== false) {
    blockers.push('PRODUCTION_WRITE_ALLOWED_NOT_FALSE');
  }
  if (nextActionPacket.summary?.sourceDataWritePerformed !== false || reviewBoard.summary?.sourceDataWritePerformed !== false) {
    blockers.push('SOURCE_DATA_WRITE_PERFORMED_NOT_FALSE');
  }
  if (reviewRow?.imageAnalysis?.candidateReferenceOnly !== true || nextRow?.imageCandidateReferenceOnly !== true) {
    blockers.push(`TARGET_PIXEL_CANDIDATE_NOT_REFERENCE_ONLY:${targetSectionId}`);
  }
  if (nextRow?.operatorDecision !== 'PENDING') {
    warnings.push(`TARGET_OPERATOR_DECISION_NOT_PENDING:${targetSectionId}:${nextRow?.operatorDecision ?? 'missing'}`);
  }

  const imageAnalysis = reviewRow?.imageAnalysis ?? {};
  const currentHitPath = reviewRow?.currentHitPath ?? nextRow?.currentHitPath ?? '';
  const currentVisualPath = reviewRow?.currentVisualPath ?? currentHitPath;
  const currentLabelPoint = reviewRow?.currentLabelPoint ?? nextRow?.currentLabelPoint ?? [];
  const viewportBounds = unionBounds([
    pathBoundsOrNull(currentHitPath),
    pathBoundsOrNull(currentVisualPath),
    pathBoundsOrNull(imageAnalysis.overlayPath),
    bboxObject(imageAnalysis.bbox),
    pointBounds(currentLabelPoint),
    pointBounds(imageAnalysis.seedPoint),
  ]);
  const viewport = expandedViewport(viewportBounds);
  const currentHitPathBounds = pathBoundsOrNull(currentHitPath);
  const imageAnalysisCrop = integerCropFromViewport(viewport);
  const officialImageBuffer = await fs.readFile(officialImagePath);
  const officialImageSha256Actual = createHash('sha256').update(officialImageBuffer).digest('hex');
  const officialImageMetadata = await sharp(officialImageBuffer).metadata();
  const officialImageVerified = officialImageSha256Actual === OFFICIAL_IMAGE_SHA256
    && officialImageMetadata.width === IMAGE_WIDTH
    && officialImageMetadata.height === IMAGE_HEIGHT;
  const matchesNextOperatorSection = String(nextActionPacket.summary?.nextOperatorSectionId ?? '').trim() === targetSectionId;

  if (officialImageSha256Actual !== OFFICIAL_IMAGE_SHA256) {
    blockers.push(`OFFICIAL_IMAGE_SHA256_MISMATCH:${officialImageSha256Actual}`);
  }
  if (officialImageMetadata.width !== IMAGE_WIDTH || officialImageMetadata.height !== IMAGE_HEIGHT) {
    blockers.push(`OFFICIAL_IMAGE_SIZE_MISMATCH:${officialImageMetadata.width ?? 'missing'}x${officialImageMetadata.height ?? 'missing'}`);
  }

  const imageAnalysisArtifacts = {
    artifactVersion: TARGET_IMAGE_ANALYSIS_VERSION,
    targetSectionId,
    referenceOnly: true,
    sourceImageVerified: officialImageVerified,
    sourceImageActualSha256: officialImageSha256Actual,
    sourceImageActualSize: `${officialImageMetadata.width ?? 'missing'}x${officialImageMetadata.height ?? 'missing'}`,
    outputScale: ANALYSIS_CROP_SCALE,
    crop: imageAnalysisCrop,
    officialCropPng: relativePath(officialCropPngPath),
    overlayCropPng: relativePath(overlayCropPngPath),
    edgeCropPng: relativePath(edgeCropPngPath),
    coordinateSystem: sourcePolicy.coordinateSystem,
    generatedBy: SCRIPT_NAME,
    operatorUse: [
      'Open the official crop first to trace from the locked 2026 Sajik PNG pixels.',
      'Use the overlay crop to compare current hitPath, label point, grid coordinates, and reference-only pixel component.',
      'Use the edge crop only to inspect nearby white boundaries and thin-seat seams.',
      'Cross-check the overlay SVG before entering correctedPath.',
    ],
    forbiddenUse: [
      'Do not copy the blue pixel component path into correctedPath.',
      'Do not trace from a resized screenshot without converting back to the 960x640 SVG viewBox.',
      'Do not infer coordinates from the edge crop alone.',
      'Do not use web search, crawling, AI coordinate prediction, or third-party seatmap images.',
    ],
  };

  const officialPngEvidence = {
    evidenceVersion: TARGET_REVIEW_EVIDENCE_VERSION,
    targetSectionId,
    officialImageAsset: OFFICIAL_IMAGE_ASSET,
    officialImageSha256: OFFICIAL_IMAGE_SHA256,
    mapVersion: MAP_VERSION,
    coordinateSystem: sourcePolicy.coordinateSystem,
    viewBox: `0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`,
    targetViewport: viewport,
    overlaySvg: relativePath(overlaySvgPath),
    reviewBoardSvg: relativePath(path.join(stageDir, 'sajik-seatmap-stage01-review-board.svg')),
    imageAnalysisArtifacts,
    currentTrace: {
      hitPath: currentHitPath,
      visualPath: currentVisualPath,
      hitPathBounds: currentHitPathBounds,
      hitPathPointCount: pathToPoints(String(currentHitPath)).length,
      hitPathArea: areaOrNull(currentHitPath),
      labelPoint: currentLabelPoint,
    },
    pixelComponentReference: {
      status: imageAnalysis.status ?? nextRow?.imageCandidateStatus ?? '',
      riskLevel: imageAnalysis.riskLevel ?? nextRow?.imageRiskLevel ?? '',
      riskReasons: imageAnalysis.riskReasons ?? nextRow?.imageRiskReasons ?? [],
      seedPoint: imageAnalysis.seedPoint ?? null,
      seedColor: imageAnalysis.seedColor ?? null,
      componentArea: imageAnalysis.componentArea ?? nextRow?.imageComponentArea ?? null,
      bbox: imageAnalysis.bbox ?? nextRow?.imageBbox ?? null,
      center: imageAnalysis.center ?? null,
      pathColorCoverageRatio: imageAnalysis.pathColorCoverageRatio ?? nextRow?.imagePathColorCoverageRatio ?? null,
      componentInsidePathRatio: imageAnalysis.componentInsidePathRatio ?? null,
      componentOutsideDilatedPathRatio: imageAnalysis.componentOutsideDilatedPathRatio ?? null,
      maxComponentOutsidePathDistance: imageAnalysis.maxComponentOutsidePathDistance ?? null,
      outerBoundaryPointCount: imageAnalysis.outerBoundaryPointCount ?? null,
      overlayPath: imageAnalysis.overlayPath ?? '',
      candidateReferenceOnly: imageAnalysis.candidateReferenceOnly === true || nextRow?.imageCandidateReferenceOnly === true,
    },
    operatorInterpretation: [
      'Use the blue official PNG pixel component as reference-only evidence, not as a correctedPath source.',
      'Use the red current hitPath only as the current production baseline.',
      'The operator must trace any correctedPath directly from the official PNG background inside the target viewport.',
      'Compare the 131 boundary against nearby first-base thin blocks before approving.',
    ],
    requiredReviewAssertions: [
      'Opened the target review overlay SVG with the official PNG background visible.',
      'Checked the official image hash and mapVersion in this packet.',
      'Compared current hitPath, current label point, pixel component bbox, and adjacent section boundaries.',
      'Did not copy pixel candidate overlayPath, browser CSS pixels, resized screenshot coordinates, or external seatmap coordinates.',
      'Placed correctedLabelX/Y inside the operator-traced correctedPath.',
    ],
    cannotAutoApproveReasons: [
      'targetImageRiskLevel is HIGH.',
      'The official PNG pixel component is small and must be manually inspected.',
      'Pixel component overlayPath is reference-only evidence.',
      'Production writes are disabled; this packet only prepares operator review input.',
    ],
    sourceFieldPolicy: {
      targetSourceFile: 'src/data/sajikSeatData.ts',
      writableSourceFields: WRITABLE_SOURCE_FIELDS,
      lockedSourceFields: LOCKED_SOURCE_FIELDS,
      productionWriteAllowed: false,
      sourceDataWritePerformed: false,
    },
  };

  const operatorEntryTemplate = {
    sectionId: targetSectionId,
    operatorDecision: 'PENDING',
    operatorDecisionOptions: OPERATOR_DECISION_OPTIONS,
    correctedPath: '',
    correctedLabelX: '',
    correctedLabelY: '',
    reviewer: '',
    reviewedAt: '',
    operatorNote: '',
    approvedRequiredFields: APPROVED_REQUIRED_FIELDS,
    keepCurrentRule: reviewBoard.summary?.keepCurrentRule ?? 'KEEP_CURRENT keeps the current production geometry and never enters patch preview.',
    patchPreviewEligible: false,
    officialPngEvidenceVersion: TARGET_REVIEW_EVIDENCE_VERSION,
    officialImageAsset: OFFICIAL_IMAGE_ASSET,
    officialImageSha256: OFFICIAL_IMAGE_SHA256,
    mapVersion: MAP_VERSION,
    sourceViewport: viewport.viewBox,
    officialPngReviewRequired: true,
    officialPngReviewAssertions: officialPngEvidence.requiredReviewAssertions,
    officialPngImageAnalysisArtifacts: imageAnalysisArtifacts,
    writableSourceFields: WRITABLE_SOURCE_FIELDS,
    lockedSourceFields: LOCKED_SOURCE_FIELDS,
  };

  const operatorInputChecklist = {
    targetSectionId,
    officialPngEvidence: TARGET_REVIEW_EVIDENCE_VERSION,
    officialImageAsset: OFFICIAL_IMAGE_ASSET,
    officialImageSha256: OFFICIAL_IMAGE_SHA256,
    mapVersion: MAP_VERSION,
    primaryInputSource: relativePath(entryTemplateJsonPath),
    alternateInputSource: relativePath(path.join(stageDir, 'sajik-seatmap-stage01-operator-input.json')),
    targetEntryTemplate: relativePath(entryTemplateJsonPath),
    targetEntryTemplateCsv: relativePath(entryTemplateCsvPath),
    reviewPacketMarkdown: relativePath(markdownPath),
    reviewPacketOverlaySvg: relativePath(overlaySvgPath),
    officialCropPng: relativePath(officialCropPngPath),
    overlayCropPng: relativePath(overlayCropPngPath),
    edgeCropPng: relativePath(edgeCropPngPath),
    imageAnalysisArtifacts,
    reviewBoardSvg: relativePath(path.join(stageDir, 'sajik-seatmap-stage01-review-board.svg')),
    entrySheetCsv: relativePath(path.join(stageDir, 'sajik-seatmap-stage01-entry-sheet.csv')),
    sourceConflictRule: 'If both primaryInputSource and alternateInputSource contain editable values for this target, they must match exactly or TARGET_APPROVAL_SOURCE_CONFLICT blocks approval.',
    sourceFieldPolicy: officialPngEvidence.sourceFieldPolicy,
    allowedCoordinateSource: sourcePolicy.allowedCoordinateSource,
    coordinateSystem: sourcePolicy.coordinateSystem,
    requiredApprovalFields: APPROVED_REQUIRED_FIELDS,
    approvedEntryExample: {
      sectionId: targetSectionId,
      operatorDecision: 'APPROVED',
      correctedPath: '<operator traced official PNG path>',
      correctedLabelX: '<label x inside correctedPath>',
      correctedLabelY: '<label y inside correctedPath>',
      reviewer: '<operator name>',
      reviewedAt: '<ISO timestamp>',
      operatorNote: 'official PNG manual trace',
    },
    requiredHumanActions: [
      'Open the target review overlay SVG, official PNG crop, overlay crop, and edge crop for this section.',
      'Verify officialImageSha256 and mapVersion in the review packet before tracing.',
      'Trace correctedPath from the official 2026 Sajik PNG in SVG viewBox coordinates only.',
      'Place correctedLabelX and correctedLabelY inside the correctedPath.',
      'Fill operatorNote with a short statement that the corrected path came from official PNG manual review.',
      'Fill reviewer and reviewedAt when operatorDecision is APPROVED.',
      'Run npm run stadium:sajik:stage01-target-approval-gate before prewrite.',
    ],
    requiredReviewAssertions: officialPngEvidence.requiredReviewAssertions,
    forbiddenCoordinateSources: sourcePolicy.disallowedSources,
    readyForPrewriteCriteria: [
      'operatorDecision=APPROVED',
      'correctedPath is a valid single closed M/L/Z polygon path',
      'correctedLabelX and correctedLabelY are finite numbers inside correctedPath',
      'reviewer and reviewedAt are present',
      'operatorNote documents official PNG manual review',
      'target approval gate reports readyForPrewrite=true',
    ],
    decisionFallbacks: [
      'REJECTED, NEEDS_RETRACE, and KEEP_CURRENT do not enter patch preview.',
      'KEEP_CURRENT keeps the current production geometry.',
      'PENDING keeps the row waiting for operator input.',
    ],
  };

  const target = {
    sectionId: targetSectionId,
    sectionName: reviewRow?.sectionName ?? nextRow?.sectionName ?? '',
    batchId: reviewRow?.batchId ?? nextRow?.batchId ?? '',
    zoneId: reviewRow?.zoneId ?? nextRow?.zoneId ?? '',
    zoneLabel: reviewRow?.zoneLabel ?? nextRow?.zoneLabel ?? '',
    rowStatus: reviewRow?.rowStatus ?? nextRow?.rowStatus ?? '',
    operatorDecision: nextRow?.operatorDecision ?? reviewRow?.operatorDecision ?? '',
    actionCode: nextRow?.actionCode ?? reviewRow?.action ?? '',
    nextAction: nextRow?.nextAction ?? reviewRow?.nextAction ?? '',
    operatorAction: nextRow?.operatorAction ?? '',
    operatorFocus: nextRow?.operatorFocus ?? '',
    acceptance: nextRow?.acceptance ?? '',
    currentHitPath,
    currentVisualPath,
    currentHitPathPointCount: pathToPoints(String(currentHitPath)).length,
    currentHitPathArea: areaOrNull(currentHitPath),
    currentLabelPoint,
    imageAnalysis: {
      status: imageAnalysis.status ?? nextRow?.imageCandidateStatus ?? '',
      riskLevel: imageAnalysis.riskLevel ?? nextRow?.imageRiskLevel ?? '',
      riskReasons: imageAnalysis.riskReasons ?? nextRow?.imageRiskReasons ?? [],
      seedPoint: imageAnalysis.seedPoint ?? null,
      seedColor: imageAnalysis.seedColor ?? null,
      componentArea: imageAnalysis.componentArea ?? nextRow?.imageComponentArea ?? null,
      bbox: imageAnalysis.bbox ?? nextRow?.imageBbox ?? null,
      center: imageAnalysis.center ?? null,
      pathColorCoverageRatio: imageAnalysis.pathColorCoverageRatio ?? nextRow?.imagePathColorCoverageRatio ?? null,
      componentInsidePathRatio: imageAnalysis.componentInsidePathRatio ?? null,
      componentOutsideDilatedPathRatio: imageAnalysis.componentOutsideDilatedPathRatio ?? null,
      maxComponentOutsidePathDistance: imageAnalysis.maxComponentOutsidePathDistance ?? null,
      outerBoundaryPointCount: imageAnalysis.outerBoundaryPointCount ?? null,
      overlayPath: imageAnalysis.overlayPath ?? '',
      candidateReferenceOnly: imageAnalysis.candidateReferenceOnly === true || nextRow?.imageCandidateReferenceOnly === true,
    },
  };

  const summary = {
    packetVersion: PACKET_VERSION,
    evidenceVersion: TARGET_REVIEW_EVIDENCE_VERSION,
    status: blockers.length > 0 ? 'blocked' : 'waiting-for-operator',
    targetStage: TARGET_STAGE_LABEL,
    targetSectionId,
    targetSelectionMode: allowAnyStage01Target ? 'stage01-any-target-review' : 'next-operator-target-only',
    officialImageAsset: OFFICIAL_IMAGE_ASSET,
    officialImageSha256: OFFICIAL_IMAGE_SHA256,
    mapVersion: MAP_VERSION,
    matchesNextOperatorSection,
    nextOperatorSectionId: nextActionPacket.summary?.nextOperatorSectionId ?? null,
    nextOperatorImagePriorityRank: nextActionPacket.summary?.nextOperatorImagePriorityRank ?? null,
    targetImagePriorityRank: nextRow?.imagePriorityRank ?? null,
    targetImageRiskLevel: target.imageAnalysis.riskLevel,
    targetImageRiskReasons: target.imageAnalysis.riskReasons,
    targetImageBbox: formatBbox(target.imageAnalysis.bbox),
    targetViewport: viewport,
    targetImageAnalysisVersion: TARGET_IMAGE_ANALYSIS_VERSION,
    targetImageAnalysisCrop: imageAnalysisCrop,
    targetImageAnalysisArtifactsGenerated: true,
    targetImageAnalysisArtifacts: {
      officialCropPng: relativePath(officialCropPngPath),
      overlayCropPng: relativePath(overlayCropPngPath),
      edgeCropPng: relativePath(edgeCropPngPath),
    },
    officialImageVerified,
    productionWriteAllowed: false,
    sourceDataWritePerformed: false,
    writesOperatorInput: false,
    writesProductionData: false,
    nextActionPacket: relativePath(nextActionPacketPath),
    reviewBoard: relativePath(reviewBoardPath),
    reviewBoardSvg: relativePath(path.join(stageDir, 'sajik-seatmap-stage01-review-board.svg')),
    entrySheetCsv: relativePath(path.join(stageDir, 'sajik-seatmap-stage01-entry-sheet.csv')),
    blockers,
    warnings,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    sourcePolicy,
    safetyContract: [
      'This target review packet is read-only and never edits src/data/sajikSeatData.ts.',
      'It never modifies reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json.',
      'It reads the Stage 01 next-action packet and review board, then emits target-specific review artifacts.',
      'It narrows official PNG evidence into an official PNG crop viewBox for operator review but does not infer coordinates.',
      `It is generated by ${SCRIPT_NAME}.`,
      'Pixel candidate paths are reference-only and must not be copied into correctedPath without operator approval.',
      'AI coordinate prediction, external baseball data, web search, crawling, resized screenshots, and browser CSS pixels are not valid coordinate sources.',
    ],
    target,
    officialPngEvidence,
    operatorEntryTemplate,
    operatorInputChecklist,
  };

  await writeImageAnalysisArtifacts({
    imageBuffer: officialImageBuffer,
    crop: imageAnalysisCrop,
    target,
  });
  await writeJson(jsonPath, report);
  await writeJson(entryTemplateJsonPath, operatorEntryTemplate);
  await writeCsv(entryTemplateCsvPath, [
    [
      'sectionId',
      'operatorDecision',
      'operatorDecisionOptions',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
      'operatorNote',
      'approvedRequiredFields',
      'officialPngEvidenceVersion',
      'officialImageAsset',
      'officialImageSha256',
      'mapVersion',
      'sourceViewport',
      'officialPngReviewRequired',
      'nextAction',
    ],
    [
      operatorEntryTemplate.sectionId,
      operatorEntryTemplate.operatorDecision,
      operatorEntryTemplate.operatorDecisionOptions.join('|'),
      operatorEntryTemplate.correctedPath,
      operatorEntryTemplate.correctedLabelX,
      operatorEntryTemplate.correctedLabelY,
      operatorEntryTemplate.reviewer,
      operatorEntryTemplate.reviewedAt,
      operatorEntryTemplate.operatorNote,
      operatorEntryTemplate.approvedRequiredFields.join('|'),
      operatorEntryTemplate.officialPngEvidenceVersion,
      operatorEntryTemplate.officialImageAsset,
      operatorEntryTemplate.officialImageSha256,
      operatorEntryTemplate.mapVersion,
      operatorEntryTemplate.sourceViewport,
      operatorEntryTemplate.officialPngReviewRequired,
      target.nextAction,
    ],
  ]);

  const markdown = [
    '# Sajik Stage 01 Target Review Packet',
    '',
    `- packetVersion: \`${PACKET_VERSION}\``,
    `- evidenceVersion: \`${TARGET_REVIEW_EVIDENCE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- targetSectionId: \`${summary.targetSectionId}\``,
    `- targetSelectionMode: \`${summary.targetSelectionMode}\``,
    `- mapVersion: \`${summary.mapVersion}\``,
    `- officialImageSha256: \`${summary.officialImageSha256}\``,
    `- nextOperatorSectionId: \`${summary.nextOperatorSectionId ?? '-'}\``,
    `- matchesNextOperatorSection: \`${summary.matchesNextOperatorSection}\``,
    `- imagePriorityRank: \`${summary.targetImagePriorityRank ?? '-'}\``,
    `- imageRiskLevel: \`${summary.targetImageRiskLevel || '-'}\``,
    `- imageRiskReasons: \`${Array.isArray(summary.targetImageRiskReasons) ? summary.targetImageRiskReasons.join(' | ') : '-'}\``,
    `- targetViewport: \`${summary.targetViewport.viewBox}\``,
    `- productionWriteAllowed: \`${summary.productionWriteAllowed}\``,
    `- sourceDataWritePerformed: \`${summary.sourceDataWritePerformed}\``,
    `- writesOperatorInput: \`${summary.writesOperatorInput}\``,
    `- writesProductionData: \`${summary.writesProductionData}\``,
    '',
    '## Source Policy',
    '',
    `- allowedCoordinateSource: \`${sourcePolicy.allowedCoordinateSource}\``,
    `- coordinateSystem: \`${sourcePolicy.coordinateSystem}\``,
    `- missingBaseballDataContract: \`${sourcePolicy.missingBaseballDataContract}\``,
    '- Pixel candidate paths are evidence only and must not be copied into `correctedPath` without operator approval.',
    '',
    '## Official PNG Target Evidence Review',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['officialImageAsset', `\`${officialPngEvidence.officialImageAsset}\``],
        ['officialImageSha256', `\`${officialPngEvidence.officialImageSha256}\``],
        ['mapVersion', `\`${officialPngEvidence.mapVersion}\``],
        ['viewBox', `\`${officialPngEvidence.viewBox}\``],
        ['targetViewport', `\`${officialPngEvidence.targetViewport.viewBox}\``],
        ['imageAnalysisArtifactVersion', `\`${imageAnalysisArtifacts.artifactVersion}\``],
        ['officialCropPng', `\`${imageAnalysisArtifacts.officialCropPng}\``],
        ['overlayCropPng', `\`${imageAnalysisArtifacts.overlayCropPng}\``],
        ['edgeCropPng', `\`${imageAnalysisArtifacts.edgeCropPng}\``],
        ['imageAnalysisCrop', `\`${imageAnalysisArtifacts.crop.viewBox}\``],
        ['sourceImageVerified', `\`${imageAnalysisArtifacts.sourceImageVerified}\``],
        ['currentHitPathBounds', `\`${officialPngEvidence.currentTrace.hitPathBounds ? formatBbox(officialPngEvidence.currentTrace.hitPathBounds) : '-'}\``],
        ['pixelComponentBbox', `\`${formatBbox(officialPngEvidence.pixelComponentReference.bbox) || '-'}\``],
        ['pixelComponentArea', `\`${officialPngEvidence.pixelComponentReference.componentArea ?? '-'}\``],
        ['candidateReferenceOnly', `\`${officialPngEvidence.pixelComponentReference.candidateReferenceOnly}\``],
        ['sourceFieldPolicy', `\`writable=${officialPngEvidence.sourceFieldPolicy.writableSourceFields.join(' | ')}; locked=${officialPngEvidence.sourceFieldPolicy.lockedSourceFields.join(' | ')}\``],
      ],
    ),
    '',
    '## Official PNG Image Analysis Artifacts',
    '',
    'These images are generated from the locked official PNG and are reference-only operator review aids. They are not an automatic coordinate source.',
    '',
    markdownTable(
      ['artifact', 'path', 'operator use'],
      [
        ['official PNG crop', `\`${imageAnalysisArtifacts.officialCropPng}\``, 'Trace from the official PNG pixels in the locked viewBox.'],
        ['overlay crop', `\`${imageAnalysisArtifacts.overlayCropPng}\``, 'Compare red current hitPath, blue reference-only pixel component, label point, and grid coordinates.'],
        ['edge crop', `\`${imageAnalysisArtifacts.edgeCropPng}\``, 'Inspect boundaries and seams only; do not infer coordinates from this image alone.'],
      ],
    ),
    '',
    `![official PNG crop](${path.basename(officialCropPngPath)})`,
    '',
    `![official PNG overlay crop](${path.basename(overlayCropPngPath)})`,
    '',
    `![official PNG edge crop](${path.basename(edgeCropPngPath)})`,
    '',
    '### Operator Interpretation',
    '',
    ...officialPngEvidence.operatorInterpretation.map((item) => `- ${item}`),
    '',
    '### Required Review Assertions',
    '',
    ...officialPngEvidence.requiredReviewAssertions.map((item) => `- ${item}`),
    '',
    '### Cannot Auto-Approve Reasons',
    '',
    ...officialPngEvidence.cannotAutoApproveReasons.map((item) => `- ${item}`),
    '',
    '## Target Evidence',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['sectionId', `\`${target.sectionId}\``],
        ['sectionName', target.sectionName],
        ['batchId', `\`${target.batchId}\``],
        ['zoneId', `\`${target.zoneId}\``],
        ['rowStatus', `\`${target.rowStatus}\``],
        ['actionCode', `\`${target.actionCode}\``],
        ['currentLabelPoint', `\`${Array.isArray(target.currentLabelPoint) ? target.currentLabelPoint.join(',') : '-'}\``],
        ['currentHitPathPointCount', `\`${target.currentHitPathPointCount}\``],
        ['currentHitPathArea', `\`${target.currentHitPathArea ?? '-'}\``],
        ['pixelStatus', `\`${target.imageAnalysis.status}\``],
        ['pixelComponentArea', `\`${target.imageAnalysis.componentArea ?? '-'}\``],
        ['pixelPathColorCoverageRatio', `\`${target.imageAnalysis.pathColorCoverageRatio ?? '-'}\``],
        ['pixelBbox', `\`${summary.targetImageBbox || '-'}\``],
        ['pixelSeedPoint', `\`${Array.isArray(target.imageAnalysis.seedPoint) ? target.imageAnalysis.seedPoint.join(',') : '-'}\``],
        ['candidateReferenceOnly', `\`${target.imageAnalysis.candidateReferenceOnly}\``],
      ],
    ),
    '',
    '## Operator Entry Template',
    '',
    '```json',
    JSON.stringify(operatorEntryTemplate, null, 2),
    '```',
    '',
    '## Operator Input Checklist',
    '',
    markdownTable(
      ['field', 'value'],
      [
        ['targetEntryTemplate', `\`${operatorInputChecklist.targetEntryTemplate}\``],
        ['primaryInputSource', `\`${operatorInputChecklist.primaryInputSource}\``],
        ['alternateInputSource', `\`${operatorInputChecklist.alternateInputSource}\``],
        ['sourceConflictRule', operatorInputChecklist.sourceConflictRule],
        ['officialPngEvidence', `\`${operatorInputChecklist.officialPngEvidence}\``],
        ['officialImageSha256', `\`${operatorInputChecklist.officialImageSha256}\``],
        ['mapVersion', `\`${operatorInputChecklist.mapVersion}\``],
        ['sourceFieldPolicy', `\`writable=${operatorInputChecklist.sourceFieldPolicy.writableSourceFields.join(' | ')}; locked=${operatorInputChecklist.sourceFieldPolicy.lockedSourceFields.join(' | ')}\``],
        ['reviewPacketOverlaySvg', `\`${operatorInputChecklist.reviewPacketOverlaySvg}\``],
        ['officialCropPng', `\`${operatorInputChecklist.officialCropPng}\``],
        ['overlayCropPng', `\`${operatorInputChecklist.overlayCropPng}\``],
        ['edgeCropPng', `\`${operatorInputChecklist.edgeCropPng}\``],
        ['reviewBoardSvg', `\`${operatorInputChecklist.reviewBoardSvg}\``],
        ['entrySheetCsv', `\`${operatorInputChecklist.entrySheetCsv}\``],
        ['allowedCoordinateSource', `\`${operatorInputChecklist.allowedCoordinateSource}\``],
        ['coordinateSystem', `\`${operatorInputChecklist.coordinateSystem}\``],
        ['requiredApprovalFields', `\`${operatorInputChecklist.requiredApprovalFields.join(' | ')}\``],
        ['forbiddenCoordinateSources', `\`${operatorInputChecklist.forbiddenCoordinateSources.join(' | ')}\``],
        ['readyForPrewriteCriteria', `\`${operatorInputChecklist.readyForPrewriteCriteria.join(' | ')}\``],
      ],
    ),
    '',
    '### Approved Entry Example',
    '',
    '```json',
    JSON.stringify(operatorInputChecklist.approvedEntryExample, null, 2),
    '```',
    '',
    '### Required Human Actions',
    '',
    ...operatorInputChecklist.requiredHumanActions.map((action) => `- ${action}`),
    '',
    '### Decision Fallbacks',
    '',
    ...operatorInputChecklist.decisionFallbacks.map((action) => `- ${action}`),
    '',
    '## Operator Action',
    '',
    `- action: ${target.operatorAction || '-'}`,
    `- focus: ${target.operatorFocus || '-'}`,
    `- acceptance: ${target.acceptance || '-'}`,
    '',
    '## Outputs',
    '',
    `- \`${relativePath(jsonPath)}\``,
    `- \`${relativePath(markdownPath)}\``,
    `- \`${relativePath(overlaySvgPath)}\``,
    `- \`${relativePath(officialCropPngPath)}\``,
    `- \`${relativePath(overlayCropPngPath)}\``,
    `- \`${relativePath(edgeCropPngPath)}\``,
    `- \`${relativePath(entryTemplateJsonPath)}\``,
    `- \`${relativePath(entryTemplateCsvPath)}\``,
    '',
    '## Blockers',
    '',
    ...(blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``) : ['- none']),
    '',
    '## Warnings',
    '',
    ...(warnings.length > 0 ? warnings.map((warning) => `- \`${warning}\``) : ['- none']),
    '',
  ].join('\n');
  await fs.writeFile(`${markdownPath}.tmp`, markdown, 'utf8');
  await fs.rename(`${markdownPath}.tmp`, markdownPath);

  const [labelX, labelY] = Array.isArray(target.currentLabelPoint) ? target.currentLabelPoint : [0, 0];
  const imageBbox = bboxObject(target.imageAnalysis.bbox);
  const bboxRect = imageBbox
    ? `<rect x="${imageBbox.minX}" y="${imageBbox.minY}" width="${Math.max(1, imageBbox.maxX - imageBbox.minX)}" height="${Math.max(1, imageBbox.maxY - imageBbox.minY)}" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/>`
    : '';
  const pixelOverlay = target.imageAnalysis.overlayPath
    ? `<path d="${xmlEscape(target.imageAnalysis.overlayPath)}" fill="#0ea5e9" fill-opacity="0.12" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="3 3" vector-effect="non-scaling-stroke">
      <title>${xmlEscape(`${target.sectionId} official PNG pixel evidence reference-only`)}</title>
    </path>`
    : '';
  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="980" height="${Math.max(420, Math.round((viewport.height / viewport.width) * 980))}" viewBox="${viewport.viewBox}">
    <image href="${xmlEscape(IMAGE_HREF)}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" opacity="0.72"/>
    <rect x="${viewport.minX + 2}" y="${viewport.minY + 2}" width="${viewport.width - 4}" height="${viewport.height - 4}" fill="none" stroke="#0f172a" stroke-width="1" vector-effect="non-scaling-stroke"/>
    <path d="${xmlEscape(target.currentHitPath)}" fill="#f97316" fill-opacity="0.22" stroke="#dc2626" stroke-width="2.5" vector-effect="non-scaling-stroke">
      <title>${xmlEscape(`${target.sectionId} current hitPath`)}</title>
    </path>
    ${pixelOverlay}
    ${bboxRect}
    <circle cx="${Number(labelX) || 0}" cy="${Number(labelY) || 0}" r="4" fill="#ef4444" stroke="#ffffff" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
    <text x="${(Number(labelX) || viewport.minX) + 7}" y="${(Number(labelY) || viewport.minY) - 7}" font-family="Arial, sans-serif" font-size="9" font-weight="900" fill="#0f172a" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">${xmlEscape(`${target.sectionId} label`)}</text>
    <g transform="translate(${viewport.minX + 6} ${viewport.minY + 14})">
      <rect x="0" y="-12" width="122" height="47" rx="3" fill="#ffffff" fill-opacity="0.9" stroke="#cbd5e1" vector-effect="non-scaling-stroke"/>
      <text x="7" y="0" font-family="Arial, sans-serif" font-size="8" font-weight="900" fill="#0f172a">${xmlEscape(`Sajik ${target.sectionId}`)}</text>
      <text x="7" y="12" font-family="Arial, sans-serif" font-size="7" fill="#334155">${xmlEscape(`${target.imageAnalysis.riskLevel} ${target.imageAnalysis.riskReasons.join(' ')}`)}</text>
      <text x="7" y="24" font-family="Arial, sans-serif" font-size="7" fill="#334155">red=current, blue=PNG evidence only</text>
      <text x="7" y="33" font-family="Arial, sans-serif" font-size="7" fill="#334155">trace from official PNG; do not copy blue path</text>
    </g>
  </svg>
  `;
  await fs.writeFile(`${overlaySvgPath}.tmp`, overlaySvg, 'utf8');
  await fs.rename(`${overlaySvgPath}.tmp`, overlaySvgPath);

  console.log(`stage01_target_review_packet_json:${relativePath(jsonPath)}`);
  console.log(`stage01_target_review_packet_markdown:${relativePath(markdownPath)}`);
  console.log(`stage01_target_review_packet_svg:${relativePath(overlaySvgPath)}`);
  console.log(`stage01_target_entry_template_json:${relativePath(entryTemplateJsonPath)}`);
  console.log(`stage01_target_entry_template_csv:${relativePath(entryTemplateCsvPath)}`);
  console.log(
    `status:${summary.status} target=${summary.targetSectionId} next=${summary.nextOperatorSectionId ?? '-'} risk=${summary.targetImageRiskLevel || '-'} bbox=${summary.targetImageBbox || '-'} sourceDataWritePerformed=${summary.sourceDataWritePerformed}`,
  );

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const TASKS = {
  "stage01-131-apply-path-status": runStage01131ApplyPathStatus,
  "stage01-131-lifecycle-smoke": runStage01131LifecycleSmoke,
  "stage01-all-target-approval-input-guide-smoke": runStage01AllTargetApprovalInputGuideSmoke,
  "stage01-all-target-approval-input-guide": runStage01AllTargetApprovalInputGuide,
  "stage01-all-target-approval-readiness-smoke": runStage01AllTargetApprovalReadinessSmoke,
  "stage01-all-target-approval-readiness": runStage01AllTargetApprovalReadiness,
  "stage01-applied-dry-run": runStage01AppliedDryRun,
  "stage01-apply-ready": runStage01ApplyReady,
  "stage01-approved-dry-run": runStage01ApprovedDryRun,
  "stage01-completion-gate-smoke": runStage01CompletionGateSmoke,
  "stage01-completion-gate": runStage01CompletionGate,
  "stage01-manual-patch-plan": runStage01ManualPatchPlan,
  "stage01-next-action-packet": runStage01NextActionPacket,
  "stage01-operator-input-aid": runStage01OperatorInputAid,
  "stage01-operator-input-intake-gate-smoke": runStage01OperatorInputIntakeGateSmoke,
  "stage01-operator-input-intake-gate": runStage01OperatorInputIntakeGate,
  "stage01-operator-package": runStage01OperatorPackage,
  "stage01-operator-status": runStage01OperatorStatus,
  "stage01-post-apply-audit": runStage01PostApplyAudit,
  "stage01-prewrite-smoke": runStage01PrewriteSmoke,
  "stage01-prewrite": runStage01Prewrite,
  "stage01-readiness-summary-smoke": runStage01ReadinessSummarySmoke,
  "stage01-readiness-summary": runStage01ReadinessSummary,
  "stage01-real-approval-readiness": runStage01RealApprovalReadiness,
  "stage01-review-board": runStage01ReviewBoard,
  "stage01-staged-scope-audit-smoke": runStage01StagedScopeAuditSmoke,
  "stage01-staged-scope-audit": runStage01StagedScopeAudit,
  "stage01-target-apply-precheck": runStage01TargetApplyPrecheck,
  "stage01-target-approval-gate-smoke": runStage01TargetApprovalGateSmoke,
  "stage01-target-approval-gate": runStage01TargetApprovalGate,
  "stage01-target-entry-preflight-smoke": runStage01TargetEntryPreflightSmoke,
  "stage01-target-entry-preflight": runStage01TargetEntryPreflight,
  "stage01-target-entry-template-readiness-smoke": runStage01TargetEntryTemplateReadinessSmoke,
  "stage01-target-image-analysis-smoke": runStage01TargetImageAnalysisSmoke,
  "stage01-target-review-packet": runStage01TargetReviewPacket,
};

export const runSajikStage01Task = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Sajik stage01 task: ${task}. Available tasks: ${available}`);
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
  await runSajikStage01Task(task, args);
}
