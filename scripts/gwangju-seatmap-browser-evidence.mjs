import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const outputRoot = path.join(repoRoot, 'output/playwright/stadium-ux-gwangju-validate');
const outputBase = path.join(reportDir, 'gwangju-seatmap-browser-evidence');
const outputFileNames = {
  json: 'gwangju-seatmap-browser-evidence.json',
  csv: 'gwangju-seatmap-browser-evidence.csv',
  markdown: 'gwangju-seatmap-browser-evidence.md',
};

const SCRIPT_VERSION = 'GWANGJU_BROWSER_EVIDENCE_V1';
const EXPECTED_VIEWBOX = { x: 0, y: 0, width: 2200, height: 1159 };
const EXPECTED_SUFFIXES = ['390x844', '1440x1000'];
const EXPECTED_BROWSER_CROPS = [
  '101-108-h-i-j-browser-coordinate-crop',
  '104-105-i-j-browser-coordinate-crop',
  '121-127-h-i-j-browser-coordinate-crop',
  'op-outfield-browser-coordinate-crop',
  'five-table-browser-coordinate-crop',
  'sky-picnic-browser-coordinate-crop',
];

const SWEEP_FILES = [
  'gwangju-lower-infield-selected-sweep',
  'gwangju-thirdbase-selected-sweep',
];

const SOURCE_POLICY = {
  coordinateSource: 'official PNG 2200x1159 rendered through browser SVG viewBox',
  disallowedSources: [
    'browser CSS pixels as coordinate source',
    'resized screenshots as coordinate source',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
  ],
  missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
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

const rel = (filePath) => path.relative(frontendRoot, filePath);

const readJson = async (filePath) => {
  try {
    return { exists: true, data: JSON.parse(await fs.readFile(filePath, 'utf8')), error: null };
  } catch (error) {
    if (error?.code === 'ENOENT') return { exists: false, data: null, error: `MISSING:${filePath}` };
    return { exists: false, data: null, error: `READ_FAILED:${filePath}:${error.message}` };
  }
};

const exists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const sameViewBox = (actual) => actual
  && actual.x === EXPECTED_VIEWBOX.x
  && actual.y === EXPECTED_VIEWBOX.y
  && actual.width === EXPECTED_VIEWBOX.width
  && actual.height === EXPECTED_VIEWBOX.height;

const sameImageBox = (image) => image
  && image.x === 0
  && image.y === 0
  && image.width === EXPECTED_VIEWBOX.width
  && image.height === EXPECTED_VIEWBOX.height
  && image.preserveAspectRatio === 'none'
  && image.bbox?.x === 0
  && image.bbox?.y === 0
  && image.bbox?.width === EXPECTED_VIEWBOX.width
  && image.bbox?.height === EXPECTED_VIEWBOX.height;

const collectSuffixReport = async (suffix) => {
  const coordinateAuditPath = path.join(outputRoot, `gwangju-browser-coordinate-audit-${suffix}.json`);
  const coordinateAudit = await readJson(coordinateAuditPath);
  const coordinateCrops = coordinateAudit.data?.coordinateCrops ?? [];
  const coordinateCropIds = new Set(coordinateCrops.map((crop) => crop.id));
  const cropRows = [];

  for (const cropId of EXPECTED_BROWSER_CROPS) {
    const coordinateCrop = coordinateCrops.find((crop) => crop.id === cropId);
    const artifactPath = path.join(outputRoot, `gwangju-browser-${cropId}-${coordinateCrops.findIndex((crop) => crop.id === cropId) + 1}-${suffix}.png`);
    const artifactExists = await exists(artifactPath);
    cropRows.push({
      id: cropId,
      suffix,
      status: coordinateCrop && artifactExists ? 'passed' : 'failed',
      officialBounds: coordinateCrop?.officialBounds ?? null,
      clip: coordinateCrop?.clip ?? null,
      artifact: artifactExists ? path.relative(frontendRoot, artifactPath) : null,
      blockers: [
        ...(coordinateCropIds.has(cropId) ? [] : [`MISSING_COORDINATE_CROP:${cropId}`]),
        ...(artifactExists ? [] : [`MISSING_BROWSER_CROP_ARTIFACT:${path.relative(frontendRoot, artifactPath)}`]),
      ],
    });
  }

  const sweepRows = [];
  for (const filePrefix of SWEEP_FILES) {
    const sweepPath = path.join(outputRoot, `${filePrefix}-${suffix}.json`);
    const sweep = await readJson(sweepPath);
    const markdownPath = path.join(outputRoot, `${filePrefix}-${suffix}.md`);
    const markdownExists = await exists(markdownPath);
    sweepRows.push({
      id: filePrefix,
      suffix,
      status: sweep.data?.status === 'passed' && sweep.data?.blockerCount === 0 && markdownExists ? 'passed' : 'failed',
      targetCount: sweep.data?.targetCount ?? null,
      blockerCount: sweep.data?.blockerCount ?? null,
      artifact: markdownExists ? path.relative(frontendRoot, markdownPath) : null,
      blockers: [
        ...(sweep.exists ? [] : [`MISSING_SELECTED_SWEEP_JSON:${path.relative(frontendRoot, sweepPath)}`]),
        ...(sweep.data?.status === 'passed' ? [] : [`SELECTED_SWEEP_NOT_PASSED:${sweep.data?.status ?? 'missing'}`]),
        ...(sweep.data?.blockerCount === 0 ? [] : [`SELECTED_SWEEP_BLOCKERS:${sweep.data?.blockerCount ?? 'missing'}`]),
        ...(markdownExists ? [] : [`MISSING_SELECTED_SWEEP_MARKDOWN:${path.relative(frontendRoot, markdownPath)}`]),
      ],
    });
  }

  const basicArtifacts = [
    `gwangju-trace-review-full-${suffix}.png`,
    `gwangju-trace-review-seatmap-${suffix}.png`,
    `gwangju-trace-review-seatmap-crop-${suffix}.png`,
  ];
  const basicArtifactRows = [];
  for (const fileName of basicArtifacts) {
    const artifactPath = path.join(outputRoot, fileName);
    const artifactExists = await exists(artifactPath);
    basicArtifactRows.push({
      fileName,
      suffix,
      status: artifactExists ? 'passed' : 'failed',
      artifact: artifactExists ? path.relative(frontendRoot, artifactPath) : null,
      blockers: artifactExists ? [] : [`MISSING_BROWSER_ARTIFACT:${path.relative(frontendRoot, artifactPath)}`],
    });
  }

  const blockers = [
    ...(coordinateAudit.exists ? [] : [`MISSING_COORDINATE_AUDIT:${path.relative(frontendRoot, coordinateAuditPath)}`]),
    ...(coordinateAudit.data?.status === 'passed' ? [] : [`COORDINATE_AUDIT_NOT_PASSED:${coordinateAudit.data?.status ?? 'missing'}`]),
    ...(sameViewBox(coordinateAudit.data?.svgViewBox) ? [] : [`VIEWBOX_MISMATCH:${JSON.stringify(coordinateAudit.data?.svgViewBox ?? null)}`]),
    ...(sameImageBox(coordinateAudit.data?.image) ? [] : [`IMAGE_BOX_MISMATCH:${JSON.stringify(coordinateAudit.data?.image ?? null)}`]),
    ...cropRows.flatMap((row) => row.blockers),
    ...sweepRows.flatMap((row) => row.blockers),
    ...basicArtifactRows.flatMap((row) => row.blockers),
  ];

  return {
    suffix,
    status: blockers.length === 0 ? 'passed' : 'failed',
    viewport: coordinateAudit.data?.viewport ?? null,
    viewBoxStatus: sameViewBox(coordinateAudit.data?.svgViewBox) ? 'passed' : 'failed',
    imageBoxStatus: sameImageBox(coordinateAudit.data?.image) ? 'passed' : 'failed',
    svgViewBox: coordinateAudit.data?.svgViewBox ?? null,
    image: coordinateAudit.data?.image ?? null,
    cropRows,
    sweepRows,
    basicArtifactRows,
    blockers,
  };
};

const traceReview = await readJson(path.join(reportDir, 'gwangju-seatmap-trace-review.json'));
const runtimeLayer = await readJson(path.join(reportDir, 'gwangju-seatmap-runtime-layer-audit.json'));
const evidenceInventory = await readJson(path.join(reportDir, 'gwangju-seatmap-evidence-inventory.json'));
const browserSummary = await readJson(path.join(outputRoot, 'stadium-mobile-smoke-summary.json'));

const suffixReports = [];
for (const suffix of EXPECTED_SUFFIXES) {
  suffixReports.push(await collectSuffixReport(suffix));
}

const blockers = [
  ...(traceReview.data?.summary?.traceStatus === 'READY' ? [] : [`TRACE_REVIEW_NOT_READY:${traceReview.data?.summary?.traceStatus ?? 'missing'}`]),
  ...(runtimeLayer.data?.status === 'passed' ? [] : [`RUNTIME_LAYER_NOT_PASSED:${runtimeLayer.data?.status ?? 'missing'}`]),
  ...(evidenceInventory.data?.status === 'passed' ? [] : [`EVIDENCE_INVENTORY_NOT_PASSED:${evidenceInventory.data?.status ?? 'missing'}`]),
  ...(browserSummary.data?.status === 'passed' ? [] : [`BROWSER_SUMMARY_NOT_PASSED:${browserSummary.data?.status ?? 'missing'}`]),
  ...suffixReports.flatMap((suffixReport) => suffixReport.blockers.map((blocker) => `${suffixReport.suffix}:${blocker}`)),
];

const report = {
  generatedAt: new Date().toISOString(),
  version: SCRIPT_VERSION,
  status: blockers.length === 0 ? 'passed' : 'failed',
  sourcePolicy: SOURCE_POLICY,
  upstream: {
    traceReview: rel(path.join(reportDir, 'gwangju-seatmap-trace-review.json')),
    traceReviewStatus: traceReview.data?.summary?.traceStatus ?? null,
    runtimeLayer: rel(path.join(reportDir, 'gwangju-seatmap-runtime-layer-audit.json')),
    runtimeLayerStatus: runtimeLayer.data?.status ?? null,
    evidenceInventory: rel(path.join(reportDir, 'gwangju-seatmap-evidence-inventory.json')),
    evidenceInventoryStatus: evidenceInventory.data?.status ?? null,
    browserSummary: path.relative(frontendRoot, path.join(outputRoot, 'stadium-mobile-smoke-summary.json')),
    browserSummaryStatus: browserSummary.data?.status ?? null,
  },
  summary: {
    expectedViewBox: EXPECTED_VIEWBOX,
    suffixes: EXPECTED_SUFFIXES,
    statusBySuffix: suffixReports.map((suffixReport) => ({
      suffix: suffixReport.suffix,
      status: suffixReport.status,
      viewBoxStatus: suffixReport.viewBoxStatus,
      imageBoxStatus: suffixReport.imageBoxStatus,
      cropCount: suffixReport.cropRows.length,
      selectedSweepCount: suffixReport.sweepRows.length,
    })),
    blockers,
  },
  suffixReports,
};

await fs.writeFile(`${outputBase}.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const flatRows = suffixReports.flatMap((suffixReport) => [
  {
    type: 'coordinate-system',
    suffix: suffixReport.suffix,
    id: 'svg-viewBox',
    status: suffixReport.viewBoxStatus,
    detail: JSON.stringify(suffixReport.svgViewBox),
    artifact: '',
    blockers: suffixReport.blockers.filter((blocker) => blocker.includes('VIEWBOX')),
  },
  {
    type: 'coordinate-system',
    suffix: suffixReport.suffix,
    id: 'official-image-box',
    status: suffixReport.imageBoxStatus,
    detail: JSON.stringify(suffixReport.image),
    artifact: '',
    blockers: suffixReport.blockers.filter((blocker) => blocker.includes('IMAGE_BOX')),
  },
  ...suffixReport.cropRows.map((row) => ({
    type: 'browser-crop',
    suffix: row.suffix,
    id: row.id,
    status: row.status,
    detail: JSON.stringify(row.officialBounds),
    artifact: row.artifact ?? '',
    blockers: row.blockers,
  })),
  ...suffixReport.sweepRows.map((row) => ({
    type: 'selected-sweep',
    suffix: row.suffix,
    id: row.id,
    status: row.status,
    detail: `targets=${row.targetCount}; blockers=${row.blockerCount}`,
    artifact: row.artifact ?? '',
    blockers: row.blockers,
  })),
  ...suffixReport.basicArtifactRows.map((row) => ({
    type: 'browser-artifact',
    suffix: row.suffix,
    id: row.fileName,
    status: row.status,
    detail: '',
    artifact: row.artifact ?? '',
    blockers: row.blockers,
  })),
]);

const csvRows = [
  ['type', 'suffix', 'id', 'status', 'detail', 'artifact', 'blockers'],
  ...flatRows.map((row) => [
    row.type,
    row.suffix,
    row.id,
    row.status,
    row.detail,
    row.artifact,
    row.blockers.join(';'),
  ]),
];
await fs.writeFile(`${outputBase}.csv`, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');

const markdown = [
  '# Gwangju Seatmap Browser Evidence',
  '',
  `- generatedAt: \`${report.generatedAt}\``,
  `- status: \`${report.status}\``,
  `- traceReview: \`${report.upstream.traceReviewStatus}\``,
  `- runtimeLayer: \`${report.upstream.runtimeLayerStatus}\``,
  `- evidenceInventory: \`${report.upstream.evidenceInventoryStatus}\``,
  `- browserSummary: \`${report.upstream.browserSummaryStatus}\``,
  `- coordinate source: \`${SOURCE_POLICY.coordinateSource}\``,
  '',
  '## Viewport Summary',
  '',
  markdownTable(
    ['Viewport', 'Status', 'ViewBox', 'Image Box', 'Crops', 'Selected Sweeps', 'Blockers'],
    suffixReports.map((suffixReport) => [
      suffixReport.suffix,
      suffixReport.status,
      suffixReport.viewBoxStatus,
      suffixReport.imageBoxStatus,
      suffixReport.cropRows.length,
      suffixReport.sweepRows.length,
      suffixReport.blockers.length ? suffixReport.blockers.join('<br>') : '-',
    ]),
  ),
  '',
  '## Browser Crops',
  '',
  markdownTable(
    ['Viewport', 'Crop', 'Status', 'Official Bounds', 'Artifact', 'Blockers'],
    suffixReports.flatMap((suffixReport) => suffixReport.cropRows.map((row) => [
      row.suffix,
      row.id,
      row.status,
      JSON.stringify(row.officialBounds),
      row.artifact ? `\`${row.artifact}\`` : '-',
      row.blockers.length ? row.blockers.join('<br>') : '-',
    ])),
  ),
  '',
  '## Selected Sweeps',
  '',
  markdownTable(
    ['Viewport', 'Sweep', 'Status', 'Targets', 'Blockers', 'Artifact'],
    suffixReports.flatMap((suffixReport) => suffixReport.sweepRows.map((row) => [
      row.suffix,
      row.id,
      row.status,
      row.targetCount,
      row.blockerCount,
      row.artifact ? `\`${row.artifact}\`` : '-',
    ])),
  ),
  '',
  '## Source Policy',
  '',
  `- disallowed sources: \`${SOURCE_POLICY.disallowedSources.join(', ')}\``,
  `- missing baseball data contract: \`${SOURCE_POLICY.missingBaseballDataContract}\``,
  '',
].join('\n');

await fs.writeFile(`${outputBase}.md`, markdown, 'utf8');

console.log(`browser_evidence_json:${outputBase}.json`);
console.log(`browser_evidence_csv:${outputBase}.csv`);
console.log(`browser_evidence_markdown:${outputBase}.md`);
console.log(`status:${report.status}`);
