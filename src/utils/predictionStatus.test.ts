import test from 'node:test';
import assert from 'node:assert/strict';
import type { Game } from '../types/prediction';
import { getGameStatus } from './prediction';

const baseGame: Game = {
  gameId: '20260220HHLG0',
  homeTeam: 'HH',
  awayTeam: 'LG',
  stadium: '잠실',
};

const fixedNow = new Date('2026-02-20T12:00:00');

test('getGameStatus: POSTPONED는 경기 연기로 표기하고 상세/투표를 막는다', () => {
  const status = getGameStatus(baseGame, fixedNow, {
    gameStatus: 'POSTPONED',
    gameDate: '2026-02-20',
    startTime: '18:30',
  });

  assert.equal(status.statusCode, 'POSTPONED');
  assert.equal(status.statusLabel, '경기 연기');
  assert.equal(status.isVoteOpen, false);
  assert.equal(status.canShowDetails, false);
});

test('getGameStatus: CANCELLED는 경기 취소로 표기하고 상세/투표를 막는다', () => {
  const status = getGameStatus(baseGame, fixedNow, {
    gameStatus: 'CANCELLED',
    gameDate: '2026-02-20',
    startTime: '18:30',
  });

  assert.equal(status.statusCode, 'CANCELLED');
  assert.equal(status.statusLabel, '경기 취소');
  assert.equal(status.isVoteOpen, false);
  assert.equal(status.canShowDetails, false);
});

test('getGameStatus: 미래 예정 경기는 경기 예정 + 투표 가능 상태다', () => {
  const status = getGameStatus(baseGame, fixedNow, {
    gameStatus: 'SCHEDULED',
    gameDate: '2026-02-21',
    startTime: '18:30',
  });

  assert.equal(status.statusCode, 'SCHEDULED');
  assert.equal(status.statusLabel, '경기 예정');
  assert.equal(status.isFutureGame, true);
  assert.equal(status.isVoteOpen, true);
});

test('getGameStatus: 미래 날짜여도 POSTPONED는 예정으로 덮이지 않는다', () => {
  const status = getGameStatus(baseGame, fixedNow, {
    gameStatus: 'POSTPONED',
    gameDate: '2026-02-21',
    startTime: '18:30',
  });

  assert.equal(status.statusCode, 'POSTPONED');
  assert.equal(status.statusLabel, '경기 연기');
  assert.equal(status.isClosed, true);
  assert.equal(status.isVoteOpen, false);
});

test('getGameStatus: 미래 날짜여도 CANCELLED는 예정으로 덮이지 않는다', () => {
  const status = getGameStatus(baseGame, fixedNow, {
    gameStatus: 'CANCELLED',
    gameDate: '2026-02-21',
    startTime: '18:30',
  });

  assert.equal(status.statusCode, 'CANCELLED');
  assert.equal(status.statusLabel, '경기 취소');
  assert.equal(status.isClosed, true);
  assert.equal(status.isVoteOpen, false);
});

test('getGameStatus: statusCode와 statusLabel은 같은 상태 의미를 유지한다', () => {
  const statusCases = [
    { gameStatus: 'SCHEDULED', expectedCode: 'SCHEDULED', expectedLabel: '경기 예정' },
    { gameStatus: 'IN_PROGRESS', expectedCode: 'LIVE', expectedLabel: '경기 진행중' },
    { gameStatus: 'COMPLETED', expectedCode: 'COMPLETED', expectedLabel: '경기 종료' },
    { gameStatus: 'POSTPONED', expectedCode: 'POSTPONED', expectedLabel: '경기 연기' },
    { gameStatus: 'CANCELLED', expectedCode: 'CANCELLED', expectedLabel: '경기 취소' },
  ] as const;

  statusCases.forEach(({ gameStatus, expectedCode, expectedLabel }) => {
    const status = getGameStatus(baseGame, fixedNow, {
      gameStatus,
      gameDate: '2026-02-20',
      startTime: '18:30',
    });

    assert.equal(status.statusCode, expectedCode);
    assert.equal(status.statusLabel, expectedLabel);
  });
});
