import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const TEMPLATE_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1';
const DECISION_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_RETRACE'];

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

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
const handoff = await readJson(handoffPath);

const corrections = handoff.workItems.map((row) => ({
  blockId: row.id,
  block: row.block,
  name: row.name,
  category: row.category,
  queuePriority: row.queuePriority,
  alignmentClass: row.alignmentClass,
  candidateStatus: row.candidateStatus,
  candidateDuplicateGroup: row.candidateDuplicateGroup,
  recommendedAction: row.recommendedAction,
  evidenceCrop: `reports/stadium/daegu-handoff-evidence-crops/${row.queuePriority.toLowerCase()}-${String(row.alignmentClass).toLowerCase().replaceAll('_', '-')}-${String(row.category).toLowerCase()}-${String(row.block).toLowerCase().replace(/[^a-z0-9-]+/g, '-')}-${String(row.id).toLowerCase().replace(/[^a-z0-9-]+/g, '-')}.png`,
  operatorDecision: 'PENDING',
  correctedPath: '',
  correctedLabelX: '',
  correctedLabelY: '',
  reviewer: '',
  reviewedAt: '',
  operatorNote: '',
}));

const template = {
  generatedAt: new Date().toISOString(),
  templateVersion: TEMPLATE_VERSION,
  sourceHandoff: path.relative(frontendRoot, handoffPath),
  sourceHandoffVersion: handoff.summary?.handoffVersion ?? '',
  correctionContract: {
    decisionOptions: DECISION_OPTIONS,
    nonAutomaticPromotion: true,
    coordinateSystem: {
      image: 'daegu-samsung-seatmap-official-2026.png',
      width: handoff.asset?.imageWidth,
      height: handoff.asset?.imageHeight,
      unit: 'official PNG pixel',
    },
    requiredForApproval: [
      'blockId',
      'operatorDecision=APPROVED',
      'correctedPath',
      'correctedLabelX',
      'correctedLabelY',
      'reviewer',
      'reviewedAt',
    ],
    pathRules: [
      'Use one closed SVG polygon path with M/L/Z commands.',
      'Coordinates must stay inside the official PNG bounds.',
      'correctedLabelX/correctedLabelY must be inside correctedPath.',
      'The corrected label point must top-hit the same block after simulated replacement.',
      'Duplicate candidate groups must submit separate official boundaries, not the same correctedPath.',
    ],
    validationScript: 'npm run stadium:daegu:operator-corrections-validate',
  },
  corrections,
};

const jsonPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.json');
const csvPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.csv');
const markdownPath = path.join(reportDir, 'daegu-seatmap-operator-corrections-template.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
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
  ],
  ...corrections.map((row) => [
    row.blockId,
    row.block,
    row.name,
    row.category,
    row.queuePriority,
    row.alignmentClass,
    row.candidateStatus,
    row.candidateDuplicateGroup,
    row.recommendedAction,
    row.evidenceCrop,
    row.operatorDecision,
    row.correctedPath,
    row.correctedLabelX,
    row.correctedLabelY,
    row.reviewer,
    row.reviewedAt,
    row.operatorNote,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# 대구 좌석도 operator corrections template',
  '',
  `- template version: \`${TEMPLATE_VERSION}\``,
  `- source handoff: \`${template.sourceHandoff}\``,
  `- correction rows: ${corrections.length}`,
  `- decision options: ${DECISION_OPTIONS.map((option) => `\`${option}\``).join(' ')}`,
  '- JSON: `reports/stadium/daegu-seatmap-operator-corrections-template.json`',
  '- CSV: `reports/stadium/daegu-seatmap-operator-corrections-template.csv`',
  '',
  '## Approval Contract',
  '',
  '1. `operatorDecision=APPROVED`인 행만 데이터 반영 후보가 됩니다.',
  '2. 승인 행은 `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`이 모두 필요합니다.',
  '3. `correctedPath`는 공식 PNG 픽셀 좌표계의 단일 폐합 polygon이어야 합니다.',
  '4. 승인 행은 `npm run stadium:daegu:operator-corrections-validate`를 통과해야 합니다.',
  '5. 이 템플릿은 데이터 자동 반영 파일이 아닙니다. 반영은 별도 reviewed data diff에서만 합니다.',
  '',
  '## Queue Summary',
  '',
  markdownTable(
    ['priority', 'rows'],
    ['P0', 'P1', 'P2', 'P3', 'P4'].map((priority) => [
      `\`${priority}\``,
      String(corrections.filter((row) => row.queuePriority === priority).length),
    ]),
  ),
  '',
].join('\n'), 'utf8');

console.log(`corrections_template_json:${jsonPath}`);
console.log(`corrections_template_csv:${csvPath}`);
console.log(`corrections_template_markdown:${markdownPath}`);
console.log(`status:ok rows=${corrections.length}`);
