import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAccountDeletionRecoveryInfo,
  requestAccountDeletionRecovery,
} from './accountDeletionRecoveryPublic';

test('getAccountDeletionRecoveryInfo는 공개 recovery 조회 경로를 호출한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(JSON.stringify({
      success: true,
      data: {
        scheduledFor: '2026-04-02T09:00:00',
      },
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await getAccountDeletionRecoveryInfo('recovery-token');

  assert.equal(response.scheduledFor, '2026-04-02T09:00:00');
  assert.match(requestUrl, /\/api\/auth\/account\/deletion\/recovery\?token=recovery-token$/);
  assert.equal(requestInit?.method, 'GET');
  assert.equal(requestInit?.credentials, 'include');
});

test('requestAccountDeletionRecovery는 공개 recovery 취소 경로를 json body로 호출한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(JSON.stringify({
      success: true,
      message: '계정 삭제 예약이 취소되었습니다.',
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  await requestAccountDeletionRecovery('recovery-token');

  assert.match(requestUrl, /\/api\/auth\/account\/deletion\/recovery$/);
  assert.equal(requestInit?.method, 'POST');
  assert.equal(requestInit?.body, JSON.stringify({ token: 'recovery-token' }));
  assert.deepEqual(requestInit?.headers, {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
});
