#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const cliArgs = process.argv.slice(2);
const printMode = cliArgs.includes('--print');
const [group, preset, ...rawArgs] = cliArgs.filter((arg) => arg !== '--print');
const passthroughArgs = rawArgs.filter((arg) => arg !== '--');

const PREDICTION_MOBILE_CORE_SMOKE_STATES = 'match,vote-panel,date-sheet,detail-loading,detail-error,top-notice';
const PREDICTION_MOBILE_RANKING_SMOKE_STATES = 'ranking,ranking-ended,ranking-init-error,ranking-save-dialog,ranking-saved';

const CYPRESS_SPECS = {
  mypageConnections: [
    'cypress/e2e/mypage-more-connections.cy.ts',
  ],
  coach: [
    'cypress/e2e/prediction-coach-briefing.cy.ts',
    'cypress/e2e/prediction.cy.ts',
  ],
  stadiumSeatmaps: [
    'cypress/e2e/stadium-seatmap-shared.cy.ts',
    'cypress/e2e/stadium-seatmap-incheon.cy.ts',
    'cypress/e2e/stadium-seatmap-jamsil.cy.ts',
    'cypress/e2e/stadium-seatmap-suwon.cy.ts',
  ],
  stadiumShared: [
    'cypress/e2e/stadium-seatmap-shared.cy.ts',
  ],
  stadiumIncheon: [
    'cypress/e2e/stadium-seatmap-incheon.cy.ts',
  ],
  stadiumJamsil: [
    'cypress/e2e/stadium-seatmap-jamsil.cy.ts',
  ],
  stadiumSuwon: [
    'cypress/e2e/stadium-seatmap-suwon.cy.ts',
  ],
};

const E2E_SPECS = {
  auth: [
    'cypress/e2e/auth.cy.ts',
    'cypress/e2e/auth-signup-availability.cy.ts',
  ],
  smoke: [
    'cypress/e2e/auth.cy.ts',
    'cypress/e2e/auth-signup-availability.cy.ts',
    'cypress/e2e/cheer-board.cy.ts',
    'cypress/e2e/mypage.cy.ts',
    'cypress/e2e/stadium.cy.ts',
  ],
  pages: [
    'cypress/e2e/first-slice-ui.cy.ts',
    'cypress/e2e/auth.cy.ts',
    'cypress/e2e/prediction-mobile-smoke.cy.ts',
    'cypress/e2e/cheer-mobile-nav.cy.ts',
    'cypress/e2e/mate-mobile-smoke.cy.ts',
    'cypress/e2e/mypage-tab-health.cy.ts',
    'cypress/e2e/dm-inbox.cy.ts',
    'cypress/e2e/dm.cy.ts',
    'cypress/e2e/profile.cy.ts',
    'cypress/e2e/offseason.cy.ts',
    'cypress/e2e/leaderboard.cy.ts',
    'cypress/e2e/stadium.cy.ts',
    'cypress/e2e/admin.cy.ts',
    'cypress/e2e/page-route-coverage.cy.ts',
  ],
  diary: [
    'cypress/e2e/diary.cy.ts',
  ],
  admin: [
    'cypress/e2e/admin.cy.ts',
  ],
  ai: [
    'cypress/e2e/chatbot.cy.ts',
  ],
  'ai-real': [
    'cypress/e2e/chatbot-real.cy.ts',
  ],
  coverage: [
    'cypress/e2e/diary.cy.ts',
    'cypress/e2e/admin.cy.ts',
    'cypress/e2e/chatbot.cy.ts',
  ],
  coach: [
    'cypress/e2e/prediction-coach-briefing.cy.ts',
    'cypress/e2e/prediction.cy.ts',
  ],
  security: [
    'cypress/e2e/security-surface-real.cy.ts',
    'cypress/e2e/websocket-real.cy.ts',
  ],
  prediction: [
    'cypress/e2e/prediction.cy.ts',
    'cypress/e2e/prediction-lazy-load.cy.ts',
    'cypress/e2e/prediction-range-recovery.cy.ts',
    'cypress/e2e/prediction-date-boundary.cy.ts',
    'cypress/e2e/prediction-coach-briefing.cy.ts',
    'cypress/e2e/home-to-prediction.cy.ts',
  ],
  mateSmoke: [
    'cypress/e2e/mate-detail-states.cy.ts',
    'cypress/e2e/mate-execution-flow.cy.ts',
  ],
  mateRoute: [
    'cypress/e2e/mate.cy.ts',
    'cypress/e2e/mate-detail-states.cy.ts',
    'cypress/e2e/mate-execution-flow.cy.ts',
    'cypress/e2e/mate-qr-refresh.cy.ts',
  ],
  mateCreate: [
    'cypress/e2e/mate-create.cy.ts',
    'cypress/e2e/mate-create-session-recovery.cy.ts',
    'cypress/e2e/mate-apply-session-recovery.cy.ts',
    'cypress/e2e/mate-selling-payment-success.cy.ts',
  ],
  mateExtended: [
    'cypress/e2e/mate-chat-upload.cy.ts',
    'cypress/e2e/mate-flow-policy.cy.ts',
    'cypress/e2e/mate-visual.cy.ts',
  ],
};

const withDefaultEnv = (name, value) => ({
  [name]: process.env[name] || value,
});

const nodeStep = (args, env = {}) => ({
  command: 'node',
  args,
  env,
});

const cypressStep = (args = [], env = {}) => nodeStep(['scripts/cypress-run.mjs', ...args], env);

const cypressDockerStep = (args = [], env = {}) => cypressStep(args, {
  CYPRESS_USE_DOCKER: '1',
  ...env,
});

const cypressDoctorStep = (args = []) => nodeStep(['scripts/cypress-doctor.mjs', ...args]);

const specArg = (specs) => ['--spec', specs.join(',')];

const buildE2ePreset = (suiteName, mode) => {
  const specs = E2E_SPECS[suiteName];
  if (!specs) {
    throw new Error(`Unknown e2e suite: ${suiteName}`);
  }

  const step = buildE2eRunnerPreset(mode);
  return {
    ...step,
    args: [...step.args, '--spec', specs.join(',')],
  };
};

const buildE2eRunnerPreset = (mode) => {
  const args = ['scripts/test-e2e.mjs'];
  const env = {};

  switch (mode) {
    case 'dev':
      args.push('--docker', '--host', '127.0.0.1');
      break;
    case 'dev-chrome':
      args.push('--docker', '--host', '127.0.0.1', '--browser', 'chrome');
      break;
    case 'prodlike':
      args.push('--no-server', '--docker');
      break;
    case 'prodlike-docker':
      args.push('--no-server', '--docker');
      break;
    case 'prodlike-mac':
      args.push('--no-server', '--docker');
      break;
    case 'rescue':
      args.push('--docker', '--host', '127.0.0.1');
      break;
    default:
      throw new Error(`Unknown e2e mode: ${mode}`);
  }

  return nodeStep(args, env);
};

const resolveMateSmokeTarget = () => {
  let host = process.env.MATE_SMOKE_HOST || '';
  let port = process.env.MATE_SMOKE_PORT || '';

  if (!host && !port && process.env.CYPRESS_FRONTEND_BASE_URL) {
    try {
      const rawValue = process.env.CYPRESS_FRONTEND_BASE_URL;
      const parsed = new URL(/^https?:\/\//i.test(rawValue) ? rawValue : `http://${rawValue}`);
      host = parsed.hostname;
      port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    } catch {
      host = '';
      port = '';
    }
  }

  return {
    host: host || '127.0.0.1',
    port: port || '5193',
    spec: process.env.MATE_SMOKE_SPEC || E2E_SPECS.mateSmoke.join(','),
  };
};

const buildMateSmokePreset = (forceDocker = false) => {
  const { host, port, spec } = resolveMateSmokeTarget();
  const args = ['scripts/test-e2e.mjs'];
  const env = {};

  if (process.env.MATE_SMOKE_ATTACH_EXISTING_SERVER === '1') {
    env.CYPRESS_ATTACH_EXISTING_SERVER = '1';
    args.push('--no-server');
  }

  if (forceDocker || process.env.MATE_SMOKE_USE_DOCKER !== '0') {
    args.push('--docker');
  }

  args.push('--host', host, '--port', port, '--spec', spec);
  return nodeStep(args, env);
};

const buildMateRegressionPreset = (suiteName) => {
  const useDocker = process.env.MATE_REGRESSION_USE_DOCKER === '1';
  return nodeStep(
    [
      'scripts/test-e2e.mjs',
      ...(useDocker ? ['--docker'] : []),
      '--host',
      '127.0.0.1',
      '--browser',
      process.env.MATE_REGRESSION_BROWSER || 'electron',
      ...specArg(E2E_SPECS[suiteName]),
    ],
    useDocker ? {} : {
      CYPRESS_ALLOW_GLOBAL_FALLBACK: '1',
      CYPRESS_DISABLE_AUTO_DOCKER_FALLBACK: '1',
    },
  );
};

const PRESETS = {
  'home-first-load': {
    mock: nodeStep(['scripts/home-first-load-audit.mjs'], { HOME_FIRST_LOAD_MODE: 'mock' }),
    real: nodeStep(['scripts/home-first-load-audit.mjs'], { HOME_FIRST_LOAD_MODE: 'real' }),
  },
  'mate-mobile': {
    default: nodeStep(['scripts/run-mate-mobile-regression.mjs']),
    smoke: nodeStep(['scripts/run-mate-mobile-regression.mjs'], {
      MATE_MOBILE_FORCE_START_DEV_SERVER: '1',
      MATE_MOBILE_MANAGED_DEV_SERVER_PORT: '5177',
      VITE_SITE_URL: 'http://127.0.0.1:5177',
      VITE_API_BASE_URL: '/api',
      MATE_MOBILE_SUITES: 'detail,create,list',
    }),
    attached: nodeStep(['scripts/run-mate-mobile-regression.mjs'], {
      ...withDefaultEnv('AUDIT_BASE_URL', 'http://127.0.0.1:5177'),
      MATE_MOBILE_AUTO_START_DEV_SERVER: '0',
    }),
    'smoke-attached': nodeStep(['scripts/run-mate-mobile-regression.mjs'], {
      ...withDefaultEnv('AUDIT_BASE_URL', 'http://127.0.0.1:5177'),
      MATE_MOBILE_SUITES: 'detail,create,list',
      MATE_MOBILE_AUTO_START_DEV_SERVER: '0',
    }),
  },
  'stadium-mobile': {
    all: nodeStep(['scripts/run-stadium-isolated-qa.mjs', 'ALL']),
    smoke: nodeStep(['scripts/run-stadium-isolated-qa.mjs', 'JAMSIL:SMOKE']),
    daegu: nodeStep(['scripts/run-stadium-isolated-qa.mjs', 'DAEGU']),
    'daegu-full': nodeStep(['scripts/run-stadium-isolated-qa.mjs', 'DAEGU:FULL']),
    attached: nodeStep(['scripts/stadium-ux-audit.mjs'], {
      ...withDefaultEnv('AUDIT_BASE_URL', 'http://127.0.0.1:5177'),
      STADIUM_UX_AUTO_START_DEV_SERVER: '0',
    }),
    'smoke-attached': nodeStep(['scripts/stadium-ux-audit.mjs'], {
      ...withDefaultEnv('AUDIT_BASE_URL', 'http://127.0.0.1:5177'),
      STADIUM_UX_VIEWPORTS: 'mobile-390',
      STADIUM_UX_AUTO_START_DEV_SERVER: '0',
    }),
  },
  'prediction-mobile': {
    default: nodeStep(['../output/playwright/run-prediction-mobile-regression.mjs']),
    smoke: nodeStep(['scripts/run-prediction-mobile-smoke.mjs'], {
      PREDICTION_MOBILE_FORCE_START_DEV_SERVER: '1',
      PREDICTION_MOBILE_MANAGED_DEV_SERVER_PORT: '5177',
      VITE_SITE_URL: 'http://127.0.0.1:5177',
      VITE_API_BASE_URL: '/api',
      PREDICTION_MOBILE_STATES: PREDICTION_MOBILE_CORE_SMOKE_STATES,
    }),
    'smoke-ranking': nodeStep(['scripts/run-prediction-mobile-smoke.mjs'], {
      PREDICTION_MOBILE_FORCE_START_DEV_SERVER: '1',
      PREDICTION_MOBILE_MANAGED_DEV_SERVER_PORT: '5177',
      VITE_SITE_URL: 'http://127.0.0.1:5177',
      VITE_API_BASE_URL: '/api',
      PREDICTION_MOBILE_STATES: PREDICTION_MOBILE_RANKING_SMOKE_STATES,
    }),
    attached: nodeStep(['../output/playwright/run-prediction-mobile-regression.mjs'], {
      ...withDefaultEnv('AUDIT_BASE_URL', 'http://127.0.0.1:5177'),
      PREDICTION_MOBILE_AUTO_START_DEV_SERVER: '0',
    }),
    'smoke-attached': nodeStep(['scripts/run-prediction-mobile-smoke.mjs'], {
      ...withDefaultEnv('AUDIT_BASE_URL', 'http://127.0.0.1:5177'),
      PREDICTION_MOBILE_STATES: PREDICTION_MOBILE_CORE_SMOKE_STATES,
      PREDICTION_MOBILE_AUTO_START_DEV_SERVER: '0',
    }),
    'smoke-ranking-attached': nodeStep(['scripts/run-prediction-mobile-smoke.mjs'], {
      ...withDefaultEnv('AUDIT_BASE_URL', 'http://127.0.0.1:5177'),
      PREDICTION_MOBILE_STATES: PREDICTION_MOBILE_RANKING_SMOKE_STATES,
      PREDICTION_MOBILE_AUTO_START_DEV_SERVER: '0',
    }),
    audit: nodeStep(['../output/playwright/prediction-mobile-audit.mjs']),
  },
  'prediction-perf': {
    mock: nodeStep(['scripts/prediction-performance-audit.mjs'], { PREDICTION_PERF_MODE: 'mock' }),
    real: nodeStep(['scripts/prediction-performance-audit.mjs'], { PREDICTION_PERF_MODE: 'real' }),
  },
  cypress: {
    doctor: cypressDoctorStep(),
    'doctor-global': cypressDoctorStep(['--global-cache']),
    'doctor-repair': cypressDoctorStep(['--repair']),
    'doctor-repair-global': cypressDoctorStep(['--repair', '--global-cache']),
    open: cypressStep(['--open']),
    run: cypressStep(),
    'run-docker': cypressDockerStep(),
    'run-global': cypressStep(['--global-cache']),
    'mypage-connections': cypressDockerStep(specArg(CYPRESS_SPECS.mypageConnections)),
    'mypage-connections-global': cypressStep(['--global-cache', ...specArg(CYPRESS_SPECS.mypageConnections)]),
    coach: cypressDockerStep(specArg(CYPRESS_SPECS.coach)),
    'coach-chrome': cypressDockerStep(['--browser', 'chrome', ...specArg(CYPRESS_SPECS.coach)]),
    'stadium-seatmaps': cypressDockerStep(specArg(CYPRESS_SPECS.stadiumSeatmaps)),
    'stadium-shared': cypressDockerStep(specArg(CYPRESS_SPECS.stadiumShared)),
    'stadium-incheon': cypressDockerStep(specArg(CYPRESS_SPECS.stadiumIncheon)),
    'stadium-jamsil': cypressDockerStep(specArg(CYPRESS_SPECS.stadiumJamsil)),
    'stadium-suwon': cypressDockerStep(specArg(CYPRESS_SPECS.stadiumSuwon)),
    rescue: cypressDockerStep(['--self-heal']),
    'run-global-docker': cypressDockerStep(['--global-cache']),
    heal: cypressDockerStep(['--self-heal']),
    'global-heal': cypressDockerStep(['--global-cache', '--self-heal']),
    'global-docker-heal': cypressDockerStep(['--global-cache', '--self-heal']),
  },
  e2e: {
    'all-dev': buildE2eRunnerPreset('dev'),
    'all-docker': buildE2eRunnerPreset('dev'),
    attach: buildE2eRunnerPreset('prodlike'),
    rescue: buildE2eRunnerPreset('rescue'),
    'all-prodlike': buildE2eRunnerPreset('prodlike'),
    'all-prodlike-docker': buildE2eRunnerPreset('prodlike-docker'),
    'auth-dev': buildE2ePreset('auth', 'dev'),
    'auth-prodlike': buildE2ePreset('auth', 'prodlike'),
    'smoke-dev': buildE2ePreset('smoke', 'dev'),
    'pages-dev': buildE2ePreset('pages', 'dev'),
    'smoke-prodlike': buildE2ePreset('smoke', 'prodlike'),
    'smoke-prodlike-docker': buildE2ePreset('smoke', 'prodlike-docker'),
    'smoke-prodlike-mac': buildE2ePreset('smoke', 'prodlike-mac'),
    'diary-dev': buildE2ePreset('diary', 'dev'),
    'admin-dev': buildE2ePreset('admin', 'dev'),
    'ai-dev': buildE2ePreset('ai', 'dev'),
    'ai-real': buildE2ePreset('ai-real', 'dev'),
    'coverage-dev': buildE2ePreset('coverage', 'dev'),
    'coach-dev': buildE2ePreset('coach', 'dev'),
    'coach-dev-chrome': buildE2ePreset('coach', 'dev-chrome'),
    'coach-prodlike': buildE2ePreset('coach', 'prodlike'),
    'security-dev': buildE2ePreset('security', 'dev'),
    'security-prodlike': buildE2ePreset('security', 'prodlike'),
    'prediction-dev': buildE2ePreset('prediction', 'dev'),
    'prediction-prodlike': buildE2ePreset('prediction', 'prodlike'),
    'prediction-prodlike-mac': buildE2ePreset('prediction', 'prodlike-mac'),
    'prediction-rescue': buildE2ePreset('prediction', 'rescue'),
  },
  'mate-e2e': {
    smoke: () => buildMateSmokePreset(true),
    'smoke-docker': () => buildMateSmokePreset(true),
    route: buildMateRegressionPreset('mateRoute'),
    create: buildMateRegressionPreset('mateCreate'),
    extended: buildMateRegressionPreset('mateExtended'),
  },
};

function printUsage() {
  console.error('Usage: node scripts/qa-presets.mjs <group> <preset> [-- passthrough args]');
  console.error('');
  console.error('Groups:');
  for (const [groupName, presets] of Object.entries(PRESETS)) {
    console.error(`  ${groupName}: ${Object.keys(presets).sort().join(', ')}`);
  }
  console.error('  stadium: <stadium-id> <task> [...args]');
}

if (!group || group === '--help' || group === '-h') {
  printUsage();
  process.exit(group ? 0 : 1);
}

const buildStadiumPreset = () => {
  if (!preset) {
    return null;
  }

  const [task = 'status', ...restArgs] = passthroughArgs;
  return nodeStep(['scripts/stadium-seatmap-ops.mjs', preset, task, ...restArgs]);
};

const presetEntry = group === 'stadium'
  ? buildStadiumPreset()
  : PRESETS[group]?.[preset];
const presetStep = typeof presetEntry === 'function' ? presetEntry() : presetEntry;
if (!presetStep) {
  printUsage();
  process.exit(1);
}

if (printMode) {
  console.log(JSON.stringify({
    command: presetStep.command,
    args: group === 'stadium' ? presetStep.args : [...presetStep.args, ...passthroughArgs],
    envOverrides: presetStep.env ?? {},
  }, null, 2));
  process.exit(0);
}

const result = spawnSync(presetStep.command, group === 'stadium' ? presetStep.args : [...presetStep.args, ...passthroughArgs], {
  cwd: frontendRoot,
  env: {
    ...process.env,
    ...presetStep.env,
  },
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
