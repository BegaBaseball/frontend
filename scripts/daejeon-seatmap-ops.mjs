import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runAnchorReviewCrops = async () => {
  const { createHash } = await import("node:crypto");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");
  const { buildAnchorReviewCrops, cropCriteriaByGroup, cropGroupOrder, defaultPassCriteria, defaultRejectCriteria, p0ReviewCropIds, p1ReviewCropIds, p2ManualOnlyCropIds, regressionTestIdsByCropId, reviewContractVersion, reviewMetadataForCrop, riskTagsByCropId } = await import("./daejeon-seatmap-anchor-contract.mjs");
  const { DAEJEON_BLOCKS } = await import("../src/data/daejeonSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(frontendRoot, '..');
  const imagePath = path.join(
    frontendRoot,
    'src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.webp',
  );
  const outDir = path.join(repoRoot, 'output/playwright/daejeon-anchor-review');

  const blocksById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const crops = buildAnchorReviewCrops(outDir);
  const anchorCropReviewContract = 'DAEJEON_ANCHOR_CROP_REVIEW_V2';
  const requiredStaticCropIds = [
    'first-101-109',
    'third-121-124',
    'third-120-122-detail',
    'third-113-117-wide',
    'home-100',
    'first-109-112-sequence',
    'cass-200-detail',
    'third-113-120-sequence',
    'first-201-212-sequence',
    'first-4f-table-301-413-sequence',
    'third-4f-table-414-330-sequence',
    'outfield-upper-500-509-sequence',
    'first-104-106-detail',
    'first-107-110-detail',
    'third-119-121-detail',
    'third-115-117-detail',
    'third-116-121-detail',
    'third-113-114-detail',
    'third-213-225-sequence',
    'third-221-225-detail',
    'third-213-219-detail',
    'special-400-accessible-first',
    'special-425-426-third-accessible',
    'special-accessible-center',
    'special-accessible-outfield-third',
    'skybox-s01-s12-sequence',
    'skybox-s13-s25-sequence',
    'skybox-s26-s31-sequence',
  ];
  const manualCropOnlyReviewMode = 'MANUAL_CROP_ONLY';
  const requiredRegressionIds = [
    'P0_FIRST_101_109_SEQUENCE_DRIFT_REGRESSION',
    'P0_THIRD_121_124_SPLIT_COLOR_REGRESSION',
    'P0_THIRD_120_122_BOUNDARY_REGRESSION',
    'P0_THIRD_113_117_DRIFT_REGRESSION',
    'P1_HOME_100_STACK_REGRESSION',
    'P1_FIRST_109_112_SEQUENCE_REGRESSION',
    'P1_CASS_200_SPECIAL_CELL_REGRESSION',
    'P1_THIRD_113_120_SEQUENCE_REGRESSION',
    'P1_FIRST_201_212_SMALL_BLOCK_REGRESSION',
    'P1_FIRST_4F_301_413_SEQUENCE_REGRESSION',
    'P1_THIRD_4F_414_330_SEQUENCE_REGRESSION',
    'P1_OUTFIELD_500_509_SEQUENCE_REGRESSION',
    'P2_FIRST_104_106_DETAIL_REGRESSION',
    'P2_FIRST_107_110_DETAIL_REGRESSION',
    'P2_THIRD_119_121_DETAIL_REGRESSION',
    'P2_THIRD_115_117_DETAIL_REGRESSION',
    'P2_THIRD_116_121_DETAIL_REGRESSION',
    'P2_THIRD_113_114_DETAIL_REGRESSION',
    'P2_THIRD_213_225_SEQUENCE_REGRESSION',
    'P2_THIRD_221_225_DETAIL_REGRESSION',
    'P2_THIRD_213_219_DETAIL_REGRESSION',
    'P2_SKYBOX_S01_S12_SEQUENCE_REGRESSION',
    'P2_SKYBOX_S13_S25_SEQUENCE_REGRESSION',
    'P2_SKYBOX_S26_S31_SEQUENCE_REGRESSION',
    'P2_SPECIAL_400_ACCESSIBLE_FIRST_REGRESSION',
    'P2_SPECIAL_425_426_THIRD_ACCESSIBLE_REGRESSION',
    'P2_SPECIAL_ACCESSIBLE_CENTER_REGRESSION',
    'P2_SPECIAL_ACCESSIBLE_OUTFIELD_THIRD_REGRESSION',
  ];
  const requiredReviewFocusSnippets = ['104 단일 셀, 105-109', '121 split-color'];
  const palette = ['#ef4444', '#2563eb', '#16a34a', '#f97316', '#7c3aed', '#0891b2', '#db2777', '#ca8a04', '#0f766e'];

  const sha256Buffer = (buffer) => createHash('sha256').update(buffer).digest('hex');

  if (reviewContractVersion !== anchorCropReviewContract) {
    throw new Error(`Unexpected Daejeon anchor crop review contract: ${reviewContractVersion}`);
  }

  requiredStaticCropIds.forEach((cropId) => {
    if (!crops.some((crop) => crop.id === cropId)) {
      throw new Error(`Missing required Daejeon anchor crop: ${cropId}`);
    }
  });

  if (
    p0ReviewCropIds.size === 0
    || p1ReviewCropIds.size === 0
    || defaultPassCriteria.length === 0
    || defaultRejectCriteria.length === 0
    || cropCriteriaByGroup.size === 0
    || riskTagsByCropId.size === 0
    || regressionTestIdsByCropId.size === 0
  ) {
    throw new Error('Daejeon anchor crop review metadata contract is incomplete');
  }

  const knownRegressionIds = new Set([...regressionTestIdsByCropId.values()].flat());
  requiredRegressionIds.forEach((regressionId) => {
    if (!knownRegressionIds.has(regressionId)) {
      throw new Error(`Missing Daejeon anchor crop regression id: ${regressionId}`);
    }
  });

  requiredReviewFocusSnippets.forEach((snippet) => {
    const found = [...cropCriteriaByGroup.values()].some((criteria) => (
      [...criteria.pass, ...criteria.reject].some((item) => item.includes(snippet))
    ));
    if (!found) {
      throw new Error(`Missing Daejeon anchor crop criteria snippet: ${snippet}`);
    }
  });

  function escapeXml(value) {
    return String(value).replace(/[&<>"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
    })[char]);
  }

  function gridLines(crop) {
    const lines = [];

    for (let x = Math.ceil(crop.x / 10) * 10; x <= crop.x + crop.width; x += 10) {
      const major = x % 50 === 0;
      lines.push(`<line x1="${x}" y1="${crop.y}" x2="${x}" y2="${crop.y + crop.height}" stroke="${major ? '#0f172a' : '#94a3b8'}" stroke-width="${major ? 0.8 : 0.35}" opacity="${major ? 0.4 : 0.25}" />`);
    }

    for (let y = Math.ceil(crop.y / 10) * 10; y <= crop.y + crop.height; y += 10) {
      const major = y % 50 === 0;
      lines.push(`<line x1="${crop.x}" y1="${y}" x2="${crop.x + crop.width}" y2="${y}" stroke="${major ? '#0f172a' : '#94a3b8'}" stroke-width="${major ? 0.8 : 0.35}" opacity="${major ? 0.4 : 0.25}" />`);
    }

    return lines.join('\n');
  }

  function overlaySvg(crop, blocks) {
    const paths = blocks.map((block, index) => {
      const color = palette[index % palette.length];
      const geometry = block.imageGeometry;

      return [
        `<path d="${escapeXml(geometry.d)}" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="2.2" vector-effect="non-scaling-stroke" />`,
        `<circle cx="${geometry.labelX}" cy="${geometry.labelY}" r="3" fill="${color}" stroke="white" stroke-width="1" />`,
        `<text x="${geometry.labelX + 4}" y="${geometry.labelY - 4}" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="${color}" stroke="white" stroke-width="2" paint-order="stroke">${escapeXml(block.blockCode)}</text>`,
      ].join('\n');
    }).join('\n');

    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}">
    ${gridLines(crop)}
    ${paths}
    <rect x="${crop.x + 0.5}" y="${crop.y + 0.5}" width="${crop.width - 1}" height="${crop.height - 1}" fill="none" stroke="#111827" stroke-width="1" />
    </svg>`;
  }

  await fs.mkdir(outDir, { recursive: true });

  const outputs = [];

  for (const crop of crops) {
    const blocks = crop.blocks.map((id) => blocksById.get(id));
    const missingIds = crop.blocks.filter((id, index) => !blocks[index]);

    if (missingIds.length > 0) {
      throw new Error(`${crop.id} crop references missing Daejeon blocks: ${missingIds.join(', ')}`);
    }

    const cropBuffer = await sharp(imagePath)
      .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
      .composite([{ input: Buffer.from(overlaySvg(crop, blocks)), left: 0, top: 0 }])
      .png()
      .toBuffer();

    const outputPath = path.join(outDir, `${crop.id}.png`);
    const outputBuffer = await sharp(cropBuffer)
      .resize({ width: crop.width * 3, height: crop.height * 3, kernel: 'nearest' })
      .png()
      .toBuffer();
    await fs.writeFile(outputPath, outputBuffer);

    outputs.push({
      outputPath,
      sha256: sha256Buffer(outputBuffer),
    });
  }

  const indexRows = crops.map((crop, index) => ({
    id: crop.id,
    outputPath: outputs[index].outputPath,
    sha256: outputs[index].sha256,
    reviewContractVersion,
    ...reviewMetadataForCrop(crop, blocksById),
    blockCount: crop.blocks.length,
    crop: {
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
    },
    blocks: crop.blocks,
  }));
  const indexJsonPath = path.join(outDir, 'daejeon-anchor-review-crops.json');
  const indexMarkdownPath = path.join(outDir, 'daejeon-anchor-review-crops.md');
  await fs.writeFile(indexJsonPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), reviewContractVersion, crops: indexRows }, null, 2)}\n`, 'utf8');
  const groupedIndexRows = cropGroupOrder
    .flatMap((group) => {
      const rows = indexRows.filter((row) => row.group === group);
      if (rows.length === 0) return [];
      return [
        `## ${group}`,
        '',
        '| crop | purpose | review focus | pass criteria | reject criteria | representative blocks | bounds | output |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |',
        ...rows.map((row) => [
          `${row.reviewPriority} ${row.id}<br>mode: \`${row.reviewMode}\`<br>${row.riskTags.map((tag) => `\`${tag}\``).join(' ')}`,
          row.purpose,
          row.reviewFocus,
          [
            ...row.passCriteria.map((item) => `- ${item}`),
            ...(row.regressionTestIds.length ? [`- 자동 회귀 테스트: ${row.regressionTestIds.map((id) => `\`${id}\``).join(', ')}`] : []),
            ...(row.manualOnlyReason ? [`- 수동 검수 유지: ${row.manualOnlyReason}`] : []),
          ].join('<br>'),
          row.rejectCriteria.map((item) => `- ${item}`).join('<br>'),
          row.representativeBlocks.map((block) => `\`${block}\``).join('<br>'),
          `x=${row.crop.x}, y=${row.crop.y}, ${row.crop.width}x${row.crop.height}`,
          `\`${row.outputPath}\``,
        ].join(' | ')).map((row) => `| ${row} |`),
        '',
      ];
    });

  await fs.writeFile(indexMarkdownPath, [
    '# Daejeon Anchor Review Crops',
    '',
    'Official image 기준 overlay anchor crop 목록입니다. 각 path는 운영 geometry가 아니라 검수 산출물입니다.',
    `review contract: \`${reviewContractVersion}\``,
    '',
    '## Summary',
    '',
    `- total crops: ${indexRows.length}`,
    `- total covered block references: ${indexRows.reduce((sum, row) => sum + row.blockCount, 0)}`,
    '- required review order: home -> first -> third -> outfield -> skybox -> special',
    '- priority order: P0 -> P1 -> P2',
    '',
    ...groupedIndexRows,
  ].join('\n'), 'utf8');

  console.log(`daejeon_anchor_review:${outDir}`);
  console.log(`anchor_index_json:${indexJsonPath}`);
  console.log(`anchor_index_markdown:${indexMarkdownPath}`);
  outputs.forEach((output) => console.log(`crop:${output.outputPath}`));
};

const runAnchorVisualDiff = async () => {
  const { createHash } = await import("node:crypto");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { coordinateChangeImpactContract, reviewContractVersion } = await import("./daejeon-seatmap-anchor-contract.mjs");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(frontendRoot, '..');
  const outputRoot = path.join(repoRoot, 'output/playwright');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const anchorIndexPath = path.join(outputRoot, 'daejeon-anchor-review/daejeon-anchor-review-crops.json');
  const baselinePath = path.join(frontendRoot, 'src/data/daejeonAnchorVisualBaseline.json');
  const visualDiffJsonPath = path.join(reportDir, 'daejeon-seatmap-visual-diff.json');
  const visualDiffMarkdownPath = path.join(reportDir, 'daejeon-seatmap-visual-diff.md');
  const visualDiffContract = 'DAEJEON_ANCHOR_VISUAL_BASELINE_V1';

  const args = new Set(process.argv.slice(2));
  const writeBaseline = args.has('--write-baseline');

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const fileExists = async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  };

  const sha256File = async (filePath) => createHash('sha256')
    .update(await fs.readFile(filePath))
    .digest('hex');

  const stableCropMetadata = (crop) => ({
    id: crop.id,
    group: crop.group,
    reviewPriority: crop.reviewPriority,
    reviewMode: crop.reviewMode,
    manualOnlyReason: crop.manualOnlyReason ?? null,
    riskTags: [...(crop.riskTags ?? [])].sort(),
    regressionTestIds: [...(crop.regressionTestIds ?? [])].sort(),
    crop: crop.crop,
    blocks: [...(crop.blocks ?? [])],
  });

  const stableStringify = (value) => JSON.stringify(value);

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

  const normalizeCrop = async (crop) => {
    const outputPath = path.resolve(crop.outputPath);
    const sha256 = await sha256File(outputPath);

    return {
      ...stableCropMetadata(crop),
      sha256,
      outputPath,
      outputPathRelativeToRepo: path.relative(repoRoot, outputPath).replaceAll(path.sep, '/'),
      purpose: crop.purpose ?? 'anchor crop 검수',
      reviewFocus: crop.reviewFocus ?? '공식 이미지와 overlay path 정렬 확인',
    };
  };

  const buildCurrentSnapshot = async () => {
    if (!(await fileExists(anchorIndexPath))) {
      throw new Error(`Missing Daejeon anchor crop index. Run node scripts/stadium-seatmap-ops.mjs daejeon anchor-crops first: ${anchorIndexPath}`);
    }

    const index = await readJson(anchorIndexPath);
    const crops = [];
    for (const crop of index.crops ?? []) {
      crops.push(await normalizeCrop(crop));
    }

    return {
      contract: visualDiffContract,
      reviewContractVersion,
      coordinateChangeImpactContract,
      expectedCropCount: crops.length,
      anchorIndexPath: path.relative(frontendRoot, anchorIndexPath).replaceAll(path.sep, '/'),
      crops,
    };
  };

  const buildBaselineFile = (snapshot) => ({
    contract: visualDiffContract,
    generatedAt: new Date().toISOString(),
    reviewContractVersion: snapshot.reviewContractVersion,
    coordinateChangeImpactContract: snapshot.coordinateChangeImpactContract,
    expectedCropCount: snapshot.expectedCropCount,
    policy: {
      purpose: '대전 공식 이미지 overlay anchor crop visual baseline',
      coordinateSystem: 'official image 920x1060',
      note: '좌표/path 수정으로 crop hash가 바뀌면 release-lock에서 visual diff가 실패하며 baseline 갱신 전 운영자 검수가 필요하다.',
    },
    crops: snapshot.crops.map((crop) => ({
      id: crop.id,
      group: crop.group,
      reviewPriority: crop.reviewPriority,
      reviewMode: crop.reviewMode,
      manualOnlyReason: crop.manualOnlyReason,
      riskTags: crop.riskTags,
      regressionTestIds: crop.regressionTestIds,
      crop: crop.crop,
      blocks: crop.blocks,
      sha256: crop.sha256,
    })),
  });

  const compareSnapshot = (baseline, snapshot) => {
    const baselineById = new Map((baseline.crops ?? []).map((crop) => [crop.id, crop]));
    const currentById = new Map(snapshot.crops.map((crop) => [crop.id, crop]));
    const missingCropIds = [...baselineById.keys()].filter((id) => !currentById.has(id)).sort();
    const extraCropIds = [...currentById.keys()].filter((id) => !baselineById.has(id)).sort();
    const hashChanged = [];
    const metadataChanged = [];
    const p0ChangedWithoutRegression = [];
    const p2ManualOnlyChanged = [];

    for (const [id, current] of currentById.entries()) {
      const expected = baselineById.get(id);
      if (!expected) continue;

      const currentMetadata = stableCropMetadata(current);
      const expectedMetadata = stableCropMetadata(expected);
      const hashMatches = expected.sha256 === current.sha256;
      const metadataMatches = stableStringify(expectedMetadata) === stableStringify(currentMetadata);

      if (!hashMatches) {
        hashChanged.push({
          id,
          reviewPriority: current.reviewPriority,
          reviewMode: current.reviewMode,
          expectedSha256: expected.sha256,
          actualSha256: current.sha256,
          outputPath: current.outputPathRelativeToRepo,
          regressionTestIds: current.regressionTestIds,
          manualOnlyReason: current.manualOnlyReason,
        });
      }
      if (!metadataMatches) {
        metadataChanged.push({
          id,
          expected: expectedMetadata,
          actual: currentMetadata,
        });
      }
      if (!hashMatches && current.reviewPriority === 'P0' && current.regressionTestIds.length === 0) {
        p0ChangedWithoutRegression.push(id);
      }
      if (!hashMatches && current.reviewMode === 'MANUAL_CROP_ONLY') {
        p2ManualOnlyChanged.push(id);
      }
    }

    const failures = [
      ...missingCropIds.map((id) => `missing baseline crop in current output: ${id}`),
      ...extraCropIds.map((id) => `extra crop not present in baseline: ${id}`),
      ...metadataChanged.map((item) => `crop metadata changed: ${item.id}`),
      ...hashChanged.map((item) => `crop image hash changed: ${item.id}`),
      ...p0ChangedWithoutRegression.map((id) => `P0 crop changed without regression test id: ${id}`),
    ];

    return {
      contract: visualDiffContract,
      status: failures.length === 0 ? 'passed' : 'failed',
      summary: {
        baselineCropCount: baseline.crops?.length ?? 0,
        currentCropCount: snapshot.crops.length,
        missingCropCount: missingCropIds.length,
        extraCropCount: extraCropIds.length,
        changedCropCount: hashChanged.length,
        metadataMismatchCount: metadataChanged.length,
        p0ChangedWithoutRegressionCount: p0ChangedWithoutRegression.length,
        p2ManualOnlyChangedCount: p2ManualOnlyChanged.length,
      },
      baseline: {
        path: path.relative(frontendRoot, baselinePath).replaceAll(path.sep, '/'),
        generatedAt: baseline.generatedAt ?? null,
        reviewContractVersion: baseline.reviewContractVersion ?? null,
        coordinateChangeImpactContract: baseline.coordinateChangeImpactContract ?? null,
      },
      current: {
        generatedAt: new Date().toISOString(),
        anchorIndexPath: path.relative(frontendRoot, anchorIndexPath).replaceAll(path.sep, '/'),
        reviewContractVersion: snapshot.reviewContractVersion,
        coordinateChangeImpactContract: snapshot.coordinateChangeImpactContract,
      },
      missingCropIds,
      extraCropIds,
      hashChanged,
      metadataChanged,
      p0ChangedWithoutRegression,
      p2ManualOnlyChanged,
      failures,
    };
  };

  const writeReport = async (result) => {
    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(visualDiffJsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

    const changedRows = result.hashChanged.map((item) => [
      item.reviewPriority,
      item.reviewMode,
      item.id,
      item.regressionTestIds.length ? item.regressionTestIds.map((id) => `\`${id}\``).join('<br>') : 'n/a',
      item.manualOnlyReason ?? '',
      `\`${item.outputPath}\``,
    ]);
    const metadataRows = result.metadataChanged.map((item) => [
      item.id,
      '`metadata mismatch`',
    ]);

    await fs.writeFile(visualDiffMarkdownPath, [
      '# 대전 좌석도 anchor visual diff',
      '',
      `- generated: ${result.current.generatedAt}`,
      `- status: ${result.status}`,
      `- contract: \`${result.contract}\``,
      `- baseline: \`${result.baseline.path}\` (${result.baseline.generatedAt ?? 'unknown'})`,
      `- anchor index: \`${result.current.anchorIndexPath}\``,
      '',
      '## Summary',
      '',
      markdownTable(
        ['metric', 'value'],
        Object.entries(result.summary).map(([key, value]) => [key, String(value)]),
      ),
      '',
      '## Changed Crops',
      '',
      changedRows.length
        ? markdownTable(['priority', 'mode', 'crop', 'regression tests', 'manual reason', 'output'], changedRows)
        : 'No crop image hash changes.',
      '',
      '## Metadata Changes',
      '',
      metadataRows.length
        ? markdownTable(['crop', 'change'], metadataRows)
        : 'No crop metadata changes.',
      '',
      '## Failures',
      '',
      result.failures.length
        ? result.failures.map((failure) => `- ${failure}`).join('\n')
        : '- none',
      '',
      '## Policy',
      '',
      '- baseline crop hash가 바뀌면 좌표/path/공식 이미지 변경 영향으로 보고 release-lock을 실패시킨다.',
      '- P0 crop은 regressionTestIds가 반드시 있어야 한다.',
      '- P2 MANUAL_CROP_ONLY 변경은 수동 검수 대상으로 report에 남긴다.',
      '- baseline 갱신은 운영자 검수 후 `node scripts/stadium-seatmap-ops.mjs daejeon visual-baseline`로만 수행한다.',
      '',
    ].join('\n'), 'utf8');
  };

  try {
    const snapshot = await buildCurrentSnapshot();

    if (writeBaseline) {
      const baseline = buildBaselineFile(snapshot);
      await fs.writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
      await writeReport({
        contract: visualDiffContract,
        status: 'baseline-written',
        summary: {
          baselineCropCount: baseline.crops.length,
          currentCropCount: snapshot.crops.length,
          missingCropCount: 0,
          extraCropCount: 0,
          changedCropCount: 0,
          metadataMismatchCount: 0,
          p0ChangedWithoutRegressionCount: 0,
          p2ManualOnlyChangedCount: 0,
        },
        baseline: {
          path: path.relative(frontendRoot, baselinePath).replaceAll(path.sep, '/'),
          generatedAt: baseline.generatedAt,
          reviewContractVersion: baseline.reviewContractVersion,
          coordinateChangeImpactContract: baseline.coordinateChangeImpactContract,
        },
        current: {
          generatedAt: baseline.generatedAt,
          anchorIndexPath: path.relative(frontendRoot, anchorIndexPath).replaceAll(path.sep, '/'),
          reviewContractVersion: snapshot.reviewContractVersion,
          coordinateChangeImpactContract: snapshot.coordinateChangeImpactContract,
        },
        missingCropIds: [],
        extraCropIds: [],
        hashChanged: [],
        metadataChanged: [],
        p0ChangedWithoutRegression: [],
        p2ManualOnlyChanged: [],
        failures: [],
      });
      console.log(`visual_baseline:${baselinePath}`);
      console.log(`visual_diff_json:${visualDiffJsonPath}`);
      console.log(`visual_diff_markdown:${visualDiffMarkdownPath}`);
      console.log(`status:baseline-written crops=${baseline.crops.length}`);
      process.exit(0);
    }

    if (!(await fileExists(baselinePath))) {
      throw new Error(`Missing Daejeon anchor visual baseline: ${baselinePath}`);
    }

    const baseline = await readJson(baselinePath);
    const result = compareSnapshot(baseline, snapshot);
    await writeReport(result);

    console.log(`visual_diff_json:${visualDiffJsonPath}`);
    console.log(`visual_diff_markdown:${visualDiffMarkdownPath}`);
    console.log(`status:${result.status} changed=${result.summary.changedCropCount} metadata=${result.summary.metadataMismatchCount}`);

    if (result.status !== 'passed') {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('status:failed');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
};

const runBlockEvidenceCrops = async () => {
  const { createHash } = await import("node:crypto");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");
  const { buildAnchorImpactByBlockId, buildAnchorReviewCrops, coordinateImpactForBlock, reviewContractVersion } = await import("./daejeon-seatmap-anchor-contract.mjs");
  const { DAEJEON_BLOCKS, DAEJEON_SEATMAP_IMAGE, isDaejeonSelectableSeatBlock } = await import("../src/data/daejeonSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(frontendRoot, '..');
  const outputRoot = path.join(repoRoot, 'output/playwright');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultOutDir = path.join(outputRoot, 'daejeon-block-review');
  const imagePath = path.resolve(frontendRoot, DAEJEON_SEATMAP_IMAGE.imagePath);
  const blockEvidenceContract = 'DAEJEON_BLOCK_EVIDENCE_CROP_V1';
  const defaultBlockCodes = [
    '100A',
    '100B',
    '100C',
    '104',
    '105',
    '106',
    '107',
    '108',
    '109',
    '121',
    '122',
    '123',
    '124',
  ];

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const hasArg = (name) => process.argv.includes(name);

  const csvArg = (name) => String(argValue(name, ''))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const numberOr = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const escapeXml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const pathToPoints = (pathData) => {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];

    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }

    return points;
  };

  const boundsForPath = (pathData) => {
    const points = pathToPoints(pathData);
    if (points.length === 0) return null;

    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);

    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  };

  const unionBounds = (boundsList) => {
    const validBounds = boundsList.filter(Boolean);
    if (validBounds.length === 0) return null;

    return {
      minX: Math.min(...validBounds.map((bounds) => bounds.minX)),
      minY: Math.min(...validBounds.map((bounds) => bounds.minY)),
      maxX: Math.max(...validBounds.map((bounds) => bounds.maxX)),
      maxY: Math.max(...validBounds.map((bounds) => bounds.maxY)),
    };
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const cropForBlock = (block, padding) => {
    const pathBounds = boundsForPath(block.imageGeometry.d);
    const hitBounds = boundsForPath(block.hitAreaD ?? block.imageGeometry.d);
    const labelBounds = {
      minX: block.imageGeometry.labelX,
      minY: block.imageGeometry.labelY,
      maxX: block.imageGeometry.labelX,
      maxY: block.imageGeometry.labelY,
    };
    const bounds = unionBounds([pathBounds, hitBounds, labelBounds]);

    if (!bounds) {
      throw new Error(`Cannot build Daejeon block crop without path bounds: ${block.id}`);
    }

    const minX = Math.floor(bounds.minX - padding);
    const minY = Math.floor(bounds.minY - padding);
    const maxX = Math.ceil(bounds.maxX + padding);
    const maxY = Math.ceil(bounds.maxY + padding);
    const x = clamp(minX, 0, DAEJEON_SEATMAP_IMAGE.imageWidth - 1);
    const y = clamp(minY, 0, DAEJEON_SEATMAP_IMAGE.imageHeight - 1);
    const right = clamp(maxX, x + 1, DAEJEON_SEATMAP_IMAGE.imageWidth);
    const bottom = clamp(maxY, y + 1, DAEJEON_SEATMAP_IMAGE.imageHeight);

    return {
      x,
      y,
      width: right - x,
      height: bottom - y,
      pathBounds,
      hitBounds,
    };
  };

  const clearGeneratedCropImages = async (directory) => {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return;
      }
      throw error;
    }

    await Promise.all(entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.png'))
      .map((entry) => fs.unlink(path.join(directory, entry.name))));
  };

  const samePath = (left, right) => String(left ?? '').trim() === String(right ?? '').trim();

  const gridLines = (crop, step) => {
    const lines = [];
    const startX = Math.ceil(crop.x / step) * step;
    const startY = Math.ceil(crop.y / step) * step;

    for (let x = startX; x <= crop.x + crop.width; x += step) {
      const major = x % 50 === 0;
      lines.push(`<line x1="${x}" y1="${crop.y}" x2="${x}" y2="${crop.y + crop.height}" class="${major ? 'grid-major' : 'grid'}" />`);
    }
    for (let y = startY; y <= crop.y + crop.height; y += step) {
      const major = y % 50 === 0;
      lines.push(`<line x1="${crop.x}" y1="${y}" x2="${crop.x + crop.width}" y2="${y}" class="${major ? 'grid-major' : 'grid'}" />`);
    }

    return lines.join('\n');
  };

  const bboxRect = (bounds, className) => {
    if (!bounds) return '';
    return `<rect class="${className}" x="${bounds.minX}" y="${bounds.minY}" width="${bounds.maxX - bounds.minX}" height="${bounds.maxY - bounds.minY}" />`;
  };

  const buildOverlaySvg = (block, crop, width, height) => {
    const visiblePath = block.imageGeometry.d;
    const hitPath = block.hitAreaD ?? block.imageGeometry.d;
    const hasExpandedHitArea = !samePath(visiblePath, hitPath);
    const label = block.imageGeometry;
    const title = `${block.blockCode} ${block.id}`;

    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}">
    <style>
      .grid { stroke: #0f172a; stroke-opacity: 0.16; stroke-width: 0.5; vector-effect: non-scaling-stroke; }
      .grid-major { stroke: #0f172a; stroke-opacity: 0.32; stroke-width: 0.9; vector-effect: non-scaling-stroke; }
      .visible { fill: rgba(37, 99, 235, 0.16); stroke: #1d4ed8; stroke-width: 2.4; vector-effect: non-scaling-stroke; }
      .hit { fill: rgba(239, 68, 68, 0.08); stroke: #dc2626; stroke-width: 1.8; stroke-dasharray: 5 3; vector-effect: non-scaling-stroke; }
      .path-bbox { fill: none; stroke: #1d4ed8; stroke-width: 0.9; stroke-dasharray: 2 2; vector-effect: non-scaling-stroke; }
      .hit-bbox { fill: none; stroke: #dc2626; stroke-width: 0.9; stroke-dasharray: 3 2; vector-effect: non-scaling-stroke; }
      .label-dot { fill: #111827; stroke: #ffffff; stroke-width: 2; vector-effect: non-scaling-stroke; }
      .label-cross { stroke: #111827; stroke-width: 1.4; vector-effect: non-scaling-stroke; }
      .block-label { font: 900 12px Arial, sans-serif; fill: #111827; stroke: #ffffff; stroke-width: 3; paint-order: stroke; text-anchor: middle; dominant-baseline: central; }
    </style>
    ${gridLines(crop, 10)}
    ${hasExpandedHitArea ? `<path class="hit" d="${escapeXml(hitPath)}"><title>${escapeXml(`${title} hitAreaD`)}</title></path>` : ''}
    <path class="visible" d="${escapeXml(visiblePath)}"><title>${escapeXml(`${title} imageGeometry.d`)}</title></path>
    ${bboxRect(crop.pathBounds, 'path-bbox')}
    ${hasExpandedHitArea ? bboxRect(crop.hitBounds, 'hit-bbox') : ''}
    <line class="label-cross" x1="${label.labelX - 7}" y1="${label.labelY}" x2="${label.labelX + 7}" y2="${label.labelY}" />
    <line class="label-cross" x1="${label.labelX}" y1="${label.labelY - 7}" x2="${label.labelX}" y2="${label.labelY + 7}" />
    <circle class="label-dot" cx="${label.labelX}" cy="${label.labelY}" r="3.6" />
    <text class="block-label" x="${label.labelX}" y="${label.labelY - 14}">${escapeXml(block.blockCode)}</text>
    <rect x="${crop.x + 0.5}" y="${crop.y + 0.5}" width="${crop.width - 1}" height="${crop.height - 1}" fill="none" stroke="#111827" stroke-width="1" vector-effect="non-scaling-stroke" />
  </svg>`;
  };

  const buildHeaderSvg = (block, impact, width, height) => {
    const anchorText = impact.anchorCropIds.length ? impact.anchorCropIds.join(', ') : 'none';
    const regressionText = impact.regressionTestIds.length ? impact.regressionTestIds.join(', ') : 'none';

    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" />
    <text x="10" y="18" font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="#0f172a">${escapeXml(`${block.blockCode} ${block.name}`)}</text>
    <text x="10" y="36" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#334155">${escapeXml(block.id)}</text>
    <text x="10" y="53" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#1d4ed8">${escapeXml(`trace=${block.traceStatus} / ${block.traceMethod} / ${block.sourceConfidence}`)}</text>
    <text x="10" y="69" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#475569">${escapeXml(`priority=${impact.reviewPriority} mode=${impact.reviewMode}`)}</text>
    <text x="10" y="85" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#475569">${escapeXml(`anchors=${anchorText}`)}</text>
    <text x="10" y="101" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#475569">${escapeXml(`tests=${regressionText}`)}</text>
  </svg>`;
  };

  const selectBlocks = () => {
    if (hasArg('--all')) {
      return [...DAEJEON_BLOCKS].sort((a, b) => a.id.localeCompare(b.id));
    }

    const requestedIds = new Set(csvArg('--blocks'));
    const requestedCodes = new Set((csvArg('--codes').length ? csvArg('--codes') : defaultBlockCodes)
      .map((code) => code.toUpperCase()));

    const blocks = DAEJEON_BLOCKS.filter((block) => (
      requestedIds.has(block.id)
      || requestedCodes.has(String(block.blockCode).toUpperCase())
    )).sort((a, b) => (
      String(a.blockCode).localeCompare(String(b.blockCode), 'en', { numeric: true })
      || a.id.localeCompare(b.id)
    ));

    const missingIds = [...requestedIds].filter((id) => !DAEJEON_BLOCKS.some((block) => block.id === id));
    if (missingIds.length > 0) {
      throw new Error(`Unknown Daejeon block id(s): ${missingIds.join(', ')}`);
    }

    if (blocks.length === 0) {
      throw new Error('No Daejeon blocks matched. Use --blocks id1,id2 or --codes 104,105.');
    }

    return blocks;
  };

  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const scale = numberOr(argValue('--scale', '4'), 4);
  const padding = numberOr(argValue('--padding', '42'), 42);
  const anchorImpactByBlockId = buildAnchorImpactByBlockId(buildAnchorReviewCrops(path.join(outputRoot, 'daejeon-anchor-review')));

  const imageMetadata = await sharp(imagePath).metadata();
  if (imageMetadata.width !== DAEJEON_SEATMAP_IMAGE.imageWidth || imageMetadata.height !== DAEJEON_SEATMAP_IMAGE.imageHeight) {
    throw new Error(`Daejeon image size mismatch: actual=${imageMetadata.width}x${imageMetadata.height} data=${DAEJEON_SEATMAP_IMAGE.imageWidth}x${DAEJEON_SEATMAP_IMAGE.imageHeight}`);
  }

  const blocks = selectBlocks();
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(reportDir, { recursive: true });
  await clearGeneratedCropImages(outDir);

  const outputs = [];
  for (const block of blocks) {
    const crop = cropForBlock(block, padding);
    const outputWidth = crop.width * scale;
    const outputHeight = crop.height * scale;
    const headerHeight = 112;
    const impact = coordinateImpactForBlock(anchorImpactByBlockId, block.id);
    const overlaySvg = Buffer.from(buildOverlaySvg(block, crop, outputWidth, outputHeight));
    const headerSvg = Buffer.from(buildHeaderSvg(block, impact, outputWidth, headerHeight));
    const outputPath = path.join(outDir, `${block.id}.png`);

    const cropBuffer = await sharp(imagePath)
      .extract({
        left: crop.x,
        top: crop.y,
        width: crop.width,
        height: crop.height,
      })
      .resize(outputWidth, outputHeight, { kernel: 'nearest' })
      .composite([{ input: overlaySvg, left: 0, top: 0 }])
      .png()
      .toBuffer();

    const finalBuffer = await sharp(cropBuffer)
      .extend({ top: headerHeight, background: '#f8fafc' })
      .composite([{ input: headerSvg, left: 0, top: 0 }])
      .png()
      .toBuffer();

    await fs.writeFile(outputPath, finalBuffer);

    outputs.push({
      id: block.id,
      blockCode: block.blockCode,
      parentId: block.parentId,
      officialBlockLabel: block.officialBlockLabel,
      officialSectionName: block.officialSectionName,
      name: block.name,
      traceStatus: block.traceStatus,
      traceMethod: block.traceMethod,
      sourceConfidence: block.sourceConfidence,
      selectable: isDaejeonSelectableSeatBlock(block),
      label: {
        x: block.imageGeometry.labelX,
        y: block.imageGeometry.labelY,
        shortLabel: block.imageGeometry.shortLabel,
      },
      crop: {
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height,
        pathBounds: crop.pathBounds,
        hitBounds: crop.hitBounds,
      },
      hasExpandedHitArea: !samePath(block.imageGeometry.d, block.hitAreaD ?? block.imageGeometry.d),
      anchorCropIds: impact.anchorCropIds,
      regressionTestIds: impact.regressionTestIds,
      reviewPriority: impact.reviewPriority,
      reviewMode: impact.reviewMode,
      riskTags: impact.riskTags,
      outputPath,
      outputPathRelativeToRepo: path.relative(repoRoot, outputPath).replaceAll(path.sep, '/'),
      sha256: createHash('sha256').update(finalBuffer).digest('hex'),
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    contract: blockEvidenceContract,
    reviewContractVersion,
    asset: DAEJEON_SEATMAP_IMAGE,
    scale,
    padding,
    requested: {
      all: hasArg('--all'),
      blocks: csvArg('--blocks'),
      codes: csvArg('--codes').length ? csvArg('--codes') : defaultBlockCodes,
    },
    policy: {
      blue: 'blue=imageGeometry.d visible highlight/stroke source',
      red: 'red=hitAreaD click-only area when it differs from imageGeometry.d',
      note: '이 crop은 좌표 검수 산출물이며 운영 geometry를 새로 만들지 않는다.',
    },
    outputs,
  };

  const reportPath = path.join(reportDir, 'daejeon-seatmap-block-evidence-crops.json');
  const markdownPath = path.join(reportDir, 'daejeon-seatmap-block-evidence-crops.md');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, [
    '# 대전 좌석도 block evidence crops',
    '',
    `- generated: ${report.generatedAt}`,
    `- contract: \`${blockEvidenceContract}\``,
    `- review contract: \`${reviewContractVersion}\``,
    `- output dir: \`${path.relative(frontendRoot, outDir).replaceAll(path.sep, '/')}\``,
    `- outputs: ${outputs.length}`,
    '- blue overlay: `imageGeometry.d` visible highlight',
    '- red dashed overlay: `hitAreaD` click-only area when expanded',
    '',
    '| block | section | priority | mode | expanded hit | anchors | tests | crop |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...outputs.map((output) => [
      `\`${output.blockCode}\`<br>\`${output.id}\``,
      output.officialSectionName,
      output.reviewPriority,
      output.reviewMode,
      String(output.hasExpandedHitArea),
      output.anchorCropIds.map((id) => `\`${id}\``).join('<br>') || 'none',
      output.regressionTestIds.map((id) => `\`${id}\``).join('<br>') || 'none',
      `\`${output.outputPathRelativeToRepo}\``,
    ].join(' | ')).map((row) => `| ${row} |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`block_evidence_report:${reportPath}`);
  console.log(`block_evidence_markdown:${markdownPath}`);
  console.log(`block_evidence_dir:${outDir}`);
  console.log(`status:ok outputs=${outputs.length}`);
};

const runChangeGuard = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(frontendRoot, '..');
  const outputRoot = path.join(repoRoot, 'output/playwright');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const releaseGatePath = path.join(reportDir, 'daejeon-seatmap-release-gate.json');
  const staleToleranceMs = 1000;

  const EXPECTED_BLOCKS = 139;
  const EXPECTED_TRACED = 139;
  const EXPECTED_REVIEW = 0;
  const EXPECTED_P2_ALIASES = 11;
  const EXPECTED_ANCHOR_CROPS = 28;

  const WATCH_FILES = [
    'package.json',
    'docs/daejeon-seatmap-release-lock.md',
    'src/data/daejeonAnchorVisualBaseline.json',
    'src/data/daejeonGeometryBaseline.json',
    'src/data/daejeonSeatData.ts',
    'src/data/daejeonSeatData.test.ts',
    'src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.webp',
  ];

  const WATCH_DIRECTORIES = [
    'src/components/daejeon',
    'src/components/stadium/daejeon',
    'src/components/stadium',
    'scripts',
  ];

  const isWatchedDirectoryFile = (relativePath) => {
    if (relativePath.startsWith('scripts/')) {
      return path.basename(relativePath).startsWith('daejeon-');
    }
    if (relativePath.startsWith('src/components/stadium/')) {
      return relativePath.includes('/daejeon/') || relativePath.endsWith('stadiumSeatMapRegistry.tsx');
    }
    return true;
  };

  const assertGuard = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const fileExists = async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const walkDirectory = async (directory) => {
    if (!(await fileExists(directory))) return [];

    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        files.push(...await walkDirectory(entryPath));
        continue;
      }
      if (entry.isFile()) {
        files.push(entryPath);
      }
    }

    return files;
  };

  const collectWatchedFiles = async () => {
    const files = new Set();

    for (const relativePath of WATCH_FILES) {
      const absolutePath = path.join(frontendRoot, relativePath);
      if (await fileExists(absolutePath)) {
        files.add(absolutePath);
      }
    }

    for (const relativePath of WATCH_DIRECTORIES) {
      const directoryPath = path.join(frontendRoot, relativePath);
      const directoryFiles = await walkDirectory(directoryPath);
      for (const filePath of directoryFiles) {
        const normalizedRelativePath = path.relative(frontendRoot, filePath).replaceAll(path.sep, '/');
        if (isWatchedDirectoryFile(normalizedRelativePath)) {
          files.add(filePath);
        }
      }
    }

    return [...files].sort();
  };

  const validateReleaseGateReport = async () => {
    assertGuard(await fileExists(releaseGatePath), `missing Daejeon release gate report: ${releaseGatePath}`);

    const report = await readJson(releaseGatePath);
    const generatedAtMs = Date.parse(report.generatedAt);
    assertGuard(Number.isFinite(generatedAtMs), 'release gate report generatedAt must be a valid date');
    assertGuard(report.status === 'passed', 'release gate report status must be passed');
    assertGuard(report.expected?.totalBlocks === EXPECTED_BLOCKS, `release gate expected.totalBlocks must be ${EXPECTED_BLOCKS}`);
    assertGuard(report.expected?.officialImageTraced === EXPECTED_TRACED, `release gate expected.officialImageTraced must be ${EXPECTED_TRACED}`);
    assertGuard(report.expected?.needsOperatorReview === EXPECTED_REVIEW, `release gate expected.needsOperatorReview must be ${EXPECTED_REVIEW}`);
    assertGuard(report.expected?.p2DeduplicatedAliases === EXPECTED_P2_ALIASES, `release gate expected.p2DeduplicatedAliases must be ${EXPECTED_P2_ALIASES}`);
    assertGuard(report.expected?.anchorCrops === EXPECTED_ANCHOR_CROPS, `release gate expected.anchorCrops must be ${EXPECTED_ANCHOR_CROPS}`);
    assertGuard(report.coordinateChangeImpactSummary?.contract === 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1', 'release gate coordinateChangeImpactSummary contract is missing');
    assertGuard(report.coordinateChangeImpactSummary?.counts?.missingImpact === 0, 'release gate coordinateChangeImpactSummary missingImpact must be 0');

    const expectedCommands = [
      'node --import tsx --test --test-concurrency=1 --test-name-pattern=대전 src/data/daejeonSeatData.test.ts src/components/StadiumGuideRuntimeSeatMaps.test.ts',
      'node scripts/stadium-seatmap-ops.mjs daejeon evidence',
      'node scripts/stadium-seatmap-ops.mjs daejeon visual-diff',
      'node scripts/stadium-seatmap-ops.mjs daejeon geometry-diff',
      'node scripts/stadium-seatmap-ops.mjs daejeon coverage-report',
      'node scripts/stadium-seatmap-ops.mjs daejeon trace-review',
      'npm run build',
    ];
    const commands = report.commands ?? [];
    for (const command of expectedCommands) {
      const entry = commands.find((item) => item.command === command);
      assertGuard(entry?.status === 'passed', `release gate command must pass: ${command}`);
    }

    const requiredArtifacts = [
      'traceManifest',
      'traceSummary',
      'p2Evidence',
      'p2EvidenceSummary',
      'anchorCrops',
      'anchorCropsSummary',
      'visualDiff',
      'visualDiffSummary',
      'geometryDiff',
      'geometryDiffSummary',
      'coverageReport',
      'coverageSummary',
      'browserQa',
      'browserQaSummary',
      'mobileScreenshot',
      'desktopScreenshot',
    ];
    for (const artifactKey of requiredArtifacts) {
      assertGuard(typeof report.artifacts?.[artifactKey] === 'string', `release gate artifact is missing: ${artifactKey}`);
    }

    return { report, generatedAtMs };
  };

  const resolveArtifactPath = (artifactPath) => path.resolve(frontendRoot, artifactPath);

  const validateArtifactContents = async (report) => {
    const traceManifest = await readJson(resolveArtifactPath(report.artifacts.traceManifest));
    assertGuard(traceManifest.summary?.totalBlocks === EXPECTED_BLOCKS, `trace manifest totalBlocks must be ${EXPECTED_BLOCKS}`);
    assertGuard(traceManifest.summary?.officialImageTraced === EXPECTED_TRACED, `trace manifest officialImageTraced must be ${EXPECTED_TRACED}`);
    assertGuard(traceManifest.summary?.needsOperatorReview === EXPECTED_REVIEW, `trace manifest needsOperatorReview must be ${EXPECTED_REVIEW}`);
    assertGuard((traceManifest.traceReviewQueue ?? []).length === 0, 'trace manifest queue must stay empty');
    assertGuard(traceManifest.precisionAudit?.labelTopHitFailureCount === 0, 'trace manifest labelTopHitFailureCount must be 0');
    assertGuard((traceManifest.deduplicatedAliases ?? []).length === EXPECTED_P2_ALIASES, `trace manifest deduplicatedAliases must be ${EXPECTED_P2_ALIASES}`);
    assertGuard(traceManifest.coordinateChangeImpact?.contract === 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1', 'trace manifest coordinateChangeImpact contract is missing');
    assertGuard(traceManifest.coordinateChangeImpact?.counts?.missingImpact === 0, 'trace manifest coordinateChangeImpact missingImpact must be 0');

    const p2Evidence = await readJson(resolveArtifactPath(report.artifacts.p2Evidence));
    assertGuard((p2Evidence.outputs ?? []).length === EXPECTED_P2_ALIASES, `P2 evidence outputs must be ${EXPECTED_P2_ALIASES}`);
    const retiredBlockExists = (p2Evidence.outputs ?? []).filter((output) => output.retiredBlockExists);
    assertGuard(retiredBlockExists.length === 0, `P2 retired aliases must not exist as operational geometry: ${retiredBlockExists.map((output) => output.retiredBlockId).join(', ')}`);

    const anchorCrops = await readJson(resolveArtifactPath(report.artifacts.anchorCrops));
    assertGuard((anchorCrops.crops ?? []).length === EXPECTED_ANCHOR_CROPS, `anchor crop count must be ${EXPECTED_ANCHOR_CROPS}`);

    const visualDiff = await readJson(resolveArtifactPath(report.artifacts.visualDiff));
    assertGuard(visualDiff.contract === 'DAEJEON_ANCHOR_VISUAL_BASELINE_V1', 'visual diff contract is missing');
    assertGuard(visualDiff.status === 'passed', 'visual diff status must be passed');
    assertGuard(visualDiff.summary?.baselineCropCount === EXPECTED_ANCHOR_CROPS, `visual diff baselineCropCount must be ${EXPECTED_ANCHOR_CROPS}`);
    assertGuard(visualDiff.summary?.currentCropCount === EXPECTED_ANCHOR_CROPS, `visual diff currentCropCount must be ${EXPECTED_ANCHOR_CROPS}`);
    assertGuard(visualDiff.summary?.changedCropCount === 0, 'visual diff changedCropCount must be 0');
    assertGuard(visualDiff.summary?.metadataMismatchCount === 0, 'visual diff metadataMismatchCount must be 0');

    const geometryDiff = await readJson(resolveArtifactPath(report.artifacts.geometryDiff));
    assertGuard(geometryDiff.contract === 'DAEJEON_GEOMETRY_BASELINE_V1', 'geometry diff contract is missing');
    assertGuard(geometryDiff.status === 'passed', 'geometry diff status must be passed');
    assertGuard(geometryDiff.summary?.baselineBlockCount === EXPECTED_BLOCKS, `geometry diff baselineBlockCount must be ${EXPECTED_BLOCKS}`);
    assertGuard(geometryDiff.summary?.currentBlockCount === EXPECTED_BLOCKS, `geometry diff currentBlockCount must be ${EXPECTED_BLOCKS}`);
    assertGuard(geometryDiff.summary?.changedBlockCount === 0, 'geometry diff changedBlockCount must be 0');
    assertGuard(geometryDiff.summary?.missingBlockCount === 0, 'geometry diff missingBlockCount must be 0');
    assertGuard(geometryDiff.summary?.extraBlockCount === 0, 'geometry diff extraBlockCount must be 0');

    const coverageReport = await readJson(resolveArtifactPath(report.artifacts.coverageReport));
    assertGuard(coverageReport.summary?.totalBlocks === EXPECTED_BLOCKS, `coverage report totalBlocks must be ${EXPECTED_BLOCKS}`);
    assertGuard(coverageReport.summary?.lockedCount === EXPECTED_BLOCKS, `coverage report lockedCount must be ${EXPECTED_BLOCKS}`);
    assertGuard(coverageReport.summary?.labelOnlyCount === 0, 'coverage report labelOnlyCount must be 0');
    assertGuard(coverageReport.summary?.partialCount === 0, 'coverage report partialCount must be 0');
    assertGuard(coverageReport.summary?.missingLabelTopHitCount === 0, 'coverage report missingLabelTopHitCount must be 0');
    assertGuard(coverageReport.summary?.missingAnchorWithoutExceptionCount === 0, 'coverage report missingAnchorWithoutExceptionCount must be 0');
    assertGuard(coverageReport.summary?.missingOwnerPointRequiredCount === 0, 'coverage report missingOwnerPointRequiredCount must be 0');
    assertGuard(coverageReport.coordinateChangeImpact?.contract === 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1', 'coverage report coordinateChangeImpact contract is missing');
    assertGuard(coverageReport.coordinateChangeImpact?.counts?.missingImpact === 0, 'coverage report coordinateChangeImpact missingImpact must be 0');

    const browserQa = await readJson(resolveArtifactPath(report.artifacts.browserQa));
    assertGuard(browserQa.status === 'passed', 'browser QA status must be passed');
    assertGuard(browserQa.entryCount === 2, 'browser QA must include mobile and desktop scenarios');
    assertGuard(browserQa.overflowFailureCount === 0, 'browser QA overflowFailureCount must be 0');
    assertGuard(browserQa.actionableFailedRequestCount === 0, 'browser QA actionableFailedRequestCount must be 0');
    assertGuard(browserQa.actionableConsoleErrorCount === 0, 'browser QA actionableConsoleErrorCount must be 0');
  };

  const validateFreshness = async (generatedAtMs, watchedFiles) => {
    const staleFiles = [];

    for (const filePath of watchedFiles) {
      const stat = await fs.stat(filePath);
      if (stat.mtimeMs > generatedAtMs + staleToleranceMs) {
        staleFiles.push({
          path: path.relative(frontendRoot, filePath).replaceAll(path.sep, '/'),
          mtime: new Date(stat.mtimeMs).toISOString(),
        });
      }
    }

    assertGuard(
      staleFiles.length === 0,
      [
        'Daejeon release gate is stale. Re-run `npm run qa:stadium:daejeon:release-lock`.',
        ...staleFiles.map((file) => `- ${file.path} (${file.mtime})`),
      ].join('\n'),
    );
  };

  try {
    const watchedFiles = await collectWatchedFiles();
    const { report, generatedAtMs } = await validateReleaseGateReport();

    await validateArtifactContents(report);
    await validateFreshness(generatedAtMs, watchedFiles);

    console.log(`[daejeon-change-guard] status:passed watched=${watchedFiles.length} releaseGate=${releaseGatePath}`);
  } catch (error) {
    console.error('[daejeon-change-guard] status:failed');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
};

const runCoverageReport = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { buildCoordinateChangeImpact, coordinateChangeImpactContract } = await import("./daejeon-seatmap-anchor-contract.mjs");
  const { DAEJEON_BLOCKS, DAEJEON_P2_DEDUPLICATED_ALIASES, DAEJEON_TRACE_REVIEW_SUMMARY, isDaejeonSelectableSeatBlock } = await import("../src/data/daejeonSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(frontendRoot, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const outputRoot = path.join(repoRoot, 'output/playwright');
  const manifestPath = path.join(reportDir, 'daejeon-seatmap-trace-review.json');
  const anchorCropsPath = path.join(outputRoot, 'daejeon-anchor-review/daejeon-anchor-review-crops.json');
  const testSourcePath = path.join(frontendRoot, 'src/data/daejeonSeatData.test.ts');
  const jsonPath = path.join(reportDir, 'daejeon-seatmap-coverage-report.json');
  const markdownPath = path.join(reportDir, 'daejeon-seatmap-coverage-report.md');

  const ownerPointRequiredParentIds = new Set([
    'first-infield-b-101-108',
    'first-infield-a-109-112-201-212',
    'third-infield-a-113-120-213-225',
    'third-infield-b-121-124',
    'first-table-4f-301-413',
    'third-table-4f-414-330',
    'innings-vip-400',
    'splash-jacuzzi-425',
    'splash-caravan-426',
    'central-accessible',
    'first-infield-accessible',
    'third-infield-accessible',
    'outfield-lawn-500',
    'outfield-table-third-501-503',
    'outfield-table-first-504-508',
    'outfield-reserved-509',
    'outfield-reserved-third-423-330',
    'outfield-accessible-third',
    'outfield-accessible-first',
  ]);

  const ownerPointLockedParentIds = new Set(ownerPointRequiredParentIds);

  const anchorExceptionByParentId = new Map();

  const finderSearchTerms = [
    { term: '100B', expectedBlockIds: ['central-reserved-100__100b', 'catcher-back-100__100b', 'central-table-100__100b'] },
    { term: '104', expectedBlockIds: ['first-infield-b-101-108__104'] },
    { term: '109', expectedBlockIds: ['first-infield-a-109-112-201-212__109'] },
    { term: '120', expectedBlockIds: ['third-infield-a-113-120-213-225__120'] },
    { term: '124', expectedBlockIds: ['third-infield-b-121-124__124'] },
    { term: '200', expectedBlockIds: ['cass-cheering-200__200'] },
    { term: '205', expectedBlockIds: ['first-infield-a-109-112-201-212__205'] },
    { term: '220', expectedBlockIds: ['third-infield-a-113-120-213-225__220'] },
    { term: '225', expectedBlockIds: ['third-infield-a-113-120-213-225__225'] },
    { term: '301', expectedBlockIds: ['first-table-4f-301-413__301'] },
    { term: '302', expectedBlockIds: ['first-table-4f-301-413__302'] },
    { term: '326', expectedBlockIds: ['third-table-4f-414-330__326'] },
    { term: '327', expectedBlockIds: ['third-table-4f-414-330__327'] },
    { term: '413', expectedBlockIds: ['first-table-4f-301-413__413'] },
    { term: '424', expectedBlockIds: ['outfield-reserved-third-423-330__424'] },
    { term: '425', expectedBlockIds: ['splash-jacuzzi-425__425'] },
    { term: '426', expectedBlockIds: ['splash-caravan-426__426'] },
    { term: '500', expectedBlockIds: ['outfield-lawn-500__500'] },
    { term: '501', expectedBlockIds: ['outfield-table-third-501-503__501'] },
    { term: '508', expectedBlockIds: ['outfield-table-first-504-508__508'] },
    { term: '509', expectedBlockIds: ['outfield-reserved-509__509'] },
    { term: 'S01', expectedBlockIds: ['skybox-s01-s37__s01'] },
    { term: 'S12', expectedBlockIds: ['skybox-s01-s37__s12'] },
    { term: 'S13', expectedBlockIds: ['skybox-s01-s37__s13'] },
    { term: 'S25', expectedBlockIds: ['skybox-s01-s37__s25'] },
    { term: 'S26', expectedBlockIds: ['skybox-s01-s37__s26'] },
    { term: 'S31', expectedBlockIds: ['skybox-s01-s37__s31'] },
  ];

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

  const markdownBlockIdSummary = (blockIds) => {
    if (blockIds.length === 0) return '-';
    if (blockIds.length <= 12) return blockIds.map((id) => `\`${id}\``).join('<br>');

    return [
      `count ${blockIds.length}`,
      ...blockIds.slice(0, 5).map((id) => `\`${id}\``),
      '...',
      ...blockIds.slice(-3).map((id) => `\`${id}\``),
    ].join('<br>');
  };

  const manifest = await readJson(manifestPath);
  const anchorCrops = await readJson(anchorCropsPath);
  const testSource = await fs.readFile(testSourcePath, 'utf8');

  const manifestRowsById = new Map((manifest.blocks ?? []).map((block) => [block.id, block]));
  const anchorCropIdsByBlockId = new Map();
  const anchorImpactByBlockId = new Map();

  for (const crop of anchorCrops.crops ?? []) {
    for (const blockId of crop.blocks ?? []) {
      const ids = anchorCropIdsByBlockId.get(blockId) ?? [];
      ids.push(crop.id);
      anchorCropIdsByBlockId.set(blockId, ids);

      const entries = anchorImpactByBlockId.get(blockId) ?? [];
      entries.push({
        cropId: crop.id,
        reviewPriority: crop.reviewPriority ?? 'P2',
        reviewMode: crop.reviewMode ?? 'VISUAL_CROP_REVIEW',
        regressionTestIds: crop.regressionTestIds ?? [],
        riskTags: crop.riskTags ?? [],
        manualOnlyReason: crop.manualOnlyReason ?? null,
      });
      anchorImpactByBlockId.set(blockId, entries);
    }
  }

  const reviewPriorityRank = { P0: 0, P1: 1, P2: 2 };
  const reviewModeRank = {
    AUTO_OWNER_POINT_REGRESSION: 0,
    VISUAL_CROP_REVIEW: 1,
    MANUAL_CROP_ONLY: 2,
  };
  const uniqueSorted = (values) => [...new Set(values)].sort();

  const impactForBlock = (blockId) => {
    const entries = anchorImpactByBlockId.get(blockId) ?? [];
    const reviewPriorities = uniqueSorted(entries.map((entry) => entry.reviewPriority))
      .sort((a, b) => reviewPriorityRank[a] - reviewPriorityRank[b]);
    const reviewModes = uniqueSorted(entries.map((entry) => entry.reviewMode))
      .sort((a, b) => reviewModeRank[a] - reviewModeRank[b]);

    return {
      regressionTestIds: uniqueSorted(entries.flatMap((entry) => entry.regressionTestIds)),
      reviewPriority: reviewPriorities[0] ?? 'NONE',
      reviewPriorities,
      reviewMode: reviewModes[0] ?? 'NONE',
      reviewModes,
      riskTags: uniqueSorted(entries.flatMap((entry) => entry.riskTags)),
      manualOnlyReasons: uniqueSorted(entries.map((entry) => entry.manualOnlyReason).filter(Boolean)),
    };
  };

  const retiredIds = new Set(DAEJEON_P2_DEDUPLICATED_ALIASES.map((alias) => alias.retiredBlockId));

  const blocks = DAEJEON_BLOCKS.map((block) => {
    const manifestRow = manifestRowsById.get(block.id);
    const anchorCropIds = anchorCropIdsByBlockId.get(block.id) ?? [];
    const impact = impactForBlock(block.id);
    const anchorExceptionReason = anchorExceptionByParentId.get(block.parentId) ?? '';
    const ownerPointRequired = ownerPointRequiredParentIds.has(block.parentId);
    const ownerPointLocked = ownerPointLockedParentIds.has(block.parentId);
    const labelTopHitOk = manifestRow?.labelTopHitOk === true;
    const hasAnchorCrop = anchorCropIds.length > 0;
    const hasAnchorCoverage = hasAnchorCrop || Boolean(anchorExceptionReason);
    const dataTestCovered = testSource.includes(block.id);
    const sourceLocked = block.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      && block.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE'
      && block.sourceConfidence === 'OFFICIAL'
      && isDaejeonSelectableSeatBlock(block);

    const coverageStatus = labelTopHitOk
      && sourceLocked
      && hasAnchorCoverage
      && (!ownerPointRequired || ownerPointLocked)
      ? anchorExceptionReason
        ? 'LABEL_ONLY'
        : 'LOCKED'
      : 'PARTIAL';

    return {
      id: block.id,
      parentId: block.parentId,
      blockCode: block.blockCode,
      officialSectionName: block.officialSectionName,
      category: block.category,
      traceStatus: block.traceStatus,
      traceMethod: block.traceMethod,
      sourceConfidence: block.sourceConfidence,
      selectable: isDaejeonSelectableSeatBlock(block),
      labelTopHitOk,
      labelTopHitBlockId: manifestRow?.labelTopHitBlockId ?? null,
      dataTestCovered,
      anchorCropIds,
      regressionTestIds: impact.regressionTestIds,
      reviewPriority: impact.reviewPriority,
      reviewPriorities: impact.reviewPriorities,
      reviewMode: impact.reviewMode,
      reviewModes: impact.reviewModes,
      riskTags: impact.riskTags,
      manualOnlyReasons: impact.manualOnlyReasons,
      hasAnchorCrop,
      anchorExceptionReason,
      ownerPointRequired,
      ownerPointLocked,
      coverageStatus,
    };
  });

  const missingLabelTopHit = blocks.filter((block) => !block.labelTopHitOk);
  const missingAnchorWithoutException = blocks.filter((block) => !block.hasAnchorCrop && !block.anchorExceptionReason);
  const missingOwnerPointRequired = blocks.filter((block) => block.ownerPointRequired && !block.ownerPointLocked);
  const partialBlocks = blocks.filter((block) => block.coverageStatus === 'PARTIAL');
  const labelOnlyBlocks = blocks.filter((block) => block.coverageStatus === 'LABEL_ONLY');
  const lockedBlocks = blocks.filter((block) => block.coverageStatus === 'LOCKED');
  const retiredBlocksInOperationalData = blocks.filter((block) => retiredIds.has(block.id));
  const coordinateChangeImpact = buildCoordinateChangeImpact(blocks);

  if (coordinateChangeImpact.contract !== coordinateChangeImpactContract) {
    throw new Error(`Unexpected Daejeon coordinate impact contract: ${coordinateChangeImpact.contract}`);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    totalBlocks: DAEJEON_BLOCKS.length,
    officialImageTraced: DAEJEON_TRACE_REVIEW_SUMMARY.officialImageTraced,
    needsOperatorReview: DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview,
    lockedCount: lockedBlocks.length,
    labelOnlyCount: labelOnlyBlocks.length,
    partialCount: partialBlocks.length,
    anchorExceptionCount: labelOnlyBlocks.length,
    missingLabelTopHitCount: missingLabelTopHit.length,
    missingAnchorWithoutExceptionCount: missingAnchorWithoutException.length,
    missingOwnerPointRequiredCount: missingOwnerPointRequired.length,
    retiredBlocksInOperationalDataCount: retiredBlocksInOperationalData.length,
    coordinateImpactContract: coordinateChangeImpact.contract,
    coordinateImpactCounts: coordinateChangeImpact.counts,
  };

  const report = {
    generatedAt: summary.generatedAt,
    policy: {
      coordinateSystem: 'official image 920x1060',
      statuses: ['LOCKED', 'PARTIAL', 'LABEL_ONLY'],
      ownerPointRequiredParentIds: [...ownerPointRequiredParentIds],
      anchorExceptionByParentId: Object.fromEntries(anchorExceptionByParentId),
      note: 'LABEL_ONLY 예외는 허용하지 않는다. 모든 운영 선택 블록은 anchor crop 또는 owner-point 검수 coverage를 가져야 한다.',
    },
    summary,
    finderSearchTerms,
    missingLabelTopHit: missingLabelTopHit.map((block) => block.id),
    missingAnchorWithoutException: missingAnchorWithoutException.map((block) => block.id),
    missingOwnerPointRequired: missingOwnerPointRequired.map((block) => block.id),
    partialBlocks: partialBlocks.map((block) => block.id),
    labelOnlyBlocks: labelOnlyBlocks.map((block) => block.id),
    retiredBlocksInOperationalData: retiredBlocksInOperationalData.map((block) => block.id),
    coordinateChangeImpact,
    blocks,
  };

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const statusRows = [
    ['total blocks', String(summary.totalBlocks)],
    ['official image traced', String(summary.officialImageTraced)],
    ['needs operator review', String(summary.needsOperatorReview)],
    ['LOCKED', String(summary.lockedCount)],
    ['LABEL_ONLY', String(summary.labelOnlyCount)],
    ['PARTIAL', String(summary.partialCount)],
    ['missing label top-hit', String(summary.missingLabelTopHitCount)],
    ['missing anchor without exception', String(summary.missingAnchorWithoutExceptionCount)],
    ['missing owner-point required', String(summary.missingOwnerPointRequiredCount)],
    ['retired operational blocks', String(summary.retiredBlocksInOperationalDataCount)],
  ];
  const operatorReviewRows = [
    ['operational blocks', summary.totalBlocks === 139 ? 'PASS' : 'BLOCK', `${summary.totalBlocks}/139`],
    ['coverage locked', summary.lockedCount === summary.totalBlocks ? 'PASS' : 'BLOCK', `${summary.lockedCount}/${summary.totalBlocks}`],
    ['label-only exceptions', summary.labelOnlyCount === 0 ? 'PASS' : 'BLOCK', String(summary.labelOnlyCount)],
    ['partial blocks', summary.partialCount === 0 ? 'PASS' : 'BLOCK', String(summary.partialCount)],
    ['label top-hit failures', summary.missingLabelTopHitCount === 0 ? 'PASS' : 'BLOCK', String(summary.missingLabelTopHitCount)],
    ['missing anchor coverage', summary.missingAnchorWithoutExceptionCount === 0 ? 'PASS' : 'BLOCK', String(summary.missingAnchorWithoutExceptionCount)],
    ['missing owner-point lock', summary.missingOwnerPointRequiredCount === 0 ? 'PASS' : 'BLOCK', String(summary.missingOwnerPointRequiredCount)],
    ['retired P2 in operational data', summary.retiredBlocksInOperationalDataCount === 0 ? 'PASS' : 'BLOCK', String(summary.retiredBlocksInOperationalDataCount)],
  ];
  const releaseBlockers = [
    ['partial blocks > 0', summary.partialCount],
    ['LABEL_ONLY exceptions > 0', summary.labelOnlyCount],
    ['missing label top-hit > 0', summary.missingLabelTopHitCount],
    ['missing anchor without exception > 0', summary.missingAnchorWithoutExceptionCount],
    ['missing owner-point required > 0', summary.missingOwnerPointRequiredCount],
    ['retired operational blocks > 0', summary.retiredBlocksInOperationalDataCount],
  ];

  await fs.writeFile(markdownPath, [
    '# 대전 좌석도 coverage report',
    '',
    `- generated: ${summary.generatedAt}`,
    '- coordinate system: official image 920x1060',
    '- LABEL_ONLY exception: none',
    '',
    '## Operator Review',
    '',
    markdownTable(['check', 'status', 'value'], operatorReviewRows),
    '',
    '## Release Blockers',
    '',
    markdownTable(
      ['condition', 'current count'],
      releaseBlockers.map(([label, count]) => [label, String(count)]),
    ),
    '',
    '배포 승인 전 위 count가 모두 0이어야 한다. `coverage locked`는 139/139여야 한다.',
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], statusRows),
    '',
    '## Coordinate Change Impact',
    '',
    `- contract: \`${coordinateChangeImpact.contract}\``,
    '- 좌표 변경 시 아래 crop/test 역매핑 기준으로 재검수 범위를 결정한다.',
    '',
    markdownTable(
      ['impact group', 'count', 'block ids'],
      [
        ['P0 crop coverage', String(coordinateChangeImpact.counts.p0), markdownBlockIdSummary(coordinateChangeImpact.p0BlockIds)],
        ['P1 crop coverage', String(coordinateChangeImpact.counts.p1), markdownBlockIdSummary(coordinateChangeImpact.p1BlockIds)],
        ['P2 auto regression coverage', String(coordinateChangeImpact.counts.p2Auto), markdownBlockIdSummary(coordinateChangeImpact.p2AutoBlockIds)],
        ['P2 manual crop-only coverage', String(coordinateChangeImpact.counts.p2ManualOnly), markdownBlockIdSummary(coordinateChangeImpact.p2ManualOnlyBlockIds)],
        ['auto regression blocks', String(coordinateChangeImpact.counts.autoRegression), markdownBlockIdSummary(coordinateChangeImpact.autoRegressionBlockIds)],
        ['manual crop-only blocks', String(coordinateChangeImpact.counts.manualCropOnly), markdownBlockIdSummary(coordinateChangeImpact.manualCropOnlyBlockIds)],
        ['traced without regression', String(coordinateChangeImpact.counts.tracedWithoutRegression), markdownBlockIdSummary(coordinateChangeImpact.tracedWithoutRegressionBlockIds)],
        ['missing impact mapping', String(coordinateChangeImpact.counts.missingImpact), markdownBlockIdSummary(coordinateChangeImpact.missingImpactBlockIds)],
      ],
    ),
    '',
    '## Finder Search Terms',
    '',
    markdownTable(
      ['term', 'expected block ids'],
      finderSearchTerms.map((item) => [item.term, item.expectedBlockIds.map((id) => `\`${id}\``).join('<br>')]),
    ),
    '',
    '## Label-Only Exceptions',
    '',
    labelOnlyBlocks.length
      ? markdownTable(
        ['block', 'reason'],
        labelOnlyBlocks.map((block) => [`\`${block.id}\``, block.anchorExceptionReason]),
      )
      : '- none',
    '',
    '## Block Matrix',
    '',
    markdownTable(
      ['block', 'code', 'status', 'priority', 'review mode', 'regression tests', 'risk tags', 'label top-hit', 'anchor crop', 'owner point', 'data test'],
      blocks.map((block) => [
        `\`${block.id}\``,
        block.blockCode,
        block.coverageStatus,
        block.reviewPriority,
        block.reviewMode,
        block.regressionTestIds.map((id) => `\`${id}\``).join('<br>') || '-',
        block.riskTags.map((tag) => `\`${tag}\``).join(' ') || '-',
        String(block.labelTopHitOk),
        block.anchorCropIds.length ? block.anchorCropIds.map((id) => `\`${id}\``).join('<br>') : block.anchorExceptionReason || '-',
        block.ownerPointRequired ? String(block.ownerPointLocked) : 'not required',
        String(block.dataTestCovered),
      ]),
    ),
    '',
  ].join('\n'), 'utf8');

  console.log(`coverage_json:${jsonPath}`);
  console.log(`coverage_markdown:${markdownPath}`);
  console.log(`status:ok total=${summary.totalBlocks} locked=${summary.lockedCount} labelOnly=${summary.labelOnlyCount} partial=${summary.partialCount} missingLabelTopHit=${summary.missingLabelTopHitCount} missingAnchorWithoutException=${summary.missingAnchorWithoutExceptionCount} missingOwnerPointRequired=${summary.missingOwnerPointRequiredCount}`);
};

const runEvidenceCrops = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");
  const { DAEJEON_BLOCKS, DAEJEON_P2_DEDUPLICATED_ALIASES, DAEJEON_SEATMAP_IMAGE } = await import("../src/data/daejeonSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultOutDir = path.join(defaultReportDir, 'daejeon-p2-evidence-crops');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const numberOr = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const pathToPoints = (pathData) => {
    const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];

    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }

    return points;
  };

  const pathBounds = (pathData) => {
    const points = pathToPoints(pathData);
    if (points.length === 0) return null;

    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  };

  const normalizeBounds = (bounds) => {
    if (!bounds || typeof bounds !== 'object') return null;
    const { minX, minY, maxX, maxY } = bounds;
    if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
    return { minX, minY, maxX, maxY };
  };

  const cropForRows = (rows, padding) => {
    const bounds = rows
      .map((row) => normalizeBounds(pathBounds(row.hitAreaD || row.imageGeometry?.d || '')))
      .filter(Boolean);

    if (bounds.length === 0) {
      throw new Error('Cannot build Daejeon evidence crop without path bounds');
    }

    const minX = Math.floor(Math.min(...bounds.map((item) => item.minX)) - padding);
    const minY = Math.floor(Math.min(...bounds.map((item) => item.minY)) - padding);
    const maxX = Math.ceil(Math.max(...bounds.map((item) => item.maxX)) + padding);
    const maxY = Math.ceil(Math.max(...bounds.map((item) => item.maxY)) + padding);

    const x = clamp(minX, 0, DAEJEON_SEATMAP_IMAGE.imageWidth - 1);
    const y = clamp(minY, 0, DAEJEON_SEATMAP_IMAGE.imageHeight - 1);
    const right = clamp(maxX, x + 1, DAEJEON_SEATMAP_IMAGE.imageWidth);
    const bottom = clamp(maxY, y + 1, DAEJEON_SEATMAP_IMAGE.imageHeight);

    return {
      x,
      y,
      width: right - x,
      height: bottom - y,
    };
  };

  const clearGeneratedCropImages = async (directory) => {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return;
      }
      throw error;
    }

    await Promise.all(entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.png'))
      .map((entry) => fs.unlink(path.join(directory, entry.name))));
  };

  const gridLines = (crop, step) => {
    const lines = [];
    const startX = Math.ceil(crop.x / step) * step;
    const startY = Math.ceil(crop.y / step) * step;

    for (let x = startX; x <= crop.x + crop.width; x += step) {
      lines.push(`<line class="grid" x1="${x}" y1="${crop.y}" x2="${x}" y2="${crop.y + crop.height}" />`);
    }
    for (let y = startY; y <= crop.y + crop.height; y += step) {
      lines.push(`<line class="grid" x1="${crop.x}" y1="${y}" x2="${crop.x + crop.width}" y2="${y}" />`);
    }

    return lines.join('\n');
  };

  const buildOverlaySvg = (alias, canonicalOwnerRow, crop, width, height) => {
    const labelFontSize = Math.max(8, Math.min(16, Math.round(crop.width / 13)));

    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}">
    <style>
      .grid { stroke: #0f172a; stroke-opacity: 0.18; stroke-width: 0.8; vector-effect: non-scaling-stroke; }
      .owner { fill: rgba(14, 165, 233, 0.2); stroke: #0284c7; stroke-width: 2.4; vector-effect: non-scaling-stroke; }
      .owner-label { font: 900 ${labelFontSize}px Arial, sans-serif; fill: #075985; stroke: #ffffff; stroke-width: 2.8; paint-order: stroke; text-anchor: middle; dominant-baseline: central; }
    </style>
    ${gridLines(crop, 25)}
    <path class="owner" d="${xmlEscape(canonicalOwnerRow.hitAreaD)}"><title>${xmlEscape(`${canonicalOwnerRow.id} canonical owner for retired ${alias.retiredBlockId}`)}</title></path>
    <circle cx="${canonicalOwnerRow.labelX}" cy="${canonicalOwnerRow.labelY}" r="3" fill="#0369a1" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke" />
    <text class="owner-label" x="${canonicalOwnerRow.labelX}" y="${canonicalOwnerRow.labelY - 10}">${xmlEscape(canonicalOwnerRow.blockCode)}</text>
  </svg>`;
  };

  const buildHeaderSvg = (alias, canonicalOwnerRow, width, height) => {
    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" />
    <text x="10" y="19" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#0f172a">${xmlEscape(`${alias.blockCode}. retired ${alias.retiredBlockId}`)}</text>
    <text x="10" y="38" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#475569">${xmlEscape(`blue=canonical owner: ${canonicalOwnerRow.id}`)}</text>
    <text x="10" y="56" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#0369a1">${xmlEscape('Retired alias has no operational geometry. This crop shows the traced canonical owner only.')}</text>
  </svg>`;
  };

  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const scale = numberOr(argValue('--scale', '3'), 3);
  const padding = numberOr(argValue('--padding', '56'), 56);
  const imagePath = path.resolve(frontendRoot, DAEJEON_SEATMAP_IMAGE.imagePath);
  const manifestPath = path.join(reportDir, 'daejeon-seatmap-trace-review.json');

  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const imageMetadata = await sharp(imagePath).metadata();
  if (imageMetadata.width !== DAEJEON_SEATMAP_IMAGE.imageWidth || imageMetadata.height !== DAEJEON_SEATMAP_IMAGE.imageHeight) {
    throw new Error(`Daejeon image size mismatch: actual=${imageMetadata.width}x${imageMetadata.height} data=${DAEJEON_SEATMAP_IMAGE.imageWidth}x${DAEJEON_SEATMAP_IMAGE.imageHeight}`);
  }

  const blockRowsById = new Map(manifest.blocks.map((row) => [row.id, row]));
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));

  await fs.mkdir(outDir, { recursive: true });
  await clearGeneratedCropImages(outDir);

  const outputs = [];
  for (const alias of DAEJEON_P2_DEDUPLICATED_ALIASES) {
    const canonicalOwnerRow = blockRowsById.get(alias.canonicalBlockId);
    if (!canonicalOwnerRow) {
      throw new Error(`Missing Daejeon canonical owner row for ${alias.retiredBlockId}: ${alias.canonicalBlockId}`);
    }
    if (blockRowsById.has(alias.retiredBlockId) || blockById.has(alias.retiredBlockId)) {
      throw new Error(`Retired Daejeon alias should not exist as operational geometry: ${alias.retiredBlockId}`);
    }

    const crop = cropForRows([canonicalOwnerRow], padding);
    const outputWidth = crop.width * scale;
    const outputHeight = crop.height * scale;
    const headerHeight = 72;
    const overlaySvg = Buffer.from(buildOverlaySvg(alias, canonicalOwnerRow, crop, outputWidth, outputHeight));
    const headerSvg = Buffer.from(buildHeaderSvg(alias, canonicalOwnerRow, outputWidth, headerHeight));
    const fileName = path.basename(alias.evidenceCropPath);
    const outputPath = path.join(outDir, fileName);

    const cropBuffer = await sharp(imagePath)
      .extract({
        left: crop.x,
        top: crop.y,
        width: crop.width,
        height: crop.height,
      })
      .resize(outputWidth, outputHeight, { kernel: 'nearest' })
      .composite([{ input: overlaySvg, left: 0, top: 0 }])
      .png()
      .toBuffer();

    await sharp(cropBuffer)
      .extend({ top: headerHeight, background: '#f8fafc' })
      .composite([{ input: headerSvg, left: 0, top: 0 }])
      .png()
      .toFile(outputPath);

    outputs.push({
      retiredBlockId: alias.retiredBlockId,
      blockCode: alias.blockCode,
      retiredParentId: alias.retiredParentId,
      officialSectionName: alias.officialSectionName,
      canonicalBlockId: alias.canonicalBlockId,
      reason: alias.reason,
      evidenceCropPath: alias.evidenceCropPath,
      ownerBlockId: canonicalOwnerRow.id,
      ownerLabel: canonicalOwnerRow.officialBlockLabel,
      overlayBlockIds: [canonicalOwnerRow.id],
      crop,
      outputPath,
      retiredBlockExists: blockById.has(alias.retiredBlockId),
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    asset: DAEJEON_SEATMAP_IMAGE,
    scale,
    padding,
    note: 'P2 retired aliases are not operational geometry. Evidence crops show only the official traced canonical owner for each duplicate blockCode.',
    outputs,
  };

  const reportPath = path.join(reportDir, 'daejeon-seatmap-p2-evidence-crops.json');
  const markdownPath = path.join(reportDir, 'daejeon-seatmap-p2-evidence-crops.md');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, [
    '# 대전 좌석도 P2 deduplicated alias evidence crops',
    '',
    `- generated: ${report.generatedAt}`,
    `- outputs: ${outputs.length}`,
    '- blue: 같은 blockCode로 이미 traced 된 canonical owner path',
    '- retired alias는 운영 geometry가 아니므로 red pending overlay를 생성하지 않습니다.',
    '',
    '| order | retired block | section | canonical owner | crop |',
    '| --- | --- | --- | --- | --- |',
    ...outputs.map((output, index) => (
      `| ${index + 1} | \`${output.retiredBlockId}\` | ${output.officialSectionName} | \`${output.ownerBlockId}\` | ${path.relative(reportDir, output.outputPath)} |`
    )),
    '',
  ].join('\n'), 'utf8');

  console.log(`evidence_report:${reportPath}`);
  console.log(`evidence_markdown:${markdownPath}`);
  console.log(`evidence_dir:${outDir}`);
  console.log(`status:ok outputs=${outputs.length}`);
};

const runGeometryDiff = async () => {
  const { createHash } = await import("node:crypto");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { buildAnchorImpactByBlockId, buildAnchorReviewCrops, coordinateChangeImpactContract, coordinateImpactForBlock } = await import("./daejeon-seatmap-anchor-contract.mjs");
  const { DAEJEON_BLOCKS, DAEJEON_TRACE_REVIEW_SUMMARY, isDaejeonSelectableSeatBlock } = await import("../src/data/daejeonSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(frontendRoot, '..');
  const outputRoot = path.join(repoRoot, 'output/playwright');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const anchorReviewOutputDir = path.join(outputRoot, 'daejeon-anchor-review');
  const baselinePath = path.join(frontendRoot, 'src/data/daejeonGeometryBaseline.json');
  const geometryDiffJsonPath = path.join(reportDir, 'daejeon-seatmap-geometry-diff.json');
  const geometryDiffMarkdownPath = path.join(reportDir, 'daejeon-seatmap-geometry-diff.md');
  const geometryDiffContract = 'DAEJEON_GEOMETRY_BASELINE_V1';
  const expectedBlockCount = 139;

  const args = new Set(process.argv.slice(2));
  const writeBaseline = args.has('--write-baseline');

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const fileExists = async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  };

  const stableStringify = (value) => JSON.stringify(value);

  const sha256Json = (value) => createHash('sha256')
    .update(stableStringify(value))
    .digest('hex');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

  const normalizeGeometry = (block) => ({
    id: block.id,
    parentId: block.parentId,
    blockCode: block.blockCode,
    officialBlockLabel: block.officialBlockLabel,
    officialSectionName: block.officialSectionName,
    category: block.category,
    traceStatus: block.traceStatus,
    traceMethod: block.traceMethod,
    sourceConfidence: block.sourceConfidence,
    selectable: isDaejeonSelectableSeatBlock(block),
    imageGeometry: {
      d: block.imageGeometry.d,
      labelX: block.imageGeometry.labelX,
      labelY: block.imageGeometry.labelY,
      shortLabel: block.imageGeometry.shortLabel,
      labelFontSize: block.imageGeometry.labelFontSize ?? null,
      labelRotate: block.imageGeometry.labelRotate ?? null,
    },
    hitAreaD: block.hitAreaD ?? null,
  });

  const normalizeImpact = (impact) => ({
    anchorCropIds: [...(impact.anchorCropIds ?? [])].sort(),
    regressionTestIds: [...(impact.regressionTestIds ?? [])].sort(),
    reviewPriority: impact.reviewPriority ?? 'P2',
    reviewMode: impact.reviewMode ?? 'VISUAL_CROP_REVIEW',
    riskTags: [...(impact.riskTags ?? [])].sort(),
    manualOnlyReasons: [...(impact.manualOnlyReasons ?? [])].sort(),
  });

  const fieldComparisons = (expected, actual) => [
    ['imageGeometry.d', expected.geometry.imageGeometry.d, actual.geometry.imageGeometry.d],
    ['imageGeometry.labelX', expected.geometry.imageGeometry.labelX, actual.geometry.imageGeometry.labelX],
    ['imageGeometry.labelY', expected.geometry.imageGeometry.labelY, actual.geometry.imageGeometry.labelY],
    ['imageGeometry.shortLabel', expected.geometry.imageGeometry.shortLabel, actual.geometry.imageGeometry.shortLabel],
    ['imageGeometry.labelFontSize', expected.geometry.imageGeometry.labelFontSize, actual.geometry.imageGeometry.labelFontSize],
    ['imageGeometry.labelRotate', expected.geometry.imageGeometry.labelRotate, actual.geometry.imageGeometry.labelRotate],
    ['hitAreaD', expected.geometry.hitAreaD, actual.geometry.hitAreaD],
    ['traceStatus', expected.geometry.traceStatus, actual.geometry.traceStatus],
    ['traceMethod', expected.geometry.traceMethod, actual.geometry.traceMethod],
    ['sourceConfidence', expected.geometry.sourceConfidence, actual.geometry.sourceConfidence],
    ['selectable', expected.geometry.selectable, actual.geometry.selectable],
    ['officialBlockLabel', expected.geometry.officialBlockLabel, actual.geometry.officialBlockLabel],
    ['officialSectionName', expected.geometry.officialSectionName, actual.geometry.officialSectionName],
    ['category', expected.geometry.category, actual.geometry.category],
  ];

  const changedFieldsForBlock = (expected, actual) => fieldComparisons(expected, actual)
    .filter(([, left, right]) => stableStringify(left) !== stableStringify(right))
    .map(([field]) => field);

  const buildCurrentSnapshot = () => {
    const anchorImpactByBlockId = buildAnchorImpactByBlockId(buildAnchorReviewCrops(anchorReviewOutputDir));
    const blocks = DAEJEON_BLOCKS
      .map((block) => {
        const geometry = normalizeGeometry(block);
        const impact = normalizeImpact(coordinateImpactForBlock(anchorImpactByBlockId, block.id));

        return {
          id: block.id,
          blockCode: block.blockCode,
          parentId: block.parentId,
          officialBlockLabel: block.officialBlockLabel,
          officialSectionName: block.officialSectionName,
          fingerprint: sha256Json(geometry),
          geometry,
          ...impact,
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    return {
      contract: geometryDiffContract,
      coordinateChangeImpactContract,
      expectedBlockCount,
      summary: {
        totalBlocks: DAEJEON_TRACE_REVIEW_SUMMARY.totalBlocks,
        officialImageTraced: DAEJEON_TRACE_REVIEW_SUMMARY.officialImageTraced,
        needsOperatorReview: DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview,
        selectableBlocks: blocks.filter((block) => block.geometry.selectable).length,
      },
      blocks,
    };
  };

  const buildBaselineFile = (snapshot) => ({
    contract: geometryDiffContract,
    generatedAt: new Date().toISOString(),
    coordinateChangeImpactContract: snapshot.coordinateChangeImpactContract,
    expectedBlockCount: snapshot.expectedBlockCount,
    policy: {
      purpose: '대전 공식 이미지 overlay block geometry fingerprint baseline',
      coordinateSystem: 'official image 920x1060',
      lockedFields: [
        'imageGeometry.d',
        'imageGeometry.labelX',
        'imageGeometry.labelY',
        'imageGeometry.shortLabel',
        'imageGeometry.labelFontSize',
        'imageGeometry.labelRotate',
        'hitAreaD',
        'traceStatus',
        'traceMethod',
        'sourceConfidence',
        'selectable',
      ],
      note: '좌표/path/trace 계약 변경으로 fingerprint가 바뀌면 release-lock에서 geometry diff가 실패하며 baseline 갱신 전 운영자 검수가 필요하다.',
    },
    summary: snapshot.summary,
    blocks: snapshot.blocks,
  });

  const compareSnapshot = (baseline, snapshot) => {
    const baselineById = new Map((baseline.blocks ?? []).map((block) => [block.id, block]));
    const currentById = new Map(snapshot.blocks.map((block) => [block.id, block]));
    const missingBlockIds = [...baselineById.keys()].filter((id) => !currentById.has(id)).sort();
    const extraBlockIds = [...currentById.keys()].filter((id) => !baselineById.has(id)).sort();
    const changedBlocks = [];

    for (const [id, current] of currentById.entries()) {
      const expected = baselineById.get(id);
      if (!expected || expected.fingerprint === current.fingerprint) continue;

      changedBlocks.push({
        id,
        blockCode: current.blockCode,
        parentId: current.parentId,
        officialBlockLabel: current.officialBlockLabel,
        officialSectionName: current.officialSectionName,
        expectedFingerprint: expected.fingerprint,
        actualFingerprint: current.fingerprint,
        changedFields: changedFieldsForBlock(expected, current),
        anchorCropIds: current.anchorCropIds,
        regressionTestIds: current.regressionTestIds,
        reviewPriority: current.reviewPriority,
        reviewMode: current.reviewMode,
        riskTags: current.riskTags,
        manualOnlyReasons: current.manualOnlyReasons,
      });
    }

    const changedFieldSets = changedBlocks.map((block) => new Set(block.changedFields));
    const countChangedByField = (field) => changedFieldSets.filter((fields) => fields.has(field)).length;
    const traceContractFields = new Set(['traceStatus', 'traceMethod', 'sourceConfidence', 'selectable']);
    const imageGeometryMetadataFields = new Set([
      'imageGeometry.shortLabel',
      'imageGeometry.labelFontSize',
      'imageGeometry.labelRotate',
    ]);
    const failures = [
      ...missingBlockIds.map((id) => `missing baseline block in current output: ${id}`),
      ...extraBlockIds.map((id) => `extra block not present in baseline: ${id}`),
      ...changedBlocks.map((block) => `block geometry fingerprint changed: ${block.id} (${block.changedFields.join(', ')})`),
    ];

    return {
      contract: geometryDiffContract,
      status: failures.length === 0 ? 'passed' : 'failed',
      summary: {
        baselineBlockCount: baseline.blocks?.length ?? 0,
        currentBlockCount: snapshot.blocks.length,
        missingBlockCount: missingBlockIds.length,
        extraBlockCount: extraBlockIds.length,
        changedBlockCount: changedBlocks.length,
        changedImageGeometryDCount: countChangedByField('imageGeometry.d'),
        changedHitAreaDCount: countChangedByField('hitAreaD'),
        changedLabelCoordinateCount: countChangedByField('imageGeometry.labelX') + countChangedByField('imageGeometry.labelY'),
        changedImageGeometryMetadataCount: changedBlocks.filter((block) => block.changedFields.some((field) => imageGeometryMetadataFields.has(field))).length,
        changedTraceContractCount: changedBlocks.filter((block) => block.changedFields.some((field) => traceContractFields.has(field))).length,
        p0ChangedBlockCount: changedBlocks.filter((block) => block.reviewPriority === 'P0').length,
      },
      baseline: {
        path: path.relative(frontendRoot, baselinePath).replaceAll(path.sep, '/'),
        generatedAt: baseline.generatedAt ?? null,
        coordinateChangeImpactContract: baseline.coordinateChangeImpactContract ?? null,
      },
      current: {
        generatedAt: new Date().toISOString(),
        coordinateChangeImpactContract: snapshot.coordinateChangeImpactContract,
        summary: snapshot.summary,
      },
      missingBlockIds,
      extraBlockIds,
      changedBlocks,
      failures,
    };
  };

  const writeReport = async (result) => {
    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(geometryDiffJsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

    const changedRows = result.changedBlocks.map((block) => [
      block.reviewPriority,
      block.reviewMode,
      `\`${block.id}\``,
      block.blockCode,
      block.changedFields.map((field) => `\`${field}\``).join('<br>'),
      block.anchorCropIds.length ? block.anchorCropIds.map((id) => `\`${id}\``).join('<br>') : 'n/a',
      block.regressionTestIds.length ? block.regressionTestIds.map((id) => `\`${id}\``).join('<br>') : 'n/a',
    ]);

    await fs.writeFile(geometryDiffMarkdownPath, [
      '# 대전 좌석도 geometry fingerprint diff',
      '',
      `- generated: ${result.current.generatedAt}`,
      `- status: ${result.status}`,
      `- contract: \`${result.contract}\``,
      `- baseline: \`${result.baseline.path}\` (${result.baseline.generatedAt ?? 'unknown'})`,
      `- coordinate impact contract: \`${result.current.coordinateChangeImpactContract}\``,
      '',
      '## Summary',
      '',
      markdownTable(
        ['metric', 'value'],
        Object.entries(result.summary).map(([key, value]) => [key, String(value)]),
      ),
      '',
      '## Changed Blocks',
      '',
      changedRows.length
        ? markdownTable(['priority', 'mode', 'block', 'code', 'changed fields', 'anchor crops', 'regression tests'], changedRows)
        : 'No block geometry fingerprint changes.',
      '',
      '## Missing / Extra Blocks',
      '',
      `- missing: ${result.missingBlockIds.length ? result.missingBlockIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
      `- extra: ${result.extraBlockIds.length ? result.extraBlockIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
      '',
      '## Failures',
      '',
      result.failures.length
        ? result.failures.map((failure) => `- ${failure}`).join('\n')
        : '- none',
      '',
      '## Policy',
      '',
      '- baseline block fingerprint가 바뀌면 좌표/path/trace 계약 변경 영향으로 보고 release-lock을 실패시킨다.',
      '- 변경 block은 anchorCropIds, regressionTestIds, reviewPriority 기준으로 재검수한다.',
      '- baseline 갱신은 운영자 검수 후 `node scripts/stadium-seatmap-ops.mjs daejeon geometry-baseline`로만 수행한다.',
      '',
    ].join('\n'), 'utf8');
  };

  try {
    const snapshot = buildCurrentSnapshot();

    if (writeBaseline) {
      const baseline = buildBaselineFile(snapshot);
      await fs.writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
      await writeReport({
        contract: geometryDiffContract,
        status: 'baseline-written',
        summary: {
          baselineBlockCount: baseline.blocks.length,
          currentBlockCount: snapshot.blocks.length,
          missingBlockCount: 0,
          extraBlockCount: 0,
          changedBlockCount: 0,
          changedImageGeometryDCount: 0,
          changedHitAreaDCount: 0,
          changedLabelCoordinateCount: 0,
          changedImageGeometryMetadataCount: 0,
          changedTraceContractCount: 0,
          p0ChangedBlockCount: 0,
        },
        baseline: {
          path: path.relative(frontendRoot, baselinePath).replaceAll(path.sep, '/'),
          generatedAt: baseline.generatedAt,
          coordinateChangeImpactContract: baseline.coordinateChangeImpactContract,
        },
        current: {
          generatedAt: baseline.generatedAt,
          coordinateChangeImpactContract: snapshot.coordinateChangeImpactContract,
          summary: snapshot.summary,
        },
        missingBlockIds: [],
        extraBlockIds: [],
        changedBlocks: [],
        failures: [],
      });
      console.log(`geometry_baseline:${baselinePath}`);
      console.log(`geometry_diff_json:${geometryDiffJsonPath}`);
      console.log(`geometry_diff_markdown:${geometryDiffMarkdownPath}`);
      console.log(`status:baseline-written blocks=${baseline.blocks.length}`);
      process.exit(0);
    }

    if (!(await fileExists(baselinePath))) {
      throw new Error(`Missing Daejeon geometry baseline: ${baselinePath}`);
    }

    const baseline = await readJson(baselinePath);
    const result = compareSnapshot(baseline, snapshot);
    await writeReport(result);

    console.log(`geometry_diff_json:${geometryDiffJsonPath}`);
    console.log(`geometry_diff_markdown:${geometryDiffMarkdownPath}`);
    console.log(`status:${result.status} changed=${result.summary.changedBlockCount} missing=${result.summary.missingBlockCount} extra=${result.summary.extraBlockCount}`);

    if (result.status !== 'passed') {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('status:failed');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
};

const runOperatorApproval = async (taskArgs = process.argv.slice(2), overrideOptions = null) => {
  const { createHash } = await import("node:crypto");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const scriptPath = fileURLToPath(import.meta.url);
  const scriptDir = path.dirname(scriptPath);
  const defaultFrontendRoot = path.resolve(scriptDir, '..');

  const APPROVAL_STATUSES = new Set([
    'PENDING_OPERATOR_APPROVAL',
    'APPROVED',
    'STALE_APPROVAL',
  ]);
  const APPROVAL_CONTRACT = 'DAEJEON_OPERATOR_APPROVAL_V1';
  const RELEASE_APPROVED_COMMAND = 'npm run qa:stadium:daejeon:release-approved';
  const APPROVER_PLACEHOLDERS = new Set([
    '',
    'operator-name',
    'operator name',
    '<operator name>',
    '<actual-operator-id>',
    'actual-operator-id',
    'todo',
    'tbd',
    'unknown',
  ]);

  const assertApproval = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const createPaths = (rootDir) => {
    const reportDir = path.join(rootDir, 'reports/stadium');
    const handoffJsonPath = path.join(reportDir, 'daejeon-seatmap-operator-handoff.json');
    const handoffMarkdownPath = path.join(reportDir, 'daejeon-seatmap-operator-handoff.md');
    const releaseGateJsonPath = path.join(reportDir, 'daejeon-seatmap-release-gate.json');
    const approvalPath = path.join(reportDir, 'daejeon-seatmap-operator-approval.json');

    return {
      rootDir,
      reportDir,
      handoffJsonPath,
      handoffMarkdownPath,
      releaseGateJsonPath,
      approvalPath,
    };
  };

  const parseCliArgs = (args) => {
    const hasFlag = (flag) => args.includes(flag);
    const getOptionValue = (name) => {
      const equalsPrefix = `${name}=`;
      const equalsValue = args.find((arg) => arg.startsWith(equalsPrefix));
      if (equalsValue) {
        return equalsValue.slice(equalsPrefix.length);
      }

      const index = args.indexOf(name);
      if (index === -1) {
        return null;
      }

      const value = args[index + 1];
      return value && !value.startsWith('--') ? value : null;
    };

    return {
      approveRequested: hasFlag('--approve'),
      statusRequested: hasFlag('--status'),
      requireApproved: hasFlag('--require-approved'),
      approvedByInput: getOptionValue('--approved-by'),
      notesInput: getOptionValue('--notes'),
    };
  };

  const fileExists = async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const writeJson = async (filePath, value) => {
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  };

  const sha256File = async (filePath) => createHash('sha256')
    .update(await fs.readFile(filePath))
    .digest('hex');

  const relativeArtifactPath = ({ rootDir }, filePath) => path.relative(rootDir, filePath).replaceAll(path.sep, '/');

  const sourceArtifactsForPaths = (paths) => ({
    handoffJson: relativeArtifactPath(paths, paths.handoffJsonPath),
    handoffMarkdown: relativeArtifactPath(paths, paths.handoffMarkdownPath),
    releaseGateJson: relativeArtifactPath(paths, paths.releaseGateJsonPath),
  });

  const approvalSourceArtifactsMatch = (approval, current) => JSON.stringify(approval.sourceArtifacts ?? null)
    === JSON.stringify(current.sourceArtifacts ?? null);

  const approvalMatchesCurrentArtifacts = (approval, current) => approval.contract === current.contract
    && approvalSourceArtifactsMatch(approval, current)
    && approval.approvedHandoffHash === current.approvedHandoffHash
    && approval.approvedHandoffMarkdownHash === current.approvedHandoffMarkdownHash
    && approval.approvedReleaseGateHash === current.approvedReleaseGateHash
    && approval.handoffGeneratedAt === current.handoffGeneratedAt
    && approval.releaseGateGeneratedAt === current.releaseGateGeneratedAt;

  const isPlaceholderApprover = (value) => {
    const normalized = String(value ?? '').trim().toLowerCase();
    return APPROVER_PLACEHOLDERS.has(normalized) || /<[^>]+>/.test(normalized);
  };

  const validateSourceArtifacts = async (paths) => {
    const { handoffJsonPath, handoffMarkdownPath, releaseGateJsonPath } = paths;
    for (const filePath of [handoffJsonPath, handoffMarkdownPath, releaseGateJsonPath]) {
      assertApproval(await fileExists(filePath), `missing Daejeon approval source artifact: ${filePath}`);
    }

    const handoff = await readJson(handoffJsonPath);
    const releaseGate = await readJson(releaseGateJsonPath);
    const sourceArtifacts = sourceArtifactsForPaths(paths);

    assertApproval(handoff.status === 'READY_FOR_OPERATOR_REVIEW', 'operator handoff must be READY_FOR_OPERATOR_REVIEW');
    assertApproval(releaseGate.status === 'passed', 'release gate must be passed');
    assertApproval(handoff.releaseGate?.generatedAt === releaseGate.generatedAt, 'operator handoff releaseGate.generatedAt must match current release gate');
    assertApproval(handoff.releaseGate?.status === releaseGate.status, 'operator handoff releaseGate.status must match current release gate');
    assertApproval(handoff.releaseGate?.reportJson === sourceArtifacts.releaseGateJson, 'operator handoff releaseGate.reportJson must point at current release gate JSON');
    assertApproval(handoff.lockedStatus?.totalBlocks === 139, 'handoff totalBlocks must be 139');
    assertApproval(handoff.lockedStatus?.officialImageTraced === 139, 'handoff officialImageTraced must be 139');
    assertApproval(handoff.lockedStatus?.needsOperatorReview === 0, 'handoff needsOperatorReview must be 0');
    assertApproval(handoff.lockedStatus?.labelTopHitFailures === 0, 'handoff labelTopHitFailures must be 0');
    assertApproval(handoff.lockedStatus?.coverageLocked === 139, 'handoff coverageLocked must be 139');
    assertApproval(handoff.lockedStatus?.coverageLabelOnly === 0, 'handoff coverageLabelOnly must be 0');
    assertApproval(handoff.lockedStatus?.p2DeduplicatedAliases === 11, 'handoff p2DeduplicatedAliases must be 11');
    assertApproval(handoff.lockedStatus?.p2EvidenceOutputs === 11, 'handoff p2EvidenceOutputs must be 11');
    assertApproval(handoff.lockedStatus?.anchorCrops === 28, 'handoff anchorCrops must be 28');
    assertApproval(handoff.lockedStatus?.visualDiffStatus === 'passed', 'handoff visualDiffStatus must be passed');
    assertApproval(handoff.lockedStatus?.visualDiffChangedCrops === 0, 'handoff visualDiffChangedCrops must be 0');
    assertApproval(handoff.lockedStatus?.visualDiffMetadataMismatches === 0, 'handoff visualDiffMetadataMismatches must be 0');
    assertApproval(handoff.lockedStatus?.geometryDiffStatus === 'passed', 'handoff geometryDiffStatus must be passed');
    assertApproval(handoff.lockedStatus?.geometryDiffChangedBlocks === 0, 'handoff geometryDiffChangedBlocks must be 0');
    assertApproval(handoff.lockedStatus?.geometryDiffMissingBlocks === 0, 'handoff geometryDiffMissingBlocks must be 0');
    assertApproval(handoff.lockedStatus?.geometryDiffExtraBlocks === 0, 'handoff geometryDiffExtraBlocks must be 0');
    assertApproval(handoff.lockedStatus?.browserQaStatus === 'passed', 'handoff browser QA status must be passed');
    assertApproval(handoff.lockedStatus?.browserQaOverflowFailures === 0, 'handoff browser QA overflow failures must be 0');
    assertApproval(releaseGate.releaseApprovalCommand === RELEASE_APPROVED_COMMAND, 'release gate releaseApprovalCommand must point at release-approved');

    return { handoff, releaseGate };
  };

  const buildApprovalTemplate = async (
    { handoff, releaseGate },
    paths,
    existingApproval = null,
    now = () => new Date().toISOString(),
  ) => {
    const { handoffJsonPath, handoffMarkdownPath, releaseGateJsonPath } = paths;

    return {
      contract: APPROVAL_CONTRACT,
      generatedAt: now(),
      status: 'PENDING_OPERATOR_APPROVAL',
      approvedAt: null,
      approvedBy: null,
      sourceArtifacts: sourceArtifactsForPaths(paths),
      handoffGeneratedAt: handoff.generatedAt,
      releaseGateGeneratedAt: releaseGate.generatedAt,
      approvedHandoffHash: await sha256File(handoffJsonPath),
      approvedHandoffMarkdownHash: await sha256File(handoffMarkdownPath),
      approvedReleaseGateHash: await sha256File(releaseGateJsonPath),
      notes: existingApproval?.notes ?? '',
      instructions: [
        '운영자가 handoff 문서와 evidence를 확인한 뒤 status를 APPROVED로 변경합니다.',
        'APPROVED로 변경할 때 approvedBy와 approvedAt을 채웁니다.',
        'handoff/release gate 산출물이 변경되면 hash mismatch로 STALE_APPROVAL 처리됩니다.',
      ],
    };
  };

  const markStaleApproval = async (approval, current, { approvalPath }, now = () => new Date().toISOString()) => {
    const staleApproval = {
      ...approval,
      status: 'STALE_APPROVAL',
      staleDetectedAt: now(),
      staleReason: 'approved handoff/release gate hash does not match current artifacts',
      currentHandoffHash: current.approvedHandoffHash,
      currentHandoffMarkdownHash: current.approvedHandoffMarkdownHash,
      currentReleaseGateHash: current.approvedReleaseGateHash,
    };

    await writeJson(approvalPath, staleApproval);
    throw new Error('STALE_APPROVAL: operator approval hash does not match current handoff/release gate artifacts');
  };

  const validateApproval = async (approval, current, paths, flags, now = () => new Date().toISOString()) => {
    assertApproval(APPROVAL_STATUSES.has(approval.status), `unknown operator approval status: ${approval.status}`);
    assertApproval(approval.contract === APPROVAL_CONTRACT, `operator approval contract must be ${APPROVAL_CONTRACT}`);

    if (approval.status === 'PENDING_OPERATOR_APPROVAL') {
      assertApproval(!flags.requireApproved, 'APPROVED operator approval required; current status is PENDING_OPERATOR_APPROVAL');
      await writeJson(paths.approvalPath, current);
      return current.status;
    }

    if (approval.status === 'STALE_APPROVAL') {
      throw new Error('STALE_APPROVAL: operator approval is stale. Re-run handoff review and approve again.');
    }

    assertApproval(typeof approval.approvedBy === 'string' && approval.approvedBy.trim().length > 0, 'APPROVED approval requires approvedBy');
    assertApproval(!isPlaceholderApprover(approval.approvedBy), 'APPROVED approval requires a real approvedBy, not a placeholder');
    assertApproval(typeof approval.approvedAt === 'string' && Number.isFinite(Date.parse(approval.approvedAt)), 'APPROVED approval requires valid approvedAt');

    if (!approvalMatchesCurrentArtifacts(approval, current)) {
      await markStaleApproval(approval, current, paths, now);
    }

    return approval.status;
  };

  const writeApprovedApproval = async (current, existingApproval, paths, flags, now = () => new Date().toISOString()) => {
    assertApproval(existingApproval, 'operator approval file must exist before --approve; run `npm run stadium:daejeon:operator-approval` first');
    assertApproval(APPROVAL_STATUSES.has(existingApproval.status), `unknown operator approval status: ${existingApproval.status}`);
    assertApproval(typeof flags.approvedByInput === 'string' && flags.approvedByInput.trim().length > 0, '--approve requires --approved-by');
    assertApproval(!isPlaceholderApprover(flags.approvedByInput), '--approved-by must be a real operator identifier, not a placeholder');
    assertApproval(existingApproval.contract === APPROVAL_CONTRACT, `operator approval contract must be ${APPROVAL_CONTRACT}`);
    assertApproval(existingApproval.status !== 'STALE_APPROVAL', 'STALE_APPROVAL must be refreshed before --approve; run `npm run stadium:daejeon:operator-approval` first');

    if (!approvalMatchesCurrentArtifacts(existingApproval, current)) {
      if (existingApproval.status === 'APPROVED') {
        await markStaleApproval(existingApproval, current, paths, now);
      }

      throw new Error('PENDING_OPERATOR_APPROVAL hash does not match current handoff/release gate artifacts; run `npm run stadium:daejeon:operator-approval` again after regenerating handoff');
    }

    const approvedApproval = {
      ...current,
      status: 'APPROVED',
      approvedAt: now(),
      approvedBy: flags.approvedByInput.trim(),
      notes: flags.notesInput ?? existingApproval.notes ?? '',
    };

    await writeJson(paths.approvalPath, approvedApproval);
    return approvedApproval;
  };

  const printApprovalStatus = (approval, current, { approvalPath }, stdout) => {
    if (!approval) {
      stdout(`operator_approval_json:${approvalPath}`);
      stdout('status:MISSING_APPROVAL');
      stdout('hashMatches:false');
      return 'MISSING_APPROVAL';
    }

    assertApproval(APPROVAL_STATUSES.has(approval.status), `unknown operator approval status: ${approval.status}`);
    assertApproval(approval.contract === APPROVAL_CONTRACT, `operator approval contract must be ${APPROVAL_CONTRACT}`);

    const hashMatches = approvalMatchesCurrentArtifacts(approval, current);
    const effectiveStatus = approval.status === 'APPROVED' && !hashMatches
      ? 'STALE_APPROVAL'
      : approval.status;

    stdout(`operator_approval_json:${approvalPath}`);
    stdout(`status:${effectiveStatus}`);
    stdout(`storedStatus:${approval.status}`);
    stdout(`approvedBy:${approval.approvedBy ?? ''}`);
    stdout(`approvedAt:${approval.approvedAt ?? ''}`);
    stdout(`hashMatches:${hashMatches ? 'true' : 'false'}`);
    stdout(`handoffGeneratedAt:${approval.handoffGeneratedAt ?? ''}`);
    stdout(`releaseGateGeneratedAt:${approval.releaseGateGeneratedAt ?? ''}`);
    return effectiveStatus;
  };

  const main = async ({
    args = taskArgs,
    rootDir = defaultFrontendRoot,
    stdout = console.log,
    now = () => new Date().toISOString(),
  } = {}) => {
    const flags = parseCliArgs(args);
    const paths = createPaths(rootDir);

    assertApproval(!(flags.approveRequested && flags.statusRequested), '--approve and --status cannot be used together');

    const sourceArtifacts = await validateSourceArtifacts(paths);
    const existingApproval = await fileExists(paths.approvalPath) ? await readJson(paths.approvalPath) : null;
    const currentApproval = await buildApprovalTemplate(sourceArtifacts, paths, existingApproval, now);

    if (flags.statusRequested) {
      const status = printApprovalStatus(existingApproval, currentApproval, paths, stdout);
      return { approvalPath: paths.approvalPath, status };
    }

    if (flags.approveRequested) {
      const approvedApproval = await writeApprovedApproval(currentApproval, existingApproval, paths, flags, now);
      stdout(`operator_approval_json:${paths.approvalPath}`);
      stdout(`status:${approvedApproval.status}`);
      stdout(`approvedBy:${approvedApproval.approvedBy}`);
      stdout(`approvedAt:${approvedApproval.approvedAt}`);
      return { approvalPath: paths.approvalPath, status: approvedApproval.status };
    }

    if (!existingApproval) {
      assertApproval(!flags.requireApproved, 'APPROVED operator approval required; approval file is missing');
      await writeJson(paths.approvalPath, currentApproval);
      stdout(`operator_approval_json:${paths.approvalPath}`);
      stdout('status:PENDING_OPERATOR_APPROVAL');
      return { approvalPath: paths.approvalPath, status: 'PENDING_OPERATOR_APPROVAL' };
    }

    const status = await validateApproval(existingApproval, currentApproval, paths, flags, now);
    stdout(`operator_approval_json:${paths.approvalPath}`);
    stdout(`status:${status}`);
    stdout(`requireApproved:${flags.requireApproved ? 'true' : 'false'}`);
    return { approvalPath: paths.approvalPath, status };
  };

  if (overrideOptions) {
    return main(overrideOptions);
  }

  return main({ args: taskArgs });
};

export const main = async (options = {}) => runOperatorApproval(options.args ?? [], options);

const runOperatorHandoff = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const releaseGatePath = path.join(reportDir, 'daejeon-seatmap-release-gate.json');
  const handoffJsonPath = path.join(reportDir, 'daejeon-seatmap-operator-handoff.json');
  const handoffMarkdownPath = path.join(reportDir, 'daejeon-seatmap-operator-handoff.md');

  const EXPECTED_BLOCKS = 139;
  const EXPECTED_TRACED = 139;
  const EXPECTED_REVIEW = 0;
  const EXPECTED_P2_ALIASES = 11;
  const EXPECTED_ANCHOR_CROPS = 28;

  const approvalChecklist = [
    'Trace manifest의 totalBlocks=139, officialImageTraced=139, needsOperatorReview=0을 확인했습니다.',
    'labelTopHitFailures=0을 확인했습니다.',
    'coverage report의 missingLabelTopHit=0, missingAnchorWithoutException=0, missingOwnerPointRequired=0을 확인했습니다.',
    'coordinateChangeImpactSummary에서 missingImpact=0이고 좌표 변경 시 재검수할 crop/test 역매핑을 확인했습니다.',
    'anchor visual diff가 baseline과 일치하며 changedCropCount=0임을 확인했습니다.',
    'geometry fingerprint diff가 baseline과 일치하며 changedBlockCount=0임을 확인했습니다.',
    'home-100, first-101-109, third-121-124, first/third 4층 탁자석, outfield-upper-500-509, skybox S01-S31, special crop을 공식 이미지와 비교했습니다.',
    'P2 retired alias 11개가 운영 geometry가 아닌 canonical owner evidence로만 남아 있음을 확인했습니다.',
    '?daejeonDebug=1에서 100B/105/108/115/120/124/200/301/302/401/404/409/413/400/425/426/500/501/508/509를 확인했습니다.',
    '모바일 390px와 데스크톱 1440px QA summary가 passed이며 overflow 0임을 확인했습니다.',
    'visible highlight는 imageGeometry.d, click path는 hitAreaD ?? imageGeometry.d 계약을 유지합니다.',
  ];

  const lockedDecisions = [
    '운영 선택 블록은 139개만 유지합니다.',
    'P2 retired alias 11개는 운영 SVG/finder/업로드 선택지로 복구하지 않습니다.',
    '공식 이미지 natural size와 좌표계는 920x1060으로 고정합니다.',
    '좌표를 추측하거나 자동 rect/interpolation을 OFFICIAL_IMAGE_TRACED로 승격하지 않습니다.',
    'anchor visual baseline은 운영자 검수 없이 갱신하지 않습니다.',
    'geometry fingerprint baseline은 운영자 검수 없이 갱신하지 않습니다.',
    '공식 이미지 변경 또는 좌표 변경 시 release-lock gate와 change-guard를 다시 통과해야 합니다.',
    '외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사는 사용하지 않습니다.',
  ];

  const keyAnchorCropIds = [
    'home-100',
    'first-101-109',
    'first-104-106-detail',
    'first-109-112-sequence',
    'cass-200-detail',
    'third-121-124',
    'third-116-121-detail',
    'first-4f-table-301-413-sequence',
    'third-4f-table-414-330-sequence',
    'outfield-upper-500-509-sequence',
    'skybox-s01-s12-sequence',
    'skybox-s13-s25-sequence',
    'skybox-s26-s31-sequence',
    'special-400-accessible-first',
    'special-425-426-third-accessible',
    'special-accessible-center',
    'special-accessible-outfield-third',
  ];
  const rejectionConditions = [
    'coverage report에서 LOCKED가 139가 아니거나 LABEL_ONLY/PARTIAL이 0이 아닙니다.',
    'anchor crop에서 visible path가 공식 이미지 색상 셀 밖으로 벗어납니다.',
    'trace manifest에서 labelTopHitFailures가 0이 아닙니다.',
    'anchor visual diff에서 changedCropCount 또는 metadataMismatchCount가 0이 아닙니다.',
    'geometry fingerprint diff에서 changedBlockCount, missingBlockCount, extraBlockCount가 0이 아닙니다.',
    'retired P2 alias 11개 중 하나라도 운영 SVG/finder/업로드 선택지로 복구됩니다.',
    '브라우저 QA에서 모바일 390px 또는 데스크톱 1440px overflow가 발생합니다.',
    'visible highlight가 imageGeometry.d가 아니라 hitAreaD를 사용해 실제 블록보다 커 보입니다.',
    '공식 이미지 natural size 또는 SVG viewBox가 920x1060 계약에서 벗어납니다.',
  ];
  const approvalCommands = [
    'npm run qa:stadium:daejeon:release-lock',
    'npm run stadium:daejeon:operator-approval',
    'npm run stadium:daejeon:operator-approval:status',
    'npm run stadium:daejeon:operator-approval:approve -- --approved-by "seatmap-ops-reviewer" --notes "검수 완료"',
    'npm run qa:stadium:daejeon:release-approved',
  ];

  const assertHandoff = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const fileExists = async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  };

  const resolveFromFrontendRoot = (filePath) => path.resolve(frontendRoot, filePath);

  const relativeFromFrontendRoot = (filePath) => path.relative(frontendRoot, filePath).replaceAll(path.sep, '/');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

  const markdownBlockIdSummary = (blockIds) => {
    if (!Array.isArray(blockIds) || blockIds.length === 0) return '-';
    if (blockIds.length <= 12) return blockIds.map((id) => `\`${id}\``).join('<br>');

    return [
      `count ${blockIds.length}`,
      ...blockIds.slice(0, 5).map((id) => `\`${id}\``),
      '...',
      ...blockIds.slice(-3).map((id) => `\`${id}\``),
    ].join('<br>');
  };

  const validateReleaseGate = async () => {
    assertHandoff(await fileExists(releaseGatePath), `missing release gate report: ${releaseGatePath}`);
    const gate = await readJson(releaseGatePath);

    assertHandoff(gate.status === 'passed', 'release gate status must be passed');
    assertHandoff(gate.expected?.totalBlocks === EXPECTED_BLOCKS, `release gate totalBlocks must be ${EXPECTED_BLOCKS}`);
    assertHandoff(gate.expected?.officialImageTraced === EXPECTED_TRACED, `release gate officialImageTraced must be ${EXPECTED_TRACED}`);
    assertHandoff(gate.expected?.needsOperatorReview === EXPECTED_REVIEW, `release gate needsOperatorReview must be ${EXPECTED_REVIEW}`);
    assertHandoff(gate.expected?.p2DeduplicatedAliases === EXPECTED_P2_ALIASES, `release gate p2DeduplicatedAliases must be ${EXPECTED_P2_ALIASES}`);
    assertHandoff(gate.expected?.anchorCrops === EXPECTED_ANCHOR_CROPS, `release gate anchorCrops must be ${EXPECTED_ANCHOR_CROPS}`);
    assertHandoff(gate.coordinateChangeImpactSummary?.contract === 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1', 'release gate coordinateChangeImpactSummary contract is missing');
    assertHandoff(gate.coordinateChangeImpactSummary?.counts?.missingImpact === 0, 'release gate coordinateChangeImpactSummary missingImpact must be 0');
    assertHandoff(gate.geometryDiffSummary?.contract === 'DAEJEON_GEOMETRY_BASELINE_V1', 'release gate geometryDiffSummary contract is missing');
    assertHandoff(gate.geometryDiffSummary?.counts?.changedBlockCount === 0, 'release gate geometryDiffSummary changedBlockCount must be 0');
    assertHandoff(gate.geometryDiffSummary?.counts?.missingBlockCount === 0, 'release gate geometryDiffSummary missingBlockCount must be 0');
    assertHandoff(gate.geometryDiffSummary?.counts?.extraBlockCount === 0, 'release gate geometryDiffSummary extraBlockCount must be 0');

    const failedCommands = (gate.commands ?? []).filter((command) => command.status !== 'passed');
    assertHandoff(failedCommands.length === 0, `release gate has failed commands: ${failedCommands.map((command) => command.label).join(', ')}`);

    return gate;
  };

  const validateArtifacts = async (gate) => {
    const artifacts = gate.artifacts ?? {};
    const requiredArtifactKeys = [
      'traceManifest',
      'traceSummary',
      'coverageReport',
      'coverageSummary',
      'p2Evidence',
      'p2EvidenceSummary',
      'anchorCrops',
      'anchorCropsSummary',
      'visualDiff',
      'visualDiffSummary',
      'geometryDiff',
      'geometryDiffSummary',
      'browserQa',
      'browserQaSummary',
      'mobileScreenshot',
      'desktopScreenshot',
    ];

    for (const key of requiredArtifactKeys) {
      assertHandoff(typeof artifacts[key] === 'string', `release gate artifact is missing: ${key}`);
      assertHandoff(await fileExists(resolveFromFrontendRoot(artifacts[key])), `release gate artifact file is missing: ${artifacts[key]}`);
    }

    const manifest = await readJson(resolveFromFrontendRoot(artifacts.traceManifest));
    assertHandoff(manifest.summary?.totalBlocks === EXPECTED_BLOCKS, `manifest totalBlocks must be ${EXPECTED_BLOCKS}`);
    assertHandoff(manifest.summary?.officialImageTraced === EXPECTED_TRACED, `manifest officialImageTraced must be ${EXPECTED_TRACED}`);
    assertHandoff(manifest.summary?.needsOperatorReview === EXPECTED_REVIEW, `manifest needsOperatorReview must be ${EXPECTED_REVIEW}`);
    assertHandoff((manifest.traceReviewQueue ?? []).length === 0, 'manifest traceReviewQueue must be empty');
    assertHandoff(manifest.precisionAudit?.labelTopHitFailureCount === 0, 'manifest labelTopHitFailureCount must be 0');
    assertHandoff((manifest.deduplicatedAliases ?? []).length === EXPECTED_P2_ALIASES, `manifest deduplicatedAliases must be ${EXPECTED_P2_ALIASES}`);

    const p2Evidence = await readJson(resolveFromFrontendRoot(artifacts.p2Evidence));
    assertHandoff((p2Evidence.outputs ?? []).length === EXPECTED_P2_ALIASES, `P2 evidence outputs must be ${EXPECTED_P2_ALIASES}`);

    const coverageReport = await readJson(resolveFromFrontendRoot(artifacts.coverageReport));
    assertHandoff(coverageReport.summary?.totalBlocks === EXPECTED_BLOCKS, `coverage totalBlocks must be ${EXPECTED_BLOCKS}`);
    assertHandoff(coverageReport.summary?.lockedCount === EXPECTED_BLOCKS, `coverage lockedCount must be ${EXPECTED_BLOCKS}`);
    assertHandoff(coverageReport.summary?.labelOnlyCount === 0, 'coverage labelOnlyCount must be 0');
    assertHandoff(coverageReport.summary?.partialCount === 0, 'coverage partialCount must be 0');
    assertHandoff(coverageReport.summary?.missingLabelTopHitCount === 0, 'coverage missingLabelTopHitCount must be 0');
    assertHandoff(coverageReport.summary?.missingAnchorWithoutExceptionCount === 0, 'coverage missingAnchorWithoutExceptionCount must be 0');
    assertHandoff(coverageReport.summary?.missingOwnerPointRequiredCount === 0, 'coverage missingOwnerPointRequiredCount must be 0');

    const anchorCrops = await readJson(resolveFromFrontendRoot(artifacts.anchorCrops));
    assertHandoff((anchorCrops.crops ?? []).length === EXPECTED_ANCHOR_CROPS, `anchor crops must be ${EXPECTED_ANCHOR_CROPS}`);
    const missingAnchorCropReviewMetadata = (anchorCrops.crops ?? []).filter((crop) => (
      crop.reviewContractVersion !== 'DAEJEON_ANCHOR_CROP_REVIEW_V2'
      || !Array.isArray(crop.passCriteria)
      || crop.passCriteria.length === 0
      || !Array.isArray(crop.rejectCriteria)
      || crop.rejectCriteria.length === 0
      || !Array.isArray(crop.representativeBlocks)
      || crop.representativeBlocks.length === 0
      || !['P0', 'P1', 'P2'].includes(crop.reviewPriority)
      || typeof crop.reviewMode !== 'string'
      || !Array.isArray(crop.riskTags)
      || crop.riskTags.length === 0
      || (crop.reviewMode === 'MANUAL_CROP_ONLY' && typeof crop.manualOnlyReason !== 'string')
      || (crop.reviewPriority === 'P0' && (!Array.isArray(crop.regressionTestIds) || crop.regressionTestIds.length === 0))
    ));
    assertHandoff(
      missingAnchorCropReviewMetadata.length === 0,
      `anchor crops missing operator review metadata: ${missingAnchorCropReviewMetadata.map((crop) => crop.id).join(', ')}`,
    );

    const visualDiff = await readJson(resolveFromFrontendRoot(artifacts.visualDiff));
    assertHandoff(visualDiff.contract === 'DAEJEON_ANCHOR_VISUAL_BASELINE_V1', 'visual diff contract is missing');
    assertHandoff(visualDiff.status === 'passed', 'visual diff status must be passed');
    assertHandoff(visualDiff.summary?.baselineCropCount === EXPECTED_ANCHOR_CROPS, `visual diff baselineCropCount must be ${EXPECTED_ANCHOR_CROPS}`);
    assertHandoff(visualDiff.summary?.currentCropCount === EXPECTED_ANCHOR_CROPS, `visual diff currentCropCount must be ${EXPECTED_ANCHOR_CROPS}`);
    assertHandoff(visualDiff.summary?.changedCropCount === 0, 'visual diff changedCropCount must be 0');
    assertHandoff(visualDiff.summary?.metadataMismatchCount === 0, 'visual diff metadataMismatchCount must be 0');

    const geometryDiff = await readJson(resolveFromFrontendRoot(artifacts.geometryDiff));
    assertHandoff(geometryDiff.contract === 'DAEJEON_GEOMETRY_BASELINE_V1', 'geometry diff contract is missing');
    assertHandoff(geometryDiff.status === 'passed', 'geometry diff status must be passed');
    assertHandoff(geometryDiff.summary?.baselineBlockCount === EXPECTED_BLOCKS, `geometry diff baselineBlockCount must be ${EXPECTED_BLOCKS}`);
    assertHandoff(geometryDiff.summary?.currentBlockCount === EXPECTED_BLOCKS, `geometry diff currentBlockCount must be ${EXPECTED_BLOCKS}`);
    assertHandoff(geometryDiff.summary?.changedBlockCount === 0, 'geometry diff changedBlockCount must be 0');
    assertHandoff(geometryDiff.summary?.missingBlockCount === 0, 'geometry diff missingBlockCount must be 0');
    assertHandoff(geometryDiff.summary?.extraBlockCount === 0, 'geometry diff extraBlockCount must be 0');

    const browserQa = await readJson(resolveFromFrontendRoot(artifacts.browserQa));
    assertHandoff(browserQa.status === 'passed', 'browser QA status must be passed');
    assertHandoff(browserQa.entryCount === 2, 'browser QA must include mobile and desktop scenarios');
    assertHandoff(browserQa.overflowFailureCount === 0, 'browser QA overflowFailureCount must be 0');
    assertHandoff(browserQa.actionableFailedRequestCount === 0, 'browser QA actionableFailedRequestCount must be 0');
    assertHandoff(browserQa.actionableConsoleErrorCount === 0, 'browser QA actionableConsoleErrorCount must be 0');

    return { manifest, coverageReport, p2Evidence, anchorCrops, visualDiff, geometryDiff, browserQa };
  };

  const buildHandoff = ({ gate, manifest, coverageReport, p2Evidence, anchorCrops, visualDiff, geometryDiff, browserQa }) => {
    const artifacts = gate.artifacts;
    const keyAnchorCrops = (anchorCrops.crops ?? []).filter((crop) => keyAnchorCropIds.includes(crop.id));
    const anchorCropRegressionStatus = {
      p0RegressionTestIds: gate.anchorCropSummary?.p0RegressionTestIds ?? [],
      p1RegressionTestIds: gate.anchorCropSummary?.p1RegressionTestIds ?? [],
      p1RegressionWarningCropIds: gate.anchorCropSummary?.p1RegressionWarningCropIds ?? [],
      p2RegressionTestIds: gate.anchorCropSummary?.p2RegressionTestIds ?? [],
      p2ManualOnlyCropIds: gate.anchorCropSummary?.p2ManualOnlyCropIds ?? [],
      p2RegressionWarningCropIds: gate.anchorCropSummary?.p2RegressionWarningCropIds ?? [],
    };
    const coordinateChangeImpactSummary = {
      contract: gate.coordinateChangeImpactSummary?.contract ?? coverageReport.coordinateChangeImpact?.contract ?? null,
      counts: gate.coordinateChangeImpactSummary?.counts ?? coverageReport.coordinateChangeImpact?.counts ?? {},
      p0BlockIds: gate.coordinateChangeImpactSummary?.p0BlockIds ?? coverageReport.coordinateChangeImpact?.p0BlockIds ?? [],
      p1BlockIds: gate.coordinateChangeImpactSummary?.p1BlockIds ?? coverageReport.coordinateChangeImpact?.p1BlockIds ?? [],
      p2AutoBlockIds: gate.coordinateChangeImpactSummary?.p2AutoBlockIds ?? coverageReport.coordinateChangeImpact?.p2AutoBlockIds ?? [],
      p2ManualOnlyBlockIds: gate.coordinateChangeImpactSummary?.p2ManualOnlyBlockIds ?? coverageReport.coordinateChangeImpact?.p2ManualOnlyBlockIds ?? [],
      tracedWithoutRegressionBlockIds: gate.coordinateChangeImpactSummary?.tracedWithoutRegressionBlockIds ?? coverageReport.coordinateChangeImpact?.tracedWithoutRegressionBlockIds ?? [],
      missingImpactBlockIds: gate.coordinateChangeImpactSummary?.missingImpactBlockIds ?? coverageReport.coordinateChangeImpact?.missingImpactBlockIds ?? [],
    };
    const browserScenarios = (browserQa.scenarios ?? []).map((scenario) => ({
      key: scenario.key,
      label: scenario.label,
      status: scenario.status,
      overflowX: Boolean(scenario.metrics?.overflowX),
      screenshotPath: scenario.screenshotPath,
    }));

    return {
      generatedAt: new Date().toISOString(),
      status: 'READY_FOR_OPERATOR_REVIEW',
      releaseGate: {
        generatedAt: gate.generatedAt,
        status: gate.status,
        reportJson: relativeFromFrontendRoot(releaseGatePath),
        reportMarkdown: 'reports/stadium/daejeon-seatmap-release-gate.md',
      },
      sourceAsset: {
        imagePath: manifest.asset.imagePath,
        imageWidth: manifest.asset.imageWidth,
        imageHeight: manifest.asset.imageHeight,
        assetSha256: manifest.asset.assetSha256,
        sourceLabel: manifest.asset.sourceLabel,
        sourceUrl: manifest.asset.sourceUrl,
      },
      lockedStatus: {
        totalBlocks: manifest.summary.totalBlocks,
        officialImageTraced: manifest.summary.officialImageTraced,
        needsOperatorReview: manifest.summary.needsOperatorReview,
        labelTopHitFailures: manifest.precisionAudit.labelTopHitFailureCount,
        coverageLocked: coverageReport.summary.lockedCount,
        coverageLabelOnly: coverageReport.summary.labelOnlyCount,
        coverageMissingAnchorExceptions: coverageReport.summary.anchorExceptionCount,
        p2DeduplicatedAliases: manifest.deduplicatedAliases.length,
        p2EvidenceOutputs: p2Evidence.outputs.length,
        anchorCrops: anchorCrops.crops.length,
        visualDiffStatus: visualDiff.status,
        visualDiffChangedCrops: visualDiff.summary.changedCropCount,
        visualDiffMetadataMismatches: visualDiff.summary.metadataMismatchCount,
        geometryDiffStatus: geometryDiff.status,
        geometryDiffChangedBlocks: geometryDiff.summary.changedBlockCount,
        geometryDiffMissingBlocks: geometryDiff.summary.missingBlockCount,
        geometryDiffExtraBlocks: geometryDiff.summary.extraBlockCount,
        browserQaStatus: browserQa.status,
        browserQaOverflowFailures: browserQa.overflowFailureCount,
      },
      artifacts: {
        traceManifest: artifacts.traceManifest,
        traceSummary: artifacts.traceSummary,
        coverageReport: artifacts.coverageReport,
        coverageSummary: artifacts.coverageSummary,
        p2Evidence: artifacts.p2Evidence,
        p2EvidenceSummary: artifacts.p2EvidenceSummary,
        anchorCrops: artifacts.anchorCrops,
        anchorCropsSummary: artifacts.anchorCropsSummary,
        visualDiff: artifacts.visualDiff,
        visualDiffSummary: artifacts.visualDiffSummary,
        geometryDiff: artifacts.geometryDiff,
        geometryDiffSummary: artifacts.geometryDiffSummary,
        browserQa: artifacts.browserQa,
        browserQaSummary: artifacts.browserQaSummary,
        mobileScreenshot: artifacts.mobileScreenshot,
        desktopScreenshot: artifacts.desktopScreenshot,
      },
      keyAnchorCrops: keyAnchorCrops.map((crop) => ({
        id: crop.id,
        group: crop.group ?? 'other',
        purpose: crop.purpose ?? 'anchor crop 검수',
        reviewFocus: crop.reviewFocus ?? '공식 이미지와 overlay path 정렬 확인',
        reviewPriority: crop.reviewPriority ?? 'P2',
        reviewMode: crop.reviewMode ?? 'VISUAL_CROP_REVIEW',
        manualOnlyReason: crop.manualOnlyReason ?? null,
        riskTags: crop.riskTags ?? [],
        regressionTestIds: crop.regressionTestIds ?? [],
        passCriteria: crop.passCriteria ?? [],
        rejectCriteria: crop.rejectCriteria ?? [],
        representativeBlocks: crop.representativeBlocks ?? crop.blocks,
        outputPath: crop.outputPath,
        bounds: crop.crop,
        blocks: crop.blocks,
      })),
      anchorCropRegressionStatus,
      visualDiffSummary: {
        contract: visualDiff.contract,
        status: visualDiff.status,
        baseline: visualDiff.baseline,
        counts: visualDiff.summary,
        changedCropIds: (visualDiff.hashChanged ?? []).map((item) => item.id),
        p2ManualOnlyChangedCropIds: visualDiff.p2ManualOnlyChanged ?? [],
      },
      geometryDiffSummary: {
        contract: geometryDiff.contract,
        status: geometryDiff.status,
        baseline: geometryDiff.baseline,
        counts: geometryDiff.summary,
        changedBlockIds: (geometryDiff.changedBlocks ?? []).map((block) => block.id),
        changedFieldsByBlock: Object.fromEntries((geometryDiff.changedBlocks ?? []).map((block) => [block.id, block.changedFields ?? []])),
      },
      coordinateChangeImpactSummary,
      p2RetiredAliases: manifest.deduplicatedAliases.map((alias) => ({
        retiredBlockId: alias.retiredBlockId,
        blockCode: alias.blockCode,
        retiredParentId: alias.retiredParentId,
        officialSectionName: alias.officialSectionName,
        canonicalBlockId: alias.canonicalBlockId,
        evidenceCropPath: alias.evidenceCropPath,
        reason: alias.reason,
      })),
      browserScenarios,
      approvalChecklist,
      rejectionConditions,
      approvalCommands,
      lockedDecisions,
    };
  };

  const writeHandoff = async (handoff) => {
    await fs.writeFile(handoffJsonPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');

    const markdown = [
      '# 대전 한화생명볼파크 좌석도 운영자 handoff',
      '',
      `- generated: ${handoff.generatedAt}`,
      `- status: ${handoff.status}`,
      `- release gate: ${handoff.releaseGate.status} (${handoff.releaseGate.generatedAt})`,
      `- official asset: \`${handoff.sourceAsset.imagePath}\` (${handoff.sourceAsset.imageWidth}x${handoff.sourceAsset.imageHeight})`,
      `- assetSha256: \`${handoff.sourceAsset.assetSha256}\``,
      `- source: ${handoff.sourceAsset.sourceLabel}`,
      '',
      '## Locked Status',
      '',
      markdownTable(
        ['metric', 'value'],
        Object.entries(handoff.lockedStatus).map(([key, value]) => [key, String(value)]),
      ),
      '',
      '## Artifacts',
      '',
      markdownTable(
        ['artifact', 'path'],
        Object.entries(handoff.artifacts).map(([key, value]) => [key, `\`${value}\``]),
      ),
      '',
      '## Anchor Visual Diff',
      '',
      `- contract: \`${handoff.visualDiffSummary.contract}\``,
      `- status: ${handoff.visualDiffSummary.status}`,
      `- baseline: \`${handoff.visualDiffSummary.baseline?.path ?? ''}\` (${handoff.visualDiffSummary.baseline?.generatedAt ?? 'unknown'})`,
      '',
      markdownTable(
        ['metric', 'value'],
        Object.entries(handoff.visualDiffSummary.counts).map(([key, value]) => [key, String(value)]),
      ),
      '',
      `- changed crop ids: ${handoff.visualDiffSummary.changedCropIds.length ? handoff.visualDiffSummary.changedCropIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
      `- P2 manual-only changed crop ids: ${handoff.visualDiffSummary.p2ManualOnlyChangedCropIds.length ? handoff.visualDiffSummary.p2ManualOnlyChangedCropIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
      '',
      '## Geometry Fingerprint Diff',
      '',
      `- contract: \`${handoff.geometryDiffSummary.contract}\``,
      `- status: ${handoff.geometryDiffSummary.status}`,
      `- baseline: \`${handoff.geometryDiffSummary.baseline?.path ?? ''}\` (${handoff.geometryDiffSummary.baseline?.generatedAt ?? 'unknown'})`,
      '',
      markdownTable(
        ['metric', 'value'],
        Object.entries(handoff.geometryDiffSummary.counts).map(([key, value]) => [key, String(value)]),
      ),
      '',
      `- changed block ids: ${handoff.geometryDiffSummary.changedBlockIds.length ? handoff.geometryDiffSummary.changedBlockIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
      '',
      '## Key Anchor Crops',
      '',
      markdownTable(
        ['priority', 'review mode', 'group', 'crop', 'risk tags', 'regression tests', 'purpose', 'review focus', 'pass criteria', 'reject criteria', 'representative blocks', 'bounds', 'output'],
        handoff.keyAnchorCrops.map((crop) => [
          crop.reviewPriority,
          crop.manualOnlyReason ? `${crop.reviewMode}<br>${crop.manualOnlyReason}` : crop.reviewMode,
          crop.group,
          crop.id,
          crop.riskTags.map((tag) => `\`${tag}\``).join(' '),
          crop.regressionTestIds.map((testId) => `\`${testId}\``).join('<br>') || 'n/a',
          crop.purpose,
          crop.reviewFocus,
          crop.passCriteria.map((item) => `- ${item}`).join('<br>'),
          crop.rejectCriteria.map((item) => `- ${item}`).join('<br>'),
          crop.representativeBlocks.map((block) => `\`${block}\``).join('<br>'),
          `x=${crop.bounds.x}, y=${crop.bounds.y}, ${crop.bounds.width}x${crop.bounds.height}`,
          `\`${crop.outputPath}\``,
        ]),
      ),
      '',
      '## Anchor Crop Regression Coverage',
      '',
      markdownTable(
        ['priority', 'regression tests', 'warnings'],
        [
          [
            'P0',
            handoff.anchorCropRegressionStatus.p0RegressionTestIds.map((testId) => `\`${testId}\``).join('<br>') || 'n/a',
            'hard fail if missing',
          ],
          [
            'P1',
            handoff.anchorCropRegressionStatus.p1RegressionTestIds.map((testId) => `\`${testId}\``).join('<br>') || 'n/a',
            handoff.anchorCropRegressionStatus.p1RegressionWarningCropIds.length
              ? handoff.anchorCropRegressionStatus.p1RegressionWarningCropIds.map((id) => `\`${id}\``).join('<br>')
              : 'none',
          ],
          [
            'P2',
            [
              ...handoff.anchorCropRegressionStatus.p2RegressionTestIds.map((testId) => `\`${testId}\``),
              ...handoff.anchorCropRegressionStatus.p2ManualOnlyCropIds.map((id) => `manual-only: \`${id}\``),
            ].join('<br>') || 'n/a',
            handoff.anchorCropRegressionStatus.p2RegressionWarningCropIds.length
              ? handoff.anchorCropRegressionStatus.p2RegressionWarningCropIds.map((id) => `\`${id}\``).join('<br>')
              : 'none',
          ],
        ],
      ),
      '',
      '## Coordinate Change Impact',
      '',
      `- contract: \`${handoff.coordinateChangeImpactSummary.contract}\``,
      '- 좌표를 바꾼 블록은 아래 우선순위와 연결된 anchor crop/regression test를 같이 재검수합니다.',
      '',
      markdownTable(
        ['impact group', 'count', 'block ids'],
        [
          ['P0 crop coverage', String(handoff.coordinateChangeImpactSummary.counts.p0 ?? 0), markdownBlockIdSummary(handoff.coordinateChangeImpactSummary.p0BlockIds)],
          ['P1 crop coverage', String(handoff.coordinateChangeImpactSummary.counts.p1 ?? 0), markdownBlockIdSummary(handoff.coordinateChangeImpactSummary.p1BlockIds)],
          ['P2 auto regression coverage', String(handoff.coordinateChangeImpactSummary.counts.p2Auto ?? 0), markdownBlockIdSummary(handoff.coordinateChangeImpactSummary.p2AutoBlockIds)],
          ['P2 manual crop-only coverage', String(handoff.coordinateChangeImpactSummary.counts.p2ManualOnly ?? 0), markdownBlockIdSummary(handoff.coordinateChangeImpactSummary.p2ManualOnlyBlockIds)],
          ['traced without regression', String(handoff.coordinateChangeImpactSummary.counts.tracedWithoutRegression ?? 0), markdownBlockIdSummary(handoff.coordinateChangeImpactSummary.tracedWithoutRegressionBlockIds)],
          ['missing impact mapping', String(handoff.coordinateChangeImpactSummary.counts.missingImpact ?? 0), markdownBlockIdSummary(handoff.coordinateChangeImpactSummary.missingImpactBlockIds)],
        ],
      ),
      '',
      '## Anchor Crop Review Criteria',
      '',
      '각 anchor crop은 `reviewPriority`, `reviewMode`, `riskTags`, `regressionTestIds`, `passCriteria`, `rejectCriteria`, `representativeBlocks`를 JSON/Markdown에 함께 기록합니다. 운영자는 P0 -> P1 -> P2 순서로 확인하고, P0 crop은 자동 회귀 테스트가 존재해야 하며, P1 crop은 release gate warning 없이 회귀 테스트 ID가 연결되어야 합니다. P1/P2 자동 후보 crop은 release gate warning 없이 회귀 테스트 ID가 연결되어야 합니다. P2 skybox는 `MANUAL_CROP_ONLY` 사유를 확인합니다. pass criteria를 모두 만족하지 못하거나 reject criteria가 하나라도 보이면 승인하지 않습니다.',
      '',
      '## P2 Retired Alias Policy',
      '',
      '아래 retired alias는 운영 geometry가 아니며 canonical owner evidence로만 유지합니다.',
      '',
      markdownTable(
        ['retired block', 'canonical owner', 'evidence', 'reason'],
        handoff.p2RetiredAliases.map((alias) => [
          `\`${alias.retiredBlockId}\``,
          `\`${alias.canonicalBlockId}\``,
          alias.evidenceCropPath,
          alias.reason,
        ]),
      ),
      '',
      '## Browser QA',
      '',
      markdownTable(
        ['scenario', 'status', 'overflow', 'screenshot'],
        handoff.browserScenarios.map((scenario) => [
          scenario.label ?? scenario.key,
          scenario.status,
          String(scenario.overflowX),
          `\`${scenario.screenshotPath}\``,
        ]),
      ),
      '',
      '## Operator Review Steps',
      '',
      '1. `reports/stadium/daejeon-seatmap-trace-review.md`에서 139/139/0 상태를 확인합니다.',
      '2. `reports/stadium/daejeon-seatmap-coverage-report.md`에서 PARTIAL=0, missing count=0 상태를 확인합니다.',
      '3. `reports/stadium/daejeon-seatmap-geometry-diff.md`에서 changedBlockCount=0 상태를 확인합니다.',
      '4. `../output/playwright/daejeon-anchor-review/daejeon-anchor-review-crops.md`의 key anchor crop을 공식 이미지와 비교합니다.',
      '5. `reports/stadium/daejeon-seatmap-p2-evidence-crops.md`에서 retired P2 alias가 canonical owner evidence로만 남았는지 확인합니다.',
      '6. 브라우저에서 `/stadium?daejeonDebug=1`로 접속해 대표 블록을 육안 확인합니다.',
      '7. 모바일 390px, 데스크톱 1440px QA screenshot을 확인합니다.',
      '',
      '## Approval Checklist',
      '',
      ...handoff.approvalChecklist.map((item) => `- [ ] ${item}`),
      '',
      '## Reject If',
      '',
      ...handoff.rejectionConditions.map((item) => `- ${item}`),
      '',
      '## Operator Approval',
      '',
      '승인 순서는 아래 명령으로 고정합니다.',
      '',
      ...handoff.approvalCommands.map((command, index) => `${index + 1}. \`${command}\``),
      '',
      'approval JSON의 `approvedHandoffHash`, `approvedHandoffMarkdownHash`, `approvedReleaseGateHash`가 현재 산출물과 다르면 `STALE_APPROVAL`로 실패합니다.',
      '`qa:stadium:daejeon:release-approved`는 내부에서 `--require-approved` 검증을 실행합니다.',
      '좌표, 공식 이미지, evidence, handoff가 변경되면 release-lock gate부터 다시 통과한 뒤 재승인합니다.',
      '',
      '## Locked Decisions',
      '',
      ...handoff.lockedDecisions.map((item) => `- ${item}`),
      '',
    ].join('\n');

    await fs.writeFile(handoffMarkdownPath, markdown, 'utf8');
  };

  try {
    const gate = await validateReleaseGate();
    const artifacts = await validateArtifacts(gate);
    const handoff = buildHandoff({ gate, ...artifacts });

    await writeHandoff(handoff);

    console.log(`operator_handoff_json:${handoffJsonPath}`);
    console.log(`operator_handoff_markdown:${handoffMarkdownPath}`);
    console.log(`status:ok total=${handoff.lockedStatus.totalBlocks} review=${handoff.lockedStatus.needsOperatorReview} labelTopHitFailures=${handoff.lockedStatus.labelTopHitFailures}`);
  } catch (error) {
    console.error('status:failed');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
};

const runPixelComponents = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const outputRoot = path.resolve(frontendRoot, '..', 'output/playwright');
  const imagePath = path.resolve(
    frontendRoot,
    'src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.webp',
  );
  const reportPath = path.join(outputRoot, 'daejeon-seatmap-pixel-components.json');

  const colorRanges = [
    {
      name: 'first_infield_blue',
      minArea: 240,
      test: (r, g, b) => r >= 35 && r <= 115 && g >= 50 && g <= 120 && b >= 60 && b <= 145,
    },
    {
      name: 'third_infield_magenta',
      minArea: 260,
      test: (r, g, b) => r >= 115 && r <= 180 && g >= 20 && g <= 90 && b >= 80 && b <= 145,
    },
    {
      name: 'outfield_lawn_green',
      minArea: 800,
      test: (r, g, b) => r >= 55 && r <= 135 && g >= 90 && g <= 160 && b >= 45 && b <= 110,
    },
    {
      name: 'seat_olive',
      minArea: 240,
      test: (r, g, b) => r >= 95 && r <= 160 && g >= 105 && g <= 170 && b >= 45 && b <= 115,
    },
    {
      name: 'yellow_200',
      minArea: 300,
      test: (r, g, b) => r >= 190 && r <= 255 && g >= 115 && g <= 190 && b >= 25 && b <= 95,
    },
    {
      name: 'orange_400_or_table',
      minArea: 300,
      test: (r, g, b) => r >= 185 && r <= 255 && g >= 45 && g <= 160 && b >= 15 && b <= 95,
    },
    {
      name: 'brown_509',
      minArea: 300,
      test: (r, g, b) => r >= 110 && r <= 175 && g >= 55 && g <= 115 && b >= 35 && b <= 90,
    },
    {
      name: 'red_outfield_table',
      minArea: 240,
      test: (r, g, b) => r >= 125 && r <= 210 && g >= 25 && g <= 85 && b >= 30 && b <= 90,
    },
  ];

  async function decodeRgbaImage(filePath) {
    const { data, info } = await sharp(filePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (!Number.isFinite(info.width) || !Number.isFinite(info.height) || info.channels !== 4) {
      throw new Error(`Unsupported image decode result: ${JSON.stringify(info)}`);
    }

    return { width: info.width, height: info.height, data };
  }

  function connectedComponents(mask, width, height, minArea) {
    const seen = new Uint8Array(width * height);
    const components = [];
    const queue = [];

    for (let start = 0; start < mask.length; start += 1) {
      if (!mask[start] || seen[start]) continue;

      let area = 0;
      let sumX = 0;
      let sumY = 0;
      let minX = width;
      let maxX = 0;
      let minY = height;
      let maxY = 0;
      const boundaryPoints = [];
      queue.length = 0;
      queue.push(start);
      seen[start] = 1;

      while (queue.length > 0) {
        const current = queue.pop();
        const x = current % width;
        const y = Math.floor(current / width);
        area += 1;
        sumX += x;
        sumY += y;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);

        const neighbors = [
          x > 0 ? current - 1 : -1,
          x < width - 1 ? current + 1 : -1,
          y > 0 ? current - width : -1,
          y < height - 1 ? current + width : -1,
        ];
        if (neighbors.some((next) => next < 0 || !mask[next])) {
          boundaryPoints.push([x, y]);
        }
        for (const next of neighbors) {
          if (next < 0 || seen[next] || !mask[next]) continue;
          seen[next] = 1;
          queue.push(next);
        }
      }

      if (area >= minArea) {
        components.push({
          area,
          bbox: { minX, minY, maxX, maxY },
          center: {
            x: Number((sumX / area).toFixed(1)),
            y: Number((sumY / area).toFixed(1)),
          },
          hull: convexHull(boundaryPoints),
        });
      }
    }

    components.sort((a, b) => b.area - a.area);
    return components;
  }

  function convexHull(points) {
    const sorted = [...new Map(points.map((point) => [`${point[0]},${point[1]}`, point])).values()]
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
  }

  const imageData = await decodeRgbaImage(imagePath);

  const { width, height } = imageData;
  const pixels = imageData.data;
  const report = {
    image: { width, height, source: imagePath },
    ranges: {},
  };

  for (const range of colorRanges) {
    const mask = new Uint8Array(width * height);
    for (let index = 0; index < width * height; index += 1) {
      const offset = index * 4;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      const a = pixels[offset + 3];
      if (a > 200 && range.test(r, g, b)) {
        mask[index] = 1;
      }
    }
    report.ranges[range.name] = connectedComponents(mask, width, height, range.minArea).slice(0, 80);
  }

  await fs.mkdir(outputRoot, { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`pixel_components:${reportPath}`);
};

const runPixelAlignAudit = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");
  const { DAEJEON_BLOCKS, DAEJEON_SEATMAP_IMAGE } = await import("../src/data/daejeonSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const imagePath = path.resolve(frontendRoot, DAEJEON_SEATMAP_IMAGE.imagePath);
  const jsonPath = path.join(reportDir, 'daejeon-seatmap-pixel-align-audit.json');
  const markdownPath = path.join(reportDir, 'daejeon-seatmap-pixel-align-audit.md');
  const contract = 'DAEJEON_PIXEL_ALIGN_AUDIT_V1';

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };
  const csvArg = (name) => String(argValue(name, ''))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const numericRange = (start, end) => Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
  const targetIds = new Set([
    ...numericRange(109, 112).map((code) => `first-infield-a-109-112-201-212__${code}`),
    ...numericRange(201, 212).map((code) => `first-infield-a-109-112-201-212__${code}`),
    ...numericRange(113, 120).map((code) => `third-infield-a-113-120-213-225__${code}`),
    ...numericRange(213, 225).map((code) => `third-infield-a-113-120-213-225__${code}`),
    ...numericRange(1, 37).map((code) => `skybox-s01-s37__s${String(code).padStart(2, '0')}`),
    'splash-jacuzzi-425__425',
    'first-table-4f-301-413__301',
    'first-table-4f-301-413__302',
    ...numericRange(401, 413).map((code) => `first-table-4f-301-413__${code}`),
    ...numericRange(414, 423).map((code) => `third-table-4f-414-330__${code}`),
    ...numericRange(326, 330).map((code) => `third-table-4f-414-330__${code}`),
  ]);

  const pathToPoints = (pathData) => {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  };
  const pointInsidePolygon = (points, x, y) => {
    let inside = false;
    for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
      const [xi, yi] = points[index];
      const [xj, yj] = points[previous];
      if (((yi > y) !== (yj > y)) && x < (((xj - xi) * (y - yi)) / (yj - yi)) + xi) {
        inside = !inside;
      }
    }
    return inside;
  };
  const boundsForPoints = (points) => ({
    minX: Math.floor(Math.min(...points.map((point) => point[0]))),
    minY: Math.floor(Math.min(...points.map((point) => point[1]))),
    maxX: Math.ceil(Math.max(...points.map((point) => point[0]))),
    maxY: Math.ceil(Math.max(...points.map((point) => point[1]))),
  });
  const classifyPixel = (r, g, b, a) => {
    if (a < 200) return 'transparent';
    if (r > 210 && g > 210 && b > 210) return 'light';
    if (r < 60 && g < 60 && b < 60) return 'dark';
    if (r >= 180 && g >= 45 && g <= 160 && b <= 110) return 'orange';
    if (r >= 80 && r <= 170 && g >= 90 && g <= 180 && b >= 25 && b <= 130) return 'olive';
    if (r >= 20 && r <= 95 && g >= 40 && g <= 125 && b >= 80 && b <= 190) return 'blue';
    if (r >= 100 && r <= 195 && g <= 105 && b >= 60 && b <= 170) return 'magenta';
    if (r >= 130 && g <= 100 && b <= 120) return 'red';
    return 'other';
  };
  const ratio = (counts, key, total) => Number(((counts[key] ?? 0) / Math.max(total, 1)).toFixed(4));
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  if (info.width !== DAEJEON_SEATMAP_IMAGE.imageWidth || info.height !== DAEJEON_SEATMAP_IMAGE.imageHeight) {
    throw new Error(`Daejeon image size mismatch: actual=${info.width}x${info.height} data=${DAEJEON_SEATMAP_IMAGE.imageWidth}x${DAEJEON_SEATMAP_IMAGE.imageHeight}`);
  }

  const requestedIds = new Set(csvArg('--blocks'));
  const requestedCodes = new Set(csvArg('--codes').map((code) => code.toUpperCase()));
  const blocks = DAEJEON_BLOCKS
    .filter((block) => (
      requestedIds.size > 0
        ? requestedIds.has(block.id)
        : requestedCodes.size > 0
          ? requestedCodes.has(String(block.blockCode).toUpperCase())
          : targetIds.has(block.id)
    ))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (blocks.length === 0) {
    throw new Error('No Daejeon blocks matched pixel-align audit request');
  }

  const rows = blocks.map((block) => {
    const points = pathToPoints(block.imageGeometry.d);
    const bounds = boundsForPoints(points);
    const counts = {};
    let total = 0;

    for (let y = Math.max(bounds.minY, 0); y <= Math.min(bounds.maxY, info.height - 1); y += 1) {
      for (let x = Math.max(bounds.minX, 0); x <= Math.min(bounds.maxX, info.width - 1); x += 1) {
        if (!pointInsidePolygon(points, x + 0.5, y + 0.5)) continue;
        const offset = ((y * info.width) + x) * 4;
        const key = classifyPixel(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
        counts[key] = (counts[key] ?? 0) + 1;
        total += 1;
      }
    }

    const oliveRatio = ratio(counts, 'olive', total);
    const orangeRatio = ratio(counts, 'orange', total);
    const failures = [];
    if (['first-table-4f-301-413__403', 'first-table-4f-301-413__404'].includes(block.id)) {
      if (oliveRatio < 0.35) failures.push(`olive ratio below 0.35: ${oliveRatio}`);
      if (orangeRatio > 0.20) failures.push(`orange bleed above 0.20: ${orangeRatio}`);
    }

    return {
      id: block.id,
      blockCode: block.blockCode,
      officialSectionName: block.officialSectionName,
      samplePixels: total,
      counts,
      ratios: {
        olive: oliveRatio,
        orange: orangeRatio,
        blue: ratio(counts, 'blue', total),
        magenta: ratio(counts, 'magenta', total),
        red: ratio(counts, 'red', total),
        light: ratio(counts, 'light', total),
        dark: ratio(counts, 'dark', total),
        other: ratio(counts, 'other', total),
      },
      bounds,
      failures,
    };
  });

  const failures = rows.flatMap((row) => row.failures.map((failure) => ({ id: row.id, blockCode: row.blockCode, failure })));
  const report = {
    generatedAt: new Date().toISOString(),
    contract,
    status: failures.length === 0 ? 'passed' : 'failed',
    policy: {
      purpose: '대전 공식 이미지 픽셀 색상과 운영 polygon의 거친 정렬 회귀를 탐지한다.',
      strictBlocks: ['first-table-4f-301-413__403', 'first-table-4f-301-413__404'],
      note: '육안 검수를 대체하지 않으며, 403/404가 400 오렌지 블록으로 다시 밀리는 회귀를 release 전에 잡는 보조 gate다.',
    },
    summary: {
      requestedBlocks: blocks.length,
      failureCount: failures.length,
    },
    failures,
    rows,
  };

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, [
    '# 대전 좌석도 pixel align audit',
    '',
    `- generated: ${report.generatedAt}`,
    `- status: ${report.status}`,
    `- contract: \`${contract}\``,
    `- requested blocks: ${blocks.length}`,
    `- failures: ${failures.length}`,
    '',
    '## Strict Failures',
    '',
    failures.length
      ? markdownTable(['block', 'code', 'failure'], failures.map((item) => [`\`${item.id}\``, `\`${item.blockCode}\``, item.failure]))
      : '- none',
    '',
    '## Sample Ratios',
    '',
    markdownTable(
      ['block', 'code', 'samples', 'olive', 'orange', 'blue', 'magenta', 'red', 'light', 'other'],
      rows.map((row) => [
        `\`${row.id}\``,
        `\`${row.blockCode}\``,
        String(row.samplePixels),
        String(row.ratios.olive),
        String(row.ratios.orange),
        String(row.ratios.blue),
        String(row.ratios.magenta),
        String(row.ratios.red),
        String(row.ratios.light),
        String(row.ratios.other),
      ]),
    ),
    '',
  ].join('\n'), 'utf8');

  console.log(`pixel_align_audit_json:${jsonPath}`);
  console.log(`pixel_align_audit_markdown:${markdownPath}`);
  console.log(`status:${report.status} failures=${failures.length} blocks=${blocks.length}`);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
};

const runReleaseGate = async () => {
  const { spawn } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { DAEJEON_BLOCKS, DAEJEON_P2_DEDUPLICATED_ALIASES, DAEJEON_TRACE_REVIEW_QUEUE, DAEJEON_TRACE_REVIEW_SUMMARY, isDaejeonSelectableSeatBlock } = await import("../src/data/daejeonSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(frontendRoot, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const outputRoot = path.join(repoRoot, 'output/playwright');
  const dataTestSourcePath = path.join(frontendRoot, 'src/data/daejeonSeatData.test.ts');

  const EXPECTED_BLOCKS = 139;
  const EXPECTED_TRACED = 139;
  const EXPECTED_REVIEW = 0;
  const EXPECTED_P2_ALIASES = 11;
  const EXPECTED_ANCHOR_CROPS = 28;
  const OPERATOR_APPROVAL_STATUSES = new Set([
    'MISSING_APPROVAL',
    'PENDING_OPERATOR_APPROVAL',
    'APPROVED',
    'STALE_APPROVAL',
  ]);

  const commandPlan = [
    {
      label: 'data tests',
      command: 'node',
      args: [
        '--import',
        'tsx',
        '--test',
        '--test-concurrency=1',
        '--test-name-pattern=대전',
        'src/data/daejeonSeatData.test.ts',
        'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
      ],
    },
    {
      label: 'evidence',
      command: 'node',
      args: ['scripts/stadium-seatmap-ops.mjs', 'daejeon', 'evidence'],
    },
    {
      label: 'visual diff',
      command: 'node',
      args: ['scripts/stadium-seatmap-ops.mjs', 'daejeon', 'visual-diff'],
    },
    {
      label: 'geometry diff',
      command: 'node',
      args: ['scripts/stadium-seatmap-ops.mjs', 'daejeon', 'geometry-diff'],
    },
    {
      label: 'coverage report',
      command: 'node',
      args: ['scripts/stadium-seatmap-ops.mjs', 'daejeon', 'coverage-report'],
    },
    {
      label: 'browser QA',
      command: 'node',
      args: ['scripts/stadium-seatmap-ops.mjs', 'daejeon', 'trace-review'],
    },
    {
      label: 'build',
      command: 'npm',
      args: ['run', 'build'],
      env: {
        VITE_SITE_URL: process.env.VITE_SITE_URL || 'http://localhost:5176',
        VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
      },
    },
  ];

  const requiredFiles = {
    traceManifest: path.join(reportDir, 'daejeon-seatmap-trace-review.json'),
    traceSummary: path.join(reportDir, 'daejeon-seatmap-trace-review.md'),
    coverageReport: path.join(reportDir, 'daejeon-seatmap-coverage-report.json'),
    coverageSummary: path.join(reportDir, 'daejeon-seatmap-coverage-report.md'),
    p2Evidence: path.join(reportDir, 'daejeon-seatmap-p2-evidence-crops.json'),
    p2EvidenceSummary: path.join(reportDir, 'daejeon-seatmap-p2-evidence-crops.md'),
    anchorCrops: path.join(outputRoot, 'daejeon-anchor-review/daejeon-anchor-review-crops.json'),
    anchorCropsSummary: path.join(outputRoot, 'daejeon-anchor-review/daejeon-anchor-review-crops.md'),
    visualDiff: path.join(reportDir, 'daejeon-seatmap-visual-diff.json'),
    visualDiffSummary: path.join(reportDir, 'daejeon-seatmap-visual-diff.md'),
    geometryDiff: path.join(reportDir, 'daejeon-seatmap-geometry-diff.json'),
    geometryDiffSummary: path.join(reportDir, 'daejeon-seatmap-geometry-diff.md'),
    browserQa: path.join(outputRoot, 'stadium-ux-daejeon-validate/stadium-mobile-smoke-summary.json'),
    browserQaSummary: path.join(outputRoot, 'stadium-ux-daejeon-validate/stadium-mobile-smoke-summary.md'),
    mobileScreenshot: path.join(outputRoot, 'stadium-ux-daejeon-validate/mobile-390.png'),
    desktopScreenshot: path.join(outputRoot, 'stadium-ux-daejeon-validate/desktop-1440.png'),
  };

  const requiredAnchorCropIds = [
    'home-100',
    'first-101-109',
    'first-104-106-detail',
    'first-109-112-sequence',
    'cass-200-detail',
    'third-121-124',
    'third-116-121-detail',
    'first-4f-table-301-413-sequence',
    'third-4f-table-414-330-sequence',
    'outfield-upper-500-509-sequence',
    'skybox-s01-s12-sequence',
    'skybox-s13-s25-sequence',
    'skybox-s26-s31-sequence',
    'special-400-accessible-first',
    'special-425-426-third-accessible',
    'special-accessible-center',
    'special-accessible-outfield-third',
  ];

  const expectedRetiredBlockIds = new Set(DAEJEON_P2_DEDUPLICATED_ALIASES.map((alias) => alias.retiredBlockId));

  const assertGate = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const jsonEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

  const fileExists = async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  };

  const runCommand = (step) => new Promise((resolve, reject) => {
    const startedAt = Date.now();
    console.log(`[daejeon-release-gate] ${step.label}: ${step.command} ${step.args.join(' ')}`);

    const child = spawn(step.command, step.args, {
      cwd: frontendRoot,
      env: { ...process.env, ...step.env },
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      const durationMs = Date.now() - startedAt;
      if (code === 0) {
        resolve({
          label: step.label,
          command: [step.command, ...step.args].join(' '),
          status: 'passed',
          durationMs,
        });
        return;
      }

      reject(new Error(`${step.label} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}`));
    });
  });

  const validateStaticData = () => {
    assertGate(DAEJEON_BLOCKS.length === EXPECTED_BLOCKS, `DAEJEON_BLOCKS.length must be ${EXPECTED_BLOCKS}`);
    assertGate(DAEJEON_TRACE_REVIEW_SUMMARY.totalBlocks === EXPECTED_BLOCKS, `summary.totalBlocks must be ${EXPECTED_BLOCKS}`);
    assertGate(DAEJEON_TRACE_REVIEW_SUMMARY.officialImageTraced === EXPECTED_TRACED, `summary.officialImageTraced must be ${EXPECTED_TRACED}`);
    assertGate(DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview === EXPECTED_REVIEW, `summary.needsOperatorReview must be ${EXPECTED_REVIEW}`);
    assertGate(DAEJEON_TRACE_REVIEW_QUEUE.length === 0, 'DAEJEON_TRACE_REVIEW_QUEUE must stay empty');
    assertGate(DAEJEON_P2_DEDUPLICATED_ALIASES.length === EXPECTED_P2_ALIASES, `P2 deduplicated aliases must be ${EXPECTED_P2_ALIASES}`);

    const retiredOperationalBlocks = DAEJEON_BLOCKS.filter((block) => expectedRetiredBlockIds.has(block.id));
    assertGate(retiredOperationalBlocks.length === 0, `retired P2 aliases must not exist in DAEJEON_BLOCKS: ${retiredOperationalBlocks.map((block) => block.id).join(', ')}`);

    const invalidBlocks = DAEJEON_BLOCKS.filter((block) => (
      block.traceStatus !== 'OFFICIAL_IMAGE_TRACED'
      || block.traceMethod !== 'PATH_TRACED_FROM_OFFICIAL_IMAGE'
      || block.sourceConfidence !== 'OFFICIAL'
      || !isDaejeonSelectableSeatBlock(block)
    ));
    assertGate(invalidBlocks.length === 0, `all DAEJEON_BLOCKS must be selectable official traced blocks: ${invalidBlocks.map((block) => block.id).join(', ')}`);
  };

  const validateArtifacts = async () => {
    const missingFiles = [];
    for (const [label, filePath] of Object.entries(requiredFiles)) {
      if (!(await fileExists(filePath))) {
        missingFiles.push(`${label}: ${filePath}`);
      }
    }
    assertGate(missingFiles.length === 0, `missing Daejeon release gate artifacts:\n${missingFiles.join('\n')}`);

    const manifest = await readJson(requiredFiles.traceManifest);
    assertGate(manifest.summary?.totalBlocks === EXPECTED_BLOCKS, `manifest summary.totalBlocks must be ${EXPECTED_BLOCKS}`);
    assertGate(manifest.summary?.officialImageTraced === EXPECTED_TRACED, `manifest summary.officialImageTraced must be ${EXPECTED_TRACED}`);
    assertGate(manifest.summary?.needsOperatorReview === EXPECTED_REVIEW, `manifest summary.needsOperatorReview must be ${EXPECTED_REVIEW}`);
    assertGate((manifest.traceReviewQueue ?? []).length === 0, 'manifest traceReviewQueue must be empty');
    assertGate(manifest.precisionAudit?.labelTopHitFailureCount === 0, 'manifest labelTopHitFailureCount must be 0');
    assertGate((manifest.deduplicatedAliases ?? []).length === EXPECTED_P2_ALIASES, `manifest deduplicatedAliases must be ${EXPECTED_P2_ALIASES}`);
    assertGate((manifest.blocks ?? []).length === EXPECTED_BLOCKS, `manifest blocks must be ${EXPECTED_BLOCKS}`);
    assertGate(manifest.coordinateChangeImpact?.contract === 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1', 'manifest coordinateChangeImpact contract is missing');
    assertGate(manifest.coordinateChangeImpact?.counts?.missingImpact === 0, 'manifest coordinateChangeImpact missingImpact must be 0');

    const manifestRetiredBlocks = (manifest.blocks ?? []).filter((block) => expectedRetiredBlockIds.has(block.id));
    assertGate(manifestRetiredBlocks.length === 0, `retired P2 aliases must not exist in manifest blocks: ${manifestRetiredBlocks.map((block) => block.id).join(', ')}`);

    const invalidManifestBlocks = (manifest.blocks ?? []).filter((block) => (
      block.sourceConfidence !== 'OFFICIAL'
      || block.traceStatus !== 'OFFICIAL_IMAGE_TRACED'
      || block.traceMethod !== 'PATH_TRACED_FROM_OFFICIAL_IMAGE'
      || block.selectable !== true
    ));
    assertGate(invalidManifestBlocks.length === 0, `manifest contains non-releaseable blocks: ${invalidManifestBlocks.map((block) => block.id).join(', ')}`);

    const coverageReport = await readJson(requiredFiles.coverageReport);
    assertGate(coverageReport.summary?.totalBlocks === EXPECTED_BLOCKS, `coverage totalBlocks must be ${EXPECTED_BLOCKS}`);
    assertGate(coverageReport.summary?.lockedCount === EXPECTED_BLOCKS, `coverage lockedCount must be ${EXPECTED_BLOCKS}`);
    assertGate(coverageReport.summary?.labelOnlyCount === 0, 'coverage labelOnlyCount must be 0');
    assertGate(coverageReport.summary?.partialCount === 0, 'coverage partialCount must be 0');
    assertGate(coverageReport.summary?.missingLabelTopHitCount === 0, 'coverage missingLabelTopHitCount must be 0');
    assertGate(coverageReport.summary?.missingAnchorWithoutExceptionCount === 0, 'coverage missingAnchorWithoutExceptionCount must be 0');
    assertGate(coverageReport.summary?.missingOwnerPointRequiredCount === 0, 'coverage missingOwnerPointRequiredCount must be 0');
    assertGate((coverageReport.blocks ?? []).length === EXPECTED_BLOCKS, `coverage blocks must be ${EXPECTED_BLOCKS}`);
    assertGate(coverageReport.coordinateChangeImpact?.contract === 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1', 'coverage coordinateChangeImpact contract is missing');
    assertGate(coverageReport.coordinateChangeImpact?.counts?.missingImpact === 0, 'coverage coordinateChangeImpact missingImpact must be 0');
    assertGate(
      jsonEqual(manifest.coordinateChangeImpact?.counts ?? null, coverageReport.coordinateChangeImpact?.counts ?? null),
      'manifest and coverage coordinate impact counts must match',
    );
    [
      'p0BlockIds',
      'p1BlockIds',
      'p2AutoBlockIds',
      'p2ManualOnlyBlockIds',
      'autoRegressionBlockIds',
      'manualCropOnlyBlockIds',
      'tracedWithoutRegressionBlockIds',
      'missingImpactBlockIds',
    ].forEach((key) => {
      assertGate(
        jsonEqual(manifest.coordinateChangeImpact?.[key] ?? [], coverageReport.coordinateChangeImpact?.[key] ?? []),
        `manifest and coverage coordinate impact ${key} must match`,
      );
    });

    const p2Evidence = await readJson(requiredFiles.p2Evidence);
    assertGate((p2Evidence.outputs ?? []).length === EXPECTED_P2_ALIASES, `P2 evidence outputs must be ${EXPECTED_P2_ALIASES}`);
    const invalidP2Outputs = (p2Evidence.outputs ?? []).filter((output) => output.retiredBlockExists || !expectedRetiredBlockIds.has(output.retiredBlockId));
    assertGate(invalidP2Outputs.length === 0, `P2 evidence contains invalid retired alias outputs: ${invalidP2Outputs.map((output) => output.retiredBlockId).join(', ')}`);
    const missingP2OutputFiles = [];
    for (const output of p2Evidence.outputs ?? []) {
      if (!(await fileExists(output.outputPath))) {
        missingP2OutputFiles.push(output.outputPath);
      }
    }
    assertGate(missingP2OutputFiles.length === 0, `missing P2 evidence crop files:\n${missingP2OutputFiles.join('\n')}`);

    const anchorCrops = await readJson(requiredFiles.anchorCrops);
    const dataTestSource = await fs.readFile(dataTestSourcePath, 'utf8');
    assertGate((anchorCrops.crops ?? []).length === EXPECTED_ANCHOR_CROPS, `anchor crop count must be ${EXPECTED_ANCHOR_CROPS}`);
    const anchorCropIds = new Set((anchorCrops.crops ?? []).map((crop) => crop.id));
    const missingAnchorCropIds = requiredAnchorCropIds.filter((id) => !anchorCropIds.has(id));
    assertGate(missingAnchorCropIds.length === 0, `missing anchor crop ids: ${missingAnchorCropIds.join(', ')}`);
    const p0AnchorCrops = (anchorCrops.crops ?? []).filter((crop) => crop.reviewPriority === 'P0');
    assertGate(p0AnchorCrops.length === 4, `P0 anchor crops must stay at 4: ${p0AnchorCrops.map((crop) => crop.id).join(', ')}`);
    const missingAnchorCropReviewMetadata = (anchorCrops.crops ?? []).filter((crop) => (
      typeof crop.group !== 'string'
      || typeof crop.purpose !== 'string'
      || typeof crop.reviewFocus !== 'string'
      || !Array.isArray(crop.passCriteria)
      || crop.passCriteria.length === 0
      || !Array.isArray(crop.rejectCriteria)
      || crop.rejectCriteria.length === 0
      || !Array.isArray(crop.representativeBlocks)
      || crop.representativeBlocks.length === 0
      || !['P0', 'P1', 'P2'].includes(crop.reviewPriority)
      || typeof crop.reviewMode !== 'string'
      || !Array.isArray(crop.riskTags)
      || crop.riskTags.length === 0
      || crop.reviewContractVersion !== 'DAEJEON_ANCHOR_CROP_REVIEW_V2'
      || (crop.reviewMode === 'MANUAL_CROP_ONLY' && typeof crop.manualOnlyReason !== 'string')
      || (crop.reviewPriority === 'P0' && (!Array.isArray(crop.regressionTestIds) || crop.regressionTestIds.length === 0))
    ));
    assertGate(
      missingAnchorCropReviewMetadata.length === 0,
      `anchor crops missing operator review metadata: ${missingAnchorCropReviewMetadata.map((crop) => crop.id).join(', ')}`,
    );
    const p0CropsMissingRegressionTests = p0AnchorCrops.filter((crop) => (
      !Array.isArray(crop.regressionTestIds)
      || crop.regressionTestIds.some((testId) => !dataTestSource.includes(testId))
    ));
    assertGate(
      p0CropsMissingRegressionTests.length === 0,
      `P0 anchor crops missing data regression tests: ${p0CropsMissingRegressionTests.map((crop) => crop.id).join(', ')}`,
    );
    const missingAnchorCropFiles = [];
    for (const crop of anchorCrops.crops ?? []) {
      if (!(await fileExists(crop.outputPath))) {
        missingAnchorCropFiles.push(crop.outputPath);
      }
    }
    assertGate(missingAnchorCropFiles.length === 0, `missing anchor crop files:\n${missingAnchorCropFiles.join('\n')}`);

    const visualDiff = await readJson(requiredFiles.visualDiff);
    assertGate(visualDiff.contract === 'DAEJEON_ANCHOR_VISUAL_BASELINE_V1', 'visual diff contract is missing');
    assertGate(visualDiff.status === 'passed', `visual diff status must be passed: ${(visualDiff.failures ?? []).join(', ')}`);
    assertGate(visualDiff.summary?.baselineCropCount === EXPECTED_ANCHOR_CROPS, `visual diff baselineCropCount must be ${EXPECTED_ANCHOR_CROPS}`);
    assertGate(visualDiff.summary?.currentCropCount === EXPECTED_ANCHOR_CROPS, `visual diff currentCropCount must be ${EXPECTED_ANCHOR_CROPS}`);
    assertGate(visualDiff.summary?.changedCropCount === 0, 'visual diff changedCropCount must be 0');
    assertGate(visualDiff.summary?.metadataMismatchCount === 0, 'visual diff metadataMismatchCount must be 0');
    assertGate(visualDiff.summary?.missingCropCount === 0, 'visual diff missingCropCount must be 0');
    assertGate(visualDiff.summary?.extraCropCount === 0, 'visual diff extraCropCount must be 0');
    assertGate(visualDiff.baseline?.reviewContractVersion === 'DAEJEON_ANCHOR_CROP_REVIEW_V2', 'visual diff baseline review contract is missing');

    const geometryDiff = await readJson(requiredFiles.geometryDiff);
    assertGate(geometryDiff.contract === 'DAEJEON_GEOMETRY_BASELINE_V1', 'geometry diff contract is missing');
    assertGate(geometryDiff.status === 'passed', `geometry diff status must be passed: ${(geometryDiff.failures ?? []).join(', ')}`);
    assertGate(geometryDiff.summary?.baselineBlockCount === EXPECTED_BLOCKS, `geometry diff baselineBlockCount must be ${EXPECTED_BLOCKS}`);
    assertGate(geometryDiff.summary?.currentBlockCount === EXPECTED_BLOCKS, `geometry diff currentBlockCount must be ${EXPECTED_BLOCKS}`);
    assertGate(geometryDiff.summary?.changedBlockCount === 0, 'geometry diff changedBlockCount must be 0');
    assertGate(geometryDiff.summary?.missingBlockCount === 0, 'geometry diff missingBlockCount must be 0');
    assertGate(geometryDiff.summary?.extraBlockCount === 0, 'geometry diff extraBlockCount must be 0');
    assertGate(geometryDiff.current?.coordinateChangeImpactContract === 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1', 'geometry diff coordinate impact contract is missing');

    const browserQa = await readJson(requiredFiles.browserQa);
    assertGate(browserQa.status === 'passed', 'browser QA summary status must be passed');
    assertGate(browserQa.entryCount === 2, 'browser QA must include mobile and desktop scenarios');
    assertGate(browserQa.overflowFailureCount === 0, 'browser QA overflowFailureCount must be 0');
    assertGate(browserQa.actionableFailedRequestCount === 0, 'browser QA actionableFailedRequestCount must be 0');
    assertGate(browserQa.actionableConsoleErrorCount === 0, 'browser QA actionableConsoleErrorCount must be 0');

    const scenarioFailures = (browserQa.scenarios ?? []).filter((scenario) => (
      scenario.status !== 'passed' || scenario.metrics?.overflowX
    ));
    assertGate(scenarioFailures.length === 0, `browser QA scenarios must pass without overflow: ${scenarioFailures.map((scenario) => scenario.label ?? scenario.key).join(', ')}`);
  };

  const readOperatorApprovalSummary = async () => {
    const approvalPath = path.join(reportDir, 'daejeon-seatmap-operator-approval.json');
    const approvalRelativePath = path.relative(frontendRoot, approvalPath);
    const baseSummary = {
      approvalPath: approvalRelativePath,
      status: 'MISSING_APPROVAL',
      approvedBy: null,
      approvedAt: null,
      hashMatchesReleaseGate: null,
      hashVerification: 'deferred-to-release-approved',
      releaseApprovedCommand: 'npm run qa:stadium:daejeon:release-approved',
      releaseLockRequiresOperatorApproval: false,
      note: 'release-lock does not require operator approval; final operator hash validation runs in release-approved.',
    };

    if (!(await fileExists(approvalPath))) {
      return baseSummary;
    }

    const approval = await readJson(approvalPath);
    const approvalStatus = typeof approval.status === 'string' && OPERATOR_APPROVAL_STATUSES.has(approval.status)
      ? approval.status
      : 'UNKNOWN_APPROVAL_STATUS';

    return {
      ...baseSummary,
      status: approvalStatus,
      approvedBy: approval.approvedBy ?? null,
      approvedAt: approval.approvedAt ?? null,
      hasApprovedHandoffHash: typeof approval.approvedHandoffHash === 'string' && approval.approvedHandoffHash.length > 0,
      hasApprovedHandoffMarkdownHash: typeof approval.approvedHandoffMarkdownHash === 'string' && approval.approvedHandoffMarkdownHash.length > 0,
      hasApprovedReleaseGateHash: typeof approval.approvedReleaseGateHash === 'string' && approval.approvedReleaseGateHash.length > 0,
    };
  };

  const writeReport = async (steps) => {
    const operatorApproval = await readOperatorApprovalSummary();
    const coverageReport = await readJson(requiredFiles.coverageReport);
    const anchorCrops = await readJson(requiredFiles.anchorCrops);
    const visualDiff = await readJson(requiredFiles.visualDiff);
    const geometryDiff = await readJson(requiredFiles.geometryDiff);
    const dataTestSource = await fs.readFile(dataTestSourcePath, 'utf8');
    const coverageSummary = {
      lockedCount: coverageReport.summary?.lockedCount ?? null,
      labelOnlyCount: coverageReport.summary?.labelOnlyCount ?? null,
      partialCount: coverageReport.summary?.partialCount ?? null,
      missingLabelTopHitCount: coverageReport.summary?.missingLabelTopHitCount ?? null,
      missingAnchorWithoutExceptionCount: coverageReport.summary?.missingAnchorWithoutExceptionCount ?? null,
      missingOwnerPointRequiredCount: coverageReport.summary?.missingOwnerPointRequiredCount ?? null,
      coordinateImpactContract: coverageReport.coordinateChangeImpact?.contract ?? null,
      coordinateImpactCounts: coverageReport.coordinateChangeImpact?.counts ?? null,
    };
    const anchorCropSummary = {
      total: (anchorCrops.crops ?? []).length,
      required: EXPECTED_ANCHOR_CROPS,
      reviewContractVersion: anchorCrops.reviewContractVersion ?? null,
      reviewMetadataComplete: (anchorCrops.crops ?? []).every((crop) => (
        crop.reviewContractVersion === 'DAEJEON_ANCHOR_CROP_REVIEW_V2'
        && Array.isArray(crop.passCriteria)
        && crop.passCriteria.length > 0
        && Array.isArray(crop.rejectCriteria)
        && crop.rejectCriteria.length > 0
        && Array.isArray(crop.representativeBlocks)
        && crop.representativeBlocks.length > 0
        && ['P0', 'P1', 'P2'].includes(crop.reviewPriority)
        && typeof crop.reviewMode === 'string'
        && Array.isArray(crop.riskTags)
        && crop.riskTags.length > 0
        && (crop.reviewMode !== 'MANUAL_CROP_ONLY' || typeof crop.manualOnlyReason === 'string')
        && (crop.reviewPriority !== 'P0' || (Array.isArray(crop.regressionTestIds) && crop.regressionTestIds.every((testId) => dataTestSource.includes(testId))))
      )),
      priorityCounts: (anchorCrops.crops ?? []).reduce((counts, crop) => {
        const key = ['P0', 'P1', 'P2'].includes(crop.reviewPriority) ? crop.reviewPriority : 'unknown';
        counts[key] = (counts[key] ?? 0) + 1;
        return counts;
      }, {}),
      p0RegressionTestIds: (anchorCrops.crops ?? [])
        .filter((crop) => crop.reviewPriority === 'P0')
        .flatMap((crop) => crop.regressionTestIds ?? []),
      p1RegressionTestIds: (anchorCrops.crops ?? [])
        .filter((crop) => crop.reviewPriority === 'P1')
        .flatMap((crop) => crop.regressionTestIds ?? []),
      p1RegressionWarningCropIds: (anchorCrops.crops ?? [])
        .filter((crop) => (
          crop.reviewPriority === 'P1'
          && (
            !Array.isArray(crop.regressionTestIds)
            || crop.regressionTestIds.length === 0
            || crop.regressionTestIds.some((testId) => !dataTestSource.includes(testId))
          )
        ))
        .map((crop) => crop.id),
      p2RegressionTestIds: (anchorCrops.crops ?? [])
        .filter((crop) => crop.reviewPriority === 'P2')
        .flatMap((crop) => crop.regressionTestIds ?? []),
      p2ManualOnlyCropIds: (anchorCrops.crops ?? [])
        .filter((crop) => crop.reviewPriority === 'P2' && crop.reviewMode === 'MANUAL_CROP_ONLY')
        .map((crop) => crop.id),
      p2RegressionWarningCropIds: (anchorCrops.crops ?? [])
        .filter((crop) => (
          crop.reviewPriority === 'P2'
          && crop.reviewMode !== 'MANUAL_CROP_ONLY'
          && (
            !Array.isArray(crop.regressionTestIds)
            || crop.regressionTestIds.length === 0
            || crop.regressionTestIds.some((testId) => !dataTestSource.includes(testId))
          )
        ))
        .map((crop) => crop.id),
      skybox: (anchorCrops.crops ?? [])
        .filter((crop) => String(crop.id).startsWith('skybox-'))
        .map((crop) => crop.id),
    };
    const coordinateChangeImpactSummary = {
      contract: coverageReport.coordinateChangeImpact?.contract ?? null,
      counts: coverageReport.coordinateChangeImpact?.counts ?? {},
      p0BlockIds: coverageReport.coordinateChangeImpact?.p0BlockIds ?? [],
      p1BlockIds: coverageReport.coordinateChangeImpact?.p1BlockIds ?? [],
      p2AutoBlockIds: coverageReport.coordinateChangeImpact?.p2AutoBlockIds ?? [],
      p2ManualOnlyBlockIds: coverageReport.coordinateChangeImpact?.p2ManualOnlyBlockIds ?? [],
      tracedWithoutRegressionBlockIds: coverageReport.coordinateChangeImpact?.tracedWithoutRegressionBlockIds ?? [],
      missingImpactBlockIds: coverageReport.coordinateChangeImpact?.missingImpactBlockIds ?? [],
    };
    const visualDiffSummary = {
      contract: visualDiff.contract ?? null,
      status: visualDiff.status ?? null,
      baseline: visualDiff.baseline ?? null,
      counts: visualDiff.summary ?? {},
      changedCropIds: (visualDiff.hashChanged ?? []).map((item) => item.id),
      metadataChangedCropIds: (visualDiff.metadataChanged ?? []).map((item) => item.id),
      p2ManualOnlyChangedCropIds: visualDiff.p2ManualOnlyChanged ?? [],
    };
    const geometryDiffSummary = {
      contract: geometryDiff.contract ?? null,
      status: geometryDiff.status ?? null,
      baseline: geometryDiff.baseline ?? null,
      counts: geometryDiff.summary ?? {},
      changedBlockIds: (geometryDiff.changedBlocks ?? []).map((block) => block.id),
      changedFieldsByBlock: Object.fromEntries((geometryDiff.changedBlocks ?? []).map((block) => [block.id, block.changedFields ?? []])),
    };
    const report = {
      generatedAt: new Date().toISOString(),
      status: 'passed',
      expected: {
        totalBlocks: EXPECTED_BLOCKS,
        officialImageTraced: EXPECTED_TRACED,
        needsOperatorReview: EXPECTED_REVIEW,
        p2DeduplicatedAliases: EXPECTED_P2_ALIASES,
        anchorCrops: EXPECTED_ANCHOR_CROPS,
      },
      coverage: coverageSummary,
      anchorCropSummary,
      coordinateChangeImpactSummary,
      visualDiffSummary,
      geometryDiffSummary,
      operatorApproval,
      commands: steps,
      artifacts: Object.fromEntries(
        Object.entries(requiredFiles).map(([label, filePath]) => [label, path.relative(frontendRoot, filePath)]),
      ),
      releaseApprovalCommand: 'npm run qa:stadium:daejeon:release-approved',
    };
    const jsonPath = path.join(reportDir, 'daejeon-seatmap-release-gate.json');
    const markdownPath = path.join(reportDir, 'daejeon-seatmap-release-gate.md');

    await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await fs.writeFile(markdownPath, [
      '# 대전 좌석도 release gate',
      '',
      `- generated: ${report.generatedAt}`,
      `- status: ${report.status}`,
      `- total blocks: ${EXPECTED_BLOCKS}`,
      `- official image traced: ${EXPECTED_TRACED}`,
      `- needs operator review: ${EXPECTED_REVIEW}`,
      `- P2 deduplicated aliases: ${EXPECTED_P2_ALIASES}`,
      `- anchor crops: ${EXPECTED_ANCHOR_CROPS}`,
      `- coverage locked: ${coverageSummary.lockedCount}/${EXPECTED_BLOCKS}`,
      `- coverage LABEL_ONLY: ${coverageSummary.labelOnlyCount}`,
      `- coverage PARTIAL: ${coverageSummary.partialCount}`,
      `- coordinate impact contract: \`${coordinateChangeImpactSummary.contract}\``,
      `- visual diff: ${visualDiffSummary.status} (${visualDiffSummary.counts.changedCropCount ?? 0} changed crops)`,
      `- geometry diff: ${geometryDiffSummary.status} (${geometryDiffSummary.counts.changedBlockCount ?? 0} changed blocks)`,
      '',
      '## Coverage',
      '',
      '| metric | value |',
      '| --- | ---: |',
      `| locked | ${coverageSummary.lockedCount} |`,
      `| LABEL_ONLY | ${coverageSummary.labelOnlyCount} |`,
      `| PARTIAL | ${coverageSummary.partialCount} |`,
      `| missing label top-hit | ${coverageSummary.missingLabelTopHitCount} |`,
      `| missing anchor without exception | ${coverageSummary.missingAnchorWithoutExceptionCount} |`,
      `| missing owner-point required | ${coverageSummary.missingOwnerPointRequiredCount} |`,
      '',
      '## Coordinate Change Impact',
      '',
      '| group | count |',
      '| --- | ---: |',
      `| P0 crop coverage | ${coordinateChangeImpactSummary.counts.p0 ?? 0} |`,
      `| P1 crop coverage | ${coordinateChangeImpactSummary.counts.p1 ?? 0} |`,
      `| P2 auto regression coverage | ${coordinateChangeImpactSummary.counts.p2Auto ?? 0} |`,
      `| P2 manual crop-only coverage | ${coordinateChangeImpactSummary.counts.p2ManualOnly ?? 0} |`,
      `| auto regression blocks | ${coordinateChangeImpactSummary.counts.autoRegression ?? 0} |`,
      `| manual crop-only blocks | ${coordinateChangeImpactSummary.counts.manualCropOnly ?? 0} |`,
      `| traced without regression | ${coordinateChangeImpactSummary.counts.tracedWithoutRegression ?? 0} |`,
      `| missing impact mapping | ${coordinateChangeImpactSummary.counts.missingImpact ?? 0} |`,
      '',
      '## Anchor Visual Diff',
      '',
      '| metric | value |',
      '| --- | ---: |',
      `| baseline crops | ${visualDiffSummary.counts.baselineCropCount ?? 0} |`,
      `| current crops | ${visualDiffSummary.counts.currentCropCount ?? 0} |`,
      `| changed crops | ${visualDiffSummary.counts.changedCropCount ?? 0} |`,
      `| metadata mismatches | ${visualDiffSummary.counts.metadataMismatchCount ?? 0} |`,
      `| missing crops | ${visualDiffSummary.counts.missingCropCount ?? 0} |`,
      `| extra crops | ${visualDiffSummary.counts.extraCropCount ?? 0} |`,
      `| P2 manual-only changed | ${visualDiffSummary.counts.p2ManualOnlyChangedCount ?? 0} |`,
      '',
      `- baseline: \`${visualDiffSummary.baseline?.path ?? ''}\``,
      `- changed crop ids: ${visualDiffSummary.changedCropIds.length ? visualDiffSummary.changedCropIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
      '',
      '## Geometry Fingerprint Diff',
      '',
      '| metric | value |',
      '| --- | ---: |',
      `| baseline blocks | ${geometryDiffSummary.counts.baselineBlockCount ?? 0} |`,
      `| current blocks | ${geometryDiffSummary.counts.currentBlockCount ?? 0} |`,
      `| changed blocks | ${geometryDiffSummary.counts.changedBlockCount ?? 0} |`,
      `| missing blocks | ${geometryDiffSummary.counts.missingBlockCount ?? 0} |`,
      `| extra blocks | ${geometryDiffSummary.counts.extraBlockCount ?? 0} |`,
      `| changed imageGeometry.d | ${geometryDiffSummary.counts.changedImageGeometryDCount ?? 0} |`,
      `| changed hitAreaD | ${geometryDiffSummary.counts.changedHitAreaDCount ?? 0} |`,
      `| changed label coordinates | ${geometryDiffSummary.counts.changedLabelCoordinateCount ?? 0} |`,
      `| changed trace contract | ${geometryDiffSummary.counts.changedTraceContractCount ?? 0} |`,
      '',
      `- baseline: \`${geometryDiffSummary.baseline?.path ?? ''}\``,
      `- changed block ids: ${geometryDiffSummary.changedBlockIds.length ? geometryDiffSummary.changedBlockIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
      '',
      '## Anchor Crops',
      '',
      `- total: ${anchorCropSummary.total}/${anchorCropSummary.required}`,
      `- review contract: \`${anchorCropSummary.reviewContractVersion}\``,
      `- review metadata complete: ${anchorCropSummary.reviewMetadataComplete}`,
      `- priority counts: ${Object.entries(anchorCropSummary.priorityCounts).map(([key, value]) => `${key}=${value}`).join(', ')}`,
      `- P0 regression tests: ${anchorCropSummary.p0RegressionTestIds.map((id) => `\`${id}\``).join(', ')}`,
      `- P1 regression tests: ${anchorCropSummary.p1RegressionTestIds.map((id) => `\`${id}\``).join(', ')}`,
      `- P1 regression warnings: ${anchorCropSummary.p1RegressionWarningCropIds.length ? anchorCropSummary.p1RegressionWarningCropIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
      `- P2 regression tests: ${anchorCropSummary.p2RegressionTestIds.map((id) => `\`${id}\``).join(', ')}`,
      `- P2 manual-only crops: ${anchorCropSummary.p2ManualOnlyCropIds.map((id) => `\`${id}\``).join(', ')}`,
      `- P2 regression warnings: ${anchorCropSummary.p2RegressionWarningCropIds.length ? anchorCropSummary.p2RegressionWarningCropIds.map((id) => `\`${id}\``).join(', ') : 'none'}`,
      `- skybox crops: ${anchorCropSummary.skybox.map((id) => `\`${id}\``).join(', ')}`,
      '',
      '## Operator Approval',
      '',
      '- release-lock does not require operator approval',
      `- approval file: \`${operatorApproval.approvalPath}\``,
      `- status: ${operatorApproval.status}`,
      `- approved by: ${operatorApproval.approvedBy ?? ''}`,
      `- approved at: ${operatorApproval.approvedAt ?? ''}`,
      `- hashMatchesReleaseGate: ${operatorApproval.hashMatchesReleaseGate ?? 'deferred'}`,
      `- hash verification: ${operatorApproval.hashVerification}`,
      `- final approval gate: \`${operatorApproval.releaseApprovedCommand}\``,
      '',
      '| step | status | duration ms | command |',
      '| --- | --- | ---: | --- |',
      ...steps.map((step) => `| ${step.label} | ${step.status} | ${step.durationMs} | \`${step.command}\` |`),
      '',
    ].join('\n'), 'utf8');

    return { jsonPath, markdownPath };
  };

  try {
    validateStaticData();

    const steps = [];
    for (const step of commandPlan) {
      steps.push(await runCommand(step));
    }

    await validateArtifacts();
    const report = await writeReport(steps);

    console.log(`[daejeon-release-gate] status:passed report=${report.jsonPath}`);
    console.log(`[daejeon-release-gate] summary=${report.markdownPath}`);
  } catch (error) {
    console.error('[daejeon-release-gate] status:failed');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
};

const runReviewManifest = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { buildAnchorImpactByBlockId, buildAnchorReviewCrops, buildCoordinateChangeImpact, coordinateChangeImpactContract, coordinateImpactForBlock } = await import("./daejeon-seatmap-anchor-contract.mjs");
  const { DAEJEON_BLOCKS, DAEJEON_BLOCK_GROUPS, DAEJEON_P2_DEDUPLICATED_ALIASES, DAEJEON_SECTION_COVERAGE, DAEJEON_SEATMAP_IMAGE, DAEJEON_TRACE_REVIEW_QUEUE, DAEJEON_TRACE_REVIEW_SUMMARY, getDaejeonTraceMethodLabel, getDaejeonTraceStatusLabel, getDaejeonViewInfo, isDaejeonSelectableSeatBlock, isDaejeonSplitColorBlockId } = await import("../src/data/daejeonSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');
  const pixelComponentsPath = path.resolve(frontendRoot, '..', 'output/playwright/daejeon-seatmap-pixel-components.json');
  const anchorReviewOutputDir = path.resolve(frontendRoot, '..', 'output/playwright/daejeon-anchor-review');
  const releaseLockDocumentPath = path.join(frontendRoot, 'docs/daejeon-seatmap-release-lock.md');
  const releaseGateReportPath = path.join(defaultOutDir, 'daejeon-seatmap-release-gate.md');
  const browserQaSummaryPath = path.resolve(frontendRoot, '..', 'output/playwright/stadium-ux-daejeon-validate/stadium-mobile-smoke-summary.md');
  const anchorReviewCrops = buildAnchorReviewCrops(anchorReviewOutputDir);
  const requiredAnchorReviewCropIds = ['special-400-accessible-first', 'special-425-426-third-accessible'];
  const daejeonCoordinateChangeImpactContract = 'DAEJEON_COORDINATE_CHANGE_IMPACT_V1';
  const anchorImpactByBlockId = buildAnchorImpactByBlockId(anchorReviewCrops);

  if (coordinateChangeImpactContract !== daejeonCoordinateChangeImpactContract) {
    throw new Error(`Unexpected Daejeon coordinate impact contract: ${coordinateChangeImpactContract}`);
  }

  requiredAnchorReviewCropIds.forEach((cropId) => {
    if (!anchorReviewCrops.some((crop) => crop.id === cropId)) {
      throw new Error(`Missing required Daejeon anchor review crop: ${cropId}`);
    }
  });

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

  const markdownBlockIdSummary = (blockIds) => {
    if (blockIds.length === 0) return '-';
    if (blockIds.length <= 12) return blockIds.map((id) => `\`${id}\``).join('<br>');

    return [
      `count ${blockIds.length}`,
      ...blockIds.slice(0, 5).map((id) => `\`${id}\``),
      '...',
      ...blockIds.slice(-3).map((id) => `\`${id}\``),
    ].join('<br>');
  };

  const pathToPoints = (d) => {
    const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];

    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }

    return points;
  };

  const pathToPolygons = (d) => String(d ?? '')
    .trim()
    .split(/(?=M\s*-?\d)/i)
    .map((subpath) => pathToPoints(subpath))
    .filter((points) => points.length >= 3);

  const polygonArea = (points) => {
    const signedArea = points.reduce((area, point, index) => {
      const next = points[(index + 1) % points.length];
      return area + (point[0] * next[1]) - (next[0] * point[1]);
    }, 0);

    return Math.abs(signedArea) / 2;
  };

  const isPointInsidePolygon = (points, point) => {
    const [x, y] = point;
    let inside = false;

    for (let index = 0, previousIndex = points.length - 1; index < points.length; previousIndex = index++) {
      const [xi, yi] = points[index];
      const [xj, yj] = points[previousIndex];
      const intersects = (yi > y) !== (yj > y)
        && x < (((xj - xi) * (y - yi)) / (yj - yi)) + xi;
      if (intersects) inside = !inside;
    }

    return inside;
  };

  const isPointInsidePath = (d, point) => pathToPolygons(d).some((points) => isPointInsidePolygon(points, point));

  const getSeatMapLayer = (block) => {
    if (block.category === 'ACCESSIBLE') return 40;
    if (block.category === 'SPECIAL' || block.category === 'EXCITING') return 30;
    if (block.category === 'SKY') return 20;
    return 10;
  };

  const getTraceLayer = (block) => (block.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? 1 : 0);

  const getSplitColorRenderLayer = (block) => (isDaejeonSplitColorBlockId(block.id) ? 1 : 0);

  const formatArea = (value) => Number(value.toFixed(2));
  const formatCoordinate = (value) => Number(value.toFixed(1));

  const renderOrderedBlocks = [...DAEJEON_BLOCKS].sort((a, b) => (
    getSeatMapLayer(a) - getSeatMapLayer(b)
    || getTraceLayer(a) - getTraceLayer(b)
    || getSplitColorRenderLayer(a) - getSplitColorRenderLayer(b)
    || a.displayPriority - b.displayPriority
  ));

  const getTopHitBlockIdAtPoint = (point) => {
    const hitStack = renderOrderedBlocks.filter((candidate) => (
      candidate.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      && isPointInsidePath(candidate.hitAreaD ?? candidate.imageGeometry.d, point)
    ));

    return hitStack[hitStack.length - 1]?.id ?? null;
  };

  const expandedVertexSample = (block, vertexIndex, distance = 2) => {
    const visualPoints = pathToPoints(block.imageGeometry.d);
    const [x, y] = visualPoints[vertexIndex];
    const dx = x - block.imageGeometry.labelX;
    const dy = y - block.imageGeometry.labelY;
    const length = Math.hypot(dx, dy);
    if (length === 0) return [x, y];

    return [
      formatCoordinate(x + ((dx / length) * distance)),
      formatCoordinate(y + ((dy / length) * distance)),
    ];
  };

  const traceReviewQueueById = new Map(DAEJEON_TRACE_REVIEW_QUEUE.map((item) => [item.id, item]));
  const deduplicatedAliasesByCanonicalId = DAEJEON_P2_DEDUPLICATED_ALIASES.reduce((map, alias) => {
    const aliases = map.get(alias.canonicalBlockId) ?? [];
    aliases.push(alias);
    map.set(alias.canonicalBlockId, aliases);
    return map;
  }, new Map());

  const blockRows = DAEJEON_BLOCKS.map((block) => {
    const queueItem = traceReviewQueueById.get(block.id);
    const deduplicatedAliases = deduplicatedAliasesByCanonicalId.get(block.id) ?? [];
    const viewInfo = getDaejeonViewInfo(block);
    const hitAreaD = block.hitAreaD ?? block.imageGeometry.d;
    const hitAreaPoints = pathToPoints(hitAreaD);
    const labelPoint = [block.imageGeometry.labelX, block.imageGeometry.labelY];
    const hitStack = renderOrderedBlocks.filter((candidate) => (
      candidate.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      && isPointInsidePath(candidate.hitAreaD ?? candidate.imageGeometry.d, labelPoint)
    ));
    const labelTopHitBlockId = hitStack[hitStack.length - 1]?.id ?? null;
    const hitAreaArea = formatArea(polygonArea(hitAreaPoints));
    const coordinateImpact = coordinateImpactForBlock(anchorImpactByBlockId, block.id);

    return {
      id: block.id,
      parentId: block.parentId,
      officialSectionName: block.officialSectionName,
      name: block.name,
      parentBlock: block.parentBlock,
      blockCode: block.blockCode,
      officialBlockLabel: block.officialBlockLabel,
      sourceConfidence: block.sourceConfidence,
      selectable: isDaejeonSelectableSeatBlock(block),
      anchorCropIds: coordinateImpact.anchorCropIds,
      regressionTestIds: coordinateImpact.regressionTestIds,
      reviewPriority: coordinateImpact.reviewPriority,
      reviewPriorities: coordinateImpact.reviewPriorities,
      reviewMode: coordinateImpact.reviewMode,
      reviewModes: coordinateImpact.reviewModes,
      riskTags: coordinateImpact.riskTags,
      manualOnlyReasons: coordinateImpact.manualOnlyReasons,
      deduplicatedAliasIds: deduplicatedAliases.map((alias) => alias.retiredBlockId),
      deduplicatedAliasEvidenceCropPaths: deduplicatedAliases.map((alias) => alias.evidenceCropPath),
      traceStatus: block.traceStatus,
      traceStatusLabel: getDaejeonTraceStatusLabel(block.traceStatus),
      traceMethod: block.traceMethod,
      traceMethodLabel: getDaejeonTraceMethodLabel(block.traceMethod),
      reviewNote: block.reviewNote ?? '',
      queueSortOrder: queueItem?.sortOrder ?? '',
      queuePhase: queueItem?.phase ?? '',
      queueReason: queueItem?.reason ?? '',
      queueOperatorAction: queueItem?.operatorAction ?? '',
      labelX: block.imageGeometry.labelX,
      labelY: block.imageGeometry.labelY,
      hitAreaD,
      hitAreaArea,
      labelTopHitBlockId,
      labelTopHitOk: labelTopHitBlockId === block.id,
      labelHitStack: hitStack.map((candidate) => candidate.id),
      viewDistance: viewInfo.distance ?? '',
      viewNotes: viewInfo.notes ?? '',
      viewTags: viewInfo.tags ?? [],
    };
  });

  const hitAreaAreas = blockRows.map((block) => block.hitAreaArea).sort((a, b) => a - b);
  const pickPercentile = (values, percentile) => {
    if (values.length === 0) return 0;
    const index = Math.min(values.length - 1, Math.floor(values.length * percentile));
    return values[index];
  };

  const labelTopHitFailures = blockRows
    .filter((block) => block.traceStatus === 'OFFICIAL_IMAGE_TRACED' && !block.labelTopHitOk)
    .map((block) => ({
      id: block.id,
      officialBlockLabel: block.officialBlockLabel,
      labelTopHitBlockId: block.labelTopHitBlockId,
      labelHitStack: block.labelHitStack,
    }));

  const edgeSampleContractBlockIds = [
    'first-table-4f-301-413__301',
    'first-table-4f-301-413__302',
    ...Array.from({ length: 31 }, (_, index) => `skybox-s01-s37__s${String(index + 1).padStart(2, '0')}`),
  ];
  const blocksById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const edgeSampleRows = edgeSampleContractBlockIds.map((blockId) => {
    const block = blocksById.get(blockId);
    if (!block) {
      return {
        id: blockId,
        blockCode: '',
        samplePoint: null,
        topHitBlockId: null,
        ok: false,
        failure: 'missing block',
      };
    }

    const visualPoints = pathToPoints(block.imageGeometry.d);
    const candidateSamples = visualPoints.map((_, vertexIndex) => expandedVertexSample(block, vertexIndex));
    const samplePoint = candidateSamples.find((point) => (
      !isPointInsidePath(block.imageGeometry.d, point)
      && getTopHitBlockIdAtPoint(point) === block.id
    )) ?? candidateSamples[0] ?? null;
    const topHitBlockId = samplePoint ? getTopHitBlockIdAtPoint(samplePoint) : null;

    return {
      id: block.id,
      blockCode: block.blockCode,
      samplePoint,
      topHitBlockId,
      ok: topHitBlockId === block.id,
      failure: topHitBlockId === block.id ? '' : 'edge sample did not top-hit target block',
    };
  });
  const edgeSampleTopHitFailures = edgeSampleRows.filter((row) => !row.ok);

  const precisionAudit = {
    standard: 'JAMSIL_CLICK_ACCURACY_BASELINE',
    totalBlocks: DAEJEON_BLOCKS.length,
    manualGeometryBlocks: DAEJEON_BLOCKS.filter((block) => block.traceStatus === 'OFFICIAL_IMAGE_TRACED').length,
    labelTopHitFailures,
    labelTopHitFailureCount: labelTopHitFailures.length,
    edgeSampleTopHitFailures,
    edgeSampleTopHitFailureCount: edgeSampleTopHitFailures.length,
    edgeSampleContracts: edgeSampleRows,
    hitAreaArea: {
      min: formatArea(hitAreaAreas[0] ?? 0),
      p10: formatArea(pickPercentile(hitAreaAreas, 0.1)),
      median: formatArea(pickPercentile(hitAreaAreas, 0.5)),
      p90: formatArea(pickPercentile(hitAreaAreas, 0.9)),
      max: formatArea(hitAreaAreas[hitAreaAreas.length - 1] ?? 0),
      tinyHitAreas: blockRows
        .filter((block) => block.hitAreaArea < 10)
        .map((block) => block.id),
      largeHitAreas: blockRows
        .filter((block) => block.hitAreaArea > 5000)
        .map((block) => block.id),
    },
    regressionBlocks: [
      'innings-vip-400__400',
      'splash-jacuzzi-425__425',
      'splash-caravan-426__426',
    ],
    desktopFullLabelClickViewport: '>=1000px',
    note: 'Label top-hit은 운영 UI에서 실제 선택 가능한 OFFICIAL_IMAGE_TRACED 블록만 대상으로 산출합니다.',
  };

  const coordinateChangeImpact = buildCoordinateChangeImpact(blockRows);

  const traceReviewQueuePhaseRows = Object.entries(
    DAEJEON_TRACE_REVIEW_QUEUE.reduce((counts, item) => {
      counts[item.phase] = (counts[item.phase] ?? 0) + 1;
      return counts;
    }, {}),
  ).map(([phase, count]) => {
    const sampleBlockIds = DAEJEON_TRACE_REVIEW_QUEUE
      .filter((item) => item.phase === phase)
      .slice(0, 6)
      .map((item) => `\`${item.id}\``)
      .join('<br>');

    return [phase, String(count), sampleBlockIds];
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    asset: DAEJEON_SEATMAP_IMAGE,
    pixelComponentsReport: pixelComponentsPath,
    summary: DAEJEON_TRACE_REVIEW_SUMMARY,
    traceReviewQueue: DAEJEON_TRACE_REVIEW_QUEUE,
    deduplicatedAliases: DAEJEON_P2_DEDUPLICATED_ALIASES,
    anchorReviewCrops,
    releaseLock: {
      documentPath: releaseLockDocumentPath,
      traceManifestPath: path.join(outDir, 'daejeon-seatmap-trace-review.json'),
      traceSummaryPath: path.join(outDir, 'daejeon-seatmap-trace-review.md'),
      p2EvidencePath: path.join(outDir, 'daejeon-seatmap-p2-evidence-crops.md'),
      anchorCropIndexPath: path.join(anchorReviewOutputDir, 'daejeon-anchor-review-crops.md'),
      releaseGateReportPath,
      browserQaSummaryPath,
      requiredCommands: [
        'npm run qa:stadium:daejeon:release-lock',
      ],
    },
    precisionAudit,
    coordinateChangeImpact,
    groups: DAEJEON_BLOCK_GROUPS.map((group) => ({
      id: group.id,
      officialSectionName: group.officialSectionName,
      name: group.name,
      block: group.block,
      level: group.level,
      side: group.side,
      fanRole: group.fanRole,
      traceStatus: group.traceStatus,
      traceMethod: group.traceMethod,
      officialBlocks: group.officialBlocks,
      imageGeometry: group.imageGeometry,
    })),
    sectionCoverage: DAEJEON_SECTION_COVERAGE,
    blocks: blockRows,
  };

  const markdown = [
    '# 대전 한화생명볼파크 좌석도 좌표 검수 manifest',
    '',
    `- 공식 이미지: \`${DAEJEON_SEATMAP_IMAGE.requiredAssetFileName}\` (${DAEJEON_SEATMAP_IMAGE.imageWidth}x${DAEJEON_SEATMAP_IMAGE.imageHeight})`,
    `- source: ${DAEJEON_SEATMAP_IMAGE.sourceLabel}`,
    `- assetSha256: \`${DAEJEON_SEATMAP_IMAGE.assetSha256}\``,
    `- total blocks: ${DAEJEON_TRACE_REVIEW_SUMMARY.totalBlocks}`,
    `- official image traced: ${DAEJEON_TRACE_REVIEW_SUMMARY.officialImageTraced}`,
    `- needs operator review: ${DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview}`,
    `- pixel components: \`${path.relative(frontendRoot, pixelComponentsPath)}\``,
    `- release lock: \`${path.relative(frontendRoot, releaseLockDocumentPath)}\``,
    `- release gate report: \`${path.relative(frontendRoot, releaseGateReportPath)}\``,
    `- browser QA summary: \`${path.relative(frontendRoot, browserQaSummaryPath)}\``,
    `- label top-hit failures: ${precisionAudit.labelTopHitFailureCount}`,
    `- edge sample top-hit failures: ${precisionAudit.edgeSampleTopHitFailureCount}`,
    `- hit-area area: min ${precisionAudit.hitAreaArea.min}, median ${precisionAudit.hitAreaArea.median}, p90 ${precisionAudit.hitAreaArea.p90}, max ${precisionAudit.hitAreaArea.max}`,
    `- coordinate impact contract: \`${coordinateChangeImpact.contract}\``,
    '',
    '## 부모 구역별 pending 요약',
    '',
    markdownTable(
      ['parentId', 'officialSectionName', 'name', 'block', 'pending', 'total'],
      DAEJEON_TRACE_REVIEW_SUMMARY.pendingByParent.map((summary) => [
        `\`${summary.parentId}\``,
        summary.officialSectionName,
        summary.name,
        summary.block,
        String(summary.needsOperatorReview),
        String(summary.totalBlocks),
      ]),
    ),
    '',
    '## 공식 섹션별 pending 요약',
    '',
    markdownTable(
      ['officialSectionName', 'coverageStatus', 'pending', 'traced', 'total'],
      DAEJEON_TRACE_REVIEW_SUMMARY.pendingByOfficialSection.map((summary) => [
        summary.officialSectionName,
        summary.coverageStatus,
        String(summary.needsOperatorReview),
        String(summary.officialImageTraced),
        String(summary.totalBlocks),
      ]),
    ),
    '',
    '## 수동 tracing 작업 큐',
    '',
    markdownTable(
      ['phase', 'count', 'sample block ids'],
      traceReviewQueuePhaseRows,
    ),
    '',
    markdownTable(
      ['order', 'phase', 'block', 'section', 'method', 'action'],
      DAEJEON_TRACE_REVIEW_QUEUE.map((item) => [
        String(item.sortOrder),
        item.phase,
        `\`${item.id}\``,
        item.officialSectionName,
        item.traceMethod,
        item.operatorAction,
      ]),
    ),
    '',
    '## P2 deduplicated aliases',
    '',
    markdownTable(
      ['retired block', 'canonical owner', 'evidence', 'reason'],
      DAEJEON_P2_DEDUPLICATED_ALIASES.map((item) => [
        `\`${item.retiredBlockId}\``,
        `\`${item.canonicalBlockId}\``,
        item.evidenceCropPath,
        item.reason,
      ]),
    ),
    '',
    '## 잠실 기준 정밀도 검수',
    '',
    markdownTable(
      ['metric', 'value'],
      [
        ['기준', precisionAudit.standard],
        ['수동 geometry 블록', `${precisionAudit.manualGeometryBlocks}/${precisionAudit.totalBlocks}`],
        ['label top-hit 실패', String(precisionAudit.labelTopHitFailureCount)],
        ['edge sample top-hit 실패', String(precisionAudit.edgeSampleTopHitFailureCount)],
        ['작은 hit-area(<10)', String(precisionAudit.hitAreaArea.tinyHitAreas.length)],
        ['큰 hit-area(>5000)', String(precisionAudit.hitAreaArea.largeHitAreas.length)],
        ['전수 label click QA viewport', precisionAudit.desktopFullLabelClickViewport],
      ],
    ),
    '',
    '## Edge sample top-hit QA',
    '',
    edgeSampleTopHitFailures.length
      ? markdownTable(
        ['block', 'sample', 'top hit', 'failure'],
        edgeSampleTopHitFailures.map((row) => [
          `\`${row.id}\``,
          row.samplePoint ? row.samplePoint.join(',') : '-',
          row.topHitBlockId ? `\`${row.topHitBlockId}\`` : '-',
          row.failure,
        ]),
      )
      : '- all 301/302 and S01-S31 edge samples top-hit their target block',
    '',
    '## 좌표 변경 영향 범위',
    '',
    markdownTable(
      ['impact group', 'count', 'block ids'],
      [
        ['P0 crop coverage', String(coordinateChangeImpact.counts.p0), markdownBlockIdSummary(coordinateChangeImpact.p0BlockIds)],
        ['P1 crop coverage', String(coordinateChangeImpact.counts.p1), markdownBlockIdSummary(coordinateChangeImpact.p1BlockIds)],
        ['P2 auto regression coverage', String(coordinateChangeImpact.counts.p2Auto), markdownBlockIdSummary(coordinateChangeImpact.p2AutoBlockIds)],
        ['P2 manual crop-only coverage', String(coordinateChangeImpact.counts.p2ManualOnly), markdownBlockIdSummary(coordinateChangeImpact.p2ManualOnlyBlockIds)],
        ['auto regression blocks', String(coordinateChangeImpact.counts.autoRegression), markdownBlockIdSummary(coordinateChangeImpact.autoRegressionBlockIds)],
        ['manual crop-only blocks', String(coordinateChangeImpact.counts.manualCropOnly), markdownBlockIdSummary(coordinateChangeImpact.manualCropOnlyBlockIds)],
        ['traced without regression', String(coordinateChangeImpact.counts.tracedWithoutRegression), markdownBlockIdSummary(coordinateChangeImpact.tracedWithoutRegressionBlockIds)],
        ['missing impact mapping', String(coordinateChangeImpact.counts.missingImpact), markdownBlockIdSummary(coordinateChangeImpact.missingImpactBlockIds)],
      ],
    ),
    '',
    '## Anchor review crops',
    '',
    `- output dir: \`${path.relative(frontendRoot, anchorReviewOutputDir)}\``,
    '',
    markdownTable(
      ['crop', 'purpose', 'blocks', 'output'],
      anchorReviewCrops.map((crop) => [
        crop.id,
        crop.purpose,
        markdownBlockIdSummary(crop.blocks),
        `\`${path.relative(frontendRoot, crop.outputPath)}\``,
      ]),
    ),
    '',
    '## 면적 outlier 참고',
    '',
    markdownTable(
      ['type', 'blockIds'],
      [
        ['tiny', markdownBlockIdSummary(precisionAudit.hitAreaArea.tinyHitAreas)],
        ['large', markdownBlockIdSummary(precisionAudit.hitAreaArea.largeHitAreas)],
      ],
    ),
    '',
    '## 검수 방법',
    '',
    '1. `/stadium?daejeonDebug=1`에서 dashed parent boundary와 orange child boundary를 비교합니다.',
    '2. CSV의 `hitAreaD`, `labelX`, `labelY`를 기준으로 블록별 좌표를 보정합니다.',
    '3. 보정 완료된 child만 `traceStatus`를 `OFFICIAL_IMAGE_TRACED`로 올리고 `reviewNote`를 갱신합니다.',
    '4. 공식 이미지에서 판단할 수 없는 블록은 임의 좌표를 만들지 않고 `MANUAL_BASEBALL_DATA_REQUIRED` 검수 메모를 남깁니다.',
    '5. 릴리즈 전에는 `npm run qa:stadium:daejeon:release-lock`으로 `docs/daejeon-seatmap-release-lock.md`의 릴리즈 게이트를 모두 통과해야 합니다.',
    '',
  ].join('\n');

  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'daejeon-seatmap-trace-review.json');
  const csvPath = path.join(outDir, 'daejeon-seatmap-trace-review.csv');
  const markdownPath = path.join(outDir, 'daejeon-seatmap-trace-review.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'id',
      'parentId',
      'officialSectionName',
      'name',
      'parentBlock',
      'blockCode',
      'officialBlockLabel',
      'sourceConfidence',
      'selectable',
      'anchorCropIds',
      'regressionTestIds',
      'reviewPriority',
      'reviewPriorities',
      'reviewMode',
      'reviewModes',
      'riskTags',
      'manualOnlyReasons',
      'deduplicatedAliasIds',
      'deduplicatedAliasEvidenceCropPaths',
      'traceStatus',
      'traceStatusLabel',
      'traceMethod',
      'traceMethodLabel',
      'reviewNote',
      'queueSortOrder',
      'queuePhase',
      'queueReason',
      'queueOperatorAction',
      'labelX',
      'labelY',
      'hitAreaArea',
      'labelTopHitBlockId',
      'labelTopHitOk',
      'hitAreaD',
      'viewDistance',
      'viewNotes',
      'viewTags',
    ],
    ...blockRows.map((block) => [
      block.id,
      block.parentId,
      block.officialSectionName,
      block.name,
      block.parentBlock,
      block.blockCode,
      block.officialBlockLabel,
      block.sourceConfidence,
      block.selectable,
      block.anchorCropIds.join('|'),
      block.regressionTestIds.join('|'),
      block.reviewPriority,
      block.reviewPriorities.join('|'),
      block.reviewMode,
      block.reviewModes.join('|'),
      block.riskTags.join('|'),
      block.manualOnlyReasons.join('|'),
      block.deduplicatedAliasIds.join('|'),
      block.deduplicatedAliasEvidenceCropPaths.join('|'),
      block.traceStatus,
      block.traceStatusLabel,
      block.traceMethod,
      block.traceMethodLabel,
      block.reviewNote,
      block.queueSortOrder,
      block.queuePhase,
      block.queueReason,
      block.queueOperatorAction,
      block.labelX,
      block.labelY,
      block.hitAreaArea,
      block.labelTopHitBlockId ?? '',
      block.labelTopHitOk,
      block.hitAreaD,
      block.viewDistance,
      block.viewNotes,
      block.viewTags.join('|'),
    ]),
  ]);
  await fs.writeFile(markdownPath, markdown, 'utf8');

  console.log(`manifest_json:${jsonPath}`);
  console.log(`manifest_csv:${csvPath}`);
  console.log(`manifest_markdown:${markdownPath}`);
  console.log(`status:ok total=${DAEJEON_TRACE_REVIEW_SUMMARY.totalBlocks} review=${DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview} traced=${DAEJEON_TRACE_REVIEW_SUMMARY.officialImageTraced} labelTopHitFailures=${precisionAudit.labelTopHitFailureCount}`);
};

const TASKS = {
  "anchor-review-crops": runAnchorReviewCrops,
  "anchor-visual-diff": runAnchorVisualDiff,
  "block-evidence-crops": runBlockEvidenceCrops,
  "change-guard": runChangeGuard,
  "coverage-report": runCoverageReport,
  "evidence-crops": runEvidenceCrops,
  "geometry-diff": runGeometryDiff,
  "operator-approval": runOperatorApproval,
  "operator-handoff": runOperatorHandoff,
  "pixel-align-audit": runPixelAlignAudit,
  "pixel-components": runPixelComponents,
  "release-gate": runReleaseGate,
  "review-manifest": runReviewManifest,
};

export const runDaejeonSeatmapTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Daejeon seatmap task: ${task}. Available tasks: ${available}`);
  }

  const originalArgv = process.argv;
  process.argv = [originalArgv[0], originalArgv[1], ...args];
  try {
    await runner(args);
  } finally {
    process.argv = originalArgv;
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [task, ...args] = process.argv.slice(2);
  await runDaejeonSeatmapTask(task, args);
}
