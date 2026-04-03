import assert from 'node:assert/strict';
import test from 'node:test';

import { changePassword, checkNicknameAvailability } from './profile';

const buildJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });

test('changePassword는 성공 응답에서 예외 없이 종료한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return buildJsonResponse({ success: true });
  });

  await changePassword({
    currentPassword: 'current-password',
    newPassword: 'NewPassword1!',
    confirmPassword: 'NewPassword1!',
  });

  assert.match(requestUrl, /\/api\/auth\/password$/);
  assert.equal(requestInit?.method, 'PUT');
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(requestInit?.body, JSON.stringify({
    currentPassword: 'current-password',
    newPassword: 'NewPassword1!',
    confirmPassword: 'NewPassword1!',
  }));
});

test('changePassword는 401 응답을 현재 비밀번호 오류 메시지로 변환한다', async (t) => {
  const urls: string[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    urls.push(url);

    return buildJsonResponse({
      code: 'PASSWORD_MISMATCH',
      message: '현재 비밀번호가 일치하지 않습니다.',
    }, 401);
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

  assert.deepEqual(urls, ['/api/auth/password']);
});

test('checkNicknameAvailability는 성공 응답의 닉네임 사용 가능 결과를 반환한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return buildJsonResponse({
      success: true,
      data: {
        available: true,
        normalized: 'testuser',
      },
    });
  });

  const result = await checkNicknameAvailability('testuser');

  assert.deepEqual(result, {
    available: true,
    normalized: 'testuser',
  });
  assert.match(requestUrl, /\/api\/auth\/check-name\?name=testuser$/);
});

test('checkNicknameAvailability는 409 응답을 사용 불가 결과로 변환한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildJsonResponse({
    code: 'NAME_UNAVAILABLE',
    message: '이미 사용 중인 닉네임입니다.',
    data: {
      available: false,
      message: '이미 사용 중인 닉네임입니다.',
    },
  }, 409));

  const result = await checkNicknameAvailability('taken');

  assert.deepEqual(result, {
    available: false,
    message: '이미 사용 중인 닉네임입니다.',
  });
});

test('checkNicknameAvailability는 400 응답을 입력 오류 결과로 변환한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildJsonResponse({
    code: 'NAME_TOO_SHORT',
    message: '닉네임은 최소 2자 이상이어야 합니다.',
  }, 400));

  const result = await checkNicknameAvailability('a');

  assert.deepEqual(result, {
    available: false,
    message: '닉네임은 최소 2자 이상이어야 합니다.',
  });
});
