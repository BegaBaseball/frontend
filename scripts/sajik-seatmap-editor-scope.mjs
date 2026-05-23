import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runEditorRegression = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: http } = await import("node:http");
  const { default: net } = await import("node:net");
  const { default: path } = await import("node:path");
  const { default: process } = await import("node:process");
  const { spawn } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const preferredPort = Number(process.env.SAJIK_EDITOR_DEV_SERVER_PORT ?? 5206);
  const providedBaseUrl = process.env.SAJIK_EDITOR_BASE_URL;

  const sleep = async (timeMs) => new Promise((resolve) => {
    setTimeout(resolve, timeMs);
  });

  const ensureDir = async (dirPath) => {
    await fs.mkdir(dirPath, { recursive: true });
  };

  const checkPortAvailability = async (port) => new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });

  const resolvePort = async (startPort) => {
    for (let offset = 0; offset < 80; offset += 1) {
      const candidate = startPort + offset;
      if (await checkPortAvailability(candidate)) {
        return candidate;
      }
    }

    return startPort;
  };

  const requestServer = async (baseUrl) => new Promise((resolve, reject) => {
    const request = http.get(baseUrl, (response) => {
      response.resume();
      response.on('end', () => {
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 500) {
          resolve();
          return;
        }
        reject(new Error(`HTTP ${response.statusCode}`));
      });
    });
    request.setTimeout(5000, () => {
      request.destroy(new Error('request timeout'));
    });
    request.on('error', reject);
  });

  const waitForServer = async (baseUrl) => {
    const startedAt = Date.now();
    let lastError = null;

    while (Date.now() - startedAt < 60000) {
      try {
        await requestServer(baseUrl);
        return;
      } catch (error) {
        lastError = error;
      }
      await sleep(500);
    }

    throw new Error(`Timed out waiting for ${baseUrl}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  };

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
    } catch (error) {
      console.warn(`[sajik-editor] Chrome channel launch failed; retrying bundled Chromium. ${error instanceof Error ? error.message : String(error)}`);
      return chromium.launch({ headless: true });
    }
  };

  function assertCondition(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  const textByTestId = async (page, testId) => page.getByTestId(testId).innerText({ timeout: 10000 });

  const runRegression = async (baseUrl) => {
    const { chromium } = await loadPlaywright();
    const browser = await launchChromium(chromium);
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const result = {
      status: 'failed',
      baseUrl,
      checkedAt: new Date().toISOString(),
      checks: [],
    };

    try {
      await page.goto(`${baseUrl}/internal/sajik-seatmap-editor`, { waitUntil: 'domcontentloaded' });
      await page.getByTestId('sajik-seatmap-editor').waitFor({ state: 'visible', timeout: 30000 });
      result.checks.push('route-visible');

      await page.getByTestId('sajik-editor-section-search').fill('112');
      const initialPatch = await textByTestId(page, 'sajik-editor-patch-json');
      assertCondition(await textByTestId(page, 'sajik-editor-draft-status') === 'draft clean', 'Initial draft status must be clean.');
      assertCondition(await textByTestId(page, 'sajik-editor-before-after-status') === 'before = after', 'Initial before/after status must be equal.');
      assertCondition(await textByTestId(page, 'sajik-editor-patch-status-pass') === 'PATCH PASS', 'Initial patch status must pass.');
      result.checks.push('initial-patch-clean');

      await page.getByTestId('sajik-editor-nudge-step').selectOption('5');
      const beforeVertex = await textByTestId(page, 'sajik-editor-selected-vertex');
      await page.getByTestId('sajik-editor-nudge-x-plus').click();
      const afterVertex = await textByTestId(page, 'sajik-editor-selected-vertex');
      const dirtyPatch = await textByTestId(page, 'sajik-editor-patch-json');
      assertCondition(beforeVertex !== afterVertex, 'Nudge must change the selected vertex readout.');
      assertCondition(dirtyPatch !== initialPatch, 'Nudge must change patch preview after geometry.');
      assertCondition(await textByTestId(page, 'sajik-editor-draft-status') === 'draft dirty', 'Nudge must mark selected section dirty.');
      assertCondition((await textByTestId(page, 'sajik-editor-dirty-section-summary')).includes('112'), 'Dirty summary must include 112.');
      assertCondition(await page.getByTestId('sajik-editor-section-dirty-112').count() === 1, 'Section list must show 112 dirty badge.');
      assertCondition(await textByTestId(page, 'sajik-editor-before-after-status') === 'before != after', 'Dirty patch must show before/after difference.');
      assertCondition(!(await page.getByTestId('sajik-editor-copy-json').isDisabled()), 'JSON copy must be enabled for PASS patch.');
      assertCondition(!(await page.getByTestId('sajik-editor-copy-ts').isDisabled()), 'TS copy must be enabled for PASS patch.');
      result.checks.push('nudge-dirty-patch');

      await page.getByTestId('sajik-editor-reset-draft').click();
      assertCondition(await textByTestId(page, 'sajik-editor-draft-status') === 'draft clean', 'Reset current must restore clean state.');
      assertCondition(await textByTestId(page, 'sajik-editor-before-after-status') === 'before = after', 'Reset current must restore before/after equality.');
      assertCondition(await textByTestId(page, 'sajik-editor-patch-json') === initialPatch, 'Reset current must restore original patch preview.');
      result.checks.push('reset-current');

      const visualVertexHandles = page.locator('[data-testid^="sajik-editor-vertex-handle-visualPath-"]');
      const initialVertexHandleCount = await visualVertexHandles.count();
      await page.getByTestId('sajik-editor-add-vertex-after').click();
      assertCondition(await visualVertexHandles.count() === initialVertexHandleCount + 1, 'Add vertex must increase visualPath handle count.');
      assertCondition((await textByTestId(page, 'sajik-editor-selected-vertex')).startsWith('vertex 1:'), 'Add vertex must select the inserted vertex.');
      await page.getByTestId('sajik-editor-delete-vertex').click();
      assertCondition(await visualVertexHandles.count() === initialVertexHandleCount, 'Delete vertex must restore visualPath handle count.');
      assertCondition(await textByTestId(page, 'sajik-editor-draft-status') === 'draft clean', 'Add then delete must return the section to clean state.');
      result.checks.push('vertex-add-delete');

      const dragHandle = page.getByTestId('sajik-editor-vertex-handle-visualPath-0');
      const beforeDragVertex = await textByTestId(page, 'sajik-editor-selected-vertex');
      const dragBox = await dragHandle.boundingBox();
      assertCondition(Boolean(dragBox), 'Vertex handle bounding box must be available for drag.');
      await page.mouse.move(dragBox.x + (dragBox.width / 2), dragBox.y + (dragBox.height / 2));
      await page.mouse.down();
      await page.mouse.move(dragBox.x + (dragBox.width / 2) + 12, dragBox.y + (dragBox.height / 2) + 8, { steps: 4 });
      await page.mouse.up();
      assertCondition(await textByTestId(page, 'sajik-editor-selected-vertex') !== beforeDragVertex, 'Dragging a vertex must update the selected vertex readout.');
      assertCondition(await textByTestId(page, 'sajik-editor-draft-status') === 'draft dirty', 'Dragging a vertex must mark the section dirty.');
      await page.getByTestId('sajik-editor-reset-draft').click();
      result.checks.push('vertex-drag');

      await page.getByTestId('sajik-editor-invalid-hitpath-fixture').click();
      await page.getByTestId('sajik-editor-patch-status-fail').waitFor({ state: 'visible', timeout: 10000 });
      const invalidPatch = await textByTestId(page, 'sajik-editor-patch-json');
      assertCondition(invalidPatch.includes('"HIT_POLYGON_TOO_SMALL"'), 'Invalid hitPath fixture must surface HIT_POLYGON_TOO_SMALL.');
      assertCondition(await page.getByTestId('sajik-editor-copy-json').isDisabled(), 'JSON copy must be disabled when validation fails.');
      assertCondition(await page.getByTestId('sajik-editor-copy-ts').isDisabled(), 'TS copy must be disabled when validation fails.');
      await page.getByTestId('sajik-editor-reset-all-drafts').click();
      result.checks.push('validation-fail-export-lock');

      await page.getByTestId('sajik-editor-path-kind-labelPoint').click();
      assertCondition(await page.getByTestId('sajik-editor-labelpoint-handle').count() === 1, 'Label point mode must render label handle.');
      await page.getByTestId('sajik-editor-nudge-y-plus').click();
      assertCondition(await textByTestId(page, 'sajik-editor-draft-status') === 'draft dirty', 'Label point nudge must mark draft dirty.');
      await page.getByTestId('sajik-editor-reset-all-drafts').click();
      assertCondition(await textByTestId(page, 'sajik-editor-dirty-section-summary') === 'dirty sections: none', 'Reset all must clear dirty summary.');
      result.checks.push('labelpoint-and-reset-all');

      await page.getByTestId('sajik-editor-section-search').fill('hit-candidate');
      const hitCandidateBadge = page.locator('[data-testid^="sajik-editor-section-hit-candidate-"]').first();
      await hitCandidateBadge.waitFor({ state: 'visible', timeout: 10000 });
      assertCondition(
        await page.locator('[data-testid^="sajik-editor-section-hit-candidate-"]').count() > 0,
        'hit-candidate search must reveal hit badge rows.',
      );
      result.checks.push('hit-candidate-search');

      await page.getByTestId('sajik-editor-section-search').fill('WHEELCHAIR');
      const wheelchairPatch = await textByTestId(page, 'sajik-editor-patch-json');
      assertCondition(wheelchairPatch.includes('"markerType": "WHEELCHAIR"'), 'Wheelchair search patch must include markerType.');
      assertCondition(wheelchairPatch.includes('"sectionKind": "ACCESSIBILITY_MARKER"'), 'Wheelchair search patch must include accessibility sectionKind.');
      result.checks.push('wheelchair-search');

      await page.getByTestId('sajik-editor-section-search').fill('011');
      const aliasPatch = await textByTestId(page, 'sajik-editor-patch-json');
      assertCondition(aliasPatch.includes('"enabled": false'), '011 patch must remain disabled alias-only.');
      assertCondition(aliasPatch.includes('"sectionKind": "ALIAS_ONLY"'), '011 patch must include ALIAS_ONLY sectionKind.');
      result.checks.push('alias-only-search');

      result.status = 'passed';
      return result;
    } finally {
      await browser.close().catch(() => undefined);
    }
  };

  let devServer = null;

  try {
    await ensureDir(reportDir);
    const baseUrl = providedBaseUrl ?? `http://127.0.0.1:${await resolvePort(preferredPort)}`;

    if (!providedBaseUrl) {
      const port = new URL(baseUrl).port;
      devServer = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', port, '--strictPort'], {
        cwd: frontendRoot,
        env: {
          ...process.env,
          VITE_PROXY_TARGET: process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:8080',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      devServer.stdout.on('data', (chunk) => process.stdout.write(chunk));
      devServer.stderr.on('data', (chunk) => process.stderr.write(chunk));
    }

    await waitForServer(baseUrl);
    const result = await runRegression(baseUrl);
    const jsonPath = path.join(reportDir, 'sajik-seatmap-editor-regression.json');
    const markdownPath = path.join(reportDir, 'sajik-seatmap-editor-regression.md');
    await fs.writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
    await fs.writeFile(markdownPath, [
      '# Sajik Seatmap Editor Regression',
      '',
      `- status: ${result.status}`,
      `- baseUrl: ${result.baseUrl}`,
      `- checkedAt: ${result.checkedAt}`,
      `- checks: ${result.checks.join(', ')}`,
      '',
    ].join('\n'));

    console.log(`editor_regression_json:${jsonPath}`);
    console.log(`editor_regression_markdown:${markdownPath}`);
    console.log(`status:${result.status} checks=${result.checks.length}`);

    if (result.status !== 'passed') {
      process.exitCode = 1;
    }
  } finally {
    if (devServer) {
      devServer.kill('SIGTERM');
      await sleep(500);
      if (devServer.exitCode === null) {
        devServer.kill('SIGKILL');
      }
    }
  }
};

const runMarkerTransitionReview = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { buildSajikSeatMapDataset, validateSajikSeatMapDataset } = await import("../src/data/sajikSeatMapDataset.ts");
  const { SAJIK_BLOCKS } = await import("../src/data/sajikSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const jsonPath = path.join(reportDir, 'sajik-seatmap-marker-transition-review.json');
  const markdownPath = path.join(reportDir, 'sajik-seatmap-marker-transition-review.md');

  const REVIEW_VERSION = 'SAJIK_MARKER_TRANSITION_REVIEW_V1';
  const expectedWheelchairSectionIds = [
    '휠체어석-3루',
    '휠체어석-중앙',
    '휠체어석-1루',
  ];

  const transitionPolicy = {
    currentRenderPolicy: 'SPLIT_SEAT_PATH_AND_ACCESSIBILITY_MARKER_LAYERS',
    nextRenderPolicy: 'MARKER_ONLY_DATA_MODEL_AFTER_FOLLOWUP_PR',
    productionLayerSplitApplied: true,
    productionSelectionContractChanged: false,
    selectablePolygonRemovalAllowed: false,
    markerLayerPointerEventsEnabledNow: true,
    markerOnlyConversionStatus: 'LAYER_SPLIT_APPLIED_MARKER_ONLY_DATA_MODEL_PENDING',
  };

  const transitionCriteria = [
    'Render SEAT_SECTION blocks in the normal seat path layer only.',
    'Render ACCESSIBILITY_MARKER blocks in the accessibility marker layer only.',
    'Keep the current selectable block/detail behavior until a dedicated marker-only data-model PR.',
    'Keep markerType=WHEELCHAIR for exactly three exported markers.',
    'Keep relatedSectionId connected to an exported ACCESSIBILITY_MARKER section.',
    'Keep marker.position equal to the related section labelPoint in the 960x640 viewBox.',
    'Keep each wheelchair section enabled and MAP_SELECTABLE in the compatibility phase.',
    'Do not mix wheelchair markers with ALIAS_ONLY sections.',
    'Do not remove selectable compatibility, expose new routes, or change backend API contracts in this review step.',
  ];

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const samePoint = (left, right) => (
    Array.isArray(left)
    && Array.isArray(right)
    && left.length === 2
    && right.length === 2
    && left[0] === right[0]
    && left[1] === right[1]
  );

  const sorted = (values) => [...values].sort();

  const dataset = buildSajikSeatMapDataset();
  const datasetIssues = validateSajikSeatMapDataset(dataset);
  const sectionsById = new Map(dataset.sections.map((section) => [section.sectionId, section]));
  const mapSelectableBlocks = SAJIK_BLOCKS.filter((block) => block.mapInteractionStatus === 'MAP_SELECTABLE');
  const runtimeSeatPathSections = mapSelectableBlocks.filter((block) => block.sectionKind === 'SEAT_SECTION');
  const runtimeAccessibilityMarkers = mapSelectableBlocks.filter((block) => block.sectionKind === 'ACCESSIBILITY_MARKER');
  const runtimeAliasOnlyTargets = mapSelectableBlocks.filter((block) => block.sectionKind === 'ALIAS_ONLY');

  const wheelchairMarkers = dataset.markers
    .filter((marker) => marker.type === 'WHEELCHAIR')
    .sort((left, right) => expectedWheelchairSectionIds.indexOf(left.relatedSectionId) - expectedWheelchairSectionIds.indexOf(right.relatedSectionId));
  const wheelchairSections = dataset.sections
    .filter((section) => section.markerType === 'WHEELCHAIR' || section.sectionKind === 'ACCESSIBILITY_MARKER')
    .sort((left, right) => expectedWheelchairSectionIds.indexOf(left.sectionId) - expectedWheelchairSectionIds.indexOf(right.sectionId));

  const markerRows = wheelchairMarkers.map((marker) => {
    const section = sectionsById.get(marker.relatedSectionId);
    return {
      markerId: marker.markerId,
      markerType: marker.type,
      relatedSectionId: marker.relatedSectionId,
      relatedBlockId: marker.relatedBlockId,
      markerEnabled: marker.enabled,
      markerPosition: marker.position,
      sectionFound: Boolean(section),
      sectionName: section?.sectionName ?? null,
      sectionKind: section?.sectionKind ?? null,
      sectionMarkerType: section?.markerType ?? null,
      sectionEnabled: section?.enabled ?? false,
      mapInteractionStatus: section?.mapInteractionStatus ?? null,
      seatCategory: section?.seatCategory ?? null,
      labelPoint: section?.labelPoint ?? null,
      positionMatchesLabelPoint: section ? samePoint(marker.position, section.labelPoint) : false,
      currentDecision: 'KEEP_SELECTABLE_BLOCK_AND_EXPORT_MARKER',
      nextDecision: 'MIGRATE_TO_MARKER_ONLY_IN_FOLLOWUP_PR',
    };
  });

  const expectedSet = new Set(expectedWheelchairSectionIds);
  const actualMarkerSet = new Set(wheelchairMarkers.map((marker) => marker.relatedSectionId));
  const actualSectionSet = new Set(wheelchairSections.map((section) => section.sectionId));

  const blockers = [
    ...datasetIssues.map((issue) => `DATASET_VALIDATION:${issue}`),
    ...(runtimeSeatPathSections.length === 84 ? [] : [`RUNTIME_SEAT_PATH_COUNT:${runtimeSeatPathSections.length}`]),
    ...(runtimeAccessibilityMarkers.length === 3 ? [] : [`RUNTIME_ACCESSIBILITY_MARKER_COUNT:${runtimeAccessibilityMarkers.length}`]),
    ...(runtimeAliasOnlyTargets.length === 0 ? [] : [`RUNTIME_ALIAS_ONLY_RENDERED:${runtimeAliasOnlyTargets.length}`]),
    ...sorted([...expectedSet].filter((sectionId) => !actualMarkerSet.has(sectionId))).map((sectionId) => `MISSING_WHEELCHAIR_MARKER:${sectionId}`),
    ...sorted([...actualMarkerSet].filter((sectionId) => !expectedSet.has(sectionId))).map((sectionId) => `UNEXPECTED_WHEELCHAIR_MARKER:${sectionId}`),
    ...sorted([...expectedSet].filter((sectionId) => !actualSectionSet.has(sectionId))).map((sectionId) => `MISSING_WHEELCHAIR_SECTION:${sectionId}`),
    ...sorted([...actualSectionSet].filter((sectionId) => !expectedSet.has(sectionId))).map((sectionId) => `UNEXPECTED_ACCESSIBILITY_MARKER_SECTION:${sectionId}`),
    ...markerRows.filter((row) => row.markerType !== 'WHEELCHAIR').map((row) => `MARKER_TYPE_MISMATCH:${row.markerId}`),
    ...markerRows.filter((row) => !row.sectionFound).map((row) => `MARKER_RELATED_SECTION_MISSING:${row.markerId}`),
    ...markerRows.filter((row) => row.sectionKind !== 'ACCESSIBILITY_MARKER').map((row) => `SECTION_KIND_MISMATCH:${row.relatedSectionId}`),
    ...markerRows.filter((row) => row.sectionMarkerType !== 'WHEELCHAIR').map((row) => `SECTION_MARKER_TYPE_MISMATCH:${row.relatedSectionId}`),
    ...markerRows.filter((row) => row.seatCategory !== 'ACCESSIBLE').map((row) => `SECTION_CATEGORY_MISMATCH:${row.relatedSectionId}`),
    ...markerRows.filter((row) => !row.markerEnabled || !row.sectionEnabled).map((row) => `WHEELCHAIR_COMPAT_SELECTION_DISABLED:${row.relatedSectionId}`),
    ...markerRows.filter((row) => row.mapInteractionStatus !== 'MAP_SELECTABLE').map((row) => `WHEELCHAIR_NOT_MAP_SELECTABLE:${row.relatedSectionId}`),
    ...markerRows.filter((row) => !row.positionMatchesLabelPoint).map((row) => `MARKER_POSITION_LABEL_MISMATCH:${row.relatedSectionId}`),
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    version: REVIEW_VERSION,
    status: blockers.length === 0 ? 'passed' : 'blocked',
    stadiumId: dataset.stadiumId,
    mapVersion: dataset.mapVersion,
    coordinateSystem: dataset.image.viewBox,
    summary: {
      wheelchairMarkers: wheelchairMarkers.length,
      wheelchairSections: wheelchairSections.length,
      expectedWheelchairMarkers: expectedWheelchairSectionIds.length,
      runtimeSeatPathSections: runtimeSeatPathSections.length,
      runtimeAccessibilityMarkers: runtimeAccessibilityMarkers.length,
      runtimeAliasOnlyTargets: runtimeAliasOnlyTargets.length,
      markerRowsPassingPositionLock: markerRows.filter((row) => row.positionMatchesLabelPoint).length,
      selectableCompatibilitySections: markerRows.filter((row) => row.markerEnabled && row.sectionEnabled && row.mapInteractionStatus === 'MAP_SELECTABLE').length,
      productionLayerSplitApplied: transitionPolicy.productionLayerSplitApplied,
      productionSelectionContractChanged: transitionPolicy.productionSelectionContractChanged,
      markerOnlyApplied: false,
      blockers: blockers.length,
    },
    transitionPolicy,
    transitionCriteria,
    expectedWheelchairSectionIds,
    markerRows,
    blockers,
  };

  const markdown = [
    '# Sajik seatmap marker transition review',
    '',
    `- version: \`${REVIEW_VERSION}\``,
    `- status: \`${report.status}\``,
    `- mapVersion: \`${report.mapVersion}\``,
    `- coordinate system: \`${report.coordinateSystem}\``,
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      Object.entries(report.summary).map(([key, value]) => [key, `\`${value}\``]),
    ),
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
    '',
    '## Transition Policy',
    '',
    markdownTable(
      ['key', 'value'],
      Object.entries(transitionPolicy).map(([key, value]) => [key, `\`${value}\``]),
    ),
    '',
    '## Wheelchair Marker Rows',
    '',
    markdownTable(
      ['markerId', 'relatedSectionId', 'sectionName', 'sectionKind', 'enabled', 'position', 'labelPoint', 'decision'],
      markerRows.map((row) => [
        `\`${row.markerId}\``,
        `\`${row.relatedSectionId}\``,
        row.sectionName,
        `\`${row.sectionKind}\``,
        `\`${row.markerEnabled && row.sectionEnabled}\``,
        `\`${row.markerPosition.join(',')}\``,
        `\`${row.labelPoint?.join(',') ?? '-'}\``,
        row.currentDecision,
      ]),
    ),
    '',
    '## Transition Criteria',
    '',
    transitionCriteria.map((criterion) => `- ${criterion}`).join('\n'),
    '',
    '## Verification Commands',
    '',
    '- `npm run stadium:sajik:marker-transition-review`',
    '- `npm run stadium:sajik:dataset-export -- --check`',
    '- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts`',
    '- `npm run stadium:sajik:editor-regression`',
    '- `npm run stadium:sajik:pr-scope-guard`',
    '',
  ].join('\n');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, markdown, 'utf8');

  console.log(`marker_transition_review_json:${jsonPath}`);
  console.log(`marker_transition_review_markdown:${markdownPath}`);
  console.log([
    `status:${report.status}`,
    `markers=${report.summary.wheelchairMarkers}`,
    `sections=${report.summary.wheelchairSections}`,
    `seatPaths=${report.summary.runtimeSeatPathSections}`,
    `markerLayer=${report.summary.runtimeAccessibilityMarkers}`,
    `aliasRendered=${report.summary.runtimeAliasOnlyTargets}`,
    `positionLocks=${report.summary.markerRowsPassingPositionLock}`,
    `selectableCompat=${report.summary.selectableCompatibilitySections}`,
    `markerOnlyApplied=${report.summary.markerOnlyApplied}`,
    `blockers=${report.summary.blockers}`,
  ].join(' '));

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
};

const runPrScopeGuard = async () => {
  const { execFile } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { promisify } = await import("node:util");

  const execFileAsync = promisify(execFile);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const jsonPath = path.join(reportDir, 'sajik-seatmap-pr-scope-guard.json');
  const markdownPath = path.join(reportDir, 'sajik-seatmap-pr-scope-guard.md');

  const SCOPE_GUARD_VERSION = 'SAJIK_PR_SCOPE_GUARD_V1';
  const isStage01PartialMode = process.argv.includes('--stage01-partial');
  const executionMode = isStage01PartialMode ? 'stage01-partial' : 'full-release';

  const expectedIncludedFiles = [
    'docs/sajik-seatmap-editor-v17-operator-guide.md',
    'docs/sajik-seatmap-editor-v18-roadmap.md',
    'docs/sajik-seatmap-hitpath-candidate-review.md',
    'docs/sajik-seatmap-marker-only-transition.md',
    'docs/sajik-seatmap-pr-packaging-inventory.md',
    'docs/sajik-seatmap-release-lock.md',
    'docs/sajik-seatmap-stage01-handoff.md',
    'package.json',
    'scripts/sajik-seatmap-core-qa.mjs',
    'scripts/sajik-seatmap-editor-scope.mjs',
    'scripts/sajik-seatmap-export-dataset.mjs',
    'scripts/sajik-seatmap-hitpath-candidate-review.mjs',
    'scripts/sajik-seatmap-zone-precision-worksets.mjs',    'scripts/sajik-seatmap-stage01.mjs',    'scripts/sajik-seatmap-editor-scope.mjs',
    'scripts/sajik-seatmap-core-qa.mjs',
    'scripts/stadium-ux-audit.mjs',
    'src/components/AppRoutes.tsx',
    'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    'src/components/sajik/SajikSeatMap.test.ts',
    'src/components/sajik/SajikSeatMapEditor.tsx',
    'src/components/sajik/SajikSeatMapSvg.tsx',
    'src/data/sajikSeatData.test.ts',
    'src/data/sajikSeatData.ts',
    'src/data/sajikSeatMapDataset.ts',
    'src/utils/seatMapPolygonValidator.ts',
  ];

  const partialStagingRequiredFiles = [
    {
      file: 'package.json',
      reason: 'Package scripts are shared and currently contain unrelated stadium script changes.',
      includeOnly: [
        'stadium:sajik:dataset-export',
        'stadium:sajik:editor-regression',
        'stadium:sajik:hitpath-review',
        'stadium:sajik:zone-precision-worksets',
        'stadium:sajik:stage01-operator-package',
        'stadium:sajik:stage01-operator-input-aid',
        'stadium:sajik:stage01-review-board',
        'stadium:sajik:stage01-next-action-packet',
        'stadium:sajik:stage01-target-review-packet',
        'stadium:sajik:stage01-target-image-analysis-smoke',
        'stadium:sajik:stage01-all-target-review-packets',
        'stadium:sajik:stage01-all-target-image-analysis-smoke',
        'stadium:sajik:stage01-target-entry-template-readiness-smoke',
        'stadium:sajik:stage01-target-entry-preflight',
        'stadium:sajik:stage01-target-entry-preflight-smoke',
        'stadium:sajik:stage01-target-approval-gate',
        'stadium:sajik:stage01-target-approval-gate-smoke',
        'stadium:sajik:stage01-all-target-approval-readiness',
        'stadium:sajik:stage01-all-target-approval-readiness-smoke',
        'stadium:sajik:stage01-all-target-approval-input-guide',
        'stadium:sajik:stage01-all-target-approval-input-guide-smoke',
        'stadium:sajik:stage01-operator-input-intake-gate',
        'stadium:sajik:stage01-operator-input-intake-gate-smoke',
        'stadium:sajik:stage01-prewrite',
        'stadium:sajik:stage01-apply-ready',
        'stadium:sajik:stage01-post-apply-audit',
        'stadium:sajik:stage01-operator-status',
        'stadium:sajik:stage01-manual-patch-plan',
        'stadium:sajik:stage01-real-approval-readiness',
        'stadium:sajik:stage01-target-apply-precheck',
        'stadium:sajik:stage01-131-apply-path-status',
        'stadium:sajik:stage01-prewrite-smoke',
        'stadium:sajik:stage01-approved-dry-run',
        'stadium:sajik:stage01-applied-dry-run',
        'stadium:sajik:stage01-131-lifecycle-smoke',
        'stadium:sajik:stage01-readiness-summary',
        'stadium:sajik:stage01-readiness-summary-smoke',
        'stadium:sajik:stage01-completion-gate',
        'stadium:sajik:stage01-completion-gate:complete',
        'stadium:sajik:stage01-completion-gate-smoke',
        'stadium:sajik:stage01-staged-scope-audit',
        'stadium:sajik:stage01-staged-scope-audit:complete',
        'stadium:sajik:stage01-staged-scope-audit-smoke',
        'qa:stadium:sajik:stage01-readiness',
        'stadium:sajik:marker-transition-review',
        'stadium:sajik:pr-scope-guard',
        'stadium:sajik:stage01-pr-scope-guard',
        'stadium:sajik:pr-scope-guard-smoke',
        'qa:stadium:sajik:polygon-v2',
      ],
      exclude: [
        'stadium:gwangju:*',
        'qa:stadium:gwangju:*',
        'stadium:daegu:*',
        'qa:stadium:daegu:*',
      ],
    },
    {
      file: 'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
      reason: 'Static contract tests are shared across stadiums; stage only Sajik-focused hunks.',
      includeOnly: [
        'test("사직 좌석도 release lock 문서는 v2 polygon 검수 계약을 고정한다") additions',
        'Sajik package script assertions',
        'Sajik release lock document assertions',
        'Sajik editor v1.8 roadmap exclusion assertion',
      ],
      exclude: [
        'common seatmap shell assertions',
        'Daejeon anchor crop assertions',
        'Gwangju release/operator assertions',
        'Daegu operator/precision assertions',
      ],
    },
    {
      file: 'scripts/stadium-ux-audit.mjs',
      reason: 'Shared browser QA script may contain non-Sajik stadium changes; stage only Sajik label-coordinate hunks.',
      includeOnly: [
        'Sajik label-coordinate QA mapInteractionStatus read/return',
        'Sajik alias-only hit-area exclusion checks',
      ],
      exclude: [
        'non-Sajik viewport, click, or QA flow changes',
        'Suwon-specific QA extensions',
      ],
    },
    {
      file: 'src/components/AppRoutes.tsx',
      reason: 'Application route file is shared; stage only the dev-only Sajik editor route hunk.',
      includeOnly: [
        'import SajikSeatMapEditor',
        '/internal/sajik-seatmap-editor route guarded by import.meta.env.DEV',
      ],
      exclude: [
        'production navigation exposure',
        'non-Sajik route changes',
      ],
    },
  ];

  const sourcePolicy = {
    allowedCoordinateSource: 'official 2026 Sajik PNG plus manual polygon-v2 trace only',
    coordinateSystem: '960x640 SVG viewBox 0 0 960 640',
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    disallowedSources: [
      'external crawling',
      'web-search-based baseball data',
      'resized screenshots',
      'browser CSS pixels as source coordinates',
      'third-party copied seatmap images',
    ],
  };

  const stage01PartialReadinessGate = {
    available: true,
    command: 'npm run qa:stadium:sajik:stage01-readiness',
    purpose: 'Partial-worktree-safe Stage 01 regression gate for real approval readiness, target apply precheck, prewrite smoke, approved/applied dry-runs, 131 lifecycle smoke, the Sajik-focused static contract test, next-action packet, target review packet, target image-analysis smoke, all-target official PNG review packets, all-target image-analysis smoke, target entry template readiness smoke, target entry preflight, target entry preflight smoke, target approval gate, target approval smoke, all-target approval readiness, all-target approval readiness smoke, all-target approval input guide, all-target approval input guide smoke, operator input intake gate, intake gate smoke, target apply precheck, 131 apply path status, readiness summary, summary smoke, Stage 01 completion gate, completion gate smoke, and staged scope audit smoke.',
    includes: [
      'npm run stadium:sajik:stage01-real-approval-readiness',
      'npm run stadium:sajik:stage01-target-apply-precheck',
      'npm run stadium:sajik:stage01-prewrite-smoke',
      'npm run stadium:sajik:stage01-approved-dry-run',
      'npm run stadium:sajik:stage01-applied-dry-run',
      'npm run stadium:sajik:stage01-131-lifecycle-smoke',
      'node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts',
      'npm run stadium:sajik:stage01-next-action-packet',
      'npm run stadium:sajik:stage01-target-review-packet',
      'npm run stadium:sajik:stage01-target-image-analysis-smoke',
      'npm run stadium:sajik:stage01-all-target-review-packets',
      'npm run stadium:sajik:stage01-all-target-image-analysis-smoke',
      'npm run stadium:sajik:stage01-target-entry-template-readiness-smoke',
      'npm run stadium:sajik:stage01-target-entry-preflight',
      'npm run stadium:sajik:stage01-target-entry-preflight-smoke',
      'npm run stadium:sajik:stage01-target-approval-gate',
      'npm run stadium:sajik:stage01-target-approval-gate-smoke',
      'npm run stadium:sajik:stage01-all-target-approval-readiness',
      'npm run stadium:sajik:stage01-all-target-approval-readiness-smoke',
      'npm run stadium:sajik:stage01-all-target-approval-input-guide',
      'npm run stadium:sajik:stage01-all-target-approval-input-guide-smoke',
      'npm run stadium:sajik:stage01-operator-input-intake-gate',
      'npm run stadium:sajik:stage01-operator-input-intake-gate-smoke',
      'npm run stadium:sajik:stage01-target-apply-precheck',
      'npm run stadium:sajik:stage01-131-apply-path-status',
      'npm run stadium:sajik:stage01-readiness-summary',
      'npm run stadium:sajik:stage01-readiness-summary-smoke',
      'npm run stadium:sajik:stage01-completion-gate',
      'npm run stadium:sajik:stage01-completion-gate-smoke',
      'npm run stadium:sajik:stage01-staged-scope-audit-smoke',
    ],
    excludes: [
      'npm run stadium:sajik:pr-scope-guard',
      'npm run stadium:sajik:editor-regression',
      'npm run build',
    ],
    doesNotRunPrScopeGuard: true,
    doesNotRunEditorRegression: true,
    doesNotRunBuild: true,
    doesNotReplaceFullReleaseGate: true,
    fullReleaseGate: 'npm run qa:stadium:sajik:polygon-v2',
    fullReleaseBlockerMeaning: 'When pr-scope-guard blocks in a partial worktree, treat it as missing full Sajik v2 release payload, not as a Stage 01 readiness failure.',
  };

  const includedSajikComponentFiles = new Set([
    'src/components/sajik/SajikSeatMap.test.ts',
    'src/components/sajik/SajikSeatMapEditor.tsx',
    'src/components/sajik/SajikSeatMapSvg.tsx',
  ]);

  const includedRules = [
    {
      id: 'sajik-docs',
      reason: 'Sajik release lock, PR packaging, and operator guidance docs',
      match: (file) => file.startsWith('docs/sajik-seatmap-'),
    },
    {
      id: 'sajik-scripts',
      reason: 'Sajik export, audit, manifest, editor regression, and PR scope scripts',
      match: (file) => file.startsWith('scripts/sajik-seatmap-'),
    },
    {
      id: 'sajik-components',
      reason: 'Sajik SVG renderer, internal editor, and component tests',
      match: (file) => includedSajikComponentFiles.has(file),
    },
    {
      id: 'sajik-data',
      reason: 'Sajik data, normalized dataset, and data tests',
      match: (file) => file.startsWith('src/data/sajik'),
    },
    {
      id: 'shared-validator',
      reason: 'Common polygon validator used by Sajik data and scripts',
      match: (file) => file === 'src/utils/seatMapPolygonValidator.ts',
    },
    {
      id: 'shared-route-contract',
      reason: 'Dev-only Sajik editor route hunk',
      match: (file) => file === 'src/components/AppRoutes.tsx',
    },
    {
      id: 'shared-static-test-contract',
      reason: 'Sajik release lock and package-script static test hunks',
      match: (file) => file === 'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    },
    {
      id: 'shared-browser-qa-contract',
      reason: 'Sajik label-coordinate QA reads mapInteractionStatus',
      match: (file) => file === 'scripts/stadium-ux-audit.mjs',
    },
    {
      id: 'package-script-contract',
      reason: 'Package scripts expose Sajik dataset export, hitPath review, zone precision worksets, Stage 01 operator gates, marker transition review, editor regression, PR scope guard, and polygon-v2 gate',
      match: (file) => file === 'package.json',
    },
  ];

  const separateRules = [
    {
      id: 'sajik-ux-files',
      reason: 'Sajik first-visit/runtime UX work is outside the polygon v2 release-lock PR',
      match: (file) => file === 'src/components/sajik/SajikSeatMap.tsx'
        || file === 'src/components/sajik/SajikBottomSheet.tsx',
    },
    {
      id: 'shared-seatmap-shell',
      reason: 'Common seatmap shell and home runtime work is outside the Sajik polygon v2 release-lock PR',
      match: (file) => file === 'src/components/StadiumGuideRuntime.tsx'
        || file === 'src/components/HomeRuntime.tsx'
        || file === 'src/components/home/HomeSecondaryPanels.tsx'
        || file === 'src/hooks/useStadiumGuide.ts'
        || file === 'src/hooks/useScrollStage.ts'
        || file === 'src/components/stadiumSeatMapRegistry.tsx'
        || file.startsWith('src/components/stadiumSeatMap/'),
    },
  	  {
  	    id: 'home-card-ui',
  	    reason: 'Home/game card UI work is outside the Sajik polygon v2 release-lock PR',
  	    match: (file) => file === 'src/components/GameCard.tsx'
  	      || file === 'src/components/home/GameCardSkeleton.tsx'
  	      || file === 'src/components/home/HomeMatchPanel.tsx'
  	      || file === 'src/components/home/TeamRankRow.tsx',
  	  },
  	  {
  	    id: 'shared-notification-ui',
  	    reason: 'Shared toast/notification UI work is outside the Sajik polygon v2 release-lock PR',
  	    match: (file) => file === 'src/components/ui/sonner.tsx'
  	      || file === 'src/shims/sonner.tsx',
  	  },
    {
      id: 'shared-navigation-ui',
      reason: 'Shared navigation UI work is outside the Sajik polygon v2 release-lock PR',
      match: (file) => file === 'src/components/CheerMobileBottomNav.tsx'
        || file === 'src/components/Navbar.tsx'
        || file === 'src/components/PublicNavbar.tsx'
        || file === 'src/components/PublicNavbarDesktopAuthControls.tsx',
    },
    {
      id: 'shared-layout-chatbot-ui',
      reason: 'Shared layout and chatbot UI work is outside the Sajik polygon v2 release-lock PR',
      match: (file) => file === 'src/components/AuthenticatedLayoutChrome.tsx'
        || file === 'src/components/ChatBotFloatingButton.tsx'
        || file === 'src/components/ChatBotRuntime.tsx',
    },
    {
      id: 'mate-files',
      reason: 'Mate feature work is outside the Sajik PR scope',
      match: (file) => file === 'src/components/MatePartyCard.tsx'
        || file === 'src/components/MateResultsRuntime.tsx'
        || file === 'src/components/mypage/MateHistoryCard.tsx'
        || file === 'src/utils/mate.ts',
    },
    {
      id: 'prediction-files',
      reason: 'Prediction feature work is outside the Sajik polygon v2 release-lock PR',
      match: (file) => file.startsWith('src/components/prediction/')
        || file === 'src/hooks/usePredictionGameData.ts'
        || file === 'src/hooks/usePredictionSchedule.ts'
        || file === 'src/utils/predictionRangeWindow.ts'
        || file === 'src/hooks/predictionScheduleBoundaryLoaders.ts',
    },
    {
      id: 'ranking-files',
      reason: 'Ranking prediction work is outside the Sajik polygon v2 release-lock PR',
      match: (file) => file === 'src/api/ranking.ts'
        || file === 'src/hooks/useRankingPrediction.ts'
        || file === 'src/types/ranking.ts',
    },
    {
      id: 'shared-stadium-favorite-files',
      reason: 'Shared stadium favorite UI work is outside the Sajik polygon v2 release-lock PR',
      match: (file) => file === 'src/components/AuthenticatedStadiumFavoriteToggle.tsx',
    },
    {
      id: 'shared-map-files',
      reason: 'Shared Kakao map utility work is outside the Sajik polygon v2 release-lock PR',
      match: (file) => file === 'src/utils/kakaoMap.ts',
    },
    {
      id: 'shared-logging-files',
      reason: 'Shared logging utility work is outside the Sajik polygon v2 release-lock PR',
      match: (file) => file === 'src/utils/safeLogger.ts'
        || file === 'src/utils/safeLogger.test.ts',
    },
    {
      id: 'shared-realtime-files',
      reason: 'Shared realtime socket/auth work is outside the Sajik polygon v2 release-lock PR',
      match: (file) => file === 'src/hooks/useDmSocket.ts'
        || file === 'src/hooks/useNotificationSocket.ts'
        || file === 'src/hooks/useWebSocket.ts'
        || file === 'src/utils/realtimeAuth.ts'
        || file === 'src/utils/realtimeAuth.test.ts',
    },
    {
      id: 'shared-repo-config',
      reason: 'Shared repository config changes are outside the Sajik polygon v2 release-lock PR',
      match: (file) => file === '.gitignore',
    },
    {
      id: 'shared-html-shell',
      reason: 'Shared HTML shell theme bootstrap work is outside the Sajik polygon v2 release-lock PR',
      match: (file) => file === 'index.html',
    },
    {
      id: 'shared-styles',
      reason: 'Shared stylesheet changes are outside the Sajik polygon v2 release-lock PR',
      match: (file) => file === 'src/index.css',
    },
    {
      id: 'assistant-local-config',
      reason: 'Local assistant configuration is outside the Sajik polygon v2 release-lock PR',
      match: (file) => file === '.claude/' || file.startsWith('.claude/'),
    },
    {
      id: 'environment-files',
      reason: 'Environment file changes are outside the Sajik polygon v2 release-lock PR',
      match: (file) => file === '.env.production',
    },
    {
      id: 'non-sajik-stadium-ui',
      reason: 'Non-Sajik stadium UI work is outside the Sajik polygon v2 release-lock PR',
      match: (file) => file.startsWith('src/components/changwon/')
        || file.startsWith('src/components/daejeon/')
        || file.startsWith('src/components/gocheok/')
        || file.startsWith('src/components/incheon/')
        || file.startsWith('src/components/jamsil/')
        || file.startsWith('src/components/suwon/'),
    },
    {
      id: 'daegu-files',
      reason: 'Daegu seatmap/operator work is outside the Sajik PR scope',
      match: (file) => file.startsWith('docs/daegu-')
        || file.startsWith('scripts/daegu-')
        || file.startsWith('src/components/daegu/')
        || file.startsWith('src/data/daegu'),
    },
    {
      id: 'daejeon-files',
      reason: 'Daejeon anchor/operator work is outside the Sajik PR scope',
      match: (file) => file.startsWith('docs/daejeon-')
        || file.startsWith('scripts/daejeon-')
        || file.startsWith('src/data/daejeon')
        || file === 'src/components/DaejeonStadiumUxAuditContract.test.ts',
    },
    {
      id: 'gwangju-files',
      reason: 'Gwangju release/operator work is outside the Sajik PR scope',
      match: (file) => file.startsWith('docs/gwangju-')
        || file.startsWith('scripts/gwangju-')
        || file.startsWith('src/data/gwangju')
        || file.startsWith('src/components/gwangju/'),
    },
    {
      id: 'suwon-files',
      reason: 'Suwon baseline and hit geometry work is outside the Sajik PR scope',
      match: (file) => file.startsWith('docs/suwon-')
        || file.startsWith('scripts/suwon-')
        || file.startsWith('src/data/suwon'),
    },
    {
      id: 'jamsil-files',
      reason: 'Jamsil seatmap work is outside the Sajik PR scope',
      match: (file) => file.startsWith('src/data/jamsil'),
    },
    {
      id: 'shared-isolated-qa-runner',
      reason: 'Shared isolated stadium QA runner changes are outside the Sajik polygon v2 release-lock PR',
      match: (file) => file === 'scripts/run-stadium-isolated-qa.mjs'
        || file === 'scripts/stadium-seatmap-standard-shell-pr-scope-guard.mjs'
        || file === 'docs/stadium-seatmap-standard-shell-pr-scope.md',
    },
    {
      id: 'temporary-analysis-files',
      reason: 'Temporary local analysis scripts are outside the Sajik polygon v2 release-lock PR',
      match: (file) => file.startsWith('scripts/.tmp_')
        || file.startsWith('tmp-'),
    },
    {
      id: 'incheon-files',
      reason: 'Incheon seatmap/visit-guide work is outside the Sajik PR scope',
      match: (file) => file.startsWith('src/data/incheon'),
    },
    {
      id: 'generated-build-reports',
      reason: 'Build reports are regenerated artifacts and should not be staged with the Sajik polygon PR by default',
      match: (file) => [
        'reports/bundle-guard-report.json',
        'reports/dist-assets-report.json',
      ].includes(file),
    },
    {
      id: 'non-sajik-generated-reports',
      reason: 'Non-Sajik report artifacts are regenerated outputs outside the Sajik polygon v2 release-lock PR',
      match: (file) => file.startsWith('reports/'),
    },
  ];

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const sorted = (values) => [...values].sort();

  const parseStatusLine = (line) => {
    const status = line.slice(0, 2);
    const rawPath = line.slice(3);
    const file = rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath;
    return { status, file };
  };

  const classifyFile = (entry) => {
    const includedRule = includedRules.find((rule) => rule.match(entry.file));
    if (includedRule) {
      return { ...entry, scope: 'included', rule: includedRule.id, reason: includedRule.reason };
    }

    const separateRule = separateRules.find((rule) => rule.match(entry.file));
    if (separateRule) {
      return { ...entry, scope: 'separate', rule: separateRule.id, reason: separateRule.reason };
    }

    return {
      ...entry,
      scope: 'unexpected',
      rule: 'unclassified',
      reason: 'Dirty file is neither documented as Sajik PR payload nor a separated workstream.',
    };
  };

  const diffFileList = (expected, actual) => {
    const actualSet = new Set(actual);
    const expectedSet = new Set(expected);
    return {
      missing: sorted(expected.filter((file) => !actualSet.has(file))),
      extra: sorted(actual.filter((file) => !expectedSet.has(file))),
    };
  };

  const isMixedGitStatus = (status) => status !== '??' && status[0] !== ' ' && status[1] !== ' ';
  const pathExists = async (file) => {
    try {
      await fs.access(path.join(frontendRoot, file));
      return true;
    } catch {
      return false;
    }
  };

  const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd: frontendRoot });
  const dirtyEntries = stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map(parseStatusLine)
    .map(classifyFile);

  const includedFiles = dirtyEntries.filter((entry) => entry.scope === 'included');
  const separateDirtyWork = dirtyEntries.filter((entry) => entry.scope === 'separate');
  const unexpectedFiles = dirtyEntries.filter((entry) => entry.scope === 'unexpected');
  const includedDiff = diffFileList(expectedIncludedFiles, includedFiles.map((entry) => entry.file));
  const missingExpectedIncludedFileDetails = await Promise.all(includedDiff.missing.map(async (file) => {
    const existsOnDisk = await pathExists(file);
    return {
      file,
      existsOnDisk,
      dirtyStatus: '-',
      classification: existsOnDisk ? 'clean-full-release-payload' : 'absent-from-worktree',
      partialWorktreeInterpretation: existsOnDisk
        ? 'Expected for the full Sajik release payload, but not dirty in the current partial Stage 01 worktree.'
        : 'Expected for the full Sajik release payload, but the file is absent from this checkout.',
      action: existsOnDisk
        ? 'No partial Stage 01 edit is required; include only when assembling the full Sajik release payload or when the file has a Sajik hunk.'
        : 'Restore or apply this file before staging the full Sajik release payload.',
    };
  }));
  const missingExpectedIncludedFileDetailsByFile = new Map(
    missingExpectedIncludedFileDetails.map((entry) => [entry.file, entry]),
  );

  const entriesByFile = new Map(dirtyEntries.map((entry) => [entry.file, entry]));
  const mixedStatusFiles = includedFiles
    .filter((entry) => isMixedGitStatus(entry.status))
    .map((entry) => ({
      file: entry.file,
      status: entry.status,
      reason: 'Included file has both index and worktree changes; review with git add -p before staging.',
    }));
  const untrackedIncludedFiles = includedFiles
    .filter((entry) => entry.status === '??')
    .map((entry) => ({
      file: entry.file,
      status: entry.status,
      reason: 'Included file is untracked and must be reviewed before staging.',
    }));
  const untrackedIncludedReviewRows = untrackedIncludedFiles.map((entry) => ({
    ...entry,
    expectedPayload: expectedIncludedFiles.includes(entry.file),
    manualReviewRequired: true,
    stagingAction: 'manual whole-file review, then explicit git add <file> or apply the file in a clean worktree',
    unexpectedFile: false,
  }));

  const partialStagingReviewFiles = partialStagingRequiredFiles.map((focus) => {
    const entry = entriesByFile.get(focus.file);
    return {
      file: focus.file,
      status: entry?.status ?? '-',
      scope: entry?.scope ?? 'clean-or-missing',
      rule: entry?.rule ?? '-',
      reason: focus.reason,
      includeOnly: focus.includeOnly,
      exclude: focus.exclude,
    };
  });
  const partialStagingFileSet = new Set(partialStagingRequiredFiles.map((focus) => focus.file));
  const wholeFileReviewBeforeStaging = expectedIncludedFiles
    .filter((file) => !partialStagingFileSet.has(file))
    .map((file) => {
      const entry = entriesByFile.get(file);
      const missingDetail = missingExpectedIncludedFileDetailsByFile.get(file);
      return {
        file,
        status: entry?.status ?? '-',
        scope: entry?.scope ?? missingDetail?.classification ?? 'missing',
        rule: entry?.rule ?? '-',
        action: entry?.status === '??'
          ? 'manual whole-file review, then explicit git add <file>'
          : entry
            ? 'review full file diff, then explicit git add <file>'
            : missingDetail?.action ?? 'missing from dirty worktree; apply Sajik patch before staging',
      };
    });
  const partialHunkReviewBeforeStaging = partialStagingReviewFiles.map((entry) => ({
    file: entry.file,
    status: entry.status,
    scope: entry.scope,
    rule: entry.rule,
    includeOnly: entry.includeOnly,
    exclude: entry.exclude,
    action: entry.status === '-'
      ? 'no dirty hunk currently detected; re-check before staging'
      : 'manual hunk review with git add -p or clean-worktree patch split',
  }));
  const excludedArtifacts = [
    'reports/stadium/sajik-seatmap-*.json',
    'reports/stadium/sajik-seatmap-*.md',
    'reports/stadium/sajik-seatmap-*.png',
    'reports/stadium/sajik-stage01-operator/*',
    'reports/bundle-guard-report.json',
    'reports/dist-assets-report.json',
    'dist/*',
    'output/playwright/*',
    '../output/playwright/*',
  ];
  const forbiddenStagingCommands = [
    'git add .',
    'git add package.json src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    'git add reports dist output',
    'git add reports/bundle-guard-report.json reports/dist-assets-report.json',
  ];

  const blockers = [
    ...unexpectedFiles.map((entry) => `UNCLASSIFIED_DIRTY_FILE:${entry.file}`),
    ...includedDiff.missing.map((file) => `SAJIK_PR_FILE_MISSING:${file}`),
    ...includedDiff.extra.map((file) => `SAJIK_PR_FILE_UNEXPECTED:${file}`),
  ];

  const missingExpectedClassificationCounts = missingExpectedIncludedFileDetails.reduce((counts, entry) => {
    counts[entry.classification] = (counts[entry.classification] ?? 0) + 1;
    return counts;
  }, {});
  const stage01PartialScopeBlockers = [
    ...unexpectedFiles.map((entry) => `STAGE01_PARTIAL_UNEXPECTED_DIRTY_FILE:${entry.file}`),
    ...includedDiff.extra.map((file) => `STAGE01_PARTIAL_UNEXPECTED_INCLUDED_FILE:${file}`),
    ...missingExpectedIncludedFileDetails
      .filter((entry) => entry.classification !== 'clean-full-release-payload')
      .map((entry) => `STAGE01_PARTIAL_MISSING_EXPECTED_FILE:${entry.file}:${entry.classification}`),
    ...(!stage01PartialReadinessGate.available ? ['STAGE01_PARTIAL_READINESS_GATE_UNAVAILABLE'] : []),
  ];
  const fullReleaseStatus = blockers.length === 0 ? 'passed' : 'blocked';
  const stage01PartialScopeStatus = stage01PartialScopeBlockers.length === 0 ? 'passed' : 'blocked';
  const commandExitSummary = {
    fullReleaseCommand: 'npm run stadium:sajik:pr-scope-guard',
    fullReleaseCommandExit: fullReleaseStatus === 'passed' ? 0 : 1,
    stage01PartialCommand: 'npm run stadium:sajik:stage01-pr-scope-guard',
    stage01PartialCommandExit: stage01PartialScopeStatus === 'passed' ? 0 : 1,
  };
  const commandExitCode = isStage01PartialMode
    ? commandExitSummary.stage01PartialCommandExit
    : commandExitSummary.fullReleaseCommandExit;
  const stage01PartialScopeGate = {
    status: stage01PartialScopeStatus,
    command: 'npm run stadium:sajik:stage01-pr-scope-guard',
    modeArgument: '--stage01-partial',
    commandExitCode: commandExitSummary.stage01PartialCommandExit,
    fullReleaseStatus,
    doesNotReplaceFullReleaseGate: true,
    fullReleaseGate: 'npm run qa:stadium:sajik:polygon-v2',
    passCriteria: {
      unexpectedFileCount: 0,
      extraIncludedFileCount: 0,
      missingExpectedFileClassification: 'clean-full-release-payload',
      absentFromWorktreeCount: 0,
      stage01ReadinessAvailable: true,
      safeToRunBulkGitAdd: false,
    },
    missingExpectedClassificationCounts,
    blockerCount: stage01PartialScopeBlockers.length,
    blockers: stage01PartialScopeBlockers,
    interpretation: stage01PartialScopeStatus === 'passed'
      ? 'Stage 01 partial PR scope is acceptable even if the full Sajik release payload is still blocked by clean, non-dirty expected files.'
      : 'Stage 01 partial PR scope is blocked by unexpected files, unexpected included files, absent expected payload files, or unavailable readiness metadata.',
  };

  const reviewRequiredReasons = [
    ...mixedStatusFiles.map((entry) => `MIXED_GIT_STATUS:${entry.file}:${entry.status}`),
    ...untrackedIncludedFiles.map((entry) => `UNTRACKED_INCLUDED_FILE:${entry.file}`),
    ...partialStagingReviewFiles
      .filter((entry) => entry.status !== '-')
      .map((entry) => `PARTIAL_STAGING_REVIEW:${entry.file}:${entry.status}`),
  ];

  const patchSeparationStatus = blockers.length > 0
    ? 'blocked'
    : reviewRequiredReasons.length > 0
      ? 'review-required'
      : 'ready';
  const absentExpectedFileCount = missingExpectedClassificationCounts['absent-from-worktree'] ?? 0;
  const stage01PartialStagingVerdict = unexpectedFiles.length > 0
    ? 'blocked-by-unexpected-files'
    : includedDiff.extra.length > 0
      ? 'blocked-by-unexpected-included-files'
      : absentExpectedFileCount > 0
        ? 'blocked-by-absent-expected-files'
        : !stage01PartialReadinessGate.available
          ? 'blocked-by-readiness-unavailable'
          : stage01PartialScopeStatus === 'passed'
            ? 'ready-for-partial-stage01-staging'
            : 'blocked-by-partial-scope';
  const partialVerificationAfterStaging = [
    'npm run qa:stadium:sajik:stage01-readiness',
    'npm run stadium:sajik:stage01-pr-scope-guard',
    'npm run stadium:sajik:stage01-staged-scope-audit:complete',
    'node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    'git diff --check',
  ];
  const fullReleaseVerificationAfterStaging = [
    'npm run stadium:sajik:pr-scope-guard',
    'node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts',
    'node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    'npm run stadium:sajik:editor-regression',
    'npm run stadium:sajik:pr-scope-guard-smoke',
    'npm run qa:stadium:sajik:polygon-v2',
    'npm run build',
    'git diff --check',
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    version: SCOPE_GUARD_VERSION,
    executionMode,
    commandExitCode,
    commandExitSummary,
    status: fullReleaseStatus,
    fullReleaseStatus,
    stage01PartialScopeStatus,
    doesNotRunGitAdd: true,
    sourcePolicy,
    stage01PartialReadinessGate,
    stage01PartialScopeGate,
    summary: {
      dirtyFileCount: dirtyEntries.length,
      includedFileCount: includedFiles.length,
      separateDirtyWorkCount: separateDirtyWork.length,
      unexpectedFileCount: unexpectedFiles.length,
      blockerCount: blockers.length,
      reviewRequiredReasonCount: reviewRequiredReasons.length,
      stage01ReadinessAvailable: stage01PartialReadinessGate.available,
      executionMode,
      commandExitCode,
      fullReleaseStatus,
      stage01PartialScopeStatus,
    },
    prScope: {
      releasePrScope: [
        'Sajik official 2026 PNG manual-polygon-v2 release lock',
        'Sajik normalized dataset/export/editor foundation',
        'Sajik dev-only editor v1.7 and browser regression',
        'Sajik hitPath candidate review report',
        'Sajik Stage 01 prewrite/apply-ready operator gates',
        'Sajik Stage 01 handoff and Stage 02 entry contract',
        'Sajik wheelchair marker layer split and transition readiness report',
        'Sajik editor v1.8 follow-up roadmap documentation',
        'Sajik focused QA gate and release documentation',
      ],
      excludedPrScope: [
        'Daegu work',
        'Daejeon work',
        'Gwangju work',
        'Suwon work',
        'non-Sajik stadium UI work',
        'common seatmap shell migration',
        'Sajik first-visit/runtime UX work',
        'generated build reports by default',
        'complete marker-only data model conversion',
        'actual expanded hitPath coordinates',
        'editor v1.8 implementation',
      ],
    },
    stagingManifest: {
      status: patchSeparationStatus,
      stage01PartialStagingVerdict,
      releasePayloadFileCount: expectedIncludedFiles.length,
      doesNotRunGitAdd: true,
      safeToRunBulkGitAdd: false,
      requiresManualHunkReview: partialHunkReviewBeforeStaging.some((entry) => entry.status !== '-'),
      wholeFileReviewBeforeStaging,
      partialHunkReviewBeforeStaging,
      excludedArtifacts,
      forbiddenStagingCommands,
      partialVerificationAfterStaging,
      fullReleaseVerificationAfterStaging,
    },
    patchSeparationReadiness: {
      status: patchSeparationStatus,
      manualReviewRequired: patchSeparationStatus === 'review-required',
      safeToRunBulkGitAdd: false,
      mixedStatusFiles,
      untrackedIncludedFiles,
      untrackedIncludedReviewRows,
      partialStagingReviewFiles,
      reviewRequiredReasons,
      recommendedStagingFlow: [
        'Run npm run stadium:sajik:pr-scope-guard.',
        'For partial Stage 01 changes, run npm run qa:stadium:sajik:stage01-readiness and npm run stadium:sajik:stage01-pr-scope-guard before staging.',
        'Use git add -p for package.json, src/components/StadiumGuideRuntimeSeatMaps.test.ts, scripts/stadium-ux-audit.mjs, and src/components/AppRoutes.tsx.',
        'Stage untracked Sajik files explicitly after reviewing them.',
        'Do not stage reports/*, dist/*, or non-Sajik stadium files in the Sajik PR.',
        'Run npm run qa:stadium:sajik:polygon-v2 after applying the selected patch in a clean worktree.',
      ],
    },
    expectedIncludedFiles,
    includedInventory: {
      expectedIncludedFileCount: expectedIncludedFiles.length,
      actualIncludedFileCount: includedFiles.length,
      missingExpectedIncludedFiles: includedDiff.missing,
      missingExpectedIncludedFileDetails,
      extraIncludedFiles: includedDiff.extra,
    },
    includedFiles,
    separateDirtyWork,
    unexpectedFiles,
    blockers,
  };

  const inventoryRows = expectedIncludedFiles.map((file) => {
    const entry = entriesByFile.get(file);
    const missingDetail = missingExpectedIncludedFileDetailsByFile.get(file);
    return [
      `\`${file}\``,
      `\`${entry?.status ?? '-'}\``,
      `\`${entry?.scope ?? missingDetail?.classification ?? 'missing'}\``,
      `\`${entry?.rule ?? '-'}\``,
      missingDetail ? `\`${missingDetail.classification}\`` : '`present`',
    ];
  });

  const markdown = [
    '# Sajik seatmap PR scope guard',
    '',
    `- version: \`${SCOPE_GUARD_VERSION}\``,
    `- execution mode: \`${report.executionMode}\``,
    `- status: \`${report.status}\``,
    `- full release status: \`${report.fullReleaseStatus}\``,
    `- stage 01 partial scope status: \`${report.stage01PartialScopeStatus}\``,
    `- current command expected exit: \`${report.commandExitCode}\``,
    `- full release command exit: \`${report.commandExitSummary.fullReleaseCommandExit}\``,
    `- stage 01 partial command exit: \`${report.commandExitSummary.stage01PartialCommandExit}\``,
    `- does not run git add: \`${report.doesNotRunGitAdd}\``,
    `- patch separation readiness: \`${patchSeparationStatus}\``,
    `- coordinate system: \`${sourcePolicy.coordinateSystem}\``,
    `- missing baseball data contract: \`${sourcePolicy.missingBaseballDataContract}\``,
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      Object.entries(report.summary).map(([key, value]) => [key, `\`${value}\``]),
    ),
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
    '',
    '## Missing Expected Included Files',
    '',
    missingExpectedIncludedFileDetails.length > 0
      ? markdownTable(
        ['file', 'exists on disk', 'classification', 'partial worktree interpretation', 'action'],
        missingExpectedIncludedFileDetails.map((entry) => [
          `\`${entry.file}\``,
          `\`${entry.existsOnDisk}\``,
          `\`${entry.classification}\``,
          entry.partialWorktreeInterpretation,
          entry.action,
        ]),
      )
      : 'No missing expected included files.',
    '',
    '## Stage 01 Partial Scope Status',
    '',
    `- status: \`${report.stage01PartialScopeGate.status}\``,
    `- command: \`${report.stage01PartialScopeGate.command}\``,
    `- mode argument: \`${report.stage01PartialScopeGate.modeArgument}\``,
    `- full release status: \`${report.stage01PartialScopeGate.fullReleaseStatus}\``,
    `- does not replace full release gate: \`${report.stage01PartialScopeGate.doesNotReplaceFullReleaseGate}\``,
    `- full release gate: \`${report.stage01PartialScopeGate.fullReleaseGate}\``,
    `- missing expected clean full-release payload files: \`${report.stage01PartialScopeGate.missingExpectedClassificationCounts['clean-full-release-payload'] ?? 0}\``,
    `- missing expected absent files: \`${report.stage01PartialScopeGate.missingExpectedClassificationCounts['absent-from-worktree'] ?? 0}\``,
    `- blocker count: \`${report.stage01PartialScopeGate.blockerCount}\``,
    `- interpretation: ${report.stage01PartialScopeGate.interpretation}`,
    '',
    report.stage01PartialScopeGate.blockers.length > 0
      ? report.stage01PartialScopeGate.blockers.map((blocker) => `- \`${blocker}\``).join('\n')
      : 'No Stage 01 partial scope blockers.',
    '',
    '## Stage 01 Partial Readiness Gate',
    '',
    `- available: \`${report.stage01PartialReadinessGate.available}\``,
    `- command: \`${report.stage01PartialReadinessGate.command}\``,
    `- does not run PR scope guard: \`${report.stage01PartialReadinessGate.doesNotRunPrScopeGuard}\``,
    `- does not run editor regression: \`${report.stage01PartialReadinessGate.doesNotRunEditorRegression}\``,
    `- does not run build: \`${report.stage01PartialReadinessGate.doesNotRunBuild}\``,
    `- does not replace full release gate: \`${report.stage01PartialReadinessGate.doesNotReplaceFullReleaseGate}\``,
    `- full release gate: \`${report.stage01PartialReadinessGate.fullReleaseGate}\``,
    `- partial blocker interpretation: ${report.stage01PartialReadinessGate.fullReleaseBlockerMeaning}`,
    '',
    '### Stage 01 Partial Gate Includes',
    '',
    report.stage01PartialReadinessGate.includes.map((command) => `- \`${command}\``).join('\n'),
    '',
    '### Stage 01 Partial Gate Excludes',
    '',
    report.stage01PartialReadinessGate.excludes.map((command) => `- \`${command}\``).join('\n'),
    '',
    '## Patch Separation Readiness',
    '',
    `- status: \`${patchSeparationStatus}\``,
    `- manual review required: \`${report.patchSeparationReadiness.manualReviewRequired}\``,
    `- safe to run bulk git add: \`${report.patchSeparationReadiness.safeToRunBulkGitAdd}\``,
    `- mixed status files: \`${mixedStatusFiles.length}\``,
    `- untracked included files: \`${untrackedIncludedFiles.length}\``,
    `- partial staging review files: \`${partialStagingReviewFiles.filter((entry) => entry.status !== '-').length}\``,
    '',
    reviewRequiredReasons.length > 0
      ? reviewRequiredReasons.map((reason) => `- \`${reason}\``).join('\n')
      : 'No patch separation review reasons.',
    '',
    '### Untracked Included Files',
    '',
    untrackedIncludedReviewRows.length > 0
      ? markdownTable(
        ['file', 'git status', 'expected payload', 'manual review required', 'unexpected file', 'staging action', 'reason'],
        untrackedIncludedReviewRows.map((entry) => [
          `\`${entry.file}\``,
          `\`${entry.status}\``,
          `\`${entry.expectedPayload}\``,
          `\`${entry.manualReviewRequired}\``,
          `\`${entry.unexpectedFile}\``,
          entry.stagingAction,
          entry.reason,
        ]),
      )
      : 'No untracked included files.',
    '',
    '## PR Staging Manifest',
    '',
    `- status: \`${report.stagingManifest.status}\``,
    `- release payload files: \`${report.stagingManifest.releasePayloadFileCount}\``,
    `- stage 01 partial staging verdict: \`${report.stagingManifest.stage01PartialStagingVerdict}\``,
    `- does not run git add: \`${report.stagingManifest.doesNotRunGitAdd}\``,
    `- safe to run bulk git add: \`${report.stagingManifest.safeToRunBulkGitAdd}\``,
    `- requires manual hunk review: \`${report.stagingManifest.requiresManualHunkReview}\``,
    '',
    '### Whole-File Review Before Staging',
    '',
    markdownTable(
      ['file', 'git status', 'scope', 'rule', 'action'],
      wholeFileReviewBeforeStaging.map((entry) => [
        `\`${entry.file}\``,
        `\`${entry.status}\``,
        `\`${entry.scope}\``,
        `\`${entry.rule}\``,
        entry.action,
      ]),
    ),
    '',
    '### Partial Hunk Review Before Staging',
    '',
    markdownTable(
      ['file', 'git status', 'scope', 'rule', 'include only', 'exclude', 'action'],
      partialHunkReviewBeforeStaging.map((entry) => [
        `\`${entry.file}\``,
        `\`${entry.status}\``,
        `\`${entry.scope}\``,
        `\`${entry.rule}\``,
        entry.includeOnly.map((item) => `\`${item}\``).join('<br>'),
        entry.exclude.map((item) => `\`${item}\``).join('<br>'),
        entry.action,
      ]),
    ),
    '',
    '### Excluded Artifacts',
    '',
    excludedArtifacts.map((artifact) => `- \`${artifact}\``).join('\n'),
    '',
    '### Forbidden Staging Commands',
    '',
    forbiddenStagingCommands.map((command) => `- \`${command}\``).join('\n'),
    '',
    '### Partial Verification After Staging',
    '',
    report.stagingManifest.partialVerificationAfterStaging.map((command) => `- \`${command}\``).join('\n'),
    '',
    '### Full Release Verification After Staging',
    '',
    report.stagingManifest.fullReleaseVerificationAfterStaging.map((command) => `- \`${command}\``).join('\n'),
    '',
    '### Partial Staging Review Files',
    '',
    markdownTable(
      ['file', 'git status', 'scope', 'rule', 'include only', 'exclude', 'reason'],
      partialStagingReviewFiles.map((entry) => [
        `\`${entry.file}\``,
        `\`${entry.status}\``,
        `\`${entry.scope}\``,
        `\`${entry.rule}\``,
        entry.includeOnly.map((item) => `\`${item}\``).join('<br>'),
        entry.exclude.map((item) => `\`${item}\``).join('<br>'),
        entry.reason,
      ]),
    ),
    '',
    '## Expected Sajik PR Files',
    '',
    markdownTable(
      ['file', 'git status', 'scope', 'rule', 'state'],
      inventoryRows,
    ),
    '',
    '## Included Dirty Files',
    '',
    includedFiles.length > 0
      ? markdownTable(
        ['status', 'file', 'rule', 'reason'],
        includedFiles.map((entry) => [
          `\`${entry.status}\``,
          `\`${entry.file}\``,
          `\`${entry.rule}\``,
          entry.reason,
        ]),
      )
      : 'No included dirty files.',
    '',
    '## Separate Dirty Work',
    '',
    separateDirtyWork.length > 0
      ? markdownTable(
        ['status', 'file', 'rule', 'reason'],
        separateDirtyWork.map((entry) => [
          `\`${entry.status}\``,
          `\`${entry.file}\``,
          `\`${entry.rule}\``,
          entry.reason,
        ]),
      )
      : 'No separate dirty work detected.',
    '',
    '## Unexpected Dirty Files',
    '',
    unexpectedFiles.length > 0
      ? markdownTable(
        ['status', 'file', 'reason'],
        unexpectedFiles.map((entry) => [
          `\`${entry.status}\``,
          `\`${entry.file}\``,
          entry.reason,
        ]),
      )
      : 'No unexpected dirty files.',
    '',
    '## Clean Worktree Patch Flow',
    '',
    '1. Run `npm run stadium:sajik:pr-scope-guard` in the mixed worktree.',
    '2. Review `reports/stadium/sajik-seatmap-pr-scope-guard.md`.',
    '3. In the Sajik clean worktree, apply only the included Sajik files and selected hunks.',
    '4. Use `git add -p` for `package.json`, `src/components/StadiumGuideRuntimeSeatMaps.test.ts`, `scripts/stadium-ux-audit.mjs`, and `src/components/AppRoutes.tsx`.',
    '5. Run `npm run qa:stadium:sajik:polygon-v2` before opening the PR.',
    '',
    '## Source Policy',
    '',
    `- Allowed coordinate source: ${sourcePolicy.allowedCoordinateSource}.`,
    `- Allowed coordinate system: ${sourcePolicy.coordinateSystem}.`,
    `- Missing or unclear baseball data uses \`${sourcePolicy.missingBaseballDataContract}\`.`,
    `- Disallowed sources: ${sourcePolicy.disallowedSources.join(', ')}.`,
    '',
  ].join('\n');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, markdown, 'utf8');

  console.log(`scope_guard_json:${jsonPath}`);
  console.log(`scope_guard_markdown:${markdownPath}`);
  console.log(`status:${report.status} fullRelease=${fullReleaseStatus} stage01PartialScope=${stage01PartialScopeStatus} mode=${executionMode} commandExit=${commandExitCode} included=${includedFiles.length} separate=${separateDirtyWork.length} unexpected=${unexpectedFiles.length} blockers=${blockers.length} partialBlockers=${stage01PartialScopeBlockers.length} patchSeparation=${patchSeparationStatus}`);

  if (commandExitCode !== 0) {
    process.exitCode = 1;
  }
};

const runPrScopeGuardSmoke = async () => {
  const { spawnSync } = await import("node:child_process");
  const { default: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const guardScript = path.join(scriptDir, 'sajik-seatmap-editor-scope.mjs');
  const reportJsonPath = path.join(frontendRoot, 'reports/stadium/sajik-seatmap-pr-scope-guard.json');
  const reportMarkdownPath = path.join(frontendRoot, 'reports/stadium/sajik-seatmap-pr-scope-guard.md');
  const smokeJsonPath = path.join(frontendRoot, 'reports/stadium/sajik-seatmap-pr-scope-guard-smoke.json');
  const smokeMarkdownPath = path.join(frontendRoot, 'reports/stadium/sajik-seatmap-pr-scope-guard-smoke.md');
  const packageJsonPath = path.join(frontendRoot, 'package.json');

  const stage01SummaryScriptFiles = [    'scripts/sajik-seatmap-stage01.mjs',
  ];

  const stage01SummaryPackageScripts = {
    'stadium:sajik:stage01-next-action-packet': 'npm run stadium:sajik:stage01-review-board && npm run stadium:sajik:stage01-next-action-packet',
    'stadium:sajik:stage01-target-review-packet': 'npm run stadium:sajik:stage01-next-action-packet && npm run stadium:sajik:stage01-target-review-packet',
    'stadium:sajik:stage01-target-image-analysis-smoke': 'npm run stadium:sajik:stage01-target-review-packet && npm run stadium:sajik:stage01-target-image-analysis-smoke',
    'stadium:sajik:stage01-all-target-review-packets': 'npm run stadium:sajik:stage01-next-action-packet && npm run stadium:sajik:stage01-target-review-packet --all-stage01-targets',
    'stadium:sajik:stage01-all-target-image-analysis-smoke': 'npm run stadium:sajik:stage01-all-target-review-packets && npm run stadium:sajik:stage01-target-image-analysis-smoke --all-stage01-targets',
    'stadium:sajik:stage01-target-entry-template-readiness-smoke': 'npm run stadium:sajik:stage01-target-review-packet && npm run stadium:sajik:stage01-target-entry-template-readiness-smoke',
    'stadium:sajik:stage01-target-entry-preflight': 'npm run stadium:sajik:stage01-target-review-packet && npm run stadium:sajik:stage01-target-entry-preflight',
    'stadium:sajik:stage01-target-entry-preflight-smoke': 'npm run stadium:sajik:stage01-target-entry-preflight-smoke',
    'stadium:sajik:stage01-target-approval-gate': 'npm run stadium:sajik:stage01-target-entry-preflight && npm run stadium:sajik:stage01-target-approval-gate',
    'stadium:sajik:stage01-target-approval-gate-smoke': 'npm run stadium:sajik:stage01-target-approval-gate-smoke',
    'stadium:sajik:stage01-all-target-approval-readiness': 'npm run stadium:sajik:stage01-all-target-review-packets && npm run stadium:sajik:stage01-all-target-approval-readiness',
    'stadium:sajik:stage01-all-target-approval-readiness-smoke': 'npm run stadium:sajik:stage01-all-target-approval-readiness && npm run stadium:sajik:stage01-all-target-approval-readiness-smoke',
    'stadium:sajik:stage01-all-target-approval-input-guide': 'npm run stadium:sajik:stage01-all-target-approval-readiness && npm run stadium:sajik:stage01-all-target-approval-input-guide',
    'stadium:sajik:stage01-all-target-approval-input-guide-smoke': 'npm run stadium:sajik:stage01-all-target-approval-input-guide && npm run stadium:sajik:stage01-all-target-approval-input-guide-smoke',
    'stadium:sajik:stage01-operator-input-intake-gate': 'npm run stadium:sajik:stage01-operator-input-intake-gate',
    'stadium:sajik:stage01-operator-input-intake-gate-smoke': 'npm run stadium:sajik:stage01-operator-input-intake-gate && npm run stadium:sajik:stage01-operator-input-intake-gate-smoke',
    'stadium:sajik:stage01-readiness-summary': 'npm run stadium:sajik:stage01-readiness-summary',
    'stadium:sajik:stage01-readiness-summary-smoke': 'npm run stadium:sajik:stage01-readiness-summary-smoke',
    'stadium:sajik:stage01-target-apply-precheck': 'npm run stadium:sajik:stage01-real-approval-readiness && npm run stadium:sajik:stage01-target-apply-precheck',
    'stadium:sajik:stage01-131-apply-path-status': 'npm run stadium:sajik:stage01-target-apply-precheck && npm run stadium:sajik:stage01-131-lifecycle-smoke && npm run stadium:sajik:stage01-131-apply-path-status',
    'stadium:sajik:stage01-completion-gate': 'npm run stadium:sajik:stage01-next-action-packet && npm run stadium:sajik:stage01-target-apply-precheck && npm run stadium:sajik:stage01-readiness-summary && npm run stadium:sajik:stage01-completion-gate',
    'stadium:sajik:stage01-completion-gate:complete': 'npm run stadium:sajik:stage01-next-action-packet && npm run stadium:sajik:stage01-target-apply-precheck && npm run stadium:sajik:stage01-readiness-summary && npm run stadium:sajik:stage01-completion-gate --require-complete',
    'stadium:sajik:stage01-completion-gate-smoke': 'npm run stadium:sajik:stage01-completion-gate-smoke',
    'stadium:sajik:stage01-staged-scope-audit-smoke': 'npm run stadium:sajik:stage01-staged-scope-audit-smoke',
    'stadium:sajik:stage01-pr-scope-guard': 'node scripts/stadium-seatmap-ops.mjs sajik stage01-pr-scope-guard',
  };

  const failures = [];
  const expect = (condition, message) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const runGuardSnapshot = (label, args) => {
    const result = spawnSync(process.execPath, [guardScript, ...args], {
      cwd: frontendRoot,
      encoding: 'utf8',
    });

    if (result.stdout) {
      process.stdout.write(result.stdout);
    }

    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    if (result.error) {
      failures.push(`${label} scope guard spawn failed: ${result.error.message}`);
    }

    expect([0, 1].includes(result.status), `unexpected ${label} scope guard exit status: ${result.status}`);
    expect(fs.existsSync(reportJsonPath), `missing ${label} scope guard JSON report: ${reportJsonPath}`);
    expect(fs.existsSync(reportMarkdownPath), `missing ${label} scope guard markdown report: ${reportMarkdownPath}`);

    const report = fs.existsSync(reportJsonPath)
      ? JSON.parse(fs.readFileSync(reportJsonPath, 'utf8'))
      : null;
    const markdown = fs.existsSync(reportMarkdownPath)
      ? fs.readFileSync(reportMarkdownPath, 'utf8')
      : '';

    return {
      label,
      args,
      exitCode: result.status,
      report,
      markdown,
    };
  };

  const fullReleaseRun = runGuardSnapshot('full-release', []);
  const partialRun = runGuardSnapshot('stage01-partial', ['--stage01-partial']);
  const guardResult = { status: fullReleaseRun.exitCode };
  const partialGuardResult = { status: partialRun.exitCode };
  const report = partialRun.report;
  const markdown = partialRun.markdown;
  const fullReleaseReport = fullReleaseRun.report;
  const partialReport = partialRun.report;

  if (report) {
    const gate = report.stage01PartialReadinessGate;
    const partialScopeGate = report.stage01PartialScopeGate;
    const expectedIncludedFiles = report.expectedIncludedFiles ?? [];
    const missingExpectedIncludedFiles = report.includedInventory?.missingExpectedIncludedFiles ?? [];
    const missingExpectedIncludedFileDetails = report.includedInventory?.missingExpectedIncludedFileDetails ?? [];
    const partialVerificationAfterStaging = report.stagingManifest?.partialVerificationAfterStaging ?? [];
    const fullReleaseVerificationAfterStaging = report.stagingManifest?.fullReleaseVerificationAfterStaging ?? [];
    const recommendedStagingFlow = report.patchSeparationReadiness?.recommendedStagingFlow ?? [];
    const untrackedIncludedFiles = report.patchSeparationReadiness?.untrackedIncludedFiles ?? [];
    const untrackedIncludedReviewRows = report.patchSeparationReadiness?.untrackedIncludedReviewRows ?? [];
    const reviewRequiredReasons = report.patchSeparationReadiness?.reviewRequiredReasons ?? [];
    const missingExpectedIncludedFilesOnDisk = expectedIncludedFiles
      .filter((file) => !fs.existsSync(path.join(frontendRoot, file)));
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(fullReleaseReport?.executionMode === 'full-release', 'fullReleaseRun.executionMode must be full-release');
    expect(partialReport?.executionMode === 'stage01-partial', 'partialRun.executionMode must be stage01-partial');
    expect(fullReleaseRun.exitCode === fullReleaseReport?.commandExitCode, 'fullReleaseRun.exitCode must match commandExitCode');
    expect(partialRun.exitCode === partialReport?.commandExitCode, 'partialRun.exitCode must match commandExitCode');
    expect(fullReleaseReport?.commandExitSummary?.fullReleaseCommandExit === fullReleaseRun.exitCode, 'fullReleaseRun command summary must mirror exit code');
    expect(partialReport?.commandExitSummary?.stage01PartialCommandExit === partialRun.exitCode, 'partialRun command summary must mirror exit code');
    expect(fullReleaseReport?.commandExitSummary?.stage01PartialCommandExit === partialReport?.commandExitSummary?.stage01PartialCommandExit, 'full and partial reports must agree on stage01 partial command exit');
    expect(fullReleaseReport?.stage01PartialScopeStatus === partialReport?.stage01PartialScopeStatus, 'full and partial reports must agree on stage01PartialScopeStatus');
    expect(report.executionMode === 'stage01-partial', 'latest report snapshot must be from stage01-partial executionMode');
    expect(report.doesNotRunGitAdd === true, 'scope guard must not run git add');
    expect(typeof report.commandExitCode === 'number', 'scope guard report must include commandExitCode');
    expect(report.commandExitCode === partialRun.exitCode, 'latest report commandExitCode must match stage01 partial exit');
    expect(report.commandExitSummary?.fullReleaseCommandExit === guardResult.status, 'commandExitSummary must preserve full release exit code');
    expect(report.commandExitSummary?.stage01PartialCommandExit === partialGuardResult.status, 'commandExitSummary must preserve stage01 partial exit code');
    expect(['passed', 'blocked'].includes(report.fullReleaseStatus), 'fullReleaseStatus must be passed or blocked');
    expect(['passed', 'blocked'].includes(report.stage01PartialScopeStatus), 'stage01PartialScopeStatus must be passed or blocked');
    expect(report.fullReleaseStatus === report.status, 'top-level status must match fullReleaseStatus');
    expect(report.stagingManifest?.releasePayloadFileCount === 62, 'releasePayloadFileCount must be 62');
    expect(report.stagingManifest?.stage01PartialStagingVerdict === 'ready-for-partial-stage01-staging', 'stage01PartialStagingVerdict must be ready-for-partial-stage01-staging');
    expect(expectedIncludedFiles.length === 62, 'expectedIncludedFiles must contain 62 release payload files');
    expect(missingExpectedIncludedFilesOnDisk.length === 0, `expected included files must exist on disk: ${missingExpectedIncludedFilesOnDisk.join(', ')}`);
    expect(report.summary?.unexpectedFileCount === 0, 'scope guard smoke expects zero unexpected dirty files in the Sajik PR inventory');
    expect(report.stagingManifest?.safeToRunBulkGitAdd === false, 'safeToRunBulkGitAdd must be false');
    expect(report.summary?.stage01ReadinessAvailable === true, 'stage01ReadinessAvailable must be true');
    expect(report.summary?.stage01PartialScopeStatus === report.stage01PartialScopeStatus, 'summary must mirror stage01PartialScopeStatus');
    expect(Boolean(partialScopeGate), 'stage01PartialScopeGate is required');
    expect(partialScopeGate?.command === 'npm run stadium:sajik:stage01-pr-scope-guard', 'stage01 partial scope command mismatch');
    expect(partialScopeGate?.modeArgument === '--stage01-partial', 'stage01 partial mode argument mismatch');
    expect(partialScopeGate?.doesNotReplaceFullReleaseGate === true, 'stage01 partial scope gate must not replace full release gate');
    expect(partialScopeGate?.fullReleaseGate === 'npm run qa:stadium:sajik:polygon-v2', 'stage01 partial scope full release gate mismatch');
    expect(partialScopeGate?.passCriteria?.unexpectedFileCount === 0, 'stage01 partial scope pass criteria must require zero unexpected files');
    expect(partialScopeGate?.passCriteria?.missingExpectedFileClassification === 'clean-full-release-payload', 'stage01 partial scope pass criteria must allow only clean full-release missing files');
    expect(partialScopeGate?.passCriteria?.absentFromWorktreeCount === 0, 'stage01 partial scope pass criteria must require absentFromWorktreeCount zero');
    expect(partialScopeGate?.passCriteria?.safeToRunBulkGitAdd === false, 'stage01 partial scope pass criteria must keep bulk git add unsafe');
    expect(partialScopeGate?.fullReleaseStatus === report.fullReleaseStatus, 'stage01 partial scope gate must mirror fullReleaseStatus');
    expect(partialScopeGate?.status === report.stage01PartialScopeStatus, 'stage01 partial scope gate must mirror stage01PartialScopeStatus');
    expect(
      report.stage01PartialScopeStatus === 'passed' ? partialGuardResult.status === 0 : partialGuardResult.status === 1,
      `stage01 partial scope guard exit must match partial status: ${report.stage01PartialScopeStatus}`,
    );
    expect(
      report.stage01PartialScopeStatus !== 'passed' || partialScopeGate?.blockerCount === 0,
      'passed stage01 partial scope must have zero blockers',
    );
    expect(
      missingExpectedIncludedFileDetails.length === missingExpectedIncludedFiles.length,
      'missing expected included file details must mirror missing expected included files',
    );
    for (const entry of missingExpectedIncludedFileDetails) {
      expect(expectedIncludedFiles.includes(entry.file), `missing expected detail must be part of expectedIncludedFiles: ${entry.file}`);
      expect(typeof entry.existsOnDisk === 'boolean', `missing expected detail must include existsOnDisk: ${entry.file}`);
      expect(
        ['clean-full-release-payload', 'absent-from-worktree'].includes(entry.classification),
        `missing expected detail must include a known classification: ${entry.file}`,
      );
      expect(
        String(entry.partialWorktreeInterpretation ?? '').includes('full Sajik release payload'),
        `missing expected detail must explain full release payload meaning: ${entry.file}`,
      );
    }
    for (const entry of untrackedIncludedFiles) {
      expect(expectedIncludedFiles.includes(entry.file), `untracked included file must be part of expectedIncludedFiles: ${entry.file}`);
      expect(
        reviewRequiredReasons.includes(`UNTRACKED_INCLUDED_FILE:${entry.file}`),
        `untracked included file must be represented as a review-required reason: ${entry.file}`,
      );
    }
    expect(
      untrackedIncludedReviewRows.length === untrackedIncludedFiles.length,
      'untracked included review rows must mirror untracked included files',
    );
    for (const entry of untrackedIncludedReviewRows) {
      expect(entry.expectedPayload === true, `untracked included review row must be expected payload: ${entry.file}`);
      expect(entry.manualReviewRequired === true, `untracked included review row must require manual review: ${entry.file}`);
      expect(entry.unexpectedFile === false, `untracked included review row must not be treated as unexpected: ${entry.file}`);
      expect(String(entry.stagingAction ?? '').includes('manual whole-file review'), `untracked included review row must explain whole-file review: ${entry.file}`);
    }
    for (const file of stage01SummaryScriptFiles) {
      expect(expectedIncludedFiles.includes(file), `expectedIncludedFiles must include ${file}`);
      expect(fs.existsSync(path.join(frontendRoot, file)), `Stage 01 summary script must exist on disk: ${file}`);
    }
    for (const [scriptName, expectedCommand] of Object.entries(stage01SummaryPackageScripts)) {
      expect(packageJson.scripts?.[scriptName] === expectedCommand, `package script ${scriptName} must point to ${expectedCommand}`);
    }
    expect(Boolean(gate), 'stage01PartialReadinessGate is required');
    expect(gate?.available === true, 'stage01PartialReadinessGate.available must be true');
    expect(gate?.command === 'npm run qa:stadium:sajik:stage01-readiness', 'stage01 partial readiness command mismatch');
    expect(gate?.doesNotRunPrScopeGuard === true, 'stage01 partial readiness gate must not run pr-scope-guard');
    expect(gate?.doesNotRunEditorRegression === true, 'stage01 partial readiness gate must not run editor regression');
    expect(gate?.doesNotRunBuild === true, 'stage01 partial readiness gate must not run build');
    expect(gate?.doesNotReplaceFullReleaseGate === true, 'stage01 partial readiness gate must not replace full release gate');
    expect(gate?.fullReleaseGate === 'npm run qa:stadium:sajik:polygon-v2', 'full release gate mismatch');
    expect(gate?.fullReleaseBlockerMeaning?.includes('missing full Sajik v2 release payload'), 'full release blocker meaning must mention missing full Sajik v2 release payload');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-real-approval-readiness'), 'partial gate must include real approval readiness');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-prewrite-smoke'), 'partial gate must include prewrite smoke');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-approved-dry-run'), 'partial gate must include approved dry-run');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-applied-dry-run'), 'partial gate must include applied dry-run');
    expect(gate?.includes?.includes('node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts'), 'partial gate must include Sajik-focused static contract test');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-next-action-packet'), 'partial gate must include next-action packet');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-target-review-packet'), 'partial gate must include target review packet');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-target-image-analysis-smoke'), 'partial gate must include target image-analysis smoke');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-all-target-review-packets'), 'partial gate must include all-target official PNG review packets');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-all-target-image-analysis-smoke'), 'partial gate must include all-target image-analysis smoke');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-target-entry-template-readiness-smoke'), 'partial gate must include target entry template readiness smoke');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-target-entry-preflight'), 'partial gate must include target entry preflight');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-target-entry-preflight-smoke'), 'partial gate must include target entry preflight smoke');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-target-approval-gate'), 'partial gate must include target approval gate');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-target-approval-gate-smoke'), 'partial gate must include target approval gate smoke');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-all-target-approval-readiness'), 'partial gate must include all-target approval readiness');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-all-target-approval-readiness-smoke'), 'partial gate must include all-target approval readiness smoke');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-all-target-approval-input-guide'), 'partial gate must include all-target approval input guide');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-all-target-approval-input-guide-smoke'), 'partial gate must include all-target approval input guide smoke');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-operator-input-intake-gate'), 'partial gate must include operator input intake gate');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-operator-input-intake-gate-smoke'), 'partial gate must include operator input intake gate smoke');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-target-apply-precheck'), 'partial gate must include target apply precheck');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-131-apply-path-status'), 'partial gate must include 131 apply path status');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-completion-gate'), 'partial gate must include completion gate');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-completion-gate-smoke'), 'partial gate must include completion gate smoke');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-staged-scope-audit-smoke'), 'partial gate must include staged scope audit smoke');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-readiness-summary'), 'partial gate must include readiness summary');
    expect(gate?.includes?.includes('npm run stadium:sajik:stage01-readiness-summary-smoke'), 'partial gate must include readiness summary smoke');
    expect(gate?.excludes?.includes('npm run stadium:sajik:pr-scope-guard'), 'partial gate must exclude pr-scope-guard');
    expect(gate?.excludes?.includes('npm run stadium:sajik:editor-regression'), 'partial gate must exclude editor regression');
    expect(gate?.excludes?.includes('npm run build'), 'partial gate must exclude build');
    expect(partialVerificationAfterStaging.includes('npm run qa:stadium:sajik:stage01-readiness'), 'partialVerificationAfterStaging must include partial readiness gate');
    expect(partialVerificationAfterStaging.includes('npm run stadium:sajik:stage01-pr-scope-guard'), 'partialVerificationAfterStaging must include stage01 partial scope guard');
    expect(partialVerificationAfterStaging.includes('npm run stadium:sajik:stage01-staged-scope-audit:complete'), 'partialVerificationAfterStaging must include staged scope audit complete gate');
    expect(partialVerificationAfterStaging.includes('node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts'), 'partialVerificationAfterStaging must include focused Sajik static test');
    expect(partialVerificationAfterStaging.includes('git diff --check'), 'partialVerificationAfterStaging must include git diff --check');
    expect(!partialVerificationAfterStaging.includes('npm run qa:stadium:sajik:polygon-v2'), 'partialVerificationAfterStaging must not include full release gate');
    expect(!partialVerificationAfterStaging.includes('npm run build'), 'partialVerificationAfterStaging must not include build');
    expect(fullReleaseVerificationAfterStaging.includes('npm run qa:stadium:sajik:polygon-v2'), 'fullReleaseVerificationAfterStaging must include full release gate');
    expect(fullReleaseVerificationAfterStaging.includes('npm run stadium:sajik:editor-regression'), 'fullReleaseVerificationAfterStaging must include editor regression');
    expect(fullReleaseVerificationAfterStaging.includes('npm run build'), 'fullReleaseVerificationAfterStaging must include build');
    expect(!fullReleaseVerificationAfterStaging.includes('npm run qa:stadium:sajik:stage01-readiness'), 'fullReleaseVerificationAfterStaging must not include partial readiness gate');
    expect(recommendedStagingFlow.some((line) => line.includes('qa:stadium:sajik:stage01-readiness')), 'recommended staging flow must mention partial readiness gate');
    expect(recommendedStagingFlow.some((line) => line.includes('stadium:sajik:stage01-pr-scope-guard')), 'recommended staging flow must mention partial scope guard');
    expect(guardResult.status === 0 || report.status === 'blocked', 'nonzero scope guard exit is allowed only for blocked reports');
  }

  expect(markdown.includes('## Stage 01 Partial Scope Status'), 'markdown must include Stage 01 Partial Scope Status section');
  expect(markdown.includes('execution mode'), 'markdown must include execution mode summary');
  expect(markdown.includes('current command expected exit'), 'markdown must include current command expected exit summary');
  expect(markdown.includes('full release command exit'), 'markdown must include full release command exit summary');
  expect(markdown.includes('stage 01 partial command exit'), 'markdown must include stage01 partial command exit summary');
  expect(markdown.includes('stage01PartialScopeStatus'), 'markdown must include stage01PartialScopeStatus summary');
  expect(markdown.includes('stage 01 partial staging verdict'), 'markdown must include stage01 partial staging verdict');
  expect(markdown.includes('ready-for-partial-stage01-staging'), 'markdown must include ready partial staging verdict');
  expect(markdown.includes('### Partial Verification After Staging'), 'markdown must include Partial Verification After Staging section');
  expect(markdown.includes('### Full Release Verification After Staging'), 'markdown must include Full Release Verification After Staging section');
  expect(markdown.includes('npm run stadium:sajik:stage01-pr-scope-guard'), 'markdown must mention stage01 partial scope command');
  expect(markdown.includes('No Stage 01 partial scope blockers.') || markdown.includes('STAGE01_PARTIAL_'), 'markdown must explain stage01 partial scope blockers');
  expect(markdown.includes('## Stage 01 Partial Readiness Gate'), 'markdown must include Stage 01 Partial Readiness Gate section');
  expect(markdown.includes('## Missing Expected Included Files'), 'markdown must include Missing Expected Included Files section');
  expect(markdown.includes('clean-full-release-payload') || markdown.includes('No missing expected included files.'), 'markdown must classify missing full release payload files');
  expect(markdown.includes('### Untracked Included Files'), 'markdown must include Untracked Included Files section');
  expect(markdown.includes('manual whole-file review'), 'markdown must describe manual whole-file review for untracked included files');
  expect(markdown.includes('stage01ReadinessAvailable'), 'markdown must include stage01ReadinessAvailable summary');
  expect(markdown.includes('npm run qa:stadium:sajik:stage01-readiness'), 'markdown must mention partial readiness command');
  expect(markdown.includes('does not replace full release gate'), 'markdown must state partial gate does not replace full release gate');

  const buildRunSnapshot = (run) => ({
    label: run.label,
    args: run.args,
    exitCode: run.exitCode,
    executionMode: run.report?.executionMode ?? null,
    commandExitCode: run.report?.commandExitCode ?? null,
    status: run.report?.status ?? null,
    fullReleaseStatus: run.report?.fullReleaseStatus ?? null,
    stage01PartialScopeStatus: run.report?.stage01PartialScopeStatus ?? null,
    stage01PartialStagingVerdict: run.report?.stagingManifest?.stage01PartialStagingVerdict ?? null,
    blockerCount: run.report?.summary?.blockerCount ?? null,
    stage01PartialBlockerCount: run.report?.stage01PartialScopeGate?.blockerCount ?? null,
    unexpectedFileCount: run.report?.summary?.unexpectedFileCount ?? null,
    missingExpectedFileCount: run.report?.includedInventory?.missingExpectedIncludedFiles?.length ?? null,
    cleanFullReleasePayloadMissingCount: run.report?.stage01PartialScopeGate?.missingExpectedClassificationCounts?.['clean-full-release-payload'] ?? 0,
    absentFromWorktreeCount: run.report?.stage01PartialScopeGate?.missingExpectedClassificationCounts?.['absent-from-worktree'] ?? 0,
    partialVerificationAfterStaging: run.report?.stagingManifest?.partialVerificationAfterStaging ?? [],
    fullReleaseVerificationAfterStaging: run.report?.stagingManifest?.fullReleaseVerificationAfterStaging ?? [],
  });

  const smokeReport = {
    generatedAt: new Date().toISOString(),
    status: failures.length > 0 ? 'failed' : 'passed',
    reportJsonPath,
    reportMarkdownPath,
    fullReleaseRun: buildRunSnapshot(fullReleaseRun),
    partialRun: buildRunSnapshot(partialRun),
    failures,
  };

  const smokeMarkdown = [
    '# Sajik seatmap PR scope guard smoke',
    '',
    `- status: \`${smokeReport.status}\``,
    `- full release run exit: \`${smokeReport.fullReleaseRun.exitCode}\``,
    `- full release run status: \`${smokeReport.fullReleaseRun.status}\``,
    `- full release run execution mode: \`${smokeReport.fullReleaseRun.executionMode}\``,
    `- partial run exit: \`${smokeReport.partialRun.exitCode}\``,
    `- partial run status: \`${smokeReport.partialRun.status}\``,
    `- partial run execution mode: \`${smokeReport.partialRun.executionMode}\``,
    `- partial run stage01 scope: \`${smokeReport.partialRun.stage01PartialScopeStatus}\``,
    `- partial run staging verdict: \`${smokeReport.partialRun.stage01PartialStagingVerdict}\``,
    '',
    '## Full Release Run',
    '',
    '```json',
    JSON.stringify(smokeReport.fullReleaseRun, null, 2),
    '```',
    '',
    '## Stage 01 Partial Run',
    '',
    '```json',
    JSON.stringify(smokeReport.partialRun, null, 2),
    '```',
    '',
    '## Failures',
    '',
    failures.length > 0 ? failures.map((failure) => `- ${failure}`).join('\n') : 'No failures.',
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(smokeJsonPath), { recursive: true });
  fs.writeFileSync(smokeJsonPath, `${JSON.stringify(smokeReport, null, 2)}\n`, 'utf8');
  fs.writeFileSync(smokeMarkdownPath, smokeMarkdown, 'utf8');
  console.log(`scope_guard_smoke_json:${smokeJsonPath}`);
  console.log(`scope_guard_smoke_markdown:${smokeMarkdownPath}`);

  if (failures.length > 0) {
    console.error('[sajik-pr-scope-guard-smoke] failed');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`status:passed guardStatus=${report?.status ?? 'unknown'} guardExit=${guardResult.status} stage01PartialScope=${report?.stage01PartialScopeStatus ?? 'unknown'} stage01PartialExit=${partialGuardResult.status} releasePayloadFileCount=${report?.stagingManifest?.releasePayloadFileCount ?? 'unknown'} stage01ReadinessAvailable=${report?.summary?.stage01ReadinessAvailable ?? 'unknown'}`);
};

const TASKS = {
  "editor-regression": runEditorRegression,
  "marker-transition-review": runMarkerTransitionReview,
  "pr-scope-guard": runPrScopeGuard,
  "pr-scope-guard-smoke": runPrScopeGuardSmoke,
};

export const runSajikEditorScopeTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Sajik editor/scope task: ${task}. Available tasks: ${available}`);
  }

  const originalArgv = process.argv;
  process.argv = [originalArgv[0], originalArgv[1], ...args];
  try {
    await runner();
  } finally {
    process.argv = originalArgv;
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [task, ...args] = process.argv.slice(2);
  await runSajikEditorScopeTask(task, args);
}
