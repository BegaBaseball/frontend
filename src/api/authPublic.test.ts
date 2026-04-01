import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getSocialLoginUrl,
  loginUser,
  confirmPasswordReset,
  consumeOAuth2State,
  requestPasswordReset,
  signupUser,
} from './authPublic';

test('loginUser는 공개 로그인 경로 응답을 정규화한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    success: true,
    data: {
      id: '15',
      name: 'Slugger',
      role: 'ROLE_USER',
      handle: 'slugger',
      cheerPoints: '7',
    },
  }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }));

  const response = await loginUser({
    email: 'slugger@example.com',
    password: 'Test1234!',
  });

  assert.deepEqual(response, {
    success: true,
    message: null,
    data: {
      id: 15,
      name: 'Slugger',
      role: 'ROLE_USER',
      handle: 'slugger',
      cheerPoints: 7,
    },
  });
});

test('signupUser는 공개 정책 조회 뒤 회원가입 요청을 보낸다', async (t) => {
  const urls: string[] = [];
  const bodies: string[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    urls.push(url);

    if (url.includes('/auth/policies/required')) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          policies: [
            { policyType: 'TERMS', version: '2026-02-26', required: true },
            { policyType: 'PRIVACY', version: '2026-02-26', required: true },
          ],
        },
      }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    bodies.push(String(init?.body ?? ''));
    return new Response(JSON.stringify({
      success: true,
      message: '회원가입이 완료되었습니다.',
    }), {
      headers: { 'content-type': 'application/json' },
      status: 201,
    });
  });

  const response = await signupUser({
    name: '테스트유저',
    handle: '@tester',
    email: 'tester@example.com',
    password: 'Test1234!',
    confirmPassword: 'Test1234!',
    favoriteTeam: 'LG 트윈스',
  });

  assert.equal(response.success, true);
  assert.ok(urls.some((url) => /\/api\/auth\/policies\/required$/.test(url)));
  assert.ok(urls.some((url) => /\/api\/auth\/signup$/.test(url)));
  assert.ok(bodies.some((body) => body.includes('"policyType":"TERMS"')));
  assert.ok(bodies.some((body) => body.includes('"policyType":"PRIVACY"')));
});

test('requestPasswordReset는 redirect를 포함한 공개 reset request 경로를 호출한다', async (t) => {
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
      message: '비밀번호 재설정 메일을 전송했습니다.',
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await requestPasswordReset('reset-user@example.com', '/mypage');

  assert.equal(response.success, true);
  assert.match(requestUrl, /\/api\/auth\/password\/reset\/request$/);
  assert.equal(requestInit?.method, 'POST');
  assert.equal(
    requestInit?.body,
    JSON.stringify({ email: 'reset-user@example.com', redirect: '/mypage' }),
  );
});

test('confirmPasswordReset는 공개 reset confirm 경로를 호출한다', async (t) => {
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
      message: '비밀번호가 변경되었습니다.',
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await confirmPasswordReset('reset-token', 'Reset1234!', 'Reset1234!');

  assert.equal(response.success, true);
  assert.match(requestUrl, /\/api\/auth\/password\/reset\/confirm$/);
  assert.equal(requestInit?.method, 'POST');
  assert.equal(
    requestInit?.body,
    JSON.stringify({
      token: 'reset-token',
      newPassword: 'Reset1234!',
      confirmPassword: 'Reset1234!',
    }),
  );
});

test('consumeOAuth2State는 공개 oauth state consume 경로를 호출한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return new Response(JSON.stringify({
      email: 'slugger@example.com',
      name: 'Slugger',
      role: 'ROLE_USER',
      profileImageUrl: null,
      favoriteTeam: 'LG',
      handle: 'slugger',
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await consumeOAuth2State('state-success');

  assert.equal(response.handle, 'slugger');
  assert.match(requestUrl, /\/api\/auth\/oauth2\/state\/state-success$/);
});

test('getSocialLoginUrl는 provider와 link params를 유지한다', () => {
  assert.match(getSocialLoginUrl('google'), /\/oauth2\/authorization\/google$/);
  assert.match(
    getSocialLoginUrl('kakao', { mode: 'link', linkToken: 'abc123' }),
    /\/oauth2\/authorization\/kakao\?mode=link&linkToken=abc123$/,
  );
});
