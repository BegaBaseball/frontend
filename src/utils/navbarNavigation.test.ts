import assert from 'node:assert/strict';
import test from 'node:test';

import { buildNavbarNavPath } from './navbarNavigation';

test('buildNavbarNavPath는 전력분석실을 오늘 날짜 prediction 목록 경로로 만든다', () => {
  assert.equal(
    buildNavbarNavPath('prediction', new Date(2026, 5, 25)),
    '/prediction?date=2026-06-25',
  );
});

test('buildNavbarNavPath는 일반 nav item을 기존 루트 경로로 유지한다', () => {
  assert.equal(buildNavbarNavPath('cheer'), '/cheer');
  assert.equal(buildNavbarNavPath('stadium'), '/stadium');
  assert.equal(buildNavbarNavPath('mate'), '/mate');
});

test('isNavbarNavItemActive는 prediction 목록과 상세를 전력분석실 활성 경로로 취급한다', async () => {
  const { isNavbarNavItemActive } = await import('./navbarNavigation');

  assert.equal(isNavbarNavItemActive('prediction', '/prediction'), true);
  assert.equal(isNavbarNavItemActive('prediction', '/prediction/matches/20260625TEST0'), true);
  assert.equal(isNavbarNavItemActive('prediction', '/schedule'), false);
  assert.equal(isNavbarNavItemActive('prediction', '/cheer'), false);
});
