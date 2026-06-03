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
    '- `node scripts/stadium-seatmap-ops.mjs sajik marker-transition-review`',
    '- `node scripts/stadium-seatmap-ops.mjs sajik dataset-export --check`',
    '- `node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts`',
    '- `node scripts/stadium-seatmap-ops.mjs sajik editor-regression`',
    '- `node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard`',
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

  const GUARD_VERSION = 'SAJIK_PR_SCOPE_GUARD_V3_CANONICAL_RUNTIME_ONLY';
  const publicSajikAliases = [
    'qa:stadium:sajik:full',
    'qa:stadium:sajik:mobile',
    'qa:stadium:sajik:release-lock',
    'stadium:sajik:alignment-audit',
    'stadium:sajik:block-source-duplication-audit',
    'stadium:sajik:pixel-components',
    'stadium:sajik:status',
    'stadium:sajik:trace-manifest',
  ].sort();
  const removedHistoricalScriptFiles = [
    'scripts/sajik-seatmap-hitpath-candidate-review.mjs',
    'scripts/sajik-seatmap-operator-reference.mjs',
    'scripts/sajik-seatmap-stage01.mjs',
    'scripts/sajik-seatmap-zone-precision-worksets.mjs',
  ];
  const forbiddenPublicAliasFragments = [
    ':sajik:stage01',
    ':sajik:operator-reference',
    ':sajik:hitpath-review',
    ':sajik:zone-precision-worksets',
    ':sajik:polygon-v2',
    ':sajik:trace-review',
  ];
  const historicalPolicy = {
    runtimeSurface: 'canonical/runtime public commands only',
    removedWorkflows: ['stage01', 'operator-reference', 'hitpath-review', 'zone-precision-worksets', 'polygon-v2', 'trace-review alias'],
    restoreFrom: 'Git history',
    generatedArtifactsOutOfScope: ['reports/', 'output/', 'dist/'],
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const pathExists = async (relativePath) => {
    try {
      await fs.access(path.join(frontendRoot, relativePath));
      return true;
    } catch {
      return false;
    }
  };

  const parseStatusLine = (line) => {
    const status = line.slice(0, 2);
    const rawPath = line.slice(3);
    const file = rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath;
    return { status, file };
  };

  const isCanonicalSajikFile = (file) => file === 'package.json'
    || file === 'scripts/stadium-seatmap-ops.mjs'
    || file === 'scripts/stadium-ux-audit.mjs'
    || file === 'src/components/AppRoutes.tsx'
    || file === 'src/components/StadiumGuideRuntimeSeatMaps.test.ts'
    || file === 'src/utils/seatMapPolygonValidator.ts'
    || file.startsWith('docs/sajik-seatmap-')
    || file.startsWith('scripts/sajik-seatmap-')
    || file.startsWith('src/components/sajik/')
    || file.startsWith('src/data/sajik')
    || file.startsWith('src/assets/stadiums/lotte/sajik-');

  const isSeparatedWorkstreamFile = (file) => file.startsWith('reports/')
    || file.startsWith('output/')
    || file.startsWith('dist/')
    || file.startsWith('cypress/')
    || file === 'docs/stadium-seatmap-overlay-checklist.md'
    || file.startsWith('docs/daegu-')
    || file.startsWith('docs/daejeon-')
    || file.startsWith('docs/gwangju-')
    || file.startsWith('docs/incheon-')
    || file.startsWith('docs/jamsil-')
    || file.startsWith('docs/suwon-')
    || file.startsWith('scripts/daegu-')
    || file.startsWith('scripts/daejeon-')
    || file.startsWith('scripts/gwangju-')
    || file.startsWith('scripts/incheon-')
    || file.startsWith('scripts/jamsil-')
    || file.startsWith('scripts/suwon-')
    || file.startsWith('src/components/daegu/')
    || file.startsWith('src/components/daejeon/')
    || file.startsWith('src/components/gwangju/')
    || file.startsWith('src/components/incheon/')
    || file.startsWith('src/components/jamsil/')
    || file.startsWith('src/components/suwon/')
    || file.startsWith('src/data/daegu')
    || file.startsWith('src/data/daejeon')
    || file.startsWith('src/data/gwangju')
    || file.startsWith('src/data/incheon')
    || file.startsWith('src/data/jamsil')
    || file.startsWith('src/data/suwon')
    || file.startsWith('src/assets/stadiums/kia/')
    || file === '.env.production'
    || file === '.gitignore';

  const classifyFile = (entry) => {
    if (removedHistoricalScriptFiles.includes(entry.file)) {
      return {
        ...entry,
        scope: 'historical-removal',
        reason: 'Deleted historical Sajik workflow script; recover from Git history only.',
      };
    }

    if (isCanonicalSajikFile(entry.file)) {
      return {
        ...entry,
        scope: 'canonical-sajik',
        reason: 'Canonical/runtime Sajik release payload or public QA command support.',
      };
    }

    if (isSeparatedWorkstreamFile(entry.file)) {
      return {
        ...entry,
        scope: 'separate-workstream',
        reason: 'Dirty file belongs to a generated artifact, another stadium, or another feature stream.',
      };
    }

    return {
      ...entry,
      scope: 'unexpected',
      reason: 'Dirty file is not part of the Sajik canonical/runtime cleanup scope.',
    };
  };

  const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd: frontendRoot });
  const dirtyEntries = stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map(parseStatusLine)
    .map(classifyFile);

  const packageJson = JSON.parse(await fs.readFile(path.join(frontendRoot, 'package.json'), 'utf8'));
  const actualPublicSajikAliases = Object.keys(packageJson.scripts ?? {})
    .filter((scriptName) => scriptName.includes(':sajik'))
    .sort();
  const missingPublicAliases = publicSajikAliases.filter((scriptName) => !actualPublicSajikAliases.includes(scriptName));
  const extraPublicAliases = actualPublicSajikAliases.filter((scriptName) => !publicSajikAliases.includes(scriptName));
  const forbiddenPublicAliases = actualPublicSajikAliases.filter((scriptName) => (
    forbiddenPublicAliasFragments.some((fragment) => scriptName.includes(fragment))
  ));
  const removedHistoricalFiles = await Promise.all(removedHistoricalScriptFiles.map(async (file) => ({
    file,
    existsOnDisk: await pathExists(file),
    policy: 'removed-from-working-tree',
  })));
  const unexpectedFiles = dirtyEntries.filter((entry) => entry.scope === 'unexpected');
  const blockers = [
    ...unexpectedFiles.map((entry) => `UNEXPECTED_DIRTY_FILE:${entry.file}`),
    ...missingPublicAliases.map((scriptName) => `MISSING_PUBLIC_ALIAS:${scriptName}`),
    ...extraPublicAliases.map((scriptName) => `EXTRA_PUBLIC_ALIAS:${scriptName}`),
    ...forbiddenPublicAliases.map((scriptName) => `FORBIDDEN_PUBLIC_ALIAS:${scriptName}`),
    ...removedHistoricalFiles.filter((entry) => entry.existsOnDisk).map((entry) => `REMOVED_HISTORICAL_SCRIPT_STILL_EXISTS:${entry.file}`),
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    version: GUARD_VERSION,
    status: blockers.length === 0 ? 'passed' : 'blocked',
    historicalPolicy,
    summary: {
      dirtyFiles: dirtyEntries.length,
      canonicalSajikFiles: dirtyEntries.filter((entry) => entry.scope === 'canonical-sajik').length,
      historicalRemovals: dirtyEntries.filter((entry) => entry.scope === 'historical-removal').length,
      separateWorkstreamFiles: dirtyEntries.filter((entry) => entry.scope === 'separate-workstream').length,
      unexpectedFiles: unexpectedFiles.length,
      publicAliasCount: actualPublicSajikAliases.length,
      removedHistoricalScriptCount: removedHistoricalScriptFiles.length,
      blockers: blockers.length,
    },
    publicSajikAliases,
    actualPublicSajikAliases,
    missingPublicAliases,
    extraPublicAliases,
    forbiddenPublicAliases,
    removedHistoricalFiles,
    dirtyEntries,
    blockers,
  };

  const dirtyRows = dirtyEntries.map((entry) => [entry.status, `\`${entry.file}\``, `\`${entry.scope}\``, entry.reason]);
  const markdown = [
    '# Sajik seatmap PR scope guard',
    '',
    `- version: \`${GUARD_VERSION}\``,
    `- status: \`${report.status}\``,
    `- runtime surface: \`${historicalPolicy.runtimeSurface}\``,
    `- historical replay: restore Stage 01/operator-reference workflows from \`${historicalPolicy.restoreFrom}\` only`,
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], Object.entries(report.summary).map(([key, value]) => [key, `\`${value}\``])),
    '',
    '## Public Sajik Aliases',
    '',
    publicSajikAliases.map((scriptName) => `- \`${scriptName}\``).join('\n'),
    '',
    '## Removed Historical Scripts',
    '',
    markdownTable(['file', 'existsOnDisk', 'policy'], removedHistoricalFiles.map((entry) => [
      `\`${entry.file}\``,
      `\`${entry.existsOnDisk}\``,
      entry.policy,
    ])),
    '',
    '## Dirty Worktree Classification',
    '',
    dirtyRows.length > 0 ? markdownTable(['status', 'file', 'scope', 'reason'], dirtyRows) : 'No dirty files.',
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
    '',
  ].join('\n');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, markdown, 'utf8');

  console.log(`scope_guard_json:${jsonPath}`);
  console.log(`scope_guard_markdown:${markdownPath}`);
  console.log(`status:${report.status} dirty=${report.summary.dirtyFiles} canonical=${report.summary.canonicalSajikFiles} historicalRemovals=${report.summary.historicalRemovals} separate=${report.summary.separateWorkstreamFiles} unexpected=${report.summary.unexpectedFiles} publicAliases=${report.summary.publicAliasCount} blockers=${report.summary.blockers}`);

  if (blockers.length > 0) {
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
  const smokeJsonPath = path.join(frontendRoot, 'reports/stadium/sajik-seatmap-pr-scope-guard-smoke.json');
  const smokeMarkdownPath = path.join(frontendRoot, 'reports/stadium/sajik-seatmap-pr-scope-guard-smoke.md');
  const packageJsonPath = path.join(frontendRoot, 'package.json');
  const expectedPublicAliases = [
    'qa:stadium:sajik:full',
    'qa:stadium:sajik:mobile',
    'qa:stadium:sajik:release-lock',
    'stadium:sajik:alignment-audit',
    'stadium:sajik:block-source-duplication-audit',
    'stadium:sajik:pixel-components',
    'stadium:sajik:status',
    'stadium:sajik:trace-manifest',
  ].sort();
  const removedHistoricalScriptFiles = [
    'scripts/sajik-seatmap-hitpath-candidate-review.mjs',
    'scripts/sajik-seatmap-operator-reference.mjs',
    'scripts/sajik-seatmap-stage01.mjs',
    'scripts/sajik-seatmap-zone-precision-worksets.mjs',
  ];

  const failures = [];
  const expect = (condition, message) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const result = spawnSync(process.execPath, [guardScript, 'pr-scope-guard'], {
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
    failures.push(`scope guard spawn failed: ${result.error.message}`);
  }

  const report = fs.existsSync(reportJsonPath)
    ? JSON.parse(fs.readFileSync(reportJsonPath, 'utf8'))
    : null;
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const actualPublicAliases = Object.keys(packageJson.scripts ?? {})
    .filter((scriptName) => scriptName.includes(':sajik'))
    .sort();

  expect(Boolean(report), `missing scope guard report: ${reportJsonPath}`);
  expect([0, 1].includes(result.status), `scope guard exit must be 0 or 1, got ${result.status}`);
  if (report) {
    expect(report.version === 'SAJIK_PR_SCOPE_GUARD_V3_CANONICAL_RUNTIME_ONLY', 'scope guard version mismatch');
    expect(['passed', 'blocked'].includes(report.status), 'scope guard status must be passed or blocked');
    expect((report.status === 'passed' ? 0 : 1) === result.status, 'scope guard exit must match report status');
    expect(report.historicalPolicy?.restoreFrom === 'Git history', 'historical workflows must be restored from Git history only');
    expect(JSON.stringify(report.publicSajikAliases) === JSON.stringify(expectedPublicAliases), 'expected public alias list mismatch');
    expect(JSON.stringify(actualPublicAliases) === JSON.stringify(expectedPublicAliases), 'package Sajik aliases must match canonical public list');
    expect((report.forbiddenPublicAliases ?? []).length === 0, 'forbidden historical Sajik aliases must not be public');
    expect((report.missingPublicAliases ?? []).length === 0, 'canonical public Sajik aliases must not be missing');
    expect((report.extraPublicAliases ?? []).length === 0, 'package must not expose extra Sajik aliases');
    for (const file of removedHistoricalScriptFiles) {
      expect(!fs.existsSync(path.join(frontendRoot, file)), `removed historical script must stay absent: ${file}`);
    }
    for (const entry of report.removedHistoricalFiles ?? []) {
      expect(entry.existsOnDisk === false, `removed historical script still exists on disk: ${entry.file}`);
    }
  }

  const smokeReport = {
    generatedAt: new Date().toISOString(),
    version: 'SAJIK_PR_SCOPE_GUARD_SMOKE_V3_CANONICAL_RUNTIME_ONLY',
    status: failures.length === 0 ? 'passed' : 'failed',
    guardExitCode: result.status,
    guardStatus: report?.status ?? 'missing',
    publicAliasCount: actualPublicAliases.length,
    removedHistoricalScriptFiles,
    failures,
  };
  const smokeMarkdown = [
    '# Sajik seatmap PR scope guard smoke',
    '',
    `- status: \`${smokeReport.status}\``,
    `- guard exit: \`${smokeReport.guardExitCode}\``,
    `- guard status: \`${smokeReport.guardStatus}\``,
    `- public aliases: \`${smokeReport.publicAliasCount}\``,
    `- historical replay: \`Git history\` only`,
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

  console.log(`status:passed guardStatus=${smokeReport.guardStatus} guardExit=${smokeReport.guardExitCode} publicAliases=${smokeReport.publicAliasCount}`);
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
