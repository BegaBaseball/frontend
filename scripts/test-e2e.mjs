#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const projectRoot = process.cwd();
const defaultHost = process.env.CYPRESS_TEST_HOST || '127.0.0.1';
const defaultPort = process.env.CYPRESS_TEST_PORT || '5176';

let startCommand = `npm run dev -- --host ${defaultHost} --port ${defaultPort}`;
let targetUrl = `http://${defaultHost}:${defaultPort}`;

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
