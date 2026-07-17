import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  DEFAULT_REPO_ROOT,
  checkCiWorkflowPolicy,
  formatCiWorkflowPolicyReport,
} from './ci-workflow-policy.mjs';

const REQUIRED_WORKFLOW_FIXTURES = [
  '_frontend-mate-ci.yml',
  '_frontend-node-suite.yml',
  '_frontend-postdeploy-suite.yml',
  'frontend-postdeploy-smoke.yml',
  'frontend-prediction-performance.yml',
  'frontend-ui-qa.yml',
];

const writeFixtureFile = (repoRoot: string, relativePath: string, contents: string) => {
  const targetPath = join(repoRoot, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, contents);
};

const writeWorkflowFixture = (repoRoot: string, fileName: string, contents: string) => {
  writeFixtureFile(repoRoot, `.github/workflows/${fileName}`, contents);
};

const MATE_COVERAGE_COMMAND = 'node --experimental-test-coverage --test-coverage-lines=90 --test-coverage-branches=70 --test-coverage-functions=70';
const MATE_COVERAGE_STATUS_MAPPING = 'MATE_CI_STATUS_COVERAGE: ${{ steps.coverage.outcome }}';

const passingMateQualityGateWorkflow = () => [
  'node-version: "22"',
  '- name: Run mate unit coverage',
  '  id: coverage',
  '  shell: bash',
  '  run: |',
  '    set -o pipefail',
  '    npm run test:mate:coverage 2>&1 | tee reports/mate-ci/coverage.log',
  '- name: Generate mate CI machine-readable summary',
  '  env:',
  `    ${MATE_COVERAGE_STATUS_MAPPING}`,
  '  run: node scripts/mate-ci-summary.mjs smoke',
  '- name: Publish mate CI summary',
  '  env:',
  `    ${MATE_COVERAGE_STATUS_MAPPING}`,
  '  run: node scripts/mate-ci-summary.mjs smoke',
].join('\n');

const writePassingPolicyFixture = () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'ci-workflow-policy-'));

  writeFixtureFile(repoRoot, '.github/labeler.yml', [
    'full-mate-regression:',
    '  - changed-files:',
    '      - any-glob-to-any-file:',
    '          - "src/store/mate*.ts"',
    '          - "scripts/mate-regression-label-policy.test.ts"',
  ].join('\n'));

  writeFixtureFile(repoRoot, 'docs/core-web-vitals.md', [
    '# Core Web Vitals Runbook',
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
  ].join('\n'));

  writeWorkflowFixture(repoRoot, 'frontend-mate.yml', [
    'on:',
    '  pull_request:',
    '    types:',
    '      - labeled',
    '  workflow_dispatch:',
    '  schedule:',
    '    - cron: "0 18 * * *"',
    'jobs:',
    '  mate-regression:',
    "    if: ${{ github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && github.event.inputs.mode == 'regression') || (github.event_name == 'pull_request' && contains(github.event.pull_request.labels.*.name, 'full-mate-regression')) }}",
    '    paths:',
    '      - ".github/labeler.yml"',
  ].join('\n'));

  writeWorkflowFixture(repoRoot, 'frontend-site-audits.yml', [
    'on:',
    '  pull_request:',
    '    paths:',
    '      - "src/seo/**"',
    '      - "scripts/seo-*"',
    '      - "scripts/prerender-seo*"',
    '      - "scripts/generate-sitemap.mjs"',
    '      - "scripts/helmet-runtime-check.mjs"',
    '      - "seo-routes.json"',
    '      - "public/robots.txt"',
    '      - "public/_headers"',
    '      - "public/_redirects"',
    '      - "index.html"',
    '      - "vite.config.ts"',
    '      - "src/main.tsx"',
    '      - "src/index.css"',
    '      - "src/components/AppRoutes.tsx"',
    '      - "src/components/RootEntryRoute.tsx"',
    '      - "src/components/lazyRouteLoaders.ts"',
    '      - "src/components/Layout.tsx"',
    '      - "src/components/Navbar*.tsx"',
    '      - "src/components/PublicNavbar*.tsx"',
    '      - "src/components/Landing.tsx"',
    '      - "src/components/Home.tsx"',
    '      - "src/components/home/**"',
    '      - "src/components/Prediction.tsx"',
    '      - "src/components/prediction/**"',
    '      - "src/components/Cheer.tsx"',
    '      - "src/components/Cheer*.tsx"',
    '      - "src/components/cheer/**"',
    '      - "src/components/MatePage.tsx"',
    '      - "src/components/Mate*.tsx"',
    '      - "module-federation.config.ts"',
    '      - "src/vite-env.d.ts"',
    '      - "src/types/module-federation.d.ts"',
    '      - "src/components/moduleFederation/**"',
    '      - "src/utils/coreWebVitalsTelemetry.ts"',
    '      - "src/utils/coreWebVitalsTelemetry.test.ts"',
    '      - "scripts/bundle-guard.mjs"',
    '      - "scripts/dist-assets.mjs"',
    '      - "scripts/cwv-baseline.mjs"',
    '      - "scripts/cwv-baseline.test.mjs"',
    '      - "scripts/cwv-lab-audit.mjs"',
    '      - "scripts/cwv-lab-audit.test.mjs"',
    '      - "scripts/module-federation-config.test.ts"',
    '      - "scripts/module-federation-artifacts-smoke.mjs"',
    '      - "scripts/module-federation-artifacts-smoke.test.mjs"',
    '      - "scripts/module-federation-gate.mjs"',
    '      - "scripts/module-federation-gate.test.mjs"',
    '      - "scripts/module-federation-host-usage.test.mjs"',
    '      - "scripts/module-federation-probe-smoke.mjs"',
    '      - "scripts/module-federation-probe-smoke.test.mjs"',
    '      - "scripts/module-federation-readiness.mjs"',
    '      - "scripts/module-federation-readiness.test.mjs"',
    '      - "scripts/module-federation-remote-smoke.mjs"',
    '      - "scripts/module-federation-remote-smoke.test.mjs"',
    '      - "scripts/module-federation-types.test.mjs"',
    '      - "cypress/e2e/module-federation-probe.cy.ts"',
    '      - "docs/core-web-vitals.md"',
    '      - "docs/module-federation.md"',
    '      - "package.json"',
    '      - "package-lock.json"',
    '  workflow_dispatch:',
    '    inputs:',
    '      suite:',
    '        options:',
    '          - mf',
    '          - cwv',
    'jobs:',
    '  module-federation-build:',
    "    if: ${{ github.event.inputs.suite == 'mf' }}",
    '    with:',
    '      env_exports: |',
    '        VITE_MF_DESIGN_SYSTEM_ENTRY=',
    '      run_script: |',
    '        npm run gate:mf',
    '        npm run smoke:mf:probe',
    '        npm run smoke:mf:probe:remote',
    '      summary_script: |',
    '        echo "- Remote entry configured: yes"',
    '      artifact_name: frontend-module-federation-artifacts',
    '      artifact_paths: |',
    '        reports/module-federation-readiness.json',
    '        reports/module-federation-artifacts-smoke.json',
    '        reports/module-federation-remote-smoke.json',
    '        cypress/screenshots/module-federation-probe.cy.ts/**',
    '        dist/mf-manifest.json',
    '        dist/begabaseball_frontend/remoteEntry.js',
    '  cwv-lab:',
    "    if: ${{ github.event_name == 'pull_request' || github.event_name == 'schedule' || github.event.inputs.suite == 'cwv' }}",
    '    with:',
    '      install_playwright: true',
    '      run_script: |',
    '        npm run gate:cwv:lab',
    '      artifact_name: frontend-cwv-lab-artifacts',
    '      artifact_paths: |',
    '        reports/cwv-lab-audit.json',
    '        reports/cwv-lab-audit.md',
    '        reports/bundle-guard-report.json',
    '  cwv-baseline:',
    "    if: ${{ github.event.inputs.suite == 'cwv' }}",
    '    secrets:',
    '      PAGESPEED_API_KEY: ${{ secrets.PAGESPEED_API_KEY }}',
    '      CRUX_API_KEY: ${{ secrets.CRUX_API_KEY }}',
    '    with:',
    '      run_script: |',
    '        npm run gate:cwv:baseline',
    '      artifact_name: frontend-cwv-baseline-artifacts',
    '      artifact_paths: |',
    '        reports/cwv-baseline.json',
  ].join('\n'));

  writeWorkflowFixture(repoRoot, 'frontend-mobile-qa.yml', [
    'jobs:',
    '  prediction-mobile-qa:',
    "    if: ${{ github.event_name == 'pull_request' || (github.event_name == 'workflow_dispatch' && github.event.inputs.suite == 'prediction') }}",
    '  combined-mobile-smoke:',
    "    if: ${{ github.event_name == 'workflow_dispatch' && github.event.inputs.suite == 'combined' }}",
  ].join('\n'));

  writeWorkflowFixture(repoRoot, 'ci-workflow-policy.yml', [
    'jobs:',
    '  ci-workflow-policy:',
    '    steps:',
    '      - uses: actions/setup-node@v4',
    '        with:',
    '          node-version: 22',
    '      - run: node scripts/ci-workflow-policy.mjs',
    'on:',
    '  pull_request:',
    '    paths:',
    '      - ".github/workflows/**"',
    '      - ".github/labeler.yml"',
    '      - "scripts/ci-workflow-policy.mjs"',
    '      - "scripts/ci-workflow-policy.test.ts"',
    '      - "docs/core-web-vitals.md"',
  ].join('\n'));

  writeWorkflowFixture(repoRoot, 'frontend-cypress-runner.yml', [
    'on:',
    '  pull_request:',
    '    paths:',
    '      - "scripts/cypress-run.mjs"',
    '      - "scripts/cypress-run.test.mjs"',
    '      - "scripts/qa-presets.mjs"',
    '      - "scripts/test-e2e.mjs"',
    '      - "cypress/e2e/runner-docker-smoke.cy.ts"',
    '  workflow_dispatch:',
    '    inputs:',
    '      suite:',
    '        type: choice',
    '        options:',
    '          - contracts',
    '          - docker-smoke',
    'jobs:',
    '  cypress-runner:',
    '    steps:',
    '      - uses: actions/setup-node@v4',
    '        with:',
    '          node-version: 22',
    '      - env:',
    '          CYPRESS_INSTALL_BINARY: "0"',
    '      - run: npm run test:cypress-runner',
    "      - if: ${{ github.event_name == 'workflow_dispatch' && inputs.suite == 'docker-smoke' }}",
    '        run: docker info',
    "      - if: ${{ github.event_name == 'workflow_dispatch' && inputs.suite == 'docker-smoke' }}",
    '        run: npm run dev -- --host 0.0.0.0 --port 5176',
    '      - env:',
    '          CYPRESS_DOCKER_BASE_URL: http://host.docker.internal:5176',
    '        run: npm run test:cypress-runner:docker-smoke',
  ].join('\n'));

  for (const fileName of REQUIRED_WORKFLOW_FIXTURES) {
    writeWorkflowFixture(repoRoot, fileName, [
      `name: ${fileName}`,
      'on:',
      '  workflow_dispatch:',
      'jobs:',
      '  noop:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: echo ok',
    ].join('\n'));
  }

  writeFixtureFile(repoRoot, 'package.json', JSON.stringify({
    scripts: {
      'test:mate:coverage': `${MATE_COVERAGE_COMMAND} --test src/utils/mateListUrlState.test.ts`,
    },
  }, null, 2));
  writeFixtureFile(repoRoot, 'scripts/qa-presets.mjs', [
    "mateSmoke: ['cypress/e2e/literal//path.cy.ts', 'cypress/e2e/literal/*path*/.cy.ts', 'cypress/e2e/mate-list-url-state.cy.ts', 'cypress/e2e/mate-execution-flow.cy.ts']",
    "mateRoute: ['cypress/e2e/mate-list-url-state.cy.ts', 'cypress/e2e/mate-execution-flow.cy.ts']",
  ].join('\n'));
  writeWorkflowFixture(repoRoot, '_frontend-mate-ci.yml', passingMateQualityGateWorkflow());

  return repoRoot;
};

test('current repository satisfies CI workflow policy', () => {
  const report = checkCiWorkflowPolicy(DEFAULT_REPO_ROOT);

  assert.equal(formatCiWorkflowPolicyReport(report), '[ci-workflow-policy] OK');
  assert.equal(report.ok, true);
});

test('policy blocks pull_request_target full mate regression labelers', () => {
  const repoRoot = writePassingPolicyFixture();
  writeWorkflowFixture(repoRoot, 'frontend-mate-regression-label.yml', [
    'on:',
    '  pull_request_target:',
    'jobs:',
    '  auto-label:',
    '    steps:',
    '      - uses: actions/labeler@v5',
    '        with:',
    '          configuration-path: .github/labeler.yml',
    '      - run: echo full-mate-regression',
  ].join('\n'));

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => (
    failure.id === 'forbidden-stale-mate-workflow'
  )));
  assert.ok(report.failures.some((failure) => (
    failure.id === 'forbidden-pr-target-full-mate-labeler'
  )));
});

test('policy blocks stale mate workflow copies', () => {
  const repoRoot = writePassingPolicyFixture();
  writeWorkflowFixture(repoRoot, 'frontend-mate-smoke.yml', [
    'name: Stale Frontend Mate Smoke',
    'on:',
    '  pull_request:',
  ].join('\n'));

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => (
    failure.id === 'forbidden-stale-mate-workflow'
  )));
});

test('policy blocks monorepo frontend path prefixes', () => {
  const repoRoot = writePassingPolicyFixture();
  writeFixtureFile(repoRoot, '.github/labeler.yml', [
    'full-mate-regression:',
    '  - changed-files:',
    '      - any-glob-to-any-file:',
    '          - "bega_frontend/src/store/mate*.ts"',
    '          - "scripts/mate-regression-label-policy.test.ts"',
  ].join('\n'));

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => (
    failure.id === 'forbidden-monorepo-frontend-prefix'
  )));
});

test('policy requires Mate URL-state smoke/route coverage and numeric coverage floors', () => {
  const repoRoot = writePassingPolicyFixture();
  writeFixtureFile(repoRoot, 'package.json', JSON.stringify({ scripts: {} }));
  writeFixtureFile(repoRoot, 'scripts/qa-presets.mjs', 'mateSmoke: []\nmateRoute: []');
  writeWorkflowFixture(repoRoot, '_frontend-mate-ci.yml', 'node-version: "22"');

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => failure.id === 'missing-mate-quality-gate'));
});

test('policy binds coverage floors to a non-empty test:mate:coverage script', () => {
  for (const mateCoverageScript of [undefined, '']) {
    const repoRoot = writePassingPolicyFixture();
    writeFixtureFile(repoRoot, 'package.json', JSON.stringify({
      scripts: {
        ...(mateCoverageScript === undefined ? {} : { 'test:mate:coverage': mateCoverageScript }),
        'test:unrelated': MATE_COVERAGE_COMMAND,
      },
    }));

    const report = checkCiWorkflowPolicy(repoRoot);

    assert.equal(report.ok, false);
    assert.ok(report.failures.some((failure) => failure.id === 'missing-mate-quality-gate'));
  }
});

test('policy rejects duplicate coverage thresholds that override required floors', () => {
  const invalidCommands = [
    `${MATE_COVERAGE_COMMAND} --test-coverage-lines=0 --test-coverage-branches=0 --test-coverage-functions=0`,
    `${MATE_COVERAGE_COMMAND} --test-coverage-lines=90 --test-coverage-branches=70 --test-coverage-functions=70`,
  ];

  for (const coverageCommand of invalidCommands) {
    const repoRoot = writePassingPolicyFixture();
    writeFixtureFile(repoRoot, 'package.json', JSON.stringify({
      scripts: { 'test:mate:coverage': coverageCommand },
    }));

    const report = checkCiWorkflowPolicy(repoRoot);

    assert.equal(report.ok, false);
    assert.ok(report.failures.some((failure) => failure.id === 'missing-mate-quality-gate'));
  }
});

test('policy rejects near-match coverage flags and threshold tokens', () => {
  const repoRoot = writePassingPolicyFixture();
  writeFixtureFile(repoRoot, 'package.json', JSON.stringify({
    scripts: {
      'test:mate:coverage': 'node --experimental-test-coverage-extra --test-coverage-lines=900 --test-coverage-branches=700 --test-coverage-functions=700',
    },
  }));

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => failure.id === 'missing-mate-quality-gate'));
});

test('policy reports invalid package JSON as a Mate quality-gate failure', () => {
  for (const invalidPackageJson of ['{ invalid json', '']) {
    const repoRoot = writePassingPolicyFixture();
    writeFixtureFile(repoRoot, 'package.json', invalidPackageJson);

    const report = checkCiWorkflowPolicy(repoRoot);

    assert.equal(report.ok, false);
    assert.ok(report.failures.some((failure) => (
      failure.id === 'missing-mate-quality-gate'
      && failure.message.includes('valid JSON')
    )));
  }
});

test('policy requires exactly one URL-state spec in each Mate preset', () => {
  const repoRoot = writePassingPolicyFixture();
  writeFixtureFile(repoRoot, 'scripts/qa-presets.mjs', [
    "mateSmoke: ['cypress/e2e/mate-list-url-state.cy.ts', 'cypress/e2e/mate-list-url-state.cy.ts', 'cypress/e2e/mate-execution-flow.cy.ts']",
    "mateRoute: ['cypress/e2e/mate-execution-flow.cy.ts']",
  ].join('\n'));

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => failure.id === 'missing-mate-quality-gate'));
});

test('policy rejects URL-state preset comments and suffixed near-matches', () => {
  const invalidSmokeEntries = [
    "'cypress/e2e/mate-list-url-state.cy.ts.disabled'",
    "// 'cypress/e2e/mate-list-url-state.cy.ts'",
  ];

  for (const invalidSmokeEntry of invalidSmokeEntries) {
    const repoRoot = writePassingPolicyFixture();
    writeFixtureFile(repoRoot, 'scripts/qa-presets.mjs', [
      'mateSmoke: [',
      `  ${invalidSmokeEntry},`,
      "  'cypress/e2e/mate-execution-flow.cy.ts',",
      ']',
      "mateRoute: ['cypress/e2e/mate-list-url-state.cy.ts', 'cypress/e2e/mate-execution-flow.cy.ts']",
    ].join('\n'));

    const report = checkCiWorkflowPolicy(repoRoot);

    assert.equal(report.ok, false);
    assert.ok(report.failures.some((failure) => failure.id === 'missing-mate-quality-gate'));
  }
});

test('policy ignores entirely commented Mate preset declarations', () => {
  const repoRoot = writePassingPolicyFixture();
  writeFixtureFile(repoRoot, 'scripts/qa-presets.mjs', [
    "// mateSmoke: ['cypress/e2e/mate-list-url-state.cy.ts']",
    "mateRoute: ['cypress/e2e/mate-list-url-state.cy.ts', 'cypress/e2e/mate-execution-flow.cy.ts']",
  ].join('\n'));

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => failure.id === 'missing-mate-quality-gate'));
});

test('policy ignores trailing inline comments that mention the URL-state spec', () => {
  const repoRoot = writePassingPolicyFixture();
  writeFixtureFile(repoRoot, 'scripts/qa-presets.mjs', [
    'mateSmoke: [',
    "  'cypress/e2e/mate-execution-flow.cy.ts', // 'cypress/e2e/mate-list-url-state.cy.ts'",
    ']',
    "mateRoute: ['cypress/e2e/mate-list-url-state.cy.ts', 'cypress/e2e/mate-execution-flow.cy.ts']",
  ].join('\n'));

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => failure.id === 'missing-mate-quality-gate'));
});

test('policy requires coverage status propagation in both Mate summary steps', () => {
  const repoRoot = writePassingPolicyFixture();
  writeWorkflowFixture(repoRoot, '_frontend-mate-ci.yml', [
    'node-version: "22"',
    '- name: Run mate unit coverage',
    '  id: coverage',
    '  run: npm run test:mate:coverage 2>&1 | tee reports/mate-ci/coverage.log',
    'MATE_CI_STATUS_COVERAGE: ${{ steps.coverage.outcome }}',
  ].join('\n'));

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => failure.id === 'missing-mate-quality-gate'));
});

test('policy requires the exact coverage outcome mapping in each named summary step', () => {
  const repoRoot = writePassingPolicyFixture();
  const workflow = passingMateQualityGateWorkflow()
    .replace(MATE_COVERAGE_STATUS_MAPPING, 'MATE_CI_STATUS_COVERAGE: ${{ steps.unit_smoke.outcome }}');
  writeWorkflowFixture(repoRoot, '_frontend-mate-ci.yml', workflow);

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => failure.id === 'missing-mate-quality-gate'));
});

test('policy ignores commented coverage status mappings', () => {
  const repoRoot = writePassingPolicyFixture();
  const workflow = passingMateQualityGateWorkflow()
    .replaceAll(MATE_COVERAGE_STATUS_MAPPING, `# ${MATE_COVERAGE_STATUS_MAPPING}`);
  writeWorkflowFixture(repoRoot, '_frontend-mate-ci.yml', workflow);

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => failure.id === 'missing-mate-quality-gate'));
});

test('policy requires coverage status in both summary steps instead of twice in one', () => {
  const repoRoot = writePassingPolicyFixture();
  writeWorkflowFixture(repoRoot, '_frontend-mate-ci.yml', [
    'node-version: "22"',
    '- name: Run mate unit coverage',
    '  id: coverage',
    '  run: |',
    '    set -o pipefail',
    '    npm run test:mate:coverage 2>&1 | tee reports/mate-ci/coverage.log',
    '- name: Generate mate CI machine-readable summary',
    '  env:',
    `    ${MATE_COVERAGE_STATUS_MAPPING}`,
    `    ${MATE_COVERAGE_STATUS_MAPPING}`,
    '- name: Publish mate CI summary',
    '  env:',
    '    MATE_CI_STATUS_UNIT_SMOKE: success',
  ].join('\n'));

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => failure.id === 'missing-mate-quality-gate'));
});

test('policy requires core coverage wiring inside the named coverage step', () => {
  const repoRoot = writePassingPolicyFixture();
  writeWorkflowFixture(repoRoot, '_frontend-mate-ci.yml', [
    'node-version: "22"',
    '- name: Run mate unit coverage',
    '  run: echo coverage',
    '- name: Unrelated step',
    '  id: coverage',
    '  run: |',
    '    set -o pipefail',
    '    npm run test:mate:coverage 2>&1 | tee reports/mate-ci/coverage.log',
    '- name: Generate mate CI machine-readable summary',
    '  env:',
    `    ${MATE_COVERAGE_STATUS_MAPPING}`,
    '- name: Publish mate CI summary',
    '  env:',
    `    ${MATE_COVERAGE_STATUS_MAPPING}`,
  ].join('\n'));

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => failure.id === 'missing-mate-quality-gate'));
});

test('policy requires the Core Web Vitals runbook contract', () => {
  const repoRoot = writePassingPolicyFixture();
  writeFixtureFile(repoRoot, 'docs/core-web-vitals.md', [
    '# Core Web Vitals Runbook',
    'npm run gate:cwv:lab',
  ].join('\n'));

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => (
    failure.id === 'missing-cwv-runbook-contract'
  )));
});

test('policy requires pull request Core Web Vitals lab wiring', () => {
  const repoRoot = writePassingPolicyFixture();
  const workflowPath = join(repoRoot, '.github/workflows/frontend-site-audits.yml');
  const workflow = readFileSync(workflowPath, 'utf8')
    .replace('  cwv-lab:', '  cwv-lab-disabled:')
    .replace("github.event_name == 'pull_request' || ", '');
  writeFileSync(workflowPath, workflow);

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => (
    failure.id === 'missing-cwv-baseline-wiring'
    && failure.message.includes('cwv-lab:')
  )));
});

test('policy blocks broad site audit paths and mobile detect jobs', () => {
  const repoRoot = writePassingPolicyFixture();
  writeWorkflowFixture(repoRoot, 'frontend-site-audits.yml', [
    'on:',
    '  pull_request:',
    '    paths:',
    '      - "**"',
  ].join('\n'));
  writeWorkflowFixture(repoRoot, 'frontend-mobile-qa.yml', [
    'jobs:',
    '  detect-changes:',
    '    outputs:',
    '      prediction_changed: true',
    '  prediction-mobile-qa:',
    '    needs: detect-changes',
  ].join('\n'));

  const report = checkCiWorkflowPolicy(repoRoot);

  assert.equal(report.ok, false);
  assert.ok(report.failures.some((failure) => (
    failure.id === 'forbidden-overbroad-site-audit-path'
  )));
  assert.ok(report.failures.some((failure) => (
    failure.id === 'forbidden-mobile-detect-job'
  )));
});
