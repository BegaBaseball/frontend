import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fetchAdminPlaces,
  fetchAdminStadiums,
  fetchAdminUsers,
  fetchReleaseDecisionPresets,
} from './admin';

const buildJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });

test('fetchAdminUsers는 관리자 검색 쿼리를 same-origin fetch로 전달한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return buildJsonResponse({
      success: true,
      data: [
        { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'ROLE_USER' },
      ],
    });
  });

  const response = await fetchAdminUsers('admin');

  assert.equal(response[0]?.email, 'admin@example.com');
  assert.match(requestUrl, /\/api\/admin\/users\?search=admin$/);
  assert.equal(requestInit?.credentials, 'include');
});

test('fetchAdminUsers는 403 응답을 관리자 권한 메시지로 변환한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildJsonResponse({
    code: 'FORBIDDEN',
    message: 'Forbidden',
  }, 403));

  await assert.rejects(
    () => fetchAdminUsers('admin'),
    {
      message: '관리자 권한이 필요합니다.',
    },
  );
});

test('fetchAdminStadiums는 raw 구장 배열을 그대로 반환한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return buildJsonResponse([
      {
        stadiumId: 'JAMSIL',
        stadiumName: '잠실야구장',
        team: 'LG',
        lat: 37.512,
        lng: 127.072,
        address: '서울특별시 송파구',
        phone: '02-0000-0000',
      },
    ]);
  });

  const response = await fetchAdminStadiums();

  assert.equal(response[0]?.stadiumId, 'JAMSIL');
  assert.match(requestUrl, /\/api\/stadiums$/);
});

test('fetchAdminPlaces는 raw 장소 배열을 반환한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return buildJsonResponse([
      {
        id: 101,
        stadiumName: '잠실야구장',
        category: '음식점',
        name: '버거집',
        lat: 37.512,
        lng: 127.072,
      },
    ]);
  });

  const response = await fetchAdminPlaces('JAMSIL');

  assert.equal(response[0]?.name, '버거집');
  assert.match(requestUrl, /\/api\/stadiums\/JAMSIL\/places$/);
});

test('fetchReleaseDecisionPresets는 AI 운영 프리셋 raw 응답을 반환한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return buildJsonResponse([
      {
        scenario: 'release-blocker',
        label: 'Release Blocker',
        task_prompt: 'check blockers',
        seed_paths: ['src'],
        allowed_roots: ['src'],
      },
    ]);
  });

  const response = await fetchReleaseDecisionPresets();

  assert.equal(response[0]?.scenario, 'release-blocker');
  assert.match(requestUrl, /\/api\/ai\/release-decision\/presets$/);
});
