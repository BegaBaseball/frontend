import test from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError } from 'axios';
import api from './axios';
import { changePassword, checkNicknameAvailability } from './profile';

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

test('checkNicknameAvailability는 성공 응답의 닉네임 사용 가능 결과를 반환한다', async (t) => {
  t.mock.method(api, 'get', async () => ({
    data: {
      success: true,
      data: {
        available: true,
        normalized: 'testuser',
      },
    },
  }) as never);

  const result = await checkNicknameAvailability('testuser');

  assert.deepEqual(result, {
    available: true,
    normalized: 'testuser',
  });
});

test('checkNicknameAvailability는 409 응답을 사용 불가 결과로 변환한다', async (t) => {
  const conflictError = new AxiosError(
    'Conflict',
    'ERR_BAD_REQUEST',
    { skipGlobalErrorHandler: true } as never,
    undefined,
    {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: {} as never,
      data: {
        code: 'NAME_UNAVAILABLE',
        message: '이미 사용 중인 닉네임입니다.',
      },
    },
  );
  t.mock.method(api, 'get', async () => {
    throw conflictError;
  });

  const result = await checkNicknameAvailability('taken');

  assert.deepEqual(result, {
    available: false,
    message: '이미 사용 중인 닉네임입니다.',
  });
});

test('checkNicknameAvailability는 400 응답을 입력 오류 결과로 변환한다', async (t) => {
  const badRequestError = new AxiosError(
    'Bad Request',
    'ERR_BAD_REQUEST',
    { skipGlobalErrorHandler: true } as never,
    undefined,
    {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
      data: {
        code: 'NAME_TOO_SHORT',
        message: '닉네임은 최소 2자 이상이어야 합니다.',
      },
    },
  );
  t.mock.method(api, 'get', async () => {
    throw badRequestError;
  });

  const result = await checkNicknameAvailability('a');

  assert.deepEqual(result, {
    available: false,
    message: '닉네임은 최소 2자 이상이어야 합니다.',
  });
});
