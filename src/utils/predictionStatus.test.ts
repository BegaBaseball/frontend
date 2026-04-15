import test from 'node:test';
import assert from 'node:assert/strict';
import type { Game } from '../types/prediction';
import { getGameStatus, hasGameDetailProgressData } from './predictionStatus';

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

test('getGameStatus: SCHEDULED라도 과거 경기에서 점수가 있으면 종료 상태를 우선한다', () => {
  const status = getGameStatus(baseGame, fixedNow, {
    gameStatus: 'SCHEDULED',
    gameDate: '2026-02-19',
    startTime: '18:30',
    homeScore: 4,
    awayScore: 2,
    hasProgressData: true,
  });

  assert.equal(status.statusCode, 'COMPLETED');
  assert.equal(status.statusLabel, '경기 종료');
  assert.equal(status.isVoteOpen, false);
});

test('getGameStatus: SCHEDULED라도 시작 이후 이닝 데이터가 있으면 진행중으로 본다', () => {
  const status = getGameStatus(baseGame, fixedNow, {
    gameStatus: 'SCHEDULED',
    gameDate: '2026-02-20',
    startTime: '11:30',
    hasProgressData: true,
  });

  assert.equal(status.statusCode, 'LIVE');
  assert.equal(status.statusLabel, '경기 진행중');
  assert.equal(status.isVoteOpen, false);
});

test('hasGameDetailProgressData: 점수나 이닝 데이터가 있으면 true를 반환한다', () => {
  assert.equal(hasGameDetailProgressData({
    gameId: '1',
    homeTeam: 'HH',
    awayTeam: 'LG',
    homeScore: 3,
    awayScore: 1,
  }), true);

  assert.equal(hasGameDetailProgressData({
    gameId: '1',
    homeTeam: 'HH',
    awayTeam: 'LG',
    inningScores: [{ inning: 1, teamSide: 'away', runs: 1 }],
  }), true);

  assert.equal(hasGameDetailProgressData({
    gameId: '1',
    homeTeam: 'HH',
    awayTeam: 'LG',
  }), false);
});

test('hasGameDetailProgressData: 점수가 없는 placeholder extra inning row는 진행 데이터로 보지 않는다', () => {
  assert.equal(hasGameDetailProgressData({
    gameId: '1',
    homeTeam: 'HH',
    awayTeam: 'LG',
    inningScores: [
      { inning: 10, teamSide: 'away', runs: null },
      { inning: 10, teamSide: 'home', runs: null },
      { inning: 11, teamSide: 'away', runs: null },
      { inning: 11, teamSide: 'home', runs: null },
    ],
  }), false);
});

test('hasGameDetailProgressData: 점수 미집계 경기의 0점 template inning row도 진행 데이터로 보지 않는다', () => {
  assert.equal(hasGameDetailProgressData({
    gameId: '1',
    homeTeam: 'HH',
    awayTeam: 'LG',
    homeScore: null,
    awayScore: null,
    inningScores: [
      { inning: 1, teamSide: 'away', runs: 0 },
      { inning: 1, teamSide: 'home', runs: 0 },
      { inning: 12, teamSide: 'away', runs: 0, isExtra: true },
      { inning: 12, teamSide: 'home', runs: 0, isExtra: true },
    ],
  }), false);
});
