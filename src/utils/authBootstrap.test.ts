import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hasPersistedAuthBootstrapHint,
  normalizeAuthBootstrapPathname,
  resolveAuthBootstrapMode,
  setPersistedAuthBootstrapHint,
} from './authBootstrap';

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

test('normalizeAuthBootstrapPathname는 trailing slash를 제거한다', () => {
  assert.equal(normalizeAuthBootstrapPathname('/home/'), '/home');
  assert.equal(normalizeAuthBootstrapPathname('/'), '/');
});

test('persisted auth bootstrap hint를 저장하고 제거한다', () => {
  const localStorage = createStorage();
  (globalThis as typeof globalThis & { window?: Window & { localStorage: typeof localStorage } }).window = {
    localStorage,
  } as Window & { localStorage: typeof localStorage };

  assert.equal(hasPersistedAuthBootstrapHint(), false);

  setPersistedAuthBootstrapHint(true);
  assert.equal(hasPersistedAuthBootstrapHint(), true);

  setPersistedAuthBootstrapHint(false);
  assert.equal(hasPersistedAuthBootstrapHint(), false);
});

test('익명 홈 진입은 persisted auth hint가 없으면 공개 홈 모드로 남긴다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/home', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
    }),
    'public-home',
  );
});

test('익명 prediction 진입은 persisted auth hint가 없으면 공개 홈 모드로 남긴다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/prediction', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
    }),
    'public-home',
  );
});

test('익명 루트 진입은 persisted auth hint가 없으면 공개 홈 모드로 남긴다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
    }),
    'public-home',
  );
});

test('persisted auth hint가 있으면 홈에서 deferred revalidation을 유지한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/home', {
      isLoggedIn: false,
      hasPersistedAuthHint: true,
    }),
    'defer',
  );
});

test('persisted auth hint가 있으면 prediction에서도 deferred revalidation을 유지한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/prediction', {
      isLoggedIn: false,
      hasPersistedAuthHint: true,
    }),
    'defer',
  );
});

test('persisted auth hint가 있으면 루트에서 deferred revalidation을 유지한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/', {
      isLoggedIn: false,
      hasPersistedAuthHint: true,
    }),
    'defer',
  );
});

test('로그인 상태 prediction 진입은 persisted auth hint와 무관하게 deferred revalidation을 유지한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/prediction', {
      isLoggedIn: true,
      hasPersistedAuthHint: false,
    }),
    'defer',
  );
});

test('로그인 상태 홈 진입은 persisted auth hint와 무관하게 deferred revalidation을 유지한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/home', {
      isLoggedIn: true,
      hasPersistedAuthHint: false,
    }),
    'defer',
  );
});

test('보호 라우트를 포함한 비홈 경로는 기존 즉시 인증 확인을 유지한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/mate/42', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
    }),
    'immediate',
  );
});
