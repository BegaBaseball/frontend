import assert from 'node:assert/strict';
import test from 'node:test';
import type { DateGames } from '../types/prediction';
import {
  buildPredictionDetailPath,
  buildPredictionListPath,
  buildDeepLinkNotFoundMessage,
  buildPredictionMatchHandoff,
  buildPredictionRecoveryPath,
  buildPredictionNavigationSeedGame,
  extractPredictionLocationSeed,
  resolvePredictionHandoffDate,
  resolvePredictionDeepLinkSelection,
  sanitizePredictionDeepLinkParams,
} from './predictionDeepLink';

test('buildPredictionDetailPath creates canonical match detail URLs', () => {
  assert.equal(
    buildPredictionDetailPath({ gameId: ' GAME-1 ', date: '2026/03/07' }),
    '/prediction/matches/GAME-1?date=2026-03-07',
  );
});

test('buildPredictionListPath creates match list URLs without gameId', () => {
  assert.equal(buildPredictionListPath({ date: '2026/03/07' }), '/prediction?date=2026-03-07');
  assert.equal(buildPredictionListPath(), '/prediction');
});

test('sanitizePredictionDeepLinkParams normalizes valid params', () => {
  const params = new URLSearchParams('gameId= GAME_01 &date=2026/03/07');
  const result = sanitizePredictionDeepLinkParams(params, ' GAME_01 ', '2026/03/07');

  assert.equal(result.normalizedGameId, 'GAME_01');
  assert.equal(result.normalizedDate, '2026-03-07');
  assert.equal(result.invalidNotice, null);
  assert.equal(result.hasChange, true);
  assert.equal(result.nextSearchParams.get('gameId'), 'GAME_01');
  assert.equal(result.nextSearchParams.get('date'), '2026-03-07');
});

test('sanitizePredictionDeepLinkParams removes invalid params with notice', () => {
  const params = new URLSearchParams('gameId=bad!*&date=2026-99-99');
  const result = sanitizePredictionDeepLinkParams(params, 'bad!*', '2026-99-99');

  assert.equal(result.normalizedGameId, '');
  assert.equal(result.normalizedDate, '');
  assert.match(result.invalidNotice || '', /gameId 형식/);
  assert.equal(result.nextSearchParams.has('gameId'), false);
  assert.equal(result.nextSearchParams.has('date'), false);
});

test('extractPredictionLocationSeed prefers state sourceDate when present', () => {
  const result = extractPredictionLocationSeed({
    game: {
      gameId: 'GAME-1',
      sourceDate: '2026-03-08',
    },
    gameId: ' GAME-1 ',
    date: ' 2026-03-07 ',
  });

  assert.equal(result.stateGameId, 'GAME-1');
  assert.equal(result.stateDate, '2026-03-07');
  assert.equal(result.stateSeedDate, '2026-03-08');
});

test('buildPredictionNavigationSeedGame ignores mismatched deep link gameId', () => {
  const result = buildPredictionNavigationSeedGame({
    gameId: 'GAME-1',
    homeTeam: '두산',
    awayTeam: 'LG',
    sourceDate: '2026-03-07',
  }, 'GAME-2', '2026-03-07');

  assert.equal(result, null);
});

test('buildPredictionRecoveryPath prefers current date and gameId', () => {
  const recoveryPath = buildPredictionRecoveryPath({
    currentDate: '2026/03/08',
    currentGameId: ' GAME-2 ',
    searchParams: new URLSearchParams('date=2026-03-07&gameId=GAME-1'),
  });

  assert.equal(recoveryPath, '/prediction?date=2026-03-08&gameId=GAME-2');
});

test('buildPredictionRecoveryPath falls back to current date only when gameId is missing', () => {
  const recoveryPath = buildPredictionRecoveryPath({
    currentDate: '2026-03-09',
    searchParams: new URLSearchParams('date=2026-03-07&gameId=GAME-1'),
  });

  assert.equal(recoveryPath, '/prediction?date=2026-03-09');
});

test('buildPredictionRecoveryPath uses existing query params before default prediction route', () => {
  const recoveryPathWithQuery = buildPredictionRecoveryPath({
    searchParams: new URLSearchParams('date=2026-03-07&gameId=GAME-1'),
  });
  const recoveryPathWithoutQuery = buildPredictionRecoveryPath();

  assert.equal(recoveryPathWithQuery, '/prediction?date=2026-03-07&gameId=GAME-1');
  assert.equal(recoveryPathWithoutQuery, '/prediction');
});

test('resolvePredictionHandoffDate normalizes timestamp payloads', () => {
  assert.equal(resolvePredictionHandoffDate(null, '2026-03-07T18:30:00'), '2026-03-07');
});

test('buildPredictionMatchHandoff creates one URL and location state contract', () => {
  const handoff = buildPredictionMatchHandoff({
    sourcePage: 'schedule',
    fallbackDate: '2026-03-01',
    game: {
      gameId: ' GAME-1 ',
      homeTeam: 'LG',
      homeTeamFull: 'LG 트윈스',
      awayTeam: 'HH',
      awayTeamFull: '한화 이글스',
      stadium: '잠실',
      gameStatus: 'SCHEDULED',
      sourceDate: '2026-03-07T18:30:00',
    },
  });

  assert.equal(handoff.path, '/prediction/matches/GAME-1?date=2026-03-07');
  assert.equal(handoff.date, '2026-03-07');
  assert.equal(handoff.gameId, 'GAME-1');
  assert.equal(handoff.state.sourcePage, 'schedule');
  assert.equal(handoff.state.gameId, 'GAME-1');
  assert.equal(handoff.state.date, '2026-03-07');
  assert.equal(handoff.state.game.gameDate, '2026-03-07');
  assert.equal(handoff.state.game.sourceDate, '2026-03-07');
  assert.equal(handoff.state.game.stadium, '잠실');
});

test('buildDeepLinkNotFoundMessage includes validation and targets', () => {
  const message = buildDeepLinkNotFoundMessage(
    'GAME-1',
    '2026-03-07',
    '요청 경로의 date 형식이 유효하지 않아 링크를 무시했습니다.'
  );

  assert.match(message, /date 형식/);
  assert.match(message, /GAME-1/);
  assert.match(message, /2026-03-07/);
});

test('resolvePredictionDeepLinkSelection finds gameId before date fallback', () => {
  const allDatesData: DateGames[] = [
    {
      date: '2026-03-07',
      games: [
        {
          gameId: 'GAME-1',
          homeTeam: '두산',
          awayTeam: 'LG',
          stadium: '잠실',
          gameDate: '2026-03-07',
        },
      ],
    },
    {
      date: '2026-03-08',
      games: [
        {
          gameId: 'GAME-2',
          homeTeam: '한화',
          awayTeam: 'KT',
          stadium: '수원',
          gameDate: '2026-03-08',
        },
      ],
    },
  ];

  const selection = resolvePredictionDeepLinkSelection(allDatesData, 'GAME-2', '2026-03-07');

  assert.deepEqual(selection, {
    dateIndex: 1,
    gameIndex: 0,
    reason: 'gameId',
  });
});

test('resolvePredictionDeepLinkSelection strict gameId avoids date fallback', () => {
  const allDatesData: DateGames[] = [
    {
      date: '2026-03-07',
      games: [
        {
          gameId: 'GAME-1',
          homeTeam: '두산',
          awayTeam: 'LG',
          stadium: '잠실',
          gameDate: '2026-03-07',
        },
      ],
    },
  ];

  const selection = resolvePredictionDeepLinkSelection(allDatesData, 'GAME-2', '2026-03-07', {
    allowDateFallback: false,
  });

  assert.equal(selection, null);
});
