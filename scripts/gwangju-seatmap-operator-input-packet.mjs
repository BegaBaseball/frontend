import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GWANGJU_BASE_TRACE_BLOCK_COUNT,
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  GWANGJU_PENDING_OPERATOR_SECTIONS,
  GWANGJU_SEATMAP_IMAGE,
} from '../src/data/gwangjuSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');

const PACKET_VERSION = 'GWANGJU_OPERATOR_INPUT_PACKET_V1';
const PACKET_MODE = 'OPERATOR_COORDINATE_INPUT_PACKET';
const REFERENCE_BOUNDS_POLICY = 'REFERENCE_BOUNDS_ONLY_NOT_OPERATOR_POLYGON';
const jsonPath = path.join(reportDir, 'gwangju-seatmap-operator-input-packet.json');
const markdownPath = path.join(reportDir, 'gwangju-seatmap-operator-input-packet.md');

const sourcePolicy = {
  allowedCoordinateSource: 'operator-provided official PNG coordinates only',
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
  'npm run stadium:gwangju:operator-intake',
  'npm run stadium:gwangju:operator-handoff',
  'npm run stadium:gwangju:operator-input-aid',
  'npm run stadium:gwangju:operator-input-packet',
  'npm run stadium:gwangju:operator-template:validate:strict',
  'npm run stadium:gwangju:operator-template:apply-plan:require-ready',
  'npm run stadium:gwangju:operator-status',
  'npm run stadium:gwangju:operator-prewrite-gate',
  'npm run stadium:gwangju:operator-apply:write',
  'npm run stadium:gwangju:operator-postwrite-gate',
  'npm run qa:stadium:gwangju:release-verify:postoperator',
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
  `- official PNG: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\``,
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
  '- `operatorInput.points`, `labelX`, `labelY`는 공식 PNG 원본 `2200x1159`에서 운영자가 직접 입력해야 합니다.',
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
