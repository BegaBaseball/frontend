import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SUWON_ALIGNMENT_PROBES,
  SUWON_BROWSER_QA_PROBES,
  SUWON_BLOCKS,
  SUWON_HIT_GEOMETRY_EXCEPTION_NOTES,
  SUWON_HIT_TEST_PROBES,
  SUWON_SEATMAP_IMAGE,
  SUWON_TRACE_REVIEW_SUMMARY,
} from '../src/data/suwonSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const reportJsonPath = path.join(reportDir, 'suwon-seatmap-release-gate.json');
const reportMarkdownPath = path.join(reportDir, 'suwon-seatmap-release-gate.md');

const EXPECTED_TOTAL_BLOCKS = 176;
const EXPECTED_NUMERIC_BLOCKS = 126;
const EXPECTED_SKYBOX_BLOCKS = 35;
const EXPECTED_SKYZONE_BLOCKS = 32;
const EXPECTED_SPECIAL_BLOCKS = 15;
const EXPECTED_ALIGNMENT_PROBES = 556;
const EXPECTED_BROWSER_QA_PROBES = 176;
const EXPECTED_HIT_TEST_PROBES = 732;
const EXPECTED_RELEASE_FIXTURE_FINGERPRINT = '4b6c7bd784bb18cad7fcdbc5ffb12f78daabf968d691647b69456b3bd74aeeaf';
const EXPECTED_OFFICIAL_ASSET_SHA256 = 'a66c73dcf2a228015b51bd3627ed2288340410369bbaeebedb236c5630877627';

const skyboxIds = Array.from({ length: 35 }, (_, index) => `suwon-sb${index + 1}`);
const sortedSkyboxIds = [...skyboxIds].sort((a, b) => a.localeCompare(b));

function probeKey(id, point) {
  return `${id}:${point[0]},${point[1]}`;
}

function snapshotSuwonSeatFixture() {
  const blocksSnapshot = SUWON_BLOCKS
    .map((block) => ({
      ...block,
      officialBlocks: [...block.officialBlocks],
      seatViewSections: [...block.seatViewSections],
      imageGeometry: { ...block.imageGeometry },
      hitGeometry: { ...block.hitGeometry },
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((block) => ({
      ...block,
      imageGeometry: { ...block.imageGeometry, shortLabel: block.imageGeometry.shortLabel },
      hitGeometry: { ...block.hitGeometry, shortLabel: block.hitGeometry.shortLabel },
    }));

  const alignmentProbeSnapshot = SUWON_ALIGNMENT_PROBES
    .map((probe) => ({ id: probe.id, point: [...probe.point], note: probe.note }))
    .sort((a, b) => probeKey(a.id, a.point).localeCompare(probeKey(b.id, b.point)));

  const browserQaProbeSnapshot = SUWON_BROWSER_QA_PROBES
    .map((probe) => ({ id: probe.id, point: [...probe.point], note: probe.note }))
    .sort((a, b) => probeKey(a.id, a.point).localeCompare(probeKey(b.id, b.point)));

  const hitTestProbeSnapshot = SUWON_HIT_TEST_PROBES
    .map((probe) => ({ id: probe.id, point: [...probe.point], note: probe.note }))
    .sort((a, b) => probeKey(a.id, a.point).localeCompare(probeKey(b.id, b.point)));

  return JSON.stringify({
    blocks: blocksSnapshot,
    alignmentProbes: alignmentProbeSnapshot,
    browserQaProbes: browserQaProbeSnapshot,
    hitTestProbes: hitTestProbeSnapshot,
  });
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function readText(filePath) {
  return fs.readFile(path.join(frontendRoot, filePath), 'utf8');
}

async function buildReport() {
  const source = await readText('src/data/suwonSeatData.ts');
  const releaseLockSource = await readText('docs/suwon-seatmap-release-lock.md');
  const packageSource = await readText('package.json');
  const visualReviewSource = await readText('scripts/suwon-seatmap-visual-review.mjs');
  const precisionWorksetSource = await readText('scripts/suwon-seatmap-precision-workset.mjs');
  const assetBuffer = await fs.readFile(path.join(frontendRoot, SUWON_SEATMAP_IMAGE.imagePath));
  const releaseFixtureFingerprint = sha256(snapshotSuwonSeatFixture());
  const officialAssetSha256 = sha256(assetBuffer);
  const visualHitMismatchIds = SUWON_BLOCKS
    .filter((block) => block.imageGeometry.d !== block.hitGeometry.d)
    .map((block) => block.id)
    .sort((a, b) => a.localeCompare(b));
  const hitExceptionIds = Object.keys(SUWON_HIT_GEOMETRY_EXCEPTION_NOTES);
  const hitExceptionIdSet = new Set(hitExceptionIds);
  const approvedVisualHitSplitIds = visualHitMismatchIds
    .filter((id) => hitExceptionIdSet.has(id))
    .sort((a, b) => a.localeCompare(b));
  const unresolvedVisualHitMismatchIds = visualHitMismatchIds
    .filter((id) => !hitExceptionIdSet.has(id))
    .sort((a, b) => a.localeCompare(b));
  const unusedHitExceptionIds = hitExceptionIds
    .filter((id) => !visualHitMismatchIds.includes(id))
    .sort((a, b) => a.localeCompare(b));

  const summary = {
    totalBlocks: SUWON_BLOCKS.length,
    numericBlocks: SUWON_BLOCKS.filter((block) => /^suwon-\d+$/.test(block.id)).length,
    skyboxBlocks: SUWON_BLOCKS.filter((block) => /^suwon-sb\d+$/.test(block.id)).length,
    skyzoneBlocks: SUWON_BLOCKS.filter((block) => /^suwon-4\d\d$/.test(block.id)).length,
    specialSelectableAreas: SUWON_BLOCKS.filter((block) => !/^suwon-(\d+|sb\d+)$/.test(block.id)).length,
    officialImageTraced: SUWON_TRACE_REVIEW_SUMMARY.officialImageTraced,
    draftApproximate: SUWON_TRACE_REVIEW_SUMMARY.draftApproximate,
    pendingBlockIds: SUWON_TRACE_REVIEW_SUMMARY.pendingBlockIds,
    browserQaProbes: SUWON_BROWSER_QA_PROBES.length,
    alignmentProbes: SUWON_ALIGNMENT_PROBES.length,
    hitTestProbes: SUWON_HIT_TEST_PROBES.length,
    visualHitMismatchBlocks: visualHitMismatchIds.length,
    approvedVisualHitSplitBlocks: approvedVisualHitSplitIds.length,
    unresolvedVisualHitMismatchBlocks: unresolvedVisualHitMismatchIds.length,
    hitGeometryExceptions: hitExceptionIds.length,
    unusedHitGeometryExceptionNotes: unusedHitExceptionIds.length,
    releaseFixtureFingerprint,
    officialAssetSha256,
  };

  const checks = [
    ['total blocks', summary.totalBlocks === EXPECTED_TOTAL_BLOCKS],
    ['numeric block count', summary.numericBlocks === EXPECTED_NUMERIC_BLOCKS],
    ['skybox block count', summary.skyboxBlocks === EXPECTED_SKYBOX_BLOCKS],
    ['skyzone block count', summary.skyzoneBlocks === EXPECTED_SKYZONE_BLOCKS],
    ['special selectable area count', summary.specialSelectableAreas === EXPECTED_SPECIAL_BLOCKS],
    ['official image traced count', summary.officialImageTraced === EXPECTED_TOTAL_BLOCKS],
    ['draft approximate count', summary.draftApproximate === 0],
    ['pending block ids', summary.pendingBlockIds.length === 0],
    ['browser QA probe count', summary.browserQaProbes === EXPECTED_BROWSER_QA_PROBES],
    ['alignment probe count', summary.alignmentProbes === EXPECTED_ALIGNMENT_PROBES],
    ['hit test probe count', summary.hitTestProbes === EXPECTED_HIT_TEST_PROBES],
    ['visual/hit mismatch ids are skybox only', JSON.stringify(visualHitMismatchIds) === JSON.stringify(sortedSkyboxIds)],
    ['approved visual/hit split ids are skybox only', JSON.stringify(approvedVisualHitSplitIds) === JSON.stringify(sortedSkyboxIds)],
    ['unresolved visual/hit mismatch ids are empty', unresolvedVisualHitMismatchIds.length === 0],
    ['hit exception ids are SB1-SB35 only', JSON.stringify(hitExceptionIds) === JSON.stringify(skyboxIds)],
    ['hit exception notes are all used by visual/hit splits', unusedHitExceptionIds.length === 0],
    ['release fixture fingerprint', summary.releaseFixtureFingerprint === EXPECTED_RELEASE_FIXTURE_FINGERPRINT],
    ['official asset sha256', summary.officialAssetSha256 === EXPECTED_OFFICIAL_ASSET_SHA256],
    ['package release lock script', packageSource.includes('"qa:stadium:suwon:release-lock": "node --import tsx scripts/suwon-seatmap-release-gate.mjs"')],
    ['package visual review script', packageSource.includes('"stadium:suwon:visual-review": "node --import tsx scripts/suwon-seatmap-visual-review.mjs"')],
    ['package precision workset script', packageSource.includes('"stadium:suwon:precision-workset": "npm run stadium:suwon:visual-review && node --import tsx scripts/suwon-seatmap-precision-workset.mjs"')],
    ['package visual review qa script', packageSource.includes('"qa:stadium:suwon:visual-review": "npm run stadium:suwon:visual-review && npm run qa:stadium:suwon:release-lock"')],
    ['release lock document includes release gate script', releaseLockSource.includes('npm run qa:stadium:suwon:release-lock')],
    ['release lock document includes visual review script', releaseLockSource.includes('npm run stadium:suwon:visual-review')],
    ['visual review artifact contract', visualReviewSource.includes('suwon-seatmap-visual-review.json') && visualReviewSource.includes('suwon-infield-1f-overlay.svg') && visualReviewSource.includes('suwon-infield-2f-overlay.svg') && visualReviewSource.includes('suwon-infield-3f-overlay.svg') && visualReviewSource.includes('suwon-center-accessible-overlay.svg') && visualReviewSource.includes('suwon-outfield-special-overlay.svg') && visualReviewSource.includes('suwon-highfive-overlay.svg') && visualReviewSource.includes('suwon-205-215-overlay.svg') && visualReviewSource.includes('suwon-skybox-skyzone-overlay.svg')],
    ['visual review full coverage contract', visualReviewSource.includes('EXPECTED_REVIEWED_BLOCKS') && visualReviewSource.includes('missingReviewRows') && visualReviewSource.includes('missingReviewBlocks') && visualReviewSource.includes('duplicateReviewBlocks')],
    ['visual review split approval contract', visualReviewSource.includes('APPROVED_VISUAL_HIT_SPLIT') && visualReviewSource.includes('UNRESOLVED_VISUAL_HIT_MISMATCH') && visualReviewSource.includes('approvedVisualHitSplitBlocks') && visualReviewSource.includes('unresolvedVisualHitMismatchBlocks')],
    ['visual review large-area approval contract', visualReviewSource.includes('APPROVED_LARGE_VISUAL_AREA') && visualReviewSource.includes('APPROVED_LARGE_VISUAL_AREA_NOTES') && visualReviewSource.includes('largeVisualAreaApproved') && visualReviewSource.includes('approvedLargeVisualAreaBlocks')],
    ['precision workset artifact contract', precisionWorksetSource.includes('suwon-seatmap-precision-workset.json') && precisionWorksetSource.includes('suwon-seatmap-precision-workset.md')],
    ['precision workset full coverage contract', precisionWorksetSource.includes('EXPECTED_WORKSET_BLOCKS') && precisionWorksetSource.includes('missingWorksetRows') && precisionWorksetSource.includes('duplicateWorksetBlocks')],
    ['precision workset priority contract', precisionWorksetSource.includes('REQUIRED_P0_BLOCK_IDS') && precisionWorksetSource.includes('REQUIRED_P1_BLOCK_IDS') && precisionWorksetSource.includes('requiredP0MissingBlocks') && precisionWorksetSource.includes('requiredP1MissingBlocks')],
    ['no generated row/cell visual geometry', !source.includes('officialRowCellGeometries') && !source.includes('rowCellGeometry')],
    ['no generated skybox production geometry', !source.includes('skyboxGeometry(') && !source.includes('Array.from({ length: 35 }')],
  ].map(([label, passed]) => ({ label, passed }));

  const failures = checks.filter((check) => !check.passed).map((check) => check.label);
  return {
    generatedAt: new Date().toISOString(),
    status: failures.length === 0 ? 'passed' : 'failed',
    summary,
    approvedVisualHitSplitIds,
    unresolvedVisualHitMismatchIds,
    unusedHitExceptionIds,
    checks,
    failures,
  };
}

function markdown(report) {
  return [
    '# Suwon Seatmap Release Gate',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- totalBlocks: ${report.summary.totalBlocks}`,
    `- browserQaProbes: ${report.summary.browserQaProbes}`,
    `- alignmentProbes: ${report.summary.alignmentProbes}`,
    `- hitTestProbes: ${report.summary.hitTestProbes}`,
    `- visualHitMismatchBlocks: ${report.summary.visualHitMismatchBlocks}`,
    `- approvedVisualHitSplitBlocks: ${report.summary.approvedVisualHitSplitBlocks}`,
    `- unresolvedVisualHitMismatchBlocks: ${report.summary.unresolvedVisualHitMismatchBlocks}`,
    `- hitGeometryExceptions: ${report.summary.hitGeometryExceptions}`,
    `- unusedHitGeometryExceptionNotes: ${report.summary.unusedHitGeometryExceptionNotes}`,
    `- releaseFixtureFingerprint: ${report.summary.releaseFixtureFingerprint}`,
    `- officialAssetSha256: ${report.summary.officialAssetSha256}`,
    '',
    '## Checks',
    '',
    ...report.checks.map((check) => `- ${check.passed ? 'PASS' : 'FAIL'} ${check.label}`),
    '',
  ].join('\n');
}

const report = await buildReport();
await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await fs.writeFile(reportMarkdownPath, markdown(report), 'utf8');

console.log(`[suwon-release-gate] ${report.status}`);
console.log(`[suwon-release-gate] report=${reportJsonPath}`);
console.log(`[suwon-release-gate] summary=${reportMarkdownPath}`);

if (report.status !== 'passed') {
  report.failures.forEach((failure) => {
    console.error(`[suwon-release-gate] failure: ${failure}`);
  });
  process.exit(1);
}
