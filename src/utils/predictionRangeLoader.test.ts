import test from 'node:test';
import assert from 'node:assert/strict';
import type { DateGames } from '../types/prediction';
import {
  buildPredictionDateBuckets,
  buildPredictionRangeWindow,
  findAdjacentLoadedDateIndex,
  getNextPredictionRangeAnchor,
  mergePredictionDateBuckets,
  shouldFetchPredictionBoundaryRange,
} from './predictionRangeLoader';

const toDateGames = (date: string): DateGames => ({
  date,
  games: [],
});

test('buildPredictionRangeWindow current는 anchor 하루만 조회한다', () => {
  const result = buildPredictionRangeWindow({
    anchorDate: '2026-03-07',
    direction: 'current',
    windowDays: 7,
  });

  assert.deepEqual(result, {
    anchorDate: '2026-03-07',
    direction: 'current',
    windowDays: 7,
    startDate: '2026-03-07',
    endDate: '2026-03-07',
  });
});

test('buildPredictionRangeWindow future는 anchor 이후 7일을 조회한다', () => {
  const result = buildPredictionRangeWindow({
    anchorDate: '2026-03-07',
    direction: 'future',
    windowDays: 7,
  });

  assert.equal(result.startDate, '2026-03-08');
  assert.equal(result.endDate, '2026-03-14');
});

test('buildPredictionRangeWindow past는 anchor 이전 7일을 조회한다', () => {
  const result = buildPredictionRangeWindow({
    anchorDate: '2026-03-07',
    direction: 'past',
    windowDays: 7,
  });

  assert.equal(result.startDate, '2026-02-28');
  assert.equal(result.endDate, '2026-03-06');
});

test('getNextPredictionRangeAnchor는 빈 window 다음 탐색 anchor를 반환한다', () => {
  assert.equal(
    getNextPredictionRangeAnchor({ startDate: '2026-02-28', endDate: '2026-03-06' }, 'past'),
    '2026-02-28'
  );
  assert.equal(
    getNextPredictionRangeAnchor({ startDate: '2026-03-08', endDate: '2026-03-14' }, 'future'),
    '2026-03-14'
  );
});

test('shouldFetchPredictionBoundaryRange는 경계에서만 네트워크 로드를 허용한다', () => {
  assert.equal(
    shouldFetchPredictionBoundaryRange({ currentIndex: 0, totalDates: 3, direction: 'past' }),
    true
  );
  assert.equal(
    shouldFetchPredictionBoundaryRange({ currentIndex: 1, totalDates: 3, direction: 'past' }),
    false
  );
  assert.equal(
    shouldFetchPredictionBoundaryRange({ currentIndex: 2, totalDates: 3, direction: 'future' }),
    true
  );
  assert.equal(
    shouldFetchPredictionBoundaryRange({ currentIndex: 1, totalDates: 3, direction: 'future' }),
    false
  );
});

test('findAdjacentLoadedDateIndex는 anchor 기준 가장 가까운 날짜를 찾는다', () => {
  const dates: DateGames[] = [
    toDateGames('2026-03-05'),
    toDateGames('2026-03-07'),
    toDateGames('2026-03-12'),
  ];

  assert.equal(findAdjacentLoadedDateIndex(dates, '2026-03-07', 'past'), 0);
  assert.equal(findAdjacentLoadedDateIndex(dates, '2026-03-07', 'future'), 2);
  assert.equal(findAdjacentLoadedDateIndex(dates, '2026-03-12', 'future'), -1);
});

test('buildPredictionDateBuckets는 ensuredDate 빈 버킷을 유지한다', () => {
  const result = buildPredictionDateBuckets([
    {
      gameId: '20260308HHSS0',
      gameDate: '2026-03-08',
      homeTeam: 'HH',
      awayTeam: 'SS',
      stadium: '대전',
    },
  ], '2026-03-07');

  assert.deepEqual(result.map((entry) => entry.date), ['2026-03-07', '2026-03-08']);
  assert.equal(result[0].games.length, 0);
});

test('mergePredictionDateBuckets는 기존 빈 날짜 버킷을 유지한다', () => {
  const existingDates: DateGames[] = [
    toDateGames('2026-03-07'),
  ];

  const result = mergePredictionDateBuckets(
    existingDates,
    [
      {
        gameId: '20260308HHSS0',
        gameDate: '2026-03-08',
        homeTeam: 'HH',
        awayTeam: 'SS',
        stadium: '대전',
      },
    ],
    (base, incoming) => [...base, ...incoming]
  );

  assert.deepEqual(result.map((entry) => entry.date), ['2026-03-07', '2026-03-08']);
  assert.equal(result[0].games.length, 0);
  assert.equal(result[1].games.length, 1);
});
