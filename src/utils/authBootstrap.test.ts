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
  shouldAttemptRootAuthBootstrap,
  shouldHoldAuthUiDuringBootstrap,
  shouldInitializeAuthLoading,
  shouldMountAuthBootstrapRuntime,
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

test('bootstrap을 생략하는 익명 prediction은 auth loading 없이 초기화한다', () => {
  assert.equal(
    shouldInitializeAuthLoading('/prediction', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
    }),
    false,
  );
});

test('보호 경로와 injected profile은 auth loading 상태로 초기화한다', () => {
  assert.equal(
    shouldInitializeAuthLoading('/mypage', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
    }),
    true,
  );
  assert.equal(
    shouldInitializeAuthLoading('/prediction', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
      hasInjectedAuthProfile: true,
    }),
    true,
  );
});

test('익명 mate 목록 진입은 persisted auth hint가 없으면 공개 홈 모드로 남긴다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/mate', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
    }),
    'public-home',
  );
});

test('익명 cheer 목록 진입은 persisted auth hint가 없으면 공개 홈 모드로 남긴다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/cheer', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
    }),
    'public-home',
  );
});

test('익명 cheer 상세 진입은 persisted auth hint가 없으면 공개 홈 모드로 남긴다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/cheer/123', {
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

test('persisted auth hint가 있으면 mate 목록에서도 deferred revalidation을 유지한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/mate', {
      isLoggedIn: false,
      hasPersistedAuthHint: true,
      now: 1_000,
    }),
    'defer',
  );
});

test('persisted auth hint가 있으면 cheer 목록에서도 deferred revalidation을 유지한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/cheer', {
      isLoggedIn: false,
      hasPersistedAuthHint: true,
      now: 1_000,
    }),
    'defer',
  );
});

test('persisted auth hint가 있으면 cheer 상세에서도 deferred revalidation을 유지한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/cheer/123', {
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

test('root auth-aware eligibility는 auth hint가 있으면 true를 반환한다', () => {
  assert.equal(
    shouldAttemptRootAuthBootstrap({
      hasPersistedAuthHint: true,
      now: 1_000,
    }),
    true,
  );
});

test('root auth-aware eligibility는 fresh success meta만 있어도 true를 반환한다', () => {
  assert.equal(
    shouldAttemptRootAuthBootstrap({
      hasPersistedAuthHint: false,
      authBootstrapMeta: {
        version: 1,
        lastSuccessAt: 10_000,
        lastFailureAt: null,
      },
      now: 20_000,
    }),
    true,
  );
});

test('root auth-aware eligibility는 stale success meta만 있으면 false를 반환한다', () => {
  assert.equal(
    shouldAttemptRootAuthBootstrap({
      hasPersistedAuthHint: false,
      authBootstrapMeta: {
        version: 1,
        lastSuccessAt: 10_000,
        lastFailureAt: null,
      },
      now: 10_000 + 24 * 60 * 60 * 1000 + 1,
    }),
    false,
  );
});

test('root auth-aware eligibility는 recent failure cooldown이면 false를 반환한다', () => {
  assert.equal(
    shouldAttemptRootAuthBootstrap({
      hasPersistedAuthHint: true,
      authBootstrapMeta: {
        version: 1,
        lastSuccessAt: 50_000,
        lastFailureAt: 99_000,
      },
      now: 100_000,
    }),
    false,
  );
});

test('root auth-aware eligibility는 marker가 없으면 false를 반환한다', () => {
  assert.equal(
    shouldAttemptRootAuthBootstrap({
      hasPersistedAuthHint: false,
      now: 1_000,
    }),
    false,
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

test('인증 페이지는 persisted auth hint가 없으면 skip을 유지한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/login', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
    }),
    'skip',
  );
});

test('OAuth 콜백 페이지는 자체 state 소비 전역 부트스트랩을 실행하지 않는다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/oauth/callback', {
      isLoggedIn: false,
      hasPersistedAuthHint: true,
      now: 1_000,
    }),
    'skip',
  );
});

test('인증 페이지는 persisted auth hint가 있으면 즉시 세션 확인을 시작한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/signup', {
      isLoggedIn: false,
      hasPersistedAuthHint: true,
      now: 1_000,
    }),
    'immediate',
  );
});

test('cheer 보호 경로는 공개 홈 모드로 분류하지 않는다', () => {
  ['/cheer/write', '/cheer/bookmarks', '/cheer/edit/123'].forEach((pathname) => {
    assert.equal(
      resolveAuthBootstrapMode(pathname, {
        isLoggedIn: false,
        hasPersistedAuthHint: false,
      }),
      'immediate',
    );
  });
});

test('인증 페이지는 fresh success meta만 있어도 즉시 세션 확인을 시작한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/password/reset', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
      authBootstrapMeta: {
        version: 1,
        lastSuccessAt: 10_000,
        lastFailureAt: null,
      },
      now: 20_000,
    }),
    'immediate',
  );
});

test('인증 페이지는 recent failure cooldown이 있으면 hint가 있어도 skip을 유지한다', () => {
  assert.equal(
    resolveAuthBootstrapMode('/account/deletion/recovery', {
      isLoggedIn: false,
      hasPersistedAuthHint: true,
      authBootstrapMeta: {
        version: 1,
        lastSuccessAt: 50_000,
        lastFailureAt: 99_000,
      },
      now: 100_000,
    }),
    'skip',
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

test('bootstrap marker가 없는 공개 홈은 AuthBootstrap runtime을 마운트하지 않는다', () => {
  assert.equal(
    shouldMountAuthBootstrapRuntime('/home', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
      now: 1_000,
    }),
    false,
  );
});

test('fresh marker가 있는 공개 홈은 AuthBootstrap runtime을 deferred로 유지한다', () => {
  assert.equal(
    shouldMountAuthBootstrapRuntime('/home', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
      authBootstrapMeta: {
        version: 1,
        lastSuccessAt: 10_000,
        lastFailureAt: null,
      },
      now: 20_000,
    }),
    true,
  );
});

test('테스트 auth profile 주입이 있으면 공개 홈도 AuthBootstrap runtime을 마운트한다', () => {
  assert.equal(
    shouldMountAuthBootstrapRuntime('/home', {
      isLoggedIn: false,
      hasPersistedAuthHint: false,
      hasInjectedAuthProfile: true,
      now: 1_000,
    }),
    true,
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
