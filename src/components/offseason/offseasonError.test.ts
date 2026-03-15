import assert from 'node:assert/strict';
import test from 'node:test';
import { AxiosError } from 'axios';

import { normalizeOffseasonErrorMessage } from './offseasonError';

test('normalizeOffseasonErrorMessage는 500 technical error를 사용자 친화형 문구로 바꾼다', () => {
  const error = new AxiosError(
    'Request failed with status code 500',
    'ERR_BAD_RESPONSE',
    {} as never,
    undefined,
    {
      status: 500,
      statusText: 'Internal Server Error',
      data: {},
      headers: {},
      config: { headers: {} } as never,
    },
  );

  assert.equal(
    normalizeOffseasonErrorMessage(error),
    '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.',
  );
});

test('normalizeOffseasonErrorMessage는 네트워크 technical error를 사용자 친화형 문구로 바꾼다', () => {
  const error = new AxiosError('Network Error', 'ERR_NETWORK');

  assert.equal(
    normalizeOffseasonErrorMessage(error),
    '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.',
  );
});
