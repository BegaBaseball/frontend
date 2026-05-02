#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const parseArgs = () => {
  const result = {
    apiBaseUrl: process.env.SMOKE_API_BASE_URL || process.env.BACKEND_BASE_URL || process.env.VITE_API_BASE_URL || '',
    frontendOrigin: process.env.SMOKE_FRONTEND_ORIGIN || process.env.FRONTEND_ORIGIN || 'https://www.begabaseball.xyz',
    timeoutMs: '15000',
    reportPath: 'reports/auth-public-postdeploy-smoke.json',
  };

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--api-base-url' && next) {
      result.apiBaseUrl = next;
      i += 1;
      continue;
    }
    if (arg === '--frontend-origin' && next) {
      result.frontendOrigin = next;
      i += 1;
      continue;
    }
    if (arg === '--timeout-ms' && next) {
      result.timeoutMs = next;
      i += 1;
      continue;
    }
    if (arg === '--report' && next) {
      result.reportPath = next;
      i += 1;
      continue;
    }
    if (arg.startsWith('--api-base-url=')) {
      result.apiBaseUrl = arg.slice('--api-base-url='.length);
      continue;
    }
    if (arg.startsWith('--frontend-origin=')) {
      result.frontendOrigin = arg.slice('--frontend-origin='.length);
      continue;
    }
    if (arg.startsWith('--timeout-ms=')) {
      result.timeoutMs = arg.slice('--timeout-ms='.length);
      continue;
    }
    if (arg.startsWith('--report=')) {
      result.reportPath = arg.slice('--report='.length);
    }
  }

  return result;
};

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

const buildHealthUrls = (apiBase) => {
  try {
    const parsed = new URL(apiBase);
    const basePath = parsed.pathname.replace(/\/+$/, '');
    const servicePath = basePath.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
    return [...new Set([
      `${parsed.origin}${servicePath || ''}/actuator/health/readiness`,
      `${parsed.origin}${basePath || ''}/actuator/health/readiness`,
    ])];
  } catch {
    return [`${apiBase}/actuator/health/readiness`];
  }
};

const args = parseArgs();
const apiBase = normalizeApiBase(args.apiBaseUrl);
const timeoutMs = Number.parseInt(args.timeoutMs, 10);
const reportPath = resolve(process.cwd(), args.reportPath);
const randomSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const handleQuery = `Smoke${randomSuffix.slice(-6)}`.toUpperCase();
const expectedHandleNormalized = `@${handleQuery.toLowerCase()}`;

const report = {
  ok: false,
  apiBase,
  frontendOrigin: args.frontendOrigin,
  timeoutMs,
  runStartedAt: new Date().toISOString(),
  checks: [],
  failures: [],
  warnings: [],
};

const finalize = (ok) => {
  report.ok = ok;
  report.runFinishedAt = new Date().toISOString();
  mkdirSync(resolve(reportPath, '..'), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
};

const fail = (message) => {
  report.failures.push(message);
};

const withPublicAuthHint = (endpointName, error) => {
  const status = typeof error?.status === 'number' ? error.status : null;
  if (status === 401 || status === 403) {
    return new Error(
      `${endpointName} is not publicly accessible on the deployed backend `
      + `(status ${status}). The auth availability endpoint deployment is likely missing or outdated.`,
    );
  }
  return error;
};

const request = async (url, options = {}) => {
  const {
    expectedStatuses = [200],
    includeOrigin = false,
  } = options;

  const headers = {};
  if (includeOrigin && args.frontendOrigin) {
    headers.Origin = args.frontendOrigin;
    headers.Referer = `${args.frontendOrigin.replace(/\/+$/, '')}/`;
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const rawText = await response.text();

  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!expectedStatuses.includes(response.status)) {
    const error = new Error(`${url} returned ${response.status}: ${data?.message || rawText || 'empty body'}`);
    error.status = response.status;
    throw error;
  }

  return {
    status: response.status,
    data,
    rawText,
  };
};

const run = async (name, fn) => {
  try {
    const result = await fn();
    report.checks.push({
      name,
      status: 'passed',
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({
      name,
      status: 'failed',
      error: message,
    });
    fail(`${name}: ${message}`);
  }
};

const main = async () => {
  if (!apiBase) {
    fail('api base url is missing or invalid');
    finalize(false);
    process.exit(1);
  }

  if (!/^https?:\/\//i.test(args.frontendOrigin || '')) {
    fail(`frontend origin is invalid: ${args.frontendOrigin}`);
    finalize(false);
    process.exit(1);
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) {
    fail(`timeout_ms is invalid: ${args.timeoutMs}`);
    finalize(false);
    process.exit(1);
  }

  const healthUrls = buildHealthUrls(apiBase);

  await run('backend-health', async () => {
    let lastError = null;
    for (const url of healthUrls) {
      try {
        const response = await request(url, { expectedStatuses: [200] });
        return {
          url,
          status: response.status,
        };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('health endpoint probe failed');
  });

  await run('check-handle-public', async () => {
    const url = `${apiBase}/auth/check-handle?${new URLSearchParams({ handle: handleQuery }).toString()}`;
    let response;
    try {
      response = await request(url, {
        expectedStatuses: [200],
        includeOrigin: true,
      });
    } catch (error) {
      throw withPublicAuthHint('check-handle', error);
    }

    if (response.data?.success !== true || response.data?.data?.available !== true) {
      throw new Error(`unexpected availability payload: ${response.rawText}`);
    }

    if (response.data?.data?.normalized !== expectedHandleNormalized) {
      throw new Error(`normalized handle mismatch: ${response.data?.data?.normalized}`);
    }

    return {
      url,
      status: response.status,
      normalized: response.data.data.normalized,
    };
  });

  // [Security Fix - Critical #3] /auth/check-email 엔드포인트 제거 (User Enumeration 방지).
  // 이메일 중복 여부는 signup 시 DUPLICATE_EMAIL 응답으로만 확인 가능하므로 별도 스모크 단계 제거.

  const ok = report.failures.length === 0;
  finalize(ok);
  if (!ok) {
    process.exit(1);
  }
};

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
  finalize(false);
  process.exit(1);
});
