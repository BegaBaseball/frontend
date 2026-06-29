import test from 'node:test';
import assert from 'node:assert/strict';

import type { Game, Ranking } from '../types/home';
import { buildDisplayableRankings } from './homeDashboard';
import { groupGamesBySourceDate, partitionGamesByLeague, summarizeHomeLeagueGames } from './homeGameGrouping';

const buildGame = (overrides: Partial<Game>): Game => ({
  gameId: '20260324KBO1',
  time: '18:30',
  stadium: '잠실',
  gameStatus: 'SCHEDULED',
  gameStatusKr: '예정',
  gameInfo: '테스트 경기',
  leagueType: 'REGULAR',
  homeTeam: 'LG',
  homeTeamFull: 'LG 트윈스',
  awayTeam: 'KT',
  awayTeamFull: 'KT 위즈',
  ...overrides,
});

const buildRanking = (overrides: Partial<Ranking>): Ranking => ({
  rank: 1,
  teamId: 'LG',
  teamName: 'LG 트윈스',
  wins: 10,
  losses: 3,
  draws: 1,
  winRate: '.769',
  games: 14,
  ...overrides,
});

test('partitionGamesByLeague는 리그별 경기를 한 번만 순회해 분리한다', () => {
  const result = partitionGamesByLeague([
    buildGame({ gameId: 'regular', leagueType: 'REGULAR' }),
    buildGame({ gameId: 'postseason', leagueType: 'POSTSEASON' }),
    buildGame({ gameId: 'series', leagueType: 'KOREAN_SERIES' }),
    buildGame({ gameId: 'other', leagueType: 'OFFSEASON' }),
  ]);

  assert.deepEqual(result.regularSeasonGames.map((game) => game.gameId), ['regular']);
  assert.deepEqual(result.postSeasonGames.map((game) => game.gameId), ['postseason']);
  assert.deepEqual(result.koreanSeriesGames.map((game) => game.gameId), ['series']);
});

test('summarizeHomeLeagueGames는 count와 활성 탭 경기만 계산한다', () => {
  const games = [
    buildGame({ gameId: 'regular', leagueType: 'REGULAR' }),
    buildGame({ gameId: 'postseason', leagueType: 'POSTSEASON' }),
    buildGame({ gameId: 'series', leagueType: 'KOREAN_SERIES' }),
    buildGame({ gameId: 'other', leagueType: 'OFFSEASON' }),
  ];

  const postseasonSummary = summarizeHomeLeagueGames(games, 'postseason');
  assert.equal(postseasonSummary.regularSeasonCount, 1);
  assert.equal(postseasonSummary.postSeasonCount, 1);
  assert.equal(postseasonSummary.koreanSeriesCount, 1);
  assert.deepEqual(postseasonSummary.activeStandardGames.map((game) => game.gameId), ['postseason']);

  const scheduledSummary = summarizeHomeLeagueGames(games, 'scheduled');
  assert.equal(scheduledSummary.regularSeasonCount, 1);
  assert.equal(scheduledSummary.postSeasonCount, 1);
  assert.equal(scheduledSummary.koreanSeriesCount, 1);
  assert.deepEqual(scheduledSummary.activeStandardGames, []);
});

test('groupGamesBySourceDate는 fallback 날짜를 적용하고 sourceDate 기준으로 정렬한다', () => {
  const grouped = groupGamesBySourceDate([
    buildGame({ gameId: 'b', sourceDate: '2026-03-25' }),
    buildGame({ gameId: 'a' }),
    buildGame({ gameId: 'c', sourceDate: '2026-03-24' }),
  ], '2026-03-26');

  assert.deepEqual(grouped.map(([date]) => date), ['2026-03-24', '2026-03-25', '2026-03-26']);
  assert.deepEqual(grouped[0][1].map((game) => game.gameId), ['c']);
  assert.deepEqual(grouped[2][1].map((game) => game.gameId), ['a']);
});

test('buildDisplayableRankings는 중복 팀을 제거하고 displayName을 붙인다', () => {
  const rankings = buildDisplayableRankings([
    buildRanking({ teamId: 'lg', teamName: 'LG 트윈스' }),
    buildRanking({ teamId: 'LG', teamName: '중복' }),
    buildRanking({ teamId: 'kt', teamName: 'KT 위즈' }),
  ], (teamId, teamName) => `${teamId}:${teamName}`);

  assert.deepEqual(rankings.map((entry) => entry.teamId), ['LG', 'KT']);
  assert.deepEqual(rankings.map((entry) => entry.displayName), ['LG:LG 트윈스', 'KT:KT 위즈']);
});
