import test from 'node:test';
import assert from 'node:assert/strict';
import api from './axios';
import {
  consumeOAuth2State,
  getLinkToken,
  getSocialLoginUrl,
  requestPasswordReset,
} from './auth';
import { SERVER_BASE_URL } from '../constants/config';

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
