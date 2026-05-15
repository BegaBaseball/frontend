import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
const defaultP2OperatorDir = path.join(defaultReportDir, 'daegu-p2-operator');

const READINESS_VERSION = 'DAEGU_P2A_READINESS_V3';
const P2A_POST_ENTRY_QA_VERSION = 'DAEGU_P2A_OPERATOR_POST_ENTRY_QA_V1';
const INPUT_PACKET_VERSION = 'DAEGU_P2A_OPERATOR_INPUT_PACKET_V1';
const PREWRITE_GATE_VERSION = 'DAEGU_P2A_PREWRITE_GATE_V1';
const P2_READINESS_VERSION = 'DAEGU_P2_OPERATOR_READINESS_V2';
const RENDER_SAFETY_VERSION = 'DAEGU_SEATMAP_RENDER_SAFETY_AUDIT_V1';
const TARGET_WORKSET = 'P2-A';
const EXPECTED_P2A_ROWS = 2;

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

const numberOrZero = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const p2OperatorDir = path.resolve(frontendRoot, argValue('--p2-operator-dir', defaultP2OperatorDir));
const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const outputDir = path.resolve(frontendRoot, argValue('--output-dir', p2OperatorDir));

const paths = {
  postEntryQa: path.join(p2OperatorDir, 'daegu-seatmap-p2a-operator-post-entry-qa.json'),
  inputPacket: path.join(p2OperatorDir, 'daegu-seatmap-p2a-operator-input-packet.json'),
  prewriteGate: path.join(p2OperatorDir, 'daegu-seatmap-p2a-prewrite-gate.json'),
  p2Readiness: path.join(p2OperatorDir, 'daegu-seatmap-p2-operator-readiness.json'),
  renderSafety: path.join(reportDir, 'daegu-seatmap-render-safety-audit.json'),
};

const reports = {
  postEntryQa: await readJsonReport(paths.postEntryQa),
  inputPacket: await readJsonReport(paths.inputPacket),
  prewriteGate: await readJsonReport(paths.prewriteGate),
  p2Readiness: await readJsonReport(paths.p2Readiness),
  renderSafety: await readJsonReport(paths.renderSafety),
};

const postEntrySummary = reports.postEntryQa.data?.summary ?? {};
const inputPacketSummary = reports.inputPacket.data?.summary ?? {};
const prewriteSummary = reports.prewriteGate.data?.summary ?? {};
const p2ReadinessSummary = reports.p2Readiness.data?.summary ?? {};
const renderSafetySummary = reports.renderSafety.data?.summary ?? {};
const blockers = [];
const waitingReasons = [];
const warnings = [];

Object.entries(reports).forEach(([key, report]) => {
  if (!report.exists && key === 'p2Readiness') {
    waitingReasons.push(`P2A_WAITING_FULL_P2_READINESS_REPORT:${report.relativePath}`);
    return;
  }
  if (!report.exists) blockers.push(`MISSING_REPORT:${report.relativePath}`);
});

if (reports.postEntryQa.exists && postEntrySummary.p2aPostEntryQaVersion !== P2A_POST_ENTRY_QA_VERSION) {
  blockers.push(`P2A_POST_ENTRY_QA_VERSION_MISMATCH:${postEntrySummary.p2aPostEntryQaVersion ?? ''}`);
}
if (reports.inputPacket.exists && inputPacketSummary.inputPacketVersion !== INPUT_PACKET_VERSION) {
  blockers.push(`P2A_INPUT_PACKET_VERSION_MISMATCH:${inputPacketSummary.inputPacketVersion ?? ''}`);
}
if (reports.prewriteGate.exists && prewriteSummary.prewriteGateVersion !== PREWRITE_GATE_VERSION) {
  blockers.push(`P2A_PREWRITE_GATE_VERSION_MISMATCH:${prewriteSummary.prewriteGateVersion ?? ''}`);
}
if (reports.p2Readiness.exists && p2ReadinessSummary.readinessVersion !== P2_READINESS_VERSION) {
  blockers.push(`P2_READINESS_VERSION_MISMATCH:${p2ReadinessSummary.readinessVersion ?? ''}`);
}
if (reports.renderSafety.exists && reports.renderSafety.data?.auditVersion !== RENDER_SAFETY_VERSION) {
  blockers.push(`RENDER_SAFETY_VERSION_MISMATCH:${reports.renderSafety.data?.auditVersion ?? ''}`);
}
if (inputPacketSummary.targetWorkset && inputPacketSummary.targetWorkset !== TARGET_WORKSET) {
  blockers.push(`P2A_INPUT_PACKET_WORKSET_MISMATCH:${inputPacketSummary.targetWorkset}`);
}
if (prewriteSummary.targetWorkset && prewriteSummary.targetWorkset !== TARGET_WORKSET) {
  blockers.push(`P2A_PREWRITE_GATE_WORKSET_MISMATCH:${prewriteSummary.targetWorkset}`);
}
if (numberOrZero(prewriteSummary.totalRows) !== EXPECTED_P2A_ROWS) {
  blockers.push(`P2A_PREWRITE_ROW_COUNT_MISMATCH:${prewriteSummary.totalRows ?? ''}:${EXPECTED_P2A_ROWS}`);
}
if (numberOrZero(inputPacketSummary.totalRows) !== EXPECTED_P2A_ROWS) {
  blockers.push(`P2A_INPUT_PACKET_ROW_COUNT_MISMATCH:${inputPacketSummary.totalRows ?? ''}:${EXPECTED_P2A_ROWS}`);
}
if (Array.isArray(prewriteSummary.blockers) && prewriteSummary.blockers.length > 0) {
  blockers.push(...prewriteSummary.blockers.map((blocker) => `PREWRITE_GATE_BLOCKER:${blocker}`));
}
if (postEntrySummary.status === 'blocked-after-entry') blockers.push('P2A_POST_ENTRY_QA_BLOCKED_AFTER_ENTRY');
if (prewriteSummary.status === 'blocked') blockers.push('P2A_PREWRITE_GATE_BLOCKED');
if (reports.renderSafety.data?.passLevel !== 'PASS_UI_CONTAINMENT') {
  blockers.push(`RENDER_SAFETY_NOT_UI_CONTAINED:${reports.renderSafety.data?.passLevel ?? ''}`);
}
if (renderSafetySummary.sourceContracts?.normalLayerUsesSelectablePredicate === false) {
  blockers.push('RENDER_SAFETY_NORMAL_LAYER_SELECTABLE_PREDICATE_MISSING');
}
if (Array.isArray(renderSafetySummary.hardBlockers) && renderSafetySummary.hardBlockers.length > 0) {
  blockers.push(...renderSafetySummary.hardBlockers.map((blocker) => `RENDER_SAFETY_HARD_BLOCKER:${blocker}`));
}

if (numberOrZero(prewriteSummary.approvedRows) < EXPECTED_P2A_ROWS) {
  waitingReasons.push(`P2A_WAITING_OPERATOR_ENTRY:${numberOrZero(prewriteSummary.approvedRows)}/${EXPECTED_P2A_ROWS}`);
}
if (prewriteSummary.approvedRows === EXPECTED_P2A_ROWS && prewriteSummary.p1PostwriteVerified !== true) {
  waitingReasons.push(`P2A_WAITING_P1_POSTWRITE:${prewriteSummary.p1PostwriteStatus || 'missing'}`);
}
if (prewriteSummary.readyForP2Readiness === true && p2ReadinessSummary.readyForTemplateImport !== true) {
  waitingReasons.push(`P2A_WAITING_FULL_P2_READINESS:${p2ReadinessSummary.status || 'missing'}`);
}
if (p2ReadinessSummary.status === 'blocked') {
  warnings.push('FULL_P2_READINESS_CURRENTLY_BLOCKED');
}
if (prewriteSummary.readyForProductionWrite === false) {
  warnings.push('P2A_NEVER_ALLOWS_DIRECT_PRODUCTION_WRITE');
}

const ready = blockers.length === 0
  && waitingReasons.length === 0
  && prewriteSummary.readyForP2Readiness === true
  && p2ReadinessSummary.readyForTemplateImport === true;
const status = blockers.length > 0
  ? 'blocked'
  : ready
    ? 'ready'
    : 'waiting';

const summary = {
  readinessVersion: READINESS_VERSION,
  status,
  targetWorkset: TARGET_WORKSET,
  expectedRows: EXPECTED_P2A_ROWS,
  approvedRows: numberOrZero(prewriteSummary.approvedRows),
  readyForP2Readiness: prewriteSummary.readyForP2Readiness === true,
  readyForFullP2TemplateImport: p2ReadinessSummary.readyForTemplateImport === true,
  readyForProductionWrite: false,
  productionWriteAllowed: false,
  p1PostwriteStatus: prewriteSummary.p1PostwriteStatus ?? '',
  p1PostwriteVerified: prewriteSummary.p1PostwriteVerified === true,
  postEntryQaStatus: postEntrySummary.status ?? '',
  inputPacketStatus: inputPacketSummary.status ?? '',
  prewriteGateStatus: prewriteSummary.status ?? '',
  p2ReadinessStatus: p2ReadinessSummary.status ?? '',
  renderSafetyPassLevel: reports.renderSafety.data?.passLevel ?? '',
  normalSelectable: numberOrZero(renderSafetySummary.normalSelectableSeats),
  reviewOnly: numberOrZero(renderSafetySummary.reviewOnlySeats),
  blockers,
  waitingReasons: [...new Set(waitingReasons)],
  warnings: [...new Set(warnings)],
  sourceReports: Object.fromEntries(
    Object.entries(reports).map(([key, report]) => [
      key,
      {
        path: report.relativePath,
        exists: report.exists,
        error: report.error,
      },
    ]),
  ),
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  safetyContract: [
    'This P2-A readiness V3 report is read-only.',
    'It combines P2-A post-entry QA, input packet, prewrite gate, full P2 readiness, and render-safety audit state.',
    'It never writes source input, corrections template, or src/data/daeguSeatData.ts.',
    'P2-A readiness can only advance to full P2 readiness; it never allows direct production write.',
    'The normal UI must remain PASS_UI_CONTAINMENT while P2-A is waiting for operator approval.',
  ],
};

const jsonPath = path.join(outputDir, 'daegu-seatmap-p2a-readiness-v3.json');
const csvPath = path.join(outputDir, 'daegu-seatmap-p2a-readiness-v3.csv');
const markdownPath = path.join(outputDir, 'daegu-seatmap-p2a-readiness-v3.md');

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  ['metric', 'value'],
  ['readinessVersion', summary.readinessVersion],
  ['status', summary.status],
  ['approvedRows', summary.approvedRows],
  ['readyForP2Readiness', summary.readyForP2Readiness],
  ['readyForFullP2TemplateImport', summary.readyForFullP2TemplateImport],
  ['readyForProductionWrite', summary.readyForProductionWrite],
  ['p1PostwriteStatus', summary.p1PostwriteStatus],
  ['renderSafetyPassLevel', summary.renderSafetyPassLevel],
  ['normalSelectable', summary.normalSelectable],
  ['reviewOnly', summary.reviewOnly],
  ['blockers', summary.blockers.join(' ')],
  ['waitingReasons', summary.waitingReasons.join(' ')],
  ['warnings', summary.warnings.join(' ')],
]);
await fs.writeFile(markdownPath, [
  '# Daegu P2-A Readiness V3',
  '',
  `- readiness version: \`${READINESS_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- approved rows: ${summary.approvedRows}/${summary.expectedRows}`,
  `- ready for P2 readiness: ${summary.readyForP2Readiness}`,
  `- full P2 template import ready: ${summary.readyForFullP2TemplateImport}`,
  `- production write allowed: \`${summary.productionWriteAllowed}\``,
  `- P1 postwrite status: \`${summary.p1PostwriteStatus || 'missing'}\``,
  `- render safety pass level: \`${summary.renderSafetyPassLevel || 'missing'}\``,
  `- normal selectable: ${summary.normalSelectable}`,
  `- review only: ${summary.reviewOnly}`,
  '',
  '## Safety Contract',
  '',
  ...report.safetyContract.map((line) => `- ${line}`),
  '',
  '## Source Reports',
  '',
  markdownTable(
    ['report', 'path', 'exists'],
    Object.entries(summary.sourceReports).map(([name, sourceReport]) => [
      `\`${name}\``,
      `\`${sourceReport.path}\``,
      String(sourceReport.exists),
    ]),
  ),
  '',
  '## Blockers',
  '',
  summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blockers.',
  '',
  '## Waiting Reasons',
  '',
  summary.waitingReasons.length > 0 ? summary.waitingReasons.map((reason) => `- \`${reason}\``).join('\n') : 'No waiting reasons.',
  '',
  '## Warnings',
  '',
  summary.warnings.length > 0 ? summary.warnings.map((warning) => `- \`${warning}\``).join('\n') : 'No warnings.',
  '',
].join('\n'), 'utf8');

console.log(`p2a_readiness_v3_json:${jsonPath}`);
console.log(`p2a_readiness_v3_csv:${csvPath}`);
console.log(`p2a_readiness_v3_markdown:${markdownPath}`);
console.log(`status:${summary.status} approved=${summary.approvedRows}/${summary.expectedRows} readyForP2Readiness=${summary.readyForP2Readiness} renderSafety=${summary.renderSafetyPassLevel || 'missing'} blockers=${summary.blockers.length} waiting=${summary.waitingReasons.length}`);

if (summary.status === 'blocked') {
  process.exitCode = 1;
}
