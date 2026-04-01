import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchStadiumPlaces, fetchStadiums } from './stadiumGuidePublic';

test('fetchStadiums는 공개 구장 목록 경로를 호출한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return new Response(JSON.stringify([
      { stadiumId: 'JAMSIL', stadiumName: '잠실야구장', lat: 37.5, lng: 127.0 },
    ]), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await fetchStadiums();

  assert.equal(response[0]?.stadiumId, 'JAMSIL');
  assert.match(requestUrl, /\/api\/stadiums$/);
});

test('fetchStadiumPlaces는 카테고리 쿼리를 포함한 공개 경로를 호출한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return new Response(JSON.stringify([
      { id: 1, stadiumName: '잠실야구장', category: 'food', name: '버거집', lat: 37.5, lng: 127.0, rating: 4.5 },
    ]), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await fetchStadiumPlaces('JAMSIL', 'food');

  assert.equal(response[0]?.name, '버거집');
  assert.match(requestUrl, /\/api\/stadiums\/JAMSIL\/places\?category=food$/);
});
