/**
 * Jamsil Baseball Stadium seatmap operations.
 *
 * Tasks:
 *   release-gate  — Verify geometry fixture fingerprint + asset SHA256 have not drifted.
 *
 * Usage:
 *   node --import tsx scripts/jamsil-seatmap-ops.mjs release-gate
 *   node scripts/stadium-seatmap-ops.mjs jamsil release-gate
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');

// ─── Release-gate constants ──────────────────────────────────────────────────
//  Update these values after the first successful run.
const EXPECTED_TOTAL_BLOCKS = 109;
const EXPECTED_OFFICIAL_ASSET_SHA256 = 'e0d7aa65372ebf6b206ce519f8ed4e73e64232377ec9ace2b871be7a57e8537b';
const EXPECTED_RELEASE_FIXTURE_FINGERPRINT = '4ed2c6ba5a647d0ca68e8540e801164031c09153ab3d1af3e1bd15da920d272e';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function snapshotFixture(blocks) {
  const sorted = blocks
    .map((b) => ({
      id: b.id,
      block: b.block,
      level: b.level,
      category: b.category,
      d: b.imageGeometry.d,
      labelX: b.imageGeometry.labelX,
      labelY: b.imageGeometry.labelY,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify({ blocks: sorted });
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
const runReleaseGate = async () => {
  const { JAMSIL_BLOCKS, JAMSIL_SEATMAP_IMAGE } = await import(
    '../src/data/jamsilSeatData.ts'
  );

  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const reportJsonPath = path.join(reportDir, 'jamsil-seatmap-release-gate.json');
  const reportMarkdownPath = path.join(reportDir, 'jamsil-seatmap-release-gate.md');

  const packageSource = await fs.readFile(path.join(frontendRoot, 'package.json'), 'utf8');
  const dispatcherSource = await fs.readFile(path.join(frontendRoot, 'scripts/stadium-seatmap-ops.mjs'), 'utf8');
  const releaseLockSource = await fs.readFile(path.join(frontendRoot, 'docs/jamsil-seatmap-release-lock.md'), 'utf8');
  const assetBuffer = await fs.readFile(path.join(frontendRoot, JAMSIL_SEATMAP_IMAGE.imagePath));

  const releaseFixtureFingerprint = sha256(snapshotFixture(JAMSIL_BLOCKS));
  const officialAssetSha256 = sha256(assetBuffer);

  const summary = {
    totalBlocks: JAMSIL_BLOCKS.length,
    releaseFixtureFingerprint,
    officialAssetSha256,
  };

  const checks = [
    ['total blocks', summary.totalBlocks === EXPECTED_TOTAL_BLOCKS],
    ['official asset sha256', summary.officialAssetSha256 === EXPECTED_OFFICIAL_ASSET_SHA256],
    ['release fixture fingerprint', summary.releaseFixtureFingerprint === EXPECTED_RELEASE_FIXTURE_FINGERPRINT],
    ['package mobile script', packageSource.includes('"qa:stadium:jamsil:mobile": "node scripts/stadium-seatmap-ops.mjs jamsil mobile"')],
    ['package full script', packageSource.includes('"qa:stadium:jamsil:full": "node scripts/stadium-seatmap-ops.mjs jamsil full"')],
    ['package release lock script', packageSource.includes('"qa:stadium:jamsil:release-lock": "node scripts/stadium-seatmap-ops.mjs jamsil release-gate"')],
    ['package status script', packageSource.includes('"stadium:jamsil:status": "node scripts/stadium-seatmap-ops.mjs jamsil status"')],
    ['package responsive script removed', !packageSource.includes('"qa:stadium:jamsil:responsive"')],
    ['dispatcher responsive task', dispatcherSource.includes('responsive: [')],
    ['dispatcher responsive policy', dispatcherSource.includes('responsive QA remains dispatcher-internal')],
    ['release lock document includes internal responsive task', releaseLockSource.includes('node scripts/stadium-seatmap-ops.mjs jamsil responsive')],
  ].map(([label, passed]) => ({ label, passed }));

  const failures = checks.filter((c) => !c.passed).map((c) => c.label);
  const report = {
    generatedAt: new Date().toISOString(),
    status: failures.length === 0 ? 'passed' : 'failed',
    summary,
    checks,
    failures,
  };

  const markdown = [
    '# Jamsil Seatmap Release Gate',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- totalBlocks: ${summary.totalBlocks}`,
    `- officialAssetSha256: ${summary.officialAssetSha256}`,
    `- releaseFixtureFingerprint: ${summary.releaseFixtureFingerprint}`,
    '',
    '## Checks',
    '',
    ...checks.map((c) => `- ${c.passed ? 'PASS' : 'FAIL'} ${c.label}`),
    '',
    ...(failures.length > 0 ? ['## Failures', '', ...failures.map((f) => `- ${f}`), ''] : []),
  ].join('\n');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(reportMarkdownPath, markdown);

  if (failures.length > 0) {
    failures.forEach((f) => console.error(`[jamsil-release-gate] failure: ${f}`));
    console.error('[jamsil-release-gate] failed');
    console.error(`[jamsil-release-gate] report=${reportJsonPath}`);

    // Print actual values to make it easy to update the constants
    if (summary.officialAssetSha256 !== EXPECTED_OFFICIAL_ASSET_SHA256) {
      console.error(`[jamsil-release-gate] actual officialAssetSha256=${summary.officialAssetSha256}`);
    }
    if (summary.releaseFixtureFingerprint !== EXPECTED_RELEASE_FIXTURE_FINGERPRINT) {
      console.error(`[jamsil-release-gate] actual releaseFixtureFingerprint=${summary.releaseFixtureFingerprint}`);
    }

    process.exit(1);
  }

  console.log('[jamsil-release-gate] passed');
  console.log(`[jamsil-release-gate] report=${reportJsonPath}`);
};

const TASKS = {
  'release-gate': runReleaseGate,
};

const [, , task, ...rest] = process.argv;
const runner = TASKS[task];
if (!runner) {
  console.error(`Unknown task: ${task}. Available: ${Object.keys(TASKS).join(', ')}`);
  process.exit(1);
}
runner(rest);
