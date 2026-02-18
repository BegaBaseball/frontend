#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const projectRoot = process.cwd();
const cacheDir = resolve(process.env.CYPRESS_CACHE_FOLDER || `${projectRoot}/.cypress-cache`);
const rawArgs = process.argv.slice(2);
const isOpen = rawArgs.includes('--open');
const forceDocker = rawArgs.includes('--docker') || process.env.CYPRESS_USE_DOCKER === '1';
const autoDocker = rawArgs.includes('--auto-docker') || process.env.CYPRESS_AUTO_DOCKER === '1';
const skipVerify =
  rawArgs.includes('--skip-verify')
  || rawArgs.includes('--help')
  || rawArgs.includes('-h');
const useGlobalCache = rawArgs.includes('--global-cache');
const enableSelfHeal = rawArgs.includes('--self-heal')
  || process.env.CYPRESS_SELF_HEAL === '1';
const requestTopLevelVersion = rawArgs.includes('--version') || rawArgs.includes('-v');
const commandMode = isOpen ? 'open' : 'run';

const canWriteDirectory = (directory) => {
  try {
    accessSync(directory, constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

const cypressArgs = rawArgs
  .filter((arg) => arg !== '--docker')
  .filter((arg) => arg !== '--auto-docker')
  .filter((arg) => arg !== '--open')
  .filter((arg) => arg !== '--skip-verify')
  .filter((arg) => arg !== '--self-heal')
  .filter((arg) => arg !== '--global-cache');

const installedCypressVersion = (() => {
  const versionFile = resolve(projectRoot, 'node_modules/cypress/package.json');
  if (!existsSync(versionFile)) {
    return null;
  }

  try {
    const contents = readFileSync(versionFile, 'utf8');
    return JSON.parse(contents).version || null;
  } catch {
    return null;
  }
})();

const parseCypressBinaryVersion = (outputText) => {
  const match = outputText.match(/Cypress binary version:\s*([0-9]+\.[0-9]+\.[0-9]+)/);
  return match ? match[1] : null;
};

const getBinaryVersion = (environment = envWithCache) => {
  const { status, stdout, stderr } = runCommandWithOutput('npx', ['cypress', 'version'], environment);
  if (status !== 0) {
    return null;
  }

  return parseCypressBinaryVersion(`${stdout}\n${stderr}`);
};

const hasWritableBinaryState = (environmentCacheDir, version) => {
  const binaryStatePath = join(environmentCacheDir, version, 'binary_state.json');
  const appPath = join(environmentCacheDir, version, 'Cypress.app');
  if (!existsSync(appPath)) {
    return false;
  }

  if (existsSync(binaryStatePath)) {
    try {
      accessSync(binaryStatePath, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  return canWriteDirectory(join(environmentCacheDir, version));
};

const hasExpectedLocalBinary = () => {
  if (!installedCypressVersion) {
    return false;
  }

  return hasWritableBinaryState(cacheDir, installedCypressVersion);
};

const isBinaryVersionCompatible = (environment = envWithCache) => {
  if (!installedCypressVersion) {
    return false;
  }

  const binaryVersion = getBinaryVersion(environment);
  if (!binaryVersion) {
    return false;
  }

  return binaryVersion === installedCypressVersion;
};

const envWithCache = {
  ...process.env,
};

if (!useGlobalCache) {
  if (hasExpectedLocalBinary()) {
    envWithCache.CYPRESS_CACHE_FOLDER = cacheDir;
  } else {
    delete envWithCache.CYPRESS_CACHE_FOLDER;
  }
}

if (useGlobalCache) {
  delete envWithCache.CYPRESS_CACHE_FOLDER;
}

const runCommand = (command, args = [], env = process.env, stdio = 'inherit') => {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      ...env,
    },
    stdio,
    encoding: 'utf8',
  });

  if (result.signal) {
    console.log(`[signal] ${command} was terminated by ${result.signal}`);
  }

  return result;
};

const runCommandStatus = (command, args = [], env = envWithCache, stdio = 'inherit') => (
  runCommand(command, args, env, stdio).status ?? 1
);

const runCommandWithOutput = (command, args = [], env = envWithCache) => {
  const result = runCommand(command, args, env, 'pipe');
  return {
    status: result.status ?? 1,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
    signal: result.signal ?? null,
  };
};

const summarizeOutput = (text) => text
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((line) => /SIGABRT|killed|signature|signature have been modified|not able|xattr|error|failed/i.test(line))
  .slice(0, 8);

const getDefaultCacheDir = () => {
  const result = spawnSync('npx', ['cypress', 'cache', 'path'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      CYPRESS_CACHE_FOLDER: undefined,
    },
    encoding: 'utf8',
  });

  const output = String(result.stdout ?? '').trim();
  if (result.status !== 0 || !output) {
    return null;
  }

  return output;
};

const getInstalledVersions = (cachePath) => {
  if (!existsSync(cachePath)) {
    return [];
  }

  return readdirSync(cachePath)
    .filter((name) => /^\d+\.\d+\.\d+$/.test(name))
    .filter((name) => existsSync(join(cachePath, name, 'Cypress.app')));
};

const repairCacheDirectory = (cachePath) => {
  if (!canWriteDirectory(cachePath)) {
    console.log(`\nSkip cache repair: no write permission on ${cachePath}.`);
    return false;
  }

  const versions = getInstalledVersions(cachePath);
  if (versions.length === 0) {
    return false;
  }

  console.log(`\nAttempting cache repair: ${cachePath}`);
  let repaired = false;

  versions.forEach((version) => {
    const appPath = join(cachePath, version, 'Cypress.app');
    const code = runCommandStatus('xattr', ['-cr', appPath], {
      ...process.env,
      CYPRESS_CACHE_FOLDER: cachePath,
    }, 'ignore');
    if (code === 0) {
      repaired = true;
    }
  });

  return repaired;
};

const isVerifySuccessful = (environment = envWithCache) => {
  const { status, stdout, stderr } = runCommandWithOutput('npx', ['cypress', 'verify'], environment);
  if (status !== 0) {
    const summary = summarizeOutput(`${stdout}\n${stderr}`);
    if (summary.length > 0) {
      console.log(`\nVerify output summary:\n  - ${summary.join('\n  - ')}`);
    }
  }

  return status === 0;
};

const isVerifySuccessfulWithSelfHeal = (environment = envWithCache) => {
  if (enableSelfHeal) {
    const cachePath = environment.CYPRESS_CACHE_FOLDER
      || cacheDir;
    const repaired = repairCacheDirectory(cachePath);
    if (repaired) {
      console.log(`Cache repair attempted for ${cachePath}.`);
    }
  }

  return isVerifySuccessful(environment);
};

const hasDocker = () => {
  const binaryCheck = runCommandStatus('docker', ['--version'], { ...envWithCache }, 'ignore') === 0;
  if (!binaryCheck) {
    return false;
  }

  return runCommandStatus('docker', ['info'], { ...envWithCache }, 'ignore') === 0;
};

const getExpectedBinaryVersion = (environment = envWithCache) => {
  const cachePath = environment.CYPRESS_CACHE_FOLDER || cacheDir;
  if (!installedCypressVersion) {
    return false;
  }

  const versions = getInstalledVersions(cachePath);
  return versions.includes(installedCypressVersion);
};

const runLocal = (environment = envWithCache) => {
  console.log(`\n[local] running npx cypress ${commandMode}`);
  const status = runCommandStatus('npx', ['cypress', commandMode, ...cypressArgs], environment);
  return status ?? 1;
};

const runLocalWithoutVerify = (environment = envWithCache) => {
  console.log('\n[local] direct run without prior verify');
  if (!isBinaryVersionCompatible(environment)) {
    console.log(`\nSkipping direct run: local binary version does not match Cypress package version ${installedCypressVersion}.`);
    return 1;
  }

  const status = runCommandStatus('npx', ['cypress', commandMode, ...cypressArgs], environment);
  return status ?? 1;
};

const runDocker = () => {
  const image = process.env.CYPRESS_DOCKER_IMAGE
    || (installedCypressVersion ? `cypress/included:${installedCypressVersion}` : 'cypress/included:15.9.0');
  const hostUrl = process.env.CYPRESS_DOCKER_BASE_URL || 'http://host.docker.internal:5176';
  if (commandMode !== 'run') {
    console.log('\nDocker fallback supports run mode only.');
    process.exit(1);
  }

  const dockerArgs = [
    'run',
    '--rm',
    '--add-host',
    'host.docker.internal:host-gateway',
    '-v',
    `${projectRoot}:/e2e`,
    '-w',
    '/e2e',
    '-e',
    `CYPRESS_baseUrl=${hostUrl}`,
    image,
    'npx',
    'cypress',
    'run',
    ...cypressArgs,
  ];

  const hasConfig = cypressArgs.includes('--config');
  const argsWithHostBaseUrl = hasConfig
    ? dockerArgs
    : [
      ...dockerArgs,
      '--config',
      `baseUrl=${hostUrl}`,
    ];

  console.log(`\n[local failed] fallback to Docker image: ${image}`);
  console.log(`         host target: ${hostUrl}`);
  const status = runCommandStatus('docker', argsWithHostBaseUrl, envWithCache);
  return status ?? 1;
};

console.log('Cypress orchestrator');
console.log(`- cacheDir: ${cacheDir}`);
console.log(`- useGlobalCache: ${useGlobalCache ? 'true' : 'false'}`);

if (skipVerify) {
  process.exit(runLocal());
}

if (requestTopLevelVersion) {
  const status = runCommandStatus('npx', ['cypress', 'version'], envWithCache);
  process.exit(status ?? 1);
}

const primaryVerify = enableSelfHeal
  ? isVerifySuccessfulWithSelfHeal(envWithCache)
  : isVerifySuccessful(envWithCache);

if (primaryVerify) {
  process.exit(runLocal());
}

console.log('\nLocal Cypress verify failed.');

if (!useGlobalCache) {
  const globalCacheDir = getDefaultCacheDir();
  const fallbackCacheDir = globalCacheDir && resolve(globalCacheDir);

  if (fallbackCacheDir && fallbackCacheDir !== cacheDir && existsSync(fallbackCacheDir)) {
    console.log(`\nPrimary cache failed. Trying fallback Cypress cache: ${fallbackCacheDir}`);
    const fallbackEnv = {
      ...process.env,
      CYPRESS_CACHE_FOLDER: fallbackCacheDir,
    };

    const fallbackVerify = enableSelfHeal
      ? isVerifySuccessfulWithSelfHeal(fallbackEnv)
      : isVerifySuccessful(fallbackEnv);
    if (fallbackVerify) {
      console.log('Fallback cache verification succeeded.');
      process.exit(runLocal(fallbackEnv));
    }

    console.log('Fallback cache verification failed.');

if (commandMode === 'run') {
      const fallbackHasExpectedBinary = getExpectedBinaryVersion(fallbackEnv);
      if (fallbackHasExpectedBinary && isBinaryVersionCompatible(fallbackEnv)) {
        const fallbackNoVerifyStatus = runLocalWithoutVerify(fallbackEnv);
        if (fallbackNoVerifyStatus === 0) {
          process.exit(0);
        }

        console.log('\nFallback cache verification skip verify run also failed.');
      } else if (fallbackHasExpectedBinary) {
        console.log(`\nFallback cache contains Cypress path ${installedCypressVersion} but binary version check failed.`);
      } else {
        console.log(`\nFallback cache does not contain Cypress ${installedCypressVersion}.`);
      }
    }
  }
}

if (commandMode === 'run') {
  const defaultHasExpectedBinary = getExpectedBinaryVersion();
  if (defaultHasExpectedBinary && isBinaryVersionCompatible()) {
    const directNoVerifyStatus = runLocalWithoutVerify();
    if (directNoVerifyStatus === 0) {
      process.exit(0);
    }

    console.log('\nDirect run with verification disabled also failed.');
  } else if (defaultHasExpectedBinary) {
    console.log(`\nDefault cache has Cypress path ${installedCypressVersion} but binary version check failed.`);
  } else {
    console.log(`\nDefault cache does not contain Cypress ${installedCypressVersion}.`);
  }
}

if (commandMode === 'open') {
  console.log('Local Cypress failed to launch in open mode. Open requires a local interactive GUI binary and cannot fallback to Docker.');
  process.exit(1);
}

if (!forceDocker && !autoDocker) {
  console.log('Set CYPRESS_USE_DOCKER=1 or run `npm run cy:run:docker -- [args]` to use Docker fallback.');
  console.log('If local verification is unstable, run with --auto-docker.');
  process.exit(1);
}

if (autoDocker && !forceDocker && commandMode !== 'run') {
  console.log('Auto Docker fallback is available only for run mode.');
  process.exit(1);
}

if (!hasDocker()) {
  console.log('\nDocker is not available. Re-run after installing Docker Desktop.');
  process.exit(1);
}

process.exit(runDocker());
