import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  GWANGJU_SEATMAP_IMAGE,
} from '../src/data/gwangjuSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const HANDOFF_VERSION = 'GWANGJU_OPERATOR_HANDOFF_V1';
const REQUIRED_REPORTS = {
  traceReview: 'gwangju-seatmap-trace-review.json',
  operatorTemplate: 'gwangju-seatmap-operator-template.json',
  validation: 'gwangju-seatmap-operator-template-validation.json',
  applyPlan: 'gwangju-seatmap-operator-template-apply-plan.json',
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

const readJsonReport = async (reportDir, fileName) => {
  const filePath = path.join(reportDir, fileName);
  try {
    return {
      exists: true,
      filePath,
      relativePath: path.relative(frontendRoot, filePath),
      data: JSON.parse(await fs.readFile(filePath, 'utf8')),
      error: null,
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

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const reports = Object.fromEntries(await Promise.all(
  Object.entries(REQUIRED_REPORTS).map(async ([key, fileName]) => [key, await readJsonReport(reportDir, fileName)]),
));

const requirementsById = new Map(GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map((section) => [section.id, section]));
const templateSections = reports.operatorTemplate.data?.sections ?? [];
const validationRowsById = new Map((reports.validation.data?.sections ?? []).map((row) => [row.id, row]));
const applyPlanRowsById = new Map((reports.applyPlan.data?.rows ?? []).map((row) => [row.id, row]));
const missingReports = Object.values(reports)
  .filter((report) => !report.exists)
  .map((report) => report.relativePath);

const workItems = templateSections.map((section) => {
  const requirement = requirementsById.get(section.id);
  const validationRow = validationRowsById.get(section.id) ?? {};
  const applyPlanRow = applyPlanRowsById.get(section.id) ?? {};
  const operatorInput = section.operatorInput ?? {};
  const pending = validationRow.pending !== false;
  const requiredActions = pending
    ? [
      'Fill operatorInput.points with official PNG 2200x1159 polygon points.',
      'Fill operatorInput.labelX and operatorInput.labelY inside the polygon.',
      'Fill officialBlocks, level, side, fanRole, shortLabel, reviewer, reviewedAt.',
      'Run npm run stadium:gwangju:operator-template:validate:strict.',
      'Run npm run stadium:gwangju:operator-template:apply-plan:require-ready.',
    ]
    : [
      'Review validation warnings before data diff.',
      'Promote only validForDataDiff=true rows.',
    ];

  return {
    id: section.id,
    name: section.name,
    category: section.category,
    manualReferenceUrl: requirement?.manualReferenceUrl ?? '',
    coordinateSystem: section.coordinateSystem,
    requiredFields: section.requiredFields,
    pending,
    validationReasons: validationRow.reasons ?? [],
    validationWarnings: validationRow.warnings ?? [],
    validForPromotion: validationRow.validForPromotion === true,
    validForDataDiff: applyPlanRow.validForDataDiff === true,
    applyPlanBlockers: applyPlanRow.rowBlockers ?? [],
    manualDataRequired: applyPlanRow.manualDataRequired ?? [],
    operatorInputSnapshot: {
      officialBlocks: operatorInput.officialBlocks ?? [],
      level: operatorInput.level ?? null,
      side: operatorInput.side ?? null,
      fanRole: operatorInput.fanRole ?? null,
      pointCount: Array.isArray(operatorInput.points) ? operatorInput.points.length : 0,
      labelX: operatorInput.labelX ?? null,
      labelY: operatorInput.labelY ?? null,
      shortLabel: operatorInput.shortLabel ?? null,
      reviewer: operatorInput.reviewer ?? null,
      reviewedAt: operatorInput.reviewedAt ?? null,
    },
    requiredActions,
  };
});

const summary = {
  handoffVersion: HANDOFF_VERSION,
  status: missingReports.length > 0 ? 'blocked' : workItems.some((item) => item.pending) ? 'pending' : 'ready',
  asset: {
    imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
    imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
    imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
    requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
  },
  activeTraceBlocks: reports.traceReview.data?.summary?.totalBlocks ?? reports.traceReview.data?.summary?.totalBlocks,
  officialImageTracedBlocks: reports.traceReview.data?.summary?.officialImageTracedBlocks ?? reports.traceReview.data?.summary?.officialImageTraced,
  pixelAlignedBlocks: reports.traceReview.data?.summary?.pixelAlignedBlocks ?? reports.traceReview.data?.summary?.pixelAligned,
  overlapWarnings: reports.traceReview.data?.summary?.overlapWarningCount ?? 0,
  operatorSections: workItems.length,
  pendingSections: workItems.filter((item) => item.pending).length,
  validPromotionSections: workItems.filter((item) => item.validForPromotion).length,
  validDataDiffSections: workItems.filter((item) => item.validForDataDiff).length,
  missingReports,
};

const handoff = {
  generatedAt: new Date().toISOString(),
  summary,
  sourcePolicy: {
    allowedCoordinateSource: 'operator-provided official PNG coordinates only',
    coordinateSystem: `${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight}`,
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    disallowedSources: [
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
  },
  artifacts: {
    officialAsset: GWANGJU_SEATMAP_IMAGE.imagePath,
    traceReviewJson: reports.traceReview.relativePath,
    traceReviewMarkdown: path.join('reports/stadium', 'gwangju-seatmap-trace-review.md'),
    traceReviewOverlay: path.join('reports/stadium', 'gwangju-seatmap-trace-review-overlay.png'),
    traceReviewCleanCrops: path.join('reports/stadium', 'gwangju-seatmap-trace-review-clean-crops'),
    operatorTemplateJson: reports.operatorTemplate.relativePath,
    operatorTemplateMarkdown: path.join('reports/stadium', 'gwangju-seatmap-operator-template.md'),
    validationJson: reports.validation.relativePath,
    validationMarkdown: path.join('reports/stadium', 'gwangju-seatmap-operator-template-validation.md'),
    applyPlanJson: reports.applyPlan.relativePath,
    applyPlanMarkdown: path.join('reports/stadium', 'gwangju-seatmap-operator-template-apply-plan.md'),
  },
  requiredCommands: [
    'npm run stadium:gwangju:operator-template:gate',
    'npm run stadium:gwangju:operator-status',
    'npm run stadium:gwangju:operator-apply',
    'npm run stadium:gwangju:operator-write-smoke',
    'npm run stadium:gwangju:operator-write-guard:require-ready',
    'npm run stadium:gwangju:operator-apply:write',
    'npm run stadium:gwangju:operator-postwrite-gate',
    'npm run stadium:gwangju:operator-template:validate:strict',
    'npm run stadium:gwangju:operator-template:apply-plan:require-ready',
    'npm run test:stadium:seatmaps',
    'npm run qa:stadium:gwangju:trace-review',
    'npm run build',
  ],
  workItems,
};

const jsonPath = path.join(reportDir, 'gwangju-seatmap-operator-handoff.json');
const csvPath = path.join(reportDir, 'gwangju-seatmap-operator-handoff.csv');
const markdownPath = path.join(reportDir, 'gwangju-seatmap-operator-handoff.md');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'id',
    'name',
    'category',
    'pending',
    'validForPromotion',
    'validForDataDiff',
    'requiredFields',
    'applyPlanBlockers',
    'manualDataRequired',
    'pointCount',
    'labelX',
    'labelY',
    'reviewer',
    'reviewedAt',
  ],
  ...workItems.map((item) => [
    item.id,
    item.name,
    item.category,
    item.pending,
    item.validForPromotion,
    item.validForDataDiff,
    item.requiredFields,
    item.applyPlanBlockers,
    item.manualDataRequired,
    item.operatorInputSnapshot.pointCount,
    item.operatorInputSnapshot.labelX,
    item.operatorInputSnapshot.labelY,
    item.operatorInputSnapshot.reviewer,
    item.operatorInputSnapshot.reviewedAt,
  ]),
]);
await fs.writeFile(markdownPath, [
  '# 광주 K7/원정응원석 운영자 handoff',
  '',
  `- handoff version: \`${summary.handoffVersion}\``,
  `- status: \`${summary.status}\``,
  `- official PNG: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
  `- active traced blocks: ${summary.activeTraceBlocks ?? '-'}`,
  `- pixel aligned blocks: ${summary.pixelAlignedBlocks ?? '-'}`,
  `- overlap warnings: ${summary.overlapWarnings}`,
  `- operator sections: ${summary.operatorSections}`,
  `- pending sections: ${summary.pendingSections}`,
  `- valid data diff sections: ${summary.validDataDiffSections}`,
  '',
  '## Source Policy',
  '',
  '- 허용: operator-provided official PNG coordinates only',
  '- 좌표계: official PNG 2200x1159',
  '- 금지: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images',
  '- 누락 야구 운영 데이터: `MANUAL_BASEBALL_DATA_REQUIRED`',
  '',
  '## Artifacts',
  '',
  Object.entries(handoff.artifacts)
    .map(([label, artifactPath]) => `- ${label}: \`${artifactPath}\``)
    .join('\n'),
  '',
  '## Required Commands',
  '',
  handoff.requiredCommands.map((command) => `- \`${command}\``).join('\n'),
  '',
  '## Work Items',
  '',
  markdownTable(
    ['section', 'pending', 'valid promotion', 'valid data diff', 'required fields', 'blockers'],
    workItems.map((item) => [
      `\`${item.name}\``,
      `\`${item.pending}\``,
      `\`${item.validForPromotion}\``,
      `\`${item.validForDataDiff}\``,
      item.requiredFields.map((field) => `\`${field}\``).join(', '),
      item.applyPlanBlockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
    ]),
  ),
  '',
  '## Operator Steps',
  '',
  '1. `gwangju-seatmap-operator-template.json`에서 각 work item의 `operatorInput`을 채웁니다.',
  '2. `points`, `labelX`, `labelY`는 official PNG 원본 2200x1159 좌표만 사용합니다.',
  '3. `officialBlocks`, `level`, `side`, `fanRole`, `shortLabel`, `reviewer`, `reviewedAt`을 함께 채웁니다.',
  '4. `validate:strict`와 `apply-plan:require-ready`를 통과한 구역만 data diff로 승격합니다.',
  '5. `npm run stadium:gwangju:operator-status`로 pending/ready 상태를 확인합니다.',
  '6. `npm run stadium:gwangju:operator-apply`로 dry-run 보고서를 확인합니다.',
  '7. `npm run stadium:gwangju:operator-write-smoke`와 `npm run stadium:gwangju:operator-write-guard:require-ready`를 통과한 뒤 `npm run stadium:gwangju:operator-apply:write`를 실행합니다.',
  '8. write 후에는 `npm run stadium:gwangju:operator-postwrite-gate`를 통과시킵니다.',
  '',
].join('\n'), 'utf8');

console.log(`operator_handoff_json:${jsonPath}`);
console.log(`operator_handoff_csv:${csvPath}`);
console.log(`operator_handoff_markdown:${markdownPath}`);
console.log(`status:${summary.status} operatorSections=${summary.operatorSections} pending=${summary.pendingSections} validDataDiff=${summary.validDataDiffSections}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
