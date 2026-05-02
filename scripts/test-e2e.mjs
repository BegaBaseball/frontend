#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';

const projectRoot = process.cwd();
const LOOPBACK_BIND_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
]);

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
const defaultHost = process.env.CYPRESS_TEST_HOST || resolvedFrontendTarget?.host || '127.0.0.1';
const defaultPort = process.env.CYPRESS_TEST_PORT || resolvedFrontendTarget?.port || '5176';
const devServerEnvPrefix = 'VITE_SUPPRESS_CYPRESS_PROXY_ERRORS=true';
const attachExistingServer = process.env.CYPRESS_ATTACH_EXISTING_SERVER === '1';
const preferDocker = process.env.CYPRESS_PREFER_DOCKER === '1';
const shouldPreferManagedLocalServer = !resolvedFrontendTarget && !attachExistingServer;

let startCommand = `${devServerEnvPrefix} npm run dev -- --host ${defaultHost} --port ${defaultPort}`;
let targetUrl = resolvedFrontendTarget?.baseUrl || `http://${defaultHost}:${defaultPort}`;

const VITE_SOURCE_HEALTH_PROBES = [
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/components/Home.tsx',
];

const hasViteErrorOverlay = (body) => (
  body.includes('<title>Error</title>') ||
  body.includes('Internal Server Error') ||
  body.includes('ErrorOverlay') ||
  body.includes('Failed to fetch dynamically imported module')
);

const runCypressCommand = (commandArgs, envOverrides = {}) => {
  return spawnSync(commandArgs[0], commandArgs.slice(1), {
    cwd: projectRoot,
    env: {
      ...process.env,
      ...envOverrides,
    },
    stdio: 'inherit',
  }).status ?? 1;
};

const runCurlWithOutput = (args) => {
  const result = spawnSync('curl', args, {
    cwd: projectRoot,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (result.error) {
    return null;
  }

  return {
    status: result.status ?? 1,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
  };
};

const probeUrlStatusWithCurl = (url) => {
  const result = runCurlWithOutput([
    '-sS',
    '-L',
    '--max-time',
    '2',
    '-o',
    '/dev/null',
    '-w',
    '%{http_code}',
    url,
  ]);

  if (!result) {
    return null;
  }

  const statusCode = Number.parseInt(result.stdout.trim(), 10);
  if (!Number.isFinite(statusCode)) {
    return null;
  }

  return statusCode;
};

const readUrlBodyWithCurl = (url) => {
  const result = runCurlWithOutput([
    '-sS',
    '-L',
    '--max-time',
    '2',
    url,
  ]);

  if (!result || result.status !== 0) {
    return null;
  }

  return result.stdout;
};

const isServerReady = async (url) => {
  const curlStatusCode = probeUrlStatusWithCurl(url);
  if (Number.isFinite(curlStatusCode)) {
    return curlStatusCode >= 200 && curlStatusCode < 500;
  }

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

const isViteSourceServerHealthy = async (url) => {
  for (const probePath of VITE_SOURCE_HEALTH_PROBES) {
    const separator = probePath.includes('?') ? '&' : '?';
    const probeUrl = `${url}${probePath}${separator}t=${Date.now()}`;
    const curlBody = readUrlBodyWithCurl(probeUrl);
    if (typeof curlBody === 'string') {
      if (hasViteErrorOverlay(curlBody)) {
        return false;
      }

      continue;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, 2000);

    try {
      const response = await fetch(probeUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      const body = await response.text();
      if (!response.ok || hasViteErrorOverlay(body)) {
        return false;
      }
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  return true;
};

const canListenOnPort = (host, candidatePort) => new Promise((resolve) => {
  const server = createServer();
  server.once('error', () => resolve(false));
  server.once('listening', () => {
    server.close(() => resolve(true));
  });
  server.listen(candidatePort, host);
});

const findAvailablePort = async (host, startPort) => {
  let port = Number.parseInt(String(startPort), 10);
  if (!Number.isFinite(port)) {
    port = 5176;
  }

  while (!(await canListenOnPort(host, port))) {
    port += 1;
  }

  return String(port);
};

const resolveDevServerBindHost = (host, { useDocker = false, useAutoDocker = false } = {}) => {
  if (!LOOPBACK_BIND_HOSTS.has(host)) {
    return host;
  }

  if (useDocker || useAutoDocker || process.env.GITHUB_ACTIONS === 'true') {
    return '0.0.0.0';
  }

  return host;
};

const buildExecutionPlan = (host, bindHost, port, testScript, baseCypressArgs) => {
  const nextStartCommand = `${devServerEnvPrefix} npm run dev -- --host ${bindHost} --port ${port}`;
  const nextTargetUrl = `http://${host}:${port}`;
  const nextCypressArgsWithBaseUrl = applyBaseUrlConfig(baseCypressArgs, nextTargetUrl);
  const nextTestCommandArgs = buildCypressCommandArgs(testScript, nextCypressArgsWithBaseUrl);
  const nextTestCommand = nextTestCommandArgs.join(' ');
  const nextShellCommand = `npx start-server-and-test ${JSON.stringify(nextStartCommand)} ${JSON.stringify(
    nextTargetUrl,
  )} ${JSON.stringify(nextTestCommand)}`;
  const nextCommandLine = `start-server-and-test ${nextStartCommand} ${nextTargetUrl} ${nextTestCommand}`;

  return {
    startCommand: nextStartCommand,
    bindHost,
    targetUrl: nextTargetUrl,
    cypressArgsWithBaseUrl: nextCypressArgsWithBaseUrl,
    testCommandArgs: nextTestCommandArgs,
    testCommand: nextTestCommand,
    shellCommand: nextShellCommand,
    commandLine: nextCommandLine,
  };
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

const buildExecutionPlanCypressEnv = (executionPlan) => ({
  CYPRESS_DOCKER_BASE_URL: executionPlan.targetUrl,
  CYPRESS_FRONTEND_BASE_URL: executionPlan.targetUrl,
});

const runCypressWithFallback = (scriptArgs, envOverrides = {}) => {
  const status = runCypressCommand(scriptArgs, envOverrides);
  if (status === 0) {
    return 0;
  }

  return status;
};

const runDirectCypressAndExit = (executionPlan, { useDocker = false, useAutoDocker = false } = {}) => {
  console.log(`\nRunning Cypress directly (${executionPlan.testCommand})`);
  const executionEnv = buildExecutionPlanCypressEnv(executionPlan);
  const status = runCypressWithFallback(executionPlan.testCommandArgs, executionEnv);
  if (status === 0) {
    process.exit(0);
  }

  if (preferDocker) {
    process.exit(status);
  }

  if (!useDocker && !useAutoDocker) {
    console.log('\nPrimary Cypress execution failed.');
    console.log('Attempting auto-docker fallback (if Docker is available).');
    console.log('Prediction subset rescue: npm run test:e2e:prediction:rescue');
    const rescueStatus = runCypressWithFallback(
      buildCypressCommandArgs('cy:run:rescue', executionPlan.cypressArgsWithBaseUrl),
      executionEnv,
    );
    if (rescueStatus === 0) {
      process.exit(0);
    }
  }

  process.exit(status);
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
  console.log('  npm run test:e2e -- --host 127.0.0.1 --port 5176 --spec cypress/e2e/mypage.cy.ts');
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
  const bindHost = resolveDevServerBindHost(host, { useDocker, useAutoDocker });

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

  let executionPlan = buildExecutionPlan(host, bindHost, port, testScript, baseCypressArgs);
  startCommand = executionPlan.startCommand;
  targetUrl = executionPlan.targetUrl;

  if (bindHost !== host) {
    console.log(`Docker-capable run detected. Binding dev server to ${bindHost} while targeting ${targetUrl}.`);
  }

  if (noServer) {
    console.log('\nRunning Cypress without auto-starting dev server');
    runDirectCypressAndExit(executionPlan, { useDocker, useAutoDocker });
  }

  if (resolvedFrontendTarget || attachExistingServer) {
    console.log(`\nUsing caller-provided frontend target: ${executionPlan.targetUrl}`);
    runDirectCypressAndExit(executionPlan, { useDocker, useAutoDocker });
  }

  const alreadyRunning = await isServerReady(executionPlan.targetUrl);
  if (alreadyRunning) {
    const isHealthy = await isViteSourceServerHealthy(executionPlan.targetUrl);
    if (!isHealthy) {
      const freshPort = await findAvailablePort(bindHost, Number.parseInt(String(port), 10) + 1);
      executionPlan = buildExecutionPlan(host, bindHost, freshPort, testScript, baseCypressArgs);
      startCommand = executionPlan.startCommand;
      targetUrl = executionPlan.targetUrl;
      console.log(`\nDetected unhealthy source server at http://${host}:${port}`);
      console.log(`Starting a fresh dev server at ${executionPlan.targetUrl}`);
    } else if (shouldPreferManagedLocalServer) {
      const freshPort = await findAvailablePort(bindHost, Number.parseInt(String(port), 10) + 1);
      executionPlan = buildExecutionPlan(host, bindHost, freshPort, testScript, baseCypressArgs);
      startCommand = executionPlan.startCommand;
      targetUrl = executionPlan.targetUrl;
      console.log(`\nDetected reachable local dev server at ${resolvedFrontendTarget?.baseUrl || `http://${host}:${port}`}`);
      console.log(`Starting an isolated dev server for this run at ${executionPlan.targetUrl}`);
    } else {
      console.log(`\nTarget URL already reachable: ${executionPlan.targetUrl}`);
      runDirectCypressAndExit(executionPlan, { useDocker, useAutoDocker });
    }
  }

  console.log(`\nRunning Cypress via start-server-and-test\n${executionPlan.commandLine}\n`);

  const status = spawnSync(executionPlan.shellCommand, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  }).status;
  if (status !== 0) {
    console.log('\nstart-server-and-test 종료: ');
    const serverReadyAfterFailure = await isServerReady(executionPlan.targetUrl);
    const executionEnv = buildExecutionPlanCypressEnv(executionPlan);

    if (serverReadyAfterFailure) {
      const fallbackStatus = runCypressWithFallback(executionPlan.testCommandArgs, executionEnv);
      if (fallbackStatus === 0) {
        process.exit(0);
      }

      if (preferDocker) {
        process.exit(fallbackStatus);
      }
    }

    if (preferDocker) {
      process.exit(status ?? 1);
    }

    if (!useDocker && !useAutoDocker) {
      console.log('Primary execution failed. Trying auto-docker fallback.');
      console.log('Prediction subset rescue: npm run test:e2e:prediction:rescue');
      const rescueStatus = runCypressWithFallback(
        buildCypressCommandArgs('cy:run:rescue', executionPlan.cypressArgsWithBaseUrl),
        executionEnv,
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
