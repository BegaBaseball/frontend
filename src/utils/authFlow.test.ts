import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACCOUNT_SETTINGS_REDIRECT_PATH,
  AUTH_SESSION_NOT_ESTABLISHED_ERROR_CODE,
  buildAuthSessionFailureLoginPath,
  OAUTH2_AUTH_FAILED_ERROR_CODE,
  OAUTH2_INVALID_REQUEST_ERROR_CODE,
  resolveLoginCompletionPath,
  resolveLoginSuccessPath,
  resolveOAuthCompletionPath,
  resolveOAuthErrorCode,
  resolveOAuthSuccessPath,
} from './authFlow';

test('buildAuthSessionFailureLoginPath는 세션 미확립 오류와 redirect를 함께 유지한다', () => {
  assert.equal(
    buildAuthSessionFailureLoginPath('/mypage?view=accountSettings'),
    `/login?redirect=%2Fmypage%3Fview%3DaccountSettings&error=${AUTH_SESSION_NOT_ESTABLISHED_ERROR_CODE}`,
  );
});

test('resolveLoginSuccessPath는 기존 post-login redirect 규칙을 유지한다', () => {
  assert.equal(resolveLoginSuccessPath('/mypage', '/stadium'), '/mypage');
  assert.equal(resolveLoginSuccessPath(null, '/stadium'), '/stadium');
});

test('resolveLoginCompletionPath는 세션 미성립 시 성공 redirect 대신 로그인 오류 경로를 반환한다', () => {
  assert.equal(
    resolveLoginCompletionPath({
      didAuthenticate: false,
      queryRedirect: '/mypage',
      pendingRedirect: '/stadium',
    }),
    `/login?redirect=%2Fmypage&error=${AUTH_SESSION_NOT_ESTABLISHED_ERROR_CODE}`,
  );
});

test('resolveOAuthSuccessPath는 linked status면 account settings로 고정 복귀한다', () => {
  assert.equal(
    resolveOAuthSuccessPath({
      status: 'linked',
      pendingRedirect: '/cheer',
      handle: 'slugger',
    }),
    ACCOUNT_SETTINGS_REDIRECT_PATH,
  );
});

test('resolveOAuthSuccessPath는 일반 로그인에서 handle fallback을 사용한다', () => {
  assert.equal(
    resolveOAuthSuccessPath({
      status: null,
      pendingRedirect: null,
      handle: 'slugger',
    }),
    '/mypage/@slugger',
  );
});

test('resolveOAuthCompletionPath는 세션 미성립 시 로그인 오류 경로를 반환한다', () => {
  assert.equal(
    resolveOAuthCompletionPath({
      didAuthenticate: false,
      status: 'linked',
      pendingRedirect: '/mypage?view=accountSettings',
      handle: 'slugger',
    }),
    `/login?redirect=%2Fmypage%3Fview%3DaccountSettings&error=${AUTH_SESSION_NOT_ESTABLISHED_ERROR_CODE}`,
  );
});

test('resolveOAuthErrorCode는 state 미존재를 invalid request로 매핑한다', () => {
  assert.equal(resolveOAuthErrorCode('OAUTH2_STATE_NOT_FOUND'), OAUTH2_INVALID_REQUEST_ERROR_CODE);
  assert.equal(resolveOAuthErrorCode('SOMETHING_ELSE'), OAUTH2_AUTH_FAILED_ERROR_CODE);
  assert.equal(resolveOAuthErrorCode(undefined), OAUTH2_AUTH_FAILED_ERROR_CODE);
});
