import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mergeGameDetailWithLiveSnapshot,
  mergeGameDetailWithRelaySnapshot,
  mergeHomeGamesWithLiveSummaries,
  mergeLiveEvents,
  mergeRelayEvents,
  selectHomeLivePollingGameIds,
} from './liveGame';
import type { Game as HomeGame } from '../types/home';

test('mergeLiveEvents는 eventSeq 기준으로 중복을 제거하고 정렬한다', () => {
  const result = mergeLiveEvents(
    [{ eventSeq: 2, description: 'old' }, { eventSeq: 4, description: 'four' }],
    [{ eventSeq: 2, description: 'new' }, { eventSeq: 3, description: 'three' }],
  );

  assert.deepEqual(result.map((event) => [event.eventSeq, event.description]), [
    [2, 'new'],
    [3, 'three'],
    [4, 'four'],
  ]);
});

test('mergeGameDetailWithLiveSnapshot은 점수/상태와 새 문자중계 이벤트를 병합한다', () => {
  const result = mergeGameDetailWithLiveSnapshot({
    gameId: 'GAME-1',
    homeTeam: 'LG',
    awayTeam: 'KT',
    homeScore: 1,
    awayScore: 0,
    gameStatus: 'SCHEDULED',
    liveEvents: [{ eventSeq: 1, description: '초구' }],
  }, {
    gameId: 'GAME-1',
    gameStatus: 'LIVE',
    homeScore: 2,
    awayScore: 0,
    lastEventSeq: 2,
    events: [{ eventSeq: 2, description: '득점' }],
  });

  assert.equal(result.gameStatus, 'LIVE');
  assert.equal(result.homeScore, 2);
  assert.equal(result.liveLastEventSeq, 2);
  assert.deepEqual(result.liveEvents?.map((event) => event.description), ['초구', '득점']);
});

test('mergeRelayEvents는 relayId 기준으로 원문 문자중계를 중복 제거하고 정렬한다', () => {
  const result = mergeRelayEvents(
    [{ relayId: 2, playDescription: 'old' }, { relayId: 4, playDescription: 'four' }],
    [{ relayId: 2, playDescription: 'new' }, { relayId: 3, playDescription: 'three' }],
  );

  assert.deepEqual(result.map((event) => [event.relayId, event.playDescription]), [
    [2, 'new'],
    [3, 'three'],
    [4, 'four'],
  ]);
});

test('mergeGameDetailWithRelaySnapshot은 원문 문자중계만 독립적으로 병합한다', () => {
  const result = mergeGameDetailWithRelaySnapshot({
    gameId: 'GAME-1',
    homeTeam: 'LG',
    awayTeam: 'KT',
    homeScore: 1,
    awayScore: 0,
    gameStatus: 'LIVE',
    liveRelayEvents: [{ relayId: 1, playDescription: '초구' }],
  }, {
    gameId: 'GAME-1',
    lastRelayId: 2,
    lastUpdatedAt: '2026-04-29T20:00:00',
    events: [{ relayId: 2, playDescription: '김도영 : 좌익수 왼쪽 2루타' }],
  });

  assert.equal(result.homeScore, 1);
  assert.equal(result.gameStatus, 'LIVE');
  assert.equal(result.liveLastRelayId, 2);
  assert.deepEqual(result.liveRelayEvents?.map((event) => event.playDescription), [
    '초구',
    '김도영 : 좌익수 왼쪽 2루타',
  ]);
});

test('mergeHomeGamesWithLiveSummaries는 홈 카드용 필드만 업데이트한다', () => {
  const games: HomeGame[] = [{
    gameId: 'GAME-1',
    time: '18:30',
    stadium: '잠실',
    gameStatus: 'SCHEDULED',
    gameStatusKr: '경기 예정',
    gameInfo: '',
    leagueType: 'REGULAR',
    homeTeam: 'LG',
    homeTeamFull: 'LG 트윈스',
    awayTeam: 'KT',
    awayTeamFull: 'KT 위즈',
  }];

  const result = mergeHomeGamesWithLiveSummaries(games, [{
    gameId: 'GAME-1',
    gameStatus: 'LIVE',
    homeScore: 1,
    awayScore: 2,
    lastEventSeq: 9,
    lastUpdatedAt: '2026-04-29T19:30:00',
  }]);

  assert.equal(result[0].gameStatus, 'LIVE');
  assert.equal(result[0].homeScore, 1);
  assert.equal(result[0].awayScore, 2);
  assert.equal(result[0].liveLastEventSeq, 9);
});

test('selectHomeLivePollingGameIds는 오늘 경기와 진행 경기만 고른다', () => {
  const todayGame = {
    gameId: 'TODAY',
    gameStatus: 'SCHEDULED',
    gameDate: '2026-04-29',
  } as HomeGame;
  const futureGame = {
    gameId: 'FUTURE',
    gameStatus: 'SCHEDULED',
    gameDate: '2026-04-30',
  } as HomeGame;
  const liveGame = {
    gameId: 'LIVE',
    gameStatus: 'LIVE',
    gameDate: '2026-04-30',
  } as HomeGame;

  assert.deepEqual(
    selectHomeLivePollingGameIds([todayGame, futureGame], [liveGame], '2026-04-29', '2026-04-29'),
    ['TODAY', 'LIVE'],
  );
});
