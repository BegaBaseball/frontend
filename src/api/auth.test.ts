import test from 'node:test';
import assert from 'node:assert/strict';
import api from './axios';
import {
  consumeOAuth2State,
  getLinkToken,
  getSocialLoginUrl,
  requestPasswordReset,
  signupUser,
} from './auth';
import { SERVER_BASE_URL } from '../constants/config';
import { AxiosError } from 'axios';

test('getSocialLoginUrl은 provider 기본 로그인 URL을 생성한다', () => {
  assert.equal(
    getSocialLoginUrl('google'),
    `${SERVER_BASE_URL}/oauth2/authorization/google`,
  );
});

test('getSocialLoginUrl은 계정 연동 query string을 포함한다', () => {
  assert.equal(
    getSocialLoginUrl('kakao', { mode: 'link', linkToken: 'link-token-123' }),
    `${SERVER_BASE_URL}/oauth2/authorization/kakao?mode=link&linkToken=link-token-123`,
  );
});

test('getLinkToken은 서버 응답을 그대로 반환한다', async (t) => {
  t.mock.method(api, 'get', async () => ({
    data: {
      linkToken: 'link-token-123',
      expiresIn: 300,
    },
  }) as never);

  const response = await getLinkToken();

  assert.deepEqual(response, {
    linkToken: 'link-token-123',
    expiresIn: 300,
  });
});

test('getLinkToken은 API 에러 메시지를 래핑한다', async (t) => {
  t.mock.method(api, 'get', async () => {
    throw {
      status: 401,
      data: { message: '연동 토큰이 만료되었습니다.' },
      message: 'Unauthorized',
    };
  });

  await assert.rejects(
    () => getLinkToken(),
    {
      message: '연동 토큰이 만료되었습니다.',
    },
  );
});

test('requestPasswordReset은 서버의 generic 성공 메시지를 그대로 반환한다', async (t) => {
  let capturedPayload: unknown;

  t.mock.method(api, 'post', async (_url, payload) => {
    capturedPayload = payload;
    return ({
      data: {
        success: true,
        message: '입력한 이메일로 가입된 계정이 있다면 비밀번호 재설정 안내를 발송했습니다.',
      },
    }) as never;
  });

  const response = await requestPasswordReset('user@example.com', '/mypage?view=accountSettings');

  assert.deepEqual(capturedPayload, {
    email: 'user@example.com',
    redirect: '/mypage?view=accountSettings',
  });
  assert.deepEqual(response, {
    success: true,
    message: '입력한 이메일로 가입된 계정이 있다면 비밀번호 재설정 안내를 발송했습니다.',
  });
});

test('requestPasswordReset은 안전하지 않은 redirect를 payload에서 제거한다', async (t) => {
  let capturedPayload: unknown;

  t.mock.method(api, 'post', async (_url, payload) => {
    capturedPayload = payload;
    return ({
      data: {
        success: true,
        message: '입력한 이메일로 가입된 계정이 있다면 비밀번호 재설정 안내를 발송했습니다.',
      },
    }) as never;
  });

  const response = await requestPasswordReset('user@example.com', 'https://evil.example');

  assert.deepEqual(capturedPayload, {
    email: 'user@example.com',
  });
  assert.deepEqual(response, {
    success: true,
    message: '입력한 이메일로 가입된 계정이 있다면 비밀번호 재설정 안내를 발송했습니다.',
  });
});

test('consumeOAuth2State는 state 소비 응답을 반환한다', async (t) => {
  t.mock.method(api, 'get', async () => ({
    data: {
      email: 'player@example.com',
      name: 'Slugger',
      role: 'ROLE_USER',
      profileImageUrl: null,
      favoriteTeam: 'LG',
      handle: 'slugger',
    },
  }) as never);

  const response = await consumeOAuth2State('state-success');

  assert.deepEqual(response, {
    email: 'player@example.com',
    name: 'Slugger',
    role: 'ROLE_USER',
    profileImageUrl: null,
    favoriteTeam: 'LG',
    handle: 'slugger',
  });
});

test('consumeOAuth2State는 실패 시 원본 오류를 그대로 전파한다', async (t) => {
  t.mock.method(api, 'get', async () => {
    throw new Error('state expired');
  });

  await assert.rejects(
    () => consumeOAuth2State('state-expired'),
    {
      message: 'state expired',
    },
  );
});

test('signupUser는 5xx technical error를 사용자 친화형 메시지로 sanitize한다', async (t) => {
  t.mock.method(api, 'post', async () => {
    throw new AxiosError(
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
  });

  await assert.rejects(
    () => signupUser({
      name: '테스트 유저',
      handle: 'signupuser',
      email: 'signup@example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      favoriteTeam: 'LG',
      policyConsents: [
        { policyType: 'TERMS', version: '2026-02-26', agreed: true },
      ],
    }),
    {
      message: '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.',
    },
  );
});

test('signupUser는 네트워크 technical error를 사용자 친화형 메시지로 sanitize한다', async (t) => {
  t.mock.method(api, 'post', async () => {
    throw new AxiosError('Network Error', 'ERR_NETWORK');
  });

  await assert.rejects(
    () => signupUser({
      name: '테스트 유저',
      handle: 'signupuser',
      email: 'signup@example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      favoriteTeam: 'LG',
      policyConsents: [
        { policyType: 'TERMS', version: '2026-02-26', agreed: true },
      ],
    }),
    {
      message: '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.',
    },
  );
});

test('signupUser는 정책 조회 timeout을 단계별 메시지로 바꾼다', async (t) => {
  t.mock.method(api, 'get', async () => {
    throw new AxiosError('timeout of 10000ms exceeded', 'ECONNABORTED');
  });

  await assert.rejects(
    () => signupUser({
      name: '테스트 유저',
      handle: 'signupuser',
      email: 'signup@example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      favoriteTeam: 'LG',
    }),
    {
      message: '필수 정책 정보를 불러오는 중 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
    },
  );
});

test('signupUser는 가입 제출 timeout을 단계별 메시지로 바꾸고 긴 timeout을 사용한다', async (t) => {
  let capturedOptions: unknown;

  t.mock.method(api, 'post', async (_url, _payload, options) => {
    capturedOptions = options;
    throw new AxiosError('timeout of 20000ms exceeded', 'ECONNABORTED');
  });

  await assert.rejects(
    () => signupUser({
      name: '테스트 유저',
      handle: 'signupuser',
      email: 'signup@example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      favoriteTeam: 'LG',
      policyConsents: [
        { policyType: 'TERMS', version: '2026-02-26', agreed: true },
      ],
    }),
    {
      message: '회원가입 요청 처리에 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해주세요. 같은 이메일이 이미 가입되었는지도 확인해주세요.',
    },
  );

  assert.deepEqual(capturedOptions, {
    skipGlobalErrorHandler: true,
    timeout: 20_000,
  });
});
