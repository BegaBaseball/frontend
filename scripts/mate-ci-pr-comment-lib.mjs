import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const statusEmoji = {
  success: '✅',
  failure: '❌',
  cancelled: '⏹️',
  skipped: '⏭️',
  not_run: '⚪',
};

const computeOverallStatus = (summary) => {
  if (summary.stages.some((stage) => stage.status === 'failure')) {
    return 'failure';
  }
  if (summary.stages.some((stage) => stage.status === 'cancelled')) {
    return 'cancelled';
  }
  if (summary.stages.every((stage) => stage.status === 'skipped')) {
    return 'skipped';
  }
  if (summary.stages.every((stage) => ['success', 'skipped'].includes(stage.status))) {
    return 'success';
  }
  return 'not_run';
};

export const loadMateCiSummaryJson = (summaryPath, cwd = process.cwd()) =>
  JSON.parse(readFileSync(resolve(cwd, summaryPath), 'utf8'));

export const renderMateCiPrComment = ({
  summary,
  mode,
  runUrl,
  reportsArtifactName,
  failureArtifactName,
  secondaryArtifactName = null,
}) => {
  const marker = `<!-- mate-ci-${mode} -->`;
  const overallStatus = computeOverallStatus(summary);
  const icon = statusEmoji[overallStatus] || statusEmoji.not_run;
  const lines = [
    marker,
    `## ${icon} ${summary.title}`,
    '',
    runUrl ? `- Run: [workflow run](${runUrl})` : null,
    reportsArtifactName ? `- Reports artifact: \`${reportsArtifactName}\`` : null,
    failureArtifactName ? `- Failure artifact: \`${failureArtifactName}\`` : null,
    secondaryArtifactName ? `- Optional artifact: \`${secondaryArtifactName}\`` : null,
    '',
    '| Stage | Status | Counts |',
    '| --- | --- | --- |',
    ...summary.stages.map((stage) => `| ${stage.label} | ${stage.status} | ${stage.count} |`),
  ].filter(Boolean);

  if (summary.notes.length > 0) {
    lines.push('', ...summary.notes);
  }

  return `${lines.join('\n')}\n`;
};
