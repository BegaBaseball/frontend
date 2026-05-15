import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    'npm run qa:stadium:gwangju:trace-review',
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
