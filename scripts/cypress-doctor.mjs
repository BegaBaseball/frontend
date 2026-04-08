#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const projectRoot = process.cwd();
const cacheDir = resolve(process.env.CYPRESS_CACHE_FOLDER || `${projectRoot}/.cypress-cache`);
const runArgs = new Set(process.argv.slice(2));
const shouldRepair = runArgs.has('--repair');
const inspectGlobalCache = runArgs.has('--global-cache') || runArgs.has('--compare-default-cache');
const log = (message) => console.log(message);
const summarizeLines = (text, matcher, limit = 4) => String(text || '')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((line) => matcher.test(line))
  .slice(0, limit);

const getCommandEnv = (extraEnv = {}) => ({
  ...process.env,
  ...extraEnv,
});

const run = (label, command, extraEnv = {}) => {
  log(`\n- ${label}`);
  try {
    const output = execSync(command, {
      cwd: projectRoot,
      env: getCommandEnv(extraEnv),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (output.trim()) {
      log(`  ok: ${output.trim()}`);
    } else {
      log('  ok');
    }
    return true;
  } catch (error) {
    const err = error.stderr || error.stdout || error.message || '';
    log(`  fail: ${String(err).trim() || 'command returned no details'}`);
    return false;
  }
};

const findCachedVersions = () => {
  if (!existsSync(cacheDir)) {
    return [];
  }

  return readdirSync(cacheDir)
    .filter((name) => /^\d+\.\d+\.\d+$/.test(name))
    .filter((name) => existsSync(join(cacheDir, name, 'Cypress.app')));
};

const getDefaultCachePath = () => {
  try {
    const output = execSync('npx cypress cache path', {
      cwd: projectRoot,
      env: getCommandEnv({ CYPRESS_CACHE_FOLDER: undefined }),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

    return output || null;
  } catch {
    return null;
  }
};

const findCachedVersionsIn = (directory) => {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory)
    .filter((name) => /^\d+\.\d+\.\d+$/.test(name))
    .filter((name) => existsSync(join(directory, name, 'Cypress.app')));
};

const defaultCacheDir = getDefaultCachePath();
const activeCacheDir = cacheDir;
const activeVersions = findCachedVersions();
const defaultVersions = inspectGlobalCache && defaultCacheDir && defaultCacheDir !== activeCacheDir
  ? findCachedVersionsIn(defaultCacheDir)
  : [];
const activeEnv = { CYPRESS_CACHE_FOLDER: activeCacheDir };
const hasDocker = () => {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const repairDirectory = (directory, versions) => {
  versions.forEach((version) => {
    const appPath = join(directory, version, 'Cypress.app');
    if (!existsSync(appPath)) {
      return;
    }

    log(`\n- Repair attempt (${version})`);
    const result = spawnSync('xattr', ['-cr', appPath], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if ((result.status ?? 1) === 0) {
      log('  ok');
      return;
    }

    const stderr = String(result.stderr ?? '');
    const blockedSamples = summarizeLines(stderr, /Operation not permitted/i);
    const errorCount = stderr
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean).length;

    if (blockedSamples.length > 0) {
      log(`  warning: xattr clear failed on ${errorCount} entries (operation not permitted).`);
      blockedSamples.forEach((sample) => log(`    ${sample}`));
      return;
    }

    log('  warning: xattr clear failed (permission or protected filesystem)');
  });
};

const runBinarySmokeTest = (directory, version) => {
  const binaryPath = join(directory, version, 'Cypress.app', 'Contents', 'MacOS', 'Cypress');
  if (!existsSync(binaryPath)) {
    return false;
  }

  log(`\n- Binary smoke test (${version})`);
  const result = spawnSync(binaryPath, ['--no-sandbox', '--smoke-test', `--ping=${process.pid}`], {
    cwd: projectRoot,
    env: getCommandEnv({ CYPRESS_CACHE_FOLDER: directory }),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 15000,
  });

  if ((result.status ?? 1) === 0) {
    log('  ok');
    return true;
  }

  if (result.signal) {
    log(`  fail: terminated by ${result.signal}`);
  } else {
    log(`  fail: exit code ${result.status ?? 1}`);
  }

  const summary = summarizeLines(
    `${result.stdout ?? ''}\n${result.stderr ?? ''}`,
    /SIGABRT|Aborted|missing library|required-dependencies|invalid signature|operation not permitted/i,
    6,
  );
  summary.forEach((line) => log(`    ${line}`));
  return false;
};

log('Cypress local health check start');
log(`- node: ${process.version}`);
log(`- nodePath: ${process.execPath}`);
log(`- cacheDir: ${activeCacheDir}`);
if (defaultCacheDir && inspectGlobalCache) {
  log(`- default cacheDir: ${defaultCacheDir}`);
}
log(`- cached versions (${activeCacheDir}): ${activeVersions.join(', ') || 'none'}`);
if (defaultCacheDir && defaultCacheDir !== activeCacheDir && inspectGlobalCache) {
  log(`- cached versions (${defaultCacheDir}): ${defaultVersions.join(', ') || 'none'}`);
}

run('Cypress CLI version', 'npx cypress version', activeEnv);
run('Cypress cache path', 'npx cypress cache path', activeEnv);

if (activeVersions.length === 0) {
  log('\nNo Cypress.app found under custom cache directory.');
}

if (inspectGlobalCache && defaultVersions.length === 0) {
  log('\nNo Cypress.app found under default Cypress cache directory.');
}

if (shouldRepair) {
  if (activeVersions.length > 0) {
    repairDirectory(activeCacheDir, activeVersions);
  }
  if (inspectGlobalCache && defaultVersions.length > 0 && defaultCacheDir && defaultCacheDir !== activeCacheDir) {
    repairDirectory(defaultCacheDir, defaultVersions);
  }
}

if (activeVersions.length === 0 && defaultVersions.length === 0) {
  log('Run: npm run cy:install or set CYPRESS_CACHE_FOLDER to a valid cache path.');
  process.exit(0);
}

activeVersions.forEach((version) => {
  const appPath = join(activeCacheDir, version, 'Cypress.app');
  run(`codesign check (${version})`, `codesign --verify --deep --verbose=4 "${appPath}"`);

  try {
    const xattrs = execSync(`xattr -l "${appPath}"`, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .toString()
      .trim();
    if (xattrs) {
      log(`  xattrs (${version}):`);
      log(`    ${xattrs.replace(/\n/g, ', ')}`);
    } else {
      log(`  xattrs (${version}): none`);
    }
  } catch {
    log(`  xattrs (${version}): unavailable`);
  }

  run(
    `spctl assess (${version})`,
    `spctl --assess --verbose=4 "${appPath}" || true`,
  );

  if (version === activeVersions[activeVersions.length - 1]) {
    runBinarySmokeTest(activeCacheDir, version);
  }
});

if (inspectGlobalCache && defaultCacheDir && defaultVersions.length > 0) {
  defaultVersions.forEach((version) => {
    const appPath = join(defaultCacheDir, version, 'Cypress.app');
    run(`codesign check (${version})`, `codesign --verify --deep --verbose=4 "${appPath}"`);

    try {
      const xattrs = execSync(`xattr -l "${appPath}"`, {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
        .toString()
        .trim();
      if (xattrs) {
        log(`  xattrs (default cache, ${version}):`);
        log(`    ${xattrs.replace(/\n/g, ', ')}`);
      } else {
        log(`  xattrs (default cache, ${version}): none`);
      }
    } catch {
      log(`  xattrs (default cache, ${version}): unavailable`);
    }

    run(
      `spctl assess (default cache ${version})`,
      `spctl --assess --verbose=4 "${appPath}" || true`,
    );
  });
}

const verifyPassed = run('Cypress verify', 'npx cypress verify', activeEnv);

if (verifyPassed) {
  log('\nRuntime verify passed for the active cache. codesign/xattr mismatches above are advisory on this host.');
}

log('\nRecommended remediation');
log('- If verification fails, run: npm run cy:install');
log('- If verification fails due signature/xattr issues, run: node scripts/cypress-doctor.mjs --repair');
log('- If signature issues continue, reinstall cache on a networked environment:');
log('  npm run cy:install');
log('- If signature checks fail repeatedly, delete cache and reinstall:');
log(`  rm -rf ${cacheDir}`);
log('  npm run cy:install');
log('- If xattr repair reports "operation not permitted", this host is blocking bundle repair in place.');
log('  Reinstall alone may not fix runtime launch on this macOS host.');
if (hasDocker()) {
  log('- Docker fallback is available. You can run:');
  log('  npm run test:e2e:docker');
  log('  CYPRESS_USE_DOCKER=1 npm run cy:run');
} else {
  log('- Docker fallback unavailable: install Docker Desktop to use Cypress Docker image fallback.');
  log('- While local Cypress is unavailable, use Playwright smoke scripts for targeted UI checks:');
  log('  npm run qa:mobile:smoke');
  log('    runs prediction and mate smoke in sequence');
  log('  npm run qa:prediction:mobile:smoke');
  log('    reuses http://127.0.0.1:5176 when available, otherwise starts an isolated frontend');
  log('  npm run qa:mate:mobile:smoke');
  log('    reuses http://127.0.0.1:5176 when available, otherwise starts an isolated frontend');
}
if (!inspectGlobalCache && defaultCacheDir && defaultCacheDir !== activeCacheDir) {
  log('- Compare the global cache only when needed:');
  log('  npm run cy:doctor:global');
}
log('\nCypress local health check end');
