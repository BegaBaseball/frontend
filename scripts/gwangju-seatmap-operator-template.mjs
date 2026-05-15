import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  GWANGJU_PENDING_OPERATOR_SECTIONS,
  GWANGJU_SEATMAP_IMAGE,
} from '../src/data/gwangjuSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const jsonPath = path.join(outDir, 'gwangju-seatmap-operator-template.json');
const markdownPath = path.join(outDir, 'gwangju-seatmap-operator-template.md');

const emptyOperatorInput = () => ({
  officialBlocks: [],
  level: null,
  side: null,
  fanRole: null,
  points: [],
  labelX: null,
  labelY: null,
  shortLabel: null,
  reviewer: null,
  reviewedAt: null,
  operatorNote: null,
});

const normalizePreservedOperatorInput = (operatorInput) => {
  if (!operatorInput || typeof operatorInput !== 'object' || Array.isArray(operatorInput)) {
    return emptyOperatorInput();
  }

  return {
    officialBlocks: Array.isArray(operatorInput.officialBlocks) ? operatorInput.officialBlocks : [],
    level: operatorInput.level ?? null,
    side: operatorInput.side ?? null,
    fanRole: operatorInput.fanRole ?? null,
    points: Array.isArray(operatorInput.points) ? operatorInput.points : [],
    labelX: operatorInput.labelX ?? null,
    labelY: operatorInput.labelY ?? null,
    shortLabel: operatorInput.shortLabel ?? null,
    reviewer: operatorInput.reviewer ?? null,
    reviewedAt: operatorInput.reviewedAt ?? null,
    operatorNote: operatorInput.operatorNote ?? null,
  };
};

const readExistingTemplate = async () => {
  try {
    return JSON.parse(await fs.readFile(jsonPath, 'utf8'));
  } catch {
    return null;
  }
};

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
].join('\n');

const existingTemplate = await readExistingTemplate();
const preservedInputsById = new Map(
  (Array.isArray(existingTemplate?.sections) ? existingTemplate.sections : [])
    .filter((section) => section?.id && section?.operatorInput)
    .map((section) => [section.id, normalizePreservedOperatorInput(section.operatorInput)]),
);

const operatorSections = GWANGJU_OPERATOR_SECTION_REQUIREMENTS
  .filter((section) => section.status === 'PENDING_OPERATOR_INPUT')
  .map((section) => ({
    id: section.id,
    category: section.category,
    name: section.name,
    status: section.status,
    coordinateSystem: section.coordinateSystem,
    requiredFields: section.requiredFields,
    sourcePolicy: {
      allowedSource: 'operator-provided official PNG coordinates only',
      disallowedSources: [
        'browser CSS pixels',
        'resized screenshots',
        'external crawling',
        'web-search-based baseball data',
        'third-party copied seatmap images',
      ],
    },
    operatorInput: preservedInputsById.get(section.id) ?? emptyOperatorInput(),
  }));

const template = {
  generatedAt: new Date().toISOString(),
  contract: 'GWANGJU_OPERATOR_POLYGON_TEMPLATE_V1',
  asset: {
    imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
    imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
    imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
    requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
  },
  pendingOperatorSections: GWANGJU_PENDING_OPERATOR_SECTIONS,
  preservedOperatorInputSections: operatorSections
    .filter((section) => preservedInputsById.has(section.id))
    .map((section) => section.id),
  coordinateRules: [
    'Use the original official PNG coordinate system only: 2200x1159.',
    'Record polygon points as [x, y] pairs in clockwise or counter-clockwise order.',
    'Record level as one of 1F, 2F, 3F, 4F, 5F, OUTFIELD.',
    'Keep K7 and away cheering sections inactive until this template is filled and reviewed.',
    'Regenerating this template preserves operatorInput values by section id.',
    'Do not infer or auto-repair missing baseball data from external web sources.',
  ],
  sections: operatorSections,
};

const markdown = [
  '# 광주 K7/원정응원석 운영자 polygon 입력 템플릿',
  '',
  `- 공식 이미지: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
  `- 입력 대기 구역: ${GWANGJU_PENDING_OPERATOR_SECTIONS.join(', ') || '-'}`,
  '- 좌표 기준: 공식 PNG 원본 좌표계만 사용합니다.',
  '- 금지: 브라우저 CSS 픽셀, 리사이즈된 스크린샷, 외부 크롤링/웹 검색 기반 보정, third-party 이미지 복사',
  '- 재생성 안전성: 기존 `operatorInput` 값은 section id 기준으로 보존합니다.',
  '',
  '## 입력 필드',
  '',
  markdownTable(
    ['section', 'category', 'required fields'],
    operatorSections.map((section) => [
      section.name,
      section.category,
      section.requiredFields.map((field) => `\`${field}\``).join(', '),
    ]),
  ),
  '',
  '## JSON 작성 규칙',
  '',
  '1. `operatorInput.points`에 공식 PNG 좌표계의 polygon `[x, y]` 배열을 넣습니다.',
  '2. `operatorInput.labelX`, `operatorInput.labelY`는 polygon 내부의 label anchor로 넣습니다.',
  '3. `officialBlocks`, `level`, `side`, `fanRole`, `shortLabel`, `reviewer`, `reviewedAt`을 함께 채웁니다.',
  '4. 운영자 검수 전까지 실제 hit-area 데이터로 승격하지 않습니다.',
  '',
].join('\n');

await fs.mkdir(outDir, { recursive: true });

await fs.writeFile(jsonPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
await fs.writeFile(markdownPath, markdown, 'utf8');

console.log(`operator_template_json:${jsonPath}`);
console.log(`operator_template_markdown:${markdownPath}`);
console.log(`status:ok pending=${operatorSections.length}`);
