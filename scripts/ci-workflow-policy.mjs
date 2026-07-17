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

const countPresetSpecOccurrences = (contents, presetName, spec) => {
  const section = contents.match(new RegExp(`\\b${presetName}\\s*:\\s*\\[([\\s\\S]*?)\\]`));
  if (!section) return 0;
  const uncommentedSection = section[1]
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const entries = [...uncommentedSection.matchAll(/(['"])(.*?)\1/g)];
  return entries.filter((entry) => entry[2] === spec).length;
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

  const requiredCoverageSnippets = [
    '--experimental-test-coverage',
    '--test-coverage-lines=90',
    '--test-coverage-branches=70',
    '--test-coverage-functions=70',
  ];
  for (const snippet of requiredCoverageSnippets) {
    requireSnippet(failures, 'package.json', coverageScript, snippet, 'missing-mate-quality-gate');
  }

  const required = [
    ['scripts/qa-presets.mjs', presets, "mateSmoke:"],
    ['scripts/qa-presets.mjs', presets, "mateRoute:"],
    ['scripts/qa-presets.mjs', presets, 'cypress/e2e/mate-list-url-state.cy.ts'],
    [workflowPath('_frontend-mate-ci.yml'), workflow, 'Run mate unit coverage'],
    [workflowPath('_frontend-mate-ci.yml'), workflow, 'npm run test:mate:coverage'],
    [workflowPath('_frontend-mate-ci.yml'), workflow, 'reports/mate-ci/coverage.log'],
    [workflowPath('_frontend-mate-ci.yml'), workflow, 'MATE_CI_STATUS_COVERAGE'],
  ];

  for (const [file, contents, snippet] of required) {
    requireSnippet(failures, file, contents, snippet, 'missing-mate-quality-gate');
  }

  const urlStateSpec = 'cypress/e2e/mate-list-url-state.cy.ts';
  for (const presetName of ['mateSmoke', 'mateRoute']) {
    const occurrences = countPresetSpecOccurrences(presets, presetName, urlStateSpec);
    if (occurrences !== 1) {
      addFailure(
        failures,
        'missing-mate-quality-gate',
        'scripts/qa-presets.mjs',
        `${urlStateSpec} must appear exactly once in ${presetName}`,
      );
    }
  }

  const coverageStatusOccurrences = workflow.split('MATE_CI_STATUS_COVERAGE').length - 1;
  if (coverageStatusOccurrences < 2) {
    addFailure(
      failures,
      'missing-mate-quality-gate',
      workflowPath('_frontend-mate-ci.yml'),
      'MATE_CI_STATUS_COVERAGE must be propagated to both summary steps',
    );
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
    'vite.config.ts',
    'src/main.tsx',
    'src/index.css',
    'src/components/AppRoutes.tsx',
    'src/components/RootEntryRoute.tsx',
    'src/components/lazyRouteLoaders.ts',
    'src/components/Layout.tsx',
    'src/components/Navbar*.tsx',
    'src/components/PublicNavbar*.tsx',
    'src/components/Landing.tsx',
    'src/components/Home.tsx',
    'src/components/home/**',
    'src/components/Prediction.tsx',
    'src/components/prediction/**',
    'src/components/Cheer.tsx',
    'src/components/Cheer*.tsx',
    'src/components/cheer/**',
    'src/components/MatePage.tsx',
    'src/components/Mate*.tsx',
    'module-federation.config.ts',
    'src/vite-env.d.ts',
    'src/types/module-federation.d.ts',
    'src/components/moduleFederation/**',
    'src/utils/coreWebVitalsTelemetry.ts',
    'src/utils/coreWebVitalsTelemetry.test.ts',
    'scripts/bundle-guard.mjs',
    'scripts/dist-assets.mjs',
    'scripts/cwv-baseline.mjs',
    'scripts/cwv-baseline.test.mjs',
    'scripts/cwv-lab-audit.mjs',
    'scripts/cwv-lab-audit.test.mjs',
    'scripts/module-federation-config.test.ts',
    'scripts/module-federation-artifacts-smoke.mjs',
    'scripts/module-federation-artifacts-smoke.test.mjs',
    'scripts/module-federation-gate.mjs',
    'scripts/module-federation-gate.test.mjs',
    'scripts/module-federation-host-usage.test.mjs',
    'scripts/module-federation-probe-smoke.mjs',
    'scripts/module-federation-probe-smoke.test.mjs',
    'scripts/module-federation-readiness.mjs',
    'scripts/module-federation-readiness.test.mjs',
    'scripts/module-federation-remote-smoke.mjs',
    'scripts/module-federation-remote-smoke.test.mjs',
    'scripts/module-federation-types.test.mjs',
    'cypress/e2e/module-federation-probe.cy.ts',
    'docs/core-web-vitals.md',
    'docs/module-federation.md',
    'package.json',
    'package-lock.json',
  ];

  for (const snippet of requiredSeoPaths) {
    requireSnippet(failures, workflow, contents, snippet, 'missing-seo-audit-pr-path');
  }

  const requiredModuleFederationSnippets = [
    'module-federation-build:',
    "github.event.inputs.suite == 'mf'",
    'npm run gate:mf',
    'npm run smoke:mf:probe',
    'npm run smoke:mf:probe:remote',
    'scripts/module-federation-probe-smoke.mjs',
    'reports/module-federation-readiness.json',
    'reports/module-federation-artifacts-smoke.json',
    'VITE_MF_DESIGN_SYSTEM_ENTRY',
    'Remote entry configured:',
    'reports/module-federation-remote-smoke.json',
    'cypress/screenshots/module-federation-probe.cy.ts/**',
    'frontend-module-federation-artifacts',
    'dist/mf-manifest.json',
    'dist/begabaseball_frontend/remoteEntry.js',
  ];

  for (const snippet of requiredModuleFederationSnippets) {
    requireSnippet(failures, workflow, contents, snippet, 'missing-module-federation-build-wiring');
  }

  forbidSnippet(
    failures,
    workflow,
    contents,
    'Remote entry: ${VITE_MF_DESIGN_SYSTEM_ENTRY',
    'forbidden-module-federation-remote-entry-summary-value',
  );

  const requiredCwvSnippets = [
    'cwv-lab:',
    "github.event_name == 'pull_request'",
    "github.event_name == 'schedule'",
    'install_playwright: true',
    'npm run gate:cwv:lab',
    'frontend-cwv-lab-artifacts',
    'reports/cwv-lab-audit.md',
    'reports/bundle-guard-report.json',
    'cwv-baseline:',
    "github.event.inputs.suite == 'cwv'",
    'PAGESPEED_API_KEY: ${{ secrets.PAGESPEED_API_KEY }}',
    'CRUX_API_KEY: ${{ secrets.CRUX_API_KEY }}',
    'npm run gate:cwv:baseline',
    'reports/cwv-baseline.json',
    'frontend-cwv-baseline-artifacts',
  ];

  for (const snippet of requiredCwvSnippets) {
    requireSnippet(failures, workflow, contents, snippet, 'missing-cwv-baseline-wiring');
  }
};

const checkCoreWebVitalsRunbook = (repoRoot, failures) => {
  const runbook = 'docs/core-web-vitals.md';
  const contents = requireFile(repoRoot, failures, runbook);
  if (!contents) {
    return;
  }

  const requiredSnippets = [
    '<= 1.8 s',
    '<= 100 ms',
    '<= 0.05',
    'PAGESPEED_API_KEY',
    'PSI_API_KEY',
    'CRUX_API_KEY',
    '--env-file ../.env.prod',
    'CWV_BASELINE_ENV_FILE',
    'CWV_BASELINE_ROUTES',
    '--routes /prediction,/mate',
    'npm run gate:cwv:baseline',
    'npm run gate:cwv:lab',
    'reports/cwv-baseline.md',
    'reports/cwv-lab-audit.md',
    'frontend-cwv-lab-artifacts',
    'frontend-cwv-baseline-artifacts',
    'Pull requests that touch CWV-sensitive routes',
    'Scheduled and manual `cwv` / `all` runs',
    'src/utils/coreWebVitalsTelemetry.ts',
    'cwv_lcp',
    'cwv_cls',
    'cwv_inp',
    'metric_slo_status',
  ];

  for (const snippet of requiredSnippets) {
    requireSnippet(failures, runbook, contents, snippet, 'missing-cwv-runbook-contract');
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
    'docs/core-web-vitals.md',
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
  checkCoreWebVitalsRunbook(repoRoot, failures);
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
