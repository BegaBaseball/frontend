import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GWANGJU_BLOCKS,
  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
  GWANGJU_OFFICIAL_TRACE_REFERENCE,
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  GWANGJU_PENDING_OPERATOR_SECTIONS,
  GWANGJU_SEATMAP_IMAGE,
} from '../src/data/gwangjuSeatData.ts';

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
        'Open the official PNG at natural size 2200x1159.',
        'Use the listed clean overlay crops only as reference evidence.',
        'Trace the aggregate polygon points directly on the official PNG.',
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
  `- official PNG: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\``,
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
  '- `operatorInput.points`, `labelX`, `labelY`는 공식 PNG 원본 `2200x1159`에서 운영자가 직접 입력해야 합니다.',
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
