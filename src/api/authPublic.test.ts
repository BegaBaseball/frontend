import assert from 'node:assert/strict';
import test from 'node:test';

import {
  checkSignUpHandleAvailability,
  getSocialLoginUrl,
  loginUser,
  confirmPasswordReset,
  consumeOAuth2State,
  requestPasswordReset,
  SignUpSubmissionError,
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

test('loginUser는 느린 인증 처리를 위해 로그인 전용 타임아웃을 사용한다', async (t) => {
  const originalSetTimeout = globalThis.setTimeout;
  const timeoutDelays: number[] = [];

  t.mock.method(globalThis, 'setTimeout', ((callback: TimerHandler, timeout?: number, ...args: unknown[]) => {
    timeoutDelays.push(Number(timeout));
    return originalSetTimeout(callback, timeout, ...args);
  }) as typeof globalThis.setTimeout);

  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    success: true,
    data: {
      id: '15',
      name: 'Slugger',
      role: 'ROLE_USER',
    },
  }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }));

  await loginUser({
    email: 'slugger@example.com',
    password: 'Test1234!',
  });

  assert.equal(timeoutDelays[0], 20_000);
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

test('checkSignUpHandleAvailability는 성공 응답의 handle 사용 가능 결과를 반환한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    success: true,
    data: {
      available: true,
      normalized: '@slugger',
    },
  }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }));

  const response = await checkSignUpHandleAvailability('@Slugger');

  assert.deepEqual(response, {
    available: true,
    normalized: '@slugger',
  });
});

// [Security Fix - Critical #3] /auth/check-email 엔드포인트 제거에 따라 관련 단위 테스트 제거.
// 이메일 중복 여부는 signupUser 요청의 DUPLICATE_EMAIL 응답 경로로만 검증된다.

test('signupUser는 최종 handle 충돌을 SignUpSubmissionError로 변환한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

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

    return new Response(JSON.stringify({
      success: false,
      code: 'HANDLE_UNAVAILABLE',
      message: '이미 사용 중인 아이디(@handle)입니다.',
      data: {
        handle: '@slugger',
      },
    }), {
      headers: { 'content-type': 'application/json' },
      status: 409,
    });
  });

  try {
    await signupUser({
      name: '테스트유저',
      handle: '@Slugger',
      email: 'tester@example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      favoriteTeam: 'LG 트윈스',
    });
    assert.fail('expected signupUser to throw');
  } catch (error) {
    assert.ok(error instanceof SignUpSubmissionError);
    assert.equal(error.field, 'handle');
    assert.equal(error.normalized, '@slugger');
    assert.equal(error.message, '이미 사용 중인 아이디(@handle)입니다.');
  }
});

test('signupUser는 최종 email 충돌을 SignUpSubmissionError로 변환한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

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

    return new Response(JSON.stringify({
      success: false,
      code: 'DUPLICATE_EMAIL',
      message: '이미 사용 중인 이메일입니다.',
      data: {
        email: 'taken@example.com',
      },
    }), {
      headers: { 'content-type': 'application/json' },
      status: 409,
    });
  });

  try {
    await signupUser({
      name: '테스트유저',
      handle: '@tester',
      email: 'Taken@Example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      favoriteTeam: 'LG 트윈스',
    });
    assert.fail('expected signupUser to throw');
  } catch (error) {
    assert.ok(error instanceof SignUpSubmissionError);
    assert.equal(error.field, 'email');
    assert.equal(error.normalized, 'taken@example.com');
    assert.equal(error.message, '이미 사용 중인 이메일입니다.');
  }
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
      email: 'oauth@example.com',
      name: 'OAuth User',
      role: 'ROLE_USER',
      profileImageUrl: null,
      favoriteTeam: null,
      handle: null,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await consumeOAuth2State('oauth-state-id');

  assert.equal(requestUrl.endsWith('/api/auth/oauth2/state/oauth-state-id'), true);
  assert.equal(response.email, 'oauth@example.com');
  assert.equal(response.name, 'OAuth User');
});

test('getSocialLoginUrl는 provider와 link params를 유지한다', () => {
  const url = getSocialLoginUrl('google', { mode: 'link', linkToken: 'test-link-token' });
  assert.equal(url.includes('/oauth2/authorization/google'), true);
  assert.equal(url.includes('mode=link'), true);
  assert.equal(url.includes('linkToken=test-link-token'), true);
});
