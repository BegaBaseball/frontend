import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
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
commandResults.push(runNodeScript('scripts/gwangju-seatmap-operator-template-validate.mjs', [
  '--report-dir',
  smokeDir,
  '--input',
  smokeTemplatePath,
  '--strict',
]));
assertCommandOk(commandResults.at(-1));
commandResults.push(runNodeScript('scripts/gwangju-seatmap-operator-template-apply-plan.mjs', [
  '--report-dir',
  smokeDir,
  '--input',
  smokeTemplatePath,
  '--validation',
  smokeValidationPath,
  '--require-ready',
]));
assertCommandOk(commandResults.at(-1));
commandResults.push(runNodeScript('scripts/gwangju-seatmap-operator-handoff.mjs', [
  '--report-dir',
  smokeDir,
]));
assertCommandOk(commandResults.at(-1));
commandResults.push(runNodeScript('scripts/gwangju-seatmap-operator-status.mjs', [
  '--report-dir',
  smokeDir,
]));
assertCommandOk(commandResults.at(-1));
commandResults.push(runNodeScript('scripts/gwangju-seatmap-operator-apply.mjs', [
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
    allowedCoordinateSource: 'operator-provided official PNG coordinates only',
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
  '5. 실제 승격은 operator-provided official PNG coordinates only 정책을 통과한 입력만 사용합니다.',
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
