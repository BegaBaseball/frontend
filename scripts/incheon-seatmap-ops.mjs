/**
 * Incheon SSG Landers Field seatmap operations.
 *
 * Tasks:
 *   release-gate  — Verify geometry fixture fingerprint + asset SHA256 have not drifted.
 *
 * Usage:
 *   node --import tsx scripts/incheon-seatmap-ops.mjs release-gate
 *   node scripts/stadium-seatmap-ops.mjs incheon release-gate
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  exitWithStatus,
  nodeStep,
  runTaskMapCli,
  runTaskSteps,
} from './lib/stadium-task-runner.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');

// ─── Release-gate constants ──────────────────────────────────────────────────
//  Update these values after the first successful run.
const EXPECTED_TOTAL_BLOCKS = 156;
const EXPECTED_OFFICIAL_BLOCKS = 156; // sourceConfidence === 'OFFICIAL'
const EXPECTED_OFFICIAL_ASSET_SHA256 = 'e1b0a20680f6b9ce8832a4af92d19c09a5abec987f5b8378d619f6746487b8d5';
const EXPECTED_RELEASE_FIXTURE_FINGERPRINT = 'ff1421f842dba83886df3a06eb800ed6b155391045705a3db29156d67e171852';

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
  const { INCHEON_BLOCKS, INCHEON_SEATMAP_IMAGE } = await import(
    '../src/data/incheonSeatData.ts'
  );

  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const reportJsonPath = path.join(reportDir, 'incheon-seatmap-release-gate.json');
  const reportMarkdownPath = path.join(reportDir, 'incheon-seatmap-release-gate.md');

  const packageSource = await fs.readFile(path.join(frontendRoot, 'package.json'), 'utf8');
  const dispatcherSource = await fs.readFile(path.join(frontendRoot, 'scripts/stadium-seatmap-ops.mjs'), 'utf8');
  const releaseLockSource = await fs.readFile(path.join(frontendRoot, 'docs/incheon-seatmap-release-lock.md'), 'utf8');
  const assetBuffer = await fs.readFile(path.join(frontendRoot, INCHEON_SEATMAP_IMAGE.imagePath));

  const officialBlocks = INCHEON_BLOCKS.filter((b) => b.sourceConfidence === 'OFFICIAL');
  const releaseFixtureFingerprint = sha256(snapshotFixture(INCHEON_BLOCKS));
  const officialAssetSha256 = sha256(assetBuffer);

  const summary = {
    totalBlocks: INCHEON_BLOCKS.length,
    officialBlocks: officialBlocks.length,
    releaseFixtureFingerprint,
    officialAssetSha256,
  };

  const checks = [
    ['total blocks', summary.totalBlocks === EXPECTED_TOTAL_BLOCKS],
    ['official blocks (all 156 must be OFFICIAL)', summary.officialBlocks === EXPECTED_OFFICIAL_BLOCKS],
    ['official asset sha256', summary.officialAssetSha256 === EXPECTED_OFFICIAL_ASSET_SHA256],
    ['release fixture fingerprint', summary.releaseFixtureFingerprint === EXPECTED_RELEASE_FIXTURE_FINGERPRINT],
    ['package mobile script', packageSource.includes('"qa:stadium:incheon:mobile": "node scripts/qa-presets.mjs stadium incheon mobile"')],
    ['package full script', packageSource.includes('"qa:stadium:incheon:full": "node scripts/qa-presets.mjs stadium incheon full"')],
    ['package release lock script', packageSource.includes('"qa:stadium:incheon:release-lock": "node scripts/qa-presets.mjs stadium incheon release-gate"')],
    ['package status script', packageSource.includes('"stadium:incheon:status": "node scripts/qa-presets.mjs stadium incheon status"')],
    ['package responsive script absent', !packageSource.includes('"qa:stadium:incheon:responsive"')],
    ['package trace review script absent', !packageSource.includes('"qa:stadium:incheon:trace-review"')],
    ['package pixel components script absent', !packageSource.includes('"stadium:incheon:pixel-components"')],
    ['dispatcher public task policy', dispatcherSource.includes('package aliases expose only mobile/full runtime QA, release lock, and status')],
    ['release lock document includes public commands', releaseLockSource.includes('## 공개 명령')],
    ['release lock document includes current fixture fingerprint', releaseLockSource.includes(EXPECTED_RELEASE_FIXTURE_FINGERPRINT)],
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
    '# Incheon Seatmap Release Gate',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- totalBlocks: ${summary.totalBlocks}`,
    `- officialBlocks: ${summary.officialBlocks}`,
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
    failures.forEach((f) => console.error(`[incheon-release-gate] failure: ${f}`));
    console.error('[incheon-release-gate] failed');
    console.error(`[incheon-release-gate] report=${reportJsonPath}`);

    // Print actual values to make it easy to update the constants
    if (summary.officialAssetSha256 !== EXPECTED_OFFICIAL_ASSET_SHA256) {
      console.error(`[incheon-release-gate] actual officialAssetSha256=${summary.officialAssetSha256}`);
    }
    if (summary.releaseFixtureFingerprint !== EXPECTED_RELEASE_FIXTURE_FINGERPRINT) {
      console.error(`[incheon-release-gate] actual releaseFixtureFingerprint=${summary.releaseFixtureFingerprint}`);
    }

    process.exit(1);
  }

  console.log('[incheon-release-gate] passed');
  console.log(`[incheon-release-gate] report=${reportJsonPath}`);
};

const TASKS = {
  full: [
    nodeStep(['scripts/stadium-seatmap-ops.mjs', 'incheon', 'full'], { passArgs: true }),
  ],
  mobile: [
    nodeStep(['scripts/stadium-seatmap-ops.mjs', 'incheon', 'mobile'], { passArgs: true }),
  ],
  'release-gate': [
    { run: runReleaseGate },
  ],
};

const [, , rawTaskName = 'status', ...rest] = process.argv;

const status = await runTaskMapCli({
  args: [rawTaskName, ...rest],
  context: {
    cwd: frontendRoot,
    taskLabel: 'Incheon',
    tasks: TASKS,
  },
  enableHelp: false,
  onStatus: (passthroughArgs) => runTaskSteps(
    {
      cwd: frontendRoot,
      tasks: TASKS,
    },
    rawTaskName,
    [nodeStep(['scripts/stadium-seatmap-ops.mjs', 'incheon', 'status'])],
    passthroughArgs,
    [rawTaskName],
  ),
  tasks: TASKS,
  unknownTaskLines: ({ rawTaskName: unknownTaskName, availableTasks }) => [
    `Unknown task for incheon: ${unknownTaskName}`,
    `Available tasks: status, ${availableTasks.join(', ')}`,
  ],
});
exitWithStatus(status);
