import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const auditScript = path.join(frontendRoot, 'scripts/stadium-ux-audit.mjs');
const outputBase = path.join(repoRoot, 'output/playwright');
const DEFAULT_VIEWPORTS = 'mobile-390,desktop-1440';
const SMOKE_VIEWPORTS = 'mobile-390';
const FULL_VIEWPORTS = 'desktop-1440';
const RESPONSIVE_VIEWPORTS = 'mobile-360,mobile-390,mobile-430,tablet-768,desktop-1038,desktop-1440';

const STADIUMS = {
  INCHEON: {
    basePort: 5191,
    env: { STADIUM_UX_INCHEON_DEEP_CHECK: '1' },
    fullEnv: { STADIUM_UX_INCHEON_FULL_CLICK_CHECK: '1' },
  },
  GWANGJU: {
    basePort: 5192,
    env: { STADIUM_UX_GWANGJU_DEEP_CHECK: '1', STADIUM_UX_GWANGJU_DEBUG_CAPTURE: '1' },
  },
  DAEJEON: {
    basePort: 5193,
    env: { STADIUM_UX_DAEJEON_DEEP_CHECK: '1', STADIUM_UX_DAEJEON_DEBUG_CAPTURE: '1' },
  },
  DAEGU: {
    basePort: 5194,
    env: { STADIUM_UX_DAEGU_DEEP_CHECK: '1' },
    fullEnv: { STADIUM_UX_DAEGU_FULL_CLICK_CHECK: '1' },
  },
  SUWON: {
    basePort: 5195,
    env: { STADIUM_UX_SUWON_DEEP_CHECK: '1' },
    fullEnv: { STADIUM_UX_SUWON_DEEP_CHECK: '1', STADIUM_UX_SUWON_FULL_CLICK_CHECK: '1' },
  },
  SAJIK: {
    basePort: 5196,
    env: { STADIUM_UX_SAJIK_DEEP_CHECK: '1' },
  },
  GOCHEOK: {
    basePort: 5197,
    env: { STADIUM_UX_GOCHEOK_DEEP_CHECK: '1', STADIUM_UX_GOCHEOK_DEBUG_CAPTURE: '1' },
    fullEnv: { STADIUM_UX_GOCHEOK_FULL_CLICK_CHECK: '1' },
  },
  JAMSIL: {
    basePort: 5198,
    env: { STADIUM_UX_JAMSIL_DEEP_CHECK: '1' },
    fullEnv: { STADIUM_UX_JAMSIL_DEEP_CHECK: '1', STADIUM_UX_JAMSIL_FULL_CLICK_CHECK: '1' },
  },
  CHANGWON: {
    basePort: 5199,
    env: { STADIUM_UX_CHANGWON_DEEP_CHECK: '1' },
  },
};

const DEFAULT_STADIUMS = [
  'INCHEON',
  'GWANGJU',
  'DAEJEON',
  'DAEGU',
  'SUWON',
  'SAJIK',
  'GOCHEOK',
  'JAMSIL',
  'CHANGWON',
];

function parseTarget(rawTarget) {
  const [stadiumToken, modeToken] = rawTarget.trim().toUpperCase().split(':');
  const mode = modeToken === 'FULL'
    ? 'full'
    : modeToken === 'SMOKE'
      ? 'smoke'
      : modeToken === 'RESPONSIVE'
        ? 'responsive'
        : 'mobile';
  return { stadium: stadiumToken, mode };
}

function requestedTargets() {
  const args = process.argv.slice(2).map((value) => value.trim()).filter(Boolean);
  if (args.length === 0) {
    return DEFAULT_STADIUMS.map((stadium) => ({ stadium, mode: 'mobile' }));
  }
  return args.flatMap((arg) => {
    if (arg.toUpperCase() === 'ALL') {
      return DEFAULT_STADIUMS.map((stadium) => ({ stadium, mode: 'mobile' }));
    }
    return [parseTarget(arg)];
  });
}

async function checkPortAvailability(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (error) => {
      resolve({
        available: false,
        error: `${error.code ?? 'UNKNOWN'} ${error.message}`,
      });
    });
    server.once('listening', () => {
      server.close(() => resolve({ available: true, error: null }));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function isPortAvailable(port) {
  return (await checkPortAvailability(port)).available;
}

async function resolvePort(preferredPort) {
  const failures = [];

  for (let offset = 0; offset < 80; offset += 1) {
    const candidate = preferredPort + offset;
    const result = await checkPortAvailability(candidate);
    if (result.available) {
      return candidate;
    }
    if (failures.length < 5) {
      failures.push(`${candidate}: ${result.error}`);
    }
  }

  throw new Error(`No available local QA port near ${preferredPort}. Checked ${failures.join('; ')}`);
}

function killPid(pid, signal = 'TERM') {
  try {
    process.kill(pid, signal);
    return true;
  } catch (_error) {
    return false;
  }
}

function pidsListeningOnPort(port) {
  try {
    return execFileSync('lsof', [`-tiTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' })
      .split('\n')
      .map((value) => Number(value.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch (_error) {
    return [];
  }
}

function processInfo(pid) {
  try {
    const [, line] = execFileSync('ps', ['-fp', String(pid)], { encoding: 'utf8' })
      .trim()
      .split('\n');
    if (!line) {
      return null;
    }

    const columns = line.trim().split(/\s+/);
    const parsedPid = Number(columns[1]);
    const parentPid = Number(columns[2]);
    if (!Number.isInteger(parsedPid) || !Number.isInteger(parentPid)) {
      return null;
    }

    return {
      pid: parsedPid,
      ppid: parentPid,
      command: columns.slice(7).join(' '),
    };
  } catch (_error) {
    return null;
  }
}

function isQaDevServerCommand(command) {
  return /\b(vite|npm)\b/.test(command)
    && /(run dev|--host 127\.0\.0\.1|--port 51\d\d|node_modules\/\.bin\/vite)/.test(command);
}

function relatedQaDevServerPids(listenerPid) {
  const related = [];
  const seen = new Set();
  let current = processInfo(listenerPid);

  while (current && !seen.has(current.pid)) {
    seen.add(current.pid);
    related.push(current.pid);

    if (
      current.ppid <= 1
      || current.ppid === process.pid
      || current.ppid === process.ppid
    ) {
      break;
    }

    const parent = processInfo(current.ppid);
    if (!parent || !isQaDevServerCommand(parent.command)) {
      break;
    }

    current = parent;
  }

  return related.reverse();
}

function uniqueNumbers(values) {
  return [...new Set(values)]
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

function formatPidList(pids) {
  return pids.length > 0 ? pids.join(', ') : 'none';
}

function portListenerDiagnostics(port) {
  const listenerPids = pidsListeningOnPort(port);
  return {
    listenerPids,
    relatedPids: uniqueNumbers(listenerPids.flatMap((pid) => relatedQaDevServerPids(pid))),
  };
}

async function cleanupPort(port) {
  const cleaned = new Set();

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const pids = pidsListeningOnPort(port)
      .flatMap((pid) => relatedQaDevServerPids(pid));
    if (pids.length === 0) {
      break;
    }

    pids.forEach((pid) => {
      cleaned.add(pid);
      killPid(pid, attempt === 0 ? 'TERM' : 'KILL');
    });
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 800 : 300));
  }

  return [...cleaned];
}

async function cleanupPortRange(startPort, count = 80) {
  const cleaned = [];
  for (let offset = 0; offset < count; offset += 1) {
    cleaned.push(...await cleanupPort(startPort + offset));
  }
  return cleaned;
}

async function resolveTargetPort(preferredPort) {
  try {
    return await resolvePort(preferredPort);
  } catch (error) {
    const cleanedPids = await cleanupPortRange(preferredPort);
    if (cleanedPids.length > 0) {
      console.warn(`[stadium-isolated-qa] cleaned stale listeners near ${preferredPort}: ${cleanedPids.join(', ')}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return resolvePort(preferredPort);
  }
}

function runAudit({ env, outputDir }) {
  return new Promise((resolve) => {
    const child = spawn('node', [auditScript, outputDir], {
      cwd: frontendRoot,
      env,
      stdio: 'inherit',
    });
    const childPid = child.pid ?? null;

    child.once('error', (error) => {
      resolve({ status: 1, error, childPid });
    });
    child.once('close', (status, signal) => {
      resolve({ status, signal, childPid });
    });
  });
}

function readAuditFailureText(outputDir) {
  const candidates = [
    'report.json',
    'stadium-mobile-smoke-summary.json',
    'stadium-mobile-smoke-summary.md',
  ];
  return candidates
    .map((fileName) => path.join(outputDir, fileName))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => {
      try {
        return fs.readFileSync(filePath, 'utf8');
      } catch (_error) {
        return '';
      }
    })
    .filter(Boolean)
    .join('\n');
}

function classifyQaFailure({ run, outputDir }) {
  const text = [
    run.error?.message ?? '',
    run.signal ? `signal ${run.signal}` : '',
    readAuditFailureText(outputDir),
  ].join('\n');

  if (/Failed to reload .*This could be due to syntax errors|hmr update|Vite.*reload/i.test(text)) {
    return 'hmr-reload';
  }
  if (/ERR_CONNECTION_REFUSED|did not accept \/stadium connections|No local frontend dev server|Local frontend dev server/i.test(text)) {
    return 'server';
  }
  if (/elementFromPoint|probe|top-hit|top hit|expected block|wrong block|coordinate|좌표/i.test(text)) {
    return 'coordinate';
  }
  if (/Target page, context or browser has been closed|Target closed|Browser has been closed|Playwright|Timeout/i.test(text)) {
    return 'browser';
  }
  if (/Unexpected console errors|consoleErrors|console error/i.test(text)) {
    return 'console';
  }
  return 'runner';
}

function writeFailureSummary({
  summaryPath,
  target,
  durationSeconds,
  port,
  outputDir,
  run,
  preRunListeners,
  postRunListeners,
  cleanedPids,
  failureCategory,
}) {
  if (fs.existsSync(summaryPath)) {
    return;
  }

  const errorText = run.error ? run.error.message : `audit exited with status ${run.status ?? 'unknown'}${run.signal ? ` signal ${run.signal}` : ''}`;
  fs.writeFileSync(summaryPath, [
    '# Stadium UX Mobile Smoke Summary',
    '',
    `- Generated at: ${new Date().toISOString()}`,
    '- Status: failed',
    `- Base URL: http://127.0.0.1:${port}`,
    '- Server mode: forced-started',
    `- Target: ${target.stadium}:${target.mode}`,
    `- Output dir: ${outputDir}`,
    `- Summary path: ${summaryPath}`,
    `- Audit child PID: ${run.childPid ?? 'unknown'}`,
    `- Pre-run listener PID(s): ${formatPidList(preRunListeners.listenerPids)}`,
    `- Pre-run related QA PID(s): ${formatPidList(preRunListeners.relatedPids)}`,
    `- Post-run listener PID(s): ${formatPidList(postRunListeners.listenerPids)}`,
    `- Post-run related QA PID(s): ${formatPidList(postRunListeners.relatedPids)}`,
    `- Cleaned PID(s): ${formatPidList(cleanedPids)}`,
    `- Duration seconds: ${durationSeconds}`,
    `- Failure category: ${failureCategory}`,
    `- Failure: ${errorText}`,
    '',
  ].join('\n'), 'utf8');
}

function clearSummaryFiles(outputDir) {
  [
    'stadium-mobile-smoke-summary.md',
    'stadium-mobile-smoke-summary.json',
  ].forEach((fileName) => {
    const summaryFile = path.join(outputDir, fileName);
    if (fs.existsSync(summaryFile)) {
      fs.rmSync(summaryFile, { force: true });
    }
  });
}

function outputName(stadium, mode) {
  const suffix = mode === 'full'
    ? 'full'
    : mode === 'smoke'
      ? 'smoke'
      : mode === 'responsive'
        ? 'responsive'
        : 'validate';
  return `stadium-ux-${stadium.toLowerCase()}-${suffix}`;
}

function targetEnv(config, mode) {
  if (mode === 'full') {
    return { ...(config.fullEnv ?? config.env) };
  }
  return { ...config.env };
}

function targetViewports(mode) {
  if (mode === 'full') {
    return FULL_VIEWPORTS;
  }
  if (mode === 'smoke') {
    return SMOKE_VIEWPORTS;
  }
  if (mode === 'responsive') {
    return RESPONSIVE_VIEWPORTS;
  }
  return DEFAULT_VIEWPORTS;
}

function buildTargetEnv(config, target, port) {
  return {
    ...process.env,
    ...targetEnv(config, target.mode),
    AUDIT_BASE_URL: `http://127.0.0.1:${port}`,
    STADIUM_UX_FORCE_START_DEV_SERVER: '1',
    STADIUM_UX_MANAGED_DEV_SERVER_PORT: String(port),
    STADIUM_UX_VIEWPORTS: targetViewports(target.mode),
    STADIUM_UX_REVIEW_STADIUMS: target.stadium,
    VITE_SITE_URL: `http://127.0.0.1:${port}`,
    VITE_API_BASE_URL: '/api',
  };
}

function logFailureDiagnostics({
  target,
  durationSeconds,
  port,
  outputDir,
  summaryPath,
  run,
  preRunListeners,
  postRunListeners,
  cleanedPids,
  failureCategory,
}) {
  if (run.error) {
    console.error(`[stadium-isolated-qa] ${target.stadium}:${target.mode} failed: ${run.error.message}`);
  }
  console.error(`[stadium-isolated-qa] ${target.stadium}:${target.mode} failed after ${durationSeconds}s`);
  console.error(`[stadium-isolated-qa] diagnostics target=${target.stadium}:${target.mode} port=${port} auditChildPid=${run.childPid ?? 'unknown'}`);
  console.error(`[stadium-isolated-qa] diagnostics failureCategory=${failureCategory}`);
  console.error(`[stadium-isolated-qa] diagnostics output=${outputDir} summary=${summaryPath}`);
  console.error(`[stadium-isolated-qa] diagnostics preRunListenerPids=${formatPidList(preRunListeners.listenerPids)} preRunRelatedQaPids=${formatPidList(preRunListeners.relatedPids)}`);
  console.error(`[stadium-isolated-qa] diagnostics postRunListenerPids=${formatPidList(postRunListeners.listenerPids)} postRunRelatedQaPids=${formatPidList(postRunListeners.relatedPids)}`);
  console.error(`[stadium-isolated-qa] diagnostics cleanedPids=${formatPidList(cleanedPids)}`);
}

const targets = requestedTargets();
const unknown = targets.filter(({ stadium }) => !STADIUMS[stadium]);
if (unknown.length > 0) {
  console.error(`[stadium-isolated-qa] unknown stadium(s): ${unknown.map((target) => target.stadium).join(', ')}`);
  process.exit(1);
}

const results = [];

for (const target of targets) {
  const config = STADIUMS[target.stadium];
  let port = await resolveTargetPort(config.basePort);
  const outputDir = path.join(outputBase, outputName(target.stadium, target.mode));
  const startedAt = Date.now();
  const summaryPath = path.join(outputDir, 'stadium-mobile-smoke-summary.md');

  fs.mkdirSync(outputDir, { recursive: true });
  clearSummaryFiles(outputDir);

  let preRunListeners = portListenerDiagnostics(port);
  let preRunCleanedPids = await cleanupPort(port);
  let env = buildTargetEnv(config, target, port);

  console.log(`[stadium-isolated-qa] ${target.stadium}:${target.mode} start port=${port} output=${outputDir}`);
  if (preRunCleanedPids.length > 0) {
    console.warn(`[stadium-isolated-qa] ${target.stadium}:${target.mode} cleaned pre-run pids on port ${port}: ${preRunCleanedPids.join(', ')}`);
  }
  let run = await runAudit({ env, outputDir });
  let postRunListeners = portListenerDiagnostics(port);
  let cleanedPids = [...preRunCleanedPids, ...await cleanupPort(port)];

  if (run.status !== 0) {
    console.warn(`[stadium-isolated-qa] ${target.stadium}:${target.mode} failed on port=${port}; retrying once on next available port`);
    await cleanupPort(port);
    clearSummaryFiles(outputDir);
    port = await resolveTargetPort(port + 1);
    preRunListeners = portListenerDiagnostics(port);
    preRunCleanedPids = await cleanupPort(port);
    env = buildTargetEnv(config, target, port);
    console.log(`[stadium-isolated-qa] ${target.stadium}:${target.mode} retry start port=${port} output=${outputDir}`);
    if (preRunCleanedPids.length > 0) {
      console.warn(`[stadium-isolated-qa] ${target.stadium}:${target.mode} retry cleaned pre-run pids on port ${port}: ${preRunCleanedPids.join(', ')}`);
    }
    run = await runAudit({ env, outputDir });
    postRunListeners = portListenerDiagnostics(port);
    cleanedPids = [...cleanedPids, ...preRunCleanedPids, ...await cleanupPort(port)];
  }

  const durationSeconds = Math.round((Date.now() - startedAt) / 1000);

  results.push({
    stadium: target.stadium,
    mode: target.mode,
    status: run.status === 0 ? 'passed' : 'failed',
    durationSeconds,
    port,
    cleanedPids,
    summaryPath,
  });

  if (run.status !== 0) {
    const failureCategory = classifyQaFailure({ run, outputDir });
    writeFailureSummary({
      summaryPath,
      target,
      durationSeconds,
      port,
      outputDir,
      run,
      preRunListeners,
      postRunListeners,
      cleanedPids,
      failureCategory,
    });
    logFailureDiagnostics({
      target,
      durationSeconds,
      port,
      outputDir,
      summaryPath,
      run,
      preRunListeners,
      postRunListeners,
      cleanedPids,
      failureCategory,
    });
    process.exit(run.status ?? 1);
  }

  console.log(`[stadium-isolated-qa] ${target.stadium}:${target.mode} passed after ${durationSeconds}s port=${port}`);
}

console.log('[stadium-isolated-qa] summary');
for (const result of results) {
  const cleanupText = result.cleanedPids.length > 0 ? ` cleaned=${result.cleanedPids.join(',')}` : '';
  console.log(`- ${result.stadium}:${result.mode}: ${result.status} (${result.durationSeconds}s) port=${result.port}${cleanupText} ${result.summaryPath}`);
}
