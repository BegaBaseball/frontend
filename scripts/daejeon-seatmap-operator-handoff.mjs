import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const releaseGatePath = path.join(reportDir, 'daejeon-seatmap-release-gate.json');
const handoffJsonPath = path.join(reportDir, 'daejeon-seatmap-operator-handoff.json');
const handoffMarkdownPath = path.join(reportDir, 'daejeon-seatmap-operator-handoff.md');

const EXPECTED_BLOCKS = 145;
const EXPECTED_TRACED = 145;
const EXPECTED_REVIEW = 0;
const EXPECTED_P2_ALIASES = 11;
const EXPECTED_ANCHOR_CROPS = 26;

const approvalChecklist = [
  'Trace manifest의 totalBlocks=145, officialImageTraced=145, needsOperatorReview=0을 확인했습니다.',
  'labelTopHitFailures=0을 확인했습니다.',
  'coverage report의 missingLabelTopHit=0, missingAnchorWithoutException=0, missingOwnerPointRequired=0을 확인했습니다.',
  'coordinateChangeImpactSummary에서 missingImpact=0이고 좌표 변경 시 재검수할 crop/test 역매핑을 확인했습니다.',
  'anchor visual diff가 baseline과 일치하며 changedCropCount=0임을 확인했습니다.',
  'geometry fingerprint diff가 baseline과 일치하며 changedBlockCount=0임을 확인했습니다.',
  'home-100, first-101-109, third-121-124, first/third 4층 탁자석, outfield-upper-500-509, skybox S01-S37, special crop을 공식 PNG와 비교했습니다.',
  'P2 retired alias 11개가 운영 geometry가 아닌 canonical owner evidence로만 남아 있음을 확인했습니다.',
  '?daejeonDebug=1에서 100B/105/108/115/120/124/200/301/302/401/404/409/413/400/425/426/500/501/508/509를 확인했습니다.',
  '모바일 390px와 데스크톱 1440px QA summary가 passed이며 overflow 0임을 확인했습니다.',
  'visible highlight는 imageGeometry.d, click path는 hitAreaD ?? imageGeometry.d 계약을 유지합니다.',
];

const lockedDecisions = [
  '운영 선택 블록은 145개만 유지합니다.',
  'P2 retired alias 11개는 운영 SVG/finder/업로드 선택지로 복구하지 않습니다.',
  '공식 PNG natural size와 좌표계는 920x1060으로 고정합니다.',
  '좌표를 추측하거나 자동 rect/interpolation을 OFFICIAL_IMAGE_TRACED로 승격하지 않습니다.',
  'anchor visual baseline은 운영자 검수 없이 갱신하지 않습니다.',
  'geometry fingerprint baseline은 운영자 검수 없이 갱신하지 않습니다.',
  '공식 이미지 변경 또는 좌표 변경 시 release-lock gate와 change-guard를 다시 통과해야 합니다.',
  '외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사는 사용하지 않습니다.',
];

const keyAnchorCropIds = [
  'home-100',
  'first-101-109',
  'first-109-112-sequence',
  'cass-200-detail',
  'third-121-124',
  'first-4f-table-301-413-sequence',
  'third-4f-table-414-330-sequence',
  'outfield-upper-500-509-sequence',
  'skybox-s01-s12-sequence',
  'skybox-s13-s25-sequence',
  'skybox-s26-s37-sequence',
  'special-400-accessible-first',
  'special-425-426-third-accessible',
  'special-accessible-center',
  'special-accessible-outfield-third',
];
const rejectionConditions = [
  'coverage report에서 LOCKED가 145가 아니거나 LABEL_ONLY/PARTIAL이 0이 아닙니다.',
  'anchor crop에서 visible path가 공식 PNG 색상 셀 밖으로 벗어납니다.',
  'trace manifest에서 labelTopHitFailures가 0이 아닙니다.',
  'anchor visual diff에서 changedCropCount 또는 metadataMismatchCount가 0이 아닙니다.',
  'geometry fingerprint diff에서 changedBlockCount, missingBlockCount, extraBlockCount가 0이 아닙니다.',
  'retired P2 alias 11개 중 하나라도 운영 SVG/finder/업로드 선택지로 복구됩니다.',
  '브라우저 QA에서 모바일 390px 또는 데스크톱 1440px overflow가 발생합니다.',
  'visible highlight가 imageGeometry.d가 아니라 hitAreaD를 사용해 실제 블록보다 커 보입니다.',
  '공식 PNG natural size 또는 SVG viewBox가 920x1060 계약에서 벗어납니다.',
];
const approvalCommands = [
  'npm run qa:stadium:daejeon:release-lock',
  'npm run stadium:daejeon:operator-approval',
  'npm run stadium:daejeon:operator-approval:status',
  'npm run stadium:daejeon:operator-approval:approve -- --approved-by "operator-name" --notes "검수 완료"',
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
      reviewFocus: crop.reviewFocus ?? '공식 PNG와 overlay path 정렬 확인',
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
    '1. `reports/stadium/daejeon-seatmap-trace-review.md`에서 145/145/0 상태를 확인합니다.',
    '2. `reports/stadium/daejeon-seatmap-coverage-report.md`에서 PARTIAL=0, missing count=0 상태를 확인합니다.',
    '3. `reports/stadium/daejeon-seatmap-geometry-diff.md`에서 changedBlockCount=0 상태를 확인합니다.',
    '4. `../output/playwright/daejeon-anchor-review/daejeon-anchor-review-crops.md`의 key anchor crop을 공식 PNG와 비교합니다.',
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
    '좌표, 공식 PNG, evidence, handoff가 변경되면 release-lock gate부터 다시 통과한 뒤 재승인합니다.',
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
