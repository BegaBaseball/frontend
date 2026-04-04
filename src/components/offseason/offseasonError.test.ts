import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeOffseasonErrorMessage } from './offseasonError';

test('normalizeOffseasonErrorMessage는 500 technical error를 사용자 친화형 문구로 바꾼다', () => {
  const error = {
    code: 'ERR_BAD_RESPONSE',
    isAxiosError: true,
    message: 'Request failed with status code 500',
    name: 'AxiosError',
    response: {
      data: {},
      status: 500,
    },
  };

  assert.equal(
    normalizeOffseasonErrorMessage(error),
    '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.',
  );
});

test('normalizeOffseasonErrorMessage는 네트워크 technical error를 사용자 친화형 문구로 바꾼다', () => {
  const error = {
    code: 'ERR_NETWORK',
    isAxiosError: true,
    message: 'Network Error',
    name: 'AxiosError',
  };

  assert.equal(
    normalizeOffseasonErrorMessage(error),
    '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.',
  );
});
