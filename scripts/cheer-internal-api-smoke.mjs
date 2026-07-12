#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MANUAL_BASEBALL_DATA_REQUIRED_CODE = 'MANUAL_BASEBALL_DATA_REQUIRED';

const LIVE_STATUSES = new Set(['PLAYING', 'LIVE', 'IN_PROGRESS', 'INPROGRESS']);

export const normalizeApiBase = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const candidate = value.trim().replace(/\/+$/, '');
  if (!candidate || !/^https?:\/\//i.test(candidate)) {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    const pathname = parsed.pathname.replace(/\/+$/, '');
    const apiPath = !pathname || pathname === '/'
      ? '/api'
      : pathname.endsWith('/api')
        ? pathname
        : `${pathname}/api`;
    return `${parsed.origin}${apiPath}`;
  } catch {
    return null;
  }
};

const buildServiceBase = (apiBase) => {
  const parsed = new URL(apiBase);
  const servicePath = parsed.pathname.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  return `${parsed.origin}${servicePath}`;
};

const buildKstDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const read = (type) => parts.find((part) => part.type === type)?.value;
  return `${read('year')}-${read('month')}-${read('day')}`;
};

const parseArgs = (argv) => {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const equalsIndex = token.indexOf('=');
    if (equalsIndex > 2) {
      parsed[token.slice(2, equalsIndex)] = token.slice(equalsIndex + 1);
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = 'true';
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
};

const getResponseCode = (payload) => (
  payload?.code
  || payload?.responseCode
  || payload?.error?.code
  || payload?.data?.code
  || null
);

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const validatePagePayload = (payload, name) => {
  if (!isObject(payload)) {
    throw new Error(`${name}: 페이지 응답이 객체가 아닙니다.`);
  }
  if (!Array.isArray(payload.content)) {
    throw new Error(`${name}: content 배열이 없습니다.`);
  }
  const pageMeta = isObject(payload.page) ? payload.page : {};
  const normalized = {
    totalPages: pageMeta.totalPages ?? payload.totalPages,
    totalElements: pageMeta.totalElements ?? payload.totalElements,
    size: pageMeta.size ?? payload.size,
    number: pageMeta.number ?? payload.number,
  };

  for (const field of ['totalPages', 'totalElements', 'size', 'number']) {
    if (!Number.isInteger(normalized[field]) || normalized[field] < 0) {
      throw new Error(`${name}: ${field} 값이 0 이상의 정수가 아닙니다.`);
    }
  }
  const last = typeof payload.last === 'boolean'
    ? payload.last
    : normalized.totalPages === 0
      || normalized.number >= normalized.totalPages - 1
      || (normalized.size > 0 && payload.content.length < normalized.size);

  return {
    contentCount: payload.content.length,
    totalElements: normalized.totalElements,
    totalPages: normalized.totalPages,
    page: normalized.number,
    size: normalized.size,
    last,
  };
};

const selectLiveGameId = (schedule) => {
  const liveGame = schedule.find((game) => (
    isObject(game)
    && typeof game.gameId === 'string'
    && game.gameId.trim().length > 0
    && LIVE_STATUSES.has(String(game.gameStatus || '').trim().toUpperCase())
  ));
  return liveGame?.gameId?.trim() || null;
};

const validateLiveSnapshot = (payload, expectedGameId) => {
  if (!isObject(payload)) {
    throw new Error('live-snapshot: 응답이 객체가 아닙니다.');
  }
  if (payload.gameId != null && payload.gameId !== expectedGameId) {
    throw new Error(`live-snapshot: gameId 불일치 expected=${expectedGameId} actual=${payload.gameId}`);
  }
  if (payload.events != null && !Array.isArray(payload.events)) {
    throw new Error('live-snapshot: events 값이 배열이 아닙니다.');
  }
  return {
    gameId: payload.gameId || expectedGameId,
    gameStatus: payload.gameStatus || null,
    eventCount: Array.isArray(payload.events) ? payload.events.length : 0,
  };
};

const requestJson = async ({ fetchImpl, url, timeoutMs }) => {
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new Error(`GET ${url} 요청 실패: ${error instanceof Error ? error.message : String(error)}`);
  }

  const rawText = await response.text();
  let payload = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(`GET ${url} 응답이 JSON이 아닙니다. status=${response.status}`);
  }

  return {
    status: response.status,
    ok: response.ok,
    payload,
    rawText,
  };
};

export const runCheerInternalApiSmoke = async ({
  apiBase: apiBaseInput,
  date = buildKstDate(),
  timeoutMs = 15000,
  fetchImpl = globalThis.fetch,
}) => {
  const apiBase = normalizeApiBase(apiBaseInput);
  const report = {
    ok: false,
    readOnly: true,
    dataSourcePolicy: 'internal-api-only',
    apiBase,
    date,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    checks: [],
    warnings: [],
    failures: [],
  };

  if (!apiBase) {
    report.failures.push('config: API base URL이 없거나 유효하지 않습니다.');
    report.finishedAt = new Date().toISOString();
    return report;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    report.failures.push(`config: date 형식이 YYYY-MM-DD가 아닙니다. actual=${date}`);
    report.finishedAt = new Date().toISOString();
    return report;
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) {
    report.failures.push(`config: timeoutMs는 1000~120000 정수여야 합니다. actual=${timeoutMs}`);
    report.finishedAt = new Date().toISOString();
    return report;
  }
  if (typeof fetchImpl !== 'function') {
    report.failures.push('config: fetch 구현이 없습니다.');
    report.finishedAt = new Date().toISOString();
    return report;
  }

  const runCheck = async (name, operation) => {
    const startedAt = Date.now();
    try {
      const result = await operation();
      const status = result?.checkStatus || 'passed';
      const { checkStatus: _checkStatus, ...details } = result || {};
      report.checks.push({
        name,
        status,
        durationMs: Date.now() - startedAt,
        ...details,
      });
      return details;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report.checks.push({
        name,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        error: message,
      });
      report.failures.push(`${name}: ${message}`);
      return null;
    }
  };

  await runCheck('backend-readiness', async () => {
    const url = `${buildServiceBase(apiBase)}/actuator/health/readiness`;
    const response = await requestJson({ fetchImpl, url, timeoutMs });
    if (response.status !== 200 || response.payload?.status !== 'UP') {
      throw new Error(`readiness 응답이 UP이 아닙니다. status=${response.status} health=${response.payload?.status || 'empty'}`);
    }
    return { httpStatus: response.status, health: response.payload.status };
  });

  const pageChecks = [
    ['feed', '/cheer/posts', { page: '0', size: '5' }],
    ['hot-feed', '/cheer/posts/hot', { page: '0', size: '5', algorithm: 'HYBRID' }],
    ['search', '/cheer/posts/search', { q: 'cheer-smoke-contract', page: '0', size: '5' }],
  ];

  for (const [name, path, params] of pageChecks) {
    await runCheck(name, async () => {
      const url = `${apiBase}${path}?${new URLSearchParams(params).toString()}`;
      const response = await requestJson({ fetchImpl, url, timeoutMs });
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.payload?.message || response.rawText || 'empty body'}`);
      }
      return {
        httpStatus: response.status,
        ...validatePagePayload(response.payload, name),
      };
    });
  }

  let schedule = null;
  await runCheck('schedule', async () => {
    const url = `${apiBase}/kbo/schedule?${new URLSearchParams({ date }).toString()}`;
    const response = await requestJson({ fetchImpl, url, timeoutMs });
    const responseCode = getResponseCode(response.payload);
    if (responseCode === MANUAL_BASEBALL_DATA_REQUIRED_CODE) {
      report.warnings.push(`${MANUAL_BASEBALL_DATA_REQUIRED_CODE}: date=${date}`);
      return {
        checkStatus: 'guarded',
        httpStatus: response.status,
        responseCode,
        gameCount: 0,
      };
    }
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: ${response.payload?.message || response.rawText || 'empty body'}`);
    }
    if (!Array.isArray(response.payload)) {
      throw new Error('schedule: 응답이 배열이 아닙니다.');
    }
    schedule = response.payload;
    return {
      httpStatus: response.status,
      gameCount: schedule.length,
    };
  });

  const liveGameId = Array.isArray(schedule) ? selectLiveGameId(schedule) : null;
  if (!liveGameId) {
    report.checks.push({
      name: 'live-snapshot',
      status: 'skipped',
      durationMs: 0,
      reason: Array.isArray(schedule) ? 'no-live-game' : 'schedule-unavailable',
    });
  } else {
    await runCheck('live-snapshot', async () => {
      const url = `${apiBase}/matches/${encodeURIComponent(liveGameId)}/live?${new URLSearchParams({ limit: '20' }).toString()}`;
      const response = await requestJson({ fetchImpl, url, timeoutMs });
      const responseCode = getResponseCode(response.payload);
      if (responseCode === MANUAL_BASEBALL_DATA_REQUIRED_CODE) {
        report.warnings.push(`${MANUAL_BASEBALL_DATA_REQUIRED_CODE}: gameId=${liveGameId}`);
        return {
          checkStatus: 'guarded',
          httpStatus: response.status,
          responseCode,
          gameId: liveGameId,
        };
      }
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.payload?.message || response.rawText || 'empty body'}`);
      }
      return {
        httpStatus: response.status,
        ...validateLiveSnapshot(response.payload, liveGameId),
      };
    });
  }

  report.ok = report.failures.length === 0;
  report.finishedAt = new Date().toISOString();
  return report;
};

const resolveApiBaseFromCli = (args) => (
  args['api-base-url']
  || process.env.SMOKE_API_BASE_URL
  || process.env.BACKEND_BASE_URL
  || process.env.VITE_API_BASE_URL
  || ''
);

const runCli = async () => {
  const args = parseArgs(process.argv.slice(2));
  const timeoutMs = Number.parseInt(args['timeout-ms'] || '15000', 10);
  const reportPath = resolve(
    process.cwd(),
    args.report || 'reports/cheer-internal-api-smoke.json',
  );
  const report = await runCheerInternalApiSmoke({
    apiBase: resolveApiBaseFromCli(args),
    date: args.date || buildKstDate(),
    timeoutMs,
  });

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (!report.ok) {
    console.error('Cheer internal API smoke failed.');
    for (const failure of report.failures) {
      console.error(`- ${failure}`);
    }
    console.error(`- report: ${reportPath}`);
    process.exitCode = 1;
    return;
  }

  console.log('Cheer internal API smoke passed.');
  for (const check of report.checks) {
    console.log(`- ${check.name}: ${check.status}`);
  }
  for (const warning of report.warnings) {
    console.warn(`- warning: ${warning}`);
  }
  console.log(`- report: ${reportPath}`);
};

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  await runCli();
}
