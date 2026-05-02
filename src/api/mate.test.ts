import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fetchMatePartiesPage,
  fetchPartyById,
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

test('fetchMatePartiesPage는 정렬 파라미터를 목록 endpoint에 전달한다', async (t) => {
  const requestedUrls: string[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestedUrls.push(resolveRequestUrl(input));

    return new Response(JSON.stringify({
      content: [{
        id: 3,
        hostName: 'Host',
        hostBadge: 'NEW',
        teamId: 'LG',
        cheeringSide: 'HOME',
        gameDate: '2026-05-20',
        gameTime: '18:30',
        stadium: '잠실야구장',
        homeTeam: 'LG',
        awayTeam: 'KT',
        section: '[홈응원] 1루석',
        maxParticipants: 4,
        currentParticipants: 2,
        description: '정렬 테스트',
        ticketVerified: false,
        status: 'PENDING',
        ticketPrice: 0,
        createdAt: '2026-05-01T09:00:00Z',
      }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 9,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await fetchMatePartiesPage({
    page: 0,
    size: 9,
    sortBy: 'gameDate',
    sortDir: 'asc',
  });

  const url = new URL(requestedUrls[0] ?? '', 'http://localhost');
  assert.equal(url.pathname, '/api/parties');
  assert.equal(url.searchParams.get('sortBy'), 'gameDate');
  assert.equal(url.searchParams.get('sortDir'), 'asc');
  assert.equal(response.content[0]?.id, 3);
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

test('fetchPartyById는 401 발생 시 reissue 후 상세를 다시 조회한다', async (t) => {
  const requestedUrls: string[] = [];
  let partyAttempts = 0;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = resolveRequestUrl(input);
    requestedUrls.push(`${init?.method ?? 'GET'} ${url}`);

    if (url === '/api/parties/12') {
      partyAttempts += 1;
      if (partyAttempts === 1) {
        return new Response(JSON.stringify({ code: 'TOKEN_EXPIRED', message: 'Unauthorized' }), {
          headers: { 'content-type': 'application/json' },
          status: 401,
        });
      }

      return new Response(JSON.stringify({
        id: 12,
        hostName: 'Host',
        hostBadge: 'VERIFIED',
        teamId: 'LG',
        cheeringSide: 'HOME',
        gameDate: '2026-05-20',
        gameTime: '18:30',
        stadium: '잠실야구장',
        homeTeam: 'LG',
        awayTeam: 'KT',
        section: '[홈응원] 1루석',
        maxParticipants: 2,
        currentParticipants: 1,
        description: '재발급 후 상세 조회',
        ticketVerified: true,
        status: 'PENDING',
        ticketPrice: 22000,
        createdAt: '2026-05-01T09:00:00Z',
      }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    if (url === '/api/auth/reissue') {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    throw new Error(`Unexpected request: ${url}`);
  });

  const party = await fetchPartyById(12);

  assert.equal(party.id, 12);
  assert.equal(party.cheeringSide, 'HOME');
  assert.deepEqual(requestedUrls, [
    'GET /api/parties/12',
    'POST /api/auth/reissue',
    'GET /api/parties/12',
  ]);
});

test('fetchPartyReviews는 401 발생 시 reissue 후 리뷰를 다시 조회한다', async (t) => {
  const requestedUrls: string[] = [];
  let reviewAttempts = 0;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = resolveRequestUrl(input);
    requestedUrls.push(`${init?.method ?? 'GET'} ${url}`);

    if (url === '/api/reviews/party/12') {
      reviewAttempts += 1;
      if (reviewAttempts === 1) {
        return new Response(JSON.stringify({ code: 'TOKEN_EXPIRED', message: 'Unauthorized' }), {
          headers: { 'content-type': 'application/json' },
          status: 401,
        });
      }

      return new Response(JSON.stringify([{
        id: 2,
        partyId: 12,
        rating: 5,
        reviewerHandle: '@reviewer',
        revieweeHandle: '@host',
        comment: '좋은 직관 메이트였습니다.',
        createdAt: '2026-05-02T10:00:00Z',
      }]), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    if (url === '/api/auth/reissue') {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    throw new Error(`Unexpected request: ${url}`);
  });

  const reviews = await fetchPartyReviews(12);

  assert.equal(reviews.length, 1);
  assert.equal(reviews[0]?.partyId, 12);
  assert.deepEqual(requestedUrls, [
    'GET /api/reviews/party/12',
    'POST /api/auth/reissue',
    'GET /api/reviews/party/12',
  ]);
});
