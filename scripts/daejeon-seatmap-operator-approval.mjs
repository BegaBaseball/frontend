import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const defaultFrontendRoot = path.resolve(scriptDir, '..');

const APPROVAL_STATUSES = new Set([
  'PENDING_OPERATOR_APPROVAL',
  'APPROVED',
  'STALE_APPROVAL',
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

const approvalMatchesCurrentArtifacts = (approval, current) => approval.approvedHandoffHash === current.approvedHandoffHash
  && approval.approvedHandoffMarkdownHash === current.approvedHandoffMarkdownHash
  && approval.approvedReleaseGateHash === current.approvedReleaseGateHash
  && approval.handoffGeneratedAt === current.handoffGeneratedAt
  && approval.releaseGateGeneratedAt === current.releaseGateGeneratedAt;

const validateSourceArtifacts = async ({ handoffJsonPath, handoffMarkdownPath, releaseGateJsonPath }) => {
  for (const filePath of [handoffJsonPath, handoffMarkdownPath, releaseGateJsonPath]) {
    assertApproval(await fileExists(filePath), `missing Daejeon approval source artifact: ${filePath}`);
  }

  const handoff = await readJson(handoffJsonPath);
  const releaseGate = await readJson(releaseGateJsonPath);

  assertApproval(handoff.status === 'READY_FOR_OPERATOR_REVIEW', 'operator handoff must be READY_FOR_OPERATOR_REVIEW');
  assertApproval(releaseGate.status === 'passed', 'release gate must be passed');
  assertApproval(handoff.lockedStatus?.totalBlocks === 145, 'handoff totalBlocks must be 145');
  assertApproval(handoff.lockedStatus?.officialImageTraced === 145, 'handoff officialImageTraced must be 145');
  assertApproval(handoff.lockedStatus?.needsOperatorReview === 0, 'handoff needsOperatorReview must be 0');
  assertApproval(handoff.lockedStatus?.labelTopHitFailures === 0, 'handoff labelTopHitFailures must be 0');
  assertApproval(handoff.lockedStatus?.browserQaStatus === 'passed', 'handoff browser QA status must be passed');
  assertApproval(handoff.lockedStatus?.browserQaOverflowFailures === 0, 'handoff browser QA overflow failures must be 0');

  return { handoff, releaseGate };
};

const buildApprovalTemplate = async (
  { handoff, releaseGate },
  { handoffJsonPath, handoffMarkdownPath, releaseGateJsonPath },
  existingApproval = null,
  now = () => new Date().toISOString(),
) => ({
  generatedAt: now(),
  status: 'PENDING_OPERATOR_APPROVAL',
  approvedAt: null,
  approvedBy: null,
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
});

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

  if (approval.status === 'PENDING_OPERATOR_APPROVAL') {
    assertApproval(!flags.requireApproved, 'APPROVED operator approval required; current status is PENDING_OPERATOR_APPROVAL');
    await writeJson(paths.approvalPath, current);
    return current.status;
  }

  if (approval.status === 'STALE_APPROVAL') {
    throw new Error('STALE_APPROVAL: operator approval is stale. Re-run handoff review and approve again.');
  }

  assertApproval(typeof approval.approvedBy === 'string' && approval.approvedBy.trim().length > 0, 'APPROVED approval requires approvedBy');
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

export const main = async ({
  args = process.argv.slice(2),
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

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    await main();
  } catch (error) {
    console.error('status:failed');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
