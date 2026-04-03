import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fetchPartyApplications,
  fetchPartyMyApplication,
  fetchPartyReviews,
} from './mate';

const resolveRequestUrl = (input: string | URL | Request): string =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

test('fetchPartyMyApplication은 404를 null로 정규화하고 전용 endpoint만 호출한다', async (t) => {
  const requestedUrls: string[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestedUrls.push(resolveRequestUrl(input));
    return new Response(JSON.stringify({ message: 'not found' }), {
      headers: { 'content-type': 'application/json' },
      status: 404,
    });
  });

  const response = await fetchPartyMyApplication(7);

  assert.equal(response, null);
  assert.deepEqual(requestedUrls, ['/api/applications/party/7/mine']);
});

test('fetchPartyMyApplication은 404가 아닌 오류를 그대로 던진다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ message: 'forbidden' }), {
    headers: { 'content-type': 'application/json' },
    status: 403,
  }));

  await assert.rejects(
    () => fetchPartyMyApplication(9),
    (error: unknown) => {
      assert.equal(typeof error, 'object');
      assert.equal((error as { status?: number }).status, 403);
      return true;
    },
  );
});

test('fetchPartyApplications와 fetchPartyReviews는 전용 endpoint fetcher를 그대로 사용한다', async (t) => {
  const requestedUrls: string[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = resolveRequestUrl(input);
    requestedUrls.push(url);

    if (url === '/api/applications/party/11') {
      return new Response(JSON.stringify([{ id: 1, partyId: 11 }]), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify([{ id: 2, partyId: 12, rating: 5, createdAt: '2026-03-28T00:00:00Z' }]), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const applications = await fetchPartyApplications(11);
  const reviews = await fetchPartyReviews('12');

  assert.deepEqual(requestedUrls, ['/api/applications/party/11', '/api/reviews/party/12']);
  assert.equal(applications[0]?.partyId, 11);
  assert.equal(reviews[0]?.partyId, 12);
});
