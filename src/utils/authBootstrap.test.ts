import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearPersistedAuthBootstrapState,
  getPersistedAuthBootstrapMeta,
  hasPersistedAuthBootstrapHint,
  markPersistedAuthBootstrapFailure,
  markPersistedAuthBootstrapSuccess,
  normalizeAuthBootstrapPathname,
  resolveAuthBootstrapMode,
  shouldHoldAuthUiDuringBootstrap,
  setPersistedAuthBootstrapMeta,
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

const setWindowLocalStorage = (localStorage: ReturnType<typeof createStorage>) => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      localStorage,
    } as Window & { localStorage: typeof localStorage },
  });
};

test('normalizeAuthBootstrapPathname는 trailing slash를 제거한다', () => {
  assert.equal(normalizeAuthBootstrapPathname('/home/'), '/home');
  assert.equal(normalizeAuthBootstrapPathname('/'), '/');
});

test('persisted auth bootstrap hint를 저장하고 제거한다', () => {
  const localStorage = createStorage();
  setWindowLocalStorage(localStorage);

  assert.equal(hasPersistedAuthBootstrapHint(), false);

  setPersistedAuthBootstrapHint(true);
  assert.equal(hasPersistedAuthBootstrapHint(), true);

  setPersistedAuthBootstrapHint(false);
  assert.equal(hasPersistedAuthBootstrapHint(), false);
});

test('persisted auth bootstrap meta를 저장하고 제거한다', () => {
  const localStorage = createStorage();
  setWindowLocalStorage(localStorage);

  assert.equal(getPersistedAuthBootstrapMeta(), null);

  setPersistedAuthBootstrapMeta({
    version: 1,
    lastSuccessAt: 123,
    lastFailureAt: null,
  });

  assert.deepEqual(getPersistedAuthBootstrapMeta(), {
    version: 1,
    lastSuccessAt: 123,
    lastFailureAt: null,
  });

  clearPersistedAuthBootstrapState();
  assert.equal(getPersistedAuthBootstrapMeta(), null);
  assert.equal(hasPersistedAuthBootstrapHint(), false);
});

test('markPersistedAuthBootstrapSuccess는 hint와 fresh success meta를 함께 기록한다', () => {
  const localStorage = createStorage();
  setWindowLocalStorage(localStorage);

  markPersistedAuthBootstrapSuccess(10_000);

  assert.equal(hasPersistedAuthBootstrapHint(), true);
  assert.deepEqual(getPersistedAuthBootstrapMeta(), {
    version: 1,
    lastSuccessAt: 10_000,
    lastFailureAt: null,
  });
});

test('markPersistedAuthBootstrapFailure는 cooldown을 기록하고 필요 시 hint를 제거한다', () => {
  const localStorage = createStorage();
  setWindowLocalStorage(localStorage);

  markPersistedAuthBootstrapSuccess(5_000);
  markPersistedAuthBootstrapFailure({
    now: 7_000,
    clearHint: true,
    clearSuccess: true,
  });

  assert.equal(hasPersistedAuthBootstrapHint(), false);
  assert.deepEqual(getPersistedAuthBootstrapMeta(), {
    version: 1,
    lastSuccessAt: null,
    lastFailureAt: 7_000,
  });
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
      now: 1_000,
    }),
    'defer',
  );
});

test('persisted auth hint가 있으면 prediction에서도 deferred revalidation을 유지한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/prediction', {
      isLoggedIn: false,
      hasPersistedAuthHint: true,
      now: 1_000,
    }),
    'defer',
  );
});

test('persisted auth hint가 있으면 루트에서 deferred revalidation을 유지한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/', {
      isLoggedIn: false,
      hasPersistedAuthHint: true,
      now: 1_000,
    }),
    'defer',
  );
});

test('fresh success meta가 있으면 hint 없이도 공개 경로에서 deferred revalidation을 유지한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/prediction', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
      authBootstrapMeta: {
        version: 1,
        lastSuccessAt: 10_000,
        lastFailureAt: null,
      },
      now: 20_000,
    }),
    'defer',
  );
});

test('stale success meta만 있으면 공개 경로는 public-home으로 남긴다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/prediction', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
      authBootstrapMeta: {
        version: 1,
        lastSuccessAt: 10_000,
        lastFailureAt: null,
      },
      now: 10_000 + 24 * 60 * 60 * 1000 + 1,
    }),
    'public-home',
  );
});

test('recent failure cooldown이 있으면 hint가 있어도 공개 경로는 public-home으로 남긴다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/home', {
      isLoggedIn: false,
      hasPersistedAuthHint: true,
      authBootstrapMeta: {
        version: 1,
        lastSuccessAt: 50_000,
        lastFailureAt: 99_000,
      },
      now: 100_000,
    }),
    'public-home',
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

test('공개 홈 deferred bootstrap 동안에는 익명 auth UI를 보류한다', () => {
  assert.equal(
    shouldHoldAuthUiDuringBootstrap('/home', {
      isLoggedIn: false,
      hasPersistedAuthHint: true,
      now: 1_000,
    }),
    true,
  );
});

test('bootstrap marker가 없으면 익명 auth UI를 그대로 렌더링한다', () => {
  assert.equal(
    shouldHoldAuthUiDuringBootstrap('/home', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
      now: 1_000,
    }),
    false,
  );
});

test('이미 로그인된 상태에서는 auth UI 보류가 필요하지 않다', () => {
  assert.equal(
    shouldHoldAuthUiDuringBootstrap('/home', {
      isLoggedIn: true,
      hasPersistedAuthHint: true,
      now: 1_000,
    }),
    false,
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
