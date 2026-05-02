import assert from 'node:assert/strict';
import test from 'node:test';

import { changePassword, checkNicknameAvailability, uploadProfileImage } from './profile';

const buildJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });

const installImageTestDoubles = (t: test.TestContext) => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class MockImage {
      naturalWidth = 640;
      naturalHeight = 640;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  });
  t.mock.method(URL, 'createObjectURL', () => 'blob:mock-profile');
  t.mock.method(URL, 'revokeObjectURL', () => {});
  t.after(() => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { Image?: unknown }).Image;
  });
};

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

test('uploadProfileImage는 multipart 요청을 보내고 storagePath를 반환한다', async (t) => {
  installImageTestDoubles(t);
  const requestUrls: string[] = [];
  const requestInits: RequestInit[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestUrls.push(requestUrl);
    requestInits.push(init ?? {});

    if (requestUrl.endsWith('/api/media/uploads/init')) {
      return buildJsonResponse({
        success: true,
        data: {
          assetId: 31,
          uploadUrl: 'https://object.example.com/upload/profile-31',
          stagingObjectKey: 'media/staging/profile/1/31-avatar.png',
          expiresAt: '2026-04-13T00:00:00Z',
          requiredHeaders: {
            'Content-Type': 'image/png',
          },
        },
      });
    }

    if (requestUrl === 'https://object.example.com/upload/profile-31') {
      return new Response(null, { status: 200 });
    }

    if (requestUrl.endsWith('/api/media/uploads/31/finalize')) {
      return buildJsonResponse({
        success: true,
        data: {
          assetId: 31,
          storagePath: 'media/profile/1/31.webp',
          publicUrl: 'https://cdn.example.com/media/profile/1/31.webp',
        },
      });
    }

    throw new Error(`Unexpected request: ${requestUrl}`);
  });

  const file = new File(['stub'], 'avatar.png', { type: 'image/png' });
  const response = await uploadProfileImage(file);

  assert.deepEqual(requestUrls, [
    '/api/media/uploads/init',
    'https://object.example.com/upload/profile-31',
    '/api/media/uploads/31/finalize',
  ]);
  assert.equal(requestInits[0]?.method, 'POST');
  assert.equal(requestInits[1]?.method, 'PUT');
  assert.equal((requestInits[1]?.headers as Record<string, string>)['Content-Type'], 'image/png');
  assert.equal(requestInits[2]?.method, 'POST');
  assert.equal(response.storagePath, 'media/profile/1/31.webp');
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
