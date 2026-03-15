import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCheerBattleVoteLoginPath } from './cheerBattle';

test('resolveCheerBattleVoteLoginPath는 비로그인 사용자를 현재 화면으로 복귀 가능한 로그인 경로로 보낸다', () => {
  assert.equal(
    resolveCheerBattleVoteLoginPath(false, '/cheer?tab=popular'),
    '/login?redirect=%2Fcheer%3Ftab%3Dpopular',
  );
});

test('resolveCheerBattleVoteLoginPath는 안전하지 않은 redirect면 기본 로그인 경로로 폴백한다', () => {
  assert.equal(
    resolveCheerBattleVoteLoginPath(false, 'https://evil.example/steal'),
    '/login',
  );
});

test('resolveCheerBattleVoteLoginPath는 로그인 사용자에게 redirect를 만들지 않는다', () => {
  assert.equal(resolveCheerBattleVoteLoginPath(true, '/cheer'), null);
});
