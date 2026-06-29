#!/usr/bin/env node
import net from 'node:net';

const DEFAULT_PROXY_TARGET = 'http://localhost:8080';
const DEFAULT_FRONTEND_ORIGIN = 'http://127.0.0.1:5176';
const DEFAULT_TIMEOUT_MS = 3000;
const MANUAL_DATA_CODE = 'MANUAL_BASEBALL_DATA_REQUIRED';

const proxyTargetRaw = process.env.VITE_PROXY_TARGET || DEFAULT_PROXY_TARGET;
const frontendOriginRaw = process.env.VITE_DEV_SERVER_URL
  || process.env.AUDIT_BASE_URL
  || DEFAULT_FRONTEND_ORIGIN;
const timeoutMs = Number.parseInt(process.env.DEV_PROXY_PREFLIGHT_TIMEOUT_MS || '', 10)
  || DEFAULT_TIMEOUT_MS;

const directChecks = [
  {
    label: 'auth mypage',
    path: '/api/auth/mypage',
    expectedStatuses: [401],
  },
  {
    label: 'matches bounds',
    path: '/api/matches/bounds',
    expectedStatuses: [200],
  },
  {
    label: 'matches day',
    path: '/api/matches/day?date=2026-06-21',
    expectedStatuses: [200],
    allowedCodes: [MANUAL_DATA_CODE],
  },
  {
    label: 'prediction bootstrap',
    path: '/api/predictions/bootstrap?date=2026-06-21&gameId=20260621HTKT0',
    expectedStatuses: [200],
    allowedCodes: [MANUAL_DATA_CODE],
  },
];

const parseBaseUrl = (raw, label) => {
  try {
    return new URL(raw);
  } catch (error) {
    throw new Error(`${label} must be an absolute URL. Received: ${raw}`);
  }
};

const withPath = (baseUrl, path) => new URL(path, baseUrl).toString();

const socketAddress = (baseUrl) => ({
  host: baseUrl.hostname.replace(/^\[/, '').replace(/\]$/, ''),
  port: Number(baseUrl.port || (baseUrl.protocol === 'https:' ? 443 : 80)),
});

const checkTcpListener = (baseUrl) => new Promise((resolve) => {
  const { host, port } = socketAddress(baseUrl);
  const socket = net.createConnection({ host, port, timeout: timeoutMs });

  const finish = (ok, detail) => {
    socket.destroy();
    resolve({ ok, host, port, detail });
  };

  socket.once('connect', () => finish(true, 'connected'));
  socket.once('timeout', () => finish(false, `timed out after ${timeoutMs}ms`));
  socket.once('error', (error) => {
    const detail = error.code || error.message || 'connection failed';
    finish(false, detail);
  });
});

const readResponseBody = async (response) => {
  const text = await response.text();
  if (!text) {
    return { text, json: null, code: null };
  }

  try {
    const json = JSON.parse(text);
    return {
      text,
      json,
      code: typeof json?.code === 'string' ? json.code : null,
    };
  } catch {
    return { text, json: null, code: null };
  }
};

const probeHttp = async (url, check) => {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await readResponseBody(response);
    const contentType = response.headers.get('content-type') ?? '';
    const expectedStatuses = check.expectedStatuses ?? [200];
    const allowedCodes = check.allowedCodes ?? [];
    const ok = expectedStatuses.includes(response.status) || allowedCodes.includes(body.code);

    return {
      ok,
      status: response.status,
      code: body.code,
      contentType,
      emptyTextProxy500: response.status === 500
        && contentType.toLowerCase().startsWith('text/plain')
        && body.text.length === 0,
      bodyText: body.text,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      code: null,
      contentType: '',
      emptyTextProxy500: false,
      bodyText: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const formatProbe = (result) => {
  if (result.error) {
    return result.error;
  }

  const code = result.code ? ` code=${result.code}` : '';
  return `status=${result.status}${code}`;
};

const printResult = (ok, label, detail) => {
  const prefix = ok ? '[OK]' : '[FAIL]';
  console.log(`${prefix} ${label}: ${detail}`);
};

const printWarning = (label, detail) => {
  console.log(`[WARN] ${label}: ${detail}`);
};

async function main() {
  const proxyTarget = parseBaseUrl(proxyTargetRaw, 'VITE_PROXY_TARGET');
  const frontendOrigin = parseBaseUrl(frontendOriginRaw, 'VITE_DEV_SERVER_URL');
  let failed = false;

  console.log(`[preflight] backend target: ${proxyTarget.origin}`);
  console.log(`[preflight] frontend origin: ${frontendOrigin.origin}`);

  const backendSocket = await checkTcpListener(proxyTarget);
  if (!backendSocket.ok) {
    printResult(false, 'backend listener', `${backendSocket.host}:${backendSocket.port} ${backendSocket.detail}`);
    console.log('Start backend: cd bega_backend/BEGA_PROJECT && ./gradlew bootRun');
    process.exit(1);
  }
  printResult(true, 'backend listener', `${backendSocket.host}:${backendSocket.port}`);

  const readiness = await probeHttp(withPath(proxyTarget, '/actuator/health/readiness'), {
    expectedStatuses: [200],
  });
  if (readiness.ok) {
    printResult(true, 'backend readiness', formatProbe(readiness));
  } else {
    printWarning('backend readiness', `${formatProbe(readiness)}; continuing with endpoint probes`);
  }

  for (const check of directChecks) {
    const result = await probeHttp(withPath(proxyTarget, check.path), check);
    printResult(result.ok, `backend ${check.label}`, formatProbe(result));
    if (!result.ok) {
      failed = true;
    }
  }

  const frontendSocket = await checkTcpListener(frontendOrigin);
  if (!frontendSocket.ok) {
    printWarning('frontend dev server', `${frontendSocket.host}:${frontendSocket.port} ${frontendSocket.detail}; skipping proxy checks`);
  } else {
    printResult(true, 'frontend dev server', `${frontendSocket.host}:${frontendSocket.port}`);

    for (const check of directChecks) {
      const result = await probeHttp(withPath(frontendOrigin, check.path), check);
      printResult(result.ok, `vite proxy ${check.label}`, formatProbe(result));
      if (result.emptyTextProxy500) {
        console.log('Vite returned an empty text/plain 500. Check VITE_PROXY_TARGET and backend process health.');
      }
      if (!result.ok) {
        failed = true;
      }
    }
  }

  if (failed) {
    console.log('Preflight failed. If backend direct checks fail, inspect backend logs before debugging frontend state.');
    process.exit(1);
  }

  console.log('Preflight passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
