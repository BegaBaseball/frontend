import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLoginPath,
  buildLoginPathWithError,
  buildPasswordResetPath,
  buildSignUpPath,
  clearStoredLoginRedirect,
  getCurrentRelativeUrl,
  getStoredLoginRedirect,
  resolvePostLoginRedirect,
  sanitizeLoginRedirect,
  setStoredLoginRedirect,
} from './loginRedirect';

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
  };
};

test('sanitizeLoginRedirect는 안전한 상대 경로를 유지한다', () => {
  assert.equal(sanitizeLoginRedirect('/mate/123?tab=info#chat'), '/mate/123?tab=info#chat');
});

test('sanitizeLoginRedirect는 외부 URL과 금지 경로를 차단한다', () => {
  assert.equal(sanitizeLoginRedirect('https://example.com/steal'), null);
  assert.equal(sanitizeLoginRedirect('/login?redirect=/mypage'), null);
  assert.equal(sanitizeLoginRedirect('//evil.test/path'), null);
});

test('buildLoginPath는 redirect query를 포함한다', () => {
  assert.equal(buildLoginPath('/mypage'), '/login?redirect=%2Fmypage');
  assert.equal(buildLoginPath('/login'), '/login');
});

test('buildSignUpPath는 redirect query를 포함한다', () => {
  assert.equal(buildSignUpPath('/prediction?date=2026-03-12'), '/signup?redirect=%2Fprediction%3Fdate%3D2026-03-12');
  assert.equal(buildSignUpPath('/signup'), '/signup');
});

test('buildPasswordResetPath는 redirect query를 포함한다', () => {
  assert.equal(buildPasswordResetPath('/mypage'), '/password/reset?redirect=%2Fmypage');
  assert.equal(buildPasswordResetPath('/login'), '/password/reset');
});

test('buildLoginPathWithError는 error와 redirect query를 함께 구성한다', () => {
  assert.equal(
    buildLoginPathWithError('oauth2_auth_failed', '/mate/7/chat'),
    '/login?redirect=%2Fmate%2F7%2Fchat&error=oauth2_auth_failed',
  );
  assert.equal(
    buildLoginPathWithError('invalid_oauth2_request', '/login'),
    '/login?error=invalid_oauth2_request',
  );
});

test('redirect 저장/조회/삭제는 sessionStorage를 사용한다', () => {
  const sessionStorage = createStorage();
  (globalThis as typeof globalThis & { window?: Window & { sessionStorage: typeof sessionStorage } }).window = {
    location: {
      pathname: '/home',
      search: '',
      hash: '',
    },
    sessionStorage,
  } as unknown as Window & { sessionStorage: typeof sessionStorage };

  assert.equal(setStoredLoginRedirect('/mate/10'), '/mate/10');
  assert.equal(getStoredLoginRedirect(), '/mate/10');

  clearStoredLoginRedirect();
  assert.equal(getStoredLoginRedirect(), null);
});

test('resolvePostLoginRedirect는 query, storage, fallback 순으로 결정한다', () => {
  const sessionStorage = createStorage();
  (globalThis as typeof globalThis & { window?: Window & { sessionStorage: typeof sessionStorage } }).window = {
    location: {
      pathname: '/home',
      search: '',
      hash: '',
    },
    sessionStorage,
  } as unknown as Window & { sessionStorage: typeof sessionStorage };

  setStoredLoginRedirect('/prediction');

  assert.equal(resolvePostLoginRedirect('/mypage', '/stadium'), '/mypage');
  assert.equal(resolvePostLoginRedirect(null, '/stadium'), '/prediction');

  clearStoredLoginRedirect();
  assert.equal(resolvePostLoginRedirect(null, '/stadium'), '/stadium');
  assert.equal(resolvePostLoginRedirect('/login', null), '/home');
});

test('getCurrentRelativeUrl은 현재 location을 상대 경로로 정규화한다', () => {
  const sessionStorage = createStorage();
  (globalThis as typeof globalThis & { window?: Window & { sessionStorage: typeof sessionStorage } }).window = {
    location: {
      pathname: '/mate/42',
      search: '?tab=chat',
      hash: '#messages',
    },
    sessionStorage,
  } as unknown as Window & { sessionStorage: typeof sessionStorage };

  assert.equal(getCurrentRelativeUrl(), '/mate/42?tab=chat#messages');
});
