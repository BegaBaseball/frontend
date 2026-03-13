#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const normalizeApiBase = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const candidate = value.trim().replace(/\/+$/, '');
  if (!candidate || !/^https?:\/\//i.test(candidate)) {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    const rawPath = parsed.pathname.replace(/\/+$/, '');
    const resolvedPath = !rawPath || rawPath === '/'
      ? '/api'
      : (rawPath.includes('/api') ? rawPath : `${rawPath}/api`);
    return `${parsed.origin}${resolvedPath}`;
  } catch {
    return null;
  }
};

const resolveApiBaseFromEnv = () => {
  const envCandidates = [
    process.env.SMOKE_API_BASE_URL,
    process.env.BACKEND_BASE_URL,
    process.env.CYPRESS_BACKEND_BASE_URL,
    process.env.CYPRESS_BASE_URL,
    process.env.VITE_API_BASE_URL,
    process.env.FRONTEND_API_BASE_URL,
  ];

  for (const candidate of envCandidates) {
    if (!candidate || typeof candidate !== 'string') {
      continue;
    }
    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }

    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `http://${trimmed}`;
    const resolved = normalizeApiBase(withProtocol);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};

const normalizeFrontendOriginFromValue = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    const cleanedPath = parsed.pathname
      .replace(/\/api\/?$/i, '')
      .replace(/\/+$/, '');
    return `${parsed.origin}${cleanedPath || ''}`;
  } catch {
    return null;
  }
};

const API_BASE = resolveApiBaseFromEnv();
const FRONTEND_ORIGIN = (() => {
  const normalizedCandidateFromEnv =
    normalizeFrontendOriginFromValue(process.env.SMOKE_FRONTEND_ORIGIN)
    || normalizeFrontendOriginFromValue(process.env.FRONTEND_ORIGIN)
    || normalizeFrontendOriginFromValue(process.env.CYPRESS_BASE_URL)
    || normalizeFrontendOriginFromValue(process.env.CYPRESS_FRONTEND_BASE_URL)
    || normalizeFrontendOriginFromValue(process.env.FRONTEND_BASE_URL);

  if (normalizedCandidateFromEnv) {
    return normalizedCandidateFromEnv;
  }

  if (API_BASE) {
    try {
      const parsedApi = new URL(API_BASE);
      const basePath = parsedApi.pathname.replace(/\/api\/?$/, '').replace(/\/+$/, '');
      return `${parsedApi.origin}${basePath || ''}`;
    } catch {
      // ignore and fallback below
    }
  }

  return null;
})();
const REPORT_DIR = resolve(process.cwd(), 'reports');
const reportTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = resolve(REPORT_DIR, `real-integration-smoke-${reportTimestamp}.json`);
const reportLatestPath = resolve(REPORT_DIR, 'real-integration-smoke-latest.json');
const FALLBACK_LOGIN_EMAIL = (process.env.SMOKE_LOGIN_EMAIL || '').trim();
const FALLBACK_LOGIN_PASSWORD = process.env.SMOKE_LOGIN_PASSWORD || '';
const SKIP_SIGNUP = process.env.SMOKE_SKIP_SIGNUP === '1';

const cookieJar = new Map();
const warnings = [];
const steps = [];
const runStartedAt = new Date().toISOString();
const ALLOWED_DIAGNOSTIC_KINDS = new Set(['network', 'timeout', 'http', 'payload', 'config']);

const randomSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const signupIdentity = {
  name: `smoke_user_${randomSuffix.slice(-6)}`,
  handle: `@s${randomSuffix.slice(-8)}`,
  email: `smoke_${randomSuffix}@example.com`,
  password: 'Test1234!',
  favoriteTeam: 'LG',
};
let activeLoginEmail = signupIdentity.email;
let activeLoginPassword = signupIdentity.password;
let samplePartyId = null;

const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  let timer;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    });
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
};

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const normalizeDiagnosticKind = (kind, fallback = 'payload') => (
  ALLOWED_DIAGNOSTIC_KINDS.has(kind) ? kind : fallback
);

const inferDiagnosticKind = (error, fallback = 'payload') => {
  const message = error instanceof Error ? error.message : String(error);
  const explicitStatus = typeof error?.status === 'number' ? error.status : null;
  if (explicitStatus !== null) {
    return 'http';
  }
  if (/timed? out|타임아웃|abort/i.test(message)) {
    return 'timeout';
  }
  if (/fetch failed|network|econnrefused|enotfound|eai_again|eperm/i.test(message)) {
    return 'network';
  }
  if (/api_base|not configured|configuration|env/i.test(message)) {
    return 'config';
  }
  return fallback;
};

const buildDiagnostics = (error, defaults = {}) => {
  const base = error && typeof error === 'object' && error.diagnostics
    ? error.diagnostics
    : {};
  const message = defaults.message
    || (error instanceof Error ? error.message : String(error));
  const status = typeof defaults.status === 'number'
    ? defaults.status
    : (typeof error?.status === 'number' ? error.status : (typeof base.status === 'number' ? base.status : null));
  const kind = normalizeDiagnosticKind(
    defaults.kind || base.kind || inferDiagnosticKind(error, status !== null ? 'http' : 'payload'),
    status !== null ? 'http' : 'payload',
  );

  return {
    kind,
    step: defaults.step ?? base.step ?? null,
    method: defaults.method ?? base.method ?? null,
    path: defaults.path ?? base.path ?? null,
    url: defaults.url ?? base.url ?? null,
    status,
    attempts: defaults.attempts ?? base.attempts ?? null,
    message,
  };
};

const attachDiagnostics = (error, defaults = {}) => {
  const normalized = error instanceof Error ? error : new Error(String(error));
  normalized.diagnostics = buildDiagnostics(normalized, defaults);
  if (typeof normalized.diagnostics.status === 'number') {
    normalized.status = normalized.diagnostics.status;
  }
  return normalized;
};

const formatDiagnostics = (diagnostics) => {
  const method = diagnostics.method ? `${diagnostics.method} ` : '';
  const target = diagnostics.path || diagnostics.url || diagnostics.step || 'unknown';
  const status = typeof diagnostics.status === 'number' ? ` status=${diagnostics.status}` : '';
  const attempts = typeof diagnostics.attempts === 'number' ? ` attempts=${diagnostics.attempts}` : '';
  return `[${diagnostics.kind}] ${method}${target}${status}${attempts}: ${diagnostics.message}`;
};

const parseSetCookie = (setCookieValue) => {
  const token = setCookieValue.split(';')[0]?.trim();
  if (!token || !token.includes('=')) {
    return null;
  }

  const idx = token.indexOf('=');
  const name = token.slice(0, idx);
  const value = token.slice(idx + 1);
  if (!name) {
    return null;
  }

  return { name, value };
};

const updateCookieJar = (response) => {
  const getSetCookie = response.headers?.getSetCookie;
  const setCookies = typeof getSetCookie === 'function'
    ? getSetCookie.call(response.headers)
    : [];

  for (const rawCookie of setCookies) {
    const parsed = parseSetCookie(rawCookie);
    if (parsed) {
      cookieJar.set(parsed.name, parsed.value);
    }
  }
};

const buildCookieHeader = () => {
  if (cookieJar.size === 0) {
    return '';
  }
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
};

const requestJson = async (path, options = {}) => {
  const {
    method = 'GET',
    headers = {},
    body,
    authenticated = false,
    timeoutMs = 15000,
    expectedStatuses = [200],
  } = options;

  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const requestHeaders = { ...headers };
  if (method !== 'GET' && method !== 'HEAD') {
    if (!requestHeaders.Origin && FRONTEND_ORIGIN) {
      requestHeaders.Origin = FRONTEND_ORIGIN;
    }
    if (!requestHeaders.Referer && FRONTEND_ORIGIN) {
      requestHeaders.Referer = `${FRONTEND_ORIGIN}/`;
    }
  }
  if (authenticated) {
    const cookieHeader = buildCookieHeader();
    if (!cookieHeader) {
      throw new Error(`인증 쿠키가 없어 ${method} ${path} 요청을 진행할 수 없습니다.`);
    }
    requestHeaders.Cookie = cookieHeader;
  }

  let response;
  try {
    response = await withTimeout(
      fetch(url, {
        method,
        headers: requestHeaders,
        body,
      }),
      timeoutMs,
      `${method} ${url} 요청 타임아웃(${timeoutMs}ms)`,
    );
  } catch (error) {
    const timeout = error instanceof Error && error.message.includes('요청 타임아웃');
    throw attachDiagnostics(error, {
      kind: timeout ? 'timeout' : 'network',
      method,
      path,
      url,
    });
  }

  updateCookieJar(response);
  const rawText = await response.text();
  let parsed;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  if (!expectedStatuses.includes(response.status)) {
    const message = parsed?.message || rawText || '응답 본문 없음';
    throw attachDiagnostics(new Error(
      `${method} ${path} 상태코드 ${response.status} (기대: ${expectedStatuses.join(', ')}) - ${message}`,
    ), {
      kind: 'http',
      method,
      path,
      url,
      status: response.status,
      message,
    });
  }

  return {
    status: response.status,
    data: parsed,
    rawText,
  };
};

const runStep = async (name, fn) => {
  const startedAt = new Date().toISOString();
  const start = Date.now();
  try {
    const result = await fn();
    const durationMs = Date.now() - start;
    steps.push({
      name,
      status: 'passed',
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs,
      result,
      diagnostics: null,
    });
    console.log(`✓ ${name} (${durationMs}ms)`);
    return result;
  } catch (error) {
    const durationMs = Date.now() - start;
    const diagnostics = buildDiagnostics(error, { step: name });
    steps.push({
      name,
      status: 'failed',
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs,
      error: error instanceof Error ? error.message : String(error),
      diagnostics,
    });
    console.error(`✗ ${name} (${durationMs}ms)`);
    throw attachDiagnostics(error, diagnostics);
  }
};

const requestWithRetry = async (stepName, attempts, fn, delayMs = 800) => {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const diagnostics = buildDiagnostics(error, {
        step: stepName,
        attempts: attempt,
      });
      lastError = attachDiagnostics(error, diagnostics);
      if (attempt < attempts) {
        warnings.push(`${stepName} 재시도 ${attempt}/${attempts - 1}: ${formatDiagnostics(diagnostics)}`);
        await sleep(delayMs);
      }
    }
  }
  throw attachDiagnostics(lastError, { step: stepName, attempts });
};

const extractRequiredPolicyConsents = (payload) => {
  const policies = payload?.data?.policies;
  if (!Array.isArray(policies) || policies.length === 0) {
    throw new Error('필수 정책 목록 응답이 비어 있습니다.');
  }

  const consents = policies
    .filter((policy) => policy?.required === true)
    .map((policy) => ({
      policyType: policy.policyType,
      version: policy.version,
      agreed: true,
    }))
    .filter((policy) => (
      typeof policy.policyType === 'string'
      && policy.policyType.length > 0
      && typeof policy.version === 'string'
      && policy.version.length > 0
    ));

  if (consents.length === 0) {
    throw new Error('필수 정책 동의 항목 생성에 실패했습니다.');
  }

  return consents;
};

const buildTinyPng = () => Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6zK+QAAAAASUVORK5CYII=',
  'base64',
);

const main = async () => {
  if (!API_BASE) {
    throw attachDiagnostics(new Error(
      'SKIP_REAL_SMOKE: API_BASE not configured. '
      + 'Set one of SMOKE_API_BASE_URL, BACKEND_BASE_URL, CYPRESS_BACKEND_BASE_URL, '
      + 'CYPRESS_BASE_URL, VITE_API_BASE_URL, or FRONTEND_API_BASE_URL.',
    ), {
      kind: 'config',
      step: 'config-check',
    });
  }

  console.log(`[real-smoke] api base: ${API_BASE}`);

  await runStep('backend-health', async () => {
    try {
      await requestWithRetry(
        'backend-health',
        12,
        () => requestJson('/actuator/health', {
          expectedStatuses: [200],
          timeoutMs: 3000,
        }),
        1000,
      );
      return { status: 'ok' };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const wrappedError = new Error(`SKIP_REAL_SMOKE: backend unavailable at ${API_BASE}. ${reason}`);
      wrappedError.diagnostics = buildDiagnostics(error, {
        step: 'backend-health',
        method: 'GET',
        path: '/actuator/health',
        url: `${API_BASE}/actuator/health`,
      });
      throw wrappedError;
    }
  });

  const policyResponse = await runStep('required-policies', async () => requestWithRetry(
    'required-policies',
    40,
    () => requestJson('/auth/policies/required', { expectedStatuses: [200] }),
    1500,
  ));

  const policyConsents = extractRequiredPolicyConsents(policyResponse.data);

  await runStep('signup', async () => {
    if (SKIP_SIGNUP) {
      if (!FALLBACK_LOGIN_EMAIL || !FALLBACK_LOGIN_PASSWORD) {
        throw new Error('SMOKE_SKIP_SIGNUP=1 사용 시 SMOKE_LOGIN_EMAIL/SMOKE_LOGIN_PASSWORD가 필요합니다.');
      }
      activeLoginEmail = FALLBACK_LOGIN_EMAIL;
      activeLoginPassword = FALLBACK_LOGIN_PASSWORD;
      return {
        status: 'skipped',
        reason: 'SMOKE_SKIP_SIGNUP=1',
      };
    }

    try {
      const response = await requestJson('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...signupIdentity,
          confirmPassword: signupIdentity.password,
          policyConsents,
        }),
        expectedStatuses: [200, 201],
      });

      if (response.data?.success !== true) {
        throw new Error(response.data?.message || '회원가입 응답 success=false');
      }

      activeLoginEmail = signupIdentity.email;
      activeLoginPassword = signupIdentity.password;
      return { status: response.status, message: response.data?.message };
    } catch (error) {
      const status = typeof error?.status === 'number' ? error.status : null;
      if (status === 429 && FALLBACK_LOGIN_EMAIL && FALLBACK_LOGIN_PASSWORD) {
        activeLoginEmail = FALLBACK_LOGIN_EMAIL;
        activeLoginPassword = FALLBACK_LOGIN_PASSWORD;
        warnings.push('signup 429로 인해 기존 계정으로 로그인 단계를 진행했습니다.');
        return {
          status: 'fallback-login',
          reason: 'signup rate-limited (429)',
          fallbackEmail: FALLBACK_LOGIN_EMAIL,
        };
      }
      throw error;
    }
  });

  await runStep('login', async () => {
    const response = await requestJson('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: activeLoginEmail,
        password: activeLoginPassword,
      }),
      expectedStatuses: [200],
    });

    if (response.data?.success !== true) {
      throw new Error(response.data?.message || '로그인 응답 success=false');
    }

    return {
      status: response.status,
      userId: response.data?.data?.id,
      handle: response.data?.data?.handle,
      cookieCount: cookieJar.size,
    };
  });

  await runStep('auth-mypage', async () => {
    const response = await requestJson('/auth/mypage', {
      authenticated: true,
      expectedStatuses: [200],
    });

    if (response.data?.success !== true || !response.data?.data?.id) {
      throw new Error(response.data?.message || 'mypage 응답이 유효하지 않습니다.');
    }

    return {
      status: response.status,
      id: response.data.data.id,
      email: response.data.data.email,
      policyConsentRequired: response.data.data.policyConsentRequired,
    };
  });

  await runStep('chat-unread-count', async () => {
    const response = await requestJson('/chat/my/unread-counts', {
      authenticated: true,
      expectedStatuses: [200],
    });

    if (response.data?.success !== true || typeof response.data?.data !== 'number') {
      throw new Error('chat unread 응답 형식이 예상과 다릅니다.');
    }

    return { status: response.status, unreadCount: response.data.data };
  });

  await runStep('storage-image-upload', async () => {
    const formData = new FormData();
    const tinyPng = buildTinyPng();
    const file = new File([tinyPng], `smoke-${Date.now()}.png`, { type: 'image/png' });
    formData.append('file', file);

    const response = await requestJson('/storage/image', {
      method: 'POST',
      body: formData,
      authenticated: true,
      expectedStatuses: [200],
      timeoutMs: 30000,
    });

    const payload = response.data?.data;
    const path = typeof payload === 'string'
      ? payload
      : payload?.path || payload?.url || payload?.publicUrl;
    if (!response.data?.success || !path) {
      throw new Error(response.data?.message || '스토리지 업로드 응답에 경로가 없습니다.');
    }

    if (typeof path === 'string' && /^https?:\/\//i.test(path) && process.env.SMOKE_CHECK_STORAGE_URL !== '0') {
      try {
        const urlResponse = await withTimeout(
          fetch(path, { method: 'HEAD' }),
          12000,
          '스토리지 URL HEAD 확인 타임아웃',
        );
        if (urlResponse.status >= 400) {
          warnings.push(`스토리지 URL 접근 상태코드 ${urlResponse.status}: ${path}`);
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        warnings.push(`스토리지 URL 접근 확인 실패(비치명): ${reason}`);
      }
    }

    return {
      status: response.status,
      path,
    };
  });

  await runStep('mate-list-smoke', async () => {
    const response = await requestJson('/parties?page=0&size=20', {
      authenticated: true,
      expectedStatuses: [200],
    });

    const body = response.data;
    const content = Array.isArray(body)
      ? body
      : Array.isArray(body?.content)
        ? body.content
        : Array.isArray(body?.data?.content)
          ? body.data.content
          : [];

    if (content.length > 0 && typeof content[0]?.id === 'number') {
      samplePartyId = content[0].id;
    }

    return {
      status: response.status,
      listedCount: content.length,
      samplePartyId,
    };
  });

  await runStep('my-application-smoke', async () => {
    const response = await requestJson('/applications/my', {
      authenticated: true,
      expectedStatuses: [200],
    });

    const body = response.data;
    const content = Array.isArray(body)
      ? body
      : Array.isArray(body?.content)
        ? body.content
        : Array.isArray(body?.data?.content)
          ? body.data.content
          : [];

    return {
      status: response.status,
      applicationCount: content.length,
    };
  });

  await runStep('payment-prepare-smoke', async () => {
    if (samplePartyId == null) {
      warnings.push('payment-prepare-smoke: 파티 데이터가 없어 검증을 건너뜁니다.');
      return {
        status: 'skipped',
        reason: 'no-party-data',
      };
    }

    const response = await requestJson('/payments/toss/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partyId: samplePartyId,
        flowType: 'DEPOSIT',
        cancelPolicyVersion: 'v1',
      }),
      authenticated: true,
      expectedStatuses: [200, 400, 401, 403, 404, 409, 503],
      timeoutMs: 15000,
    });

    if (response.status === 200) {
      if (!response.data?.intentId || !response.data?.orderId) {
        throw new Error('결제 준비 응답(200)에 intentId/orderId가 없습니다.');
      }
      return {
        status: response.status,
        partyId: samplePartyId,
        intentId: response.data.intentId,
      };
    }

    const message = response.data?.message
      || response.data?.error
      || response.rawText
      || 'no-message';
    warnings.push(`payment-prepare-smoke business rejection: status=${response.status}, message=${message}`);

    return {
      status: response.status,
      partyId: samplePartyId,
      message,
    };
  });
};

const writeReport = (status, fatalError = null, fatalErrorDetails = null) => {
  mkdirSync(REPORT_DIR, { recursive: true });
  const report = {
    status,
    runStartedAt,
    runFinishedAt: new Date().toISOString(),
    apiBase: API_BASE,
    signupIdentity: {
      name: signupIdentity.name,
      handle: signupIdentity.handle,
      email: signupIdentity.email,
    },
    steps,
    warnings,
    fatalError: fatalError ? (fatalError instanceof Error ? fatalError.message : String(fatalError)) : null,
    fatalErrorDetails,
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  writeFileSync(reportLatestPath, JSON.stringify(report, null, 2));
  console.log(`[real-smoke] report: ${reportPath}`);
  console.log(`[real-smoke] latest: ${reportLatestPath}`);
};

const isSmokeSkipError = (error) => (
  error instanceof Error && error.message.startsWith('SKIP_REAL_SMOKE:')
);

try {
  await main();
  writeReport('passed', null, null);
  process.exit(0);
} catch (error) {
  const isSkipped = isSmokeSkipError(error);
  const fatalErrorDetails = buildDiagnostics(
    error,
    steps[steps.length - 1]?.status === 'failed'
      ? steps[steps.length - 1].diagnostics || {}
      : {},
  );
  writeReport(isSkipped ? 'skipped' : 'failed', error, fatalErrorDetails);
  const reason = error instanceof Error ? error.message : String(error);
  if (isSkipped) {
    console.warn(`[real-smoke] skipped: ${reason}`);
    process.exit(0);
  }

  console.error(`[real-smoke] failed: ${reason}`);
  process.exit(1);
}
