import test from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError } from 'axios';
import api from './axios';
import { changePassword } from './profile';

test('changePassword는 성공 응답에서 예외 없이 종료한다', async (t) => {
  const putMock = t.mock.method(api, 'put', async () => ({
    data: { success: true },
  }) as never);

  await changePassword({
    currentPassword: 'current-password',
    newPassword: 'NewPassword1!',
    confirmPassword: 'NewPassword1!',
  });

  assert.equal(putMock.mock.callCount(), 1);
});

test('changePassword는 401 응답을 현재 비밀번호 오류 메시지로 변환한다', async (t) => {
  const unauthorizedError = new AxiosError(
    'Unauthorized',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {} as never,
      data: {},
    },
  );
  t.mock.method(api, 'put', async () => {
    throw unauthorizedError;
  });

  await assert.rejects(
    () =>
      changePassword({
        currentPassword: 'current-password',
        newPassword: 'NewPassword1!',
        confirmPassword: 'NewPassword1!',
      }),
    {
      message: '현재 비밀번호가 일치하지 않습니다.',
    },
  );
});
