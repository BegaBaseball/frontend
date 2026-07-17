import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const stageConfigs = {
  smoke: [
    {
      envKey: 'UNIT_SMOKE',
      label: 'Unit smoke',
      scope: 'mate route barrels, query/cache helpers, mate utils/api',
      parser: 'node-test',
      logFile: 'reports/mate-ci/unit-smoke.log',
    },
    {
      envKey: 'COVERAGE',
      label: 'Unit coverage',
      scope: 'executed Mate Node unit surface; floors L90/B70/F70',
      parser: 'node-coverage',
      logFile: 'reports/mate-ci/coverage.log',
    },
    {
      envKey: 'BUILD_SMOKE',
      label: 'Build smoke',
      scope: 'vite build + seo prerender + sitemap',
      parser: 'build',
      logFile: 'reports/mate-ci/build-smoke.log',
    },
    {
      envKey: 'E2E_SMOKE',
      label: 'Core E2E smoke',
      scope: 'mate-detail-states.cy.ts, mate-execution-flow.cy.ts',
      parser: 'cypress',
      logFile: 'reports/mate-ci/e2e-smoke.log',
    },
  ],
  regression: [
    {
      envKey: 'UNIT_SMOKE',
      label: 'Unit smoke',
      scope: 'mate route barrels, query/cache helpers, mate utils/api',
      parser: 'node-test',
      logFile: 'reports/mate-ci/unit-smoke.log',
    },
    {
      envKey: 'COVERAGE',
      label: 'Unit coverage',
      scope: 'executed Mate Node unit surface; floors L90/B70/F70',
      parser: 'node-coverage',
      logFile: 'reports/mate-ci/coverage.log',
    },
    {
      envKey: 'BUILD_SMOKE',
      label: 'Build smoke',
      scope: 'vite build + seo prerender + sitemap',
      parser: 'build',
      logFile: 'reports/mate-ci/build-smoke.log',
    },
    {
      envKey: 'ROUTE_REGRESSION',
      label: 'Route regression',
      scope: 'mate.cy.ts, mate-detail-states.cy.ts, mate-execution-flow.cy.ts, mate-qr-refresh.cy.ts',
      parser: 'cypress',
      logFile: 'reports/mate-ci/route-regression.log',
    },
    {
      envKey: 'CREATE_REGRESSION',
      label: 'Create/session regression',
      scope: 'mate-create.cy.ts, mate-create-session-recovery.cy.ts, mate-apply-session-recovery.cy.ts, mate-selling-payment-success.cy.ts',
      parser: 'cypress',
      logFile: 'reports/mate-ci/create-regression.log',
    },
    {
      envKey: 'EXTENDED_REGRESSION',
      label: 'Extended regression',
      scope: 'mate-chat-upload.cy.ts, mate-flow-policy.cy.ts, mate-visual.cy.ts',
      parser: 'cypress',
      logFile: 'reports/mate-ci/extended-regression.log',
    },
  ],
};

export const statusMap = {
  success: 'success',
  failure: 'failure',
  skipped: 'skipped',
  cancelled: 'cancelled',
};

export const readLog = (filePath, cwd = process.cwd()) => {
  const absolutePath = resolve(cwd, filePath);
  if (!existsSync(absolutePath)) {
    return null;
  }

  return readFileSync(absolutePath, 'utf8');
};

export const parseNodeTestMetrics = (contents) => {
  const totalMatch = contents.match(/# tests (\d+)/);
  const passMatch = contents.match(/# pass (\d+)/);
  const failMatch = contents.match(/# fail (\d+)/);
  const skipMatch = contents.match(/# skipped (\d+)/);

  if (!totalMatch || !passMatch) {
    return null;
  }

  return {
    total: Number(totalMatch[1]),
    pass: Number(passMatch[1]),
    fail: failMatch ? Number(failMatch[1]) : 0,
    skipped: skipMatch ? Number(skipMatch[1]) : 0,
  };
};

export const parseNodeCoverageMetrics = (contents) => {
  const match = contents.match(/^# all files\s+\|\s+(\d+(?:\.\d+)?)\s+\|\s+(\d+(?:\.\d+)?)\s+\|\s+(\d+(?:\.\d+)?)\s+\|\s*$/m);
  if (!match) return null;
  const [lines, branches, functions] = match.slice(1).map(Number);
  if ([lines, branches, functions].some((metric) => (
    !Number.isFinite(metric) || metric < 0 || metric > 100
  ))) return null;
  return {
    lines,
    branches,
    functions,
  };
};

export const parseCypressMetrics = (contents) => {
  const testsMatches = [...contents.matchAll(/[│|]\s*Tests:\s+(\d+)/g)];
  const passingMatches = [...contents.matchAll(/[│|]\s*Passing:\s+(\d+)/g)];
  const failingMatches = [...contents.matchAll(/[│|]\s*Failing:\s+(\d+)/g)];

  if (testsMatches.length > 0 &&
      testsMatches.length === passingMatches.length &&
      testsMatches.length === failingMatches.length) {
    return testsMatches.reduce((aggregate, match, index) => ({
      total: aggregate.total + Number(match[1]),
      pass: aggregate.pass + Number(passingMatches[index][1]),
      fail: aggregate.fail + Number(failingMatches[index][1]),
    }), { total: 0, pass: 0, fail: 0 });
  }

  const lines = contents.split(/\r?\n/).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    const passedMatch = line.match(/All specs passed!\s+\d{2}:\d{2}\s+(\d+)\s+(\d+)\s+(-|\d+)/);
    if (passedMatch) {
      return {
        total: Number(passedMatch[1]),
        pass: Number(passedMatch[2]),
        fail: passedMatch[3] === '-' ? 0 : Number(passedMatch[3]),
      };
    }

    const failedMatch = line.match(/\d+\s+of\s+\d+\s+failed.*\s+\d{2}:\d{2}\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (failedMatch) {
      return {
        total: Number(failedMatch[1]),
        pass: Number(failedMatch[2]),
        fail: Number(failedMatch[3]),
      };
    }
  }

  return null;
};

export const formatCount = (parser, metrics, status) => {
  if (status === 'skipped') {
    return 'skipped';
  }

  if (parser === 'build') {
    return 'n/a';
  }

  if (!metrics) {
    return 'n/a';
  }

  if (parser === 'node-coverage' && metrics) {
    return `L ${metrics.lines}% · B ${metrics.branches}% · F ${metrics.functions}%`;
  }

  const failedSuffix = metrics.fail > 0 ? `, ${metrics.fail} failed` : '';
  return `${metrics.pass}/${metrics.total} passed${failedSuffix}`;
};

export const buildMateCiSummary = ({
  workflow,
  cwd = process.cwd(),
  env = process.env,
} = {}) => {
  if (!workflow || !['smoke', 'regression'].includes(workflow)) {
    throw new Error('workflow must be either smoke or regression');
  }

  const title = workflow === 'smoke' ? 'Frontend Mate Smoke' : 'Frontend Mate Regression';
  const stages = stageConfigs[workflow].map((stage) => {
    const reportedStatus = statusMap[env[`MATE_CI_STATUS_${stage.envKey}`] || ''] || 'not_run';
    const contents = readLog(stage.logFile, cwd) || '';
    const metrics = stage.parser === 'node-test'
      ? parseNodeTestMetrics(contents)
      : stage.parser === 'node-coverage'
        ? parseNodeCoverageMetrics(contents)
        : stage.parser === 'cypress'
          ? parseCypressMetrics(contents)
          : null;
    const status = stage.parser === 'node-coverage' && reportedStatus === 'success' && !metrics
      ? 'failure'
      : reportedStatus;

    return {
      ...stage,
      status,
      metrics,
      count: formatCount(stage.parser, metrics, status),
    };
  });

  const notes = [
    env.MATE_CI_TRIGGER_NOTE ? `- Trigger: ${env.MATE_CI_TRIGGER_NOTE}` : null,
    env.MATE_CI_ARTIFACT_NOTE ? `- Artifact policy: ${env.MATE_CI_ARTIFACT_NOTE}` : null,
    env.MATE_CI_SECONDARY_ARTIFACT_NOTE ? `- Optional artifact: ${env.MATE_CI_SECONDARY_ARTIFACT_NOTE}` : null,
  ].filter(Boolean);

  return {
    workflow,
    title,
    stages,
    notes,
  };
};

export const renderMateCiSummaryMarkdown = (summary) => {
  const markdownLines = [
    `### ${summary.title}`,
    '',
    '| Stage | Status | Counts | Scope |',
    '| --- | --- | --- | --- |',
    ...summary.stages.map((stage) => `| ${stage.label} | ${stage.status} | ${stage.count} | ${stage.scope} |`),
  ];

  if (summary.notes.length > 0) {
    markdownLines.push('', ...summary.notes);
  }

  return `${markdownLines.join('\n')}\n`;
};

export const writeMateCiSummaryOutputs = ({
  summary,
  cwd = process.cwd(),
  jsonOutputPath = null,
  markdownOutputPath = null,
}) => {
  const markdown = renderMateCiSummaryMarkdown(summary);

  if (markdownOutputPath) {
    writeFileSync(resolve(cwd, markdownOutputPath), markdown, 'utf8');
  }

  if (jsonOutputPath) {
    writeFileSync(resolve(cwd, jsonOutputPath), JSON.stringify({
      workflow: summary.workflow,
      title: summary.title,
      stages: summary.stages.map((stage) => ({
        label: stage.label,
        status: stage.status,
        count: stage.count,
        scope: stage.scope,
        metrics: stage.metrics,
        logFile: stage.logFile,
      })),
      notes: summary.notes,
    }, null, 2), 'utf8');
  }

  return markdown;
};
