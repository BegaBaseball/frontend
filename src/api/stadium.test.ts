import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addStadiumFavorite,
  getMyFavoriteStadiumIds,
  removeStadiumFavorite,
} from './stadium';

test('getMyFavoriteStadiumIds uses private fetch and returns ids', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(JSON.stringify({ stadiumIds: ['JAMSIL', 'DAEJEON'] }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const stadiumIds = await getMyFavoriteStadiumIds();

  assert.deepEqual(stadiumIds, ['JAMSIL', 'DAEJEON']);
  assert.match(requestUrl, /\/api\/stadiums\/favorites$/);
  assert.equal(requestInit?.method, 'GET');
  assert.equal(requestInit?.credentials, 'include');
});

test('addStadiumFavorite posts to the private stadium favorite endpoint', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(null, { status: 204 });
  });

  await addStadiumFavorite('JAMSIL');

  assert.match(requestUrl, /\/api\/stadiums\/JAMSIL\/favorite$/);
  assert.equal(requestInit?.method, 'POST');
  assert.equal(requestInit?.credentials, 'include');
});

test('removeStadiumFavorite deletes the private stadium favorite endpoint', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(null, { status: 204 });
  });

  await removeStadiumFavorite('JAMSIL');

  assert.match(requestUrl, /\/api\/stadiums\/JAMSIL\/favorite$/);
  assert.equal(requestInit?.method, 'DELETE');
  assert.equal(requestInit?.credentials, 'include');
});
