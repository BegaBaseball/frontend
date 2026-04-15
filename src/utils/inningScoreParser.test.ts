import test from 'node:test';
import assert from 'node:assert/strict';
import type { Game, GameDetail } from '../types/prediction';
import { buildInningRows, hasMeaningfulInningScoreData } from './inningScoreParser';

const baseGame: Game = {
  gameId: '20260201KIASK0',
  homeTeam: 'SSG',
  awayTeam: 'KIA',
  stadium: '문학',
};

const buildDetail = (
  inningScores: GameDetail['inningScores'],
  scores?: { homeScore?: number | null; awayScore?: number | null }
): GameDetail => ({
  gameId: baseGame.gameId,
  homeTeam: baseGame.homeTeam,
  awayTeam: baseGame.awayTeam,
  stadium: baseGame.stadium,
  homeScore: scores?.homeScore ?? null,
  awayScore: scores?.awayScore ?? null,
  inningScores,
});

test('buildInningRows: 0점으로 채워진 extra inning template은 종료 이닝 계산에서 제외한다', () => {
  const rows = buildInningRows(baseGame, buildDetail([
    { inning: 1, teamSide: 'away', runs: 0 },
    { inning: 1, teamSide: 'home', runs: 0 },
    { inning: 2, teamSide: 'away', runs: 0 },
    { inning: 2, teamSide: 'home', runs: 4 },
    { inning: 3, teamSide: 'away', runs: 0 },
    { inning: 3, teamSide: 'home', runs: 5 },
    { inning: 4, teamSide: 'away', runs: 2 },
    { inning: 4, teamSide: 'home', runs: 1 },
    { inning: 7, teamSide: 'away', runs: 4 },
    { inning: 7, teamSide: 'home', runs: 0 },
    { inning: 8, teamSide: 'away', runs: 0 },
    { inning: 8, teamSide: 'home', runs: 1 },
    { inning: 9, teamSide: 'away', runs: 0 },
    { inning: 9, teamSide: 'home', runs: 0 },
    { inning: 10, teamSide: 'away', runs: 0, isExtra: true },
    { inning: 10, teamSide: 'home', runs: 0, isExtra: true },
    { inning: 11, teamSide: 'away', runs: 0, isExtra: true },
    { inning: 11, teamSide: 'home', runs: 0, isExtra: true },
    { inning: 12, teamSide: 'away', runs: 0, isExtra: true },
    { inning: 12, teamSide: 'home', runs: 0, isExtra: true },
  ], {
    homeScore: 11,
    awayScore: 6,
  }));

  assert.deepEqual(Object.keys(rows).map(Number), [1, 2, 3, 4, 7, 8, 9]);
});

test('buildInningRows: 최종 점수가 없어도 승패가 확정된 뒤의 0점 extra inning template은 제외한다', () => {
  const rows = buildInningRows(baseGame, buildDetail([
    { inning: 1, teamSide: 'away', runs: 0 },
    { inning: 1, teamSide: 'home', runs: 0 },
    { inning: 2, teamSide: 'away', runs: 0 },
    { inning: 2, teamSide: 'home', runs: 4 },
    { inning: 3, teamSide: 'away', runs: 0 },
    { inning: 3, teamSide: 'home', runs: 5 },
    { inning: 4, teamSide: 'away', runs: 2 },
    { inning: 4, teamSide: 'home', runs: 1 },
    { inning: 7, teamSide: 'away', runs: 4 },
    { inning: 7, teamSide: 'home', runs: 0 },
    { inning: 8, teamSide: 'away', runs: 0 },
    { inning: 8, teamSide: 'home', runs: 1 },
    { inning: 9, teamSide: 'away', runs: 0 },
    { inning: 9, teamSide: 'home', runs: 0 },
    { inning: 10, teamSide: 'away', runs: 0, isExtra: true },
    { inning: 10, teamSide: 'home', runs: 0, isExtra: true },
    { inning: 11, teamSide: 'away', runs: 0, isExtra: true },
    { inning: 11, teamSide: 'home', runs: 0, isExtra: true },
    { inning: 12, teamSide: 'away', runs: 0, isExtra: true },
    { inning: 12, teamSide: 'home', runs: 0, isExtra: true },
  ]));

  assert.deepEqual(Object.keys(rows).map(Number), [1, 2, 3, 4, 7, 8, 9]);
});

test('hasMeaningfulInningScoreData: scoreless inning(0점)은 유효하고 placeholder row는 무시한다', () => {
  assert.equal(hasMeaningfulInningScoreData(buildDetail([
    { inning: 9, teamSide: 'away', runs: 0 },
    { inning: 9, teamSide: 'home', runs: 0 },
  ])), true);

  assert.equal(hasMeaningfulInningScoreData(buildDetail([
    { inning: 10, teamSide: 'away', runs: null },
    { inning: 10, teamSide: 'home', runs: null },
  ])), false);
});

test('buildInningRows: 점수 미집계 경기의 0점 template row는 스코어보드에서 숨긴다', () => {
  const rows = buildInningRows(baseGame, {
    gameId: baseGame.gameId,
    homeTeam: baseGame.homeTeam,
    awayTeam: baseGame.awayTeam,
    stadium: baseGame.stadium,
    homeScore: null,
    awayScore: null,
    inningScores: [
      { inning: 1, teamSide: 'away', runs: 0 },
      { inning: 1, teamSide: 'home', runs: 0 },
      { inning: 12, teamSide: 'away', runs: 0, isExtra: true },
      { inning: 12, teamSide: 'home', runs: 0, isExtra: true },
    ],
  });

  assert.deepEqual(rows, {});
});
