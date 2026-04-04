import assert from 'node:assert/strict';
import test from 'node:test';

import {
  notificationApi,
  resetNotificationApiStateForTests,
} from './notificationApi';

const notificationFixture = [
  {
    id: 1,
    type: 'POST_COMMENT' as const,
    title: '댓글',
    message: '새 댓글이 달렸습니다.',
    relatedId: 99,
    isRead: false,
    createdAt: '2026-04-03T10:00:00.000Z',
  },
];

test('notificationApi.getNotifications falls back to SERVER_BASE_URL when same-origin endpoint returns 404', async (t) => {
  resetNotificationApiStateForTests();
  const requestUrls: string[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestUrls.push(url);

    if (url === '/api/notifications/my') {
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        headers: { 'content-type': 'application/json' },
        status: 404,
      });
    }

    if (url === 'http://localhost:8080/api/notifications/my') {
      return new Response(JSON.stringify(notificationFixture), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    throw new Error(`Unexpected url: ${url}`);
  });

  const notifications = await notificationApi.getNotifications();

  assert.deepEqual(notifications, notificationFixture);
  assert.deepEqual(requestUrls, [
    '/api/notifications/my',
    'http://localhost:8080/api/notifications/my',
  ]);
});

test('notificationApi.getUnreadCount caches auth failure and short-circuits later reads', async (t) => {
  resetNotificationApiStateForTests();
  const requestUrls: string[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestUrls.push(url);

    if (url === '/api/auth/reissue') {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        headers: { 'content-type': 'application/json' },
        status: 401,
      });
    }

    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      headers: { 'content-type': 'application/json' },
      status: 401,
    });
  });

  const firstCount = await notificationApi.getUnreadCount();
  const secondCount = await notificationApi.getUnreadCount();

  assert.equal(firstCount, 0);
  assert.equal(secondCount, 0);
  assert.deepEqual(requestUrls, [
    '/api/notifications/my/unread-count',
    '/api/auth/reissue',
  ]);
});

test('notificationApi markAsRead and deleteNotification use same-origin private fetch endpoints', async (t) => {
  resetNotificationApiStateForTests();
  const requests: Array<{ url: string; method: string | undefined; credentials: RequestCredentials | undefined }> = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requests.push({
      url,
      method: init?.method,
      credentials: init?.credentials,
    });

    return new Response(null, { status: 204 });
  });

  await notificationApi.markAsRead(7);
  await notificationApi.deleteNotification(7);

  assert.deepEqual(requests, [
    { url: '/api/notifications/7/read', method: 'POST', credentials: 'include' },
    { url: '/api/notifications/7', method: 'DELETE', credentials: 'include' },
  ]);
});
