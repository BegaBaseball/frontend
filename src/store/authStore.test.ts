import test from 'node:test';
import assert from 'node:assert/strict';
import { createJSONStorage } from 'zustand/middleware';

import { authStoreApi, useAuthStore } from './authStore';
import { queryClient } from '../lib/queryClient';
import {
  getPersistedAuthBootstrapMeta,
  setPersistedAuthBootstrapMeta,
} from '../utils/authBootstrap';

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
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

const installPersistStorage = (storage: ReturnType<typeof createStorage>) => {
  useAuthStore.persist.setOptions({
    storage: createJSONStorage(() => storage),
  });
};

installPersistStorage(createStorage());

test.afterEach(() => {
  queryClient.clear();
  useAuthStore.getState().reset();
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { localStorage?: unknown }).localStorage;
  installPersistStorage(createStorage());
});

test('fetchProfileAndAuthenticate는 성공한 프로필을 MyPage 쿼리 캐시에 저장한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage, '/mypage');

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => ({
    id: 7,
    email: 'slugger@example.com',
    name: 'Slugger',
    handle: 'slugger',
    favoriteTeam: 'LG',
    favoriteTeamColor: '#c00',
    role: 'ROLE_USER',
    profileImageUrl: null,
    provider: 'KAKAO',
    providerId: 'provider-1',
    bio: '직관 기록 중',
    cheerPoints: 120,
    hasPassword: false,
  }) as never);

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate();
  const cachedProfile = queryClient.getQueryData(['userProfile', 7]);

  assert.equal(didAuthenticate, true);
  assert.deepEqual(cachedProfile, {
    id: 7,
    email: 'slugger@example.com',
    name: 'Slugger',
    handle: 'slugger',
    favoriteTeam: 'LG',
    favoriteTeamColor: '#c00',
    role: 'ROLE_USER',
    profileImageUrl: null,
    provider: 'KAKAO',
    providerId: 'provider-1',
    bio: '직관 기록 중',
    cheerPoints: 120,
    hasPassword: false,
  });
});

const withWindowLocalStorage = (
  storage: ReturnType<typeof createStorage>,
  pathname = '/prediction',
) => {
  installPersistStorage(storage);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      localStorage: storage,
      location: {
        pathname,
      },
    } as Window & { localStorage: typeof storage },
  });
};

const AUTH_BOOTSTRAP_HINT_KEY = 'auth-bootstrap-hint';

const setAuthBootstrapHint = (storage: ReturnType<typeof createStorage>, enabled: boolean) => {
  if (enabled) {
    storage.setItem(AUTH_BOOTSTRAP_HINT_KEY, '1');
    return;
  }

  storage.removeItem(AUTH_BOOTSTRAP_HINT_KEY);
};

const hasAuthBootstrapHint = (storage: ReturnType<typeof createStorage>) => storage.getItem(AUTH_BOOTSTRAP_HINT_KEY) === '1';

const getAuthBootstrapMeta = () => getPersistedAuthBootstrapMeta();

test('익명 prediction 초기화는 auth loading을 즉시 해제한다', () => {
  const storage = createStorage();
  withWindowLocalStorage(storage, '/prediction');

  useAuthStore.getState().reset();

  assert.equal(useAuthStore.getState().isAuthLoading, false);
});

test('fetchProfileAndAuthenticate는 프로필 조회 성공 시 true를 반환하고 user를 저장한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => ({
    id: 7,
    email: 'slugger@example.com',
    name: 'Slugger',
    handle: 'slugger',
    favoriteTeam: 'LG',
    favoriteTeamColor: '#c00',
    role: 'ROLE_USER',
    profileImageUrl: null,
    provider: 'KAKAO',
    providerId: 'provider-1',
    bio: null,
    cheerPoints: 120,
    hasPassword: false,
  }) as never);

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate();
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, true);
  assert.equal(state.user?.email, 'slugger@example.com');
  assert.equal(state.user?.handle, 'slugger');
  assert.equal(state.isAuthLoading, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
  assert.equal(hasAuthBootstrapHint(storage), true);
  assert.deepEqual(getAuthBootstrapMeta(), {
    version: 1,
    lastSuccessAt: getAuthBootstrapMeta()?.lastSuccessAt ?? null,
    lastFailureAt: null,
  });
});

test('fetchProfileAndAuthenticate는 401 실패 시 auth bootstrap hint를 초기화한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);
  setAuthBootstrapHint(storage, true);

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    throw { response: { status: 401 } };
  });

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate();
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, false);
  assert.equal(state.user, null);
  assert.equal(state.isAuthLoading, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
  assert.equal(hasAuthBootstrapHint(storage), false);
  assert.deepEqual(getAuthBootstrapMeta(), {
    version: 1,
    lastSuccessAt: null,
    lastFailureAt: getAuthBootstrapMeta()?.lastFailureAt ?? null,
  });
});

test('fetchProfileAndAuthenticate는 5xx 실패 시 auth bootstrap hint는 유지한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);
  setAuthBootstrapHint(storage, true);

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    throw { response: { status: 502 } };
  });

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate();
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, false);
  assert.equal(state.user, null);
  assert.equal(state.isAuthLoading, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
  assert.equal(hasAuthBootstrapHint(storage), true);
  assert.deepEqual(getAuthBootstrapMeta(), {
    version: 1,
    lastSuccessAt: null,
    lastFailureAt: getAuthBootstrapMeta()?.lastFailureAt ?? null,
  });
});

test('fetchProfileAndAuthenticate는 프로필 조회 실패 시 false를 반환하고 auth state를 비운다', async (t) => {
  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    throw new Error('profile failed');
  });

  useAuthStore.getState().login(
    'before@example.com',
    'Before',
    null,
    'ROLE_USER',
    undefined,
    3,
    0,
    'before',
  );

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate();
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, false);
  assert.equal(state.user, null);
  assert.equal(state.isAuthLoading, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
});

test('public-optional bootstrap 401 실패는 사용자 state를 비우지 않고 hint/meta만 정리한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);
  setAuthBootstrapHint(storage, true);
  const fetchOptions: Array<{ retryOn401?: boolean } | undefined> = [];

  useAuthStore.getState().login(
    'viewer@example.com',
    'Viewer',
    null,
    'ROLE_USER',
    undefined,
    11,
    0,
    'viewer',
  );

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async (options?: { retryOn401?: boolean }) => {
    fetchOptions.push(options);
    throw { response: { status: 401 } };
  });

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, false);
  assert.equal(state.user?.email, 'viewer@example.com');
  assert.equal(state.isAuthLoading, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
  assert.deepEqual(fetchOptions, [{ retryOn401: false }]);
  assert.equal(hasAuthBootstrapHint(storage), false);
  assert.deepEqual(getAuthBootstrapMeta(), {
    version: 1,
    lastSuccessAt: null,
    lastFailureAt: getAuthBootstrapMeta()?.lastFailureAt ?? null,
  });
});

test('cheer public-optional bootstrap 401 실패는 공개 페이지 사용자 state를 비우지 않는다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage, '/cheer');
  setAuthBootstrapHint(storage, true);
  const fetchOptions: Array<{ retryOn401?: boolean } | undefined> = [];

  useAuthStore.getState().login(
    'cheer-viewer@example.com',
    'Cheer Viewer',
    null,
    'ROLE_USER',
    undefined,
    31,
    0,
    'cheer-viewer',
  );

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async (options?: { retryOn401?: boolean }) => {
    fetchOptions.push(options);
    throw { response: { status: 401 } };
  });

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, false);
  assert.equal(state.user?.email, 'cheer-viewer@example.com');
  assert.equal(state.isAuthLoading, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
  assert.deepEqual(fetchOptions, [{ retryOn401: false }]);
  assert.equal(hasAuthBootstrapHint(storage), false);
  assert.deepEqual(getAuthBootstrapMeta(), {
    version: 1,
    lastSuccessAt: null,
    lastFailureAt: getAuthBootstrapMeta()?.lastFailureAt ?? null,
  });
});

test('public-optional bootstrap 5xx 실패는 hint를 유지하고 cooldown만 갱신한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);
  useAuthStore.getState().login(
    'viewer@example.com',
    'Viewer',
    null,
    'ROLE_USER',
    undefined,
    11,
    0,
    'viewer',
  );

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    throw { response: { status: 503 } };
  });

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
  assert.equal(hasAuthBootstrapHint(storage), true);
  assert.equal(getAuthBootstrapMeta()?.lastSuccessAt !== null, true);
  assert.equal(getAuthBootstrapMeta()?.lastFailureAt !== null, true);
});

test('public-optional bootstrap 성공은 running 이후 idle로 정리하고 user를 복구한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage, '/home');
  setAuthBootstrapHint(storage, true);

  type MockAuthProfile = Awaited<ReturnType<typeof authStoreApi.fetchCurrentUserProfile>>;
  let resolveProfile: ((value: MockAuthProfile) => void) | undefined;

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => new Promise<MockAuthProfile>((resolve) => {
    resolveProfile = resolve;
  }));

  const authenticatePromise = useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });

  assert.equal(useAuthStore.getState().publicAuthBootstrapPhase, 'running');

  assert.ok(resolveProfile);
  resolveProfile({
    id: 21,
    email: 'refresh@example.com',
    name: 'Refresh User',
    handle: 'refresh-user',
    favoriteTeam: 'HH',
    favoriteTeamColor: '#f60',
    role: 'ROLE_USER',
    profileImageUrl: null,
    provider: 'LOCAL',
    providerId: 'refresh-user',
    bio: null,
    cheerPoints: 5,
    hasPassword: true,
  });

  const didAuthenticate = await authenticatePromise;
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, true);
  assert.equal(state.user?.email, 'refresh@example.com');
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
});

test('public-optional bootstrap timeout 오류 후에도 idle로 복귀한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage, '/home');
  setAuthBootstrapHint(storage, true);

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    throw new Error('Request timed out after 10000ms');
  });

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
});

test('public-optional bootstrap 연속 호출은 짧은 중복 윈도우에서 한 번만 요청한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);
  setAuthBootstrapHint(storage, true);
  let fetchCount = 0;

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    fetchCount += 1;
    throw { response: { status: 401 } };
  });

  const firstAttempt = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  const secondAttempt = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });

  assert.equal(firstAttempt, false);
  assert.equal(secondAttempt, false);
  assert.equal(fetchCount, 1);
  assert.equal(useAuthStore.getState().publicAuthBootstrapPhase, 'idle');
});

test('guest public-optional bootstrap은 persisted hint가 남아 있어도 짧은 중복 윈도우에서 재요청하지 않는다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);
  setAuthBootstrapHint(storage, true);
  setPersistedAuthBootstrapMeta({
    version: 1,
    lastSuccessAt: Date.now(),
    lastFailureAt: null,
  });
  let fetchCount = 0;

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    fetchCount += 1;
    throw { response: { status: 503 } };
  });

  const firstAttempt = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  setAuthBootstrapHint(storage, true);
  setPersistedAuthBootstrapMeta({
    version: 1,
    lastSuccessAt: Date.now(),
    lastFailureAt: null,
  });
  const secondAttempt = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });

  assert.equal(firstAttempt, false);
  assert.equal(secondAttempt, false);
  assert.equal(fetchCount, 1);
  assert.equal(hasAuthBootstrapHint(storage), true);
  assert.equal(useAuthStore.getState().publicAuthBootstrapPhase, 'idle');
});

test('public-optional bootstrap은 현재 경로가 defer 대상이 아니면 요청하지 않는다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);
  let fetchCount = 0;

  Object.defineProperty(globalThis.window, 'location', {
    configurable: true,
    value: {
      pathname: '/prediction',
    },
  });

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    fetchCount += 1;
    throw { response: { status: 401 } };
  });

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });

  assert.equal(didAuthenticate, false);
  assert.equal(fetchCount, 0);
  assert.equal(useAuthStore.getState().publicAuthBootstrapPhase, 'idle');
});
