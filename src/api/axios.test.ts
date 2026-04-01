import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';

import api from './axios';

type AxiosResponseRejectedHandler = (error: unknown) => Promise<unknown>;

const getResponseRejectedHandler = (): AxiosResponseRejectedHandler => {
  const handlers = (
    api.interceptors.response as unknown as {
      handlers?: Array<{ rejected?: AxiosResponseRejectedHandler }>;
    }
  ).handlers;

  const rejectedHandler = handlers?.findLast((handler) => typeof handler.rejected === 'function')?.rejected;
  if (!rejectedHandler) {
    throw new Error('Axios response rejected handler is not registered.');
  }

  return rejectedHandler;
};

test('skipAuthSessionHandling=true 인 401은 reissue/retry 없이 바로 종료한다', async (t) => {
  const rejectedHandler = getResponseRejectedHandler();
  const postSpy = t.mock.method(axios, 'post', async () => {
    throw new Error('reissue should not run');
  });

  const originalWindow = globalThis.window;
  globalThis.window = {
    dispatchEvent: () => true,
  } as Window;

  try {
    const error = {
      config: {
        url: '/auth/mypage',
        method: 'get',
        skipAuthSessionHandling: true,
        skipGlobalErrorHandler: true,
        _retry: false,
      },
      response: {
        status: 401,
        data: {
          code: 'REFRESH_TOKEN_MISSING',
        },
      },
      message: 'Request failed with status code 401',
    };

    await assert.rejects(() => rejectedHandler(error), (caught) => {
      assert.equal(caught, error);
      return true;
    });

    assert.equal(postSpy.mock.calls.length, 0);
  } finally {
    globalThis.window = originalWindow;
  }
});
