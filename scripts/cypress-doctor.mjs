#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const projectRoot = process.cwd();
const cacheDir = resolve(process.env.CYPRESS_CACHE_FOLDER || `${projectRoot}/.cypress-cache`);
const runArgs = new Set(process.argv.slice(2));
const shouldRepair = runArgs.has('--repair');
const log = (message) => console.log(message);

const run = (label, command) => {
  log(`\n- ${label}`);
  try {
    const output = execSync(command, {
      cwd: projectRoot,
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
const cachedVersions = findCachedVersions();
const defaultVersions = defaultCacheDir && defaultCacheDir !== cacheDir
  ? findCachedVersionsIn(defaultCacheDir)
  : [];
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
    try {
      execSync(`xattr -cr "${appPath}"`, {
        cwd: projectRoot,
        stdio: 'ignore',
      });
      log('  ok');
    } catch {
      log('  warning: xattr clear failed (permission or protected filesystem)');
    }
  });
};

log('Cypress local health check start');
log(`- node: ${process.version}`);
log(`- nodePath: ${process.execPath}`);
log(`- cacheDir: ${cacheDir}`);
if (defaultCacheDir) {
  log(`- default cacheDir: ${defaultCacheDir}`);
}
log(`- cached versions (${cacheDir}): ${cachedVersions.join(', ') || 'none'}`);
if (defaultCacheDir && defaultCacheDir !== cacheDir) {
  log(`- cached versions (${defaultCacheDir}): ${defaultVersions.join(', ') || 'none'}`);
}

run('Cypress CLI version', 'npx cypress version');
run('Cypress cache path', 'npx cypress cache path');

if (cachedVersions.length === 0) {
  log('\nNo Cypress.app found under custom cache directory.');
}

if (defaultVersions.length === 0) {
  log('\nNo Cypress.app found under default Cypress cache directory.');
}

if (shouldRepair) {
  if (cachedVersions.length > 0) {
    repairDirectory(cacheDir, cachedVersions);
  }
  if (defaultVersions.length > 0 && defaultCacheDir && defaultCacheDir !== cacheDir) {
    repairDirectory(defaultCacheDir, defaultVersions);
  }
}

if (cachedVersions.length === 0 && defaultVersions.length === 0) {
  log('Run: npm run cy:install or set CYPRESS_CACHE_FOLDER to a valid cache path.');
  process.exit(0);
}

cachedVersions.forEach((version) => {
  const appPath = join(cacheDir, version, 'Cypress.app');
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
});

if (defaultCacheDir && defaultVersions.length > 0) {
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

run(
  'Cypress verify',
  `CYPRESS_CACHE_FOLDER="${cacheDir}" npx cypress verify`,
);

log('\nRecommended remediation');
log('- If verification fails, run: npm run cy:install');
log('- If verification fails due signature/xattr issues, run: node scripts/cypress-doctor.mjs --repair');
log('- If signature issues continue, reinstall cache on a networked environment:');
log('  npm run cy:install');
log('- If signature checks fail repeatedly, delete cache and reinstall:');
log(`  rm -rf ${cacheDir}`);
log('  npm run cy:install');
if (hasDocker()) {
  log('- Docker fallback is available. You can run:');
  log('  npm run test:e2e:docker');
  log('  CYPRESS_USE_DOCKER=1 npm run cy:run');
} else {
  log('- Docker fallback unavailable: install Docker Desktop to use Cypress Docker image fallback.');
}
log('\nCypress local health check end');
