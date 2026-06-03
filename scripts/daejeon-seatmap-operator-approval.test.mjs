import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { main } from './daejeon-seatmap-ops.mjs';

const fixedNow = '2026-05-10T09:00:00.000Z';
const approvedNow = '2026-05-10T09:05:00.000Z';
const handoffGeneratedAt = '2026-05-10T08:50:00.000Z';
const releaseGateGeneratedAt = '2026-05-10T08:45:00.000Z';

const createFixture = async (t) => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'daejeon-operator-approval-'));
  const reportDir = path.join(rootDir, 'reports/stadium');
  await fs.mkdir(reportDir, { recursive: true });

  const paths = {
    reportDir,
    handoffJsonPath: path.join(reportDir, 'daejeon-seatmap-operator-handoff.json'),
    handoffMarkdownPath: path.join(reportDir, 'daejeon-seatmap-operator-handoff.md'),
    releaseGateJsonPath: path.join(reportDir, 'daejeon-seatmap-release-gate.json'),
    approvalPath: path.join(reportDir, 'daejeon-seatmap-operator-approval.json'),
  };

  await fs.writeFile(paths.handoffJsonPath, `${JSON.stringify({
    generatedAt: handoffGeneratedAt,
    status: 'READY_FOR_OPERATOR_REVIEW',
    releaseGate: {
      generatedAt: releaseGateGeneratedAt,
      status: 'passed',
      reportJson: 'reports/stadium/daejeon-seatmap-release-gate.json',
    },
    lockedStatus: {
      totalBlocks: 145,
      officialImageTraced: 145,
      needsOperatorReview: 0,
      labelTopHitFailures: 0,
      coverageLocked: 145,
      coverageLabelOnly: 0,
      p2DeduplicatedAliases: 11,
      p2EvidenceOutputs: 11,
      anchorCrops: 28,
      visualDiffStatus: 'passed',
      visualDiffChangedCrops: 0,
      visualDiffMetadataMismatches: 0,
      geometryDiffStatus: 'passed',
      geometryDiffChangedBlocks: 0,
      geometryDiffMissingBlocks: 0,
      geometryDiffExtraBlocks: 0,
      browserQaStatus: 'passed',
      browserQaOverflowFailures: 0,
    },
  }, null, 2)}\n`, 'utf8');

  await fs.writeFile(paths.handoffMarkdownPath, '# Daejeon handoff\n', 'utf8');
  await fs.writeFile(paths.releaseGateJsonPath, `${JSON.stringify({
    generatedAt: releaseGateGeneratedAt,
    status: 'passed',
    releaseApprovalCommand: 'npm run qa:stadium:daejeon:release-approved',
  }, null, 2)}\n`, 'utf8');

  t.after(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  return { rootDir, paths };
};

const runApproval = async (rootDir, args = [], now = fixedNow) => {
  const lines = [];
  const result = await main({
    rootDir,
    args,
    stdout: (line) => lines.push(line),
    now: () => now,
  });
  return { lines, result };
};

const readApproval = async (approvalPath) => JSON.parse(await fs.readFile(approvalPath, 'utf8'));

test('operator approval creates a pending approval file from handoff and release gate artifacts', async (t) => {
  const { rootDir, paths } = await createFixture(t);

  const { lines, result } = await runApproval(rootDir);
  const approval = await readApproval(paths.approvalPath);

  assert.equal(result.status, 'PENDING_OPERATOR_APPROVAL');
  assert.equal(approval.contract, 'DAEJEON_OPERATOR_APPROVAL_V1');
  assert.equal(approval.status, 'PENDING_OPERATOR_APPROVAL');
  assert.equal(approval.generatedAt, fixedNow);
  assert.equal(approval.approvedBy, null);
  assert.equal(approval.approvedAt, null);
  assert.deepEqual(approval.sourceArtifacts, {
    handoffJson: 'reports/stadium/daejeon-seatmap-operator-handoff.json',
    handoffMarkdown: 'reports/stadium/daejeon-seatmap-operator-handoff.md',
    releaseGateJson: 'reports/stadium/daejeon-seatmap-release-gate.json',
  });
  assert.equal(approval.handoffGeneratedAt, handoffGeneratedAt);
  assert.equal(approval.releaseGateGeneratedAt, releaseGateGeneratedAt);
  assert.ok(approval.approvedHandoffHash);
  assert.ok(approval.approvedHandoffMarkdownHash);
  assert.ok(approval.approvedReleaseGateHash);
  assert.ok(lines.includes('status:PENDING_OPERATOR_APPROVAL'));
});

test('operator approval status mode does not mutate the approval file', async (t) => {
  const { rootDir, paths } = await createFixture(t);
  await runApproval(rootDir);
  const before = await fs.readFile(paths.approvalPath, 'utf8');

  const { lines, result } = await runApproval(rootDir, ['--status']);
  const after = await fs.readFile(paths.approvalPath, 'utf8');

  assert.equal(result.status, 'PENDING_OPERATOR_APPROVAL');
  assert.equal(after, before);
  assert.ok(lines.includes('status:PENDING_OPERATOR_APPROVAL'));
  assert.ok(lines.includes('hashMatches:true'));
});

test('operator approval approve mode records approvedBy, approvedAt, notes and passes require-approved verification', async (t) => {
  const { rootDir, paths } = await createFixture(t);
  await runApproval(rootDir);

  const approved = await runApproval(
    rootDir,
    ['--approve', '--', '--approved-by', 'seatmap-operator', '--notes', '검수 완료'],
    approvedNow,
  );
  const approval = await readApproval(paths.approvalPath);

  assert.equal(approved.result.status, 'APPROVED');
  assert.equal(approval.status, 'APPROVED');
  assert.equal(approval.approvedBy, 'seatmap-operator');
  assert.equal(approval.approvedAt, approvedNow);
  assert.equal(approval.notes, '검수 완료');

  const verified = await runApproval(rootDir, ['--require-approved']);
  assert.equal(verified.result.status, 'APPROVED');
  assert.ok(verified.lines.includes('requireApproved:true'));
});

test('operator approval require-approved rejects pending approval files', async (t) => {
  const { rootDir } = await createFixture(t);
  await runApproval(rootDir);

  await assert.rejects(
    () => runApproval(rootDir, ['--require-approved']),
    /APPROVED operator approval required; current status is PENDING_OPERATOR_APPROVAL/,
  );
});

test('operator approval approve mode requires approved-by', async (t) => {
  const { rootDir } = await createFixture(t);
  await runApproval(rootDir);

  await assert.rejects(
    () => runApproval(rootDir, ['--approve']),
    /--approve requires --approved-by/,
  );
});

test('operator approval approve mode rejects approved-by placeholders', async (t) => {
  const { rootDir } = await createFixture(t);
  await runApproval(rootDir);

  await assert.rejects(
    () => runApproval(rootDir, ['--approve', '--approved-by', 'operator-name']),
    /--approved-by must be a real operator identifier, not a placeholder/,
  );
});

test('operator approval require-approved rejects stored approved-by placeholders', async (t) => {
  const { rootDir, paths } = await createFixture(t);
  await runApproval(rootDir);
  await runApproval(rootDir, ['--approve', '--approved-by', 'seatmap-operator'], approvedNow);

  const approval = await readApproval(paths.approvalPath);
  approval.approvedBy = 'operator-name';
  await fs.writeFile(paths.approvalPath, `${JSON.stringify(approval, null, 2)}\n`, 'utf8');

  await assert.rejects(
    () => runApproval(rootDir, ['--require-approved']),
    /APPROVED approval requires a real approvedBy, not a placeholder/,
  );
});

test('operator approval rejects handoff files that do not match the current release gate', async (t) => {
  const { rootDir, paths } = await createFixture(t);
  const handoff = JSON.parse(await fs.readFile(paths.handoffJsonPath, 'utf8'));
  handoff.releaseGate.generatedAt = '2026-05-10T07:00:00.000Z';
  await fs.writeFile(paths.handoffJsonPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');

  await assert.rejects(
    () => runApproval(rootDir),
    /operator handoff releaseGate\.generatedAt must match current release gate/,
  );
});

test('operator approval approve mode rejects pending approvals when source artifact hashes change', async (t) => {
  const { rootDir, paths } = await createFixture(t);
  await runApproval(rootDir);
  await fs.writeFile(paths.handoffMarkdownPath, '# Changed handoff before approval\n', 'utf8');

  await assert.rejects(
    () => runApproval(rootDir, ['--approve', '--approved-by', 'seatmap-operator']),
    /PENDING_OPERATOR_APPROVAL hash does not match current handoff\/release gate artifacts/,
  );

  const stalePending = await readApproval(paths.approvalPath);
  assert.equal(stalePending.status, 'PENDING_OPERATOR_APPROVAL');

  const refreshed = await runApproval(rootDir);
  assert.equal(refreshed.result.status, 'PENDING_OPERATOR_APPROVAL');
});

test('operator approval marks approved files as stale when source artifact hashes change', async (t) => {
  const { rootDir, paths } = await createFixture(t);
  await runApproval(rootDir);
  await runApproval(rootDir, ['--approve', '--approved-by', 'seatmap-operator'], approvedNow);
  await fs.writeFile(paths.handoffMarkdownPath, '# Changed handoff\n', 'utf8');

  await assert.rejects(
    () => runApproval(rootDir),
    /STALE_APPROVAL: operator approval hash does not match current handoff\/release gate artifacts/,
  );

  const approval = await readApproval(paths.approvalPath);
  assert.equal(approval.status, 'STALE_APPROVAL');
  assert.equal(approval.staleReason, 'approved handoff/release gate hash does not match current artifacts');
  assert.ok(approval.currentHandoffMarkdownHash);
});
