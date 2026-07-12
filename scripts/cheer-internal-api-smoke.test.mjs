import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  MANUAL_BASEBALL_DATA_REQUIRED_CODE,
  normalizeApiBase,
  runCheerInternalApiSmoke,
} from './cheer-internal-api-smoke.mjs';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

const pagePayload = (content = []) => ({
  content,
  last: true,
  totalPages: content.length > 0 ? 1 : 0,
  totalElements: content.length,
  size: 5,
  number: 0,
});

const buildFetch = (routes, requests) => async (input, options = {}) => {
  const url = new URL(String(input));
  const key = `${url.pathname}${url.search}`;
  requests.push({ key, method: options.method || 'GET' });
  const response = routes.get(key);
  if (!response) {
    return jsonResponse({ message: `unhandled route: ${key}` }, 404);
  }
  return typeof response === 'function' ? response() : response;
};

const createBaseRoutes = () => new Map([
  ['/actuator/health/readiness', jsonResponse({ status: 'UP' })],
  ['/api/cheer/posts?page=0&size=5', jsonResponse(pagePayload())],
  ['/api/cheer/posts/hot?page=0&size=5&algorithm=HYBRID', jsonResponse(pagePayload())],
  ['/api/cheer/posts/search?q=cheer-smoke-contract&page=0&size=5', jsonResponse(pagePayload())],
  ['/api/kbo/schedule?date=2026-07-12', jsonResponse([])],
]);

test('normalizeApiBase는 서비스 주소를 내부 /api 주소로 정규화한다', () => {
  assert.equal(normalizeApiBase('http://127.0.0.1:8080'), 'http://127.0.0.1:8080/api');
  assert.equal(normalizeApiBase('http://127.0.0.1:8080/api/'), 'http://127.0.0.1:8080/api');
  assert.equal(normalizeApiBase('not-a-url'), null);
});

test('Cheer 내부 API 스모크는 공개 피드와 진행 경기 스냅샷을 GET으로만 검증한다', async () => {
  const requests = [];
  const routes = createBaseRoutes();
  routes.set('/api/kbo/schedule?date=2026-07-12', jsonResponse([{
    gameId: '20260712LGHH0',
    gameStatus: 'PLAYING',
    homeTeam: 'HH',
    awayTeam: 'LG',
  }]));
  routes.set('/api/matches/20260712LGHH0/live?limit=20', jsonResponse({
    gameId: '20260712LGHH0',
    gameStatus: 'PLAYING',
    events: [],
  }));

  const report = await runCheerInternalApiSmoke({
    apiBase: 'http://127.0.0.1:8080',
    date: '2026-07-12',
    timeoutMs: 1000,
    fetchImpl: buildFetch(routes, requests),
  });

  assert.equal(report.ok, true);
  assert.equal(report.readOnly, true);
  assert.equal(report.dataSourcePolicy, 'internal-api-only');
  assert.deepEqual(report.failures, []);
  assert.equal(report.checks.find((check) => check.name === 'live-snapshot')?.status, 'passed');
  assert.ok(requests.some(({ key }) => key === '/api/matches/20260712LGHH0/live?limit=20'));
  assert.ok(requests.every(({ method }) => method === 'GET'));
});

test('일정의 수동 데이터 계약은 합성 없이 guarded 상태로 기록한다', async () => {
  const requests = [];
  const routes = createBaseRoutes();
  routes.set('/api/kbo/schedule?date=2026-07-12', jsonResponse({
    code: MANUAL_BASEBALL_DATA_REQUIRED_CODE,
    message: 'operator schedule data required',
  }, 409));

  const report = await runCheerInternalApiSmoke({
    apiBase: 'http://127.0.0.1:8080/api',
    date: '2026-07-12',
    timeoutMs: 1000,
    fetchImpl: buildFetch(routes, requests),
  });

  assert.equal(report.ok, true);
  assert.equal(report.checks.find((check) => check.name === 'schedule')?.status, 'guarded');
  assert.equal(report.checks.find((check) => check.name === 'live-snapshot')?.status, 'skipped');
  assert.ok(report.warnings.some((warning) => warning.includes(MANUAL_BASEBALL_DATA_REQUIRED_CODE)));
  assert.ok(!requests.some(({ key }) => key.includes('/matches/')));
});

test('페이지 응답 형식이 잘못되면 엔드포인트별 실패를 보고한다', async () => {
  const requests = [];
  const routes = createBaseRoutes();
  routes.set('/api/cheer/posts?page=0&size=5', jsonResponse({
    content: {},
    last: true,
  }));

  const report = await runCheerInternalApiSmoke({
    apiBase: 'http://127.0.0.1:8080',
    date: '2026-07-12',
    timeoutMs: 1000,
    fetchImpl: buildFetch(routes, requests),
  });

  assert.equal(report.ok, false);
  assert.equal(report.checks.find((check) => check.name === 'feed')?.status, 'failed');
  assert.ok(report.failures.some((failure) => failure.includes('feed')));
});

test('Spring nested page 메타데이터를 실제 Cheer API 계약으로 허용한다', async () => {
  const requests = [];
  const routes = createBaseRoutes();
  const nestedPage = {
    content: [],
    page: {
      size: 5,
      number: 0,
      totalElements: 0,
      totalPages: 0,
    },
  };
  routes.set('/api/cheer/posts?page=0&size=5', jsonResponse(nestedPage));
  routes.set('/api/cheer/posts/hot?page=0&size=5&algorithm=HYBRID', jsonResponse(nestedPage));
  routes.set('/api/cheer/posts/search?q=cheer-smoke-contract&page=0&size=5', jsonResponse(nestedPage));

  const report = await runCheerInternalApiSmoke({
    apiBase: 'http://127.0.0.1:8080',
    date: '2026-07-12',
    timeoutMs: 1000,
    fetchImpl: buildFetch(routes, requests),
  });

  assert.equal(report.ok, true);
  assert.equal(report.checks.find((check) => check.name === 'feed')?.last, true);
  assert.equal(report.checks.find((check) => check.name === 'hot-feed')?.totalPages, 0);
  assert.equal(report.checks.find((check) => check.name === 'search')?.contentCount, 0);
});

test('package.json은 읽기 전용 Cheer 내부 API 스모크 명령을 제공한다', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(
    packageJson.scripts?.['smoke:cheer:internal'],
    'node scripts/cheer-internal-api-smoke.mjs --report reports/cheer-internal-api-smoke.json',
  );
});
