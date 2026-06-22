import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runOperatorInputAid = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    GWANGJU_BLOCKS,
    GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
    GWANGJU_OFFICIAL_TRACE_REFERENCE,
    GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
    GWANGJU_PENDING_OPERATOR_SECTIONS,
    GWANGJU_SEATMAP_IMAGE,
  } = await import('../src/data/gwangjuSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  
  const INPUT_AID_VERSION = 'GWANGJU_OPERATOR_INPUT_AID_V1';
  const INPUT_AID_MODE = 'OPERATOR_COORDINATE_INPUT_EVIDENCE_ONLY';
  const jsonPath = path.join(reportDir, 'gwangju-seatmap-operator-input-aid.json');
  const csvPath = path.join(reportDir, 'gwangju-seatmap-operator-input-aid.csv');
  const markdownPath = path.join(reportDir, 'gwangju-seatmap-operator-input-aid.md');
  
  const inputFiles = {
    traceReview: path.join(reportDir, 'gwangju-seatmap-trace-review.json'),
    operatorTemplate: path.join(reportDir, 'gwangju-seatmap-operator-template.json'),
    operatorStatus: path.join(reportDir, 'gwangju-seatmap-operator-status.json'),
  };
  
  const sourcePolicy = {
    allowedCoordinateSource: 'operator-provided official image coordinates only',
    coordinateSystem: `${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight}`,
    disallowedSources: [
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  };
  
  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
  
  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  
  const writeCsv = async (filePath, rows) => {
    await fs.writeFile(filePath, `${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');
  };
  
  const relativePath = (filePath) => path.relative(frontendRoot, filePath);
  
  const readJson = async (filePath) => {
    try {
      return {
        exists: true,
        path: relativePath(filePath),
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: null,
      };
    } catch (error) {
      return {
        exists: false,
        path: relativePath(filePath),
        data: null,
        error: error?.code === 'ENOENT' ? 'MISSING_OPERATOR_INPUT_AID_INPUT' : `READ_FAILED:${error.message}`,
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
  
  const unique = (values) => Array.from(new Set(values.filter((value) => value !== null && value !== undefined)));
  
  const unionBounds = (boundsList) => {
    const bounds = boundsList.filter(Boolean);
    if (bounds.length === 0) return null;
    return {
      minX: Math.min(...bounds.map((item) => item.minX)),
      minY: Math.min(...bounds.map((item) => item.minY)),
      maxX: Math.max(...bounds.map((item) => item.maxX)),
      maxY: Math.max(...bounds.map((item) => item.maxY)),
    };
  };
  
  const isFilled = (field, value) => {
    if (field === 'officialBlocks' || field === 'points') return Array.isArray(value) && value.length > 0;
    if (field === 'labelX' || field === 'labelY') {
      return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
    }
    return typeof value === 'string' && value.trim().length > 0;
  };
  
  const traceReview = await readJson(inputFiles.traceReview);
  const operatorTemplate = await readJson(inputFiles.operatorTemplate);
  const operatorStatus = await readJson(inputFiles.operatorStatus);
  const requiredInputs = { traceReview, operatorTemplate, operatorStatus };
  const blockers = Object.values(requiredInputs)
    .filter((input) => !input.exists)
    .map((input) => `${input.error}:${input.path}`);
  
  const traceBlocksById = new Map((traceReview.data?.blocks ?? []).map((block) => [block.id, block]));
  const templateSectionsById = new Map((operatorTemplate.data?.sections ?? []).map((section) => [section.id, section]));
  const dataBlocksById = new Map(GWANGJU_BLOCKS.map((block) => [block.id, block]));
  const cleanCropDir = path.join(reportDir, 'gwangju-seatmap-trace-review-clean-crops');
  
  const sectionReports = await Promise.all(
    GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map(async (requirement) => {
      const sourceRanges = GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES
        .filter((range) => range.sourceRequirementIds.includes(requirement.id));
      const targetBlockIds = unique(sourceRanges.flatMap((range) => range.blockIds));
      const targetOfficialBlocks = unique(sourceRanges.flatMap((range) => range.officialBlocks));
      const referenceBlocks = await Promise.all(targetBlockIds.map(async (blockId) => {
        const dataBlock = dataBlocksById.get(blockId) ?? {};
        const traceBlock = traceBlocksById.get(blockId) ?? {};
        const reference = GWANGJU_OFFICIAL_TRACE_REFERENCE[blockId] ?? {};
        const cleanCropPath = path.join(cleanCropDir, `gwangju-seatmap-trace-review-${blockId}-clean-overlay.png`);
  
        return {
          id: blockId,
          officialBlock: dataBlock.block ?? traceBlock.block ?? null,
          name: dataBlock.name ?? traceBlock.name ?? null,
          category: dataBlock.category ?? traceBlock.category ?? null,
          level: dataBlock.level ?? traceBlock.level ?? null,
          side: dataBlock.side ?? traceBlock.side ?? null,
          fanRole: dataBlock.fanRole ?? traceBlock.fanRole ?? null,
          labelAnchor: reference.numberAnchor ?? {
            x: traceBlock.labelX ?? null,
            y: traceBlock.labelY ?? null,
          },
          expectedBounds: reference.expectedBounds ?? traceBlock.expectedBounds ?? null,
          cleanCropPath: relativePath(cleanCropPath),
          cleanCropExists: await fileExists(cleanCropPath),
          referenceOnly: true,
        };
      }));
  
      referenceBlocks
        .filter((block) => !block.cleanCropExists)
        .forEach((block) => blockers.push(`MISSING_REFERENCE_CROP:${requirement.id}:${block.id}`));
  
      const templateSection = templateSectionsById.get(requirement.id) ?? {};
      const operatorInput = templateSection.operatorInput ?? {};
      const missingRequiredFields = requirement.requiredFields
        .filter((field) => !isFilled(field, operatorInput[field]));
      const sides = unique(referenceBlocks.map((block) => block.side));
      const levels = unique(referenceBlocks.map((block) => block.level));
      const fanRoles = unique(referenceBlocks.map((block) => block.fanRole));
  
      return {
        id: requirement.id,
        name: requirement.name,
        category: requirement.category,
        status: requirement.status,
        coordinateSystem: requirement.coordinateSystem,
        sourceRanges: sourceRanges.map((range) => ({
          id: range.id,
          label: range.label,
          displayBlocks: range.displayBlocks,
          filterGroupId: range.filterGroupId,
          fanRoles: range.fanRoles,
          aggregateHitArea: range.aggregateHitArea,
          operatorPolygonStatus: range.operatorPolygonStatus,
        })),
        targetOfficialBlocks,
        targetBlockIds,
        referenceBoundsOnly: true,
        mustNotUseReferenceBoundsAsOperatorPolygon: true,
        referenceUnionBounds: unionBounds(referenceBlocks.map((block) => block.expectedBounds)),
        referenceBlocks,
        metadataGuidance: {
          officialBlocks: targetOfficialBlocks,
          level: levels.length === 1 ? levels[0] : 'MIXED_REFERENCE_ONLY',
          side: sides.length === 1 ? sides[0] : 'MIXED_REFERENCE_ONLY',
          fanRole: fanRoles.length === 1 ? fanRoles[0] : 'MIXED_REFERENCE_ONLY',
          shortLabel: requirement.id === 'away-cheering-seats' ? 'AWAY' : 'K7',
        },
        requiredOperatorInputFields: requirement.requiredFields,
        missingRequiredFields,
        currentOperatorInputSnapshot: {
          officialBlocks: operatorInput.officialBlocks ?? [],
          pointCount: Array.isArray(operatorInput.points) ? operatorInput.points.length : 0,
          labelX: operatorInput.labelX ?? null,
          labelY: operatorInput.labelY ?? null,
          shortLabel: operatorInput.shortLabel ?? null,
          reviewer: operatorInput.reviewer ?? null,
          reviewedAt: operatorInput.reviewedAt ?? null,
        },
        inputChecklist: [
          'Open the official image at natural size 2200x1159.',
          'Use the listed clean overlay crops only as reference evidence.',
          'Trace the aggregate polygon points directly on the official image.',
          'Do not convert browser CSS pixels, resized screenshots, external crawling data, or third-party copied image coordinates.',
          'Fill points, labelX, labelY, shortLabel, reviewer, and reviewedAt in the operator template.',
          'Keep MANUAL_BASEBALL_DATA_REQUIRED if baseball operating data is missing or unclear.',
        ],
      };
    }),
  );
  
  const allReferenceCropsExist = sectionReports
    .flatMap((section) => section.referenceBlocks)
    .every((block) => block.cleanCropExists);
  const pendingInputSections = sectionReports.filter((section) => section.missingRequiredFields.length > 0).length;
  const status = blockers.length > 0
    ? 'blocked'
    : pendingInputSections > 0
      ? 'ready_for_operator_input'
      : 'operator_input_present';
  
  const report = {
    version: INPUT_AID_VERSION,
    mode: INPUT_AID_MODE,
    status,
    doesNotModifyDataFile: true,
    generatedAt: new Date().toISOString(),
    asset: {
      imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
      requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
    },
    sourcePolicy,
    inputs: Object.fromEntries(Object.entries(requiredInputs).map(([key, input]) => [
      key,
      {
        path: input.path,
        exists: input.exists,
        error: input.error,
      },
    ])),
    summary: {
      pendingOperatorSections: GWANGJU_PENDING_OPERATOR_SECTIONS,
      operatorStatus: operatorStatus.data?.summary?.status ?? null,
      traceStatus: traceReview.data?.summary?.traceStatus ?? null,
      allReferenceCropsExist,
      pendingInputSections,
      blockers,
      referenceBoundsPolicy: 'REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON',
    },
    sections: sectionReports,
  };
  
  const csvRows = [
    ['sectionId', 'sectionName', 'referenceBlockId', 'officialBlock', 'fanRole', 'labelX', 'labelY', 'minX', 'minY', 'maxX', 'maxY', 'cleanCropExists', 'cleanCropPath'],
    ...sectionReports.flatMap((section) => section.referenceBlocks.map((block) => [
      section.id,
      section.name,
      block.id,
      block.officialBlock,
      block.fanRole,
      block.labelAnchor?.x,
      block.labelAnchor?.y,
      block.expectedBounds?.minX,
      block.expectedBounds?.minY,
      block.expectedBounds?.maxX,
      block.expectedBounds?.maxY,
      block.cleanCropExists,
      block.cleanCropPath,
    ])),
  ];
  
  const markdown = [
    '# 광주 K7/AWAY 운영자 좌표 입력 보조',
    '',
    `- version: \`${INPUT_AID_VERSION}\``,
    `- mode: \`${INPUT_AID_MODE}\``,
    `- status: \`${status}\``,
    '- does not modify data file: `true`',
    `- official image: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\``,
    `- coordinate system: \`${sourcePolicy.coordinateSystem}\``,
    `- allowed coordinate source: \`${sourcePolicy.allowedCoordinateSource}\``,
    `- missing baseball data contract: \`${sourcePolicy.missingBaseballDataContract}\``,
    `- reference bounds policy: \`${report.summary.referenceBoundsPolicy}\``,
    '',
    '## 입력 상태',
    markdownTable(
      ['section', 'status', 'target blocks', 'missing fields', 'reference bbox'],
      sectionReports.map((section) => [
        section.name,
        section.status,
        section.targetOfficialBlocks.join(', '),
        section.missingRequiredFields.join(', ') || 'none',
        section.referenceUnionBounds
          ? `${section.referenceUnionBounds.minX},${section.referenceUnionBounds.minY} - ${section.referenceUnionBounds.maxX},${section.referenceUnionBounds.maxY}`
          : 'missing',
      ]),
    ),
    '',
    '## 참고 블럭',
    markdownTable(
      ['section', 'block', 'fanRole', 'anchor', 'bbox', 'crop'],
      sectionReports.flatMap((section) => section.referenceBlocks.map((block) => [
        section.name,
        block.officialBlock,
        block.fanRole,
        `${block.labelAnchor?.x ?? '-'},${block.labelAnchor?.y ?? '-'}`,
        block.expectedBounds
          ? `${block.expectedBounds.minX},${block.expectedBounds.minY} - ${block.expectedBounds.maxX},${block.expectedBounds.maxY}`
          : 'missing',
        block.cleanCropPath,
      ])),
    ),
    '',
    '## 작성 규칙',
    '- 위 bbox와 numbered block crop은 참고 증거일 뿐이며 operator aggregate polygon으로 복사하면 안 됩니다.',
    '- `operatorInput.points`, `labelX`, `labelY`는 공식 이미지 원본 `2200x1159`에서 운영자가 직접 입력해야 합니다.',
    '- CSS 픽셀, 리사이즈 스크린샷, 외부 크롤링, web-search-based baseball data, third-party copied seatmap images는 금지입니다.',
    '- 데이터가 비어 있거나 불명확하면 `MANUAL_BASEBALL_DATA_REQUIRED`를 유지합니다.',
    '',
    '## 산출물',
    `- \`${relativePath(jsonPath)}\``,
    `- \`${relativePath(csvPath)}\``,
    `- \`${relativePath(markdownPath)}\``,
    '',
    '## Blockers',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : '- none',
    '',
  ].join('\n');
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, csvRows);
  await fs.writeFile(markdownPath, markdown, 'utf8');
  
  console.log(`operator_input_aid_json:${jsonPath}`);
  console.log(`operator_input_aid_csv:${csvPath}`);
  console.log(`operator_input_aid_markdown:${markdownPath}`);
  console.log(`status:${status} pendingInputSections=${pendingInputSections} referenceCrops=${allReferenceCropsExist ? 'ok' : 'missing'} blockers=${blockers.length}`);
  
  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runOperatorInputPacket = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    GWANGJU_BASE_TRACE_BLOCK_COUNT,
    GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
    GWANGJU_PENDING_OPERATOR_SECTIONS,
    GWANGJU_SEATMAP_IMAGE,
  } = await import('../src/data/gwangjuSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  
  const PACKET_VERSION = 'GWANGJU_OPERATOR_INPUT_PACKET_V1';
  const PACKET_MODE = 'OPERATOR_COORDINATE_INPUT_PACKET';
  const REFERENCE_BOUNDS_POLICY = 'REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON';
  const jsonPath = path.join(reportDir, 'gwangju-seatmap-operator-input-packet.json');
  const markdownPath = path.join(reportDir, 'gwangju-seatmap-operator-input-packet.md');
  
  const sourcePolicy = {
    allowedCoordinateSource: 'operator-provided official image coordinates only',
    coordinateSystem: `${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight}`,
    disallowedSources: [
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  };
  
  const inputFiles = {
    traceReview: path.join(reportDir, 'gwangju-seatmap-trace-review.json'),
    operatorTemplate: path.join(reportDir, 'gwangju-seatmap-operator-template.json'),
    operatorInputAid: path.join(reportDir, 'gwangju-seatmap-operator-input-aid.json'),
    operatorStatus: path.join(reportDir, 'gwangju-seatmap-operator-status.json'),
    validation: path.join(reportDir, 'gwangju-seatmap-operator-template-validation.json'),
    applyPlan: path.join(reportDir, 'gwangju-seatmap-operator-template-apply-plan.json'),
  };
  
  const nextCommandOrder = [
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-intake',
    'npm run stadium:gwangju:operator-handoff',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-input-aid',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-input-packet',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-template:validate:strict',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-template:apply-plan:require-ready',
    'npm run stadium:gwangju:operator-status',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-prewrite-gate',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate',
    'node scripts/stadium-seatmap-ops.mjs gwangju release-verify:postoperator',
  ];
  
  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
  
  const relativePath = (filePath) => path.relative(frontendRoot, filePath);
  
  const readJson = async (filePath) => {
    try {
      return {
        exists: true,
        path: relativePath(filePath),
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: null,
      };
    } catch (error) {
      return {
        exists: false,
        path: relativePath(filePath),
        data: null,
        error: error?.code === 'ENOENT' ? 'MISSING_OPERATOR_INPUT_PACKET_INPUT' : `READ_FAILED:${error.message}`,
      };
    }
  };
  
  const sameSet = (left, right) => JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
  
  const isFilled = (field, value) => {
    if (field === 'officialBlocks' || field === 'points') return Array.isArray(value) && value.length > 0;
    if (field === 'labelX' || field === 'labelY') {
      return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
    }
    return typeof value === 'string' && value.trim().length > 0;
  };
  
  const checkSourcePolicy = (name, policy, blockers) => {
    if (!policy) {
      blockers.push(`SOURCE_POLICY_MISSING:${name}`);
      return;
    }
  
    const allowed = policy.allowedCoordinateSource ?? policy.allowedSource;
    if (allowed !== sourcePolicy.allowedCoordinateSource) {
      blockers.push(`SOURCE_POLICY_ALLOWED_SOURCE_CHANGED:${name}:${allowed ?? 'missing'}`);
    }
    if (policy.coordinateSystem && policy.coordinateSystem !== sourcePolicy.coordinateSystem) {
      blockers.push(`SOURCE_POLICY_COORDINATE_SYSTEM_CHANGED:${name}:${policy.coordinateSystem}`);
    }
    if (policy.missingBaseballDataContract && policy.missingBaseballDataContract !== sourcePolicy.missingBaseballDataContract) {
      blockers.push(`SOURCE_POLICY_MANUAL_CONTRACT_CHANGED:${name}:${policy.missingBaseballDataContract}`);
    }
    if (!sameSet(policy.disallowedSources, sourcePolicy.disallowedSources)) {
      blockers.push(`SOURCE_POLICY_DISALLOWED_SOURCES_CHANGED:${name}`);
    }
  };
  
  const inputs = Object.fromEntries(await Promise.all(
    Object.entries(inputFiles).map(async ([key, filePath]) => [key, await readJson(filePath)]),
  ));
  
  const blockers = [];
  Object.values(inputs)
    .filter((input) => !input.exists)
    .forEach((input) => blockers.push(`${input.error}:${input.path}`));
  
  const traceSummary = inputs.traceReview.data?.summary ?? {};
  const inputAidSummary = inputs.operatorInputAid.data?.summary ?? {};
  const statusSummary = inputs.operatorStatus.data?.summary ?? {};
  const validationSummary = inputs.validation.data?.summary ?? {};
  const applyPlanSummary = inputs.applyPlan.data?.summary ?? {};
  
  if (inputs.traceReview.exists) {
    if (traceSummary.traceStatus !== 'READY') blockers.push(`TRACE_STATUS_NOT_READY:${traceSummary.traceStatus ?? 'missing'}`);
    if (traceSummary.totalBlocks !== GWANGJU_BASE_TRACE_BLOCK_COUNT) blockers.push(`TRACE_ACTIVE_BLOCKS_CHANGED:${traceSummary.totalBlocks ?? 'missing'}`);
    if (traceSummary.officialImageTracedBlocks !== GWANGJU_BASE_TRACE_BLOCK_COUNT) blockers.push(`TRACE_OFFICIAL_IMAGE_TRACED_CHANGED:${traceSummary.officialImageTracedBlocks ?? 'missing'}`);
    if (traceSummary.pixelAlignedBlocks !== GWANGJU_BASE_TRACE_BLOCK_COUNT) blockers.push(`TRACE_PIXEL_ALIGNED_CHANGED:${traceSummary.pixelAlignedBlocks ?? 'missing'}`);
    if ((traceSummary.overlapWarningCount ?? 0) !== 0) blockers.push(`TRACE_OVERLAP_WARNINGS_PRESENT:${traceSummary.overlapWarningCount}`);
  }
  
  if (inputs.operatorInputAid.exists) {
    if (inputs.operatorInputAid.data?.status === 'blocked') blockers.push('OPERATOR_INPUT_AID_BLOCKED');
    if (inputAidSummary.allReferenceCropsExist !== true) blockers.push('OPERATOR_INPUT_AID_REFERENCE_CROPS_MISSING');
    if (inputAidSummary.referenceBoundsPolicy !== REFERENCE_BOUNDS_POLICY) {
      blockers.push(`REFERENCE_BOUNDS_POLICY_CHANGED:${inputAidSummary.referenceBoundsPolicy ?? 'missing'}`);
    }
  }
  
  if (inputs.operatorStatus.exists) {
    if ((statusSummary.blockers ?? []).length > 0) blockers.push(`OPERATOR_STATUS_BLOCKERS_PRESENT:${statusSummary.blockers.length}`);
  }
  if (inputs.applyPlan.exists && applyPlanSummary.status === 'blocked') {
    blockers.push('APPLY_PLAN_STATUS_BLOCKED');
  }
  (applyPlanSummary.blockers ?? []).forEach((blocker) => blockers.push(`APPLY_PLAN_BLOCKER:${blocker}`));
  
  checkSourcePolicy('operator-input-aid', inputs.operatorInputAid.data?.sourcePolicy, blockers);
  checkSourcePolicy('operator-status', inputs.operatorStatus.data?.sourcePolicy, blockers);
  checkSourcePolicy('apply-plan', inputs.applyPlan.data?.policy, blockers);
  
  const requirementById = new Map(GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map((section) => [section.id, section]));
  const templateSectionById = new Map((inputs.operatorTemplate.data?.sections ?? []).map((section) => [section.id, section]));
  const validationRowById = new Map((inputs.validation.data?.sections ?? []).map((section) => [section.id, section]));
  const applyPlanRowById = new Map((inputs.applyPlan.data?.rows ?? []).map((row) => [row.id, row]));
  const inputAidSectionById = new Map((inputs.operatorInputAid.data?.sections ?? []).map((section) => [section.id, section]));
  const statusWorkItemById = new Map((inputs.operatorStatus.data?.workItems ?? []).map((item) => [item.id, item]));
  
  const sections = GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map((requirement) => {
    const templateSection = templateSectionById.get(requirement.id) ?? {};
    const validationRow = validationRowById.get(requirement.id) ?? {};
    const applyPlanRow = applyPlanRowById.get(requirement.id) ?? {};
    const inputAidSection = inputAidSectionById.get(requirement.id) ?? {};
    const statusWorkItem = statusWorkItemById.get(requirement.id) ?? {};
    const operatorInput = templateSection.operatorInput ?? {};
    const requiredFields = requirement.requiredFields;
    const filledFields = requiredFields.filter((field) => isFilled(field, operatorInput[field]));
    const missingRequiredFields = requiredFields.filter((field) => !filledFields.includes(field));
    const pointCount = Array.isArray(operatorInput.points) ? operatorInput.points.length : 0;
  
    checkSourcePolicy(`template:${requirement.id}`, templateSection.sourcePolicy, blockers);
  
    return {
      id: requirement.id,
      name: requirement.name,
      category: requirement.category,
      status: requirement.status,
      requiredFields,
      filledFields,
      missingRequiredFields,
      operatorInputPresent: filledFields.length > 0,
      validForPromotion: validationRow.validForPromotion === true || statusWorkItem.validForPromotion === true,
      validForDataDiff: applyPlanRow.validForDataDiff === true || statusWorkItem.validForDataDiff === true,
      validationStatus: {
        pending: validationRow.pending ?? null,
        reasons: validationRow.reasons ?? [],
        warnings: validationRow.warnings ?? [],
      },
      applyPlanStatus: {
        pending: applyPlanRow.pending ?? null,
        rowBlockers: applyPlanRow.rowBlockers ?? [],
        manualDataRequired: applyPlanRow.manualDataRequired ?? [],
      },
      operatorInputSnapshot: {
        officialBlocks: operatorInput.officialBlocks ?? [],
        pointCount,
        labelX: operatorInput.labelX ?? null,
        labelY: operatorInput.labelY ?? null,
        shortLabel: operatorInput.shortLabel ?? null,
        reviewer: operatorInput.reviewer ?? null,
        reviewedAt: operatorInput.reviewedAt ?? null,
      },
      referencePolicy: REFERENCE_BOUNDS_POLICY,
      referenceBoundsOnly: inputAidSection.referenceBoundsOnly === true,
      mustNotUseReferenceBoundsAsOperatorPolygon: inputAidSection.mustNotUseReferenceBoundsAsOperatorPolygon === true,
      targetOfficialBlocks: inputAidSection.targetOfficialBlocks ?? [],
      referenceUnionBounds: inputAidSection.referenceUnionBounds ?? null,
      referenceBlocks: inputAidSection.referenceBlocks ?? [],
      cleanCropPaths: (inputAidSection.referenceBlocks ?? []).map((block) => block.cleanCropPath),
      metadataGuidance: inputAidSection.metadataGuidance ?? {},
      inputChecklist: inputAidSection.inputChecklist ?? [],
    };
  });
  
  sections
    .filter((section) => section.mustNotUseReferenceBoundsAsOperatorPolygon !== true)
    .forEach((section) => blockers.push(`REFERENCE_BOUNDS_NOT_GUARDED:${section.id}`));
  
  const inputPresentSections = sections.filter((section) => section.operatorInputPresent).length;
  const readyForPrewrite = statusSummary.status === 'ready'
    && validationSummary.status === 'ready'
    && applyPlanSummary.status === 'ready'
    && (statusSummary.validDataDiffSections ?? applyPlanSummary.validDataDiffSections ?? 0) > 0;
  
  const status = blockers.length > 0
    ? 'blocked'
    : readyForPrewrite
      ? 'ready_for_prewrite'
      : inputPresentSections > 0
        ? 'operator_input_present'
        : 'ready_for_operator_input';
  
  const report = {
    version: PACKET_VERSION,
    mode: PACKET_MODE,
    status,
    doesNotModifyDataFile: true,
    generatedAt: new Date().toISOString(),
    asset: {
      imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
      requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
    },
    sourcePolicy,
    inputReports: Object.fromEntries(Object.entries(inputs).map(([key, input]) => [
      key,
      {
        path: input.path,
        exists: input.exists,
        error: input.error,
      },
    ])),
    summary: {
      pendingOperatorSections: GWANGJU_PENDING_OPERATOR_SECTIONS,
      packetStatus: status,
      traceStatus: traceSummary.traceStatus ?? null,
      operatorStatus: statusSummary.status ?? null,
      validationStatus: validationSummary.status ?? null,
      validationStrict: validationSummary.strict ?? false,
      applyPlanStatus: applyPlanSummary.status ?? null,
      inputAidStatus: inputs.operatorInputAid.data?.status ?? null,
      referenceBoundsPolicy: REFERENCE_BOUNDS_POLICY,
      allReferenceCropsExist: inputAidSummary.allReferenceCropsExist === true,
      totalSections: sections.length,
      inputPresentSections,
      readyForPrewrite,
      blockers,
    },
    sections,
    nextCommandOrder,
  };
  
  const markdown = [
    '# 광주 K7/AWAY 운영자 좌표 입력 패킷',
    '',
    `- version: \`${PACKET_VERSION}\``,
    `- mode: \`${PACKET_MODE}\``,
    `- status: \`${status}\``,
    '- does not modify data file: `true`',
    `- official image: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\``,
    `- coordinate system: \`${sourcePolicy.coordinateSystem}\``,
    `- allowed coordinate source: \`${sourcePolicy.allowedCoordinateSource}\``,
    `- missing baseball data contract: \`${sourcePolicy.missingBaseballDataContract}\``,
    `- reference bounds policy: \`${REFERENCE_BOUNDS_POLICY}\``,
    '',
    '## 상태',
    markdownTable(
      ['item', 'value'],
      [
        ['trace', traceSummary.traceStatus ?? 'missing'],
        ['operator status', statusSummary.status ?? 'missing'],
        ['validation', validationSummary.status ?? 'missing'],
        ['validation strict', validationSummary.strict === true ? 'true' : 'false'],
        ['apply plan', applyPlanSummary.status ?? 'missing'],
        ['input aid', inputs.operatorInputAid.data?.status ?? 'missing'],
        ['input present sections', inputPresentSections],
        ['ready for prewrite', readyForPrewrite ? 'true' : 'false'],
        ['blockers', blockers.length],
      ],
    ),
    '',
    '## 입력 섹션',
    markdownTable(
      ['section', 'target blocks', 'filled fields', 'missing fields', 'reference bbox', 'crop count'],
      sections.map((section) => [
        section.name,
        section.targetOfficialBlocks.join(', '),
        section.filledFields.join(', ') || 'none',
        section.missingRequiredFields.join(', ') || 'none',
        section.referenceUnionBounds
          ? `${section.referenceUnionBounds.minX},${section.referenceUnionBounds.minY} - ${section.referenceUnionBounds.maxX},${section.referenceUnionBounds.maxY}`
          : 'missing',
        section.cleanCropPaths.length,
      ]),
    ),
    '',
    '## 입력 규칙',
    '- `REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON`: reference bbox/anchor/crop은 입력 보조 자료이며 aggregate polygon 좌표가 아닙니다.',
    '- `operatorInput.points`, `labelX`, `labelY`는 공식 이미지 원본 `2200x1159`에서 운영자가 직접 입력해야 합니다.',
    '- browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images는 금지입니다.',
    '- 데이터가 비어 있거나 불명확하면 `MANUAL_BASEBALL_DATA_REQUIRED`를 유지합니다.',
    '',
    '## 다음 명령',
    ...nextCommandOrder.map((command) => `- \`${command}\``),
    '',
    '## 산출물',
    `- \`${relativePath(jsonPath)}\``,
    `- \`${relativePath(markdownPath)}\``,
    '',
    '## Blockers',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : '- none',
    '',
  ].join('\n');
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, markdown, 'utf8');
  
  console.log(`operator_input_packet_json:${jsonPath}`);
  console.log(`operator_input_packet_markdown:${markdownPath}`);
  console.log(`status:${status} inputPresentSections=${inputPresentSections} readyForPrewrite=${readyForPrewrite ? 'true' : 'false'} blockers=${blockers.length}`);
  
  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runOperatorApply = async () => {
  const { default: crypto } = await import('node:crypto');
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const { default: ts } = await import('typescript');
  const {
    GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  } = await import('../src/data/gwangjuSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultInputPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-template.json');
  const defaultValidationPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-template-validation.json');
  const defaultApplyPlanPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-template-apply-plan.json');
  const defaultStatusPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-status.json');
  const defaultWriteGuardPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-write-guard.json');
  const defaultTraceReviewPath = path.join(defaultReportDir, 'gwangju-seatmap-trace-review.json');
  const productionDataFilePath = path.resolve(frontendRoot, 'src/data/gwangjuSeatData.ts');
  
  const APPLY_VERSION = 'GWANGJU_OPERATOR_APPLY_V1';
  const REQUIRED_VALIDATION_VERSION = 'GWANGJU_OPERATOR_POLYGON_TEMPLATE_VALIDATION_V1';
  const REQUIRED_APPLY_PLAN_VERSION = 'GWANGJU_OPERATOR_POLYGON_APPLY_PLAN_V1';
  const REQUIRED_STATUS_VERSION = 'GWANGJU_OPERATOR_STATUS_V1';
  const REQUIRED_WRITE_GUARD_VERSION = 'GWANGJU_OPERATOR_WRITE_GUARD_V1';
  const APPLY_SECTION_IDS = ['home-k7-seats', 'away-cheering-seats'];
  const VALID_LEVELS = new Set(['1F', '2F', '3F', '4F', '5F', 'OUTFIELD']);
  const VALID_SIDES = new Set(['FIRST_BASE', 'THIRD_BASE', 'CENTER', 'OUTFIELD']);
  const VALID_FAN_ROLES = new Set(['HOME', 'AWAY', 'NEUTRAL']);
  
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
        exists: true,
        relativePath: path.relative(frontendRoot, filePath),
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: '',
      };
    } catch (error) {
      return {
        exists: false,
        relativePath: path.relative(frontendRoot, filePath),
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
  
  const sha256 = (content) => crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
  
  const sha256File = async (filePath) => sha256(await fs.readFile(filePath));
  
  const numberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  
  const formatNumber = (value) => (
    Number.isInteger(value) ? String(value) : Number(value).toFixed(1).replace(/\.0$/, '')
  );
  
  const singleQuoted = (value) => `'${String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  
  const stringArrayLiteral = (values) => `[${values.map(singleQuoted).join(', ')}]`;
  
  const formatPoints = (points) => `[${points
    .map((point) => `[${formatNumber(point[0])}, ${formatNumber(point[1])}]`)
    .join(', ')}]`;
  
  const normalizeOperatorInput = (operatorInput = {}) => ({
    officialBlocks: Array.isArray(operatorInput.officialBlocks)
      ? operatorInput.officialBlocks.map((value) => String(value).trim()).filter(Boolean)
      : [],
    level: String(operatorInput.level ?? '').trim(),
    side: String(operatorInput.side ?? '').trim(),
    fanRole: String(operatorInput.fanRole ?? '').trim(),
    points: Array.isArray(operatorInput.points)
      ? operatorInput.points.map((point) => (
        Array.isArray(point) && point.length === 2
          ? [numberOrNull(point[0]), numberOrNull(point[1])]
          : [null, null]
      ))
      : [],
    labelX: numberOrNull(operatorInput.labelX),
    labelY: numberOrNull(operatorInput.labelY),
    shortLabel: String(operatorInput.shortLabel ?? '').trim(),
    reviewer: String(operatorInput.reviewer ?? '').trim(),
    reviewedAt: String(operatorInput.reviewedAt ?? '').trim(),
  });
  
  const buildSeatViewSections = (name, shortLabel, officialBlocks) => Array.from(new Set([
    name,
    shortLabel,
    ...officialBlocks,
    ...officialBlocks.map((block) => `${block}블록`),
    `광주 ${name}`,
    `KIA ${name}`,
  ].filter(Boolean)));
  
  const buildGeometrySnippet = (section, input) => (
    `  '${section.id}': blockGeometry(${formatPoints(input.points)}, ${formatNumber(input.labelX)}, ${formatNumber(input.labelY)}, ${singleQuoted(input.shortLabel)}),`
  );
  
  const buildBlockDefinitionSnippet = (section, input) => (
    `  { id: ${singleQuoted(section.id)}, level: ${singleQuoted(input.level)}, category: ${singleQuoted(section.category)}, name: ${singleQuoted(section.name)}, block: ${singleQuoted(section.name)}, officialBlocks: ${stringArrayLiteral(input.officialBlocks)}, side: ${singleQuoted(input.side)}, fanRole: ${singleQuoted(input.fanRole)}, seatViewSections: ${stringArrayLiteral(buildSeatViewSections(section.name, input.shortLabel, input.officialBlocks))} },`
  );
  
  const propertyNameText = (name) => {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
    return null;
  };
  
  const findProperty = (object, name) => object.properties.find((property) => (
    ts.isPropertyAssignment(property)
    && propertyNameText(property.name) === name
  ));
  
  const stringInitializerValue = (property, sourceFile) => {
    if (!property || !ts.isPropertyAssignment(property)) return null;
    const initializer = property.initializer;
    if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) return initializer.text;
    return initializer.getText(sourceFile);
  };
  
  const findVariableInitializer = (sourceFile, variableName, predicate) => {
    let initializer = null;
    const visit = (node) => {
      if (
        ts.isVariableDeclaration(node)
        && node.name.getText(sourceFile) === variableName
        && node.initializer
        && predicate(node.initializer)
      ) {
        initializer = node.initializer;
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return initializer;
  };
  
  const objectPropertyByKey = (object, key) => object.properties.find((property) => (
    ts.isPropertyAssignment(property)
    && propertyNameText(property.name) === key
  ));
  
  const arrayObjectById = (array, id, sourceFile) => array.elements.find((element) => {
    if (!ts.isObjectLiteralExpression(element)) return false;
    return stringInitializerValue(findProperty(element, 'id'), sourceFile) === id;
  });
  
  const lineStartAt = (source, position) => source.lastIndexOf('\n', Math.max(position - 1, 0)) + 1;
  
  const lineRangeForNode = (node, sourceFile, source) => {
    const start = lineStartAt(source, node.getStart(sourceFile));
    let end = node.getEnd();
    while (source[end] === ' ' || source[end] === '\t' || source[end] === '\r') end += 1;
    if (source[end] === ',') end += 1;
    if (source[end] === '\n') end += 1;
    return { start, end };
  };
  
  const closingLineStart = (node, source) => lineStartAt(source, node.getEnd() - 1);
  
  const applyEdits = (source, edits) => {
    const ordered = [...edits].sort((left, right) => right.start - left.start || right.end - left.end);
    return ordered.reduce((updated, edit) => (
      `${updated.slice(0, edit.start)}${edit.text}${updated.slice(edit.end)}`
    ), source);
  };
  
  const addOrReplaceStatusReady = (requirementObject, edits, sourceFile, source) => {
    const statusProperty = findProperty(requirementObject, 'status');
    if (statusProperty && ts.isPropertyAssignment(statusProperty)) {
      edits.push({
        start: statusProperty.initializer.getStart(sourceFile),
        end: statusProperty.initializer.getEnd(),
        text: "'READY'",
      });
      return 'replace';
    }
  
    const insertAt = closingLineStart(requirementObject, source);
    edits.push({
      start: insertAt,
      end: insertAt,
      text: "    status: 'READY',\n",
    });
    return 'add';
  };
  
  const analyzeAndBuildDataFileEdits = (source, dataFilePath, rowsToApply, blockers) => {
    const sourceFile = ts.createSourceFile(dataFilePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const geometryDrafts = findVariableInitializer(sourceFile, 'GWANGJU_IMAGE_GEOMETRY_DRAFTS', ts.isObjectLiteralExpression);
    const specialBlocks = findVariableInitializer(sourceFile, 'SPECIAL_BLOCKS', ts.isArrayLiteralExpression);
    const requirements = findVariableInitializer(sourceFile, 'GWANGJU_OPERATOR_SECTION_REQUIREMENTS', ts.isArrayLiteralExpression);
    const edits = [];
    const geometryInsertions = [];
    const blockInsertions = [];
  
    if (!geometryDrafts) blockers.push('GWANGJU_IMAGE_GEOMETRY_DRAFTS_NOT_FOUND');
    if (!specialBlocks) blockers.push('SPECIAL_BLOCKS_NOT_FOUND');
    if (!requirements) blockers.push('GWANGJU_OPERATOR_SECTION_REQUIREMENTS_NOT_FOUND');
    if (blockers.length > 0) return { nextSource: source, editCount: 0 };
  
    rowsToApply.forEach((row) => {
      const geometrySnippet = buildGeometrySnippet(row.requirement, row.operatorInput);
      const blockSnippet = buildBlockDefinitionSnippet(row.requirement, row.operatorInput);
      const existingGeometry = objectPropertyByKey(geometryDrafts, row.id);
      const existingBlock = arrayObjectById(specialBlocks, row.id, sourceFile);
      const requirementObject = arrayObjectById(requirements, row.id, sourceFile);
  
      row.geometryAction = existingGeometry ? 'replace' : 'add';
      row.blockAction = existingBlock ? 'replace' : 'add';
      row.requirementStatusAction = requirementObject ? 'replace' : 'missing';
  
      if (existingGeometry) {
        const range = lineRangeForNode(existingGeometry, sourceFile, source);
        edits.push({ ...range, text: `${geometrySnippet}\n` });
      } else {
        geometryInsertions.push(geometrySnippet);
      }
  
      if (existingBlock) {
        const range = lineRangeForNode(existingBlock, sourceFile, source);
        edits.push({ ...range, text: `${blockSnippet}\n` });
      } else {
        blockInsertions.push(blockSnippet);
      }
  
      if (!requirementObject) {
        blockers.push(`OPERATOR_REQUIREMENT_NOT_FOUND_IN_DATA_FILE:${row.id}`);
        return;
      }
      addOrReplaceStatusReady(requirementObject, edits, sourceFile, source);
    });
  
    if (geometryInsertions.length > 0) {
      const insertAt = closingLineStart(geometryDrafts, source);
      edits.push({
        start: insertAt,
        end: insertAt,
        text: `${geometryInsertions.join('\n')}\n`,
      });
    }
  
    if (blockInsertions.length > 0) {
      const insertAt = closingLineStart(specialBlocks, source);
      edits.push({
        start: insertAt,
        end: insertAt,
        text: `${blockInsertions.join('\n')}\n`,
      });
    }
  
    if (blockers.length > 0) return { nextSource: source, editCount: edits.length };
    return {
      nextSource: applyEdits(source, edits),
      editCount: edits.length,
    };
  };
  
  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const inputPath = path.resolve(frontendRoot, argValue('--input', defaultInputPath));
  const validationPath = path.resolve(frontendRoot, argValue('--validation', defaultValidationPath));
  const applyPlanPath = path.resolve(frontendRoot, argValue('--apply-plan', defaultApplyPlanPath));
  const statusPath = path.resolve(frontendRoot, argValue('--status', defaultStatusPath));
  const writeGuardPath = path.resolve(frontendRoot, argValue('--write-guard', defaultWriteGuardPath));
  const traceReviewPath = path.resolve(frontendRoot, argValue('--trace-review', defaultTraceReviewPath));
  const dataFilePath = path.resolve(frontendRoot, argValue('--data-file', productionDataFilePath));
  const shouldWrite = hasFlag('--write');
  const requireReady = hasFlag('--require-ready');
  const allowSyntheticSmoke = hasFlag('--allow-synthetic-smoke');
  
  const reports = {
    template: await readJsonReport(inputPath),
    validation: await readJsonReport(validationPath),
    applyPlan: await readJsonReport(applyPlanPath),
    status: await readJsonReport(statusPath),
    writeGuard: await readJsonReport(writeGuardPath),
    traceReview: await readJsonReport(traceReviewPath),
  };
  
  const inputSha256 = reports.template.exists ? await sha256File(inputPath) : '';
  const dataFileShaBefore = await sha256File(dataFilePath);
  const template = reports.template.data ?? {};
  const validation = reports.validation.data ?? {};
  const applyPlan = reports.applyPlan.data ?? {};
  const statusReport = reports.status.data ?? {};
  const writeGuard = reports.writeGuard.data ?? {};
  const traceReview = reports.traceReview.data ?? {};
  const inputIsNonProductionSynthetic = template.nonProductionSyntheticInput === true;
  const dataFileIsProduction = dataFilePath === productionDataFilePath;
  const inputIsStandardProduction = inputPath === defaultInputPath
    && validationPath === defaultValidationPath
    && applyPlanPath === defaultApplyPlanPath
    && statusPath === defaultStatusPath
    && writeGuardPath === defaultWriteGuardPath
    && traceReviewPath === defaultTraceReviewPath;
  const inputIsTemporarySyntheticWrite = shouldWrite
    && allowSyntheticSmoke
    && inputIsNonProductionSynthetic
    && !dataFileIsProduction;
  
  const requirementById = new Map(GWANGJU_OPERATOR_SECTION_REQUIREMENTS
    .filter((section) => APPLY_SECTION_IDS.includes(section.id))
    .map((section) => [section.id, section]));
  const templateSectionById = new Map((template.sections ?? []).map((section) => [String(section.id ?? '').trim(), section]));
  const validationRowById = new Map((validation.sections ?? []).map((row) => [row.id, row]));
  const applyPlanRowById = new Map((applyPlan.rows ?? []).map((row) => [row.id, row]));
  
  const blockers = [];
  if (!reports.template.exists) blockers.push(`TEMPLATE_REPORT_UNREADABLE:${reports.template.error}`);
  if (!reports.validation.exists) blockers.push(`VALIDATION_REPORT_UNREADABLE:${reports.validation.error}`);
  if (!reports.applyPlan.exists) blockers.push(`APPLY_PLAN_REPORT_UNREADABLE:${reports.applyPlan.error}`);
  if (!reports.status.exists && (shouldWrite || requireReady)) blockers.push(`STATUS_REPORT_UNREADABLE:${reports.status.error}`);
  if (!reports.traceReview.exists && shouldWrite) blockers.push(`TRACE_REVIEW_REPORT_UNREADABLE:${reports.traceReview.error}`);
  if (!reports.writeGuard.exists && shouldWrite && dataFileIsProduction) {
    blockers.push(`WRITE_GUARD_REPORT_UNREADABLE:${reports.writeGuard.error}`);
  }
  if (validation.summary?.validationVersion !== REQUIRED_VALIDATION_VERSION) blockers.push('VALIDATION_VERSION_MISMATCH');
  if (applyPlan.summary?.applyPlanVersion !== REQUIRED_APPLY_PLAN_VERSION) blockers.push('APPLY_PLAN_VERSION_MISMATCH');
  if (reports.status.exists && statusReport.summary?.statusVersion !== REQUIRED_STATUS_VERSION) blockers.push('STATUS_VERSION_MISMATCH');
  if (reports.writeGuard.exists && writeGuard.summary?.guardVersion !== REQUIRED_WRITE_GUARD_VERSION) {
    blockers.push('WRITE_GUARD_VERSION_MISMATCH');
  }
  if (validation.summary?.inputSha256 !== inputSha256) blockers.push('VALIDATION_INPUT_SHA256_MISMATCH');
  if (applyPlan.summary?.inputSha256 !== inputSha256) blockers.push('APPLY_PLAN_INPUT_SHA256_MISMATCH');
  if ((shouldWrite || requireReady) && validation.summary?.strict !== true) blockers.push('STRICT_VALIDATION_NOT_CONFIRMED');
  if ((shouldWrite || requireReady) && validation.summary?.status !== 'ready') {
    blockers.push(`VALIDATION_STATUS_NOT_READY:${validation.summary?.status ?? ''}`);
  }
  if ((shouldWrite || requireReady) && applyPlan.summary?.status !== 'ready') {
    blockers.push(`APPLY_PLAN_STATUS_NOT_READY:${applyPlan.summary?.status ?? ''}`);
  }
  if ((shouldWrite || requireReady) && reports.status.exists && statusReport.summary?.status !== 'ready') {
    blockers.push(`STATUS_NOT_READY:${statusReport.summary?.status ?? ''}`);
  }
  if (shouldWrite && dataFileIsProduction && writeGuard.summary?.passed !== true) {
    blockers.push(`WRITE_GUARD_NOT_PASSED:${writeGuard.summary?.status ?? ''}`);
  }
  if (shouldWrite && dataFileIsProduction && !requireReady) blockers.push('PRODUCTION_WRITE_REQUIRES_REQUIRE_READY');
  if (shouldWrite && dataFileIsProduction && !inputIsStandardProduction) {
    blockers.push('PRODUCTION_WRITE_REQUIRES_STANDARD_REPORTS');
  }
  if (shouldWrite && dataFileIsProduction && inputIsNonProductionSynthetic) {
    blockers.push('SYNTHETIC_INPUT_MUST_NOT_WRITE_PRODUCTION_DATA');
  }
  if (shouldWrite && !dataFileIsProduction && !inputIsTemporarySyntheticWrite) {
    blockers.push('NON_PRODUCTION_WRITE_REQUIRES_ALLOW_SYNTHETIC_SMOKE');
  }
  if (allowSyntheticSmoke && dataFileIsProduction) blockers.push('ALLOW_SYNTHETIC_SMOKE_REQUIRES_NON_PRODUCTION_DATA_FILE');
  
  const rows = APPLY_SECTION_IDS.map((id) => {
    const requirement = requirementById.get(id);
    const templateSection = templateSectionById.get(id);
    const validationRow = validationRowById.get(id);
    const applyPlanRow = applyPlanRowById.get(id);
    const operatorInput = normalizeOperatorInput(templateSection?.operatorInput);
    const rowBlockers = [];
  
    if (!requirement) rowBlockers.push('UNKNOWN_OPERATOR_REQUIREMENT');
    if (!templateSection) rowBlockers.push('TEMPLATE_SECTION_NOT_FOUND');
    if (!validationRow) rowBlockers.push('VALIDATION_ROW_NOT_FOUND');
    if (!applyPlanRow) rowBlockers.push('APPLY_PLAN_ROW_NOT_FOUND');
    if (validationRow?.pending === true) rowBlockers.push('OPERATOR_INPUT_PENDING');
    if (validationRow?.validForPromotion !== true) rowBlockers.push('SECTION_NOT_VALID_FOR_PROMOTION');
    if (applyPlanRow?.validForDataDiff !== true) rowBlockers.push('SECTION_NOT_VALID_FOR_DATA_DIFF');
    if (operatorInput.officialBlocks.length === 0) rowBlockers.push('OFFICIAL_BLOCKS_REQUIRED');
    if (!VALID_LEVELS.has(operatorInput.level)) rowBlockers.push('LEVEL_REQUIRED_OR_INVALID');
    if (!VALID_SIDES.has(operatorInput.side)) rowBlockers.push('SIDE_REQUIRED_OR_INVALID');
    if (!VALID_FAN_ROLES.has(operatorInput.fanRole)) rowBlockers.push('FAN_ROLE_REQUIRED_OR_INVALID');
    if (operatorInput.points.length < 3 || operatorInput.points.some(([x, y]) => x === null || y === null)) {
      rowBlockers.push('POINTS_MUST_BE_VALID_POLYGON');
    }
    if (operatorInput.labelX === null || operatorInput.labelY === null) rowBlockers.push('LABEL_COORDINATES_REQUIRED');
    if (!operatorInput.shortLabel) rowBlockers.push('SHORT_LABEL_REQUIRED');
    if (!operatorInput.reviewer) rowBlockers.push('REVIEWER_REQUIRED');
    if (!operatorInput.reviewedAt) rowBlockers.push('REVIEWED_AT_REQUIRED');
  
    const validForApply = rowBlockers.length === 0;
    return {
      id,
      name: requirement?.name ?? templateSection?.name ?? id,
      category: requirement?.category ?? templateSection?.category ?? '',
      validForApply,
      rowBlockers,
      reviewer: operatorInput.reviewer,
      reviewedAt: operatorInput.reviewedAt,
      officialBlocks: operatorInput.officialBlocks,
      level: operatorInput.level,
      side: operatorInput.side,
      fanRole: operatorInput.fanRole,
      shortLabel: operatorInput.shortLabel,
      pointCount: operatorInput.points.length,
      labelX: operatorInput.labelX,
      labelY: operatorInput.labelY,
      geometryAction: 'none',
      blockAction: 'none',
      requirementStatusAction: 'none',
      requirement,
      operatorInput,
    };
  });
  
  for (let firstIndex = 0; firstIndex < rows.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < rows.length; secondIndex += 1) {
      const firstRow = rows[firstIndex];
      const secondRow = rows[secondIndex];
      const sharedOfficialBlocks = firstRow.officialBlocks
        .filter((officialBlock) => secondRow.officialBlocks.includes(officialBlock));
  
      if (sharedOfficialBlocks.length > 0) {
        firstRow.rowBlockers.push(`OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP:${secondRow.id}:${sharedOfficialBlocks.join(' ')}`);
        secondRow.rowBlockers.push(`OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP:${firstRow.id}:${sharedOfficialBlocks.join(' ')}`);
        firstRow.validForApply = false;
        secondRow.validForApply = false;
      }
    }
  }
  
  if ((shouldWrite || requireReady) && rows.some((row) => !row.validForApply)) {
    rows
      .filter((row) => !row.validForApply)
      .forEach((row) => blockers.push(`ROW_NOT_VALID_FOR_APPLY:${row.id}:${row.rowBlockers.join(' ')}`));
  }
  
  const rowsToApply = rows.filter((row) => row.validForApply);
  if ((shouldWrite || requireReady) && rowsToApply.length !== APPLY_SECTION_IDS.length) {
    blockers.push(`READY_APPLY_SECTION_COUNT_MISMATCH:${rowsToApply.length}`);
  }
  
  let plannedEditCount = 0;
  let dataFileChanged = false;
  let dataFileShaAfter = dataFileShaBefore;
  
  if (blockers.length === 0 && rowsToApply.length > 0) {
    const source = await fs.readFile(dataFilePath, 'utf8');
    const { nextSource, editCount } = analyzeAndBuildDataFileEdits(source, dataFilePath, rowsToApply, blockers);
    plannedEditCount = editCount;
  
    if (blockers.length === 0 && shouldWrite) {
      dataFileChanged = nextSource !== source;
      if (dataFileChanged) {
        await fs.writeFile(dataFilePath, nextSource, 'utf8');
      }
    }
    dataFileShaAfter = await sha256File(dataFilePath);
  }
  
  const validApplySections = rowsToApply.length;
  const status = blockers.length > 0 ? 'blocked' : validApplySections > 0 ? 'ok' : 'pending';
  const summary = {
    applyVersion: APPLY_VERSION,
    mode: shouldWrite ? 'write' : 'dry-run',
    status,
    requireReady,
    allowSyntheticSmoke,
    input: path.relative(frontendRoot, inputPath),
    inputSha256,
    validation: path.relative(frontendRoot, validationPath),
    applyPlan: path.relative(frontendRoot, applyPlanPath),
    statusReport: path.relative(frontendRoot, statusPath),
    writeGuard: path.relative(frontendRoot, writeGuardPath),
    traceReview: path.relative(frontendRoot, traceReviewPath),
    dataFile: path.relative(frontendRoot, dataFilePath),
    dataFileIsProduction,
    inputIsStandardProduction,
    inputIsNonProductionSynthetic,
    inputIsTemporarySyntheticWrite,
    validationStatus: validation.summary?.status ?? '',
    validationStrict: validation.summary?.strict === true,
    applyPlanStatus: applyPlan.summary?.status ?? '',
    operatorStatus: statusReport.summary?.status ?? '',
    writeGuardPassed: writeGuard.summary?.passed === true,
    traceReviewTotalBlocks: traceReview.summary?.totalBlocks ?? null,
    validApplySections,
    plannedEditCount,
    dataFileChanged,
    dataFileShaBefore,
    dataFileShaAfter,
    blockers,
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    allowedCoordinateSource: 'operator-provided official image coordinates only',
    writeCommand: 'node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write',
    requiredPostApplyGate: [
      'node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate',
    ],
  };
  
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'This script is dry-run by default and writes only when --write is provided.',
      'Production write requires --require-ready, standard production reports, and a passed write guard.',
      'Synthetic smoke input may write only to a non-production --data-file with --allow-synthetic-smoke.',
      'Missing baseball data must remain MANUAL_BASEBALL_DATA_REQUIRED instead of being inferred.',
    ],
    sourcePolicy: {
      allowedCoordinateSource: 'operator-provided official image coordinates only',
      disallowedSources: [
        'browser CSS pixels',
        'resized screenshots',
        'external crawling',
        'web-search-based baseball data',
        'third-party copied seatmap images',
      ],
    },
    inputs: Object.fromEntries(Object.entries(reports).map(([key, report]) => [
      key,
      {
        path: report.relativePath,
        exists: report.exists,
        error: report.error,
      },
    ])),
    rows: rows.map(({ requirement: _requirement, operatorInput: _operatorInput, ...row }) => row),
  };
  
  const jsonPath = path.join(reportDir, 'gwangju-seatmap-operator-apply.json');
  const csvPath = path.join(reportDir, 'gwangju-seatmap-operator-apply.csv');
  const markdownPath = path.join(reportDir, 'gwangju-seatmap-operator-apply.md');
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'id',
      'name',
      'category',
      'validForApply',
      'rowBlockers',
      'geometryAction',
      'blockAction',
      'requirementStatusAction',
      'officialBlocks',
      'level',
      'side',
      'fanRole',
      'shortLabel',
      'pointCount',
      'labelX',
      'labelY',
      'reviewer',
      'reviewedAt',
    ],
    ...report.rows.map((row) => [
      row.id,
      row.name,
      row.category,
      row.validForApply,
      row.rowBlockers,
      row.geometryAction,
      row.blockAction,
      row.requirementStatusAction,
      row.officialBlocks,
      row.level,
      row.side,
      row.fanRole,
      row.shortLabel,
      row.pointCount,
      row.labelX,
      row.labelY,
      row.reviewer,
      row.reviewedAt,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# 광주 K7/원정응원석 operator apply',
    '',
    `- apply version: \`${APPLY_VERSION}\``,
    `- mode: \`${summary.mode}\``,
    `- status: \`${summary.status}\``,
    `- require ready: \`${summary.requireReady}\``,
    `- input: \`${summary.input}\``,
    `- validation: \`${summary.validation}\``,
    `- apply plan: \`${summary.applyPlan}\``,
    `- status report: \`${summary.statusReport}\``,
    `- write guard: \`${summary.writeGuard}\``,
    `- data file: \`${summary.dataFile}\``,
    `- data file is production: ${summary.dataFileIsProduction}`,
    `- synthetic smoke write: ${summary.inputIsTemporarySyntheticWrite}`,
    `- valid apply sections: ${summary.validApplySections}`,
    `- planned edit count: ${summary.plannedEditCount}`,
    `- data file changed: ${summary.dataFileChanged}`,
    '',
    '## Gate',
    '',
    '1. 기본 실행은 dry-run이며 `gwangjuSeatData.ts`를 수정하지 않습니다.',
    '2. production write는 `--write --require-ready`와 통과된 write guard가 모두 필요합니다.',
    '3. synthetic smoke 입력은 `--allow-synthetic-smoke`와 non-production `--data-file`에서만 write할 수 있습니다.',
    '4. 반영 대상은 `home-k7-seats`, `away-cheering-seats` 두 구역으로 고정합니다.',
    '5. 누락 야구 운영 데이터는 `MANUAL_BASEBALL_DATA_REQUIRED`로 남기고 추정하지 않습니다.',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Rows',
    '',
    markdownTable(
      ['section', 'valid', 'geometry', 'block', 'status', 'blockers'],
      report.rows.map((row) => [
        `\`${row.name}\``,
        `\`${row.validForApply}\``,
        `\`${row.geometryAction}\``,
        `\`${row.blockAction}\``,
        `\`${row.requirementStatusAction}\``,
        row.rowBlockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
      ]),
    ),
    '',
  ].join('\n'), 'utf8');
  
  console.log(`operator_apply_json:${jsonPath}`);
  console.log(`operator_apply_csv:${csvPath}`);
  console.log(`operator_apply_markdown:${markdownPath}`);
  console.log(`status:${summary.status} mode=${summary.mode} validApply=${summary.validApplySections} plannedEditCount=${summary.plannedEditCount} dataFileChanged=${summary.dataFileChanged}`);
  
  if (status === 'blocked' || (requireReady && status !== 'ok')) {
    process.exitCode = 1;
  }
};

const runOperatorWriteSmoke = async () => {
  const { default: crypto } = await import('node:crypto');
  const {
    spawnSync
  } = await import('node:child_process');
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
    GWANGJU_SEATMAP_IMAGE,
  } = await import('../src/data/gwangjuSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  
  const WRITE_SMOKE_VERSION = 'GWANGJU_OPERATOR_WRITE_SMOKE_V1';
  const SMOKE_REVIEWER = 'GWANGJU_OPERATOR_WRITE_SMOKE';
  const SMOKE_REVIEWED_AT = '2026-05-10T00:00:00.000Z';
  
  const SMOKE_GEOMETRY_BY_SECTION_ID = {
    'home-k7-seats': {
      officialBlocks: ['SMOKE_ONLY_HOME_K7'],
      points: [
        [24, 24],
        [74, 24],
        [74, 74],
        [24, 74],
      ],
      labelX: 49,
      labelY: 49,
      shortLabel: 'SMOKE-K7',
    },
    'away-cheering-seats': {
      officialBlocks: ['SMOKE_ONLY_AWAY_CHEERING'],
      points: [
        [104, 24],
        [154, 24],
        [154, 74],
        [104, 74],
      ],
      labelX: 129,
      labelY: 49,
      shortLabel: 'SMOKE-AWAY',
    },
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
  
  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));
  
  const sha256 = (content) => crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
  
  const sha256File = async (filePath) => sha256(await fs.readFile(filePath));
  
  const runNodeScript = (scriptPath, args) => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', scriptPath, ...args],
      {
        cwd: frontendRoot,
        encoding: 'utf8',
      },
    );
  
    return {
      command: ['node', '--import', 'tsx', scriptPath, ...args].join(' '),
      status: result.status ?? 1,
      signal: result.signal ?? '',
      stdoutTail: String(result.stdout ?? '').split('\n').slice(-12).join('\n').trim(),
      stderrTail: String(result.stderr ?? '').split('\n').slice(-12).join('\n').trim(),
    };
  };
  
  const assertCommandOk = (commandResult) => {
    if (commandResult.status !== 0) {
      const detail = [commandResult.stdoutTail, commandResult.stderrTail].filter(Boolean).join('\n');
      throw new Error(`Smoke command failed: ${commandResult.command}\n${detail}`);
    }
  };
  
  const buildSyntheticTemplate = (template) => {
    const requirementsById = new Map(GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map((section) => [section.id, section]));
    return {
      ...template,
      generatedAt: new Date().toISOString(),
      smokeVersion: WRITE_SMOKE_VERSION,
      nonProductionSyntheticInput: true,
      sections: (template.sections ?? []).map((section) => {
        const requirement = requirementsById.get(section.id);
        const smokeGeometry = SMOKE_GEOMETRY_BY_SECTION_ID[section.id];
        if (!requirement || !smokeGeometry) return section;
  
        return {
          ...section,
          operatorInput: {
            officialBlocks: smokeGeometry.officialBlocks,
            level: 'OUTFIELD',
            side: 'CENTER',
            fanRole: 'NEUTRAL',
            points: smokeGeometry.points,
            labelX: smokeGeometry.labelX,
            labelY: smokeGeometry.labelY,
            shortLabel: smokeGeometry.shortLabel,
            reviewer: SMOKE_REVIEWER,
            reviewedAt: SMOKE_REVIEWED_AT,
            operatorNote: 'Non-production smoke input. It only proves validation/apply-plan/status readiness in an isolated report directory and must never be promoted.',
          },
        };
      }),
    };
  };
  
  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const smokeDir = path.join(reportDir, 'gwangju-seatmap-operator-write-smoke');
  const productionTemplatePath = path.join(reportDir, 'gwangju-seatmap-operator-template.json');
  const productionTraceReviewPath = path.join(reportDir, 'gwangju-seatmap-trace-review.json');
  const sourceDataFile = path.join(frontendRoot, 'src/data/gwangjuSeatData.ts');
  const smokeTemplatePath = path.join(smokeDir, 'gwangju-seatmap-operator-template.json');
  const smokeTraceReviewPath = path.join(smokeDir, 'gwangju-seatmap-trace-review.json');
  const smokeValidationPath = path.join(smokeDir, 'gwangju-seatmap-operator-template-validation.json');
  const smokeApplyPlanPath = path.join(smokeDir, 'gwangju-seatmap-operator-template-apply-plan.json');
  const smokeHandoffPath = path.join(smokeDir, 'gwangju-seatmap-operator-handoff.json');
  const smokeStatusPath = path.join(smokeDir, 'gwangju-seatmap-operator-status.json');
  const smokeApplyPath = path.join(smokeDir, 'gwangju-seatmap-operator-apply.json');
  const smokeDataFilePath = path.join(smokeDir, 'gwangjuSeatData.smoke.ts');
  
  const productionDataShaBefore = await sha256File(sourceDataFile);
  const productionTemplateShaBefore = await sha256File(productionTemplatePath);
  const productionTemplate = await readJson(productionTemplatePath);
  const syntheticTemplate = buildSyntheticTemplate(productionTemplate);
  
  await fs.mkdir(smokeDir, { recursive: true });
  await fs.writeFile(smokeTemplatePath, `${JSON.stringify(syntheticTemplate, null, 2)}\n`, 'utf8');
  await fs.copyFile(productionTraceReviewPath, smokeTraceReviewPath);
  await fs.copyFile(sourceDataFile, smokeDataFilePath);
  const temporaryDataShaBefore = await sha256File(smokeDataFilePath);
  
  const commandResults = [];
  commandResults.push(runNodeScript('scripts/gwangju-seatmap-operator-template-ops.mjs', [
    'operator-template-validate',
    '--report-dir',
    smokeDir,
    '--input',
    smokeTemplatePath,
    '--strict',
  ]));
  assertCommandOk(commandResults.at(-1));
  commandResults.push(runNodeScript('scripts/gwangju-seatmap-operator-template-ops.mjs', [
    'operator-template-apply-plan',
    '--report-dir',
    smokeDir,
    '--input',
    smokeTemplatePath,
    '--validation',
    smokeValidationPath,
    '--require-ready',
  ]));
  assertCommandOk(commandResults.at(-1));
  commandResults.push(runNodeScript('scripts/gwangju-seatmap-operator-template-ops.mjs', [
    'operator-handoff',
    '--report-dir',
    smokeDir,
  ]));
  assertCommandOk(commandResults.at(-1));
  commandResults.push(runNodeScript('scripts/gwangju-seatmap-operator-template-ops.mjs', [
    'operator-status',
    '--report-dir',
    smokeDir,
  ]));
  assertCommandOk(commandResults.at(-1));
  commandResults.push(runNodeScript('scripts/gwangju-seatmap-operator-intake-write-ops.mjs', [
    'operator-apply',
    '--report-dir',
    smokeDir,
    '--input',
    smokeTemplatePath,
    '--validation',
    smokeValidationPath,
    '--apply-plan',
    smokeApplyPlanPath,
    '--status',
    smokeStatusPath,
    '--trace-review',
    smokeTraceReviewPath,
    '--data-file',
    smokeDataFilePath,
    '--write',
    '--require-ready',
    '--allow-synthetic-smoke',
  ]));
  assertCommandOk(commandResults.at(-1));
  
  const productionDataShaAfter = await sha256File(sourceDataFile);
  const productionTemplateShaAfter = await sha256File(productionTemplatePath);
  const temporaryDataShaAfter = await sha256File(smokeDataFilePath);
  const smokeValidation = await readJson(smokeValidationPath);
  const smokeApplyPlan = await readJson(smokeApplyPlanPath);
  const smokeHandoff = await readJson(smokeHandoffPath);
  const smokeStatus = await readJson(smokeStatusPath);
  const smokeApply = await readJson(smokeApplyPath);
  
  const productionDataUnchanged = productionDataShaBefore === productionDataShaAfter;
  const productionTemplateUnchanged = productionTemplateShaBefore === productionTemplateShaAfter;
  const temporaryDataChanged = temporaryDataShaBefore !== temporaryDataShaAfter;
  const validationReady = smokeValidation.summary?.status === 'ready'
    && smokeValidation.summary?.strict === true
    && smokeValidation.summary?.validPromotionSections === 2;
  const applyPlanReady = smokeApplyPlan.summary?.status === 'ready'
    && smokeApplyPlan.summary?.requireReady === true
    && smokeApplyPlan.summary?.validDataDiffSections === 2;
  const handoffReady = smokeHandoff.summary?.status === 'ready'
    && smokeHandoff.summary?.validDataDiffSections === 2;
  const statusReady = smokeStatus.summary?.status === 'ready'
    && smokeStatus.summary?.validDataDiffSections === 2
    && smokeStatus.summary?.pendingSections === 0;
  const applyReady = smokeApply.summary?.status === 'ok'
    && smokeApply.summary?.mode === 'write'
    && smokeApply.summary?.inputIsTemporarySyntheticWrite === true
    && smokeApply.summary?.dataFileIsProduction === false
    && smokeApply.summary?.validApplySections === 2;
  const applyWroteTempFile = applyReady
    && smokeApply.summary?.dataFileChanged === true
    && temporaryDataChanged;
  
  const blockers = [];
  if (!productionDataUnchanged) blockers.push('PRODUCTION_GWANGJU_DATA_CHANGED');
  if (!productionTemplateUnchanged) blockers.push('PRODUCTION_OPERATOR_TEMPLATE_CHANGED');
  if (!temporaryDataChanged) blockers.push('TEMPORARY_GWANGJU_DATA_NOT_CHANGED');
  if (!validationReady) blockers.push('SMOKE_VALIDATION_NOT_READY');
  if (!applyPlanReady) blockers.push('SMOKE_APPLY_PLAN_NOT_READY');
  if (!handoffReady) blockers.push('SMOKE_HANDOFF_NOT_READY');
  if (!statusReady) blockers.push('SMOKE_STATUS_NOT_READY');
  if (!applyReady) blockers.push('SMOKE_APPLY_NOT_READY');
  if (!applyWroteTempFile) blockers.push('SMOKE_APPLY_DID_NOT_WRITE_TEMP_FILE');
  
  const status = blockers.length === 0 ? 'ok' : 'failed';
  const summary = {
    writeSmokeVersion: WRITE_SMOKE_VERSION,
    status,
    smokeDir: path.relative(frontendRoot, smokeDir),
    syntheticTemplate: path.relative(frontendRoot, smokeTemplatePath),
    validationReport: path.relative(frontendRoot, smokeValidationPath),
    applyPlanReport: path.relative(frontendRoot, smokeApplyPlanPath),
    handoffReport: path.relative(frontendRoot, smokeHandoffPath),
    statusReport: path.relative(frontendRoot, smokeStatusPath),
    applyReport: path.relative(frontendRoot, smokeApplyPath),
    temporaryDataFile: path.relative(frontendRoot, smokeDataFilePath),
    officialImage: {
      requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
    },
    productionDataUnchanged,
    productionTemplateUnchanged,
    validationReady,
    applyPlanReady,
    handoffReady,
    statusReady,
    applyReady,
    temporaryDataChanged,
    applyWroteTempFile,
    smokeValidDataDiffSections: smokeStatus.summary?.validDataDiffSections ?? 0,
    productionDataShaBefore,
    productionDataShaAfter,
    productionTemplateShaBefore,
    productionTemplateShaAfter,
    temporaryDataShaBefore,
    temporaryDataShaAfter,
    blockers,
  };
  
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    nonProductionWarning: 'This smoke uses synthetic K7/AWAY operator input in an isolated report directory. It never writes gwangjuSeatData.ts and must not be copied into production operator coordinates.',
    safetyContract: [
      'Synthetic smoke coordinates are not baseball data and are not eligible for production promotion.',
      'The smoke must keep production src/data/gwangjuSeatData.ts unchanged.',
      'The smoke must exercise the apply write path only on a temporary gwangjuSeatData.smoke.ts copy.',
      'The smoke must keep the production operator template unchanged.',
      'The smoke proves the strict validation, apply-plan, handoff, status, and temp apply write path.',
    ],
    sourcePolicy: {
      allowedCoordinateSource: 'operator-provided official image coordinates only',
      missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      disallowedSources: [
        'browser CSS pixels',
        'resized screenshots',
        'external crawling',
        'web-search-based baseball data',
        'third-party copied seatmap images',
      ],
    },
    commandResults,
  };
  
  const jsonPath = path.join(smokeDir, 'gwangju-seatmap-operator-write-smoke.json');
  const csvPath = path.join(smokeDir, 'gwangju-seatmap-operator-write-smoke.csv');
  const markdownPath = path.join(smokeDir, 'gwangju-seatmap-operator-write-smoke.md');
  
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'status',
      'productionDataUnchanged',
      'productionTemplateUnchanged',
      'validationReady',
      'applyPlanReady',
      'handoffReady',
      'statusReady',
      'applyReady',
      'temporaryDataChanged',
      'applyWroteTempFile',
      'smokeValidDataDiffSections',
      'blockers',
    ],
    [
      summary.status,
      summary.productionDataUnchanged,
      summary.productionTemplateUnchanged,
      summary.validationReady,
      summary.applyPlanReady,
      summary.handoffReady,
      summary.statusReady,
      summary.applyReady,
      summary.temporaryDataChanged,
      summary.applyWroteTempFile,
      summary.smokeValidDataDiffSections,
      summary.blockers,
    ],
  ]);
  await fs.writeFile(markdownPath, [
    '# 광주 K7/원정응원석 operator write smoke',
    '',
    `- write smoke version: \`${WRITE_SMOKE_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- smoke dir: \`${summary.smokeDir}\``,
    `- synthetic template: \`${summary.syntheticTemplate}\``,
    `- validation report: \`${summary.validationReport}\``,
    `- apply plan report: \`${summary.applyPlanReport}\``,
    `- handoff report: \`${summary.handoffReport}\``,
    `- status report: \`${summary.statusReport}\``,
    `- apply report: \`${summary.applyReport}\``,
    `- temporary data file: \`${summary.temporaryDataFile}\``,
    `- production data unchanged: ${summary.productionDataUnchanged}`,
    `- production template unchanged: ${summary.productionTemplateUnchanged}`,
    `- temporary data changed: ${summary.temporaryDataChanged}`,
    `- validation ready: ${summary.validationReady}`,
    `- apply plan ready: ${summary.applyPlanReady}`,
    `- handoff ready: ${summary.handoffReady}`,
    `- status ready: ${summary.statusReady}`,
    `- apply ready: ${summary.applyReady}`,
    `- apply wrote temp file: ${summary.applyWroteTempFile}`,
    `- smoke valid data diff sections: ${summary.smokeValidDataDiffSections}`,
    '',
    '## Safety Contract',
    '',
    '1. 이 smoke의 좌표는 production 야구 데이터가 아닙니다.',
    '2. synthetic 입력은 isolated report directory에서만 사용하며 production `gwangjuSeatData.ts`를 수정하지 않습니다.',
    '3. actual apply write path는 임시 `gwangjuSeatData.smoke.ts` 복사본에서만 검증합니다.',
    '4. production operator template도 수정하지 않습니다.',
    '5. 실제 승격은 operator-provided official image coordinates only 정책을 통과한 입력만 사용합니다.',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Command Results',
    '',
    markdownTable(
      ['command', 'status', 'stdout tail', 'stderr tail'],
      commandResults.map((row) => [
        `\`${row.command}\``,
        String(row.status),
        row.stdoutTail || '-',
        row.stderrTail || '-',
      ]),
    ),
    '',
  ].join('\n'), 'utf8');
  
  console.log(`write_smoke_json:${jsonPath}`);
  console.log(`write_smoke_csv:${csvPath}`);
  console.log(`write_smoke_markdown:${markdownPath}`);
  console.log(`status:${summary.status} validationReady=${summary.validationReady} applyPlanReady=${summary.applyPlanReady} statusReady=${summary.statusReady} applyReady=${summary.applyReady} productionDataUnchanged=${summary.productionDataUnchanged} temporaryDataChanged=${summary.temporaryDataChanged}`);
  
  if (status !== 'ok') {
    process.exitCode = 1;
  }
};

const runOperatorWriteGuard = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  
  const GUARD_VERSION = 'GWANGJU_OPERATOR_WRITE_GUARD_V1';
  const REQUIRED_STATUS_VERSION = 'GWANGJU_OPERATOR_STATUS_V1';
  const REQUIRED_WRITE_SMOKE_VERSION = 'GWANGJU_OPERATOR_WRITE_SMOKE_V1';
  
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
  
  const readJsonReport = async (filePath) => {
    try {
      return {
        exists: true,
        filePath,
        relativePath: path.relative(frontendRoot, filePath),
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: '',
      };
    } catch (error) {
      return {
        exists: false,
        filePath,
        relativePath: path.relative(frontendRoot, filePath),
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
  
  const numberOrZero = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };
  
  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const statusPath = path.resolve(
    frontendRoot,
    argValue('--status', path.join('reports/stadium', 'gwangju-seatmap-operator-status.json')),
  );
  const writeSmokePath = path.resolve(
    frontendRoot,
    argValue(
      '--write-smoke',
      path.join('reports/stadium', 'gwangju-seatmap-operator-write-smoke', 'gwangju-seatmap-operator-write-smoke.json'),
    ),
  );
  const requireReady = hasFlag('--require-ready');
  
  const statusReport = await readJsonReport(statusPath);
  const writeSmokeReport = await readJsonReport(writeSmokePath);
  const statusSummary = statusReport.data?.summary ?? {};
  const writeSmokeSummary = writeSmokeReport.data?.summary ?? {};
  const statusBlockers = Array.isArray(statusSummary.blockers) ? statusSummary.blockers : [];
  const validDataDiffSections = numberOrZero(statusSummary.validDataDiffSections);
  const pendingSections = numberOrZero(statusSummary.pendingSections);
  const smokeValidDataDiffSections = numberOrZero(writeSmokeSummary.smokeValidDataDiffSections);
  const blockers = [];
  
  if (!statusReport.exists) blockers.push(`STATUS_REPORT_UNREADABLE:${statusReport.error}`);
  if (!writeSmokeReport.exists) blockers.push(`WRITE_SMOKE_REPORT_UNREADABLE:${writeSmokeReport.error}`);
  if (statusSummary.statusVersion !== REQUIRED_STATUS_VERSION) blockers.push('STATUS_VERSION_MISMATCH');
  if (writeSmokeSummary.writeSmokeVersion !== REQUIRED_WRITE_SMOKE_VERSION) blockers.push('WRITE_SMOKE_VERSION_MISMATCH');
  if (statusSummary.status !== 'ready') blockers.push(`STATUS_NOT_READY:${statusSummary.status ?? ''}`);
  if (statusBlockers.length > 0) blockers.push(`STATUS_HAS_BLOCKERS:${statusBlockers.join(' ')}`);
  if (pendingSections > 0) blockers.push(`OPERATOR_INPUT_PENDING:${pendingSections}`);
  if (validDataDiffSections <= 0) blockers.push('NO_VALID_DATA_DIFF_SECTIONS');
  if (statusSummary.validationStrict !== true) blockers.push('STRICT_VALIDATION_NOT_CONFIRMED');
  if (statusSummary.validationStatus !== 'ready') blockers.push(`VALIDATION_STATUS_NOT_READY:${statusSummary.validationStatus ?? ''}`);
  if (statusSummary.applyPlanStatus !== 'ready') blockers.push(`APPLY_PLAN_STATUS_NOT_READY:${statusSummary.applyPlanStatus ?? ''}`);
  if (statusSummary.handoffStatus !== 'ready') blockers.push(`HANDOFF_STATUS_NOT_READY:${statusSummary.handoffStatus ?? ''}`);
  if (writeSmokeSummary.status !== 'ok') blockers.push(`WRITE_SMOKE_STATUS_NOT_OK:${writeSmokeSummary.status ?? ''}`);
  if (writeSmokeSummary.productionDataUnchanged !== true) blockers.push('WRITE_SMOKE_PRODUCTION_DATA_CHANGED');
  if (writeSmokeSummary.productionTemplateUnchanged !== true) blockers.push('WRITE_SMOKE_PRODUCTION_TEMPLATE_CHANGED');
  if (writeSmokeSummary.temporaryDataChanged !== true) blockers.push('WRITE_SMOKE_TEMPORARY_DATA_NOT_CHANGED');
  if (writeSmokeSummary.applyWroteTempFile !== true) blockers.push('WRITE_SMOKE_APPLY_DID_NOT_WRITE_TEMP_FILE');
  if (writeSmokeSummary.validationReady !== true) blockers.push('WRITE_SMOKE_VALIDATION_NOT_READY');
  if (writeSmokeSummary.applyPlanReady !== true) blockers.push('WRITE_SMOKE_APPLY_PLAN_NOT_READY');
  if (writeSmokeSummary.handoffReady !== true) blockers.push('WRITE_SMOKE_HANDOFF_NOT_READY');
  if (writeSmokeSummary.statusReady !== true) blockers.push('WRITE_SMOKE_STATUS_NOT_READY');
  if (writeSmokeSummary.applyReady !== true) blockers.push('WRITE_SMOKE_APPLY_NOT_READY');
  if (smokeValidDataDiffSections !== 2) {
    blockers.push(`WRITE_SMOKE_VALID_DATA_DIFF_SECTIONS_MISMATCH:${smokeValidDataDiffSections}`);
  }
  
  const passed = blockers.length === 0;
  const summary = {
    guardVersion: GUARD_VERSION,
    status: passed ? 'ok' : 'blocked',
    passed,
    requireReady,
    statusReport: path.relative(frontendRoot, statusPath),
    writeSmokeReport: path.relative(frontendRoot, writeSmokePath),
    statusVersion: statusSummary.statusVersion ?? '',
    statusState: statusSummary.status ?? '',
    pendingSections,
    validDataDiffSections,
    validationStrict: statusSummary.validationStrict === true,
    validationStatus: statusSummary.validationStatus ?? '',
    applyPlanStatus: statusSummary.applyPlanStatus ?? '',
    handoffStatus: statusSummary.handoffStatus ?? '',
    writeSmokeStatus: writeSmokeSummary.status ?? '',
    productionDataUnchanged: writeSmokeSummary.productionDataUnchanged === true,
    productionTemplateUnchanged: writeSmokeSummary.productionTemplateUnchanged === true,
    temporaryDataChanged: writeSmokeSummary.temporaryDataChanged === true,
    applyWroteTempFile: writeSmokeSummary.applyWroteTempFile === true,
    applyReady: writeSmokeSummary.applyReady === true,
    smokeValidDataDiffSections,
    blockers,
    statusBlockers,
    guardedDataDiffAction: 'Promote only validForDataDiff=true operator rows to gwangjuSeatData.ts after this guard passes.',
    postDataDiffGate: [
      'npm run test:stadium:seatmaps',
      'node scripts/stadium-seatmap-ops.mjs gwangju trace-review',
      'npm run build',
    ],
  };
  
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    safetyContract: [
      'This guard must pass before K7/AWAY operator geometry is promoted to gwangjuSeatData.ts.',
      'The guard requires production status=ready, strict validation, ready apply-plan, ready handoff, and a passing write-smoke.',
      'If this guard is blocked, do not edit gwangjuSeatData.ts for K7/AWAY promotion.',
      'Missing baseball data must remain MANUAL_BASEBALL_DATA_REQUIRED instead of being inferred.',
    ],
  };
  
  const jsonPath = path.join(reportDir, 'gwangju-seatmap-operator-write-guard.json');
  const csvPath = path.join(reportDir, 'gwangju-seatmap-operator-write-guard.csv');
  const markdownPath = path.join(reportDir, 'gwangju-seatmap-operator-write-guard.md');
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'status',
      'passed',
      'requireReady',
      'statusState',
      'pendingSections',
      'validDataDiffSections',
      'validationStrict',
      'validationStatus',
      'applyPlanStatus',
      'handoffStatus',
      'writeSmokeStatus',
      'productionDataUnchanged',
      'productionTemplateUnchanged',
      'temporaryDataChanged',
      'applyWroteTempFile',
      'applyReady',
      'blockers',
    ],
    [
      summary.status,
      summary.passed,
      summary.requireReady,
      summary.statusState,
      summary.pendingSections,
      summary.validDataDiffSections,
      summary.validationStrict,
      summary.validationStatus,
      summary.applyPlanStatus,
      summary.handoffStatus,
      summary.writeSmokeStatus,
      summary.productionDataUnchanged,
      summary.productionTemplateUnchanged,
      summary.temporaryDataChanged,
      summary.applyWroteTempFile,
      summary.applyReady,
      summary.blockers,
    ],
  ]);
  await fs.writeFile(markdownPath, [
    '# 광주 K7/원정응원석 operator write guard',
    '',
    `- guard version: \`${GUARD_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- passed: ${summary.passed}`,
    `- require ready: ${summary.requireReady}`,
    `- status report: \`${summary.statusReport}\``,
    `- write smoke report: \`${summary.writeSmokeReport}\``,
    `- production status: \`${summary.statusState || '-'}\``,
    `- pending sections: ${summary.pendingSections}`,
    `- valid data diff sections: ${summary.validDataDiffSections}`,
    `- strict validation: ${summary.validationStrict}`,
    `- validation status: \`${summary.validationStatus || '-'}\``,
    `- apply plan status: \`${summary.applyPlanStatus || '-'}\``,
    `- handoff status: \`${summary.handoffStatus || '-'}\``,
    `- write smoke status: \`${summary.writeSmokeStatus || '-'}\``,
    `- production data unchanged in smoke: ${summary.productionDataUnchanged}`,
    `- production template unchanged in smoke: ${summary.productionTemplateUnchanged}`,
    `- temporary data changed in smoke: ${summary.temporaryDataChanged}`,
    `- apply wrote temp file in smoke: ${summary.applyWroteTempFile}`,
    `- apply ready in smoke: ${summary.applyReady}`,
    '',
    '## Gate',
    '',
    '1. 이 guard가 통과하기 전에는 `gwangjuSeatData.ts`에 K7/AWAY operator geometry를 승격하지 않습니다.',
    '2. production status가 `ready`가 아니면 data diff를 작성하지 않습니다.',
    '3. `validForDataDiff=true`인 row만 data diff 후보로 사용합니다.',
    '4. write-smoke가 production data와 production template이 변경되지 않았음을 증명해야 합니다.',
    '5. write-smoke가 temp data file에서 실제 apply write path를 검증해야 합니다.',
    '6. 야구 운영 데이터가 비어 있으면 `MANUAL_BASEBALL_DATA_REQUIRED`로 남깁니다.',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
    '',
    '## Status Blockers',
    '',
    summary.statusBlockers.length > 0
      ? summary.statusBlockers.map((blocker) => `- \`${blocker}\``).join('\n')
      : 'No status blockers.',
    '',
  ].join('\n'), 'utf8');
  
  console.log(`write_guard_json:${jsonPath}`);
  console.log(`write_guard_csv:${csvPath}`);
  console.log(`write_guard_markdown:${markdownPath}`);
  console.log(`status:${summary.status} passed=${summary.passed} pending=${summary.pendingSections} validDataDiff=${summary.validDataDiffSections}`);
  
  if (requireReady && !passed) {
    process.exitCode = 1;
  }
};

const taskRunners = {
  'operator-input-aid': runOperatorInputAid,
  'operator-input-packet': runOperatorInputPacket,
  'operator-apply': runOperatorApply,
  'operator-write-smoke': runOperatorWriteSmoke,
  'operator-write-guard': runOperatorWriteGuard,
};

const withTaskArgs = async (args, runner) => {
  const originalArgv = process.argv;
  process.argv = [originalArgv[0] ?? 'node', fileURLToPath(import.meta.url), ...args];
  try {
    await runner();
  } finally {
    process.argv = originalArgv;
  }
};

export const runGwangjuOperatorIntakeWriteTask = async (task, args = process.argv.slice(2)) => {
  const runner = taskRunners[task];
  if (!runner) {
    throw new Error(`Unknown Gwangju operator intake/write task: ${task ?? '(missing)'}`);
  }

  await withTaskArgs(args, runner);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [task, ...args] = process.argv.slice(2);
  await runGwangjuOperatorIntakeWriteTask(task, args);
}
