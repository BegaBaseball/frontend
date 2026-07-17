#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO_ROOT = resolve(SCRIPT_DIR, '..');

const REQUIRED_WORKFLOWS = [
  '_frontend-mate-ci.yml',
  '_frontend-node-suite.yml',
  '_frontend-postdeploy-suite.yml',
  'ci-workflow-policy.yml',
  'frontend-cypress-runner.yml',
  'frontend-mate.yml',
  'frontend-mobile-qa.yml',
  'frontend-postdeploy-smoke.yml',
  'frontend-prediction-performance.yml',
  'frontend-site-audits.yml',
  'frontend-ui-qa.yml',
];

const STALE_MATE_WORKFLOWS = [
  'frontend-mate-regression-label.yml',
  'frontend-mate-regression.yml',
  'frontend-mate-smoke.yml',
];

const readText = (repoRoot, relativePath) => readFileSync(resolve(repoRoot, relativePath), 'utf8');

const listYamlFiles = (directory) => {
  if (!existsSync(directory)) {
    return [];
  }

  const entries = readdirSync(directory).map((entry) => join(directory, entry));
  return entries.flatMap((entryPath) => {
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      return listYamlFiles(entryPath);
    }
    return /\.(ya?ml)$/i.test(entryPath) ? [entryPath] : [];
  });
};

const addFailure = (failures, id, file, message) => {
  failures.push({ id, file, message });
};

const requireFile = (repoRoot, failures, relativePath) => {
  const absolutePath = resolve(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    addFailure(failures, 'missing-file', relativePath, 'required policy file is missing');
    return null;
  }
  return readText(repoRoot, relativePath);
};

const requireSnippet = (failures, file, contents, snippet, id) => {
  if (!contents.includes(snippet)) {
    addFailure(failures, id, file, `missing required snippet: ${snippet}`);
  }
};

const forbidSnippet = (failures, file, contents, snippet, id) => {
  if (contents.includes(snippet)) {
    addFailure(failures, id, file, `forbidden snippet present: ${snippet}`);
  }
};

const workflowPath = (fileName) => `.github/workflows/${fileName}`;

const checkRequiredWorkflowSet = (repoRoot, failures) => {
  for (const fileName of REQUIRED_WORKFLOWS) {
    requireFile(repoRoot, failures, workflowPath(fileName));
  }
};

const checkNoMonorepoFrontendPrefixes = (repoRoot, failures) => {
  const policyFiles = [
    '.github/labeler.yml',
    ...listYamlFiles(resolve(repoRoot, '.github/workflows'))
      .map((absolutePath) => relative(repoRoot, absolutePath)),
  ];

  for (const policyPath of policyFiles) {
    const contents = requireFile(repoRoot, failures, policyPath);
    if (!contents) {
      continue;
    }
    forbidSnippet(
      failures,
      policyPath,
      contents,
      'bega_frontend/',
      'forbidden-monorepo-frontend-prefix',
    );
  }
};

const checkMateRegressionLabelPolicy = (repoRoot, failures) => {
  for (const fileName of STALE_MATE_WORKFLOWS) {
    const stalePath = workflowPath(fileName);
    if (existsSync(resolve(repoRoot, stalePath))) {
      addFailure(
        failures,
        'forbidden-stale-mate-workflow',
        stalePath,
        'stale or automatic mate regression workflow file must stay removed',
      );
    }
  }

  const workflowDir = resolve(repoRoot, '.github/workflows');
  for (const absolutePath of listYamlFiles(workflowDir)) {
    const relativePath = relative(repoRoot, absolutePath);
    const contents = readFileSync(absolutePath, 'utf8');
    const isLabelingFullMateRegression = contents.includes('full-mate-regression')
      && (contents.includes('actions/labeler') || contents.includes('issues.createLabel'));
    if (contents.includes('pull_request_target') && isLabelingFullMateRegression) {
      addFailure(
        failures,
        'forbidden-pr-target-full-mate-labeler',
        relativePath,
        'pull_request_target must not auto-create or auto-apply full-mate-regression',
      );
    }
  }

  const labelerPath = '.github/labeler.yml';
  const contents = requireFile(repoRoot, failures, labelerPath);
  if (!contents) {
    return;
  }

  const forbiddenLabelerSnippets = [
    'components/mypage/Mate*.tsx',
    'hooks/internal/mate*.ts',
    'store/authStore.ts',
    'utils/api.ts',
    'utils/errorUtils.ts',
    'utils/loginRedirect.ts',
    'hooks/useWebSocket.ts',
    'frontend-mate-smoke.yml',
    'frontend-mate-regression.yml',
    'frontend-mate-regression-label.yml',
  ];

  requireSnippet(
    failures,
    labelerPath,
    contents,
    'full-mate-regression:',
    'missing-full-mate-regression-label-policy',
  );
  requireSnippet(
    failures,
    labelerPath,
    contents,
    'store/mate*.ts',
    'missing-mate-store-advisory-glob',
  );
  requireSnippet(
    failures,
    labelerPath,
    contents,
    'scripts/mate-regression-label-policy.test.ts',
    'missing-label-policy-test-advisory-glob',
  );

  for (const snippet of forbiddenLabelerSnippets) {
    forbidSnippet(failures, labelerPath, contents, snippet, 'forbidden-wide-labeler-glob');
  }
};

const checkFrontendMateWorkflow = (repoRoot, failures) => {
  const workflow = workflowPath('frontend-mate.yml');
  const contents = requireFile(repoRoot, failures, workflow);
  if (!contents) {
    return;
  }

  const requiredSnippets = [
    '- labeled',
    'workflow_dispatch:',
    'mode == \'regression\'',
    'schedule:',
    'contains(github.event.pull_request.labels.*.name, \'full-mate-regression\')',
    '.github/labeler.yml',
  ];

  for (const snippet of requiredSnippets) {
    requireSnippet(failures, workflow, contents, snippet, 'missing-mate-regression-manual-path');
  }

  forbidSnippet(
    failures,
    workflow,
    contents,
    'frontend-mate-regression-label.yml',
    'forbidden-stale-mate-workflow-reference',
  );
};

const stripJavaScriptComments = (contents) => {
  let output = '';
  let quote = null;
  let index = 0;

  while (index < contents.length) {
    const character = contents[index];
    const nextCharacter = contents[index + 1];

    if (quote) {
      output += character;
      if (character === '\\' && index + 1 < contents.length) {
        output += nextCharacter;
        index += 2;
        continue;
      }
      if (character === quote) quote = null;
      index += 1;
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      output += character;
      index += 1;
      continue;
    }

    if (character === '/' && nextCharacter === '/') {
      output += '  ';
      index += 2;
      while (index < contents.length && contents[index] !== '\n') {
        output += ' ';
        index += 1;
      }
      continue;
    }

    if (character === '/' && nextCharacter === '*') {
      output += '  ';
      index += 2;
      while (index < contents.length) {
        if (contents[index] === '*' && contents[index + 1] === '/') {
          output += '  ';
          index += 2;
          break;
        }
        output += contents[index] === '\n' ? '\n' : ' ';
        index += 1;
      }
      continue;
    }

    output += character;
    index += 1;
  }

  return output;
};

const countPresetSpecOccurrences = (contents, presetName, spec) => {
  const section = contents.match(new RegExp(`\\b${presetName}\\s*:\\s*\\[([\\s\\S]*?)\\]`));
  if (!section) return 0;
  const entries = [...section[1].matchAll(/(['"])(.*?)\1/g)];
  return entries.filter((entry) => entry[2] === spec).length;
};

const tokenizeShellCommand = (command) => {
  const tokens = [];
  let current = '';
  let quote = null;
  let tokenStarted = false;

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];

    if (quote) {
      if (character === '\\' && quote !== "'" && index + 1 < command.length) {
        current += command[index + 1];
        index += 1;
        tokenStarted = true;
        continue;
      }
      if (character === quote) {
        quote = null;
      } else {
        current += character;
      }
      tokenStarted = true;
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      tokenStarted = true;
      continue;
    }
    if (/\s/.test(character)) {
      if (tokenStarted) {
        tokens.push(current);
        current = '';
        tokenStarted = false;
      }
      continue;
    }
    if (character === '\\' && index + 1 < command.length) {
      current += command[index + 1];
      index += 1;
      tokenStarted = true;
      continue;
    }

    current += character;
    tokenStarted = true;
  }

  if (quote) return null;
  if (tokenStarted) tokens.push(current);
  return tokens;
};

const stripYamlComments = (contents) => contents.split('\n').map((line) => {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote) {
      if (character === '\\' && quote === '"') {
        index += 1;
        continue;
      }
      if (character === quote) {
        if (quote === "'" && line[index + 1] === "'") {
          index += 1;
          continue;
        }
        quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === '#') return line.slice(0, index);
  }
  return line;
}).join('\n');

const extractNamedWorkflowStep = (contents, stepName) => {
  const lines = contents.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)-\s+name:\s*(.*?)\s*$/);
    if (!match) continue;
    const rawName = match[2];
    const normalizedName = (
      (rawName.startsWith('"') && rawName.endsWith('"'))
      || (rawName.startsWith("'") && rawName.endsWith("'"))
    ) ? rawName.slice(1, -1) : rawName;
    if (normalizedName !== stepName) continue;

    const stepIndent = match[1].length;
    let endIndex = index + 1;
    while (endIndex < lines.length) {
      const peerMatch = lines[endIndex].match(/^(\s*)-\s+/);
      if (peerMatch && peerMatch[1].length === stepIndent) break;
      endIndex += 1;
    }
    return lines.slice(index, endIndex).join('\n');
  }
  return '';
};

const directStepIndent = (step) => {
  const firstLine = step.split('\n')[0] || '';
  const match = firstLine.match(/^(\s*)-/);
  return match ? match[1].length + 2 : 2;
};

const hasDirectStepMapping = (step, key, value) => {
  const indent = ' '.repeat(directStepIndent(step));
  return step.split('\n').some((line) => line === `${indent}${key}: ${value}`);
};

const extractDirectStepSection = (step, key) => {
  const lines = step.split('\n');
  const indentSize = directStepIndent(step);
  const indent = ' '.repeat(indentSize);
  const startIndex = lines.findIndex((line) => (
    line === `${indent}${key}:`
    || line === `${indent}${key}: |`
    || line === `${indent}${key}: >`
  ));
  if (startIndex === -1) return '';

  let endIndex = startIndex + 1;
  while (endIndex < lines.length) {
    const line = lines[endIndex];
    if (line.trim() && line.search(/\S/) <= indentSize) break;
    endIndex += 1;
  }
  return lines.slice(startIndex + 1, endIndex).join('\n');
};

const checkMateQualityGatePolicy = (repoRoot, failures) => {
  const packageJson = requireFile(repoRoot, failures, 'package.json');
  const presets = requireFile(repoRoot, failures, 'scripts/qa-presets.mjs');
  const workflow = requireFile(repoRoot, failures, workflowPath('_frontend-mate-ci.yml'));
  if (packageJson === null || presets === null || workflow === null) return;

  let coverageScript = '';
  try {
    const parsedPackageJson = JSON.parse(packageJson);
    if (typeof parsedPackageJson?.scripts?.['test:mate:coverage'] === 'string') {
      coverageScript = parsedPackageJson.scripts['test:mate:coverage'];
    }
  } catch {
    addFailure(
      failures,
      'missing-mate-quality-gate',
      'package.json',
      'package.json must contain valid JSON',
    );
  }

  const coverageTokens = tokenizeShellCommand(coverageScript);
  if (!coverageTokens) {
    addFailure(
      failures,
      'missing-mate-quality-gate',
      'package.json',
      'test:mate:coverage must be a valid shell command',
    );
  } else {
    const coverageFlagCount = coverageTokens.filter((token) => (
      token === '--experimental-test-coverage'
    )).length;
    if (coverageFlagCount !== 1) {
      addFailure(
        failures,
        'missing-mate-quality-gate',
        'package.json',
        'test:mate:coverage must contain exactly one --experimental-test-coverage flag',
      );
    }

    const requiredThresholds = [
      ['lines', '90'],
      ['branches', '70'],
      ['functions', '70'],
    ];
    for (const [metric, floor] of requiredThresholds) {
      const prefix = `--test-coverage-${metric}=`;
      const options = coverageTokens.filter((token) => token.startsWith(prefix));
      if (options.length !== 1 || options[0] !== `${prefix}${floor}`) {
        addFailure(
          failures,
          'missing-mate-quality-gate',
          'package.json',
          `test:mate:coverage must contain exactly one ${prefix}${floor} option`,
        );
      }
    }
  }

  const uncommentedPresets = stripJavaScriptComments(presets);
  const urlStateSpec = 'cypress/e2e/mate-list-url-state.cy.ts';
  for (const presetName of ['mateSmoke', 'mateRoute']) {
    const occurrences = countPresetSpecOccurrences(uncommentedPresets, presetName, urlStateSpec);
    if (occurrences !== 1) {
      addFailure(
        failures,
        'missing-mate-quality-gate',
        'scripts/qa-presets.mjs',
        `${urlStateSpec} must appear exactly once in ${presetName}`,
      );
    }
  }

  const uncommentedWorkflow = stripYamlComments(workflow);
  const coverageStep = extractNamedWorkflowStep(uncommentedWorkflow, 'Run mate unit coverage');
  const coverageRun = extractDirectStepSection(coverageStep, 'run');
  const coverageRunLines = coverageRun.split('\n').map((line) => line.trim());
  const hasCoverageCommand = coverageRunLines.some((line) => (
    line.includes('npm run test:mate:coverage')
    && line.includes('reports/mate-ci/coverage.log')
  ));
  if (
    !hasDirectStepMapping(coverageStep, 'id', 'coverage')
    || !coverageRunLines.includes('set -o pipefail')
    || !hasCoverageCommand
  ) {
    addFailure(
      failures,
      'missing-mate-quality-gate',
      workflowPath('_frontend-mate-ci.yml'),
      'Run mate unit coverage must own id coverage, pipefail, the coverage command, and coverage.log',
    );
  }

  const expectedStatusMapping = 'MATE_CI_STATUS_COVERAGE: ${{ steps.coverage.outcome }}';
  const summarySteps = [
    'Generate mate CI machine-readable summary',
    'Publish mate CI summary',
  ];
  for (const stepName of summarySteps) {
    const step = extractNamedWorkflowStep(uncommentedWorkflow, stepName);
    const envSection = extractDirectStepSection(step, 'env');
    const hasExpectedMapping = envSection.split('\n').some((line) => (
      line.trim() === expectedStatusMapping
    ));
    if (!hasExpectedMapping) {
      addFailure(
        failures,
        'missing-mate-quality-gate',
        workflowPath('_frontend-mate-ci.yml'),
        `${stepName} must map coverage status from steps.coverage.outcome`,
      );
    }
  }
};

const checkFrontendSiteAuditsWorkflow = (repoRoot, failures) => {
  const workflow = workflowPath('frontend-site-audits.yml');
  const contents = requireFile(repoRoot, failures, workflow);
  if (!contents) {
    return;
  }

  const forbiddenBroadPaths = [
    '- "**"',
    '- "**/*"',
  ];

  for (const snippet of forbiddenBroadPaths) {
    forbidSnippet(failures, workflow, contents, snippet, 'forbidden-overbroad-site-audit-path');
  }

  const requiredSeoPaths = [
    'src/seo/**',
    'scripts/seo-*',
    'scripts/prerender-seo*',
    'scripts/generate-sitemap.mjs',
    'scripts/helmet-runtime-check.mjs',
    'seo-routes.json',
    'public/robots.txt',
    'public/_headers',
    'public/_redirects',
    'index.html',
    'package.json',
    'package-lock.json',
  ];

  for (const snippet of requiredSeoPaths) {
    requireSnippet(failures, workflow, contents, snippet, 'missing-seo-audit-pr-path');
  }
};

const checkFrontendMobileQaWorkflow = (repoRoot, failures) => {
  const workflow = workflowPath('frontend-mobile-qa.yml');
  const contents = requireFile(repoRoot, failures, workflow);
  if (!contents) {
    return;
  }

  const forbiddenSnippets = [
    'detect-changes',
    'prediction_changed',
    'needs: detect-changes',
  ];

  for (const snippet of forbiddenSnippets) {
    forbidSnippet(failures, workflow, contents, snippet, 'forbidden-mobile-detect-job');
  }

  requireSnippet(
    failures,
    workflow,
    contents,
    "github.event_name == 'pull_request'",
    'missing-direct-mobile-pr-trigger',
  );
  requireSnippet(
    failures,
    workflow,
    contents,
    "github.event.inputs.suite == 'combined'",
    'missing-combined-mobile-manual-trigger',
  );
};

const checkPolicyWorkflowWiring = (repoRoot, failures) => {
  const workflow = workflowPath('ci-workflow-policy.yml');
  const contents = requireFile(repoRoot, failures, workflow);
  if (!contents) {
    return;
  }

  const requiredSnippets = [
    'node-version: 22',
    'node scripts/ci-workflow-policy.mjs',
    '.github/workflows/**',
    '.github/labeler.yml',
    'scripts/ci-workflow-policy.mjs',
    'scripts/ci-workflow-policy.test.ts',
  ];

  for (const snippet of requiredSnippets) {
    requireSnippet(failures, workflow, contents, snippet, 'missing-policy-workflow-wiring');
  }
};

const checkFrontendCypressRunnerWorkflow = (repoRoot, failures) => {
  const workflow = workflowPath('frontend-cypress-runner.yml');
  const contents = requireFile(repoRoot, failures, workflow);
  if (!contents) {
    return;
  }

  const requiredSnippets = [
    'node-version: 22',
    'CYPRESS_INSTALL_BINARY: "0"',
    'npm run test:cypress-runner',
    'workflow_dispatch:',
    'type: choice',
    'docker-smoke',
    "inputs.suite == 'docker-smoke'",
    'docker info',
    'npm run dev -- --host 0.0.0.0 --port 5176',
    'CYPRESS_DOCKER_BASE_URL: http://host.docker.internal:5176',
    'npm run test:cypress-runner:docker-smoke',
    'scripts/cypress-run.mjs',
    'scripts/cypress-run.test.mjs',
    'scripts/qa-presets.mjs',
    'scripts/test-e2e.mjs',
    'cypress/e2e/runner-docker-smoke.cy.ts',
  ];

  for (const snippet of requiredSnippets) {
    requireSnippet(failures, workflow, contents, snippet, 'missing-cypress-runner-workflow-wiring');
  }
};

export const checkCiWorkflowPolicy = (repoRoot = DEFAULT_REPO_ROOT) => {
  const failures = [];

  checkRequiredWorkflowSet(repoRoot, failures);
  checkNoMonorepoFrontendPrefixes(repoRoot, failures);
  checkMateRegressionLabelPolicy(repoRoot, failures);
  checkFrontendMateWorkflow(repoRoot, failures);
  checkMateQualityGatePolicy(repoRoot, failures);
  checkFrontendSiteAuditsWorkflow(repoRoot, failures);
  checkFrontendMobileQaWorkflow(repoRoot, failures);
  checkPolicyWorkflowWiring(repoRoot, failures);
  checkFrontendCypressRunnerWorkflow(repoRoot, failures);

  return {
    ok: failures.length === 0,
    failures,
  };
};

export const formatCiWorkflowPolicyReport = (report) => {
  if (report.ok) {
    return '[ci-workflow-policy] OK';
  }

  return [
    '[ci-workflow-policy] FAILED',
    ...report.failures.map((failure) => (
      `- ${failure.id}: ${failure.file}: ${failure.message}`
    )),
  ].join('\n');
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const report = checkCiWorkflowPolicy();
  const output = formatCiWorkflowPolicyReport(report);
  if (report.ok) {
    console.log(output);
    process.exit(0);
  }

  console.error(output);
  process.exit(1);
}
