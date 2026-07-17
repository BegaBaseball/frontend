#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

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

const propertyNameText = (name) => {
  if (
    ts.isIdentifier(name)
    || ts.isStringLiteral(name)
    || ts.isNoSubstitutionTemplateLiteral(name)
  ) return name.text;
  return null;
};

const matePresetSpecOccurrences = (contents, spec) => {
  const sourceFile = ts.createSourceFile(
    'qa-presets.mjs',
    contents,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  let specsObject = null;

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name)
        && declaration.name.text === 'E2E_SPECS'
        && declaration.initializer
        && ts.isObjectLiteralExpression(declaration.initializer)
      ) {
        specsObject = declaration.initializer;
        break;
      }
    }
    if (specsObject) break;
  }

  const result = { mateSmoke: 0, mateRoute: 0 };
  if (!specsObject) return result;

  for (const presetName of Object.keys(result)) {
    const property = specsObject.properties.find((candidate) => (
      ts.isPropertyAssignment(candidate)
      && propertyNameText(candidate.name) === presetName
    ));
    if (!property || !ts.isArrayLiteralExpression(property.initializer)) continue;

    result[presetName] = property.initializer.elements.filter((element) => (
      (ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element))
      && element.text === spec
    )).length;
  }

  return result;
};

const parseSimpleShellCommand = (command) => {
  const tokens = [];
  let current = '';
  let quote = null;
  let tokenStarted = false;

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];

    if (quote) {
      if (quote !== "'" && (character === '`' || character === '$')) return null;
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
    if (character === '#' && !tokenStarted) break;
    if (
      character === '\n'
      || character === '\r'
      || character === ';'
      || character === '&'
      || character === '|'
      || character === '<'
      || character === '>'
      || character === '`'
      || character === '$'
    ) return null;
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

const workflowBlockScalarLines = (lines) => {
  const blocked = new Set();
  let blockIndent = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const indentation = line.search(/\S/);

    if (blockIndent !== null) {
      if (!line.trim() || indentation > blockIndent) {
        blocked.add(index);
        continue;
      }
      blockIndent = null;
    }

    if (/^\s*[^#][^:]*:\s*[|>][+-]?\s*$/.test(line)) {
      blockIndent = indentation;
    }
  }

  return blocked;
};

const normalizeYamlScalar = (value) => {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) return value.slice(1, -1);
  return value;
};

const extractWorkflowSteps = (contents) => {
  const lines = contents.split('\n');
  const blockedLines = workflowBlockScalarLines(lines);
  const steps = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (blockedLines.has(index)) continue;
    const stepsMatch = lines[index].match(/^(\s*)steps:\s*$/);
    if (!stepsMatch) continue;

    const sectionIndent = stepsMatch[1].length;
    const itemIndent = sectionIndent + 2;
    let sectionEnd = index + 1;
    while (sectionEnd < lines.length) {
      const line = lines[sectionEnd];
      if (!line.trim()) {
        sectionEnd += 1;
        continue;
      }
      if (!blockedLines.has(sectionEnd) && line.search(/\S/) <= sectionIndent) break;
      sectionEnd += 1;
    }

    for (let stepIndex = index + 1; stepIndex < sectionEnd; stepIndex += 1) {
      if (blockedLines.has(stepIndex)) continue;
      const nameMatch = lines[stepIndex].match(/^(\s*)-\s+name:\s*(.*?)\s*$/);
      if (!nameMatch || nameMatch[1].length !== itemIndent) continue;

      let stepEnd = stepIndex + 1;
      while (stepEnd < sectionEnd) {
        const peerMatch = blockedLines.has(stepEnd)
          ? null
          : lines[stepEnd].match(/^(\s*)-\s+/);
        if (peerMatch && peerMatch[1].length === itemIndent) break;
        stepEnd += 1;
      }
      steps.push({
        name: normalizeYamlScalar(nameMatch[2]),
        source: lines.slice(stepIndex, stepEnd).join('\n'),
      });
      stepIndex = stepEnd - 1;
    }

    index = sectionEnd - 1;
  }

  return steps;
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

  const coverageTokens = parseSimpleShellCommand(coverageScript);
  if (!coverageTokens) {
    addFailure(
      failures,
      'missing-mate-quality-gate',
      'package.json',
      'test:mate:coverage must be a valid shell command',
    );
  } else {
    if (coverageTokens[0] !== 'node') {
      addFailure(
        failures,
        'missing-mate-quality-gate',
        'package.json',
        'test:mate:coverage must be one simple command whose executable is node',
      );
    }
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

  const urlStateSpec = 'cypress/e2e/mate-list-url-state.cy.ts';
  const presetOccurrences = matePresetSpecOccurrences(presets, urlStateSpec);
  for (const presetName of ['mateSmoke', 'mateRoute']) {
    const occurrences = presetOccurrences[presetName];
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
  const workflowSteps = extractWorkflowSteps(uncommentedWorkflow);
  const findWorkflowStep = (name) => (
    workflowSteps.find((step) => step.name === name)?.source || ''
  );
  const coverageStep = findWorkflowStep('Run mate unit coverage');
  const coverageRun = extractDirectStepSection(coverageStep, 'run');
  const coverageRunLines = coverageRun.split('\n').map((line) => line.trim());
  const hasCoverageCommand = coverageRunLines.includes(
    'npm run test:mate:coverage 2>&1 | tee reports/mate-ci/coverage.log',
  );
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
    const step = findWorkflowStep(stepName);
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
