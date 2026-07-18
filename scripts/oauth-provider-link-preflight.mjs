#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROVIDER_EXPECTATIONS = {
  google: {
    expectedHost: 'accounts.google.com',
    manualLabel: 'Google',
  },
  kakao: {
    expectedHost: 'kauth.kakao.com',
    manualLabel: 'Kakao',
  },
  naver: {
    expectedHost: 'nid.naver.com',
    manualLabel: 'Naver',
  },
};

const DEFAULT_PROVIDERS = Object.keys(PROVIDER_EXPECTATIONS);

const parseArgs = () => {
  const result = {
    backendOrigin: process.env.OAUTH_PROVIDER_BACKEND_ORIGIN
      || process.env.BACKEND_BASE_URL
      || process.env.VITE_PROXY_TARGET
      || 'http://localhost:8080',
    frontendOrigin: process.env.OAUTH_PROVIDER_FRONTEND_ORIGIN
      || process.env.FRONTEND_ORIGIN
      || 'http://127.0.0.1:5176',
    providers: (process.env.OAUTH_PROVIDER_SMOKE_PROVIDERS || DEFAULT_PROVIDERS.join(','))
      .split(',')
      .map((provider) => provider.trim().toLowerCase())
      .filter(Boolean),
    timeoutMs: Number.parseInt(process.env.OAUTH_PROVIDER_PREFLIGHT_TIMEOUT_MS || '10000', 10),
    reportPath: 'reports/oauth-provider-link-preflight.json',
    help: false,
  };

  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      continue;
    }

    if (arg === '--backend-origin' && next) {
      result.backendOrigin = next;
      index += 1;
      continue;
    }

    if (arg === '--frontend-origin' && next) {
      result.frontendOrigin = next;
      index += 1;
      continue;
    }

    if (arg === '--providers' && next) {
      result.providers = next.split(',').map((provider) => provider.trim().toLowerCase()).filter(Boolean);
      index += 1;
      continue;
    }

    if (arg === '--timeout-ms' && next) {
      result.timeoutMs = Number.parseInt(next, 10);
      index += 1;
      continue;
    }

    if (arg === '--report' && next) {
      result.reportPath = next;
      index += 1;
      continue;
    }

    if (arg.startsWith('--backend-origin=')) {
      result.backendOrigin = arg.slice('--backend-origin='.length);
      continue;
    }

    if (arg.startsWith('--frontend-origin=')) {
      result.frontendOrigin = arg.slice('--frontend-origin='.length);
      continue;
    }

    if (arg.startsWith('--providers=')) {
      result.providers = arg.slice('--providers='.length).split(',').map((provider) => provider.trim().toLowerCase()).filter(Boolean);
      continue;
    }

    if (arg.startsWith('--timeout-ms=')) {
      result.timeoutMs = Number.parseInt(arg.slice('--timeout-ms='.length), 10);
      continue;
    }

    if (arg.startsWith('--report=')) {
      result.reportPath = arg.slice('--report='.length);
    }
  }

  return result;
};

const printHelp = () => {
  console.log(`OAuth provider link preflight

Checks backend OAuth2 authorization redirects without following external provider URLs.

Usage:
  npm run smoke:oauth:providers:preflight
  node scripts/oauth-provider-link-preflight.mjs --backend-origin https://api.begabaseball.xyz --frontend-origin https://www.begabaseball.xyz --providers google,kakao,naver

Environment:
  OAUTH_PROVIDER_BACKEND_ORIGIN       Backend origin. Default: http://localhost:8080
  OAUTH_PROVIDER_FRONTEND_ORIGIN      Frontend origin used in the manual checklist. Default: http://127.0.0.1:5176
  OAUTH_PROVIDER_SMOKE_PROVIDERS      Comma-separated providers. Default: google,kakao,naver
  OAUTH_PROVIDER_PREFLIGHT_TIMEOUT_MS Request timeout. Default: 10000

Manual real-link smoke after preflight:
  1. Log in with a test account at the frontend origin.
  2. Open /mypage?view=accountSettings.
  3. Click each unlinked provider and complete provider login.
  4. Confirm redirect returns to /oauth/callback?state=...&status=linked, then /mypage?view=accountSettings.
  5. Confirm /api/auth/providers lists the provider and account security activity records the link.
  6. Unlink the provider and confirm it disappears from /api/auth/providers.
`);
};

const normalizeOrigin = (value, label) => {
  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    throw new Error(`${label} must be an absolute URL. Received: ${value}`);
  }
};

const isRedirectStatus = (status) => status >= 300 && status < 400;

const buildProviderUrl = (backendOrigin, provider) => (
  new URL(`/oauth2/authorization/${provider}`, backendOrigin).toString()
);

const buildExpectedRedirectUri = (backendOrigin, provider) => (
  new URL(`/login/oauth2/code/${provider}`, backendOrigin).toString()
);

const buildDiagnosticSuffix = (diagnostics) => {
  const entries = Object.entries(diagnostics)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${value}`);

  return entries.length > 0 ? ` (${entries.join(', ')})` : '';
};

const failWithDiagnostics = (message, diagnostics = {}) => {
  throw new Error(`${message}${buildDiagnosticSuffix(diagnostics)}`);
};

const inspectProviderRedirect = async (backendOrigin, provider, timeoutMs) => {
  const expectation = PROVIDER_EXPECTATIONS[provider];
  if (!expectation) {
    throw new Error(`Unsupported provider "${provider}". Supported providers: ${DEFAULT_PROVIDERS.join(', ')}`);
  }

  const url = buildProviderUrl(backendOrigin, provider);
  const expectedRedirectUri = buildExpectedRedirectUri(backendOrigin, provider);
  const response = await fetch(url, {
    redirect: 'manual',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const location = response.headers.get('location') || '';

  if (!isRedirectStatus(response.status)) {
    failWithDiagnostics(
      `${provider} authorization endpoint returned ${response.status}, expected 3xx redirect`,
      {
        authorizationUrl: url,
        expectedHost: expectation.expectedHost,
        expectedRedirectUri,
      },
    );
  }

  if (!location) {
    failWithDiagnostics(
      `${provider} authorization endpoint returned ${response.status} without Location header`,
      {
        authorizationUrl: url,
        expectedHost: expectation.expectedHost,
        expectedRedirectUri,
      },
    );
  }

  let parsedLocation;
  try {
    parsedLocation = new URL(location, backendOrigin);
  } catch {
    failWithDiagnostics(`${provider} authorization Location is not a valid URL`, {
      authorizationUrl: url,
      location,
      expectedHost: expectation.expectedHost,
      expectedRedirectUri,
    });
  }

  if (parsedLocation.hostname !== expectation.expectedHost) {
    failWithDiagnostics(
      `${provider} authorization Location host was ${parsedLocation.hostname}, expected ${expectation.expectedHost}`,
      {
        authorizationUrl: url,
        redirectUri: parsedLocation.searchParams.get('redirect_uri') || '',
        expectedRedirectUri,
      },
    );
  }

  const hasState = parsedLocation.searchParams.has('state');
  const hasClientId = parsedLocation.searchParams.has('client_id');
  const redirectUri = parsedLocation.searchParams.get('redirect_uri') || '';

  if (!hasState) {
    failWithDiagnostics(`${provider} authorization Location is missing state`, {
      authorizationUrl: url,
      authorizationHost: parsedLocation.hostname,
      redirectUri,
      expectedRedirectUri,
    });
  }

  if (!hasClientId) {
    failWithDiagnostics(
      `${provider} authorization Location is missing client_id; check ${expectation.manualLabel} OAuth client env`,
      {
        authorizationUrl: url,
        authorizationHost: parsedLocation.hostname,
        redirectUri,
        expectedRedirectUri,
      },
    );
  }

  if (!redirectUri) {
    failWithDiagnostics(`${provider} authorization Location is missing redirect_uri`, {
      authorizationUrl: url,
      authorizationHost: parsedLocation.hostname,
      expectedRedirectUri,
    });
  }

  if (redirectUri !== expectedRedirectUri) {
    failWithDiagnostics(
      `${provider} redirect_uri was ${redirectUri}, expected ${expectedRedirectUri}`,
      {
        authorizationUrl: url,
        authorizationHost: parsedLocation.hostname,
      },
    );
  }

  return {
    provider,
    authorizationUrl: url,
    status: response.status,
    authorizationHost: parsedLocation.hostname,
    hasState,
    hasRedirectUri: true,
    redirectUri,
    expectedRedirectUri,
    hasClientId,
  };
};

const writeReport = (reportPath, report) => {
  const absoluteReportPath = resolve(process.cwd(), reportPath);
  mkdirSync(resolve(absoluteReportPath, '..'), { recursive: true });
  writeFileSync(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`);
  return absoluteReportPath;
};

const formatError = (error) => {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = error.cause;
  if (cause && typeof cause === 'object') {
    const code = 'code' in cause && typeof cause.code === 'string' ? cause.code : null;
    const causeMessage = 'message' in cause && typeof cause.message === 'string' ? cause.message : null;
    if (code || causeMessage) {
      return `${error.message}: ${[code, causeMessage].filter(Boolean).join(' ')}`;
    }
  }

  return error.message;
};

const main = async () => {
  const args = parseArgs();
  if (args.help) {
    printHelp();
    return;
  }

  const backendOrigin = normalizeOrigin(args.backendOrigin, 'backend origin');
  const frontendOrigin = normalizeOrigin(args.frontendOrigin, 'frontend origin');
  const startedAt = new Date().toISOString();
  const checks = [];
  const failures = [];

  console.log(`[oauth-preflight] backend origin: ${backendOrigin}`);
  console.log(`[oauth-preflight] frontend origin: ${frontendOrigin}`);
  console.log('[oauth-preflight] redirect=manual; external provider URLs are not followed');

  for (const provider of args.providers) {
    try {
      const result = await inspectProviderRedirect(backendOrigin, provider, args.timeoutMs);
      checks.push({
        ...result,
        status: 'passed',
      });
      console.log(`[OK] ${provider}: ${result.authorizationHost}, state=${result.hasState}, redirect_uri=${result.hasRedirectUri}`);
    } catch (error) {
      const message = formatError(error);
      failures.push({ provider, message });
      console.log(`[FAIL] ${provider}: ${message}`);
    }
  }

  const report = {
    ok: failures.length === 0,
    backendOrigin,
    frontendOrigin,
    timeoutMs: args.timeoutMs,
    providers: args.providers,
    runStartedAt: startedAt,
    runFinishedAt: new Date().toISOString(),
    checks,
    failures,
    manualRealLinkSmoke: [
      `Log in with a test account at ${frontendOrigin}.`,
      'Open /mypage?view=accountSettings.',
      'Click each unlinked provider and complete provider login.',
      'Confirm linked flow returns through /oauth/callback?state=...&status=linked to /mypage?view=accountSettings.',
      'Confirm /api/auth/providers lists the provider and account security activity records the link.',
      'Unlink the provider and confirm it disappears from /api/auth/providers.',
    ],
  };

  const reportPath = writeReport(args.reportPath, report);
  console.log(`[oauth-preflight] report: ${reportPath}`);

  if (!report.ok) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(formatError(error));
  process.exit(1);
});
