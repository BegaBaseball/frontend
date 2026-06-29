import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
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

const writePassingPolicyFixture = () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'ci-workflow-policy-'));

  writeFixtureFile(repoRoot, '.github/labeler.yml', [
    'full-mate-regression:',
    '  - changed-files:',
    '      - any-glob-to-any-file:',
    '          - "src/store/mate*.ts"',
    '          - "scripts/mate-regression-label-policy.test.ts"',
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
    '      - "package.json"',
    '      - "package-lock.json"',
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
