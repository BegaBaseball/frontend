import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const cypressRunPath = path.join(scriptDir, 'cypress-run.mjs');
const testE2ePath = path.join(scriptDir, 'test-e2e.mjs');
const cypressRunSource = readFileSync(cypressRunPath, 'utf8');
const packageJson = JSON.parse(readFileSync(path.join(frontendRoot, 'package.json'), 'utf8'));

const writeExecutable = (filePath, source) => {
  writeFileSync(filePath, source, 'utf8');
  chmodSync(filePath, 0o755);
};

const createFakeProject = () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cypress-run-test-'));
  const binDir = path.join(root, 'bin');
  const logPath = path.join(root, 'commands.log');

  mkdirSync(path.join(root, 'node_modules/cypress'), { recursive: true });
  mkdirSync(path.join(root, 'cypress/e2e'), { recursive: true });
  mkdirSync(binDir, { recursive: true });
  writeFileSync(path.join(root, 'node_modules/cypress/package.json'), JSON.stringify({ version: '15.13.0' }), 'utf8');
  writeFileSync(path.join(root, 'cypress/e2e/example.cy.ts'), 'describe("example", () => {});\n', 'utf8');
  writeFileSync(logPath, '', 'utf8');

  writeExecutable(path.join(binDir, 'npx'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CYPRESS_RUN_TEST_LOG, JSON.stringify({
  command: 'npx',
  args,
  env: {
    CYPRESS_CACHE_FOLDER: process.env.CYPRESS_CACHE_FOLDER || null,
    CYPRESS_SKIP_VERIFY: process.env.CYPRESS_SKIP_VERIFY || null,
  },
}) + '\\n');

if (args[0] === 'cypress' && args[1] === 'version') {
  console.log('Cypress package version: 15.13.0');
  console.log('Cypress binary version: 15.13.0');
  process.exit(0);
}

if (args[0] === 'cypress' && args[1] === 'verify') {
  process.exit(42);
}

if (args[0] === 'cypress' && args[1] === 'cache' && args[2] === 'path') {
  console.log(process.env.FAKE_CYPRESS_GLOBAL_CACHE || '');
  process.exit(0);
}

process.exit(0);
`);

  writeExecutable(path.join(binDir, 'docker'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CYPRESS_RUN_TEST_LOG, JSON.stringify({
  command: 'docker',
  args,
}) + '\\n');
process.exit(0);
`);

  writeExecutable(path.join(binDir, 'npm'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CYPRESS_RUN_TEST_LOG, JSON.stringify({
  command: 'npm',
  args,
  env: {
    CYPRESS_DOCKER_BASE_URL: process.env.CYPRESS_DOCKER_BASE_URL || null,
    CYPRESS_FRONTEND_BASE_URL: process.env.CYPRESS_FRONTEND_BASE_URL || null,
    CYPRESS_SKIP_VERIFY: process.env.CYPRESS_SKIP_VERIFY || null,
  },
}) + '\\n');
process.exit(0);
`);

  return {
    root,
    binDir,
    logPath,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
};

const runCypressRun = (project, args, env = {}) => {
  const childEnv = {
    ...process.env,
    PATH: `${project.binDir}${path.delimiter}${process.env.PATH || ''}`,
    CYPRESS_RUN_TEST_LOG: project.logPath,
    ...env,
  };

  for (const key of [
    'CYPRESS_ALLOW_GLOBAL_FALLBACK',
    'CYPRESS_AUTO_DOCKER',
    'CYPRESS_CACHE_FOLDER',
    'CYPRESS_DISABLE_AUTO_DOCKER_FALLBACK',
    'CYPRESS_PREFER_DOCKER',
    'CYPRESS_SELF_HEAL',
    'CYPRESS_SKIP_VERIFY',
    'CYPRESS_USE_DOCKER',
    'CYPRESS_VERIFY_TIMEOUT',
  ]) {
    if (!Object.hasOwn(env, key)) {
      delete childEnv[key];
    }
  }

  return spawnSync(process.execPath, [cypressRunPath, ...args], {
    cwd: project.root,
    env: childEnv,
    encoding: 'utf8',
  });
};

const readCommandLog = (logPath) => {
  const text = readFileSync(logPath, 'utf8').trim();
  return text ? text.split('\n').map((line) => JSON.parse(line)) : [];
};

const printPreset = (...args) => {
  const maybeEnv = args.at(-1);
  const env = maybeEnv && typeof maybeEnv === 'object' && !Array.isArray(maybeEnv)
    ? args.pop()
    : {};
  const result = spawnSync(process.execPath, ['scripts/qa-presets.mjs', ...args, '--print'], {
    cwd: frontendRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
    },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
};

const runTestE2e = (project, args, env = {}) => {
  const childEnv = {
    ...process.env,
    PATH: `${project.binDir}${path.delimiter}${process.env.PATH || ''}`,
    CYPRESS_RUN_TEST_LOG: project.logPath,
    ...env,
  };

  for (const key of [
    'CYPRESS_ATTACH_EXISTING_SERVER',
    'CYPRESS_BASE_URL',
    'CYPRESS_FRONTEND_BASE_URL',
    'CYPRESS_PREFER_DOCKER',
    'CYPRESS_SKIP_VERIFY',
    'CYPRESS_TEST_HOST',
    'CYPRESS_TEST_PORT',
  ]) {
    if (!Object.hasOwn(env, key)) {
      delete childEnv[key];
    }
  }

  return spawnSync(process.execPath, [testE2ePath, ...args], {
    cwd: project.root,
    env: childEnv,
    encoding: 'utf8',
  });
};

test('CYPRESS_SKIP_VERIFY environment bypasses local verify before run', () => {
  const project = createFakeProject();
  try {
    const result = runCypressRun(project, [
      '--spec',
      'cypress/e2e/example.cy.ts',
    ], {
      CYPRESS_SKIP_VERIFY: 'true',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const commands = readCommandLog(project.logPath);
    assert.equal(
      commands.some((entry) => entry.command === 'npx' && entry.args[1] === 'verify'),
      false,
      'npx cypress verify should not run when CYPRESS_SKIP_VERIFY is true',
    );
    assert.ok(
      commands.some((entry) => (
        entry.command === 'npx'
        && entry.args[1] === 'run'
        && entry.env.CYPRESS_SKIP_VERIFY === 'true'
      )),
      'local Cypress run should receive CYPRESS_SKIP_VERIFY=true',
    );
  } finally {
    project.cleanup();
  }
});

test('Docker Cypress run forwards CLI skip-verify to the container runtime', () => {
  const project = createFakeProject();
  try {
    const result = runCypressRun(project, [
      '--docker',
      '--skip-verify',
      '--spec',
      'cypress/e2e/example.cy.ts',
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const commands = readCommandLog(project.logPath);
    const dockerRun = commands.find((entry) => entry.command === 'docker' && entry.args[0] === 'run');
    assert.ok(dockerRun, 'docker run should be invoked');
    assert.ok(
      dockerRun.args.includes('CYPRESS_SKIP_VERIFY=true'),
      'CYPRESS_SKIP_VERIFY=true should be forwarded into docker run',
    );
    assert.deepEqual(
      dockerRun.args.slice(dockerRun.args.indexOf('--shm-size'), dockerRun.args.indexOf('--shm-size') + 2),
      ['--shm-size', '2g'],
      'Docker Cypress run should use a larger shared memory segment by default',
    );
    const imageIndex = dockerRun.args.indexOf('cypress/included:15.13.0');
    assert.ok(imageIndex >= 0, 'docker run should use the Cypress included image');
    assert.equal(
      dockerRun.args[imageIndex + 1],
      '--spec',
      'cypress/included already has a cypress run entrypoint, so the runner should pass Cypress args directly',
    );
  } finally {
    project.cleanup();
  }
});

test('test-e2e Docker path forwards CYPRESS_SKIP_VERIFY through the Cypress runner script', () => {
  const project = createFakeProject();
  try {
    const result = runTestE2e(project, [
      '--no-server',
      '--docker',
      '--host',
      '127.0.0.1',
      '--port',
      '5176',
      '--spec',
      'cypress/e2e/example.cy.ts',
    ], {
      CYPRESS_SKIP_VERIFY: '1',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const commands = readCommandLog(project.logPath);
    const npmRun = commands.find((entry) => entry.command === 'npm' && entry.args[0] === 'run');
    assert.ok(npmRun, 'test-e2e should invoke npm run for Cypress');
    assert.equal(npmRun.args[1], 'cy:run:docker');
    assert.ok(npmRun.args.includes('--skip-verify'), 'test-e2e should pass --skip-verify to cypress-run');
    assert.deepEqual(npmRun.env, {
      CYPRESS_DOCKER_BASE_URL: 'http://127.0.0.1:5176',
      CYPRESS_FRONTEND_BASE_URL: 'http://127.0.0.1:5176',
      CYPRESS_SKIP_VERIFY: '1',
    });
  } finally {
    project.cleanup();
  }
});

test('Cypress qa presets keep global cache and Docker flows distinct', () => {
  assert.deepEqual(printPreset('cypress', 'run'), {
    command: 'node',
    args: ['scripts/cypress-run.mjs'],
    envOverrides: {},
  });
  assert.deepEqual(printPreset('cypress', 'run-docker'), {
    command: 'node',
    args: ['scripts/cypress-run.mjs'],
    envOverrides: { CYPRESS_USE_DOCKER: '1' },
  });
  assert.deepEqual(printPreset('cypress', 'run-global'), {
    command: 'node',
    args: ['scripts/cypress-run.mjs', '--global-cache'],
    envOverrides: {},
  });
  assert.deepEqual(printPreset('cypress', 'run-global-docker'), {
    command: 'node',
    args: ['scripts/cypress-run.mjs', '--global-cache'],
    envOverrides: { CYPRESS_USE_DOCKER: '1' },
  });
});

test('Mate route regression defaults to local Cypress with Docker opt-in', () => {
  assert.deepEqual(printPreset('mate-e2e', 'route'), {
    command: 'node',
    args: [
      'scripts/test-e2e.mjs',
      '--host',
      '127.0.0.1',
      '--browser',
      'electron',
      '--spec',
      'cypress/e2e/mate.cy.ts,cypress/e2e/mate-detail-states.cy.ts,cypress/e2e/mate-list-url-state.cy.ts,cypress/e2e/mate-execution-flow.cy.ts,cypress/e2e/mate-qr-refresh.cy.ts',
    ],
    envOverrides: {
      CYPRESS_ALLOW_GLOBAL_FALLBACK: '1',
      CYPRESS_DISABLE_AUTO_DOCKER_FALLBACK: '1',
    },
  });
  assert.deepEqual(printPreset('mate-e2e', 'route', { MATE_REGRESSION_USE_DOCKER: '1' }), {
    command: 'node',
    args: [
      'scripts/test-e2e.mjs',
      '--docker',
      '--host',
      '127.0.0.1',
      '--browser',
      'electron',
      '--spec',
      'cypress/e2e/mate.cy.ts,cypress/e2e/mate-detail-states.cy.ts,cypress/e2e/mate-list-url-state.cy.ts,cypress/e2e/mate-execution-flow.cy.ts,cypress/e2e/mate-qr-refresh.cy.ts',
    ],
    envOverrides: {},
  });
});

test('package Cypress scripts point to the matching qa presets', () => {
  assert.equal(packageJson.scripts['cy:run'], 'node scripts/qa-presets.mjs cypress run');
  assert.equal(packageJson.scripts['cy:run:docker'], 'node scripts/qa-presets.mjs cypress run-docker');
  assert.equal(packageJson.scripts['cy:run:global'], 'node scripts/qa-presets.mjs cypress run-global');
  assert.equal(packageJson.scripts['cy:run:global:docker'], 'node scripts/qa-presets.mjs cypress run-global-docker');
  assert.equal(packageJson.scripts['cy:mypage:connections'], 'node scripts/qa-presets.mjs cypress mypage-connections');
  assert.equal(packageJson.scripts['cy:mypage:connections:global'], 'node scripts/qa-presets.mjs cypress mypage-connections-global');
  assert.equal(packageJson.scripts['test:cypress-runner'], 'node --test scripts/cypress-run.test.mjs');
  assert.equal(
    packageJson.scripts['test:cypress-runner:docker-smoke'],
    'npm run cy:run:docker -- --skip-verify --spec cypress/e2e/runner-docker-smoke.cy.ts',
  );
});

test('Docker Cypress run sets a longer default verify timeout', () => {
  assert.match(
    cypressRunSource,
    /const DEFAULT_DOCKER_CYPRESS_VERIFY_TIMEOUT_MS = '240000';/,
    'Docker Cypress verify timeout default should allow slower arm64 Electron startup',
  );
  assert.match(
    cypressRunSource,
    /process\.env\[key\] \|\| DEFAULT_DOCKER_CYPRESS_VERIFY_TIMEOUT_MS/,
    'caller-provided CYPRESS_VERIFY_TIMEOUT should override the Docker default',
  );
});

test('runner Docker smoke spec is explicit-only', () => {
  assert.match(
    cypressRunSource,
    /'cypress\/e2e\/runner-docker-smoke\.cy\.ts'/,
    'Docker smoke spec should not be included in default Cypress spec collection',
  );
});
