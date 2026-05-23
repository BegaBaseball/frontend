import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runBrowserEvidence = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');

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
};

const runEvidenceInventory = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const imageAuditPath = path.join(reportDir, 'gwangju-seatmap-image-alignment-audit.json');
  const traceReviewPath = path.join(reportDir, 'gwangju-seatmap-trace-review.json');
  const outputBase = path.join(reportDir, 'gwangju-seatmap-evidence-inventory');
  
  const INVENTORY_VERSION = 'GWANGJU_EVIDENCE_INVENTORY_V1';
  
  const ZONES = [
    {
      id: 'lower-infield-101-108-hij',
      label: 'Lower infield 101-108 and first-base H/I/J',
      statusNote: 'P0 screenshot regression area; official PNG mask and H/I/J split evidence are required.',
      blockIds: [
        'k5-101',
        'k5-102',
        'k5-103',
        'k5-104',
        'k5-105',
        'k5-106',
        'k7-107',
        'k7-108',
        'first-family-seats',
        'first-wheelchair-seats',
        'party-seats-first',
      ],
      artifacts: [
        'reports/stadium/gwangju-seatmap-image-alignment-audit-crops/gwangju-seatmap-image-alignment-audit-101-108-h-i-j-e-f-visual-review.png',
        'reports/stadium/gwangju-seatmap-image-alignment-audit-crops/gwangju-seatmap-image-alignment-audit-104-105-i-j-boundary.png',
        'reports/stadium/gwangju-seatmap-image-alignment-audit-crops/lower-infield-special-split/gwangju-seatmap-lower-infield-special-split-all-overlay.png',
        'reports/stadium/gwangju-101-108-trace/current-h-i-j-overlay-v44-x880-y780-4x.png',
      ],
    },
    {
      id: 'middle-lower-infield-109-120',
      label: 'Middle lower infield 109-120',
      statusNote: 'Official PNG image check for 109-113 and 116-120 boundaries.',
      blockIds: [
        'k7-109',
        'k7-110',
        'k7-111',
        'k9-112',
        'k9-113',
        'k9-116',
        'k9-117',
        'k7-118',
        'k7-119',
        'k7-120',
      ],
      artifacts: [
        'reports/stadium/gwangju-109-120-trace/current-109-113-overlay-v50-x475-y770-10x.png',
        'reports/stadium/gwangju-109-120-trace/current-116-120-overlay-v50-x350-y500-10x.png',
        'reports/stadium/gwangju-109-120-trace/current-109-120-overlay-v50-x350-y500-6x.png',
      ],
    },
    {
      id: 'third-base-121-127-hij',
      label: 'Third-base 121-127 and upper H/I/J adjacency',
      statusNote: 'Priority recheck area; 121-127 must not be swallowed by H/I/J polygons.',
      blockIds: [
        'k7-121',
        'k7-122',
        'k8-123',
        'k5-124',
        'k5-125',
        'k5-126',
        'k5-127',
        'third-family-seats',
        'third-wheelchair-seats',
        'party-seats-third',
      ],
      artifacts: [
        'reports/stadium/gwangju-seatmap-image-alignment-audit-crops/gwangju-seatmap-image-alignment-audit-121-127.png',
        'reports/stadium/gwangju-seatmap-trace-review-clean-crops/gwangju-seatmap-trace-review-k5-126-clean-overlay.png',
        'reports/stadium/gwangju-seatmap-trace-review-clean-crops/gwangju-seatmap-trace-review-k5-127-clean-overlay.png',
        'reports/stadium/gwangju-seatmap-trace-review-clean-crops/gwangju-seatmap-trace-review-third-family-seats-clean-overlay.png',
        'reports/stadium/gwangju-seatmap-trace-review-clean-crops/gwangju-seatmap-trace-review-third-wheelchair-seats-clean-overlay.png',
        'reports/stadium/gwangju-seatmap-trace-review-clean-crops/gwangju-seatmap-trace-review-party-seats-third-clean-overlay.png',
      ],
    },
    {
      id: 'official-special-sections',
      label: 'Official special sections A/B/C/G/H/I/J/K',
      statusNote: 'Alphabet sections must match the official image, not only pass label top-hit checks.',
      blockIds: [
        'champion-seats',
        'central-table-seats',
        'disabled-seats-center',
        'first-surprise-seats',
        'third-surprise-seats',
        'first-family-seats',
        'third-family-seats',
        'first-wheelchair-seats',
        'third-wheelchair-seats',
        'party-seats-first',
        'party-seats-third',
        'skybox-seats',
      ],
      artifacts: [
        'reports/stadium/gwangju-special-sections-trace/current-center-special-overlay-v50-x360-y710-8x.png',
        'reports/stadium/gwangju-special-sections-trace/current-firstbase-special-overlay-v50-x680-y750-6x.png',
        'reports/stadium/gwangju-special-sections-trace/current-thirdbase-special-overlay-v50-x420-y130-6x.png',
        'reports/stadium/gwangju-special-sections-trace/current-skybox-special-overlay-v50-x300-y780-10x.png',
        'reports/stadium/gwangju-special-sections-trace/current-special-full-overlay-v50-x300-y120-3x.png',
      ],
    },
    {
      id: 'op-outfield-and-bleachers-table',
      label: 'O/P outfield and bleachers table',
      statusNote: 'Large O/P sections use component recall and IoU to prevent legacy short polygons.',
      blockIds: [
        'outfield-left-seats',
        'outfield-right-seats',
        'bleachers-table-left',
        'bleachers-table-right',
      ],
      artifacts: [
        'reports/stadium/gwangju-op-outfield-trace/current-left-op-overlay-v50-x650-y70-6x.png',
        'reports/stadium/gwangju-op-outfield-trace/current-right-op-overlay-v50-x1120-y300-5x.png',
        'reports/stadium/gwangju-op-outfield-trace/current-op-full-overlay-v50-x650-y70-3x.png',
      ],
    },
    {
      id: 'five-table-501-535',
      label: 'Five-table 501-535',
      statusNote: 'Full repeated 5F table sequence evidence by official PNG crop.',
      blockIds: Array.from({ length: 35 }, (_, index) => `five-table-${501 + index}`),
      artifacts: [
        'reports/stadium/gwangju-five-table-trace/current-five-table-501-509-overlay-v50-x690-y920-8x.png',
        'reports/stadium/gwangju-five-table-trace/current-five-table-510-518-overlay-v50-x300-y820-8x.png',
        'reports/stadium/gwangju-five-table-trace/current-five-table-519-527-overlay-v50-x230-y520-8x.png',
        'reports/stadium/gwangju-five-table-trace/current-five-table-528-535-overlay-v50-x290-y160-8x.png',
      ],
    },
    {
      id: 'sky-picnic-s301-s335',
      label: 'Sky picnic S-301-S-335',
      statusNote: 'S-series seats use official image color scan and staged overlay evidence.',
      blockIds: Array.from({ length: 35 }, (_, index) => `sky-picnic-s-${301 + index}`),
      artifacts: [
        'reports/stadium/gwangju-105-108-s301-trace/current-s301-s304-overlay-v45-x760-y930-10x.png',
        'reports/stadium/gwangju-s305-s317-trace/current-s305-s317-overlay-v50-x430-y860-12x.png',
        'reports/stadium/gwangju-s318-s335-trace/current-s318-s335-overlay-v46-x320-y390-4x.png',
        'reports/stadium/gwangju-seatmap-image-alignment-audit-crops/gwangju-seatmap-image-alignment-audit-sky-picnic-s-301-315.png',
        'reports/stadium/gwangju-seatmap-image-alignment-audit-crops/gwangju-seatmap-image-alignment-audit-sky-picnic-s-316-335.png',
      ],
    },
  ];
  
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
  
  const round = (value, digits = 4) => (
    value === null || value === undefined || Number.isNaN(value)
      ? null
      : Number(value.toFixed(digits))
  );
  
  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));
  
  const exists = async (relativePath) => {
    try {
      await fs.access(path.join(frontendRoot, relativePath));
      return true;
    } catch {
      return false;
    }
  };
  
  const metricMin = (rows, key) => {
    const values = rows
      .map((row) => row[key])
      .filter((value) => typeof value === 'number');
    return values.length ? round(Math.min(...values)) : null;
  };
  
  const metricMax = (rows, key) => {
    const values = rows
      .map((row) => row[key])
      .filter((value) => typeof value === 'number');
    return values.length ? round(Math.max(...values)) : null;
  };
  
  const metricMinAny = (rows, keys) => {
    const values = rows
      .flatMap((row) => keys.map((key) => row[key]))
      .filter((value) => typeof value === 'number');
    return values.length ? round(Math.min(...values)) : null;
  };
  
  const metricMaxAny = (rows, keys) => {
    const values = rows
      .flatMap((row) => keys.map((key) => row[key]))
      .filter((value) => typeof value === 'number');
    return values.length ? round(Math.max(...values)) : null;
  };
  
  const imageAudit = await readJson(imageAuditPath);
  const traceReview = await readJson(traceReviewPath);
  const imageRows = new Map((imageAudit.rows ?? []).map((row) => [row.id, row]));
  const traceRows = new Map((traceReview.blocks ?? []).map((row) => [row.id, row]));
  
  const zoneRows = [];
  for (const zone of ZONES) {
    const rows = zone.blockIds
      .map((blockId) => imageRows.get(blockId))
      .filter(Boolean);
    const traceBlocks = zone.blockIds
      .map((blockId) => traceRows.get(blockId))
      .filter(Boolean);
    const missingAuditRows = zone.blockIds.filter((blockId) => !imageRows.has(blockId));
    const missingTraceRows = zone.blockIds.filter((blockId) => !traceRows.has(blockId));
    const missingArtifacts = [];
    for (const artifact of zone.artifacts) {
      if (!(await exists(artifact))) missingArtifacts.push(artifact);
    }
  
    const failedRows = rows.filter((row) => row.status !== 'passed');
    const topHitFailures = rows.filter((row) => row.topHitAtLabel === false);
    const traceFailures = traceBlocks.filter((block) => (
      block.traceStatus !== 'OFFICIAL_IMAGE_TRACED'
      || block.pixelAlignmentStatus !== 'PIXEL_ALIGNED'
      || block.manualReviewed !== true
    ));
    const blockers = [
      ...missingAuditRows.map((blockId) => `MISSING_IMAGE_AUDIT_ROW:${blockId}`),
      ...missingTraceRows.map((blockId) => `MISSING_TRACE_REVIEW_ROW:${blockId}`),
      ...missingArtifacts.map((artifact) => `MISSING_ARTIFACT:${artifact}`),
      ...failedRows.map((row) => `IMAGE_AUDIT_NOT_PASSED:${row.id}:${row.status}`),
      ...topHitFailures.map((row) => `TOP_HIT_FAILED:${row.id}`),
      ...traceFailures.map((row) => `TRACE_REVIEW_NOT_RELEASE_READY:${row.id}`),
    ];
  
    zoneRows.push({
      id: zone.id,
      label: zone.label,
      status: blockers.length === 0 ? 'passed' : 'failed',
      statusNote: zone.statusNote,
      blockCount: zone.blockIds.length,
      auditedBlockCount: rows.length,
      traceReviewBlockCount: traceBlocks.length,
      minimumOfficialBlockMaskRecall: metricMin(rows, 'officialBlockMaskRecall'),
      minimumComponentIoU: metricMin(rows, 'componentIoU'),
      maximumOutsideBleedRatio: metricMax(rows, 'outsideBleedRatio'),
      minimumScanCoverageRatio: metricMinAny(rows, [
        'skyPicnicColorCoverageRatio',
        'fiveTableColorCoverageRatio',
        'alphabetSectionColorCoverageRatio',
      ]),
      maximumLocalFillBoundsMaxAbsDelta: metricMaxAny(rows, [
        'skyPicnicLocalFillBoundsMaxAbsDelta',
        'fiveTableLocalFillBoundsMaxAbsDelta',
      ]),
      labelTopHitFailures: topHitFailures.length,
      blockers,
      blockIds: zone.blockIds,
      artifacts: zone.artifacts,
    });
  }
  
  const blockers = [
    ...(imageAudit.summary?.status === 'passed' ? [] : [`IMAGE_ALIGNMENT_AUDIT_NOT_PASSED:${imageAudit.summary?.status ?? 'missing'}`]),
    ...(traceReview.summary?.traceStatus === 'READY' && traceReview.summary?.selectableBlocksReady === true
      ? []
      : [`TRACE_REVIEW_NOT_READY:${traceReview.summary?.traceStatus ?? 'missing'}`]),
    ...zoneRows.flatMap((zone) => zone.blockers.map((blocker) => `${zone.id}:${blocker}`)),
  ];
  
  const report = {
    generatedAt: new Date().toISOString(),
    version: INVENTORY_VERSION,
    status: blockers.length === 0 ? 'passed' : 'failed',
    sourcePolicy: imageAudit.summary?.officialMaskSourcePolicy ?? imageAudit.sourcePolicy ?? {
      coordinateSource: 'official PNG 2200x1159 only',
      disallowedSources: [
        'browser CSS pixels',
        'resized screenshots',
        'external crawling',
        'web-search-based baseball data',
        'third-party copied seatmap images',
      ],
      missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    },
    upstream: {
      imageAlignmentAudit: path.relative(frontendRoot, imageAuditPath),
      imageAlignmentStatus: imageAudit.summary?.status ?? null,
      traceReview: path.relative(frontendRoot, traceReviewPath),
      traceReviewStatus: traceReview.summary?.traceStatus ?? null,
      traceVersion: traceReview.summary?.traceVersion ?? imageAudit.summary?.traceVersion ?? null,
      totalBlocks: traceReview.summary?.totalBlocks ?? null,
      imageCoordinateSystem: imageAudit.summary?.coordinateSystem ?? null,
    },
    summary: {
      zoneCount: zoneRows.length,
      passedZones: zoneRows.filter((zone) => zone.status === 'passed').length,
      failedZones: zoneRows.filter((zone) => zone.status !== 'passed').length,
      totalInventoryArtifacts: zoneRows.reduce((total, zone) => total + zone.artifacts.length, 0),
      blockers,
    },
    zones: zoneRows,
  };
  
  await fs.writeFile(`${outputBase}.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  
  const csvRows = [
    [
      'zoneId',
      'label',
      'status',
      'blockCount',
      'auditedBlockCount',
      'traceReviewBlockCount',
      'minimumOfficialBlockMaskRecall',
      'minimumComponentIoU',
      'maximumOutsideBleedRatio',
      'minimumScanCoverageRatio',
      'maximumLocalFillBoundsMaxAbsDelta',
      'labelTopHitFailures',
      'artifactCount',
      'blockers',
    ],
    ...zoneRows.map((zone) => [
      zone.id,
      zone.label,
      zone.status,
      zone.blockCount,
      zone.auditedBlockCount,
      zone.traceReviewBlockCount,
      zone.minimumOfficialBlockMaskRecall,
      zone.minimumComponentIoU,
      zone.maximumOutsideBleedRatio,
      zone.minimumScanCoverageRatio,
      zone.maximumLocalFillBoundsMaxAbsDelta,
      zone.labelTopHitFailures,
      zone.artifacts.length,
      zone.blockers.join(';'),
    ]),
  ];
  await fs.writeFile(`${outputBase}.csv`, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');
  
  const markdown = [
    '# Gwangju Seatmap Evidence Inventory',
    '',
    `- generatedAt: \`${report.generatedAt}\``,
    `- status: \`${report.status}\``,
    `- traceVersion: \`${report.upstream.traceVersion}\``,
    `- coordinate source: \`${report.sourcePolicy.coordinateSource}\``,
    `- upstream image alignment audit: \`${report.upstream.imageAlignmentStatus}\``,
    `- upstream trace review: \`${report.upstream.traceReviewStatus}\``,
    `- total blocks: \`${report.upstream.totalBlocks}\``,
    '',
    '## Zone Summary',
    '',
    markdownTable(
      [
        'Zone',
        'Status',
        'Blocks',
        'Audit Rows',
        'Trace Rows',
        'Min Recall',
        'Min IoU',
        'Max Bleed',
        'Min Scan Coverage',
        'Max Fill Delta',
        'Top Hit Failures',
        'Blockers',
      ],
      zoneRows.map((zone) => [
        zone.label,
        zone.status,
        zone.blockCount,
        zone.auditedBlockCount,
        zone.traceReviewBlockCount,
        zone.minimumOfficialBlockMaskRecall,
        zone.minimumComponentIoU,
        zone.maximumOutsideBleedRatio,
        zone.minimumScanCoverageRatio,
        zone.maximumLocalFillBoundsMaxAbsDelta,
        zone.labelTopHitFailures,
        zone.blockers.length ? zone.blockers.join('<br>') : '-',
      ]),
    ),
    '',
    '## Evidence Artifacts',
    '',
    ...zoneRows.flatMap((zone) => [
      `### ${zone.label}`,
      '',
      `- status: \`${zone.status}\``,
      `- note: ${zone.statusNote}`,
      `- blockIds: \`${zone.blockIds.join(', ')}\``,
      ...zone.artifacts.map((artifact) => `- artifact: \`${artifact}\``),
      '',
    ]),
    '## Source Policy',
    '',
    `- allowed coordinate source: \`${report.sourcePolicy.coordinateSource}\``,
    `- disallowed sources: \`${(report.sourcePolicy.disallowedSources ?? []).join(', ')}\``,
    `- missing baseball data contract: \`${report.sourcePolicy.missingBaseballDataContract}\``,
    '',
  ].join('\n');
  
  await fs.writeFile(`${outputBase}.md`, markdown, 'utf8');
  
  console.log(`evidence_inventory_json:${outputBase}.json`);
  console.log(`evidence_inventory_csv:${outputBase}.csv`);
  console.log(`evidence_inventory_markdown:${outputBase}.md`);
  console.log(`status:${report.status}`);
};

const runImageTraceCandidates = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const { default: sharp } = await import('sharp');
  const {
    GWANGJU_BLOCKS,
    GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
    GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
    GWANGJU_OFFICIAL_TRACE_REFERENCE,
    GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES,
    GWANGJU_SEATMAP_IMAGE,
    GWANGJU_ZONE_PRECISION_WORKSETS,
  } = await import('../src/data/gwangjuSeatData.ts');

  const SCRIPT_VERSION = 'GWANGJU_IMAGE_TRACE_CANDIDATES_V1';
  
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(frontendRoot, '..');
  const defaultOutDir = path.join(repoRoot, 'output/playwright');
  
  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };
  
  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const cropDir = path.join(outDir, 'gwangju-seatmap-image-trace-candidates-crops');
  const jsonPath = path.join(outDir, 'gwangju-seatmap-image-trace-candidates.json');
  const csvPath = path.join(outDir, 'gwangju-seatmap-image-trace-candidates.csv');
  const markdownPath = path.join(outDir, 'gwangju-seatmap-image-trace-candidates.md');
  const overlayPath = path.join(outDir, 'gwangju-seatmap-image-trace-candidates-overlay.png');
  const imagePath = path.resolve(frontendRoot, GWANGJU_SEATMAP_IMAGE.imagePath);
  
  const SEATMAP_BOUNDS = { minX: 250, maxX: 1370, minY: 90, maxY: 1090 };
  const SOURCE_POLICY = {
    allowedCoordinateSource: 'official PNG 2200x1159 only',
    coordinateSystem: `${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight}`,
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    disallowedSources: [
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
  };
  
  const PIXEL_GROUPS = [
    { id: 'k5', label: 'K5/K5-family salmon blocks', colors: [[243, 164, 144], [248, 196, 180]], threshold: 28, minArea: 80 },
    { id: 'k8', label: 'K7/K8 yellow blocks', colors: [[251, 203, 112], [251, 226, 160]], threshold: 26, minArea: 80 },
    { id: 'k9', label: 'K9 green blocks', colors: [[186, 216, 122], [206, 226, 160]], threshold: 26, minArea: 80 },
    { id: 'sky-picnic', label: 'Sky picnic pink blocks', colors: [[239, 146, 181], [244, 180, 208]], threshold: 28, minArea: 20 },
    { id: 'five-table', label: '5F table blue-gray blocks', colors: [[208, 214, 236], [222, 226, 241], [204, 207, 228]], threshold: 20, minArea: 70 },
    { id: 'champion', label: 'Champion seats', colors: [[79, 189, 176]], threshold: 28, minArea: 200 },
    { id: 'central-table', label: 'Central table seats', colors: [[148, 213, 246]], threshold: 30, minArea: 200 },
    { id: 'accessible-green', label: 'Accessible seats', colors: [[35, 172, 56]], threshold: 28, minArea: 120 },
    { id: 'surprise', label: 'Surprise seats', colors: [[243, 152, 0]], threshold: 28, minArea: 180 },
    { id: 'family', label: 'Tigers family seats', colors: [[238, 130, 124]], threshold: 30, minArea: 180 },
    { id: 'party', label: 'Party seats', colors: [[223, 127, 110]], threshold: 26, minArea: 80 },
    { id: 'skybox', label: 'Skybox', colors: [[225, 131, 172]], threshold: 28, minArea: 50 },
    { id: 'outfield', label: 'Outfield seats', colors: [[220, 234, 186]], threshold: 22, minArea: 300 },
    { id: 'bleachers-table', label: 'Bleachers table seats', colors: [[144, 195, 31]], threshold: 30, minArea: 100 },
  ];
  
  const CATEGORY_GROUP_IDS = {
    K5: ['k5'],
    K7: ['k8'],
    K8: ['k8'],
    K9: ['k9'],
    SKY_PICNIC: ['sky-picnic'],
    FIVE_TABLE: ['five-table'],
    CHAMPION: ['champion'],
    CENTRAL_TABLE: ['central-table'],
    ACCESSIBLE: ['accessible-green'],
    SURPRISE: ['surprise'],
    FAMILY: ['family'],
    PARTY: ['party'],
    SKYBOX: ['skybox'],
    OUTFIELD: ['outfield'],
    BLEACHERS_TABLE: ['bleachers-table'],
  };
  
  const P2_BOUNDARY_WATCH_BLOCK_IDS = new Set([
    'k7-111',
    'k9-112',
    'k9-113',
    'k9-116',
    'k9-117',
    'k7-118',
    'k7-119',
    'k7-120',
    'k7-121',
    'k7-122',
  ]);
  const P2_ROW_STRIPE_REFERENCE_AREA_RATIO = 0.45;
  const P2_MERGED_COMPONENT_REFERENCES = {
    'k7-111': {
      componentGroupId: 'k8',
      componentIds: ['k8-85', 'k8-87', 'k8-94', 'k8-99', 'k8-104', 'k8-109', 'k8-114', 'k8-119', 'k8-125', 'k8-129', 'k8-133', 'k8-140', 'k8-145'],
    },
    'k9-112': {
      componentGroupId: 'k9',
      componentIds: ['k9-39', 'k9-41', 'k9-44', 'k9-46', 'k9-49', 'k9-51', 'k9-54', 'k9-56', 'k9-59', 'k9-61', 'k9-62', 'k9-63'],
    },
    'k9-113': {
      componentGroupId: 'k9',
      componentIds: ['k9-33', 'k9-34', 'k9-35', 'k9-36', 'k9-37', 'k9-38', 'k9-40', 'k9-42', 'k9-43', 'k9-45', 'k9-47', 'k9-48', 'k9-50', 'k9-52', 'k9-53', 'k9-55', 'k9-57', 'k9-58', 'k9-60'],
    },
    'k9-116': {
      componentGroupId: 'k9',
      componentIds: ['k9-15', 'k9-16', 'k9-17', 'k9-18', 'k9-19', 'k9-20', 'k9-21', 'k9-22', 'k9-23', 'k9-24', 'k9-25', 'k9-26', 'k9-27', 'k9-28', 'k9-29', 'k9-30', 'k9-31', 'k9-32'],
    },
    'k9-117': {
      componentGroupId: 'k9',
      componentIds: ['k9-1', 'k9-2', 'k9-3', 'k9-4', 'k9-5', 'k9-6', 'k9-7', 'k9-8', 'k9-9', 'k9-10', 'k9-11', 'k9-12', 'k9-13', 'k9-14'],
    },
    'k7-118': {
      componentGroupId: 'k8',
      componentIds: ['k8-71', 'k8-72', 'k8-73', 'k8-74', 'k8-75', 'k8-76', 'k8-77', 'k8-78', 'k8-79', 'k8-80', 'k8-81', 'k8-82', 'k8-83', 'k8-84'],
    },
    'k7-119': {
      componentGroupId: 'k8',
      componentIds: ['k8-56', 'k8-57', 'k8-58', 'k8-59', 'k8-60', 'k8-61', 'k8-62', 'k8-63', 'k8-64', 'k8-65', 'k8-66', 'k8-67', 'k8-68', 'k8-69', 'k8-70'],
    },
    'k7-120': {
      componentGroupId: 'k8',
      componentIds: ['k8-43', 'k8-44', 'k8-45', 'k8-46', 'k8-47', 'k8-48', 'k8-49', 'k8-50', 'k8-51', 'k8-52', 'k8-53', 'k8-54', 'k8-55'],
    },
  };
  const P2_MERGED_COMPONENT_RECALL_THRESHOLD = 0.96;
  const P2_MERGED_COMPONENT_IOU_THRESHOLD = 0.35;
  const P2_PRODUCTION_REVIEWED_CURRENT_PATH_BLOCK_IDS = new Set([
    'k7-121',
    'k7-122',
  ]);
  
  const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));
  const pixelKey = (x, y) => `${x},${y}`;
  const pointKey = ([x, y]) => `${x},${y}`;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  
  const colorDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  
  const rgbAt = (image, x, y) => {
    const offset = ((y * image.width) + x) * image.channels;
    return [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
  };
  
  const isGroupPixel = (image, group, x, y) => {
    const rgb = rgbAt(image, x, y);
    return group.colors.some((color) => colorDistance(rgb, color) <= group.threshold);
  };
  
  const pathSubpaths = (pathData) => {
    const matches = String(pathData ?? '').match(/M[^M]+/g) ?? [];
    return matches.map((subpath) => {
      const numbers = subpath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      const points = [];
      for (let index = 0; index < numbers.length - 1; index += 2) {
        points.push([numbers[index], numbers[index + 1]]);
      }
      return points;
    }).filter((points) => points.length >= 3);
  };
  
  const pointsBounds = (points) => ({
    minX: Math.floor(Math.min(...points.map((point) => point[0]))),
    minY: Math.floor(Math.min(...points.map((point) => point[1]))),
    maxX: Math.ceil(Math.max(...points.map((point) => point[0]))),
    maxY: Math.ceil(Math.max(...points.map((point) => point[1]))),
  });
  
  const unionBounds = (boundsList) => {
    const valid = boundsList.filter(Boolean);
    if (valid.length === 0) return null;
    return {
      minX: Math.min(...valid.map((bounds) => bounds.minX)),
      minY: Math.min(...valid.map((bounds) => bounds.minY)),
      maxX: Math.max(...valid.map((bounds) => bounds.maxX)),
      maxY: Math.max(...valid.map((bounds) => bounds.maxY)),
    };
  };
  
  const pathBounds = (pathData) => {
    const subpaths = pathSubpaths(pathData);
    return unionBounds(subpaths.map(pointsBounds));
  };
  
  const pointInBounds = ([x, y], bounds) => (
    bounds
    && x >= bounds.minX
    && x <= bounds.maxX
    && y >= bounds.minY
    && y <= bounds.maxY
  );
  
  const pointInPolygon = ([x, y], polygon) => {
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
  
  const pointInAnyRing = (point, rings) => rings.some((ring) => pointInPolygon(point, ring));
  
  const polygonArea = (points) => {
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
      const [x1, y1] = points[index];
      const [x2, y2] = points[(index + 1) % points.length];
      area += (x1 * y2) - (x2 * y1);
    }
    return area / 2;
  };
  
  const convexHull = (points) => {
    const sorted = [...new Map(points.map((point) => [pointKey(point), point])).values()]
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length <= 1) return sorted;
  
    const cross = (origin, a, b) => (
      (a[0] - origin[0]) * (b[1] - origin[1])
      - (a[1] - origin[1]) * (b[0] - origin[0])
    );
    const lower = [];
    for (const point of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
        lower.pop();
      }
      lower.push(point);
    }
    const upper = [];
    for (let index = sorted.length - 1; index >= 0; index -= 1) {
      const point = sorted[index];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
        upper.pop();
      }
      upper.push(point);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  };
  
  const simplifyOrthogonalRing = (points) => {
    if (points.length <= 3) return points;
    const openPoints = pointKey(points[0]) === pointKey(points[points.length - 1])
      ? points.slice(0, -1)
      : [...points];
    let changed = true;
    while (changed && openPoints.length > 3) {
      changed = false;
      for (let index = 0; index < openPoints.length; index += 1) {
        const previous = openPoints[(index - 1 + openPoints.length) % openPoints.length];
        const current = openPoints[index];
        const next = openPoints[(index + 1) % openPoints.length];
        if ((previous[0] === current[0] && current[0] === next[0])
          || (previous[1] === current[1] && current[1] === next[1])) {
          openPoints.splice(index, 1);
          changed = true;
          break;
        }
      }
    }
    return openPoints;
  };
  
  const componentBoundaryRings = (pixels) => {
    if (pixels.length === 0) return [];
  
    const pixelSet = new Set(pixels.map(([x, y]) => pixelKey(x, y)));
    const edges = [];
    const addEdge = (start, end) => edges.push({ start, end });
  
    for (const [x, y] of pixels) {
      if (!pixelSet.has(pixelKey(x, y - 1))) addEdge([x, y], [x + 1, y]);
      if (!pixelSet.has(pixelKey(x + 1, y))) addEdge([x + 1, y], [x + 1, y + 1]);
      if (!pixelSet.has(pixelKey(x, y + 1))) addEdge([x + 1, y + 1], [x, y + 1]);
      if (!pixelSet.has(pixelKey(x - 1, y))) addEdge([x, y + 1], [x, y]);
    }
  
    const edgesByStart = new Map();
    edges.forEach((edge, index) => {
      const indexes = edgesByStart.get(pointKey(edge.start)) ?? [];
      indexes.push(index);
      edgesByStart.set(pointKey(edge.start), indexes);
    });
  
    const used = new Uint8Array(edges.length);
    const rings = [];
  
    for (let index = 0; index < edges.length; index += 1) {
      if (used[index]) continue;
      const first = edges[index];
      const ring = [first.start];
      let currentEnd = first.end;
      used[index] = 1;
  
      while (pointKey(currentEnd) !== pointKey(ring[0])) {
        ring.push(currentEnd);
        const candidates = edgesByStart.get(pointKey(currentEnd)) ?? [];
        const nextIndex = candidates.find((candidateIndex) => !used[candidateIndex]);
        if (nextIndex === undefined) break;
        used[nextIndex] = 1;
        currentEnd = edges[nextIndex].end;
      }
  
      if (pointKey(currentEnd) === pointKey(ring[0]) && ring.length >= 4) {
        rings.push(simplifyOrthogonalRing(ring));
      }
    }
  
    return rings.sort((a, b) => Math.abs(polygonArea(b)) - Math.abs(polygonArea(a)));
  };
  
  const ringPath = (ring) => {
    if (!Array.isArray(ring) || ring.length === 0) return '';
    return `M ${ring.map((point) => point.join(' ')).join(' L ')} Z`;
  };
  
  const ringsPath = (rings) => rings.map(ringPath).filter(Boolean).join(' ');
  
  const ensureComponentRings = (component) => {
    if (!component.rings) component.rings = componentBoundaryRings(component.pixels);
    return component.rings;
  };
  
  const extractComponents = (image, group) => {
    const bounds = group.bounds ?? SEATMAP_BOUNDS;
    const width = bounds.maxX - bounds.minX + 1;
    const height = bounds.maxY - bounds.minY + 1;
    const mask = new Uint8Array(width * height);
    const seen = new Uint8Array(width * height);
  
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        if (isGroupPixel(image, group, x, y)) {
          mask[((y - bounds.minY) * width) + (x - bounds.minX)] = 1;
        }
      }
    }
  
    const components = [];
    const queue = [];
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const startIndex = ((y - bounds.minY) * width) + (x - bounds.minX);
        if (!mask[startIndex] || seen[startIndex]) continue;
  
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        const pixels = [];
        seen[startIndex] = 1;
        queue.length = 0;
        queue.push(startIndex);
  
        for (let head = 0; head < queue.length; head += 1) {
          const localIndex = queue[head];
          const cx = bounds.minX + (localIndex % width);
          const cy = bounds.minY + Math.floor(localIndex / width);
          pixels.push([cx, cy]);
          minX = Math.min(minX, cx);
          maxX = Math.max(maxX, cx);
          minY = Math.min(minY, cy);
          maxY = Math.max(maxY, cy);
  
          for (const [dx, dy] of directions) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < bounds.minX || nx > bounds.maxX || ny < bounds.minY || ny > bounds.maxY) continue;
            const index = ((ny - bounds.minY) * width) + (nx - bounds.minX);
            if (!mask[index] || seen[index]) continue;
            seen[index] = 1;
            queue.push(index);
          }
        }
  
        const area = pixels.length;
        if (area >= group.minArea && area <= (group.maxArea ?? Infinity)) {
          components.push({
            id: `${group.id}-${components.length + 1}`,
            groupId: group.id,
            groupLabel: group.label,
            area,
            bounds: { minX, minY, maxX, maxY },
            center: {
              x: round((minX + maxX) / 2, 1),
              y: round((minY + maxY) / 2, 1),
            },
            pixels,
          });
        }
      }
    }
  
    return components.sort((a, b) => a.bounds.minY - b.bounds.minY || a.bounds.minX - b.bounds.minX);
  };
  
  const buildComponentIndex = (image) => {
    const groups = PIXEL_GROUPS.map((group) => ({
      ...group,
      components: extractComponents(image, group),
    }));
    const byGroup = new Map(groups.map((group) => [group.id, group.components]));
    const byId = new Map(groups.flatMap((group) => group.components.map((component) => [component.id, component])));
    return { groups, byGroup, byId };
  };
  
  const componentPixelSet = (components) => new Set(components.flatMap((component) => (
    component.pixels.map(([x, y]) => pixelKey(x, y))
  )));
  
  const candidateComponentCoverage = (rings, components) => {
    const bounds = unionBounds([
      unionBounds(rings.map(pointsBounds)),
      unionBounds(components.map((component) => component.bounds)),
    ]);
    if (!bounds || rings.length === 0 || components.length === 0) {
      return {
        componentPixels: 0,
        candidatePixels: 0,
        intersectionPixels: 0,
        officialComponentRecall: 0,
        componentIoU: 0,
      };
    }
  
    const componentPixels = componentPixelSet(components);
    let candidatePixels = 0;
    let intersectionPixels = 0;
  
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        if (!pointInAnyRing([x + 0.5, y + 0.5], rings)) continue;
        candidatePixels += 1;
        if (componentPixels.has(pixelKey(x, y))) intersectionPixels += 1;
      }
    }
  
    const componentPixelCount = componentPixels.size;
    const unionPixelCount = candidatePixels + componentPixelCount - intersectionPixels;
    return {
      componentPixels: componentPixelCount,
      candidatePixels,
      intersectionPixels,
      officialComponentRecall: componentPixelCount > 0 ? round(intersectionPixels / componentPixelCount) : 0,
      componentIoU: unionPixelCount > 0 ? round(intersectionPixels / unionPixelCount) : 0,
    };
  };
  
  const blockWorksetIds = new Map();
  for (const workset of GWANGJU_ZONE_PRECISION_WORKSETS) {
    for (const blockId of workset.blockIds) {
      const ids = blockWorksetIds.get(blockId) ?? [];
      ids.push(workset.id);
      blockWorksetIds.set(blockId, ids);
    }
  }
  
  const labelPoint = (block) => [block.imageGeometry.labelX, block.imageGeometry.labelY];
  
  const boundsOverlap = (a, b) => (
    a
    && b
    && a.minX <= b.maxX
    && a.maxX >= b.minX
    && a.minY <= b.maxY
    && a.maxY >= b.minY
  );
  
  const labelsInsideRings = (rings, targetBlockId) => GWANGJU_BLOCKS
    .filter((block) => block.id !== targetBlockId)
    .filter((block) => pointInAnyRing(labelPoint(block), rings))
    .map((block) => block.id);
  
  const bestRingForComponent = (component) => {
    const [ring] = ensureComponentRings(component);
    return ring ?? null;
  };
  
  const clippedComponent = (component, clipBounds) => {
    if (!clipBounds) return component;
    const pixels = component.pixels.filter(([x, y]) => (
      x >= clipBounds.minX
      && x <= clipBounds.maxX
      && y >= clipBounds.minY
      && y <= clipBounds.maxY
    ));
    if (pixels.length === 0) {
      return {
        ...component,
        area: 0,
        bounds: null,
        center: null,
        pixels,
        rings: [],
      };
    }
    const bounds = pointsBounds(pixels);
    return {
      ...component,
      area: pixels.length,
      bounds,
      center: {
        x: round((bounds.minX + bounds.maxX) / 2, 1),
        y: round((bounds.minY + bounds.maxY) / 2, 1),
      },
      pixels,
      rings: undefined,
    };
  };
  
  const explicitComponentCandidate = (block, componentIndex) => {
    const reference = GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES[block.id];
    if (!reference) return null;
    const components = reference.componentIds
      .map((componentId) => componentIndex.byId.get(componentId))
      .filter(Boolean)
      .map((component) => clippedComponent(component, reference.expectedBounds))
      .filter((component) => component.area > 0);
    const missingComponentIds = reference.componentIds.filter((componentId) => !componentIndex.byId.has(componentId));
    const rings = components.map(bestRingForComponent).filter(Boolean);
    return {
      mode: 'official-component-reference',
      expectedComponentIds: reference.componentIds,
      missingComponentIds,
      components,
      rings,
      reference,
    };
  };
  
  const mergedComponentHullCandidate = (block, componentIndex) => {
    const reference = P2_MERGED_COMPONENT_REFERENCES[block.id];
    if (!reference) return null;
    const components = reference.componentIds
      .map((componentId) => componentIndex.byId.get(componentId))
      .filter(Boolean);
    const missingComponentIds = reference.componentIds.filter((componentId) => !componentIndex.byId.has(componentId));
    const hullInputPoints = [];
    for (const component of components) {
      for (const [x, y] of component.pixels) {
        hullInputPoints.push([x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]);
      }
    }
    const hull = simplifyOrthogonalRing(convexHull(hullInputPoints));
    return {
      mode: 'p2-merged-official-components',
      allowedGroupIds: [reference.componentGroupId],
      expectedComponentIds: reference.componentIds,
      missingComponentIds,
      components,
      rings: hull.length >= 3 ? [hull] : [],
      reference,
    };
  };
  
  const labelMatchedComponentCandidate = (block, componentIndex) => {
    const groupIds = CATEGORY_GROUP_IDS[block.category] ?? [];
    const label = labelPoint(block);
    const matches = [];
  
    for (const groupId of groupIds) {
      for (const component of componentIndex.byGroup.get(groupId) ?? []) {
        if (!pointInBounds(label, component.bounds)) continue;
        const ring = bestRingForComponent(component);
        if (!ring || !pointInPolygon(label, ring)) continue;
        matches.push({ groupId, component, ring });
      }
    }
  
    const sorted = matches.sort((a, b) => (
      a.component.area - b.component.area
      || a.component.bounds.minY - b.component.bounds.minY
      || a.component.bounds.minX - b.component.bounds.minX
    ));
    const best = sorted[0] ?? null;
    return {
      mode: 'label-anchor-component',
      allowedGroupIds: groupIds,
      candidateMatches: matches.length,
      components: best ? [best.component] : [],
      rings: best ? [best.ring] : [],
      allMatchedComponentIds: sorted.map((match) => match.component.id),
    };
  };
  
  const currentPathComponentHullCandidate = (block, componentIndex) => {
    const groupIds = CATEGORY_GROUP_IDS[block.category] ?? [];
    const currentRings = pathSubpaths(block.imageGeometry.d);
    const currentBounds = pathBounds(block.imageGeometry.d);
    const selected = [];
  
    for (const groupId of groupIds) {
      for (const component of componentIndex.byGroup.get(groupId) ?? []) {
        if (!boundsOverlap(currentBounds, component.bounds)) continue;
        let insidePixels = 0;
        for (const [x, y] of component.pixels) {
          if (pointInAnyRing([x + 0.5, y + 0.5], currentRings)) insidePixels += 1;
        }
        if (insidePixels < Math.max(8, Math.min(40, component.area * 0.08))) continue;
        selected.push({
          component,
          insidePixels,
          insideRatio: insidePixels / component.area,
        });
      }
    }
  
    if (selected.length === 0) {
      return {
        mode: 'current-path-component-hull',
        allowedGroupIds: groupIds,
        components: [],
        rings: [],
        selectedComponentCount: 0,
        allMatchedComponentIds: [],
      };
    }
  
    const hullInputPoints = [];
    for (const { component } of selected) {
      for (const [x, y] of component.pixels) {
        if (!pointInAnyRing([x + 0.5, y + 0.5], currentRings)) continue;
        hullInputPoints.push([x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]);
      }
    }
  
    const hull = simplifyOrthogonalRing(convexHull(hullInputPoints));
    return {
      mode: 'current-path-component-hull',
      allowedGroupIds: groupIds,
      components: selected.map((item) => item.component),
      rings: hull.length >= 3 ? [hull] : [],
      selectedComponentCount: selected.length,
      allMatchedComponentIds: selected.map((item) => item.component.id),
    };
  };
  
  const boundsDelta = (a, b) => {
    if (!a || !b) return null;
    return {
      minX: round(a.minX - b.minX, 1),
      minY: round(a.minY - b.minY, 1),
      maxX: round(a.maxX - b.maxX, 1),
      maxY: round(a.maxY - b.maxY, 1),
    };
  };
  
  const maxAbsBoundsDelta = (delta) => {
    if (!delta) return null;
    return Math.max(...Object.values(delta).map((value) => Math.abs(value)));
  };
  
  const boundsArea = (bounds) => (
    bounds
      ? Math.max(0, bounds.maxX - bounds.minX) * Math.max(0, bounds.maxY - bounds.minY)
      : 0
  );
  
  const blockCandidate = (block, componentIndex) => {
    const p2MergedCandidate = mergedComponentHullCandidate(block, componentIndex);
    const explicitCandidate = p2MergedCandidate ?? explicitComponentCandidate(block, componentIndex);
    const labelCandidate = explicitCandidate ?? labelMatchedComponentCandidate(block, componentIndex);
    const fallbackCandidate = !explicitCandidate && labelCandidate.components.length === 0
      ? currentPathComponentHullCandidate(block, componentIndex)
      : null;
    const resolvedCandidate = explicitCandidate
      ?? (labelCandidate.components.length > 0 ? labelCandidate : fallbackCandidate ?? labelCandidate);
    const rings = resolvedCandidate.rings;
    const components = resolvedCandidate.components;
    const candidatePath = ringsPath(rings);
    const currentBounds = pathBounds(block.imageGeometry.d);
    const candidateBounds = rings.length > 0 ? unionBounds(rings.map(pointsBounds)) : null;
    const reference = GWANGJU_OFFICIAL_TRACE_REFERENCE[block.id] ?? null;
    const expectedBounds = reference?.expectedBounds ?? null;
    const candidateReferenceAreaRatio = boundsArea(expectedBounds) > 0
      ? round(boundsArea(candidateBounds) / boundsArea(expectedBounds))
      : null;
    const p2ProductionReviewedCurrentPath = P2_PRODUCTION_REVIEWED_CURRENT_PATH_BLOCK_IDS.has(block.id)
      && resolvedCandidate.mode === 'current-path-component-hull'
      && candidateReferenceAreaRatio === 1;
    const label = labelPoint(block);
    const warnings = [];
  
    if ((CATEGORY_GROUP_IDS[block.category] ?? []).length === 0 && !explicitCandidate) warnings.push('NO_COLOR_GROUP_MAPPING');
    if (explicitCandidate?.missingComponentIds?.length > 0) warnings.push(`MISSING_REFERENCE_COMPONENT:${explicitCandidate.missingComponentIds.join(',')}`);
    if (!candidatePath) warnings.push('NO_OFFICIAL_IMAGE_COMPONENT_CANDIDATE');
    if (!explicitCandidate && labelCandidate.candidateMatches === 0 && resolvedCandidate.mode !== 'current-path-component-hull') warnings.push('NO_COMPONENT_CONTAINS_LABEL_ANCHOR');
    if (!explicitCandidate && labelCandidate.candidateMatches > 1) warnings.push(`MULTIPLE_COMPONENTS_CONTAIN_LABEL:${labelCandidate.allMatchedComponentIds.join(',')}`);
    if (resolvedCandidate.mode === 'current-path-component-hull' && !p2ProductionReviewedCurrentPath) {
      warnings.push('CURRENT_PATH_USED_FOR_COMPONENT_OWNERSHIP_HINT');
    }
    if (P2_BOUNDARY_WATCH_BLOCK_IDS.has(block.id)
      && !explicitCandidate
      && resolvedCandidate.mode === 'current-path-component-hull'
      && !p2ProductionReviewedCurrentPath) {
      warnings.push('P2_COMPONENT_OWNERSHIP_REQUIRES_MANUAL_REVIEW');
    }
    if (P2_BOUNDARY_WATCH_BLOCK_IDS.has(block.id)
      && !explicitCandidate
      && resolvedCandidate.mode === 'label-anchor-component'
      && candidateReferenceAreaRatio !== null
      && candidateReferenceAreaRatio < P2_ROW_STRIPE_REFERENCE_AREA_RATIO) {
      warnings.push(`P2_LABEL_COMPONENT_IS_ROW_STRIPE_ONLY:${candidateReferenceAreaRatio}`);
    }
  
    const siblingLabelsInside = candidatePath ? labelsInsideRings(rings, block.id) : [];
    if (siblingLabelsInside.length > 0) warnings.push(`MULTIPLE_LABEL_ANCHORS_IN_COMPONENT:${siblingLabelsInside.join(',')}`);
  
    const labelInsideCandidate = candidatePath ? pointInAnyRing(label, rings) : false;
    if (candidatePath && !labelInsideCandidate) warnings.push('LABEL_OUTSIDE_CANDIDATE_PATH');
  
    const coverage = candidateComponentCoverage(rings, components);
    if (candidatePath && p2MergedCandidate && coverage.officialComponentRecall < P2_MERGED_COMPONENT_RECALL_THRESHOLD) {
      warnings.push(`LOW_P2_MERGED_COMPONENT_RECALL:${coverage.officialComponentRecall}`);
    } else if (candidatePath && !p2MergedCandidate && !p2ProductionReviewedCurrentPath && coverage.officialComponentRecall < 0.9) {
      warnings.push(`LOW_COMPONENT_RECALL:${coverage.officialComponentRecall}`);
    }
    if (candidatePath && p2MergedCandidate && coverage.componentIoU < P2_MERGED_COMPONENT_IOU_THRESHOLD) {
      warnings.push(`LOW_P2_MERGED_COMPONENT_IOU:${coverage.componentIoU}`);
    } else if (candidatePath && !p2MergedCandidate && !p2ProductionReviewedCurrentPath && coverage.componentIoU < 0.86) {
      warnings.push(`LOW_COMPONENT_IOU:${coverage.componentIoU}`);
    }
  
    const candidateStatus = warnings.length === 0 ? 'auto-candidate' : 'manual-review';
    const currentPointCount = pathSubpaths(block.imageGeometry.d).reduce((total, points) => total + points.length, 0);
    const candidatePointCount = rings.reduce((total, ring) => total + ring.length, 0);
  
    return {
      id: block.id,
      category: block.category,
      block: block.block,
      name: block.name,
      worksetIds: blockWorksetIds.get(block.id) ?? [],
      status: candidateStatus,
      requiresManualReview: candidateStatus !== 'auto-candidate',
      mode: resolvedCandidate.mode,
      sourcePolicy: SOURCE_POLICY.allowedCoordinateSource,
      doesNotModifyDataFile: true,
      p2ProductionReviewedCurrentPath,
      candidatePath,
      currentPath: block.imageGeometry.d,
      shortLabel: block.imageGeometry.shortLabel,
      labelX: block.imageGeometry.labelX,
      labelY: block.imageGeometry.labelY,
      labelInsideCandidate,
      allowedGroupIds: resolvedCandidate.allowedGroupIds ?? [resolvedCandidate.reference?.componentGroupId].filter(Boolean),
      componentIds: components.map((component) => component.id),
      matchedComponentCount: components.length,
      candidateSubpathCount: rings.length,
      currentSubpathCount: pathSubpaths(block.imageGeometry.d).length,
      expectedSubpathCount: reference?.expectedSubpathCount ?? null,
      currentPointCount,
      candidatePointCount,
      pointCountDelta: candidatePointCount - currentPointCount,
      currentBounds,
      candidateBounds,
      expectedBounds,
      candidateVsCurrentBoundsDelta: boundsDelta(candidateBounds, currentBounds),
      candidateVsReferenceBoundsDelta: boundsDelta(candidateBounds, expectedBounds),
      candidateVsCurrentMaxAbsBoundsDelta: maxAbsBoundsDelta(boundsDelta(candidateBounds, currentBounds)),
      candidateVsReferenceMaxAbsBoundsDelta: maxAbsBoundsDelta(boundsDelta(candidateBounds, expectedBounds)),
      candidateReferenceAreaRatio,
      componentBounds: unionBounds(components.map((component) => component.bounds)),
      componentArea: components.reduce((total, component) => total + component.area, 0),
      ...coverage,
      siblingLabelsInside,
      warnings,
    };
  };
  
  const svgEscape = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  
  const svgPath = (d, stroke, fill, strokeWidth = 2, opacity = 1) => (
    d
      ? `<path d="${svgEscape(d)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" vector-effect="non-scaling-stroke"/>`
      : ''
  );
  
  const candidateStroke = (row) => (row.status === 'auto-candidate' ? '#00a846' : '#f97316');
  
  const fullOverlaySvg = (rows, width, height) => `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <g>
      ${rows.map((row) => svgPath(row.currentPath, '#2563eb', 'rgba(37,99,235,0.10)', 1.2, 0.55)).join('\n')}
    </g>
    <g>
      ${rows.map((row) => svgPath(row.candidatePath, candidateStroke(row), row.status === 'auto-candidate' ? 'rgba(0,168,70,0.16)' : 'rgba(249,115,22,0.18)', 2.2, 0.9)).join('\n')}
    </g>
    <g font-family="Arial, sans-serif" font-size="10" font-weight="700">
      ${rows.map((row) => `<text x="${row.labelX}" y="${row.labelY}" text-anchor="middle" dominant-baseline="middle" fill="#111827" stroke="#fff" stroke-width="2" paint-order="stroke">${svgEscape(row.shortLabel)}</text>`).join('\n')}
    </g>
  </svg>`;
  
  const cropBoundsFor = (row, width, height) => {
    const bounds = unionBounds([row.currentBounds, row.candidateBounds, row.componentBounds]);
    if (!bounds) return null;
    const padding = 28;
    const left = clamp(Math.floor(bounds.minX - padding), 0, width - 1);
    const top = clamp(Math.floor(bounds.minY - padding), 0, height - 1);
    const right = clamp(Math.ceil(bounds.maxX + padding), left + 1, width);
    const bottom = clamp(Math.ceil(bounds.maxY + padding), top + 1, height);
    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
    };
  };
  
  const cropOverlaySvg = (row, crop) => `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="0 0 ${crop.width} ${crop.height}">
    <rect x="0" y="0" width="${crop.width}" height="${crop.height}" fill="rgba(255,255,255,0)"/>
    <g transform="translate(${-crop.left} ${-crop.top})">
      ${svgPath(row.currentPath, '#2563eb', 'rgba(37,99,235,0.14)', 2, 0.65)}
      ${svgPath(row.candidatePath, candidateStroke(row), row.status === 'auto-candidate' ? 'rgba(0,168,70,0.22)' : 'rgba(249,115,22,0.24)', 2.5, 0.95)}
      <circle cx="${row.labelX}" cy="${row.labelY}" r="4" fill="#111827" stroke="#fff" stroke-width="2"/>
    </g>
    <text x="8" y="16" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#111827" stroke="#fff" stroke-width="2" paint-order="stroke">${svgEscape(row.id)} / ${svgEscape(row.status)}</text>
  </svg>`;
  
  const writeCrop = async (row, width, height) => {
    const crop = cropBoundsFor(row, width, height);
    if (!crop) return null;
    const cropPath = path.join(cropDir, `${row.id}.png`);
    await sharp(imagePath)
      .extract(crop)
      .composite([{ input: Buffer.from(cropOverlaySvg(row, crop)), top: 0, left: 0 }])
      .png()
      .toFile(cropPath);
    return path.relative(outDir, cropPath);
  };
  
  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
    if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
    return text;
  };
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
  
  const markdownValue = (value) => (
    value && typeof value === 'object'
      ? `\`${JSON.stringify(value)}\``
      : `\`${value}\``
  );
  
  const hashRows = (rows) => {
    const counts = new Map();
    for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
    return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
  };
  
  const writeReports = async (report, rows, image) => {
    await fs.mkdir(outDir, { recursive: true });
    await fs.mkdir(cropDir, { recursive: true });
  
    const rowsWithCrops = [];
    for (const row of rows) {
      rowsWithCrops.push({
        ...row,
        cropArtifact: await writeCrop(row, image.width, image.height),
      });
    }
  
    const reportWithCrops = {
      ...report,
      rows: rowsWithCrops,
    };
  
    await fs.writeFile(jsonPath, `${JSON.stringify(reportWithCrops, null, 2)}\n`, 'utf8');
  
    const csvHeaders = [
      'id',
      'category',
      'status',
      'mode',
      'worksetIds',
      'componentIds',
      'candidateSubpathCount',
      'candidatePointCount',
      'currentPointCount',
      'pointCountDelta',
      'officialComponentRecall',
      'componentIoU',
      'candidateVsReferenceMaxAbsBoundsDelta',
      'candidateVsCurrentMaxAbsBoundsDelta',
      'warnings',
      'cropArtifact',
    ];
    await fs.writeFile(csvPath, [
      csvHeaders.join(','),
      ...rowsWithCrops.map((row) => csvHeaders.map((header) => csvEscape(row[header])).join(',')),
    ].join('\n'), 'utf8');
  
    const previewRows = rowsWithCrops
      .slice()
      .sort((a, b) => Number(b.requiresManualReview) - Number(a.requiresManualReview) || b.warnings.length - a.warnings.length || a.id.localeCompare(b.id))
      .slice(0, 30)
      .map((row) => [
        `\`${row.id}\``,
        `\`${row.category}\``,
        `\`${row.status}\``,
        `\`${row.mode}\``,
        `\`${row.componentIds.join(',') || '-'}\``,
        `\`${row.officialComponentRecall}\``,
        `\`${row.componentIoU}\``,
        row.warnings.length > 0 ? row.warnings.map((warning) => `\`${warning}\``).join('<br>') : '-',
      ]);
  
    const markdown = [
      '# 광주 공식 PNG 이미지 트레이싱 후보',
      '',
      `- version: \`${SCRIPT_VERSION}\``,
      `- generatedAt: \`${report.generatedAt}\``,
      `- official image: \`${GWANGJU_SEATMAP_IMAGE.imagePath}\``,
      `- coordinate source: \`${SOURCE_POLICY.allowedCoordinateSource}\``,
      `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
      `- candidate rows: \`${rowsWithCrops.length}\``,
      `- expected active trace blocks: \`${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT}\``,
      `- derived K7/AWAY aggregate mode: \`${report.derivedOperatorAggregateMode}\``,
      '',
      '## Summary',
      '',
      markdownTable(
        ['metric', 'value'],
        Object.entries(report.summary).map(([key, value]) => [key, markdownValue(value)]),
      ),
      '',
      '## Source Policy',
      '',
      `- allowed: \`${SOURCE_POLICY.allowedCoordinateSource}\``,
      ...SOURCE_POLICY.disallowedSources.map((source) => `- disallowed: \`${source}\``),
      `- missing baseball data: \`${SOURCE_POLICY.missingBaseballDataContract}\``,
      '',
      '## Artifacts',
      '',
      `- JSON: \`${path.relative(frontendRoot, jsonPath)}\``,
      `- CSV: \`${path.relative(frontendRoot, csvPath)}\``,
      `- overlay: \`${path.relative(frontendRoot, overlayPath)}\``,
      `- crops: \`${path.relative(frontendRoot, cropDir)}\``,
      '',
      '## Review Rows',
      '',
      markdownTable(
        ['id', 'category', 'status', 'mode', 'components', 'recall', 'IoU', 'warnings'],
        previewRows,
      ),
    ].join('\n');
    await fs.writeFile(markdownPath, `${markdown}\n`, 'utf8');
  
    await sharp(imagePath)
      .composite([{ input: Buffer.from(fullOverlaySvg(rowsWithCrops, image.width, image.height)), top: 0, left: 0 }])
      .png()
      .toFile(overlayPath);
  
    return reportWithCrops;
  };
  
  const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const image = { data, width: info.width, height: info.height, channels: info.channels };
  
  if (image.width !== GWANGJU_SEATMAP_IMAGE.imageWidth || image.height !== GWANGJU_SEATMAP_IMAGE.imageHeight) {
    throw new Error(`Official image size mismatch: expected ${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight}, got ${image.width}x${image.height}`);
  }
  
  const componentIndex = buildComponentIndex(image);
  const rows = GWANGJU_BLOCKS.map((block) => blockCandidate(block, componentIndex));
  const statusCounts = hashRows(rows);
  const manualReviewRows = rows.filter((row) => row.requiresManualReview);
  const opRows = rows.filter((row) => ['outfield-left-seats', 'outfield-right-seats', 'bleachers-table-left', 'bleachers-table-right'].includes(row.id));
  const p2BoundaryRows = rows.filter((row) => P2_BOUNDARY_WATCH_BLOCK_IDS.has(row.id));
  
  const report = {
    version: SCRIPT_VERSION,
    generatedAt: new Date().toISOString(),
    doesNotModifyDataFile: true,
    writesOnlyArtifacts: true,
    sourcePolicy: SOURCE_POLICY,
    image: {
      path: GWANGJU_SEATMAP_IMAGE.imagePath,
      width: image.width,
      height: image.height,
      requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
    },
    extractionBounds: SEATMAP_BOUNDS,
    componentGroups: componentIndex.groups.map((group) => ({
      id: group.id,
      label: group.label,
      threshold: group.threshold,
      minArea: group.minArea,
      componentCount: group.components.length,
      components: group.components.map((component) => ({
        id: component.id,
        area: component.area,
        bounds: component.bounds,
        center: component.center,
      })),
    })),
    expectedActiveTraceBlocks: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
    actualCandidateRows: rows.length,
    derivedOperatorAggregateMode: GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.every((range) => range.aggregateHitArea === 'REUSES_EXISTING_TRACE_ONLY')
      ? 'REUSES_EXISTING_TRACE_ONLY'
      : 'UNEXPECTED_AGGREGATE_HIT_AREA',
    zonePrecisionWorksets: GWANGJU_ZONE_PRECISION_WORKSETS.map((workset) => ({
      id: workset.id,
      priority: workset.priority,
      blockCount: workset.blockIds.length,
      acceptanceFocus: workset.acceptanceFocus,
    })),
    opComponentRows: opRows.map((row) => ({
      id: row.id,
      componentIds: row.componentIds,
      officialComponentRecall: row.officialComponentRecall,
      componentIoU: row.componentIoU,
      status: row.status,
      warnings: row.warnings,
    })),
    p2BoundaryWatchRows: p2BoundaryRows.map((row) => ({
      id: row.id,
      status: row.status,
      mode: row.mode,
      p2ProductionReviewedCurrentPath: row.p2ProductionReviewedCurrentPath,
      candidateReferenceAreaRatio: row.candidateReferenceAreaRatio,
      officialComponentRecall: row.officialComponentRecall,
      componentIoU: row.componentIoU,
      warnings: row.warnings,
    })),
    summary: {
      candidateRows: rows.length,
      expectedActiveTraceBlocks: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
      autoCandidateRows: rows.filter((row) => row.status === 'auto-candidate').length,
      manualReviewRows: manualReviewRows.length,
      missingCandidateRows: rows.filter((row) => row.warnings.some((warning) => warning.includes('NO_OFFICIAL_IMAGE_COMPONENT_CANDIDATE'))).length,
      labelOutsideCandidateRows: rows.filter((row) => row.warnings.includes('LABEL_OUTSIDE_CANDIDATE_PATH')).length,
      multiLabelRows: rows.filter((row) => row.warnings.some((warning) => warning.startsWith('MULTIPLE_LABEL_ANCHORS_IN_COMPONENT'))).length,
      opComponentRows: opRows.length,
      opComponentAutoCandidateRows: opRows.filter((row) => row.status === 'auto-candidate').length,
      p2BoundaryWatchRows: p2BoundaryRows.length,
      p2ProductionReviewedCurrentPathRows: p2BoundaryRows.filter((row) => row.p2ProductionReviewedCurrentPath).length,
      p2BoundaryManualReviewRows: p2BoundaryRows.filter((row) => row.requiresManualReview).length,
      p2RowStripeOnlyRows: p2BoundaryRows.filter((row) => row.warnings.some((warning) => warning.startsWith('P2_LABEL_COMPONENT_IS_ROW_STRIPE_ONLY'))).length,
      statusCounts,
    },
  };
  
  const writtenReport = await writeReports(report, rows, image);
  
  console.log(`image_trace_candidates_json:${jsonPath}`);
  console.log(`image_trace_candidates_csv:${csvPath}`);
  console.log(`image_trace_candidates_markdown:${markdownPath}`);
  console.log(`image_trace_candidates_overlay:${overlayPath}`);
  console.log(`statusCounts:${JSON.stringify(writtenReport.summary.statusCounts)}`);
};

const runLowMarginCandidates = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
    GWANGJU_FULL_RETRACE_VERSION,
    GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
    GWANGJU_PENDING_OPERATOR_SECTIONS,
    GWANGJU_PREVIOUS_TRACE_VERSION,
    GWANGJU_SEATMAP_IMAGE,
    GWANGJU_ZONE_PRECISION_WORKSETS,
  } = await import('../src/data/gwangjuSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const traceReviewPath = path.join(reportDir, 'gwangju-seatmap-trace-review.json');
  const outputBase = path.join(reportDir, 'gwangju-seatmap-low-margin-candidates');
  const outputFileNames = {
    json: 'gwangju-seatmap-low-margin-candidates.json',
    csv: 'gwangju-seatmap-low-margin-candidates.csv',
    markdown: 'gwangju-seatmap-low-margin-candidates.md',
  };
  
  const REPORT_VERSION = 'GWANGJU_LOW_MARGIN_CANDIDATES_V1';
  const NUMBERED_PIXEL_ACCEPTANCE_MIN = 0.82;
  const SPECIAL_PIXEL_ACCEPTANCE_MIN = 0.70;
  const NUMBERED_PIXEL_REVIEW_TARGET = 0.92;
  const SPECIAL_PIXEL_REVIEW_TARGET = 0.95;
  const COMPONENT_RECALL_REVIEW_TARGET = 0.88;
  const COMPONENT_IOU_REVIEW_TARGET = 0.70;
  const WATCH_WORKSET_IDS = new Set([
    'p1-op-outfield-component',
    'p2-lower-infield-low-margin',
  ]);
  const NUMBERED_CATEGORIES = new Set([
    'K5',
    'K7',
    'K8',
    'K9',
    'SKY_PICNIC',
    'FIVE_TABLE',
  ]);
  
  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  
  const markdownCell = (value) => String(Array.isArray(value) ? value.join(', ') : value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
  
  const rounded = (value) => (typeof value === 'number' ? Number(value.toFixed(4)) : null);
  const priorityRank = (priority) => Number(priority?.replace('P', '') ?? 99);
  
  const readTraceReview = async () => {
    try {
      return JSON.parse(await fs.readFile(traceReviewPath, 'utf8'));
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  };
  
  const cleanCropPathsByBlockId = (traceReview) => new Map(
    (traceReview?.artifacts?.cleanOverlayArtifacts ?? [])
      .map((artifact) => [artifact.id, path.relative(frontendRoot, artifact.path)]),
  );
  
  const pixelThresholdsFor = (block) => {
    const numbered = NUMBERED_CATEGORIES.has(block.category);
    return {
      acceptanceMinimum: numbered ? NUMBERED_PIXEL_ACCEPTANCE_MIN : SPECIAL_PIXEL_ACCEPTANCE_MIN,
      reviewTarget: numbered ? NUMBERED_PIXEL_REVIEW_TARGET : SPECIAL_PIXEL_REVIEW_TARGET,
      group: numbered ? 'numbered' : 'special-or-outfield',
    };
  };
  
  const createCandidateRow = (block, cleanCropPath) => {
    const pixelThresholds = pixelThresholdsFor(block);
    const componentMinimumRecall = block.officialComponentMinimumRecall;
    const componentMinimumIoU = block.officialComponentMinimumIoU;
    const pixelCoverageRatio = block.pixelCoverageRatio;
    const officialComponentRecall = block.officialComponentRecall;
    const componentIoU = block.componentIoU;
    const reasons = [];
    const blockers = [];
  
    if (typeof pixelCoverageRatio !== 'number') {
      blockers.push('PIXEL_COVERAGE_MISSING');
    } else {
      if (pixelCoverageRatio < pixelThresholds.acceptanceMinimum) {
        blockers.push(`PIXEL_COVERAGE_BELOW_ACCEPTANCE:${pixelCoverageRatio}`);
      }
      if (pixelCoverageRatio <= pixelThresholds.reviewTarget) {
        reasons.push('PIXEL_COVERAGE_REVIEW_TARGET');
      }
    }
  
    if (typeof officialComponentRecall === 'number') {
      if (typeof componentMinimumRecall === 'number' && officialComponentRecall < componentMinimumRecall) {
        blockers.push(`COMPONENT_RECALL_BELOW_ACCEPTANCE:${officialComponentRecall}`);
      }
      if (officialComponentRecall <= COMPONENT_RECALL_REVIEW_TARGET) {
        reasons.push('COMPONENT_RECALL_REVIEW_TARGET');
      }
    }
  
    if (typeof componentIoU === 'number') {
      if (typeof componentMinimumIoU === 'number' && componentIoU < componentMinimumIoU) {
        blockers.push(`COMPONENT_IOU_BELOW_ACCEPTANCE:${componentIoU}`);
      }
      if (componentIoU <= COMPONENT_IOU_REVIEW_TARGET) {
        reasons.push('COMPONENT_IOU_REVIEW_TARGET');
      }
    }
  
    if ((block.zonePrecisionWorksetIds ?? []).some((worksetId) => WATCH_WORKSET_IDS.has(worksetId))) {
      reasons.push('P1_P2_BOUNDARY_WATCH');
    }
  
    const uniqueReasons = [...new Set(reasons)];
    const rowStatus = blockers.length > 0
      ? 'blocking'
      : uniqueReasons.some((reason) => reason.endsWith('_REVIEW_TARGET'))
        ? 'review'
        : uniqueReasons.length > 0
          ? 'watch'
          : 'not-candidate';
    const minimumPriority = (block.zonePrecisionPriorities ?? ['P5'])
      .slice()
      .sort((left, right) => priorityRank(left) - priorityRank(right))[0];
  
    return {
      id: block.id,
      block: block.block,
      category: block.category,
      level: block.level,
      side: block.side,
      fanRole: block.fanRole,
      priority: minimumPriority,
      status: rowStatus,
      reasons: uniqueReasons,
      blockers,
      zonePrecisionWorksetIds: block.zonePrecisionWorksetIds ?? [],
      pixelCoverageGroup: pixelThresholds.group,
      pixelCoverageRatio: rounded(pixelCoverageRatio),
      pixelCoverageAcceptanceMinimum: pixelThresholds.acceptanceMinimum,
      pixelCoverageReviewTarget: pixelThresholds.reviewTarget,
      pixelCoverageAcceptanceMargin: rounded(
        typeof pixelCoverageRatio === 'number'
          ? pixelCoverageRatio - pixelThresholds.acceptanceMinimum
          : null,
      ),
      pixelCoverageReviewTargetMargin: rounded(
        typeof pixelCoverageRatio === 'number'
          ? pixelCoverageRatio - pixelThresholds.reviewTarget
          : null,
      ),
      officialComponentRecall: rounded(officialComponentRecall),
      officialComponentMinimumRecall: rounded(componentMinimumRecall),
      officialComponentRecallReviewTarget: typeof officialComponentRecall === 'number'
        ? COMPONENT_RECALL_REVIEW_TARGET
        : null,
      officialComponentRecallAcceptanceMargin: rounded(
        typeof officialComponentRecall === 'number' && typeof componentMinimumRecall === 'number'
          ? officialComponentRecall - componentMinimumRecall
          : null,
      ),
      officialComponentRecallReviewTargetMargin: rounded(
        typeof officialComponentRecall === 'number'
          ? officialComponentRecall - COMPONENT_RECALL_REVIEW_TARGET
          : null,
      ),
      componentIoU: rounded(componentIoU),
      officialComponentMinimumIoU: rounded(componentMinimumIoU),
      componentIoUReviewTarget: typeof componentIoU === 'number'
        ? COMPONENT_IOU_REVIEW_TARGET
        : null,
      componentIoUAcceptanceMargin: rounded(
        typeof componentIoU === 'number' && typeof componentMinimumIoU === 'number'
          ? componentIoU - componentMinimumIoU
          : null,
      ),
      componentIoUReviewTargetMargin: rounded(
        typeof componentIoU === 'number'
          ? componentIoU - COMPONENT_IOU_REVIEW_TARGET
          : null,
      ),
      previousAnchorDeltaPx: rounded(block.previousAnchorDeltaPx),
      previousBoundsDeltaPx: rounded(block.previousBoundsDeltaPx),
      previousPixelCoverageDelta: rounded(block.previousPixelCoverageDelta),
      expectedBounds: block.expectedBounds,
      cleanOverlayPath: cleanCropPath ?? null,
    };
  };
  
  const traceReview = await readTraceReview();
  const cleanCropByBlockId = cleanCropPathsByBlockId(traceReview);
  const blockRows = traceReview?.blocks ?? [];
  const candidateRows = blockRows
    .map((block) => createCandidateRow(block, cleanCropByBlockId.get(block.id)))
    .filter((row) => row.status !== 'not-candidate')
    .sort((left, right) => (
      priorityRank(left.priority) - priorityRank(right.priority)
      || ['blocking', 'review', 'watch'].indexOf(left.status) - ['blocking', 'review', 'watch'].indexOf(right.status)
      || (left.pixelCoverageRatio ?? 9) - (right.pixelCoverageRatio ?? 9)
      || left.id.localeCompare(right.id)
    ));
  
  const blockers = [
    ...(traceReview ? [] : [`TRACE_REVIEW_MISSING:${path.relative(frontendRoot, traceReviewPath)}`]),
  ];
  
  if (traceReview) {
    if (traceReview.summary?.traceVersion !== GWANGJU_FULL_RETRACE_VERSION) {
      blockers.push(`TRACE_VERSION_MISMATCH:${traceReview.summary?.traceVersion ?? 'missing'}:expected=${GWANGJU_FULL_RETRACE_VERSION}`);
    }
    if (traceReview.summary?.previousTraceVersion !== GWANGJU_PREVIOUS_TRACE_VERSION) {
      blockers.push(`PREVIOUS_TRACE_VERSION_MISMATCH:${traceReview.summary?.previousTraceVersion ?? 'missing'}:expected=${GWANGJU_PREVIOUS_TRACE_VERSION}`);
    }
    if (traceReview.summary?.totalBlocks !== GWANGJU_EXPECTED_TRACE_BLOCK_COUNT) {
      blockers.push(`ACTIVE_BLOCK_COUNT_CHANGED:${traceReview.summary?.totalBlocks ?? 'missing'}`);
    }
    if (traceReview.summary?.overlapWarningCount !== 0) {
      blockers.push(`OVERLAP_WARNINGS_PRESENT:${traceReview.summary?.overlapWarningCount ?? 'missing'}`);
    }
    if (traceReview.summary?.componentCoverageWarningCount !== 0) {
      blockers.push(`COMPONENT_COVERAGE_WARNINGS_PRESENT:${traceReview.summary?.componentCoverageWarningCount ?? 'missing'}`);
    }
    if (traceReview.summary?.zonePrecisionWarningCount !== 0) {
      blockers.push(`ZONE_PRECISION_WARNINGS_PRESENT:${traceReview.summary?.zonePrecisionWarningCount ?? 'missing'}`);
    }
  }
  
  candidateRows
    .filter((row) => row.status === 'blocking')
    .forEach((row) => row.blockers.forEach((blocker) => blockers.push(`${row.id}:${blocker}`)));
  
  if (!GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE) {
    blockers.push('K7_AWAY_DERIVED_RANGE_NOT_REUSING_EXISTING_TRACE');
  }
  if (GWANGJU_PENDING_OPERATOR_SECTIONS.join('|') !== 'K7석|원정응원석') {
    blockers.push(`PENDING_OPERATOR_SECTIONS_CHANGED:${GWANGJU_PENDING_OPERATOR_SECTIONS.join(',')}`);
  }
  
  const status = blockers.length === 0 ? 'passed' : 'failed';
  const candidateRowsByWorkset = GWANGJU_ZONE_PRECISION_WORKSETS.map((workset) => ({
    id: workset.id,
    label: workset.label,
    priority: workset.priority,
    candidateCount: candidateRows.filter((row) => row.zonePrecisionWorksetIds.includes(workset.id)).length,
    reviewCount: candidateRows.filter((row) => row.zonePrecisionWorksetIds.includes(workset.id) && row.status === 'review').length,
    watchCount: candidateRows.filter((row) => row.zonePrecisionWorksetIds.includes(workset.id) && row.status === 'watch').length,
    blockingCount: candidateRows.filter((row) => row.zonePrecisionWorksetIds.includes(workset.id) && row.status === 'blocking').length,
    blockIds: candidateRows
      .filter((row) => row.zonePrecisionWorksetIds.includes(workset.id))
      .map((row) => row.id),
  }));
  
  const report = {
    generatedAt: new Date().toISOString(),
    version: REPORT_VERSION,
    status,
    doesNotModifyDataFile: true,
    asset: {
      imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
      requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
    },
    sourcePolicy: {
      allowedCoordinateSource: 'official PNG 2200x1159 only',
      disallowedSources: [
        'browser CSS pixels',
        'resized screenshots',
        'external crawling',
        'web-search-based baseball data',
        'third-party copied seatmap images',
      ],
      missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    },
    thresholds: {
      numberedPixelAcceptanceMinimum: NUMBERED_PIXEL_ACCEPTANCE_MIN,
      specialPixelAcceptanceMinimum: SPECIAL_PIXEL_ACCEPTANCE_MIN,
      numberedPixelReviewTarget: NUMBERED_PIXEL_REVIEW_TARGET,
      specialPixelReviewTarget: SPECIAL_PIXEL_REVIEW_TARGET,
      componentRecallAcceptanceMinimum: 0.78,
      componentIoUAcceptanceMinimum: 0.62,
      componentRecallReviewTarget: COMPONENT_RECALL_REVIEW_TARGET,
      componentIoUReviewTarget: COMPONENT_IOU_REVIEW_TARGET,
      watchWorksetIds: [...WATCH_WORKSET_IDS],
    },
    summary: {
      activeBlockCount: blockRows.length,
      traceVersion: traceReview?.summary?.traceVersion ?? null,
      previousTraceVersion: traceReview?.summary?.previousTraceVersion ?? null,
      candidateCount: candidateRows.length,
      reviewCandidateCount: candidateRows.filter((row) => row.status === 'review').length,
      watchCandidateCount: candidateRows.filter((row) => row.status === 'watch').length,
      blockingCandidateCount: candidateRows.filter((row) => row.status === 'blocking').length,
      minimumPixelCoverageRatio: traceReview?.summary?.minimumPixelCoverageRatio ?? null,
      minimumOfficialComponentRecall: traceReview?.summary?.minimumOfficialComponentRecall ?? null,
      minimumComponentIoU: traceReview?.summary?.minimumComponentIoU ?? null,
      overlapWarningCount: traceReview?.summary?.overlapWarningCount ?? null,
      componentCoverageWarningCount: traceReview?.summary?.componentCoverageWarningCount ?? null,
      zonePrecisionWarningCount: traceReview?.summary?.zonePrecisionWarningCount ?? null,
      blockers: blockers.length,
    },
    candidatesByWorkset: candidateRowsByWorkset,
    candidates: candidateRows,
    blockers,
  };
  
  const jsonPath = `${outputBase}.json`;
  const csvPath = `${outputBase}.csv`;
  const markdownPath = `${outputBase}.md`;
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  
  const csvRows = [
    [
      'priority',
      'status',
      'id',
      'block',
      'category',
      'reasons',
      'zonePrecisionWorksetIds',
      'pixelCoverageRatio',
      'pixelCoverageAcceptanceMargin',
      'pixelCoverageReviewTargetMargin',
      'officialComponentRecall',
      'officialComponentRecallAcceptanceMargin',
      'officialComponentRecallReviewTargetMargin',
      'componentIoU',
      'componentIoUAcceptanceMargin',
      'componentIoUReviewTargetMargin',
      'previousBoundsDeltaPx',
      'previousAnchorDeltaPx',
      'cleanOverlayPath',
    ],
    ...candidateRows.map((row) => [
      row.priority,
      row.status,
      row.id,
      row.block,
      row.category,
      row.reasons,
      row.zonePrecisionWorksetIds,
      row.pixelCoverageRatio,
      row.pixelCoverageAcceptanceMargin,
      row.pixelCoverageReviewTargetMargin,
      row.officialComponentRecall,
      row.officialComponentRecallAcceptanceMargin,
      row.officialComponentRecallReviewTargetMargin,
      row.componentIoU,
      row.componentIoUAcceptanceMargin,
      row.componentIoUReviewTargetMargin,
      row.previousBoundsDeltaPx,
      row.previousAnchorDeltaPx,
      row.cleanOverlayPath,
    ]),
  ];
  await fs.writeFile(csvPath, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');
  
  const markdown = [
    '# 광주 low-margin polygon candidates',
    '',
    `- version: \`${REPORT_VERSION}\``,
    `- status: \`${status}\``,
    `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
    '- coordinate source: official PNG `2200x1159` only',
    '- disallowed sources: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images',
    '- missing baseball data contract: `MANUAL_BASEBALL_DATA_REQUIRED`',
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      Object.entries(report.summary).map(([key, value]) => [key, `\`${value}\``]),
    ),
    '',
    '## Thresholds',
    '',
    markdownTable(
      ['threshold', 'value'],
      Object.entries(report.thresholds).map(([key, value]) => [key, `\`${Array.isArray(value) ? value.join(',') : value}\``]),
    ),
    '',
    '## Candidates By Workset',
    '',
    markdownTable(
      ['priority', 'workset', 'candidates', 'review', 'watch', 'blocking', 'block ids'],
      candidateRowsByWorkset.map((workset) => [
        `\`${workset.priority}\``,
        `\`${workset.id}\``,
        `\`${workset.candidateCount}\``,
        `\`${workset.reviewCount}\``,
        `\`${workset.watchCount}\``,
        `\`${workset.blockingCount}\``,
        workset.blockIds.join(', '),
      ]),
    ),
    '',
    '## Candidate Rows',
    '',
    candidateRows.length > 0
      ? markdownTable(
        ['priority', 'status', 'id', 'block', 'reasons', 'pixel', 'pixel margin', 'recall', 'recall margin', 'IoU', 'IoU margin', 'evidence'],
        candidateRows.map((row) => [
          `\`${row.priority}\``,
          `\`${row.status}\``,
          `\`${row.id}\``,
          row.block,
          row.reasons.join(', '),
          row.pixelCoverageRatio,
          row.pixelCoverageAcceptanceMargin,
          row.officialComponentRecall,
          row.officialComponentRecallAcceptanceMargin,
          row.componentIoU,
          row.componentIoUAcceptanceMargin,
          row.cleanOverlayPath,
        ]),
      )
      : 'No low-margin candidates.',
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
    '',
  ].join('\n');
  
  await fs.writeFile(markdownPath, markdown, 'utf8');
  
  console.log(`low_margin_candidates_json:${jsonPath}`);
  console.log(`low_margin_candidates_csv:${csvPath}`);
  console.log(`low_margin_candidates_markdown:${markdownPath}`);
  console.log(`status:${status} candidates=${candidateRows.length} review=${report.summary.reviewCandidateCount} watch=${report.summary.watchCandidateCount} blockers=${blockers.length}`);
  
  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runZonePrecisionWorksets = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    GWANGJU_BLOCKS,
    GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
    GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
    GWANGJU_FULL_RETRACE_VERSION,
    GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
    GWANGJU_PENDING_OPERATOR_SECTIONS,
    GWANGJU_PREVIOUS_TRACE_VERSION,
    GWANGJU_SEATMAP_IMAGE,
    GWANGJU_ZONE_PRECISION_WORKSETS,
  } = await import('../src/data/gwangjuSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const traceReviewPath = path.join(reportDir, 'gwangju-seatmap-trace-review.json');
  const outputBase = path.join(reportDir, 'gwangju-seatmap-zone-precision-worksets');
  const outputFileNames = {
    json: 'gwangju-seatmap-zone-precision-worksets.json',
    csv: 'gwangju-seatmap-zone-precision-worksets.csv',
    markdown: 'gwangju-seatmap-zone-precision-worksets.md',
    svg: 'gwangju-seatmap-zone-precision-worksets.svg',
  };
  const WORKSET_VERSION = 'GWANGJU_ZONE_PRECISION_WORKSETS_V1';
  const REPEATED_NUMBERED_BLOCK_WORKSET_ID = 'p4-repeated-numbered-blocks';
  const REPEATED_NUMBERED_BLOCK_EXPECTED_COUNT = 70;
  const REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE = 0.98;
  const REPEATED_NUMBERED_BLOCK_CATEGORIES = new Set(['SKY_PICNIC', 'FIVE_TABLE']);
  
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
  
  const svgEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  
  const readTraceReview = async () => {
    try {
      return JSON.parse(await fs.readFile(traceReviewPath, 'utf8'));
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  };
  
  const traceReview = await readTraceReview();
  const manifestWorksets = new Map((traceReview?.zonePrecisionWorksets ?? []).map((workset) => [workset.id, workset]));
  const manifestBlocks = new Map((traceReview?.blocks ?? []).map((block) => [block.id, block]));
  
  const worksetRows = GWANGJU_ZONE_PRECISION_WORKSETS.map((workset, index) => {
    const manifestWorkset = manifestWorksets.get(workset.id);
    const blocks = workset.blockIds.map((blockId) => manifestBlocks.get(blockId)).filter(Boolean);
    const missingBlockIds = workset.blockIds.filter((blockId) => !manifestBlocks.has(blockId));
    const traceVersionFailures = blocks
      .filter((block) => block.traceVersion !== GWANGJU_FULL_RETRACE_VERSION)
      .map((block) => `${block.id}:${block.traceVersion}`);
    const previousVersionFailures = blocks
      .filter((block) => block.previousTraceVersion !== GWANGJU_PREVIOUS_TRACE_VERSION)
      .map((block) => `${block.id}:${block.previousTraceVersion}`);
    const readinessFailures = blocks
      .filter((block) => (
        block.traceStatus !== 'OFFICIAL_IMAGE_TRACED'
        || block.manualReviewed !== true
        || block.pixelAlignmentStatus !== 'PIXEL_ALIGNED'
      ))
      .map((block) => block.id);
    const componentFailures = blocks
      .filter((block) => block.componentCoverageStatus === 'failed')
      .map((block) => block.id);
    const blockers = [
      ...(manifestWorkset ? [] : [`WORKSET_MISSING_FROM_TRACE_MANIFEST:${workset.id}`]),
      ...(manifestWorkset && manifestWorkset.status !== 'passed'
        ? [`TRACE_MANIFEST_WORKSET_NOT_PASSED:${workset.id}:${manifestWorkset.status}`]
        : []),
      ...missingBlockIds.map((blockId) => `MISSING_BLOCK:${blockId}`),
      ...traceVersionFailures.map((failure) => `TRACE_VERSION_MISMATCH:${failure}:expected=${GWANGJU_FULL_RETRACE_VERSION}`),
      ...previousVersionFailures.map((failure) => `PREVIOUS_TRACE_VERSION_MISMATCH:${failure}:expected=${GWANGJU_PREVIOUS_TRACE_VERSION}`),
      ...readinessFailures.map((blockId) => `BLOCK_NOT_RELEASE_READY:${blockId}`),
      ...componentFailures.map((blockId) => `COMPONENT_COVERAGE_FAILED:${blockId}`),
    ];
    if (workset.id === REPEATED_NUMBERED_BLOCK_WORKSET_ID) {
      if (blocks.length !== REPEATED_NUMBERED_BLOCK_EXPECTED_COUNT) {
        blockers.push(`REPEATED_BLOCK_COUNT_CHANGED:${blocks.length}`);
      }
      blocks
        .filter((block) => !REPEATED_NUMBERED_BLOCK_CATEGORIES.has(block.category))
        .forEach((block) => blockers.push(`REPEATED_BLOCK_CATEGORY_UNEXPECTED:${block.id}:${block.category}`));
      blocks
        .filter((block) => block.pixelCoverageRatio < REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE)
        .forEach((block) => blockers.push(`REPEATED_BLOCK_PIXEL_COVERAGE_BELOW_LOCK:${block.id}:${block.pixelCoverageRatio}`));
      (manifestWorkset?.lowMarginRows ?? [])
        .forEach((row) => blockers.push(`REPEATED_BLOCK_LOW_MARGIN_ROW:${row.id}`));
    }
  
    return {
      order: index + 1,
      id: workset.id,
      label: workset.label,
      priority: workset.priority,
      expectedBlockCount: workset.blockIds.length,
      activeBlockCount: blocks.length,
      blockIds: workset.blockIds,
      acceptanceFocus: workset.acceptanceFocus,
      note: workset.note,
      minimumPixelCoverageRatio: manifestWorkset?.minimumPixelCoverageRatio ?? null,
      minimumOfficialComponentRecall: manifestWorkset?.minimumOfficialComponentRecall ?? null,
      minimumComponentIoU: manifestWorkset?.minimumComponentIoU ?? null,
      lowMarginRows: manifestWorkset?.lowMarginRows ?? [],
      repeatedBlockPixelCoverageMinimum: workset.id === REPEATED_NUMBERED_BLOCK_WORKSET_ID
        ? REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE
        : null,
      status: blockers.length === 0 ? 'passed' : 'failed',
      blockers,
    };
  });
  
  const blockers = [
    ...(traceReview ? [] : [`TRACE_REVIEW_MISSING:${path.relative(frontendRoot, traceReviewPath)}`]),
  ];
  
    if (traceReview) {
    if (traceReview.summary?.traceVersion !== GWANGJU_FULL_RETRACE_VERSION) {
      blockers.push(`TRACE_REVIEW_VERSION_MISMATCH:${traceReview.summary?.traceVersion ?? 'missing'}:expected=${GWANGJU_FULL_RETRACE_VERSION}`);
    }
    if (traceReview.summary?.previousTraceVersion !== GWANGJU_PREVIOUS_TRACE_VERSION) {
      blockers.push(`TRACE_REVIEW_PREVIOUS_VERSION_MISMATCH:${traceReview.summary?.previousTraceVersion ?? 'missing'}:expected=${GWANGJU_PREVIOUS_TRACE_VERSION}`);
    }
    if (traceReview.summary?.totalBlocks !== GWANGJU_EXPECTED_TRACE_BLOCK_COUNT) {
      blockers.push(`ACTIVE_BLOCK_COUNT_CHANGED:${traceReview.summary?.totalBlocks ?? 'missing'}`);
    }
    if (traceReview.summary?.overlapWarningCount !== 0) {
      blockers.push(`OVERLAP_WARNINGS_PRESENT:${traceReview.summary?.overlapWarningCount ?? 'missing'}`);
    }
    if (traceReview.summary?.componentCoverageWarningCount !== 0) {
      blockers.push(`COMPONENT_COVERAGE_WARNINGS_PRESENT:${traceReview.summary?.componentCoverageWarningCount ?? 'missing'}`);
    }
    if (traceReview.summary?.zonePrecisionWarningCount !== 0) {
      blockers.push(`ZONE_PRECISION_WARNINGS_PRESENT:${traceReview.summary?.zonePrecisionWarningCount ?? 'missing'}`);
    }
  }
  
  worksetRows.forEach((workset) => {
    workset.blockers.forEach((blocker) => blockers.push(`${workset.id}:${blocker}`));
  });
  
  if (!GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE) {
    blockers.push('K7_AWAY_DERIVED_RANGE_NOT_REUSING_EXISTING_TRACE');
  }
  if (GWANGJU_PENDING_OPERATOR_SECTIONS.length !== 0) {
    blockers.push(`PENDING_OPERATOR_SECTIONS_CHANGED:${GWANGJU_PENDING_OPERATOR_SECTIONS.join(',')}`);
  }
  if (GWANGJU_BLOCKS.length !== 113) {
    blockers.push(`ACTIVE_DATA_BLOCK_COUNT_CHANGED:${GWANGJU_BLOCKS.length}`);
  }
  
  const status = blockers.length === 0 ? 'passed' : 'failed';
  const report = {
    generatedAt: new Date().toISOString(),
    version: WORKSET_VERSION,
    status,
    doesNotModifyDataFile: true,
    asset: {
      imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
      requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
    },
    sourcePolicy: {
      allowedCoordinateSource: 'official PNG 2200x1159 only',
      disallowedSources: [
        'browser CSS pixels',
        'resized screenshots',
        'external crawling',
        'web-search-based baseball data',
        'third-party copied seatmap images',
      ],
      missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    },
    releaseContract: {
      traceVersion: GWANGJU_FULL_RETRACE_VERSION,
      previousTraceVersion: GWANGJU_PREVIOUS_TRACE_VERSION,
      activeBlockCount: GWANGJU_BLOCKS.length,
      expectedTraceBlockCount: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
      aggregateHitAreaMode: GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE
        ? 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY'
        : 'INDEPENDENT_POLYGON',
      pendingOperatorSections: GWANGJU_PENDING_OPERATOR_SECTIONS,
      derivedOperatorRanges: GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.map((range) => ({
        id: range.id,
        displayBlocks: range.displayBlocks,
        aggregateHitArea: range.aggregateHitArea,
        operatorPolygonStatus: range.operatorPolygonStatus,
      })),
    },
    legacyLayerContract: {
      runtimeSeatLayerSource: 'GWANGJU_BLOCKS[].imageGeometry.d',
      forbiddenRuntimeHitAreaSources: [
        'GWANGJU_IMAGE_GEOMETRY_DRAFTS',
        'GWANGJU_OFFICIAL_TRACE_REFERENCE',
        'gwangju-seatmap-operator-template.json',
        'marker-only zones',
      ],
      markerOnlyZonesRemainSeparate: true,
      k7AwayAggregatePolygonStatus: 'OFFICIAL_DERIVED_READY',
    },
    summary: {
      worksetCount: worksetRows.length,
      passedWorksets: worksetRows.filter((workset) => workset.status === 'passed').length,
      failedWorksets: worksetRows.filter((workset) => workset.status !== 'passed').length,
      totalLowMarginRows: worksetRows.reduce((total, workset) => total + workset.lowMarginRows.length, 0),
      traceReviewVersion: traceReview?.summary?.traceVersion ?? null,
      traceReviewZonePrecisionStatus: traceReview?.summary?.zonePrecisionStatus ?? null,
      traceReviewZonePrecisionWarnings: traceReview?.summary?.zonePrecisionWarningCount ?? null,
      minimumPixelCoverageRatio: traceReview?.summary?.minimumPixelCoverageRatio ?? null,
      minimumOfficialComponentRecall: traceReview?.summary?.minimumOfficialComponentRecall ?? null,
      minimumComponentIoU: traceReview?.summary?.minimumComponentIoU ?? null,
      repeatedNumberedBlockPixelCoverageMinimum: REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE,
      repeatedNumberedBlockMinimumPixelCoverageRatio: worksetRows
        .find((workset) => workset.id === REPEATED_NUMBERED_BLOCK_WORKSET_ID)?.minimumPixelCoverageRatio ?? null,
    },
    worksets: worksetRows,
    blockers,
  };
  
  const jsonPath = `${outputBase}.json`;
  const csvPath = `${outputBase}.csv`;
  const markdownPath = `${outputBase}.md`;
  const svgPath = `${outputBase}.svg`;
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'order',
      'id',
      'label',
      'priority',
      'status',
      'activeBlockCount',
      'expectedBlockCount',
      'minimumPixelCoverageRatio',
      'minimumOfficialComponentRecall',
      'minimumComponentIoU',
      'lowMarginRows',
      'acceptanceFocus',
      'blockers',
      'blockIds',
    ],
    ...worksetRows.map((workset) => [
      workset.order,
      workset.id,
      workset.label,
      workset.priority,
      workset.status,
      workset.activeBlockCount,
      workset.expectedBlockCount,
      workset.minimumPixelCoverageRatio ?? '',
      workset.minimumOfficialComponentRecall ?? '',
      workset.minimumComponentIoU ?? '',
      workset.lowMarginRows.map((row) => row.id).join('|'),
      workset.acceptanceFocus.join('|'),
      workset.blockers.join('|'),
      workset.blockIds.join('|'),
    ]),
  ]);
  
  const markdown = [
    '# 광주 구역별 polygon precision worksets',
    '',
    `- version: \`${WORKSET_VERSION}\``,
    `- status: \`${status}\``,
    `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
    `- official PNG: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
    `- trace version: \`${GWANGJU_FULL_RETRACE_VERSION}\``,
    `- previous trace version: \`${GWANGJU_PREVIOUS_TRACE_VERSION}\``,
    `- active blocks: \`${GWANGJU_BLOCKS.length}\``,
    `- aggregate hit-area: \`${report.releaseContract.aggregateHitAreaMode}\``,
    `- pending operator sections: \`${GWANGJU_PENDING_OPERATOR_SECTIONS.join(', ')}\``,
    `- P4 repeated block pixel coverage lock: \`${report.summary.repeatedNumberedBlockMinimumPixelCoverageRatio?.toFixed(4) ?? '-'} / ${REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE.toFixed(2)}\``,
    `- blockers: \`${blockers.length}\``,
    '',
    '## Worksets',
    '',
    markdownTable(
      ['order', 'id', 'priority', 'active', 'min coverage', 'min recall', 'min IoU', 'low margin', 'status', 'focus'],
      worksetRows.map((workset) => [
        String(workset.order),
        `\`${workset.id}\``,
        workset.priority,
        `${workset.activeBlockCount}/${workset.expectedBlockCount}`,
        workset.minimumPixelCoverageRatio === null ? '-' : workset.minimumPixelCoverageRatio.toFixed(4),
        workset.minimumOfficialComponentRecall === null ? '-' : workset.minimumOfficialComponentRecall.toFixed(4),
        workset.minimumComponentIoU === null ? '-' : workset.minimumComponentIoU.toFixed(4),
        workset.lowMarginRows.map((row) => `\`${row.id}\``).join('<br>') || '-',
        `\`${workset.status}\``,
        workset.acceptanceFocus.map((focus) => `\`${focus}\``).join('<br>'),
      ]),
    ),
    '',
    '## Legacy Layer Contract',
    '',
    '- 일반 좌석 layer는 `GWANGJU_BLOCKS[].imageGeometry.d`만 hit-area로 렌더링한다.',
    '- `GWANGJU_IMAGE_GEOMETRY_DRAFTS`, `GWANGJU_OFFICIAL_TRACE_REFERENCE`, operator template, marker-only zone은 런타임 hit-area source가 아니다.',
    '- `K7석`, `원정응원석`은 독립 aggregate polygon 없이 derived range로만 유지한다.',
    '',
    '## Source Policy',
    '',
    '- 공식 PNG `2200x1159` 좌표만 허용한다.',
    '- CSS pixel, resized screenshot, external crawling, web-search-based baseball data, third-party copied seatmap image 좌표는 금지한다.',
    '- 야구 운영 데이터가 비어 있거나 불명확하면 `MANUAL_BASEBALL_DATA_REQUIRED` 계약을 유지한다.',
    '',
  ].join('\n');
  
  await fs.writeFile(markdownPath, markdown, 'utf8');
  
  const barHeight = 58;
  const width = 980;
  const height = 110 + (worksetRows.length * barHeight);
  const svgRows = worksetRows.map((workset, index) => {
    const y = 72 + (index * barHeight);
    const ratio = workset.expectedBlockCount === 0 ? 0 : workset.activeBlockCount / workset.expectedBlockCount;
    const fill = workset.status === 'passed' ? '#16a34a' : '#dc2626';
    return [
      `<text x="24" y="${y}" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#111827">${svgEscape(`${workset.order}. ${workset.label}`)}</text>`,
      `<rect x="24" y="${y + 12}" width="420" height="14" rx="3" fill="#e5e7eb" />`,
      `<rect x="24" y="${y + 12}" width="${Math.round(420 * ratio)}" height="14" rx="3" fill="${fill}" />`,
      `<text x="462" y="${y + 24}" font-family="Arial, sans-serif" font-size="12" fill="#334155">${svgEscape(`${workset.activeBlockCount}/${workset.expectedBlockCount} · ${workset.status}`)}</text>`,
      `<text x="650" y="${y + 24}" font-family="Arial, sans-serif" font-size="12" fill="#334155">${svgEscape(workset.acceptanceFocus.join(', '))}</text>`,
    ].join('\n');
  }).join('\n');
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gwangju zone precision worksets">`,
    '<rect width="100%" height="100%" fill="#f8fafc" />',
    `<text x="24" y="36" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#0f172a">${svgEscape('광주 구역별 polygon precision worksets')}</text>`,
    `<text x="24" y="58" font-family="Arial, sans-serif" font-size="12" fill="#475569">${svgEscape(`${GWANGJU_FULL_RETRACE_VERSION} · official PNG ${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight} · status=${status}`)}</text>`,
    svgRows,
    '</svg>',
  ].join('\n');
  await fs.writeFile(svgPath, svg, 'utf8');
  
  console.log(`zone_precision_worksets_json:${jsonPath}`);
  console.log(`zone_precision_worksets_csv:${csvPath}`);
  console.log(`zone_precision_worksets_markdown:${markdownPath}`);
  console.log(`zone_precision_worksets_svg:${svgPath}`);
  console.log(`status:${status} worksets=${worksetRows.length} blockers=${blockers.length} active=${GWANGJU_BLOCKS.length}`);
  if (status !== 'passed') {
    process.exitCode = 1;
  }
};

const taskRunners = {
  'browser-evidence': runBrowserEvidence,
  'evidence-inventory': runEvidenceInventory,
  'image-trace-candidates': runImageTraceCandidates,
  'low-margin-candidates': runLowMarginCandidates,
  'zone-precision-worksets': runZonePrecisionWorksets,
};

const withTaskArgs = async (args, runner) => {
  const originalArgv = process.argv;
  process.argv = [originalArgv[0] ?? 'node', fileURLToPath(import.meta.url), ...args];
  try {
    await runner();
  } finally {
    process.argv = originalArgv;
  }
};

export const runGwangjuEvidenceWorksetTask = async (task, args = process.argv.slice(2)) => {
  const runner = taskRunners[task];
  if (!runner) {
    throw new Error(`Unknown Gwangju evidence/workset task: ${task ?? '(missing)'}`);
  }

  await withTaskArgs(args, runner);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [task, ...args] = process.argv.slice(2);
  await runGwangjuEvidenceWorksetTask(task, args);
}
