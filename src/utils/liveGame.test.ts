import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createHomeLiveSummaryTimeoutWarningState,
  mergeGameDetailWithLiveSnapshot,
  mergeGameDetailWithRelaySnapshot,
  mergeGameDetailLiveStatusError,
  mergeGameDetailRelayError,
  mergeHomeGamesWithLiveSummaries,
  mergeLiveEvents,
  mergeRelayEvents,
  recordHomeLiveSummaryTimeoutFailure,
  resetHomeLiveSummaryTimeoutWarningState,
  selectHomeLivePollingGameIds,
  shouldStartPredictionLivePolling,
} from './liveGame';
import type { Game as HomeGame } from '../types/home';
import type { Game, GameDetail } from '../types/prediction';

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

test('mergeGameDetailWithLiveSnapshot은 snapshot inningScores가 있으면 상세 이닝 스코어를 교체한다', () => {
  const result = mergeGameDetailWithLiveSnapshot({
    gameId: 'GAME-1',
    homeTeam: 'LG',
    awayTeam: 'KT',
    inningScores: [{ inning: 1, teamSide: 'away', runs: 1 }],
  }, {
    gameId: 'GAME-1',
    homeScore: 2,
    awayScore: 1,
    events: [],
    inningScores: [
      { inning: 1, teamSide: 'away', runs: 1 },
      { inning: 1, teamSide: 'home', runs: 2 },
    ],
  });

  assert.deepEqual(result.inningScores, [
    { inning: 1, teamSide: 'away', runs: 1 },
    { inning: 1, teamSide: 'home', runs: 2 },
  ]);
});

test('mergeGameDetailWithLiveSnapshot은 구버전 snapshot이면 기존 이닝 스코어를 보존한다', () => {
  const result = mergeGameDetailWithLiveSnapshot({
    gameId: 'GAME-1',
    homeTeam: 'LG',
    awayTeam: 'KT',
    inningScores: [{ inning: 1, teamSide: 'away', runs: 1 }],
  }, {
    gameId: 'GAME-1',
    homeScore: 1,
    awayScore: 1,
    events: [],
  });

  assert.deepEqual(result.inningScores, [{ inning: 1, teamSide: 'away', runs: 1 }]);
});

test('mergeGameDetailLiveStatusError는 score polling 오류 code를 보존하고 성공 snapshot에서 초기화한다', () => {
  const errored = mergeGameDetailLiveStatusError({
    gameId: 'GAME-1',
    homeTeam: 'LG',
    awayTeam: 'KT',
  }, '실시간 점수 데이터 준비가 필요합니다.', null, 'MANUAL_BASEBALL_DATA_REQUIRED');

  assert.equal(errored?.liveStatusError, '실시간 점수 데이터 준비가 필요합니다.');
  assert.equal(errored?.liveStatusErrorCode, 'MANUAL_BASEBALL_DATA_REQUIRED');

  const recovered = mergeGameDetailWithLiveSnapshot(errored, {
    gameId: 'GAME-1',
    homeScore: 1,
    awayScore: 0,
    events: [],
    inningScores: [{ inning: 1, teamSide: 'home', runs: 1 }],
  });

  assert.equal(recovered.liveStatusError, null);
  assert.equal(recovered.liveStatusErrorCode, null);
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

test('mergeGameDetailRelayError는 relay 오류 code를 보존하고 relay 성공 snapshot에서 초기화한다', () => {
  const errored = mergeGameDetailRelayError({
    gameId: 'GAME-1',
    homeTeam: 'LG',
    awayTeam: 'KT',
  }, '문자중계 데이터 준비가 필요합니다.', null, 'MANUAL_BASEBALL_DATA_REQUIRED');

  assert.equal(errored?.liveRelayError, '문자중계 데이터 준비가 필요합니다.');
  assert.equal(errored?.liveRelayErrorCode, 'MANUAL_BASEBALL_DATA_REQUIRED');

  const recovered = mergeGameDetailWithRelaySnapshot(errored, {
    gameId: 'GAME-1',
    lastRelayId: 1,
    events: [{ relayId: 1, playDescription: '초구 스트라이크' }],
  });

  assert.equal(recovered.liveRelayError, null);
  assert.equal(recovered.liveRelayErrorCode, null);
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

test('shouldStartPredictionLivePolling은 상세 데이터가 ready 되기 전에는 polling을 시작하지 않는다', () => {
  const game = {
    gameId: 'LIVE',
    gameStatus: 'LIVE',
    gameDate: '2026-04-29',
  } as Game;
  const detail = {
    gameId: 'LIVE',
    gameStatus: 'LIVE',
    gameDate: '2026-04-29',
  } as GameDetail;

  assert.equal(shouldStartPredictionLivePolling(game, detail, false), false);
  assert.equal(shouldStartPredictionLivePolling(game, detail, true, '2026-04-29'), true);
});

test('shouldStartPredictionLivePolling은 취소/연기 경기는 ready 이후에도 polling하지 않는다', () => {
  const game = {
    gameId: 'POSTPONED',
    gameStatus: 'POSTPONED',
    gameDate: '2026-04-29',
  } as Game;
  const detail = {
    gameId: 'POSTPONED',
    gameStatus: 'POSTPONED',
    gameDate: '2026-04-29',
  } as GameDetail;

  assert.equal(shouldStartPredictionLivePolling(game, detail, true, '2026-04-29'), false);
});

test('shouldStartPredictionLivePolling은 과거 LIVE/SCHEDULED 경기를 polling하지 않는다', () => {
  const todayKey = '2026-04-29';
  const liveGame = {
    gameId: 'PAST-LIVE',
    gameStatus: 'LIVE',
    gameDate: '2026-04-28',
  } as Game;
  const scheduledGame = {
    gameId: 'PAST-SCHEDULED',
    gameStatus: 'SCHEDULED',
    gameDate: '2026-04-28',
  } as Game;

  assert.equal(shouldStartPredictionLivePolling(liveGame, null, true, todayKey), false);
  assert.equal(shouldStartPredictionLivePolling(scheduledGame, null, true, todayKey), false);
});

test('shouldStartPredictionLivePolling은 오늘 종료/중단 상태 경기를 polling하지 않는다', () => {
  const todayKey = '2026-04-29';
  const statuses = ['COMPLETED', 'DRAW', 'SUSPENDED', 'DELAYED', 'FINAL'];

  statuses.forEach((status) => {
    const game = {
      gameId: `TODAY-${status}`,
      gameStatus: status,
      gameDate: todayKey,
    } as Game;
    assert.equal(shouldStartPredictionLivePolling(game, null, true, todayKey), false);
  });
});

test('shouldStartPredictionLivePolling은 오늘 LIVE와 SCHEDULED 경기는 ready 이후 polling 후보로 둔다', () => {
  const todayKey = '2026-04-29';
  const liveGame = {
    gameId: 'TODAY-LIVE',
    gameStatus: 'LIVE',
    gameDate: todayKey,
  } as Game;
  const scheduledGame = {
    gameId: 'TODAY-SCHEDULED',
    gameStatus: 'SCHEDULED',
    gameDate: todayKey,
  } as Game;

  assert.equal(shouldStartPredictionLivePolling(liveGame, null, true, todayKey), true);
  assert.equal(shouldStartPredictionLivePolling(scheduledGame, null, true, todayKey), true);
});

test('recordHomeLiveSummaryTimeoutFailure는 3회 연속 timeout부터 한 번만 경고한다', () => {
  const state = createHomeLiveSummaryTimeoutWarningState();

  assert.equal(recordHomeLiveSummaryTimeoutFailure(state), false);
  assert.equal(recordHomeLiveSummaryTimeoutFailure(state), false);
  assert.equal(recordHomeLiveSummaryTimeoutFailure(state), true);
  assert.equal(recordHomeLiveSummaryTimeoutFailure(state), false);
  assert.equal(state.consecutiveTimeoutCount, 4);
  assert.equal(state.timeoutWarningLogged, true);
});

test('resetHomeLiveSummaryTimeoutWarningState는 timeout 경고 상태를 초기화한다', () => {
  const state = createHomeLiveSummaryTimeoutWarningState();

  recordHomeLiveSummaryTimeoutFailure(state);
  recordHomeLiveSummaryTimeoutFailure(state);
  recordHomeLiveSummaryTimeoutFailure(state);
  resetHomeLiveSummaryTimeoutWarningState(state);

  assert.equal(state.consecutiveTimeoutCount, 0);
  assert.equal(state.timeoutWarningLogged, false);
  assert.equal(recordHomeLiveSummaryTimeoutFailure(state), false);
});
