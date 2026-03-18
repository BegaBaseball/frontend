import test from 'node:test';
import assert from 'node:assert/strict';

import { authStoreApi, useAuthStore } from './authStore';

test.afterEach(() => {
  useAuthStore.getState().reset();
});

test('fetchProfileAndAuthenticate는 프로필 조회 성공 시 true를 반환하고 user를 저장한다', async (t) => {
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
