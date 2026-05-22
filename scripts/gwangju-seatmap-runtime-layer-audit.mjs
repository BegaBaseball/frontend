import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GWANGJU_BLOCKS,
  GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
  GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
  GWANGJU_FULL_RETRACE_VERSION,
  GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
  GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
  GWANGJU_PENDING_OPERATOR_SECTIONS,
} from '../src/data/gwangjuSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const browserQaSummaryPath = path.join(repoRoot, 'output/playwright/stadium-ux-gwangju-validate/stadium-mobile-smoke-summary.json');
const traceManifestPath = path.join(reportDir, 'gwangju-seatmap-trace-review.json');
const componentPath = path.join(frontendRoot, 'src/components/gwangju/GwangjuSeatMapSvg.tsx');
const shellComponentPath = path.join(frontendRoot, 'src/components/gwangju/GwangjuSeatMap.tsx');
const packagePath = path.join(frontendRoot, 'package.json');
const outputPaths = {
  json: path.join(reportDir, 'gwangju-seatmap-runtime-layer-audit.json'),
  csv: path.join(reportDir, 'gwangju-seatmap-runtime-layer-audit.csv'),
  markdown: path.join(reportDir, 'gwangju-seatmap-runtime-layer-audit.md'),
};

const AUDIT_VERSION = 'GWANGJU_RUNTIME_LAYER_AUDIT_V1';
const RUNTIME_SOURCE = 'GWANGJU_BLOCKS[].imageGeometry.d';
const EXPECTED_ACTIVE_BLOCK_COUNT = 111;
const FORBIDDEN_RUNTIME_SOURCES = [
  'GWANGJU_IMAGE_GEOMETRY_DRAFTS',
  'GWANGJU_OFFICIAL_TRACE_REFERENCE',
  'GWANGJU_OPERATOR_SECTION_REQUIREMENTS',
  'gwangju-seatmap-operator-template',
  'home-k7-seats',
  'away-cheering-seats',
];

const sourcePolicy = {
  allowedCoordinateSource: 'official PNG 2200x1159 trace manifest rendered through GWANGJU_BLOCKS[].imageGeometry.d',
  missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  disallowedSources: [
    'browser CSS pixels',
    'resized screenshots',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
  ],
};

const readText = async (filePath) => {
  try {
    return {
      exists: true,
      text: await fs.readFile(filePath, 'utf8'),
      error: null,
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { exists: false, text: '', error: `MISSING_FILE:${path.relative(frontendRoot, filePath)}` };
    }
    return { exists: false, text: '', error: `READ_FAILED:${path.relative(frontendRoot, filePath)}:${error.message}` };
  }
};

const readJson = async (filePath) => {
  const result = await readText(filePath);
  if (!result.exists) return { exists: false, data: null, error: result.error };
  try {
    return { exists: true, data: JSON.parse(result.text), error: null };
  } catch (error) {
    return { exists: true, data: null, error: `JSON_PARSE_FAILED:${path.relative(frontendRoot, filePath)}:${error.message}` };
  }
};

const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const statusFor = (ok) => (ok ? 'passed' : 'failed');

const traceManifest = await readJson(traceManifestPath);
const browserSummary = await readJson(browserQaSummaryPath);
const componentSource = await readText(componentPath);
const shellSource = await readText(shellComponentPath);
const packageSource = await readText(packagePath);

const manifestBlocks = traceManifest.data?.blocks ?? [];
const manifestBlocksById = new Map(manifestBlocks.map((block) => [block.id, block]));
const activeBlockIds = GWANGJU_BLOCKS.map((block) => block.id).sort();
const manifestBlockIds = manifestBlocks.map((block) => block.id).sort();
const pendingOperatorIds = new Set(GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map((section) => section.id));
const runtimeChecks = (browserSummary.data?.scenarios ?? [])
  .flatMap((scenario) => (scenario.qaChecks ?? []).map((check) => ({
    scenario: scenario.label,
    ...check,
  })))
  .filter((check) => check.type === 'gwangju-runtime-layer');
const latestRuntimeCheck = runtimeChecks.at(-1) ?? null;
const latestRuntimeDetails = latestRuntimeCheck?.details ?? {};

const sourceChecks = [
  {
    id: 'component-renders-active-blocks',
    status: statusFor(componentSource.text.includes('GWANGJU_BLOCKS.map')),
    detail: 'GwangjuSeatMapSvg maps GWANGJU_BLOCKS for seat paths.',
  },
  {
    id: 'component-uses-release-ready-path',
    status: statusFor(componentSource.text.includes('d={block.imageGeometry.d}')),
    detail: 'Seat path d attribute uses block.imageGeometry.d.',
  },
  {
    id: 'component-keeps-marker-layer-separate',
    status: statusFor(componentSource.text.includes('GWANGJU_NON_SELECTABLE_MARKER_ZONES.map') && componentSource.text.includes('<circle')),
    detail: 'Marker-only zones are rendered as circle markers, not seat path blocks.',
  },
  {
    id: 'shell-derived-range-only',
    status: statusFor(shellSource.text.includes('GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES') && shellSource.text.includes('data-aggregate-hit-area')),
    detail: 'K7/AWAY derived ranges are exposed as filter/detail metadata only.',
  },
  {
    id: 'package-runtime-layer-script',
    status: statusFor(packageSource.text.includes('"qa:stadium:gwangju:runtime-layer"') && packageSource.text.includes('gwangju-seatmap-runtime-layer-audit.mjs')),
    detail: 'package.json exposes the runtime layer audit command.',
  },
  ...FORBIDDEN_RUNTIME_SOURCES.map((source) => ({
    id: `component-forbidden-source-${source}`,
    status: statusFor(!componentSource.text.includes(source)),
    detail: `GwangjuSeatMapSvg must not render ${source}.`,
  })),
];

const manifestChecks = [
  {
    id: 'trace-manifest-present',
    status: statusFor(traceManifest.exists && !traceManifest.error),
    detail: traceManifest.error ?? traceManifestPath,
  },
  {
    id: 'trace-manifest-active-count',
    status: statusFor(manifestBlocks.length === EXPECTED_ACTIVE_BLOCK_COUNT),
    detail: `manifestBlocks=${manifestBlocks.length}`,
  },
  {
    id: 'trace-manifest-matches-data-blocks',
    status: statusFor(JSON.stringify(activeBlockIds) === JSON.stringify(manifestBlockIds)),
    detail: `dataBlocks=${activeBlockIds.length}, manifestBlocks=${manifestBlockIds.length}`,
  },
  {
    id: 'trace-manifest-release-ready',
    status: statusFor(manifestBlocks.every((block) => (
      block.traceVersion === GWANGJU_FULL_RETRACE_VERSION
      && block.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      && block.pixelAlignmentStatus === 'PIXEL_ALIGNED'
      && block.manualReviewed === true
    ))),
    detail: `traceVersion=${GWANGJU_FULL_RETRACE_VERSION}`,
  },
  {
    id: 'derived-range-no-aggregate-hit-area',
    status: statusFor(
      GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE === true
      && GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.every((range) => range.aggregateHitArea === 'REUSES_EXISTING_TRACE_ONLY')
      && GWANGJU_OPERATOR_SECTION_REQUIREMENTS.every((section) => section.status === 'PENDING_OPERATOR_INPUT')
    ),
    detail: `derivedRanges=${GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.length}, pendingOperatorSections=${GWANGJU_PENDING_OPERATOR_SECTIONS.length}`,
  },
  {
    id: 'operator-aggregate-not-in-manifest',
    status: statusFor(manifestBlocks.every((block) => !pendingOperatorIds.has(block.id))),
    detail: `pendingOperatorIds=${[...pendingOperatorIds].join(',')}`,
  },
];

const browserChecks = [
  {
    id: 'browser-summary-present',
    status: statusFor(browserSummary.exists && !browserSummary.error),
    detail: browserSummary.error ?? browserQaSummaryPath,
  },
  {
    id: 'browser-summary-passed',
    status: statusFor(browserSummary.data?.status === 'passed'),
    detail: `status=${browserSummary.data?.status ?? 'missing'}`,
  },
  {
    id: 'runtime-layer-check-present',
    status: statusFor(Boolean(latestRuntimeCheck)),
    detail: `checks=${runtimeChecks.length}`,
  },
  {
    id: 'runtime-layer-check-passed',
    status: statusFor(latestRuntimeCheck?.status === 'passed'),
    detail: `status=${latestRuntimeCheck?.status ?? 'missing'}`,
  },
  {
    id: 'runtime-rendered-paths-match-manifest',
    status: statusFor((latestRuntimeDetails.pathMismatchCount ?? 0) === 0),
    detail: `pathMismatchCount=${latestRuntimeDetails.pathMismatchCount ?? 'missing'}`,
  },
  {
    id: 'runtime-rendered-count',
    status: statusFor(latestRuntimeDetails.renderedPathCount === GWANGJU_EXPECTED_TRACE_BLOCK_COUNT),
    detail: `renderedPathCount=${latestRuntimeDetails.renderedPathCount ?? 'missing'}, expected=${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT}`,
  },
  {
    id: 'runtime-forbidden-paths-absent',
    status: statusFor((latestRuntimeDetails.forbiddenRenderedIds ?? []).length === 0),
    detail: `forbiddenRenderedIds=${(latestRuntimeDetails.forbiddenRenderedIds ?? []).join(',') || '-'}`,
  },
  {
    id: 'runtime-label-top-hit',
    status: statusFor((latestRuntimeDetails.labelTopHitFailureCount ?? 0) === 0),
    detail: `labelTopHitFailureCount=${latestRuntimeDetails.labelTopHitFailureCount ?? 'missing'}`,
  },
];

const rows = [
  ...manifestChecks.map((check) => ({ group: 'manifest', ...check })),
  ...sourceChecks.map((check) => ({ group: 'source', ...check })),
  ...browserChecks.map((check) => ({ group: 'browser', ...check })),
];

const blockers = rows
  .filter((row) => row.status !== 'passed')
  .map((row) => `${row.group}:${row.id}:${row.detail}`);

const report = {
  generatedAt: new Date().toISOString(),
  version: AUDIT_VERSION,
  status: blockers.length === 0 ? 'passed' : 'failed',
  runtimeSeatLayerSource: RUNTIME_SOURCE,
  sourcePolicy,
  summary: {
    expectedActiveBlocks: EXPECTED_ACTIVE_BLOCK_COUNT,
    expectedTraceBlockCount: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
    manifestBlockCount: manifestBlocks.length,
    dataBlockCount: GWANGJU_BLOCKS.length,
    runtimeCheckCount: runtimeChecks.length,
    renderedPathCount: latestRuntimeDetails.renderedPathCount ?? null,
    pathMismatchCount: latestRuntimeDetails.pathMismatchCount ?? null,
    forbiddenRenderedIdCount: latestRuntimeDetails.forbiddenRenderedIds?.length ?? null,
    labelTopHitFailureCount: latestRuntimeDetails.labelTopHitFailureCount ?? null,
    blockerCount: blockers.length,
  },
  inputs: {
    traceManifest: path.relative(frontendRoot, traceManifestPath),
    browserQaSummary: path.relative(frontendRoot, browserQaSummaryPath),
    component: path.relative(frontendRoot, componentPath),
    shellComponent: path.relative(frontendRoot, shellComponentPath),
    packageJson: path.relative(frontendRoot, packagePath),
  },
  runtimeCheck: latestRuntimeCheck,
  checks: rows,
  blockers,
};

const csvRows = [
  ['group', 'id', 'status', 'detail'],
  ...rows.map((row) => [row.group, row.id, row.status, row.detail]),
];
const markdown = [
  '# 광주 좌석도 runtime layer audit',
  '',
  `- generatedAt: \`${report.generatedAt}\``,
  `- version: \`${AUDIT_VERSION}\``,
  `- status: \`${report.status}\``,
  `- runtime seat layer source: \`${RUNTIME_SOURCE}\``,
  `- manifest blocks: ${report.summary.manifestBlockCount}`,
  `- rendered path count: ${report.summary.renderedPathCount ?? '-'}`,
  `- path mismatches: ${report.summary.pathMismatchCount ?? '-'}`,
  `- forbidden rendered ids: ${report.summary.forbiddenRenderedIdCount ?? '-'}`,
  `- label top-hit failures: ${report.summary.labelTopHitFailureCount ?? '-'}`,
  `- blockers: ${blockers.length}`,
  '',
  '## Source Policy',
  '',
  `- allowed coordinate source: \`${sourcePolicy.allowedCoordinateSource}\``,
  `- missing baseball data contract: \`${sourcePolicy.missingBaseballDataContract}\``,
  `- disallowed sources: ${sourcePolicy.disallowedSources.map((source) => `\`${source}\``).join(', ')}`,
  '',
  '## Checks',
  '',
  markdownTable(
    ['group', 'id', 'status', 'detail'],
    rows.map((row) => [row.group, `\`${row.id}\``, `\`${row.status}\``, row.detail]),
  ),
  '',
  '## Blockers',
  '',
  blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : '- none',
  '',
].join('\n');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(outputPaths.csv, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');
await fs.writeFile(outputPaths.markdown, markdown, 'utf8');

console.log(`[gwangju-runtime-layer] status=${report.status} rendered=${report.summary.renderedPathCount ?? '-'} pathMismatches=${report.summary.pathMismatchCount ?? '-'} forbidden=${report.summary.forbiddenRenderedIdCount ?? '-'} blockers=${blockers.length}`);
console.log(`[gwangju-runtime-layer] report=${outputPaths.json}`);

if (blockers.length > 0) {
  process.exit(1);
}
