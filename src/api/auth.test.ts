import assert from 'node:assert/strict';
import test from 'node:test';

import api from './axios';
import { fetchCurrentUserProfile } from './auth';

test('fetchCurrentUserProfile는 부트스트랩용 인증 예외 플래그를 전달한다', async (t) => {
  const getSpy = t.mock.method(
    api,
    'get',
    async () => ({
      data: {
        data: {
          id: 42,
          email: 'active.user@example.com',
        },
      },
    }) as never,
  );

  const profile = await fetchCurrentUserProfile();

  assert.equal(profile.email, 'active.user@example.com');
  assert.equal(getSpy.mock.calls.length, 1);
  assert.equal(getSpy.mock.calls[0].arguments[0], '/auth/mypage');
  const requestConfig = getSpy.mock.calls[0].arguments[1] as Record<string, unknown>;
  assert.equal(requestConfig.skipGlobalErrorHandler, true);
  assert.equal(requestConfig.skipAuthSessionHandling, true);
});
