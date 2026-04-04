import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fetchAdminClientErrorDashboard,
  fetchAdminClientErrorEventDetail,
  fetchAdminClientErrorEvents,
} from './admin';

const buildJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });

test('fetchAdminClientErrorDashboard는 대시보드 응답을 언랩한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildJsonResponse({
    success: true,
    data: {
      from: '2026-03-13T00:00:00Z',
      to: '2026-03-14T00:00:00Z',
      granularity: 'hour',
      totals: {
        api: 4,
        runtime: 2,
        feedback: 1,
        uniqueFingerprints: 3,
        affectedRoutes: 2,
      },
      timeSeries: [],
      topFingerprints: [],
      recentFeedback: [],
      recentAlerts: [
        {
          id: 1,
          fingerprint: 'fp-runtime',
          bucket: 'runtime',
          source: 'runtime',
          channel: 'telegram',
          route: '/mypage',
          statusGroup: 'none',
          observedCount: 3,
          thresholdCount: 3,
          windowMinutes: 5,
          latestEventId: 'evt-1',
          latestMessage: 'render failed',
          latestOccurredAt: '2026-03-13T11:00:00Z',
          notifiedAt: '2026-03-13T11:01:00Z',
          deliveryStatus: 'SENT',
          failureReason: null,
        },
      ],
    },
  }));

  const response = await fetchAdminClientErrorDashboard();

  assert.equal(response.totals.api, 4);
  assert.equal(response.granularity, 'hour');
  assert.equal(response.recentAlerts[0]?.channel, 'telegram');
});

test('fetchAdminClientErrorDashboard는 technical 5xx를 친화형 메시지로 sanitize한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildJsonResponse({}, 500));

  await assert.rejects(
    () => fetchAdminClientErrorDashboard(),
    {
      message: '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.',
    },
  );
});

test('fetchAdminClientErrorEvents는 페이지 응답을 언랩한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildJsonResponse({
    success: true,
    data: {
      content: [
        {
          eventId: 'evt-1',
          bucket: 'runtime',
          source: 'runtime',
          message: 'render failed',
          statusCode: null,
          statusGroup: 'none',
          responseCode: null,
          route: '/mypage',
          normalizedRoute: '/mypage',
          method: null,
          endpoint: null,
          normalizedEndpoint: null,
          fingerprint: 'fp-1',
          occurredAt: '2026-03-13T11:00:00Z',
          sessionId: 'session-1',
          userId: 99,
          feedbackCount: 1,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
      last: true,
    },
  }));

  const response = await fetchAdminClientErrorEvents({ bucket: 'runtime' });

  assert.equal(response.content[0]?.eventId, 'evt-1');
  assert.equal(response.totalElements, 1);
});

test('fetchAdminClientErrorEventDetail은 상세 응답을 언랩한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildJsonResponse({
    success: true,
    data: {
      event: {
        eventId: 'evt-1',
        bucket: 'api',
        source: 'api',
        message: 'request failed',
        statusCode: 500,
        statusGroup: '5xx',
        responseCode: 'INTERNAL_SERVER_ERROR',
        route: '/prediction',
        normalizedRoute: '/prediction',
        method: 'GET',
        endpoint: '/api/predictions',
        normalizedEndpoint: '/api/predictions',
        fingerprint: 'fp-api',
        occurredAt: '2026-03-13T11:00:00Z',
        sessionId: 'session-1',
        userId: 7,
        feedbackCount: 2,
      },
      stack: 'stack',
      componentStack: 'componentStack',
      feedback: [],
      sameFingerprintRecentEvents: [],
    },
  }));

  const response = await fetchAdminClientErrorEventDetail('evt-1');

  assert.equal(response.event.eventId, 'evt-1');
  assert.equal(response.stack, 'stack');
});
