import test from 'node:test';
import assert from 'node:assert/strict';

import { authStoreApi, useAuthStore } from './authStore';
import { getPersistedAuthBootstrapMeta } from '../utils/authBootstrap';

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

test.afterEach(() => {
  useAuthStore.getState().reset();
});

const withWindowLocalStorage = (storage: ReturnType<typeof createStorage>) => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      localStorage: storage,
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

  assert.equal(didAuthenticate, false);
  assert.equal(hasAuthBootstrapHint(storage), true);
  assert.equal(getAuthBootstrapMeta()?.lastSuccessAt !== null, true);
  assert.equal(getAuthBootstrapMeta()?.lastFailureAt !== null, true);
});
