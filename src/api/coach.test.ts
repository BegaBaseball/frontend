import assert from 'node:assert/strict';
import test from 'node:test';

import api from './axios';
import { analyzeTeam, CoachAnalyzeError } from './coach';

const baseRequest = {
  home_team_id: 'HH',
  away_team_id: 'SS',
  request_mode: 'manual_detail' as const,
};

test('analyzeTeam은 401에서 auth 전용 에러를 던진다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => (
    new Response(JSON.stringify({ detail: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  ) as never);
  t.mock.method(api, 'post', async () => ({ status: 401 }) as never);

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'AUTH_EXPIRED');
      assert.equal(error.statusCode, 401);
      assert.equal(error.message, '인증이 만료되었습니다. 다시 로그인 후 시도해주세요.');
      return true;
    },
  );
});

test('analyzeTeam은 reissue 요청이 401로 실패해도 auth 전용 에러를 던진다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => (
    new Response(JSON.stringify({ detail: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  ) as never);
  t.mock.method(api, 'post', async () => {
    throw new Error('Request failed with status code 401');
  });

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'AUTH_EXPIRED');
      assert.equal(error.statusCode, 401);
      assert.equal(error.message, '인증이 만료되었습니다. 다시 로그인 후 시도해주세요.');
      return true;
    },
  );
});

test('analyzeTeam은 5xx에서 generic 분석 실패 에러를 던진다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => (
    new Response('server exploded', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  ) as never);

  await assert.rejects(
    () => analyzeTeam(baseRequest),
    (error) => {
      assert.ok(error instanceof CoachAnalyzeError);
      assert.equal(error.code, 'REQUEST_FAILED');
      assert.equal(error.statusCode, 500);
      assert.equal(error.message, '분석 중 오류가 발생했습니다.');
      return true;
    },
  );
});
