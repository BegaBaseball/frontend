import assert from 'node:assert/strict';
import test from 'node:test';

import { toHomeGame, toHomeGamesFromRange } from './homeMappers';

test('toHomeGame은 MatchDto LocalTime object를 home time 문자열로 변환한다', () => {
  const game = toHomeGame({
    gameId: '20260402LTHH',
    gameDate: '2026-04-02',
    homeTeam: 'HH',
    awayTeam: 'LT',
    stadium: '대전',
    startTime: { hour: 18, minute: 30 },
    gameStatus: 'SCHEDULED',
    leagueType: 'REGULAR',
  });

  assert.equal(game.gameId, '20260402LTHH');
  assert.equal(game.time, '18:30');
  assert.equal(game.homeTeamFull, '한화 이글스');
  assert.equal(game.awayTeamFull, '롯데 자이언츠');
  assert.equal(game.gameStatusKr, '예정');
  assert.equal(game.gameInfo, '롯데 자이언츠 vs 한화 이글스');
  assert.equal(game.leagueType, 'REGULAR');
  assert.equal(game.sourceDate, '2026-04-02');
});

test('toHomeGame은 explicit time과 표시 필드를 우선 사용한다', () => {
  const game = toHomeGame({
    gameId: '20260402LTHH',
    time: '18:31',
    startTime: { hour: 18, minute: 30, second: 12 },
    homeTeam: 'HH',
    homeTeamFull: '한화',
    awayTeam: 'LT',
    awayTeamFull: '롯데',
    gameStatus: 'SCHEDULED',
    gameStatusKr: '경기전',
    gameInfo: '롯데 @ 한화',
  });

  assert.equal(game.time, '18:31');
  assert.equal(game.homeTeamFull, '한화');
  assert.equal(game.awayTeamFull, '롯데');
  assert.equal(game.gameStatusKr, '경기전');
  assert.equal(game.gameInfo, '롯데 @ 한화');
  assert.equal(game.leagueType, '');
});

test('toHomeGame은 주요 gameStatus의 Korean fallback을 제공한다', () => {
  const cases: Array<[string, string]> = [
    ['LIVE', '진행중'],
    ['IN_PROGRESS', '진행중'],
    ['COMPLETED', '종료'],
    ['FINAL', '종료'],
    ['POSTPONED', '연기'],
    ['CANCELLED', '취소'],
    ['WEIRD', 'WEIRD'],
  ];

  cases.forEach(([gameStatus, expected]) => {
    assert.equal(toHomeGame({ gameStatus }).gameStatusKr, expected);
  });
});

test('toHomeGamesFromRange는 page object와 legacy array 응답을 home Game[]로 정규화한다', () => {
  const match = {
    gameId: '20260402LTHH',
    homeTeam: 'HH',
    awayTeam: 'LT',
    startTime: { hour: 18, minute: 30, second: 5 },
    gameStatus: 'FINAL',
  };

  const fromPage = toHomeGamesFromRange({ content: [match] });
  const fromArray = toHomeGamesFromRange([match]);

  assert.equal(fromPage.length, 1);
  assert.equal(fromPage[0].time, '18:30:05');
  assert.equal(fromPage[0].gameStatusKr, '종료');
  assert.deepEqual(fromArray, fromPage);
});
