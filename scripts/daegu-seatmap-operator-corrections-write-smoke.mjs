import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_BLOCKS,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const WRITE_SMOKE_VERSION = 'DAEGU_OPERATOR_CORRECTIONS_WRITE_SMOKE_V1';
const SMOKE_REVIEWER = 'DAEGU_OPERATOR_WRITE_SMOKE';
const SMOKE_REVIEWED_AT = '2026-05-05T00:00:00.000Z';

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

const sha256 = (content) => crypto
  .createHash('sha256')
  .update(content)
  .digest('hex');

const sha256File = async (filePath) => sha256(await fs.readFile(filePath));

const pathPoints = (pathData) => {
  const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
};

const geometryPaths = (block) => (
  block.imageGeometry.paths?.length ? block.imageGeometry.paths : [block.imageGeometry.d]
);

const polygonArea = (points) => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + (point[0] * next[1]) - (next[0] * point[1]);
}, 0) / 2);

const blockArea = (block) => geometryPaths(block)
  .map(pathPoints)
  .reduce((total, points) => total + polygonArea(points), 0);

const distanceToSegment = (point, start, end) => {
  const segmentX = end[0] - start[0];
  const segmentY = end[1] - start[1];
  const lengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
  if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);

  const ratio = Math.max(0, Math.min(1, (
    ((point[0] - start[0]) * segmentX) + ((point[1] - start[1]) * segmentY)
  ) / lengthSquared));
  return Math.hypot(
    point[0] - (start[0] + (ratio * segmentX)),
    point[1] - (start[1] + (ratio * segmentY)),
  );
};

const pointOnPolygonBoundary = (point, polygon, tolerance = 0.75) => {
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (distanceToSegment(point, start, end) <= tolerance) return true;
  }
  return false;
};

const pointInPolygon = (point, polygon) => {
  if (polygon.length < 3) return false;
  if (pointOnPolygonBoundary(point, polygon)) return true;

  const [x, y] = point;
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const [xi, yi] = polygon[current];
    const [xj, yj] = polygon[previous];
    const intersects = ((yi > y) !== (yj > y))
      && (x < (((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON)) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
};

const pointInAnyPath = (point, block) => geometryPaths(block)
  .map(pathPoints)
  .some((points) => pointInPolygon(point, points));

const renderBlocks = [...DAEGU_BLOCKS].sort((a, b) => blockArea(b) - blockArea(a));

const topHitBlockAt = (point) => {
  let topBlock = null;
  renderBlocks.forEach((block) => {
    if (pointInAnyPath(point, block)) {
      topBlock = block;
    }
  });
  return topBlock;
};

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

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const smokeDir = path.join(reportDir, 'daegu-seatmap-operator-corrections-write-smoke');
const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');
const sourceDataFile = path.join(frontendRoot, 'src/data/daeguSeatData.ts');
const temporaryDataFile = path.join(smokeDir, 'daeguSeatData.write-smoke.ts');
const smokeInputPath = path.join(smokeDir, 'daegu-seatmap-operator-corrections-write-smoke-input.json');
const smokeValidationPath = path.join(smokeDir, 'daegu-seatmap-operator-corrections-validation.json');

const handoff = await readJson(handoffPath);
const handoffByBlockId = new Map(handoff.workItems.map((row) => [row.id, row]));
const eligibleBlocks = DAEGU_BLOCKS.filter((block) => {
  if (!handoffByBlockId.has(block.id)) return false;
  if (block.traceStatus === 'OFFICIAL_IMAGE_TRACED') return false;
  if (block.imageGeometry.paths?.length) return false;

  const labelPoint = [block.imageGeometry.labelX, block.imageGeometry.labelY];
  return pointInAnyPath(labelPoint, block) && topHitBlockAt(labelPoint)?.id === block.id;
});

const smokeBlock = eligibleBlocks[0];
if (!smokeBlock) {
  throw new Error('NO_SYNTHETIC_WRITE_SMOKE_BLOCK: no handoff block has a self-hit current label suitable for temporary write smoke');
}

const handoffRow = handoffByBlockId.get(smokeBlock.id);
const syntheticSmokeCorrection = {
  blockId: smokeBlock.id,
  block: smokeBlock.block,
  name: smokeBlock.name,
  category: smokeBlock.category,
  queuePriority: handoffRow.queuePriority,
  alignmentClass: handoffRow.alignmentClass,
  candidateStatus: handoffRow.candidateStatus,
  candidateDuplicateGroup: handoffRow.candidateDuplicateGroup,
  recommendedAction: handoffRow.recommendedAction,
  evidenceCrop: '',
  operatorDecision: 'APPROVED',
  correctedPath: smokeBlock.imageGeometry.d,
  correctedLabelX: smokeBlock.imageGeometry.labelX,
  correctedLabelY: smokeBlock.imageGeometry.labelY,
  reviewer: SMOKE_REVIEWER,
  reviewedAt: SMOKE_REVIEWED_AT,
  operatorNote: 'Synthetic smoke input uses current repo geometry only to exercise the temp-file write path. Do not copy this to production corrections.',
};

await fs.mkdir(smokeDir, { recursive: true });
await fs.writeFile(
  path.join(smokeDir, 'daegu-seatmap-operator-handoff.json'),
  `${JSON.stringify(handoff, null, 2)}\n`,
  'utf8',
);
await fs.writeFile(
  smokeInputPath,
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    smokeVersion: WRITE_SMOKE_VERSION,
    nonProductionSyntheticInput: true,
    corrections: [syntheticSmokeCorrection],
  }, null, 2)}\n`,
  'utf8',
);

const sourceDataShaBefore = await sha256File(sourceDataFile);
await fs.copyFile(sourceDataFile, temporaryDataFile);
const temporaryDataShaBefore = await sha256File(temporaryDataFile);

const commandResults = [];
commandResults.push(runNodeScript('scripts/daegu-seatmap-operator-corrections-validate.mjs', [
  '--report-dir',
  smokeDir,
  '--input',
  smokeInputPath,
]));
assertCommandOk(commandResults.at(-1));
commandResults.push(runNodeScript('scripts/daegu-seatmap-operator-corrections-preview.mjs', [
  '--report-dir',
  smokeDir,
  '--input',
  smokeInputPath,
  '--validation',
  smokeValidationPath,
]));
assertCommandOk(commandResults.at(-1));
commandResults.push(runNodeScript('scripts/daegu-seatmap-operator-corrections-apply.mjs', [
  '--report-dir',
  smokeDir,
  '--input',
  smokeInputPath,
  '--validation',
  smokeValidationPath,
  '--data-file',
  temporaryDataFile,
  '--write',
]));
assertCommandOk(commandResults.at(-1));

const sourceDataShaAfter = await sha256File(sourceDataFile);
const temporaryDataShaAfter = await sha256File(temporaryDataFile);
const smokeValidation = await readJson(smokeValidationPath);
const smokeApply = await readJson(path.join(smokeDir, 'daegu-seatmap-operator-corrections-apply.json'));

const productionDataUnchanged = sourceDataShaBefore === sourceDataShaAfter;
const temporaryDataChanged = temporaryDataShaBefore !== temporaryDataShaAfter;
const validationAcceptedSyntheticRow = smokeValidation.summary?.validApprovedRows === 1
  && smokeValidation.summary?.invalidApprovedRows === 0;
const applyWroteTempFile = smokeApply.summary?.mode === 'write'
  && smokeApply.summary?.plannedRows === 1
  && smokeApply.summary?.dataFileChanged === true;

const blockers = [];
if (!productionDataUnchanged) blockers.push('PRODUCTION_DAEGU_DATA_CHANGED');
if (!temporaryDataChanged) blockers.push('TEMPORARY_DATA_FILE_NOT_CHANGED');
if (!validationAcceptedSyntheticRow) blockers.push('SYNTHETIC_ROW_NOT_VALIDATED');
if (!applyWroteTempFile) blockers.push('APPLY_DID_NOT_WRITE_TEMP_FILE');

const status = blockers.length === 0 ? 'ok' : 'failed';
const summary = {
  writeSmokeVersion: WRITE_SMOKE_VERSION,
  status,
  selectedBlockId: smokeBlock.id,
  selectedBlock: smokeBlock.block,
  smokeDir: path.relative(frontendRoot, smokeDir),
  syntheticInput: path.relative(frontendRoot, smokeInputPath),
  temporaryDataFile: path.relative(frontendRoot, temporaryDataFile),
  validationReport: path.relative(frontendRoot, smokeValidationPath),
  previewReport: path.relative(frontendRoot, path.join(smokeDir, 'daegu-seatmap-operator-corrections-preview.md')),
  applyReport: path.relative(frontendRoot, path.join(smokeDir, 'daegu-seatmap-operator-corrections-apply.md')),
  productionDataUnchanged,
  temporaryDataChanged,
  validationAcceptedSyntheticRow,
  applyWroteTempFile,
  sourceDataShaBefore,
  sourceDataShaAfter,
  temporaryDataShaBefore,
  temporaryDataShaAfter,
  blockers,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  nonProductionWarning: 'This smoke test creates a synthetic approved correction from existing repo geometry and writes only a temporary copy of daeguSeatData.ts.',
  syntheticSmokeCorrection: {
    blockId: syntheticSmokeCorrection.blockId,
    block: syntheticSmokeCorrection.block,
    name: syntheticSmokeCorrection.name,
    reviewer: syntheticSmokeCorrection.reviewer,
    reviewedAt: syntheticSmokeCorrection.reviewedAt,
  },
  commandResults,
};

const jsonPath = path.join(smokeDir, 'daegu-seatmap-operator-corrections-write-smoke.json');
const csvPath = path.join(smokeDir, 'daegu-seatmap-operator-corrections-write-smoke.csv');
const markdownPath = path.join(smokeDir, 'daegu-seatmap-operator-corrections-write-smoke.md');

await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeCsv(csvPath, [
  [
    'status',
    'selectedBlockId',
    'selectedBlock',
    'productionDataUnchanged',
    'temporaryDataChanged',
    'validationAcceptedSyntheticRow',
    'applyWroteTempFile',
    'blockers',
  ],
  [
    summary.status,
    summary.selectedBlockId,
    summary.selectedBlock,
    summary.productionDataUnchanged,
    summary.temporaryDataChanged,
    summary.validationAcceptedSyntheticRow,
    summary.applyWroteTempFile,
    summary.blockers.join(' '),
  ],
]);
await fs.writeFile(markdownPath, [
  '# 대구 좌석도 operator corrections write smoke',
  '',
  `- write smoke version: \`${WRITE_SMOKE_VERSION}\``,
  `- status: \`${summary.status}\``,
  `- selected block: \`${summary.selectedBlock}\``,
  `- synthetic input: \`${summary.syntheticInput}\``,
  `- temporary data file: \`${summary.temporaryDataFile}\``,
  `- validation report: \`${summary.validationReport}\``,
  `- preview report: \`${summary.previewReport}\``,
  `- apply report: \`${summary.applyReport}\``,
  `- production data unchanged: ${summary.productionDataUnchanged}`,
  `- temporary data changed: ${summary.temporaryDataChanged}`,
  `- validation accepted synthetic row: ${summary.validationAcceptedSyntheticRow}`,
  `- apply wrote temp file: ${summary.applyWroteTempFile}`,
  '',
  '## Safety Contract',
  '',
  '1. 이 smoke는 synthetic approved correction을 생성하지만 production operator correction으로 사용하지 않습니다.',
  '2. `--data-file`은 임시 복사본을 가리키며 원본 `src/data/daeguSeatData.ts`를 수정하지 않습니다.',
  '3. 원본 데이터 파일 해시가 바뀌면 `PRODUCTION_DAEGU_DATA_CHANGED`로 실패합니다.',
  '4. 실제 운영 반영은 운영자 제공 corrected path와 `npm run stadium:daegu:operator-corrections-write`만 사용합니다.',
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
console.log(`status:${summary.status} selected=${summary.selectedBlock} productionDataUnchanged=${summary.productionDataUnchanged} temporaryDataChanged=${summary.temporaryDataChanged}`);

if (status !== 'ok') {
  process.exitCode = 1;
}
