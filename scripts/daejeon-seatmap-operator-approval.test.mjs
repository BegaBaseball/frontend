import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { main } from './daejeon-seatmap-ops.mjs';

const fixedNow = '2026-05-10T09:00:00.000Z';
const approvedNow = '2026-05-10T09:05:00.000Z';

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
    generatedAt: '2026-05-10T08:50:00.000Z',
    status: 'READY_FOR_OPERATOR_REVIEW',
    lockedStatus: {
      totalBlocks: 145,
      officialImageTraced: 145,
      needsOperatorReview: 0,
      labelTopHitFailures: 0,
      browserQaStatus: 'passed',
      browserQaOverflowFailures: 0,
    },
  }, null, 2)}\n`, 'utf8');

  await fs.writeFile(paths.handoffMarkdownPath, '# Daejeon handoff\n', 'utf8');
  await fs.writeFile(paths.releaseGateJsonPath, `${JSON.stringify({
    generatedAt: '2026-05-10T08:45:00.000Z',
    status: 'passed',
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
  assert.equal(approval.status, 'PENDING_OPERATOR_APPROVAL');
  assert.equal(approval.generatedAt, fixedNow);
  assert.equal(approval.approvedBy, null);
  assert.equal(approval.approvedAt, null);
  assert.equal(approval.handoffGeneratedAt, '2026-05-10T08:50:00.000Z');
  assert.equal(approval.releaseGateGeneratedAt, '2026-05-10T08:45:00.000Z');
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
    ['--approve', '--approved-by', 'seatmap-operator', '--notes', '검수 완료'],
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
