import assert from 'node:assert/strict';
import test from 'node:test';

import {
  toPredictionGame,
  toPredictionGameDetail,
  toPredictionMatchDayNavigation,
  toPredictionMatchRangePage,
  toPredictionStartTime,
} from './predictionMappers';

test('toPredictionStartTime은 LocalTime 객체와 문자열을 UI 시간 문자열로 정규화한다', () => {
  assert.equal(toPredictionStartTime({ hour: 18, minute: 30, second: 5 }), '18:30:05');
  assert.equal(toPredictionStartTime({ hour: 8, minute: 3 }), '08:03');
  assert.equal(toPredictionStartTime('18:30:00'), '18:30:00');
});

test('toPredictionStartTime은 null과 invalid 객체를 null로 정규화한다', () => {
  assert.equal(toPredictionStartTime(null), null);
  assert.equal(toPredictionStartTime(undefined), null);
  assert.equal(toPredictionStartTime({ minute: 30, second: 0 }), null);
  assert.equal(toPredictionStartTime({ hour: 'not-a-number', minute: 30 }), null);
});

test('toPredictionGame은 generated MatchDto wire payload를 Game으로 정규화한다', () => {
  const game = toPredictionGame({
    gameId: 'GAME-1',
    gameDate: '2026-04-02',
    homeTeam: 'LG',
    awayTeam: 'SS',
    stadium: '잠실야구장',
    startTime: { hour: 18, minute: 30, second: 0 },
    homeScore: '4',
    awayScore: 3,
    homePitcher: { name: '김투수', era: '3.10', win: '2', loss: 1, imgUrl: '/p.png' },
    awayPitcher: { name: '이투수' },
    winProbability: { home: '55', away: 45 },
  });

  assert.equal(game.gameId, 'GAME-1');
  assert.equal(game.startTime, '18:30:00');
  assert.equal(game.homeScore, 4);
  assert.equal(game.homePitcher?.win, 2);
  assert.deepEqual(game.winProbability, { home: 55, away: 45 });
});

test('toPredictionMatchRangePage와 schedule mapper는 game startTime을 함께 정규화한다', () => {
  const page = toPredictionMatchRangePage({
    content: [{
      gameId: 'GAME-2',
      gameDate: '2026-04-03',
      homeTeam: 'HH',
      awayTeam: 'LT',
      stadium: '대전',
      startTime: { hour: 14, minute: 0 },
    }],
    page: '2',
    size: '20',
    totalElements: '41',
    totalPages: 3,
    hasNext: 'true',
    hasPrevious: true,
  });

  assert.equal(page.content[0]?.startTime, '14:00');
  assert.equal(page.page, 2);
  assert.equal(page.totalElements, 41);
  assert.equal(page.hasNext, true);

  const schedule = toPredictionMatchDayNavigation({
    date: '2026-04-03',
    games: [{
      gameId: 'GAME-3',
      gameDate: '2026-04-03',
      homeTeam: 'WO',
      awayTeam: 'LG',
      stadium: '고척',
      startTime: { hour: 17, minute: 5, second: 9 },
    }],
    prevDate: null,
    nextDate: '2026-04-04',
    hasPrev: false,
    hasNext: true,
  });

  assert.equal(schedule.games[0]?.startTime, '17:05:09');
  assert.equal(schedule.nextDate, '2026-04-04');
});

test('toPredictionGameDetail은 LocalTime과 numeric string 필드를 상세 domain 타입으로 정규화한다', () => {
  const detail = toPredictionGameDetail({
    gameId: 'GAME-4',
    gameDate: '2026-04-04',
    stadium: '잠실',
    stadiumName: '잠실야구장',
    startTime: { hour: 18, minute: 30 },
    attendance: '12345',
    weather: '맑음',
    gameTimeMinutes: '180',
    homeTeam: 'LG',
    awayTeam: 'SS',
    homeScore: '5',
    awayScore: '4',
    homePitcher: '김투수',
    awayPitcher: '이투수',
    gameStatus: 'FINAL',
  });

  assert.equal(detail.startTime, '18:30');
  assert.equal(detail.attendance, 12345);
  assert.equal(detail.gameTimeMinutes, 180);
  assert.equal(detail.homeScore, 5);
  assert.equal(detail.awayScore, 4);
});
