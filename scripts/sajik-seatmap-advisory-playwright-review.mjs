import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO,
  SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO,
  SAJIK_BLOCKS,
  SAJIK_CATEGORIES,
  SAJIK_SEATMAP_IMAGE,
} from '../src/data/sajikSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const playwrightOutDir = path.join(repoRoot, 'output/playwright/sajik-seatmap-advisory-review');
const alignmentAuditPath = path.join(reportDir, 'sajik-seatmap-alignment-audit.json');
const imagePath = path.resolve(frontendRoot, SAJIK_SEATMAP_IMAGE.imagePath);

const htmlPath = path.join(reportDir, 'sajik-seatmap-advisory-playwright-review.html');
const jsonPath = path.join(reportDir, 'sajik-seatmap-advisory-playwright-review.json');
const markdownPath = path.join(reportDir, 'sajik-seatmap-advisory-playwright-review.md');

const REVIEW_VERSION = 'SAJIK_ADVISORY_PLAYWRIGHT_REVIEW_V1';

const ADVISORY_GROUPS = [
  {
    id: 'central-lower',
    title: 'Central lower advisory',
    blocks: ['011'],
  },
];

const htmlEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const xmlEscape = htmlEscape;

const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.join(' | ')} |`),
].join('\n');

const pathPoints = (pathData) => {
  const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
};

const pathBounds = (pathData) => {
  const points = pathPoints(pathData);
  return {
    minX: Math.min(...points.map((point) => point[0])),
    minY: Math.min(...points.map((point) => point[1])),
    maxX: Math.max(...points.map((point) => point[0])),
    maxY: Math.max(...points.map((point) => point[1])),
  };
};

const pointInPolygon = (point, polygon) => {
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

const sortedBlocks = [...SAJIK_BLOCKS]
  .filter((block) => block.mapInteractionStatus === 'MAP_SELECTABLE')
  .sort((left, right) => left.displayPriority - right.displayPriority);
const topHitBlockAt = (point) => {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  let topBlock = null;
  sortedBlocks.forEach((block) => {
    if (pointInPolygon([point.x, point.y], pathPoints(block.imageGeometry.d))) {
      topBlock = block;
    }
  });
  return topBlock;
};

const classifyAdvisory = (row) => {
  if (row.candidateStatus !== 'PIXEL_CANDIDATE_READY') {
    return 'SEED_MISSING_OR_TEXT_ONLY';
  }

  const candidateTopHit = topHitBlockAt(row.candidateCenter);
  if (candidateTopHit && candidateTopHit.block !== row.block) {
    return 'CANDIDATE_SEED_SELECTED_NEIGHBOR';
  }

  const lowInside = row.componentInsidePathRatio < SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO;
  const lowCoverage = row.pathColorCoverageRatio < SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO;
  if (lowInside && !lowCoverage) {
    return 'CANDIDATE_COMPONENT_OVER_EXPANDED';
  }
  if (!lowInside && lowCoverage) {
    return 'PATH_COLOR_UNDER_COVERED';
  }
  if (lowInside && lowCoverage) {
    return 'MANUAL_CROP_REVIEW_REQUIRED';
  }
  return 'ADVISORY_ONLY';
};

const expandBounds = (bounds, padding = 28) => ({
  minX: Math.max(0, Math.floor(bounds.minX - padding)),
  minY: Math.max(0, Math.floor(bounds.minY - padding)),
  maxX: Math.min(SAJIK_SEATMAP_IMAGE.imageWidth, Math.ceil(bounds.maxX + padding)),
  maxY: Math.min(SAJIK_SEATMAP_IMAGE.imageHeight, Math.ceil(bounds.maxY + padding)),
});

const unionBounds = (boundsList) => {
  const validBounds = boundsList.filter(Boolean);
  if (validBounds.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: SAJIK_SEATMAP_IMAGE.imageWidth,
      maxY: SAJIK_SEATMAP_IMAGE.imageHeight,
    };
  }
  return {
    minX: Math.min(...validBounds.map((bounds) => bounds.minX)),
    minY: Math.min(...validBounds.map((bounds) => bounds.minY)),
    maxX: Math.max(...validBounds.map((bounds) => bounds.maxX)),
    maxY: Math.max(...validBounds.map((bounds) => bounds.maxY)),
  };
};

const blockByBlock = new Map(SAJIK_BLOCKS.map((block) => [block.block, block]));
const imageBuffer = await fs.readFile(imagePath);
const imageDataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
const alignmentAudit = JSON.parse(await fs.readFile(alignmentAuditPath, 'utf8'));
const advisoryRows = (alignmentAudit.blocks ?? [])
  .filter((row) => Array.isArray(row.pixelAdvisoryReasons) && row.pixelAdvisoryReasons.length > 0)
  .map((row) => {
    const block = blockByBlock.get(row.block);
    const classification = classifyAdvisory(row);
    return {
      ...row,
      blockData: block,
      classification,
      currentBounds: block ? pathBounds(block.imageGeometry.d) : row.currentPathBounds,
      candidateTopHitBlock: topHitBlockAt(row.candidateCenter)?.block ?? null,
    };
  });

const advisoryByBlock = new Map(advisoryRows.map((row) => [row.block, row]));

const renderMetricPill = (label, value, failed) => `
  <span class="metric ${failed ? 'failed' : 'ok'}">${htmlEscape(label)} ${htmlEscape(value)}</span>`;

const renderBlockTable = (rows) => `
<table>
  <thead>
    <tr>
      <th>block</th>
      <th>class</th>
      <th>reasons</th>
      <th>candidate hit</th>
      <th>inside</th>
      <th>coverage</th>
    </tr>
  </thead>
  <tbody>
    ${rows.map((row) => `
    <tr>
      <td><code>${htmlEscape(row.block)}</code></td>
      <td>${htmlEscape(row.classification)}</td>
      <td>${htmlEscape(row.pixelAdvisoryReasons.join(', '))}</td>
      <td>${htmlEscape(row.candidateTopHitBlock ?? '-')}</td>
      <td>${row.componentInsidePathRatio}</td>
      <td>${row.pathColorCoverageRatio}</td>
    </tr>`).join('')}
  </tbody>
</table>`;

const renderOverlay = ({ id, title, rows, bounds }) => {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const visibleBlocks = SAJIK_BLOCKS.filter((block) => {
    const blockBounds = pathBounds(block.imageGeometry.d);
    return blockBounds.maxX >= bounds.minX
      && blockBounds.minX <= bounds.maxX
      && blockBounds.maxY >= bounds.minY
      && blockBounds.minY <= bounds.maxY;
  });
  const advisoryBlocks = new Set(rows.map((row) => row.block));

  return `
<section class="review-panel" data-panel-id="${htmlEscape(id)}">
  <div class="panel-header">
    <div>
      <h2>${htmlEscape(title)}</h2>
      <p>official crop=${bounds.minX},${bounds.minY},${width},${height} · orange=current polygon · cyan=official pixel candidate · red=label anchor</p>
    </div>
    <div class="panel-count">${rows.length} advisory blocks</div>
  </div>
  <svg class="seatmap-overlay" viewBox="${bounds.minX} ${bounds.minY} ${width} ${height}" width="1120" height="${Math.max(260, Math.round((height / width) * 1120))}">
    <image href="${imageDataUrl}" x="0" y="0" width="${SAJIK_SEATMAP_IMAGE.imageWidth}" height="${SAJIK_SEATMAP_IMAGE.imageHeight}" preserveAspectRatio="none" />
    ${visibleBlocks.map((block) => {
      const isAdvisory = advisoryBlocks.has(block.block);
      const category = SAJIK_CATEGORIES[block.category];
      return `<path d="${xmlEscape(block.imageGeometry.d)}" fill="${category?.light ?? '#38bdf8'}" fill-opacity="${isAdvisory ? '0.35' : '0.04'}" stroke="${isAdvisory ? '#ea580c' : '#64748b'}" stroke-opacity="${isAdvisory ? '0.95' : '0.18'}" stroke-width="${isAdvisory ? '2.2' : '1'}" vector-effect="non-scaling-stroke" />`;
    }).join('')}
    ${rows.map((row) => row.candidateOuterBoundaryPath
    ? `<path d="${xmlEscape(row.candidateOuterBoundaryPath)}" fill="none" stroke="#06b6d4" stroke-width="1.8" stroke-dasharray="5 4" vector-effect="non-scaling-stroke" />`
    : '').join('')}
    ${rows.map((row) => {
      const block = row.blockData;
      if (!block) return '';
      return `
      <circle cx="${block.imageGeometry.labelX}" cy="${block.imageGeometry.labelY}" r="3" fill="#ef4444" stroke="#ffffff" stroke-width="1.2" vector-effect="non-scaling-stroke" />
      <text x="${block.imageGeometry.labelX + 5}" y="${block.imageGeometry.labelY - 5}" font-size="10" font-family="Arial, sans-serif" font-weight="900" fill="#7c2d12" stroke="#ffffff" stroke-width="2.8" paint-order="stroke">${xmlEscape(block.imageGeometry.shortLabel)}</text>`;
    }).join('')}
  </svg>
  <div class="metric-row">
    ${renderMetricPill('min inside', SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO, false)}
    ${renderMetricPill('min coverage', SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO, false)}
    ${renderMetricPill('warnings', rows.length, rows.length > 0)}
  </div>
  ${renderBlockTable(rows)}
</section>`;
};

const groupReports = ADVISORY_GROUPS.map((group) => {
  const rows = group.blocks.map((block) => advisoryByBlock.get(block)).filter(Boolean);
  const bounds = expandBounds(unionBounds(rows.flatMap((row) => [
    row.currentBounds,
    row.candidateBbox,
  ])), 26);
  return {
    ...group,
    rows,
    bounds,
    screenshotPath: path.join(playwrightOutDir, `sajik-advisory-${group.id}.png`),
  };
});

const fullBounds = expandBounds(unionBounds(advisoryRows.flatMap((row) => [
  row.currentBounds,
  row.candidateBbox,
])), 36);

const classificationCounts = advisoryRows.reduce((counts, row) => {
  counts[row.classification] = (counts[row.classification] ?? 0) + 1;
  return counts;
}, {});

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sajik seatmap advisory Playwright review</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Arial, "Apple SD Gothic Neo", sans-serif;
      color: #0f172a;
      background: #f8fafc;
    }
    body {
      margin: 0;
      padding: 24px;
      background: #f8fafc;
    }
    h1, h2, p {
      margin: 0;
    }
    h1 {
      font-size: 24px;
      line-height: 1.2;
    }
    h2 {
      font-size: 18px;
      line-height: 1.2;
    }
    p {
      margin-top: 6px;
      color: #475569;
      font-size: 12px;
      font-weight: 700;
    }
    .summary, .review-panel {
      width: 1120px;
      box-sizing: border-box;
      margin: 0 0 18px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      overflow: hidden;
    }
    .summary {
      padding: 18px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 16px;
    }
    .summary-cell {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px;
      background: #f8fafc;
    }
    .summary-cell strong {
      display: block;
      margin-bottom: 4px;
      color: #0f172a;
      font-size: 18px;
    }
    .summary-cell span {
      color: #475569;
      font-size: 11px;
      font-weight: 800;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding: 14px 16px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .panel-count {
      white-space: nowrap;
      padding: 6px 8px;
      border-radius: 6px;
      background: #fff7ed;
      color: #9a3412;
      font-size: 12px;
      font-weight: 900;
    }
    .seatmap-overlay {
      display: block;
      width: 100%;
      height: auto;
      background: #0f172a;
    }
    .metric-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 16px 0;
    }
    .metric {
      display: inline-flex;
      padding: 5px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 900;
      border: 1px solid #bbf7d0;
      background: #f0fdf4;
      color: #166534;
    }
    .metric.failed {
      border-color: #fed7aa;
      background: #fff7ed;
      color: #9a3412;
    }
    table {
      width: calc(100% - 32px);
      margin: 12px 16px 16px;
      border-collapse: collapse;
      font-size: 11px;
    }
    th, td {
      padding: 7px 8px;
      border: 1px solid #e2e8f0;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f1f5f9;
      font-weight: 900;
    }
    code {
      font-weight: 900;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <section class="summary" data-panel-id="summary">
    <h1>Sajik seatmap advisory Playwright review</h1>
    <p>version=${REVIEW_VERSION} · official asset=${htmlEscape(SAJIK_SEATMAP_IMAGE.requiredAssetFileName)} · generated from local PNG only</p>
    <div class="summary-grid">
      <div class="summary-cell"><strong>${alignmentAudit.summary?.lockedVerified ?? '-'}</strong><span>locked verified</span></div>
      <div class="summary-cell"><strong>${alignmentAudit.summary?.officialAlignmentFailures ?? '-'}</strong><span>official failures</span></div>
      <div class="summary-cell"><strong>${advisoryRows.length}</strong><span>advisory warnings</span></div>
      <div class="summary-cell"><strong>${groupReports.length}</strong><span>Playwright crop groups</span></div>
    </div>
  </section>
  ${renderOverlay({ id: 'all-advisory', title: 'All advisory blocks overview', rows: advisoryRows, bounds: fullBounds })}
  ${groupReports.map((group) => renderOverlay({
    id: group.id,
    title: group.title,
    rows: group.rows,
    bounds: group.bounds,
  })).join('')}
</body>
</html>`;

const loadPlaywright = async () => {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE_URL,
    'playwright',
    'file:///Users/mac/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs',
  ].filter(Boolean);
  const failures = [];

  for (const candidate of candidates) {
    try {
      return await import(candidate);
    } catch (error) {
      failures.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`Unable to load Playwright. Set PLAYWRIGHT_MODULE_URL or install playwright. Attempts: ${failures.join(' | ')}`);
};

const launchChromium = async (chromium) => {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
};

await fs.mkdir(reportDir, { recursive: true });
await fs.mkdir(playwrightOutDir, { recursive: true });
await fs.writeFile(htmlPath, html, 'utf8');

const { chromium } = await loadPlaywright();
const browser = await launchChromium(chromium);
const page = await browser.newPage({
  viewport: { width: 1220, height: 1000 },
  deviceScaleFactor: 1,
});

const panelScreenshots = [];
try {
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
  const fullScreenshotPath = path.join(playwrightOutDir, 'sajik-advisory-playwright-full.png');
  await page.screenshot({
    path: fullScreenshotPath,
    fullPage: true,
    animations: 'disabled',
  });

  for (const group of [
    { id: 'all-advisory', screenshotPath: path.join(playwrightOutDir, 'sajik-advisory-all-advisory.png') },
    ...groupReports,
  ]) {
    const locator = page.locator(`[data-panel-id="${group.id}"]`).first();
    await locator.screenshot({
      path: group.screenshotPath,
      animations: 'disabled',
    });
    panelScreenshots.push({
      id: group.id,
      screenshotPath: group.screenshotPath,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    version: REVIEW_VERSION,
    asset: SAJIK_SEATMAP_IMAGE,
    thresholds: {
      minComponentInsidePathRatio: SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO,
      minPathColorCoverageRatio: SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO,
    },
    summary: {
      lockedVerified: alignmentAudit.summary?.lockedVerified ?? null,
      officialAlignmentFailures: alignmentAudit.summary?.officialAlignmentFailures ?? null,
      pixelAdvisoryWarnings: advisoryRows.length,
      classificationCounts,
    },
    htmlPath,
    fullScreenshotPath,
    panelScreenshots,
    groups: groupReports.map((group) => ({
      id: group.id,
      title: group.title,
      blocks: group.rows.map((row) => row.block),
      bounds: group.bounds,
      screenshotPath: group.screenshotPath,
    })),
    blocks: advisoryRows.map((row) => ({
      block: row.block,
      id: row.id,
      category: row.category,
      classification: row.classification,
      pixelAdvisoryReasons: row.pixelAdvisoryReasons,
      candidateTopHitBlock: row.candidateTopHitBlock,
      componentInsidePathRatio: row.componentInsidePathRatio,
      pathColorCoverageRatio: row.pathColorCoverageRatio,
      candidateStatus: row.candidateStatus,
      candidateBbox: row.candidateBbox,
      currentPathBounds: row.currentPathBounds,
    })),
  };

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const markdown = [
    '# Sajik advisory Playwright review',
    '',
    `- version: \`${REVIEW_VERSION}\``,
    `- locked verified: ${report.summary.lockedVerified}`,
    `- official alignment failures: ${report.summary.officialAlignmentFailures}`,
    `- advisory warnings: ${report.summary.pixelAdvisoryWarnings}`,
    `- HTML review: ${htmlPath}`,
    `- full screenshot: ${fullScreenshotPath}`,
    '',
    '## Classifications',
    '',
    markdownTable(
      ['classification', 'count'],
      Object.entries(classificationCounts)
        .sort((left, right) => right[1] - left[1])
        .map(([classification, count]) => [`\`${classification}\``, String(count)]),
    ),
    '',
    '## Screenshots',
    '',
    markdownTable(
      ['panel', 'screenshot'],
      panelScreenshots.map((item) => [`\`${item.id}\``, item.screenshotPath]),
    ),
    '',
    '## Advisory blocks',
    '',
    markdownTable(
      ['block', 'classification', 'reasons', 'inside', 'coverage', 'candidate hit'],
      advisoryRows.map((row) => [
        `\`${row.block}\``,
        `\`${row.classification}\``,
        row.pixelAdvisoryReasons.map((reason) => `\`${reason}\``).join('<br>'),
        String(round(row.componentInsidePathRatio)),
        String(round(row.pathColorCoverageRatio)),
        row.candidateTopHitBlock ? `\`${row.candidateTopHitBlock}\`` : '-',
      ]),
    ),
    '',
  ].join('\n');
  await fs.writeFile(markdownPath, markdown, 'utf8');

  console.log(`advisory_html:${htmlPath}`);
  console.log(`advisory_json:${jsonPath}`);
  console.log(`advisory_markdown:${markdownPath}`);
  console.log(`advisory_full_screenshot:${fullScreenshotPath}`);
  panelScreenshots.forEach((item) => {
    console.log(`advisory_panel_${item.id}:${item.screenshotPath}`);
  });
  console.log(`status:ok advisory=${advisoryRows.length} panels=${panelScreenshots.length}`);
} finally {
  await browser.close().catch(() => undefined);
}
