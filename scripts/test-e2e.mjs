#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const projectRoot = process.cwd();
const normalizeFrontendBaseUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    const normalizedPath = parsed.pathname
      .replace(/\/api\/?$/i, '')
      .replace(/\/+$/, '');

    return {
      host: parsed.hostname,
      port: parsed.port || null,
      baseUrl: `${parsed.protocol}//${parsed.host}${normalizedPath || ''}`,
      protocol: parsed.protocol.replace(':', ''),
    };
  } catch {
    return null;
  }
};

const resolveFrontendTargetFromEnv = () => {
  const candidates = [
    process.env.CYPRESS_TEST_HOST,
    process.env.CYPRESS_FRONTEND_BASE_URL,
    process.env.CYPRESS_BASE_URL,
    process.env.FRONTEND_BASE_URL,
    process.env.FRONTEND_ORIGIN,
    process.env.VITE_BASE_URL,
    process.env.VITE_APP_BASE_URL,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeFrontendBaseUrl(candidate);
    if (normalized?.host) {
      return normalized;
    }
  }

  return null;
};

const resolvedFrontendTarget = resolveFrontendTargetFromEnv();
const defaultHost = process.env.CYPRESS_TEST_HOST || resolvedFrontendTarget?.host || 'localhost';
const defaultPort = process.env.CYPRESS_TEST_PORT || resolvedFrontendTarget?.port || '5176';

let startCommand = `npm run dev -- --host ${defaultHost} --port ${defaultPort}`;
let targetUrl = resolvedFrontendTarget?.baseUrl || `http://${defaultHost}:${defaultPort}`;

const runCypressCommand = (commandArgs) => {
  return spawnSync(commandArgs[0], commandArgs.slice(1), {
    cwd: projectRoot,
    stdio: 'inherit',
  }).status ?? 1;
};

const isServerReady = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, 1500);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const hasExplicitBaseUrlConfig = (args) => {
  return args.some((arg) => arg === '--config' || arg.startsWith('--config='));
};

const applyBaseUrlConfig = (args, url) => {
  if (hasExplicitBaseUrlConfig(args)) {
    return args;
  }

  return [...args, '--config', `baseUrl=${url}`];
};

const normalizeBackendBaseUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return undefined;
  }

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    const normalizedPath = parsed.pathname.replace(/\/api\/?$/i, '');
    const resolvedPath = normalizedPath === '/' ? '' : normalizedPath;
    return `${parsed.origin}${resolvedPath}`;
  } catch {
    return undefined;
  }
};

const getCypressEnvValue = (args, key) => args.some((arg, index) => {
  if (arg === '--env' && args[index + 1]) {
    return args[index + 1]
      .split(',')
      .some((entry) => entry.trim().startsWith(`${key}=`));
  }

  if (arg.startsWith('--env=')) {
    return arg
      .substring('--env='.length)
      .split(',')
      .some((entry) => entry.trim().startsWith(`${key}=`));
  }

  return false;
});

const resolveBackendBaseUrlFromEnv = () => {
  const candidates = [
    process.env.BACKEND_BASE_URL,
    process.env.SMOKE_API_BASE_URL,
    process.env.CYPRESS_BASE_URL,
    process.env.CYPRESS_BACKEND_BASE_URL,
    process.env.FRONTEND_API_BASE_URL,
    process.env.VITE_API_BASE_URL,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeBackendBaseUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
};

const buildCypressCommandArgs = (script, scriptArgs) => {
  return ['npm', 'run', script, ...(scriptArgs.length ? ['--', ...scriptArgs] : [])];
};

const runCypressWithFallback = (scriptArgs) => {
  const status = runCypressCommand(scriptArgs);
  if (status === 0) {
    return 0;
  }

  return status;
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {
    useDocker: false,
    useAutoDocker: false,
    skipVerify: false,
    noServer: false,
    host: defaultHost,
    port: defaultPort,
    cypressArgs: [],
    showHelp: false,
  };
  const remainingArgs = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--') {
      continue;
    }

    if (arg === '--docker') {
      result.useDocker = true;
      continue;
    }

    if (arg === '--auto-docker') {
      result.useAutoDocker = true;
      continue;
    }

    if (arg === '--skip-verify') {
      result.skipVerify = true;
      continue;
    }

    if (arg === '--no-server') {
      result.noServer = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      result.showHelp = true;
      continue;
    }

    if (arg === '--host') {
      if (i + 1 >= args.length) {
        throw new Error('Missing value for --host');
      }

      result.host = args[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--port') {
      if (i + 1 >= args.length) {
        throw new Error('Missing value for --port');
      }

      result.port = args[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith('--host=')) {
      result.host = arg.substring('--host='.length);
      continue;
    }

    if (arg.startsWith('--port=')) {
      result.port = arg.substring('--port='.length);
      continue;
    }

    if (arg === '--spec') {
      if (i + 1 < args.length) {
        result.cypressArgs.push(arg, args[i + 1]);
        i += 1;
      } else {
        throw new Error('Missing value for --spec');
      }
      continue;
    }

    if (arg.startsWith('--spec=')) {
      result.cypressArgs.push(arg);
      continue;
    }

    remainingArgs.push(arg);
  }

  result.cypressArgs = [...result.cypressArgs, ...remainingArgs];
  return result;
};

const showUsage = () => {
  console.log('Usage: npm run test:e2e [-- --spec path/to/spec]');
  console.log('Examples:');
  console.log('  npm run test:e2e -- --spec cypress/e2e/prediction.cy.ts');
  console.log('  npm run test:e2e:prediction:rescue');
  console.log('  npm run test:e2e -- --docker');
  console.log('  npm run test:e2e -- --auto-docker');
  console.log('  npm run test:e2e -- --host localhost --port 4173 --spec cypress/e2e/mypage.cy.ts');
  console.log('  npm run test:e2e -- --no-server --spec cypress/e2e/mypage.cy.ts');
};

try {
  const {
    useDocker,
    useAutoDocker,
    skipVerify,
    noServer,
    host,
    port,
    cypressArgs,
    showHelp,
  } = parseArgs();

  if (showHelp) {
    showUsage();
    process.exit(0);
  }

  const testScript = useAutoDocker
    ? 'cy:run:rescue'
    : (useDocker ? 'cy:run:docker' : 'cy:run');

  const baseCypressArgs = [...cypressArgs];
  if (skipVerify) {
    baseCypressArgs.push('--skip-verify');
  }
  const backendBaseUrl = resolveBackendBaseUrlFromEnv();
  if (backendBaseUrl && !getCypressEnvValue(baseCypressArgs, 'BACKEND_BASE_URL')) {
    baseCypressArgs.push('--env', `BACKEND_BASE_URL=${backendBaseUrl}`);
  } else {
    if (!backendBaseUrl) {
      console.log('Running without BACKEND_BASE_URL. security-surface-real will be skipped unless provided.');
    }
  }

  startCommand = `npm run dev -- --host ${host} --port ${port}`;
  targetUrl = `http://${host}:${port}`;
  const cypressArgsWithBaseUrl = applyBaseUrlConfig(baseCypressArgs, targetUrl);

  const testCommandArgs = buildCypressCommandArgs(testScript, cypressArgsWithBaseUrl);
  const testCommand = testCommandArgs.join(' ');
  const quotedStartCommand = JSON.stringify(startCommand);
  const quotedTestCommand = JSON.stringify(testCommand);
  const shellCommand = `npx start-server-and-test ${quotedStartCommand} ${JSON.stringify(
    targetUrl,
  )} ${quotedTestCommand}`;
  const commandLine = `start-server-and-test ${startCommand} ${targetUrl} ${testCommand}`;

  if (noServer) {
    console.log('\nRunning Cypress without auto-starting dev server');
    const status = runCypressWithFallback(testCommandArgs);
    if (status === 0) {
      process.exit(0);
    }

    if (!useDocker && !useAutoDocker) {
      console.log('\nPrimary Cypress execution failed.');
      console.log('Attempting auto-docker fallback (if Docker is available).');
      console.log('Prediction subset rescue: npm run test:e2e:prediction:rescue');
      const rescueStatus = runCypressWithFallback(
        buildCypressCommandArgs('cy:run:rescue', cypressArgsWithBaseUrl),
      );
      if (rescueStatus === 0) {
        process.exit(0);
      }
    }

    process.exit(status);
  }

  const alreadyRunning = await isServerReady(targetUrl);
  if (alreadyRunning) {
    console.log(`\nTarget URL already reachable: ${targetUrl}`);
    console.log(`\nRunning Cypress directly (${testCommand})`);
    const status = runCypressWithFallback(testCommandArgs);
    if (status === 0) {
      process.exit(0);
    }

    if (!useDocker && !useAutoDocker) {
      console.log('\nPrimary Cypress execution failed.');
      console.log('Attempting auto-docker fallback (if Docker is available).');
      console.log('Prediction subset rescue: npm run test:e2e:prediction:rescue');
      const rescueStatus = runCypressWithFallback(
        buildCypressCommandArgs('cy:run:rescue', cypressArgsWithBaseUrl),
      );
      if (rescueStatus === 0) {
        process.exit(0);
      }
    }

    process.exit(status);
  }

  console.log(`\nRunning Cypress via start-server-and-test\n${commandLine}\n`);

  const status = spawnSync(shellCommand, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  }).status;
  if (status !== 0) {
    console.log('\nstart-server-and-test 종료: ');
    const serverReadyAfterFailure = await isServerReady(targetUrl);

    if (serverReadyAfterFailure) {
      const fallbackStatus = runCypressWithFallback(testCommandArgs);
      if (fallbackStatus === 0) {
        process.exit(0);
      }
    }

    if (!useDocker && !useAutoDocker) {
      console.log('Primary execution failed. Trying auto-docker fallback.');
      console.log('Prediction subset rescue: npm run test:e2e:prediction:rescue');
      const rescueStatus = runCypressWithFallback(
        buildCypressCommandArgs('cy:run:rescue', cypressArgsWithBaseUrl),
      );
      if (rescueStatus === 0) {
        process.exit(0);
      }
    }

    console.log('If Cypress is already running in another process, retry with --no-server and the same spec.');
    console.log('예: npm run test:e2e -- --no-server --spec <spec>');
  }

  process.exit(status ?? 1);
} catch (error) {
  console.error(error?.message ?? error);
  showUsage();
  process.exit(1);
}
